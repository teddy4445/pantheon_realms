import { expect, test, type Page } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { GameDriver } from '@pr/testing';
import { recordCompletion, startCampaign, startNextMission, type CampaignState } from '@pr/campaign';
import { createEnvelope, serializeEnvelope } from '@pr/session';
import type { MatchState } from '@pr/rules';
import { clickHex, inspect, waitFor } from './helpers';
import { importAndLoad } from './fixtures';

/**
 * Story art (delivery 2026-10-02) in the real screens: campaign covers and
 * cards, the briefing scene with speaker busts (mirrored on the right), and the
 * campaign's ending picture behind the epilogue — at a large and a small
 * window size. Every picture must load (no broken paths). Screenshots are kept
 * for review.
 */

const SIZES = [
  { name: 'large', width: 1600, height: 900 },
  { name: 'small', width: 1024, height: 640 },
] as const;

/** Every <img> on the page has loaded with real pixels. */
async function imagesLoaded(page: Page): Promise<{ broken: string[]; count: number }> {
  return page.evaluate(async () => {
    const imgs = [...document.querySelectorAll('img')];
    await Promise.all(imgs.map((i) => (i.complete ? null : new Promise((r) => { i.onload = r; i.onerror = r; }))));
    return { broken: imgs.filter((i) => i.naturalWidth === 0).map((i) => i.getAttribute('src') ?? '?'), count: imgs.length };
  });
}

for (const size of SIZES) {
  test(`campaign selection shows covers and cards; the briefing shows the mission art and busts (${size.name})`, async ({ page }) => {
    await page.setViewportSize({ width: size.width, height: size.height });
    await page.goto('/?e2e', { waitUntil: 'networkidle' });
    await page.getByTestId('menu-new').click();
    await page.getByTestId('mode-campaign').click();
    await page.getByTestId('scenario-winter_oath').click();
    await page.waitForTimeout(500);
    let imgs = await imagesLoaded(page);
    expect(imgs.broken).toEqual([]);
    const cover = await page.evaluate(() => getComputedStyle(document.querySelector('.setup-screen')!).backgroundImage);
    expect(cover).toContain('campaign.winter_oath.cover.webp');
    await page.screenshot({ path: `test-results/story-campaign-select-${size.name}.png` });

    // The Three Beacons: mission 1 briefing — Thaleia (right, mirrored) then Alexios (left).
    await page.getByTestId('scenario-three_beacons').click();
    await page.getByTestId('setup-begin').click();
    await waitFor(page, (s) => s.overlays.includes('briefing'), 'briefing', 30_000, true);
    const art = page.getByTestId('scene-art');
    await expect(art).toBeVisible();
    expect(await art.getAttribute('src')).toContain('mission.three_beacons.m01.briefing.webp');
    const bust = page.getByTestId('story-bust');
    // Wide windows: the bust stands beside the box; small ones (no room beside the objectives): the box shows the
    // speaker's small portrait — the square one delivered with Brief 17 (2026-10-06), the bust where there is none.
    const wide = size.name === 'large';
    const shown = wide ? bust : page.locator('.briefing-scene .story-box__mini img');
    await expect(shown).toBeVisible();
    expect(await shown.getAttribute('src')).toContain(wide ? 'hero.greek.thaleia.bust.webp' : 'hero.greek.thaleia.portrait.webp');
    expect(await bust.getAttribute('data-side')).toBe('right');
    expect(await bust.getAttribute('style')).toContain('scaleX(-1)');
    if (wide) expect(await bust.evaluate((e) => getComputedStyle(e).transform)).toMatch(/matrix\(-1/);
    else await expect(bust).toBeHidden();
    await page.waitForTimeout(400);
    imgs = await imagesLoaded(page);
    expect(imgs.broken).toEqual([]);
    // The title stays inside the window and above the dialogue.
    const head = await page.locator('.briefing-scene__head').boundingBox();
    const box = await page.locator('.briefing-scene .story-box').boundingBox();
    expect(head!.x + head!.width).toBeLessThanOrEqual(size.width);
    expect(head!.y + head!.height).toBeLessThan(box!.y);
    await page.screenshot({ path: `test-results/story-briefing-thaleia-${size.name}.png` });
    await page.getByTestId('briefing-next').click();
    await expect(bust).toHaveAttribute('src', /hero\.greek\.alexios\.bust\.webp/);
    if (!wide) await expect(shown).toHaveAttribute('src', /hero\.greek\.alexios\.portrait\.webp/);
    expect(await bust.getAttribute('data-side')).toBe('left');
    expect(await bust.getAttribute('style')).not.toContain('scaleX(-1)');
    await page.waitForTimeout(400);
    await page.screenshot({ path: `test-results/story-briefing-alexios-${size.name}.png` });
    await page.getByTestId('briefing-begin').click();
    await waitFor(page, (s) => s.screen === 'adventure' && !s.overlays.includes('briefing'), 'adventure map', 30_000, true);
  });
}

/**
 * A save on the last mission of The Three Beacons with everything but the final
 * beacon done (campaign records for missions 1 and 2 committed headlessly).
 */
function finalBeaconSave(): string {
  const d = GameDriver.mission('three_beacons_m01');
  const catalog = d.catalog;
  let { campaign, start } = startCampaign(catalog, 'three_beacons', { runId: 'e2e-epilogue', startingGodId: 'zeus' });
  let match: MatchState = start.match;
  for (let i = 0; i < 2; i++) {
    match = { ...match, outcome: { status: 'victory', reason: 'Test fixture', day: match.day }, pendingDecisions: [] };
    campaign = recordCompletion(catalog, campaign, match);
    const next = startNextMission(catalog, campaign);
    campaign = next.campaign as CampaignState;
    match = next.start.match;
  }
  const m = match;
  for (const [id, o] of Object.entries(m.mission.objectives)) if (id !== 'm03_restore') o.status = 'completed';
  m.mission.objectives['m03_restore']!.status = 'active';
  for (const f of ['relay_north', 'relay_south', 'lens_recovered']) m.mission.flags[f] = true;
  const beacon = m.world.sites['m03_beacon']!;
  beacon.cleared = true;
  beacon.guard = null;
  const alexios = m.heroes['alexios']!;
  alexios.position = { q: 26, r: 10 };
  for (const fog of Object.values(m.fog)) fog.explored = fog.explored.map(() => 1);
  const env = createEnvelope(catalog, { match: m, campaign }, { id: 'manual-1', kind: 'manual', name: 'epilogue', savedAt: new Date(0).toISOString() });
  const file = join(tmpdir(), 'story-epilogue.prsave.json');
  writeFileSync(file, serializeEnvelope(env));
  return file;
}

test('the campaign’s own ending picture fills the screen behind its epilogue', async ({ page }) => {
  test.setTimeout(240_000);
  const file = finalBeaconSave();
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await page.getByTestId('menu-settings').click();
  await page.getByLabel('Battle speed').selectOption('instant');
  await page.getByTestId('settings-apply').click();
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await importAndLoad(page, file);
  await waitFor(page, (s) => s.screen === 'adventure', 'adventure', 20_000, true);
  await clickHex(page, 26, 10);
  await waitFor(page, (x) => x.overlays.includes('activate'), 'activation dialog', 20_000, true);
  await page.getByTestId('activate-confirm').click();
  let s = await inspect(page);
  for (let i = 0; i < 40 && !s.story.some((k) => k.startsWith('epilogue:')); i++) {
    if (s.story.length > 0) {
      await page.getByTestId('story-continue').click();
    } else if (s.screen === 'level-up') {
      await page.getByTestId('offer-0').click();
    }
    await page.waitForTimeout(500);
    s = await inspect(page);
  }
  expect(s.story[0]).toBe('epilogue:three_beacons');
  const art = page.getByTestId('scene-art');
  await expect(art).toBeVisible();
  expect(await art.getAttribute('src')).toContain('ending.three_beacons.epilogue.webp');
  await page.waitForTimeout(500);
  expect((await imagesLoaded(page)).broken).toEqual([]);
  // The dialogue stays in the bottom quarter-to-third of the screen.
  const vp = page.viewportSize()!;
  const box = await page.locator('.story-layer .story-box').boundingBox();
  expect(box!.y).toBeGreaterThan(vp.height * 0.6);
  await page.screenshot({ path: 'test-results/story-epilogue-large.png' });
  await page.setViewportSize({ width: 1024, height: 640 });
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'test-results/story-epilogue-small.png' });
  // Read the epilogue to its end; the campaign summary follows.
  for (let i = 0; i < 10 && (await page.getByTestId('story-dialogue').isVisible().catch(() => false)); i++) {
    await page.getByTestId('story-continue').click();
    await page.waitForTimeout(150);
  }
  await waitFor(page, (x) => x.overlays.includes('campaign-complete'), 'campaign complete', 20_000, true);
});
