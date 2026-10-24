import { commitCheat } from '../systems/cheats';
/**
 * CommandProcessor: the single authoritative mutation path.
 *
 *   GameCommand -> validate (identity, revision, actor, phase) -> system handler on a
 *   draft -> objective/outcome evaluation -> commit (revision + 1) -> GameEvent[]
 *
 * Human UI, AI planners and campaign scripts all call processCommand. A failed
 * command returns a structured rejection and the original state is untouched.
 */
import type { CommandId, EventId } from '../ids';
import { deepClone } from '../core/clone';
import { BATTLE_COMMAND_KINDS, type GameCommand } from '../commands/commands';
import type { GameEvent } from '../events/events';
import type { MatchState } from '../state/match';
import { RejectionError, Tx, type Rejection, type RulesContext } from './tx';
import { commitClaimCourierParcel } from '../systems/libraryCourier';
import { commitSelectSeedTown } from '../systems/libraryEconomy';
import { commitResolveShadow } from '../systems/battle/libraryShadow';
import { settleCoalition, commitSelectCoalitionSeat } from '../systems/coalition';
import { commitEndTurn } from '../systems/turn';
import {
  commitConstruction,
  commitRecruitBatch,
  commitRecruitment,
  commitTrade,
  commitTransfer,
  commitUpgrade,
} from '../systems/economy';
import { commitActivateSite, commitMoveHero, updateGates } from '../systems/adventure';
import { commitBuySpellbook, commitEquip, commitHireHero, commitLevelUpChoice, commitUnequip } from '../systems/heroes';
import { commitCastAdventureSpell } from '../systems/magic';
import { commitArtifactPurchase, commitOffering, commitTraining, refreshTownShops } from '../systems/services';
import { commitDivineGift } from '../systems/gifts';
import { commitCampRecruitment, commitCampTraining, commitResolveMapEvent } from '../systems/world';
import { commitCompleteQuestHut, commitOpenChest } from '../systems/sites';
import { commitBattleIntervention, commitIntervention } from '../systems/interventions';
import { evaluateStory } from '../systems/story';
import { refreshIntelSnapshots } from '../systems/intel';
import { commitOperateSluice, evaluateTimers, withdrawPatrols } from '../systems/pressure';
import { commitAssignCovenant, commitSelectGod } from '../systems/divine';
import { commitDedicateTown, commitScheduleTownRededication } from '../systems/dedicationSystem';
import { commitClaimObjective, evaluateMissionOutcome, evaluateObjectives } from '../systems/quests';
import {
  NEUTRAL_PLAYER_ID,
  commitBattleAbility,
  commitBattleAttackEngine,
  commitBattleAttackStructure,
  commitBattleCast,
  commitBattleCastAtEngine,
  commitBattleDefend,
  commitBattleMelee,
  commitBattleMove,
  commitBattleRetreat,
  commitBattleShoot,
  commitBattleSurrender,
  commitBattleWait,
} from '../systems/battle/actions';
import { commitBattleConfirmDeployment, commitBattleDeploy, commitBattleMergeDefenders, commitBattleSelectDefenders } from '../systems/battle/deployment';
import { commitBattleAimCatapult, commitBattleFireCatapult, commitBattleSkipCatapult } from '../systems/battle/siege';
import { MANUAL_BATTLE_MESSAGE, automationForbidden } from '../systems/battle/policy';
import { commitBattleHarpoon } from '../systems/battle/seaBoard';
import { commitAttackCaravan, commitDispatchCaravan, commitRerouteCaravan } from '../systems/caravans';
import { commitAttackShip, commitDisembarkHero, commitEmbarkHero, commitLaunchShip, reconcileShips } from '../systems/naval';
import { commitClaimWreckArtifact, commitExploreWreck, refreshSeaWatch } from '../systems/seaSites';
import { processLibraryAdventureEvents } from '../systems/libraryAdventure';
import { commitActivateArtifact } from '../systems/battle/activeRelics';

export type CommandResult =
  | { readonly ok: true; readonly state: MatchState; readonly events: readonly GameEvent[] }
  | { readonly ok: false; readonly rejection: Rejection };

const MAX_REMEMBERED_COMMANDS = 256;

function fail(code: Rejection['code'], message: string): CommandResult {
  return { ok: false, rejection: { code, message } };
}

export function processCommand(ctx: RulesContext, state: MatchState, command: GameCommand): CommandResult {
  if (state.processedCommandIds.includes(command.commandId)) {
    return fail('duplicate_command', 'This command was already processed');
  }
  if (command.expectedRevision !== state.revision) {
    return fail('stale_revision', 'The game state changed; refresh and try again');
  }
  if (state.outcome.status !== 'running') return fail('match_over', 'This match has ended');

  const isBattle = BATTLE_COMMAND_KINDS.has(command.kind);
  if (isBattle) {
    if (!state.battle) return fail('no_battle', 'No battle in progress');
    if (state.battle.shadowChoice && command.kind !== 'BattleResolveShadow') return fail('decision_pending', 'Resolve Xolotl’s shadow step first');
    // Campaign battles are fought by hand: automation never orders a human side (handoff 2026-10-15).
    if (command.automated && automationForbidden(state)) return fail('manual_battle_required', MANUAL_BATTLE_MESSAGE);
  } else {
    if (state.battle) return fail('battle_in_progress', 'Resolve the battle first');
    if (command.actorPlayerId !== state.activePlayerId) return fail('not_your_turn', 'It is not your turn');
    const pending = state.pendingDecisions.some((d) => state.heroes[d.heroId]?.ownerId === command.actorPlayerId);
    if (pending && command.kind !== 'ChooseLevelUp') {
      return fail('decision_pending', 'Resolve the pending level-up choice first');
    }
  }
  if (state.standalone && !isBattle) return fail('not_in_scope', 'Only battle orders are available in Single Battle');
  if (!isBattle && command.actorPlayerId === NEUTRAL_PLAYER_ID) return fail('not_owner', 'Invalid actor');

  const draft = deepClone(state);
  const tx = new Tx(ctx, draft, command.actorPlayerId);
  try {
    // Scouting intel: a match's first command also records what every player saw at the start.
    if (draft.intel === undefined && !draft.battle) refreshIntelSnapshots(tx.catalog, draft);
    dispatch(tx, command);
    if (draft.standalone) {
      draft.standalone.commands.push(deepClone(command));
      const totals = draft.standalone.damage ??= { attacker: 0, defender: 0 };
      for (const e of tx.events) {
        if (e.kind === 'BattleAttack') {
          const side = state.battle?.stacks[e.attackerId]?.side;
          if (side) totals[side] += e.damage;
        } else if (e.kind === 'SiegeTurretShot') totals.defender += e.damage;
      }
    }
    if (!draft.standalone) {
    // Hero ships (navalMovementV1): no hull keeps a hero who left it (a cheap consistency guard).
    reconcileShips(tx);
    // Coastal watchtowers (sea-sites kit): "Enemy ship sighted" alerts, once the map is settled.
    if (!tx.state.battle) refreshSeaWatch(tx);
    updateGates(tx);
    // Campaign v2 pressure: patrols whose home camp fell withdraw; announced deadlines advance.
    withdrawPatrols(tx);
    evaluateObjectives(tx);
    evaluateTimers(tx);
    // A flag set just now by an objective reward or an expired deadline (an ice road, a
    // tide) opens its gate within the same command, not on the next one.
    updateGates(tx);
    evaluateMissionOutcome(tx);
    evaluateStory(tx);
    processLibraryAdventureEvents(tx);
    settleCoalition(state, draft);
    // Scouting intel (`scoutingIntelV1`): every player's snapshots follow what it sees now,
    // once the map is settled (not while a battle runs; its end brings the update).
    if (!tx.state.battle) refreshIntelSnapshots(tx.catalog, tx.state, tx.events);
    }
    tx.finalize();
  } catch (err) {
    if (err instanceof RejectionError) return { ok: false, rejection: err.rejection };
    throw err;
  }
  draft.revision = state.revision + 1;
  draft.processedCommandIds.push(command.commandId as CommandId);
  if (draft.processedCommandIds.length > MAX_REMEMBERED_COMMANDS) {
    draft.processedCommandIds.splice(0, draft.processedCommandIds.length - MAX_REMEMBERED_COMMANDS);
  }
  const events: GameEvent[] = tx.events.map((e, i) => ({
    ...e,
    eventId: `${draft.revision}.${i}` as EventId,
    revision: draft.revision,
  }));
  return { ok: true, state: draft, events };
}

function dispatch(tx: Tx, c: GameCommand): void {
  switch (c.kind) {
    case 'InvokeCheat': return commitCheat(tx, c.effect);
    case 'SelectCoalitionSeat': return commitSelectCoalitionSeat(tx, c.playerId);
    case 'EndTurn':
      return commitEndTurn(tx);
    case 'MoveHero':
      return commitMoveHero(tx, c.heroId, c.destination, c.confirmEncounter === true, c.encounterChoice ?? 'fight');
    case 'BuildStructure': {
      commitConstruction(tx, c.townId, c.buildingId);
      const town = tx.state.towns[c.townId];
      if (town) refreshTownShops(tx, town);
      return;
    }
    case 'MakeOffering':
      return commitOffering(tx, c.townId, c.offerings);
    case 'TrainHero':
      return commitTraining(tx, c.townId, c.heroId);
    case 'BuyArtifact':
      return commitArtifactPurchase(tx, c.townId, c.heroId, c.index, c.shop ?? 'merchant');
    case 'RecruitFromCamp':
      return commitCampRecruitment(tx, c.heroId, c.siteId, c.quantity, c.creatureId);
    case 'TrainAtCamp':
      return commitCampTraining(tx, c.heroId, c.siteId, c.fromCreatureId, c.quantity, c.slot);
    case 'OperateSluice':
      return commitOperateSluice(tx, c.heroId, c.siteId);
    case 'ResolveMapEvent':
      return commitResolveMapEvent(tx, c.heroId, c.siteId, c.optionIndex);
    case 'OpenChest':
      return commitOpenChest(tx, c.heroId, c.siteId, c.choice);
    case 'CompleteQuestHut':
      return commitCompleteQuestHut(tx, c.heroId, c.siteId);
    case 'InvokeIntervention':
      return commitIntervention(tx, c.interventionId, c.townId ?? null, c.heroId, c.siteId);
    case 'ReceiveDivineGift':
      return commitDivineGift(tx, c.townId, c.giftId, c.heroId ?? null);
    case 'DispatchCaravan':
      return commitDispatchCaravan(tx, c.sourceTownId, c.destinationTownId, c.items, c.expectedQuoteHash);
    case 'RerouteCaravan':
      return commitRerouteCaravan(tx, c.caravanId, c.destinationTownId);
    case 'AttackCaravan':
      return commitAttackCaravan(tx, c.heroId, c.caravanId);
    case 'LaunchShip':
      return commitLaunchShip(tx, c.townId, c.waterCoord);
    case 'EmbarkHero':
      return commitEmbarkHero(tx, c.heroId, c.shipId);
    case 'DisembarkHero':
      return commitDisembarkHero(tx, c.heroId, c.landCoord);
    case 'AttackShip':
      return commitAttackShip(tx, c.heroId, c.targetShipId);
    case 'ExploreWreck':
      return commitExploreWreck(tx, c.heroId, c.siteId);
    case 'ClaimWreckArtifact':
      return commitClaimWreckArtifact(tx, c.heroId, c.siteId, c.leaveInstanceId ?? null);
    case 'BattleInvokeIntervention':
      return commitBattleIntervention(tx, c.interventionId, c.targetId ?? null, c.secondTargetId);
    case 'RecruitUnits':
      return commitRecruitment(tx, c.townId, c.creatureId, c.quantity, c.destination);
    case 'RecruitBatch':
      return commitRecruitBatch(tx, c.townId, c.items, c.destination);
    case 'UpgradeStack':
      return commitUpgrade(tx, c.townId, c.army, c.slot, c.quantity);
    case 'TransferStack':
      return commitTransfer(tx, c.from, c.fromSlot, c.to, c.toSlot, c.quantity);
    case 'ClaimCourierParcel':
      return commitClaimCourierParcel(tx, c.heroId);
    case 'SelectSeedTown':
      return commitSelectSeedTown(tx, c.heroId, c.townId);
    case 'SelectGod':
      return commitSelectGod(tx, c.godId);
    case 'AssignCovenant':
      return commitAssignCovenant(tx, c.townId, c.entitlementId);
    case 'DedicateTown':
      return commitDedicateTown(tx, c.townId, c.godId);
    case 'ScheduleTownRededication':
      return commitScheduleTownRededication(tx, c.townId, c.godId);
    case 'ClaimObjective':
      return commitClaimObjective(tx, c.objectiveId);
    case 'HireHero':
      return commitHireHero(tx, c.townId, c.heroDefinitionId);
    case 'BuySpellbook':
      return commitBuySpellbook(tx, c.heroId, c.townId);
    case 'TradeResources':
      return commitTrade(tx, c.townId, c.sell, c.buy, c.amount);
    case 'ActivateSite':
      return commitActivateSite(tx, c.heroId, c.siteId);
    case 'EquipArtifact':
      return commitEquip(tx, c.heroId, c.instanceId, c.slot);
    case 'UnequipArtifact':
      return commitUnequip(tx, c.heroId, c.slot);
    case 'ChooseLevelUp':
      return commitLevelUpChoice(tx, c.decisionId, c.offerIndex, c.perkIndex ?? null);
    case 'BattleResolveShadow':
      return commitResolveShadow(tx, c.to);
    case 'BattleMove':
      return commitBattleMove(tx, c.stackId, c.to);
    case 'BattleMelee':
      return commitBattleMelee(tx, c.stackId, c.targetId, c.from);
    case 'BattleShoot':
      return commitBattleShoot(tx, c.stackId, c.targetId);
    case 'BattleHarpoon':
      return commitBattleHarpoon(tx, c.stackId, c.targetId);
    case 'BattleDefend':
      return commitBattleDefend(tx, c.stackId);
    case 'BattleWait':
      return commitBattleWait(tx, c.stackId);
    case 'BattleCastSpell':
      return commitBattleCast(tx, c.spellId, c.targetId, c.statusSourceId, c.destination, c.secondTargetId, c.cells);
    case 'BattleActivateArtifact':
      return commitActivateArtifact(tx, c.artifactId, c.targetId, c.statusSourceId);
    case 'BattleUseAbility':
      return commitBattleAbility(tx, c.stackId, c.abilityId, c.targetId, c.additionalTargetIds);
    case 'BattleAttackStructure':
      return commitBattleAttackStructure(tx, c.stackId, c.structureId);
    case 'BattleSelectDefenders':
      return commitBattleSelectDefenders(tx, c.picks);
    case 'BattleMergeDefenders':
      return commitBattleMergeDefenders(tx);
    case 'BattleAimCatapult':
      return commitBattleAimCatapult(tx, c.structureId);
    case 'BattleFireCatapult':
      return commitBattleFireCatapult(tx, c.structureId, c.expectedRound);
    case 'BattleSkipCatapult':
      return commitBattleSkipCatapult(tx, c.expectedRound);
    case 'BattleAttackEngine':
      return commitBattleAttackEngine(tx, c.stackId, c.engineId, c.mode, c.from ?? null);
    case 'BattleCastAtEngine':
      return commitBattleCastAtEngine(tx, c.spellId, c.engineId);
    case 'BattleDeploy':
      return commitBattleDeploy(tx, c.stackId, c.to);
    case 'BattleConfirmDeployment':
      return commitBattleConfirmDeployment(tx);
    case 'CastAdventureSpell':
      return commitCastAdventureSpell(tx, c.heroId, c.spellId, c.target, { recipientHeroId: c.recipientHeroId, artifactInstanceId: c.artifactInstanceId });
    case 'BattleRetreat':
      return commitBattleRetreat(tx);
    case 'BattleSurrender':
      return commitBattleSurrender(tx);
    default: {
      const unknown: never = c;
      throw new Error(`Unhandled command ${(unknown as GameCommand).kind}`);
    }
  }
}
