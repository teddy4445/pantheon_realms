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
// Named imports keep only the fields the game reads in the start-up bundle.
import { assets as heroAssets, clips as heroClips, ground_alignment as heroGround, suggested_crossfade_seconds as heroCrossfade } from '../../../../assets-runtime/heroes/animation_manifest.json';
import { heroModelEntriesFromManifest, registerHeroModels, registerUnitModels, type MountedHeroModelEntry, type UnitFamilyManifest, type UnitModelEntry } from '@pr/presentation/core';

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
 * (writes assets-runtime/ui/final-manifest.json). See ICON_CATALOG.md.
 */
const FINAL: Record<string, { file: string; provenance: string }> = { ...(finalArtManifest as unknown as { assets: Record<string, { file: string; provenance: string }> }).assets };

/**
 * Painted story art (ASSET_PIPELINE.md §13): dialogue busts, campaign covers and
 * cards, ending pictures, mission briefing art and cards. Written by
 * `npm run art:import` (tools/assets/import_story_art.py) from
 * assets-source/art/final/; the game only reads the runtime derivatives.
 */
export interface StoryArtRecord {
  readonly id: string;
  readonly url: string;
  readonly kind: 'bust' | 'cover' | 'ending' | 'briefing' | 'card';
  readonly width: number;
  readonly height: number;
  /** Busts: visible (non-transparent) bounds as fractions [left, top, right, bottom]. */
  readonly alphaBox?: readonly [number, number, number, number];
}
interface StoryArtFile {
  readonly provenance: string;
  readonly assets: Record<string, { file: string; kind: StoryArtRecord['kind']; width: number; height: number; alphaBox?: [number, number, number, number] }>;
}
const STORY = storyArtManifest as unknown as StoryArtFile;

/** Story art by asset ID, with its size (null when not delivered). */
export function resolveArt(id: string): StoryArtRecord | null {
  const a = STORY.assets[id];
  return a ? { id, url: `./${a.file}`, kind: a.kind, width: a.width, height: a.height, alphaBox: a.alphaBox } : null;
}

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

/** Building art: exact level asset first, then the location's generic placeholder. */
export function resolveBuildingArt(artAssetId: string): AssetRecord {
  const exact = resolveAsset(artAssetId);
  if (exact.url) return exact;
  const generic = artAssetId.replace(/\.l\d+$/, '');
  return resolveAsset(generic);
}

export function listKnownAssets(): AssetRecord[] {
  return Object.keys({ ...PLACEHOLDERS, ...FINAL }).map(resolveAsset);
}

// ---------------------------------------------------------------------------
// Unit models (GLB) — assets-runtime/units/<pantheon>/<family>/family.manifest.json
// ---------------------------------------------------------------------------


/** Bundled family manifests and GLB URLs (Vite copies the files; nothing is fetched from a CDN). */
const UNIT_MANIFESTS = import.meta.glob<UnitFamilyManifest>('../../../../assets-runtime/units/**/family.manifest.json', { eager: true, import: 'default' });
const UNIT_FILES = import.meta.glob<string>('../../../../assets-runtime/units/**/*.glb', { eager: true, query: '?url', import: 'default' });

function entriesOf(includeFixtures: boolean): UnitModelEntry[] {
  const out: UnitModelEntry[] = [];
  for (const [path, family] of Object.entries(UNIT_MANIFESTS)) {
    if (!family || family.schema !== 'pantheon-realms-unit-family') continue;
    if (family.familyId.startsWith('_') !== includeFixtures) continue;
    const dir = path.slice(0, path.lastIndexOf('/') + 1);
    for (const form of [family.forms.base, family.forms.upgraded]) {
      if (!form) continue;
      const url = UNIT_FILES[`${dir}${form.model}`];
      if (url) out.push({ manifest: form, url });
    }
  }
  return out;
}

/** Entries bound to real creature IDs. The calibration fixture (`_calibration`) is never bound here. */
export function bundledUnitModels(): UnitModelEntry[] {
  return entriesOf(false);
}

/** Development fixtures (axis/scale calibration), used only by the `?e2e=calibration` UI test mode. */
export function fixtureUnitModels(): UnitModelEntry[] {
  return entriesOf(true);
}

registerUnitModels(bundledUnitModels());

// ---------------------------------------------------------------------------
// Mounted adventure-map heroes — assets-runtime/heroes/ (copied from the Blender
// asset project; ASSET_PIPELINE.md §12). The GLBs are served from the app's own
// runtime folder (./heroes/<pantheon>/hero_<pantheon>.glb) in development, the
// browser build and the desktop package alike; nothing points outside the project.
// ---------------------------------------------------------------------------

export function bundledHeroModels(): MountedHeroModelEntry[] {
  return heroModelEntriesFromManifest({ assets: heroAssets, clips: heroClips, ground_alignment: heroGround, suggested_crossfade_seconds: heroCrossfade }, (runtime) => `./heroes/${runtime}`);
}

registerHeroModels(bundledHeroModels());
