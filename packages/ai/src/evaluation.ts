/**
 * ThreatEvaluator / strength heuristics. These are documented heuristics, not
 * proven combat outcomes (campaign/01 §7: "aggregate army HP adjusted by
 * effective Attack/Defense", attack threshold 1.10).
 */
import { requireStats, type ContentCatalog, type StackSpec } from '@pr/rules';

export interface CommanderBonus {
  readonly attack: number;
  readonly defense: number;
}

/** Strength = sum(count * hp) * (1 + 0.05 * (atk - 5)) * (1 + 0.05 * (def - 5)), per stack. */
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

export function stackValue(catalog: ContentCatalog, creatureId: string): number {
  const def = catalog.creatures[creatureId];
  return (def?.cost?.gold ?? 100) + (def?.cost?.crystal ?? 0) * 500;
}
