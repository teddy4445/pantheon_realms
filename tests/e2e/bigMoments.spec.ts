import { expect, test, type Page } from '@playwright/test';
import { GameDriver } from '@pr/testing';
import { processCommand, xpForLevel, type GameCommand } from '@pr/rules';
import { clickHex, inspect, waitFor } from './helpers';
import { approachTile, importAndLoad, writeSave } from './fixtures';
import {
  STRONG,
  WEAK,
  clickBattleCell,
  finishBattle,
  goldBattle,
  goldBattleDriver,
  imagesLoaded,
  leaderOf,
  sightings,
  toHumanBattleTurn,
  usePrefs,
  waitForSighting,
  watchMoments,
  weekDawnDriver,
} from './momentFixtures';

/**
 * Big moments (GPT6_BRIEF_3, delivery 2026-10-02) in the production build,
 * each trigger once: a map miracle and a battle miracle (the painted card in
 * the gold frame with a live nameplate; the effect applied once), a won and a
 * lost battle (the player's pantheon painting behind the result), a lost and a
 * won match (end-of-game dialog over the painting; a long hot-seat title), a
 * level-up (the hero's pantheon banner, live text on its plaque) and the dawn
 * of a new week (the weekly event's banner, once — not again on load). Fast
 * dismissal (click, Esc) and reduced motion use the game's existing settings.
 * Moments are observed by an in-page probe (frames are slow in this
 * software-rendered browser). Screenshots are kept for review.
 */


/**
 * The battle result layout (victory and defeat): no line under the title; the
 * two sides right below it at one height; the outcome centred under them;
 * Continue under the outcome; a 20 % black layer over the painting.
 */
async function expectResultLayout(page: Page): Promise<void> {
  await expect(page.locator('.result-banner__sub')).toHaveCount(0);
  const box = async (sel: string) => (await page.locator(sel).first().boundingBox())!;
  const title = await box('.result-banner');
  const sides = await page.locator('.result-side').evaluateAll((els) => els.map((e) => e.getBoundingClientRect().toJSON() as DOMRect));
  expect(sides).toHaveLength(2);
  expect(Math.abs(sides[0]!.height - sides[1]!.height)).toBeLessThan(1.5);
  expect(Math.abs(sides[0]!.y - sides[1]!.y)).toBeLessThan(1.5);
  expect(sides[0]!.y).toBeGreaterThanOrEqual(title.y + title.height - 1);
  expect(sides[0]!.y - (title.y + title.height)).toBeLessThan(40);
  const outcome = await box('.result-outcome');
  expect(outcome.y).toBeGreaterThanOrEqual(sides[0]!.y + sides[0]!.height - 1);
  const vp = page.viewportSize()!;
  expect(Math.abs(outcome.x + outcome.width / 2 - vp.width / 2)).toBeLessThan(12);
  const cont = await box('[data-testid="result-continue"]');
  expect(cont.y).toBeGreaterThanOrEqual(outcome.y + outcome.height - 1);
  expect(Math.abs(cont.x + cont.width / 2 - vp.width / 2)).toBeLessThan(12);
  await expect(page.locator('.result-splash__shade')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0.2)');
}

test('a map miracle shows its painted card once, in the gold frame with a live nameplate; Esc closes it; a load shows none', async ({ page }) => {
  test.setTimeout(120_000);
  await usePrefs(page, {});
  const d = GameDriver.mission('skirmish_twin_harbors', { matchId: 'e2e-miracle-map' });
  d.player.wallet.favor = 30;
  const file = writeSave(d, 'miracle-map');
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await importAndLoad(page, file);
  let s = await waitFor(page, (x) => x.screen === 'adventure' && x.overlays.length === 0, 'adventure');
  const gold = s.state.players.player.wallet.gold;
  await watchMoments(page);
  await page.getByTestId('open-interventions').click();
  await page.getByTestId('invoke-tithe_of_the_faithful').click();
  const seen = await waitForSighting(page, 'miracle-card');
  expect(seen.asset).toBe('intervention.tithe_of_the_faithful.card');
  expect(seen.text).toContain('Tribute of Hera'); // the Greek name of the shared Tithe miracle (2026-10-07)
  expect(seen.corners).toBe(4);
  // The 2:3 painting (not the 96 px icon), its nameplate over the bottom 18 %.
  expect(Math.abs(seen.artRatio! - 2 / 3)).toBeLessThan(0.02);
  expect(seen.artHeight!).toBeGreaterThan(400);
  expect(Math.abs(seen.plateRatio! - 0.18)).toBeLessThan(0.01);
  // Esc closes it at once, without opening the pause menu.
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('miracle-card')).toHaveCount(0);
  const gone = (await sightings(page)).find((x) => x.testId === 'miracle-card')!;
  expect(gone.goneAt! - gone.shownAt).toBeLessThan(3600);
  s = await inspect(page);
  expect(s.overlays).not.toContain('pause');
  expect(s.moments).toEqual([]);
  expect((await sightings(page)).filter((x) => x.testId === 'miracle-card')).toHaveLength(1);
  // The effect was applied once.
  expect(s.state.players.player.wallet.favor).toBe(24);
  expect(s.state.players.player.wallet.gold).toBe(gold + 1500);

  // A save made after the miracle: loading it shows no card again.
  d.do({ kind: 'InvokeIntervention', interventionId: 'tithe_of_the_faithful' });
  const after = writeSave(d, 'miracle-map-after');
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await importAndLoad(page, after);
  await waitFor(page, (x) => x.screen === 'adventure', 'adventure');
  await watchMoments(page);
  await page.waitForTimeout(2500);
  expect(await sightings(page)).toEqual([]);
  expect((await inspect(page)).moments).toEqual([]);
});

test('reduced motion: the card appears without its rise; a click closes it', async ({ page }) => {
  test.setTimeout(120_000);
  await usePrefs(page, { motion: 'reduced' });
  const d = GameDriver.mission('skirmish_twin_harbors_celtic_vs_greek', { matchId: 'e2e-miracle-reduced' });
  d.player.wallet.favor = 30;
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await importAndLoad(page, writeSave(d, 'miracle-reduced'));
  await waitFor(page, (x) => x.screen === 'adventure' && x.overlays.length === 0, 'adventure');
  await watchMoments(page);
  await page.getByTestId('open-interventions').click();
  await page.getByTestId('invoke-mists_of_the_sidhe').click();
  const seen = await waitForSighting(page, 'miracle-card');
  expect(seen.asset).toBe('intervention.mists_of_the_sidhe.card');
  expect(seen.animation).toBe('0s');
  await page.getByTestId('miracle-card').click();
  await expect(page.getByTestId('miracle-card')).toHaveCount(0);
  expect((await inspect(page)).state.players.player.wallet.favor).toBe(18);
});

test('full motion: the card rises over the game’s slow motion time and closes by itself after the 3.6 s hold', async ({ page }) => {
  test.setTimeout(120_000);
  await usePrefs(page, { motion: 'full', adventureAnimation: 'normal' });
  const d = GameDriver.mission('skirmish_twin_harbors_egyptian_vs_greek', { matchId: 'e2e-miracle-full' });
  d.player.wallet.favor = 30;
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await importAndLoad(page, writeSave(d, 'miracle-full'));
  await waitFor(page, (x) => x.screen === 'adventure' && x.overlays.length === 0, 'adventure');
  await watchMoments(page);
  await page.getByTestId('open-interventions').click();
  await page.getByTestId('invoke-blessing_of_the_nile').click();
  const seen = await waitForSighting(page, 'miracle-card');
  expect(seen.asset).toBe('intervention.blessing_of_the_nile.card');
  expect(parseFloat(seen.animation)).toBeGreaterThan(0.5);
  await expect(page.getByTestId('miracle-card')).toHaveCount(0, { timeout: 30_000 });
  const done = (await sightings(page)).find((x) => x.testId === 'miracle-card')!;
  // The hold starts after the card's first frames: at least 3.6 s on screen.
  expect(done.goneAt! - done.shownAt).toBeGreaterThanOrEqual(3600);
});

test('a battle miracle on an enemy stack shows its card; a won battle shows the player’s victory painting behind the result', async ({ page }) => {
  test.setTimeout(180_000);
  await usePrefs(page, { battleSpeed: '2' });
  const { file } = goldBattle('skirmish_twin_harbors', 'miracle-battle', STRONG, 30);
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await importAndLoad(page, file);
  let s = await toHumanBattleTurn(page);
  await watchMoments(page);
  const favor = s.state.players.player.wallet.favor;
  await page.getByTestId('battle-miracles').click();
  await page.getByTestId('battle-miracle-thunderbolt_of_zeus').click();
  const mySide = Object.values(s.state.battle.sides as Record<string, { sideId: string; playerId: string | null }>).find((x) => x.playerId === 'player')!.sideId;
  const enemy = Object.values(s.state.battle.stacks as Record<string, { id: string; side: string; totalHp: number; anchor: { col: number; row: number } }>).find((x) => x.side !== mySide && x.totalHp > 0)!;
  await clickBattleCell(page, enemy.anchor.col, enemy.anchor.row);
  const seen = await waitForSighting(page, 'miracle-card');
  expect(seen.asset).toBe('intervention.thunderbolt_of_zeus.card');
  expect(seen.text).toContain('Thunderbolt of Zeus');
  await page.screenshot({ path: 'test-results/moment-miracle-battle.png' });
  s = await inspect(page);
  expect(s.state.players.player.wallet.favor).toBe(favor - 14);
  const left = s.state.battle ? s.state.battle.stacks[enemy.id].totalHp : 0;
  expect(enemy.totalHp - left).toBeGreaterThan(0);
  expect(enemy.totalHp - left).toBeLessThanOrEqual(200);
  s = await finishBattle(page);
  expect(s.state.lastBattleResult.winner).toBe(s.state.lastBattleResult.playerSide);
  await expect(page.getByTestId('result-splash')).toHaveAttribute('data-asset', 'splash.greek.victory');
  await expect(page.locator('.result-banner__title')).toHaveText('Victory');
  // The live title sits in the painting's calm upper centre (y 8–30 %).
  const vp = page.viewportSize()!;
  const t = (await page.locator('.result-banner__title').boundingBox())!;
  expect(t.y).toBeGreaterThan(vp.height * 0.08);
  expect(t.y + t.height).toBeLessThan(vp.height * 0.3);
  await expectResultLayout(page);
  expect(await imagesLoaded(page)).toEqual([]);
  await page.screenshot({ path: 'test-results/moment-result-victory.png' });
  // The Favor was spent once, whatever replayed on screen.
  expect((await inspect(page)).state.players.player.wallet.favor).toBe(favor - 14);
  expect((await sightings(page)).filter((x) => x.testId === 'miracle-card')).toHaveLength(1);
});

test('a lost battle shows the player’s defeat painting', async ({ page }) => {
  test.setTimeout(150_000);
  await usePrefs(page, { battleSpeed: 'instant' });
  const { d, file } = goldBattle('skirmish_twin_harbors_norse_vs_greek', 'battle-lost', WEAK);
  expect(d.state.players.player!.pantheonId).toBe('norse');
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await importAndLoad(page, file);
  await toHumanBattleTurn(page);
  const s = await finishBattle(page);
  expect(s.state.lastBattleResult.winner).not.toBe(s.state.lastBattleResult.playerSide);
  await expect(page.getByTestId('result-splash')).toHaveAttribute('data-asset', 'splash.norse.defeat');
  await expect(page.locator('.result-banner__title')).toHaveText('Defeat');
  await expectResultLayout(page);
  await page.screenshot({ path: 'test-results/moment-result-defeat.png' });
});

test('losing the last hero with no town left ends the match over the defeat painting', async ({ page }) => {
  test.setTimeout(150_000);
  await usePrefs(page, { battleSpeed: 'instant' });
  const d = goldBattleDriver('skirmish_twin_harbors_egyptian_vs_greek', 'match-lost', WEAK);
  d.state.towns['westharbor']!.ownerId = 'rival';
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await importAndLoad(page, writeSave(d, 'match-lost'));
  await toHumanBattleTurn(page);
  await page.getByTestId('battle-auto').click();
  const s = await waitFor(page, (x) => x.overlays.includes('game-over'), 'game over', 90_000);
  expect(s.state.outcome.status).toBe('defeat');
  const dialog = page.getByTestId('game-over');
  await expect(dialog.getByTestId('result-splash')).toHaveAttribute('data-asset', 'splash.egyptian.defeat');
  await expect(dialog.getByTestId('splash-title')).toContainText('Defeat');
  // The dialog sits below the painting's title area.
  const vp = page.viewportSize()!;
  const panel = (await dialog.locator('.modal').boundingBox())!;
  expect(panel.y).toBeGreaterThan(vp.height * 0.3);
  expect(await imagesLoaded(page)).toEqual([]);
  await page.waitForTimeout(1500); // the dialog's fade-in
  await page.screenshot({ path: 'test-results/moment-gameover-defeat.png' });
});

test('hot-seat: a long winner title stays inside the painting’s title area; the summary keeps the painting behind it', async ({ page }) => {
  test.setTimeout(150_000);
  await usePrefs(page, {});
  const d = GameDriver.mission('skirmish_twin_harbors_japanese_vs_celtic', { matchId: 'e2e-hotseat-long' });
  for (const fog of Object.values(d.state.fog)) fog.explored = fog.explored.map(() => 1);
  d.state.players['player']!.name = 'Aikaterini Konstantinopoulou of the Northern Isles';
  d.state.players['rival']!.name = 'Bartholomew of the Southern Marches';
  d.state.players['rival']!.controller = 'human';
  for (const h of Object.values(d.state.heroes)) if (h.ownerId === 'rival') h.status = 'defeated';
  const east = d.state.towns['eastharbor']!;
  east.garrison.slots = east.garrison.slots.map(() => null);
  const leader = leaderOf(d);
  leader.position = approachTile(d, east.coord, leader.id);
  leader.movementPoints = 1500;
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await importAndLoad(page, writeSave(d, 'hotseat-long'));
  let s = await waitFor(page, (x) => x.screen === 'adventure', 'adventure');
  if (s.overlays.includes('handoff')) await page.getByTestId('handoff-begin').click();
  await waitFor(page, (x) => x.screen === 'adventure' && x.overlays.length === 0, 'map');
  await clickHex(page, east.coord.q, east.coord.r);
  await clickHex(page, east.coord.q, east.coord.r);
  s = await waitFor(page, (x) => x.overlays.includes('game-over'), 'game over', 60_000);
  const dialog = page.getByTestId('game-over');
  await expect(dialog.getByTestId('result-splash')).toHaveAttribute('data-asset', 'splash.japanese.victory');
  const title = dialog.getByTestId('splash-title');
  await expect(title).toContainText('Aikaterini Konstantinopoulou of the Northern Isles wins');
  const vp = page.viewportSize()!;
  const tb = (await title.locator('.splash-title__text').boundingBox())!;
  expect(tb.x).toBeGreaterThanOrEqual(vp.width * 0.3 - 1);
  expect(tb.x + tb.width).toBeLessThanOrEqual(vp.width * 0.7 + 1);
  expect(tb.y).toBeGreaterThanOrEqual(vp.height * 0.08 - 1);
  expect(tb.y + tb.height).toBeLessThanOrEqual(vp.height * 0.3 + 1);
  // Not clipped: the whole title fits its two lines.
  expect(await title.locator('.splash-title__text').evaluate((el) => el.scrollHeight <= el.clientHeight * 1.25)).toBe(true);
  await page.waitForTimeout(1500); // the dialog's fade-in
  await page.screenshot({ path: 'test-results/moment-gameover-hotseat-long.png' });
  await page.getByTestId('game-over-summary').click();
  await waitFor(page, (x) => x.screen === 'summary', 'summary');
  await expect(page.getByTestId('summary').getByTestId('result-splash')).toHaveAttribute('data-asset', 'splash.japanese.victory');
  await page.screenshot({ path: 'test-results/moment-summary.png' });
});

test('level-up shows the hero’s own pantheon banner with the words live on its plaque', async ({ page }) => {
  test.setTimeout(120_000);
  await usePrefs(page, {});
  const d = goldBattleDriver('skirmish_twin_harbors_mesoamerican_vs_greek', 'levelup', STRONG);
  // The banner follows the hero's pantheon (Mesoamerican here), not the town or the opponent.
  const h = leaderOf(d);
  h.xp = xpForLevel(d.catalog.rulesProfile, h.level + 1) - 1;
  d.autoBattle();
  expect(d.state.pendingDecisions.length).toBeGreaterThan(0);
  const decision = d.state.pendingDecisions[0]!;
  const pending = d.state.pendingDecisions.length;
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await importAndLoad(page, writeSave(d, 'levelup'));
  await waitFor(page, (x) => x.screen === 'level-up', 'level-up');
  const banner = page.getByTestId('levelup-banner');
  await expect(banner.locator('.banner-art')).toHaveAttribute('data-asset', 'banner.level_up.mesoamerican');
  const plaque = banner.locator('.banner-art__plaque');
  await expect(plaque).toContainText(/Level up/i);
  await expect(plaque).toContainText(h.name);
  await expect(plaque).toContainText(`Level ${decision.newLevel}`);
  // Alpha and aspect kept (3:1), nothing cropped; the text stays inside the plaque.
  const img = (await banner.locator('.banner-art__img').boundingBox())!;
  expect(Math.abs(img.width / img.height - 3)).toBeLessThan(0.02);
  const pb = (await plaque.boundingBox())!;
  for (const cls of ['.plaque-text__title', '.plaque-text__level']) {
    const b = (await plaque.locator(cls).boundingBox())!;
    expect(b.y, cls).toBeGreaterThanOrEqual(pb.y - 1);
    expect(b.y + b.height, cls).toBeLessThanOrEqual(pb.y + pb.height + 1);
  }
  expect(await plaque.locator('.plaque-text__title').evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
  expect(await imagesLoaded(page)).toEqual([]);
  await page.screenshot({ path: 'test-results/moment-levelup.png' });
  // No panel title and no Confirm: the large skill icon sits left of its details, and picking an offer is the choice.
  await expect(page.getByText('Choose your advancement')).toHaveCount(0);
  await expect(page.getByTestId('levelup-confirm')).toHaveCount(0);
  const offer = page.getByTestId('offer-0');
  const icon = (await offer.locator('.offer-card__icon').boundingBox())!;
  const body = (await offer.locator('.offer-card__body').boundingBox())!;
  expect(icon.width).toBeGreaterThan(60);
  expect(icon.x + icon.width).toBeLessThanOrEqual(body.x + 1);
  await offer.click();
  await waitFor(page, (x) => x.state.pendingDecisions.length < pending, 'level-up chosen');
});

test('the dawn of week 2 shows the weekly event’s banner once, with live text on its plaque; a load does not show it again', async ({ page }) => {
  test.setTimeout(150_000);
  await usePrefs(page, { enemyMovement: 'instant' });
  const { d, snapshot } = weekDawnDriver('skirmish_twin_harbors', 'week_of_the_muse', 'week-dawn');
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await importAndLoad(page, writeSave(d, 'week-dawn'));
  await waitFor(page, (x) => x.screen === 'adventure' && x.overlays.length === 0 && x.humanTurn, 'day 7');
  await watchMoments(page);
  await page.getByTestId('end-day').click();
  const seen = await waitForSighting(page, 'new-week-banner');
  expect(seen.asset).toBe('banner.week.week_of_the_muse');
  expect(seen.text).toContain('Week 2');
  expect(seen.text).toContain('Week of the Muse');
  expect(seen.text).toContain(d.catalog.weeklyEvents['week_of_the_muse']!.summary);
  expect(seen.textProblems).toEqual([]);
  // The text day banner does not repeat it.
  await expect(page.locator('.day-banner')).toHaveCount(0);
  let s = await waitFor(page, (x) => x.humanTurn && !x.busy && x.state.day === 8, 'the player’s turn on day 8', 90_000);
  expect(s.state.world.weeklyEventId).toBe('week_of_the_muse');
  await expect(page.getByTestId('new-week-banner')).toHaveCount(0, { timeout: 15_000 });
  // One banner for the whole dawn, the rival's turn and the player's next turn.
  expect((await sightings(page)).filter((x) => x.testId === 'new-week-banner')).toHaveLength(1);

  // Loading a save from day 8 shows no banner.
  const st = JSON.parse(snapshot);
  const r = processCommand({ catalog: d.catalog }, st, { kind: 'EndTurn', commandId: 'e2e-week-later', expectedRevision: st.revision, actorPlayerId: 'player' } as GameCommand);
  if (!r.ok) throw new Error(r.rejection.message);
  const d8 = new GameDriver(r.state, d.catalog);
  expect(d8.state.day).toBe(8);
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await importAndLoad(page, writeSave(d8, 'week-later'));
  await waitFor(page, (x) => x.screen === 'adventure', 'adventure');
  await watchMoments(page);
  s = await waitFor(page, (x) => x.humanTurn && !x.busy, 'the player’s turn', 60_000);
  await page.waitForTimeout(1500);
  expect(await sightings(page)).toEqual([]);
  expect(s.moments).toEqual([]);
});

test('without a weekly event the default new-week banner shows, and a click closes it', async ({ page }) => {
  test.setTimeout(150_000);
  await usePrefs(page, { enemyMovement: 'instant' });
  const { d } = weekDawnDriver('skirmish_twin_harbors', null, 'week-default');
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await importAndLoad(page, writeSave(d, 'week-default'));
  await waitFor(page, (x) => x.screen === 'adventure' && x.overlays.length === 0 && x.humanTurn, 'day 7');
  await watchMoments(page);
  await page.getByTestId('end-day').click();
  const seen = await waitForSighting(page, 'new-week-banner');
  expect(seen.asset).toBe('banner.new_week');
  expect(seen.text).toContain('Week 2');
  expect(seen.text).toContain('A new week');
  expect(seen.textProblems).toEqual([]);
  const banner = page.getByTestId('new-week-banner');
  if (await banner.count()) {
    await banner.click({ timeout: 5000 }).catch(() => undefined);
  }
  await expect(banner).toHaveCount(0, { timeout: 15_000 });
  expect((await inspect(page)).state.world.weeklyEventId ?? null).toBeNull();
});
