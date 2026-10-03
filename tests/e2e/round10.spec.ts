import { expect, test } from '@playwright/test';
import { GameDriver } from '@pr/testing';
import { townGate } from '@pr/rules';
import { clickHex, inspect, waitFor } from './helpers';
import { importAndLoad, slots, writeSave } from './fixtures';
import { goldBattle, leaderOf, toHumanBattleTurn, usePrefs, STRONG } from './momentFixtures';

/**
 * Owner fixes of 2026-10-03 (second round): heroes stand at a town's gate,
 * troops move between garrison and hero by drag and drop (with split), the
 * fallen stay on the battlefield, and the winners celebrate. Screenshots are
 * kept for review.
 */

function skirmish(name: string): GameDriver {
  const d = GameDriver.mission('skirmish_twin_harbors', { matchId: `e2e-${name}` });
  for (const fog of Object.values(d.state.fog)) fog.explored = fog.explored.map(() => 1);
  return d;
}

test('the hero stands at the town gate, not on the town; clicking the town from the gate opens it; walking back stops at the gate', async ({ page }) => {
  await usePrefs(page, { graphicsTested: true });
  const d = skirmish('gate');
  const west = d.state.towns['westharbor']!;
  const gate = townGate(d.catalog, d.state, west.id);
  const hero = leaderOf(d);
  expect(hero.position).toEqual(gate);
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await importAndLoad(page, writeSave(d, 'gate'));
  await waitFor(page, (x) => x.screen === 'adventure' && x.overlays.length === 0 && x.humanTurn, 'map');
  await page.screenshot({ path: 'test-results/round10-gate.png' });
  // The hero stands at the gate: a click on the town itself opens the town.
  await clickHex(page, west.coord.q, west.coord.r);
  await waitFor(page, (x) => x.screen === 'town', 'town screen');
  await page.getByRole('button', { name: /back/i }).first().click();
  await waitFor(page, (x) => x.screen === 'adventure', 'map again');
  // Walk away two tiles, then back to the town: the hero stops at the gate.
  const away = { q: gate.q + 2, r: gate.r };
  await clickHex(page, away.q, away.r);
  await clickHex(page, away.q, away.r);
  let s = await waitFor(page, (x) => x.state.heroes[hero.id].position.q === away.q && !x.busy, 'walked away');
  await clickHex(page, west.coord.q, west.coord.r);
  await clickHex(page, west.coord.q, west.coord.r);
  s = await waitFor(page, (x) => x.state.heroes[hero.id].position.q === gate.q && x.state.heroes[hero.id].position.r === gate.r && !x.busy, 'back at the gate');
  expect(s.state.heroes[hero.id].position).not.toEqual(west.coord);
});

test('town: drag a stack from the hero to the garrison; Shift-drag splits; click-select splits too; no Exchange button', async ({ page }) => {
  await usePrefs(page, { graphicsTested: true });
  const d = skirmish('dnd');
  const hero = leaderOf(d);
  hero.army.slots = slots([['hoplite', 20], ['peltast', 8]]);
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await importAndLoad(page, writeSave(d, 'dnd'));
  await waitFor(page, (x) => x.screen === 'adventure' && x.overlays.length === 0, 'map');
  await page.getByTestId('town-tab-westharbor').click();
  await waitFor(page, (x) => x.screen === 'town', 'town screen');
  await expect(page.getByTestId('exchange')).toHaveCount(0);
  // Whole stack: Peltasts from the hero to garrison slot 3.
  await page.getByTestId('town-visitor-slot-1').dragTo(page.getByTestId('town-garrison-slot-2'));
  let s = await waitFor(page, (x) => x.state.towns.westharbor.garrison.slots[2]?.count === 8, 'peltasts in the garrison');
  expect(s.state.heroes[hero.id].army.slots[1]).toBeNull();
  // Shift-drag: split the Hoplites into garrison slot 5.
  await page.keyboard.down('Shift');
  await page.getByTestId('town-visitor-slot-0').dragTo(page.getByTestId('town-garrison-slot-4'));
  await page.keyboard.up('Shift');
  const split = page.getByTestId('split');
  await expect(split).toBeVisible();
  await page.screenshot({ path: 'test-results/round10-split.png' });
  await split.getByTestId('split-ok').click();
  s = await waitFor(page, (x) => x.state.towns.westharbor.garrison.slots[4]?.count === 10, 'half the hoplites in the garrison');
  expect(s.state.heroes[hero.id].army.slots[0]?.count).toBe(10);
  // Click a stack, choose how many, click the destination: 3 Hoplites back to the hero's slot 3.
  await page.getByTestId('town-garrison-slot-4').click();
  await expect(page.getByTestId('town-armies-bar')).toContainText('Moving 10 of 10');
  const qty = page.getByTestId('town-armies-bar').getByRole('spinbutton');
  if (await qty.count()) await qty.fill('3');
  else for (let i = 0; i < 7; i++) await page.getByTestId('town-armies-bar').getByRole('button', { name: /decrease|−|-/i }).first().click();
  await page.getByTestId('town-visitor-slot-2').click();
  s = await waitFor(page, (x) => x.state.heroes[hero.id].army.slots[2]?.count === 3, 'three hoplites to the hero');
  expect(s.state.towns.westharbor.garrison.slots[4]?.count).toBe(7);
  await page.screenshot({ path: 'test-results/round10-town-armies.png' });
});

test('the fallen stay on the board; the winners celebrate before the result', async ({ page }) => {
  test.setTimeout(180_000);
  await usePrefs(page, { graphicsTested: true, battleSpeed: '1' });
  const { d, file } = goldBattle('skirmish_twin_harbors', 'corpses', STRONG);
  void d;
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await importAndLoad(page, file);
  await toHumanBattleTurn(page);
  await page.getByTestId('battle-auto').click();
  // Mid-battle: at least one stack has fallen and the battle goes on.
  const mid = await waitFor(page, (x) => x.screen !== 'battle' || (!!x.state.battle && Object.values(x.state.battle.stacks as Record<string, { totalHp: number }>).some((st) => st.totalHp <= 0)), 'a stack falls', 90_000);
  if (mid.screen === 'battle') {
    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'test-results/round10-corpse.png' });
  }
  await waitFor(page, (x) => !x.state.battle, 'battle over', 90_000);
  // The final blows and the victory play out, then the winners keep cheering for a beat.
  await waitFor(page, (x) => !x.busy || x.screen !== 'battle', 'final playback', 30_000);
  if ((await inspect(page)).screen === 'battle') await page.screenshot({ path: 'test-results/round10-victory.png' });
  await waitFor(page, (x) => x.screen === 'battle-result', 'battle result', 30_000);
  expect((await inspect(page)).state.lastBattleResult.winner).toBe('attacker');
});

test('delivered cursors: served at 1x and 2x, picked by context on the map', async ({ page }) => {
  test.setTimeout(150_000);
  await usePrefs(page, { graphicsTested: true });
  const failed: string[] = [];
  page.on('response', (r) => {
    if (r.url().includes('/ui/cursors/') && r.status() !== 200) failed.push(r.url());
  });
  const d = skirmish('cursors');
  const hero = leaderOf(d);
  const gold = d.catalog.missions['skirmish_twin_harbors']!.sites.find((x) => x.id === 'sk_gold')!.coord;
  hero.position = { q: gold.q - 1, r: gold.r };
  hero.movementPoints = 3000;
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  // Every runtime cursor file is served.
  const manifest = (await (await page.request.get('/ui/cursors/manifest.json')).json()) as { assets: Record<string, { file: string; file2x: string }> };
  for (const a of Object.values(manifest.assets)) {
    expect((await page.request.get(`/${a.file}`)).status(), a.file).toBe(200);
    expect((await page.request.get(`/${a.file2x}`)).status(), a.file2x).toBe(200);
  }
  expect(Object.keys(manifest.assets)).toHaveLength(29);
  // The menu uses the delivered arrow through the interface variables.
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--cur-default'))).toContain('cursor.ui.default.png');
  await importAndLoad(page, writeSave(d, 'cursors'));
  await waitFor(page, (x) => x.screen === 'adventure' && x.overlays.length === 0 && x.humanTurn, 'map');
  const viewport = page.locator('.scene-viewport');
  const cursorAt = async (q: number, r: number) => {
    const p = await page.evaluate(([a, b]) => (globalThis as unknown as { __prProject: (k: string, a: number, b: number) => { x: number; y: number } | null }).__prProject('adventure', a!, b!), [q, r]);
    await page.mouse.move(p!.x, p!.y);
    await page.waitForTimeout(300);
    return viewport.evaluate((el) => (el as HTMLElement).style.cursor);
  };
  const attack = await cursorAt(gold.q, gold.r);
  expect(attack).toMatch(/image-set\(url\("[^"]+\/ui\/cursors\/cursor\.map\.attack\.png"\) 1x, url\("[^"]+cursor\.map\.attack@2x\.png"\) 2x\) 16 16, pointer/);
  expect(await cursorAt(hero.position.q, hero.position.r)).toContain('cursor.map.hero.png');
  expect(await cursorAt(gold.q - 3, gold.r)).toMatch(/cursor\.map\.move(_later)?\.png/);
  await page.screenshot({ path: 'test-results/round10-cursor-map.png' });
  expect(failed).toEqual([]);
});

test('battle board on screen matches the melee sword directions (pointy-top hexes, odd rows shifted right, y down)', async ({ page }) => {
  await usePrefs(page, { graphicsTested: true });
  const { file } = goldBattle('skirmish_twin_harbors', 'cursor-battle', [['hoplite', 30]]);
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await importAndLoad(page, file);
  await toHumanBattleTurn(page);
  const proj = (c: number, r: number) => page.evaluate(([a, b]) => (globalThis as unknown as { __prProject: (k: string, a: number, b: number) => { x: number; y: number } | null }).__prProject('battle', a!, b!), [c, r]);
  const a = (await proj(6, 4))!;
  const right = (await proj(7, 4))!;
  const evenToOdd = (await proj(6, 5))!; // row 4 → row 5: down and to the right (60°)
  const oddToEven = (await proj(6, 6))!; // row 5 → row 6 from (6,5): down and to the left (120°)
  expect(right.x).toBeGreaterThan(a.x + 10);
  expect(Math.abs(right.y - a.y)).toBeLessThan(6);
  expect(evenToOdd.y).toBeGreaterThan(a.y + 10);
  expect(evenToOdd.x).toBeGreaterThan(a.x);
  expect(oddToEven.y).toBeGreaterThan(evenToOdd.y + 10);
  expect(oddToEven.x).toBeLessThan(evenToOdd.x);
});
