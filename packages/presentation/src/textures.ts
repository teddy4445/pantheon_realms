/**
 * Texture loading for the 2D views: images come from the game's own runtime
 * folder (the browser build, the dev server or the desktop `prgame://`
 * protocol alike), decoded on the main thread — no workers, no network.
 * Strips are cut into frame textures once and cached for the session.
 */
import { Rectangle, Texture } from 'pixi.js';
import { spriteUrl, type SpriteStrip } from './sprites';

const images = new Map<string, Promise<Texture>>();
const strips = new Map<string, Texture[]>();
const ready = new Map<string, Texture>();

/** Load one image as a texture (cached by URL; a failed load may be retried later). */
export function loadTexture(url: string): Promise<Texture> {
  let p = images.get(url);
  if (!p) {
    p = new Promise<Texture>((resolve, reject) => {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => {
        const t = Texture.from(img);
        ready.set(url, t);
        resolve(t);
      };
      img.onerror = () => reject(new Error(`Could not load ${url}`));
      img.src = url;
    });
    p.catch(() => images.delete(url));
    images.set(url, p);
  }
  return p;
}

/** A texture already loaded (never starts a load). */
export function loadedTexture(url: string): Texture | null {
  return ready.get(url) ?? null;
}

/** Load a manifest file (path relative to the application root). */
export function loadFile(file: string): Promise<Texture> {
  return loadTexture(spriteUrl(file));
}

/** The frames of a strip once its image is loaded. */
export async function loadStrip(strip: SpriteStrip): Promise<Texture[]> {
  const hit = strips.get(strip.file);
  if (hit) return hit;
  const base = await loadFile(strip.file);
  const again = strips.get(strip.file);
  if (again) return again;
  const frames: Texture[] = [];
  const n = Math.max(1, strip.frames);
  for (let i = 0; i < n; i++) {
    frames.push(new Texture({ source: base.source, frame: new Rectangle(i * strip.frameWidth, 0, Math.min(strip.frameWidth, base.width - i * strip.frameWidth), Math.min(strip.frameHeight, base.height)) }));
  }
  strips.set(strip.file, frames);
  return frames;
}

/** Frames of a strip if already cut (synchronous; null while loading). */
export function stripFrames(strip: SpriteStrip): Texture[] | null {
  return strips.get(strip.file) ?? null;
}
