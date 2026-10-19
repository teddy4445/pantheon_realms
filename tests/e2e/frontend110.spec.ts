import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { GameDriver } from '@pr/testing';
import { inspect, waitFor } from './helpers';
import { importAndLoad, writeSave } from './fixtures';

/**
 * Release 1.1.0 pre-game screens (handoff docs/frontend-v1.1.0): the title
 * hall, New Game, Campaign Chronicles, the Skirmish Atlas, the Random Map
 * chapters, the encyclopedia, settings, Saved Journeys, the map library, the
 * Hall of Records and the shared confirmation — through the visible controls.
 * The art pack's own gallery validation is not a substitute for these.
 */

const OUT = 'test-results/frontend110';
const ROOT = process.cwd(); // Playwright runs from the repository root
const VERSION = (JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')) as { version: string }).version;
const RANDOM_TYPES = (JSON.parse(readFileSync(join(ROOT, 'docs', 'frontend-v1.1.0', 'random-map-types.json'), 'utf8')) as { id: string }[]).map((t) => t.id);
const PANTHEONS = ['greek', 'norse', 'egyptian', 'japanese', 'celtic', 'mesoamerican'];

function errorsOf(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  return errors;
}

/** Every <img> under the locator has decoded (not just requested). */
async function picturesDecoded(page: Page, selector: string): Promise<{ total: number; broken: string[] }> {
  return page.locator(selector).evaluateAll(async (els) => {
    const imgs = els.flatMap((e) => (e instanceof HTMLImageElement ? [e] : [...e.querySelectorAll('img')]));
    for (const i of imgs) i.loading = 'eager';
    await Promise.all(imgs.map((i) => i.decode().catch(() => undefined)));
    return { total: imgs.length, broken: imgs.filter((i) => !i.complete || i.naturalWidth === 0).map((i) => i.currentSrc || i.src) };
  });
}

async function noHorizontalOverflow(page: Page): Promise<void> {
  const o = await page.evaluate(() => ({ doc: document.documentElement.scrollWidth, body: document.body.scrollWidth, w: window.innerWidth }));
  expect(Math.max(o.doc, o.body), 'no horizontal page scroll').toBeLessThanOrEqual(o.w);
}

/** The screen's footer (its actions) is inside the window and not covered. */
async function footerVisible(page: Page): Promise<void> {
  const footer = page.locator('.fe-shell__footer').last();
  await expect(footer).toBeVisible();
  const box = await footer.boundingBox();
  const vp = page.viewportSize()!;
  expect(box && box.y >= 0 && box.y + box.height <= vp.height + 1, 'footer inside the window').toBe(true);
}

test('title hall and New Game: the Records link, the live version, four illustrated modes from the catalog', async ({ page }) => {
  const errors = errorsOf(page);
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  // The menu's opening painting: one of the twelve, or the kit's title background (it supplements them);
  // the title logo is the kit's own transparent layer.
  await expect(page.locator('.main-menu__bg')).toHaveAttribute('data-background', 'frontendkit.backdrop.title');
  await expect(page.locator('.main-menu__logo')).toHaveAttribute('src', /frontend-kit-v1\.1\.0\/brand-logo-v2\.png$/);
  expect((await picturesDecoded(page, '.main-menu__logo')).broken).toEqual([]);
  await expect(page.locator('.main-menu__footer')).toContainText(`v${VERSION}`);
  // The optional Records link (implemented): the existing Hall of Records route, local records only.
  await page.getByTestId('menu-records').click();
  await waitFor(page, (s) => s.screen === 'high-scores', 'hall of records');
  await expect(page.locator('.screen-header__title')).toHaveText('Hall of Records');
  await expect(page.getByTestId('records-empty')).toBeVisible();
  await expect(page.getByTestId('records-empty').locator('img')).toHaveAttribute('alt', '');
  await expect(page.getByRole('tab', { name: 'Skirmish' })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Campaign' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Clear tables' })).toBeDisabled();
  await page.screenshot({ path: `${OUT}/records-empty.png` });
  await page.getByRole('button', { name: 'Back', exact: true }).last().click();
  await waitFor(page, (s) => s.screen === 'main-menu', 'title');

  await page.getByTestId('menu-new').click();
  await waitFor(page, (s) => s.screen === 'game-mode', 'new game');
  const modes = ['campaign', 'skirmish', 'random', 'editor'];
  for (const m of modes) await expect(page.getByTestId(`mode-${m}`)).toBeVisible();
  await expect(page.locator('.fe-modes > button')).toHaveCount(4);
  // Real names and catalog-driven copy (seven campaigns across six pantheons since 2026-10-14, nine layouts), no fixed Greek/Norse list.
  await expect(page.getByTestId('mode-campaign')).toContainText('Campaign');
  await expect(page.getByTestId('mode-campaign')).toContainText(/7 story campaigns across 6 pantheons/);
  await expect(page.getByTestId('mode-random')).toContainText(`${RANDOM_TYPES.length} layouts`);
  await expect(page.getByTestId('mode-campaign')).not.toContainText(/Greek and Norse/);
  const art = await picturesDecoded(page, '.fe-modes');
  expect(art.total).toBe(4);
  expect(art.broken).toEqual([]);
  // The neutral shell (not a Greek frame) and the title-hall backdrop.
  await expect(page.locator('.fe-shell')).toHaveAttribute('data-backdrop', 'title-hall');
  expect(await page.evaluate(() => document.documentElement.dataset.guiTheme)).toBe('neutral');
  // Keyboard: the whole tile is one button.
  await page.getByTestId('mode-skirmish').focus();
  await page.keyboard.press('Enter');
  await waitFor(page, (s) => s.screen === 'scenario-select', 'skirmish atlas');
  await page.getByRole('button', { name: 'Back', exact: true }).last().click();
  await waitFor(page, (s) => s.screen === 'game-mode', 'new game again');
  await page.screenshot({ path: `${OUT}/new-game.png` });
  await page.getByRole('button', { name: 'Back', exact: true }).last().click();
  await waitFor(page, (s) => s.screen === 'main-menu', 'title again');
  expect(errors.filter((e) => !/favicon/i.test(e))).toEqual([]);
});

test('Campaign Chronicles: seven campaigns (The Silent Oracle second), the chapter chronicle (content v2), the campaign difficulty; Begin opens the first chapter', async ({ page }) => {
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await page.getByTestId('menu-new').click();
  await page.getByTestId('mode-campaign').click();
  await waitFor(page, (s) => s.screen === 'scenario-select', 'campaigns');
  await expect(page.locator('.screen-header__title')).toHaveText('Campaign Chronicles');
  const rows = page.getByRole('radiogroup', { name: 'Campaigns' }).getByRole('radio');
  await expect(rows).toHaveCount(7);
  // The tutorial first, then the second Greek campaign (owner request 2026-10-14).
  await expect(rows.nth(0)).toHaveAttribute('data-testid', 'scenario-three_beacons');
  await expect(rows.nth(1)).toHaveAttribute('data-testid', 'scenario-silent_oracle');
  // Arrow keys move the selection inside the one group.
  const first = rows.first();
  await first.click();
  await page.keyboard.press('ArrowDown');
  await expect(rows.nth(1)).toHaveAttribute('aria-checked', 'true');
  await expect(rows.nth(1)).toBeFocused();
  // Each campaign wears its own pantheon's frame on the detail.
  for (const id of ['three_beacons', 'winter_oath']) {
    await page.getByTestId(`scenario-${id}`).click();
    // Content v2 (campaign expansion 2026-10-15): the chapter chronicle replaces the read-only outline.
    const chronicle = page.getByTestId('setup-chronicle');
    await expect(chronicle.getByTestId(`chapter-${id}_v2_m01`)).toBeVisible();
    await expect(page.getByTestId('campaign-cover')).toBeVisible();
  }
  await expect(page.locator('.fe-chronicle')).toHaveAttribute('data-gui-theme', 'norse');
  await page.getByTestId('scenario-three_beacons').click();
  await expect(page.locator('.fe-chronicle')).toHaveAttribute('data-gui-theme', 'greek');
  // The Three Beacons: two chapters (the legacy three missions merged), only the first open for a new run.
  await expect(page.getByTestId('chronicle-graph').locator('[data-testid^="chapter-three_beacons_v2_m"]')).toHaveCount(2);
  await page.getByTestId('campaign-difficulty-campaign_hard').click();
  await page.screenshot({ path: `${OUT}/campaign.png` });
  await page.getByTestId('setup-begin').click();
  const s = await waitFor(page, (x) => x.overlays.includes('briefing'), 'briefing', 30_000, true);
  expect(s.state.scenario.missionId).toBe('three_beacons_v2_m01');
  expect(s.campaign?.difficultyId).toBe('campaign_hard');
});

test('Skirmish Atlas: an authored map goes to its seats (from map.players), the legacy scenario to the pantheon choice', async ({ page }) => {
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await page.getByTestId('menu-new').click();
  await page.getByTestId('mode-skirmish').click();
  await waitFor(page, (s) => s.screen === 'scenario-select', 'atlas');
  await expect(page.locator('.screen-header__title')).toHaveText('Skirmish Atlas');
  await page.getByTestId('skirmish-map-six_thrones').click();
  // Selecting does not start anything.
  expect((await inspect(page)).screen).toBe('scenario-select');
  await expect(page.locator('.map-detail__fact').first()).toContainText('6');
  await page.getByTestId('setup-next').click();
  await waitFor(page, (s) => s.screen === 'map-setup', 'map seats');
  await expect(page.locator('[data-testid^="seat-"][data-testid$="-pantheon"]')).toHaveCount(6);
  await expect(page.locator('.seat-row__banner')).toHaveCount(6);
  await footerVisible(page);
  await page.screenshot({ path: `${OUT}/map-setup.png` });
  await page.getByRole('button', { name: 'Back', exact: true }).last().click();
  await waitFor(page, (s) => s.screen === 'scenario-select', 'atlas again');
  await page.getByTestId('scenario-skirmish_twin_harbors').click();
  await page.getByTestId('setup-next').click();
  await waitFor(page, (s) => s.screen === 'pantheon-select', 'pantheon setup');
  await expect(page.locator('[data-testid^="pantheon-"][role="radio"]')).toHaveCount(6);
});

test('Random Map: nine types by exact id, Twin Continents for two empires, every choice survives the chapters, no seed; the match uses them', async ({ page }) => {
  test.setTimeout(150_000);
  const errors = errorsOf(page);
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await page.getByTestId('menu-new').click();
  await page.getByTestId('mode-random').click();
  await waitFor(page, (s) => s.screen === 'random-setup', 'random setup');
  const types = page.locator('[data-testid^="random-type-"][role="radio"]');
  expect(await types.evaluateAll((els) => els.map((e) => e.getAttribute('data-testid')!.replace('random-type-', '')))).toEqual(RANDOM_TYPES);
  const pics = await picturesDecoded(page, '[data-testid="random-type"]');
  // Nine land layouts and the two naval templates (2026-10-17), each with its painting.
  expect(pics.total).toBe(RANDOM_TYPES.length);
  expect(pics.broken).toEqual([]);
  // The painting of the chosen type is labelled as an illustration, never as this map.
  await expect(page.getByTestId('random-type-detail')).toContainText('Illustrative landscape');
  // No seed field anywhere in the three chapters (the owner removed it).
  for (const c of ['land', 'empires', 'rules']) {
    await page.getByTestId(`random-chapter-${c}`).click();
    await expect(page.getByLabel(/seed/i)).toHaveCount(0);
    await expect(page.locator('.fe-random')).not.toContainText(/\bseed\b/i);
  }
  await page.getByTestId('random-chapter-land').click();
  // Keyboard: one tab stop; arrows move the selection.
  await page.getByTestId('random-type-continental').focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByTestId('random-type-highlands')).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByTestId('random-type-highlands')).toBeFocused();
  // Twin Continents: two empires only (disabled with its reason; the choice falls back to Continental).
  await page.getByTestId('random-type-twin_continents').click();
  await page.getByTestId('random-count-3').click();
  await expect(page.getByTestId('random-type-twin_continents')).toBeDisabled();
  await expect(page.getByTestId('random-type-twin_continents')).toContainText('For 2 empires');
  await expect(page.getByTestId('random-type-continental')).toHaveAttribute('aria-checked', 'true');
  await page.getByTestId('random-count-2').click();
  // The draft: Land, then Empires, then Rules, then back through all three.
  await page.getByTestId('random-type-archipelago').click();
  await page.getByTestId('random-size-small').click();
  await page.getByTestId('random-treasure-rich').click();
  await page.getByTestId('random-chapter-empires').click();
  await page.getByTestId('seat-1-pantheon').selectOption('celtic');
  await page.getByTestId('difficulty-hard').click();
  await page.getByTestId('random-chapter-rules').click();
  await page.getByTestId('random-victory-hold_relic').click();
  await page.getByTestId('random-relic-days-5').click();
  await page.getByTestId('random-wealth-high').click();
  await page.getByTestId('random-chapter-land').click();
  await expect(page.getByTestId('random-type-archipelago')).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByTestId('random-size-small')).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByTestId('random-treasure-rich')).toHaveAttribute('aria-checked', 'true');
  await page.getByTestId('random-chapter-empires').click();
  await expect(page.getByTestId('seat-1-pantheon')).toHaveValue('celtic');
  await expect(page.getByTestId('difficulty-hard')).toHaveAttribute('aria-checked', 'true');
  await page.getByTestId('random-chapter-rules').click();
  await expect(page.getByTestId('random-victory-hold_relic')).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByTestId('random-relic-days-5')).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByTestId('random-wealth-high')).toHaveAttribute('aria-checked', 'true');
  await footerVisible(page);
  await page.screenshot({ path: `${OUT}/random-rules.png` });
  await page.getByTestId('random-start').click();
  const s = await waitFor(page, (x) => x.screen === 'adventure' && x.overlays.length === 0, 'adventure map', 60_000);
  expect(s.state.customMission.id).toMatch(/^random_small_2p_\d+_archipelago-normal-rich-high-full-fog/);
  expect(s.state.customMission.victoryCondition).toMatchObject({ type: 'hold_site', days: 5 });
  expect(s.state.scenario.difficultyId).toBe('hard');
  expect(s.state.players.p2.pantheonId).toBe('celtic');
  expect(errors.filter((e) => !/favicon/i.test(e))).toEqual([]);
});

test('encyclopedia: eight sections, the pantheon filter with Neutral, search with no results and Clear; filter and scroll kept after a creature page', async ({ page }) => {
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await page.getByTestId('menu-encyclopedia').click();
  await waitFor(page, (s) => s.screen === 'encyclopedia', 'encyclopedia');
  await expect(page.getByRole('tab')).toHaveText(['Bestiary', 'Gods', 'Heroes', 'Towns', 'Spells', 'Skills', 'Artifacts', 'Abilities']);
  await expect(page.locator('.fe-shell')).toHaveAttribute('data-backdrop', 'library');
  const filters = page.getByRole('radiogroup', { name: 'Pantheon' }).getByRole('radio');
  await expect(filters).toHaveText(['All', 'Greek', 'Norse', 'Egyptian', 'Japanese', 'Celtic', 'Mesoamerican', 'Neutral']);
  // Seven families per pantheon, both forms, and the neutral creatures.
  for (const p of PANTHEONS) await expect(page.getByTestId(`codex-pantheon-${p}`).locator('.bestiary-tier')).toHaveCount(7);
  await page.getByTestId('codex-filter-neutral').click();
  await expect(page.getByTestId('codex-pantheon-neutral')).toBeVisible();
  await expect(page.getByTestId('codex-pantheon-greek')).toHaveCount(0);
  // Arrow keys move the filter.
  await page.getByTestId('codex-filter-neutral').focus();
  await page.keyboard.press('ArrowLeft');
  await expect(page.getByTestId('codex-filter-mesoamerican')).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByTestId('codex-pantheon-mesoamerican')).toBeVisible();
  await expect(page.getByTestId('codex-pantheon-neutral')).toHaveCount(0);
  // Spells offer the pantheons that have spells, and Shared for the rest.
  await page.getByRole('tab', { name: 'Spells' }).click();
  await expect(page.getByTestId('codex-filter-shared')).toBeVisible();
  await expect(page.getByTestId('codex-filter-neutral')).toHaveCount(0);
  await page.getByTestId('codex-filter-shared').click();
  await expect(page.locator('.codex-body .codex-card').first()).toContainText('Any Sanctum');
  // Search: every section counts its matches; a search without results says so and offers Clear.
  await page.getByTestId('codex-filter-all').click();
  await page.getByTestId('codex-search').fill('griffin');
  await page.getByRole('tab', { name: /Bestiary/ }).click();
  await expect(page.getByTestId('codex-griffin')).toBeVisible();
  await expect(page.getByTestId('codex-hoplite')).toHaveCount(0);
  await page.getByTestId('codex-search').fill('qqqqzz');
  await expect(page.getByTestId('codex-no-results')).toBeVisible();
  await expect(page.getByTestId('codex-no-results')).toContainText('qqqqzz');
  await page.screenshot({ path: `${OUT}/codex-no-results.png` });
  await page.getByTestId('codex-no-results-clear').click();
  await expect(page.getByTestId('codex-search')).toHaveValue('');
  await expect(page.getByTestId('codex-search')).toBeFocused();
  await expect(page.getByTestId('codex-hoplite')).toBeVisible();
  // A word found only in other sections offers them.
  await page.getByTestId('codex-search').fill('sanctum');
  await page.getByRole('tab', { name: /Heroes/ }).click();
  if (await page.getByTestId('codex-no-results').count()) await expect(page.locator('[data-testid^="codex-found-"]').first()).toBeVisible();
  await page.getByTestId('codex-search').fill('');
  // Filter, search and scroll are kept when a creature page closes (a shorter window, so the section scrolls).
  await page.setViewportSize({ width: 1600, height: 620 });
  await page.getByRole('tab', { name: 'Bestiary' }).click();
  await page.getByTestId('codex-filter-celtic').click();
  const body = page.getByTestId('codex-body');
  await body.evaluate((e) => {
    e.scrollTop = e.scrollHeight;
  });
  await expect.poll(() => body.evaluate((e) => e.scrollTop)).toBeGreaterThan(50);
  const card = page.getByTestId('codex-pantheon-celtic').locator('.bestiary-card').last();
  // The click scrolls a partly hidden card into view first: read the position the player leaves from.
  await card.scrollIntoViewIfNeeded();
  await expect(card).toBeInViewport({ ratio: 1 });
  const top = await body.evaluate((e) => e.scrollTop);
  expect(top).toBeGreaterThan(50);
  await card.click();
  await waitFor(page, (s) => s.screen === 'unit-detail', 'creature page');
  // The real animated viewer, and both forms as explicit choices.
  await expect(page.locator('.unit-viewer canvas')).toHaveCount(1);
  await expect(page.locator('.unit-forms [data-testid^="unit-form-"]')).toHaveCount(2);
  await page.getByRole('button', { name: 'Back', exact: true }).first().click();
  await waitFor(page, (s) => s.screen === 'encyclopedia', 'back to the encyclopedia');
  await expect(page.getByTestId('codex-filter-celtic')).toHaveAttribute('aria-checked', 'true');
  await expect.poll(() => body.evaluate((e) => e.scrollTop)).toBeGreaterThanOrEqual(top - 2);
  expect(Math.abs((await body.evaluate((e) => e.scrollTop)) - top)).toBeLessThanOrEqual(2);
});

test('settings: seven sections; Apply, Revert and Restore defaults; Back and Escape with changes ask, and Keep editing has the focus', async ({ page }) => {
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await page.getByTestId('menu-settings').click();
  await waitFor(page, (s) => s.screen === 'settings', 'settings');
  const rail = page.getByRole('tablist', { name: 'Settings sections' }).getByRole('tab');
  await expect(rail).toHaveText(['Gameplay', 'Interface', 'Display', 'Audio', 'Accessibility', 'Controls', 'Saves']);
  await rail.first().focus();
  await page.keyboard.press('ArrowDown');
  await expect(rail.nth(1)).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#settings-page')).toHaveAttribute('aria-labelledby', 'settings-tab-interface');
  await page.keyboard.press('End');
  await expect(rail.nth(6)).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#settings-page')).toContainText(/save schema/i);
  await page.keyboard.press('Home');
  const original = await page.getByLabel('Battle speed').inputValue();
  const other = original === 'instant' ? 'normal' : 'instant';
  await expect(page.getByTestId('settings-apply')).toBeDisabled();
  await expect(page.getByTestId('settings-status')).toHaveText('No unsaved changes.');
  // A change: the notice, then Escape asks; Keep editing has the focus and Enter keeps the draft.
  await page.getByLabel('Battle speed').selectOption(other);
  await expect(page.getByTestId('settings-status')).toHaveText('You have unsaved changes.');
  await page.locator('body').click({ position: { x: 5, y: 500 } });
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('confirm')).toBeVisible();
  await expect(page.getByTestId('confirm-cancel')).toHaveText('Keep editing');
  await expect(page.getByTestId('confirm-cancel')).toBeFocused();
  await page.screenshot({ path: `${OUT}/settings-discard.png` });
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('confirm')).toHaveCount(0);
  expect((await inspect(page)).screen).toBe('settings');
  await expect(page.getByLabel('Battle speed')).toHaveValue(other);
  // Revert returns to the applied settings.
  await page.getByTestId('settings-revert').click();
  await expect(page.getByLabel('Battle speed')).toHaveValue(original);
  await expect(page.getByTestId('settings-apply')).toBeDisabled();
  // Restore defaults changes the draft only; Back then asks, and Discard leaves without applying.
  await page.getByLabel('Battle speed').selectOption(other);
  await page.getByTestId('settings-back').click();
  await expect(page.getByTestId('confirm')).toBeVisible();
  await expect(page.getByTestId('confirm-cancel')).toBeFocused();
  await page.getByTestId('confirm-ok').click();
  await waitFor(page, (s) => s.screen === 'main-menu', 'left without applying');
  await page.getByTestId('menu-settings').click();
  await expect(page.getByLabel('Battle speed')).toHaveValue(original);
  // Apply keeps it.
  await page.getByLabel('Battle speed').selectOption(other);
  await page.getByTestId('settings-apply').click();
  await expect(page.getByTestId('settings-status')).toHaveText('No unsaved changes.');
  await page.getByTestId('settings-defaults').click();
  await expect(page.getByTestId('settings-status')).toHaveText('You have unsaved changes.');
  await page.getByTestId('settings-revert').click();
  await expect(page.getByLabel('Battle speed')).toHaveValue(other);
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByTestId('menu-settings').click();
  await expect(page.getByLabel('Battle speed')).toHaveValue(other);
});

test('Saved Journeys: an empty archive from the title (Save disabled); an older save is kept with its reason; overwrite and load ask with Cancel focused', async ({ page }) => {
  test.setTimeout(150_000);
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await page.getByTestId('menu-load').click();
  await expect(page.getByTestId('save-load')).toBeVisible();
  await expect(page.getByTestId('save-empty')).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Save' })).toBeDisabled();
  await page.screenshot({ path: `${OUT}/saves-empty.png` });
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('save-load')).toHaveCount(0);
  // A save written by an older build (another save schema): listed, not loadable, the file kept unchanged.
  const d = GameDriver.mission('skirmish_twin_harbors', { matchId: 'e2e-fe110-saves' });
  const file = writeSave(d, 'fe110-saves');
  const old = JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>;
  old.saveSchemaVersion = 0;
  const oldText = JSON.stringify({ ...old, name: 'From an older build' });
  await page.evaluate(
    (text) =>
      new Promise<void>((resolve, reject) => {
        const req = indexedDB.open('pantheon-realms', 1);
        req.onupgradeneeded = () => req.result.createObjectStore('saves', { keyPath: 'id' });
        req.onsuccess = () => {
          const t = req.result.transaction('saves', 'readwrite');
          t.objectStore('saves').put({ id: 'manual-5', text });
          t.oncomplete = () => resolve();
          t.onerror = () => reject(t.error);
        };
        req.onerror = () => reject(req.error);
      }),
    oldText,
  );
  await importAndLoad(page, file);
  await waitFor(page, (s) => s.screen === 'adventure', 'adventure');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: /Save Game/ }).click();
  await expect(page.getByTestId('save-load')).toBeVisible();
  // Save: a slot already used asks before replacing it (danger), with Cancel focused.
  await page.getByTestId('save-manual-1').click();
  await expect(page.locator('#save-name')).toHaveAttribute('maxlength', '60');
  await expect(page.getByTestId('save-confirm')).toHaveText(/Overwrite/);
  await page.getByTestId('save-confirm').click();
  await expect(page.getByTestId('confirm')).toBeVisible();
  await expect(page.getByTestId('confirm-cancel')).toBeFocused();
  await expect(page.getByTestId('confirm-ok')).toHaveClass(/btn--danger/);
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('confirm')).toHaveCount(0);
  // Load: the older save shows its reason and cannot be loaded.
  await page.getByRole('tab', { name: 'Load' }).click();
  await expect(page.locator('.fe-saves__heading')).toHaveText(['Manual saves', 'Autosaves', 'Checkpoint']);
  await page.getByTestId('save-manual-5').click();
  await expect(page.getByTestId('save-incompatible')).toContainText('is not supported by this build');
  await expect(page.getByTestId('load-confirm')).toBeDisabled();
  // The mission picture is an illustration, not a screenshot of the save.
  await page.getByTestId('save-manual-1').click();
  await expect(page.locator('.fe-saves__art figcaption')).toContainText('not a picture of the saved game');
  await page.screenshot({ path: `${OUT}/saves-load.png` });
  await page.getByTestId('load-confirm').click();
  await expect(page.getByTestId('confirm')).toBeVisible();
  await expect(page.getByTestId('confirm-cancel')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('confirm')).toHaveCount(0);
  await expect(page.getByTestId('save-load')).toBeVisible();
  // The older file is still there, unchanged.
  const kept = await page.evaluate(
    () =>
      new Promise<string | null>((resolve) => {
        const req = indexedDB.open('pantheon-realms', 1);
        req.onsuccess = () => {
          const g = req.result.transaction('saves').objectStore('saves').get('manual-5');
          g.onsuccess = () => resolve((g.result as { text: string } | undefined)?.text ?? null);
        };
      }),
  );
  expect(kept).toBe(oldText);
});

test('map library: your maps apart from the built-in templates; the empty archive offers Import; a copy, then Save, fills the library', async ({ page }) => {
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await page.getByTestId('menu-new').click();
  await page.getByTestId('mode-editor').click();
  await waitFor(page, (s) => s.screen === 'map-editor', 'map editor');
  for (const id of ['editor-new', 'editor-generate', 'editor-open', 'editor-save', 'editor-export', 'editor-undo', 'editor-redo', 'editor-play']) await expect(page.getByTestId(id)).toBeVisible();
  await page.getByTestId('editor-open').click();
  const dialog = page.getByTestId('editor-open-dialog');
  await expect(dialog.getByTestId('library-empty')).toBeVisible();
  await expect(dialog.getByTestId('library-empty-import')).toBeVisible();
  await expect(dialog.getByTestId('editor-import')).toBeVisible();
  await expect(dialog.locator('[data-testid^="library-copy-"]')).toHaveCount(6);
  await page.screenshot({ path: `${OUT}/library-empty.png` });
  await dialog.getByTestId('library-copy-frostgate').click();
  await expect(dialog).toHaveCount(0);
  await page.getByTestId('editor-save').click();
  await expect(page.locator('.toast').last()).toContainText('Frostgate (copy)');
  await page.getByTestId('editor-open').click();
  await expect(dialog.getByTestId('library-empty')).toHaveCount(0);
  await expect(dialog.locator('[data-testid^="library-open-"]')).toHaveCount(1);
  await expect(dialog.locator('.fe-library__heading')).toHaveText([/Your maps/, /Skirmish maps/]);
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
});

test('nested web base: the pre-game art loads relative to the page, never from the site root or a local disk path', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', (r) => requests.push(r.url()));
  // The same build served one folder deeper (as on a nested web path): each request is answered from the real root.
  await page.route(/\/nested\/deeper\//, async (route) => {
    const u = new URL(route.request().url());
    u.pathname = u.pathname.replace('/nested/deeper', '');
    const response = await route.fetch({ url: u.toString() });
    await route.fulfill({ response });
  });
  await page.goto('/nested/deeper/?e2e', { waitUntil: 'networkidle' });
  await page.getByTestId('menu-new').click();
  await page.getByTestId('mode-random').click();
  await waitFor(page, (s) => s.screen === 'random-setup', 'random setup');
  const modes = await picturesDecoded(page, '[data-testid="random-type"]');
  expect(modes.broken).toEqual([]);
  const art = requests.filter((u) => /frontend-v1\.1\.0\/[\w.-]+\.png$/.test(new URL(u).pathname));
  expect(art.length).toBeGreaterThanOrEqual(9);
  for (const u of art) expect(new URL(u).pathname.startsWith('/nested/deeper/frontend-v1.1.0/'), u).toBe(true);
  expect(requests.filter((u) => /[a-z]:[\\/]|file:/i.test(new URL(u).pathname) || u.startsWith('file:'))).toEqual([]);
  // The manifest itself holds only relative files.
  const manifest = JSON.parse(readFileSync(join(ROOT, 'assets-runtime', 'frontend-v1.1.0', 'manifest.json'), 'utf8')) as { assets: Record<string, { file: string }> };
  for (const [id, a] of Object.entries(manifest.assets)) expect(a.file, id).toMatch(/^frontend-v1\.1\.0\/[\w.-]+\.png$/);
});

test('frontend kit: every piece decodes; finished pennants, section and editor icons, the warning seal and the records medallion are in place', async ({ page }) => {
  test.setTimeout(150_000);
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  // Every frontendkit.* file is served relative to the page and decodes.
  const kit = await page.evaluate(async () => {
    const m = (await (await fetch('./frontend-kit-v1.1.0/manifest.json')).json()) as { assets: Record<string, { file: string }> };
    const bad: string[] = [];
    for (const a of Object.values(m.assets)) {
      try {
        (await createImageBitmap(await (await fetch(`./${a.file}`)).blob())).close();
      } catch {
        bad.push(a.file);
      }
    }
    return { count: Object.keys(m.assets).length, bad };
  });
  expect(kit.count).toBe(33);
  expect(kit.bad).toEqual([]);
  // Pantheon choice: the six finished pennants (emblem painted on; none laid over), the name below in live text.
  await page.getByTestId('menu-new').click();
  await page.getByTestId('mode-skirmish').click();
  await page.getByTestId('scenario-skirmish_twin_harbors').click();
  await page.getByTestId('setup-next').click();
  await waitFor(page, (s) => s.screen === 'pantheon-select', 'pantheon setup');
  for (const p of PANTHEONS) {
    const banner = page.getByTestId(`pantheon-${p}`);
    await expect(banner.locator('.gui-banner__art')).toHaveAttribute('src', new RegExp(`frontend-kit-v1\\.1\\.0/banner-${p}\\.png$`));
    await expect(banner.locator('.gui-banner__emblem')).toHaveCount(0);
    await expect(banner.locator('.gui-banner__label')).not.toBeEmpty();
  }
  expect((await picturesDecoded(page, '[data-testid^="pantheon-"][role="radio"]')).broken).toEqual([]);
  // Encyclopedia: a category icon on each of the eight sections.
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await page.getByTestId('menu-encyclopedia').click();
  await expect(page.locator('[role="tab"] .tab__icon')).toHaveCount(8);
  const tabs = await picturesDecoded(page, '.fe-codex-tabs');
  expect(tabs.total).toBe(8);
  expect(tabs.broken).toEqual([]);
  // Settings: the seven rail icons; a destructive confirmation carries the seal.
  await page.getByRole('button', { name: 'Back', exact: true }).first().click();
  await page.getByTestId('menu-settings').click();
  const rail = await picturesDecoded(page, '.fe-settings__rail');
  expect(rail.total).toBe(7);
  expect(rail.broken).toEqual([]);
  const sel = page.getByLabel('Battle speed');
  await sel.selectOption((await sel.inputValue()) === 'instant' ? 'normal' : 'instant');
  await page.getByTestId('settings-back').click();
  await expect(page.getByTestId('confirm').locator('.confirm__seal')).toHaveAttribute('src', /icon-warning\.png$/);
  await page.getByTestId('confirm-ok').click();
  // Editor: the painted toolbar and tool icons.
  await page.getByTestId('menu-new').click();
  await page.getByTestId('mode-editor').click();
  await waitFor(page, (s) => s.screen === 'map-editor', 'map editor');
  for (const [id, file] of [['editor-new', 'icon-new-map'], ['editor-generate', 'icon-generate'], ['editor-export', 'icon-export'], ['editor-undo', 'icon-undo'], ['editor-redo', 'icon-redo']]) {
    await expect(page.getByTestId(id).locator('.btn__art')).toHaveAttribute('src', new RegExp(`${file}\\.png$`));
  }
  await expect(page.getByTestId('tool-select').locator('.art-icon')).toHaveAttribute('src', /icon-select\.png$/);
  await expect(page.getByTestId('tool-erase').locator('.art-icon')).toHaveAttribute('src', /icon-erase\.png$/);
  // The records link carries the laurel medallion.
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await expect(page.getByTestId('menu-records').locator('.menu-btn__art')).toHaveAttribute('src', /icon-records\.png$/);
});

const SIZES = [
  { name: '1600x1000', width: 1600, height: 1000, scale: 1 },
  { name: '1280x720', width: 1280, height: 720, scale: 1 },
  { name: '1920x1080', width: 1920, height: 1080, scale: 1 },
  { name: 'narrow-800x900', width: 800, height: 900, scale: 1 },
  // 200 % zoom of a 1600 × 1000 window: half the CSS pixels at twice the device pixels.
  { name: 'zoom200-1600x1000', width: 800, height: 500, scale: 2 },
] as const;

for (const size of SIZES) {
  test(`every pre-game screen at ${size.name}: no horizontal page scroll, the footer and its actions in the window`, async ({ browser }) => {
    test.setTimeout(150_000);
    const context = await browser.newContext({ viewport: { width: size.width, height: size.height }, deviceScaleFactor: size.scale });
    const page = await context.newPage();
    const errors = errorsOf(page);
    await page.goto('/?e2e', { waitUntil: 'networkidle' });
    await noHorizontalOverflow(page);
    const shot = async (n: string) => page.screenshot({ path: `${OUT}/${size.name}/${n}.png` });
    await shot('title');
    await page.getByTestId('menu-new').click();
    await noHorizontalOverflow(page);
    // 1.1.3 (owner): New Game has no footer strip; its Back is the header's.
    await expect(page.locator('.fe-shell__footer')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Back', exact: true })).toBeInViewport();
    await shot('new-game');
    await page.getByTestId('mode-campaign').click();
    await noHorizontalOverflow(page);
    await footerVisible(page);
    await expect(page.getByTestId('setup-begin')).toBeInViewport();
    await shot('campaign');
    await page.getByRole('button', { name: 'Back', exact: true }).last().click();
    await page.getByTestId('mode-skirmish').click();
    await noHorizontalOverflow(page);
    await footerVisible(page);
    await expect(page.getByTestId('setup-next')).toBeInViewport();
    await shot('skirmish');
    await page.getByRole('button', { name: 'Back', exact: true }).last().click();
    await page.getByTestId('mode-random').click();
    for (const c of ['land', 'empires', 'rules']) {
      await page.getByTestId(`random-chapter-${c}`).click();
      await noHorizontalOverflow(page);
      await footerVisible(page);
      await expect(page.getByTestId('random-start')).toBeInViewport();
      await shot(`random-${c}`);
    }
    await page.getByRole('button', { name: 'Back', exact: true }).last().click();
    await page.getByRole('button', { name: 'Back', exact: true }).last().click();
    await page.getByTestId('menu-encyclopedia').click();
    await noHorizontalOverflow(page);
    await expect(page.getByTestId('codex-search')).toBeInViewport();
    await shot('encyclopedia');
    await page.getByRole('button', { name: 'Back', exact: true }).first().click();
    await page.getByTestId('menu-settings').click();
    await noHorizontalOverflow(page);
    await footerVisible(page);
    await expect(page.getByTestId('settings-apply')).toBeInViewport();
    await shot('settings');
    await page.getByTestId('settings-back').click();
    await page.getByTestId('menu-records').click();
    await noHorizontalOverflow(page);
    await footerVisible(page);
    await shot('records');
    expect(errors.filter((e) => !/favicon/i.test(e))).toEqual([]);
    await context.close();
  });
}
