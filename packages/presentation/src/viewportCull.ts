import type { Container } from 'pixi.js';

export interface WorldViewport { left: number; top: number; right: number; bottom: number }

/** Cull only drawing, never fog visibility, picking or playback. Bounds include loaded
 * artwork, flags and particles; transformed corners handle mirrored and rotated objects.
 * Pixi caches unchanged local bounds, so static scenery does not rebuild its geometry.
 * `view` must use the objects' parent coordinates (their local transform is applied
 * here, not the full world transform). Only renderable changes; visible remains
 * available to fog and interaction logic. Returns the number culled this pass. */
export function cullMapObjects(objects: readonly Container[], view: WorldViewport): number {
  let culled = 0;
  for (const object of objects) {
    if (!object.visible) continue;
    const b = object.getLocalBounds();
    object.updateLocalTransform();
    const m = object.localTransform;
    const cx = (b.minX + b.maxX) / 2, cy = (b.minY + b.maxY) / 2;
    const hw = (b.maxX - b.minX) / 2, hh = (b.maxY - b.minY) / 2;
    const x = m.a * cx + m.c * cy + m.tx, y = m.b * cx + m.d * cy + m.ty;
    const ex = Math.abs(m.a) * hw + Math.abs(m.c) * hh;
    const ey = Math.abs(m.b) * hw + Math.abs(m.d) * hh;
    const draw = x + ex >= view.left && x - ex <= view.right && y + ey >= view.top && y - ey <= view.bottom;
    if (object.renderable !== draw) object.renderable = draw;
    if (!draw) culled++;
  }
  return culled;
}
