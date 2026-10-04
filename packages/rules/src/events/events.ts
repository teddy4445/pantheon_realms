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
} from '../ids';
import type { BattleCell, HexCoord } from '../core/hex';
import type { ResourceBundle } from '../core/resources';
import type { ObjectiveStatus } from '../definitions/campaign';
import type { HeroAttribute } from '../definitions/logic';
import type { BattleSideId } from '../state/match';

export type GameEventPayload =
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
  | { kind: 'HeroLeveled'; heroId: HeroId; level: number; primaryGain: HeroAttribute; skillId: SkillId | null; rank: number | null }
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
  | { kind: 'ObjectiveChanged'; objectiveId: ObjectiveId; status: ObjectiveStatus }
  | { kind: 'MissionFlagSet'; flag: string }
  | { kind: 'MissionCompleted'; reason: string }
  | { kind: 'MissionFailed'; reason: string }
  // Battle
  | { kind: 'BattleStarted'; battleId: BattleId; label: string }
  | { kind: 'BattleRoundStarted'; round: number }
  | { kind: 'BattleStackActivated'; stackId: BattleStackId; bonus: boolean }
  | { kind: 'BattleStackMoved'; stackId: BattleStackId; path: BattleCell[]; flying: boolean }
  | {
      kind: 'BattleAttack';
      attackerId: BattleStackId;
      targetId: BattleStackId;
      mode: 'melee' | 'shot' | 'retaliation';
      damage: number;
      killed: number;
      targetRemaining: number;
      luck: boolean;
    }
  | { kind: 'BattleSpellCast'; side: BattleSideId; spellId: SpellId; targetId: BattleStackId; damage: number; healed: number }
  | { kind: 'BattleAbilityUsed'; stackId: BattleStackId; abilityId: string; targetId: BattleStackId }
  | { kind: 'BattleStackShapeshifted'; stackId: BattleStackId; aspect: string | null; free: boolean }
  | { kind: 'BattleCasualtiesRecovered'; side: BattleSideId; stackId: BattleStackId; creatureId: CreatureId; count: number }
  | { kind: 'BattleStackDefended'; stackId: BattleStackId }
  | { kind: 'BattleStackWaited'; stackId: BattleStackId }
  | { kind: 'BattleMorale'; stackId: BattleStackId; positive: boolean }
  | { kind: 'BattleStackDestroyed'; stackId: BattleStackId }
  | { kind: 'BattleEnded'; battleId: BattleId; winner: BattleSideId; outcome: string }
  | { kind: 'BattleDefendersSelected'; count: number; reserves: number }
  | { kind: 'BattleDeploymentStarted'; sides: BattleSideId[] }
  | { kind: 'BattleStackDeployed'; stackId: BattleStackId; to: BattleCell }
  | { kind: 'BattleDeploymentConfirmed'; side: BattleSideId }
  | { kind: 'SiegeStructureDamaged'; structureId: string; source: 'catapult' | 'creature'; hp: number; attackerId: BattleStackId | null }
  | { kind: 'SiegeStructureDestroyed'; structureId: string }
  | { kind: 'SiegeTurretShot'; structureId: string; targetId: BattleStackId; damage: number; killed: number; targetRemaining: number }
  | { kind: 'SiegeMoatDamage'; stackId: BattleStackId; damage: number; killed: number; targetRemaining: number }
  | { kind: 'TownCaptured'; townId: TownId; playerId: PlayerId }
  // World map, interventions, story, outcome (proposed this build)
  | { kind: 'CampRecruited'; siteId: SiteId; heroId: HeroId; creatureId: CreatureId; quantity: number }
  | { kind: 'CampRestocked'; siteId: SiteId; stock: number }
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

export type GameEventKind = GameEventPayload['kind'];

export type GameEvent = GameEventPayload & {
  readonly eventId: EventId;
  readonly revision: number;
};
