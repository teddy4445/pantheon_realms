import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { cellPoint } from '@pr/presentation/core';
import { inspect, waitFor } from './helpers';
import { importAndLoad } from './fixtures';
import { goldBattle, toHumanBattleTurn, usePrefs } from './momentFixtures';

/**
 * The 2D presentation (2D migration, 2026-10-03) in the production build:
 * the bestiary's animated sprite viewer (states from content, base/upgrade
 * switching, stand-ins, reduced-motion still), battle sprites standing on their
 * logical cells with the defending side mirrored, and playback speed never
 * changing a battle's outcome. Screenshots are kept for review.
 */

interface StackDebug {
  anchor: { col: number; row: number };
  x: number;
  y: number;
  mirrored: boolean;
  drawn: string | null;
  status: string | null;
  sprite: string;
  down: boolean;
  visible: boolean;
}
const MANIFEST = JSON.parse(readFileSync('assets-runtime/sprites/manifest.json', 'utf8')) as { creatures: Record<string, { status: string; provenance: string; animations: Record<string, unknown> }> };
/** A creature form still drawn as a procedural silhouette (none since the owner's delivery of 2026-10-04; kept for re-checks). */
const SILHOUETTE = Object.entries(MANIFEST.creatures).find(([, c]) => c.status === 'placeholder' && c.provenance.startsWith('Procedural silhouette'))?.[0] ?? null;
/** The viewer's sprite tag for a creature, from the game's own manifest. */
const statusOf = (id: string): string => (MANIFEST.creatures[id]?.status === 'final' ? 'final' : 'placeholder');
const ownsStrip = (id: string, anim: string): 'yes' | 'no' => (MANIFEST.creatures[id]?.animations[anim] ? 'yes' : 'no');

const stacks = (page: Page): Promise<Record<string, StackDebug> | null> => page.evaluate(() => (globalThis as unknown as { __prBattle: () => Record<string, StackDebug> | null }).__prBattle());
const project = (page: Page, col: number, row: number) => page.evaluate(([c, r]) => (globalThis as unknown as { __prProject: (k: string, a: number, b: number) => { x: number; y: number } | null }).__prProject('battle', c!, r!), [col, row]);

test('bestiary: the animated 2D viewer plays the states this creature has, switches base/upgraded and marks stand-ins', async ({ page }) => {
  const failed: string[] = [];
  page.on('response', (r) => {
    if (r.url().includes('/sprites/') && r.status() !== 200) failed.push(r.url());
  });
  await usePrefs(page, { graphicsTested: true });
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await page.getByTestId('menu-encyclopedia').click();
  // A shooter: one button per state it has (shoot, no flight), each marked by whether it has its own strip.
  await page.getByTestId('codex-peltast').click();
  await expect(page.getByTestId('viewer-sprite-status')).toHaveAttribute('data-status', statusOf('peltast'), { timeout: 20_000 });
  // Finished sprites carry no label (owner request 2026-10-07).
  await expect(page.getByText('Final sprites')).toHaveCount(0);
  for (const s of ['idle', 'move', 'attack', 'shoot', 'defend', 'hit', 'death', 'victory']) await expect(page.getByTestId(`anim-${s}`)).toBeVisible();
  await expect(page.getByTestId('anim-takeoff')).toHaveCount(0);
  await expect(page.getByTestId('anim-idle')).toHaveAttribute('data-own', ownsStrip('peltast', 'idle'));
  await expect(page.getByTestId('anim-shoot')).toHaveAttribute('data-own', ownsStrip('peltast', 'shoot'));
  await page.getByTestId('anim-shoot').click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'test-results/sprites2d-viewer-peltast.png' });
  for (const id of ['viewer-pause', 'viewer-play', 'viewer-stop', 'viewer-restart']) await page.getByTestId(id).click();
  // One creature per page (owner request 2026-10-03): no base/upgraded tabs; the upgraded form opens from the Encyclopedia.
  await expect(page.getByRole('tab', { name: 'Veteran Peltast' })).toHaveCount(0);
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await page.getByTestId('menu-encyclopedia').click();
  await page.getByTestId('codex-veteran_peltast').click();
  expect((await inspect(page)).screen).toBe('unit-detail');
  await expect(page.locator('.screen-header__title')).toHaveText('Veteran Peltast');
  await expect(page.getByTestId('viewer-sprite-status')).toHaveAttribute('data-status', statusOf('veteran_peltast'));
  // A form still drawn as an animated silhouette, when one is left (none since the 2026-10-04 delivery).
  if (!SILHOUETTE) {
    expect(failed).toEqual([]);
    return;
  }
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await page.getByTestId('menu-encyclopedia').click();
  await page.getByTestId(`codex-${SILHOUETTE}`).click();
  await expect(page.getByTestId('viewer-sprite-status')).toHaveText('Placeholder sprites', { timeout: 20_000 });
  for (const s of ['idle', 'move', 'attack', 'defend', 'hit', 'death', 'victory']) await expect(page.getByTestId(`anim-${s}`)).toHaveAttribute('data-own', 'yes');
  await page.getByTestId('anim-attack').click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'test-results/sprites2d-viewer-silhouette.png' });
  expect(failed).toEqual([]);
});

test('bestiary under reduced motion shows a still and plays only on demand', async ({ page }) => {
  await usePrefs(page, { graphicsTested: true, motion: 'reduced' });
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await page.getByTestId('menu-encyclopedia').click();
  await page.getByTestId('codex-hoplite').click();
  await expect(page.getByTestId('viewer-sprite-status')).toHaveAttribute('data-status', statusOf('hoplite'), { timeout: 20_000 });
  await expect(page.getByText(/Reduced motion: a still picture/)).toBeVisible();
  await expect(page.getByRole('switch', { name: 'Autoplay' })).toBeDisabled();
  await page.getByTestId('anim-attack').click();
  await page.getByTestId('viewer-restart').click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'test-results/sprites2d-viewer-reduced.png' });
});

test('battle: every stack sprite stands on its logical cell; the defending side is mirrored', async ({ page }) => {
  await usePrefs(page, { graphicsTested: true });
  const { file } = goldBattle('skirmish_twin_harbors', 'sprites-board', [['hoplite', 30], ['peltast', 12], ['griffin', 6]]);
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await importAndLoad(page, file);
  const s = await toHumanBattleTurn(page);
  let st: Record<string, StackDebug> | null = null;
  for (let i = 0; i < 40; i++) {
    st = await stacks(page);
    if (st && Object.values(st).every((x) => x.sprite === 'ready')) break;
    await page.waitForTimeout(250);
  }
  const battle = s.state.battle as { stacks: Record<string, { side: string; anchor: { col: number; row: number }; facing: number; creatureId: string; totalHp: number }> };
  const live = Object.values(battle.stacks).filter((x) => x.totalHp > 0);
  expect(Object.keys(st!).length).toBeGreaterThanOrEqual(live.length);
  for (const [id, b] of Object.entries(battle.stacks)) {
    if (b.totalHp <= 0) continue;
    const d = st![id]!;
    expect(d.sprite, id).toBe('ready');
    expect(d.anchor, id).toEqual(b.anchor);
    expect(d.mirrored, id).toBe(b.facing === -1);
    // The sprite's feet are on its cell (for a 2-hex creature, between its two cells).
    const p = (await project(page, b.anchor.col, b.anchor.row))!;
    const q = (await project(page, b.anchor.col - b.facing, b.anchor.row))!;
    const box = (await page.locator('.scene-viewport canvas').first().boundingBox())!;
    const hexW = Math.abs(q.x - p.x);
    const two = Math.abs(d.x + box.x - (p.x + q.x) / 2) < hexW * 0.2;
    const one = Math.abs(d.x + box.x - p.x) < hexW * 0.2;
    expect(one || two, `${id} x`).toBe(true);
    expect(Math.abs(d.y + box.y - p.y), `${id} y`).toBeLessThan(hexW * 0.45);
  }
  // The board transform the interface uses for the attack side matches the drawn board.
  const a = (await project(page, 6, 4))!;
  const b = (await project(page, 7, 4))!;
  const c = (await project(page, 6, 5))!;
  const unit = (b.x - a.x) / (cellPoint({ col: 7, row: 4 }).x - cellPoint({ col: 6, row: 4 }).x);
  expect(c.y - a.y).toBeCloseTo((cellPoint({ col: 6, row: 5 }).y - cellPoint({ col: 6, row: 4 }).y) * unit, 0);
  await page.screenshot({ path: 'test-results/sprites2d-battle.png' });
});

test('playback speed never changes a battle: instant and normal auto-battles end identically', async ({ browser }) => {
  test.setTimeout(300_000);
  const { file } = goldBattle('skirmish_twin_harbors', 'sprites-speed', [['hoplite', 30], ['peltast', 12]]);
  const results: unknown[] = [];
  for (const speed of ['instant', '1']) {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await usePrefs(page, { graphicsTested: true, battleSpeed: speed });
    await page.goto('/?e2e', { waitUntil: 'networkidle' });
    await importAndLoad(page, file);
    await toHumanBattleTurn(page);
    await page.getByTestId('battle-auto').click();
    const end = await waitFor(page, (x) => x.screen === 'battle-result', `battle result (${speed})`, 240_000);
    const st = end.state;
    results.push({ result: st.lastBattleResult, heroes: Object.fromEntries(Object.values(st.heroes as Record<string, { id: string; army: unknown; experience: number }>).map((h) => [h.id, { army: h.army, xp: h.experience }])), revision: st.revision });
    await ctx.close();
  }
  expect(results[1]).toEqual(results[0]);
});
