/**
 * Coastal sites and sea salvage on the map — the pure layout of their pictures (sea-sites kit 2026-10-17;
 * assets-runtime/sea-sites-v1/manifest.json, written by tools/assets/import_sea_sites.py). PixiJS-free, so
 * the interface and tests read it from `@pr/presentation/core`; the layer that draws it is `seaSites.ts`.
 *
 * Each picture is scaled by its PAINTED bounds, never by the transparent canvas: towers by their painted
 * height (2.0 hex widths), wreck hulls and floating salvage by their painted width (1.55 and 0.62 hex
 * widths). Presentation only — the hex a click selects comes from `hexmath.ts`, never from a sprite.
 */

/** The picture of one sea site as the asset manifest describes it (fractions of the canvas). */
export interface SeaSiteArt {
  readonly url: string | null;
  readonly width: number;
  readonly height: number;
  /** Painted bounds [left, top, right, bottom] as fractions of the canvas. */
  readonly visibleBounds: readonly [number, number, number, number];
  /** The ground contact point [x, y] as fractions of the canvas. */
  readonly groundAnchor: readonly [number, number];
  /** Which painted extent the display size measures. */
  readonly measure: 'width' | 'height';
  /** The display size in hex widths (the handoff's bands). */
  readonly hexWidths: number;
  /** Towers: the bare mast's top [x, y] as fractions of the canvas (approximate; the owner flag hangs here). */
  readonly flagAnchor?: readonly [number, number] | null;
}

export interface SeaSiteLayout {
  /** Uniform sprite scale. */
  readonly scale: number;
  /** Painted size on the map (map pixels). */
  readonly width: number;
  readonly height: number;
  /** The flag mount relative to the ground point (map pixels); null without a mast. */
  readonly flag: { readonly x: number; readonly y: number } | null;
}

/** Scale and flag mount of a sea-site picture for a hex width (map pixels). */
export function seaSiteLayout(art: SeaSiteArt, hexWidth: number): SeaSiteLayout {
  const [l, t, r, b] = art.visibleBounds;
  const paintedW = Math.max(1, (r - l) * art.width);
  const paintedH = Math.max(1, (b - t) * art.height);
  const target = art.hexWidths * hexWidth;
  const scale = target / (art.measure === 'height' ? paintedH : paintedW);
  const f = art.flagAnchor;
  const flag = f ? { x: (f[0] - art.groundAnchor[0]) * art.width * scale, y: (f[1] - art.groundAnchor[1]) * art.height * scale } : null;
  return { scale, width: paintedW * scale, height: paintedH * scale, flag };
}

/** Idle motion of a sea site (presentation time in ms; zero under reduced motion): a vertical offset and a roll (radians). */
export function seaSiteBob(kind: 'tower' | 'pickup' | 'wreck', timeMs: number, phase: number, calm: boolean): { readonly dy: number; readonly roll: number } {
  if (calm || kind === 'tower') return { dy: 0, roll: 0 };
  if (kind === 'pickup') {
    // 1.2 px over 3.5 s (the handoff: 0.8–1.5 px over 3–4 s).
    return { dy: Math.sin((timeMs / 3500) * Math.PI * 2 + phase) * 1.2, roll: 0 };
  }
  // Wrecks: almost still (bob ≤ 0.4 px, roll ≤ 0.15°).
  const a = (timeMs / 5200) * Math.PI * 2 + phase;
  return { dy: Math.sin(a) * 0.35, roll: Math.sin(a * 0.7) * (0.12 * Math.PI) / 180 };
}

/** How long a collected pickup fades (ms). */
export const SEA_PICKUP_FADE_MS = 250;
