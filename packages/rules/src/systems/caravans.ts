/**
 * Recruitment caravans (expedition kit §06, scenario feature `recruitmentCaravansV1`;
 * design/caravan-policy.json, proposed values in `@pr/content` common/caravans.ts).
 *
 * Dispatch: `quoteCaravan` prices every line with THE recruitment quote of the source town
 * (`quoteRecruitment`: its access, its shared base/upgraded family pool and its city-dedication
 * discount — no second price list), merges identical creatures, allows at most seven stacks, adds
 * the flat transport fee once and plans the land route; `commitDispatchCaravan` re-quotes and, in
 * one transaction, spends the total, takes the creatures from the shared pools and creates the
 * shipment at the source town's gate. A refused command changes nothing (the processor works on
 * a draft).
 *
 * Movement (`processCaravanTurnStart`): at the start of each of its owner's turns — never on the
 * day it was dispatched — each shipment, in the stable order, spends the daily movement along its
 * saved route. `lastMovedTurn` and the saved turn cursor make a repeated turn start, a reload or a
 * battle in between unable to move one twice. A blocker met on the next tile, a lost destination
 * or no known route holds it where it stands (cargo safe; a reroute is offered); a held shipment
 * re-plans at its owner's next turn start. At its destination's gate its whole cargo joins the
 * garrison exactly once, or waits there (`awaiting_garrison`) until there is room.
 *
 * Interception: an enemy hero that moves onto a caravan's tile (or orders `AttackCaravan`) fights
 * its cargo as a hero-less defending army on the ordinary battlefield — no escort, commander,
 * spells or retreat. Survivors return to the shipment; when none survive it is destroyed. Nothing
 * joins the attacker and no loot is paid. Never refunded; never cancelled in this version.
 * Eliminating an owner removes its remaining shipments without loot or a refund; it will
 * never have another turn on which to move them or clean up their completed receipts.
 */
import type { HeroId, PlayerId, TownId } from '../ids';
import { axialDistance, hexEquals, type HexCoord } from '../core/hex';
import { addResources, canAfford, resources, scaleResources, shortfall, subtractResources, type ResourceBundle } from '../core/resources';
import { hashValue } from '../core/hash';
import type { ContentCatalog } from '../definitions/catalog';
import type { BattleSideId, BattleState, CaravanBlockReason, CaravanState, HeroState, MatchState } from '../state/match';
import { reject, type RejectionCode, type Tx } from '../engine/tx';
import { placementPlan } from '../resolvers/army';
import { cellIndex, edgeCost, heroAt, siteAt, townGate, visibleCells } from '../resolvers/world';
import {
  CARAVAN_ON_MAP,
  activeCaravanPolicy,
  caravanBlockMessage,
  caravanEtaDay,
  caravanList,
  caravanTileBlocker,
  enemyCaravanAt,
  invalidateCaravanIndex,
  nextCaravanMoveDay,
  planCaravanRoute,
} from '../resolvers/caravans';
import type { DedicationSaving } from './dedication';
import { sumDedicationSavings } from './dedicationServices';
import { quoteRecruitment } from './economy';
import { spend } from './economy';
import { bumpTotal } from './stats';
import { commitMoveHero, quoteMovement, revealAround, siegeTownAt } from './adventure';
import { startBattle } from './battle/factory';

// ---------------------------------------------------------------------------
// Quote
// ---------------------------------------------------------------------------

export interface CaravanItem {
  readonly creatureId: string;
  readonly count: number;
}

export interface CaravanQuoteLine {
  readonly creatureId: string;
  readonly familyId: string;
  readonly count: number;
  /** The source town's price per creature (THE recruitment quote: dedication discount included). */
  readonly unitCost: ResourceBundle;
  readonly totalCost: ResourceBundle;
  /** The family's shared weekly pool at the source (both forms draw on it). */
  readonly available: number;
  readonly dedication?: DedicationSaving;
}

/** How the cargo would join the destination garrison as it stands now. */
export interface CaravanDestinationFit {
  /** Stacks that join a stack of the same creature already there. */
  readonly merges: number;
  /** Stacks that need a free slot. */
  readonly newStacks: number;
  readonly freeSlots: number;
  /** Stack slots still missing for the whole shipment (0: it fits). */
  readonly slotsShort: number;
}

export interface CaravanQuote {
  readonly legal: boolean;
  readonly code: RejectionCode | null;
  readonly reason: string | null;
  /** One line per creature form (identical creatures merged), in the order first asked. */
  readonly lines: readonly CaravanQuoteLine[];
  readonly totalCount: number;
  /** The recruits at the source town's prices. */
  readonly recruitCost: ResourceBundle;
  /** The flat transport fee (once per shipment). */
  readonly fee: ResourceBundle;
  /** Recruits + fee: exactly what dispatching spends. */
  readonly totalCost: ResourceBundle;
  readonly shortfall: ResourceBundle;
  readonly balanceAfter: ResourceBundle;
  /** The lines' dedication savings added up. */
  readonly dedication?: DedicationSaving;
  /** Shared pool use per family: what the lines take and what the town has. */
  readonly pools: Readonly<Record<string, { readonly used: number; readonly available: number }>>;
  /** The planned land route from the source's gate to the destination's gate (empty when none). */
  readonly route: readonly HexCoord[];
  readonly stepCosts: readonly number[];
  readonly pathCost: number;
  readonly routeReason: string | null;
  /** First movement (the owner's next turn start) and the expected arrival day (null: no route). */
  readonly firstMoveDay: number;
  readonly etaDay: number | null;
  readonly destinationFit: CaravanDestinationFit | null;
  /** What the owner can see now that threatens the route (never a guarantee about hidden armies). */
  readonly risks: readonly string[];
  /** A fingerprint of the prices and route (DispatchCaravan.expectedQuoteHash). */
  readonly hash: string;
}

/** Identical creatures merged into one line each, in the order first asked (counts summed). */
export function mergeCaravanItems(items: readonly CaravanItem[]): CaravanItem[] {
  const out = new Map<string, number>();
  for (const it of items) out.set(it.creatureId, (out.get(it.creatureId) ?? 0) + it.count);
  return [...out.entries()].map(([creatureId, count]) => ({ creatureId, count }));
}

/** How `cargo` would fit into `townId`'s garrison now. */
export function caravanDestinationFit(state: MatchState, townId: TownId, cargo: readonly CaravanItem[]): CaravanDestinationFit | null {
  const town = state.towns[townId];
  if (!town) return null;
  const plan = placementPlan(town.garrison, cargo.map((c) => ({ creatureId: c.creatureId, count: c.count })));
  const merges = cargo.filter((c) => town.garrison.slots.some((s) => s?.creatureId === c.creatureId)).length;
  return {
    merges,
    newStacks: cargo.length - merges,
    freeSlots: town.garrison.slots.filter((s) => s === null).length,
    slotsShort: plan.filter((p) => p === null).length,
  };
}

/** Visible enemy armies within reach of a route (the owner's current knowledge only). */
function routeRisks(catalog: ContentCatalog, state: MatchState, ownerId: PlayerId, route: readonly HexCoord[]): string[] {
  if (route.length === 0) return [];
  const visible = visibleCells(catalog, state, ownerId);
  const map = state.world.map;
  const near = (c: HexCoord) => route.some((r) => axialDistance(r, c) <= 3);
  const out: string[] = [];
  for (const h of Object.values(state.heroes).sort((a, b) => (a.id < b.id ? -1 : 1))) {
    if (h.status !== 'active' || h.ownerId === ownerId || !visible.has(cellIndex(map, h.position)) || !near(h.position)) continue;
    out.push(h.monster ? `${h.name} roam near the route` : `An enemy hero (${state.players[h.ownerId]?.name ?? 'rival'}) was seen near the route`);
  }
  for (const k of caravanList(state)) {
    if (k.ownerId === ownerId || !CARAVAN_ON_MAP.has(k.status) || !visible.has(cellIndex(map, k.coord)) || !near(k.coord)) continue;
    out.push(`An enemy caravan (${state.players[k.ownerId]?.name ?? 'rival'}) stands near the route`);
  }
  return out;
}

/**
 * The quote for a shipment from `sourceTownId` to `destinationTownId` (pure). Every line is
 * priced and checked by `quoteRecruitment` at the source — its town ownership, dwelling access
 * and dedication discount; the shared family pools are checked over the whole shipment (both
 * forms of a family draw on one pool); the wallet must hold recruits + fee. The garrison's room
 * is only reported (`destinationFit`): a shipment that does not fit waits at the gate.
 */
export function quoteCaravan(catalog: ContentCatalog, state: MatchState, playerId: PlayerId, sourceTownId: TownId, destinationTownId: TownId, items: readonly CaravanItem[]): CaravanQuote {
  const policy = activeCaravanPolicy(catalog, state);
  const wallet = state.players[playerId]?.wallet ?? resources();
  const fee = resources(policy?.transportFee ?? {});
  const lines: CaravanQuoteLine[] = [];
  const pools: Record<string, { used: number; available: number }> = {};
  let recruitCost = resources();
  let totalCount = 0;
  let route: HexCoord[] = [];
  let stepCosts: number[] = [];
  let pathCost = 0;
  let routeReason: string | null = null;
  let etaDay: number | null = null;
  let destinationFit: CaravanDestinationFit | null = null;
  let risks: string[] = [];
  const firstMoveDay = nextCaravanMoveDay(state, null);
  const result = (code: RejectionCode | null, reason: string | null): CaravanQuote => {
    const totalCost = addResources(recruitCost, lines.length > 0 ? fee : resources());
    const dedication = sumDedicationSavings(lines.map((l) => l.dedication));
    return {
      legal: code === null,
      code,
      reason,
      lines,
      totalCount,
      recruitCost,
      fee,
      totalCost,
      shortfall: shortfall(wallet, totalCost),
      balanceAfter: subtractResources(wallet, totalCost),
      ...(dedication ? { dedication } : {}),
      pools,
      route,
      stepCosts,
      pathCost,
      routeReason,
      firstMoveDay,
      etaDay,
      destinationFit,
      risks,
      hash: hashValue({ s: sourceTownId, d: destinationTownId, l: lines.map((l) => [l.creatureId, l.count, l.unitCost]), f: fee, r: route }),
    };
  };
  if (!policy) return result('not_in_scope', 'Recruitment caravans are not part of this scenario');
  const source = state.towns[sourceTownId];
  const dest = state.towns[destinationTownId];
  if (!source || !dest) return result('not_found', 'Unknown town');
  if (source.ownerId !== playerId) return result('not_owner', `You do not own ${source.name}`);
  if (dest.ownerId !== playerId) return result('not_owner', `${dest.name} is not yours`);
  if (source.id === dest.id) return result('invalid_command', 'Choose another town as the destination');
  // The land route first (its cost and ETA are shown even before any creature is chosen).
  const plan = planCaravanRoute(catalog, state, playerId, townGate(catalog, state, source.id), dest.id);
  route = plan.path.map((c) => ({ q: c.q, r: c.r }));
  stepCosts = plan.stepCosts;
  pathCost = plan.totalCost;
  routeReason = plan.reason;
  etaDay = plan.reachable ? caravanEtaDay(policy, plan.stepCosts, firstMoveDay) : null;
  if (plan.reachable) risks = routeRisks(catalog, state, playerId, plan.path);
  for (const it of items) {
    if (!catalog.creatures[it.creatureId]) return result('not_found', 'Unknown creature');
    if (!Number.isInteger(it.count) || it.count < 1) return result('invalid_quantity', 'Choose at least one creature for each stack');
  }
  const merged = mergeCaravanItems(items);
  if (merged.length === 0) return result('invalid_quantity', 'Choose the creatures to send');
  if (merged.length > policy.maxDistinctStacks) return result('no_capacity', `A caravan carries at most ${policy.maxDistinctStacks} stacks`);
  let firstProblem: { code: RejectionCode; reason: string } | null = null;
  for (const it of merged) {
    const creature = catalog.creatures[it.creatureId]!;
    // THE recruitment quote of the source town (its garrison is only the probe's destination; its
    // room is irrelevant here: the cargo travels in its own seven stacks).
    const q = quoteRecruitment(catalog, state, playerId, source.id, creature.id, it.count, { kind: 'garrison' });
    if (!q.legal && q.code !== 'no_population' && q.code !== 'no_capacity' && q.code !== 'insufficient_resources') return result(q.code ?? 'illegal_action', q.reason ?? 'Cannot recruit');
    const pool = pools[creature.familyId] ?? (pools[creature.familyId] = { used: 0, available: source.population[creature.familyId] ?? 0 });
    pool.used += it.count;
    lines.push({ creatureId: creature.id, familyId: creature.familyId, count: it.count, unitCost: q.unitCost, totalCost: q.totalCost, available: pool.available, ...(q.dedication ? { dedication: q.dedication } : {}) });
    recruitCost = addResources(recruitCost, q.totalCost);
    totalCount += it.count;
  }
  for (const [familyId, p] of Object.entries(pools)) {
    if (p.used > p.available) {
      const fam = catalog.families[familyId];
      firstProblem ??= { code: 'no_population', reason: `Only ${p.available} ${fam?.name ?? familyId} available this week (one pool for both forms)` };
    }
  }
  destinationFit = caravanDestinationFit(state, dest.id, merged);
  if (firstProblem) return result(firstProblem.code, firstProblem.reason);
  if (!plan.reachable) return result('illegal_move', plan.reason ?? `No known land route to ${dest.name}`);
  if (etaDay === null) return result('illegal_move', 'A step of the route costs more than a day of travel');
  if (!canAfford(wallet, addResources(recruitCost, fee))) return result('insufficient_resources', 'Not enough resources for the recruits and the transport');
  return result(null, null);
}

// ---------------------------------------------------------------------------
// Dispatch
// ---------------------------------------------------------------------------

export function commitDispatchCaravan(tx: Tx, sourceTownId: TownId, destinationTownId: TownId, items: readonly CaravanItem[], expectedQuoteHash?: string): void {
  const q = quoteCaravan(tx.catalog, tx.state, tx.actorId, sourceTownId, destinationTownId, items);
  if (!q.legal) reject(q.code ?? 'illegal_action', q.reason ?? 'Cannot dispatch this caravan');
  if (expectedQuoteHash !== undefined && expectedQuoteHash !== q.hash) reject('stale_revision', 'The price or the route changed — check the shipment again');
  const state = tx.state;
  const source = state.towns[sourceTownId]!;
  const dest = state.towns[destinationTownId]!;
  spend(tx, tx.actorId, q.totalCost, `Caravan from ${source.name} to ${dest.name}`);
  for (const line of q.lines) {
    source.population[line.familyId] = (source.population[line.familyId] ?? 0) - line.count;
    const counterKey = `recruited:${line.familyId}`;
    state.mission.counters[counterKey] = (state.mission.counters[counterKey] ?? 0) + line.count;
    tx.emit({ kind: 'UnitsRecruited', townId: source.id, creatureId: line.creatureId, quantity: line.count, destination: `Caravan to ${dest.name}` });
  }
  bumpTotal(state, tx.actorId, 'creaturesRecruited', q.totalCount);
  const id = tx.nextId('caravan');
  const caravan: CaravanState = {
    id,
    ownerId: tx.actorId,
    sourceTownId: source.id,
    destinationTownId: dest.id,
    coord: { ...townGate(tx.catalog, state, source.id) },
    route: q.route.map((c) => ({ q: c.q, r: c.r })),
    cargo: q.lines.map((l) => ({ stackId: tx.nextId('stack'), creatureId: l.creatureId, count: l.count })),
    status: 'queued',
    blockedReason: null,
    dispatchedDay: state.day,
    lastMovedTurn: 0,
    deliveryApplied: false,
    pendingBattleId: null,
    resumeStatus: null,
    paid: q.totalCost,
    endedDay: null,
    seq: state.serial,
  };
  state.caravans = { ...(state.caravans ?? {}), [id]: caravan };
  invalidateCaravanIndex(state);
  tx.emit({
    kind: 'CaravanDispatched',
    caravanId: id,
    playerId: tx.actorId,
    sourceTownId: source.id,
    destinationTownId: dest.id,
    cargo: q.lines.map((l) => ({ creatureId: l.creatureId, count: l.count })),
    cost: q.recruitCost,
    fee: q.fee,
    etaDay: q.etaDay,
  });
}

// ---------------------------------------------------------------------------
// Turn start: movement and delivery
// ---------------------------------------------------------------------------

const cargoLines = (c: CaravanState) => c.cargo.filter((s) => s.count > 0).map((s) => ({ creatureId: s.creatureId, count: s.count }));

/** Hold a shipment where it stands (notice only when its hold changes). */
function hold(tx: Tx, c: CaravanState, reason: CaravanBlockReason, detail: string | null): void {
  const status = reason === 'garrison_full' ? 'awaiting_garrison' : 'blocked';
  const changed = c.status !== status || c.blockedReason !== reason;
  c.status = status;
  c.blockedReason = reason;
  invalidateCaravanIndex(tx.state);
  if (changed) tx.emit({ kind: 'CaravanBlocked', caravanId: c.id, playerId: c.ownerId, reason, message: caravanBlockMessage(reason, detail), coord: { ...c.coord } });
}

/** Merge the whole cargo into the destination garrison (once), or wait at the gate for room. */
function deliver(tx: Tx, c: CaravanState): void {
  if (c.deliveryApplied) return;
  const state = tx.state;
  const town = state.towns[c.destinationTownId];
  if (!town || town.ownerId !== c.ownerId) {
    hold(tx, c, 'destination_lost', `${town?.name ?? 'The destination'} is no longer yours — choose another town`);
    return;
  }
  const lines = cargoLines(c);
  const plan = placementPlan(town.garrison, lines);
  const short = plan.filter((p) => p === null).length;
  if (short > 0) {
    hold(tx, c, 'garrison_full', `Waiting at ${town.name}: its garrison needs ${short} more free stack ${short === 1 ? 'slot' : 'slots'} for the whole shipment`);
    return;
  }
  if (!tx.applyOnce(`caravan_delivery:${c.id}`)) return;
  lines.forEach((l, i) => {
    const slot = plan[i]!;
    const there = town.garrison.slots[slot];
    if (there) there.count += l.count;
    else town.garrison.slots[slot] = { stackId: tx.nextId('stack'), creatureId: l.creatureId, count: l.count };
  });
  c.deliveryApplied = true;
  c.status = 'delivered';
  c.blockedReason = null;
  c.route = [];
  c.endedDay = state.day;
  invalidateCaravanIndex(state);
  tx.emit({ kind: 'CaravanDelivered', caravanId: c.id, playerId: c.ownerId, townId: town.id, sourceTownId: c.sourceTownId, cargo: lines, dispatchedDay: c.dispatchedDay, day: state.day });
}

/** One shipment's turn: revalidate, re-plan when held, walk its daily movement, deliver at the gate. */
function stepCaravan(tx: Tx, c: CaravanState, dailyMovement: number, visionRadius: number): void {
  const state = tx.state;
  const town = state.towns[c.destinationTownId];
  if (!town || town.ownerId !== c.ownerId) {
    hold(tx, c, 'destination_lost', `${town?.name ?? 'The destination'} is no longer yours — choose another town`);
    return;
  }
  const gate = townGate(tx.catalog, state, town.id);
  if (hexEquals(c.coord, gate)) {
    deliver(tx, c);
    return;
  }
  const last = c.route[c.route.length - 1];
  if (c.status === 'blocked' || !last || !hexEquals(last, gate)) {
    const plan = planCaravanRoute(tx.catalog, state, c.ownerId, c.coord, town.id);
    if (!plan.reachable) {
      hold(tx, c, 'no_route', plan.reason);
      return;
    }
    c.route = plan.path.map((p) => ({ q: p.q, r: p.r }));
  }
  c.status = 'travelling';
  c.blockedReason = null;
  const map = state.world.map;
  const path: HexCoord[] = [];
  let spent = 0;
  let blocker: string | null = null;
  while (c.route.length > 0) {
    const step = c.route[0]!;
    // One-hex vision: the wagon notices a blocker on the next tile and stops before it.
    blocker = caravanTileBlocker(tx.catalog, state, c.ownerId, step, 'move');
    if (blocker) break;
    const cost = edgeCost(tx.catalog, map, c.coord, step);
    if (cost === null) {
      blocker = 'The road ahead cannot be travelled';
      break;
    }
    if (spent + cost > dailyMovement) break;
    spent += cost;
    c.coord = { q: step.q, r: step.r };
    c.route.shift();
    path.push({ q: step.q, r: step.r });
    invalidateCaravanIndex(state);
  }
  if (path.length > 0) {
    revealAround(tx, c.ownerId, path, visionRadius);
    tx.emit({ kind: 'CaravanMoved', caravanId: c.id, playerId: c.ownerId, path, cost: spent, remaining: c.route.length });
  }
  if (blocker) {
    hold(tx, c, 'route_blocked', blocker);
    return;
  }
  if (c.route.length === 0 && hexEquals(c.coord, gate)) deliver(tx, c);
}

/**
 * The caravan step of `playerId`'s turn start (called by EndTurn as the turn passes). Final
 * shipments from earlier days are removed; every other shipment of the owner moves once, in the
 * stable order, unless it was dispatched today, already moved this turn or is in a battle. The
 * saved cursor makes a second call for the same turn do nothing.
 */
export function processCaravanTurnStart(tx: Tx, playerId: PlayerId): void {
  const state = tx.state;
  const policy = activeCaravanPolicy(tx.catalog, state);
  if (!policy || !state.caravans) return;
  const day = state.day;
  const cursor = state.caravanTurn;
  if (cursor && cursor.day === day && cursor.playerId === playerId && cursor.complete) return;
  const resumeAfter = cursor && cursor.day === day && cursor.playerId === playerId ? cursor.lastCaravanId : null;
  const turn = { day, playerId, lastCaravanId: resumeAfter, complete: false };
  state.caravanTurn = turn;
  // Receipts of earlier days are done: delivered and destroyed shipments leave the record.
  for (const c of caravanList(state, playerId)) {
    if ((c.status === 'delivered' || c.status === 'destroyed') && (c.endedDay ?? 0) < day) delete state.caravans[c.id];
  }
  invalidateCaravanIndex(state);
  const list = caravanList(state, playerId);
  // Resume after the last one handled (a cursor naming a shipment no longer listed resumes from the start).
  let skipping = resumeAfter !== null && list.some((c) => c.id === resumeAfter);
  for (const c of list) {
    if (skipping) {
      if (c.id === resumeAfter) skipping = false;
      continue;
    }
    if (CARAVAN_ON_MAP.has(c.status) && c.status !== 'intercepted' && c.lastMovedTurn < day && c.dispatchedDay < day) {
      stepCaravan(tx, c, policy.dailyMovement, policy.visionRadius);
      c.lastMovedTurn = day;
    }
    turn.lastCaravanId = c.id;
  }
  turn.complete = true;
}

// ---------------------------------------------------------------------------
// Reroute
// ---------------------------------------------------------------------------

export interface CaravanRerouteQuote {
  readonly legal: boolean;
  readonly code: RejectionCode | null;
  readonly reason: string | null;
  readonly route: readonly HexCoord[];
  readonly pathCost: number;
  readonly etaDay: number | null;
}

/** Can `caravanId` be sent to `destinationTownId` now (no charge)? Pure. Its own held destination again: retry now. */
export function quoteCaravanReroute(catalog: ContentCatalog, state: MatchState, playerId: PlayerId, caravanId: string, destinationTownId: TownId): CaravanRerouteQuote {
  const policy = activeCaravanPolicy(catalog, state);
  const fail = (code: RejectionCode, reason: string, extra: Partial<CaravanRerouteQuote> = {}): CaravanRerouteQuote => ({ legal: false, code, reason, route: [], pathCost: 0, etaDay: null, ...extra });
  if (!policy) return fail('not_in_scope', 'Recruitment caravans are not part of this scenario');
  const c = state.caravans?.[caravanId];
  if (!c || !CARAVAN_ON_MAP.has(c.status)) return fail('not_found', 'That caravan is no longer on the road');
  if (c.ownerId !== playerId) return fail('not_owner', 'Not your caravan');
  if (c.status === 'intercepted') return fail('illegal_action', 'The caravan is under attack');
  const town = state.towns[destinationTownId];
  if (!town) return fail('not_found', 'Unknown town');
  if (town.ownerId !== playerId) return fail('not_owner', `${town.name} is not yours`);
  const held = c.status === 'blocked' || c.status === 'awaiting_garrison';
  if (destinationTownId === c.destinationTownId && !held) return fail('already_done', `Already bound for ${town.name}`);
  const plan = planCaravanRoute(catalog, state, playerId, c.coord, town.id);
  if (!plan.reachable) return fail('illegal_move', plan.reason ?? `No known land route to ${town.name}`);
  const etaDay = caravanEtaDay(policy, plan.stepCosts, nextCaravanMoveDay(state, c));
  if (etaDay === null) return fail('illegal_move', 'A step of the route costs more than a day of travel');
  return { legal: true, code: null, reason: null, route: plan.path, pathCost: plan.totalCost, etaDay };
}

export function commitRerouteCaravan(tx: Tx, caravanId: string, destinationTownId: TownId): void {
  const q = quoteCaravanReroute(tx.catalog, tx.state, tx.actorId, caravanId, destinationTownId);
  if (!q.legal) reject(q.code ?? 'illegal_action', q.reason ?? 'Cannot reroute this caravan');
  const c = tx.state.caravans![caravanId]!;
  const from = c.destinationTownId;
  c.destinationTownId = destinationTownId;
  c.route = q.route.map((p) => ({ q: p.q, r: p.r }));
  c.blockedReason = null;
  c.status = c.lastMovedTurn === 0 ? 'queued' : 'travelling';
  invalidateCaravanIndex(tx.state);
  tx.emit({ kind: 'CaravanRerouted', caravanId, playerId: c.ownerId, fromTownId: from, toTownId: destinationTownId, etaDay: q.etaDay });
  // Already standing at the new destination's gate (or waiting at its own): it hands over at once if there is room.
  if (c.route.length === 0) deliver(tx, c);
}

// ---------------------------------------------------------------------------
// Interception
// ---------------------------------------------------------------------------

/** The encounter label of an enemy caravan (never its destination). */
export function caravanEncounterLabel(state: MatchState, c: CaravanState): string {
  return `${state.players[c.ownerId]?.name ?? 'A rival'}’s caravan`;
}

/** Begin the battle against the caravan at `dest` (called by the adventure encounter). */
export function startCaravanInterception(tx: Tx, hero: HeroState, caravan: CaravanState, dest: HexCoord): void {
  const battle = startBattle(tx, { attackerHeroId: hero.id, kind: 'caravan_intercept', siteId: null, defenderHeroId: null, caravanId: caravan.id, destination: dest });
  caravan.resumeStatus = caravan.status;
  caravan.status = 'intercepted';
  caravan.pendingBattleId = battle.battleId;
  invalidateCaravanIndex(tx.state);
  tx.emit({ kind: 'CaravanIntercepted', caravanId: caravan.id, playerId: caravan.ownerId, attackerHeroId: hero.id, battleId: battle.battleId });
}

/** Why `heroId` cannot attack `caravanId` now (null: it can, today). Pure. */
export function caravanAttackProblem(catalog: ContentCatalog, state: MatchState, playerId: PlayerId, heroId: HeroId, caravanId: string): { code: RejectionCode; reason: string } | null {
  const hero = state.heroes[heroId];
  if (!hero || hero.ownerId !== playerId) return { code: 'not_owner', reason: 'Not your hero' };
  if (hero.status !== 'active') return { code: 'illegal_action', reason: `${hero.name} cannot move` };
  if (!activeCaravanPolicy(catalog, state)) return { code: 'not_in_scope', reason: 'Recruitment caravans are not part of this scenario' };
  const c = state.caravans?.[caravanId];
  if (!c || !CARAVAN_ON_MAP.has(c.status)) return { code: 'not_found', reason: 'That caravan is no longer on the road' };
  if (c.ownerId === hero.ownerId) return { code: 'illegal_target', reason: 'That caravan is yours' };
  if (c.status === 'intercepted') return { code: 'illegal_action', reason: 'That caravan is already under attack' };
  if (!visibleCells(catalog, state, playerId).has(cellIndex(state.world.map, c.coord))) return { code: 'illegal_target', reason: 'You cannot see that caravan' };
  const guard = heroAt(state, c.coord, hero.id);
  if (guard) return { code: 'illegal_target', reason: `${guard.name} guards that caravan: attack the hero first` };
  const site = siteAt(catalog, state, c.coord);
  const town = site ? siegeTownAt(catalog, state, site, hero.ownerId) : null;
  if (town) return { code: 'illegal_target', reason: `The caravan waits at ${town.name}’s gate: besiege the town` };
  if (enemyCaravanAt(state, c.coord, hero.ownerId)?.id !== c.id) return { code: 'illegal_target', reason: 'Another caravan stands in front of it' };
  const q = quoteMovement(catalog, state, heroId, c.coord);
  if (!q.reachable || !q.endsInEncounter) return { code: 'illegal_move', reason: q.reason ?? `${hero.name} has no route to the caravan` };
  if (q.stopIndex !== q.path.length - 1) return { code: 'insufficient_movement', reason: `${hero.name} cannot reach the caravan today` };
  return null;
}

export function commitAttackCaravan(tx: Tx, heroId: HeroId, caravanId: string): void {
  const problem = caravanAttackProblem(tx.catalog, tx.state, tx.actorId, heroId, caravanId);
  if (problem) reject(problem.code, problem.reason);
  const c = tx.state.caravans![caravanId]!;
  // The same encounter as moving onto its tile: approach, pay the last edge, fight.
  commitMoveHero(tx, heroId, { q: c.coord.q, r: c.coord.r }, true, 'fight');
}

/**
 * After an interception battle (battle/resolution.ts): the defending cargo's survivors return to
 * the shipment, which resumes where it stands; when none survive (or the attacker won) it is
 * destroyed. Nothing joins the attacker; no loot.
 */
export function settleCaravanInterception(tx: Tx, battle: BattleState, winner: BattleSideId, survivors: (s: BattleState['stacks'][string]) => number): void {
  const id = battle.encounter.caravanId;
  const c = id ? tx.state.caravans?.[id] : undefined;
  if (!c || c.status !== 'intercepted') return;
  const before = cargoLines(c);
  const alive = new Map<number, number>();
  for (const s of Object.values(battle.stacks)) if (s.side === 'defender') alive.set(s.sourceSlot, winner === 'defender' ? Math.max(0, survivors(s)) : 0);
  c.cargo = c.cargo.map((st, i) => ({ ...st, count: alive.has(i) ? alive.get(i)! : winner === 'defender' ? st.count : 0 })).filter((st) => st.count > 0);
  c.pendingBattleId = null;
  const attackerHeroId = battle.encounter.attackerHeroId;
  if (c.cargo.length === 0) {
    c.status = 'destroyed';
    c.route = [];
    c.blockedReason = null;
    c.resumeStatus = null;
    c.endedDay = tx.state.day;
    invalidateCaravanIndex(tx.state);
    tx.emit({ kind: 'CaravanInterceptionResolved', caravanId: c.id, playerId: c.ownerId, attackerHeroId, survived: false, cargo: [] });
    tx.emit({ kind: 'CaravanDestroyed', caravanId: c.id, playerId: c.ownerId, byHeroId: attackerHeroId, lost: before });
    return;
  }
  c.status = c.resumeStatus && c.resumeStatus !== 'intercepted' ? c.resumeStatus : 'travelling';
  c.resumeStatus = null;
  invalidateCaravanIndex(tx.state);
  tx.emit({ kind: 'CaravanInterceptionResolved', caravanId: c.id, playerId: c.ownerId, attackerHeroId, survived: true, cargo: cargoLines(c) });
}

/** The cost of `count` creatures of `creatureId` at `townId` for `playerId` (THE recruitment price; tests and the interface). */
export function caravanLineCost(catalog: ContentCatalog, state: MatchState, playerId: PlayerId, townId: TownId, creatureId: string, count: number): ResourceBundle {
  return scaleResources(quoteRecruitment(catalog, state, playerId, townId, creatureId, 1, { kind: 'garrison' }).unitCost, count);
}

/** Also recovers frozen shipments in older running saves. Removal makes this idempotent. */
export function removeEliminatedCaravans(tx: Tx, playerId: PlayerId): void {
  const state = tx.state;
  if (!state.players[playerId]?.eliminated) return;
  for (const c of caravanList(state, playerId)) {
    if (CARAVAN_ON_MAP.has(c.status)) {
      tx.emit({ kind: 'CaravanDestroyed', caravanId: c.id, playerId, byHeroId: null, lost: cargoLines(c) });
    }
    // No final-state receipt in the map record: an eliminated owner has no next turn.
    delete state.caravans![c.id];
  }
  if (state.caravanTurn?.playerId === playerId) state.caravanTurn = null;
  invalidateCaravanIndex(state);
}
