/**
 * Skirmish-only content: difficulty levels, divine interventions, weekly
 * events and the per-pantheon starting kits used by the random-map generator.
 * All values are PROPOSED (this build) and unplaytested.
 */
import type { AssetId, BuildingId, CreatureFamilyId, HeroClassId, HeroDefinitionId, PantheonId, SkillId, TownArchetypeId } from '../ids';
import type { ResourceCost } from '../core/resources';
import type { EffectDefinition, HeroAttribute } from './logic';
import type { MapEventOptionDefinition, StackSpec } from './world';

/**
 * Skirmish difficulty. Changes only starting resources, AI income and how
 * boldly the AI attacks; it never changes creature statistics (campaign/01 §3)
 * and is never stored in preferences (data contracts: it is match state).
 */
export interface DifficultyDefinition {
  readonly id: string;
  readonly name: string;
  readonly order: number;
  readonly summary: string;
  /** Exact effects shown in setup; must match the numbers below. */
  readonly details: readonly string[];
  /** Starting resources of human players, percent of the scenario's wallet. */
  readonly humanStartPercent: number;
  /** Starting resources of AI empires, percent of the scenario's wallet. */
  readonly aiStartPercent: number;
  /** Dawn income of AI empires, percent (each resource rounded down). */
  readonly aiIncomePercent: number;
  /** Strategic AI behaviour (strength ratios it demands before fighting). */
  readonly ai: {
    /** Own strength ÷ enemy hero strength needed to attack a hero in the field. */
    readonly heroAttackMargin: number;
    /** Own strength ÷ guard strength needed to attack a neutral guard. */
    readonly guardMargin: number;
    /** Own strength ÷ (defense × wall factor) needed to besiege a town. */
    readonly siegeMargin: number;
    /** Heroes the AI tries to keep. */
    readonly targetHeroes: number;
  };
  /** Score multiplier, percent. */
  readonly scorePercent: number;
}

export type InterventionEffectDefinition =
  /** Adventure: every active hero of the player regains `percent`% of its daily movement. */
  | { readonly type: 'restore_movement'; readonly percent: number }
  /** Adventure: the chosen town gains `amount` recruits for every family of tier <= maxTier it houses. */
  | { readonly type: 'town_growth'; readonly maxTier: number; readonly amount: number }
  /** Adventure: resources granted at once. */
  | { readonly type: 'grant_resources'; readonly resources: ResourceCost }
  /** Adventure: every active hero of the player regains `amount` mana (never above its maximum). */
  | { readonly type: 'restore_mana'; readonly amount: number }
  /** Battle: every friendly stack gains the bonus through the current and following rounds. */
  | { readonly type: 'battle_status'; readonly stat: 'attack' | 'defense' | 'speed'; readonly amount: number; readonly durationRounds: number }
  /** Battle: the front creature of every friendly stack heals up to `amount` HP (no resurrection). */
  | { readonly type: 'battle_heal'; readonly amount: number }
  /** Battle: one enemy stack takes `damage` damage. */
  | { readonly type: 'battle_smite'; readonly damage: number };

/**
 * A divine intervention: a miracle paid for in Favor. A player may invoke at
 * most one intervention per world week (proposed this build).
 */
export interface InterventionDefinition {
  readonly id: string;
  readonly name: string;
  readonly summary: string;
  readonly favorCost: number;
  readonly context: 'adventure' | 'battle';
  readonly target: 'none' | 'own_town' | 'enemy_stack';
  readonly effect: InterventionEffectDefinition;
  /** Offered only to these pantheons (omitted: every pantheon). */
  readonly pantheonIds?: readonly PantheonId[];
  readonly iconAssetId: AssetId;
}

/** A weekly event: world-wide effects for one week (skirmish feature). */
export interface WeeklyEventDefinition {
  readonly id: string;
  readonly name: string;
  readonly summary: string;
  /** Relative draw weight. */
  readonly weight: number;
  /** Applied to every empire for the week; empty for a quiet week. */
  readonly effects: readonly EffectDefinition[];
}

/** One possible skirmish leader for a pantheon (the generator uses each at most once per match). */
export interface SkirmishLeaderDefinition {
  readonly definitionId: HeroDefinitionId;
  readonly classId: HeroClassId;
  readonly portraitAssetId: AssetId;
}

/** A pantheon's skirmish starting package (towns, escorts, leaders). */
export interface SkirmishKitDefinition {
  readonly pantheonId: PantheonId;
  readonly adjective: string;
  readonly archetypeId: TownArchetypeId;
  readonly buildings: readonly BuildingId[];
  readonly population: Readonly<Record<CreatureFamilyId, number>>;
  readonly covenants: readonly CreatureFamilyId[];
  readonly army: readonly StackSpec[];
  /** Same-archetype leaders (equal attributes and skills for every pantheon). */
  readonly leaders: readonly SkirmishLeaderDefinition[];
  readonly leaderAttributes: Readonly<Record<HeroAttribute, number>>;
  readonly leaderSkills: readonly { readonly skillId: SkillId; readonly rank: number }[];
  /** Names for generated towns. */
  readonly townNames: readonly string[];
}

/** A one-time map event the random-map generator may place (text and options are data). */
export interface MapEventTemplateDefinition {
  readonly id: string;
  readonly title: string;
  readonly text: string;
  readonly options: readonly MapEventOptionDefinition[];
  /** 'near' events sit close to a town, 'far' ones out in the wilds (richer). */
  readonly band: 'near' | 'far';
}
