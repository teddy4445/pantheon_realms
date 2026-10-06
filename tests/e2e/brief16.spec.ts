import { expect, test, type Page } from '@playwright/test';
import { GameDriver } from '@pr/testing';
import { waitFor } from './helpers';
import { importAndLoad, writeSave } from './fixtures';

/**
 * GPT-6 Brief 16 roads in the game (2026-10-06): all five road types are
 * imported (dirt approved by the owner after its review; cobble, sand, snow and
 * boardwalk delivered with it, in-game acceptance pending). Every road hex of a
 * map draws a painted tile chosen by its connections and land: a dirt map
 * (Twin Harbors), a cobble map (The Three Beacons M02), a snow map (The Winter
 * Oath M1), a sand map (The Twelfth Hour M1), and Twin Harbors with a stretch
 * of road turned to marsh and rough ground (boardwalk and cobbles between dirt:
 * the joins between materials). Screenshots at play zoom and close up for the
 * owner's review (test-results/b16-*).
 */

const STEP: [number, number][] = [[1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1], [1, -1]];

interface GroundDebug {
  edges: string;
  roadTiles: number;
}
const ground = (page: Page) => page.evaluate(() => (globalThis as unknown as { __prGround: () => GroundDebug | null }).__prGround());
const project = (page: Page, q: number, r: number) => page.evaluate(([a, b]) => (globalThis as unknown as { __prProject: (k: string, a: number, b: number) => { x: number; y: number } | null }).__prProject('adventure', a!, b!), [q, r]);

/** Pan the map (by dragging) until hex (q, r) is near the centre of the view. */
async function centreOn(page: Page, q: number, r: number) {
  const vp = page.viewportSize()!;
  for (let i = 0; i < 8; i++) {
    const p = await project(page, q, r);
    if (!p) return;
    const dx = vp.width / 2 - p.x;
    const dy = vp.height / 2 - p.y;
    if (Math.abs(dx) < 40 && Math.abs(dy) < 40) return;
    const sx = Math.max(-500, Math.min(500, dx));
    const sy = Math.max(-300, Math.min(300, dy));
    await page.mouse.move(vp.width / 2, vp.height / 2);
    await page.mouse.down();
    await page.mouse.move(vp.width / 2 + sx / 2, vp.height / 2 + sy / 2, { steps: 4 });
    await page.mouse.move(vp.width / 2 + sx, vp.height / 2 + sy, { steps: 4 });
    await page.mouse.up();
    await page.waitForTimeout(250);
  }
}

/** Connections per road hex (bit k: a road across edge k), as the map draws them. */
function roadMasks(d: GameDriver): Map<string, number> {
  const mask = new Map<string, number>();
  for (const k of d.state.world.map.roads) {
    const [a, b] = k.split('|') as [string, string];
    const [aq, ar] = a.split(',').map(Number) as [number, number];
    const [bq, br] = b.split(',').map(Number) as [number, number];
    const da = STEP.findIndex(([x, y]) => x === bq - aq && y === br - ar);
    const db = STEP.findIndex(([x, y]) => x === aq - bq && y === ar - br);
    mask.set(a, (mask.get(a) ?? 0) | (1 << da));
    mask.set(b, (mask.get(b) ?? 0) | (1 << db));
  }
  return mask;
}

/** A fresh page (no saves from an earlier step), then the fixture through Load → Import. */
async function load(page: Page, d: GameDriver, name: string): Promise<void> {
  for (const fog of Object.values(d.state.fog)) fog.explored = fog.explored.map(() => 1);
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await page.evaluate(() => new Promise<void>((done) => {
    const req = indexedDB.deleteDatabase('pantheon-realms');
    req.onsuccess = req.onerror = req.onblocked = () => done();
  }));
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await importAndLoad(page, writeSave(d, `b16 ${name}`));
  await waitFor(page, (x) => x.screen === 'adventure' && x.overlays.length === 0, 'adventure map', 30_000);
}

async function tilesDrawn(page: Page, want: number): Promise<number> {
  let g: GroundDebug | null = null;
  for (let i = 0; i < 60 && !(g && g.roadTiles >= want); i++) {
    await page.waitForTimeout(250);
    g = await ground(page);
  }
  return g?.roadTiles ?? 0;
}

/** Zoom in on hex (q, r) (the wheel keeps the point under the pointer in place), take a screenshot, zoom back out. */
async function closeUp(page: Page, q: number, r: number, file: string) {
  const vp = page.viewportSize()!;
  let p = await project(page, q, r);
  if (!p || p.x < 80 || p.y < 80 || p.x > vp.width - 80 || p.y > vp.height - 80) {
    await centreOn(page, q, r);
    p = await project(page, q, r);
  }
  if (!p) return;
  await page.mouse.move(Math.max(80, Math.min(vp.width - 80, p.x)), Math.max(80, Math.min(vp.height - 80, p.y)));
  for (let i = 0; i < 6; i++) await page.mouse.wheel(0, -120);
  await page.waitForTimeout(800);
  await page.screenshot({ path: file });
  for (let i = 0; i < 6; i++) await page.mouse.wheel(0, 120);
  await page.waitForTimeout(400);
}

const bits = (m: number) => [0, 1, 2, 3, 4, 5].filter((k) => m & (1 << k)).length;
const STRAIGHT = [0b001001, 0b010010, 0b100100];

test('dirt: every road hex of a dirt map draws its painted tile; close-ups of a crossing, a bend, a straight, a dead end', async ({ page }) => {
  test.setTimeout(420_000);
  const fetched: string[] = [];
  page.on('response', (r) => r.url().includes('/sprites/final/roads/') && r.status() < 400 && fetched.push(r.url().split('/').pop()!));
  const d = GameDriver.mission('skirmish_twin_harbors', { matchId: 'e2e-b16-dirt' });
  const mask = roadMasks(d);
  await load(page, d, 'dirt');
  expect(await tilesDrawn(page, mask.size)).toBe(mask.size);
  expect([...new Set(fetched)].sort()).toEqual(['road.dirt.a.webp', 'road.dirt.b.webp', 'road.dirt.c.webp']);
  await page.screenshot({ path: 'test-results/b16-dirt-play-zoom.png' });
  const pick = (f: (m: number) => boolean) => [...mask.entries()].find(([, m]) => f(m))?.[0];
  const shots: [string, string | undefined][] = [
    ['junction', pick((m) => bits(m) >= 3)],
    ['bend', pick((m) => bits(m) === 2 && !STRAIGHT.includes(m))],
    ['straight', pick((m) => STRAIGHT.includes(m))],
    ['dead-end', pick((m) => bits(m) === 1)],
  ];
  for (const [label, key] of shots) {
    if (!key) continue;
    const [q, r] = key.split(',').map(Number) as [number, number];
    await closeUp(page, q, r, `test-results/b16-dirt-${label}.png`);
  }
});

for (const [missionId, type] of [
  ['three_beacons_m02', 'cobble'],
  ['winter_oath_m01', 'snow'],
  ['twelfth_hour_m01', 'sand'],
] as const) {
  test(`${type}: every road hex of ${missionId} draws its painted ${type} tile`, async ({ page }) => {
    test.setTimeout(300_000);
    const fetched: string[] = [];
    page.on('response', (r) => r.url().includes('/sprites/final/roads/') && r.status() < 400 && fetched.push(r.url().split('/').pop()!));
    const d = GameDriver.mission(missionId, { matchId: `e2e-b16-${type}` });
    const mask = roadMasks(d);
    await load(page, d, type);
    expect(await tilesDrawn(page, mask.size)).toBe(mask.size);
    expect([...new Set(fetched)].sort()).toEqual([`road.${type}.a.webp`, `road.${type}.b.webp`, `road.${type}.c.webp`]);
    await page.screenshot({ path: `test-results/b16-${type}-play-zoom.png` });
    const junction = [...mask.entries()].find(([, m]) => bits(m) >= 3)?.[0] ?? [...mask.keys()][0]!;
    const [q, r] = junction.split(',').map(Number) as [number, number];
    await closeUp(page, q, r, `test-results/b16-${type}-close.png`);
  });
}

test('mixed: a road crossing marsh and rough ground in a green climate turns into boardwalk and cobbles between dirt', async ({ page }) => {
  test.setTimeout(300_000);
  const fetched: string[] = [];
  page.on('response', (r) => r.url().includes('/sprites/final/roads/') && r.status() < 400 && fetched.push(r.url().split('/').pop()!));
  const d = GameDriver.mission('skirmish_twin_harbors', { matchId: 'e2e-b16-mixed' });
  const map = d.state.world.map;
  const mask = roadMasks(d);
  // Six straight road hexes (not necessarily one stretch): three become marsh, three rough ground.
  const straight = [...mask.entries()].filter(([, m]) => STRAIGHT.includes(m)).map(([k]) => k);
  const run = straight.slice(4, 10);
  expect(run.length).toBe(6);
  const terrain = [...map.terrain];
  run.forEach((k, i) => {
    const [q, r] = k.split(',').map(Number) as [number, number];
    terrain[r * map.width + q] = i < 3 ? 's' : 'r';
  });
  (map as { terrain: string }).terrain = terrain.join('');
  await load(page, d, 'mixed');
  expect(await tilesDrawn(page, mask.size)).toBe(mask.size);
  const kinds = new Set(fetched.map((f) => f.split('.')[1]));
  expect(['boardwalk', 'cobble', 'dirt'].every((k) => kinds.has(k))).toBe(true);
  await page.screenshot({ path: 'test-results/b16-mixed-play-zoom.png' });
  const [q, r] = run[2]!.split(',').map(Number) as [number, number];
  await closeUp(page, q, r, 'test-results/b16-mixed-close.png');
});
