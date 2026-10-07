/**
 * Unowned towns (owner request 2026-10-07): towns that start without an owner or
 * a hero, on random maps and the authored skirmish maps. Any empire may take
 * one — walking in, or by siege when a neutral garrison holds it — and builds and
 * recruits there like in its own town. Shared by both map generators. Values are
 * proposed and unplaytested.
 */
import type { ContentCatalog, MissionTownSetup, StackSpec } from '@pr/rules';

/** Gold worth of an unowned town's neutral garrison at normal guard strength (about a guarded gold mine and a half). */
export const UNOWNED_GARRISON_VALUE = 3600;

/**
 * A town of `pantheonId` without an owner: the pantheon's skirmish town with its
 * civic hall and first dwelling only (no Tavern, no walls), half the first
 * dwelling's starting recruits, and the skirmish covenants so the whole roster
 * can be built once taken.
 */
export function unownedTownSetup(catalog: ContentCatalog, pantheonId: string, townId: string, siteId: string, name: string, garrison: readonly StackSpec[]): MissionTownSetup {
  const kit = catalog.skirmishKits[pantheonId];
  if (!kit) throw new Error(`No skirmish town for ${pantheonId}`);
  const archetype = catalog.townArchetypes[kit.archetypeId];
  const keep = (b: string) => {
    const slot = archetype?.slots.find((x) => x.chain.includes(b));
    return !!slot && (slot.kind === 'dwelling' || slot.role === 'civic_hall');
  };
  const population: Record<string, number> = {};
  for (const [fam, n] of Object.entries(kit.population)) population[fam] = Math.floor(n / 2);
  return {
    townId,
    siteId,
    name,
    archetypeId: kit.archetypeId,
    buildings: kit.buildings.filter(keep),
    population,
    covenants: kit.covenants,
    ...(garrison.length ? { garrison } : {}),
  };
}

/** The neutral garrison of an unowned town: its own pantheon's tier 2 and tier 3 creatures, worth `value` Gold. */
export function unownedTownGarrison(catalog: ContentCatalog, pantheonId: string, value: number): StackSpec[] {
  const base = (tier: number) =>
    Object.values(catalog.families)
      .filter((f) => f.pantheonId === pantheonId && f.tier === tier)
      .map((f) => catalog.creatures[f.baseCreatureId])
      .find((c) => !!c && c.implementationStatus === 'implemented' && (c.cost?.gold ?? 0) > 0);
  const out: StackSpec[] = [];
  for (const [tier, share] of [
    [2, 0.55],
    [3, 0.45],
  ] as const) {
    const c = base(tier);
    if (c) out.push({ creatureId: c.id, count: Math.max(1, Math.round((value * share) / (c.cost?.gold ?? 100))) });
  }
  return out;
}

/** Pantheons a random map may give an unowned town "of another pantheon": every skirmish pantheon but `own`, stable order. */
export function otherPantheons(catalog: ContentCatalog, own: string): string[] {
  return Object.keys(catalog.skirmishKits)
    .filter((p) => p !== own)
    .sort();
}
