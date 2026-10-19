/** Native atlas regions. Importing metadata does not decode any image. */
import { installLibraryFx, type LibraryFxRecipe, type StaticSpriteDefinition } from '@pr/presentation/core';
import recipes from '../../../../assets-runtime/mythic-library-v2/design/vfx-recipes.json';
import library from '../../../../assets-runtime/mythic-library-v2/manifest.json';
import twins from '../../../../assets-runtime/twin-campaigns-v1/manifest.json';
import twinFrames from '../../../../assets-runtime/twin-campaigns-v1/sprite-frames.json';
import chapters from '../../../../assets-runtime/twin-campaigns-v1/chapter-art-bindings.json';

export interface AtlasRegion {
  readonly rect: readonly [number, number, number, number];
  readonly width: number;
  readonly height: number;
  readonly anchor?: readonly [number, number];
}
export interface ExpansionArt {
  readonly url: string;
  readonly width: number;
  readonly height: number;
  readonly kind: 'icon' | 'vfx' | 'briefing' | 'background' | 'landmark';
  readonly atlas?: AtlasRegion;
}
export const twinSiteSprites: Record<string, StaticSpriteDefinition> = {};
const records = new Map<string, ExpansionArt>();
for (const [id, frame] of Object.entries(library.frames)) {
  const region: ExpansionArt = {
    url: `./mythic-library-v2/${frame.file}`,
    width: frame.sourceRect[2]!, height: frame.sourceRect[3]!,
    kind: frame.kind === 'icon' ? 'icon' : 'vfx',
    atlas: { rect: frame.sourceRect as [number, number, number, number], width: frame.imageWidth, height: frame.imageHeight },
  };
  records.set(id, region);
}
for (const [assetId, frameId] of Object.entries(library.assetIdToFrame)) {
  const rec = records.get(frameId);
  if (rec) records.set(assetId, rec);
}
for (const entry of twins.assets) {
  if (entry.kind === 'atlas') continue;
  records.set(entry.id, { url: `./${entry.runtime.replace(/^assets-runtime\//, '')}`, width: entry.width, height: entry.height,
    kind: entry.kind === 'town-background' ? 'background' : 'briefing' });
}
for (const frame of twinFrames.frames) {
  const sheet = twins.assets.find((a) => a.id === frame.sheet);
  if (!sheet) throw new Error(`Missing twin atlas ${frame.sheet}`);
  twinSiteSprites[`map.site.${frame.id}`] = { file: sheet.runtime.replace(/^assets-runtime\//, ''), frame: frame.sourceRect as [number, number, number, number], width: frame.sourceRect[2]!, height: frame.sourceRect[3]!, anchor: [frame.anchor[0]! / frame.sourceRect[2]!, frame.anchor[1]! / frame.sourceRect[3]!], pixelsPerHex: frame.sourceRect[2]! / frame.displayWidthHexes, status: 'final', provenance: 'Twin campaign native atlas' };
  records.set(frame.id, { url: `./${sheet.runtime.replace(/^assets-runtime\//, '')}`, width: frame.sourceRect[2]!, height: frame.sourceRect[3]!, kind: 'landmark',
    atlas: { rect: frame.sourceRect as [number, number, number, number], width: sheet.width, height: sheet.height, anchor: frame.anchor as [number, number] } });
}
for (const chapter of chapters.missions) {
  const rec = records.get(chapter.asset);
  if (rec) {
    records.set(chapter.briefingArtId, rec);
    records.set(chapter.thumbnailArtId, rec);
  }
}
for (const [id, source] of Object.entries({
  'campaign.worlds_met.thumbnail': 'twin.p7',
  'campaign.worlds_met.cover': 'twin.p7',
  'campaign.ashes_accord.cover': 'twin.e7',
  'campaign.ashes_accord.thumbnail': 'twin.e7',
  'ending.worlds_met.epilogue': 'twin.council',
  'ending.ashes_accord.epilogue': 'twin.horizon',
})) {
  const rec = records.get(source);
  if (rec) records.set(id, rec);
}
installLibraryFx(Object.fromEntries(recipes.map((recipe) => [recipe.id, {
  durationMs: recipe.durationMs, maxParticles: recipe.maxParticles,
  materials: recipe.materials.flatMap((id) => { const art = records.get(id); return art?.atlas ? [{ url: art.url, rect: art.atlas.rect }] : []; }),
} satisfies LibraryFxRecipe])));
export function expansionArt(id: string): ExpansionArt | null { return records.get(id) ?? null; }
export function expansionArtIds(): string[] { return [...records.keys()]; }
