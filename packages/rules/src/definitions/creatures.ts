/**
 * Creature content: families, forms and abilities.
 *
 * A CreatureFamilyDefinition is exactly one base form plus exactly one upgraded
 * form sharing tier, growth and footprint (DEC-21). Abilities are composed by ID;
 * there are no creature subclasses. The schema still allows a single-form neutral
 * family (no upgraded form, never a fabricated clone), but no content uses it now:
 * the six campaign-expansion neutrals (Pegasus, Root-Runner, Serpopard, Baku,
 * Afanc, Ahuitzotl) were single-form until the owner asked for their upgrades
 * (battle FX & neutral upgrades delivery 2026-10-15) and are base + one upgrade.
 * Pantheon roster families always have both forms.
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
 * Presentation hint: the silhouette family of placeholder sprites.
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
  /** 2D sprite set (battle and bestiary animation strips) in the sprite manifest. */
  readonly spriteAssetId: AssetId;
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
  /** Explicit rule tags; never inferred from portrait, name or pantheon. */
  readonly traits?: readonly ('mind_immune' | 'undead' | 'construct')[];
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
  /** Absent for a single-form neutral family (no upgrade exists). */
  readonly upgradedCreatureId?: CreatureId;
  /** Shared weekly growth for the family pool (base and upgraded share it). */
  readonly baseGrowth: number;
  /**
   * Where a neutral family appears (sea-creature delivery 2026-10-17). Absent: wherever neutrals
   * appear (guards, camps, wandering monsters, random maps). `sea_encounters`: only in sea-monster
   * encounters on water — never recruited, never on land, never joining an army.
   */
  readonly availability?: 'sea_encounters';
  readonly dwellingBuildingId?: BuildingId;
  readonly upgradedDwellingBuildingId?: BuildingId;
  readonly implementationStatus: ImplementationStatus;
}

/** The family's forms in order: the base, then the upgrade when it has one. */
export function familyForms(fam: Pick<CreatureFamilyDefinition, 'baseCreatureId' | 'upgradedCreatureId'>): CreatureId[] {
  return fam.upgradedCreatureId ? [fam.baseCreatureId, fam.upgradedCreatureId] : [fam.baseCreatureId];
}

/** True when the family has no upgraded form (allowed for neutral families only; none in the current content). */
export function isSingleForm(fam: Pick<CreatureFamilyDefinition, 'upgradedCreatureId'>): boolean {
  return !fam.upgradedCreatureId;
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
  | { readonly type: 'shapeshift'; readonly aspect: string; readonly attack: number; readonly defense: number; readonly speed: number }
  // --- Neutral creature abilities (campaign expansion handoff 2026-10-15; proposed, unplaytested) ---
  /**
   * Sheltering Wings (active, `usesPerBattle` per stack, spends the activation): one adjacent
   * allied living stack other than the user takes `reductionPercent` % less from its next direct
   * melee or ranged creature-damage event (the reduction rounded down) before the start of the
   * user's next activation. Spells, structures and the environment are unaffected; copies do not stack.
   */
  | { readonly type: 'sheltering_wings'; readonly reductionPercent: number; readonly usesPerBattle: number }
  /**
   * Distract (active): one visible hostile living stack within `range` hexes (clear line) has its
   * next otherwise-legal retaliation suppressed until the start of the user's next activation;
   * the suppressed retaliation counts as one used. No damage, move or stun; copies do not stack.
   */
  | { readonly type: 'distract'; readonly range: number; readonly usesPerBattle: number }
  /**
   * Long Reach (passive attack option): besides adjacent melee, a melee strike at exactly
   * `distance` hexes along a straight line whose middle cell is clear of stacks, obstacles and
   * intact structures, for `damagePercent` % damage. Not a shot (no ammunition). The target
   * retaliates only if it can reach back the same way.
   */
  | { readonly type: 'long_reach'; readonly distance: 2; readonly damagePercent: number }
  /**
   * Devour Dread (active): one allied living stack within `range` hexes (clear line), the user
   * included, loses exactly one temporary hostile status — a negative Attack, Defense or Speed
   * bonus, or a hostile curse (minimum damage) — the earliest applied first. Unavailable (no
   * charge spent) when no stack in reach has one.
   */
  | { readonly type: 'devour_dread'; readonly range: number; readonly usesPerBattle: number }
  /**
   * Reed Guard (active): the user defends, and one adjacent allied living stack other than the
   * user gains +`defenseBonus` Defense and is immune to one forced pull, both until the start of
   * the user's next activation. Copies do not stack.
   */
  | { readonly type: 'reed_guard'; readonly defenseBonus: number; readonly usesPerBattle: number }
  /**
   * Tail Snare (active): a visible hostile living one-hex stack at exactly `distance` hexes along a
   * clear straight line is pulled one hex toward the user when that cell is empty, on the board
   * and not a hazard. No damage, attack or retaliation; a pull-immune target cannot be chosen.
   */
  | { readonly type: 'tail_snare'; readonly distance: 2; readonly usesPerBattle: number }
  // --- Sea creatures (sea-creature delivery 2026-10-17; proposed, unplaytested) ---
  /**
   * Swimmer (aquatic trait): on a battlefield with a zone occupancy policy (the single-ship sea
   * encounter) every footprint cell must be water. Boards without a policy are unchanged.
   */
  | { readonly type: 'swimmer' }
  /**
   * Renewable shots: the stack's ammunition is set to `capacity` at the start of every battle round,
   * round 1 included. A shot still spends one shot and the activation; refilling grants no action.
   */
  | { readonly type: 'renewable_shots'; readonly capacity: number };

/** Active abilities of the neutral creatures that spend a per-stack use (handoff 2026-10-15). */
export const STACK_USE_ABILITY_TYPES = ['sheltering_wings', 'distract', 'devour_dread', 'reed_guard', 'tail_snare'] as const;
export type StackUseAbilityType = (typeof STACK_USE_ABILITY_TYPES)[number];

export interface AbilityDefinition {
  /** Explicit creature spell, distinct from a physical active ability. */
  readonly spellcasting?: boolean;
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
