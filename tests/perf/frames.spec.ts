import { test, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { GameDriver } from '@pr/testing';
import { clickHex, waitFor } from '../e2e/helpers';
import { approachTile, importAndLoad, slots, writeSave } from '../e2e/fixtures';
import { leaderOf, toHumanBattleTurn, usePrefs } from '../e2e/momentFixtures';

/**
 * Frame timing of the adventure map and the battle on High graphics, scenario
 * by scenario, read from the renderer's own counters (`__prFrames`, read-only).
 * Writes test-results/perf/<PERF_LABEL>.json. Observes only: every scenario
 * acts through the real screens.
 */

interface Frames {
  fps: number;
  drawnFps: number;
  calmShare: number;
  calmFrames: number;
  frames: number;
  avgMs: number;
  p95Ms: number;
  worstMs: number;
  tickMs: number;
  renderMs: number;
  gpuMs: number | null;
  drawCalls: number | null;
  uploadKb: number | null;
  total: number;
  slow: number;
  pendingUploads: number;
  width: number;
  height: number;
  resolution: number;
  objects: number;
  renderables: number;
}

const results: Record<string, unknown>[] = [];
const label = process.env.PERF_LABEL ?? 'frames';
const gpu = process.env.PERF_GPU === '1';
const query = `/?e2e${gpu ? '&gputime' : ''}${process.env.PERF_QUERY ? `&${process.env.PERF_QUERY}` : ''}`;
const quick = process.env.PERF_QUICK === '1';

const now = (page: Page) => page.evaluate(() => performance.now());
const frames = (page: Page, since?: number) => page.evaluate((s) => (globalThis as unknown as { __prFrames: (s?: number) => Frames | null }).__prFrames(s ?? undefined), since ?? null);

/** Wait (up to a minute) until every loaded picture has been sent to the GPU: a scenario measures play, not loading. */
async function settled(page: Page) {
  for (let i = 0; i < 120; i++) {
    const f = await frames(page);
    if (f && f.pendingUploads === 0) return;
    await page.waitForTimeout(500);
  }
}

/** Run `act` (or wait) for at least `ms`, then record the frames drawn meanwhile. */
const only = process.env.PERF_ONLY ? new Set(process.env.PERF_ONLY.split(',')) : null;

async function measure(page: Page, name: string, ms: number, act?: (until: number) => Promise<void>) {
  if (only && !only.has(name)) return null;
  await settled(page);
  await page.waitForTimeout(400);
  const t0 = await now(page);
  const start = Date.now();
  if (act) await act(start + ms);
  const left = ms - (Date.now() - start);
  if (left > 0) await page.waitForTimeout(left);
  const f = (await frames(page, t0))!;
  const elapsed = (await now(page)) - t0;
  const cam = await page.evaluate(() => (globalThis as unknown as { __prCamera?: () => unknown }).__prCamera?.() ?? null);
  // The ground cache's own work so far (chunks drawn, main-thread ms), on the map.
  const cache = await page.evaluate(() => ((globalThis as unknown as { __prGround?: () => { cache?: unknown } | null }).__prGround?.() ?? null)?.cache ?? null);
  const row = {
    scenario: name,
    cam,
    // fps: frames at full pace (something moving); drawnFps: every frame drawn, calm ones included (frame pacing).
    fps: f.frames ? Math.round(f.fps * 10) / 10 : null,
    drawnFps: Math.round(f.drawnFps * 10) / 10,
    calmShare: Math.round(f.calmShare * 100) / 100,
    avgMs: Math.round(f.avgMs * 10) / 10,
    p95Ms: Math.round(f.p95Ms * 10) / 10,
    worstMs: Math.round(f.worstMs * 10) / 10,
    tickMs: Math.round(f.tickMs * 100) / 100,
    renderMs: Math.round(f.renderMs * 100) / 100,
    gpuMs: f.gpuMs === null ? null : Math.round(f.gpuMs * 10) / 10,
    drawCalls: f.drawCalls === null ? null : Math.round(f.drawCalls),
    uploadKb: f.uploadKb === null ? null : Math.round(f.uploadKb),
    objects: f.objects,
    renderables: f.renderables,
    canvas: `${f.width}x${f.height}@${f.resolution}`,
    groundCache: cache,
    seconds: Math.round(elapsed / 100) / 10,
  };
  results.push(row);
  console.log(JSON.stringify(row));
  return row;
}

/** Drag the map in a slow circle until `until` (Date.now()). */
async function pan(page: Page, until: number) {
  const vp = page.viewportSize()!;
  const cx = vp.width / 2;
  const cy = vp.height / 2;
  let a = 0;
  while (Date.now() < until) {
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    for (let i = 0; i < 12 && Date.now() < until; i++) {
      a += 0.35;
      await page.mouse.move(cx + Math.cos(a) * 220, cy + Math.sin(a) * 140, { steps: 3 });
    }
    await page.mouse.up();
  }
}

async function zoom(page: Page, until: number) {
  const vp = page.viewportSize()!;
  await page.mouse.move(vp.width / 2, vp.height / 2);
  let dir = -1;
  while (Date.now() < until) {
    for (let i = 0; i < 6 && Date.now() < until; i++) {
      await page.mouse.wheel(0, dir * 120);
      await page.waitForTimeout(60);
    }
    dir = -dir;
  }
}

async function freshLoad(page: Page, d: GameDriver, name: string) {
  await page.goto(query, { waitUntil: 'networkidle' });
  await page.evaluate(() => new Promise<void>((done) => {
    const req = indexedDB.deleteDatabase('pantheon-realms');
    req.onsuccess = req.onerror = req.onblocked = () => done();
  }));
  await page.goto(query, { waitUntil: 'networkidle' });
  await importAndLoad(page, writeSave(d, name));
}

test.describe.configure({ mode: 'serial' });

test.beforeEach(async ({ page }) => {
  await usePrefs(page, { graphicsQuality: 'high', graphicsTested: true, battleSpeed: '1', adventureAnimation: 'normal' });
});

test('adventure map: Twin Harbors (explored) idle, pan, zoom, a hero walking', async ({ page }) => {
  const d = GameDriver.mission('skirmish_twin_harbors', { matchId: 'perf-map' });
  for (const fog of Object.values(d.state.fog)) fog.explored = fog.explored.map(() => 1);
  leaderOf(d).movementPoints = 3000;
  await freshLoad(page, d, 'perf map');
  await waitFor(page, (x) => x.screen === 'adventure' && x.overlays.length === 0, 'adventure', 60_000);
  await page.waitForTimeout(2500);
  await measure(page, 'map-idle', 6000);
  await measure(page, 'map-pan', 6000, (u) => pan(page, u));
  if (quick) return;
  await measure(page, 'map-zoom', 6000, (u) => zoom(page, u));
  // A long walk: the far side of the map along the road.
  const h = leaderOf(d);
  const dest = { q: h.position.q + 9, r: h.position.r };
  await measure(page, 'map-walk', 6000, async () => {
    await clickHex(page, dest.q, dest.r);
    await clickHex(page, dest.q, dest.r);
  });
});

test('adventure map: a huge random map with six empires, idle and pan', async ({ page }) => {
  if (only && !only.has('huge-idle') && !only.has('huge-pan')) return;
  await page.goto(query, { waitUntil: 'networkidle' });
  await page.getByTestId('menu-new').click();
  await page.getByTestId('mode-random').click();
  await page.getByTestId('random-count-6').click();
  await page.getByTestId('random-size-huge').click();
  await page.getByTestId('random-start').click();
  await waitFor(page, (x) => x.screen === 'adventure' && x.overlays.length === 0, 'adventure', 120_000);
  await page.waitForTimeout(3000);
  await measure(page, 'huge-idle', 6000);
  await measure(page, 'huge-pan', 6000, (u) => pan(page, u));
});

test('battle: two full armies, idle and auto-combat', async ({ page }) => {
  if (only && !only.has('battle-idle') && !only.has('battle-auto')) return;
  const d = GameDriver.mission('skirmish_twin_harbors', { matchId: 'perf-battle' });
  for (const fog of Object.values(d.state.fog)) fog.explored = fog.explored.map(() => 1);
  const gold = d.catalog.missions['skirmish_twin_harbors']!.sites.find((x) => x.id === 'sk_gold')!.coord;
  const h = leaderOf(d);
  h.army.slots = slots([['hoplite', 40], ['peltast', 30], ['griffin', 12], ['cavalry', 10], ['temple_adept', 8], ['minotaur', 5], ['cyclops', 3]]);
  h.position = approachTile(d, gold, h.id);
  h.movementPoints = 3000;
  d.state.world.sites['sk_gold']!.guard = [
    { creatureId: 'hoplite', count: 60 },
    { creatureId: 'peltast', count: 40 },
    { creatureId: 'griffin', count: 14 },
    { creatureId: 'cavalry', count: 12 },
    { creatureId: 'minotaur', count: 6 },
    { creatureId: 'cyclops', count: 3 },
  ];
  d.do({ kind: 'MoveHero', heroId: h.id, destination: gold, confirmEncounter: true });
  await freshLoad(page, d, 'perf battle');
  await toHumanBattleTurn(page);
  await page.waitForTimeout(2000);
  await measure(page, 'battle-idle', 6000);
  await page.getByTestId('battle-auto').click();
  await measure(page, 'battle-auto', 15000);
});

test.afterAll(() => {
  mkdirSync('test-results/perf', { recursive: true });
  writeFileSync(`test-results/perf/${label}.json`, JSON.stringify({ label, gpu, dpr: Number(process.env.PERF_DPR ?? 1), results }, null, 1));
});
