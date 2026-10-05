import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { waitFor } from './helpers';

/**
 * The map editor (S22, 2026-10-05) through its real controls: paint ground and
 * a road, place both towns, a guarded gold mine and a portal pair, see the
 * checks, save to the map library and reopen it, export the map file, and play
 * the map to the adventure screen. Screenshots for review.
 */

function errorsOf(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  return errors;
}

/** Click the canvas at a fraction of its size (the map starts centred). */
async function at(page: Page, fx: number, fy: number) {
  const box = (await page.getByTestId('editor-canvas').boundingBox())!;
  return { x: box.x + box.width * fx, y: box.y + box.height * fy };
}

async function clickAt(page: Page, fx: number, fy: number) {
  const p = await at(page, fx, fy);
  await page.mouse.click(p.x, p.y);
}

test('make a small map, check it, save and reopen it, export it and play it', async ({ page }) => {
  test.setTimeout(240_000);
  const errors = errorsOf(page);
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await page.getByTestId('menu-new').click();
  await page.getByTestId('mode-editor').click();
  await waitFor(page, (s) => s.screen === 'map-editor', 'map editor');
  await expect(page.getByTestId('editor-status')).toContainText('problems to fix');
  await page.getByTestId('editor-name').fill('Two Rivers');

  // Ground: a forest stroke and a water stroke (brush 2).
  await page.getByTestId('tool-ground-forest').click();
  await page.getByTestId('brush-2').click();
  let a = await at(page, 0.4, 0.3);
  let b = await at(page, 0.6, 0.3);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps: 12 });
  await page.mouse.up();
  await page.getByTestId('tool-ground-water').click();
  a = await at(page, 0.5, 0.62);
  b = await at(page, 0.5, 0.8);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps: 10 });
  await page.mouse.up();

  // A road.
  await page.getByTestId('tool-road').click();
  a = await at(page, 0.3, 0.5);
  b = await at(page, 0.7, 0.5);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps: 20 });
  await page.mouse.up();

  // Both towns (empire 1 west, empire 2 east), a guarded gold mine and a portal pair.
  await page.getByTestId('tool-place-town').click();
  await page.getByTestId('town-owner-0').click();
  await clickAt(page, 0.25, 0.5);
  await page.getByTestId('town-owner-1').click();
  await clickAt(page, 0.75, 0.5);
  await page.getByTestId('tool-place-gold_mine').click();
  await clickAt(page, 0.5, 0.42);
  await page.getByTestId('tool-place-portal').click();
  await clickAt(page, 0.3, 0.75);
  await clickAt(page, 0.7, 0.25);
  await expect(page.getByTestId('editor-status')).toHaveText('Ready to play');
  await page.getByRole('tab', { name: 'Check' }).click();
  await expect(page.getByTestId('editor-check-ok')).toBeVisible();
  await page.screenshot({ path: 'test-results/editor-map.png' });

  // The mine's guard is editable in the Site panel.
  await page.getByTestId('tool-select').click();
  await clickAt(page, 0.5, 0.42);
  await expect(page.getByTestId('editor-site')).toContainText('Gold Mine');
  await page.getByTestId('site-guard-count').fill('15');

  // Save to the library, start a new map, and reopen the saved one.
  await page.getByTestId('editor-save').click();
  await expect(page.locator('.toast').last()).toContainText('Saved “Two Rivers”');
  await page.getByTestId('editor-new').click();
  await page.getByTestId('editor-new-create').click();
  await expect(page.getByTestId('editor-status')).toContainText('problems to fix');
  await page.getByTestId('editor-open').click();
  const open = page.getByTestId('editor-open-dialog');
  await expect(open).toContainText('Two Rivers');
  await open.getByRole('button', { name: 'Open' }).first().click();
  await expect(page.getByTestId('editor-status')).toHaveText('Ready to play');

  // Export: a .prmap.json download holding the same document.
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByTestId('editor-export').click()]);
  expect(download.suggestedFilename()).toBe('Two Rivers.prmap.json');
  const file = JSON.parse(readFileSync((await download.path())!, 'utf8')) as { format: string; name: string; sites: { kind: string; guard?: { count: number } }[] };
  expect(file.format).toBe('pantheon-realms-map');
  expect(file.name).toBe('Two Rivers');
  expect(file.sites.filter((s) => s.kind === 'town')).toHaveLength(2);
  expect(file.sites.find((s) => s.kind === 'gold_mine')?.guard?.count).toBe(15);

  // Play: empire 1 a person, empire 2 the AI.
  await page.getByTestId('editor-play').click();
  await expect(page.getByTestId('editor-play-dialog')).toBeVisible();
  await page.screenshot({ path: 'test-results/editor-play.png' });
  await page.getByTestId('editor-play-start').click();
  const s = await waitFor(page, (x) => x.screen === 'adventure' && x.overlays.length === 0, 'adventure map', 60_000);
  expect(s.state.scenario.name).toBe('Two Rivers');
  expect(s.state.scenario.missionId).toMatch(/^custom_two_rivers_/);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'test-results/editor-played.png' });
  expect(errors.filter((e) => !/favicon/i.test(e))).toEqual([]);
});

test('the editor refuses a damaged map file and Escape asks before leaving unsaved work', async ({ page }) => {
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await page.getByTestId('menu-new').click();
  await page.getByTestId('mode-editor').click();
  await waitFor(page, (s) => s.screen === 'map-editor', 'map editor');
  await page.getByTestId('editor-open').click();
  const chooser = page.waitForEvent('filechooser');
  await page.getByTestId('editor-import').click();
  await (await chooser).setFiles({ name: 'broken.prmap.json', mimeType: 'application/json', buffer: Buffer.from('{"format":"pantheon-realms-map","version":1,"width":3}') });
  await expect(page.locator('.toast').last()).toContainText('size is out of range');
  await page.keyboard.press('Escape'); // closes the open dialog
  await expect(page.getByTestId('editor-open-dialog')).toHaveCount(0);
  // An edit, then Escape: the editor asks first.
  await page.getByTestId('tool-place-town').click();
  await clickAt(page, 0.3, 0.5);
  await page.getByTestId('editor-canvas').focus();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('editor-leave')).toBeVisible();
  await page.getByTestId('editor-leave-confirm').click();
  await waitFor(page, (s) => s.screen === 'game-mode', 'back on New Game');
});
