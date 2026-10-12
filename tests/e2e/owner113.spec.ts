import { expect, test, type Page } from '@playwright/test';
import { GameDriver } from '@pr/testing';
import { waitFor } from './helpers';
import { importAndLoad, writeSave } from './fixtures';

/**
 * The owner's five fixes for 1.1.3, through the visible screens: the title
 * always shows the frontend kit's title painting (with the kit's slim menu
 * panel, not the older ornate frame); New Game has no footer Back (the header
 * keeps one); the encyclopedia's sections are a rail at the left and its cards
 * wear painted frames (the pantheon's own in its section, the socket rim
 * elsewhere) instead of a pale paper box; the pantheon screens show the painted
 * leather and parchment grain; the creature page is two framed pages with the
 * statistics as tiles and the creature on its pantheon's recruitment court.
 */

function errorsOf(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  return errors;
}

const css = (page: Page, selector: string, prop: string) => page.locator(selector).first().evaluate((el, p) => getComputedStyle(el).getPropertyValue(p), prop);
const cssOf = (page: Page, selector: string, pseudo: string, prop: string) => page.locator(selector).first().evaluate((el, [ps, p]) => getComputedStyle(el, ps).getPropertyValue(p!), [pseudo, prop] as const);

async function noHorizontalOverflow(page: Page): Promise<void> {
  const o = await page.evaluate(() => ({ doc: document.documentElement.scrollWidth, w: window.innerWidth }));
  expect(o.doc, 'no horizontal page scroll').toBeLessThanOrEqual(o.w);
}

test('title: the kit title painting every time, the slim kit menu panel, no ornate frame', async ({ page }) => {
  const errors = errorsOf(page);
  for (let i = 0; i < 3; i++) {
    await page.goto('/?e2e', { waitUntil: 'networkidle' });
    await expect(page.locator('.main-menu__bg')).toHaveAttribute('data-background', 'frontendkit.backdrop.title');
    expect(await css(page, '.main-menu__bg', 'background-image')).toMatch(/frontend-kit-v1\.1\.0\/backdrop-title\.png/);
  }
  await expect(page.locator('.main-menu')).toHaveClass(/main-menu--kit/);
  await expect(page.locator('.menu-frame__art')).toHaveCount(0);
  for (const id of ['menu-continue', 'menu-new', 'menu-load', 'menu-encyclopedia', 'menu-settings', 'menu-records']) await expect(page.getByTestId(id)).toBeVisible();
  // The panel sits under the logo, between the hall's pillars (the middle of the window).
  const panel = await page.locator('.menu-frame__window').boundingBox();
  const logo = await page.locator('.main-menu__logo').boundingBox();
  const w = page.viewportSize()!.width;
  expect(panel!.y).toBeGreaterThanOrEqual(logo!.y + logo!.height - 2);
  expect(Math.abs(panel!.x + panel!.width / 2 - w / 2)).toBeLessThan(8);
  expect(panel!.width).toBeLessThan(w * 0.4);
  await noHorizontalOverflow(page);
  expect(errors.filter((e) => !/favicon/i.test(e))).toEqual([]);
});

test('New Game: no footer Back strip; the header Back returns to the title', async ({ page }) => {
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await page.getByTestId('menu-new').click();
  await waitFor(page, (s) => s.screen === 'game-mode', 'new game');
  await expect(page.locator('.fe-shell__footer')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Back', exact: true })).toHaveCount(1);
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await waitFor(page, (s) => s.screen === 'main-menu', 'title');
});

test('encyclopedia: the sections in a rail at the left; framed cards, no paper boxes', async ({ page }) => {
  const errors = errorsOf(page);
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await page.getByTestId('menu-encyclopedia').click();
  await waitFor(page, (s) => s.screen === 'encyclopedia', 'encyclopedia');
  const tabs = page.locator('.codex-rail [role="tab"]');
  await expect(tabs).toHaveCount(8);
  await expect(page.locator('.codex-rail [role="tablist"]')).toHaveAttribute('aria-orientation', 'vertical');
  // Rail at the left of the page, sections one below the other, the search above them.
  const rail = await page.locator('.codex-rail').boundingBox();
  const body = await page.getByTestId('codex-body').boundingBox();
  expect(rail!.x + rail!.width).toBeLessThanOrEqual(body!.x + 1);
  const first = await tabs.nth(0).boundingBox();
  const second = await tabs.nth(1).boundingBox();
  expect(second!.y).toBeGreaterThan(first!.y + first!.height - 1);
  expect(Math.abs(second!.x - first!.x)).toBeLessThan(2);
  const search = await page.getByTestId('codex-search').boundingBox();
  expect(search!.y + search!.height).toBeLessThanOrEqual(first!.y + 1);
  // Keyboard: arrows move between the sections.
  await tabs.nth(0).focus();
  await page.keyboard.press('ArrowDown');
  await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');
  await expect(tabs.nth(1)).toBeFocused();
  await page.keyboard.press('ArrowUp');
  await expect(tabs.nth(0)).toHaveAttribute('aria-selected', 'true');
  // Bestiary: each family wears its pantheon's painted frame; no pale card box behind the forms.
  const greekFamily = page.getByTestId('codex-pantheon-greek').locator('.bestiary-tier').first();
  expect(await greekFamily.evaluate((el) => getComputedStyle(el, '::after').borderImageSource)).toMatch(/ui-v1\.1\.0\/frame-greek\.png/);
  const norseFamily = page.getByTestId('codex-pantheon-norse').locator('.bestiary-tier').first();
  expect(await norseFamily.evaluate((el) => getComputedStyle(el, '::after').borderImageSource)).toMatch(/ui-v1\.1\.0\/frame-norse\.png/);
  expect(await css(page, '[data-testid="codex-pantheon-greek"] .bestiary-card', 'background-color')).toBe('rgba(0, 0, 0, 0)');
  expect(await css(page, '[data-testid="codex-pantheon-greek"] .bestiary-tier', 'background-color')).toBe('rgba(0, 0, 0, 0)');
  await expect(page.getByTestId('codex-pantheon-greek').locator('.bestiary-tier').first().locator('.codex-socket')).toHaveCount(2);
  // Neutral creatures and the shared sections: the painted socket rim.
  expect(await page.getByTestId('codex-pantheon-neutral').locator('.bestiary-tier').first().evaluate((el) => getComputedStyle(el, '::after').borderImageSource)).toMatch(/ui-v1\.1\.0\/control-socket\.png/);
  await page.getByRole('tab', { name: 'Spells' }).click();
  expect(await cssOf(page, '.codex-body .codex-card', '::after', 'border-image-source')).toMatch(/control-socket\.png/);
  expect(await css(page, '.codex-body .codex-card', 'background-color')).toBe('rgba(0, 0, 0, 0)');
  // Towns: the slot panels lose the paper fill too.
  await page.getByRole('tab', { name: 'Towns' }).click();
  expect(await css(page, '.codex-body .codex-town-slot', 'background-image')).toBe('none');
  await noHorizontalOverflow(page);
  expect(errors.filter((e) => !/favicon/i.test(e))).toEqual([]);
});

test('creature page: two framed pages, statistics as tiles, both forms, grouped controls', async ({ page }) => {
  const errors = errorsOf(page);
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await page.getByTestId('menu-encyclopedia').click();
  await page.getByTestId('codex-griffin').click();
  await waitFor(page, (s) => s.screen === 'unit-detail', 'creature page');
  await expect(page.getByTestId('unit-name')).toHaveText('Griffin');
  await expect(page.locator('.unit-title__sub')).toContainText('Greek');
  await expect(page.locator('.unit-title__sub')).toContainText('Tier III');
  // Both pages wear the Greek frame.
  await expect(page.locator('.unit-page.gui-window')).toHaveCount(2);
  for (const el of await page.locator('.unit-page').all()) await expect(el).toHaveAttribute('data-gui-theme', 'greek');
  // Statistics: one tile each, growth among them; the cost under them.
  const tiles = page.getByTestId('unit-stats').locator('.unit-stat');
  expect(await tiles.count()).toBeGreaterThanOrEqual(6);
  await expect(page.getByTestId('unit-stats')).toContainText('Growth');
  await expect(page.locator('.unit-forms [data-testid^="unit-form-"]')).toHaveCount(2);
  await expect(page.getByTestId('unit-form-griffin')).toHaveAttribute('aria-current', 'page');
  await expect(page.locator('.unit-info [data-testid^="ability-badge-"]').first()).toBeVisible();
  // The viewer: one canvas, the controls in labelled groups.
  await expect(page.locator('.unit-viewer canvas')).toHaveCount(1);
  await expect(page.locator('.unit-control__label')).toHaveText(['Animation', 'Playback', 'Speed', 'View']);
  for (const id of ['viewer-play', 'viewer-pause', 'viewer-stop', 'viewer-restart', 'anim-idle']) await expect(page.getByTestId(id)).toBeVisible();
  // The other form opens its own page in the same layout.
  await page.getByTestId('unit-form-windcrest_griffin').click();
  await expect(page.getByTestId('unit-name')).toHaveText('Windcrest Griffin');
  await noHorizontalOverflow(page);
  expect(errors.filter((e) => !/favicon/i.test(e))).toEqual([]);
});

test('pantheon screens: the leather and parchment grain on the choice screen and the gods screen', async ({ page }) => {
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await page.getByTestId('menu-new').click();
  await page.getByTestId('mode-skirmish').click();
  await page.getByTestId('scenario-skirmish_twin_harbors').click();
  await page.getByTestId('setup-next').click();
  await expect(page.getByTestId('pantheon-stage')).toBeVisible();
  expect(await css(page, '.pantheon-roster', 'background-image')).toMatch(/surface-leather\.png/);
  expect(await css(page, '.pantheon-stage__info', 'background-image')).toMatch(/surface-parchment\.png/);
  expect(await css(page, '[data-testid="setup-drawer"]', 'background-image')).toMatch(/surface-leather\.png/);
  expect(await css(page, '.fe-pantheon-screen', 'background-image')).toMatch(/backdrop-atlas\.png/);
  // In a match: the gods screen.
  const d = GameDriver.mission('skirmish_twin_harbors', { matchId: 'e2e-owner113-gods' });
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await importAndLoad(page, writeSave(d, 'owner113-gods'));
  await waitFor(page, (s) => s.screen === 'adventure', 'adventure');
  await page.keyboard.press('p');
  await waitFor(page, (s) => s.screen === 'pantheon', 'pantheon screen');
  expect(await css(page, '.pantheon-screen .god-card', 'background-image')).toMatch(/surface-leather\.png/);
  expect(await css(page, '.pantheon-screen .pantheon-patron', 'background-image')).toMatch(/surface-leather\.png/);
});
