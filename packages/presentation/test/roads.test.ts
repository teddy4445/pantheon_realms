import { describe, expect, it } from 'vitest';
import { ROAD_STYLES, marksAlong, offsetRun, roadRuns, roadStyleFor, smoothRun } from '../src/roads';

describe('adventure-map roads (2026-10-05)', () => {
  it('joins edges into runs between junctions and dead ends, each edge once', () => {
    // A T: a–b–c–d with a branch c–e.
    const runs = roadRuns([
      ['a', 'b'],
      ['b', 'c'],
      ['c', 'd'],
      ['c', 'e'],
    ]);
    const edges = runs.flatMap((r) => r.slice(1).map((n, i) => [r[i], n].sort().join('|'))).sort();
    expect(edges).toEqual(['a|b', 'b|c', 'c|d', 'c|e']);
    expect(runs.find((r) => r.includes('b'))).toEqual(['a', 'b', 'c']);
    // A loop with no junction is one closed run.
    const loop = roadRuns([
      ['a', 'b'],
      ['b', 'c'],
      ['c', 'a'],
    ]);
    expect(loop).toHaveLength(1);
    expect(loop[0]!.length).toBe(4);
  });

  it('rounds corners but keeps the ends; offsets run parallel; marks are evenly spaced', () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
    ];
    const s = smoothRun(pts, 2);
    expect(s[0]).toEqual(pts[0]);
    expect(s[s.length - 1]).toEqual(pts[2]);
    expect(s.some((p) => p.x === 10 && p.y === 0)).toBe(false);
    const o = offsetRun([{ x: 0, y: 0 }, { x: 10, y: 0 }], 2);
    expect(o.every((p) => p.y === 2)).toBe(true);
    expect(marksAlong([{ x: 0, y: 0 }, { x: 10, y: 0 }], 2.5).map((m) => m.x)).toEqual([2.5, 5, 7.5, 10]);
  });

  it('the land decides the road: dirt on grass, flagstones in the desert, snow in the north, cobbles in the mountains', () => {
    expect(roadStyleFor('temperate').detail).toBe('ruts');
    expect(roadStyleFor('desert').detail).toBe('flags');
    expect(roadStyleFor('high_pass').detail).toBe('cobbles');
    expect(roadStyleFor('tundra').body).not.toBe(roadStyleFor('temperate').body);
    expect(roadStyleFor('unknown')).toBe(ROAD_STYLES['temperate']);
    for (const b of ['temperate', 'autumn', 'coast', 'desert', 'fjord', 'high_pass', 'jungle', 'moor', 'storm_plateau', 'tundra']) expect(ROAD_STYLES[b], b).toBeDefined();
  });
});
