/**
 * World resolvers: terrain lookup, movement costs, passability, pathfinding
 * and visibility on the axial adventure map.
 *
 * Movement legality is decided here from logical data; the renderer never decides it.
 * Pathfinding uses integer Dijkstra with canonical neighbor order and stable
 * key tie-breaks so previews and commits always agree.
 */
import type { HeroId, PlayerId, SiteId } from '../ids';
import {
  axialDistance,
  axialNeighbors,
  edgeKey,
  hexEquals,
  hexKey,
  type HexCoord,
} from '../core/hex';
import type { ContentCatalog } from '../definitions/catalog';
import { TERRAIN_BY_CODE, type SiteDefinition, type Terrain, type WorldMapDefinition } from '../definitions/world';
import type { HeroState, MatchState, SiteState } from '../state/match';
import { heroVisionRadius } from './heroes';
import { townVisionRadius } from './town';
import { scenarioMission } from './scenario';
import { findSeaPath, heroShip, reachableSeaTiles } from './naval';
import { caravansOnMap, enemyCaravanAt } from './caravans';
import { libraryLandTree, libraryPathResult, movementPricing, type LibraryPathTree } from './libraryMovement';
import { allied } from '../systems/coalition';
import { ownedTowerSight } from './seaSites';

export function inMap(map: WorldMapDefinition, c: HexCoord): boolean {
  return c.q >= 0 && c.q < map.width && c.r >= 0 && c.r < map.height;
}

export function terrainAt(map: WorldMapDefinition, c: HexCoord): Terrain {
  if (!inMap(map, c)) return 'mountain';
  return TERRAIN_BY_CODE[map.terrain[c.r * map.width + c.q] ?? 'm'] ?? 'mountain';
}

export function cellIndex(map: WorldMapDefinition, c: HexCoord): number {
  return c.r * map.width + c.q;
}

const roadCache = new WeakMap<WorldMapDefinition, Set<string>>();
export function roadSet(map: WorldMapDefinition): Set<string> {
  let s = roadCache.get(map);
  if (!s) {
    s = new Set(map.roads);
    roadCache.set(map, s);
  }
  return s;
}

/** Min-heap of (distance, key) pairs ordered by distance, then key (string order). */
export class KeyHeap {
  private readonly d: number[] = [];
  private readonly k: string[] = [];
  private less(i: number, j: number): boolean {
    return this.d[i]! < this.d[j]! || (this.d[i] === this.d[j] && this.k[i]! < this.k[j]!);
  }
  private swap(i: number, j: number): void {
    [this.d[i], this.d[j]] = [this.d[j]!, this.d[i]!];
    [this.k[i], this.k[j]] = [this.k[j]!, this.k[i]!];
  }
  push(dist: number, key: string): void {
    this.d.push(dist);
    this.k.push(key);
    let i = this.d.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (!this.less(i, p)) break;
      this.swap(i, p);
      i = p;
    }
  }
  pop(): [number, string] | null {
    if (this.d.length === 0) return null;
    const top: [number, string] = [this.d[0]!, this.k[0]!];
    const lastD = this.d.pop()!;
    const lastK = this.k.pop()!;
    if (this.d.length > 0) {
      this.d[0] = lastD;
      this.k[0] = lastK;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1;
        const r = l + 1;
        let m = i;
        if (l < this.d.length && this.less(l, m)) m = l;
        if (r < this.d.length && this.less(r, m)) m = r;
        if (m === i) break;
        this.swap(i, m);
        i = m;
      }
    }
    return top;
  }
}

/** Destination-edge cost rule: road edge 75, otherwise destination terrain cost; null = impassable. */
export function edgeCost(catalog: ContentCatalog, map: WorldMapDefinition, from: HexCoord, to: HexCoord): number | null {
  const profile = catalog.rulesProfile;
  const base = profile.terrainCost[terrainAt(map, to)];
  if (base === null) return null;
  if (roadSet(map).has(edgeKey(from, to))) return profile.roadCost;
  return base;
}

export function missionSite(catalog: ContentCatalog, state: MatchState, siteId: SiteId): SiteDefinition | undefined {
  return scenarioMission(catalog, state)?.sites.find((s) => s.id === siteId);
}

export interface SiteAt {
  readonly def: SiteDefinition;
  readonly state: SiteState;
}

/**
 * Site lookup by tile, cached per site-state record: the set of sites never changes
 * during a match and the cached entries hold the live SiteState objects, so a cached
 * index stays correct while their fields change. (Pathfinding asks for every tile it
 * expands; rebuilding the index each time dominated AI planning on random maps.)
 */
const siteIndexCache = new WeakMap<object, { catalog: ContentCatalog; mission: unknown; index: Map<string, SiteAt> }>();

export function siteIndex(catalog: ContentCatalog, state: MatchState): Map<string, SiteAt> {
  const mission = scenarioMission(catalog, state);
  const sites = state.world.sites;
  const hit = siteIndexCache.get(sites);
  if (hit && hit.catalog === catalog && hit.mission === mission) return hit.index;
  const out = new Map<string, SiteAt>();
  if (!mission) return out;
  const gates = townGates(catalog, state);
  for (const def of mission.sites) {
    const st = sites[def.id];
    if (!st) continue;
    out.set(hexKey(def.coord), { def, state: st });
    // A town is entered from its gate tile: the gate holds the town site too.
    const gate = gates.get(def.id);
    if (gate) out.set(hexKey(gate), { def, state: st });
  }
  siteIndexCache.set(sites, { catalog, mission, index: out });
  return out;
}

// ---------------------------------------------------------------------------
// Town gates (owner request 2026-10-03): a hero never stands on a town's own
// tile. It stands on the tile in front of the town — the neighbour joined to the
// town by a road — and visits, defends, captures or besieges the town from there.
// ---------------------------------------------------------------------------

const gateCache = new WeakMap<object, { mission: unknown; gates: Map<string, HexCoord> }>();

/**
 * The gate tile of every town site (by site ID): the walkable neighbour joined to
 * the town by a road and holding no other site; with several, the one nearest the
 * map centre (point-symmetric maps give mirrored gates), then canonical order; a
 * town without a road gets its walkable neighbour nearest the centre. A pure
 * function of the mission and its generated map.
 */
export function townGates(catalog: ContentCatalog, state: MatchState): Map<string, HexCoord> {
  const mission = scenarioMission(catalog, state);
  const map = state.world.map;
  const hit = gateCache.get(map);
  if (hit && hit.mission === mission) return hit.gates;
  const gates = new Map<string, HexCoord>();
  if (mission) {
    const taken = new Set(mission.sites.map((d) => hexKey(d.coord)));
    const centre = { q: (map.width - 1) / 2, r: (map.height - 1) / 2 };
    const dc = (c: HexCoord) => {
      // Fractional axial distance to the centre (cube metric).
      const dq = c.q - centre.q;
      const dr = c.r - centre.r;
      return (Math.abs(dq) + Math.abs(dr) + Math.abs(dq + dr)) / 2;
    };
    const roads = roadSet(map);
    for (const def of mission.sites) {
      if (def.kind.type !== 'town') continue;
      const options = axialNeighbors(def.coord).filter(
        (n) => inMap(map, n) && catalog.rulesProfile.terrainCost[terrainAt(map, n)] !== null && !taken.has(hexKey(n)),
      );
      const road = options.filter((n) => roads.has(edgeKey(def.coord, n)));
      const pool = road.length > 0 ? road : options;
      const best = [...pool].sort((a, b) => dc(a) - dc(b))[0];
      if (best) {
        gates.set(def.id, best);
        taken.add(hexKey(best));
      }
    }
  }
  gateCache.set(map, { mission, gates });
  return gates;
}

/** The tile from which heroes use this town (its own tile when no neighbour is walkable). */
export function townGate(catalog: ContentCatalog, state: MatchState, townId: string): HexCoord {
  const town = state.towns[townId];
  const def = scenarioMission(catalog, state)?.sites.find((d) => d.kind.type === 'town' && d.kind.townId === townId);
  const gate = def ? townGates(catalog, state).get(def.id) : undefined;
  return gate ?? town?.coord ?? def?.coord ?? { q: 0, r: 0 };
}

/** Is this hero in (visiting) the town — standing at its gate? */
export function heroInTown(catalog: ContentCatalog, state: MatchState, hero: { position: HexCoord }, townId: string): boolean {
  return hexEquals(hero.position, townGate(catalog, state, townId));
}

/** The active hero visiting a town (at its gate), if any. */
export function townVisitor(catalog: ContentCatalog, state: MatchState, townId: string, exceptId?: HeroId): HeroState | undefined {
  return heroAt(state, townGate(catalog, state, townId), exceptId);
}

/** Is `c` a town's own (building) tile, which no hero enters? */
export function isTownTile(catalog: ContentCatalog, state: MatchState, c: HexCoord): boolean {
  const site = siteAt(catalog, state, c);
  return !!site && site.def.kind.type === 'town' && hexEquals(site.def.coord, c) && townGates(catalog, state).has(site.def.id);
}

/** Where a move toward `dest` really goes: a town's tile means its gate. */
export function movementTarget(catalog: ContentCatalog, state: MatchState, dest: HexCoord): HexCoord {
  const site = siteAt(catalog, state, dest);
  if (site && site.def.kind.type === 'town' && hexEquals(site.def.coord, dest)) {
    const gate = townGates(catalog, state).get(site.def.id);
    if (gate) return gate;
  }
  return dest;
}

/**
 * Move heroes that stand on a town's own tile (missions placed them there before
 * 2026-10-03, and older saves) to the town's gate, or the nearest free walkable
 * tile. Called when a match is created or a save is loaded, before play.
 */
export function settleHeroesAtTownGates(catalog: ContentCatalog, state: MatchState): void {
  for (const hero of Object.values(state.heroes)) {
    if (hero.status !== 'active' || !isTownTile(catalog, state, hero.position)) continue;
    const site = siteAt(catalog, state, hero.position)!;
    const gate = townGates(catalog, state).get(site.def.id)!;
    let spot: HexCoord | null = heroAt(state, gate, hero.id) ? null : gate;
    if (!spot) {
      const map = state.world.map;
      spot =
        axialNeighbors(hero.position).find(
          (n) => inMap(map, n) && catalog.rulesProfile.terrainCost[terrainAt(map, n)] !== null && !siteAt(catalog, state, n) && !heroAt(state, n, hero.id),
        ) ?? null;
    }
    if (spot) hero.position = { q: spot.q, r: spot.r };
  }
}

export function siteAt(catalog: ContentCatalog, state: MatchState, c: HexCoord): SiteAt | undefined {
  return siteIndex(catalog, state).get(hexKey(c));
}

/** Hero definitions held in prisons not yet opened (random maps; kept out of every Tavern). */
export function imprisonedHeroIds(catalog: ContentCatalog, state: MatchState): Set<string> {
  const out = new Set<string>();
  for (const def of scenarioMission(catalog, state)?.sites ?? []) {
    if (def.kind.type === 'prison' && !state.world.sites[def.id]?.claimed) out.add(def.kind.heroDefinitionId);
  }
  return out;
}

export function heroAt(state: MatchState, c: HexCoord, exceptId?: HeroId): HeroState | undefined {
  return Object.values(state.heroes).find((h) => h.status === 'active' && h.id !== exceptId && hexEquals(h.position, c));
}

export type TileRole =
  /** Freely traversable. */
  | 'open'
  /** Can end movement here (site interaction) but not pass through. */
  | 'destination_only'
  /** Entering starts a battle; requires confirmation. */
  | 'encounter'
  | 'blocked';

/** Active heroes by tile (built once per path search; heroes do not move during one). */
export function heroOccupancy(state: MatchState, exceptId?: HeroId): Map<string, HeroState> {
  const out = new Map<string, HeroState>();
  for (const h of Object.values(state.heroes)) {
    if (h.status !== 'active' || h.id === exceptId) continue;
    const k = hexKey(h.position);
    if (!out.has(k)) out.set(k, h);
  }
  return out;
}

/** How a tile behaves for a moving hero of `playerId`. */
export function tileRole(catalog: ContentCatalog, state: MatchState, playerId: PlayerId, c: HexCoord, movingHeroId: HeroId, occupancy?: ReadonlyMap<string, HeroState>): TileRole {
  const map = state.world.map;
  if (!inMap(map, c)) return 'blocked';
  if (catalog.rulesProfile.terrainCost[terrainAt(map, c)] === null) return 'blocked';
  // A town's own tile is a building: heroes use the town from its gate.
  if (isTownTile(catalog, state, c)) return 'blocked';
  const other = occupancy ? occupancy.get(hexKey(c)) : heroAt(state, c, movingHeroId);
  if (other) return allied(state, other.ownerId, playerId) ? 'blocked' : 'encounter';
  // Recruitment caravans: another player's shipment can only be met in battle (never walked through); one's own shares tiles.
  if (state.caravans && enemyCaravanAt(state, c, playerId)) return 'encounter';
  const site = siteAt(catalog, state, c);
  if (!site) return 'open';
  const { def, state: st } = site;
  if (def.kind.type === 'gate') return !st.open ? 'blocked' : def.guard && !st.cleared ? 'encounter' : 'open';
  // Key gates open only for players holding the key of their colour (from a key tent).
  if (def.kind.type === 'key_gate') return state.players[playerId]?.keys?.includes(def.kind.color) ? 'open' : 'blocked';
  if (def.kind.type === 'town') {
    // Another player's (or an ownerless) garrisoned town must be besieged (design/04 §8).
    const town = state.towns[def.kind.townId];
    if (town && !allied(state, town.ownerId, playerId) && town.garrison.slots.some((s) => s && s.count > 0)) return 'encounter';
  }
  if (def.guard && !st.cleared) return 'encounter';
  if (def.kind.type === 'crossing') return 'open';
  return 'destination_only';
}

export interface PathResult {
  readonly reachable: boolean;
  /** Tiles after the start, in order. */
  readonly path: HexCoord[];
  /** Cumulative cost at each path step. */
  readonly stepCosts: number[];
  readonly totalCost: number;
  readonly endsInEncounter: boolean;
  readonly reason: string | null;
}

interface PathTree {
  readonly dist: Map<string, number>;
  readonly prev: Map<string, string>;
  readonly coords: Map<string, HexCoord>;
}

/**
 * Dijkstra from the hero's tile, settling the lowest (distance, key) first — the
 * same order as the earlier full scan (ties broken by the smaller key), so routes
 * are unchanged; a binary heap with lazy deletion makes it fast enough for the
 * larger random maps. Only the start tile and 'open' tiles are passed through;
 * other enterable tiles (a site, an encounter) end a route. With `destKey` the
 * search stops once that tile is settled; without it, it covers every tile the
 * hero can reach (the shared tree below).
 */
function searchPaths(catalog: ContentCatalog, state: MatchState, heroId: HeroId, destKey: string | null): PathTree {
  const hero = state.heroes[heroId]!;
  const map = state.world.map;
  const fog = state.fog[hero.ownerId];
  const explored = (c: HexCoord) => !fog || fog.explored[cellIndex(map, c)] === 1;
  const occupancy = heroOccupancy(state, heroId);
  const startKey = hexKey(hero.position);
  const dist = new Map<string, number>([[startKey, 0]]);
  const prev = new Map<string, string>();
  const coords = new Map<string, HexCoord>([[startKey, hero.position]]);
  const done = new Set<string>();
  const heap = new KeyHeap();
  heap.push(0, startKey);
  for (;;) {
    const top = heap.pop();
    if (!top) break;
    const [bestDist, bestKey] = top;
    if (done.has(bestKey) || bestDist !== dist.get(bestKey)) continue;
    if (bestKey === destKey) break;
    done.add(bestKey);
    const cur = coords.get(bestKey)!;
    // Only the start tile and 'open' tiles may be passed through.
    if (bestKey !== startKey && tileRole(catalog, state, hero.ownerId, cur, heroId, occupancy) !== 'open') continue;
    for (const n of axialNeighbors(cur)) {
      if (!inMap(map, n) || !explored(n)) continue;
      const role = tileRole(catalog, state, hero.ownerId, n, heroId, occupancy);
      if (role === 'blocked') continue;
      const nKey = hexKey(n);
      // A tile that is not open ends a route: only as the destination (a single search), or as a
      // leaf of the shared tree (recorded, never passed through — so the routes to every other
      // tile are the same as a single search's).
      if (role !== 'open' && destKey !== null && nKey !== destKey) continue;
      const c = edgeCost(catalog, map, cur, n);
      if (c === null) continue;
      const nd = bestDist + c;
      const old = dist.get(nKey);
      if (old === undefined || nd < old) {
        dist.set(nKey, nd);
        prev.set(nKey, bestKey);
        coords.set(nKey, n);
        heap.push(nd, nKey);
      }
    }
  }
  return { dist, prev, coords };
}

/** Shared route trees while `withSharedPaths` runs: one search per (state, hero) instead of one per destination. */
/** Keyed by state, then `<heroId>|land` (the walking graph; the sea and voyage trees live in resolvers/naval.ts under their own mode keys). */
let pathMemo: WeakMap<MatchState, Map<string, PathTree>> | null = null;
const libraryTreeMemo = new WeakMap<object, WeakMap<MatchState, Map<string, LibraryPathTree>>>();

function sharedPathTree(catalog: ContentCatalog, state: MatchState, heroId: HeroId, memo: WeakMap<MatchState, Map<string, PathTree>>): PathTree {
  let byHero = memo.get(state);
  if (!byHero) memo.set(state, (byHero = new Map()));
  const key = `${heroId}|land`;
  let tree = byHero.get(key);
  if (!tree) byHero.set(key, (tree = searchPaths(catalog, state, heroId, null)));
  return tree;
}

/**
 * Run `fn` with route searches shared: every `findHeroPath` (and `quoteMovement`)
 * for the same state object and hero inside `fn` reads one search over the
 * whole reachable map instead of searching again per destination — the computer
 * players quote dozens of destinations per decision (2026-10-06 frame-rate work:
 * their turns run between the map's frames). The routes are identical. The
 * states read inside `fn` must not be changed while it runs.
 */
/** True while `withSharedPaths` runs (the naval route trees share its lifetime; resolvers/naval.ts). */
export function sharedPathsActive(): boolean {
  return pathMemo !== null;
}

export function withSharedPaths<T>(fn: () => T): T {
  const outer = pathMemo;
  pathMemo = outer ?? new WeakMap();
  try {
    return fn();
  } finally {
    pathMemo = outer;
  }
}

/**
 * Shortest legal path for a hero. Unknown (never explored) tiles are not used by
 * the pathfinder, so routes never leak hidden terrain.
 */
export function findHeroPath(catalog: ContentCatalog, state: MatchState, heroId: HeroId, dest: HexCoord): PathResult {
  const hero = state.heroes[heroId];
  const fail = (reason: string): PathResult => ({
    reachable: false,
    path: [],
    stepCosts: [],
    totalCost: 0,
    endsInEncounter: false,
    reason,
  });
  if (!hero) return fail('Unknown hero');
  // An embarked hero moves on the water-only graph (navalMovementV1; resolvers/naval.ts).
  if (heroShip(state, heroId)) return findSeaPath(catalog, state, heroId, dest);
  const map = state.world.map;
  if (!inMap(map, dest)) return fail('Outside the map');
  dest = movementTarget(catalog, state, dest);
  if (hexEquals(hero.position, dest)) return fail('Already here');
  const fog = state.fog[hero.ownerId];
  const explored = (c: HexCoord) => !fog || fog.explored[cellIndex(map, c)] === 1;
  if (!explored(dest)) return fail('Unexplored');
  const occupancy = heroOccupancy(state, heroId);
  const destRole = tileRole(catalog, state, hero.ownerId, dest, heroId, occupancy);
  if (destRole === 'blocked') return fail('That location cannot be entered');

  const pricing = movementPricing(catalog, state, hero);
  if (pricing.rules.some((r) => r.terrain !== 'sea')) {
    let tree: LibraryPathTree;
    if (pathMemo) {
      let states = libraryTreeMemo.get(pathMemo);
      if (!states) libraryTreeMemo.set(pathMemo, states = new WeakMap());
      let heroes = states.get(state);
      if (!heroes) states.set(state, heroes = new Map());
      tree = heroes.get(heroId) ?? libraryLandTree(pricing, hero, null);
      heroes.set(heroId, tree);
    } else tree = libraryLandTree(pricing, hero, dest);
    return libraryPathResult(tree, dest, destRole === 'encounter');
  }
  const startKey = hexKey(hero.position);
  const destKey = hexKey(dest);
  const shared = pathMemo ? sharedPathTree(catalog, state, heroId, pathMemo) : null;
  const { dist, prev, coords } = shared ?? searchPaths(catalog, state, heroId, destKey);
  const total = dist.get(destKey);
  if (total === undefined) return fail('No known route');
  const path: HexCoord[] = [];
  let k: string | undefined = destKey;
  while (k && k !== startKey) {
    path.unshift(coords.get(k)!);
    k = prev.get(k);
  }
  const stepCosts: number[] = [];
  let acc = 0;
  let from = hero.position;
  for (const step of path) {
    acc += edgeCost(catalog, map, from, step) ?? 0;
    stepCosts.push(acc);
    from = step;
  }
  return {
    reachable: true,
    path,
    stepCosts,
    totalCost: total,
    endsInEncounter: destRole === 'encounter',
    reason: null,
  };
}

/** All tiles reachable today with remaining movement (for the movement-range overlay). */
export function reachableTiles(catalog: ContentCatalog, state: MatchState, heroId: HeroId): Map<string, number> {
  const hero = state.heroes[heroId];
  const out = new Map<string, number>();
  if (!hero) return out;
  // An embarked hero's range is on the water (navalMovementV1).
  if (heroShip(state, heroId)) return reachableSeaTiles(catalog, state, heroId);
  const map = state.world.map;
  const fog = state.fog[hero.ownerId];
  const budget = hero.movementPoints;
  const pricing = movementPricing(catalog, state, hero);
  if (pricing.rules.some((r) => r.terrain !== 'sea')) {
    const tree = libraryLandTree(pricing, hero, null, budget);
    for (const [k, node] of tree.best) if (k !== hexKey(hero.position)) out.set(k, node.cost);
    return out;
  }
  const occupancy = heroOccupancy(state, heroId);
  const startKey = hexKey(hero.position);
  const dist = new Map<string, number>([[startKey, 0]]);
  const coords = new Map<string, HexCoord>([[startKey, hero.position]]);
  // Tiles are settled lowest (distance, key) first, as the earlier sorted frontier did, so
  // the result (and its order) is unchanged; the heap makes it fast enough to run after
  // every command on the larger maps (2026-10-06 frame-rate work).
  const heap = new KeyHeap();
  heap.push(0, startKey);
  const done = new Set<string>();
  for (;;) {
    const top = heap.pop();
    if (!top) break;
    const [d, key] = top;
    if (done.has(key) || d !== dist.get(key)) continue;
    done.add(key);
    const cur = coords.get(key)!;
    if (key !== startKey && tileRole(catalog, state, hero.ownerId, cur, heroId, occupancy) !== 'open') continue;
    for (const n of axialNeighbors(cur)) {
      if (!inMap(map, n)) continue;
      if (fog && fog.explored[cellIndex(map, n)] !== 1) continue;
      const role = tileRole(catalog, state, hero.ownerId, n, heroId, occupancy);
      if (role === 'blocked') continue;
      const c = edgeCost(catalog, map, cur, n);
      if (c === null) continue;
      const nd = d + c;
      if (nd > budget) continue;
      const nk = hexKey(n);
      const old = dist.get(nk);
      if (old === undefined || nd < old) {
        dist.set(nk, nd);
        coords.set(nk, n);
        heap.push(nd, nk);
      }
    }
  }
  dist.delete(startKey);
  for (const [k, v] of dist) out.set(k, v);
  return out;
}

/** Cells within radius (graph distance without terrain occlusion in this profile). */
export function cellsWithin(map: WorldMapDefinition, center: HexCoord, radius: number): HexCoord[] {
  const out: HexCoord[] = [];
  for (let dq = -radius; dq <= radius; dq++) {
    for (let dr = Math.max(-radius, -dq - radius); dr <= Math.min(radius, -dq + radius); dr++) {
      const c = { q: center.q + dq, r: center.r + dr };
      if (inMap(map, c)) out.push(c);
    }
  }
  return out;
}

/** Currently visible cells for a player (derived; not stored). */
export function visibleCells(catalog: ContentCatalog, state: MatchState, playerId: PlayerId): Set<number> {
  const map = state.world.map;
  const out = new Set<number>();
  for (const h of Object.values(state.heroes)) {
    if (!allied(state, h.ownerId, playerId) || h.status !== 'active') continue;
    for (const c of cellsWithin(map, h.position, heroVisionRadius(catalog, h, state))) out.add(cellIndex(map, c));
  }
  for (const t of Object.values(state.towns)) {
    if (!allied(state, t.ownerId, playerId)) continue;
    for (const c of cellsWithin(map, t.coord, townVisionRadius(catalog, state, t))) out.add(cellIndex(map, c));
  }
  // Coastal watchtowers (sea-sites kit): live ordinary sight around every tower the player owns.
  for (const owner of Object.keys(state.players).filter((id) => allied(state, id, playerId))) for (const t of ownedTowerSight(catalog, state, owner)) for (const c of cellsWithin(map, t.coord, t.radius)) out.add(cellIndex(map, c));
  // Recruitment caravans see one hex around their wagon (no distant route reveal).
  if (state.caravans) {
    const radius = catalog.caravanPolicy?.visionRadius ?? 1;
    for (const owner of Object.keys(state.players).filter((id) => allied(state, id, playerId))) for (const k of caravansOnMap(state, owner)) for (const c of cellsWithin(map, k.coord, radius)) out.add(cellIndex(map, c));
  }
  // Temporary adventure-spell vision (Divine Sight) until the next dawn.
  for (const owner of Object.keys(state.players).filter((id) => allied(state, id, playerId))) for (const r of state.fog[owner]?.temporaryReveals ?? []) {
    if (r.untilDay <= state.day) continue;
    for (const c of cellsWithin(map, r.center, r.radius)) out.add(cellIndex(map, c));
  }
  return out;
}

export { axialDistance };
