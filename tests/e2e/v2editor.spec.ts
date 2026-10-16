import { expect, test, type Page } from '@playwright/test';
import { mkdirSync, readFileSync } from 'node:fs';
import { waitFor, inspect } from './helpers';

/**
 * Campaign expansion in the map editor and the random-map setup (handoff
 * 2026-10-15, screen spec `editor`), through the real controls: the palette of
 * the six neutral hiring sites (portrait + map picture, weekly stock) and the
 * sluice / ferry / supply depot; placing each one on a river map imported through
 * Open → Import; the habitat warning (Pegasi on an islet in open water); the
 * sluice channel tool and the connectivity check with every sluice closed and
 * open; playing the map; and the random map's "New neutral creatures" option (off
 * by default). Screenshots at 1280×720, 1366×768, 1920×1080 and at 160 %.
 */

const SHOTS = '/home/claude/capture/v2-editor';
mkdirSync(SHOTS, { recursive: true });
const shot = (page: Page, name: string) => page.screenshot({ path: `${SHOTS}/${name}.png` });

function errorsOf(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  return errors;
}

// --- The prepared map: a small temperate map (30 × 24) in the editor's stored axial array ---
const COLS = 30;
const ROWS = 24;
const OFF = Math.floor((ROWS - 1) / 2);
const WIDTH = COLS + OFF;
/** Axial cell of rectangle column x, row y. */
const cell = (x: number, y: number) => ({ q: x - Math.floor(y / 2) + OFF, r: y });
const dist = (a: { q: number; r: number }, b: { q: number; r: number }) => (Math.abs(a.q - b.q) + Math.abs(a.r - b.r) + Math.abs(a.q + a.r - b.q - b.r)) / 2;

/**
 * A river two hexes wide (columns 15–16) splits the land: Empire 1 west, Empire 2
 * east. An islet sits in a small lake in the south-west (a causeway joins it to the
 * shore), mountains rise in the north-east and a wood grows in the south-east.
 */
function riverMap(sites: unknown[] = []) {
  const t: string[] = [];
  for (let r = 0; r < ROWS; r++)
    for (let q = 0; q < WIDTH; q++) {
      const x = q + Math.floor(r / 2) - OFF;
      t.push(x < 0 || x >= COLS ? 'v' : 'p');
    }
  const set = (c: { q: number; r: number }, code: string) => {
    if (t[c.r * WIDTH + c.q] !== 'v') t[c.r * WIDTH + c.q] = code;
  };
  for (let y = 0; y < ROWS; y++) for (const x of [15, 16]) set(cell(x, y), 'w');
  const islet = cell(7, 19);
  for (let q = 0; q < WIDTH; q++) for (let r = 0; r < ROWS; r++) if (dist({ q, r }, islet) <= 2 && dist({ q, r }, islet) > 0) set({ q, r }, 'w');
  set({ q: islet.q + 1, r: islet.r }, 'p');
  set({ q: islet.q + 2, r: islet.r }, 'p');
  for (const [x, y] of [[22, 3], [23, 3], [23, 4], [24, 4]]) set(cell(x!, y!), 'm');
  const wood = cell(21, 18);
  for (let q = 0; q < WIDTH; q++) for (let r = 0; r < ROWS; r++) if (dist({ q, r }, wood) <= 3) set({ q, r }, 'f');
  return {
    format: 'pantheon-realms-map',
    version: 1,
    name: 'Sluice River',
    description: 'A river map for the campaign expansion sites.',
    width: WIDTH,
    height: ROWS,
    terrain: t.join(''),
    roads: [],
    biome: 'temperate',
    players: [{ pantheonId: 'greek' }, { pantheonId: 'norse' }],
    sites: [{ id: 'town_1', kind: 'town', ...cell(5, 12), owner: 0 }, { id: 'town_2', kind: 'town', ...cell(25, 12), owner: 1 }, ...sites],
    victory: { type: 'elimination' },
    startWealth: 'normal',
  };
}

async function openEditor(page: Page) {
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await page.getByTestId('menu-new').click();
  await page.getByTestId('mode-editor').click();
  await waitFor(page, (s) => s.screen === 'map-editor', 'map editor');
}

async function importMap(page: Page, doc: unknown) {
  await page.getByTestId('editor-open').click();
  const chooser = page.waitForEvent('filechooser');
  await page.getByTestId('editor-import').click();
  await (await chooser).setFiles({ name: 'sluice-river.prmap.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(doc)) });
  await expect(page.locator('.toast').last()).toContainText('Opened “Sluice River”');
}

/**
 * The editor's view, replicated from MapEditor.tsx (hex radius 22, squash 0.84):
 * a map of this size opens centred on axial (⌊w/2⌋ − ⌊h/4⌋, ⌊h/2⌋) at zoom 1; '-'
 * divides the zoom by 1.12, an arrow key moves the view 60 / zoom.
 */
const view = { x: 0, y: 0, zoom: 1 };
const point = (c: { q: number; r: number }) => ({ x: Math.sqrt(3) * 22 * (c.q + c.r / 2), y: 1.5 * 22 * 0.84 * c.r });
async function fitView(page: Page) {
  const mid = point({ q: Math.floor(WIDTH / 2) - Math.floor(ROWS / 4), r: Math.floor(ROWS / 2) });
  Object.assign(view, { x: mid.x, y: mid.y, zoom: 1 });
  const wrap = page.locator('.map-editor__canvas');
  await wrap.focus();
  for (let i = 0; i < 4; i++) {
    await page.keyboard.press('-');
    view.zoom = Math.max(0.35, view.zoom / 1.12);
  }
  for (let i = 0; i < 3; i++) {
    await page.keyboard.press('ArrowRight');
    view.x += 60 / view.zoom;
  }
}

/** Screen point of rectangle cell (x, y), checked against the editor's hover readout. */
async function hoverCell(page: Page, x: number, y: number) {
  const box = (await page.getByTestId('editor-canvas').boundingBox())!;
  const c = cell(x, y);
  const p = point(c);
  const sx = box.x + box.width / 2 + (p.x - view.x) * view.zoom;
  const sy = box.y + box.height / 2 + (p.y - view.y) * view.zoom;
  await page.mouse.move(sx, sy);
  await expect(page.getByTestId('editor-hover')).toContainText(`${c.q},${c.r}`);
  return { x: sx, y: sy };
}

async function clickCell(page: Page, x: number, y: number) {
  const p = await hoverCell(page, x, y);
  await page.mouse.click(p.x, p.y);
}

async function siteTab(page: Page) {
  await page.getByRole('tab', { name: 'Site' }).click();
}
async function checkTab(page: Page) {
  await page.getByRole('tab', { name: /^Check/ }).click();
}

test('editor palette: place every new site, see the habitat warning and the sluice check, then play the map', async ({ page }) => {
  test.setTimeout(300_000);
  const errors = errorsOf(page);
  await page.setViewportSize({ width: 1366, height: 768 });
  await openEditor(page);
  await importMap(page, riverMap());
  await fitView(page);

  // The palette: six neutral hiring sites (portrait + map picture + weekly stock) and the water/supply sites.
  const neutrals = page.getByTestId('palette-neutrals');
  for (const [id, name, stock] of [
    ['pegasus', 'Pegasus', 5],
    ['root_runner', 'Root-Runner', 8],
    ['serpopard', 'Serpopard', 5],
    ['baku', 'Baku', 5],
    ['afanc', 'Afanc', 5],
    ['ahuitzotl', 'Ahuitzotl', 5],
  ] as const) {
    const b = neutrals.getByTestId(`tool-neutral-${id}`);
    await expect(b).toContainText(name);
    await expect(b).toContainText(`${stock} a week`);
    await expect(b.locator('img.editor-neutral__portrait')).toHaveAttribute('src', /campaign-v2\//);
    await expect(b.locator('img.editor-neutral__site')).toHaveAttribute('src', /campaign-v2\/display\/site-/);
  }
  for (const k of ['sluice', 'ferry', 'supply_depot']) await expect(page.getByTestId(`tool-place-${k}`).locator('img')).toHaveAttribute('src', /campaign-v2\//);
  // Every palette picture actually loads.
  const broken = await page.locator('.map-editor__tools img').evaluateAll((imgs) => imgs.filter((i) => !(i as HTMLImageElement).complete || (i as HTMLImageElement).naturalWidth === 0).map((i) => (i as HTMLImageElement).src));
  expect(broken).toEqual([]);
  await page.locator('.map-editor__tools-body').evaluate((el) => el.scrollTo(0, el.scrollHeight));
  await shot(page, 'palette-1366x768');

  // Pegasus: the habitat mask while placing, the islet in open water (a warning), then the upland (fits).
  await page.getByTestId('tool-neutral-pegasus').click();
  await expect(page.getByTestId('palette-neutral-hint')).toContainText('High meadows and pale limestone uplands');
  await hoverCell(page, 7, 19);
  await expect(page.getByTestId('editor-habitat-hint')).toHaveText('Pegasi need upland meadow or limestone hills; this is open water.');
  await shot(page, 'habitat-mask-pegasus-1366x768');
  await clickCell(page, 7, 19);
  await expect(page.locator('.toast').last()).toContainText('Pegasi need upland meadow or limestone hills; this is open water.');
  await siteTab(page);
  await expect(page.getByTestId('site-habitat')).toHaveText(/!\s*Pegasi need upland meadow or limestone hills; this is open water\./);
  await expect(page.getByTestId('site-neutral-stock')).toContainText('Stock: 5 Pegasi each week, shared by every empire');
  await shot(page, 'site-pegasus-habitat-warning-1366x768');
  await hoverCell(page, 22, 4);
  await expect(page.getByTestId('editor-habitat-hint')).toHaveText(/^Pegasi live here: (upland meadow|limestone hills)\.$/);
  await clickCell(page, 22, 4);
  await expect(page.getByTestId('site-habitat')).toHaveText(/✓\s*Pegasi live here/);
  await shot(page, 'site-pegasus-1366x768');

  // The other five: Root-Runner and Baku in the wood, Afanc on the river bank (fit);
  // Serpopard and Ahuitzotl on this temperate map (their lands are desert / jungle: a warning).
  for (const [id, x, y, fits] of [
    ['root_runner', 20, 16, true],
    ['baku', 21, 19, true],
    ['afanc', 14, 18, true],
    ['serpopard', 9, 4, false],
    ['ahuitzotl', 9, 8, false],
  ] as const) {
    await page.getByTestId(`tool-neutral-${id}`).click();
    await clickCell(page, x, y);
    await siteTab(page);
    await expect(page.getByTestId('site-neutral-creature')).toHaveValue(id);
    await expect(page.getByTestId('site-habitat')).toHaveClass(fits ? /editor-habitat--ok/ : /editor-habitat--warn/);
    await shot(page, `site-${id}-1366x768`);
  }
  await expect(page.getByTestId('site-habitat')).toHaveText(/Ahuitzotls need .*found in jungle lands; this map is temperate\./);

  // The sluice on the west bank: its channel starts as the river beside it (closed: water).
  await page.getByTestId('tool-place-sluice').click();
  await clickCell(page, 14, 12);
  await siteTab(page);
  const count = page.getByTestId('site-sluice-count');
  await expect(count).toContainText(/^\d+ hexes/);
  const n0 = Number((await count.textContent())!.split(' ')[0]);
  expect(n0).toBeGreaterThanOrEqual(6);
  await expect(page.getByTestId('sluice-check-closed')).toContainText('cut off — Empire 2’s town');
  await expect(page.getByTestId('sluice-check-open')).toContainText('every town and objective can be reached');
  await shot(page, 'site-sluice-1366x768');
  // The Edit channel tool: add a hex, then take it out again.
  await page.getByTestId('site-sluice-channel').click();
  await expect(page.getByTestId('channel-hint')).toBeVisible();
  await clickCell(page, 13, 15);
  await expect(count).toContainText(`${n0 + 1} hexes`);
  // A channel hex shows the sluice's start state (closed: water) over the ground beneath…
  await expect(page.getByTestId('editor-hover')).toContainText('Water');
  await expect(page.getByTestId('editor-hover')).toContainText('sluice channel');
  await clickCell(page, 13, 15);
  await expect(count).toContainText(`${n0} hexes`);
  // …and leaving the channel shows that ground again.
  await expect(page.getByTestId('editor-hover')).toContainText('Plains');
  await expect(page.getByTestId('editor-hover')).not.toContainText('sluice channel');
  await page.getByTestId('site-sluice-channel').click();
  await expect(page.getByTestId('channel-hint')).toHaveCount(0);
  // The open picture is a different painting from the closed one.
  const pics = page.locator('.editor-v2-state img');
  await expect(pics).toHaveCount(2);
  expect(await pics.nth(0).getAttribute('src')).not.toBe(await pics.nth(1).getAttribute('src'));

  // The check: with every sluice closed, Empire 2's town is cut off (an error that blocks Play).
  await checkTab(page);
  await expect(page.getByTestId('sluice-check-closed')).toHaveClass(/is-bad/);
  await expect(page.getByTestId('sluice-check-open')).toHaveClass(/is-ok/);
  await expect(page.getByTestId('editor-issues')).toContainText('With every sluice closed, Empire 2’s town cannot be reached from Empire 1’s town.');
  await expect(page.getByTestId('editor-issues')).toContainText('Pegasi need upland meadow or limestone hills; this is open water.');
  await expect(page.getByTestId('editor-status')).toHaveText('1 problem to fix before playing');
  await expect(page.getByTestId('editor-play')).toBeDisabled();
  await shot(page, 'sluice-check-closed-cut-1366x768');

  // A ferry pair across the river keeps Empire 2 reachable with the sluice closed.
  await page.getByTestId('tool-place-ferry').click();
  await clickCell(page, 14, 4);
  await clickCell(page, 17, 4);
  await siteTab(page);
  await expect(page.getByTestId('site-ferry-twin')).toContainText('Carries heroes across to');
  await shot(page, 'site-ferry-1366x768');
  // The supply depot, with its supplies editable.
  await page.getByTestId('tool-place-supply_depot').click();
  await clickCell(page, 10, 6);
  await siteTab(page);
  await expect(page.getByTestId('site-depot-gold')).toHaveValue('500');
  await page.getByTestId('site-depot-gold').fill('800');
  await shot(page, 'site-supply-depot-1366x768');

  await checkTab(page);
  await expect(page.getByTestId('sluice-check-closed')).toHaveClass(/is-ok/);
  await expect(page.getByTestId('sluice-check-open')).toHaveClass(/is-ok/);
  await expect(page.getByTestId('editor-status')).toHaveText('Ready to play · 3 warnings');
  await expect(page.getByTestId('editor-play')).toBeEnabled();
  await shot(page, 'sluice-check-both-ok-1366x768');

  // The same states at the other window sizes.
  for (const [w, h] of [
    [1280, 720],
    [1920, 1080],
  ] as const) {
    await page.setViewportSize({ width: w, height: h });
    await page.waitForTimeout(300);
    await checkTab(page);
    await shot(page, `check-${w}x${h}`);
    await page.getByTestId('editor-issues').getByRole('button', { name: /Pegasi need upland meadow/ }).click();
    await expect(page.getByTestId('site-habitat')).toContainText('this is open water');
    await shot(page, `habitat-warning-${w}x${h}`);
    await page.locator('.map-editor__tools-body').evaluate((el) => el.scrollTo(0, el.scrollHeight));
    await page.getByTestId('tool-neutral-root_runner').click();
    await shot(page, `palette-${w}x${h}`);
    // Primary controls stay visible: the palette's last button, the status and Play.
    await expect(page.getByTestId('tool-place-supply_depot')).toBeInViewport();
    await expect(page.getByTestId('editor-play')).toBeInViewport();
  }
  await page.setViewportSize({ width: 1366, height: 768 });

  // Export: the document holds the new sites as optional data (format version 1).
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByTestId('editor-export').click()]);
  const file = JSON.parse(readFileSync((await download.path())!, 'utf8')) as { version: number; sites: { kind: string; creatureId?: string; channel?: unknown[]; twinId?: string; reward?: { gold?: number } }[] };
  expect(file.version).toBe(1);
  expect(file.sites.filter((s) => s.kind === 'neutral_dwelling').map((s) => s.creatureId).sort()).toEqual(['afanc', 'ahuitzotl', 'baku', 'pegasus', 'pegasus', 'root_runner', 'serpopard']);
  expect(file.sites.find((s) => s.kind === 'sluice')?.channel).toHaveLength(n0);
  expect(file.sites.filter((s) => s.kind === 'ferry').every((s) => !!s.twinId)).toBe(true);
  expect(file.sites.find((s) => s.kind === 'supply_depot')?.reward?.gold).toBe(800);

  // Play: the compiled mission carries the hiring sites, the sluice, the ferry and the depot.
  await page.getByTestId('editor-play').click();
  await page.getByTestId('editor-play-start').click();
  const s = await waitFor(page, (x) => x.screen === 'adventure' && x.overlays.length === 0, 'adventure map', 60_000);
  const sites = s.state.customMission.sites as { id: string; kind: { type: string; restock?: string; creatureId?: string; ferry?: boolean }; art?: string }[];
  expect(sites.filter((x) => x.kind.type === 'creature_camp' && x.kind.restock === 'weekly')).toHaveLength(7);
  expect(sites.find((x) => x.kind.type === 'sluice')?.art).toBe('sluice');
  expect(sites.filter((x) => x.kind.type === 'portal' && x.kind.ferry)).toHaveLength(2);
  expect(sites.find((x) => x.art === 'supply_depot')).toBeDefined();
  const sluiceId = sites.find((x) => x.kind.type === 'sluice')!.id;
  expect((await inspect(page)).state.world.sites[sluiceId].open).toBe(false);
  await page.waitForTimeout(1200);
  await shot(page, 'played-map-1366x768');
  expect(errors.filter((e) => !/favicon/i.test(e))).toEqual([]);
});

test('random map setup: the New neutral creatures option is off by default and adds hiring sites when on', async ({ page }) => {
  test.setTimeout(240_000);
  const errors = errorsOf(page);
  for (const [w, h] of [
    [1280, 720],
    [1920, 1080],
    [1366, 768],
  ] as const) {
    await page.setViewportSize({ width: w, height: h });
    await page.goto('/?e2e', { waitUntil: 'networkidle' });
    await page.getByTestId('menu-new').click();
    await page.getByTestId('mode-random').click();
    await waitFor(page, (s) => s.screen === 'random-setup' || s.screen.includes('random'), 'random setup');
    const toggle = page.getByRole('switch', { name: 'New neutral creatures' });
    await toggle.scrollIntoViewIfNeeded();
    await expect(toggle).toHaveAttribute('aria-checked', 'false');
    await expect(page.getByTestId('random-neutrals-text')).toContainText('Continental: Pegasi, Root-Runners, Baku or Afancs.');
    await shot(page, `random-option-off-${w}x${h}`);
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-checked', 'true');
    await shot(page, `random-option-on-${w}x${h}`);
  }
  // Highlands: only the Pegasi live in those lands.
  await page.getByTestId('random-type-highlands').click();
  await expect(page.getByTestId('random-neutrals-text')).toContainText('Highlands: Pegasi.');
  await page.getByTestId('random-type-continental').click();
  await page.getByTestId('random-start').click();
  const s = await waitFor(page, (x) => x.screen === 'adventure' && x.overlays.length === 0, 'adventure map', 90_000);
  const sites = s.state.customMission.sites as { id: string; kind: { type: string; restock?: string } }[];
  const hiring = sites.filter((x) => x.id.startsWith('neutral_'));
  expect(hiring).toHaveLength(2); // a medium map: one species, one site in each of the two empires' lands
  expect(hiring.every((x) => x.kind.type === 'creature_camp' && x.kind.restock === 'weekly')).toBe(true);
  expect(s.state.customMission.id).toMatch(/-neutrals$/);
  expect(errors.filter((e) => !/favicon/i.test(e))).toEqual([]);
});

test('largest interface scale: the palette, a sluice and the check stay usable at 160 %', async ({ page }) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await page.getByTestId('menu-settings').click();
  await page.getByTestId('settings-tab-interface').click();
  await page.getByLabel('Interface scale').fill('1.6');
  await page.getByTestId('settings-apply').click();
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--ui-scale').trim())).toBe('1.6');
  await page.getByTestId('menu-new').click();
  await page.getByTestId('mode-editor').click();
  await waitFor(page, (s) => s.screen === 'map-editor', 'map editor');
  const channel = [11, 12, 13].flatMap((y) => [cell(15, y), cell(16, y)]);
  await importMap(
    page,
    riverMap([
      { id: 'sluice_1', kind: 'sluice', ...cell(14, 12), channel },
      { id: 'pegasus_1', kind: 'neutral_dwelling', ...cell(7, 19), creatureId: 'pegasus' },
      { id: 'ferry_1', kind: 'ferry', ...cell(14, 4), twinId: 'ferry_2' },
      { id: 'ferry_2', kind: 'ferry', ...cell(17, 4), twinId: 'ferry_1' },
      { id: 'depot_1', kind: 'supply_depot', ...cell(10, 6), reward: { gold: 500, wood: 5, stone: 5 } },
    ]),
  );
  await fitView(page);
  await page.getByTestId('tool-neutral-baku').click();
  await shot(page, 'palette-uiscale160-1366x768');
  await checkTab(page);
  await expect(page.getByTestId('sluice-check-closed')).toHaveClass(/is-ok/);
  await expect(page.getByTestId('editor-status')).toHaveText('Ready to play · 1 warning');
  await shot(page, 'check-uiscale160-1366x768');
  await page.getByTestId('editor-issues').getByRole('button', { name: /Pegasi need/ }).click();
  await expect(page.getByTestId('site-habitat')).toContainText('this is open water');
  await shot(page, 'habitat-warning-uiscale160-1366x768');
  // The sluice's panel: both pictures, the channel, the grounds and its check.
  await page.getByTestId('tool-select').click();
  await clickCell(page, 14, 12);
  await expect(page.getByTestId('site-sluice')).toBeVisible();
  await expect(page.getByTestId('site-sluice-count')).toContainText('6 hexes');
  await page.getByTestId('site-sluice-closed').selectOption('marsh');
  await expect(page.getByTestId('sluice-check-closed')).toHaveClass(/is-ok/);
  await page.getByTestId('site-sluice-open').selectOption('water');
  await expect(page.getByTestId('sluice-check-open')).toHaveClass(/is-ok/); // the ferry still links the shores
  await expect(page.getByTestId('editor-status')).toHaveText('Ready to play · 1 warning');
  await shot(page, 'site-sluice-uiscale160-1366x768');
});
