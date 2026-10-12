#!/usr/bin/env node
/**
 * Writes packages/ui/src/assets/frontendArt.generated.ts from the 1.1.0
 * interface-art manifests (the owner's frontend kit, the frontend paintings,
 * the shared GUI pack and the encounter scenes):
 *
 *   assets-runtime/frontend-kit-v1.1.0/manifest.json   frontendkit.*
 *   assets-runtime/frontend-v1.1.0/manifest.json       frontend.*
 *   assets-runtime/ui-v1.1.0/manifest.json             gui.*
 *   assets-runtime/encounters-v1.1.0/manifest.json     encounterkit.*
 *
 * The game keeps only what it needs to show a picture (runtime file, native
 * size, alpha, fit and the frames' nine-slice and surface insets). The delivery
 * manifests also carry absolute source paths on the artist's computer, which
 * must never reach the bundle, so they are not imported directly.
 *
 * Run after replacing or adding art in those folders:  npm run art:frontend-table
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const SOURCES = ['frontend-kit-v1.1.0', 'frontend-v1.1.0', 'ui-v1.1.0', 'encounters-v1.1.0'];
const out = {};

for (const dir of SOURCES) {
  const manifest = JSON.parse(readFileSync(`${root}assets-runtime/${dir}/manifest.json`, 'utf8'));
  for (const [id, a] of Object.entries(manifest.assets ?? {})) {
    if (out[id]) throw new Error(`Duplicate interface-art ID ${id} (${dir})`);
    if (typeof a.file !== 'string' || /^[a-z]:|^\/|\\/i.test(a.file)) throw new Error(`${id}: runtime file must be relative to assets-runtime (got ${a.file})`);
    const e = { file: a.file, width: a.width, height: a.height, alpha: !!a.hasTransparency };
    if (a.fit === 'cover' || a.fit === 'contain') e.fit = a.fit;
    // Visible (alpha > threshold) bounds as fractions [left, top, right, bottom].
    if (Array.isArray(a.visibleBounds) && a.visibleBounds.length === 4) e.visible = a.visibleBounds.map((n) => +(+n).toFixed(4));
    else if (Array.isArray(a.visibleBoundsPixels) && a.visibleBoundsPixels.length === 4) {
      const [l, t, r, b] = a.visibleBoundsPixels;
      e.visible = [l / a.width, t / a.height, r / a.width, b / a.height].map((n) => +n.toFixed(4));
    }
    if (a.nineSlice) e.nineSlice = { top: a.nineSlice.top, right: a.nineSlice.right, bottom: a.nineSlice.bottom, left: a.nineSlice.left, cssBorderWidth: a.nineSlice.cssBorderWidth };
    if (Array.isArray(a.surfaceInsetCssPx)) e.surfaceInset = a.surfaceInsetCssPx;
    if (typeof a.contentPaddingCssPx === 'number') e.contentPadding = a.contentPaddingCssPx;
    // Where live content may sit on a decorative surface (the scroll, the reward tray), as fractions [left, top, right, bottom].
    if (Array.isArray(a.safeContentNormalized) && a.safeContentNormalized.length === 4) e.safe = a.safeContentNormalized.map((n) => +(+n).toFixed(4));
    out[id] = e;
  }
}

const ids = Object.keys(out).sort();
const body = ids.map((id) => `  ${JSON.stringify(id)}: ${JSON.stringify(out[id])},`).join('\n');
const text = `/**
 * Interface art of the 1.1.0 packs (frontendkit.*, frontend.*, gui.*, encounterkit.*), generated
 * by tools/assets/frontend_art_table.mjs from the delivery manifests in
 * assets-runtime/. Do not edit by hand: replace the art, then run
 * \`npm run art:frontend-table\`. Files are relative to assets-runtime (served at
 * the app base), byte-identical to the delivered runtime PNGs.
 */
export interface GuiArtEntry {
  readonly file: string;
  readonly width: number;
  readonly height: number;
  readonly alpha: boolean;
  readonly fit?: 'cover' | 'contain';
  /** Visible bounds as fractions [left, top, right, bottom]. */
  readonly visible?: readonly [number, number, number, number];
  /** Frames: source slices (px of the native file) and the CSS border width they were measured for. */
  readonly nineSlice?: { readonly top: number; readonly right: number; readonly bottom: number; readonly left: number; readonly cssBorderWidth: number };
  /** Frames: where the surface under the frame starts (top, right, bottom, left) at the measured border width. */
  readonly surfaceInset?: readonly [number, number, number, number];
  readonly contentPadding?: number;
  /** Decorative surfaces: the safe rectangle for live content, as fractions [left, top, right, bottom]. */
  readonly safe?: readonly [number, number, number, number];
}

export const GUI_ART: Readonly<Record<string, GuiArtEntry>> = {
${body}
};
`;
writeFileSync(`${root}packages/ui/src/assets/frontendArt.generated.ts`, text);
console.log(`frontendArt.generated.ts: ${ids.length} interface pictures from ${SOURCES.join(', ')}`);
