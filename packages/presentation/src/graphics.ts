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
  /** Map decoration kept: 'all', 'no-grass' (no grass tufts or shrubs), 'sparse' (trees and rocks thinned by half). */
  readonly decor: 'all' | 'no-grass' | 'sparse';
  /** Small ambient animations (idle loops on the map and battlefield, beacon glows, cheering). */
  readonly ambientMotion: boolean;
  /** Spell and combat effects: 'full' (effect strips and glows), 'simple' (short flashes only). */
  readonly effects: 'full' | 'simple';
  /** Frames per second at most (0: the display's own rate). */
  readonly frameCap: number;
}

export const GRAPHICS_PRESETS: Readonly<Record<GraphicsQuality, GraphicsProfile>> = {
  high: { quality: 'high', maxPixelRatio: 2, renderScale: 1, antialias: true, shadows: true, paintedGround: true, decor: 'all', ambientMotion: true, effects: 'full', frameCap: 0 },
  medium: { quality: 'medium', maxPixelRatio: 1, renderScale: 1, antialias: true, shadows: true, paintedGround: true, decor: 'no-grass', ambientMotion: true, effects: 'full', frameCap: 60 },
  low: { quality: 'low', maxPixelRatio: 1, renderScale: 0.7, antialias: false, shadows: false, paintedGround: false, decor: 'sparse', ambientMotion: false, effects: 'simple', frameCap: 30 },
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
