/**
 * GameCommand: every requested authoritative mutation.
 *
 * UI, AI and campaign scripts all submit these same commands. A command carries
 * its identity, the revision it was quoted against and the acting player.
 * A failed command changes nothing.
 */
import type {
  BattleStackId,
  BuildingId,
  CommandId,
  CreatureId,
  DecisionId,
  EntitlementId,
  GodId,
  HeroDefinitionId,
  HeroId,
  ObjectiveId,
  PlayerId,
  SiteId,
  SpellId,
  TownId,
  ArtifactInstanceId,
} from '../ids';
import type { BattleCell, HexCoord } from '../core/hex';
import type { ResourceKey } from '../core/resources';
import type { ArmyRef } from '../state/match';
import type { ArtifactSlot } from '../definitions/pantheons';

export type RecruitDestination = { kind: 'garrison' } | { kind: 'hero'; heroId: HeroId };

export type CommandPayload =
  | { kind: 'EndTurn' }
  | { kind: 'MoveHero'; heroId: HeroId; destination: HexCoord; confirmEncounter?: boolean }
  | { kind: 'BuildStructure'; townId: TownId; buildingId: BuildingId }
  | {
      kind: 'RecruitUnits';
      townId: TownId;
      creatureId: CreatureId;
      quantity: number;
      destination: RecruitDestination;
    }
  | { kind: 'UpgradeStack'; townId: TownId; army: ArmyRef; slot: number; quantity: number }
  | { kind: 'TransferStack'; from: ArmyRef; fromSlot: number; to: ArmyRef; toSlot: number; quantity: number }
  | { kind: 'SelectGod'; godId: GodId }
  | { kind: 'AssignCovenant'; townId: TownId; entitlementId: EntitlementId }
  | { kind: 'ClaimObjective'; objectiveId: ObjectiveId }
  | { kind: 'BuySpellbook'; heroId: HeroId; townId: TownId }
  | { kind: 'HireHero'; townId: TownId; heroDefinitionId: HeroDefinitionId }
  | { kind: 'TradeResources'; townId: TownId; sell: ResourceKey; buy: ResourceKey; amount: number }
  | { kind: 'ActivateSite'; heroId: HeroId; siteId: SiteId }
  | { kind: 'EquipArtifact'; heroId: HeroId; instanceId: ArtifactInstanceId }
  | { kind: 'UnequipArtifact'; heroId: HeroId; slot: ArtifactSlot }
  | { kind: 'ChooseLevelUp'; decisionId: DecisionId; offerIndex: number | null }
  | { kind: 'CastAdventureSpell'; heroId: HeroId; spellId: SpellId; target: HexCoord }
  // --- Town services (proposed this build) ---
  | { kind: 'MakeOffering'; townId: TownId; offerings: { army: ArmyRef; slot: number; quantity: number }[] }
  | { kind: 'TrainHero'; townId: TownId; heroId: HeroId }
  | { kind: 'BuyArtifact'; townId: TownId; heroId: HeroId; index: number }
  // --- World map and divine interventions (proposed this build) ---
  | { kind: 'RecruitFromCamp'; heroId: HeroId; siteId: SiteId; quantity: number }
  | { kind: 'ResolveMapEvent'; heroId: HeroId; siteId: SiteId; optionIndex: number }
  | { kind: 'InvokeIntervention'; interventionId: string; townId?: TownId }
  // --- Tactical battle ---
  | { kind: 'BattleMove'; stackId: BattleStackId; to: BattleCell }
  | { kind: 'BattleMelee'; stackId: BattleStackId; targetId: BattleStackId; from: BattleCell }
  | { kind: 'BattleShoot'; stackId: BattleStackId; targetId: BattleStackId }
  | { kind: 'BattleDefend'; stackId: BattleStackId }
  | { kind: 'BattleWait'; stackId: BattleStackId }
  | { kind: 'BattleCastSpell'; spellId: SpellId; targetId: BattleStackId }
  | { kind: 'BattleUseAbility'; stackId: BattleStackId; abilityId: string; targetId: BattleStackId }
  | { kind: 'BattleAttackStructure'; stackId: BattleStackId; structureId: string }
  | { kind: 'BattleSelectDefenders'; picks: number[] }
  | { kind: 'BattleDeploy'; stackId: BattleStackId; to: BattleCell }
  | { kind: 'BattleConfirmDeployment' }
  | { kind: 'BattleRetreat' }
  | { kind: 'BattleSurrender' }
  | { kind: 'BattleInvokeIntervention'; interventionId: string; targetId?: BattleStackId };

export type CommandKind = CommandPayload['kind'];

export type GameCommand = CommandPayload & {
  readonly commandId: CommandId;
  readonly expectedRevision: number;
  readonly actorPlayerId: PlayerId;
};

export const BATTLE_COMMAND_KINDS: ReadonlySet<CommandKind> = new Set<CommandKind>([
  'BattleMove',
  'BattleMelee',
  'BattleShoot',
  'BattleDefend',
  'BattleWait',
  'BattleCastSpell',
  'BattleUseAbility',
  'BattleAttackStructure',
  'BattleSelectDefenders',
  'BattleDeploy',
  'BattleConfirmDeployment',
  'BattleRetreat',
  'BattleSurrender',
  'BattleInvokeIntervention',
]);
