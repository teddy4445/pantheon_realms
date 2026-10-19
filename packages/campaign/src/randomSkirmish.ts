/**
 * Random skirmish maps for the setup screens: a thin wrapper around the map
 * generator (@pr/mapgen) so the session and the interface can start and preview
 * generated scenarios without depending on the generator package directly.
 */
import type { ContentCatalog } from '@pr/rules';
import { compileCustomMap, generateSkirmish, type CompiledCustomMap, type MapCheck, type SkirmishGenOptions } from '@pr/mapgen';
import type { GeneratedScenario } from './missionFactory';

export {
  RANDOM_TEMPLATE_ID,
  SKIRMISH_GENERATOR_VERSION,
  SKIRMISH_MAP_TYPES,
  SKIRMISH_SIZE_LABEL,
  SKIRMISH_SIZE_RADIUS,
  GUARD_PERCENT,
  TREASURE_PERCENT,
  WEALTH_PERCENT,
  SKIRMISH_START_WALLET,
  SKIRMISH_MAX_EMPIRES,
  skirmishSizeAllows,
  randomMapTavernPool,
  type GuardStrength,
  type RoadDensity,
  type SkirmishGenOptions,
  type SkirmishMapSize,
  type SkirmishMapType,
  type SkirmishMapTypeInfo,
  type SkirmishSeat,
  type SkirmishVictory,
  type StartWealth,
  type TreasureLevel,
  type UnownedTowns,
} from '@pr/mapgen';

// Naval random-map templates (2026-10-17): The Shattered Crown and The Serpent Straits, generated through
// `createRandomSkirmish` like every random map; the chooser lists them after the nine land layouts.
export {
  NAVAL_GENERATOR_ID,
  NAVAL_MAP_TYPES,
  NAVAL_TEMPLATE_VERSION,
  NavalGenerationError,
  RANDOM_MAP_TYPES,
  isNavalMapType,
  navalSettingsProblem,
  navalTemplate,
  navalTemplatesReadiness,
  validateNavalMap,
  analyzeNavalMap,
  type NavalMapType,
  type NavalReadiness,
  type NavalTemplateInfo,
  type RandomMapType,
  type RandomMapTypeInfo,
} from '@pr/mapgen';

export interface RandomSkirmish extends GeneratedScenario {
  /** Fairness checks the generator ran (all must pass for a returned map). */
  readonly checks: readonly MapCheck[];
}

// Custom maps made in the map editor (2026-10-05): the document format, validation and compiler.
export { CUSTOM_SYMMETRIES, customMapFromGenerated, symmetricCells, symmetricEdges, type CustomSymmetry, type EditorDocumentFromGenerated } from '@pr/mapgen';
export {
  CUSTOM_KEY_COLORS,
  CUSTOM_MAP_FORMAT,
  CUSTOM_MAP_SIZES,
  CUSTOM_MAX_EMPIRES,
  CUSTOM_SITE_KINDS,
  SKIRMISH_PLAYER_COLORS,
  compileCustomMap,
  customInRect,
  customRowOffset,
  newCustomMap,
  parseCustomMap,
  serializeCustomMap,
  skirmishTypeAllows,
  terrainAt,
  toggleRoad,
  validateCustomMap,
  type CompiledCustomMap,
  type CustomCompileOptions,
  type CustomGuard,
  type CustomMapDocument,
  type CustomMapIssue,
  type CustomMapSize,
  type CustomPlayer,
  type CustomQuest,
  type CustomReward,
  type CustomSeat,
  type CustomSite,
  type CustomSiteKind,
  type CustomSiteKindInfo,
  type CustomVictory,
} from '@pr/mapgen';

// Campaign expansion (2026-10-15): neutral hiring sites, sluices, ferries and supply depots on
// custom maps (editor palette and checks), and the default-off neutral pool of random maps.
export {
  CUSTOM_CHANNEL_TERRAINS,
  SKIRMISH_NEUTRAL_SPECIES,
  SLUICE_MAX_CHANNEL,
  SLUICE_REACH,
  SUPPLY_DEPOT_REWARD,
  customHabitatGround,
  customHabitatVerdict,
  customSluiceConnectivity,
  customSluiceGround,
  habitatTagLabel,
  habitatTagsAt,
  habitatVerdict,
  neutralSiteCreatures,
  neutralSiteStock,
  neutralSpeciesForBiome,
  skirmishMapBiome,
  type CustomChannelTerrain,
  type CustomValidateOptions,
  type GroundAt,
  type HabitatVerdict,
  type NeutralHabitat,
  type NeutralSiteTable,
  type SluiceConnectivity,
} from '@pr/mapgen';

// Sea-sites kit (2026-10-18): coastal watchtowers, floating salvage and shipwrecks in the editor.
export { coastalTowerSkin, customWaterSiteKind, seaSiteCustomProblem } from '@pr/mapgen';
// Sea creatures (2026-10-17): the editor's checks for sea-monster stacks.
export { SEA_MONSTER_KIND, seaMonsterCustomProblem } from '@pr/mapgen';

/** One seat of an authored skirmish map: its pantheon and who plays it. */
export interface SkirmishMapSeat {
  readonly pantheonId: string;
  readonly controller: 'human' | 'ai';
  readonly name?: string;
}

/**
 * An authored skirmish map (catalog `skirmishMaps`) compiled for the chosen
 * seats: each seat's pantheon replaces the document's default. Throws for an
 * unknown map or a seat count other than the map's.
 */
export function compileSkirmishMap(catalog: ContentCatalog, mapId: string, seats: readonly SkirmishMapSeat[], extra: { readonly unownedTowns?: 'own' | 'other' | 'none' } = {}): CompiledCustomMap {
  const def = catalog.skirmishMaps?.[mapId];
  if (!def) throw new Error(`Unknown skirmish map ${mapId}`);
  const n = def.map.players.length;
  if (seats.length !== n) throw new Error(`${def.name} is a map for ${n} empires`);
  const doc = { ...def.map, players: seats.map((s, i) => ({ pantheonId: s.pantheonId, ...(def.map.players[i]?.name ? { name: def.map.players[i]!.name } : {}) })) };
  return compileCustomMap(
    catalog,
    doc,
    seats.map((s) => ({ controller: s.controller, ...(s.name ? { name: s.name } : {}) })),
    // Unowned towns: an authored map's are left out unless the setup asks for them (2026-10-07).
    { skirmishMapId: def.id, subtitle: `Skirmish map · ${n} empires`, thumbnailAssetId: def.thumbnailAssetId, unownedTowns: extra.unownedTowns ?? 'none' },
  );
}

/** Generate a random skirmish scenario (deterministic for the same options). */
export function createRandomSkirmish(catalog: ContentCatalog, opts: SkirmishGenOptions): RandomSkirmish {
  const g = generateSkirmish(catalog, opts);
  return { mission: g.mission, map: g.map, decor: g.decor, checks: g.checks };
}
