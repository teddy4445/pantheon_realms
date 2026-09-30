import { expect, test } from '@playwright/test';
import { clickHex, inspect, waitFor } from './helpers';
import { approachTile, importAndLoad, skirmishDriver, slots, writeSave } from './fixtures';

/**
 * Town sieges, defender selection (BAT-14) and Tactics deployment through the
 * real battle UI. Each test starts from an imported save built headlessly.
 */

async function battleSpeed(page: import('@playwright/test').Page, value: string): Promise<void> {
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await page.getByTestId('menu-settings').click();
  await page.getByLabel('Battle speed').selectOption(value);
  await page.getByTestId('settings-apply').click();
  // Preferences persist; come back to the main menu fresh.
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
}

test('BAT-14: the town defender chooses seven of eight stacks; reserves survive the defence', async ({ page }) => {
  test.setTimeout(240_000);
  // The rival attacks Westharbor (Fort) held by Alexios (4 stacks) and a 4-stack garrison.
  const d = skirmishDriver();
  const west = d.state.towns['westharbor']!;
  west.garrison.slots = slots([['hoplite', 5], ['hoplite', 5], ['peltast', 4], ['peltast', 4]]);
  d.state.heroes['alexios']!.army.slots = slots([['hoplite', 6], ['peltast', 3], ['hoplite', 2], ['peltast', 2]]);
  const rival = d.state.heroes['rival_odysseus']!;
  rival.army.slots = slots([['hoplite', 2]]);
  rival.position = approachTile(d, west.coord, rival.id);
  d.state.activePlayerId = 'rival';
  d.do({ kind: 'MoveHero', heroId: rival.id, destination: west.coord, confirmEncounter: true }, 'rival');
  expect(d.state.battle?.phase).toBe('selection');
  const file = writeSave(d, 'BAT-14 selection');

  await battleSpeed(page, 'instant');
  await importAndLoad(page, file);
  await waitFor(page, (s) => s.screen === 'battle', 'battle screen');
  const modal = page.getByTestId('defender-selection');
  await expect(modal).toBeVisible();
  await expect(modal).toContainText('lost if it falls');
  await expect(page.getByTestId('siege-status')).toContainText('Gate');
  // Eight candidates, seven preselected; swap which one stays in reserve.
  await expect(page.getByTestId('defender-7')).not.toBeChecked();
  await page.getByTestId('defender-0').uncheck();
  await page.getByTestId('defender-7').check();
  await expect(modal).toContainText('1 in reserve');
  await page.screenshot({ path: 'test-results/siege-selection.png' });
  await page.getByTestId('defenders-confirm').click();
  let s = await waitFor(page, (x) => x.state.battle?.phase !== 'selection', 'selection applied');
  expect(s.state.battle.siege.reserves).toEqual([{ source: 'hero', slot: 0 }]);
  await page.getByTestId('battle-auto').click();
  s = await waitFor(page, (x) => x.screen === 'battle-result', 'battle result', 120_000);
  expect(s.state.lastBattleResult.winner).toBe('defender');
  // The reserve (Alexios's first stack) was not in the battle and is intact.
  expect(s.state.heroes.alexios.army.slots[0]).toEqual({ creatureId: 'hoplite', count: 6 });
  expect(s.state.towns.westharbor.ownerId).toBe('player');
});

test('siege with Tactics: deploy, batter the walls with a Cyclops, take the town', async ({ page }) => {
  test.setTimeout(300_000);
  // Alexios (Tactics II) with Cyclopes stands next to the rival's Citadel.
  const d = skirmishDriver();
  const east = d.state.towns['eastharbor']!;
  east.buildings['fortifications'] = 2;
  east.garrison.slots = slots([['peltast', 6]]);
  d.state.heroes['rival_odysseus']!.status = 'retreated';
  const alexios = d.state.heroes['alexios']!;
  alexios.skills.push({ skillId: 'tactics', rank: 2 });
  alexios.army.slots = slots([['cyclops', 3], ['hoplite', 30], ['peltast', 15]]);
  alexios.position = approachTile(d, east.coord, alexios.id);
  alexios.movementPoints = 2000;
  const file = writeSave(d, 'Siege of Eastharbor');

  await battleSpeed(page, '2');
  await importAndLoad(page, file);
  await waitFor(page, (s) => s.screen === 'adventure', 'adventure');
  await clickHex(page, east.coord.q, east.coord.r);
  await clickHex(page, east.coord.q, east.coord.r);
  await waitFor(page, (x) => x.overlays.includes('encounter'), 'siege dialog');
  await expect(page.getByTestId('siege-brief')).toContainText('Citadel');
  await page.getByTestId('encounter-attack').click();
  let s = await waitFor(page, (x) => x.screen === 'battle' && x.state.battle?.phase === 'deployment', 'deployment phase', 15_000);
  expect(s.state.battle.deployment.columns.attacker).toBe(4);
  await expect(page.getByTestId('deploy-hint')).toBeVisible();

  // Move the hoplites (a1) forward into the fourth column through the canvas.
  const project = (col: number, row: number) =>
    page.evaluate(([c, r]) => (globalThis as unknown as { __prProject: (k: string, a: number, b: number) => { x: number; y: number } | null }).__prProject('battle', c!, r!), [col, row]);
  const clickCell = async (col: number, row: number) => {
    let p = await project(col, row);
    for (let i = 0; i < 30 && !p; i++) {
      await page.waitForTimeout(100);
      p = await project(col, row);
    }
    if (!p) throw new Error(`cell ${col},${row} not on screen`);
    await page.mouse.move(p.x, p.y);
    await page.waitForTimeout(60);
    await page.mouse.down();
    await page.mouse.up();
    await page.waitForTimeout(250);
  };
  const a1 = s.state.battle.stacks.a1.anchor;
  await clickCell(a1.col, a1.row);
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'test-results/siege-deployment.png' });
  await clickCell(3, a1.row);
  s = await waitFor(page, (x) => x.state.battle.stacks.a1.anchor.col === 3, 'hoplites deployed');
  await page.getByTestId('deploy-confirm').click();
  s = await waitFor(page, (x) => x.state.battle?.phase !== 'deployment' && !x.busy && x.humanTurn, 'round 1', 30_000);
  expect(s.state.battle.round).toBeGreaterThanOrEqual(1);
  expect(s.state.battle.siege.structures.find((x: { id: string }) => x.id === 'gate').hp).toBe(1); // Catapult

  // The Cyclopes (fastest) batter wall section 2.
  if (s.state.battle.activeStackId === 'a0') {
    await page.getByTestId('battle-structure').click();
    await page.getByTestId('structure-wall_2').click();
    s = await waitFor(page, (x) => x.state.battle?.siege.structures.find((y: { id: string }) => y.id === 'wall_2').hp === 1, 'wall damaged', 20_000);
  }
  await page.screenshot({ path: 'test-results/siege-battle.png' });
  await page.getByTestId('battle-auto').click();
  s = await waitFor(page, (x) => x.screen === 'battle-result', 'battle result', 180_000);
  expect(s.state.lastBattleResult.winner).toBe('attacker');
  expect(s.state.towns.eastharbor.ownerId).toBe('player');
  expect(s.state.heroes.alexios.position).toEqual(east.coord);
  expect((await inspect(page)).state.towns.eastharbor.garrison.slots.every((x: unknown) => x === null)).toBe(true);
});
