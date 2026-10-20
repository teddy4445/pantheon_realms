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
  ShipId,
} from '../ids';
import type { BattleCell, Facing, HexCoord } from '../core/hex';
import type { ResourceBundle } from '../core/resources';
import type { VersionBundle } from '../definitions/catalog';
import type { ObjectiveStatus } from '../definitions/campaign';
import type { HeroAttribute } from '../definitions/logic';
import type { EquipSlot } from '../definitions/pantheons';
import type { BattlefieldArchetype, StackSpec, WorldMapDefinition } from '../definitions/world';
import type { MissionDefinition, ScenarioFeatures } from '../definitions/campaign';
import type { SeaWatchState, WreckSiteState } from '../definitions/seaSites';
import type { BoardOccupancyPolicy, SeaEncounterBoardRules } from '../definitions/seaEncounter';

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

export interface CourierParcel {
  artifact: ArtifactInstanceState;
  senderId: HeroId;
  recipientId: HeroId;
  destinationTownId: TownId;
  sentDay: number;
  arrivesDay: number;
  status: 'in_transit' | 'stash';
  stashTownId?: TownId;
}
export interface PlayerState {
  libraryEconomy?: { recruitPurchaseDay?: number; seedTown?: { townId: TownId; heroId: HeroId }; seedPaidWeek?: number; parcel?: CourierParcel; courierHistory?: { day: number; artifactId: ArtifactId; message: string }[] };
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
  /** World week of the player's last hero hire at a Tavern (one a week; owner request 2026-10-07). Absent = never. */
  heroHireWeek?: number;
  /** Key colours this player holds from key tents (random maps; absent = none). */
  keys?: string[];
  /** Towns this player lost and has not retaken, with the day of the loss (public; 2026-10-07). */
  lostTowns?: { townId: TownId; day: number }[];
}

// ---------------------------------------------------------------------------
// Heroes
// ---------------------------------------------------------------------------

export interface ArtifactInstanceState {
  /** Quest-bound instances cannot be mailed, sold or transferred through courier escrow. */
  questBound?: boolean;
  instanceId: ArtifactInstanceId;
  artifactId: ArtifactId;
}

export interface HeroSkillState {
  skillId: SkillId;
  rank: number;
}

export interface HeroAiState {
  assaultSiteIds?: SiteId[];
  profile: 'patrol' | 'strategic';
  waypoints: HexCoord[];
  waypointIndex: number;
  regionMinQ: number;
  regionMaxQ: number;
  attackThreshold: { numerator: number; denominator: number };
  /** Circular region (wandering monsters). */
  regionCenter?: HexCoord;
  regionRadius?: number;
  /** Campaign v2: the patrol's home camp; taking it makes the patrol withdraw. */
  homeSiteId?: SiteId;
  /** Campaign v2: the force waits where it stands until this mission flag is set (an announced counterattack). */
  dormantUntilFlag?: string;
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
  /** Mythic Library counters belong to the hero, never to a transferable item. */
  libraryAdventure?: {
    movementLedger?: { day: number; uses: Record<string, number>; saved: Record<string, number>; triggers: Record<string, boolean> };
    travelBuffs?: { spellId: SpellId; day: number; discount: import('../definitions/logic').AdventureStepDiscount; townId?: TownId }[];
    townVisitWeeks?: Record<TownId, number>;
    lastMovedDay?: number;
    lastBattleDay?: number;
    casts?: { day: number; count: number };
    learnedManaDay?: number;
    camp?: { day: number; mana: number; battleSinceCast: boolean };
    usedDays?: Record<string, number>;
    anchor?: { coord: HexCoord; untilDay: number };
    compact?: { siteId: SiteId; day: number; percent: number; cap: number };
    reports?: { spellId: SpellId; day: number; untilDay: number; entries: { coord: HexCoord; label: string; detail: string }[] }[];
    safeLanding?: { untilDay: number; percent: number; ownerId: PlayerId };
  };
  position: HexCoord;
  army: ArmyState;
  equipment: Partial<Record<EquipSlot, ArtifactInstanceState>>;
  backpack: ArtifactInstanceState[];
  status: 'active' | 'defeated' | 'retreated';
  /** Levels earned but not yet resolved through a level-up decision. */
  pendingLevels: number;
  /** Gods' gifts this hero took at levels 10 and 15 (`catalog.godPerks` IDs; absent = none). */
  perks?: string[];
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
  /** Cosmetic aftermath art; repairs follow normal hall construction. */
  warDamaged?: boolean;
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
  /** World week of the last divine gift received here (absent or 0 = never). */
  lastGiftWeek?: number;
  /** Artifact Merchant stock for `week`; a sold item leaves a null. Absent until a merchant exists. */
  merchant: { week: number; stock: (ArtifactId | null)[] } | null;
  /** Workshop stock for `week` (same shape; absent in saves from before 2026-10-04). */
  workshop?: { week: number; stock: (ArtifactId | null)[] } | null;
  /** City dedication (app 1.5.0, scenario feature `cityDedicationsV1`; absent until first used). */
  dedication?: TownDedicationState;
}

/**
 * A town's city dedication. The owner-specific contents (active god, pending switch,
 * growth credits) are cleared on every ownership change; `lastProcessedWeek` — the
 * world week whose boundary this town's dedication last processed (paid or not) — is
 * kept forever, so no week is ever processed twice (capture, recapture, save/load).
 */
export interface TownDedicationState {
  /** The honored god (null: none, or cleared by a capture). */
  activeGodId: GodId | null;
  /** The player the active dedication belongs to. */
  ownerId: PlayerId | null;
  /** A paid switch, activated at the boundary of `activationWeek` (or a later one while invalid) — only for `requestedBy`. */
  pending?: { godId: GodId; requestedBy: PlayerId; activationWeek: number };
  /** Quarter-creature remainders per favored family (0–3), kept per town. */
  growthCredits: Record<CreatureFamilyId, number>;
  /** World week of the last processed weekly boundary (0 = never). Never reset. */
  lastProcessedWeek: number;
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
  visitedHeroIds?: HeroId[];
  reservation?: { heroId: HeroId; ownerId: PlayerId; quantity: number; untilDay: number };
  /** Gate open state (derived from flags but stored so presentation and saves agree). */
  open: boolean;
  /** Remaining guard army after partial outcomes (guards are reset on retreat, so usually full). */
  guard: StackSpec[] | null;
  /** Creature camp: creatures available to recruit now. */
  stock?: number;
  /** Relic: consecutive dawns the current owner has held it. */
  heldDays?: number;
  /** Heroes that already used a once-per-hero site (learning stone, spell shrine, skill trainer). */
  usedBy?: HeroId[];
  /** Windmill: world week of the last collection (0 or absent = never). */
  lastCollectedWeek?: number;
  /** Player whose hero cleared the guard (battle, or neutrals that joined or fled). */
  clearedBy?: PlayerId;
  /** One-time map event: the option index chosen (absent before it is decided, and in saves from before 2026-10-15). */
  chosenOption?: number;
  /**
   * Neutral hiring site (owner decision 2026-10-16): creatures trained into the upgrade
   * here in world week `trainedWeek`, by every empire together. A count from an earlier
   * week counts as none (the allowance renews each week); both are absent before the
   * first training and in saves from before the training allowance.
   */
  trainedThisWeek?: number;
  trainedWeek?: number;
  /** A shipwreck's expedition state (sea-sites kit; absent until first touched = untouched). */
  wreck?: WreckSiteState;
}

export interface WorldState {
  /** Non-blocking magical signals. They never grant vision or become armies. */
  signals?: { id: string; ownerId: PlayerId; coord: HexCoord; untilDay: number; identifiedBy: PlayerId[] }[];
  map: WorldMapDefinition;
  sites: Record<SiteId, SiteState>;
  /** The current weekly event (weekly-event scenarios); null on a quiet week or before the first. */
  weeklyEventId?: string | null;
  /** Hero ships by ID (scenario feature `navalMovementV1`; absent in older saves and with the feature off = no ships). */
  ships?: Record<ShipId, ShipState>;
}

/**
 * A ship's state. `wrecked` is never stored by the v1 rules: a hull lost in a boarding battle is
 * removed at once (the `ShipWrecked` event drives the sinking playback).
 */
export type ShipStatus = 'empty' | 'occupied' | 'in_battle' | 'wrecked';

/**
 * A hero ship (expedition kit §07, design/naval-policy.json `saveFields`): one hull carries one
 * hero and the hero's normal army. A hero is either on land or aboard exactly one ship; aboard,
 * the hero's `position` is the ship's `coord` (a water tile). Changed only by the rules
 * (systems/naval.ts).
 */
export interface ShipState {
  mooring?: { untilDay: number; heroId: HeroId; ownerId: PlayerId };
  shipId: ShipId;
  /** Owner (null: neutral; claimed by the first hero who embarks). An empty hull keeps its owner. */
  ownerId: PlayerId | null;
  coord: HexCoord;
  heroId: HeroId | null;
  state: ShipStatus;
  /** Heading: index into AXIAL_DIRECTIONS (0 east, 1 north-east, 2 north-west, 3 west, 4 south-west, 5 south-east). */
  facing: number;
  /** World day of the ship's last launch, boarding, sailing or battle (0 = never). */
  lastActionTurn: number;
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

/**
 * Scouting intel (scenario feature `scoutingIntelV1`): one player's last observation of an
 * enemy hero or wandering monster — only the fields its stage permitted (policy
 * `snapshotFields`). Written by the rules after a command, from current vision only; never
 * updated remotely (outside vision it is LAST KNOWN with its date). Removed when its tile is
 * in view again with nothing there, or when an event the player took part in settles the
 * army's fate (a battle it fought, neutrals that joined or fled).
 */
export interface IntelSnapshot {
  targetId: HeroId;
  lastSeenCoord: HexCoord;
  observedDay: number;
  stage: 'sighting' | 'identified' | 'scouted';
  /** The owner its banner showed. */
  knownOwner: PlayerId | null;
  /** Index into the policy's strength bands. */
  strengthBand: number;
  /** Identified or scouted: the creature types seen (grouped by creature ID). */
  permittedCreatureTypes?: CreatureId[];
  /** Scouted: the quantity range of each type, in the same order. */
  permittedCountRanges?: { min: number; max: number | null }[];
  /**
   * The latest observation more detailed than this one (e.g. a scout report before a later
   * distant sighting): kept apart, dated, and never shown as a current estimate.
   */
  earlier?: IntelEarlierReport;
}

export interface IntelEarlierReport {
  lastSeenCoord: HexCoord;
  observedDay: number;
  stage: 'identified' | 'scouted';
  knownOwner: PlayerId | null;
  strengthBand: number;
  permittedCreatureTypes: CreatureId[];
  permittedCountRanges?: { min: number; max: number | null }[];
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
  /** Announced deadlines (campaign v2): when each started and ends (absent on older saves). */
  timers?: Record<string, MissionTimerState>;
}

/** A mission timer's saved state: the trigger day is kept, so the deadline survives saves. */
export interface MissionTimerState {
  status: 'waiting' | 'running' | 'met' | 'expired';
  startedDay?: number;
  deadlineDay?: number;
  resolvedDay?: number;
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
  /** At levels 10 and 15: two gods' gifts to choose between (`catalog.godPerks` IDs; absent otherwise). */
  perkOffers?: string[];
}

export type PendingDecision = LevelUpDecision;

// ---------------------------------------------------------------------------
// Battle
// ---------------------------------------------------------------------------

export type BattleSideId = 'attacker' | 'defender';

export interface BattleCommanderSnapshot {
  /** The commander's Defense excluding equipment, for bounded defense-piercing effects. */
  defenseWithoutArtifacts?: number;
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
  armyBarrier?: number;
  markedUndeadId?: BattleStackId;
  spellCredit?: { amount: number; expiresAtRound: number };
  actedInBattle?: boolean;
  /** Saved shared effect quotas; original army slots survive deployment splits/merges. */
  effectUses?: Record<string, number>;
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
  library?: readonly import('../definitions/logic').LibraryPassiveEffect[];
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
  creatureStats: { stat: 'attack' | 'defense' | 'speed'; amount: number; minTier?: number; maxTier?: number; ability?: string; familyId?: string }[];
  /** Extra Spell Power per spell for this side's commander (hero spell specialties). Absent = none. */
  spellPowerBonus?: Record<string, number>;
}

export type BattleStatusKind =
  | 'defense_bonus'
  | 'attack_bonus'
  | 'max_damage_roll'
  | 'ranged_mitigation'
  | 'speed_bonus'
  | 'melee_mitigation'
  | 'min_damage_roll'
  /** Sheltering Wings: the next direct creature-damage event is reduced by `amount` % (then removed). */
  | 'damage_ward'
  /** Distract: the next otherwise-legal retaliation is suppressed (then removed). */
  | 'retaliation_suppressed'
  /** Reed Guard: immune to one forced pull (then removed). */
  | 'pull_immunity'
  | 'ranged_lock'
  | 'retaliation_weaken'
  | 'debuff_ward'
  | 'projectile_spell_ward'
  | 'one_hit_thorns'
  | 'retaliation_bonus'
  | 'last_creature_guard'
  | 'pierce_borrowed_defense'
  | 'faithful_shadow'
  | 'buff_suppression'
  | 'temporary_flight'
  | 'spell_lock'
  | 'fear'
  | 'blind'
  | 'mind_control_ward'
  | 'fire_dot'
  | 'element_barrier'
  | 'rooted';

export interface BattleStatusState {
  /** Consumed at the end of the next real activation, never by Wait. */
  expiresAfterActivation?: boolean;
  /** False until an activation begins after the cast (casting on the active ally does not shorten it). */
  nextActivationStarted?: boolean;
  /** A charge is spent only by the matching successful trigger. */
  charges?: number;
  capHp?: number;
  /** Mind controls respect explicit creature immunities and cleanse tags. */
  mind?: boolean;
  /** Explicit protection for authored statuses; old spell statuses remain dispellable. */
  dispellable?: boolean;
  sourceId: string;
  label: string;
  kind: BattleStatusKind;
  amount: number;
  numerator: number;
  denominator: number;
  /** Expires at the start of this round. */
  expiresAtRound: number;
  /** Also expires at the start of this stack's next scheduled activation (neutral abilities, 2026-10-15). */
  expiresOnActivationOf?: BattleStackId;
  /** Applied by the opposing side (a curse, a weakening spell); absent on older saves = derived from the effect. */
  hostile?: boolean;
  /** Application order within the battle (earliest first; absent on older saves = 0). */
  seq?: number;
  /**
   * Who applied it (expedition kit 2026-10-17; inspection shows it, no rule reads it). Recorded when the
   * status is applied, never inferred: the casting commander's hero (a commander without a HeroState has
   * none), the stack whose ability it is, and the side that applied it (spell, miracle or ability). All
   * absent on older saves and on statuses a battle was set up with: the source is then unknown.
   */
  sourceHeroId?: HeroId;
  sourceStackId?: BattleStackId;
  sourceSide?: BattleSideId;
}

export interface BattleStackState {
  /** Temporary battle objects never become army troops or award kill XP. */
  summoned?: { kind: 'illusion' | 'summon'; sourceId: string; sourceCount: number; expiresAtRound: number };
  /** Separate restored HP, consumed before permanent HP and discarded before casualty persistence. */
  temporaryLife?: { hp: number; expiresAtRound: number };

  /** One following activation of immunity after a control expires. Serialized with the battle. */
  controlGrace?: readonly BattleStatusKind[];
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
  /** Uses of once-per-battle stack abilities by ability ID (absent = none used). */
  abilityUses?: Record<string, number>;
}

export interface BattleEncounterRef {
  /** `naval_boarding` (navalMovementV1): an occupied ship boards a hostile occupied ship (`attackerShipId`, `defenderShipId`). */
  kind: 'site_guard' | 'hero' | 'town_siege' | 'caravan_intercept' | 'naval_boarding' | 'wreck_expedition' | 'standalone';
  /**
   * naval_boarding only: the two ships (`destination` is the defender ship's water tile, the contested hex).
   * wreck_expedition (sea-sites kit): a hero aboard `attackerShipId` fights the raiders moored alongside the
   * wreck `siteId`; `destination` is the hero's own approach hex (the hero stays on its ship there).
   */
  attackerShipId?: ShipId | null;
  defenderShipId?: ShipId | null;
  /**
   * A single-ship sea encounter (`seaEncountersV1`): the ship whose deck is the battlefield. Its hero
   * may be the attacker (it sailed into sea creatures) or the defender; `board.shipSide` says which.
   * Absent on every other battle.
   */
  sourceShipId?: ShipId | null;
  siteId: SiteId | null;
  /** Besieged town (town_siege only). */
  townId?: TownId | null;
  /** The intercepted recruitment caravan (caravan_intercept only): its cargo defends without a commander. */
  caravanId?: string | null;
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
  /** The structure the attacker aimed the Catapult at (absent: the default target). Legacy sieges only. */
  catapultTargetId?: string | null;
  /**
   * The attacker's stationary, killable catapult (`targetableCatapultV1`, decided when the battle was
   * created). Present: the siege runs the engine phase (Fire / Skip once per round, no automatic shot);
   * absent (older saves, legacy scenarios): the automatic round-start Catapult shot.
   */
  engine?: SiegeEngineState | null;
}

/**
 * A siege engine on the board (`targetableCatapultV1`). A battle object, not a creature, army slot or
 * town structure: it never counts for victory, morale, stack caps, casualties or XP. Persisted so a
 * reload, a retried command or a skipped animation can never give it an extra shot.
 */
export interface SiegeEngineState {
  barrier?: { hp: number; expiresAtRound: number };
  id: string;
  kind: 'catapult';
  side: BattleSideId;
  /** Fixed anchor and occupied cells (upper-left, reserved before deployment). */
  anchor: BattleCell;
  cells: BattleCell[];
  hp: number;
  maxHp: number;
  defense: number;
  /** The structure the attacker chose (kept after it falls: a new target must then be chosen). */
  aimedStructureId: string | null;
  /** The last round in which it fired (0: never). */
  firedRound: number;
  /** The last round whose engine phase was resolved (fired, skipped or auto-skipped; 0: none). */
  phaseRound: number;
}

/** Defender stack choice when a visitor plus garrison exceed seven stacks (BAT-14). */
export interface DefenderSelectionState {
  candidates: { source: 'hero' | 'garrison'; slot: number; creatureId: CreatureId; count: number }[];
  max: number;
}

/**
 * `engine`: after the normal and waiting queues of a round, the siege attacker's catapult phase
 * (Fire or Skip; `targetableCatapultV1`). No stack is active then.
 */
export type BattlePhase = 'selection' | 'deployment' | 'normal' | 'waiting' | 'engine';

export interface BattleFieldState {
  id: string;
  spellId: string;
  side: BattleSideId;
  kind: 'frost' | 'sanctuary' | 'eclipse' | 'glass';
  cells: BattleCell[];
  expiresAtRound: number;
  damage: number;
  percent: number;
  spent?: string[];
}
export interface BattleState {
  standalone?: boolean;
  shadowChoice?: { stackId: BattleStackId; from: BattleCell; options: BattleCell[]; resume?: { stackId: BattleStackId; allowMorale: boolean } };
  spellFields?: BattleFieldState[];

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
  /** Statuses applied so far (application order for Devour Dread; absent on older saves). */
  statusSeq?: number;
  status: 'active' | 'ended';
  /** Encounter-specific seed label for the tactical layout stream (not the combat stream). */
  layoutSeed: number;
  /** The map climate's battle rule for both sides (scenario feature `climateRules`); absent or null = none. */
  climate?: BattleClimateState | null;
  /**
   * A board with a legal-cell mask (naval boarding: `boarding_two_ships_v1`); absent or null = every
   * cell of the cols x rows board is legal (land battles, sieges).
   */
  board?: BattleBoardState | null;
}

/**
 * The legal cells of a masked battlefield, copied from its layout when the battle began (saved with
 * the battle). Every placement and movement rule reads it through `battleCellLegal`.
 */
export interface BattleBoardState {
  layoutId: string;
  /** Row-major zone letters, index = row * cols + col: 'a' attacker deck, 'd' defender deck, 'b' bridge, '.' water (illegal). */
  cells: string;
  /** Deployment columns from each side's edge, Tactics included (never beyond the deck). */
  deploymentWidth: number;
  /**
   * The layout's zone occupancy policy, copied when the battle began (single-ship sea encounter: ground
   * on 'k' deck, swimmers in '.' water, flyers on either, every footprint in one zone). Absent: the
   * boarding mask — every zone but water, for every creature (older saves, boarding battles).
   */
  occupancy?: BoardOccupancyPolicy;
  /** Sea encounters: the battle side that stands on the ship's deck (bound to `encounter.sourceShipId`'s hero). */
  shipSide?: BattleSideId;
  /** Sea encounters: the layout's deployment anchors, swimmer range floor and Deck Harpoon numbers. */
  sea?: SeaEncounterBoardRules;
}

/** A climate's battle rule as it was when the battle began (saved with the battle). */
export interface BattleClimateState {
  /** The biome / climate rule ID. */
  id: string;
  name: string;
  summary: string;
  creatureStats: { stat: 'attack' | 'defense' | 'speed'; amount: number; ability?: string; withoutAbility?: string }[];
  /** Added to every shooter's range (never below 1). */
  rangeMod: number;
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
// Recruitment caravans (scenario feature `recruitmentCaravansV1`)
// ---------------------------------------------------------------------------

/**
 * A shipment's state: `queued` (paid, first movement at its owner's next turn start),
 * `travelling`, `blocked` (held where it stands: a blocker on the road, no known route or a lost
 * destination — `blockedReason` says which), `intercepted` (its cargo is fighting an enemy hero:
 * locked), `awaiting_garrison` (at its destination, which has no room for the whole cargo yet),
 * `delivered` and `destroyed` (final; kept until the owner's next day for the receipt, then removed).
 */
export type CaravanStatus = 'queued' | 'travelling' | 'blocked' | 'intercepted' | 'awaiting_garrison' | 'delivered' | 'destroyed';

/** Why a shipment holds (data for the notices; the words are `blockedMessage`). */
export type CaravanBlockReason = 'route_blocked' | 'no_route' | 'destination_lost' | 'garrison_full';

/**
 * One recruitment caravan (expedition kit §06): recruits bought at `sourceTownId` at that town's
 * prices plus the flat transport fee, travelling over explored land to its owner's
 * `destinationTownId`. Changed only by the rules (systems/caravans.ts); the owner never changes
 * when the source falls; never refunded, never converted into another army.
 */
export interface CaravanState {
  id: string;
  ownerId: PlayerId;
  sourceTownId: TownId;
  destinationTownId: TownId;
  /** Where the wagon stands (a land tile; its source town's gate at dispatch). */
  coord: HexCoord;
  /** The remaining planned tiles after `coord`, ending at the destination's gate (saved between days). */
  route: HexCoord[];
  /** Up to seven stacks, one per creature form (identical creatures merged). */
  cargo: CreatureStackState[];
  status: CaravanStatus;
  /** Why it holds (blocked or awaiting_garrison); null otherwise. */
  blockedReason: CaravanBlockReason | null;
  /** World day of dispatch: it first moves at its owner's next turn start (a later day). */
  dispatchedDay: number;
  /** World day of the owner's turn whose movement (or delivery attempt) was applied; 0 = none. Never repeated. */
  lastMovedTurn: number;
  /** The cargo was merged into the destination garrison (exactly once). */
  deliveryApplied: boolean;
  /** The interception battle its cargo is fighting (status `intercepted`); null otherwise. */
  pendingBattleId: BattleId | null;
  /** The status to return to when its cargo wins an interception. */
  resumeStatus?: CaravanStatus | null;
  /** What the shipment cost (the recruits at the source's prices plus the fee): the receipt, never refunded. */
  paid: ResourceBundle;
  /** World day it was delivered or destroyed (final states). */
  endedDay?: number | null;
  /** Dispatch order (the stable processing order with the ID). */
  seq: number;
}

/**
 * The caravan step of a turn start (interrupted-processing cursor): which owner's turn on which
 * world day is being processed, the last caravan handled and whether all were. Saved, so a reload
 * or a battle in between can never move a caravan twice in one turn.
 */
export interface CaravanTurnCursor {
  day: number;
  playerId: PlayerId;
  lastCaravanId: string | null;
  complete: boolean;
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
  standalone?: { damage?: Record<BattleSideId, number>; spec: import('../systems/battle/singleBattle').SingleBattleSpec; commands: import('../commands/commands').GameCommand[] };
  /** Explicit campaign coalition: native ownership and gods, one shared treasury and day. */
  coalition?: { playerIds: PlayerId[]; treasury: ResourceBundle };
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
  /**
   * Scouting intel snapshots per observing player, keyed by the observed hero's ID (scenario
   * feature `scoutingIntelV1`; absent in older saves and with the feature off).
   */
  intel?: Record<PlayerId, Record<HeroId, IntelSnapshot>>;
  /**
   * Recruitment caravans by ID (scenario feature `recruitmentCaravansV1`; absent in older saves and
   * with the feature off = none).
   */
  caravans?: Record<string, CaravanState>;
  /** The caravan step of the latest turn start (absent: none processed yet). */
  caravanTurn?: CaravanTurnCursor | null;
  /**
   * Coastal watchtowers (sea-sites kit): per owning player, the hostile ships its towers see and the
   * alerts already raised this owner-turn (absent: no tower has been owned yet; older saves).
   */
  seaWatch?: Record<PlayerId, SeaWatchState>;
}

export const ARMY_SLOT_COUNT = 7;
