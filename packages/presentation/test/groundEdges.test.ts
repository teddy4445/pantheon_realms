import { describe, expect, it } from 'vitest';
import type { Terrain } from '@pr/rules';
import {
  GROUND_CHARACTERS,
  groundEdgesComplete,
  groundEdgesUsable,
  groundPieceOutlines,
  groundReach,
  groundVariant,
  planGroundEdges,
} from '../src/groundEdges';
import { ROAD_STEP } from '../src/roads';
import type { GroundEdgesData } from '../src/sprites';

describe('painted ground transitions (Brief 17)', () => {
  it('lets the higher ground reach into the lower one, and any land into water as a shore', () => {
    expect(groundReach('plains', 'forest')).toBe('woodland');
    expect(groundReach('forest', 'plains')).toBeNull();
    expect(groundReach('marsh', 'plains')).toBe('meadow');
    expect(groundReach('rough', 'mountain')).toBe('scree');
    expect(groundReach('plains', 'rough')).toBe('rocky');
    expect(groundReach('water', 'marsh')).toBe('shore');
    expect(groundReach('water', 'mountain')).toBe('shore');
    expect(groundReach('plains', 'water')).toBeNull();
    expect(groundReach('plains', 'plains')).toBeNull();
    expect(groundReach('void', 'forest')).toBeNull();
    expect(groundReach('plains', 'void')).toBeNull();
    // Between two different grounds exactly one side paints.
    const grounds: Terrain[] = ['water', 'marsh', 'plains', 'rough', 'forest', 'mountain'];
    for (const a of grounds) for (const b of grounds) if (a !== b) expect(Number(!!groundReach(a, b)) + Number(!!groundReach(b, a))).toBe(1);
  });

  it('picks a stable variant per hex and edge, using every row', () => {
    const seen = new Set<number>();
    for (let q = 0; q < 20; q++) for (let k = 0; k < 6; k++) {
      const v = groundVariant(q, 3, k, 3);
      expect(v).toBe(groundVariant(q, 3, k, 3));
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(3);
      seen.add(v);
    }
    expect(seen.size).toBe(3);
  });

  it('plans one piece per border edge, in the lower hex, facing the higher neighbour', () => {
    // 3 x 1 strip: forest | plains | water.
    const row: Terrain[] = ['forest', 'plains', 'water'];
    const pieces = planGroundEdges(3, 1, (q) => row[q]!, ROAD_STEP, 3);
    expect(pieces.map((p) => [p.q, p.k, p.character, p.from])).toEqual([
      [1, 3, 'woodland', 'forest'], // the plains hex, edge w (the forest lies west)
      [2, 3, 'shore', 'plains'], // the water hex, edge w
    ]);
  });

  it('needs all six mask sheets and well-formed outlines before painting', () => {
    expect(groundEdgesComplete(undefined)).toBe(false);
    expect(groundEdgesComplete({ file: 'x', status: 'final', characters: ['meadow', 'shore'], provenance: '' })).toBe(false);
    expect(groundEdgesComplete({ file: 'x', status: 'final', characters: [...GROUND_CHARACTERS], provenance: '' })).toBe(true);
    const cell: [number, number[]][] = [[2, [0.5, -0.1, 0.5, 0.1, 0.4, 0.1, 0.4, -0.1]]];
    const data: GroundEdgesData = {
      schema: 'pantheon-realms-ground-edges-1',
      hexWidth: 224,
      levels: [
        { level: 0.25, alpha: 0.35 },
        { level: 0.5, alpha: 0.5 },
        { level: 0.75, alpha: 1 },
      ],
      priority: [],
      characters: Object.fromEntries(GROUND_CHARACTERS.map((c) => [c, Array.from({ length: 6 }, () => [cell, cell, cell])])),
    };
    expect(groundEdgesUsable(data)).toBe(true);
    expect(groundEdgesUsable({ ...data, characters: { meadow: data.characters['meadow']! } })).toBe(false);
    const out = groundPieceOutlines(data, { q: 0, r: 0, k: 0, from: 'plains', character: 'meadow', variant: 1 }, 100, 50, 60);
    expect(out).toEqual([{ level: 2, points: [130, 44, 130, 56, 124, 56, 124, 44] }]);
  });
});
