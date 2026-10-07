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
 * Difficulty. Skirmish difficulties change only starting resources, AI income
 * and how boldly the AI attacks; campaign difficulties (proposed 2026-10-07,
 * `scope: 'campaign'`) also scale how many creatures stand in the mission's
 * guards and hostile armies, and how readily its scripted hostile heroes attack.
 * Neither changes creature statistics (campaign/01 §3), and neither is stored in
 * preferences (data contracts: it is match state).
 */
export interface DifficultyDefinition {
  readonly id: string;
  readonly name: string;
  readonly order: number;
  /** Where the level is offered: skirmishes and random maps (default) or campaigns. */
  readonly scope?: 'skirmish' | 'campaign';
  /**
   * Campaign only: creatures in neutral guards, wandering monsters, scripted
   * hostile armies and unowned towns' garrisons, percent of the authored count
   * (each stack rounded, never below 1). Absent = 100.
   */
  readonly guardPercent?: number;
  /**
   * Campaign only: the computer rivals' starting armies (hero and town
   * garrison), percent of the written counts, rounded as the guards. Absent = 100.
   */
  readonly rivalArmyPercent?: number;
  /**
   * Campaign only: the strength ratio a scripted hostile hero needs before it
   * attacks, percent of the authored threshold (never below even strength).
   * Absent = 100.
   */
  readonly hostileThresholdPercent?: number;
  readonly summary: string;
  /** Exact effects shown in setup; must match the numbers below. */
  readonly details: readonly string[];
  /** Starting resources of human players, percent of the scenario's wallet. */
  readonly humanStartPercent: number;
  /** Starting resources of AI empires (campaign: the computer rivals), percent of the scenario's wallet. */
  readonly aiStartPercent: number;
  /** Dawn income of AI empires (campaign: the computer rivals), percent (each resource rounded down). */
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
  /**
   * A shared miracle's name in each pantheon's own faith — the god who answers
   * (owner request 2026-10-07: miracles belong to the pantheon). Same effect, cost
   * and art; `name` remains the fallback.
   */
  readonly names?: Readonly<Partial<Record<PantheonId, string>>>;
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

/** What a divine gift gives (proposed 2026-10-03). */
export type DivineGiftGrant =
  /** Resources at once. */
  | { readonly type: 'resources'; readonly resources: ResourceCost }
  /** Every creature family of tier <= maxTier housed in the town gains `percentOfWeek`% of its weekly growth (at least 1). */
  | { readonly type: 'recruits'; readonly maxTier: number; readonly percentOfWeek: number }
  /** The hero visiting the town gains experience. */
  | { readonly type: 'experience'; readonly amount: number }
  /** The hero visiting the town receives a random artifact of this rarity (drawn deterministically for the match, town and week). */
  | { readonly type: 'artifact'; readonly rarity: 'treasure' | 'minor' | 'major' };

/**
 * A divine gift: something a Temple grants for Favor, so Favor keeps a use once
 * both gods are chosen (owner request 2026-10-03). One gift per town with a
 * Temple per world week; scenarios with divine interventions only.
 */
/**
 * One battle effect of a climate (proposed 2026-10-04, owner request "climates
 * that matter"). It applies to both sides alike, so it favours armies built
 * for the ground rather than either player.
 */
export type ClimateEffectDefinition =
  /** Battle Attack, Defense or Speed of every creature that has (`ability`) or lacks (`withoutAbility`) an ability of that rule type, e.g. 'flight' or 'shooter'. */
  | { readonly type: 'creature_stat'; readonly stat: 'attack' | 'defense' | 'speed'; readonly amount: number; readonly ability?: string; readonly withoutAbility?: string }
  /** Shooting range of every shooter, in hexes (never below 1). */
  | { readonly type: 'shooting_range'; readonly amount: number };

/**
 * A climate's battle rule, keyed by the map biome (`MapTemplateDefinition.biome`).
 * Scenario feature `climateRules` (skirmishes only; The Three Beacons and the
 * campaigns keep it off). A climate without an entry, or with no effects, changes nothing.
 */
export interface ClimateRuleDefinition {
  /** The biome it applies to (e.g. 'moor'). */
  readonly id: string;
  /** Short name of the weather (e.g. "Fog"). */
  readonly name: string;
  /** The exact rule in one sentence (the battle chip's tooltip). */
  readonly summary: string;
  readonly effects: readonly ClimateEffectDefinition[];
  /** Interface icon (`icon.climate.<biome>`; a glyph stands in until delivered). */
  readonly iconAssetId: AssetId;
}

/** Kinds of town building an AI temperament can favour (see `AITemperamentDefinition.build`). */
export type AIBuildFocus = 'economy' | 'military' | 'elite' | 'defense' | 'magic' | 'faith';

/**
 * How a pantheon's AI rival plays (owner request 2026-10-04, "Pantheon AI
 * personalities"; proposed, unplaytested values). Scenario feature
 * `aiTemperaments` (skirmishes; The Three Beacons and the campaigns keep it
 * off). It changes only the AI's choices — never a rule, price or statistic —
 * and every weight of 1 means "as every other rival". The difficulty still
 * sets the strength margins; the temperament scales them.
 */
export interface AITemperamentDefinition {
  /** The pantheon it belongs to (one temperament per pantheon). */
  readonly id: PantheonId;
  /** Short name (e.g. "Raiders"). */
  readonly name: string;
  /** One sentence for setup and the Encyclopedia. */
  readonly summary: string;
  /**
   * Multiplies the difficulty's strength margins (attack a hero, a guard, a
   * town): below 1 attacks at smaller advantages. The result never falls below 1.
   */
  readonly boldness: number;
  /** Multiplies the value of attacking rival heroes and towns and taking rival mines. */
  readonly aggression: number;
  /** Heroes kept beyond the difficulty's target (may be negative; at least one hero). */
  readonly extraHeroes: number;
  /** Build-choice weights by kind of building (1 or absent = neutral). */
  readonly build: Readonly<Partial<Record<AIBuildFocus, number>>>;
  /** Weight of magic in level-up choices and hiring (1 = neutral). */
  readonly magic: number;
  /** Above 1: keeps making Temple offerings after its god choices, for miracles and gifts. */
  readonly faith: number;
}

export interface DivineGiftDefinition {
  readonly id: string;
  readonly name: string;
  readonly summary: string;
  readonly favorCost: number;
  readonly grant: DivineGiftGrant;
  readonly iconAssetId: AssetId;
}

/** The difficulty levels offered for a scope, in order (skirmish levels have no scope or `skirmish`). */
export function difficultyLevels(catalog: { readonly difficulties?: Readonly<Record<string, DifficultyDefinition>> }, scope: 'skirmish' | 'campaign'): DifficultyDefinition[] {
  return Object.values(catalog.difficulties ?? {})
    .filter((d) => (d.scope ?? 'skirmish') === scope)
    .sort((a, b) => a.order - b.order);
}

/** The level a campaign starts on when the player does not choose (the middle one). */
export const DEFAULT_CAMPAIGN_DIFFICULTY = 'campaign_normal';
