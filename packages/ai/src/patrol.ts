/**
 * Patrol AI: the hostile heroes with `ai.profile === 'patrol'` — campaign
 * patrols with a commander (v1 missions, the arc builder, the v2 kit) and
 * wandering monsters (`HeroState.monster`: an army without a commander, in
 * campaigns and on random maps). Smarter patrols, owner decision 2026-10-16.
 *
 * Plays on the redacted belief only (observation.ts): the only enemy heroes it
 * knows are the visible ones. Proposes MoveHero commands; the controller
 * submits them through the CommandProcessor. Every choice is deterministic: no
 * RNG, ties broken by path cost, then `tieHash`, then the key.
 *
 * In order:
 *   0. Dormant — an announced counterattack waits in its camp until its flag is set.
 *   1. Fall back (commanders only) — a much stronger visible enemy (at least
 *      PATROL_OUTMATCH_MARGIN × its strength) can reach it on its next turn: it
 *      first takes a chase whose end tile is out of that enemy's reach, else
 *      falls back to its home camp (the camp's tile, or a free tile beside it
 *      when the camp's guard holds the tile), else to the safest of its own
 *      waypoints (out of reach, farthest from the threats), else holds where it
 *      stands. It never leaves its region, so the player can still find it.
 *      Wandering monsters never flee.
 *   2. Chase — a visible enemy inside the region it can beat (its authored
 *      `attackThreshold`, unchanged): the nearest by path cost, then the biggest
 *      strength margin, then the stable tie-break; the whole path stays inside
 *      the region. A commander does not chase onto a tile a much stronger enemy
 *      can reach next turn.
 *   3. Guard — nothing to chase, a visible enemy within PATROL_GUARD_RADIUS of a
 *      waypoint or the home camp: go to the waypoint (or home) nearest that
 *      enemy, standing between it and the patrol's holdings, and hold there.
 *   4. Circuit — the waypoint its circuit points at (`ai.waypointIndex`, which
 *      the rules advance on arrival), skipping moves that end in an encounter or
 *      stop where a much stronger enemy can reach next turn.
 * Guard, circuit and fall back never stop on a tile a much stronger visible
 * enemy can reach on its next turn. A waypoint or camp its side has not explored
 * yet is approached through explored tiles (`walkTo`): the hostile side's map
 * starts in fog, and patrols whose next waypoint lay in it used to stand still.
 */
import {
  scenarioMission,
  axialDistance,
  axialNeighbors,
  cellIndex,
  hexEquals,
  hexKey,
  inMap,
  parseHexKey,
  patrolWaypointIndex,
  quoteMovement,
  reachableTiles,
  requireScenarioMission,
  siteAt,
  type CommandPayload,
  type ContentCatalog,
  type HeroState,
  type HexCoord,
  type MatchState,
  type PlayerId,
} from '@pr/rules';
import { endangered, heroStrength, tieHash, withinRegion } from './threat';

/**
 * A visible enemy at least this many times the patrol's strength is "much
 * stronger": a commander falls back from it when it can reach the patrol on its
 * next turn, and no patrol stops a guard, circuit or fall-back move where it can
 * reach. Proposed; measured with the campaign simulator.
 */
export const PATROL_OUTMATCH_MARGIN = 1.25;

/**
 * A visible enemy hero within this many hexes of one of a patrol's waypoints or
 * its home camp makes the patrol guard its ground (under a day's march: a hero
 * walks about 8 hexes a day off the roads, 11 on them). Proposed; measured with
 * the campaign simulator.
 */
export const PATROL_GUARD_RADIUS = 6;

interface Move {
  readonly payload: CommandPayload;
  /** Where the hero stands at the end of today's walk. */
  readonly stop: HexCoord;
  readonly cost: number;
}

/** One decision of one patrol: what it reads, with the per-decision caches. */
interface Ctx {
  readonly catalog: ContentCatalog;
  readonly belief: MatchState;
  readonly playerId: PlayerId;
  readonly hero: HeroState;
  /** Out of every much stronger visible enemy's reach on its next turn (cached by tile). */
  readonly safe: (c: HexCoord) => boolean;
  /** The tiles the patrol reaches today, with their cost (computed once). */
  readonly reach: () => ReadonlyMap<string, number>;
}

/** Ascending numbers, then the stable tie-break of the key. */
function byThenTie<T extends { readonly key: string }>(playerId: PlayerId, ...values: ((x: T) => number)[]) {
  return (a: T, b: T): number => {
    for (const v of values) {
      const va = v(a);
      const vb = v(b);
      if (va !== vb) return va < vb ? -1 : 1;
    }
    return tieHash(playerId, a.key) - tieHash(playerId, b.key) || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0);
  };
}

/** The patrol's commands for this decision (empty: it holds). */
export function patrolCandidates(catalog: ContentCatalog, belief: MatchState, playerId: PlayerId, hero: HeroState): CommandPayload[] {
  const ai = hero.ai;
  if (!ai) return [];
  // Campaign v2: an announced counterattack waits in its camp until its trigger flag is set.
  if (ai.dormantUntilFlag && !belief.mission.flags[ai.dormantUntilFlag]) return [];
  const mine = heroStrength(catalog, belief, hero);
  const enemies = Object.values(belief.heroes)
    .filter((e) => e.ownerId !== playerId && e.status === 'active')
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const strength = new Map(enemies.map((e) => [e.id, heroStrength(catalog, belief, e)]));
  const threats = enemies.filter((e) => strength.get(e.id)! >= mine * PATROL_OUTMATCH_MARGIN);
  const safeByTile = new Map<string, boolean>();
  const safe = (c: HexCoord): boolean => {
    if (threats.length === 0) return true;
    const k = hexKey(c);
    let v = safeByTile.get(k);
    if (v === undefined) safeByTile.set(k, (v = !endangered(catalog, belief, playerId, c, mine, undefined, PATROL_OUTMATCH_MARGIN)));
    return v;
  };
  let reached: ReadonlyMap<string, number> | null = null;
  const ctx: Ctx = { catalog, belief, playerId, hero, safe, reach: () => (reached ??= reachableTiles(catalog, belief, hero.id)) };
  const commander = !hero.monster;
  const chases = chaseMoves(ctx, mine, enemies, strength, commander && threats.length > 0);
  if (commander && threats.length > 0 && !safe(hero.position)) return [...chases, ...fallBackMoves(ctx, threats)];
  // The round follows the chases, as before 2026-10-16: should the rules refuse every chase
  // (the belief can be out of date), the patrol still walks its round this turn.
  if (chases.length > 0) {
    const step = circuitMove(ctx);
    return step ? [...chases, step] : chases;
  }
  // Announced campaign assaults pursue authored sites, using only observed ownership.
  for (const id of ai.assaultSiteIds ?? []) {
    const def = scenarioMission(catalog, belief)?.sites.find((s) => s.id === id);
    if (!def || !exploredBy(belief, playerId, def.coord)) continue;
    const owner = def.kind.type === 'town' ? belief.towns[def.kind.townId]?.ownerId : belief.world.sites[id]?.owner;
    if (owner === playerId) continue;
    const q = quoteMovement(catalog, belief, hero.id, def.coord);
    if (q.reachable && q.stopIndex >= 0) return [{ kind: 'MoveHero', heroId: hero.id, destination: def.coord, confirmEncounter: true }];
  }
  const guard = guardMove(ctx, enemies);
  if (guard === 'hold') return [];
  if (guard) return [guard];
  const step = circuitMove(ctx);
  return step ? [step] : [];
}

/**
 * Visible enemies inside the region the patrol can beat by its attack threshold,
 * best first: nearest by path cost, then the biggest strength margin, then the
 * stable tie-break. `careful` (a commander with a much stronger enemy in view):
 * skip a chase that ends where that enemy can reach next turn — the target's own
 * tile judged with the target gone, since its allies cannot walk onto it while
 * it stands there.
 */
function chaseMoves(ctx: Ctx, mine: number, enemies: readonly HeroState[], strength: ReadonlyMap<string, number>, careful: boolean): CommandPayload[] {
  const { catalog, belief, playerId, hero } = ctx;
  const t = hero.ai!.attackThreshold;
  const options: { key: string; cost: number; margin: number; payload: CommandPayload }[] = [];
  for (const enemy of enemies) {
    if (!withinRegion(hero, enemy.position)) continue;
    const theirs = strength.get(enemy.id)!;
    if (mine * t.denominator < theirs * t.numerator) continue;
    const q = quoteMovement(catalog, belief, hero.id, enemy.position);
    if (!q.reachable || !q.path.every((c) => withinRegion(hero, c))) continue;
    const last = q.path.length - 1;
    const arrives = q.endsInEncounter && q.stopIndex === last;
    const stopIndex = arrives ? last : Math.min(q.stopIndex, last - 1);
    if (stopIndex < 0) continue; // not even one step today
    if (careful) {
      const view = arrives ? withoutHero(belief, enemy.id) : belief;
      if (endangered(catalog, view, playerId, arrives ? enemy.position : q.path[stopIndex]!, mine, enemy.id, PATROL_OUTMATCH_MARGIN)) continue;
    }
    options.push({ key: enemy.id, cost: q.totalCost, margin: theirs > 0 ? mine / theirs : Number.MAX_VALUE, payload: { kind: 'MoveHero', heroId: hero.id, destination: enemy.position, confirmEncounter: true } });
  }
  options.sort(byThenTie(playerId, (x) => x.cost, (x) => -x.margin));
  return options.map((o) => o.payload);
}

/** The belief without one hero (the tile it stands on, once it is beaten). */
function withoutHero(belief: MatchState, heroId: string): MatchState {
  const heroes = { ...belief.heroes };
  delete heroes[heroId];
  return { ...belief, heroes };
}

/** How many tiles a step toward an unexplored destination checks exactly (each check quotes a route). */
const FRONTIER_CHECKS = 12;

/** Explored by this side: its pathfinder never routes through the unexplored. */
function exploredBy(belief: MatchState, playerId: PlayerId, c: HexCoord): boolean {
  const map = belief.world.map;
  if (!inMap(map, c)) return false;
  const fog = belief.fog[playerId];
  return !fog || fog.explored[cellIndex(map, c)] === 1;
}

/**
 * A walk toward `dest` that does not end in an encounter, takes at least one
 * step today, keeps inside the region (the whole route, or with `prefixOnly`
 * only today's part — the circuit's check before 2026-10-16) and stops on a
 * safe tile.
 *
 * A destination this side has not explored yet (a patrol's own waypoint or camp
 * beyond what it has seen — its side's map starts in fog, so a patrol used to
 * stand still when its next waypoint lay in the fog): a step through explored
 * tiles to the tile reachable today nearest the destination, closer than where
 * the patrol stands, free of sites. Its vision reveals the way as it walks; only
 * the patrol's own authored route is read, never what lies in the fog.
 */
function walkTo(ctx: Ctx, dest: HexCoord, prefixOnly = false): Move | null {
  const { catalog, belief, hero } = ctx;
  if (hexEquals(dest, hero.position)) return null;
  if (!exploredBy(belief, hero.ownerId, dest)) return frontierStep(ctx, dest);
  const q = quoteMovement(catalog, belief, hero.id, dest);
  if (!q.reachable || q.endsInEncounter || q.stopIndex < 0) return null;
  const today = q.path.slice(0, q.stopIndex + 1);
  if (!(prefixOnly ? today : q.path).every((c) => withinRegion(hero, c))) return null;
  const stop = today[today.length - 1]!;
  if (!ctx.safe(stop)) return null;
  return { payload: { kind: 'MoveHero', heroId: hero.id, destination: dest }, stop, cost: q.totalCost };
}

function frontierStep(ctx: Ctx, dest: HexCoord): Move | null {
  const { catalog, belief, hero } = ctx;
  const here = axialDistance(hero.position, dest);
  const options = [...ctx.reach()]
    .map(([k, cost]) => ({ key: k, c: parseHexKey(k), cost }))
    .map((x) => ({ ...x, d: axialDistance(x.c, dest) }))
    .filter((x) => x.d < here && withinRegion(hero, x.c) && !siteAt(catalog, belief, x.c))
    .sort(byThenTie(hero.ownerId, (x) => x.d, (x) => x.cost))
    .slice(0, FRONTIER_CHECKS);
  for (const o of options) {
    const q = quoteMovement(catalog, belief, hero.id, o.c);
    if (!q.reachable || q.endsInEncounter || q.stopIndex !== q.path.length - 1) continue;
    if (!q.path.every((c) => withinRegion(hero, c)) || !ctx.safe(o.c)) continue;
    return { payload: { kind: 'MoveHero', heroId: hero.id, destination: o.c }, stop: o.c, cost: q.totalCost };
  }
  return null;
}

/**
 * Where the patrol stands at its home camp: the camp's own tile when a hero may
 * stand there, else the free tiles beside it (no other site, inside the region).
 * While the camp's guard holds it, its tile is an encounter for every hero.
 */
function homeStands(ctx: Ctx): { home: HexCoord; tiles: HexCoord[] } | null {
  const { catalog, belief, hero } = ctx;
  const homeId = hero.ai?.homeSiteId;
  if (!homeId) return null;
  const def = requireScenarioMission(catalog, belief).sites.find((s) => s.id === homeId);
  if (!def) return null;
  const beside = axialNeighbors(def.coord).filter((n) => withinRegion(hero, n) && !siteAt(catalog, belief, n));
  return { home: def.coord, tiles: [def.coord, ...beside] };
}

/**
 * Fall back from much stronger enemies: home camp, else the safest waypoint,
 * else nothing (hold). Destinations and today's stop are out of the threats' reach.
 */
function fallBackMoves(ctx: Ctx, threats: readonly HeroState[]): CommandPayload[] {
  const { playerId, hero, safe } = ctx;
  const far = (c: HexCoord) => Math.min(...threats.map((e) => axialDistance(e.position, c)));
  const out: CommandPayload[] = [];
  const stands = homeStands(ctx);
  if (stands) {
    const home = stands.tiles
      .filter((c) => safe(c))
      .flatMap((c) => {
        const m = walkTo(ctx, c);
        return m ? [{ key: `home:${hexKey(c)}`, far: far(c), m }] : [];
      })
      .sort(byThenTie(playerId, (x) => -x.far, (x) => x.m.cost));
    out.push(...home.map((x) => x.m.payload));
  }
  const wps = (hero.ai?.waypoints ?? [])
    .map((w, i) => ({ w, i }))
    .filter((x) => safe(x.w))
    .flatMap(({ w, i }) => {
      const m = walkTo(ctx, w);
      return m ? [{ key: `wp:${i}:${hexKey(w)}`, far: far(w), m }] : [];
    })
    .sort(byThenTie(playerId, (x) => -x.far, (x) => x.m.cost));
  out.push(...wps.map((x) => x.m.payload));
  return out;
}

/**
 * Guard the patrol's ground: the visible enemy nearest its waypoints or home camp
 * (within PATROL_GUARD_RADIUS) — then the waypoint or home nearest that enemy that
 * can be walked to safely. 'hold' when the patrol already stands on the best one;
 * null when no enemy is near (or no guard point can be reached).
 */
function guardMove(ctx: Ctx, enemies: readonly HeroState[]): CommandPayload | 'hold' | null {
  const { playerId, hero, safe } = ctx;
  const stands = homeStands(ctx);
  const points: { key: string; coord: HexCoord; home: boolean }[] = hero.ai!.waypoints.map((w, i) => ({ key: `wp:${i}:${hexKey(w)}`, coord: w, home: false }));
  if (stands) points.push({ key: `home:${hexKey(stands.home)}`, coord: stands.home, home: true });
  if (points.length === 0) return null;
  const ground = (c: HexCoord) => Math.min(...points.map((p) => axialDistance(p.coord, c)));
  const intruder = enemies
    .map((e) => ({ key: e.id, e, d: ground(e.position) }))
    .filter((x) => x.d <= PATROL_GUARD_RADIUS)
    .sort(byThenTie(playerId, (x) => x.d, (x) => axialDistance(x.e.position, hero.position)))[0]?.e;
  if (!intruder) return null;
  const ranked = [...points].sort(byThenTie(playerId, (p) => axialDistance(p.coord, intruder.position), (p) => axialDistance(p.coord, hero.position)));
  for (const p of ranked) {
    if (p.home && stands) {
      // Standing at home: on the camp's tile or beside it.
      if (stands.tiles.some((t) => hexEquals(t, hero.position))) return 'hold';
      const best = stands.tiles
        .flatMap((c) => {
          const m = walkTo(ctx, c);
          return m && safe(c) ? [{ key: hexKey(c), d: axialDistance(c, intruder.position), m }] : [];
        })
        .sort(byThenTie(playerId, (x) => x.d, (x) => x.m.cost))[0];
      if (best) return best.m.payload;
      continue;
    }
    if (hexEquals(p.coord, hero.position)) return 'hold';
    const m = walkTo(ctx, p.coord);
    if (m && safe(p.coord)) return m.payload;
  }
  return null;
}

/**
 * The waypoint circuit: the waypoint the circuit points at (`ai.waypointIndex`,
 * advanced by the rules when the patrol reaches it — `patrolWaypointIndex`), or the
 * one after it while the patrol stands on it (a patrol placed on its first
 * waypoint); when that one cannot be walked to safely, the following ones in
 * order. Guard, chase and fall-back detours leave the index alone, so the circuit
 * resumes where it was.
 */
function circuitMove(ctx: Ctx): CommandPayload | null {
  const { hero } = ctx;
  const ai = hero.ai!;
  const wps = ai.waypoints;
  let i = patrolWaypointIndex(ai);
  if (i < 0) return null;
  if (hexEquals(wps[i]!, hero.position)) i = (i + 1) % wps.length;
  for (let k = 0; k < wps.length; k++) {
    const m = walkTo(ctx, wps[(i + k) % wps.length]!, true);
    if (m) return m.payload;
  }
  return null;
}
