import { expect, test, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { loadCatalog } from '@pr/content';
import { inspect, waitFor, type Inspect } from './helpers';
import { cellDistance, stackCells, type BattleState } from '@pr/rules';
import { importAndLoad } from './fixtures';
import { clickBattleCell, usePrefs } from './momentFixtures';
import { faceOff, neutralBattle, type NeutralBattle } from './v2battleFixtures';

/**
 * Campaign expansion (handoff 2026-10-15): the six neutral creatures in battle.
 *
 *  - Each ability button carries the ability's exact rule (from its definition), its uses left and,
 *    when it cannot be used, why; choosing one highlights the rules' legal targets on the field and
 *    lists them in the ability card, so the choice works from the keyboard as well as the pointer.
 *  - Using one plays the user's `ability` animation, the target's forced move as a slide, leaves a
 *    status mark on the target and a combat-log line naming user, ability and effect.
 *  - Normal and reduced-motion (instant) playback end in the same picture.
 *  - Each neutral is captured in battle (all poses the battle shows, both facings), the Pegasus in
 *    its takeoff, flight and landing, at 1280×720, 1366×768, 1920×1080 and a 160 % interface scale.
 *
 * Saves are built headlessly (v2battleFixtures.ts) and imported through Load → Import; the page is
 * only observed through the read-only `?e2e` inspectors. Screenshots: /home/claude/capture/v2-battle/.
 */

const OUT = '/home/claude/capture/v2-battle';
mkdirSync(OUT, { recursive: true });
const catalog = loadCatalog();

interface StackShot {
  anchor: { col: number; row: number };
  x: number;
  y: number;
  mirrored: boolean;
  drawn: string | null;
  status: string | null;
  sprite: string;
  down: boolean;
  marks: string[];
  overlays: string[];
  label: string;
  scale: number;
  lift: number;
}
const scene = (page: Page): Promise<Record<string, StackShot>> => page.evaluate(() => ((globalThis as unknown as { __prBattle: () => Record<string, StackShot> | null }).__prBattle() ?? {}));
const fxLog = (page: Page): Promise<string[]> => page.evaluate(() => ((globalThis as unknown as { __prFx: () => { battle: string[] | null } }).__prFx().battle ?? []));

async function shot(page: Page, name: string): Promise<void> {
  // CSS fades (the tooltip's) are finished first; the battlefield canvas is captured as drawn.
  await page.screenshot({ path: `${OUT}/${name}.png`, animations: 'disabled' });
}

/** The player's turn with the board drawn and no playback running. */
async function ready(page: Page, label = 'the player’s turn'): Promise<Inspect> {
  const s = await waitFor(page, (x) => x.screen === 'battle' && x.humanTurn && !x.busy && !!x.state.battle, label, 60_000);
  await expect(page.getByTestId('battle-loading')).toBeHidden({ timeout: 30_000 });
  return s;
}

async function activeIs(page: Page, id: string): Promise<Inspect> {
  return waitFor(page, (x) => x.screen === 'battle' && x.humanTurn && !x.busy && x.state.battle?.activeStackId === id, `stack ${id} to act`, 60_000);
}

/** After an order: the revision moved and the playback finished. */
async function settled(page: Page, rev: number): Promise<Inspect> {
  return waitFor(page, (x) => x.state.revision !== rev && !x.busy, 'the order to play', 60_000);
}

async function load(page: Page, prefs: Record<string, unknown>, file: string): Promise<void> {
  await usePrefs(page, prefs);
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await importAndLoad(page, file);
  await ready(page);
}

/** The presentation's final picture of every stack (where it stands, its marks and auras, alive or not). */
async function picture(page: Page): Promise<Record<string, unknown>> {
  const s = await scene(page);
  const out: Record<string, unknown> = {};
  for (const [id, v] of Object.entries(s)) out[id] = { anchor: v.anchor, mirrored: v.mirrored, down: v.down, marks: v.marks, overlays: v.overlays, label: v.label };
  return out;
}

let normalPicture: Record<string, unknown> | null = null;
let normalState: unknown = null;

// The reduced-motion run compares its end with the normal run's: the two run in order, together.
test.describe('playback', () => {
test.describe.configure({ mode: 'serial' });

test.describe('1280×720', () => {
test.use({ viewport: { width: 1280, height: 720 } });

test('neutral abilities: exact tooltip, targeting by pointer and keyboard, playback, marks and log', async ({ page }) => {
  test.setTimeout(420_000);
  const fx = neutralBattle('v2battle-abilities', { curse: true });
  const id = fx.ids;
  await load(page, { battleSpeed: '0.5' }, fx.file);
  let s = await activeIs(page, id['peg']!);
  await page.waitForTimeout(600);
  await shot(page, 'board-1280x720');

  // 1. Sheltering Wings: the button, its uses and its exact rule as the tooltip.
  const wingsDef = catalog.abilities['neutral_sheltering_wings']!;
  const wings = page.getByTestId('battle-ability-neutral_sheltering_wings');
  await expect(wings).toContainText('Sheltering Wings');
  await expect(wings).toContainText('1/1');
  await expect(wings).toHaveAttribute('aria-description', new RegExp(wingsDef.exactRule.slice(0, 60).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  await wings.hover();
  const tip = page.locator('.gui-tip');
  await expect(tip).toBeVisible();
  await expect(tip).toContainText(wingsDef.exactRule);
  await expect(tip).toContainText('1 of 1 use left in this battle, for this stack');
  await page.waitForTimeout(300);
  if (!(await tip.isVisible())) await wings.hover({ force: true });
  await expect(tip).toBeVisible();
  await shot(page, 'ability-tooltip-1280x720');
  await page.mouse.move(640, 300);

  // 2. Targeting by keyboard: Enter on the button opens the card with the rule and the legal targets
  //    (focus on the first); Esc cancels and returns focus; Enter on a target uses the ability.
  await wings.focus();
  await page.keyboard.press('Enter');
  const card = page.getByTestId('battle-ability-card');
  await expect(card).toBeVisible();
  await expect(page.getByTestId('battle-ability-rule')).toHaveText(wingsDef.exactRule);
  await expect(page.getByTestId('battle-ability-prompt')).toHaveText('Sheltering Wings: choose a highlighted friendly stack (1 in reach).');
  const target = page.getByTestId(`battle-ability-target-${id['hop']}`);
  await expect(target).toBeFocused();
  await page.waitForTimeout(500);
  await shot(page, 'targeting-wings-1280x720');
  await page.keyboard.press('Escape');
  await expect(card).toBeHidden();
  await expect(wings).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(target).toBeFocused();
  let rev = s.state.revision;
  await page.keyboard.press('Enter');
  s = await settled(page, rev);
  expect(s.state.battle.stacks[id['hop']!].statuses.map((x: { kind: string }) => x.kind)).toContain('damage_ward');
  await expect.poll(async () => (await scene(page))[id['hop']!]?.marks ?? [], { timeout: 20_000 }).toContain('icon.ability.family_ward');
  expect(await fxLog(page)).toContain('ability.neutral_sheltering_wings');

  // 3. Distract with the pointer: the button, then the highlighted enemy on the field.
  s = await activeIs(page, id['rr']!);
  await page.getByTestId('battle-ability-neutral_distract').click();
  await expect(page.getByTestId('battle-ability-prompt')).toHaveText('Distract: choose a highlighted enemy stack (1 in reach).');
  await page.waitForTimeout(400);
  await shot(page, 'targeting-distract-1280x720');
  rev = s.state.revision;
  await clickBattleCell(page, 8, 2);
  s = await settled(page, rev);
  expect(s.state.battle.stacks[id['e_ser']!].statuses.map((x: { kind: string }) => x.kind)).toContain('retaliation_suppressed');
  await expect.poll(async () => (await scene(page))[id['e_ser']!]?.marks ?? [], { timeout: 20_000 }).toContain('icon.status.stun');

  // 4. Tail Snare: the slingers slide one hex toward the Ahuitzotl (caught mid-slide), never walking.
  s = await activeIs(page, id['ahu']!);
  await page.getByTestId('battle-ability-neutral_tail_snare').click();
  const sliId = id['e_sli']!;
  const before = (await scene(page))[sliId]!;
  rev = s.state.revision;
  await clickBattleCell(page, 7, 7);
  // Watched frame by frame inside the page (frames are slow in this software-rendered browser).
  const mid = await page.evaluate(
    ([sid, x0]) =>
      new Promise<{ x: number; drawn: string | null } | null>((done) => {
        const t0 = performance.now();
        const look = () => {
          const v = (globalThis as unknown as { __prBattle: () => Record<string, { x: number; anchor: { col: number }; drawn: string | null }> }).__prBattle()[sid as string]!;
          if (Math.abs(v.x - (x0 as number)) > 6 && v.anchor.col === 7) return done({ x: v.x, drawn: v.drawn });
          if (performance.now() - t0 > 90_000) return done(null);
          requestAnimationFrame(look);
        };
        look();
      }),
    [sliId, before.x] as const,
  );
  if (mid) await shot(page, 'pull-slide-mid-1280x720');
  expect(mid, 'the slide was seen between the two cells').not.toBeNull();
  expect(mid!.drawn, 'a pulled stack slides in its standing pose, it does not walk').not.toBe('move');
  s = await settled(page, rev);
  expect(s.state.battle.stacks[sliId].anchor).toEqual({ col: 6, row: 7 });
  await expect.poll(async () => (await scene(page))[sliId]!.anchor, { timeout: 20_000 }).toEqual({ col: 6, row: 7 });
  expect(await fxLog(page)).toContain(`pull.${sliId}`);

  // 5. Devour Dread (keyboard target) removes the Hoplites' curse; 6. Reed Guard braces the Afanc and guards the Serpopard.
  s = await activeIs(page, id['bk']!);
  await page.getByTestId('battle-ability-neutral_devour_dread').focus();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId(`battle-ability-target-${id['hop']}`)).toBeFocused();
  rev = s.state.revision;
  await page.keyboard.press('Enter');
  s = await settled(page, rev);
  expect(s.state.battle.stacks[id['hop']!].statuses.some((x: { sourceId: string }) => x.sourceId === 'spell:weakness')).toBe(false);
  s = await activeIs(page, id['af']!);
  await page.getByTestId('battle-ability-neutral_reed_guard').click();
  rev = s.state.revision;
  await clickBattleCell(page, 3, 8);
  s = await settled(page, rev);
  expect(s.state.battle.stacks[id['af']!].defending).toBe(true);
  expect(s.state.battle.stacks[id['ser']!].statuses.map((x: { kind: string }) => x.kind).sort()).toEqual(['defense_bonus', 'pull_immunity']);
  await expect.poll(async () => (await scene(page))[id['ser']!]?.marks ?? [], { timeout: 20_000 }).toEqual(expect.arrayContaining(['icon.fx.shield', 'icon.ability.charge_guard']));
  await expect.poll(async () => (await scene(page))[id['af']!]?.marks ?? [], { timeout: 20_000 }).toContain('icon.action.defend');
  await page.waitForTimeout(500);
  await shot(page, 'status-marks-1280x720');

  // The combat log names user, ability and effect.
  await page.getByRole('button', { name: 'Log' }).click();
  const log = page.locator('.battle-log');
  await expect(log).toContainText('Pegasi use Sheltering Wings on Hoplites: the next creature blow they take is 25% lighter.');
  await expect(log).toContainText('Root-Runners use Distract on Serpopards: their next retaliation is suppressed.');
  await expect(log).toContainText('Ahuitzotls use Tail Snare on Hill Slingers: pulled one hex closer.');
  await expect(log).toContainText('Baku use Devour Dread on Hoplites: Weakness removed.');
  await expect(log).toContainText('Afancs use Reed Guard on Serpopards: +2 Defense and immune to one pull.');
  await shot(page, 'combat-log-1280x720');
  normalPicture = await picture(page);
  normalState = s.state.battle;
  await page.getByRole('button', { name: 'Hide log' }).click();
});
});

test.describe('1366×768', () => {
test.use({ viewport: { width: 1366, height: 768 } });

test('reduced motion (instant playback) ends in the same picture as normal playback', async ({ page }) => {
  test.setTimeout(300_000);
  const fx = neutralBattle('v2battle-abilities', { curse: true });
  const id = fx.ids;
  await load(page, { motion: 'reduced' }, fx.file);
  const steps: [string, string, string][] = [
    ['peg', 'neutral_sheltering_wings', 'hop'],
    ['rr', 'neutral_distract', 'e_ser'],
    ['ahu', 'neutral_tail_snare', 'e_sli'],
    ['bk', 'neutral_devour_dread', 'hop'],
    ['af', 'neutral_reed_guard', 'ser'],
  ];
  let s = await ready(page);
  for (const [who, ability, target] of steps) {
    s = await activeIs(page, id[who]!);
    await page.getByTestId(`battle-ability-${ability}`).click();
    const rev = s.state.revision;
    await page.getByTestId(`battle-ability-target-${id[target]}`).click();
    s = await settled(page, rev);
  }
  expect(s.state.battle).toEqual(normalState);
  await page.waitForTimeout(800);
  await expect.poll(() => picture(page), { timeout: 20_000 }).toEqual(normalPicture);
  await shot(page, 'status-marks-reduced-motion-1366x768');
});
});
});

test.describe('1366×768', () => {
test.use({ viewport: { width: 1366, height: 768 } });

test('a used ability says so; the Pegasus takes off, flies and lands on its ground anchor without a size jump', async ({ page }) => {
  test.setTimeout(360_000);
  const fx = neutralBattle('v2battle-flight', { used: ['peg'] });
  const id = fx.ids;
  await load(page, { battleSpeed: '0.5' }, fx.file);
  const s = await activeIs(page, id['peg']!);
  const wings = page.getByTestId('battle-ability-neutral_sheltering_wings');
  await expect(wings).toContainText('Used');
  await expect(wings).toHaveAttribute('aria-disabled', 'true');
  await expect(wings).toHaveAttribute('data-uses-left', '0');
  await wings.hover();
  const tip = page.locator('.gui-tip');
  await expect(tip).toContainText('Sheltering Wings — unavailable: Already used in this battle (used in this battle).');
  await expect(tip).toContainText(catalog.abilities['neutral_sheltering_wings']!.exactRule);
  await shot(page, 'ability-used-tooltip-1366x768');
  // Still focusable (its rule and reason read from the keyboard); choosing it explains and changes nothing.
  await wings.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('battle-ability-card')).toBeHidden();
  expect((await waitFor(page, (x) => x.humanTurn, 'still our turn')).state.revision).toBe(s.state.revision);

  // Flight: the Pegasus (two hexes, core atlas) flies to (9,4); every frame is watched in the page.
  const peg = id['peg']!;
  await page.evaluate((sid) => {
    const w = globalThis as unknown as { __flight: { drawn: string | null; scale: number; lift: number; x: number; y: number }[]; __prBattle: () => Record<string, { drawn: string | null; scale: number; lift: number; x: number; y: number }> };
    w.__flight = [];
    const t0 = performance.now();
    const look = () => {
      const v = w.__prBattle()[sid]!;
      w.__flight.push({ drawn: v.drawn, scale: v.scale, lift: v.lift, x: v.x, y: v.y });
      if (performance.now() - t0 < 150_000) requestAnimationFrame(look);
    };
    look();
  }, peg);
  const restScale = (await scene(page))[peg]!.scale;
  const rev = s.state.revision;
  await clickBattleCell(page, 9, 4);
  for (const phase of ['takeoff', 'fly', 'landing']) {
    const seen = await page.evaluate(
      ([sid, want]) =>
        new Promise<boolean>((done) => {
          const t0 = performance.now();
          const look = () => {
            const v = (globalThis as unknown as { __prBattle: () => Record<string, { drawn: string | null }> }).__prBattle()[sid as string]!;
            if (v.drawn === want) return done(true);
            if (performance.now() - t0 > 90_000) return done(false);
            requestAnimationFrame(look);
          };
          look();
        }),
      [peg, phase] as const,
    );
    expect(seen, `the Pegasus plays ${phase}`).toBe(true);
    await shot(page, `pegasus-${phase}-1366x768`);
  }
  const after = await settled(page, rev);
  expect(after.state.battle.stacks[peg].anchor).toEqual({ col: 9, row: 4 });
  await expect.poll(async () => (await scene(page))[peg]!.drawn, { timeout: 30_000 }).toBe('idle');
  await page.waitForTimeout(400);
  await shot(page, 'pegasus-landed-1366x768');
  const trace = await page.evaluate(() => (globalThis as unknown as { __flight: { drawn: string | null; scale: number; lift: number }[] }).__flight);
  const scales = new Map<string, Set<number>>();
  for (const f of trace) if (f.drawn) scales.set(f.drawn, (scales.get(f.drawn) ?? new Set()).add(f.scale));
  // One constant scale per animation: the core poses at the set's scale, the flight atlas at its sourceScale.
  for (const [name, set] of scales) expect([name, set.size]).toEqual([name, 1]);
  const flight = [...(scales.get('fly') ?? [])][0]!;
  expect(flight / restScale).toBeCloseTo(0.62, 2);
  expect([...(scales.get('idle') ?? [])][0]).toBe(restScale);
  const last = (await scene(page))[peg]!;
  expect(Math.abs(last.lift)).toBe(0);
  expect(last.scale).toBe(restScale);
  await test.info().attach('flight-scales', { body: JSON.stringify(Object.fromEntries([...scales].map(([k, v]) => [k, [...v]]))), contentType: 'application/json' });
});
});


// ---------------------------------------------------------------------------
// The six neutrals in battle: every pose the battle shows, both sides, light and dark ground.
// ---------------------------------------------------------------------------

interface PoseSighting {
  stack: string;
  drawn: string;
  x: number;
  y: number;
  mirrored: boolean;
  scale: number;
}

/**
 * Watch every frame in the page: each stack's first frame in each animation, and every scale an
 * animation is drawn at (one per animation: frames never resize). Read-only.
 */
async function watchPoses(page: Page): Promise<void> {
  await page.evaluate(() => {
    const w = globalThis as unknown as { __poses?: PoseSighting[]; __poseScales: Record<string, number[]>; __prBattle: () => Record<string, { drawn: string | null; x: number; y: number; mirrored: boolean; scale: number }> | null };
    if (w.__poses) return;
    const poses: PoseSighting[] = (w.__poses = []);
    w.__poseScales = {};
    const seen = new Set<string>();
    const look = () => {
      for (const [id, v] of Object.entries(w.__prBattle() ?? {})) {
        if (!v.drawn) continue;
        const key = `${id}|${v.drawn}`;
        const sc = (w.__poseScales[key] ??= []);
        if (!sc.includes(v.scale)) sc.push(v.scale);
        if (seen.has(key)) continue;
        seen.add(key);
        poses.push({ stack: id, drawn: v.drawn, x: v.x, y: v.y, mirrored: v.mirrored, scale: v.scale });
      }
      requestAnimationFrame(look);
    };
    look();
  });
}

interface PoseReport {
  /** creature → left/right → animations drawn. */
  seen: Record<string, Record<string, string[]>>;
  /** The battle view's last read-only state of each stack before the screen closed (hit and death counters). */
  last: Record<string, StackShot & { hits: number; deaths: number }>;
}

/**
 * Photograph each new pose the page saw (a close crop around the stack, named by what is drawn
 * when the photograph is taken), give orders through `step` until the battle screen closes or
 * `step` says it is done. Standing poses are in the whole-board photographs.
 */
async function capturePoses(page: Page, fx: NeutralBattle, terrain: string, step: () => Promise<boolean>, ms = 1_000_000): Promise<PoseReport> {
  const byId = new Map(Object.values(fx.ids).map((sid) => [sid, fx.d.state.battle!.stacks[sid]!] as const));
  const taken = new Set<string>();
  const seen: PoseReport['seen'] = {};
  let last: PoseReport['last'] = {};
  const vp = page.viewportSize()!;
  const t0 = Date.now();
  let handled = 0;
  for (;;) {
    const poses = await page.evaluate(() => (globalThis as unknown as { __poses?: PoseSighting[] }).__poses ?? []);
    for (; handled < poses.length; handled++) {
      const p = poses[handled]!;
      const st = byId.get(p.stack);
      if (!st) continue;
      const side = st.side === 'attacker' ? 'left' : 'right';
      ((seen[st.creatureId] ??= {})[side] ??= []).push(p.drawn);
      const key = `${st.creatureId}|${side}|${p.drawn}`;
      if (taken.has(key) || st.creatureId === 'hoplite' || p.drawn === 'idle') continue;
      const now = (await scene(page))[p.stack];
      if (!now || now.drawn !== p.drawn) continue;
      taken.add(key);
      const w = 260;
      const h = 230;
      const x = Math.max(0, Math.min(vp.width - w, Math.round(now.x - w / 2)));
      const y = Math.max(0, Math.min(vp.height - h, Math.round(now.y - h + 50)));
      await page.screenshot({ path: `${OUT}/pose-${st.creatureId}-${side}-${p.drawn}-${terrain}.png`, clip: { x, y, width: w, height: h } });
    }
    const sc = (await page.evaluate(() => (globalThis as unknown as { __prBattle: () => unknown }).__prBattle())) as PoseReport['last'] | null;
    if (sc && Object.keys(sc).length) last = sc;
    const s = await inspect(page);
    if (s.screen !== 'battle') break;
    if (await step()) break;
    if (Date.now() - t0 > ms) throw new Error('the poses were not all played in time');
    await page.waitForTimeout(250);
  }
  writeFileSync(`${OUT}/poses-${terrain}.json`, JSON.stringify(seen, null, 1));
  return { seen, last };
}

/** Where each stack stands on screen (for close crops of the standing poses from the board photograph). */
async function savePositions(page: Page, fx: NeutralBattle, terrain: string): Promise<void> {
  const sc = await scene(page);
  const rows = Object.entries(fx.ids).map(([key, sid]) => ({ key, creature: fx.d.state.battle!.stacks[sid]!.creatureId, side: fx.d.state.battle!.stacks[sid]!.side, ...sc[sid] }));
  writeFileSync(`${OUT}/positions-${terrain}.json`, JSON.stringify(rows, null, 1));
}

/** Melee in place: point inside the target's cell nearest our stack, leaning toward it (the attack side under the pointer). */
async function meleeInPlace(page: Page, target: { col: number; row: number }, from: { col: number; row: number }): Promise<void> {
  const proj = (c: { col: number; row: number }) => page.evaluate(([col, row]) => (globalThis as unknown as { __prProject: (k: string, a: number, b: number) => { x: number; y: number } | null }).__prProject('battle', col!, row!), [c.col, c.row]);
  const a = (await proj(target))!;
  const b = (await proj(from))!;
  await page.mouse.move(a.x + (b.x - a.x) * 0.38, a.y + (b.y - a.y) * 0.38);
  await page.waitForTimeout(120);
  await page.mouse.down();
  await page.mouse.up();
}

/** One order for the player's active stack: strike the enemy beside it where it stands, else `other`. */
async function strikeOrElse(page: Page, other: (activeId: string) => Promise<void>): Promise<void> {
  const s = await inspect(page);
  if (!s.humanTurn || s.busy || !s.state.battle) return;
  if (await page.getByTestId('battle-loading').isVisible().catch(() => false)) return;
  const b = s.state.battle as BattleState;
  const me = b.activeStackId ? b.stacks[b.activeStackId] : undefined;
  if (!me) return;
  const mine = stackCells(catalog, me);
  const foe = Object.values(b.stacks).find((e) => e.side !== me.side && e.totalHp > 0 && stackCells(catalog, e).some((c) => mine.some((m) => cellDistance(c, m) === 1)));
  if (foe) {
    const near = [...stackCells(catalog, foe)].sort((x, y) => cellDistance(x, me.anchor) - cellDistance(y, me.anchor))[0]!;
    await meleeInPlace(page, near, me.anchor);
  } else await other(me.id);
  const moved = await waitFor(page, (x) => x.state.revision !== s.state.revision, 'the order', 30_000).then(
    () => true,
    () => false,
  );
  if (!moved) await page.getByTestId('battle-defend').click();
}

const NEUTRAL_IDS = ['pegasus', 'root_runner', 'serpopard', 'baku', 'afanc', 'ahuitzotl'];

// 1366×768: in this software-rendered container a 1920×1080 frame (and so each photograph) takes far longer.
test.describe('poses 1366×768', () => {
test.use({ viewport: { width: 1366, height: 768 } });

test('each neutral in battle on light ground: attack (left), hit and death (right, mirrored), victory', async ({ page }) => {
  test.setTimeout(1_200_000);
  const f = faceOff('strike');
  const fx = neutralBattle('v2battle-strike', { player: f.player, enemy: f.enemy, order: f.order, counts: f.counts, climate: 'desert', archetype: 'open_field' });
  await load(page, { battleSpeed: '1' }, fx.file);
  await page.waitForTimeout(800);
  await shot(page, 'neutrals-face-off-light-1366x768');
  await savePositions(page, fx, 'light');
  await watchPoses(page);
  // Each of ours strikes its single-creature twin where it stands; the last blow ends the battle and the
  // winners cheer (victory = the idle poses) until the result opens.
  const { seen, last } = await capturePoses(page, fx, 'light', async () => {
    await strikeOrElse(page, async () => page.getByTestId('battle-defend').click());
    return false;
  });
  for (const c of NEUTRAL_IDS) {
    expect(seen[c]?.left, `${c} on the left`).toEqual(expect.arrayContaining(['idle', 'attack']));
    expect(seen[c]?.right, `${c} on the right`).toEqual(expect.arrayContaining(['idle', 'death']));
    expect.soft(seen[c]?.left, `${c} cheers (victory)`).toEqual(expect.arrayContaining(['victory']));
    // Each fallen guard took the hit pose first, then fell once (the view's counters).
    const foe = Object.values(fx.ids).find((sid) => fx.d.state.battle!.stacks[sid]!.creatureId === c && fx.d.state.battle!.stacks[sid]!.side === 'defender')!;
    expect(last[foe], `${c} (right)`).toMatchObject({ deaths: 1, down: true, mirrored: true });
    expect(last[foe]!.hits, `${c} (right) hit before falling`).toBeGreaterThanOrEqual(1);
  }
  const scales = await page.evaluate(() => (globalThis as unknown as { __poseScales?: Record<string, number[]> }).__poseScales ?? {});
  for (const [key, list] of Object.entries(scales)) expect([key, list.length]).toEqual([key, 1]);
  await test.info().attach('poses-light', { body: JSON.stringify(seen, null, 1), contentType: 'application/json' });
});

test('each neutral in battle on dark ground: the guards strike and use abilities (right, mirrored), ours are hit, defend and move', async ({ page }) => {
  test.setTimeout(1_200_000);
  const f = faceOff('brace');
  const fx = neutralBattle('v2battle-brace', { player: f.player, enemy: f.enemy, order: f.order, climate: 'jungle', archetype: 'grove' });
  await usePrefs(page, { battleSpeed: '1' });
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await importAndLoad(page, fx.file);
  // The guards act at once; their first playback takes seconds in this browser, so watching starts in time.
  await watchPoses(page);
  await expect(page.getByTestId('battle-loading')).toBeHidden({ timeout: 60_000 });
  await shot(page, 'neutrals-face-off-dark-1366x768');
  await savePositions(page, fx, 'dark');
  const mine = ['peg', 'rr', 'ser', 'bk', 'af', 'ahu'].map((k) => fx.ids[k]!);
  const acted = new Set<string>();
  const { seen, last } = await capturePoses(page, fx, 'dark', async () => {
    const s = await inspect(page);
    if (!s.state.battle) return false;
    const active = s.state.battle.activeStackId as string | null;
    if (mine.every((id) => acted.has(id)) && s.humanTurn && !s.busy) return true;
    if (!s.humanTurn || s.busy || !active) return false;
    if (await page.getByTestId('battle-loading').isVisible().catch(() => false)) return false;
    acted.add(active);
    const rev = s.state.revision;
    // The Ahuitzotl steps back a hex (its move loop); the others brace (defend).
    if (active === fx.ids['ahu']) await clickBattleCell(page, 4, 10);
    else await page.getByTestId('battle-defend').click();
    await waitFor(page, (x) => x.state.revision !== rev, 'the order', 30_000).catch(async () => page.getByTestId('battle-defend').click());
    return false;
  });
  await page.waitForTimeout(500);
  await shot(page, 'neutrals-after-exchange-dark-1366x768');
  const hitOnLeft = mine.filter((id) => (last[id]?.hits ?? 0) > 0);
  expect(hitOnLeft.length, 'the guards’ blows were played on our stacks').toBeGreaterThan(0);
  for (const c of NEUTRAL_IDS) {
    expect(seen[c]?.left, `${c} on the left`).toEqual(expect.arrayContaining(['idle']));
    expect(seen[c]?.right, `${c} on the right`).toEqual(expect.arrayContaining(['idle']));
  }
  expect(seen['ahuitzotl']?.left).toEqual(expect.arrayContaining(['move']));
  for (const c of ['pegasus', 'root_runner', 'serpopard', 'baku', 'afanc']) expect(seen[c]?.left, `${c} defends`).toEqual(expect.arrayContaining(['defend']));
  const guards = Object.values(seen).flatMap((x) => x.right ?? []);
  expect(guards.some((d) => d === 'attack' || d === 'ability'), 'the guards struck or used an ability').toBe(true);
  const scales = await page.evaluate(() => (globalThis as unknown as { __poseScales?: Record<string, number[]> }).__poseScales ?? {});
  for (const [key, list] of Object.entries(scales)) expect([key, list.length]).toEqual([key, 1]);
  await test.info().attach('poses-dark', { body: JSON.stringify(seen, null, 1), contentType: 'application/json' });
});
});

// ---------------------------------------------------------------------------
// Fit: the ability bar, its tooltip and the ability card at the supported sizes and a large interface scale.
// ---------------------------------------------------------------------------

for (const [w, h, scale] of [
  [1366, 768, 1],
  [1920, 1080, 1],
  [1366, 768, 1.6],
] as const) {
  test.describe(`fit ${w}×${h} at ${scale * 100}%`, () => {
    test.use({ viewport: { width: w, height: h } });
    test('the ability button, its tooltip and the targeting card fit and stay readable', async ({ page }) => {
      test.setTimeout(300_000);
      const tag = `${w}x${h}${scale === 1 ? '' : `-ui${Math.round(scale * 100)}`}`;
      const fx = neutralBattle(`v2battle-fit-${tag}`, { curse: true });
      await load(page, { battleSpeed: '1', uiScale: scale }, fx.file);
      await activeIs(page, fx.ids['peg']!);
      await page.waitForTimeout(800);
      await shot(page, `board-${tag}`);
      const wings = page.getByTestId('battle-ability-neutral_sheltering_wings');
      await wings.hover();
      await expect(page.locator('.gui-tip')).toContainText(catalog.abilities['neutral_sheltering_wings']!.exactRule);
      const tipBox = (await page.locator('.gui-tip').boundingBox())!;
      expect(tipBox.y).toBeGreaterThanOrEqual(0);
      expect(tipBox.x + tipBox.width).toBeLessThanOrEqual(w + 1);
      await shot(page, `ability-tooltip-${tag}`);
      await wings.click();
      const card = page.getByTestId('battle-ability-card');
      await expect(card).toBeVisible();
      await expect(page.getByTestId('battle-ability-rule')).toBeVisible();
      const cardBox = (await card.boundingBox())!;
      const bar = (await page.locator('.battle-bottom').boundingBox())!;
      expect(cardBox.y).toBeGreaterThanOrEqual(0);
      expect(cardBox.y + cardBox.height).toBeLessThanOrEqual(bar.y + 1);
      expect(cardBox.x + cardBox.width).toBeLessThanOrEqual(w);
      await expect(page.getByTestId(`battle-ability-target-${fx.ids['hop']}`)).toBeInViewport();
      await expect(page.getByTestId('battle-ability-cancel')).toBeInViewport();
      await page.mouse.move(w / 2, 40);
      await page.waitForTimeout(500);
      await shot(page, `targeting-card-${tag}`);
    });
  });
}
