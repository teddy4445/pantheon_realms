/**
 * Smarter patrols (owner decision 2026-10-16): chase the best beatable target,
 * guard the route and the home camp, fall back when outmatched (commanders
 * only), else walk the circuit — never stopping where a much stronger visible
 * enemy can reach next turn. Crafted states on The New Fire chapter 2 (Acatl's
 * patrol, home camp `nf2_reserve`), with open plains and no roads so that path
 * costs are hex distances (100 per hex): the patrol walks 8 hexes a day, the
 * enemy heroes 8 too, and every hero sees 5 hexes.
 */
import { describe, expect, it } from 'vitest';
import { loadCatalog } from '@pr/content';
import { createMissionMatch } from '@pr/campaign';
import { axialDistance, deepClone, hexEquals, movementBudget, processCommand, quoteMovement, type CommandPayload, type GameCommand, type HeroState, type HexCoord, type MatchState } from '@pr/rules';
import { buildObservation, runAITurn, strategicCandidates } from '../src';
import { PATROL_GUARD_RADIUS, PATROL_OUTMATCH_MARGIN, patrolCandidates } from '../src/patrol';
import { endangered, heroStrength, withinRegion } from '../src/threat';

const catalog = loadCatalog();
const MISSION = 'new_fire_v2_m02';
const HOSTILE = 'hostile';
const PATROL = 'mesoamerican_acatl_0';
const HOME = catalog.missions[MISSION]!.sites.find((s) => s.id === 'nf2_reserve')!.coord;
const base = createMissionMatch(catalog, MISSION, { matchId: 'patrol-fixture', difficultyId: 'campaign_normal' }).match;

const at = (q: number, r: number): HexCoord => ({ q, r });

/**
 * The chapter on open plains without roads; only the town and the home camp keep
 * their sites (still guarded); every tile explored for both sides; the patrol on
 * `start` with a full day's movement and the given waypoints; Itzel moved off the map's
 * action (the tests place the enemy heroes they need).
 */
function fixture(start: HexCoord, waypoints: HexCoord[]): MatchState {
  const s = deepClone(base);
  const map = s.world.map;
  s.world.map = { ...map, terrain: 'p'.repeat(map.width * map.height), roads: [] };
  const mission = catalog.missions[MISSION]!;
  for (const def of mission.sites) if (def.kind.type !== 'town' && def.id !== 'nf2_reserve') delete s.world.sites[def.id];
  for (const fog of Object.values(s.fog)) fog.explored = fog.explored.map(() => 1);
  // These states size enemy armies to exact strength ratios: judged with full information
  // (scouting intel off; the estimates under `scoutingIntelV1` are tested in scoutingIntel.test.ts).
  s.scenario = { ...s.scenario, features: { ...s.scenario.features!, scoutingIntelV1: false } };
  s.activePlayerId = HOSTILE;
  const p = s.heroes[PATROL]!;
  p.position = { ...start };
  p.ai!.waypoints = waypoints.map((w) => ({ ...w }));
  delete p.ai!.regionCenter; delete p.ai!.regionRadius;
  p.movementPoints = movementBudget(catalog, s, p).total;
  // Itzel waits in a far corner, out of sight, unless a test moves her.
  s.heroes['itzel']!.position = at(1, 20);
  return s;
}

/** A player hero (a copy of Itzel) at `c` whose strength is `ratio` × the patrol's. */
function enemyAt(s: MatchState, id: string, c: HexCoord, ratio: number): HeroState {
  const h = deepClone(s.heroes['itzel']!);
  h.id = id;
  h.name = id;
  h.position = { ...c };
  const creatureId = h.army.slots.find((x) => x)!.creatureId;
  const target = ratio * heroStrength(catalog, s, s.heroes[PATROL]!);
  const strengthOf = (n: number) => {
    h.army.slots = [{ creatureId, count: n }, null, null, null, null, null, null];
    return heroStrength(catalog, s, h);
  };
  // The smallest count at least as strong as the target (strength grows with the count).
  let lo = 1;
  let hi = 4000;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (strengthOf(mid) >= target) hi = mid;
    else lo = mid + 1;
  }
  strengthOf(lo);
  s.heroes[id] = h;
  return h;
}

/** A hostile hero that only lends its eyes (the patrol sees what its side sees). */
function observerAt(s: MatchState, c: HexCoord): void {
  const o = deepClone(s.heroes[PATROL]!);
  o.id = 'observer';
  o.position = { ...c };
  o.ai = { ...o.ai!, waypoints: [] };
  s.heroes['observer'] = o;
}

function plan(s: MatchState): CommandPayload[] {
  const obs = buildObservation(catalog, s, HOSTILE);
  return patrolCandidates(catalog, obs.belief, HOSTILE, obs.belief.heroes[PATROL]!);
}

const dest = (c: CommandPayload | undefined): HexCoord | null => (c && c.kind === 'MoveHero' ? c.destination : null);

/** The first candidate is a legal command (the controller submits it through the processor). */
function accepted(s: MatchState, c: CommandPayload): boolean {
  const cmd = { ...c, commandId: 'probe', expectedRevision: s.revision, actorPlayerId: HOSTILE } as GameCommand;
  return processCommand({ catalog }, s, cmd).ok;
}

describe('patrol AI: chase', () => {
  it('chases the nearest beatable hero, then the biggest margin — not the first by ID', () => {
    const s = fixture(at(30, 10), [at(30, 10), at(36, 10)]);
    // Equal path cost (3 hexes each): the weaker one (bigger margin) is chosen.
    enemyAt(s, 'a_strong', at(33, 10), 0.7);
    enemyAt(s, 'b_weak', at(27, 10), 0.3);
    const c = plan(s);
    expect(c[0]).toEqual({ kind: 'MoveHero', heroId: PATROL, destination: at(27, 10), confirmEncounter: true });
    // The chases, best first; the round follows them (walked should the rules refuse every chase).
    expect(c.filter((x) => x.kind === 'MoveHero' && x.confirmEncounter).map(dest)).toEqual([at(27, 10), at(33, 10)]);
    expect(c.length).toBe(3);
    expect(accepted(s, c[0]!)).toBe(true);
    // Nearer first: the stronger one two hexes away beats the weaker one three hexes away.
    s.heroes['a_strong']!.position = at(32, 10);
    expect(dest(plan(s)[0])).toEqual(at(32, 10));
    // A hero above the attack threshold is not chased.
    const t = s.heroes[PATROL]!.ai!.attackThreshold;
    expect(t).toEqual({ numerator: 11, denominator: 10 });
    const s2 = fixture(at(30, 10), [at(30, 10), at(36, 10)]);
    enemyAt(s2, 'even', at(32, 10), 1.0);
    expect(plan(s2).some((c2) => c2.kind === 'MoveHero' && c2.confirmEncounter)).toBe(false);
  });

  it('keeps the chase inside its region', () => {
    const s = fixture(at(30, 10), [at(30, 10), at(36, 10)]);
    s.heroes[PATROL]!.ai!.regionMinQ = 29;
    enemyAt(s, 'outside', at(27, 10), 0.3);
    enemyAt(s, 'inside', at(34, 10), 0.6);
    const c = plan(s);
    expect(c.filter((x) => x.kind === 'MoveHero' && x.confirmEncounter).map(dest)).toEqual([at(34, 10)]);
    // A wandering monster's circle too.
    const m = fixture(at(30, 10), [at(30, 10), at(32, 10)]);
    const mp = m.heroes[PATROL]!;
    mp.ai!.regionCenter = at(30, 10);
    mp.ai!.regionRadius = 2;
    mp.monster = { bounty: { gold: 0, wood: 0, stone: 0, crystal: 0, favor: 0 }, creatureId: mp.army.slots.find((x) => x)!.creatureId };
    enemyAt(m, 'near', at(33, 10), 0.3);
    const cm = plan(m);
    expect(cm.some((x) => x.kind === 'MoveHero' && x.confirmEncounter)).toBe(false);
    for (const x of cm) {
      const q = quoteMovement(catalog, m, PATROL, dest(x)!);
      expect(q.path.slice(0, q.stopIndex + 1).every((h) => withinRegion(mp, h))).toBe(true);
    }
  });

  it('waits while dormant, then marches', () => {
    const s = fixture(at(30, 10), [at(30, 10), at(36, 10)]);
    s.heroes[PATROL]!.ai!.dormantUntilFlag = 'test_counterattack';
    enemyAt(s, 'weak', at(32, 10), 0.3);
    expect(plan(s)).toEqual([]);
    s.mission.flags['test_counterattack'] = true;
    expect(dest(plan(s)[0])).toEqual(at(32, 10));
  });
});

describe('patrol AI: guard', () => {
  // Waypoints A → B → C; the patrol stands on A, so its circuit goes to B next.
  const A = at(30, 10);
  const B = at(36, 10);
  const C = at(30, 4);

  it('heads for the waypoint nearest an approaching enemy instead of walking on, and holds there', () => {
    const calm = fixture(A, [A, B, C]);
    expect(plan(calm)).toEqual([{ kind: 'MoveHero', heroId: PATROL, destination: B }]);
    // An enemy a little stronger than the patrol (no chase, no fall back) near C.
    const s = fixture(A, [A, B, C]);
    const intruder = enemyAt(s, 'intruder', at(31, 6), 1.12);
    expect(axialDistance(intruder.position, C)).toBeLessThanOrEqual(PATROL_GUARD_RADIUS);
    expect(axialDistance(intruder.position, C)).toBeLessThan(axialDistance(intruder.position, A));
    const c = plan(s);
    expect(c).toEqual([{ kind: 'MoveHero', heroId: PATROL, destination: C }]);
    expect(accepted(s, c[0]!)).toBe(true);
    // Standing on C with the enemy still there: it holds its ground.
    const there = fixture(C, [A, B, C]);
    enemyAt(there, 'intruder', at(31, 6), 1.12);
    expect(plan(there)).toEqual([]);
  });

  it('guards its home camp: an enemy near the camp brings the patrol beside it', () => {
    const s = fixture(at(36, 8), [at(36, 8), at(30, 12)]);
    // Near the camp (and nearer it than to any waypoint), a little stronger than the patrol.
    const intruder = enemyAt(s, 'intruder', at(40, 4), 1.12);
    expect(axialDistance(intruder.position, HOME)).toBeLessThan(Math.min(axialDistance(intruder.position, at(36, 8)), axialDistance(intruder.position, at(30, 12))));
    const d = dest(plan(s)[0]);
    expect(d).not.toBeNull();
    expect(axialDistance(d!, HOME)).toBe(1); // the camp's own tile is held by its guard
  });

  it('never steps into a much stronger enemy’s reach: the circuit skips that waypoint', () => {
    const wps = [at(20, 16), at(28, 16), at(20, 10)];
    const calm = fixture(wps[0]!, wps);
    expect(dest(plan(calm)[0])).toEqual(wps[1]);
    const s = fixture(wps[0]!, wps);
    // Twice the patrol's strength, 8 hexes from the next waypoint (in reach), 16 from the patrol.
    enemyAt(s, 'army', at(36, 16), 2);
    observerAt(s, at(36, 12));
    const obs = buildObservation(catalog, s, HOSTILE);
    expect(obs.belief.heroes['army']).toBeDefined();
    expect(endangered(catalog, obs.belief, HOSTILE, wps[1]!, heroStrength(catalog, s, s.heroes[PATROL]!), undefined, PATROL_OUTMATCH_MARGIN)).toBe(true);
    const c = plan(s);
    expect(c).toEqual([{ kind: 'MoveHero', heroId: PATROL, destination: wps[2] }]);
    // The same for a wandering monster (it does not flee, but it does not walk into reach either).
    const p = s.heroes[PATROL]!;
    p.monster = { bounty: { gold: 0, wood: 0, stone: 0, crystal: 0, favor: 0 }, creatureId: p.army.slots.find((x) => x)!.creatureId };
    expect(dest(plan(s)[0])).toEqual(wps[2]);
  });

  it('a commander does not chase onto a tile a much stronger enemy can reach; a monster does', () => {
    const wps = [at(20, 16), at(20, 10)];
    const s = fixture(wps[0]!, wps);
    enemyAt(s, 'weak', at(24, 16), 0.3);
    enemyAt(s, 'army', at(32, 16), 2);
    observerAt(s, at(30, 13));
    const c = plan(s);
    expect(c.some((x) => x.kind === 'MoveHero' && x.confirmEncounter)).toBe(false);
    const p = s.heroes[PATROL]!;
    p.monster = { bounty: { gold: 0, wood: 0, stone: 0, crystal: 0, favor: 0 }, creatureId: p.army.slots.find((x) => x)!.creatureId };
    expect(plan(s)[0]).toEqual({ kind: 'MoveHero', heroId: PATROL, destination: at(24, 16), confirmEncounter: true });
  });
});

describe('patrol AI: its own route in the fog', () => {
  it('walks toward a waypoint its side has not explored yet, through explored tiles only', () => {
    const wps = [at(20, 10), at(32, 10)];
    const s = fixture(wps[0]!, wps);
    // The hostile side has seen only what the patrol sees from where it stands.
    const map = s.world.map;
    s.fog[HOSTILE]!.explored = s.fog[HOSTILE]!.explored.map((_, i) => (axialDistance({ q: i % map.width, r: Math.floor(i / map.width) }, wps[0]!) <= 5 ? 1 : 0));
    const explored = (c: HexCoord) => s.fog[HOSTILE]!.explored[c.r * map.width + c.q] === 1;
    expect(explored(wps[1]!)).toBe(false);
    expect(quoteMovement(catalog, s, PATROL, wps[1]!).reachable).toBe(false); // the old circuit stood still here
    const c = plan(s);
    const d = dest(c[0])!;
    expect(explored(d)).toBe(true);
    expect(axialDistance(d, wps[1]!)).toBeLessThan(axialDistance(wps[0]!, wps[1]!));
    expect(accepted(s, c[0]!)).toBe(true);
    expect(plan(s)).toEqual(c);
  });
});

describe('patrol AI: the circuit in order', () => {
  it('walks the whole circuit in order, a waypoint listed twice included (Acatl), and resumes it after a guard detour', () => {
    const route = base.heroes[PATROL]!.ai!.waypoints;
    expect(route.length).toBe(4);
    let s = fixture(base.heroes[PATROL]!.position, route);
    const pointed: number[] = [];
    for (let day = 0; day < 14; day++) {
      s = runAITurn(catalog, s);
      const i = s.heroes[PATROL]!.ai!.waypointIndex;
      if (pointed[pointed.length - 1] !== i) pointed.push(i);
      const end = processCommand({ catalog }, s, { kind: 'EndTurn', commandId: `end-${day}`, expectedRevision: s.revision, actorPlayerId: s.activePlayerId } as GameCommand);
      if (!end.ok) throw new Error(end.rejection.message);
      s = end.state;
      if (s.activePlayerId !== HOSTILE) throw new Error('expected the hostile turn');
    }
    // Every waypoint in turn — the north depot, the start, the south dock, the start — and round again.
    expect(pointed.slice(0, 5)).toEqual([0, 1, 2, 3, 0]);
    // A guard detour toward another waypoint keeps the circuit's place.
    const g = fixture(at(30, 10), [at(30, 10), at(36, 10), at(30, 4)]);
    g.heroes[PATROL]!.ai!.waypointIndex = 1;
    enemyAt(g, 'intruder', at(31, 6), 1.12);
    const c = plan(g);
    expect(c).toEqual([{ kind: 'MoveHero', heroId: PATROL, destination: at(30, 4) }]);
    const r = processCommand({ catalog }, g, { ...c[0]!, commandId: 'guard', expectedRevision: g.revision, actorPlayerId: HOSTILE } as GameCommand);
    expect(r.ok && r.state.heroes[PATROL]!.ai!.waypointIndex).toBe(1);
  });
});

describe('patrol AI: fall back (commanders only)', () => {
  // The patrol stands 5 hexes from its home camp; a much stronger enemy 4 hexes away can reach it.
  const START = at(36, 8);
  const THREAT = at(32, 10);

  it('falls back to its home camp when a much stronger enemy can reach it', () => {
    const s = fixture(START, [START, at(30, 10)]);
    enemyAt(s, 'army', THREAT, 2);
    const obs = buildObservation(catalog, s, HOSTILE);
    const mine = heroStrength(catalog, s, s.heroes[PATROL]!);
    expect(endangered(catalog, obs.belief, HOSTILE, START, mine, undefined, PATROL_OUTMATCH_MARGIN)).toBe(true);
    const c = plan(s);
    const d = dest(c[0])!;
    expect(axialDistance(d, HOME)).toBe(1);
    expect(endangered(catalog, obs.belief, HOSTILE, d, mine, undefined, PATROL_OUTMATCH_MARGIN)).toBe(false);
    expect(accepted(s, c[0]!)).toBe(true);
    // Every proposal is out of the threat's reach.
    for (const x of c) expect(endangered(catalog, obs.belief, HOSTILE, dest(x)!, mine, undefined, PATROL_OUTMATCH_MARGIN)).toBe(false);
    // A merely stronger enemy (below the margin) does not make it fall back.
    const s2 = fixture(START, [START, at(30, 10)]);
    enemyAt(s2, 'army', THREAT, PATROL_OUTMATCH_MARGIN * 0.9);
    expect(plan(s2).some((x) => axialDistance(dest(x)!, HOME) <= 1)).toBe(false);
  });

  it('else falls back to its safest waypoint, else holds where it stands', () => {
    const safeWp = at(40, 11); // 9 hexes from the threat
    const nearWp = at(38, 4); // 6 hexes from the threat
    const s = fixture(START, [START, at(30, 10), nearWp, safeWp]);
    delete s.heroes[PATROL]!.ai!.homeSiteId;
    enemyAt(s, 'army', THREAT, 2);
    const c = plan(s);
    expect(c).toEqual([{ kind: 'MoveHero', heroId: PATROL, destination: safeWp }]);
    expect(accepted(s, c[0]!)).toBe(true);
    // No safe waypoint and no home camp: it holds (no move).
    const h = fixture(START, [START, at(30, 10), nearWp]);
    delete h.heroes[PATROL]!.ai!.homeSiteId;
    enemyAt(h, 'army', THREAT, 2);
    expect(plan(h)).toEqual([]);
    // The turn still ends cleanly.
    expect(strategicCandidates(catalog, buildObservation(catalog, h, HOSTILE))).toEqual([{ kind: 'EndTurn' }]);
  });

  it('a wandering monster never flees', () => {
    const s = fixture(START, [START, at(30, 10)]);
    const p = s.heroes[PATROL]!;
    p.monster = { bounty: { gold: 0, wood: 0, stone: 0, crystal: 0, favor: 0 }, creatureId: p.army.slots.find((x) => x)!.creatureId };
    enemyAt(s, 'army', THREAT, 2);
    const c = plan(s);
    // It holds its ground at the waypoint nearest the enemy it can stand on safely — here, where it stands.
    expect(c.some((x) => axialDistance(dest(x)!, HOME) <= 1)).toBe(false);
    expect(c).toEqual([]);
  });
});

describe('patrol AI: determinism and belief', () => {
  it('gives the same commands for the same input, and never reads a hero it cannot see', () => {
    const make = () => {
      const s = fixture(at(30, 10), [at(30, 10), at(36, 10), at(30, 4)]);
      enemyAt(s, 'intruder', at(31, 6), 1.12);
      enemyAt(s, 'weak', at(34, 13), 0.2);
      return s;
    };
    const a = plan(make());
    expect(a.length).toBeGreaterThan(0);
    expect(plan(make())).toEqual(a);
    expect(plan(deepClone(make()))).toEqual(a);
    // A much stronger enemy out of sight changes nothing.
    const hidden = make();
    enemyAt(hidden, 'hidden_army', at(44, 18), 3);
    expect(buildObservation(catalog, hidden, HOSTILE).belief.heroes['hidden_army']).toBeUndefined();
    expect(plan(hidden)).toEqual(a);
    // The full planner gives the same list twice.
    const s = make();
    expect(strategicCandidates(catalog, buildObservation(catalog, s, HOSTILE))).toEqual(strategicCandidates(catalog, buildObservation(catalog, make(), HOSTILE)));
    expect(hexEquals(s.heroes[PATROL]!.position, at(30, 10))).toBe(true); // planning never moves anyone
  });
});
