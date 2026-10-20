import type { ContentCatalog } from '../definitions/catalog';
import type { StackSpec } from '../definitions/world';

/** Stable personal escorts: numerous low tiers, a small specialist contingent. */
export function heroStartingArmy(catalog: ContentCatalog, definitionId: string, authored?: readonly StackSpec[]): StackSpec[] {
  const hero = catalog.heroes[definitionId];
  if (!hero) return authored?.map(s => ({ ...s })) ?? [];
  const peers = Object.values(catalog.heroes).filter(h => h.pantheonId === hero.pantheonId).map(h => h.id).sort();
  const index = Math.max(0, peers.indexOf(definitionId));
  const families = Object.values(catalog.families).filter(f => f.pantheonId === hero.pantheonId).sort((a,b) => a.tier-b.tier);
  const army: StackSpec[] = authored?.length
    ? authored.map(s => ({ ...s, count: Math.max(1, s.count + ((index + (catalog.creatures[s.creatureId]?.tier ?? 1)) % 3) - 1) }))
    : families.slice(0,2).map(f => ({ creatureId: f.baseCreatureId, count: f.tier === 1 ? 9 + index % 5 : 3 + Math.floor(index / 5) % 3 }));
  const specialist = hero.specialty?.familyId ? catalog.families[hero.specialty.familyId] : undefined;
  if (specialist && !army.some(s => catalog.creatures[s.creatureId]?.familyId === specialist.id)) {
    const stack = { creatureId: specialist.baseCreatureId, count: specialist.tier <= 3 ? 3 : specialist.tier === 4 ? 2 : 1 };
    if (army.length >= catalog.rulesProfile.armySlots) army[army.length - 1] = stack;
    else army.push(stack);
  }
  return army;
}
