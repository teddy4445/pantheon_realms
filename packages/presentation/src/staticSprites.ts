/**
 * Small helpers shared by the 2D views: still sprites from the manifest
 * (loaded in the background, drawn once ready), soft ground shadows, colours.
 */
import { Graphics, Sprite, Texture } from 'pixi.js';
import type { StaticSpriteDefinition } from './sprites';
import { loadFile } from './textures';

/** A manifest still, anchored and scaled so `pixelsPerHex` source pixels span `hexWidth` view units. */
export function stillSprite(def: StaticSpriteDefinition | null, hexWidth: number, size = 1): Sprite {
  const s = new Sprite(Texture.EMPTY);
  if (!def) return s;
  s.anchor.set(def.anchor[0], def.anchor[1]);
  s.scale.set((hexWidth / def.pixelsPerHex) * size);
  s.visible = false;
  void loadFile(def.file).then(
    (t) => {
      if (s.destroyed) return;
      s.texture = t;
      s.visible = true;
    },
    () => undefined,
  );
  return s;
}

/** Height above the anchor a still will cover once drawn (view units). */
export function stillHeight(def: StaticSpriteDefinition | null, hexWidth: number, size = 1): number {
  if (!def) return 0;
  return def.height * def.anchor[1] * (hexWidth / def.pixelsPerHex) * size;
}

/** A soft elliptical ground shadow centred on (0, 0). */
export function groundShadow(rx: number, ry: number, alpha = 0.32): Graphics {
  const g = new Graphics();
  for (let i = 0; i < 4; i++) {
    const k = 1 - i * 0.18;
    g.ellipse(0, 0, rx * k, ry * k).fill({ color: 0x000000, alpha: alpha / 4 });
  }
  return g;
}

/** '#rrggbb' → 0xrrggbb. */
export function colorOf(hex: string | null | undefined, fallback = 0x9a9a9a): number {
  if (!hex) return fallback;
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return Number.isFinite(n) ? n : fallback;
}

/** Multiply an RGB colour (0..1 components) into a 0xrrggbb number. */
export function rgbOf(r: number, g: number, b: number): number {
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v * 255)));
  return (c(r) << 16) | (c(g) << 8) | c(b);
}
