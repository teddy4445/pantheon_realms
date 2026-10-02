/**
 * Creature content: families, forms and abilities.
 *
 * A CreatureFamilyDefinition is exactly one base form plus exactly one upgraded
 * form sharing tier, growth and footprint (DEC-21). Abilities are composed by ID;
 * there are no creature subclasses.
 *
 * Immutable content. Runtime quantities live in CreatureStackState / BattleStackState.
 */
import type { AbilityId, AssetId, BuildingId, CreatureFamilyId, CreatureId, LoreId, PantheonId } from '../ids';
import type { ResourceCost } from '../core/resources';
import type { BalanceStatus, ImplementationStatus, ProvenanceInfo } from './common';

export type CreatureTier = 1 | 2 | 3 | 4 | 5 | 6 | 7;
export const CREATURE_TIERS: readonly CreatureTier[] = [1, 2, 3, 4, 5, 6, 7];

export type CreatureForm = 'base' | 'upgraded';

export type CreatureRole =
  | 'line_infantry'
  | 'skirmisher'
  | 'flying_interceptor'
  | 'mounted_shock'
  | 'ranged_support'
  | 'heavy_melee'
  | 'apex_ranged'
  | 'apex_melee'
  | 'fast_melee'
  | 'unassigned';

/**
 * Presentation hint used by placeholder proxies and future rigs.
 * Not a rule: footprint and movement mode come from stats/abilities.
 */
export type BodyProfile =
  | 'humanoid_spear'
  | 'humanoid_thrower'
  | 'humanoid_caster'
  | 'centaur'
  | 'griffin'
  | 'rider'
  | 'bull_biped'
  | 'giant'
  | 'beast'
  | 'serpent'
  | 'winged_humanoid'
  | 'spirit'
  | 'construct';

export interface CreatureStats {
  readonly attack: number;
  readonly defense: number;
  /** HP per creature, not per stack. */
  readonly hp: number;
  readonly damageMin: number;
  readonly damageMax: number;
  /** Tactical Speed; also selects adventure movement budget via the slowest stack. */
  readonly speed: number;
  /** Ammunition per stack per battle; 0 means no ranged attack. */
  readonly shots: number;
  /**
   * Shooting range in hexes (required when \`shots\` > 0; owner decision
   * 2026-10-02). A shooter cannot shoot a target farther away; in the far half
   * of its range (distance × 2 > range) a shot deals half damage.
   */
  readonly range?: number;
  /** Occupied tactical cells. */
  readonly footprint: 1 | 2;
}

export interface CreaturePresentationRefs {
  readonly bodyProfile: BodyProfile;
  readonly portraitAssetId: AssetId;
  readonly modelAssetId: AssetId;
  readonly animationProfileId: AssetId;
  /** Short accessible description of the portrait. */
  readonly portraitAlt: string;
}

export interface CreatureDefinition {
  readonly id: CreatureId;
  readonly familyId: CreatureFamilyId;
  /** null for neutral (non-roster) families. */
  readonly pantheonId: PantheonId | null;
  readonly tier: CreatureTier;
  readonly form: CreatureForm;
  /** Present on base forms only. */
  readonly upgradeId?: CreatureId;
  /** Present on upgraded forms only. */
  readonly baseId?: CreatureId;
  readonly name: string;
  readonly pluralName: string;
  readonly role: CreatureRole;
  readonly roleLabel: string;
  /**
   * Stats are required for implemented content. Preparation pantheons carry
   * names and pair topology only, so the encyclopedia can preview them honestly.
   */
  readonly stats?: CreatureStats;
  readonly cost?: ResourceCost;
  readonly abilityIds: readonly AbilityId[];
  readonly summary: string;
  readonly loreId: LoreId;
  readonly presentation: CreaturePresentationRefs;
  readonly implementationStatus: ImplementationStatus;
  readonly balanceStatus: BalanceStatus;
  readonly provenance: ProvenanceInfo;
}

export type FamilyClassification = 'pantheon_roster' | 'neutral';

export interface CreatureFamilyDefinition {
  readonly id: CreatureFamilyId;
  readonly name: string;
  readonly pantheonId: PantheonId | null;
  readonly classification: FamilyClassification;
  readonly tier: CreatureTier;
  readonly baseCreatureId: CreatureId;
  readonly upgradedCreatureId: CreatureId;
  /** Shared weekly growth for the family pool (base and upgraded share it). */
  readonly baseGrowth: number;
  readonly dwellingBuildingId?: BuildingId;
  readonly upgradedDwellingBuildingId?: BuildingId;
  readonly implementationStatus: ImplementationStatus;
}

/** Discriminated ability rules processed by the battle resolvers. */
export type AbilityRule =
  | { readonly type: 'shooter' }
  | { readonly type: 'flight' }
  | { readonly type: 'retaliations'; readonly perRound: number | 'unlimited' }
  | { readonly type: 'charge'; readonly perHexPercent: number; readonly capPercent: number }
  | { readonly type: 'charge_guard' }
  | {
      readonly type: 'family_ward';
      readonly defenseBonus: number;
      readonly durationRounds: number;
      readonly chargesPerBattle: number;
    }
  | { readonly type: 'unyielding'; readonly minimumMorale: number }
  | { readonly type: 'wall_breaker' }
  | { readonly type: 'no_melee_penalty' }
  /**
   * Toggle between the normal aspect and one alternate aspect (a battle status,
   * not a creature form: DEC-21 still allows exactly base + one upgrade).
   * Spends the activation unless the side has `free_shapeshift`.
   */
  | { readonly type: 'shapeshift'; readonly aspect: string; readonly attack: number; readonly defense: number; readonly speed: number };

export interface AbilityDefinition {
  readonly id: AbilityId;
  readonly name: string;
  readonly activation: 'passive' | 'active';
  readonly summary: string;
  readonly exactRule: string;
  readonly restriction: string;
  readonly rule: AbilityRule;
  readonly implementationStatus: ImplementationStatus;
}

export interface LoreDefinition {
  readonly id: LoreId;
  readonly sourceNote: string;
  readonly sourceRefs: readonly string[];
  readonly sourceStatus: 'verified_note' | 'draft_requires_review' | 'original_invention';
  readonly gameLore: string;
  readonly upgradeLore?: string;
}
