/**
 * AssetManifest: stable asset IDs -> runtime files.
 *
 * UI code refers to asset IDs only (e.g. "town.greek.dwelling.tier1.base",
 * "creature.greek.tier3.upgraded.portrait"). Final art replaces placeholders by
 * adding/overriding manifest entries — no screen changes.
 *
 * Resolution order: final manifest -> placeholder manifest (cropped concept
 * references) -> procedural placeholder generated at runtime.
 */
import placeholderManifest from '../../../../assets-runtime/placeholders/manifest.json';
import { registerUnitModels, type UnitFamilyManifest, type UnitModelEntry } from '@pr/presentation';

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

const PLACEHOLDERS = (placeholderManifest as ManifestFile).assets;
/** Final production assets are registered here as they are delivered. */
const FINAL: Record<string, { file: string; provenance: string }> = {};

const cache = new Map<string, AssetRecord>();

export function resolveAsset(id: string): AssetRecord {
  const hit = cache.get(id);
  if (hit) return hit;
  let rec: AssetRecord;
  const fin = FINAL[id];
  const ph = PLACEHOLDERS[id];
  if (fin) rec = { id, status: 'final', url: `./${fin.file}`, provenance: fin.provenance };
  else if (ph) rec = { id, status: 'placeholder', url: `./${ph.file}`, provenance: ph.provenance };
  else rec = { id, status: 'procedural', url: null, provenance: 'Procedural development placeholder generated at runtime.' };
  cache.set(id, rec);
  return rec;
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
