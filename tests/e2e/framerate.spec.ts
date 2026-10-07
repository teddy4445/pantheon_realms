import { expect, test } from '@playwright/test';
import { GameDriver } from '@pr/testing';
import { waitFor } from './helpers';
import { importAndLoad, writeSave } from './fixtures';
import { usePrefs } from './momentFixtures';

/**
 * Frame-rate work (owner request 2026-10-06): Settings → Display has the
 * frame-rate readout (off by default) and adaptive resolution (on by default);
 * with the readout on, the map shows frames per second, the slowest recent
 * frame and the frames below 30 per second since the view opened. High is
 * capped at 60 frames per second.
 */
test('Settings: the frame-rate readout and adaptive resolution; the readout over the map', async ({ page }) => {
  await usePrefs(page, { graphicsTested: true, graphicsQuality: 'high' });
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await page.getByTestId('menu-settings').click();
  await page.getByRole('tab', { name: /Display/ }).click();
  await expect(page.getByText(/60 frames per second at most\.$/).first()).toBeVisible();
  const adaptive = page.getByRole('switch', { name: 'Adaptive resolution', exact: true });
  const readout = page.getByRole('switch', { name: 'Frame rate', exact: true });
  await expect(adaptive).toBeChecked();
  await expect(readout).not.toBeChecked();
  await readout.click();
  await expect(readout).toBeChecked();
  await page.getByTestId('settings-apply').click();
  await page.screenshot({ path: 'test-results/framerate-settings.png' });

  // The test's own start-up preferences run again on every page load: keep the applied choice.
  await usePrefs(page, { graphicsTested: true, graphicsQuality: 'high', showFrameRate: true });
  const d = GameDriver.mission('skirmish_twin_harbors', { matchId: 'e2e-framerate' });
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await importAndLoad(page, writeSave(d, 'frame rate'));
  await waitFor(page, (x) => x.screen === 'adventure' && x.overlays.length === 0, 'map', 60_000);
  const box = page.getByTestId('frame-rate');
  await expect(box).toBeVisible({ timeout: 15_000 });
  // Frame pacing (2026-10-07): with nothing moving the map is drawn calm, and the readout says so…
  await expect(box).toHaveAttribute('data-calm', 'true', { timeout: 15_000 });
  await expect(box).toContainText(/calm · \d+ drawn/);
  await expect(box).toContainText(/move the view to measure/);
  await page.screenshot({ path: 'test-results/framerate-calm.png' });
  // …and while the view moves it measures the frame rate again.
  const vp = page.viewportSize()!;
  await page.mouse.move(vp.width / 2, vp.height / 2);
  await page.mouse.down();
  for (let i = 0; i < 40; i++) await page.mouse.move(vp.width / 2 + Math.cos(i / 4) * 160, vp.height / 2 + Math.sin(i / 4) * 90, { steps: 2 });
  await expect(box).toContainText(/\d+ fps/);
  await expect(box).toContainText(/slowest \d+ ms/);
  await page.mouse.up();
  await expect(box).toContainText(/below 30 fps: \d+ of [\d,]+/);
  // The readout never takes clicks meant for the map.
  expect(await box.evaluate((el) => getComputedStyle(el).pointerEvents)).toBe('none');
  // The renderer's own counters agree that frames are being drawn.
  const f = await page.evaluate(() => (globalThis as unknown as { __prFrames: () => { total: number; resolutionScale: number } }).__prFrames());
  expect(f.total).toBeGreaterThan(0);
  expect(f.resolutionScale).toBeGreaterThan(0.59);
  await page.screenshot({ path: 'test-results/framerate-map.png' });
});
