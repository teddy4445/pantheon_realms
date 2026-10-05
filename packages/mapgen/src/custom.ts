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
  type GuardDefinition,
  type KeyColor,
  type RewardDefinition,
  type HexCoord,
  type MissionDefinition,
  type MissionRivalSetup,
  type ResourceCost,
  type SiteDefinition,
  type Terrain,
  type WorldMapDefinition,
} from '@pr/rules';
import { buildDecor, deriveStreams, type DecorItem, type MapCheck } from './generator';
import { RANDOM_TEMPLATE_ID, SKIRMISH_PLAYER_COLORS, SKIRMISH_START_WALLET, WEALTH_PERCENT, randomMapTavernPool, travelCosts } from './skirmish';

export { CUSTOM_MAP_FORMAT, CUSTOM_MAP_VERSION } from '@pr/rules';
export type { CustomGuard, CustomMapDocument, CustomPlayer, CustomQuest, CustomReward, CustomSite, CustomSiteKind, CustomVictory } from '@pr/rules';
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
}

export const CUSTOM_SITE_KINDS: readonly CustomSiteKindInfo[] = [
  { id: 'town', label: 'Town', summary: 'An empire’s home town (one per empire).', guardable: false },
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
];

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
    for (const k of ['name', 'text', 'heroId', 'twinId', 'spellId', 'skillId', 'creatureId'] as const) {
      const v = (s as unknown as Record<string, unknown>)[k];
      if (v !== undefined && (typeof v !== 'string' || v.length > (k === 'text' ? 400 : 60))) return { ok: false, error: `A site is damaged (${s.id}).` };
    }
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

/** Everything that keeps a map from being played (errors) or looks unintended (warnings). */
export function validateCustomMap(catalog: ContentCatalog, doc: CustomMapDocument): CustomMapIssue[] {
  const issues: CustomMapIssue[] = [];
  const err = (text: string, siteId?: string) => issues.push({ severity: 'error', text, ...(siteId ? { siteId } : {}) });
  const warn = (text: string, siteId?: string) => issues.push({ severity: 'warning', text, ...(siteId ? { siteId } : {}) });
  if (doc.players.length < 2) err('A map needs at least two empires.');
  doc.players.forEach((p, i) => {
    if (!catalog.skirmishKits[p.pantheonId]) err(`Empire ${i + 1}: ${p.pantheonId} cannot be played in a skirmish.`);
    const towns = doc.sites.filter((s) => s.kind === 'town' && s.owner === i);
    if (towns.length === 0) err(`Empire ${i + 1} has no town. Place one with the Town tool.`);
    if (towns.length > 1) err(`Empire ${i + 1} has ${towns.length} towns; each empire starts with exactly one.`);
  });
  const seen = new Map<string, string>();
  const ids = new Set<string>();
  for (const s of doc.sites) {
    const label = s.name || CUSTOM_SITE_KINDS.find((k) => k.id === s.kind)?.label || s.kind;
    if (ids.has(s.id)) err(`Two sites share the ID ${s.id}.`, s.id);
    ids.add(s.id);
    const c = { q: s.q, r: s.r };
    const t = terrainAt(doc, c);
    if (!passable(t)) err(`${label} stands on ${t === 'void' ? 'no ground' : t}.`, s.id);
    const k = hexKey(c);
    if (seen.has(k)) err(`${label} shares its tile with another site.`, s.id);
    seen.set(k, s.id);
    if (s.kind === 'town' && (s.owner === undefined || s.owner < 0 || s.owner >= doc.players.length)) err(`${label} belongs to no empire.`, s.id);
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
  }
  if (doc.victory.type === 'hold_relic') {
    const relics = doc.sites.filter((s) => s.kind === 'relic');
    if (relics.length !== 1) err('“Hold the shrine” needs exactly one Shrine of the First Flame on the map.');
  } else if (doc.sites.some((s) => s.kind === 'relic')) warn('The Shrine of the First Flame only matters with the “hold the shrine” goal.');
  // Reachability: every site from the first town, walking (portals count as links).
  const first = doc.sites.find((s) => s.kind === 'town' && s.owner === 0);
  if (first && issues.every((i) => i.severity !== 'error')) {
    const map = toWorldMap(doc);
    const reach = new Set(travelCosts(map, { q: first.q, r: first.r }).keys());
    let grew = true;
    while (grew) {
      grew = false;
      for (const s of doc.sites) {
        if (s.kind !== 'portal' || !reach.has(hexKey({ q: s.q, r: s.r }))) continue;
        const twin = doc.sites.find((x) => x.id === s.twinId);
        if (twin && !reach.has(hexKey({ q: twin.q, r: twin.r }))) {
          for (const k of travelCosts(map, { q: twin.q, r: twin.r }).keys()) reach.add(k);
          grew = true;
        }
      }
    }
    for (const s of doc.sites) if (!reach.has(hexKey({ q: s.q, r: s.r }))) err(`${s.name || CUSTOM_SITE_KINDS.find((k) => k.id === s.kind)?.label} cannot be reached from Empire 1’s town.`, s.id);
  }
  return issues;
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
}

/** The mission + logical map of a playable document (throws when `validateCustomMap` reports an error). */
export function compileCustomMap(catalog: ContentCatalog, doc: CustomMapDocument, seats: readonly CustomSeat[], opts: CustomCompileOptions = {}): CompiledCustomMap {
  const errors = validateCustomMap(catalog, doc).filter((i) => i.severity === 'error');
  if (errors.length > 0) throw new Error(`The map cannot be played: ${errors.map((e) => e.text).join(' ')}`);
  const n = doc.players.length;
  const map = toWorldMap(doc);
  const features = { expandedContent: true, weeklyEvents: true, interventions: true, heroSpecialties: true, neutralReactions: true, climateRules: true, aiTemperaments: true };
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
    const reward = s.reward && s.kind !== 'quest_hut' && s.kind !== 'artifact' ? rewardOf(s.reward, `${s.id}:guard`) : { resources: { gold: Math.max(100, Math.round((value * 0.25) / 50) * 50) } };
    return { label: s.guard.label ?? (s.kind === 'monster' ? c.pluralName : `${c.pluralName} on guard`), army: stacks, reward, battlefield };
  };
  /** The compiled site ID of a document site (towns and the relic are renamed). */
  const compiledId = (x: CustomSite): string => (x.kind === 'town' ? `site_${townIds[x.owner!]}` : x.kind === 'relic' ? 'relic' : x.id);
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
        const i = s.owner!;
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
    id: opts.skirmishMapId ? `skirmish_map_${opts.skirmishMapId}_${map.logicalHash.slice(0, 8)}` : `custom_${slug}_${map.logicalHash.slice(0, 8)}`,
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
    helpTopics: opts.skirmishMapId
      ? [{ id: 'skirmish_maps', title: 'Skirmish maps', text: 'An authored skirmish map: every empire’s home lands are laid out alike (mirrored or turned), so no seat starts with better ground. Its values are proposed and measured only in AI-against-AI games.' }]
      : [{ id: 'custom_maps', title: 'Custom maps', text: 'This map was made in the map editor. Its towns, sites and goal are the author’s; nothing about it is generated or checked for fairness.' }],
    protectedHeroFailure: false,
    thumbnailAssetId: opts.thumbnailAssetId ?? 'mission.skirmish.random.thumbnail',
  };
  const checks: MapCheck[] = [{ id: 'CUS-1', pass: true, detail: 'validated by validateCustomMap' }];
  const decor = buildDecor(map, deriveStreams(hashSeed(map.logicalHash), RANDOM_TEMPLATE_ID, 0));
  return { mission, map, decor, checks };
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
