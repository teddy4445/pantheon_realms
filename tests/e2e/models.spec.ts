import { expect, test } from '@playwright/test';
import { waitFor } from './helpers';
import { approachTile, importAndLoad, skirmishDriver, slots, writeSave } from './fixtures';

/**
 * GLB pipeline in a real browser. `?e2e=calibration` is a presentation-only
 * test mode that shows the axis/scale calibration model in place of the
 * Hoplite (no game state is touched). Checks loading in the right-handed
 * scenes, the S18 playback controls and battle figures.
 */
test('calibration GLB loads in the bestiary viewer with the playback controls', async ({ page }) => {
  const warnings: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'warning' || m.type() === 'error') warnings.push(m.text());
  });
  await page.goto('/?e2e=calibration', { waitUntil: 'networkidle' });
  await page.getByTestId('menu-encyclopedia').click();
  await page.getByTestId('codex-hoplite').click();
  await expect(page.getByTestId('viewer-model-status')).toContainText('GLB model', { timeout: 20_000 });
  await page.screenshot({ path: 'test-results/model-viewer-idle.png' });
  for (const s of ['move', 'melee', 'defend', 'hit', 'victory']) {
    await page.getByTestId(`anim-${s}`).click();
    await page.waitForTimeout(250);
  }
  await page.getByTestId('anim-melee').click();
  await page.waitForTimeout(450);
  await page.screenshot({ path: 'test-results/model-viewer-melee.png' });
  await page.getByTestId('viewer-pause').click();
  await page.getByTestId('viewer-play').click();
  await page.getByTestId('viewer-stop').click();
  await page.getByTestId('anim-defeat').click();
  await page.waitForTimeout(1600);
  await page.screenshot({ path: 'test-results/model-viewer-defeat.png' });
  await page.getByTestId('viewer-restart').click();
  expect(warnings.filter((w) => w.includes('[models]'))).toEqual([]);
});

test('calibration GLB replaces the Hoplite figures on the battlefield', async ({ page }) => {
  test.setTimeout(180_000);
  const d = skirmishDriver();
  const alexios = d.state.heroes['alexios']!;
  alexios.army.slots = slots([['hoplite', 30], ['peltast', 10]]);
  const mine = d.catalog.missions['skirmish_twin_harbors']!.sites.find((s) => s.id === 'sk_gold')!.coord;
  alexios.position = approachTile(d, mine, 'alexios');
  alexios.movementPoints = 2000;
  d.do({ kind: 'MoveHero', heroId: 'alexios', destination: mine, confirmEncounter: true });
  const file = writeSave(d, 'Model battle');
  await page.goto('/?e2e=calibration', { waitUntil: 'networkidle' });
  await importAndLoad(page, file);
  await waitFor(page, (s) => s.screen === 'battle', 'battle screen');
  await page.waitForTimeout(2500);
  await page.screenshot({ path: 'test-results/model-battle.png' });
  await page.getByTestId('battle-auto').click();
  const s = await waitFor(page, (x) => x.screen === 'battle-result', 'battle result', 150_000);
  expect(s.state.lastBattleResult).not.toBeNull();
});
