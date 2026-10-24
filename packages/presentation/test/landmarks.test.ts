import { describe, expect, it } from 'vitest';
import type { WorldMapDefinition } from '@pr/rules';
import { landmarkDistance, planLandmarks } from '../src/landmarks';

const map: WorldMapDefinition = {
  templateId: 'landmark-test', templateVersion: 1, generatorVersion: 'test', seed: 42, attempt: 0,
  mode: 'golden', width: 64, height: 44, logicalHash: 'test', biome: 'temperate',
  terrain: Array.from({ length: 64 * 44 }, (_, i) => {
    const q = i % 64;
    return q === 42 ? 'm' : q > 42 && q < 47 ? 'w' : q < 16 ? 'f' : 'p';
  }).join(''),
  roads: Array.from({ length: 63 }, (_, q) => `${q},22|${q + 1},22`),
};
const site = { coord: { q: 30, r: 14 }, archetype: 'town', variant: 'greek' };
describe('landmark placement', () => {
  it('is stable, sparse and leaves roads, sites and other landmarks clear', () => {
    const before = JSON.stringify(map);
    const plan = planLandmarks(map, [site], () => true);
    expect(plan).toEqual(planLandmarks(map, [site], () => true));
    expect(plan.length).toBeGreaterThan(3);
    expect(plan.length).toBeLessThanOrEqual(8);
    expect(new Set(plan.map(p => p.id.split('.')[1]!.split('-')[0]))).toEqual(new Set(['waterfall', 'tree', 'ruins', 'statue']));
    for (const a of plan) {
      expect(landmarkDistance(a.coord, site.coord)).toBeGreaterThanOrEqual(4);
      for (let q = 0; q < 64; q++) expect(landmarkDistance(a.coord, { q, r: 22 })).toBeGreaterThanOrEqual(3);
      for (const b of plan) if (a !== b) expect(landmarkDistance(a.coord, b.coord)).toBeGreaterThanOrEqual(8);
    }
    expect(JSON.stringify(map)).toBe(before);
  });
  it('places falls only on rocky water edges and requires both cells for fog reveal', () => {
    const falls = planLandmarks(map, [], () => true).filter(p => p.id.includes('waterfall'));
    expect(falls.length).toBeGreaterThan(0);
    for (const p of falls) {
      expect(map.terrain[p.coord.r * map.width + p.coord.q]).toBe('m');
      expect(p.reveal).toHaveLength(2);
      expect(map.terrain[p.reveal[1]!]).toBe('w');
    }
    expect(planLandmarks({ ...map, terrain: map.terrain.replaceAll('w', 'p') }, [], () => true).some(p => p.id.includes('waterfall'))).toBe(false);
  });
  it('respects climate, pantheon and missing assets', () => {
    for (const variant of ['greek', 'norse', 'egyptian', 'japanese', 'celtic', 'mesoamerican']) {
      const statues = planLandmarks(map, [{ ...site, variant }], () => true).filter(p => p.id.includes('statue'));
      expect(statues.length).toBeGreaterThan(0);
      expect(statues.every(p => p.id === `landmark.statue-${variant}`)).toBe(true);
    }
    const dry = planLandmarks({ ...map, biome: 'desert' }, [], () => true);
    expect(dry.some(p => p.id.includes('tree') || p.id.includes('waterfall'))).toBe(false);
    expect(dry.some(p => p.id === 'landmark.ruins-sandstone')).toBe(true);
    expect(planLandmarks(map, [site], () => false)).toEqual([]);
    expect(planLandmarks({ ...map, terrain: 'v'.repeat(map.terrain.length) }, [], () => true)).toEqual([]);
  });
});
