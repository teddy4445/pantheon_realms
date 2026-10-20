/**
 * Scouting intel — the projection and the per-player snapshots (expedition kit §05,
 * scenario feature `scoutingIntelV1`; design/scouting-policy.json, proposed values):
 * every distance and Scouting-rank boundary, current visibility required, towns that
 * identify but never scout, duplicate stacks grouped and base/upgraded forms apart, own
 * armies in full, snapshots that never update remotely (position, owner, day), re-entry
 * at a lower stage with the earlier report kept apart, removal by inspection or a known
 * fate, the feature off exactly as before, and determinism.
 */
import { describe, expect, it } from 'vitest';
import { GameDriver } from '@pr/testing';
import {
  INTEL_STAGE_RANK,
  armyGoldValue,
  armyIntel,
  canonicalStateHash,
  deepClone,
  intelCountRange,
  intelStrengthBand,
  intelVision,
  lastKnownIntel,
  observationStage,
  processCommand,
  refreshIntelSnapshots,
  scoutingRank,
  staleIntelReports,
  type CreatureStackState,
  type GameEventPayload,
  type HexCoord,
  type MatchState,
  type ScenarioFeatures,
} from '../src';

const SK = 'skirmish_twin_harbors';
const ME = 'player';
const FOE = 'rival';
const HERO = 'alexios';
const ENEMY = 'rival_odysseus';
/** Row 7 of Twin Harbors is open plains from q 2 to 33 (no site on it): distances along it are |Δq|. */
const ROW = 7;
const at = (q: number): HexCoord => ({ q, r: ROW });

type Army = [string, number][];
const slots = (army: Army): (CreatureStackState | null)[] => {
  const out: (CreatureStackState | null)[] = [null, null, null, null, null, null, null];
  army.forEach(([creatureId, count], i) => (out[i] = { stackId: `s${i}`, creatureId, count }));
  return out;
};

function features(d: GameDriver, patch: Partial<ScenarioFeatures>): void {
  d.state.scenario = { ...d.state.scenario, features: { ...d.state.scenario.features!, ...patch } };
}

interface Setup {
  /** My hero's column on row 7 (default 16: far from both towns). */
  me?: number;
  /** The enemy hero's column on row 7. */
  foe?: number;
  scouting?: number;
  army?: Army;
  intel?: boolean;
  matchId?: string;
}

function setup(o: Setup = {}): GameDriver {
  const d = GameDriver.mission(SK, { matchId: o.matchId ?? 'intel' });
  features(d, { weeklyEvents: false, scoutingIntelV1: o.intel !== false });
  for (const fog of Object.values(d.state.fog)) fog.explored = fog.explored.map(() => 1);
  const me = d.state.heroes[HERO]!;
  me.army = { slots: slots([['hoplite',20],['peltast',8]]) };
  me.position = at(o.me ?? 16);
  me.skills = o.scouting ? [{ skillId: 'scouting', rank: o.scouting }] : [];
  const foe = d.state.heroes[ENEMY]!;
  foe.position = at(o.foe ?? 30);
  foe.army = { slots: slots(o.army ?? [['hoplite',20],['peltast',8]]) };
  return d;
}

const stageOf = (d: GameDriver, viewer = ME) => armyIntel(d.catalog, d.state, viewer, ENEMY)?.stage ?? null;

/** Move my hero along row 7 through the real processor (the snapshots follow the command). */
function walk(d: GameDriver, q: number): void {
  d.state.heroes[HERO]!.movementPoints = 5000;
  d.do({ kind: 'MoveHero', heroId: HERO, destination: at(q) });
}

describe('scouting intel — stages', () => {
  it('rank 0: beyond 3 visible hexes a sighting, within 3 identified, adjacency never counts, outside vision nothing', () => {
    const expect0: [number, string | null][] = [
      [6, null],
      [5, 'sighting'],
      [4, 'sighting'],
      [3, 'identified'],
      [2, 'identified'],
      [1, 'identified'],
    ];
    for (const [dist, stage] of expect0) expect(stageOf(setup({ foe: 16 + dist })), `rank 0 at ${dist}`).toBe(stage);
  });

  it('Scouting rank 1/2/3 scouts within 2/3/4 hexes and keeps its +1/+2/+3 vision', () => {
    const table: [number, number, string | null][] = [
      // rank, distance, stage
      [1, 7, null],
      [1, 6, 'sighting'],
      [1, 3, 'identified'],
      [1, 2, 'scouted'],
      [1, 1, 'scouted'],
      [2, 8, null],
      [2, 7, 'sighting'],
      [2, 4, 'sighting'],
      [2, 3, 'scouted'],
      [3, 9, null],
      [3, 8, 'sighting'],
      [3, 5, 'sighting'],
      [3, 4, 'scouted'],
    ];
    for (const [rank, dist, stage] of table) {
      const d = setup({ foe: 16 + dist, scouting: rank });
      expect(scoutingRank(d.catalog, d.state.heroes[HERO]!)).toBe(rank);
      expect(stageOf(d), `rank ${rank} at ${dist}`).toBe(stage);
    }
  });

  it('every stage needs current visibility: distance alone never sees through fog', () => {
    const d = setup({ foe: 18, scouting: 1 });
    expect(stageOf(d)).toBe('scouted');
    // The same observer without vision of the tile: nothing at all.
    const policy = d.catalog.scoutingIntelPolicy!;
    const blind = { viewerId: ME, visible: new Set<number>(), observers: [{ coord: at(16), detail: 4 }] };
    expect(observationStage(policy, d.state.world.map, blind, at(18))).toBeNull();
    // A rules profile with no hero vision: the rank-1 hero (vision 1) no longer sees 2 hexes away.
    const dim = { ...d.catalog, rulesProfile: { ...d.catalog.rulesProfile, heroVisionRadius: 0 } };
    expect(armyIntel(dim, d.state, ME, ENEMY)).toBeNull();
    d.state.heroes[ENEMY]!.position = at(17);
    expect(armyIntel(dim, d.state, ME, ENEMY)?.stage).toBe('scouted');
  });

  it('the best observer decides; a town identifies but never scouts', () => {
    // My town at (3,8) sees 3 hexes (the enemy at (5,7) stands 2 away); my scout is far away.
    const d = setup({ me: 16, foe: 5, scouting: 3 });
    expect(stageOf(d)).toBe('identified');
    const report = armyIntel(d.catalog, d.state, ME, ENEMY)!;
    expect(report.creatures!.every((c) => c.range === undefined && c.count === undefined)).toBe(true);
    // The scout comes within 4: scouted (the better observer wins).
    d.state.heroes[HERO]!.position = at(9);
    expect(stageOf(d)).toBe('scouted');
    // Divine-Sight-like vision shows the tile but observes from nowhere: a sighting.
    const far = setup({ me: 16, foe: 26 });
    far.state.fog[ME]!.temporaryReveals = [{ center: at(26), radius: 2, untilDay: 9 }];
    expect(stageOf(far)).toBe('sighting');
  });

  it('own armies keep full information; the enemy sees mine by the same rules', () => {
    const d = setup({ foe: 19 });
    const mine = armyIntel(d.catalog, d.state, ME, HERO)!;
    expect(mine.stage).toBe('full');
    expect(mine.creatures).toEqual([
      { creatureId: 'hoplite', count: 20 },
      { creatureId: 'peltast', count: 8 },
    ]);
    expect(armyIntel(d.catalog, d.state, FOE, HERO)!.stage).toBe('identified');
  });
});

describe('scouting intel — what a report holds', () => {
  const ARMY: Army = [
    ['hoplite', 20],
    ['peltast', 8],
    ['hoplite', 15],
    ['veteran_hoplite', 5],
  ];

  it('sighting: owner banner and one strength band only', () => {
    const d = setup({ foe: 21, army: ARMY });
    const r = armyIntel(d.catalog, d.state, ME, ENEMY)!;
    expect(r.stage).toBe('sighting');
    expect(r.ownerId).toBe(FOE);
    expect(r.creatures).toBeNull();
    const gold = armyGoldValue(d.catalog, d.state.heroes[ENEMY]!.army.slots);
    expect(gold).toBe(35 * d.catalog.creatures['hoplite']!.cost!.gold + 8 * d.catalog.creatures['peltast']!.cost!.gold + 5 * d.catalog.creatures['veteran_hoplite']!.cost!.gold);
    expect(r.strengthBand).toBe(intelStrengthBand(d.catalog.scoutingIntelPolicy!, gold));
    expect(JSON.stringify(r)).not.toMatch(/"count"/);
  });

  it('identified: duplicate stacks grouped by creature, base and upgraded forms apart, no quantities', () => {
    const d = setup({ foe: 19, army: ARMY });
    const r = armyIntel(d.catalog, d.state, ME, ENEMY)!;
    expect(r.stage).toBe('identified');
    expect(r.creatures).toEqual([{ creatureId: 'hoplite' }, { creatureId: 'veteran_hoplite' }, { creatureId: 'peltast' }]);
    expect(JSON.stringify(r)).not.toMatch(/"count"|"range"/);
  });

  it('scouted: approximate ranges of the grouped totals (never per slot, never exact)', () => {
    const d = setup({ foe: 18, army: ARMY, scouting: 1 });
    const r = armyIntel(d.catalog, d.state, ME, ENEMY)!;
    expect(r.creatures).toEqual([
      { creatureId: 'hoplite', range: { min: 20, max: 39 } },
      { creatureId: 'veteran_hoplite', range: { min: 5, max: 9 } },
      { creatureId: 'peltast', range: { min: 5, max: 9 } },
    ]);
    expect(JSON.stringify(r)).not.toMatch(/"count"/);
    // The hidden slot layout never shows: the same creatures in other slots give the same report.
    const shuffled = setup({ foe: 18, scouting: 1, army: [['veteran_hoplite', 5], ['hoplite', 35], ['peltast', 8]] });
    expect(armyIntel(shuffled.catalog, shuffled.state, ME, ENEMY)).toEqual(r);
  });

  it('every quantity bin boundary and every strength band boundary', () => {
    const policy = setup().catalog.scoutingIntelPolicy!;
    const bins: [number, number, number | null][] = [
      [1, 1, 4], [4, 1, 4], [5, 5, 9], [9, 5, 9], [10, 10, 19], [19, 10, 19], [20, 20, 39], [39, 20, 39],
      [40, 40, 79], [79, 40, 79], [80, 80, 159], [159, 80, 159], [160, 160, 319], [319, 160, 319], [320, 320, null], [5000, 320, null],
    ];
    for (const [n, min, max] of bins) expect(intelCountRange(policy, n), `${n}`).toEqual({ min, max });
    const bands: [number, number][] = [[0, 0], [499, 0], [500, 1], [1499, 1], [1500, 2], [4499, 2], [4500, 3], [9999, 3], [10000, 4], [1e7, 4]];
    for (const [gold, band] of bands) expect(intelStrengthBand(policy, gold), `${gold}`).toBe(band);
    expect(policy.strengthBands.map((b) => b.label)).toEqual(['Small patrol', 'Modest force', 'Substantial force', 'Large army', 'Vast army']);
    expect(policy.strengthBands.some((b) => /safe/i.test(b.label))).toBe(false);
  });

  it('wandering monsters follow the same stages; their map figure is their banner', () => {
    const d = setup({ foe: 30 });
    const monster = deepClone(d.state.heroes[ENEMY]!);
    monster.id = 'band';
    monster.ownerId = FOE;
    monster.monster = { bounty: { gold: 500, wood: 0, stone: 0, crystal: 0, favor: 0 }, creatureId: 'peltast' };
    monster.position = at(21);
    monster.army = { slots: slots([['peltast', 30], ['hoplite', 12]]) };
    d.state.heroes['band'] = monster;
    const r = armyIntel(d.catalog, d.state, ME, 'band')!;
    expect(r).toMatchObject({ kind: 'monster', stage: 'sighting', creatures: null });
    expect(['peltast', 'hoplite']).toContain(r.figureCreatureId);
  });
});

describe('scouting intel — snapshots', () => {
  it('a command records the sighting: permitted fields only, then identified on approach', () => {
    const d = setup({ me: 15, foe: 22 });
    expect(stageOf(d)).toBeNull();
    walk(d, 17);
    const s1 = lastKnownIntel(d.state, ME, ENEMY)!;
    expect(s1).toEqual({ targetId: ENEMY, lastSeenCoord: at(22), observedDay: 1, stage: 'sighting', knownOwner: FOE, strengthBand: s1.strengthBand });
    walk(d, 19);
    const s2 = lastKnownIntel(d.state, ME, ENEMY)!;
    expect(s2.stage).toBe('identified');
    expect(s2.permittedCreatureTypes).toEqual(['hoplite', 'peltast']);
    expect(s2.permittedCountRanges).toBeUndefined();
    // The rival sees my hero at the same distance: its own report, by the same rules.
    expect(lastKnownIntel(d.state, FOE, HERO)?.stage).toBe('identified');
    // No player ever holds a report on its own army.
    expect(lastKnownIntel(d.state, ME, HERO)).toBeNull();
  });

  it('outside vision the report is LAST KNOWN: position, army, owner and day never update remotely', () => {
    const d = setup({ me: 15, foe: 22, matchId: 'intel-age' });
    // A third empire (the owner the hero passes to while hidden).
    d.state.players['third'] = { ...deepClone(d.state.players[FOE]!), id: 'third', name: 'Third' };
    walk(d, 19);
    const seen = deepClone(lastKnownIntel(d.state, ME, ENEMY)!);
    walk(d, 12);
    expect(armyIntel(d.catalog, d.state, ME, ENEMY)).toBeNull();
    // While hidden it moves, grows, changes owner and two days pass.
    const foe = d.state.heroes[ENEMY]!;
    foe.position = at(28);
    foe.army.slots[0]!.count = 300;
    foe.ownerId = 'third';
    d.do({ kind: 'EndTurn' });
    d.do({ kind: 'EndTurn' }, FOE);
    d.do({ kind: 'EndTurn' });
    d.do({ kind: 'EndTurn' }, FOE);
    expect(d.state.day).toBe(3);
    expect(lastKnownIntel(d.state, ME, ENEMY)).toEqual(seen);
    expect(staleIntelReports(d.catalog, d.state, ME).map((s) => s.targetId)).toEqual([ENEMY]);
    // Seen again: today's observation, the new owner and position.
    walk(d, 24);
    const now = lastKnownIntel(d.state, ME, ENEMY)!;
    expect(now).toMatchObject({ lastSeenCoord: at(28), observedDay: 3, knownOwner: 'third', stage: 'sighting' });
    expect(staleIntelReports(d.catalog, d.state, ME)).toEqual([]);
  });

  it('re-entry at a lower stage: the current report is a sighting; the earlier scout report is kept apart, dated', () => {
    const d = setup({ me: 15, foe: 22, scouting: 1, matchId: 'intel-reentry' });
    walk(d, 20);
    expect(lastKnownIntel(d.state, ME, ENEMY)).toMatchObject({ stage: 'scouted', permittedCountRanges: [{ min: 20, max: 39 }, { min: 5, max: 9 }] });
    walk(d, 12);
    d.do({ kind: 'EndTurn' });
    d.do({ kind: 'EndTurn' }, FOE);
    d.state.heroes[HERO]!.skills = [];
    walk(d, 17);
    const snap = lastKnownIntel(d.state, ME, ENEMY)!;
    expect(snap.stage).toBe('sighting');
    expect(snap.observedDay).toBe(2);
    expect(snap.permittedCreatureTypes).toBeUndefined();
    expect(snap.permittedCountRanges).toBeUndefined();
    expect(snap.earlier).toEqual({ lastSeenCoord: at(22), observedDay: 1, stage: 'scouted', knownOwner: FOE, strengthBand: snap.strengthBand, permittedCreatureTypes: ['hoplite', 'peltast'], permittedCountRanges: [{ min: 20, max: 39 }, { min: 5, max: 9 }] });
    // The current projection holds no types: the old report never stands in for it.
    expect(armyIntel(d.catalog, d.state, ME, ENEMY)!.creatures).toBeNull();
    // A new scout report replaces both.
    d.state.heroes[HERO]!.skills = [{ skillId: 'scouting', rank: 1 }];
    walk(d, 20);
    expect(lastKnownIntel(d.state, ME, ENEMY)!.earlier).toBeUndefined();
  });

  it('removed when its tile is inspected with nothing there, or when a battle I fought settles its fate', () => {
    const d = setup({ me: 15, foe: 22, matchId: 'intel-gone' });
    walk(d, 19);
    walk(d, 12);
    // It walked off while hidden; looking at the old tile again finds nothing.
    d.state.heroes[ENEMY]!.position = at(30);
    walk(d, 18);
    expect(lastKnownIntel(d.state, ME, ENEMY)).toBeNull();

    // A fate learned from a battle: both sides know, an empire that was not there does not.
    const e = setup({ me: 15, foe: 22, matchId: 'intel-fate' });
    e.state.players['third'] = { ...deepClone(e.state.players[FOE]!), id: 'third', name: 'Third' };
    e.state.playerOrder = [...e.state.playerOrder, 'third'];
    e.state.fog['third'] = deepClone(e.state.fog[ME]!);
    walk(e, 19);
    const s: MatchState = deepClone(e.state);
    s.intel!['third'] = { [ENEMY]: deepClone(s.intel![ME]![ENEMY]!) };
    s.heroes[HERO]!.position = at(5);
    s.heroes[ENEMY]!.status = 'defeated';
    s.lastBattleResult = { battleId: 'b1', label: 'x', winner: 'attacker', outcome: 'victory', playerSide: 'attacker', attacker: { name: 'a', playerId: ME, lines: [] }, defender: { name: 'b', playerId: FOE, lines: [] }, xpAwarded: [], rewards: { resources: { gold: 0, wood: 0, stone: 0, crystal: 0, favor: 0 }, artifactIds: [], entitlementIds: [] }, objectivesAdvanced: [], levelUpsQueued: 0, heroOutcome: '', day: 1, rounds: 1 };
    const events: GameEventPayload[] = [{ kind: 'HeroDefeated', heroId: ENEMY }, { kind: 'BattleEnded', battleId: 'b1', winner: 'attacker', outcome: 'victory' }];
    refreshIntelSnapshots(e.catalog, s, events);
    expect(lastKnownIntel(s, ME, ENEMY)).toBeNull();
    expect(lastKnownIntel(s, 'third', ENEMY)).not.toBeNull();
    // Without such an event a defeated army's report stays until its tile is seen.
    const t: MatchState = deepClone(e.state);
    t.heroes[HERO]!.position = at(5);
    t.heroes[ENEMY]!.status = 'defeated';
    refreshIntelSnapshots(e.catalog, t, []);
    expect(lastKnownIntel(t, ME, ENEMY)).not.toBeNull();
  });

  it('a match records what was in sight at the start with its first command', () => {
    const d = setup({ me: 16, foe: 19, matchId: 'intel-start' });
    expect(d.state.intel).toBeUndefined();
    walk(d, 12);
    expect(lastKnownIntel(d.state, ME, ENEMY)).toMatchObject({ stage: 'identified', lastSeenCoord: at(19), observedDay: 1 });
  });
});

describe('scouting intel — off, saves and determinism', () => {
  it('feature off (old saves, The Three Beacons): every visible army in full, no snapshots ever', () => {
    const d = setup({ me: 15, foe: 20, intel: false });
    const r = armyIntel(d.catalog, d.state, ME, ENEMY)!;
    expect(r.stage).toBe('full');
    expect(r.creatures).toEqual([
      { creatureId: 'hoplite', count: 20 },
      { creatureId: 'peltast', count: 8 },
    ]);
    walk(d, 19);
    walk(d, 12);
    d.do({ kind: 'EndTurn' });
    expect(d.state.intel).toBeUndefined();
    expect(armyIntel(d.catalog, d.state, ME, ENEMY)).toBeNull();
    // An absent flag is off too.
    const old = setup({ me: 15, foe: 20 });
    const { scoutingIntelV1: _drop, ...rest } = old.state.scenario.features!;
    void _drop;
    old.state.scenario = { ...old.state.scenario, features: rest };
    expect(armyIntel(old.catalog, old.state, ME, ENEMY)!.stage).toBe('full');
    walk(old, 19);
    expect(old.state.intel).toBeUndefined();
  });

  it('snapshots survive JSON save/load exactly and play on identically', () => {
    const d = setup({ me: 15, foe: 22, scouting: 2, matchId: 'intel-save' });
    walk(d, 19);
    walk(d, 12);
    const loaded = new GameDriver(JSON.parse(JSON.stringify(d.state)) as MatchState, d.catalog);
    expect(loaded.state.intel).toEqual(d.state.intel);
    expect(canonicalStateHash(loaded.state)).toBe(canonicalStateHash(d.state));
    // The loaded copy numbers its next commands after the two already played.
    loaded.command({ kind: 'EndTurn' });
    loaded.command({ kind: 'EndTurn' });
    for (const g of [d, loaded]) {
      g.do({ kind: 'EndTurn' });
      g.do({ kind: 'EndTurn' }, FOE);
      walk(g, 17);
    }
    expect(canonicalStateHash(loaded.state)).toBe(canonicalStateHash(d.state));
  });

  it('deterministic: the same commands give the same snapshots; projecting never changes the state', () => {
    const run = () => {
      const d = setup({ me: 15, foe: 22, scouting: 3, matchId: 'intel-det' });
      walk(d, 19);
      walk(d, 11);
      walk(d, 18);
      return d;
    };
    const a = run();
    const b = run();
    expect(canonicalStateHash(a.state)).toBe(canonicalStateHash(b.state));
    expect(a.state.intel).toEqual(b.state.intel);
    const before = canonicalStateHash(a.state);
    const vision = intelVision(a.catalog, a.state, ME);
    for (let i = 0; i < 3; i++) expect(armyIntel(a.catalog, a.state, ME, ENEMY, vision)).toEqual(armyIntel(a.catalog, a.state, ME, ENEMY));
    expect(canonicalStateHash(a.state)).toBe(before);
    expect(INTEL_STAGE_RANK.scouted).toBeGreaterThan(INTEL_STAGE_RANK.identified);
  });

  it('a rejected command leaves the snapshots untouched', () => {
    const d = setup({ me: 15, foe: 22 });
    walk(d, 19);
    const before = d.state;
    const res = processCommand({ catalog: d.catalog }, d.state, { ...d.command({ kind: 'MoveHero', heroId: HERO, destination: { q: 0, r: 0 } }) });
    expect(res.ok).toBe(false);
    expect(d.state).toBe(before);
  });
});
