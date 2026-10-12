import { expect, test, type Page } from '@playwright/test';
import { GameDriver } from '@pr/testing';
import { axialNeighbors, quoteMovement, type HexCoord } from '@pr/rules';
import { clickHex, inspect, waitFor } from './helpers';
import { approachTile, importAndLoad, writeSave } from './fixtures';

/**
 * 2026-10-04 additions through the real screens: climate rules (encounter
 * line and battle chip), the AI rivals' temperaments in both setups, and the
 * god commitment (dialog preview with icon rows, the moment on the card, none
 * under reduced motion). Fixtures are ordinary saves; screenshots for review.
 */

function driver(matchId: string): GameDriver {
  const d = GameDriver.mission('skirmish_twin_harbors', { matchId });
  for (const fog of Object.values(d.state.fog)) fog.explored = fog.explored.map(() => 1);
  return d;
}

async function open(page: Page, file: string, errors: string[]): Promise<void> {
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await importAndLoad(page, file);
}

type HeroDebug = { sprite: string };
async function waitAvatars(page: Page, ids: readonly string[]): Promise<void> {
  for (let i = 0; i < 120; i++) {
    const h = (await page.evaluate(() => (globalThis as unknown as { __prHeroes: () => Record<string, HeroDebug> | null }).__prHeroes())) ?? {};
    if (ids.every((id) => h[id]?.sprite === 'ready')) return;
    await page.waitForTimeout(250);
  }
  throw new Error('hero avatars not ready');
}

test('climate rules: the encounter names the weather and the battle shows its chip (fog on the moor)', async ({ page }) => {
  test.setTimeout(120_000);
  const d = driver('e2e-climate');
  d.state.world.map.biome = 'moor';
  const hero = d.state.heroes['alexios']!;
  hero.movementPoints = 2000;
  const rival = d.state.heroes['rival_odysseus']!;
  rival.position = { q: 12, r: 8 };
  // Two steps away, so the click asks before the battle.
  const approach = approachTile(d, rival.position, hero.id);
  let start: HexCoord | null = null;
  for (const n of axialNeighbors(approach)) {
    if (n.q === rival.position.q && n.r === rival.position.r) continue;
    hero.position = n;
    const q = quoteMovement(d.catalog, d.state, hero.id, rival.position);
    if (q.reachable && q.endsInEncounter && q.path.length === 2) {
      start = n;
      break;
    }
  }
  expect(start).not.toBeNull();
  hero.position = start!;
  const errors: string[] = [];
  await open(page, writeSave(d, 'climate moor'), errors);
  await waitFor(page, (s) => s.screen === 'adventure' && !s.busy, 'adventure map');
  await waitAvatars(page, ['alexios', 'rival_odysseus']);
  await clickHex(page, rival.position.q, rival.position.r);
  if (!(await inspect(page)).overlays.includes('encounter')) await clickHex(page, rival.position.q, rival.position.r);
  await waitFor(page, (s) => s.overlays.includes('encounter'), 'encounter dialog');
  const line = page.getByTestId('encounter-climate');
  await expect(line).toContainText('Fog');
  await expect(line).toContainText('Both armies alike');
  await page.waitForTimeout(1500); // the dialog fades in
  await page.screenshot({ path: 'test-results/r19-encounter-climate.png' });
  await page.getByTestId('encounter-attack').click();
  const s = await waitFor(page, (x) => x.screen === 'battle', 'battle screen', 30_000);
  expect(s.state.battle.climate).toMatchObject({ id: 'moor', rangeMod: -6 });
  const chip = page.getByTestId('battle-climate');
  await expect(chip).toHaveAttribute('data-climate', 'moor');
  await expect(chip).toContainText('Fog');
  await expect(chip).toHaveAttribute('title', /range is 6 hexes shorter/);
  await page.waitForTimeout(1200);
  await page.screenshot({ path: 'test-results/r19-battle-climate.png' });
  expect(errors.filter((e) => !/favicon/i.test(e))).toEqual([]);
});

test('AI temperaments: the skirmish setup names the rival’s way of playing; the random-map setup lists one per AI seat and can turn them off', async ({ page }) => {
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await page.getByTestId('menu-new').click();
  await page.getByTestId('mode-skirmish').click();
  await page.getByTestId('scenario-skirmish_twin_harbors').click();
  await page.getByTestId('setup-next').click();
  await page.getByTestId('rival-norse').click();
  await expect(page.getByTestId('rival-temperament')).toContainText('Raiders');
  await page.getByTestId('rival-celtic').click();
  await expect(page.getByTestId('rival-temperament')).toContainText('Mystics');
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'test-results/r19-setup-temperament.png' });
  // A second person instead of the AI: no temperament.
  await page.getByTestId('rival-controller-human').click();
  await expect(page.getByTestId('rival-temperament')).toHaveCount(0);

  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await page.getByTestId('menu-new').click();
  await page.getByTestId('mode-random').click();
  await page.getByTestId('random-count-3').click();
  await page.getByTestId('random-size-small').click();
  await page.getByTestId('random-chapter-empires').click();
  await page.getByTestId('seat-1-pantheon').selectOption('egyptian');
  await page.getByTestId('seat-2-pantheon').selectOption('mesoamerican');
  await expect(page.getByTestId('seat-1-temperament')).toContainText('Builders');
  await expect(page.getByTestId('seat-2-temperament')).toContainText('Devout');
  await expect(page.getByTestId('seat-0-temperament')).toHaveCount(0); // the human seat
  const toggle = page.getByRole('switch', { name: 'Pantheon temperaments' });
  await expect(toggle).toHaveAttribute('aria-checked', 'true');
  await page.getByTestId('seat-1').scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'test-results/r19-random-temperaments.png' });
  await toggle.click();
  await expect(page.getByTestId('seat-1-temperament')).toHaveCount(0);
  await page.getByTestId('random-start').click();
  const s = await waitFor(page, (x) => x.screen === 'adventure' && x.overlays.length === 0, 'adventure map', 60_000);
  expect(s.state.scenario.features.aiTemperaments).toBe(false);
  expect(s.state.scenario.features.climateRules).toBe(true);
});

async function openGods(page: Page, file: string, errors: string[]): Promise<void> {
  await open(page, file, errors);
  await page.getByTestId('town-tab-westharbor').click();
  await page.getByTestId('slot-pantheon_temple').click();
  await page.getByTestId('building-popup').getByRole('button', { name: 'Pantheon & gods' }).click();
  await waitFor(page, (s) => s.screen === 'pantheon', 'pantheon screen');
}

function godsSave(name: string): string {
  const d = driver(`e2e-${name}`);
  const t = d.state.towns['westharbor']!;
  t.buildings['pantheon_temple'] = 2;
  t.buildings['civic_hall'] = 3;
  d.state.players['player']!.wallet.favor = 50;
  return writeSave(d, name);
}

test('god commitment: the dialog shows the god’s icon rows and whom it shuts out; the card then shows the moment once', async ({ page }) => {
  const errors: string[] = [];
  await openGods(page, godsSave('gods commit'), errors);
  // The patron panel carries its role and permanence icons.
  await expect(page.locator('.pantheon-patron .god-chip').first()).toContainText('Patron');
  await page.getByTestId('god-athena').getByRole('button', { name: 'Commit' }).click();
  const preview = page.getByTestId('god-commit-preview');
  await expect(preview).toBeVisible();
  await expect(preview.getByTestId('god-benefits-athena')).toBeVisible();
  await expect(preview.getByTestId('god-price-athena')).toBeVisible();
  const excludes = preview.getByTestId('god-commit-excludes');
  await expect(excludes).toContainText('Shuts out for good');
  await expect(preview).toContainText('cannot be undone');
  await page.waitForTimeout(1500); // the dialog fades in
  await page.screenshot({ path: 'test-results/r19-god-commit-dialog.png' });
  await page.getByTestId('confirm-ok').click();
  await waitFor(page, (x) => x.state.players.player.pantheon.minorGodIds.includes('athena'), 'Athena committed');
  const fx = page.getByTestId('god-athena').getByTestId('god-commit-fx');
  await expect(fx).toBeVisible();
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'test-results/r19-god-commit-fx.png' });
  await expect(fx).toHaveCount(0, { timeout: 4000 });
  await expect(page.getByTestId('god-state-athena')).toBeVisible();
  // The other first-choice gods are now excluded.
  await expect(page.locator('[data-testid^="god-state-"]').filter({ hasText: 'Excluded' }).first()).toBeVisible();
  expect(errors.filter((e) => !/favicon/i.test(e))).toEqual([]);
});

test('god commitment under reduced motion: committed without the moment', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const errors: string[] = [];
  await openGods(page, godsSave('gods reduced'), errors);
  await page.getByTestId('god-athena').getByRole('button', { name: 'Commit' }).click();
  await expect(page.getByTestId('god-commit-preview')).toBeVisible();
  await page.getByTestId('confirm-ok').click();
  await waitFor(page, (x) => x.state.players.player.pantheon.minorGodIds.includes('athena'), 'Athena committed');
  await page.waitForTimeout(400);
  await expect(page.getByTestId('god-commit-fx')).toHaveCount(0);
  expect(errors.filter((e) => !/favicon/i.test(e))).toEqual([]);
});
