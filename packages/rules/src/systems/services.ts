/**
 * Town services (proposed this build): Temple offerings, Training Academy
 * sessions and the Artifact Merchant.
 *
 * Every service has a read-only quote (used by screens and the AI) and a commit
 * that re-runs the same quote, so displayed terms always match execution. The
 * terms themselves come from effect data (offering rules on the player,
 * training/merchant effects on buildings); no code path names a pantheon.
 */
import type { ArtifactId, HeroId, PlayerId, TownId } from '../ids';
import { hexEquals } from '../core/hex';
import { canAfford, resources, type ResourceBundle } from '../core/resources';
import { RngCursor, seedFromLabel } from '../core/rng';
import { getArtifact, getCreature, type ContentCatalog } from '../definitions/catalog';
import type { ArmyRef, MatchState, TownState } from '../state/match';
import { resolveArmy } from '../resolvers/army';
import { offeringRule } from '../resolvers/effects';
import { townMerchantStockSize, townRoleBuilding, townTraining } from '../resolvers/town';
import { scopeAllowed } from '../resolvers/scenario';
import { reject, type RejectionCode, type Tx } from '../engine/tx';
import { clampMovement, grant, spend } from './economy';
import { grantExperience } from './heroes';

export function worldWeek(state: MatchState, daysPerWeek: number): number {
  return 1 + Math.floor((state.day - 1) / daysPerWeek);
}

// ---------------------------------------------------------------------------
// Temple offering (signature `offering` effects)
// ---------------------------------------------------------------------------

export interface OfferingLine {
  readonly army: ArmyRef;
  readonly slot: number;
  readonly quantity: number;
}

export interface OfferingQuote {
  readonly legal: boolean;
  readonly code: RejectionCode | null;
  readonly reason: string | null;
  /** Favor this offering yields (after the weekly cap). */
  readonly favor: number;
  /** Recruitment Gold value of the offered creatures. */
  readonly goldValue: number;
  readonly goldPerFavor: number;
  readonly maxFavor: number;
  readonly creatures: number;
  /** True when the rite exists for this player at all (drives whether screens show it). */
  readonly available: boolean;
}

function armyAtTown(state: MatchState, playerId: PlayerId, town: TownState, ref: ArmyRef): string | null {
  if (ref.kind === 'garrison') return ref.townId === town.id ? null : 'Troops must be in this town';
  const hero = state.heroes[ref.heroId];
  if (!hero || hero.ownerId !== playerId || hero.status !== 'active') return 'Not your hero';
  if (!hexEquals(hero.position, town.coord)) return `${hero.name} must be in ${town.name}`;
  return null;
}

export function quoteOffering(catalog: ContentCatalog, state: MatchState, playerId: PlayerId, townId: TownId, lines: readonly OfferingLine[]): OfferingQuote {
  const rule = offeringRule(catalog, state, playerId);
  const town = state.towns[townId];
  let goldValue = 0;
  let creatures = 0;
  const base = { goldPerFavor: rule?.goldPerFavor ?? 0, maxFavor: rule?.maxFavorPerWeek ?? 0, available: !!rule };
  const fail = (code: RejectionCode, reason: string): OfferingQuote => ({ legal: false, code, reason, favor: 0, goldValue, creatures, ...base });
  if (!rule) return fail('missing_requirement', 'Your pantheon has no offering rite');
  if (!town) return fail('not_found', 'Unknown town');
  if (town.ownerId !== playerId) return fail('not_owner', 'You do not own this town');
  if (!townRoleBuilding(catalog, town, 'pantheon_temple')) return fail('missing_requirement', 'Requires a Temple in this town');
  if (town.lastOfferingWeek === worldWeek(state, catalog.rulesProfile.daysPerWeek)) return fail('already_done', 'An offering was already made here this week');
  const seen = new Set<string>();
  const taken = new Map<string, number>();
  for (const l of lines) {
    const key = `${l.army.kind === 'hero' ? `h:${l.army.heroId}` : `g:${l.army.townId}`}:${l.slot}`;
    if (seen.has(key)) return fail('invalid_command', 'Each stack may appear once');
    seen.add(key);
    const where = armyAtTown(state, playerId, town, l.army);
    if (where) return fail('not_present', where);
    const army = resolveArmy(state, l.army);
    const stack = army?.slots[l.slot] ?? null;
    if (!stack) return fail('not_found', 'No stack in that slot');
    if (!Number.isInteger(l.quantity) || l.quantity < 1 || l.quantity > stack.count) return fail('invalid_quantity', `Choose 1-${stack.count} creatures`);
    goldValue += l.quantity * (getCreature(catalog, stack.creatureId).cost?.gold ?? 0);
    creatures += l.quantity;
    if (l.army.kind === 'hero') taken.set(l.army.heroId, (taken.get(l.army.heroId) ?? 0) + l.quantity);
  }
  if (creatures === 0) return fail('invalid_quantity', 'Choose creatures to offer');
  for (const [heroId, n] of taken) {
    const hero = state.heroes[heroId]!;
    const total = hero.army.slots.reduce((a, s) => a + (s?.count ?? 0), 0);
    if (n >= total) return fail('illegal_action', `${hero.name} cannot be left without troops`);
  }
  const favor = Math.min(rule.maxFavorPerWeek, Math.floor(goldValue / rule.goldPerFavor));
  if (favor < 1) return fail('invalid_quantity', `Offer creatures worth at least ${rule.goldPerFavor} Gold`);
  return { legal: true, code: null, reason: null, favor, goldValue, creatures, ...base };
}

export function commitOffering(tx: Tx, townId: TownId, lines: readonly OfferingLine[]): void {
  const q = quoteOffering(tx.catalog, tx.state, tx.actorId, townId, lines);
  if (!q.legal) reject(q.code ?? 'illegal_action', q.reason ?? 'Cannot make this offering');
  const town = tx.state.towns[townId]!;
  const heroes = new Set<string>();
  for (const l of lines) {
    const army = resolveArmy(tx.state, l.army)!;
    const stack = army.slots[l.slot]!;
    stack.count -= l.quantity;
    if (stack.count <= 0) army.slots[l.slot] = null;
    if (l.army.kind === 'hero') heroes.add(l.army.heroId);
  }
  town.lastOfferingWeek = worldWeek(tx.state, tx.profile.daysPerWeek);
  grant(tx, tx.actorId, resources({ favor: q.favor }), `Offering at ${town.name}`);
  tx.emit({ kind: 'OfferingMade', townId, playerId: tx.actorId, favor: q.favor, creatures: q.creatures });
  for (const h of heroes) clampMovement(tx, h);
}

// ---------------------------------------------------------------------------
// Training Academy (`enables_hero_training`)
// ---------------------------------------------------------------------------

export interface TrainingQuote {
  readonly legal: boolean;
  readonly code: RejectionCode | null;
  readonly reason: string | null;
  readonly xp: number;
  readonly cost: ResourceBundle;
}

export function quoteTraining(catalog: ContentCatalog, state: MatchState, playerId: PlayerId, townId: TownId, heroId: HeroId): TrainingQuote {
  const town = state.towns[townId];
  const terms = town ? townTraining(catalog, town) : null;
  const cost = resources({ gold: terms?.gold ?? 0 });
  const fail = (code: RejectionCode, reason: string): TrainingQuote => ({ legal: false, code, reason, xp: terms?.xp ?? 0, cost });
  if (!town) return fail('not_found', 'Unknown town');
  if (town.ownerId !== playerId) return fail('not_owner', 'You do not own this town');
  if (!terms) return fail('missing_requirement', 'Requires a Training Academy');
  const hero = state.heroes[heroId];
  if (!hero || hero.ownerId !== playerId || hero.status !== 'active') return fail('not_owner', 'Not your hero');
  if (!hexEquals(hero.position, town.coord)) return fail('not_present', `${hero.name} must be in ${town.name}`);
  if (hero.lastTrainedWeek === worldWeek(state, catalog.rulesProfile.daysPerWeek)) return fail('already_done', `${hero.name} already trained this week`);
  const cap = state.scenario.xpCap;
  if (cap !== null && hero.xp >= cap) return fail('illegal_action', `${hero.name} is at this mission's experience cap`);
  const wallet = state.players[playerId]?.wallet ?? resources();
  if (!canAfford(wallet, cost)) return fail('insufficient_resources', `Requires ${terms.gold} Gold`);
  return { legal: true, code: null, reason: null, xp: terms.xp, cost };
}

export function commitTraining(tx: Tx, townId: TownId, heroId: HeroId): void {
  const q = quoteTraining(tx.catalog, tx.state, tx.actorId, townId, heroId);
  if (!q.legal) reject(q.code ?? 'illegal_action', q.reason ?? 'Cannot train');
  const hero = tx.state.heroes[heroId]!;
  spend(tx, tx.actorId, q.cost, `${hero.name} trained at the academy`);
  hero.lastTrainedWeek = worldWeek(tx.state, tx.profile.daysPerWeek);
  const res = grantExperience(tx, heroId, q.xp);
  tx.emit({ kind: 'HeroTrained', heroId, townId, xp: res.granted, gold: q.cost.gold });
}

// ---------------------------------------------------------------------------
// Artifact Merchant (`enables_artifact_merchant`)
// ---------------------------------------------------------------------------

/** Artifacts a merchant may stock: priced, not unique and in the scenario's content scope, in stable ID order. */
export function merchantPool(catalog: ContentCatalog, state?: Pick<MatchState, 'scenario'>): ArtifactId[] {
  return Object.values(catalog.artifacts)
    .filter((a) => !!a.merchantPrice && !a.unique && (!state || scopeAllowed(state, a.scope)))
    .map((a) => a.id)
    .sort();
}

/**
 * Fill the town's stock for the current world week (no-op when it is already
 * this week's, or when the town has no merchant). The draw is a pure function
 * of match and week — every merchant in the match offers the same catalog that
 * week, so no town position is favored — and never touches a gameplay RNG stream.
 */
export function refreshMerchantStock(tx: Tx, town: TownState): void {
  const size = townMerchantStockSize(tx.catalog, town);
  if (size <= 0) return;
  const week = worldWeek(tx.state, tx.profile.daysPerWeek);
  if (town.merchant && town.merchant.week === week) return;
  const pool = merchantPool(tx.catalog, tx.state);
  const rng = new RngCursor(seedFromLabel(`merchant|${tx.state.matchId}|${week}`));
  const stock: ArtifactId[] = [];
  while (stock.length < size && pool.length > 0) stock.push(pool.splice(rng.nextInt(pool.length), 1)[0]!);
  town.merchant = { week, stock };
  tx.emit({ kind: 'MerchantRestocked', townId: town.id, week, artifactIds: [...stock] });
}

export interface PurchaseQuote {
  readonly legal: boolean;
  readonly code: RejectionCode | null;
  readonly reason: string | null;
  readonly artifactId: ArtifactId | null;
  readonly cost: ResourceBundle;
}

export function quoteArtifactPurchase(catalog: ContentCatalog, state: MatchState, playerId: PlayerId, townId: TownId, heroId: HeroId, index: number): PurchaseQuote {
  const town = state.towns[townId];
  const artifactId = town?.merchant?.stock[index] ?? null;
  const def = artifactId ? catalog.artifacts[artifactId] : undefined;
  const cost = resources(def?.merchantPrice ?? {});
  const fail = (code: RejectionCode, reason: string): PurchaseQuote => ({ legal: false, code, reason, artifactId, cost });
  if (!town) return fail('not_found', 'Unknown town');
  if (town.ownerId !== playerId) return fail('not_owner', 'You do not own this town');
  if (townMerchantStockSize(catalog, town) <= 0) return fail('missing_requirement', 'Requires an Artifact Merchant');
  if (town.merchant?.week !== worldWeek(state, catalog.rulesProfile.daysPerWeek)) return fail('not_found', 'The stock changes at the start of the week');
  if (!artifactId || !def) return fail('not_found', 'Already sold');
  const hero = state.heroes[heroId];
  if (!hero || hero.ownerId !== playerId || hero.status !== 'active') return fail('not_owner', 'Not your hero');
  if (!hexEquals(hero.position, town.coord)) return fail('not_present', `${hero.name} must be in ${town.name}`);
  if (hero.equipment[def.slot] && hero.backpack.length >= catalog.rulesProfile.backpackCapacity) return fail('no_capacity', `${hero.name}'s backpack is full`);
  const wallet = state.players[playerId]?.wallet ?? resources();
  if (!canAfford(wallet, cost)) return fail('insufficient_resources', 'Not enough resources');
  return { legal: true, code: null, reason: null, artifactId, cost };
}

export function commitArtifactPurchase(tx: Tx, townId: TownId, heroId: HeroId, index: number): void {
  const q = quoteArtifactPurchase(tx.catalog, tx.state, tx.actorId, townId, heroId, index);
  if (!q.legal || !q.artifactId) reject(q.code ?? 'illegal_action', q.reason ?? 'Cannot buy');
  const town = tx.state.towns[townId]!;
  const def = getArtifact(tx.catalog, q.artifactId);
  const hero = tx.state.heroes[heroId]!;
  spend(tx, tx.actorId, q.cost, `Bought ${def.name}`);
  town.merchant!.stock[index] = null;
  const instance = { instanceId: tx.nextId('artifact'), artifactId: q.artifactId };
  if (!hero.equipment[def.slot]) {
    hero.equipment[def.slot] = instance;
    tx.emit({ kind: 'ArtifactGranted', heroId, artifactId: q.artifactId, location: 'equipped' });
  } else {
    hero.backpack.push(instance);
    tx.emit({ kind: 'ArtifactGranted', heroId, artifactId: q.artifactId, location: 'backpack' });
  }
  tx.emit({ kind: 'ArtifactPurchased', heroId, townId, artifactId: q.artifactId });
  clampMovement(tx, heroId);
}
