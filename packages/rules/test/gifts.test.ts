/**
 * Divine gifts (proposed 2026-10-03): Favor buys a Temple's gift — resources,
 * recruits, experience or an artifact — once per town with a Temple per week,
 * in scenarios with divine interventions only.
 */
import { describe, expect, it } from 'vitest';
import { GameDriver } from '@pr/testing';
import { divineGifts, giftNeedsHero, quoteDivineGift, townGate } from '../src';

const SK = 'skirmish_twin_harbors';

function setup(favor = 100) {
  const d = GameDriver.mission(SK);
  const town = d.state.towns['westharbor']!;
  town.buildings['pantheon_temple'] = 1;
  d.player.wallet.favor = favor;
  const hero = Object.values(d.state.heroes).find((h) => h.ownerId === 'player' && h.status === 'active')!;
  hero.position = { ...townGate(d.catalog, d.state, town.id) };
  return { d, town, hero };
}

describe('divine gifts', () => {
  it('six gifts in skirmish, none in The Three Beacons', () => {
    const { d } = setup();
    const gifts = divineGifts(d.catalog, d.state);
    expect(gifts.map((g) => g.id)).toEqual(['temple_treasury', 'timber_and_stone', 'tears_of_the_gods', 'anointing', 'blessed_brood', 'temple_relic']);
    const m1 = GameDriver.mission('three_beacons_m01');
    expect(divineGifts(m1.catalog, m1.state)).toEqual([]);
    const q = quoteDivineGift(m1.catalog, m1.state, 'player', Object.values(m1.state.towns).find((t) => t.ownerId === 'player')!.id, 'temple_treasury');
    expect(q.code).toBe('not_in_scope');
  });

  it('resources: pays Favor, grants at once, then the Temple waits a week', () => {
    const { d } = setup(12);
    const gold = d.player.wallet.gold;
    const ev = d.do({ kind: 'ReceiveDivineGift', townId: 'westharbor', giftId: 'temple_treasury' });
    expect(ev.some((e) => e.kind === 'DivineGiftReceived')).toBe(true);
    expect(d.player.wallet.favor).toBe(7);
    expect(d.player.wallet.gold).toBe(gold + 2000);
    const again = quoteDivineGift(d.catalog, d.state, 'player', 'westharbor', 'timber_and_stone');
    expect(again.code).toBe('already_done');
    // Next week the Temple gives again.
    d.state.day += 7;
    expect(quoteDivineGift(d.catalog, d.state, 'player', 'westharbor', 'timber_and_stone').legal).toBe(true);
  });

  it('needs a Temple, enough Favor, and (for hero gifts) a hero in the town', () => {
    const { d, town, hero } = setup(3);
    expect(quoteDivineGift(d.catalog, d.state, 'player', 'westharbor', 'temple_treasury').code).toBe('insufficient_resources');
    d.player.wallet.favor = 50;
    town.buildings['pantheon_temple'] = 0;
    expect(quoteDivineGift(d.catalog, d.state, 'player', 'westharbor', 'temple_treasury').code).toBe('missing_requirement');
    town.buildings['pantheon_temple'] = 1;
    expect(giftNeedsHero(d.catalog.divineGifts!['anointing']!)).toBe(true);
    expect(quoteDivineGift(d.catalog, d.state, 'player', 'westharbor', 'anointing').legal).toBe(false);
    hero.position = { q: town.coord.q + 2, r: town.coord.r };
    expect(quoteDivineGift(d.catalog, d.state, 'player', 'westharbor', 'anointing', hero.id).code).toBe('not_present');
    hero.position = { ...townGate(d.catalog, d.state, town.id) };
    const xp = hero.xp;
    d.do({ kind: 'ReceiveDivineGift', townId: 'westharbor', giftId: 'anointing', heroId: hero.id });
    expect(d.state.heroes[hero.id]!.xp).toBe(xp + 1000);
  });

  it('recruits: half a week of growth for tiers 1-4 (at least 1); relic: a minor artifact drawn for match, town and week', () => {
    const { d, town, hero } = setup(100);
    const before = { ...town.population };
    const q = quoteDivineGift(d.catalog, d.state, 'player', 'westharbor', 'blessed_brood');
    expect(q.legal).toBe(true);
    expect(Object.keys(q.recruits).length).toBeGreaterThan(0);
    for (const [f, n] of Object.entries(q.recruits)) {
      expect(d.catalog.families[f]!.tier).toBeLessThanOrEqual(4);
      expect(n).toBeGreaterThanOrEqual(1);
    }
    d.do({ kind: 'ReceiveDivineGift', townId: 'westharbor', giftId: 'blessed_brood' });
    for (const [f, n] of Object.entries(q.recruits)) expect(d.state.towns['westharbor']!.population[f]).toBe((before[f] ?? 0) + n);
    d.state.day += 7;
    const r1 = quoteDivineGift(d.catalog, d.state, 'player', 'westharbor', 'temple_relic', hero.id);
    const r2 = quoteDivineGift(d.catalog, d.state, 'player', 'westharbor', 'temple_relic', hero.id);
    expect(r1.artifactId).toBeTruthy();
    expect(r1.artifactId).toBe(r2.artifactId);
    expect(d.catalog.artifacts[r1.artifactId!]!.rarity).toBe('minor');
    const owned = () => [...Object.values(d.state.heroes[hero.id]!.equipment), ...d.state.heroes[hero.id]!.backpack].filter((x) => x?.artifactId === r1.artifactId).length;
    const n0 = owned();
    d.do({ kind: 'ReceiveDivineGift', townId: 'westharbor', giftId: 'temple_relic', heroId: hero.id });
    expect(owned()).toBe(n0 + 1);
  });
});
