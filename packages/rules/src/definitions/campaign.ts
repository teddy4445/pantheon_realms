/**
 * Campaign, scenario and objective content.
 *
 * A MissionDefinition is an explicit scenario manifest: starting state, purchase
 * allowlist, sites, objectives and dialogue. Mission-specific exceptions apply only
 * to that mission (campaign/01 §3), never to skirmish rules globally.
 */
import type {
  AssetId,
  BuildingId,
  CampaignId,
  CreatureFamilyId,
  CreatureId,
  GodId,
  HeroClassId,
  HeroDefinitionId,
  HeroId,
  MapTemplateId,
  MissionId,
  ObjectiveId,
  PantheonId,
  PlayerId,
  ScenarioId,
  SiteId,
  SkillId,
  TownArchetypeId,
  TownId,
} from '../ids';
import type { ResourceCost } from '../core/resources';
import type { HeroAttribute, RewardDefinition } from './logic';
import type { HostileHeroDefinition, SiteDefinition, StackSpec } from './world';

export interface DialogueLine {
  readonly speaker: string;
  readonly portraitAssetId: AssetId;
  readonly text: string;
}

export type ObjectiveCondition =
  | { readonly type: 'counter_at_least'; readonly counter: string; readonly value: number }
  | { readonly type: 'site_cleared'; readonly siteId: SiteId }
  | { readonly type: 'site_activated'; readonly siteId: SiteId }
  | { readonly type: 'site_visited'; readonly siteId: SiteId }
  | { readonly type: 'flag'; readonly flag: string }
  | { readonly type: 'player_has_minor_god' }
  | {
      readonly type: 'hero_army_contains';
      readonly heroId: HeroId;
      readonly creatureId: CreatureId;
      readonly count: number;
    }
  /** Completes only through an explicit ClaimObjective command once its prerequisites complete. */
  | { readonly type: 'claim'; readonly after: readonly ObjectiveId[] }
  | { readonly type: 'all'; readonly conditions: readonly ObjectiveCondition[] }
  | { readonly type: 'any'; readonly conditions: readonly ObjectiveCondition[] };

export type ObjectiveStatus = 'locked' | 'available' | 'active' | 'completed' | 'failed';

export interface ObjectiveDefinition {
  readonly id: ObjectiveId;
  readonly title: string;
  readonly description: string;
  readonly category: 'primary' | 'optional';
  readonly initialStatus: ObjectiveStatus;
  readonly condition: ObjectiveCondition;
  /** Objectives becoming active when this one completes. */
  readonly unlocks?: readonly ObjectiveId[];
  /** Granted once on completion (e.g. claimed covenant). */
  readonly reward?: RewardDefinition;
  readonly markerSiteId?: SiteId;
  /** Tracks a live condition (e.g. army contents) that can be lost again. */
  readonly live?: boolean;
  /** Help text shown in the journal. */
  readonly hint?: string;
}

export interface MissionTownSetup {
  readonly townId: TownId;
  readonly siteId: SiteId;
  readonly name: string;
  readonly archetypeId: TownArchetypeId;
  readonly buildings: readonly BuildingId[];
  readonly population: Readonly<Record<CreatureFamilyId, number>>;
  readonly covenants: readonly CreatureFamilyId[];
}

export interface MissionHeroSetup {
  readonly heroId: HeroId;
  readonly definitionId: HeroDefinitionId;
  readonly classId: HeroClassId;
  /** Used for M01 and for direct test starts; later missions carry the hero over. */
  readonly defaults: {
    readonly level: number;
    readonly xp: number;
    readonly attributes: Readonly<Record<HeroAttribute, number>>;
    readonly skills: readonly { readonly skillId: SkillId; readonly rank: number }[];
    readonly spellbook: boolean;
  };
  readonly army: readonly StackSpec[];
  readonly startTownId: TownId;
}

export interface MissionRivalSetup {
  readonly playerId: PlayerId;
  readonly name: string;
  readonly pantheonId: PantheonId;
  readonly color: string;
  readonly wallet: ResourceCost;
  readonly town: MissionTownSetup;
  readonly hero: MissionHeroSetup;
}

export interface HelpTopicDefinition {
  readonly id: string;
  readonly title: string;
  readonly text: string;
}

export interface MissionDefinition {
  readonly id: MissionId;
  readonly scenarioId: ScenarioId;
  readonly campaignId: CampaignId | null;
  readonly order: number;
  readonly name: string;
  readonly subtitle: string;
  readonly summary: string;
  readonly mapTemplateId: MapTemplateId;
  readonly targetPlaytime: string;
  readonly newDecisions: readonly string[];
  /** Cumulative XP cap applied at the end of the mission (campaign/01 §4). */
  readonly xpCap: number | null;
  readonly xpCapLevel: number | null;
  readonly briefing: readonly DialogueLine[];
  readonly victory: readonly DialogueLine[];
  readonly debriefPolicy: readonly string[];
  readonly player: {
    readonly playerId: PlayerId;
    readonly name: string;
    readonly pantheonId: PantheonId;
    readonly wallet: ResourceCost;
    readonly town: MissionTownSetup;
    readonly hero: MissionHeroSetup;
  };
  readonly hostilePlayer?: { readonly playerId: PlayerId; readonly name: string };
  /** Skirmish rivals: full AI empires using the same rules (proposed-this-build). */
  readonly rivals?: readonly MissionRivalSetup[];
  /** Mission flags set at initialization (e.g. "skirmish"). */
  readonly initialFlags?: readonly string[];
  readonly purchasableBuildingIds: readonly BuildingId[] | null;
  /** Gods a player may commit to in this mission; omitted = no allowlist. */
  readonly committableGodIds?: readonly GodId[];
  /** Pantheon signature mechanics apply (default true). The Three Beacons keeps its documented rules (false). */
  readonly signatureMechanics?: boolean;
  readonly heroHiringEnabled: boolean;
  readonly heroHiringDisabledReason?: string;
  /** Finite scenario-defined Tavern candidates (design/02). Omitted: the pantheon's hireable heroes. */
  readonly hireableHeroIds?: readonly HeroDefinitionId[];
  readonly sites: readonly SiteDefinition[];
  readonly objectives: readonly ObjectiveDefinition[];
  readonly hostileHeroes: readonly HostileHeroDefinition[];
  readonly helpTopics: readonly HelpTopicDefinition[];
  /** Campaign-specific: hero defeat/retreat/surrender fails the attempt. */
  readonly protectedHeroFailure: boolean;
  readonly thumbnailAssetId: AssetId;
}

export interface CampaignDefinition {
  readonly id: CampaignId;
  readonly name: string;
  readonly tagline: string;
  readonly summary: string;
  readonly pantheonId: PantheonId;
  /** Starting divine options offered by S05. A single entry is a fixed patron. */
  readonly startingGodOptions: readonly GodId[];
  readonly startingGodNote: string;
  readonly missionIds: readonly MissionId[];
  readonly heroDefinitionId: HeroDefinitionId;
  readonly carryoverPolicy: readonly { readonly category: string; readonly policy: string }[];
  readonly status: 'playable' | 'coming_soon';
  readonly thumbnailAssetId: AssetId;
}

/** Non-campaign scenario (skirmish). */
export interface SkirmishScenarioDefinition {
  readonly id: ScenarioId;
  readonly name: string;
  readonly summary: string;
  /** Default mission (used when no variant is chosen). */
  readonly missionId: MissionId;
  readonly status: 'playable' | 'coming_soon';
  /**
   * Optional pantheon variants of the same map: the setup flow lets the player
   * choose their own pantheon and the rival's and starts the matching mission.
   */
  readonly variants?: readonly SkirmishVariantDefinition[];
}

export interface SkirmishVariantDefinition {
  readonly playerPantheonId: PantheonId;
  readonly rivalPantheonId: PantheonId;
  readonly missionId: MissionId;
}
