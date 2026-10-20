import { describe, expect, it } from 'vitest';
import { GameDriver } from '@pr/testing';
import { quoteConstruction, quoteTrade, townDailyIncome, weeklyGrowthFor } from '../src';

const M01 = 'three_beacons_m01';

describe('construction (ECO-01..04)', () => {
  it('builds immediately, once per town per day, with full cost', () => {
    const d = GameDriver.mission(M01);
    d.hero().army.slots[0]!.count = 20;
    d.hero().army.slots[1]!.count = 8;
    const goldBefore = d.player.wallet.gold;
    d.do({ kind: 'BuildStructure', townId: 'asterion', buildingId: 'market' });
    expect(d.player.wallet.gold).toBe(goldBefore - 500);
    expect(d.player.wallet.wood).toBe(12 - 5);
    expect(d.town('asterion').buildings.marketplace).toBe(1);
    expect(d.town('asterion').buildUsedDay).toBe(1);
    const r = d.reject({ kind: 'BuildStructure', townId: 'asterion', buildingId: 'barracks_up' });
    expect(r.code).toBe('build_used_today');
  });

  it('explains scope and planned locations honestly', () => {
    const d = GameDriver.mission(M01);
    d.hero().army.slots[0]!.count = 20;
    d.hero().army.slots[1]!.count = 8;
    const q = quoteConstruction(d.catalog, d.state, 'player', 'asterion', 'sanctum_1');
    expect(q.state).toBe('not_in_scope');
    expect(q.reason).toBe('Not available in this demo mission');
    // The support services are buildable in skirmish but outside the campaign allowlists.
    const p = quoteConstruction(d.catalog, d.state, 'player', 'asterion', 'watchtower');
    expect(p.state).toBe('not_in_scope');
    expect(d.reject({ kind: 'BuildStructure', townId: 'asterion', buildingId: 'watchtower' }).code).toBe('not_in_scope');
    // No town location is left without mechanics.
    expect(Object.values(d.catalog.buildings).filter((b) => b.implementationStatus === 'planned')).toEqual([]);
  });

  it('Town Hall replaces Village Hall income (1,000 total, not 1,500) from the next dawn', () => {
    const d = GameDriver.mission(M01);
    d.hero().army.slots[0]!.count = 20;
    d.hero().army.slots[1]!.count = 8;
    expect(townDailyIncome(d.catalog, d.town('asterion')).gold).toBe(500);
    d.do({ kind: 'BuildStructure', townId: 'asterion', buildingId: 'town_hall' });
    expect(townDailyIncome(d.catalog, d.town('asterion')).gold).toBe(1000);
    const gold = d.player.wallet.gold;
    d.endDay();
    expect(d.state.day).toBe(2);
    expect(d.player.wallet.gold).toBe(gold + 1000);
  });

  it('rejects a partial payment when Crystal is short (ECO-09)', () => {
    const d = GameDriver.mission('three_beacons_m02');
    d.state.players.player!.wallet = { ...d.player.wallet, crystal: 3 };
    const before = { ...d.player.wallet };
    const r = d.reject({ kind: 'BuildStructure', townId: 'passhaven', buildingId: 'sanctum_2' });
    expect(r.code).toBe('insufficient_resources');
    expect(d.player.wallet).toEqual(before);
  });
});

describe('population and growth (ECO-05..08)', () => {
  it('grants base growth once on first dwelling construction; the upgrade adds none', () => {
    const d = GameDriver.mission(M01);
    d.hero().army.slots[0]!.count = 20;
    d.hero().army.slots[1]!.count = 8;
    d.do({ kind: 'BuildStructure', townId: 'asterion', buildingId: 'peltast_range' });
    expect(d.town('asterion').population.peltast).toBe(9);
    d.endDay();
    d.do({ kind: 'BuildStructure', townId: 'asterion', buildingId: 'peltast_range_up' });
    expect(d.town('asterion').population.peltast).toBe(9);
  });

  it('applies weekly growth exactly once at day 8', () => {
    const d = GameDriver.mission(M01);
    d.hero().army.slots[0]!.count = 20;
    d.hero().army.slots[1]!.count = 8;
    for (let i = 0; i < 6; i++) d.endDay();
    expect(d.state.day).toBe(7);
    expect(d.town('asterion').population.hoplite).toBe(14);
    d.endDay();
    expect(d.state.day).toBe(8);
    expect(d.town('asterion').population.hoplite).toBe(28);
    expect(weeklyGrowthFor(d.catalog, d.town('asterion'), 'hoplite')).toBe(14);
  });

  it('uses floor rounding per family for fortification multipliers', () => {
    const d = GameDriver.mission('three_beacons_m03');
    // Highwatch has a Citadel: 9 * 1.5 = 13 (not 14); 1 * 1.5 would be 1.
    expect(weeklyGrowthFor(d.catalog, d.town('highwatch'), 'peltast')).toBe(13);
    expect(weeklyGrowthFor(d.catalog, d.town('highwatch'), 'temple_adept')).toBe(4);
  });
});

describe('recruitment, training and transfers (ARM-01..04)', () => {
  it('recruits into the visiting hero from the shared family pool', () => {
    const d = GameDriver.mission(M01);
    d.hero().army.slots[0]!.count = 20;
    d.hero().army.slots[1]!.count = 8;
    d.do({ kind: 'RecruitUnits', townId: 'asterion', creatureId: 'hoplite', quantity: 8, destination: { kind: 'hero', heroId: 'alexios' } });
    expect(d.hero().army.slots[0]!.count).toBe(28);
    expect(d.town('asterion').population.hoplite).toBe(6);
    expect(d.player.wallet.gold).toBe(5000 - 480);
    expect(d.state.mission.counters['recruited:hoplite']).toBe(8);
  });

  it('rejects recruiting to a remote hero (ARM-01) but allows the garrison', () => {
    const d = GameDriver.mission(M01);
    d.hero().army.slots[0]!.count = 20;
    d.hero().army.slots[1]!.count = 8;
    d.do({ kind: 'MoveHero', heroId: 'alexios', destination: { q: 5, r: 7 } });
    const r = d.reject({ kind: 'RecruitUnits', townId: 'asterion', creatureId: 'hoplite', quantity: 2, destination: { kind: 'hero', heroId: 'alexios' } });
    expect(r.code).toBe('not_present');
    d.do({ kind: 'RecruitUnits', townId: 'asterion', creatureId: 'hoplite', quantity: 2, destination: { kind: 'garrison' } });
    expect(d.town('asterion').garrison.slots[0]!.count).toBe(2);
  });

  it('charges only the price difference to train troops (12 Hoplites = 180 Gold)', () => {
    const d = GameDriver.mission(M01);
    d.hero().army.slots[0]!.count = 20;
    d.hero().army.slots[1]!.count = 8;
    d.do({ kind: 'BuildStructure', townId: 'asterion', buildingId: 'barracks_up' });
    const gold = d.player.wallet.gold;
    d.do({ kind: 'UpgradeStack', townId: 'asterion', army: { kind: 'hero', heroId: 'alexios' }, slot: 0, quantity: 12 });
    expect(d.player.wallet.gold).toBe(gold - 180);
    const vets = d.hero().army.slots.find((s) => s?.creatureId === 'veteran_hoplite');
    expect(vets?.count).toBe(12);
    expect(d.hero().army.slots[0]!.count).toBe(8);
    expect(d.town('asterion').population.hoplite).toBe(14);
    expect(d.state.mission.counters['trained:hoplite']).toBe(12);
  });

  it('rejects a partial upgrade with no free slot (ARM-03) without spending', () => {
    const d = GameDriver.mission(M01);
    d.hero().army.slots[0]!.count = 20;
    d.hero().army.slots[1]!.count = 8;
    d.do({ kind: 'BuildStructure', townId: 'asterion', buildingId: 'barracks_up' });
    const hero = d.state.heroes.alexios!;
    for (let i = 2; i < 7; i++) hero.army.slots[i] = { stackId: `x${i}`, creatureId: 'peltast', count: 0 + 1 };
    // Slots 1..6 hold peltasts (merge allowed only for identical forms): make them distinct forms is impossible,
    // so fill with peltast stacks; there is no veteran_hoplite stack and no empty slot.
    const gold = d.player.wallet.gold;
    const r = d.reject({ kind: 'UpgradeStack', townId: 'asterion', army: { kind: 'hero', heroId: 'alexios' }, slot: 0, quantity: 5 });
    expect(r.code).toBe('no_capacity');
    expect(d.player.wallet.gold).toBe(gold);
  });

  it('conserves counts through split, merge and swap (ARM-04)', () => {
    const d = GameDriver.mission(M01);
    d.hero().army.slots[0]!.count = 20;
    d.hero().army.slots[1]!.count = 8;
    const total = () =>
      d.hero().army.slots.reduce((n, s) => n + (s?.count ?? 0), 0) + d.town('asterion').garrison.slots.reduce((n, s) => n + (s?.count ?? 0), 0);
    const t0 = total();
    const hero = { kind: 'hero' as const, heroId: 'alexios' };
    const garrison = { kind: 'garrison' as const, townId: 'asterion' };
    d.do({ kind: 'TransferStack', from: hero, fromSlot: 0, to: garrison, toSlot: 0, quantity: 7 });
    d.do({ kind: 'TransferStack', from: hero, fromSlot: 0, to: hero, toSlot: 3, quantity: 5 });
    d.do({ kind: 'TransferStack', from: garrison, fromSlot: 0, to: hero, toSlot: 3, quantity: 7 });
    d.do({ kind: 'TransferStack', from: hero, fromSlot: 1, to: hero, toSlot: 3, quantity: 8 }); // swap peltasts with hoplites
    expect(total()).toBe(t0);
    expect(d.reject({ kind: 'TransferStack', from: hero, fromSlot: 0, to: garrison, toSlot: 1, quantity: 999 }).code).toBe('invalid_quantity');
  });

  it('never leaves a traveling hero without troops', () => {
    const d = GameDriver.mission(M01);
    d.hero().army.slots[0]!.count = 20;
    d.hero().army.slots[1]!.count = 8;
    const hero = { kind: 'hero' as const, heroId: 'alexios' };
    const garrison = { kind: 'garrison' as const, townId: 'asterion' };
    d.do({ kind: 'TransferStack', from: hero, fromSlot: 1, to: garrison, toSlot: 1, quantity: 8 });
    expect(d.reject({ kind: 'TransferStack', from: hero, fromSlot: 0, to: garrison, toSlot: 0, quantity: 20 }).code).toBe('illegal_action');
  });
});

describe('market (ECO-10)', () => {
  it('has no profitable sell-buy cycle and never trades Favor', () => {
    const d = GameDriver.mission(M01);
    d.hero().army.slots[0]!.count = 20;
    d.hero().army.slots[1]!.count = 8;
    d.do({ kind: 'BuildStructure', townId: 'asterion', buildingId: 'market' });
    const gold = d.player.wallet.gold;
    d.do({ kind: 'TradeResources', townId: 'asterion', sell: 'stone', buy: 'gold', amount: 2 });
    d.do({ kind: 'TradeResources', townId: 'asterion', sell: 'gold', buy: 'stone', amount: 2 });
    expect(d.player.wallet.stone).toBe(18);
    expect(d.player.wallet.gold).toBeLessThan(gold);
    expect(quoteTrade(d.catalog, d.state, 'player', 'asterion', 'favor', 'gold', 1).legal).toBe(false);
    expect(quoteTrade(d.catalog, d.state, 'player', 'asterion', 'wood', 'stone', 1).legal).toBe(false);
  });
});

describe('command pipeline', () => {
  it('rejects duplicate command IDs and stale revisions without changing state', async () => {
    const d = GameDriver.mission(M01);
    d.hero().army.slots[0]!.count = 20;
    d.hero().army.slots[1]!.count = 8;
    const { processCommand } = await import('../src');
    const cmd = d.command({ kind: 'BuildStructure', townId: 'asterion', buildingId: 'market' });
    const r1 = processCommand({ catalog: d.catalog }, d.state, cmd);
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;
    const again = processCommand({ catalog: d.catalog }, r1.state, { ...cmd, expectedRevision: r1.state.revision });
    expect(again.ok).toBe(false);
    if (!again.ok) expect(again.rejection.code).toBe('duplicate_command');
    const stale = processCommand({ catalog: d.catalog }, r1.state, { ...cmd, commandId: 'other', expectedRevision: 0 });
    expect(stale.ok).toBe(false);
    if (!stale.ok) expect(stale.rejection.code).toBe('stale_revision');
    expect(r1.state.revision).toBe(1);
  });
});
