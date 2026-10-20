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
  ShipId,
} from '../ids';
import type { BattleCell, HexCoord } from '../core/hex';
import type { ResourceKey } from '../core/resources';
import type { ArmyRef } from '../state/match';
import type { EquipSlot } from '../definitions/pantheons';

export type RecruitDestination = { kind: 'garrison' } | { kind: 'hero'; heroId: HeroId };

export type CommandPayload =
  | { kind: 'InvokeCheat'; effect: import('../systems/cheats').CheatEffect }
  | { kind: 'EndTurn' }
  | { kind: 'SelectCoalitionSeat'; playerId: PlayerId }
  | {
      kind: 'MoveHero';
      heroId: HeroId;
      destination: HexCoord;
      confirmEncounter?: boolean;
      /**
       * Much weaker neutrals (scenario feature `neutralReactions`): 'join' accepts the
       * creatures that offer to join, 'release' lets them run away, 'fight' (default) battles.
       */
      encounterChoice?: 'fight' | 'join' | 'release';
    }
  | { kind: 'BuildStructure'; townId: TownId; buildingId: BuildingId }
  | {
      kind: 'RecruitUnits';
      townId: TownId;
      creatureId: CreatureId;
      quantity: number;
      destination: RecruitDestination;
    }
  /**
   * Recruit all: several families at once, one form each, into one destination — atomic
   * (every line or none). See quoteRecruitBatch / recruitAllItems.
   */
  | { kind: 'RecruitBatch'; townId: TownId; items: { creatureId: CreatureId; quantity: number }[]; destination: RecruitDestination }
  | { kind: 'UpgradeStack'; townId: TownId; army: ArmyRef; slot: number; quantity: number }
  | { kind: 'TransferStack'; from: ArmyRef; fromSlot: number; to: ArmyRef; toSlot: number; quantity: number }
  | { kind: 'ClaimCourierParcel'; heroId: HeroId }
  | { kind: 'SelectSeedTown'; heroId: HeroId; townId: TownId }
  | { kind: 'SelectGod'; godId: GodId }
  | { kind: 'AssignCovenant'; townId: TownId; entitlementId: EntitlementId }
  /**
   * City dedications (app 1.5.0): the free first dedication of a town with Temple II to the
   * player's patron or a committed minor god (quoteDedicateTown). Its service works at once.
   */
  | { kind: 'DedicateTown'; townId: TownId; godId: GodId }
  /** A paid switch to another eligible god, taking over at the next world-week boundary (quoteScheduleTownRededication). */
  | { kind: 'ScheduleTownRededication'; townId: TownId; godId: GodId }
  | { kind: 'ClaimObjective'; objectiveId: ObjectiveId }
  | { kind: 'BuySpellbook'; heroId: HeroId; townId: TownId }
  | { kind: 'HireHero'; townId: TownId; heroDefinitionId: HeroDefinitionId }
  | { kind: 'TradeResources'; townId: TownId; sell: ResourceKey; buy: ResourceKey; amount: number }
  | { kind: 'ActivateSite'; heroId: HeroId; siteId: SiteId }
  | { kind: 'EquipArtifact'; heroId: HeroId; instanceId: ArtifactInstanceId; slot?: EquipSlot }
  | { kind: 'UnequipArtifact'; heroId: HeroId; slot: EquipSlot }
  | { kind: 'ChooseLevelUp'; decisionId: DecisionId; offerIndex: number | null; /** Which god's gift, when the level offers them. */ perkIndex?: number | null }
  | { kind: 'CastAdventureSpell'; heroId: HeroId; spellId: SpellId; target: HexCoord; recipientHeroId?: HeroId; artifactInstanceId?: ArtifactInstanceId }
  // --- Town services (proposed this build) ---
  | { kind: 'MakeOffering'; townId: TownId; offerings: { army: ArmyRef; slot: number; quantity: number }[] }
  | { kind: 'TrainHero'; townId: TownId; heroId: HeroId }
  /** Buy item `index` of a town's weekly stock: the Artifact Merchant's (default) or the Workshop's. */
  | { kind: 'BuyArtifact'; townId: TownId; heroId: HeroId; index: number; shop?: 'merchant' | 'workshop' }
  // --- World map and divine interventions (proposed this build) ---
  /**
   * Hire at a creature camp. `creatureId` (battle FX & neutral upgrades, 2026-10-15) picks
   * the form at a neutral hiring site that hires both forms of its family; omitted, the
   * camp's listed creature (old commands, the AI and old saves are unchanged).
   */
  | { kind: 'RecruitFromCamp'; heroId: HeroId; siteId: SiteId; quantity: number; creatureId?: CreatureId }
  /**
   * Train `quantity` of the visiting hero's base stack of `fromCreatureId` into its upgraded
   * form at a neutral hiring site that hires both forms: the price difference, no stock used.
   * `slot` picks the stack (default: the hero's first stack of that creature).
   */
  | { kind: 'TrainAtCamp'; heroId: HeroId; siteId: SiteId; fromCreatureId: CreatureId; quantity: number; slot?: number }
  /** Campaign v2: open or close a sluice (the hero stands on it). */
  | { kind: 'OperateSluice'; heroId: HeroId; siteId: SiteId }
  | { kind: 'ResolveMapEvent'; heroId: HeroId; siteId: SiteId; optionIndex: number }
  | { kind: 'OpenChest'; heroId: HeroId; siteId: SiteId; choice: 'gold' | 'xp' }
  | { kind: 'CompleteQuestHut'; heroId: HeroId; siteId: SiteId }
  | { kind: 'InvokeIntervention'; interventionId: string; townId?: TownId; heroId?: HeroId; siteId?: SiteId }
  /** Receive a divine gift at a town's Temple for Favor (the visiting hero receives hero gifts). */
  | { kind: 'ReceiveDivineGift'; townId: TownId; giftId: string; heroId?: HeroId }
  // --- Recruitment caravans (expedition kit, scenario feature `recruitmentCaravansV1`) ---
  /**
   * Buy recruits at an owned town at its prices (the shared recruitment quotes) plus the flat
   * transport fee and send them over land to another owned town as one shipment (quoteCaravan).
   * `expectedQuoteHash`: the quote the player confirmed — refused when the price or route changed.
   */
  | { kind: 'DispatchCaravan'; sourceTownId: TownId; destinationTownId: TownId; items: { creatureId: CreatureId; count: number }[]; expectedQuoteHash?: string }
  /** Send a held (or travelling) shipment to another owned town it can reach by land; no second charge (quoteCaravanReroute). */
  | { kind: 'RerouteCaravan'; caravanId: string; destinationTownId: TownId }
  /** An enemy hero attacks a caravan it can reach today: the cargo defends without a commander. */
  | { kind: 'AttackCaravan'; heroId: HeroId; caravanId: string }
  // --- Hero ships (expedition kit, scenario feature `navalMovementV1`; systems/naval.ts) ---
  /** Launch an empty ship at an owned coastal town onto a free water neighbour of the town (quoteLaunchShip). */
  | { kind: 'LaunchShip'; townId: TownId; waterCoord: HexCoord }
  /** Board an adjacent empty own or neutral ship from the shore (claims a neutral one); uses all remaining movement (quoteEmbark). */
  | { kind: 'EmbarkHero'; heroId: HeroId; shipId: ShipId }
  /** Step from the ship onto an adjacent vacant shore, leaving the empty hull; uses all remaining movement (quoteDisembark). */
  | { kind: 'DisembarkHero'; heroId: HeroId; landCoord: HexCoord }
  /** An embarked hero boards an adjacent hostile occupied ship: a `naval_boarding` battle (quoteAttackShip). */
  | { kind: 'AttackShip'; heroId: HeroId; targetShipId: ShipId }
  // --- Coastal sites and sea salvage (sea-sites kit; systems/seaSites.ts) ---
  /**
   * A hero aboard a ship beside a shipwreck explores it for the wreck's movement cost (quoteExploreWreck):
   * the stored salvage at once, or — guarded — a battle with the raiders moored alongside (the panel's
   * Explore is the confirmation). Leaving costs nothing and needs no command.
   */
  | { kind: 'ExploreWreck'; heroId: HeroId; siteId: SiteId }
  /** Take the artifact waiting at a cleared wreck; with full packs, leave one backpack item there in its place (quoteClaimWreckArtifact). */
  | { kind: 'ClaimWreckArtifact'; heroId: HeroId; siteId: SiteId; leaveInstanceId?: ArtifactInstanceId }
  // --- Tactical battle ---
  | { kind: 'BattleMove'; stackId: BattleStackId; to: BattleCell }
  | { kind: 'BattleMelee'; stackId: BattleStackId; targetId: BattleStackId; from: BattleCell }
  | { kind: 'BattleShoot'; stackId: BattleStackId; targetId: BattleStackId }
  /** Deck Harpoon (single-ship sea encounter): a stack on the deck throws at an enemy in the water; spends the activation. */
  | { kind: 'BattleHarpoon'; stackId: BattleStackId; targetId: BattleStackId }
  | { kind: 'BattleDefend'; stackId: BattleStackId }
  | { kind: 'BattleWait'; stackId: BattleStackId }
  | { kind: 'BattleCastSpell'; spellId: SpellId; targetId: BattleStackId; statusSourceId?: string; destination?: BattleCell; secondTargetId?: BattleStackId; cells?: BattleCell[] }
  | { kind: 'BattleActivateArtifact'; artifactId: string; targetId: BattleStackId; statusSourceId?: string }
  | { kind: 'BattleUseAbility'; stackId: BattleStackId; abilityId: string; targetId: BattleStackId }
  | { kind: 'BattleAttackStructure'; stackId: BattleStackId; structureId: string }
  | { kind: 'BattleSelectDefenders'; picks: number[] }
  /** Before a siege: combine identical defender stacks (garrison and visitor) into one (2026-10-07). */
  | { kind: 'BattleMergeDefenders' }
  /**
   * The siege attacker aims the Catapult at an intact structure (2026-10-07). Legacy sieges: for the
   * next round starts. With a targetable catapult (`targetableCatapultV1`): the explicit target of its
   * engine phase (on an attacker activation or in the phase itself; the engine must stand).
   */
  | { kind: 'BattleAimCatapult'; structureId: string }
  /**
   * `targetableCatapultV1`: in the attacker's engine phase of round `expectedRound`, fire at an intact
   * structure (guaranteed hit for `catapultDamage` structure HP). Once per round; a retry is refused.
   */
  | { kind: 'BattleFireCatapult'; structureId: string; expectedRound: number }
  /** `targetableCatapultV1`: end the attacker's engine phase of round `expectedRound` without a shot. */
  | { kind: 'BattleSkipCatapult'; expectedRound: number }
  /** The active stack strikes (`melee`, landing on `from`) or shoots (`shot`) the enemy siege engine. */
  | { kind: 'BattleAttackEngine'; stackId: BattleStackId; engineId: string; mode: 'melee' | 'shot'; from?: BattleCell }
  /** The commander casts a direct or area damage spell at the enemy siege engine. */
  | { kind: 'BattleCastAtEngine'; spellId: SpellId; engineId: string }
  | { kind: 'BattleDeploy'; stackId: BattleStackId; to: BattleCell }
  | { kind: 'BattleConfirmDeployment' }
  | { kind: 'BattleRetreat' }
  | { kind: 'BattleResolveShadow'; to: BattleCell }
  | { kind: 'BattleSurrender' }
  | { kind: 'BattleInvokeIntervention'; interventionId: string; targetId?: BattleStackId; secondTargetId?: BattleStackId };

export type CommandKind = CommandPayload['kind'];

export type GameCommand = CommandPayload & {
  readonly commandId: CommandId;
  readonly expectedRevision: number;
  readonly actorPlayerId: PlayerId;
  /**
   * Chosen by automation (the tactical AI: auto-combat, quick battles), not by the player.
   * Refused for a human side of a campaign battle (`automationForbidden`, 2026-10-15).
   */
  readonly automated?: boolean;
};

export const BATTLE_COMMAND_KINDS: ReadonlySet<CommandKind> = new Set<CommandKind>([
  'BattleResolveShadow',
  'BattleMove',
  'BattleMelee',
  'BattleShoot',
  'BattleHarpoon',
  'BattleDefend',
  'BattleWait',
  'BattleCastSpell',
  'BattleActivateArtifact',
  'BattleUseAbility',
  'BattleAttackStructure',
  'BattleSelectDefenders',
  'BattleMergeDefenders',
  'BattleAimCatapult',
  'BattleFireCatapult',
  'BattleSkipCatapult',
  'BattleAttackEngine',
  'BattleCastAtEngine',
  'BattleDeploy',
  'BattleConfirmDeployment',
  'BattleRetreat',
  'BattleSurrender',
  'BattleInvokeIntervention',
]);
