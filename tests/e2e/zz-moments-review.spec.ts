import { expect, test, type Page } from '@playwright/test';
import { GameDriver } from '@pr/testing';
import { xpForLevel } from '@pr/rules';
import { inspect, waitFor } from './helpers';
import { importAndLoad, writeSave } from './fixtures';
import { STRONG, WEAK, clickBattleCell, finishBattle, goldBattle, goldBattleDriver, imagesLoaded, leaderOf, toHumanBattleTurn, usePrefs, waitForSighting, watchMoments, weekDawnDriver } from './momentFixtures';

/**
 * Review sweep for the big-moment art (opt-in: PR_REVIEW=1; screenshots go to
 * PR_REVIEW_DIR, default test-results/review). Every one of the 41 pictures in
 * the real game: the 14 miracle cards invoked in play with the frame and live
 * nameplate, the 12 victory/defeat paintings under the actual battle-result
 * panels, the 6 level-up banners and the 9 new-week banners (over a dark and a
 * light map), plus one sheet of all banners and cards on a dark and a light
 * background for alpha edges. Not part of the default run.
 */

test.skip(!process.env.PR_REVIEW, 'review sweep: set PR_REVIEW=1');
const DIR = process.env.PR_REVIEW_DIR ?? 'test-results/review';
const PANTHEONS = ['greek', 'norse', 'egyptian', 'japanese', 'celtic', 'mesoamerican'] as const;
const mission = (p: string) => (p === 'greek' ? 'skirmish_twin_harbors' : `skirmish_twin_harbors_${p}_vs_greek`);

const MAP_MIRACLES: [string, string][] = [
  ['favorable_winds', 'greek'],
  ['bountiful_harvest', 'greek'],
  ['tithe_of_the_faithful', 'greek'],
  ['inspiration', 'greek'],
  ['blessing_of_the_nile', 'egyptian'],
  ['mists_of_the_sidhe', 'celtic'],
  ['gift_of_the_feathered_serpent', 'mesoamerican'],
];
const BATTLE_MIRACLES: [string, string, boolean][] = [
  ['rally_the_faithful', 'greek', false],
  ['shield_of_the_gods', 'greek', false],
  ['mending_light', 'greek', false],
  ['wrath_from_above', 'greek', true],
  ['thunderbolt_of_zeus', 'greek', true],
  ['ride_of_the_valkyries', 'norse', false],
  ['ward_of_the_kami', 'japanese', false],
];

async function shot(page: Page, name: string): Promise<void> {
  await page.screenshot({ path: `${DIR}/${name}.png` });
}

for (const [id, p] of MAP_MIRACLES) {
  test(`card: ${id}`, async ({ page }) => {
    test.setTimeout(120_000);
    // Reduced motion: the screenshot shows the settled card (the rise is tested in bigMoments.spec.ts;
    // this software renderer can hold back the first composited frames for seconds).
    await usePrefs(page, { motion: 'reduced' });
    const d = GameDriver.mission(mission(p), { matchId: `review-${id}` });
    d.player.wallet.favor = 50;
    for (const h of Object.values(d.state.heroes)) if (h.ownerId === 'player') {
      h.movementPoints = 0;
      h.mana = 0;
    }
    await page.goto('/?e2e', { waitUntil: 'networkidle' });
    await importAndLoad(page, writeSave(d, `review-${id}`));
    await waitFor(page, (x) => x.screen === 'adventure' && x.overlays.length === 0, 'adventure');
    await page.waitForTimeout(4000);
    await watchMoments(page);
    await page.getByTestId('open-interventions').click();
    await page.getByTestId(`invoke-${id}`).click();
    const seen = await waitForSighting(page, 'miracle-card');
    expect(seen.asset).toBe(`intervention.${id}.card`);
    expect(seen.corners).toBe(4);
    expect(Math.abs(seen.plateRatio! - 0.18)).toBeLessThan(0.01);
    await page.waitForTimeout(600);
    await shot(page, `card-${id}`);
  });
}

for (const [id, p, targeted] of BATTLE_MIRACLES) {
  test(`card: ${id} (battle)`, async ({ page }) => {
    test.setTimeout(150_000);
    await usePrefs(page, { battleSpeed: '0.5', motion: 'reduced' });
    const { file } = goldBattle(mission(p), `review-${id}`, STRONG, 50);
    await page.goto('/?e2e', { waitUntil: 'networkidle' });
    await importAndLoad(page, file);
    const s = await toHumanBattleTurn(page);
    await watchMoments(page);
    await page.getByTestId('battle-miracles').click();
    await page.getByTestId(`battle-miracle-${id}`).click();
    if (targeted) {
      const mine = Object.values(s.state.battle.sides as Record<string, { sideId: string; playerId: string | null }>).find((x) => x.playerId === 'player')!.sideId;
      const enemy = Object.values(s.state.battle.stacks as Record<string, { side: string; totalHp: number; anchor: { col: number; row: number } }>).find((x) => x.side !== mine && x.totalHp > 0)!;
      await clickBattleCell(page, enemy.anchor.col, enemy.anchor.row);
    }
    const seen = await waitForSighting(page, 'miracle-card');
    expect(seen.asset).toBe(`intervention.${id}.card`);
    await page.waitForTimeout(600);
    await shot(page, `card-${id}`);
  });
}

for (const p of PANTHEONS) {
  for (const won of [true, false]) {
    test(`result: ${p} ${won ? 'victory' : 'defeat'}`, async ({ page }) => {
      test.setTimeout(150_000);
      await usePrefs(page, { battleSpeed: 'instant' });
      // A longer army list on the winning side fills the result panels.
      const army: [string, number][] = won ? [['cyclops', 30], ['hoplite', 40], ['peltast', 30], ['griffin', 12], ['minotaur', 20], ['centaur', 25], ['temple_adept', 18]] : WEAK;
      const { file } = goldBattle(mission(p), `review-result-${p}-${won}`, army);
      await page.goto('/?e2e', { waitUntil: 'networkidle' });
      await importAndLoad(page, file);
      await toHumanBattleTurn(page);
      await finishBattle(page);
      await expect(page.getByTestId('result-splash')).toHaveAttribute('data-asset', `splash.${p}.${won ? 'victory' : 'defeat'}`);
      expect(await imagesLoaded(page)).toEqual([]);
      await page.waitForTimeout(500);
      await shot(page, `result-${p}-${won ? 'victory' : 'defeat'}`);
      if (p === 'greek') {
        await page.setViewportSize({ width: 1024, height: 640 });
        await page.waitForTimeout(600);
        await shot(page, `result-${p}-${won ? 'victory' : 'defeat'}-small`);
      }
    });
  }
}

for (const p of PANTHEONS) {
  test(`level-up banner: ${p}`, async ({ page }) => {
    test.setTimeout(120_000);
    await usePrefs(page, {});
    const d = goldBattleDriver(mission(p), `review-levelup-${p}`, STRONG);
    const h = leaderOf(d);
    h.xp = xpForLevel(d.catalog.rulesProfile, h.level + 1) - 1;
    // The pantheon's longest hero name, to check it fits the plaque.
    h.name = Object.values(d.catalog.heroes).filter((x) => x.pantheonId === p).map((x) => x.name).sort((a, b) => b.length - a.length)[0]!;
    d.autoBattle();
    expect(d.state.pendingDecisions.length).toBeGreaterThan(0);
    await page.goto('/?e2e', { waitUntil: 'networkidle' });
    await importAndLoad(page, writeSave(d, `review-levelup-${p}`));
    await waitFor(page, (x) => x.screen === 'level-up', 'level-up');
    await expect(page.getByTestId('levelup-banner').locator('.banner-art')).toHaveAttribute('data-asset', `banner.level_up.${p}`);
    await expect(page.getByTestId('levelup-banner')).toContainText(h.name);
    expect(await page.getByTestId('levelup-banner').locator('.plaque-text__title').evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
    expect(await imagesLoaded(page)).toEqual([]);
    await shot(page, `levelup-${p}`);
    if (p === 'mesoamerican') {
      await page.setViewportSize({ width: 1024, height: 640 });
      await page.waitForTimeout(500);
      await shot(page, `levelup-${p}-small`);
    }
  });
}

const WEEKS: (string | null)[] = [null, 'quiet_week', 'week_of_plenty', 'week_of_merchants', 'week_of_storms', 'week_of_valor', 'week_of_omens', 'week_of_the_muse', 'week_of_builders'];
WEEKS.forEach((ev, i) => {
  // Every other one over the snow of the tundra (a light map), the rest over the temperate one.
  const climate = i % 2 ? 'tundra' : 'temperate';
  test(`week banner: ${ev ?? 'default'} over ${climate}`, async ({ page }) => {
    test.setTimeout(150_000);
    await usePrefs(page, { enemyMovement: 'instant', motion: 'reduced' });
    const { d } = weekDawnDriver('skirmish_twin_harbors', ev, `review-week-${ev ?? 'default'}`);
    (d.state.world.map as { biome: string }).biome = climate;
    for (const fog of Object.values(d.state.fog)) fog.explored = fog.explored.map(() => 1);
    await page.goto('/?e2e', { waitUntil: 'networkidle' });
    await importAndLoad(page, writeSave(d, `review-week-${ev ?? 'default'}`));
    await waitFor(page, (x) => x.screen === 'adventure' && x.overlays.length === 0 && x.humanTurn, 'day 7');
    await page.waitForTimeout(4000);
    await watchMoments(page);
    await page.getByTestId('end-day').click();
    const seen = await waitForSighting(page, 'new-week-banner');
    expect(seen.asset).toBe(ev ? `banner.week.${ev}` : 'banner.new_week');
    expect(seen.textProblems).toEqual([]);
    await page.waitForTimeout(600);
    await shot(page, `week-${ev ?? 'default'}-${climate}`);
    expect((await inspect(page)).state.day).toBe(8);
  });
});

test('sheet: all banners and cards on dark and light backgrounds (alpha edges)', async ({ page }) => {
  test.setTimeout(120_000);
  const manifest = await (await page.request.get('/art/manifest.json')).json() as { assets: Record<string, { file: string; kind: string }> };
  const banners = Object.entries(manifest.assets).filter(([, a]) => a.kind === 'banner');
  const cards = Object.entries(manifest.assets).filter(([, a]) => a.kind === 'miracle');
  expect(banners).toHaveLength(15);
  expect(cards).toHaveLength(14);
  const cell = (bg: string, inner: string) => `<div style="background:${bg};padding:10px;display:flex;flex-wrap:wrap;gap:10px">${inner}</div>`;
  const bannerImgs = banners.map(([id, a]) => `<figure style="margin:0;width:560px"><img src="http://localhost:4173/${a.file}" style="width:100%;display:block"><figcaption style="font:11px sans-serif;color:#888">${id}</figcaption></figure>`).join('');
  const cardImgs = cards.map(([id, a]) => `<figure style="margin:0;width:180px"><img src="http://localhost:4173/${a.file}" style="width:100%;display:block"><figcaption style="font:10px sans-serif;color:#888">${id.replace('intervention.', '').replace('.card', '')}</figcaption></figure>`).join('');
  for (const [name, bg] of [['dark', '#05090f'], ['light', '#efe6d2']] as const) {
    await page.setViewportSize({ width: 1760, height: 1200 });
    await page.setContent(`<body style="margin:0">${cell(bg, bannerImgs)}</body>`, { waitUntil: 'load' });
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${DIR}/sheet-banners-${name}.png`, fullPage: true });
    await page.setContent(`<body style="margin:0">${cell(bg, cardImgs)}</body>`, { waitUntil: 'load' });
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${DIR}/sheet-cards-${name}.png`, fullPage: true });
  }
});
