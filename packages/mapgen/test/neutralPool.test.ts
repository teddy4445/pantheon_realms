/**
 * The random-map neutral encounter pool (campaign expansion handoff 2026-10-15;
 * optional, off by default): hiring sites of the new neutral creatures only where
 * their habitat fits, one or two species per map by size, one site per empire
 * region (copied by the symmetry, so seat fairness holds), deterministic per seed —
 * and with the option off, the generator's output is exactly what it was before.
 */
import { describe, expect, it } from 'vitest';
import { buildCatalog, validateGeneratedMission, NEUTRAL_V2_HABITATS, NEUTRAL_V2_SITE_STOCK } from '@pr/content';
import { hashValue, type NeutralSiteTable } from '@pr/rules';
import { generateSkirmish, groundOf, habitatTagsAt, habitatVerdict, neutralSpeciesForBiome, skirmishMapBiome, SKIRMISH_MAP_TYPES, SKIRMISH_NEUTRAL_SPECIES, skirmishTypeAllows, type SkirmishGenOptions, type SkirmishMapSize, type SkirmishMapType } from '../src';

const catalog = buildCatalog();
const TABLE: NeutralSiteTable = { habitats: NEUTRAL_V2_HABITATS, stock: NEUTRAL_V2_SITE_STOCK };
const POOL = ['greek', 'norse', 'egyptian', 'japanese', 'celtic', 'mesoamerican'];

function opts(n: number, size: SkirmishMapSize, mapType: SkirmishMapType, seed: number, extra: Partial<SkirmishGenOptions> = {}): SkirmishGenOptions {
  return { seed, size, seats: POOL.slice(0, n).map((pantheonId) => ({ pantheonId, controller: 'ai' as const })), victory: { type: 'elimination' }, monsters: 'few', mapType, ...extra };
}

const neutralSites = (g: ReturnType<typeof generateSkirmish>) => g.mission.sites.filter((s) => s.id.startsWith('neutral_'));

describe('random maps: the new neutral creatures (default off)', () => {
  it('off: the generator gives exactly the map it gave before the option existed (pinned digests)', () => {
    // Digests of the map (terrain and roads), every site's ID, place and kind, and the
    // mission ID, recorded from the generator before the option was added (2026-10-15).
    // A deliberate generator change re-records them; the option must never change them.
    const pins: [number, SkirmishMapSize, SkirmishMapType, number, string][] = [
      [2, 'small', 'continental', 11, 'c4601f5cf8c9d8bd'],
      [2, 'medium', 'wild_forest', 4242, '05f3e25678aab265'],
      [3, 'medium', 'highlands', 77, '344185e21722e921'],
      [4, 'large', 'lake_isle', 5, '8123589512e7e304'],
      [2, 'large', 'marshlands', 909, 'ccc2be795767e788'],
    ];
    for (const [n, size, mapType, seed, digest] of pins) {
      const g = generateSkirmish(catalog, opts(n, size, mapType, seed));
      expect(hashValue({ map: g.map.logicalHash, sites: g.mission.sites.map((s) => [s.id, s.coord.q, s.coord.r, s.kind.type]), id: g.mission.id }), `${n} ${size} ${mapType} ${seed}`).toBe(digest);
      expect(neutralSites(g)).toEqual([]);
    }
  });

  it('off is the default: an absent option and an undefined one give the same bytes', () => {
    for (const mapType of ['continental', 'central_valley', 'archipelago'] as const) {
      const a = generateSkirmish(catalog, opts(2, 'medium', mapType, 1234));
      const b = generateSkirmish(catalog, opts(2, 'medium', mapType, 1234, { neutralSites: undefined }));
      expect(JSON.stringify(b)).toBe(JSON.stringify(a));
    }
  });

  it('on: only adds hiring sites — the terrain, roads, every other site, the monsters and the checks are the map of the same seed without them', () => {
    for (const [n, size, mapType, seed] of [
      [2, 'medium', 'continental', 7],
      [3, 'medium', 'highlands', 77],
      [4, 'large', 'wild_forest', 19],
      [6, 'huge', 'continental', 3],
    ] as const) {
      const off = generateSkirmish(catalog, opts(n, size, mapType, seed));
      const on = generateSkirmish(catalog, opts(n, size, mapType, seed, { neutralSites: TABLE }));
      expect(on.map).toEqual(off.map);
      expect(on.decor).toEqual(off.decor);
      expect(on.mission.hostileHeroes).toEqual(off.mission.hostileHeroes);
      expect(on.mission.sites.filter((s) => !s.id.startsWith('neutral_'))).toEqual(off.mission.sites);
      // The option is part of the mission ID (a different map from the same seed).
      const defaults = off.mission.id === `random_${size}_${n}p_${seed}` ? `_${mapType}-normal-normal-normal-full-fog` : '';
      expect(on.mission.id).toBe(`${off.mission.id}${defaults}-neutrals`);
      expect(on.checks.every((c) => c.pass)).toBe(true);
      expect(validateGeneratedMission(catalog, on.mission).issues).toEqual(validateGeneratedMission(catalog, off.mission).issues);
    }
  });

  it('is deterministic for a seed', () => {
    const a = generateSkirmish(catalog, opts(3, 'large', 'continental', 555, { neutralSites: TABLE }));
    const b = generateSkirmish(catalog, opts(3, 'large', 'continental', 555, { neutralSites: TABLE }));
    expect(JSON.stringify(b)).toBe(JSON.stringify(a));
  });

  it('places one or two species by size, one site in every empire’s lands, each in its habitat, with fair travel', () => {
    let placedMaps = 0;
    const seen = new Set<string>();
    for (const mapType of SKIRMISH_MAP_TYPES.map((t) => t.id)) {
      for (const [n, size, seeds] of [
        [2, 'small', [21]],
        [3, 'medium', [8080]],
        [4, 'large', [21]],
      ] as const) {
        if (!skirmishTypeAllows(mapType, n)) continue;
        for (const seed of seeds) {
          const g = generateSkirmish(catalog, opts(n, size, mapType, seed, { neutralSites: TABLE }));
          const sites = neutralSites(g);
          const biome = skirmishMapBiome(mapType);
          expect(g.map.biome).toBe(biome);
          const species = [...new Set(sites.map((s) => (s.kind.type === 'creature_camp' ? s.kind.creatureId : '')))];
          expect(species.length).toBeLessThanOrEqual(SKIRMISH_NEUTRAL_SPECIES[size]);
          if (species.length > 0) placedMaps++;
          const ground = groundOf(g.map);
          for (const id of species) {
            seen.add(id);
            expect(neutralSpeciesForBiome(catalog, TABLE, biome)).toContain(id);
            const mine = sites.filter((s) => s.kind.type === 'creature_camp' && s.kind.creatureId === id);
            // One per empire: ids end in the seat number.
            expect(mine.map((s) => s.id).sort()).toEqual(Array.from({ length: n }, (_, i) => `neutral_${id}_${i + 1}`).sort());
            for (const s of mine) {
              expect(s.kind).toEqual({ type: 'creature_camp', creatureId: id, weeklyGrowth: NEUTRAL_V2_SITE_STOCK[id], initialStock: NEUTRAL_V2_SITE_STOCK[id], restock: 'weekly' });
              expect(s.art).toBe(`neutral_dwelling.${id}`);
              const v = habitatVerdict(TABLE.habitats[id]!, catalog.creatures[id]!.pluralName, biome, ground, s.coord);
              expect(v.fits, `${mapType} ${size} ${seed} ${s.id}: ${v.text} [${habitatTagsAt(ground, biome, s.coord).join(', ')}]`).toBe(true);
            }
          }
          // The generator's own fairness checks (every empire's own sites cost the same to reach) still pass.
          expect(g.checks.find((c) => c.id === 'SKM-5')?.pass).toBe(true);
          expect(g.checks.every((c) => c.pass)).toBe(true);
          if (sites.length) expect(g.mission.helpTopics.some((h) => h.id === 'neutral_sites')).toBe(true);
        }
      }
    }
    expect(placedMaps).toBeGreaterThan(12);
    // Desert and jungle creatures never appear: no random map type has those lands.
    expect(seen.has('serpopard')).toBe(false);
    expect(seen.has('ahuitzotl')).toBe(false);
    expect(seen.size).toBeGreaterThanOrEqual(3);
  }, 300_000);

  it('reads habitats from the ground: open water, a forest, an upland meadow', () => {
    const W = 9;
    const H = 9;
    const mk = (fill: string, at: Record<string, string>) => {
      let t = '';
      for (let r = 0; r < H; r++) for (let q = 0; q < W; q++) t += at[`${q},${r}`] ?? fill;
      return groundOf({ width: W, height: H, terrain: t });
    };
    const c = { q: 4, r: 4 };
    const water = mk('w', { '4,4': 'p' });
    expect(habitatTagsAt(water, 'temperate', c)).toContain('open_water');
    expect(habitatTagsAt(water, 'coast', c)).toContain('open_ocean');
    expect(habitatVerdict(TABLE.habitats['pegasus']!, 'Pegasi', 'temperate', water, c).text).toBe('Pegasi need upland meadow or limestone hills; this is open water.');
    const wood = mk('p', { '5,4': 'f', '3,4': 'f', '4,3': 'f' });
    expect(habitatVerdict(TABLE.habitats['root_runner']!, 'Root-Runners', 'temperate', wood, c).fits).toBe(true);
    expect(habitatVerdict(TABLE.habitats['root_runner']!, 'Root-Runners', 'desert', wood, c).problem).toBe('biome');
    expect(habitatVerdict(TABLE.habitats['root_runner']!, 'Root-Runners', 'desert', mk('p', {}), c).text).toBe('Root-Runners need old forest, forest edge or mossy grove; this is bare dunes.');
    const upland = mk('p', { '5,4': 'm', '5,3': 'm', '6,3': 'r' });
    expect(habitatVerdict(TABLE.habitats['pegasus']!, 'Pegasi', 'high_pass', upland, c).fits).toBe(true);
    expect(habitatVerdict(TABLE.habitats['serpopard']!, 'Serpopards', 'high_pass', upland, c).problem).toBe('biome');
  });
});
