/**
 * GameEvent: immutable facts emitted by a committed command.
 *
 * Events drive UI notifications, 2D sprite animation, audio cues, replay and tests.
 * They are results, never requests: playing (or skipping) an event's animation
 * cannot change MatchState. The authoritative state remains MatchState.
 */
import type {
  ArtifactId,
  BattleId,
  BattleStackId,
  BuildingId,
  CreatureFamilyId,
  CreatureId,
  EntitlementId,
  EventId,
  GodId,
  HeroDefinitionId,
  HeroId,
  ObjectiveId,
  PlayerId,
  SiteId,
  SkillId,
  SpellId,
  TownId,
  ShipId,
} from '../ids';
import type { BattleCell, HexCoord } from '../core/hex';
import type { ResourceBundle } from '../core/resources';
import type { ObjectiveStatus } from '../definitions/campaign';
import type { HeroAttribute } from '../definitions/logic';
import type { BattleSideId } from '../state/match';

export type GameEventPayload =
  | { kind: 'CheatApplied'; playerId: PlayerId; effect: import('../systems/cheats').CheatEffect }
  // Economy & calendar
  | { kind: 'TurnEnded'; playerId: PlayerId }
  | { kind: 'TurnStarted'; playerId: PlayerId; day: number }
  | { kind: 'DayStarted'; day: number; week: number; dayOfWeek: number }
  | { kind: 'IncomeCollected'; playerId: PlayerId; amount: ResourceBundle }
  | { kind: 'PopulationGrown'; townId: TownId; familyId: CreatureFamilyId; added: number; total: number }
  | { kind: 'ResourcesSpent'; playerId: PlayerId; amount: ResourceBundle; reason: string }
  | { kind: 'ResourcesGranted'; playerId: PlayerId; amount: ResourceBundle; reason: string }
  | { kind: 'BuildingConstructed'; townId: TownId; buildingId: BuildingId; level: number }
  | { kind: 'DwellingUpgraded'; townId: TownId; buildingId: BuildingId; familyId: CreatureFamilyId }
  | { kind: 'UnitsRecruited'; townId: TownId; creatureId: CreatureId; quantity: number; destination: string }
  | { kind: 'StackUpgraded'; townId: TownId; fromId: CreatureId; toId: CreatureId; quantity: number }
  | { kind: 'StackTransferred'; creatureId: CreatureId; quantity: number; from: string; to: string }
  | { kind: 'ResourcesTraded'; townId: TownId; sold: string; bought: string; amount: number }
  // Heroes & adventure
  | { kind: 'HeroMoved'; heroId: HeroId; path: HexCoord[]; cost: number; remaining: number }
  | { kind: 'EmptyShipCalled'; heroId: HeroId; shipId: ShipId; path: HexCoord[] }
  | { kind: 'BattleArtifactActivated'; artifactId: string; heroId: HeroId; targetId: BattleStackId }
  | { kind: 'BattleBarrierAbsorbed'; side: BattleSideId; targetId: BattleStackId; amount: number; remaining: number }
  /** Recall spell or a portal (`viaSiteId`: the portal stepped into). */
  | { kind: 'HeroTeleported'; heroId: HeroId; from: HexCoord; to: HexCoord; viaSiteId?: SiteId }
  | { kind: 'TilesRevealed'; playerId: PlayerId; count: number }
  | { kind: 'SiteCaptured'; siteId: SiteId; playerId: PlayerId }
  | { kind: 'PickupCollected'; siteId: SiteId; heroId: HeroId }
  | { kind: 'SiteVisited'; siteId: SiteId; heroId: HeroId }
  | { kind: 'PortalBlocked'; heroId: HeroId; siteId: SiteId }
  | { kind: 'SiteRevealed'; siteId: SiteId }
  | { kind: 'SiteActivated'; siteId: SiteId; heroId: HeroId }
  | { kind: 'GateOpened'; siteId: SiteId }
  | { kind: 'SpellbookPurchased'; heroId: HeroId }
  | { kind: 'HeroHired'; heroId: HeroId; definitionId: HeroDefinitionId; townId: TownId }
  | { kind: 'SpellsLearned'; heroId: HeroId; spellIds: SpellId[] }
  | { kind: 'ArtifactGranted'; heroId: HeroId; artifactId: ArtifactId; location: 'equipped' | 'backpack' | 'cache' }
  | { kind: 'ArtifactEquipped'; heroId: HeroId; artifactId: ArtifactId }
  | { kind: 'ArtifactUnequipped'; heroId: HeroId; artifactId: ArtifactId }
  | { kind: 'ExperienceGranted'; heroId: HeroId; amount: number; capped: boolean; total: number }
  | { kind: 'LevelUpPending'; heroId: HeroId; newLevel: number }
  | { kind: 'HeroLeveled'; heroId: HeroId; level: number; primaryGain: HeroAttribute; skillId: SkillId | null; rank: number | null; /** A god's gift taken at this level (levels 10 and 15). */ perkId?: string | null }
  | { kind: 'HeroDefeated'; heroId: HeroId }
  | { kind: 'HeroRetreated'; heroId: HeroId }
  // Town services (proposed this build)
  | { kind: 'OfferingMade'; townId: TownId; playerId: PlayerId; favor: number; creatures: number }
  | { kind: 'HeroTrained'; heroId: HeroId; townId: TownId; xp: number; gold: number }
  | { kind: 'ArtifactPurchased'; heroId: HeroId; townId: TownId; artifactId: ArtifactId; shop?: 'merchant' | 'workshop' }
  | { kind: 'MerchantRestocked'; townId: TownId; week: number; artifactIds: ArtifactId[]; shop?: 'merchant' | 'workshop' }
  // Divine & quests
  | { kind: 'GodSelected'; playerId: PlayerId; godId: GodId }
  | { kind: 'EntitlementGranted'; playerId: PlayerId; entitlementId: EntitlementId }
  | { kind: 'CovenantAssigned'; townId: TownId; familyId: CreatureFamilyId }
  // City dedications (app 1.5.0, scenario feature `cityDedicationsV1`). `week` is the world week.
  /** A town's free first dedication: its service works at once; its gift and growth start at the next week boundary. */
  | { kind: 'TownDedicated'; townId: TownId; playerId: PlayerId; godId: GodId; week: number }
  /** A paid switch, taking over at the boundary of `activationWeek` (day `activationDay`); `cost` was spent now. */
  | { kind: 'TownRededicationScheduled'; townId: TownId; playerId: PlayerId; godId: GodId; fromGodId: GodId | null; activationWeek: number; activationDay: number; cost: ResourceBundle }
  /** A pending switch took over at a week boundary (its service applies to later commands). */
  | { kind: 'TownRededicationActivated'; townId: TownId; playerId: PlayerId; godId: GodId; fromGodId: GodId | null; week: number }
  /** A due pending switch is invalid now: it stays pending and is tried again at the next week boundary. */
  | { kind: 'TownRededicationDelayed'; townId: TownId; playerId: PlayerId; godId: GodId; week: number; reason: string }
  /** The town changed owner: its honored god, pending switch and growth credits are gone (no refund). */
  | { kind: 'TownDedicationCleared'; townId: TownId; playerId: PlayerId | null; godId: GodId | null; pendingGodId: GodId | null; reason: 'owner_changed' }
  /** A dedicated town's weekly gift, as paid to the owner (after its income handicap). */
  | { kind: 'CityGiftGranted'; townId: TownId; playerId: PlayerId; godId: GodId; week: number; amount: ResourceBundle }
  /** The favored family's weekly credit update: `added` creatures to the shared pool (now `total`), `remainingQuarters` saved. */
  | { kind: 'CityDevotionGrowthApplied'; townId: TownId; playerId: PlayerId; godId: GodId; familyId: CreatureFamilyId; week: number; quarters: number; added: number; total: number; remainingQuarters: number }
  // Recruitment caravans (scenario feature `recruitmentCaravansV1`). `cargo` lists the shipment's stacks.
  /** Paid and created at its source town's gate; it first moves at its owner's next turn start (`etaDay`: expected arrival). */
  | { kind: 'CaravanDispatched'; caravanId: string; playerId: PlayerId; sourceTownId: TownId; destinationTownId: TownId; cargo: { creatureId: CreatureId; count: number }[]; cost: ResourceBundle; fee: ResourceBundle; etaDay: number | null }
  /** Moved along its saved route at its owner's turn start (`remaining`: tiles still to go). */
  | { kind: 'CaravanMoved'; caravanId: string; playerId: PlayerId; path: HexCoord[]; cost: number; remaining: number }
  /** Holds where it stands (`reason`; `message` in words): its cargo is safe; a lost destination asks for a reroute. */
  | { kind: 'CaravanBlocked'; caravanId: string; playerId: PlayerId; reason: 'route_blocked' | 'no_route' | 'destination_lost' | 'garrison_full'; message: string; coord: HexCoord }
  /** Its whole cargo joined the destination garrison (once). */
  | { kind: 'CaravanDelivered'; caravanId: string; playerId: PlayerId; townId: TownId; sourceTownId: TownId; cargo: { creatureId: CreatureId; count: number }[]; dispatchedDay: number; day: number }
  /** An enemy hero attacked it: its cargo fights `battleId` without a commander. */
  | { kind: 'CaravanIntercepted'; caravanId: string; playerId: PlayerId; attackerHeroId: HeroId; battleId: BattleId }
  /** The interception ended: `survived` with the surviving `cargo` back in the shipment, or not. */
  | { kind: 'CaravanInterceptionResolved'; caravanId: string; playerId: PlayerId; attackerHeroId: HeroId; survived: boolean; cargo: { creatureId: CreatureId; count: number }[] }
  /** Every creature of the shipment fell: it is gone (never refunded, never joins the attacker). */
  | { kind: 'CaravanDestroyed'; caravanId: string; playerId: PlayerId; byHeroId: HeroId | null; lost: { creatureId: CreatureId; count: number }[] }
  // Hero ships (scenario feature `navalMovementV1`; systems/naval.ts). `facing` indexes AXIAL_DIRECTIONS.
  /** An empty ship was launched at an owned coastal town (`cost` was spent). */
  | { kind: 'ShipLaunched'; shipId: ShipId; townId: TownId; playerId: PlayerId; coord: HexCoord; facing: number; cost: ResourceBundle }
  /** A hero stepped from the shore `from` onto the ship at `to` (`claimed`: it was neutral). All remaining movement is used. */
  | { kind: 'HeroEmbarked'; heroId: HeroId; shipId: ShipId; from: HexCoord; to: HexCoord; claimed: boolean }
  /** A hero stepped from the ship at `from` onto the shore `to`; the empty hull stays. All remaining movement is used. */
  | { kind: 'HeroDisembarked'; heroId: HeroId; shipId: ShipId; from: HexCoord; to: HexCoord }
  /** The ship carried its hero along `path` (the same steps as the hero's `HeroMoved`, or the boarding winner taking the contested hex). */
  | { kind: 'ShipMoved'; shipId: ShipId; heroId: HeroId; path: HexCoord[]; facing: number }
  /** A boarding encounter begins (its `BattleStarted` follows): the attacker's ship boards the defender's at `coord`. */
  | { kind: 'BoardingStarted'; attackerShipId: ShipId; defenderShipId: ShipId; attackerHeroId: HeroId; defenderHeroId: HeroId; coord: HexCoord }
  /** The boarding battle's consequences on the map (after its `BattleEnded`): who holds the water. */
  | { kind: 'BoardingResolved'; battleId: BattleId; winner: BattleSideId; outcome: string; attackerShipId: ShipId; defenderShipId: ShipId; coord: HexCoord }
  /** A sea encounter begins (its `BattleStarted` follows): `shipId` meets the sea creatures at `coord` (seaEncountersV1). */
  | { kind: 'SeaEncounterStarted'; shipId: ShipId; heroId: HeroId; siteId: SiteId | null; coord: HexCoord; shipSide: BattleSideId }
  /** The sea encounter's consequences on the map (after its `BattleEnded`): where the ship is, or that it was lost. */
  | { kind: 'SeaEncounterResolved'; battleId: BattleId; winner: BattleSideId; outcome: string; shipId: ShipId; coord: HexCoord }
  /** A retreating or surrendering hero's ship withdrew to a vacant water hex (the hero stays aboard; never a land teleport). */
  | { kind: 'ShipWithdrawn'; shipId: ShipId; heroId: HeroId; from: HexCoord; to: HexCoord; facing: number }
  /** A hull was lost (its hero defeated aboard): removed from the map; the presentation plays the sinking. */
  | { kind: 'ShipWrecked'; shipId: ShipId; ownerId: PlayerId | null; coord: HexCoord; reason: 'boarding_defeat' | 'hero_lost' | 'sea_encounter_defeat' }
  // Coastal sites and sea salvage (sea-sites kit; systems/seaSites.ts)
  /**
   * "Enemy ship sighted near <tower>": a hostile ship came into the sight of `playerId`'s coastal
   * watchtowers (visible, within a tower's radius). One per ship per owner-turn, the towers that see it
   * coalesced (`siteId` the nearest; `siteIds` all, nearest first). Never raised again on load.
   */
  | { kind: 'ShipSightedNearTower'; playerId: PlayerId; shipId: ShipId; shipOwnerId: PlayerId | null; siteId: SiteId; siteIds: SiteId[]; coord: HexCoord }
  /** A hero explored a shipwreck (its movement paid); `battle`: raiders were aboard and a fight began. */
  | { kind: 'WreckExplored'; siteId: SiteId; heroId: HeroId; playerId: PlayerId; cost: number; battle: boolean }
  /** A wreck was cleared and its salvage granted once; `pending`: its artifact did not fit and waits at the wreck. */
  | { kind: 'WreckRewardGranted'; siteId: SiteId; heroId: HeroId; playerId: PlayerId; resources: ResourceBundle; artifactId: ArtifactId | null; pending: boolean }
  /** The artifact waiting at a cleared wreck was taken (`leftArtifactId`: the backpack item left there in its place). */
  | { kind: 'WreckArtifactClaimed'; siteId: SiteId; heroId: HeroId; artifactId: ArtifactId; leftArtifactId: ArtifactId | null }
  /** Sent to another owned town (no second charge). */
  | { kind: 'CaravanRerouted'; caravanId: string; playerId: PlayerId; fromTownId: TownId; toTownId: TownId; etaDay: number | null }
  | { kind: 'ObjectiveChanged'; objectiveId: ObjectiveId; status: ObjectiveStatus }
  | { kind: 'MissionFlagSet'; flag: string }
  | { kind: 'MissionCompleted'; reason: string }
  | { kind: 'MissionFailed'; reason: string }
  // Battle
  | { kind: 'BattleStarted'; battleId: BattleId; label: string }
  | { kind: 'BattleRoundStarted'; round: number }
  | { kind: 'BattleStackActivated'; stackId: BattleStackId; bonus: boolean }
  | { kind: 'BattleStackMoved'; stackId: BattleStackId; path: BattleCell[]; flying: boolean; forced?: 'pull'; byStackId?: BattleStackId }
  | {
      kind: 'BattleAttack';
      attackerId: BattleStackId;
      targetId: BattleStackId;
      /** `harpoon`: a Deck Harpoon throw (single-ship sea encounter): never retaliated, no luck. */
      mode: 'melee' | 'shot' | 'retaliation' | 'harpoon';
      damage: number;
      killed: number;
      targetRemaining: number;
      luck: boolean;
    }
  /** `targetEngineId`: cast at the siege engine (`targetId` then repeats the engine's ID, not a stack). */
  | { kind: 'BattleSpellCast'; side: BattleSideId; spellId: SpellId; targetId: BattleStackId; damage: number; healed: number; targetEngineId?: string; cells?: BattleCell[] }
  | { kind: 'BattleAbilityUsed'; stackId: BattleStackId; abilityId: string; targetId: BattleStackId; removedStatus?: string }
  /** Campaign v2: an announced deadline started (its deadline day is saved). */
  | { kind: 'TimerStarted'; timerId: string; label: string; deadlineDay: number }
  | { kind: 'TimerResolved'; timerId: string; met: boolean }
  /** Campaign v2: a patrol's home camp fell; the patrol withdrew for good. */
  | { kind: 'PatrolWithdrawn'; heroId: HeroId; siteId: SiteId }
  | { kind: 'SluiceOperated'; siteId: SiteId; heroId: HeroId; open: boolean }
  | { kind: 'MissionFlagCleared'; flag: string }
  /** Campaign v2: a guard stood down through an authored choice (paid passage, a negotiated surrender). */
  | { kind: 'GuardStoodDown'; siteId: SiteId; heroId: HeroId }
  /** A protective or distracting status took effect (Sheltering Wings reduced a blow, Distract stopped a retaliation, Reed Guard stopped a pull). */
  | { kind: 'BattleStatusConsumed'; stackId: BattleStackId; status: 'damage_ward' | 'retaliation_suppressed' | 'pull_immunity' | 'faithful_shadow'; amount?: number }
  | { kind: 'BattleStackShapeshifted'; stackId: BattleStackId; aspect: string | null; free: boolean }
  | { kind: 'BattleCasualtiesRecovered'; side: BattleSideId; stackId: BattleStackId; creatureId: CreatureId; count: number }
  | { kind: 'BattleStackDefended'; stackId: BattleStackId }
  | { kind: 'BattleStackWaited'; stackId: BattleStackId }
  | { kind: 'BattleMorale'; stackId: BattleStackId; positive: boolean }
  | { kind: 'BattleStackDestroyed'; stackId: BattleStackId }
  | { kind: 'BattleEnded'; battleId: BattleId; winner: BattleSideId; outcome: string }
  | { kind: 'BattleDefendersSelected'; count: number; reserves: number }
  /** Identical defender stacks combined before a siege (2026-10-07); `stacks` is how many became one. */
  | { kind: 'BattleDefendersMerged'; creatureId: CreatureId; count: number; stacks: number }
  | { kind: 'BattleDeploymentStarted'; sides: BattleSideId[] }
  | { kind: 'BattleStackDeployed'; stackId: BattleStackId; to: BattleCell }
  | { kind: 'BattleDeploymentConfirmed'; side: BattleSideId }
  | { kind: 'SiegeStructureDamaged'; structureId: string; source: 'catapult' | 'creature'; hp: number; attackerId: BattleStackId | null }
  | { kind: 'SiegeStructureDestroyed'; structureId: string }
  | { kind: 'SiegeTurretShot'; structureId: string; targetId: BattleStackId; damage: number; killed: number; targetRemaining: number }
  /** The attacker chose the Catapult's target (2026-10-07). */
  | { kind: 'SiegeCatapultAimed'; structureId: string }
  /** `targetableCatapultV1`: every creature has acted; the attacker's catapult may fire or skip now. */
  | { kind: 'CatapultPhaseStarted'; engineId: string; round: number; aimedStructureId: string | null }
  /** The catapult fired at `structureId` (its `SiegeStructureDamaged`, source `catapult`, follows). */
  | { kind: 'CatapultFired'; engineId: string; structureId: string; round: number }
  /** The engine phase ended without a shot: the attacker skipped, or no structure was left to aim at. */
  | { kind: 'CatapultSkipped'; engineId: string; round: number; reason: 'skipped' | 'no_targets' }
  /** A creature blow, shot or damaging spell hit the siege engine (its own Defense and HP; never structure HP). */
  | {
      kind: 'EngineDamaged';
      engineId: string;
      attackerId: BattleStackId | null;
      source: 'melee' | 'shot' | 'spell';
      spellId?: SpellId;
      damage: number;
      hp: number;
      maxHp: number;
      luck: boolean;
    }
  /** The siege engine fell: it never fires again and its wreck blocks nothing. */
  | { kind: 'EngineDestroyed'; engineId: string; round: number; attackerId: BattleStackId | null }
  | { kind: 'SiegeMoatDamage'; stackId: BattleStackId; damage: number; killed: number; targetRemaining: number }
  | { kind: 'TownCaptured'; townId: TownId; playerId: PlayerId; /** The previous owner (null: unowned). */ fromPlayerId?: PlayerId | null }
  // World map, interventions, story, outcome (proposed this build)
  | { kind: 'CampRecruited'; siteId: SiteId; heroId: HeroId; creatureId: CreatureId; quantity: number }
  | { kind: 'CampRestocked'; siteId: SiteId; stock: number }
  /** A base stack trained into its upgraded form at a neutral hiring site (no stock used). */
  | { kind: 'CampTrained'; siteId: SiteId; heroId: HeroId; fromId: CreatureId; toId: CreatureId; quantity: number }
  | { kind: 'MapEventResolved'; siteId: SiteId; heroId: HeroId; optionIndex: number; label: string }
  | { kind: 'CreaturesJoined'; heroId: HeroId; creatureId: CreatureId; count: number }
  | { kind: 'AttributeGained'; heroId: HeroId; attribute: HeroAttribute; amount: number }
  | { kind: 'WeeklyEventStarted'; week: number; eventId: string | null }
  | { kind: 'DivineGiftReceived'; playerId: PlayerId; townId: TownId; giftId: string; heroId: HeroId | null; favor: number; artifactId: ArtifactId | null; xp: number; recruits: number }
  | { kind: 'InterventionInvoked'; playerId: PlayerId; interventionId: string; targetTownId: TownId | null; targetStackId: BattleStackId | null }
  | { kind: 'BattleStacksHealed'; side: BattleSideId; healed: number }
  | { kind: 'StoryScene'; sceneId: string }
  | { kind: 'RelicHeld'; siteId: SiteId; playerId: PlayerId; days: number; needed: number }
  | { kind: 'PlayerEliminated'; playerId: PlayerId }
  | { kind: 'AdventureSpellCast'; heroId: HeroId; spellId: SpellId; center: HexCoord; radius: number; untilDay: number }
  // Adventure-map sites added 2026-10-02 (random maps) and neutral reactions
  | { kind: 'LearningStoneUsed'; siteId: SiteId; heroId: HeroId; xp: number }
  | { kind: 'ShrineSpellLearned'; siteId: SiteId; heroId: HeroId; spellId: SpellId }
  | { kind: 'SkillTrained'; siteId: SiteId; heroId: HeroId; skillId: SkillId }
  | { kind: 'KeyObtained'; siteId: SiteId; playerId: PlayerId; color: string }
  | { kind: 'WindmillCollected'; siteId: SiteId; heroId: HeroId; amount: ResourceBundle; week: number }
  | { kind: 'ChestOpened'; siteId: SiteId; heroId: HeroId; choice: 'gold' | 'xp'; amount: number }
  | { kind: 'QuestHutCompleted'; siteId: SiteId; heroId: HeroId }
  | { kind: 'PrisonerFreed'; siteId: SiteId; heroId: HeroId; byHeroId: HeroId }
  /** A site did nothing for this hero; `reason` says why (no spellbook, already used, no free slot...). */
  | { kind: 'SiteRefused'; siteId: SiteId; heroId: HeroId; reason: string }
  | { kind: 'NeutralsJoined'; heroId: HeroId; siteId: SiteId | null; monsterHeroId: HeroId | null; stacks: { creatureId: CreatureId; count: number }[] }
  | { kind: 'NeutralsFled'; heroId: HeroId; siteId: SiteId | null; monsterHeroId: HeroId | null };

export type GameEvent = GameEventPayload & {
  readonly eventId: EventId;
  readonly revision: number;
};
