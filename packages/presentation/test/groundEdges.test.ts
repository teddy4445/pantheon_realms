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

describe('varied borders between lands (owner request 2026-10-07)', () => {
  const grounds: Terrain[] = ['marsh', 'plains', 'rough', 'forest', 'mountain', 'water'];
  const W = 24;
  const H = 18;
  // A patchwork of grounds (stable pseudo-random per hex).
  const terrainAt = (q: number, r: number): Terrain => grounds[((((Math.imul(q + 3, 2654435761) ^ Math.imul(r + 7, 40503)) >>> 0) >>> 7) + Math.floor(q / 3) + Math.floor(r / 2)) % grounds.length]!;

  it('keeps one piece per border; shores unchanged; varies reach, mirroring and who reaches', () => {
    const plain = planGroundEdges(W, H, terrainAt, ROAD_STEP, 3);
    const varied = planGroundEdges(W, H, terrainAt, ROAD_STEP, 3, { salt: 1234 });
    expect(varied.length).toBe(plain.length);
    const shores = (list: typeof plain) => list.filter((p) => p.character === 'shore').map((p) => `${p.q},${p.r},${p.k},${p.variant}`);
    expect(shores(varied)).toEqual(shores(plain));
    for (const p of varied.filter((x) => x.character === 'shore')) expect([p.depth, p.mirror]).toEqual([1, false]);
    const land = varied.filter((p) => p.character !== 'shore');
    const depths = land.map((p) => p.depth!);
    expect(Math.min(...depths)).toBeLessThan(1);
    expect(Math.max(...depths)).toBeGreaterThan(1.3);
    expect(new Set(land.map((p) => p.mirror)).size).toBe(2);
    // Some borders now reach back: the piece lies in the higher ground's hex.
    const reversed = land.filter((p) => groundReach(terrainAt(p.q, p.r), p.from) === null);
    expect(reversed.length).toBeGreaterThan(land.length * 0.1);
    expect(reversed.length).toBeLessThan(land.length * 0.4);
    for (const p of reversed) {
      expect(p.from).not.toBe('mountain');
      expect(terrainAt(p.q, p.r)).not.toBe('water');
      expect(terrainAt(p.q, p.r)).not.toBe('mountain');
    }
    // Every piece's reach lies in its character's range; the same map plans the same; another salt differs.
    for (const p of land) expect(p.depth!).toBeGreaterThanOrEqual(0.7);
    expect(planGroundEdges(W, H, terrainAt, ROAD_STEP, 3, { salt: 1234 })).toEqual(varied);
    expect(planGroundEdges(W, H, terrainAt, ROAD_STEP, 3, { salt: 99 })).not.toEqual(varied);
  });

  it('moves only the reach: the edge and its corners stay, depth scales the distance from the edge', () => {
    // A square-ish shape on the east edge (x = 0.5): a point on the edge and one 0.1 inside.
    const cell: [number, number[]][] = [[2, [0.5, -0.1, 0.5, 0.1, 0.4, 0.1, 0.4, -0.1]]];
    const data: GroundEdgesData = {
      schema: 'pantheon-realms-ground-edges-1',
      hexWidth: 224,
      levels: [{ level: 0.25, alpha: 0.35 }, { level: 0.5, alpha: 0.5 }, { level: 0.75, alpha: 1 }],
      priority: [],
      characters: Object.fromEntries(GROUND_CHARACTERS.map((c) => [c, Array.from({ length: 6 }, () => [cell, cell, cell])])),
    };
    const base = { q: 0, r: 0, k: 0, from: 'plains' as Terrain, character: 'meadow', variant: 0 };
    const deep = groundPieceOutlines(data, { ...base, depth: 1.5 }, 0, 0, 1)[0]!.points;
    expect(deep[0]).toBeCloseTo(0.5, 6);
    expect(deep[4]).toBeCloseTo(0.35, 6);
    expect(deep[5]).toBeCloseTo(0.1, 6);
    const flipped = groundPieceOutlines(data, { ...base, mirror: true }, 0, 0, 1)[0]!.points;
    expect(flipped[1]).toBeCloseTo(0.1, 6);
    expect(flipped[3]).toBeCloseTo(-0.1, 6);
    // Without variety: exactly as painted.
    expect(groundPieceOutlines(data, base, 0, 0, 1)[0]!.points).toEqual([0.5, -0.1, 0.5, 0.1, 0.4, 0.1, 0.4, -0.1]);
  });
});

describe('rounded corners between lands (owner request 2026-10-07)', () => {
  it('rounds most 2-against-1 corners of two land grounds, never water or void, stably', async () => {
    const { planGroundCorners, groundCornerOutlines } = await import('../src/groundEdges');
    // A plains field with single forest hexes and one water hex.
    const at = (q: number, r: number): Terrain => (q === 5 && r === 5 ? 'water' : (q * 7 + r * 3) % 11 === 0 ? 'forest' : 'plains');
    const corners = planGroundCorners(16, 12, at, ROAD_STEP, 5);
    expect(corners.length).toBeGreaterThan(20);
    for (const c of corners) {
      expect(at(c.q, c.r)).not.toBe('water');
      expect(c.from).not.toBe('water');
      expect(c.from).not.toBe(at(c.q, c.r));
      expect(c.radius).toBeGreaterThanOrEqual(0.18);
      expect(c.radius).toBeLessThanOrEqual(0.42);
    }
    expect(planGroundCorners(16, 12, at, ROAD_STEP, 5)).toEqual(corners);
    // Three soft levels, the outer one largest, centred on the hex corner.
    const out = groundCornerOutlines({ q: 0, r: 0, corner: 0, from: 'plains', radius: 0.3, seed: 1 }, 0, 0, 1, 3);
    expect(out.map((o) => o.level)).toEqual([0, 1, 2]);
    const span = (pts: number[]) => Math.max(...pts.filter((_, i) => i % 2 === 0)) - Math.min(...pts.filter((_, i) => i % 2 === 0));
    expect(span(out[0]!.points)).toBeGreaterThan(span(out[2]!.points));
    const cx = out[0]!.points.filter((_, i) => i % 2 === 0).reduce((a, b) => a + b, 0) / 18;
    expect(cx).toBeCloseTo(0.5, 1);
  });
});
