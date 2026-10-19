import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadCatalog } from '@pr/content';
import { twinSiteSprites } from '../src/assets/expansionArt';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { expansionArt, expansionArtIds } from '../src/assets/expansionArt';
import { resolveArt, resolveAsset } from '../src/assets/manifest';
import { ArtifactIcon, SpellIcon } from '../src/components/art';
import library from '../../../assets-runtime/mythic-library-v2/manifest.json';

describe('native expansion artwork', () => {
  it('resolves every supplied frame inside an existing offline atlas', () => {
    for (const id of expansionArtIds()) {
      const art = expansionArt(id)!;
      expect(art.url).toMatch(/^\.\/[a-z]/);
      expect(existsSync(resolve('assets-runtime', art.url)), id).toBe(true);
      if (!art.atlas) continue;
      const [x, y, w, h] = art.atlas.rect;
      expect(x).toBeGreaterThanOrEqual(0);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(w).toBeGreaterThan(0);
      expect(h).toBeGreaterThan(0);
      expect(x + w).toBeLessThanOrEqual(art.atlas.width);
      expect(y + h).toBeLessThanOrEqual(art.atlas.height);
    }
  });
  it('registers all 92 icons and all 36 independent VFX materials', () => {
    expect(Object.values(library.frames).filter((f) => f.kind === 'icon')).toHaveLength(92);
    expect(Object.values(library.frames).filter((f) => f.kind !== 'icon')).toHaveLength(36);
    for (const id of Object.keys(library.assetIdToFrame)) expect(resolveAsset(id).atlas).toBeTruthy();
  });
  it('crops an artifact and spell in the actual reusable components', () => {
    for (const id of ['icon.artifact.relic2_ariadne_spool', 'icon.spell.spell2_daedalus_passage']) {
      const rec = resolveAsset(id);
      expect(rec.atlas).toBeTruthy();
      const html = renderToStaticMarkup(id.startsWith('icon.artifact')
        ? <ArtifactIcon iconAssetId={id} kind="misc" />
        : <SpellIcon iconAssetId={id} effectType="temporary_flight" />);
      expect(html).toContain(`viewBox="${rec.atlas!.rect.join(' ')}"`);
      expect(html).toContain('overflow:hidden');
    }
  });
  it('registers every campaign landmark state as a cropped map sprite', () => {
    for(const mission of Object.values(loadCatalog().missions).filter((m)=>['worlds_met','ashes_accord'].includes(m.campaignId??''))) for(const site of mission.sites) {
      for(const id of [site.art,...(site.artStates??[]).map((s)=>s.art)].filter((id)=>id?.startsWith('twin.'))) expect(twinSiteSprites[`map.site.${id}`], `${mission.id}:${site.id}:${id}`).toBeTruthy();
    }
  });
  it('maps the Japanese and Celtic chapter order correctly in both eras', () => {
    expect(resolveArt('mission.worlds_met.m04.briefing')?.url).toContain('p4-foreign-lanterns');
    expect(resolveArt('mission.ashes_accord.m05.briefing')?.url).toContain('e5-unlit-fleet');
    expect(resolveArt('mission.worlds_met.m05.briefing')?.url).toContain('p5-living-arch');
    expect(resolveArt('mission.ashes_accord.m04.briefing')?.url).toContain('e4-ashes-arch');
    expect(resolveAsset('campaign.worlds_met.thumbnail').url).toContain('p7-first-accord');
  });
});
