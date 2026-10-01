/**
 * WorldFeatures (proposed this build): weekly events, neutral creature camps,
 * one-time map events and relic shrines.
 *
 * All of it is data-driven: a camp, an event or a relic is an ordinary site
 * definition; weekly events are catalog entries whose effects reach every
 * empire through the shared effect vocabulary (resolvers/effects.ts).
 */
import type { HeroId, PlayerId, SiteId } from '../ids';
import { hexEquals } from '../core/hex';
import { canAfford, maxAffordable, resources, scaleResources, type ResourceBundle } from '../core/resources';
import type { ContentCatalog } from '../definitions/catalog';
import type { MapEventOptionDefinition, SiteDefinition } from '../definitions/world';
import type { MatchState } from '../state/match';
import { placementSlot } from '../resolvers/army';
import { missionSite } from '../resolvers/world';
import { scenarioMission } from '../resolvers/scenario';
import { reject, type RejectionCode, type Tx } from '../engine/tx';
import { clampMovement, spend } from './economy';
import { grantReward } from './quests';
import { bumpTotal } from './stats';

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

/** New week: every camp gains its weekly growth. */
export function restockCamps(tx: Tx, week: number): void {
  const mission = scenarioMission(tx.catalog, tx.state);
  for (const def of mission?.sites ?? []) {
    if (def.kind.type !== 'creature_camp') continue;
    const st = tx.state.world.sites[def.id];
    if (!st || !tx.applyOnce(`camp_growth:${week}:${def.id}`)) continue;
    st.stock = (st.stock ?? def.kind.initialStock) + def.kind.weeklyGrowth;
    tx.emit({ kind: 'CampRestocked', siteId: def.id, stock: st.stock });
  }
}

export interface CampQuote {
  readonly legal: boolean;
  readonly code: RejectionCode | null;
  readonly reason: string | null;
  readonly creatureId: string | null;
  readonly unitCost: ResourceBundle;
  readonly totalCost: ResourceBundle;
  readonly available: number;
  readonly maxQuantity: number;
  readonly slot: number | null;
}

export function quoteCampRecruitment(catalog: ContentCatalog, state: MatchState, playerId: PlayerId, heroId: HeroId, siteId: SiteId, quantity: number): CampQuote {
  const def = campDef(catalog, state, siteId);
  const st = state.world.sites[siteId];
  const hero = state.heroes[heroId];
  const player = state.players[playerId];
  const creature = def ? catalog.creatures[def.kind.creatureId] : undefined;
  const unitCost = resources(creature?.cost ?? {});
  const qty = Number.isInteger(quantity) ? quantity : 0;
  const totalCost = scaleResources(unitCost, Math.max(0, qty));
  const available = campStock(catalog, state, siteId);
  const wallet = player?.wallet ?? resources();
  const slot = hero && creature ? placementSlot(hero.army, creature.id) : null;
  const maxQuantity = slot === null ? 0 : Math.max(0, Math.min(available, maxAffordable(wallet, unitCost)));
  const base = { creatureId: creature?.id ?? null, unitCost, totalCost, available, maxQuantity, slot };
  const fail = (code: RejectionCode, reason: string): CampQuote => ({ legal: false, code, reason, ...base });
  if (!def || !st || !creature) return fail('not_found', 'Unknown creature camp');
  if (!hero || hero.ownerId !== playerId || hero.status !== 'active') return fail('not_owner', 'Not your hero');
  if (!hexEquals(hero.position, def.coord)) return fail('not_present', `${hero.name} must stand at ${def.name}`);
  if (def.guard && !st.cleared) return fail('missing_requirement', 'Its guards still hold the camp');
  if (state.pendingDecisions.some((d) => d.heroId === heroId)) return fail('decision_pending', 'Resolve the pending level-up first');
  if (qty < 1) return fail('invalid_quantity', 'Choose at least one creature');
  if (available < qty) return fail('no_population', `Only ${available} ${creature.pluralName} are willing to join`);
  if (slot === null) return fail('no_capacity', `${hero.name} has no free slot for ${creature.pluralName}`);
  if (!canAfford(wallet, totalCost)) return fail('insufficient_resources', 'Not enough resources');
  return { legal: true, code: null, reason: null, ...base };
}

export function commitCampRecruitment(tx: Tx, heroId: HeroId, siteId: SiteId, quantity: number): void {
  const q = quoteCampRecruitment(tx.catalog, tx.state, tx.actorId, heroId, siteId, quantity);
  if (!q.legal || q.slot === null || !q.creatureId) reject(q.code ?? 'illegal_action', q.reason ?? 'Cannot recruit');
  const hero = tx.state.heroes[heroId]!;
  const creature = tx.catalog.creatures[q.creatureId]!;
  spend(tx, tx.actorId, q.totalCost, `Recruited ${quantity} ${creature.pluralName}`);
  const st = tx.state.world.sites[siteId]!;
  st.stock = q.available - quantity;
  const slot = hero.army.slots[q.slot];
  if (slot) slot.count += quantity;
  else hero.army.slots[q.slot] = { stackId: tx.nextId('stack'), creatureId: creature.id, count: quantity };
  bumpTotal(tx.state, tx.actorId, 'creaturesRecruited', quantity);
  tx.emit({ kind: 'CampRecruited', siteId, heroId, creatureId: creature.id, quantity });
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
  const wallet = state.players[playerId]?.wallet ?? resources();
  if (option.cost && !canAfford(wallet, resources(option.cost))) return fail('insufficient_resources', 'Not enough resources');
  for (const c of option.reward.creatures ?? []) {
    if (placementSlot(hero.army, c.creatureId) === null) return fail('no_capacity', `${hero.name} has no free slot for ${catalog.creatures[c.creatureId]?.pluralName ?? c.creatureId}`);
  }
  return { legal: true, code: null, reason: null, option };
}

export function commitResolveMapEvent(tx: Tx, heroId: HeroId, siteId: SiteId, optionIndex: number): void {
  const q = quoteMapEvent(tx.catalog, tx.state, tx.actorId, heroId, siteId, optionIndex);
  if (!q.legal || !q.option) reject(q.code ?? 'illegal_action', q.reason ?? 'Cannot do that');
  const def = missionSite(tx.catalog, tx.state, siteId)!;
  if (q.option.cost) spend(tx, tx.actorId, resources(q.option.cost), def.name);
  tx.state.world.sites[siteId]!.claimed = true;
  tx.emit({ kind: 'MapEventResolved', siteId, heroId, optionIndex, label: q.option.label });
  grantReward(tx, tx.actorId, heroId, q.option.reward, `event:${siteId}`, def.name);
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
