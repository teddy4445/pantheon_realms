/**
 * ThreatEvaluator / strength heuristics. These are documented heuristics, not
 * proven combat outcomes (campaign/01 §7: "aggregate army HP adjusted by
 * effective Attack/Defense", attack threshold 1.10).
 */
import type { ContentCatalog } from '@pr/rules';

/** The shared strength heuristic now lives in the rules (neutral reactions use it too). */
export { armyStrength, type CommanderBonus } from '@pr/rules';

export function stackValue(catalog: ContentCatalog, creatureId: string): number {
  const def = catalog.creatures[creatureId];
  return (def?.cost?.gold ?? 100) + (def?.cost?.crystal ?? 0) * 500;
}
