/**
 * The naval random-map templates (2026-10-17): The Shattered Crown and The Serpent Straits through the
 * real generator — settings and refusals, determinism, the map stamp, every production check
 * (naval/validate.ts) on generated seeds, deliberately broken candidates, and the seed sweep.
 *
 * The sweep runs a covering matrix of victory modes and treasure / wealth / guard settings per seat
 * count (12 seeds each by default; NAVAL_SWEEP=100 runs 100 per seat count — the acceptance run), and
 * the optional neutral creatures and every unowned-town setting separately.
 */
import { describe, expect, it } from 'vitest';
import { buildCatalog, NEUTRAL_V2_HABITATS, NEUTRAL_V2_SITE_STOCK } from '@pr/content';
import { TERRAIN_CODES, hashValue, hexKey, parseHexKey, type MissionDefinition, type WorldMapDefinition } from '@pr/rules';
import {
  NAVAL_GENERATOR_ID,
  NAVAL_MAP_TYPES,
  NAVAL_TEMPLATE_VERSION,
  RANDOM_MAP_TYPES,
  SKIRMISH_MAP_TYPES,
  analyzeNavalMap,
  generateSkirmish,
  navalSettingsProblem,
  navalTemplate,
  navalTemplatesReadiness,
  skirmishMapBiome,
  skirmishTypeAllows,
  validateNavalMap,
  vertexDisjointPaths,
  type GuardStrength,
  type NavalMapType,
  type SkirmishGenOptions,
  type StartWealth,
  type TreasureLevel,
  type UnownedTowns,
} from '../src';

const catalog = buildCatalog();
const pool = ['greek', 'norse', 'egyptian', 'japanese', 'celtic', 'mesoamerican'];
const TABLE = { habitats: NEUTRAL_V2_HABITATS, stock: NEUTRAL_V2_SITE_STOCK };

function opts(mapType: NavalMapType, n: number, seed: number, extra: Partial<SkirmishGenOptions> = {}): SkirmishGenOptions {
  return { seed, size: 'huge', seats: pool.slice(0, n).map((pantheonId) => ({ pantheonId, controller: 'ai' as const })), victory: navalTemplate(mapType).defaultVictory, monsters: 'few', mapType, ...extra };
}

const allPass = (checks: readonly { id: string; pass: boolean; detail: string }[]) => checks.filter((c) => !c.pass).map((c) => `${c.id}: ${c.detail}`);

describe('naval templates: catalog, settings and refusals', () => {
  it('lists the two naval types after the nine land layouts, which stay as they were', () => {
    expect(SKIRMISH_MAP_TYPES).toHaveLength(9);
    expect(RANDOM_MAP_TYPES.map((t) => t.id)).toEqual([...SKIRMISH_MAP_TYPES.map((t) => t.id), 'shattered_crown', 'serpent_straits']);
    expect(RANDOM_MAP_TYPES.filter((t) => t.naval).map((t) => t.naval!.artId)).toEqual(['frontend.random.shattered_crown', 'frontend.random.serpent_straits']);
    expect(NAVAL_MAP_TYPES.map((t) => t.loadingArtId)).toEqual(['random.shattered_crown.loading', 'random.serpent_straits.loading']);
    expect(navalTemplate('shattered_crown')).toMatchObject({ seats: [2, 3, 6], sizes: ['huge'], defaultVictory: { type: 'hold_relic', days: 7 }, waterBand: [0.7, 0.77] });
    expect(navalTemplate('serpent_straits')).toMatchObject({ seats: [2], sizes: ['huge'], defaultVictory: { type: 'elimination' }, waterBand: [0.66, 0.74] });
    expect(skirmishTypeAllows('shattered_crown', 3)).toBe(true);
    expect(skirmishTypeAllows('shattered_crown', 4)).toBe(false);
    expect(skirmishTypeAllows('serpent_straits', 3)).toBe(false);
    expect(skirmishMapBiome('shattered_crown')).toBe('coast');
    expect(skirmishMapBiome('serpent_straits')).toBe('fjord');
    expect(navalTemplatesReadiness(catalog).ready).toBe(true);
  });

  it('refuses unsupported seats, sizes, portals and a game without ships, with a reason', () => {
    expect(navalSettingsProblem('shattered_crown', 'huge', 4)).toMatch(/2, 3 or 6/);
    expect(navalSettingsProblem('shattered_crown', 'large', 2)).toMatch(/Huge only/);
    expect(navalSettingsProblem('serpent_straits', 'huge', 3)).toMatch(/duel/);
    expect(navalSettingsProblem('shattered_crown', 'huge', 6, 'both')).toMatch(/Two unowned towns/);
    expect(navalSettingsProblem('shattered_crown', 'huge', 6, 'own')).toBeNull();
    expect(() => generateSkirmish(catalog, opts('shattered_crown', 4, 1))).toThrow(/2, 3 or 6/);
    expect(() => generateSkirmish(catalog, opts('serpent_straits', 2, 1, { size: 'medium' }))).toThrow(/Huge only/);
    expect(() => generateSkirmish(catalog, opts('serpent_straits', 2, 1, { portals: true }))).toThrow(/Ships connect these islands/);
    const noShips = { expandedContent: true, weeklyEvents: true, interventions: true, navalMovementV1: false };
    expect(() => generateSkirmish(catalog, opts('shattered_crown', 2, 1, { features: noShips }))).toThrow(/navalMovementV1/);
    try {
      generateSkirmish(catalog, opts('shattered_crown', 4, 1));
    } catch (e) {
      expect((e as Error).name).toBe('NavalGenerationError');
    }
  });
});

describe('naval templates: generation', () => {
  it('is deterministic, stamps generator, template, version, seed and settings, and changes with the seed or a setting', () => {
    const a = generateSkirmish(catalog, opts('shattered_crown', 3, 777));
    const b = generateSkirmish(catalog, opts('shattered_crown', 3, 777));
    expect(hashValue(a)).toBe(hashValue(b));
    const c = generateSkirmish(catalog, opts('shattered_crown', 3, 778));
    expect(c.map.logicalHash).not.toBe(a.map.logicalHash);
    const d = generateSkirmish(catalog, opts('shattered_crown', 3, 777, { guards: 'strong' }));
    expect(d.map.logicalHash).not.toBe(a.map.logicalHash);
    expect(a.map).toMatchObject({ generatorVersion: NAVAL_GENERATOR_ID, templateVersion: NAVAL_TEMPLATE_VERSION, seed: 777, biome: 'coast' });
    expect(a.mission.navalPolicy).toMatchObject({ id: 'naval_only_v1', interIslandTravel: 'ships_only', portals: false, requiredFeature: 'navalMovementV1', reason: 'Ships connect these islands.' });
    expect(a.mission.navalPolicy!.template).toMatchObject({ id: 'shattered_crown', version: NAVAL_TEMPLATE_VERSION, generator: NAVAL_GENERATOR_ID, seed: 777 });
    expect(a.mission.navalPolicy!.template.settings).toMatch(/^shattered_crown-3p-normal-normal-normal-full-fog-hold7-monsters-few/);
    expect(a.mission.features?.navalMovementV1).toBe(true);
    expect(a.mission.thumbnailAssetId).toBe('frontend.random.shattered_crown');
    expect(a.mission.sites.some((s) => s.kind.type === 'portal' || s.kind.type === 'sluice')).toBe(false);
  });

  for (const [mapType, n] of [['shattered_crown', 2], ['shattered_crown', 3], ['shattered_crown', 6], ['serpent_straits', 2]] as const) {
    it(`${mapType} for ${n}: every production check passes; one owned empty ship per empire beside its harbor`, () => {
      const g = generateSkirmish(catalog, opts(mapType, n, 4242));
      expect(allPass(g.checks)).toEqual([]);
      expect(g.checks.map((c) => c.id)).toEqual(['NAV-1', 'NAV-2', 'NAV-3', 'NAV-4', 'NAV-16', 'NAV-5', 'NAV-6', 'NAV-7', 'NAV-8', 'NAV-9', 'NAV-10', 'NAV-11', 'NAV-15', 'NAV-12', 'NAV-13', 'NAV-14', 'NAV-17', 'NAV-18', 'NAV-19', 'NAV-20', 'NAV-21']);
      const ships = g.mission.ships ?? [];
      expect(ships).toHaveLength(n);
      const players = [g.mission.player.playerId, ...(g.mission.rivals ?? []).map((r) => r.playerId)];
      expect(ships.map((s) => s.ownerId)).toEqual(players);
      const a = analyzeNavalMap(catalog, g.map, g.mission);
      expect(a.islands).toHaveLength(mapType === 'shattered_crown' ? 13 : 5);
      // The town is coastal: two water neighbours exactly, none of them the starting ship's tile.
      for (const town of a.homeTowns) {
        const water = [0, 1, 2, 3, 4, 5].map((i) => ({ q: town.coord.q + [1, 1, 0, -1, -1, 0][i]!, r: town.coord.r + [0, -1, -1, 0, 1, 1][i]! })).filter((c) => a.water.has(hexKey(c)));
        expect(water).toHaveLength(2);
        expect(water.some((w) => ships.some((s) => s.coord.q === w.q && s.coord.r === w.r))).toBe(false);
      }
      // Unused Shattered Crown slots: no town, no hero, no ship; their islands hold neutral sites.
      if (mapType === 'shattered_crown' && n < 6) expect(g.mission.sites.filter((s) => /_x\d$/.test(s.id)).length).toBeGreaterThan(0);
    });
  }

  it('starts every empire with the same island: usable land, shoreline, sites, guards and rewards (rotation copies)', () => {
    const g = generateSkirmish(catalog, opts('shattered_crown', 6, 31337, { treasure: 'rich', guards: 'strong' }));
    expect(allPass(g.checks)).toEqual([]);
    const fair = g.checks.find((c) => c.id === 'NAV-14')!;
    expect(fair.pass).toBe(true);
    const keys = (i: number) => g.mission.sites.filter((s) => s.id.endsWith(`_${i}`)).map((s) => s.id.slice(0, -2)).sort();
    for (let i = 2; i <= 6; i++) expect(keys(i)).toEqual(keys(1));
  });

  it('unowned towns obey none / own / other / both: on unused home islands (2-3 empires) or the outer islands, coastal, fair', () => {
    for (const [mapType, n] of [['shattered_crown', 2], ['shattered_crown', 3], ['shattered_crown', 6], ['serpent_straits', 2]] as const) {
      for (const unowned of ['none', 'own', 'other', 'both'] as UnownedTowns[]) {
        if (navalSettingsProblem(mapType, 'huge', n, unowned)) continue;
        const g = generateSkirmish(catalog, opts(mapType, n, 5150, { unownedTowns: unowned }));
        expect(allPass(g.checks), `${mapType} ${n} ${unowned}`).toEqual([]);
        const per = unowned === 'both' ? 2 : unowned === 'none' ? 0 : 1;
        expect(g.mission.neutralTowns ?? [], `${mapType} ${n} ${unowned}`).toHaveLength(per * n);
        // Never on a home island of an empire.
        const a = analyzeNavalMap(catalog, g.map, g.mission);
        const homes = new Set(a.homeTowns.map((t) => a.islandOf.get(hexKey(t.coord))));
        for (const t of g.mission.neutralTowns ?? []) {
          const site = g.mission.sites.find((s) => s.id === t.siteId)!;
          expect(homes.has(a.islandOf.get(hexKey(site.coord)))).toBe(false);
        }
      }
    }
  });

  it('optional neutral hiring sites stand only where their habitat fits, and every check still passes', () => {
    for (const [mapType, n] of [['shattered_crown', 2], ['serpent_straits', 2]] as const) {
      const g = generateSkirmish(catalog, opts(mapType, n, 909, { neutralSites: TABLE }));
      expect(allPass(g.checks)).toEqual([]);
      const without = generateSkirmish(catalog, opts(mapType, n, 909));
      expect(g.mission.sites.length).toBeGreaterThanOrEqual(without.mission.sites.length);
    }
  });
});

/** A copy of a generated map with some cells re-painted (for the negative checks). */
function repaint(map: WorldMapDefinition, cells: readonly { q: number; r: number }[], code: string): WorldMapDefinition {
  const t = map.terrain.split('');
  for (const c of cells) t[c.r * map.width + c.q] = code;
  return { ...map, terrain: t.join('') };
}

describe('naval templates: deliberately broken candidates are rejected', () => {
  const tpl = navalTemplate('serpent_straits');
  const g = generateSkirmish(catalog, opts('serpent_straits', 2, 2024));
  const failing = (map: WorldMapDefinition, mission: MissionDefinition) => validateNavalMap(catalog, map, mission, tpl).filter((c) => !c.pass).map((c) => c.id);

  it('a land bridge from a home island to the central island fails the land-flood and island checks', () => {
    const a = analyzeNavalMap(catalog, g.map, g.mission);
    const home = a.homeTowns[0]!.coord;
    const obj = a.objective!.coord;
    // A straight row of land from the home town toward the center.
    const cells: { q: number; r: number }[] = [];
    const steps = Math.max(Math.abs(obj.q - home.q), Math.abs(obj.r - home.r), Math.abs(obj.q + obj.r - home.q - home.r));
    for (let i = 0; i <= steps; i++) cells.push({ q: Math.round(home.q + ((obj.q - home.q) * i) / steps), r: Math.round(home.r + ((obj.r - home.r) * i) / steps) });
    const ids = failing(repaint(g.map, cells.filter((c) => a.water.has(`${c.q},${c.r}`)), TERRAIN_CODES.plains), g.mission);
    expect(ids).toEqual(expect.arrayContaining(['NAV-2', 'NAV-3']));
  });

  it('a portal, a policy with portals true, ships turned off or a missing starting ship are each refused', () => {
    const portal: MissionDefinition = { ...g.mission, sites: [...g.mission.sites, { id: 'portal_x', anchorId: 'portal_x', coord: g.mission.sites[3]!.coord, name: 'Twin Portal', description: '', kind: { type: 'portal', exitSiteId: 'portal_y' } }] };
    expect(failing(g.map, portal)).toContain('NAV-13');
    const persisted = { ...g.mission, navalPolicy: { ...g.mission.navalPolicy!, portals: true } } as unknown as MissionDefinition;
    expect(failing(g.map, persisted)).toContain('NAV-13');
    const off: MissionDefinition = { ...g.mission, features: { ...g.mission.features!, navalMovementV1: false } };
    expect(failing(g.map, off)).toContain('NAV-13');
    const noShip: MissionDefinition = { ...g.mission, ships: g.mission.ships!.slice(1) };
    expect(failing(g.map, noShip)).toEqual(expect.arrayContaining(['NAV-16']));
  });

  it('sealing a harbor (water around the starting ship and launch cells turned to land) fails the route checks', () => {
    const a = analyzeNavalMap(catalog, g.map, g.mission);
    const ship = g.mission.ships![0]!.coord;
    const ring: { q: number; r: number }[] = [];
    for (const k of a.water) {
      const c = parseHexKey(k);
      const d = (Math.abs(c.q - ship.q) + Math.abs(c.r - ship.r) + Math.abs(c.q + c.r - ship.q - ship.r)) / 2;
      if (d === 3) ring.push(c);
    }
    const ids = failing(repaint(g.map, ring, TERRAIN_CODES.mountain), g.mission);
    expect(ids).toEqual(expect.arrayContaining(['NAV-6', 'NAV-7']));
  });

  it('Menger counting: one cut cell gives one disjoint route, a two-wide channel two', () => {
    const line = (qs: number[], r: number) => qs.map((q) => `${q},${r}`);
    const narrow = new Set(line([0, 1, 2, 3, 4], 0));
    expect(vertexDisjointPaths(narrow, ['0,0'], ['4,0'])).toBe(1);
    const wide = new Set([...line([0, 1, 2, 3, 4], 0), ...line([0, 1, 2, 3, 4], 1)]);
    expect(vertexDisjointPaths(wide, ['0,0', '0,1'], ['4,0', '4,1'])).toBe(2);
  });
});

describe('naval templates: seed sweep (covering matrix)', () => {
  const N = Number(process.env.NAVAL_SWEEP ?? 12);
  const victories = [{ type: 'hold_relic', days: 7 }, { type: 'elimination' }] as const;
  const treasures: TreasureLevel[] = ['scarce', 'normal', 'rich'];
  const wealths: StartWealth[] = ['low', 'normal', 'high'];
  const guards: GuardStrength[] = ['weak', 'normal', 'strong'];
  for (const [mapType, n] of [['shattered_crown', 2], ['shattered_crown', 3], ['shattered_crown', 6], ['serpent_straits', 2]] as const) {
    it(`${mapType} for ${n} empires: ${N} seeds through victory × treasure × wealth × guards all pass`, () => {
      let fallback = 0;
      let candidates = 0;
      let worst = 0;
      const t0 = performance.now();
      const failures: string[] = [];
      for (let i = 0; i < N; i++) {
        const seed = 10_000 + i * 7919;
        const o = opts(mapType, n, seed, { victory: victories[i % 2]!, treasure: treasures[i % 3]!, startWealth: wealths[Math.floor(i / 3) % 3]!, guards: guards[Math.floor(i / 9) % 3]!, monsters: (['none', 'few', 'many'] as const)[i % 3]!, roads: i % 4 === 0 ? 'sparse' : 'full' });
        try {
          const g = generateSkirmish(catalog, o);
          const bad = allPass(g.checks);
          if (bad.length) failures.push(`${seed}: ${bad.join('; ')}`);
          if (g.map.mode === 'golden_fallback') fallback++;
          candidates += g.map.attempt ?? 0;
          worst = Math.max(worst, g.map.attempt ?? 0);
        } catch (e) {
          failures.push(`${seed}: ${(e as Error).message}`);
        }
      }
      console.log(`[naval sweep] ${mapType} ${n}p: ${N - failures.length}/${N} passed, reference-shape fallback ${fallback}, rejected candidates per map ${(candidates / N).toFixed(2)} (worst ${worst}), ${Math.round((performance.now() - t0) / N)} ms per map`);
      expect(failures).toEqual([]);
    }, 600_000);
  }
  it(`unowned towns (own / other / both) and neutral hiring sites, ${Math.max(4, Math.round(N / 3))} seeds per setting and seat count`, () => {
    const M = Math.max(4, Math.round(N / 3));
    const failures: string[] = [];
    let runs = 0;
    for (const [mapType, n] of [['shattered_crown', 2], ['shattered_crown', 3], ['shattered_crown', 6], ['serpent_straits', 2]] as const) {
      for (const extra of [{ unownedTowns: 'own' }, { unownedTowns: 'other' }, { unownedTowns: 'both' }, { neutralSites: TABLE }] as Partial<SkirmishGenOptions>[]) {
        if (extra.unownedTowns && navalSettingsProblem(mapType, 'huge', n, extra.unownedTowns)) continue;
        for (let i = 0; i < M; i++) {
          const seed = 50_000 + i * 104729;
          runs++;
          try {
            const g = generateSkirmish(catalog, opts(mapType, n, seed, extra));
            const bad = allPass(g.checks);
            if (bad.length) failures.push(`${mapType} ${n} ${JSON.stringify(extra.unownedTowns ?? 'neutrals')} ${seed}: ${bad.join('; ')}`);
          } catch (e) {
            failures.push(`${mapType} ${n} ${JSON.stringify(extra.unownedTowns ?? 'neutrals')} ${seed}: ${(e as Error).message}`);
          }
        }
      }
    }
    console.log(`[naval sweep] unowned towns and neutral sites: ${runs - failures.length}/${runs} passed`);
    expect(failures).toEqual([]);
  }, 600_000);
});
