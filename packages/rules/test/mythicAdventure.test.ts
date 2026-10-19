import { describe, expect, it } from 'vitest';
import { navalDriver, cellIn } from '@pr/testing';
import { adventureSpellsOf, canonicalStateHash, quoteAdventureSpell, quoteMovement, visibleLibrarySignals, cellIndex, type SiteDefinition, type EquipSlot } from '../src';
import { heroSailCost } from '../src/resolvers/libraryAdventure';

function setup(items: string[] = []) {
  const d = navalDriver();
  d.state.scenario.features = { ...d.state.scenario.features!, mythicLibraryV2: true };
  const h = d.state.heroes.leader_1!;
  h.position = cellIn(d.state, 6, 5); h.mana = 30; h.attributes.knowledge = 10; h.spellbook = true;
  h.knownSpellIds = ['spell2_skalds_camp', 'spell2_well_remembering', 'spell2_ehecatls_boatcall'];
  items.forEach((id, i) => { h.equipment[`misc_${i + 1}` as EquipSlot] = { instanceId: `item-${i}`, artifactId: id }; });
  return { d, h };
}
function dawn(d: ReturnType<typeof navalDriver>) { d.do({ kind: 'EndTurn' }); d.do({ kind: 'EndTurn' }); }

describe('Mythic Library adventure travel and daily quotas', () => {
  it('keeps new spells out of old saves even when known', () => {
    const { d, h } = setup();
    d.state.scenario.features!.mythicLibraryV2 = false;
    expect(adventureSpellsOf(d.catalog, d.state, h.id)).toEqual([]);
    expect(quoteAdventureSpell(d.catalog, d.state, h.ownerId, h.id, 'spell2_skalds_camp', null).legal).toBe(false);
  });
  it('ends movement to camp and pays the promised mana once at dawn after reload', () => {
    const { d, h } = setup();
    d.do({ kind: 'CastAdventureSpell', heroId: h.id, spellId: 'spell2_skalds_camp', target: h.position });
    expect(d.state.heroes[h.id]!.movementPoints).toBe(0);
    expect(d.state.heroes[h.id]!.mana).toBe(26);
    d.reject({ kind: 'CastAdventureSpell', heroId: h.id, spellId: 'spell2_skalds_camp', target: h.position });
    d.state = JSON.parse(JSON.stringify(d.state));
    dawn(d);
    expect(d.state.heroes[h.id]!.mana).toBe(36 + d.catalog.rulesProfile.dawnManaRegen);
    expect(d.state.heroes[h.id]!.libraryAdventure?.camp).toBeUndefined();
    const mana = d.state.heroes[h.id]!.mana;
    dawn(d);
    expect(d.state.heroes[h.id]!.mana).toBe(mana + d.catalog.rulesProfile.dawnManaRegen);
  });
  it('does not reward a camp interrupted by battle or a hearthclasp after movement', () => {
    const { d, h } = setup(['relic2_hestia_hearthclasp']);
    h.libraryAdventure = { lastMovedDay: d.state.day };
    d.do({ kind: 'CastAdventureSpell', heroId: h.id, spellId: 'spell2_skalds_camp', target: h.position });
    d.state.heroes[h.id]!.libraryAdventure!.camp!.battleSinceCast = true;
    dawn(d);
    expect(d.state.heroes[h.id]!.mana).toBe(26 + d.catalog.rulesProfile.dawnManaRegen);
    dawn(d);
    expect(d.state.heroes[h.id]!.mana).toBe(34 + 2 * d.catalog.rulesProfile.dawnManaRegen);
  });
  it('prices mark and return independently, discounts only the first two casts, and spends no mana on an occupied anchor', () => {
    const { d, h } = setup(['relic2_thoth_inkwell']);
    const id = 'spell2_well_remembering', anchor = { ...h.position };
    expect(quoteAdventureSpell(d.catalog, d.state, h.ownerId, h.id, id, null).manaCost).toBe(4);
    d.do({ kind: 'CastAdventureSpell', heroId: h.id, spellId: id, target: h.position });
    d.do({ kind: 'MoveHero', heroId: h.id, destination: cellIn(d.state, 7, 5) });
    d.state.heroes.leader_2!.position = anchor;
    const before = canonicalStateHash(d.state);
    d.reject({ kind: 'CastAdventureSpell', heroId: h.id, spellId: id, target: anchor });
    expect(canonicalStateHash(d.state)).toBe(before);
    d.state.heroes.leader_2!.position = cellIn(d.state, 25, 5);
    d.state = JSON.parse(JSON.stringify(d.state));
    expect(quoteAdventureSpell(d.catalog, d.state, h.ownerId, h.id, id, null).manaCost).toBe(8);
    d.do({ kind: 'CastAdventureSpell', heroId: h.id, spellId: id, target: anchor });
    expect(d.state.heroes[h.id]!.position).toEqual(anchor);
    expect(d.state.heroes[h.id]!.movementPoints).toBe(0);
    expect(d.state.heroes[h.id]!.mana).toBe(18);
    expect(quoteAdventureSpell(d.catalog, d.state, h.ownerId, h.id, 'spell2_skalds_camp', null).manaCost).toBe(4);
  });
  it('calls only an owned empty ship across known vacant water and never copies it', () => {
    const { d, h } = setup();
    h.position = cellIn(d.state, 9, 5);
    const ship = d.state.world.ships!.map_ship_free!;
    ship.coord = cellIn(d.state, 13, 5);
    const cast = { kind: 'CastAdventureSpell' as const, heroId: h.id, spellId: 'spell2_ehecatls_boatcall', target: { ...ship.coord } };
    d.reject(cast); // Neutral vessels must first be claimed normally.
    ship.ownerId = h.ownerId;
    const blocked = cellIn(d.state, 12, 5);
    d.state.fog[h.ownerId]!.explored.fill(0);
    for (const c of [ship.coord, cellIn(d.state, 11, 5), cellIn(d.state, 10, 5)]) d.state.fog[h.ownerId]!.explored[c.r * d.state.world.map.width + c.q] = 1;
    d.reject(cast); // No blind crossing of the unknown gap.
    d.state.fog[h.ownerId]!.explored[blocked.r * d.state.world.map.width + blocked.q] = 1;
    const before = h.movementPoints;
    const events = d.do(cast);
    expect(Object.keys(d.state.world.ships!)).toHaveLength(1);
    expect(d.state.world.ships!.map_ship_free!.coord).toEqual(cellIn(d.state, 10, 5));
    expect(d.state.heroes[h.id]!.position).toEqual(cellIn(d.state, 9, 5));
    expect(d.state.heroes[h.id]!.movementPoints).toBe(before);
    expect(events.some((e) => e.kind === 'EmptyShipCalled')).toBe(true);
    d.reject(cast);
  });
  it('sailing prices use the same capped discounts in paths and committed movement', () => {
    const { d, h } = setup(['relic2_aeolus_windbag', 'relic2_hoori_tide_pearl']);
    const ship = d.state.world.ships!.map_ship_free!;
    h.position = cellIn(d.state, 9, 8);
    d.do({ kind: 'EmbarkHero', heroId: h.id, shipId: ship.shipId });
    d.state.heroes[h.id]!.movementPoints = 1000;
    const target = cellIn(d.state, 12, 8);
    const q = quoteMovement(d.catalog, d.state, h.id, target);
    expect(heroSailCost(d.catalog, d.state, d.state.heroes[h.id]!)).toBe(75);
    expect(q.totalCost).toBe(150);
    d.do({ kind: 'MoveHero', heroId: h.id, destination: target });
    expect(d.state.heroes[h.id]!.movementPoints).toBe(850);
  });
});


describe('Library scouting snapshots', () => {
  it('records known resource types without owners, guards or unexplored sites, and expires after reload', () => {
    const { d, h } = setup();
    h.knownSpellIds.push('spell2_scribes_survey');
    const sites: SiteDefinition[] = [
      { id: 'known', anchorId: '', name: 'SECRET NAME', description: '', coord: cellIn(d.state, 7, 5), kind: { type: 'resource_site', siteType: 'gold_mine', resource: 'gold', dailyYield: 500 } },
      { id: 'unknown', anchorId: '', name: 'Unknown', description: '', coord: cellIn(d.state, 8, 5), kind: { type: 'resource_site', siteType: 'quarry', resource: 'stone', dailyYield: 2 } },
      { id: 'concealed', anchorId: '', name: 'Concealed', description: '', coord: cellIn(d.state, 7, 6), markerHiddenUntilRevealed: true, kind: { type: 'resource_site', siteType: 'sawmill', resource: 'wood', dailyYield: 2 } },
    ];
    d.state.customMission = { ...d.state.customMission!, sites };
    d.state.fog[h.ownerId]!.explored[cellIndex(d.state.world.map, sites[1]!.coord)] = 0;
    const fog = JSON.stringify(d.state.fog);
    d.do({ kind: 'CastAdventureSpell', heroId: h.id, spellId: 'spell2_scribes_survey', target: h.position });
    const reports = d.state.heroes[h.id]!.libraryAdventure!.reports!;
    expect(reports[0]!.entries).toHaveLength(1);
    expect(reports[0]!.entries[0]!.label).toBe('gold mine');
    expect(JSON.stringify(reports)).not.toContain('SECRET NAME');
    expect(JSON.stringify(d.state.fog)).toBe(fog);
    d.state = JSON.parse(JSON.stringify(d.state)); dawn(d);
    expect(d.state.heroes[h.id]!.libraryAdventure!.reports).toHaveLength(1);
    dawn(d); expect(d.state.heroes[h.id]!.libraryAdventure!.reports).toHaveLength(0);
  });
  it('does not spend mana on an invalid omen or expose a hidden roaming army', () => {
    const { d, h } = setup(); h.knownSpellIds.push('spell2_crossroads_omen');
    const before = canonicalStateHash(d.state);
    d.reject({ kind: 'CastAdventureSpell', heroId: h.id, spellId: 'spell2_crossroads_omen', target: cellIn(d.state, 7, 5) });
    expect(canonicalStateHash(d.state)).toBe(before);
  });
  it('stores a neutral guard strength band without counts and never resolves the encounter', () => {
    const { d, h } = setup(); h.knownSpellIds.push('spell2_crossroads_omen');
    const coord = cellIn(d.state, 7, 5);
    const site: SiteDefinition = { id: 'omen-guard', anchorId: '', name: 'Pass keepers', description: '', coord, kind: { type: 'crossing' }, guard: { required: true, army: [{ creatureId: 'hoplite', count: 123 }], reward: {}, battlefield: 'open_field', label: 'Keepers' } };
    d.state.customMission = { ...d.state.customMission!, sites: [site] };
    d.state.world.sites[site.id] = { siteId: site.id, owner: null, cleared: false, claimed: false, activated: false, visitedBy: [], open: true, guard: null };
    d.do({ kind: 'CastAdventureSpell', heroId: h.id, spellId: 'spell2_crossroads_omen', target: coord });
    const report = JSON.stringify(d.state.heroes[h.id]!.libraryAdventure!.reports);
    expect(report).toContain('Will stand and fight'); expect(report).not.toContain('123'); expect(report).not.toContain('hoplite');
    expect(d.state.world.sites[site.id]!.cleared).toBe(false); expect(d.state.battle).toBeNull();
  });
});


describe('Foxfire diversion', () => {
  it('places no army, changes no fog or occupancy, identifies nearby and expires after two dawns', () => {
    const { d, h } = setup(); const id = 'spell2_foxfire_diversion'; h.knownSpellIds.push(id);
    const target = cellIn(d.state, 8, 5), fog = JSON.stringify(d.state.fog), heroes = Object.keys(d.state.heroes);
    const before = quoteMovement(d.catalog, d.state, h.id, target);
    d.do({ kind: 'CastAdventureSpell', heroId: h.id, spellId: id, target });
    expect(d.state.heroes[h.id]!.mana).toBe(20); expect(JSON.stringify(d.state.fog)).toBe(fog); expect(Object.keys(d.state.heroes)).toEqual(heroes);
    expect(quoteMovement(d.catalog, d.state, h.id, target).totalCost).toBe(before.totalCost);
    const rival = d.state.heroes.leader_2!; rival.position = cellIn(d.state, 7, 5);
    expect(visibleLibrarySignals(d.catalog, d.state, rival.ownerId)[0]?.identified).toBe(true);
    d.state = JSON.parse(JSON.stringify(d.state)); dawn(d); expect(d.state.world.signals).toHaveLength(1); dawn(d); expect(d.state.world.signals).toHaveLength(0);
  });
  it('rejects unknown and distant cells atomically', () => {
    const { d, h } = setup(); h.knownSpellIds.push('spell2_foxfire_diversion');
    const before = canonicalStateHash(d.state);
    d.reject({ kind: 'CastAdventureSpell', heroId: h.id, spellId: 'spell2_foxfire_diversion', target: cellIn(d.state, 24, 5) });
    expect(canonicalStateHash(d.state)).toBe(before);
  });
});
