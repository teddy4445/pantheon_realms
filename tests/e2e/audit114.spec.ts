import { expect, test, type Page, type Route } from '@playwright/test';
import { GameDriver } from '@pr/testing';
import { inspect, waitFor } from './helpers';
import { approachTile, importAndLoad, slots, writeSave } from './fixtures';
import { goldBattle, STRONG, toHumanBattleTurn, usePrefs } from './momentFixtures';

/**
 * The 1.1.2 GUI audit (docs/gui-audit-1.1.2/CLAUDE_HANDOFF.txt), through the real screens from
 * ordinary save fixtures:
 *   1. the six-pantheon siege gate (assets-runtime/siege-gates-v3): every state on the gate cell, no
 *      drift between states, the wall cells beside it drawn by the gate while their sections stand
 *      and their rubble when they fall, and a creature walking through the breach between the gate's
 *      north and south parts;
 *   2. Start battle (and Auto: on) readable on the painted face;
 *   3. settings labels in ink on parchment, gold on the dark panels;
 *   4. the book and the briefing scroll: plain paper under the ink while the picture loads or fails;
 *   5. no internal caption over the delivered town art;
 *   6. a battle takes no orders before its painting and stacks are drawn (delayed and failed pictures).
 * Screenshots for review in test-results/audit114/.
 */

const OUT = 'test-results/audit114';
const PANTHEONS = ['greek', 'norse', 'egyptian', 'japanese', 'celtic', 'mesoamerican'] as const;

function watch(page: Page): { urls: string[]; errors: string[] } {
  const urls: string[] = [];
  const errors: string[] = [];
  page.on('response', (r) => {
    if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`);
    else urls.push(r.url());
  });
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && !/favicon|Failed to load resource/i.test(m.text()) && errors.push(m.text()));
  return { urls, errors };
}

/** A fresh page (no saves from the previous step), then Load → Import → load. */
async function load(page: Page, file: string, waitUntil: 'networkidle' | 'load' = 'networkidle'): Promise<void> {
  await page.goto('/?e2e', { waitUntil });
  await page.evaluate(
    () =>
      new Promise<void>((done) => {
        const req = indexedDB.deleteDatabase('pantheon-realms');
        req.onsuccess = req.onerror = req.onblocked = () => done();
      }),
  );
  await page.goto('/?e2e', { waitUntil });
  await page.getByTestId('menu-load').waitFor();
  await importAndLoad(page, file);
}

type Hp = Record<string, number | 'max' | 'dmg'>;

/** The player's leader attacks Eastharbor rebuilt as a `pantheon` town with fortifications of `level`; structure HP as given. */
function siegeDriver(pantheon: string, hp: Hp, opts: { level?: 2 | 3; army?: [string, number][]; garrison?: [string, number][]; tactics?: boolean } = {}): GameDriver {
  const d = GameDriver.mission('skirmish_twin_harbors', { matchId: `e2e-a114-${pantheon}` });
  for (const fog of Object.values(d.state.fog)) fog.explored = fog.explored.map(() => 1);
  const arch = Object.values(d.catalog.townArchetypes).find((a) => a.pantheonId === pantheon)!;
  const east = d.state.towns['eastharbor']!;
  east.archetypeId = arch.id;
  east.pantheonId = arch.pantheonId;
  east.buildings['fortifications'] = opts.level ?? 3;
  east.garrison.slots = slots(opts.garrison ?? [['hoplite', 4]]);
  d.state.heroes['rival_odysseus']!.position = { q: 25, r: 3 };
  const hero = d.state.heroes['alexios']!;
  if (opts.tactics) hero.skills.push({ skillId: 'tactics', rank: 2 });
  hero.army.slots = slots(opts.army ?? [['hoplite', 30], ['peltast', 20], ['cyclops', 4]]);
  hero.movementPoints = 3000;
  hero.position = approachTile(d, east.coord, hero.id);
  d.do({ kind: 'MoveHero', heroId: hero.id, destination: east.coord, confirmEncounter: true });
  for (const s of d.state.battle!.siege!.structures) {
    const v = hp[s.id] ?? 'max';
    s.hp = v === 'max' ? s.maxHp : v === 'dmg' ? Math.max(1, s.maxHp - 1) : v;
  }
  return d;
}

interface SiegeDebug {
  ready: boolean;
  gate: { file: string; frame: number[]; hp: number; row: number; passage: { x: number; y: number }; passagePage: { x: number; y: number }; depths: number[]; north: string; south: string } | null;
  wallRows: number[];
  stacks: Record<string, { depth: number; x: number; y: number; col: number; row: number }>;
}
const siegeDebug = (page: Page) => page.evaluate(() => (globalThis as unknown as { __prSiege: () => SiegeDebug | null }).__prSiege());

async function gateShot(page: Page, name: string): Promise<void> {
  const d = (await siegeDebug(page))!;
  const p = d.gate!.passagePage;
  await page.screenshot({ path: `${OUT}/${name}.png`, clip: { x: Math.max(0, p.x - 210), y: Math.max(0, p.y - 230), width: 420, height: 460 } });
}

const SCENES: { name: string; hp: Hp; frame: number; walls: 'standing' | 'fallen' }[] = [
  { name: 'intact', hp: { gate: 'max' }, frame: 0, walls: 'standing' },
  { name: 'damaged', hp: { gate: 'dmg' }, frame: 512, walls: 'standing' },
  { name: 'breached', hp: { gate: 0 }, frame: 1024, walls: 'standing' },
  { name: 'breached-walls-fallen', hp: { gate: 0, wall_2: 0, wall_3: 0 }, frame: 1024, walls: 'fallen' },
];

test.describe.configure({ mode: 'serial' });

for (const p of PANTHEONS) {
  test(`siege gate, ${p}: intact, damaged and breached on the gate cell; joined walls standing and fallen`, async ({ page }) => {
    test.setTimeout(420_000);
    const { urls, errors } = watch(page);
    let passage: { x: number; y: number } | null = null;
    for (const scene of SCENES) {
      await load(page, writeSave(siegeDriver(p, scene.hp), `a114 ${p} ${scene.name}`));
      await toHumanBattleTurn(page);
      await expect.poll(async () => (await siegeDebug(page))?.ready, { message: `${p} ${scene.name}: board ready`, timeout: 30_000 }).toBe(true);
      await page.waitForTimeout(400);
      const d = (await siegeDebug(page))!;
      // Only the delivered v5 atlas of the pantheon, the frame of the state the rules give (HP from the save).
      expect(d.gate, `${p} ${scene.name}: wall gate`).not.toBeNull();
      expect(d.gate!.file).toBe(`siege-gates-v3/gate.${p}-v5.png`);
      expect(d.gate!.frame).toEqual([scene.frame, 0, 512, 1024]);
      expect(d.gate!.row).toBe(5);
      // The passage centre is the gate cell's wall point in every state: no drift as HP changes.
      if (passage) {
        expect(Math.abs(d.gate!.passagePage.x - passage.x), `${p} ${scene.name}: passage x`).toBeLessThan(0.6);
        expect(Math.abs(d.gate!.passagePage.y - passage.y), `${p} ${scene.name}: passage y`).toBeLessThan(0.6);
      } else passage = d.gate!.passagePage;
      // North part behind anything in the gate cell, south part in front of it.
      expect(d.gate!.depths[0]!).toBeLessThan(d.gate!.passage.y);
      expect(d.gate!.depths[1]!).toBeGreaterThan(d.gate!.passage.y);
      expect([d.gate!.north, d.gate!.south]).toEqual([scene.walls, scene.walls]);
      // Standing neighbours: the gate's connectors draw rows 4 and 6 (no doubled wall); fallen: their rubble shows.
      if (scene.walls === 'standing') {
        expect(d.wallRows).not.toContain(4);
        expect(d.wallRows).not.toContain(6);
      } else {
        expect(d.wallRows).toContain(4);
        expect(d.wallRows).toContain(6);
      }
      for (const r of [1, 2, 3, 7, 8, 9]) expect(d.wallRows, `${p} ${scene.name}: wall row ${r}`).toContain(r);
      // The gate cell itself never carries a wall strip.
      expect(d.wallRows).not.toContain(5);
      await gateShot(page, `siege-${p}-${scene.name}`);
    }
    const seen = urls.join('\n');
    expect(seen).toContain(`/siege-gates-v3/gate.${p}-v5.png`);
    // The other pieces stay the siege-v2 pack.
    for (const f of [`kit.${p}`, `wall.${p}`, `ground.${p}`]) expect(seen).toContain(`/siege-v2/${f}.png`);
    // Drafts are never requested.
    expect(seen).not.toMatch(/gate\.[a-z]+-v[34]\.png|siege-gates-v3\/gate\.[a-z]+\.png/);
    expect(errors).toEqual([]);
  });
}

test('siege gate: a creature walks through the breach between the gate’s north and south parts', async ({ page }) => {
  test.setTimeout(240_000);
  const { errors } = watch(page);
  await usePrefs(page, { battleSpeed: '1' });
  // One stack on the bridge before the breached gate; the town's defenders stand back.
  const d = siegeDriver('greek', { gate: 0 }, { army: [['hoplite', 30]], garrison: [['peltast', 2]] });
  const battle = d.state.battle!;
  const mine = Object.values(battle.stacks).find((s) => s.side === 'attacker')!;
  mine.anchor = { col: 9, row: 5 };
  const file = writeSave(d, 'a114 breach walk');
  await load(page, file);
  await toHumanBattleTurn(page);
  await expect.poll(async () => (await siegeDebug(page))?.ready, { timeout: 30_000 }).toBe(true);
  const s0 = await inspect(page);
  expect(s0.state.battle.activeStackId).toBe(mine.id);
  const gate = (await siegeDebug(page))!.gate!;
  await gateShot(page, 'breach-walk-0-before');
  // Into the town: two cells east, through the gate cell.
  const target = await page.evaluate(() => (globalThis as unknown as { __prProject: (k: string, a: number, b: number) => { x: number; y: number } | null }).__prProject('battle', 11, 5));
  await page.mouse.click(target!.x, target!.y);
  // Sample where the figure is drawn while it walks (light read-only hooks only, so the walk is caught mid-way).
  const samples: { depth: number; x: number; y: number }[] = [];
  let shot = 1;
  const t0 = Date.now();
  while (Date.now() - t0 < 15_000) {
    const st = (await siegeDebug(page))?.stacks[mine.id];
    if (st) samples.push(st);
    if (st && Math.abs(st.x - gate.passage.x) < 14 && shot < 3) await gateShot(page, `breach-walk-${shot++}-in-gate`);
    const scr = await page.evaluate(() => (globalThis as unknown as { __prScreen: () => { busy: boolean; revision: number } }).__prScreen());
    if (scr.revision > s0.state.revision && !scr.busy) break;
  }
  await gateShot(page, 'breach-walk-3-through');
  const s1 = await inspect(page);
  // The rules let it pass the breach (state), and it was drawn crossing the wall line in the gate row…
  expect(s1.state.battle.stacks[mine.id].anchor).toEqual({ col: 11, row: 5 });
  const inGate = samples.filter((x) => Math.abs(x.x - gate.passage.x) < 24);
  expect(inGate.length, 'drawn in the gateway during the walk').toBeGreaterThan(0);
  // …in front of the far (north) part and behind the near (south) part.
  for (const x of inGate) {
    expect(x.depth).toBeGreaterThan(gate.depths[0]!);
    expect(x.depth).toBeLessThan(gate.depths[1]!);
  }
  expect(errors).toEqual([]);
});

/** The painted primary face of a button and its label's text box (page pixels). */
async function faceAndLabel(page: Page, testId: string) {
  return page.getByTestId(testId).evaluate((el) => {
    const box = el.getBoundingClientRect();
    const before = getComputedStyle(el, '::before');
    const top = parseFloat(before.top) || 0;
    const bottom = parseFloat(before.bottom) || 0;
    const face = { top: box.top + top, bottom: box.bottom - bottom, left: box.left, right: box.right };
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const range = document.createRange();
    let text: DOMRect | null = null;
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (!n.textContent?.trim()) continue;
      range.selectNodeContents(n);
      const r = range.getBoundingClientRect();
      text = text ? new DOMRect(Math.min(text.left, r.left), Math.min(text.top, r.top), Math.max(text.right, r.right) - Math.min(text.left, r.left), Math.max(text.bottom, r.bottom) - Math.min(text.top, r.top)) : r;
    }
    const lines = range.getClientRects().length;
    return { box: { height: box.height, width: box.width }, face, text: text && { top: text.top, bottom: text.bottom, left: text.left, right: text.right, height: text.height }, lines, fontSize: parseFloat(getComputedStyle(el).fontSize) };
  });
}

function expectInsideFace(m: Awaited<ReturnType<typeof faceAndLabel>>, label: string): void {
  expect(m.text, `${label}: label text`).not.toBeNull();
  expect(m.text!.top, `${label}: label below the face's top`).toBeGreaterThanOrEqual(m.face.top + 2);
  expect(m.text!.bottom, `${label}: label above the face's bottom rim`).toBeLessThanOrEqual(m.face.bottom - 2);
  expect(m.text!.left).toBeGreaterThanOrEqual(m.face.left + 4);
  expect(m.text!.right).toBeLessThanOrEqual(m.face.right - 4);
  expect(m.text!.height, `${label}: one line`).toBeLessThan(m.fontSize * 1.8);
  expect(m.box.height, `${label}: 44 px hit target`).toBeGreaterThanOrEqual(43.5);
}

test('Start battle and Auto: on read fully inside their painted faces; keyboard and focus still work', async ({ page }) => {
  test.setTimeout(240_000);
  for (const [w, h] of [
    [1600, 1000],
    [1280, 720],
  ] as const) {
    await page.setViewportSize({ width: w, height: h });
    await load(page, writeSave(siegeDriver('greek', {}, { tactics: true }), `a114 deploy ${w}`));
    await waitFor(page, (s) => s.screen === 'battle' && s.state.battle?.phase === 'deployment' && !s.busy, 'deployment', 60_000);
    const start = page.getByTestId('deploy-confirm');
    await expect(start).toBeVisible();
    await expect(start).toHaveText(/Start battle/i);
    expectInsideFace(await faceAndLabel(page, 'deploy-confirm'), `Start battle ${w}×${h}`);
    await page.screenshot({ path: `${OUT}/start-battle-${w}.png`, clip: await start.boundingBox().then((b) => ({ x: b!.x - 120, y: b!.y - 30, width: b!.width + 240, height: b!.height + 60 })) });
    // Keyboard: focus shows the ring and Enter starts the battle.
    await start.focus();
    expect(await start.evaluate((e) => e.matches(':focus-visible') || document.activeElement === e)).toBe(true);
    await page.keyboard.press('Enter');
    await waitFor(page, (s) => s.state.battle?.phase !== 'deployment' && s.humanTurn && !s.busy, 'round 1', 60_000);
    // Auto: on uses the same painted face.
    await page.getByTestId('battle-auto').click();
    await expect(page.getByTestId('battle-auto')).toHaveClass(/btn--primary/);
    expectInsideFace(await faceAndLabel(page, 'battle-auto'), `Auto: on ${w}×${h}`);
    await page.screenshot({ path: `${OUT}/auto-on-${w}.png` });
    await page.getByTestId('battle-auto').click();
  }
});

const PARCHMENT = [234, 214, 166];
const DARK = [12, 22, 34];
const lum = (c: number[]) => {
  const [r, g, b] = c.map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
};
const contrast = (a: number[], b: number[]) => {
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
  return (x! + 0.05) / (y! + 0.05);
};

/** Every settings label on screen: ink (≥ 4.5:1 on parchment) inside parchment, light (≥ 4.5:1 on the dark panels) elsewhere. */
async function labelsReadable(page: Page, where: string): Promise<number> {
  const labels = await page.locator('.setting-block__label').evaluateAll((els) =>
    els
      .filter((e) => (e as HTMLElement).offsetParent !== null)
      .map((e) => {
        const surface = e.closest('.gui-surface--parchment, .panel--parchment, .gui-plate, .gui-window--leather');
        const parchment = !!surface && (surface.classList.contains('gui-surface--parchment') || surface.classList.contains('panel--parchment'));
        return { text: e.textContent ?? '', parchment, color: getComputedStyle(e).color.match(/\d+/g)!.slice(0, 3).map(Number) };
      }),
  );
  for (const l of labels) {
    const c = contrast(l.color, l.parchment ? PARCHMENT : DARK);
    expect(c, `${where}: “${l.text}” on ${l.parchment ? 'parchment' : 'a dark panel'} (rgb ${l.color.join(',')})`).toBeGreaterThanOrEqual(4.5);
  }
  return labels.filter((l) => l.parchment).length;
}

test('settings labels: ink on parchment (campaign, map seats, random map), gold on the dark panels', async ({ page }) => {
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await page.getByTestId('menu-new').click();
  await page.getByTestId('mode-campaign').click();
  await page.getByTestId('scenario-three_beacons').click();
  await expect(page.locator('.fe-chronicle .setting-block__label')).toHaveText('Difficulty');
  expect(await labelsReadable(page, 'campaign')).toBeGreaterThan(0);
  await page.locator('.fe-chronicle .setting-block').scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${OUT}/campaign-difficulty.png` });
  // Skirmish: the pantheon screen's drawer is a dark plate (gold labels).
  await page.getByRole('button', { name: 'Back', exact: true }).first().click();
  await page.getByTestId('mode-skirmish').click();
  await page.getByTestId('scenario-skirmish_twin_harbors').click();
  await page.getByTestId('setup-next').click();
  await expect(page.getByTestId('setup-drawer')).toBeVisible();
  await labelsReadable(page, 'pantheon drawer');
  // An authored map's seats.
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await page.getByTestId('menu-new').click();
  await page.getByTestId('mode-skirmish').click();
  await page.getByTestId('skirmish-map-six_thrones').click();
  await page.getByTestId('setup-next').click();
  await waitFor(page, (s) => s.screen === 'map-setup', 'map seats');
  await labelsReadable(page, 'map seats');
  // Random map: the map type's parchment card and the settings beside it.
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await page.getByTestId('menu-new').click();
  await page.getByTestId('mode-random').click();
  await waitFor(page, (s) => s.screen === 'random-setup', 'random setup');
  expect(await labelsReadable(page, 'random map')).toBeGreaterThan(0);
  await page.screenshot({ path: `${OUT}/random-labels.png` });
});

function twinHarbors(matchId: string): GameDriver {
  const d = GameDriver.mission('skirmish_twin_harbors', { matchId });
  for (const fog of Object.values(d.state.fog)) fog.explored = fog.explored.map(() => 1);
  return d;
}

async function openJournal(page: Page): Promise<void> {
  await waitFor(page, (s) => s.screen === 'adventure', 'adventure');
  await page.keyboard.press('j');
  if ((await inspect(page)).screen !== 'journal') await page.getByRole('button', { name: /^Journal$/ }).first().click();
  await waitFor(page, (s) => s.screen === 'journal', 'journal');
}

/** The ink of the page's text against the colour actually under it (page background, or the book once drawn). */
async function folioPaper(page: Page) {
  return page.locator('.gui-folio__page--left').evaluate((e) => ({ art: e.closest('.gui-folio')!.getAttribute('data-art'), bg: getComputedStyle(e).backgroundColor, ink: getComputedStyle(e).color }));
}

test('journal book: plain paper under the ink while the book picture loads, the book once decoded, paper when it fails', async ({ page }) => {
  test.setTimeout(180_000);
  // Cold load: the book picture is held back until released.
  let release: () => void = () => {};
  const held = new Promise<void>((r) => (release = r));
  await page.route('**/ui-v1.1.0/book-open.png', async (route: Route) => {
    await held;
    await route.continue();
  });
  // The held book request keeps the network busy: wait for the page's load only.
  await load(page, writeSave(twinHarbors('e2e-a114-journal'), 'a114 journal'), 'load');
  await openJournal(page);
  let f = await folioPaper(page);
  expect(f.art).toBe('pending');
  const rgb = (s: string) => s.match(/\d+/g)!.slice(0, 3).map(Number);
  expect(contrast(rgb(f.ink), rgb(f.bg)), `ink ${f.ink} on ${f.bg}`).toBeGreaterThanOrEqual(4.5);
  await page.screenshot({ path: `${OUT}/journal-pending.png` });
  release();
  await expect.poll(async () => (await folioPaper(page)).art, { timeout: 20_000 }).toBe('ready');
  await expect.poll(async () => (await folioPaper(page)).bg).toBe('rgba(0, 0, 0, 0)');
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/journal-ready.png` });
  // Narrow window: one parchment page, as before.
  await page.setViewportSize({ width: 540, height: 760 });
  await expect.poll(() => page.locator('.gui-folio__page--left').evaluate((e) => getComputedStyle(e).position)).toBe('static');
  await page.setViewportSize({ width: 1600, height: 900 });
  await page.unroute('**/ui-v1.1.0/book-open.png');
  // A failed book request: the paper stays (never ink on the dark screen).
  await page.route('**/ui-v1.1.0/book-open.png', (route: Route) => route.abort());
  await load(page, writeSave(twinHarbors('e2e-a114-journal2'), 'a114 journal failed'), 'load');
  await openJournal(page);
  await expect.poll(async () => (await folioPaper(page)).art, { timeout: 20_000 }).toBe('failed');
  f = await folioPaper(page);
  expect(contrast(rgb(f.ink), rgb(f.bg)), `ink ${f.ink} on ${f.bg}`).toBeGreaterThanOrEqual(4.5);
  // Focus and scrolling still work in the fallback.
  await page.locator('[data-testid^="objective-"]').first().focus();
  await expect(page.locator('[data-testid^="objective-"]').first()).toBeFocused();
  await page.screenshot({ path: `${OUT}/journal-failed.png` });
});

test('briefing scroll: plain paper under the ink when the painted scroll cannot load', async ({ page }) => {
  await page.route(/encounters-v1\.1\.0\/.*scroll[^/]*\.(png|webp)$/, (route: Route) => route.abort());
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await page.getByTestId('menu-new').click();
  await page.getByTestId('mode-campaign').click();
  await page.getByTestId('scenario-three_beacons').click();
  await page.getByTestId('setup-begin').click();
  await waitFor(page, (x) => x.overlays.includes('briefing'), 'briefing', 30_000, true);
  await expect.poll(() => page.locator('.brief__scroll').getAttribute('data-art'), { timeout: 20_000 }).toBe('failed');
  const m = await page.locator('.brief__safe').evaluate((e) => ({ bg: getComputedStyle(e).backgroundColor, ink: getComputedStyle(e.querySelector('.brief__title')!).color }));
  const rgb = (s: string) => s.match(/\d+/g)!.slice(0, 3).map(Number);
  expect(contrast(rgb(m.ink), rgb(m.bg))).toBeGreaterThanOrEqual(4.5);
  await page.screenshot({ path: `${OUT}/briefing-failed.png` });
});

test('town: no internal caption over the delivered town art', async ({ page }) => {
  await load(page, writeSave(twinHarbors('e2e-a114-town'), 'a114 town'));
  await waitFor(page, (s) => s.screen === 'adventure', 'adventure');
  await page.getByTestId('town-tab-westharbor').click();
  await waitFor(page, (s) => s.screen === 'town', 'town');
  await expect(page.locator('.town-scene')).toBeVisible();
  await expect(page.getByText(/Placeholder town art|owner concept reference/)).toHaveCount(0);
  await expect(page.locator('.town-scene__tag')).toHaveCount(0);
});

const BOARD_PICTURES = /\/(sprites\/final\/creatures|art\/battlefield)\//;

test('battle cold load: no orders before the painting and the stacks are drawn; then play as usual', async ({ page }) => {
  test.setTimeout(240_000);
  let release: () => void = () => {};
  const held = new Promise<void>((r) => (release = r));
  let heldCount = 0;
  await page.route(BOARD_PICTURES, async (route: Route) => {
    heldCount++;
    await held;
    await route.continue();
  });
  const { file } = goldBattle('skirmish_twin_harbors', 'a114-cold', STRONG);
  await load(page, file);
  await waitFor(page, (x) => x.screen === 'battle' && !!x.state.battle, 'battle', 60_000);
  // Loading: a visible notice over the field, the commands withheld, busy for the tests' own waits.
  await expect(page.getByTestId('battle-loading')).toBeVisible();
  await page.waitForTimeout(1500);
  expect(heldCount).toBeGreaterThan(0);
  let s = await inspect(page);
  expect(s.busy).toBe(true);
  await expect(page.getByTestId('battle-wait')).toHaveCount(0);
  await expect(page.getByTestId('battle-auto')).toBeDisabled();
  // A click on the field does nothing (the notice takes it).
  const revision = s.state.revision;
  const box = (await page.locator('.battle__scene').boundingBox())!;
  await page.mouse.click(box.x + box.width * 0.35, box.y + box.height * 0.5);
  await page.waitForTimeout(300);
  expect((await inspect(page)).state.revision).toBe(revision);
  // The way out stays: the menu opens.
  await expect(page.getByRole('button', { name: 'Menu' })).toBeEnabled();
  await page.screenshot({ path: `${OUT}/battle-cold-loading.png` });
  release();
  await expect(page.getByTestId('battle-loading')).toHaveCount(0, { timeout: 30_000 });
  s = await waitFor(page, (x) => x.screen === 'battle' && x.humanTurn && !x.busy, 'player turn', 60_000);
  const stacks = (await page.evaluate(() => (globalThis as unknown as { __prBattle: () => Record<string, { drawn: string | null; down: boolean }> }).__prBattle())) ?? {};
  for (const [id, v] of Object.entries(stacks)) if (!v.down) expect(v.drawn, `${id} drawn`).not.toBeNull();
  await expect(page.getByTestId('battle-wait')).toBeVisible();
  await page.screenshot({ path: `${OUT}/battle-cold-ready.png` });
  await page.getByTestId('battle-wait').click();
  await waitFor(page, (x) => x.state.revision > s.state.revision, 'the order was taken');
});

test('battle with failed pictures: silhouettes stand in, the board becomes playable and the menu stays reachable', async ({ page }) => {
  test.setTimeout(180_000);
  await page.route(BOARD_PICTURES, (route: Route) => route.abort());
  const { file } = goldBattle('skirmish_twin_harbors', 'a114-failed', STRONG);
  await load(page, file);
  const s = await waitFor(page, (x) => x.screen === 'battle' && x.humanTurn && !x.busy, 'player turn', 60_000);
  await expect(page.getByTestId('battle-loading')).toHaveCount(0);
  const stacks = (await page.evaluate(() => (globalThis as unknown as { __prBattle: () => Record<string, { sprite: string; down: boolean }> }).__prBattle())) ?? {};
  expect(Object.values(stacks).some((v) => v.sprite === 'missing')).toBe(true);
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/battle-failed-pictures.png` });
  await page.getByTestId('battle-defend').click();
  await waitFor(page, (x) => x.state.revision > s.state.revision, 'the order was taken');
  await page.getByRole('button', { name: 'Menu' }).click();
  await waitFor(page, (x) => x.overlays.includes('pause'), 'menu');
});

test('older saves (the 2026-10-10 siege review saves, when present): the gate and its neighbours load in the states the save holds', async ({ page }) => {
  const dir = process.env.PR_OLD_SIEGE_SAVES;
  test.skip(!dir, 'PR_OLD_SIEGE_SAVES not set');
  test.setTimeout(420_000);
  const { readdirSync, readFileSync } = await import('node:fs');
  const { join } = await import('node:path');
  const files = readdirSync(dir!).filter((f) => f.endsWith('.prsave.json')).sort();
  expect(files.length).toBeGreaterThan(0);
  for (const f of files) {
    const saved = JSON.parse(readFileSync(join(dir!, f), 'utf8')) as { snapshot: { match: { battle?: { siege?: { structures: { id: string; hp: number; maxHp: number }[] } } } } };
    const structures = saved.snapshot.match.battle?.siege?.structures ?? [];
    const gate = structures.find((s) => s.id === 'gate');
    if (!gate) continue;
    await load(page, join(dir!, f));
    await waitFor(page, (s) => s.screen === 'battle' && !s.boardLoading, `${f}: battle`, 60_000);
    await expect.poll(async () => (await siegeDebug(page))?.ready, { timeout: 30_000 }).toBe(true);
    const d = (await siegeDebug(page))!;
    const state = gate.hp <= 0 ? 2 : gate.hp < gate.maxHp ? 1 : 0;
    expect(d.gate!.frame[0], `${f}: gate frame for ${gate.hp}/${gate.maxHp}`).toBe(state * 512);
    const up = (id: string) => (structures.find((s) => s.id === id)?.hp ?? 0) > 0;
    expect(d.gate!.north).toBe(up('wall_2') ? 'standing' : 'fallen');
    expect(d.gate!.south).toBe(up('wall_3') ? 'standing' : 'fallen');
    await gateShot(page, `old-save-${f.replace('.prsave.json', '')}`);
  }
});
