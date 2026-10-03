import { expect, test, type Page } from '@playwright/test';
import { GameDriver } from '@pr/testing';
import { clickHex, inspect, waitFor } from './helpers';
import { approachTile, importAndLoad, slots, writeSave } from './fixtures';
import { leaderOf, usePrefs } from './momentFixtures';

/**
 * Owner request 2026-10-03: context cursors with stand-ins, divine gifts at the
 * Temple, the minimap's view frame, the combat log from the first round, and
 * graphics quality presets. Screenshots are kept for review.
 */

const project = (page: Page, q: number, r: number) =>
  page.evaluate(([a, b]) => (globalThis as unknown as { __prProject: (k: string, a: number, b: number) => { x: number; y: number } | null }).__prProject('adventure', a!, b!), [q, r]);

function mapDriver(name: string): GameDriver {
  const d = GameDriver.mission('skirmish_twin_harbors', { matchId: `e2e-${name}` });
  for (const fog of Object.values(d.state.fog)) fog.explored = fog.explored.map(() => 1);
  return d;
}

test('the map cursor follows what a click would do; the minimap frames the view', async ({ page }) => {
  await usePrefs(page, { graphicsTested: true });
  const d = mapDriver('cursor');
  const leader = leaderOf(d);
  const gold = d.catalog.missions['skirmish_twin_harbors']!.sites.find((x) => x.id === 'sk_gold')!.coord;
  leader.position = approachTile(d, gold, leader.id);
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await importAndLoad(page, writeSave(d, 'cursor'));
  await waitFor(page, (x) => x.screen === 'adventure' && x.overlays.length === 0 && x.humanTurn, 'map');
  const viewport = page.locator('.scene-viewport');
  await expect(viewport).toHaveAttribute('data-cursor', 'context');
  const cursorAt = async (q: number, r: number) => {
    // The 2D map view loads on demand: wait until it can project hexes.
    await expect.poll(() => project(page, q, r), { message: `${q},${r} on screen`, timeout: 20_000 }).not.toBeNull();
    const p = await project(page, q, r);
    await page.mouse.move(p!.x, p!.y);
    await page.waitForTimeout(250);
    return viewport.evaluate((el) => (el as HTMLElement).style.cursor);
  };
  // A guarded mine next to the hero: crossed swords (Brief 7's art, delivered 2026-10-03).
  const attack = await cursorAt(gold.q, gold.r);
  expect(attack).toContain('cursor.map.attack.png');
  // The hero's own tile: a different cursor.
  expect(await cursorAt(leader.position.q, leader.position.r)).not.toBe(attack);
  await page.screenshot({ path: 'test-results/round9-cursor-attack.png' });
  // Minimap frame: a polygon inside the minimap.
  const frame = page.getByTestId('minimap-frame');
  await expect(frame.locator('polygon')).toHaveCount(1, { timeout: 5000 });
  const points = (await frame.locator('polygon').getAttribute('points')) ?? '';
  expect(points.trim().split(/\s+/)).toHaveLength(4);
});

test('a Temple grants a divine gift for Favor once a week', async ({ page }) => {
  await usePrefs(page, { graphicsTested: true });
  const d = mapDriver('gifts');
  d.state.towns['westharbor']!.buildings['pantheon_temple'] = 1;
  d.player.wallet.favor = 30;
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await importAndLoad(page, writeSave(d, 'gifts'));
  await waitFor(page, (x) => x.screen === 'adventure' && x.overlays.length === 0, 'map');
  await page.getByTestId('town-tab-westharbor').click();
  await waitFor(page, (x) => x.screen === 'town', 'town screen');
  await page.getByTestId('slot-pantheon_temple').click();
  await page.getByTestId('gifts-open').click();
  const modal = page.getByTestId('gifts');
  await expect(modal.getByTestId('gift-temple_treasury')).toBeVisible();
  await page.waitForTimeout(600); // the dialog's fade-in
  await page.screenshot({ path: 'test-results/round9-gifts.png' });
  const gold = (await inspect(page)).state.players.player.wallet.gold as number;
  await modal.getByTestId('gift-temple_treasury-receive').click();
  await page.getByTestId('confirm-ok').click();
  const s = await waitFor(page, (x) => x.state.players.player.wallet.favor === 25, 'favor spent');
  expect(s.state.players.player.wallet.gold).toBe(gold + 2000);
  expect(s.state.towns.westharbor.lastGiftWeek).toBe(1);
  await page.getByTestId('gifts-open').click();
  await expect(page.getByTestId('gift-timber_and_stone-receive')).toBeDisabled();
});

test('a battle started from the map logs its first round', async ({ page }) => {
  test.setTimeout(120_000);
  await usePrefs(page, { graphicsTested: true });
  const d = mapDriver('log');
  const leader = leaderOf(d);
  leader.army.slots = slots([['hoplite', 12]]);
  const gold = d.catalog.missions['skirmish_twin_harbors']!.sites.find((x) => x.id === 'sk_gold')!.coord;
  leader.position = approachTile(d, gold, leader.id);
  leader.movementPoints = 3000;
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await importAndLoad(page, writeSave(d, 'log'));
  await waitFor(page, (x) => x.screen === 'adventure' && x.overlays.length === 0 && x.humanTurn, 'map');
  await clickHex(page, gold.q, gold.r);
  await clickHex(page, gold.q, gold.r);
  const s = await waitFor(page, (x) => x.overlays.includes('encounter') || !!x.state.battle, 'encounter or battle');
  if (!s.state.battle) await page.getByTestId('encounter-attack').click();
  await waitFor(page, (x) => x.screen === 'battle' && !!x.state.battle, 'battle');
  const toggle = page.locator('.battle-log-toggle');
  if (await toggle.isVisible()) await toggle.click();
  await expect(page.locator('.battle-log .log-list li').filter({ hasText: '— Round 1 —' })).toHaveCount(1, { timeout: 10_000 });
});

test('graphics: Settings offers three presets; Low draws plain ground with no painted textures fetched', async ({ page }) => {
  await usePrefs(page, { graphicsTested: true, graphicsQuality: 'low' });
  const fetched: string[] = [];
  page.on('response', (r) => {
    if (r.url().includes('/art/terrain/') || r.url().includes('/art/sky/')) fetched.push(r.url());
  });
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await page.getByTestId('menu-settings').click();
  await page.getByRole('tab', { name: /Display/ }).click();
  const select = page.getByRole('combobox', { name: 'Graphics quality' });
  await expect(select).toBeEnabled();
  await expect(select).toHaveValue('low');
  await expect(page.getByText(/^Reduced resolution, no shadows/)).toBeVisible();
  await select.selectOption('medium');
  await expect(page.getByText(/^Standard resolution, soft ground shadows/)).toBeVisible();
  await page.getByTestId('graphics-test').click();
  await expect(page.getByTestId('graphics-note')).toContainText('Quick test:');
  await page.screenshot({ path: 'test-results/round9-settings-graphics.png' });
  // Back to the menu without applying: Low stays.
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await importAndLoad(page, writeSave(mapDriver('low'), 'low'));
  await waitFor(page, (x) => x.screen === 'adventure' && x.overlays.length === 0, 'map');
  await page.waitForTimeout(2500);
  expect(fetched).toEqual([]);
  await page.screenshot({ path: 'test-results/round9-low-map.png' });
});
