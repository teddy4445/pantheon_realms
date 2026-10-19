/**
 * Sea-monster stacks in the map editor (sea-creature delivery 2026-10-17): where one may be placed
 * (open water only), the army it starts with (a sea family) and which creatures its guard may list
 * (sea families only). The document checks are the map validator's own (`seaMonsterCustomProblem`,
 * which applies the rules' `seaArmyProblem`); the editor never invents a second rule.
 */
import { SEA_MONSTER_KIND, seaMonsterCustomProblem, terrainAt, type CustomMapDocument, type CustomSite } from '@pr/session';
import type { ContentCatalog, CreatureDefinition, HexCoord } from '@pr/rules';

/** The site kind is a sea-monster stack. */
export function isSeaMonsterKind(kind: string): boolean {
  return kind === SEA_MONSTER_KIND;
}

/** Creatures that live only at sea (the sea families, both forms), weakest tier first. */
export function seaMonsterCreatures(catalog: ContentCatalog): CreatureDefinition[] {
  const families = new Set(Object.values(catalog.families ?? {}).filter((f) => f.availability === 'sea_encounters').map((f) => f.id));
  return Object.values(catalog.creatures)
    .filter((c) => families.has(c.familyId))
    .sort((a, b) => a.tier - b.tier || (a.form === b.form ? (a.id < b.id ? -1 : 1) : a.form === 'base' ? -1 : 1));
}

/** The army a newly placed sea monster starts with (the weakest sea family's base form). */
export function seaMonsterDefaults(catalog: ContentCatalog): Pick<CustomSite, 'guard'> {
  const first = seaMonsterCreatures(catalog).find((c) => c.form === 'base');
  return first ? { guard: { creatureId: first.id, count: 6 } } : {};
}

/**
 * Why a sea monster may not stand at `c` with this army (null: it may). Water only; the army must be
 * creatures that fight from the water or the air (the validator's own check, in the editor's words).
 */
export function seaMonsterPlacementProblem(catalog: ContentCatalog, doc: CustomMapDocument, c: HexCoord, guard?: CustomSite['guard']): string | null {
  if (terrainAt(doc, c) !== 'water') return 'Sea monsters stand on open water';
  const g = guard ?? seaMonsterDefaults(catalog).guard;
  const problem = seaMonsterCustomProblem(catalog, (x) => terrainAt(doc, x), { kind: SEA_MONSTER_KIND, q: c.q, r: c.r, guard: g ?? null });
  return problem ? problem.charAt(0).toUpperCase() + problem.slice(1) : null;
}
