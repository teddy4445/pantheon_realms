import { expect, test } from '@playwright/test';
import { GameDriver } from '@pr/testing';
import { importAndLoad, writeSave } from './fixtures';
import { usePrefs } from './momentFixtures';
import { waitFor } from './helpers';

test('encyclopedia uses compact creature cards and readable god bonuses', async ({ page }) => {
  await usePrefs(page, { graphicsTested: true });
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('/?e2e');
  await page.getByTestId('menu-encyclopedia').click();
  await page.getByTestId('codex-filter-greek').click();
  const hoplites = page.getByTestId('codex-family-hoplite');
  await expect(hoplites).not.toContainText('In new games');
  await expect(hoplites.locator('.codex-favored__god')).toHaveCount(2);
  await expect(hoplites.locator('.codex-favored__god').first()).toContainText('+2 each week');
  await hoplites.screenshot({ path: 'test-results/polish-creatures.png' });
  await page.getByRole('tab', { name: 'Heroes', exact: true }).click();
  const hero = page.locator('.codex-card--hero').first();
  await expect(hero.locator('.specialty')).toBeVisible();
  await expect(hero).not.toContainText('Specialty');
  await hero.screenshot({ path: 'test-results/polish-hero.png' });
  await page.getByRole('tab', { name: 'Gods', exact: true }).click();
  await expect(page.getByTestId('codex-body')).not.toContainText('In new games');
  await page.getByRole('tab', { name: 'Bestiary', exact: true }).click();
  await page.getByTestId('codex-filter-neutral').click();
  await expect(page.locator('.ncx-facts')).toHaveCount(0);
  const sea = page.getByTestId('codex-pantheon-sea');
  await sea.scrollIntoViewIfNeeded();
  await expect(sea.locator('.bestiary-tier').first().locator('.bestiary-card')).toHaveCount(2);
  await expect(sea.locator('table')).toHaveCount(0);
  await sea.locator('.bestiary-tier').first().screenshot({ path: 'test-results/polish-sea.png' });
  await sea.locator('.bestiary-card').first().click();
  await waitFor(page, s => s.screen === 'unit-detail', 'sea creature details');
  expect(errors).toEqual([]);
});

test('world options remain usable across chapters and narrow screens', async ({ page }) => {
  await usePrefs(page, { graphicsTested: true });
  await page.goto('/?e2e');
  await page.getByTestId('menu-new').click();
  await page.getByTestId('mode-random').click();
  const options = page.locator('.world-options');
  await options.scrollIntoViewIfNeeded();
  await page.getByTestId('random-monsters').getByRole('radio', { name: 'Many', exact: true }).click();
  await page.getByRole('switch', { name: 'Revealed map', exact: true }).click();
  await options.screenshot({ path: 'test-results/polish-world.png' });
  await page.getByTestId('random-chapter-empires').click();
  await page.getByTestId('random-chapter-land').click();
  await expect(page.getByTestId('random-monsters').getByRole('radio', { name: 'Many', exact: true })).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByRole('switch', { name: 'Revealed map', exact: true })).toHaveAttribute('aria-checked', 'true');
  await page.setViewportSize({ width: 1024, height: 768 });
  await options.scrollIntoViewIfNeeded();
  expect(await options.evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
  await options.screenshot({ path: 'test-results/polish-world-small.png' });
});

for (const calm of [false, true]) test(`town hall upgrade reveals the new town painting (reduced motion ${calm})`, async ({ page }) => {
  await usePrefs(page, { graphicsTested: true, motion: calm ? 'reduced' : 'full' });
  const d = GameDriver.mission('skirmish_twin_harbors', { matchId: `polish-town-${calm}` });
  const t = d.state.towns['westharbor']!;
  const arch = d.catalog.townArchetypes[t.archetypeId]!;
  for (const slot of arch.slots) t.buildings[slot.id] = slot.chain.length;
  t.buildings['civic_hall'] = 1;
  t.buildUsedDay = 0;
  const owner = d.state.players[t.ownerId!]!;
  for (const k of ['gold','wood','stone','crystal','favor'] as const) owner.wallet[k] = 99999;
  await page.goto('/?e2e');
  await importAndLoad(page, writeSave(d, `polish-town-${calm}`));
  await waitFor(page, s => s.screen === 'adventure' && s.overlays.length === 0, 'adventure');
  await page.getByTestId('town-tab-westharbor').click();
  await expect(page.getByTestId('town-hall-transition')).toHaveCount(0);
  await page.getByTestId('slot-civic_hall').click();
  await page.getByTestId('build').click();
  await expect(page.getByTestId('town-scene')).toHaveAttribute('style', /background\.l2\.webp/);
  if (!calm) {
    await expect(page.getByTestId('town-hall-transition')).toBeVisible();
    await page.getByTestId('town-scene').screenshot({ path: 'test-results/polish-town-upgrade.png' });
  }
  await expect(page.getByTestId('town-hall-transition')).toHaveCount(0);
});

