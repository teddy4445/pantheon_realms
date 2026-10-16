import { expect, test, type Page } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { GameDriver } from '@pr/testing';
import { createEnvelope, serializeEnvelope, type SessionPresentation } from '@pr/session';
import { axialDistance, deepClone, quoteMovement, routeDays, siteAt, withSharedPaths, type HexCoord, type MatchState } from '@pr/rules';
import { clickHex, endDay, inspect, waitFor } from './helpers';
import { importAndLoad, skirmishDriver } from './fixtures';

/**
 * Planned journeys (handoff "Recruitment & persistent journey", 2026-10-14): a hero's chosen
 * destination is kept over the night, across heroes, screens and save/load, until the hero
 * actually arrives; Continue journey (or the continue-move key, Space by default) walks today's
 * part of it. The route is drawn with the kit's painted markers.
 */

const SHOTS = process.env.PR_SHOTS ?? join(tmpdir(), 'pr-journey-shots');

interface RouteDebug {
  mode: 'painted' | 'drawn' | 'none';
  today: number;
  later: number;
  hourglasses: number;
  destination: 'seal' | 'battle' | 'blocked' | null;
  badge: string | null;
  ring: 'painted' | 'drawn';
  thinned: number;
}
const route = (page: Page) => page.evaluate(() => (globalThis as unknown as { __prRoute: () => RouteDebug | null }).__prRoute());
const project = (page: Page, q: number, r: number) =>
  page.evaluate(([a, b]) => (globalThis as unknown as { __prProject: (k: string, a: number, b: number) => { x: number; y: number } | null }).__prProject('adventure', a!, b!), [q, r]);

function saveWith(d: GameDriver, name: string, presentation?: SessionPresentation): string {
  const env = createEnvelope(d.catalog, presentation ? { match: d.state, campaign: null, presentation } : { match: d.state, campaign: null }, { id: 'manual-1', kind: 'manual', name, savedAt: new Date(0).toISOString() });
  const file = join(tmpdir(), `${name.replace(/\W+/g, '-')}.prsave.json`);
  writeFileSync(file, serializeEnvelope(env));
  return file;
}

async function load(page: Page, file: string) {
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await importAndLoad(page, file);
  await waitFor(page, (s) => s.screen === 'adventure' && s.humanTurn && !s.busy, 'map');
  await page.waitForTimeout(800);
}

/** Free tiles `days` days away for the hero (no site, no battle), farthest last. */
function tilesDaysAway(d: GameDriver, heroId: string, days: number): HexCoord[] {
  const out: { c: HexCoord; cost: number }[] = [];
  withSharedPaths(() => {
    for (let r = 0; r < d.state.world.map.height; r++)
      for (let q = 0; q < d.state.world.map.width; q++) {
        const c = { q, r };
        if (siteAt(d.catalog, d.state, c)) continue;
        const m = quoteMovement(d.catalog, d.state, heroId, c);
        if (m.reachable && !m.endsInEncounter && routeDays(d.catalog, d.state, heroId, m) === days) out.push({ c, cost: m.totalCost });
      }
  });
  return out.sort((a, b) => a.cost - b.cost).map((x) => x.c);
}

/** The first of `tiles` drawn inside the free part of the view (clear of the sidebar and panels). */
async function onScreen(page: Page, tiles: HexCoord[]): Promise<HexCoord> {
  const vp = page.viewportSize()!;
  const pts = await page.evaluate((cs) => cs.map((c) => (globalThis as unknown as { __prProject: (k: string, a: number, b: number) => { x: number; y: number } | null }).__prProject('adventure', c.q, c.r)), tiles);
  const i = pts.findIndex((p) => !!p && p.x >= 420 && p.x <= vp.width - 420 && p.y >= 150 && p.y <= vp.height - 150);
  if (i < 0) throw new Error('no candidate tile on screen');
  return tiles[i]!;
}

const journeys = async (page: Page) => ((await inspect(page)) as unknown as { journeys: SessionPresentation['journeys'] | null }).journeys ?? {};
const heroAt = async (page: Page, id: string): Promise<HexCoord> => (await inspect(page)).state.heroes[id].position;

/** Continue journey through its button; a changed route is accepted first (rivals move between days). */
async function continueJourney(page: Page) {
  const btn = page.getByTestId('journey-continue');
  if ((await btn.textContent())?.includes('Accept new route')) await btn.click();
  const rev = (await inspect(page)).state.revision;
  await btn.click();
  await waitFor(page, (s) => s.state.revision > rev && !s.busy, 'move played', 90_000);
}

test('a three-day journey: chosen once, continued each day, kept over the night, cleared only on arrival', async ({ page }) => {
  test.setTimeout(300_000);
  await page.setViewportSize({ width: 1920, height: 1080 });
  const d = skirmishDriver();
  const hero = 'alexios';
  await load(page, saveWith(d, 'journey three days'));
  // See far enough to pick a destination three days away.
  const canvas = page.locator('canvas').first();
  const box = (await canvas.boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.4, box.y + box.height * 0.5);
  for (let i = 0; i < 6; i++) await page.mouse.wheel(0, 240);
  await page.waitForTimeout(500);
  const target = await onScreen(page, tilesDaysAway(d, hero, 3));
  expect(await journeys(page)).toEqual({});

  // One click chooses the destination: the painted route appears with arrival day 3.
  await clickHex(page, target.q, target.r);
  await expect(page.getByTestId('journey-bar')).toBeVisible();
  let j = await journeys(page);
  expect(j.player?.[hero]?.target).toEqual(target);
  await expect.poll(async () => (await route(page))?.mode).toBe('painted');
  let r = (await route(page))!;
  expect(r.badge).toBe('3');
  expect(r.today).toBeGreaterThan(0);
  expect(r.later).toBeGreaterThan(0);
  // An hourglass where the first later day begins (the third day may begin on the destination itself).
  expect(r.hourglasses).toBeGreaterThanOrEqual(1);
  expect(r.destination).toBe('seal');
  expect(r.ring).toBe('painted');
  await expect(page.getByTestId('journey-status')).toContainText('Arrives in 3 turns');
  await expect(page.getByTestId('journey-continue')).toHaveAttribute('title', /Continue journey \(Space\)/);
  await page.screenshot({ path: join(SHOTS, 'journey-01-planned-day1.png') });

  // Day 1: Continue journey walks today's part; the journey stays.
  await continueJourney(page);
  const night1 = await heroAt(page, hero);
  expect((await journeys(page)).player?.[hero]?.target).toEqual(target);
  await expect(page.getByTestId('journey-continue')).toBeDisabled();
  await expect(page.getByTestId('journey-status')).toContainText('no movement left today');

  // The day ends: the destination is kept, nobody moves by itself.
  await endDay(page);
  expect(await heroAt(page, hero)).toEqual(night1);
  j = await journeys(page);
  expect(j.player?.[hero]?.target).toEqual(target);
  await expect.poll(async () => (await route(page))?.badge).toBe('2');
  await page.screenshot({ path: join(SHOTS, 'journey-02-day2-kept.png') });

  // Day 2: the continue-move key (Space) does the same as the button.
  if ((await page.getByTestId('journey-continue').textContent())?.includes('Accept new route')) await page.getByTestId('journey-continue').click();
  const rev2 = (await inspect(page)).state.revision;
  await page.keyboard.press('Space');
  await waitFor(page, (s) => s.state.revision > rev2 && !s.busy, 'space move', 90_000);
  expect((await journeys(page)).player?.[hero]?.target).toEqual(target);

  // Day 3: arrival clears the journey (only arrival does).
  await endDay(page);
  await expect.poll(async () => (await route(page))?.badge).toBe('1');
  await continueJourney(page);
  expect(await heroAt(page, hero)).toEqual(target);
  expect((await journeys(page)).player?.[hero]).toBeUndefined();
  await expect(page.getByTestId('journey-bar')).toHaveCount(0);
  expect((await route(page))?.mode).toBe('none');
});

test('two heroes keep their own journeys through town, settings, right-click and save/load; Cancel clears one', async ({ page }) => {
  test.setTimeout(300_000);
  await page.setViewportSize({ width: 1920, height: 1080 });
  const d = skirmishDriver();
  const st = d.state as MatchState;
  const alexios = st.heroes['alexios']!;
  st.heroes['ione'] = { ...deepClone(alexios), id: 'ione', name: 'Ione', position: { q: alexios.position.q, r: alexios.position.r + 1 } };
  await load(page, saveWith(d, 'journey two heroes'));
  const canvas = page.locator('canvas').first();
  const box = (await canvas.boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.4, box.y + box.height * 0.5);
  for (let i = 0; i < 4; i++) await page.mouse.wheel(0, 240);
  await page.waitForTimeout(400);
  const a = await onScreen(page, tilesDaysAway(d, 'alexios', 2));
  const b = await onScreen(page, tilesDaysAway(d, 'ione', 3).filter((c) => c.q !== a.q || c.r !== a.r));

  await page.getByTestId('hero-tab-alexios').click();
  await clickHex(page, a.q, a.r);
  await page.getByTestId('hero-tab-ione').click();
  await expect(page.getByTestId('journey-bar')).toHaveCount(0);
  await clickHex(page, b.q, b.r);
  await expect.poll(async () => (await route(page))?.badge).toBe('3');
  let j = await journeys(page);
  expect(j.player?.['alexios']?.target).toEqual(a);
  expect(j.player?.['ione']?.target).toEqual(b);
  // Back to Alexios: his own route again.
  await page.getByTestId('hero-tab-alexios').click();
  await expect.poll(async () => (await route(page))?.badge).toBe('2');
  await expect(page.getByTestId('journey-status')).toContainText('Alexios');

  // Right-click inspects a tile; it does not cancel the journey.
  await clickHex(page, a.q + 1, a.r, 'right');
  expect((await journeys(page)).player?.['alexios']?.target).toEqual(a);

  // A town visit and the settings screen keep both.
  const townTab = page.locator('[data-testid^="town-tab-"]').first();
  await townTab.click();
  await waitFor(page, (s) => s.screen === 'town', 'town');
  await page.getByRole('button', { name: 'Back' }).first().click();
  await waitFor(page, (s) => s.screen === 'adventure', 'map again');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: /Settings/ }).click();
  await waitFor(page, (s) => s.screen === 'settings', 'settings');
  await page.getByRole('button', { name: 'Back' }).first().click();
  await waitFor(page, (s) => s.screen === 'adventure', 'map after settings');
  j = await journeys(page);
  expect(j.player?.['alexios']?.target).toEqual(a);
  expect(j.player?.['ione']?.target).toEqual(b);
  await expect.poll(async () => (await route(page))?.badge).toBe('2');

  // Save, end the day, load the save: the journeys come back with it.
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: /Save Game/ }).click();
  await page.getByTestId('save-manual-2').click();
  await page.locator('#save-name').fill('journeys kept');
  await page.getByTestId('save-confirm').click();
  await page.waitForTimeout(400);
  if ((await inspect(page)).overlays.includes('confirm')) await page.getByTestId('confirm-ok').click();
  await page.waitForTimeout(300);
  while ((await inspect(page)).overlays.length) {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
  }
  await endDay(page);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: /Load Game/ }).click();
  await page.getByTestId('save-manual-2').click();
  await page.getByTestId('load-confirm').click();
  await page.waitForTimeout(300);
  if ((await inspect(page)).overlays.includes('confirm')) await page.getByTestId('confirm-ok').click();
  await waitFor(page, (s) => s.screen === 'adventure' && s.state.day === 1 && !s.overlays.length, 'loaded');
  j = await journeys(page);
  expect(j.player?.['alexios']?.target).toEqual(a);
  expect(j.player?.['ione']?.target).toEqual(b);

  // Cancel journey clears only the selected hero's.
  await page.getByTestId('hero-tab-alexios').click();
  await page.getByTestId('journey-cancel').click();
  j = await journeys(page);
  expect(j.player?.['alexios']).toBeUndefined();
  expect(j.player?.['ione']?.target).toEqual(b);
});

test('holding Space walks once; a blocked destination is kept, shown locked and cannot be followed', async ({ page }) => {
  test.setTimeout(240_000);
  await page.setViewportSize({ width: 1600, height: 900 });
  const d = skirmishDriver();
  const hero = 'alexios';
  // A destination with no route (open water or mountain, the nearest one): kept, shown blocked.
  const map = d.state.world.map;
  const home = d.state.heroes[hero]!.position;
  let water: HexCoord | null = null;
  let best = Infinity;
  for (let r = 0; r < map.height; r++)
    for (let q = 0; q < map.width; q++) {
      const t = map.terrain[r * map.width + q];
      const dist = Math.abs(q - home.q) + Math.abs(r - home.r);
      if ((t === 'w' || t === 'm') && dist < best && !quoteMovement(d.catalog, d.state, hero, { q, r }).reachable) {
        best = dist;
        water = { q, r };
      }
    }
  expect(water).not.toBeNull();
  const presentation: SessionPresentation = { version: 1, journeys: { player: { [hero]: { version: 1, matchId: d.state.matchId, playerId: 'player', heroId: hero, target: water!, status: 'planned' } } } };
  await load(page, saveWith(d, 'journey blocked', presentation));
  await expect(page.getByTestId('journey-bar')).toHaveAttribute('data-status', 'blocked');
  await expect(page.getByTestId('journey-status')).toContainText('Route unavailable');
  await expect(page.getByTestId('journey-continue')).toBeDisabled();
  await expect.poll(async () => (await route(page))?.destination).toBe('blocked');
  const p = await project(page, water!.q, water!.r);
  if (p) await page.screenshot({ path: join(SHOTS, 'journey-03-blocked.png') });

  // Choose a reachable two-day destination, then hold Space: one move only.
  const target = await onScreen(page, tilesDaysAway(d, hero, 2));
  await clickHex(page, target.q, target.r);
  const rev = (await inspect(page)).state.revision;
  await page.keyboard.down('Space');
  await page.keyboard.down('Space');
  await page.keyboard.down('Space');
  await page.keyboard.up('Space');
  await waitFor(page, (s) => s.state.revision > rev && !s.busy, 'one move', 90_000);
  await page.waitForTimeout(600);
  expect((await inspect(page)).state.revision).toBe(rev + 1);
});

test('painted route markers on snow, desert, dark forest and grass maps, near and far, across the fog edge', async ({ browser }) => {
  test.setTimeout(600_000);
  for (const mission of ['winter_oath_m01', 'twelfth_hour_m01', 'silver_branch_m01', 'new_fire_m01']) {
    const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 } });
    const page = await ctx.newPage();
    const d = GameDriver.mission(mission, { matchId: `e2e-route-${mission}` });
    const hero = Object.values(d.state.heroes).find((h) => d.state.players[h.ownerId]?.controller === 'human' && h.status === 'active')!.id;
    // Explored around the hero (a fog edge at about two days' march), the rest still hidden.
    const at = d.state.heroes[hero]!.position;
    const map = d.state.world.map;
    const fog = d.state.fog[d.state.heroes[hero]!.ownerId]!;
    for (let r = 0; r < map.height; r++) for (let q = 0; q < map.width; q++) if (axialDistance(at, { q, r }) <= 13) fog.explored[r * map.width + q] = 1;
    await load(page, saveWith(d, `route ${mission}`));
    const canvas = page.locator('canvas').first();
    const box = (await canvas.boundingBox())!;
    await page.waitForTimeout(400);
    let target: HexCoord | null = null;
    for (const days of [3, 2, 4, 1]) {
      try {
        // The farthest such tile in view (a long route to look at).
        target = await onScreen(page, tilesDaysAway(d, hero, days).reverse());
        break;
      } catch {
        target = null;
      }
    }
    expect(target, mission).not.toBeNull();
    await clickHex(page, target!.q, target!.r);
    await expect.poll(async () => (await route(page))?.mode).toBe('painted');
    const r = (await route(page))!;
    expect(r.destination).toBe('seal');
    expect(Number(r.badge)).toBeGreaterThanOrEqual(1);
    expect(r.today + r.later).toBeGreaterThan(0);
    // The planning tip, once read, out of the picture.
    const gotIt = page.getByTestId('hint-panel').getByRole('button', { name: 'Got it' });
    if (await gotIt.isVisible().catch(() => false)) await gotIt.click();
    await page.mouse.move(5, 5);
    await page.waitForTimeout(1500);
    await page.screenshot({ path: join(SHOTS, `route-${mission}.png`) });
    // Far: fewer markers, drawn larger.
    await page.mouse.move(box.x + box.width * 0.4, box.y + box.height * 0.5);
    for (let i = 0; i < 8; i++) await page.mouse.wheel(0, 240);
    await page.mouse.move(5, 5);
    await page.waitForTimeout(800);
    expect((await route(page))!.thinned).toBeGreaterThan(0);
    await page.screenshot({ path: join(SHOTS, `route-${mission}-far.png`) });
    await ctx.close();
  }
});

test('the continue-move key follows remapping: Space no longer walks, the new key does, the tooltip names it', async ({ page }) => {
  test.setTimeout(240_000);
  await page.setViewportSize({ width: 1600, height: 900 });
  const d = skirmishDriver();
  await load(page, saveWith(d, 'journey remap'));
  // Controls: continue along the route on G instead of Space.
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: /Settings/ }).click();
  await page.getByTestId('settings-tab-controls').click();
  await page.getByTestId('bind-continue_move').click();
  await page.keyboard.press('g');
  await page.getByTestId('settings-apply').click();
  await page.getByRole('button', { name: 'Back' }).first().click();
  await waitFor(page, (s) => s.screen === 'adventure', 'map');
  const target = await onScreen(page, tilesDaysAway(d, 'alexios', 2));
  await clickHex(page, target.q, target.r);
  await expect(page.getByTestId('journey-continue')).toHaveAttribute('title', /\(G\)/);
  const rev = (await inspect(page)).state.revision;
  await page.keyboard.press('Space');
  await page.waitForTimeout(800);
  expect((await inspect(page)).state.revision).toBe(rev);
  await page.keyboard.press('g');
  await waitFor(page, (s) => s.state.revision === rev + 1 && !s.busy, 'moved on G', 90_000);
});
