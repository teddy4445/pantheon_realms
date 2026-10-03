/**
 * EconomySystem: construction, recruitment, troop upgrades and market trades.
 *
 * Each action has a read-only quote (used by screens) and a commit that calls
 * the same quote, so displayed prices and legality always match execution.
 */
import { heroInTown, townGate } from '../resolvers/world';
import type { BuildingId, CreatureId, PlayerId, TownId } from '../ids';
import {
  RESOURCE_KEYS,
  addResources,
  canAfford,
  maxAffordable,
  resources,
  scaleResources,
  shortfall,
  subtractResources,
  type ResourceBundle,
  type ResourceKey,
} from '../core/resources';
import { getBuilding, getCreature, getFamily, requireStats, type ContentCatalog } from '../definitions/catalog';
import type { BuildingDefinition } from '../definitions/towns';
import type { RecruitDestination } from '../commands/commands';
import type { ArmyRef, MatchState, TownState } from '../state/match';
import { evaluateAll, missingRequirements } from '../resolvers/requirements';
import {
  isBuildUsedToday,
  playerMarketCount,
  recruitableCreatureIds,
  slotOf,
  townHasEffect,
} from '../resolvers/town';
import { placementSlot, resolveArmy, armyRefLabel } from '../resolvers/army';
import { hexEquals } from '../core/hex';
import { movementBudget } from '../resolvers/heroes';
import { reject, type RejectionCode, type Tx } from '../engine/tx';
import { bumpTotal } from './stats';

// ---------------------------------------------------------------------------
// Construction
// ---------------------------------------------------------------------------

export type BuildState = 'built' | 'available' | 'unaffordable' | 'locked' | 'not_in_scope' | 'planned' | 'used_today';

export interface ConstructionQuote {
  readonly buildingId: BuildingId;
  readonly state: BuildState;
  readonly legal: boolean;
  readonly cost: ResourceBundle;
  readonly balanceAfter: ResourceBundle;
  readonly shortfall: ResourceBundle;
  /** First blocking reason, phrased for players. */
  readonly reason: string | null;
  readonly code: RejectionCode | null;
  /** Every missing prerequisite (expanded chain). */
  readonly missing: string[];
}

export function quoteConstruction(
  catalog: ContentCatalog,
  state: MatchState,
  playerId: PlayerId,
  townId: TownId,
  buildingId: BuildingId,
): ConstructionQuote {
  const town = state.towns[townId];
  const def = catalog.buildings[buildingId];
  const player = state.players[playerId];
  const cost = resources(def?.cost ?? {});
  const wallet = player?.wallet ?? resources();
  const base = {
    buildingId,
    cost,
    balanceAfter: subtractResources(wallet, cost),
    shortfall: shortfall(wallet, cost),
    missing: [] as string[],
  };
  const result = (st: BuildState, code: RejectionCode | null, reason: string | null, missing: string[] = []): ConstructionQuote => ({
    ...base,
    state: st,
    legal: st === 'available',
    code,
    reason,
    missing,
  });
  if (!town || !def || !player) return result('locked', 'not_found', 'Unknown town or building');
  if (town.ownerId !== playerId) return result('locked', 'not_owner', 'You do not own this town');
  const slot = slotOf(catalog, town, def.slotId);
  const level = town.buildings[slot.id] ?? 0;
  if (level >= def.level) return result('built', 'already_built', 'Already built');
  if (def.implementationStatus === 'planned') return result('planned', 'planned_content', 'Planned building — mechanics not yet designed');
  if (level < def.level - 1) {
    const prevId = slot.chain[def.level - 2];
    const prevName = prevId ? getBuilding(catalog, prevId).name : 'the previous level';
    return result('locked', 'missing_requirement', `Requires ${prevName}`, [`Requires ${prevName}`]);
  }
  const allow = state.scenario.purchasableBuildingIds;
  if (allow && !allow.includes(buildingId)) return result('not_in_scope', 'not_in_scope', 'Not available in this demo mission');
  const scope = { playerId, townId };
  const req = evaluateAll(catalog, state, def.requirements, scope);
  if (!req.ok) return result('locked', 'missing_requirement', req.reason, missingRequirements(catalog, state, def.requirements, scope));
  if (isBuildUsedToday(state, town)) return result('used_today', 'build_used_today', 'Built today — next build tomorrow');
  if (!canAfford(wallet, cost)) return result('unaffordable', 'insufficient_resources', 'Not enough resources');
  return result('available', null, null);
}

export function commitConstruction(tx: Tx, townId: TownId, buildingId: BuildingId): void {
  const q = quoteConstruction(tx.catalog, tx.state, tx.actorId, townId, buildingId);
  if (!q.legal) reject(q.code ?? 'illegal_action', q.reason ?? 'Cannot build');
  const town = tx.state.towns[townId]!;
  const def = getBuilding(tx.catalog, buildingId);
  spend(tx, tx.actorId, q.cost, `Built ${def.name}`);
  town.buildings[def.slotId] = def.level;
  town.buildUsedDay = tx.state.day;
  tx.emit({ kind: 'BuildingConstructed', townId, buildingId, level: def.level });
  bumpTotal(tx.state, tx.actorId, 'buildingsBuilt');
  applyDwellingConstruction(tx, town, def);
}

function applyDwellingConstruction(tx: Tx, town: TownState, def: BuildingDefinition): void {
  if (!def.dwelling) return;
  const familyId = def.dwelling.familyId;
  if (def.dwelling.form === 'upgraded') {
    tx.emit({ kind: 'DwellingUpgraded', townId: town.id, buildingId: def.id, familyId });
    return;
  }
  // First construction of the base dwelling grants exactly one base-growth quantity.
  if (def.dwelling.grantsInitialPopulation && town.population[familyId] === undefined) {
    if (tx.applyOnce(`dwelling_grant:${town.id}:${familyId}`)) {
      const family = getFamily(tx.catalog, familyId);
      town.population[familyId] = family.baseGrowth;
      tx.emit({ kind: 'PopulationGrown', townId: town.id, familyId, added: family.baseGrowth, total: family.baseGrowth });
    }
  }
}

// ---------------------------------------------------------------------------
// Resources
// ---------------------------------------------------------------------------

export function spend(tx: Tx, playerId: PlayerId, cost: ResourceBundle, reason: string): void {
  const player = tx.state.players[playerId];
  if (!player) reject('not_found', 'Unknown player');
  if (!canAfford(player.wallet, cost)) reject('insufficient_resources', 'Not enough resources');
  if (RESOURCE_KEYS.every((k) => cost[k] === 0)) return;
  player.wallet = subtractResources(player.wallet, cost);
  tx.emit({ kind: 'ResourcesSpent', playerId, amount: cost, reason });
}

export function grant(tx: Tx, playerId: PlayerId, amount: ResourceBundle, reason: string): void {
  const player = tx.state.players[playerId];
  if (!player) return;
  if (RESOURCE_KEYS.every((k) => amount[k] === 0)) return;
  player.wallet = addResources(player.wallet, amount);
  tx.emit({ kind: 'ResourcesGranted', playerId, amount, reason });
}

// ---------------------------------------------------------------------------
// Recruitment
// ---------------------------------------------------------------------------

export interface RecruitmentQuote {
  readonly legal: boolean;
  readonly code: RejectionCode | null;
  readonly reason: string | null;
  readonly unitCost: ResourceBundle;
  readonly totalCost: ResourceBundle;
  readonly available: number;
  /** Largest legal quantity considering population and wallet (capacity checked separately). */
  readonly maxQuantity: number;
  readonly destinationLabel: string;
  readonly destinationSlot: number | null;
  readonly balanceAfter: ResourceBundle;
}

export function quoteRecruitment(
  catalog: ContentCatalog,
  state: MatchState,
  playerId: PlayerId,
  townId: TownId,
  creatureId: CreatureId,
  quantity: number,
  destination: RecruitDestination,
): RecruitmentQuote {
  const town = state.towns[townId];
  const player = state.players[playerId];
  const creature = catalog.creatures[creatureId];
  const unitCost = resources(creature?.cost ?? {});
  const wallet = player?.wallet ?? resources();
  const qty = Number.isInteger(quantity) ? quantity : 0;
  const totalCost = scaleResources(unitCost, Math.max(0, qty));
  const available = town && creature ? (town.population[creature.familyId] ?? 0) : 0;
  const maxQuantity = Math.max(0, Math.min(available, maxAffordable(wallet, unitCost)));
  let destinationLabel = 'Garrison';
  let destinationSlot: number | null = null;
  const fail = (code: RejectionCode, reason: string): RecruitmentQuote => ({
    legal: false,
    code,
    reason,
    unitCost,
    totalCost,
    available,
    maxQuantity,
    destinationLabel,
    destinationSlot,
    balanceAfter: subtractResources(wallet, totalCost),
  });
  if (!town || !player || !creature) return fail('not_found', 'Unknown town or creature');
  if (town.ownerId !== playerId) return fail('not_owner', 'You do not own this town');
  if (!recruitableCreatureIds(catalog, town).includes(creatureId)) {
    return fail('not_recruitable', `${creature.name} requires its dwelling in this town`);
  }
  let army;
  if (destination.kind === 'hero') {
    const hero = state.heroes[destination.heroId];
    if (!hero || hero.ownerId !== playerId || hero.status !== 'active') return fail('not_found', 'Unknown hero');
    destinationLabel = hero.name;
    if (!heroInTown(catalog, state, hero, town.id)) {
      return fail('not_present', `${hero.name} must be in ${town.name} to receive recruits`);
    }
    army = hero.army;
  } else {
    army = town.garrison;
    destinationLabel = `${town.name} garrison`;
  }
  destinationSlot = placementSlot(army, creatureId);
  if (qty < 1) return fail('invalid_quantity', 'Choose at least one creature');
  if (available < qty) return fail('no_population', `Only ${available} available this week`);
  if (destinationSlot === null) return fail('no_capacity', `${destinationLabel} has no free slot for ${creature.pluralName}`);
  if (!canAfford(wallet, totalCost)) return fail('insufficient_resources', 'Not enough resources');
  return {
    legal: true,
    code: null,
    reason: null,
    unitCost,
    totalCost,
    available,
    maxQuantity,
    destinationLabel,
    destinationSlot,
    balanceAfter: subtractResources(wallet, totalCost),
  };
}

export function commitRecruitment(
  tx: Tx,
  townId: TownId,
  creatureId: CreatureId,
  quantity: number,
  destination: RecruitDestination,
): void {
  const q = quoteRecruitment(tx.catalog, tx.state, tx.actorId, townId, creatureId, quantity, destination);
  if (!q.legal || q.destinationSlot === null) reject(q.code ?? 'illegal_action', q.reason ?? 'Cannot recruit');
  const town = tx.state.towns[townId]!;
  const creature = getCreature(tx.catalog, creatureId);
  spend(tx, tx.actorId, q.totalCost, `Recruited ${quantity} ${creature.pluralName}`);
  town.population[creature.familyId] = (town.population[creature.familyId] ?? 0) - quantity;
  const army = destination.kind === 'hero' ? tx.state.heroes[destination.heroId]!.army : town.garrison;
  const slot = army.slots[q.destinationSlot];
  if (slot) slot.count += quantity;
  else army.slots[q.destinationSlot] = { stackId: tx.nextId('stack'), creatureId, count: quantity };
  const counterKey = `recruited:${creature.familyId}`;
  tx.state.mission.counters[counterKey] = (tx.state.mission.counters[counterKey] ?? 0) + quantity;
  tx.emit({ kind: 'UnitsRecruited', townId, creatureId, quantity, destination: q.destinationLabel });
  bumpTotal(tx.state, tx.actorId, 'creaturesRecruited', quantity);
  if (destination.kind === 'hero') clampMovement(tx, destination.heroId);
}

/** Army changes never refill movement; cap remaining points at the new maximum. */
export function clampMovement(tx: Tx, heroId: string): void {
  const hero = tx.state.heroes[heroId];
  if (!hero) return;
  const max = movementBudget(tx.catalog, tx.state, hero).total;
  hero.movementPoints = Math.min(hero.movementPoints, max);
}

// ---------------------------------------------------------------------------
// Troop upgrades
// ---------------------------------------------------------------------------

export interface UpgradeQuote {
  readonly legal: boolean;
  readonly code: RejectionCode | null;
  readonly reason: string | null;
  readonly fromId: CreatureId | null;
  readonly toId: CreatureId | null;
  readonly unitCost: ResourceBundle;
  readonly totalCost: ResourceBundle;
  readonly maxQuantity: number;
  readonly targetSlot: number | null;
}

export function quoteUpgrade(
  catalog: ContentCatalog,
  state: MatchState,
  playerId: PlayerId,
  townId: TownId,
  armyRef: ArmyRef,
  slot: number,
  quantity: number,
): UpgradeQuote {
  const town = state.towns[townId];
  const army = resolveArmy(state, armyRef);
  const stack = army?.slots[slot] ?? null;
  const base = stack ? catalog.creatures[stack.creatureId] : undefined;
  const upgradeId = base?.upgradeId ?? null;
  const up = upgradeId ? catalog.creatures[upgradeId] : undefined;
  const unitCost = base?.cost && up?.cost ? subtractResources(up.cost, base.cost) : resources();
  const qty = Number.isInteger(quantity) ? quantity : 0;
  const totalCost = scaleResources(unitCost, Math.max(0, qty));
  const wallet = state.players[playerId]?.wallet ?? resources();
  const maxQuantity = stack ? Math.min(stack.count, maxAffordable(wallet, unitCost)) : 0;
  const fail = (code: RejectionCode, reason: string, targetSlot: number | null = null): UpgradeQuote => ({
    legal: false,
    code,
    reason,
    fromId: base?.id ?? null,
    toId: up?.id ?? null,
    unitCost,
    totalCost,
    maxQuantity,
    targetSlot,
  });
  if (!town || !army || !stack || !base) return fail('not_found', 'No stack in that slot');
  if (town.ownerId !== playerId) return fail('not_owner', 'You do not own this town');
  if (!up) return fail('illegal_action', `${base.name} is already the upgraded form`);
  if (armyRef.kind === 'hero') {
    const hero = state.heroes[armyRef.heroId];
    if (!hero || hero.ownerId !== playerId) return fail('not_owner', 'Not your hero');
    if (!heroInTown(catalog, state, hero, town.id)) return fail('not_present', `${hero.name} must be in ${town.name} to train troops`);
  } else if (armyRef.townId !== townId) {
    return fail('not_present', 'Troops must be in this town');
  }
  if (!recruitableCreatureIds(catalog, town).includes(up.id)) {
    return fail('missing_requirement', `Requires the upgraded dwelling for ${up.name}`);
  }
  if (qty < 1 || qty > stack.count) return fail('invalid_quantity', `Choose 1-${stack.count} creatures to train`);
  let targetSlot: number | null;
  if (qty === stack.count) {
    const existing = army.slots.findIndex((s, i) => i !== slot && s?.creatureId === up.id);
    targetSlot = existing >= 0 ? existing : slot;
  } else {
    const existing = army.slots.findIndex((s) => s?.creatureId === up.id);
    const empty = army.slots.findIndex((s) => s === null);
    targetSlot = existing >= 0 ? existing : empty >= 0 ? empty : null;
  }
  if (targetSlot === null) return fail('no_capacity', 'A partial upgrade needs a free slot or an existing upgraded stack');
  if (!canAfford(wallet, totalCost)) return fail('insufficient_resources', 'Not enough resources', targetSlot);
  return { legal: true, code: null, reason: null, fromId: base.id, toId: up.id, unitCost, totalCost, maxQuantity, targetSlot };
}

export function commitUpgrade(tx: Tx, townId: TownId, armyRef: ArmyRef, slot: number, quantity: number): void {
  const q = quoteUpgrade(tx.catalog, tx.state, tx.actorId, townId, armyRef, slot, quantity);
  if (!q.legal || q.targetSlot === null || !q.toId || !q.fromId) reject(q.code ?? 'illegal_action', q.reason ?? 'Cannot upgrade');
  const army = resolveArmy(tx.state, armyRef)!;
  const stack = army.slots[slot]!;
  const upName = getCreature(tx.catalog, q.toId).pluralName;
  spend(tx, tx.actorId, q.totalCost, `Trained ${quantity} ${upName}`);
  if (quantity === stack.count && q.targetSlot === slot) {
    stack.creatureId = q.toId;
  } else {
    stack.count -= quantity;
    if (stack.count === 0) army.slots[slot] = null;
    const target = army.slots[q.targetSlot];
    if (target) target.count += quantity;
    else army.slots[q.targetSlot] = { stackId: tx.nextId('stack'), creatureId: q.toId, count: quantity };
  }
  const key = `trained:${q.fromId}`;
  tx.state.mission.counters[key] = (tx.state.mission.counters[key] ?? 0) + quantity;
  tx.emit({ kind: 'StackUpgraded', townId, fromId: q.fromId, toId: q.toId, quantity });
  if (armyRef.kind === 'hero') clampMovement(tx, armyRef.heroId);
}

// ---------------------------------------------------------------------------
// Market (Gold-only exchange; no barter, Favor untradeable)
// ---------------------------------------------------------------------------

export interface TradeQuote {
  readonly legal: boolean;
  readonly reason: string | null;
  readonly code: RejectionCode | null;
  readonly pay: ResourceBundle;
  readonly receive: ResourceBundle;
  readonly rate: number;
}

export function marketRates(catalog: ContentCatalog, markets: number) {
  const tiers = catalog.rulesProfile.market;
  let tier = tiers[0]!;
  for (const t of tiers) if (markets >= t.minMarkets) tier = t;
  return tier;
}

export function quoteTrade(
  catalog: ContentCatalog,
  state: MatchState,
  playerId: PlayerId,
  townId: TownId,
  sell: ResourceKey,
  buy: ResourceKey,
  amount: number,
): TradeQuote {
  const town = state.towns[townId];
  const player = state.players[playerId];
  const fail = (code: RejectionCode, reason: string): TradeQuote => ({
    legal: false,
    reason,
    code,
    pay: resources(),
    receive: resources(),
    rate: 0,
  });
  if (!town || !player) return fail('not_found', 'Unknown town');
  if (town.ownerId !== playerId) return fail('not_owner', 'You do not own this town');
  if (!townHasEffect(catalog, town, 'enables_market')) return fail('missing_requirement', 'Requires a Market');
  if (!Number.isInteger(amount) || amount < 1) return fail('invalid_quantity', 'Choose an amount');
  if (sell === 'favor' || buy === 'favor') return fail('illegal_action', 'Favor cannot be traded');
  if (sell === buy) return fail('illegal_action', 'Choose two different resources');
  if (sell !== 'gold' && buy !== 'gold') return fail('illegal_action', 'Trade through Gold: sell, then buy');
  const tier = marketRates(catalog, playerMarketCount(catalog, state, playerId));
  let pay: ResourceBundle;
  let receive: ResourceBundle;
  let rate: number;
  if (sell === 'gold') {
    rate = buy === 'crystal' ? tier.buyCrystal : tier.buyCommon;
    pay = resources({ gold: rate * amount });
    receive = resources({ [buy]: amount });
  } else {
    rate = sell === 'crystal' ? tier.sellCrystal : tier.sellCommon;
    pay = resources({ [sell]: amount });
    receive = resources({ gold: rate * amount });
  }
  if (!canAfford(player.wallet, pay)) return { legal: false, reason: 'Not enough resources', code: 'insufficient_resources', pay, receive, rate };
  return { legal: true, reason: null, code: null, pay, receive, rate };
}

export function commitTrade(tx: Tx, townId: TownId, sell: ResourceKey, buy: ResourceKey, amount: number): void {
  const q = quoteTrade(tx.catalog, tx.state, tx.actorId, townId, sell, buy, amount);
  if (!q.legal) reject(q.code ?? 'illegal_action', q.reason ?? 'Cannot trade');
  spend(tx, tx.actorId, q.pay, 'Market trade');
  grant(tx, tx.actorId, q.receive, 'Market trade');
  tx.emit({ kind: 'ResourcesTraded', townId, sold: sell, bought: buy, amount });
}

// ---------------------------------------------------------------------------
// Stack transfer, split, merge, swap
// ---------------------------------------------------------------------------

export interface TransferQuote {
  readonly legal: boolean;
  readonly reason: string | null;
  readonly code: RejectionCode | null;
}

function armiesColocated(catalog: ContentCatalog, state: MatchState, playerId: PlayerId, a: ArmyRef, b: ArmyRef): string | null {
  const pos = (ref: ArmyRef) => {
    if (ref.kind === 'hero') {
      const h = state.heroes[ref.heroId];
      if (!h || h.ownerId !== playerId || h.status !== 'active') return null;
      return h.position;
    }
    const t = state.towns[ref.townId];
    if (!t || t.ownerId !== playerId) return null;
    // A garrison meets heroes at the town's gate.
    return townGate(catalog, state, t.id);
  };
  const pa = pos(a);
  const pb = pos(b);
  if (!pa || !pb) return 'You do not control both armies';
  if (a.kind === 'garrison' && b.kind === 'garrison' && a.townId !== b.townId) return 'Garrisons in different towns cannot exchange troops';
  const d = Math.abs(pa.q - pb.q) + Math.abs(pa.r - pb.r) + Math.abs(pa.q + pa.r - pb.q - pb.r);
  if (d / 2 > (a.kind === 'hero' && b.kind === 'hero' ? 1 : 0)) {
    return a.kind === 'hero' && b.kind === 'hero'
      ? 'Heroes must stand on adjacent tiles to exchange troops'
      : 'The hero must be in the town to exchange troops with its garrison';
  }
  return null;
}

export function quoteTransfer(
  catalog: ContentCatalog,
  state: MatchState,
  playerId: PlayerId,
  from: ArmyRef,
  fromSlot: number,
  to: ArmyRef,
  toSlot: number,
  quantity: number,
): TransferQuote {
  const fail = (code: RejectionCode, reason: string): TransferQuote => ({ legal: false, reason, code });
  const src = resolveArmy(state, from);
  const dst = resolveArmy(state, to);
  if (!src || !dst) return fail('not_found', 'Unknown army');
  const colocated = armiesColocated(catalog, state, playerId, from, to);
  if (colocated) return fail('not_present', colocated);
  const stack = src.slots[fromSlot];
  if (!stack) return fail('not_found', 'No stack in that slot');
  if (toSlot < 0 || toSlot >= dst.slots.length) return fail('invalid_command', 'Invalid slot');
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > stack.count) return fail('invalid_quantity', `Move 1-${stack.count}`);
  const same = src === dst;
  if (same && fromSlot === toSlot) return fail('invalid_command', 'Choose a different slot');
  const target = dst.slots[toSlot];
  if (target && target.creatureId !== stack.creatureId && quantity !== stack.count) {
    return fail('no_capacity', 'Split into an empty slot or a matching stack');
  }
  // Never leave a traveling hero with zero troops.
  if (from.kind === 'hero' && !same) {
    const remaining = src.slots.reduce((n, s, i) => n + (i === fromSlot ? (s?.count ?? 0) - quantity : (s?.count ?? 0)), 0);
    const swapIn = target && target.creatureId !== stack.creatureId ? target.count : 0;
    if (remaining + swapIn <= 0) return fail('illegal_action', 'A hero must keep at least one creature');
  }
  if (to.kind === 'hero' && !same && target && target.creatureId !== stack.creatureId) {
    const remainingDst = dst.slots.reduce((n, s, i) => n + (i === toSlot ? 0 : (s?.count ?? 0)), 0) + quantity;
    if (remainingDst <= 0) return fail('illegal_action', 'A hero must keep at least one creature');
  }
  return { legal: true, reason: null, code: null };
}

export function commitTransfer(tx: Tx, from: ArmyRef, fromSlot: number, to: ArmyRef, toSlot: number, quantity: number): void {
  const q = quoteTransfer(tx.catalog, tx.state, tx.actorId, from, fromSlot, to, toSlot, quantity);
  if (!q.legal) reject(q.code ?? 'illegal_action', q.reason ?? 'Cannot transfer');
  const src = resolveArmy(tx.state, from)!;
  const dst = resolveArmy(tx.state, to)!;
  const stack = src.slots[fromSlot]!;
  const target = dst.slots[toSlot];
  const creatureId = stack.creatureId;
  if (target && target.creatureId !== creatureId) {
    // Full swap.
    dst.slots[toSlot] = stack;
    src.slots[fromSlot] = target;
  } else if (target) {
    target.count += quantity;
    stack.count -= quantity;
    if (stack.count === 0) src.slots[fromSlot] = null;
  } else if (quantity === stack.count) {
    dst.slots[toSlot] = stack;
    src.slots[fromSlot] = null;
  } else {
    stack.count -= quantity;
    dst.slots[toSlot] = { stackId: tx.nextId('stack'), creatureId, count: quantity };
  }
  tx.emit({
    kind: 'StackTransferred',
    creatureId,
    quantity,
    from: armyRefLabel(tx.state, from),
    to: armyRefLabel(tx.state, to),
  });
  if (from.kind === 'hero') clampMovement(tx, from.heroId);
  if (to.kind === 'hero') clampMovement(tx, to.heroId);
}

export function creatureUnitCost(catalog: ContentCatalog, creatureId: CreatureId): ResourceBundle {
  return resources(requireStats(catalog, creatureId).cost);
}
