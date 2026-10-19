/**
 * Recruitment caravans for the strategic AI (expedition kit §06/§12, `recruitmentCaravansV1`).
 *
 *  - Belief (`redactCaravans`, called by observation.ts): another empire's shipment is kept only
 *    while it stands in the player's current vision, with its cargo replaced by the estimate its
 *    scouting stage permits (the same projection a human gets, `caravanIntel` → `estimatedArmy`)
 *    and its source, destination and route removed. Own shipments stay as they are.
 *  - Dispatch (`caravanDispatchCandidates`): simple and deterministic — when a town's stock is
 *    idle (no own hero visiting to take it, the town not threatened) and another own town is
 *    threatened by a visible enemy, send that stock there through the same quote a human uses
 *    (`quoteCaravan`: the recruitment prices, the shared pools, the fee, the land route), when it
 *    arrives within a few days and the treasury keeps its reserve. One shipment per destination
 *    on the road at a time. No instant arrival, no terrain bypass: it is an ordinary command.
 *  - Interception (`caravanTargets`): a visible enemy caravan is a legitimate target, valued by
 *    its estimated cargo (never its true one) and attacked by moving onto it like any encounter.
 */
import {
  CARAVAN_ON_MAP,
  activeCaravanPolicy,
  caravanIntel,
  caravanList,
  cellIndex,
  heroInTown,
  playerTowns,
  quoteCaravan,
  quoteCaravanReroute,
  recruitableCreatureIds,
  townGate,
  hexKey,
  type CommandPayload,
  type ContentCatalog,
  type HeroState,
  type HexCoord,
  type IntelVision,
  type MatchState,
  type PlayerId,
} from '@pr/rules';
import { estimatedArmy } from './observation';
import { fightingStrength } from './evaluation';

/** A shipment is worth sending only when it arrives within this many days. */
export const CARAVAN_MAX_DAYS = 4;
/** Gold kept back after a shipment (on top of the transport fee). */
export const CARAVAN_RESERVE_GOLD = 1500;

/** The belief's view of caravans (see the module note). Mutates `belief` only. */
export function redactCaravans(catalog: ContentCatalog, state: MatchState, belief: MatchState, playerId: PlayerId, visible: ReadonlySet<number>, vision: IntelVision | null): void {
  if (!belief.caravans) return;
  const map = state.world.map;
  for (const [id, k] of Object.entries(belief.caravans)) {
    if (k.ownerId === playerId) continue;
    const real = state.caravans?.[id];
    if (!real || !CARAVAN_ON_MAP.has(real.status) || !visible.has(cellIndex(map, real.coord))) {
      delete belief.caravans[id];
      continue;
    }
    const intel = caravanIntel(catalog, state, playerId, real, vision ?? undefined);
    if (!intel) {
      delete belief.caravans[id];
      continue;
    }
    const estimate =
      intel.stage === 'full'
        ? real.cargo.filter((s) => s.count > 0).map((s) => ({ creatureId: s.creatureId, count: s.count }))
        : estimatedArmy(catalog, state, { targetId: id, kind: 'hero', stage: intel.stage, coord: intel.coord, ownerId: intel.ownerId, strengthBand: intel.strengthBand, creatures: intel.creatures, figureCreatureId: null });
    k.cargo = estimate.slice(0, 7).map((s, i) => ({ stackId: `intel:${id}:${i}`, creatureId: s.creatureId, count: s.count }));
    k.route = [];
    k.sourceTownId = '';
    k.destinationTownId = '';
    k.paid = { gold: 0, wood: 0, stone: 0, crystal: 0, favor: 0 };
  }
}

/**
 * The shipment the AI would send now (at most one candidate), deterministic: towns in ID order,
 * families by tier (highest first, the upgraded form when its dwelling stands), as many as the
 * shared pool and the treasury (keeping `reserveGold` and the fee) allow, at most seven stacks.
 */
export function caravanDispatchCandidates(catalog: ContentCatalog, belief: MatchState, playerId: PlayerId, threatened: ReadonlySet<string>, reserveGold = CARAVAN_RESERVE_GOLD): CommandPayload[] {
  const policy = activeCaravanPolicy(catalog, belief);
  if (!policy) return [];
  const towns = playerTowns(belief, playerId).sort((a, b) => (a.id < b.id ? -1 : 1));
  if (towns.length < 2) return [];
  const needy = towns.filter((t) => threatened.has(t.id));
  if (needy.length === 0) return [];
  const onTheWay = new Set(caravanList(belief, playerId).filter((k) => CARAVAN_ON_MAP.has(k.status)).map((k) => k.destinationTownId));
  const heroes = Object.values(belief.heroes).filter((h) => h.ownerId === playerId && h.status === 'active' && !h.monster);
  const wallet = belief.players[playerId]?.wallet;
  if (!wallet) return [];
  const fee = policy.transportFee.gold ?? 0;
  for (const source of towns) {
    if (threatened.has(source.id)) continue;
    // Idle stock: no own hero in town to take the recruits.
    if (heroes.some((h) => heroInTown(catalog, belief, h, source.id))) continue;
    const recruitable = new Set(recruitableCreatureIds(catalog, source));
    const archetype = catalog.townArchetypes[source.archetypeId];
    const families = (archetype?.slots ?? [])
      .filter((s) => s.kind === 'dwelling')
      .map((s) => catalog.buildings[s.chain[0] ?? '']?.dwelling?.familyId)
      .filter((f): f is string => !!f && (source.population[f] ?? 0) > 0)
      .map((f) => catalog.families[f]!)
      .filter((f) => !!f)
      .sort((a, b) => b.tier - a.tier || (a.id < b.id ? -1 : 1));
    let budget = wallet.gold - fee - reserveGold;
    const items: { creatureId: string; count: number }[] = [];
    for (const fam of families) {
      if (items.length >= policy.maxDistinctStacks || budget <= 0) break;
      const form = fam.upgradedCreatureId && recruitable.has(fam.upgradedCreatureId) ? fam.upgradedCreatureId : recruitable.has(fam.baseCreatureId) ? fam.baseCreatureId : null;
      if (!form) continue;
      const price = catalog.creatures[form]?.cost;
      // Only Gold-priced recruits (crystal creatures stay home for the town's own purchase).
      if (!price || Object.entries(price).some(([k, v]) => k !== 'gold' && (v ?? 0) > 0)) continue;
      const unit = Math.max(1, price.gold ?? 0);
      const count = Math.min(source.population[fam.id] ?? 0, Math.floor(budget / unit));
      if (count < 1) continue;
      items.push({ creatureId: form, count });
      budget -= count * unit;
    }
    if (items.length === 0) continue;
    for (const dest of needy) {
      if (dest.id === source.id || onTheWay.has(dest.id)) continue;
      const q = quoteCaravan(catalog, belief, playerId, source.id, dest.id, items);
      if (!q.legal || q.etaDay === null || q.etaDay - belief.day > CARAVAN_MAX_DAYS) continue;
      if (q.balanceAfter.gold < reserveGold) continue;
      return [{ kind: 'DispatchCaravan', sourceTownId: source.id, destinationTownId: dest.id, items, expectedQuoteHash: q.hash }];
    }
  }
  return [];
}

/**
 * A held shipment of the AI's whose destination was lost (or has no known route) goes to the
 * own town it reaches soonest (then by town ID) — free, through the same reroute quote as a
 * human. A shipment waiting for room at a gate keeps waiting (it tries again each turn).
 */
export function caravanRerouteCandidates(catalog: ContentCatalog, belief: MatchState, playerId: PlayerId): CommandPayload[] {
  if (!activeCaravanPolicy(catalog, belief)) return [];
  const out: CommandPayload[] = [];
  for (const k of caravanList(belief, playerId)) {
    if (k.status !== 'blocked' || (k.blockedReason !== 'destination_lost' && k.blockedReason !== 'no_route')) continue;
    let best: { townId: string; eta: number } | null = null;
    for (const t of playerTowns(belief, playerId).sort((a, b) => (a.id < b.id ? -1 : 1))) {
      const q = quoteCaravanReroute(catalog, belief, playerId, k.id, t.id);
      if (!q.legal || q.etaDay === null) continue;
      if (!best || q.etaDay < best.eta) best = { townId: t.id, eta: q.etaDay };
    }
    if (best) out.push({ kind: 'RerouteCaravan', caravanId: k.id, destinationTownId: best.townId });
  }
  return out;
}

/** A visible enemy caravan as a movement target (structurally the planner's Target). */
export interface CaravanTarget {
  readonly coord: HexCoord;
  readonly value: number;
  readonly encounter: true;
  readonly label: string;
  readonly fights: number;
}

/**
 * Enemy caravans the belief shows (visible now; cargo already the permitted estimate) that
 * `hero` can beat by `margin`: worth their estimated Gold value plus a bonus for denying the
 * reinforcement. A caravan beside a town gate is left to the siege logic.
 */
export function caravanTargets(catalog: ContentCatalog, belief: MatchState, playerId: PlayerId, hero: HeroState, myStrength: number, margin: number): CaravanTarget[] {
  if (!activeCaravanPolicy(catalog, belief) || !belief.caravans) return [];
  const gates = new Set(Object.values(belief.towns).map((t) => hexKey(townGate(catalog, belief, t.id))));
  const out: CaravanTarget[] = [];
  for (const k of caravanList(belief)) {
    if (k.ownerId === playerId || !CARAVAN_ON_MAP.has(k.status) || k.status === 'intercepted') continue;
    if (gates.has(hexKey(k.coord))) continue;
    // Guarded by a hero standing on it: that hero is the target, not the wagon.
    if (Object.values(belief.heroes).some((h) => h.status === 'active' && h.ownerId !== playerId && h.position.q === k.coord.q && h.position.r === k.coord.r)) continue;
    const theirs = fightingStrength(catalog, k.cargo.map((s) => ({ creatureId: s.creatureId, count: s.count })));
    if (theirs <= 0 || myStrength < theirs * margin) continue;
    const gold = k.cargo.reduce((n, s) => n + s.count * (catalog.creatures[s.creatureId]?.cost?.gold ?? 0), 0);
    out.push({ coord: { ...k.coord }, value: 1500 + gold * 0.5, encounter: true, label: `${belief.players[k.ownerId]?.name ?? 'Rival'}’s caravan`, fights: theirs });
  }
  return out;
}
