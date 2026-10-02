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
  tundra: [1, 1, 1],
  fjord: [1, 1, 1],
  desert: [1.04, 1.0, 0.92],
  jungle: [0.94, 1.02, 0.94],
  autumn: [1.03, 0.98, 0.94],
  moor: [0.97, 0.98, 1.0],
};

/**
 * Winter biomes: how far each tile color is blended toward snow (0 = none).
 * Water blends less so frozen sea still reads as water. Cosmetic only.
 */
export const BIOME_FROST: Readonly<Record<string, { readonly land: number; readonly water: number }>> = {
  tundra: { land: 0.5, water: 0.3 },
  fjord: { land: 0.42, water: 0.22 },
};
export const SNOW_COLOR = '#e6edf4';

/**
 * Other biomes blend land (and a little water) toward a ground colour: sand in the
 * desert, deep green in the jungle, maple red-brown in autumn, heather on the
 * moor (2026-10-02, for the new campaigns). Cosmetic only.
 */
export const BIOME_BLEND: Readonly<Record<string, { readonly color: string; readonly land: number; readonly water: number; readonly forest?: number }>> = {
  desert: { color: '#d8c08a', land: 0.55, water: 0.08, forest: 0.25 },
  jungle: { color: '#2f6a37', land: 0.32, water: 0.18, forest: 0.4 },
  autumn: { color: '#b4693a', land: 0.18, water: 0, forest: 0.42 },
  moor: { color: '#7d6f86', land: 0.22, water: 0.05, forest: 0.1 },
};

/** A terrain's base color in a biome (winter biomes blend toward snow, others toward their ground colour), as 0..1 RGB. */
export function biomeTerrainRgb(t: Terrain, biome: string): [number, number, number] {
  const raw = hexToRgb(TERRAIN_COLORS[t]);
  const frost = BIOME_FROST[biome];
  const blend = BIOME_BLEND[biome];
  const k = frost ? (t === 'water' ? frost.water : frost.land) : blend ? (t === 'water' ? blend.water : t === 'forest' ? (blend.forest ?? blend.land) : t === 'mountain' ? blend.land * 0.5 : blend.land) : 0;
  if (k <= 0) return raw;
  const to = hexToRgb(frost ? SNOW_COLOR : blend!.color);
  return [raw[0] + (to[0] - raw[0]) * k, raw[1] + (to[1] - raw[1]) * k, raw[2] + (to[2] - raw[2]) * k];
}

/** CSS color of a terrain in a biome (minimaps). */
export function biomeTerrainCss(t: Terrain, biome: string): string {
  const [r, g, b] = biomeTerrainRgb(t, biome);
  return `rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)})`;
}

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
