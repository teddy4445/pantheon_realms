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
import { commitEndTurn } from '../systems/turn';
import {
  commitConstruction,
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
import { commitCampRecruitment, commitResolveMapEvent } from '../systems/world';
import { commitCompleteQuestHut, commitOpenChest } from '../systems/sites';
import { commitBattleIntervention, commitIntervention } from '../systems/interventions';
import { evaluateStory } from '../systems/story';
import { commitAssignCovenant, commitSelectGod } from '../systems/divine';
import { commitClaimObjective, evaluateMissionOutcome, evaluateObjectives } from '../systems/quests';
import {
  NEUTRAL_PLAYER_ID,
  commitBattleAbility,
  commitBattleAttackStructure,
  commitBattleCast,
  commitBattleDefend,
  commitBattleMelee,
  commitBattleMove,
  commitBattleRetreat,
  commitBattleShoot,
  commitBattleSurrender,
  commitBattleWait,
} from '../systems/battle/actions';
import { commitBattleConfirmDeployment, commitBattleDeploy, commitBattleSelectDefenders } from '../systems/battle/deployment';

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
  } else {
    if (state.battle) return fail('battle_in_progress', 'Resolve the battle first');
    if (command.actorPlayerId !== state.activePlayerId) return fail('not_your_turn', 'It is not your turn');
    const pending = state.pendingDecisions.some((d) => state.heroes[d.heroId]?.ownerId === command.actorPlayerId);
    if (pending && command.kind !== 'ChooseLevelUp') {
      return fail('decision_pending', 'Resolve the pending level-up choice first');
    }
  }
  if (!isBattle && command.actorPlayerId === NEUTRAL_PLAYER_ID) return fail('not_owner', 'Invalid actor');

  const draft = deepClone(state);
  const tx = new Tx(ctx, draft, command.actorPlayerId);
  try {
    dispatch(tx, command);
    updateGates(tx);
    evaluateObjectives(tx);
    evaluateMissionOutcome(tx);
    evaluateStory(tx);
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
      return commitCampRecruitment(tx, c.heroId, c.siteId, c.quantity);
    case 'ResolveMapEvent':
      return commitResolveMapEvent(tx, c.heroId, c.siteId, c.optionIndex);
    case 'OpenChest':
      return commitOpenChest(tx, c.heroId, c.siteId, c.choice);
    case 'CompleteQuestHut':
      return commitCompleteQuestHut(tx, c.heroId, c.siteId);
    case 'InvokeIntervention':
      return commitIntervention(tx, c.interventionId, c.townId ?? null);
    case 'ReceiveDivineGift':
      return commitDivineGift(tx, c.townId, c.giftId, c.heroId ?? null);
    case 'BattleInvokeIntervention':
      return commitBattleIntervention(tx, c.interventionId, c.targetId ?? null);
    case 'RecruitUnits':
      return commitRecruitment(tx, c.townId, c.creatureId, c.quantity, c.destination);
    case 'UpgradeStack':
      return commitUpgrade(tx, c.townId, c.army, c.slot, c.quantity);
    case 'TransferStack':
      return commitTransfer(tx, c.from, c.fromSlot, c.to, c.toSlot, c.quantity);
    case 'SelectGod':
      return commitSelectGod(tx, c.godId);
    case 'AssignCovenant':
      return commitAssignCovenant(tx, c.townId, c.entitlementId);
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
      return commitLevelUpChoice(tx, c.decisionId, c.offerIndex);
    case 'BattleMove':
      return commitBattleMove(tx, c.stackId, c.to);
    case 'BattleMelee':
      return commitBattleMelee(tx, c.stackId, c.targetId, c.from);
    case 'BattleShoot':
      return commitBattleShoot(tx, c.stackId, c.targetId);
    case 'BattleDefend':
      return commitBattleDefend(tx, c.stackId);
    case 'BattleWait':
      return commitBattleWait(tx, c.stackId);
    case 'BattleCastSpell':
      return commitBattleCast(tx, c.spellId, c.targetId);
    case 'BattleUseAbility':
      return commitBattleAbility(tx, c.stackId, c.abilityId, c.targetId);
    case 'BattleAttackStructure':
      return commitBattleAttackStructure(tx, c.stackId, c.structureId);
    case 'BattleSelectDefenders':
      return commitBattleSelectDefenders(tx, c.picks);
    case 'BattleDeploy':
      return commitBattleDeploy(tx, c.stackId, c.to);
    case 'BattleConfirmDeployment':
      return commitBattleConfirmDeployment(tx);
    case 'CastAdventureSpell':
      return commitCastAdventureSpell(tx, c.heroId, c.spellId, c.target);
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
