/**
 * Renewable shots (sea-creature delivery 2026-10-17): a stack whose creature has the
 * `renewable_shots` ability has its ammunition set to the ability's capacity at the start of every
 * battle round, round 1 included. Explicit per creature (the swimmers' innate sea attacks), never a
 * global infinite ammunition: ordinary shooters keep their per-battle shots. Refilling grants no
 * action; a shot still spends one shot and the stack's activation, so a second shot in one round
 * needs an extra activation (positive morale). Called by `startRound` only, so a reload never refills
 * twice: the shots left are part of the saved battle state.
 */
import type { CreatureId } from '../../ids';
import type { ContentCatalog } from '../../definitions/catalog';
import type { BattleState } from '../../state/match';
import { findAbility, isAlive } from './common';

/** The creature's renewable capacity (null: its shots do not renew). */
export function renewableShotCapacity(catalog: ContentCatalog, creatureId: CreatureId): number | null {
  const rule = findAbility(catalog, creatureId, 'renewable_shots');
  return rule ? Math.max(0, Math.floor(rule.capacity)) : null;
}

/** Round start: every living stack with renewable shots holds exactly its capacity again. */
export function renewShots(catalog: ContentCatalog, battle: BattleState): void {
  for (const s of Object.values(battle.stacks)) {
    if (!isAlive(s)) continue;
    const cap = renewableShotCapacity(catalog, s.creatureId);
    if (cap !== null) s.shotsRemaining = cap;
  }
}
