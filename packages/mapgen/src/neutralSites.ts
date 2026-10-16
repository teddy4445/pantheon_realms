/**
 * Neutral hiring sites on custom and random maps (campaign expansion handoff,
 * 2026-10-15): where one of the six new neutral creatures may live, and the
 * hiring site a map places for it.
 *
 * Content is data: the creatures' habitats and weekly stock come from content
 * (`NEUTRAL_V2_HABITATS`, `NEUTRAL_V2_SITE_STOCK`) as a `NeutralSiteTable`;
 * nothing here names a creature. A map cell's *settings* (habitat tags such as
 * "upland meadow" or "open water") are read from the map's biome and the ground
 * around the cell by the shared rules in `HABITAT_TAGS` — one rule per tag, never
 * per creature. A site fits when the map's biome is one of the creature's, at
 * least one of its tags holds and none of its forbidden tags does.
 *
 * The hiring site itself is an ordinary `creature_camp` with `restock: 'weekly'`:
 * a finite stock each week, shared by every player, never accumulating (rules).
 */
import { TERRAIN_BY_CODE, type ContentCatalog, type HexCoord, type NeutralHabitat, type NeutralSiteTable, type SiteDefinition, type Terrain } from '@pr/rules';

/** A read-only view of a map's ground (void outside the map). */
export type GroundAt = (c: HexCoord) => Terrain;

/** The ground of a stored terrain string (custom documents and generated maps alike). */
export function groundOf(map: { readonly width: number; readonly height: number; readonly terrain: string }): GroundAt {
  return (c) => {
    if (c.q < 0 || c.r < 0 || c.q >= map.width || c.r >= map.height) return 'void';
    return TERRAIN_BY_CODE[map.terrain[c.r * map.width + c.q] ?? 'v'] ?? 'void';
  };
}

interface AroundRule {
  /** Terrain counted… */
  readonly terrain: readonly Terrain[];
  /** …among the 6 neighbours (1) or the 18 hexes within two steps (2), the site's own hex excluded. */
  readonly radius: 1 | 2;
  readonly min?: number;
  readonly max?: number;
}

interface TagCondition {
  /** Only in these map biomes. */
  readonly biomes?: readonly string[];
  /** Never in these map biomes. */
  readonly notBiomes?: readonly string[];
  /** The site's own ground. */
  readonly ground?: readonly Terrain[];
  /** Every count must hold. */
  readonly around?: readonly AroundRule[];
}

export interface HabitatTagRule {
  /** Shown to authors ("upland meadow", "open water"). */
  readonly label: string;
  /** The tag holds when any one condition holds. Absent: never on these maps (e.g. lava). */
  readonly when?: readonly TagCondition[];
}

const WATER: readonly Terrain[] = ['water'];
const FOREST: readonly Terrain[] = ['forest'];
const WET: readonly Terrain[] = ['water', 'marsh'];
const SALT = ['coast', 'fjord'];

/**
 * The settings a map cell can have (proposed 2026-10-15; the habitats' tags and
 * forbidden tags). Read from the biome and the ground around the cell only.
 */
export const HABITAT_TAGS: Readonly<Record<string, HabitatTagRule>> = {
  // Settings that forbid a creature.
  open_water: { label: 'open water', when: [{ around: [{ terrain: WATER, radius: 2, min: 10 }] }] },
  open_ocean: { label: 'open sea', when: [{ biomes: SALT, around: [{ terrain: WATER, radius: 2, min: 10 }] }] },
  bare_dunes: { label: 'bare dunes', when: [{ biomes: ['desert'], ground: ['plains', 'rough'], around: [{ terrain: ['water', 'marsh', 'forest'], radius: 2, max: 0 }] }] },
  deep_snow: { label: 'deep snow', when: [{ biomes: ['tundra'] }] },
  lava: { label: 'lava' },
  // Settings a creature lives in.
  upland_meadow: { label: 'upland meadow', when: [{ notBiomes: ['desert', 'jungle'], ground: ['plains', 'rough'], around: [{ terrain: ['mountain', 'rough'], radius: 2, min: 3 }] }] },
  limestone_hills: { label: 'limestone hills', when: [{ notBiomes: ['desert', 'jungle'], ground: ['rough', 'plains'], around: [{ terrain: ['mountain'], radius: 1, min: 1 }] }] },
  temperate_forest: { label: 'old forest', when: [{ notBiomes: ['desert', 'jungle'], around: [{ terrain: FOREST, radius: 1, min: 2 }] }] },
  conifer_edge: { label: 'forest edge', when: [{ biomes: ['tundra', 'fjord', 'high_pass', 'storm_plateau', 'moor', 'temperate'], around: [{ terrain: FOREST, radius: 1, min: 1, max: 4 }] }] },
  mossy_grove: { label: 'mossy grove', when: [{ notBiomes: ['desert'], around: [{ terrain: FOREST, radius: 1, min: 2 }, { terrain: WET, radius: 2, min: 1 }] }] },
  sandstone_riverbank: { label: 'sandstone riverbank', when: [{ biomes: ['desert'], around: [{ terrain: WATER, radius: 2, min: 1 }] }] },
  dry_oasis: { label: 'oasis', when: [{ biomes: ['desert'], around: [{ terrain: WET, radius: 1, min: 1 }] }] },
  arid_scrub: { label: 'arid scrub', when: [{ biomes: ['desert'], ground: ['rough'] }] },
  mist_forest: { label: 'misty forest', when: [{ biomes: ['autumn', 'temperate', 'moor', 'jungle'], around: [{ terrain: FOREST, radius: 1, min: 3 }] }] },
  cedar_grove: { label: 'cedar grove', when: [{ notBiomes: ['desert'], ground: ['forest'], around: [{ terrain: FOREST, radius: 1, min: 2 }] }] },
  wooded_sanctuary: { label: 'wooded sanctuary', when: [{ notBiomes: ['desert'], around: [{ terrain: FOREST, radius: 2, min: 7 }] }] },
  freshwater_reeds: { label: 'freshwater reeds', when: [{ notBiomes: SALT, ground: ['marsh'] }, { notBiomes: SALT, around: [{ terrain: ['marsh'], radius: 1, min: 1 }] }] },
  lake_bank: { label: 'lake bank', when: [{ notBiomes: SALT, around: [{ terrain: WATER, radius: 1, min: 1 }, { terrain: WATER, radius: 2, max: 9 }] }] },
  river_pool: { label: 'river pool', when: [{ notBiomes: SALT, around: [{ terrain: WATER, radius: 1, min: 1 }, { terrain: WATER, radius: 2, max: 6 }] }] },
  tropical_cenote: { label: 'cenote', when: [{ biomes: ['jungle'], around: [{ terrain: WATER, radius: 1, min: 1 }] }] },
  jungle_freshwater_bank: { label: 'jungle river bank', when: [{ biomes: ['jungle'], around: [{ terrain: WET, radius: 1, min: 1 }] }] },
  warm_marsh: { label: 'warm marsh', when: [{ biomes: ['jungle', 'desert'], ground: ['marsh'] }, { biomes: ['jungle', 'desert'], around: [{ terrain: ['marsh'], radius: 1, min: 2 }] }] },
};

export const BIOME_LABEL: Readonly<Record<string, string>> = {
  temperate: 'temperate',
  autumn: 'autumn',
  coast: 'coast',
  desert: 'desert',
  fjord: 'fjord',
  high_pass: 'high pass',
  jungle: 'jungle',
  moor: 'moor',
  storm_plateau: 'storm plateau',
  tundra: 'tundra',
};

const RING_1: readonly HexCoord[] = [
  { q: 1, r: 0 },
  { q: 1, r: -1 },
  { q: 0, r: -1 },
  { q: -1, r: 0 },
  { q: -1, r: 1 },
  { q: 0, r: 1 },
];
const WITHIN_2: readonly HexCoord[] = (() => {
  const out: HexCoord[] = [];
  for (let dq = -2; dq <= 2; dq++)
    for (let dr = Math.max(-2, -dq - 2); dr <= Math.min(2, -dq + 2); dr++) if (dq !== 0 || dr !== 0) out.push({ q: dq, r: dr });
  return out;
})();

function count(ground: GroundAt, c: HexCoord, rule: AroundRule): number {
  let n = 0;
  for (const d of rule.radius === 1 ? RING_1 : WITHIN_2) if (rule.terrain.includes(ground({ q: c.q + d.q, r: c.r + d.r }))) n++;
  return n;
}

function holds(cond: TagCondition, ground: GroundAt, biome: string, c: HexCoord): boolean {
  if (cond.biomes && !cond.biomes.includes(biome)) return false;
  if (cond.notBiomes?.includes(biome)) return false;
  if (cond.ground && !cond.ground.includes(ground(c))) return false;
  for (const a of cond.around ?? []) {
    const n = count(ground, c, a);
    if (a.min !== undefined && n < a.min) return false;
    if (a.max !== undefined && n > a.max) return false;
  }
  return true;
}

/** The habitat tags that hold at a cell (in `HABITAT_TAGS` order). */
export function habitatTagsAt(ground: GroundAt, biome: string, c: HexCoord): string[] {
  return Object.entries(HABITAT_TAGS)
    .filter(([, rule]) => (rule.when ?? []).some((w) => holds(w, ground, biome, c)))
    .map(([id]) => id);
}

export function habitatTagLabel(tag: string): string {
  return HABITAT_TAGS[tag]?.label ?? tag.replace(/_/g, ' ');
}

/** "a", "a or b", "a, b or c". */
function either(xs: readonly string[]): string {
  return xs.length <= 1 ? (xs[0] ?? '') : `${xs.slice(0, -1).join(', ')} or ${xs[xs.length - 1]}`;
}

/** Plain words for a place that has none of the wanted settings. */
function describePlace(ground: GroundAt, c: HexCoord): string {
  const own = ground(c);
  const wet = RING_1.filter((d) => ground({ q: c.q + d.q, r: c.r + d.r }) === 'water').length;
  const word: Record<Terrain, string> = { plains: 'open plains', forest: 'forest', rough: 'rough ground', marsh: 'marsh', mountain: 'mountain', water: 'water', void: 'nowhere' };
  return wet > 0 ? `${word[own]} by the water` : word[own];
}

export interface HabitatVerdict {
  readonly fits: boolean;
  /** Why not: a forbidden setting, a biome without its settings, or none of its settings here. */
  readonly problem: null | 'forbidden' | 'biome' | 'setting';
  /** One sentence for the author, e.g. "Pegasi need upland meadow or limestone hills; this is open water." */
  readonly text: string;
  /** The settings that hold here. */
  readonly tags: readonly string[];
}

/** Whether a creature with this habitat may have a hiring site at `c` on a map of `biome`. */
export function habitatVerdict(habitat: NeutralHabitat, pluralName: string, biome: string, ground: GroundAt, c: HexCoord): HabitatVerdict {
  const tags = habitatTagsAt(ground, biome, c);
  const need = `${pluralName} need ${either(habitat.tags.map(habitatTagLabel))}`;
  const bad = habitat.forbidden.find((t) => tags.includes(t));
  if (bad) return { fits: false, problem: 'forbidden', text: `${need}; this is ${habitatTagLabel(bad)}.`, tags };
  if (!habitat.biomes.includes(biome)) {
    const where = either(habitat.biomes.map((b) => BIOME_LABEL[b] ?? b));
    return { fits: false, problem: 'biome', text: `${need}, found in ${where} lands; this map is ${BIOME_LABEL[biome] ?? biome}.`, tags };
  }
  const good = habitat.tags.find((t) => tags.includes(t));
  if (!good) return { fits: false, problem: 'setting', text: `${need}; this is ${describePlace(ground, c)}.`, tags };
  return { fits: true, problem: null, text: `${pluralName} live here: ${habitatTagLabel(good)}.`, tags };
}

/** The neutral creatures of the table that the catalog has, in a stable order (the table's). */
export function neutralSiteCreatures(catalog: ContentCatalog, table: NeutralSiteTable): string[] {
  return Object.keys(table.habitats).filter((id) => !!catalog.creatures[id] && (table.stock[id] ?? 0) > 0);
}

/** The creatures whose habitat includes a map biome. */
export function neutralSpeciesForBiome(catalog: ContentCatalog, table: NeutralSiteTable, biome: string): string[] {
  return neutralSiteCreatures(catalog, table).filter((id) => table.habitats[id]!.biomes.includes(biome));
}

/**
 * The family's base form of a neutral creature (battle FX & neutral upgrades,
 * 2026-10-15): a hiring site, its picture, habitat and stock are keyed to the
 * family's base form, never to the upgrade (the site hires both forms). The ID
 * itself when the creature is unknown.
 */
export function neutralSiteBase(catalog: ContentCatalog, creatureId: string): string {
  const c = catalog.creatures[creatureId];
  return (c && catalog.families[c.familyId]?.baseCreatureId) ?? creatureId;
}

/** Weekly stock of one hiring site: the table's, else the family's growth (by the family's base form). */
export function neutralSiteStock(catalog: ContentCatalog, table: NeutralSiteTable | undefined, creatureId: string): number {
  creatureId = neutralSiteBase(catalog, creatureId);
  const c = catalog.creatures[creatureId];
  const fromTable = table?.stock[creatureId];
  return Math.max(1, Math.round(fromTable ?? (c ? (catalog.families[c.familyId]?.baseGrowth ?? 1) : 1)));
}

/**
 * The hiring site of a neutral creature: a finite stock each week, shared by every
 * empire and never accumulating (`restock: 'weekly'`), drawn with its own picture
 * (`map.site.neutral_dwelling.<creature>`). Always the family's base form (an
 * upgraded ID resolves to it): the site hires both forms of the family.
 */
export function neutralSiteDefinition(catalog: ContentCatalog, table: NeutralSiteTable | undefined, creatureId: string): Pick<SiteDefinition, 'name' | 'description' | 'kind' | 'art'> {
  creatureId = neutralSiteBase(catalog, creatureId);
  const c = catalog.creatures[creatureId]!;
  const stock = neutralSiteStock(catalog, table, creatureId);
  const habitat = table?.habitats[creatureId]?.habitat;
  return {
    name: `${c.name} Hiring Site`,
    description: `${habitat ? `${habitat} ` : ''}${c.pluralName} join a visiting hero of any pantheon: ${stock} each week, shared by every empire; those not hired do not carry over.`,
    kind: { type: 'creature_camp', creatureId, weeklyGrowth: stock, initialStock: stock, restock: 'weekly' },
    art: `neutral_dwelling.${creatureId}`,
  };
}
