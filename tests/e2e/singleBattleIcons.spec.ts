import { test, expect, type Page } from '@playwright/test';
import { usePrefs } from './momentFixtures';
import { waitFor } from './helpers';

const folder = 'docs/single-battle-icons-v1';
async function checkArt(page: Page) {
  await expect(page.locator('img[data-sb-icon]').first()).toBeVisible();
  await expect.poll(() => page.locator('img[data-sb-icon]').evaluateAll(images =>
    images.filter(image => !(image as HTMLImageElement).complete || !(image as HTMLImageElement).naturalWidth).map(image => image.getAttribute('data-sb-icon'))
  )).toEqual([]);
  await expect(page.locator('svg.sb-icon')).toHaveCount(0);
  // Wait for the surrounding painted art as well before recording visual evidence.
  await expect.poll(() => page.locator('img:visible').evaluateAll(images =>
    images.filter(image => !(image as HTMLImageElement).complete || !(image as HTMLImageElement).naturalWidth).map(image => image.getAttribute('src'))
  ), { timeout: 45000 }).toEqual([]);
}

test('painted battle icons across setup, dialogs, board modes and results', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await usePrefs(page, { graphicsTested: true, motion: 'reduced', battleSpeed: 'instant' });
  await page.goto('/?e2e');
  await page.getByTestId('menu-new').click();
  await checkArt(page);
  await page.screenshot({ path: `${folder}/new-game.png` });
  await page.getByTestId('mode-single').click();
  await checkArt(page);
  await page.screenshot({ path: `${folder}/land-setup.png` });
  await page.getByRole('button', { name: 'Add attacker stack 4', exact: true }).click();
  await page.getByLabel('Search creatures').fill('hoplite');
  await page.getByTestId('single-creature-picker').locator('.sb-picker-grid button').first().click();
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.locator('.sb-attacker .sb-stack')).toHaveCount(3);
  await page.getByRole('button', { name: 'Redo', exact: true }).click();
  await expect(page.locator('.sb-attacker .sb-stack')).toHaveCount(4);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await page.getByRole('button', { name: 'Advanced settings', exact: true }).click();
  await checkArt(page);
  await expect(page.locator('[data-sb-icon="import"]')).toBeVisible();
  await expect(page.locator('[data-sb-icon="export"]')).toBeVisible();
  await page.screenshot({ path: `${folder}/advanced-settings.png` });
  await page.getByRole('dialog').getByRole('button', { name: 'Close', exact: true }).click();
  await page.getByRole('button', { name: 'Save preset', exact: true }).click();
  await page.getByRole('button', { name: 'Battle library', exact: true }).click();
  await checkArt(page);
  await expect(page.locator('[data-sb-icon="delete"]')).toBeVisible();
  await page.screenshot({ path: `${folder}/battle-library.png` });
  await page.getByRole('button', { name: 'Load', exact: true }).click();
  for (const mode of ['Siege', 'Naval']) {
    await page.getByRole('button', { name: mode, exact: true }).click();
    await checkArt(page);
    await expect(page.getByRole('button', { name: 'Deploy', exact: true })).toBeEnabled();
    await page.screenshot({ path: `${folder}/${mode.toLowerCase()}-setup.png` });
  }
  for (const [width, height] of [[1024, 768], [1280, 720]]) {
    await page.setViewportSize({ width, height });
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    await checkArt(page);
    const seed = await page.locator('.sb-seed').boundingBox();
    const main = await page.locator('.fe-shell__main').boundingBox();
    expect(seed!.y + seed!.height).toBeLessThanOrEqual(main!.y + main!.height);
    await page.screenshot({ path: `${folder}/setup-${width}.png` });
  }
  await page.setViewportSize({ width: 1600, height: 900 });
  await page.getByRole('button', { name: 'Land', exact: true }).click();
  await page.locator('.sb-defender').getByRole('button', { name: 'Player', exact: true }).click();
  await page.getByRole('button', { name: 'Deploy', exact: true }).click();
  await page.getByTestId('deploy-confirm').click();
  await page.getByTestId('deploy-confirm').click();
  await waitFor(page, state => !state.busy && state.screen === 'battle' && state.state.battle?.round === 1, 'battle begins');
  await page.getByTestId('battle-surrender').click();
  await page.getByTestId('confirm-ok').click();
  await expect(page.getByTestId('single-battle-result')).toBeVisible();
  await checkArt(page);
  await expect(page.locator('[data-sb-icon="replay"]')).toBeVisible();
  await page.screenshot({ path: `${folder}/battle-result.png` });
  expect(errors).toEqual([]);
});
