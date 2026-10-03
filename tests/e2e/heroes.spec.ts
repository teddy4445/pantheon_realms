/**
 * Mounted adventure-map heroes and the fixed-angle map camera, in the production
 * build (ASSET_PIPELINE.md §12). Fixtures are ordinary save files imported
 * through Load → Import; the page is only read (__prInspect / __prHeroes /
 * __prCamera), never driven through hooks.
 */
import { expect, test, type Page } from '@playwright/test';
import { GameDriver } from '@pr/testing';
import { axialNeighbors, quoteMovement, reachableTiles, parseHexKey, type HexCoord } from '@pr/rules';
import { approachTile, importAndLoad, writeSave } from './fixtures';
import { clickHex, inspect, waitFor } from './helpers';

interface HeroDebug {
  model: string;
  pantheonId?: string;
  clip?: string;
  playbackRate?: number;
  formulaRate?: number;
  weights?: Record<string, number>;
  playing?: string[];
  prepareStarted?: number;
  prepareFinished?: number;
  prepareCancelled?: number;
  holdingReadyPose?: boolean;
  yaw?: number;
}
type Heroes = Record<string, HeroDebug>;
interface Pose {
  alpha: number;
  beta: number;
  radius: number;
  target: { x: number; y: number; z: number };
}
interface Sample {
  t: number;
  h: Heroes | null;
  cam: Pose | null;
}

const heroes = (page: Page): Promise<Heroes | null> => page.evaluate(() => (globalThis as unknown as { __prHeroes: () => Heroes | null }).__prHeroes());
const camera = (page: Page): Promise<Pose> => page.evaluate(() => (globalThis as unknown as { __prCamera: () => Pose }).__prCamera());

/** Record the read-only hero/camera state every animation frame (test-side observer only). */
async function startSampling(page: Page): Promise<void> {
  await page.evaluate(() => {
    const g = globalThis as unknown as { __samples: unknown[]; __sampling: boolean; __prHeroes: () => unknown; __prCamera: () => unknown };
    g.__samples = [];
    g.__sampling = true;
    const step = () => {
      if (!g.__sampling) return;
      g.__samples.push({ t: performance.now(), h: g.__prHeroes(), cam: g.__prCamera() });
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
}
async function stopSampling(page: Page): Promise<Sample[]> {
  return page.evaluate(() => {
    const g = globalThis as unknown as { __samples: Sample[]; __sampling: boolean };
    g.__sampling = false;
    return g.__samples;
  });
}

async function waitModels(page: Page, ids: readonly string[]): Promise<Heroes> {
  for (let i = 0; i < 120; i++) {
    const h = (await heroes(page)) ?? {};
    if (ids.every((id) => h[id]?.model === 'ready')) return h;
    if (ids.some((id) => h[id]?.model === 'failed')) throw new Error(`hero model failed: ${JSON.stringify(h)}`);
    await page.waitForTimeout(250);
  }
  throw new Error(`hero models not ready: ${JSON.stringify(await heroes(page))}`);
}

const world = (c: HexCoord) => ({ x: Math.sqrt(3) * (c.q + c.r / 2), z: -1.5 * c.r });
const yawTo = (a: HexCoord, b: HexCoord) => {
  const p = world(a);
  const q = world(b);
  return Math.atan2(-(q.z - p.z), q.x - p.x);
};
const angleDiff = (a: number, b: number) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));

function driver(matchId: string): GameDriver {
  const d = GameDriver.mission('skirmish_twin_harbors', { matchId });
  for (const fog of Object.values(d.state.fog)) fog.explored = fog.explored.map(() => 1);
  return d;
}

async function openSave(page: Page, file: string, errors: string[]): Promise<void> {
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await importAndLoad(page, file);
  await waitFor(page, (s) => s.screen === 'adventure' && !s.busy, 'adventure map');
}

const OTHER_PANTHEON_HEROES = ['norse_ragnar', 'egyptian_hatshepsut', 'japanese_yoshitsune', 'celtic_boudicca', 'mesoamerican_hunahpu'];

test('six pantheons show their own mounted hero, idling, loaded from the game’s own files', async ({ page }) => {
  test.setTimeout(240_000);
  const d = driver('e2e-heroes-six');
  const lead = Object.values(d.state.heroes).find((h) => h.ownerId === 'player')!;
  const near = [...reachableTiles(d.catalog, d.state, lead.id).keys()].map(parseHexKey).filter((c) => Math.abs(c.q - lead.position.q) + Math.abs(c.r - lead.position.r) <= 4);
  const taken = (c: HexCoord) => Object.values(d.state.heroes).some((h) => h.position.q === c.q && h.position.r === c.r);
  for (const def of OTHER_PANTHEON_HEROES) {
    const t = near.find((c) => !taken(c))!;
    expect(t, def).toBeDefined();
    const id = `e2e_${def}`;
    d.state.heroes[id] = { ...structuredClone(lead), id, definitionId: def, name: d.catalog.heroes[def]!.name, position: t };
  }
  const ids = Object.values(d.state.heroes).filter((h) => h.ownerId === 'player').map((h) => h.id);
  const expected = Object.fromEntries(ids.map((id) => [id, d.catalog.heroes[d.state.heroes[id]!.definitionId]!.pantheonId]));
  expect(new Set(Object.values(expected))).toEqual(new Set(['greek', 'norse', 'egyptian', 'japanese', 'celtic', 'mesoamerican']));

  const requests: string[] = [];
  const glb: { url: string; status: number; bytes: number }[] = [];
  page.on('request', (r) => requests.push(r.url()));
  page.on('response', async (r) => {
    if (/\.glb(\?|$)/.test(r.url())) glb.push({ url: r.url(), status: r.status(), bytes: (await r.body().catch(() => Buffer.alloc(0))).length });
  });
  const errors: string[] = [];
  await openSave(page, writeSave(d, 'heroes six'), errors);
  const h = await waitModels(page, ids);
  await page.waitForTimeout(500);

  for (const id of ids) {
    expect(h[id], id).toMatchObject({ model: 'ready', pantheonId: expected[id], clip: 'Idle_Standing' });
  }
  const now = (await heroes(page))!;
  for (const id of ids) expect(now[id]!.playing, id).toEqual(['Idle_Standing']);

  // Every request stays on the game's own origin; the six hero GLBs come from ./heroes/<pantheon>/.
  const origin = new URL(page.url()).origin;
  expect(requests.filter((u) => !u.startsWith(origin) && !u.startsWith('data:') && !u.startsWith('blob:'))).toEqual([]);
  const heroGlbs = glb.filter((g) => g.url.includes('/heroes/'));
  expect(new Set(heroGlbs.map((g) => new URL(g.url).pathname))).toEqual(new Set(['greek', 'norse', 'egyptian', 'japanese', 'celtic', 'mesoamerican'].map((p) => `/heroes/${p}/hero_${p}.glb`)));
  for (const g of heroGlbs) {
    expect(g.status, g.url).toBe(200);
    expect(g.bytes, g.url).toBeGreaterThan(100_000);
  }
  await page.screenshot({ path: 'test-results/heroes-six.png' });
  expect(errors.filter((e) => !/favicon/i.test(e))).toEqual([]);
});

test('moving plays Walk on that hero only, faces the travel direction and returns to idle; the camera angle never changes', async ({ page }) => {
  test.setTimeout(180_000);
  const d = driver('e2e-heroes-walk');
  const lead = Object.values(d.state.heroes).find((h) => h.ownerId === 'player')!;
  lead.movementPoints = 2000;
  // A destination four steps away, reachable today.
  const dest = [...reachableTiles(d.catalog, d.state, lead.id).keys()]
    .map(parseHexKey)
    .find((c) => {
      const q = quoteMovement(d.catalog, d.state, lead.id, c);
      return q.reachable && q.reachesDestinationToday && !q.endsInEncounter && q.path.length === 4;
    })!;
  expect(dest).toBeDefined();
  const path = quoteMovement(d.catalog, d.state, lead.id, dest).path;
  // A second (idle) player hero next to the start, to check independence.
  const buddyTile = axialNeighbors(lead.position).find((c) => !path.some((p) => p.q === c.q && p.r === c.r) && quoteMovement(d.catalog, d.state, lead.id, c).reachable)!;
  d.state.heroes.e2e_buddy = { ...structuredClone(lead), id: 'e2e_buddy', definitionId: 'norse_ragnar', name: 'Ragnar', position: buddyTile };
  const errors: string[] = [];
  await openSave(page, writeSave(d, 'heroes walk'), errors);
  await waitModels(page, [lead.id, 'e2e_buddy']);
  const pose0 = await camera(page);

  await clickHex(page, dest.q, dest.r); // preview
  await startSampling(page);
  await clickHex(page, dest.q, dest.r); // commit
  await waitFor(page, (s) => s.state.heroes[lead.id].position.q === dest.q && s.state.heroes[lead.id].position.r === dest.r && !s.busy, 'hero moved', 15_000);
  // The 0.2 s crossfade back to idle runs on frame time (slow software-rendered frames in CI).
  for (const t0 = Date.now(); Date.now() - t0 < 10_000; ) {
    const h = (await heroes(page))?.[lead.id];
    if (h?.clip === 'Idle_Standing' && h.weights?.walk === 0) break;
    await page.waitForTimeout(100);
  }
  await page.waitForTimeout(300);
  const samples = (await stopSampling(page)).filter((s) => s.h && s.cam);

  const walking = samples.filter((s) => s.h![lead.id]?.clip === 'Walk');
  expect(walking.length).toBeGreaterThan(5);
  const w = walking[walking.length - 1]!.h![lead.id]!;
  // Normal map pace: 210 ms per hex step of √3 world units → 8.25 units/s; the formula asks for ~30×, capped at 3.5.
  expect(w.formulaRate!).toBeGreaterThan(25);
  expect(w.playbackRate).toBe(3.5);
  expect(walking.some((s) => (s.h![lead.id]!.weights?.walk ?? 0) > 0 && (s.h![lead.id]!.weights?.idle ?? 0) > 0)).toBe(true); // crossfade
  // The other hero idles throughout.
  for (const s of samples) expect(s.h!.e2e_buddy?.clip).toBe('Idle_Standing');
  // Stopped: back to idle, facing the last step.
  const end = samples[samples.length - 1]!.h![lead.id]!;
  expect(end).toMatchObject({ clip: 'Idle_Standing', playing: ['Idle_Standing'] });
  expect(end.weights).toMatchObject({ idle: 1, walk: 0 });
  const last = path.length >= 2 ? path[path.length - 2]! : lead.position;
  expect(angleDiff(end.yaw!, yawTo(last, dest))).toBeLessThan(0.01);
  // Hero rotation and camera follow never change the viewing angle.
  for (const s of samples) {
    expect(s.cam!.alpha).toBe(pose0.alpha);
    expect(s.cam!.beta).toBe(pose0.beta);
  }
  // Selection and the HUD are intact after the move.
  expect((await inspect(page)).state.heroes[lead.id].position).toEqual(dest);
  await expect(page.getByTestId('end-day')).toBeEnabled();
  expect(errors.filter((e) => !/favicon/i.test(e))).toEqual([]);
});

/** Player hero two steps from the rival hero (so the attack includes an approach move). */
function encounterSave(name: string): { file: string; heroId: string; rivalTile: HexCoord; approach: HexCoord } {
  const d = driver(`e2e-${name.replace(/\W+/g, '-')}`);
  const hero = Object.values(d.state.heroes).find((h) => h.ownerId === 'player')!;
  hero.movementPoints = 2000;
  const rival = d.state.heroes.rival_odysseus!;
  rival.position = { q: 12, r: 8 };
  const approach = approachTile(d, rival.position, hero.id);
  let start: HexCoord | null = null;
  for (const n of axialNeighbors(approach)) {
    if (n.q === rival.position.q && n.r === rival.position.r) continue;
    hero.position = n;
    const q = quoteMovement(d.catalog, d.state, hero.id, rival.position);
    if (q.reachable && q.endsInEncounter && q.path.length === 2 && q.path[0]!.q === approach.q && q.path[0]!.r === approach.r) {
      start = n;
      break;
    }
  }
  expect(start, 'two-step start tile').not.toBeNull();
  hero.position = start!;
  return { file: writeSave(d, name), heroId: hero.id, rivalTile: rival.position, approach };
}

async function openEncounter(page: Page, rival: HexCoord): Promise<void> {
  await clickHex(page, rival.q, rival.r);
  if (!(await inspect(page)).overlays.includes('encounter')) await clickHex(page, rival.q, rival.r);
  await waitFor(page, (s) => s.overlays.includes('encounter'), 'encounter dialog');
}

test('Withdraw cancels the encounter: no battle and no readiness gesture', async ({ page }) => {
  const enc = encounterSave('heroes withdraw');
  const errors: string[] = [];
  await openSave(page, enc.file, errors);
  await waitModels(page, [enc.heroId, 'rival_odysseus']);
  await openEncounter(page, enc.rivalTile);
  // The two armies face each other; no strength estimate; Withdraw carries an icon.
  await expect(page.getByTestId('encounter').locator('.encounter-side')).toHaveCount(2);
  await expect(page.getByTestId('encounter')).not.toContainText('Estimate');
  await expect(page.getByTestId('encounter-withdraw').locator('svg, img')).toHaveCount(1);
  await page.screenshot({ path: 'test-results/encounter-dialog.png' });
  await page.getByRole('button', { name: 'Withdraw' }).click();
  await page.waitForTimeout(3500);
  const s = await inspect(page);
  expect(s.screen).toBe('adventure');
  expect(s.state.battle).toBeNull();
  expect((s as unknown as { battleScreenOpens: number }).battleScreenOpens).toBe(0);
  const h = (await heroes(page))!;
  expect(h[enc.heroId]).toMatchObject({ clip: 'Idle_Standing', prepareStarted: 0, prepareFinished: 0 });
  expect((s as unknown as { prepareWar: unknown }).prepareWar).toEqual({ finished: 0, cancelled: 0, skipped: 0 });
  expect(errors.filter((e) => !/favicon/i.test(e))).toEqual([]);
});

test('Attack: the hero walks to the approach tile, faces the opponent, plays Prepare_War once, and the battle opens once after it finishes', async ({ page }) => {
  test.setTimeout(180_000);
  const enc = encounterSave('heroes attack');
  const errors: string[] = [];
  await openSave(page, enc.file, errors);
  await waitModels(page, [enc.heroId, 'rival_odysseus']);
  await openEncounter(page, enc.rivalTile);
  await startSampling(page);
  await page.getByTestId('encounter-attack').click();
  await waitFor(page, (s) => s.screen === 'battle', 'battle screen', 30_000);
  await page.waitForTimeout(2500);
  const all = await stopSampling(page);
  const samples = all.filter((s) => s.h?.[enc.heroId]);
  const at = (pred: (h: HeroDebug) => boolean) => samples.find((s) => pred(s.h![enc.heroId]!));
  const walk = at((h) => h.clip === 'Walk');
  const prep = at((h) => h.clip === 'Prepare_War');
  expect(walk, 'walked to the approach tile').toBeDefined();
  expect(prep, 'Prepare_War played').toBeDefined();
  expect(walk!.t).toBeLessThan(prep!.t);
  // Movement had stopped before the gesture: no Walk once Prepare_War began, played once.
  const during = samples.filter((s) => s.t >= prep!.t);
  expect(during.every((s) => s.h![enc.heroId]!.clip === 'Prepare_War' && s.h![enc.heroId]!.prepareStarted === 1)).toBe(true);
  // Facing the opponent; the defending mounted hero turned to meet the attacker.
  const lastMap = samples[samples.length - 1]!;
  expect(angleDiff(lastMap.h![enc.heroId]!.yaw!, yawTo(enc.approach, enc.rivalTile))).toBeLessThan(0.01);
  expect(angleDiff(lastMap.h!.rival_odysseus!.yaw!, yawTo(enc.rivalTile, enc.approach))).toBeLessThan(0.01);
  // The map stays until the clip's finished event (2.4 s, no shortcut timer); the battle then opens exactly once.
  const firstGone = all.find((s) => s.t > prep!.t && !s.h);
  expect(firstGone, 'map closed for the battle').toBeDefined();
  expect(firstGone!.t - prep!.t).toBeGreaterThan(2200);
  const s = await inspect(page);
  expect(s.screen).toBe('battle');
  expect((s as unknown as { battleScreenOpens: number }).battleScreenOpens).toBe(1);
  expect((s as unknown as { prepareWar: unknown }).prepareWar).toEqual({ finished: 1, cancelled: 0, skipped: 0 });
  expect(errors.filter((e) => !/favicon/i.test(e))).toEqual([]);
});

test('leaving for the main menu during Prepare_War ignores its completion: no battle screen', async ({ page }) => {
  const enc = encounterSave('heroes abandon');
  const errors: string[] = [];
  await openSave(page, enc.file, errors);
  await waitModels(page, [enc.heroId, 'rival_odysseus']);
  await openEncounter(page, enc.rivalTile);
  await page.getByTestId('encounter-attack').click();
  // Software-rendered CI frames are slow; wait for the gesture by time, not by a frame count.
  for (const t0 = Date.now(); Date.now() - t0 < 20_000; ) {
    if ((await heroes(page))?.[enc.heroId]?.clip === 'Prepare_War') break;
    await page.waitForTimeout(30);
  }
  expect((await heroes(page))?.[enc.heroId]?.clip).toBe('Prepare_War');
  // Pause → Main Menu → confirm, quickly (the gesture lasts 2.4 s).
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: /Main Menu/ }).click({ force: true });
  await page.getByTestId('confirm-ok').click({ force: true });
  await page.waitForTimeout(4000);
  const s = await inspect(page);
  expect(s.screen).toBe('main-menu');
  expect((s as unknown as { battleScreenOpens: number }).battleScreenOpens).toBe(0);
  expect((s as unknown as { prepareWar: unknown }).prepareWar).toEqual({ finished: 0, cancelled: 1, skipped: 0 });
  expect(errors.filter((e) => !/favicon/i.test(e))).toEqual([]);
});

test('the map camera pans left, right, up and down without changing its angle', async ({ page }) => {
  const d = driver('e2e-heroes-camera');
  const errors: string[] = [];
  await openSave(page, writeSave(d, 'heroes camera'), errors);
  await page.waitForTimeout(800);
  const p0 = await camera(page);
  const same = (p: Pose) => {
    expect(p.alpha).toBe(p0.alpha);
    expect(p.beta).toBe(p0.beta);
  };
  const box = (await page.locator('canvas').first().boundingBox())!;
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  async function drag(dx: number, dy: number, button: 'left' | 'middle' | 'right' = 'left'): Promise<Pose> {
    const before = await camera(page);
    await page.mouse.move(cx, cy);
    await page.mouse.down({ button });
    for (let i = 1; i <= 8; i++) await page.mouse.move(cx + (dx * i) / 8, cy + (dy * i) / 8);
    await page.mouse.up({ button });
    await page.waitForTimeout(150);
    const after = await camera(page);
    same(after);
    expect(after.radius).toBe(before.radius);
    return { ...after, target: { x: after.target.x - before.target.x, y: after.target.y - before.target.y, z: after.target.z - before.target.z } };
  }
  // The map follows the mouse: dragging left moves the view right, dragging up moves it toward the bottom.
  const left = await drag(-220, 0);
  expect(left.target.x).toBeGreaterThan(0.5);
  expect(Math.abs(left.target.z)).toBeLessThan(0.05);
  const right = await drag(220, 0);
  expect(right.target.x).toBeLessThan(-0.5);
  const up = await drag(0, -160);
  expect(up.target.z).toBeLessThan(-0.5);
  expect(Math.abs(up.target.x)).toBeLessThan(0.05);
  const down = await drag(0, 160);
  expect(down.target.z).toBeGreaterThan(0.5);
  // Middle-drag pans too; right-drag never orbits or tilts.
  const mid = await drag(-150, 0, 'middle');
  expect(mid.target.x).toBeGreaterThan(0.3);
  await drag(150, 120, 'right');
  // Keyboard panning is screen-relative too.
  for (const [key, axis, sign] of [['ArrowRight', 'x', 1], ['ArrowLeft', 'x', -1], ['ArrowUp', 'z', 1], ['ArrowDown', 'z', -1]] as const) {
    const before = await camera(page);
    await page.mouse.move(cx, cy);
    await page.keyboard.press(key);
    await page.waitForTimeout(80);
    const after = await camera(page);
    same(after);
    expect((after.target[axis] - before.target[axis]) * sign, key).toBeCloseTo(1.2, 3);
  }
  // Zoom changes the distance only.
  await page.mouse.move(cx, cy);
  await page.mouse.wheel(0, -400);
  await page.waitForTimeout(150);
  const z = await camera(page);
  same(z);
  expect(z.radius).toBeLessThan(p0.radius);
  // Panning is clamped to the map: a long drag stops at the edge.
  for (let i = 0; i < 6; i++) await drag(-600, 0);
  const edge = (await camera(page)).target.x;
  await drag(-600, 0);
  expect((await camera(page)).target.x).toBeCloseTo(edge, 6);
  same(await camera(page));
  expect(errors.filter((e) => !/favicon/i.test(e))).toEqual([]);
});
