import { describe, expect, it } from 'vitest';
import { Container } from 'pixi.js';
import { planShoreLife, shoreLifeVisible } from '../src/mapLifePlan';
import { SiteLife } from '../src/mapLife';

describe('map life', () => {
  const map = { width: 12, height: 12, terrain: Array.from({ length: 144 }, (_, i) => i % 12 >= 6 ? 'w' : 'p').join('') };
  it('plans only land/water edges, once per water tile, with one dock per adjacent town', () => {
    const plan = planShoreLife(map, [{ q: 5, r: 5 }]);
    expect(plan).toEqual(planShoreLife(map, [{ q: 5, r: 5 }]));
    expect(plan.filter(p => p.dock)).toHaveLength(1);
    expect(new Set(plan.map(p => `${p.water.q},${p.water.r}`)).size).toBe(plan.length);
    for (const p of plan) {
      expect(map.terrain[p.water.r * 12 + p.water.q]).toBe('w');
      expect(map.terrain[p.land.r * 12 + p.land.q]).toBe('p');
      const a = p.land.r * 12 + p.land.q, b = p.water.r * 12 + p.water.q;
      expect(shoreLifeVisible(p, 12, new Set([a]))).toBe(false);
      expect(shoreLifeVisible(p, 12, new Set([b]))).toBe(false);
      expect(shoreLifeVisible(p, 12, new Set([a, b]))).toBe(true);
    }
  });
  it('leaves open ocean, void edges and drained shores empty, and caps large coastlines', () => {
    expect(planShoreLife({ ...map, terrain: 'w'.repeat(144) }, [])).toEqual([]);
    expect(planShoreLife({ ...map, terrain: 'p'.repeat(144) }, [])).toEqual([]);
    expect(planShoreLife({ ...map, terrain: Array.from({ length: 144 }, (_, i) => i % 2 ? 'w' : 'v').join('') }, [])).toEqual([]);
    expect(planShoreLife({ width: 200, height: 200, terrain: Array.from({ length: 40000 }, (_, i) => i % 2 ? 'w' : 'p').join('') }, []).length).toBeLessThanOrEqual(120);
  });
  it('freezes sails under reduced motion without accumulating invisible movement', () => {
    const parent = new Container();
    const life = new SiteLife('windmill', parent, 1);
    const rotor = life.root.children[0]!;
    const start = rotor.rotation;
    life.tick(100, true);
    expect(rotor.rotation).not.toBe(start);
    life.tick(100, false);
    const frozen = rotor.rotation;
    life.tick(1000, false);
    expect(rotor.rotation).toBe(frozen);
    parent.destroy({ children: true });
  });
});
