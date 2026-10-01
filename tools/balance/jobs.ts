/**
 * Balance jobs: small, independent measurement units so a run can be split
 * across processes (`--jobs`). Each job returns plain JSON.
 */
import type { ContentCatalog } from '@pr/rules';
import { playRandom, playSkirmish, rosterArmy, startingArmy, symmetricScore, type Army, type RandomResult, type SkirmishResult } from './lib';

export type Suite = 'skirmish' | 'armies' | 'starts' | 'tiers' | 'random';
export const ALL_SUITES: readonly Suite[] = ['skirmish', 'armies', 'starts', 'tiers', 'random'];

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
}

export type Job =
  | { readonly suite: 'skirmish'; readonly west: string; readonly east: string; readonly firstMover: 'west' | 'east'; readonly seed: number; readonly maxDay: number }
  | { readonly suite: 'armies'; readonly weeks: number; readonly form: 'base' | 'upgraded'; readonly a: string; readonly b: string; readonly seeds: number; readonly signatures: boolean }
  | { readonly suite: 'starts'; readonly a: string; readonly b: string; readonly seeds: number; readonly signatures: boolean }
  | { readonly suite: 'tiers'; readonly tier: number; readonly form: 'base' | 'upgraded'; readonly a: string; readonly b: string; readonly seeds: number; readonly signatures: boolean }
  | { readonly suite: 'random'; readonly pantheon: string; readonly empires: 2 | 3; readonly seed: number; readonly maxDay: number };

export type JobResult =
  | { readonly job: Job; readonly skirmish: SkirmishResult }
  | { readonly job: Job; readonly random: RandomResult }
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
          for (let seed = 0; seed < o.matches; seed++) jobs.push({ suite: 'skirmish', west, east, firstMover, seed, maxDay: o.maxDay });
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
    for (const pantheon of P) for (const empires of [2, 3] as const) for (let seed = 0; seed < o.matches; seed++) jobs.push({ suite: 'random', pantheon, empires, seed, maxDay: o.maxDay });
  }
  void catalog;
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
      return { job, skirmish: playSkirmish(catalog, { west: job.west, east: job.east, seed: job.seed, mapSeed: 5000 + job.seed, firstMover: job.firstMover, maxDay: job.maxDay }) };
    case 'armies':
      return { job, score: symmetricScore(rosterArmy(catalog, job.a, job.form, job.weeks), rosterArmy(catalog, job.b, job.form, job.weeks), job.seeds, sidesOf(job)) };
    case 'starts':
      return { job, score: symmetricScore(startingArmy(catalog, job.a), startingArmy(catalog, job.b), job.seeds, sidesOf(job)) };
    case 'random':
      return { job, random: playRandom(catalog, { pantheon: job.pantheon, empires: job.empires, seed: job.seed, maxDay: job.maxDay }) };
    case 'tiers': {
      const a = tierArmy(catalog, job.a, job.tier, job.form);
      const b = tierArmy(catalog, job.b, job.tier, job.form);
      return { job, score: symmetricScore(a.army, b.army, job.seeds, sidesOf(job)), labels: { a: a.name, b: b.name } };
    }
  }
}
