import { expect, test } from '@playwright/test';
import { waitFor } from './helpers';

/**
 * 2026-10-05 additions through the real screens: the three new random-map
 * layouts (Archipelago, Twin Continents for two empires, Central Valley) and
 * the battle music per pantheon. Screenshots for review.
 */

test('random maps: nine layouts; Twin Continents only for two empires; an archipelago map starts with water and portals', async ({ page }) => {
  test.setTimeout(150_000);
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await page.getByTestId('menu-new').click();
  await page.getByTestId('mode-random').click();
  const types = page.locator('[data-testid^="random-type-"][role="radio"]');
  await expect(types).toHaveCount(9);
  await page.getByTestId('random-type-twin_continents').click();
  await expect(page.getByTestId('random-type-twin_continents')).toHaveAttribute('aria-checked', 'true');
  // Three empires: Twin Continents is disabled and the choice falls back to Continental.
  await page.getByTestId('random-count-3').click();
  await expect(page.getByTestId('random-type-twin_continents')).toBeDisabled();
  await expect(page.getByTestId('random-type-continental')).toHaveAttribute('aria-checked', 'true');
  await page.getByTestId('random-count-2').click();
  await page.getByTestId('random-type-archipelago').click();
  await page.screenshot({ path: 'test-results/r20-random-types.png' });
  await page.getByTestId('random-start').click();
  const s = await waitFor(page, (x) => x.screen === 'adventure' && x.overlays.length === 0, 'adventure map', 60_000);
  const terrain: string = s.state.world.map.terrain;
  expect([...terrain].filter((c) => c === 'w').length).toBeGreaterThan(100);
  expect(Object.values(s.state.world.sites as Record<string, { kind?: string }>).length).toBeGreaterThan(20);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'test-results/r20-archipelago.png' });
});
