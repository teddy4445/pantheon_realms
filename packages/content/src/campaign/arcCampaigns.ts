/**
 * The campaigns built on the Winter Oath arc (arc.ts): one per remaining
 * pantheon (owner request 2026-10-02: Egyptian, Japanese, Celtic and
 * Mesoamerican, seven missions each). Built inside `buildCatalog` because the
 * objective texts name troops by their catalog names.
 */
import type { CampaignDefinition, EntitlementDefinition, HeroDefinition, MapTemplateDefinition, MissionDefinition } from '@pr/rules';
import type { ArcCampaignContext } from './arc';
import { buildTwelfthHour, TWELFTH_HOUR_HEROES } from './twelfthHour';
import { buildLanternRoad, LANTERN_ROAD_HEROES } from './lanternRoad';
import { buildSilverBranch, SILVER_BRANCH_HEROES } from './silverBranch';
import { buildNewFire, NEW_FIRE_HEROES } from './newFire';

export const ARC_CAMPAIGN_HEROES: readonly HeroDefinition[] = [...TWELFTH_HOUR_HEROES, ...LANTERN_ROAD_HEROES, ...SILVER_BRANCH_HEROES, ...NEW_FIRE_HEROES];

/** Campaign IDs in menu order (after The Three Beacons and The Winter Oath). */
export const ARC_CAMPAIGN_IDS = ['twelfth_hour', 'lantern_road', 'silver_branch', 'new_fire'] as const;

export function buildArcCampaigns(
  names: ArcCampaignContext['names'],
  familyOf: ArcCampaignContext['familyOf'],
): { templates: MapTemplateDefinition[]; missions: MissionDefinition[]; campaigns: CampaignDefinition[]; entitlements: EntitlementDefinition[] } {
  const built = [buildTwelfthHour(names, familyOf), buildLanternRoad(names, familyOf), buildSilverBranch(names, familyOf), buildNewFire(names, familyOf)];
  return {
    templates: built.flatMap((b) => b.templates),
    missions: built.flatMap((b) => b.missions),
    campaigns: built.map((b) => b.campaign),
    entitlements: built.flatMap((b) => b.entitlements),
  };
}
