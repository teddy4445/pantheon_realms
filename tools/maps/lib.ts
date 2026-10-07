/**
 * Symmetric map authoring (development tool; never packaged in the game).
 *
 * A map is designed for empire 1 only, in "hex units" around a centre hex
 * (x in hex widths to the right, y downward; a row is √3/2 hex widths), and
 * copied to the other empires by exact hex-grid symmetries: a half turn for two
 * empires, turns of 120° or 60° for three or six, a mirror plus a half turn for
 * four. Every terrain layer is painted for all copies before the next layer, and
 * each copy is evaluated on the same pre-image cell, so the result is exactly
 * symmetric; cells whose copies fall off the rectangle become the map edge.
 */
import { TERRAIN_CODES, axialNeighbors, edgeKey, hexKey, type CustomMapDocument, type CustomSite, type CustomSiteKind, type HexCoord, type Terrain } from '@pr/rules';
import { customInRect, customRowOffset } from '@pr/mapgen';

export const ROW = Math.sqrt(3) / 2;

export interface Pt {
  readonly x: number;
  readonly y: number;
}

/** Hex-unit point of `col` hex widths right and `row` rows down from the centre. */
export const at = (col: number, row: number): Pt => ({ x: col, y: row * ROW });
/** Polar point: `deg` clockwise from east (screen angles, y down). */
export const polar = (radius: number, deg: number): Pt => ({ x: radius * Math.cos((deg * Math.PI) / 180), y: radius * Math.sin((deg * Math.PI) / 180) });
export const dist = (a: Pt, b: Pt = { x: 0, y: 0 }) => Math.hypot(a.x - b.x, a.y - b.y);
export const angleOf = (p: Pt) => (Math.atan2(p.y, p.x) * 180) / Math.PI;
/** Smallest difference of two angles in degrees. */
export const angleDiff = (a: number, b: number) => Math.abs((((a - b) % 360) + 540) % 360 - 180);
/** Distance from p to the segment ab. */
export function segDist(p: Pt, a: Pt, b: Pt): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

// --- Noise (deterministic value noise in hex units) ---------------------------
function hash2(i: number, j: number, seed: number): number {
  let h = (i * 374761393 + j * 668265263 + seed * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
/** Smooth value noise in [0, 1). */
export function noise(p: Pt, scale: number, seed: number): number {
  const x = p.x / scale;
  const y = p.y / scale;
  const i = Math.floor(x);
  const j = Math.floor(y);
  const fx = x - i;
  const fy = y - j;
  const s = (t: number) => t * t * (3 - 2 * t);
  const a = hash2(i, j, seed);
  const b = hash2(i + 1, j, seed);
  const c = hash2(i, j + 1, seed);
  const d = hash2(i + 1, j + 1, seed);
  return a + (b - a) * s(fx) + (c - a) * s(fy) + (a - b - c + d) * s(fx) * s(fy);
}

// --- Symmetry groups ---------------------------------------------------------------
type Op = (d: HexCoord) => HexCoord;
const rot60: Op = (d) => ({ q: -d.r, r: d.q + d.r });
const mirror: Op = (d) => ({ q: -d.q - d.r, r: d.r });
const pow = (f: Op, n: number): Op => (d) => {
  let x = d;
  for (let i = 0; i < n; i++) x = f(x);
  return x;
};
interface Sym {
  readonly apply: Op;
  readonly inverse: Op;
}
/**
 * The copies for each empire: 2 → half turn; 3 → turns of 120° (clockwise on screen);
 * 4 → itself, mirrored left–right, half turn, mirrored top–bottom; 6 → turns of 60°.
 */
export function symmetries(empires: 2 | 3 | 4 | 6): readonly Sym[] {
  const rot = (k: number): Sym => ({ apply: pow(rot60, k % 6), inverse: pow(rot60, (6 - (k % 6)) % 6) });
  if (empires === 2) return [rot(0), rot(3)];
  if (empires === 3) return [rot(0), rot(2), rot(4)];
  if (empires === 6) return [0, 1, 2, 3, 4, 5].map(rot);
  const half = pow(rot60, 3);
  const vr: Op = (d) => mirror(half(d));
  return [rot(0), { apply: mirror, inverse: mirror }, rot(3), { apply: vr, inverse: vr }];
}

// --- The map under construction ----------------------------------------------------
export interface SiteSpec {
  /** Base ID; empire copies get `_1`, `_2`, … (a site its copies map onto itself keeps the plain ID). */
  readonly id: string;
  readonly kind: CustomSiteKind;
  readonly at: Pt;
  /** Fields of the copy for empire k (0-based). */
  readonly extra?: (k: number) => Partial<CustomSite>;
}

export class MapBuilder {
  readonly width: number;
  readonly centre: HexCoord;
  readonly syms: readonly Sym[];
  t: string[];
  readonly sites: CustomSite[] = [];
  readonly roads = new Set<string>();
  /** Per-copy IDs of each spec (copy k → id). */
  readonly ids = new Map<string, string[]>();
  private readonly edge: string;

  constructor(
    readonly cols: number,
    readonly rows: number,
    empires: 2 | 3 | 4 | 6,
    edge: Terrain,
    base: Terrain = 'plains',
  ) {
    const off = customRowOffset(rows);
    this.width = cols + off;
    const cx = Math.floor(cols / 2);
    const cy = Math.floor(rows / 2);
    this.centre = { q: cx - Math.floor(cy / 2) + off, r: cy };
    this.syms = symmetries(empires);
    this.edge = TERRAIN_CODES[edge];
    this.t = [];
    for (let r = 0; r < rows; r++) for (let q = 0; q < this.width; q++) this.t.push(this.inRect({ q, r }) ? TERRAIN_CODES[base] : TERRAIN_CODES.void);
  }

  inRect(c: HexCoord): boolean {
    return customInRect(this.cols, this.rows, c);
  }
  rel(c: HexCoord): HexCoord {
    return { q: c.q - this.centre.q, r: c.r - this.centre.r };
  }
  abs(d: HexCoord): HexCoord {
    return { q: d.q + this.centre.q, r: d.r + this.centre.r };
  }
  pt(c: HexCoord): Pt {
    const d = this.rel(c);
    return { x: d.q + d.r / 2, y: d.r * ROW };
  }
  /** The cell whose centre is nearest a hex-unit point. */
  cell(p: Pt): HexCoord {
    const r = p.y / ROW;
    const q = p.x - r / 2;
    let rq = Math.round(q);
    let rr = Math.round(r);
    const rs = Math.round(-q - r);
    const dq = Math.abs(rq - q);
    const dr = Math.abs(rr - r);
    const ds = Math.abs(rs - (-q - r));
    if (dq > dr && dq > ds) rq = -rr - rs;
    else if (dr > ds) rr = -rq - rs;
    return this.abs({ q: rq + 0, r: rr + 0 });
  }
  index(c: HexCoord): number {
    return c.r * this.width + c.q;
  }
  terrain(c: HexCoord): string {
    return this.inRect(c) ? this.t[this.index(c)]! : 'v';
  }
  /** The copies of a cell, one per empire (copy k of empire 1's cell). */
  copies(c: HexCoord): HexCoord[] {
    return this.syms.map((s) => this.abs(s.apply(this.rel(c))));
  }

  /** Direction of empire 1's lands from the centre (decides which copy of a cell `scatter` reads). */
  homeAngle = 180;

  /**
   * Scattered ground (noise): each cell reads the pattern at the copy of itself
   * that lies in empire 1's part of the map, so every empire gets the same
   * scatter at the same density (painting every copy would pile them up).
   */
  scatter(terrain: Terrain, shape: (p: Pt) => boolean): this {
    const code = TERRAIN_CODES[terrain];
    const next = [...this.t];
    for (let r = 0; r < this.rows; r++)
      for (let q = 0; q < this.width; q++) {
        const c = { q, r };
        if (!this.inRect(c)) continue;
        const d = this.rel(c);
        let best: Pt | null = null;
        let bestKey = Infinity;
        let bestTie = '';
        for (const s of this.syms) {
          const pre = s.inverse(d);
          const p = { x: pre.q + pre.r / 2, y: pre.r * ROW };
          const key = Math.round(angleDiff(angleOf(p), this.homeAngle) * 1e6);
          const tie = `${pre.q},${pre.r}`;
          if (key < bestKey || (key === bestKey && tie < bestTie)) {
            best = p;
            bestKey = key;
            bestTie = tie;
          }
        }
        if (best && shape(best)) next[this.index(c)] = code;
      }
    this.t = next;
    return this;
  }

  /** Paint `terrain` wherever `shape` holds for empire 1's design, in every copy. */
  layer(terrain: Terrain, shape: (p: Pt) => boolean): this {
    const code = TERRAIN_CODES[terrain];
    const next = [...this.t];
    for (let r = 0; r < this.rows; r++)
      for (let q = 0; q < this.width; q++) {
        const c = { q, r };
        if (!this.inRect(c)) continue;
        const d = this.rel(c);
        for (const s of this.syms) {
          const pre = s.inverse(d);
          if (shape({ x: pre.q + pre.r / 2, y: pre.r * ROW })) {
            next[this.index(c)] = code;
            break;
          }
        }
      }
    this.t = next;
    return this;
  }

  /** Paint exact cells of empire 1's design (and their copies). */
  cells(terrain: Terrain, list: readonly HexCoord[]): this {
    const code = TERRAIN_CODES[terrain];
    for (const c of list) for (const o of this.copies(c)) if (this.inRect(o)) this.t[this.index(o)] = code;
    return this;
  }

  /** Cells at exactly `n` steps from `c` (a hex ring). */
  ring(c: HexCoord, n: number): HexCoord[] {
    const out: HexCoord[] = [];
    for (let dq = -n; dq <= n; dq++)
      for (let dr = Math.max(-n, -dq - n); dr <= Math.min(n, -dq + n); dr++) if (Math.max(Math.abs(dq), Math.abs(dr), Math.abs(dq + dr)) === n) out.push({ q: c.q + dq, r: c.r + dr });
    return out;
  }

  /** The cell `n` steps from `c` in direction `dir` (0 = east, then clockwise on screen in 60° steps). */
  step(c: HexCoord, dir: number, n = 1): HexCoord {
    const d = [
      { q: 1, r: 0 },
      { q: 0, r: 1 },
      { q: -1, r: 1 },
      { q: -1, r: 0 },
      { q: 0, r: -1 },
      { q: 1, r: -1 },
    ][((dir % 6) + 6) % 6]!;
    return { q: c.q + d.q * n, r: c.r + d.r * n };
  }

  /** A road along consecutive neighbouring cells (copied). */
  roadCells(list: readonly HexCoord[]): this {
    for (let i = 1; i < list.length; i++) this.addEdgeCopies(list[i - 1]!, list[i]!);
    return this;
  }

  /** The rectangle's border and every cell whose copies leave the rectangle become the map edge. */
  sealEdges(): this {
    for (let r = 0; r < this.rows; r++)
      for (let q = 0; q < this.width; q++) {
        const c = { q, r };
        if (!this.inRect(c)) continue;
        const orbit = this.copies(c);
        const border = orbit.some((o) => !this.inRect(o) || axialNeighbors(o).some((n) => !this.inRect(n)));
        if (border) for (const o of orbit) if (this.inRect(o)) this.t[this.index(o)] = this.edge;
      }
    return this;
  }

  /** Place a site for every empire (copies that coincide are placed once). */
  site(spec: SiteSpec): this {
    const base = this.cell(spec.at);
    const copies = this.copies(base);
    const unique = new Set(copies.map(hexKey)).size;
    const first = copies.map((c) => copies.findIndex((x) => hexKey(x) === hexKey(c)));
    const ids: string[] = [];
    copies.forEach((c, k) => {
      const f = first[k]!;
      const id = unique === 1 ? spec.id : `${spec.id}_${f + 1}`;
      ids.push(id);
      if (f !== k) return; // a copy that falls on an earlier copy's tile
      this.sites.push({ id, kind: spec.kind, q: c.q, r: c.r, ...(spec.extra ? spec.extra(k) : {}) } as CustomSite);
    });
    this.ids.set(spec.id, ids);
    return this;
  }

  /** ID of copy k of a spec. */
  id(base: string, k = 0): string {
    const list = this.ids.get(base);
    if (!list) throw new Error(`No site ${base}`);
    return list[k % list.length]!;
  }

  siteCell(id: string): HexCoord {
    const s = this.sites.find((x) => x.id === id);
    if (!s) throw new Error(`No site ${id}`);
    return { q: s.q, r: s.r };
  }

  /**
   * A road for empire 1 from one site (or cell) to another, copied for every empire.
   * Roads walk passable ground, avoid other sites and never touch a town tile
   * (a town's single road is its gate). `fromTown` starts at the town's gate.
   */
  road(from: string | HexCoord, to: string | HexCoord): this {
    const a = typeof from === 'string' ? this.siteCell(from) : from;
    const b = typeof to === 'string' ? this.siteCell(to) : to;
    const path = this.path(a, b);
    if (!path) throw new Error(`No road from ${JSON.stringify(from)} to ${JSON.stringify(to)}`);
    for (let i = 1; i < path.length; i++) this.addEdgeCopies(path[i - 1]!, path[i]!);
    return this;
  }

  /** The one road edge between a town and its gate (copied). */
  townGate(townBase: string, toward: Pt): HexCoord {
    const town = this.siteCell(this.id(townBase, 0));
    const target = toward;
    const best = axialNeighbors(town)
      .filter((n) => this.passable(n))
      .sort((x, y) => dist(this.pt(x), target) - dist(this.pt(y), target))[0]!;
    this.addEdgeCopies(town, best);
    return best;
  }

  private addEdgeCopies(a: HexCoord, b: HexCoord): void {
    const ca = this.copies(a);
    const cb = this.copies(b);
    ca.forEach((x, k) => {
      if (this.inRect(x) && this.inRect(cb[k]!)) this.roads.add(edgeKey(x, cb[k]!));
    });
  }

  /**
   * An unowned town for every empire (2026-10-07): on open ground already there
   * (no terrain changes, so a map compiled without unowned towns stays exactly as
   * before), `range` steps from empire 1's town and nearer to it than to any other,
   * as far from every site as the map allows; one road from its gate to `homeGate`.
   * The town has no owner; its pantheon is chosen when the map is set up.
   */
  unownedTown(homeGate: HexCoord, range: readonly [number, number], minGap = 3): this {
    const home = this.siteCell(this.id('town', 0));
    const towns = this.syms.map((_, k) => this.siteCell(this.id('town', k)));
    const sites = this.sites.map((x) => ({ q: x.q, r: x.r }));
    const d = (a: HexCoord, b: HexCoord) => Math.max(Math.abs(a.q - b.q), Math.abs(a.r - b.r), Math.abs(a.q + a.r - b.q - b.r));
    const target = (range[0] + range[1]) / 2;
    let best: { c: HexCoord; gap: number; off: number; key: string } | null = null;
    for (let r = 0; r < this.rows; r++)
      for (let q = 0; q < this.width; q++) {
        const c = { q, r };
        if (!this.inRect(c) || this.terrain(c) !== 'p') continue;
        const dh = d(c, home);
        if (dh < range[0] || dh > range[1]) continue;
        if (towns.some((t, k) => k > 0 && d(c, t) < dh + 2)) continue;
        if (!axialNeighbors(c).every((n) => this.passable(n))) continue;
        const copies = this.copies(c);
        if (copies.some((o) => !this.inRect(o) || this.terrain(o) !== 'p')) continue;
        // Not on a road already laid (a town takes exactly one road, at its gate).
        if (copies.some((o) => axialNeighbors(o).some((n) => this.roads.has(edgeKey(o, n))))) continue;
        if (copies.some((o, i) => copies.some((p, j) => j > i && d(o, p) < 2 * minGap))) continue;
        const gap = Math.min(...copies.flatMap((o) => sites.map((x) => d(o, x))));
        if (gap < minGap) continue;
        const cand = { c, gap: Math.min(gap, 6), off: Math.abs(dh - target), key: hexKey(c) };
        if (!best || cand.gap > best.gap || (cand.gap === best.gap && (cand.off < best.off || (cand.off === best.off && cand.key < best.key)))) best = cand;
      }
    if (!best) throw new Error('No room for an unowned town');
    this.site({ id: 'free_town', kind: 'town', at: this.pt(best.c) });
    const gate = this.townGate('free_town', this.pt(homeGate));
    return this.road(homeGate, gate);
  }

  passable(c: HexCoord): boolean {
    const t = this.terrain(c);
    return t === 'p' || t === 'f' || t === 'r' || t === 's';
  }

  private path(a: HexCoord, b: HexCoord): HexCoord[] | null {
    const cost: Record<string, number> = { p: 10, f: 13, r: 13, s: 16 };
    const siteKeys = new Set(this.sites.map((s) => hexKey({ q: s.q, r: s.r })));
    const towns = new Set(this.sites.filter((s) => s.kind === 'town').map((s) => hexKey({ q: s.q, r: s.r })));
    const goal = hexKey(b);
    const dist0 = new Map<string, number>([[hexKey(a), 0]]);
    const prev = new Map<string, HexCoord>();
    const open: { c: HexCoord; d: number }[] = [{ c: a, d: 0 }];
    while (open.length) {
      open.sort((x, y) => x.d - y.d || x.c.r - y.c.r || x.c.q - y.c.q);
      const { c, d } = open.shift()!;
      const k = hexKey(c);
      if (k === goal) break;
      if (d > (dist0.get(k) ?? Infinity)) continue;
      for (const n of axialNeighbors(c)) {
        const nk = hexKey(n);
        if (!this.inRect(n) || !this.passable(n)) continue;
        if (towns.has(nk)) continue;
        if (siteKeys.has(nk) && nk !== goal) continue;
        // Prefer existing roads a little (roads merge instead of running side by side).
        const step = (cost[this.terrain(n)] ?? 99) - (this.roads.has(edgeKey(c, n)) ? 3 : 0);
        const nd = d + step;
        if (nd < (dist0.get(nk) ?? Infinity)) {
          dist0.set(nk, nd);
          prev.set(nk, c);
          open.push({ c: n, d: nd });
        }
      }
    }
    if (!dist0.has(goal)) return null;
    const out = [b];
    let cur = goal;
    while (prev.has(cur)) {
      const p = prev.get(cur)!;
      out.push(p);
      cur = hexKey(p);
    }
    return out.reverse();
  }

  document(meta: Pick<CustomMapDocument, 'name' | 'description' | 'biome' | 'players' | 'victory' | 'startWealth'> & { revealMap?: boolean }): CustomMapDocument {
    return {
      format: 'pantheon-realms-map',
      version: 1,
      name: meta.name,
      description: meta.description,
      author: 'Pantheon Realms',
      width: this.width,
      height: this.rows,
      terrain: this.t.join(''),
      roads: [...this.roads].sort(),
      biome: meta.biome,
      players: meta.players,
      sites: [...this.sites].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)),
      victory: meta.victory,
      startWealth: meta.startWealth,
      ...(meta.revealMap ? { revealMap: true } : {}),
    };
  }
}

/** Cells reachable on foot from `start`, treating `blocked` tiles as walls and portals as links. */
export function reachable(doc: CustomMapDocument, start: HexCoord, blocked: ReadonlySet<string> = new Set(), usePortals = true): Set<string> {
  const pass = (c: HexCoord) => {
    if (c.q < 0 || c.r < 0 || c.q >= doc.width || c.r >= doc.height) return false;
    const t = doc.terrain[c.r * doc.width + c.q];
    return t === 'p' || t === 'f' || t === 'r' || t === 's';
  };
  const seen = new Set<string>([hexKey(start)]);
  const queue = [start];
  const portals = new Map(doc.sites.filter((s) => s.kind === 'portal').map((s) => [hexKey({ q: s.q, r: s.r }), s]));
  while (queue.length) {
    const c = queue.shift()!;
    const out = [...axialNeighbors(c)];
    const portal = usePortals ? portals.get(hexKey(c)) : undefined;
    if (portal) {
      const twin = doc.sites.find((x) => x.id === portal.twinId);
      if (twin) out.push({ q: twin.q, r: twin.r });
    }
    for (const n of out) {
      const k = hexKey(n);
      if (seen.has(k) || !pass(n) || blocked.has(k)) continue;
      seen.add(k);
      queue.push(n);
    }
  }
  return seen;
}
