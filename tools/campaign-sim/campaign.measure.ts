/**
 * Worker entry for `npm run campaign-sim` (tools/campaign-sim/run.mjs): plays
 * this process's share of the journeys and writes them as JSON; run.mjs merges
 * the shards and writes the report. Not a test: it asserts nothing.
 */
import { it } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadCatalog } from '@pr/content';
import { playJourney, playJourneyV2, type MissionRun } from './sim';

interface Opts {
  readonly campaigns: readonly string[];
  /** Campaign difficulty IDs to play (null: the missions as written). */
  readonly difficulties: readonly (string | null)[];
  readonly runs: number;
  readonly maxDay: number;
  readonly shard: number;
  readonly shards: number;
  readonly outDir: string;
  /** Campaign content version: 1 (the legacy missions, default) or 2 (the chapter graphs, both orders). */
  readonly content?: 1 | 2;
}

it('campaign simulation shard', () => {
  const o = JSON.parse(process.env.CAMPAIGN_SIM_OPTS ?? '{}') as Opts;
  const catalog = loadCatalog();
  const levels = o.difficulties?.length ? o.difficulties : [null];
  const jobs = levels
    .flatMap((difficultyId) => o.campaigns.flatMap((campaignId) => Array.from({ length: o.runs }, (_, run) => ({ campaignId, run, difficultyId }))))
    .filter((_, i) => i % o.shards === o.shard);
  const results: MissionRun[] = [];
  const t0 = Date.now();
  let last = t0;
  jobs.forEach((j, i) => {
    // Content v2: even runs take the first available chapter at each choice, odd runs the last.
    if (o.content === 2) results.push(...playJourneyV2(catalog, j.campaignId, j.run, o.maxDay, j.difficultyId, j.run % 2 === 0 ? 'first' : 'last'));
    else results.push(...playJourney(catalog, j.campaignId, j.run, o.maxDay, j.difficultyId));
    if (Date.now() - last > 15000) {
      last = Date.now();
      process.stdout.write(`[campaign-sim] shard ${o.shard + 1}/${o.shards}: ${i + 1}/${jobs.length} journeys\n`);
    }
  });
  mkdirSync(o.outDir, { recursive: true });
  writeFileSync(join(o.outDir, `shard-${o.shard}.json`), JSON.stringify({ shard: o.shard, seconds: (Date.now() - t0) / 1000, contentVersion: catalog.versions.contentVersion, results }));
});
