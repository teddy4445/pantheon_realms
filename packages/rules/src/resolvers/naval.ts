import { allied } from '../systems/coalition';
import { heroEffects } from './heroes';
/**
 * Naval resolvers (expedition kit §07, scenario feature `navalMovementV1`): ships on the
 * map, coastal legality, the water-only movement graph of an embarked hero and the
 * mixed-mode (land / sea / land) route planner. Pure and deterministic: the same state
 * always gives the same answer; nothing here changes the state.
 *
 * Land versus water comes from the logical map's terrain (`water`), never from a picture.
 * One deterministic graph serves quotes and commits: an embarked hero's MoveHero is quoted
 * by `findSeaPath` (100 per water edge, no road bonus, the hero's normal daily budget); a
 * hero whose destination needs a mode change gets a `VoyagePlan` whose transitions are
 * explicit steps (the commit stops there and EmbarkHero / DisembarkHero confirms them).
 * Route trees are cached only while `withSharedPaths` runs, keyed by state, hero AND mode,
 * so a land-only tree is never reused for the sea or the other way round.
 */
import type { HeroId, PlayerId, ShipId, TownId } from '../ids';
import { AXIAL_DIRECTIONS, axialDistance, axialNeighbors, hexEquals, hexKey, type HexCoord } from '../core/hex';
import { canAfford, resources, type ResourceBundle } from '../core/resources';
import type { ContentCatalog } from '../definitions/catalog';
import { navalRules } from '../definitions/naval';
import type { RejectionCode } from '../engine/tx';
import type { HeroState, MatchState, ShipState } from '../state/match';
import { movementBudget } from './heroes';
import {
  KeyHeap,
  cellIndex,
  edgeCost,
  heroOccupancy,
  findHeroPath,
  inMap,
  isTownTile,
  sharedPathsActive,
  siteAt,
  terrainAt,
  tileRole,
  type PathResult,
  type TileRole,
} from './world';
import { seaPickups, seaSiteBlockedCells } from './seaSites';
import { seaEncounterTiles } from './seaEncounter';
import { movementPricing, movementLedger, priceMovementPath, priceMovementStep, libraryTravelClock } from './libraryMovement';
import { heroSailCost } from './libraryAdventure';

// ---------------------------------------------------------------------------
// Ships on the map
// ---------------------------------------------------------------------------

/** Ships are part of this scenario (scenario feature `navalMovementV1`; absent = off, older saves). */
export function navalEnabled(state: Pick<MatchState, 'scenario'>): boolean {
  return state.scenario.features?.navalMovementV1 === true;
}

/** Every ship on the map (wrecks excluded), in stable ID order. */
export function shipList(state: Pick<MatchState, 'world'>): ShipState[] {
  const ships = state.world.ships;
  if (!ships) return [];
  return Object.values(ships)
    .filter((s) => s.state !== 'wrecked')
    .sort((a, b) => (a.shipId < b.shipId ? -1 : a.shipId > b.shipId ? 1 : 0));
}

/** The ship on a tile (none, or at most one: two ships never share a tile). */
export function shipAt(state: Pick<MatchState, 'world'>, c: HexCoord): ShipState | undefined {
  return shipList(state).find((s) => hexEquals(s.coord, c));
}

/** The ship a hero is aboard (undefined: the hero is on land). */
export function heroShip(state: Pick<MatchState, 'world'>, heroId: HeroId): ShipState | undefined {
  const ships = state.world.ships;
  if (!ships) return undefined;
  for (const s of Object.values(ships)) if (s.heroId === heroId && s.state !== 'wrecked') return s;
  return undefined;
}

export function isEmbarked(state: Pick<MatchState, 'world'>, heroId: HeroId): boolean {
  return !!heroShip(state, heroId);
}

/** Ships by tile key (built once per search). */
export function shipOccupancy(state: Pick<MatchState, 'world'>): Map<string, ShipState> {
  const out = new Map<string, ShipState>();
  for (const s of shipList(state)) out.set(hexKey(s.coord), s);
  return out;
}

/** A water tile of the logical map (explicit terrain; void and off-map are not water). */
export function isWater(state: Pick<MatchState, 'world'>, c: HexCoord): boolean {
  const map = state.world.map;
  return inMap(map, c) && terrainAt(map, c) === 'water';
}

/** The heading (AXIAL_DIRECTIONS index) from `from` toward `to`: the exact direction for neighbours, else the nearest. */
export function facingBetween(from: HexCoord, to: HexCoord): number {
  const dq = to.q - from.q;
  const dr = to.r - from.r;
  let best = 0;
  let bestScore = Number.NEGATIVE_INFINITY;
  AXIAL_DIRECTIONS.forEach((d, i) => {
    // Cube dot product (axial q, r, s = -q - r): the direction most aligned with the delta.
    const score = d.q * dq + d.r * dr + (-d.q - d.r) * (-dq - dr);
    if (score > bestScore) {
      bestScore = score;
      best = i;
    }
  });
  return best;
}

/** A ship is free to be embarked by `playerId`'s hero: empty, and the player's or neutral. */
export function shipClaimable(ship: ShipState, playerId: PlayerId): boolean {
  return ship.state === 'empty' && !ship.heroId && (ship.ownerId === null || ship.ownerId === playerId);
}

/** The hero aboard a ship is an enemy of `playerId` (an occupied hostile ship: a boarding target). */
export function hostileOccupied(state: Pick<MatchState, 'heroes' | 'coalition'>, ship: ShipState, playerId: PlayerId): boolean {
  if (!ship.heroId) return false;
  const h = state.heroes[ship.heroId];
  return !!h && h.status === 'active' && !allied(state, h.ownerId, playerId);
}

// ---------------------------------------------------------------------------
// Coastal towns and launching
// ---------------------------------------------------------------------------

/** The water neighbours of a town's own tile (its footprint), in canonical neighbour order. */
export function coastalWaterCells(state: MatchState, townId: TownId): HexCoord[] {
  const town = state.towns[townId];
  if (!town) return [];
  return axialNeighbors(town.coord).filter((n) => isWater(state, n));
}

/**
 * A water tile a ship may be placed on or withdraw to: no ship, no hero, and no sea site holding it —
 * a shipwreck's hex (ships never enter it), a live sea monster (fought, never shared) or floating salvage
 * not yet claimed (collected by sailing onto it, never by a launch or a retreat).
 */
export function vacantWater(catalog: ContentCatalog, state: MatchState, c: HexCoord): boolean {
  if (!isWater(state, c) || shipAt(state, c)) return false;
  if (Object.values(state.heroes).some((h) => h.status === 'active' && hexEquals(h.position, c))) return false;
  const key = hexKey(c);
  if (seaSiteBlockedCells(catalog, state).has(key) || seaEncounterTiles(catalog, state).has(key)) return false;
  return !seaPickups(catalog, state).some((p) => hexEquals(p.coord, c) && !state.world.sites[p.id]?.claimed);
}

/** Free launch cells of a town (vacant water neighbours of its tile). */
export function freeLaunchCells(catalog: ContentCatalog, state: MatchState, townId: TownId): HexCoord[] {
  return coastalWaterCells(state, townId).filter((c) => vacantWater(catalog, state, c));
}

export interface NavalQuote {
  readonly legal: boolean;
  readonly code: RejectionCode | null;
  readonly reason: string | null;
}

export interface LaunchQuote extends NavalQuote {
  readonly cost: ResourceBundle;
  /** The town's free launch cells (the UI offers these). */
  readonly cells: HexCoord[];
}

const NAVAL_OFF = 'Ships are not part of this scenario';

/** LaunchShip (read-only quote; the commit runs the same checks). `waterCoord` null: is any launch possible now. */
export function quoteLaunchShip(catalog: ContentCatalog, state: MatchState, playerId: PlayerId, townId: TownId, waterCoord: HexCoord | null): LaunchQuote {
  const cost = resources(navalRules(catalog.rulesProfile).shipCost);
  const cells = freeLaunchCells(catalog, state, townId);
  const fail = (code: RejectionCode, reason: string): LaunchQuote => ({ legal: false, code, reason, cost, cells });
  if (!navalEnabled(state)) return fail('not_in_scope', NAVAL_OFF);
  const town = state.towns[townId];
  if (!town) return fail('not_found', 'Unknown town');
  if (town.ownerId !== playerId) return fail('not_owner', 'You do not own this town');
  const water = coastalWaterCells(state, townId);
  if (water.length === 0) return fail('missing_requirement', `${town.name} is not on the coast: no water beside the town`);
  if (waterCoord) {
    if (!water.some((c) => hexEquals(c, waterCoord))) return fail('illegal_target', `Launch onto the water beside ${town.name}`);
    if (!cells.some((c) => hexEquals(c, waterCoord))) return fail('illegal_target', 'That water is taken by another ship or hero');
  } else if (cells.length === 0) {
    return fail('no_capacity', `No free water beside ${town.name} to launch a ship`);
  }
  const wallet = state.players[playerId]?.wallet;
  if (!wallet || !canAfford(wallet, cost)) return fail('insufficient_resources', `A ship costs ${cost.gold} Gold and ${cost.wood} Wood`);
  return { legal: true, code: null, reason: null, cost, cells };
}

// ---------------------------------------------------------------------------
// Embarking and disembarking
// ---------------------------------------------------------------------------

export interface EmbarkQuote extends NavalQuote {
  /** Movement needed (at least) — one ordinary movement step is used. */
  readonly minimum: number;
  /** The ship is neutral and becomes the hero's empire's. */
  readonly claims: boolean;
  readonly remaining?: number;
  readonly keel?: boolean;
}

/** EmbarkHero (read-only quote). */
export function quoteEmbark(catalog: ContentCatalog, state: MatchState, heroId: HeroId, shipId: ShipId): EmbarkQuote {
  const minimum = catalog.rulesProfile.terrainCost.plains!;
  const fail = (code: RejectionCode, reason: string): EmbarkQuote => ({ legal: false, code, reason, minimum, claims: false });
  if (!navalEnabled(state)) return fail('not_in_scope', NAVAL_OFF);
  const hero = state.heroes[heroId];
  if (!hero) return fail('not_found', 'Unknown hero');
  if (hero.status !== 'active') return fail('illegal_action', `${hero.name} cannot move`);
  if (heroShip(state, heroId)) return fail('illegal_action', `${hero.name} is already aboard a ship`);
  const ship = state.world.ships?.[shipId];
  if (!ship || ship.state === 'wrecked') return fail('not_found', 'Unknown ship');
  if (ship.heroId) {
    const aboard = state.heroes[ship.heroId];
    if (aboard && aboard.ownerId !== hero.ownerId) return fail('illegal_target', `${aboard.name} holds that ship: board it from a ship of your own`);
    return fail('illegal_target', 'That ship already carries a hero');
  }
  if (ship.state !== 'empty') return fail('illegal_target', 'That ship cannot be boarded now');
  if (ship.ownerId !== null && ship.ownerId !== hero.ownerId) return fail('not_owner', 'That ship belongs to another empire');
  if (!isWater(state, ship.coord)) return fail('illegal_target', 'That ship is not afloat');
  if (isWater(state, hero.position)) return fail('illegal_action', `${hero.name} must stand on the shore`);
  if (axialDistance(hero.position, ship.coord) !== 1) return fail('not_present', `${hero.name} must stand on the shore beside the ship`);
  const keel = ship.ownerId === hero.ownerId && hero.libraryAdventure?.usedDays?.keel !== state.day && heroEffects(catalog, hero, state).some((e) => e.type === 'adventure_embark_discount');
  const required = keel ? catalog.rulesProfile.terrainCost.plains! : minimum;
  if (hero.movementPoints < required) return { ...fail('insufficient_movement', `Embarking needs at least ${required} movement points`), minimum: required };
  return { legal: true, code: null, reason: null, minimum: required, claims: ship.ownerId === null, remaining: hero.movementPoints - required, ...(keel ? { keel: true } : {}) };
}

export interface DisembarkQuote extends NavalQuote {
  readonly minimum: number;
  readonly remaining?: number;
}

/** Why a shore tile cannot be landed on (null: it can) — the land rules a walking hero meets there. */
export function landingProblem(catalog: ContentCatalog, state: MatchState, hero: HeroState, c: HexCoord): string | null {
  const map = state.world.map;
  if (!inMap(map, c)) return 'Outside the map';
  const fog = state.fog[hero.ownerId];
  if (fog && fog.explored[cellIndex(map, c)] !== 1) return 'Unexplored';
  const t = terrainAt(map, c);
  if (t === 'water') return 'That is water: land on a shore';
  if (catalog.rulesProfile.terrainCost[t] === null) return t === 'mountain' ? 'Mountains cannot be landed on' : 'No ground to land on';
  if (isTownTile(catalog, state, c)) return 'A town is entered by its gate: land beside it';
  const role: TileRole = tileRole(catalog, state, hero.ownerId, c, hero.id);
  if (role === 'open') return null;
  if (role === 'encounter') return 'An enemy holds that shore';
  if (role === 'destination_only') return 'Land on an empty shore beside it, then walk there';
  const site = siteAt(catalog, state, c);
  if (site && (site.def.kind.type === 'gate' || site.def.kind.type === 'key_gate')) return 'The gate is closed';
  return 'That shore is taken';
}

/** DisembarkHero (read-only quote). */
export function quoteDisembark(catalog: ContentCatalog, state: MatchState, heroId: HeroId, landCoord: HexCoord): DisembarkQuote {
  const minimum = catalog.rulesProfile.terrainCost.plains!;
  const fail = (code: RejectionCode, reason: string): DisembarkQuote => ({ legal: false, code, reason, minimum });
  if (!navalEnabled(state)) return fail('not_in_scope', NAVAL_OFF);
  const hero = state.heroes[heroId];
  if (!hero) return fail('not_found', 'Unknown hero');
  if (hero.status !== 'active') return fail('illegal_action', `${hero.name} cannot move`);
  const ship = heroShip(state, heroId);
  if (!ship) return fail('illegal_action', `${hero.name} is not aboard a ship`);
  if (axialDistance(ship.coord, landCoord) !== 1) return fail('illegal_move', 'Land on a shore beside the ship');
  const problem = landingProblem(catalog, state, hero, landCoord);
  if (problem) return fail('illegal_move', problem);
  if (hero.movementPoints < minimum) return fail('insufficient_movement', `Landing needs at least ${minimum} movement points`);
  const blessing = state.scenario.features?.mythicLibraryV2 ? hero.libraryAdventure?.safeLanding : undefined;
  const remaining = blessing && blessing.untilDay > state.day && blessing.ownerId === hero.ownerId ? Math.min(hero.movementPoints, Math.floor(movementBudget(catalog, state, hero).total * blessing.percent / 100)) : hero.movementPoints - minimum;
  return { legal: true, code: null, reason: null, minimum, remaining: Math.max(hero.movementPoints - minimum, remaining) };
}

/** Ships `heroId` could embark now or after walking to their shore (claimable and afloat), in ID order. */
export function claimableShips(state: MatchState, heroId: HeroId): ShipState[] {
  const hero = state.heroes[heroId];
  if (!hero) return [];
  return shipList(state).filter((s) => shipClaimable(s, hero.ownerId) && isWater(state, s.coord));
}

/** The shore tiles beside the hero's ship where it may land now (canonical order). */
export function landingCells(catalog: ContentCatalog, state: MatchState, heroId: HeroId): HexCoord[] {
  const hero = state.heroes[heroId];
  const ship = heroShip(state, heroId);
  if (!hero || !ship) return [];
  return axialNeighbors(ship.coord).filter((c) => landingProblem(catalog, state, hero, c) === null);
}

export interface AttackShipQuote extends NavalQuote {
  /** Movement points the boarding costs (one sea edge). */
  readonly cost: number;
  readonly label: string | null;
}

/** AttackShip (read-only quote): an embarked hero boards an adjacent hostile occupied ship. */
export function quoteAttackShip(catalog: ContentCatalog, state: MatchState, heroId: HeroId, targetShipId: ShipId): AttackShipQuote {
  const mover = state.heroes[heroId];
  const cost = mover ? priceMovementStep(movementPricing(catalog, state, mover), movementLedger(mover, state.day), mover.position, mover.position, 'sea').cost : navalRules(catalog.rulesProfile).sailCost;
  const fail = (code: RejectionCode, reason: string): AttackShipQuote => ({ legal: false, code, reason, cost, label: null });
  if (!navalEnabled(state)) return fail('not_in_scope', NAVAL_OFF);
  const hero = state.heroes[heroId];
  if (!hero) return fail('not_found', 'Unknown hero');
  if (hero.status !== 'active') return fail('illegal_action', `${hero.name} cannot fight`);
  const own = heroShip(state, heroId);
  if (!own) return fail('illegal_action', 'A ship is boarded from a ship of your own');
  const target = state.world.ships?.[targetShipId];
  if (!target || target.state === 'wrecked') return fail('not_found', 'Unknown ship');
  if (target.shipId === own.shipId) return fail('illegal_target', 'That is your own ship');
  if (!target.heroId) return fail('illegal_target', 'An empty ship is claimed by embarking, not fought');
  const enemy = state.heroes[target.heroId];
  if (!enemy || enemy.status !== 'active') return fail('illegal_target', 'Nobody holds that ship');
  if (allied(state, enemy.ownerId, hero.ownerId)) return fail('illegal_target', 'That ship belongs to your coalition');
  if (axialDistance(own.coord, target.coord) !== 1) return fail('not_present', 'The enemy ship must lie next to yours');
  const fog = state.fog[hero.ownerId];
  if (fog && fog.explored[cellIndex(state.world.map, target.coord)] !== 1) return fail('illegal_target', 'Unexplored');
  if (hero.movementPoints < cost) return fail('insufficient_movement', `Boarding needs ${cost} movement points`);
  return { legal: true, code: null, reason: null, cost, label: `Board ${enemy.name}'s ship` };
}

// ---------------------------------------------------------------------------
// Sailing: the water-only graph
// ---------------------------------------------------------------------------

/**
 * How a water tile behaves for `heroId`'s ship: open water, an occupied hostile ship (an
 * encounter: a boarding battle, destination only), or blocked (land, another ship, an empty
 * hull of any owner, a hero).
 */
export function seaTileRole(
  state: MatchState,
  playerId: PlayerId,
  c: HexCoord,
  heroId: HeroId,
  ships: ReadonlyMap<string, ShipState>,
  heroes: ReadonlyMap<string, HeroState>,
  /** Water hexes no ship enters (shipwrecks, sea-sites kit: `seaSiteBlockedCells`). */
  blocked?: ReadonlySet<string>,
  /** Water hexes holding a fightable sea monster (seaEncountersV1: `seaEncounterTiles`): an encounter, destination only. */
  encounters?: ReadonlySet<string>,
): TileRole {
  if (!isWater(state, c)) return 'blocked';
  const k = hexKey(c);
  if (blocked?.has(k)) return 'blocked';
  const ship = ships.get(k);
  if (ship) {
    if (ship.heroId === heroId) return 'open';
    return hostileOccupied(state, ship, playerId) ? 'encounter' : 'blocked';
  }
  if (encounters?.has(k)) return 'encounter';
  return heroes.has(k) ? 'blocked' : 'open';
}

interface Tree {
  readonly dist: Map<string, number>;
  readonly prev: Map<string, string>;
  readonly coords: Map<string, HexCoord>;
}

/** Dijkstra over water from the hero's ship, settling the lowest (distance, key) first (stable). */
function searchSea(catalog: ContentCatalog, state: MatchState, heroId: HeroId, destKey: string | null, budget: number | null): Tree {
  const hero = state.heroes[heroId]!;
  const map = state.world.map;
  const fog = state.fog[hero.ownerId];
  const explored = (c: HexCoord) => !fog || fog.explored[cellIndex(map, c)] === 1;
  const pricing = movementPricing(catalog, state, hero);
  const initialLedger = movementLedger(hero, state.day);
  const ledgers = new Map<string, ReturnType<typeof movementLedger>>();
  const ships = shipOccupancy(state);
  const heroes = heroOccupancy(state, heroId);
  const wrecks = seaSiteBlockedCells(catalog, state);
  const seaFoes = seaEncounterTiles(catalog, state);
  const start = heroShip(state, heroId)?.coord ?? hero.position;
  const startKey = hexKey(start);
  const dist = new Map<string, number>([[startKey, 0]]);
  const prev = new Map<string, string>();
  const coords = new Map<string, HexCoord>([[startKey, start]]);
  const done = new Set<string>();
  const heap = new KeyHeap();
  heap.push(0, startKey);
  for (;;) {
    const top = heap.pop();
    if (!top) break;
    const [d, key] = top;
    if (done.has(key) || d !== dist.get(key)) continue;
    if (key === destKey) break;
    done.add(key);
    const cur = coords.get(key)!;
    if (key !== startKey && seaTileRole(state, hero.ownerId, cur, heroId, ships, heroes, wrecks, seaFoes) !== 'open') continue;
    for (const n of axialNeighbors(cur)) {
      if (!inMap(map, n) || !explored(n)) continue;
      const role = seaTileRole(state, hero.ownerId, n, heroId, ships, heroes, wrecks, seaFoes);
      if (role === 'blocked') continue;
      const nk = hexKey(n);
      if (role !== 'open' && destKey !== null && nk !== destKey) continue;
      const step = priceMovementStep(pricing, ledgers.get(key) ?? initialLedger, cur, n, 'sea');
      const nd = d + step.cost;
      if (budget !== null && nd > budget) continue;
      const old = dist.get(nk);
      if (old === undefined || nd < old) {
        dist.set(nk, nd);
        ledgers.set(nk, step.ledger);
        prev.set(nk, key);
        coords.set(nk, n);
        heap.push(nd, nk);
      }
    }
  }
  return { dist, prev, coords };
}

/** Route trees while `withSharedPaths` runs, keyed by state, then hero and mode. */
const treeMemo = new WeakMap<MatchState, Map<string, unknown>>();
function memoized<T>(state: MatchState, key: string, build: () => T): T {
  if (!sharedPathsActive()) return build();
  let byKey = treeMemo.get(state);
  if (!byKey) treeMemo.set(state, (byKey = new Map()));
  if (!byKey.has(key)) byKey.set(key, build());
  return byKey.get(key) as T;
}

/**
 * The embarked hero's sea route (the water-only graph; `findHeroPath` delegates here while the
 * hero is aboard). A hostile occupied ship is an encounter (boarding) at the destination only.
 */
export function findSeaPath(catalog: ContentCatalog, state: MatchState, heroId: HeroId, dest: HexCoord): PathResult {
  const fail = (reason: string): PathResult => ({ reachable: false, path: [], stepCosts: [], totalCost: 0, endsInEncounter: false, reason });
  const hero = state.heroes[heroId];
  const ship = heroShip(state, heroId);
  if (!hero || !ship) return fail('Unknown hero');
  const map = state.world.map;
  if (!inMap(map, dest)) return fail('Outside the map');
  if (hexEquals(ship.coord, dest)) return fail('Already here');
  const fog = state.fog[hero.ownerId];
  if (fog && fog.explored[cellIndex(map, dest)] !== 1) return fail('Unexplored');
  const ships = shipOccupancy(state);
  const heroes = heroOccupancy(state, heroId);
  const destRole = seaTileRole(state, hero.ownerId, dest, heroId, ships, heroes, seaSiteBlockedCells(catalog, state), seaEncounterTiles(catalog, state));
  if (destRole === 'blocked') return fail(seaSiteBlockedCells(catalog, state).has(hexKey(dest)) ? 'A wreck lies there: ships sail around it (explore it from beside it)' : isWater(state, dest) ? 'That water is taken' : 'Ships sail on water only: land first');
  const destKey = hexKey(dest);
  const t = sharedPathsActive() ? memoized(state, `${heroId}|sea`, () => searchSea(catalog, state, heroId, null, null)) : searchSea(catalog, state, heroId, destKey, null);
  const total = t.dist.get(destKey);
  if (total === undefined) return fail('No known sea route');
  const path: HexCoord[] = [];
  const startKey = hexKey(ship.coord);
  let k: string | undefined = destKey;
  while (k && k !== startKey) {
    path.unshift(t.coords.get(k)!);
    k = t.prev.get(k);
  }
  const priced = priceMovementPath(movementPricing(catalog, state, hero), movementLedger(hero, state.day), ship.coord, path, 'sea');
  return { reachable: true, path, stepCosts: priced.stepCosts, totalCost: priced.cost, endsInEncounter: destRole === 'encounter', reason: null };
}

/** Water tiles the embarked hero can reach today (the movement-range overlay at sea). */
export function reachableSeaTiles(catalog: ContentCatalog, state: MatchState, heroId: HeroId): Map<string, number> {
  const hero = state.heroes[heroId];
  const ship = heroShip(state, heroId);
  const out = new Map<string, number>();
  if (!hero || !ship) return out;
  const t = searchSea(catalog, state, heroId, null, hero.movementPoints);
  const startKey = hexKey(ship.coord);
  for (const [k, v] of t.dist) if (k !== startKey) out.set(k, v);
  return out;
}

// ---------------------------------------------------------------------------
// Mixed-mode planning (land -> embark -> sea -> disembark -> land)
// ---------------------------------------------------------------------------

export type TravelMode = 'land' | 'sea';

/** One leg of a voyage in one mode: `path` are the tiles after `from`, `stepCosts` cumulative within the leg. */
export interface VoyageLeg {
  readonly mode: TravelMode;
  readonly from: HexCoord;
  readonly path: HexCoord[];
  readonly stepCosts: number[];
  readonly cost: number;
}

/** A mode change on a voyage: an explicit step that EmbarkHero / DisembarkHero confirms (never automatic). */
export type VoyageTransition =
  | { readonly kind: 'embark'; readonly shipId: ShipId; readonly shore: HexCoord; readonly shipCoord: HexCoord }
  | { readonly kind: 'disembark'; readonly shipId: ShipId; readonly water: HexCoord; readonly landCoord: HexCoord };

export interface VoyagePlan {
  readonly destination: HexCoord;
  /** One more leg than transitions; leg i+1 starts where transition i lands. */
  readonly legs: VoyageLeg[];
  readonly transitions: VoyageTransition[];
  /** Movement points of the legs plus `transitionMinimumMovement` per transition (the planner's measure; see voyageDays). */
  readonly totalCost: number;
  /** The destination is an encounter (a guard, an enemy hero or town, a hostile ship). */
  readonly endsInEncounter: boolean;
}

interface VoyageTree {
  readonly dist: Map<string, number>;
  readonly prev: Map<string, string>;
  readonly coords: Map<string, HexCoord>;
  /** Embark nodes: the ship boarded there. */
  readonly embarked: Map<string, ShipId>;
  readonly phases: readonly TravelMode[];
  readonly startKey: string;
}

const nodeKey = (phase: number, c: HexCoord) => `${phase}|${hexKey(c)}`;
const phaseOf = (key: string) => Number(key.slice(0, key.indexOf('|')));

/**
 * The multi-phase search: nodes are (phase, tile); a land hero's phases are land -> sea -> land,
 * an embarked hero's sea -> land. Land steps follow the walking rules (`tileRole`, `edgeCost`);
 * sea steps the water graph. Embarking (onto an empty own or neutral ship next to a tile the
 * hero may stop on) and landing (onto a vacant open shore) cost `transitionMinimumMovement` in
 * the planner's measure. Only explored tiles are used. Ties: (distance, key), so the plan is
 * deterministic.
 */
function searchVoyage(catalog: ContentCatalog, state: MatchState, heroId: HeroId, destKey: string | null): VoyageTree | null {
  const hero = state.heroes[heroId];
  if (!hero || hero.status !== 'active') return null;
  const map = state.world.map;
  const fog = state.fog[hero.ownerId];
  const explored = (c: HexCoord) => !fog || fog.explored[cellIndex(map, c)] === 1;
  const ships = shipOccupancy(state);
  const heroes = heroOccupancy(state, heroId);
  const aboard = heroShip(state, heroId);
  const phases: TravelMode[] = aboard ? ['sea', 'land'] : ['land', 'sea', 'land'];
  const start = aboard?.coord ?? hero.position;
  const startKey = nodeKey(0, start);
  const dist = new Map<string, number>([[startKey, 0]]);
  const prev = new Map<string, string>();
  const coords = new Map<string, HexCoord>([[startKey, start]]);
  const embarked = new Map<string, ShipId>();
  const done = new Set<string>();
  const heap = new KeyHeap();
  heap.push(0, startKey);
  const landRole = (c: HexCoord) => tileRole(catalog, state, hero.ownerId, c, heroId, heroes);
  const wrecks = seaSiteBlockedCells(catalog, state);
  const seaFoes = seaEncounterTiles(catalog, state);
  const seaRole = (c: HexCoord) => seaTileRole(state, hero.ownerId, c, heroId, ships, heroes, wrecks, seaFoes);
  const relax = (key: string, c: HexCoord, nd: number, from: string, ship?: ShipId) => {
    const old = dist.get(key);
    if (old === undefined || nd < old) {
      dist.set(key, nd);
      prev.set(key, from);
      coords.set(key, c);
      if (ship) embarked.set(key, ship);
      else embarked.delete(key);
      heap.push(nd, key);
    }
  };
  for (;;) {
    const top = heap.pop();
    if (!top) break;
    const [d, key] = top;
    if (done.has(key) || d !== dist.get(key)) continue;
    done.add(key);
    const cur = coords.get(key)!;
    const p = phaseOf(key);
    if (destKey !== null && key.slice(key.indexOf('|') + 1) === destKey && key !== startKey) break;
    const mode = phases[p]!;
    const isStart = key === startKey;
    const boardedHere = embarked.has(key);
    const role: TileRole = isStart ? 'open' : mode === 'land' ? landRole(cur) : boardedHere ? 'open' : seaRole(cur);
    // Same-mode steps: only from the start, open tiles and a ship just boarded.
    if (role === 'open') {
      for (const n of axialNeighbors(cur)) {
        if (!inMap(map, n) || !explored(n)) continue;
        const nk = nodeKey(p, n);
        if (mode === 'land') {
          const r = landRole(n);
          // An encounter ends a route: only as the destination (a single search) or a leaf of the full tree.
          if (r === 'blocked' || (r === 'encounter' && destKey !== null && hexKey(n) !== destKey)) continue;
          const c = edgeCost(catalog, map, cur, n);
          if (c === null) continue;
          relax(nk, n, d + c, key);
        } else {
          const r = seaRole(n);
          if (r === 'blocked' || (r === 'encounter' && destKey !== null && hexKey(n) !== destKey)) continue;
          relax(nk, n, d + heroSailCost(catalog, state, hero), key);
        }
      }
    }
    // Mode change to the next phase.
    const next = phases[p + 1];
    if (!next) continue;
    if (mode === 'land' && (role === 'open' || role === 'destination_only')) {
      for (const n of axialNeighbors(cur)) {
        const ship = ships.get(hexKey(n));
        if (!ship || !explored(n) || !shipClaimable(ship, hero.ownerId) || !isWater(state, n)) continue;
        relax(nodeKey(p + 1, n), n, d + catalog.rulesProfile.terrainCost.plains!, key, ship.shipId);
      }
    } else if (mode === 'sea' && role === 'open') {
      for (const n of axialNeighbors(cur)) {
        if (!inMap(map, n) || !explored(n) || isWater(state, n)) continue;
        if (isTownTile(catalog, state, n) || landRole(n) !== 'open') continue;
        relax(nodeKey(p + 1, n), n, d + catalog.rulesProfile.terrainCost.plains!, key);
      }
    }
  }
  return { dist, prev, coords, embarked, phases, startKey };
}

/**
 * The best mixed-mode route for `heroId` to `dest` (a resolved destination: a town's gate,
 * not its building tile), or null when ships are off or no route exists through explored
 * tiles. A plan without transitions is an ordinary single-mode route.
 */
export function planVoyage(catalog: ContentCatalog, state: MatchState, heroId: HeroId, dest: HexCoord): VoyagePlan | null {
  if (!navalEnabled(state)) return null;
  const hero = state.heroes[heroId];
  if (!hero || hero.status !== 'active' || !inMap(state.world.map, dest)) return null;
  const destKey = hexKey(dest);
  const tree = sharedPathsActive()
    ? memoized(state, `${heroId}|voyage`, () => searchVoyage(catalog, state, heroId, null))
    : searchVoyage(catalog, state, heroId, destKey);
  if (!tree) return null;
  // The cheapest phase that reached the destination (stable: phase order on ties).
  let best: string | null = null;
  for (let p = 0; p < tree.phases.length; p++) {
    const k = nodeKey(p, dest);
    if (k === tree.startKey) continue;
    const dk = tree.dist.get(k);
    if (dk === undefined) continue;
    if (best === null || dk < tree.dist.get(best)!) best = k;
  }
  if (best === null) return null;
  const nodes: string[] = [];
  for (let k: string | undefined = best; k; k = tree.prev.get(k)) {
    nodes.unshift(k);
    if (k === tree.startKey) break;
  }
  if (nodes[0] !== tree.startKey) return null;
  const map = state.world.map;
  const legs: VoyageLeg[] = [];
  const transitions: VoyageTransition[] = [];
  let legFrom = tree.coords.get(nodes[0]!)!;
  let legPhase = 0;
  let path: HexCoord[] = [];
  let stepCosts: number[] = [];
  let acc = 0;
  let prevCoord = legFrom;
  let shipId: ShipId | null = heroShip(state, heroId)?.shipId ?? null;
  const closeLeg = () => legs.push({ mode: tree.phases[legPhase]!, from: legFrom, path, stepCosts, cost: acc });
  for (const k of nodes.slice(1)) {
    const p = phaseOf(k);
    const c = tree.coords.get(k)!;
    if (p !== legPhase) {
      closeLeg();
      const from = prevCoord;
      if (tree.phases[legPhase] === 'land') {
        shipId = tree.embarked.get(k) ?? null;
        transitions.push({ kind: 'embark', shipId: shipId!, shore: from, shipCoord: c });
      } else {
        transitions.push({ kind: 'disembark', shipId: shipId!, water: from, landCoord: c });
      }
      legPhase = p;
      legFrom = c;
      path = [];
      stepCosts = [];
      acc = 0;
      prevCoord = c;
      continue;
    }
    acc += tree.phases[p] === 'land' ? (edgeCost(catalog, map, prevCoord, c) ?? 0) : heroSailCost(catalog, state, hero);
    path.push(c);
    stepCosts.push(acc);
    prevCoord = c;
  }
  closeLeg();
  if (state.scenario.features?.mythicLibraryV2) {
    const pricing = movementPricing(catalog, state, hero);
    let ledger = movementLedger(hero, state.day);
    for (let i = 0; i < legs.length; i++) {
      const leg = legs[i]!;
      let route = leg.path;
      if (i === 0 && route.length) {
        const shortest = findHeroPath(catalog, state, heroId, route[route.length - 1]!);
        if (shortest.reachable) route = shortest.path;
      }
      if (i && transitions[i - 1]?.kind === 'disembark') ledger.triggers.landing = true;
      const priced = priceMovementPath(pricing, ledger, leg.from, route, leg.mode); ledger = priced.ledger;
      legs[i] = { ...leg, path: route, cost: priced.cost, stepCosts: priced.stepCosts };
    }
  }
  const last = tree.phases[legPhase]!;
  const endsInEncounter =
    last === 'land'
      ? tileRole(catalog, state, hero.ownerId, dest, heroId) === 'encounter'
      : seaTileRole(state, hero.ownerId, dest, heroId, shipOccupancy(state), heroOccupancy(state, heroId), seaSiteBlockedCells(catalog, state), seaEncounterTiles(catalog, state)) === 'encounter';
  return { destination: { q: dest.q, r: dest.r }, legs, transitions, totalCost: legs.reduce((n, l) => n + l.cost, 0) + transitions.length * catalog.rulesProfile.terrainCost.plains!, endsInEncounter };
}

/**
 * The day a voyage ends on, counting today as day 1 (read-only): today the hero walks or sails
 * with its remaining points, each later day with its full daily budget; a transition needs
 * `transitionMinimumMovement` points (else it waits for the next day) and uses all that remain.
 * Null when a single step costs more than a whole day.
 */
export function voyageDays(catalog: ContentCatalog, state: MatchState, heroId: HeroId, plan: VoyagePlan): number | null {
  const hero = state.heroes[heroId];
  if (!hero) return null;
  if (state.scenario.features?.mythicLibraryV2) {
    const clock = libraryTravelClock(catalog, state, hero);
    for (let i = 0; i < plan.legs.length; i++) {
      const leg = plan.legs[i]!; let from = leg.from;
      for (const to of leg.path) { if (!clock.step(from, to, leg.mode)) return null; from = to; }
      const t = plan.transitions[i];
      if (t && !clock.transition(t.kind, state.world.ships?.[t.shipId]?.ownerId === hero.ownerId)) return null;
    }
    return clock.days;
  }
  const budget = movementBudget(catalog, state, hero).total;
  const minimum = catalog.rulesProfile.terrainCost.plains!;
  let points = hero.movementPoints;
  let day = 1;
  for (let i = 0; i < plan.legs.length; i++) {
    const leg = plan.legs[i]!;
    let paid = 0;
    for (const total of leg.stepCosts) {
      const cost = total - paid;
      paid = total;
      if (cost > budget) return null;
      if (cost > points) {
        day++;
        points = budget;
      }
      points -= cost;
    }
    if (i < plan.transitions.length) {
      if (points < minimum) {
        day++;
        points = budget;
      }
      points -= minimum;
    }
  }
  return day;
}

// ---------------------------------------------------------------------------
// Boarding battles: where a withdrawing ship goes
// ---------------------------------------------------------------------------

/**
 * Where a ship withdraws when its hero retreats or surrenders a boarding battle: the first
 * vacant water neighbour in canonical order (deterministic), never land. Null when there is none
 * (then retreat and surrender are refused with a reason).
 */
export function withdrawalCoord(catalog: ContentCatalog, state: MatchState, ship: ShipState): HexCoord | null {
  return axialNeighbors(ship.coord).find((n) => vacantWater(catalog, state, n)) ?? null;
}
