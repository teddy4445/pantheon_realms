import { test, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { GameDriver } from '@pr/testing';
import { axialDistance, hexKey, reachableTiles, siteAt, type HexCoord, type MatchState } from '@pr/rules';
import { inspect, readStory } from '../e2e/helpers';
import { importAndLoad, slots, writeSave } from '../e2e/fixtures';
import { usePrefs } from '../e2e/momentFixtures';

/**
 * A full test game on High graphics, measured frame by frame: Twin Harbors from
 * day 1 against the computer, played through the real screens — the hero
 * marches east along the road a stretch at a time, the player pans and zooms
 * the map, ends the day and watches the rival's turn; on the way the hero
 * fights the gold mine's guard (auto-combat at normal speed) and goes on.
 *
 * Frames come from the renderer's own counters (`__prFrames`, read-only),
 * polled once a second and booked to what was on screen then (`__prScreen`,
 * read-only and light): the map on the player's turn, the map on the
 * computer's turn, the battle. Long tasks on the main thread are recorded
 * too, to tell drawing from game logic. The test's own heavy reads of the
 * whole state (`__prInspect`, a deep copy) are timed and their frames left out.
 * Writes test-results/perf/fullgame-<PERF_LABEL>.json.
 *
 * Env: PERF_LABEL, PERF_DAYS (default 7), PERF_QUERY (extra URL query),
 * PERF_ADAPTIVE=0 (adaptive resolution off), PERF_GPU=1 (`?gputime`: wait for
 * the GPU after each frame, so the renderer's main-thread time is its own).
 */

interface Frames {
  fps: number;
  tickMs: number;
  renderMs: number;
  workMaxMs: number;
  gpuMs: number | null;
  frames: number;
  slowFrames: number;
  avgMs: number;
  p95Ms: number;
  worstMs: number;
  resolution: number;
  resolutionScale: number;
  width: number;
  height: number;
}
interface Screen {
  screen: string;
  overlays: string[];
  story: number;
  busy: boolean;
  humanTurn: boolean;
  day: number;
  revision: number;
  battle: boolean;
  battlePhase: string | null;
}

const label = process.env.PERF_LABEL ?? 'fullgame';
const days = Number(process.env.PERF_DAYS ?? 7);
const query = `/?e2e${process.env.PERF_GPU === '1' ? '&gputime' : ''}${process.env.PERF_QUERY ? `&${process.env.PERF_QUERY}` : ''}`;

const screenOf = (page: Page) => page.evaluate(() => (globalThis as unknown as { __prScreen: () => Screen }).__prScreen());

async function until(page: Page, pred: (s: Screen) => boolean, what: string, ms = 60_000): Promise<Screen> {
  const t0 = Date.now();
  let s = await screenOf(page);
  while (!pred(s)) {
    if (Date.now() - t0 > ms) throw new Error(`Timed out waiting for ${what} (screen=${s.screen}, overlays=${s.overlays.join(',')})`);
    if (s.story > 0) await readStory(page);
    await page.waitForTimeout(200);
    s = await screenOf(page);
  }
  return s;
}

interface Phase {
  work: number;
  workMax: number;
  gpu: number;
  frames: number;
  slow: number;
  sumMs: number;
  worst: number;
  windows: number;
  p95s: number[];
  worstAt: { t: number; ms: number }[];
  /** Seconds whose busiest frame held the main thread over 16 ms (when, how long). */
  workAt: { t: number; ms: number }[];
  minScale: number;
}
const phases: Record<string, Phase> = {};
const segments: { t0: number; t1: number; phase: string }[] = [];
const harness: [number, number][] = [];
let stopPolling = false;

function phaseOf(s: Screen): string {
  if (s.screen === 'battle') return 'battle';
  if (s.screen === 'adventure') return s.humanTurn ? 'map (player)' : 'map (computer)';
  return `other (${s.screen})`;
}

/** Poll the frame counters once a second until stopped; book each second to what was on screen. */
async function poll(page: Page) {
  let last = await page.evaluate(() => performance.now());
  while (!stopPolling) {
    await page.waitForTimeout(1000);
    const r = await page.evaluate((since) => {
      const g = globalThis as unknown as { __prFrames: (s?: number) => Frames | null; __prScreen: () => Screen };
      return { now: performance.now(), f: g.__prFrames(since), s: g.__prScreen() };
    }, last).catch(() => null);
    if (!r) continue;
    const t0 = last;
    last = r.now;
    // A second that overlapped the test's own heavy state read is left out (the read, not the game, held the thread).
    if (harness.some(([a, b]) => a < r.now && b > t0)) continue;
    const name = phaseOf(r.s);
    segments.push({ t0, t1: r.now, phase: name });
    if (!r.f || r.f.frames === 0) continue;
    const p = (phases[name] ??= { work: 0, workMax: 0, gpu: 0, frames: 0, slow: 0, sumMs: 0, worst: 0, windows: 0, p95s: [], worstAt: [], workAt: [], minScale: 1 });
    p.work += (r.f.tickMs + r.f.renderMs) * r.f.frames;
    p.workMax = Math.max(p.workMax, r.f.workMaxMs);
    p.gpu += (r.f.gpuMs ?? 0) * r.f.frames;
    p.frames += r.f.frames;
    p.slow += r.f.slowFrames;
    p.sumMs += r.f.avgMs * r.f.frames;
    p.worst = Math.max(p.worst, r.f.worstMs);
    p.windows += 1;
    p.p95s.push(r.f.p95Ms);
    p.minScale = Math.min(p.minScale, r.f.resolutionScale);
    if (r.f.worstMs > 1000 / 30 + 2) p.worstAt.push({ t: Math.round(r.now), ms: Math.round(r.f.worstMs) });
    if (r.f.workMaxMs > 16) p.workAt.push({ t: Math.round(r.now), ms: Math.round(r.f.workMaxMs * 10) / 10 });
  }
}

/** The whole state (a deep copy: heavy), timed so the frames around it are left out. */
async function readState(page: Page): Promise<MatchState> {
  const t0 = await page.evaluate(() => performance.now());
  const s = (await inspect(page)).state as MatchState;
  const t1 = await page.evaluate(() => performance.now());
  harness.push([t0 - 50, t1 + 50]);
  return s;
}

async function project(page: Page, c: HexCoord): Promise<{ x: number; y: number } | null> {
  return page.evaluate(([q, r]) => (globalThis as unknown as { __prProject: (k: string, a: number, b: number) => { x: number; y: number } | null }).__prProject('adventure', q!, r!), [c.q, c.r]);
}

/** Click a map tile twice (show the route, then go), as a player does. */
async function go(page: Page, c: HexCoord): Promise<boolean> {
  const vp = page.viewportSize()!;
  const p = await project(page, c);
  if (!p || p.x < 40 || p.y < 90 || p.x > vp.width - 40 || p.y > vp.height - 90) return false;
  for (let i = 0; i < 2; i++) {
    await page.mouse.move(p.x, p.y, { steps: 4 });
    await page.mouse.down();
    await page.mouse.up();
    await page.waitForTimeout(350);
  }
  return true;
}

/** The reachable tile closest to `goal` (ties: the cheaper, then by key), open ground only, on screen. */
async function stepToward(page: Page, state: MatchState, catalog: GameDriver['catalog'], heroId: string, goal: HexCoord): Promise<HexCoord | null> {
  const reach = reachableTiles(catalog, state, heroId);
  if (reach.has(hexKey(goal))) return goal;
  const options = [...reach.entries()]
    .map(([k, cost]) => {
      const [q, r] = k.split(',').map(Number) as [number, number];
      return { c: { q, r }, cost, d: axialDistance({ q, r }, goal) };
    })
    .filter((o) => !siteAt(catalog, state, o.c))
    .sort((a, b) => a.d - b.d || a.cost - b.cost || hexKey(a.c).localeCompare(hexKey(b.c)));
  for (const o of options.slice(0, 12)) {
    const p = await project(page, o.c);
    const vp = page.viewportSize()!;
    if (p && p.x > 40 && p.y > 90 && p.x < vp.width - 40 && p.y < vp.height - 90) return o.c;
  }
  return null;
}

/** Drag the map around in a circle and come back (a player looking around). */
async function lookAround(page: Page, ms: number) {
  const vp = page.viewportSize()!;
  const cx = vp.width / 2;
  const cy = vp.height / 2;
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  const t0 = Date.now();
  let a = 0;
  while (Date.now() - t0 < ms) {
    a += 0.3;
    await page.mouse.move(cx + Math.cos(a) * 200 - 200, cy + Math.sin(a) * 120, { steps: 3 });
  }
  await page.mouse.move(cx, cy, { steps: 6 });
  await page.mouse.up();
  for (const dir of [-1, -1, -1, 1, 1, 1, 1, 1, -1, -1]) {
    await page.mouse.wheel(0, dir * 120);
    await page.waitForTimeout(120);
  }
}

/** Close whatever opened over the map after a move (a site's message, a level-up). */
async function settleOverlays(page: Page): Promise<Screen> {
  let s = await screenOf(page);
  for (let i = 0; i < 6 && (s.overlays.length > 0 || s.screen === 'level-up' || s.story > 0); i++) {
    if (s.story > 0) await readStory(page);
    else if (s.screen === 'level-up') await page.getByTestId('offer-0').click();
    else if (s.overlays.includes('encounter')) await page.getByTestId('encounter-withdraw').click();
    else if (s.overlays.includes('confirm')) await page.getByTestId('confirm-ok').click();
    else await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
    s = await screenOf(page);
  }
  return s;
}

async function fight(page: Page) {
  let s = await until(page, (x) => x.screen === 'battle' && x.battle, 'battle', 30_000);
  if (s.battlePhase === 'deployment') await page.getByTestId('deploy-confirm').click();
  s = await until(page, (x) => x.screen === 'battle' && x.humanTurn && !x.busy && x.battlePhase !== 'deployment', 'the player’s battle turn', 60_000);
  // A few seconds of looking at the field, then auto-combat at normal speed.
  await page.waitForTimeout(3000);
  await page.getByTestId('battle-auto').click();
  await until(page, (x) => x.screen === 'battle-result', 'battle result', 240_000);
  await page.waitForTimeout(1500);
  await readStory(page);
  await page.getByTestId('result-continue').click();
  await page.waitForTimeout(500);
  s = await screenOf(page);
  if (s.screen === 'level-up') await page.getByTestId('offer-0').click();
  await until(page, (x) => x.screen === 'adventure' && x.overlays.length === 0, 'the map after the battle', 30_000);
}

test.beforeEach(async ({ page }) => {
  await usePrefs(page, { graphicsQuality: 'high', graphicsTested: true, adaptiveResolution: process.env.PERF_ADAPTIVE !== '0' });
  // Long tasks on the main thread (game logic, interface work), recorded from the start.
  await page.addInitScript(() => {
    const g = globalThis as unknown as { __perfLong: [number, number][]; __perfScripts: [number, number, string][] };
    g.__perfLong = [];
    g.__perfScripts = [];
    try {
      new PerformanceObserver((list) => {
        for (const e of list.getEntries()) g.__perfLong.push([e.startTime, e.duration]);
      }).observe({ type: 'longtask', buffered: true });
      // Long animation frames name the scripts that held the thread: the frame callback (drawing) or
      // a timer (the computer's step), the interface (React's scheduler), an input handler.
      new PerformanceObserver((list) => {
        for (const e of list.getEntries() as unknown as { scripts: { startTime: number; duration: number; invoker: string; sourceFunctionName: string }[] }[]) {
          for (const x of e.scripts) if (x.duration >= 8) g.__perfScripts.push([x.startTime, x.duration, `${x.invoker}${x.sourceFunctionName ? ` ${x.sourceFunctionName}` : ''}`]);
        }
      }).observe({ type: 'long-animation-frame', buffered: true });
    } catch {
      // not available
    }
  });
});

test('a full test game on High: map, the computer’s turns and a battle, frame by frame', async ({ page }) => {
  test.setTimeout(60 * 60_000);
  const d = GameDriver.mission('skirmish_twin_harbors', { matchId: 'perf-fullgame' });
  const catalog = d.catalog;
  // A player strong enough to win the mine and hold home for the week (the test plays, it does not plan):
  // a larger army for the hero and a garrison at home.
  d.state.heroes['alexios']!.army.slots = slots([['hoplite', 45], ['peltast', 24], ['griffin', 6], ['cavalry', 4]]);
  const home = Object.values(d.state.towns).find((t) => t.ownerId === d.state.heroes['alexios']!.ownerId);
  if (home) home.garrison.slots = slots([['hoplite', 40], ['peltast', 20], ['minotaur', 3]]);
  const mine = catalog.missions['skirmish_twin_harbors']!.sites.find((x) => x.id === 'sk_gold')!.coord;
  const east = { q: 28, r: 8 };
  await page.goto(query, { waitUntil: 'networkidle' });
  await page.evaluate(() => new Promise<void>((done) => {
    const req = indexedDB.deleteDatabase('pantheon-realms');
    req.onsuccess = req.onerror = req.onblocked = () => done();
  }));
  await page.goto(query, { waitUntil: 'networkidle' });
  await importAndLoad(page, writeSave(d, 'perf full game'));
  await until(page, (x) => x.screen === 'adventure' && x.overlays.length === 0, 'the map', 120_000);
  await page.waitForTimeout(3000);
  const started = Date.now();
  const poller = poll(page);
  const log: string[] = [];
  const note = async (what: string) => log.push(`${Math.round(await page.evaluate(() => performance.now()))} ms: ${what}`);
  let fought = false;
  let ended = '';
  try {
  for (let day = 1; day <= days; day++) {
    await lookAround(page, 2500);
    // March: toward the mine until its guard is beaten, then on to the east.
    for (let leg = 0; leg < 3; leg++) {
      const state = await readState(page);
      const hero = state.heroes['alexios'];
      if (!hero || hero.status !== 'active' || hero.movementPoints < 100) break;
      const goal = fought || state.world.sites['sk_gold']?.cleared ? east : mine;
      const target = await stepToward(page, state, catalog, 'alexios', goal);
      if (!target) break;
      const rev = (await screenOf(page)).revision;
      if (!(await go(page, target))) break;
      const s = await until(page, (x) => (x.revision > rev && !x.busy) || x.overlays.includes('encounter') || x.screen !== 'adventure', 'the move', 60_000).catch(() => null);
      if (!s) break;
      await note(`day ${day}: to ${hexKey(target)}${target === mine ? ' (the mine)' : ''}`);
      if (s.overlays.includes('encounter')) {
        await page.getByTestId('encounter-attack').click();
        await fight(page);
        fought = true;
        await note(`day ${day}: battle at the gold mine`);
        continue;
      }
      if (s.screen === 'battle') {
        await fight(page);
        fought = true;
        continue;
      }
      await settleOverlays(page);
    }
    // End the day; the rival's turn plays on the map.
    const before = await screenOf(page);
    await note(`day ${day}: end of day`);
    await page.getByTestId('end-day').click();
    await page.waitForTimeout(300);
    if ((await screenOf(page)).overlays.includes('confirm')) await page.getByTestId('confirm-ok').click();
    const after = await until(page, (x) => (x.humanTurn && x.day > before.day && !x.busy) || x.screen === 'battle' || x.overlays.includes('game-over'), 'the next day', 300_000);
    if (after.overlays.includes('game-over')) {
      ended = `the game ended on day ${after.day}`;
      break;
    }
    if (after.screen === 'battle') {
      await fight(page);
      await note(`day ${day}: the rival attacked`);
    }
    await settleOverlays(page);
  }
  } catch (e) {
    ended = `stopped: ${e instanceof Error ? e.message.split('\n')[0] : String(e)}`;
  }
  stopPolling = true;
  await poller;
  const long = await page.evaluate(() => (globalThis as unknown as { __perfLong: [number, number][] }).__perfLong);
  const scripts = await page.evaluate(() => (globalThis as unknown as { __perfScripts: [number, number, string][] }).__perfScripts);
  // Main-thread work outside drawing (the frame callback): per phase and kind, how many ran 8 ms or more, 33 ms or more, and the longest.
  const work: Record<string, Record<string, { n: number; over33: number; worst: number }>> = {};
  const worstScripts = scripts
    .filter(([, , what]) => !what.startsWith('FrameRequestCallback'))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([t, ms, what]) => ({ t: Math.round(t), ms: Math.round(ms), what, phase: segments.find((x) => t >= x.t0 && t < x.t1)?.phase ?? '?' }));
  for (const [t, ms, what] of scripts) {
    const seg = segments.find((x) => t >= x.t0 && t < x.t1);
    if (!seg || harness.some(([a, b]) => t >= a && t < b)) continue;
    const kind = what.replace(/\s+\S*$/, (m) => (what.startsWith('FrameRequestCallback') ? '' : m));
    const w = ((work[seg.phase] ??= {})[kind] ??= { n: 0, over33: 0, worst: 0 });
    w.n += 1;
    if (ms >= 33) w.over33 += 1;
    w.worst = Math.max(w.worst, Math.round(ms));
  }
  const longBy: Record<string, { count: number; ms: number; worst: number }> = {};
  for (const [t, ms] of long) {
    const seg = segments.find((x) => t >= x.t0 && t < x.t1);
    if (!seg) continue;
    const l = (longBy[seg.phase] ??= { count: 0, ms: 0, worst: 0 });
    l.count += 1;
    l.ms += ms;
    l.worst = Math.max(l.worst, ms);
  }
  const summary = Object.fromEntries(
    Object.entries(phases).map(([k, p]) => {
      const sorted = [...p.p95s].sort((a, b) => a - b);
      return [
        k,
        {
          frames: p.frames,
          seconds: Math.round(p.sumMs / 100) / 10,
          fps: Math.round((p.frames / Math.max(1, p.sumMs)) * 10000) / 10,
          slowFrames: p.slow,
          slowShare: `${Math.round((p.slow / Math.max(1, p.frames)) * 10000) / 100} %`,
          worstMs: Math.round(p.worst),
          medianP95Ms: Math.round((sorted[Math.floor(sorted.length / 2)] ?? 0) * 10) / 10,
          minResolutionScale: Math.round(p.minScale * 100) / 100,
          // Main-thread time per frame in the renderer (the views' tick and submitting the frame): mean and longest.
          frameWorkMs: Math.round((p.work / Math.max(1, p.frames)) * 100) / 100,
          frameWorkMaxMs: Math.round(p.workMax * 10) / 10,
          // With ?gputime: the wait for the (emulated) GPU per frame.
          gpuMs: Math.round((p.gpu / Math.max(1, p.frames)) * 10) / 10,
          slowMoments: p.worstAt.slice(0, 20),
          busyFrames: p.workAt,
          longTasks: longBy[k] ?? { count: 0, ms: 0, worst: 0 },
          scripts: work[k] ?? {},
        },
      ];
    }),
  );
  const out = { label, days, ended, worstScripts, minutes: Math.round((Date.now() - started) / 6000) / 10, excludedHarnessReads: harness.length, summary, log };
  console.log(JSON.stringify(out, null, 1));
  mkdirSync('test-results/perf', { recursive: true });
  writeFileSync(`test-results/perf/fullgame-${label}.json`, JSON.stringify(out, null, 1));
});
