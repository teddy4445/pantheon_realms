import { describe, expect, it } from 'vitest';
import { GameDriver, navalDriver, cellIn } from '@pr/testing';
import { quoteCampRecruitment, quoteRecruitment, quoteRecruitBatch, resources, canonicalStateHash, liveCampReservation, type SiteDefinition } from '../src';

describe('Library recruitment discounts', () => {
  it('quotes capped single-order savings and MAX exactly, then shares one daily purchase across the empire', () => {
    const d = GameDriver.mission('three_beacons_m01');
    d.state.scenario.features = { ...d.state.scenario.features!, mythicLibraryV2: true };
    d.hero().equipment.misc_1 = { instanceId: 'key', artifactId: 'relic2_inari_rice_key' };
    d.town('asterion').population.hoplite = 100;
    d.state.players.player!.wallet = resources({ gold: 540 });
    const target = { kind: 'hero' as const, heroId: 'alexios' };
    const quote = quoteRecruitment(d.catalog, d.state, 'player', 'asterion', 'hoplite', 10, target);
    expect(quote.maxQuantity).toBe(10);
    expect(quote.totalCost.gold).toBe(540);
    expect(quoteRecruitment(d.catalog, d.state, 'player', 'asterion', 'hoplite', 100, target).totalCost.gold).toBe(5850);
    d.do({ kind: 'RecruitUnits', townId: 'asterion', creatureId: 'hoplite', quantity: 10, destination: target });
    d.state = JSON.parse(JSON.stringify(d.state));
    d.state.players.player!.wallet.gold = 10000;
    expect(quoteRecruitment(d.catalog, d.state, 'player', 'asterion', 'hoplite', 10, target).totalCost.gold).toBe(600);
  });
  it('applies the first eligible batch line only and commits the exact displayed total', () => {
    const d = GameDriver.mission('three_beacons_m01');
    d.state.scenario.features = { ...d.state.scenario.features!, mythicLibraryV2: true };
    d.hero().equipment.misc_1 = { instanceId: 'key', artifactId: 'relic2_inari_rice_key' };
    d.town('asterion').buildings.dwelling_t2 = 1;
    d.town('asterion').population = { hoplite: 14, peltast: 9 };
    d.state.players.player!.wallet = resources({ gold: 10000 });
    const destination = { kind: 'hero' as const, heroId: 'alexios' }, items = [{ creatureId: 'hoplite', quantity: 14 }, { creatureId: 'peltast', quantity: 9 }];
    const q = quoteRecruitBatch(d.catalog, d.state, 'player', 'asterion', items, destination);
    expect(q.lines.map((l) => l.totalCost.gold)).toEqual([756, 900]);
    d.do({ kind: 'RecruitBatch', townId: 'asterion', items, destination });
    expect(d.state.players.player!.wallet.gold).toBe(10000 - q.totalCost.gold);
  });
  it('reserves a one-purchase compact discount without creating creatures or changing other prices', () => {
    const d = navalDriver();
    d.state.scenario.features = { ...d.state.scenario.features!, mythicLibraryV2: true };
    const hero = d.state.heroes.leader_1!, coord = cellIn(d.state, 5, 5);
    hero.position = coord; hero.spellbook = true; hero.knownSpellIds = ['spell2_maizebound_compact']; hero.mana = 20;
    d.state.customMission = { ...d.state.customMission!, sites: [...d.state.customMission!.sites, { id: 'library-camp', name: 'Open camp', coord, kind: { type: 'creature_camp', creatureId: 'hoplite', initialStock: 100, weeklyGrowth: 7 } } as never] };
    d.state.world.sites['library-camp'] = { siteId: 'library-camp', owner: null, cleared: true, claimed: false, activated: false, visitedBy: ['player'], open: true, guard: null, stock: 100 };
    d.state.players.player!.wallet = resources({ gold: 10000 });
    d.do({ kind: 'CastAdventureSpell', heroId: hero.id, spellId: 'spell2_maizebound_compact', target: coord });
    expect(d.state.world.sites['library-camp']!.stock).toBe(100);
    expect(d.state.players.player!.wallet.gold).toBe(10000);
    const q = quoteCampRecruitment(d.catalog, d.state, 'player', hero.id, 'library-camp', 100);
    expect(q.totalCost.gold).toBe(5800);
    d.do({ kind: 'RecruitFromCamp', heroId: hero.id, siteId: 'library-camp', quantity: 10 });
    expect(d.state.players.player!.wallet.gold).toBe(9490);
    expect(d.state.world.sites['library-camp']!.stock).toBe(90);
    expect(quoteCampRecruitment(d.catalog, d.state, 'player', hero.id, 'library-camp', 10).totalCost.gold).toBe(600);
  });
});


describe('Inari guest stock reservation', () => {
  function camp() {
    const d = navalDriver();
    d.state.scenario.features = { ...d.state.scenario.features!, mythicLibraryV2: true, interventions: true };
    const h = d.state.heroes.leader_1!, coord = cellIn(d.state, 5, 5);
    h.position = coord;
    const p = d.state.players[h.ownerId]!; p.pantheonId = 'japanese'; p.pantheon.patronGodId = 'japanese_inari'; p.wallet = resources({ gold: 10000, favor: 100 });
    const site: SiteDefinition = { id: 'reservation-camp', anchorId: '', name: 'Guest camp', description: '', coord, kind: { type: 'creature_camp', creatureId: 'hoplite', initialStock: 20, weeklyGrowth: 7 } };
    d.state.customMission = { ...d.state.customMission!, sites: [...d.state.customMission!.sites, site] };
    d.state.world.sites[site.id] = { siteId: site.id, owner: null, cleared: true, claimed: false, activated: false, visitedBy: [h.ownerId], open: true, guard: null, stock: 20 };
    const other = { ...structuredClone(h), id: 'guest-2', name: 'Second guest' }; d.state.heroes[other.id] = other;
    const command = { kind: 'InvokeIntervention' as const, interventionId: 'blessing2_inari_guest_right', heroId: h.id, siteId: site.id };
    return { d, h, site, other, command };
  }
  it('holds only one week of existing stock, charges normal recruitment and never deletes another hero’s reserved creatures', () => {
    const { d, h, site, other, command } = camp();
    d.do(command);
    expect(d.state.world.sites[site.id]!.stock).toBe(20);
    expect(d.state.players[h.ownerId]!.wallet.gold).toBe(10000);
    d.state = JSON.parse(JSON.stringify(d.state));
    expect(quoteCampRecruitment(d.catalog, d.state, h.ownerId, h.id, site.id, 1).available).toBe(20);
    expect(quoteCampRecruitment(d.catalog, d.state, h.ownerId, other.id, site.id, 1).available).toBe(13);
    d.do({ kind: 'RecruitFromCamp', heroId: other.id, siteId: site.id, quantity: 13 });
    expect(d.state.world.sites[site.id]!.stock).toBe(7);
    d.reject({ kind: 'RecruitFromCamp', heroId: other.id, siteId: site.id, quantity: 1 });
    d.do({ kind: 'RecruitFromCamp', heroId: h.id, siteId: site.id, quantity: 7 });
    expect(d.state.world.sites[site.id]!.stock).toBe(0);
    expect(d.state.world.sites[site.id]!.reservation).toBeUndefined();
    expect(d.state.players[h.ownerId]!.wallet.gold).toBe(8800);
  });
  it('releases the hold at dawn, defeat or capture, and refuses a locked pact before charging', () => {
    const { d, h, site, other, command } = camp();
    const def = d.state.customMission!.sites.find((x) => x.id === site.id)!;
    (def.kind as { requiresFlag?: string }).requiresFlag = 'open-pact';
    const before = canonicalStateHash(d.state); d.reject(command); expect(canonicalStateHash(d.state)).toBe(before);
    d.state.mission.flags['open-pact'] = true; d.do(command);
    d.state.heroes[h.id]!.status = 'defeated'; expect(liveCampReservation(d.state, site.id)).toBeNull();
    expect(quoteCampRecruitment(d.catalog, d.state, h.ownerId, other.id, site.id, 1).available).toBe(20);
    d.state.heroes[h.id]!.status = 'active'; d.state.world.sites[site.id]!.owner = h.ownerId;
    expect(liveCampReservation(d.state, site.id)).toBeNull();
    d.state.world.sites[site.id]!.owner = null;
    d.do({ kind: 'EndTurn' }); d.do({ kind: 'EndTurn' });
    expect(liveCampReservation(d.state, site.id)).toBeNull();
  });
});
