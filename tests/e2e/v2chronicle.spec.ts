import { expect, test, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { missionSite } from '@pr/rules';
import { fightByHand } from './handBattle';
import { clickHex, inspect, readStory, waitFor } from './helpers';
import { campaignRun, catalog, finalBattleSave, importAndOpen, importFiles, loadSlot, practiceWon, writeSnapshot } from './chronicleFixtures';

/**
 * Campaign chronicle, results and Continue/Load for campaign content v2
 * (expansion 2026-10-15; screen specs `campaign-chronicle`, `result`,
 * `load-continue`), through the real screens. Fixtures are ordinary saves built
 * with the campaign state machine (chronicleFixtures.ts) and imported through
 * Load → Import; nothing is dispatched through a hook.
 *
 * Covered: a new run (chapter 1 only, locked chapters say why), a branch pair
 * pending (a choice of both), one parallel chapter done (Continue to the other),
 * a practice replay (never continues; returning restores the primary run
 * byte-identical), the final chapter with the v2 epilogue over its own painting,
 * the save list and Continue (content version, actual chapter, practice apart,
 * an older save without the new metadata, a v1 save that loads as v1) and the
 * largest interface scale. Screenshots at 1280×720, 1366×768 and 1920×1080 go
 * to /home/claude/capture/v2-chronicle/.
 */

const SHOTS = '/home/claude/capture/v2-chronicle';
mkdirSync(SHOTS, { recursive: true });
const SIZES = [
  { width: 1280, height: 720 },
  { width: 1366, height: 768 },
  { width: 1920, height: 1080 },
] as const;

async function settle(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const imgs = [...document.querySelectorAll('img')];
    await Promise.all(imgs.map((i) => (i.complete ? null : new Promise((r) => { i.onload = r; i.onerror = r; }))));
  });
  await page
    .waitForFunction(() => document.getAnimations().filter((a) => a.effect?.getComputedTiming().iterations !== Infinity).every((a) => a.playState !== 'running' && !a.pending), null, { timeout: 8000 })
    .catch(() => undefined);
  await page.waitForTimeout(250);
}

/** Elements of these screens wider than their box (horizontal scrolling or clipped nodes); empty when everything fits. */
async function overflowX(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const out: string[] = [];
    const doc = document.documentElement;
    if (doc.scrollWidth > doc.clientWidth + 1) out.push(`page ${doc.scrollWidth}>${doc.clientWidth}`);
    for (const sel of ['.chronicle', '.chron-summary', '.debrief-actions', '.modal .panel__body', '.fe-chronicle__body', '.save-layout', '.fe-saves__detail', '.menu-frame__list']) {
      for (const e of document.querySelectorAll<HTMLElement>(sel)) {
        if (e.offsetParent === null) continue;
        if (e.scrollWidth > e.clientWidth + 1) out.push(`${sel} ${e.scrollWidth}>${e.clientWidth}`);
      }
    }
    for (const map of document.querySelectorAll<HTMLElement>('.chron-map')) {
      const box = map.getBoundingClientRect();
      for (const n of map.querySelectorAll<HTMLElement>('.chron-node')) {
        const r = n.getBoundingClientRect();
        if (r.left < box.left - 1 || r.right > box.right + 1 || r.top < box.top - 1 || r.bottom > box.bottom + 1) out.push(`node ${n.dataset.testid} outside the map`);
      }
    }
    return out;
  });
}

/** Every <img> loaded with real pixels. */
async function brokenImages(page: Page): Promise<string[]> {
  return page.evaluate(() => [...document.querySelectorAll('img')].filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.getAttribute('src') ?? '?'));
}

/** Screenshots at the three reference sizes; at each, nothing is wider than its box and every picture loads. */
async function shots(page: Page, name: string, before?: () => Promise<void>, sizes: readonly { width: number; height: number }[] = SIZES): Promise<void> {
  for (const s of sizes) {
    await page.setViewportSize(s);
    await settle(page);
    if (before) await before();
    expect(await overflowX(page), `${name} at ${s.width}×${s.height}`).toEqual([]);
    expect(await brokenImages(page), `${name} at ${s.width}×${s.height}`).toEqual([]);
    await page.screenshot({ path: join(SHOTS, `${name}-${s.width}x${s.height}.png`) });
  }
  await page.setViewportSize(SIZES[0]);
  await settle(page);
}

async function openCampaignSelection(page: Page, campaignId: string): Promise<void> {
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await page.getByTestId('menu-new').click();
  await page.getByTestId('mode-campaign').click();
  await page.getByTestId(`scenario-${campaignId}`).click();
  await expect(page.getByTestId('setup-chronicle')).toBeVisible();
}

/** The current game as the inspector reads it (state and campaign), as text. */
async function runText(page: Page): Promise<string> {
  const s = await inspect(page);
  return JSON.stringify({ state: s.state, campaign: s.campaign });
}

async function setUiScale(page: Page, scale: string): Promise<void> {
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await page.getByTestId('menu-settings').click();
  await page.getByTestId('settings-tab-interface').click();
  await page.getByLabel('Interface scale').fill(scale);
  await page.getByTestId('settings-apply').click();
  // The preference is kept; start again from the title with it.
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
}

const SO = (n: number) => `silent_oracle_v2_m0${n}`;
const TB = (n: number) => `three_beacons_v2_m0${n}`;

test('campaign selection: a new run’s chronicle — chapter 1 only, locked chapters say why, keyboard, Begin starts the opening chapter', async ({ page }) => {
  test.setTimeout(1_200_000);
  await page.setViewportSize(SIZES[0]);
  await openCampaignSelection(page, 'silent_oracle');
  // The list counts the chapters a new run plays, from the definitions.
  await expect(page.getByTestId('scenario-silent_oracle')).toContainText('6 chapters');
  await expect(page.getByTestId('scenario-new_fire')).toContainText('5 chapters');
  const graph = page.getByRole('radiogroup', { name: 'Chapters of The Silent Oracle' });
  const nodes = graph.getByRole('radio');
  await expect(nodes).toHaveCount(6);
  await expect(graph.getByRole('radio', { name: 'Chapter 1: The Pilgrims’ Road — Available' })).toHaveAttribute('aria-checked', 'true');
  await expect(graph.getByRole('radio', { name: /^Chapter 4: The Return of Melas — Locked\. Needs chapters 2 and 3$/ })).toHaveCount(1);
  for (const n of [2, 3, 4, 5, 6]) await expect(page.getByTestId(`chapter-${SO(n)}`)).toHaveAttribute('data-state', 'locked');
  // The layout follows the graph: 1 → {2,3} → {4,5} → 6 (pairs share a column, one above the other).
  const box = async (n: number) => (await page.getByTestId(`chapter-${SO(n)}`).boundingBox())!;
  const [b1, b2, b3, b4, b6] = [await box(1), await box(2), await box(3), await box(4), await box(6)];
  expect(Math.abs(b2.x - b3.x)).toBeLessThan(2);
  expect(b3.y).toBeGreaterThan(b2.y + b2.height - 2);
  expect(b1.x + b1.width).toBeLessThan(b2.x);
  expect(b2.x + b2.width).toBeLessThan(b4.x);
  expect(b4.x + b4.width).toBeLessThan(b6.x);
  // The opening chapter's summary: painting, first briefing line, known task, legacy chapters, manual battles.
  const summary = page.getByTestId('chronicle-summary');
  await expect(summary).toHaveAttribute('data-chapter', SO(1));
  await expect(summary.getByTestId('chapter-first-line')).toContainText(catalog.missions[SO(1)]!.briefing[0]!.text);
  await expect(summary.getByTestId('chapter-known-task')).toContainText('Expose the road captain');
  await expect(summary.getByTestId('chapter-legacy')).toHaveText('Mission 1 — The Pilgrims’ Road');
  await expect(summary.getByTestId('manual-battle-notice')).toContainText('Battles in this campaign are fought on the battlefield');
  await expect(summary.locator('.chron-summary__art img')).toHaveAttribute('src', /mission\.silent_oracle\.m01\.briefing/);
  await expect(page.locator('.chron-map')).toHaveAttribute('style', /background-campaign-chronicle/);
  await shots(page, 'select-new-run');

  // A locked chapter: why, and no story yet.
  await page.getByTestId(`chapter-${SO(4)}`).click();
  await expect(summary).toHaveAttribute('data-chapter', SO(4));
  await expect(summary.getByTestId('chapter-locked-reason')).toContainText('Needs chapters 2 and 3');
  await expect(summary.getByTestId('chapter-first-line')).toHaveCount(0);
  await expect(summary.getByTestId('chapter-known-task')).toHaveCount(0);
  await expect(summary.getByTestId('chapter-legacy')).toHaveText('Mission 5 — The Return of Melas');
  await shots(page, 'select-locked-chapter', async () => {
    await page.getByTestId('chronicle-summary').scrollIntoViewIfNeeded();
  });

  // Keyboard: one tab stop, arrows move, Home/End jump; the summary follows.
  await page.getByTestId(`chapter-${SO(4)}`).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByTestId(`chapter-${SO(5)}`)).toBeFocused();
  await expect(page.getByTestId(`chapter-${SO(5)}`)).toHaveAttribute('aria-checked', 'true');
  await expect(summary).toHaveAttribute('data-chapter', SO(5));
  await page.keyboard.press('End');
  await expect(page.getByTestId(`chapter-${SO(6)}`)).toBeFocused();
  await page.keyboard.press('Home');
  await expect(page.getByTestId(`chapter-${SO(1)}`)).toBeFocused();
  await expect(nodes.and(page.locator('[tabindex="0"]'))).toHaveCount(1);

  // Other shapes from their own graphs: Winter Oath 1 → 2 → {3,4} → 5 → 6, Three Beacons 1 → 2.
  await page.getByTestId('scenario-winter_oath').click();
  const xs = await page.locator('.chron-node').evaluateAll((ns) => [...new Set(ns.map((n) => Math.round(n.getBoundingClientRect().x)))].length);
  expect(xs).toBe(5);
  await page.getByTestId('scenario-three_beacons').click();
  await expect(page.locator('.chron-node')).toHaveCount(2);
  await expect(page.locator('.chronicle__legend')).toHaveCount(0);
  await shots(page, 'select-three-beacons');

  // Begin: the campaign's single opening chapter, content v2.
  await page.getByTestId('scenario-silent_oracle').click();
  await expect(page.getByTestId('setup-begin')).toHaveText('Begin — Chapter 1 Briefing');
  await page.getByTestId('setup-begin').click();
  const s = await waitFor(page, (x) => x.overlays.includes('briefing'), 'briefing', 30_000, true);
  expect(s.state.mission.missionId).toBe(SO(1));
  expect(s.campaign.contentVersion).toBe(2);
  expect(s.campaign.currentMissionId).toBe(SO(1));
});

test('result: a branch pair pending — both chapters offered, what the chapter leaves behind; choosing starts that chapter', async ({ page }) => {
  test.setTimeout(1_200_000);
  const { campaign, match } = campaignRun('silent_oracle', [SO(1)], { flags: { [SO(1)]: ['so1_seal', 'so1_sheltered'] } });
  await page.setViewportSize(SIZES[0]);
  await importAndOpen(page, [writeSnapshot({ match, campaign }, 'so-pair')]);
  // A save at a won chapter opens its result again.
  await waitFor(page, (s) => s.overlays.includes('debrief'), 'debrief', 30_000, true);
  const dlg = page.getByTestId('debrief');
  await expect(dlg.locator('.panel__title').first()).toHaveText('Victory — The Pilgrims’ Road');
  await expect(page.getByTestId('debrief-continue')).toHaveCount(0);
  const a = page.getByTestId(`debrief-choose-${SO(2)}`);
  const b = page.getByTestId(`debrief-choose-${SO(3)}`);
  await expect(a).toHaveText('Chapter 2: The Bronze Bull and the Eyrie');
  await expect(b).toHaveText('Chapter 3: The Hall of Echoes');
  // Each choice carries the branch icon.
  for (const btn of [a, b]) expect(await btn.locator('img').evaluate((i) => (i as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  await expect(page.getByTestId('debrief-branch-note')).toContainText('Both chapters are required');
  // What the chapter leaves behind: its facts by their evidence names, and the bounded carry-over.
  const ev = catalog.missions[SO(1)]!.evidence!;
  await expect(page.getByTestId('debrief-fact-so1_seal')).toContainText(ev.find((e) => e.flag === 'so1_seal')!.title);
  await expect(page.getByTestId('debrief-fact-so1_sheltered')).toContainText(ev.find((e) => e.flag === 'so1_sheltered')!.title);
  await expect(page.getByTestId('debrief-carryover')).toContainText('Level');
  await expect(page.getByTestId('debrief-carryover')).toContainText('Skills');
  // The chronicle: chapter 1 complete, 2 and 3 available, the rest locked.
  const graph = page.getByTestId('debrief-chronicle');
  await expect(graph.getByTestId(`chapter-${SO(1)}`)).toHaveAttribute('data-state', 'completed');
  await expect(graph.getByTestId(`chapter-${SO(2)}`)).toHaveAttribute('data-state', 'available');
  await expect(graph.getByTestId(`chapter-${SO(3)}`)).toHaveAttribute('data-state', 'available');
  await expect(graph.getByRole('radio', { name: /^Chapter 4: .* — Locked\. Needs chapters 2 and 3$/ })).toHaveCount(1);
  await shots(page, 'result-pair-pending');
  await shots(
    page,
    'result-pair-pending-chronicle',
    async () => {
      await page.getByTestId('debrief-chronicle').scrollIntoViewIfNeeded();
    },
    [SIZES[0]],
  );
  // Choose chapter 3 first.
  await b.click();
  const s = await waitFor(page, (x) => x.overlays.includes('briefing') && x.state.mission.missionId === SO(3), 'chapter 3 briefing', 30_000, true);
  expect(s.campaign.currentMissionId).toBe(SO(3));
  expect(s.campaign.completions.map((c: { missionId: string }) => c.missionId)).toEqual([SO(1)]);
  expect(s.campaign.facts).toEqual(['so1_seal', 'so1_sheltered']);
});

test('result: one parallel chapter done — Continue to the other one; the next pair waits for it', async ({ page }) => {
  test.setTimeout(1_200_000);
  const { campaign, match } = campaignRun('silent_oracle', [SO(1), SO(2)]);
  await page.setViewportSize(SIZES[0]);
  await importAndOpen(page, [writeSnapshot({ match, campaign }, 'so-one-done')]);
  await waitFor(page, (s) => s.overlays.includes('debrief'), 'debrief', 30_000, true);
  const go = page.getByTestId('debrief-continue');
  await expect(go).toHaveText('Continue to Chapter 3: The Hall of Echoes');
  await expect(page.locator('[data-testid^="debrief-choose-"]')).toHaveCount(0);
  // Main Menu, the summary and Continue on one line.
  const tops = await page.getByTestId('debrief-actions').locator('button').evaluateAll((bs) => bs.map((x) => Math.round(x.getBoundingClientRect().top + x.getBoundingClientRect().height / 2)));
  expect(tops).toHaveLength(3);
  expect(Math.max(...tops) - Math.min(...tops)).toBeLessThanOrEqual(4);
  const graph = page.getByTestId('debrief-chronicle');
  await expect(graph.getByTestId(`chapter-${SO(3)}`)).toHaveAttribute('data-state', 'available');
  await expect(graph.getByRole('radio', { name: /^Chapter 4: .* — Locked\. Needs chapter 3$/ })).toHaveCount(1);
  // A chapter with no recorded facts says so instead of an empty list.
  await expect(page.getByTestId('debrief-facts-none')).toBeVisible();
  await shots(page, 'result-one-parallel-done');
  await go.click();
  const s = await waitFor(page, (x) => x.overlays.includes('briefing') && x.state.mission.missionId === SO(3), 'chapter 3 briefing', 30_000, true);
  expect(s.campaign.completions.map((c: { missionId: string }) => c.missionId)).toEqual([SO(1), SO(2)]);
});

test('practice replay from the result: it never continues the campaign; returning restores the primary run byte-identical', async ({ page }) => {
  test.setTimeout(1_200_000);
  const primary = campaignRun('three_beacons', [TB(1)], { runId: 'e2e-chron-practice', flags: { [TB(1)]: ['tb1_hamlet_first'] } });
  const files = [writeSnapshot({ match: primary.match, campaign: primary.campaign }, 'tb-result'), writeSnapshot(practiceWon(primary.campaign, TB(1)), 'tb-practice-won')];
  await page.setViewportSize(SIZES[0]);
  await importAndOpen(page, files);
  await waitFor(page, (s) => s.overlays.includes('debrief'), 'debrief', 30_000, true);
  await expect(page.getByTestId('debrief-continue')).toHaveText('Continue to Chapter 2: The Storm Beacon');
  const before = await runText(page);

  // Chapter 1 is complete: its summary offers a practice replay.
  const graph = page.getByTestId('debrief-chronicle');
  await graph.getByTestId(`chapter-${TB(1)}`).click();
  await page.getByTestId(`practice-${TB(1)}`).click();
  await expect(page.getByTestId('confirm')).toContainText('Nothing you do there changes your campaign');
  await page.getByTestId('confirm-ok').click();
  let s = await waitFor(page, (x) => x.overlays.includes('briefing'), 'practice briefing', 30_000, true);
  expect(s.campaign.branch).toBe('practice');
  expect(s.campaign.campaignRunId).toBe(`e2e-chron-practice:practice:${TB(1)}`);
  expect(s.state.mission.missionId).toBe(TB(1));
  expect(s.state.outcome.status).toBe('running');
  await page.getByTestId('briefing-begin').click();
  await waitFor(page, (x) => x.screen === 'adventure' && x.overlays.length === 0, 'practice map', 30_000, true);

  // The replay's own save, at its victory (written by this same replay): its result opens.
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Load Game' }).click();
  await loadSlot(page, 'manual-2');
  s = await waitFor(page, (x) => x.overlays.includes('debrief'), 'practice result', 30_000, true);
  expect(s.campaign.branch).toBe('practice');
  await expect(page.getByTestId('debrief').locator('.panel__title').first()).toHaveText('Practice replay — The Silent Shore — Wings over the Pass');
  await expect(page.getByTestId('debrief-practice')).toContainText('nothing here changes your campaign');
  await expect(page.getByTestId('debrief-continue')).toHaveCount(0);
  await expect(page.locator('[data-testid^="debrief-choose-"]')).toHaveCount(0);
  await expect(page.getByTestId('debrief-return')).toBeEnabled();
  // The chronicle shows the primary run, with the replayed chapter marked.
  await expect(page.getByTestId('debrief-chronicle').getByTestId(`chapter-${TB(1)}`)).toHaveAttribute('data-state', 'practice');
  await expect(page.getByTestId('debrief-chronicle').getByRole('radio', { name: /Practice replay/ })).toHaveCount(1);
  await expect(page.getByTestId('debrief-chronicle').getByTestId(`chapter-${TB(2)}`)).toHaveAttribute('data-state', 'available');
  await shots(page, 'result-practice');

  // Back to the campaign: the primary run exactly as it was, its result open again.
  await page.getByTestId('debrief-return').click();
  s = await waitFor(page, (x) => x.overlays.includes('debrief') && x.campaign?.branch === 'primary', 'primary result', 30_000, true);
  expect(await runText(page)).toBe(before);
  await expect(page.getByTestId('debrief-continue')).toHaveText('Continue to Chapter 2: The Storm Beacon');
  await page.getByTestId('debrief-continue').click();
  s = await waitFor(page, (x) => x.overlays.includes('briefing') && x.state.mission.missionId === TB(2), 'chapter 2', 30_000, true);
  expect(s.campaign.branch).toBe('primary');
  expect(s.campaign.facts).toEqual(['tb1_hamlet_first']);
});

test('final chapter: the v2 epilogue and its chosen variant over the campaign painting, then the campaign complete', async ({ page }) => {
  test.setTimeout(1_500_000);
  const save = finalBattleSave();
  const target = missionSite(catalog, save.match, 'tb2_assault')!.coord;
  await page.setViewportSize(SIZES[0]);
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await page.getByTestId('menu-settings').click();
  await page.getByLabel('Battle speed').selectOption('instant');
  await page.getByTestId('settings-apply').click();
  await importAndOpen(page, [writeSnapshot(save, 'tb-final')]);
  await waitFor(page, (s) => s.screen === 'adventure', 'adventure', 30_000);
  await page.waitForTimeout(800);
  // March on the raiders: the pre-battle dialog offers one Fight action; the approach plays before the battlefield opens.
  for (let i = 0; i < 10; i++) {
    const now = await inspect(page);
    if (now.screen === 'battle') break;
    if (now.overlays.includes('encounter')) {
      await page.getByTestId('encounter-attack').click();
      await waitFor(page, (x) => x.screen === 'battle' || (!x.busy && !x.state.battle && !x.overlays.includes('encounter')), 'battle (or back on the map)', 120_000);
      continue;
    }
    if (!now.busy && !now.state.battle) {
      await clickHex(page, target.q, target.r);
      await page.waitForTimeout(400);
      if (!(await inspect(page)).overlays.includes('encounter')) await clickHex(page, target.q, target.r);
    }
    await page.waitForTimeout(900);
  }
  await waitFor(page, (s) => s.screen === 'battle', 'battle', 120_000);
  await page.waitForTimeout(500);
  await readStory(page);
  await fightByHand(page);
  // Through the result, any level-up and the battle's scenes, to the epilogue.
  let s = await inspect(page);
  for (let i = 0; i < 60 && !s.story.some((k) => k.startsWith('epilogue:')); i++) {
    if (s.story.length > 0) await page.getByTestId('story-continue').click();
    else if (s.screen === 'level-up') await page.getByTestId('offer-0').click();
    else if (s.screen === 'battle-result') await page.getByTestId('result-continue').click();
    await page.waitForTimeout(400);
    s = await inspect(page);
  }
  while (s.story[0] && !s.story[0].startsWith('epilogue:')) {
    await page.getByTestId('story-continue').click();
    await page.waitForTimeout(200);
    s = await inspect(page);
  }
  expect(s.story[0]).toBe('epilogue:three_beacons');
  expect(s.campaign.status).toBe('completed');
  const camp = catalog.campaigns['three_beacons']!;
  const art = page.getByTestId('scene-art');
  await expect(art).toBeVisible();
  // epilogueV2.art, never a v1 ending picture.
  expect(await art.getAttribute('src')).toContain(`${camp.epilogueV2!.art}.webp`);
  expect(await art.getAttribute('src')).not.toContain('ending.');
  await shots(page, 'epilogue-v2');
  const seen = await readStory(page);
  const variant = camp.epilogueV2!.variants!.find((v) => v.flag === 'tb_network_local')!;
  expect(seen).toEqual([...camp.epilogueV2!.lines, ...variant.lines].map((l) => l.text));
  const other = camp.epilogueV2!.variants!.find((v) => v.flag === 'tb_network_military')!;
  expect(seen.join(' ')).not.toContain(other.lines[0]!.text);
  // The campaign complete: the same epilogue, every chapter complete and open for practice.
  await waitFor(page, (x) => x.overlays.includes('campaign-complete'), 'campaign complete', 30_000, true);
  const done = page.getByTestId('campaign-complete');
  await expect(done).toContainText(variant.lines[0]!.text);
  await expect(done.getByTestId(`chapter-${TB(1)}`)).toHaveAttribute('data-state', 'completed');
  await expect(done.getByTestId(`chapter-${TB(2)}`)).toHaveAttribute('data-state', 'completed');
  await expect(page.getByTestId(`practice-${TB(2)}`)).toBeVisible();
  await expect(page.getByTestId('debrief-continue')).toHaveCount(0);
  await shots(page, 'campaign-complete-v2');
});

test('continue and load: content version, the actual chapter, practice apart, an older save without the new fields, a v1 save loads as v1', async ({ page }) => {
  test.setTimeout(1_200_000);
  const v2ch3 = campaignRun('silent_oracle', [SO(1), SO(2)], { then: SO(3), runId: 'e2e-chron-load-v2' });
  const practicePrimary = campaignRun('three_beacons', [TB(1)], { runId: 'e2e-chron-load-practice' });
  const practiceRunning = practiceWon(practicePrimary.campaign, TB(1), false);
  const fresh = campaignRun('three_beacons', [], { runId: 'e2e-chron-load-fresh' });
  const finished = campaignRun('three_beacons', [TB(1), TB(2)], { runId: 'e2e-chron-load-done' });
  // A v1 run saved before content v2: no contentVersion in its run, no new metadata fields.
  const v1 = campaignRun('silent_oracle', ['silent_oracle_m01', 'silent_oracle_m02'], { then: 'silent_oracle_m03', version: 1, runId: 'e2e-chron-load-v1' });
  const v1Old = { ...v1.campaign } as Record<string, unknown>;
  delete v1Old['contentVersion'];
  const files = [
    writeSnapshot({ match: v2ch3.match, campaign: v2ch3.campaign }, 'load-v2-ch3'),
    writeSnapshot(practiceRunning, 'load-practice'),
    writeSnapshot({ match: fresh.match, campaign: fresh.campaign }, 'load-v2-older', { older: true }),
    writeSnapshot({ match: finished.match, campaign: finished.campaign }, 'load-complete'),
    writeSnapshot({ match: v1.match, campaign: v1Old as unknown as typeof v1.campaign }, 'load-v1-older', { older: true }),
  ];
  await page.setViewportSize(SIZES[0]);
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await page.getByTestId('menu-load').click();
  await importFiles(page, files);
  const row = (n: number) => page.getByTestId(`save-manual-${n}-run`);
  await expect(row(1)).toContainText('Chronicle (v2)');
  await expect(row(1)).toContainText('Chapter 3 of 6 — The Hall of Echoes');
  await expect(row(2)).toContainText('Practice replay');
  await expect(row(2)).toHaveAttribute('data-branch', 'practice');
  await expect(row(3)).toContainText('Chronicle (v2)');
  await expect(row(3)).toContainText('Chapter 1 of 2 — The Silent Shore — Wings over the Pass');
  await expect(row(4)).toContainText('Campaign complete');
  await expect(row(5)).toContainText('Legacy campaign (v1)');
  await expect(row(5)).toContainText('Mission 3 of 7');
  await expect(row(1)).not.toContainText('Practice replay');
  await page.getByTestId('save-manual-5').click();
  await expect(page.getByTestId('save-detail-version')).toHaveText('Legacy campaign (v1)');
  await expect(page.getByTestId('save-detail-progress')).toHaveText('Mission 3 of 7 — The Eyrie of Aetos');
  await expect(page.getByTestId('save-detail-branch')).toHaveText('Primary run');
  await page.getByTestId('save-manual-2').click();
  await expect(page.getByTestId('save-detail-branch')).toContainText('Practice replay — kept apart');
  await shots(page, 'load-list');

  // Continue: the latest running save (the v1 one), with its version and actual mission.
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  const cont = page.getByTestId('menu-continue');
  await expect(page.getByTestId('continue-run')).toContainText('Legacy campaign (v1)');
  await expect(cont).toContainText('Mission 3 of 7 — The Eyrie of Aetos');
  await shots(page, 'continue-v1');
  await cont.click();
  const s = await waitFor(page, (x) => !!x.state && x.screen === 'adventure', 'continued game', 30_000, true);
  // Loads as v1: its own missions and no content version.
  expect(s.state.mission.missionId).toBe('silent_oracle_m03');
  expect(s.campaign.contentVersion).toBeUndefined();
  expect(s.campaign.currentMissionId).toBe('silent_oracle_m03');
});

test('largest interface scale (160% at 1366×768): the chronicle and the result fit', async ({ page }) => {
  test.setTimeout(1_200_000);
  await page.setViewportSize({ width: 1366, height: 768 });
  await setUiScale(page, '1.6');
  await page.getByTestId('menu-new').click();
  await page.getByTestId('mode-campaign').click();
  await page.getByTestId('scenario-winter_oath').click();
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--ui-scale').trim())).toBe('1.6');
  await settle(page);
  expect(await overflowX(page)).toEqual([]);
  await page.screenshot({ path: join(SHOTS, 'select-uiscale160-1366x768.png') });
  await page.getByTestId('chronicle-graph').scrollIntoViewIfNeeded();
  await settle(page);
  expect(await overflowX(page)).toEqual([]);
  await page.screenshot({ path: join(SHOTS, 'select-graph-uiscale160-1366x768.png') });
  await page.getByTestId('chronicle-summary').scrollIntoViewIfNeeded();
  await settle(page);
  await page.screenshot({ path: join(SHOTS, 'select-summary-uiscale160-1366x768.png') });
  // Text stays readable (the panel scrolls instead of shrinking it).
  expect(await page.locator('.chron-summary__text').first().evaluate((e) => parseFloat(getComputedStyle(e).fontSize))).toBeGreaterThanOrEqual(14);

  const { campaign, match } = campaignRun('silent_oracle', [SO(1)], { flags: { [SO(1)]: ['so1_seal'] } });
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await page.getByTestId('menu-load').click();
  await importFiles(page, [writeSnapshot({ match, campaign }, 'scale-pair')]);
  await loadSlot(page, 'manual-1');
  await waitFor(page, (s) => s.overlays.includes('debrief'), 'debrief', 30_000, true);
  await settle(page);
  expect(await overflowX(page)).toEqual([]);
  await expect(page.getByTestId(`debrief-choose-${SO(2)}`)).toBeVisible();
  await expect(page.getByTestId(`debrief-choose-${SO(3)}`)).toBeVisible();
  await page.screenshot({ path: join(SHOTS, 'result-pair-uiscale160-1366x768.png') });
  await page.getByTestId('debrief-chronicle').scrollIntoViewIfNeeded();
  await settle(page);
  expect(await overflowX(page)).toEqual([]);
  await page.screenshot({ path: join(SHOTS, 'result-pair-chronicle-uiscale160-1366x768.png') });
});
