/**
 * Map editor and random-map setup helpers for the campaign expansion sites
 * (handoff 2026-10-15): the six new neutral creatures' hiring sites, the sluice
 * (closed / open), the ferry landing and the supply depot.
 *
 * Content is data: the palette is built from content's `NEUTRAL_V2_SITE_STOCK`
 * and `NEUTRAL_V2_HABITATS` (the same table the checks and the random-map
 * generator read) and the catalog's creatures — never a per-creature branch.
 * Pictures are the game's own runtime asset IDs: the creature portrait
 * (`campaignv2.portrait.<id>` through the creature's presentation) and the map
 * picture the adventure map would draw for the compiled site
 * (`siteSpriteCandidates` / `pickSiteSprite`).
 */
import { NEUTRAL_V2_HABITATS, NEUTRAL_V2_SITE_STOCK } from '@pr/content';
import type { ContentCatalog, CustomSite, NeutralSiteTable, SiteDefinition } from '@pr/rules';
import { neutralSiteCreatures, neutralSiteStock } from '@pr/session';
import { pickSiteSprite, siteSpriteCandidates, spriteUrl, type StaticSpriteDefinition } from '@pr/presentation/core';
import { resolveAsset } from '../assets/manifest';

/** The hiring-site table the editor's checks, the compiler and the random-map option use. */
export const NEUTRAL_SITE_TABLE: NeutralSiteTable = { habitats: NEUTRAL_V2_HABITATS, stock: NEUTRAL_V2_SITE_STOCK };

export interface NeutralPaletteEntry {
  readonly creatureId: string;
  readonly name: string;
  readonly plural: string;
  /** Weekly stock of one hiring site. */
  readonly stock: number;
  /** One line about where it lives. */
  readonly habitat: string;
  /** The map biomes whose lands have its habitat. */
  readonly biomes: readonly string[];
  readonly role: string;
  readonly portraitUrl: string | null;
  readonly siteUrl: string | null;
}

/** The neutral hiring sites the editor can place, in the table's order. */
export function neutralPalette(catalog: ContentCatalog): NeutralPaletteEntry[] {
  return neutralSiteCreatures(catalog, NEUTRAL_SITE_TABLE).map((id) => {
    const c = catalog.creatures[id]!;
    const habitat = NEUTRAL_SITE_TABLE.habitats[id]!;
    const portrait = c.presentation?.portraitAssetId ? resolveAsset(c.presentation.portraitAssetId).url : null;
    const site = v2SiteSprite({ kind: 'neutral_dwelling', creatureId: id });
    return {
      creatureId: id,
      name: c.name,
      plural: c.pluralName,
      stock: neutralSiteStock(catalog, NEUTRAL_SITE_TABLE, id),
      habitat: habitat.habitat,
      biomes: habitat.biomes,
      role: c.roleLabel ?? '',
      portraitUrl: portrait || null,
      siteUrl: site ? spriteUrl(site.file) : null,
    };
  });
}

/** The kind (and picture variant) of the compiled site, enough to pick the adventure map's picture. */
function compiledLook(s: Pick<CustomSite, 'kind' | 'creatureId' | 'startsOpen'>, open?: boolean): { def: Pick<SiteDefinition, 'kind' | 'art'>; state: { open: boolean } | null; archetype: string } | null {
  switch (s.kind) {
    case 'neutral_dwelling':
      return { def: { kind: { type: 'creature_camp', creatureId: s.creatureId ?? '', weeklyGrowth: 0, initialStock: 0, restock: 'weekly' }, art: `neutral_dwelling.${s.creatureId ?? ''}` }, state: null, archetype: 'camp' };
    case 'sluice': {
      const isOpen = open ?? !!s.startsOpen;
      return { def: { kind: { type: 'sluice', channel: [], openTerrain: 'marsh', closedTerrain: 'water', startsOpen: isOpen, openText: '', closeText: '', openFlag: '' }, art: 'sluice' }, state: { open: isOpen }, archetype: 'sluice' };
    }
    case 'ferry':
      return { def: { kind: { type: 'portal', exitSiteId: '', ferry: true }, art: 'ferry' }, state: null, archetype: 'portal' };
    case 'supply_depot':
      return { def: { kind: { type: 'pickup', reward: {} }, art: 'supply_depot' }, state: null, archetype: 'pickup' };
    default:
      return null;
  }
}

/**
 * The map picture of a campaign-expansion site as the adventure map draws it (a
 * sluice in its start state, or `open` when given); null for other kinds.
 */
export function v2SiteSprite(s: Pick<CustomSite, 'kind' | 'creatureId' | 'startsOpen'>, open?: boolean): StaticSpriteDefinition | null {
  const look = compiledLook(s, open);
  if (!look) return null;
  return pickSiteSprite(siteSpriteCandidates(look.def, look.state), look.archetype).def;
}

/** URL of that picture (palette buttons and the site panel). */
export function v2SiteSpriteUrl(s: Pick<CustomSite, 'kind' | 'creatureId' | 'startsOpen'>, open?: boolean): string | null {
  const def = v2SiteSprite(s, open);
  return def ? spriteUrl(def.file) : null;
}
