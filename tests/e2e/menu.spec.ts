import { expect, test } from '@playwright/test';
import { buildCatalog } from '@pr/content';
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
  // 1.1.3: the title always shows the frontend kit's title painting (the older ones are only a fallback).
  await expect(page.locator('.main-menu__bg')).toHaveAttribute('data-background', 'frontendkit.backdrop.title');
  const images = await page.locator('.main-menu img').evaluateAll((els) => els.map((e) => ({ src: (e as HTMLImageElement).src, ok: (e as HTMLImageElement).complete && (e as HTMLImageElement).naturalWidth > 0 })));
  expect(images.length).toBeGreaterThanOrEqual(2);
  for (const im of images) expect(im, im.src).toMatchObject({ ok: true });
  // The title is the logo alone (1.1.0: the frontend kit's logo layer, else the older lettering); no
  // tagline, footer emblem or "Temporary art" chip.
  expect(images.some((im) => /frontend-kit-v1\.1\.0\/brand-logo[^/]*\.png$|logo-text/.test(im.src))).toBe(true);
  await expect(page.locator('.main-menu__tagline, .main-menu__emblem')).toHaveCount(0);
  await expect(page.getByText('Temporary art')).toHaveCount(0);
  await expect(page.locator('.main-menu__shade')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0.2)');
  for (const id of ['menu-new', 'menu-load', 'menu-encyclopedia', 'menu-settings']) await expect(page.getByTestId(id)).toBeVisible();
  // Campaign and Skirmish live under New Game; Random Map too; High Scores under the end-of-game summary; no Credits.
  for (const id of ['menu-campaign', 'menu-skirmish', 'menu-credits', 'menu-random', 'menu-highscores']) await expect(page.getByTestId(id)).toHaveCount(0);
  await page.getByTestId('menu-encyclopedia').click();
  await expect(page.getByTestId('codex-hoplite')).toBeVisible();
  await expect(page.locator('.screen-header__subtitle')).toHaveCount(0);
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
      // Every hero has a short story under its specialty.
      await expect(page.getByTestId('codex-hero-heracles')).toContainText(/labours|labors/i);
    }
    // Cards of one section share one height.
    await expect
      .poll(async () => {
        const hs = await page.locator('.codex-body [data-eq]').evaluateAll((els) => els.map((e) => [e.getAttribute('data-eq'), Math.round(e.getBoundingClientRect().height)] as const));
        const groups = new Map<string, number[]>();
        for (const [g, h] of hs) groups.set(g ?? '', [...(groups.get(g ?? '') ?? []), h]);
        return Math.max(0, ...[...groups.values()].map((v) => Math.max(...v) - Math.min(...v)));
      }, { message: `${t}: equal card heights` })
      .toBeLessThanOrEqual(1);
  }
  await page.getByRole('tab', { name: 'Bestiary' }).click();
  await page.getByTestId('codex-griffin').click();
  expect((await inspect(page)).screen).toBe('unit-detail');
  // One panel: name, larger summary, statistics, abilities, lore — no tags, no version tabs, no assets section.
  await expect(page.getByTestId('unit-name')).toHaveText('Griffin');
  await expect(page.locator('.unit-info .chip')).toHaveCount(0);
  await expect(page.getByRole('tab', { name: 'Windcrest Griffin' })).toHaveCount(0);
  await expect(page.locator('.unit-info')).not.toContainText(/Implemented|Balance: proposed|Assets/);
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

test('the Settings header has no subtitle', async ({ page }) => {
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
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
  // Forms whose portrait is not delivered keep the generated stand-in; once every form's portrait is
  // delivered (the owner's import of 2026-10-03), every creature card shows its painting.
  // Only forms whose portrait lives in the interface manifest count here; the neutral and sea forms bring
  // their own delivered portraits (campaign-v2, battle-fx and sea-creature kits), never a stand-in.
  const forms = Object.values(buildCatalog().creatures).filter((c) => c.presentation.portraitAssetId.startsWith('creature.')).length;
  const delivered = entries.filter(([id]) => /^creature\..*\.portrait$/.test(id)).length;
  if (delivered >= forms) {
    for (const id of ['japanese_nine_tailed_kitsune', 'celtic_pooka', 'mesoamerican_stone_colossus']) await expect(page.getByTestId(`codex-${id}`).locator('.portrait img')).toHaveCount(1);
  } else {
    await expect(page.locator('[data-testid^="codex-"] .portrait svg').first()).toBeVisible();
  }
});
