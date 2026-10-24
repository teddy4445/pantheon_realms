/**
 * The map editor's campaign expansion palette (packages/ui/src/app/editorV2Sites.ts,
 * handoff 2026-10-15): the six neutral hiring sites come from content's data
 * (stock, habitat) with the creature portrait and the adventure map's own site
 * picture; the sluice (closed and open), the ferry landing and the supply depot
 * resolve to their runtime pictures. Every picture exists on disk.
 */
import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildCatalog, NEUTRAL_V2_HABITATS, NEUTRAL_V2_SITE_STOCK } from '@pr/content';
import { NEUTRAL_SITE_TABLE, neutralPalette, v2SiteSprite, v2SiteSpriteUrl } from '../src/app/editorV2Sites';
import { campSiteForms } from '@pr/rules';
import { customHabitatVerdict, neutralSiteStock } from '@pr/session';
import { neutralSiteBase, neutralSiteDefinition } from '@pr/mapgen';
import type { CustomMapDocument } from '@pr/rules';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const catalog = buildCatalog();
const onDisk = (url: string | null) => !!url && existsSync(path.join(root, 'assets-runtime', url.replace(/^\.\//, '')));

describe('map editor: campaign expansion palette', () => {
  it('lists all nine neutral hiring sites from content data, each with its portrait and map picture', () => {
    expect(NEUTRAL_SITE_TABLE.habitats).toBe(NEUTRAL_V2_HABITATS);
    expect(NEUTRAL_SITE_TABLE.stock).toBe(NEUTRAL_V2_SITE_STOCK);
    const palette = neutralPalette(catalog);
    expect(palette.map((e) => e.creatureId)).toEqual(Object.keys(NEUTRAL_V2_HABITATS));
    expect(palette).toHaveLength(9);
    for (const e of palette) {
      expect(e.stock).toBe(NEUTRAL_V2_SITE_STOCK[e.creatureId]);
      expect(e.name).toBe(catalog.creatures[e.creatureId]!.name);
      expect(e.habitat).toBe(NEUTRAL_V2_HABITATS[e.creatureId]!.habitat);
      expect(e.portraitUrl, `${e.creatureId} portrait`).toMatch(/(?:campaign-v2|neutral-dragons-v1)\//);
      expect(onDisk(e.portraitUrl), `${e.portraitUrl}`).toBe(true);
      expect(e.siteUrl, `${e.creatureId} site`).toMatch(/(?:campaign-v2|neutral-dragons-v1)\//);
      expect(onDisk(e.siteUrl), `${e.siteUrl}`).toBe(true);
    }
    // Nine different map pictures and portraits.
    expect(new Set(palette.map((e) => e.siteUrl)).size).toBe(9);
    expect(new Set(palette.map((e) => e.portraitUrl)).size).toBe(9);
  });

  it('draws the sluice closed and open, the ferry landing and the supply depot with their own pictures', () => {
    const closed = v2SiteSpriteUrl({ kind: 'sluice' });
    const open = v2SiteSpriteUrl({ kind: 'sluice', startsOpen: true });
    expect(closed).not.toBe(open);
    expect(v2SiteSpriteUrl({ kind: 'sluice' }, true)).toBe(open);
    for (const url of [closed, open, v2SiteSpriteUrl({ kind: 'ferry' }), v2SiteSpriteUrl({ kind: 'supply_depot' })]) {
      expect(url).toMatch(/(?:campaign-v2|neutral-dragons-v1)\//);
      expect(onDisk(url), `${url}`).toBe(true);
    }
    // The closed and open paintings share one ground anchor and display size (the same site in two states).
    const a = v2SiteSprite({ kind: 'sluice' })!;
    const b = v2SiteSprite({ kind: 'sluice' }, true)!;
    expect(a.pixelsPerHex).toBe(b.pixelsPerHex);
    // Classic kinds keep their own pictures (not this helper's).
    expect(v2SiteSprite({ kind: 'portal' })).toBeNull();
    expect(v2SiteSprite({ kind: 'creature_camp', creatureId: 'centaur' })).toBeNull();
  });

  it('neutral upgrades add no placeable site: nine dwellings keyed to the base form, each hiring both forms; habitat and stock by family', () => {
    const palette = neutralPalette(catalog);
    expect(palette).toHaveLength(9);
    for (const e of palette) {
      const fam = catalog.families[catalog.creatures[e.creatureId]!.familyId]!;
      expect(fam.baseCreatureId).toBe(e.creatureId);
      const up = fam.upgradedCreatureId!;
      expect(up).toBeTruthy();
      // No biome, habitat or stock entry of the upgrade's own.
      expect(NEUTRAL_V2_HABITATS[up]).toBeUndefined();
      expect(NEUTRAL_V2_SITE_STOCK[up]).toBeUndefined();
      // The compiled hiring site: the base form's picture and stock; it hires both forms.
      const def = neutralSiteDefinition(catalog, NEUTRAL_SITE_TABLE, e.creatureId);
      expect(def.art).toBe(`neutral_dwelling.${e.creatureId}`);
      expect(campSiteForms(catalog, def)).toEqual([e.creatureId, up]);
      // An upgraded ID names the same site (family-level lookups): same picture, stock and habitat.
      expect(neutralSiteBase(catalog, up)).toBe(e.creatureId);
      expect(neutralSiteDefinition(catalog, NEUTRAL_SITE_TABLE, up)).toEqual(def);
      expect(neutralSiteStock(catalog, NEUTRAL_SITE_TABLE, up)).toBe(e.stock);
    }
    // Habitat checks of an editor map read the family's habitat for either ID.
    const doc = { biome: 'temperate', width: 8, height: 8, terrain: [], sites: [] } as unknown as CustomMapDocument;
    const base = customHabitatVerdict(catalog, doc, { kind: 'neutral_dwelling', creatureId: 'pegasus', q: 2, r: 2 }, NEUTRAL_SITE_TABLE);
    const upg = customHabitatVerdict(catalog, doc, { kind: 'neutral_dwelling', creatureId: 'dawncrest_pegasus', q: 2, r: 2 }, NEUTRAL_SITE_TABLE);
    expect(base).not.toBeNull();
    expect(upg).toEqual(base);
  });
});
