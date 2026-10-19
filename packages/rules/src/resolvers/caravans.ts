/**
 * Recruitment caravan resolvers (expedition kit §06, scenario feature `recruitmentCaravansV1`):
 * read-only lookups shared by the rules, the interface and the AI — the feature switch, the
 * shipments on the map and on a tile, the land route a caravan may take, its schedule (ETA) and
 * what another player may know of one it sees (the scouting-intel projection).
 *
 * Route rules (pure, integer, deterministic): explored land only (the owner's fog), the rules
 * profile's road (75) and terrain costs, never a town's own tile, a closed gate, a key gate
 * without its key, an uncleared guard or another player's town; the owner's own heroes and
 * caravans may share a tile; enemy heroes and caravans block — at planning only those the owner
 * sees now (no knowledge of hidden armies), while moving any that physically stands there (the
 * wagon notices it on the next tile and holds). Dijkstra settles the lowest (cost, key) first.
 */
import type { PlayerId, TownId } from '../ids';
import { axialNeighbors, hexEquals, hexKey, type HexCoord } from '../core/hex';
import type { ContentCatalog } from '../definitions/catalog';
import type { CaravanPolicy } from '../definitions/caravans';
import type { StackSpec } from '../definitions/world';
import type { CaravanState, CaravanStatus, CreatureStackState, HeroState, MatchState } from '../state/match';
import { cellIndex, edgeCost, inMap, isTownTile, siteAt, terrainAt, townGate, visibleCells } from './world';
import { activeIntelPolicy, armyGoldValue, groupedCreatures, intelCountRange, intelFriendly, intelStrengthBand, intelVision, observationStage, type ArmyIntelLine, type ArmyIntelStage, type IntelVision } from './intel';

/** The scenario plays with recruitment caravans (absent flag = off: older saves and campaign chapters). */
export function caravansEnabled(state: Pick<MatchState, 'scenario'>): boolean {
  return state.scenario.features?.recruitmentCaravansV1 === true;
}

/** The caravan terms in force, or null when the feature is off (or the catalog has none). */
export function activeCaravanPolicy(catalog: ContentCatalog, state: Pick<MatchState, 'scenario'>): CaravanPolicy | null {
  return caravansEnabled(state) ? (catalog.caravanPolicy ?? null) : null;
}

/** Statuses of a shipment that stands on the map (can be met, seen and attacked). */
export const CARAVAN_ON_MAP: ReadonlySet<CaravanStatus> = new Set<CaravanStatus>(['queued', 'travelling', 'blocked', 'intercepted', 'awaiting_garrison']);
/** Final statuses (kept until the owner's next day for the receipt). */
export const CARAVAN_FINAL: ReadonlySet<CaravanStatus> = new Set<CaravanStatus>(['delivered', 'destroyed']);

/** Stable processing order: dispatch order, then ID. */
export function caravanOrder(a: Pick<CaravanState, 'seq' | 'id'>, b: Pick<CaravanState, 'seq' | 'id'>): number {
  return a.seq - b.seq || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}

/** Every shipment, in the stable order (optionally one owner's). */
export function caravanList(state: Pick<MatchState, 'caravans'>, ownerId?: PlayerId): CaravanState[] {
  const all = Object.values(state.caravans ?? {});
  return (ownerId ? all.filter((c) => c.ownerId === ownerId) : all).sort(caravanOrder);
}

/** Shipments standing on the map, in the stable order. */
export function caravansOnMap(state: Pick<MatchState, 'caravans'>, ownerId?: PlayerId): CaravanState[] {
  return caravanList(state, ownerId).filter((c) => CARAVAN_ON_MAP.has(c.status));
}

// ---------------------------------------------------------------------------
// Tile occupancy (cached per caravans record; the systems invalidate it after each change)
// ---------------------------------------------------------------------------

const occupancyCache = new WeakMap<object, Map<string, CaravanState[]>>();

function occupancy(state: Pick<MatchState, 'caravans'>): Map<string, CaravanState[]> | null {
  const rec = state.caravans;
  if (!rec) return null;
  let index = occupancyCache.get(rec);
  if (!index) {
    index = new Map();
    for (const c of Object.values(rec).sort(caravanOrder)) {
      if (!CARAVAN_ON_MAP.has(c.status)) continue;
      const k = hexKey(c.coord);
      const list = index.get(k);
      if (list) list.push(c);
      else index.set(k, [c]);
    }
    occupancyCache.set(rec, index);
  }
  return index;
}

/** Forget the tile index after shipments moved or changed status (systems/caravans.ts calls it). */
export function invalidateCaravanIndex(state: Pick<MatchState, 'caravans'>): void {
  if (state.caravans) occupancyCache.delete(state.caravans);
}

/** Shipments on the map at `c` (stable order). */
export function caravansAt(state: Pick<MatchState, 'caravans'>, c: HexCoord): readonly CaravanState[] {
  return occupancy(state)?.get(hexKey(c)) ?? [];
}

/** The first shipment at `c` hostile to `playerId` (another owner's), if any. */
export function enemyCaravanAt(state: Pick<MatchState, 'caravans'>, c: HexCoord, playerId: PlayerId | null): CaravanState | undefined {
  return caravansAt(state, c).find((k) => k.ownerId !== playerId);
}

// ---------------------------------------------------------------------------
// Passability and routes
// ---------------------------------------------------------------------------

/**
 * Why a caravan of `ownerId` cannot enter `c` (null: it can). `plan`: route planning, which
 * treats as blockers only the enemy armies the owner sees now; `move`: actual movement, where
 * any enemy army standing there stops the wagon. Own heroes and caravans share tiles.
 */
export function caravanTileBlocker(catalog: ContentCatalog, state: MatchState, ownerId: PlayerId, c: HexCoord, mode: 'plan' | 'move', visible?: ReadonlySet<number>, foes?: ReadonlyMap<string, HeroState>): string | null {
  const map = state.world.map;
  if (!inMap(map, c)) return 'Outside the map';
  if (catalog.rulesProfile.terrainCost[terrainAt(map, c)] === null) return 'Caravans travel over land only';
  if (isTownTile(catalog, state, c)) return 'A town’s buildings';
  const seen = mode === 'move' || !visible || visible.has(cellIndex(map, c));
  if (seen) {
    const h = (foes ?? foeHeroIndex(state, ownerId)).get(hexKey(c));
    if (h) return h.monster ? `Wandering creatures (${h.name}) bar the road` : 'An enemy hero bars the road';
    if (enemyCaravanAt(state, c, ownerId)) return 'An enemy caravan stands on the road';
  }
  const site = siteAt(catalog, state, c);
  if (site) {
    const { def, state: st } = site;
    if (def.kind.type === 'gate' && !st.open) return `${def.name} is closed`;
    if (def.kind.type === 'key_gate' && !state.players[ownerId]?.keys?.includes(def.kind.color)) return `${def.name} needs its key`;
    if (def.kind.type === 'town' && state.towns[def.kind.townId]?.ownerId !== ownerId) return `${state.towns[def.kind.townId]?.name ?? def.name} is not yours`;
    if (def.guard && !st.cleared) return `${def.guard.label} guards ${def.name}`;
  }
  return null;
}

/** The first active hero of another player on each tile (built once per route search). */
export function foeHeroIndex(state: Pick<MatchState, 'heroes'>, ownerId: PlayerId): Map<string, HeroState> {
  const out = new Map<string, HeroState>();
  for (const h of Object.values(state.heroes).sort((a, b) => (a.id < b.id ? -1 : 1))) {
    if (h.status !== 'active' || h.ownerId === ownerId) continue;
    const k = hexKey(h.position);
    if (!out.has(k)) out.set(k, h);
  }
  return out;
}

export interface CaravanRoute {
  readonly reachable: boolean;
  /** Tiles after the start, ending at the destination town's gate. */
  readonly path: HexCoord[];
  /** Cumulative cost at each step. */
  readonly stepCosts: number[];
  readonly totalCost: number;
  readonly reason: string | null;
}

/** Min-heap of (cost, key), ties by key (the same settling order as the hero pathfinder). */
class RouteHeap {
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

/**
 * The land route a caravan of `ownerId` standing at `from` would take to its own town
 * `destinationTownId` (to the town's gate), on the owner's explored tiles. Pure; the same
 * answer for the quote, the commit and every later day's re-plan.
 */
export function planCaravanRoute(catalog: ContentCatalog, state: MatchState, ownerId: PlayerId, from: HexCoord, destinationTownId: TownId): CaravanRoute {
  const fail = (reason: string): CaravanRoute => ({ reachable: false, path: [], stepCosts: [], totalCost: 0, reason });
  const town = state.towns[destinationTownId];
  if (!town) return fail('Unknown destination');
  if (town.ownerId !== ownerId) return fail(`${town.name} is not yours`);
  const map = state.world.map;
  const dest = townGate(catalog, state, destinationTownId);
  if (hexEquals(from, dest)) return { reachable: true, path: [], stepCosts: [], totalCost: 0, reason: null };
  const fog = state.fog[ownerId];
  const explored = (c: HexCoord) => !fog || fog.explored[cellIndex(map, c)] === 1;
  if (!explored(dest)) return fail(`The way to ${town.name} is unexplored`);
  const visible = visibleCells(catalog, state, ownerId);
  const foes = foeHeroIndex(state, ownerId);
  const blocked = caravanTileBlocker(catalog, state, ownerId, dest, 'plan', visible, foes);
  if (blocked) return fail(blocked);
  const startKey = hexKey(from);
  const destKey = hexKey(dest);
  const dist = new Map<string, number>([[startKey, 0]]);
  const prev = new Map<string, string>();
  const coords = new Map<string, HexCoord>([[startKey, from]]);
  const done = new Set<string>();
  const heap = new RouteHeap();
  heap.push(0, startKey);
  for (;;) {
    const top = heap.pop();
    if (!top) break;
    const [d, key] = top;
    if (done.has(key) || d !== dist.get(key)) continue;
    if (key === destKey) break;
    done.add(key);
    const cur = coords.get(key)!;
    for (const n of axialNeighbors(cur)) {
      if (!inMap(map, n) || !explored(n)) continue;
      const nKey = hexKey(n);
      if (done.has(nKey)) continue;
      if (caravanTileBlocker(catalog, state, ownerId, n, 'plan', visible, foes)) continue;
      const c = edgeCost(catalog, map, cur, n);
      if (c === null) continue;
      const nd = d + c;
      const old = dist.get(nKey);
      if (old === undefined || nd < old) {
        dist.set(nKey, nd);
        prev.set(nKey, key);
        coords.set(nKey, n);
        heap.push(nd, nKey);
      }
    }
  }
  const total = dist.get(destKey);
  if (total === undefined) return fail(`No known land route to ${town.name}`);
  const path: HexCoord[] = [];
  for (let k: string | undefined = destKey; k && k !== startKey; k = prev.get(k)) path.unshift(coords.get(k)!);
  const stepCosts: number[] = [];
  let acc = 0;
  let at = from;
  for (const step of path) {
    acc += edgeCost(catalog, map, at, step) ?? 0;
    stepCosts.push(acc);
    at = step;
  }
  return { reachable: true, path, stepCosts, totalCost: acc, reason: null };
}

/** Cumulative costs of walking `route` from `from` (an edge that cannot be walked costs Infinity). */
export function routeStepCosts(catalog: ContentCatalog, state: MatchState, from: HexCoord, route: readonly HexCoord[]): number[] {
  const out: number[] = [];
  let acc = 0;
  let at = from;
  for (const step of route) {
    acc += edgeCost(catalog, state.world.map, at, step) ?? Infinity;
    out.push(acc);
    at = step;
  }
  return out;
}

/**
 * The turn on which each step is reached (1 = the first movement turn), with a full daily
 * budget each turn and nothing carried over. Null when a single edge costs more than a day.
 */
export function caravanStepTurns(dailyMovement: number, stepCosts: readonly number[]): number[] | null {
  const out: number[] = [];
  let turn = 1;
  let paid = 0;
  for (const cost of stepCosts) {
    if (cost - paid > dailyMovement) {
      turn += 1;
      paid = out.length > 0 ? stepCosts[out.length - 1]! : 0;
      if (cost - paid > dailyMovement) return null;
    }
    out.push(turn);
  }
  return out;
}

/** The world day of a caravan's next movement: its owner's next turn start (never the day it was dispatched or already moved). */
export function nextCaravanMoveDay(state: Pick<MatchState, 'day'>, caravan: Pick<CaravanState, 'dispatchedDay' | 'lastMovedTurn'> | null): number {
  if (!caravan) return state.day + 1;
  return caravan.dispatchedDay >= state.day || caravan.lastMovedTurn >= state.day ? state.day + 1 : state.day;
}

/** The arrival day of a route walked from `firstMoveDay` (null: no route, or an edge longer than a day). Zero steps: that day. */
export function caravanEtaDay(policy: CaravanPolicy, stepCosts: readonly number[], firstMoveDay: number): number | null {
  if (stepCosts.length === 0) return firstMoveDay;
  const turns = caravanStepTurns(policy.dailyMovement, stepCosts);
  return turns ? firstMoveDay + turns[turns.length - 1]! - 1 : null;
}

/** A shipment's expected arrival day on its saved route (null: held, or no route). */
export function caravanEta(catalog: ContentCatalog, state: MatchState, caravan: CaravanState): number | null {
  const policy = activeCaravanPolicy(catalog, state);
  if (!policy || !CARAVAN_ON_MAP.has(caravan.status) || caravan.status === 'blocked' || caravan.status === 'awaiting_garrison') return null;
  return caravanEtaDay(policy, routeStepCosts(catalog, state, caravan.coord, caravan.route), nextCaravanMoveDay(state, caravan));
}

/** The cargo as battle stacks (the defenders of an interception; slot = cargo index). */
export function caravanDefenders(caravan: CaravanState): { spec: StackSpec; slot: number }[] {
  return caravan.cargo.flatMap((s, slot) => (s.count > 0 ? [{ spec: { creatureId: s.creatureId, count: s.count }, slot }] : []));
}

/** Total creatures in a cargo. */
export function cargoCount(cargo: readonly Pick<CreatureStackState, 'count'>[]): number {
  return cargo.reduce((n, s) => n + Math.max(0, s.count), 0);
}

/** Words for a hold reason (notices, tracker). */
export function caravanBlockMessage(reason: CaravanState['blockedReason'], detail?: string | null): string {
  switch (reason) {
    case 'route_blocked':
      return detail ? `Held on the road: ${detail}` : 'Held on the road: something blocks the way';
    case 'no_route':
      return detail ? `Held: ${detail}` : 'Held: no known land route';
    case 'destination_lost':
      return detail ?? 'Held: the destination is no longer yours — choose another town';
    case 'garrison_full':
      return detail ?? 'Waiting at the gate: the garrison has no room for the whole shipment';
    default:
      return '';
  }
}

// ---------------------------------------------------------------------------
// What another player may know of a caravan it sees (scouting intel)
// ---------------------------------------------------------------------------

export interface CaravanIntel {
  readonly caravanId: string;
  readonly ownerId: PlayerId;
  readonly coord: HexCoord;
  readonly stage: ArmyIntelStage;
  /** Strength band (policy index); null with scouting intel off. */
  readonly strengthBand: number | null;
  /** The cargo lines the stage permits (null at sighting): exact counts only at `full`. */
  readonly creatures: readonly ArmyIntelLine[] | null;
  /** Own shipments only: the destination (another player never learns where a wagon goes). */
  readonly destinationTownId: TownId | null;
}

/**
 * What `viewerId` may know right now of `caravan` — the same stages and policy as an enemy
 * army (`armyIntel`): own shipments in full; another player's only while it stands in the
 * viewer's current vision, at the observation stage of its tile (sighting: owner and strength
 * band; identified: creature types; scouted: quantity ranges). Never its route, source or
 * destination. With scouting intel off: full cargo of a visible caravan (the legacy rule).
 */
export function caravanIntel(catalog: ContentCatalog, state: MatchState, viewerId: PlayerId, caravan: CaravanState, vision?: IntelVision): CaravanIntel | null {
  if (!CARAVAN_ON_MAP.has(caravan.status)) return null;
  const own = intelFriendly(state, viewerId, caravan.ownerId);
  const policy = activeIntelPolicy(catalog, state);
  const full = (): CaravanIntel => ({
    caravanId: caravan.id,
    ownerId: caravan.ownerId,
    coord: { ...caravan.coord },
    stage: 'full',
    strengthBand: policy ? intelStrengthBand(policy, armyGoldValue(catalog, caravan.cargo)) : null,
    creatures: caravan.cargo.filter((s) => s.count > 0).map((s) => ({ creatureId: s.creatureId, count: s.count })),
    destinationTownId: own ? caravan.destinationTownId : null,
  });
  if (own) return full();
  const v = vision ?? intelVision(catalog, state, viewerId);
  if (!v.visible.has(cellIndex(state.world.map, caravan.coord))) return null;
  if (!policy) return full();
  const stage = observationStage(policy, state.world.map, v, caravan.coord);
  if (!stage) return null;
  const grouped = groupedCreatures(catalog, caravan.cargo);
  return {
    caravanId: caravan.id,
    ownerId: caravan.ownerId,
    coord: { ...caravan.coord },
    stage,
    strengthBand: intelStrengthBand(policy, armyGoldValue(catalog, caravan.cargo)),
    creatures: stage === 'sighting' ? null : stage === 'scouted' ? grouped.map((g) => ({ creatureId: g.creatureId, range: intelCountRange(policy, g.count) })) : grouped.map((g) => ({ creatureId: g.creatureId })),
    destinationTownId: null,
  };
}
