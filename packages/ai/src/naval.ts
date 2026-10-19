/**
 * Naval planner (expedition kit §12, scenario feature `navalMovementV1`): the strategic AI's
 * use of hero ships. It reads the redacted belief only and proposes ordinary commands that the
 * rules validate exactly as a human's: the same quotes (`quoteTravel`, `quoteEmbark`,
 * `quoteDisembark`, `quoteLaunchShip`, `quoteAttackShip`), the same mode-aware pathfinder and the
 * same coastal legality. It never bypasses water and never confirms a mode change by moving:
 * every embark and landing is its own EmbarkHero / DisembarkHero.
 *
 * When a valuable target (a rival or unowned town, a site, a beatable enemy hero) cannot be
 * reached by land but can by sea, the hero walks to a ship, embarks, sails over several days,
 * lands near the target and the land planner takes over. Without a usable ship it launches one at
 * an owned coastal town (keeping a Gold and Wood reserve, at most one a day). A hero with nothing
 * left to do on its island takes a ship to explore. It boards an adjacent enemy ship when clearly
 * stronger. Patrols and wandering monsters never come here (they stay on land). Deterministic:
 * stable score order with the empire's tie hash.
 */
import {
  axialDistance,
  axialNeighbors,
  cellsWithin,
  hexKey,
  heroShip,
  isEmbarked,
  movementTarget,
  navalEnabled,
  navalRules,
  planVoyage,
  playerTowns,
  quoteAttackShip,
  quoteDisembark,
  quoteEmbark,
  quoteLaunchShip,
  quoteTrade,
  quoteMovement,
  quoteTravel,
  shipList,
  voyageDays,
  cellIndex,
  hostileOccupied,
  type CommandPayload,
  type ContentCatalog,
  type HeroState,
  type HexCoord,
  type MatchState,
  type MovementQuote,
  type PlayerId,
  type ShipState,
  type VoyagePlan,
} from '@pr/rules';
import { byScoreThenTie, heroStrength } from './threat';
import type { Target } from './strategic';

/** A voyage is worth a little less than the same target by land (days at sea, two mode changes). */
const VOYAGE_FACTOR = 0.9;
/** …and less again when the ship must be bought first. */
const LAUNCH_FACTOR = 0.75;
/** Gold and Wood kept back after paying for a ship (proposed AI reserve, not a rule). */
const LAUNCH_GOLD_RESERVE = 1000;
const LAUNCH_WOOD_RESERVE = 5;
/** Strength ratio before boarding an enemy ship (as for attacking a hero in the field). */
const BOARD_MARGIN = 1.2;
/** Coastal towns examined for a launch (stable order), to bound the planning work. */
const LAUNCH_TOWNS = 3;

export interface NavalCandidates {
  /** Before the land planner's moves: a voyage that beats every land option, a boarding, a launch. */
  readonly first: CommandPayload[];
  /** After them: a ship to explore with (or home by sea) when the land planner had nothing. */
  readonly last: CommandPayload[];
}

const EMPTY: NavalCandidates = { first: [], last: [] };

interface Voyage {
  readonly score: number;
  readonly key: string;
  readonly target: HexCoord;
  readonly quote: MovementQuote;
}

/** The plain-score rule of the land planner (strategic.ts movementCandidates): value per cost and per day. */
function landScore(value: number, cost: number, points: number): number {
  return value / (1 + cost / 800) / Math.max(1, Math.ceil(cost / Math.max(1, points)));
}

function voyageScore(catalog: ContentCatalog, belief: MatchState, hero: HeroState, value: number, plan: VoyagePlan): number {
  const days = voyageDays(catalog, belief, hero.id, plan) ?? 30;
  return (value / (1 + plan.totalCost / 800) / days) * VOYAGE_FACTOR;
}

/** The next command of a voyage leg: walk or sail the leg, or confirm its mode change when standing there. */
function voyageStep(catalog: ContentCatalog, belief: MatchState, hero: HeroState, target: HexCoord, q: MovementQuote): CommandPayload | null {
  const t = q.transition;
  if (!t) return null;
  if (q.path.length > 0) return q.stopIndex >= 0 ? { kind: 'MoveHero', heroId: hero.id, destination: target } : null;
  if (t.kind === 'embark') return quoteEmbark(catalog, belief, hero.id, t.shipId).legal ? { kind: 'EmbarkHero', heroId: hero.id, shipId: t.shipId } : null;
  return quoteDisembark(catalog, belief, hero.id, t.landCoord).legal ? { kind: 'DisembarkHero', heroId: hero.id, landCoord: { ...t.landCoord } } : null;
}

/** The belief with one more empty ship of `playerId` at `coord` (a launch being weighed; never submitted). */
function withProbeShip(belief: MatchState, coord: HexCoord, playerId: PlayerId): MatchState {
  const id = '__ai_probe_ship__';
  const probe: ShipState = { shipId: id, ownerId: playerId, coord: { ...coord }, heroId: null, state: 'empty', facing: 0, lastActionTurn: belief.day };
  return { ...belief, world: { ...belief.world, ships: { ...(belief.world.ships ?? {}), [id]: probe } } };
}

/** Launch options of the empire this turn: coastal towns with a free cell it can pay for (keeping the reserve). */
function launchOptions(catalog: ContentCatalog, belief: MatchState, playerId: PlayerId): { townId: string; cell: HexCoord }[] {
  // At most one ship a day: one launched today and still unused waits for its hero.
  if (shipList(belief).some((s) => s.ownerId === playerId && !s.heroId && s.lastActionTurn === belief.day)) return [];
  const wallet = belief.players[playerId]?.wallet;
  const cost = navalRules(catalog.rulesProfile).shipCost;
  if (!wallet || wallet.gold - (cost.gold ?? 0) < LAUNCH_GOLD_RESERVE || wallet.wood - (cost.wood ?? 0) < LAUNCH_WOOD_RESERVE) return [];
  const out: { townId: string; cell: HexCoord }[] = [];
  for (const town of playerTowns(belief, playerId)) {
    const q = quoteLaunchShip(catalog, belief, playerId, town.id, null);
    if (!q.legal || q.cells.length === 0) continue;
    out.push({ townId: town.id, cell: q.cells[0]! });
    if (out.length >= LAUNCH_TOWNS) break;
  }
  return out;
}

/** Fog is left somewhere on the map (exploring by sea is worth a ship). */
function fogLeft(belief: MatchState, playerId: PlayerId): boolean {
  const fog = belief.fog[playerId];
  return !!fog && fog.explored.some((v, i) => v !== 1 && belief.world.map.terrain[i] !== 'v');
}

/**
 * Naval candidates for one strategic hero (see the module comment). `targets` are the land
 * planner's own targets (heroTargets: the same values and strength margins); `hasLandMoves` tells
 * whether the land planner proposed anything at all for this hero.
 */
export function navalCandidates(catalog: ContentCatalog, belief: MatchState, playerId: PlayerId, hero: HeroState, targets: readonly Target[], hasLandMoves: boolean): NavalCandidates {
  if (!navalEnabled(belief) || hero.status !== 'active' || hero.movementPoints <= 0) return EMPTY;
  const aboard = heroShip(belief, hero.id);
  // Nothing to sail with and nowhere to launch from: no naval planning at all (bounded AI work).
  const usable = shipList(belief).some((s) => !s.heroId && (s.ownerId === null || s.ownerId === playerId));
  const coastal = playerTowns(belief, playerId).some((t) => quoteLaunchShip(catalog, belief, playerId, t.id, null).cells.length > 0);
  if (!aboard && !usable && !coastal) return EMPTY;
  const first: CommandPayload[] = [];
  const last: CommandPayload[] = [];
  const mine = heroStrength(catalog, belief, hero);

  // 1. Board an adjacent enemy ship when clearly stronger.
  if (aboard) {
    for (const ship of shipList(belief)) {
      if (!hostileOccupied(belief, ship, playerId) || !axialNeighbors(aboard.coord).some((n) => n.q === ship.coord.q && n.r === ship.coord.r)) continue;
      const enemy = belief.heroes[ship.heroId!];
      if (!enemy || mine < heroStrength(catalog, belief, enemy) * BOARD_MARGIN) continue;
      if (quoteAttackShip(catalog, belief, hero.id, ship.shipId).legal) first.push({ kind: 'AttackShip', heroId: hero.id, targetShipId: ship.shipId });
    }
  }

  // 2. Every target: its single-mode route (walking, or sailing when aboard), else a voyage.
  let bestSingle = Number.NEGATIVE_INFINITY;
  const voyages: Voyage[] = [];
  const beyond: Target[] = [];
  for (const t of targets) {
    const q = quoteMovement(catalog, belief, hero.id, t.coord);
    if (q.reachable) {
      if (q.stopIndex >= 0) bestSingle = Math.max(bestSingle, landScore(t.value, q.totalCost, hero.movementPoints));
      continue;
    }
    const tq = aboard || usable ? quoteTravel(catalog, belief, hero.id, t.coord) : q;
    if (tq.reachable && tq.voyage) voyages.push({ score: voyageScore(catalog, belief, hero, t.value, tq.voyage), key: `voyage:${hexKey(t.coord)}`, target: t.coord, quote: tq });
    else beyond.push(t);
  }
  voyages.sort(byScoreThenTie(playerId));
  for (const v of voyages) {
    if (v.score <= bestSingle) break;
    const step = voyageStep(catalog, belief, hero, v.target, v.quote);
    if (step) {
      first.push(step);
      break;
    }
  }
  if (first.length > 0) return { first, last };

  // Recover a maritime expedition through the ordinary marketplace instead of hoarding gold on an island.
  if (!aboard && voyages.length === 0 && coastal && (beyond.length > 0 || !hasLandMoves && fogLeft(belief, playerId))) {
    const wallet=belief.players[playerId]!.wallet, cost=navalRules(catalog.rulesProfile).shipCost;
    const amount=Math.max(0,(cost.wood??0)+LAUNCH_WOOD_RESERVE-wallet.wood);
    if(amount>0) for(const town of playerTowns(belief,playerId)) {
      const q=quoteTrade(catalog,belief,playerId,town.id,'gold','wood',amount);
      if(q.legal && wallet.gold-q.pay.gold >= (cost.gold??0)+LAUNCH_GOLD_RESERVE) return {first:[{kind:'TradeResources',townId:town.id,sell:'gold',buy:'wood',amount}],last};
    }
  }

  // 3. No ship serves: buy one at a coastal town when a target beyond the water beats every land option.
  if (!aboard && voyages.length === 0) {
    const launches = beyond.length > 0 || !hasLandMoves ? launchOptions(catalog, belief, playerId) : [];
    let best: { score: number; key: string; payload: CommandPayload } | null = null;
    for (const option of launches) {
      const probe = withProbeShip(belief, option.cell, playerId);
      for (const t of beyond) {
        const plan = planVoyage(catalog, probe, hero.id, movementTarget(catalog, probe, t.coord));
        if (!plan || plan.transitions.length === 0) continue;
        const score = voyageScore(catalog, probe, hero, t.value, plan) * LAUNCH_FACTOR;
        const key = `launch:${option.townId}:${hexKey(t.coord)}`;
        if (score > bestSingle && (!best || byScoreThenTie(playerId)({ score, key }, best) < 0)) best = { score, key, payload: { kind: 'LaunchShip', townId: option.townId, waterCoord: { ...option.cell } } };
      }
    }
    if (best) return { first: [best.payload], last };
  }

  // 4. Nothing left on this island: take a ship to explore (an existing one, else a new one).
  if (!aboard && !hasLandMoves && fogLeft(belief, playerId)) {
    const explore = explorationShip(catalog, belief, playerId, hero);
    if (explore) last.push(explore);
  }

  // 5. Aboard with nothing to sail for: home by sea (after any exploring the land planner proposed).
  if (aboard && voyages.length === 0) {
    const home = homeVoyage(catalog, belief, playerId, hero);
    if (home) last.push(home);
  }
  return { first, last };
}

/** The first step toward the cheapest claimable ship (to explore by sea), or a launch when none can be reached. */
function explorationShip(catalog: ContentCatalog, belief: MatchState, playerId: PlayerId, hero: HeroState): CommandPayload | null {
  let best: { cost: number; key: string; q: MovementQuote; coord: HexCoord } | null = null;
  for (const ship of shipList(belief)) {
    if (ship.heroId || ship.state !== 'empty' || (ship.ownerId !== null && ship.ownerId !== playerId)) continue;
    // Only ships beside water still worth exploring (some unknown tile within a few hexes).
    if (!unknownNear(belief, playerId, ship.coord)) continue;
    const q = quoteTravel(catalog, belief, hero.id, ship.coord);
    if (!q.reachable || !q.voyage) continue;
    const key = ship.shipId;
    if (!best || q.voyage.totalCost < best.cost || (q.voyage.totalCost === best.cost && key < best.key)) best = { cost: q.voyage.totalCost, key, q, coord: ship.coord };
  }
  if (best) return voyageStep(catalog, belief, hero, best.coord, best.q);
  for (const option of launchOptions(catalog, belief, playerId)) {
    if (!unknownNear(belief, playerId, option.cell)) continue;
    const probe = withProbeShip(belief, option.cell, playerId);
    const plan = planVoyage(catalog, probe, hero.id, option.cell);
    if (plan && plan.transitions.length > 0) return { kind: 'LaunchShip', townId: option.townId, waterCoord: { ...option.cell } };
  }
  return null;
}

/** Unknown tiles within six hexes of a water tile (crude, deterministic). */
function unknownNear(belief: MatchState, playerId: PlayerId, c: HexCoord): boolean {
  const fog = belief.fog[playerId];
  if (!fog) return false;
  const map = belief.world.map;
  for (let dq = -6; dq <= 6; dq++) {
    for (let dr = Math.max(-6, -dq - 6); dr <= Math.min(6, -dq + 6); dr++) {
      const x = { q: c.q + dq, r: c.r + dr };
      if (x.q < 0 || x.r < 0 || x.q >= map.width || x.r >= map.height) continue;
      const i = cellIndex(map, x);
      if (fog.explored[i] !== 1 && map.terrain[i] !== 'v') return true;
    }
  }
  return false;
}

/**
 * The next step home by sea: a voyage to the cheapest own town — its gate, or, while another hero
 * stands in the gate, the nearest free tile around it (stable order).
 */
function homeVoyage(catalog: ContentCatalog, belief: MatchState, playerId: PlayerId, hero: HeroState): CommandPayload | null {
  let best: { cost: number; key: string; q: MovementQuote; coord: HexCoord } | null = null;
  for (const town of playerTowns(belief, playerId)) {
    const spots = [town.coord, ...cellsWithin(belief.world.map, town.coord, 2).filter((c) => !(c.q === town.coord.q && c.r === town.coord.r)).sort((a, b) => axialDistance(a, town.coord) - axialDistance(b, town.coord) || a.r - b.r || a.q - b.q)];
    for (const spot of spots) {
      const q = quoteTravel(catalog, belief, hero.id, spot);
      if (!q.reachable || !q.voyage) continue;
      const key = `${town.id}:${hexKey(spot)}`;
      if (!best || q.voyage.totalCost < best.cost || (q.voyage.totalCost === best.cost && key < best.key)) best = { cost: q.voyage.totalCost, key, q, coord: spot };
      break;
    }
  }
  return best ? voyageStep(catalog, belief, hero, best.coord, best.q) : null;
}

/** True when a hero of this empire is at sea (for tests and the controller's diagnostics). */
export function empireAtSea(belief: MatchState, playerId: PlayerId): boolean {
  return Object.values(belief.heroes).some((h) => h.ownerId === playerId && h.status === 'active' && isEmbarked(belief, h.id));
}
