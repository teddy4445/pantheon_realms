import type { ContentCatalog } from '../definitions/catalog';
import type { AdventureStepDiscount } from '../definitions/logic';
import type { HeroState, MatchState } from '../state/match';
import { axialNeighbors, edgeKey, hexKey, type HexCoord } from '../core/hex';
import { heroEffects, movementBudget } from './heroes';
import { navalRules } from '../definitions/naval';
import { cellIndex, edgeCost, heroOccupancy, inMap, KeyHeap, roadSet, terrainAt, tileRole, townGate, type PathResult } from './world';

export type MovementLedger = NonNullable<NonNullable<HeroState['libraryAdventure']>['movementLedger']>;
type Rule = AdventureStepDiscount & { townDistances?: Map<string, number> };
export function movementLedger(hero: HeroState, day: number): MovementLedger {
  const old = hero.libraryAdventure?.movementLedger;
  return old?.day === day ? { day, uses: { ...old.uses }, saved: { ...old.saved }, triggers: { ...old.triggers } } : { day, uses: {}, saved: {}, triggers: {} };
}
/** Reverse legal land distances for Pilgrimage; no unknown cells or encounter shortcuts. */
function townDistances(catalog: ContentCatalog, state: MatchState, hero: HeroState, townId: string): Map<string, number> {
  const dist = new Map<string, number>(), town = state.towns[townId];
  if (town?.ownerId !== hero.ownerId) return dist;
  const gate = townGate(catalog, state, townId), heap = new KeyHeap(), occupancy = heroOccupancy(state, hero.id);
  dist.set(hexKey(gate), 0); heap.push(0, hexKey(gate));
  const coords = new Map([[hexKey(gate), gate]]);
  for (;;) {
    const top = heap.pop(); if (!top) break;
    const [d, k] = top; if (d !== dist.get(k)) continue;
    const c = coords.get(k)!;
    for (const n of axialNeighbors(c)) {
      if (!inMap(state.world.map, n) || state.fog[hero.ownerId]?.explored[cellIndex(state.world.map, n)] !== 1) continue;
      if (hexKey(n) !== hexKey(hero.position) && tileRole(catalog, state, hero.ownerId, n, hero.id, occupancy) !== 'open') continue;
      const cost = edgeCost(catalog, state.world.map, n, c); if (cost === null) continue;
      const nk = hexKey(n), nd = d + cost;
      if (nd < (dist.get(nk) ?? Infinity)) { dist.set(nk, nd); coords.set(nk, n); heap.push(nd, nk); }
    }
  }
  return dist;
}
export function movementRules(catalog: ContentCatalog, state: MatchState, hero: HeroState, day = state.day): Rule[] {
  if (!state.scenario.features?.mythicLibraryV2) return [];
  const rules: Rule[] = heroEffects(catalog, hero, state).filter((e): e is Extract<typeof e, { type: 'adventure_step_discount' }> => e.type === 'adventure_step_discount');
  for (const buff of hero.libraryAdventure?.travelBuffs ?? []) if (buff.day === day) rules.push({ ...buff.discount, ...(buff.townId ? { townDistances: townDistances(catalog, state, hero, buff.townId) } : {}) });
  return rules.sort((a, b) => a.key.localeCompare(b.key));
}
export interface MovementPricing {
  readonly rules: readonly Rule[];
  readonly staticSeaPercent: number;
  readonly townGates: ReadonlySet<string>;
  readonly catalog: ContentCatalog;
  readonly state: MatchState;
}
export function movementPricing(catalog: ContentCatalog, state: MatchState, hero: HeroState, day = state.day): MovementPricing {
  const staticSeaPercent = Math.min(30, heroEffects(catalog, hero, state).reduce((n, e) => n + (e.type === 'adventure_sailing_discount' ? e.percent : 0), 0));
  return { catalog, state, rules: movementRules(catalog, state, hero, day), staticSeaPercent, townGates: new Set(Object.values(state.towns).filter((t) => t.ownerId === hero.ownerId).map((t) => hexKey(townGate(catalog, state, t.id)))) };
}
export function priceMovementStep(p: MovementPricing, ledger: MovementLedger, from: HexCoord, to: HexCoord, mode: 'land' | 'sea'): { cost: number; ledger: MovementLedger } {
  const next: MovementLedger = { day: ledger.day, uses: { ...ledger.uses }, saved: { ...ledger.saved }, triggers: { ...ledger.triggers } };
  if (mode === 'land' && p.townGates.has(hexKey(from))) next.triggers.town_exit = true;
  const map = p.state.world.map, ground = terrainAt(map, to), road = mode === 'land' && roadSet(map).has(edgeKey(from, to));
  const desert = !!map.desertCells?.includes(cellIndex(map, to));
  const base = mode === 'sea' ? navalRules(p.catalog.rulesProfile).sailCost : edgeCost(p.catalog, map, from, to) ?? Infinity;
  const surcharge = mode === 'land' && !road ? Math.max(0, base - (p.catalog.rulesProfile.terrainCost.plains ?? 100)) : 0;
  const applicable = p.rules.filter((r) => {
    if (r.trigger && !next.triggers[r.trigger]) return false;
    if ((next.uses[r.key] ?? 0) >= (r.steps ?? Infinity) || (next.saved[r.key] ?? 0) >= (r.cap ?? Infinity)) return false;
    if (r.townDistances && !((r.townDistances.get(hexKey(to)) ?? Infinity) < (r.townDistances.get(hexKey(from)) ?? Infinity))) return false;
    if (r.terrain === 'sea') return mode === 'sea';
    if (mode !== 'land') return false;
    if (r.trigger === 'landing') return true; // next two land steps, including plain/road steps
    if (r.terrain === 'road') return road;
    if (road) return false;
    return r.terrain === 'rough' ? ground === 'rough' : r.terrain === 'desert' ? desert : r.terrain === 'marsh_desert' ? ground === 'marsh' || desert : r.terrain === 'forest_marsh' ? ground === 'forest' || ground === 'marsh' : ground === 'forest';
  });
  const room = (r: Rule) => Math.max(0, (r.cap ?? Infinity) - (next.saved[r.key] ?? 0));
  let waiver = 0, winner: Rule | undefined;
  for (const r of applicable.filter((r) => r.mode === 'surcharge')) {
    const amount = r.trigger === 'landing' && ground !== 'rough' ? 0 : Math.min(room(r), Math.floor(surcharge * r.percent / 100));
    if (amount > waiver) { waiver = amount; winner = r; }
  }
  if (winner) next.saved[winner.key] = (next.saved[winner.key] ?? 0) + waiver;
  const after = base - waiver, fixedPercent = mode === 'sea' ? p.staticSeaPercent : 0;
  const percentRules = applicable.filter((r) => r.mode === 'percent');
  let raw = after * fixedPercent, saved = Math.floor(raw / 100);
  for (const r of percentRules) {
    raw = Math.min(after * 30, raw + Math.min(room(r) * 100, after * r.percent));
    const amount = Math.max(0, Math.floor(raw / 100) - saved);
    saved += amount; next.saved[r.key] = (next.saved[r.key] ?? 0) + amount;
  }
  for (const r of applicable) next.uses[r.key] = (next.uses[r.key] ?? 0) + 1;
  return { cost: Math.max(1, after - saved), ledger: next };
}
export function priceMovementPath(p: MovementPricing, initial: MovementLedger, from: HexCoord, path: readonly HexCoord[], mode: 'land' | 'sea') {
  let ledger = initial, cost = 0, prev = from;
  const stepCosts: number[] = [];
  for (const to of path) { const q = priceMovementStep(p, ledger, prev, to, mode); cost += q.cost; ledger = q.ledger; stepCosts.push(cost); prev = to; }
  return { cost, ledger, stepCosts };
}
interface Label { coord: HexCoord; cost: number; ledger: MovementLedger; prev?: Label; dead?: boolean }
export interface LibraryPathTree { best: Map<string, Label> }
/** Multi-label Dijkstra: a cheaper path that used more daily discount cannot discard a longer path preserving it. */
export function libraryLandTree(p: MovementPricing, hero: HeroState, dest: HexCoord | null, budget = Infinity): LibraryPathTree {
  const initial: Label = { coord: hero.position, cost: 0, ledger: movementLedger(hero, p.state.day) };
  const labels = new Map<string, Label[]>([[hexKey(hero.position), [initial]]]), best = new Map<string, Label>();
  const heap = new KeyHeap(), all: Label[] = [initial], occupancy = heroOccupancy(p.state, hero.id);
  heap.push(0, '0000000000');
  const destKey = dest ? hexKey(dest) : null, startKey = hexKey(hero.position);
  const dominates = (a: Label, b: Label) => a.cost <= b.cost && p.rules.every((r) => (a.ledger.uses[r.key] ?? 0) <= (b.ledger.uses[r.key] ?? 0) && (a.ledger.saved[r.key] ?? 0) <= (b.ledger.saved[r.key] ?? 0)) && ['town_exit', 'landing'].every((k) => !!a.ledger.triggers[k] === !!b.ledger.triggers[k]);
  for (;;) {
    const top = heap.pop(); if (!top) break;
    const node = all[Number(top[1])]!; if (node.dead) continue;
    const key = hexKey(node.coord);
    if (!best.has(key)) best.set(key, node);
    if (key === destKey) break;
    if (key !== startKey && tileRole(p.catalog, p.state, hero.ownerId, node.coord, hero.id, occupancy) !== 'open') continue;
    for (const n of axialNeighbors(node.coord)) {
      if (!inMap(p.state.world.map, n) || p.state.fog[hero.ownerId]?.explored[cellIndex(p.state.world.map, n)] !== 1) continue;
      const role = tileRole(p.catalog, p.state, hero.ownerId, n, hero.id, occupancy), nk = hexKey(n);
      if (role === 'blocked' || (role !== 'open' && destKey && nk !== destKey)) continue;
      const step = priceMovementStep(p, node.ledger, node.coord, n, 'land'), cost = node.cost + step.cost;
      if (cost > budget) continue;
      const next: Label = { coord: n, cost, ledger: step.ledger, prev: node }, others = labels.get(nk) ?? [];
      if (others.some((x) => !x.dead && dominates(x, next))) continue;
      for (const x of others) if (dominates(next, x)) x.dead = true;
      labels.set(nk, [...others.filter((x) => !x.dead), next]);
      const id = all.length; all.push(next); heap.push(cost, String(id).padStart(10, '0'));
    }
  }
  return { best };
}
export function libraryPathResult(tree: LibraryPathTree, dest: HexCoord, encounter: boolean): PathResult {
  const end = tree.best.get(hexKey(dest));
  if (!end) return { reachable: false, path: [], stepCosts: [], totalCost: 0, endsInEncounter: false, reason: 'No known route' };
  const chain: Label[] = []; let n: Label | undefined = end;
  while (n?.prev) { chain.unshift(n); n = n.prev; }
  return { reachable: true, path: chain.map((x) => x.coord), stepCosts: chain.map((x) => x.cost), totalCost: end.cost, endsInEncounter: encounter, reason: null };
}

/** Read-only day simulation for route markers; every dawn expires spells and resets item quotas. */
export function libraryTravelClock(catalog: ContentCatalog, state: MatchState, hero: HeroState) {
  const budget = movementBudget(catalog, state, hero).total;
  let day = state.day, points = hero.movementPoints, ledger = movementLedger(hero, day), pricing = movementPricing(catalog, state, hero, day);
  let keelUsedDay = hero.libraryAdventure?.usedDays?.keel ?? -1, landingUsed = false;
  const dawn = () => { day++; points = budget; ledger = { day, uses: {}, saved: {}, triggers: {} }; pricing = movementPricing(catalog, state, hero, day); };
  return {
    get days() { return day - state.day + 1; },
    step(from: HexCoord, to: HexCoord, mode: 'land' | 'sea') {
      let q = priceMovementStep(pricing, ledger, from, to, mode);
      if (q.cost > points) { dawn(); q = priceMovementStep(pricing, ledger, from, to, mode); }
      if (q.cost > points || !Number.isFinite(q.cost)) return false;
      points -= q.cost; ledger = q.ledger; return true;
    },
    transition(kind: 'embark' | 'disembark', ownedShip: boolean) {
      const canUseKeel = () => kind === 'embark' && ownedShip && keelUsedDay !== day && heroEffects(catalog, hero, state).some((e) => e.type === 'adventure_embark_discount');
      let keel = canUseKeel(), cost = keel ? catalog.rulesProfile.terrainCost.plains! : catalog.rulesProfile.terrainCost.plains!;
      if (points < cost) { dawn(); keel = canUseKeel(); cost = keel ? catalog.rulesProfile.terrainCost.plains! : catalog.rulesProfile.terrainCost.plains!; }
      if (points < cost) return false;
      const blessing = hero.libraryAdventure?.safeLanding;
      if (keel) { points -= cost; keelUsedDay = day; }
      else if (kind === 'disembark' && !landingUsed && blessing && blessing.untilDay > day && blessing.ownerId === hero.ownerId) points = Math.max(points - cost, Math.min(points, Math.floor(budget * blessing.percent / 100)));
      else points -= cost;
      if (kind === 'disembark') { ledger.triggers.landing = true; landingUsed = true; }
      return true;
    },
  };
}
