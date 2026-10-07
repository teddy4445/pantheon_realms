/**
 * The owner's round of 2026-10-07 (third list) through the real controls:
 * campaign difficulty levels — chosen on the campaign page with their exact
 * effects, kept in the campaign run and the match, shown in the briefing, and
 * written into the objective texts with the counts the match really has.
 */
import { expect, test } from '@playwright/test';
import { loadCatalog } from '@pr/content';
import { scaleStackCount } from '@pr/rules';
import { inspect, waitFor } from './helpers';
import { usePrefs } from './momentFixtures';

test('campaign difficulty: Story / Normal / Hard on the campaign page, kept in the run, in the briefing and the objective texts', async ({ page }) => {
  test.setTimeout(120_000);
  await usePrefs(page, { graphicsTested: true, tutorialHints: false });
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await page.getByTestId('menu-new').click();
  await page.getByTestId('mode-campaign').click();
  await page.getByTestId('scenario-three_beacons').click();
  // Three levels, Normal chosen by default.
  await expect(page.getByTestId('campaign-difficulty')).toBeVisible();
  await expect(page.getByTestId('campaign-difficulty-campaign_story')).toBeVisible();
  await expect(page.getByTestId('campaign-difficulty-campaign_normal')).toHaveAttribute('aria-checked', 'true');
  await page.getByTestId('campaign-difficulty-campaign_hard').click();
  await expect(page.getByTestId('campaign-difficulty-campaign_hard')).toHaveAttribute('aria-checked', 'true');
  const hard = loadCatalog().difficulties['campaign_hard']!;
  // The exact effects are listed under the choice.
  await expect(page.locator('.setting-block__details')).toContainText(`${hard.guardPercent}% of the written numbers`);
  await page.waitForTimeout(400); // the choice's colour transition
  await page.screenshot({ path: 'test-results/r0109-campaign-difficulty.png' });
  await page.getByTestId('setup-begin').click();
  // The briefing names the level, and its objectives already show the scaled guards.
  const hoplites = scaleStackCount(6, hard.guardPercent!);
  await expect(page.getByTestId('briefing-facts')).toContainText('Hard difficulty');
  await expect(page.getByTestId('briefing')).toContainText(`Defeat the ${hoplites} Hoplites guarding the bridge`);
  await page.screenshot({ path: 'test-results/r0109-briefing.png' });
  await page.getByTestId('briefing-begin').click();
  await waitFor(page, (s) => s.screen === 'adventure' && s.overlays.length === 0, 'adventure map');
  const s = await inspect(page);
  expect(s.state.scenario.difficultyId).toBe('campaign_hard');
  expect(s.campaign.difficultyId).toBe('campaign_hard');
  // The bridge guard in the match is the written 6 at the level's share — the same number as the text.
  expect(s.state.world.sites['m01_ford'].guard[0].count).toBe(hoplites);
  await page.keyboard.press('j');
  await waitFor(page, (x) => x.screen === 'journal', 'journal');
  await expect(page.getByTestId('objective-m01_ford')).toContainText(`Defeat the ${hoplites} Hoplites guarding the bridge`);
  await page.screenshot({ path: 'test-results/r0109-journal.png' });
});
