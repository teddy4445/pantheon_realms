/**
 * Coastal sites and sea salvage in map documents and the naval templates (sea-sites kit 2026-10-17):
 * the custom-map kinds (parse / serialize round trip, placement reasons for illegal tiles, reach by
 * ship, compile with values drawn once), and the naval templates' lookouts, wrecks and salvage (equal
 * per seat, the new checks NAV-18 – NAV-21 catching deliberately broken maps, wrecks blocking routes)
 * while the nine land layouts never get them.
 */
import { describe, expect, it } from 'vitest';
import { buildCatalog } from '@pr/content';
import { TERRAIN_CODES, axialDistance, axialNeighbors, hexKey, terrainAt as mapTerrainAt, type CustomMapDocument, type CustomSite, type HexCoord, type MissionDefinition } from '@pr/rules';
import {
  SKIRMISH_MAP_TYPES,
  compileCustomMap,
  customRowOffset,
  generateSkirmish,
  navalTemplate,
  newCustomMap,
  parseCustomMap,
  seaSiteCustomProblem,
  serializeCustomMap,
  validateCustomMap,
  validateNavalMap,
  type NavalMapType,
} from '../src';

const catalog = buildCatalog();
const cellOf = (doc: Pick<CustomMapDocument, 'height'>, x: number, y: number): HexCoord => ({ q: x - Math.floor(y / 2) + customRowOffset(doc.height), r: y });

/** Two islands (columns 0-9, 20-29) and a sea (10-19); towns at 9,12 and 20,12; a neutral ship at 10,8. */
function doc(sites: (d: CustomMapDocument) => CustomSite[] = () => [], edit?: (d: CustomMapDocument) => CustomMapDocument): CustomMapDocument {
  let d = newCustomMap(catalog, 'small', 'Sea Test');
  const t = d.terrain.split('');
  for (let y = 0; y < 24; y++) for (let x = 10; x <= 19; x++) {
    const c = cellOf(d, x, y);
    t[c.r * d.width + c.q] = TERRAIN_CODES.water;
  }
  d = { ...d, terrain: t.join('') };
  if (edit) d = edit(d);
  const at = (id: string, kind: CustomSite['kind'], x: number, y: number, extra: Partial<CustomSite> = {}): CustomSite => ({ id, kind, ...cellOf(d, x, y), ...extra });
  return { ...d, players: [{ pantheonId: 'greek' }, { pantheonId: 'norse' }], sites: [at('town_a', 'town', 9, 12, { owner: 0 }), at('town_b', 'town', 20, 12, { owner: 1 }), ...sites(d)], ships: [{ id: 'free', ...cellOf(d, 10, 8) }] };
}
const at = (d: CustomMapDocument, id: string, kind: CustomSite['kind'], x: number, y: number, extra: Partial<CustomSite> = {}): CustomSite => ({ id, kind, ...cellOf(d, x, y), ...extra });
const errors = (d: CustomMapDocument) => validateCustomMap(catalog, d).filter((i) => i.severity === 'error');

describe('custom maps: the three sea-site kinds', () => {
  const full = doc((d) => [
    at(d, 'tower', 'coastal_watchtower', 9, 4, { name: 'Gull Point' }),
    at(d, 'wood', 'sea_pickup', 13, 5, { resource: 'wood' }),
    at(d, 'gold', 'sea_pickup', 15, 5, { resource: 'gold', amount: 400 }),
    at(d, 'wreck', 'shipwreck', 15, 16, { outcome: 'rare_cache', skin: 'split_hull' }),
  ]);

  it('a legal map validates; export and import keep every sea-site field', () => {
    expect(errors(full)).toEqual([]);
    const parsed = parseCustomMap(serializeCustomMap(full));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.doc.sites).toEqual(full.sites);
    // A second round trip changes nothing (the first fills the document's defaults).
    const again = parseCustomMap(serializeCustomMap(parsed.doc));
    expect(again.ok && serializeCustomMap(again.doc)).toBe(serializeCustomMap(parsed.doc));
  });

  it('refuses damaged sea-site fields on import', () => {
    const bad = JSON.parse(serializeCustomMap(full)) as { sites: Record<string, unknown>[] };
    bad.sites.find((s) => s['id'] === 'wood')!['resource'] = 'crystal';
    expect(parseCustomMap(JSON.stringify(bad)).ok).toBe(false);
    const bad2 = JSON.parse(serializeCustomMap(full)) as { sites: Record<string, unknown>[] };
    bad2.sites.find((s) => s['id'] === 'wreck')!['outcome'] = 'kraken';
    expect(parseCustomMap(JSON.stringify(bad2)).ok).toBe(false);
  });

  it('compiles with every unset value drawn once (the same map, the same draw) and the set ones kept', () => {
    const a = compileCustomMap(catalog, full, [{ controller: 'human' }, { controller: 'ai' }]).mission;
    const b = compileCustomMap(catalog, full, [{ controller: 'human' }, { controller: 'ai' }]).mission;
    const of = (m: MissionDefinition, id: string) => m.sites.find((s) => s.id === id)!;
    for (const id of ['tower', 'wood', 'gold', 'wreck']) expect(of(a, id)).toEqual(of(b, id));
    expect(of(a, 'tower')).toMatchObject({ name: 'Gull Point', kind: { type: 'coastal_watchtower', radius: 6 } });
    expect(of(a, 'gold').kind).toEqual({ type: 'sea_pickup', resource: 'gold', amount: 400 });
    const w = of(a, 'wood').kind;
    expect(w.type === 'sea_pickup' && w.amount >= 3 && w.amount <= 6).toBe(true);
    const wr = of(a, 'wreck').kind;
    expect(wr.type === 'shipwreck' && wr.skin === 'split_hull' && wr.outcome.kind === 'rare_cache' && !!wr.outcome.artifactId && wr.outcome.guard!.army.length === 2).toBe(true);
    expect(a.helpTopics.some((t) => t.id === 'sea_sites')).toBe(true);
  });

  it('gives the reason for every illegal tile (the editor shows it)', () => {
    const d = doc();
    const why = (kind: CustomSite['kind'], x: number, y: number) => seaSiteCustomProblem(d, { id: 'probe', kind, ...cellOf(d, x, y) });
    expect(why('coastal_watchtower', 13, 4)).toMatch(/not on the water/);
    expect(why('coastal_watchtower', 4, 4)).toMatch(/beside the sea/);
    expect(why('coastal_watchtower', 9, 4)).toBeNull();
    expect(why('sea_pickup', 5, 5)).toMatch(/on the water/);
    expect(why('sea_pickup', 10, 12)).toMatch(/harbor/);
    expect(why('sea_pickup', 10, 8)).toMatch(/ship/);
    expect(why('sea_pickup', 14, 5)).toBeNull();
    expect(why('shipwreck', 3, 3)).toMatch(/on the water/);
    expect(why('shipwreck', 11, 12)).toMatch(/harbor/);
    expect(why('shipwreck', 11, 8)).toMatch(/ship/);
    expect(why('shipwreck', 15, 16)).toBeNull();
    // A one-hex strait: a wreck there would cut the sea.
    const strait = doc(
      () => [],
      (x) => {
        const t = x.terrain.split('');
        for (let col = 10; col <= 19; col++) {
          if (col === 15) continue;
          const c = cellOf(x, col, 18);
          t[c.r * x.width + c.q] = TERRAIN_CODES.plains;
        }
        return { ...x, terrain: t.join('') };
      },
    );
    expect(seaSiteCustomProblem(strait, { id: 'w', kind: 'shipwreck', ...cellOf(strait, 15, 18) })).toMatch(/approach|cut the sea/);
    // Next to another wreck, or salvage in a wreck's approach.
    const two = doc((x) => [at(x, 'w1', 'shipwreck', 15, 16)]);
    expect(seaSiteCustomProblem(two, { id: 'w2', kind: 'shipwreck', ...axialNeighbors(cellOf(two, 15, 16))[0]! })).toMatch(/wreck/);
    expect(seaSiteCustomProblem(two, { id: 'p', kind: 'sea_pickup', ...axialNeighbors(cellOf(two, 15, 16))[3]! })).toMatch(/wreck/);
  });

  it('validation lists an illegal sea site as an error with its reason; a water site needs a sea reached from Empire 1', () => {
    const bad = doc((d) => [at(d, 'pick', 'sea_pickup', 5, 5, { resource: 'stone' })]);
    expect(errors(bad).map((e) => e.text).join(' ')).toMatch(/Floating Salvage: Floating salvage lies on the water/);
    // A lake in the west island, touching no land Empire 1 reaches? (it is reached: the island is walkable all round).
    const lake = doc(
      (d) => [at(d, 'lakewreck', 'sea_pickup', 4, 20, { resource: 'gold' })],
      (x) => {
        const t = x.terrain.split('');
        // A pond ringed by mountains: no shore anybody walks to.
        for (const [cx, cy] of [[4, 20]]) {
          const c0 = cellOf(x, cx!, cy!);
          const ring: HexCoord[] = [];
          for (let dq = -3; dq <= 3; dq++) for (let dr = Math.max(-3, -dq - 3); dr <= Math.min(3, -dq + 3); dr++) ring.push({ q: c0.q + dq, r: c0.r + dr });
          for (const c of ring) t[c.r * x.width + c.q] = axialDistance(c, c0) <= 2 ? TERRAIN_CODES.water : TERRAIN_CODES.mountain;
        }
        return { ...x, terrain: t.join('') };
      },
    );
    expect(errors(lake).map((e) => e.text).join(' ')).toMatch(/cannot be reached from Empire 1’s town by ship/);
  });
});

describe('naval templates: lookouts, wrecks and salvage', () => {
  const pool = ['greek', 'norse', 'egyptian', 'japanese', 'celtic', 'mesoamerican'];
  const gen = (mapType: NavalMapType, n: number, seed: number) =>
    generateSkirmish(catalog, { seed, size: 'huge', seats: pool.slice(0, n).map((pantheonId) => ({ pantheonId, controller: 'ai' as const })), victory: navalTemplate(mapType).defaultVictory, monsters: 'few', mapType });
  const kindsOf = (m: MissionDefinition, type: string) => m.sites.filter((s) => s.kind.type === type);

  it('Shattered Crown: a lookout on every home island and inner island, a wreck between the inner islands, five salvage per region', () => {
    const g = gen('shattered_crown', 3, 777);
    expect(g.checks.filter((c) => !c.pass)).toEqual([]);
    expect(kindsOf(g.mission, 'coastal_watchtower').filter((s) => s.id.startsWith('lookout_home_'))).toHaveLength(6);
    expect(kindsOf(g.mission, 'coastal_watchtower').filter((s) => s.id.startsWith('lookout_inner_'))).toHaveLength(6);
    expect(kindsOf(g.mission, 'shipwreck')).toHaveLength(6);
    expect(kindsOf(g.mission, 'sea_pickup')).toHaveLength(30);
    // Equal per seat: the same resources, amounts and wreck outcome.
    const seat = (i: number) =>
      g.mission.sites
        .filter((s) => s.id.endsWith(`_${i}`) && ['coastal_watchtower', 'sea_pickup', 'shipwreck'].includes(s.kind.type))
        .map((s) => `${s.id.slice(0, -2)}:${JSON.stringify(s.kind)}`)
        .sort();
    expect(seat(2)).toEqual(seat(1));
    expect(seat(3)).toEqual(seat(1));
  });

  it('Serpent Straits: a lookout on each curved island, a wreck off each flank, equal salvage; the outer bypass partly unwatched', () => {
    const g = gen('serpent_straits', 2, 99);
    expect(g.checks.filter((c) => !c.pass)).toEqual([]);
    expect(kindsOf(g.mission, 'coastal_watchtower').filter((s) => s.id.startsWith('lookout_straits_'))).toHaveLength(2);
    expect(kindsOf(g.mission, 'shipwreck')).toHaveLength(2);
    expect(kindsOf(g.mission, 'sea_pickup')).toHaveLength(10);
    expect(g.checks.find((c) => c.id === 'NAV-21')!.detail).toMatch(/out of tower sight/);
    expect(g.mission.navalPolicy?.template.version).toBe(2);
  });

  it('the new checks catch broken placements: salvage beside land, a lookout over a rival harbor, unequal salvage', () => {
    const g = gen('shattered_crown', 2, 4242);
    const shift = (siteId: string, to: HexCoord): MissionDefinition => ({ ...g.mission, sites: g.mission.sites.map((s) => (s.id === siteId ? { ...s, coord: to } : s)) });
    const fails = (m: MissionDefinition) => validateNavalMap(catalog, g.map, m, navalTemplate('shattered_crown')).filter((c) => !c.pass).map((c) => c.id);
    // Salvage beside land.
    const salvage = g.mission.sites.find((s) => s.id === 'salvage_wood_near_1')!;
    const town = g.mission.sites.find((s) => s.id === 'site_town_1')!;
    const coastWater = axialNeighbors(town.coord).find((n) => mapTerrainAt(g.map, n) === 'water')!;
    expect(fails(shift(salvage.id, coastWater))).toContain('NAV-18');
    // A lookout moved beside the rival's harbor.
    const rival = g.mission.sites.find((s) => s.id === 'site_town_2')!;
    const shore = axialNeighbors(rival.coord).find((n) => mapTerrainAt(g.map, n) !== 'water' && !g.mission.sites.some((s) => hexKey(s.coord) === hexKey(n)))!;
    expect(fails(shift('lookout_home_1', shore))).toContain('NAV-19');
    // Unequal salvage between the seats.
    const richer: MissionDefinition = { ...g.mission, sites: g.mission.sites.map((s) => (s.id === 'salvage_gold_near_2' && s.kind.type === 'sea_pickup' ? { ...s, kind: { ...s.kind, amount: s.kind.amount + 25 } } : s)) };
    expect(fails(richer)).toContain('NAV-14');
  });

  it('the nine land layouts never get sea sites', () => {
    for (const t of SKIRMISH_MAP_TYPES) {
      const g = generateSkirmish(catalog, { seed: 5, size: 'small', seats: [{ pantheonId: 'greek', controller: 'ai' }, { pantheonId: 'norse', controller: 'ai' }], victory: { type: 'elimination' }, monsters: 'few', mapType: t.id });
      expect(g.mission.sites.filter((s) => ['coastal_watchtower', 'sea_pickup', 'shipwreck'].includes(s.kind.type))).toEqual([]);
    }
  });
});
