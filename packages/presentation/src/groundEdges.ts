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

/** One painted transition: `from` reaches into hex (q, r) across its edge k with the given sheet variant. */
export interface GroundEdgePiece {
  readonly q: number;
  readonly r: number;
  readonly k: number;
  readonly from: Terrain;
  readonly character: string;
  readonly variant: number;
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
        if (character) out.push({ q, r, k, from, character, variant: groundVariant(q, r, k, rows) });
      }
    }
  }
  return out;
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
  return outlines.map(([level, flat]) => {
    const points = new Array<number>(flat.length);
    for (let i = 0; i < flat.length; i += 2) {
      points[i] = cx + flat[i]! * hexWidth;
      points[i + 1] = cy + flat[i + 1]! * hexWidth;
    }
    return { level, points };
  });
}
