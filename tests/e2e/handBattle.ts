/**
 * Fight a battle by hand through the real battle controls (campaign expansion
 * handoff, 2026-10-15: campaign battles have no Auto button and no quick
 * battle). The test plays the player: for each of the player's stacks it reads
 * the battle from the read-only inspector, picks an order with the tactical AI
 * here in the test process, and gives that order with the mouse (a cell click,
 * an attack from a chosen side) or the Wait/Defend buttons. Nothing is
 * dispatched through a hook; the game sees only clicks.
 */
import type { Page } from '@playwright/test';
import { loadCatalog } from '@pr/content';
import { chooseBattleAction } from '@pr/ai';
import { stackCells, type BattleCell, type MatchState } from '@pr/rules';
import { inspect, readStory, type Inspect } from './helpers';

const catalog = loadCatalog();

type Pt = { x: number; y: number };
async function project(page: Page, c: BattleCell): Promise<Pt | null> {
  return page.evaluate(([col, row]) => (globalThis as unknown as { __prProject: (k: string, a: number, b: number) => Pt | null }).__prProject('battle', col!, row!), [c.col, c.row]);
}

async function clickAt(page: Page, p: Pt): Promise<void> {
  await page.mouse.move(p.x, p.y);
  await page.waitForTimeout(80);
  await page.mouse.down();
  await page.mouse.up();
}

/** Give one order for the active stack with the mouse; returns false when no control could carry it. */
async function giveOrder(page: Page, state: MatchState): Promise<boolean> {
  const order = chooseBattleAction(catalog, state);
  const battle = state.battle!;
  if (!order) return false;
  switch (order.kind) {
    case 'BattleMove': {
      const p = await project(page, order.to);
      if (!p) return false;
      await clickAt(page, p);
      return true;
    }
    case 'BattleShoot': {
      const target = battle.stacks[order.targetId]!;
      const p = await project(page, target.anchor);
      if (!p) return false;
      await clickAt(page, p);
      return true;
    }
    case 'BattleMelee': {
      // Point inside the target's cell nearest the chosen side, leaning toward it: the
      // battle screen attacks from the side under the pointer.
      const target = battle.stacks[order.targetId]!;
      const from = await project(page, order.from);
      if (!from) return false;
      let best: Pt | null = null;
      let bd = Infinity;
      for (const c of stackCells(catalog, target)) {
        const p = await project(page, c);
        if (!p) continue;
        const d = (p.x - from.x) ** 2 + (p.y - from.y) ** 2;
        if (d < bd) {
          bd = d;
          best = p;
        }
      }
      if (!best) return false;
      await clickAt(page, { x: best.x + (from.x - best.x) * 0.38, y: best.y + (from.y - best.y) * 0.38 });
      return true;
    }
    case 'BattleWait':
      await page.getByTestId('battle-wait').click();
      return true;
    default:
      // Spells, abilities and structure shots have their own panels; the plain Defend
      // button keeps these scripted fights short and still entirely by hand.
      await page.getByTestId('battle-defend').click();
      return true;
  }
}

/**
 * Play the player's side to the end of the battle. Returns the inspector state
 * on the result screen (or wherever the battle handed over).
 */
export async function fightByHand(page: Page, ms = 240_000): Promise<Inspect> {
  const t0 = Date.now();
  let s = await inspect(page);
  while (Date.now() - t0 < ms) {
    s = await inspect(page);
    if (s.screen !== 'battle' || !s.state.battle) return s;
    if (s.story.length > 0) {
      await readStory(page);
      continue;
    }
    if (s.busy || !s.humanTurn) {
      await page.waitForTimeout(120);
      continue;
    }
    const battle = s.state.battle;
    if (battle.phase === 'deployment') {
      await page.getByTestId('deploy-confirm').click();
      await page.waitForTimeout(200);
      continue;
    }
    if (battle.phase === 'selection') {
      await page.getByTestId('defenders-confirm').click();
      await page.waitForTimeout(200);
      continue;
    }
    // The board takes orders once its painting and stacks are drawn.
    if (await page.getByTestId('battle-loading').isVisible().catch(() => false)) {
      await page.waitForTimeout(150);
      continue;
    }
    const rev = s.state.revision;
    const given = await giveOrder(page, s.state as MatchState);
    // The order is in when the revision moves; a missed click falls back to Defend.
    let moved = false;
    for (let i = 0; i < 40 && !moved; i++) {
      await page.waitForTimeout(100);
      const now = await inspect(page);
      moved = now.state.revision !== rev || now.screen !== 'battle';
    }
    if (!moved && given) await page.getByTestId('battle-defend').click({ timeout: 3000 }).catch(() => undefined);
  }
  throw new Error(`The hand-fought battle did not end in ${ms} ms (screen=${s.screen})`);
}
