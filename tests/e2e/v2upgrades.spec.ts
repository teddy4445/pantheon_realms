import { mkdirSync, writeFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { loadCatalog } from '@pr/content';
import { clickHex, inspect, waitFor } from './helpers';
import { importAndLoad } from './fixtures';
import { usePrefs } from './momentFixtures';
import { neutralBattle } from './v2battleFixtures';
import { NEUTRAL_PAIRS, pairLineUp, siteFixture, type SiteFixture } from './v2upgradeFixtures';

/**
 * Neutral upgrades (battle FX & neutral upgrades delivery, 2026-10-15) through the
 * real interface:
 *
 *  - the hiring dialog's base / upgraded selector (pointer and keyboard): the
 *    selected form's native portrait, statistics, rules and price, one shared
 *    stock; Recruit for the selected form is one RecruitFromCamp with that form;
 *  - training: shown only with an eligible base stack; a partial and a full
 *    training, too little gold and no space say why;
 *  - the encyclopedia and the unit page show both forms of each of the six
 *    families with their portraits, statistics, habitat and hiring;
 *  - each base form beside its upgrade in battle (both facings, light ground),
 *    every frame watched for one scale per animation and a steady ground point,
 *    the Dawncrest Pegasus's takeoff, flight and landing.
 *
 * Fixtures are ordinary saves imported with Load → Import (no privileged hooks;
 * the ?e2e readouts are read-only). Screenshots at 1280×720, 1366×768, 1920×1080
 * and the 160 % interface scale: /home/claude/capture/v2-upgrades/.
 */

const OUT = process.env.V2_UPGRADES_OUT ?? '/home/claude/capture/v2-upgrades';
mkdirSync(OUT, { recursive: true });
const SIZES = [
  { width: 1280, height: 720 },
  { width: 1366, height: 768 },
  { width: 1920, height: 1080 },
] as const;
// The dev server and the emulated GPU are slow: each test loads the game afresh and captures three sizes.
test.describe.configure({ timeout: 900_000 });

const catalog = loadCatalog();
const SITE = 'wo2_root_runners';

async function importNamed(page: Page, f: SiteFixture): Promise<void> {
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await page.getByTestId('menu-load').click();
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: /Import/ }).click();
  await (await chooser).setFiles(f.file);
  const slot = page.locator('[data-testid^="save-manual-"]', { hasText: `${f.saveName} (imported)` });
  await slot.first().waitFor();
  await slot.first().click();
  await page.getByTestId('load-confirm').click();
  await page.waitForTimeout(200);
  if ((await inspect(page)).overlays.includes('confirm')) await page.getByTestId('confirm-ok').click();
  await waitFor(page, (s) => !!s.state && !s.overlays.includes('save-load'), 'loaded save');
  await waitFor(page, (s) => s.screen === 'adventure' && s.overlays.length === 0, 'adventure map');
}

async function load(page: Page, f: SiteFixture): Promise<void> {
  await page.setViewportSize(SIZES[0]);
  await importNamed(page, f);
}

/** Select the hero and open the site it stands on (a click on its own tile), as a player would. */
async function openCamp(page: Page, f: SiteFixture): Promise<void> {
  for (let i = 0; i < 5; i++) {
    await clickHex(page, f.coord.q, f.coord.r);
    await page.waitForTimeout(350);
    const s = await inspect(page);
    if (s.overlays.includes('camp')) return;
    const tip = page.getByRole('button', { name: 'Got it' });
    if (await tip.isVisible().catch(() => false)) await tip.click();
  }
  throw new Error('camp did not open');
}

interface Fit {
  hscroll: boolean;
  outside: string[];
  overflow: string[];
  scrolls: string[];
}

/**
 * Everything in view without horizontal scrolling; the listed controls fully on screen; no clipped
 * pane; and no nested scrolling: no element inside the dialog scrolls (its content is taller than its box).
 */
async function fit(page: Page, controls: string[]): Promise<Fit> {
  return page.evaluate((ctl) => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const doc = document.documentElement;
    const r = document.querySelector('[data-testid="camp"]')!;
    const outside: string[] = [];
    for (const sel of ctl) {
      const e = r.querySelector(sel);
      if (!e) {
        outside.push(`${sel} (missing)`);
        continue;
      }
      const b = e.getBoundingClientRect();
      if (b.width === 0 || b.left < -0.5 || b.top < -0.5 || b.right > vw + 0.5 || b.bottom > vh + 0.5) outside.push(`${sel} @${Math.round(b.left)},${Math.round(b.top)},${Math.round(b.right)},${Math.round(b.bottom)}`);
    }
    const overflow: string[] = [];
    for (const sel of ['.ak-body', '.nr-deal', '.nr-show', '.nr-train', '.nr-forms']) {
      const e = r.querySelector(sel) as HTMLElement | null;
      if (e && (e.scrollHeight > e.clientHeight + 1 || e.scrollWidth > e.clientWidth + 1)) overflow.push(`${sel} ${e.scrollWidth}x${e.scrollHeight} > ${e.clientWidth}x${e.clientHeight}`);
    }
    const scrolls: string[] = [];
    for (const e of r.querySelectorAll<HTMLElement>('*')) {
      const cs = getComputedStyle(e);
      if (/(auto|scroll)/.test(cs.overflowY) && e.scrollHeight > e.clientHeight + 1) scrolls.push(`${e.className || e.tagName} ${e.scrollHeight}>${e.clientHeight}`);
    }
    return { hscroll: doc.scrollWidth > vw + 1 || document.body.scrollWidth > vw + 1, outside, overflow, scrolls };
  }, controls);
}

const CONTROLS = ['[data-testid="nr-form-base"]', '[data-testid="nr-form-upgraded"]', '[data-testid="camp-recruit"]', '[data-testid="camp-recruit-all"]', '.nr-qty .qty', '[data-testid="nr-army"]', '[data-testid="nr-stock"]', '[data-testid="nr-price"]', '[data-testid="camp-leave"]'];
const TRAIN_CONTROLS = [...CONTROLS, '[data-testid="camp-train"]', '.nr-train .qty', '[data-testid="nr-train-destination"]', '[data-testid="nr-train-left"]'];

async function campFits(page: Page, label: string, controls: string[]): Promise<void> {
  const f = await fit(page, controls);
  expect(f.hscroll, `${label}: horizontal scroll`).toBe(false);
  expect(f.outside, `${label}: controls out of view`).toEqual([]);
  expect(f.overflow, `${label}: clipped panes`).toEqual([]);
  expect(f.scrolls, `${label}: nested scrolling`).toEqual([]);
}

/** Set the window size and let a fresh frame be composited (the emulated GPU can show a stale frame). */
async function settle(page: Page, size: { width: number; height: number }): Promise<void> {
  await page.setViewportSize({ width: size.width, height: size.height - 2 });
  await page.waitForTimeout(250);
  await page.setViewportSize(size);
  await page.waitForTimeout(800);
}

async function shoot(page: Page, name: string, check?: (size: { width: number; height: number }) => Promise<void>, root = 'camp'): Promise<void> {
  for (const size of SIZES) {
    await settle(page, size);
    await expect(page.getByTestId(root)).toBeVisible();
    await page
      .waitForFunction((id) => [...document.querySelectorAll(`[data-testid="${id}"] img`)].every((i) => (i as HTMLImageElement).complete && (i as HTMLImageElement).naturalWidth > 0), root, { timeout: 30_000 })
      .catch(() => undefined);
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${OUT}/${name}-${size.width}x${size.height}.png`, animations: 'disabled' });
    if (check) await check(size);
  }
}

/** The kit portrait: the native file, never shown larger than its native size, no filter. */
async function portraitNative(page: Page, file: RegExp): Promise<void> {
  const img = page.getByTestId('nr-portrait');
  await expect(img).toHaveAttribute('src', file);
  await expect.poll(() => img.evaluate((e) => (e as HTMLImageElement).naturalWidth)).toBe(1254);
  const m = await img.evaluate((e) => {
    const i = e as HTMLImageElement;
    const b = i.getBoundingClientRect();
    return { w: b.width, h: b.height, nw: i.naturalWidth, nh: i.naturalHeight, filter: getComputedStyle(i).filter };
  });
  expect(m.w).toBeLessThanOrEqual(m.nw + 0.5);
  expect(m.h).toBeLessThanOrEqual(m.nh + 0.5);
  expect(m.filter).toBe('none');
}

// ---------------------------------------------------------------------------
// Neutral recruitment: base / upgraded
// ---------------------------------------------------------------------------

test('hiring site: base and upgraded selectors (pointer and keyboard), the selected form’s portrait, facts and price, one shared stock', async ({ page }) => {
  const f = siteFixture({ name: 'up-tabs', missionId: 'winter_oath_v2_m02', siteId: SITE, army: [['norse_draugr', 24], ['norse_frost_wolf', 8], null, null, null, null, null], wallet: { gold: 5000 } });
  await load(page, f);
  await openCamp(page, f);
  const base = catalog.creatures['root_runner']!;
  const up = catalog.creatures['crownroot_runner']!;
  const nr = page.getByTestId('neutral-recruit');
  // Two selectors, the base form checked; each shows its own price.
  const tBase = page.getByTestId('nr-form-base');
  const tUp = page.getByTestId('nr-form-upgraded');
  await expect(tBase).toHaveAttribute('aria-checked', 'true');
  await expect(tUp).toHaveAttribute('aria-checked', 'false');
  await expect(tBase).toContainText('Root-Runner');
  await expect(tBase).toContainText('110');
  await expect(tUp).toContainText('Crownroot Runner');
  await expect(tUp).toContainText('145');
  await expect(nr).toHaveAttribute('data-form', 'base');
  await portraitNative(page, /campaign-v2\/portrait-root_runner\.png$/);
  // No base stack in the army: no training action.
  await expect(page.getByTestId('nr-train')).toHaveCount(0);
  await shoot(page, 'recruit-base', (s) => campFits(page, `base ${s.width}x${s.height}`, CONTROLS));

  // The upgraded form by pointer: its own portrait, name, statistics, rule and price; the same stock.
  await page.setViewportSize(SIZES[0]);
  await tUp.click();
  await expect(nr).toHaveAttribute('data-form', 'upgraded');
  await expect(tUp).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByTestId('nr-name')).toHaveText(up.name);
  await expect(page.getByTestId('nr-form-tag')).toHaveText('Upgraded form');
  await portraitNative(page, /battle-fx-neutral-upgrades-v1\/portrait-crownroot_runner\.png$/);
  await expect(page.getByTestId('nr-portrait')).toHaveAttribute('alt', up.presentation.portraitAlt);
  const stats = page.getByTestId('nr-stats');
  await expect(stats.locator('[data-stat="attack"] dd')).toHaveText(String(up.stats!.attack));
  await expect(stats.locator('[data-stat="defense"] dd')).toHaveText(String(up.stats!.defense));
  await expect(stats.locator('[data-stat="hp"] dd')).toHaveText(String(up.stats!.hp));
  await expect(stats.locator('[data-stat="damage"] dd')).toHaveText(`${up.stats!.damageMin}–${up.stats!.damageMax}`);
  await expect(stats.locator('[data-stat="speed"] dd')).toHaveText(String(up.stats!.speed));
  await expect(page.getByTestId('nr-ability-neutral_distract').locator('.nr-ability__rule')).toHaveText(catalog.abilities['neutral_distract']!.exactRule);
  await expect(page.getByTestId('nr-habitat')).toContainText('Ancient knotted tree-root hollows');
  await expect(page.getByTestId('nr-price')).toContainText('145');
  await expect(page.getByTestId('nr-stock')).toContainText('8 Root-Runners this week');
  await expect(page.getByTestId('nr-stock')).toContainText('shared by both forms and every empire');
  await expect(page.getByTestId('camp-recruit-all')).toContainText('Recruit all affordable (8)');
  await expect(page.getByTestId('camp-recruit-all')).toContainText('1,160');
  await shoot(page, 'recruit-upgraded', (s) => campFits(page, `upgraded ${s.width}x${s.height}`, CONTROLS));

  // Keyboard: arrows move the choice inside the radio group; Tab reaches it and every control.
  await page.setViewportSize(SIZES[0]);
  await tUp.focus();
  await page.keyboard.press('ArrowLeft');
  await expect(nr).toHaveAttribute('data-form', 'base');
  await expect(tBase).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(nr).toHaveAttribute('data-form', 'upgraded');
  await expect(tUp).toBeFocused();
  const reached = new Set<string>();
  for (let i = 0; i < 40; i++) {
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => !!document.activeElement?.closest('[data-testid="camp"]'))).toBe(true);
    reached.add(await page.evaluate(() => (document.activeElement as HTMLElement | null)?.dataset.testid ?? ''));
  }
  for (const want of ['nr-form-upgraded', 'camp-recruit', 'camp-recruit-all', 'camp-leave', 'nr-details']) expect([...reached], want).toContain(want);

  // Recruit two of the upgraded form: one command with that form; one stock for both forms.
  const gold0 = (await inspect(page)).state.players.player.wallet.gold as number;
  await page.getByRole('button', { name: /^Increase Crownroot Runners to hire/ }).click();
  await expect(page.getByTestId('camp-recruit')).toContainText('Recruit 2');
  await expect(page.getByTestId('nr-destination')).toHaveText('Slot 3 — a free slot: a new stack of 2.');
  await page.getByTestId('camp-recruit').click();
  await expect(page.getByTestId('nr-stock')).toContainText('6 Root-Runners this week');
  let s = await inspect(page);
  expect(s.state.players.player.wallet.gold).toBe(gold0 - 290);
  expect(s.state.heroes.hervor.army.slots[2]).toMatchObject({ creatureId: 'crownroot_runner', count: 2 });
  expect(s.state.world.sites[SITE].stock).toBe(6);
  // Then the base form: a stack of its own, from the same stock.
  await page.waitForTimeout(600);
  await tBase.click();
  await expect(page.getByTestId('nr-destination')).toHaveText('Slot 4 — a free slot: a new stack of 1.');
  await page.getByTestId('camp-recruit').click();
  await expect(page.getByTestId('nr-stock')).toContainText('5 Root-Runners this week');
  s = await inspect(page);
  expect(s.state.heroes.hervor.army.slots[3]).toMatchObject({ creatureId: 'root_runner', count: 1 });
  expect(s.state.heroes.hervor.army.slots[2]).toMatchObject({ creatureId: 'crownroot_runner', count: 2 });
  expect(s.state.players.player.wallet.gold).toBe(gold0 - 290 - 110);
  // The hero now has a base stack: the training action appears.
  await expect(page.getByTestId('nr-train')).toBeVisible();
  await expect(page.getByTestId('nr-train-what')).toContainText(`1 ${base.name} (slot 4) → ${up.pluralName}`);
  await page.keyboard.press('Escape');
  await waitFor(page, (x) => !x.overlays.includes('camp'), 'camp closed');
});

test('hiring site: training a base stack — partial into a free slot, then the rest; too little gold and no space say why', async ({ page }) => {
  const f = siteFixture({ name: 'up-train', missionId: 'winter_oath_v2_m02', siteId: SITE, army: [['norse_draugr', 24], ['root_runner', 6], null, null, null, null, null], wallet: { gold: 1000 } });
  await load(page, f);
  await openCamp(page, f);
  const train = page.getByTestId('nr-train');
  await expect(train).toBeVisible();
  await expect(page.getByTestId('nr-train-what')).toContainText('6 Root-Runners (slot 2) → Crownroot Runners');
  await expect(page.getByTestId('nr-train-what')).toContainText('35');
  // The week's training allowance (its weekly stock, shared by every empire): all eight left.
  await expect(page.getByTestId('nr-train-left')).toHaveText('8 of 8 left this week');
  await expect(page.getByTestId('camp-train')).toContainText('Train 1');
  await expect(page.getByTestId('nr-train-destination')).toHaveText('Slot 3 — a free slot: a new stack of 1 Crownroot Runner. 5 Root-Runners stay in slot 2.');
  await shoot(page, 'train-available', (s) => campFits(page, `train ${s.width}x${s.height}`, TRAIN_CONTROLS));
  await page.setViewportSize(SIZES[0]);
  // Partial: two (the stock is not used).
  await page.getByRole('button', { name: /^Increase Root-Runners to train/ }).click();
  await expect(page.getByTestId('camp-train')).toContainText('Train 2');
  await expect(page.getByTestId('camp-train')).toContainText('70');
  const gold0 = (await inspect(page)).state.players.player.wallet.gold as number;
  await page.getByTestId('camp-train').click();
  await expect(page.getByTestId('nr-train-what')).toContainText('4 Root-Runners (slot 2)');
  let s = await inspect(page);
  expect(s.state.heroes.hervor.army.slots[1]).toMatchObject({ creatureId: 'root_runner', count: 4 });
  expect(s.state.heroes.hervor.army.slots[2]).toMatchObject({ creatureId: 'crownroot_runner', count: 2 });
  expect(s.state.players.player.wallet.gold).toBe(gold0 - 70);
  expect(s.state.world.sites[SITE].stock ?? 8).toBe(8);
  await expect(page.getByTestId('nr-stock')).toContainText('8 Root-Runners this week');
  // Two of the week's eight are used (the hiring stock is not).
  await expect(page.getByTestId('nr-train-left')).toHaveText('6 of 8 left this week');
  expect(s.state.world.sites[SITE]).toMatchObject({ trainedThisWeek: 2, trainedWeek: 1 });
  // The rest (Max): they join the upgraded stack, the base slot is freed.
  await page.waitForTimeout(600);
  await page.getByTestId('nr-train').getByRole('button', { name: 'Max' }).click();
  await expect(page.getByTestId('nr-train-destination')).toHaveText('Slot 3 — joins the 2 Crownroot Runners already there (6 after).');
  await page.getByTestId('camp-train').click();
  await expect(page.getByTestId('nr-train')).toHaveCount(0);
  s = await inspect(page);
  expect(s.state.heroes.hervor.army.slots[1]).toBeNull();
  expect(s.state.heroes.hervor.army.slots[2]).toMatchObject({ creatureId: 'crownroot_runner', count: 6 });
  expect(s.state.players.player.wallet.gold).toBe(gold0 - 70 - 140);
  expect(s.state.world.sites[SITE]).toMatchObject({ trainedThisWeek: 6, trainedWeek: 1 });
  await shoot(page, 'train-done', (sz) => campFits(page, `trained ${sz.width}x${sz.height}`, CONTROLS));
});

test('hiring site: the week’s training allowance — what is left, Max stops there, and the disabled state once it is used up', async ({ page }) => {
  // Another empire already trained five here this week: three of eight are left; the hero has six Root-Runners.
  const f = siteFixture({ name: 'up-train-cap', missionId: 'winter_oath_v2_m02', siteId: SITE, army: [['norse_draugr', 24], ['root_runner', 6], null, null, null, null, null], wallet: { gold: 3000 }, trainedThisWeek: 5 });
  await load(page, f);
  await openCamp(page, f);
  const left = page.getByTestId('nr-train-left');
  await expect(left).toHaveText('3 of 8 left this week');
  await expect(left).toBeVisible();
  // Max stops at what is left (not the six in the stack); a part goes to a free slot.
  await page.getByTestId('nr-train').getByRole('button', { name: 'Max' }).click();
  await expect(page.getByTestId('camp-train')).toContainText('Train 3');
  await expect(page.getByTestId('camp-train')).toContainText('105');
  await expect(page.getByRole('button', { name: /^Increase Root-Runners to train/ })).toBeDisabled();
  await expect(page.getByTestId('nr-train').locator('input[type="range"]')).toHaveAttribute('max', '3');
  await expect(page.getByTestId('nr-train-destination')).toHaveText('Slot 3 — a free slot: a new stack of 3 Crownroot Runners. 3 Root-Runners stay in slot 2.');
  await shoot(page, 'train-left-this-week', (s) => campFits(page, `train left ${s.width}x${s.height}`, TRAIN_CONTROLS));
  await page.setViewportSize(SIZES[0]);
  // Keyboard: Tab reaches the Train button; Enter trains the three.
  const gold0 = (await inspect(page)).state.players.player.wallet.gold as number;
  await page.getByTestId('camp-train').focus();
  await page.keyboard.press('Enter');
  await expect(left).toHaveText('0 of 8 left this week');
  let s = await inspect(page);
  expect(s.state.heroes.hervor.army.slots[1]).toMatchObject({ creatureId: 'root_runner', count: 3 });
  expect(s.state.heroes.hervor.army.slots[2]).toMatchObject({ creatureId: 'crownroot_runner', count: 3 });
  expect(s.state.players.player.wallet.gold).toBe(gold0 - 105);
  expect(s.state.world.sites[SITE]).toMatchObject({ trainedThisWeek: 8, trainedWeek: 1 });
  // None left: the strip stays (three Root-Runners remain), the reason is its visible disabled state.
  const reason = 'Its trainers can take no more this week (8 a week). More can train when the next week begins.';
  await expect(page.getByTestId('nr-train')).toBeVisible();
  await expect(page.getByTestId('camp-train')).toBeDisabled();
  await expect(page.getByTestId('camp-train')).toHaveAttribute('aria-description', reason);
  await expect(page.getByTestId('nr-train-destination')).toHaveText(reason);
  await expect(page.getByTestId('nr-train-destination')).toBeVisible();
  await expect(page.getByTestId('nr-train-destination')).toHaveClass(/is-refused/);
  await expect(left).toHaveClass(/is-spent/);
  await expect(page.getByTestId('nr-train').getByRole('button', { name: 'Max' })).toBeDisabled();
  // Hiring is not limited by it: the stock is the site's own.
  await expect(page.getByTestId('nr-stock')).toContainText('8 Root-Runners this week');
  await expect(page.getByTestId('camp-recruit')).toBeEnabled();
  s = await inspect(page);
  expect(s.state.world.sites[SITE].stock ?? 8).toBe(8);
  await shoot(page, 'train-allowance-used', (sz) => campFits(page, `train used ${sz.width}x${sz.height}`, TRAIN_CONTROLS));
});

test('hiring site: training refused — too little gold for one, and a full army that cannot split a stack', async ({ page }) => {
  const poor = siteFixture({ name: 'up-train-poor', missionId: 'winter_oath_v2_m02', siteId: SITE, army: [['norse_draugr', 24], ['root_runner', 4], null, null, null, null, null], wallet: { gold: 20 } });
  await load(page, poor);
  await openCamp(page, poor);
  await expect(page.getByTestId('camp-train')).toBeDisabled();
  await expect(page.getByTestId('nr-train-destination')).toHaveText('Training one Root-Runner costs 35 Gold: short 15 Gold.');
  await expect(page.getByTestId('camp-train')).toHaveAttribute('aria-description', 'Training one Root-Runner costs 35 Gold: short 15 Gold.');
  await shoot(page, 'train-insufficient', (s) => campFits(page, `train poor ${s.width}x${s.height}`, TRAIN_CONTROLS));

  const full = siteFixture({
    name: 'up-train-full',
    missionId: 'winter_oath_v2_m02',
    siteId: SITE,
    army: [['root_runner', 4], ['norse_draugr', 12], ['norse_frost_wolf', 8], ['norse_draugr', 2], ['norse_frost_wolf', 3], ['norse_deathless_draugr', 1], ['norse_draugr', 5]],
    wallet: { gold: 100 },
  });
  await importNamed(page, full);
  await openCamp(page, full);
  await expect(page.getByTestId('camp-train')).toBeDisabled();
  await expect(page.getByTestId('nr-train-destination')).toHaveText('Training all 4 costs 140 Gold: short 40 Gold. A partial training needs a free slot or an existing stack of Crownroot Runners.');
  await shoot(page, 'train-no-space', (s) => campFits(page, `train full ${s.width}x${s.height}`, TRAIN_CONTROLS));
});

test('hiring site: a pact not made locks both forms and training', async ({ page }) => {
  const f = siteFixture({ name: 'up-pact', missionId: 'silent_oracle_v2_m02', siteId: 'so2_pegasus', army: [['hoplite', 20], ['pegasus', 3], null, null, null, null, null], wallet: { gold: 5000 } });
  const reason = (catalog.missions['silent_oracle_v2_m02']!.sites.find((x) => x.id === 'so2_pegasus')!.kind as { lockedReason: string }).lockedReason;
  await load(page, f);
  await openCamp(page, f);
  await expect(page.getByTestId('nr-issue-locked')).toContainText(reason);
  await expect(page.getByTestId('camp-recruit')).toBeDisabled();
  await page.getByTestId('nr-form-upgraded').click();
  await expect(page.getByTestId('nr-name')).toHaveText('Dawncrest Pegasus');
  await portraitNative(page, /battle-fx-neutral-upgrades-v1\/portrait-dawncrest_pegasus\.png$/);
  await expect(page.getByTestId('nr-issue-locked')).toContainText(reason);
  await expect(page.getByTestId('camp-recruit')).toBeDisabled();
  await expect(page.getByTestId('camp-train')).toBeDisabled();
  await expect(page.getByTestId('nr-train-destination')).toHaveText(reason);
  await expect(page.getByTestId('nr-ability-flight')).toBeVisible();
  await shoot(page, 'recruit-locked-upgraded', (s) => campFits(page, `pact ${s.width}x${s.height}`, TRAIN_CONTROLS));
});

test('largest interface scale (160 %): selectors, hire and training stay in view without nested scrolling', async ({ page }) => {
  // The interface scale as if chosen in Settings earlier (Settings → Interface → 160 %).
  await usePrefs(page, { uiScale: 1.6 });
  for (const size of [{ width: 1366, height: 768 }, { width: 1920, height: 1080 }]) {
    await page.setViewportSize(size);
    const f = siteFixture({ name: `up-scale-${size.width}`, missionId: 'winter_oath_v2_m02', siteId: SITE, army: [['norse_draugr', 24], ['root_runner', 3], null, null, null, null, null], wallet: { gold: 3000 } });
    await importNamed(page, f);
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--ui-scale').trim())).toBe('1.6');
    await openCamp(page, f);
    await page.getByTestId('nr-form-upgraded').click();
    await settle(page, size);
    await campFits(page, `scale 160 % ${size.width}x${size.height}`, TRAIN_CONTROLS);
    const px = await page.getByTestId('nr-train-destination').evaluate((e) => parseFloat(getComputedStyle(e).fontSize));
    expect(px).toBeGreaterThanOrEqual(14);
    await page.screenshot({ path: `${OUT}/recruit-uiscale160-${size.width}x${size.height}.png`, animations: 'disabled' });
    await page.keyboard.press('Escape');
    await waitFor(page, (x) => !x.overlays.includes('camp'), 'camp closed');
  }
});

// ---------------------------------------------------------------------------
// Encyclopedia and unit page
// ---------------------------------------------------------------------------

test('encyclopedia: both forms of each of the six families with their portraits, statistics, habitat and hiring; the unit page selects either form', async ({ page }) => {
  await page.setViewportSize(SIZES[0]);
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await page.getByTestId('menu-encyclopedia').click();
  await page.getByTestId('codex-filter-neutral').click();
  for (const [b, u] of NEUTRAL_PAIRS) {
    const cb = page.getByTestId(`codex-${b}`);
    const cu = page.getByTestId(`codex-${u}`);
    await expect(cb).toContainText('Base form');
    await expect(cu).toContainText('Upgraded form');
    await expect(cu).toContainText(catalog.creatures[u]!.name);
    await expect(cb.locator('img')).toHaveAttribute('src', new RegExp(`campaign-v2/portrait-${b}\\.png$`));
    await expect(cu.locator('img')).toHaveAttribute('src', new RegExp(`battle-fx-neutral-upgrades-v1/portrait-${u}\\.png$`));
    await expect(cu).toContainText(String(catalog.creatures[u]!.stats!.attack));
    await expect(page.getByTestId(`codex-facts-${b}`)).toContainText('Habitat');
    await expect(page.getByTestId(`codex-facts-${b}`)).toContainText('Hiring');
    await expect(page.getByTestId(`codex-forms-${b}`)).toContainText(`train there into ${catalog.creatures[u]!.pluralName}`);
  }
  await page.getByTestId('codex-family-pegasus').scrollIntoViewIfNeeded();
  await shoot(
    page,
    'codex-neutral-upgrades',
    async () => {
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
    },
    'codex-pantheon-neutral',
  );
  // The upgrade's page by keyboard: focus its card and press Enter.
  await page.setViewportSize(SIZES[0]);
  await page.getByTestId('codex-dawncrest_pegasus').focus();
  await page.keyboard.press('Enter');
  await waitFor(page, (s) => s.screen === 'unit-detail', 'unit page');
  await expect(page.getByTestId('unit-name')).toHaveText('Dawncrest Pegasus');
  await expect(page.locator('[data-testid^="unit-form-"]')).toHaveCount(2);
  await expect(page.getByTestId('unit-form-pegasus')).toContainText('Base form');
  await expect(page.getByTestId('unit-form-dawncrest_pegasus')).toContainText('Upgraded form');
  await expect(page.getByTestId('unit-form-dawncrest_pegasus')).toHaveAttribute('aria-current', 'page');
  await expect(page.getByTestId('unit-habitat')).toContainText('High meadows');
  await expect(page.getByTestId('unit-hiring')).toContainText('The Silent Oracle (2 chapters)');
  await expect(page.getByTestId('unit-forms-note')).toContainText('Pegasi already in an army train there into Dawncrest Pegasi for 75 Gold each');
  await expect(page.getByTestId('unit-single-form')).toHaveCount(0);
  await expect(page.getByTestId('unit-stats')).toContainText('Site stock');
  await expect(page.locator('.unit-ability').filter({ hasText: 'Sheltering Wings' })).toContainText(catalog.abilities['neutral_sheltering_wings']!.exactRule);
  // The idle preview: the delivered (final) sprite set.
  await expect(page.getByTestId('viewer-sprite-status')).toHaveAttribute('data-status', 'final', { timeout: 60_000 });
  for (const anim of ['takeoff', 'fly', 'landing']) await expect(page.getByTestId(`anim-${anim}`)).toHaveAttribute('data-own', 'yes');
  await page.waitForTimeout(1500);
  await shoot(
    page,
    'unit-dawncrest_pegasus',
    async () => {
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
    },
    'unit-name',
  );
  // The base form from the selector (keyboard), and back to each upgrade in turn.
  await page.setViewportSize(SIZES[0]);
  await page.getByTestId('unit-form-pegasus').focus();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('unit-name')).toHaveText('Pegasus');
  for (const [b, u] of NEUTRAL_PAIRS.slice(1)) {
    await page.getByRole('button', { name: 'Back' }).first().click().catch(() => undefined);
    await waitFor(page, (s) => s.screen === 'encyclopedia', 'encyclopedia');
    await page.getByTestId(`codex-${u}`).click();
    await waitFor(page, (s) => s.screen === 'unit-detail', 'unit page');
    await expect(page.getByTestId('unit-name')).toHaveText(catalog.creatures[u]!.name);
    await expect(page.getByTestId(`unit-form-${b}`)).toBeVisible();
    await expect(page.getByTestId('viewer-sprite-status')).toHaveAttribute('data-status', 'final', { timeout: 60_000 });
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${OUT}/unit-${u}-1280x720.png`, animations: 'disabled' });
  }
});

// ---------------------------------------------------------------------------
// Battle: each base form beside its upgrade
// ---------------------------------------------------------------------------

interface StackShot {
  anchor: { col: number; row: number };
  x: number;
  y: number;
  mirrored: boolean;
  drawn: string | null;
  scale: number;
  lift: number;
}
const scene = (page: Page): Promise<Record<string, StackShot>> => page.evaluate(() => ((globalThis as unknown as { __prBattle: () => Record<string, StackShot> | null }).__prBattle() ?? {}));

/** Watch every frame: per stack and animation, every scale and ground point drawn (read-only). */
async function watch(page: Page): Promise<void> {
  await page.evaluate(() => {
    const w = globalThis as unknown as { __upTrace?: Record<string, { scales: number[]; xs: number[]; ys: number[] }>; __prBattle: () => Record<string, { drawn: string | null; x: number; y: number; scale: number; lift: number }> | null };
    if (w.__upTrace) return;
    const trace: Record<string, { scales: number[]; xs: number[]; ys: number[] }> = (w.__upTrace = {});
    const look = () => {
      for (const [id, v] of Object.entries(w.__prBattle() ?? {})) {
        if (!v.drawn) continue;
        const t = (trace[`${id}|${v.drawn}`] ??= { scales: [], xs: [], ys: [] });
        if (!t.scales.includes(v.scale)) t.scales.push(v.scale);
        const x = Math.round(v.x * 10) / 10;
        const y = Math.round((v.y - (v.lift ?? 0)) * 10) / 10;
        if (!t.xs.includes(x)) t.xs.push(x);
        if (!t.ys.includes(y)) t.ys.push(y);
      }
      requestAnimationFrame(look);
    };
    look();
  });
}

async function ready(page: Page): Promise<void> {
  await waitFor(page, (x) => x.screen === 'battle' && x.humanTurn && !x.busy && !!x.state.battle, 'the player’s turn', 120_000);
  await expect(page.getByTestId('battle-loading')).toBeHidden({ timeout: 60_000 });
}

for (const upgradedLeft of [true, false]) {
  test(`battle: each base form beside its upgrade (${upgradedLeft ? 'upgrades left' : 'upgrades right, mirrored'}), close crops, one scale per pose`, async ({ page }) => {
    const lineUp = pairLineUp(upgradedLeft, true);
    const fx = neutralBattle(`up-pairs-${upgradedLeft ? 'l' : 'r'}`, { climate: 'desert', ...lineUp });
    const vp = { width: 1366, height: 768 };
    await page.setViewportSize(vp);
    await usePrefs(page, { battleSpeed: '1' });
    await page.goto('/?e2e', { waitUntil: 'networkidle' });
    await importAndLoad(page, fx.file);
    await ready(page);
    await watch(page);
    await page.waitForTimeout(3000);
    const tag = upgradedLeft ? 'upleft' : 'upright';
    await page.screenshot({ path: `${OUT}/battle-pairs-${tag}-1366x768.png` });
    const sc = await scene(page);
    const rows: unknown[] = [];
    for (let i = 0; i < NEUTRAL_PAIRS.length; i++) {
      const [b, u] = NEUTRAL_PAIRS[i]!;
      const left = sc[fx.ids[`p${i}`]!]!;
      const right = sc[fx.ids[`e${i}`]!]!;
      expect(left.mirrored).toBe(false);
      expect(right.mirrored).toBe(true);
      // A close crop of the pair, nose to nose.
      const cx = (left.x + right.x) / 2;
      const top = Math.min(left.y, right.y) - 200;
      const clip = { x: Math.max(0, Math.round(cx - 210)), y: Math.max(0, Math.round(top)), width: 420, height: 240 };
      clip.width = Math.min(clip.width, vp.width - clip.x);
      clip.height = Math.min(clip.height, vp.height - clip.y);
      await page.screenshot({ path: `${OUT}/pair-${b}-${tag}.png`, clip });
      rows.push({ base: b, upgraded: u, left: upgradedLeft ? u : b, scaleLeft: left.scale, scaleRight: right.scale, leftAt: [left.x, left.y], rightAt: [right.x, right.y] });
    }
    writeFileSync(`${OUT}/battle-pairs-${tag}.json`, JSON.stringify(rows, null, 1));
    // The player's six strike their single twins in place (attack; the twin: hit, then death).
    for (let i = 0; i < NEUTRAL_PAIRS.length; i++) {
      const me = fx.ids[`p${i}`]!;
      const st = await waitFor(page, (x) => x.screen === 'battle' && x.humanTurn && !x.busy && x.state.battle?.activeStackId === me, `p${i} to act`, 120_000).catch(() => null);
      if (!st) break;
      const target = st.state.battle.stacks[fx.ids[`e${i}`]!];
      if (!target || target.totalHp <= 0) {
        await page.getByTestId('battle-defend').click();
        continue;
      }
      const proj = (c: { col: number; row: number }) => page.evaluate(([col, row]) => (globalThis as unknown as { __prProject: (k: string, a: number, b: number) => { x: number; y: number } | null }).__prProject('battle', col!, row!), [c.col, c.row]);
      const a = (await proj(target.anchor))!;
      const bpt = (await proj(st.state.battle.stacks[me].anchor))!;
      await page.mouse.move(a.x + (bpt.x - a.x) * 0.38, a.y + (bpt.y - a.y) * 0.38);
      await page.waitForTimeout(150);
      await page.mouse.down();
      await page.mouse.up();
      await waitFor(page, (x) => x.state.revision !== st.state.revision && !x.busy, 'the strike to play', 120_000);
      await page.screenshot({ path: `${OUT}/strike-${NEUTRAL_PAIRS[i]![upgradedLeft ? 1 : 0]}-${tag}.png` });
    }
    await page.waitForTimeout(2000);
    const trace = await page.evaluate(() => (globalThis as unknown as { __upTrace: Record<string, { scales: number[]; xs: number[]; ys: number[] }> }).__upTrace);
    // The six twins fell: the result screen lists the guards' losses by their own forms (names and portraits).
    const res = page.getByTestId('battle-result');
    await expect(res).toBeVisible({ timeout: 120_000 });
    for (const [b, u] of NEUTRAL_PAIRS) {
      const lost = catalog.creatures[upgradedLeft ? b : u]!;
      await expect(res).toContainText(lost.pluralName);
      await expect(res.locator(`img[alt="${lost.presentation.portraitAlt}"]`).first()).toBeVisible();
    }
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${OUT}/battle-result-${tag}-1366x768.png` });
    const report: Record<string, unknown> = {};
    for (const [key, t] of Object.entries(trace)) {
      const [sid, anim] = key.split('|');
      const k = Object.entries(fx.ids).find(([, v]) => v === sid)?.[0] ?? sid;
      const cid = fx.d.state.battle!.stacks[sid!]?.creatureId ?? '?';
      report[`${k}:${cid}:${anim}`] = t;
      if (cid === 'hoplite') continue;
      // One scale per animation (no size pulsing). The stack's ground point (x, y) per pose is recorded
      // in the report; per-frame foot contact is judged from the atlas regions (see the handoff report).
      expect(t.scales.length, `${cid} ${anim} scales ${t.scales.join(',')}`).toBe(1);
    }
    writeFileSync(`${OUT}/battle-trace-${tag}.json`, JSON.stringify(report, null, 1));
  });
}

test('battle: the Dawncrest Pegasus takes off, flies and lands on its ground point with one scale per phase', async ({ page }) => {
  const lineUp = pairLineUp(true);
  const fx = neutralBattle('up-flight', { climate: 'temperate', ...lineUp });
  await page.setViewportSize({ width: 1366, height: 768 });
  await usePrefs(page, { battleSpeed: '1' });
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await importAndLoad(page, fx.file);
  await ready(page);
  const peg = fx.ids['p0']!;
  expect(fx.d.state.battle!.stacks[peg]!.creatureId).toBe('dawncrest_pegasus');
  await page.evaluate((sid) => {
    const w = globalThis as unknown as { __flight: { drawn: string | null; scale: number; lift: number; x: number; y: number }[]; __prBattle: () => Record<string, { drawn: string | null; scale: number; lift: number; x: number; y: number }> };
    w.__flight = [];
    const t0 = performance.now();
    const look = () => {
      const v = w.__prBattle()[sid]!;
      w.__flight.push({ drawn: v.drawn, scale: v.scale, lift: v.lift, x: v.x, y: v.y });
      if (performance.now() - t0 < 200_000) requestAnimationFrame(look);
    };
    look();
  }, peg);
  await page.waitForTimeout(1500);
  const rest = (await scene(page))[peg]!;
  await page.screenshot({ path: `${OUT}/dawncrest-ground-1366x768.png` });
  const before = await inspect(page);
  const proj = (await page.evaluate(() => (globalThis as unknown as { __prProject: (k: string, a: number, b: number) => { x: number; y: number } | null }).__prProject('battle', 3, 2)))!;
  await page.mouse.move(proj.x, proj.y);
  await page.waitForTimeout(150);
  await page.mouse.down();
  await page.mouse.up();
  for (const phase of ['takeoff', 'fly', 'landing']) {
    // On screen now ('now'), or already played while an earlier photograph was taken ('past': the per-frame trace has it).
    const seen = await page.evaluate(
      ([sid, want]) =>
        new Promise<'now' | 'past' | 'never'>((done) => {
          const t0 = performance.now();
          const w = globalThis as unknown as { __flight: { drawn: string | null }[]; __prBattle: () => Record<string, { drawn: string | null }> };
          const look = () => {
            if (w.__prBattle()[sid as string]!.drawn === want) return done('now');
            if (w.__flight.some((f) => f.drawn === want)) return done('past');
            if (performance.now() - t0 > 120_000) return done('never');
            requestAnimationFrame(look);
          };
          look();
        }),
      [peg, phase] as const,
    );
    expect(seen, `the Dawncrest Pegasus plays ${phase}`).not.toBe('never');
    if (seen === 'now') await page.screenshot({ path: `${OUT}/dawncrest-${phase}-1366x768.png` });
  }
  await waitFor(page, (x) => x.state.revision !== before.state.revision && !x.busy, 'the flight to finish', 120_000);
  await expect.poll(async () => (await scene(page))[peg]!.drawn, { timeout: 60_000 }).toBe('idle');
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/dawncrest-landed-1366x768.png` });
  const trace = await page.evaluate(() => (globalThis as unknown as { __flight: { drawn: string | null; scale: number; lift: number }[] }).__flight);
  const scales = new Map<string, Set<number>>();
  for (const t of trace) if (t.drawn) scales.set(t.drawn, (scales.get(t.drawn) ?? new Set()).add(t.scale));
  for (const [name, set] of scales) expect([name, set.size]).toEqual([name, 1]);
  const fly = [...(scales.get('fly') ?? [])][0]!;
  // The flight atlas at its sourceScale relative to the core poses: delivered 0.65, calibrated in game
  // to 0.78 so the body keeps its ground-pose size (tools/assets/import_battle_fx_upgrades.py CALIBRATION).
  expect(fly / rest.scale).toBeCloseTo(0.78, 2);
  const last = (await scene(page))[peg]!;
  expect(Math.abs(last.lift)).toBe(0);
  expect(last.scale).toBe(rest.scale);
  writeFileSync(`${OUT}/dawncrest-flight-scales.json`, JSON.stringify(Object.fromEntries([...scales].map(([k, v]) => [k, [...v]]))));
});
