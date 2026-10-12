/**
 * Small helpers shared by the 2D views: still sprites from the manifest
 * (loaded in the background, drawn once ready), soft ground shadows, colours.
 */
import { Graphics, Rectangle, Sprite, Texture, type Container } from 'pixi.js';
import type { StaticSpriteDefinition } from './sprites';
import { loadFile } from './textures';
const stillFrames = new Map<string, Texture>();

/** Shared atlas views keep native pixels and never allocate duplicate image sources. */
export async function stillTexture(def: StaticSpriteDefinition): Promise<Texture> {
  const texture=await loadFile(def.file);
  if(!def.frame)return texture;
  const key=`${def.file}:${def.frame.join(',')}`;
  let frame=stillFrames.get(key);
  if(!frame){frame=new Texture({source:texture.source,frame:new Rectangle(...def.frame)});stillFrames.set(key,frame);}
  return frame;
}

/** A manifest still, anchored and scaled so `pixelsPerHex` source pixels span `hexWidth` view units. */
export function stillSprite(def: StaticSpriteDefinition | null, hexWidth: number, size = 1): Sprite {
  const s = new Sprite(Texture.EMPTY);
  if (!def) return s;
  s.anchor.set(def.anchor[0], def.anchor[1]);
  s.scale.set((hexWidth / def.pixelsPerHex) * size);
  s.visible = false;
  void stillTexture(def).then(
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

let shadowTexture: Texture | null | undefined;

/**
 * The shared shadow picture: a soft black disc whose falloff matches the four
 * stacked ellipses the shadows used to be drawn with (radii 1, 0.82, 0.64 and
 * 0.46, a quarter of the darkness each), smoothed. One small texture for every
 * shadow: four vertices each instead of about 130 (2026-10-06 frame-rate work).
 */
function shadowPicture(): Texture | null {
  if (shadowTexture !== undefined) return shadowTexture;
  shadowTexture = null;
  if (typeof document === 'undefined') return null;
  const size = 64;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  if (!ctx) return null;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  for (const [at, a] of [[0, 1], [0.46, 1], [0.55, 0.875], [0.64, 0.75], [0.73, 0.625], [0.82, 0.5], [0.92, 0.3], [1, 0]] as const) g.addColorStop(at, `rgba(0, 0, 0, ${a})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  shadowTexture = Texture.from(c);
  return shadowTexture;
}

/** A soft elliptical ground shadow centred on (0, 0). */
export function groundShadow(rx: number, ry: number, alpha = 0.32): Container {
  const tex = shadowPicture();
  if (tex) {
    const s = new Sprite(tex);
    s.anchor.set(0.5);
    s.width = rx * 2;
    s.height = ry * 2;
    s.alpha = alpha;
    return s;
  }
  // No canvas (tests outside a browser): the drawn shadow.
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
