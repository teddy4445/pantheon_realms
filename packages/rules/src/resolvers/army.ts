/**
 * Army helpers: locating armies, capacity checks and stack placement.
 *
 * Seven ordered slots per army; total creature counts are conserved by every
 * transfer, split and merge.
 */
import type { CreatureId } from '../ids';
import type { ArmyRef, ArmyState, CreatureStackState, MatchState } from '../state/match';
import { requireStats, type ContentCatalog } from '../definitions/catalog';
import type { StackSpec } from '../definitions/world';

export function resolveArmy(state: MatchState, ref: ArmyRef): ArmyState | null {
  if (ref.kind === 'hero') return state.heroes[ref.heroId]?.army ?? null;
  return state.towns[ref.townId]?.garrison ?? null;
}

export function armyRefLabel(state: MatchState, ref: ArmyRef): string {
  if (ref.kind === 'hero') return state.heroes[ref.heroId]?.name ?? ref.heroId;
  return `${state.towns[ref.townId]?.name ?? ref.townId} garrison`;
}

/** Slot index where `creatureId` could be added: existing exact-form stack first, else first empty slot. */
export function placementSlot(army: ArmyState, creatureId: CreatureId): number | null {
  const merge = army.slots.findIndex((s) => s?.creatureId === creatureId);
  if (merge >= 0) return merge;
  const empty = army.slots.findIndex((s) => s === null);
  return empty >= 0 ? empty : null;
}

export function armyStacks(army: ArmyState): CreatureStackState[] {
  return army.slots.filter((s): s is CreatureStackState => s !== null && s.count > 0);
}

/**
 * Placement of several stacks into an army, in order, without changing it: the
 * slot each stack would merge into or occupy (null for a stack that does not fit).
 */
export function placementPlan(army: ArmyState, stacks: readonly StackSpec[]): (number | null)[] {
  const sim = army.slots.map((s) => (s ? s.creatureId : null));
  return stacks.map((st) => {
    const merge = sim.findIndex((c) => c === st.creatureId);
    if (merge >= 0) return merge;
    const empty = sim.findIndex((c) => c === null);
    if (empty < 0) return null;
    sim[empty] = st.creatureId;
    return empty;
  });
}

export interface CommanderBonus {
  readonly attack: number;
  readonly defense: number;
}

/**
 * Strength heuristic shared by the AI, the encounter estimate and the neutral
 * reactions (campaign/01 §7: "aggregate army HP adjusted by effective
 * Attack/Defense"): per stack count × 2·sqrt(offense × durability), with
 * offense = mean damage × (1 + 5% per Attack above 5) and durability = HP ×
 * (1 + 5% per Defense above 5). A documented heuristic, not a combat prediction.
 */
export function armyStrength(catalog: ContentCatalog, stacks: readonly (StackSpec | null)[], commander: CommanderBonus = { attack: 0, defense: 0 }): number {
  let total = 0;
  for (const s of stacks) {
    if (!s || s.count <= 0) continue;
    const { stats } = requireStats(catalog, s.creatureId);
    const atk = stats.attack + commander.attack;
    const def = stats.defense + commander.defense;
    const dmg = (stats.damageMin + stats.damageMax) / 2;
    const offense = dmg * (1 + 0.05 * (atk - 5));
    const durability = stats.hp * (1 + 0.05 * (def - 5));
    total += s.count * Math.sqrt(Math.max(0.1, offense) * Math.max(0.1, durability)) * 2;
  }
  return total;
}
