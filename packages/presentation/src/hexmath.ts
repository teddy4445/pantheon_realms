/**
 * Hex ↔ screen-plane conversions for the 2D views (presentation only; no
 * PixiJS import, part of `@pr/presentation/core`).
 *
 * Both boards use pointy-top hexes, +x to the right and +y down the screen
 * (row 0 is the top / far edge). The ground is drawn slightly foreshortened —
 * rows are closer together than in a flat top-down view — so the board reads
 * as ground seen from an elevated three-quarter camera while sprites stand
 * upright on it. Units are hex radii (centre to corner) before the camera's
 * pixel scale. The rules never read any of this: a hex is picked by inverting
 * the same transform, so sprite sizes cannot change what a click selects.
 */
import type { BattleCell, HexCoord } from '@pr/rules';

export const SQRT3 = Math.sqrt(3);

/** Vertical foreshortening of the adventure-map ground. */
export const MAP_SQUASH = 0.84;
/** Vertical foreshortening of the battle board (a high three-quarter view, about 47° above the board). */
export const BATTLE_SQUASH = 0.74;

export interface Point {
  readonly x: number;
  readonly y: number;
}

/** Centre of an axial map hex. */
export function axialPoint(c: HexCoord, radius = 1, squash = MAP_SQUASH): Point {
  return { x: SQRT3 * radius * (c.q + c.r / 2), y: 1.5 * radius * squash * c.r };
}

/** Fractional axial coordinates of a ground point (the minimap's view frame). */
export function pointAxialFraction(x: number, y: number, radius = 1, squash = MAP_SQUASH): { q: number; r: number } {
  const r = y / (1.5 * radius * squash);
  return { q: x / (SQRT3 * radius) - r / 2, r };
}

function cubeRound(qf: number, rf: number): HexCoord {
  const sf = -qf - rf;
  let q = Math.round(qf);
  let r = Math.round(rf);
  const s = Math.round(sf);
  const dq = Math.abs(q - qf);
  const dr = Math.abs(r - rf);
  const ds = Math.abs(s - sf);
  if (dq > dr && dq > ds) q = -r - s;
  else if (dr > ds) r = -q - s;
  return { q: q + 0, r: r + 0 }; // never −0
}

/** The axial map hex under a ground point. */
export function pointAxial(x: number, y: number, radius = 1, squash = MAP_SQUASH): HexCoord {
  const f = pointAxialFraction(x, y, radius, squash);
  return cubeRound(f.q, f.r);
}

/** Centre of a battle cell (odd-r offset: odd rows are shifted half a hex to the right). */
export function cellPoint(c: BattleCell, radius = 1, squash = BATTLE_SQUASH): Point {
  return { x: SQRT3 * radius * (c.col + 0.5 * (c.row & 1)), y: 1.5 * radius * squash * c.row };
}

/** The battle cell under a board point. */
export function pointCell(x: number, y: number, radius = 1, squash = BATTLE_SQUASH): BattleCell {
  const a = pointAxial(x, y, radius, squash);
  return { col: a.q + (a.r - (a.r & 1)) / 2, row: a.r };
}

/**
 * A battle board whose cells sit at a measured place on a painting (the boarding battlefield,
 * expedition kit `boarding-layout.json`): the same pointy-top odd-r grid as `cellPoint`, with its
 * own radius, vertical squash and origin (board pixels). Drawing and hit-testing both go through
 * `cellPointOn` / `pointCellOn`, so a sprite's size never changes which cell a click selects.
 */
export interface BoardProjection {
  readonly radius: number;
  readonly squash: number;
  readonly originX: number;
  readonly originY: number;
}

/** The kit's normalised cell projection (fractions of the painting's width and height). */
export interface NormalizedBoardProjection {
  readonly x0: number;
  readonly dx: number;
  readonly oddRowOffset: number;
  readonly y0: number;
  readonly dy: number;
  readonly hexWidth: number;
  readonly hexHeight: number;
}

/** The plain board (land battles, sieges): `cellPoint` with the standard radius and squash. */
export function plainBoardProjection(radius = 1, squash = BATTLE_SQUASH): BoardProjection {
  return { radius, squash, originX: 0, originY: 0 };
}

/** Centre of a battle cell on a projected board. */
export function cellPointOn(c: BattleCell, p: BoardProjection): Point {
  const q = cellPoint(c, p.radius, p.squash);
  return { x: q.x + p.originX, y: q.y + p.originY };
}

/** The battle cell under a point of a projected board (the exact inverse of `cellPointOn`). */
export function pointCellOn(x: number, y: number, p: BoardProjection): BattleCell {
  return pointCell(x - p.originX, y - p.originY, p.radius, p.squash);
}

/**
 * The cell a click or hover at a board point selects: the inverse projection, then the board's bounds
 * and its legal-cell mask (a masked board's water selects nothing). Null: no cell.
 */
export function pickCellOn(x: number, y: number, p: BoardProjection, cols: number, rows: number, legal?: (c: BattleCell) => boolean): BattleCell | null {
  const c = pointCellOn(x, y, p);
  if (c.col < 0 || c.row < 0 || c.col >= cols || c.row >= rows) return null;
  return legal && !legal(c) ? null : c;
}

/**
 * A measured painting in board pixels: the kit projection x = x0 + col·dx + (odd row ? oddRowOffset : 0),
 * y = y0 + row·dy (fractions of the art) is an affine case of `cellPoint` — the painting is sized so a
 * column step is one standard hex width (`radius`·√3), which keeps creature sprites at their usual size;
 * the rows then get their own squash. `oddRowOffset` must be half of `dx` (an odd-r grid); the drawn
 * cell is `hexWidth` × `hexHeight` of the art (`cell`: a hex radius and squash for `hexPolygon`).
 */
export function layoutBoardProjection(
  n: NormalizedBoardProjection,
  art: { readonly width: number; readonly height: number },
  radius = 1,
): { projection: BoardProjection; art: { x: number; y: number; width: number; height: number }; cell: { radius: number; squash: number } } {
  const width = (SQRT3 * radius) / n.dx;
  const height = (width * art.height) / art.width;
  const squash = (n.dy * height) / (1.5 * radius);
  const cellRadius = (n.hexWidth * width) / SQRT3;
  return {
    projection: { radius, squash, originX: n.x0 * width, originY: n.y0 * height },
    art: { x: 0, y: 0, width, height },
    cell: { radius: cellRadius, squash: (n.hexHeight * height) / (2 * cellRadius) },
  };
}

// ------------------------------------------------------------------ piecewise (cell-table) boards

/**
 * One cell of a delivered per-cell projection (sea-creature delivery 2026-10-17,
 * `design/battlefield-layout.json`): its centre and its drawn width and height as fractions of the
 * painting. A piecewise board — the single-ship sea encounter, deck and water with a gap at the rail —
 * is not one regular grid, so every cell is placed (and hit-tested) by its own entry.
 */
export type NormalizedCell = readonly [col: number, row: number, x: number, y: number, width: number, height: number];

/**
 * A piecewise board in board pixels: the painting sized so the deck's column step is one standard hex
 * width (`radius`·√3), each cell's centre and pointy-top polygon from its table entry. Drawing, sprite
 * placement and hit-testing all read this one table (`tableCellPoint`, `tableCellPolygon`,
 * `pickTableCell`), so a sprite's size never changes which cell a click selects, and a click on the rail,
 * a gap between cells or the margins selects nothing.
 */
export interface TableProjection {
  readonly cols: number;
  readonly rows: number;
  /** Board pixels: centre x/y and half width/height per cell, row-major (index = row * cols + col); NaN = no cell. */
  readonly cx: Float64Array;
  readonly cy: Float64Array;
  readonly hw: Float64Array;
  readonly hh: Float64Array;
  /** The painting's rectangle in board pixels. */
  readonly art: { readonly x: number; readonly y: number; readonly width: number; readonly height: number };
  /** The standard-board equivalent (offsets, foreshortening): the deck's column pitch and the row pitch. */
  readonly radius: number;
  readonly squash: number;
}

/**
 * The table projection of a painting `art` (native size) whose cells are `cells`. `pitch` is the
 * reference column step (fraction of the art) that becomes one standard hex width: the median step
 * between neighbouring cells of a row, when not given.
 */
export function tableProjection(cells: readonly NormalizedCell[], cols: number, rows: number, art: { readonly width: number; readonly height: number }, radius = 1, pitch?: number): TableProjection {
  const step = pitch ?? medianColumnStep(cells);
  const width = (SQRT3 * radius) / Math.max(1e-6, step);
  const height = (width * art.height) / art.width;
  const n = cols * rows;
  const cx = new Float64Array(n).fill(Number.NaN);
  const cy = new Float64Array(n).fill(Number.NaN);
  const hw = new Float64Array(n).fill(Number.NaN);
  const hh = new Float64Array(n).fill(Number.NaN);
  const ys: number[] = [];
  for (const [col, row, x, y, w, h] of cells) {
    if (col < 0 || row < 0 || col >= cols || row >= rows) continue;
    const i = row * cols + col;
    cx[i] = x * width;
    cy[i] = y * height;
    hw[i] = (w * width) / 2;
    hh[i] = (h * height) / 2;
    if (col === 0) ys[row] = y * height;
  }
  const rowStep = ys.length > 1 && ys[0] !== undefined && ys[1] !== undefined ? ys[1] - ys[0] : 1.5 * radius;
  return { cols, rows, cx, cy, hw, hh, art: { x: 0, y: 0, width, height }, radius, squash: rowStep / (1.5 * radius) };
}

function medianColumnStep(cells: readonly NormalizedCell[]): number {
  const byKey = new Map(cells.map((c) => [`${c[0]}:${c[1]}`, c] as const));
  const steps: number[] = [];
  for (const c of cells) {
    const next = byKey.get(`${c[0] + 1}:${c[1]}`);
    if (next) steps.push(next[2] - c[2]);
  }
  steps.sort((a, b) => a - b);
  return steps.length ? steps[Math.floor(steps.length / 2)]! : 0.05;
}

/** Centre of a cell on a table board (NaN for a cell the table lacks). */
export function tableCellPoint(c: BattleCell, t: TableProjection): Point {
  if (c.col < 0 || c.row < 0 || c.col >= t.cols || c.row >= t.rows) return { x: Number.NaN, y: Number.NaN };
  const i = c.row * t.cols + c.col;
  return { x: t.cx[i]!, y: t.cy[i]! };
}

/** The pointy-top polygon of a cell on a table board, `k` of its size, as flat [x0, y0, …] (empty when absent). */
export function tableCellPolygon(c: BattleCell, t: TableProjection, k = 1): number[] {
  const p = tableCellPoint(c, t);
  if (!Number.isFinite(p.x)) return [];
  const i = c.row * t.cols + c.col;
  const w = t.hw[i]! * k;
  const h = t.hh[i]! * k;
  return [p.x, p.y - h, p.x + w, p.y - h / 2, p.x + w, p.y + h / 2, p.x, p.y + h, p.x - w, p.y + h / 2, p.x - w, p.y - h / 2];
}

/** A point inside a convex polygon given as flat [x0, y0, …] (boundary included). */
export function insidePolygon(x: number, y: number, poly: readonly number[]): boolean {
  let sign = 0;
  const n = poly.length / 2;
  for (let i = 0; i < n; i++) {
    const ax = poly[2 * i]!;
    const ay = poly[2 * i + 1]!;
    const bx = poly[(2 * ((i + 1) % n))]!;
    const by = poly[(2 * ((i + 1) % n)) + 1]!;
    const cross = (bx - ax) * (y - ay) - (by - ay) * (x - ax);
    if (cross === 0) continue;
    const s = cross > 0 ? 1 : -1;
    if (sign === 0) sign = s;
    else if (s !== sign) return false;
  }
  return n >= 3;
}

/**
 * The cell a click or hover at a board point selects on a table board: the cell whose drawn polygon holds
 * the point (the exact inverse of the drawing), optionally limited by `legal`; null on the rail, between
 * cells or outside the board — never the nearest cell.
 */
export function pickTableCell(x: number, y: number, t: TableProjection, legal?: (c: BattleCell) => boolean): BattleCell | null {
  for (let row = 0; row < t.rows; row++) {
    for (let col = 0; col < t.cols; col++) {
      const i = row * t.cols + col;
      if (!Number.isFinite(t.cx[i]!)) continue;
      if (Math.abs(x - t.cx[i]!) > t.hw[i]! || Math.abs(y - t.cy[i]!) > t.hh[i]!) continue;
      const c = { col, row };
      if (!insidePolygon(x, y, tableCellPolygon(c, t))) continue;
      return legal && !legal(c) ? null : c;
    }
  }
  return null;
}

/** The six corners of a pointy-top hex around (0, 0), foreshortened. */
export function hexCorners(radius = 1, squash = MAP_SQUASH): Point[] {
  const out: Point[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 180) * (60 * i - 30);
    out.push({ x: radius * Math.cos(a), y: radius * Math.sin(a) * squash });
  }
  return out;
}

/** Flat [x0, y0, x1, y1, …] polygon of a hex centred on (cx, cy). */
export function hexPolygon(cx: number, cy: number, radius: number, squash: number): number[] {
  const out: number[] = [];
  for (const p of hexCorners(radius, squash)) out.push(cx + p.x, cy + p.y);
  return out;
}

/** Eight map directions, east first, counter-clockwise on screen. */
export const MAP_DIRECTIONS = ['e', 'ne', 'n', 'nw', 'w', 'sw', 's', 'se'] as const;
export type MapDirection = (typeof MAP_DIRECTIONS)[number];

/** The map direction of a screen vector (+y down). */
export function directionOf(dx: number, dy: number): MapDirection {
  const a = Math.atan2(-dy, dx); // counter-clockwise from east
  const i = Math.round(a / (Math.PI / 4));
  return MAP_DIRECTIONS[(i + 8) % 8]!;
}
