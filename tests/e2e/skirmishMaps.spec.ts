import { expect, test, type Page } from '@playwright/test';
import { waitFor } from './helpers';

/**
 * The six authored skirmish maps (2026-10-05) through the real screens: New
 * Game → Skirmish lists them after Twin Harbors with a picture (the drawn
 * overview until the GPT-6 art arrives), each shows its facts and layout, and
 * "Set Up Empires" opens the seat setup (one seat per empire of the map) that
 * starts the game. Screenshots for review.
 */

const MAPS = [
  ['frostgate', 2],
  ['burning_oasis', 4],
  ['circle_of_gates', 3],
  ['barrows', 2],
  ['golden_fords', 2],
  ['six_thrones', 6],
] as const;

function errorsOf(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  return errors;
}

async function openSkirmishList(page: Page) {
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await page.getByTestId('menu-new').click();
  await page.getByTestId('mode-skirmish').click();
  await waitFor(page, (s) => s.screen === 'scenario-select', 'scenario list');
}

test('skirmish list: six maps after Twin Harbors, each with its picture, facts and layout', async ({ page }) => {
  test.setTimeout(120_000);
  const errors = errorsOf(page);
  await openSkirmishList(page);
  await expect(page.locator('[data-testid^="skirmish-map-"]:not([data-testid="skirmish-map-detail"])')).toHaveCount(6);
  await page.screenshot({ path: 'test-results/maps-list.png' });
  for (const [id, empires] of MAPS) {
    const card = page.getByTestId(`skirmish-map-${id}`);
    await card.scrollIntoViewIfNeeded();
    await card.click();
    await expect(card).toHaveClass(/is-selected/);
    await expect(card).toContainText(`${empires} empires`);
    const detail = page.locator('.setup-detail');
    await expect(detail.locator('.map-detail__fact').first()).toContainText(String(empires));
    // A picture: the painted art when delivered, else the drawn overview (both canvases drawn).
    await expect(detail.locator('[data-testid="map-preview"], [data-testid="map-art"]').first()).toBeVisible();
    const drawn = await detail.locator('canvas[data-testid="map-preview"]').evaluateAll((els) => els.every((c) => (c as HTMLCanvasElement).width > 100 && (c as HTMLCanvasElement).height > 60));
    expect(drawn, id).toBe(true);
    await expect(page.getByTestId('setup-next')).toHaveText(/Set Up Empires/);
    await page.waitForTimeout(200);
    await page.screenshot({ path: `test-results/maps-detail-${id}.png` });
  }
  expect(errors.filter((e) => !/favicon/i.test(e))).toEqual([]);
});

test('Frostgate: seat setup with two seats, a chosen pantheon per seat, then the adventure map', async ({ page }) => {
  test.setTimeout(120_000);
  const errors = errorsOf(page);
  await openSkirmishList(page);
  await page.getByTestId('skirmish-map-frostgate').click();
  await page.getByTestId('setup-next').click();
  await waitFor(page, (s) => s.screen === 'map-setup', 'map setup');
  const seats = page.locator('[data-testid="map-setup-seats"] .seat-row');
  await expect(seats).toHaveCount(2);
  await page.getByTestId('seat-0-pantheon').selectOption('japanese');
  await page.getByTestId('seat-1-pantheon').selectOption('egyptian');
  // Nobody human: Start is refused with the reason.
  await page.getByTestId('seat-0-controller-ai').click();
  await expect(page.getByTestId('map-setup-start')).toBeDisabled();
  await expect(page.getByTestId('map-setup-reason')).toContainText('person');
  await page.getByTestId('seat-0-controller-human').click();
  await page.getByTestId('seat-0-name').fill('Teddy');
  await page.screenshot({ path: 'test-results/maps-setup-frostgate.png' });
  await page.getByTestId('map-setup-start').click();
  const s = await waitFor(page, (x) => x.screen === 'adventure' && x.overlays.length === 0, 'adventure map', 60_000);
  expect(s.state.customMission.scenarioId).toBe('skirmish_map_frostgate');
  expect(s.state.customMission.thumbnailAssetId).toBe('mission.skirmish.frostgate.thumbnail');
  expect(s.state.customMission.player.pantheonId).toBe('japanese');
  expect(s.state.customMission.rivals[0].pantheonId).toBe('egyptian');
  expect(s.state.world.map.biome).toBe('fjord');
  const gates = Object.values(s.state.customMission.sites as { kind: { type: string; color?: string } }[]).filter((x) => x.kind.type === 'key_gate');
  expect(gates.map((g) => g.kind.color)).toEqual(['crimson', 'crimson']);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'test-results/maps-frostgate-start.png' });
  expect(errors.filter((e) => !/favicon/i.test(e))).toEqual([]);
});

test('The Six Thrones: six seats, hold-the-shrine goal, starts with five AI empires', async ({ page }) => {
  test.setTimeout(150_000);
  const errors = errorsOf(page);
  await openSkirmishList(page);
  await page.getByTestId('skirmish-map-six_thrones').click();
  await page.getByTestId('setup-next').click();
  await waitFor(page, (s) => s.screen === 'map-setup', 'map setup');
  await expect(page.locator('[data-testid="map-setup-seats"] .seat-row')).toHaveCount(6);
  await page.screenshot({ path: 'test-results/maps-setup-six_thrones.png' });
  await page.getByTestId('map-setup-start').click();
  const s = await waitFor(page, (x) => x.screen === 'adventure' && x.overlays.length === 0, 'adventure map', 90_000);
  expect(Object.keys(s.state.players)).toHaveLength(6);
  expect(s.state.customMission.victoryCondition).toEqual({ type: 'hold_site', siteId: 'relic', days: 10 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'test-results/maps-six_thrones-start.png' });
  expect(errors.filter((e) => !/favicon/i.test(e))).toEqual([]);
});
