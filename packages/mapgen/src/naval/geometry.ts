/**
 * Hex geometry for the naval templates (centered axial coordinates, the map center at 0,0):
 * rotations, discs, angles, connected components and Menger's vertex-disjoint path count (unit
 * vertex capacities, Edmonds-Karp). Pure functions; no randomness.
 */
import { AXIAL_DIRECTIONS, axialDistance, axialNeighbors, hexKey, parseHexKey, type HexCoord } from '@pr/rules';

export type Transform = (c: HexCoord) => HexCoord;

/** 60° rotation about the center: axial (q, r) -> (-r, q + r). */
export const rot1: Transform = (c) => ({ q: -c.r, r: c.q + c.r });
export const identityT: Transform = (c) => ({ q: c.q, r: c.r });

export function rotN(n: number): Transform {
  const k = ((n % 6) + 6) % 6;
  return (c) => {
    let x = c;
    for (let i = 0; i < k; i++) x = rot1(x);
    return x;
  };
}

export const ORIGIN: HexCoord = { q: 0, r: 0 };
export const originDistance = (c: HexCoord): number => axialDistance(c, ORIGIN);

export function dir(i: number): HexCoord {
  return AXIAL_DIRECTIONS[((i % 6) + 6) % 6]!;
}

export const add = (a: HexCoord, b: HexCoord, k = 1): HexCoord => ({ q: a.q + b.q * k, r: a.r + b.r * k });

/** Every cell within `radius` of `center` (stable order: r, then q). */
export function disc(center: HexCoord, radius: number): HexCoord[] {
  const out: HexCoord[] = [];
  for (let dr = -radius; dr <= radius; dr++) {
    for (let dq = Math.max(-radius, -dr - radius); dq <= Math.min(radius, -dr + radius); dq++) out.push({ q: center.q + dq, r: center.r + dr });
  }
  return out;
}

/** Screen-like coordinates (pointy axial): x = q + r/2, y = r·√3/2. */
export function pixel(c: HexCoord): { x: number; y: number } {
  return { x: c.q + c.r / 2, y: (c.r * Math.sqrt(3)) / 2 };
}

/** Angle of `c` seen from `center`, degrees in [0, 360). */
export function angleFrom(center: { x: number; y: number }, c: HexCoord): number {
  const p = pixel(c);
  const a = (Math.atan2(p.y - center.y, p.x - center.x) * 180) / Math.PI;
  return a < 0 ? a + 360 : a;
}

export function centroid(cells: readonly HexCoord[]): { x: number; y: number } {
  let x = 0;
  let y = 0;
  for (const c of cells) {
    const p = pixel(c);
    x += p.x;
    y += p.y;
  }
  return { x: x / Math.max(1, cells.length), y: y / Math.max(1, cells.length) };
}

export const byKey = (a: HexCoord, b: HexCoord): number => (a.r - b.r) || (a.q - b.q);

/** Connected components of a cell set (each component sorted, components by their first cell). */
export function components(cells: ReadonlySet<string>): string[][] {
  const seen = new Set<string>();
  const out: string[][] = [];
  const keys = [...cells].sort((a, b) => byKey(parseHexKey(a), parseHexKey(b)));
  for (const k of keys) {
    if (seen.has(k)) continue;
    const comp: string[] = [];
    const stack = [k];
    seen.add(k);
    while (stack.length) {
      const cur = stack.pop()!;
      comp.push(cur);
      for (const n of axialNeighbors(parseHexKey(cur))) {
        const nk = hexKey(n);
        if (cells.has(nk) && !seen.has(nk)) {
          seen.add(nk);
          stack.push(nk);
        }
      }
    }
    out.push(comp.sort((a, b) => byKey(parseHexKey(a), parseHexKey(b))));
  }
  return out;
}

/** Cells reachable from `from` through `passable` (from itself is included when passable or forced). */
export function flood(from: readonly string[], passable: (k: string) => boolean): Set<string> {
  const seen = new Set<string>(from);
  const stack = [...from];
  while (stack.length) {
    const cur = stack.pop()!;
    for (const n of axialNeighbors(parseHexKey(cur))) {
      const nk = hexKey(n);
      if (!seen.has(nk) && passable(nk)) {
        seen.add(nk);
        stack.push(nk);
      }
    }
  }
  return seen;
}

/** Breadth-first step distances from `from` through `passable` cells. */
export function stepDistances(from: readonly string[], passable: (k: string) => boolean): Map<string, number> {
  const dist = new Map<string, number>();
  let frontier = [...new Set(from)];
  for (const k of frontier) dist.set(k, 0);
  let d = 0;
  while (frontier.length) {
    d++;
    const next: string[] = [];
    for (const cur of frontier) {
      for (const n of axialNeighbors(parseHexKey(cur))) {
        const nk = hexKey(n);
        if (dist.has(nk) || !passable(nk)) continue;
        dist.set(nk, d);
        next.push(nk);
      }
    }
    frontier = next;
  }
  return dist;
}

/**
 * Menger: the most internally vertex-disjoint paths (at most `limit`) from any cell of `sources`
 * to any cell of `sinks` through `nodes` (every node may carry one path; sources and sinks any
 * number). Paths may start and end at different cells of the two sets but never share an inner
 * cell. Deterministic (canonical neighbor order, BFS augmenting paths).
 */
export function vertexDisjointPaths(nodes: ReadonlySet<string>, sources: readonly string[], sinks: readonly string[], limit = 2): number {
  const src = new Set(sources.filter((k) => nodes.has(k)));
  const snk = new Set(sinks.filter((k) => nodes.has(k)));
  if (src.size === 0 || snk.size === 0) return 0;
  for (const k of src) if (snk.has(k)) return limit;
  const list = [...nodes].sort();
  const index = new Map<string, number>();
  list.forEach((k, i) => index.set(k, i));
  // Node i: in = 2i, out = 2i + 1; super source S = 2n, super sink T = 2n + 1.
  const n = list.length;
  const S = 2 * n;
  const T = 2 * n + 1;
  const head: number[] = new Array(2 * n + 2).fill(-1);
  const to: number[] = [];
  const cap: number[] = [];
  const next: number[] = [];
  const addEdge = (u: number, v: number, c: number) => {
    to.push(v);
    cap.push(c);
    next.push(head[u]!);
    head[u] = to.length - 1;
    to.push(u);
    cap.push(0);
    next.push(head[v]!);
    head[v] = to.length - 1;
  };
  const BIG = 1 << 20;
  for (let i = 0; i < n; i++) {
    const k = list[i]!;
    const terminal = src.has(k) || snk.has(k);
    addEdge(2 * i, 2 * i + 1, terminal ? BIG : 1);
    for (const nb of axialNeighbors(parseHexKey(k))) {
      const j = index.get(hexKey(nb));
      if (j !== undefined) addEdge(2 * i + 1, 2 * j, 1);
    }
    if (src.has(k)) addEdge(S, 2 * i, BIG);
    if (snk.has(k)) addEdge(2 * i + 1, T, BIG);
  }
  let flow = 0;
  const prevEdge: number[] = new Array(2 * n + 2);
  while (flow < limit) {
    prevEdge.fill(-1);
    const seen = new Uint8Array(2 * n + 2);
    seen[S] = 1;
    const queue = [S];
    let found = false;
    for (let qi = 0; qi < queue.length && !found; qi++) {
      const u = queue[qi]!;
      for (let e = head[u]!; e !== -1; e = next[e]!) {
        const v = to[e]!;
        if (cap[e]! <= 0 || seen[v]) continue;
        seen[v] = 1;
        prevEdge[v] = e;
        if (v === T) {
          found = true;
          break;
        }
        queue.push(v);
      }
    }
    if (!found) break;
    for (let v = T; v !== S; ) {
      const e = prevEdge[v]!;
      cap[e] = cap[e]! - 1;
      cap[e ^ 1] = cap[e ^ 1]! + 1;
      v = to[e ^ 1]!;
    }
    flow++;
  }
  return flow;
}

/** The smallest distance between a cell of `a` and a cell of `b` (Infinity when either is empty). */
export function setDistance(a: readonly HexCoord[], b: readonly HexCoord[]): number {
  let best = Number.POSITIVE_INFINITY;
  for (const x of a) for (const y of b) best = Math.min(best, axialDistance(x, y));
  return best;
}
