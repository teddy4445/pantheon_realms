/**
 * ThreatEvaluator / strength heuristics. These are documented heuristics, not
 * proven combat outcomes (campaign/01 §7: "aggregate army HP adjusted by
 * effective Attack/Defense", attack threshold 1.10).
 */
import { armyStrength, type CommanderBonus, type ContentCatalog, type StackSpec } from '@pr/rules';

/** The shared strength heuristic now lives in the rules (neutral reactions use it too). */
export { armyStrength, type CommanderBonus } from '@pr/rules';

/**
 * How much more a stack of few creatures fights than the shared heuristic says:
 * (n + 1) / n — twice for one creature, half again for two, about 1 for big stacks.
 * A stack's damage falls only as whole creatures die, so a lone big creature hits
 * at full force until its last hit point, where the heuristic assumes a steady
 * decline. Measured 2026-10-06 (`npm run balance`-style duels, 4 seeds per point,
 * six pantheons): a single tier-7 creature held off mixed armies of about 2.5×
 * its heuristic strength (2.1–2.8); with this factor the break-even is 1.2–1.45,
 * in line with other single-stack guards (1.2–1.8) — the AI's margins cover that.
 */
export function fewCreaturesFactor(count: number): number {
  return count > 0 ? (count + 1) / count : 0;
}

/** Fighting strength as the AI judges an army: the shared heuristic per stack × `fewCreaturesFactor`. */
export function fightingStrength(catalog: ContentCatalog, stacks: readonly (StackSpec | null | undefined)[], commander?: CommanderBonus): number {
  let total = 0;
  for (const s of stacks) if (s && s.count > 0) total += armyStrength(catalog, [s], commander) * fewCreaturesFactor(s.count);
  return total;
}

export function stackValue(catalog: ContentCatalog, creatureId: string): number {
  const def = catalog.creatures[creatureId];
  return (def?.cost?.gold ?? 100) + (def?.cost?.crystal ?? 0) * 500;
}
