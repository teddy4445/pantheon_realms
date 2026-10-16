/**
 * TurnOrderResolver and activation flow for tactical battles (design/04 §2, §6).
 *
 * Round start: expire statuses, reset retaliations and cast allowances, snapshot
 * Speed order (fastest first; ties alternate side priority by round, then stable ID).
 * Normal phase, then a waiting phase from slowest to fastest. Morale: negative
 * checked at the first activation of the round; positive after an ordinary action.
 */
import type { BattleStackId } from '../../ids';
import type { ContentCatalog } from '../../definitions/catalog';
import type { BattleSideId, BattleStackState, BattleState } from '../../state/match';
import type { Tx } from '../../engine/tx';
import { effectiveMorale, effectiveSpeed, isAlive, sideStacks } from './common';
import { resolveBattle } from './resolution';
import { siegeRoundStart } from './siege';
import { expireOnActivation } from './neutralAbilities';

function sidePriority(round: number, side: BattleSideId): number {
  const attackerFirst = round % 2 === 1;
  return (side === 'attacker') === attackerFirst ? 0 : 1;
}

export function orderStacks(
  catalog: ContentCatalog,
  battle: BattleState,
  ids: readonly BattleStackId[],
  direction: 'fast_first' | 'slow_first',
): BattleStackId[] {
  const round = battle.round;
  const speedOf = (id: BattleStackId) => effectiveSpeed(catalog, battle.stacks[id]!, battle);
  return [...ids].sort((a, b) => {
    const sa = speedOf(a);
    const sb = speedOf(b);
    if (sa !== sb) return direction === 'fast_first' ? sb - sa : sa - sb;
    const pa = sidePriority(round, battle.stacks[a]!.side);
    const pb = sidePriority(round, battle.stacks[b]!.side);
    if (pa !== pb) return pa - pb;
    return a < b ? -1 : 1;
  });
}

/** Preview of the remaining activation order this round plus the next round (read-only). */
export function turnOrderPreview(catalog: ContentCatalog, battle: BattleState): { current: BattleStackId[]; next: BattleStackId[] } {
  const current: BattleStackId[] = [];
  if (battle.activeStackId) current.push(battle.activeStackId);
  const remainingNormal = battle.normalQueue.filter((id) => isAlive(battle.stacks[id]!));
  current.push(...remainingNormal);
  const waiting = orderStacks(catalog, battle, battle.waitQueue.filter((id) => isAlive(battle.stacks[id]!)), 'slow_first');
  current.push(...waiting.filter((id) => !current.includes(id)));
  const nextBattle = { ...battle, round: battle.round + 1 };
  const alive = Object.values(battle.stacks).filter(isAlive).map((s) => s.id);
  const next = orderStacks(catalog, nextBattle, alive, 'fast_first');
  return { current, next };
}

export function startRound(tx: Tx, battle: BattleState, round: number): void {
  battle.round = round;
  tx.emit({ kind: 'BattleRoundStarted', round });
  for (const s of Object.values(battle.stacks)) {
    s.statuses = s.statuses.filter((st) => st.expiresAtRound > round);
    s.retaliationsUsed = 0;
    s.waited = false;
    s.moraleRolledThisRound = false;
  }
  battle.sides.attacker.castThisRound = false;
  battle.sides.defender.castThisRound = false;
  siegeRoundStart(tx, battle);
  const alive = Object.values(battle.stacks)
    .filter(isAlive)
    .map((s) => s.id);
  battle.normalQueue = orderStacks(tx.catalog, battle, alive, 'fast_first');
  battle.waitQueue = [];
  battle.phase = 'normal';
  battle.activeStackId = null;
  battle.activeIsBonus = false;
}

/** Leave the pre-battle phases (defender selection, deployment) and start round 1. */
export function beginRounds(tx: Tx, battle: BattleState): void {
  battle.deployment = null;
  battle.selection = null;
  startRound(tx, battle, 1);
  advanceActivation(tx, battle);
}

/** Returns true when the battle has ended (and resolves it). */
export function checkBattleEnd(tx: Tx, battle: BattleState): boolean {
  if (battle.status !== 'active') return true;
  const attackerAlive = sideStacks(battle, 'attacker').length > 0;
  const defenderAlive = sideStacks(battle, 'defender').length > 0;
  if (attackerAlive && defenderAlive) return false;
  resolveBattle(tx, battle, attackerAlive ? 'attacker' : 'defender', attackerAlive ? 'victory' : 'defeat');
  return true;
}

/** Activate the next eligible stack, advancing phases and rounds as needed. */
export function advanceActivation(tx: Tx, battle: BattleState): void {
  const limit = tx.profile.combat.roundLimit;
  for (let guard = 0; guard < 1000; guard++) {
    if (checkBattleEnd(tx, battle)) return;
    let nextId: BattleStackId | undefined;
    if (battle.phase === 'normal') {
      nextId = battle.normalQueue.shift();
      if (nextId === undefined) {
        battle.phase = 'waiting';
        battle.waitQueue = orderStacks(tx.catalog, battle, battle.waitQueue, 'slow_first');
        continue;
      }
    } else {
      nextId = battle.waitQueue.shift();
      if (nextId === undefined) {
        if (battle.round >= limit) {
          resolveBattle(tx, battle, 'defender', 'stalemate');
          return;
        }
        startRound(tx, battle, battle.round + 1);
        continue;
      }
    }
    const stack = battle.stacks[nextId];
    if (!stack || !isAlive(stack)) continue;
    if (activate(tx, battle, stack)) return;
  }
  throw new Error('battle activation loop did not settle');
}

/** Returns true when the stack actually receives the activation. */
function activate(tx: Tx, battle: BattleState, stack: BattleStackState): boolean {
  stack.defending = false; // Defend lasts until the start of the next scheduled activation.
  // Sheltering Wings, Distract and Reed Guard last until their user's next scheduled activation.
  expireOnActivation(battle, stack);
  battle.activeIsBonus = false;
  battle.freeShiftUsed = false;
  if (!stack.moraleRolledThisRound) {
    stack.moraleRolledThisRound = true;
    const morale = effectiveMorale(tx.catalog, battle, stack);
    if (morale < 0) {
      const combat = tx.profile.combat;
      if (tx.rng('combat').chance(Math.abs(morale), combat.negativeMoraleDenominator)) {
        tx.emit({ kind: 'BattleMorale', stackId: stack.id, positive: false });
        return false;
      }
    }
  }
  battle.activeStackId = stack.id;
  tx.emit({ kind: 'BattleStackActivated', stackId: stack.id, bonus: false });
  return true;
}

/** After an ordinary action: positive morale may grant one immediate extra activation. */
export function finishActivation(tx: Tx, battle: BattleState, stack: BattleStackState, allowMorale: boolean): void {
  if (checkBattleEnd(tx, battle)) return;
  if (allowMorale && !battle.activeIsBonus && isAlive(stack)) {
    const morale = effectiveMorale(tx.catalog, battle, stack);
    if (morale > 0 && tx.rng('combat').chance(morale, tx.profile.combat.positiveMoraleDenominator)) {
      tx.emit({ kind: 'BattleMorale', stackId: stack.id, positive: true });
      battle.activeIsBonus = true;
      battle.freeShiftUsed = false;
      battle.activeStackId = stack.id;
      tx.emit({ kind: 'BattleStackActivated', stackId: stack.id, bonus: true });
      return;
    }
  }
  battle.activeStackId = null;
  battle.activeIsBonus = false;
  advanceActivation(tx, battle);
}
