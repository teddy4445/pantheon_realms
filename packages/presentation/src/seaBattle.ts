/**
 * Sea-encounter presentation helpers (sea-creature delivery 2026-10-17; presentation only, no PixiJS —
 * part of `@pr/presentation/core`): how high an intrinsic flyer hovers over the water, how a creature
 * that dies over the water settles, and the once-per-action-token guard for cosmetic events. Nothing
 * here reads or changes game state, draws RNG or decides an outcome; the rules resolved everything
 * before playback starts.
 */
import type { SpriteSetDefinition } from './sprites';

/** A footprint stands over the water of a sea board: some cell's zone letter is water and water is open there. */
export function overOpenWater(cells: readonly { col: number; row: number }[], board: { readonly cells: string; readonly cols: number; readonly legalCodes?: string } | null): boolean {
  if (!board || !board.legalCodes?.includes('.')) return false;
  return cells.some((c) => board.cells[c.row * board.cols + c.col] === '.');
}

/**
 * The visual hover of a figure in board pixels: the set's standing height (`events.hover.idleHex`, 0.12
 * hex for the Hippocampi) over open water, nothing on deck or for sets without hover metadata. Purely
 * visual: the logical cell, its occupancy and every hit test stay on the ground point.
 */
export function hoverPx(set: SpriteSetDefinition | null | undefined, overWater: boolean, hexW: number): number {
  const h = set?.events?.hover?.idleHex ?? 0;
  return overWater && h > 0 ? h * hexW : 0;
}

/** A flyer's travel height in board pixels (`events.hover.travelHex`, 0.4 hex for the Hippocampi); null: the renderer's default arc. */
export function travelLiftPx(set: SpriteSetDefinition | null | undefined, hexW: number): number | null {
  const h = set?.events?.hover?.travelHex ?? 0;
  return h > 0 ? h * hexW : null;
}

/**
 * How a creature that died over the water settles after its held death pose: sink by `sinkHex` and fade
 * over `fadeMs` (the delivered metadata). The fallen keep their cells in the rules (shared occupancy), so
 * the figure fades only to `CORPSE_ALPHA_OVER_WATER` and stays readable. Null on deck, without metadata,
 * or when the set holds its pose. With reduced motion the end state is shown at once.
 */
export const CORPSE_ALPHA_OVER_WATER = 0.45;
export function waterDeathSettle(set: SpriteSetDefinition | null | undefined, overWater: boolean, hexW: number): { readonly sinkPx: number; readonly fadeMs: number; readonly alpha: number } | null {
  const d = set?.events?.death;
  if (!overWater || !d || d.onWater !== 'sink-fade') return null;
  return { sinkPx: (d.sinkHex ?? 0.12) * hexW, fadeMs: d.fadeMs ?? 450, alpha: CORPSE_ALPHA_OVER_WATER };
}

/**
 * Cosmetic events play at most once per action token (a committed event's ID): a batch delivered twice,
 * a skip, a speed change or a reload never replays a release, a contact or an impact. Events without a
 * token always play (synthetic previews).
 */
export class ActionTokens {
  private readonly seen = new Set<string>();
  private readonly order: string[] = [];
  constructor(private readonly limit = 4096) {}

  /** True the first time a token is offered (and for no token); false when it has already played. */
  take(token: string | null | undefined): boolean {
    if (!token) return true;
    if (this.seen.has(token)) return false;
    this.seen.add(token);
    this.order.push(token);
    if (this.order.length > this.limit) this.seen.delete(this.order.shift()!);
    return true;
  }

  has(token: string): boolean {
    return this.seen.has(token);
  }
}
