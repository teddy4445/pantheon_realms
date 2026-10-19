/**
 * The siege attacker's stationary catapult on the battle board (`targetableCatapultV1`; expedition kit
 * 2026-10-17): which picture stands for which HP, how its painted part is sized and placed, and the
 * restrained trajectory shown while it is aimed. Pixi-free (part of `@pr/presentation/core`), so the
 * interface and tests can use the same numbers. Presentation only: never a rule or a random draw.
 *
 * Pictures: intact = the Brief 15 still `siege.catapult.intact` (256 × 256, the throw strip shares its
 * frame, anchor and scale); damaged / destroyed = the kit's `expedition.catapult-damaged` /
 * `-destroyed` (1254 × 1254 canvases with different transparent margins). Each is drawn by its
 * VISIBLE box: the intact engine's painted width is the reference, the damaged one matches it, and
 * the wreck keeps its own proportion to the damaged one (both were painted on the same canvas
 * scale). The bottom centre of the visible box stands on the engine's ground point.
 */

export type EngineStage = 'intact' | 'damaged' | 'destroyed';

/** A stage picture and its painted box as fractions [left, top, right, bottom] of the canvas. */
export interface EngineStageArt {
  readonly url: string;
  readonly width: number;
  readonly height: number;
  readonly visibleBounds: readonly [number, number, number, number];
}

/**
 * The delivered engine art (the Brief 15 still, its throw strip and the kit's two damage stages)
 * throws to the RIGHT: the arm rests pointing left and swings up over the frame toward the east
 * (checked frame by frame, 2026-10-17). The handoff (§10) calls it left-facing, but its intent is
 * that the attacker's engine throws toward the walls on the right — so the attacker draws it
 * unmirrored.
 */
export const ENGINE_ART_FACING: 1 | -1 = 1;

/** Painted box of `siege.catapult.intact` (256 × 256 px, alpha above 32), measured 2026-10-17. */
export const CATAPULT_INTACT_VISIBLE: readonly [number, number, number, number] = [33 / 256, 136 / 256, 223 / 256, 243 / 256];

/** Picture stage for the engine's HP (policy: intact above half, damaged 1 to half, destroyed at 0). */
export function engineStageOf(hp: number, maxHp: number): EngineStage {
  if (hp <= 0) return 'destroyed';
  return hp * 2 > maxHp ? 'intact' : 'damaged';
}

/** How to draw a stage picture: sprite scale (x mirrored to face `facing`) and anchor (fractions). */
export interface EngineDraw {
  readonly scaleX: number;
  readonly scaleY: number;
  readonly anchorX: number;
  readonly anchorY: number;
}

/**
 * Size a stage by its painted box: `visibleWidth` board pixels wide for the reference stage; with
 * `relativeTo` (the damaged picture, painted at the same canvas scale as the wreck) the picture keeps
 * that reference's pixel scale instead, so a wreck is not blown up to a whole engine's width.
 */
export function engineStageDraw(art: Pick<EngineStageArt, 'width' | 'visibleBounds'>, visibleWidth: number, facing: 1 | -1, relativeTo?: Pick<EngineStageArt, 'width' | 'visibleBounds'> | null): EngineDraw {
  const ref = relativeTo ?? art;
  const refPx = Math.max(1, (ref.visibleBounds[2] - ref.visibleBounds[0]) * ref.width);
  const k = visibleWidth / refPx;
  const [l, , r, b] = art.visibleBounds;
  const flip = facing === ENGINE_ART_FACING ? 1 : -1;
  return { scaleX: k * flip, scaleY: k, anchorX: (l + r) / 2, anchorY: b };
}

/** The painted box of a drawn stage around its ground point (board pixels): for hit areas and outlines. */
export function engineDrawnBox(art: Pick<EngineStageArt, 'width' | 'height' | 'visibleBounds'>, draw: EngineDraw, ground: { x: number; y: number }): { x0: number; y0: number; x1: number; y1: number } {
  const [l, t, r, b] = art.visibleBounds;
  const w = Math.abs(draw.scaleX) * art.width * (r - l);
  const h = draw.scaleY * art.height * (b - t);
  return { x0: ground.x - w / 2, y0: ground.y - h, x1: ground.x + w / 2, y1: ground.y };
}

/**
 * A restrained trajectory from the engine's cup to a structure: a quadratic arc whose apex rises a
 * fraction of the distance (capped), sampled into `n` points (board pixels; for the aiming preview).
 */
export function catapultArc(from: { x: number; y: number }, to: { x: number; y: number }, n = 24, rise = 0.12, cap = 90): { x: number; y: number }[] {
  const dist = Math.hypot(to.x - from.x, to.y - from.y);
  const h = Math.min(cap, dist * rise);
  const mx = (from.x + to.x) / 2;
  const my = Math.min(from.y, to.y) - h;
  const out: { x: number; y: number }[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const a = (1 - t) * (1 - t);
    const c = 2 * (1 - t) * t;
    const d = t * t;
    out.push({ x: a * from.x + c * mx + d * to.x, y: a * from.y + c * my + d * to.y });
  }
  return out;
}
