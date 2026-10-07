#!/usr/bin/env node
/**
 * Balance measurement runner (development tool; never packaged in the game).
 *
 *   npm run balance                         # all suites, default sizes
 *   npm run balance -- skirmish --matches 4 # one suite, more matches
 *   npm run balance -- armies tiers --seeds 20 --jobs 4
 *   npm run balance -- --quick              # small smoke run (minutes)
 *   npm run balance -- random1v1 --matches 20  # every pairing one against one on generated maps
 *   npm run balance -- maps --matches 2        # the authored skirmish maps, each line-up from every seat
 *
 * Options:
 *   <suite...>        skirmish | armies | starts | tiers | random | random1v1 | maps (default: all)
 *   --seeds N         seeded duels per direction for armies/starts/tiers (default 12)
 *   --matches N       seeded matches per ordered pairing and first-mover order (default 3);
 *                     random1v1: maps per pairing, each played from both seats
 *   --pantheons a,b   subset of pantheons (default: all six)
 *   --max-day N       skirmish day cap (default 40)
 *   --jobs N          parallel worker processes (default: CPU count, max 8)
 *   --out DIR         report folder (default: balance-reports/)
 *   --quick           seeds 4, matches 1
 *   --no-signatures   army/escort/tier duels without pantheon signatures (troops only)
 *   --no-temperaments skirmish/random matches with every AI empire playing the same (neutral) way
 *   --empires 2,3     empire counts for the random suite (default both)
 *   --sizes a,b       map sizes for random1v1 (default small)
 *   --map-types a,b   map types for random1v1 (default: all six, in turn)
 *   --focus a,b       random1v1: only the pairings that include one of these pantheons
 *   --maps a,b        maps: only these skirmish maps (frostgate, burning_oasis, circle_of_gates, barrows, golden_fords, six_thrones)
 *   --check           exit with code 1 when random1v1 finds a pantheon significantly under the layout floor (0.40 on a map type)
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
const SUITES = ['skirmish', 'armies', 'starts', 'tiers', 'random', 'random1v1', 'maps'];
const PANTHEONS = ['greek', 'norse', 'egyptian', 'japanese', 'celtic', 'mesoamerican'];
const NAMES = { greek: 'Greek', norse: 'Norse', egyptian: 'Egyptian', japanese: 'Japanese', celtic: 'Celtic', mesoamerican: 'Mesoamerican' };

/** Layout floor (proposed 2026-10-07): every pantheon at least this score on every random-map type. */
const LAYOUT_FLOOR = 0.4;
/** Cells found significantly under the floor in this run (random1v1); `--check` exits 1 when there are any. */
const layoutFailures = [];

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
    else if (a === '--sizes') o.sizes = next().split(',');
    else if (a === '--map-types') o.mapTypes = next().split(',');
    else if (a === '--focus') o.focus = next().split(',');
    else if (a === '--maps') o.maps = next().split(',');
    else if (a === '--check') o.check = true;
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
  const env = { ...process.env, BALANCE_OPTS: JSON.stringify({ suites: opts.suites, seeds: opts.seeds, matches: opts.matches, pantheons: opts.pantheons, maxDay: opts.maxDay, signatures: opts.signatures, temperaments: opts.temperaments, empires: opts.empires, sizes: opts.sizes, mapTypes: opts.mapTypes, focus: opts.focus, maps: opts.maps, shard, shards, outDir }) };
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

  const mapRuns = results.filter((r) => r.map);
  if (mapRuns.length) {
    out.push('## Authored skirmish maps (each line-up played from every seat, all AI)');
    out.push('');
    out.push('Every pantheon line-up is played once from each seat (the seats rotate), so pantheon strength cancels out and the seat scores show the map and the turn order. Even = 1/N per seat. A match undecided at the day cap counts for a seat at least 25% stronger in armies than every other seat, else a draw split evenly.');
    out.push('');
    out.push('| Map | Empires | Matches | Decided (by the shrine) | Mean decisive day | Seat scores (1, 2, …) | First knock-out (mean day) | Battles per match |');
    out.push('|---|---|---|---|---|---|---|---|');
    const ids = [...new Set(mapRuns.map((r) => r.job.mapId))];
    for (const id of ids) {
      const rs = mapRuns.filter((r) => r.job.mapId === id).map((r) => r.map);
      const n = rs[0].empires;
      const dec = rs.filter((x) => x.winnerSeat !== null);
      const hold = dec.filter((x) => x.holdWin).length;
      const score = Array.from({ length: n }, () => 0);
      for (const x of rs) {
        if (x.winnerSeat !== null) score[x.winnerSeat] += 1;
        else if (x.pointsSeat !== null) score[x.pointsSeat] += 1;
        else for (let i = 0; i < n; i++) score[i] += 1 / n;
      }
      const ko = rs.filter((x) => (x.knockedOut ?? []).length > 0);
      const koDay = ko.reduce((a, x) => a + x.knockedOut[0].day, 0) / Math.max(1, ko.length);
      const day = dec.reduce((a, x) => a + x.day, 0) / Math.max(1, dec.length);
      const battles = rs.reduce((a, x) => a + x.battles, 0) / rs.length;
      out.push(`| ${id} | ${n} | ${rs.length} | ${dec.length} (${hold}) | ${dec.length ? day.toFixed(1) : '—'} | ${score.map((v) => pct(v / rs.length)).join(', ')} | ${ko.length ? `${ko.length} matches, day ${koDay.toFixed(1)}` : '—'} | ${battles.toFixed(1)} |`);
    }
    out.push('');
  }

  const duels = results.filter((r) => r.duel1v1);
  if (duels.length) {
    out.push('## Random maps, one against one (every pairing, both seats)');
    out.push('');
    const types = [...new Set(duels.map((r) => r.job.mapType))];
    const sizes = [...new Set(duels.map((r) => r.job.size))];
    out.push(`Generated maps (${sizes.join(', ')}; types ${types.join(', ')}), few wandering monsters, last empire standing. Each map is played twice, once from each seat, so the map and the first move cancel out. A match undecided at the day cap counts for a side at least 25% stronger in armies, else a draw (half a win each).`);
    out.push('');
    // Points for the job's side a (seat 1) and side b (seat 2).
    const ptsA = (r) => {
      const x = r.duel1v1;
      if (x.winnerSeat !== null) return x.winnerSeat === 0 ? 1 : 0;
      return x.pointsSeat === 0 ? 1 : x.pointsSeat === 1 ? 0 : 0.5;
    };
    const decided = duels.filter((r) => r.duel1v1.winnerSeat !== null);
    const seat1 = duels.reduce((n, r) => n + ptsA(r), 0) / duels.length;
    const draws = duels.filter((r) => r.duel1v1.winnerSeat === null && r.duel1v1.pointsSeat === null).length;
    out.push(`${duels.length} matches · ${decided.length} decided by elimination (mean day ${(decided.reduce((a, r) => a + r.duel1v1.day, 0) / Math.max(1, decided.length)).toFixed(1)}) · ${duels.length - decided.length - draws} scored on army strength at the day cap · ${draws} draws · **first seat score ${pct(seat1)}** (0.50 = no seat advantage).`);
    out.push('');
    const cell = new Map();
    const add = (k, v) => {
      const c = cell.get(k) ?? { s: 0, n: 0 };
      c.s += v;
      c.n += 1;
      cell.set(k, c);
    };
    for (const r of duels) {
      const a = ptsA(r);
      add(`${r.job.a}|${r.job.b}`, a);
      add(`${r.job.b}|${r.job.a}`, 1 - a);
      add(`${r.job.a}|@${r.job.mapType}`, a);
      add(`${r.job.b}|@${r.job.mapType}`, 1 - a);
    }
    out.push(matrixTable(P, (a, b) => {
      const c = cell.get(`${a}|${b}`);
      return c ? c.s / c.n : null;
    }));
    out.push('');
    const avgOf = (p) => {
      const vals = P.filter((q) => q !== p).map((q) => cell.get(`${p}|${q}`)).filter(Boolean);
      return vals.reduce((a, c) => a + c.s / c.n, 0) / Math.max(1, vals.length);
    };
    const nOf = (p) => P.filter((q) => q !== p).reduce((n, q) => n + (cell.get(`${p}|${q}`)?.n ?? 0), 0);
    out.push('| Pantheon | Matches | Average score | Target 0.45–0.55 |');
    out.push('|---|---|---|---|');
    for (const p of P) {
      const v = avgOf(p);
      out.push(`| ${NAMES[p]} | ${nOf(p)} | ${pct(v)} | ${v >= 0.45 && v <= 0.55 ? 'yes' : '**no**'} |`);
    }
    out.push('');
    if (types.length > 1) {
      out.push('By map type (each pantheon\'s score on that type, all opponents):');
      out.push('');
      out.push(`| Map type | ${P.map((p) => NAMES[p]).join(' | ')} |`);
      out.push(`|---|${P.map(() => '---').join('|')}|`);
      for (const t of types) out.push(`| ${t} | ${P.map((p) => {
        const c = cell.get(`${p}|@${t}`);
        return c ? `${pct(c.s / c.n)}${c.s / c.n < LAYOUT_FLOOR ? ' ⚠' : ''} (${c.n})` : '—';
      }).join(' | ')} |`);
      out.push('');
      // Layout floor (proposed 2026-10-07): no pantheon under 0.40 on any map type. A cell fails only when even
      // the top of its one-sided 95% range is under the floor (a few dozen matches per cell are noisy).
      const below = [];
      const watch = [];
      for (const t of types)
        for (const p of P) {
          const c = cell.get(`${p}|@${t}`);
          if (!c || c.s / c.n >= LAYOUT_FLOOR) continue;
          const v = c.s / c.n;
          const top = v + 1.645 * Math.sqrt(0.25 / c.n);
          (top < LAYOUT_FLOOR ? below : watch).push({ t, p, v, n: c.n, top });
        }
      out.push(`Layout floor (proposed): every pantheon at least ${pct(LAYOUT_FLOOR)} on every map type. ⚠ marks a cell under it; a cell **fails** when the top of its one-sided 95% range (score + 1.645 × √(0.25 ÷ matches)) is still under the floor, otherwise it is only watched (not enough matches to tell).`);
      out.push('');
      out.push(below.length ? `**Below the floor:** ${below.map((x) => `${NAMES[x.p]} on ${x.t} ${pct(x.v)} (${x.n} matches, at most ${pct(x.top)})`).join('; ')}.` : '**Below the floor:** none.');
      out.push('');
      if (watch.length) {
        out.push(`Watched (under the floor, within the noise): ${watch.map((x) => `${NAMES[x.p]} on ${x.t} ${pct(x.v)} (${x.n} matches, up to ${pct(x.top)})`).join('; ')}.`);
        out.push('');
      }
      layoutFailures.push(...below);
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
if (layoutFailures.length) console.log(`[balance] below the layout floor: ${layoutFailures.map((x) => `${x.p} on ${x.t} ${x.v.toFixed(2)} (${x.n})`).join('; ')}`);
if (opts.check && layoutFailures.length) process.exitCode = 1;
