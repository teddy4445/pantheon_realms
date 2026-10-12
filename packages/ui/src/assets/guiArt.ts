/**
 * Interface art of release 1.1.0 (`assets-runtime/ui-v1.1.0/manifest.json`):
 * text-free framing and illustration layers — six faction window frames,
 * banners, recruitment stages and merchant headers; three quiet surfaces; an
 * open book; the equipment figure; a painted button face and a socket; five
 * encounter headers. A separate namespace (IDs start with `gui.`): it never
 * replaces content art, story art, sprites or the siege-v2 registrations.
 *
 * File values are relative to `assets-runtime` (Vite's public folder), so
 * `gui.frame.greek` resolves to `./ui-v1.1.0/frame-greek.png` in the browser
 * build and inside the packaged desktop app alike. Layout metadata (nine-slice
 * borders, surface insets, safe content and page rectangles, alpha bounds)
 * comes from the manifest; pixels are never modified.
 */
import guiManifestFile from '../../../../assets-runtime/ui-v1.1.0/manifest.json';

export const GUI_THEMES = ['greek', 'norse', 'egyptian', 'japanese', 'celtic', 'mesoamerican'] as const;
export type GuiTheme = (typeof GUI_THEMES)[number];
/**
 * The shell outside a match (title, setup, encyclopedia, settings, saves,
 * editor): neutral dark blue and bronze, a thin code-drawn frame with no
 * faction's symbols (pre-game handoff). Faction-specific panels inside it
 * (a chosen campaign, a seat, a pantheon section) set their own theme.
 */
export const NEUTRAL_THEME = 'neutral' as const;
/** A window's frame: one of the six factions' or the neutral shell's. */
export type FrameTheme = GuiTheme | typeof NEUTRAL_THEME;
/** Fallback faction where one is required (a banner, an unknown pantheon). */
export const DEFAULT_GUI_THEME: GuiTheme = 'greek';

export type GuiKind = 'frame' | 'banner' | 'recruitment-stage' | 'merchant-vignette' | 'surface' | 'book' | 'figure' | 'button' | 'socket' | 'encounter';
/** [left, top, right, bottom] as fractions of the image. */
export type Rect = readonly [number, number, number, number];

export interface GuiArt {
  readonly id: string;
  /** Relative URL (against the app base). */
  readonly url: string;
  readonly kind: GuiKind;
  readonly theme: GuiTheme | 'shared';
  readonly width: number;
  readonly height: number;
  /** Alpha > 32 bounds, for layout measurement only. */
  readonly visibleBounds: Rect;
  readonly nineSlice?: { readonly top: number; readonly right: number; readonly bottom: number; readonly left: number; readonly cssBorderWidth: number; readonly minimumWidth: number; readonly minimumHeight: number };
  readonly contentPaddingCssPx?: number;
  /** Where the backing surface goes under a frame drawn at `cssBorderWidth`: [top, right, bottom, left] CSS pixels. */
  readonly surfaceInsetCssPx?: readonly [number, number, number, number];
  readonly safeContentRect?: Rect;
  readonly unitGroundAnchor?: readonly [number, number];
  readonly safePageRects?: readonly [Rect, Rect];
}

interface GuiManifestEntry {
  file: string;
  kind: string;
  theme: string;
  width: number;
  height: number;
  visibleBounds: number[];
  nineSlice?: GuiArt['nineSlice'];
  contentPaddingCssPx?: number;
  surfaceInsetCssPx?: number[];
  safeContentRect?: number[];
  unitGroundAnchor?: number[];
  safePageRects?: number[][];
}

const ENTRIES = (guiManifestFile as unknown as { assets: Record<string, GuiManifestEntry> }).assets;

const REGISTRY: ReadonlyMap<string, GuiArt> = new Map(
  Object.entries(ENTRIES).map(([id, e]) => [
    id,
    {
      id,
      url: `./${e.file}`,
      kind: e.kind as GuiKind,
      theme: (isGuiTheme(e.theme) ? e.theme : 'shared') as GuiTheme | 'shared',
      width: e.width,
      height: e.height,
      visibleBounds: e.visibleBounds as unknown as Rect,
      nineSlice: e.nineSlice,
      contentPaddingCssPx: e.contentPaddingCssPx,
      surfaceInsetCssPx: e.surfaceInsetCssPx as unknown as GuiArt['surfaceInsetCssPx'],
      safeContentRect: e.safeContentRect as unknown as Rect | undefined,
      unitGroundAnchor: e.unitGroundAnchor as unknown as GuiArt['unitGroundAnchor'],
      safePageRects: e.safePageRects as unknown as GuiArt['safePageRects'],
    },
  ]),
);

export function isGuiTheme(x: unknown): x is GuiTheme {
  return typeof x === 'string' && (GUI_THEMES as readonly string[]).includes(x);
}

/** A registered `gui.*` asset, or null. */
export function guiArt(id: string): GuiArt | null {
  return REGISTRY.get(id) ?? null;
}

export function guiArtIds(): string[] {
  return [...REGISTRY.keys()];
}

/** The theme for a pantheon ID (the six pantheons map one to one; anything else uses the default). */
export function guiThemeFor(pantheonId: string | null | undefined): GuiTheme {
  return isGuiTheme(pantheonId) ? pantheonId : DEFAULT_GUI_THEME;
}

/** theme-map.json: each faction's frame, banner, recruitment stage, merchant header and emblem. */
export function themeAsset(theme: GuiTheme, role: 'frame' | 'banner' | 'recruitment' | 'merchant'): GuiArt {
  const id = role === 'recruitment' ? `gui.recruit.${theme}` : `gui.${role}.${theme}`;
  return REGISTRY.get(id)!;
}

export function themeEmblemId(theme: GuiTheme): string {
  return `emblem.${theme}`;
}

/** An absolute URL for CSS custom properties (a relative one would resolve against the stylesheet that uses it). */
function absolute(url: string, base: string): string {
  try {
    return new URL(url, base).href;
  } catch {
    return url;
  }
}

/** 96 × 96, sliced at 32: dark outer line, bronze band, fine gold inner line, a diamond at each corner. */
const NEUTRAL_FRAME_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">' +
  '<rect x="1.5" y="1.5" width="93" height="93" fill="none" stroke="#05090f" stroke-width="3"/>' +
  '<rect x="5" y="5" width="86" height="86" fill="none" stroke="#a7803f" stroke-width="4"/>' +
  '<rect x="5" y="5" width="86" height="86" fill="none" stroke="#e2c27c" stroke-width="1" stroke-opacity=".55"/>' +
  '<rect x="10.5" y="10.5" width="75" height="75" fill="none" stroke="#d8b56c" stroke-width="1" stroke-opacity=".75"/>' +
  [
    [7, 7],
    [89, 7],
    [7, 89],
    [89, 89],
  ]
    .map(([x, y]) => `<path d="M${x} ${y! - 6}L${x! + 6} ${y}L${x} ${y! + 6}L${x! - 6} ${y}Z" fill="#e8c983" stroke="#3a2a0e" stroke-width="1"/>`)
    .join('') +
  '</svg>';

/**
 * Installs the 1.1.0 material variables once: shared surfaces, button, socket
 * and book on :root, and each theme's frame, banner, stage and merchant header
 * under `[data-gui-theme="…"]`. URLs are absolute, measured insets come from
 * the manifest.
 */
export function installGuiStyles(doc: Document = document): void {
  if (doc.getElementById('gui-v110-vars')) return;
  const base = doc.baseURI;
  const url = (id: string) => `url("${absolute(REGISTRY.get(id)!.url, base)}")`;
  const lines: string[] = [];
  lines.push(
    `:root{--gui-surface-stone:${url('gui.surface.stone')};--gui-surface-parchment:${url('gui.surface.parchment')};--gui-surface-leather:${url('gui.surface.leather')};` +
      `--gui-button:${url('gui.control.button')};--gui-socket:${url('gui.control.socket')};--gui-book:${url('gui.book.open')};--gui-figure:${url('gui.equipment.figure')};}`,
  );
  // The neutral shell: a thin bronze rule with small corner diamonds, drawn as a nine-slice SVG (no raster, no symbols).
  lines.push(
    `[data-gui-theme="${NEUTRAL_THEME}"]{--gui-frame:url("data:image/svg+xml,${encodeURIComponent(NEUTRAL_FRAME_SVG)}");--gui-frame-slice:32 32 32 32;--gui-frame-scale:0.42;` +
      `--gui-inset-t:7;--gui-inset-r:7;--gui-inset-b:7;--gui-inset-l:7;--gui-frame-ref:64;}`,
  );
  for (const t of GUI_THEMES) {
    const frame = themeAsset(t, 'frame');
    const s = frame.nineSlice!;
    const inset = frame.surfaceInsetCssPx ?? [20, 12, 26, 12];
    lines.push(
      `[data-gui-theme="${t}"]{--gui-frame:${url(frame.id)};--gui-frame-slice:${s.top} ${s.right} ${s.bottom} ${s.left};--gui-frame-scale:1;` +
        // Unitless CSS pixels at the manifest's 64 px border; gui.css scales them to the drawn border width.
        `--gui-inset-t:${inset[0]};--gui-inset-r:${inset[1]};--gui-inset-b:${inset[2]};--gui-inset-l:${inset[3]};--gui-frame-ref:${s.cssBorderWidth};` +
        `--gui-banner:${url(`gui.banner.${t}`)};--gui-recruit:${url(`gui.recruit.${t}`)};--gui-merchant:${url(`gui.merchant.${t}`)};}`,
    );
  }
  const style = doc.createElement('style');
  style.id = 'gui-v110-vars';
  style.textContent = lines.join('\n');
  doc.head.appendChild(style);
}

// ---------------------------------------------------------------------------
// Readiness of painted skins (1.1.4, GUI audit: no ink on a missing page)
// ---------------------------------------------------------------------------

export type ArtState = 'pending' | 'ready' | 'failed';
const artStates = new Map<string, ArtState>();
const artLoads = new Map<string, Promise<boolean>>();

/** Whether a picture is decoded (ready), still loading (pending, also when never asked) or could not load (failed). */
export function artState(url: string): ArtState {
  return artStates.get(url) ?? 'pending';
}

/**
 * Loads and decodes a picture once (later calls share the answer): true when it can be drawn,
 * false when it failed. The CSS that shows the same URL then finds it in the browser's cache.
 */
export function artReady(url: string): Promise<boolean> {
  let p = artLoads.get(url);
  if (!p) {
    artStates.set(url, 'pending');
    p = new Promise<boolean>((done) => {
      if (typeof Image === 'undefined') return done(false);
      const img = new Image();
      img.decoding = 'async';
      const settle = (ok: boolean) => {
        artStates.set(url, ok ? 'ready' : 'failed');
        done(ok);
      };
      img.onload = () => {
        if (typeof img.decode !== 'function') return settle(img.naturalWidth > 0);
        img.decode().then(() => settle(img.naturalWidth > 0), () => settle(img.naturalWidth > 0));
      };
      img.onerror = () => settle(false);
      img.src = url;
    });
    artLoads.set(url, p);
  }
  return p;
}

/**
 * The skins under ink text (the open book, the parchment surface), decoded while the player is on
 * the title, so a journal, spellbook or codex page opens with its paper already drawn.
 */
export function preloadReadingSkins(): void {
  for (const id of ['gui.book.open', 'gui.surface.parchment']) {
    const a = REGISTRY.get(id);
    if (a) void artReady(a.url);
  }
}

// ---------------------------------------------------------------------------
// Encounter headers (encounter-art-map.json)
// ---------------------------------------------------------------------------

/** A site that has a specific illustration, keyed by its typed identity (never by a localized title). */
const SPECIFIC_ENCOUNTERS: readonly { campaignId: string; mapId: string; siteId: string; assetId: string }[] = [{ campaignId: 'winter_oath', mapId: 'winter_oath_m01_v1', siteId: 'm01_longship', assetId: 'gui.encounter.longship' }];

export interface EncounterArtQuery {
  readonly siteKind: 'map_event' | 'treasure_chest' | 'quest_hut' | 'creature_camp' | string;
  readonly siteId: string;
  readonly claimed?: boolean;
  /** The match's map (mission map template or custom map) and campaign, when known. */
  readonly mapId?: string | null;
  readonly campaignId?: string | null;
  /** Quest huts only: the site's narrative really describes a hermit or a hut. */
  readonly hermitNarrative?: boolean;
}

/** The generic open-road picture, for generated or custom map events whose place it does not misrepresent. */
export const ENCOUNTER_FALLBACK = 'gui.encounter.crossroads';

/**
 * The supplied header for an encounter dialog, or null when none of the
 * supplied pictures fits (better none than one that promises a place, creature
 * or reward that is not there). Treasure chests show the full or the emptied
 * chest; the Frozen Longship its own scene; a quest hut whose narrative is a
 * hermit's request the hermit. Authored map events are specific places (a
 * shrine, a workshop, a ship): the dialog uses its mission's existing painting
 * for them, and the crossroads only for generic generated events.
 */
export function encounterArt(q: EncounterArtQuery): GuiArt | null {
  const specific = SPECIFIC_ENCOUNTERS.find((s) => s.siteId === q.siteId && (q.mapId == null || s.mapId === q.mapId) && (q.campaignId == null || s.campaignId === q.campaignId));
  if (specific) return guiArt(specific.assetId);
  if (q.siteKind === 'treasure_chest') return guiArt(q.claimed ? 'gui.encounter.treasure-empty' : 'gui.encounter.treasure');
  if (q.siteKind === 'quest_hut' && q.hermitNarrative) return guiArt('gui.encounter.hermit');
  return null;
}
