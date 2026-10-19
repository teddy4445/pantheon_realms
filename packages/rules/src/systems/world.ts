import { allied } from './coalition';
/**
 * WorldFeatures (proposed this build): weekly events, neutral creature camps,
 * one-time map events and relic shrines.
 *
 * All of it is data-driven: a camp, an event or a relic is an ordinary site
 * definition; weekly events are catalog entries whose effects reach every
 * empire through the shared effect vocabulary (resolvers/effects.ts).
 */
import type { CreatureId, HeroId, PlayerId, SiteId } from '../ids';
import { hexEquals } from '../core/hex';
import { canAfford, maxAffordable, resources, scaleResources, subtractResources, type ResourceBundle } from '../core/resources';
import type { ContentCatalog } from '../definitions/catalog';
import { familyForms, type CreatureDefinition } from '../definitions/creatures';
import type { MapEventOptionDefinition, SiteDefinition } from '../definitions/world';
import type { MatchState } from '../state/match';
import { placementSlot } from '../resolvers/army';
import { missionSite } from '../resolvers/world';
import { scenarioMission } from '../resolvers/scenario';
import { reject, type RejectionCode, type Tx } from '../engine/tx';
import { clampMovement, spend } from './economy';
import { grantReward } from './quests';
import { worldWeek } from './services';
import { bumpTotal } from './stats';
import { discountedRecruitTotal, maxDiscountedRecruit } from '../resolvers/libraryRecruitment';

// ---------------------------------------------------------------------------
// Weekly events
// ---------------------------------------------------------------------------

/** Draw the new week's event (weighted, from the progression stream). */
export function startWeeklyEvent(tx: Tx, week: number): void {
  const state = tx.state;
  if (!state.scenario.features?.weeklyEvents) return;
  if (!tx.applyOnce(`weekly_event:${week}`)) return;
  const events = Object.values(tx.catalog.weeklyEvents ?? {}).sort((a, b) => (a.id < b.id ? -1 : 1));
  const total = events.reduce((n, e) => n + Math.max(0, e.weight), 0);
  let chosen: string | null = null;
  if (total > 0) {
    let roll = tx.rng('progression').nextInt(total);
    for (const e of events) {
      roll -= Math.max(0, e.weight);
      if (roll < 0) {
        chosen = e.id;
        break;
      }
    }
  }
  const def = chosen ? tx.catalog.weeklyEvents[chosen] : undefined;
  state.world.weeklyEventId = def?.id ?? null;
  tx.emit({ kind: 'WeeklyEventStarted', week, eventId: state.world.weeklyEventId ?? null });
}

// ---------------------------------------------------------------------------
// Creature camps
// ---------------------------------------------------------------------------

function campDef(catalog: ContentCatalog, state: MatchState, siteId: SiteId): (SiteDefinition & { kind: Extract<SiteDefinition['kind'], { type: 'creature_camp' }> }) | null {
  const def = missionSite(catalog, state, siteId);
  return def && def.kind.type === 'creature_camp' ? (def as SiteDefinition & { kind: Extract<SiteDefinition['kind'], { type: 'creature_camp' }> }) : null;
}

/** Current camp stock (initial stock before the camp was ever touched). */
export function campStock(catalog: ContentCatalog, state: MatchState, siteId: SiteId): number {
  const def = campDef(catalog, state, siteId);
  const st = state.world.sites[siteId];
  if (!def || !st) return 0;
  return st.stock ?? def.kind.initialStock;
}

/**
 * New week: every camp refills by its rule — growth adds its weekly growth; a
 * neutral hiring site ('weekly') holds this week's finite stock again (unbought
 * creatures do not pile up); 'none' never refills. Applied once per week and site.
 */
export function restockCamps(tx: Tx, week: number): void {
  const mission = scenarioMission(tx.catalog, tx.state);
  for (const def of mission?.sites ?? []) {
    if (def.kind.type !== 'creature_camp') continue;
    const mode = def.kind.restock ?? 'growth';
    if (mode === 'none') continue;
    const st = tx.state.world.sites[def.id];
    if (!st || !tx.applyOnce(`camp_growth:${week}:${def.id}`)) continue;
    st.stock = mode === 'weekly' ? def.kind.weeklyGrowth : (st.stock ?? def.kind.initialStock) + def.kind.weeklyGrowth;
    tx.emit({ kind: 'CampRestocked', siteId: def.id, stock: st.stock });
  }
}

/** Why this camp does not hire yet (a pact not yet made), or null. */
export function campLockedReason(catalog: ContentCatalog, state: MatchState, siteId: SiteId): string | null {
  const def = campDef(catalog, state, siteId);
  const flag = def?.kind.requiresFlag;
  if (!def || !flag || state.mission.flags[flag]) return null;
  return def.kind.lockedReason ?? 'They will not join you yet';
}

/**
 * The creature forms a camp hires (battle FX & neutral upgrades, 2026-10-15). A
 * neutral hiring site (`restock: 'weekly'`) whose creature belongs to a neutral
 * family hires every form of that family — its base and its one upgrade — from
 * the site's ONE shared stock; every other camp hires only the creature it lists
 * (old camps, campaign camps and town rosters are unchanged). Decided by data — the
 * site's restock rule and the family's classification — never by a creature ID.
 * The listed creature comes first.
 */
export function campForms(catalog: ContentCatalog, state: MatchState, siteId: SiteId): CreatureId[] {
  const def = campDef(catalog, state, siteId);
  return def ? campSiteForms(catalog, def) : [];
}

/** `campForms` of a site definition without a match (the encyclopedia's hiring places); [] for a site that is no camp. */
export function campSiteForms(catalog: ContentCatalog, def: Pick<SiteDefinition, 'kind'>): CreatureId[] {
  if (def.kind.type !== 'creature_camp') return [];
  const listed = catalog.creatures[def.kind.creatureId];
  if (!listed) return [];
  const fam = catalog.families[listed.familyId];
  if (def.kind.restock !== 'weekly' || !fam || fam.classification !== 'neutral') return [listed.id];
  const forms = familyForms(fam).filter((id) => !!catalog.creatures[id]);
  return [listed.id, ...forms.filter((id) => id !== listed.id)];
}

const formNames = (catalog: ContentCatalog, ids: readonly CreatureId[]) => ids.map((id) => catalog.creatures[id]?.pluralName ?? id).join(' or ');

export interface CampQuote {
  readonly legal: boolean;
  readonly code: RejectionCode | null;
  readonly reason: string | null;
  /** The form being hired (the camp's listed creature when none was chosen), null when refused as unknown. */
  readonly creatureId: string | null;
  /** Every form this camp hires (`campForms`), the listed one first. */
  readonly forms: readonly CreatureId[];
  readonly unitCost: ResourceBundle;
  readonly totalCost: ResourceBundle;
  /** The site's stock, shared by every form and every empire. */
  readonly available: number;
  readonly maxQuantity: number;
  readonly slot: number | null;
}

/**
 * Hire `quantity` creatures at camp `siteId`. `creatureId` picks the form at a
 * site that hires both forms of a family (`campForms`); omitted (old commands,
 * the AI, old saves' replays) it is the camp's listed creature. Any other ID —
 * another family's, a malformed value — is refused, never trusted.
 */
export function quoteCampRecruitment(catalog: ContentCatalog, state: MatchState, playerId: PlayerId, heroId: HeroId, siteId: SiteId, quantity: number, creatureId?: CreatureId | null): CampQuote {
  const def = campDef(catalog, state, siteId);
  const st = state.world.sites[siteId];
  const hero = state.heroes[heroId];
  const player = state.players[playerId];
  const forms = def ? campSiteForms(catalog, def) : [];
  const chosen: unknown = creatureId === undefined || creatureId === null ? def?.kind.creatureId : creatureId;
  const creature = typeof chosen === 'string' && forms.includes(chosen) ? catalog.creatures[chosen] : undefined;
  const unitCost = resources(creature?.cost ?? {});
  const qty = Number.isInteger(quantity) ? quantity : 0;
  const compact = state.scenario.features?.mythicLibraryV2 && hero?.libraryAdventure?.compact?.day === state.day && hero.libraryAdventure.compact.siteId === siteId ? hero.libraryAdventure.compact : undefined;
  const totalCost = discountedRecruitTotal(unitCost, Math.max(0, qty), compact);
  const available = availableCampStock(catalog, state, siteId, heroId);
  const wallet = player?.wallet ?? resources();
  const slot = hero && creature ? placementSlot(hero.army, creature.id) : null;
  const maxQuantity = slot === null ? 0 : maxDiscountedRecruit(wallet, unitCost, available, compact);
  const base = { creatureId: creature?.id ?? null, forms, unitCost, totalCost, available, maxQuantity, slot };
  const fail = (code: RejectionCode, reason: string): CampQuote => ({ legal: false, code, reason, ...base });
  if (!def || !st || !forms.length) return fail('not_found', 'Unknown creature camp');
  if (!creature) return fail('not_recruitable', `${def.name} hires only ${formNames(catalog, forms)}`);
  if (!hero || hero.ownerId !== playerId || hero.status !== 'active') return fail('not_owner', 'Not your hero');
  if (!hexEquals(hero.position, def.coord)) return fail('not_present', `${hero.name} must stand at ${def.name}`);
  if (def.guard && !st.cleared) return fail('missing_requirement', 'Its guards still hold the camp');
  const locked = campLockedReason(catalog, state, siteId);
  if (locked) return fail('missing_requirement', locked);
  if (state.pendingDecisions.some((d) => d.heroId === heroId)) return fail('decision_pending', 'Resolve the pending level-up first');
  if (qty < 1) return fail('invalid_quantity', 'Choose at least one creature');
  if (available < qty) return fail('no_population', `Only ${available} ${creature.pluralName} are willing to join`);
  if (slot === null) return fail('no_capacity', `${hero.name} has no free slot for ${creature.pluralName}`);
  if (!canAfford(wallet, totalCost)) return fail('insufficient_resources', 'Not enough resources');
  return { legal: true, code: null, reason: null, ...base };
}

export function commitCampRecruitment(tx: Tx, heroId: HeroId, siteId: SiteId, quantity: number, creatureId?: CreatureId | null): void {
  // Requoted against the committed state: wallet, quantity, the shared stock, presence, pact, guards and the slot.
  const q = quoteCampRecruitment(tx.catalog, tx.state, tx.actorId, heroId, siteId, quantity, creatureId);
  if (!q.legal || q.slot === null || !q.creatureId) reject(q.code ?? 'illegal_action', q.reason ?? 'Cannot recruit');
  const hero = tx.state.heroes[heroId]!;
  const creature = tx.catalog.creatures[q.creatureId]!;
  if (hero.libraryAdventure?.compact?.siteId === siteId) delete hero.libraryAdventure.compact;
  spend(tx, tx.actorId, q.totalCost, `Recruited ${quantity} ${creature.pluralName}`);
  const st = tx.state.world.sites[siteId]!;
  // One stock per site, whichever form is hired.
  st.stock = campStock(tx.catalog, tx.state, siteId) - quantity;
  if (st.reservation?.heroId === heroId) {
    st.reservation.quantity = Math.max(0, st.reservation.quantity - quantity);
    if (!st.reservation.quantity) delete st.reservation;
  }
  const slot = hero.army.slots[q.slot];
  if (slot) slot.count += quantity;
  else hero.army.slots[q.slot] = { stackId: tx.nextId('stack'), creatureId: creature.id, count: quantity };
  bumpTotal(tx.state, tx.actorId, 'creaturesRecruited', quantity);
  tx.emit({ kind: 'CampRecruited', siteId, heroId, creatureId: creature.id, quantity });
  clampMovement(tx, heroId);
}

// ---------------------------------------------------------------------------
// Training at a neutral hiring site (battle FX & neutral upgrades, 2026-10-15)
// ---------------------------------------------------------------------------

/** The site's training pairs: each base form it hires whose one upgrade it hires too. */
function trainingPairs(catalog: ContentCatalog, forms: readonly CreatureId[]): CreatureDefinition[] {
  return forms.flatMap((id) => {
    const c = catalog.creatures[id];
    return c?.form === 'base' && c.upgradeId && forms.includes(c.upgradeId) ? [c] : [];
  });
}

/**
 * The weekly training allowance of a site (owner decision 2026-10-16): how many
 * creatures it upgrades per week, shared by every empire and renewed each new
 * week (the week its stock refills). The content's `weeklyTraining` when set,
 * else the site's weekly hiring stock (`weeklyGrowth`): a site upgrades at most as
 * many as it hires. 0 for a site that trains nothing (it does not hire both forms
 * of a family) or whose content sets 0.
 */
export function campTrainingAllowance(catalog: ContentCatalog, def: Pick<SiteDefinition, 'kind'>): number {
  if (def.kind.type !== 'creature_camp' || trainingPairs(catalog, campSiteForms(catalog, def)).length === 0) return 0;
  const n = def.kind.weeklyTraining ?? def.kind.weeklyGrowth;
  return Number.isInteger(n) && n > 0 ? n : 0;
}

/**
 * Creatures trained at `siteId` in the current world week, by every empire
 * together. A count kept from an earlier week is none (the allowance renews each
 * week); a save from before the allowance has no count (none this week).
 */
export function campTrainedThisWeek(catalog: ContentCatalog, state: MatchState, siteId: SiteId): number {
  const st = state.world.sites[siteId];
  if (!st || st.trainedWeek !== worldWeek(state, catalog.rulesProfile.daysPerWeek)) return 0;
  const n = st.trainedThisWeek ?? 0;
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

/** How many more creatures `siteId` can train this week (its allowance less what every empire trained there this week). */
export function campTrainingLeft(catalog: ContentCatalog, state: MatchState, siteId: SiteId): number {
  const def = campDef(catalog, state, siteId);
  return def ? Math.max(0, campTrainingAllowance(catalog, def) - campTrainedThisWeek(catalog, state, siteId)) : 0;
}

/** "Its trainers can take 2 more this week (4 a week)" — the refusal when a training asks for more than is left. */
export function campTrainingLimitText(left: number, allowance: number): string {
  return `Its trainers can take ${left > 0 ? `${left} more` : 'no more'} this week (${allowance} a week)`;
}

export interface CampTrainingQuote {
  readonly legal: boolean;
  readonly code: RejectionCode | null;
  readonly reason: string | null;
  /** The base form that trains, and the upgrade it becomes (null when the site trains nothing of it). */
  readonly fromId: CreatureId | null;
  readonly toId: CreatureId | null;
  /** The hero's stack that trains (its slot), null when the hero has none. */
  readonly slot: number | null;
  /** Creatures in that stack. */
  readonly stackCount: number;
  /** Where the trained creatures go: their own slot (the whole stack), an upgraded stack, or a free slot. */
  readonly targetSlot: number | null;
  /** The price difference per creature (upgraded cost − base cost). */
  readonly unitCost: ResourceBundle;
  readonly totalCost: ResourceBundle;
  /** The most of that stack the hero can train now (wallet, space and the week's allowance), 0 when none. */
  readonly maxQuantity: number;
  /** The site's weekly training allowance, shared by every empire (`campTrainingAllowance`; 0 where it trains nothing). */
  readonly weeklyAllowance: number;
  /** How many of it are left this week (`campTrainingLeft`). */
  readonly leftThisWeek: number;
}

/** Where `quantity` of the stack in `slot` would go when they become `toId` (the town training's rule). */
function trainingTarget(slots: readonly ({ readonly creatureId: CreatureId; readonly count: number } | null)[], slot: number, toId: CreatureId, quantity: number, count: number): number | null {
  if (quantity === count) {
    const existing = slots.findIndex((x, i) => i !== slot && x?.creatureId === toId);
    return existing >= 0 ? existing : slot;
  }
  const existing = slots.findIndex((x) => x?.creatureId === toId);
  const empty = slots.findIndex((x) => x === null);
  return existing >= 0 ? existing : empty >= 0 ? empty : null;
}

/**
 * Train `quantity` creatures of the visiting hero's base stack `fromCreatureId`
 * into the family's upgraded form at a neutral hiring site that hires both forms.
 * Pays the price difference per creature, consumes no stock and keeps the count;
 * a partial training needs a free slot or an existing upgraded stack (overflow is
 * never destroyed; base and upgraded never share a stack). `slot` picks the stack;
 * omitted, the hero's first stack of that creature. The same ownership, presence,
 * guard, pact and pending-decision checks as hiring.
 *
 * Weekly allowance (owner decision 2026-10-16): the site trains at most
 * `campTrainingAllowance` creatures a week, all empires together; asking for more
 * than is left this week is refused (`campTrainingLimitText`), and `maxQuantity`
 * never exceeds what is left. The allowance is not the hiring stock: training
 * still uses none of it.
 */
export function quoteCampTraining(
  catalog: ContentCatalog,
  state: MatchState,
  playerId: PlayerId,
  heroId: HeroId,
  siteId: SiteId,
  fromCreatureId: CreatureId,
  quantity: number,
  slot?: number | null,
): CampTrainingQuote {
  const def = campDef(catalog, state, siteId);
  const st = state.world.sites[siteId];
  const hero = state.heroes[heroId];
  const wallet = state.players[playerId]?.wallet ?? resources();
  const forms = def ? campSiteForms(catalog, def) : [];
  const from: CreatureDefinition | undefined = typeof fromCreatureId === 'string' ? catalog.creatures[fromCreatureId] : undefined;
  const up = from && from.form === 'base' && from.upgradeId && forms.includes(from.id) && forms.includes(from.upgradeId) ? catalog.creatures[from.upgradeId] : undefined;
  const unitCost = from?.cost && up?.cost ? subtractResources(up.cost, from.cost) : resources();
  const qty = Number.isInteger(quantity) ? quantity : 0;
  const totalCost = scaleResources(unitCost, Math.max(0, qty));
  const slots = hero?.army.slots ?? [];
  let index: number | null = null;
  if (from && up) {
    if (slot === undefined || slot === null) {
      const i = slots.findIndex((x) => x?.creatureId === from.id);
      index = i >= 0 ? i : null;
    } else if (Number.isInteger(slot) && slot >= 0 && slot < slots.length && slots[slot]?.creatureId === from.id) index = slot;
  }
  const stack = index !== null ? (slots[index] ?? null) : null;
  const stackCount = stack?.count ?? 0;
  const weeklyAllowance = def ? campTrainingAllowance(catalog, def) : 0;
  const leftThisWeek = def ? campTrainingLeft(catalog, state, siteId) : 0;
  let maxQuantity = 0;
  if (stack && up && index !== null) {
    // Wallet and the week's allowance; less than the whole stack needs somewhere to go.
    const limit = Math.min(stack.count, maxAffordable(wallet, unitCost), leftThisWeek);
    maxQuantity = limit >= stack.count ? stack.count : limit > 0 && trainingTarget(slots, index, up.id, limit, stack.count) !== null ? limit : 0;
  }
  const base = { fromId: up ? (from?.id ?? null) : null, toId: up?.id ?? null, slot: index, stackCount, unitCost, totalCost, maxQuantity, weeklyAllowance, leftThisWeek };
  const fail = (code: RejectionCode, reason: string, targetSlot: number | null = null): CampTrainingQuote => ({ legal: false, code, reason, targetSlot, ...base });
  if (!def || !st || !forms.length) return fail('not_found', 'Unknown creature camp');
  if (!from) return fail('invalid_command', 'Unknown creature');
  if (!up) {
    const pairs = trainingPairs(catalog, forms).map((c) => `${c.pluralName} into ${catalog.creatures[c.upgradeId!]?.pluralName ?? c.upgradeId}`);
    return fail('not_recruitable', pairs.length ? `${def.name} trains only ${pairs.join(', ')}` : `${def.name} trains no creatures`);
  }
  if (weeklyAllowance < 1) return fail('not_recruitable', `${def.name} trains no creatures`);
  if (!hero || hero.ownerId !== playerId || hero.status !== 'active') return fail('not_owner', 'Not your hero');
  if (!hexEquals(hero.position, def.coord)) return fail('not_present', `${hero.name} must stand at ${def.name}`);
  if (def.guard && !st.cleared) return fail('missing_requirement', 'Its guards still hold the camp');
  const locked = campLockedReason(catalog, state, siteId);
  if (locked) return fail('missing_requirement', locked);
  if (state.pendingDecisions.some((d) => d.heroId === heroId)) return fail('decision_pending', 'Resolve the pending level-up first');
  if (!stack || index === null) return fail('not_found', slot === undefined || slot === null ? `${hero.name} has no ${from.pluralName} to train` : `No ${from.pluralName} in that slot`);
  if (qty < 1 || qty > stack.count) return fail('invalid_quantity', `Choose 1-${stack.count} ${from.pluralName} to train`);
  // The site's weekly allowance, shared by every empire (training uses no hiring stock).
  if (qty > leftThisWeek) return fail('no_population', campTrainingLimitText(leftThisWeek, weeklyAllowance));
  const targetSlot = trainingTarget(slots, index, up.id, qty, stack.count);
  if (targetSlot === null) return fail('no_capacity', `A partial training needs a free slot or an existing stack of ${up.pluralName}`);
  if (!canAfford(wallet, totalCost)) return fail('insufficient_resources', 'Not enough resources', targetSlot);
  return { legal: true, code: null, reason: null, targetSlot, ...base };
}

export function commitCampTraining(tx: Tx, heroId: HeroId, siteId: SiteId, fromCreatureId: CreatureId, quantity: number, slot?: number | null): void {
  // Requoted against the committed state: wallet, the stack and its count, space, presence, pact, guards and the week's allowance.
  const q = quoteCampTraining(tx.catalog, tx.state, tx.actorId, heroId, siteId, fromCreatureId, quantity, slot);
  if (!q.legal || q.slot === null || q.targetSlot === null || !q.fromId || !q.toId) reject(q.code ?? 'illegal_action', q.reason ?? 'Cannot train');
  const army = tx.state.heroes[heroId]!.army;
  const stack = army.slots[q.slot]!;
  const upName = tx.catalog.creatures[q.toId]!.pluralName;
  spend(tx, tx.actorId, q.totalCost, `Trained ${quantity} ${upName}`);
  if (quantity === stack.count && q.targetSlot === q.slot) {
    stack.creatureId = q.toId;
  } else {
    stack.count -= quantity;
    if (stack.count === 0) army.slots[q.slot] = null;
    const target = army.slots[q.targetSlot];
    if (target) target.count += quantity;
    else army.slots[q.targetSlot] = { stackId: tx.nextId('stack'), creatureId: q.toId, count: quantity };
  }
  // The site's stock is untouched: training recruits nobody. The week's allowance is used
  // (shared by every empire; a count from an earlier week starts again from none).
  const site = tx.state.world.sites[siteId]!;
  site.trainedThisWeek = campTrainedThisWeek(tx.catalog, tx.state, siteId) + quantity;
  site.trainedWeek = worldWeek(tx.state, tx.profile.daysPerWeek);
  const key = `trained:${q.fromId}`;
  tx.state.mission.counters[key] = (tx.state.mission.counters[key] ?? 0) + quantity;
  tx.emit({ kind: 'CampTrained', siteId, heroId, fromId: q.fromId, toId: q.toId, quantity });
  // As in a town: an army change never refills movement; the remaining points are capped at the new maximum.
  clampMovement(tx, heroId);
}

// ---------------------------------------------------------------------------
// One-time map events
// ---------------------------------------------------------------------------

export interface MapEventQuote {
  readonly legal: boolean;
  readonly code: RejectionCode | null;
  readonly reason: string | null;
  readonly option: MapEventOptionDefinition | null;
}

export function quoteMapEvent(catalog: ContentCatalog, state: MatchState, playerId: PlayerId, heroId: HeroId, siteId: SiteId, optionIndex: number): MapEventQuote {
  const def = missionSite(catalog, state, siteId);
  const st = state.world.sites[siteId];
  const hero = state.heroes[heroId];
  const option = def?.kind.type === 'map_event' ? (def.kind.options[optionIndex] ?? null) : null;
  const fail = (code: RejectionCode, reason: string): MapEventQuote => ({ legal: false, code, reason, option });
  if (!def || !st || def.kind.type !== 'map_event') return fail('not_found', 'Nothing happens here');
  if (!hero || hero.ownerId !== playerId || hero.status !== 'active') return fail('not_owner', 'Not your hero');
  if (!hexEquals(hero.position, def.coord)) return fail('not_present', `${hero.name} must stand at ${def.name}`);
  if (st.claimed) return fail('already_done', 'This event has already happened');
  if (def.guard && !st.cleared) return fail('missing_requirement', 'Its guards still hold the site');
  if (state.pendingDecisions.some((d) => d.heroId === heroId)) return fail('decision_pending', 'Resolve the pending level-up first');
  if (!option) return fail('invalid_command', 'Choose one of the options');
  if (option.requiresFlags?.some((f) => !state.mission.flags[f])) return fail('missing_requirement', 'You do not yet have what this choice needs');
  const wallet = state.players[playerId]?.wallet ?? resources();
  if (option.cost && !canAfford(wallet, resources(option.cost))) return fail('insufficient_resources', 'Not enough resources');
  const recipient = option.rewardHeroId ? state.heroes[option.rewardHeroId] : hero;
  if (!recipient || recipient.status !== 'active' || !allied(state, recipient.ownerId, playerId)) return fail('not_owner', 'The reserve recipient must be an active allied hero');
  for (const c of option.reward.creatures ?? []) {
    if (placementSlot(recipient.army, c.creatureId) === null) return fail('no_capacity', `${hero.name} has no free slot for ${catalog.creatures[c.creatureId]?.pluralName ?? c.creatureId}`);
  }
  return { legal: true, code: null, reason: null, option };
}

export function commitResolveMapEvent(tx: Tx, heroId: HeroId, siteId: SiteId, optionIndex: number): void {
  const q = quoteMapEvent(tx.catalog, tx.state, tx.actorId, heroId, siteId, optionIndex);
  if (!q.legal || !q.option) reject(q.code ?? 'illegal_action', q.reason ?? 'Cannot do that');
  const def = missionSite(tx.catalog, tx.state, siteId)!;
  if (q.option.cost) spend(tx, tx.actorId, resources(q.option.cost), def.name);
  tx.state.world.sites[siteId]!.claimed = true;
  tx.state.world.sites[siteId]!.chosenOption = optionIndex;
  tx.emit({ kind: 'MapEventResolved', siteId, heroId, optionIndex, label: q.option.label });
  grantReward(tx, tx.actorId, q.option.rewardHeroId ?? heroId, q.option.reward, `event:${siteId}`, def.name);
  // An authored resolution (campaign v2): named guards stand down — no battle, no simulation.
  for (const id of q.option.clearsSiteIds ?? []) {
    const st = tx.state.world.sites[id];
    if (!st || st.cleared) continue;
    st.cleared = true;
    st.guard = null;
    st.clearedBy = tx.actorId;
    tx.emit({ kind: 'GuardStoodDown', siteId: id, heroId });
  }
}

// ---------------------------------------------------------------------------
// Relics (hold-the-relic victory)
// ---------------------------------------------------------------------------

/** Dawn: every owned relic counts one more day held. */
export function advanceRelics(tx: Tx): void {
  const mission = scenarioMission(tx.catalog, tx.state);
  const cond = mission?.victoryCondition;
  for (const def of mission?.sites ?? []) {
    if (def.kind.type !== 'relic') continue;
    const st = tx.state.world.sites[def.id];
    if (!st?.owner) continue;
    if (!tx.applyOnce(`relic:${tx.state.day}:${def.id}`)) continue;
    st.heldDays = (st.heldDays ?? 0) + 1;
    const needed = cond?.type === 'hold_site' && cond.siteId === def.id ? cond.days : 0;
    tx.emit({ kind: 'RelicHeld', siteId: def.id, playerId: st.owner, days: st.heldDays, needed });
  }
}


export function liveCampReservation(state: MatchState, siteId: SiteId) {
  const site = state.world.sites[siteId], r = site?.reservation;
  const h = r ? state.heroes[r.heroId] : undefined;
  return state.scenario.features?.mythicLibraryV2 && r && r.untilDay > state.day && r.quantity > 0 && site?.owner === null && h?.status === 'active' && h.ownerId === r.ownerId ? r : null;
}
/** Reservation is a hold on existing stock, never newly created population. */
export function availableCampStock(catalog: ContentCatalog, state: MatchState, siteId: SiteId, heroId: HeroId): number {
  const total = campStock(catalog, state, siteId), r = liveCampReservation(state, siteId);
  return Math.max(0, total - (r && r.heroId !== heroId ? r.quantity : 0));
}
