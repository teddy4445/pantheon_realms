/**
 * Sea-monster stacks in custom and editor maps (sea-creature delivery 2026-10-17; scenario feature
 * `seaEncountersV1`): the `sea_monster` custom site — a neutral army of swimmers and flyers standing on
 * one water hex, fought by a hero's ship on the single-ship sea board — and the checks that keep sea
 * creatures at sea (never a land guard or a creature camp). The rules decide who may fight on which side
 * of the board (`seaArmyProblem`); these checks only apply them to a document.
 */
import { SINGLE_SHIP_SEA_ENCOUNTER_V2, seaArmyProblem, seaOnlyCreature, type ContentCatalog, type CustomMapDocument, type CustomSite, type GuardDefinition, type SiteDefinition, type Terrain } from '@pr/rules';

/** The custom site kind of a sea-monster stack. */
export const SEA_MONSTER_KIND = 'sea_monster' as const;

/** Help shown with a map that places sea monsters (the mission's help topics). */
export const SEA_MONSTERS_HELP = {
  id: 'sea_monsters',
  title: 'Sea monsters',
  text: 'Neutral sea creatures hold some waters. Sail a ship onto one to fight it on your own deck: walking troops stay on the deck, sea creatures in the water and flyers may go either way. A stack on deck can throw a Deck Harpoon at an enemy in the water — weak, but it never runs out. Sea creatures never join an army.',
};

/** Every creature of a guard (its first stack and the rest). */
function guardCreatures(s: Pick<CustomSite, 'guard'>): string[] {
  return s.guard ? [s.guard.creatureId, ...(s.guard.more ?? []).map((g) => g.creatureId)] : [];
}

/**
 * Why a site breaks the sea rules (null: it does not): a sea monster stands on water with an army that may
 * fight at sea; a land site never holds sea creatures (no guard, no camp of them).
 */
export function seaMonsterCustomProblem(catalog: ContentCatalog, terrainAt: (c: { q: number; r: number }) => Terrain, s: Pick<CustomSite, 'kind' | 'q' | 'r' | 'guard' | 'creatureId'>): string | null {
  const creatures = guardCreatures(s).filter((id) => !!catalog.creatures[id]);
  if (s.kind === SEA_MONSTER_KIND) {
    if (terrainAt({ q: s.q, r: s.r }) !== 'water') return 'a sea monster stands on water';
    if (!s.guard) return 'a sea monster needs its army';
    const rules = SINGLE_SHIP_SEA_ENCOUNTER_V2.sea!;
    return seaArmyProblem(catalog, rules, false, creatures);
  }
  const sea = creatures.find((id) => seaOnlyCreature(catalog, id));
  if (sea) return `${catalog.creatures[sea]!.pluralName} live only at sea: place them as a sea monster on water`;
  if (s.kind === 'creature_camp' && s.creatureId && catalog.creatures[s.creatureId] && seaOnlyCreature(catalog, s.creatureId)) return `${catalog.creatures[s.creatureId]!.pluralName} are never hired: they live only at sea`;
  return null;
}

/** The compiled site of a sea monster (its guard fights on the single-ship sea board). */
export function seaMonsterSiteBody(guard: GuardDefinition, name: string, text: string | undefined): Pick<SiteDefinition, 'name' | 'description' | 'kind' | 'guard'> {
  return {
    name,
    description: text ?? 'Sea creatures hold these waters. Sail onto them to fight from your deck.',
    kind: { type: 'sea_monster' },
    guard: { ...guard, battlefield: 'single_ship_sea_encounter_v2' },
  };
}

/** The document places at least one sea monster. */
export function hasSeaMonsters(doc: Pick<CustomMapDocument, 'sites'>): boolean {
  return doc.sites.some((s) => s.kind === SEA_MONSTER_KIND);
}
