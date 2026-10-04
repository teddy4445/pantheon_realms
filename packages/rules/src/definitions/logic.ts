/**
 * Reusable requirement and effect vocabulary.
 *
 * Owns: the data-only discriminated unions that gods, buildings, artifacts,
 * skills and quests use instead of bespoke code (no `if (godId === 'athena')`).
 * Does not own: evaluation (see resolvers/requirements.ts and resolvers/modifiers.ts).
 */
import type {
  BuildingId,
  CreatureFamilyId,
  CreatureId,
  EntitlementId,
  GodId,
  ObjectiveId,
  SkillId,
  SpellId,
  ArtifactId,
} from '../ids';
import type { ResourceCost, ResourceKey } from '../core/resources';
import type { ArtifactRarity } from './pantheons';

export type HeroAttribute = 'attack' | 'defense' | 'power' | 'knowledge';
export const HERO_ATTRIBUTES: readonly HeroAttribute[] = ['attack', 'defense', 'power', 'knowledge'];

export type RequirementDefinition =
  /** The town in context has this building or a higher level in the same location chain. */
  | { readonly type: 'has_building'; readonly buildingId: BuildingId }
  /** The acting player has committed to this god. */
  | { readonly type: 'has_god'; readonly godId: GodId }
  /** The acting player has not committed to any god in this exclusivity group. */
  | { readonly type: 'no_god_in_group'; readonly group: string }
  /** The town in context has this creature-family covenant assigned. */
  | { readonly type: 'town_has_covenant'; readonly familyId: CreatureFamilyId }
  | { readonly type: 'hero_level_at_least'; readonly level: number }
  | { readonly type: 'hero_skill_at_least'; readonly skillId: SkillId; readonly rank: number }
  | { readonly type: 'hero_has_spellbook' }
  | { readonly type: 'mission_flag'; readonly flag: string }
  | { readonly type: 'objective_completed'; readonly objectiveId: ObjectiveId }
  /** The acting player has committed to some god in this exclusivity group (e.g. a first minor god). */
  | { readonly type: 'has_god_in_group'; readonly group: string }
  /** The acting player owns no other town with this building (e.g. one Capitol). */
  | { readonly type: 'unique_per_player'; readonly buildingId: BuildingId }
  | { readonly type: 'all_of'; readonly requirements: readonly RequirementDefinition[] }
  | { readonly type: 'any_of'; readonly requirements: readonly RequirementDefinition[] };

/**
 * Effects are passive modifiers or grants attached to a source definition.
 * Economic effects apply at the documented dawn step; access effects apply immediately.
 */
export type EffectDefinition =
  /** Daily income paid at dawn step 2. Only the highest level of a location chain applies. */
  | { readonly type: 'daily_income'; readonly resource: ResourceKey; readonly amount: number }
  /** Weekly growth multiplier for the town (fortification chain), as a rational. */
  | { readonly type: 'growth_multiplier'; readonly numerator: number; readonly denominator: number }
  /** Flat bonus to a commander's primary attribute (gods, artifacts). */
  | { readonly type: 'commander_attribute'; readonly attribute: HeroAttribute; readonly amount: number }
  /** Makes a spell learnable at a later eligible Sanctum visit (gods). */
  | { readonly type: 'spell_eligibility'; readonly spellId: SpellId }
  /** Town spell library up to this tier (Sanctum chain). */
  | { readonly type: 'spell_library'; readonly maxTier: number }
  | { readonly type: 'enables_spellbook_purchase' }
  | { readonly type: 'enables_market' }
  | { readonly type: 'enables_hero_hiring' }
  /** Dwelling access: this creature form may be recruited here. */
  | { readonly type: 'recruit_access'; readonly creatureId: CreatureId }
  /** Percentage bonus to daily land movement (additive with Logistics, floored once). */
  | { readonly type: 'movement_percent'; readonly percent: number }
  /** Siege defenses of the town: 1 Fort (walls, gate), 2 Citadel (+ keep, moat), 3 Castle (+ towers, stronger walls). */
  | { readonly type: 'siege_fortification'; readonly level: 1 | 2 | 3 }
  | { readonly type: 'morale'; readonly amount: number }
  | { readonly type: 'luck'; readonly amount: number }
  // --- Player-wide effects (pantheon signatures and gods; proposed this build) ---
  /** Extra battle XP for this player's winning heroes, percent of the design/04 amount (floored). */
  | { readonly type: 'battle_xp_percent'; readonly percent: number }
  /** A stack with at most numerator/denominator of its starting creatures alive gains +attack. */
  | { readonly type: 'wounded_fury'; readonly attack: number; readonly numerator: number; readonly denominator: number }
  /** After a battle this player wins, each stack regains floor(percent% of its losses); sources add up. */
  | { readonly type: 'casualty_recovery'; readonly percent: number }
  /** At least `families` distinct creature families in the battle army: every stack gains the bonus (highest met threshold). */
  | { readonly type: 'army_harmony'; readonly families: number; readonly attack: number; readonly defense: number }
  /** Shapeshift does not spend the activation (once per activation). */
  | { readonly type: 'free_shapeshift' }
  /** Weekly Temple offering: creatures -> Favor at one Favor per `goldPerFavor` recruitment Gold, capped per town per week. */
  | { readonly type: 'offering'; readonly goldPerFavor: number; readonly maxFavorPerWeek: number }
  /** Battle-only stat change for this player's creatures matching the filter. */
  | {
      readonly type: 'creature_stat';
      readonly stat: 'attack' | 'defense' | 'speed';
      readonly amount: number;
      readonly minTier?: number;
      readonly maxTier?: number;
      /** Only creatures with an ability of this rule type (e.g. 'shooter', 'flight'). */
      readonly ability?: string;
      /** Only creatures of this family, both forms (hero specialties). */
      readonly familyId?: CreatureFamilyId;
    }
  /** +amount weekly growth for every family of tier <= maxTier in this player's towns. */
  | { readonly type: 'weekly_growth_bonus'; readonly maxTier: number; readonly amount: number }
  /** +amount hexes of hero adventure vision (artifacts, gods). */
  | { readonly type: 'vision_radius'; readonly amount: number }
  // --- Town services (the three support buildings; proposed this build) ---
  /** A visiting hero may pay `gold` for `xp` once per world week. */
  | { readonly type: 'enables_hero_training'; readonly xp: number; readonly gold: number }
  /** Town adventure vision radius (the highest applies; the rules default otherwise). */
  | { readonly type: 'town_vision_radius'; readonly radius: number }
  /** Weekly artifact stock of `stockSize` items sold to a visiting hero. */
  | { readonly type: 'enables_artifact_merchant'; readonly stockSize: number }
  /**
   * The Workshop's weekly stock (owner request 2026-10-04): `stockSize` different
   * priced items of these classes (the lowest, `treasure`, is "tier 1"); each can
   * be bought once until the stock changes at the start of the next week.
   */
  | { readonly type: 'enables_workshop'; readonly stockSize: number; readonly rarities: readonly ArtifactRarity[] }
  // --- Hero, artifact-set and world effects (proposed this build) ---
  /** +amount mana restored to the hero at dawn (on top of the rules' regeneration). */
  | { readonly type: 'mana_regen'; readonly amount: number }
  /** Battle spell damage +percent (direct and area damage spells cast by this commander). */
  | { readonly type: 'spell_damage_percent'; readonly percent: number }
  /** +amount Spell Power when this commander casts `spellId` (hero spell specialties). */
  | { readonly type: 'spell_power_bonus'; readonly spellId: SpellId; readonly amount: number };

/** One-time reward package. Applied exactly once through an idempotency key. */
export interface RewardDefinition {
  readonly resources?: ResourceCost;
  readonly artifactIds?: readonly ArtifactId[];
  readonly entitlementIds?: readonly EntitlementId[];
  readonly flags?: readonly string[];
  readonly questXp?: number;
  /** Creatures that join the receiving hero's army (only into a matching or free slot). */
  readonly creatures?: readonly { readonly creatureId: CreatureId; readonly count: number }[];
  /** Permanent primary-attribute gains for the receiving hero. */
  readonly attributes?: Readonly<Partial<Record<HeroAttribute, number>>>;
  /** Mana restored to the receiving hero (never above its maximum). */
  readonly mana?: number;
  /** Movement points added to the receiving hero today. */
  readonly movement?: number;
}

/**
 * Which content pool a definition belongs to. 'core' content is used everywhere;
 * 'expanded' content (pantheon skills and spells, artifact sets, interventions,
 * weekly events) appears only in scenarios that enable it, so authored scenarios
 * such as The Three Beacons keep their documented content.
 */
export type ContentScope = 'core' | 'expanded';
