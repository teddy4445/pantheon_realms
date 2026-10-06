/**
 * AssetManifest: stable asset IDs -> runtime files.
 *
 * UI code refers to asset IDs only (e.g. "town.greek.dwelling.tier1.base",
 * "creature.greek.tier3.upgraded.portrait"). Final art replaces placeholders by
 * adding/overriding manifest entries — no screen changes.
 *
 * Resolution order: final manifest (assets-runtime/ui/final-manifest.json) -> UI art manifest (owner-supplied menu and
 * interface art, assets-runtime/ui) -> placeholder manifest (cropped concept
 * references) -> procedural placeholder generated at runtime.
 */
import placeholderManifest from '../../../../assets-runtime/placeholders/manifest.json';
import uiArtManifest from '../../../../assets-runtime/ui/manifest.json';
import finalArtManifest from '../../../../assets-runtime/ui/final-manifest.json';
import storyArtManifest from '../../../../assets-runtime/art/manifest.json';
import spriteManifestFile from '../../../../assets-runtime/sprites/manifest.json';
import { registerEnvironmentArt, registerSpriteManifest, type EnvironmentArt, type SpriteManifest } from '@pr/presentation/core';

export type AssetStatus = 'final' | 'placeholder' | 'procedural';

export interface AssetRecord {
  readonly id: string;
  readonly status: AssetStatus;
  /** Relative URL (resolved against the app base) when a file exists. */
  readonly url: string | null;
  readonly provenance: string;
}

interface ManifestFile {
  readonly assets: Record<string, { file: string; status: string; provenance: string }>;
}

const PLACEHOLDERS: ManifestFile['assets'] = { ...(placeholderManifest as ManifestFile).assets, ...(uiArtManifest as unknown as ManifestFile).assets };
/**
 * Final production assets, registered as they are delivered: drop a PNG named by
 * its asset ID into assets-source/icons/final/ and run `npm run icons:import`
 * (writes assets-runtime/ui/final-manifest.json). See `npm run icons:catalog`.
 */
const FINAL: Record<string, { file: string; provenance: string }> = { ...(finalArtManifest as unknown as { assets: Record<string, { file: string; provenance: string }> }).assets };

/**
 * Painted story art (ASSET_PIPELINE.md §13): dialogue busts, campaign covers and
 * cards, ending pictures, mission briefing art and cards; and the big-moment
 * art (miracle cards, victory/defeat splashes, level-up and new-week banners;
 * see assets/momentArt.ts). Written by
 * `npm run art:import` (tools/assets/import_story_art.py) from
 * assets-source/art/final/; the game only reads the runtime derivatives.
 */
export interface StoryArtRecord {
  readonly id: string;
  readonly url: string;
  readonly kind: 'bust' | 'cover' | 'ending' | 'briefing' | 'card' | 'miracle' | 'splash' | 'banner' | 'building' | 'background';
  readonly width: number;
  readonly height: number;
  /** Busts and banners: visible (non-transparent) bounds as fractions [left, top, right, bottom]. */
  readonly alphaBox?: readonly [number, number, number, number];
  /** Banners: the blank plaque the game writes on, measured per file, as fractions [left, top, right, bottom]. */
  readonly plaque?: readonly [number, number, number, number];
}
interface StoryArtFile {
  readonly provenance: string;
  readonly assets: Record<
    string,
    {
      file: string;
      kind: StoryArtRecord['kind'] | 'terrain' | 'battlefield' | 'sky';
      width: number;
      height: number;
      alphaBox?: [number, number, number, number];
      plaque?: [number, number, number, number];
      wrap?: 'repeat' | 'mirror';
      average?: string;
      edge?: string;
      haze?: string;
      horizon?: number;
    }
  >;
}
const STORY = storyArtManifest as unknown as StoryArtFile;

/** Story art by asset ID, with its size (null when not delivered). */
export function resolveArt(id: string): StoryArtRecord | null {
  const a = STORY.assets[id];
  if (!a || a.kind === 'terrain' || a.kind === 'battlefield' || a.kind === 'sky') return null;
  return { id, url: `./${a.file}`, kind: a.kind, width: a.width, height: a.height, alphaBox: a.alphaBox, plaque: a.plaque };
}

/**
 * Ground and sky art (Brief 2) for the 2D views: terrain textures, battlefield
 * paintings and sky panoramas, from the same manifest. The views keep their
 * procedural colours for anything not delivered.
 */
export function resolveEnvironmentArt(id: string): EnvironmentArt | null {
  const a = STORY.assets[id];
  if (!a || (a.kind !== 'terrain' && a.kind !== 'battlefield' && a.kind !== 'sky')) return null;
  return { url: `./${a.file}`, width: a.width, height: a.height, wrap: a.wrap, average: a.average, edge: a.edge, haze: a.haze, horizon: a.horizon };
}

registerEnvironmentArt(resolveEnvironmentArt);

const cache = new Map<string, AssetRecord>();

export function resolveAsset(id: string): AssetRecord {
  const hit = cache.get(id);
  if (hit) return hit;
  let rec: AssetRecord;
  const fin = FINAL[id];
  const art = STORY.assets[id];
  const ph = PLACEHOLDERS[id];
  if (fin) rec = { id, status: 'final', url: `./${fin.file}`, provenance: fin.provenance };
  else if (art) rec = { id, status: 'final', url: `./${art.file}`, provenance: STORY.provenance };
  else if (ph) rec = { id, status: 'placeholder', url: `./${ph.file}`, provenance: ph.provenance };
  else rec = { id, status: 'procedural', url: null, provenance: 'Procedural development placeholder generated at runtime.' };
  cache.set(id, rec);
  return rec;
}

// ---------------------------------------------------------------------------
// Opening-screen art (assets-runtime/ui/manifest.json, tools/assets/prepare_ui_art.py)
// ---------------------------------------------------------------------------

interface UiArtFile {
  readonly backgrounds: readonly string[];
  readonly assets: Record<string, { file: string; interior?: { left: number; right: number; top: number; bottom: number } }>;
}
const UI_ART = uiArtManifest as unknown as UiArtFile;

let chosenBackground: AssetRecord | null = null;

/**
 * The opening-screen background for this run of the game: one of the listed
 * backgrounds, picked at random once per start (presentation only — the
 * simulation never sees this). Falls back to the older menu placeholder.
 */
export function menuBackground(): AssetRecord {
  if (chosenBackground) return chosenBackground;
  const ids = UI_ART.backgrounds.filter((id) => resolveAsset(id).url);
  const id = ids.length ? ids[Math.floor(Math.random() * ids.length)]! : 'menu.background';
  chosenBackground = resolveAsset(id);
  return chosenBackground;
}

/** Transparent window of the main-menu frame, as fractions of the frame image. */
export function menuFrameInterior(): { left: number; right: number; top: number; bottom: number } {
  return UI_ART.assets['menu.frame']?.interior ?? { left: 0.25, right: 0.25, top: 0.22, bottom: 0.15 };
}

/**
 * The hero screen's equipment figure: a neutral schematic body on navy (owner
 * delivery 2026-10-06, `hero-equipment-schematic-v2.png`, 1122 × 1402, kept as
 * delivered in `assets-runtime/ui/`, its source in `assets-source/ui/`). The
 * slot boxes stand over it; it is never the hero's look.
 */
export const HERO_EQUIPMENT_SCHEMATIC = './ui/hero-equipment-schematic-v2.png';

/** Building art: exact level asset first, then the location's generic placeholder. */
export function resolveBuildingArt(artAssetId: string): AssetRecord {
  const exact = resolveAsset(artAssetId);
  if (exact.url) return exact;
  const generic = artAssetId.replace(/\.l\d+$/, '');
  return resolveAsset(generic);
}

/**
 * A town's painting for its town hall level (Brief 17, owner request
 * 2026-10-06: four stages per pantheon, `<background>.l1`–`.l4`). No hall or
 * level 0 shows the first stage, above 4 the fourth; a stage not delivered
 * falls back to the first, then to the single painting. Buildings stay overlays
 * at their own places on every stage.
 */
export function townBackground(backgroundAssetId: string, civicHallLevel: number | undefined, resolve: (id: string) => AssetRecord = resolveAsset): AssetRecord {
  const level = Math.max(1, Math.min(4, Math.floor(civicHallLevel ?? 1) || 1));
  const staged = resolve(`${backgroundAssetId}.l${level}`);
  if (staged.url) return staged;
  const first = resolve(`${backgroundAssetId}.l1`);
  return first.url ? first : resolve(backgroundAssetId);
}

// ---------------------------------------------------------------------------
// 2D sprites — assets-runtime/sprites/manifest.json (written by the placeholder
// generator and by `npm run sprites:import`; ASSET_PIPELINE.md §1). Creature
// battle strips, mounted map avatars, map locations, decoration, obstacles,
// siege pieces, projectiles and effects, each with its status (placeholder or
// final). Every file is served from the app's own runtime folder.
// ---------------------------------------------------------------------------

registerSpriteManifest(spriteManifestFile as unknown as SpriteManifest, (file) => `./${file}`);
