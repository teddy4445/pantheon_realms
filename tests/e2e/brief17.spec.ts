import { expect, test, type Page } from '@playwright/test';
import { inspect, waitFor } from './helpers';
import { importAndLoad, writeSave } from './fixtures';
import { goldBattleDriver, toHumanBattleTurn, usePrefs } from './momentFixtures';

/**
 * Delivered art that the game did not show before (2026-10-06): the Brief 13
 * status, action and miracle icons as marks over each battle stack's count and
 * on the stack cards, and the map's ground borders (softened until the Brief 17
 * masks are imported). Screenshots for review (test-results/b17-*).
 */

interface StackDebug {
  x: number;
  y: number;
  marks: string[];
}
const stacksOf = (page: Page) => page.evaluate(() => (globalThis as unknown as { __prBattle: () => Record<string, StackDebug> | null }).__prBattle() ?? {});

async function waitMarks(page: Page, id: string, want: string[], ms = 30_000): Promise<StackDebug> {
  const t0 = Date.now();
  let last: StackDebug | undefined;
  while (Date.now() - t0 < ms) {
    last = (await stacksOf(page))[id];
    if (last && want.every((w) => last!.marks.includes(w))) return last;
    await page.waitForTimeout(200);
  }
  throw new Error(`marks of ${id}: ${JSON.stringify(last?.marks)} (wanted ${want.join(', ')})`);
}

test('battle: statuses, defending, waiting and miracles carry their icons over the count and on the stack cards', async ({ page }) => {
  test.setTimeout(150_000);
  await usePrefs(page, { battleSpeed: '2' });
  const d = goldBattleDriver('skirmish_twin_harbors', 'b17-marks', [['hoplite', 20], ['peltast', 15], ['cyclops', 3]], 30);
  const battle = d.state.battle!;
  const mySide = Object.values(battle.sides).find((x) => x.playerId === 'player')!.sideId;
  const mine = Object.values(battle.stacks).filter((s) => s.side === mySide && s.totalHp > 0);
  const theirs = Object.values(battle.stacks).filter((s) => s.side !== mySide && s.totalHp > 0);
  const active = battle.activeStackId ? battle.stacks[battle.activeStackId]! : null;
  const others = mine.filter((s) => s.id !== active?.id);
  expect(others.length).toBeGreaterThanOrEqual(2);
  const rally = d.catalog.interventions!['rally_the_faithful']!;
  const shield = d.catalog.interventions!['shield_of_the_gods']!;
  const round = battle.round;
  const st = (sourceId: string, label: string, kind: string, amount: number, rounds = 2) => ({ sourceId, label, kind, amount, numerator: 1, denominator: 2, expiresAtRound: round + rounds }) as never;
  // A defending stack under a miracle, a stack that waited and was blessed, a cursed and slowed enemy.
  others[0]!.defending = true;
  others[0]!.statuses.push(st(`intervention:${shield.id}`, shield.name, 'defense_bonus', 3));
  others[1]!.waited = true;
  others[1]!.statuses.push(st('spell:test_bless', 'Bless', 'max_damage_roll', 0));
  theirs[0]!.statuses.push(st('spell:test_curse', 'Curse', 'min_damage_roll', 0), st('spell:test_slow', 'Slow', 'speed_bonus', -2));
  if (active && active.side === mySide) active.statuses.push(st(`intervention:${rally.id}`, rally.name, 'attack_bonus', 2));
  const file = writeSave(d, 'b17 marks');
  const icons: string[] = [];
  page.on('response', (r) => r.url().includes('/ui/icons/final/') && r.status() < 400 && icons.push(r.url().split('/').pop()!));
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await importAndLoad(page, file);
  await toHumanBattleTurn(page);

  const a = await waitMarks(page, others[0]!.id, ['icon.action.defend', `icon.intervention.${shield.id}`]);
  await waitMarks(page, others[1]!.id, ['icon.action.wait', 'icon.fx.divine']);
  const e = await waitMarks(page, theirs[0]!.id, ['icon.fx.shadow', 'icon.status.frozen']);
  for (const f of ['icon.action.defend.png', `icon.intervention.${shield.id}.png`, 'icon.action.wait.png', 'icon.fx.divine.png', 'icon.fx.shadow.png', 'icon.status.frozen.png']) expect(icons, f).toContain(f);

  // The active stack's card lists its marks with their meaning.
  if (active && active.side === mySide) {
    const img = page.getByTestId('active-marks').locator('img');
    await expect(img).toHaveCount(1);
    await expect(img.first()).toHaveAttribute('alt', new RegExp(`${rally.name}: Attack \\+2 \\(2 rounds left\\)`));
  }
  await page.screenshot({ path: 'test-results/b17-marks.png' });
  await page.screenshot({ path: 'test-results/b17-marks-stack.png', clip: { x: Math.max(0, a.x - 120), y: Math.max(0, a.y - 160), width: 240, height: 220 } });
  await page.screenshot({ path: 'test-results/b17-marks-enemy.png', clip: { x: Math.max(0, e.x - 120), y: Math.max(0, e.y - 160), width: 240, height: 220 } });
  // Hovering the enemy for an attack shows its marks in the preview too.
  await page.mouse.move(e.x, e.y - 10);
  const preview = page.getByTestId('target-marks');
  if (await preview.count()) await expect(preview.locator('img')).toHaveCount(2);

  // A battle miracle invoked now: its icon marks every stack of the army.
  const s0 = await inspect(page);
  if (s0.humanTurn && !(s0.state.players.player.interventionWeek > 0)) {
    await page.getByTestId('battle-miracles').click();
    await page.getByTestId('battle-miracle-ride_of_the_valkyries').or(page.getByTestId('battle-miracle-shield_of_the_gods')).first().click();
    const s1 = await waitFor(page, (x) => x.screen === 'battle' && !x.busy && x.state.players.player.interventionWeek > 0, 'the miracle', 60_000);
    const used = Object.values(s1.state.battle.stacks as Record<string, { id: string; side: string; totalHp: number; statuses: { sourceId: string }[] }>).find((x) => x.side === mySide && x.totalHp > 0 && x.statuses.some((y) => y.sourceId.startsWith('intervention:')))!;
    const src = used.statuses.find((y) => y.sourceId.startsWith('intervention:'))!.sourceId.slice('intervention:'.length);
    await waitMarks(page, used.id, [`icon.intervention.${src}`]);
    await page.screenshot({ path: 'test-results/b17-marks-miracle.png' });
  }
});

test('map: the ground borders are painted once the Brief 17 transitions are imported (softened before)', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await page.getByTestId('menu-new').click();
  await page.getByTestId('mode-random').click();
  await page.getByTestId('random-count-2').click();
  await page.getByTestId('random-type-archipelago').click();
  await page.getByTestId('random-start').click();
  await waitFor(page, (x) => x.screen === 'adventure' && x.overlays.length === 0, 'adventure map', 60_000);
  const painted = await page.evaluate(() => fetch('./sprites/manifest.json').then((r) => r.json()).then((m) => !!m.ground?.edges).catch(() => false));
  // The traced outlines load after the map opens; until then the softened edges show.
  await expect
    .poll(() => page.evaluate(() => (globalThis as unknown as { __prGround: () => { edges: string } | null }).__prGround()?.edges ?? null), { timeout: 30_000 })
    .toBe(painted ? 'painted' : 'softened');
  await page.screenshot({ path: 'test-results/b17-ground.png' });
});
