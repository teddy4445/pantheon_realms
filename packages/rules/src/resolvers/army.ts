/**
 * Army helpers: locating armies, capacity checks and stack placement.
 *
 * Seven ordered slots per army; total creature counts are conserved by every
 * transfer, split and merge.
 */
import type { CreatureId } from '../ids';
import type { ArmyRef, ArmyState, CreatureStackState, MatchState } from '../state/match';
import { ARMY_SLOT_COUNT } from '../state/match';

export function emptyArmy(): ArmyState {
  return { slots: Array.from({ length: ARMY_SLOT_COUNT }, () => null) };
}

export function resolveArmy(state: MatchState, ref: ArmyRef): ArmyState | null {
  if (ref.kind === 'hero') return state.heroes[ref.heroId]?.army ?? null;
  return state.towns[ref.townId]?.garrison ?? null;
}

export function armyRefLabel(state: MatchState, ref: ArmyRef): string {
  if (ref.kind === 'hero') return state.heroes[ref.heroId]?.name ?? ref.heroId;
  return `${state.towns[ref.townId]?.name ?? ref.townId} garrison`;
}

export function armyRefEquals(a: ArmyRef, b: ArmyRef): boolean {
  if (a.kind === 'hero' && b.kind === 'hero') return a.heroId === b.heroId;
  if (a.kind === 'garrison' && b.kind === 'garrison') return a.townId === b.townId;
  return false;
}

/** Slot index where `creatureId` could be added: existing exact-form stack first, else first empty slot. */
export function placementSlot(army: ArmyState, creatureId: CreatureId): number | null {
  const merge = army.slots.findIndex((s) => s?.creatureId === creatureId);
  if (merge >= 0) return merge;
  const empty = army.slots.findIndex((s) => s === null);
  return empty >= 0 ? empty : null;
}

export function armyIsEmpty(army: ArmyState): boolean {
  return army.slots.every((s) => s === null || s.count <= 0);
}

export function armyStacks(army: ArmyState): CreatureStackState[] {
  return army.slots.filter((s): s is CreatureStackState => s !== null && s.count > 0);
}

export function normalizeArmy(army: ArmyState): void {
  for (let i = 0; i < army.slots.length; i++) {
    const s = army.slots[i];
    if (s && s.count <= 0) army.slots[i] = null;
  }
}
