/**
 * Custom maps (owner request 2026-10-05: a scenario editor for placing terrain,
 * towns, sites and goals, saved as an ordinary map file).
 *
 * A custom map is a plain JSON document (`*.prmap.json`): the terrain and
 * roads of a rectangular hex map, two to six empires (each one pantheon), the
 * sites placed on it and the victory goal. It never holds code or file paths.
 * `compileCustomMap` turns a document into the same mission + logical map the
 * random-map generator produces, so a custom map starts and saves like any
 * random skirmish (the match embeds the mission; the map file is not needed to
 * load a save). `validateCustomMap` lists what keeps a map from being played.
 *
 * Content (kits, leaders, creatures, spells, skills) comes from the catalog;
 * nothing here names a pantheon.
 */
import {
  axialDistance,
  CUSTOM_MAP_FORMAT,
  CUSTOM_MAP_VERSION,
  KEY_COLOR_LABEL,
  TERRAIN_BY_CODE,
  TERRAIN_CODES,
  axialNeighbors,
  edgeKey,
  hashValue,
  hexKey,
  type ContentCatalog,
  type CustomGuard,
  type CustomMapDocument,
  type CustomReward,
  type CustomSite,
  type CustomSiteKind,
  type CustomVictory,
  type CustomChannelTerrain,
  type CustomShip,
  type MissionShipSetup,
  type NavalTraversalPolicy,
  navalPolicyIssues,
  RngCursor,
  seedFromLabel,
  coastalTowerPlacementProblem,
  seaPickupPlacementProblem,
  shipwreckPlacementProblem,
  type SeaPlacementContext,
  type SeaPlacementGround,
  type GuardDefinition,
  type KeyColor,
  type RewardDefinition,
  type HexCoord,
  type MissionDefinition,
  type MissionRivalSetup,
  type MissionTownSetup,
  type NeutralSiteTable,
  type ResourceCost,
  type SiteDefinition,
  type Terrain,
  type WorldMapDefinition,
} from '@pr/rules';
import { buildDecor, deriveStreams, type DecorItem, type MapCheck } from './generator';
import { RANDOM_TEMPLATE_ID, SKIRMISH_PLAYER_COLORS, SKIRMISH_START_WALLET, WEALTH_PERCENT, randomMapTavernPool } from './skirmish';
import { UNOWNED_GARRISON_VALUE, unownedTownGarrison, unownedTownSetup } from './unownedTowns';
import { groundOf, habitatVerdict, neutralSiteBase, neutralSiteDefinition, type GroundAt, type HabitatVerdict } from './neutralSites';
import { SEA_SITES_HELP, coastalTowerBody, coastalTowerSkin, seaPickupAmount, seaPickupBody, shipwreckBody, wreckName, wreckOutcome, wreckSkin } from './seaSites';
import { SEA_MONSTERS_HELP, SEA_MONSTER_KIND, hasSeaMonsters, seaMonsterCustomProblem, seaMonsterSiteBody } from './seaMonsters';

export { CUSTOM_MAP_FORMAT, CUSTOM_MAP_VERSION } from '@pr/rules';
export type { CustomGuard, CustomMapDocument, CustomPlayer, CustomQuest, CustomReward, CustomShip, CustomSite, CustomSiteKind, CustomVictory, CustomChannelTerrain, NeutralHabitat, NeutralSiteTable } from '@pr/rules';
export const CUSTOM_GENERATOR_VERSION = 'pr-custom-map-1';
export const CUSTOM_MAX_EMPIRES = 6;

/** Map sizes offered by the editor: columns × rows of hexes. */
export const CUSTOM_MAP_SIZES = {
  small: { cols: 30, rows: 24, label: 'Small' },
  medium: { cols: 38, rows: 30, label: 'Medium' },
  large: { cols: 46, rows: 36, label: 'Large' },
  huge: { cols: 54, rows: 42, label: 'Huge' },
} as const;
export type CustomMapSize = keyof typeof CUSTOM_MAP_SIZES;

export interface CustomSiteKindInfo {
  readonly id: CustomSiteKind;
  readonly label: string;
  readonly summary: string;
  /** May carry a guard army (the monster always does). */
  readonly guardable: boolean;
  /**
   * Campaign expansion sites (2026-10-15): the editor shows them in their own palette
   * sections ('neutral': the hiring sites of the new neutrals, one per creature;
   * 'landmark': the sluice, the ferry landings and the supply depot).
   */
  readonly palette?: 'neutral' | 'landmark' | 'sea';
}

export const CUSTOM_SITE_KINDS: readonly CustomSiteKindInfo[] = [
  { id: 'town', label: 'Town', summary: 'An empire’s home town (one per empire), or an unowned town any empire may take.', guardable: false },
  { id: 'sawmill', label: 'Sawmill', summary: '+2 Wood per day to its owner.', guardable: true },
  { id: 'quarry', label: 'Quarry', summary: '+2 Stone per day to its owner.', guardable: true },
  { id: 'gold_mine', label: 'Gold Mine', summary: '+500 Gold per day to its owner.', guardable: true },
  { id: 'crystal_deposit', label: 'Crystal Deposit', summary: '+1 Crystal per day to its owner.', guardable: true },
  { id: 'treasure_chest', label: 'Treasure Chest', summary: '1,000 Gold or 1,500 experience, once.', guardable: true },
  { id: 'resource_cache', label: 'Supply Cache', summary: '750 Gold, 5 Wood and 5 Stone, once.', guardable: true },
  { id: 'artifact', label: 'Artifact', summary: 'An artifact lying on the map, once (named, or of a rarity chosen when the game starts).', guardable: true },
  { id: 'learning_stone', label: 'Learning Stone', summary: '1,000 experience for every hero, once each.', guardable: true },
  { id: 'spell_shrine', label: 'Spell Shrine', summary: 'Teaches its spell to heroes with a spellbook.', guardable: true },
  { id: 'skill_trainer', label: 'Skill Trainer', summary: 'Teaches its skill to a hero with a free slot.', guardable: true },
  { id: 'windmill', label: 'Windmill', summary: 'Pays the first hero each week.', guardable: false },
  { id: 'creature_camp', label: 'Creature Camp', summary: 'Sells its creatures to a visiting hero; restocks weekly.', guardable: false },
  { id: 'quest_hut', label: 'Quest Hut', summary: 'Rewards the first hero who brings resources or has beaten a guard.', guardable: false },
  { id: 'prison', label: 'Prison', summary: 'The first hero to stop here frees a captive hero, who joins that empire.', guardable: true },
  { id: 'key_tent', label: 'Key Tent', summary: 'Gives the visiting hero’s empire the key of its colour.', guardable: true },
  { id: 'key_gate', label: 'Key Gate', summary: 'Lets through only empires holding the key of its colour.', guardable: false },
  { id: 'watchtower', label: 'Watchtower', summary: 'Reveals the sites around it to the first empire to visit.', guardable: false },
  { id: 'portal', label: 'Twin Portal', summary: 'Two portals lead to each other (place them in pairs).', guardable: false },
  { id: 'relic', label: 'Shrine of the First Flame', summary: 'The relic for a “hold the shrine” victory.', guardable: true },
  { id: 'monster', label: 'Monster', summary: 'A neutral army standing on its tile.', guardable: true },
  // Campaign expansion (2026-10-15).
  { id: 'neutral_dwelling', label: 'Neutral Hiring Site', summary: 'Hires one of the new neutral creatures to a hero of any pantheon: a finite stock each week, shared by every empire, never accumulating. Place it in the creature’s habitat.', guardable: false, palette: 'neutral' },
  { id: 'sluice', label: 'Sluice', summary: 'A hero standing on it opens or closes it: its channel hexes switch ground (water when closed, marsh when open, unless set otherwise).', guardable: true, palette: 'landmark' },
  { id: 'ferry', label: 'Ferry Landing', summary: 'Two landings carry a hero across the water to each other (place them in pairs, each on a shore).', guardable: false, palette: 'landmark' },
  { id: 'supply_depot', label: 'Supply Depot', summary: 'A one-use cache of supplies for the first hero to arrive.', guardable: true, palette: 'landmark' },
  // Sea-sites kit (2026-10-18): placed by their own rules (seaSiteCustomProblem), on a map with ships.
  { id: 'coastal_watchtower', label: 'Coastal Watchtower', summary: 'A lookout on the coast: whoever holds it sees 6 hexes around, sea lanes included, and is warned of enemy ships. Taken by a hero on foot. Stands on coastal land with a beach nearby.', guardable: true, palette: 'sea' },
  { id: 'sea_pickup', label: 'Floating Salvage', summary: 'Driftwood, stone cargo or a lost treasury adrift on one water hex: the first ship to sail onto it takes it (amount drawn when the game starts unless set).', guardable: false, palette: 'sea' },
  { id: 'shipwreck', label: 'Shipwreck', summary: 'A wreck on the water: a hero aboard a ship beside it explores it for 100 movement — salvage, perhaps raiders moored alongside (drawn when the game starts unless set). Needs two free water hexes beside it.', guardable: false, palette: 'sea' },
  // Sea creatures (2026-10-18): a neutral sea-monster stack, fought by a ship on the single-ship sea board.
  { id: 'sea_monster', label: 'Sea Monster', summary: 'Neutral sea creatures on one water hex: a hero sails a ship onto them to fight from the deck. Only creatures that swim or fly; never on land.', guardable: true, palette: 'sea' },
];

/** Custom site kinds that stand on water (every other kind stands on passable land). */
export function customWaterSiteKind(kind: CustomSiteKind): boolean {
  return kind === 'sea_pickup' || kind === 'shipwreck' || kind === SEA_MONSTER_KIND;
}

/** The placement context of a document (sea-sites rules) for one site, excluding that site. */
export function customSeaContext(doc: Pick<CustomMapDocument, 'sites' | 'ships'>, exceptId: string | null): SeaPlacementContext {
  const sites = new Set<string>();
  const wrecks = new Set<string>();
  const towns: HexCoord[] = [];
  for (const s of doc.sites) {
    if (s.kind === 'town') towns.push({ q: s.q, r: s.r });
    if (s.id === exceptId) continue;
    sites.add(hexKey({ q: s.q, r: s.r }));
    if (s.kind === 'shipwreck') wrecks.add(hexKey({ q: s.q, r: s.r }));
  }
  return { sites, wrecks, towns, ships: new Set((doc.ships ?? []).map((sh) => hexKey({ q: sh.q, r: sh.r }))) };
}

/**
 * Why a sea site cannot stand at its tile (null: it can, or the kind is not a sea site): the shared
 * placement rules of rules/resolvers/seaSites.ts — the editor shows this reason on an illegal tile.
 */
export function seaSiteCustomProblem(doc: Pick<CustomMapDocument, 'width' | 'height' | 'terrain' | 'sites' | 'ships'>, site: Pick<CustomSite, 'id' | 'kind' | 'q' | 'r'>): string | null {
  const ground: SeaPlacementGround = { terrainAt: (c) => terrainAt(doc, c) };
  const ctx = customSeaContext(doc, site.id);
  const c = { q: site.q, r: site.r };
  if (site.kind === 'coastal_watchtower') return coastalTowerPlacementProblem(ground, c, ctx);
  if (site.kind === 'sea_pickup') return seaPickupPlacementProblem(ground, c, ctx);
  if (site.kind === 'shipwreck') return shipwreckPlacementProblem(ground, c, ctx);
  return null;
}

/** Ground a sluice channel may switch to (the editor's ground tools). */
export const CUSTOM_CHANNEL_TERRAINS: readonly CustomChannelTerrain[] = ['plains', 'forest', 'rough', 'marsh', 'mountain', 'water'];
/** A channel hex lies at most this many hexes from its sluice. */
export const SLUICE_REACH = 8;
/** At most this many channel hexes per sluice. */
export const SLUICE_MAX_CHANNEL = 40;
/** What a supply depot holds unless the author sets it. */
export const SUPPLY_DEPOT_REWARD: CustomReward = { gold: 500, wood: 5, stone: 5 };

/** Key colours a map may use (rules order). */
export const CUSTOM_KEY_COLORS: readonly KeyColor[] = ['azure', 'crimson', 'emerald', 'amber', 'violet', 'ivory'];

/** Columns of the rectangle stored in an axial array: row r holds q from −⌊r/2⌋. */
export function customRowOffset(height: number): number {
  return Math.floor((height - 1) / 2);
}

/** Whether a stored cell lies on the rectangle (not void padding). */
export function customInRect(cols: number, rows: number, c: HexCoord): boolean {
  if (c.r < 0 || c.r >= rows) return false;
  const x = c.q + Math.floor(c.r / 2) - customRowOffset(rows);
  return x >= 0 && x < cols;
}

/** A new, empty map: all plains, two empires (the first two playable pantheons), no sites. */
export function newCustomMap(catalog: ContentCatalog, size: CustomMapSize, name = 'New map'): CustomMapDocument {
  const { cols, rows } = CUSTOM_MAP_SIZES[size];
  const width = cols + customRowOffset(rows);
  let terrain = '';
  for (let r = 0; r < rows; r++) for (let q = 0; q < width; q++) terrain += customInRect(cols, rows, { q, r }) ? TERRAIN_CODES.plains : TERRAIN_CODES.void;
  const pantheons = Object.keys(catalog.skirmishKits);
  return {
    format: CUSTOM_MAP_FORMAT,
    version: CUSTOM_MAP_VERSION,
    name,
    description: '',
    width,
    height: rows,
    terrain,
    roads: [],
    biome: 'temperate',
    players: [{ pantheonId: pantheons[0] ?? 'greek' }, { pantheonId: pantheons[1] ?? pantheons[0] ?? 'greek' }],
    sites: [],
    victory: { type: 'elimination' },
    startWealth: 'normal',
  };
}

export function terrainAt(doc: Pick<CustomMapDocument, 'width' | 'height' | 'terrain'>, c: HexCoord): Terrain {
  if (c.q < 0 || c.r < 0 || c.q >= doc.width || c.r >= doc.height) return 'void';
  return TERRAIN_BY_CODE[doc.terrain[c.r * doc.width + c.q] ?? 'v'] ?? 'void';
}

const passable = (t: Terrain) => t !== 'water' && t !== 'mountain' && t !== 'void';

/** Parse untrusted JSON text into a document (shape and bounds only; `validateCustomMap` checks playability). */
export function parseCustomMap(text: string): { ok: true; doc: CustomMapDocument } | { ok: false; error: string } {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: 'This file is not a map (not JSON).' };
  }
  const d = raw as Partial<CustomMapDocument> | null;
  if (!d || typeof d !== 'object' || d.format !== CUSTOM_MAP_FORMAT) return { ok: false, error: 'This file is not a Pantheon Realms map.' };
  if (d.version !== CUSTOM_MAP_VERSION) return { ok: false, error: `Map format version ${String(d.version)} is not supported.` };
  const w = Number(d.width);
  const h = Number(d.height);
  if (!Number.isInteger(w) || !Number.isInteger(h) || w < 8 || h < 8 || w > 120 || h > 80) return { ok: false, error: 'The map size is out of range.' };
  if (typeof d.terrain !== 'string' || d.terrain.length !== w * h || /[^pfrsmwv]/.test(d.terrain)) return { ok: false, error: 'The terrain is damaged.' };
  if (!Array.isArray(d.roads) || d.roads.some((x) => typeof x !== 'string' || x.length > 40)) return { ok: false, error: 'The roads are damaged.' };
  if (!Array.isArray(d.players) || d.players.length < 1 || d.players.length > CUSTOM_MAX_EMPIRES || d.players.some((p) => !p || typeof p.pantheonId !== 'string')) return { ok: false, error: 'The empires are damaged.' };
  if (!Array.isArray(d.sites) || d.sites.length > 2000) return { ok: false, error: 'The sites are damaged.' };
  const kinds = new Set(CUSTOM_SITE_KINDS.map((k) => k.id));
  const stackOk = (x: unknown) => !!x && typeof (x as CustomGuard).creatureId === 'string' && Number.isInteger((x as CustomGuard).count) && (x as CustomGuard).count >= 1 && (x as CustomGuard).count <= 9999;
  const amount = (x: unknown) => x === undefined || (Number.isInteger(x) && (x as number) >= 0 && (x as number) <= 1_000_000);
  const rewardOk = (r: CustomReward | undefined) =>
    r === undefined || (typeof r === 'object' && !!r && amount(r.gold) && amount(r.wood) && amount(r.stone) && amount(r.crystal) && amount(r.xp) && (r.artifactId === undefined || typeof r.artifactId === 'string') && (r.artifactRarity === undefined || ['minor', 'major', 'relic'].includes(r.artifactRarity)));
  for (const s of d.sites) {
    if (!s || typeof s.id !== 'string' || !/^[a-z0-9_]{1,40}$/.test(s.id) || !kinds.has(s.kind) || !Number.isInteger(s.q) || !Number.isInteger(s.r)) return { ok: false, error: 'A site is damaged.' };
    if (s.guard && (!stackOk(s.guard) || (s.guard.more !== undefined && (!Array.isArray(s.guard.more) || s.guard.more.length > 6 || !s.guard.more.every(stackOk))) || (s.guard.label !== undefined && typeof s.guard.label !== 'string'))) return { ok: false, error: `The guard of ${s.id} is damaged.` };
    if (s.color !== undefined && !CUSTOM_KEY_COLORS.includes(s.color)) return { ok: false, error: `The key colour of ${s.id} is damaged.` };
    if (s.level !== undefined && !(Number.isInteger(s.level) && s.level >= 1 && s.level <= 30)) return { ok: false, error: `The prisoner level of ${s.id} is damaged.` };
    if (!rewardOk(s.reward)) return { ok: false, error: `The reward of ${s.id} is damaged.` };
    if (s.quest !== undefined && !(s.quest && ((s.quest.type === 'deliver' && amount(s.quest.gold) && amount(s.quest.wood) && amount(s.quest.stone) && amount(s.quest.crystal)) || (s.quest.type === 'defeat' && typeof s.quest.siteId === 'string')))) return { ok: false, error: `The quest of ${s.id} is damaged.` };
    if (s.radius !== undefined && !(Number.isInteger(s.radius) && s.radius >= 1 && s.radius <= 40)) return { ok: false, error: `The watchtower range of ${s.id} is damaged.` };
    if (s.channel !== undefined && !(Array.isArray(s.channel) && s.channel.length <= SLUICE_MAX_CHANNEL && s.channel.every((c: { q: number; r: number } | null) => !!c && Number.isInteger(c.q) && Number.isInteger(c.r) && c.q >= 0 && c.r >= 0 && c.q < w && c.r < h))) return { ok: false, error: `The channel of ${s.id} is damaged.` };
    for (const k of ['openTerrain', 'closedTerrain'] as const) if (s[k] !== undefined && !CUSTOM_CHANNEL_TERRAINS.includes(s[k]!)) return { ok: false, error: `The channel ground of ${s.id} is damaged.` };
    if (s.startsOpen !== undefined && typeof s.startsOpen !== 'boolean') return { ok: false, error: `A site is damaged (${s.id}).` };
    // Sea sites (2026-10-18): kept as they are, shape checked here.
    if (s.resource !== undefined && !['wood', 'stone', 'gold'].includes(s.resource)) return { ok: false, error: `The salvage of ${s.id} is damaged.` };
    if (s.amount !== undefined && !(Number.isInteger(s.amount) && s.amount >= 1 && s.amount <= 100_000)) return { ok: false, error: `The salvage amount of ${s.id} is damaged.` };
    if (s.outcome !== undefined && !['abandoned_cargo', 'guarded_salvage', 'rare_cache'].includes(s.outcome)) return { ok: false, error: `The wreck outcome of ${s.id} is damaged.` };
    if (s.skin !== undefined && !['broken_mast', 'split_hull'].includes(s.skin)) return { ok: false, error: `The wreck picture of ${s.id} is damaged.` };
    for (const k of ['name', 'text', 'heroId', 'twinId', 'spellId', 'skillId', 'creatureId'] as const) {
      const v = (s as unknown as Record<string, unknown>)[k];
      if (v !== undefined && (typeof v !== 'string' || v.length > (k === 'text' ? 400 : 60))) return { ok: false, error: `A site is damaged (${s.id}).` };
    }
  }
  // Ships (expedition kit, optional): kept as they are, never dropped; shape and bounds checked here.
  const shipsRaw = (d as { ships?: unknown }).ships;
  if (shipsRaw !== undefined) {
    if (!Array.isArray(shipsRaw) || shipsRaw.length > 500) return { ok: false, error: 'The ships are damaged.' };
    for (const sh of shipsRaw as CustomShip[]) {
      if (!sh || typeof sh.id !== 'string' || !/^[a-z0-9_]{1,40}$/.test(sh.id) || !Number.isInteger(sh.q) || !Number.isInteger(sh.r) || sh.q < 0 || sh.r < 0 || sh.q >= w || sh.r >= h) return { ok: false, error: 'A ship is damaged.' };
      if (sh.owner !== undefined && !(Number.isInteger(sh.owner) && sh.owner >= 0 && sh.owner < CUSTOM_MAX_EMPIRES)) return { ok: false, error: `The owner of ship ${sh.id} is damaged.` };
    }
  }
  // The naval-only travel rule (optional): checked like a save's, never silently repaired (portals stay false).
  const policyRaw = (d as { navalPolicy?: unknown }).navalPolicy;
  if (policyRaw !== undefined) {
    const problems = navalPolicyIssues({ navalPolicy: policyRaw, sites: [] }, { navalMovementV1: true });
    if (problems.length > 0) return { ok: false, error: `The naval travel rule is damaged: ${problems[0]}.` };
  }
  const v = d.victory as CustomVictory | undefined;
  if (!v || (v.type !== 'elimination' && !(v.type === 'hold_relic' && Number.isInteger(v.days) && v.days >= 1 && v.days <= 30))) return { ok: false, error: 'The victory goal is damaged.' };
  const text50 = (x: unknown, n: number) => (typeof x === 'string' ? x.slice(0, n) : '');
  return {
    ok: true,
    doc: {
      format: CUSTOM_MAP_FORMAT,
      version: CUSTOM_MAP_VERSION,
      name: text50(d.name, 60) || 'Untitled map',
      description: text50(d.description, 600),
      ...(d.author ? { author: text50(d.author, 60) } : {}),
      width: w,
      height: h,
      terrain: d.terrain,
      roads: d.roads,
      biome: d.biome ?? 'temperate',
      players: d.players.map((p) => ({ pantheonId: p.pantheonId, ...(p.name ? { name: text50(p.name, 40) } : {}) })),
      sites: d.sites,
      ...(Array.isArray(shipsRaw) ? { ships: (shipsRaw as CustomShip[]).map((sh) => ({ id: sh.id, q: sh.q, r: sh.r, ...(sh.owner !== undefined ? { owner: sh.owner } : {}) })) } : {}),
      ...(policyRaw !== undefined ? { navalPolicy: policyRaw as NavalTraversalPolicy } : {}),
      victory: v,
      startWealth: d.startWealth === 'low' || d.startWealth === 'high' ? d.startWealth : 'normal',
      ...(d.revealMap ? { revealMap: true } : {}),
    },
  };
}

export function serializeCustomMap(doc: CustomMapDocument): string {
  return `${JSON.stringify(doc, null, 1)}\n`;
}

export interface CustomMapIssue {
  readonly severity: 'error' | 'warning';
  readonly text: string;
  readonly siteId?: string;
}

export interface CustomValidateOptions {
  /**
   * The neutral hiring-site table (content's `NEUTRAL_V2_HABITATS` and
   * `NEUTRAL_V2_SITE_STOCK`): with it, a hiring site must hire one of its
   * creatures and gets a warning outside the creature's habitat.
   */
  readonly neutralSites?: NeutralSiteTable;
}

/** Everything that keeps a map from being played (errors) or looks unintended (warnings). */
export function validateCustomMap(catalog: ContentCatalog, doc: CustomMapDocument, opts: CustomValidateOptions = {}): CustomMapIssue[] {
  const issues: CustomMapIssue[] = [];
  const err = (text: string, siteId?: string) => issues.push({ severity: 'error', text, ...(siteId ? { siteId } : {}) });
  const warn = (text: string, siteId?: string) => issues.push({ severity: 'warning', text, ...(siteId ? { siteId } : {}) });
  if (doc.players.length < 2) err('A map needs at least two empires.');
  // Naval-only travel: no portal, ferry or sluice may cross the sea without a ship.
  if (doc.navalPolicy) for (const s of doc.sites) if (s.kind === 'portal' || s.kind === 'ferry' || s.kind === 'sluice') err(`${s.id}: this map is crossed by ship only — remove the ${s.kind}.`, s.id);
  doc.players.forEach((p, i) => {
    if (!catalog.skirmishKits[p.pantheonId]) err(`Empire ${i + 1}: ${p.pantheonId} cannot be played in a skirmish.`);
    const towns = doc.sites.filter((s) => s.kind === 'town' && s.owner === i);
    if (towns.length === 0) err(`Empire ${i + 1} has no town. Place one with the Town tool.`);
    if (towns.length > 1) err(`Empire ${i + 1} has ${towns.length} towns; each empire starts with exactly one.`);
  });
  const seen = new Map<string, string>();
  const ids = new Set<string>();
  let habitatGround: GroundAt | null = null;
  for (const s of doc.sites) {
    const label = s.name || CUSTOM_SITE_KINDS.find((k) => k.id === s.kind)?.label || s.kind;
    if (ids.has(s.id)) err(`Two sites share the ID ${s.id}.`, s.id);
    ids.add(s.id);
    const c = { q: s.q, r: s.r };
    const t = terrainAt(doc, c);
    // Sea sites (2026-10-18) have their own placement rules (salvage and wrecks on water, the lookout on the coast).
    const seaProblem = seaSiteCustomProblem(doc, s);
    if (seaProblem) err(`${label}: ${seaProblem}.`, s.id);
    else if (!customWaterSiteKind(s.kind) && !passable(t)) err(`${label} stands on ${t === 'void' ? 'no ground' : t}.`, s.id);
    // Sea creatures stay at sea: a sea monster on water with a sea army; never a land guard or camp of them.
    const seaMonsterProblem = seaMonsterCustomProblem(catalog, (x) => terrainAt(doc, x), s);
    if (seaMonsterProblem) err(`${label}: ${seaMonsterProblem}.`, s.id);
    const k = hexKey(c);
    if (seen.has(k)) err(`${label} shares its tile with another site.`, s.id);
    seen.set(k, s.id);
    if (s.kind === 'town' && s.owner !== undefined && (s.owner < 0 || s.owner >= doc.players.length)) err(`${label} belongs to no empire ${s.owner + 1}.`, s.id);
    if (s.kind === 'town' && s.owner === undefined && s.pantheon && s.pantheon !== 'nearest' && s.pantheon !== 'other' && !catalog.skirmishKits[s.pantheon]) err(`${label}: ${s.pantheon} towns cannot be played in a skirmish.`, s.id);
    if (s.guard && !catalog.creatures[s.guard.creatureId]) err(`${label}: unknown guard creature ${s.guard.creatureId}.`, s.id);
    if (s.kind === 'monster' && !s.guard) err(`${label} has no army.`, s.id);
    if (s.kind === 'creature_camp' && (!s.creatureId || !catalog.creatures[s.creatureId])) err(`${label} sells no creature.`, s.id);
    if (s.kind === 'spell_shrine' && s.spellId && !catalog.spells[s.spellId]) err(`${label}: unknown spell.`, s.id);
    if (s.kind === 'skill_trainer' && s.skillId && !catalog.skills[s.skillId]) err(`${label}: unknown skill.`, s.id);
    if (s.kind === 'portal') {
      const twin = doc.sites.find((x) => x.id === s.twinId);
      if (!twin || twin.kind !== 'portal' || twin.twinId !== s.id) err(`${label} has no twin portal. Place portals in pairs.`, s.id);
    }
    for (const g of [s.guard?.more ?? []].flat()) if (!catalog.creatures[g.creatureId]) err(`${label}: unknown guard creature ${g.creatureId}.`, s.id);
    if ((s.kind === 'key_tent' || s.kind === 'key_gate') && !s.color) err(`${label} has no key colour.`, s.id);
    if (s.kind === 'key_gate' && s.color && !doc.sites.some((x) => x.kind === 'key_tent' && x.color === s.color)) err(`${label}: no ${KEY_COLOR_LABEL[s.color].toLowerCase()} key tent gives the key that opens it.`, s.id);
    if (s.kind === 'key_tent' && s.color && !doc.sites.some((x) => x.kind === 'key_gate' && x.color === s.color)) warn(`${label}: no ${KEY_COLOR_LABEL[s.color].toLowerCase()} key gate on the map.`, s.id);
    if (s.kind === 'prison' && s.heroId && !catalog.heroes[s.heroId]) err(`${label}: unknown hero ${s.heroId}.`, s.id);
    if (s.kind === 'prison' && s.owner !== undefined && (s.owner < 0 || s.owner >= doc.players.length)) err(`${label}: no empire ${s.owner + 1}.`, s.id);
    if (s.kind === 'quest_hut') {
      if (!s.quest) err(`${label} asks for nothing.`, s.id);
      else if (s.quest.type === 'deliver' && !((s.quest.gold ?? 0) + (s.quest.wood ?? 0) + (s.quest.stone ?? 0) + (s.quest.crystal ?? 0))) err(`${label} asks for no resources.`, s.id);
      else if (s.quest.type === 'defeat') {
        const target = s.quest.siteId;
        const t = doc.sites.find((x) => x.id === target);
        if (!t || !t.guard) err(`${label}: the quest names ${target}, which has no guard to defeat.`, s.id);
      }
      if (!s.reward) err(`${label} gives no reward.`, s.id);
    }
    const art = s.reward?.artifactId;
    if (art && !catalog.artifacts[art]) err(`${label}: unknown artifact ${art}.`, s.id);
    if (s.kind === 'artifact' && !art && !s.reward?.artifactRarity) err(`${label} names no artifact or rarity.`, s.id);
    // Campaign expansion sites (2026-10-15).
    if (s.kind === 'neutral_dwelling') {
      // Keyed to the family's base form (an upgraded ID names the same site: it hires both forms).
      const c = s.creatureId ? catalog.creatures[neutralSiteBase(catalog, s.creatureId)] : undefined;
      if (!c) err(`${label} hires no creature.`, s.id);
      else if (opts.neutralSites && !opts.neutralSites.habitats[c.id]) err(`${label}: ${c.pluralName} have no hiring site (only the new neutral creatures do; use a Creature Camp).`, s.id);
      else if (opts.neutralSites) {
        habitatGround ??= customHabitatGround(doc);
        const v = customHabitatVerdict(catalog, doc, s, opts.neutralSites, habitatGround);
        if (v && !v.fits) warn(`${label}: ${v.text}`, s.id);
      }
    }
    if (s.kind === 'ferry') {
      const twin = doc.sites.find((x) => x.id === s.twinId);
      if (!twin || twin.kind !== 'ferry' || twin.twinId !== s.id) err(`${label} has no twin landing. Place ferry landings in pairs.`, s.id);
      if (!axialNeighbors(c).some((n) => terrainAt(doc, n) === 'water')) warn(`${label} is not on a shore: a ferry landing stands next to water.`, s.id);
    }
    if (s.kind === 'sluice') {
      const channel = s.channel ?? [];
      if (channel.length === 0) warn(`${label} has no channel: mark the hexes it floods and drains (Site → Edit channel).`, s.id);
      if ((s.openTerrain ?? 'marsh') === (s.closedTerrain ?? 'water')) warn(`${label} changes nothing: its channel has the same ground open and closed.`, s.id);
      const { cols, rows } = { cols: doc.width - customRowOffset(doc.height), rows: doc.height };
      for (const x of channel) {
        const there = doc.sites.find((o) => o.q === x.q && o.r === x.r);
        if (!customInRect(cols, rows, x)) err(`${label}: a channel hex (${x.q},${x.r}) lies outside the map.`, s.id);
        else if (there) err(`${label}: ${there.id === s.id ? 'the sluice stands in its own channel' : `${there.name || CUSTOM_SITE_KINDS.find((k) => k.id === there.kind)?.label} stands in its channel`}; sites stand beside a channel, never in it.`, s.id);
        else if (axialDistance(x, c) > SLUICE_REACH) err(`${label}: channel hexes lie within ${SLUICE_REACH} hexes of the sluice (${x.q},${x.r} is ${axialDistance(x, c)} away).`, s.id);
        const other = doc.sites.find((o) => o.id !== s.id && o.kind === 'sluice' && (o.channel ?? []).some((y) => y.q === x.q && y.r === x.r));
        if (other && s.id < other.id) err(`${label} and ${other.name || other.id} share the channel hex ${x.q},${x.r}.`, s.id);
      }
    }
  }
  // Ships (expedition kit): empty hulls on water, one per tile, owned by an empire or neutral.
  const shipIds = new Set<string>();
  const shipTiles = new Set<string>();
  const channels = new Set(doc.sites.flatMap((x) => (x.kind === 'sluice' ? (x.channel ?? []).map((c) => hexKey(c)) : [])));
  for (const sh of doc.ships ?? []) {
    const c = { q: sh.q, r: sh.r };
    const label = `Ship ${sh.id}`;
    if (shipIds.has(sh.id)) err(`Two ships share the ID ${sh.id}.`);
    shipIds.add(sh.id);
    if (terrainAt(doc, c) !== 'water') err(`${label} is not on water.`);
    if (shipTiles.has(hexKey(c))) err(`${label} shares its tile with another ship.`);
    shipTiles.add(hexKey(c));
    if (sh.owner !== undefined && (sh.owner < 0 || sh.owner >= doc.players.length)) err(`${label} belongs to no empire ${sh.owner + 1}.`);
    if (channels.has(hexKey(c))) err(`${label} lies in a sluice channel; it would run aground when the channel drains.`);
    if (!axialNeighbors(c).some((n) => passable(terrainAt(doc, n)))) warn(`${label} has no shore beside it: no hero can ever board it.`);
  }
  if (doc.victory.type === 'hold_relic') {
    const relics = doc.sites.filter((s) => s.kind === 'relic');
    if (relics.length !== 1) err('“Hold the shrine” needs exactly one Shrine of the First Flame on the map.');
  } else if (doc.sites.some((s) => s.kind === 'relic')) warn('The Shrine of the First Flame only matters with the “hold the shrine” goal.');
  // Reachability: every site from the first town, walking (portals and ferry landings count
  // as links). With sluices (2026-10-15), a site counts when it can be reached with every
  // sluice open or with every sluice closed; the empires' towns and the shrine must be
  // reachable in both states (checked below).
  const first = doc.sites.find((s) => s.kind === 'town' && s.owner === 0);
  if (first && issues.every((i) => i.severity !== 'error')) {
    const sluiced = doc.sites.some((s) => s.kind === 'sluice');
    const both = sluiced ? { closed: customReach(doc, first, 'closed'), open: customReach(doc, first, 'open') } : null;
    const reach = both ? new Set([...both.closed, ...both.open]) : customReach(doc, first, 'start');
    // A site on water (sea salvage, a wreck) is reached by ship: its sea touches land Empire 1 reaches.
    const sea = customSeaReach(doc, reach);
    for (const s of doc.sites) if (!(customWaterSiteKind(s.kind) ? sea(s) : reach.has(hexKey({ q: s.q, r: s.r })))) err(`${s.name || CUSTOM_SITE_KINDS.find((k) => k.id === s.kind)?.label} cannot be reached from Empire 1’s town${customWaterSiteKind(s.kind) ? ' by ship' : ''}.`, s.id);
    const sc = both ? sluiceCut(doc, both) : null;
    for (const state of ['closed', 'open'] as const) for (const m of sc?.[state] ?? []) err(`With every sluice ${state}, ${m.label} cannot be reached from Empire 1’s town.`, m.siteId);
  }
  return issues;
}

/** The map's ground with every sluice channel in one state ('start': as each sluice starts). Unchanged without sluices. */
export function customSluiceGround(doc: CustomMapDocument, state: 'start' | 'open' | 'closed'): CustomMapDocument {
  const sluices = doc.sites.filter((s) => s.kind === 'sluice' && (s.channel ?? []).length > 0);
  if (sluices.length === 0) return doc;
  const t = doc.terrain.split('');
  for (const s of sluices) {
    const open = state === 'start' ? !!s.startsOpen : state === 'open';
    const code = TERRAIN_CODES[open ? (s.openTerrain ?? 'marsh') : (s.closedTerrain ?? 'water')];
    for (const c of s.channel ?? []) {
      const i = c.r * doc.width + c.q;
      if (c.q >= 0 && c.r >= 0 && c.q < doc.width && c.r < doc.height && t[i] !== TERRAIN_CODES.void) t[i] = code;
    }
  }
  return { ...doc, terrain: t.join('') };
}

/**
 * Cells reachable on foot from a site (portals and ferry landings carry a hero to their
 * twin): the cells `travelCosts` reaches, found by a plain breadth-first walk (the same
 * passable ground — plains, forest, rough, marsh — without the costs, so the editor's
 * checks stay quick on huge maps).
 */
function customReach(doc: CustomMapDocument, from: { readonly q: number; readonly r: number }, state: 'start' | 'open' | 'closed'): Set<string> {
  const ground = customSluiceGround(doc, state);
  const walk = (c: HexCoord, reach: Set<string>) => {
    const queue = [c];
    reach.add(hexKey(c));
    while (queue.length > 0) {
      const cur = queue.pop()!;
      for (const nb of axialNeighbors(cur)) {
        const k = hexKey(nb);
        if (reach.has(k) || !WALKABLE_CODES.has(nb.q < 0 || nb.r < 0 || nb.q >= ground.width || nb.r >= ground.height ? 'v' : (ground.terrain[nb.r * ground.width + nb.q] ?? 'v'))) continue;
        reach.add(k);
        queue.push(nb);
      }
    }
  };
  const reach = new Set<string>();
  walk({ q: from.q, r: from.r }, reach);
  // Sea crossings (expedition kit): a neutral ship or one of Empire 1's beside reachable land carries a
  // hero over its whole water body to every walkable shore of it. A coastal town's launch service is not
  // counted (an island map needs a placed ship or a land link to pass this check).
  const waterAt = (c: HexCoord) => c.q >= 0 && c.r >= 0 && c.q < ground.width && c.r < ground.height && ground.terrain[c.r * ground.width + c.q] === TERRAIN_CODES.water;
  const boats = (doc.ships ?? []).filter((sh) => sh.owner === undefined || sh.owner === 0);
  const sailed = new Set<string>();
  let grew = true;
  while (grew) {
    grew = false;
    for (const boat of boats) {
      const start = { q: boat.q, r: boat.r };
      if (sailed.has(hexKey(start)) || !waterAt(start) || !axialNeighbors(start).some((n) => reach.has(hexKey(n)))) continue;
      const queue = [start];
      sailed.add(hexKey(start));
      while (queue.length > 0) {
        const cur = queue.pop()!;
        for (const nb of axialNeighbors(cur)) {
          const k = hexKey(nb);
          if (waterAt(nb)) {
            if (!sailed.has(k)) {
              sailed.add(k);
              queue.push(nb);
            }
          } else if (!reach.has(k) && WALKABLE_CODES.has(nb.q < 0 || nb.r < 0 || nb.q >= ground.width || nb.r >= ground.height ? 'v' : (ground.terrain[nb.r * ground.width + nb.q] ?? 'v'))) {
            walk(nb, reach);
            grew = true;
          }
        }
      }
    }
    for (const s of doc.sites) {
      if ((s.kind !== 'portal' && s.kind !== 'ferry') || !reach.has(hexKey({ q: s.q, r: s.r }))) continue;
      const twin = doc.sites.find((x) => x.id === s.twinId);
      if (twin && !reach.has(hexKey({ q: twin.q, r: twin.r }))) {
        walk({ q: twin.q, r: twin.r }, reach);
        grew = true;
      }
    }
  }
  return reach;
}

/**
 * Whether a water site can be reached by ship from land Empire 1 reaches (sea-sites kit): its sea —
 * the water it lies in or beside (a wreck is approached from its neighbours), wrecks excluded — touches
 * a reached land hex (a coastal town can launch a ship there, or a placed ship lies in it).
 */
function customSeaReach(doc: CustomMapDocument, reach: ReadonlySet<string>): (s: CustomSite) => boolean {
  const wrecks = new Set(doc.sites.filter((x) => x.kind === 'shipwreck').map((x) => hexKey({ q: x.q, r: x.r })));
  const water = (c: HexCoord) => terrainAt(doc, c) === 'water' && !wrecks.has(hexKey(c));
  const bodyOf = new Map<string, boolean>();
  const reached = (start: HexCoord): boolean => {
    const k0 = hexKey(start);
    if (bodyOf.has(k0)) return bodyOf.get(k0)!;
    const seen = new Set([k0]);
    const queue = [start];
    let touches = false;
    while (queue.length > 0) {
      const cur = queue.pop()!;
      for (const n of axialNeighbors(cur)) {
        const k = hexKey(n);
        if (reach.has(k)) touches = true;
        if (seen.has(k) || !water(n)) continue;
        seen.add(k);
        queue.push(n);
      }
    }
    for (const k of seen) bodyOf.set(k, touches);
    return touches;
  };
  return (s) => {
    const c = { q: s.q, r: s.r };
    const starts = water(c) ? [c] : axialNeighbors(c).filter(water);
    return starts.some(reached);
  };
}

/** Terrain codes a hero walks on (as `travelCosts`: plains, forest, rough, marsh). */
const WALKABLE_CODES = new Set([TERRAIN_CODES.plains, TERRAIN_CODES.forest, TERRAIN_CODES.rough, TERRAIN_CODES.marsh]);

/** What the sluice check found: per state, the empires' towns and objective sites cut off from Empire 1's town. */
export interface SluiceConnectivity {
  readonly sluices: number;
  /** The towns and objective sites checked (every empire's town; the shrine with the “hold the shrine” goal). */
  readonly checked: number;
  readonly closed: readonly { readonly siteId: string; readonly label: string }[];
  readonly open: readonly { readonly siteId: string; readonly label: string }[];
}

/**
 * The sluice connectivity check (2026-10-15): with every sluice closed, and with
 * every sluice open, every empire's town and the objective site (the shrine of a
 * “hold the shrine” map) can be reached from Empire 1's town. Null when the map has
 * no sluice or Empire 1 has no town yet.
 */
export function customSluiceConnectivity(doc: CustomMapDocument): SluiceConnectivity | null {
  const first = doc.sites.find((s) => s.kind === 'town' && s.owner === 0);
  if (!doc.sites.some((s) => s.kind === 'sluice') || !first) return null;
  return sluiceCut(doc, { closed: customReach(doc, first, 'closed'), open: customReach(doc, first, 'open') });
}

function sluiceCut(doc: CustomMapDocument, reach: { readonly closed: ReadonlySet<string>; readonly open: ReadonlySet<string> }): SluiceConnectivity {
  const targets = doc.sites.filter((s) => (s.kind === 'town' && s.owner !== undefined && s.owner > 0) || (s.kind === 'relic' && doc.victory.type === 'hold_relic'));
  const labelOf = (s: CustomSite) => (s.kind === 'town' ? `${s.name ? `${s.name} (Empire ${s.owner! + 1})` : `Empire ${s.owner! + 1}’s town`}` : s.name || 'the Shrine of the First Flame');
  const cut = (r: ReadonlySet<string>) => targets.filter((s) => !r.has(hexKey({ q: s.q, r: s.r }))).map((s) => ({ siteId: s.id, label: labelOf(s) }));
  return { sluices: doc.sites.filter((s) => s.kind === 'sluice').length, checked: targets.length + 1, closed: cut(reach.closed), open: cut(reach.open) };
}

/** The ground habitats are read from: the map as the game starts (each sluice channel in its start state). */
export function customHabitatGround(doc: CustomMapDocument): GroundAt {
  return groundOf(customSluiceGround(doc, 'start'));
}

/**
 * Whether a neutral hiring site stands in its creature's habitat (null: not a hiring
 * site of the table). `ground` may be passed when many cells are judged at once.
 */
export function customHabitatVerdict(catalog: ContentCatalog, doc: CustomMapDocument, site: Pick<CustomSite, 'kind' | 'creatureId' | 'q' | 'r'>, table: NeutralSiteTable, ground: GroundAt = customHabitatGround(doc)): HabitatVerdict | null {
  // The family's habitat (keyed to its base form, also for an upgraded ID).
  const id = site.creatureId ? neutralSiteBase(catalog, site.creatureId) : undefined;
  const habitat = id ? table.habitats[id] : undefined;
  const c = id ? catalog.creatures[id] : undefined;
  if (!habitat || !c) return null;
  return habitatVerdict(habitat, c.pluralName, doc.biome ?? 'temperate', ground, { q: site.q, r: site.r });
}

function toWorldMap(doc: CustomMapDocument): WorldMapDefinition {
  const roads = [...new Set(doc.roads)].sort();
  return {
    templateId: RANDOM_TEMPLATE_ID,
    templateVersion: 1,
    generatorVersion: CUSTOM_GENERATOR_VERSION,
    seed: 0,
    attempt: 0,
    mode: 'variation',
    width: doc.width,
    height: doc.height,
    terrain: doc.terrain,
    roads,
    logicalHash: hashValue({ templateId: RANDOM_TEMPLATE_ID, width: doc.width, height: doc.height, terrain: doc.terrain, roads }),
    biome: doc.biome ?? 'temperate',
  };
}

/** Toggle the road between two neighbouring cells (the editor's road tool). */
export function toggleRoad(roads: readonly string[], a: HexCoord, b: HexCoord): string[] {
  if (!axialNeighbors(a).some((n) => n.q === b.q && n.r === b.r)) return [...roads];
  const k = edgeKey(a, b);
  return roads.includes(k) ? roads.filter((x) => x !== k) : [...roads, k];
}

export interface CompiledCustomMap {
  readonly mission: MissionDefinition;
  readonly map: WorldMapDefinition;
  readonly decor: readonly DecorItem[];
  readonly checks: readonly MapCheck[];
}

export interface CustomSeat {
  readonly controller: 'human' | 'ai';
  readonly name?: string;
}

/** An authored skirmish map compiled from content (instead of a map made in the editor). */
export interface CustomCompileOptions {
  /** The skirmish map's ID (mission and scenario IDs, help text). */
  readonly skirmishMapId?: string;
  readonly subtitle?: string;
  readonly thumbnailAssetId?: string;
  /**
   * The map's unowned towns (2026-10-07): 'map' as authored (each town's own
   * pantheon setting; the default), 'own' every one of its nearest empire's
   * pantheon, 'other' of a pantheon no empire plays, 'none' left out (with the
   * road that only led to it).
   */
  readonly unownedTowns?: 'map' | 'own' | 'other' | 'none';
  /** The neutral hiring-site table (weekly stock and habitat text of the hiring sites; see `CustomValidateOptions`). */
  readonly neutralSites?: NeutralSiteTable;
}

/** The mission + logical map of a playable document (throws when `validateCustomMap` reports an error). */
export function compileCustomMap(catalog: ContentCatalog, authored: CustomMapDocument, seats: readonly CustomSeat[], opts: CustomCompileOptions = {}): CompiledCustomMap {
  const errors = validateCustomMap(catalog, authored, opts.neutralSites ? { neutralSites: opts.neutralSites } : {}).filter((i) => i.severity === 'error');
  if (errors.length > 0) throw new Error(`The map cannot be played: ${errors.map((e) => e.text).join(' ')}`);
  const doc = opts.unownedTowns === 'none' ? withoutUnownedTowns(authored) : authored;
  const n = doc.players.length;
  // Sluice channels start in their start state (unchanged without sluices).
  const map = toWorldMap(customSluiceGround(doc, 'start'));
  const features = { expandedContent: true, mythicLibraryV2: true, weeklyEvents: true, interventions: true, heroSpecialties: true, neutralReactions: true, climateRules: true, aiTemperaments: true, cityDedicationsV1: true, scoutingIntelV1: true, targetableCatapultV1: true, recruitmentCaravansV1: true, navalMovementV1: true, seaEncountersV1: true };
  const playerIds = doc.players.map((_, i) => (i === 0 ? 'player' : `p${i + 1}`));
  const townIds = doc.players.map((_, i) => `town_${i + 1}`);
  const kits = doc.players.map((p) => catalog.skirmishKits[p.pantheonId]!);
  const usedNames = new Map<string, number>();
  const townSite = (i: number) => doc.sites.find((s) => s.kind === 'town' && s.owner === i)!;
  const townNames = kits.map((k, i) => {
    const custom = townSite(i).name;
    if (custom) return custom;
    const used = usedNames.get(k.pantheonId) ?? 0;
    usedNames.set(k.pantheonId, used + 1);
    return k.townNames[used % k.townNames.length] ?? `Town ${i + 1}`;
  });
  const sanctum = Object.values(catalog.spells)
    .filter((sp) => sp.access === 'sanctum' && !sp.pantheonId && sp.tier <= 2 && sp.implementationStatus === 'implemented')
    .map((sp) => sp.id)
    .sort();
  const commonSkills = Object.values(catalog.skills)
    .filter((sk) => !sk.pantheonId)
    .map((sk) => sk.id)
    .sort();
  // Leaders first (prisons never hold an empire's leader).
  const leaderIds = (() => {
    const used = new Map<string, number>();
    return kits.map((k) => {
      const n = used.get(k.pantheonId) ?? 0;
      used.set(k.pantheonId, n + 1);
      return k.leaders[n % k.leaders.length]!.definitionId;
    });
  })();
  const usedArtifacts = new Set<string>();
  /** A named artifact, or one of a rarity: the same map always gives the same one; relics never twice. */
  const artifactFor = (r: CustomReward | undefined, salt: string): string | null => {
    if (!r) return null;
    if (r.artifactId) return r.artifactId;
    if (!r.artifactRarity) return null;
    const pool = Object.values(catalog.artifacts)
      .filter((a) => (a.rarity ?? (a.unique ? 'relic' : 'minor')) === r.artifactRarity)
      .map((a) => a.id)
      .sort();
    if (pool.length === 0) return null;
    const start = hashSeed(`${doc.name}|${salt}`) % pool.length;
    for (let i = 0; i < pool.length; i++) {
      const id = pool[(start + i) % pool.length]!;
      if (!usedArtifacts.has(id)) {
        usedArtifacts.add(id);
        return id;
      }
    }
    return r.artifactRarity === 'relic' ? null : pool[start]!;
  };
  const rewardOf = (r: CustomReward | undefined, salt: string): RewardDefinition => {
    const resources: Record<string, number> = {};
    for (const k of ['gold', 'wood', 'stone', 'crystal'] as const) if (r?.[k]) resources[k] = r[k]!;
    const art = artifactFor(r, salt);
    return {
      ...(Object.keys(resources).length ? { resources: resources as ResourceCost } : {}),
      ...(r?.xp ? { questXp: r.xp } : {}),
      ...(art ? { artifactIds: [art] } : {}),
    };
  };
  const rewardText = (rw: RewardDefinition): string => {
    const parts = Object.entries(rw.resources ?? {})
      .filter(([, v]) => (v ?? 0) > 0)
      .map(([k, v]) => `${(v as number).toLocaleString('en-US')} ${k[0]!.toUpperCase()}${k.slice(1)}`);
    if (rw.questXp) parts.push(`${rw.questXp.toLocaleString('en-US')} experience`);
    for (const a of rw.artifactIds ?? []) parts.push(catalog.artifacts[a]?.name ?? a);
    return parts.length <= 1 ? (parts[0] ?? 'nothing') : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
  };
  const guardOf = (s: CustomSite, battlefield: GuardDefinition['battlefield'] = 'open_field'): GuardDefinition | undefined => {
    if (!s.guard) return undefined;
    const stacks = [{ creatureId: s.guard.creatureId, count: s.guard.count }, ...(s.guard.more ?? [])];
    const c = catalog.creatures[s.guard.creatureId]!;
    const value = stacks.reduce((sum, x) => sum + (catalog.creatures[x.creatureId]?.cost?.gold ?? 100) * x.count, 0);
    const reward = s.reward && s.kind !== 'quest_hut' && s.kind !== 'artifact' && s.kind !== 'supply_depot' ? rewardOf(s.reward, `${s.id}:guard`) : { resources: { gold: Math.max(100, Math.round((value * 0.25) / 50) * 50) } };
    return { label: s.guard.label ?? (s.kind === 'monster' || s.kind === SEA_MONSTER_KIND ? c.pluralName : `${c.pluralName} on guard`), army: stacks, reward, battlefield };
  };
  // Unowned towns (2026-10-07): their pantheon by the option or the site's own setting.
  const unownedMode = opts.unownedTowns ?? 'map';
  const freeSites = unownedMode === 'none' ? [] : doc.sites.filter((s) => s.kind === 'town' && s.owner === undefined);
  const freeIds = new Map(freeSites.map((s, k) => [s.id, `free_${k + 1}`] as const));
  const nearestSeat = (s: CustomSite): number => {
    let seat = 0;
    let best = Infinity;
    doc.players.forEach((_, i) => {
      const t = townSite(i);
      const d = axialDistance({ q: s.q, r: s.r }, { q: t.q, r: t.r });
      if (d < best) {
        best = d;
        seat = i;
      }
    });
    return seat;
  };
  const freePantheon = (s: CustomSite): string => {
    const want = unownedMode === 'own' ? 'nearest' : unownedMode === 'other' ? 'other' : (s.pantheon ?? 'nearest');
    const nearest = doc.players[nearestSeat(s)]!.pantheonId;
    if (want === 'nearest') return nearest;
    if (want !== 'other') return want;
    const played = new Set(doc.players.map((p) => p.pantheonId));
    const all = Object.keys(catalog.skirmishKits).sort();
    const pool = all.filter((p) => !played.has(p));
    const from = pool.length > 0 ? pool : all.filter((p) => p !== nearest);
    return from.length > 0 ? from[hashSeed(`${doc.name}|${s.id}|other`) % from.length]! : nearest;
  };
  /** The compiled site ID of a document site (towns and the relic are renamed). */
  const compiledId = (x: CustomSite): string => (x.kind === 'town' ? `site_${x.owner === undefined ? (freeIds.get(x.id) ?? x.id) : townIds[x.owner]}` : x.kind === 'relic' ? 'relic' : x.id);
  const neutralTowns: MissionTownSetup[] = [];
  // Prisoners: the named hero, else a hireable hero of the owning (or nearest) empire's pantheon.
  const prisoners = new Map<string, string | null>();
  {
    const taken = new Set(leaderIds);
    for (const s of doc.sites) if (s.kind === 'prison' && s.heroId) taken.add(s.heroId);
    for (const s of doc.sites) {
      if (s.kind !== 'prison') continue;
      if (s.heroId) {
        prisoners.set(s.id, s.heroId);
        continue;
      }
      let seat = s.owner;
      if (seat === undefined) {
        let best = Infinity;
        doc.players.forEach((_, i) => {
          const t = townSite(i);
          const d = axialDistance({ q: s.q, r: s.r }, { q: t.q, r: t.r });
          if (d < best) {
            best = d;
            seat = i;
          }
        });
      }
      const pantheonId = doc.players[seat ?? 0]!.pantheonId;
      const pool = (catalog.pantheons[pantheonId]?.heroIds ?? []).filter((id) => catalog.heroes[id]?.availability === 'hireable' && !taken.has(id)).sort();
      const pick = pool.length ? pool[hashSeed(`${doc.name}|${s.id}`) % pool.length]! : null;
      if (pick) taken.add(pick);
      prisoners.set(s.id, pick);
    }
  }
  const sites: SiteDefinition[] = [];
  let shrineN = 0;
  let skillN = 0;
  for (const s of doc.sites) {
    const coord = { q: s.q, r: s.r };
    const base = { id: s.id, anchorId: s.id, coord };
    const guard = guardOf(s);
    const named = (name: string) => s.name || name;
    switch (s.kind) {
      case 'town': {
        if (s.owner === undefined) {
          const townId = freeIds.get(s.id);
          if (!townId) break; // left out ('none')
          const pantheonId = freePantheon(s);
          const kit = catalog.skirmishKits[pantheonId]!;
          const used = usedNames.get(pantheonId) ?? 0;
          usedNames.set(pantheonId, used + 1);
          const name = s.name || (kit.townNames[used % kit.townNames.length] ?? `Free Town ${townId}`);
          const garrison = s.guard ? [{ creatureId: s.guard.creatureId, count: s.guard.count }, ...(s.guard.more ?? [])] : unownedTownGarrison(catalog, pantheonId, UNOWNED_GARRISON_VALUE);
          sites.push({ ...base, id: `site_${townId}`, anchorId: `site_${townId}`, name, description: `A ${kit.adjective} town without a lord, held by its own militia. Take it to build and recruit there.`, kind: { type: 'town', townId } });
          neutralTowns.push(unownedTownSetup(catalog, pantheonId, townId, `site_${townId}`, name, garrison));
          break;
        }
        const i = s.owner;
        sites.push({ ...base, id: `site_${townIds[i]}`, anchorId: `site_${townIds[i]}`, name: townNames[i]!, description: `${doc.players[i]!.name ?? townNames[i]}’s home town.`, kind: { type: 'town', townId: townIds[i]! } });
        break;
      }
      case 'sawmill':
      case 'quarry':
      case 'gold_mine':
      case 'crystal_deposit': {
        const info = { sawmill: ['Sawmill', 'wood', 2], quarry: ['Quarry', 'stone', 2], gold_mine: ['Gold Mine', 'gold', 500], crystal_deposit: ['Crystal Deposit', 'crystal', 1] } as const;
        const [name, resource, dailyYield] = info[s.kind];
        sites.push({ ...base, name: named(name), description: `Capture for +${dailyYield} ${resource} per day.`, kind: { type: 'resource_site', siteType: s.kind, resource, dailyYield }, ...(guard ? { guard } : {}) });
        break;
      }
      case 'treasure_chest':
        sites.push({ ...base, name: named('Treasure Chest'), description: 'An iron-bound chest. Take the 1,000 Gold inside, or study the maps and journals in it for 1,500 experience.', kind: { type: 'treasure_chest', gold: 1000, xp: 1500 }, ...(guard ? { guard } : {}) });
        break;
      case 'resource_cache':
        sites.push({ ...base, name: named('Supply Cache'), description: 'Abandoned supplies: 750 Gold, 5 Wood and 5 Stone.', kind: { type: 'pickup', reward: { resources: { gold: 750, wood: 5, stone: 5 } } }, ...(guard ? { guard } : {}) });
        break;
      case 'learning_stone':
        sites.push({ ...base, name: named('Learning Stone'), description: 'Every hero who touches the stone once learns 1,000 experience.', kind: { type: 'learning_stone', xp: 1000 }, ...(guard ? { guard } : {}) });
        break;
      case 'spell_shrine': {
        const spellId = s.spellId ?? sanctum[shrineN++ % Math.max(1, sanctum.length)];
        if (!spellId) break;
        sites.push({ ...base, name: named(`Shrine of ${catalog.spells[spellId]!.name}`), description: `Teaches ${catalog.spells[spellId]!.name} to a hero with a spellbook.`, kind: { type: 'spell_shrine', spellId }, ...(guard ? { guard } : {}) });
        break;
      }
      case 'skill_trainer': {
        const skillId = s.skillId ?? commonSkills[skillN++ % Math.max(1, commonSkills.length)];
        if (!skillId) break;
        sites.push({ ...base, name: named(`${catalog.skills[skillId]!.name} Trainer`), description: `Teaches ${catalog.skills[skillId]!.name} to a hero with a free skill slot.`, kind: { type: 'skill_trainer', skillId }, ...(guard ? { guard } : {}) });
        break;
      }
      case 'windmill':
        sites.push({ ...base, name: named('Windmill'), description: 'The miller pays the first hero to visit each week.', kind: { type: 'windmill', weekly: { wood: 3, stone: 3 } } });
        break;
      case 'creature_camp': {
        const c = catalog.creatures[s.creatureId!]!;
        const growth = Math.max(1, Math.round(1400 / Math.max(60, c.cost?.gold ?? 100)));
        sites.push({ ...base, name: named(`${c.name} Camp`), description: `${c.pluralName} sell their service to a visiting hero; new recruits arrive each week.`, kind: { type: 'creature_camp', creatureId: c.id, weeklyGrowth: growth, initialStock: growth } });
        break;
      }
      case 'portal':
        sites.push({ ...base, name: named('Twin Portal'), description: 'An arch of standing stones around a violet veil. A hero who stops here steps out of its twin portal at once.', kind: { type: 'portal', exitSiteId: s.twinId! } });
        break;
      case 'relic':
        sites.push({ ...base, id: 'relic', anchorId: 'relic', name: named('Shrine of the First Flame'), description: doc.victory.type === 'hold_relic' ? `Hold the shrine at ${doc.victory.days} dawns in a row to win.` : 'An ancient shrine.', kind: { type: 'relic' }, ...(guard ? { guard } : {}) });
        break;
      case 'monster':
        sites.push({ ...base, name: named(guard?.label ?? 'Monsters'), description: s.text ?? 'A neutral army bars the way.', kind: { type: 'crossing' }, ...(guard ? { guard: { ...guard, battlefield: 'grove' as const } } : {}) });
        break;
      case SEA_MONSTER_KIND:
        // A sea-monster stack on water (seaEncountersV1): fought by a ship on the single-ship sea board.
        if (guard) sites.push({ ...base, ...seaMonsterSiteBody(guard, named(guard.label), s.text) });
        break;
      case 'artifact': {
        const reward = rewardOf(s.reward, s.id);
        const art = reward.artifactIds?.[0];
        sites.push({ ...base, name: named(art ? (catalog.artifacts[art]?.name ?? 'Artifact') : 'Supply Cache'), description: s.text ?? `Left here long ago: ${rewardText(reward)}.`, kind: { type: 'pickup', reward }, ...(guard ? { guard } : {}) });
        break;
      }
      case 'key_tent': {
        const color = s.color!;
        const word = KEY_COLOR_LABEL[color];
        sites.push({ ...base, name: named(`${word} Key Tent`), description: s.text ?? `A keymaster’s tent. Visit it to receive the ${word.toLowerCase()} key, which opens every ${word.toLowerCase()} key gate.`, kind: { type: 'key_tent', color }, ...(guard ? { guard } : {}) });
        break;
      }
      case 'key_gate': {
        const color = s.color!;
        const word = KEY_COLOR_LABEL[color];
        sites.push({ ...base, name: named(`${word} Key Gate`), description: s.text ?? `A barred gate. It opens for any empire that holds the ${word.toLowerCase()} key (from the ${word.toLowerCase()} key tent).`, kind: { type: 'key_gate', color } });
        break;
      }
      case 'prison': {
        const heroId = prisoners.get(s.id);
        const hero = heroId ? catalog.heroes[heroId] : undefined;
        const level = s.level ?? 5;
        if (!hero) {
          sites.push({ ...base, name: named('Abandoned Prison'), description: 'Empty cells and rusted chains. Somebody left supplies behind.', kind: { type: 'pickup', reward: { resources: { gold: 500 } } }, ...(guard ? { guard } : {}) });
          break;
        }
        sites.push({ ...base, name: named('Prison'), description: s.text ?? `${hero.name}, ${hero.title}, is held captive here. The first hero to stop here frees them; they join that empire at level ${level}.`, kind: { type: 'prison', heroDefinitionId: hero.id, level }, ...(guard ? { guard } : {}) });
        break;
      }
      case 'quest_hut': {
        const q = s.quest!;
        const reward = rewardOf(s.reward, s.id);
        if (q.type === 'deliver') {
          const resources: Record<string, number> = {};
          for (const k of ['gold', 'wood', 'stone', 'crystal'] as const) if (q[k]) resources[k] = q[k]!;
          const ask = rewardText({ resources: resources as ResourceCost });
          sites.push({ ...base, name: named('Quest Hut'), description: s.text ?? `A hermit asks for ${ask} and pays ${rewardText(reward)} for them.`, kind: { type: 'quest_hut', quest: { type: 'deliver', resources: resources as ResourceCost }, reward } });
        } else {
          const target = doc.sites.find((x) => x.id === q.siteId)!;
          const label = target.guard?.label ?? (target.name || 'the guards');
          sites.push({ ...base, name: named('Quest Hut'), description: s.text ?? `A hermit promises ${rewardText(reward)} to whoever defeats ${label}.`, kind: { type: 'quest_hut', quest: { type: 'defeat', siteId: compiledId(target), label }, reward } });
        }
        break;
      }
      case 'watchtower': {
        const radius = s.radius ?? 9;
        const revealSiteIds = doc.sites.filter((x) => x.id !== s.id && axialDistance({ q: x.q, r: x.r }, coord) <= radius).map(compiledId);
        sites.push({ ...base, name: named('Watchtower'), description: s.text ?? `From the top you see every site within ${radius} hexes.`, kind: { type: 'watchtower', revealSiteIds } });
        break;
      }
      // Campaign expansion sites (2026-10-15).
      case 'neutral_dwelling': {
        const def = neutralSiteDefinition(catalog, opts.neutralSites, s.creatureId!);
        sites.push({ ...base, ...def, name: named(def.name) });
        break;
      }
      case 'sluice': {
        const channel = (s.channel ?? []).map((x) => ({ q: x.q, r: x.r }));
        const open = s.openTerrain ?? 'marsh';
        const closed = s.closedTerrain ?? 'water';
        const hexes = `${channel.length} channel ${channel.length === 1 ? 'hex' : 'hexes'}`;
        const way = (t: CustomChannelTerrain) => `${t}${t === 'water' || t === 'mountain' ? ', impassable' : ', passable'}`;
        sites.push({
          ...base,
          name: named('Sluice'),
          description: `A sluice gate on a channel of ${channel.length} ${channel.length === 1 ? 'hex' : 'hexes'}. A hero standing here opens or closes it: open, the channel is ${way(open)}; closed, ${way(closed)}. It starts ${s.startsOpen ? 'open' : 'closed'}.`,
          kind: {
            type: 'sluice',
            channel,
            openTerrain: open,
            closedTerrain: closed,
            startsOpen: !!s.startsOpen,
            openText: `Opening the sluice turns the ${hexes} from ${closed} to ${way(open)}.`,
            closeText: `Closing the sluice turns the ${hexes} from ${open} to ${way(closed)}.`,
            openFlag: `sluice_${s.id}_open`,
          },
          art: 'sluice',
          ...(guard ? { guard } : {}),
        });
        break;
      }
      case 'ferry':
        sites.push({ ...base, name: named('Ferry Landing'), description: 'A ferry landing. A hero who stops here is carried across the water to the other landing at once.', kind: { type: 'portal', exitSiteId: s.twinId!, ferry: true }, art: 'ferry' });
        break;
      case 'supply_depot': {
        const reward = rewardOf(s.reward ?? SUPPLY_DEPOT_REWARD, s.id);
        sites.push({ ...base, name: named('Supply Depot'), description: `A one-use supply depot: ${rewardText(reward)} for the first hero to arrive.`, kind: { type: 'pickup', reward }, art: 'supply_depot', ...(guard ? { guard } : {}) });
        break;
      }
      // Sea sites (2026-10-18): every unset value drawn once here from the map's own stream (the same map, the same draw).
      case 'coastal_watchtower': {
        const body = coastalTowerBody(catalog, named('Coastal Watchtower'), coastalTowerSkin(doc.biome, (x) => terrainAt(doc, x), coord));
        const kind = body.kind.type === 'coastal_watchtower' && s.radius ? { ...body.kind, radius: s.radius } : body.kind;
        sites.push({ ...base, ...body, kind, ...(guard ? { guard } : {}) });
        break;
      }
      case 'sea_pickup': {
        const rng = new RngCursor(seedFromLabel(`${CUSTOM_GENERATOR_VERSION}|${doc.name}|${s.id}|salvage`));
        const resource = s.resource ?? 'gold';
        const body = seaPickupBody(resource, s.amount ?? seaPickupAmount(catalog, resource, (n) => rng.nextInt(n)));
        sites.push({ ...base, ...body, name: named(body.name) });
        break;
      }
      case 'shipwreck': {
        const rng = new RngCursor(seedFromLabel(`${CUSTOM_GENERATOR_VERSION}|${doc.name}|${s.id}|wreck`));
        const draw = (n: number) => rng.nextInt(n);
        const drawn = wreckOutcome(catalog, draw, 100, features.expandedContent, s.outcome);
        // An authored army replaces the drawn raiders (an unguarded outcome stays unguarded).
        const custom = s.guard ? [{ creatureId: s.guard.creatureId, count: s.guard.count }, ...(s.guard.more ?? [])] : null;
        const outcome = custom && drawn.guard ? { ...drawn, guard: { label: s.guard!.label ?? drawn.guard.label, army: custom } } : drawn;
        const name = s.name || wreckName(draw);
        sites.push({ ...base, ...shipwreckBody(catalog, name, outcome, s.skin ?? wreckSkin(draw)) });
        break;
      }
    }
    // An authored description replaces the default one (towns keep theirs).
    const last = sites[sites.length - 1];
    if (s.text && s.kind !== 'town' && last && last.anchorId === compiledId(s)) sites[sites.length - 1] = { ...last, description: s.text };
  }
  const wallet = scale(SKIRMISH_START_WALLET, WEALTH_PERCENT[doc.startWealth ?? 'normal']);
  const leaderUse = new Map<string, number>();
  const setupFor = (i: number) => {
    const kit = kits[i]!;
    const k = leaderUse.get(kit.pantheonId) ?? 0;
    leaderUse.set(kit.pantheonId, k + 1);
    const leader = kit.leaders[k % kit.leaders.length]!;
    const townId = townIds[i]!;
    return {
      town: { townId, siteId: `site_${townId}`, name: townNames[i]!, archetypeId: kit.archetypeId, buildings: kit.buildings, population: kit.population, covenants: kit.covenants },
      hero: {
        heroId: `leader_${i + 1}`,
        definitionId: leader.definitionId,
        classId: leader.classId,
        defaults: { level: 1, xp: 0, attributes: kit.leaderAttributes, skills: kit.leaderSkills, spellbook: false },
        army: kit.army,
        startTownId: townId,
      },
    };
  };
  const seat0 = setupFor(0);
  const rivals: MissionRivalSetup[] = doc.players.slice(1).map((p, j) => {
    const i = j + 1;
    const s = setupFor(i);
    return { playerId: playerIds[i]!, name: seats[i]?.name ?? p.name ?? townNames[i]!, pantheonId: p.pantheonId, color: SKIRMISH_PLAYER_COLORS[i % SKIRMISH_PLAYER_COLORS.length]!, wallet, controller: seats[i]?.controller ?? 'ai', town: s.town, hero: s.hero };
  });
  const relic = sites.find((s) => s.id === 'relic');
  const hold = doc.victory.type === 'hold_relic' && relic ? doc.victory : null;
  const slug = doc.name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 32) || 'map';
  const mission: MissionDefinition = {
    id: `${opts.skirmishMapId ? `skirmish_map_${opts.skirmishMapId}_${map.logicalHash.slice(0, 8)}` : `custom_${slug}_${map.logicalHash.slice(0, 8)}`}${unownedMode === 'own' || unownedMode === 'other' ? `_free${unownedMode}` : ''}`,
    scenarioId: opts.skirmishMapId ? `skirmish_map_${opts.skirmishMapId}` : `custom_${slug}`,
    campaignId: null,
    order: 1,
    name: doc.name,
    subtitle: opts.subtitle ?? `Custom map · ${n} empires`,
    summary: `${doc.description || 'A map made in the map editor.'} ${hold ? `Win by holding the Shrine of the First Flame for ${hold.days} days, or by defeating every rival.` : 'Win by defeating every rival empire.'}`,
    mapTemplateId: RANDOM_TEMPLATE_ID,
    soundscape: 'coast',
    targetPlaytime: 'unmeasured',
    newDecisions: [opts.skirmishMapId ? 'Skirmish map' : 'Custom map', `${n} empires`, hold ? 'Hold the relic' : 'Conquest'],
    xpCap: null,
    xpCapLevel: null,
    briefing: [{ speaker: 'Herald', portraitAssetId: 'story.herald.portrait', text: doc.description || (hold ? `Whoever holds the Shrine of the First Flame for ${hold.days} days will rule these lands.` : 'Rival empires wake across the land. Only one will remain.') }],
    victory: [{ speaker: 'Herald', portraitAssetId: 'story.herald.portrait', text: 'The realm is yours.' }],
    debriefPolicy: [],
    player: { playerId: 'player', name: seats[0]?.name ?? doc.players[0]!.name ?? townNames[0]!, controller: seats[0]?.controller ?? 'human', pantheonId: doc.players[0]!.pantheonId, wallet, town: seat0.town, hero: seat0.hero },
    rivals,
    ...(neutralTowns.length > 0 ? { neutralTowns } : {}),
    ...((doc.ships ?? []).length > 0 ? { ships: (doc.ships ?? []).map((sh): MissionShipSetup => ({ shipId: `map_ship_${sh.id}`, coord: { q: sh.q, r: sh.r }, ...(sh.owner !== undefined ? { ownerId: playerIds[sh.owner] ?? null } : {}) })) } : {}),
    ...(doc.navalPolicy ? { navalPolicy: doc.navalPolicy } : {}),
    initialFlags: ['skirmish'],
    features,
    ...(doc.revealMap ? { startExplored: true } : {}),
    turnOrder: n >= 3 ? 'rotating' : 'fixed',
    victoryCondition: hold ? { type: 'hold_site', siteId: 'relic', days: hold.days } : { type: 'elimination' },
    purchasableBuildingIds: null,
    heroHiringEnabled: true,
    hireableHeroIds: randomMapTavernPool(catalog),
    sites,
    objectives: [
      hold
        ? { id: 'victory', title: 'Hold the Shrine', description: `Own the Shrine of the First Flame at ${hold.days} dawns in a row — or defeat every rival empire.`, category: 'primary', initialStatus: 'active', condition: { type: 'flag', flag: 'rivals_eliminated' }, markerSiteId: 'relic' }
        : { id: 'victory', title: 'Conquer the realm', description: 'Defeat every rival hero and take every rival town.', category: 'primary', initialStatus: 'active', condition: { type: 'flag', flag: 'rivals_eliminated' } },
    ],
    hostileHeroes: [],
    helpTopics: [
      opts.skirmishMapId
        ? { id: 'skirmish_maps', title: 'Skirmish maps', text: 'An authored skirmish map: every empire’s home lands are laid out alike (mirrored or turned), so no seat starts with better ground. Its values are proposed and measured only in AI-against-AI games.' }
        : { id: 'custom_maps', title: 'Custom maps', text: 'This map was made in the map editor. Its towns, sites and goal are the author’s; nothing about it is generated or checked for fairness.' },
      ...(neutralTowns.length > 0
        ? [{ id: 'unowned_towns', title: 'Unowned towns', text: 'Unowned towns start without a lord or a hero; their own militia holds them. Defeat it (a siege) and the town is yours: build, recruit and hire there like in your home town — whatever its pantheon. An army of several pantheons fights with lower morale (−1 for each pantheon beyond the first, at most −2; neutral creatures never count). Proposed; values unplaytested.' }]
        : []),
      ...(doc.sites.some((s) => s.kind === 'neutral_dwelling' || s.kind === 'sluice' || s.kind === 'ferry' || s.kind === 'supply_depot')
        ? [{ id: 'map_landmarks', title: 'Hiring sites, sluices and ferries', text: 'A neutral hiring site hires its creatures to a hero of any pantheon: a few each week, shared by every empire; those not hired do not carry over. A hero standing on a sluice opens or closes it, and its channel changes ground at once (water to marsh, for example). A ferry landing carries a hero across to its twin landing. A supply depot gives its supplies once. Proposed; values unplaytested.' }]
        : []),
      ...(doc.sites.some((s) => s.kind === 'coastal_watchtower' || s.kind === 'sea_pickup' || s.kind === 'shipwreck') ? [SEA_SITES_HELP] : []),
      ...(hasSeaMonsters(doc) ? [SEA_MONSTERS_HELP] : []),
    ],
    protectedHeroFailure: false,
    thumbnailAssetId: opts.thumbnailAssetId ?? 'mission.skirmish.random.thumbnail',
  };
  const checks: MapCheck[] = [{ id: 'CUS-1', pass: true, detail: 'validated by validateCustomMap' }];
  const decor = buildDecor(map, deriveStreams(hashSeed(map.logicalHash), RANDOM_TEMPLATE_ID, 0));
  return { mission, map, decor, checks };
}

/**
 * The document without its unowned towns, and without the roads that only led to
 * them: from each such town, a road is followed back while it is a dead end that
 * reaches no other site.
 */
function withoutUnownedTowns(doc: CustomMapDocument): CustomMapDocument {
  const free = doc.sites.filter((s) => s.kind === 'town' && s.owner === undefined);
  if (free.length === 0) return doc;
  const roads = new Set(doc.roads);
  const keyOf = (c: HexCoord) => `${c.q},${c.r}`;
  const siteTiles = new Set(doc.sites.filter((s) => !free.includes(s)).map((s) => keyOf(s)));
  const links = (k: string) => [...roads].filter((e) => e.split('|').includes(k));
  for (const t of free) {
    let cur = keyOf(t);
    for (let guard = 0; guard < 200; guard++) {
      const here = links(cur);
      if (here.length !== 1 || (siteTiles.has(cur) && cur !== keyOf(t))) break;
      const e = here[0]!;
      roads.delete(e);
      cur = e.split('|').find((x) => x !== cur) ?? cur;
      if (siteTiles.has(cur)) break;
    }
  }
  return { ...doc, roads: doc.roads.filter((e) => roads.has(e)), sites: doc.sites.filter((s) => !free.includes(s)) };
}

function scale(c: ResourceCost, percent: number): ResourceCost {
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(c)) if (v) out[k] = Math.floor((v * percent) / 100);
  return out as ResourceCost;
}

function hashSeed(h: string): number {
  let x = 0;
  for (let i = 0; i < h.length; i++) x = (x * 31 + h.charCodeAt(i)) >>> 0;
  return x;
}
