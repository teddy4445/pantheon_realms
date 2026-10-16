import { expect, test, type Page } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { GameDriver } from '@pr/testing';
import { recordCompletion, startCampaign, startNextMission, type CampaignState } from '@pr/campaign';
import { createEnvelope, serializeEnvelope } from '@pr/session';
import { missionSite, type ContentCatalog, type MatchState } from '@pr/rules';
import { clickHex, inspect, waitFor } from './helpers';
import { importAndLoad } from './fixtures';

/**
 * GPT-6 Brief 18 (The Silent Oracle's story art, imported 2026-10-14) in the
 * real screens: the cover, the campaign card and the seven mission cards in
 * order; Doros's bust and square portrait in his scene and his portrait in the
 * battle header (a named guard commander); each ending's own picture. Every
 * picture must load.
 */

async function brokenImages(page: Page): Promise<string[]> {
  return page.evaluate(async () => {
    const imgs = [...document.querySelectorAll('img')];
    await Promise.all(imgs.map((i) => (i.complete ? null : new Promise((r) => { i.onload = r; i.onerror = r; }))));
    return imgs.filter((i) => i.naturalWidth === 0).map((i) => i.getAttribute('src') ?? '?');
  });
}

/** A save at the start of The Silent Oracle's mission n (earlier missions recorded as won headlessly). */
function silentOracleSave(n: number, name: string, mutate: (m: MatchState, catalog: ContentCatalog) => void): string {
  const catalog = GameDriver.mission('three_beacons_m01').catalog;
  let { campaign, start } = startCampaign(catalog, 'silent_oracle', { runId: `e2e-${name}`, startingGodId: 'zeus', contentVersion: 1 });
  let match: MatchState = start.match;
  for (let i = 1; i < n; i++) {
    match = { ...match, outcome: { status: 'victory', reason: 'Test fixture', day: match.day }, pendingDecisions: [] };
    campaign = recordCompletion(catalog, campaign, match);
    const next = startNextMission(catalog, campaign);
    campaign = next.campaign as CampaignState;
    match = next.start.match;
  }
  mutate(match, catalog);
  const env = createEnvelope(catalog, { match, campaign }, { id: 'manual-1', kind: 'manual', name, savedAt: new Date(0).toISOString() });
  const file = join(tmpdir(), `brief18-${name}.prsave.json`);
  writeFileSync(file, serializeEnvelope(env));
  return file;
}

/** Alexios on the road next to a site (the side he comes from), strong, with the map revealed. */
function besideSite(m: MatchState, catalog: ContentCatalog, siteId: string): void {
  const c = missionSite(catalog, m, siteId)!.coord;
  const key = `${c.q},${c.r}`;
  const ends = m.world.map.roads.flatMap((seg) => {
    const [a, b] = seg.split('|');
    return a === key ? [b!] : b === key ? [a!] : [];
  });
  const [q, r] = ends.map((e) => e.split(',').map(Number) as [number, number]).sort((x, y) => x[0] - y[0])[0]!;
  const alexios = m.heroes['alexios']!;
  alexios.position = { q, r };
  alexios.movementPoints = 3000;
  for (const s of alexios.army.slots) if (s) s.count *= 30;
  for (const fog of Object.values(m.fog)) fog.explored = fog.explored.map(() => 1);
}

async function loadInstant(page: Page, file: string): Promise<void> {
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await page.getByTestId('menu-settings').click();
  await page.getByLabel('Battle speed').selectOption('instant');
  await page.getByTestId('settings-apply').click();
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await importAndLoad(page, file);
  await waitFor(page, (s) => s.screen === 'adventure', 'adventure', 30_000, true);
  await page.waitForTimeout(800);
}

test('The Silent Oracle: cover, campaign card and the six chapter paintings in order (content v2)', async ({ page }) => {
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await page.getByTestId('menu-new').click();
  await page.getByTestId('mode-campaign').click();
  await page.getByTestId('scenario-silent_oracle').click();
  await expect(page.getByTestId('campaign-cover')).toHaveAttribute('src', /campaign\.silent_oracle\.cover\.webp$/);
  await expect(page.getByTestId('scenario-silent_oracle').locator('img')).toHaveAttribute('src', /campaign\.silent_oracle\.thumbnail\.webp$/);
  // Content v2 (2026-10-15): six chapters in the chronicle; each chapter's painting is its first briefing art.
  const nodes = page.getByTestId('chronicle-graph').locator('[data-testid^="chapter-silent_oracle_v2_m"]');
  await expect(nodes).toHaveCount(6);
  const ids = await nodes.evaluateAll((els) => els.map((e) => e.getAttribute('data-testid')));
  expect(ids).toEqual([1, 2, 3, 4, 5, 6].map((n) => `chapter-silent_oracle_v2_m0${n}`));
  expect(await brokenImages(page)).toEqual([]);
});

test('Doros at the labyrinth gate: his bust and square portrait in the scene, his portrait in the battle header', async ({ page }) => {
  test.setTimeout(180_000);
  const file = silentOracleSave(6, 'doros', (m, c) => besideSite(m, c, 'm06_gate'));
  const gate = GameDriver.mission('three_beacons_m01').catalog.missions['silent_oracle_m06']!.sites.find((s) => s.id === 'm06_gate')!.coord;
  await loadInstant(page, file);
  for (let i = 0; i < 8 && !(await inspect(page)).overlays.includes('encounter'); i++) {
    await clickHex(page, gate.q, gate.r);
    await page.waitForTimeout(400);
    await clickHex(page, gate.q, gate.r);
    await page.waitForTimeout(1000);
  }
  await page.getByTestId('encounter-attack').click();
  await waitFor(page, (s) => s.story.length > 0, 'Doros speaks', 60_000, true);
  // Doros speaks first; Alexios is the campaign hero, so Doros stands on the right, mirrored to face the box.
  await expect(page.locator('.story-box__speaker')).toHaveText('Doros');
  const bust = page.getByTestId('story-bust');
  await expect(bust).toHaveAttribute('src', /hero\.greek\.doros\.bust\.webp$/);
  await expect(bust).toHaveAttribute('data-side', 'right');
  expect(await bust.evaluate((e) => (e as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  await expect(page.locator('.story-box__mini img').first()).toHaveAttribute('src', /hero\.greek\.doros\.portrait\.webp$/);
  expect(await brokenImages(page)).toEqual([]);
  for (let i = 0; i < 4 && (await inspect(page)).story.length; i++) {
    await page.getByTestId('story-continue').click();
    await page.waitForTimeout(300);
  }
  await waitFor(page, (s) => s.screen === 'battle' && !s.story.length, 'battle', 30_000, true);
  // A named guard commander shows his own portrait beside his name (guards without a commander show none).
  const defender = page.locator('.battle-side[data-side="defender"]');
  await expect(defender.locator('.battle-side__name')).toHaveText('Doros');
  await expect(defender.locator('img[src*="hero.greek.doros.portrait"]')).toHaveCount(1);
  await expect(page.locator('.battle-side[data-side="attacker"] img[src*="hero.greek.alexios.portrait"]')).toHaveCount(1);
});

for (const flag of ['oracle_speaks', 'cities_decide'] as const) {
  test(`The Silent Oracle ends with its own picture for ${flag}`, async ({ page }) => {
    test.setTimeout(240_000);
    const file = silentOracleSave(7, `end-${flag}`, (m, c) => {
      for (const [id, o] of Object.entries(m.mission.objectives)) o.status = id === 'm07_seal' ? 'active' : 'completed';
      for (const f of ['stone_north', 'stone_south', 'boss_defeated', flag]) m.mission.flags[f] = true;
      const hall = m.world.sites['m07_hall']!;
      hall.cleared = true;
      hall.guard = null;
      for (const pl of Object.values(m.players)) if (pl.controller === 'human') Object.assign(pl.wallet, { gold: 99_999, crystal: 99, favor: 99 });
      besideSite(m, c, 'm07_seal');
    });
    const seal = GameDriver.mission('three_beacons_m01').catalog.missions['silent_oracle_m07']!.sites.find((s) => s.id === 'm07_seal')!.coord;
    // The offering stands at the map's east edge: a large window keeps it clear of the side panel.
    await page.setViewportSize({ width: 1920, height: 1080 });
    await loadInstant(page, file);
    for (let i = 0; i < 12 && !(await inspect(page)).overlays.includes('activate'); i++) {
      if ((await inspect(page)).story.length) await page.getByTestId('story-continue').click();
      else {
        await clickHex(page, seal.q, seal.r);
        await page.waitForTimeout(400);
        await clickHex(page, seal.q, seal.r);
      }
      await page.waitForTimeout(1000);
    }
    // Read every scene that opens over the offering (one can arrive a moment later on a busy machine).
    for (let i = 0; i < 20; i++) {
      if ((await inspect(page)).story.length) await page.getByTestId('story-continue').click();
      else if (i >= 3) break;
      await page.waitForTimeout(400);
    }
    await page.getByTestId('activate-confirm').click();
    let s = await inspect(page);
    for (let i = 0; i < 40 && !s.story.some((k) => k.startsWith('epilogue:')); i++) {
      if (s.story.length > 0) await page.getByTestId('story-continue').click();
      else if (s.screen === 'level-up') await page.getByTestId('offer-0').click();
      await page.waitForTimeout(500);
      s = await inspect(page);
    }
    expect(s.story[0]).toBe('epilogue:silent_oracle');
    const art = page.getByTestId('scene-art');
    await expect(art).toHaveAttribute('src', new RegExp(`ending\\.silent_oracle\\.${flag}\\.webp$`));
    expect(await art.evaluate((e) => (e as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    expect(await brokenImages(page)).toEqual([]);
  });
}
