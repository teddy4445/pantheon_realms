/**
 * The AI's belief under scouting intel (expedition kit §05/§12, `scoutingIntelV1`):
 * an enemy army in view is known to the planner only as far as a human player would
 * know it — the belief holds an estimate built from the permitted stage (band prior,
 * identified types, quantity-range middles), never the exact counts; the planner's
 * strength judgement and its plan do not change when hidden enemy data change without
 * changing the observation; the estimate is deterministic. With the feature off the
 * belief keeps the exact armies of visible enemies, as before.
 */
import { describe, expect, it } from 'vitest';
import { GameDriver } from '@pr/testing';
import {
  armyIntel,
  deepClone,
  intelStrengthBand,
  armyGoldValue,
  type CreatureStackState,
  type HexCoord,
  type MatchState,
  type ScenarioFeatures,
} from '@pr/rules';
import { buildObservation, estimatedArmy, rangeEstimate, strategicCandidates } from '../src';
import { heroStrength } from '../src/threat';

const ROW = 7;
const at = (q: number): HexCoord => ({ q, r: ROW });
const VIEWER = 'rival';
const ME = 'rival_odysseus';
const TARGET = 'alexios';

type Army = [string, number][];
const slots = (army: Army): (CreatureStackState | null)[] => {
  const out: (CreatureStackState | null)[] = [null, null, null, null, null, null, null];
  army.forEach(([creatureId, count], i) => (out[i] = { stackId: `s${i}`, creatureId, count }));
  return out;
};

/** The rival (the AI seat) at column 16 of row 7 looks at the player's hero `dist` hexes west. */
function setup(dist: number, army: Army, o: { scouting?: number; intel?: boolean } = {}): GameDriver {
  const d = GameDriver.mission('skirmish_twin_harbors', { matchId: 'ai-intel' });
  const f: Partial<ScenarioFeatures> = { weeklyEvents: false, scoutingIntelV1: o.intel !== false };
  d.state.scenario = { ...d.state.scenario, features: { ...d.state.scenario.features!, ...f } };
  for (const fog of Object.values(d.state.fog)) fog.explored = fog.explored.map(() => 1);
  d.state.activePlayerId = VIEWER;
  const me = d.state.heroes[ME]!;
  me.position = at(16);
  me.skills = o.scouting ? [{ skillId: 'scouting', rank: o.scouting }] : [];
  const target = d.state.heroes[TARGET]!;
  target.position = at(16 - dist);
  target.army = { slots: slots(army) };
  return d;
}

const beliefArmy = (d: GameDriver) => buildObservation(d.catalog, d.state, VIEWER).belief.heroes[TARGET]!.army.slots;
const counts = (army: readonly (CreatureStackState | null)[]) => army.filter((x): x is CreatureStackState => !!x).map((x) => [x.creatureId, x.count]);

describe('AI belief with scouting intel', () => {
  it('sighting: the belief holds the band prior only — hidden counts and types do not change it', () => {
    // Two different armies of the same band (Substantial force: 1,500–4,499 Gold).
    const a = setup(5, [['hoplite', 20], ['peltast', 8]]);
    const b = setup(5, [['peltast', 30]]);
    const policy = a.catalog.scoutingIntelPolicy!;
    for (const d of [a, b]) expect(intelStrengthBand(policy, armyGoldValue(d.catalog, d.state.heroes[TARGET]!.army.slots))).toBe(2);
    expect(armyIntel(a.catalog, a.state, VIEWER, TARGET)!.stage).toBe('sighting');
    const ba = beliefArmy(a);
    expect(counts(ba)).toEqual(counts(beliefArmy(b)));
    // Neither true army appears: the estimate is the owner's pantheon roster scaled to the band's prior.
    expect(counts(ba)).not.toEqual([['hoplite', 20], ['peltast', 8]]);
    const gold = armyGoldValue(a.catalog, ba);
    expect(Math.abs(gold - policy.bandEstimateGold[2]!)).toBeLessThan(policy.bandEstimateGold[2]! * 0.35);
    // The strength the planner judges is the same for both (no omniscient counts).
    const sa = buildObservation(a.catalog, a.state, VIEWER);
    const sb = buildObservation(b.catalog, b.state, VIEWER);
    expect(heroStrength(a.catalog, sa.belief, sa.belief.heroes[TARGET]!)).toBe(heroStrength(b.catalog, sb.belief, sb.belief.heroes[TARGET]!));
  });

  it('identified: the identified types at the band prior, never their counts', () => {
    const a = setup(3, [['hoplite', 20], ['peltast', 8], ['hoplite', 4]]);
    const b = setup(3, [['peltast', 12], ['hoplite', 30]]);
    const ba = counts(beliefArmy(a));
    expect(ba.map((x) => x[0])).toEqual(['hoplite', 'peltast']);
    expect(ba).toEqual(counts(beliefArmy(b)));
    expect(ba).not.toContainEqual(['hoplite', 24]);
    // Each type gets an equal Gold share of the band's prior.
    const prior = a.catalog.scoutingIntelPolicy!.bandEstimateGold[2]!;
    expect(ba).toEqual([
      ['hoplite', Math.round(prior / 2 / a.catalog.creatures['hoplite']!.cost!.gold)],
      ['peltast', Math.round(prior / 2 / a.catalog.creatures['peltast']!.cost!.gold)],
    ]);
  });

  it('scouted: conservative counts remain identical for every army in the same public ranges', () => {
    const a = setup(2, [['hoplite', 21], ['peltast', 5]], { scouting: 1 });
    const b = setup(2, [['hoplite', 38], ['peltast', 9]], { scouting: 1 });
    expect(armyIntel(a.catalog, a.state, VIEWER, TARGET)!.stage).toBe('scouted');
    const policy = a.catalog.scoutingIntelPolicy!;
    const expected = [['hoplite', rangeEstimate(policy, { min: 20, max: 39 })], ['peltast', rangeEstimate(policy, { min: 5, max: 9 })]];
    expect(counts(beliefArmy(a))).toEqual(expected);
    expect(counts(beliefArmy(b))).toEqual(expected);
    expect(rangeEstimate(policy, { min: 320, max: null })).toBe(560);
    expect(rangeEstimate(policy, { min: 20, max: 39 })).toBe(36);
  });

  it('the plan does not change when hidden enemy data change without changing the observation', () => {
    const a = setup(3, [['hoplite', 20], ['peltast', 8]]);
    const b = setup(3, [['hoplite', 33], ['peltast', 2]]);
    const planA = strategicCandidates(a.catalog, buildObservation(a.catalog, a.state, VIEWER));
    const planB = strategicCandidates(b.catalog, buildObservation(b.catalog, b.state, VIEWER));
    expect(planB).toEqual(planA);
  });

  it('deterministic: the same state gives the same belief and the same strength estimate', () => {
    const d = setup(4, [['hoplite', 20], ['peltast', 8]]);
    const x = buildObservation(d.catalog, d.state, VIEWER);
    const y = buildObservation(d.catalog, deepClone(d.state), VIEWER);
    expect(x.belief.heroes[TARGET]).toEqual(y.belief.heroes[TARGET]);
    expect(heroStrength(d.catalog, x.belief, x.belief.heroes[TARGET]!)).toBe(heroStrength(d.catalog, y.belief, y.belief.heroes[TARGET]!));
  });

  it('a wandering monster seen from afar is estimated as the creature it is drawn as', () => {
    const d = setup(5, [['hoplite', 20]]);
    const t = d.state.heroes[TARGET]!;
    t.ownerId = 'player';
    t.monster = { bounty: { gold: 0, wood: 0, stone: 0, crystal: 0, favor: 0 }, creatureId: 'peltast' };
    t.army = { slots: slots([['peltast', 40], ['hoplite', 2]]) };
    const intel = armyIntel(d.catalog, d.state, VIEWER, TARGET)!;
    expect(intel.stage).toBe('sighting');
    const est = estimatedArmy(d.catalog, d.state, intel);
    expect(est.map((s) => s.creatureId)).toEqual([intel.figureCreatureId]);
  });

  it('other empires’ reports, army statistics and battle lines are not in the belief', () => {
    const d = setup(3, [['hoplite', 20]]);
    d.state.intel = { player: { [ME]: { targetId: ME, lastSeenCoord: at(16), observedDay: 1, stage: 'sighting', knownOwner: VIEWER, strengthBand: 1 } } };
    d.state.lastBattleResult = { battleId: 'b', label: 'x', winner: 'attacker', outcome: 'victory', playerSide: 'attacker', attacker: { name: 'a', playerId: 'player', lines: [{ creatureId: 'hoplite', before: 20, after: 18 }] }, defender: { name: 'g', playerId: null, lines: [] }, xpAwarded: [], rewards: { resources: { gold: 0, wood: 0, stone: 0, crystal: 0, favor: 0 }, artifactIds: [], entitlementIds: [] }, objectivesAdvanced: [], levelUpsQueued: 0, heroOutcome: '', day: 1, rounds: 1 };
    const belief = buildObservation(d.catalog, d.state, VIEWER).belief;
    expect(belief.intel).toEqual({});
    expect(belief.lastBattleResult).toBeNull();
    for (const rec of belief.stats?.timeline ?? []) expect(Object.keys(rec.players)).toEqual([VIEWER]);
  });

  it('feature off: the belief keeps the exact army of a visible enemy (legacy)', () => {
    const d = setup(5, [['hoplite', 20], ['peltast', 8]], { intel: false });
    expect(counts(buildObservation(d.catalog, d.state, VIEWER).belief.heroes[TARGET]!.army.slots)).toEqual([['hoplite', 20], ['peltast', 8]]);
    // Hidden enemies are still not in the belief at all.
    const far = setup(9, [['hoplite', 20]], { intel: false });
    expect(buildObservation(far.catalog, far.state, VIEWER).belief.heroes[TARGET]).toBeUndefined();
  });
});
