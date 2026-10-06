/**
 * Texture loading for the 2D views: images come from the game's own runtime
 * folder (the browser build, the dev server or the desktop `prgame://`
 * protocol alike) — no network. Strips are cut into frame textures once and
 * cached for the session.
 *
 * Frame rate (2026-10-06): an image is decoded by the browser off the main
 * thread (`createImageBitmap`) and handed to the GPU a little at a time by the
 * engine (`takeUploads`), so the first frame that shows a new strip (a
 * creature's first attack) no longer stalls on decoding and uploading it.
 */
import { Rectangle, Texture, type TextureSource } from 'pixi.js';
import { spriteUrl, type SpriteStrip } from './sprites';

const images = new Map<string, Promise<Texture>>();
const strips = new Map<string, Texture[]>();
/** Loaded pictures not yet sent to the GPU, oldest first; `urgent` ones (animation strips, effects, icons) go first. */
const uploads = new Set<TextureSource>();
const urgent = new Set<TextureSource>();
/** The texture source of each loaded URL, and the URLs asked for urgently before their picture arrived. */
const sourceOf = new Map<string, TextureSource>();
const wantsUrgent = new Set<string>();
/** Who waits for each queued picture to reach the GPU (its loader's promise). */
const waiting = new Map<TextureSource, () => void>();
/** A picture the engine has not sent within this time is handed out anyway (no view running: it uploads when drawn). */
const UPLOAD_WAIT_MS = 1500;

/**
 * Resolve once the engine has sent `source` to the GPU (or after a short wait),
 * so a sprite never shows a picture the frame itself would have to upload —
 * a map's hundred scenery pictures arrive a few per frame instead of all in the
 * first one (nature expansion, 2026-10-06).
 */
function uploaded(source: TextureSource): Promise<void> {
  return new Promise<void>((resolve) => {
    const done = () => {
      clearTimeout(timer);
      waiting.delete(source);
      resolve();
    };
    const timer = setTimeout(done, UPLOAD_WAIT_MS);
    waiting.set(source, done);
  });
}

/** The engine sent `source` to the GPU (or it was destroyed): release whoever waits for it. */
export function markUploaded(source: TextureSource): void {
  waiting.get(source)?.();
}

/** A decoded picture (off the main thread), or null where that is not available. */
async function decoded(url: string): Promise<ImageBitmap | null> {
  if (typeof createImageBitmap !== 'function' || typeof fetch !== 'function') return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await createImageBitmap(await res.blob());
  } catch {
    return null;
  }
}

function viaImage(url: string): Promise<Texture> {
  return new Promise<Texture>((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(Texture.from(img));
    img.onerror = () => reject(new Error(`Could not load ${url}`));
    img.src = url;
  });
}

/**
 * Load one image as a texture (cached by URL; a failed load may be retried
 * later). `mipmaps`: smaller copies for drawing it much smaller than its size
 * (the map's ground paintings), which also spares the GPU's memory traffic.
 */
export function loadTexture(url: string, opts?: { mipmaps?: boolean; urgent?: boolean }): Promise<Texture> {
  let p = images.get(url);
  if (opts?.urgent) {
    // Asked for again by a figure or an effect while still waiting behind the scenery: move it to the front.
    wantsUrgent.add(url);
    const src = sourceOf.get(url);
    if (src && uploads.delete(src)) urgent.add(src);
  }
  if (!p) {
    p = decoded(url).then(async (bmp) => {
      const t = bmp ? Texture.from(bmp) : await viaImage(url);
      if (opts?.mipmaps) t.source.autoGenerateMipmaps = true;
      sourceOf.set(url, t.source);
      (wantsUrgent.has(url) ? urgent : uploads).add(t.source);
      await uploaded(t.source);
      return t;
    });
    p.catch(() => images.delete(url));
    images.set(url, p);
  }
  return p;
}

/**
 * Loaded pictures waiting for the GPU, oldest first, at most `max` (the engine
 * uploads them between frames within a time budget). Taken ones leave the queue.
 */
export function takeUploads(max: number): TextureSource[] {
  const out: TextureSource[] = [];
  for (const queue of [urgent, uploads]) {
    for (const s of queue) {
      queue.delete(s);
      if (s.destroyed) {
        markUploaded(s);
        continue;
      }
      out.push(s);
      if (out.length >= max) return out;
    }
  }
  return out;
}

/** Pictures still waiting for the GPU (diagnostics). */
export function pendingUploads(): number {
  return uploads.size + urgent.size;
}

/** Load a manifest file (path relative to the application root). */
export function loadFile(file: string, opts?: { urgent?: boolean }): Promise<Texture> {
  return loadTexture(spriteUrl(file), opts);
}

/** The frames of a strip once its image is loaded. */
export async function loadStrip(strip: SpriteStrip): Promise<Texture[]> {
  const hit = strips.get(strip.file);
  if (hit) return hit;
  // Animation strips (figures, effects) go to the GPU before scenery stills.
  const base = await loadFile(strip.file, { urgent: true });
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
