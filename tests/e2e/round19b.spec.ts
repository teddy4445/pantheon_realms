import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { GameDriver } from '@pr/testing';
import { waitFor } from './helpers';
import { importAndLoad, writeSave } from './fixtures';

/**
 * The visual-completion delivery of 2026-10-04 in the running game: the nine
 * Workshop treasures, the artifact-set emblems (active and inactive), the
 * creature-ability badges, the Herald's dialogue bust and the twelve quieter
 * opening paintings. Screenshots are kept for review (copied out of
 * test-results by the reviewer).
 */

const ROOT = process.cwd(); // Playwright runs from the repository root
const UI = JSON.parse(readFileSync(join(ROOT, 'assets-runtime/ui/manifest.json'), 'utf8')) as { backgrounds: string[]; assets: Record<string, { file: string }> };
const WORKSHOP = ['boiled_leather_jerkin', 'waxed_travel_cloak', 'copper_circlet', 'scholars_oil_lamp', 'watchmans_lantern', 'woven_saddle_blanket', 'clay_votive_amulet', 'bronze_seal_ring', 'iron_shod_spear'];

function errorsOf(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  return errors;
}

/** Every <img> under the locator has loaded a final icon file (not a stand-in). */
async function finalImages(page: Page, selector: string): Promise<{ src: string; ok: boolean }[]> {
  return page.locator(selector).evaluateAll((els) =>
    els.map((e) => {
      const img = e as HTMLImageElement;
      return { src: img.getAttribute('src') ?? '', ok: img.complete && img.naturalWidth > 0 };
    }),
  );
}

test('the nine Workshop treasures and the set emblems are final art on the hero screen; a set badge lights when its bonus is active', async ({ page }) => {
  const errors = errorsOf(page);
  const d = GameDriver.mission('skirmish_twin_harbors', { matchId: 'e2e-r19b-icons' });
  const h = d.state.heroes['alexios']!;
  h.backpack.push(...WORKSHOP.map((id, i) => ({ instanceId: `e2e_w_${i}`, artifactId: id })));
  // Two pieces of the Arms of the Einherjar worn: the set's first bonus is active.
  h.equipment = { ...h.equipment, weapon: { instanceId: 'e2e_s1', artifactId: 'rune_marked_sword' }, shield: { instanceId: 'e2e_s2', artifactId: 'shieldmaiden_round_shield' } } as never;
  h.backpack.push({ instanceId: 'e2e_s3', artifactId: 'phalanx_spear' });
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await importAndLoad(page, writeSave(d, 'r19b icons'));
  await waitFor(page, (s) => s.screen === 'adventure' && s.overlays.length === 0, 'adventure map');
  await page.getByTitle('Hero (H)').click();
  await waitFor(page, (s) => s.screen === 'hero', 'hero screen');
  for (const id of WORKSHOP) {
    // The pictures load lazily; wait until each has decoded (a busy machine takes a moment).
    await expect
      .poll(async () => (await finalImages(page, `[data-testid="pack-${id}"] img`)).some((x) => x.ok && x.src.includes(`icons/final/icon.artifact.${id}.png`)), { message: id, timeout: 15_000 })
      .toBe(true);
  }
  const worn = page.getByTestId('slot-weapon').getByTestId('set-badge-arms_of_the_einherjar');
  await expect(worn).toHaveClass(/is-final/);
  await expect(worn).toHaveClass(/is-active/);
  const packed = page.getByTestId('pack-phalanx_spear').getByTestId('set-badge-panoply_of_the_phalanx');
  await expect(packed).toHaveClass(/is-final/);
  await expect(packed).not.toHaveClass(/is-active/);
  await expect(packed).toHaveAttribute('aria-label', 'Set: Panoply of the Phalanx');
  await expect.poll(async () => (await finalImages(page, '.set-badge img')).every((x) => x.ok && x.src.includes('icons/final/icon.set.')), { timeout: 15_000 }).toBe(true);
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'test-results/r19b-hero-icons.png' });
  expect(errors.filter((e) => !/favicon/i.test(e))).toEqual([]);
});

test('creature ability badges are final art with their names as tooltips (retaliation and the four shapeshift forms stay distinct)', async ({ page }) => {
  const errors = errorsOf(page);
  const d = GameDriver.mission('skirmish_twin_harbors', { matchId: 'e2e-r19b-badges' });
  const want = ['retaliation_2', 'retaliation_unlimited', 'shapeshift_hare', 'shapeshift_waterhorse', 'shapeshift_sealskin', 'shapeshift_rut', 'flight', 'shooter'];
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await page.getByTestId('menu-encyclopedia').click();
  await page.getByRole('tab', { name: 'Bestiary' }).click();
  const seen = new Set<string>();
  for (const ability of want) {
    if (seen.has(ability)) continue;
    const creatures = Object.values(d.catalog.creatures).filter((c) => c.abilityIds.includes(ability));
    let opened = false;
    for (const c of creatures) {
      const card = page.getByTestId(`codex-${c.id}`);
      if ((await card.count()) === 0) continue;
      await card.first().click();
      await waitFor(page, (s) => s.screen === 'unit-detail', 'unit detail');
      opened = true;
      const badges = page.locator('.unit-info [data-testid^="ability-badge-"]');
      await expect(badges.first()).toBeVisible();
      for (const b of await badges.all()) {
        const id = ((await b.getAttribute('data-testid')) ?? '').replace('ability-badge-', '');
        seen.add(id);
        await expect(b, id).toHaveClass(/is-final/);
        const ab = d.catalog.abilities[id];
        if (ab) await expect(b, id).toHaveAttribute('title', `${ab.name}: ${ab.summary}`);
      }
      await page.screenshot({ path: `test-results/r19b-abilities-${ability}.png` });
      // Back to the bestiary for the next ability (a fresh start keeps the steps simple).
      await page.goto('/?e2e', { waitUntil: 'networkidle' });
      await page.getByTestId('menu-encyclopedia').click();
      await page.getByRole('tab', { name: 'Bestiary' }).click();
      break;
    }
    expect(opened, `a bestiary creature with ${ability}`).toBe(true);
  }
  for (const a of want) expect(seen.has(a), a).toBe(true);
  // The badges are different pictures.
  const files = want.map((a) => readFileSync(join(ROOT, `assets-runtime/ui/icons/final/icon.ability.${a}.png`)).toString('base64'));
  expect(new Set(files).size).toBe(want.length);
  expect(errors.filter((e) => !/favicon/i.test(e))).toEqual([]);
});

test('the Herald speaks the Eastharbor briefing with its own painted bust', async ({ page }) => {
  const errors = errorsOf(page);
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await page.getByTestId('menu-new').click();
  await page.getByTestId('mode-skirmish').click();
  await page.getByTestId('scenario-skirmish_twin_harbors').click();
  await page.getByTestId('setup-next').click();
  await page.getByTestId('setup-begin').click();
  const briefing = page.getByTestId('briefing');
  await expect(briefing).toContainText('Eastharbor’s war-leader marches for the gold mine. Hold the coast.');
  const bust = briefing.getByTestId('story-bust');
  await expect(bust).toHaveAttribute('src', /story\.herald\.bust/);
  await expect(bust).toBeVisible();
  await expect.poll(() => bust.evaluate((e) => (e as HTMLImageElement).naturalWidth), { timeout: 15_000 }).toBe(768);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'test-results/r19b-herald.png' });
  expect(errors.filter((e) => !/favicon/i.test(e))).toEqual([]);
});

test('each of the twelve quieter opening paintings keeps the logo and every menu button legible (16:9 and 16:10)', async ({ page }) => {
  test.setTimeout(240_000);
  const errors = errorsOf(page);
  expect(UI.backgrounds).toHaveLength(12);
  for (const id of UI.backgrounds) {
    const file = join(ROOT, 'assets-runtime', UI.assets[id]!.file);
    // Test-side only: whichever painting the menu picks, serve this one.
    await page.unroute('**/ui/backgrounds/*.webp');
    await page.route('**/ui/backgrounds/*.webp', (route) => route.fulfill({ path: file, contentType: 'image/webp' }));
    for (const size of [{ width: 1280, height: 720 }, { width: 1280, height: 800 }]) {
      await page.setViewportSize(size);
      await page.goto('/?e2e', { waitUntil: 'networkidle' });
      await expect(page.locator('.main-menu__logo')).toBeVisible();
      for (const b of ['menu-new', 'menu-load', 'menu-encyclopedia', 'menu-settings']) await expect(page.getByTestId(b)).toBeVisible();
      // A fresh profile has no save: Continue is shown disabled (with its reason) and New Game has the keyboard focus.
      await expect(page.getByTestId('menu-continue')).toBeVisible();
      await expect(page.getByTestId('menu-continue')).toBeDisabled();
      await expect(page.getByTestId('menu-new')).toBeFocused();
      const loaded = await page.evaluate(() => {
        const bg = document.querySelector('.main-menu__bg') as HTMLElement | null;
        return bg ? getComputedStyle(bg).backgroundImage : '';
      });
      expect(loaded, id).toContain('ui/backgrounds/');
      await page.getByTestId('menu-load').hover();
      await page.waitForTimeout(1300);
      await page.screenshot({ path: `test-results/r19b-menu-${id.replace('menu.background.', '')}-${size.height}.png` });
    }
  }
  await page.setViewportSize({ width: 1280, height: 720 });
  // Reduced motion: no slow drift behind the labels.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await expect(page.locator('.main-menu__logo')).toBeVisible();
  const anim = await page.evaluate(() => getComputedStyle(document.querySelector('.main-menu__bg')!).animationName);
  expect(anim).toBe('none');
  expect(errors.filter((e) => !/favicon/i.test(e))).toEqual([]);
});
