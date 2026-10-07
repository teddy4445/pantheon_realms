/**
 * Worker for the map fairness test (tools/maps/build.mjs): plays this
 * process's share of the mirror matches and writes them as JSON. Not a test:
 * it asserts nothing.
 */
import { it } from 'vitest';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadCatalog } from '@pr/content';
import { parseCustomMap } from '@pr/campaign';
import { playMirror, type FairnessJob, type FairnessMatch } from './fairness';

interface Opts {
  /** Map ID → path of its document (staged or shipped). */
  readonly docs: Readonly<Record<string, string>>;
  readonly jobs: readonly FairnessJob[];
  readonly shard: number;
  readonly shards: number;
  readonly outDir: string;
  readonly tag: string;
}

it('map fairness shard', () => {
  const o = JSON.parse(process.env.MAP_FAIRNESS_OPTS ?? '{}') as Opts;
  const catalog = loadCatalog();
  const docs = new Map<string, ReturnType<typeof parseCustomMap>>();
  const results: FairnessMatch[] = [];
  o.jobs
    .filter((_, i) => i % o.shards === o.shard)
    .forEach((j) => {
      if (!docs.has(j.mapId)) docs.set(j.mapId, parseCustomMap(readFileSync(o.docs[j.mapId]!, 'utf8')));
      const parsed = docs.get(j.mapId)!;
      if (!parsed.ok) throw new Error(`${j.mapId}: ${parsed.error}`);
      results.push(playMirror(catalog, j.mapId, parsed.doc, j.index));
      process.stdout.write(`[maps:fairness] ${j.mapId} match ${j.index + 1}\n`);
    });
  mkdirSync(o.outDir, { recursive: true });
  writeFileSync(join(o.outDir, `${o.tag}-shard-${o.shard}.json`), JSON.stringify(results));
});
