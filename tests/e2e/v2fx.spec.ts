import { expect, test, type Page } from '@playwright/test';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { inspect, waitFor, type Inspect } from './helpers';
import { importAndLoad } from './fixtures';
import { clickBattleCell, usePrefs } from './momentFixtures';
import { DARK, MOMENTS, REPLAY, SAND, SNOW, fxBattle, fxDefence, fxSiege, type CheckedShot, type FxBattle } from './fxFixtures';

/**
 * Battle FX delivery (handoff 2026-10-15 §4–6, §10): shooter missiles and impacts in the running game.
 *
 *  - Every one of the 22 shooter forms, base and upgraded, flies its own profile — left, right,
 *    diagonally, near and far, at one- and two-hex targets, a target falling to the shot — on dark
 *    ground (jungle grove), sand (desert coast road), snow (tundra field) and at 1920 × 1080.
 *  - On arrival, at once: the travel sprite goes, the profile's impact starts once at the contact
 *    point (the middle of the target's body), and the target's hit reaction and damage words start
 *    in the same moment; the impact plays its four frames once.
 *  - A shooter engaged in melee strikes without a missile; a skip mid-flight finishes the missile and
 *    its impact at once; a battle speed change scales the flight; leaving the battle mid-flight and
 *    playing the same save again shows the same missile; reduced effects show the impact's first
 *    frame only; reduced motion (instant playback) shows none and ends in the same state.
 *  - A siege: the Cyclops and the Divine Colossus batter the walls with their own missiles, the
 *    Catapult throws its stone and the towers and keep shoot their arrows; and a town defended by
 *    the human, drawn mirrored.
 *
 * Saves are built headlessly (fxFixtures.ts) and imported through Load → Import; the page is only
 * observed through the read-only `?e2e` readouts (`__prSiege().projectiles`: the battle view's shot
 * log; `__prBattle`: the stacks). Screenshots mid-flight and at impact: /home/claude/capture/v2-fx/.
 *
 * Time: once a battle is on screen, the page's clock is Playwright's fake clock, frozen and advanced
 * by the test one frame at a time (test tooling, not a game hook), so each screenshot shows the very
 * frame wanted — a missile halfway, an impact's second frame — on any machine speed. The game's own
 * frame loop, tweens and AI timers run on that clock; nothing in the game is told about it.
 */

const OUT = '/home/claude/capture/v2-fx';
mkdirSync(OUT, { recursive: true });
const FX = JSON.parse(readFileSync(new URL('../../assets-runtime/battle-fx-neutral-upgrades-v1/manifest.json', import.meta.url), 'utf8')) as {
  projectileProfiles: Record<string, { path: string; durationMsRange: [number, number]; sizeHex: number; impactFps: number; impactEffectId: string }>;
};
const PROFILES = FX.projectileProfiles;
/** One frame of the stepped clock (ms of game time). */
const STEP_MS = 50;

interface ShotRec {
  seq: number;
  event: string;
  source: 'creature' | 'turret' | 'catapult';
  creatureId: string | null;
  profile: string | null;
  fallback: string | null;
  path: string;
  playback: string;
  from: { x: number; y: number };
  to: { x: number; y: number };
  boardFrom: { x: number; y: number };
  boardTo: { x: number; y: number };
  facing: 1 | -1;
  socket: { frame: number; x: number; y: number; calibrated: boolean } | null;
  mirroredBoard: boolean;
  speed: number;
  drawnHex: number | null;
  flightMs: number;
  arc: number;
  launchAngle: number;
  arrivalAngle: number;
  launchedAt: number;
  arrivedAt: number | null;
  impact: string | null;
  impacts: number;
  impactAt: number | null;
  impactFrames: number[];
  impactEndAt: number | null;
  impactScale: number | null;
  reactAt: number | null;
}
interface Missiles {
  time: number;
  inFlight: number;
  effects: number;
  shots: ShotRec[];
}
interface StackShot {
  x: number;
  y: number;
  down: boolean;
  hits: number;
  deaths: number;
  mirrored: boolean;
}

const missiles = (page: Page): Promise<Missiles | null> => page.evaluate(() => ((globalThis as unknown as { __prSiege: () => { projectiles?: Missiles } | null }).__prSiege()?.projectiles ?? null));
const scene = (page: Page): Promise<Record<string, StackShot>> => page.evaluate(() => ((globalThis as unknown as { __prBattle: () => Record<string, StackShot> | null }).__prBattle() ?? {}));
const project = (page: Page, col: number, row: number) =>
  page.evaluate(([c, r]) => (globalThis as unknown as { __prProject: (k: string, a: number, b: number) => { x: number; y: number } | null }).__prProject('battle', c!, r!), [col, row]);

/** Every page error and console error while a test runs (a missile must never throw). */
function watchErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error' && !/favicon|Failed to load resource/.test(m.text())) errors.push(`console: ${m.text()}`);
  });
  return errors;
}

async function shot(page: Page, name: string): Promise<void> {
  await page.screenshot({ path: `${OUT}/${name}.png`, animations: 'disabled' });
}

// ------------------------------------------------------------------ the stepped clock

const frozen = new WeakSet<Page>();

/**
 * Freeze the page's clock. Its real-time mode, when frames take longer than its 16 ms, keeps a
 * backlog that it works off in a loop `pauseAt` does not stop — so this waits until that has
 * drained (the controller clock stands still) before the test steps on.
 */
async function freeze(page: Page): Promise<void> {
  let paused = false;
  // A moment ahead of the page's own clock (a busy machine needs a wider margin; never into the past).
  for (const margin of [40, 80, 160, 320, 640, 1280]) {
    const t = await page.evaluate(() => Date.now());
    try {
      await page.clock.pauseAt(t + margin);
      paused = true;
      break;
    } catch (e) {
      if (!/to the past/.test(String(e))) throw e;
    }
  }
  if (!paused) throw new Error('could not freeze the clock');
  frozen.add(page);
  let last = -1;
  let still = 0;
  for (let i = 0; i < 900 && still < 3; i++) {
    const now = (await missiles(page))?.time ?? 0;
    still = now === last ? still + 1 : 0;
    last = now;
    await page.waitForTimeout(100);
  }
}

async function resume(page: Page): Promise<void> {
  frozen.delete(page);
  await page.clock.resume();
}

/** Wait for `pred`: one frame at a time on a frozen page, else in real time. */
async function settle(page: Page, pred: () => Promise<boolean>, label: string, ms = 600_000): Promise<void> {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (await pred()) return;
    if (frozen.has(page)) await page.clock.fastForward(STEP_MS);
    else await page.waitForTimeout(40);
  }
  throw new Error(`timed out waiting for ${label}`);
}

/** The shot log once `pred` holds. */
async function until(page: Page, pred: (m: Missiles) => boolean, label: string, ms = 600_000): Promise<Missiles> {
  let last: Missiles | null = null;
  await settle(page, async () => !!(last = await missiles(page)) && pred(last), label, ms).catch((e: Error) => {
    throw new Error(`${e.message}: ${JSON.stringify(last)?.slice(0, 600)}`);
  });
  return last!;
}

/** The game's read-only state once `pred` holds. */
async function waitState(page: Page, pred: (s: Inspect) => boolean, label: string, ms = 600_000): Promise<Inspect> {
  let last: Inspect | null = null;
  await settle(page, async () => pred((last = await inspect(page))), label, ms);
  return last!;
}

async function ready(page: Page): Promise<Inspect> {
  const s = await waitState(page, (x) => x.screen === 'battle' && x.humanTurn && !x.busy && !!x.state.battle, 'the player’s turn');
  await settle(page, async () => !(await page.getByTestId('battle-loading').isVisible()), 'the board');
  return s;
}

async function activeIs(page: Page, id: string): Promise<Inspect> {
  return waitState(page, (x) => x.screen === 'battle' && x.humanTurn && !x.busy && x.state.battle?.activeStackId === id, `stack ${id} to act`);
}

/** Open the save with these preferences, the battle on screen, then freeze the clock for stepping. */
async function load(page: Page, prefs: Record<string, unknown>, file: string, step = true): Promise<void> {
  await usePrefs(page, prefs);
  await page.clock.install();
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await importAndLoad(page, file);
  await ready(page);
  if (step) await freeze(page);
}

/**
 * Capture one missile on the frozen clock (launched by the caller's last action): step until
 * `pick` finds it halfway through its flight (screenshot), then to its impact's second frame (its
 * first under reduced effects; screenshot).
 */
async function capture(page: Page, pick: (m: Missiles) => ShotRec | null, name: string, impactFrame = 1): Promise<{ midFlight: boolean; impact: boolean }> {
  expect(frozen.has(page), 'captures run on the stepped clock').toBe(true);
  let m = await until(page, (x) => !!pick(x), `${name} to fly`);
  const seq = pick(m)!.seq;
  // Followed by its sequence number from here on (it may stop matching `pick` once it lands).
  const find = (x: Missiles) => x.shots.find((r) => r.seq === seq) ?? null;
  let midFlight = false;
  // The controller clock across each screenshot (it must not move).
  const drift: number[] = [];
  m = await until(page, (x) => {
    const q = find(x)!;
    return q.arrivedAt !== null || x.time - q.launchedAt >= 0.5 * q.flightMs * q.speed;
  }, `${name} halfway`);
  if (find(m)!.arrivedAt === null && m.inFlight > 0) {
    await shot(page, `${name}-1-flight`);
    midFlight = true;
    drift.push((await missiles(page))!.time - m.time);
  }
  m = await until(page, (x) => {
    const q = find(x)!;
    return q.impactEndAt !== null || q.impactFrames.length > impactFrame || (q.reactAt !== null && q.impact === null);
  }, `${name} impact`);
  const q = find(m)!;
  const impact = q.impactAt !== null && q.impactEndAt === null;
  if (impact) {
    await shot(page, `${name}-2-impact`);
    drift.push((await missiles(page))!.time - m.time);
  }
  writeFileSync(`${OUT}/${name}.capture.json`, JSON.stringify({ time: m.time, inFlight: m.inFlight, effects: m.effects, drift, rec: q }, null, 1));
  expect(drift, `${name}: the clock stood still for the screenshots`).toEqual(drift.map(() => 0));
  return { midFlight, impact };
}

/** Page pixels of one hex width on the board as drawn now. */
async function hexPx(page: Page): Promise<number> {
  const a = (await project(page, 5, 4))!;
  const b = (await project(page, 6, 4))!;
  return Math.hypot(b.x - a.x, b.y - a.y);
}

/** Canvas-local CSS pixels of a stack's feet (the readouts' coordinates). */
async function feet(page: Page, id: string): Promise<{ x: number; y: number }> {
  const s = (await scene(page))[id]!;
  return { x: s.x, y: s.y };
}

interface FireOpts {
  readonly prefix: string;
  /** The tween clock's speed factor expected for this shot (2 at 0.5×). */
  readonly speed: number;
  /** Expected impact frames (full effects: 0–3; reduced: the first only). */
  readonly frames?: number[];
  /** The board is drawn mirrored (the human defends against the computer). */
  readonly mirrored?: boolean;
}

/**
 * Fire one planned shot by clicking its target, capture it in the air and at impact, and check the
 * shot log: its own profile and path, one impact at the contact point at the moment of arrival,
 * the target's reaction at that same moment, the flight time within the profile range and scaled by
 * the battle speed, the release point in front of and above the shooter, the contact on the body.
 */
async function fire(page: Page, fx: FxBattle, s: CheckedShot, o: FireOpts): Promise<ShotRec> {
  await activeIs(page, s.shooterId);
  const before = (await missiles(page))!;
  const lastSeq = before.shots[before.shots.length - 1]?.seq ?? 0;
  const pre = await scene(page);
  const hitsBefore = pre[s.targetId]!.hits;
  const shooterFeet = await feet(page, s.shooterId);
  const targetFeet = await feet(page, s.targetId);
  const hex = await hexPx(page);
  const mine = (m: Missiles) => m.shots.find((r) => r.seq > lastSeq && r.event === 'BattleAttack' && r.creatureId === s.creatureId) ?? null;
  const name = `${o.prefix}-${s.label}`;
  await clickBattleCell(page, s.targetCell.col, s.targetCell.row);
  const seen = await capture(page, mine, name, o.frames?.length === 1 ? 0 : 1);
  // The target's hit reaction (and its fall) and the impact play out.
  await until(page, (m) => m.inFlight === 0 && mine(m)?.impactEndAt != null, `${s.label} impact to finish`);
  const rec = mine((await missiles(page))!)!;
  const want = PROFILES[s.creatureId]!;
  writeFileSync(`${OUT}/${name}.json`, JSON.stringify({ label: s.label, rec, shooterFeet, targetFeet, hex, captured: seen }, null, 1));

  expect(seen, `${s.label}: captured in the air and at impact`).toEqual({ midFlight: true, impact: true });
  // Its own profile, never the generic arrow; one record for the one shot event.
  expect(rec.profile, s.label).toBe(s.creatureId);
  expect(rec.fallback).toBeNull();
  expect(rec.path).toBe(want.path);
  expect((await missiles(page))!.shots.filter((r) => r.seq > lastSeq && r.creatureId === s.creatureId && r.event === 'BattleAttack')).toHaveLength(1);
  // Drawn at its full source cell = sizeHex.
  expect(rec.drawnHex).toBeCloseTo(want.sizeHex, 2);
  // Flight time: within the profile range (nominal), scaled by the battle speed on the controller clock.
  expect(rec.flightMs).toBeGreaterThanOrEqual(want.durationMsRange[0]);
  expect(rec.flightMs).toBeLessThanOrEqual(want.durationMsRange[1]);
  expect(rec.speed).toBeCloseTo(o.speed, 6);
  const flew = rec.arrivedAt! - rec.launchedAt;
  expect(flew).toBeGreaterThanOrEqual(rec.flightMs * o.speed - 1);
  expect(flew).toBeLessThanOrEqual(rec.flightMs * o.speed + 120);
  // On arrival, at once: one impact (never at launch), the target's reaction in the same moment.
  expect(rec.impacts).toBe(1);
  expect(rec.impact).toBe(want.impactEffectId);
  expect(rec.impactAt).toBe(rec.arrivedAt);
  expect(rec.reactAt).toBe(rec.arrivedAt);
  // Played once, never looped: its frames in order from the first to the last, for its length.
  if (o.frames) expect(rec.impactFrames).toEqual(o.frames);
  else expect(rec.impactFrames).toEqual([0, 1, 2, 3]);
  const impactMs = (o.frames?.length === 1 ? 180 : (4 / want.impactFps) * 1000) * o.speed;
  expect(rec.impactEndAt! - rec.impactAt!).toBeGreaterThanOrEqual(impactMs - 1);
  expect(rec.impactEndAt! - rec.impactAt!).toBeLessThanOrEqual(impactMs + 120);
  const post = await scene(page);
  expect(post[s.targetId]!.hits).toBe(hitsBefore + 1);
  // Direction: the art turned toward the target; released in front of the shooter and above its feet
  // (on a mirrored board the rules' west is the screen's east).
  expect(rec.mirroredBoard).toBe(!!o.mirrored);
  expect(rec.facing).toBe(s.dir);
  expect(Math.sign(rec.from.x - shooterFeet.x)).toBe(o.mirrored ? -s.dir : s.dir);
  expect(rec.from.y).toBeLessThan(shooterFeet.y - hex * 0.3);
  // Contact: on the target's body, near its middle (the near half of a two-hex body), never at its feet.
  expect(Math.abs(rec.to.x - targetFeet.x)).toBeLessThanOrEqual(hex * (s.targetFootprint === 2 ? 0.4 : 0.15));
  expect(rec.to.y).toBeLessThan(targetFeet.y - hex * 0.2);
  // A target that falls to the shot lies down (its death strip once).
  if (s.targetFalls) await settle(page, async () => ((await scene(page))[s.targetId]?.deaths ?? 0) === 1, `${s.label}: the target falls`);
  return rec;
}

async function playAll(page: Page, fx: FxBattle, prefix: string, speed: number, mirrored = false): Promise<ShotRec[]> {
  const out: ShotRec[] = [];
  for (const s of fx.shots) out.push(await fire(page, fx, s, { prefix, speed, mirrored }));
  // Nothing of a missile or impact is left on the effect layer once they are over.
  await until(page, (m) => m.inFlight === 0 && m.effects === 0, 'the effect layer to clear');
  return out;
}

test.describe.configure({ mode: 'serial' });

test.describe('1366×768', () => {
  test.use({ viewport: { width: 1366, height: 768 } });

  test('dark ground: Greek and Norse shooters, base and upgraded', async ({ page }) => {
    test.setTimeout(1_800_000);
    const errors = watchErrors(page);
    const fx = fxBattle(DARK);
    await load(page, { battleSpeed: '0.5' }, fx.file);
    await shot(page, 'dark-0-board');
    await playAll(page, fx, 'dark', 2);
    expect(errors).toEqual([]);
  });

  test('sand: Norse, Egyptian and Japanese shooters', async ({ page }) => {
    test.setTimeout(1_800_000);
    const errors = watchErrors(page);
    const fx = fxBattle(SAND);
    await load(page, { battleSpeed: '0.5' }, fx.file);
    await shot(page, 'sand-0-board');
    await playAll(page, fx, 'sand', 2);
    expect(errors).toEqual([]);
  });

  test('snow: Celtic and Mesoamerican shooters and the slinger', async ({ page }) => {
    test.setTimeout(1_800_000);
    const errors = watchErrors(page);
    const fx = fxBattle(SNOW);
    await load(page, { battleSpeed: '0.5' }, fx.file);
    await shot(page, 'snow-0-board');
    await playAll(page, fx, 'snow', 2);
    expect(errors).toEqual([]);
  });

  test('siege: wall breakers batter with their own missiles, the Catapult throws its stone, towers shoot arrows', async ({ page }) => {
    test.setTimeout(1_800_000);
    const errors = watchErrors(page);
    const sg = fxSiege();
    await load(page, { battleSpeed: '0.5' }, sg.file);
    await shot(page, 'siege-0-board');
    const since = (await missiles(page))!.shots.length;
    // The two wall breakers: Structure → a wall section.
    for (const [id, creatureId, wall] of [[sg.cyclops, 'cyclops', 'wall_2'], [sg.colossus, 'egyptian_divine_colossus', 'wall_3']] as const) {
      await activeIs(page, id);
      const last = (await missiles(page))!.shots.at(-1)?.seq ?? 0;
      const mine = (m: Missiles) => m.shots.find((r) => r.seq > last && r.event === 'SiegeStructureDamaged' && r.creatureId === creatureId) ?? null;
      await page.getByTestId('battle-structure').click();
      await page.getByTestId(`structure-${wall}`).click();
      expect(await capture(page, mine, `siege-${creatureId}-wall`)).toEqual({ midFlight: true, impact: true });
      await until(page, (m) => m.inFlight === 0 && mine(m)?.impactEndAt != null, 'the wall impact to finish');
      const rec = mine((await missiles(page))!)!;
      writeFileSync(`${OUT}/siege-${creatureId}-wall.json`, JSON.stringify(rec, null, 1));
      // Its OWN missile at the wall, never the Catapult's stone.
      expect(rec.profile).toBe(creatureId);
      expect(rec.source).toBe('creature');
      expect(rec.impact).toBe(`battlefx.${creatureId}.hit`);
      expect(rec.impacts).toBe(1);
      expect(rec.impactAt).toBe(rec.arrivedAt);
      expect(rec.reactAt).toBe(rec.arrivedAt);
      expect(rec.path).toBe('high-ballistic');
      expect(rec.impactFrames).toEqual([0, 1, 2, 3]);
    }
    // The peltasts shoot the town's hoplites over the wall.
    await activeIs(page, sg.peltast);
    let s = await inspect(page);
    const g = s.state.battle.stacks[sg.guard].anchor as { col: number; row: number };
    const last = (await missiles(page))!.shots.at(-1)?.seq ?? 0;
    await clickBattleCell(page, g.col, g.row);
    const pel = (m: Missiles) => m.shots.find((r) => r.seq > last && r.creatureId === 'peltast') ?? null;
    expect(await capture(page, pel, 'siege-peltast-over-wall')).toEqual({ midFlight: true, impact: true });
    // The town's hoplites act; round 2 opens with the Catapult and the turrets.
    expect(await capture(page, (m) => m.shots.find((r) => r.source === 'catapult' && r.seq > last) ?? null, 'siege-catapult')).toEqual({ midFlight: true, impact: true });
    // The first turret arrow (the keep and the two towers shoot in turn).
    expect(await capture(page, (m) => m.shots.find((r) => r.source === 'turret' && r.seq > last) ?? null, 'siege-turret')).toEqual({ midFlight: true, impact: true });
    s = await waitState(page, (x) => x.screen === 'battle' && x.humanTurn && !x.busy && x.state.battle?.round >= 2, 'round 2, the player’s turn');
    const all = (await missiles(page))!.shots.slice(since);
    writeFileSync(`${OUT}/siege-shots.json`, JSON.stringify(all, null, 1));
    const stones = all.filter((r) => r.source === 'catapult');
    const arrows = all.filter((r) => r.source === 'turret');
    expect(stones.length).toBe(1);
    for (const r of stones) {
      expect(r.profile).toBe('catapult');
      expect(r.impact).toBe('battlefx.catapult.hit');
      expect(r.impacts).toBe(1);
      expect(r.impactAt).toBe(r.arrivedAt);
      expect(r.path).toBe('high-ballistic');
    }
    expect(arrows.length).toBe(sg.turrets.length);
    for (const r of arrows) {
      expect(r.profile).toBe('siege_turret');
      expect(r.impact).toBe('battlefx.siege_turret.hit');
      expect(r.impacts).toBe(1);
      expect(r.impactAt).toBe(r.arrivedAt);
      expect(r.reactAt).toBe(r.arrivedAt);
      expect(r.facing).toBe(-1);
    }
    // No creature ever took the Catapult's stone.
    expect(all.filter((r) => r.source === 'creature').every((r) => r.profile !== 'catapult')).toBe(true);
    await until(page, (m) => m.inFlight === 0 && m.effects === 0, 'the effect layer to clear');
    expect(errors).toEqual([]);
  });

  test('battle speed change, leaving mid-flight, and the same save played again', async ({ page }) => {
    test.setTimeout(1_800_000);
    const errors = watchErrors(page);
    const fx = fxBattle(REPLAY);
    await load(page, { battleSpeed: '2' }, fx.file);
    const first = await fire(page, fx, fx.shots[0]!, { prefix: 'replay', speed: 0.5 });
    // Pause → Settings → battle speed 0.5× → back to the battle.
    await activeIs(page, fx.shots[1]!.shooterId);
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Settings' }).click();
    await page.getByLabel('Battle speed').selectOption('0.5');
    await page.getByTestId('settings-apply').click();
    await page.getByTestId('settings-back').click();
    await ready(page);
    await fire(page, fx, fx.shots[1]!, { prefix: 'replay', speed: 2 });
    // Leave for the main menu while the seer's bolt is in the air.
    const s = fx.shots[2]!;
    await activeIs(page, s.shooterId);
    const last = (await missiles(page))!.shots.at(-1)?.seq ?? 0;
    await clickBattleCell(page, s.targetCell.col, s.targetCell.row);
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Main Menu' }).click();
    const leaving = await until(page, (m) => m.inFlight > 0 && m.shots.some((r) => r.seq > last && m.time - r.launchedAt >= 0.4 * r.flightMs * r.speed), 'the bolt in the air');
    await shot(page, 'replay-leave-1-flight');
    expect(leaving.inFlight).toBe(1);
    // Confirm with the bolt in the air (a plain click event; nothing waits for a frame).
    await page.getByTestId('confirm-ok').dispatchEvent('click');
    await waitState(page, (x) => x.screen === 'main-menu', 'the main menu');
    for (let i = 0; i < 20; i++) await page.clock.fastForward(STEP_MS);
    expect(await missiles(page)).toBeNull();
    await shot(page, 'replay-leave-2-menu');
    // The same save again: the first shot flies exactly as before (same points, path and time).
    await resume(page);
    await importAndLoad(page, fx.file);
    await ready(page);
    await freeze(page);
    const again = await fire(page, fx, fx.shots[0]!, { prefix: 'replay-again', speed: 2 });
    for (const k of ['profile', 'path', 'impact', 'socket', 'facing'] as const) expect(again[k], k).toEqual(first[k]);
    // The same points (the throw's recoil is sampled on frame ticks: within a pixel or two), path and time.
    for (const k of ['boardFrom', 'boardTo'] as const) {
      expect(Math.abs(again[k].x - first[k].x), k).toBeLessThanOrEqual(2);
      expect(Math.abs(again[k].y - first[k].y), k).toBeLessThanOrEqual(2);
    }
    expect(Math.abs(again.flightMs - first.flightMs)).toBeLessThanOrEqual(3);
    expect(Math.abs(again.arc - first.arc)).toBeLessThanOrEqual(1);
    expect(Math.abs(again.launchAngle - first.launchAngle)).toBeLessThanOrEqual(1);
    expect(errors).toEqual([]);
  });

  test('reduced effects show the first impact frame of each impact, once', async ({ page }) => {
    test.setTimeout(1_200_000);
    const errors = watchErrors(page);
    const fx = fxBattle(REPLAY);
    await load(page, { battleSpeed: '0.5', graphicsQuality: 'low' }, fx.file);
    for (const s of fx.shots.slice(0, 2)) await fire(page, fx, s, { prefix: 'low', speed: 2, frames: [0] });
    const stacks = (await inspect(page)).state.battle.stacks as Record<string, { totalHp: number }>;
    for (const s of fx.shots.slice(0, 2)) expect(stacks[s.targetId]!.totalHp, s.label).toBe(s.targetHpAfter);
    expect(errors).toEqual([]);
  });

  test('reduced motion: instant playback flies no missile and ends exactly as the rules decided', async ({ page }) => {
    test.setTimeout(600_000);
    const errors = watchErrors(page);
    const fx = fxBattle(REPLAY);
    await load(page, { battleSpeed: '0.5', motion: 'reduced' }, fx.file, false);
    for (const s of fx.shots.slice(0, 2)) {
      await activeIs(page, s.shooterId);
      await clickBattleCell(page, s.targetCell.col, s.targetCell.row);
      await waitFor(page, (x) => x.state.battle?.activeStackId !== s.shooterId && !x.busy, `${s.label} instantly`, 120_000);
    }
    await shot(page, 'reduced-motion-after');
    const m = (await missiles(page))!;
    expect(m.shots).toEqual([]);
    expect(m.inFlight).toBe(0);
    expect(m.effects).toBe(0);
    const stacks = (await inspect(page)).state.battle.stacks as Record<string, { totalHp: number }>;
    for (const s of fx.shots.slice(0, 2)) expect(stacks[s.targetId]!.totalHp, s.label).toBe(s.targetHpAfter);
    expect(errors).toEqual([]);
  });
});

test.describe('mirrored board', () => {
  test.use({ viewport: { width: 1366, height: 768 } });

  test('the human defends: shots and tower arrows read the right way round on the mirrored board', async ({ page }) => {
    test.setTimeout(1_800_000);
    const errors = watchErrors(page);
    const fx = fxDefence();
    await load(page, { battleSpeed: '0.5' }, fx.file);
    expect(((await page.evaluate(() => (globalThis as unknown as { __prSiege: () => { mirrored: boolean } }).__prSiege())) ?? { mirrored: false }).mirrored).toBe(true);
    await shot(page, 'mirrored-0-board');
    const before = (await missiles(page))!.shots.length;
    for (const s of fx.shots) await fire(page, fx, s, { prefix: 'defence', speed: 2, mirrored: true });
    // The attackers act; round 2 opens with the town's towers and keep shooting (the human's turrets, west on the board).
    const since = (await missiles(page))!.shots.at(-1)?.seq ?? 0;
    expect(await capture(page, (m) => m.shots.find((r) => r.source === 'turret' && r.seq > since) ?? null, 'defence-turret')).toEqual({ midFlight: true, impact: true });
    await waitState(page, (x) => x.screen === 'battle' && x.humanTurn && !x.busy && x.state.battle?.round >= 2, 'round 2, the player’s turn');
    const all = (await missiles(page))!.shots.slice(before);
    writeFileSync(`${OUT}/defence-shots.json`, JSON.stringify(all, null, 1));
    const arrows = all.filter((x) => x.source === 'turret');
    expect(arrows.length).toBeGreaterThan(0);
    for (const r of arrows) {
      expect(r.profile).toBe('siege_turret');
      expect(r.mirroredBoard).toBe(true);
      expect(r.facing).toBe(-1);
      // West on the board is east on the mirrored screen.
      expect(r.to.x).toBeGreaterThan(r.from.x);
      expect(r.impacts).toBe(1);
      expect(r.impactAt).toBe(r.arrivedAt);
    }
    await until(page, (m) => m.inFlight === 0 && m.effects === 0, 'the effect layer to clear');
    expect(errors).toEqual([]);
  });
});

test.describe('1920×1080', () => {
  test.use({ viewport: { width: 1920, height: 1080 } });

  test('sling master; an engaged shooter strikes without a missile; a skip mid-flight', async ({ page }) => {
    test.setTimeout(1_800_000);
    const errors = watchErrors(page);
    const fx = fxBattle(MOMENTS);
    await load(page, { battleSpeed: '0.5' }, fx.file);
    await shot(page, 'hd-0-board');
    await fire(page, fx, fx.shots[0]!, { prefix: 'hd', speed: 2 });
    // The peltast, engaged by the hoplite beside it, strikes it in melee: no missile flies.
    const pel = fx.ids['pel']!;
    let s = await activeIs(page, pel);
    const rev = s.state.revision;
    const shotsBefore = (await missiles(page))!.shots.length;
    const adj = s.state.battle.stacks[fx.ids['t_adj']!].anchor as { col: number; row: number };
    await clickBattleCell(page, adj.col, adj.row);
    let peak = 0;
    await settle(page, async () => {
      peak = Math.max(peak, (await missiles(page))!.inFlight);
      s = await inspect(page);
      return s.state.revision !== rev && !s.busy;
    }, 'the melee to play');
    expect(s.state.battle.activeStackId).not.toBe(pel);
    expect(peak).toBe(0);
    expect((await missiles(page))!.shots.length).toBe(shotsBefore);
    // The veteran peltast's javelin is skipped in the air: it lands at once, its impact plays at once, nothing stays behind.
    const vpel = fx.ids['vpel']!;
    await activeIs(page, vpel);
    const last = (await missiles(page))!.shots.at(-1)?.seq ?? 0;
    const tm = s.state.battle.stacks[fx.ids['t_mino']!].anchor as { col: number; row: number };
    await clickBattleCell(page, tm.col, tm.row);
    const atSkip = await until(page, (m) => m.inFlight > 0 && m.shots.some((r) => r.seq > last && m.time - r.launchedAt >= 0.4 * r.flightMs * r.speed), 'the javelin in the air');
    await shot(page, 'hd-skip-1-flight');
    expect(atSkip.inFlight).toBe(1);
    // Space (Skip): the key handler finishes the playback at once, before the clock moves again.
    await page.keyboard.press('Space');
    const skipped = (await missiles(page))!;
    const rec = skipped.shots.find((r) => r.seq > last)!;
    writeFileSync(`${OUT}/hd-skip.json`, JSON.stringify({ atSkip: atSkip.time, skipped }, null, 1));
    expect(skipped.inFlight).toBe(0);
    expect(rec.arrivedAt).toBe(atSkip.time);
    expect(rec.arrivedAt! - rec.launchedAt).toBeLessThan(rec.flightMs * 2);
    expect(rec.impacts).toBe(1);
    expect(rec.impactAt).toBe(rec.arrivedAt);
    expect(rec.impactEndAt).toBe(rec.arrivedAt);
    expect(rec.impactFrames[0]).toBe(0);
    expect(rec.reactAt).toBe(rec.arrivedAt);
    await waitState(page, (x) => x.state.battle?.activeStackId !== vpel && !x.busy, 'the skipped shot to finish');
    await shot(page, 'hd-skip-2-after');
    await until(page, (m) => m.inFlight === 0 && m.effects === 0, 'the effect layer to clear');
    // The next shot plays normally again.
    const seer = fx.ids['seer']!;
    const far = s.state.battle.stacks[fx.ids['t_far']!].anchor as { col: number; row: number };
    const plan: CheckedShot = { shooter: 'seer', target: 't_far', label: 'temple_seer-after-skip', shooterId: seer, targetId: fx.ids['t_far']!, creatureId: 'temple_seer', targetCreatureId: 'hoplite', targetCell: far, shooterCell: { col: 1, row: 9 }, dir: 1, distance: 12, targetFootprint: 1, killed: 0, targetFalls: false, targetHpAfter: 0 };
    await fire(page, fx, plan, { prefix: 'hd', speed: 2 });
    expect(errors).toEqual([]);
  });
});
