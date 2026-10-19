import { mkdirSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import type { MatchState } from '@pr/rules';
import { importAndLoad } from './fixtures';
import { clickHex, inspect, waitFor } from './helpers';
import { usePrefs } from './momentFixtures';
import { HERO, ME, galleryFixture, navalRandomFixture, salvageFixture, towerFixture, wreckFixture } from './seaSitesFixtures';

/**
 * Coastal sites and sea salvage through the real screens (sea-sites kit 2026-10-17): the two lookout
 * pictures (warm timber, cold stone) neutral and flying the player's flag; the three kinds of floating
 * salvage and both wrecks on the map, sized by their painted bounds; taking a lookout on foot with an
 * enemy ship in its sight ("Enemy ship sighted near Gull Point"); sailing onto driftwood (the resource
 * toast, the 250 ms fade); the wreck panel → Explore (100 movement) → raiders moored alongside on the two
 * decks → victory → the salvage, the wreck left cleared and the hero aboard beside it; the 160 %
 * interface scale; a naval random map with its sites. Fixtures are ordinary saves imported with Load →
 * Import (the ?e2e readouts are read-only). Screenshots: /home/claude/capture/sea-sites/.
 */

const OUT = '/home/claude/capture/sea-sites';
mkdirSync(OUT, { recursive: true });
const SMALL = { width: 1280, height: 720 };

type SeaDbg = { kind: 'tower' | 'pickup' | 'wreck'; assetId: string; texture: string; visible: boolean; alpha: number; x: number; y: number; width: number; height: number; flag: { x: number; y: number; color: string; shape: string } | null; claimed: boolean; cleared: boolean; bob: boolean };

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
async function shot(page: Page, name: string, ms = 600) {
  await settle(page, ms);
  await page.screenshot({ path: `${OUT}/${name}.png` });
}

async function open(page: Page, file: string, prefs: Record<string, unknown> = {}) {
  await usePrefs(page, { graphicsTested: true, tutorialHints: false, confirmEndDayWithMovement: false, ...prefs });
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await importAndLoad(page, file);
  await waitFor(page, (s) => s.screen === 'adventure' && s.humanTurn && !s.busy && s.overlays.length === 0, 'adventure map', 180_000);
}

const state = async (page: Page): Promise<MatchState> => (await inspect(page)).state as MatchState;
const sea = async (page: Page): Promise<Record<string, SeaDbg>> => {
  for (let i = 0; i < 60; i++) {
    const d = (await page.evaluate(() => (globalThis as unknown as { __prSeaSites: () => unknown }).__prSeaSites())) as Record<string, SeaDbg> | null;
    if (d) return d;
    await page.waitForTimeout(250);
  }
  throw new Error('no sea-site readout');
};
const allReady = async (page: Page, ids: string[]) => {
  await expect.poll(async () => { const d = await sea(page); return ids.every((id) => d[id]?.texture === 'ready'); }, { timeout: 60_000 }).toBe(true);
};
const canvasBox = async (page: Page) => (await page.locator('.adventure__scene canvas').first().boundingBox())!;

/** Wheel the map in (negative) or out (positive) over a page point. */
async function wheel(page: Page, x: number, y: number, steps: number) {
  await page.mouse.move(x, y);
  for (let i = 0; i < Math.abs(steps); i++) {
    await page.mouse.wheel(0, steps < 0 ? -240 : 240);
    await page.waitForTimeout(90);
  }
  await page.waitForTimeout(450);
}

/** A close picture of one site: zoom in over it, pan it clear of the bars, clip around its painted bounds, zoom back out. */
async function cropSite(page: Page, id: string, name: string, zoomIn = 3) {
  const box = await canvasBox(page);
  const d0 = (await sea(page))[id]!;
  await wheel(page, box.x + d0.x, box.y + d0.y - d0.height / 2, -zoomIn);
  // Out of the map: no hover ring or route badge over the picture.
  await page.mouse.move(box.x + box.width + 40, box.y + box.height - 40);
  const TOP = 70;
  for (let i = 0; i < 12; i++) {
    const d = (await sea(page))[id]!;
    const key = d.y - d.height < TOP ? 'ArrowUp' : d.y + 40 > box.height ? 'ArrowDown' : d.x - d.width / 2 < 20 ? 'ArrowLeft' : d.x + d.width / 2 > box.width - 20 ? 'ArrowRight' : null;
    if (!key) break;
    await page.keyboard.press(key);
    await page.waitForTimeout(150);
  }
  await settle(page, 500);
  const d = (await sea(page))[id]!;
  const pad = Math.max(40, d.width * 0.45);
  const x = Math.max(box.x, box.x + d.x - d.width / 2 - pad);
  const y = Math.max(box.y + 50, box.y + d.y - d.height - pad);
  const w = Math.min(box.x + box.width - x, d.width + pad * 2);
  const h = Math.min(box.y + box.height - y, d.height + pad * 2);
  await page.screenshot({ path: `${OUT}/${name}.png`, clip: { x, y, width: w, height: h } });
  await wheel(page, box.x + d.x, box.y + d.y - d.height / 2, zoomIn);
}

/** Every listed control lies inside the window. */
async function inWindow(page: Page, selectors: string[]) {
  const vp = page.viewportSize()!;
  for (const sel of selectors) {
    const b = await page.locator(sel).first().boundingBox();
    expect(b, sel).not.toBeNull();
    expect(b!.x, sel).toBeGreaterThanOrEqual(-0.5);
    expect(b!.y, sel).toBeGreaterThanOrEqual(-0.5);
    expect(b!.x + b!.width, sel).toBeLessThanOrEqual(vp.width + 0.5);
    expect(b!.y + b!.height, sel).toBeLessThanOrEqual(vp.height + 0.5);
  }
}

const SITES = ['tower_warm', 'tower_cold', 'drift', 'cargo', 'treasury', 'wreck_mast', 'wreck_hull'];

test('gallery: both lookouts (warm timber, cold stone) neutral, the three kinds of salvage and both wrecks, sized by their painted bounds (1280×720)', async ({ page }) => {
  test.setTimeout(600_000);
  await page.setViewportSize(SMALL);
  const errors = errorsOf(page);
  const f = galleryFixture();
  await open(page, f.file);
  await allReady(page, SITES);
  const d = await sea(page);
  expect(d.tower_warm).toMatchObject({ kind: 'tower', assetId: 'seaSites.coastal.watchtower.warm', flag: null, bob: false });
  expect(d.tower_cold).toMatchObject({ kind: 'tower', assetId: 'seaSites.coastal.watchtower.cold', flag: null });
  expect(d.drift).toMatchObject({ kind: 'pickup', assetId: 'seaSites.sea.pickup.wood', claimed: false });
  expect(d.cargo).toMatchObject({ kind: 'pickup', assetId: 'seaSites.sea.pickup.stone' });
  expect(d.treasury).toMatchObject({ kind: 'pickup', assetId: 'seaSites.sea.pickup.gold' });
  expect(d.wreck_mast).toMatchObject({ kind: 'wreck', assetId: 'seaSites.shipwreck.broken.mast', cleared: false });
  expect(d.wreck_hull).toMatchObject({ kind: 'wreck', assetId: 'seaSites.shipwreck.split.hull', cleared: false });
  for (const id of SITES) expect(d[id]!.visible, id).toBe(true);
  // The handoff's bands, in proportion to each other (the zoom cancels out): towers 1.8–2.2 hex widths tall,
  // a wreck hull 1.4–1.7 wide, salvage 0.55–0.7 wide.
  const hex = d.wreck_mast!.width / 1.55;
  for (const id of ['tower_warm', 'tower_cold']) expect(d[id]!.height / hex, id).toBeGreaterThanOrEqual(1.8);
  for (const id of ['tower_warm', 'tower_cold']) expect(d[id]!.height / hex, id).toBeLessThanOrEqual(2.2);
  expect(d.wreck_hull!.width / hex).toBeGreaterThanOrEqual(1.4);
  expect(d.wreck_hull!.width / hex).toBeLessThanOrEqual(1.7);
  for (const id of ['drift', 'cargo', 'treasury']) {
    expect(d[id]!.width / hex, id).toBeGreaterThanOrEqual(0.55);
    expect(d[id]!.width / hex, id).toBeLessThanOrEqual(0.7);
  }
  // Salvage bobs gently; the rest stands still (wrecks barely move).
  expect(d.drift!.bob).toBe(true);
  // The tile panel names what the player may know.
  const box = await canvasBox(page);
  await page.mouse.move(box.x + d.wreck_hull!.x, box.y + d.wreck_hull!.y - 4);
  await expect(page.getByTestId('tile-sea-site')).toBeVisible({ timeout: 10_000 });
  await expect(page.getByTestId('tile-sea-site')).toContainText(/Unexplored/);
  await page.mouse.move(box.x + d.tower_warm!.x, box.y + d.tower_warm!.y - 4);
  await expect(page.getByTestId('tile-sea-site')).toHaveAttribute('data-site', 'tower_warm', { timeout: 10_000 });
  await expect(page.getByTestId('tile-sea-site-state')).toContainText(/Neutral|Unclaimed|nobody/i);
  await wheel(page, box.x + box.width * 0.6, box.y + box.height * 0.5, 1);
  await shot(page, 'gallery-neutral-1280', 900);
  await cropSite(page, 'tower_warm', 'tower-warm-neutral');
  await cropSite(page, 'tower_cold', 'tower-cold-neutral');
  await cropSite(page, 'drift', 'pickup-driftwood', 4);
  await cropSite(page, 'cargo', 'pickup-stone-cargo', 4);
  await cropSite(page, 'treasury', 'pickup-lost-treasury', 4);
  await cropSite(page, 'wreck_mast', 'wreck-broken-mast');
  await cropSite(page, 'wreck_hull', 'wreck-split-hull');
  expect(realErrors(errors)).toEqual([]);
});

test('gallery: both lookouts flying the player\'s flag in the player\'s colour (never a tint) (1280×720)', async ({ page }) => {
  test.setTimeout(400_000);
  await page.setViewportSize(SMALL);
  const errors = errorsOf(page);
  const f = galleryFixture('gallery-owned', true);
  await open(page, f.file);
  await allReady(page, ['tower_warm', 'tower_cold']);
  const color = f.state.players[ME]!.color;
  await expect.poll(async () => (await sea(page)).tower_warm?.flag?.color ?? null, { timeout: 20_000 }).toBe(color);
  const d = await sea(page);
  expect(d.tower_cold!.flag).toMatchObject({ color, shape: 'square' });
  // The flag hangs at the mast: above the ground point, inside the picture's width.
  for (const id of ['tower_warm', 'tower_cold']) {
    const t = d[id]!;
    expect(t.flag!.y, id).toBeLessThan(t.y - t.height * 0.5);
    expect(Math.abs(t.flag!.x - t.x), id).toBeLessThan(t.width * 0.6);
  }
  const box = await canvasBox(page);
  await page.mouse.move(box.x + d.tower_cold!.x, box.y + d.tower_cold!.y - 4);
  await expect(page.getByTestId('tile-sea-site')).toHaveAttribute('data-site', 'tower_cold', { timeout: 10_000 });
  await expect(page.getByTestId('tile-sea-site-state')).toContainText(/yours|You/i);
  await cropSite(page, 'tower_warm', 'tower-warm-owned');
  await cropSite(page, 'tower_cold', 'tower-cold-owned');
  expect(realErrors(errors)).toEqual([]);
});

test('lookout: a hero on foot takes Gull Point — one capture, the flag, the sight over the sea and "Enemy ship sighted near Gull Point" (1280×720)', async ({ page }) => {
  test.setTimeout(600_000);
  await page.setViewportSize(SMALL);
  const errors = errorsOf(page);
  const f = towerFixture();
  await open(page, f.file);
  await allReady(page, ['tower_warm']);
  const s0 = await state(page);
  const towerCoord = siteCoord(f.state, 'tower_warm');
  expect(s0.world.sites.tower_warm!.owner ?? null).toBeNull();
  // Every notice shown from here on (the toasts expire after a few seconds): a test-side log of the DOM.
  await page.evaluate(() => {
    const seen: string[] = [];
    (globalThis as unknown as { __seaToasts: string[] }).__seaToasts = seen;
    new MutationObserver((muts) => {
      for (const m of muts) for (const n of m.addedNodes) if (n instanceof HTMLElement && n.classList.contains('toast')) seen.push(n.textContent ?? '');
    }).observe(document.body, { childList: true, subtree: true });
  });
  await clickHex(page, towerCoord.q, towerCoord.r);
  await page.waitForTimeout(400);
  await clickHex(page, towerCoord.q, towerCoord.r);
  await waitFor(page, (s) => (s.state as MatchState).world.sites.tower_warm?.owner === ME, 'tower captured', 120_000);
  // The alert comes once the hero has reached the lookout.
  const toast = page.locator('.toast', { hasText: 'Enemy ship sighted near Gull Point' });
  await expect(toast).toHaveCount(1, { timeout: 30_000 });
  await page.mouse.move(5, 400);
  await page.waitForTimeout(250);
  await page.screenshot({ path: `${OUT}/tower-captured-alert-1280.png` });
  const s1 = await state(page);
  expect(s1.heroes[HERO]!.position).toEqual(towerCoord);
  expect(s1.seaWatch?.[ME]?.inRange).toContain('map_ship_b');
  expect(s1.seaWatch?.[ME]?.alerted).toContain('map_ship_b');
  await expect.poll(async () => (await sea(page)).tower_warm?.flag?.color ?? null, { timeout: 20_000 }).toBe(s1.players[ME]!.color);
  // The hero standing at the lookout is drawn in front of it.
  await waitFor(page, (s) => !s.busy, 'walk played', 60_000);
  await cropSite(page, 'tower_warm', 'tower-warm-captured-hero');
  // One alert for the one ship (coalesced; the ship merely staying in sight raises nothing more).
  await page.waitForTimeout(1500);
  const seen = await page.evaluate(() => (globalThis as unknown as { __seaToasts: string[] }).__seaToasts);
  expect(seen.filter((t) => t.includes('Enemy ship sighted'))).toEqual(['Enemy ship sighted near Gull Point']);
  expect(realErrors(errors)).toEqual([]);
});

test('salvage: sailing onto the Driftwood Bundle takes +5 Wood at once (the resource toast) and the bundle fades (1280×720)', async ({ page }) => {
  test.setTimeout(500_000);
  await page.setViewportSize(SMALL);
  const errors = errorsOf(page);
  const f = salvageFixture();
  await open(page, f.file);
  await allReady(page, ['drift']);
  const s0 = await state(page);
  const target = siteCoord(f.state, 'drift');
  await clickHex(page, target.q, target.r);
  await page.waitForTimeout(400);
  await clickHex(page, target.q, target.r);
  await waitFor(page, (s) => !!(s.state as MatchState).world.sites.drift?.claimed && !s.busy, 'driftwood taken', 120_000);
  await expect(page.getByTestId('reward-toast').filter({ hasText: 'Driftwood Bundle: +5 Wood' })).toBeVisible({ timeout: 15_000 });
  const s1 = await state(page);
  expect(s1.players[ME]!.wallet.wood - s0.players[ME]!.wallet.wood).toBe(5);
  expect(s1.heroes[HERO]!.position).toEqual(target);
  expect(s1.world.ships!.map_ship_a!.coord).toEqual(target);
  await shot(page, 'salvage-taken-1280', 100);
  await expect.poll(async () => (await sea(page)).drift?.claimed ?? null, { timeout: 15_000 }).toBe(true);
  await expect.poll(async () => (await sea(page)).drift?.alpha ?? 1, { timeout: 5_000 }).toBeLessThan(0.05);
  expect(realErrors(errors)).toEqual([]);
});

/** A site's cell from a fixture's state (the mission is read by the rules' own lookup). */
function siteCoord(s: MatchState, id: string): { q: number; r: number } {
  const c = s.customMission?.sites.find((x) => x.id === id)?.coord;
  if (!c) throw new Error(`no site ${id}`);
  return c;
}

test('wreck: the panel → Explore (100 movement) → raiders moored alongside on the two decks → victory → 1,000 Gold and 8 Wood; the wreck stays, cleared; the hero stays aboard beside it (1280×720)', async ({ page }) => {
  test.setTimeout(900_000);
  await page.setViewportSize(SMALL);
  const errors = errorsOf(page);
  const f = wreckFixture();
  await open(page, f.file, { battleSpeed: '2' });
  await allReady(page, ['wreck_hull']);
  const s0 = await state(page);
  const wreck = siteCoord(f.state, 'wreck_hull');
  const approach = s0.heroes[HERO]!.position;
  await clickHex(page, wreck.q, wreck.r);
  const panel = page.getByTestId('wreck-panel');
  await expect(panel).toBeVisible({ timeout: 15_000 });
  await expect(panel).toHaveAttribute('data-site', 'wreck_hull');
  await expect(panel).toContainText('The Kestrel');
  await expect(page.getByTestId('wreck-panel-art')).toBeVisible();
  expect(await page.getByTestId('wreck-panel-art').evaluate(async (img: HTMLImageElement) => { await img.decode().catch(() => undefined); return img.naturalWidth > 0; })).toBe(true);
  await expect(page.getByTestId('wreck-panel-danger')).not.toBeEmpty();
  await expect(page.getByTestId('wreck-explore')).toHaveText(/Explore \(100 movement\)/);
  await expect(page.getByTestId('wreck-explore')).toBeEnabled();
  await expect(page.getByTestId('wreck-leave')).toBeEnabled();
  await inWindow(page, ['[data-testid="wreck-explore"]', '[data-testid="wreck-leave"]']);
  await shot(page, 'wreck-panel-1280');
  const mp0 = s0.heroes[HERO]!.movementPoints;
  await page.getByTestId('wreck-explore').click();
  await waitFor(page, (s) => s.screen === 'battle' && !s.busy && !(s as unknown as { boardLoading: boolean }).boardLoading, 'wreck battle', 180_000);
  const sb = await state(page);
  expect(sb.battle!.archetype).toBe('boarding_two_ships_v1');
  expect(sb.battle!.encounter.kind).toBe('wreck_expedition');
  expect(sb.heroes[HERO]!.movementPoints).toBe(mp0 - 100);
  expect(sb.world.sites.wreck_hull!.wreck?.phase).toBe('encounterPending');
  await shot(page, 'wreck-battle-1280', 900);
  await page.getByTestId('battle-auto').click();
  await waitFor(page, (s) => s.screen === 'battle-result', 'battle result', 500_000);
  await shot(page, 'wreck-battle-result-1280', 900);
  await page.getByTestId('result-continue').click();
  await waitFor(page, (s) => s.screen === 'adventure' && !s.busy, 'back on the map', 60_000);
  // The salvage: the reward receipt (an overlay for a big haul, else a toast).
  const s1 = await state(page);
  expect(s1.world.sites.wreck_hull!.wreck?.phase).toBe('cleared');
  expect(s1.players[ME]!.wallet.gold - s0.players[ME]!.wallet.gold).toBe(1000);
  expect(s1.players[ME]!.wallet.wood - s0.players[ME]!.wallet.wood).toBe(8);
  expect(s1.heroes[HERO]!.position).toEqual(approach);
  expect(s1.world.ships!.map_ship_a!.heroId).toBe(HERO);
  expect(s1.world.ships!.map_ship_a!.coord).toEqual(approach);
  await expect.poll(async () => (await sea(page)).wreck_hull?.cleared ?? null, { timeout: 20_000 }).toBe(true);
  await settle(page, 400);
  await page.screenshot({ path: `${OUT}/wreck-reward-1280.png` });
  for (let i = 0; i < 3 && (await inspect(page)).overlays.length > 0; i++) {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
  }
  // The cleared wreck: still on the map, no longer explorable (the panel says why).
  await clickHex(page, wreck.q, wreck.r);
  await expect(page.getByTestId('wreck-panel')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId('wreck-explore')).toBeDisabled();
  await expect(page.getByTestId('wreck-panel-state')).toContainText(/cleared|explored|salvaged/i);
  await cropSite(page, 'wreck_hull', 'wreck-cleared');
  await shot(page, 'wreck-cleared-panel-1280');
  expect(realErrors(errors)).toEqual([]);
});

test('160 % interface scale: the wreck panel fits the window, Leave spends nothing; sailing onto Stone Cargo shows its toast in view', async ({ page }) => {
  test.setTimeout(600_000);
  await page.setViewportSize(SMALL);
  const errors = errorsOf(page);
  const f = wreckFixture('wreck-160');
  await open(page, f.file, { uiScale: 1.6 });
  await allReady(page, ['wreck_hull', 'cargo']);
  const s0 = await state(page);
  const wreck = siteCoord(f.state, 'wreck_hull');
  await clickHex(page, wreck.q, wreck.r);
  await expect(page.getByTestId('wreck-panel')).toBeVisible({ timeout: 15_000 });
  await inWindow(page, ['[data-testid="wreck-explore"]', '[data-testid="wreck-leave"]', '[data-testid="wreck-panel-danger"]']);
  await shot(page, 'wreck-panel-160');
  await page.getByTestId('wreck-leave').click();
  await expect(page.getByTestId('wreck-panel')).toHaveCount(0);
  const s1 = await state(page);
  expect(s1.revision).toBe(s0.revision);
  expect(s1.heroes[HERO]!.movementPoints).toBe(s0.heroes[HERO]!.movementPoints);
  const cargo = siteCoord(f.state, 'cargo');
  await clickHex(page, cargo.q, cargo.r);
  await page.waitForTimeout(400);
  await clickHex(page, cargo.q, cargo.r);
  await waitFor(page, (s) => !!(s.state as MatchState).world.sites.cargo?.claimed && !s.busy, 'stone cargo taken', 120_000);
  const toast = page.getByTestId('reward-toast').filter({ hasText: 'Stone Cargo: +4 Stone' });
  await expect(toast).toBeVisible({ timeout: 15_000 });
  await inWindow(page, ['[data-testid="reward-toast"]']);
  await shot(page, 'salvage-toast-160', 100);
  expect(realErrors(errors)).toEqual([]);
});

test('a naval random map (The Shattered Crown): the home island\'s lookout and the salvage around it on the map', async ({ page }) => {
  test.setTimeout(600_000);
  await page.setViewportSize(SMALL);
  const errors = errorsOf(page);
  const f = navalRandomFixture();
  await open(page, f.file);
  const kinds = (await sea(page));
  const known = Object.values(kinds);
  expect(known.some((x) => x.kind === 'tower')).toBe(true);
  expect(known.filter((x) => x.kind === 'pickup').length).toBeGreaterThanOrEqual(3);
  await expect.poll(async () => Object.values(await sea(page)).filter((x) => x.texture === 'ready').length, { timeout: 60_000 }).toBe(known.length);
  const box = await canvasBox(page);
  await wheel(page, box.x + box.width * 0.55, box.y + box.height * 0.5, 2);
  await shot(page, 'naval-random-sites-1280', 900);
  await wheel(page, box.x + box.width * 0.55, box.y + box.height * 0.5, 3);
  await shot(page, 'naval-random-sites-wide-1280', 900);
  expect(realErrors(errors)).toEqual([]);
});

test('map editor: the sea palette places floating salvage on open water only, says why elsewhere, and shows its fields', async ({ page }) => {
  test.setTimeout(300_000);
  await page.setViewportSize(SMALL);
  const errors = errorsOf(page);
  await usePrefs(page, { graphicsTested: true, tutorialHints: false });
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await page.getByTestId('menu-new').click();
  await page.getByTestId('mode-editor').click();
  await waitFor(page, (s) => s.screen === 'map-editor', 'map editor', 60_000);
  const box = (await page.getByTestId('editor-canvas').boundingBox())!;
  const at = (fx: number, fy: number) => ({ x: box.x + box.width * fx, y: box.y + box.height * fy });
  // A small lake.
  await page.getByTestId('tool-ground-water').click();
  await page.getByTestId('brush-3').click();
  const lake = at(0.5, 0.5);
  await page.mouse.click(lake.x, lake.y);
  // The sea palette: the lookout, the three kinds of salvage and the wreck, each with its picture.
  await expect(page.getByTestId('palette-sea')).toBeVisible();
  for (const id of ['coastal_watchtower', 'sea_pickup-wood', 'sea_pickup-stone', 'sea_pickup-gold', 'shipwreck']) await expect(page.getByTestId(`tool-place-${id}`)).toBeVisible();
  expect(await page.getByTestId('palette-sea').locator('img').evaluateAll((imgs) => imgs.filter((i) => (i as HTMLImageElement).naturalWidth === 0).length)).toBe(0);
  await page.getByTestId('tool-place-sea_pickup-gold').click();
  await expect(page.getByTestId('tool-place-sea_pickup-gold')).toHaveAttribute('aria-pressed', 'true');
  // Land refuses with the reason (hover hint and toast); nothing is placed.
  const land = at(0.2, 0.2);
  await page.mouse.move(land.x, land.y);
  await expect(page.getByTestId('editor-sea-hint')).toContainText('Floating salvage lies on the water');
  await page.mouse.click(land.x, land.y);
  await expect(page.locator('.toast', { hasText: 'Floating salvage lies on the water' })).toBeVisible();
  // Open water takes it; the site panel shows the salvage fields (the amount blank: drawn when the game starts).
  await page.mouse.move(lake.x, lake.y);
  await expect(page.getByTestId('editor-sea-hint')).toContainText('Place a salvage here');
  await page.mouse.click(lake.x, lake.y);
  await page.getByRole('tab', { name: /^Site/ }).click();
  await expect(page.getByTestId('site-sea-pickup')).toBeVisible();
  await expect(page.getByTestId('site-sea-pickup-resource')).toHaveValue('gold');
  await expect(page.getByTestId('site-sea-pickup-amount')).toHaveAttribute('placeholder', '250–500');
  await page.getByTestId('site-sea-pickup-amount').fill('450');
  await expect(page.getByTestId('site-sea-pickup-amount')).toHaveValue('450');
  // A lookout never stands on the water.
  await page.getByTestId('tool-place-coastal_watchtower').click();
  const water = at(0.52, 0.53);
  await page.mouse.move(water.x, water.y);
  await expect(page.getByTestId('editor-sea-hint')).toContainText(/stands on land|A site stands here/);
  await shot(page, 'editor-sea-palette-1280');
  expect(realErrors(errors)).toEqual([]);
});
