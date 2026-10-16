/**
 * Custom maps, campaign expansion sites (handoff 2026-10-15): neutral hiring
 * sites (finite weekly stock from content, habitat warnings), sluices (channel,
 * closed/open ground, the connectivity check in both states), ferry landing
 * pairs and supply depots — parsed, validated and compiled as optional data, with
 * older documents unchanged.
 */
import { describe, expect, it } from 'vitest';
import { buildCatalog, validateGeneratedMission, NEUTRAL_V2_HABITATS, NEUTRAL_V2_SITE_STOCK } from '@pr/content';
import { hexKey, TERRAIN_CODES, type HexCoord, type NeutralSiteTable } from '@pr/rules';
import {
  compileCustomMap,
  createGeneratedMatch,
  createRandomSkirmish,
  customHabitatVerdict,
  customMapFromGenerated,
  customRowOffset,
  customSluiceConnectivity,
  newCustomMap,
  parseCustomMap,
  serializeCustomMap,
  validateCustomMap,
  CUSTOM_SITE_KINDS,
  SUPPLY_DEPOT_REWARD,
  type CustomMapDocument,
  type CustomSite,
} from '../src';

const catalog = buildCatalog();
const TABLE: NeutralSiteTable = { habitats: NEUTRAL_V2_HABITATS, stock: NEUTRAL_V2_SITE_STOCK };
const SEATS = [{ controller: 'human' as const }, { controller: 'ai' as const }];

/** Axial cell of rectangle column x, row y. */
const cell = (doc: CustomMapDocument, x: number, y: number): HexCoord => ({ q: x - Math.floor(y / 2) + customRowOffset(doc.height), r: y });

function paint(doc: CustomMapDocument, cells: readonly HexCoord[], code: string): CustomMapDocument {
  const t = doc.terrain.split('');
  for (const c of cells) t[c.r * doc.width + c.q] = code;
  return { ...doc, terrain: t.join('') };
}

const at = (doc: CustomMapDocument, id: string, kind: CustomSite['kind'], x: number, y: number, extra: Partial<CustomSite> = {}): CustomSite => ({ id, kind, ...cell(doc, x, y), ...extra });

/**
 * A small temperate map split north–south by a river two hexes wide (columns 15–16).
 * Empire 1 lives west of it, Empire 2 east. The sluice on the west bank controls the
 * river's hexes in rows 11–13: closed they are water, open they are marsh (a ford).
 */
function riverMap(extra: (doc: CustomMapDocument) => CustomSite[] = () => []): CustomMapDocument {
  let doc = newCustomMap(catalog, 'small', 'Sluice Test');
  const river: HexCoord[] = [];
  for (let y = 0; y < doc.height; y++) river.push(cell(doc, 15, y), cell(doc, 16, y));
  doc = paint(doc, river, TERRAIN_CODES.water);
  const channel = [11, 12, 13].flatMap((y) => [cell(doc, 15, y), cell(doc, 16, y)]);
  return {
    ...doc,
    players: [{ pantheonId: 'greek' }, { pantheonId: 'norse' }],
    sites: [at(doc, 'town_a', 'town', 5, 12, { owner: 0 }), at(doc, 'town_b', 'town', 25, 12, { owner: 1 }), at(doc, 'sluice_1', 'sluice', 14, 12, { channel }), ...extra(doc)],
  };
}

describe('custom maps: campaign expansion sites', () => {
  it('lists the four new site kinds for the editor palette, apart from the classic ones', () => {
    expect(CUSTOM_SITE_KINDS.filter((k) => k.palette === 'neutral').map((k) => k.id)).toEqual(['neutral_dwelling']);
    expect(CUSTOM_SITE_KINDS.filter((k) => k.palette === 'landmark').map((k) => k.id)).toEqual(['sluice', 'ferry', 'supply_depot']);
    expect(CUSTOM_SITE_KINDS.filter((k) => !k.palette)).toHaveLength(21);
  });

  it('older documents load and compile unchanged (the shipped skirmish maps, with and without the neutral table)', () => {
    for (const m of Object.values(catalog.skirmishMaps ?? {})) {
      const text = serializeCustomMap(m.map);
      const r = parseCustomMap(text);
      expect(r.ok, m.id).toBe(true);
      if (!r.ok) continue;
      expect(r.doc.version).toBe(1);
      expect(serializeCustomMap(r.doc)).toBe(text);
      const seats = m.map.players.map((_, i) => ({ controller: (i === 0 ? 'human' : 'ai') as 'human' | 'ai' }));
      const plain = compileCustomMap(catalog, m.map, seats);
      const withTable = compileCustomMap(catalog, m.map, seats, { neutralSites: TABLE });
      expect(JSON.stringify(withTable)).toBe(JSON.stringify(plain));
      expect(validateCustomMap(catalog, m.map, { neutralSites: TABLE })).toEqual(validateCustomMap(catalog, m.map));
      expect(plain.mission.helpTopics.some((h) => h.id === 'map_landmarks')).toBe(false);
    }
  });

  it('round-trips the new fields and refuses a damaged channel', () => {
    const doc = riverMap((d) => [
      at(d, 'pegasus_site', 'neutral_dwelling', 8, 4, { creatureId: 'pegasus' }),
      at(d, 'ferry_a', 'ferry', 14, 4, { twinId: 'ferry_b' }),
      at(d, 'ferry_b', 'ferry', 17, 4, { twinId: 'ferry_a' }),
      at(d, 'depot', 'supply_depot', 10, 18, { reward: { gold: 300, wood: 2 } }),
    ]);
    const withState = { ...doc, sites: doc.sites.map((s) => (s.kind === 'sluice' ? { ...s, openTerrain: 'rough' as const, closedTerrain: 'water' as const, startsOpen: true } : s)) };
    const r = parseCustomMap(serializeCustomMap(withState));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.doc.sites).toEqual(withState.sites);
    const raw = JSON.parse(serializeCustomMap(doc)) as { sites: Record<string, unknown>[] };
    const sluice = raw.sites.find((s) => s.kind === 'sluice')!;
    sluice.channel = [{ q: 1.5, r: 2 }];
    expect(parseCustomMap(JSON.stringify(raw))).toEqual({ ok: false, error: 'The channel of sluice_1 is damaged.' });
    sluice.channel = [];
    sluice.openTerrain = 'lava';
    expect(parseCustomMap(JSON.stringify(raw))).toEqual({ ok: false, error: 'The channel ground of sluice_1 is damaged.' });
  });

  it('with every sluice closed the river cuts Empire 2 off: an error naming the state', () => {
    const doc = riverMap();
    const sc = customSluiceConnectivity(doc)!;
    expect(sc.sluices).toBe(1);
    expect(sc.closed.map((x) => x.siteId)).toEqual(['town_b']);
    expect(sc.open).toEqual([]);
    const errors = validateCustomMap(catalog, doc).filter((i) => i.severity === 'error');
    expect(errors.map((e) => e.text)).toEqual(['With every sluice closed, Empire 2’s town cannot be reached from Empire 1’s town.']);
    expect(errors[0]!.siteId).toBe('town_b');
    expect(() => compileCustomMap(catalog, doc, SEATS)).toThrow(/every sluice closed/);
  });

  it('a sluice that floods its ford when opened is caught in the open state', () => {
    const doc = riverMap();
    const flooding = { ...doc, sites: doc.sites.map((s) => (s.kind === 'sluice' ? { ...s, openTerrain: 'water' as const, closedTerrain: 'plains' as const } : s)) };
    const sc = customSluiceConnectivity(flooding)!;
    expect(sc.closed).toEqual([]);
    expect(sc.open.map((x) => x.siteId)).toEqual(['town_b']);
    expect(validateCustomMap(catalog, flooding).filter((i) => i.severity === 'error').map((e) => e.text)).toEqual(['With every sluice open, Empire 2’s town cannot be reached from Empire 1’s town.']);
  });

  it('a bridge, or a ferry pair, keeps both states connected; the shrine of a hold-the-shrine map is checked too', () => {
    const base = riverMap();
    const bridged = paint(base, [cell(base, 15, 20), cell(base, 16, 20)], TERRAIN_CODES.plains);
    expect(customSluiceConnectivity(bridged)).toEqual({ sluices: 1, checked: 2, closed: [], open: [] });
    expect(validateCustomMap(catalog, bridged).filter((i) => i.severity === 'error')).toEqual([]);
    const ferried = riverMap((d) => [at(d, 'ferry_a', 'ferry', 14, 4, { twinId: 'ferry_b' }), at(d, 'ferry_b', 'ferry', 17, 4, { twinId: 'ferry_a' })]);
    expect(customSluiceConnectivity(ferried)?.closed).toEqual([]);
    expect(validateCustomMap(catalog, ferried).filter((i) => i.severity === 'error')).toEqual([]);
    // A shrine on an east-bank island cut off when the sluice is closed.
    const shrine = { ...bridged, victory: { type: 'hold_relic' as const, days: 5 }, sites: [...bridged.sites, at(bridged, 'relic', 'relic', 22, 6)] };
    const islet = paint(shrine, [cell(shrine, 21, 5), cell(shrine, 22, 5), cell(shrine, 23, 6), cell(shrine, 22, 7), cell(shrine, 21, 7), cell(shrine, 21, 6)], TERRAIN_CODES.water);
    const isle = { ...islet, sites: islet.sites.map((s) => (s.kind === 'sluice' ? { ...s, channel: [...(s.channel ?? []), cell(islet, 21, 6)] } : s)) };
    const sc = customSluiceConnectivity(isle)!;
    expect(sc.checked).toBe(3);
    expect(sc.closed.map((x) => x.label)).toEqual(['the Shrine of the First Flame']);
    expect(sc.open).toEqual([]);
  });

  it('checks the channel: not under a site, near its sluice, not shared, and a ferry needs its twin', () => {
    const doc = riverMap((d) => [at(d, 'chest', 'treasure_chest', 20, 2), at(d, 'sluice_2', 'sluice', 17, 12, { channel: [cell(d, 16, 12)] }), at(d, 'ferry_a', 'ferry', 14, 4)]);
    const far = { ...doc, sites: doc.sites.map((s) => (s.id === 'sluice_1' ? { ...s, channel: [...(s.channel ?? []), cell(doc, 20, 2), cell(doc, 15, 0)] } : s)) };
    const texts = validateCustomMap(catalog, far).map((i) => `${i.severity}: ${i.text}`);
    expect(texts).toContain('error: Sluice: Treasure Chest stands in its channel; sites stand beside a channel, never in it.');
    expect(texts.some((t) => /^error: Sluice: channel hexes lie within 8 hexes of the sluice/.test(t))).toBe(true);
    expect(texts.some((t) => /^error: Sluice and sluice_2 share the channel hex/.test(t))).toBe(true);
    expect(texts).toContain('error: Ferry Landing has no twin landing. Place ferry landings in pairs.');
    const dry = { ...riverMap(), sites: riverMap().sites.map((s) => (s.kind === 'sluice' ? { ...s, channel: [] } : s)) };
    expect(validateCustomMap(catalog, dry).map((i) => i.text)).toContain('Sluice has no channel: mark the hexes it floods and drains (Site → Edit channel).');
  });

  it('warns about a neutral hiring site outside its habitat, with the creature’s own words', () => {
    let doc = riverMap((d) => [at(d, 'ferry_a', 'ferry', 14, 4, { twinId: 'ferry_b' }), at(d, 'ferry_b', 'ferry', 17, 4, { twinId: 'ferry_a' })]);
    // An islet: one plains hex inside open water.
    const lake: HexCoord[] = [];
    const centre = cell(doc, 7, 19);
    for (let dq = -2; dq <= 2; dq++) for (let dr = Math.max(-2, -dq - 2); dr <= Math.min(2, -dq + 2); dr++) if (dq || dr) lake.push({ q: centre.q + dq, r: centre.r + dr });
    doc = paint(doc, lake, TERRAIN_CODES.water);
    // Upland: mountains beside a meadow; a wood; the river bank.
    doc = paint(doc, [cell(doc, 22, 3), cell(doc, 23, 3), cell(doc, 23, 4)], TERRAIN_CODES.mountain);
    doc = paint(doc, [cell(doc, 20, 17), cell(doc, 21, 17), cell(doc, 19, 18), cell(doc, 21, 18), cell(doc, 20, 19)], TERRAIN_CODES.forest);
    const sites: CustomSite[] = [
      ...doc.sites,
      { id: 'pegasus_islet', kind: 'neutral_dwelling', ...centre, creatureId: 'pegasus' },
      at(doc, 'pegasus_upland', 'neutral_dwelling', 22, 4, { creatureId: 'pegasus' }),
      at(doc, 'runner_wood', 'neutral_dwelling', 20, 18, { creatureId: 'root_runner' }),
      at(doc, 'afanc_bank', 'neutral_dwelling', 14, 18, { creatureId: 'afanc' }),
      at(doc, 'serpopard', 'neutral_dwelling', 3, 3, { creatureId: 'serpopard' }),
      at(doc, 'runner_plain', 'neutral_dwelling', 9, 8, { creatureId: 'root_runner' }),
    ];
    // Keep the islet reachable for the playability checks (a ferry to it).
    const island = { ...doc, sites: [...sites, at(doc, 'ferry_c', 'ferry', 10, 19, { twinId: 'ferry_d' }), { id: 'ferry_d', kind: 'ferry' as const, q: centre.q + 1, r: centre.r - 1, twinId: 'ferry_c' }] };
    const islandPainted = paint(island, [{ q: centre.q + 1, r: centre.r - 1 }], TERRAIN_CODES.plains);
    const issues = validateCustomMap(catalog, islandPainted, { neutralSites: TABLE });
    const habitat = issues.filter((i) => i.siteId && /hiring site|Hiring Site|Pegasi|Root-Runners|Afancs|Serpopards/.test(i.text));
    const bySite = Object.fromEntries(habitat.map((i) => [i.siteId!, i]));
    expect(bySite['pegasus_islet']).toMatchObject({ severity: 'warning' });
    expect(bySite['pegasus_islet']!.text).toBe('Neutral Hiring Site: Pegasi need upland meadow or limestone hills; this is open water.');
    expect(bySite['serpopard']!.text).toBe('Neutral Hiring Site: Serpopards need sandstone riverbank, oasis or arid scrub, found in desert lands; this map is temperate.');
    expect(bySite['runner_plain']!.text).toBe('Neutral Hiring Site: Root-Runners need old forest, forest edge or mossy grove; this is open plains.');
    expect(bySite['pegasus_upland']).toBeUndefined();
    expect(bySite['runner_wood']).toBeUndefined();
    expect(bySite['afanc_bank']).toBeUndefined();
    // Warnings never keep a map from being played.
    expect(issues.filter((i) => i.severity === 'error')).toEqual([]);
    const v = customHabitatVerdict(catalog, islandPainted, islandPainted.sites.find((s) => s.id === 'pegasus_upland')!, TABLE)!;
    expect(v.fits).toBe(true);
    expect(v.text).toMatch(/^Pegasi live here: (upland meadow|limestone hills)\.$/);
    // Only the new neutrals have hiring sites.
    const centaur = { ...islandPainted, sites: [...islandPainted.sites, at(doc, 'centaurs', 'neutral_dwelling', 9, 10, { creatureId: 'centaur' })] };
    expect(validateCustomMap(catalog, centaur, { neutralSites: TABLE }).find((i) => i.siteId === 'centaurs')).toMatchObject({ severity: 'error' });
  });

  it('compiles the new sites into the rules’ site kinds (finite weekly stock, sluice states, ferry, depot)', () => {
    const base = riverMap((d) => [
      at(d, 'pegasus_site', 'neutral_dwelling', 8, 4, { creatureId: 'pegasus' }),
      at(d, 'runner_site', 'neutral_dwelling', 8, 8, { creatureId: 'root_runner', name: 'Old Roots' }),
      at(d, 'ferry_a', 'ferry', 14, 4, { twinId: 'ferry_b' }),
      at(d, 'ferry_b', 'ferry', 17, 4, { twinId: 'ferry_a' }),
      at(d, 'depot', 'supply_depot', 10, 18),
      at(d, 'depot_2', 'supply_depot', 11, 20, { reward: { gold: 250, crystal: 1 }, guard: { creatureId: 'centaur', count: 4 } }),
    ]);
    const { mission, map } = compileCustomMap(catalog, base, SEATS, { neutralSites: TABLE });
    const byId = Object.fromEntries(mission.sites.map((s) => [s.id, s]));
    expect(byId['pegasus_site']!.kind).toEqual({ type: 'creature_camp', creatureId: 'pegasus', weeklyGrowth: NEUTRAL_V2_SITE_STOCK['pegasus'], initialStock: NEUTRAL_V2_SITE_STOCK['pegasus'], restock: 'weekly' });
    expect(byId['pegasus_site']!.art).toBe('neutral_dwelling.pegasus');
    expect(byId['pegasus_site']!.name).toBe('Pegasus Hiring Site');
    expect(byId['runner_site']!.name).toBe('Old Roots');
    expect(byId['runner_site']!.kind).toMatchObject({ weeklyGrowth: 8, restock: 'weekly' });
    expect(byId['ferry_a']!.kind).toEqual({ type: 'portal', exitSiteId: 'ferry_b', ferry: true });
    expect(byId['ferry_a']!.art).toBe('ferry');
    expect(byId['depot']!.kind).toEqual({ type: 'pickup', reward: { resources: { gold: SUPPLY_DEPOT_REWARD.gold, wood: SUPPLY_DEPOT_REWARD.wood, stone: SUPPLY_DEPOT_REWARD.stone } } });
    expect(byId['depot']!.art).toBe('supply_depot');
    expect(byId['depot_2']!.kind).toEqual({ type: 'pickup', reward: { resources: { gold: 250, crystal: 1 } } });
    // The guard of a depot pays its usual bounty, not the depot's supplies a second time.
    expect(byId['depot_2']!.guard?.reward.resources?.crystal).toBeUndefined();
    const sl = byId['sluice_1']!;
    expect(sl.art).toBe('sluice');
    expect(sl.kind).toMatchObject({ type: 'sluice', openTerrain: 'marsh', closedTerrain: 'water', startsOpen: false, openFlag: 'sluice_sluice_1_open' });
    if (sl.kind.type === 'sluice') {
      expect(sl.kind.channel).toHaveLength(6);
      expect(sl.kind.openText).toBe('Opening the sluice turns the 6 channel hexes from water to marsh, passable.');
      expect(sl.kind.closeText).toBe('Closing the sluice turns the 6 channel hexes from marsh to water, impassable.');
    }
    expect(mission.helpTopics.some((h) => h.id === 'map_landmarks')).toBe(true);
    expect(validateGeneratedMission(catalog, mission).issues).toEqual([]);
    // Without the table the stock comes from the creature family's growth (the same numbers).
    const plain = compileCustomMap(catalog, base, SEATS);
    expect(plain.mission.sites.find((s) => s.id === 'pegasus_site')!.kind).toEqual(byId['pegasus_site']!.kind);
    // A match starts with the channel in its start state (closed: water) and the sluice closed.
    expect(map.terrain[sl.coord.r * map.width + sl.coord.q]).toBe(TERRAIN_CODES.plains);
    const { match } = createGeneratedMatch(catalog, { mission, map, decor: [] }, { matchId: 'sluice-test' });
    for (const c of (sl.kind as { channel: HexCoord[] }).channel) expect(match.world.map.terrain[c.r * match.world.map.width + c.q]).toBe(TERRAIN_CODES.water);
    expect(match.world.sites['sluice_1']?.open).toBe(false);
    expect(match.world.sites['pegasus_site']).toBeDefined();
  });

  it('a sluice that starts open writes its open ground into the compiled map', () => {
    const doc = riverMap();
    const open = { ...doc, sites: doc.sites.map((s) => (s.kind === 'sluice' ? { ...s, startsOpen: true } : s)) };
    const bridged = paint(open, [cell(open, 15, 2), cell(open, 16, 2)], TERRAIN_CODES.plains);
    const { map } = compileCustomMap(catalog, bridged, SEATS);
    const channel = bridged.sites.find((s) => s.kind === 'sluice')!.channel!;
    for (const c of channel) expect(map.terrain[c.r * map.width + c.q]).toBe(TERRAIN_CODES.marsh);
    const keys = new Set(channel.map((c) => hexKey(c)));
    // Every other cell keeps the document's ground.
    for (let i = 0; i < map.terrain.length; i++) {
      const c = { q: i % map.width, r: Math.floor(i / map.width) };
      if (!keys.has(hexKey(c))) expect(map.terrain[i]).toBe(bridged.terrain[i]);
    }
  });

  it('a random map with the new neutral creatures opens in the editor with its hiring sites, and compiles back to them', () => {
    const g = createRandomSkirmish(catalog, { seed: 31, size: 'medium', seats: [{ pantheonId: 'greek', controller: 'human' }, { pantheonId: 'norse', controller: 'ai' }], victory: { type: 'elimination' }, monsters: 'few', neutralSites: TABLE });
    const camps = g.mission.sites.filter((s) => s.kind.type === 'creature_camp' && s.kind.restock === 'weekly');
    expect(camps.length).toBeGreaterThan(0);
    const { doc } = customMapFromGenerated(catalog, g, 'Neutral test');
    const hiring = doc.sites.filter((s) => s.kind === 'neutral_dwelling');
    expect(hiring).toHaveLength(camps.length);
    expect(validateCustomMap(catalog, doc, { neutralSites: TABLE }).filter((i) => i.severity === 'error')).toEqual([]);
    const back = compileCustomMap(catalog, doc, SEATS, { neutralSites: TABLE });
    for (const s of hiring) expect(back.mission.sites.find((x) => x.id === s.id)?.kind).toMatchObject({ type: 'creature_camp', creatureId: s.creatureId, restock: 'weekly' });
  });
});
