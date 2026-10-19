/**
 * Worker entry for `npm run balance` (tools/balance/run.mjs). Runs this
 * process's share of the jobs and writes them as JSON; run.mjs merges the
 * shards and renders the report. Not a test: it asserts nothing.
 */
import { it } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadCatalog } from '@pr/content';
import { buildJobs, runJob, type BalanceOptions } from './jobs';
import { setLegacyIntel } from './lib';

it('balance shard', () => {
  const opts = JSON.parse(process.env.BALANCE_OPTS ?? '{}') as BalanceOptions & { shard: number; shards: number; outDir: string };
  const catalog = loadCatalog();
  setLegacyIntel(opts.legacyIntel === true);
  const jobs = buildJobs(catalog, opts).filter((_, i) => i % opts.shards === opts.shard);
  const results = [];
  const t0 = Date.now();
  let last = t0;
  for (let i = 0; i < jobs.length; i++) {
    results.push(runJob(catalog, jobs[i]!));
    if (Date.now() - last > 15000) {
      last = Date.now();
      process.stdout.write(`[balance] shard ${opts.shard + 1}/${opts.shards}: ${i + 1}/${jobs.length} jobs\n`);
    }
  }
  mkdirSync(opts.outDir, { recursive: true });
  writeFileSync(join(opts.outDir, `shard-${opts.shard}.json`), JSON.stringify({ shard: opts.shard, seconds: (Date.now() - t0) / 1000, contentVersion: catalog.versions.contentVersion, results }));
});
