import { describe, expect, it } from 'vitest';
import { ROAD_STYLES, marksAlong, offsetRun, roadRuns, roadStyleFor, smoothRoadTypes, smoothRun, type RoadType } from '../src/roads';

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

describe('one road material per stretch (owner request 2026-10-07)', () => {
  const line = (n: number, r = 0) => Array.from({ length: n - 1 }, (_, i) => [`${i},${r}`, `${i + 1},${r}`] as const);
  it('a run takes the material most of its hexes ask for; boardwalks stay over marsh', () => {
    const raw: Record<string, RoadType> = { '0,0': 'dirt', '1,0': 'dirt', '2,0': 'cobble', '3,0': 'boardwalk', '4,0': 'dirt', '5,0': 'cobble', '6,0': 'dirt' };
    const out = smoothRoadTypes(line(7), (k) => raw[k]!);
    expect([...Array(7).keys()].map((i) => out.get(`${i},0`))).toEqual(['dirt', 'dirt', 'dirt', 'boardwalk', 'dirt', 'dirt', 'dirt']);
  });
  it('a mostly rough run is cobbled end to end; a junction takes the material of most meeting runs', () => {
    // Three arms meet at 3,0: west and east arms rough, the south arm grass.
    const edges = [...line(7), ['3,0', '3,1'] as const, ['3,1', '3,2'] as const, ['3,2', '3,3'] as const];
    const raw = (k: string): RoadType => (k.endsWith(',0') && k !== '1,0' ? 'cobble' : 'dirt');
    const out = smoothRoadTypes(edges, raw);
    for (const k of ['0,0', '1,0', '2,0', '4,0', '5,0', '6,0', '3,0']) expect(out.get(k), k).toBe('cobble');
    for (const k of ['3,1', '3,2', '3,3']) expect(out.get(k), k).toBe('dirt');
  });
  it('is the same whatever part of the map is explored (computed from every road)', () => {
    const raw = (k: string): RoadType => (k === '2,0' ? 'cobble' : 'dirt');
    expect(smoothRoadTypes(line(5), raw).get('2,0')).toBe('dirt');
  });
});
