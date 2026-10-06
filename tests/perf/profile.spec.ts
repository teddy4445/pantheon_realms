import { test, type CDPSession, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { GameDriver } from '@pr/testing';
import { clickHex, waitFor } from '../e2e/helpers';
import { approachTile, importAndLoad, slots, writeSave } from '../e2e/fixtures';
import { leaderOf, toHumanBattleTurn, usePrefs } from '../e2e/momentFixtures';

/**
 * CPU profiles of the main thread (Chrome DevTools protocol) while the map
 * idles, pans, and a battle idles: self time per function, top entries.
 * Build with PR_NO_MINIFY=1 for readable names. Writes test-results/perf/profile-<label>.json.
 */

interface Node { id: number; callFrame: { functionName: string; url: string; lineNumber: number }; hitCount?: number; children?: number[] }

const label = process.env.PERF_LABEL ?? 'profile';
const out: Record<string, unknown> = {};

/** Wait (up to a minute) until every loaded picture has been sent to the GPU. */
async function settled(page: Page) {
  for (let i = 0; i < 120; i++) {
    const n = await page.evaluate(() => (globalThis as unknown as { __prFrames: () => { pendingUploads: number } | null }).__prFrames()?.pendingUploads ?? 1);
    if (n === 0) return;
    await page.waitForTimeout(500);
  }
}

async function profile(page: Page, cdp: CDPSession, name: string, ms: number, act?: (until: number) => Promise<void>) {
  await settled(page);
  await cdp.send('Profiler.enable');
  await cdp.send('Profiler.setSamplingInterval', { interval: 200 });
  await cdp.send('Profiler.start');
  const start = Date.now();
  if (act) await act(start + ms);
  const left = ms - (Date.now() - start);
  if (left > 0) await page.waitForTimeout(left);
  const { profile } = (await cdp.send('Profiler.stop')) as { profile: { nodes: Node[]; startTime: number; endTime: number; samples: number[]; timeDeltas: number[] } };
  const total = (profile.endTime - profile.startTime) / 1000;
  const byId = new Map(profile.nodes.map((n) => [n.id, n]));
  const self = new Map<number, number>();
  for (let i = 0; i < profile.samples.length; i++) self.set(profile.samples[i]!, (self.get(profile.samples[i]!) ?? 0) + (profile.timeDeltas[i] ?? 0) / 1000);
  const agg = new Map<string, number>();
  for (const [id, t] of self) {
    const n = byId.get(id)!;
    const file = n.callFrame.url.split('/').pop() ?? '';
    const key = `${n.callFrame.functionName || '(anon)'} ${file}:${n.callFrame.lineNumber}`;
    agg.set(key, (agg.get(key) ?? 0) + t);
  }
  const top = [...agg.entries()].sort((a, b) => b[1] - a[1]).slice(0, 40).map(([k, t]) => ({ fn: k, ms: Math.round(t), pct: Math.round((t / total) * 1000) / 10 }));
  out[name] = { totalMs: Math.round(total), top };
  console.log(`== ${name} (${Math.round(total)} ms)`);
  for (const r of top.slice(0, 25)) console.log(`${String(r.pct).padStart(5)}%  ${String(r.ms).padStart(6)} ms  ${r.fn}`);
}

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

test.describe.configure({ mode: 'serial' });
test.beforeEach(async ({ page }) => usePrefs(page, { graphicsQuality: 'high', graphicsTested: true }));

test('profile the map and a battle', async ({ page }) => {
  const cdp = await page.context().newCDPSession(page);
  const d = GameDriver.mission('skirmish_twin_harbors', { matchId: 'perf-prof' });
  for (const fog of Object.values(d.state.fog)) fog.explored = fog.explored.map(() => 1);
  leaderOf(d).movementPoints = 3000;
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  if (process.env.PERF_ONLY === 'battle') return battle();
  await importAndLoad(page, writeSave(d, 'perf prof'));
  await waitFor(page, (x) => x.screen === 'adventure' && x.overlays.length === 0, 'adventure', 60_000);
  await page.waitForTimeout(3000);
  await profile(page, cdp, 'map-idle', 6000);
  await profile(page, cdp, 'map-pan', 6000, (u) => pan(page, u));
  await profile(page, cdp, 'map-zoom', 6000, async (until) => {
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
  });
  const hero = leaderOf(d);
  await profile(page, cdp, 'map-walk', 6000, async () => {
    await clickHex(page, hero.position.q + 9, hero.position.r);
    await clickHex(page, hero.position.q + 9, hero.position.r);
  });
  if (process.env.PERF_ONLY === 'map') return;

  await battle();

  async function battle() {
  const b = GameDriver.mission('skirmish_twin_harbors', { matchId: 'perf-prof-b' });
  for (const fog of Object.values(b.state.fog)) fog.explored = fog.explored.map(() => 1);
  const gold = b.catalog.missions['skirmish_twin_harbors']!.sites.find((x) => x.id === 'sk_gold')!.coord;
  const h = leaderOf(b);
  h.army.slots = slots([['hoplite', 40], ['peltast', 30], ['griffin', 12], ['cavalry', 10], ['temple_adept', 8], ['minotaur', 5], ['cyclops', 3]]);
  h.position = approachTile(b, gold, h.id);
  h.movementPoints = 3000;
  b.do({ kind: 'MoveHero', heroId: h.id, destination: gold, confirmEncounter: true });
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await page.evaluate(() => new Promise<void>((done) => { const r = indexedDB.deleteDatabase('pantheon-realms'); r.onsuccess = r.onerror = r.onblocked = () => done(); }));
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await importAndLoad(page, writeSave(b, 'perf prof b'));
  await toHumanBattleTurn(page);
  await page.waitForTimeout(2000);
  await profile(page, cdp, 'battle-idle', 6000);
  await page.getByTestId('battle-auto').click();
  await profile(page, cdp, 'battle-auto', 12000);
  }
});

test.afterAll(() => {
  mkdirSync('test-results/perf', { recursive: true });
  writeFileSync(`test-results/perf/profile-${label}.json`, JSON.stringify(out, null, 1));
});
