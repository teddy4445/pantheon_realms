/**
 * The owner's round of 2026-10-07 through the real controls: no screen codes in
 * headers, the random-map seats without a patron picker, unowned towns on a random
 * map and on an authored skirmish map, the map HUD 24 px lower, the Pantheon page's
 * plain Favor and pantheon-named miracles, and map creatures facing both ways.
 */
import { expect, test } from '@playwright/test';
import { GameDriver } from '@pr/testing';
import { createGeneratedMatch, createRandomSkirmish } from '@pr/campaign';
import { waitFor } from './helpers';
import { importAndLoad, writeSave } from './fixtures';
import { usePrefs } from './momentFixtures';

test('headers carry no screen code; random-map seats show the patron without a picker', async ({ page }) => {
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await page.getByTestId('menu-new').click();
  await page.getByTestId('mode-random').click();
  await expect(page.locator('.screen-header__code')).toHaveCount(0);
  await expect(page.locator('.screen-header')).not.toContainText(/\bS\d\d\b/);
  await page.getByTestId('random-chapter-empires').click();
  await expect(page.getByTestId('seat-0-patron')).toHaveCount(0);
  await expect(page.getByTestId('seat-0-patron-name')).toHaveText('Patron: Zeus');
  await page.getByTestId('seat-0-pantheon').selectOption('norse');
  await expect(page.getByTestId('seat-0-patron-name')).toHaveText('Patron: Odin');
});

test('random map with unowned towns of both kinds: each empire gets one of its pantheon and one of another', async ({ page }) => {
  test.setTimeout(150_000);
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await page.getByTestId('menu-new').click();
  await page.getByTestId('mode-random').click();
  await page.getByTestId('random-unowned-both').click();
  await expect(page.getByTestId('random-unowned-text')).toContainText('Two towns');
  await page.getByTestId('random-start').click();
  const s = await waitFor(page, (x) => x.screen === 'adventure' && x.overlays.length === 0, 'adventure map', 60_000);
  const towns = Object.values(s.state.towns as Record<string, { id: string; ownerId: string | null; pantheonId: string; garrison: { slots: unknown[] } }>);
  const free = towns.filter((t) => t.ownerId === null);
  expect(free.length).toBe(4);
  for (const t of free) expect(t.garrison.slots.some((x) => !!x)).toBe(true);
  const own = s.state.players.player.pantheonId;
  expect(free.filter((t) => t.id.endsWith('_1')).map((t) => t.pantheonId === own).sort()).toEqual([false, true]);
  // Only the player's own town has a town tab.
  await expect(page.locator('[data-testid^="town-tab-"]')).toHaveCount(1);
});

test('an authored skirmish map offers its unowned towns at setup', async ({ page }) => {
  test.setTimeout(150_000);
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await page.getByTestId('menu-new').click();
  await page.getByTestId('mode-skirmish').click();
  await page.getByTestId('skirmish-map-frostgate').click();
  await page.getByTestId('setup-next').click();
  await waitFor(page, (s) => s.screen === 'map-setup', 'map setup');
  await page.getByTestId('map-setup-unowned-own').click();
  await page.getByTestId('map-setup-start').click();
  const s = await waitFor(page, (x) => x.screen === 'adventure' && x.overlays.length === 0, 'adventure map', 60_000);
  const free = Object.values(s.state.towns as Record<string, { ownerId: string | null; pantheonId: string }>).filter((t) => t.ownerId === null);
  expect(free.length).toBe(2);
  expect(free.map((t) => t.pantheonId).sort()).toEqual([s.state.players.player.pantheonId, s.state.players.p2.pantheonId].sort());
});

test('map HUD 24 px lower; pantheon page: plain Favor, pantheon-named miracles, the weekly rule without “wait”', async ({ page }) => {
  test.setTimeout(150_000);
  await usePrefs(page, { graphicsTested: true, tutorialHints: false });
  const d = GameDriver.mission('skirmish_twin_harbors', { matchId: 'e2e-0107' });
  d.player.wallet.favor = 40;
  // The week's miracle already called: the rule's reason shows.
  d.player.interventionWeek = 1;
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await importAndLoad(page, writeSave(d, 'round 0107'));
  await waitFor(page, (x) => x.screen === 'adventure' && x.overlays.length === 0, 'map', 60_000);
  const top = await page.locator('.adv-top').boundingBox();
  const endDay = await page.getByTestId('end-day').boundingBox();
  const left = await page.locator('.adv-left').boundingBox();
  expect(top && endDay && left).toBeTruthy();
  // The left panel sits 24 px lower than before (it was a few pixels under the top bar).
  expect(left!.y - (top!.y + top!.height)).toBeGreaterThanOrEqual(24);
  expect(left!.y - (top!.y + top!.height)).toBeLessThan(60);
  // 1.1.0: End Day closes the command sidebar (its foot), inside the window.
  const command = await page.locator('.adv-command').boundingBox();
  expect(command).toBeTruthy();
  expect(endDay!.x).toBeGreaterThanOrEqual(command!.x - 1);
  expect(endDay!.y + endDay!.height).toBeLessThanOrEqual(page.viewportSize()!.height + 1);
  await expect(page.getByTestId('end-day')).toBeInViewport();
  await page.getByTitle('Pantheon (P)').click();
  const panel = page.locator('.pantheon-miracles');
  await expect(panel).toBeVisible();
  await expect(panel).toContainText('Tribute of Hera');
  await expect(panel).toContainText('Arrows of Artemis');
  await expect(panel).not.toContainText('Tithe of the Faithful');
  await expect(panel.locator('.favor-cost--plain').first()).toBeVisible();
  await expect(panel.locator('.chip .favor-cost')).toHaveCount(0);
  await expect(page.getByTestId('invoke-tithe_of_the_faithful')).toHaveAttribute('title', 'The gods answer once per week');
  await expect(page.getByText(/wait for the next week/)).toHaveCount(0);
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'test-results/r0107-pantheon.png' });
});

test('map creatures face both ways', async ({ page }) => {
  test.setTimeout(150_000);
  await usePrefs(page, { graphicsTested: true, tutorialHints: false });
  const catalog = GameDriver.mission('skirmish_twin_harbors').catalog;
  const g = createRandomSkirmish(catalog, { seed: 77, size: 'medium', seats: [{ pantheonId: 'greek', controller: 'human' }, { pantheonId: 'norse', controller: 'ai' }], victory: { type: 'elimination' }, monsters: 'few', revealMap: true });
  const d = new GameDriver(createGeneratedMatch(catalog, g, { matchId: 'e2e-0107-facing' }).match, catalog);
  for (const fog of Object.values(d.state.fog)) fog.explored = fog.explored.map(() => 1);
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await importAndLoad(page, writeSave(d, 'round 0107 facing'));
  await waitFor(page, (x) => x.screen === 'adventure' && x.overlays.length === 0, 'map', 60_000);
  await page.waitForTimeout(1500);
  const guards = await page.evaluate(() => (window as unknown as { __prScenery?: () => { map: { guards: { id: string; mirrored: boolean }[] } | null } }).__prScenery?.().map?.guards ?? null);
  expect(guards).not.toBeNull();
  expect(guards!.length).toBeGreaterThan(8);
  const left = guards!.filter((x) => x.mirrored).length;
  expect(left).toBeGreaterThan(guards!.length * 0.2);
  expect(left).toBeLessThan(guards!.length * 0.8);
});
