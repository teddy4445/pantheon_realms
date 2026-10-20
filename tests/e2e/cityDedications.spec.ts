import { mkdirSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { importAndLoad } from './fixtures';
import { inspect, waitFor } from './helpers';
import { usePrefs } from './momentFixtures';
import { FIRST_MINOR, PANTHEONS, PATRON, dedicationFixture, dwellingSlot, type DedicationFixture } from './dedicationFixtures';

/**
 * City dedications (CITY DEDICATIONS handoff §09, app 1.5.0) through the real screens:
 * the temple medallion and dedication pane (three illustrated rows) in all six pantheons,
 * the selection (actionable patron and committed gods apart from the locked "Future
 * choices"), the first dedication by keyboard and by pointer, a paid switch with its
 * confirmation and the pending change, a dormant town, a foreign-pantheon town, the
 * recruitment growth breakdown and a discounted recruit, the construction / training /
 * market saving lines, the weekly "City blessings" after End Day, the god commitment
 * screen's split, the encyclopedia's god page, and a legacy save showing none of it — at
 * 1280×720 and at the 160 % interface scale.
 *
 * Fixtures are ordinary saves imported with Load → Import (the ?e2e readout is read-only).
 * Screenshots: /home/claude/capture/city-dedications/.
 */

const OUT = '/home/claude/capture/city-dedications';
mkdirSync(OUT, { recursive: true });
const SMALL = { width: 1280, height: 720 };

function errorsOf(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  return errors;
}
const realErrors = (errors: string[]) => errors.filter((e) => !/favicon|Failed to load resource/i.test(e));

/** Let entrance transitions finish and pictures decode before a screenshot (software rendering is slow). */
async function settle(page: Page, ms = 500) {
  await page.evaluate(() => Promise.all(document.getAnimations().filter((a) => a.effect && 'target' in a.effect && a.playState === 'running' && (a.effect.getTiming().iterations ?? 1) !== Infinity).map((a) => a.finished.catch(() => undefined))));
  await page.waitForTimeout(ms);
}

async function shot(page: Page, name: string) {
  await settle(page);
  await page.screenshot({ path: `${OUT}/${name}.png` });
}

async function openGame(page: Page, f: DedicationFixture) {
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await importAndLoad(page, f.file);
  await waitFor(page, (s) => s.screen === 'adventure' && s.humanTurn && !s.busy && s.overlays.length === 0, 'adventure map', 60_000);
}

async function openTown(page: Page, f: DedicationFixture, townId = f.townId) {
  await openGame(page, f);
  await page.getByTestId(`town-tab-${townId}`).click();
  await waitFor(page, (s) => s.screen === 'town', 'town screen');
  await expect(page.getByTestId('town-scene')).toBeVisible();
}

/** The dialog's essential controls are inside the window (no nested scrolling needed to reach them). */
async function inWindow(page: Page, selectors: string[]) {
  const vp = page.viewportSize()!;
  for (const s of selectors) {
    const b = await page.locator(s).first().boundingBox();
    expect(b, s).not.toBeNull();
    expect(b!.x, s).toBeGreaterThanOrEqual(-0.5);
    expect(b!.y, s).toBeGreaterThanOrEqual(-0.5);
    expect(b!.x + b!.width, s).toBeLessThanOrEqual(vp.width + 0.5);
    expect(b!.y + b!.height, s).toBeLessThanOrEqual(vp.height + 0.5);
  }
}

/** No text of the dialog spills out of its box (long god names wrap). */
async function noOverflow(page: Page, root: string) {
  const over = await page.locator(root).evaluate((el) =>
    [...el.querySelectorAll<HTMLElement>('.ded-pane__name, .ded-card__name, .ded-row__title, .ded-future__name, .ded-card__go, .ded-mini__item')]
      .filter((e) => e.scrollWidth > e.clientWidth + 1)
      .map((e) => e.textContent),
  );
  expect(over).toEqual([]);
}

/** The medallion keeps clear of the temple's entrance (the bottom-centre of its picture) and of other buildings' plots. */
async function medallionPlacement(page: Page) {
  const r = await page.evaluate(() => {
    const m = document.querySelector('[data-testid="ded-medallion"]')!.getBoundingClientRect();
    const t = document.querySelector('[data-testid="slot-pantheon_temple"]')!.getBoundingClientRect();
    const plots = [...document.querySelectorAll('.town-slot.is-empty .town-slot__plot')].map((e) => e.getBoundingClientRect());
    const hud = document.querySelector('[data-testid="town-economy"]')!.getBoundingClientRect();
    return { m: { x: m.x, y: m.y, w: m.width, h: m.height }, t: { x: t.x, y: t.y, w: t.width, h: t.height }, plots: plots.map((p) => ({ x: p.x, y: p.y, w: p.width, h: p.height })), hud: { x: hud.x, y: hud.y, w: hud.width, h: hud.height } };
  });
  const cx = r.m.x + r.m.w / 2;
  // Entrance: the middle third of the temple picture's lower half.
  const entrance = { x0: r.t.x + r.t.w / 3, x1: r.t.x + (2 * r.t.w) / 3, y0: r.t.y + r.t.h / 2, y1: r.t.y + r.t.h };
  expect(cx < entrance.x0 || cx > entrance.x1, 'medallion clear of the entrance').toBe(true);
  const hit = (a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
  for (const p of r.plots) expect(hit(r.m, p), 'medallion clear of an empty plot').toBe(false);
  expect(hit(r.m, r.hud), 'medallion clear of the economy bar').toBe(false);
}

// ---------------------------------------------------------------------------
// A. Town / Temple and B. selection, all six pantheons
// ---------------------------------------------------------------------------

for (const p of PANTHEONS) {
  test(`${p}: temple medallion, the dedication pane's three rows and the selection (1280×720)`, async ({ page }) => {
    test.setTimeout(240_000);
    await page.setViewportSize(SMALL);
    await usePrefs(page, {});
    const errors = errorsOf(page);
    const minor = FIRST_MINOR[p]!;
    const f = dedicationFixture(`pane ${p}`, { pantheon: p, minors: [minor], dedicate: minor, day: 3 });
    await openTown(page, f);
    const medal = page.getByTestId('ded-medallion');
    await expect(medal).toBeVisible();
    await expect(medal).toHaveAttribute('data-state', 'active');
    await expect(medal).toHaveAttribute('aria-label', new RegExp(`City dedication: ${f.catalog.gods[minor]!.name} — Active`));
    await medallionPlacement(page);
    await shot(page, `town-${p}-medallion`);
    await medal.click();
    const pane = page.getByTestId('dedication');
    await expect(pane).toBeVisible();
    await expect(page.getByTestId('ded-god-name')).toHaveText(f.catalog.gods[minor]!.name);
    await expect(page.getByTestId('ded-state')).toContainText('Active');
    const rows = page.getByTestId('ded-rows');
    await expect(rows.getByTestId('ded-row-resource')).toContainText('each week');
    await expect(rows.getByTestId('ded-row-resource')).toContainText('Next gift on day 8');
    await expect(rows.getByTestId('ded-row-growth')).toBeVisible();
    await expect(rows.getByTestId('ded-row-service')).toContainText(f.catalog.cityServiceRules![f.catalog.cityDedicationProfiles![minor]!.serviceId]!.name);
    // Pictures: the resource icon, the favored creature's portrait, the town building.
    await expect(rows.locator('.ded-pic--res svg, .ded-pic--res img')).toHaveCount(1);
    await expect(rows.locator('.ded-pic--creature img')).toHaveCount(1);
    await expect(rows.locator('.ded-pic--building img')).toHaveCount(1);
    expect(await rows.innerText()).not.toMatch(/quarter|credit/i);
    await noOverflow(page, '[data-testid="dedication"]');
    await inWindow(page, ['[data-testid="ded-close"]', '[data-testid="ded-open-choices"]', '[data-testid="ded-row-service"]']);
    await shot(page, `temple-pane-${p}`);
    // Selection: the patron and the committed god are actionable; the rest are locked future choices.
    await page.getByTestId('ded-open-choices').click();
    await expect(page.getByTestId('ded-choose')).toBeVisible();
    await expect(page.getByTestId(`ded-choice-${PATRON[p]}`)).toBeVisible();
    await expect(page.getByTestId(`ded-choice-${minor}`)).toContainText('Honored here');
    await expect(page.getByTestId(`ded-choose-${minor}`)).toBeDisabled();
    await expect(page.getByTestId(`ded-choose-${PATRON[p]}`)).toBeEnabled();
    const future = page.getByTestId('ded-future');
    await expect(future).toContainText('Future choices');
    const locked = f.catalog.pantheons[p]!.godIds.filter((g) => g !== PATRON[p] && g !== minor);
    await expect(future.locator('.ded-future__item')).toHaveCount(locked.length);
    for (const g of locked) await expect(page.getByTestId(`ded-future-${g}`).locator('.ded-future__reason')).not.toBeEmpty();
    await expect(page.locator('[data-testid^="ded-choose-"]')).toHaveCount(2);
    await noOverflow(page, '[data-testid="dedication"]');
    await inWindow(page, [`[data-testid="ded-choose-${PATRON[p]}"]`, '[data-testid="ded-close"]']);
    await shot(page, `selection-${p}`);
    expect(realErrors(errors)).toEqual([]);
  });
}

for (const p of PANTHEONS) {
  test(`${p}: pane and selection at the 160 % interface scale (1280×720) keep their controls in view`, async ({ page }) => {
    test.setTimeout(200_000);
    await page.setViewportSize(SMALL);
    await usePrefs(page, { uiScale: 1.6 });
    const errors = errorsOf(page);
    const minor = FIRST_MINOR[p]!;
    const f = dedicationFixture(`pane160 ${p}`, { pantheon: p, minors: [minor], dedicate: minor, day: 3 });
    await openTown(page, f);
    // At this scale the economy bar reaches over the temple: the medallion steps below it and stays reachable.
    await settle(page);
    await medallionPlacement(page);
    await shot(page, `town-${p}-medallion-160`);
    await page.getByTestId('ded-medallion').click();
    await expect(page.getByTestId('ded-rows')).toBeVisible();
    await noOverflow(page, '[data-testid="dedication"]');
    await inWindow(page, ['[data-testid="ded-close"]', '[data-testid="ded-open-choices"]', '[data-testid="ded-row-service"]']);
    await shot(page, `temple-pane-${p}-160`);
    await page.getByTestId('ded-open-choices').click();
    await expect(page.getByTestId('ded-future')).toBeVisible();
    await noOverflow(page, '[data-testid="dedication"]');
    await inWindow(page, [`[data-testid="ded-choose-${PATRON[p]}"]`, `[data-testid="ded-choose-${minor}"]`, '[data-testid="ded-close"]']);
    expect(realErrors(errors)).toEqual([]);
  });
}

// ---------------------------------------------------------------------------
// B. First dedication by keyboard and by pointer; a paid switch with its confirmation
// ---------------------------------------------------------------------------

test('first dedication by keyboard: medallion → pane → choose → confirm, free, services at once, gifts from day 8', async ({ page }) => {
  test.setTimeout(180_000);
  await page.setViewportSize(SMALL);
  await usePrefs(page, {});
  const errors = errorsOf(page);
  const f = dedicationFixture('first keyboard', { pantheon: 'greek', minors: ['athena'], day: 3, buildings: { training_academy: 1 } });
  await openTown(page, f);
  const medal = page.getByTestId('ded-medallion');
  await expect(medal).toHaveAttribute('data-state', 'none');
  await expect(medal).toHaveAttribute('aria-label', 'City dedication: choose a god for this city');
  // Keyboard only: focus the medallion (visible focus ring), Enter opens the pane in its selection.
  await medal.focus();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Shift+Tab');
  await expect(medal).toBeFocused();
  const ring = await medal.locator('.ded-medal__face').evaluate((e) => getComputedStyle(e).outlineStyle);
  expect(ring).not.toBe('none');
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('ded-choose')).toBeVisible();
  await expect(page.getByTestId('ded-choose')).toContainText('The first dedication is free');
  // Tab to "Dedicate to Athena" and press Enter.
  for (let i = 0; i < 12; i++) {
    if (await page.getByTestId('ded-choose-athena').evaluate((e) => e === document.activeElement)) break;
    await page.keyboard.press('Tab');
  }
  await expect(page.getByTestId('ded-choose-athena')).toBeFocused();
  await page.keyboard.press('Enter');
  const confirm = page.getByTestId('confirm');
  await expect(confirm).toBeVisible();
  await expect(confirm).toContainText('Free.');
  await expect(confirm).toContainText('day 8');
  await expect(confirm.getByTestId('ded-confirm-terms')).toContainText('+3 Stone each week');
  const gold0 = (await inspect(page)).state.players.player.wallet.gold;
  await expect(page.getByTestId('confirm-cancel')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByTestId('confirm-ok')).toBeFocused();
  await page.keyboard.press('Enter');
  const s = await waitFor(page, (x) => x.state.towns[f.townId].dedication?.activeGodId === 'athena', 'Athena honored');
  expect(s.state.players.player.wallet.gold).toBe(gold0);
  expect(s.state.players.player.wallet.stone).toBe(f.state.players.player!.wallet.stone);
  // The pane now shows the god, its three rows; the academy's discount works at once.
  await expect(page.getByTestId('ded-god-name')).toHaveText('Athena');
  await expect(page.getByTestId('ded-row-service')).toContainText('Works in this city now');
  await expect(page.getByTestId('ded-row-resource')).toContainText('Next gift on day 8');
  await expect(medal).toHaveAttribute('data-state', 'active');
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('dedication')).toHaveCount(0);
  expect(realErrors(errors)).toEqual([]);
});

test('first dedication by pointer (Norse), then a paid switch: exact cost, both gods’ benefits, activation day, no cancel, no refund; pending shown', async ({ page }) => {
  test.setTimeout(200_000);
  await page.setViewportSize(SMALL);
  await usePrefs(page, {});
  const errors = errorsOf(page);
  const f = dedicationFixture('pointer switch', { pantheon: 'norse', minors: ['norse_tyr'], day: 3 });
  await openTown(page, f);
  await page.getByTestId('ded-medallion').click();
  await page.getByTestId('ded-choose-norse_odin').click();
  await expect(page.getByTestId('confirm')).toContainText('Dedicate');
  await shot(page, 'first-dedication-confirm');
  await page.getByTestId('confirm-ok').click();
  await waitFor(page, (x) => x.state.towns[f.townId].dedication?.activeGodId === 'norse_odin', 'Odin honored');
  // The seal pulse on the medallion (motion allowed here).
  await expect(page.getByTestId('ded-medallion')).toHaveClass(/is-sealed/);
  // Switch to Tyr: 500 Gold at the next week boundary.
  await expect(page.getByTestId('ded-open-choices')).toContainText('500 Gold');
  await page.getByTestId('ded-open-choices').click();
  await page.getByTestId('ded-choose-norse_tyr').click();
  const confirm = page.getByTestId('confirm');
  await expect(confirm).toContainText('Costs 500 Gold now');
  await expect(confirm).toContainText('day 8');
  await expect(confirm).toContainText('cannot be cancelled');
  await expect(confirm).toContainText('not refunded');
  await expect(confirm.getByTestId('ded-terms-norse_odin')).toBeVisible();
  await expect(confirm.getByTestId('ded-terms-norse_tyr')).toBeVisible();
  await inWindow(page, ['[data-testid="confirm-ok"]', '[data-testid="confirm-cancel"]']);
  await shot(page, 'switch-confirmation');
  const gold0 = (await inspect(page)).state.players.player.wallet.gold;
  await page.getByTestId('confirm-ok').click();
  const s = await waitFor(page, (x) => !!x.state.towns[f.townId].dedication?.pending, 'switch scheduled');
  expect(s.state.players.player.wallet.gold).toBe(gold0 - 500);
  expect(s.state.towns[f.townId].dedication.activeGodId).toBe('norse_odin');
  await expect(page.getByTestId('ded-pending')).toContainText('Tyr takes over on day 8');
  await expect(page.getByTestId('ded-pending')).toContainText('cannot be cancelled');
  await expect(page.getByTestId('ded-state')).toContainText('Change scheduled');
  await expect(page.getByTestId('ded-open-choices')).toBeDisabled();
  await shot(page, 'pending-switch');
  await page.getByTestId('ded-close').click();
  await expect(page.getByTestId('ded-medallion')).toHaveAttribute('data-state', 'pending');
  expect(realErrors(errors)).toEqual([]);
});

test('reduced motion: the dedication is sealed without the pulse', async ({ page }) => {
  await page.setViewportSize(SMALL);
  await usePrefs(page, { motion: 'reduced' });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const f = dedicationFixture('reduced', { pantheon: 'celtic', day: 3 });
  await openTown(page, f);
  await page.getByTestId('ded-medallion').click();
  await page.getByTestId('ded-choose-celtic_dagda').click();
  await page.getByTestId('confirm-ok').click();
  await waitFor(page, (x) => x.state.towns[f.townId].dedication?.activeGodId === 'celtic_dagda', 'Dagda honored');
  await expect(page.getByTestId('ded-god-name')).toHaveText('Dagda');
  await expect(page.locator('.ded-seal__stamp')).toHaveCount(0);
  await expect(page.getByTestId('ded-medallion')).not.toHaveClass(/is-sealed/);
});

// ---------------------------------------------------------------------------
// Dormant and foreign towns
// ---------------------------------------------------------------------------

test('a dormant town (Temple II lost): the medallion and pane say dormant and why; no Temple II blocks a new choice', async ({ page }) => {
  await page.setViewportSize(SMALL);
  await usePrefs(page, {});
  const f = dedicationFixture('dormant', { pantheon: 'greek', dedicate: 'zeus', templeAfter: 1, day: 3 });
  await openTown(page, f);
  const medal = page.getByTestId('ded-medallion');
  await expect(medal).toHaveAttribute('data-state', 'dormant');
  await expect(medal).toHaveAttribute('aria-label', /Dormant \(Needs Temple level II\)/);
  await medal.click();
  await expect(page.getByTestId('ded-state')).toContainText('Dormant');
  await expect(page.getByTestId('ded-dormant')).toContainText('Needs Temple level II');
  for (const k of ['resource', 'growth', 'service']) await expect(page.getByTestId(`ded-row-${k}`).locator('.ded-status.is-missing')).toContainText('Temple level II');
  await expect(page.getByTestId('ded-open-choices')).toBeDisabled();
  await shot(page, 'dormant-town');
});

test('a foreign-pantheon town explains why it cannot be dedicated', async ({ page }) => {
  await page.setViewportSize(SMALL);
  await usePrefs(page, {});
  const f = dedicationFixture('foreign', { pantheon: 'greek', minors: ['athena'], foreignTown: true, day: 3 });
  await openTown(page, f, f.foreignTownId!);
  const medal = page.getByTestId('ded-medallion');
  await expect(medal).toHaveAttribute('aria-label', /Norse town cannot honor gods of your pantheon/);
  await medal.click();
  await expect(page.getByTestId('ded-blocked')).toContainText('A Norse town cannot honor gods of your pantheon');
  await expect(page.getByTestId('ded-blocked')).toContainText('keep their buildings, income and recruits');
  await expect(page.getByTestId('ded-open-choices')).toBeDisabled();
  await shot(page, 'foreign-town');
});

// ---------------------------------------------------------------------------
// D. Recruitment: growth breakdown, the god on the favored family, a discounted recruit
// ---------------------------------------------------------------------------

test('recruitment: the growth breakdown with the local god increment, the god on the favored family, normal and final price; recruit all at the same price', async ({ page }) => {
  test.setTimeout(200_000);
  await page.setViewportSize(SMALL);
  await usePrefs(page, {});
  const errors = errorsOf(page);
  const pre = dedicationFixture('recruit pre', { pantheon: 'greek' });
  const t1 = dwellingSlot(pre, 'hoplite');
  const f = dedicationFixture('recruit', { pantheon: 'greek', minors: ['athena', 'demeter'], dedicate: 'demeter', day: 3, buildings: { [t1]: 2 }, population: { hoplite: 14 } });
  await openTown(page, f);
  await page.getByTestId('town-recruit').click();
  await waitFor(page, (s) => s.screen === 'recruitment', 'recruitment');
  await page.getByTestId('recruit-tier-1').click();
  await expect(page.getByTestId('recruit-tier-god-1')).toBeVisible();
  await expect(page.getByTestId('recruit-tier-1')).toHaveAttribute('aria-description', /Demeter favors the Hoplites here: \+2 each week/);
  await expect(page.getByTestId('recruit-favor')).toHaveAttribute('title', 'Demeter favors the Hoplites here: +2 each week');
  await expect(page.getByTestId('recruit-favor')).toContainText('+ 2 Demeter =');
  await expect(page.getByTestId('recruit-growth')).toHaveAttribute('aria-label', /base .*\+ 2 Demeter = \d+ next week/);
  // The discounted per-unit price (ceil(normal × 95 %)) and the normal price beside it.
  const creatureId = (await page.locator('.rr-medal.is-selected').getAttribute('data-testid'))!.replace('recruit-', '');
  const normal = (f.catalog.creatures[creatureId]!.cost as Record<string, number>).gold!;
  const unit = Math.ceil((normal * 95) / 100);
  await expect(page.getByTestId('recruit-normal-price')).toContainText(`normally ${normal.toLocaleString('en-US')} Gold`);
  await expect(page.getByTestId('recruit-favor')).toContainText(`saves ${normal - unit} Gold each`);
  await expect(page.getByTestId('recruit-confirm')).toHaveAttribute('title', /Demeter’s patronage — saves \d+ Gold/);
  await expect(page.getByTestId('recruit-all-saving')).toBeVisible();
  // No new combat badge on the creature.
  expect(await page.locator('.rr-stats-wrap').innerText()).not.toContain('Demeter');
  const fit = await page.evaluate(() => {
    const el = document.querySelector('.rr-detail') as HTMLElement;
    return el.scrollHeight - el.clientHeight;
  });
  expect(fit).toBeLessThanOrEqual(1);
  await shot(page, 'recruitment-favored');
  // Recruit 10: exactly 10 × the discounted unit price.
  for (let i = 0; i < 9; i++) await page.locator('.recruit-detail').getByRole('button', { name: /Increase/ }).click();
  const before = await inspect(page);
  await page.getByTestId('recruit-confirm').click();
  const after = await waitFor(page, (s) => s.state.revision > before.state.revision, 'recruited');
  expect(before.state.players.player.wallet.gold - after.state.players.player.wallet.gold).toBe(unit * 10);
  expect(realErrors(errors)).toEqual([]);
});

// ---------------------------------------------------------------------------
// E. Service savings in the existing quote panels
// ---------------------------------------------------------------------------

// One save per test: imported saves share the browser's storage within a test.
test('services: construction list shows Zeus’ fortification saving with the normal and final price', async ({ page }) => {
  test.setTimeout(200_000);
  await page.setViewportSize(SMALL);
  await usePrefs(page, {});
  const errors = errorsOf(page);
  const fz = dedicationFixture('svc zeus', { pantheon: 'greek', dedicate: 'zeus', day: 3 });
  await openTown(page, fz);
  await page.getByTestId('town-construction').click();
  const row = page.getByTestId('construction-saving-fortifications');
  await expect(row).toContainText('Zeus’ patronage — saves 250 Gold');
  await expect(row).toContainText('normally 2,500 Gold, now 2,250');
  await page.getByTestId('construction-fortifications').scrollIntoViewIfNeeded();
  await shot(page, 'service-saving-construction');
  await page.keyboard.press('Escape');
  expect(realErrors(errors)).toEqual([]);
});

test('services: hero training costs 800 instead of 1,000 Gold with Athena; the charge is the quoted price', async ({ page }) => {
  test.setTimeout(200_000);
  await page.setViewportSize(SMALL);
  await usePrefs(page, {});
  const errors = errorsOf(page);
  const fa = dedicationFixture('svc athena', { pantheon: 'greek', minors: ['athena'], dedicate: 'athena', day: 3, buildings: { training_academy: 1 } });
  await openTown(page, fa);
  await page.getByTestId('slot-training_academy').click();
  await expect(page.getByTestId('training-saving')).toContainText('Athena’s patronage — saves 200 Gold');
  await expect(page.getByTestId('building-popup')).toContainText('800 Gold for 500 experience');
  await shot(page, 'service-saving-training');
  const g0 = (await inspect(page)).state.players.player.wallet.gold;
  await page.getByTestId(`train-${fa.heroId}`).click();
  const s1 = await waitFor(page, (x) => x.state.players.player.wallet.gold < g0, 'trained');
  expect(g0 - s1.state.players.player.wallet.gold).toBe(800);
  expect(realErrors(errors)).toEqual([]);
});

test('services: market purchases with Hermes (500 → 450 Gold per Wood), selling unchanged', async ({ page }) => {
  test.setTimeout(200_000);
  await page.setViewportSize(SMALL);
  await usePrefs(page, {});
  const errors = errorsOf(page);
  const fh = dedicationFixture('svc hermes', { pantheon: 'greek', minors: ['athena', 'hermes'], dedicate: 'hermes', day: 3, buildings: { marketplace: 1 } });
  await openTown(page, fh);
  await page.getByTestId('town-market').click();
  await page.getByTestId('market-buy').click();
  await expect(page.getByTestId('market-rate')).toContainText('450 Gold');
  await expect(page.getByTestId('market-rate')).toContainText('normally 500');
  await expect(page.getByTestId('market-saving')).toContainText('Hermes’ patronage — saves 50 Gold');
  await shot(page, 'service-saving-market');
  await page.getByTestId('market-sell').click();
  await expect(page.getByTestId('market-saving')).toHaveCount(0);
  expect(realErrors(errors)).toEqual([]);
});

// ---------------------------------------------------------------------------
// F. Weekly summary after End Day
// ---------------------------------------------------------------------------

test('weekly summary after End Day: one grouped City blessings section with the gift, the new stock and the pool', async ({ page }) => {
  test.setTimeout(300_000);
  await page.setViewportSize(SMALL);
  await usePrefs(page, {});
  const errors = errorsOf(page);
  const f = dedicationFixture('weekly', { pantheon: 'greek', minors: ['athena'], dedicate: 'athena', day: 7 });
  await openGame(page, f);
  const stone0 = (await inspect(page)).state.players.player.wallet.stone;
  await page.getByTestId('end-day').click();
  await page.waitForTimeout(300);
  if ((await inspect(page)).overlays.includes('confirm')) await page.getByTestId('confirm-ok').click();
  const s = await waitFor(page, (x) => x.screen === 'adventure' && x.humanTurn && x.state.day === 8 && !x.busy, 'day 8', 180_000);
  // The new-week banner passes by itself (it never blocks play).
  await waitFor(page, (x) => x.moments.length === 0, 'new-week banner gone', 30_000);
  const section = page.getByTestId('city-blessings');
  await expect(section).toBeVisible({ timeout: 20_000 });
  await expect(section).toContainText('City blessings · week 2');
  const line = page.getByTestId(`city-blessing-${f.townId}`);
  await expect(line).toHaveAttribute('aria-label', /\+3 Stone/);
  await expect(line).toHaveAttribute('aria-label', /\+2 Hoplites \(now \d+ in the pool\)/);
  await expect(line.locator('.portrait').first()).toBeVisible();
  expect(s.state.players.player.wallet.stone).toBeGreaterThanOrEqual(stone0 + 3);
  // Only one section (no popup per city); closing it pays nothing.
  await expect(page.getByTestId('city-blessings')).toHaveCount(1);
  expect((await inspect(page)).overlays).toEqual([]);
  await shot(page, 'weekly-summary');
  const wallet = JSON.stringify((await inspect(page)).state.players.player.wallet);
  await page.getByTestId('rival-summary-close').click();
  await expect(section).toHaveCount(0);
  expect(JSON.stringify((await inspect(page)).state.players.player.wallet)).toBe(wallet);
  expect(realErrors(errors)).toEqual([]);
});

// ---------------------------------------------------------------------------
// C. God commitment screen
// ---------------------------------------------------------------------------

test('Pantheon: empire blessing apart from the city dedication; cities that could switch; committing never rededicates a town', async ({ page }) => {
  test.setTimeout(200_000);
  await page.setViewportSize(SMALL);
  await usePrefs(page, {});
  const errors = errorsOf(page);
  const f = dedicationFixture('pantheon', { pantheon: 'greek', minors: ['athena'], dedicate: 'athena', day: 3 });
  await openTown(page, f);
  await page.getByTestId('town-gods').click();
  await waitFor(page, (s) => s.screen === 'pantheon', 'pantheon screen');
  const athena = page.getByTestId('god-split-athena');
  await expect(athena).toContainText('Empire blessing');
  await expect(athena).toContainText('Available city dedication');
  await expect(athena).toContainText('Needs Temple II · chosen per city');
  await expect(page.getByTestId(`god-cities-athena-${f.townId}`)).toContainText('Honors Athena now');
  await expect(page.getByTestId(`god-cities-zeus-${f.townId}`)).toContainText('Could switch from Athena for 500 Gold');
  await expect(page.getByTestId(`god-cities-zeus-${f.townId}`)).toContainText('after building');
  // Demeter keeps no empire-wide blessing with city dedications.
  await expect(page.getByTestId('god-blessing-cities-demeter')).toContainText('their blessing now comes through city dedications');
  await expect(page.getByTestId('god-hermes')).toContainText('+15% land movement');
  await shot(page, 'pantheon-screen');
  // Commit to Demeter: the dialog shows the city dedication and the cities, and says no city changes god.
  await page.getByTestId('god-demeter').getByRole('button', { name: 'Commit' }).click();
  const preview = page.getByTestId('god-commit-preview');
  await expect(preview).toBeVisible();
  await expect(preview.getByTestId('god-commit-city')).toContainText('Committing changes no city’s god');
  await expect(preview.getByTestId(`god-commit-cities-${f.townId}`)).toContainText('after you commit to Demeter');
  await shot(page, 'pantheon-commit-dialog');
  await page.getByTestId('confirm-ok').click();
  const s = await waitFor(page, (x) => x.state.players.player.pantheon.minorGodIds.includes('demeter'), 'Demeter committed');
  expect(s.state.towns[f.townId].dedication.activeGodId).toBe('athena');
  expect(s.state.towns[f.townId].dedication.pending).toBeUndefined();
  await expect(page.getByTestId(`god-cities-demeter-${f.townId}`)).toContainText('Could switch from Athena');
  expect(realErrors(errors)).toEqual([]);
});

// ---------------------------------------------------------------------------
// G. Encyclopedia
// ---------------------------------------------------------------------------

test('Encyclopedia: in a city-dedication game the god page shows both parts; outside a game the classic text plus the city profile “in new games”; a favored family names its gods', async ({ page }) => {
  test.setTimeout(200_000);
  await page.setViewportSize(SMALL);
  await usePrefs(page, {});
  const errors = errorsOf(page);
  // Outside a game.
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await page.getByTestId('menu-encyclopedia').click();
  await page.getByRole('tab', { name: 'Gods' }).click();
  await page.getByTestId('codex-filter-greek').click();
  const demeter = page.getByTestId('codex-god-demeter');
  await expect(demeter.getByTestId('codex-god-city-demeter')).toContainText('City dedication');
  await expect(demeter).toContainText(f0Demeter());
  await demeter.scrollIntoViewIfNeeded();
  await shot(page, 'encyclopedia-outside');
  await page.getByRole('tab', { name: 'Bestiary' }).click();
  await expect(page.getByTestId('codex-favored-hoplite')).toContainText('Athena');
  await expect(page.getByTestId('codex-favored-hoplite')).toContainText('Demeter');
  await expect(page.getByTestId('codex-favored-hoplite').locator('.codex-favored__god')).toHaveText(['Athena+2 each week', 'Demeter+2 each week']);
  await expect(page.getByTestId('codex-favored-hoplite')).not.toContainText(/locked|requires/i);
  // In a game with city dedications.
  const f = dedicationFixture('codex', { pantheon: 'greek', day: 3 });
  await openGame(page, f);
  await page.getByRole('button', { name: 'Bestiary' }).click();
  await waitFor(page, (s) => s.screen === 'encyclopedia', 'encyclopedia');
  await page.getByRole('tab', { name: 'Gods' }).click();
  await page.getByTestId('codex-filter-greek').click();
  const card = page.getByTestId('codex-god-demeter');
  await expect(card.getByTestId('god-split-demeter')).toContainText('Available city dedication');
  await expect(card.getByTestId('god-blessing-cities-demeter')).toBeVisible();
  await expect(card.getByTestId('ded-profile-demeter')).toContainText('+4 Wood each week');
  await card.scrollIntoViewIfNeeded();
  await shot(page, 'encyclopedia-god-page');
  expect(realErrors(errors)).toEqual([]);
});

/** Demeter's authored first blessing sentence (the classic text outside a game). */
function f0Demeter(): string {
  const f = dedicationFixture('codex-ref', { pantheon: 'greek' });
  return f.catalog.gods['demeter']!.benefitSummary[0]!;
}

// ---------------------------------------------------------------------------
// Legacy save: none of it
// ---------------------------------------------------------------------------

test('a legacy save (no city-dedication flag) shows none of it: no medallion, no weekly gift, no pane, classic god cards, no favored family', async ({ page }) => {
  test.setTimeout(200_000);
  await page.setViewportSize(SMALL);
  await usePrefs(page, {});
  const errors = errorsOf(page);
  const pre = dedicationFixture('legacy pre', { pantheon: 'greek' });
  const f = dedicationFixture('legacy', { pantheon: 'greek', minors: ['athena'], legacy: true, day: 3, buildings: { [dwellingSlot(pre, 'hoplite')]: 2 } });
  await openTown(page, f);
  await expect(page.getByTestId('ded-medallion')).toHaveCount(0);
  await expect(page.getByTestId('town-weekly-gift')).toHaveCount(0);
  await page.getByTestId('slot-pantheon_temple').click();
  await expect(page.getByTestId('building-popup')).toBeVisible();
  await expect(page.getByTestId('popup-dedication')).toHaveCount(0);
  await expect(page.getByTestId('temple-dedication-line')).toHaveCount(0);
  await page.getByTestId('building-popup').getByRole('button', { name: 'Pantheon & gods' }).click();
  await waitFor(page, (s) => s.screen === 'pantheon', 'pantheon screen');
  await expect(page.locator('[data-testid^="god-split-"]')).toHaveCount(0);
  await expect(page.locator('[data-testid^="god-blessing-cities-"]')).toHaveCount(0);
  // Demeter's card keeps its classic blessing.
  await expect(page.getByTestId('god-benefits-demeter')).toBeVisible();
  await page.keyboard.press('Escape');
  await waitFor(page, (s) => s.screen === 'town', 'town');
  await page.getByTestId('town-recruit').click();
  await waitFor(page, (s) => s.screen === 'recruitment', 'recruitment');
  await expect(page.getByTestId('recruit-favor')).toHaveCount(0);
  await expect(page.locator('[data-testid^="recruit-tier-god-"]')).toHaveCount(0);
  await expect(page.getByTestId('recruit-saving')).toHaveCount(0);
  await shot(page, 'legacy-recruitment');
  expect(realErrors(errors)).toEqual([]);
});

// ---------------------------------------------------------------------------
// 160 % interface scale at 1280×720
// ---------------------------------------------------------------------------

test('160 % interface scale (1280×720): pane, selection and switch confirmation keep their controls in view; long names fit', async ({ page }) => {
  test.setTimeout(200_000);
  await page.setViewportSize(SMALL);
  await usePrefs(page, { uiScale: 1.6 });
  const errors = errorsOf(page);
  const f = dedicationFixture('scale', { pantheon: 'mesoamerican', minors: ['mesoamerican_huitzilopochtli', 'mesoamerican_mictlantecuhtli'], dedicate: 'mesoamerican_huitzilopochtli', day: 3 });
  await openTown(page, f);
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--ui-scale').trim())).toBe('1.6');
  await page.getByTestId('ded-medallion').click();
  await noOverflow(page, '[data-testid="dedication"]');
  await inWindow(page, ['[data-testid="ded-open-choices"]', '[data-testid="ded-close"]', '[data-testid="ded-row-service"]']);
  await shot(page, 'scale160-pane');
  await page.getByTestId('ded-open-choices').click();
  await noOverflow(page, '[data-testid="dedication"]');
  await inWindow(page, ['[data-testid="ded-choose-mesoamerican_mictlantecuhtli"]', '[data-testid="ded-close"]']);
  await shot(page, 'scale160-selection');
  await page.getByTestId('ded-choose-mesoamerican_mictlantecuhtli').click();
  await expect(page.getByTestId('confirm')).toContainText('Costs 500 Gold now');
  await inWindow(page, ['[data-testid="confirm-ok"]', '[data-testid="confirm-cancel"]']);
  await shot(page, 'scale160-switch-confirmation');
  await page.getByTestId('confirm-cancel').click();
  expect(realErrors(errors)).toEqual([]);
});
