/**
 * Hex geometry for both coordinate systems.
 *
 * Adventure map: rectangular axial domain (q, r), canonical neighbor order from
 * campaign/02 §2. Tactical board: separate 15 x 11 odd-row-offset grid
 * (design/04 §1). The two are never mixed; convert explicitly.
 *
 * Owns: pure coordinate math. Does not own: passability (terrain/occupancy rules).
 */

export interface HexCoord {
  readonly q: number;
  readonly r: number;
}

/** Canonical neighbor order: (q+1,r), (q+1,r-1), (q,r-1), (q-1,r), (q-1,r+1), (q,r+1). */
export const AXIAL_DIRECTIONS: readonly HexCoord[] = [
  { q: 1, r: 0 },
  { q: 1, r: -1 },
  { q: 0, r: -1 },
  { q: -1, r: 0 },
  { q: -1, r: 1 },
  { q: 0, r: 1 },
];

export function hex(q: number, r: number): HexCoord {
  return { q, r };
}

export function hexKey(c: HexCoord): string {
  return `${c.q},${c.r}`;
}

export function parseHexKey(key: string): HexCoord {
  const [q, r] = key.split(',').map(Number);
  return { q: q ?? 0, r: r ?? 0 };
}

export function hexEquals(a: HexCoord, b: HexCoord): boolean {
  return a.q === b.q && a.r === b.r;
}

export function axialNeighbors(c: HexCoord): HexCoord[] {
  return AXIAL_DIRECTIONS.map((d) => ({ q: c.q + d.q, r: c.r + d.r }));
}

export function axialDistance(a: HexCoord, b: HexCoord): number {
  const dq = a.q - b.q;
  const dr = a.r - b.r;
  return (Math.abs(dq) + Math.abs(dr) + Math.abs(dq + dr)) / 2;
}

/** Undirected edge key with endpoints in (q, r) order so both directions match. */
export function edgeKey(a: HexCoord, b: HexCoord): string {
  const first = a.q < b.q || (a.q === b.q && a.r <= b.r) ? a : b;
  const second = first === a ? b : a;
  return `${hexKey(first)}|${hexKey(second)}`;
}

// ---------------------------------------------------------------------------
// Tactical odd-row-offset board
// ---------------------------------------------------------------------------

export interface BattleCell {
  readonly col: number;
  readonly row: number;
}

export const BATTLE_COLS = 15;
export const BATTLE_ROWS = 11;

export function cell(col: number, row: number): BattleCell {
  return { col, row };
}

export function cellKey(c: BattleCell): string {
  return `${c.col}:${c.row}`;
}

export function cellEquals(a: BattleCell, b: BattleCell): boolean {
  return a.col === b.col && a.row === b.row;
}

export function inBattleBounds(c: BattleCell, cols = BATTLE_COLS, rows = BATTLE_ROWS): boolean {
  return c.col >= 0 && c.col < cols && c.row >= 0 && c.row < rows;
}

/** Odd-r offset -> cube coordinates. */
export function cellToCube(c: BattleCell): { x: number; y: number; z: number } {
  const x = c.col - (c.row - (c.row & 1)) / 2;
  const z = c.row;
  return { x, y: -x - z, z };
}

export function cellDistance(a: BattleCell, b: BattleCell): number {
  const ca = cellToCube(a);
  const cb = cellToCube(b);
  return Math.max(Math.abs(ca.x - cb.x), Math.abs(ca.y - cb.y), Math.abs(ca.z - cb.z));
}

const EVEN_ROW_DIRS: readonly [number, number][] = [
  [1, 0],
  [0, -1],
  [-1, -1],
  [-1, 0],
  [-1, 1],
  [0, 1],
];
const ODD_ROW_DIRS: readonly [number, number][] = [
  [1, 0],
  [1, -1],
  [0, -1],
  [-1, 0],
  [0, 1],
  [1, 1],
];

export function cellNeighbors(c: BattleCell, cols = BATTLE_COLS, rows = BATTLE_ROWS): BattleCell[] {
  const dirs = c.row & 1 ? ODD_ROW_DIRS : EVEN_ROW_DIRS;
  const out: BattleCell[] = [];
  for (const [dc, dr] of dirs) {
    const n = { col: c.col + dc, row: c.row + dr };
    if (inBattleBounds(n, cols, rows)) out.push(n);
  }
  return out;
}

export type Facing = 1 | -1; // 1 = facing right (attacker), -1 = facing left (defender)

/** Occupied cells: anchor plus, for two-hex creatures, the horizontal neighbor behind its facing. */
export function footprintCells(anchor: BattleCell, footprint: 1 | 2, facing: Facing): BattleCell[] {
  if (footprint === 1) return [anchor];
  return [anchor, { col: anchor.col - facing, row: anchor.row }];
}

/** Minimum distance between two occupied-cell sets. */
export function footprintDistance(a: readonly BattleCell[], b: readonly BattleCell[]): number {
  let best = Number.POSITIVE_INFINITY;
  for (const x of a) for (const y of b) best = Math.min(best, cellDistance(x, y));
  return best;
}
