import { mkdirSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { catalog } from '@pr/testing';
import { battleCellLegal, legalActions, terrainAt, type MatchState } from '@pr/rules';
import { importAndLoad } from './fixtures';
import { clickHex, inspect, waitFor } from './helpers';
import { usePrefs } from './momentFixtures';
import { FOE_HERO, HERO, boardingFixture, defendFixture, fleetFixture, launchFixture, voyageFixture } from './navalFixtures';

/**
 * Hero ships and boarding battles through the real screens (expedition kit §07–§09/§11,
 * `navalMovementV1`): the coastal launch service in the town; a voyage to the other island — walk to
 * the coast, the explicit Embark confirmation, two days of sailing with Continue journey, the explicit
 * Disembark confirmation; the ship inspector by keyboard; boarding an adjacent enemy ship → the two-deck
 * board, where only the legal cells take a click (water does nothing) → victory → the loser's wreck
 * sinks and the winner's ship takes the contested hex; six headings and six owner colours independent
 * of the pantheon; reduced motion; 1280×720, 1920×1080 and the 160 % interface scale; the editor's ship
 * tool. Fixtures are ordinary saves imported with Load → Import (the ?e2e readouts are read-only).
 * Screenshots: /home/claude/capture/expedition/ships/.
 */

const OUT = '/home/claude/capture/expedition/ships';
mkdirSync(OUT, { recursive: true });
const SMALL = { width: 1280, height: 720 };
const LARGE = { width: 1920, height: 1080 };

type ShipDbg = { coord: { q: number; r: number }; heading: string; flipX: boolean; texture: string; shown: boolean; occupied: boolean; flag: { x: number; y: number; color: string } | null; marker: string | null; motion: string; moving: boolean; bob: boolean; wake: number; selected: boolean; x: number; y: number; width: number };
type ShipsDbg = { ships: Record<string, ShipDbg>; sinking: string[]; sunk: string[]; landing: number; ring: { q: number; r: number } | null; transitions: number; calm: boolean; wakeArt: string; ringArt: string };
type BoardDbg = { masked: boolean; projection: { radius: number; squash: number; originX: number; originY: number }; cell: { radius: number; squash: number }; art: { x: number; y: number; width: number; height: number } | null; legalCells: number; drawnCells: number; flags: { side: string; color: string; x: number; y: number }[]; mirrored: boolean };

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
  await waitFor(page, (s) => s.screen === 'adventure' && s.humanTurn && !s.busy && s.overlays.length === 0, 'adventure map', 150_000);
}

const ships = async (page: Page): Promise<ShipsDbg> => {
  for (let i = 0; i < 40; i++) {
    const d = (await page.evaluate(() => (globalThis as unknown as { __prShips: () => unknown }).__prShips())) as ShipsDbg | null;
    if (d) return d;
    await page.waitForTimeout(250);
  }
  throw new Error('no ship readout');
};
/** The board readout with the painting's rectangle in page pixels (the readout is canvas-local). */
const board = async (page: Page): Promise<BoardDbg> => {
  const b = (await page.evaluate(() => (globalThis as unknown as { __prBoard: () => unknown }).__prBoard())) as BoardDbg;
  const cv = (await page.locator('.battle__scene canvas').first().boundingBox())!;
  return b.art ? { ...b, art: { ...b.art, x: b.art.x + cv.x, y: b.art.y + cv.y } } : b;
};
const state = async (page: Page): Promise<MatchState> => (await inspect(page)).state as MatchState;
const projectCell = (page: Page, col: number, row: number) => page.evaluate(([c, r]) => (globalThis as unknown as { __prProject: (k: string, a: number, b: number) => { x: number; y: number } | null }).__prProject('battle', c!, r!), [col, row]);

/** Zoom the map out over its centre (mouse wheel) so the far island is on screen. */
async function zoomOut(page: Page, steps = 6) {
  const box = (await page.locator('.adventure__scene canvas').first().boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.55, box.y + box.height * 0.5);
  for (let i = 0; i < steps; i++) {
    await page.mouse.wheel(0, 240);
    await page.waitForTimeout(80);
  }
  await page.waitForTimeout(400);
}

async function endDay(page: Page, day: number) {
  await page.getByTestId('end-day').click();
  await waitFor(page, (s) => ((s.state as { day: number }).day ?? 0) >= day && s.humanTurn && !s.busy, `day ${day}`, 180_000);
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

test('coastal launch: the town service quotes 1,500 Gold + 10 Wood, offers the free cells by direction and launches an empty ship of the player (1280×720)', async ({ page }) => {
  test.setTimeout(360_000);
  await page.setViewportSize(SMALL);
  const errors = errorsOf(page);
  const f = launchFixture();
  await open(page, f.file);
  const before = await state(page);
  await page.getByTestId('town-tab-town_1').click();
  await waitFor(page, (s) => s.screen === 'town', 'town screen', 60_000);
  await page.getByTestId('town-launch').click();
  await expect(page.getByTestId('coastal-launch')).toBeVisible();
  await expect(page.getByTestId('launch-price')).toContainText('1,500');
  await expect(page.getByTestId('launch-price')).toContainText('10');
  const cells = page.locator('[data-testid^="launch-cell-"]');
  const n = await cells.count();
  expect(n).toBeGreaterThan(0);
  await expect(page.getByTestId('coastal-launch')).toContainText(/Launch to the (east|north-east|north-west|west|south-west|south-east)/);
  // Keyboard: choose the last free cell.
  await cells.nth(n - 1).focus();
  await page.keyboard.press('Space');
  await expect(cells.nth(n - 1)).toBeChecked();
  await expect(page.getByTestId('launch-confirm')).toBeEnabled();
  await inWindow(page, ['[data-testid="launch-confirm"]', '[data-testid="launch-cancel"]']);
  await shot(page, 'coastal-launch-1280');
  await page.getByTestId('launch-confirm').click();
  await expect(page.getByTestId('coastal-launch')).toHaveCount(0);
  const after = await state(page);
  const added = Object.values(after.world.ships ?? {}).filter((s) => !before.world.ships?.[s.shipId]);
  expect(added).toHaveLength(1);
  expect(added[0]).toMatchObject({ ownerId: 'player', heroId: null, state: 'empty' });
  expect(terrainAt(after.world.map, added[0]!.coord)).toBe('water');
  expect(before.players.player!.wallet.gold - after.players.player!.wallet.gold).toBe(1500);
  expect(before.players.player!.wallet.wood - after.players.player!.wallet.wood).toBe(10);
  // Back on the map: the new empty hull with the player's marker (no fictitious hero aboard).
  await page.keyboard.press('Escape');
  await waitFor(page, (s) => s.screen === 'adventure', 'map', 60_000);
  await expect.poll(async () => (await ships(page)).ships[added[0]!.shipId]?.texture, { timeout: 30_000 }).toBe('ready');
  const d = (await ships(page)).ships[added[0]!.shipId]!;
  expect(d.occupied).toBe(false);
  expect(d.flag).toBeNull();
  expect(d.marker).toBe(after.players.player!.color);
  // Not enough Gold for a second: the dialog says why.
  await page.getByTestId('town-tab-town_1').click();
  await waitFor(page, (s) => s.screen === 'town', 'town screen', 60_000);
  await page.getByTestId('town-launch').click();
  if (after.players.player!.wallet.gold < 1500) {
    await expect(page.getByTestId('launch-reason')).toContainText('1500 Gold');
    await expect(page.getByTestId('launch-confirm')).toBeDisabled();
  }
  expect(realErrors(errors)).toEqual([]);
});

test('a voyage: walk to the coast, confirm Embark, sail two days with Continue journey, confirm Disembark; the ship inspector by keyboard (1280×720)', async ({ page }) => {
  test.setTimeout(900_000);
  await page.setViewportSize(SMALL);
  const errors = errorsOf(page);
  const f = voyageFixture();
  await open(page, f.file);
  const s0 = await state(page);
  const ship = s0.world.ships!.map_ship_free!;
  // The empty neutral ship: a neutral marker, no flag.
  await expect.poll(async () => (await ships(page)).ships.map_ship_free?.texture, { timeout: 30_000 }).toBe('ready');
  expect((await ships(page)).ships.map_ship_free).toMatchObject({ occupied: false, flag: null, marker: 'neutral' });
  await shot(page, 'empty-ship-1280');
  // Plan a journey to the east island (zoomed out so it is on screen): a voyage with its embark and disembark steps.
  await zoomOut(page);
  const target = { q: 31, r: 8 };
  await clickHex(page, target.q, target.r);
  await expect.poll(async () => (await ships(page)).transitions, { timeout: 20_000 }).toBe(2);
  await expect(page.getByTestId('journey-status')).toContainText(/voyage: embark then go ashore/);
  await expect(page.getByTestId('journey-status')).toContainText(/Arrives in 4 turns/);
  await shot(page, 'voyage-route-1280');
  {
    // Closer: the route's embark seal on the hull and the chevrons over the sea.
    const box = (await page.locator('.adventure__scene canvas').first().boundingBox())!;
    const at = (await page.evaluate(([a, b]) => (globalThis as unknown as { __prProject: (k: string, a: number, b: number) => { x: number; y: number } | null }).__prProject('adventure', a!, b!), [ship.coord.q + 2, ship.coord.r]))!;
    await page.mouse.move(at.x, at.y);
    for (let i = 0; i < 4; i++) {
      await page.mouse.wheel(0, -240);
      await page.waitForTimeout(80);
    }
    await shot(page, 'voyage-route-close-1280');
    void box;
    await zoomOut(page);
  }
  // Second click (the destination): the hero walks to the coast and the route stops at the ship — the explicit confirmation.
  await clickHex(page, target.q, target.r);
  await waitFor(page, (s) => s.overlays.includes('confirm') && !s.busy, 'embark confirmation', 120_000);
  await expect(page.getByTestId('confirm')).toContainText('Embark on the ship? Uses all remaining movement.');
  await shot(page, 'embark-confirm-1280');
  await page.getByTestId('confirm-ok').click();
  await waitFor(page, (s) => (s.state as MatchState).world.ships!.map_ship_free!.heroId === HERO && !s.busy, 'embarked', 60_000);
  const s1 = await state(page);
  expect(s1.heroes[HERO]!.movementPoints).toBe(0);
  expect(s1.world.ships!.map_ship_free).toMatchObject({ ownerId: 'player', state: 'occupied' });
  await expect.poll(async () => (await ships(page)).ships.map_ship_free?.flag?.color ?? null, { timeout: 20_000 }).toBe(s1.players.player!.color);
  expect((await ships(page)).ships.map_ship_free!.selected).toBe(true);
  // The selected ship's destination carries the kit's destination ring; the route still shows its landing step.
  await expect.poll(async () => (await ships(page)).ring, { timeout: 20_000 }).toEqual(target);
  await expect.poll(async () => (await ships(page)).ringArt, { timeout: 20_000 }).toBe('overlay');
  expect((await ships(page)).transitions).toBe(1);
  // The ship inspector by keyboard: focus the sidebar's ship, Enter opens it (focus moves inside), Escape closes it.
  await page.getByTestId('ship-tab-map_ship_free').focus();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('ship-inspect')).toBeVisible();
  await expect(page.getByTestId('ship-inspect-owner')).toContainText('(you)');
  await expect(page.getByTestId('ship-inspect-hero')).toBeVisible();
  await expect(page.getByTestId('ship-inspect-movement')).toContainText('0/');
  await expect(page.getByTestId('ship-action-disembark')).toBeDisabled();
  await expect(page.getByTestId('ship-action-disembark-reason')).toContainText(/movement points/);
  expect(await page.evaluate(() => !!document.activeElement?.closest('[data-testid="ship-inspect"]'))).toBe(true);
  await shot(page, 'shipinspect-embarked-1280');
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('ship-inspect')).toHaveCount(0);
  expect((await inspect(page)).overlays).not.toContain('pause');
  // Day 2: Continue journey sails as far as the day allows.
  await endDay(page, 2);
  await expect(page.getByTestId('journey-continue')).toBeEnabled();
  {
    // Closer, over the ship (the camera follows it while it sails).
    const box = (await page.locator('.adventure__scene canvas').first().boundingBox())!;
    const at = (await ships(page)).ships.map_ship_free!;
    await page.mouse.move(box.x + at.x, box.y + at.y);
    for (let i = 0; i < 5; i++) {
      await page.mouse.wheel(0, -240);
      await page.waitForTimeout(80);
    }
    await page.waitForTimeout(300);
  }
  await page.getByTestId('journey-continue').click();
  // Under way: the sailing motion with the kit's wake overlay and the flag flying; the avatar stays hidden aboard.
  await expect.poll(async () => (await ships(page)).ships.map_ship_free?.motion, { timeout: 20_000 }).toBe('sailing');
  await expect.poll(async () => (await ships(page)).ships.map_ship_free?.wake ?? 0, { timeout: 10_000 }).toBeGreaterThan(0.5);
  const sailing = await ships(page);
  expect(sailing.wakeArt).toBe('overlay');
  expect(sailing.ships.map_ship_free!.flag).not.toBeNull();
  expect(((await page.evaluate(() => (globalThis as unknown as { __prHeroes: () => unknown }).__prHeroes())) as Record<string, { visible?: boolean }>)[HERO]!.visible).toBe(false);
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${OUT}/sailing-1280.png` });
  await waitFor(page, (s) => (s.state as MatchState).heroes[HERO]!.movementPoints < 100 && !s.busy, 'first day at sea', 120_000);
  const s2 = await state(page);
  expect(terrainAt(s2.world.map, s2.heroes[HERO]!.position)).toBe('water');
  expect(s2.world.ships!.map_ship_free!.coord).toEqual(s2.heroes[HERO]!.position);
  expect(s2.world.ships!.map_ship_free!.coord).not.toEqual(ship.coord);
  expect((await ships(page)).ships.map_ship_free!.coord).toEqual(s2.heroes[HERO]!.position);
  // Day 3: the rest of the sea, then the explicit landing confirmation.
  await endDay(page, 3);
  await page.getByTestId('journey-continue').click();
  await waitFor(page, (s) => s.overlays.includes('confirm') && !s.busy, 'disembark confirmation', 120_000);
  await expect(page.getByTestId('confirm')).toContainText('Go ashore? Uses all remaining movement.');
  await shot(page, 'disembark-confirm-1280');
  await page.getByTestId('confirm-ok').click();
  await waitFor(page, (s) => !(s.state as MatchState).world.ships!.map_ship_free!.heroId && !s.busy, 'ashore', 60_000);
  const s3 = await state(page);
  expect(terrainAt(s3.world.map, s3.heroes[HERO]!.position)).not.toBe('water');
  expect(s3.world.ships!.map_ship_free).toMatchObject({ ownerId: 'player', state: 'empty', heroId: null });
  // The empty hull stays at anchor with the player's marker; the journey goes on next turn.
  await expect.poll(async () => (await ships(page)).ships.map_ship_free?.marker ?? null, { timeout: 20_000 }).toBe(s3.players.player!.color);
  await endDay(page, 4);
  await page.getByTestId('journey-continue').click();
  await waitFor(page, (s) => { const h = (s.state as MatchState).heroes[HERO]!; return h.position.q === target.q && h.position.r === target.r && !s.busy; }, 'arrived', 120_000);
  expect(realErrors(errors)).toEqual([]);
});

test('boarding: Attack from the ship inspector (confirmed) → the two-deck board — only legal cells take a click, water does nothing → victory → wreck → the winner takes the hex (1280×720 and 1920×1080)', async ({ page }) => {
  test.setTimeout(900_000);
  await page.setViewportSize(SMALL);
  const errors = errorsOf(page);
  const f = boardingFixture();
  await open(page, f.file, { battleSpeed: '2' });
  const s0 = await state(page);
  const contested = s0.world.ships!.map_ship_b!.coord;
  await expect.poll(async () => (await ships(page)).ships.map_ship_b?.texture, { timeout: 30_000 }).toBe('ready');
  await clickHex(page, contested.q, contested.r);
  await expect(page.getByTestId('ship-inspect')).toBeVisible();
  await expect(page.getByTestId('ship-inspect')).toHaveAttribute('data-ship', 'map_ship_b');
  await expect(page.getByTestId('ship-inspect-movement')).toHaveCount(0);
  await expect(page.getByTestId('ship-action-attack')).toBeEnabled();
  await page.getByTestId('ship-action-attack').click();
  // Never automatic: a battle confirmation first.
  await expect(page.getByTestId('confirm')).toContainText(/Board .*'s ship\?/);
  await page.getByTestId('confirm-ok').click();
  await waitFor(page, (s) => s.screen === 'battle' && !s.busy && !(s as unknown as { boardLoading: boolean }).boardLoading, 'boarding battle', 180_000);
  const st = await state(page);
  expect(st.battle!.archetype).toBe('boarding_two_ships_v1');
  expect(st.battle!.encounter.kind).toBe('naval_boarding');
  const b1 = await board(page);
  expect(b1).toMatchObject({ masked: true, legalCells: 102, drawnCells: 102, mirrored: false });
  // Contain: the painting keeps its native proportions inside the canvas (letterboxed, never stretched).
  expect(b1.art!.width / b1.art!.height).toBeCloseTo(1672 / 941, 2);
  expect(b1.flags.map((x) => x.color)).toEqual([st.players.player!.color, st.players.p2!.color]);
  await shot(page, 'boarding-1280', 900);
  // Every legal cell projects inside the painting; each lies where the kit measured it.
  for (const [c, r] of [[0, 0], [3, 10], [7, 4], [10, 5], [14, 10]] as const) {
    const p = (await projectCell(page, c, r))!;
    const nx = (p.x - b1.art!.x) / b1.art!.width;
    const ny = (p.y - b1.art!.y) / b1.art!.height;
    expect(nx).toBeCloseTo(0.17 + c * 0.045 + (r % 2 ? 0.0225 : 0), 2);
    expect(ny).toBeCloseTo(0.22 + r * 0.048, 2);
  }
  // A click on water does nothing.
  const rev = st.revision;
  const water = (await projectCell(page, 7, 8))!;
  await page.mouse.click(water.x, water.y);
  await page.waitForTimeout(700);
  expect((await state(page)).revision).toBe(rev);
  expect(battleCellLegal(st.battle!, { col: 7, row: 8 })).toBe(false);
  // A legal deck cell moves the active stack (the same projection for drawing and hit-testing).
  const la = legalActions(catalog, st)!;
  const dest = la.moves.find((m) => m.col === 3 && battleCellLegal(st.battle!, m)) ?? la.moves[0]!;
  const active = st.battle!.activeStackId!;
  const p = (await projectCell(page, dest.col, dest.row))!;
  await page.mouse.move(p.x, p.y);
  await page.waitForTimeout(250);
  await page.mouse.click(p.x, p.y);
  await waitFor(page, (s) => { const b = (s.state as MatchState).battle; return !b || b.stacks[active]!.anchor.col === dest.col && b.stacks[active]!.anchor.row === dest.row; }, 'stack moved', 60_000);
  // 1920×1080: the painting refits; the grid stays on it.
  await page.setViewportSize(LARGE);
  await page.waitForTimeout(900);
  const b2 = await board(page);
  expect(b2.art!.width).toBeGreaterThan(b1.art!.width);
  expect(b2.art!.width / b2.art!.height).toBeCloseTo(1672 / 941, 2);
  const q = (await projectCell(page, 14, 10))!;
  expect((q.x - b2.art!.x) / b2.art!.width).toBeCloseTo(0.17 + 14 * 0.045, 2);
  expect((q.y - b2.art!.y) / b2.art!.height).toBeCloseTo(0.22 + 10 * 0.048, 2);
  await shot(page, 'boarding-1920', 900);
  await page.setViewportSize(SMALL);
  await page.waitForTimeout(600);
  // Finish the battle with auto-combat (the tactical AI plays the player's stacks).
  await page.getByTestId('battle-auto').click();
  await waitFor(page, (s) => s.screen === 'battle-result', 'battle result', 400_000);
  await page.getByTestId('result-continue').click();
  await waitFor(page, (s) => s.screen === 'adventure', 'back on the map', 60_000);
  // The loser's hull: gone from the rules at once; its wreck sinks on the map; the winner's ship takes the contested hex.
  const s1 = await state(page);
  expect(s1.world.ships!.map_ship_b).toBeUndefined();
  expect(s1.world.ships!.map_ship_a!.coord).toEqual(contested);
  expect(s1.heroes[HERO]!.position).toEqual(contested);
  expect(s1.heroes[FOE_HERO]!.status).not.toBe('active');
  let caught = false;
  for (let i = 0; i < 40; i++) {
    const d = await ships(page);
    if (d.sinking.includes('map_ship_b')) {
      caught = true;
      // The winner waits beside the contested hex while the wreck sinks (then sails in).
      expect(d.ships.map_ship_a!.moving).toBe(true);
      await page.waitForTimeout(450);
      await page.screenshot({ path: `${OUT}/sinking-1280.png` });
      await page.waitForTimeout(650);
      await page.screenshot({ path: `${OUT}/wreck-1280.png` });
      break;
    }
    if (d.sunk.includes('map_ship_b')) break;
    await page.waitForTimeout(60);
  }
  await expect.poll(async () => (await ships(page)).sunk.includes('map_ship_b'), { timeout: 30_000 }).toBe(true);
  await expect.poll(async () => (await ships(page)).ships.map_ship_a?.coord ?? null, { timeout: 30_000 }).toEqual(contested);
  expect((await ships(page)).ships.map_ship_b).toBeUndefined();
  await shot(page, 'after-boarding-1280');
  test.info().annotations.push({ type: 'sinking frame captured', description: String(caught) });
  expect(realErrors(errors)).toEqual([]);
});

test('boarding hemmed in (160 % interface scale): Retreat and Surrender are disabled with the rules\' reason (no open water); the board refits', async ({ page }) => {
  test.setTimeout(400_000);
  await page.setViewportSize(SMALL);
  const f = boardingFixture('hemmed', undefined, undefined, { hemmed: true });
  // At the 160 % interface scale: the HUD grows, the painting refits beside it and the grid stays on it.
  await open(page, f.file, { uiScale: 1.6 });
  const st0 = await state(page);
  const b = st0.world.ships!.map_ship_b!.coord;
  await clickHex(page, b.q, b.r);
  await page.getByTestId('ship-action-attack').click();
  await page.getByTestId('confirm-ok').click();
  await waitFor(page, (s) => s.screen === 'battle' && !s.busy && !(s as unknown as { boardLoading: boolean }).boardLoading, 'boarding battle', 180_000);
  await expect(page.getByTestId('battle-retreat')).toBeDisabled();
  await expect(page.getByTestId('battle-retreat')).toHaveAttribute('title', /No open water to withdraw to/);
  await expect(page.getByTestId('battle-surrender')).toBeDisabled();
  await expect(page.getByTestId('battle-surrender')).toHaveAttribute('title', /No open water to withdraw to/);
  const bd = await board(page);
  expect(bd).toMatchObject({ masked: true, legalCells: 102, drawnCells: 102 });
  expect(bd.art!.width / bd.art!.height).toBeCloseTo(1672 / 941, 2);
  for (const [c, r] of [[0, 0], [7, 5], [14, 10]] as const) {
    const p = (await projectCell(page, c, r))!;
    expect((p.x - bd.art!.x) / bd.art!.width).toBeCloseTo(0.17 + c * 0.045 + (r % 2 ? 0.0225 : 0), 2);
    expect((p.y - bd.art!.y) / bd.art!.height).toBeCloseTo(0.22 + r * 0.048, 2);
  }
  await shot(page, 'boarding-hemmed-160');
});

test('defending a boarding: the board is drawn mirrored (the defender on the left) and the grid stays on the painting', async ({ page }) => {
  test.setTimeout(400_000);
  await page.setViewportSize(SMALL);
  const errors = errorsOf(page);
  const f = defendFixture();
  await usePrefs(page, { graphicsTested: true, tutorialHints: false });
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await importAndLoad(page, f.file);
  await waitFor(page, (s) => s.screen === 'battle' && !(s as unknown as { boardLoading: boolean }).boardLoading, 'boarding battle (defending)', 180_000);
  const st = await state(page);
  expect(st.battle!.sides.defender.playerId).toBe('player');
  const b = await board(page);
  expect(b).toMatchObject({ masked: true, mirrored: true, legalCells: 102, drawnCells: 102 });
  expect(b.art!.width / b.art!.height).toBeCloseTo(1672 / 941, 2);
  // Mirrored about the painting's centre: the attacker's deck (columns 0-3) is drawn on the right.
  for (const [c, r] of [[0, 0], [7, 4], [14, 10]] as const) {
    const p = (await projectCell(page, c, r))!;
    expect((p.x - b.art!.x) / b.art!.width).toBeCloseTo(1 - (0.17 + c * 0.045 + (r % 2 ? 0.0225 : 0)), 2);
    expect((p.y - b.art!.y) / b.art!.height).toBeCloseTo(0.22 + r * 0.048, 2);
  }
  const att = b.flags.find((x) => x.side === 'attacker')!;
  const def = b.flags.find((x) => x.side === 'defender')!;
  expect(att.color).toBe(st.players.p2!.color);
  expect(def.color).toBe(st.players.player!.color);
  expect(att.x).toBeGreaterThan(def.x);
  await shot(page, 'boarding-defending-mirrored-1280', 900);
  expect(realErrors(errors)).toEqual([]);
});

test('six headings and six owner colours (independent of the pantheon), the empty ships, and the avatars hidden aboard; the 160 % scale', async ({ page }) => {
  test.setTimeout(400_000);
  await page.setViewportSize(SMALL);
  const errors = errorsOf(page);
  const f = fleetFixture();
  await open(page, f.file);
  const st = await state(page);
  await expect.poll(async () => Object.values((await ships(page)).ships).filter((x) => x.texture === 'ready').length, { timeout: 60_000 }).toBe(8);
  const d = await ships(page);
  const fleet = [1, 2, 3, 4, 5, 6].map((i) => d.ships[`map_ship_e${i}`]!);
  expect(fleet.every((x) => x && x.shown && x.occupied)).toBe(true);
  expect(fleet.map((x) => x.heading)).toEqual(['e', 'ne', 'nw', 'w', 'sw', 'se']);
  expect(fleet.map((x) => x.flipX)).toEqual([false, false, true, true, true, false]);
  // Six flags in six owner colours, each the player's colour (never the pantheon's).
  const colours = fleet.map((x) => x.flag!.color);
  expect(new Set(colours).size).toBe(6);
  const owners = Object.keys(st.players);
  owners.forEach((pid, i) => expect(colours[i]).toBe(st.players[pid]!.color));
  expect(new Set(Object.values(st.players).map((p) => p.pantheonId)).size).toBe(6);
  // The flag stands at the masthead: above the hull's ground point, on the mirrored side when flipped.
  for (const x of fleet) {
    expect(x.flag!.y).toBeLessThan(x.y - x.width * 0.4);
    if (x.flipX) expect(x.flag!.x).toBeLessThanOrEqual(x.x + 1);
    else expect(x.flag!.x).toBeGreaterThanOrEqual(x.x - 1);
  }
  // The empty ships: a neutral marker and the player's own marker; no flag, no fictitious hero.
  expect(d.ships.map_ship_free).toMatchObject({ occupied: false, flag: null, marker: 'neutral' });
  expect(d.ships.map_ship_spare).toMatchObject({ occupied: false, flag: null, marker: st.players.player!.color });
  // Idle buoyancy plays with full motion.
  await expect.poll(async () => Object.values((await ships(page)).ships).some((x) => x.bob), { timeout: 10_000 }).toBe(true);
  await shot(page, 'fleet-six-headings-six-colours-1280', 900);
  // Zoomed in on the fleet.
  const box = (await page.locator('.adventure__scene canvas').first().boundingBox())!;
  const e3 = fleet[2]!;
  await page.mouse.move(box.x + e3.x, box.y + e3.y);
  for (let i = 0; i < 4; i++) {
    await page.mouse.wheel(0, -240);
    await page.waitForTimeout(80);
  }
  await shot(page, 'fleet-close-1280', 900);
  expect(realErrors(errors)).toEqual([]);
});

test('reduced motion: no bob, roll or wake — ownership stays readable; the 160 % interface scale keeps the ship inspector in view', async ({ page }) => {
  test.setTimeout(400_000);
  await page.setViewportSize(SMALL);
  const f = fleetFixture('fleet-reduced', 3);
  await open(page, f.file, { motion: 'reduced', uiScale: 1.6 });
  await expect.poll(async () => Object.values((await ships(page)).ships).filter((x) => x.texture === 'ready').length, { timeout: 60_000 }).toBe(8);
  await page.waitForTimeout(1500);
  for (let k = 0; k < 3; k++) {
    const d = await ships(page);
    expect(d.calm).toBe(true);
    for (const [id, x] of Object.entries(d.ships)) {
      expect(x.bob, id).toBe(false);
      expect(x.wake, id).toBe(0);
    }
    await page.waitForTimeout(400);
  }
  const d = await ships(page);
  expect(new Set([1, 2, 3, 4, 5, 6].map((i) => d.ships[`map_ship_e${i}`]!.flag!.color)).size).toBe(6);
  // The rotated fleet: other pantheons in the same seats keep the seats' colours.
  const st = await state(page);
  expect(st.players.player!.pantheonId).toBe('japanese');
  await page.getByTestId('ship-tab-map_ship_spare').focus();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('ship-inspect')).toBeVisible();
  await expect(page.getByTestId('ship-inspect-state')).toContainText('Empty ship');
  await inWindow(page, ['[data-testid="ship-inspect"] .panel__title', '[data-testid="ship-inspect-close"]']);
  await shot(page, 'reduced-motion-160', 600);
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('ship-inspect')).toHaveCount(0);
});

test('map editor: the ship tool places neutral or Empire ships on water only, says why elsewhere, and removes them', async ({ page }) => {
  test.setTimeout(240_000);
  await page.setViewportSize(SMALL);
  const errors = errorsOf(page);
  await usePrefs(page, { graphicsTested: true, tutorialHints: false });
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await page.getByTestId('menu-new').click();
  await page.getByTestId('mode-editor').click();
  await waitFor(page, (s) => s.screen === 'map-editor', 'map editor');
  const box = (await page.getByTestId('editor-canvas').boundingBox())!;
  const at = (fx: number, fy: number) => ({ x: box.x + box.width * fx, y: box.y + box.height * fy });
  // A small lake.
  await page.getByTestId('tool-ground-water').click();
  await page.getByTestId('brush-3').click();
  const lake = at(0.5, 0.5);
  await page.mouse.click(lake.x, lake.y);
  // The ship tool: a neutral ship on the water…
  await page.getByTestId('tool-ship').click();
  await expect(page.getByTestId('ship-owner')).toBeVisible();
  await page.mouse.move(lake.x, lake.y);
  await expect(page.getByTestId('editor-ship-hint')).toContainText('Place a neutral ship here');
  await page.mouse.click(lake.x, lake.y);
  await expect(page.getByTestId('ship-hint')).toContainText('1 ship placed');
  await page.mouse.move(lake.x + 2, lake.y);
  await expect(page.getByTestId('editor-ship-hint')).toContainText('Neutral ship — click to remove it');
  // …an Empire 1 ship beside it…
  await page.getByTestId('ship-owner').getByText('Empire 1').click();
  const near = at(0.53, 0.5);
  await page.mouse.click(near.x, near.y);
  await expect(page.getByTestId('ship-hint')).toContainText('2 ships placed');
  // …land refuses with the reason.
  const land = at(0.2, 0.2);
  await page.mouse.move(land.x, land.y);
  await expect(page.getByTestId('editor-ship-hint')).toContainText('Ships are placed on water only');
  await page.mouse.click(land.x, land.y);
  await expect(page.getByTestId('ship-hint')).toContainText('2 ships placed');
  await shot(page, 'editor-ship-tool-1280');
  // Erase removes a ship.
  await page.getByTestId('tool-erase').click();
  await page.mouse.click(near.x, near.y);
  await page.getByTestId('tool-ship').click();
  await expect(page.getByTestId('ship-hint')).toContainText('1 ship placed');
  expect(realErrors(errors)).toEqual([]);
});
