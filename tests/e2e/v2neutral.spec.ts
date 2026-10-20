import { mkdirSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { loadCatalog } from '@pr/content';
import { clickHex, inspect, waitFor } from './helpers';
import { siteFixture, type SiteFixture } from './v2neutralFixtures';

/**
 * Campaign expansion screens (2026-10-15) through the real interface: neutral
 * recruitment at a hiring site (screen spec `neutral-recruit`: the kit portrait
 * over the neutral background, exact stats and ability rule, shared stock and
 * price, the seven slots and destination, Recruit and Recruit all affordable,
 * and the locked-pact, empty-stock, full-army and insufficient-resource
 * states), an ordinary creature camp, the story choice (`choice`: costs and
 * consequences, affordable, unaffordable, needs evidence, decided once, repeat
 * visit) and the encyclopedia / unit page of an expansion neutral
 * (`unit-details`; base + upgrade since the neutral upgrades of 2026-10-15 —
 * their own states are in v2upgrades.spec.ts). Fixtures are ordinary saves imported with Load → Import (no
 * privileged hooks; the ?e2e readouts are read-only). Screenshots at 1280×720,
 * 1366×768 and 1920×1080 (and one set at the 160 % interface scale) go to
 * /home/claude/capture/v2-neutral/.
 */

const OUT = process.env.V2_NEUTRAL_OUT ?? '/home/claude/capture/v2-neutral';
mkdirSync(OUT, { recursive: true });
const SIZES = [
  { width: 1280, height: 720 },
  { width: 1366, height: 768 },
  { width: 1920, height: 1080 },
] as const;
// The dev server and the emulated GPU are slow: each test loads the game afresh and captures three sizes.
test.describe.configure({ timeout: 720_000 });

const catalog = loadCatalog();

/**
 * Load → Import → load the imported save by its name (each import takes the next free manual slot,
 * so several fixtures can be brought into one test), then wait for the map.
 */
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
async function openSite(page: Page, f: SiteFixture, overlay: 'camp' | 'map-event'): Promise<void> {
  for (let i = 0; i < 5; i++) {
    await clickHex(page, f.coord.q, f.coord.r);
    await page.waitForTimeout(350);
    const s = await inspect(page);
    if (s.overlays.includes(overlay)) return;
    // A first-time tip can cover the map: read it and go on.
    const tip = page.getByRole('button', { name: 'Got it' });
    if (await tip.isVisible().catch(() => false)) await tip.click();
  }
  throw new Error(`${overlay} did not open`);
}

interface Fit {
  hscroll: boolean;
  outside: string[];
  overflow: string[];
  infoScrolls: boolean;
}

/** Everything in view without horizontal scrolling; the listed controls fully on screen; no clipped panel. */
async function fit(page: Page, root: string, controls: string[], noOverflow: string[]): Promise<Fit> {
  return page.evaluate(
    ([rootId, ctl, panes]) => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const doc = document.documentElement;
      const r = document.querySelector(`[data-testid="${rootId}"]`)!;
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
      for (const sel of panes) {
        const e = r.querySelector(sel) as HTMLElement | null;
        if (e && (e.scrollHeight > e.clientHeight + 1 || e.scrollWidth > e.clientWidth + 1)) overflow.push(`${sel} ${e.scrollWidth}x${e.scrollHeight} > ${e.clientWidth}x${e.clientHeight}`);
      }
      const info = r.querySelector('.nr-info') as HTMLElement | null;
      return { hscroll: doc.scrollWidth > vw + 1 || document.body.scrollWidth > vw + 1, outside, overflow, infoScrolls: !!info && info.scrollHeight > info.clientHeight + 1 };
    },
    [root, controls, noOverflow] as const,
  );
}

const CAMP_CONTROLS = ['[data-testid="camp-recruit"]', '[data-testid="camp-recruit-all"]', '.qty', '[data-testid="nr-army"]', '[data-testid="nr-stock"]', '[data-testid="nr-price"]', '[data-testid="camp-leave"]'];
const CAMP_PANES = ['.ak-body', '.nr-deal', '.nr-show'];

/** Capture every size; check the fit at each. */
/**
 * Set the window size and let a fresh frame be composited. Under the emulated GPU a capture taken
 * without a new frame can show the map from before the dialog opened, so the size is nudged first.
 */
async function settle(page: Page, size: { width: number; height: number }): Promise<void> {
  await page.setViewportSize({ width: size.width, height: size.height - 2 });
  await page.waitForTimeout(250);
  await page.setViewportSize(size);
  await page.waitForTimeout(800);
}

async function shoot(page: Page, name: string, check?: (size: { width: number; height: number }) => Promise<void>, root?: string): Promise<void> {
  for (const size of SIZES) {
    await settle(page, size);
    if (root) {
      await expect(page.getByTestId(root)).toBeVisible();
      // The dialog's pictures decoded (a fresh load can still be fetching them).
      await page
        .waitForFunction((id) => [...document.querySelectorAll(`[data-testid="${id}"] img`)].every((i) => (i as HTMLImageElement).complete && (i as HTMLImageElement).naturalWidth > 0), root, { timeout: 30_000 })
        .catch(() => undefined);
      await page.waitForTimeout(300);
    }
    // Entrance fades are fast-forwarded: the capture shows the dialog as it stands.
    await page.screenshot({ path: `${OUT}/${name}-${size.width}x${size.height}.png`, animations: 'disabled' });
    if (check) await check(size);
  }
}

async function campFits(page: Page, label: string): Promise<void> {
  const f = await fit(page, 'camp', CAMP_CONTROLS, CAMP_PANES);
  expect(f.hscroll, `${label}: horizontal scroll`).toBe(false);
  expect(f.outside, `${label}: controls out of view`).toEqual([]);
  expect(f.overflow, `${label}: clipped panes`).toEqual([]);
  if (f.infoScrolls) console.log(`${label}: the creature facts column scrolls`);
}

/** The kit portrait: the native file, never shown larger than its native size, no filter. */
async function portraitNative(page: Page): Promise<void> {
  const img = page.getByTestId('nr-portrait');
  await expect.poll(() => img.evaluate((e) => (e as HTMLImageElement).naturalWidth)).toBe(1254);
  const m = await img.evaluate((e) => {
    const i = e as HTMLImageElement;
    const b = i.getBoundingClientRect();
    return { w: b.width, h: b.height, nw: i.naturalWidth, nh: i.naturalHeight, filter: getComputedStyle(i).filter, ratio: b.width / b.height };
  });
  expect(m.w).toBeLessThanOrEqual(m.nw + 0.5);
  expect(m.h).toBeLessThanOrEqual(m.nh + 0.5);
  expect(Math.abs(m.ratio - 1)).toBeLessThan(0.02);
  expect(m.filter).toBe('none');
}

// ---------------------------------------------------------------------------
// Neutral recruitment
// ---------------------------------------------------------------------------

test('hiring site: kit portrait, exact facts, shared stock and price, seven slots; Recruit, then Recruit all affordable empties the stock', async ({ page }) => {
  const f = siteFixture({ name: 'grove', missionId: 'winter_oath_v2_m02', siteId: 'wo2_root_runners', army: [['norse_draugr', 24], ['root_runner', 3], ['norse_frost_wolf', 8], null, null, null, null] });
  await load(page, f);
  await openSite(page, f, 'camp');
  const camp = page.getByTestId('camp');
  const rr = catalog.creatures['root_runner']!;
  // The stage: the neutral recruitment background and the kit portrait (text alternative from the content).
  await expect(camp.locator('.ak-stage__scene')).toHaveAttribute('src', /campaign-v2\/background-neutral-recruitment\.png$/);
  await expect(page.getByTestId('nr-portrait')).toHaveAttribute('alt', rr.presentation.portraitAlt);
  await portraitNative(page);
  await expect(page.getByTestId('nr-name')).toHaveText(rr.name);
  // Base + upgrade since the neutral upgrades (2026-10-15): the base form is selected first.
  await expect(page.getByTestId('nr-single-form')).toHaveCount(0);
  await expect(page.getByTestId('nr-form-base')).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByTestId('nr-form-upgraded')).toContainText('Crownroot Runner');
  await expect(page.getByTestId('nr-habitat')).toContainText('Ancient knotted tree-root hollows');
  // Exact statistics and the ability's exact rule from the definitions.
  const stats = page.getByTestId('nr-stats');
  await expect(stats.locator('[data-stat="attack"] dd')).toHaveText(String(rr.stats!.attack));
  await expect(stats.locator('[data-stat="hp"] dd')).toHaveText(String(rr.stats!.hp));
  await expect(stats.locator('[data-stat="damage"] dd')).toHaveText(`${rr.stats!.damageMin}–${rr.stats!.damageMax}`);
  await expect(page.getByTestId('nr-ability-neutral_distract').locator('.nr-ability__rule')).toHaveText(catalog.abilities['neutral_distract']!.exactRule);
  // Shared stock and the exact price.
  await expect(page.getByTestId('nr-stock')).toContainText('8 Root-Runners this week');
  // One stock for both forms (neutral upgrades, 2026-10-15).
  await expect(page.getByTestId('nr-stock')).toContainText('Up to 8 each week; unhired ones do not stay · shared by both forms and every empire');
  await expect(page.getByTestId('nr-price')).toContainText('110');
  // Seven slots; the recruits merge into the Root-Runners already in slot 2.
  await expect(page.getByTestId('nr-army').getByRole('listitem')).toHaveCount(7);
  await expect(page.getByTestId('nr-army-slot-1')).toHaveClass(/slot--selected/);
  await expect(page.getByTestId('nr-destination')).toHaveText('Slot 2 — joins the 3 Root-Runners already there (4 after).');
  await expect(page.getByTestId('camp-recruit')).toContainText('Recruit 1');
  await expect(page.getByTestId('camp-recruit-all')).toContainText('Recruit all affordable (8)');
  await expect(page.getByTestId('camp-recruit-all')).toContainText('880');
  await shoot(page, 'recruit-unlocked', (s) => campFits(page, `unlocked ${s.width}x${s.height}`), 'camp');

  // Keyboard: focus starts inside, Tab reaches every control and stays inside, Escape closes.
  await page.setViewportSize(SIZES[0]);
  const inside = () => page.evaluate(() => !!document.activeElement?.closest('[data-testid="camp"]'));
  expect(await inside()).toBe(true);
  const reached = new Set<string>();
  for (let i = 0; i < 40; i++) {
    await page.keyboard.press('Tab');
    expect(await inside()).toBe(true);
    reached.add(await page.evaluate(() => {
      const a = document.activeElement as HTMLElement | null;
      return a?.dataset.testid ?? a?.getAttribute('aria-label') ?? a?.textContent?.trim().slice(0, 24) ?? '';
    }));
  }
  for (const want of ['camp-recruit', 'camp-recruit-all', 'camp-leave', 'nr-details', 'Close', 'Lore']) expect([...reached], want).toContain(want);
  expect([...reached].some((x) => /Increase|Decrease/.test(x))).toBe(true);

  // Quantity: two; one command; the toast; the stock and the army from the committed state.
  await page.getByRole('button', { name: /^Increase Root-Runners to hire/ }).click();
  await expect(page.getByTestId('camp-recruit')).toContainText('Recruit 2');
  await expect(page.getByTestId('nr-destination')).toHaveText('Slot 2 — joins the 3 Root-Runners already there (5 after).');
  const gold0 = (await inspect(page)).state.players.player.wallet.gold as number;
  await page.getByTestId('camp-recruit').click();
  await expect(page.getByTestId('nr-stock')).toContainText('6 Root-Runners this week');
  let s = await inspect(page);
  expect(s.state.players.player.wallet.gold).toBe(gold0 - 220);
  expect(s.state.heroes.hervor.army.slots[1]).toMatchObject({ creatureId: 'root_runner', count: 5 });
  expect(s.state.world.sites.wo2_root_runners.stock).toBe(6);
  // Recruit all affordable: the rules' maximum (the rest of the stock) in one command, nothing discarded.
  await expect(page.getByTestId('camp-recruit-all')).toContainText('Recruit all affordable (6)');
  await page.waitForTimeout(600);
  await page.getByTestId('camp-recruit-all').click();
  await expect(page.getByTestId('nr-issue-empty')).toBeVisible();
  s = await inspect(page);
  expect(s.state.heroes.hervor.army.slots[1]).toMatchObject({ creatureId: 'root_runner', count: 11 });
  expect(s.state.heroes.hervor.army.slots[0]).toMatchObject({ creatureId: 'norse_draugr', count: 24 });
  expect(s.state.world.sites.wo2_root_runners.stock).toBe(0);
  expect(s.state.players.player.wallet.gold).toBe(gold0 - 220 - 660);
  // Empty stock: the reason, both buttons unavailable with it.
  await expect(page.getByTestId('nr-issue-empty')).toContainText('None left this week. Up to 8 come when the next week begins');
  await expect(page.getByTestId('camp-recruit-all')).toContainText('none now');
  await expect(page.getByTestId('camp-recruit')).toBeDisabled();
  await expect(page.getByTestId('camp-recruit')).toHaveAttribute('aria-description', /None left this week/);
  await expect(page.getByTestId('camp-recruit-all')).toBeDisabled();
  await shoot(page, 'recruit-empty-stock', (sz) => campFits(page, `empty ${sz.width}x${sz.height}`), 'camp');
  await page.keyboard.press('Escape');
  await waitFor(page, (x) => !x.overlays.includes('camp'), 'camp closed');
});

test('hiring site: a pact not made yet shows the pact icon and its reason; nothing can be hired', async ({ page }) => {
  const f = siteFixture({ name: 'pact', missionId: 'silent_oracle_v2_m02', siteId: 'so2_pegasus' });
  const reason = (catalog.missions['silent_oracle_v2_m02']!.sites.find((x) => x.id === 'so2_pegasus')!.kind as { lockedReason: string }).lockedReason;
  await load(page, f);
  await openSite(page, f, 'camp');
  const issue = page.getByTestId('nr-issue-locked');
  await expect(issue).toContainText(reason);
  await expect(issue.getByRole('img', { name: 'Pact' })).toHaveAttribute('src', /icon-pact/);
  await expect(page.getByTestId('camp-recruit')).toBeDisabled();
  await expect(page.getByTestId('camp-recruit')).toHaveAttribute('aria-description', reason);
  await expect(page.getByTestId('camp-recruit-all')).toBeDisabled();
  // The facts stay readable: Pegasus's two abilities with their exact rules.
  await expect(page.getByTestId('nr-ability-neutral_sheltering_wings').locator('.nr-ability__rule')).toHaveText(catalog.abilities['neutral_sheltering_wings']!.exactRule);
  await expect(page.getByTestId('nr-ability-flight')).toBeVisible();
  await portraitNative(page);
  await shoot(page, 'recruit-locked-pact', (s) => campFits(page, `pact ${s.width}x${s.height}`), 'camp');
});

test('hiring site: a full army says why; no slot is chosen', async ({ page }) => {
  const full = siteFixture({
    name: 'full',
    missionId: 'winter_oath_v2_m02',
    siteId: 'wo2_root_runners',
    army: [['norse_draugr', 24], ['norse_deathless_draugr', 12], ['norse_frost_wolf', 8], ['norse_draugr', 2], ['norse_frost_wolf', 3], ['norse_deathless_draugr', 1], ['norse_draugr', 5]],
  });
  await load(page, full);
  await openSite(page, full, 'camp');
  await expect(page.getByTestId('nr-issue-full')).toContainText('Hervor’s seven slots hold other creatures');
  await expect(page.getByTestId('nr-destination')).toHaveText('No slot in Hervor’s army can take Root-Runners.');
  await expect(page.getByTestId('camp-recruit')).toBeDisabled();
  await expect(page.getByTestId('camp-recruit')).toHaveAttribute('aria-description', /seven slots/);
  await shoot(page, 'recruit-full-army', (s) => campFits(page, `full ${s.width}x${s.height}`), 'camp');
});

test('hiring site: an empty treasury names the shortfall for one creature', async ({ page }) => {
  const poor = siteFixture({ name: 'poor', missionId: 'winter_oath_v2_m02', siteId: 'wo2_root_runners', wallet: { gold: 50 } });
  await load(page, poor);
  await openSite(page, poor, 'camp');
  await expect(page.getByTestId('nr-issue-poor')).toContainText('One Root-Runner costs 110 Gold: short 60 Gold.');
  await expect(page.getByTestId('camp-recruit')).toBeDisabled();
  await expect(page.getByTestId('camp-recruit-all')).toBeDisabled();
  await shoot(page, 'recruit-insufficient', (s) => campFits(page, `poor ${s.width}x${s.height}`), 'camp');
});

test('an ordinary creature camp keeps its idle-strip stage in the camp’s landscape, with the same panel', async ({ page }) => {
  const f = siteFixture({
    name: 'centaurs',
    missionId: 'winter_oath_v2_m02',
    siteId: 'wo2_root_runners',
    extraSite: (d) => {
      const at = d.catalog.missions['winter_oath_v2_m02']!.sites.find((x) => x.id === 'wo2_root_runners')!;
      return { id: 'e2e_centaur_camp', anchorId: 'e2e_centaur_camp', coord: { q: at.coord.q, r: at.coord.r + 1 }, name: 'Centaur Camp', description: 'Centaurs sell their service to a visiting hero.', kind: { type: 'creature_camp', creatureId: 'centaur', weeklyGrowth: 4, initialStock: 6 } };
    },
  });
  await load(page, f);
  await openSite(page, f, 'camp');
  await expect(page.getByTestId('neutral-recruit')).toHaveAttribute('data-kit', 'false');
  await expect(page.getByTestId('recruit-stage')).toBeVisible();
  await expect(page.getByTestId('nr-portrait')).toHaveCount(0);
  await expect(page.getByTestId('nr-single-form')).toHaveCount(0);
  await expect(page.getByTestId('nr-stock')).toContainText('+4 each week');
  await expect(page.getByTestId('camp-recruit')).toBeEnabled();
  await shoot(page, 'camp-ordinary', (s) => campFits(page, `ordinary ${s.width}x${s.height}`), 'camp');
});

// ---------------------------------------------------------------------------
// Story choice
// ---------------------------------------------------------------------------

test('story choice: exact costs and consequences; confirm once; the dialog then shows what was decided', async ({ page }) => {
  const f = siteFixture({ name: 'market', missionId: 'silent_oracle_v2_m01', siteId: 'so1_market' });
  await load(page, f);
  await openSite(page, f, 'map-event');
  const ev = page.getByTestId('map-event');
  await expect(page.getByTestId('event-location')).toContainText('Riverside Market');
  await expect(page.getByTestId('event-cost-0')).toContainText('800');
  await expect(page.getByTestId('event-cost-0')).toContainText('5');
  await expect(page.getByTestId('event-option-0')).toContainText('Pilgrims sheltered');
  await expect(page.getByTestId('event-standdown-1')).toContainText('stand down');
  await expect(page.getByTestId('event-option-1')).toContainText('The captain’s ledger');
  expect(await page.evaluate(() => !!document.activeElement?.closest('[data-testid="map-event"]'))).toBe(true);
  await page.getByTestId('event-option-0').click();
  await expect(page.getByTestId('event-confirm')).toBeEnabled();
  await shoot(page, 'choice-affordable', undefined, 'map-event');
  const before = (await inspect(page)).state.players.player.wallet;
  await page.setViewportSize(SIZES[0]);
  await page.getByTestId('event-confirm').click();
  await expect(page.getByTestId('event-committed')).toBeVisible();
  await expect(page.getByTestId('event-chosen')).toHaveText('Shelter the pilgrims');
  await expect(page.getByTestId('event-confirm')).toHaveCount(0);
  const after = (await inspect(page)).state.players.player.wallet;
  expect(after.gold).toBe(before.gold - 800);
  expect(after.wood).toBe(before.wood - 5);
  await expect(ev.getByTestId('event-records')).toContainText('Pilgrims sheltered');
  await shoot(page, 'choice-committed', undefined, 'map-event');
  await page.getByTestId('event-close').click();
  await waitFor(page, (x) => !x.overlays.includes('map-event'), 'event closed');
});

test('story choice: unaffordable options name the shortfall; a repeat visit after Decide later says nothing was paid', async ({ page }) => {
  const f = siteFixture({ name: 'market-poor', missionId: 'silent_oracle_v2_m01', siteId: 'so1_market', wallet: { gold: 500 } });
  await load(page, f);
  await openSite(page, f, 'map-event');
  await expect(page.getByTestId('event-option-0')).toHaveAttribute('aria-disabled', 'true');
  await expect(page.getByTestId('event-option-0')).toContainText('Not enough resources: short 300 Gold');
  await expect(page.getByTestId('event-option-1')).toContainText('Not enough resources: short 700 Gold');
  await expect(page.getByTestId('event-confirm')).toBeDisabled();
  await expect(page.getByTestId('event-confirm')).toHaveAttribute('aria-description', 'No option is possible now');
  await shoot(page, 'choice-unaffordable', undefined, 'map-event');
  await page.getByTestId('event-later').click();
  await waitFor(page, (x) => !x.overlays.includes('map-event'), 'event closed');
  await openSite(page, f, 'map-event');
  await expect(page.getByTestId('event-repeat')).toContainText('nothing was decided or paid last time');
  await expect(page.getByTestId('choice')).toHaveAttribute('data-state', 'repeat');
  await shoot(page, 'choice-repeat-visit', undefined, 'map-event');
});

test('story choice: an option that needs evidence wears the evidence icon and says what is missing', async ({ page }) => {
  // The keeper's house as after arriving there: its scene has played (without the archive's records).
  const scene = catalog.missions['silent_oracle_v2_m02']!.storyScenes!.find((x) => x.id === 'so2_keeper_plain')!;
  const f = siteFixture({ name: 'keeper', missionId: 'silent_oracle_v2_m02', siteId: 'so2_keeper', scenes: [scene.id] });
  await load(page, f);
  await openSite(page, f, 'map-event');
  // The exchange: the existing speakers of the scene that played here.
  const exchange = page.getByTestId('event-exchange');
  await expect(exchange.locator('.ch-line')).toHaveCount(scene.lines.length);
  await expect(exchange).toContainText(scene.lines[0]!.text);
  // The requirement wears its objective's evidence marker.
  await expect(page.getByTestId('event-option-1').getByRole('img', { name: 'Needs evidence' })).toHaveAttribute('src', /icon-evidence/);
  const needs = page.getByTestId('event-needs-1');
  await expect(needs).toContainText('not yet');
  await expect(needs).toContainText('earlier chapter');
  await expect(page.getByTestId('event-option-1')).toHaveAttribute('aria-disabled', 'true');
  await expect(page.getByTestId('event-option-1')).toContainText('Needs ');
  await expect(page.getByTestId('event-option-0')).not.toHaveAttribute('aria-disabled', 'true');
  await expect(page.getByTestId('event-standdown-0')).toContainText('stand down');
  await shoot(page, 'choice-needs-evidence', undefined, 'map-event');
});

// ---------------------------------------------------------------------------
// Encyclopedia and unit page
// ---------------------------------------------------------------------------

test('encyclopedia: the six neutrals in the Neutral section with their kit portraits and compact stats; the unit page shows both forms', async ({ page }) => {
  await page.setViewportSize(SIZES[0]);
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await page.getByTestId('menu-encyclopedia').click();
  await page.getByTestId('codex-filter-neutral').click();
  for (const id of ['pegasus', 'root_runner', 'serpopard', 'baku', 'afanc', 'ahuitzotl']) {
    const card = page.getByTestId(`codex-${id}`);
    await expect(card).toContainText('Base form');
    await expect(card.locator('img')).toHaveAttribute('src', new RegExp(`campaign-v2/portrait-${id}\\.png$`));
    await expect(page.getByTestId(`codex-facts-${id}`)).toHaveCount(0);
  }
  // Two-form neutral families keep both forms.
  await expect(page.getByTestId('codex-centaur')).toContainText('Base form');
  await expect(page.getByTestId('codex-centaur_sentinel')).toContainText('Upgraded form');
  await expect(page.getByTestId('codex-facts-root_runner')).toHaveCount(0);
  await page.getByTestId('codex-family-pegasus').scrollIntoViewIfNeeded();
  await shoot(page, 'codex-neutral', async () => {
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  });
  await page.setViewportSize(SIZES[0]);
  await page.getByTestId('codex-pegasus').click();
  await expect(page.getByTestId('unit-name')).toHaveText('Pegasus');
  await expect(page.locator('[data-testid^="unit-form-"]')).toHaveCount(2);
  await expect(page.getByTestId('unit-form-pegasus')).toContainText('Base form');
  await expect(page.getByTestId('unit-form-dawncrest_pegasus')).toContainText('Upgraded form');
  await expect(page.getByTestId('unit-forms-note')).toContainText('Both forms are hired at the same hiring sites');
  await expect(page.getByTestId('unit-habitat')).toContainText('High meadows');
  await expect(page.getByTestId('unit-hiring')).toContainText('The Silent Oracle (2 chapters)');
  await expect(page.getByTestId('unit-stats')).toContainText('Site stock');
  await expect(page.locator('.unit-ability').filter({ hasText: 'Sheltering Wings' })).toContainText(catalog.abilities['neutral_sheltering_wings']!.exactRule);
  await shoot(page, 'unit-pegasus', async () => {
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  });
});

test('the animation preview of a neutral opened during a game changes nothing in the game', async ({ page }) => {
  const f = siteFixture({ name: 'preview', missionId: 'winter_oath_v2_m02', siteId: 'wo2_root_runners' });
  await load(page, f);
  // The creature card from the hiring site (a quick look; the dialog stays as it was).
  await openSite(page, f, 'camp');
  await page.getByRole('button', { name: /^Increase Root-Runners to hire/ }).click();
  await page.getByRole('button', { name: /^Increase Root-Runners to hire/ }).click();
  await page.getByTestId('nr-details').click();
  await expect(page.getByTestId('stack-info')).toContainText('Root-Runner');
  await page.getByTestId('stack-info').getByRole('button', { name: 'Close' }).click();
  // The chosen quantity survives the look at the card.
  await expect(page.getByTestId('camp-recruit')).toContainText('Recruit 3');
  await page.keyboard.press('Escape');
  await waitFor(page, (x) => !x.overlays.includes('camp'), 'camp closed');
  const before = await inspect(page);
  // The map's Bestiary → Neutral → Root-Runner: the animated unit page.
  await page.getByRole('button', { name: 'Bestiary' }).click();
  await waitFor(page, (s) => s.screen === 'encyclopedia', 'encyclopedia');
  await page.getByTestId('codex-filter-neutral').click();
  await page.getByTestId('codex-root_runner').click();
  await waitFor(page, (s) => s.screen === 'unit-detail', 'unit page');
  await expect(page.getByTestId('unit-name')).toHaveText('Root-Runner');
  for (const anim of ['attack', 'defend', 'hit', 'death', 'idle']) {
    const b = page.getByTestId(`anim-${anim}`);
    if (await b.isEnabled().catch(() => false)) await b.click();
    await page.getByTestId('viewer-play').click();
    await page.waitForTimeout(150);
  }
  await page.getByTestId('viewer-restart').click();
  await page.getByTestId('viewer-pause').click();
  const after = await inspect(page);
  expect(after.state.revision).toBe(before.state.revision);
  expect(after.state.players.player.wallet).toEqual(before.state.players.player.wallet);
  expect(after.state.world.sites.wo2_root_runners.stock).toBe(before.state.world.sites.wo2_root_runners.stock);
});

// ---------------------------------------------------------------------------
// Largest interface scale
// ---------------------------------------------------------------------------

test('largest interface scale (160 % at 1366×768): recruitment and the choice keep every primary control in view', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await page.getByTestId('menu-settings').click();
  await page.getByTestId('settings-tab-interface').click();
  await page.getByLabel('Interface scale').fill('1.6');
  await page.getByTestId('settings-apply').click();
  const f = siteFixture({ name: 'scale', missionId: 'winter_oath_v2_m02', siteId: 'wo2_root_runners', army: [['norse_draugr', 24], ['root_runner', 3], null, null, null, null, null], wallet: { gold: 300 } });
  await importNamed(page, f);
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--ui-scale').trim())).toBe('1.6');
  await openSite(page, f, 'camp');
  await settle(page, { width: 1366, height: 768 });
  await campFits(page, 'scale 160 % 1366x768');
  const px = await page.getByTestId('nr-destination').evaluate((e) => parseFloat(getComputedStyle(e).fontSize));
  expect(px).toBeGreaterThanOrEqual(14);
  await page.screenshot({ path: `${OUT}/recruit-uiscale160-1366x768.png`, animations: 'disabled' });
  await page.keyboard.press('Escape');
  await waitFor(page, (x) => !x.overlays.includes('camp'), 'camp closed');

  const g = siteFixture({ name: 'scale-choice', missionId: 'silent_oracle_v2_m02', siteId: 'so2_keeper' });
  await importNamed(page, g);
  await openSite(page, g, 'map-event');
  await settle(page, { width: 1366, height: 768 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  const confirm = await page.getByTestId('event-confirm').boundingBox();
  expect(confirm && confirm.y + confirm.height <= 768).toBe(true);
  await page.screenshot({ path: `${OUT}/choice-uiscale160-1366x768.png`, animations: 'disabled' });
});
