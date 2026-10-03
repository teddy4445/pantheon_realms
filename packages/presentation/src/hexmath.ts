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
