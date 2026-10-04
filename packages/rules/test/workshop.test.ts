/**
 * The Workshop (owner request 2026-10-04): four different tier-1 items each
 * week, each bought once until the stock changes; none in The Three Beacons
 * (its content stays core-only).
 */
import { describe, expect, it } from 'vitest';
import { GameDriver } from '@pr/testing';
import { quoteArtifactPurchase, townWorkshopStock, workshopPool, worldWeek } from '../src';

function skirmishWithWorkshop(): GameDriver {
  const d = GameDriver.mission('skirmish_twin_harbors', { matchId: 'test:workshop' });
  const town = d.state.towns['westharbor']!;
  if (!town.buildings['workshop']) d.do({ kind: 'BuildStructure', townId: town.id, buildingId: 'workshop' });
  return d;
}

describe('Workshop', () => {
  it('is called the Workshop in every town and stocks tier-1 (treasure) items only', () => {
    const d = GameDriver.mission('skirmish_twin_harbors');
    for (const town of Object.values(d.catalog.townArchetypes)) {
      const slot = town.slots.find((s) => s.role === 'workshop');
      expect(slot?.label, town.id).toBe('Workshop');
      for (const b of slot?.buildingIds ?? []) expect(d.catalog.buildings[b]?.name, b).toBe('Workshop');
    }
    const pool = workshopPool(d.catalog, ['treasure']);
    expect(pool.length).toBeGreaterThanOrEqual(12);
    for (const id of pool) expect(d.catalog.artifacts[id]?.rarity).toBe('treasure');
  });

  it('offers four different items this week, each once; the stock changes next week', () => {
    const d = skirmishWithWorkshop();
    const town = d.state.towns['westharbor']!;
    expect(townWorkshopStock(d.catalog, town)).toEqual({ stockSize: 4, rarities: ['treasure'] });
    const week = worldWeek(d.state, d.catalog.rulesProfile.daysPerWeek);
    expect(town.workshop?.week).toBe(week);
    const stock = town.workshop!.stock;
    expect(stock).toHaveLength(4);
    expect(new Set(stock).size).toBe(4);
    for (const id of stock) expect(d.catalog.artifacts[id!]?.rarity).toBe('treasure');

    const hero = Object.values(d.state.heroes).find((h) => h.ownerId === 'player' && !h.monster && h.status === 'active')!;
    d.player.wallet.gold = 99999;
    const q = quoteArtifactPurchase(d.catalog, d.state, 'player', town.id, hero.id, 0, 'workshop');
    expect(q.legal, q.reason ?? '').toBe(true);
    const bought = stock[0]!;
    const before = d.player.wallet.gold;
    d.do({ kind: 'BuyArtifact', townId: town.id, heroId: hero.id, index: 0, shop: 'workshop' });
    expect(d.player.wallet.gold).toBe(before - (d.catalog.artifacts[bought]!.merchantPrice?.gold ?? 0));
    const h = d.state.heroes[hero.id]!;
    const owned = [...Object.values(h.equipment), ...h.backpack].some((x) => x?.artifactId === bought);
    expect(owned).toBe(true);
    // Sold until next week.
    expect(d.state.towns[town.id]!.workshop!.stock[0]).toBeNull();
    const again = quoteArtifactPurchase(d.catalog, d.state, 'player', town.id, hero.id, 0, 'workshop');
    expect(again.legal).toBe(false);
    expect(again.reason).toMatch(/next week/);
    // The Artifact Merchant's stock is separate.
    expect(quoteArtifactPurchase(d.catalog, d.state, 'player', town.id, hero.id, 0).reason).toMatch(/Artifact Merchant/);
    // A new week brings a full new stock.
    const days = d.catalog.rulesProfile.daysPerWeek - ((d.state.day - 1) % d.catalog.rulesProfile.daysPerWeek);
    for (let i = 0; i < days; i++) d.endDay();
    const next = d.state.towns[town.id]!.workshop!;
    expect(next.week).toBe(week + 1);
    expect(next.stock.filter(Boolean)).toHaveLength(4);
  });

  it('sells nothing in The Three Beacons (expanded content off there)', () => {
    const d = GameDriver.mission('three_beacons_m01');
    expect(workshopPool(d.catalog, ['treasure'], d.state)).toEqual([]);
    for (const t of Object.values(d.state.towns)) expect(t.workshop ?? null).toBeNull();
  });
});
