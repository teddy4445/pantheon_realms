import { describe, expect, it } from 'vitest';
import { buildCatalog } from '@pr/content';
import { generateMap } from '../src';

const catalog = buildCatalog();
const t = (id: string) => catalog.mapTemplates[id]!;

describe('golden campaign maps', () => {
  for (const [id, edges] of [
    ['three_beacons_m01_v1', 25],
    ['three_beacons_m02_v1', 43],
    ['three_beacons_m03_v1', 85],
  ] as const) {
    it(`${id} generates, validates and matches the reference road edge count`, () => {
      const res = generateMap(t(id));
      expect(res.report.valid).toBe(true);
      console.log(id, res.report.roadEdgeCount, res.map.logicalHash);
      expect(res.report.roadEdgeCount).toBe(edges);
    });
  }
});

describe('point-symmetric skirmish map', () => {
  it('Twin Harbors v2 is identical under a 180° rotation (terrain and roads), in golden and variation modes', () => {
    const tpl = t('skirmish_twin_harbors_v2');
    expect(tpl.symmetry).toBe('point');
    for (const [seed, mode] of [[tpl.goldenSeed, 'golden'], [7001, 'variation'], [7002, 'variation']] as const) {
      const res = generateMap(tpl, seed, mode);
      expect(res.report.valid).toBe(true);
      expect(res.report.checks.find((c) => c.id === 'SYM-01')?.pass).toBe(true);
      const { width: w, height: h, terrain } = res.map;
      for (let i = 0; i < w * h; i++) {
        const q = i % w, r = Math.floor(i / w);
        expect(terrain[i]).toBe(terrain[(h - 1 - r) * w + (w - 1 - q)]);
      }
    }
  });
});
