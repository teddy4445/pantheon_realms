/**
 * Climate-aware nature scenery (owner art delivery "nature expansion",
 * 2026-10-06): 318 painted stills under `decor` IDs `nature.<climate>.<role>.0N`
 * (ten climates × canopy, shrub, rock, deadwood, groundcover, woodland/rocky/wet
 * edge clumps and mountains; four water profiles × rocks, islets, boats and
 * water life), placed by `nature-policy.json` (copied from the delivery).
 *
 * Climate first, terrain second: the map's biome picks the family, the hex's
 * terrain the role. Every choice comes from a stable hash of the map seed,
 * the tile and the slot — no `Math.random`, no game RNG, nothing written to
 * the state, the logical map or its hash. Pure (no Pixi), so it is testable
 * without a renderer. `makeNatureSelector` is the TypeScript port of the
 * delivery's reference `tools/nature-selector.mjs` (same hash, same picks);
 * `planNatureScenery` places it on a map; `classifyWater` sorts the map's water
 * into sea, lake and river (presentation only — the rules know only `water`).
 */
import { AXIAL_DIRECTIONS, TERRAIN_BY_CODE, type HexCoord, type Terrain, type WorldMapDefinition } from '@pr/rules';
import { axialPoint } from './hexmath';
import policyJson from './nature-policy.json';

export type NatureRole =
  | 'canopy'
  | 'shrub'
  | 'rock'
  | 'deadwood'
  | 'groundcover'
  | 'woodland_edge'
  | 'rocky_edge'
  | 'wet_edge'
  | 'mountain'
  | 'water_rock'
  | 'islet'
  | 'boat'
  | 'water_life';

export type WaterKind = 'sea' | 'lake' | 'river';

export interface NatureAsset {
  readonly id: string;
  /** A climate ID, or a water profile (`marine_temperate`, `marine_tropical`, `marine_frozen`, `freshwater`). */
  readonly climate: string;
  readonly role: NatureRole;
  readonly variant: number;
  readonly description: string;
  readonly blocking: boolean;
  readonly battleUse: string;
  readonly waterKinds: readonly string[];
  readonly minWaterArea: number;
  readonly minWaterClearance: number;
  readonly excludedClimates?: readonly string[];
  readonly saltwaterBankAllowed?: boolean;
  readonly requiresWetGroundOrFreshwaterBank?: boolean;
}

export interface NaturePolicy {
  readonly schema: string;
  readonly climates: readonly string[];
  readonly ground: Readonly<Record<string, Readonly<Record<string, number>>>>;
  readonly battle: Readonly<Record<string, Readonly<Record<string, number>>>>;
  readonly seaProfiles: Readonly<Record<string, string>>;
  readonly placement: { readonly edgeChance: number; readonly maxEdgeClumpsPerTile: number; readonly scaleRange: readonly [number, number] };
  readonly density: Readonly<Record<string, { readonly chance: number; readonly maxPerTile: number }>>;
  readonly waterDensity: Readonly<Record<string, number>>;
  readonly climateDensityMultiplier: Readonly<Record<string, number>>;
  readonly assets: readonly NatureAsset[];
}

export const NATURE_POLICY = policyJson as unknown as NaturePolicy;

/** FNV-1a over the parts joined by `|` (the reference selector's `hash32`). */
export function natureHash(...parts: readonly (string | number | undefined | null)[]): number {
  let h = 2166136261;
  for (const ch of parts.join('|')) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}

/**
 * Map creatures (location guards, wandering bands at rest) face left or right by
 * a stable hash of their ID — about half each way, the same every time, no game
 * RNG (owner request 2026-10-07). Kept here beside the scenery's hash.
 */
export function facesLeft(kind: 'guard' | 'monster', id: string): boolean {
  // FNV-1a mixes its last characters poorly; a final avalanche (murmur3's fmix32) spreads them.
  let h = natureHash('facing', kind, id);
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  h ^= h >>> 16;
  return (h & 1) === 1;
}

function weighted(table: Readonly<Record<string, number>> | undefined, hash: number): string | null {
  const entries = Object.entries(table ?? {});
  const total = entries.reduce((n, [, w]) => n + w, 0);
  if (!total) return null;
  let p = hash % total;
  for (const [role, w] of entries) {
    if (p < w) return role;
    p -= w;
  }
  return null;
}

export interface NatureContext {
  readonly climate: string;
  readonly seed?: number | string;
  readonly q?: number;
  readonly r?: number;
  readonly slot?: number | string;
  /** IDs already used next to this spot: another variant is preferred when one exists. */
  readonly usedNeighborIds?: readonly string[];
}

export interface NatureSelector {
  choose(climate: string, role: string, ctx: NatureContext, filter?: (a: NatureAsset) => boolean): NatureAsset | null;
  land(ctx: NatureContext & { readonly terrain: string }): NatureAsset | null;
  edge(ctx: NatureContext & { readonly a: string; readonly b: string; readonly waterKind?: WaterKind | null }): { asset: NatureAsset; owner: 'a' | 'b'; upright: true } | null;
  water(
    ctx: NatureContext & { readonly waterKind?: WaterKind | null; readonly role: NatureRole; readonly waterArea?: number; readonly waterClearance?: number; readonly waterFrozen?: boolean; readonly iceChoked?: boolean },
  ): NatureAsset | null;
  battleObstacle(ctx: NatureContext & { readonly archetype: string; readonly isAuthoritativeObstacle: boolean; readonly authoredKind?: string | null }): NatureAsset | null;
}

/**
 * Water that is ice-choked (the tundra's pack-ice painting) but not frozen solid:
 * rocks, islets and the two creatures resting on a floe or a rock only — no
 * boats, nothing swimming.
 */
const ICE_SAFE_LIFE = new Set(['nature.marine_frozen.water_life.01', 'nature.marine_frozen.water_life.02']);

/** The reference selector (delivery `tools/nature-selector.mjs`) with the game's types; `available` says whether a sprite is imported. */
export function makeNatureSelector(policy: NaturePolicy = NATURE_POLICY, available: (id: string) => boolean = () => true): NatureSelector {
  const byKey = new Map<string, NatureAsset[]>();
  for (const a of policy.assets) {
    const k = `${a.climate}|${a.role}`;
    const list = byKey.get(k) ?? [];
    list.push(a);
    byKey.set(k, list);
  }
  const choose: NatureSelector['choose'] = (climate, role, ctx, filter = () => true) => {
    const candidates = (byKey.get(`${climate}|${role}`) ?? []).filter((a) => available(a.id) && filter(a));
    if (!candidates.length) return null;
    const used = ctx.usedNeighborIds ?? [];
    const unused = candidates.filter((a) => !used.includes(a.id));
    const pool = unused.length ? unused : candidates;
    return pool[natureHash(ctx.seed, ctx.q, ctx.r, ctx.slot ?? 0, climate, role) % pool.length]!;
  };
  const land: NatureSelector['land'] = (ctx) => {
    if (!policy.climates.includes(ctx.climate)) return null;
    const role = weighted(policy.ground[ctx.terrain], natureHash(ctx.seed, ctx.q, ctx.r, ctx.slot ?? 0, 'role'));
    return role ? choose(ctx.climate, role, ctx) : null;
  };
  const edge: NatureSelector['edge'] = (ctx) => {
    if (!policy.climates.includes(ctx.climate) || ctx.a === ctx.b || ctx.a === 'void' || ctx.b === 'void') return null;
    const pair = [ctx.a, ctx.b];
    let role: string;
    let terrain: string | undefined;
    let filter: (a: NatureAsset) => boolean = () => true;
    if (pair.includes('water')) {
      terrain = pair.find((t) => t !== 'water');
      if (ctx.waterKind !== 'sea' && ctx.waterKind !== 'lake' && ctx.waterKind !== 'river') return null;
      if (ctx.waterKind === 'sea') {
        const saltOk = ctx.climate === 'coast' || ctx.climate === 'jungle';
        role = saltOk ? 'wet_edge' : 'rocky_edge';
        if (saltOk) filter = (a) => a.saltwaterBankAllowed === true;
      } else role = 'wet_edge';
    } else if (pair.includes('marsh')) {
      role = 'wet_edge';
      terrain = 'marsh';
    } else if (pair.includes('forest')) {
      role = 'woodland_edge';
      terrain = 'forest';
    } else if (pair.includes('mountain')) {
      role = 'rocky_edge';
      terrain = 'mountain';
    } else if (pair.includes('rough')) {
      role = 'rocky_edge';
      terrain = 'rough';
    } else return null;
    const asset = choose(ctx.climate, role, ctx, filter);
    return asset ? { asset, owner: ctx.a === terrain ? 'a' : 'b', upright: true } : null;
  };
  const water: NatureSelector['water'] = (ctx) => {
    if (!policy.climates.includes(ctx.climate) || (ctx.waterKind !== 'sea' && ctx.waterKind !== 'lake' && ctx.waterKind !== 'river') || ctx.waterFrozen) return null;
    if (ctx.iceChoked && ctx.role === 'boat') return null;
    const kind = ctx.waterKind;
    const profile = kind === 'sea' ? policy.seaProfiles[ctx.climate] : 'freshwater';
    if (!profile) return null;
    return choose(
      profile,
      ctx.role,
      ctx,
      (a) =>
        a.waterKinds.includes(kind) &&
        (ctx.waterArea ?? 0) >= a.minWaterArea &&
        (ctx.waterClearance ?? 0) >= a.minWaterClearance &&
        !(a.excludedClimates ?? []).includes(ctx.climate) &&
        (!ctx.iceChoked || a.role !== 'water_life' || ICE_SAFE_LIFE.has(a.id)),
    );
  };
  const battleObstacle: NatureSelector['battleObstacle'] = (ctx) => {
    if (!ctx.isAuthoritativeObstacle || !policy.climates.includes(ctx.climate)) return null;
    // Authored columns, standing stones and siege structures keep their own art.
    if (ctx.authoredKind === 'column' || ctx.authoredKind === 'stone_circle' || ctx.authoredKind === 'siege') return null;
    const role = weighted(policy.battle[ctx.archetype], natureHash(ctx.seed, ctx.q, ctx.r, 'battle-role'));
    return role ? choose(ctx.climate, role, ctx) : null;
  };
  return { choose, land, edge, water, battleObstacle };
}

// ------------------------------------------------------------------ water: sea, lake or river

export interface WaterComponent {
  readonly id: number;
  readonly kind: WaterKind | null;
  readonly area: number;
  /** Touches the map's outer edge (the void around it or the end of the array). */
  readonly boundary: boolean;
  /** Most rings of water between one of its tiles and the nearest land. */
  readonly maxClearance: number;
  readonly tiles: readonly number[];
}

export interface WaterClassification {
  /** Component index per tile (-1: not water). */
  readonly componentOf: Int32Array;
  /** Rings of water to the nearest land (1 = next to land; 0 for land). */
  readonly clearance: Int32Array;
  readonly components: readonly WaterComponent[];
}

/** A boundary-connected body two rings wide counts as the sea from this size (coast and fjord maps; elsewhere also 15 % of the map). */
export const SEA_MIN_AREA = 24;
const OPEN_SEA_SHARE = 0.15;

/**
 * Sort a map's water into connected bodies and call each a sea, a lake, a river
 * or unknown (null — no marine or freshwater scenery). The map formats carry no
 * water-body data yet, so the shape decides, cautiously:
 * * a body never touching the map's edge is a lake (a pond when small), or a
 *   river when it is long and nowhere wider than one ring from land;
 * * a body touching the edge that is nowhere more than one ring from land is a
 *   river (never an ocean);
 * * a body touching the edge, of at least 24 tiles and two rings from land
 *   somewhere, is the sea on coast and fjord maps (whose edges are water by
 *   design); on other maps only when it also covers at least 15 % of the map
 *   (an archipelago's sea in a warm or cold climate);
 * * anything else is unknown.
 */
export function classifyWater(map: WorldMapDefinition): WaterClassification {
  const { width: W, height: H } = map;
  const n = W * H;
  const t = (i: number): Terrain => TERRAIN_BY_CODE[map.terrain[i]!] ?? 'void';
  const componentOf = new Int32Array(n).fill(-1);
  const clearance = new Int32Array(n);
  const neighbours = (i: number): number[] => {
    const q = i % W;
    const r = (i - q) / W;
    const out: number[] = [];
    for (const d of AXIAL_DIRECTIONS) {
      const nq = q + d.q;
      const nr = r + d.r;
      if (nq >= 0 && nq < W && nr >= 0 && nr < H) out.push(nr * W + nq);
    }
    return out;
  };
  // Rings of water from the land (breadth first from every land tile).
  let frontier: number[] = [];
  for (let i = 0; i < n; i++) {
    const ti = t(i);
    if (ti === 'water') clearance[i] = -1;
    else if (ti !== 'void') frontier.push(i);
  }
  for (let ring = 1; frontier.length; ring++) {
    const next: number[] = [];
    for (const i of frontier) {
      for (const j of neighbours(i)) {
        if (clearance[j] !== -1) continue;
        clearance[j] = ring;
        next.push(j);
      }
    }
    frontier = next;
  }
  for (let i = 0; i < n; i++) if (clearance[i] === -1) clearance[i] = 99; // water with no land at all
  let land = 0;
  for (let i = 0; i < n; i++) if (t(i) !== 'void') land += 1;
  const components: WaterComponent[] = [];
  for (let start = 0; start < n; start++) {
    if (t(start) !== 'water' || componentOf[start] !== -1) continue;
    const id = components.length;
    const tiles: number[] = [];
    let boundary = false;
    let maxClearance = 0;
    const stack = [start];
    componentOf[start] = id;
    while (stack.length) {
      const i = stack.pop()!;
      tiles.push(i);
      maxClearance = Math.max(maxClearance, clearance[i]!);
      const ns = neighbours(i);
      if (ns.length < 6) boundary = true;
      for (const j of ns) {
        const tj = t(j);
        if (tj === 'void') boundary = true;
        if (tj !== 'water' || componentOf[j] !== -1) continue;
        componentOf[j] = id;
        stack.push(j);
      }
    }
    tiles.sort((a, b) => a - b);
    const area = tiles.length;
    let kind: WaterKind | null = null;
    if (!boundary) kind = maxClearance <= 1 && area >= 6 ? 'river' : 'lake';
    else if (maxClearance <= 1) kind = 'river';
    else if (area >= SEA_MIN_AREA && (map.biome === 'coast' || map.biome === 'fjord')) kind = 'sea';
    else if (area >= SEA_MIN_AREA && area >= land * OPEN_SEA_SHARE) kind = 'sea';
    components.push({ id, kind, area, boundary, maxClearance, tiles });
  }
  return { componentOf, clearance, components };
}

// ------------------------------------------------------------------ the map plan

export type NatureItemKind = 'land' | 'mountain' | 'edge' | 'water';

export interface NatureItem {
  /** `decor` manifest key (`nature.…`), or `mountain` when a climate's mountains are missing. */
  readonly id: string;
  readonly role: NatureRole;
  readonly kind: NatureItemKind;
  /** The tile that owns it (fog: drawn once this tile is explored). */
  readonly tile: number;
  /** Ground point relative to the owner tile's centre, in hex radii (screen plane, foreshortened like the map). */
  readonly dx: number;
  readonly dy: number;
  /** Size factor (0.9–1.1). */
  readonly scale: number;
}

export interface NaturePlanOptions {
  /** Map locations (towns, mines, …): their tiles stay clear. */
  readonly sites?: readonly HexCoord[];
  /** Towns: their neighbouring tiles (gates, heroes at the entrance) stay clear of low dressing. */
  readonly towns?: readonly HexCoord[];
  /** Whether a `decor` sprite is imported. */
  readonly available?: (id: string) => boolean;
  /** `graphicsProfile().decor`. */
  readonly decor?: 'all' | 'no-grass' | 'sparse';
  readonly policy?: NaturePolicy;
}

export interface NaturePlan {
  /** The map's climate has nature art (else the map keeps the generic decoration). */
  readonly supported: boolean;
  readonly climate: string;
  readonly items: readonly NatureItem[];
  readonly water: WaterClassification;
}

/** Low dressing: left out below High, like the grass tufts and shrubs before. */
export const LOW_DRESSING: ReadonlySet<NatureRole> = new Set(['groundcover', 'shrub', 'woodland_edge', 'rocky_edge', 'wet_edge']);

/** Water scenery in the order it is drawn by chance (one category at most per tile). */
const WATER_ROLES: readonly NatureRole[] = ['water_rock', 'islet', 'boat', 'water_life'];
/** Water scenery keeps this many hexes from the next piece. */
export const WATER_SPACING = 3;

const unit = (h: number) => (h % 1_000_003) / 1_000_003;

/**
 * Plan a map's nature scenery once: per tile the climate's dressing for its
 * terrain, one climate mountain per mountain tile, clumps along the borders
 * between grounds (every border once, at most two per tile) and sparse rocks,
 * islets, boats and wildlife on water whose kind is known. Roads, map locations
 * and town entrances stay clear. Deterministic for the same map.
 */
export function planNatureScenery(map: WorldMapDefinition, opts: NaturePlanOptions = {}): NaturePlan {
  const policy = opts.policy ?? NATURE_POLICY;
  const available = opts.available ?? (() => true);
  const decor = opts.decor ?? 'all';
  const climate = map.biome;
  const water = classifyWater(map);
  if (!policy.climates.includes(climate)) return { supported: false, climate, items: [], water };
  const sel = makeNatureSelector(policy, available);
  const { width: W, height: H } = map;
  const seed = map.seed;
  const t = (i: number): Terrain => TERRAIN_BY_CODE[map.terrain[i]!] ?? 'void';
  const idx = (q: number, r: number) => (q >= 0 && q < W && r >= 0 && r < H ? r * W + q : -1);
  const mult = Math.min(1, policy.climateDensityMultiplier[climate] ?? 1);
  const [s0, s1] = policy.placement.scaleRange;
  const scaleOf = (...k: (string | number)[]) => s0 + (s1 - s0) * unit(natureHash(seed, ...k, 'scale'));
  // Roads: tiles on a road and the borders a road crosses.
  const roadTiles = new Set<number>();
  const roadDirs = new Map<number, Set<number>>();
  const roadEdges = new Set<string>();
  for (const key of map.roads) {
    const [a, b] = key.split('|');
    const [aq, ar] = a!.split(',').map(Number);
    const [bq, br] = b!.split(',').map(Number);
    const ia = idx(aq!, ar!);
    const ib = idx(bq!, br!);
    if (ia < 0 || ib < 0) continue;
    roadTiles.add(ia);
    roadTiles.add(ib);
    roadEdges.add(ia < ib ? `${ia}|${ib}` : `${ib}|${ia}`);
    const da = AXIAL_DIRECTIONS.findIndex((d) => d.q === bq! - aq! && d.r === br! - ar!);
    if (da >= 0) {
      (roadDirs.get(ia) ?? roadDirs.set(ia, new Set()).get(ia)!).add(da);
      (roadDirs.get(ib) ?? roadDirs.set(ib, new Set()).get(ib)!).add((da + 3) % 6);
    }
  }
  const siteTiles = new Set<number>();
  for (const s of opts.sites ?? []) {
    const i = idx(s.q, s.r);
    if (i >= 0) siteTiles.add(i);
  }
  const townNear = new Set<number>();
  for (const s of opts.towns ?? []) {
    for (const d of AXIAL_DIRECTIONS) {
      const i = idx(s.q + d.q, s.r + d.r);
      if (i >= 0) townNear.add(i);
    }
  }
  // Screen-plane offset (hex radii) from a tile's centre toward neighbour direction k.
  const toward = (k: number) => {
    const p = axialPoint(AXIAL_DIRECTIONS[k]!, 1);
    return { x: p.x / 2, y: p.y / 2 }; // the border's midpoint
  };
  const idsOn = new Map<number, string[]>();
  const usedNear = (i: number): string[] => {
    const q = i % W;
    const r = (i - q) / W;
    const out = [...(idsOn.get(i) ?? [])];
    for (const d of AXIAL_DIRECTIONS) {
      const j = idx(q + d.q, r + d.r);
      if (j >= 0) out.push(...(idsOn.get(j) ?? []));
    }
    return out;
  };
  const items: NatureItem[] = [];
  const add = (it: NatureItem) => {
    items.push(it);
    (idsOn.get(it.tile) ?? idsOn.set(it.tile, []).get(it.tile)!).push(it.id);
  };
  const lowOk = (role: NatureRole) => decor === 'all' || !LOW_DRESSING.has(role);
  let thin = 0;
  const sparseOk = () => decor !== 'sparse' || thin++ % 2 === 0;

  // 1. Tiles: the climate's dressing for the terrain; one mountain per mountain tile.
  for (let i = 0; i < W * H; i++) {
    const terrain = t(i);
    if (terrain === 'void' || terrain === 'water') continue;
    const q = i % W;
    const r = (i - q) / W;
    if (terrain === 'mountain') {
      const asset = sel.choose(climate, 'mountain', { climate, seed, q, r, slot: 0, usedNeighborIds: usedNear(i) });
      add({ id: asset?.id ?? 'mountain', role: 'mountain', kind: 'mountain', tile: i, dx: 0, dy: 0, scale: scaleOf(q, r, 'm') });
      continue;
    }
    if (siteTiles.has(i)) continue;
    const density = policy.density[terrain];
    if (!density) continue;
    const onRoad = roadTiles.has(i);
    if (terrain === 'plains' && onRoad) continue; // keep the roads and routes clear
    const chance = Math.min(1, density.chance * mult);
    const blocked = roadDirs.get(i) ?? new Set<number>();
    const free = [0, 1, 2, 3, 4, 5].filter((k) => !blocked.has(k));
    const takenDirs = new Set<number>();
    for (let slot = 0; slot < density.maxPerTile; slot++) {
      if (unit(natureHash(seed, q, r, slot, 'place')) >= chance) continue;
      // Forests: at most two big canopies; a third item is low dressing.
      let role: NatureRole | null;
      const roleHash = natureHash(seed, q, r, slot, 'role');
      if (terrain === 'forest' && slot >= 2) {
        const low = Object.fromEntries(Object.entries(policy.ground['forest'] ?? {}).filter(([k]) => k !== 'canopy'));
        role = weighted(low, roleHash) as NatureRole | null;
      } else role = weighted(policy.ground[terrain], roleHash) as NatureRole | null;
      if (!role || role === 'mountain') continue;
      if (townNear.has(i) && LOW_DRESSING.has(role)) continue;
      if (!lowOk(role)) continue;
      const asset = sel.choose(climate, role, { climate, seed, q, r, slot, usedNeighborIds: usedNear(i) });
      if (!asset) continue;
      if (!LOW_DRESSING.has(role) && !sparseOk()) continue;
      // Out of the hero's way: toward a border no road crosses, a little off the centre.
      const pool = free.filter((k) => !takenDirs.has(k));
      const dirs = pool.length ? pool : free.length ? free : [0, 1, 2, 3, 4, 5];
      const k = dirs[natureHash(seed, q, r, slot, 'dir') % dirs.length]!;
      takenDirs.add(k);
      const m = toward(k);
      const reach = 0.42 + 0.3 * unit(natureHash(seed, q, r, slot, 'reach'));
      const side = (unit(natureHash(seed, q, r, slot, 'side')) - 0.5) * 0.5;
      add({ id: asset.id, role, kind: 'land', tile: i, dx: m.x * reach - m.y * side, dy: m.y * reach + m.x * side, scale: scaleOf(q, r, slot) });
    }
  }

  // 2. Borders between grounds: each undirected border once (lower tile index first).
  if (decor === 'all') {
    const clumps = new Map<number, number>();
    for (let i = 0; i < W * H; i++) {
      const a = t(i);
      if (a === 'void') continue;
      const q = i % W;
      const r = (i - q) / W;
      for (let k = 0; k < 6; k++) {
        const d = AXIAL_DIRECTIONS[k]!;
        const j = idx(q + d.q, r + d.r);
        if (j <= i) continue;
        const b = t(j);
        if (b === 'void' || b === a) continue;
        if (unit(natureHash(seed, i, j, 'edge-chance')) >= policy.placement.edgeChance) continue;
        if (roadEdges.has(`${i}|${j}`)) continue;
        const waterTile = a === 'water' ? i : b === 'water' ? j : -1;
        const waterKind = waterTile >= 0 ? (water.components[water.componentOf[waterTile]!]?.kind ?? null) : null;
        const e = sel.edge({ climate, a, b, waterKind, seed, q: i, r: j, slot: 'edge', usedNeighborIds: [...usedNear(i), ...usedNear(j)] });
        if (!e) continue;
        const owner = e.owner === 'a' ? i : j;
        if (siteTiles.has(owner) || townNear.has(owner)) continue;
        if ((clumps.get(owner) ?? 0) >= policy.placement.maxEdgeClumpsPerTile) continue;
        const asset = e.asset;
        clumps.set(owner, (clumps.get(owner) ?? 0) + 1);
        // The border's midpoint, moved a little toward the owner's centre (upright; never rotated).
        const kk = owner === i ? k : (k + 3) % 6;
        const m = toward(kk);
        add({ id: asset.id, role: asset.role, kind: 'edge', tile: owner, dx: m.x * 0.78, dy: m.y * 0.78, scale: scaleOf(i, j, 'edge') });
      }
    }
  }

  // 3. Water: at most one piece per tile, by chance, spaced and capped per body.
  const placed: HexCoord[] = [];
  const budget = new Map<number, number>();
  const nearRoadOrSite = (i: number) => {
    if (roadTiles.has(i) || siteTiles.has(i)) return true;
    const q = i % W;
    const r = (i - q) / W;
    return AXIAL_DIRECTIONS.some((d) => {
      const j = idx(q + d.q, r + d.r);
      return j >= 0 && (roadTiles.has(j) || siteTiles.has(j));
    });
  };
  const iceChoked = climate === 'tundra';
  const rates = WATER_ROLES.map((role) => policy.waterDensity[role] ?? 0);
  for (let i = 0; i < W * H; i++) {
    const c = water.componentOf[i]!;
    if (c < 0) continue;
    const comp = water.components[c]!;
    if (!comp.kind) continue;
    if (nearRoadOrSite(i)) continue;
    const cap = Math.min(30, Math.max(1, Math.round(comp.area / 10)));
    if ((budget.get(c) ?? 0) >= cap) continue;
    const q = i % W;
    const r = (i - q) / W;
    const u = unit(natureHash(seed, q, r, 'water'));
    let acc = 0;
    let role: NatureRole | null = null;
    for (let k = 0; k < WATER_ROLES.length; k++) {
      acc += rates[k]!;
      if (u < acc) {
        role = WATER_ROLES[k]!;
        break;
      }
    }
    if (!role) continue;
    if (decor !== 'all' && (role === 'boat' || role === 'water_life')) continue;
    if (placed.some((p) => (Math.abs(p.q - q) + Math.abs(p.r - r) + Math.abs(p.q + p.r - q - r)) / 2 < WATER_SPACING)) continue;
    const asset = sel.water({ climate, waterKind: comp.kind, role, waterArea: comp.area, waterClearance: water.clearance[i]!, iceChoked, seed, q, r, slot: 'water' });
    if (!asset) continue;
    if (!sparseOk()) continue;
    placed.push({ q, r });
    budget.set(c, (budget.get(c) ?? 0) + 1);
    const jx = (unit(natureHash(seed, q, r, 'wx')) - 0.5) * 0.4;
    const jy = (unit(natureHash(seed, q, r, 'wy')) - 0.5) * 0.3;
    add({ id: asset.id, role, kind: 'water', tile: i, dx: jx, dy: jy, scale: scaleOf(q, r, 'water') });
  }
  return { supported: true, climate, items, water };
}

let lastPlan: { key: string; plan: NaturePlan } | null = null;

/**
 * `planNatureScenery`, remembered for the last map: the map view is built again
 * after every battle, and the plan (13 ms on Twin Harbors, 34 ms on a huge map,
 * measured in Node) is then taken from here. `artKey` names the imported art
 * (e.g. how many decor stills the manifest lists).
 */
export function planNatureSceneryCached(map: WorldMapDefinition, opts: NaturePlanOptions & { readonly artKey?: string } = {}): NaturePlan {
  const coords = (list: readonly HexCoord[] | undefined) => (list ?? []).map((c) => `${c.q},${c.r}`).join(';');
  const key = [map.templateId, map.logicalHash, map.seed, map.biome, map.width, map.height, opts.decor ?? 'all', opts.artKey ?? '', coords(opts.sites), coords(opts.towns)].join('|');
  if (lastPlan?.key === key) return lastPlan.plan;
  const plan = planNatureScenery(map, opts);
  lastPlan = { key, plan };
  return plan;
}

// ------------------------------------------------------------------ battle

/**
 * The still for a battlefield obstacle: the climate's rock, deadwood or tree
 * (policy weights per battlefield), or null to keep the generic obstacle art
 * (unknown climate, missing sprites, or the authored column / standing stone).
 */
export function battleObstacleId(
  climate: string | null | undefined,
  archetype: string,
  cell: { readonly col: number; readonly row: number },
  authoredKind: string | null,
  battleSeed: string | number,
  available: (id: string) => boolean,
  usedNeighborIds: readonly string[] = [],
): string | null {
  if (!climate) return null;
  const sel = makeNatureSelector(NATURE_POLICY, available);
  return sel.battleObstacle({ climate, archetype, isAuthoritativeObstacle: true, authoredKind, seed: battleSeed, q: cell.col, r: cell.row, usedNeighborIds })?.id ?? null;
}
