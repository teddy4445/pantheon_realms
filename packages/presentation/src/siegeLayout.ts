/** Shared screen-space registration for siege art. Combat coordinates never change. */
import { BATTLE_SQUASH, SQRT3, cellPoint } from './hexmath';

export const SIEGE_RADIUS = 40;
export const SIEGE_HEX = SQRT3 * SIEGE_RADIUS;
export const SIEGE_ROW = 1.5 * SIEGE_RADIUS * BATTLE_SQUASH;
export const SIEGE_PANTHEONS = ['greek', 'norse', 'egyptian', 'japanese', 'celtic', 'mesoamerican'] as const;

export function siegeWallPoint(col: number, row: number): { x: number; y: number } {
  return { x: SIEGE_HEX * (col + 0.25), y: row * SIEGE_ROW };
}

/** The new paintings are whole-view compositions, already projected by their artist. */
export function siegePaintingRect(cols: number, rows: number): { x: number; y: number; width: number; height: number } {
  const width = SIEGE_HEX * (cols + 6);
  const height = width * 2 / 3;
  return { x: -SIEGE_HEX * 2.25, y: (rows - 1) * SIEGE_ROW / 2 - height / 2, width, height };
}

export function siegeKeepPoint(cols: number, rows: number): { x: number; y: number } {
  const c = cellPoint({ col: cols, row: Math.floor(rows / 2) }, SIEGE_RADIUS, BATTLE_SQUASH);
  return { x: c.x + SIEGE_HEX * 0.7, y: c.y };
}

export interface SiegePalette {
  stone: number; light: number; shade: number; trim: number; cap: number; mortar: number;
  road: number; bank: number; water: number; wood: boolean;
}
const PALETTES: Record<string, SiegePalette> = {
  greek: { stone: 0xc5b58e, light: 0xe6d8b5, shade: 0x998769, trim: 0x466175, cap: 0xaf6947, mortar: 0x87765b, road: 0xcdbd95, bank: 0x8b805b, water: 0x497778, wood: false },
  norse: { stone: 0x8b8372, light: 0xb8ae98, shade: 0x605b50, trim: 0x46566a, cap: 0x805633, mortar: 0x504a3f, road: 0x9a9181, bank: 0x635e4d, water: 0x526e7c, wood: true },
  egyptian: { stone: 0xc5a370, light: 0xe8cc97, shade: 0x9d7d4f, trim: 0x30768b, cap: 0xd1af60, mortar: 0x93784e, road: 0xd0b782, bank: 0x967b4c, water: 0x588b81, wood: false },
  japanese: { stone: 0xc1bcaa, light: 0xe2decd, shade: 0x828578, trim: 0x853e32, cap: 0x48545c, mortar: 0x777568, road: 0xaca696, bank: 0x79775b, water: 0x567c76, wood: false },
  celtic: { stone: 0x9c9a7f, light: 0xc7c4a7, shade: 0x74735c, trim: 0x4c674b, cap: 0x857444, mortar: 0x64644e, road: 0xb0a585, bank: 0x6f7753, water: 0x55746c, wood: false },
  mesoamerican: { stone: 0xbcb497, light: 0xdfd6b5, shade: 0x918871, trim: 0x367e7b, cap: 0xa55140, mortar: 0x817860, road: 0xc0b38c, bank: 0x787650, water: 0x4f8078, wood: false },
};
export function siegePalette(pantheon?: string | null): SiegePalette { return PALETTES[pantheon ?? ''] ?? PALETTES.greek!; }

/** Each occupied row covers exactly one pitch, including after a neighbouring section falls. */
export function siegeSpan(row: number): { from: number; to: number } {
  return { from: (row - 0.5) * SIEGE_ROW, to: (row + 0.5) * SIEGE_ROW };
}
