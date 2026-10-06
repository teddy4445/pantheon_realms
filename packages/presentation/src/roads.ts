/**
 * Adventure-map roads (owner request 2026-10-05: roads that look good, and look
 * different by the land). The rules keep roads as tile-to-tile edges; here they
 * are joined into runs between junctions, rounded with corner cutting, and
 * drawn in the style of the map's climate: rutted dirt on grass, sandstone
 * flags in the desert, packed snow in the north, cobbles in the mountains —
 * and plank boardwalks wherever a road crosses a marsh. Pure geometry and
 * colours (no Pixi), so it is testable without a renderer.
 */

export interface RoadPoint {
  readonly x: number;
  readonly y: number;
}

/** Split road edges (`a|b` node keys) into runs: each run ends at a junction or a dead end; loops are closed runs. */
export function roadRuns(edges: readonly (readonly [string, string])[]): string[][] {
  const adj = new Map<string, string[]>();
  for (const [a, b] of edges) {
    if (a === b) continue;
    (adj.get(a) ?? adj.set(a, []).get(a)!).push(b);
    (adj.get(b) ?? adj.set(b, []).get(b)!).push(a);
  }
  for (const list of adj.values()) list.sort();
  const used = new Set<string>();
  const key = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);
  const runs: string[][] = [];
  const walk = (start: string, next: string) => {
    const run = [start, next];
    used.add(key(start, next));
    let prev = start;
    let cur = next;
    while ((adj.get(cur)?.length ?? 0) === 2 && cur !== start) {
      const nxt = adj.get(cur)!.find((n) => n !== prev && !used.has(key(cur, n)));
      if (!nxt) break;
      used.add(key(cur, nxt));
      run.push(nxt);
      prev = cur;
      cur = nxt;
    }
    runs.push(run);
  };
  // Runs start at junctions and dead ends (degree ≠ 2), in a stable order.
  for (const node of [...adj.keys()].sort()) {
    if (adj.get(node)!.length === 2) continue;
    for (const n of adj.get(node)!) if (!used.has(key(node, n))) walk(node, n);
  }
  // What is left are closed loops.
  for (const node of [...adj.keys()].sort()) for (const n of adj.get(node)!) if (!used.has(key(node, n))) walk(node, n);
  return runs;
}

/** Chaikin corner cutting: a rounded line through the same ends (closed runs stay closed). */
export function smoothRun(points: readonly RoadPoint[], iterations = 2): RoadPoint[] {
  let pts = [...points];
  for (let it = 0; it < iterations && pts.length > 2; it++) {
    const out: RoadPoint[] = [pts[0]!];
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i]!;
      const b = pts[i + 1]!;
      if (i > 0) out.push({ x: a.x * 0.75 + b.x * 0.25, y: a.y * 0.75 + b.y * 0.25 });
      if (i < pts.length - 2) out.push({ x: a.x * 0.25 + b.x * 0.75, y: a.y * 0.25 + b.y * 0.75 });
    }
    out.push(pts[pts.length - 1]!);
    pts = out;
  }
  return pts;
}

/** A line moved sideways by `d` (positive: to the right of the direction of travel). */
export function offsetRun(points: readonly RoadPoint[], d: number): RoadPoint[] {
  return points.map((p, i) => {
    const a = points[Math.max(0, i - 1)]!;
    const b = points[Math.min(points.length - 1, i + 1)]!;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    return { x: p.x - (dy / len) * d, y: p.y + (dx / len) * d };
  });
}

/** Evenly spaced marks along a line: position and unit direction. */
export function marksAlong(points: readonly RoadPoint[], spacing: number, phase = 0): { x: number; y: number; dx: number; dy: number }[] {
  const out: { x: number; y: number; dx: number; dy: number }[] = [];
  let carry = spacing - (phase % spacing);
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i]!;
    const b = points[i + 1]!;
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    if (len === 0) continue;
    const dx = (b.x - a.x) / len;
    const dy = (b.y - a.y) / len;
    let t = carry;
    while (t <= len) {
      out.push({ x: a.x + dx * t, y: a.y + dy * t, dx, dy });
      t += spacing;
    }
    carry = t - len;
  }
  return out;
}

export type RoadDetail = 'ruts' | 'flags' | 'cobbles';

export interface RoadStyle {
  /** Dark verge under the road. */
  readonly edge: number;
  readonly body: number;
  /** Worn, lighter middle. */
  readonly light: number;
  /** Ruts, joints or stones. */
  readonly mark: number;
  readonly detail: RoadDetail;
}

/** Road look per climate (biome): the land decides what a road is made of. */
export const ROAD_STYLES: Readonly<Record<string, RoadStyle>> = {
  temperate: { edge: 0x4f3c22, body: 0xb39561, light: 0xdcc391, mark: 0x6d5431, detail: 'ruts' },
  autumn: { edge: 0x553a1f, body: 0xb08654, light: 0xd9ae78, mark: 0x6a4826, detail: 'ruts' },
  coast: { edge: 0x6a5839, body: 0xcab585, light: 0xeedfb6, mark: 0x8a7550, detail: 'ruts' },
  moor: { edge: 0x392f22, body: 0x8a7859, light: 0xb19d77, mark: 0x4f4332, detail: 'ruts' },
  jungle: { edge: 0x4a2814, body: 0xa5623a, light: 0xcd8a5b, mark: 0x6a3a1e, detail: 'ruts' },
  desert: { edge: 0x8a693a, body: 0xd8bf8b, light: 0xf2e2b6, mark: 0x9c7c4a, detail: 'flags' },
  tundra: { edge: 0x56636f, body: 0xc5cfd8, light: 0xf2f6fa, mark: 0x8796a4, detail: 'ruts' },
  fjord: { edge: 0x56636f, body: 0xc5cfd8, light: 0xf2f6fa, mark: 0x8796a4, detail: 'ruts' },
  high_pass: { edge: 0x4a4640, body: 0xa39c90, light: 0xcbc4b8, mark: 0x5e5850, detail: 'cobbles' },
  storm_plateau: { edge: 0x3b3936, body: 0x8c8984, light: 0xb6b2ab, mark: 0x4c4945, detail: 'cobbles' },
};

export function roadStyleFor(biome: string): RoadStyle {
  return ROAD_STYLES[biome] ?? ROAD_STYLES['temperate']!;
}

/** Boardwalk planks over marsh. */
export const PLANK_COLOR = 0x6b4a2b;
export const PLANK_EDGE = 0x3a2817;

// ---------------------------------------------------------------------------
// Painted road tiles (GPT-6 Brief 16)
// ---------------------------------------------------------------------------

/**
 * The six edges of a pointy-top map hex, in the order of `hexPolygon`'s edges
 * (edge k joins corners k and k+1): east, south-east, south-west, west,
 * north-west, north-east. A road tile's connection mask has bit k set when the
 * road leaves the hex across edge k.
 */
export const ROAD_DIRS = ['e', 'se', 'sw', 'w', 'nw', 'ne'] as const;
export type RoadDir = (typeof ROAD_DIRS)[number];

/** The axial step to the neighbour across each edge (same order as ROAD_DIRS). */
export const ROAD_STEP: readonly (readonly [number, number])[] = [
  [1, 0],
  [0, 1],
  [-1, 1],
  [-1, 0],
  [0, -1],
  [1, -1],
];

/** The painted road types (one set of three sheets each), and the land each is used on. */
export const ROAD_TYPES = ['dirt', 'cobble', 'sand', 'snow', 'boardwalk'] as const;
export type RoadType = (typeof ROAD_TYPES)[number];

/** The sheets of a road type: a = ends, straights and bends; b = three-way crossings and the six-way; c = four- and five-way. */
export const ROAD_PARTS = ['a', 'b', 'c'] as const;
export type RoadPart = (typeof ROAD_PARTS)[number];

const bits = (...dirs: number[]) => dirs.reduce((m, d) => m | (1 << (d % 6)), 0);
const ALL = 0b111111;

/**
 * The 63 connection masks in sheet order (7 columns × 3 rows per sheet, row by
 * row). The guide generator (`tools/assets/briefs/road_guides.py`) writes the
 * same order into `assets-source/sprites/road-tiles.json`; a unit test keeps
 * the two equal.
 */
export function roadTileOrder(): Record<RoadPart, number[]> {
  const k6 = [0, 1, 2, 3, 4, 5];
  const a = [
    ...k6.map((k) => bits(k)), // dead ends
    bits(0, 3), bits(1, 4), bits(2, 5), // straights
    ...k6.map((k) => bits(k, k + 2)), // wide bends (120°)
    ...k6.map((k) => bits(k, k + 1)), // sharp bends (60°)
  ];
  const b = [
    bits(0, 2, 4), bits(1, 3, 5), // Y crossings
    ...k6.map((k) => bits(k, k + 1, k + 3)), // forks
    ...k6.map((k) => bits(k, k + 1, k + 4)), // forks, mirrored
    ...k6.map((k) => bits(k, k + 1, k + 2)), // fans
    ALL, // six-way
  ];
  const c = [
    ...[0, 1, 2].map((k) => ALL & ~bits(k, k + 3)), // X crossings
    ...k6.map((k) => ALL & ~bits(k, k + 2)),
    ...k6.map((k) => ALL & ~bits(k, k + 1)),
    ...k6.map((k) => ALL & ~bits(k)), // five-way
  ];
  return { a, b, c };
}

/** Where a mask sits: its sheet and its cell index there. */
export function roadTileSlot(mask: number): { part: RoadPart; index: number } | null {
  const order = roadTileOrder();
  for (const part of ROAD_PARTS) {
    const index = order[part].indexOf(mask);
    if (index >= 0) return { part, index };
  }
  return null;
}

/** The connection directions of a mask, e.g. `e-sw-nw` (the tile names in the brief). */
export function roadMaskName(mask: number): string {
  return ROAD_DIRS.filter((_, k) => mask & (1 << k)).join('-');
}

/**
 * The road type painted on a tile: boardwalks over marsh (and water) in every
 * climate; otherwise the climate's road — sandstone flags in the desert, packed
 * snow in the north, cobbles in the mountain climates and on rough ground —
 * and a dirt track everywhere else.
 */
export function roadTypeFor(biome: string, terrain: string): RoadType {
  if (terrain === 'marsh' || terrain === 'water') return 'boardwalk';
  if (biome === 'desert') return 'sand';
  if (biome === 'tundra' || biome === 'fjord') return 'snow';
  if (biome === 'high_pass' || biome === 'storm_plateau' || terrain === 'rough') return 'cobble';
  return 'dirt';
}

/** Road sheet geometry (shared with the guides and the importer). */
export const ROAD_SHEET = {
  /** Cell size in sheet pixels. */
  cell: 256,
  cols: 7,
  rows: 3,
  /** Width of the (pointy-top) hex inside a cell, between its vertical sides, in sheet pixels. */
  hexWidth: 224,
} as const;
