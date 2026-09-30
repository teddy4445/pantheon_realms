import { expect, test } from '@playwright/test';
import { inspect } from './helpers';

test('main menu: honest Continue, no fake Quit, encyclopedia and bestiary viewer', async ({ page }) => {
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await expect(page.getByRole('heading', { name: 'Pantheon Realms' })).toBeVisible();
  const cont = page.getByTestId('menu-continue');
  await expect(cont).toBeDisabled();
  await expect(cont).toContainText('No compatible save');
  await expect(page.getByTestId('menu-quit')).toHaveCount(0);
  await page.getByTestId('menu-encyclopedia').click();
  await expect(page.getByTestId('codex-hoplite')).toBeVisible();
  // Every pantheon has a bestiary; proposed values are labeled as such.
  await page.getByRole('button', { name: 'Egyptian' }).click();
  await expect(page.getByTestId('codex-egyptian_sacred_scarab')).toBeVisible();
  await expect(page.getByText('Balance: proposed').first()).toBeVisible();
  await page.getByRole('button', { name: 'Greek' }).click();
  await page.getByTestId('codex-griffin').click();
  expect((await inspect(page)).screen).toBe('unit-detail');
  for (const s of ['Move', 'Melee', 'Defend', 'Hit', 'Defeat', 'Victory', 'Idle']) await page.getByRole('radio', { name: s }).click();
  await expect(page.getByRole('radio', { name: 'Ranged' })).toBeDisabled();
});

test('settings persist across reloads', async ({ page }) => {
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await page.getByTestId('menu-settings').click();
  await page.getByLabel('Battle speed').selectOption('instant');
  await page.getByTestId('settings-apply').click();
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByTestId('menu-settings').click();
  await expect(page.getByLabel('Battle speed')).toHaveValue('instant');
  // Unsupported features are disabled with a reason, not faked.
  await page.getByRole('tab', { name: 'Audio' }).click();
  await expect(page.getByText('No audio in this build').first()).toBeVisible();
});
