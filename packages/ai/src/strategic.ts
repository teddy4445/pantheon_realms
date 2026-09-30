/**
 * StrategicPlanner + ActionGenerator for adventure turns.
 *
 * Works on the redacted belief state only. Produces an ORDERED list of candidate
 * commands; the controller submits them through the normal CommandProcessor and
 * falls through to the next candidate on rejection. EndTurn is always last.
 *
 * Profiles:
 *   strategic — full empire behaviour: level-ups, build, recruit, reinforce,
 *               collect, capture, fight favorable battles.
 *   patrol    — the finite M03 Scout Captain: waypoint circuit inside its region,
 *               attacks a visible target only above its documented threshold.
 */
import {
  axialDistance,
  cellIndex,
  cellsWithin,
  parseHexKey,
  reachableTiles,
  effectiveAttributes,
  movementBudget,
  getMission,
  hexEquals,
  hexKey,
  quoteConstruction,
  quoteHireHero,
  quoteMovement,
  quoteRecruitment,
  playerTowns,
  recruitableCreatureIds,
  townFortificationLevel,
  townSlots,
  visibleCells,
  type CommandPayload,
  type ContentCatalog,
  type HeroState,
  type MatchState,
  type PlayerId,
  type StackSpec,
  type HexCoord,
} from '@pr/rules';
import type { AIObservation } from './observation';
import { armyStrength } from './evaluation';
import { equipCandidates, godCandidates, merchantCandidates, offeringCandidates, trainingCandidates } from './services';

/**
 * Data-driven build scoring (works for any pantheon's town tree): income first,
 * then new dwellings by tier, growth, hiring/market access and prerequisites
 * that unlock many other buildings. Heuristic, not a proven build order.
 */
function buildScore(catalog: ContentCatalog, buildingId: string, heroCount: number): number {
  const def = catalog.buildings[buildingId];
  if (!def) return 0;
  let score = 0;
  for (const e of def.effects) {
    if (e.type === 'daily_income') score += e.resource === 'gold' ? e.amount * 2 : e.resource === 'favor' ? 300 : 700;
    else if (e.type === 'growth_multiplier') score += 1500;
    else if (e.type === 'enables_hero_hiring') score += heroCount < 3 ? 900 : 200;
    else if (e.type === 'enables_market') score += 500;
    else if (e.type === 'spell_library') score += 350;
    else if (e.type === 'enables_hero_training') score += 260;
    else if (e.type === 'town_vision_radius') score += 220;
    else if (e.type === 'enables_artifact_merchant') score += 300;
  }
  if (def.dwelling) {
    const tier = catalog.families[def.dwelling.familyId]?.tier ?? 1;
    score += def.dwelling.form === 'base' ? 600 + tier * 350 : 300 + tier * 220;
  }
  // Prerequisite value: how many other buildings name this one directly.
  let unlocks = 0;
  for (const other of Object.values(catalog.buildings)) {
    if (other.pantheonId !== def.pantheonId || other.implementationStatus !== 'implemented') continue;
    if (other.requirements.some((r) => r.type === 'has_building' && r.buildingId === buildingId)) unlocks++;
  }
  score += unlocks * 380;
  const gold = def.cost.gold ?? 0;
  return score / (1 + gold / 6000);
}

const HIRE_RESERVE_GOLD = 3000;
/** Required strength ratio (after the wall factor) before the AI besieges a town. */
const SIEGE_MARGIN = 1.25;
/** An enemy hero within this many hexes of a town counts as a threat to it. */
const THREAT_RADIUS = 8;
const AI_TARGET_HEROES = 3;
/** Strength ratio a hero needs before it attacks an enemy hero in the field. */
const HERO_ATTACK_MARGIN = 1.2;
/** A visible enemy at least this strong (relative) that can reach a tile next turn makes it dangerous. */
const DANGER_MARGIN = 1.0;

function heroStrength(catalog: ContentCatalog, state: MatchState, hero: HeroState): number {
  const eff = effectiveAttributes(catalog, state, hero);
  const specs: StackSpec[] = hero.army.slots.filter((s): s is NonNullable<typeof s> => !!s).map((s) => ({ creatureId: s.creatureId, count: s.count }));
  return armyStrength(catalog, specs, { attack: eff.attack.total, defense: eff.defense.total });
}

function withinRegion(hero: HeroState, c: HexCoord): boolean {
  if (!hero.ai) return true;
  return c.q >= hero.ai.regionMinQ && c.q <= hero.ai.regionMaxQ;
}

interface Target {
  readonly coord: HexCoord;
  readonly value: number;
  readonly encounter: boolean;
  readonly label: string;
  /** Strength of the army fought on arrival (guards or an enemy hero), for the post-fight estimate. */
  readonly fights?: number;
  /** Enemy hero targeted by this move (never counted as a danger to itself). */
  readonly enemyHeroId?: string;
  /** Ends inside a town (walls): not checked for field danger. */
  readonly town?: boolean;
}

function heroTargets(catalog: ContentCatalog, belief: MatchState, playerId: PlayerId, hero: HeroState): Target[] {
  const out: Target[] = [];
  const mission = getMission(catalog, belief.mission.missionId);
  const myStrength = heroStrength(catalog, belief, hero);
  const visible = visibleCells(catalog, belief, playerId);
  for (const def of mission.sites) {
    const st = belief.world.sites[def.id];
    if (!st) continue; // unknown to this player
    if (def.guard && !st.cleared) {
      const guardStr = armyStrength(catalog, st.guard ?? def.guard.army, def.guard.commander ? { attack: def.guard.commander.attributes.attack, defense: def.guard.commander.attributes.defense } : undefined);
      if (myStrength >= guardStr * 1.3) {
        const reward = def.guard.reward.resources?.gold ?? 0;
        out.push({ coord: def.coord, value: 600 + reward + guardStr * 0.2, encounter: true, label: def.name, fights: guardStr });
      }
      continue;
    }
    switch (def.kind.type) {
      case 'pickup':
        if (!st.claimed) out.push({ coord: def.coord, value: 700 + (def.kind.reward.resources?.gold ?? 0), encounter: false, label: def.name });
        break;
      case 'resource_site':
        if (st.owner !== playerId) out.push({ coord: def.coord, value: def.kind.resource === 'gold' ? 2500 : 1200, encounter: false, label: def.name });
        break;
      case 'town': {
        const town = belief.towns[def.kind.townId];
        if (!town || town.ownerId === playerId) break;
        if (!visible.has(cellIndex(belief.world.map, town.coord))) {
          // Garrison unknown: approach (the real move is refused if it would start an unplanned siege).
          out.push({ coord: def.coord, value: 2500, encounter: false, label: town.name });
          break;
        }
        const garrison: StackSpec[] = town.garrison.slots.filter((x): x is NonNullable<typeof x> => !!x && x.count > 0).map((x) => ({ creatureId: x.creatureId, count: x.count }));
        const visitor = Object.values(belief.heroes).find((h) => h.status === 'active' && h.ownerId !== playerId && hexEquals(h.position, town.coord));
        if (garrison.length === 0 && !visitor) {
          out.push({ coord: def.coord, value: 6000, encounter: false, label: town.name, town: true });
          break;
        }
        // Siege: walls, keep and towers favour the defender; demand a clear margin.
        const defense = armyStrength(catalog, garrison) + (visitor ? heroStrength(catalog, belief, visitor) : 0);
        const walls = 1 + 0.25 * townFortificationLevel(catalog, town);
        if (myStrength >= defense * walls * SIEGE_MARGIN) {
          out.push({ coord: def.coord, value: 8000 + defense * 0.3, encounter: true, label: `Siege of ${town.name}`, town: true });
        }
        break;
      }
      default:
        break;
    }
  }
  const townCoords = new Set(Object.values(belief.towns).map((t) => hexKey(t.coord)));
  for (const enemy of Object.values(belief.heroes)) {
    if (enemy.ownerId === playerId || enemy.status !== 'active') continue;
    if (townCoords.has(hexKey(enemy.position))) continue; // visiting a town: evaluated as a siege above
    const theirs = heroStrength(catalog, belief, enemy);
    if (myStrength >= theirs * HERO_ATTACK_MARGIN) out.push({ coord: enemy.position, value: 3000 + theirs * 0.5, encounter: true, label: enemy.name, fights: theirs, enemyHeroId: enemy.id });
  }
  return out;
}

/**
 * Field danger: would a visible enemy hero at least as strong as `strength` be
 * able to reach `stop` on its next turn? Uses only what the belief shows (the
 * enemy's visible army decides its movement budget). Heroes inside a town are
 * judged by the town threat logic instead.
 */
function endangered(catalog: ContentCatalog, belief: MatchState, playerId: PlayerId, stop: HexCoord, strength: number, ignoreHeroId?: string): boolean {
  const townCoords = new Set(Object.values(belief.towns).map((t) => hexKey(t.coord)));
  for (const e of Object.values(belief.heroes)) {
    if (e.ownerId === playerId || e.status !== 'active' || e.id === ignoreHeroId) continue;
    const theirs = heroStrength(catalog, belief, e);
    if (theirs < strength * DANGER_MARGIN) continue;
    if (townCoords.has(hexKey(e.position)) && hexEquals(e.position, stop)) continue;
    const q = quoteMovement(catalog, belief, e.id, stop);
    if (q.reachable && q.totalCost <= movementBudget(catalog, belief, e).total) return true;
  }
  return false;
}

/** Lanchester square-law estimate of the strength left after beating `enemy`. */
function strengthAfter(mine: number, enemy: number): number {
  return Math.sqrt(Math.max(0, mine * mine - enemy * enemy));
}

function movementCandidates(catalog: ContentCatalog, belief: MatchState, playerId: PlayerId, hero: HeroState): CommandPayload[] {
  if (hero.movementPoints <= 0) return [];
  const scored: { score: number; key: string; payload: CommandPayload }[] = [];
  const mine = heroStrength(catalog, belief, hero);
  for (const t of heroTargets(catalog, belief, playerId, hero)) {
    const q = quoteMovement(catalog, belief, hero.id, t.coord);
    if (!q.reachable || q.stopIndex < 0) continue;
    // Do not end the day (or a fight) where a visible, stronger enemy can strike next.
    if (!t.town) {
      const arrives = q.stopIndex === q.path.length - 1;
      const after = arrives && t.fights ? strengthAfter(mine, t.fights) : mine;
      const stop = q.path[q.stopIndex]!;
      if (endangered(catalog, belief, playerId, stop, after, t.enemyHeroId)) continue;
    }
    const days = Math.max(1, Math.ceil(q.totalCost / Math.max(1, hero.movementPoints)));
    const score = t.value / (1 + q.totalCost / 800) / days;
    scored.push({ score, key: hexKey(t.coord), payload: { kind: 'MoveHero', heroId: hero.id, destination: t.coord, confirmEncounter: q.endsInEncounter } });
  }
  // Return home to reinforce when the town has recruits waiting.
  const home = playerTowns(belief, playerId)[0];
  if (home && !hexEquals(home.coord, hero.position)) {
    const waiting = home.garrison.slots.some((s) => s && s.count > 0) || Object.values(home.population).some((n) => n > 0);
    const q = quoteMovement(catalog, belief, hero.id, home.coord);
    if (waiting && q.reachable && q.stopIndex >= 0) {
      scored.push({ score: 400 / (1 + q.totalCost / 800), key: `home:${hexKey(home.coord)}`, payload: { kind: 'MoveHero', heroId: hero.id, destination: home.coord } });
    }
  }
  // Explore: step to a reachable tile that borders the unknown (vision reveals more map).
  for (const e of explorationTargets(catalog, belief, playerId, hero)) {
    const dest = e.payload.kind === 'MoveHero' ? e.payload.destination : null;
    if (dest && endangered(catalog, belief, playerId, dest, mine)) continue;
    scored.push(e);
  }
  scored.sort((a, b) => b.score - a.score || (a.key < b.key ? -1 : 1));
  return scored.map((s) => s.payload);
}

function explorationTargets(catalog: ContentCatalog, belief: MatchState, playerId: PlayerId, hero: HeroState): { score: number; key: string; payload: CommandPayload }[] {
  const fog = belief.fog[playerId];
  if (!fog) return [];
  const map = belief.world.map;
  const unknownAround = (c: HexCoord) => {
    let n = 0;
    for (const x of cellsWithin(map, c, 3)) if (fog.explored[cellIndex(map, x)] !== 1) n++;
    return n;
  };
  const out: { score: number; key: string; payload: CommandPayload }[] = [];
  for (const [k, cost] of reachableTiles(catalog, belief, hero.id)) {
    const c = parseHexKey(k);
    const unknown = unknownAround(c);
    if (unknown < 3) continue;
    out.push({ score: (120 + unknown * 25) / (1 + cost / 800), key: `explore:${k}`, payload: { kind: 'MoveHero', heroId: hero.id, destination: c } });
  }
  out.sort((a, b) => b.score - a.score || (a.key < b.key ? -1 : 1));
  return out.slice(0, 3);
}

function patrolCandidates(catalog: ContentCatalog, belief: MatchState, playerId: PlayerId, hero: HeroState): CommandPayload[] {
  const ai = hero.ai!;
  const out: CommandPayload[] = [];
  const mine = heroStrength(catalog, belief, hero);
  // Attack a visible enemy inside the region above the documented threshold.
  for (const enemy of Object.values(belief.heroes).sort((a, b) => (a.id < b.id ? -1 : 1))) {
    if (enemy.ownerId === playerId || enemy.status !== 'active' || !withinRegion(hero, enemy.position)) continue;
    const theirs = heroStrength(catalog, belief, enemy);
    if (mine * ai.attackThreshold.denominator >= theirs * ai.attackThreshold.numerator) {
      const q = quoteMovement(catalog, belief, hero.id, enemy.position);
      if (q.reachable && q.path.every((c) => withinRegion(hero, c))) {
        out.push({ kind: 'MoveHero', heroId: hero.id, destination: enemy.position, confirmEncounter: true });
      }
    }
  }
  // Otherwise advance along the waypoint circuit (stateless: next after the one we stand on).
  const wps = ai.waypoints;
  if (wps.length > 0) {
    const at = wps.findIndex((w) => hexEquals(w, hero.position));
    let targetIdx: number;
    if (at >= 0) targetIdx = (at + 1) % wps.length;
    else {
      let bestI = 0;
      let bestD = Number.POSITIVE_INFINITY;
      wps.forEach((w, i) => {
        const d = axialDistance(w, hero.position);
        if (d < bestD) {
          bestD = d;
          bestI = i;
        }
      });
      targetIdx = bestI;
    }
    for (let k = 0; k < wps.length; k++) {
      const wp = wps[(targetIdx + k) % wps.length]!;
      if (hexEquals(wp, hero.position)) continue;
      const q = quoteMovement(catalog, belief, hero.id, wp);
      if (q.reachable && q.stopIndex >= 0 && !q.endsInEncounter && q.path.slice(0, q.stopIndex + 1).every((c) => withinRegion(hero, c))) {
        out.push({ kind: 'MoveHero', heroId: hero.id, destination: wp });
        break;
      }
    }
  }
  return out;
}

export function strategicCandidates(catalog: ContentCatalog, obs: AIObservation): CommandPayload[] {
  const belief = obs.belief;
  const playerId = obs.playerId;
  const out: CommandPayload[] = [];
  const player = belief.players[playerId];
  if (!player) return [{ kind: 'EndTurn' }];

  for (const d of belief.pendingDecisions) {
    if (belief.heroes[d.heroId]?.ownerId === playerId) out.push({ kind: 'ChooseLevelUp', decisionId: d.decisionId, offerIndex: d.offers.length > 0 ? 0 : null });
  }
  if (out.length > 0) return out;

  const myHeroes = Object.values(belief.heroes)
    .filter((h) => h.ownerId === playerId && h.status === 'active')
    .sort((a, b) => (a.id < b.id ? -1 : 1));
  const strategic = myHeroes.filter((h) => h.ai?.profile !== 'patrol');

  // Defend home: a visible enemy hero close to a town keeps recruits in its garrison
  // and keeps the visiting hero inside the walls — unless the visitor can beat
  // every such enemy in the field (then it goes out and hunts them instead; holding
  // against weak raiders used to freeze the hero at home and block its Tavern).
  const enemies = Object.values(belief.heroes).filter((h) => h.ownerId !== playerId && h.status === 'active');
  const threatened = new Set(
    playerTowns(belief, playerId)
      .filter((t) => {
        const near = enemies.filter((e) => axialDistance(e.position, t.coord) <= THREAT_RADIUS);
        if (near.length === 0) return false;
        const visitor = strategic.find((h) => hexEquals(h.position, t.coord));
        if (!visitor) return true;
        const mine = heroStrength(catalog, belief, visitor);
        return near.some((e) => heroStrength(catalog, belief, e) * HERO_ATTACK_MARGIN > mine);
      })
      .map((t) => t.id),
  );
  const holding = new Set<string>();

  // With no hero left, save for a new one instead of spending every coin on the
  // garrison (heroless empires used to sit at ~1,000 Gold for the rest of the match).
  const hireCost = catalog.rulesProfile.heroHireCost;
  const canHireSomewhere = playerTowns(belief, playerId).some((t) => (obs.hireRoster[t.id] ?? []).length > 0);
  const saving = belief.scenario.heroHiringEnabled && strategic.length === 0 && canHireSomewhere && player.wallet.gold < hireCost;

  if (player.role !== 'scripted_hostile') {
    // Divine commitments and equipment first: they only ever help.
    out.push(...godCandidates(catalog, belief, playerId));
    out.push(...equipCandidates(catalog, strategic));
    out.push(...offeringCandidates(catalog, belief, playerId, threatened));
    out.push(...trainingCandidates(catalog, belief, playerId, strategic));
    out.push(...merchantCandidates(catalog, belief, playerId, strategic));
    for (const town of playerTowns(belief, playerId)) {
      const underThreat = threatened.has(town.id);
      // Build: best-scoring legal next level of any location, keeping a Gold reserve.
      if (town.buildUsedDay !== belief.day && !saving) {
        const options = townSlots(catalog, town)
          .map((slot) => slot.chain[town.buildings[slot.id] ?? 0])
          .filter((x): x is string => !!x)
          .map((b) => ({ b, score: buildScore(catalog, b, myHeroes.length) }))
          .sort((x, y) => y.score - x.score || (x.b < y.b ? -1 : 1));
        for (const { b } of options) {
          const q = quoteConstruction(catalog, belief, playerId, town.id, b);
          if (q.legal && q.balanceAfter.gold >= 1500) {
            out.push({ kind: 'BuildStructure', townId: town.id, buildingId: b });
            break;
          }
        }
      }
      // Hire: returning heroes first, then new candidates, while keeping a reserve.
      if (myHeroes.length < AI_TARGET_HEROES && player.wallet.gold >= hireCost + (strategic.length === 0 ? 0 : HIRE_RESERVE_GOLD)) {
        for (const option of obs.hireRoster[town.id] ?? []) {
          if (quoteHireHero(catalog, belief, playerId, town.id, option.definitionId).legal) {
            out.push({ kind: 'HireHero', townId: town.id, heroDefinitionId: option.definitionId });
            break;
          }
        }
      }
      // Recruit (highest tier first) to a visiting hero, else the garrison.
      const visitor = strategic.find((h) => hexEquals(h.position, town.coord));
      if (visitor && underThreat) holding.add(visitor.id);
      const forms = recruitableCreatureIds(catalog, town)
        .map((id) => catalog.creatures[id]!)
        .sort((a, b) => b.tier - a.tier || (a.form === 'upgraded' ? -1 : 1));
      for (const c of saving && !underThreat ? [] : forms) {
        const dest = visitor && !underThreat ? { kind: 'hero' as const, heroId: visitor.id } : { kind: 'garrison' as const };
        const probe = quoteRecruitment(catalog, belief, playerId, town.id, c.id, 1, dest);
        const qty = probe.maxQuantity;
        if (qty > 0) {
          const q = quoteRecruitment(catalog, belief, playerId, town.id, c.id, qty, dest);
          if (q.legal) out.push({ kind: 'RecruitUnits', townId: town.id, creatureId: c.id, quantity: qty, destination: dest });
        }
      }
      // Reinforce: move garrison stacks into a visiting hero (not while the town is threatened).
      if (visitor && !underThreat) {
        town.garrison.slots.forEach((s, i) => {
          if (!s) return;
          const merge = visitor.army.slots.findIndex((x) => x?.creatureId === s.creatureId);
          const empty = visitor.army.slots.findIndex((x) => !x);
          const to = merge >= 0 ? merge : empty;
          if (to >= 0) out.push({ kind: 'TransferStack', from: { kind: 'garrison', townId: town.id }, fromSlot: i, to: { kind: 'hero', heroId: visitor.id }, toSlot: to, quantity: s.count });
        });
      }
    }
  }

  for (const hero of myHeroes) {
    if (holding.has(hero.id)) continue;
    const moves = hero.ai?.profile === 'patrol' ? patrolCandidates(catalog, belief, playerId, hero) : movementCandidates(catalog, belief, playerId, hero);
    out.push(...moves);
  }
  out.push({ kind: 'EndTurn' });
  return out;
}
