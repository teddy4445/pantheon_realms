/**
 * Balance jobs: small, independent measurement units so a run can be split
 * across processes (`--jobs`). Each job returns plain JSON.
 */
import type { ContentCatalog } from '@pr/rules';
import { SKIRMISH_MAP_TYPES, type SkirmishMapSize, type SkirmishMapType } from '@pr/mapgen';
import { playMap, playRandom, playSkirmish, rosterArmy, startingArmy, symmetricScore, type Army, type RandomResult, type SkirmishResult } from './lib';

export type Suite = 'skirmish' | 'armies' | 'starts' | 'tiers' | 'random' | 'random1v1' | 'maps';
export const ALL_SUITES: readonly Suite[] = ['skirmish', 'armies', 'starts', 'tiers', 'random', 'random1v1', 'maps'];

export interface BalanceOptions {
  readonly suites: readonly Suite[];
  /** Seeded duels per direction for the army/escort/tier suites. */
  readonly seeds: number;
  /** Seeded matches per ordered pairing and first-mover order for the skirmish suite. */
  readonly matches: number;
  readonly pantheons: readonly string[];
  readonly maxDay: number;
  /** Army/escort/tier duels carry each side's pantheon signature (default true). */
  readonly signatures?: boolean;
  /** Empire counts for the random suite (default 2 and 3). */
  readonly empires?: readonly (2 | 3)[];
  /** Pantheon AI temperaments in skirmish/random matches (default on, as in the game). */
  readonly temperaments?: boolean;
  /** Map sizes for the one-against-one random suite (default small). */
  readonly sizes?: readonly SkirmishMapSize[];
  /** Map types for the one-against-one random suite (default: every type, in turn). */
  readonly mapTypes?: readonly SkirmishMapType[];
  /** random1v1: only the pairings that include one of these pantheons (a quicker check while tuning them). */
  readonly focus?: readonly string[];
  /** maps: only these authored skirmish maps (default: all). */
  readonly maps?: readonly string[];
  /** `--legacy-gods`: play the matches with city dedications off (the gods' old direct economy). */
  readonly legacyGods?: boolean;
  /** `--legacy-intel`: play the whole matches with scouting intel off (applied per worker: `setLegacyIntel`). */
  readonly legacyIntel?: boolean;
}

export type Job =
  | { readonly suite: 'skirmish'; readonly west: string; readonly east: string; readonly firstMover: 'west' | 'east'; readonly seed: number; readonly maxDay: number; readonly temperaments?: boolean; readonly legacyGods?: boolean }
  | { readonly suite: 'armies'; readonly weeks: number; readonly form: 'base' | 'upgraded'; readonly a: string; readonly b: string; readonly seeds: number; readonly signatures: boolean }
  | { readonly suite: 'starts'; readonly a: string; readonly b: string; readonly seeds: number; readonly signatures: boolean }
  | { readonly suite: 'tiers'; readonly tier: number; readonly form: 'base' | 'upgraded'; readonly a: string; readonly b: string; readonly seeds: number; readonly signatures: boolean }
  | { readonly suite: 'random'; readonly pantheon: string; readonly empires: 2 | 3; readonly seed: number; readonly maxDay: number; readonly temperaments?: boolean; readonly legacyGods?: boolean }
  | { readonly suite: 'random1v1'; readonly a: string; readonly b: string; readonly mapType: SkirmishMapType; readonly size: SkirmishMapSize; readonly seed: number; readonly maxDay: number; readonly temperaments?: boolean; readonly legacyGods?: boolean }
  | { readonly suite: 'maps'; readonly mapId: string; readonly seats: readonly string[]; readonly seed: number; readonly maxDay: number; readonly legacyGods?: boolean };

export type JobResult =
  | { readonly job: Job; readonly skirmish: SkirmishResult }
  | { readonly job: Job; readonly random: RandomResult }
  | { readonly job: Job; readonly duel1v1: RandomResult }
  | { readonly job: Job; readonly map: RandomResult & { readonly holdWin: boolean } }
  | { readonly job: Job; readonly score: number; readonly labels?: { readonly a: string; readonly b: string } };

/** Gold budget per tier for the same-tier duels (multiples of the Greek unit's price). */
const TIER_COUNT = [30, 20, 10, 8, 8, 4, 3];

export function buildJobs(catalog: ContentCatalog, o: BalanceOptions): Job[] {
  const jobs: Job[] = [];
  const P = o.pantheons;
  const pairs: [string, string][] = [];
  for (let i = 0; i < P.length; i++) for (let j = i + 1; j < P.length; j++) pairs.push([P[i]!, P[j]!]);
  if (o.suites.includes('skirmish')) {
    // Every ordered pairing (so each pantheon plays both towns), both first movers, every seed.
    for (const west of P)
      for (const east of P)
        for (const firstMover of ['west', 'east'] as const)
          for (let seed = 0; seed < o.matches; seed++) jobs.push({ suite: 'skirmish', west, east, firstMover, seed, maxDay: o.maxDay, temperaments: o.temperaments !== false, legacyGods: o.legacyGods === true });
  }
  if (o.suites.includes('armies')) {
    for (const weeks of [1, 2])
      for (const form of ['base', 'upgraded'] as const) for (const [a, b] of pairs) jobs.push({ suite: 'armies', weeks, form, a, b, seeds: o.seeds, signatures: o.signatures !== false });
  }
  if (o.suites.includes('starts')) for (const [a, b] of pairs) jobs.push({ suite: 'starts', a, b, seeds: o.seeds, signatures: o.signatures !== false });
  if (o.suites.includes('tiers')) {
    for (let tier = 1; tier <= 7; tier++)
      for (const form of ['base', 'upgraded'] as const) for (const [a, b] of pairs) jobs.push({ suite: 'tiers', tier, form, a, b, seeds: o.seeds, signatures: o.signatures !== false });
  }
  if (o.suites.includes('random')) {
    // Mirror matches on generated maps: every seat the same pantheon, so only seat order and the map differ.
    // Every match gets its own map (a pantheon offset in the seed): five maps played by six
    // pantheons used to measure five maps, not thirty (2026-10-02).
    for (const pantheon of P) for (const empires of o.empires ?? ([2, 3] as const)) for (let seed = 0; seed < o.matches; seed++) jobs.push({ suite: 'random', pantheon, empires, seed: P.indexOf(pantheon) * 100 + seed, maxDay: o.maxDay, temperaments: o.temperaments !== false, legacyGods: o.legacyGods === true });
  }
  if (o.suites.includes('random1v1')) {
    // One against one on generated maps: every pairing, each map played from both seats (so
    // the map and the first move cancel out), the map types taken in turn, a new map per match.
    const types = o.mapTypes?.length ? o.mapTypes : SKIRMISH_MAP_TYPES.map((t) => t.id);
    const sizes = o.sizes?.length ? o.sizes : (['small'] as const);
    pairs.forEach(([a, b], k) => {
      if (o.focus?.length && !o.focus.includes(a) && !o.focus.includes(b)) return;
      for (let m = 0; m < o.matches; m++) {
        const mapType = types[(m + k) % types.length]!;
        const size = sizes[m % sizes.length]!;
        const seed = 20000 + k * 1000 + m;
        for (const [x, y] of [
          [a, b],
          [b, a],
        ] as const)
          jobs.push({ suite: 'random1v1', a: x, b: y, mapType, size, seed, maxDay: o.maxDay, temperaments: o.temperaments !== false, legacyGods: o.legacyGods === true });
      }
    });
  }
  if (o.suites.includes('maps')) {
    // Authored skirmish maps: each pantheon line-up played from every seat (the seats rotate),
    // so pantheon strength cancels out and what is left is the map and the turn order.
    const maps = Object.values(catalog.skirmishMaps ?? {})
      .filter((m) => !o.maps?.length || o.maps.includes(m.id))
      .sort((a, b) => a.order - b.order);
    for (const m of maps) {
      const n = m.map.players.length;
      for (let k = 0; k < o.matches; k++) {
        const lineup = Array.from({ length: n }, (_, i) => P[(k + i) % P.length]!);
        for (let r = 0; r < n; r++) jobs.push({ suite: 'maps', mapId: m.id, seats: lineup.map((_, i) => lineup[(i + r) % n]!), seed: k * 10 + r, maxDay: o.maxDay, legacyGods: o.legacyGods === true });
      }
    }
  }
  return jobs;
}

function tierArmy(catalog: ContentCatalog, pantheonId: string, tier: number, form: 'base' | 'upgraded'): { army: Army; name: string } {
  const greek = catalog.families[catalog.pantheons['greek']!.roster[tier - 1]!.familyId]!;
  const greekUnit = catalog.creatures[form === 'base' ? greek.baseCreatureId : greek.upgradedCreatureId]!;
  const budget = (greekUnit.cost.gold ?? 0) * TIER_COUNT[tier - 1]!;
  const fam = catalog.families[catalog.pantheons[pantheonId]!.roster[tier - 1]!.familyId]!;
  const unit = catalog.creatures[form === 'base' ? fam.baseCreatureId : fam.upgradedCreatureId]!;
  return { army: [{ creatureId: unit.id, count: Math.max(1, Math.round(budget / (unit.cost.gold ?? 1))) }], name: unit.name };
}

const sidesOf = (job: { a: string; b: string; signatures?: boolean }) => (job.signatures === false ? undefined : { a: job.a, b: job.b });

export function runJob(catalog: ContentCatalog, job: Job): JobResult {
  switch (job.suite) {
    case 'skirmish':
      return { job, skirmish: playSkirmish(catalog, { west: job.west, east: job.east, seed: job.seed, mapSeed: 5000 + job.seed, firstMover: job.firstMover, maxDay: job.maxDay, temperaments: job.temperaments, legacyGods: job.legacyGods }) };
    case 'armies':
      return { job, score: symmetricScore(rosterArmy(catalog, job.a, job.form, job.weeks), rosterArmy(catalog, job.b, job.form, job.weeks), job.seeds, sidesOf(job)) };
    case 'starts':
      return { job, score: symmetricScore(startingArmy(catalog, job.a), startingArmy(catalog, job.b), job.seeds, sidesOf(job)) };
    case 'random':
      return { job, random: playRandom(catalog, { pantheon: job.pantheon, empires: job.empires, seed: job.seed, maxDay: job.maxDay, temperaments: job.temperaments, legacyGods: job.legacyGods }) };
    case 'random1v1':
      return { job, duel1v1: playRandom(catalog, { pantheon: job.a, empires: 2, seatPantheons: [job.a, job.b], mapType: job.mapType, size: job.size, seed: job.seed, maxDay: job.maxDay, temperaments: job.temperaments, legacyGods: job.legacyGods }) };
    case 'maps':
      return { job, map: playMap(catalog, { mapId: job.mapId, seatPantheons: job.seats, seed: job.seed, maxDay: job.maxDay, legacyGods: job.legacyGods }) };
    case 'tiers': {
      const a = tierArmy(catalog, job.a, job.tier, job.form);
      const b = tierArmy(catalog, job.b, job.tier, job.form);
      return { job, score: symmetricScore(a.army, b.army, job.seeds, sidesOf(job)), labels: { a: a.name, b: b.name } };
    }
  }
}
