import { mkdirSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { importAndLoad } from './fixtures';
import { clickHex, inspect, waitFor } from './helpers';
import { usePrefs } from './momentFixtures';
import { DEST, SOURCE, START_GOLD, caravanFixture, type CaravanFixture } from './caravanFixtures';

/**
 * Recruitment caravans (expedition kit §06/§11, `recruitmentCaravansV1`) through the real
 * screens: the dispatch dialog from the town (destination, forms and quantities, the shared
 * pool, the source town's prices, route, ETA and the exact total = recruits + 150), the
 * tracker from the command sidebar, End Day moving the wagon on the map (and the night's
 * summary line), the already-applied arrival receipt with View garrison, a captured
 * destination holding the shipment with a free reroute, the actor picker on a shared tile,
 * keyboard dispatch, the 160 % interface scale at 1280×720 and a legacy save without any of
 * it. Fixtures are ordinary saves imported with Load → Import (the ?e2e readouts are
 * read-only). Screenshots: /home/claude/capture/expedition/caravans/.
 */

const OUT = '/home/claude/capture/expedition/caravans';
mkdirSync(OUT, { recursive: true });
const SMALL = { width: 1280, height: 720 };

type CaravanRec = { id: string; status: string; coord: { q: number; r: number }; destinationTownId: string; cargo: { creatureId: string; count: number }[]; route: { q: number; r: number }[] };
type WagonDebug = Record<string, { coord: { q: number; r: number }; heading: string; flipX: boolean; texture: string; shown: boolean; moving: boolean; x: number; y: number }>;

function errorsOf(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  return errors;
}
const realErrors = (errors: string[]) => errors.filter((e) => !/favicon|Failed to load resource/i.test(e));

async function settle(page: Page, ms = 600) {
  await page.evaluate(() => Promise.all(document.getAnimations().filter((a) => a.effect && 'target' in a.effect && a.playState === 'running' && (a.effect.getTiming().iterations ?? 1) !== Infinity).map((a) => a.finished.catch(() => undefined))));
  await page.waitForTimeout(ms);
}

async function shot(page: Page, name: string) {
  await settle(page);
  await page.screenshot({ path: `${OUT}/${name}.png` });
}

async function open(page: Page, f: CaravanFixture, prefs: Record<string, unknown> = {}) {
  await usePrefs(page, { graphicsTested: true, tutorialHints: false, confirmEndDayWithMovement: false, ...prefs });
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await importAndLoad(page, f.file);
  await waitFor(page, (s) => s.screen === 'adventure' && s.humanTurn && !s.busy && s.overlays.length === 0, 'adventure map', 120_000);
}

const caravans = async (page: Page): Promise<CaravanRec[]> => Object.values(((await inspect(page)).state as { caravans?: Record<string, CaravanRec> }).caravans ?? {});
const wallet = async (page: Page): Promise<number> => ((await inspect(page)).state as { players: Record<string, { wallet: { gold: number } }> }).players.player!.wallet.gold;
const wagons = async (page: Page): Promise<WagonDebug> => (await page.evaluate(() => (globalThis as unknown as { __prCaravans: () => unknown }).__prCaravans())) as WagonDebug;

/** Every listed control lies inside the window (no nested scrolling needed to reach it). */
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

/** At most one scrolling box inside a dialog (its own body): no nested scrolling. */
async function scrollBoxes(page: Page, root: string): Promise<number> {
  return page.locator(root).evaluate((el) =>
    [...el.querySelectorAll<HTMLElement>('*')].filter((e) => {
      const st = getComputedStyle(e);
      return /(auto|scroll)/.test(st.overflowY) && e.scrollHeight > e.clientHeight + 1;
    }).length,
  );
}

async function openDispatch(page: Page) {
  await page.getByTestId(`town-tab-${SOURCE}`).click();
  await waitFor(page, (s) => s.screen === 'town', 'town screen', 60_000);
  await page.getByTestId('town-caravan').click();
  await expect(page.getByTestId('caravan-dispatch')).toBeVisible();
}

async function endDay(page: Page, day: number) {
  await page.getByTestId('end-day').click();
  await waitFor(page, (s) => ((s.state as { day: number }).day ?? 0) >= day && s.humanTurn && !s.busy, `day ${day}`, 150_000);
}

test('dispatch from the town: exact total = recruits + 150, tracker with ETA, End Day rolls the wagon (1280×720)', async ({ page }) => {
  test.setTimeout(420_000);
  await page.setViewportSize(SMALL);
  const errors = errorsOf(page);
  const f = caravanFixture('dispatch');
  await open(page, f);
  await openDispatch(page);
  await expect(page.getByTestId('caravan-destination')).toHaveValue(DEST);
  // The kit's worked example: 12 Hoplites × 60 + 8 Peltasts × 100 + 2 Griffins × 240 = 2,000; transport 150.
  await page.getByTestId('caravan-qty-hoplite-input').fill('12');
  await page.getByTestId('caravan-qty-peltast-input').fill('8');
  await page.getByTestId('caravan-qty-griffin-input').fill('2');
  await expect(page.getByTestId('caravan-total-recruits')).toContainText('2,000');
  await expect(page.getByTestId('caravan-total-fee')).toContainText('150');
  await expect(page.getByTestId('caravan-total-sum')).toContainText('2,150');
  await expect(page.getByTestId('caravan-price-hoplite')).toContainText('60');
  await expect(page.getByTestId('caravan-pool-hoplite')).toContainText('8 of 20 available');
  const eta = (await import('@pr/rules')).quoteCaravan(f.driver.catalog, f.driver.state, 'player', SOURCE, DEST, [{ creatureId: 'hoplite', count: 12 }]).etaDay!;
  await expect(page.getByTestId('caravan-eta')).toContainText(`Day ${eta}`);
  await expect(page.getByTestId('caravan-risk')).toContainText('clear');
  await expect(page.getByTestId('caravan-dispatch-confirm')).toBeEnabled();
  await inWindow(page, ['[data-testid="caravan-dispatch-confirm"]', '[data-testid="caravan-dispatch-cancel"]']);
  await shot(page, 'dispatch-1280');
  await page.getByTestId('caravan-dispatch-confirm').click();
  await expect(page.getByTestId('caravan-dispatch')).toHaveCount(0);
  await expect.poll(async () => (await caravans(page)).length).toBe(1);
  expect(START_GOLD - (await wallet(page))).toBe(2150);
  const [c] = await caravans(page);
  expect(c!.status).toBe('queued');
  expect(c!.cargo.map((s) => [s.creatureId, s.count])).toEqual([
    ['hoplite', 12],
    ['peltast', 8],
    ['griffin', 2],
  ]);
  // The tracker from the command sidebar.
  await page.keyboard.press('Escape');
  await waitFor(page, (s) => s.screen === 'adventure', 'back on the map');
  await page.getByTestId(`caravan-tab-${c!.id}`).click();
  await expect(page.getByTestId('caravan-tracker')).toBeVisible();
  await expect(page.getByTestId('caravan-status')).toHaveText('Leaves next turn');
  await expect(page.getByTestId('caravan-tracker-eta')).toContainText(`Day ${eta}`);
  await expect(page.getByTestId('caravan-cargo').locator('li')).toHaveCount(3);
  await expect(page.getByTestId('caravan-cargo')).toContainText('12');
  await shot(page, 'tracker-1280');
  await page.getByTestId('caravan-tracker-close').click();
  // The wagon stands at the source's gate, drawn with its painted token.
  await expect.poll(async () => (await wagons(page))[c!.id]?.texture, { timeout: 60_000 }).toBe('ready');
  // End Day: at the start of the next turn the wagon rolls along its saved route.
  await endDay(page, 2);
  const [moved] = await caravans(page);
  expect(moved!.status).toBe('travelling');
  expect(moved!.coord).not.toEqual(c!.coord);
  expect(moved!.route.length).toBeLessThan(c!.route.length);
  await expect.poll(async () => (await wagons(page))[c!.id]?.coord, { timeout: 30_000 }).toEqual(moved!.coord);
  const w = (await wagons(page))[c!.id]!;
  expect(w.texture).toBe('ready');
  expect(w.shown).toBe(true);
  expect(['e', 'ne', 'se', 'w', 'nw', 'sw']).toContain(w.heading);
  // The night's summary line.
  await expect(page.getByTestId('caravan-summary')).toContainText('moved');
  await expect(page.getByTestId('caravan-summary')).toContainText(`arrives day ${eta}`);
  await shot(page, 'map-summary-1280');
  // Show on map: the camera centres on the wagon.
  await page.getByTestId(`caravan-tab-${c!.id}`).click();
  await page.getByTestId('caravan-show').click();
  await page.getByTestId('rival-summary-close').click().catch(() => undefined);
  await settle(page, 1500);
  await shot(page, 'map-wagon-1280');
  expect(realErrors(errors)).toEqual([]);
});

test('arrival: the receipt is already applied — Added to garrison, View garrison opens the town', async ({ page }) => {
  test.setTimeout(300_000);
  await page.setViewportSize(SMALL);
  const errors = errorsOf(page);
  const f = caravanFixture('arrival', { cargo: [{ creatureId: 'hoplite', count: 6 }, { creatureId: 'griffin', count: 2 }], arriveNext: true });
  await open(page, f);
  const gold = await wallet(page);
  await endDay(page, f.etaDay!);
  await waitFor(page, (s) => s.overlays.includes('caravan-arrival'), 'arrival receipt', 60_000);
  await expect(page.getByTestId('caravan-added')).toHaveText(/Added to Eastharbor garrison\./);
  await expect(page.getByTestId('caravan-arrival-cargo')).toContainText('6');
  await expect(page.getByTestId('caravan-arrival-cargo')).toContainText('Griffins');
  // No Claim button, no second charge: the receipt only shows what the rules committed.
  await expect(page.getByTestId('caravan-arrival').getByRole('button', { name: /claim/i })).toHaveCount(0);
  const st = (await inspect(page)).state as { towns: Record<string, { garrison: { slots: ({ creatureId: string; count: number } | null)[] } }>; players: Record<string, { wallet: { gold: number } }> };
  const g = st.towns[DEST]!.garrison.slots.filter((s): s is { creatureId: string; count: number } => !!s);
  expect(g.find((s) => s.creatureId === 'hoplite')?.count).toBe(26);
  expect(g.find((s) => s.creatureId === 'griffin')?.count).toBe(2);
  expect(st.players.player!.wallet.gold).toBeGreaterThanOrEqual(gold);
  await shot(page, 'arrival-1280');
  await page.getByTestId('caravan-view-garrison').click();
  await waitFor(page, (s) => s.screen === 'town', 'destination town', 60_000);
  await expect(page.getByTestId('town-armies')).toBeVisible();
  await shot(page, 'arrival-garrison-1280');
  expect(realErrors(errors)).toEqual([]);
});

test('held: a captured destination holds the shipment (cargo safe); reroute to another town is free', async ({ page }) => {
  test.setTimeout(300_000);
  await page.setViewportSize(SMALL);
  const errors = errorsOf(page);
  const f = caravanFixture('blocked', { cargo: [{ creatureId: 'hoplite', count: 5 }], days: 1, loseDestination: true });
  await open(page, f);
  await endDay(page, 3);
  await waitFor(page, (s) => s.overlays.includes('caravan-tracker'), 'held notice', 60_000);
  await expect(page.getByTestId('caravan-blocked')).toBeVisible();
  await expect(page.getByTestId('caravan-route-status')).toContainText('no longer yours');
  await expect(page.getByTestId('caravan-safe')).toBeVisible();
  const [held] = await caravans(page);
  expect(held!.status).toBe('blocked');
  expect(held!.cargo[0]!.count).toBe(5);
  await shot(page, 'blocked-1280');
  const gold = await wallet(page);
  await page.getByTestId('caravan-reroute-select').selectOption(SOURCE);
  await page.getByTestId('caravan-reroute-send').click();
  await expect.poll(async () => (await caravans(page))[0]?.destinationTownId).toBe(SOURCE);
  expect(await wallet(page)).toBe(gold);
  expect((await caravans(page))[0]!.status).toBe('travelling');
  await shot(page, 'rerouted-1280');
  expect(realErrors(errors)).toEqual([]);
});

test('a tile with my hero and my caravan asks which one the click meant', async ({ page }) => {
  test.setTimeout(300_000);
  await page.setViewportSize(SMALL);
  const errors = errorsOf(page);
  const base = caravanFixture('shared-base', { cargo: [{ creatureId: 'peltast', count: 4 }], days: 1 });
  const c = Object.values(base.driver.state.caravans!)[0]!;
  const d = base.driver;
  d.hero('alexios').position = { ...c.coord };
  const { createEnvelope, serializeEnvelope } = await import('@pr/session');
  const { writeFileSync } = await import('node:fs');
  writeFileSync(base.file, serializeEnvelope(createEnvelope(d.catalog, { match: d.state, campaign: null }, { id: 'manual-1', kind: 'manual', name: 'shared', savedAt: new Date(0).toISOString() })));
  await open(page, base);
  await clickHex(page, c.coord.q, c.coord.r);
  await waitFor(page, (s) => s.overlays.includes('actor-picker'), 'actor picker');
  await expect(page.getByTestId('actor-hero-alexios')).toBeVisible();
  await expect(page.getByTestId(`actor-caravan-${c.id}`)).toBeVisible();
  await shot(page, 'actor-picker-1280');
  await page.getByTestId(`actor-caravan-${c.id}`).click();
  await expect(page.getByTestId('caravan-tracker')).toBeVisible();
  // Both are drawn on the shared tile: the wagon stands aside.
  const w = (await wagons(page))[c.id]!;
  expect(w.coord).toEqual(c.coord);
  expect(realErrors(errors)).toEqual([]);
});

test('160 % interface scale (1280×720): dispatch by keyboard, confirmation and tracker keep their controls in view, no nested scrolling', async ({ page }) => {
  test.setTimeout(360_000);
  await page.setViewportSize(SMALL);
  const errors = errorsOf(page);
  const f = caravanFixture('scale160', { cargo: [{ creatureId: 'griffin', count: 1 }], days: 1 });
  await open(page, f, { uiScale: 1.6 });
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--ui-scale').trim())).toBe('1.6');
  await openDispatch(page);
  expect(await scrollBoxes(page, '[data-testid="caravan-dispatch"]')).toBeLessThanOrEqual(1);
  // Keyboard only: type the quantity, then Tab to the controls and confirm with Enter.
  const qty = page.getByTestId('caravan-qty-hoplite-input');
  await qty.focus();
  await page.keyboard.press('Control+a');
  await page.keyboard.type('3');
  await expect(page.getByTestId('caravan-total-sum')).toContainText(String(3 * 60 + 150));
  await page.keyboard.press('Tab');
  const focused = await page.evaluate(() => document.activeElement?.getAttribute('aria-label') ?? document.activeElement?.textContent ?? '');
  expect(focused.length).toBeGreaterThan(0);
  // A visible focus ring on the focused control.
  const ring = await page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    if (!el) return 'none';
    const st = getComputedStyle(el);
    return `${st.outlineStyle}|${st.boxShadow}`;
  });
  expect(ring).not.toBe('none|none');
  await inWindow(page, ['[data-testid="caravan-dispatch-confirm"]', '[data-testid="caravan-dispatch-cancel"]']);
  await shot(page, 'dispatch-160');
  const gold = await wallet(page);
  await page.getByTestId('caravan-dispatch-confirm').focus();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('caravan-dispatch')).toHaveCount(0);
  expect(gold - (await wallet(page))).toBe(3 * 60 + 150);
  await page.keyboard.press('Escape');
  await waitFor(page, (s) => s.screen === 'adventure', 'back on the map');
  const first = (await caravans(page)).sort((a, b) => (a.id < b.id ? -1 : 1))[0]!;
  await page.getByTestId(`caravan-tab-${first.id}`).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('caravan-tracker')).toBeVisible();
  expect(await scrollBoxes(page, '[data-testid="caravan-tracker"]')).toBeLessThanOrEqual(1);
  await inWindow(page, ['[data-testid="caravan-tracker-close"]', '[data-testid="caravan-show"]']);
  await shot(page, 'tracker-160');
  expect(realErrors(errors)).toEqual([]);
});

test('legacy save (no caravan flag): no caravan control anywhere', async ({ page }) => {
  test.setTimeout(200_000);
  await page.setViewportSize(SMALL);
  const errors = errorsOf(page);
  const f = caravanFixture('legacy', { legacy: true });
  await open(page, f);
  await expect(page.getByTestId('caravan-list')).toHaveCount(0);
  await page.getByTestId(`town-tab-${SOURCE}`).click();
  await waitFor(page, (s) => s.screen === 'town', 'town screen', 60_000);
  await expect(page.getByTestId('town-recruit')).toBeVisible();
  await expect(page.getByTestId('town-caravan')).toHaveCount(0);
  expect(realErrors(errors)).toEqual([]);
});
