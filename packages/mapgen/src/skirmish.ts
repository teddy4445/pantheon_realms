/**
 * SkirmishMapGenerator 0.2 (proposed): random skirmish maps for two to four
 * empires, with map types and settings modelled on the random-map scripts of
 * Age of Mythology and the zone templates of Heroes of Might and Magic III.
 *
 * Fairness by construction (unchanged from 0.1): the playable area is a
 * hexagon, the empires' towns sit at hex-symmetric positions around the
 * center, and everything — terrain, walls, roads, sites, guards, rewards,
 * wandering monsters — is generated once for the first empire's region and
 * copied to every other empire by the exact hex isometry (rotation or
 * reflection) that carries the first town onto theirs. The center is shared.
 *
 * Zones (HoMM3-style): each empire has a home zone around its town (sawmill,
 * quarry, supplies), an outer zone (camps, treasures, the gold mine) and the
 * shared center. Map types change the terrain and how the zones connect:
 *   continental — open country (0.1 behaviour);
 *   highlands   — a mountain ring around every home zone, left by two guarded
 *                 passes (HoMM3 "guarded connections");
 *   lake_isle   — a lake fills the center; the contested site stands on an
 *                 island reached by one causeway per empire (AoM "Ghost Lake");
 *   wild_forest — deep forest everywhere, clearings around sites (AoM "Alfheim");
 *   marshlands  — fens and pools that make roads precious (AoM "Marsh");
 *   crossroads  — a ring of peaks around a rich center, entered only through
 *                 one strongly guarded gate per empire (HoMM3 "Jebus Cross").
 * Settings: size (up to huge), guard strength, treasure, starting wealth,
 * roads, wandering monsters, revealed map and the victory condition.
 *
 * Output is DATA: a WorldMapDefinition and a full MissionDefinition (which the
 * match embeds), plus cosmetic decor and a validation report. Content (kits,
 * creatures, events, artifacts by rarity) comes from the catalog; nothing here
 * names a pantheon.
 */
import {
  RngCursor,
  TERRAIN_CODES,
  axialDistance,
  axialNeighbors,
  edgeKey,
  hashValue,
  hexKey,
  seedFromLabel,
  type ArtifactRarity,
  type ContentCatalog,
  type CreatureDefinition,
  type GuardDefinition,
  type HexCoord,
  type HostileHeroDefinition,
  type MissionDefinition,
  type MissionRivalSetup,
  type ResourceCost,
  type RewardDefinition,
  type ScenarioFeatures,
  type SiteDefinition,
  type StackSpec,
  type Terrain,
  type WorldMapDefinition,
} from '@pr/rules';
import { buildDecor, deriveStreams, type DecorItem, type MapCheck } from './generator';

export const SKIRMISH_GENERATOR_VERSION = 'pr-skirmishgen-0.2';
export const RANDOM_TEMPLATE_ID = 'random_skirmish';

export type SkirmishMapSize = 'small' | 'medium' | 'large' | 'huge';

/** Hexagon radius of the playable area per size. */
export const SKIRMISH_SIZE_RADIUS: Readonly<Record<SkirmishMapSize, number>> = { small: 14, medium: 17, large: 21, huge: 25 };
export const SKIRMISH_SIZE_LABEL: Readonly<Record<SkirmishMapSize, string>> = { small: 'Small', medium: 'Medium', large: 'Large', huge: 'Huge' };

export type SkirmishMapType = 'continental' | 'highlands' | 'lake_isle' | 'wild_forest' | 'marshlands' | 'crossroads';

export interface SkirmishMapTypeInfo {
  readonly id: SkirmishMapType;
  readonly label: string;
  readonly summary: string;
  /** The classic map this type learns from (credits only). */
  readonly inspiredBy: string;
}

export const SKIRMISH_MAP_TYPES: readonly SkirmishMapTypeInfo[] = [
  { id: 'continental', label: 'Continental', summary: 'Open country with forests, hills and fens; the gold mine or shrine stands at the heart.', inspiredBy: 'Age of Mythology “Greek” land maps' },
  { id: 'highlands', label: 'Highlands', summary: 'A ring of mountains shelters every home valley. Two guarded passes lead out.', inspiredBy: 'HoMM3 templates with guarded zone connections' },
  { id: 'lake_isle', label: 'Lake Isle', summary: 'A great lake fills the center. The contested site stands on an island reached by one causeway per empire.', inspiredBy: 'Age of Mythology “Ghost Lake”' },
  { id: 'wild_forest', label: 'Wild Forest', summary: 'Deep forest everywhere; travel is slow and roads are lifelines. Clearings hold the treasures.', inspiredBy: 'Age of Mythology “Alfheim”' },
  { id: 'marshlands', label: 'Marshlands', summary: 'Fens and black pools split the land. The paths between them are worth fighting for.', inspiredBy: 'Age of Mythology “Marsh”' },
  { id: 'crossroads', label: 'Crossroads', summary: 'Peaks ring a rich center that can be entered only through one strongly guarded gate per empire.', inspiredBy: 'HoMM3 “Jebus Cross”' },
];

export type GuardStrength = 'weak' | 'normal' | 'strong';
export type TreasureLevel = 'scarce' | 'normal' | 'rich';
export type StartWealth = 'low' | 'normal' | 'high';
export type RoadDensity = 'full' | 'sparse';

/** Multipliers (percent) for guard armies, rewards and the starting wallet. */
export const GUARD_PERCENT: Readonly<Record<GuardStrength, number>> = { weak: 60, normal: 100, strong: 160 };
export const TREASURE_PERCENT: Readonly<Record<TreasureLevel, number>> = { scarce: 60, normal: 100, rich: 150 };
export const WEALTH_PERCENT: Readonly<Record<StartWealth, number>> = { low: 50, normal: 100, high: 200 };

export interface SkirmishSeat {
  readonly pantheonId: string;
  readonly controller: 'human' | 'ai';
  readonly name?: string;
}

export type SkirmishVictory = { readonly type: 'elimination' } | { readonly type: 'hold_relic'; readonly days: number };

export interface SkirmishGenOptions {
  readonly seed: number;
  readonly size: SkirmishMapSize;
  /** Two to four empires; the first seat is the scenario's "player" seat. */
  readonly seats: readonly SkirmishSeat[];
  readonly victory: SkirmishVictory;
  readonly monsters: 'none' | 'few' | 'many';
  /** Map type (default continental). */
  readonly mapType?: SkirmishMapType;
  /** Strength of every guard and wandering monster (default normal). */
  readonly guards?: GuardStrength;
  /** Number and value of mines, caches and treasures (default normal). */
  readonly treasure?: TreasureLevel;
  /** Starting resources of every empire (default normal). */
  readonly startWealth?: StartWealth;
  /** Full: roads to every mine and camp; sparse: only to the sawmill and quarry (default full). */
  readonly roads?: RoadDensity;
  /** Every empire starts with the whole map explored (terrain and sites seen; heroes still hidden). */
  readonly revealMap?: boolean;
  /** Scenario features (default: all on, as in other skirmishes). */
  readonly features?: ScenarioFeatures;
}

export interface GeneratedSkirmish {
  readonly mission: MissionDefinition;
  readonly map: WorldMapDefinition;
  readonly decor: readonly DecorItem[];
  readonly checks: readonly MapCheck[];
}

export class SkirmishGenerationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SkirmishGenerationError';
  }
}

/** Four empires need at least a medium map (their nearest neighbour sits one radius away). */
export function skirmishSizeAllows(size: SkirmishMapSize, empires: number): boolean {
  return empires <= 3 || size !== 'small';
}

// ---------------------------------------------------------------------------
// Hex isometries about the map center (relative axial coordinates)
// ---------------------------------------------------------------------------

type Transform = (c: HexCoord) => HexCoord;

/** 60° rotation: cube (x, y, z) -> (−z, −x, −y), i.e. axial (q, r) -> (−r, q + r). */
const rot1: Transform = (c) => ({ q: -c.r, r: c.q + c.r });
const rotN = (n: number): Transform => (c) => {
  let x = c;
  for (let i = 0; i < n; i++) x = rot1(x);
  return x;
};
/** Reflection across the axis of direction (1, −1): (q, r) -> (−r, −q). */
const mirror: Transform = (c) => ({ q: -c.r, r: -c.q });
const identity: Transform = (c) => ({ q: c.q, r: c.r });
const compose = (outer: Transform, inner: Transform): Transform => (c) => outer(inner(c));

/**
 * The symmetry group for N empires, in seat order: element i carries the first
 * town (direction 0) onto town i. 2: 180° rotation; 3: 120° rotations;
 * 4: towns at directions 0, 2, 3, 5 with the 180° rotation and a reflection.
 */
function symmetryGroup(n: number): Transform[] {
  if (n === 2) return [identity, rotN(3)];
  if (n === 3) return [identity, rotN(4), rotN(2)];
  if (n === 4) return [identity, mirror, rotN(3), compose(mirror, rotN(3))];
  throw new SkirmishGenerationError(`Random maps support 2 to 4 empires, not ${n}`);
}

const relDist = (c: HexCoord) => axialDistance(c, { q: 0, r: 0 });

// ---------------------------------------------------------------------------
// Content helpers
// ---------------------------------------------------------------------------

interface BuildCtx {
  readonly rng: RngCursor;
  readonly catalog: ContentCatalog;
  /** Guard strength (percent). */
  readonly guardPct: number;
  /** Treasure value (percent). */
  readonly treasurePct: number;
  readonly scope: ScenarioFeatures;
}

const PALETTE = ['#3b73d9', '#c0392b', '#2e9e5b', '#c98a1b'];
const START_WALLET: ResourceCost = { gold: 10000, wood: 20, stone: 20, crystal: 10, favor: 10 };

/** Base-form creatures the generator may use for guards, camps and monsters (stable order). */
function candidateCreatures(catalog: ContentCatalog, minTier: number, maxTier: number): CreatureDefinition[] {
  return Object.values(catalog.creatures)
    .filter((c) => c.form === 'base' && c.implementationStatus === 'implemented' && !!c.stats && !!c.cost && (c.cost.gold ?? 0) > 0 && c.tier >= minTier && c.tier <= maxTier)
    .sort((a, b) => (a.id < b.id ? -1 : 1));
}

function pickCreature(ctx: BuildCtx, minTier: number, maxTier: number): CreatureDefinition {
  const pool = candidateCreatures(ctx.catalog, minTier, maxTier);
  if (pool.length === 0) throw new SkirmishGenerationError(`No creature of tier ${minTier}-${maxTier}`);
  return pool[ctx.rng.nextInt(pool.length)]!;
}

/** An army worth about `value` Gold of one creature (at least one creature). */
function armyOf(creature: CreatureDefinition, value: number): StackSpec {
  return { creatureId: creature.id, count: Math.max(1, Math.round(value / (creature.cost?.gold ?? 100))) };
}

/** A guard worth `value` Gold at normal strength (scaled by the guard setting). */
function guard(ctx: BuildCtx, label: string, value: number, minTier: number, maxTier: number, reward: GuardDefinition['reward'], battlefield: GuardDefinition['battlefield'], stacks = 1): GuardDefinition {
  const army: StackSpec[] = [];
  const scaled = (value * ctx.guardPct) / 100;
  for (let i = 0; i < stacks; i++) army.push(armyOf(pickCreature(ctx, minTier, maxTier), scaled / stacks));
  return { label, army, reward, battlefield };
}

/** Resources scaled by the treasure setting (whole numbers, at least 1 of anything given). */
function loot(ctx: BuildCtx, r: ResourceCost): ResourceCost {
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(r)) if (v) out[k] = Math.max(1, Math.round((v * ctx.treasurePct) / 100 / (k === 'gold' ? 50 : 1)) * (k === 'gold' ? 50 : 1));
  return out as ResourceCost;
}

function resourceSite(t: 'sawmill' | 'quarry' | 'gold_mine' | 'crystal_deposit', dailyYield: number): Pick<SiteDefinition, 'name' | 'description' | 'kind'> {
  const info = { sawmill: ['Sawmill', 'wood'], quarry: ['Quarry', 'stone'], gold_mine: ['Gold Mine', 'gold'], crystal_deposit: ['Crystal Deposit', 'crystal'] } as const;
  const [name, resource] = info[t];
  return { name, description: `Capture for +${dailyYield} ${resource} per day.`, kind: { type: 'resource_site', siteType: t, resource, dailyYield } };
}

/** Artifacts of a rarity the scenario may hold (stable order). Relics are unique: at most one copy per map. */
function artifactsOf(ctx: BuildCtx, rarities: readonly ArtifactRarity[]): string[] {
  return Object.values(ctx.catalog.artifacts)
    .filter((a) => rarities.includes(a.rarity ?? (a.unique ? 'relic' : 'minor')) && (a.scope !== 'expanded' || ctx.scope.expandedContent))
    .map((a) => a.id)
    .sort();
}

function pickArtifact(ctx: BuildCtx, rarities: readonly ArtifactRarity[]): string | null {
  const pool = artifactsOf(ctx, rarities);
  return pool.length ? pool[ctx.rng.nextInt(pool.length)]! : null;
}

function withArtifact(reward: RewardDefinition, artifactId: string | null): RewardDefinition {
  return artifactId ? { ...reward, artifactIds: [artifactId] } : reward;
}

function eventSite(ctx: BuildCtx, band: 'near' | 'far'): Pick<SiteDefinition, 'name' | 'description' | 'kind'> {
  const pool = Object.values(ctx.catalog.mapEventTemplates ?? {})
    .filter((e) => e.band === band)
    .sort((a, b) => (a.id < b.id ? -1 : 1));
  if (pool.length === 0) return { name: 'Supply Cache', description: 'Abandoned supplies.', kind: { type: 'pickup', reward: { resources: loot(ctx, { gold: 500 }) } } };
  const t = pool[ctx.rng.nextInt(pool.length)]!;
  return { name: t.title, description: t.text, kind: { type: 'map_event', title: t.title, text: t.text, options: t.options } };
}

// ---------------------------------------------------------------------------
// Region content (generated once for the first empire, copied to every other)
// ---------------------------------------------------------------------------

type Zone = 'home' | 'outer';

interface SiteSpec {
  readonly key: string;
  /** Distance band from the empire's own town. */
  readonly band: readonly [number, number];
  readonly zone: Zone;
  /** Gets a road from the town (full roads: every site with `road`; sparse: only the `essential` ones). */
  readonly road: 'essential' | 'full' | 'none';
  readonly build: (ctx: BuildCtx) => Omit<SiteDefinition, 'id' | 'anchorId' | 'coord'>;
}

function regionSpecs(R: number, homeR: number, treasure: TreasureLevel): SiteSpec[] {
  const far = Math.max(homeR + 4, R);
  const outerLo = Math.min(far - 1, homeR + 2);
  const specs: SiteSpec[] = [
    { key: 'sawmill', zone: 'home', band: [3, Math.min(5, homeR)], road: 'essential', build: () => resourceSite('sawmill', 2) },
    { key: 'quarry', zone: 'home', band: [3, Math.min(5, homeR)], road: 'essential', build: () => resourceSite('quarry', 2) },
    {
      key: 'cache',
      zone: 'home',
      band: [3, Math.min(6, homeR)],
      road: 'none',
      build: (ctx) => ({ name: 'Supply Cache', description: 'Abandoned supplies.', kind: { type: 'pickup', reward: { resources: loot(ctx, { gold: 400 + 100 * ctx.rng.nextInt(4), wood: 2, stone: 2 }) } } }),
    },
    {
      key: 'trinket',
      zone: 'home',
      band: [3, Math.min(6, homeR)],
      road: 'none',
      build: (ctx) => {
        const art = pickArtifact(ctx, ['treasure']);
        const name = art ? ctx.catalog.artifacts[art]!.name : 'Trinket';
        return { name: 'Wayside Shrine', description: `An offering left at a roadside shrine: ${name}.`, kind: { type: 'pickup', reward: withArtifact({ resources: loot(ctx, { gold: 200 }) }, art) } };
      },
    },
    { key: 'crystal', zone: 'outer', band: [outerLo, outerLo + 3], road: 'full', build: () => resourceSite('crystal_deposit', 1) },
    { key: 'event_near', zone: 'home', band: [4, Math.max(4, homeR)], road: 'none', build: (ctx) => eventSite(ctx, 'near') },
    {
      key: 'camp_low',
      zone: 'outer',
      band: [outerLo, outerLo + 3],
      road: 'full',
      build: (ctx) => {
        const c = pickCreature(ctx, 1, 2);
        return {
          name: `${c.name} Camp`,
          description: `${c.pluralName} gather here and will join a hero who pays their price.`,
          kind: { type: 'creature_camp', creatureId: c.id, weeklyGrowth: 4, initialStock: 6 },
          guard: guard(ctx, `${c.name} camp guard`, 1600, c.tier, c.tier, { resources: loot(ctx, { gold: 300 }) }, 'open_field'),
        };
      },
    },
    {
      key: 'treasure',
      zone: 'outer',
      band: [outerLo + 1, outerLo + 4],
      road: 'none',
      build: (ctx) => {
        const art = pickArtifact(ctx, ['minor']);
        return {
          name: 'Overgrown Ruin',
          description: 'Guardians lair in a ruin with an old treasure vault.',
          kind: { type: 'landmark', landmark: 'grove' },
          guard: guard(ctx, 'Ruin guardians', 3200, 2, 4, withArtifact({ resources: loot(ctx, { gold: 800, crystal: 2 }) }, art), 'grove'),
        };
      },
    },
    { key: 'event_far', zone: 'outer', band: [Math.max(outerLo, far - 2), far + 1], road: 'none', build: (ctx) => eventSite(ctx, 'far') },
    {
      key: 'gold',
      zone: 'outer',
      band: [Math.max(outerLo, far - 3), Math.max(outerLo + 1, far - 1)],
      road: 'full',
      build: (ctx) => ({ ...resourceSite('gold_mine', 500), guard: guard(ctx, 'Mine guards', 2600, 2, 3, { resources: loot(ctx, { gold: 500 }) }, 'open_field') }),
    },
    {
      key: 'camp_high',
      zone: 'outer',
      band: [Math.max(outerLo, far - 4), far + 1],
      road: 'full',
      build: (ctx) => {
        const c = pickCreature(ctx, 3, 4);
        return {
          name: `${c.name} Lair`,
          description: `${c.pluralName} keep a lair here and join a hero who pays their price.`,
          kind: { type: 'creature_camp', creatureId: c.id, weeklyGrowth: 2, initialStock: 3 },
          guard: guard(ctx, `${c.name} lair guard`, 3800, c.tier, c.tier, { resources: loot(ctx, { gold: 500 }) }, 'grove'),
        };
      },
    },
  ];
  if (treasure === 'scarce') return specs.filter((s) => s.key !== 'event_near' && s.key !== 'trinket' && s.key !== 'crystal');
  if (treasure === 'rich') {
    specs.push(
      { key: 'gold_small', zone: 'home', band: [3, Math.max(3, homeR)], road: 'essential', build: () => resourceSite('gold_mine', 250) },
      {
        key: 'vault',
        zone: 'outer',
        band: [Math.max(outerLo, far - 3), far + 1],
        road: 'none',
        build: (ctx) => {
          const art = pickArtifact(ctx, ['major']);
          return {
            name: 'Sealed Vault',
            description: 'A sealed vault of a fallen kingdom, watched by its last soldiers.',
            kind: { type: 'landmark', landmark: 'quarry_cache' },
            guard: guard(ctx, 'Vault wardens', 5200, 3, 5, withArtifact({ resources: loot(ctx, { gold: 1000, crystal: 3 }) }, art), 'grove', 2),
          };
        },
      },
      { key: 'crystal_2', zone: 'outer', band: [outerLo + 1, far], road: 'full', build: () => resourceSite('crystal_deposit', 1) },
    );
  }
  return specs;
}

// ---------------------------------------------------------------------------
// Generator
// ---------------------------------------------------------------------------

export function generateSkirmish(catalog: ContentCatalog, opts: SkirmishGenOptions): GeneratedSkirmish {
  const n = opts.seats.length;
  if (n < 2 || n > 4) throw new SkirmishGenerationError(`Random maps support 2 to 4 empires, not ${n}`);
  if (!skirmishSizeAllows(opts.size, n)) throw new SkirmishGenerationError('Four empires need a medium or larger map');
  for (const s of opts.seats) if (!catalog.skirmishKits?.[s.pantheonId]) throw new SkirmishGenerationError(`No skirmish kit for ${s.pantheonId}`);
  const mapType: SkirmishMapType = opts.mapType ?? 'continental';
  const guards: GuardStrength = opts.guards ?? 'normal';
  const treasure: TreasureLevel = opts.treasure ?? 'normal';
  const wealth: StartWealth = opts.startWealth ?? 'normal';
  const roadsSetting: RoadDensity = opts.roads ?? 'full';
  const features = opts.features ?? { expandedContent: true, weeklyEvents: true, interventions: true };
  const seed = opts.seed >>> 0;
  const Rh = SKIRMISH_SIZE_RADIUS[opts.size];
  const W = 2 * Rh + 3;
  const H = W;
  const center: HexCoord = { q: Rh + 1, r: Rh + 1 };
  const abs = (c: HexCoord): HexCoord => ({ q: c.q + center.q, r: c.r + center.r });
  const rel = (c: HexCoord): HexCoord => ({ q: c.q - center.q, r: c.r - center.r });
  const group = symmetryGroup(n);
  const R = Math.round(Rh * 0.76);
  const A: HexCoord = { q: R, r: 0 };
  const townsRel = group.map((g) => g(A));
  const inside = (c: HexCoord) => relDist(c) <= Rh;
  // The nearest rival town bounds the home zone: its ring must lie strictly inside the first region.
  const nearestTown = Math.min(...townsRel.slice(1).map((t) => axialDistance(A, t)));
  const homeR = Math.max(4, Math.min(Math.round(R * 0.45), Math.floor((nearestTown - 1) / 2) - 1));
  const ringK = homeR + 1;
  const tag = `${SKIRMISH_GENERATOR_VERSION}|${seed}|${mapType}`;

  // --- Terrain: symmetric value noise (one sample per symmetry orbit) -------
  const orbitKey = (c: HexCoord) => group.map((g) => hexKey(g(c))).sort()[0]!;
  const noise = (c: HexCoord, channel: string) => seedFromLabel(`${tag}|${channel}|${orbitKey(c)}`) / 4294967296;
  const cellsRel: HexCoord[] = [];
  for (let r = 0; r < H; r++) for (let q = 0; q < W; q++) cellsRel.push(rel({ q, r }));
  const smooth = (c: HexCoord, channel: string) => {
    const ns = [c, ...axialNeighbors(c)];
    return ns.reduce((sum, x) => sum + noise(x, channel), 0) / ns.length;
  };
  const terrain = new Map<string, Terrain>();
  /** Structural walls (mountain rings, the lake): never carved by roads or clearings. */
  const hard = new Set<string>();
  const baseTerrain = (c: HexCoord): Terrain => {
    const v = smooth(c, 'veg');
    const m = noise(c, 'mtn');
    const w = smooth(c, 'wet');
    const edge = relDist(c) <= Rh - 1;
    switch (mapType) {
      case 'highlands':
        if (edge && m > 0.88) return 'mountain';
        if (v > 0.64) return 'forest';
        if (v < 0.44) return 'rough';
        return w > 0.72 ? 'marsh' : 'plains';
      case 'wild_forest':
        if (edge && m > 0.95) return 'mountain';
        if (v > 0.42) return 'forest';
        if (v < 0.3) return 'rough';
        return w > 0.74 ? 'marsh' : 'plains';
      case 'marshlands':
        if (edge && m > 0.97) return 'mountain';
        if (w > 0.6 && noise(c, 'pool') > 0.86) return 'water';
        if (w > 0.5) return 'marsh';
        if (v > 0.7) return 'forest';
        return v < 0.32 ? 'rough' : 'plains';
      default:
        if (edge && m > 0.93) return 'mountain';
        if (v > 0.62) return 'forest';
        if (v < 0.36) return 'rough';
        return w > 0.66 ? 'marsh' : 'plains';
    }
  };
  for (const c of cellsRel) terrain.set(hexKey(c), inside(c) ? baseTerrain(c) : 'water');
  const tAt = (c: HexCoord) => terrain.get(hexKey(c));
  const passableT = (t: Terrain | undefined) => !!t && t !== 'water' && t !== 'mountain';
  const setOrbit = (c: HexCoord, t: Terrain) => {
    for (const g of group) terrain.set(hexKey(g(c)), t);
  };
  const hardOrbit = (c: HexCoord, t: Terrain) => {
    for (const g of group) {
      terrain.set(hexKey(g(c)), t);
      hard.add(hexKey(g(c)));
    }
  };
  /** Clear to passable ground unless the cell is a structural wall. */
  const clearOrbit = (c: HexCoord, t: Terrain = 'plains') => {
    if (hard.has(hexKey(c)) || !inside(c)) return;
    setOrbit(c, t);
  };
  const inRegionA = (c: HexCoord) => inside(c) && relDist(c) >= 3 && townsRel.every((t, i) => i === 0 || axialDistance(c, A) < axialDistance(c, t));
  const regionA = cellsRel.filter(inRegionA).sort((a, b) => (hexKey(a) < hexKey(b) ? -1 : 1));

  // --- Structure by map type --------------------------------------------------
  /** Gate cells (relative, region A): guarded openings in a structural wall. */
  const gates: { pos: HexCoord; kind: 'pass' | 'gate' }[] = [];
  let centerR = 2;
  if (mapType === 'highlands') {
    const ring = regionA.filter((c) => axialDistance(c, A) === ringK);
    // One pass toward the center, one toward the far side of the valley.
    const sorted = [...ring].sort((a, b) => relDist(a) - relDist(b) || (hexKey(a) < hexKey(b) ? -1 : 1));
    const toCenter = sorted[0]!;
    const outward = [...ring]
      .filter((c) => relDist(c) <= Rh - 2)
      .sort((a, b) => axialDistance(b, toCenter) - axialDistance(a, toCenter) || (hexKey(a) < hexKey(b) ? -1 : 1))[0]!;
    for (const c of ring) if (!(c.q === toCenter.q && c.r === toCenter.r) && !(c.q === outward.q && c.r === outward.r)) hardOrbit(c, 'mountain');
    gates.push({ pos: toCenter, kind: 'pass' }, { pos: outward, kind: 'pass' });
  } else if (mapType === 'crossroads') {
    centerR = Math.max(3, Math.round(Rh * 0.3));
    const ring = cellsRel.filter((c) => relDist(c) === centerR);
    const gateA = ring.filter((c) => inRegionA(c)).sort((a, b) => axialDistance(a, A) - axialDistance(b, A) || (hexKey(a) < hexKey(b) ? -1 : 1))[0]!;
    const gateKeys = new Set(group.map((g) => hexKey(g(gateA))));
    for (const c of ring) if (!gateKeys.has(hexKey(c))) hardOrbit(c, 'mountain');
    gates.push({ pos: gateA, kind: 'gate' });
  } else if (mapType === 'lake_isle') {
    const lakeR = Math.max(4, Math.round(Rh * 0.33));
    centerR = lakeR;
    // The causeway: the straight line from the center toward the first town, copied to every empire.
    const causeway = new Set<string>();
    for (let k = 3; k <= lakeR; k++) for (const g of group) causeway.add(hexKey(g({ q: k, r: 0 })));
    for (const c of cellsRel) {
      const d = relDist(c);
      if (d > 2 && d <= lakeR && !causeway.has(hexKey(c))) hardOrbit(c, 'water');
    }
    for (let k = 3; k <= lakeR; k++) setOrbit({ q: k, r: 0 }, 'plains');
  }
  // Clear the towns and the center.
  for (const c of cellsRel) {
    if (!inside(c)) continue;
    if (relDist(c) <= 2 || axialDistance(c, A) <= 2) clearOrbit(c);
  }
  for (const gt of gates) {
    setOrbit(gt.pos, 'plains');
    for (const nb of axialNeighbors(gt.pos)) clearOrbit(nb, tAt(nb) === 'mountain' || tAt(nb) === 'water' ? 'rough' : tAt(nb)!);
  }

  // --- Sites: chosen in the first empire's region, copied by symmetry ----
  const rng = new RngCursor(seedFromLabel(`${tag}|sites`));
  const ctx: BuildCtx = { rng, catalog, guardPct: GUARD_PERCENT[guards], treasurePct: TREASURE_PERCENT[treasure], scope: features };
  const zoneOf = (c: HexCoord): Zone | 'center' => (relDist(c) < centerR + 1 ? 'center' : axialDistance(c, A) <= homeR ? 'home' : 'outer');
  const nearHard = (c: HexCoord) => [c, ...axialNeighbors(c)].some((x) => hard.has(hexKey(x)));
  const chosen: { spec: SiteSpec; pos: HexCoord }[] = [];
  const gateClear = (c: HexCoord) => gates.every((g) => axialDistance(g.pos, c) >= 2);
  const taken = (c: HexCoord, gap: number) => chosen.some((x) => axialDistance(x.pos, c) < gap) || axialDistance(c, A) < 3 || !gateClear(c);
  for (const spec of regionSpecs(R, homeR, treasure)) {
    let [lo, hi] = spec.band;
    let picked: HexCoord | null = null;
    for (let widen = 0; widen < 5 && !picked; widen++) {
      const cands = regionA.filter((c) => {
        const d = axialDistance(c, A);
        const z = zoneOf(c);
        const zoneOk = mapType === 'highlands' ? z === spec.zone : z !== 'center';
        return d >= lo && d <= hi && zoneOk && !taken(c, 2) && relDist(c) <= Rh - 1 && !nearHard(c);
      });
      if (cands.length > 0) picked = cands[rng.nextInt(cands.length)]!;
      lo = Math.max(2, lo - 1);
      hi += 2;
    }
    if (picked) chosen.push({ spec, pos: picked });
  }
  // Inner treasures of the Crossroads center: one vault per empire just inside its gate.
  const inner: HexCoord[] = [];
  if (mapType === 'crossroads' && gates[0]) {
    const g0 = gates[0].pos;
    const cand = cellsRel
      .filter((c) => relDist(c) === centerR - 2 && axialDistance(c, g0) <= 3 && !hard.has(hexKey(c)))
      .sort((a, b) => axialDistance(a, g0) - axialDistance(b, g0) || (hexKey(a) < hexKey(b) ? -1 : 1));
    if (cand[0] && relDist(cand[0]) >= 2) inner.push(cand[0]);
  }
  // Wandering monsters' homes (also in region A, outside the home zone).
  const monsterCount = opts.monsters === 'none' ? 0 : opts.monsters === 'few' ? 1 : 2;
  const monsterHomes: HexCoord[] = [];
  for (let i = 0; i < monsterCount; i++) {
    const cands = regionA.filter((c) => {
      const d = axialDistance(c, A);
      return d >= Math.max(6, homeR + 1) && d <= R + 1 && !taken(c, 3) && !monsterHomes.some((h) => axialDistance(h, c) < 4) && relDist(c) >= centerR + 2 && !nearHard(c);
    });
    if (cands.length > 0) monsterHomes.push(cands[rng.nextInt(cands.length)]!);
  }
  // Clearings: every site stands on open ground with an open ring around it (the wild forest's glades).
  for (const s of chosen) {
    clearOrbit(s.pos, tAt(s.pos) === 'marsh' && mapType === 'marshlands' ? 'marsh' : 'plains');
    for (const c of axialNeighbors(s.pos)) {
      const t = tAt(c);
      if (t === 'mountain' || t === 'water') clearOrbit(c, 'rough');
      else if (mapType === 'wild_forest' && t === 'forest') clearOrbit(c, 'plains');
    }
  }
  for (const c of inner) clearOrbit(c);
  for (const h of monsterHomes) clearOrbit(h);

  // --- Reachability repair: carve through non-structural mountains/pools so every site connects ---
  const reachFrom = (from: HexCoord): Set<string> => {
    const seen = new Set<string>([hexKey(from)]);
    const queue = [from];
    while (queue.length) {
      const cur = queue.pop()!;
      for (const nb of axialNeighbors(cur)) {
        const k = hexKey(nb);
        if (seen.has(k) || !inside(nb) || !passableT(tAt(nb))) continue;
        seen.add(k);
        queue.push(nb);
      }
    }
    return seen;
  };
  const carve = (from: HexCoord, to: HexCoord) => {
    // Dijkstra where soft impassable cells cost a lot; structural walls stay closed.
    const dist = new Map<string, number>([[hexKey(from), 0]]);
    const prev = new Map<string, HexCoord>();
    const open: { c: HexCoord; d: number }[] = [{ c: from, d: 0 }];
    while (open.length) {
      open.sort((a, b) => a.d - b.d || (hexKey(a.c) < hexKey(b.c) ? -1 : 1));
      const cur = open.shift()!;
      if (hexKey(cur.c) === hexKey(to)) break;
      if (cur.d > (dist.get(hexKey(cur.c)) ?? Infinity)) continue;
      for (const nb of axialNeighbors(cur.c)) {
        const k = hexKey(nb);
        if (!inside(nb) || hard.has(k)) continue;
        const step = passableT(tAt(nb)) ? 1 : 25;
        const nd = cur.d + step;
        if (nd < (dist.get(k) ?? Infinity)) {
          dist.set(k, nd);
          prev.set(k, cur.c);
          open.push({ c: nb, d: nd });
        }
      }
    }
    let k = hexKey(to);
    let c: HexCoord | undefined = to;
    while (c && prev.has(k)) {
      if (!passableT(tAt(c))) setOrbit(c, 'rough');
      c = prev.get(k);
      k = c ? hexKey(c) : '';
    }
  };
  const targets: HexCoord[] = [{ q: 0, r: 0 }, ...chosen.map((x) => x.pos), ...inner, ...monsterHomes, ...gates.map((g) => g.pos)];
  for (let pass = 0; pass < 3; pass++) {
    const reach = reachFrom(A);
    const missing = targets.filter((t) => !reach.has(hexKey(t)));
    if (missing.length === 0) break;
    for (const t of missing) carve(A, t);
  }

  // --- Roads: the first empire's town to its sites, then copied ----
  const roadEdges = new Set<string>();
  const route = (from: HexCoord, to: HexCoord): HexCoord[] | null => {
    // Dijkstra over relative coords; soft mountains cost a lot (opened later), walls and water are closed.
    const cost = (c: HexCoord) => {
      const t = tAt(c);
      if (!t || t === 'water' || !inside(c) || hard.has(hexKey(c))) return null;
      if (t === 'mountain') return 40;
      return t === 'plains' ? 4 : t === 'marsh' ? 7 : 5 + (noise(c, 'road') > 0.5 ? 1 : 0);
    };
    const dist = new Map<string, number>([[hexKey(from), 0]]);
    const prev = new Map<string, string>();
    const open: { k: string; c: HexCoord; d: number }[] = [{ k: hexKey(from), c: from, d: 0 }];
    while (open.length) {
      open.sort((a, b) => a.d - b.d || (a.k < b.k ? -1 : 1));
      const cur = open.shift()!;
      if (cur.d > (dist.get(cur.k) ?? Infinity)) continue;
      if (cur.k === hexKey(to)) break;
      for (const nb of axialNeighbors(cur.c)) {
        const step = cost(nb);
        if (step === null) continue;
        const nd = cur.d + step;
        const nk = hexKey(nb);
        if (nd < (dist.get(nk) ?? Infinity)) {
          dist.set(nk, nd);
          prev.set(nk, cur.k);
          open.push({ k: nk, c: nb, d: nd });
        }
      }
    }
    if (!dist.has(hexKey(to))) return null;
    const path: HexCoord[] = [];
    let k: string | undefined = hexKey(to);
    while (k) {
      const [q, r] = k.split(',').map(Number);
      path.unshift({ q: q!, r: r! });
      k = prev.get(k);
    }
    return path;
  };
  const addRoad = (path: HexCoord[]) => {
    for (let i = 1; i < path.length; i++) {
      for (const g of group) roadEdges.add(edgeKey(abs(g(path[i - 1]!)), abs(g(path[i]!))));
    }
    for (const c of path) if (tAt(c) === 'mountain') setOrbit(c, 'rough');
  };
  // No road to the contested center: it is reached across country (about a day's march),
  // so rival towns are well over a day apart (Twin Harbors lesson: one-day reach decides games).
  const toCenter = route(A, { q: 0, r: 0 });
  if (!toCenter) throw new SkirmishGenerationError('No route from a town to the center');
  for (const c of toCenter) if (tAt(c) === 'mountain') setOrbit(c, 'rough');
  for (const s of chosen) {
    if (s.spec.road === 'none' || (roadsSetting === 'sparse' && s.spec.road !== 'essential')) continue;
    const p = route(A, s.pos);
    if (p) addRoad(p);
  }
  // Roads through the passes of the highlands (a road should lead out of every valley).
  if (mapType === 'highlands' && roadsSetting === 'full') for (const gt of gates) { const p = route(A, gt.pos); if (p) addRoad(p); }

  // --- Mission content ---------------------------------------------------------
  const sites: SiteDefinition[] = [];
  const kits = opts.seats.map((s) => catalog.skirmishKits[s.pantheonId]!);
  const usedNames = new Map<string, number>();
  const leaderUse = new Map<string, number>();
  const townIds = opts.seats.map((_, i) => `town_${i + 1}`);
  const playerIds = opts.seats.map((_, i) => (i === 0 ? 'player' : `p${i + 1}`));
  const townNames = kits.map((k) => {
    const used = usedNames.get(k.pantheonId) ?? 0;
    usedNames.set(k.pantheonId, used + 1);
    return k.townNames[used % k.townNames.length] ?? `Town ${used + 1}`;
  });
  townsRel.forEach((t, i) => {
    sites.push({ id: `site_${townIds[i]}`, anchorId: `site_${townIds[i]}`, coord: abs(t), name: townNames[i]!, description: `${opts.seats[i]!.name ?? townNames[i]}’s home town.`, kind: { type: 'town', townId: townIds[i]! } });
  });
  // Region sites: build once (same creature, reward and text for every empire), place in every region.
  for (const s of chosen) {
    const built = s.spec.build(ctx);
    group.forEach((g, i) => {
      const id = `${s.spec.key}_${i + 1}`;
      sites.push({ id, anchorId: id, coord: abs(g(s.pos)), ...built });
    });
  }
  // Guarded passes and gates (the zone connections).
  gates.forEach((gt, gi) => {
    const strong = gt.kind === 'gate';
    const built: Omit<SiteDefinition, 'id' | 'anchorId' | 'coord'> = {
      name: strong ? 'Gate of the Crossroads' : gi === 0 ? 'Valley Pass' : 'High Pass',
      description: strong ? 'The only way through the ring of peaks into the rich center.' : 'A guarded pass out of the home valley.',
      kind: { type: 'crossing' },
      guard: strong
        ? guard(ctx, 'Gate wardens', 6400, 3, 5, withArtifact({ resources: loot(ctx, { gold: 1000, crystal: 2 }) }, null), 'ridge_pass', 2)
        : guard(ctx, gi === 0 ? 'Pass guards' : 'Highland raiders', gi === 0 ? 1500 : 2200, 1, 3, { resources: loot(ctx, { gold: 400 }) }, 'ridge_pass'),
    };
    group.forEach((g, i) => {
      const id = `${strong ? 'gate' : `pass${gi + 1}`}_${i + 1}`;
      sites.push({ id, anchorId: id, coord: abs(g(gt.pos)), ...built });
    });
  });
  // The Crossroads center's inner vaults (one major artifact each).
  if (inner.length) {
    const art = pickArtifact(ctx, ['major']);
    const built: Omit<SiteDefinition, 'id' | 'anchorId' | 'coord'> = {
      name: 'Inner Vault',
      description: 'A treasure vault inside the ring of peaks.',
      kind: { type: 'landmark', landmark: 'quarry_cache' },
      guard: guard(ctx, 'Vault wardens', 5600, 4, 6, withArtifact({ resources: loot(ctx, { gold: 1500, crystal: 3 }) }, art), 'grove', 2),
    };
    group.forEach((g, i) => {
      const id = `inner_vault_${i + 1}`;
      sites.push({ id, anchorId: id, coord: abs(g(inner[0]!)), ...built });
    });
  }
  // Contested center (with a relic-class artifact on rich maps and at the Crossroads).
  const victory = opts.victory;
  const centerRelic = treasure === 'rich' || mapType === 'crossroads' ? pickArtifact(ctx, ['relic']) : null;
  if (victory.type === 'hold_relic') {
    sites.push({
      id: 'relic',
      anchorId: 'relic',
      coord: abs({ q: 0, r: 0 }),
      name: 'Shrine of the First Flame',
      description: `Hold the shrine at ${victory.days} dawns in a row to win.`,
      kind: { type: 'relic' },
      guard: guard(ctx, 'Shrine wardens', 9000, 4, 6, withArtifact({ resources: loot(ctx, { gold: 1500 }) }, centerRelic), 'beacon_clearing', 2),
    });
  } else {
    sites.push({
      id: 'center_gold',
      anchorId: 'center_gold',
      coord: abs({ q: 0, r: 0 }),
      ...resourceSite('gold_mine', 1000),
      guard: guard(ctx, 'Mine guards', 8000, 4, 6, withArtifact({ resources: loot(ctx, { gold: 1000, crystal: 2 }) }, centerRelic), 'open_field', 2),
    });
  }

  // Wandering monsters: one army per home, copied to every region.
  const hostileHeroes: HostileHeroDefinition[] = [];
  monsterHomes.forEach((home, mi) => {
    const creature = pickCreature(ctx, 2, 4);
    const army = [armyOf(creature, ((mi === 0 ? 2200 : 3600) * ctx.guardPct) / 100)];
    const loopRel = regionA.filter((c) => axialDistance(c, home) === 2 && passableT(tAt(c))).sort((a, b) => (hexKey(a) < hexKey(b) ? -1 : 1));
    const way: HexCoord[] = [home];
    for (let k = 0; k < 2 && loopRel.length > 0; k++) way.push(loopRel.splice(rng.nextInt(loopRel.length), 1)[0]!);
    group.forEach((g) => {
      const start = abs(g(home));
      hostileHeroes.push({
        commander: {
          heroDefinitionId: `monster_${creature.id}`,
          name: `Wandering ${creature.pluralName}`,
          classId: 'champion',
          level: 1,
          attributes: { attack: 0, defense: 0, power: 0, knowledge: 0 },
          skills: [],
          spellbook: false,
          spellIds: [],
          mana: 0,
          portraitAssetId: creature.presentation.portraitAssetId,
        },
        monster: { bounty: loot(ctx, { gold: mi === 0 ? 600 : 900 }) },
        startCoord: start,
        army,
        ai: {
          profile: 'patrol',
          waypoints: way.map((w) => abs(g(w))),
          regionMinQ: 0,
          regionMaxQ: 999,
          regionCenter: start,
          regionRadius: 3,
          attackThreshold: { numerator: 3, denominator: 2 },
        },
      });
    });
  });

  // Players: seat 0 is the scenario's player seat; the others are rival seats (human or AI).
  const wallet = scaleCost(START_WALLET, WEALTH_PERCENT[wealth]);
  const setupFor = (i: number) => {
    const kit = kits[i]!;
    const k = leaderUse.get(kit.pantheonId) ?? 0;
    leaderUse.set(kit.pantheonId, k + 1);
    const leader = kit.leaders[k % kit.leaders.length]!;
    const def = catalog.heroes[leader.definitionId];
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
      portrait: def?.portraitAssetId ?? leader.portraitAssetId,
    };
  };
  const seat0 = setupFor(0);
  const rivals: MissionRivalSetup[] = opts.seats.slice(1).map((seat, j) => {
    const i = j + 1;
    const s = setupFor(i);
    return {
      playerId: playerIds[i]!,
      name: seat.name ?? townNames[i]!,
      pantheonId: seat.pantheonId,
      color: PALETTE[i % PALETTE.length]!,
      wallet,
      controller: seat.controller,
      town: s.town,
      hero: s.hero,
    };
  });
  const sizeLabel = SKIRMISH_SIZE_LABEL[opts.size];
  const typeInfo = SKIRMISH_MAP_TYPES.find((t) => t.id === mapType)!;
  const settingsKey = [mapType, guards, treasure, wealth, roadsSetting, opts.revealMap ? 'revealed' : 'fog'].join('-');
  const id = `random_${opts.size}_${n}p_${seed}${settingsKey === 'continental-normal-normal-normal-full-fog' ? '' : `_${settingsKey}`}`;
  const relicSite = sites.find((s) => s.id === 'relic');
  const mission: MissionDefinition = {
    id,
    scenarioId: id,
    campaignId: null,
    order: 1,
    name: `Random Map — ${typeInfo.label}`,
    subtitle: `${sizeLabel} · ${n} empires · seed ${seed}`,
    summary: `A generated ${sizeLabel.toLowerCase()} ${typeInfo.label.toLowerCase()} map for ${n} empires. ${typeInfo.summary} ${victory.type === 'hold_relic' ? `Win by holding the central shrine for ${victory.days} days, or by defeating every rival.` : 'Win by defeating every rival empire.'} Every empire gets the same terrain, roads and treasures around its town (symmetric map). Guards ${guards}, treasure ${treasure}, starting wealth ${wealth}. Proposed feature; values unplaytested.`,
    mapTemplateId: RANDOM_TEMPLATE_ID,
    soundscape: mapType === 'highlands' || mapType === 'crossroads' ? 'high_pass' : 'coast',
    targetPlaytime: n === 2 ? '30–60 minutes (unmeasured)' : '45–90 minutes (unmeasured)',
    newDecisions: ['Random map', typeInfo.label, `${n} empires`, victory.type === 'hold_relic' ? 'Hold the relic' : 'Conquest'],
    xpCap: null,
    xpCapLevel: null,
    briefing: [{ speaker: 'Herald', portraitAssetId: seat0.portrait, text: victory.type === 'hold_relic' ? `The Shrine of the First Flame burns at the heart of these lands. Whoever holds it for ${victory.days} days will rule them all.` : 'Rival empires wake across the land. Only one will remain.' }],
    victory: [{ speaker: 'Herald', portraitAssetId: seat0.portrait, text: 'The realm is yours.' }],
    debriefPolicy: [],
    player: {
      playerId: 'player',
      name: opts.seats[0]!.name ?? townNames[0]!,
      controller: opts.seats[0]!.controller,
      pantheonId: opts.seats[0]!.pantheonId,
      wallet,
      town: seat0.town,
      hero: seat0.hero,
    },
    rivals,
    ...(monsterCount > 0 ? { hostilePlayer: { playerId: 'monsters', name: 'Wild creatures' } } : {}),
    initialFlags: ['skirmish'],
    features,
    ...(opts.revealMap ? { startExplored: true } : {}),
    victoryCondition: victory.type === 'hold_relic' && relicSite ? { type: 'hold_site', siteId: relicSite.id, days: victory.days } : { type: 'elimination' },
    purchasableBuildingIds: null,
    heroHiringEnabled: true,
    sites,
    objectives: [
      victory.type === 'hold_relic'
        ? { id: 'victory', title: 'Hold the Shrine', description: `Own the Shrine of the First Flame at ${victory.days} dawns in a row — or defeat every rival empire.`, category: 'primary', initialStatus: 'active', condition: { type: 'flag', flag: 'rivals_eliminated' }, markerSiteId: 'relic' }
        : { id: 'victory', title: 'Conquer the realm', description: 'Defeat every rival hero and take every rival town.', category: 'primary', initialStatus: 'active', condition: { type: 'flag', flag: 'rivals_eliminated' } },
      ...(victory.type === 'elimination' ? [{ id: 'center_gold', title: 'Take the central gold mine', description: 'Defeat the mine guards and hold the gold mine at the heart of the map.', category: 'optional' as const, initialStatus: 'active' as const, condition: { type: 'site_cleared' as const, siteId: 'center_gold' }, markerSiteId: 'center_gold' }] : []),
    ],
    hostileHeroes,
    helpTopics: [
      { id: 'random_maps', title: 'Random maps', text: `Random maps are symmetric: every empire has the same terrain, roads, mines, camps and treasures around its town, so no starting position is favored. ${typeInfo.label}: ${typeInfo.summary} Creature camps sell creatures to a visiting hero; map events happen once, to the first hero who arrives. Wandering monsters roam near their lair and attack heroes they can beat.` },
      { id: 'sieges', title: 'Sieges', text: 'Entering an enemy town that has a garrison or a visiting hero starts a siege. The Fort gives walls and a gate, the Citadel adds a keep and a moat, the Castle stronger walls and two towers. Temporary siege model; values are proposed.' },
    ],
    protectedHeroFailure: false,
    thumbnailAssetId: 'mission.skirmish.random.thumbnail',
  };

  // --- Logical map -------------------------------------------------------------
  let terrainStr = '';
  for (let r = 0; r < H; r++) for (let q = 0; q < W; q++) terrainStr += TERRAIN_CODES[terrain.get(hexKey(rel({ q, r }))) ?? 'water'];
  const roads = [...roadEdges].sort();
  const map: WorldMapDefinition = {
    templateId: RANDOM_TEMPLATE_ID,
    templateVersion: 1,
    generatorVersion: SKIRMISH_GENERATOR_VERSION,
    seed,
    attempt: 0,
    mode: 'variation',
    width: W,
    height: H,
    terrain: terrainStr,
    roads,
    logicalHash: hashValue({ templateId: RANDOM_TEMPLATE_ID, width: W, height: H, terrain: terrainStr, roads }),
    biome: mapType === 'highlands' ? 'high_pass' : mapType === 'crossroads' ? 'storm_plateau' : mapType === 'lake_isle' || mapType === 'marshlands' ? 'coast' : 'temperate',
  };
  const checks = validateSkirmishMap(map, mission, mapType);
  const failed = checks.filter((c) => !c.pass);
  if (failed.length > 0) throw new SkirmishGenerationError(`Generated map failed validation: ${failed.map((c) => `${c.id} ${c.detail}`).join('; ')}`);
  const decor = buildDecor(map, deriveStreams(seed, RANDOM_TEMPLATE_ID, 0));
  return { mission, map, decor, checks };
}

function scaleCost(c: ResourceCost, percent: number): ResourceCost {
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(c)) if (v) out[k] = Math.floor((v * percent) / 100);
  return out as ResourceCost;
}

// ---------------------------------------------------------------------------
// Validation (also used by tests): reachability, placement and fairness
// ---------------------------------------------------------------------------

function terrainOf(map: WorldMapDefinition, c: HexCoord): string {
  if (c.q < 0 || c.r < 0 || c.q >= map.width || c.r >= map.height) return 'w';
  return map.terrain[c.r * map.width + c.q] ?? 'w';
}

/** Road-aware travel costs from `from` (75 on a road, terrain cost otherwise; mountains/water impassable). */
export function travelCosts(map: WorldMapDefinition, from: HexCoord, blocked: ReadonlySet<string> = new Set()): Map<string, number> {
  const cost: Record<string, number | null> = { p: 100, f: 125, r: 125, s: 150, m: null, w: null };
  const roadSet = new Set(map.roads);
  const dist = new Map<string, number>([[hexKey(from), 0]]);
  const open: { c: HexCoord; d: number }[] = [{ c: from, d: 0 }];
  while (open.length) {
    open.sort((a, b) => a.d - b.d || (hexKey(a.c) < hexKey(b.c) ? -1 : 1));
    const cur = open.shift()!;
    if (cur.d > (dist.get(hexKey(cur.c)) ?? Infinity)) continue;
    for (const nb of axialNeighbors(cur.c)) {
      const base = cost[terrainOf(map, nb)];
      if (base === null || base === undefined || blocked.has(hexKey(nb))) continue;
      const step = roadSet.has(edgeKey(cur.c, nb)) ? 75 : base;
      const nd = cur.d + step;
      if (nd < (dist.get(hexKey(nb)) ?? Infinity)) {
        dist.set(hexKey(nb), nd);
        open.push({ c: nb, d: nd });
      }
    }
  }
  return dist;
}

export function validateSkirmishMap(map: WorldMapDefinition, mission: MissionDefinition, mapType: SkirmishMapType = 'continental'): MapCheck[] {
  const checks: MapCheck[] = [];
  const towns = mission.sites.filter((s) => s.kind.type === 'town');
  const fromFirst = travelCosts(map, towns[0]!.coord);
  const unreachable = mission.sites.filter((s) => !fromFirst.has(hexKey(s.coord)));
  checks.push({ id: 'SKM-1', pass: unreachable.length === 0, detail: unreachable.length ? `unreachable: ${unreachable.map((s) => s.id).join(', ')}` : 'every site is reachable' });
  const badGround = mission.sites.filter((s) => terrainOf(map, s.coord) === 'm' || terrainOf(map, s.coord) === 'w');
  checks.push({ id: 'SKM-2', pass: badGround.length === 0, detail: badGround.length ? `on impassable terrain: ${badGround.map((s) => s.id).join(', ')}` : 'no site on impassable terrain' });
  const keys = mission.sites.map((s) => hexKey(s.coord));
  checks.push({ id: 'SKM-3', pass: new Set(keys).size === keys.length, detail: 'one site per tile' });
  // Fairness: every town is the same travel cost from the center and from its own sites.
  const centerSite = mission.sites.find((s) => s.id === 'relic' || s.id === 'center_gold');
  if (centerSite) {
    const costs = towns.map((t) => travelCosts(map, t.coord).get(hexKey(centerSite.coord)) ?? -1);
    checks.push({ id: 'SKM-4', pass: costs.every((c) => c === costs[0] && c > 0), detail: `town → center costs ${costs.join(' / ')}` });
  }
  const local = (suffix: string) => mission.sites.filter((s) => s.id.endsWith(`_${suffix}`) && s.kind.type !== 'town');
  const ownCosts = towns.map((t, i) => {
    const d = travelCosts(map, t.coord);
    return local(String(i + 1))
      .map((s) => d.get(hexKey(s.coord)) ?? -1)
      .sort((a, b) => a - b)
      .join(',');
  });
  checks.push({ id: 'SKM-5', pass: ownCosts.every((c) => c === ownCosts[0]), detail: 'every empire’s own sites cost the same to reach' });
  // The map type is real: walls only open at their guarded passes or gates.
  if ((mapType === 'highlands' || mapType === 'crossroads') && centerSite) {
    const openings = mission.sites.filter((s) => s.kind.type === 'crossing' && !!s.guard);
    const blocked = new Set(openings.map((s) => hexKey(s.coord)));
    const sealed = towns.every((t) => !travelCosts(map, t.coord, blocked).has(hexKey(centerSite.coord)));
    checks.push({ id: 'SKM-6', pass: openings.length >= towns.length && sealed, detail: `${openings.length} guarded openings; the center ${sealed ? 'is reached only through them' : 'can be reached around them'}` });
  }
  return checks;
}
