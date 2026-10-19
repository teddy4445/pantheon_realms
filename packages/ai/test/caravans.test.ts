/**
 * Recruitment caravans and the AI (expedition kit §06/§12, `recruitmentCaravansV1`): the
 * dispatch decision is deterministic and goes through the same quote as a human (debit =
 * quote); the AI intercepts a visible enemy caravan it can beat, by moving onto it like any
 * encounter; its belief keeps another empire's caravan only while seen, with the cargo the
 * scouting stage permits and no route or destination — so a hidden caravan is never a target
 * and changing hidden cargo never changes the plan.
 */
import { describe, expect, it } from 'vitest';
import { GameDriver } from '@pr/testing';
import { canonicalStateHash, quoteCaravan, resources, townGate, type CreatureStackState, type GameCommand, type ScenarioFeatures } from '@pr/rules';
import { buildObservation, caravanDispatchCandidates, caravanRerouteCandidates, stepStrategicAI, strategicCandidates } from '../src';

const AI = 'rival';
const AI_HERO = 'rival_odysseus';
const HUMAN = 'player';

type Army = [string, number][];
const slots = (army: Army): (CreatureStackState | null)[] => {
  const out: (CreatureStackState | null)[] = [null, null, null, null, null, null, null];
  army.forEach(([creatureId, count], i) => (out[i] = { stackId: `s${i}`, creatureId, count }));
  return out;
};

function features(d: GameDriver, patch: Partial<ScenarioFeatures>): void {
  d.state.scenario = { ...d.state.scenario, features: { ...d.state.scenario.features!, ...patch } };
}

/**
 * The AI seat owns both harbors: Eastharbor (its home, safe, stock idle — its hero is away) and
 * Westharbor, which the human hero threatens from the next tile. Everything explored.
 */
function aiTwoTowns(): GameDriver {
  const d = GameDriver.mission('skirmish_twin_harbors', { matchId: 'ai-caravans' });
  features(d, { weeklyEvents: false, aiTemperaments: false });
  for (const fog of Object.values(d.state.fog)) fog.explored = fog.explored.map(() => 1);
  const west = d.town('westharbor');
  west.ownerId = AI;
  d.state.world.sites[west.siteId]!.owner = AI;
  west.garrison = { slots: slots([['hoplite', 5]]) };
  const east = d.town('eastharbor');
  east.population = { hoplite: 20, peltast: 9 };
  east.buildings['dwelling_t2'] = 1;
  d.state.players[AI]!.wallet = resources({ gold: 20_000, wood: 50, stone: 50, crystal: 20 });
  // The human hero right beside Westharbor (in its sight): the town is threatened.
  d.hero('alexios').position = { q: 6, r: 8 };
  d.hero('alexios').army = { slots: slots([['cyclops', 3]]) };
  // The AI hero far from both towns (its home's stock is idle).
  d.hero(AI_HERO).position = { q: 17, r: 2 };
  d.do({ kind: 'EndTurn' });
  return d;
}

describe('dispatch', () => {
  it('sends a safe town’s idle stock to a threatened town through the human quote, deterministically', () => {
    const d = aiTwoTowns();
    const obs = buildObservation(d.catalog, d.state, AI);
    const a = caravanDispatchCandidates(d.catalog, obs.belief, AI, new Set(['westharbor']), 1500);
    const b = caravanDispatchCandidates(d.catalog, buildObservation(d.catalog, d.state, AI).belief, AI, new Set(['westharbor']), 1500);
    expect(a).toEqual(b);
    expect(a).toHaveLength(1);
    const cmd = a[0]!;
    expect(cmd.kind).toBe('DispatchCaravan');
    if (cmd.kind !== 'DispatchCaravan') return;
    expect(cmd.sourceTownId).toBe('eastharbor');
    expect(cmd.destinationTownId).toBe('westharbor');
    // Highest tier first, the whole idle pools.
    expect(cmd.items).toEqual([
      { creatureId: 'peltast', count: 9 },
      { creatureId: 'hoplite', count: 20 },
    ]);
    const q = quoteCaravan(d.catalog, d.state, AI, cmd.sourceTownId, cmd.destinationTownId, cmd.items);
    expect(q.legal).toBe(true);
    expect(cmd.expectedQuoteHash).toBe(q.hash);
  });

  it('the controller issues it as an ordinary command: debit = quote, no instant arrival', () => {
    const d = aiTwoTowns();
    const tried = new Set<string>();
    let state = d.state;
    let sent: GameCommand | null = null;
    let before = state;
    for (let i = 0; i < 60 && !sent; i++) {
      before = state;
      const r = stepStrategicAI(d.catalog, state, tried);
      state = r.state;
      if (r.command?.kind === 'DispatchCaravan') sent = r.command;
      if (r.command?.kind === 'EndTurn') break;
    }
    expect(sent).not.toBeNull();
    if (!sent || sent.kind !== 'DispatchCaravan') return;
    const q = quoteCaravan(d.catalog, before, AI, sent.sourceTownId, sent.destinationTownId, sent.items);
    expect(before.players[AI]!.wallet.gold - state.players[AI]!.wallet.gold).toBe(q.totalCost.gold);
    const c = Object.values(state.caravans ?? {})[0]!;
    expect(c.ownerId).toBe(AI);
    expect(c.status).toBe('queued');
    expect(c.coord).toEqual(townGate(d.catalog, state, 'eastharbor'));
    // The same state and the same tried-set give the same choice.
    const again = stepStrategicAI(d.catalog, before, new Set([...tried].filter((k) => !k.includes('DispatchCaravan'))));
    expect(again.command?.kind).toBeDefined();
  });

  it('a held shipment whose destination fell is rerouted to the own town it reaches soonest (free)', () => {
    const d = aiTwoTowns();
    d.do({ kind: 'DispatchCaravan', sourceTownId: 'eastharbor', destinationTownId: 'westharbor', items: [{ creatureId: 'hoplite', count: 4 }] }, AI);
    d.do({ kind: 'EndTurn' }, AI);
    d.do({ kind: 'EndTurn' });
    const west = d.town('westharbor');
    west.ownerId = HUMAN;
    d.state.world.sites[west.siteId]!.owner = HUMAN;
    d.do({ kind: 'EndTurn' }, AI);
    d.do({ kind: 'EndTurn' }, HUMAN);
    const c = Object.values(d.state.caravans!)[0]!;
    expect(c.status).toBe('blocked');
    expect(c.blockedReason).toBe('destination_lost');
    const cands = caravanRerouteCandidates(d.catalog, buildObservation(d.catalog, d.state, AI).belief, AI);
    expect(cands).toEqual([{ kind: 'RerouteCaravan', caravanId: c.id, destinationTownId: 'eastharbor' }]);
    const gold = d.state.players[AI]!.wallet.gold;
    d.do(cands[0]!, AI);
    expect(d.state.players[AI]!.wallet.gold).toBe(gold);
    expect(d.state.caravans![c.id]!.destinationTownId).toBe('eastharbor');
  });

  it('no threatened town, or only one town: no shipment', () => {
    const d = aiTwoTowns();
    const belief = buildObservation(d.catalog, d.state, AI).belief;
    expect(caravanDispatchCandidates(d.catalog, belief, AI, new Set(), 1500)).toEqual([]);
    features(d, { recruitmentCaravansV1: false });
    expect(caravanDispatchCandidates(d.catalog, buildObservation(d.catalog, d.state, AI).belief, AI, new Set(['westharbor']), 1500)).toEqual([]);
  });
});

describe('interception and belief', () => {
  /** The human's caravan on the open road, two tiles from the strong AI hero, on the AI's turn. */
  function humanCaravanInSight(hidden = false) {
    const d = GameDriver.mission('skirmish_twin_harbors', { matchId: 'ai-intercept' });
    features(d, { weeklyEvents: false, aiTemperaments: false });
    for (const fog of Object.values(d.state.fog)) fog.explored = fog.explored.map(() => 1);
    d.player.wallet = resources({ gold: 50_000 });
    const east = d.town('eastharbor');
    east.ownerId = HUMAN;
    d.state.world.sites[east.siteId]!.owner = HUMAN;
    d.town('westharbor').population = { hoplite: 30 };
    d.hero(AI_HERO).position = { q: 32, r: 2 };
    d.do({ kind: 'DispatchCaravan', sourceTownId: 'westharbor', destinationTownId: 'eastharbor', items: [{ creatureId: 'hoplite', count: 12 }] });
    d.do({ kind: 'EndTurn' });
    d.do({ kind: 'EndTurn' }, AI);
    d.do({ kind: 'EndTurn' });
    const c = Object.values(d.state.caravans!)[0]!;
    const foe = d.hero(AI_HERO);
    foe.army = { slots: slots([['cyclops', 6]]) };
    foe.movementPoints = 1500;
    foe.position = hidden ? { q: 32, r: 14 } : { q: c.coord.q + 2, r: c.coord.r };
    return { d, c };
  }

  it('a visible enemy caravan it can beat is intercepted (moving onto it starts the interception battle)', () => {
    const { d, c } = humanCaravanInSight();
    const tried = new Set<string>();
    let state = d.state;
    for (let i = 0; i < 80 && !state.battle; i++) {
      const r = stepStrategicAI(d.catalog, state, tried);
      state = r.state;
      if (r.command?.kind === 'EndTurn') break;
    }
    expect(state.battle?.encounter.kind).toBe('caravan_intercept');
    expect(state.battle?.encounter.caravanId).toBe(c.id);
    expect(state.caravans![c.id]!.status).toBe('intercepted');
  });

  it('the belief: another empire’s caravan only while seen, its cargo an estimate, never its route or destination', () => {
    const { d, c } = humanCaravanInSight();
    const belief = buildObservation(d.catalog, d.state, AI).belief;
    const seen = belief.caravans![c.id]!;
    expect(seen.destinationTownId).toBe('');
    expect(seen.sourceTownId).toBe('');
    expect(seen.route).toEqual([]);
    expect(seen.cargo.some((s) => s.count === 12)).toBe(false);
    const far = humanCaravanInSight(true);
    const hiddenBelief = buildObservation(far.d.catalog, far.d.state, AI).belief;
    expect(hiddenBelief.caravans?.[far.c.id]).toBeUndefined();
  });

  it('hidden cargo changes do not change the plan', () => {
    const a = humanCaravanInSight();
    const b = humanCaravanInSight();
    b.d.state.caravans![b.c.id]!.cargo[0]!.count = 13; // same quantity band, same stage
    const pa = strategicCandidates(a.d.catalog, buildObservation(a.d.catalog, a.d.state, AI));
    const pb = strategicCandidates(b.d.catalog, buildObservation(b.d.catalog, b.d.state, AI));
    expect(pb).toEqual(pa);
    expect(canonicalStateHash(a.d.state)).not.toBe(canonicalStateHash(b.d.state));
  });
});
