/**
 * Graphics quality presets (owner request 2026-10-03: "graphics quality
 * settings would help on weaker PCs"; owner choice: presets + automatic pick),
 * for the 2D renderer.
 *
 * No PixiJS import: the interface reads the presets and the automatic pick
 * from `@pr/presentation/core` at start-up; the engine host and the two views
 * read the active profile when they build. The values are proposed defaults,
 * measured only on the development machine (DEVELOPMENT_STATUS.md).
 */

export type GraphicsQuality = 'low' | 'medium' | 'high';

export interface GraphicsProfile {
  readonly quality: GraphicsQuality;
  /** Highest device-pixel ratio rendered (sharpness on high-DPI screens). */
  readonly maxPixelRatio: number;
  /** Fraction of that resolution actually rendered (the image is scaled up to fill the view). */
  readonly renderScale: number;
  /** Multisample anti-aliasing of shape edges (a WebGL context attribute: takes effect at the next start). */
  readonly antialias: boolean;
  /** Soft ground shadows under figures, heroes, map objects and obstacles. */
  readonly shadows: boolean;
  /** Painted ground, sea, sky and battlefield art (off: the plain procedural colours). */
  readonly paintedGround: boolean;
  /** Ground types fade into each other on the adventure map (one blended picture at load). */
  readonly softGround: boolean;
  /** Map decoration kept: 'all', 'no-grass' (no grass tufts or shrubs), 'sparse' (trees and rocks thinned by half). */
  readonly decor: 'all' | 'no-grass' | 'sparse';
  /** Small ambient animations (idle loops on the map and battlefield, beacon glows, cheering). */
  readonly ambientMotion: boolean;
  /** Spell and combat effects: 'full' (effect strips and glows), 'simple' (short flashes only). */
  readonly effects: 'full' | 'simple';
  /** Frames per second at most (0: the display's own rate). */
  readonly frameCap: number;
}

let adaptive = true;

/**
 * Adaptive resolution (Settings → Display; on by default): the engine draws
 * fewer pixels while frames run slower than about 34 per second, and returns
 * to the preset's resolution when they are fast again (`engineHost.ts`).
 */
export function adaptiveResolution(): boolean {
  return adaptive;
}

export function setAdaptiveResolution(on: boolean): void {
  adaptive = on;
}

/** Adaptive resolution: what the engine keeps between its two-second judgements. */
export interface AdaptState {
  /** Fraction of the preset's resolution drawn (1 = all of it). */
  readonly scale: number;
  readonly lastChange: number;
  readonly lastRaise: number;
  /** A scale found too slow soon after a step up, not tried again until `ceilingUntil`. */
  readonly ceiling: number;
  readonly ceilingUntil: number;
}

export const ADAPT_START: AdaptState = { scale: 1, lastChange: -Infinity, lastRaise: -Infinity, ceiling: 1, ceilingUntil: 0 };
/** Resolution steps of 85 %, to 60 % of the preset's at least; a step is judged for six seconds. */
export const ADAPT_STEP = 0.85;
export const ADAPT_MIN_SCALE = 0.6;
const ADAPT_SETTLE_MS = 6000;

/**
 * One judgement of adaptive resolution over the last window of frames: their
 * mean time (ms) and the share of the window the main thread spent in long
 * tasks (game logic, the interface — a lower resolution would not help those).
 * Too slow (under about 34 frames per second, or clearly under a lower frame
 * cap) while drawing: one step down. At the cap again (within 10 %) and settled:
 * one step back up, unless that step proved too slow a minute ago or less.
 */
export function adaptResolutionStep(s: AdaptState, w: { now: number; meanMs: number; busyShare: number; frameCap: number }): AdaptState {
  const cap = w.frameCap > 0 ? w.frameCap : 60;
  const slow = Math.max(1000 / 34, (1000 / cap) * 1.12);
  if (w.meanMs > slow && w.busyShare < 0.25 && s.scale > ADAPT_MIN_SCALE + 1e-6) {
    const tooHigh = w.now - s.lastRaise < ADAPT_SETTLE_MS;
    return {
      scale: Math.max(ADAPT_MIN_SCALE, s.scale * ADAPT_STEP),
      lastChange: w.now,
      lastRaise: s.lastRaise,
      ceiling: tooHigh ? s.scale - 1e-6 : s.ceiling,
      ceilingUntil: tooHigh ? w.now + 60_000 : s.ceilingUntil,
    };
  }
  if (w.meanMs < (1000 / Math.min(cap, 60)) * 1.1 && s.scale < 1 && w.now - s.lastChange > ADAPT_SETTLE_MS) {
    const next = Math.min(1, s.scale / ADAPT_STEP);
    if (w.now < s.ceilingUntil && next > s.ceiling) return s;
    return { ...s, scale: next, lastChange: w.now, lastRaise: w.now };
  }
  return s;
}

/**
 * Frame-rate cap: whether a display frame at `now` is drawn, and when the next
 * one is due. Due times advance by the cap's period (not from the frame drawn),
 * so a display whose rate is not a multiple of the cap (144 Hz, cap 60) still
 * averages the cap; 1 ms of slack. Returns null when the frame is skipped.
 */
export function frameDue(now: number, nextDue: number, frameCap: number): number | null {
  if (frameCap <= 0) return nextDue;
  if (now < nextDue - 1) return null;
  const period = 1000 / frameCap;
  return Math.max(nextDue, now - period) + period;
}

export const GRAPHICS_PRESETS: Readonly<Record<GraphicsQuality, GraphicsProfile>> = {
  high: { quality: 'high', maxPixelRatio: 2, renderScale: 1, antialias: true, shadows: true, paintedGround: true, softGround: true, decor: 'all', ambientMotion: true, effects: 'full', frameCap: 60 },
  medium: { quality: 'medium', maxPixelRatio: 1, renderScale: 1, antialias: true, shadows: true, paintedGround: true, softGround: true, decor: 'no-grass', ambientMotion: true, effects: 'full', frameCap: 60 },
  low: { quality: 'low', maxPixelRatio: 1, renderScale: 0.7, antialias: false, shadows: false, paintedGround: false, softGround: true, decor: 'sparse', ambientMotion: false, effects: 'simple', frameCap: 30 },
};

let active: GraphicsProfile = GRAPHICS_PRESETS.high;
const listeners = new Set<(p: GraphicsProfile) => void>();

/** The profile the engine and the views use now. */
export function graphicsProfile(): GraphicsProfile {
  return active;
}

/** Switch presets (Settings, or the automatic pick). The engine applies resolution and frame cap at once; views on their next build. */
export function setGraphicsQuality(q: GraphicsQuality): void {
  const next = GRAPHICS_PRESETS[q] ?? GRAPHICS_PRESETS.high;
  if (next === active) return;
  active = next;
  for (const l of listeners) l(active);
}

export function onGraphicsChange(l: (p: GraphicsProfile) => void): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

/**
 * Rendered pixels per CSS pixel for a profile on a screen with this
 * device-pixel ratio (1 = one rendered pixel per CSS pixel).
 */
export function renderResolution(p: GraphicsProfile, devicePixelRatio: number): number {
  return Math.max(0.5, Math.min(p.maxPixelRatio, devicePixelRatio || 1)) * p.renderScale;
}

/** What the quick start-up test measured (graphicsProbe.ts in the interface). */
export interface GraphicsProbeResult {
  /** WebGL 2 context could be created. */
  readonly webgl2: boolean;
  /** Unmasked renderer string when the browser reveals it (else ''). */
  readonly renderer: string;
  /** Milliseconds per full-screen pass of the test shader at 1280×720 (median). */
  readonly msPerPass: number;
  readonly cores: number;
  /** Device memory in GB when the browser reports it (else null). */
  readonly memoryGb: number | null;
}

/** Software renderers: always Low. */
const SOFTWARE = /swiftshader|llvmpipe|softpipe|basic render|software/i;

/**
 * Pick a preset from the quick test. Thresholds are proposed: a pass of the
 * test shader under 4 ms is a capable GPU (High), under 12 ms Medium, slower Low;
 * few cores or little memory cap the pick at Medium.
 */
export function classifyGraphics(r: GraphicsProbeResult): GraphicsQuality {
  if (!r.webgl2 || SOFTWARE.test(r.renderer) || !Number.isFinite(r.msPerPass)) return 'low';
  let q: GraphicsQuality = r.msPerPass < 4 ? 'high' : r.msPerPass < 12 ? 'medium' : 'low';
  if (q === 'high' && (r.cores < 4 || (r.memoryGb !== null && r.memoryGb < 4))) q = 'medium';
  return q;
}
