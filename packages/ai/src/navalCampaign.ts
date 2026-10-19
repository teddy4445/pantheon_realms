/**
 * Naval campaign planner (naval random templates, 2026-10-17): how the strategic AI plays a map
 * whose islands are reached only by ship (`MissionDefinition.navalPolicy`, The Shattered Crown and
 * The Serpent Straits). Everywhere else it proposes nothing, so other maps and the existing naval
 * planner (naval.ts) behave exactly as before.
 *
 * Reads the redacted belief only (explored tiles, known sites, ships in view) and proposes ordinary
 * commands the rules validate like a player's: MoveHero over the same mode-aware routes, EmbarkHero /
 * DisembarkHero at every mode change, LaunchShip at an owned coastal town.
 *
 *  - Ship reserve: while the empire has no empty ship of its own at a coast it holds, it keeps the
 *    price of one (1,500 Gold, 10 Wood) out of building and recruiting, so a lost or departed ship is
 *    replaced (`navalReserve`).
 *  - Launch: a hero with nothing worth doing on its island and no ship it can walk to gets one at an
 *    owned coastal town, onto a launch cell beside a beach the hero can reach (at most one a day).
 *  - Sea exploration: such a hero sails to the explored water beside the most unknown map (nearer
 *    the central objective and rival harbors counts more) over several days; what it sees there
 *    becomes the ordinary targets of the land and voyage planners (rival towns, the relic, mines).
 *  - Hunt: a rival that has lost its last town lives on in its heroes (elimination needs them gone);
 *    every hero then sweeps the coasts out of sight, a different stretch every few days, until the
 *    ordinary planners see a beatable enemy hero and attack or board it.
 *  - Reconnaissance: the main army first sails to see the rival harbors and the central objective
 *    while they are unexplored (their positions are public: town ownership and the objective marker);
 *    without it a hero wandered the near islands for a hundred days and never found the rival town.
 *  - Reinforcement by sea: a main army far from home sails back when the home garrison would add at
 *    least a third of its strength, and leaves again (the land planner gathers the troops).
 *  - Invasion: from the third week on, the main army besieges a rival town it can see at even odds
 *    against the walls (instead of the land planner's safety margin), sailing there first when it is
 *    across the water. Island garrisons otherwise outgrow any army that has to cross the sea to reach
 *    them, and symmetric empires never attack (headless trials, 2026-10-17).
 * Deterministic: stable orders, the empire's tie hash, no random draws.
 */
import {
  axialDistance,
  axialNeighbors,
  cellIndex,
  heroInTown,
  heroShip,
  hexKey,
  navalEnabled,
  navalRules,
  parseHexKey,
  playerTowns,
  quoteEmbark,
  quoteDisembark,
  quoteLaunchShip,
  quoteMovement,
  quoteTravel,
  scenarioMission,
  shipList,
  townGate,
  type CommandPayload,
  type ContentCatalog,
  type HeroState,
  type HexCoord,
  type MatchState,
  type MovementQuote,
  type PlayerId,
  type ShipState,
} from '@pr/rules';
import { byScoreThenTie, heroStrength, tieHash } from './threat';
import { fightingStrength } from './evaluation';
import { townFortificationLevel, visibleCells } from '@pr/rules';
import type { Target } from './strategic';

/** A hero's island counts as done when its best land target scores below this (plain-score units). */
const ISLAND_DONE_SCORE = 260;
/** Frontier cells examined with a real route quote (bounded planning work). */
const FRONTIER_QUOTES = 4;
/** The main army sails home when the takeable garrison is worth this share of its own strength. */
const REINFORCE_SHARE = 0.35;
/** Invasion: from this day the main army besieges a seen rival town at this margin over its walls. */
const COMMIT_FROM_DAY = 15;
const COMMIT_MARGIN = 1.0;
/** Reconnaissance: from this day, when towns are the objective (elimination), the main army with nothing
 * left on its island goes back to look at a rival harbor out of sight now. */
const REVISIT_FROM_DAY = 35;

export function navalCampaignActive(catalog: ContentCatalog, belief: MatchState): boolean {
  return navalEnabled(belief) && !!scenarioMission(catalog, belief)?.navalPolicy;
}

const explored = (belief: MatchState, playerId: PlayerId, c: HexCoord): boolean => {
  const fog = belief.fog[playerId];
  const map = belief.world.map;
  if (c.q < 0 || c.r < 0 || c.q >= map.width || c.r >= map.height) return false;
  return !fog || fog.explored[cellIndex(map, c)] === 1;
};

const terrainCode = (belief: MatchState, c: HexCoord): string => {
  const map = belief.world.map;
  if (c.q < 0 || c.r < 0 || c.q >= map.width || c.r >= map.height) return 'v';
  return map.terrain[c.r * map.width + c.q] ?? 'v';
};

/** The explored land a cell belongs to (its island as this empire knows it). Cached per belief. */
const islandMemo = new WeakMap<MatchState, Map<string, Set<string>>>();
export function knownIsland(belief: MatchState, playerId: PlayerId, start: HexCoord): Set<string> {
  let memo = islandMemo.get(belief);
  if (!memo) islandMemo.set(belief, (memo = new Map()));
  const sk = `${playerId}|${hexKey(start)}`;
  const hit = memo.get(sk);
  if (hit) return hit;
  const out = new Set<string>();
  const isLand = (c: HexCoord) => explored(belief, playerId, c) && terrainCode(belief, c) !== 'w' && terrainCode(belief, c) !== 'v';
  if (isLand(start)) {
    out.add(hexKey(start));
    const stack = [start];
    while (stack.length) {
      const cur = stack.pop()!;
      for (const n of axialNeighbors(cur)) {
        const k = hexKey(n);
        if (out.has(k) || !isLand(n)) continue;
        out.add(k);
        stack.push(n);
      }
    }
  }
  for (const k of out) memo.set(`${playerId}|${k}`, out);
  return out;
}

/** Empty ships this empire may use (its own or neutral), afloat. */
function usableShips(belief: MatchState, playerId: PlayerId): ShipState[] {
  return shipList(belief).filter((s) => !s.heroId && s.state === 'empty' && (s.ownerId === null || s.ownerId === playerId) && terrainCode(belief, s.coord) === 'w');
}

/** A ship lying beside an island (some neighbour is one of its land cells). */
const besideIsland = (ship: ShipState, island: ReadonlySet<string>) => axialNeighbors(ship.coord).some((n) => island.has(hexKey(n)));

/**
 * Gold and Wood the empire keeps for a ship (rules' ship cost) while it holds a coastal town and no
 * empty ship of its own (or a neutral one) lies beside the island of any of its towns. Zero elsewhere.
 */
export function navalReserve(catalog: ContentCatalog, belief: MatchState, playerId: PlayerId): { gold: number; wood: number } {
  const none = { gold: 0, wood: 0 };
  if (!navalCampaignActive(catalog, belief)) return none;
  const towns = playerTowns(belief, playerId).filter((t) => quoteLaunchShip(catalog, belief, playerId, t.id, null).code !== 'missing_requirement');
  if (towns.length === 0) return none;
  const ships = usableShips(belief, playerId);
  for (const t of towns) {
    const island = knownIsland(belief, playerId, townGate(catalog, belief, t.id));
    if (ships.some((s) => besideIsland(s, island))) return none;
  }
  const cost = navalRules(catalog.rulesProfile).shipCost;
  return { gold: cost.gold ?? 0, wood: cost.wood ?? 0 };
}

/**
 * Explored water beside at least `minUnknown` unexplored tiles (within 4), with the sea steps to it from
 * `from` (other ships and heroes in the way); `minUnknown` 0: every water cell the ships can reach.
 */
function seaFrontier(belief: MatchState, playerId: PlayerId, from: readonly HexCoord[], selfShip: string | null, minUnknown = 4): { cell: HexCoord; steps: number; unknown: number }[] {
  const blocked = new Set<string>();
  for (const s of shipList(belief)) if (s.shipId !== selfShip) blocked.add(hexKey(s.coord));
  for (const h of Object.values(belief.heroes)) if (h.status === 'active') blocked.add(hexKey(h.position));
  const dist = new Map<string, number>();
  let frontier = from.map((c) => hexKey(c));
  for (const k of frontier) dist.set(k, 0);
  const out: { cell: HexCoord; steps: number; unknown: number }[] = [];
  const map = belief.world.map;
  for (let d = 0; frontier.length; d++) {
    const next: string[] = [];
    for (const k of frontier) {
      const c = parseHexKey(k);
      let unknown = 0;
      for (let dq = -4; minUnknown > 0 && dq <= 4; dq++) {
        for (let dr = Math.max(-4, -dq - 4); dr <= Math.min(4, -dq + 4); dr++) {
          const x = { q: c.q + dq, r: c.r + dr };
          if (x.q < 0 || x.r < 0 || x.q >= map.width || x.r >= map.height || terrainCode(belief, x) === 'v') continue;
          if (!explored(belief, playerId, x)) unknown++;
        }
      }
      if (unknown >= minUnknown && d > 0) out.push({ cell: c, steps: d, unknown });
      for (const n of axialNeighbors(c)) {
        const nk = hexKey(n);
        if (dist.has(nk) || blocked.has(nk) || !explored(belief, playerId, n) || terrainCode(belief, n) !== 'w') continue;
        dist.set(nk, d + 1);
        next.push(nk);
      }
    }
    frontier = next;
  }
  return out;
}

/** The next command of a mixed-mode route: walk or sail its leg, or confirm its mode change when standing there. */
function stepOf(catalog: ContentCatalog, belief: MatchState, hero: HeroState, dest: HexCoord, q: MovementQuote): CommandPayload | null {
  if (!q.reachable) return null;
  const t = q.transition;
  if (!t) return q.stopIndex >= 0 ? { kind: 'MoveHero', heroId: hero.id, destination: { ...dest } } : null;
  if (q.path.length > 0) return q.stopIndex >= 0 ? { kind: 'MoveHero', heroId: hero.id, destination: { ...dest } } : null;
  if (t.kind === 'embark') return quoteEmbark(catalog, belief, hero.id, t.shipId).legal ? { kind: 'EmbarkHero', heroId: hero.id, shipId: t.shipId } : null;
  return quoteDisembark(catalog, belief, hero.id, t.landCoord).legal ? { kind: 'DisembarkHero', heroId: hero.id, landCoord: { ...t.landCoord } } : null;
}

/** Where to look next: the frontier with the most unknown map per day at sea (toward the center and the rivals first). */
function explorationStep(catalog: ContentCatalog, belief: MatchState, playerId: PlayerId, hero: HeroState): CommandPayload | null {
  const aboard = heroShip(belief, hero.id);
  const island = aboard ? null : knownIsland(belief, playerId, hero.position);
  const ships = aboard ? [aboard] : usableShips(belief, playerId).filter((s) => island && besideIsland(s, island));
  if (ships.length === 0) return null;
  const map = belief.world.map;
  const center = { q: Math.round((map.width - 1) / 2), r: Math.round((map.height - 1) / 2) };
  const rivals = Object.values(belief.towns).filter((t) => t.ownerId && t.ownerId !== playerId).map((t) => t.coord);
  const cells = seaFrontier(belief, playerId, ships.map((s) => s.coord), aboard?.shipId ?? null);
  const scored = cells
    .map((f) => {
      const toCenter = axialDistance(f.cell, center);
      const toRival = rivals.length ? Math.min(...rivals.map((r) => axialDistance(r, f.cell))) : 30;
      const score = (f.unknown * (1 + Math.max(0, 25 - toCenter) / 25 + Math.max(0, 30 - toRival) / 60)) / (1 + f.steps / 6);
      return { score, key: hexKey(f.cell), cell: f.cell };
    })
    .sort(byScoreThenTie(playerId))
    .slice(0, FRONTIER_QUOTES);
  for (const f of scored) {
    const q = aboard ? quoteMovement(catalog, belief, hero.id, f.cell) : quoteTravel(catalog, belief, hero.id, f.cell);
    const step = stepOf(catalog, belief, hero, f.cell, q);
    if (step) return step;
  }
  return null;
}

/**
 * Reconnaissance: toward the nearest unexplored rival town or central objective — with `revisit`, also a
 * rival town explored before but out of sight now (its garrison is hidden from the belief, so the invasion
 * rule cannot judge it) — the frontier water closest to it (a few days at sea count a little), with the
 * same route quotes as any voyage.
 */
function reconStep(catalog: ContentCatalog, belief: MatchState, playerId: PlayerId, hero: HeroState, revisit: boolean): CommandPayload | null {
  const mission = scenarioMission(catalog, belief);
  const visible = revisit ? visibleCells(catalog, belief, playerId) : null;
  const points: HexCoord[] = Object.values(belief.towns)
    .filter((t) => t.ownerId && t.ownerId !== playerId)
    .filter((t) => !explored(belief, playerId, t.coord) || (visible && !visible.has(cellIndex(belief.world.map, t.coord))))
    .map((t) => t.coord);
  const objective = mission?.victoryCondition?.type === 'hold_site' ? mission.victoryCondition.siteId : 'center_gold';
  const obj = mission?.sites.find((x) => x.id === objective);
  if (obj && !explored(belief, playerId, obj.coord)) points.push(obj.coord);
  const unseen = points.sort((a, b) => axialDistance(a, hero.position) - axialDistance(b, hero.position) || a.r - b.r || a.q - b.q);
  const goal = unseen[0];
  if (!goal) return null;
  const aboard = heroShip(belief, hero.id);
  const island = aboard ? null : knownIsland(belief, playerId, hero.position);
  const ships = aboard ? [aboard] : usableShips(belief, playerId).filter((s) => island && besideIsland(s, island));
  if (ships.length === 0) return null;
  // Any water the ship can reach (the explored water nearest an unexplored goal is the frontier toward it).
  const cells = seaFrontier(belief, playerId, ships.map((s) => s.coord), aboard?.shipId ?? null, 0)
    .filter((f) => !(f.cell.q === hero.position.q && f.cell.r === hero.position.r))
    .map((f) => ({ score: -(axialDistance(f.cell, goal) * 3 + f.steps), key: hexKey(f.cell), cell: f.cell }))
    .sort(byScoreThenTie(playerId))
    .slice(0, FRONTIER_QUOTES);
  for (const f of cells) {
    const q = aboard ? quoteMovement(catalog, belief, hero.id, f.cell) : quoteTravel(catalog, belief, hero.id, f.cell);
    const step = stepOf(catalog, belief, hero, f.cell, q);
    if (step) return step;
  }
  return null;
}

/**
 * Hunt sweep (a rival without towns): toward water beside a coast that is out of sight now, chosen in an
 * order that changes every few days (the empire's tie hash), so the heroes patrol the whole sea.
 */
function huntStep(catalog: ContentCatalog, belief: MatchState, playerId: PlayerId, hero: HeroState): CommandPayload | null {
  const hunted = Object.entries(belief.players).some(([id, p]) => id !== playerId && !p.eliminated && p.role !== 'scripted_hostile' && playerTowns(belief, id).length === 0);
  if (!hunted) return null;
  const aboard = heroShip(belief, hero.id);
  const island = aboard ? null : knownIsland(belief, playerId, hero.position);
  if (!aboard && !usableShips(belief, playerId).some((s) => island && besideIsland(s, island))) return null;
  const map = belief.world.map;
  const visible = visibleCells(catalog, belief, playerId);
  const period = Math.floor(belief.day / 4);
  const spots: { score: number; key: string; cell: HexCoord }[] = [];
  for (let r = 0; r < map.height; r++) {
    for (let q = 0; q < map.width; q++) {
      const c = { q, r };
      if (terrainCode(belief, c) !== 'w' || !explored(belief, playerId, c) || visible.has(cellIndex(map, c))) continue;
      if (!axialNeighbors(c).some((n) => { const t = terrainCode(belief, n); return t !== 'w' && t !== 'v'; })) continue;
      const key = hexKey(c);
      spots.push({ score: tieHash(playerId, `${key}|hunt|${period}`), key, cell: c });
    }
  }
  spots.sort((a, b) => b.score - a.score || (a.key < b.key ? -1 : 1));
  for (const f of spots.slice(0, FRONTIER_QUOTES)) {
    const q = aboard ? quoteMovement(catalog, belief, hero.id, f.cell) : quoteTravel(catalog, belief, hero.id, f.cell);
    const step = stepOf(catalog, belief, hero, f.cell, q);
    if (step) return step;
  }
  return null;
}

/** A launch for `hero`: an owned coastal town on its island, onto a free cell beside a beach it can walk to. */
function launchFor(catalog: ContentCatalog, belief: MatchState, playerId: PlayerId, hero: HeroState): CommandPayload | null {
  if (heroShip(belief, hero.id)) return null;
  // At most one ship a day (one launched today and still empty waits for its hero).
  if (shipList(belief).some((s) => s.ownerId === playerId && !s.heroId && s.lastActionTurn === belief.day)) return null;
  const island = knownIsland(belief, playerId, hero.position);
  for (const town of playerTowns(belief, playerId).sort((a, b) => (a.id < b.id ? -1 : 1))) {
    if (!island.has(hexKey(townGate(catalog, belief, town.id)))) continue;
    const q = quoteLaunchShip(catalog, belief, playerId, town.id, null);
    if (!q.legal) continue;
    for (const cell of q.cells) {
      const beaches = axialNeighbors(cell).filter((n) => island.has(hexKey(n)) && !(n.q === town.coord.q && n.r === town.coord.r));
      for (const b of beaches) {
        const m = quoteMovement(catalog, belief, hero.id, b);
        if ((m.reachable && !m.endsInEncounter) || (b.q === hero.position.q && b.r === hero.position.r)) return { kind: 'LaunchShip', townId: town.id, waterCoord: { ...cell } };
      }
    }
  }
  return null;
}

/** The best plain score among the land targets the hero can walk to (the land planner's own rule). */
function bestLandScore(catalog: ContentCatalog, belief: MatchState, hero: HeroState, targets: readonly Target[]): number {
  let best = 0;
  for (const t of targets) {
    const q = quoteMovement(catalog, belief, hero.id, t.coord);
    if (!q.reachable || q.stopIndex < 0) continue;
    const days = Math.max(1, Math.ceil(q.totalCost / Math.max(1, hero.movementPoints)));
    best = Math.max(best, t.value / (1 + q.totalCost / 800) / days);
  }
  return best;
}

/** Strength the hero could take from a town's garrison (all of it: the land planner keeps the home guard). */
function garrisonStrength(catalog: ContentCatalog, town: MatchState['towns'][string]): number {
  return fightingStrength(catalog, town.garrison.slots.filter((x): x is NonNullable<typeof x> => !!x && x.count > 0).map((x) => ({ creatureId: x.creatureId, count: x.count })));
}

/**
 * The main army's siege of a rival town it can see now (garrison and visiting hero in view): when its
 * strength reaches the defence times the walls (COMMIT_MARGIN), it walks there (siege confirmed) or,
 * across the water, takes the first step of the voyage. The nearest such town first.
 */
function invasionStep(catalog: ContentCatalog, belief: MatchState, playerId: PlayerId, hero: HeroState): CommandPayload | null {
  const visible = visibleCells(catalog, belief, playerId);
  const mine = heroStrength(catalog, belief, hero);
  let best: { cost: number; key: string; payload: CommandPayload } | null = null;
  for (const town of Object.values(belief.towns)) {
    if (!town.ownerId || town.ownerId === playerId) continue;
    if (!visible.has(cellIndex(belief.world.map, town.coord))) continue;
    const garrison = garrisonStrength(catalog, town);
    const visitor = Object.values(belief.heroes).find((h) => h.status === 'active' && h.ownerId !== playerId && heroInTown(catalog, belief, h, town.id));
    const defence = garrison + (visitor ? heroStrength(catalog, belief, visitor) : 0);
    const walls = 1 + 0.25 * townFortificationLevel(catalog, town);
    if (mine < defence * walls * COMMIT_MARGIN) continue;
    const walk = quoteMovement(catalog, belief, hero.id, town.coord);
    let payload: CommandPayload | null = null;
    let cost = Infinity;
    if (walk.reachable) {
      if (walk.stopIndex >= 0) payload = { kind: 'MoveHero', heroId: hero.id, destination: { ...town.coord }, confirmEncounter: walk.endsInEncounter };
      cost = walk.totalCost;
    } else {
      const q = quoteTravel(catalog, belief, hero.id, town.coord);
      payload = stepOf(catalog, belief, hero, town.coord, q);
      cost = q.voyage?.totalCost ?? Infinity;
    }
    if (!payload) continue;
    const key = town.id;
    if (!best || cost < best.cost || (cost === best.cost && key < best.key)) best = { cost, key, payload };
  }
  return best?.payload ?? null;
}

export interface NavalCampaignCandidates {
  /** Before the land planner's moves (the island has nothing worth more). */
  readonly first: CommandPayload[];
  /** After them. */
  readonly last: CommandPayload[];
}

const NONE: NavalCampaignCandidates = { first: [], last: [] };

/**
 * Naval-campaign candidates for one strategic hero (see the module comment). `targets` are the land
 * planner's targets for this hero; `main` whether it is the empire's strongest hero.
 */
export function navalCampaignCandidates(catalog: ContentCatalog, belief: MatchState, playerId: PlayerId, hero: HeroState, targets: readonly Target[], main: boolean): NavalCampaignCandidates {
  if (!navalCampaignActive(catalog, belief) || hero.status !== 'active' || hero.movementPoints <= 0) return NONE;
  const aboard = heroShip(belief, hero.id);
  const first: CommandPayload[] = [];
  const last: CommandPayload[] = [];
  const land = aboard ? 0 : bestLandScore(catalog, belief, hero, targets);
  const done = aboard || land < ISLAND_DONE_SCORE;
  const island = aboard ? null : knownIsland(belief, playerId, hero.position);
  const mine = heroStrength(catalog, belief, hero);
  // Troops wait in a town on this island: the land planner walks there first (a share of this army).
  const waitingAt = (share: number, floor: number) =>
    !!island && playerTowns(belief, playerId).some((t) => island.has(hexKey(townGate(catalog, belief, t.id))) && !heroInTown(catalog, belief, hero, t.id) && garrisonStrength(catalog, t) >= Math.max(floor, mine * share));
  // 0. Invasion: the main army besieges a seen rival town at even odds against its walls.
  if (main && belief.day >= COMMIT_FROM_DAY) {
    const invade = invasionStep(catalog, belief, playerId, hero);
    if (invade) {
      first.push(invade);
      return { first, last };
    }
  }
  // 1. Reinforcement by sea: the main army away from home sails back for a large garrison.
  if (main && done) {
    let best: { score: number; key: string; payload: CommandPayload } | null = null;
    for (const town of playerTowns(belief, playerId)) {
      if (heroInTown(catalog, belief, hero, town.id)) continue;
      const gate = townGate(catalog, belief, town.id);
      if (island?.has(hexKey(gate))) continue; // the land planner walks there
      const takeable = garrisonStrength(catalog, town);
      if (takeable < Math.max(200, mine * REINFORCE_SHARE)) continue;
      const q = quoteTravel(catalog, belief, hero.id, town.coord);
      const step = stepOf(catalog, belief, hero, town.coord, q);
      if (!step) continue;
      const cost = q.voyage?.totalCost ?? q.totalCost;
      const score = takeable / (1 + cost / 800);
      const key = `reinforce:${town.id}`;
      if (!best || byScoreThenTie(playerId)({ score, key }, best) < 0) best = { score, key, payload: step };
    }
    if (best) first.push(best.payload);
  }
  // 2. Nothing worth more on this island (or at sea with nothing to sail for): the main army goes to see
  // the rival harbors and the objective (when towns are the objective, later again once a harbor is out
  // of sight) unless troops wait for it on this island; any hero explores by sea — after the land
  // planner's walk home when troops wait in a town on this island.
  if (done && first.length === 0 && main && !waitingAt(REINFORCE_SHARE, 200)) {
    const elimination = scenarioMission(catalog, belief)?.victoryCondition?.type === 'elimination';
    const recon = reconStep(catalog, belief, playerId, hero, elimination && belief.day >= REVISIT_FROM_DAY);
    if (recon) {
      first.push(recon);
      return { first, last };
    }
  }
  // 3. A rival lives on without a town: sweep the coasts out of sight for its heroes.
  if (done && first.length === 0) {
    const hunt = huntStep(catalog, belief, playerId, hero);
    if (hunt) {
      first.push(hunt);
      return { first, last };
    }
  }
  if (done && first.length === 0) {
    const explore = explorationStep(catalog, belief, playerId, hero);
    const troopsWaiting = waitingAt(0.2, 150);
    if (explore) (aboard || troopsWaiting ? last : first).push(explore);
    else if (!aboard && main && island && hero.movementPoints >= navalRules(catalog.rulesProfile).transitionMinimumMovement && !usableShips(belief, playerId).some((s) => besideIsland(s, island))) {
      // No ship beside the island: launch one where the hero can board it.
      const launch = launchFor(catalog, belief, playerId, hero);
      if (launch) first.push(launch);
    }
  }
  return { first, last };
}

/**
 * Empire-level naval candidates before any spending: a ship for the main hero when it has nothing to
 * do on its island, cannot walk to a ship and the treasury holds the ship's price.
 */
export function navalEmpireCandidates(catalog: ContentCatalog, belief: MatchState, playerId: PlayerId, main: HeroState | null, targets: readonly Target[]): CommandPayload[] {
  if (!main || !navalCampaignActive(catalog, belief) || heroShip(belief, main.id) || main.movementPoints < navalRules(catalog.rulesProfile).transitionMinimumMovement) return [];
  const island = knownIsland(belief, playerId, main.position);
  if (usableShips(belief, playerId).some((s) => besideIsland(s, island))) return [];
  if (bestLandScore(catalog, belief, main, targets) >= ISLAND_DONE_SCORE) return [];
  const launch = launchFor(catalog, belief, playerId, main);
  return launch ? [launch] : [];
}
