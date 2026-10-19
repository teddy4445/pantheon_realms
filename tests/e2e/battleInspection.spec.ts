import { expect, test, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { inspect, waitFor, type Inspect } from './helpers';
import { importAndLoad } from './fixtures';
import { usePrefs } from './momentFixtures';
import { inspectionBattle, type InspectionBattle } from './inspectionFixtures';

/**
 * Battle creature inspection (expedition kit 2026-10-17, handoff §04).
 *
 *  - Right-click a stack, press the Inspect key (I) or use the acting stack's Inspect button: the card
 *    shows form and name, living count, portrait, effective Attack/Defense with base and parts on hover
 *    or focus, damage per creature, speed, ammunition, retaliations, the front creature's HP apart from
 *    the count and the stack's HP, and each effect with its expiry and recorded source.
 *  - Unpinned it follows the stack under the pointer and Escape closes it; pinned it stays.
 *  - Inspecting never sends a command: the revision and the acting stack do not change.
 *  - It stands clear of the battle bar; on a small window and at a 160 % interface scale it is a drawer.
 *
 * Saves are built headlessly (inspectionFixtures.ts) and imported through Load → Import; the page is
 * only observed through the read-only `?e2e` inspectors. Screenshots: /home/claude/capture/expedition/inspection/.
 */

const OUT = '/home/claude/capture/expedition/inspection';
mkdirSync(OUT, { recursive: true });

async function shot(page: Page, name: string): Promise<void> {
  await page.screenshot({ path: `${OUT}/${name}.png`, animations: 'disabled' });
}

async function ready(page: Page): Promise<Inspect> {
  const s = await waitFor(page, (x) => x.screen === 'battle' && x.humanTurn && !x.busy && !!x.state.battle, 'the player’s turn', 90_000);
  await expect(page.getByTestId('battle-loading')).toBeHidden({ timeout: 60_000 });
  return s;
}

async function load(page: Page, prefs: Record<string, unknown>, file: string): Promise<Inspect> {
  await usePrefs(page, prefs);
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await importAndLoad(page, file);
  return ready(page);
}

/** Page coordinates of a battle cell (the board's own transform). */
async function cellAt(page: Page, col: number, row: number): Promise<{ x: number; y: number }> {
  for (let i = 0; i < 40; i++) {
    const p = await page.evaluate(([c, r]) => (globalThis as unknown as { __prProject: (k: string, a: number, b: number) => { x: number; y: number } | null }).__prProject('battle', c!, r!), [col, row]);
    if (p) return p;
    await page.waitForTimeout(100);
  }
  throw new Error(`cell ${col},${row} is not on screen`);
}

async function stackCell(page: Page, stackId: string): Promise<{ x: number; y: number }> {
  const s = await inspect(page);
  const a = s.state.battle.stacks[stackId].anchor as { col: number; row: number };
  return cellAt(page, a.col, a.row);
}

async function rightClickStack(page: Page, stackId: string): Promise<void> {
  const p = await stackCell(page, stackId);
  await page.mouse.move(p.x, p.y);
  await page.waitForTimeout(150);
  await page.mouse.down({ button: 'right' });
  await page.mouse.up({ button: 'right' });
}

/** The pointer on an empty part of the board (the sky strip above the hexes stays clear of stacks). */
async function pointerAway(page: Page): Promise<void> {
  const p = await cellAt(page, 7, 10);
  await page.mouse.move(p.x, p.y);
  await page.waitForTimeout(250);
}

const panel = (page: Page) => page.getByTestId('battle-inspection');

/** The inspected stack stays in view beside the card: its anchor cell does not lie under the card. */
async function besideCard(page: Page, stackId: string): Promise<void> {
  const s = await inspect(page);
  const a = s.state.battle.stacks[stackId].anchor as { col: number; row: number };
  const box = (await panel(page).boundingBox())!;
  const p = await cellAt(page, a.col, a.row);
  const inside = (q: { x: number; y: number }) => q.x >= box.x && q.x <= box.x + box.width && q.y >= box.y && q.y <= box.y + box.height;
  expect(inside(p), `${stackId} (anchor) is not under the card`).toBe(false);
}
const statValue = (page: Page, key: string) => page.getByTestId(`binsp-stat-${key}`).locator('.binsp__stat-value');

/** Nothing was sent: the same revision, the same acting stack, the same round. */
async function unchanged(page: Page, before: Inspect): Promise<void> {
  const now = await inspect(page);
  expect(now.state.revision).toBe(before.state.revision);
  expect(now.state.battle.activeStackId).toBe(before.state.battle.activeStackId);
  expect(now.state.battle.round).toBe(before.state.battle.round);
  expect(JSON.stringify(now.state.rng)).toBe(JSON.stringify(before.state.rng));
}

/** The card stands clear of the battle bar and inside the window; the bar's buttons stay usable. */
async function clearOfControls(page: Page, w: number, h: number): Promise<void> {
  const box = (await panel(page).boundingBox())!;
  const bar = (await page.locator('.battle-bottom').boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(-1);
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(w + 1);
  expect(box.y + box.height).toBeLessThanOrEqual(Math.min(bar.y, h) + 1);
  for (const id of ['battle-wait', 'battle-defend']) {
    const b = page.getByTestId(id);
    await expect(b).toBeInViewport();
    const c = (await b.boundingBox())!;
    const hit = await page.evaluate(([x, y]) => document.elementFromPoint(x!, y!)?.closest('[data-testid]')?.getAttribute('data-testid') ?? null, [c.x + c.width / 2, c.y + c.height / 2]);
    expect(hit, `${id} is not covered`).toBe(id);
  }
  // The Log button too.
  const log = page.locator('.battle-log-toggle');
  if (await log.isVisible()) {
    const c = (await log.boundingBox())!;
    const hit = await page.evaluate(([x, y]) => !!document.elementFromPoint(x!, y!)?.closest('.battle-log-toggle'), [c.x + c.width / 2, c.y + c.height / 2]);
    expect(hit, 'the Log button is not covered').toBe(true);
  }
}

test.describe('battle creature inspection', () => {
  test.describe.configure({ mode: 'serial' });

  test.describe('1280×720', () => {
    test.use({ viewport: { width: 1280, height: 720 } });
    let fx: InspectionBattle;
    test.beforeAll(() => {
      fx = inspectionBattle('inspection-1280');
    });

    test('right-click opens the card of a damaged shooter; Escape closes it; nothing is sent', async ({ page }) => {
      test.setTimeout(300_000);
      const before = await load(page, { battleSpeed: '1' }, fx.file);
      expect(before.state.battle.activeStackId).toBe(fx.ids['hop']);
      await page.waitForTimeout(600);
      await rightClickStack(page, fx.ids['pel']!);
      await expect(panel(page)).toBeVisible();
      await expect(panel(page)).toHaveAttribute('data-stack', fx.ids['pel']!);
      await expect(panel(page)).toHaveAttribute('data-layout', 'docked');
      await expect(page.getByTestId('binsp-name')).toHaveText('Peltasts');
      await expect(page.getByTestId('binsp-count')).toHaveText('18 creatures');
      await expect(page.getByTestId('binsp-front')).toHaveText(String(fx.peltasts.front));
      await expect(page.getByTestId('binsp-hp')).toContainText(`Front creature ${fx.peltasts.front}/${fx.peltasts.hp} HP`);
      await expect(page.getByTestId('binsp-total')).toHaveText(String(fx.peltasts.totalHp));
      await expect(page.getByTestId('binsp-living')).toHaveText('18 of 18 alive');
      await expect(statValue(page, 'ammo')).toHaveText(`${fx.peltasts.shots}/${fx.peltasts.maxShots}`);
      await expect(statValue(page, 'retaliation')).toHaveText('1/1');
      await expect(page.getByTestId('binsp-stat-retaliation')).toContainText('this round');
      await expect(panel(page).locator('.portrait img')).toHaveCount(1);
      // The card stands clear of the Peltasts (and of the other stacks where it can).
      await besideCard(page, fx.ids['pel']!);
      await clearOfControls(page, 1280, 720);
      // One region, no scrolling inside at this size.
      expect(await panel(page).evaluate((el) => el.scrollHeight <= el.clientHeight + 1)).toBe(true);
      await page.mouse.move(640, 40);
      await page.waitForTimeout(400);
      await shot(page, 'damaged-shooter-1280x720');
      await unchanged(page, before);
      // Escape closes the unpinned card — and only the card (no pause menu).
      await page.keyboard.press('Escape');
      await expect(panel(page)).toBeHidden();
      expect((await inspect(page)).overlays).toEqual([]);
      await unchanged(page, before);
    });

    test('the Inspect key opens the acting stack: a modified Attack with base and parts on hover and focus', async ({ page }) => {
      test.setTimeout(300_000);
      const before = await load(page, { battleSpeed: '1' }, fx.file);
      await pointerAway(page);
      await page.keyboard.press('i');
      await expect(panel(page)).toBeVisible();
      await expect(panel(page)).toHaveAttribute('data-stack', fx.ids['hop']!);
      await expect(panel(page)).toBeFocused();
      await expect(page.getByTestId('binsp-name')).toHaveText('Hoplites');
      await expect(statValue(page, 'ammo')).toHaveText('—');
      await expect(page.getByTestId('binsp-stat-ammo')).toContainText('not a shooter');
      const attack = page.getByTestId('binsp-stat-attack');
      const shown = Number((await statValue(page, 'attack').textContent())!.replace(/[^\d]/g, ''));
      await expect(attack).toContainText(`base ${fx.hoplites.baseAttack}`);
      await expect(attack).toHaveClass(/is-up/);
      await expect(attack.locator('.binsp__arrow')).toHaveText('▲');
      // Hover: the explanation line and the tooltip give the parts.
      await attack.hover();
      await expect(page.getByTestId('binsp-explain')).toContainText(`Attack ${shown}: base ${fx.hoplites.baseAttack}`);
      await expect(page.getByTestId('binsp-explain')).toContainText('spells/abilities +3');
      await expect(page.locator('.gui-tip')).toContainText('spells/abilities +3', { timeout: 5_000 });
      await shot(page, 'modified-attack-hover-1280x720');
      // Focus (keyboard): the same explanation.
      await page.mouse.move(640, 40);
      await page.getByTestId('binsp-stat-defense').focus();
      await expect(page.getByTestId('binsp-explain')).toContainText('Defense');
      await page.getByTestId('binsp-stat-attack').focus();
      await expect(page.getByTestId('binsp-explain')).toContainText('spells/abilities +3');
      // The Warcry: its icon, what it does, two rounds, cast by the hero.
      const effect = page.getByTestId('binsp-effect').first();
      await expect(effect).toContainText('Attack +3');
      await expect(effect.getByTestId('binsp-effect-remaining')).toHaveText('2 rounds left');
      await expect(effect.getByTestId('binsp-effect-source')).toHaveText(`Source: ${fx.heroName} (attacker commander)`);
      await expect(effect).toHaveAttribute('data-source-kind', 'hero');
      await expect(effect.locator('img.binsp__effect-icon')).toHaveCount(1);
      await unchanged(page, before);
      // The Inspect button on the acting stack's card is the explicit, focusable way in.
      await page.keyboard.press('Escape');
      await expect(panel(page)).toBeHidden();
      await page.getByTestId('battle-inspect-active').click();
      await expect(panel(page)).toHaveAttribute('data-stack', fx.ids['hop']!);
      await unchanged(page, before);
    });

    test('pin keeps the card while the pointer moves; unpinned it follows; sources and unknown sources', async ({ page }) => {
      test.setTimeout(300_000);
      const before = await load(page, { battleSpeed: '1' }, fx.file);
      await rightClickStack(page, fx.ids['e_ser']!);
      await expect(panel(page)).toHaveAttribute('data-stack', fx.ids['e_ser']!);
      // Distract from the Root-Runners: until their next activation, its source the visible stack.
      const effect = page.getByTestId('binsp-effect').first();
      await expect(effect).toContainText(/Distract/);
      await expect(effect.getByTestId('binsp-effect-remaining')).toHaveText('Until the Root-Runners’ next activation');
      await expect(effect.getByTestId('binsp-effect-source')).toHaveText('Source: 12 Root-Runners (attacker)');
      await expect(effect).toHaveAttribute('data-source-stack', fx.ids['rr']!);
      await expect(statValue(page, 'retaliation')).toHaveText('1/1');
      await expect(page.getByTestId('binsp-stat-retaliation')).toContainText('next suppressed');
      await besideCard(page, fx.ids['e_ser']!);
      // Pin it, then hover the source effect: the Root-Runners are outlined; move over other stacks.
      await page.getByTestId('binsp-pin').click();
      await expect(panel(page)).toHaveAttribute('data-pinned', 'true');
      await expect(page.getByTestId('binsp-pin')).toHaveAttribute('aria-pressed', 'true');
      await effect.hover();
      await expect(page.getByTestId('binsp-explain')).toContainText('Source: 12 Root-Runners (attacker)');
      await page.waitForTimeout(500);
      await shot(page, 'status-source-pinned-1280x720');
      for (const k of ['hop', 'pel', 'gri']) {
        const p = await stackCell(page, fx.ids[k]!);
        await page.mouse.move(p.x, p.y);
        await page.waitForTimeout(250);
        await expect(panel(page)).toHaveAttribute('data-stack', fx.ids['e_ser']!);
      }
      // Escape does not close a pinned card (the pause menu opens and closes as usual).
      await page.keyboard.press('Escape');
      await expect(panel(page)).toBeVisible();
      await waitFor(page, (x) => x.overlays.includes('pause'), 'the pause menu');
      await page.keyboard.press('Escape');
      await waitFor(page, (x) => x.overlays.length === 0, 'the pause menu closed');
      // Unpinned, it follows the stack under the pointer — to the far right too, the slingers staying in view.
      await page.getByTestId('binsp-pin').click();
      await expect(panel(page)).toHaveAttribute('data-pinned', 'false');
      const sl = await stackCell(page, fx.ids['e_sli']!);
      await page.mouse.move(sl.x, sl.y);
      await expect(panel(page)).toHaveAttribute('data-stack', fx.ids['e_sli']!, { timeout: 5_000 });
      await expect(panel(page)).toHaveAttribute('data-dock', /^left/);
      await expect(statValue(page, 'ammo')).toHaveText(/^\d+\/\d+$/);
      await besideCard(page, fx.ids['e_sli']!);
      await page.waitForTimeout(400);
      await shot(page, 'follow-docked-left-1280x720');
      const g = await stackCell(page, fx.ids['gri']!);
      await page.mouse.move(g.x, g.y);
      await expect(panel(page)).toHaveAttribute('data-stack', fx.ids['gri']!, { timeout: 5_000 });
      // The Griffins: two retaliations; a curse nobody recorded a caster for.
      await expect(statValue(page, 'retaliation')).toHaveText('2/2');
      await besideCard(page, fx.ids['gri']!);
      const curse = page.getByTestId('binsp-effect').first();
      await expect(curse.getByTestId('binsp-effect-source')).toHaveText('Source: Unknown');
      await expect(curse).toHaveAttribute('data-source-kind', 'unknown');
      await expect(curse).toContainText('hostile');
      await expect(page.getByTestId('binsp-stat-attack')).toHaveClass(/is-down/);
      await page.mouse.move(640, 40);
      await page.waitForTimeout(300);
      await shot(page, 'unknown-source-1280x720');
      // Step through the stacks with the keyboard-reachable buttons.
      await page.getByTestId('binsp-next').click();
      await expect(panel(page)).not.toHaveAttribute('data-stack', fx.ids['gri']!);
      await page.getByTestId('binsp-prev').click();
      await expect(panel(page)).toHaveAttribute('data-stack', fx.ids['gri']!);
      await page.keyboard.press('Escape');
      await expect(panel(page)).toBeHidden();
      await unchanged(page, before);
    });

    test('an order given with the card open is the ordinary order (the card adds none)', async ({ page }) => {
      test.setTimeout(300_000);
      const before = await load(page, { battleSpeed: 'instant' }, fx.file);
      await rightClickStack(page, fx.ids['pel']!);
      await expect(panel(page)).toBeVisible();
      await unchanged(page, before);
      await page.getByTestId('battle-defend').click();
      const after = await waitFor(page, (x) => x.state.revision !== before.state.revision && !x.busy, 'the Defend order', 60_000);
      // Exactly the Defend: the Hoplites defend, and the turn passed to the next stack.
      expect(after.state.battle.stacks[fx.ids['hop']!].defending).toBe(true);
      expect(after.state.battle.activeStackId).not.toBe(fx.ids['hop']);
      await expect(panel(page)).toBeVisible();
    });
  });

  for (const [w, h, scale, tag] of [
    [1024, 640, 1, 'small-1024x640'],
    [1366, 768, 1.6, '1366x768-ui160'],
  ] as const) {
    test.describe(`drawer ${tag}`, () => {
      test.use({ viewport: { width: w, height: h } });
      test(`a dismissible drawer that keeps the battle bar usable (${tag})`, async ({ page }) => {
        test.setTimeout(300_000);
        const fx = inspectionBattle(`inspection-${tag}`);
        const before = await load(page, { battleSpeed: '1', uiScale: scale }, fx.file);
        await rightClickStack(page, fx.ids['pel']!);
        await expect(panel(page)).toBeVisible();
        await expect(panel(page)).toHaveAttribute('data-layout', 'drawer');
        // The drawer's short slide-in (slow frames on the software GPU: wait for it to finish).
        await panel(page).evaluate((el) => Promise.all(el.getAnimations().map((a) => a.finished)));
        await page.waitForTimeout(200);
        await clearOfControls(page, w, h);
        // Everything essential is in the drawer: name, count, front HP, the values, effects, close.
        for (const id of ['binsp-name', 'binsp-front', 'binsp-close', 'binsp-pin', 'binsp-stat-attack', 'binsp-stat-retaliation']) await expect(page.getByTestId(id)).toBeVisible();
        await page.mouse.move(w / 2, 20);
        await page.waitForTimeout(400);
        await shot(page, `drawer-${tag}`);
        // The acting stack's own card, by key; then dismissed.
        await pointerAway(page);
        await page.keyboard.press('i');
        await expect(panel(page)).toHaveAttribute('data-stack', fx.ids['hop']!);
        await page.getByTestId('binsp-stat-attack').scrollIntoViewIfNeeded();
        await expect(page.getByTestId('binsp-effect').first()).toContainText('Attack +3');
        await page.waitForTimeout(300);
        await shot(page, `drawer-acting-${tag}`);
        await page.getByTestId('binsp-close').click();
        await expect(panel(page)).toBeHidden();
        await unchanged(page, before);
      });
    });
  }
});
