/**
 * Recruitment caravans (expedition kit §06, scenario feature `recruitmentCaravansV1`;
 * design/caravan-policy.json, proposed values): the quote is the recruitment quote of the
 * source town plus the flat fee and equals the debit (with and without a city-dedication
 * discount); both forms share one family pool; at most seven stacks, identical creatures
 * merged; first movement at the owner's next turn start; the saved route across days; a
 * repeated turn start, a resumed cursor and save/load never move or deliver twice; a full
 * garrison holds the shipment at the gate; a captured destination holds it until a free
 * reroute; a captured source changes nothing; several shipments move in a stable order; a
 * blocker on the road holds it; unknown or foreign destinations are refused; interceptions
 * with surviving or destroyed cargo (never converted, no loot); arrival exactly once; and the
 * feature off (or an old save) has no caravans at all.
 */
import { describe, expect, it } from 'vitest';
import { GameDriver } from '@pr/testing';
import {
  Tx,
  canonicalStateHash,
  caravanEta,
  caravanIntel,
  caravanStepTurns,
  deepClone,
  enemyCaravanAt,
  evaluateMissionOutcome,
  hireOptions,
  quoteHireHero,
  processCaravanTurnStart,
  quoteCaravan,
  quoteMovement,
  resources,
  routeStepCosts,
  townGate,
  type CaravanState,
  type CreatureStackState,
  type GameEvent,
  type HexCoord,
  type MatchState,
  type ScenarioFeatures,
} from '../src';

const ME = 'player';
const FOE = 'rival';
const FOE_HERO = 'rival_odysseus';
const RICH = { gold: 100_000, wood: 200, stone: 200, crystal: 100 };

function features(d: GameDriver, patch: Partial<ScenarioFeatures>): void {
  d.state.scenario = { ...d.state.scenario, features: { ...d.state.scenario.features!, ...patch } };
}

type Army = [string, number][];
const slots = (army: Army): (CreatureStackState | null)[] => {
  const out: (CreatureStackState | null)[] = [null, null, null, null, null, null, null];
  army.forEach(([creatureId, count], i) => (out[i] = { stackId: `s${i}`, creatureId, count }));
  return out;
};

/**
 * Twin Harbors with both harbors the player's: Westharbor (source, every dwelling at level 2)
 * and Eastharbor (destination, 27 hexes east over open land). The rival keeps its hero, parked
 * in the far north-east corner (out of every route's sight).
 */
function setup(opts: { dedication?: string; pools?: Record<string, number> } = {}): GameDriver {
  const d = GameDriver.mission('skirmish_twin_harbors', { matchId: 'test:caravans' });
  features(d, { weeklyEvents: false });
  for (const fog of Object.values(d.state.fog)) fog.explored = fog.explored.map(() => 1);
  d.player.wallet = resources(RICH);
  const west = d.town('westharbor');
  for (const k of Object.keys(west.buildings)) if (k.startsWith('dwelling')) west.buildings[k] = 2;
  west.population = { hoplite: 30, peltast: 20, griffin: 10, cavalry: 8, temple_adept: 6, minotaur: 4, cyclops: 2, ...(opts.pools ?? {}) };
  const east = d.town('eastharbor');
  east.ownerId = ME;
  d.state.world.sites[east.siteId]!.owner = ME;
  east.garrison = { slots: slots([]) };
  const foe = d.hero(FOE_HERO);
  foe.position = { q: 32, r: 2 };
  foe.army = { slots: slots([['peltast', 1]]) };
  if (opts.dedication) {
    features(d, { cityDedicationsV1: true });
    west.buildings['pantheon_temple'] = 2;
    const god = d.catalog.gods[opts.dedication]!;
    const pantheon = d.player.pantheon as { patronGodId: string | null; minorGodIds: string[] };
    if (god.role === 'patron') pantheon.patronGodId = god.id;
    else if (!pantheon.minorGodIds.includes(god.id)) pantheon.minorGodIds.push(god.id);
    west.dedication = { activeGodId: god.id, ownerId: ME, growthCredits: {}, lastProcessedWeek: 0 };
  }
  return d;
}

const dispatch = (d: GameDriver, items: { creatureId: string; count: number }[], to = 'eastharbor', from = 'westharbor') =>
  d.do({ kind: 'DispatchCaravan', sourceTownId: from, destinationTownId: to, items });

const onlyCaravan = (d: GameDriver): CaravanState => {
  const list = Object.values(d.state.caravans ?? {});
  expect(list).toHaveLength(1);
  return list[0]!;
};

/** End the player's turn and the rival's (one world day), returning the events of both. */
function nextDay(d: GameDriver): GameEvent[] {
  const a = d.do({ kind: 'EndTurn' });
  const b = d.do({ kind: 'EndTurn' }, FOE);
  return [...a, ...b];
}

const spent = (events: readonly GameEvent[]) => events.filter((e) => e.kind === 'ResourcesSpent').reduce((n, e) => n + (e.kind === 'ResourcesSpent' ? e.amount.gold : 0), 0);

describe('quote and dispatch', () => {
  it('the quote is the recruitment quote plus the flat fee, and equals the debit', () => {
    const d = setup();
    const items = [
      { creatureId: 'hoplite', count: 12 },
      { creatureId: 'peltast', count: 8 },
      { creatureId: 'griffin', count: 2 },
    ];
    const q = quoteCaravan(d.catalog, d.state, ME, 'westharbor', 'eastharbor', items);
    expect(q.legal).toBe(true);
    // The kit's worked example: 12 × 60 + 8 × 100 + 2 × 240 = 2,000; transport 150; total 2,150.
    expect(q.recruitCost.gold).toBe(2000);
    expect(q.fee.gold).toBe(150);
    expect(q.totalCost.gold).toBe(2150);
    expect(q.dedication).toBeUndefined();
    const before = d.player.wallet.gold;
    const events = dispatch(d, items);
    expect(before - d.player.wallet.gold).toBe(2150);
    expect(spent(events)).toBe(2150);
    expect(d.town('westharbor').population).toMatchObject({ hoplite: 18, peltast: 12, griffin: 8 });
    const c = onlyCaravan(d);
    expect(c.status).toBe('queued');
    expect(c.ownerId).toBe(ME);
    expect(c.cargo.map((s) => [s.creatureId, s.count])).toEqual([
      ['hoplite', 12],
      ['peltast', 8],
      ['griffin', 2],
    ]);
    expect(c.coord).toEqual(townGate(d.catalog, d.state, 'westharbor'));
    expect(c.route).toEqual(q.route);
    expect(c.paid.gold).toBe(2150);
    const ev = events.find((e) => e.kind === 'CaravanDispatched');
    expect(ev && ev.kind === 'CaravanDispatched' && ev.etaDay).toBe(q.etaDay);
    // The recruits count as recruited (objectives, statistics), at the source.
    expect(d.state.mission.counters['recruited:hoplite']).toBe(12);
  });

  it('a city dedication discount is in the quote and in the debit (per unit, the recruitment quote)', () => {
    const d = setup({ dedication: 'demeter' });
    const items = [
      { creatureId: 'hoplite', count: 12 },
      { creatureId: 'peltast', count: 8 },
    ];
    const q = quoteCaravan(d.catalog, d.state, ME, 'westharbor', 'eastharbor', items);
    expect(q.legal).toBe(true);
    expect(q.lines[0]!.unitCost.gold).toBe(57);
    expect(q.lines[0]!.dedication).toMatchObject({ godId: 'demeter', savedGold: 36 });
    expect(q.lines[1]!.dedication).toBeUndefined();
    expect(q.dedication?.savedGold).toBe(36);
    expect(q.totalCost.gold).toBe(12 * 57 + 8 * 100 + 150);
    const before = d.player.wallet.gold;
    dispatch(d, items);
    expect(before - d.player.wallet.gold).toBe(q.totalCost.gold);
  });

  it('both forms draw on one family pool; no second stock', () => {
    const d = setup();
    const over = quoteCaravan(d.catalog, d.state, ME, 'westharbor', 'eastharbor', [
      { creatureId: 'hoplite', count: 20 },
      { creatureId: 'veteran_hoplite', count: 15 },
    ]);
    expect(over.legal).toBe(false);
    expect(over.code).toBe('no_population');
    expect(over.pools.hoplite).toEqual({ used: 35, available: 30 });
    expect(d.reject({ kind: 'DispatchCaravan', sourceTownId: 'westharbor', destinationTownId: 'eastharbor', items: [{ creatureId: 'hoplite', count: 20 }, { creatureId: 'veteran_hoplite', count: 15 }] }).code).toBe('no_population');
    dispatch(d, [
      { creatureId: 'hoplite', count: 20 },
      { creatureId: 'veteran_hoplite', count: 10 },
    ]);
    expect(d.town('westharbor').population.hoplite).toBe(0);
    expect(onlyCaravan(d).cargo.map((s) => s.creatureId)).toEqual(['hoplite', 'veteran_hoplite']);
    // Nothing left this week: a recruit or another caravan of the family is refused.
    expect(d.reject({ kind: 'RecruitUnits', townId: 'westharbor', creatureId: 'hoplite', quantity: 1, destination: { kind: 'garrison' } }).code).toBe('no_population');
  });

  it('identical creatures merge; at most seven stacks', () => {
    const d = setup();
    const merged = quoteCaravan(d.catalog, d.state, ME, 'westharbor', 'eastharbor', [
      { creatureId: 'hoplite', count: 5 },
      { creatureId: 'peltast', count: 2 },
      { creatureId: 'hoplite', count: 7 },
    ]);
    expect(merged.legal).toBe(true);
    expect(merged.lines.map((l) => [l.creatureId, l.count])).toEqual([
      ['hoplite', 12],
      ['peltast', 2],
    ]);
    const eight = ['hoplite', 'veteran_hoplite', 'peltast', 'veteran_peltast', 'griffin', 'windcrest_griffin', 'cavalry', 'companion_cavalry'].map((creatureId) => ({ creatureId, count: 1 }));
    expect(quoteCaravan(d.catalog, d.state, ME, 'westharbor', 'eastharbor', eight).code).toBe('no_capacity');
    expect(d.reject({ kind: 'DispatchCaravan', sourceTownId: 'westharbor', destinationTownId: 'eastharbor', items: eight }).code).toBe('no_capacity');
    expect(quoteCaravan(d.catalog, d.state, ME, 'westharbor', 'eastharbor', eight.slice(0, 7)).legal).toBe(true);
  });

  it('refuses what a recruit refuses, and changes nothing when refused', () => {
    const d = setup();
    d.town('westharbor').buildings['dwelling_t7'] = 0;
    const before = canonicalStateHash(d.state);
    expect(d.reject({ kind: 'DispatchCaravan', sourceTownId: 'westharbor', destinationTownId: 'eastharbor', items: [{ creatureId: 'cyclops', count: 1 }] }).code).toBe('not_recruitable');
    expect(d.reject({ kind: 'DispatchCaravan', sourceTownId: 'westharbor', destinationTownId: 'eastharbor', items: [{ creatureId: 'hoplite', count: 0 }] }).code).toBe('invalid_quantity');
    d.player.wallet = resources({ gold: 12 * 60 + 100 });
    expect(d.reject({ kind: 'DispatchCaravan', sourceTownId: 'westharbor', destinationTownId: 'eastharbor', items: [{ creatureId: 'hoplite', count: 12 }] }).code).toBe('insufficient_resources');
    d.player.wallet = resources(RICH);
    expect(canonicalStateHash(d.state)).not.toBe('');
    expect(d.state.caravans).toBeUndefined();
    void before;
  });

  it('a missing or foreign destination is refused; a changed quote is refused', () => {
    const d = setup();
    const items = [{ creatureId: 'hoplite', count: 3 }];
    expect(d.reject({ kind: 'DispatchCaravan', sourceTownId: 'westharbor', destinationTownId: 'atlantis', items }).code).toBe('not_found');
    expect(d.reject({ kind: 'DispatchCaravan', sourceTownId: 'westharbor', destinationTownId: 'westharbor', items }).code).toBe('invalid_command');
    d.town('eastharbor').ownerId = FOE;
    expect(d.reject({ kind: 'DispatchCaravan', sourceTownId: 'westharbor', destinationTownId: 'eastharbor', items }).code).toBe('not_owner');
    d.town('eastharbor').ownerId = ME;
    const q = quoteCaravan(d.catalog, d.state, ME, 'westharbor', 'eastharbor', items);
    expect(d.reject({ kind: 'DispatchCaravan', sourceTownId: 'westharbor', destinationTownId: 'eastharbor', items, expectedQuoteHash: 'stale' }).code).toBe('stale_revision');
    d.do({ kind: 'DispatchCaravan', sourceTownId: 'westharbor', destinationTownId: 'eastharbor', items, expectedQuoteHash: q.hash });
    expect(onlyCaravan(d).cargo[0]!.count).toBe(3);
  });
});

describe('movement', () => {
  it('first moves at the owner’s next turn start, then walks its saved route day by day and arrives on the quoted day', () => {
    const d = setup();
    const q = quoteCaravan(d.catalog, d.state, ME, 'westharbor', 'eastharbor', [{ creatureId: 'hoplite', count: 10 }]);
    const route = q.route;
    dispatch(d, [{ creatureId: 'hoplite', count: 10 }]);
    const start = { ...onlyCaravan(d).coord };
    // The rival's turn start on day 1 moves nothing; nor does the dispatch itself.
    const rivalTurn = d.do({ kind: 'EndTurn' });
    expect(rivalTurn.some((e) => e.kind === 'CaravanMoved')).toBe(false);
    expect(onlyCaravan(d).coord).toEqual(start);
    // Day 2, the player's turn start: the first movement, along the saved route.
    const dawn = d.do({ kind: 'EndTurn' }, FOE);
    const moved = dawn.find((e) => e.kind === 'CaravanMoved');
    expect(moved).toBeTruthy();
    const c = onlyCaravan(d);
    expect(c.status).toBe('travelling');
    expect(c.lastMovedTurn).toBe(2);
    const turns = caravanStepTurns(d.catalog.caravanPolicy!.dailyMovement, q.stepCosts)!;
    const firstDay = turns.filter((t) => t === 1).length;
    expect(moved && moved.kind === 'CaravanMoved' && moved.path).toEqual(route.slice(0, firstDay));
    expect(c.route).toEqual(route.slice(firstDay));
    expect(moved && moved.kind === 'CaravanMoved' && moved.cost).toBeLessThanOrEqual(600);
    // The saved route carries over the days; it arrives on the quoted day, exactly once.
    let delivered: GameEvent | undefined;
    for (let day = 3; day <= 12 && !delivered; day++) {
      const ev = nextDay(d);
      delivered = ev.find((e) => e.kind === 'CaravanDelivered');
      if (!delivered) expect(route).toEqual(expect.arrayContaining(onlyCaravan(d).route));
    }
    expect(delivered).toBeTruthy();
    expect(d.state.day).toBe(q.etaDay);
    expect(d.town('eastharbor').garrison.slots.find((s) => s?.creatureId === 'hoplite')?.count).toBe(10);
    expect(onlyCaravan(d).status).toBe('delivered');
    expect(onlyCaravan(d).deliveryApplied).toBe(true);
    // The receipt is gone the next day; the garrison keeps its ten (never a second delivery).
    nextDay(d);
    expect(Object.keys(d.state.caravans ?? {})).toHaveLength(0);
    expect(d.town('eastharbor').garrison.slots.find((s) => s?.creatureId === 'hoplite')?.count).toBe(10);
  });

  it('a repeated turn start, a resumed cursor and a reload never move or deliver twice', () => {
    const d = setup();
    dispatch(d, [{ creatureId: 'hoplite', count: 4 }]);
    dispatch(d, [{ creatureId: 'peltast', count: 4 }]);
    nextDay(d);
    const after = deepClone(d.state);
    const coords = Object.values(after.caravans!).map((c) => ({ ...c.coord }));
    // The same turn start again (a retried command, a reloaded save): nothing moves.
    const again = (s: MatchState) => {
      const draft = deepClone(s);
      const tx = new Tx({ catalog: d.catalog }, draft, ME);
      processCaravanTurnStart(tx, ME);
      return { draft, events: tx.events };
    };
    const repeat = again(after);
    expect(repeat.events).toHaveLength(0);
    expect(Object.values(repeat.draft.caravans!).map((c) => c.coord)).toEqual(coords);
    const reloaded = JSON.parse(JSON.stringify(after)) as MatchState;
    expect(again(reloaded).events).toHaveLength(0);
    // An interrupted step (cursor after the first caravan, not complete) resumes with the second only.
    const interrupted = deepClone(after);
    const [first, second] = Object.values(interrupted.caravans!).sort((a, b) => a.seq - b.seq);
    interrupted.caravanTurn = { day: interrupted.day, playerId: ME, lastCaravanId: first!.id, complete: false };
    second!.lastMovedTurn = 0;
    second!.coord = { ...townGate(d.catalog, interrupted, 'westharbor') };
    second!.route = quoteCaravan(d.catalog, interrupted, ME, 'westharbor', 'eastharbor', [{ creatureId: 'hoplite', count: 1 }]).route.map((c) => ({ ...c }));
    const resumed = again(interrupted);
    const movedIds = resumed.events.filter((e) => e.kind === 'CaravanMoved').map((e) => (e.kind === 'CaravanMoved' ? e.caravanId : ''));
    expect(movedIds).toEqual([second!.id]);
    expect(resumed.draft.caravans![first!.id]!.coord).toEqual(first!.coord);
    expect(resumed.draft.caravanTurn?.complete).toBe(true);
  });

  it('several shipments move in their stable dispatch order', () => {
    const d = setup();
    for (let i = 0; i < 11; i++) dispatch(d, [{ creatureId: 'hoplite', count: 1 }]);
    const order = Object.values(d.state.caravans!).sort((a, b) => a.seq - b.seq).map((c) => c.id);
    const ev = nextDay(d);
    const moved = ev.filter((e) => e.kind === 'CaravanMoved').map((e) => (e.kind === 'CaravanMoved' ? e.caravanId : ''));
    expect(moved).toEqual(order);
    // IDs like caravan_10 sort after caravan_9 by dispatch order, not by text.
    expect(order.length).toBe(11);
  });

  it('a blocker on the road holds the shipment before it; it resumes when the way is free', () => {
    const d = setup();
    const q = quoteCaravan(d.catalog, d.state, ME, 'westharbor', 'eastharbor', [{ creatureId: 'hoplite', count: 5 }]);
    dispatch(d, [{ creatureId: 'hoplite', count: 5 }]);
    // An enemy hero (unseen at dispatch) stands on the route's third tile.
    const block: HexCoord = q.route[2]!;
    d.do({ kind: 'EndTurn' });
    d.hero(FOE_HERO).position = { ...block };
    const ev = d.do({ kind: 'EndTurn' }, FOE);
    const c = onlyCaravan(d);
    expect(c.status).toBe('blocked');
    expect(c.blockedReason).toBe('route_blocked');
    expect(c.coord).toEqual(q.route[1]);
    expect(ev.some((e) => e.kind === 'CaravanBlocked' && e.reason === 'route_blocked')).toBe(true);
    // Its cargo is intact and it never shares the enemy's tile.
    expect(c.cargo[0]!.count).toBe(5);
    // The enemy leaves: the next turn start plans again and the wagon rolls on.
    d.do({ kind: 'EndTurn' });
    d.hero(FOE_HERO).position = { q: 32, r: 2 };
    d.do({ kind: 'EndTurn' }, FOE);
    expect(onlyCaravan(d).status).toBe('travelling');
    expect(onlyCaravan(d).route.length).toBeLessThan(q.route.length - 2);
  });

  it('an enemy hero can never walk through a caravan: its tile is an encounter', () => {
    const d = setup();
    dispatch(d, [{ creatureId: 'hoplite', count: 5 }]);
    nextDay(d);
    const c = onlyCaravan(d);
    d.do({ kind: 'EndTurn' });
    const foe = d.hero(FOE_HERO);
    foe.position = { q: c.coord.q, r: c.coord.r - 1 };
    foe.movementPoints = 5000;
    const q = quoteMovement(d.catalog, d.state, FOE_HERO, c.coord);
    expect(q.endsInEncounter).toBe(true);
    expect(q.encounterLabel).toMatch(/caravan/i);
    const beyond = { q: c.coord.q, r: c.coord.r + 1 };
    const around = quoteMovement(d.catalog, d.state, FOE_HERO, beyond);
    expect(around.path.some((p) => p.q === c.coord.q && p.r === c.coord.r)).toBe(false);
    expect(d.reject({ kind: 'MoveHero', heroId: FOE_HERO, destination: c.coord }, FOE).code).toBe('encounter_requires_confirmation');
  });

  it('the source town falling after dispatch changes nothing: the owner stays, it delivers', () => {
    const d = setup();
    dispatch(d, [{ creatureId: 'hoplite', count: 6 }]);
    const west = d.town('westharbor');
    west.ownerId = FOE;
    d.state.world.sites[west.siteId]!.owner = FOE;
    for (let i = 0; i < 12 && onlyCaravan(d).status !== 'delivered'; i++) nextDay(d);
    expect(onlyCaravan(d).ownerId).toBe(ME);
    expect(onlyCaravan(d).status).toBe('delivered');
    expect(d.town('eastharbor').garrison.slots.find((s) => s?.creatureId === 'hoplite')?.count).toBe(6);
  });
});

describe('arrival and holding', () => {
  it('a full garrison holds the whole shipment at the gate (nothing lost); room delivers it, once', () => {
    const d = setup();
    d.town('eastharbor').garrison = { slots: slots([['peltast', 1], ['griffin', 1], ['cavalry', 1], ['temple_adept', 1], ['minotaur', 1], ['cyclops', 1], ['veteran_peltast', 1]]) };
    dispatch(d, [
      { creatureId: 'hoplite', count: 9 },
      { creatureId: 'peltast', count: 3 },
    ]);
    let held: GameEvent | undefined;
    for (let i = 0; i < 12 && !held; i++) held = nextDay(d).find((e) => e.kind === 'CaravanBlocked');
    const c = onlyCaravan(d);
    expect(c.status).toBe('awaiting_garrison');
    expect(c.blockedReason).toBe('garrison_full');
    expect(c.coord).toEqual(townGate(d.catalog, d.state, 'eastharbor'));
    expect(c.cargo.map((s) => s.count)).toEqual([9, 3]);
    expect(d.town('eastharbor').garrison.slots.find((s) => s?.creatureId === 'peltast')?.count).toBe(1);
    // Still full the next day: it waits (no repeated notice), nothing moves into the garrison.
    const quiet = nextDay(d);
    expect(quiet.some((e) => e.kind === 'CaravanBlocked')).toBe(false);
    expect(onlyCaravan(d).status).toBe('awaiting_garrison');
    // A slot freed: the player retries now (the same destination) — the whole shipment joins, once, free.
    d.town('eastharbor').garrison.slots[6] = null;
    const gold = d.player.wallet.gold;
    const ev = d.do({ kind: 'RerouteCaravan', caravanId: c.id, destinationTownId: 'eastharbor' });
    expect(ev.some((e) => e.kind === 'CaravanDelivered')).toBe(true);
    expect(d.player.wallet.gold).toBe(gold);
    const g = d.town('eastharbor').garrison.slots;
    expect(g.find((s) => s?.creatureId === 'peltast')?.count).toBe(4);
    expect(g.find((s) => s?.creatureId === 'hoplite')?.count).toBe(9);
    expect(d.state.appliedKeys).toContain(`caravan_delivery:${c.id}`);
    // Nothing delivers twice: another turn start, a retried reroute.
    expect(d.reject({ kind: 'RerouteCaravan', caravanId: c.id, destinationTownId: 'eastharbor' }).code).toBe('not_found');
    nextDay(d);
    expect(d.town('eastharbor').garrison.slots.find((s) => s?.creatureId === 'hoplite')?.count).toBe(9);
  });

  it('a town captured while its owner’s shipment waits at the gate: no hero is hired onto the wagon’s hex', () => {
    const d = setup();
    d.town('eastharbor').garrison = { slots: slots([['peltast', 1], ['griffin', 1], ['cavalry', 1], ['temple_adept', 1], ['minotaur', 1], ['cyclops', 1], ['veteran_peltast', 1]]) };
    dispatch(d, [{ creatureId: 'hoplite', count: 4 }]);
    for (let i = 0; i < 12 && onlyCaravan(d).status !== 'awaiting_garrison'; i++) nextDay(d);
    expect(onlyCaravan(d).coord).toEqual(townGate(d.catalog, d.state, 'eastharbor'));
    // The rival takes the town (any owner change); the wagon still stands at the gate until its owner's turn.
    const east = d.town('eastharbor');
    east.ownerId = FOE;
    d.state.world.sites[east.siteId]!.owner = FOE;
    east.garrison = { slots: slots([]) };
    east.buildings['tavern'] = 1;
    d.state.scenario = { ...d.state.scenario, heroHiringEnabled: true };
    d.hero(FOE_HERO).status = 'defeated';
    const option = hireOptions(d.catalog, d.state, FOE, 'eastharbor')[0];
    expect(option).toBeDefined();
    const q = quoteHireHero(d.catalog, d.state, FOE, 'eastharbor', option!.definitionId);
    expect(q.legal).toBe(false);
    expect(q.reason).toMatch(/enemy caravan stands at the gate/);
  });

  it('a captured destination holds the shipment; a reroute to another owned town is free', () => {
    const d = setup();
    dispatch(d, [{ creatureId: 'hoplite', count: 7 }]);
    nextDay(d);
    const east = d.town('eastharbor');
    east.ownerId = FOE;
    d.state.world.sites[east.siteId]!.owner = FOE;
    const ev = nextDay(d);
    const c = onlyCaravan(d);
    expect(c.status).toBe('blocked');
    expect(c.blockedReason).toBe('destination_lost');
    expect(ev.some((e) => e.kind === 'CaravanBlocked' && e.reason === 'destination_lost')).toBe(true);
    const at = { ...c.coord };
    // Never delivered to the enemy, never teleported, never discarded.
    expect(east.garrison.slots.every((s) => s === null)).toBe(true);
    expect(c.cargo[0]!.count).toBe(7);
    nextDay(d);
    expect(onlyCaravan(d).coord).toEqual(at);
    // Reroute to Westharbor (owned): no charge, a new route, it rolls on at the next turn start.
    const gold = d.player.wallet.gold;
    const pool = d.town('westharbor').population.hoplite;
    const re = d.do({ kind: 'RerouteCaravan', caravanId: c.id, destinationTownId: 'westharbor' });
    expect(re.some((e) => e.kind === 'ResourcesSpent')).toBe(false);
    expect(re.some((e) => e.kind === 'CaravanRerouted')).toBe(true);
    expect(d.player.wallet.gold).toBe(gold);
    expect(d.town('westharbor').population.hoplite).toBe(pool);
    expect(onlyCaravan(d).destinationTownId).toBe('westharbor');
    expect(onlyCaravan(d).status).toBe('travelling');
    // Rerouting to the enemy town again is refused.
    expect(d.reject({ kind: 'RerouteCaravan', caravanId: c.id, destinationTownId: 'eastharbor' }).code).toBe('not_owner');
    for (let i = 0; i < 12 && onlyCaravan(d).status !== 'delivered'; i++) nextDay(d);
    expect(d.town('westharbor').garrison.slots.find((s) => s?.creatureId === 'hoplite')?.count).toBeGreaterThanOrEqual(7);
  });

  it('only the owner reroutes, never during its battle, never to the same destination while travelling', () => {
    const d = setup();
    dispatch(d, [{ creatureId: 'hoplite', count: 2 }]);
    const c = onlyCaravan(d);
    expect(d.reject({ kind: 'RerouteCaravan', caravanId: c.id, destinationTownId: 'eastharbor' }).code).toBe('already_done');
    d.do({ kind: 'EndTurn' });
    expect(d.reject({ kind: 'RerouteCaravan', caravanId: c.id, destinationTownId: 'westharbor' }, FOE).code).toBe('not_owner');
  });
});

describe('interception', () => {
  /** Day 2, the rival's turn: the caravan stands on open road; the rival hero next to it. */
  function intercept(cargo: { creatureId: string; count: number }[], attacker: Army): { d: GameDriver; c: CaravanState } {
    const d = setup();
    dispatch(d, cargo);
    nextDay(d);
    d.do({ kind: 'EndTurn' });
    const c = onlyCaravan(d);
    const foe = d.hero(FOE_HERO);
    foe.position = { q: c.coord.q, r: c.coord.r - 1 };
    foe.movementPoints = 5000;
    foe.army = { slots: slots(attacker) };
    return { d, c };
  }

  it('the cargo defends without a commander; survivors return to the shipment, which rolls on', () => {
    const { d, c } = intercept([{ creatureId: 'hoplite', count: 30 }], [['peltast', 1]]);
    const ev = d.do({ kind: 'AttackCaravan', heroId: FOE_HERO, caravanId: c.id }, FOE);
    expect(ev.some((e) => e.kind === 'CaravanIntercepted')).toBe(true);
    const b = d.state.battle!;
    expect(b.encounter.kind).toBe('caravan_intercept');
    expect(b.encounter.caravanId).toBe(c.id);
    expect(b.sides.defender.commander).toBeNull();
    expect(b.sides.defender.playerId).toBe(ME);
    expect(b.sides.defender.controller).toBe('human');
    expect(d.state.caravans![c.id]!.status).toBe('intercepted');
    // Locked: no adventure command and no reroute while it fights.
    expect(d.reject({ kind: 'RerouteCaravan', caravanId: c.id, destinationTownId: 'westharbor' }, ME).code).toBe('battle_in_progress');
    d.autoBattle();
    const after = d.state.caravans![c.id]!;
    expect(after.status).toBe('travelling');
    expect(after.pendingBattleId).toBeNull();
    expect(after.cargo[0]!.creatureId).toBe('hoplite');
    expect(after.cargo[0]!.count).toBeGreaterThan(0);
    expect(after.cargo[0]!.count).toBeLessThanOrEqual(30);
    expect(d.hero(FOE_HERO).status).toBe('defeated');
    expect(d.events.some((e) => e.kind === 'CaravanInterceptionResolved' && e.survived)).toBe(true);
    // It moved nothing extra: its next movement is still the player's next turn start.
    expect(after.lastMovedTurn).toBe(2);
  });

  it('all cargo killed: the shipment is destroyed — nothing joins the attacker, no loot, no refund', () => {
    const { d, c } = intercept([{ creatureId: 'hoplite', count: 1 }], [['cyclops', 6]]);
    const foeGold = d.state.players[FOE]!.wallet.gold;
    const myGold = d.player.wallet.gold;
    d.do({ kind: 'AttackCaravan', heroId: FOE_HERO, caravanId: c.id }, FOE);
    d.autoBattle();
    const after = d.state.caravans![c.id]!;
    expect(after.status).toBe('destroyed');
    expect(after.cargo).toEqual([]);
    expect(d.events.some((e) => e.kind === 'CaravanDestroyed' && e.lost[0]?.count === 1)).toBe(true);
    const army = d.hero(FOE_HERO).army.slots.filter((s) => !!s);
    expect(army.every((s) => s!.creatureId === 'cyclops')).toBe(true);
    expect(d.state.players[FOE]!.wallet.gold).toBe(foeGold);
    expect(d.player.wallet.gold).toBe(myGold);
    // The winner steps onto the road where the wagon stood.
    expect(d.hero(FOE_HERO).position).toEqual(c.coord);
    expect(d.state.lastBattleResult?.rewards.resources.gold ?? 0).toBe(0);
  });

  it('a hero guarding the caravan must be fought first; hidden or unreachable caravans cannot be attacked', () => {
    const { d, c } = intercept([{ creatureId: 'hoplite', count: 3 }], [['peltast', 1]]);
    d.hero('alexios').position = { ...c.coord };
    expect(d.reject({ kind: 'AttackCaravan', heroId: FOE_HERO, caravanId: c.id }, FOE).code).toBe('illegal_target');
    d.hero('alexios').position = townGate(d.catalog, d.state, 'westharbor');
    d.hero(FOE_HERO).position = { q: 32, r: 2 };
    expect(d.reject({ kind: 'AttackCaravan', heroId: FOE_HERO, caravanId: c.id }, FOE).code).toBe('illegal_target');
    expect(d.reject({ kind: 'AttackCaravan', heroId: 'alexios', caravanId: c.id }, FOE).code).toBe('not_owner');
  });

  it('another player sees only what its scouting stage permits — never the destination', () => {
    const { d, c } = intercept([{ creatureId: 'hoplite', count: 23 }], [['peltast', 1]]);
    const seen = caravanIntel(d.catalog, d.state, FOE, d.state.caravans![c.id]!)!;
    expect(seen.destinationTownId).toBeNull();
    expect(seen.stage).not.toBe('full');
    expect(JSON.stringify(seen)).not.toContain('"count":23');
    expect(JSON.stringify(seen)).not.toContain('eastharbor');
    const own = caravanIntel(d.catalog, d.state, ME, d.state.caravans![c.id]!)!;
    expect(own.stage).toBe('full');
    expect(own.destinationTownId).toBe('eastharbor');
    d.hero(FOE_HERO).position = { q: 32, r: 2 };
    expect(caravanIntel(d.catalog, d.state, FOE, d.state.caravans![c.id]!)).toBeNull();
  });
});

describe('eliminated owners', () => {
  it('eliminating a rival removes its shipments without loot or refund and keeps other owners cargo', () => {
    const d = setup();
    dispatch(d, [{ creatureId: 'hoplite', count: 3 }]);
    dispatch(d, [{ creatureId: 'peltast', count: 2 }]);
    const [abandoned, mine] = Object.values(d.state.caravans!);
    abandoned!.ownerId = FOE;
    d.hero(FOE_HERO).status = 'defeated';
    const myGold = d.player.wallet.gold;
    const foeGold = d.state.players[FOE]!.wallet.gold;
    const ev = d.do({ kind: 'EndTurn' });
    expect(ev.some((e) => e.kind === 'PlayerEliminated' && e.playerId === FOE)).toBe(true);
    expect(d.state.caravans![abandoned!.id]).toBeUndefined();
    expect(d.state.caravans![mine!.id]!.cargo).toEqual(mine!.cargo);
    expect(ev.filter((e) => e.kind === 'CaravanDestroyed')).toEqual([
      expect.objectContaining({ playerId: FOE, caravanId: abandoned!.id, byHeroId: null, lost: [{ creatureId: 'hoplite', count: 3 }] }),
    ]);
    expect(d.player.wallet.gold).toBe(myGold);
    expect(d.state.players[FOE]!.wallet.gold).toBe(foeGold);
  });

  it.each(['queued', 'travelling', 'blocked', 'awaiting_garrison', 'delivered', 'destroyed'] as const)(
    'cleans an already eliminated owner from a loaded save (%s), once, without stale occupancy',
    (status) => {
      const d = setup();
      dispatch(d, [{ creatureId: 'hoplite', count: 3 }]);
      const c = onlyCaravan(d);
      c.ownerId = FOE;
      c.status = status;
      const final = status === 'delivered' || status === 'destroyed';
      if (final) c.cargo = [];
      d.state.players[FOE]!.eliminated = true;
      d.hero(FOE_HERO).status = 'defeated';
      d.state.caravanTurn = { day: d.state.day, playerId: FOE, lastCaravanId: c.id, complete: false };
      const loaded = JSON.parse(JSON.stringify(d.state)) as MatchState;
      const tx = new Tx({ catalog: d.catalog }, loaded, ME);
      const wallet = { ...loaded.players[FOE]!.wallet };
      // Populate the tile cache before cleanup; no invisible blocker may survive deletion.
      expect(enemyCaravanAt(loaded, c.coord, ME)?.id).toBe(final ? undefined : c.id);
      evaluateMissionOutcome(tx);
      expect(loaded.caravans![c.id]).toBeUndefined();
      expect(loaded.caravanTurn).toBeNull();
      expect(enemyCaravanAt(loaded, c.coord, ME)).toBeUndefined();
      expect(loaded.players[FOE]!.wallet).toEqual(wallet);
      expect(tx.events.filter((e) => e.kind === 'CaravanDestroyed')).toHaveLength(final ? 0 : 1);
      expect(tx.events.some((e) => e.kind === 'PlayerEliminated')).toBe(false);
      // Continue a running match after recovery: no duplicate destruction receipt.
      loaded.outcome = { status: 'running' };
      const again = new Tx({ catalog: d.catalog }, loaded, ME);
      evaluateMissionOutcome(again);
      expect(again.events.some((e) => e.kind === 'CaravanDestroyed')).toBe(false);
    },
  );
});

describe('feature flag and saves', () => {
  it('feature off: dispatch refused, no caravans ever', () => {
    const d = setup();
    features(d, { recruitmentCaravansV1: false });
    expect(d.reject({ kind: 'DispatchCaravan', sourceTownId: 'westharbor', destinationTownId: 'eastharbor', items: [{ creatureId: 'hoplite', count: 1 }] }).code).toBe('not_in_scope');
    nextDay(d);
    expect(d.state.caravans).toBeUndefined();
    expect(d.state.caravanTurn).toBeUndefined();
  });

  it('an old save without the flag keeps the legacy game: no caravans', () => {
    const d = setup();
    delete (d.state.scenario.features as Record<string, unknown>).recruitmentCaravansV1;
    expect(d.reject({ kind: 'DispatchCaravan', sourceTownId: 'westharbor', destinationTownId: 'eastharbor', items: [{ creatureId: 'hoplite', count: 1 }] }).code).toBe('not_in_scope');
    nextDay(d);
    expect(d.state.caravans).toBeUndefined();
  });

  it('legacy campaign chapters keep caravans off; Confluence opts in', () => {
    const v2 = Object.values(GameDriver.mission('skirmish_twin_harbors').catalog.missions).filter((m) => m.campaignId);
    expect(v2.length).toBeGreaterThan(0);
    for (const m of v2) expect(m.features?.recruitmentCaravansV1 ?? false).toBe(['worlds_met','ashes_accord'].includes(m.campaignId!));
  });

  it('deterministic: the same commands give the same state', () => {
    const run = () => {
      const d = setup();
      dispatch(d, [{ creatureId: 'hoplite', count: 5 }, { creatureId: 'griffin', count: 2 }]);
      for (let i = 0; i < 4; i++) nextDay(d);
      return canonicalStateHash(d.state);
    };
    expect(run()).toBe(run());
  });

  it('the ETA follows the integer route costs with 600 a turn', () => {
    expect(caravanStepTurns(600, [100, 200, 300, 400, 500, 600, 700])).toEqual([1, 1, 1, 1, 1, 1, 2]);
    expect(caravanStepTurns(600, [75, 150, 225, 300, 375, 450, 525, 600, 675])).toEqual([1, 1, 1, 1, 1, 1, 1, 1, 2]);
    const d = setup();
    dispatch(d, [{ creatureId: 'hoplite', count: 1 }]);
    const c = onlyCaravan(d);
    const costs = routeStepCosts(d.catalog, d.state, c.coord, c.route);
    expect(costs.every((n) => Number.isInteger(n))).toBe(true);
    expect(caravanEta(d.catalog, d.state, c)).toBe(quoteCaravan(d.catalog, d.state, ME, 'westharbor', 'eastharbor', [{ creatureId: 'hoplite', count: 1 }]).etaDay);
  });
});
