import { expect, test } from '@playwright/test';
import { inspect } from './helpers';

test('main menu: honest Continue, no fake Quit, encyclopedia and bestiary viewer', async ({ page }) => {
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await expect(page.getByRole('heading', { name: 'Pantheon Realms' })).toBeVisible();
  const cont = page.getByTestId('menu-continue');
  await expect(cont).toBeDisabled();
  await expect(cont).toContainText('No compatible save');
  await expect(page.getByTestId('menu-quit')).toHaveCount(0);
  // Opening screen art: a background from the manifest list, the title logo, the frame and
  // the menu icons all load from bundled files (nothing broken, nothing remote).
  await expect(page.locator('.main-menu__bg')).toHaveAttribute('data-background', /^menu\.background\./);
  const images = await page.locator('.main-menu img').evaluateAll((els) => els.map((e) => ({ src: (e as HTMLImageElement).src, ok: (e as HTMLImageElement).complete && (e as HTMLImageElement).naturalWidth > 0 })));
  expect(images.length).toBeGreaterThanOrEqual(3);
  for (const im of images) expect(im, im.src).toMatchObject({ ok: true });
  for (const id of ['menu-new', 'menu-load', 'menu-campaign', 'menu-skirmish', 'menu-random', 'menu-highscores', 'menu-encyclopedia', 'menu-settings', 'menu-credits']) await expect(page.getByTestId(id)).toBeVisible();
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
  await expect(page.getByText('This build has no voice lines.').first()).toBeVisible();
  await expect(page.getByLabel('Voice volume')).toBeDisabled();
});
