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
  // The griffin's animations follow its content: the seven base ones plus take-off, fly and land (Flight); no shoot.
  for (const s of ['move', 'attack', 'defend', 'hit', 'death', 'victory', 'takeoff', 'fly', 'landing', 'idle']) await page.getByTestId(`anim-${s}`).click();
  await expect(page.getByTestId('anim-shoot')).toHaveCount(0);
});

test('settings persist across reloads', async ({ page }) => {
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await page.getByTestId('menu-settings').click();
  await page.getByLabel('Battle speed').selectOption('instant');
  await page.getByTestId('settings-apply').click();
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByTestId('menu-settings').click();
  await expect(page.getByLabel('Battle speed')).toHaveValue('instant');
  // Only options that work are offered (no voice, camera-shake or screen-flash controls in this build).
  await page.getByRole('tab', { name: 'Audio' }).click();
  await expect(page.getByLabel('Voice volume')).toHaveCount(0);
  await page.getByRole('tab', { name: 'Accessibility' }).click();
  await expect(page.getByLabel('Camera shake')).toHaveCount(0);
  await expect(page.getByLabel('Screen flashes')).toHaveCount(0);
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

test('every delivered final icon and creature portrait is served and decodes; undelivered forms keep the stand-in', async ({ page }) => {
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  const manifest = (await (await page.request.get('/ui/final-manifest.json')).json()) as { assets: Record<string, { file: string }> };
  const entries = Object.entries(manifest.assets);
  expect(entries.filter(([id]) => /^creature\..*\.portrait$/.test(id)).length).toBeGreaterThanOrEqual(43);
  const bad = await page.evaluate(async (list) => {
    const out: string[] = [];
    for (const [id, file] of list) {
      const img = new Image();
      img.src = `./${file}`;
      try {
        await img.decode();
        if (img.naturalWidth === 0) out.push(id);
        else if (id.startsWith('creature.') && (img.naturalWidth !== 256 || img.naturalHeight !== 256)) out.push(`${id} ${img.naturalWidth}x${img.naturalHeight}`);
      } catch {
        out.push(id);
      }
    }
    return out;
  }, entries.map(([id, a]) => [id, a.file] as [string, string]));
  expect(bad).toEqual([]);
  await page.getByTestId('menu-encyclopedia').click();
  await expect(page.getByTestId('codex-hoplite').locator('.portrait img')).toHaveAttribute('src', /creature\.greek\.tier1\.base\.portrait\.webp$/);
  await expect(page.getByTestId('codex-japanese_kitsune').locator('.portrait img')).toHaveAttribute('src', /creature\.japanese\.tier1\.base\.portrait\.webp$/);
  // Not delivered (the Nine-Tailed Kitsune is an unfinished draft): the generated stand-in stays.
  await expect(page.getByTestId('codex-japanese_nine_tailed_kitsune').locator('.portrait img')).toHaveCount(0);
  await expect(page.getByTestId('codex-japanese_nine_tailed_kitsune').locator('.portrait svg')).toHaveCount(1);
});
