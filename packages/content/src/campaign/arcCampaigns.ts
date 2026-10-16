/**
 * The campaigns built on the Winter Oath arc (arc.ts): one per remaining
 * pantheon (owner request 2026-10-02: Egyptian, Japanese, Celtic and
 * Mesoamerican, seven missions each), and The Silent Oracle, the second Greek
 * campaign (owner request 2026-10-14), built first so the catalog can list it
 * right after The Three Beacons. Built inside `buildCatalog` because the
 * objective texts name troops by their catalog names.
 */
import type { CampaignDefinition, EntitlementDefinition, HeroDefinition, MapTemplateDefinition, MissionDefinition } from '@pr/rules';
import type { ArcCampaignContext } from './arc';
import { buildTwelfthHour, TWELFTH_HOUR_HEROES } from './twelfthHour';
import { buildLanternRoad, LANTERN_ROAD_HEROES } from './lanternRoad';
import { buildSilverBranch, SILVER_BRANCH_HEROES } from './silverBranch';
import { buildNewFire, NEW_FIRE_HEROES } from './newFire';
import { buildSilentOracle, SILENT_ORACLE_HEROES } from './silentOracle';

export const ARC_CAMPAIGN_HEROES: readonly HeroDefinition[] = [...SILENT_ORACLE_HEROES, ...TWELFTH_HOUR_HEROES, ...LANTERN_ROAD_HEROES, ...SILVER_BRANCH_HEROES, ...NEW_FIRE_HEROES];

export function buildArcCampaigns(
  names: ArcCampaignContext['names'],
  familyOf: ArcCampaignContext['familyOf'],
): { templates: MapTemplateDefinition[]; missions: MissionDefinition[]; campaigns: CampaignDefinition[]; entitlements: EntitlementDefinition[] } {
  const built = [buildSilentOracle(names, familyOf), buildTwelfthHour(names, familyOf), buildLanternRoad(names, familyOf), buildSilverBranch(names, familyOf), buildNewFire(names, familyOf)];
  return {
    templates: built.flatMap((b) => b.templates),
    missions: built.flatMap((b) => b.missions),
    campaigns: built.map((b) => b.campaign),
    entitlements: built.flatMap((b) => b.entitlements),
  };
}
