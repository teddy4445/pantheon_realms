/**
 * The owner's round of 2026-10-07 (second list) through the real controls:
 * quick battles from the encounter panel, the gods' gifts at level 10, the
 * finished siege rules (aiming the Catapult, combining defenders), the rivals'
 * turn summary, and the map editor's symmetry brush and "generate, then edit".
 */
import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { GameDriver } from '@pr/testing';
import { runQuickBattle, summarizeQuickBattle } from '@pr/ai';
import { xpForLevel } from '@pr/rules';
import { symmetricCells, type CustomMapDocument } from '@pr/session';
import { clickHex, inspect, waitFor } from './helpers';
import { approachTile, importAndLoad, skirmishDriver, slots, writeSave } from './fixtures';
import { goldBattleDriver, leaderOf, usePrefs } from './momentFixtures';

const SK = 'skirmish_twin_harbors';

async function openEncounter(page: Page, q: number, r: number): Promise<void> {
  await clickHex(page, q, r);
  if (!(await inspect(page)).overlays.includes('encounter')) await clickHex(page, q, r);
  await waitFor(page, (s) => s.overlays.includes('encounter'), 'encounter dialog');
}

test('quick battle: the panel shows the expected losses, and the battle resolves to exactly that without the battlefield', async ({ page }) => {
  test.setTimeout(180_000);
  await usePrefs(page, { graphicsTested: true, tutorialHints: false });
  const d = GameDriver.mission(SK, { matchId: 'e2e-quick' });
  for (const fog of Object.values(d.state.fog)) fog.explored = fog.explored.map(() => 1);
  const gold = d.catalog.missions[SK]!.sites.find((x) => x.id === 'sk_gold')!.coord;
  const h = leaderOf(d);
  h.position = approachTile(d, gold, h.id);
  h.movementPoints = 3000;
  const payload = { kind: 'MoveHero' as const, heroId: h.id, destination: gold, confirmEncounter: true };
  // The smallest of these armies that wins with some losses (so the panel lists them).
  let expected = runQuickBattle(d.catalog, d.state, 'player', payload);
  for (const army of [
    [['hoplite', 14], ['peltast', 8]],
    [['hoplite', 18], ['peltast', 10]],
    [['hoplite', 24], ['peltast', 14]],
    [['hoplite', 45], ['peltast', 30]],
  ] as [string, number][][]) {
    h.army.slots = slots(army);
    expected = runQuickBattle(d.catalog, d.state, 'player', payload);
    if (expected.ok && summarizeQuickBattle(expected.result, 'player', expected.state).won) break;
  }
  expect(expected.ok).toBe(true);
  if (!expected.ok) return;
  const sum = summarizeQuickBattle(expected.result, 'player', expected.state);
  expect(sum.won).toBe(true);
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await importAndLoad(page, writeSave(d, 'quick battle'));
  await waitFor(page, (x) => x.screen === 'adventure' && x.overlays.length === 0, 'map', 60_000);
  await openEncounter(page, gold.q, gold.r);
  const panel = page.getByTestId('quick-battle');
  await expect(panel).toHaveAttribute('data-status', 'victory', { timeout: 20_000 });
  await expect(page.getByTestId('quick-battle-outcome')).toHaveText('Victory');
  for (const l of sum.losses) await expect(page.getByTestId(`quick-loss-${l.creatureId}`)).toContainText(`−${l.lost}`);
  if (sum.losses.length === 0) await expect(page.getByTestId('quick-battle-losses')).toHaveText('No losses.');
  await page.waitForTimeout(900); // the dialog's fade-in
  await page.getByTestId('encounter').locator('.modal').screenshot({ path: 'test-results/r0108-quick-panel.png' });
  await page.getByTestId('encounter-quick').click();
  const s = await waitFor(page, (x) => x.screen === 'battle-result', 'battle result', 60_000);
  expect(s.state.battle).toBeNull();
  expect((s as unknown as { battleScreenOpens: number }).battleScreenOpens).toBe(0);
  // The result is the one the panel showed.
  expect(s.state.lastBattleResult.attacker.lines).toEqual(expected.result.attacker.lines);
  expect(s.state.lastBattleResult.rounds).toBe(expected.result.rounds);
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'test-results/r0108-quick-result.png' });
});

test('level 10: the gods offer two gifts with their portraits; one must be taken before the skill; the hero screen lists it', async ({ page }) => {
  test.setTimeout(180_000);
  await usePrefs(page, { graphicsTested: true, tutorialHints: false });
  const d = goldBattleDriver(SK, 'gods-gifts', [['cyclops', 40], ['cyclops', 40]]);
  const h = leaderOf(d);
  h.level = 9;
  h.xp = xpForLevel(d.catalog.rulesProfile, 10) - 1;
  d.autoBattle();
  const decision = d.state.pendingDecisions.find((x) => x.newLevel === 10)!;
  expect(decision.perkOffers?.length).toBe(2);
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await importAndLoad(page, writeSave(d, 'gods gifts'));
  await waitFor(page, (x) => x.screen === 'level-up', 'level-up');
  await expect(page.getByTestId('gift-0')).toBeVisible();
  await expect(page.getByTestId('gift-1')).toBeVisible();
  // Existing art only: each gift shows its god's portrait and a stat icon.
  await expect(page.getByTestId('gift-0').locator('.portrait img, .portrait svg')).toHaveCount(1);
  await expect(page.getByTestId('gift-0').locator('.gift-badge__icon svg')).toHaveCount(1);
  if (decision.offers.length > 0) {
    await expect(page.getByTestId('offer-0')).toBeDisabled();
    await expect(page.getByTestId('levelup-gift-first')).toBeVisible();
  }
  await page.screenshot({ path: 'test-results/r0108-gifts.png' });
  await page.getByTestId('gift-1').click();
  await expect(page.getByTestId('gift-1')).toHaveAttribute('aria-checked', 'true');
  if (decision.offers.length > 0) await page.getByTestId('offer-0').click();
  else await page.getByTestId('levelup-confirm').click();
  const s = await waitFor(page, (x) => (x.state.heroes[h.id].perks ?? []).length > 0, 'gift taken');
  expect(s.state.heroes[h.id].perks).toEqual([decision.perkOffers![1]]);
  // Further levels from the same battle (no gifts below level 15): take the first skill.
  for (let i = 0; i < 6 && (await inspect(page)).screen === 'level-up'; i++) {
    await page.waitForTimeout(400);
    if (await page.getByTestId('offer-0').isVisible().catch(() => false)) await page.getByTestId('offer-0').click();
    else if (await page.getByTestId('levelup-confirm').isVisible().catch(() => false)) await page.getByTestId('levelup-confirm').click();
  }
  if ((await inspect(page)).screen === 'battle-result') await page.getByRole('button', { name: /Continue|Return/ }).first().click();
  await waitFor(page, (x) => x.screen === 'adventure', 'map');
  await page.getByTitle('Hero (H)').click();
  await expect(page.getByTestId(`hero-gift-${decision.perkOffers![1]}`)).toBeVisible();
  await page.screenshot({ path: 'test-results/r0108-hero-gift.png' });
});

test('siege: the attacker aims the Catapult at a tower', async ({ page }) => {
  test.setTimeout(180_000);
  // Aim: Alexios besieges the rival's Castle.
  const d = skirmishDriver();
  const east = d.state.towns['eastharbor']!;
  east.buildings['fortifications'] = 3;
  east.garrison.slots = slots([['hoplite', 6]]);
  d.state.heroes['rival_odysseus']!.status = 'retreated';
  const alexios = d.state.heroes['alexios']!;
  alexios.army.slots = slots([['hoplite', 40], ['peltast', 30]]);
  alexios.position = approachTile(d, east.coord, alexios.id);
  alexios.movementPoints = 2000;
  d.do({ kind: 'MoveHero', heroId: alexios.id, destination: east.coord, confirmEncounter: true });
  expect(d.state.battle?.siege?.level).toBe(3);
  await usePrefs(page, { graphicsTested: true, tutorialHints: false, battleSpeed: 'instant' });
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await importAndLoad(page, writeSave(d, 'siege aim'));
  await waitFor(page, (s) => s.screen === 'battle' && s.humanTurn && !s.busy, 'attacker turn', 60_000);
  await expect(page.getByTestId('catapult-target')).toHaveAttribute('data-structure', /gate|keep|tower_n|tower_s|wall_\d/);
  await page.getByTestId('catapult-aim-tower_n').click();
  await expect(page.getByTestId('catapult-target')).toHaveAttribute('data-structure', 'tower_n');
  const s = await inspect(page);
  expect(s.state.battle.siege.catapultTargetId).toBe('tower_n');
  await page.screenshot({ path: 'test-results/r0108-catapult-aim.png' });
});

test('siege: the town defender combines identical stacks of the garrison and the visiting hero', async ({ page }) => {
  test.setTimeout(180_000);
  // The rival attacks Westharbor held by Alexios and the garrison (eight stacks).
  await usePrefs(page, { graphicsTested: true, tutorialHints: false, battleSpeed: 'instant' });
  const m = skirmishDriver();
  const west = m.state.towns['westharbor']!;
  west.garrison.slots = slots([['hoplite', 5], ['hoplite', 5], ['peltast', 4], ['peltast', 4]]);
  m.state.heroes['alexios']!.army.slots = slots([['hoplite', 6], ['peltast', 3], ['hoplite', 2], ['peltast', 2]]);
  const rival = m.state.heroes['rival_odysseus']!;
  rival.army.slots = slots([['hoplite', 2]]);
  rival.position = approachTile(m, west.coord, rival.id);
  m.state.activePlayerId = 'rival';
  m.do({ kind: 'MoveHero', heroId: rival.id, destination: west.coord, confirmEncounter: true }, 'rival');
  expect(m.state.battle?.phase).toBe('selection');
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await importAndLoad(page, writeSave(m, 'siege merge'));
  await waitFor(page, (x) => x.screen === 'battle', 'battle screen');
  const modal = page.getByTestId('defender-selection');
  await expect(modal).toBeVisible();
  await page.screenshot({ path: 'test-results/r0108-defenders-merge.png' });
  await page.getByTestId('defenders-merge').click();
  await expect(modal).toHaveCount(0);
  const after = await inspect(page);
  const counts = Object.values(after.state.battle?.stacks ?? {})
    .filter((x) => (x as { side: string }).side === 'defender')
    .map((x) => (x as { startingCount: number }).startingCount)
    .sort((a, b) => a - b);
  expect(counts).toEqual([13, 18]);
});

test('the rivals’ turns in a few lines: a mine of yours taken in view is reported when your turn begins', async ({ page }) => {
  test.setTimeout(180_000);
  await usePrefs(page, { graphicsTested: true, tutorialHints: false });
  const d = GameDriver.mission(SK, { matchId: 'e2e-rivals' });
  for (const fog of Object.values(d.state.fog)) fog.explored = fog.explored.map(() => 1);
  const mine = d.catalog.missions[SK]!.sites.find((x) => x.id === 'sk_gold')!;
  d.state.world.sites[mine.id]!.owner = 'player';
  d.state.world.sites[mine.id]!.cleared = true;
  const rival = d.state.heroes['rival_odysseus']!;
  rival.army.slots = slots([['hoplite', 30]]);
  rival.position = approachTile(d, mine.coord, rival.id);
  rival.movementPoints = 2000;
  // The player's hero stays at home: the mine was the player's, so its loss is reported even out of view.
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await importAndLoad(page, writeSave(d, 'rivals summary'));
  await waitFor(page, (x) => x.screen === 'adventure' && x.overlays.length === 0, 'map', 60_000);
  await page.getByTestId('end-day').click();
  // Heroes with movement left: the game asks first.
  await page.waitForTimeout(300);
  if ((await inspect(page)).overlays.includes('confirm')) await page.getByTestId('confirm-ok').click();
  await waitFor(page, (x) => x.screen === 'adventure' && x.humanTurn && x.state.day === 2, 'next day', 90_000);
  const list = page.getByTestId('rival-summary');
  await expect(list).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId('rival-line-rival')).toContainText(`took the ${mine.name} from you`);
  await page.screenshot({ path: 'test-results/r0108-rivals.png' });
  await page.getByTestId('rival-summary-close').click();
  await expect(list).toHaveCount(0);
});

test('map editor: the turned symmetry brush paints both copies; "Generate" opens a random map to edit', async ({ page }) => {
  test.setTimeout(240_000);
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await page.getByTestId('menu-new').click();
  await page.getByTestId('mode-editor').click();
  await waitFor(page, (s) => s.screen === 'map-editor', 'map editor');
  await page.getByTestId('tool-ground-forest').click();
  await page.getByTestId('symmetry-rotate').click();
  const box = (await page.getByTestId('editor-canvas').boundingBox())!;
  await page.mouse.click(box.x + box.width * 0.35, box.y + box.height * 0.32);
  await page.screenshot({ path: 'test-results/r0108-editor-symmetry.png' });
  const exported = async () => {
    const [download] = await Promise.all([page.waitForEvent('download'), page.getByTestId('editor-export').click()]);
    return JSON.parse(readFileSync((await download.path())!, 'utf8')) as CustomMapDocument;
  };
  const doc = await exported();
  const forest: { q: number; r: number }[] = [];
  for (let r = 0; r < doc.height; r++) for (let q = 0; q < doc.width; q++) if (doc.terrain[r * doc.width + q] === 'f') forest.push({ q, r });
  expect(forest.length).toBe(2);
  expect(symmetricCells(doc, forest[0]!, 'rotate')[1]).toEqual(forest[1]);

  await page.getByTestId('editor-generate').click();
  await expect(page.getByTestId('editor-generate-dialog')).toBeVisible();
  await page.getByTestId('generate-type').selectOption('highlands');
  await page.screenshot({ path: 'test-results/r0108-editor-generate.png' });
  await page.getByTestId('editor-generate-confirm').click();
  await expect(page.getByTestId('editor-generate-dialog')).toHaveCount(0);
  await expect(page.getByTestId('editor-status')).toHaveText('Ready to play', { timeout: 20_000 });
  const gen = await exported();
  expect(gen.sites.filter((x) => x.kind === 'town')).toHaveLength(2);
  expect(gen.sites.length).toBeGreaterThan(10);
  expect(gen.roads.length).toBeGreaterThan(20);
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'test-results/r0108-editor-generated.png' });
});
