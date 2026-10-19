import { cellNeighbors, type BattleCell } from '../../core/hex';
import type { ContentCatalog } from '../../definitions/catalog';
import type { SpellEffect } from '../../definitions/pantheons';
import type { BattleStackState, BattleState } from '../../state/match';
import type { Tx } from '../../engine/tx';
import { aliveCount, isAlive, statsOf } from './common';
import { placementProblem } from './seaBoard';

export function permanentHp(stack: BattleStackState): number { return stack.summoned ? 0 : Math.max(0, stack.totalHp - (stack.temporaryLife?.hp ?? 0)); }
export function livingOriginal(catalog: ContentCatalog, stack: BattleStackState): boolean {
  return !stack.summoned && !catalog.creatures[stack.creatureId]?.traits?.some((t) => t === 'undead' || t === 'construct');
}
export function illusionDestinations(catalog: ContentCatalog, battle: BattleState, stack: BattleStackState): BattleCell[] {
  if (!isAlive(stack) || !livingOriginal(catalog, stack) || Object.values(battle.stacks).some((s) => s.side === stack.side && s.summoned?.kind === 'illusion' && isAlive(s))) return [];
  return cellNeighbors(stack.anchor, battle.cols, battle.rows).filter((c) => !placementProblem(catalog, battle, { creatureId: stack.creatureId, anchor: c, facing: stack.facing, side: stack.side }));
}
export function lifeSpellReason(catalog: ContentCatalog, battle: BattleState, stack: BattleStackState, effect: SpellEffect): string | null {
  if (effect.type === 'banish_summon') return stack.summoned ? null : 'Choose a summoned creature or illusion';
  if (effect.type === 'illusion_copy') return illusionDestinations(catalog, battle, stack).length ? null : 'Requires a living original stack, a free adjacent footprint, and no existing allied illusion';
  if (effect.type !== 'temporary_restore') return null;
  if (!livingOriginal(catalog, stack)) return 'Only original living troops can return';
  if (stack.temporaryLife?.hp) return 'A temporary return is already active';
  if (stack.totalHp >= stack.startingCount * statsOf(catalog, stack.creatureId).hp) return 'This stack has no missing HP';
  if (!isAlive(stack) && placementProblem(catalog, battle, { creatureId: stack.creatureId, anchor: stack.anchor, facing: stack.facing, side: stack.side, ignoreStackId: stack.id })) return 'The fallen stack’s footprint is occupied or no longer legal';
  return null;
}
export function restoreTemporaryLife(catalog: ContentCatalog, battle: BattleState, stack: BattleStackState, amount: number, duration: number): number {
  const healed = Math.min(amount, stack.startingCount * statsOf(catalog, stack.creatureId).hp - stack.totalHp);
  const wasDead = !isAlive(stack);
  stack.totalHp += healed;
  stack.temporaryLife = { hp: healed, expiresAtRound: battle.round + duration };
  // Return to the normal queue only if its scheduled activation has not already been spent.
  // A resurrected stack never receives an extra activation during the casting round.
  if (wasDead) stack.waited = true;
  return healed;
}
export function createIllusion(tx: Tx, battle: BattleState, source: BattleStackState, destination: BattleCell, duration: number): void {
  const id = `${battle.battleId}:illusion:${source.side}:${tx.state.revision}`;
  const copy: BattleStackState = {
    ...source, id, anchor: { ...destination }, startingCount: 0, totalHp: 1, killedByEnemy: 0,
    statuses: [], abilityUses: {}, retaliationsUsed: 0, waited: false, defending: false,
    moraleRolledThisRound: true, temporaryLife: undefined, controlGrace: undefined,
    summoned: { kind: 'illusion', sourceId: source.id, sourceCount: aliveCount(tx.catalog, source), expiresAtRound: battle.round + duration },
  };
  battle.stacks[id] = copy;
  // It joins at the end of this round, once; never steals the source stack's action.
  battle.normalQueue.push(id);
}

/** Natural expiration does not call hostile damage, grant XP or trigger any on-death effect. */
export function expireTemporaryLife(tx: Tx, battle: BattleState, round: number): void {
  for (const s of Object.values(battle.stacks)) {
    const before = s.totalHp;
    if (s.temporaryLife && s.temporaryLife.expiresAtRound <= round) { s.totalHp = permanentHp(s); delete s.temporaryLife; }
    if (s.summoned && s.summoned.expiresAtRound <= round) s.totalHp = 0;
    if (before > 0 && s.totalHp <= 0) {
      tx.emit({ kind: 'BattleStackDestroyed', stackId: s.id });
      battle.normalQueue = battle.normalQueue.filter((id) => id !== s.id);
      battle.waitQueue = battle.waitQueue.filter((id) => id !== s.id);
    }
  }
}
