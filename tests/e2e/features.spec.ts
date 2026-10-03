import { expect, test } from '@playwright/test';
import { clickHex, endDay, inspect, waitFor } from './helpers';
import { approachTile, importAndLoad, skirmishDriver, writeSave } from './fixtures';

/**
 * This build's proposed features through the real UI: New Game modes,
 * skirmish difficulty, random maps with hot-seat hand-over, keyboard
 * shortcuts and rebinding, contextual tips, and the end-of-game summary with
 * high scores.
 */

test('New Game offers Campaign, Skirmish and Random Map — no Multiplayer panel', async ({ page }) => {
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await page.getByTestId('menu-new').click();
  await expect(page.getByTestId('mode-campaign')).toBeVisible();
  await expect(page.getByTestId('mode-skirmish')).toBeVisible();
  await expect(page.getByTestId('mode-random')).toBeVisible();
  await expect(page.getByText('Multiplayer')).toHaveCount(0);
  await expect(page.getByText('Custom Map')).toHaveCount(0);
  // No setup stepper and no 'Playable' badges on the mode cards.
  await expect(page.getByRole('list', { name: 'Setup progress' })).toHaveCount(0);
  await expect(page.locator('.mode-card', { hasText: 'Playable' })).toHaveCount(0);
});

test('Twin Harbors on Hard: the AI rival starts richer and earns more; the choice is stored in the match', async ({ page }) => {
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await page.getByTestId('menu-new').click();
  await page.getByTestId('mode-skirmish').click();
  await page.getByTestId('scenario-skirmish_twin_harbors').click();
  await page.getByTestId('setup-next').click();
  await page.getByTestId('difficulty-hard').click();
  await expect(page.getByTestId('match-settings')).toContainText('130%');
  await page.getByTestId('setup-begin').click();
  await page.getByTestId('briefing-begin').click();
  const s = await waitFor(page, (x) => x.screen === 'adventure' && x.overlays.length === 0, 'adventure map');
  expect(s.state.scenario.difficultyId).toBe('hard');
  expect(s.state.players.rival.incomePercent).toBe(125);
  expect(s.state.players.rival.wallet.gold).toBeGreaterThan(s.state.players.player.wallet.gold);
});

test('random map, two people on one computer: the map is hidden at every hand-over', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await page.getByTestId('menu-new').click();
  await page.getByTestId('mode-random').click();
  await page.getByTestId('random-size-small').click();
  await page.getByTestId('seat-1-controller-human').click();
  await page.getByTestId('seat-1-name').fill('Brynja');
  await page.getByTestId('seat-1-pantheon').selectOption('norse');
  // One panel, no map preview; Start opens the map directly (no briefing).
  await expect(page.getByTestId('random-preview')).toHaveCount(0);
  await expect(page.locator('.random-setup .panel')).toHaveCount(1);
  await page.getByTestId('random-seed').fill('4242');
  await page.getByTestId('random-start').click();
  let s = await waitFor(page, (x) => x.screen === 'adventure' && x.overlays.length === 0, 'adventure map');
  expect(s.state.customMission.id).toContain('random_small_2p_4242');
  expect(s.state.players.p2).toMatchObject({ controller: 'human', name: 'Brynja', pantheonId: 'norse' });
  expect(s.state.players.p2.pantheon.patronGodId).toBe('norse_odin');

  await page.getByTestId('end-day').click();
  await page.waitForTimeout(200);
  if ((await inspect(page)).overlays.includes('confirm')) await page.getByTestId('confirm-ok').click();
  s = await waitFor(page, (x) => x.overlays.includes('handoff'), 'hand-over to the second player');
  expect(s.state.activePlayerId).toBe('p2');
  await expect(page.getByTestId('handoff')).toContainText('Brynja');
  // Escape does not lift the hand-over screen.
  await page.keyboard.press('Escape');
  expect((await inspect(page)).overlays).toContain('handoff');
  await page.getByTestId('handoff-begin').click();
  s = await waitFor(page, (x) => x.overlays.length === 0 && x.humanTurn, 'second player’s turn');
  await expect(page.getByTestId('end-day')).toBeEnabled();
  await page.getByTestId('end-day').click();
  await page.waitForTimeout(200);
  if ((await inspect(page)).overlays.includes('confirm')) await page.getByTestId('confirm-ok').click();
  s = await waitFor(page, (x) => x.overlays.includes('handoff') && x.state.activePlayerId === 'player', 'hand-over back to the first player');
  expect(s.state.day).toBe(2);
});

test('keyboard: F1 lists the shortcuts; a rebound key opens the Hero screen', async ({ page }) => {
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await page.getByTestId('menu-settings').click();
  await page.getByRole('tab', { name: 'Controls' }).click();
  await page.getByTestId('bind-open_hero').click();
  await page.keyboard.press('k');
  await expect(page.getByTestId('bind-open_hero')).toHaveText('K');
  await page.getByTestId('settings-apply').click();
  await page.keyboard.press('Escape');
  await page.getByTestId('menu-new').click();
  await page.getByTestId('mode-skirmish').click();
  await page.getByTestId('scenario-skirmish_twin_harbors').click();
  await page.getByTestId('setup-next').click();
  await page.getByTestId('setup-begin').click();
  await page.getByTestId('briefing-begin').click();
  await waitFor(page, (x) => x.screen === 'adventure' && x.overlays.length === 0, 'adventure map');
  await page.keyboard.press('F1');
  await expect(page.getByTestId('shortcuts')).toContainText('Hero screen');
  await expect(page.getByTestId('shortcuts')).toContainText('K');
  await page.keyboard.press('Escape');
  await page.keyboard.press('h');
  await page.waitForTimeout(200);
  expect((await inspect(page)).screen).toBe('adventure');
  await page.keyboard.press('k');
  await waitFor(page, (x) => x.screen === 'hero', 'hero screen from the rebound key');
});

test('tips: the route tip appears once, and “Got it” is remembered after a reload', async ({ page }) => {
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await page.getByTestId('menu-new').click();
  await page.getByTestId('mode-skirmish').click();
  await page.getByTestId('scenario-skirmish_twin_harbors').click();
  await page.getByTestId('setup-next').click();
  await page.getByTestId('setup-begin').click();
  await page.getByTestId('briefing-begin').click();
  const s = await waitFor(page, (x) => x.screen === 'adventure' && x.overlays.length === 0, 'adventure map');
  const hero = s.state.heroes.alexios.position;
  await clickHex(page, hero.q + 2, hero.r);
  await expect(page.getByTestId('hint-panel')).toHaveAttribute('data-hint', 'route_planning');
  await page.getByTestId('hint-dismiss').click();
  await expect(page.getByTestId('hint-panel')).toHaveCount(0);
  await page.reload({ waitUntil: 'networkidle' });
  const prefs = await page.evaluate(() => localStorage.getItem('pantheon-realms.preferences.v1'));
  expect(prefs).toContain('route_planning');
});

test('the last rival falls: game over, summary charts and score, then the high-score table', async ({ page }) => {
  test.setTimeout(120_000);
  // Twin Harbors with the rival reduced to an empty town next to Alexios.
  const d = skirmishDriver();
  for (const h of Object.values(d.state.heroes)) if (h.ownerId === 'rival') h.status = 'defeated';
  const east = d.state.towns['eastharbor']!;
  east.garrison.slots = east.garrison.slots.map(() => null);
  const alexios = d.state.heroes['alexios']!;
  alexios.position = approachTile(d, east.coord, 'alexios');
  alexios.movementPoints = 1500;
  const file = writeSave(d, 'Last rival');
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await importAndLoad(page, file);
  await waitFor(page, (x) => x.screen === 'adventure', 'adventure map');
  await clickHex(page, east.coord.q, east.coord.r);
  await clickHex(page, east.coord.q, east.coord.r);
  let s = await waitFor(page, (x) => x.overlays.includes('game-over'), 'game over');
  expect(s.state.outcome.status).toBe('victory');
  expect(s.state.outcome.winnerIds).toEqual(['player']);
  await expect(page.getByTestId('game-over')).toContainText('Victory');
  await page.getByTestId('game-over-summary').click();
  s = await waitFor(page, (x) => x.screen === 'summary', 'summary screen');
  await expect(page.getByTestId('score-table')).toContainText('Victory');
  await expect(page.locator('.chart__svg')).toBeVisible();
  await page.getByRole('tab', { name: 'Towns' }).click();
  await expect(page.getByTestId('totals-table')).toContainText('Towns captured');
  await page.screenshot({ path: 'test-results/summary.png' });
  await page.getByTestId('summary-highscores').click();
  await waitFor(page, (x) => x.screen === 'high-scores', 'high scores');
  await expect(page.getByTestId('highscore-table')).toContainText('Twin Harbors');
  await expect(page.getByTestId('highscore-table')).toContainText('Victory');
});

test('end day helper still works with tips on (smoke)', async ({ page }) => {
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await page.getByTestId('menu-new').click();
  await page.getByTestId('mode-skirmish').click();
  await page.getByTestId('scenario-skirmish_twin_harbors').click();
  await page.getByTestId('setup-next').click();
  await page.getByTestId('setup-begin').click();
  await page.getByTestId('briefing-begin').click();
  await waitFor(page, (x) => x.screen === 'adventure' && x.overlays.length === 0, 'adventure map');
  await endDay(page);
  expect((await inspect(page)).state.day).toBe(2);
});
