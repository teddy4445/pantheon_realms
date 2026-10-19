/**
 * City dedications — the mutations (CITY DEDICATIONS handoff §03, §04, §08; app 1.5.0):
 * the two commands and the weekly transaction at dawn. The ownership clearing hook is
 * `clearTownDedication` in ownership.ts (every owner change goes through
 * `changeTownOwner`). The rules themselves are the pure functions of dedication.ts; a
 * commit re-quotes against the current state, so a stale screen can never act on old
 * terms, and the dawn applies exactly `planTownDedicationWeek`.
 *
 * Weekly transaction (one per town and world week, deterministic town order):
 *   1. claim — `applyOnce('city_dedication:<week>:<town>')` AND the persisted
 *      `lastProcessedWeek` (stamped even when the town is ineligible, so a week can never
 *      be claimed later); a due valid switch takes over (an invalid one keeps waiting);
 *   2. (the existing dawn income runs unchanged)
 *   3. the eligible god's gift is paid to the owner (income handicap applied once);
 *   4. in the existing weekly growth loop, after the town's ordinary growth: the favored
 *      family's single credit update (never multiplied by any growth modifier).
 */
import type { GodId, PlayerId, TownId } from '../ids';
import type { TownState } from '../state/match';
import { getGod } from '../definitions/catalog';
import { reject, type RejectionCode, type Tx } from '../engine/tx';
import { RESOURCE_KEYS } from '../core/resources';
import { grant, spend } from './economy';
import { cityDedicationsEnabled, dedicationWeekOf, planTownDedicationWeek, quoteDedicateTown, quoteScheduleTownRededication, type TownDedicationWeekPlan } from './dedication';

function refuse(code: string | null, reason: string | null, fallback: string): never {
  reject((code ?? 'illegal_action') as RejectionCode, reason ?? fallback);
}

/** DedicateTown: the free first dedication (no gift or population now; services at once). */
export function commitDedicateTown(tx: Tx, townId: TownId, godId: GodId): void {
  const q = quoteDedicateTown(tx.catalog, tx.state, tx.actorId, townId, godId);
  if (!q.legal) refuse(q.code, q.reason, 'Cannot dedicate this town');
  const town = tx.state.towns[townId]!;
  const god = getGod(tx.catalog, godId);
  if (RESOURCE_KEYS.some((k) => q.cost[k] > 0)) spend(tx, tx.actorId, q.cost, `Dedication of ${town.name} to ${god.name}`);
  const week = dedicationWeekOf(tx.catalog, tx.state.day);
  const prev = town.dedication;
  // The current week's boundary has passed: it counts as processed, so it can never be paid now.
  town.dedication = {
    activeGodId: godId,
    ownerId: tx.actorId,
    growthCredits: { ...(prev?.growthCredits ?? {}) },
    lastProcessedWeek: Math.max(prev?.lastProcessedWeek ?? 0, week),
  };
  tx.emit({ kind: 'TownDedicated', townId, playerId: tx.actorId, godId, week });
}

/** ScheduleTownRededication: the fee is spent now (never refunded); the switch waits for the next boundary. */
export function commitScheduleTownRededication(tx: Tx, townId: TownId, godId: GodId): void {
  const q = quoteScheduleTownRededication(tx.catalog, tx.state, tx.actorId, townId, godId);
  if (!q.legal) refuse(q.code, q.reason, 'Cannot schedule this change');
  const town = tx.state.towns[townId]!;
  const rec = town.dedication!;
  const god = getGod(tx.catalog, godId);
  spend(tx, tx.actorId, q.cost, `Rededication of ${town.name} to ${god.name}`);
  rec.pending = { godId, requestedBy: tx.actorId, activationWeek: q.activationWeek };
  tx.emit({ kind: 'TownRededicationScheduled', townId, playerId: tx.actorId, godId, fromGodId: q.currentGodId, activationWeek: q.activationWeek, activationDay: q.activationDay, cost: q.cost });
}

/** The towns claimed at this dawn's week boundary, with the plan each one applies. */
export interface CityDedicationWeek {
  readonly week: number;
  readonly plans: ReadonlyMap<TownId, TownDedicationWeekPlan>;
}

function byId<T extends { id: string }>(a: T, b: T): number {
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/**
 * Dawn of a new world week, step 1: claim each dedicated town's weekly transaction (in town
 * order) and activate due valid switches. Null when the scenario has no city dedications
 * (legacy saves: nothing is touched).
 */
export function beginCityDedicationWeek(tx: Tx, week: number): CityDedicationWeek | null {
  if (!cityDedicationsEnabled(tx.state)) return null;
  const plans = new Map<TownId, TownDedicationWeekPlan>();
  for (const town of Object.values(tx.state.towns).sort(byId)) {
    const rec = town.dedication;
    if (!rec || rec.lastProcessedWeek >= week) continue;
    const plan = planTownDedicationWeek(tx.catalog, tx.state, town.id, week);
    if (!plan || !tx.applyOnce(`city_dedication:${week}:${town.id}`)) continue;
    rec.lastProcessedWeek = week;
    if (plan.dropPending) delete rec.pending;
    if (plan.activation) {
      rec.activeGodId = plan.activation.godId;
      rec.ownerId = plan.activation.playerId;
      delete rec.pending;
      tx.emit({ kind: 'TownRededicationActivated', townId: town.id, playerId: plan.activation.playerId, godId: plan.activation.godId, fromGodId: plan.activation.fromGodId, week });
    } else if (plan.waiting) {
      tx.emit({ kind: 'TownRededicationDelayed', townId: town.id, playerId: plan.waiting.playerId, godId: plan.waiting.godId, week, reason: plan.waiting.reason });
    }
    plans.set(town.id, plan);
  }
  return { week, plans };
}

/** Dawn step 3 (after the existing income): each eligible town's weekly gift, in town order. */
export function grantCityGifts(tx: Tx, w: CityDedicationWeek): void {
  for (const townId of [...w.plans.keys()].sort()) {
    const plan = w.plans.get(townId)!;
    if (!plan.gift || !plan.godId || !plan.ownerId) continue;
    if (!RESOURCE_KEYS.some((k) => plan.gift![k] > 0)) continue;
    const town = tx.state.towns[townId]!;
    grant(tx, plan.ownerId, plan.gift, `Gift of ${getGod(tx.catalog, plan.godId).name} (${town.name})`);
    tx.emit({ kind: 'CityGiftGranted', townId, playerId: plan.ownerId, godId: plan.godId, week: w.week, amount: plan.gift });
  }
}

/**
 * Dawn step 4, inside the existing weekly growth loop right after the town's ordinary growth:
 * the favored family's one credit update. Added once to the shared base/upgraded pool.
 */
export function applyCityDevotionGrowth(tx: Tx, town: TownState, w: CityDedicationWeek): void {
  const plan = w.plans.get(town.id);
  const g = plan?.growth;
  const rec = town.dedication;
  if (!plan || !g || !plan.godId || !plan.ownerId || !rec) return;
  rec.growthCredits[g.familyId] = g.storedAfter;
  if (g.added > 0) town.population[g.familyId] = (town.population[g.familyId] ?? 0) + g.added;
  tx.emit({
    kind: 'CityDevotionGrowthApplied',
    townId: town.id,
    playerId: plan.ownerId as PlayerId,
    godId: plan.godId,
    familyId: g.familyId,
    week: w.week,
    quarters: g.quarters,
    added: g.added,
    total: town.population[g.familyId] ?? 0,
    remainingQuarters: g.storedAfter,
  });
}
