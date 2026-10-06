/**
 * Climate-aware nature scenery (owner delivery 2026-10-06): the TypeScript port
 * of the delivery's reference selector passes the delivery's own checks, and the
 * map plan picks the climate's art, keeps water kinds apart, stays deterministic
 * and leaves the logical map untouched.
 */
import { describe, expect, it } from 'vitest';
import type { WorldMapDefinition } from '@pr/rules';
import { LOW_DRESSING, NATURE_POLICY as policy, battleObstacleId, classifyWater, makeNatureSelector, natureHash, planNatureScenery, type NatureItem } from '../src/nature';

/** A synthetic map: rows of terrain codes (p plains, f forest, r rough, s marsh, m mountain, w water, v void). */
function mapOf(rows: string[], biome: WorldMapDefinition['biome'], roads: string[] = [], seed = 7): WorldMapDefinition {
  return {
    templateId: 'test' as WorldMapDefinition['templateId'],
    templateVersion: 1,
    generatorVersion: 'test',
    seed,
    attempt: 0,
    mode: 'golden',
    width: rows[0]!.length,
    height: rows.length,
    terrain: rows.join(''),
    roads,
    logicalHash: 'test-hash',
    biome,
  };
}

/** Ten climates, each a map with every ground, water bodies of every kind and a road. */
function mixedMap(biome: WorldMapDefinition['biome'], seed = 11): WorldMapDefinition {
  const rows: string[] = [];
  for (let r = 0; r < 24; r++) {
    let row = '';
    for (let q = 0; q < 30; q++) {
      const band = Math.floor(q / 5);
      let c = 'pfrsmp'[band]!;
      if (r >= 18 && q >= 2 && q <= 9 && r <= 22) c = 'w'; // a large lake (enclosed)
      if (r === 3 && q >= 26 && q <= 27) c = 'w'; // a pond of two
      if (q === 14 && r >= 6 && r <= 16) c = 'w'; // a river, one wide
      if ((r + q) % 13 === 0 && c === 'p') c = 'f';
      row += c;
    }
    rows.push(row);
  }
  const roads: string[] = [];
  for (let q = 0; q < 29; q++) roads.push(`${q},10|${q + 1},10`);
  return mapOf(rows, biome, roads, seed);
}

const seaMap = (biome: WorldMapDefinition['biome']) => {
  const rows: string[] = [];
  for (let r = 0; r < 20; r++) {
    let row = '';
    for (let q = 0; q < 26; q++) row += q < 13 ? 'w' : r % 7 === 0 ? 'f' : 'p';
    rows.push(row);
  }
  return mapOf(rows, biome);
};

const assetOf = (id: string) => policy.assets.find((a) => a.id === id);

describe('the reference selector, ported (delivery tools/test-selector.mjs)', () => {
  it('passes the delivery’s checks', () => {
    const s = makeNatureSelector(policy);
    let checks = 0;
    const check = (ok: boolean) => {
      expect(ok).toBe(true);
      checks++;
    };
    for (const climate of policy.climates)
      for (const terrain of ['plains', 'forest', 'rough', 'marsh', 'mountain'])
        for (let q = 0; q < 20; q++) {
          const ctx = { climate, terrain, seed: 23, q, r: 7 };
          const a = s.land(ctx);
          check(!!a && a.climate === climate);
          check(a!.id === s.land(ctx)!.id);
          check(a!.role in policy.ground[terrain]!);
        }
    check(s.land({ climate: 'desert', terrain: 'water' }) === null);
    check(s.land({ climate: 'desert', terrain: 'void' }) === null);
    check(s.land({ climate: 'unrecognized', terrain: 'forest' }) === null);
    for (const climate of policy.climates) {
      for (const [a, b] of [['forest', 'plains'], ['forest', 'rough'], ['mountain', 'rough'], ['marsh', 'plains']] as const) {
        const e = s.edge({ climate, a, b, seed: 1, q: 2, r: 4 });
        check(e?.asset.climate === climate);
        check(e!.owner === 'a');
      }
      const sea = s.edge({ climate, a: 'water', b: 'plains', waterKind: 'sea' });
      check(sea?.owner === 'b');
      check(sea!.asset.role !== 'wet_edge' || sea!.asset.saltwaterBankAllowed === true);
      check(s.edge({ climate, a: 'water', b: 'plains' }) === null);
      check(s.water({ climate, waterKind: 'lake', role: 'water_life', waterArea: 30, waterClearance: 1 })?.climate === 'freshwater');
      check(s.water({ climate, waterKind: 'lake', role: 'boat', waterArea: 2, waterClearance: 0 }) === null);
      check(s.water({ climate, waterKind: 'lake', role: 'boat', waterArea: 40, waterClearance: 2, waterFrozen: true }) === null);
      for (const archetype of Object.keys(policy.battle)) {
        check(s.battleObstacle({ climate, archetype, isAuthoritativeObstacle: true })?.climate === climate);
        check(s.battleObstacle({ climate, archetype, isAuthoritativeObstacle: false }) === null);
        check(s.battleObstacle({ climate, archetype, isAuthoritativeObstacle: true, authoredKind: 'column' }) === null);
      }
    }
    const noAssets = makeNatureSelector(policy, () => false);
    check(noAssets.land({ climate: 'desert', terrain: 'forest' }) === null);
    for (let q = 0; q < 100; q++) {
      const a = s.water({ climate: 'desert', waterKind: 'lake', role: 'water_life', waterArea: 40, waterClearance: 2, q });
      check(!!a && !/whale|dolphin|coral|seal/.test(a.description));
    }
    const variants = new Set(Array.from({ length: 80 }, (_, q) => s.land({ climate: 'desert', terrain: 'forest', seed: 2, q, r: 1 })?.id).filter((x) => x?.includes('.canopy.')));
    check(variants.size === 3);
    // The delivery's run reports 3425 checks; this port runs the same ones.
    expect(checks).toBe(3425);
  });

  it('hashes like the reference (FNV-1a over the parts joined by |)', () => {
    expect(natureHash()).toBe(2166136261);
    expect(natureHash('a')).toBe(0xe40c292c);
    expect(natureHash(23, 1, 7, 0, 'role')).toBe(natureHash('23|1|7|0|role'));
  });

  it('the policy lists the 318 delivered sprites: three variants of every family', () => {
    expect(policy.assets).toHaveLength(318);
    const families = new Map<string, number>();
    for (const a of policy.assets) families.set(`${a.climate}.${a.role}`, (families.get(`${a.climate}.${a.role}`) ?? 0) + 1);
    expect(families.size).toBe(106);
    expect([...families.values()].every((n) => n === 3)).toBe(true);
  });
});

describe('water bodies: sea, lake, river (presentation only)', () => {
  it('tells a pond, a river, a large lake and the sea apart', () => {
    const w = classifyWater(mixedMap('temperate'));
    const kinds = w.components.map((c) => `${c.kind}:${c.area}`).sort();
    expect(kinds).toEqual(['lake:2', 'lake:40', 'river:11']);
    const sea = classifyWater(seaMap('coast'));
    expect(sea.components.map((c) => c.kind)).toEqual(['sea']);
  });

  it('a boundary water body is the sea only on coast and fjord maps, or when it is a large share of the map', () => {
    expect(classifyWater(seaMap('fjord')).components[0]!.kind).toBe('sea');
    // Half the map: the sea in any climate.
    expect(classifyWater(seaMap('desert')).components[0]!.kind).toBe('sea');
    // A narrow inlet from the edge in a temperate map: unknown, so no marine scenery.
    const rows = Array.from({ length: 20 }, (_, r) => Array.from({ length: 30 }, (_, q) => (q < 3 && r > 4 && r < 12 ? 'w' : 'p')).join(''));
    const inlet = classifyWater(mapOf(rows, 'temperate'));
    expect(inlet.components[0]!.boundary).toBe(true);
    expect(inlet.components[0]!.kind).toBeNull();
    // A one-wide channel reaching the edge is a river, never an ocean.
    const river = Array.from({ length: 20 }, (_, r) => Array.from({ length: 30 }, (_, q) => (q === 15 ? 'w' : 'p')).join(''));
    expect(classifyWater(mapOf(river, 'coast')).components[0]!.kind).toBe('river');
  });
});

describe('the map plan', () => {
  const ids = (items: readonly NatureItem[]) => items.map((i) => i.id);

  it('dresses every climate with its own art only (water: its sea profile or freshwater)', () => {
    for (const climate of policy.climates) {
      const plan = planNatureScenery(mixedMap(climate as WorldMapDefinition['biome']));
      expect(plan.supported).toBe(true);
      expect(plan.items.length).toBeGreaterThan(50);
      for (const it of plan.items) {
        const a = assetOf(it.id)!;
        expect(a, it.id).toBeTruthy();
        if (it.kind === 'water') expect(['freshwater', policy.seaProfiles[climate]]).toContain(a.climate);
        else expect(a.climate, it.id).toBe(climate);
      }
      // Every mountain tile carries one of the climate's three mountains.
      const m = plan.items.filter((i) => i.kind === 'mountain');
      expect(m.length).toBe(5 * 24);
      expect(new Set(ids(m)).size).toBe(3);
    }
  });

  it('is the same on every build of the same map, and leaves the map untouched', () => {
    const map = mixedMap('jungle');
    const before = JSON.stringify(map);
    const a = planNatureScenery(map);
    const b = planNatureScenery(mixedMap('jungle'));
    expect(JSON.stringify(a.items)).toBe(JSON.stringify(b.items));
    expect(JSON.stringify(map)).toBe(before);
    // Another seed changes the picks, not the logical map.
    const c = planNatureScenery(mixedMap('jungle', 12));
    expect(JSON.stringify(c.items)).not.toBe(JSON.stringify(a.items));
  });

  it('keeps freshwater free of sea life and boats out of small water; no lilies on rivers or in the cold', () => {
    for (const climate of policy.climates) {
      const plan = planNatureScenery(mixedMap(climate as WorldMapDefinition['biome']));
      for (const it of plan.items.filter((i) => i.kind === 'water')) {
        const body = plan.water.components[plan.water.componentOf[it.tile]!]!;
        const a = assetOf(it.id)!;
        expect(body.kind).not.toBeNull();
        if (body.kind !== 'sea') expect(a.climate).toBe('freshwater');
        if (body.area < 12) expect(a.role).not.toBe('boat');
        if (body.area < 40) expect(a.description).not.toMatch(/whale|dolphin/);
        if (body.kind === 'river') expect(it.id).not.toBe('nature.freshwater.water_life.02');
        expect(a.minWaterClearance).toBeLessThanOrEqual(plan.water.clearance[it.tile]!);
      }
    }
  });

  it('tundra’s ice-choked water carries no boats and nothing swimming', () => {
    const plan = planNatureScenery(seaMap('tundra'));
    const water = plan.items.filter((i) => i.kind === 'water');
    expect(water.length).toBeGreaterThan(0);
    for (const it of water) {
      expect(it.role).not.toBe('boat');
      if (it.role === 'water_life') expect(['nature.marine_frozen.water_life.01', 'nature.marine_frozen.water_life.02']).toContain(it.id);
    }
  });

  it('desert shores take rocks, never oasis papyrus, on the sea; coast and jungle take their salt-marsh plants', () => {
    for (const climate of ['desert', 'coast', 'jungle', 'fjord'] as const) {
      const plan = planNatureScenery(seaMap(climate));
      const shore = plan.items.filter((i) => i.kind === 'edge' && plan.water.componentOf[i.tile]! < 0);
      for (const it of shore) {
        const a = assetOf(it.id)!;
        // Clumps on the land next to the sea: salt-tolerant wet plants or the climate's rocky clumps.
        if (a.role === 'wet_edge') expect(a.saltwaterBankAllowed, it.id).toBe(true);
      }
    }
  });

  it('forests hold at most two big canopies a tile; borders at most two clumps a tile, never across a road', () => {
    const map = mixedMap('temperate');
    const plan = planNatureScenery(map);
    const per = new Map<string, number>();
    for (const it of plan.items) {
      const k = `${it.tile}|${it.role}|${it.kind}`;
      per.set(k, (per.get(k) ?? 0) + 1);
    }
    for (const [k, n] of per) {
      if (k.endsWith('|canopy|land')) expect(n).toBeLessThanOrEqual(2);
    }
    const edgesPerTile = new Map<number, number>();
    for (const it of plan.items.filter((i) => i.kind === 'edge')) edgesPerTile.set(it.tile, (edgesPerTile.get(it.tile) ?? 0) + 1);
    expect(edgesPerTile.size).toBeGreaterThan(10);
    for (const n of edgesPerTile.values()) expect(n).toBeLessThanOrEqual(2);
    // Plains on the road carry nothing.
    for (const it of plan.items) {
      const q = it.tile % map.width;
      const r = (it.tile - q) / map.width;
      if (r === 10 && map.terrain[it.tile] === 'p' && it.kind === 'land') throw new Error(`dressing on the road at ${q},${r}`);
    }
  });

  it('leaves map locations and town entrances clear (mountains stay)', () => {
    const map = mixedMap('autumn');
    const sites = [{ q: 7, r: 4 }, { q: 12, r: 6 }];
    const plan = planNatureScenery(map, { sites, towns: [{ q: 7, r: 4 }] });
    const W = map.width;
    for (const it of plan.items) {
      if (it.kind === 'mountain') continue;
      for (const s of sites) expect(it.tile).not.toBe(s.r * W + s.q);
    }
    const near = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]].map(([dq, dr]) => (4 + dr!) * W + 7 + dq!);
    for (const it of plan.items) if (near.includes(it.tile)) expect(LOW_DRESSING.has(it.role)).toBe(false);
  });

  it('honours the graphics quality: no low dressing below High, half the trees and rocks on Low, every mountain kept', () => {
    const map = mixedMap('moor');
    const all = planNatureScenery(map, { decor: 'all' });
    const medium = planNatureScenery(map, { decor: 'no-grass' });
    const low = planNatureScenery(map, { decor: 'sparse' });
    expect(medium.items.some((i) => LOW_DRESSING.has(i.role))).toBe(false);
    expect(low.items.some((i) => LOW_DRESSING.has(i.role))).toBe(false);
    const count = (p: typeof all, k: string) => p.items.filter((i) => i.kind === k).length;
    expect(count(medium, 'mountain')).toBe(count(all, 'mountain'));
    expect(count(low, 'mountain')).toBe(count(all, 'mountain'));
    expect(count(low, 'land')).toBeLessThan(count(medium, 'land'));
    expect(all.items.length).toBeGreaterThan(medium.items.length);
  });

  it('skips what is not imported; a climate without art keeps the generic decoration', () => {
    const none = planNatureScenery(mixedMap('desert'), { available: () => false });
    expect(none.supported).toBe(true);
    expect(new Set(ids(none.items))).toEqual(new Set(['mountain']));
    const unknown = planNatureScenery({ ...mixedMap('desert'), biome: 'volcanic' as WorldMapDefinition['biome'] });
    expect(unknown.supported).toBe(false);
    expect(unknown.items).toHaveLength(0);
  });

  it('prefers a variant its neighbours do not show', () => {
    const plan = planNatureScenery(mixedMap('temperate'));
    const m = plan.items.filter((i) => i.kind === 'mountain');
    const W = 30;
    let same = 0;
    let pairs = 0;
    const byTile = new Map(m.map((i) => [i.tile, i.id]));
    for (const it of m) {
      const q = it.tile % W;
      for (const [dq, dr] of [[1, 0], [0, 1], [-1, 1]] as const) {
        const j = it.tile + dr * W + dq;
        if (q + dq < 0 || q + dq >= W || !byTile.has(j)) continue;
        pairs++;
        if (byTile.get(j) === it.id) same++;
      }
    }
    // Three variants, picked at random, would repeat a third of the time.
    expect(same / pairs).toBeLessThan(0.2);
  });
});

describe('battlefield obstacles by climate', () => {
  it('stands the climate’s rock, deadwood or tree on each obstacle cell; columns and standing stones keep their art', () => {
    for (const climate of policy.climates) {
      for (const archetype of Object.keys(policy.battle)) {
        for (let col = 0; col < 15; col++) {
          const id = battleObstacleId(climate, archetype, { col, row: 5 }, null, 'b1', () => true)!;
          const a = assetOf(id)!;
          expect(a.climate).toBe(climate);
          expect(Object.keys(policy.battle[archetype]!)).toContain(a.role);
        }
        expect(battleObstacleId(climate, archetype, { col: 3, row: 4 }, 'column', 'b1', () => true)).toBeNull();
        expect(battleObstacleId(climate, archetype, { col: 3, row: 4 }, 'stone_circle', 'b1', () => true)).toBeNull();
      }
    }
    // No climate, or nothing imported: the generic stills (the view then falls back to a neutral boulder).
    expect(battleObstacleId(undefined, 'grove', { col: 1, row: 1 }, null, 'b1', () => true)).toBeNull();
    expect(battleObstacleId('desert', 'grove', { col: 1, row: 1 }, null, 'b1', () => false)).toBeNull();
    // The same battle draws the same stills.
    expect(battleObstacleId('desert', 'grove', { col: 4, row: 2 }, null, 'b1', () => true)).toBe(battleObstacleId('desert', 'grove', { col: 4, row: 2 }, null, 'b1', () => true));
  });
});

describe('the remembered plan', () => {
  it('returns the same plan for the same map and options, a new one when they change', async () => {
    const { planNatureSceneryCached } = await import('../src/nature');
    const map = mixedMap('coast');
    const a = planNatureSceneryCached(map, { decor: 'all', artKey: '318' });
    expect(planNatureSceneryCached(mixedMap('coast'), { decor: 'all', artKey: '318' })).toBe(a);
    expect(planNatureSceneryCached(map, { decor: 'no-grass', artKey: '318' })).not.toBe(a);
    expect(planNatureSceneryCached(map, { decor: 'all', artKey: '318', sites: [{ q: 3, r: 3 }] })).not.toBe(a);
    expect(JSON.stringify(planNatureSceneryCached(map, { decor: 'all', artKey: '318' }).items)).toBe(JSON.stringify(planNatureScenery(map, { decor: 'all' }).items));
  });
});
