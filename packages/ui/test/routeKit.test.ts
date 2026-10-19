/**
 * The recruitment & route kit of 2026-10-14 (`npm run recruitroute:import`): the nine pictures
 * are registered under `recruitroute.*` with relative files and measured visible bounds; the
 * map's six route markers resolve; every creature form has its recruitment-only native idle
 * strip (frame grid matching the picture, the visible union inside a frame). Files only.
 */
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadCatalog } from '@pr/content';
import { ROUTE_MARKER_IDS, routeMarkerArt } from '@pr/presentation/core';
import { campaignV2Art, creatureIdleStrip, creatureStageStrip, neutralUpgradeArt, resolveAsset, routeKitArt, routeKitIds } from '../src/assets/manifest';
import { iconArt } from '../src/assets/icons';
import { creaturePicture, hasKitPortrait } from '../src/app/neutralRecruit';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const runtime = path.join(root, 'assets-runtime');
const pngSize = (file: string) => {
  const d = readFileSync(file);
  expect(d.subarray(1, 4).toString('latin1')).toBe('PNG');
  return { w: d.readUInt32BE(16), h: d.readUInt32BE(20), colorType: d[25] };
};

describe('recruitment & route kit', () => {
  it('registers the nine pictures: relative PNG files with alpha, at most 512 px, visible bounds measured', () => {
    const ids = routeKitIds().sort();
    expect(ids).toEqual(
      ['icon-recruit-all', 'icon-resume-route', 'icon-train-troops', 'route-chevron-current', 'route-chevron-later', 'route-day-badge', 'route-destination', 'route-hourglass', 'route-selection-ring'].map((n) => `recruitroute.${n}`),
    );
    for (const id of ids) {
      const a = routeKitArt(id)!;
      expect(a.url.startsWith('./recruitment-route-v1/'), id).toBe(true);
      expect(a.url).not.toMatch(/[a-z]:|\\|\.\./i);
      const file = path.join(runtime, a.url.slice(2));
      expect(existsSync(file), file).toBe(true);
      const s = pngSize(file);
      expect([s.w, s.h]).toEqual([a.width, a.height]);
      expect(Math.max(s.w, s.h)).toBeLessThanOrEqual(512);
      expect(s.colorType, `${id} is RGBA`).toBe(6);
      const [l, t, r, b] = a.visibleBounds;
      expect(0 <= l && l < r && r <= 1 && 0 <= t && t < b && b <= 1, id).toBe(true);
      expect(resolveAsset(id).status).toBe('final');
    }
    // The source masters stay native (1254 × 1254) beside them.
    for (const id of ids) expect(pngSize(path.join(root, 'assets-source/ui/recruitment-route-v1', `${id.slice('recruitroute.'.length)}.png`))).toMatchObject({ w: 1254, h: 1254 });
  });

  it('gives the map its six route markers and the screens their three icons', () => {
    for (const id of ROUTE_MARKER_IDS) expect(routeMarkerArt(id), id).not.toBeNull();
    expect(iconArt('journey')).toContain('icon-resume-route');
    expect(iconArt('recruitall')).toContain('icon-recruit-all');
    expect(iconArt('train')).toContain('icon-train-troops');
  });

  it('every creature form has its recruitment strip: the native idle strip, its frame grid and visible union', () => {
    const catalog = loadCatalog();
    // The six neutrals of the campaign kit and their six upgrades (2026-10-15) have frame-region atlases,
    // no horizontal idle strip: their stages show the kits' native portraits instead (checked below).
    // The sea creatures (2026-10-17) are never recruited: no recruitment stage (their portraits are the delivery's).
    const ids = Object.keys(catalog.creatures).filter((id) => !hasKitPortrait(catalog, id) && catalog.families[catalog.creatures[id]!.familyId]?.availability !== 'sea_encounters');
    expect(ids.length).toBeGreaterThanOrEqual(84);
    let pantheonForms = 0;
    for (const id of ids) {
      const s = creatureStageStrip(id);
      expect(s, id).not.toBeNull();
      expect(s!.native, id).toBe(true);
      const file = path.join(runtime, s!.url.slice(2));
      const size = pngSize(file);
      expect(size.w, id).toBe(s!.frameWidth * s!.frames);
      expect(size.h, id).toBe(s!.frameHeight);
      const [x0, y0, x1, y1] = s!.visible;
      expect(0 <= x0 && x0 < x1 && x1 <= s!.frameWidth && 0 <= y0 && y0 < y1 && y1 <= s!.frameHeight, id).toBe(true);
      // Sharper than the map and battle strip (never a smaller copy), same frame count and timing.
      const run = creatureIdleStrip(id)!;
      expect(s!.frameHeight, id).toBeGreaterThanOrEqual(run.frameHeight);
      expect(s!.frames, id).toBe(run.frames);
      expect(s!.fps, id).toBe(run.fps);
      if (catalog.creatures[id]!.pantheonId && catalog.creatures[id]!.pantheonId !== 'neutral') pantheonForms++;
    }
    expect(pantheonForms).toBe(84);
  });

  it('the six campaign-kit neutrals and their upgrades have no idle strip; their stages resolve the kit portraits, native and unscaled', () => {
    const catalog = loadCatalog();
    const kit = Object.keys(catalog.creatures).filter((id) => hasKitPortrait(catalog, id)).sort();
    const bases = ['afanc', 'ahuitzotl', 'baku', 'pegasus', 'root_runner', 'serpopard'];
    const ups = ['crested_serpopard', 'crownfin_ahuitzotl', 'crownroot_runner', 'dawncrest_pegasus', 'dreamtusk_baku', 'ridgeback_afanc'];
    expect(kit).toEqual([...bases, ...ups].sort());
    for (const id of kit) {
      const def = catalog.creatures[id]!;
      // Neutrals of no pantheon: base + one upgrade per family (owner request 2026-10-15).
      expect(def.pantheonId, id).toBeNull();
      const fam = catalog.families[def.familyId]!;
      expect(bases).toContain(fam.baseCreatureId);
      expect(ups).toContain(fam.upgradedCreatureId);
      expect(creatureIdleStrip(id), id).toBeNull();
      expect(creatureStageStrip(id), id).toBeNull();
      const pic = creaturePicture(catalog, id)!;
      expect(pic, id).not.toBeNull();
      expect(pic.assetId).toBe(def.presentation.portraitAssetId);
      expect(pic.alt).toBe(def.presentation.portraitAlt);
      if (def.form === 'base') {
        const art = campaignV2Art(pic.assetId)!;
        expect(art.kind).toBe('portrait');
        expect(pic.url).toBe(art.nativeUrl);
        expect(pic.url.startsWith('./campaign-v2/'), id).toBe(true);
      } else {
        const art = neutralUpgradeArt(pic.assetId)!;
        expect(art.creatureId).toBe(id);
        expect(art.baseId).toBe(fam.baseCreatureId);
        expect(pic.url).toBe(art.url);
        expect(pic.url.startsWith('./battle-fx-neutral-upgrades-v1/portrait-'), id).toBe(true);
      }
      expect(pic.url).not.toMatch(/[a-z]:|\\|\.\./i);
      const size = pngSize(path.join(runtime, pic.url.slice(2)));
      // The delivered native picture, never a resized copy; the stage never shows it larger.
      expect([size.w, size.h], id).toEqual([pic.width, pic.height]);
      expect([size.w, size.h], id).toEqual([1254, 1254]);
      expect(resolveAsset(pic.assetId).status).toBe('final');
    }
  });
});
