import { expect, test } from '@playwright/test';
import { clickHex, endDay, inspect, startCampaign, waitFor } from './helpers';

/**
 * App-level journey through Mission 1 using only the real UI input paths:
 * setup flow → town build → recruitment → movement → pre-battle dialog →
 * tactical battle (auto-combat) → result → save → load → Continue.
 */
test('Three Beacons M01 journey through the UI', async ({ page }) => {
  test.setTimeout(300_000);
  // Faster battle playback keeps the software-rendered run short (results are identical at any speed).
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await page.getByTestId('menu-settings').click();
  await page.getByLabel('Battle speed').selectOption('2');
  await page.getByTestId('settings-apply').click();
  await startCampaign(page);

  // Town: build the Veteran Barracks (confirmation dialog), once per day.
  await page.getByTestId('town-tab-asterion').click();
  await page.getByTestId('slot-dwelling_t1').click();
  await page.getByTestId('build').click();
  await page.getByTestId('confirm-ok').click();
  await waitFor(page, (s) => s.state.towns.asterion.buildings.dwelling_t1 === 2, 'Veteran Barracks');
  await expect(page.getByTestId('build')).toHaveCount(0);

  // Recruitment: recruit all available Hoplites to the visiting hero.
  await page.getByRole('button', { name: 'Recruit', exact: true }).first().click();
  await page.getByTestId('recruit-hoplite').click();
  await page.locator('.recruit-detail').getByRole('button', { name: 'Max' }).click();
  await page.getByTestId('recruit-confirm').click();
  let s = await waitFor(page, (x) => (x.state.mission.counters['recruited:hoplite'] ?? 0) >= 8, 'recruit counter');
  // Training (upgrade) through the same screen.
  await page.getByTestId('train-hoplite').click();
  s = await waitFor(page, (x) => (x.state.mission.counters['trained:hoplite'] ?? 0) >= 1, 'trained counter');
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');
  await waitFor(page, (x) => x.screen === 'adventure', 'back to map');

  // Movement: preview then commit, through the canvas.
  const start = (await inspect(page)).state.heroes.alexios.position;
  await clickHex(page, start.q + 2, start.r);
  await clickHex(page, start.q + 2, start.r);
  await waitFor(page, (x) => x.state.heroes.alexios.position.q === start.q + 2 && !x.busy, 'hero moved');

  // March to the bridge and confirm the encounter.
  for (let i = 0; i < 8; i++) {
    s = await inspect(page);
    if (s.screen === 'battle') break;
    if (s.overlays.includes('encounter')) break;
    if (s.state.heroes.alexios.movementPoints < 150) {
      await endDay(page);
      continue;
    }
    await clickHex(page, 10, 7);
    await clickHex(page, 10, 7);
    await page.waitForTimeout(400);
    await waitFor(page, (x) => !x.busy, 'movement playback', 15_000);
  }
  await waitFor(page, (x) => x.overlays.includes('encounter'), 'pre-battle dialog');
  await page.getByTestId('encounter-attack').click();
  await waitFor(page, (x) => x.screen === 'battle', 'battle screen', 15_000);
  expect((await inspect(page)).state.battle).not.toBeNull();

  // Tactical battle resolved by auto-combat through the normal processor.
  await page.getByTestId('battle-auto').click();
  s = await waitFor(page, (x) => x.screen === 'battle-result', 'battle result', 120_000);
  expect(s.state.lastBattleResult.winner).toBe('attacker');
  expect(s.state.world.sites.m01_ford.cleared).toBe(true);
  const goldAfterBattle = s.state.players.player.wallet.gold;
  await page.getByTestId('result-continue').click();
  s = await inspect(page);
  if (s.screen === 'level-up') {
    await page.getByTestId('offer-0').click();
    await page.getByTestId('levelup-confirm').click();
  }
  s = await waitFor(page, (x) => x.screen === 'adventure', 'map after battle');
  // Rewards were granted exactly once (reopening the result would not add more).
  expect(s.state.players.player.wallet.gold).toBe(goldAfterBattle);

  // Save into manual slot 1, then load it back.
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: /Save Game/ }).click();
  await page.getByTestId('save-manual-1').click();
  await page.getByTestId('save-confirm').click();
  await expect(page.getByTestId('save-manual-1')).toContainText('Day');
  const saved = (await inspect(page)).state;
  await page.getByRole('tab', { name: 'Load' }).click();
  await page.getByTestId('save-manual-1').click();
  await page.getByTestId('load-confirm').click();
  await page.getByTestId('confirm-ok').click();
  s = await waitFor(page, (x) => x.screen === 'adventure' && x.overlays.length === 0, 'loaded game');
  expect(s.state.revision).toBe(saved.revision);
  expect(s.state.heroes.alexios.position).toEqual(saved.heroes.alexios.position);

  // Main menu Continue now offers the most recent save.
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: /Main Menu/ }).click();
  await page.getByTestId('confirm-ok').click();
  await expect(page.getByTestId('menu-continue')).toBeEnabled();
  await page.getByTestId('menu-continue').click();
  await waitFor(page, (x) => x.screen === 'adventure', 'continued');
});
