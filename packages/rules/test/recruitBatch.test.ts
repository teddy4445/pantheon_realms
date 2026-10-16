import { describe, expect, it } from 'vitest';
import { GameDriver } from '@pr/testing';
import { deepClone, quoteRecruitBatch, recruitAllItems, resources, type MatchState } from '../src';

const M01 = 'three_beacons_m01';
const ALEXIOS = { kind: 'hero', heroId: 'alexios' } as const;

/** Asterion with three dwellings (Hoplites and Griffins upgraded, Peltasts base) and a week's creatures. */
function town(gold = 50_000): GameDriver {
  const d = GameDriver.mission(M01);
  const t = d.town('asterion');
  t.buildings.dwelling_t1 = 2;
  t.buildings.dwelling_t2 = 1;
  t.buildings.dwelling_t3 = 2;
  t.population = { hoplite: 14, peltast: 9, griffin: 4 };
  d.state.players.player!.wallet = resources({ gold, wood: 12, stone: 18, crystal: 2 });
  return d;
}

describe('Recruit all: the batch it offers', () => {
  it('every built family with creatures, tier order, upgraded form when its dwelling stands, base otherwise', () => {
    const d = town();
    expect(recruitAllItems(d.catalog, d.state, 'asterion')).toEqual([
      { creatureId: 'veteran_hoplite', quantity: 14 },
      { creatureId: 'peltast', quantity: 9 },
      { creatureId: 'windcrest_griffin', quantity: 4 },
    ]);
  });

  it('keeps the player’s explicit base choice for a family, and never offers a form that cannot be recruited', () => {
    const d = town();
    const items = recruitAllItems(d.catalog, d.state, 'asterion', { hoplite: 'hoplite', peltast: 'veteran_peltast' });
    expect(items[0]).toEqual({ creatureId: 'hoplite', quantity: 14 });
    // No upgraded peltast dwelling: the choice is ignored, the base form stays.
    expect(items[1]).toEqual({ creatureId: 'peltast', quantity: 9 });
  });

  it('leaves out families without a dwelling or without creatures this week', () => {
    const d = town();
    d.town('asterion').population.peltast = 0;
    d.town('asterion').population.centaur = 6; // no dwelling for it
    expect(recruitAllItems(d.catalog, d.state, 'asterion').map((i) => i.creatureId)).toEqual(['veteran_hoplite', 'windcrest_griffin']);
  });
});

describe('Recruit all: one quote against the evolving army', () => {
  it('totals every line, merges into existing stacks and places new ones in order', () => {
    const d = town();
    const items = recruitAllItems(d.catalog, d.state, 'asterion', { hoplite: 'hoplite' });
    const q = quoteRecruitBatch(d.catalog, d.state, 'player', 'asterion', items, ALEXIOS);
    expect(q.legal).toBe(true);
    expect(q.totalCount).toBe(14 + 9 + 4);
    expect(q.totalCost.gold).toBe(14 * 60 + 9 * 100 + 4 * 300);
    // Hoplites and Peltasts join Alexios's stacks; the Griffins take the first free slot.
    expect(q.lines.map((l) => [l.creatureId, l.slot, l.merges])).toEqual([
      ['hoplite', 0, true],
      ['peltast', 1, true],
      ['windcrest_griffin', 2, false],
    ]);
  });

  it('counts the slots the whole batch needs — seven quotes against the same army would each fit', () => {
    const d = town();
    const army = d.hero().army;
    // Five of seven slots taken (none by these creatures): two free slots for three new stacks.
    army.slots = [
      { stackId: 'x1', creatureId: 'centaur', count: 1 },
      { stackId: 'x2', creatureId: 'temple_adept', count: 1 },
      { stackId: 'x3', creatureId: 'cavalry', count: 1 },
      { stackId: 'x4', creatureId: 'minotaur', count: 1 },
      { stackId: 'x5', creatureId: 'cyclops', count: 1 },
      null,
      null,
    ];
    const items = recruitAllItems(d.catalog, d.state, 'asterion');
    const q = quoteRecruitBatch(d.catalog, d.state, 'player', 'asterion', items, ALEXIOS);
    expect(q.legal).toBe(false);
    expect(q.code).toBe('no_capacity');
    expect(q.slotsShort).toBe(1);
    expect(q.reason).toBe('Needs 1 more army slot');
    // The command is refused whole: nothing spent, no pool touched, the army unchanged.
    const before = deepClone(d.state) as MatchState;
    expect(d.reject({ kind: 'RecruitBatch', townId: 'asterion', items, destination: ALEXIOS }).code).toBe('no_capacity');
    expect(d.state).toEqual(before);
  });

  it('names what is short when the whole batch cannot be afforded, and buys nothing', () => {
    const d = town(1_000);
    const items = recruitAllItems(d.catalog, d.state, 'asterion');
    const q = quoteRecruitBatch(d.catalog, d.state, 'player', 'asterion', items, { kind: 'garrison' });
    const cost = 14 * 75 + 9 * 100 + 4 * 300;
    expect(q.totalCost.gold).toBe(cost);
    expect(q.legal).toBe(false);
    expect(q.reason).toBe(`Short ${cost - 1_000} gold`);
    expect(q.shortfall.gold).toBe(cost - 1_000);
    const before = deepClone(d.state) as MatchState;
    expect(d.reject({ kind: 'RecruitBatch', townId: 'asterion', items, destination: { kind: 'garrison' } }).code).toBe('insufficient_resources');
    expect(d.state).toEqual(before);
  });

  it('reports slots and resources together when both are short', () => {
    const d = town(100);
    d.town('asterion').garrison.slots = d.town('asterion').garrison.slots.map((_, i) => (i < 6 ? { stackId: `g${i}`, creatureId: 'cyclops', count: 1 } : null));
    const q = quoteRecruitBatch(d.catalog, d.state, 'player', 'asterion', recruitAllItems(d.catalog, d.state, 'asterion'), { kind: 'garrison' });
    expect(q.reason).toBe(`Needs 2 more army slots · Short ${14 * 75 + 9 * 100 + 4 * 300 - 100} gold`);
  });
});

describe('Recruit all: one atomic command', () => {
  it('spends exactly the quoted cost, empties the pools and fills the army once', () => {
    const d = town();
    const items = recruitAllItems(d.catalog, d.state, 'asterion');
    const q = quoteRecruitBatch(d.catalog, d.state, 'player', 'asterion', items, ALEXIOS);
    const gold = d.player.wallet.gold;
    const revision = d.state.revision;
    d.do({ kind: 'RecruitBatch', townId: 'asterion', items, destination: ALEXIOS });
    expect(d.state.revision).toBe(revision + 1);
    expect(d.player.wallet.gold).toBe(gold - q.totalCost.gold);
    expect(d.town('asterion').population).toMatchObject({ hoplite: 0, peltast: 0, griffin: 0 });
    const slots = d.hero().army.slots.filter(Boolean).map((s) => [s!.creatureId, s!.count]);
    expect(slots).toEqual([
      ['hoplite', 20],
      ['peltast', 8 + 9],
      ['veteran_hoplite', 14],
      ['windcrest_griffin', 4],
    ]);
    expect(d.state.mission.counters['recruited:hoplite']).toBe(14);
  });

  it('refuses a stale batch (a pool changed since the quote) without spending anything', () => {
    const d = town();
    const items = recruitAllItems(d.catalog, d.state, 'asterion');
    d.do({ kind: 'RecruitUnits', townId: 'asterion', creatureId: 'peltast', quantity: 2, destination: { kind: 'garrison' } });
    const before = deepClone(d.state) as MatchState;
    const r = d.reject({ kind: 'RecruitBatch', townId: 'asterion', items, destination: ALEXIOS });
    expect(r.code).toBe('no_population');
    expect(d.state).toEqual(before);
  });

  it('rejects two forms of one family, an unbuilt form and an empty batch', () => {
    const d = town();
    expect(d.reject({ kind: 'RecruitBatch', townId: 'asterion', items: [{ creatureId: 'hoplite', quantity: 1 }, { creatureId: 'veteran_hoplite', quantity: 1 }], destination: ALEXIOS }).code).toBe('invalid_command');
    expect(d.reject({ kind: 'RecruitBatch', townId: 'asterion', items: [{ creatureId: 'veteran_peltast', quantity: 1 }], destination: ALEXIOS }).code).toBe('not_recruitable');
    expect(d.reject({ kind: 'RecruitBatch', townId: 'asterion', items: [], destination: ALEXIOS }).code).toBe('invalid_quantity');
  });
});
