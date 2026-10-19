/**
 * City dedications (CITY DEDICATIONS handoff, 2026-10-17; app 1.5.0). A town with
 * Temple level II may honor one god of its owner's pantheon — the current patron or
 * an already committed minor god. While it is active and eligible the town earns
 * three LOCAL benefits from that god's authored profile: a weekly resource gift, extra
 * weekly stock of one favored creature family, and one town-service advantage.
 *
 * Content is data: the 60 authored profiles and the 11 service rules live in the
 * catalog (`cityDedicationProfiles`, `cityServiceRules`, `cityDedicationPolicy`);
 * never infer a benefit from a god's name or domain. Design source:
 * docs/divine-city-benefits-v1/ (proposed values, unplaytested).
 */
import type { CreatureFamilyId, GodId } from '../ids';
import type { ResourceCost } from '../core/resources';
import type { SupportRole } from './towns';

/** The eleven town-service advantages (service-rules.json). */
export type CityServiceId = 'training' | 'trade' | 'fortify' | 'library' | 'spellbook' | 'recruit' | 'upgrade' | 'equipment' | 'watch' | 'dwelling' | 'civic';

export const CITY_SERVICE_IDS: readonly CityServiceId[] = ['training', 'trade', 'fortify', 'library', 'spellbook', 'recruit', 'upgrade', 'equipment', 'watch', 'dwelling', 'civic'];

/**
 * A role a service needs or targets: a town location's `SupportRole`, or the favored
 * family's dwelling — `favored_dwelling` (its base dwelling built) and
 * `favored_upgraded_dwelling` (its dwelling at the upgraded level). Found by the
 * slot's role / dwelling tier and the family's metadata, never by display names.
 */
export type CityServiceRole = SupportRole | 'favored_dwelling' | 'favored_upgraded_dwelling';

export type CityServiceKind =
  /** Less Gold for a town service (hero training, spellbook purchase). */
  | 'gold_discount'
  /** Less Gold when buying a resource at this town's market (never below the best sell rate + 1). */
  | 'market_buy_discount'
  /** Less Gold to build or upgrade the locations of `targetRole` in this town. */
  | 'construction_gold_discount'
  /** Less Gold per recruited member of the favored family (both forms). */
  | 'family_recruit_gold_discount'
  /** Less Gold on the favored family's per-unit upgrade price difference. */
  | 'family_upgrade_gold_discount'
  /** Less Gold for artifact purchases from this town's Artifact Merchant or Workshop. */
  | 'shop_gold_discount'
  /** Extra hexes on this town's own vision radius. */
  | 'town_vision_bonus'
  /** Less Gold to build or upgrade the favored family's dwelling. */
  | 'family_dwelling_gold_discount';

export interface CityServiceRule {
  readonly id: CityServiceId;
  readonly name: string;
  readonly kind: CityServiceKind;
  /** Gold discount in percent (discounts). */
  readonly percent?: number;
  /** Extra hexes (`town_vision_bonus`). */
  readonly amount?: number;
  /** The location the service needs built in this town. */
  readonly requiredRole?: CityServiceRole;
  /** Any one of these locations built (the two artifact shops). */
  readonly requiredRolesAny?: readonly CityServiceRole[];
  /** A town effect the required location must provide (e.g. `enables_spellbook_purchase`). */
  readonly requiredEffect?: string;
  /** Construction discounts: the locations whose building or upgrading costs less. */
  readonly targetRole?: CityServiceRole;
  /** The exact player-facing sentence (shown as written). */
  readonly summary: string;
}

/** One god's city dedication: exactly three local benefits (god-city-profiles.json). */
export interface CityDedicationProfile {
  readonly godId: GodId;
  /** Paid to the owner at each world-week boundary while active and eligible. */
  readonly weeklyResource: ResourceCost;
  /** Extra stock goes to this family's shared base/upgraded town population. */
  readonly favoredFamilyId: CreatureFamilyId;
  /** Quarter creatures added per eligible week: 8 (tiers 1–2), 4 (3–5), 2 (6), 1 (7). */
  readonly weeklyGrowthQuarters: 1 | 2 | 4 | 8;
  readonly serviceId: CityServiceId;
}

/** The feature's fixed terms (feature-policy.json). */
export interface CityDedicationPolicy {
  /** The scenario feature flag (`ScenarioFeatures.cityDedicationsV1`). */
  readonly id: 'cityDedicationsV1';
  /** Built level of the town's `pantheon_temple` location required (Temple II). */
  readonly requiredTempleLevel: number;
  /** The first dedication of a town is free. */
  readonly firstDedicationCost: ResourceCost;
  /** Scheduling a different god for the next world week. */
  readonly switchCost: ResourceCost;
  /** Direct god benefit types replaced by city dedications when the feature is on. */
  readonly suppressedGodEffectTypes: readonly ('daily_income' | 'weekly_growth_bonus')[];
}
