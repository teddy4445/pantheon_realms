import { cellEquals, cellNeighbors, type BattleCell } from '../../core/hex';
import type { BattleStackState, BattleState } from '../../state/match';
import { reject, type Tx } from '../../engine/tx';
import { isAlive, requireBattle } from './common';
import { forcedMoveProblem } from './seaBoard';
import { originalGroup } from './libraryRelics';
import { applyFrostEntry } from './libraryFields';
import { finishActivation } from './flow';
import { battleEnded } from './actions';

/** Replace only a hostile displacement. The triggering action's damage/cost has already committed. */
export function requestFaithfulShadow(tx: Tx, battle: BattleState, target: BattleStackState): boolean {
  if (!target.statuses.some((s) => s.kind === 'faithful_shadow' && s.expiresAtRound > battle.round)) return false;
  for (const s of originalGroup(battle, target)) s.statuses = s.statuses.filter((st) => st.kind !== 'faithful_shadow');
  const options = cellNeighbors(target.anchor, battle.cols, battle.rows).filter((c) => !forcedMoveProblem(tx.catalog, battle, target, c));
  tx.emit({ kind: 'BattleStatusConsumed', stackId: target.id, status: 'faithful_shadow' });
  // A fully surrounded stack remains in place; no displacement and no extra attack.
  if (!options.length) return true;
  battle.shadowChoice = { stackId: target.id, from: { ...target.anchor }, options };
  return true;
}
export function commitResolveShadow(tx: Tx, to: BattleCell): void {
  const battle = requireBattle(tx.state), choice = battle.shadowChoice;
  if (!choice) reject('illegal_action', 'No shadow step is pending');
  const target = battle.stacks[choice.stackId];
  if (!target || !isAlive(target) || battle.sides[target.side].playerId !== tx.actorId) reject('not_owner', 'The marked stack’s owner chooses the shadow step');
  if (!choice.options.some((c) => cellEquals(c, to)) || forcedMoveProblem(tx.catalog, battle, target, to)) reject('illegal_target', 'Choose one of the highlighted adjacent legal footprints');
  delete battle.shadowChoice;
  target.anchor = { ...to };
  tx.emit({ kind: 'BattleStackMoved', stackId: target.id, path: [choice.from, to], flying: true });
  applyFrostEntry(tx, battle, target, choice.from, to);
  if (battleEnded(tx, battle)) return;
  if (choice.resume) {
    const actor = battle.stacks[choice.resume.stackId];
    if (actor) finishActivation(tx, battle, actor, choice.resume.allowMorale);
  }
}
