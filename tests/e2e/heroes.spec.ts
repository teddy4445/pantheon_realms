/**
 * Mounted map avatars (one per pantheon, 2D sprites) and the 2D map camera, in
 * the production build (ASSET_PIPELINE.md §1). Fixtures are ordinary save files
 * imported through Load → Import; the page is only read (__prInspect /
 * __prHeroes / __prCamera), never driven through hooks.
 */
import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { GameDriver } from '@pr/testing';
import { axialNeighbors, quoteMovement, reachableTiles, parseHexKey, type HexCoord } from '@pr/rules';
import { axialPoint, directionOf } from '@pr/presentation/core';
import { approachTile, importAndLoad, writeSave } from './fixtures';
import { clickHex, inspect, waitFor } from './helpers';

type HeroAnim = { file: string; status?: string; directions?: Record<string, { file: string }> };
/** The game's own sprite manifest: each pantheon's map avatar, final since the owner's delivery (commit 071968c). */
const HERO_SPRITES = (JSON.parse(readFileSync('assets-runtime/sprites/manifest.json', 'utf8')) as { heroes: Record<string, { status: string; animations: Record<string, HeroAnim> }> }).heroes;
const heroFiles = (pantheon: string, anim: string): string[] => {
  const a = HERO_SPRITES[pantheon]?.animations[anim];
  return a ? [a.file, ...Object.values(a.directions ?? {}).map((d) => d.file)].map((f) => `/${f}`) : [];
};

interface HeroDebug {
  sprite: 'ready' | 'loading' | 'missing';
  status: 'final' | 'placeholder' | null;
  clip: 'idle' | 'walk' | 'prepare';
  drawn: string | null;
  facing: string;
  mirrored: boolean;
  prepareCount: number;
}
type Heroes = Record<string, HeroDebug>;
interface Pose {
  x: number;
  y: number;
  zoom: number;
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

async function waitAvatars(page: Page, ids: readonly string[]): Promise<Heroes> {
  for (let i = 0; i < 120; i++) {
    const h = (await heroes(page)) ?? {};
    if (ids.every((id) => h[id]?.sprite === 'ready')) return h;
    if (ids.some((id) => h[id]?.sprite === 'missing')) throw new Error(`hero avatar missing: ${JSON.stringify(h)}`);
    await page.waitForTimeout(250);
  }
  throw new Error(`hero avatars not ready: ${JSON.stringify(await heroes(page))}`);
}

/** The map direction from one hex to another on the 2D board. */
const dirTo = (a: HexCoord, b: HexCoord) => {
  const p = axialPoint(a);
  const q = axialPoint(b);
  return directionOf(q.x - p.x, q.y - p.y);
};

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

test('six pantheons show their own mounted map avatar, idling, loaded from the game’s own files', async ({ page }) => {
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
  const sprites: { url: string; status: number }[] = [];
  page.on('request', (r) => requests.push(r.url()));
  page.on('response', (r) => {
    if (r.url().includes('/heroes/')) sprites.push({ url: r.url(), status: r.status() });
  });
  const errors: string[] = [];
  await openSave(page, writeSave(d, 'heroes six'), errors);
  const h = await waitAvatars(page, ids);
  await page.waitForTimeout(500);
  for (const id of ids) expect(h[id], id).toMatchObject({ sprite: 'ready', status: HERO_SPRITES[expected[id]!]!.status, clip: 'idle', drawn: 'idle' });

  // Every request stays on the game's own origin; each pantheon's avatar comes from its own files in the manifest.
  const origin = new URL(page.url()).origin;
  expect(requests.filter((u) => !u.startsWith(origin) && !u.startsWith('data:') && !u.startsWith('blob:'))).toEqual([]);
  const paths = new Set(sprites.map((s) => new URL(s.url).pathname));
  for (const p of ['greek', 'norse', 'egyptian', 'japanese', 'celtic', 'mesoamerican']) {
    expect(heroFiles(p, 'idle').some((f) => paths.has(f)), `${p} idle`).toBe(true);
  }
  for (const s of sprites) expect(s.status, s.url).toBe(200);
  // No 3D model is ever requested.
  expect(requests.filter((u) => /\.(glb|gltf)(\?|$)/i.test(u))).toEqual([]);
  await page.screenshot({ path: 'test-results/heroes-six.png' });
  expect(errors.filter((e) => !/favicon/i.test(e))).toEqual([]);
});

test('moving plays walk on that hero only, faces the travel direction and returns to idle; the zoom never changes', async ({ page }) => {
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
  await waitAvatars(page, [lead.id, 'e2e_buddy']);
  const pose0 = await camera(page);

  await clickHex(page, dest.q, dest.r); // preview
  await startSampling(page);
  await clickHex(page, dest.q, dest.r); // commit
  // The emulated GPU draws a frame in about 0.4 s and the game clock advances at most 0.1 s per frame, so a
  // four-step walk plays in slow motion here (about 17 s with the nature scenery on the map).
  await waitFor(page, (s) => s.state.heroes[lead.id].position.q === dest.q && s.state.heroes[lead.id].position.r === dest.r && !s.busy, 'hero moved', 45_000);
  await page.waitForTimeout(400);
  const samples = (await stopSampling(page)).filter((s) => s.h && s.cam);

  const walking = samples.filter((s) => s.h![lead.id]?.clip === 'walk');
  expect(walking.length).toBeGreaterThan(5);
  expect(walking.every((s) => s.h![lead.id]!.drawn === 'walk')).toBe(true);
  // Each step faces its own direction (the facings seen while walking are the steps' directions).
  const steps = path.map((c, i) => dirTo(i === 0 ? lead.position : path[i - 1]!, c));
  for (const s of walking) expect(steps).toContain(s.h![lead.id]!.facing);
  // The other hero idles throughout.
  for (const s of samples) expect(s.h!.e2e_buddy?.clip).toBe('idle');
  // Stopped: back to idle, facing the last step (westward steps mirror the side view).
  const end = samples[samples.length - 1]!.h![lead.id]!;
  expect(end).toMatchObject({ clip: 'idle', drawn: 'idle', facing: steps[steps.length - 1] });
  expect(end.mirrored).toBe(['w', 'nw', 'sw'].includes(steps[steps.length - 1]!));
  // Following the hero pans the view; it never zooms.
  for (const s of samples) expect(s.cam!.zoom).toBe(pose0.zoom);
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

test('Withdraw cancels the encounter: no battle and no readiness beat', async ({ page }) => {
  const enc = encounterSave('heroes withdraw');
  const errors: string[] = [];
  await openSave(page, enc.file, errors);
  await waitAvatars(page, [enc.heroId, 'rival_odysseus']);
  await openEncounter(page, enc.rivalTile);
  // The two armies face each other; no strength estimate; Withdraw carries an icon.
  await expect(page.getByTestId('encounter').locator('.encounter-side')).toHaveCount(2);
  await expect(page.getByTestId('encounter')).not.toContainText('Estimate');
  await expect(page.getByTestId('encounter-withdraw').locator('svg, img')).toHaveCount(1);
  await page.screenshot({ path: 'test-results/encounter-dialog.png' });
  await page.getByRole('button', { name: 'Withdraw' }).click();
  await page.waitForTimeout(2500);
  const s = await inspect(page);
  expect(s.screen).toBe('adventure');
  expect(s.state.battle).toBeNull();
  expect((s as unknown as { battleScreenOpens: number }).battleScreenOpens).toBe(0);
  const h = (await heroes(page))!;
  expect(h[enc.heroId]).toMatchObject({ clip: 'idle', prepareCount: 0 });
  expect((s as unknown as { prepareWar: unknown }).prepareWar).toEqual({ finished: 0, cancelled: 0, skipped: 0 });
  expect(errors.filter((e) => !/favicon/i.test(e))).toEqual([]);
});

test('Attack: the hero walks to the approach tile, faces the opponent, plays its readiness beat once, and the battle opens once after it', async ({ page }) => {
  test.setTimeout(180_000);
  const enc = encounterSave('heroes attack');
  const errors: string[] = [];
  await openSave(page, enc.file, errors);
  await waitAvatars(page, [enc.heroId, 'rival_odysseus']);
  await openEncounter(page, enc.rivalTile);
  await startSampling(page);
  await page.getByTestId('encounter-attack').click();
  await waitFor(page, (s) => s.screen === 'battle', 'battle screen', 30_000);
  await page.waitForTimeout(1500);
  const all = await stopSampling(page);
  const samples = all.filter((s) => s.h?.[enc.heroId]);
  const at = (pred: (h: HeroDebug) => boolean) => samples.find((s) => pred(s.h![enc.heroId]!));
  const walk = at((h) => h.clip === 'walk');
  const prep = at((h) => h.clip === 'prepare');
  expect(walk, 'walked to the approach tile').toBeDefined();
  expect(prep, 'readiness beat played').toBeDefined();
  expect(walk!.t).toBeLessThan(prep!.t);
  // Movement had stopped before the beat: no walk once it began, played once.
  const during = samples.filter((s) => s.t >= prep!.t);
  expect(during.every((s) => s.h![enc.heroId]!.clip === 'prepare' && s.h![enc.heroId]!.prepareCount === 1)).toBe(true);
  // The delivered prepare strip (Brief 11) is what is drawn, played once and then held until the map closes.
  expect(during.every((s) => s.h![enc.heroId]!.drawn === 'prepare')).toBe(true);
  // Facing the opponent; the defending hero turned to meet the attacker.
  const lastMap = samples[samples.length - 1]!;
  expect(lastMap.h![enc.heroId]!.facing).toBe(dirTo(enc.approach, enc.rivalTile));
  expect(lastMap.h!.rival_odysseus!.facing).toBe(dirTo(enc.rivalTile, enc.approach));
  // The map stays until the beat ends (about 1.2 s); the battle then opens exactly once.
  const firstGone = all.find((s) => s.t > prep!.t && !s.h);
  expect(firstGone, 'map closed for the battle').toBeDefined();
  expect(firstGone!.t - prep!.t).toBeGreaterThan(1000);
  const s = await inspect(page);
  expect(s.screen).toBe('battle');
  expect((s as unknown as { battleScreenOpens: number }).battleScreenOpens).toBe(1);
  expect((s as unknown as { prepareWar: unknown }).prepareWar).toEqual({ finished: 1, cancelled: 0, skipped: 0 });
  expect(errors.filter((e) => !/favicon/i.test(e))).toEqual([]);
});

test('leaving for the main menu during the readiness beat ignores its completion: no battle screen', async ({ page }) => {
  const enc = encounterSave('heroes abandon');
  const errors: string[] = [];
  await openSave(page, enc.file, errors);
  await waitAvatars(page, [enc.heroId, 'rival_odysseus']);
  await openEncounter(page, enc.rivalTile);
  await page.getByTestId('encounter-attack').click();
  for (const t0 = Date.now(); Date.now() - t0 < 20_000; ) {
    if ((await heroes(page))?.[enc.heroId]?.clip === 'prepare') break;
    await page.waitForTimeout(20);
  }
  expect((await heroes(page))?.[enc.heroId]?.clip).toBe('prepare');
  // Pause → Main Menu → confirm, quickly (the beat lasts about 1.2 s).
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: /Main Menu/ }).click({ force: true });
  await page.getByTestId('confirm-ok').click({ force: true });
  await page.waitForTimeout(3000);
  const s = await inspect(page);
  expect(s.screen).toBe('main-menu');
  expect((s as unknown as { battleScreenOpens: number }).battleScreenOpens).toBe(0);
  expect((s as unknown as { prepareWar: unknown }).prepareWar).toEqual({ finished: 0, cancelled: 1, skipped: 0 });
  expect(errors.filter((e) => !/favicon/i.test(e))).toEqual([]);
});

test('the map pans left, right, up and down by dragging and keys; the wheel zooms; panning stops at the map edge', async ({ page }) => {
  const d = driver('e2e-heroes-camera');
  const errors: string[] = [];
  await openSave(page, writeSave(d, 'heroes camera'), errors);
  await page.waitForTimeout(800);
  const p0 = await camera(page);
  const box = (await page.locator('.scene-viewport canvas').first().boundingBox())!;
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
    expect(after.zoom).toBe(before.zoom);
    return { x: after.x - before.x, y: after.y - before.y, zoom: after.zoom };
  }
  // The wheel zooms in. (First: since 2026-10-04 the camera stops half a hex past the map's edge, so at the
  // opening zoom a map that fits the view's height cannot pan vertically.)
  await page.mouse.move(cx, cy);
  for (let i = 0; i < 3; i++) {
    await page.mouse.wheel(0, -400);
    await page.waitForTimeout(150);
  }
  expect((await camera(page)).zoom).toBeGreaterThan(p0.zoom);
  // The map follows the mouse: dragging left moves the view right, dragging up moves it toward the bottom.
  const left = await drag(-220, 0);
  expect(left.x).toBeGreaterThan(20);
  expect(Math.abs(left.y)).toBeLessThan(1);
  const right = await drag(220, 0);
  expect(right.x).toBeLessThan(-20);
  const up = await drag(0, -160);
  expect(up.y).toBeGreaterThan(20);
  expect(Math.abs(up.x)).toBeLessThan(1);
  const down = await drag(0, 160);
  expect(down.y).toBeLessThan(-20);
  // Middle-drag pans too; right-drag does nothing.
  const mid = await drag(-150, 0, 'middle');
  expect(mid.x).toBeGreaterThan(10);
  const r = await drag(150, 120, 'right');
  expect(Math.abs(r.x) + Math.abs(r.y)).toBeLessThan(1);
  // Keyboard panning is screen-relative.
  for (const [key, axis, sign] of [['ArrowRight', 'x', 1], ['ArrowLeft', 'x', -1], ['ArrowUp', 'y', -1], ['ArrowDown', 'y', 1]] as const) {
    const before = await camera(page);
    await page.mouse.move(cx, cy);
    await page.keyboard.press(key);
    await page.waitForTimeout(80);
    const after = await camera(page);
    expect((after[axis] - before[axis]) * sign, key).toBeGreaterThan(10);
    expect(after.zoom).toBe(before.zoom);
  }
  // Panning is clamped to the map: a long drag stops at the edge.
  for (let i = 0; i < 6; i++) await drag(-600, 0);
  const edge = (await camera(page)).x;
  await drag(-600, 0);
  expect((await camera(page)).x).toBeCloseTo(edge, 6);
  expect(errors.filter((e) => !/favicon/i.test(e))).toEqual([]);
});
