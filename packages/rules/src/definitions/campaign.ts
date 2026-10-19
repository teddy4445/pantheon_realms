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
import type { HexCoord } from '../core/hex';
import type { NavalTraversalPolicy } from './navalPolicy';
import type { HeroAttribute, RewardDefinition } from './logic';
import type { HostileHeroDefinition, MapTemplateDefinition, SiteDefinition, StackSpec } from './world';

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
  /** The mission player is committed to at least `count` minor gods (default 1). */
  | { readonly type: 'player_has_minor_god'; readonly count?: number }
  | {
      readonly type: 'hero_army_contains';
      readonly heroId: HeroId;
      readonly creatureId: CreatureId;
      readonly count: number;
    }
  /**
   * A non-player hero of this definition (a hostile commander, a wandering
   * monster band or a rival hero) has been defeated or driven off.
   */
  | { readonly type: 'hero_defeated'; readonly heroDefinitionId: HeroDefinitionId }
  /** The mission player owns this town (e.g. a rival's town taken by siege). */
  | { readonly type: 'town_owned'; readonly townId: TownId }
  | { readonly type: 'town_building'; readonly townId: TownId; readonly slotId: string; readonly level: number }
  | { readonly type: 'site_owned'; readonly siteId: SiteId }
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
  /**
   * Steps that must all be completed before this one opens (it starts locked).
   * Work done early still counts: when the step opens and its condition already
   * holds, it completes at once (owner decision 2026-10-01: missions are played
   * in order, but nothing the player achieved ahead of time is lost).
   */
  readonly requires?: readonly ObjectiveId[];
  /** Granted once on completion (e.g. claimed covenant). */
  readonly reward?: RewardDefinition;
  readonly markerSiteId?: SiteId;
  /** Tracks a live condition (e.g. army contents) that can be lost again. */
  readonly live?: boolean;
  /** Help text shown in the journal. */
  readonly hint?: string;
  /**
   * Completing this objective wins the mission (as an activation site's
   * `completesMission` does), e.g. a mission played entirely in town.
   */
  readonly completesMission?: boolean;
}

export interface MissionTownSetup {
  /** Cosmetic war ruins remain until the hall reaches level two. */
  readonly warDamaged?: boolean;
  readonly townId: TownId;
  readonly siteId: SiteId;
  readonly name: string;
  readonly archetypeId: TownArchetypeId;
  readonly buildings: readonly BuildingId[];
  readonly population: Readonly<Record<CreatureFamilyId, number>>;
  readonly covenants: readonly CreatureFamilyId[];
  /** Starting garrison (default none), e.g. a rival's hall guard. */
  readonly garrison?: readonly StackSpec[];
}

/** A ship placed by a scenario (`MissionDefinition.ships`): always empty at the start. */
export interface MissionShipSetup {
  /** Stable ship ID (unique within the mission). */
  readonly shipId: string;
  /** A water tile of the map. */
  readonly coord: HexCoord;
  /** The owning player, or absent/null for a neutral ship any hero may claim by embarking. */
  readonly ownerId?: PlayerId | null;
  /** Heading: index into AXIAL_DIRECTIONS (default 0, east). */
  readonly facing?: number;
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
  /** Who controls this seat by default (generated hot-seat games may seat humans). Default 'ai'. */
  readonly controller?: 'human' | 'ai';
  readonly pantheonId: PantheonId;
  readonly color: string;
  readonly wallet: ResourceCost;
  readonly town: MissionTownSetup;
  readonly hero: MissionHeroSetup;
}

/** Optional scenario features (all off unless a scenario enables them). */
export interface ScenarioFeatures {
  /** Pantheon skills and spells, artifact sets and other 'expanded' content. */
  readonly expandedContent: boolean;
  /** A random weekly event starts every new week. */
  readonly weeklyEvents: boolean;
  /** Players may spend Favor on divine interventions (once per week). */
  readonly interventions: boolean;
  /** Hero specialties apply (proposed 2026-10-02; absent = off, so older saves keep their rules). */
  readonly heroSpecialties?: boolean;
  /** Much weaker neutral guards and wandering monsters join or flee instead of fighting (proposed 2026-10-02). */
  readonly neutralReactions?: boolean;
  /** The map's climate changes battles a little, for both sides alike (proposed 2026-10-04; absent = off). */
  readonly climateRules?: boolean;
  /** AI rivals play by their pantheon's temperament (proposed 2026-10-04; absent = off). */
  readonly aiTemperaments?: boolean;
  /**
   * City dedications (app 1.5.0, `cityDedicationsV1`): a town with Temple II honors its owner's patron or a
   * committed minor god for local weekly gifts, growth and a service; the gods' direct `daily_income` and
   * `weekly_growth_bonus` benefits are then replaced by these profiles. Absent = off (older saves keep the old
   * god economics); set by the scenario factories for new games, explicitly false for The Three Beacons.
   */
  readonly cityDedicationsV1?: boolean;
  /**
   * Expedition kit (app 1.6.0, docs/expedition-v1/): stateful features, each absent = off (older saves keep
   * the legacy behaviour; never switched on after a load). Set by the scenario factories for new games:
   *  - `scoutingIntelV1`: enemy armies are reported by observation stage (sighting / identified / scouted),
   *    with per-player last-known snapshots;
   *  - `targetableCatapultV1`: a siege's attacker has a stationary, killable catapult in the upper left that
   *    fires once per round at an aimed structure (Fire / Skip) instead of the automatic round-start shot;
   *  - `recruitmentCaravansV1`: recruits bought in one owned town travel by land to another (skirmish maps);
   *  - `navalMovementV1`: hero ships, embarking, sailing and ship-to-ship boarding battles (skirmish maps).
   * Campaign runs get scouting intel and the catapult (not The Three Beacons); caravans and ships stay off in
   * authored campaign chapters, whose routes and pacing are designed for land travel.
   */
  readonly scoutingIntelV1?: boolean;
  readonly targetableCatapultV1?: boolean;
  readonly recruitmentCaravansV1?: boolean;
  readonly navalMovementV1?: boolean;
  /**
   * Sea encounters (sea-creature delivery 2026-10-17): neutral sea-monster stacks on water, fought by a
   * hero's ship on the single-ship sea encounter board (`single_ship_sea_encounter_v2`). Absent = off:
   * older saves and existing campaigns keep their behaviour (never switched on after a load). Set with
   * `navalMovementV1` for new editor/custom maps, authored skirmish maps and naval random maps (the land
   * random templates place no sea monster, so they keep their legacy features and seeds); a campaign
   * enables it explicitly in its mission data.
   */
  readonly seaEncountersV1?: boolean;
  /** Mythic Library II. Absent stays off, including loaded expanded-content saves. */
  readonly mythicLibraryV2?: boolean;
}

export const NO_SCENARIO_FEATURES: ScenarioFeatures = { expandedContent: false, weeklyEvents: false, interventions: false };

export type VictoryConditionDefinition =
  /** Last empire standing (every rival hero defeated and town taken). */
  | { readonly type: 'elimination' }
  /** Own the relic site at `days` consecutive dawns (or eliminate everyone else). */
  | { readonly type: 'hold_site'; readonly siteId: SiteId; readonly days: number };

/** What starts a story scene (evaluated by the rules after every command, played once). */
export type StoryTriggerDefinition =
  | { readonly type: 'objective_completed'; readonly objectiveId: ObjectiveId }
  | { readonly type: 'site_visited'; readonly siteId: SiteId }
  | { readonly type: 'site_cleared'; readonly siteId: SiteId }
  /** A battle against this site's guard (or the named hostile hero) begins. */
  | { readonly type: 'battle_started'; readonly siteId?: SiteId; readonly heroDefinitionId?: HeroDefinitionId }
  /** The mission player fought a battle (won or lost) in which it lost at least `minLost` creatures. */
  | { readonly type: 'casualties'; readonly minLost: number }
  /** The mission player is committed to this god (patron or minor). */
  | { readonly type: 'god_committed'; readonly godId: GodId }
  | { readonly type: 'flag'; readonly flag: string }
  | { readonly type: 'day_at_least'; readonly day: number };

export interface StorySceneDefinition {
  readonly id: string;
  readonly trigger: StoryTriggerDefinition;
  readonly lines: readonly DialogueLine[];
  /** Plays only when every one of these flags is set (campaign facts are `fact:<id>` flags). */
  readonly ifFlags?: readonly string[];
  /** Plays only when none of these flags is set (order-aware dialogue for chapters played in either order). */
  readonly unlessFlags?: readonly string[];
}

// ---------------------------------------------------------------------------
// Campaign content version 2 (campaign expansion handoff, 2026-10-15)
// ---------------------------------------------------------------------------

/**
 * An authored region map (content v2): the terrain of every cell and the roads,
 * written by the campaign's region builder from the mission card — no generated
 * corridor template. Fixed for the mission, except where a sluice changes its
 * channel cells.
 */
export interface AuthoredMapDefinition {
  readonly desertCells?: readonly number[];
  readonly id: string;
  readonly version: number;
  readonly width: number;
  readonly height: number;
  /** One string of terrain codes per row (see TERRAIN_CODES). */
  readonly rows: readonly string[];
  /** Sorted undirected road edge keys (hex.edgeKey). */
  readonly roads: readonly string[];
  readonly biome: MapTemplateDefinition['biome'];
  /** Seed for the decoration stream (presentation only). */
  readonly seed: number;
}

/**
 * An announced mission deadline. It starts only when `startWhen` first holds (the
 * day is saved), shows its deadline from then on, and is met when `metWhen` holds
 * first. When it runs out it sets `onExpire.flags` and fails `onExpire.failObjectives`
 * — optional objectives only: a timer never fails a mission or deletes essential evidence.
 */
export interface MissionTimerDefinition {
  readonly id: string;
  readonly label: string;
  /** What starts the clock (announced in the journal before it starts, when `announce` is set). */
  readonly startWhen: ObjectiveCondition;
  readonly days: number;
  readonly metWhen: ObjectiveCondition;
  /** Known consequence of missing it (shown with the deadline). */
  readonly consequence: string;
  /** Inclusive scheduled arrival; old deadlines remain end-of-day by default. */
  readonly expiresOnDeadline?: boolean;
  /** A continuous hold: loss of control restarts this clock, without spawning further waves. */
  readonly holdWhile?: ObjectiveCondition;
  readonly announce?: string;
  readonly onExpire: { readonly flags?: readonly string[]; readonly failObjectives?: readonly ObjectiveId[] };
}

/** A piece of evidence or a remembered decision, shown in the journal's ledger once its flag is set. */
export interface EvidenceDefinition {
  readonly id: string;
  readonly flag: string;
  readonly title: string;
  readonly text: string;
  /** Ledger icon: evidence, pact, supply or evacuation. */
  readonly icon: 'evidence' | 'pact' | 'supply' | 'evacuation' | 'branch';
}

/** A bounded benefit at a chapter's start, granted when an earlier choice left this campaign fact. */
export interface EntryBonusDefinition {
  readonly fact: string;
  readonly label: string;
  readonly wallet?: ResourceCost;
  readonly heroArmy?: readonly StackSpec[];
  readonly garrison?: readonly StackSpec[];
  readonly flags?: readonly string[];
}

/** One chapter node of a content-v2 campaign: playable once every listed chapter is complete. */
export interface CampaignChapterDefinition {
  readonly missionId: MissionId;
  /** Local chapter number (1-based). */
  readonly chapter: number;
  /** Every listed chapter must be complete (an order choice, never exclusive branches). */
  readonly requiresAll: readonly MissionId[];
  /** The legacy (content v1) missions whose story beats this chapter carries. */
  readonly legacyMissionIds: readonly MissionId[];
  /** Mission paintings: the first is the cover, the rest are event illustrations. */
  readonly briefingArt: readonly AssetId[];
}

export interface HelpTopicDefinition {
  readonly id: string;
  readonly title: string;
  readonly text: string;
}

export interface MissionDefinition {
  readonly coalitionPlayerIds?: readonly PlayerId[];
  readonly restoreRegions?: readonly string[];
  readonly id: MissionId;
  readonly scenarioId: ScenarioId;
  readonly campaignId: CampaignId | null;
  readonly order: number;
  readonly name: string;
  readonly subtitle: string;
  readonly summary: string;
  readonly mapTemplateId: MapTemplateId;
  /**
   * Presentation only: the music and ambience set that plays on this mission's
   * map (sound manifest IDs `music.explore.<soundscape>` and `amb.<soundscape>`).
   * Never read by the rules.
   */
  readonly soundscape?: string;
  readonly targetPlaytime: string;
  readonly newDecisions: readonly string[];
  /** Cumulative XP cap applied at the end of the mission (campaign/01 §4). */
  readonly xpCap: number | null;
  readonly xpCapLevel: number | null;
  readonly briefing: readonly DialogueLine[];
  readonly victory: readonly DialogueLine[];
  /** Scenes played once during the mission when their trigger fires (proposed this build). */
  readonly storyScenes?: readonly StorySceneDefinition[];
  /** Skirmish victory condition (default: elimination). */
  readonly victoryCondition?: VictoryConditionDefinition;
  /** Optional features (default: all off). */
  readonly features?: Partial<ScenarioFeatures>;
  /** Every player starts with the whole map explored (random-map "revealed" option); heroes stay hidden by vision. */
  readonly startExplored?: boolean;
  /**
   * 'rotating' (proposed 2026-10-02): at each dawn the empire that moved first
   * moves last, so no seat always opens the day. Random maps with three or more
   * empires use it by default. Default 'fixed'.
   */
  readonly turnOrder?: 'fixed' | 'rotating';
  readonly debriefPolicy: readonly string[];
  readonly player: {
    readonly playerId: PlayerId;
    readonly name: string;
    /** Who controls the player seat (default human; generated maps may seat the AI). */
    readonly controller?: 'human' | 'ai';
    readonly pantheonId: PantheonId;
    readonly wallet: ResourceCost;
    readonly town: MissionTownSetup;
    readonly hero: MissionHeroSetup;
  };
  readonly hostilePlayer?: { readonly playerId: PlayerId; readonly name: string };
  /** Skirmish rivals: full AI empires using the same rules (proposed-this-build). */
  readonly rivals?: readonly MissionRivalSetup[];
  /**
   * Towns that start without an owner or a hero (owner request 2026-10-07): any
   * empire may take one — by walking in, or by siege when a neutral garrison
   * holds it — and then builds and recruits there like in its own town. The
   * archetype decides the town's pantheon, so it may match its taker's or not.
   */
  readonly neutralTowns?: readonly MissionTownSetup[];
  /**
   * Empty ships the scenario places on water (custom and editor maps; scenario feature
   * `navalMovementV1`, expedition kit): neutral, or owned by one of the mission's players.
   * Ignored (never created) when the scenario turns ships off; absent = none.
   */
  readonly ships?: readonly MissionShipSetup[];
  /**
   * Naval-only inter-island travel (naval random templates, 2026-10-17; definitions/navalPolicy.ts):
   * ships are the only first access between islands and portals stay off. Absent = no such rule.
   */
  readonly navalPolicy?: NavalTraversalPolicy;
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
  // --- Content v2 (campaign expansion, 2026-10-15); absent on v1 missions ---
  /** Campaign content version of this mission (absent = 1). */
  readonly contentVersion?: 2;
  /** The authored region map (replaces `mapTemplateId` generation when present). */
  readonly map?: AuthoredMapDefinition;
  readonly timers?: readonly MissionTimerDefinition[];
  readonly evidence?: readonly EvidenceDefinition[];
  /** Mission flags kept as campaign facts on completion (evidence found, choices made). */
  readonly carriedFlags?: readonly string[];
  /** Extra briefing lines by campaign facts (`fact:<flag>`), for chapters played in either order. */
  readonly briefingVariants?: readonly { readonly ifFlags?: readonly string[]; readonly unlessFlags?: readonly string[]; readonly lines: readonly DialogueLine[] }[];
  readonly entryBonuses?: readonly EntryBonusDefinition[];
  /** Loss rules in plain words for the introduction (e.g. "Alexios must survive"). */
  readonly lossConditions?: readonly string[];
  /** Mission paintings (cover first). */
  readonly briefingArt?: readonly AssetId[];
  /** The chapter's principal objective (its known task; reachable two independent ways). */
  readonly principalObjectiveId?: ObjectiveId;
  /** Regional campaigns freeze this region on completion; ordinary campaigns omit it. */
  readonly regionalState?: { readonly worldId: string; readonly regionId: string; readonly defaultPatronGodId?: GodId };
}

export interface CampaignDefinition {
  /** Shared-world campaign: each protagonist retains its own carryover and frozen region. */
  readonly regionalWorldId?: string;
  readonly id: CampaignId;
  readonly name: string;
  readonly tagline: string;
  readonly summary: string;
  /** Content v2: the campaign's summary as a new run plays it (its chapters); `summary` stays the v1 text. */
  readonly summaryV2?: string;
  readonly pantheonId: PantheonId;
  /** Starting divine options offered by S05. A single entry is a fixed patron. */
  readonly startingGodOptions: readonly GodId[];
  readonly startingGodNote: string;
  readonly missionIds: readonly MissionId[];
  readonly heroDefinitionId: HeroDefinitionId;
  readonly carryoverPolicy: readonly { readonly category: string; readonly policy: string }[];
  readonly status: 'playable' | 'coming_soon';
  readonly thumbnailAssetId: AssetId;
  /** Closing scene after the final mission's debrief. */
  readonly epilogue?: readonly DialogueLine[];
  /**
   * Content v2 chapter graph (campaign expansion, 2026-10-15). When present, new runs
   * play these chapters (`contentVersion` 2); `missionIds` stays the legacy (v1) order
   * so older saves keep their own definitions.
   */
  readonly chapters?: readonly CampaignChapterDefinition[];
  /** The v2 chapters' final chapter (the campaign is complete when it is). */
  readonly finalChapterId?: MissionId;
  /**
   * Content v2 closing scene: common lines, then the variant of the final choice made
   * (first whose flag is set), over `art` — an existing campaign painting that does not
   * imply an outcome the choices no longer support (never a v1 ending picture).
   */
  readonly epilogueV2?: { readonly lines: readonly DialogueLine[]; readonly variants?: readonly { readonly flag: string; readonly lines: readonly DialogueLine[] }[]; readonly art: AssetId };
  /**
   * Extra closing lines chosen by a flag of the final mission (e.g. the last
   * choice in The Winter Oath). The first variant whose flag is set is played
   * after `epilogue`; story only, never a rule.
   */
  readonly epilogueVariants?: readonly { readonly flag: string; readonly lines: readonly DialogueLine[] }[];
}

/**
 * A mission's briefing for the facts in hand (content v2): its own lines, then each
 * variant whose `ifFlags` are all set and whose `unlessFlags` are all unset — so a
 * chapter played in either order never names an investigation not yet made.
 */
export function missionBriefingLines(mission: Pick<MissionDefinition, 'briefing' | 'briefingVariants'>, flags: Readonly<Record<string, boolean | undefined>>): readonly DialogueLine[] {
  const extra = (mission.briefingVariants ?? []).filter((v) => (v.ifFlags ?? []).every((f) => flags[f]) && !(v.unlessFlags ?? []).some((f) => flags[f]));
  return [...mission.briefing, ...extra.flatMap((v) => v.lines)];
}

/** A content-v2 campaign's closing lines for the final chapter's flags (common lines, then the chosen variant). */
export function campaignEpilogueV2Lines(camp: CampaignDefinition, flags: Readonly<Record<string, boolean | undefined>>): readonly DialogueLine[] {
  const e = camp.epilogueV2;
  if (!e) return [];
  const variant = e.variants?.find((v) => flags[v.flag]);
  return [...e.lines, ...(variant?.lines ?? [])];
}

/** The campaign's closing lines for the final mission's flags (common lines, then the matching variant). */
export function campaignEpilogueLines(camp: CampaignDefinition, flags: Readonly<Record<string, boolean | undefined>>): readonly DialogueLine[] {
  const variant = camp.epilogueVariants?.find((v) => flags[v.flag]);
  return [...(camp.epilogue ?? []), ...(variant?.lines ?? [])];
}

/** Non-campaign scenario (skirmish). */
export interface SkirmishScenarioDefinition {
  readonly id: ScenarioId;
  readonly name: string;
  readonly summary: string;
  /** One line under the name, as the authored skirmish maps have (owner request 2026-10-07: one style for the whole list). */
  readonly tagline?: string;
  /** What makes the scenario different, one short sentence each. */
  readonly highlights?: readonly string[];
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
