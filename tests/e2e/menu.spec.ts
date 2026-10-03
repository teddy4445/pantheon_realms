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
  expect(images.length).toBeGreaterThanOrEqual(2);
  for (const im of images) expect(im, im.src).toMatchObject({ ok: true });
  // The title is the logo lettering alone; no tagline, footer emblem or "Temporary art" chip.
  expect(images.some((im) => im.src.includes('logo-text'))).toBe(true);
  await expect(page.locator('.main-menu__tagline, .main-menu__emblem')).toHaveCount(0);
  await expect(page.getByText('Temporary art')).toHaveCount(0);
  await expect(page.locator('.main-menu__shade')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0.2)');
  for (const id of ['menu-new', 'menu-load', 'menu-campaign', 'menu-skirmish', 'menu-encyclopedia', 'menu-settings', 'menu-credits']) await expect(page.getByTestId(id)).toBeVisible();
  // Random Map and High Scores live under New Game and the end-of-game summary.
  for (const id of ['menu-random', 'menu-highscores']) await expect(page.getByTestId(id)).toHaveCount(0);
  await page.getByTestId('menu-encyclopedia').click();
  await expect(page.getByTestId('codex-hoplite')).toBeVisible();
  // Eight pages; every pantheon's bestiary one below the other, each under its own divider (no pantheon buttons, no tags).
  await expect(page.getByRole('tab')).toHaveText(['Bestiary', 'Gods', 'Heroes', 'Towns', 'Spells', 'Skills', 'Artifacts', 'Abilities'].map((t) => new RegExp(t)));
  for (const p of ['greek', 'norse', 'egyptian', 'japanese', 'celtic', 'mesoamerican', 'neutral']) await expect(page.getByTestId(`codex-pantheon-${p}`).locator('.codex-divider')).toHaveCount(1);
  await expect(page.getByTestId('codex-pantheon-egyptian').getByTestId('codex-egyptian_sacred_scarab')).toBeVisible();
  await expect(page.locator('.codex-screen .chip')).toHaveCount(0);
  for (const t of ['Gods', 'Heroes', 'Towns', 'Spells', 'Skills', 'Artifacts', 'Abilities']) {
    await page.getByRole('tab', { name: t }).click();
    await expect(page.locator('.codex-screen .chip')).toHaveCount(0);
    await expect(page.locator('.codex-body .codex-card, .codex-body .panel').first()).toBeVisible();
    if (t === 'Heroes') {
      await expect(page.getByTestId('codex-hero-heracles')).toBeVisible();
      await expect(page.locator('.codex-body').getByText(/hireable|concept-board/i)).toHaveCount(0);
    }
  }
  await page.getByRole('tab', { name: 'Bestiary' }).click();
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

test('credits name the creator in large type; the Settings header has no subtitle', async ({ page }) => {
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await page.getByTestId('menu-credits').click();
  const credits = page.getByTestId('credits');
  await expect(credits.locator('.credits__name')).toHaveText('Teddy Lazebnik');
  const size = await credits.locator('.credits__name').evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  expect(size).toBeGreaterThanOrEqual(22);
  await page.keyboard.press('Escape');
  await page.getByTestId('menu-settings').click();
  await expect(page.locator('.screen-header__title')).toHaveText('Settings');
  await expect(page.locator('.screen-header__subtitle')).toHaveCount(0);
});
