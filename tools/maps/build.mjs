#!/usr/bin/env node
/**
 * `npm run maps:build` — build, check and fairness-test the authored skirmish
 * maps (development tool; never packaged in the game).
 *
 *   npm run maps:build                      # build every map; fairness-test the ones that changed; ship the ones that pass
 *   npm run maps:build -- --all             # fairness-test every map, changed or not
 *   npm run maps:build -- --no-fairness     # skip the test (the record says "unchecked")
 *   npm run maps:build -- --maps circle_of_gates --matches 36 --dry-run   # try a design change: test it, write nothing
 *   npm run maps:fairness                   # test the shipped maps only (no build); report, ship nothing
 *   npm run maps:fairness -- --maps circle_of_gates,six_thrones --jobs 2
 *   npm run maps:fairness -- --maps circle_of_gates --matches 60 --from 36 --out x.json   # more matches, one verdict (investigation)
 *
 * 1. tools/maps/build.author.ts builds every design in tools/maps/maps.ts and
 *    checks it (validation, exact symmetry, roads, each map's own promises);
 *    the documents are staged, not shipped.
 * 2. Each staged map whose document differs from the one last accepted
 *    (tools/maps/fairness.json) plays the seat-fairness test
 *    (tools/maps/fairness.ts plays all-AI mirror matches; fairnessJudge.mjs
 *    gives the verdict). A map is refused when a seat scores under 60% of its
 *    fair share and the shortfall is beyond chance.
 * 3. Passing maps are written to packages/content/src/skirmish/maps/; a
 *    refused map keeps its previous file, and the command exits with code 1.
 * 4. The layout guides (tools/maps/layout_guides.py) are drawn again.
 */
import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpus } from 'node:os';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync, copyFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { FIRST_BATCH, SECOND_BATCH, judge } from './fairnessJudge.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SHIPPED = join(ROOT, 'packages/content/src/skirmish/maps');
const RECORD = join(ROOT, 'tools/maps/fairness.json');
const require = createRequire(import.meta.url);
const VITEST = join(dirname(require.resolve('vitest/package.json')), 'vitest.mjs');

function parseArgs(argv) {
  const o = { mode: 'build', all: false, fairness: true, jobs: Math.min(8, Math.max(1, cpus().length)), maps: null, matches: 0, from: 0 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--check-only') o.mode = 'check';
    else if (a === '--all') o.all = true;
    else if (a === '--no-fairness') o.fairness = false;
    else if (a === '--dry-run') o.dryRun = true;
    else if (a === '--jobs') o.jobs = Number(argv[++i]);
    else if (a === '--maps') o.maps = argv[++i].split(',');
    else if (a === '--matches') o.matches = Number(argv[++i]);
    else if (a === '--from') o.from = Number(argv[++i]);
    else if (a === '--out') o.out = resolve(argv[++i]);
    else if (a === '--help' || a === '-h') {
      console.log(readFileSync(fileURLToPath(import.meta.url), 'utf8').split('*/')[0]);
      process.exit(0);
    } else throw new Error(`Unknown argument ${a}`);
  }
  return o;
}

const sha = (text) => createHash('sha256').update(text).digest('hex').slice(0, 16);
const pct = (x) => `${Math.round(x * 100)}%`;
const readRecord = () => (existsSync(RECORD) ? JSON.parse(readFileSync(RECORD, 'utf8')) : {});

function vitest(file, env, onLine) {
  return new Promise((ok, fail) => {
    const child = spawn(process.execPath, [VITEST, 'run', '--config', 'tools/maps/vitest.config.ts', file], { cwd: ROOT, env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    child.stdout.on('data', (b) => {
      out += b;
      for (const line of String(b).split('\n')) if (onLine) onLine(line);
    });
    child.stderr.on('data', (b) => (out += b));
    child.on('exit', (code) => (code === 0 ? ok(out) : fail(new Error(`${file} failed (${code})\n${out.slice(-3000)}`))));
  });
}

/** Play `count` mirror matches per map starting at match `from`, sharded over the workers. */
async function play(opts, docs, maps, from, count, tmp, tag) {
  const jobs = maps.flatMap((mapId) => Array.from({ length: count }, (_, k) => ({ mapId, index: from + k })));
  const shards = Math.max(1, Math.min(opts.jobs, jobs.length));
  let done = 0;
  await Promise.all(
    Array.from({ length: shards }, (_, shard) =>
      vitest('tools/maps/fairness.measure.ts', { MAP_FAIRNESS_OPTS: JSON.stringify({ docs, jobs, shard, shards, outDir: tmp, tag }) }, (line) => {
        if (line.startsWith('[maps:fairness]') && ++done % 6 === 0) console.log(`[maps:fairness] ${done}/${jobs.length} matches (${tag})`);
      }),
    ),
  );
  return readdirSync(tmp)
    .filter((f) => f.startsWith(`${tag}-shard-`))
    .flatMap((f) => JSON.parse(readFileSync(join(tmp, f), 'utf8')));
}

/** The sequential fairness test for `maps` (IDs → document paths). Returns { [mapId]: verdict }. */
async function fairnessTest(opts, docs, maps, tmp) {
  const players = Object.fromEntries(maps.map((id) => [id, JSON.parse(readFileSync(docs[id], 'utf8')).players.length]));
  if (opts.matches > 0) {
    // A fixed number of matches (investigation), starting at match `--from`: one verdict on all of them.
    const all = await play(opts, docs, maps, opts.from, opts.matches, tmp, 'fixed');
    const verdicts = Object.fromEntries(maps.map((id) => [id, judge(all.filter((r) => r.mapId === id), players[id])]));
    for (const id of maps) {
      const v = verdicts[id];
      console.log(`[maps:fairness] ${id}: ${v.status.toUpperCase()} — seat shares ${v.shares.map(pct).join(', ')} over ${v.matches} matches (fair ${pct(1 / players[id])}; weakest seat ${v.weakest.seat + 1} at ${pct(v.weakest.ofFair)} of fair, z ${v.weakest.z.toFixed(2)})`);
    }
    if (opts.out) writeFileSync(opts.out, JSON.stringify(all));
    return verdicts;
  }
  const first = await play(opts, docs, maps, 0, FIRST_BATCH, tmp, 'first');
  const verdicts = {};
  const again = [];
  for (const id of maps) {
    const v = judge(first.filter((r) => r.mapId === id), players[id]);
    verdicts[id] = v;
    if (v.status !== 'fair') again.push(id);
  }
  if (again.length) {
    console.log(`[maps:fairness] uneven after ${FIRST_BATCH} matches: ${again.join(', ')} — playing ${SECOND_BATCH} more each`);
    const second = await play(opts, docs, again, FIRST_BATCH, SECOND_BATCH, tmp, 'second');
    for (const id of again) verdicts[id] = judge([...first, ...second].filter((r) => r.mapId === id), players[id]);
  }
  for (const id of maps) {
    const v = verdicts[id];
    console.log(`[maps:fairness] ${id}: ${v.status.toUpperCase()} — seat shares ${v.shares.map(pct).join(', ')} over ${v.matches} matches (fair ${pct(1 / players[id])}; weakest seat ${v.weakest.seat + 1} at ${pct(v.weakest.ofFair)} of fair, z ${v.weakest.z.toFixed(2)})`);
  }
  return verdicts;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const tmp = join(ROOT, 'tools/maps', `.fairness-${stamp}`);
  mkdirSync(tmp, { recursive: true });
  const record = readRecord();
  try {
    if (opts.mode === 'check') {
      // The shipped maps as they are: report only.
      const ids = readdirSync(SHIPPED)
        .filter((f) => f.endsWith('.prmap.json'))
        .map((f) => f.replace('.prmap.json', ''))
        .filter((id) => !opts.maps || opts.maps.includes(id));
      const docs = Object.fromEntries(ids.map((id) => [id, join(SHIPPED, `${id}.prmap.json`)]));
      const verdicts = await fairnessTest(opts, docs, ids, tmp);
      if (Object.values(verdicts).some((v) => v.status === 'unfair')) process.exitCode = 1;
      return;
    }
    // 1. Build and check every design into a staging folder.
    const staging = join(tmp, 'staged');
    mkdirSync(staging, { recursive: true });
    const log = await vitest('tools/maps/build.author.ts', { MAPS_OUT: staging });
    for (const line of log.split('\n')) if (/^\S.*sites,|^\s{2}\S/.test(line) && !line.includes('✓')) console.log(line);
    const staged = readdirSync(staging).filter((f) => f.endsWith('.prmap.json')).map((f) => f.replace('.prmap.json', ''));
    const docs = Object.fromEntries(staged.map((id) => [id, join(staging, `${id}.prmap.json`)]));
    const hash = Object.fromEntries(staged.map((id) => [id, sha(readFileSync(docs[id], 'utf8'))]));
    // 2. Which maps to test: changed since the last accepted document (or all with --all).
    const changed = staged.filter((id) => opts.all || record[id]?.hash !== hash[id] || record[id]?.verdict === 'unchecked').filter((id) => !opts.maps || opts.maps.includes(id));
    let verdicts = {};
    if (!opts.fairness) {
      console.warn('[maps:build] --no-fairness: the seat-fairness test is skipped; the record marks these maps "unchecked".');
      verdicts = Object.fromEntries(changed.map((id) => [id, { status: 'unchecked' }]));
    } else if (changed.length) {
      console.log(`[maps:build] fairness test for ${changed.length} map(s): ${changed.join(', ')}`);
      verdicts = await fairnessTest(opts, docs, changed, tmp);
    } else console.log('[maps:build] no map changed since its last fairness test.');
    if (opts.dryRun) {
      console.log('[maps:build] --dry-run: nothing written.');
      return;
    }
    // 3. Ship what passed; keep the previous file of a refused map.
    const refused = [];
    for (const id of staged) {
      const v = verdicts[id];
      if (v && v.status === 'unfair') {
        refused.push(id);
        continue;
      }
      copyFileSync(docs[id], join(SHIPPED, `${id}.prmap.json`));
      if (v) {
        record[id] = {
          hash: hash[id],
          verdict: v.status,
          ...(v.shares ? { matches: v.matches, seatShares: v.shares.map((x) => Math.round(x * 1000) / 1000), weakestSeat: v.weakest.seat + 1, weakestOfFair: Math.round(v.weakest.ofFair * 100) / 100 } : {}),
          date: new Date().toISOString().slice(0, 10),
        };
      }
    }
    writeFileSync(RECORD, `${JSON.stringify(record, null, 1)}\n`);
    if (refused.length) {
      console.error(`[maps:build] REFUSED (seat fairness): ${refused.join(', ')} — their previous files are kept. Change the design or the turn order and build again.`);
      process.exitCode = 1;
    }
    // 4. Layout guides.
    const py = spawnSync('python3', ['tools/maps/layout_guides.py'], { cwd: ROOT, stdio: 'inherit' });
    if (py.status !== 0) process.exitCode = 1;
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
