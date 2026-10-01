/**
 * Runtime state for one match. Plain serializable data only.
 *
 * MatchState is the single authoritative record of what is happening. It is
 * changed only by the CommandProcessor (engine/processor.ts), which produces a
 * new state with revision + 1 and ordered immutable events.
 *
 * Does not own: content definitions (referenced by ID), UI selections, camera,
 * animation progress or preferences.
 */
import type {
  ArtifactId,
  ArtifactInstanceId,
  BattleId,
  BattleStackId,
  BuildingSlotId,
  CommandId,
  CreatureFamilyId,
  CreatureId,
  DecisionId,
  EntitlementId,
  GodId,
  HeroClassId,
  HeroDefinitionId,
  HeroId,
  MissionId,
  ObjectiveId,
  PantheonId,
  PlayerId,
  ScenarioId,
  SiteId,
  SkillId,
  SpellId,
  StackId,
  TownArchetypeId,
  TownId,
  AssetId,
  CampaignId,
} from '../ids';
import type { BattleCell, Facing, HexCoord } from '../core/hex';
import type { ResourceBundle } from '../core/resources';
import type { VersionBundle } from '../definitions/catalog';
import type { ObjectiveStatus } from '../definitions/campaign';
import type { HeroAttribute } from '../definitions/logic';
import type { ArtifactSlot } from '../definitions/pantheons';
import type { BattlefieldArchetype, StackSpec, WorldMapDefinition } from '../definitions/world';
import type { MissionDefinition, ScenarioFeatures } from '../definitions/campaign';

// ---------------------------------------------------------------------------
// Armies
// ---------------------------------------------------------------------------

/** A persistent stack of one exact creature form. Quantity only; stats come from the definition. */
export interface CreatureStackState {
  stackId: StackId;
  creatureId: CreatureId;
  count: number;
}

/** Seven ordered slots. An army belongs to a hero, a town garrison or a guard. */
export interface ArmyState {
  slots: (CreatureStackState | null)[];
}

export type ArmyRef = { kind: 'hero'; heroId: HeroId } | { kind: 'garrison'; townId: TownId };

// ---------------------------------------------------------------------------
// Players
// ---------------------------------------------------------------------------

export interface PantheonProgressState {
  /** Fixed or chosen starting patron. */
  patronGodId: GodId | null;
  /** Committed minor gods, in commitment order. */
  minorGodIds: GodId[];
}

export interface EntitlementState {
  entitlementId: EntitlementId;
  familyId: CreatureFamilyId;
  assignedTownId: TownId | null;
}

export interface PlayerState {
  id: PlayerId;
  name: string;
  controller: 'human' | 'ai';
  /** scripted_hostile: authored encounter faction without towns or wallet economy (M03). */
  role: 'player' | 'rival' | 'scripted_hostile';
  pantheonId: PantheonId;
  color: string;
  /** The only wallet. Towns never hold copies. */
  wallet: ResourceBundle;
  pantheon: PantheonProgressState;
  entitlements: EntitlementState[];
  eliminated: boolean;
  /** Dawn income percent (skirmish difficulty handicap; 100 = normal). Absent = 100. */
  incomePercent?: number;
  /** World week of the player's last divine intervention (0 or absent = never). */
  interventionWeek?: number;
}

// ---------------------------------------------------------------------------
// Heroes
// ---------------------------------------------------------------------------

export interface ArtifactInstanceState {
  instanceId: ArtifactInstanceId;
  artifactId: ArtifactId;
}

export interface HeroSkillState {
  skillId: SkillId;
  rank: number;
}

export interface HeroAiState {
  profile: 'patrol' | 'strategic';
  waypoints: HexCoord[];
  waypointIndex: number;
  regionMinQ: number;
  regionMaxQ: number;
  attackThreshold: { numerator: number; denominator: number };
  /** Circular region (wandering monsters). */
  regionCenter?: HexCoord;
  regionRadius?: number;
}

export interface HeroState {
  id: HeroId;
  definitionId: HeroDefinitionId;
  name: string;
  ownerId: PlayerId;
  classId: HeroClassId;
  portraitAssetId: AssetId;
  level: number;
  xp: number;
  /** Base attributes including level-up gains; artifacts and gods are applied by the ModifierResolver. */
  attributes: Record<HeroAttribute, number>;
  skills: HeroSkillState[];
  spellbook: boolean;
  knownSpellIds: SpellId[];
  mana: number;
  movementPoints: number;
  position: HexCoord;
  army: ArmyState;
  equipment: Partial<Record<ArtifactSlot, ArtifactInstanceState>>;
  backpack: ArtifactInstanceState[];
  status: 'active' | 'defeated' | 'retreated';
  /** Levels earned but not yet resolved through a level-up decision. */
  pendingLevels: number;
  /** World week of the last Training Academy session (0 = never). */
  lastTrainedWeek: number;
  ai?: HeroAiState;
  /** A wandering monster: no commander in battle; the bounty goes to whoever defeats it. */
  monster?: { bounty: ResourceBundle; creatureId: CreatureId };
}

// ---------------------------------------------------------------------------
// Towns
// ---------------------------------------------------------------------------

export interface TownState {
  id: TownId;
  name: string;
  ownerId: PlayerId | null;
  pantheonId: PantheonId;
  archetypeId: TownArchetypeId;
  siteId: SiteId;
  coord: HexCoord;
  /** Built level per location (0 = empty). Exactly the archetype's 18 locations. */
  buildings: Record<BuildingSlotId, number>;
  /** World day on which the daily build allowance was used (0 = never). */
  buildUsedDay: number;
  /** Shared base/upgraded population per unlocked family. */
  population: Record<CreatureFamilyId, number>;
  covenants: CreatureFamilyId[];
  garrison: ArmyState;
  /** World week of the last Temple offering here (0 = never). */
  lastOfferingWeek: number;
  /** Artifact Merchant stock for `week`; a sold item leaves a null. Absent until a merchant exists. */
  merchant: { week: number; stock: (ArtifactId | null)[] } | null;
}

// ---------------------------------------------------------------------------
// World
// ---------------------------------------------------------------------------

export interface SiteState {
  siteId: SiteId;
  owner: PlayerId | null;
  /** Guard defeated (or none). */
  cleared: boolean;
  /** Pickup/claim consumed. */
  claimed: boolean;
  /** Activation performed (beacon/relay). */
  activated: boolean;
  /** Visited at least once by the active player's hero (watchtower etc.). */
  visitedBy: PlayerId[];
  /** Gate open state (derived from flags but stored so presentation and saves agree). */
  open: boolean;
  /** Remaining guard army after partial outcomes (guards are reset on retreat, so usually full). */
  guard: StackSpec[] | null;
  /** Creature camp: creatures available to recruit now. */
  stock?: number;
  /** Relic: consecutive dawns the current owner has held it. */
  heldDays?: number;
}

export interface WorldState {
  map: WorldMapDefinition;
  sites: Record<SiteId, SiteState>;
  /** The current weekly event (weekly-event scenarios); null on a quiet week or before the first. */
  weeklyEventId?: string | null;
}

/** Per-player fog: 0 unknown, 1 explored (remembered). Current visibility is derived. */
export interface TemporaryRevealState {
  center: HexCoord;
  radius: number;
  /** Vision lasts while `day < untilDay` (until the next dawn). */
  untilDay: number;
}

export interface FogState {
  explored: number[];
  /** Adventure-spell vision (Divine Sight); absent in older saves. */
  temporaryReveals?: TemporaryRevealState[];
}

// ---------------------------------------------------------------------------
// Mission
// ---------------------------------------------------------------------------

export interface ObjectiveState {
  status: ObjectiveStatus;
  completedOnDay: number | null;
  rewardGranted: boolean;
}

export interface MissionState {
  missionId: MissionId;
  campaignId: CampaignId | null;
  objectives: Record<ObjectiveId, ObjectiveState>;
  flags: Record<string, true>;
  counters: Record<string, number>;
  /** Sites whose coordinates the player knows through story reveals (remembered markers). */
  revealedSiteIds: SiteId[];
  /** Story scenes already played, in order (each plays once). */
  scenesPlayed?: string[];
}

/**
 * Outcome from the human players' point of view. `winnerIds` names the
 * winning player(s) when one is known (skirmish), so hot-seat games can show
 * who won.
 */
export type MatchOutcome =
  | { status: 'running' }
  | { status: 'victory'; reason: string; day: number; winnerIds?: PlayerId[] }
  | { status: 'defeat'; reason: string; day: number; winnerIds?: PlayerId[] };

// ---------------------------------------------------------------------------
// Statistics (end-of-game summary and score)
// ---------------------------------------------------------------------------

export interface PlayerDayStats {
  /** Recruitment Gold value of every creature in the player's armies and garrisons. */
  armyValue: number;
  towns: number;
  heroes: number;
  /** Gold-equivalent income per day (Gold + 250 per Wood/Stone + 500 per Crystal/Favor). */
  income: number;
  gold: number;
  /** Mines and other captured sites. */
  sites: number;
}

export interface DayStatsRecord {
  day: number;
  players: Record<PlayerId, PlayerDayStats>;
}

export interface PlayerTotals {
  battlesWon: number;
  battlesLost: number;
  creaturesKilled: number;
  creaturesLost: number;
  buildingsBuilt: number;
  creaturesRecruited: number;
  sitesCaptured: number;
  townsCaptured: number;
}

export interface MatchStats {
  /** One record per world day (taken at dawn, and at the start). */
  timeline: DayStatsRecord[];
  totals: Record<PlayerId, PlayerTotals>;
}

// ---------------------------------------------------------------------------
// Decisions
// ---------------------------------------------------------------------------

export type SkillOffer =
  | { kind: 'upgrade'; skillId: SkillId; fromRank: number; toRank: number }
  | { kind: 'new'; skillId: SkillId; toRank: 1 };

export interface LevelUpDecision {
  decisionId: DecisionId;
  kind: 'level_up';
  heroId: HeroId;
  newLevel: number;
  primaryGain: HeroAttribute;
  offers: SkillOffer[];
}

export type PendingDecision = LevelUpDecision;

// ---------------------------------------------------------------------------
// Battle
// ---------------------------------------------------------------------------

export type BattleSideId = 'attacker' | 'defender';

export interface BattleCommanderSnapshot {
  heroId: HeroId | null;
  name: string;
  portraitAssetId: AssetId;
  attack: number;
  defense: number;
  power: number;
  knowledge: number;
  skills: HeroSkillState[];
  spellbook: boolean;
  knownSpellIds: SpellId[];
  morale: number;
  luck: number;
}

export interface BattleSideState {
  sideId: BattleSideId;
  playerId: PlayerId | null;
  controller: 'human' | 'ai';
  commander: BattleCommanderSnapshot | null;
  /** Mana pool for scripted commanders without a HeroState. Hero mana lives on HeroState. */
  scriptedMana: number;
  castThisRound: boolean;
  familyChargesUsed: Record<CreatureFamilyId, number>;
  /** +1 when every stack at battle start shares one pantheon (design/04 §6). */
  factionMorale: number;
  retreated: boolean;
  surrendered: boolean;
  /** Player-wide effects frozen at battle start (signature + gods); null for ownerless sides. */
  effects: BattleSideEffects | null;
}

/** Snapshot of the battle-relevant player-wide effects of one side. */
export interface BattleSideEffects {
  /** Summed casualty_recovery percent applied if this side wins. */
  recoveryPercent: number;
  /** Summed battle_xp_percent applied to a winning hero's XP. */
  xpPercent: number;
  /** Strongest wounded_fury rule (null when none). */
  fury: { attack: number; numerator: number; denominator: number } | null;
  freeShapeshift: boolean;
  /** Highest army_harmony threshold met by the deployed army (set when both sides are placed). */
  harmony: { families: number; attack: number; defense: number } | null;
  /** Battle spell damage bonus percent (commander skills/artifacts). Absent = 0. */
  spellDamagePercent?: number;
  /** creature_stat filters for this side's creatures. */
  creatureStats: { stat: 'attack' | 'defense' | 'speed'; amount: number; minTier?: number; maxTier?: number; ability?: string }[];
}

export type BattleStatusKind = 'defense_bonus' | 'attack_bonus' | 'max_damage_roll' | 'ranged_mitigation' | 'speed_bonus';

export interface BattleStatusState {
  sourceId: string;
  label: string;
  kind: BattleStatusKind;
  amount: number;
  numerator: number;
  denominator: number;
  /** Expires at the start of this round. */
  expiresAtRound: number;
}

export interface BattleStackState {
  id: BattleStackId;
  side: BattleSideId;
  /** Originating army slot (hero/garrison/guard) for persistent casualty accounting. */
  sourceSlot: number;
  /** Which persistent army the stack came from (sieges mix a visiting hero and the garrison). Default: hero/guard. */
  sourceArmy?: 'hero' | 'garrison';
  creatureId: CreatureId;
  anchor: BattleCell;
  facing: Facing;
  startingCount: number;
  totalHp: number;
  shotsRemaining: number;
  retaliationsUsed: number;
  waited: boolean;
  defending: boolean;
  moraleRolledThisRound: boolean;
  statuses: BattleStatusState[];
  /** Creatures killed by hostile damage (for XP). */
  killedByEnemy: number;
  /** In its alternate Shapeshift aspect. */
  aspect?: boolean;
}

export interface BattleEncounterRef {
  kind: 'site_guard' | 'hero' | 'town_siege';
  siteId: SiteId | null;
  /** Besieged town (town_siege only). */
  townId?: TownId | null;
  defenderHeroId: HeroId | null;
  attackerHeroId: HeroId;
  /** Where the attacking hero ends up if it wins. */
  destination: HexCoord;
  label: string;
}

/** A siege structure (design/04 §8). Structure HP is never reduced by creature damage. */
export interface SiegeStructureState {
  id: string;
  kind: 'wall' | 'gate' | 'tower' | 'keep';
  /** Board cells the intact structure blocks (the keep stands behind the board edge: no cells). */
  cells: BattleCell[];
  hp: number;
  maxHp: number;
}

export interface SiegeState {
  townId: TownId;
  /** 0 no walls (open-field town defense), 1 Fort, 2 Citadel, 3 Castle. */
  level: 0 | 1 | 2 | 3;
  /** Column of the wall line; the defender's side of the town is east of it. */
  wallCol: number;
  structures: SiegeStructureState[];
  /** Moat cells in front of the wall (Citadel and Castle). */
  moat: BattleCell[];
  /** Defender stacks left out of the battle (garrison/visitor reserves). */
  reserves: { source: 'hero' | 'garrison'; slot: number }[];
}

/** Defender stack choice when a visitor plus garrison exceed seven stacks (BAT-14). */
export interface DefenderSelectionState {
  candidates: { source: 'hero' | 'garrison'; slot: number; creatureId: CreatureId; count: number }[];
  max: number;
}

export type BattlePhase = 'selection' | 'deployment' | 'normal' | 'waiting';

export interface BattleState {
  battleId: BattleId;
  encounter: BattleEncounterRef;
  archetype: BattlefieldArchetype;
  cols: number;
  rows: number;
  obstacles: BattleCell[];
  sides: Record<BattleSideId, BattleSideState>;
  stacks: Record<BattleStackId, BattleStackState>;
  round: number;
  phase: BattlePhase;
  /** Human sides still arranging their deployment zone (Tactics) before round 1. */
  deployment?: { pending: BattleSideId[]; columns: Record<BattleSideId, number> } | null;
  /** Human town defender choosing which stacks fight. */
  selection?: DefenderSelectionState | null;
  siege?: SiegeState | null;
  normalQueue: BattleStackId[];
  waitQueue: BattleStackId[];
  activeStackId: BattleStackId | null;
  /** The current activation is an extra morale activation (cannot wait, no further morale). */
  activeIsBonus: boolean;
  /** A free Shapeshift was already used in the current activation. */
  freeShiftUsed?: boolean;
  status: 'active' | 'ended';
  /** Encounter-specific seed label for the tactical layout stream (not the combat stream). */
  layoutSeed: number;
}

export interface BattleCasualtyLine {
  creatureId: CreatureId;
  before: number;
  after: number;
  /** Creatures returned after the battle by casualty recovery (included in `after`). */
  recovered?: number;
}

export interface BattleResultRecord {
  battleId: BattleId;
  label: string;
  winner: BattleSideId;
  outcome: 'victory' | 'defeat' | 'retreat' | 'surrender' | 'stalemate';
  playerSide: BattleSideId | null;
  attacker: { name: string; playerId: PlayerId | null; lines: BattleCasualtyLine[] };
  defender: { name: string; playerId: PlayerId | null; lines: BattleCasualtyLine[] };
  xpAwarded: { heroId: HeroId; amount: number; capped: boolean }[];
  rewards: { resources: ResourceBundle; artifactIds: ArtifactId[]; entitlementIds: EntitlementId[] };
  objectivesAdvanced: ObjectiveId[];
  levelUpsQueued: number;
  heroOutcome: string;
  day: number;
  rounds: number;
}

// ---------------------------------------------------------------------------
// Match
// ---------------------------------------------------------------------------

export interface ScenarioRuntimeInfo {
  scenarioId: ScenarioId;
  missionId: MissionId;
  campaignId: CampaignId | null;
  name: string;
  heroHiringEnabled: boolean;
  heroHiringDisabledReason: string | null;
  /** Buildings allowed in this scenario; null = no allowlist. */
  purchasableBuildingIds: string[] | null;
  /** Gods that may be committed to in this scenario; null = no allowlist. */
  committableGodIds: string[] | null;
  /** Pantheon signature mechanics apply in this scenario. */
  signatureMechanics: boolean;
  /** Skirmish difficulty (null or absent: authored balance, e.g. the campaign). */
  difficultyId?: string | null;
  /** Optional features enabled for this scenario (absent: none). */
  features?: ScenarioFeatures;
  xpCap: number | null;
  protectedHeroIds: HeroId[];
}

export interface MatchState {
  kind: 'match';
  matchId: string;
  revision: number;
  versions: VersionBundle;
  scenario: ScenarioRuntimeInfo;
  /**
   * Generated scenarios (random skirmish maps) embed their full definition here;
   * authored scenarios leave it absent and are read from the content catalog.
   */
  customMission?: MissionDefinition | null;
  day: number;
  activePlayerId: PlayerId;
  playerOrder: PlayerId[];
  players: Record<PlayerId, PlayerState>;
  heroes: Record<HeroId, HeroState>;
  towns: Record<TownId, TownState>;
  world: WorldState;
  fog: Record<PlayerId, FogState>;
  mission: MissionState;
  battle: BattleState | null;
  pendingDecisions: PendingDecision[];
  lastBattleResult: BattleResultRecord | null;
  /** Recently processed command IDs (duplicate protection). */
  processedCommandIds: CommandId[];
  /** Idempotency keys for rewards, dawn payouts and one-time grants. */
  appliedKeys: string[];
  rng: { combat: number; progression: number; layout: number };
  serial: number;
  outcome: MatchOutcome;
  /** Day-by-day statistics for the end-of-game summary (absent in older states). */
  stats?: MatchStats;
}

export const ARMY_SLOT_COUNT = 7;
