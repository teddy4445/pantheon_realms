/**
 * Presentation palette for placeholder geometry. Colors are cosmetic only and
 * never encode rules on their own: ownership also uses banner shape, and
 * highlights also use marker shape (disc vs ring vs flag).
 */
import type { Terrain } from '@pr/rules';

export const TERRAIN_COLORS: Readonly<Record<Terrain, string>> = {
  plains: '#7f8f4f',
  forest: '#3f6136',
  rough: '#8c7b58',
  marsh: '#4d6b5c',
  mountain: '#6f6a64',
  water: '#2c5c86',
};

/** Tile top heights (world units) — visual relief only. */
export const TERRAIN_HEIGHT: Readonly<Record<Terrain, number>> = {
  plains: 0,
  forest: 0.04,
  rough: 0.1,
  marsh: -0.04,
  mountain: 0.28,
  water: -0.16,
};

export const BIOME_TINT: Readonly<Record<string, [number, number, number]>> = {
  coast: [1.0, 1.0, 0.98],
  high_pass: [0.94, 0.97, 1.02],
  storm_plateau: [0.86, 0.9, 1.0],
  temperate: [1, 1, 1],
};

export const UNKNOWN_COLOR = '#0a1322';
export const ROAD_COLOR = '#cdb57c';
export const SEA_COLOR = '#0c1d31';
export const HIGHLIGHT_REACH = '#4fc3d6';
export const PATH_TODAY = '#8fe07a';
export const PATH_LATER = '#e6b755';
export const PATH_ENCOUNTER = '#e0573f';
export const SELECT_RING = '#f1d48a';
export const NEUTRAL_COLOR = '#9a9a9a';

export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

/** Stable per-tile variation in [-1, 1] (cosmetic). */
export function tileNoise(q: number, r: number): number {
  let h = (q * 374761393 + r * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return ((h & 1023) / 1023) * 2 - 1;
}
