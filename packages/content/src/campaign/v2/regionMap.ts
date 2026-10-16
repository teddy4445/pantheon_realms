/**
 * Region maps for campaign content v2 (campaign expansion handoff, 2026-10-15).
 *
 * A mission's map is authored as a region: ground painted by explicit operations
 * (lakes, rivers, ridges, forests, causeways) on a rectangle, and roads routed
 * between the sites they serve — town gates, bridge landings, ferry slips,
 * sluices and objective sites — never the old Restore/Hunt/… corridor templates
 * with their barrier columns. Authoring uses offset coordinates (column x, row
 * y) on a rectangle, so "north", "west" and "the far shore" read as they look on
 * screen; the compiler stores the map in the game's axial array with void
 * padding (as the random square maps do).
 *
 * Deterministic: the same spec always gives the same map. The checks below
 * (reachability, independent approaches) back the content tests.
 */
import { AXIAL_DIRECTIONS, TERRAIN_CODES, edgeKey, hexKey, type AuthoredMapDefinition, type HexCoord, type MapTemplateDefinition, type Terrain } from '@pr/rules';

export type Biome = MapTemplateDefinition['biome'];
/** Authoring position: [column, row] on the rectangle. */
export type XY = readonly [number, number];

export type PaintOp =
  /** Every cell within `radius` of the centre. */
  | { readonly t: Terrain; readonly disc: readonly [number, number, number] }
  /** A disc whose edge wanders by up to one cell (a natural lake, wood or ridge). */
  | { readonly t: Terrain; readonly blob: readonly [number, number, number] }
  /** A hex line through the points (rivers, ridges, causeways), widened by `width` cells. */
  | { readonly t: Terrain; readonly line: readonly XY[]; readonly width?: number }
  | { readonly t: Terrain; readonly cells: readonly XY[] }
  /** A rectangle of columns x0..x1 and rows y0..y1 (inclusive). */
  | { readonly t: Terrain; readonly rect: readonly [number, number, number, number] };

export interface RoadSpec {
  /** Site IDs or positions, joined in order by the cheapest walkable route. */
  readonly via: readonly (string | XY)[];
}

export interface RegionMapSpec {
  readonly id: string;
  readonly cols: number;
  readonly rows: number;
  readonly biome: Biome;
  readonly base: Terrain;
  /** The outer ring (default: water on coast-like biomes, mountain elsewhere). */
  readonly edge?: Terrain;
  readonly paint: readonly PaintOp[];
  /** Per-mille of plain cells turned to forest / rough for texture (never on roads or sites). */
  readonly texture?: { readonly forest?: number; readonly rough?: number };
  readonly roads: readonly RoadSpec[];
  readonly seed: number;
}

/** A site position for the compiler: its cell and whether roads may pass through it (crossings, gates). */
export interface SitePlacement {
  readonly id: string;
  readonly at: XY;
  /** Roads run through it (a bridge, an opened gate); other sites end a road. */
  readonly passThrough?: boolean;
  /** A town: roads leave from one gate cell next to it (`gate`, default the cell toward the map centre). */
  readonly town?: { readonly gate?: XY };
}

export const rowOffset = (rows: number) => Math.floor((rows - 1) / 2);

/** Offset [x, y] → the stored axial cell. */
export function toAxial(rows: number, [x, y]: XY): HexCoord {
  return { q: x - Math.floor(y / 2) + rowOffset(rows), r: y };
}

/** Stored axial cell → offset [x, y]. */
export function toXY(rows: number, c: HexCoord): XY {
  return [c.q + Math.floor(c.r / 2) - rowOffset(rows), c.r];
}

const cube = (c: HexCoord) => ({ x: c.q, z: c.r, y: -c.q - c.r });
const dist = (a: HexCoord, b: HexCoord) => (Math.abs(a.q - b.q) + Math.abs(a.r - b.r) + Math.abs(a.q + a.r - b.q - b.r)) / 2;

function cubeRound(x: number, y: number, z: number): HexCoord {
  let rx = Math.round(x);
  let ry = Math.round(y);
  let rz = Math.round(z);
  const dx = Math.abs(rx - x);
  const dy = Math.abs(ry - y);
  const dz = Math.abs(rz - z);
  if (dx > dy && dx > dz) rx = -ry - rz;
  else if (dy > dz) ry = -rx - rz;
  else rz = -rx - ry;
  void ry;
  return { q: rx, r: rz };
}

function hexLine(a: HexCoord, b: HexCoord): HexCoord[] {
  const n = dist(a, b);
  const ca = cube(a);
  const cb = cube(b);
  const out: HexCoord[] = [];
  for (let i = 0; i <= n; i++) {
    const t = n === 0 ? 0 : i / n;
    // A tiny nudge keeps ties on one side (stable lines).
    out.push(cubeRound(ca.x + (cb.x - ca.x) * t + 1e-6, ca.y + (cb.y - ca.y) * t + 1e-6, ca.z + (cb.z - ca.z) * t - 2e-6));
  }
  return out;
}

/** A tiny deterministic hash for wandering blob edges and texture. */
function hash(seed: number, a: number, b: number): number {
  let h = (seed ^ (a * 374761393) ^ (b * 668265263)) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export interface CompiledRegionMap {
  readonly map: AuthoredMapDefinition;
  readonly width: number;
  /** Site ID → stored axial cell. */
  readonly coords: Readonly<Record<string, HexCoord>>;
  /** Town site ID → its gate cell. */
  readonly gates: Readonly<Record<string, HexCoord>>;
}

const COST: Record<Terrain, number | null> = { plains: 100, forest: 125, rough: 125, marsh: 150, mountain: null, water: null, void: null };

export function compileRegionMap(spec: RegionMapSpec, sites: readonly SitePlacement[]): CompiledRegionMap {
  const { cols, rows } = spec;
  const off = rowOffset(rows);
  const width = cols + off;
  const height = rows;
  const inRect = (c: HexCoord) => {
    if (c.r < 0 || c.r >= rows) return false;
    const x = c.q + Math.floor(c.r / 2) - off;
    return x >= 0 && x < cols && c.q >= 0 && c.q < width;
  };
  const idx = (c: HexCoord) => c.r * width + c.q;
  const terrain: Terrain[] = new Array(width * height).fill('void');
  const ax = (p: XY) => toAxial(rows, p);
  const edge = spec.edge ?? (spec.biome === 'coast' || spec.biome === 'fjord' ? 'water' : 'mountain');
  for (let r = 0; r < height; r++) {
    for (let q = 0; q < width; q++) {
      const c = { q, r };
      if (!inRect(c)) continue;
      const [x, y] = toXY(rows, c);
      terrain[idx(c)] = x === 0 || y === 0 || x === cols - 1 || y === rows - 1 ? edge : spec.base;
    }
  }
  const set = (c: HexCoord, t: Terrain) => {
    if (!inRect(c)) return;
    const [x, y] = toXY(rows, c);
    // The outer ring stays the edge terrain, so nothing walks off the map.
    if (x === 0 || y === 0 || x === cols - 1 || y === rows - 1) return;
    terrain[idx(c)] = t;
  };
  const around = (c: HexCoord, radius: number) => {
    const out: HexCoord[] = [];
    for (let dq = -radius; dq <= radius; dq++) for (let dr = Math.max(-radius, -dq - radius); dr <= Math.min(radius, -dq + radius); dr++) out.push({ q: c.q + dq, r: c.r + dr });
    return out;
  };
  for (const op of spec.paint) {
    if ('disc' in op) for (const c of around(ax([op.disc[0], op.disc[1]]), op.disc[2])) set(c, op.t);
    else if ('blob' in op) {
      const centre = ax([op.blob[0], op.blob[1]]);
      for (const c of around(centre, op.blob[2] + 1)) {
        const d = dist(centre, c);
        const wobble = hash(spec.seed, c.q * 7 + 1, c.r * 13 + 3) < 0.5 ? 0 : 1;
        if (d <= op.blob[2] - 1 || d <= op.blob[2] - 1 + wobble) set(c, op.t);
      }
    } else if ('line' in op) {
      for (let i = 0; i + 1 < op.line.length; i++) {
        for (const c of hexLine(ax(op.line[i]!), ax(op.line[i + 1]!))) for (const n of around(c, op.width ?? 0)) set(n, op.t);
      }
      if (op.line.length === 1) for (const n of around(ax(op.line[0]!), op.width ?? 0)) set(n, op.t);
    } else if ('cells' in op) for (const p of op.cells) set(ax(p), op.t);
    else if ('rect' in op) {
      const [x0, y0, x1, y1] = op.rect;
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(ax([x, y]), op.t);
    }
  }
  // Sites stand on walkable ground (a town too: its tile is a building, its gate a road end).
  const coords: Record<string, HexCoord> = {};
  const siteCells = new Map<string, SitePlacement>();
  for (const s of sites) {
    const c = ax(s.at);
    if (!inRect(c)) throw new Error(`${spec.id}: site ${s.id} at [${s.at}] is off the map`);
    const k = hexKey(c);
    if (siteCells.has(k)) throw new Error(`${spec.id}: sites ${siteCells.get(k)!.id} and ${s.id} share [${s.at}]`);
    siteCells.set(k, s);
    coords[s.id] = c;
    if (COST[terrain[idx(c)]!] === null) terrain[idx(c)] = 'plains';
  }
  // Town gates: the named cell, else the walkable neighbour nearest the map centre.
  const centre = ax([Math.floor(cols / 2), Math.floor(rows / 2)]);
  const gates: Record<string, HexCoord> = {};
  for (const s of sites) {
    if (!s.town) continue;
    const t = coords[s.id]!;
    let g = s.town.gate ? ax(s.town.gate) : null;
    if (!g) {
      const options = AXIAL_DIRECTIONS.map((d) => ({ q: t.q + d.q, r: t.r + d.r })).filter((n) => inRect(n) && !siteCells.has(hexKey(n)));
      options.sort((a, b) => dist(a, centre) - dist(b, centre) || a.r - b.r || a.q - b.q);
      g = options[0] ?? null;
    }
    if (!g || dist(g, t) !== 1) throw new Error(`${spec.id}: town ${s.id} needs a gate cell next to it`);
    if (siteCells.has(hexKey(g))) throw new Error(`${spec.id}: the gate of ${s.id} is taken by a site`);
    if (COST[terrain[idx(g)]!] === null) terrain[idx(g)] = 'plains';
    gates[s.id] = g;
  }
  // Texture: a sprinkle of wood and rough ground on open plains (never on site or gate cells).
  const reserved = new Set<string>([...siteCells.keys(), ...Object.values(gates).map(hexKey)]);
  if (spec.texture) {
    for (let r = 0; r < height; r++) {
      for (let q = 0; q < width; q++) {
        const c = { q, r };
        if (!inRect(c) || terrain[idx(c)] !== 'plains' || reserved.has(hexKey(c))) continue;
        const v = hash(spec.seed + 11, q, r) * 1000;
        if (v < (spec.texture.forest ?? 0)) terrain[idx(c)] = 'forest';
        else if (v < (spec.texture.forest ?? 0) + (spec.texture.rough ?? 0)) terrain[idx(c)] = 'rough';
      }
    }
  }
  // Roads: cheapest walkable routes, through other sites only where they let a road pass.
  const roads = new Set<string>();
  const roadCells = new Set<string>();
  const endpoint = (v: string | XY): { cell: HexCoord; from?: HexCoord } => {
    if (typeof v !== 'string') return { cell: ax(v) };
    const c = coords[v];
    if (!c) throw new Error(`${spec.id}: road names unknown site ${v}`);
    const g = gates[v];
    // A town's road starts at its gate (the town tile itself joins it by one road edge).
    return g ? { cell: g, from: c } : { cell: c };
  };
  const passableFor = (c: HexCoord, goal: HexCoord) => {
    if (!inRect(c) || COST[terrain[idx(c)]!] === null) return false;
    const s = siteCells.get(hexKey(c));
    if (s && !s.passThrough && hexKey(c) !== hexKey(goal)) return false;
    if (Object.values(gates).some((g) => hexKey(g) === hexKey(c)) && hexKey(c) !== hexKey(goal)) {
      // Other towns' gates are fine to pass (they are ordinary road cells).
      return true;
    }
    return true;
  };
  const route = (a: HexCoord, b: HexCoord): HexCoord[] => {
    const open: { k: string; c: HexCoord; f: number; g: number }[] = [{ k: hexKey(a), c: a, f: dist(a, b) * 75, g: 0 }];
    const best = new Map<string, number>([[hexKey(a), 0]]);
    const prev = new Map<string, string>();
    const at = new Map<string, HexCoord>([[hexKey(a), a]]);
    const goal = hexKey(b);
    while (open.length > 0) {
      open.sort((x, y) => x.f - y.f || (x.k < y.k ? -1 : 1));
      const cur = open.shift()!;
      if (cur.k === goal) break;
      if ((best.get(cur.k) ?? Infinity) < cur.g) continue;
      for (const d of AXIAL_DIRECTIONS) {
        const n = { q: cur.c.q + d.q, r: cur.c.r + d.r };
        if (!passableFor(n, b)) continue;
        const k = hexKey(n);
        // Existing road is cheaper: roads share trunks instead of running in parallel.
        const step = roads.has(edgeKey(cur.c, n)) || roadCells.has(k) ? 60 : COST[terrain[idx(n)]!]!;
        const g = cur.g + step;
        if (g >= (best.get(k) ?? Infinity)) continue;
        best.set(k, g);
        prev.set(k, cur.k);
        at.set(k, n);
        open.push({ k, c: n, g, f: g + dist(n, b) * 60 });
      }
    }
    if (!best.has(goal)) throw new Error(`${spec.id}: no walkable road from [${toXY(rows, a)}] to [${toXY(rows, b)}]`);
    const path: HexCoord[] = [b];
    let k = goal;
    while (prev.has(k)) {
      k = prev.get(k)!;
      path.unshift(at.get(k)!);
    }
    return path;
  };
  for (const r of spec.roads) {
    for (let i = 0; i + 1 < r.via.length; i++) {
      const a = endpoint(r.via[i]!);
      const b = endpoint(r.via[i + 1]!);
      if (a.from) roads.add(edgeKey(a.from, a.cell));
      if (b.from) roads.add(edgeKey(b.from, b.cell));
      const path = route(a.cell, b.cell);
      for (let j = 0; j + 1 < path.length; j++) roads.add(edgeKey(path[j]!, path[j + 1]!));
      for (const c of path) roadCells.add(hexKey(c));
    }
  }
  // Every road cell is walkable ground (painting may have put wood on it: keep wood, it is walkable).
  const rowsOut: string[] = [];
  for (let r = 0; r < height; r++) {
    let line = '';
    for (let q = 0; q < width; q++) line += TERRAIN_CODES[terrain[r * width + q]!];
    rowsOut.push(line);
  }
  return {
    map: { id: spec.id, version: 1, width, height, rows: rowsOut, roads: [...roads].sort(), biome: spec.biome, seed: spec.seed },
    width,
    coords,
    gates,
  };
}

// ---------------------------------------------------------------------------
// Checks (content tests): walkable reachability and independent approaches
// ---------------------------------------------------------------------------

export interface MapGraph {
  readonly width: number;
  readonly height: number;
  readonly walkable: (c: HexCoord) => boolean;
}

export function mapGraph(map: AuthoredMapDefinition, blocked: ReadonlySet<string> = new Set()): MapGraph {
  const terrain = map.rows.join('');
  return {
    width: map.width,
    height: map.height,
    walkable: (c) => {
      if (c.q < 0 || c.r < 0 || c.q >= map.width || c.r >= map.height) return false;
      const t = terrain[c.r * map.width + c.q];
      return t !== 'w' && t !== 'm' && t !== 'v' && !blocked.has(hexKey(c));
    },
  };
}

export function reachableFrom(g: MapGraph, from: HexCoord): Set<string> {
  const seen = new Set<string>([hexKey(from)]);
  const queue = [from];
  while (queue.length > 0) {
    const c = queue.shift()!;
    for (const d of AXIAL_DIRECTIONS) {
      const n = { q: c.q + d.q, r: c.r + d.r };
      const k = hexKey(n);
      if (seen.has(k) || !g.walkable(n)) continue;
      seen.add(k);
      queue.push(n);
    }
  }
  return seen;
}

/**
 * The number of routes from `a` to `b` that share no cell (besides the ends): the
 * independent approaches to an objective. Unit vertex capacities, max flow (BFS
 * augmenting paths), capped at `cap`.
 */
export function independentApproaches(g: MapGraph, a: HexCoord, b: HexCoord, cap = 3): number {
  // Split every cell into in/out nodes joined by capacity 1 (ends unlimited).
  const key = (c: HexCoord, side: 0 | 1) => `${c.q},${c.r},${side}`;
  const flow = new Map<string, number>();
  const cell = (k: string): HexCoord => {
    const [q, r] = k.split(',').map(Number);
    return { q: q!, r: r! };
  };
  const ends = new Set([hexKey(a), hexKey(b)]);
  const capacity = (u: string, v: string): number => {
    const [uq, ur, us] = u.split(',').map(Number);
    const [vq, vr, vs] = v.split(',').map(Number);
    if (uq === vq && ur === vr) return us === 0 && vs === 1 ? (ends.has(`${uq},${ur}`) ? 99 : 1) : 0;
    return us === 1 && vs === 0 ? 99 : 0;
  };
  const neighbours = (u: string): string[] => {
    const [q, r, s] = u.split(',').map(Number);
    const c = { q: q!, r: r! };
    const out: string[] = [s === 0 ? key(c, 1) : key(c, 0)];
    for (const d of AXIAL_DIRECTIONS) {
      const n = { q: c.q + d.q, r: c.r + d.r };
      if (!g.walkable(n)) continue;
      out.push(s === 1 ? key(n, 0) : key(n, 1));
    }
    return out;
  };
  const residual = (u: string, v: string) => capacity(u, v) - (flow.get(`${u}>${v}`) ?? 0) + (flow.get(`${v}>${u}`) ?? 0);
  const source = key(a, 1);
  const sink = key(b, 0);
  let total = 0;
  while (total < cap) {
    const prev = new Map<string, string>([[source, '']]);
    const queue = [source];
    while (queue.length > 0 && !prev.has(sink)) {
      const u = queue.shift()!;
      for (const v of neighbours(u)) {
        if (prev.has(v) || !g.walkable(cell(v))) continue;
        if (residual(u, v) <= 0) continue;
        prev.set(v, u);
        queue.push(v);
      }
    }
    if (!prev.has(sink)) break;
    let v = sink;
    while (v !== source) {
      const u = prev.get(v)!;
      const back = flow.get(`${v}>${u}`) ?? 0;
      if (back > 0) flow.set(`${v}>${u}`, back - 1);
      else flow.set(`${u}>${v}`, (flow.get(`${u}>${v}`) ?? 0) + 1);
      v = u;
    }
    total += 1;
  }
  return total;
}
