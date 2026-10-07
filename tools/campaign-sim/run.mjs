#!/usr/bin/env node
/**
 * Campaign simulation runner (development tool; never packaged in the game).
 *
 *   npm run campaign-sim                          # the 35 Winter Oath and arc missions, 20 journeys each campaign
 *   npm run campaign-sim -- --runs 40 --jobs 4
 *   npm run campaign-sim -- --campaigns winter_oath,new_fire --max-day 70
 *
 * Options:
 *   --campaigns a,b   campaign IDs (default: winter_oath, twelfth_hour, lantern_road, silver_branch, new_fire)
 *   --runs N          journeys per campaign (default 20); each journey plays every mission once
 *   --max-day N       a mission not won by this day counts as a timeout (default 56)
 *   --jobs N          parallel worker processes (default: CPU count, max 8)
 *   --out DIR         report folder (default: balance-reports/)
 *
 * A journey plays the campaign's missions in order with the normal carry-over;
 * after a mission that is not won, the rest start directly (their own starting
 * hero). The player's seat is played by the mission autopilot
 * (tools/campaign-sim/pilot.ts), every other side by the shipped AI.
 *
 * Writes <out>/campaign-sim-<timestamp>.md (readable report) and .json (raw results).
 * Every number is a measurement with the computer playing the player's side, not a playtest.
 */
import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { cpus } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const DEFAULT_CAMPAIGNS = ['winter_oath', 'twelfth_hour', 'lantern_road', 'silver_branch', 'new_fire'];
const NAMES = { winter_oath: 'The Winter Oath', twelfth_hour: 'The Twelfth Hour', lantern_road: 'The Lantern Road', silver_branch: 'The Silver Branch', new_fire: 'The New Fire', three_beacons: 'The Three Beacons' };

function parseArgs(argv) {
  const o = { campaigns: DEFAULT_CAMPAIGNS, runs: 20, maxDay: 56, jobs: Math.min(8, Math.max(1, cpus().length)), out: join(ROOT, 'balance-reports') };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    if (a === '--campaigns') o.campaigns = next().split(',');
    else if (a === '--runs') o.runs = Number(next());
    else if (a === '--max-day') o.maxDay = Number(next());
    else if (a === '--jobs') o.jobs = Number(next());
    else if (a === '--out') o.out = resolve(next());
    else if (a === '--help' || a === '-h') {
      console.log(readFileSync(fileURLToPath(import.meta.url), 'utf8').split('*/')[0]);
      process.exit(0);
    } else throw new Error(`Unknown argument ${a}`);
  }
  return o;
}

function runShard(opts, shard, shards, outDir) {
  const require = createRequire(import.meta.url);
  const vitest = join(dirname(require.resolve('vitest/package.json')), 'vitest.mjs');
  const env = { ...process.env, CAMPAIGN_SIM_OPTS: JSON.stringify({ campaigns: opts.campaigns, runs: opts.runs, maxDay: opts.maxDay, shard, shards, outDir }) };
  return new Promise((ok, fail) => {
    const child = spawn(process.execPath, [vitest, 'run', '--config', 'tools/campaign-sim/vitest.config.ts', 'tools/campaign-sim/campaign.measure.ts'], { cwd: ROOT, env, stdio: ['ignore', 'pipe', 'pipe'] });
    let err = '';
    child.stdout.on('data', (b) => {
      for (const line of String(b).split('\n')) if (line.startsWith('[campaign-sim]')) console.log(line);
    });
    child.stderr.on('data', (b) => (err += b));
    child.on('exit', (code) => (code === 0 ? ok() : fail(new Error(`shard ${shard} failed (${code})\n${err.slice(-2000)}`))));
  });
}

const pct = (x) => `${Math.round(x * 100)}%`;
const median = (xs) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
};
const mostCommon = (xs) => {
  const m = new Map();
  for (const x of xs) m.set(x, (m.get(x) ?? 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1])[0] ?? null;
};

/** The verdict for one mission (proposed thresholds, written in the report). */
function verdict(rs) {
  const won = rs.filter((r) => r.outcome === 'victory');
  const rate = won.length / rs.length;
  const notWon = rs.filter((r) => r.outcome !== 'victory');
  const blocks = notWon.flatMap((r) => r.blocks);
  const fight = blocks.filter((b) => b.kind === 'fight');
  const gate = blocks.filter((b) => b.kind === 'unreachable');
  const worst = median(won.map((r) => r.worstLoss)) ?? 0;
  if (rate < 0.25) {
    if (gate.length >= Math.max(1, notWon.length / 2)) return { tag: 'blocked by a gate or terrain', why: mostCommon(gate.map((b) => `${b.objectiveId}: ${b.detail}`))?.[0] ?? '' };
    if (fight.length >= Math.max(1, notWon.length / 2)) return { tag: 'blocked by a fight', why: mostCommon(fight.map((b) => `${b.objectiveId}: ${b.detail}`))?.[0] ?? '' };
    return { tag: 'nearly unwinnable', why: mostCommon(notWon.map((r) => r.reason ?? 'not won'))?.[0] ?? '' };
  }
  if (rate < 0.6) return { tag: 'hard', why: mostCommon(notWon.map((r) => (r.blocks[0] ? `${r.blocks[0].objectiveId}: ${r.blocks[0].detail}` : (r.reason ?? 'not won'))))?.[0] ?? '' };
  if (rate >= 0.95 && worst < 0.1) return { tag: 'too easy', why: `every run won; the costliest battle took a median ${pct(worst)} of the army` };
  return { tag: 'ok', why: '' };
}

function render(opts, results, seconds, contentVersion) {
  const out = [];
  out.push(`# Campaign simulation — ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC`);
  out.push('');
  out.push(`Content \`${contentVersion}\` · ${opts.campaigns.length} campaigns · ${opts.runs} journeys each · day cap ${opts.maxDay} per mission · ${opts.jobs} worker(s) · ${(seconds / 60).toFixed(1)} min.`);
  out.push('');
  out.push('The computer plays the player\'s side with the mission autopilot (it serves the active objectives — recruit, train, build, commit a god, claim, activate, take a town — and attacks a guarded objective only when a quick battle on the current state wins; otherwise it plays like the computer empires). Every other side is the shipped AI. A journey plays the seven missions in order with carry-over; after a mission that is not won, the rest start directly with their own starting hero. **These are computer-played measurements, not playtests**: the autopilot is quicker and more literal than a person, so days are short and "too easy" means the fights never cost much, not that a person would find the mission dull.');
  out.push('');
  out.push('Verdicts (proposed thresholds): **nearly unwinnable** below 25% wins; **blocked by a fight / a gate** when most lost runs stopped at the same guarded objective or one it could not reach; **hard** 25–60%; **too easy** when every run (at least 95%) was won and the costliest battle took a median of less than 10% of the army\'s value; otherwise **ok**.');
  out.push('');
  for (const c of opts.campaigns) {
    const rs = results.filter((r) => r.campaignId === c);
    if (!rs.length) continue;
    out.push(`## ${NAMES[c] ?? c}`);
    out.push('');
    const journeys = new Map();
    for (const r of rs) journeys.set(r.run, [...(journeys.get(r.run) ?? []), r]);
    const full = [...journeys.values()].filter((j) => j.every((r) => r.outcome === 'victory')).length;
    out.push(`${journeys.size} journeys · **${full}** won every mission in one go (carry-over all the way).`);
    out.push('');
    out.push('| # | Mission | Runs | Won | Carried starts | Median day (won) | Hero level at end (median) | Costliest battle (median share lost) | Battles lost | Verdict | Notes |');
    out.push('|---|---|---|---|---|---|---|---|---|---|---|');
    const missions = [...new Set(rs.map((r) => r.missionId))].sort((a, b) => rs.find((r) => r.missionId === a).order - rs.find((r) => r.missionId === b).order);
    for (const m of missions) {
      const ms = rs.filter((r) => r.missionId === m);
      const won = ms.filter((r) => r.outcome === 'victory');
      const v = verdict(ms);
      const worstNames = mostCommon(won.map((r) => r.worstBattle).filter(Boolean))?.[0] ?? '—';
      out.push(
        `| ${ms[0].order} | \`${m}\` | ${ms.length} | ${won.length} (${pct(won.length / ms.length)}) | ${ms.filter((r) => r.start === 'carried').length} | ${median(won.map((r) => r.day)) ?? '—'} | ${median(ms.map((r) => r.heroLevel)) ?? '—'} | ${won.length ? `${pct(median(won.map((r) => r.worstLoss)))} (${worstNames})` : '—'} | ${ms.reduce((n, r) => n + r.battlesLost, 0)} | **${v.tag}** | ${v.why.replace(/\|/g, '/')} |`,
      );
    }
    out.push('');
    const lost = rs.filter((r) => r.outcome !== 'victory');
    if (lost.length) {
      out.push('Runs not won:');
      out.push('');
      for (const r of lost.slice(0, 12)) out.push(`- \`${r.missionId}\` run ${r.run} (${r.start}): ${r.outcome} on day ${r.day}${r.reason ? ` — ${r.reason}` : ''}${r.open.length ? `; open: ${r.open.join(', ')}` : ''}${r.blocks.length ? `; ${r.blocks.map((b) => `${b.objectiveId} ${b.kind}: ${b.detail}${b.ratio ? ` (strength ratio ${b.ratio.toFixed(2)})` : ''}`).join('; ')}` : ''}`);
      if (lost.length > 12) out.push(`- … and ${lost.length - 12} more (see the JSON).`);
      out.push('');
    }
  }
  return out.join('\n');
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const tmp = join(opts.out, `.campaign-sim-${stamp}`);
  mkdirSync(tmp, { recursive: true });
  const shards = Math.max(1, Math.min(opts.jobs, opts.campaigns.length * opts.runs));
  console.log(`[campaign-sim] campaigns=${opts.campaigns.join(',')} runs=${opts.runs} maxDay=${opts.maxDay} jobs=${shards}`);
  const t0 = Date.now();
  await Promise.all(Array.from({ length: shards }, (_, s) => runShard(opts, s, shards, tmp)));
  const parts = readdirSync(tmp).filter((f) => f.startsWith('shard-')).map((f) => JSON.parse(readFileSync(join(tmp, f), 'utf8')));
  const results = parts.flatMap((p) => p.results).sort((a, b) => (a.campaignId < b.campaignId ? -1 : a.campaignId > b.campaignId ? 1 : a.run - b.run || a.order - b.order));
  const seconds = (Date.now() - t0) / 1000;
  const md = render({ ...opts, jobs: shards }, results, seconds, parts[0]?.contentVersion ?? '?');
  const base = join(opts.out, `campaign-sim-${stamp}`);
  writeFileSync(`${base}.md`, md);
  writeFileSync(`${base}.json`, JSON.stringify({ opts, seconds, results }, null, 1));
  rmSync(tmp, { recursive: true, force: true });
  console.log(`[campaign-sim] ${results.length} mission runs in ${(seconds / 60).toFixed(1)} min → ${base}.md`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
