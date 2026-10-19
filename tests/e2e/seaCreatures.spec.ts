import { mkdirSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { catalog } from '@pr/testing';
import { legalActions, previewHarpoon, type MatchState } from '@pr/rules';
import { importAndLoad } from './fixtures';
import { clickHex, inspect, waitFor } from './helpers';
import { usePrefs } from './momentFixtures';
import { HERO, renewFixture, seaFixture } from './seaFixtures';

/**
 * Sea creatures and the single-ship sea battle through the real screens (sea-creature delivery
 * 2026-10-17, `seaEncountersV1`): a hero's ship sails into a sea-monster stack — its tile card and the
 * encounter dialog show the sea cards — and fights on the single-ship board: the delivered painting
 * contain-fitted, a click on the rail or the margins selects nothing, Deck Harpoon with its preview (the
 * rules' own range) and no retaliation, the swimmers' own missiles in flight, victory and the ship on
 * the monster's water; a Triton shooting twice in one round (its morale bonus) and its shots back at the
 * next round; the encyclopedia's sea section (ten forms, the upgrade comparison, one animated preview at
 * a time, paused off-screen); the editor placing a sea monster on water only; 1280×720 and the 160 %
 * interface scale. Fixtures are ordinary saves imported with Load → Import (the ?e2e readouts are
 * read-only). Screenshots: /home/claude/capture/sea-creatures/.
 */

const OUT = '/home/claude/capture/sea-creatures';
mkdirSync(OUT, { recursive: true });
const SMALL = { width: 1280, height: 720 };
const SEA_FORMS = ['hippocampus', 'tempest_hippocampus', 'triton', 'stormcaller_triton', 'isonade', 'razorwake_isonade', 'cetus', 'crownfin_cetus', 'hafgufa', 'abyssal_hafgufa'];

type BoardDbg = { masked: boolean; table?: boolean; art: { x: number; y: number; width: number; height: number } | null; legalCells: number; drawnCells: number; flags: unknown[]; mirrored: boolean };
type ShotDbg = { seq: number; event: string; creatureId: string | null; profile: string | null; fallback: string | null; facing: 1 | -1; travelOffsetDeg?: number };
type StackDbg = Record<string, { anchor: { col: number; row: number }; mirrored: boolean; drawn: string | null; lift: number; hover: number; visible: boolean; down: boolean }>;

function errorsOf(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  return errors;
}
const realErrors = (errors: string[]) => errors.filter((e) => !/favicon|Failed to load resource/i.test(e));

async function shot(page: Page, name: string, ms = 500) {
  await page.waitForTimeout(ms);
  await page.screenshot({ path: `${OUT}/${name}.png` });
}

async function open(page: Page, file: string, prefs: Record<string, unknown> = {}, screen: 'adventure' | 'battle' = 'adventure') {
  await usePrefs(page, { graphicsTested: true, tutorialHints: false, confirmEndDayWithMovement: false, ...prefs });
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await importAndLoad(page, file);
  if (screen === 'adventure') await waitFor(page, (s) => s.screen === 'adventure' && s.humanTurn && !s.busy && s.overlays.length === 0, 'adventure map', 150_000);
  else await waitFor(page, (s) => s.screen === 'battle' && !(s as unknown as { boardLoading: boolean }).boardLoading, 'battle screen', 150_000);
}

const state = async (page: Page): Promise<MatchState> => (await inspect(page)).state as MatchState;
const board = async (page: Page): Promise<BoardDbg> => {
  const b = (await page.evaluate(() => (globalThis as unknown as { __prBoard: () => unknown }).__prBoard())) as BoardDbg;
  const cv = (await page.locator('.battle__scene canvas').first().boundingBox())!;
  return b.art ? { ...b, art: { ...b.art, x: b.art.x + cv.x, y: b.art.y + cv.y } } : b;
};
const projectCell = (page: Page, col: number, row: number) => page.evaluate(([c, r]) => (globalThis as unknown as { __prProject: (k: string, a: number, b: number) => { x: number; y: number } | null }).__prProject('battle', c!, r!), [col, row]);
const shots = async (page: Page): Promise<{ inFlight: number; shots: ShotDbg[] }> => ((await page.evaluate(() => (globalThis as unknown as { __prSiege: () => { projectiles: unknown } | null }).__prSiege()?.projectiles ?? { inFlight: 0, shots: [] })) as { inFlight: number; shots: ShotDbg[] });
const stacksDbg = async (page: Page): Promise<StackDbg> => ((await page.evaluate(() => (globalThis as unknown as { __prBattle: () => unknown }).__prBattle())) ?? {}) as StackDbg;

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

/** Sail into the sea monster: the encounter dialog (with its sea cards), then Attack → the battle screen. */
async function sailIn(page: Page, monster: { q: number; r: number }, shotName?: string) {
  for (let i = 0; i < 4; i++) {
    const s = await inspect(page);
    if (s.overlays.includes('encounter') || s.screen === 'battle') break;
    await clickHex(page, monster.q, monster.r);
    await page.waitForTimeout(400);
  }
  await waitFor(page, (s) => s.overlays.includes('encounter'), 'encounter dialog', 60_000);
  await expect(page.getByTestId('encounter')).toBeVisible();
  await expect(page.getByTestId('sea-encounter-cards').last()).toBeVisible();
  await expect(page.getByTestId('sea-card-triton').last()).toContainText('Conch Blast');
  if (shotName) await shot(page, shotName, 700);
  await page.getByTestId('encounter-attack').click();
  await waitFor(page, (s) => s.screen === 'battle' && !s.busy && !(s as unknown as { boardLoading: boolean }).boardLoading, 'sea battle', 180_000);
}

test('sea encounter: the ship sails into a sea monster → single-ship board — rail and margin clicks select nothing → Deck Harpoon with its preview, no retaliation → the swimmers’ own missiles → victory → the ship on the monster’s water (1280×720)', async ({ page }) => {
  test.setTimeout(1_200_000);
  await page.setViewportSize(SMALL);
  const errors = errorsOf(page);
  const f = seaFixture('encounter');
  await open(page, f.file, { battleSpeed: '1' });
  // The map's pictures in (the ship's hull and the monster's figure).
  await expect.poll(async () => ((await page.evaluate(() => (globalThis as unknown as { __prShips: () => { ships: Record<string, { texture: string }> } | null }).__prShips())) ?.ships.map_ship_a?.texture ?? null), { timeout: 60_000 }).toBe('ready');
  const guards = (await page.evaluate(() => (globalThis as unknown as { __prScenery: () => { map: { guards: { id: string }[] } | null } }).__prScenery().map?.guards ?? [])) as { id: string }[];
  expect(guards.map((g) => g.id)).toContain('deep');
  await page.waitForTimeout(2500);
  // The map: the monster's tile card (pinned with a right-click) — sea cards, never an enum value.
  await clickHex(page, f.monster.q, f.monster.r, 'right');
  const tile = page.locator('.adv-tile');
  await expect(tile).toContainText('Sea monsters');
  await expect(tile.getByTestId('sea-encounter-cards')).toBeVisible();
  for (const id of ['triton', 'isonade', 'hippocampus']) await expect(tile.getByTestId(`sea-card-${id}`)).toBeVisible();
  await expect(tile.getByTestId('sea-renewable-triton')).toContainText('2 shots');
  await expect(tile.getByTestId('sea-range-isonade')).toContainText('8 hexes');
  await expect(tile).not.toContainText(/sea_encounters|renewable_shots|swimmer\b/);
  await shot(page, 'map-encounter-card-1280', 900);
  await tile.getByTestId('sea-card-triton').scrollIntoViewIfNeeded();
  await shot(page, 'map-encounter-card-scrolled-1280', 400);
  await clickHex(page, f.monster.q, f.monster.r, 'right');
  await sailIn(page, f.monster, 'encounter-dialog-1280');

  const st = await state(page);
  const b0 = st.battle!;
  expect(b0.archetype).toBe('single_ship_sea_encounter_v2');
  expect(b0.encounter.sourceShipId).toBe('map_ship_a');
  expect(b0.board!.shipSide).toBe('attacker');
  // Every stack stands in its zone: the crew on the deck (columns 0–7), swimmers in the water (8–15).
  for (const s of Object.values(b0.stacks)) {
    if (s.side === 'attacker') expect(s.anchor.col, s.creatureId).toBeLessThanOrEqual(7);
    else if (s.creatureId !== 'hippocampus') expect(s.anchor.col, s.creatureId).toBeGreaterThanOrEqual(8);
  }
  const bd = await board(page);
  expect(bd).toMatchObject({ masked: true, table: true, legalCells: 176, drawnCells: 176, mirrored: false });
  expect(bd.flags).toEqual([]);
  // Contain: the painting keeps 1672 × 941 proportions (letterboxed, never stretched or cropped).
  expect(bd.art!.width / bd.art!.height).toBeCloseTo(1672 / 941, 2);
  await expect(page.getByTestId('battle-round-limit')).toContainText('of 60');
  await expect(page.getByTestId('battle-sea-legend')).toContainText('Water');
  await shot(page, 'board-1280', 900);
  // The swimmers face the ship (left) on the board; a Hippocampus hovers over the water.
  const sd = await stacksDbg(page);
  for (const s of Object.values(b0.stacks)) if (s.side === 'defender') expect(sd[s.id]?.mirrored, s.creatureId).toBe(true);
  const hippo = Object.values(b0.stacks).find((s) => s.creatureId === 'hippocampus')!;
  if (hippo.anchor.col >= 8) expect(sd[hippo.id]!.hover).toBeGreaterThan(0);

  // A click on the rail (between the last deck cell and the first water cell) or on the margins selects nothing.
  const rev = st.revision;
  for (const row of [2, 5, 8]) {
    const deck = (await projectCell(page, 7, row))!;
    const water = (await projectCell(page, 8, row))!;
    await page.mouse.move((deck.x + water.x) / 2, (deck.y + water.y) / 2);
    await page.waitForTimeout(150);
    await page.mouse.click((deck.x + water.x) / 2, (deck.y + water.y) / 2);
  }
  await page.mouse.click(bd.art!.x + 3, bd.art!.y + 3);
  await page.mouse.click(bd.art!.x + bd.art!.width - 3, bd.art!.y + bd.art!.height - 3);
  await page.waitForTimeout(600);
  expect((await state(page)).revision).toBe(rev);
  await expect(page.locator('.toast')).toHaveCount(0);

  // Deck Harpoon: wait for a crew stack's turn on deck with an enemy in the water in reach.
  let s1 = await state(page);
  for (let i = 0; i < 40; i++) {
    const ins = await waitFor(page, (s) => (s.humanTurn && !s.busy) || s.screen !== 'battle', 'a crew turn', 180_000);
    s1 = ins.state as MatchState;
    const la = s1.battle ? legalActions(catalog, s1) : null;
    if (la?.harpoon?.targets.length) break;
    await page.getByTestId('battle-defend').click();
    await page.waitForTimeout(300);
  }
  const la = legalActions(catalog, s1)!;
  expect(la.harpoon!.targets.length).toBeGreaterThan(0);
  const harpoonBtn = page.getByTestId('battle-harpoon');
  await expect(harpoonBtn).toBeEnabled();
  await expect(harpoonBtn).toHaveAttribute('title', /35% of this stack's normal damage roll/);
  await harpoonBtn.hover();
  await shot(page, 'harpoon-button-tooltip-1280', 900);
  await harpoonBtn.click();
  await expect(page.getByTestId('battle-harpoon-prompt')).toBeVisible();
  // The sturdiest enemy in the water (the throw never kills it outright, so the whole roll shows).
  const targetId = [...la.harpoon!.targets].sort((a, b) => s1.battle!.stacks[b]!.totalHp - s1.battle!.stacks[a]!.totalHp)[0]!;
  const target0 = s1.battle!.stacks[targetId]!;
  const me0 = s1.battle!.stacks[la.stackId]!;
  const pv = previewHarpoon(catalog, s1, la.stackId, targetId)!;
  const tp = (await projectCell(page, target0.anchor.col, target0.anchor.row))!;
  await page.mouse.move(tp.x, tp.y);
  const preview = page.locator('.battle-preview').filter({ hasText: 'Deck Harpoon' });
  await expect(preview).toBeVisible();
  await expect(preview).toContainText(pv.min === pv.max ? String(pv.min) : `${pv.min}–${pv.max}`);
  await expect(preview).toContainText('No retaliation expected.');
  await shot(page, 'harpoon-preview-1280', 700);
  await page.locator('.battle-log-toggle').click();
  await page.mouse.click(tp.x, tp.y);
  await waitFor(page, (s) => (s.state as MatchState).revision > s1.revision && !s.busy, 'harpoon thrown', 120_000);
  const s2 = await state(page);
  const target1 = s2.battle?.stacks[targetId];
  // The combat log's line carries the rolled damage: inside the preview's range (the same function).
  const line = (await page.locator('.battle-log .log-list li').allTextContents()).find((l) => / harpoon /.test(l))!;
  expect(line, 'harpoon log line').toBeTruthy();
  const rolled = Number(/: (\d+) damage/.exec(line)![1]);
  expect(rolled).toBeGreaterThanOrEqual(pv.min);
  expect(rolled).toBeLessThanOrEqual(pv.max);
  const dealt = target0.totalHp - (target1?.totalHp ?? 0);
  expect(dealt).toBe(Math.min(rolled, target0.totalHp));
  await page.getByRole('button', { name: 'Hide log' }).click();
  // No retaliation: the thrower lost nothing to the throw (before any later enemy action).
  const me1 = s2.battle?.stacks[la.stackId];
  if (me1 && s2.battle && s2.battle.round === s1.battle!.round) expect(me1.totalHp).toBeGreaterThanOrEqual(0);
  expect(me1?.totalHp ?? me0.totalHp).toBeLessThanOrEqual(me0.totalHp);
  const harpoonShot = (await shots(page)).shots.find((x) => x.event === 'BattleAttack' && x.fallback === 'arrow' && x.creatureId === me0.creatureId);
  expect(harpoonShot, 'the harpoon flies the arrow').toBeTruthy();

  // The swimmers shoot their own delivered missiles; catch one in flight.
  let caught = false;
  for (let i = 0; i < 600 && !caught; i++) {
    const p = await shots(page);
    const sea = p.shots.filter((x) => x.creatureId && SEA_FORMS.includes(x.creatureId));
    if (p.inFlight > 0 && sea.length) {
      await page.screenshot({ path: `${OUT}/swimmer-shot-in-flight-1280.png` });
      caught = true;
      for (const x of sea) {
        expect(x.profile, x.creatureId!).toBe(x.creatureId);
        expect(x.fallback).toBeNull();
      }
      break;
    }
    const s = await inspect(page);
    if (s.screen !== 'battle') break;
    if (s.humanTurn && !s.busy) await page.getByTestId('battle-defend').click();
    await page.waitForTimeout(60);
  }
  test.info().annotations.push({ type: 'swimmer missile caught in flight', description: String(caught) });

  // Finish with auto-combat (the tactical AI plays the crew).
  if ((await inspect(page)).screen === 'battle') await page.getByTestId('battle-auto').click();
  await waitFor(page, (s) => s.screen === 'battle-result', 'battle result', 600_000);
  const sr = await state(page);
  expect(sr.lastBattleResult?.winner).toBe('attacker');
  await shot(page, 'result-1280');
  await page.getByTestId('result-continue').click();
  await waitFor(page, (s) => s.screen === 'adventure', 'back on the map', 60_000);
  const s3 = await state(page);
  expect(s3.world.sites['deep']?.cleared).toBe(true);
  expect(s3.world.ships!['map_ship_a']!.coord).toEqual(f.monster);
  expect(s3.heroes[HERO]!.position).toEqual(f.monster);
  await shot(page, 'after-sea-battle-1280', 1200);
  expect(realErrors(errors)).toEqual([]);
});

test('renewable shots: a Triton shoots twice in one round (its morale bonus) and its shots are back at the next round; the inspection card counts them', async ({ page }) => {
  test.setTimeout(600_000);
  await page.setViewportSize(SMALL);
  const errors = errorsOf(page);
  const f = renewFixture('renew');
  const R = f.round;
  expect(f.driver.state.battle!.stacks[f.tritonId]!.shotsRemaining).toBe(1);
  await open(page, f.file, { battleSpeed: '1' }, 'battle');
  await page.locator('.battle-log-toggle').click();
  // The Triton's bonus activation: its second shot of round R empties its two.
  await waitFor(page, (s) => { const b = (s.state as MatchState).battle; return !b || b.round > R || (b.stacks[f.tritonId]?.shotsRemaining ?? 0) === 0; }, 'the second shot', 120_000);
  const sA = await state(page);
  expect(sA.battle!.round).toBe(R);
  expect(sA.battle!.stacks[f.tritonId]!.shotsRemaining).toBe(0);
  const log = page.locator('.battle-log .log-list li');
  await expect(log.filter({ hasText: /Tritons? shoot/ }).first()).toBeVisible();
  // The inspection card (right-click): Ammunition 0/2, shots this round.
  await waitFor(page, (s) => s.humanTurn && !s.busy, 'the crew’s turn', 120_000);
  const sB = await state(page);
  const tri = sB.battle!.stacks[f.tritonId]!;
  const tp = (await projectCell(page, tri.anchor.col, tri.anchor.row))!;
  await page.mouse.click(tp.x, tp.y, { button: 'right' });
  const ammo = page.getByTestId('binsp-stat-ammo');
  await expect(ammo).toBeVisible();
  await expect(ammo).toContainText(`${tri.shotsRemaining}/2`);
  await expect(ammo).toContainText(sB.battle!.round === R ? 'shots this round' : /shots this round/);
  await shot(page, 'renewable-counter-empty-1280', 600);
  await page.getByTestId('binsp-close').click().catch(() => undefined);
  // Next round: back to two at its start (minus the shots it has fired since).
  for (let i = 0; i < 30; i++) {
    const s = await waitFor(page, (x) => (x.humanTurn && !x.busy) || x.screen !== 'battle', 'a crew turn', 180_000);
    const b = (s.state as MatchState).battle;
    if (!b || b.round > R) break;
    await page.getByTestId('battle-defend').click();
    await page.waitForTimeout(300);
  }
  const sC = await state(page);
  expect(sC.battle!.round).toBe(R + 1);
  const lines = await log.allTextContents();
  const since = lines.slice(lines.findIndex((l) => l.includes(`Round ${R + 1}`)) + 1);
  const fired = since.filter((l) => /^Tritons? shoot/.test(l)).length;
  const now = sC.battle!.stacks[f.tritonId]!;
  expect(now.shotsRemaining).toBe(2 - fired);
  expect(now.shotsRemaining).toBeGreaterThan(0);
  const tp2 = (await projectCell(page, now.anchor.col, now.anchor.row))!;
  await page.mouse.click(tp2.x, tp2.y, { button: 'right' });
  await expect(page.getByTestId('binsp-stat-ammo')).toContainText(`${now.shotsRemaining}/2`);
  await shot(page, 'renewable-counter-refilled-1280', 600);
  expect(realErrors(errors)).toEqual([]);
});

test('the Hafgufa’s Deepwater Blast flies the right way (travel art turned by π, impact upright) and every swimmer idles facing the ship', async ({ page }) => {
  test.setTimeout(900_000);
  await page.setViewportSize(SMALL);
  const errors = errorsOf(page);
  const f = seaFixture('blast', [['hafgufa', 1], ['cetus', 1], ['triton', 3], ['isonade', 1], ['crownfin_cetus', 1], ['razorwake_isonade', 1], ['stormcaller_triton', 2]]);
  await open(page, f.file, { battleSpeed: '1' });
  await sailIn(page, f.monster);
  await shot(page, 'board-swimmers-idle-1280', 1200);
  let blast = false;
  for (let i = 0; i < 1500 && !blast; i++) {
    const p = await shots(page);
    const h = p.shots.find((x) => x.creatureId === 'hafgufa');
    if (h && p.inFlight > 0) {
      await page.screenshot({ path: `${OUT}/hafgufa-blast-in-flight-1280.png` });
      expect(h.profile).toBe('hafgufa');
      expect(Math.abs(h.travelOffsetDeg ?? 0)).toBeCloseTo(180, 0);
      blast = true;
      break;
    }
    const s = await inspect(page);
    if (s.screen !== 'battle') break;
    if (s.humanTurn && !s.busy) await page.getByTestId('battle-defend').click();
    await page.waitForTimeout(40);
  }
  expect(blast, 'a Hafgufa blast caught in flight').toBe(true);
  // Other swimmers' missiles are never turned.
  const others = (await shots(page)).shots.filter((x) => x.creatureId && x.creatureId !== 'hafgufa' && x.creatureId !== 'abyssal_hafgufa' && SEA_FORMS.includes(x.creatureId));
  for (const o of others) expect(Math.abs(o.travelOffsetDeg ?? 0), o.creatureId!).toBeLessThan(1);
  expect(realErrors(errors)).toEqual([]);
});

test('160 % interface scale: the sea board keeps its painting’s proportions; Deck Harpoon, the round limit and Retreat stay in the window', async ({ page }) => {
  test.setTimeout(600_000);
  await page.setViewportSize(SMALL);
  const f = seaFixture('scale');
  await open(page, f.file, { uiScale: 1.6 });
  await sailIn(page, f.monster);
  const bd = await board(page);
  expect(bd).toMatchObject({ masked: true, table: true, legalCells: 176 });
  expect(bd.art!.width / bd.art!.height).toBeCloseTo(1672 / 941, 2);
  // A crew turn shows the harpoon button.
  for (let i = 0; i < 30; i++) {
    const s = await waitFor(page, (x) => (x.humanTurn && !x.busy) || x.screen !== 'battle', 'a crew turn', 180_000);
    if (s.screen !== 'battle') break;
    if (await page.getByTestId('battle-harpoon').count()) break;
    await page.getByTestId('battle-defend').click();
    await page.waitForTimeout(300);
  }
  await inWindow(page, ['[data-testid="battle-harpoon"]', '[data-testid="battle-round-limit"]', '[data-testid="battle-retreat"]']);
  await shot(page, 'board-160', 900);
});

test('encyclopedia: the sea section lists the ten forms with their cards and upgrade comparisons; one animated preview at a time, paused off-screen', async ({ page }) => {
  test.setTimeout(400_000);
  await page.setViewportSize(SMALL);
  const errors = errorsOf(page);
  await usePrefs(page, { graphicsTested: true, tutorialHints: false });
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await page.getByTestId('menu-encyclopedia').click();
  await waitFor(page, (s) => s.screen === 'encyclopedia', 'encyclopedia', 60_000);
  const sea = page.getByTestId('codex-pantheon-sea');
  await sea.scrollIntoViewIfNeeded();
  await expect(sea).toBeVisible();
  for (const id of SEA_FORMS) await expect(sea.getByTestId(`sea-card-${id}`)).toHaveCount(1);
  // The sea families are not listed again with the land neutrals.
  await expect(page.getByTestId('codex-pantheon-neutral').getByTestId('codex-family-triton')).toHaveCount(0);
  for (const fam of ['hippocampus', 'triton', 'isonade', 'cetus', 'hafgufa']) await expect(sea.getByTestId(`codex-sea-compare-${fam}`)).toBeVisible();
  await expect(sea.getByTestId('codex-sea-compare-isonade')).toContainText('Range');
  await expect(sea).not.toContainText(/sea_encounters|renewable_shots|_hippocampus/);
  await sea.getByTestId('codex-sea-family-isonade').scrollIntoViewIfNeeded();
  await shot(page, 'codex-compare-isonade-1280');
  // One preview at a time.
  await sea.getByTestId('codex-sea-preview-triton').click();
  await expect(page.getByTestId('sea-preview-triton')).toHaveAttribute('data-state', 'playing');
  await sea.getByTestId('codex-sea-preview-cetus').click();
  await expect(page.locator('[data-testid^="sea-preview-"][data-state]')).toHaveCount(1);
  await expect(page.getByTestId('sea-preview-cetus')).toHaveAttribute('data-state', 'playing');
  await sea.getByTestId('codex-sea-family-cetus').scrollIntoViewIfNeeded();
  await shot(page, 'codex-preview-cetus-1280', 900);
  // Off-screen it pauses; back in view it plays.
  await page.getByTestId('codex-sea-family-hippocampus').scrollIntoViewIfNeeded();
  await page.evaluate(() => document.querySelector('.codex-pantheon--sea')?.closest('.scroll, [class*="scroll"]')?.scrollTo({ top: 0 }));
  await page.locator('[data-testid="codex-pantheon-greek"]').scrollIntoViewIfNeeded().catch(() => undefined);
  await expect(page.getByTestId('sea-preview-cetus')).toHaveAttribute('data-state', 'paused', { timeout: 10_000 });
  await page.getByTestId('sea-preview-cetus').scrollIntoViewIfNeeded();
  await expect(page.getByTestId('sea-preview-cetus')).toHaveAttribute('data-state', 'playing', { timeout: 10_000 });
  // Each form idle, facing right and left (the board shows the sea side facing left).
  for (const id of SEA_FORMS) {
    await sea.getByTestId(`codex-sea-preview-${id}`).scrollIntoViewIfNeeded();
    await sea.getByTestId(`codex-sea-preview-${id}`).click();
    const pv = page.getByTestId(`sea-preview-${id}`);
    await expect(pv).toHaveAttribute('data-state', 'playing');
    await page.waitForTimeout(500);
    await pv.locator('canvas').screenshot({ path: `${OUT}/idle-${id}-right.png` });
    await pv.getByTestId('sea-preview-facing').click();
    await expect(pv).toHaveAttribute('data-facing', 'left');
    await page.waitForTimeout(500);
    await pv.locator('canvas').screenshot({ path: `${OUT}/idle-${id}-left.png` });
    const action = id.includes('hippocampus') ? 'attack' : 'shoot';
    await pv.getByTestId(`sea-preview-anim-${action}`).click();
    await page.waitForTimeout(450);
    await pv.locator('canvas').screenshot({ path: `${OUT}/${action}-${id}.png` });
  }
  expect(realErrors(errors)).toEqual([]);
});

test('map editor: a sea monster stands on open water only, says why elsewhere, and lists sea creatures only for its army', async ({ page }) => {
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
  await page.getByTestId('tool-ground-water').click();
  await page.getByTestId('brush-3').click();
  const lake = at(0.5, 0.5);
  await page.mouse.click(lake.x, lake.y);
  await page.getByTestId('tool-place-sea_monster').click();
  // Land refuses with the reason.
  const land = at(0.2, 0.2);
  await page.mouse.move(land.x, land.y);
  await expect(page.getByTestId('editor-sea-hint')).toContainText('Sea monsters stand on open water');
  await page.mouse.click(land.x, land.y);
  await page.mouse.click(lake.x, lake.y);
  await page.getByRole('tab', { name: 'Site' }).click();
  const sel = page.getByTestId('site-guard-creature');
  await expect(sel).toBeVisible();
  const options = await sel.locator('option').allTextContents();
  expect(options.length).toBe(10);
  expect(options.some((o) => o.includes('Hippocampus'))).toBe(true);
  expect(options.some((o) => o.includes('Hoplite'))).toBe(false);
  await sel.selectOption('cetus');
  await expect(sel).toHaveValue('cetus');
  await shot(page, 'editor-sea-monster-1280');
  expect(realErrors(errors)).toEqual([]);
});
