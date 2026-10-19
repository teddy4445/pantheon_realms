/**
 * Headless AI-vs-AI matches on the naval templates (development tool; never packaged).
 *   NAVAL_MATCHES="shattered_crown:2:101,serpent_straits:2:7" NAVAL_DAYS=150 \
 *   npx vitest run --config tools/naval-random/vitest.config.ts tools/naval-random/matches.measure.ts
 * Prints per match: outcome, day, winner, embarks, landings, launches, boardings, town captures,
 * relic holds, ship invariants and wall time. With NAVAL_OUT=<file> the summary goes to a JSON file too;
 * NAVAL_PANTHEONS sets the pantheon of each seat; NAVAL_LOG=1 prints captures, launches and boardings.
 * (npm run naval-random:matches)
 */
import { it } from 'vitest';
import { writeFileSync } from 'node:fs';
import { buildCatalog } from '@pr/content';
import { runAITurn } from '@pr/ai';
import { shipInvariantIssues, type GameEvent, type MatchState } from '@pr/rules';
import { createGeneratedMatch, createRandomSkirmish, type SkirmishGenOptions } from '../../packages/campaign/src';

const catalog = buildCatalog();
/** Seat order of the pantheons (NAVAL_PANTHEONS="norse,greek" swaps the first two seats). */
const pool = (process.env.NAVAL_PANTHEONS ?? 'greek,norse,egyptian,japanese,celtic,mesoamerican').split(',');

export interface MatchSummary {
  readonly label: string;
  readonly outcome: string;
  readonly day: number;
  readonly winner: string | null;
  readonly reason: string;
  readonly counts: Record<string, number>;
  readonly ms: number;
  readonly invariantIssues: number;
  readonly firstEmbarkDay: number | null;
  readonly firstForeignLandingDay: number | null;
}

export function playNaval(mapType: string, n: number, seed: number, maxDays: number, extra: Partial<SkirmishGenOptions> = {}, log = false): MatchSummary {
  const t0 = performance.now();
  const victory = mapType === 'shattered_crown' ? { type: 'hold_relic' as const, days: 7 } : { type: 'elimination' as const };
  const g = createRandomSkirmish(catalog, { seed, size: 'huge', seats: pool.slice(0, n).map((pantheonId) => ({ pantheonId, controller: 'ai' as const })), victory, monsters: 'few', mapType, ...extra } as SkirmishGenOptions);
  let s: MatchState = createGeneratedMatch(catalog, g, { matchId: `naval:${mapType}:${n}:${seed}` }).match;
  const homeOf = new Map<string, string>();
  for (const t of Object.values(s.towns)) if (t.ownerId) homeOf.set(t.ownerId, t.id);
  const counts: Record<string, number> = {};
  let firstEmbarkDay: number | null = null;
  let firstForeignLandingDay: number | null = null;
  let invariantIssues = 0;
  const onEvents = (es: readonly GameEvent[]) => {
    for (const e of es) {
      counts[e.kind] = (counts[e.kind] ?? 0) + 1;
      if (e.kind === 'HeroEmbarked' && firstEmbarkDay === null) firstEmbarkDay = s.day;
      if (e.kind === 'HeroDisembarked' && firstForeignLandingDay === null) firstForeignLandingDay = s.day;
      if (log && (e.kind === 'TownCaptured' || e.kind === 'RelicHeld' || e.kind === 'PlayerEliminated' || e.kind === 'ShipLaunched' || e.kind === 'BoardingStarted' || e.kind === 'SiteCaptured')) console.log(`  day ${s.day}`, JSON.stringify(e));
    }
  };
  let lastDay = s.day;
  for (let guard = 0; guard < maxDays * n * 4 && s.outcome.status === 'running' && s.day <= maxDays; guard++) {
    s = runAITurn(catalog, s, { maxCommands: 400, onEvents });
    if (s.day !== lastDay) {
      lastDay = s.day;
      const issues = shipInvariantIssues(catalog, s);
      if (issues.length) invariantIssues++;
      if (log && s.day % 10 === 0) {
        const summary = Object.values(s.players).filter((p) => p.role !== 'scripted_hostile').map((p) => `${p.id}:${p.wallet.gold}g/${p.wallet.wood}w towns=${Object.values(s.towns).filter((t) => t.ownerId === p.id).length} heroes=${Object.values(s.heroes).filter((h) => h.ownerId === p.id && h.status === 'active').length}`).join(' ');
        console.log(`day ${s.day}: ${summary} embarks=${counts.HeroEmbarked ?? 0} lands=${counts.HeroDisembarked ?? 0}`);
      }
    }
  }
  const out = s.outcome;
  return {
    label: `${mapType}:${n}:${seed}`,
    outcome: out.status,
    day: s.day,
    winner: out.status !== 'running' ? (out.winnerIds?.[0] ?? null) : null,
    reason: out.status !== 'running' ? out.reason : '',
    counts,
    ms: Math.round(performance.now() - t0),
    invariantIssues,
    firstEmbarkDay,
    firstForeignLandingDay,
  };
}

it('naval AI matches', () => {
  const cases = (process.env.NAVAL_MATCHES ?? 'shattered_crown:2:101').split(',');
  const days = Number(process.env.NAVAL_DAYS ?? 120);
  const results: MatchSummary[] = [];
  for (const c of cases) {
    const [mapType, n, seed, unowned] = c.split(':');
    const r = playNaval(mapType!, Number(n), Number(seed), days, unowned ? { unownedTowns: unowned as 'own' } : {}, process.env.NAVAL_LOG === '1');
    results.push(r);
    const k = r.counts;
    console.log(`${r.label}: ${r.outcome} day ${r.day} winner ${r.winner} (${r.reason}) embark=${k.HeroEmbarked ?? 0} land=${k.HeroDisembarked ?? 0} launch=${k.ShipLaunched ?? 0} board=${k.BoardingStarted ?? 0} captured=${k.TownCaptured ?? 0} relicHeld=${k.RelicHeld ?? 0} firstEmbark=${r.firstEmbarkDay} firstLanding=${r.firstForeignLandingDay} invariants=${r.invariantIssues} ${r.ms} ms`);
  }
  if (process.env.NAVAL_OUT) writeFileSync(process.env.NAVAL_OUT, JSON.stringify(results, null, 1));
});
