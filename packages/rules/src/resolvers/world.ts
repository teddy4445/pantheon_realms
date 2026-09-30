/**
 * World resolvers: terrain lookup, movement costs, passability, pathfinding
 * and visibility on the axial adventure map.
 *
 * Movement legality is decided here from logical data; Babylon never decides it.
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

export function hasRoad(map: WorldMapDefinition, a: HexCoord, b: HexCoord): boolean {
  return roadSet(map).has(edgeKey(a, b));
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

/** Destination-edge cost rule: road edge 75, otherwise destination terrain cost; null = impassable. */
export function edgeCost(catalog: ContentCatalog, map: WorldMapDefinition, from: HexCoord, to: HexCoord): number | null {
  const profile = catalog.rulesProfile;
  const base = profile.terrainCost[terrainAt(map, to)];
  if (base === null) return null;
  if (roadSet(map).has(edgeKey(from, to))) return profile.roadCost;
  return base;
}

export function missionSite(catalog: ContentCatalog, state: MatchState, siteId: SiteId): SiteDefinition | undefined {
  return catalog.missions[state.mission.missionId]?.sites.find((s) => s.id === siteId);
}

export interface SiteAt {
  readonly def: SiteDefinition;
  readonly state: SiteState;
}

export function siteIndex(catalog: ContentCatalog, state: MatchState): Map<string, SiteAt> {
  const out = new Map<string, SiteAt>();
  const mission = catalog.missions[state.mission.missionId];
  if (!mission) return out;
  for (const def of mission.sites) {
    const st = state.world.sites[def.id];
    if (st) out.set(hexKey(def.coord), { def, state: st });
  }
  return out;
}

export function siteAt(catalog: ContentCatalog, state: MatchState, c: HexCoord): SiteAt | undefined {
  return siteIndex(catalog, state).get(hexKey(c));
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

/** How a tile behaves for a moving hero of `playerId`. */
export function tileRole(catalog: ContentCatalog, state: MatchState, playerId: PlayerId, c: HexCoord, movingHeroId: HeroId): TileRole {
  const map = state.world.map;
  if (!inMap(map, c)) return 'blocked';
  if (catalog.rulesProfile.terrainCost[terrainAt(map, c)] === null) return 'blocked';
  const other = heroAt(state, c, movingHeroId);
  if (other) return other.ownerId === playerId ? 'blocked' : 'encounter';
  const site = siteAt(catalog, state, c);
  if (!site) return 'open';
  const { def, state: st } = site;
  if (def.kind.type === 'gate') return st.open ? 'open' : 'blocked';
  if (def.kind.type === 'town') {
    // Another player's (or an ownerless) garrisoned town must be besieged (design/04 §8).
    const town = state.towns[def.kind.townId];
    if (town && town.ownerId !== playerId && town.garrison.slots.some((s) => s && s.count > 0)) return 'encounter';
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
  const map = state.world.map;
  if (!inMap(map, dest)) return fail('Outside the map');
  if (hexEquals(hero.position, dest)) return fail('Already here');
  const fog = state.fog[hero.ownerId];
  const explored = (c: HexCoord) => !fog || fog.explored[cellIndex(map, c)] === 1;
  if (!explored(dest)) return fail('Unexplored');
  const destRole = tileRole(catalog, state, hero.ownerId, dest, heroId);
  if (destRole === 'blocked') return fail('That location cannot be entered');

  const startKey = hexKey(hero.position);
  const destKey = hexKey(dest);
  const dist = new Map<string, number>([[startKey, 0]]);
  const prev = new Map<string, string>();
  const coords = new Map<string, HexCoord>([[startKey, hero.position]]);
  const done = new Set<string>();
  // Small maps (<= 600 cells): a simple O(n^2) selection keeps ordering fully deterministic.
  for (;;) {
    let bestKey: string | null = null;
    let bestDist = Number.POSITIVE_INFINITY;
    for (const [k, d] of dist) {
      if (done.has(k)) continue;
      if (d < bestDist || (d === bestDist && bestKey !== null && k < bestKey)) {
        bestKey = k;
        bestDist = d;
      }
    }
    if (bestKey === null) break;
    if (bestKey === destKey) break;
    done.add(bestKey);
    const cur = coords.get(bestKey)!;
    // Only the start tile and 'open' tiles may be passed through.
    if (bestKey !== startKey && tileRole(catalog, state, hero.ownerId, cur, heroId) !== 'open') continue;
    for (const n of axialNeighbors(cur)) {
      if (!inMap(map, n) || !explored(n)) continue;
      const role = tileRole(catalog, state, hero.ownerId, n, heroId);
      if (role === 'blocked') continue;
      const nKey = hexKey(n);
      if (role !== 'open' && nKey !== destKey) continue;
      const c = edgeCost(catalog, map, cur, n);
      if (c === null) continue;
      const nd = bestDist + c;
      const old = dist.get(nKey);
      if (old === undefined || nd < old) {
        dist.set(nKey, nd);
        prev.set(nKey, bestKey);
        coords.set(nKey, n);
      }
    }
  }
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
  const map = state.world.map;
  const fog = state.fog[hero.ownerId];
  const budget = hero.movementPoints;
  const startKey = hexKey(hero.position);
  const dist = new Map<string, number>([[startKey, 0]]);
  const coords = new Map<string, HexCoord>([[startKey, hero.position]]);
  const frontier: string[] = [startKey];
  while (frontier.length > 0) {
    frontier.sort((a, b) => (dist.get(a)! - dist.get(b)! || (a < b ? -1 : 1)));
    const key = frontier.shift()!;
    const cur = coords.get(key)!;
    const d = dist.get(key)!;
    if (key !== startKey && tileRole(catalog, state, hero.ownerId, cur, heroId) !== 'open') continue;
    for (const n of axialNeighbors(cur)) {
      if (!inMap(map, n)) continue;
      if (fog && fog.explored[cellIndex(map, n)] !== 1) continue;
      const role = tileRole(catalog, state, hero.ownerId, n, heroId);
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
        if (!frontier.includes(nk)) frontier.push(nk);
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
    if (h.ownerId !== playerId || h.status !== 'active') continue;
    for (const c of cellsWithin(map, h.position, heroVisionRadius(catalog, h, state))) out.add(cellIndex(map, c));
  }
  for (const t of Object.values(state.towns)) {
    if (t.ownerId !== playerId) continue;
    for (const c of cellsWithin(map, t.coord, townVisionRadius(catalog, t))) out.add(cellIndex(map, c));
  }
  // Temporary adventure-spell vision (Divine Sight) until the next dawn.
  for (const r of state.fog[playerId]?.temporaryReveals ?? []) {
    if (r.untilDay <= state.day) continue;
    for (const c of cellsWithin(map, r.center, r.radius)) out.add(cellIndex(map, c));
  }
  return out;
}

export function isVisibleTo(catalog: ContentCatalog, state: MatchState, playerId: PlayerId, c: HexCoord): boolean {
  return visibleCells(catalog, state, playerId).has(cellIndex(state.world.map, c));
}

export function isExploredBy(state: MatchState, playerId: PlayerId, c: HexCoord): boolean {
  const fog = state.fog[playerId];
  if (!fog) return true;
  return fog.explored[cellIndex(state.world.map, c)] === 1;
}

export { axialDistance };
