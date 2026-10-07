/**
 * Painted ground transitions (GPT-6 Brief 17, Parts A and B). Where two grounds
 * meet, the higher one reaches into the lower one's hex across their shared edge
 * (lowest to highest: water, marsh, plains, rough, forest, mountain), and any land
 * reaches into water as a shore. The shape comes from the mask sheet of the
 * reaching ground's "character" (traced into outlines by `npm run ground:import`);
 * the adventure view fills it with the reaching ground's own painting. Pure
 * geometry and lookups (no Pixi), so it is testable without a renderer.
 */
import type { Terrain } from '@pr/rules';
import { MAP_SQUASH } from './hexmath';
import type { GroundEdgesData, GroundEdgesDefinition } from './sprites';

/** Lowest to highest: the higher ground paints into the lower one's hex. */
export const GROUND_PRIORITY: readonly Terrain[] = ['water', 'marsh', 'plains', 'rough', 'forest', 'mountain'];

/** The edge shape a ground makes where it reaches into a lower neighbour. */
export const GROUND_CHARACTER: Readonly<Partial<Record<Terrain, string>>> = {
  plains: 'meadow',
  forest: 'woodland',
  rough: 'rocky',
  marsh: 'boggy',
  mountain: 'scree',
};

/** Every mask sheet the painted transitions need (the map keeps its softened hex edges until all are imported). */
export const GROUND_CHARACTERS: readonly string[] = ['meadow', 'woodland', 'rocky', 'boggy', 'scree', 'shore'];

/** The character of `from` reaching into a hex of `into`, or null when it does not reach (same, lower or void). */
export function groundReach(into: Terrain, from: Terrain): string | null {
  if (into === from || into === 'void' || from === 'void') return null;
  if (into === 'water') return 'shore';
  if (from === 'water') return null;
  const a = GROUND_PRIORITY.indexOf(into);
  const b = GROUND_PRIORITY.indexOf(from);
  if (a < 0 || b < 0 || b <= a) return null;
  return GROUND_CHARACTER[from] ?? null;
}

/** Which of a sheet's variant rows an edge uses: fixed per hex and edge, varied along a border. */
export function groundVariant(q: number, r: number, k: number, rows: number): number {
  let h = Math.imul(q | 0, 0x27d4eb2d) ^ Math.imul(r | 0, 0x165667b1) ^ Math.imul(k + 1, 0x9e3779b1);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h ^= h >>> 13;
  return (h >>> 0) % Math.max(1, rows);
}

/** True when the manifest lists every mask sheet the painted transitions need. */
export function groundEdgesComplete(def: GroundEdgesDefinition | undefined | null): boolean {
  return !!def && GROUND_CHARACTERS.every((c) => def.characters.includes(c));
}

/** True when loaded outline data holds every character, six edges each. */
export function groundEdgesUsable(data: GroundEdgesData | null | undefined): data is GroundEdgesData {
  return (
    !!data &&
    data.schema === 'pantheon-realms-ground-edges-1' &&
    Array.isArray(data.levels) &&
    GROUND_CHARACTERS.every((c) => Array.isArray(data.characters[c]) && data.characters[c]!.length === 6 && data.characters[c]!.every((v) => Array.isArray(v) && v.length > 0))
  );
}

/**
 * One painted transition: `from` reaches into hex (q, r) across its edge k with
 * the given sheet variant. `depth` scales how far the shape reaches into the hex
 * (1 = as painted; the edge itself and its corners never move, so neighbouring
 * pieces still meet); `mirror` flips the shape along the edge.
 */
export interface GroundEdgePiece {
  readonly q: number;
  readonly r: number;
  readonly k: number;
  readonly from: Terrain;
  readonly character: string;
  readonly variant: number;
  readonly depth?: number;
  readonly mirror?: boolean;
}

/**
 * How much a border may vary per character (owner request 2026-10-07: borders
 * between lands looked too alike): the range of reach depth, and how often the
 * lower ground reaches back into the higher one along a border instead. Woods
 * and bogs spill furthest; scree and shores stay close to their painting (the
 * surf line is drawn for the shore as painted, so shores never change).
 */
export const GROUND_VARIETY: Readonly<Record<string, { readonly depth: readonly [number, number]; readonly reverse: number }>> = {
  meadow: { depth: [0.75, 1.6], reverse: 0.3 },
  woodland: { depth: [0.85, 1.9], reverse: 0.3 },
  rocky: { depth: [0.7, 1.5], reverse: 0.3 },
  boggy: { depth: [0.85, 1.8], reverse: 0.3 },
  scree: { depth: [0.8, 1.3], reverse: 0 },
  shore: { depth: [1, 1], reverse: 0 },
};

const mix = (h: number): number => {
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return (h ^ (h >>> 16)) >>> 0;
};
const lattice = (x: number, y: number, salt: number): number => mix(Math.imul(x | 0, 0x27d4eb2d) ^ Math.imul(y | 0, 0x165667b1) ^ Math.imul(salt | 0, 0x9e3779b1)) / 4294967296;
/** A stable hash of one border (the same from either side). */
function borderHash(q: number, r: number, nq: number, nr: number, salt: number): number {
  const first = r < nr || (r === nr && q < nq);
  const [aq, ar, bq, br] = first ? [q, r, nq, nr] : [nq, nr, q, r];
  return mix(Math.imul(aq, 0x27d4eb2d) ^ Math.imul(ar, 0x165667b1) ^ Math.imul(bq + 1, 0x9e3779b1) ^ Math.imul(br + 1, 0x85ebca6b) ^ Math.imul(salt | 0, 0x2545f491));
}

/** Smooth value noise in [0, 1) over a lattice `cell` hexes wide, so a border's reach swells and narrows gradually. */
export function borderNoise(x: number, y: number, salt: number, cell = 2.6): number {
  const fx = x / cell;
  const fy = y / cell;
  const x0 = Math.floor(fx);
  const y0 = Math.floor(fy);
  const tx = fx - x0;
  const ty = fy - y0;
  const sx = tx * tx * (3 - 2 * tx);
  const sy = ty * ty * (3 - 2 * ty);
  const a = lattice(x0, y0, salt) + (lattice(x0 + 1, y0, salt) - lattice(x0, y0, salt)) * sx;
  const b = lattice(x0, y0 + 1, salt) + (lattice(x0 + 1, y0 + 1, salt) - lattice(x0, y0 + 1, salt)) * sx;
  return a + (b - a) * sy;
}

/**
 * Every transition on a map. `terrainAt` gives the ground of a hex in bounds; `step`
 * is the neighbour offset across each of the six hex edges (e, se, sw, w, nw, ne).
 */
export function planGroundEdges(
  width: number,
  height: number,
  terrainAt: (q: number, r: number) => Terrain,
  step: readonly (readonly [number, number])[],
  rows: number,
  /** Vary the borders (depth, mirroring, the lower ground reaching back); `salt` makes another map vary differently. Off: every piece as painted. */
  variety: { readonly salt: number } | null = null,
): GroundEdgePiece[] {
  const out: GroundEdgePiece[] = [];
  for (let r = 0; r < height; r++) {
    for (let q = 0; q < width; q++) {
      const t = terrainAt(q, r);
      if (t === 'void') continue;
      for (let k = 0; k < 6; k++) {
        const [dq, dr] = step[k]!;
        const nq = q + dq;
        const nr = r + dr;
        if (nq < 0 || nr < 0 || nq >= width || nr >= height) continue;
        const from = terrainAt(nq, nr);
        const character = groundReach(t, from);
        if (!character) continue;
        if (!variety) {
          out.push({ q, r, k, from, character, variant: groundVariant(q, r, k, rows) });
          continue;
        }
        // The border's midpoint in axial units (both hexes agree on it), for the smooth noise.
        const mx = q + dq / 2 + (r + dr / 2) / 2;
        const my = r + dr / 2;
        const edgeHash = borderHash(q, r, nq, nr, variety.salt);
        // Sometimes the lower ground reaches back into the higher one (land borders only).
        const back = GROUND_CHARACTER[t];
        const reverse = !!back && (GROUND_VARIETY[character]?.reverse ?? 0) > 0 && t !== 'water' && from !== 'mountain' && (edgeHash % 1000) / 1000 < (GROUND_VARIETY[character]?.reverse ?? 0);
        const into = reverse ? { q: nq, r: nr, k: (k + 3) % 6, from: t, character: back! } : { q, r, k, from, character };
        const range = GROUND_VARIETY[into.character]?.depth ?? [1, 1];
        const depth = range[0] + (range[1] - range[0]) * borderNoise(mx, my, variety.salt);
        const mirror = into.character !== 'shore' && ((edgeHash >>> 12) & 1) === 1;
        out.push({ ...into, variant: groundVariant(into.q, into.r, into.k, rows), depth: Math.round(depth * 1000) / 1000, mirror });
      }
    }
  }
  return out;
}

/**
 * A rounded corner (owner request 2026-10-07): where a hex pokes its corner
 * between two hexes of one other ground, that ground reaches round the corner,
 * so a border bends instead of stepping hex by hex. `corner` is the corner
 * index (edge k joins corners k and k + 1); `radius` in hex widths.
 */
export interface GroundCornerPiece {
  readonly q: number;
  readonly r: number;
  readonly corner: number;
  readonly from: Terrain;
  readonly radius: number;
  readonly seed: number;
}

/** Every rounded corner on a map: a 2-against-1 meeting of two land grounds (no water, no void). */
export function planGroundCorners(
  width: number,
  height: number,
  terrainAt: (q: number, r: number) => Terrain,
  step: readonly (readonly [number, number])[],
  salt: number,
): GroundCornerPiece[] {
  const out: GroundCornerPiece[] = [];
  const inside = (q: number, r: number) => q >= 0 && r >= 0 && q < width && r < height;
  for (let r = 0; r < height; r++) {
    for (let q = 0; q < width; q++) {
      const t = terrainAt(q, r);
      if (t === 'void' || t === 'water') continue;
      for (let c = 0; c < 6; c++) {
        // Corner c is shared with the neighbours across edges c - 1 and c.
        const [aq, ar] = step[(c + 5) % 6]!;
        const [bq, br] = step[c]!;
        if (!inside(q + aq, r + ar) || !inside(q + bq, r + br)) continue;
        const a = terrainAt(q + aq, r + ar);
        const b = terrainAt(q + bq, r + br);
        if (a !== b || a === t || a === 'void' || a === 'water') continue;
        const seed = borderHash(q * 6 + c, r, q + aq + bq, r + ar + br, salt);
        // A quarter of the corners stay sharp, so not every bend is the same curve.
        if (seed % 4 === 0) continue;
        const x = q + r / 2 + Math.cos(((60 * c - 30) * Math.PI) / 180) / Math.sqrt(3);
        const y = r + (Math.sin(((60 * c - 30) * Math.PI) / 180) * 2) / 3;
        const radius = 0.18 + 0.24 * borderNoise(x, y, salt + 17);
        out.push({ q, r, corner: c, from: a, radius: Math.round(radius * 1000) / 1000, seed });
      }
    }
  }
  return out;
}

/** The outlines of a rounded corner: three soft levels (as the painted masks), slightly wobbly, squashed like the map. */
export function groundCornerOutlines(piece: GroundCornerPiece, cx: number, cy: number, hexWidth: number, levels: number): { level: number; points: number[] }[] {
  const v = hexCorner(piece.corner);
  const ox = cx + v.x * hexWidth;
  const oy = cy + v.y * hexWidth;
  const N = 18;
  const out: { level: number; points: number[] }[] = [];
  for (let level = 0; level < levels; level++) {
    const scale = 1 - level * 0.18;
    const points: number[] = [];
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2;
      const wobble = 1 + 0.12 * Math.sin(a * 3 + (piece.seed % 628) / 100) + 0.06 * Math.sin(a * 5 + (piece.seed % 314) / 50);
      const rad = piece.radius * scale * wobble * hexWidth;
      points.push(ox + Math.cos(a) * rad, oy + Math.sin(a) * rad * MAP_SQUASH);
    }
    out.push({ level, points });
  }
  return out;
}

/** Corner i of a map hex in hex-width units (pointy-top, squashed like the map): edge k joins corners k and k + 1. */
function hexCorner(i: number): { x: number; y: number } {
  const a = ((60 * (i % 6) - 30) * Math.PI) / 180;
  return { x: Math.cos(a) / Math.sqrt(3), y: (Math.sin(a) * MAP_SQUASH) / Math.sqrt(3) };
}

/** Move one outline point of edge k: mirrored along the edge, then its reach into the hex scaled by `depth`. */
function varyPoint(x: number, y: number, k: number, depth: number, mirror: boolean): [number, number] {
  const a = hexCorner(k);
  const b = hexCorner(k + 1);
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  const ux = (b.x - a.x) / len;
  const uy = (b.y - a.y) / len;
  // Inward normal: perpendicular to the edge, towards the hex centre.
  let nx = -uy;
  let ny = ux;
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  if (nx * -mx + ny * -my < 0) {
    nx = -nx;
    ny = -ny;
  }
  if (mirror) {
    const t = (x - mx) * ux + (y - my) * uy;
    x -= 2 * t * ux;
    y -= 2 * t * uy;
  }
  const d = (x - a.x) * nx + (y - a.y) * ny;
  return [x + nx * d * (depth - 1), y + ny * d * (depth - 1)];
}

/** The outlines of one piece, as world-space point lists per outline level, around the hex centre (cx, cy). */
export function groundPieceOutlines(
  data: GroundEdgesData,
  piece: GroundEdgePiece,
  cx: number,
  cy: number,
  hexWidth: number,
): { level: number; points: number[] }[] {
  const variants = data.characters[piece.character]?.[piece.k];
  if (!variants || variants.length === 0) return [];
  const outlines = variants[piece.variant % variants.length] ?? [];
  const depth = piece.depth ?? 1;
  const mirror = !!piece.mirror;
  const plain = depth === 1 && !mirror;
  return outlines.map(([level, flat]) => {
    const points = new Array<number>(flat.length);
    for (let i = 0; i < flat.length; i += 2) {
      const [x, y] = plain ? [flat[i]!, flat[i + 1]!] : varyPoint(flat[i]!, flat[i + 1]!, piece.k, depth, mirror);
      points[i] = cx + x * hexWidth;
      points[i + 1] = cy + y * hexWidth;
    }
    return { level, points };
  });
}
