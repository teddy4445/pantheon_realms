/**
 * Late-game army hand-offs (owner request 2026-10-07): from week three a
 * computer empire brings its strength to the front. Its strongest hero is the
 * main army; a secondary hero carrying a worthwhile army (fresh recruits from a
 * town, the spoils of a camp) walks to the main hero — at most two days away —
 * and hands its stacks over, keeping one creature to travel home with. The
 * existing "return to a town with recruits waiting" move then sends it back for
 * the next load, so secondary heroes ferry each week's growth to the front.
 *
 * Uses only the empire's own heroes and the public map; no hidden information.
 * The thresholds are proposed values.
 */
import {
  axialDistance,
  axialNeighbors,
  dayOfWeek,
  movementBudget,
  quoteMovement,
  quoteTransfer,
  type CommandPayload,
  type ContentCatalog,
  type HeroState,
  type MatchState,
  type PlayerId,
} from '@pr/rules';
import { heroPower } from './assessment';
import { stackValue } from './evaluation';

/** World day from which heroes hand armies to the main hero (the start of week three). */
export const HANDOFF_FROM_DAY = 15;
/** A courier carries at least this share of the main hero's strength (less is not worth the walk). */
const COURIER_MIN_SHARE = 0.15;
/** A secondary hero this strong is a second army, not a courier. */
const COURIER_MAX_SHARE = 0.8;
/** The main hero must be within this many days of the courier's movement. */
const COURIER_MAX_DAYS = 2;
/** Swap a courier stack for the main hero's weakest one when it is worth this much more. */
const SWAP_GAIN = 1.2;

/** The empire's main army: its strongest strategic hero (ties by ID). */
export function mainHero(catalog: ContentCatalog, belief: MatchState, heroes: readonly HeroState[]): { hero: HeroState; strength: number } | null {
  let best: { hero: HeroState; strength: number } | null = null;
  for (const h of heroes) {
    if (h.ai?.profile === 'patrol' || h.status !== 'active') continue;
    const st = heroPower(catalog, belief, h);
    if (!best || st > best.strength || (st === best.strength && h.id < best.hero.id)) best = { hero: h, strength: st };
  }
  return best;
}

/** Whether hand-offs are on for this empire now. */
export function handOffsActive(catalog: ContentCatalog, belief: MatchState, heroes: readonly HeroState[]): boolean {
  void catalog;
  return belief.day >= HANDOFF_FROM_DAY && heroes.filter((h) => h.ai?.profile !== 'patrol').length >= 2;
}

/** Is `hero` a courier for `main` (worth carrying, not a second army)? */
export function isCourier(catalog: ContentCatalog, belief: MatchState, hero: HeroState, main: { hero: HeroState; strength: number }): boolean {
  if (hero.id === main.hero.id || hero.ai?.profile === 'patrol') return false;
  const st = heroPower(catalog, belief, hero);
  return st >= main.strength * COURIER_MIN_SHARE && st < main.strength * COURIER_MAX_SHARE;
}

/**
 * One stack transfer from an adjacent courier into the main hero: the most
 * valuable stack that fits (a matching stack or an empty slot), else a swap with
 * the main hero's weakest stack when clearly better. The courier keeps one
 * creature. Returns at most one command (the AI re-plans after each).
 */
export function handOffTransfer(catalog: ContentCatalog, belief: MatchState, playerId: PlayerId, courier: HeroState, main: HeroState): CommandPayload | null {
  if (axialDistance(courier.position, main.position) > 1) return null;
  const value = (s: { creatureId: string; count: number }) => stackValue(catalog, s.creatureId) * s.count;
  const total = courier.army.slots.reduce((n, s) => n + (s?.count ?? 0), 0);
  const stacks = courier.army.slots
    .map((s, i) => ({ s, i }))
    .filter((x): x is { s: NonNullable<typeof x.s>; i: number } => !!x.s && x.s.count > 0)
    .sort((a, b) => value(b.s) - value(a.s) || a.i - b.i);
  const from = { kind: 'hero' as const, heroId: courier.id };
  const to = { kind: 'hero' as const, heroId: main.id };
  for (const { s, i } of stacks) {
    let toSlot = main.army.slots.findIndex((x) => x?.creatureId === s.creatureId);
    if (toSlot < 0) toSlot = main.army.slots.findIndex((x) => !x);
    if (toSlot >= 0) {
      // Keep one creature with the courier.
      const qty = total - s.count <= 0 ? s.count - 1 : s.count;
      if (qty <= 0) continue;
      if (quoteTransfer(catalog, belief, playerId, from, i, to, toSlot, qty).legal) return { kind: 'TransferStack', from, fromSlot: i, to, toSlot, quantity: qty };
      continue;
    }
    // The main army is full: swap for its weakest stack when this one is clearly better.
    let weakest = -1;
    for (let k = 0; k < main.army.slots.length; k++) {
      const m = main.army.slots[k];
      if (m && (weakest < 0 || value(m) < value(main.army.slots[weakest]!))) weakest = k;
    }
    const w = weakest >= 0 ? main.army.slots[weakest] : null;
    if (w && value(s) > value(w) * SWAP_GAIN && quoteTransfer(catalog, belief, playerId, from, i, to, weakest, s.count).legal) {
      return { kind: 'TransferStack', from, fromSlot: i, to, toSlot: weakest, quantity: s.count };
    }
  }
  return null;
}

/**
 * The courier's walk to the main hero: the free tile next to it that is
 * cheapest to reach, within two days, without a fight on the way. `safe` vetoes
 * a stop tile (a visible stronger enemy could strike there).
 */
export function courierMove(catalog: ContentCatalog, belief: MatchState, courier: HeroState, main: HeroState, safe: (stop: { q: number; r: number }) => boolean): CommandPayload | null {
  if (courier.movementPoints <= 0 || axialDistance(courier.position, main.position) <= 1) return null;
  const budget = movementBudget(catalog, belief, courier).total;
  let best: { dest: { q: number; r: number }; cost: number } | null = null;
  for (const n of axialNeighbors(main.position)) {
    const q = quoteMovement(catalog, belief, courier.id, n);
    if (!q.reachable || q.endsInEncounter || q.stopIndex < 0) continue;
    if (q.totalCost > budget * COURIER_MAX_DAYS) continue;
    if (!safe(q.path[q.stopIndex]!)) continue;
    if (!best || q.totalCost < best.cost || (q.totalCost === best.cost && (n.q < best.dest.q || (n.q === best.dest.q && n.r < best.dest.r)))) best = { dest: n, cost: q.totalCost };
  }
  return best ? { kind: 'MoveHero', heroId: courier.id, destination: best.dest } : null;
}

/** Day of the week from which an unused weekly miracle is spent on the adventure map anyway. */
export function lateInWeek(catalog: ContentCatalog, belief: MatchState): boolean {
  return dayOfWeek(belief.day, catalog.rulesProfile.daysPerWeek) >= catalog.rulesProfile.daysPerWeek - 1;
}
