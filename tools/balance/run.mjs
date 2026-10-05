#!/usr/bin/env node
/**
 * Balance measurement runner (development tool; never packaged in the game).
 *
 *   npm run balance                         # all suites, default sizes
 *   npm run balance -- skirmish --matches 4 # one suite, more matches
 *   npm run balance -- armies tiers --seeds 20 --jobs 4
 *   npm run balance -- --quick              # small smoke run (minutes)
 *
 * Options:
 *   <suite...>        skirmish | armies | starts | tiers | random (default: all)
 *   --seeds N         seeded duels per direction for armies/starts/tiers (default 12)
 *   --matches N       seeded matches per ordered pairing and first-mover order (default 3)
 *   --pantheons a,b   subset of pantheons (default: all six)
 *   --max-day N       skirmish day cap (default 40)
 *   --jobs N          parallel worker processes (default: CPU count, max 8)
 *   --out DIR         report folder (default: balance-reports/)
 *   --quick           seeds 4, matches 1
 *   --no-signatures   army/escort/tier duels without pantheon signatures (troops only)
 *   --no-temperaments skirmish/random matches with every AI empire playing the same (neutral) way
 *   --empires 2,3     empire counts for the random suite (default both)
 *
 * Writes <out>/balance-<timestamp>.md (readable report) and .json (raw results).
 * Every number is an AI-vs-AI measurement with the shipped AI, not a playtest.
 */
import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { cpus } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SUITES = ['skirmish', 'armies', 'starts', 'tiers', 'random'];
const PANTHEONS = ['greek', 'norse', 'egyptian', 'japanese', 'celtic', 'mesoamerican'];
const NAMES = { greek: 'Greek', norse: 'Norse', egyptian: 'Egyptian', japanese: 'Japanese', celtic: 'Celtic', mesoamerican: 'Mesoamerican' };

function parseArgs(argv) {
  const o = { suites: [], seeds: 12, matches: 3, pantheons: PANTHEONS, maxDay: 40, jobs: Math.min(8, Math.max(1, cpus().length)), out: join(ROOT, 'balance-reports'), signatures: true, temperaments: true };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    if (SUITES.includes(a)) o.suites.push(a);
    else if (a === '--seeds') o.seeds = Number(next());
    else if (a === '--matches') o.matches = Number(next());
    else if (a === '--pantheons') o.pantheons = next().split(',');
    else if (a === '--max-day') o.maxDay = Number(next());
    else if (a === '--jobs') o.jobs = Number(next());
    else if (a === '--out') o.out = resolve(next());
    else if (a === '--no-signatures') o.signatures = false;
    else if (a === '--no-temperaments') o.temperaments = false;
    else if (a === '--empires') o.empires = next().split(',').map(Number);
    else if (a === '--quick') {
      o.seeds = 4;
      o.matches = 1;
    } else if (a === '--help' || a === '-h') {
      console.log(readFileSync(fileURLToPath(import.meta.url), 'utf8').split('*/')[0]);
      process.exit(0);
    } else throw new Error(`Unknown argument ${a}`);
  }
  if (!o.suites.length) o.suites = [...SUITES];
  for (const p of o.pantheons) if (!PANTHEONS.includes(p)) throw new Error(`Unknown pantheon ${p}`);
  return o;
}

function runShard(opts, shard, shards, outDir) {
  const require = createRequire(import.meta.url);
  const vitest = join(dirname(require.resolve('vitest/package.json')), 'vitest.mjs');
  const env = { ...process.env, BALANCE_OPTS: JSON.stringify({ suites: opts.suites, seeds: opts.seeds, matches: opts.matches, pantheons: opts.pantheons, maxDay: opts.maxDay, signatures: opts.signatures, temperaments: opts.temperaments, empires: opts.empires, shard, shards, outDir }) };
  return new Promise((ok, fail) => {
    const child = spawn(process.execPath, [vitest, 'run', '--config', 'tools/balance/vitest.config.ts', 'tools/balance/balance.measure.ts'], { cwd: ROOT, env, stdio: ['ignore', 'pipe', 'pipe'] });
    let err = '';
    child.stdout.on('data', (b) => {
      for (const line of String(b).split('\n')) if (line.startsWith('[balance]')) console.log(line);
    });
    child.stderr.on('data', (b) => (err += b));
    child.on('exit', (code) => (code === 0 ? ok() : fail(new Error(`shard ${shard} failed (${code})\n${err.slice(-2000)}`))));
  });
}

const pct = (x) => (x === null || Number.isNaN(x) ? '—' : x.toFixed(2));
const flag = (x) => (x < 0.35 ? ' ⚠ low' : x > 0.65 ? ' ⚠ high' : '');

function matrixTable(P, get) {
  const head = `| | ${P.map((p) => NAMES[p]).join(' | ')} | **avg** |`;
  const sep = `|---|${P.map(() => '---').join('|')}|---|`;
  const rows = P.map((a) => {
    const vals = P.map((b) => (a === b ? null : get(a, b)));
    const known = vals.filter((v) => v !== null);
    const avg = known.length ? known.reduce((x, y) => x + y, 0) / known.length : null;
    return `| **${NAMES[a]}** | ${vals.map((v) => (v === null ? '·' : pct(v))).join(' | ')} | **${pct(avg)}**${avg === null ? '' : flag(avg)} |`;
  });
  return [head, sep, ...rows].join('\n');
}

function pairScores(results, match) {
  const m = new Map();
  for (const r of results) {
    if (!match(r.job)) continue;
    m.set(`${r.job.a}|${r.job.b}`, r.score);
  }
  return (a, b) => (m.has(`${a}|${b}`) ? m.get(`${a}|${b}`) : m.has(`${b}|${a}`) ? 1 - m.get(`${b}|${a}`) : null);
}

function render(opts, results, seconds, contentVersion) {
  const P = opts.pantheons;
  const out = [];
  out.push(`# Balance report — ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC`);
  out.push('');
  out.push(`Content \`${contentVersion}\` · suites: ${opts.suites.join(', ')} · duel seeds ${opts.seeds} per direction · skirmish matches ${opts.matches} per ordered pairing and first-mover order · day cap ${opts.maxDay} · duels ${opts.signatures ? 'with' : 'without'} pantheon signatures · AI temperaments ${opts.temperaments ? 'on' : 'off'} · ${opts.jobs} worker(s) · ${(seconds / 60).toFixed(1)} min.`);
  out.push('');
  out.push('All numbers are **AI-vs-AI measurements** with the shipped tactical and strategic AI (both sides the same AI), not playtest verdicts. Scores are the row pantheon\'s win rate against the column pantheon; side-neutral: every duel is fought in both directions and every skirmish pairing is played from both towns with both first movers. ⚠ marks averages outside 0.35–0.65.');
  out.push('');

  const sk = results.filter((r) => r.skirmish).map((r) => r.skirmish);
  if (sk.length) {
    out.push('## Skirmish (Twin Harbors, both sides AI)');
    out.push('');
    const pts = (r, side) => (r.winner !== 'none' ? (r.winner === side ? 1 : 0) : r.pointsWinner === side ? 1 : r.pointsWinner === 'draw' ? 0.5 : 0);
    const decisive = sk.filter((r) => r.winner !== 'none');
    const westWins = sk.reduce((n, r) => n + pts(r, 'west'), 0);
    const firstWins = sk.reduce((n, r) => n + pts(r, r.firstMover), 0);
    out.push(`${sk.length} matches · ${decisive.length} decided by elimination (mean day ${(decisive.reduce((a, r) => a + r.day, 0) / Math.max(1, decisive.length)).toFixed(1)}) · ${sk.length - decisive.length} reached the day cap and were scored on army strength (≥ 25% ahead wins, otherwise a draw).`);
    out.push('');
    out.push(`**Fairness checks** — west town score ${pct(westWins / sk.length)} (0.50 = no side advantage) · first mover score ${pct(firstWins / sk.length)} (0.50 = no turn-order advantage).`);
    out.push('');
    const score = new Map();
    for (const r of sk) {
      for (const [me, them, side] of [
        [r.west, r.east, 'west'],
        [r.east, r.west, 'east'],
      ]) {
        if (me === them) continue;
        const k = `${me}|${them}`;
        const cur = score.get(k) ?? { s: 0, n: 0 };
        cur.s += pts(r, side);
        cur.n += 1;
        score.set(k, cur);
      }
    }
    out.push(matrixTable(P, (a, b) => {
      const c = score.get(`${a}|${b}`);
      return c ? c.s / c.n : null;
    }));
    out.push('');
    const mirrors = P.map((p) => {
      const ms = sk.filter((r) => r.west === p && r.east === p);
      if (!ms.length) return null;
      const w = ms.reduce((n, r) => n + pts(r, 'west'), 0) / ms.length;
      const f = ms.reduce((n, r) => n + pts(r, r.firstMover), 0) / ms.length;
      return `| ${NAMES[p]} | ${ms.length} | ${pct(w)} | ${pct(f)} |`;
    }).filter(Boolean);
    if (mirrors.length) {
      out.push('Mirror matches (same pantheon both sides) isolate map and turn order:');
      out.push('');
      out.push('| Pantheon | Matches | West score | First-mover score |');
      out.push('|---|---|---|---|');
      out.push(...mirrors);
      out.push('');
    }
  }

  const rnd = results.filter((r) => r.random).map((r) => r.random);
  if (rnd.length) {
    out.push('## Random maps (generated, every seat the same pantheon, both sides AI)');
    out.push('');
    out.push('Small symmetric maps, few wandering monsters, last empire standing. Mirror matches isolate seat order (seat 1 moves first on day 1; with two empires every day, with three or more the order rotates each day — the generator’s default) and the map; an even generator gives every seat 1/N of the wins.');
    out.push('');
    out.push('Undecided matches at the day cap count for a seat whose army strength is at least 25% above every other seat\'s (else a draw, split evenly).');
    out.push('');
    out.push('| Empires | Matches | Decided | Mean decisive day | Wins by seat (1, 2, …) | Points wins by seat | Seat scores |');
    out.push('|---|---|---|---|---|---|---|');
    for (const n of [2, 3]) {
      const rs = rnd.filter((r) => r.empires === n);
      if (!rs.length) continue;
      const dec = rs.filter((r) => r.winnerSeat !== null);
      const wins = Array.from({ length: n }, (_, i) => dec.filter((r) => r.winnerSeat === i).length);
      const pts = Array.from({ length: n }, (_, i) => rs.filter((r) => r.winnerSeat === null && r.pointsSeat === i).length);
      const draws = rs.filter((r) => r.winnerSeat === null && (r.pointsSeat ?? null) === null).length;
      const score = Array.from({ length: n }, (_, i) => (wins[i] + pts[i] + draws / n) / rs.length);
      const day = dec.reduce((a, r) => a + r.day, 0) / Math.max(1, dec.length);
      out.push(`| ${n} | ${rs.length} | ${dec.length} | ${dec.length ? day.toFixed(1) : '—'} | ${wins.join(', ')} | ${pts.join(', ')} (${draws} draws) | ${score.map((x) => pct(x)).join(', ')} (even = ${pct(1 / n)}) |`);
    }
    out.push('');
    // Who is knocked out first in three-empire matches (a turn-order or map bias shows here first).
    const three = rnd.filter((r) => r.empires === 3 && (r.knockedOut ?? []).length > 0);
    if (three.length) {
      const first = [0, 1, 2].map((s) => three.filter((r) => r.knockedOut[0].seat === s).length);
      out.push(`Three empires — first seat knocked out (seat 1, 2, 3): ${first.join(', ')} of ${three.length} matches with a knock-out.`);
      out.push('');
    }
  }

  const armies = results.filter((r) => r.job.suite === 'armies');
  if (armies.length) {
    out.push('## Full-roster armies');
    out.push('');
    out.push('One stack per tier, counts = weekly growth × weeks; the hero commanding the attacker has zeroed attributes.');
    out.push('');
    for (const weeks of [1, 2])
      for (const form of ['base', 'upgraded']) {
        out.push(`### ${weeks} week${weeks > 1 ? 's' : ''} of growth, ${form} forms`);
        out.push('');
        out.push(matrixTable(P, pairScores(armies, (j) => j.weeks === weeks && j.form === form)));
        out.push('');
      }
  }

  const starts = results.filter((r) => r.job.suite === 'starts');
  if (starts.length) {
    out.push('## Starting escorts (Twin Harbors leaders\' armies)');
    out.push('');
    out.push(matrixTable(P, pairScores(starts, () => true)));
    out.push('');
  }

  const tiers = results.filter((r) => r.job.suite === 'tiers');
  if (tiers.length) {
    out.push('## Same-tier duels (equal gold, one stack each)');
    out.push('');
    out.push('Average win rate of each pantheon\'s unit against the other pantheons\' unit of the same tier and form. Single-stack duels undervalue flyers and shooters and flip on speed thresholds; use them to spot outliers only.');
    out.push('');
    out.push(`| Tier | Form | ${P.map((p) => NAMES[p]).join(' | ')} |`);
    out.push(`|---|---|${P.map(() => '---').join('|')}|`);
    for (let tier = 1; tier <= 7; tier++)
      for (const form of ['base', 'upgraded']) {
        const rows = tiers.filter((r) => r.job.tier === tier && r.job.form === form);
        if (!rows.length) continue;
        const name = {};
        const get = pairScores(rows, () => true);
        for (const r of rows) {
          name[r.job.a] = r.labels.a;
          name[r.job.b] = r.labels.b;
        }
        const cells = P.map((a) => {
          const vals = P.filter((b) => b !== a).map((b) => get(a, b)).filter((v) => v !== null);
          const avg = vals.reduce((x, y) => x + y, 0) / Math.max(1, vals.length);
          return `${name[a] ?? a} ${pct(avg)}${flag(avg)}`;
        });
        out.push(`| ${tier} | ${form} | ${cells.join(' | ')} |`);
      }
    out.push('');
  }
  return out.join('\n');
}

const opts = parseArgs(process.argv.slice(2));
const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const tmp = join(opts.out, `.shards-${stamp}`);
mkdirSync(tmp, { recursive: true });
const t0 = Date.now();
console.log(`[balance] suites=${opts.suites.join(',')} seeds=${opts.seeds} matches=${opts.matches} pantheons=${opts.pantheons.length} jobs=${opts.jobs}`);
await Promise.all(Array.from({ length: opts.jobs }, (_, i) => runShard(opts, i, opts.jobs, tmp)));
const shards = readdirSync(tmp).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(readFileSync(join(tmp, f), 'utf8')));
const results = shards.flatMap((s) => s.results);
const seconds = (Date.now() - t0) / 1000;
const md = render(opts, results, seconds, shards[0]?.contentVersion ?? '?');
const base = join(opts.out, `balance-${stamp}`);
writeFileSync(`${base}.md`, `${md}\n`);
writeFileSync(`${base}.json`, JSON.stringify({ options: opts, seconds, results }, null, 1));
rmSync(tmp, { recursive: true, force: true });
console.log(`[balance] ${results.length} jobs in ${(seconds / 60).toFixed(1)} min → ${base}.md`);
