import { expect, test, type Page } from '@playwright/test';
import { GameDriver } from '@pr/testing';
import { legalActions, quoteMovement, routeDays, withSharedPaths, type HexCoord, type MatchState } from '@pr/rules';
import { clickHex, inspect, waitFor } from './helpers';
import { approachTile, importAndLoad, skirmishDriver, slots, writeSave } from './fixtures';

/**
 * Owner round 2026-10-14 (app 1.1.5):
 * - The Three Beacons, mission 2: one objective — train 2 Griffins — played in town.
 * - No gold scroll rail between the panels over the map's left side.
 * - A computer hero attacking the player: the player's army stands on the left, in blue
 *   (the board is drawn mirrored; the rules, cells and clicks stay right).
 * - Beyond today's movement: the day the hero arrives, beside the cursor.
 * The Silent Oracle (the second Greek campaign) starts from New Game in round3.spec.ts and is
 * listed second in frontend110.spec.ts.
 */

// Real scroll bars, as on Windows (headless Chromium hides them by default).
test.use({ launchOptions: { ignoreDefaultArgs: ['--hide-scrollbars'] } });

async function load(page: Page, file: string) {
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await importAndLoad(page, file);
}

const project = (page: Page, kind: 'battle' | 'adventure', a: number, b: number) =>
  page.evaluate(([k, x, y]) => (globalThis as unknown as { __prProject: (k: string, a: number, b: number) => { x: number; y: number } | null }).__prProject(k as string, x as number, y as number), [kind, a, b] as const);

async function clickCell(page: Page, col: number, row: number) {
  let p = await project(page, 'battle', col, row);
  for (let i = 0; i < 30 && !p; i++) {
    await page.waitForTimeout(100);
    p = await project(page, 'battle', col, row);
  }
  if (!p) throw new Error(`cell ${col},${row} not on screen`);
  await page.mouse.move(p.x, p.y);
  await page.waitForTimeout(80);
  await page.mouse.down();
  await page.mouse.up();
}

test('Three Beacons mission 2: only "Train 2 Griffins", done in Passhaven without leaving town', async ({ page }) => {
  test.setTimeout(240_000);
  const d = GameDriver.mission('three_beacons_m02', { matchId: 'e2e-115-m02' });
  d.do({ kind: 'BuildStructure', townId: 'passhaven', buildingId: 'griffin_aerie' });
  d.endDay();
  d.do({ kind: 'BuildStructure', townId: 'passhaven', buildingId: 'griffin_aerie_up' });
  d.do({ kind: 'RecruitUnits', townId: 'passhaven', creatureId: 'griffin', quantity: 3, destination: { kind: 'garrison' } });
  const home = { ...d.hero().position };
  await load(page, writeSave(d, '1.1.5 m02'));
  await waitFor(page, (s) => s.screen === 'adventure', 'map');
  const items = page.locator('.adv-objectives .objective-mini li');
  await expect(items).toHaveCount(1);
  await expect(items.first()).toHaveText(/Train 2 Griffins/);
  // Train them one at a time on the recruitment screen.
  await page.getByTestId('town-tab-passhaven').click();
  await waitFor(page, (s) => s.screen === 'town', 'town');
  await page.getByTestId('town-recruit').click();
  await waitFor(page, (s) => s.screen === 'recruitment', 'recruitment');
  // The Griffins' dwelling card selects the family; its training sits in the dock (2026-10-14 layout).
  await page.getByTestId('recruit-tier-3').click();
  await page.getByTestId('train-griffin').click();
  let s = await waitFor(page, (x) => x.state.mission.counters['trained:griffin'] === 1, 'one trained');
  expect(s.state.outcome.status).toBe('running');
  await page.getByTestId('train-griffin').click();
  for (let i = 0; i < 20; i++) {
    s = await inspect(page);
    if (s.state.outcome.status === 'victory') break;
    if (s.screen === 'level-up') await page.getByTestId('offer-0').click();
    await page.waitForTimeout(400);
  }
  expect(s.state.outcome.status).toBe('victory');
  expect(s.state.heroes.alexios.position).toEqual(home);
});

test('the left column over the map draws no scroll rail (no gold line between the panels)', async ({ page }) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 1920, height: 1080 });
  // The Storm Beacon lists six objectives; a pinned forest tile adds the tile panel above them.
  const d = GameDriver.mission('three_beacons_m03', { matchId: 'e2e-115-rail' });
  for (const fog of Object.values(d.state.fog)) fog.explored = fog.explored.map(() => 1);
  const hero = d.hero().position;
  const map = d.state.world.map;
  let forest: HexCoord | null = null;
  for (let r = 0; r < map.height && !forest; r++) for (let q = 0; q < map.width; q++) if (map.terrain[r * map.width + q] === 'forest' && Math.abs(q - hero.q) + Math.abs(r - hero.r) < 8) forest = { q, r };
  await load(page, writeSave(d, '1.1.5 rail'));
  await waitFor(page, (s) => s.screen === 'adventure', 'map');
  if (forest) await clickHex(page, forest.q, forest.r, 'right');
  await page.waitForTimeout(600);
  const col = await page.evaluate(() => {
    const el = document.querySelector('.adv-left.adv-info') as HTMLElement;
    return { client: el.clientWidth, offset: el.offsetWidth, scrollbar: getComputedStyle(el).scrollbarWidth, overflowY: getComputedStyle(el).overflowY };
  });
  // No scroll bar takes width (Windows-style bars are on in this file), and the column still scrolls if it must.
  expect(col.scrollbar).toBe('none');
  expect(col.client).toBe(col.offset);
  expect(col.overflowY).toBe('auto');
  await page.screenshot({ path: 'test-results/owner115-left-column.png' });
});

test('a computer hero attacks the player: the player stands on the left in blue, and clicks still land on the right cells', async ({ page }) => {
  test.setTimeout(300_000);
  await page.setViewportSize({ width: 1600, height: 1000 });
  const d = skirmishDriver();
  const alexios = d.state.heroes['alexios']!;
  alexios.army.slots = slots([['hoplite', 20], ['peltast', 10], ['cyclops', 2]]);
  const at = { q: alexios.position.q + 3, r: alexios.position.r };
  alexios.position = at;
  const rival = d.state.heroes['rival_odysseus']!;
  rival.army.slots = slots([['hoplite', 12], ['peltast', 8]]);
  rival.position = approachTile(d, at, rival.id);
  d.state.activePlayerId = 'rival';
  d.do({ kind: 'MoveHero', heroId: rival.id, destination: at, confirmEncounter: true }, 'rival');
  expect(d.state.battle?.sides.defender.controller).toBe('human');
  await load(page, writeSave(d, '1.1.5 defend'));
  let s = await waitFor(page, (x) => x.screen === 'battle' && !x.busy && !x.boardLoading, 'battle', 90_000);
  const siege = await page.evaluate(() => (globalThis as unknown as { __prSiege: () => { mirrored: boolean } }).__prSiege());
  expect(siege.mirrored).toBe(true);
  // The header: the player's side (the defender) first, in the left place.
  await expect(page.locator('.battle-top .battle-side').first()).toHaveAttribute('data-side', 'defender');
  await expect(page.locator('.battle-top .battle-side').first()).toHaveClass(/battle-side--att/);
  await expect(page.locator('.battle-top .battle-side').first()).toHaveClass(/tone-blue/);
  // Every stack of the player is drawn left of every enemy stack, facing right; turn order blue for the player.
  const stacks = (await page.evaluate(() => (globalThis as unknown as { __prBattle: () => Record<string, { x: number; mirrored: boolean; down: boolean }> }).__prBattle())) as Record<string, { x: number; mirrored: boolean; down: boolean }>;
  const battle = s.state.battle as { stacks: Record<string, { side: string; totalHp: number; anchor: { col: number; row: number } }>; activeStackId: string };
  const mine = Object.entries(stacks).filter(([id]) => battle.stacks[id]?.side === 'defender' && battle.stacks[id]!.totalHp > 0);
  const theirs = Object.entries(stacks).filter(([id]) => battle.stacks[id]?.side === 'attacker' && battle.stacks[id]!.totalHp > 0);
  expect(mine.length).toBeGreaterThan(0);
  expect(Math.max(...mine.map(([, v]) => v.x))).toBeLessThan(Math.min(...theirs.map(([, v]) => v.x)));
  for (const [, v] of mine) expect(v.mirrored).toBe(false);
  for (const [, v] of theirs) expect(v.mirrored).toBe(true);
  for (const id of Object.keys(battle.stacks)) {
    const tone = battle.stacks[id]!.side === 'defender' ? 'blue' : 'red';
    const el = page.locator(`.turn-order__item.side-${battle.stacks[id]!.side}`).first();
    if (await el.count()) await expect(el).toHaveClass(new RegExp(`tone-${tone}`));
  }
  await page.screenshot({ path: 'test-results/owner115-defend.png' });
  // On the player's turn, a click on a reachable cell moves the active stack exactly there (pointer mapping on a mirrored board).
  s = await waitFor(page, (x) => x.humanTurn && !x.busy, 'player turn', 120_000);
  const active = (s.state.battle as typeof battle).activeStackId;
  const before = (s.state.battle as typeof battle).stacks[active]!.anchor;
  const moves = legalActions(d.catalog, s.state as MatchState)?.moves ?? [];
  expect(moves.length).toBeGreaterThan(0);
  // The legal cell farthest toward the enemy: west on the board, which a mirrored board draws to the right.
  const target = [...moves].sort((a, b) => a.col - b.col || Math.abs(a.row - before.row) - Math.abs(b.row - before.row))[0]!;
  await clickCell(page, target.col, target.row);
  await page.waitForTimeout(300);
  // First click previews the route, a second click on the same cell commits (when the game asks for it).
  if ((await inspect(page)).state.battle?.stacks[active]?.anchor.col === before.col) await clickCell(page, target.col, target.row);
  s = await waitFor(page, (x) => {
    const b = x.state.battle as typeof battle | null;
    return !b || b.stacks[active]?.anchor.col !== before.col || b.stacks[active]?.anchor.row !== before.row;
  }, 'the stack moved', 30_000);
  const after = (s.state.battle as typeof battle | null)?.stacks[active]?.anchor;
  if (after) expect(after).toEqual(target);
});

test('beyond today’s movement: the day of arrival rides beside the cursor', async ({ page }) => {
  test.setTimeout(240_000);
  await page.setViewportSize({ width: 1600, height: 1000 });
  const d = skirmishDriver();
  const hero = d.state.heroes['alexios']!;
  await load(page, writeSave(d, '1.1.5 days'));
  await waitFor(page, (s) => s.screen === 'adventure', 'map');
  await page.waitForTimeout(1000);
  // The farthest reachable tile on the visible map that needs more than today (candidates found headless, farthest first).
  const candidates: { c: HexCoord; cost: number; days: number }[] = [];
  withSharedPaths(() => {
    for (let r = 0; r < d.state.world.map.height; r++) {
      for (let q = 0; q < d.state.world.map.width; q++) {
        const quote = quoteMovement(d.catalog, d.state, hero.id, { q, r });
        if (!quote.reachable || quote.reachesDestinationToday || quote.endsInEncounter) continue;
        candidates.push({ c: { q, r }, cost: quote.totalCost, days: routeDays(d.catalog, d.state, hero.id, quote)! });
      }
    }
  });
  candidates.sort((a, b) => b.cost - a.cost);
  // All projections in one call (one round trip, not one per tile).
  const pts = await page.evaluate((cs) => cs.map((c) => (globalThis as unknown as { __prProject: (k: string, a: number, b: number) => { x: number; y: number } | null }).__prProject('adventure', c.q, c.r)), candidates.map((x) => x.c));
  const i = pts.findIndex((p) => !!p && p.x >= 360 && p.x <= 1180 && p.y >= 140 && p.y <= 840);
  const far: HexCoord | null = i >= 0 ? candidates[i]!.c : null;
  const farDays = i >= 0 ? candidates[i]!.days : 0;
  expect(far).not.toBeNull();
  expect(farDays).toBeGreaterThanOrEqual(2);
  const p = (await project(page, 'adventure', far!.q, far!.r))!;
  await page.mouse.move(p.x, p.y, { steps: 4 });
  const badge = page.getByTestId('route-days');
  await expect(badge).toHaveText(String(farDays));
  const box = (await badge.boundingBox())!;
  // Just right of the 32 px cursor whose hotspot is its centre.
  expect(box.x).toBeGreaterThan(p.x + 10);
  expect(box.x).toBeLessThan(p.x + 30);
  expect(Math.abs(box.y + box.height / 2 - (p.y + 12))).toBeLessThan(14);
  // The planned journey's bar names the day of arrival too (2026-10-14: Arrives tomorrow / in N turns).
  await page.mouse.down();
  await page.mouse.up();
  await expect(page.getByTestId('journey-status')).toContainText(farDays === 2 ? 'Arrives tomorrow' : `Arrives in ${farDays} turns`);
  // A tile reached today: no badge.
  const near = { q: hero.position.q + 2, r: hero.position.r };
  const pn = (await project(page, 'adventure', near.q, near.r))!;
  await page.mouse.move(pn.x, pn.y, { steps: 4 });
  await expect(badge).toHaveCount(0);
});
