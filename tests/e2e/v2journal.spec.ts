import { expect, test, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { GameDriver } from '@pr/testing';
import { recordCompletion, startCampaign, startNextMission, type CampaignState } from '@pr/campaign';
import { createEnvelope, serializeEnvelope } from '@pr/session';
import { missionSite, type ContentCatalog, type MatchState } from '@pr/rules';
import { clickHex, inspect, waitFor } from './helpers';
import { approachTile, importAndLoad } from './fixtures';

/**
 * Campaign content v2 (2026-10-15) in the Journal, the mission introduction and
 * the adventure HUD, through the real screens. Fixtures are ordinary campaign
 * saves built headlessly (startCampaign → recordCompletion → startNextMission,
 * then GameDriver days) and imported through Load → Import; no privileged hooks.
 *
 * Covered: a running deadline from the saved days that survives a save and a
 * page reload; an evidence entry that appears only once its flag is set (the
 * stolen foal); a failed optional objective that reads "Missed" (never a
 * defeat); the entry bonus a chapter grants; the briefing variant line present
 * only with its fact; the one-line manual-battle notice; the event illustration
 * of a chapter that carries two legacy chapters. Screenshots at 1280×720,
 * 1366×768 and at the largest interface scale go to /home/claude/capture/v2-journal/.
 */

const SHOTS = '/home/claude/capture/v2-journal';
mkdirSync(SHOTS, { recursive: true });

const catalog: ContentCatalog = GameDriver.mission('three_beacons_m01').catalog;
const M2 = catalog.missions['three_beacons_v2_m02']!;
const FORT = M2.timers!.find((t) => t.id === 'tb2_fort')!;
const HAMLET_LINE = /The hamlet kept its word/;

/**
 * A Three Beacons (content v2) campaign save in chapter 1 or 2. Chapter 1 is
 * recorded as won with `chapter1Flags` set (they become chapter 2's facts).
 */
function v2Save(name: string, opts: { chapter: 1 | 2; chapter1Flags?: string[]; days?: number; mutate?: (m: MatchState) => void }): string {
  let { campaign, start } = startCampaign(catalog, 'three_beacons', { runId: `e2e-v2-${name}`, startingGodId: 'zeus', contentVersion: 2 });
  let match: MatchState = start.match;
  expect(match.mission.missionId).toBe('three_beacons_v2_m01');
  if (opts.chapter === 2) {
    for (const f of opts.chapter1Flags ?? []) match.mission.flags[f] = true;
    match = { ...match, outcome: { status: 'victory', reason: 'Test fixture', day: match.day }, pendingDecisions: [] };
    campaign = recordCompletion(catalog, campaign, match);
    const next = startNextMission(catalog, campaign);
    campaign = next.campaign as CampaignState;
    match = next.start.match;
    expect(match.mission.missionId).toBe('three_beacons_v2_m02');
  }
  const d = new GameDriver(match, catalog);
  for (let i = 0; i < (opts.days ?? 0); i++) d.endDay();
  opts.mutate?.(d.state);
  const env = createEnvelope(catalog, { match: d.state, campaign }, { id: 'manual-1', kind: 'manual', name, savedAt: new Date(0).toISOString() });
  const file = join(tmpdir(), `v2journal-${name}.prsave.json`);
  writeFileSync(file, serializeEnvelope(env));
  return file;
}

/** Alexios one step from a site, the map explored, plenty of movement. */
function besideSite(m: MatchState, siteId: string): void {
  const c = missionSite(catalog, m, siteId)!.coord;
  for (const fog of Object.values(m.fog)) fog.explored = fog.explored.map(() => 1);
  m.heroes['alexios']!.movementPoints = 3000;
  const d = new GameDriver(m, catalog);
  m.heroes['alexios']!.position = approachTile(d, c, 'alexios');
}

async function quietTips(page: Page): Promise<void> {
  const off = page.getByRole('button', { name: 'Turn off tips' });
  if (await off.isVisible().catch(() => false)) await off.click();
}

async function load(page: Page, file: string): Promise<void> {
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await importAndLoad(page, file);
  await waitFor(page, (s) => s.screen === 'adventure', 'adventure', 30_000);
  await page.waitForTimeout(600);
  await quietTips(page);
}

async function openJournal(page: Page, tab: 'Objectives' | 'Ledger' | 'Story' = 'Objectives'): Promise<void> {
  if ((await inspect(page)).screen !== 'journal') {
    await page.locator('.adv-objectives').getByRole('button', { name: 'Journal' }).click();
    await waitFor(page, (s) => s.screen === 'journal', 'journal');
  }
  await page.getByRole('tab', { name: tab }).click();
  await page.waitForTimeout(250);
}

async function backToMap(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Back' }).first().click();
  await waitFor(page, (s) => s.screen === 'adventure', 'map');
}

async function restartToBriefing(page: Page): Promise<void> {
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: /Restart Mission/ }).click();
  await page.getByTestId('confirm-ok').click();
  await expect(page.getByTestId('briefing')).toBeVisible();
}

/** Every briefing line, read with Next. */
async function briefingLines(page: Page): Promise<string[]> {
  const out: string[] = [];
  for (let i = 0; i < 12; i++) {
    out.push(await page.locator('.brief__line-text p').innerText());
    const next = page.getByTestId('briefing-next');
    if (!(await next.isVisible().catch(() => false))) break;
    await next.click();
  }
  return out;
}

async function settleArt(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const imgs = [...document.querySelectorAll('img')];
    await Promise.all(imgs.map((i) => (i.complete ? null : new Promise((r) => { i.onload = r; i.onerror = r; }))));
  });
  await page.waitForTimeout(400);
}

async function shot(page: Page, name: string): Promise<void> {
  await settleArt(page);
  // Let entrance fades finish (a scene's fade-in can start late while the map is redrawn).
  await page
    .waitForFunction(() => document.getAnimations().filter((a) => a.effect?.getComputedTiming().iterations !== Infinity).every((a) => a.playState !== 'running' && !a.pending), null, { timeout: 8000 })
    .catch(() => undefined);
  await page.waitForTimeout(200);
  await page.screenshot({ path: join(SHOTS, `${name}.png`) });
}

test('a new v2 campaign: the introduction shows the cover, required tasks, loss conditions and one manual-battle line', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await page.getByTestId('menu-new').click();
  await page.getByTestId('mode-campaign').click();
  await page.getByTestId('scenario-three_beacons').click();
  await page.getByTestId('setup-begin').click();
  const brief = page.getByTestId('briefing');
  await expect(brief).toBeVisible();
  expect((await inspect(page)).state.mission.missionId).toBe('three_beacons_v2_m01');
  // The chapter's cover (briefingArt[0]) behind and inside the scroll.
  await expect(brief.getByTestId('scene-art')).toHaveAttribute('src', /mission\.three_beacons\.m01\.briefing/);
  await expect(brief.locator('.brief__art img')).toHaveAttribute('src', /mission\.three_beacons\.m01\.briefing/);
  // Required tasks (open ones), loss conditions, manual battles in one line with its icon.
  const tasks = brief.getByTestId('briefing-tasks');
  await expect(tasks).toContainText('Train the town watch');
  await expect(tasks).not.toContainText('Light the pass beacon');
  await expect(brief.locator('.brief__note')).toContainText(/more required tasks open as the chapter unfolds/);
  await expect(brief.getByTestId('briefing-loss')).toContainText('Alexios must survive');
  const notice = brief.getByTestId('manual-battle-notice');
  await expect(notice).toHaveCount(1);
  await expect(notice).toHaveText('Battles in this campaign are fought on the battlefield.');
  await expect(notice.locator('img[data-art="campaignv2.icon.manual.battle.v2"]')).toHaveCount(1);
  expect(await notice.locator('img').evaluate((i) => (i as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  // No deadline is announced in chapter 1, and nothing was carried in.
  await expect(brief.getByTestId('briefing-deadlines')).toHaveCount(0);
  await expect(brief.getByTestId('briefing-bonuses')).toHaveCount(0);
  await shot(page, 'intro-ch1-1280x720');
  // Keyboard: Begin has focus at once (skippable from the first line); Enter starts.
  await expect(page.getByTestId('briefing-begin')).toBeFocused();
  await page.keyboard.press('Enter');
  await waitFor(page, (s) => s.screen === 'adventure' && !s.overlays.includes('briefing'), 'map');
  // The notice is not a persistent warning.
  await expect(page.getByTestId('manual-battle-notice')).toHaveCount(0);
});

test('with its fact, the briefing variant line, the entry bonus and the running deadline are in the introduction', async ({ page }) => {
  test.setTimeout(180_000);
  const hamlet = v2Save('hamlet', { chapter: 2, chapter1Flags: ['tb1_hamlet_first'] });
  await page.setViewportSize({ width: 1280, height: 720 });
  await load(page, hamlet);
  expect((await inspect(page)).state.mission.flags['fact:tb1_hamlet_first']).toBe(true);
  await restartToBriefing(page);
  const brief = page.getByTestId('briefing');
  await expect(brief.getByTestId('scene-art')).toHaveAttribute('src', /mission\.three_beacons\.m03\.briefing/);
  await expect(brief.getByTestId('briefing-bonuses')).toContainText(M2.entryBonuses![0]!.label);
  const deadline = brief.getByTestId('briefing-deadlines');
  await expect(deadline).toContainText(FORT.label);
  await expect(deadline).toContainText(`Deadline: day ${1 + FORT.days} (started day 1) · ${FORT.days} days left`);
  await expect(brief.getByTestId('manual-battle-notice')).toHaveCount(1);
  await shot(page, 'intro-ch2-1280x720');
  await page.setViewportSize({ width: 1366, height: 768 });
  await shot(page, 'intro-ch2-1366x768');
  const withFact = await briefingLines(page);
  expect(withFact.length).toBe(M2.briefing.length + 1);
  expect(withFact.some((l) => HAMLET_LINE.test(l))).toBe(true);
  await page.getByTestId('briefing-begin').click();
});

test('without its fact, the briefing has no variant line for it and no entry bonus (the Journal story agrees)', async ({ page }) => {
  test.setTimeout(180_000);
  const causeway = v2Save('causeway', { chapter: 2, chapter1Flags: ['tb1_causeway_first'] });
  await page.setViewportSize({ width: 1280, height: 720 });
  await load(page, causeway);
  expect((await inspect(page)).state.mission.flags['fact:tb1_hamlet_first']).toBeUndefined();
  expect((await inspect(page)).state.mission.flags['fact:tb1_causeway_first']).toBe(true);
  await restartToBriefing(page);
  await expect(page.getByTestId('briefing-bonuses')).toHaveCount(0);
  const without = await briefingLines(page);
  expect(without.some((l) => HAMLET_LINE.test(l))).toBe(false);
  expect(without.some((l) => /causeway carts/.test(l))).toBe(true);
  await page.getByTestId('briefing-begin').click();
  // The Journal's story keeps the same order-aware briefing.
  await waitFor(page, (s) => s.screen === 'adventure' && !s.overlays.length, 'map');
  await quietTips(page);
  await openJournal(page, 'Story');
  await expect(page.locator('.journal-book')).toContainText('causeway carts');
  await expect(page.locator('.journal-book')).not.toContainText('The hamlet kept its word');
});

test('Journal and HUD: a running deadline from the saved days survives a save and a reload; entry bonus and facts are carried', async ({ page }) => {
  test.setTimeout(240_000);
  const file = v2Save('deadline', { chapter: 2, chapter1Flags: ['tb1_hamlet_first'], days: 2 });
  const deadlineDay = 1 + FORT.days;
  const text = (day: number) => `Deadline: day ${deadlineDay} (started day 1) · ${deadlineDay - day} days left`;

  await page.setViewportSize({ width: 1280, height: 720 });
  await load(page, file);
  let s = await inspect(page);
  expect(s.state.day).toBe(3);
  expect(s.state.mission.timers.tb2_fort).toMatchObject({ status: 'running', startedDay: 1, deadlineDay });

  // HUD: the deadline beside the objectives (label + days left).
  const hud = page.getByTestId('hud-deadline-tb2_fort');
  await expect(hud).toContainText(FORT.label);
  await expect(hud).toContainText(`${deadlineDay - 3} days left`);
  await shot(page, 'hud-deadline-1280x720');

  // Journal → Objectives: required tasks and optional opportunities, the running deadline strip.
  await openJournal(page, 'Objectives');
  await expect(page.getByTestId('journal-required').locator('.journal-list__head')).toHaveText('Required tasks');
  await expect(page.getByTestId('journal-optional').locator('.journal-list__head')).toHaveText('Optional opportunities');
  await expect(page.getByTestId('journal-running-deadlines')).toContainText(text(3));
  await shot(page, 'journal-objectives-1280x720');

  // Journal → Ledger: deadline with its consequence, the threat, nothing found yet, the bonus and the fact carried.
  await openJournal(page, 'Ledger');
  await expect(page.getByTestId('deadline-tb2_fort-text')).toHaveText(text(3));
  await expect(page.getByTestId('deadline-tb2_fort')).toContainText('bonus for striking early');
  const threat = page.getByTestId('journal-threats').locator('li').first();
  await expect(threat).toContainText('Scout Captain');
  await expect(threat).toContainText('Waits at his camp until a relay is lit');
  await expect(threat).toHaveAttribute('data-status', 'waiting');
  await expect(page.getByTestId('journal-evidence-empty')).toBeVisible();
  await expect(page.locator('[data-testid^="evidence-tb2_"]')).toHaveCount(0);
  await expect(page.getByTestId('bonus-tb1_hamlet_first')).toContainText(M2.entryBonuses![0]!.label);
  const fact = page.getByTestId('fact-tb1_hamlet_first');
  await expect(fact).toContainText('The hamlet first');
  await expect(fact.getByRole('img', { name: 'Supplies' })).toHaveCount(1);
  await shot(page, 'journal-ledger-1280x720');

  await page.setViewportSize({ width: 1366, height: 768 });
  await shot(page, 'journal-ledger-1366x768');
  await openJournal(page, 'Objectives');
  await shot(page, 'journal-objectives-1366x768');
  await backToMap(page);
  await shot(page, 'hud-deadline-1366x768');

  // One more day in the game, saved, then the page reloaded and the save loaded: the same deadline.
  await page.getByTestId('end-day').click();
  await page.waitForTimeout(200);
  if ((await inspect(page)).overlays.includes('confirm')) await page.getByTestId('confirm-ok').click();
  s = await waitFor(page, (x) => x.humanTurn && x.state.day === 4 && !x.busy, 'day 4', 60_000);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: /Save Game/ }).click();
  await page.getByTestId('save-manual-2').click();
  await page.locator('#save-name').fill('v2 deadline day 4');
  await page.getByTestId('save-confirm').click();
  await page.waitForTimeout(400);
  if ((await inspect(page)).overlays.includes('confirm')) await page.getByTestId('confirm-ok').click();
  await expect(page.getByTestId('save-manual-2')).toContainText('v2 deadline day 4');
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByTestId('menu-load').click();
  await page.getByTestId('save-manual-2').click();
  await page.getByTestId('load-confirm').click();
  await page.waitForTimeout(300);
  if ((await inspect(page)).overlays.includes('confirm')) await page.getByTestId('confirm-ok').click();
  s = await waitFor(page, (x) => x.screen === 'adventure' && x.state.day === 4 && !x.overlays.length, 'reloaded', 30_000);
  expect(s.state.mission.timers.tb2_fort).toMatchObject({ status: 'running', startedDay: 1, deadlineDay });
  await quietTips(page);
  await expect(page.getByTestId('hud-deadline-tb2_fort')).toContainText(`${deadlineDay - 4} days left`);
  await openJournal(page, 'Ledger');
  await expect(page.getByTestId('deadline-tb2_fort-text')).toHaveText(text(4));
});

test('an evidence entry appears in the ledger only once its flag is set (the stolen foal)', async ({ page }) => {
  test.setTimeout(180_000);
  const file = v2Save('foal', { chapter: 1, mutate: (m) => besideSite(m, 'tb1_foal') });
  const foal = catalog.missions['three_beacons_v2_m01']!.sites.find((x) => x.id === 'tb1_foal')!.coord;
  await page.setViewportSize({ width: 1280, height: 720 });
  await load(page, file);
  await openJournal(page, 'Ledger');
  await expect(page.getByTestId('journal-evidence-empty')).toBeVisible();
  await expect(page.getByTestId('evidence-tb1_ev_foal')).toHaveCount(0);
  // Chapter 1 carries nothing.
  await expect(page.getByText('This is the first chapter: nothing is carried yet.')).toBeVisible();
  await backToMap(page);

  for (let i = 0; i < 6 && !(await inspect(page)).state.mission.flags['tb1_favour']; i++) {
    await clickHex(page, foal.q, foal.r);
    await page.waitForTimeout(400);
    if (!(await inspect(page)).state.mission.flags['tb1_favour']) await clickHex(page, foal.q, foal.r);
    await page.waitForTimeout(900);
  }
  await waitFor(page, (s) => !!s.state.mission.flags['tb1_favour'], 'the foal returned', 20_000);
  for (let i = 0; i < 6 && (await inspect(page)).overlays.length; i++) {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(250);
  }
  await openJournal(page, 'Ledger');
  const entry = page.getByTestId('evidence-tb1_ev_foal');
  await expect(entry).toContainText('A favour to the centaurs');
  await expect(entry).toContainText('The stolen foal went home');
  await expect(entry.getByRole('img', { name: 'Pact' })).toHaveCount(1);
  expect(await entry.locator('img').evaluate((i) => (i as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  await expect(page.getByTestId('journal-evidence-empty')).toHaveCount(0);
  // The patrol and its purpose are listed (its camp still stands).
  await expect(page.getByTestId('journal-threats')).toContainText('Raider Chief');
  await shot(page, 'journal-ledger-evidence-1280x720');
});

test('a failed optional objective reads "Missed", never like a defeat; the expired deadline keeps its day', async ({ page }) => {
  test.setTimeout(240_000);
  const file = v2Save('missed', { chapter: 2, days: FORT.days + 1 });
  await page.setViewportSize({ width: 1280, height: 720 });
  await load(page, file);
  const s = await inspect(page);
  expect(s.state.mission.objectives.tb2_strike.status).toBe('failed');
  expect(s.state.mission.timers.tb2_fort.status).toBe('expired');
  const day = s.state.mission.timers.tb2_fort.resolvedDay;
  expect(s.state.outcome.status).toBe('running');
  // The HUD shows no running deadline any more.
  await expect(page.getByTestId('hud-deadlines')).toHaveCount(0);

  await openJournal(page, 'Objectives');
  const row = page.getByTestId('objective-tb2_strike');
  await expect(row).toHaveClass(/is-missed/);
  await expect(row).not.toHaveClass(/is-failed/);
  await expect(row.getByRole('img', { name: 'Missed' })).toHaveCount(1);
  await expect(row.getByRole('img', { name: 'Failed' })).toHaveCount(0);
  // Not red: the missed mark is drawn in the page's quiet ink.
  const colour = await row.locator('.status-icon').evaluate((e) => getComputedStyle(e).color);
  expect(colour).not.toBe('rgb(210, 90, 69)');
  await row.click();
  const entry = page.getByTestId('journal-entry');
  await expect(entry).toContainText('Optional opportunity');
  await expect(entry).toContainText(`Missed on day ${day}`);
  await expect(page.getByTestId('journal-missed-note')).toContainText(FORT.label);
  await expect(page.getByTestId('journal-missed-note')).toContainText('The chapter continues');
  await shot(page, 'journal-missed-1280x720');
  await openJournal(page, 'Ledger');
  await expect(page.getByTestId('deadline-tb2_fort')).toHaveAttribute('data-status', 'expired');
  await expect(page.getByTestId('deadline-tb2_fort-text')).toHaveText(`Expired on day ${day}`);
});

test('a chapter carrying two legacy chapters shows the second painting behind a later scene', async ({ page }) => {
  test.setTimeout(180_000);
  const file = v2Save('gallery', {
    chapter: 1,
    mutate: (m) => {
      // The first required task is done (a recorded completion, as the rules would leave it).
      m.mission.objectives['tb1_watch'] = { status: 'completed', completedOnDay: 1, rewardGranted: true };
      besideSite(m, 'tb1_gallery');
    },
  });
  const gallery = catalog.missions['three_beacons_v2_m01']!.sites.find((x) => x.id === 'tb1_gallery')!;
  await page.setViewportSize({ width: 1280, height: 720 });
  await load(page, file);
  for (let i = 0; i < 6 && !(await inspect(page)).story.length; i++) {
    await clickHex(page, gallery.coord.q, gallery.coord.r);
    await page.waitForTimeout(400);
    if (!(await inspect(page)).story.length) await clickHex(page, gallery.coord.q, gallery.coord.r);
    await page.waitForTimeout(900);
  }
  await waitFor(page, (s) => s.story.length > 0, 'the gallery scene', 20_000, true);
  const layer = page.getByTestId('story-dialogue');
  await expect(layer).toHaveClass(/story-layer--backdrop/);
  await expect(layer.getByTestId('scene-art')).toHaveAttribute('src', /mission\.three_beacons\.m02\.briefing/);
  await shot(page, 'scene-illustration-1280x720');
  await page.getByTestId('story-continue').click();
});

test('largest interface scale: introduction, journal and HUD deadline stay readable', async ({ page }) => {
  test.setTimeout(240_000);
  const file = v2Save('scale', { chapter: 2, chapter1Flags: ['tb1_hamlet_first'], days: 2 });
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await page.getByTestId('menu-settings').click();
  await page.getByTestId('settings-tab-interface').click();
  await page.getByLabel('Interface scale').fill('1.6');
  await page.getByTestId('settings-apply').click();
  await load(page, file);
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--ui-scale').trim())).toBe('1.6');
  await expect(page.getByTestId('hud-deadline-tb2_fort')).toBeVisible();
  await shot(page, 'hud-deadline-uiscale160-1366x768');
  await openJournal(page, 'Objectives');
  await shot(page, 'journal-objectives-uiscale160-1366x768');
  await openJournal(page, 'Ledger');
  await expect(page.getByTestId('deadline-tb2_fort-text')).toBeVisible();
  // Text stays at a readable size (the page may scroll instead of shrinking it).
  const px = await page.getByTestId('deadline-tb2_fort-text').evaluate((e) => parseFloat(getComputedStyle(e).fontSize));
  expect(px).toBeGreaterThanOrEqual(14);
  await shot(page, 'journal-ledger-uiscale160-1366x768');
  await backToMap(page);
  await restartToBriefing(page);
  await expect(page.getByTestId('briefing-deadlines')).toBeVisible();
  await shot(page, 'intro-ch2-uiscale160-1366x768');
});
