import { expect, test } from '@playwright/test';
import { GameDriver } from '@pr/testing';
import { inspect, waitFor } from './helpers';
import { approachTile, importAndLoad, slots, writeSave } from './fixtures';

/**
 * Signature mechanics, the second god choice and the three town services,
 * each exercised through the real screens from an ordinary save fixture.
 * Screenshots are kept for review.
 */
const mission = (p: string, r = 'greek') => (p === 'greek' && r === 'greek' ? 'skirmish_twin_harbors' : `skirmish_twin_harbors_${p}_vs_${r}`);

function driver(p: string, matchId: string): GameDriver {
  const d = GameDriver.mission(mission(p), { matchId });
  for (const fog of Object.values(d.state.fog)) fog.explored = fog.explored.map(() => 1);
  return d;
}

async function open(page: import('@playwright/test').Page, file: string) {
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await importAndLoad(page, file);
}

test('Mesoamerican offering at the Temple turns creatures into Favor', async ({ page }) => {
  const d = driver('mesoamerican', 'e2e-offering');
  const t = d.state.towns['westharbor']!;
  t.buildings['pantheon_temple'] = 1;
  t.garrison.slots = slots([['mesoamerican_feathered_serpent', 30]]);
  const file = writeSave(d, 'offering');
  await open(page, file);
  const favor = (await inspect(page)).state.players.player.wallet.favor;
  await page.getByTestId('town-tab-westharbor').click();
  await page.getByTestId('slot-pantheon_temple').click();
  await page.getByTestId('offering-open').click();
  const modal = page.getByTestId('offering');
  await modal.getByRole('slider').first().fill('20');
  await expect(modal.getByTestId('offering-favor')).toHaveText('8');
  await page.waitForTimeout(800); // let the dialog's fade-in finish before the screenshot
  await page.screenshot({ path: 'test-results/offering.png' });
  await modal.getByTestId('offering-confirm').click();
  await page.getByTestId('confirm-ok').click();
  const s = await waitFor(page, (x) => x.state.players.player.wallet.favor === favor + 8, 'Favor from the offering');
  expect(s.state.towns.westharbor.garrison.slots[0].count).toBe(10);
});

test('Training Academy trains a visiting hero; Watchtower widens vision', async ({ page }) => {
  const d = driver('greek', 'e2e-academy');
  const t = d.state.towns['westharbor']!;
  t.buildings['training_academy'] = 1;
  t.buildings['watchtower'] = 1;
  const file = writeSave(d, 'academy');
  await open(page, file);
  await page.getByTestId('town-tab-westharbor').click();
  await page.getByTestId('slot-watchtower').click();
  await expect(page.getByText('Town vision: 8 hexes.')).toBeVisible();
  await page.getByTestId('slot-training_academy').click();
  await page.getByTestId('train-alexios').click();
  await waitFor(page, (x) => x.state.heroes.alexios.xp === 500, 'training XP');
  await expect(page.getByTestId('train-alexios')).toBeDisabled();
  await page.screenshot({ path: 'test-results/academy.png' });
});

test('Artifact Merchant sells this week’s stock to the visiting hero', async ({ page }) => {
  const d = driver('greek', 'e2e-merchant');
  const t = d.state.towns['westharbor']!;
  t.buildings['marketplace'] = 1;
  t.buildings['civic_hall'] = 2;
  d.do({ kind: 'BuildStructure', townId: 'westharbor', buildingId: 'artifact_merchant' });
  const first = d.state.towns['westharbor']!.merchant!.stock[0]!;
  const file = writeSave(d, 'merchant');
  await open(page, file);
  await page.getByTestId('town-tab-westharbor').click();
  await page.getByTestId('slot-artifact_merchant').click();
  await page.getByTestId('merchant-open').click();
  await expect(page.getByTestId('merchant')).toBeVisible();
  await expect(page.getByTestId('merchant-item-3')).toBeVisible();
  await page.waitForTimeout(800); // let the dialog's fade-in finish before the screenshot
  await page.screenshot({ path: 'test-results/merchant.png' });
  await page.getByTestId('merchant-buy-0').click();
  const s = await waitFor(page, (x) => x.state.towns.westharbor.merchant.stock[0] === null, 'artifact bought');
  const hero = s.state.heroes.alexios;
  expect([...Object.values(hero.equipment), ...hero.backpack].some((a: any) => a?.artifactId === first)).toBe(true);
});

test('second god choice: commit to a second minor god after the first', async ({ page }) => {
  const d = driver('greek', 'e2e-gods');
  const t = d.state.towns['westharbor']!;
  t.buildings['pantheon_temple'] = 2;
  t.buildings['civic_hall'] = 3;
  d.state.players['player']!.wallet.favor = 50;
  d.do({ kind: 'SelectGod', godId: 'athena' });
  const file = writeSave(d, 'gods');
  await open(page, file);
  await page.getByTestId('town-tab-westharbor').click();
  await page.getByTestId('slot-pantheon_temple').click();
  await page.getByRole('button', { name: 'Pantheon & gods' }).click();
  await expect(page.getByTestId('signature')).toContainText('Glory');
  await page.getByTestId('god-hermes').getByRole('button', { name: 'Commit' }).click();
  await page.getByTestId('confirm-ok').click();
  const s = await waitFor(page, (x) => x.state.players.player.pantheon.minorGodIds.includes('hermes'), 'Hermes committed');
  expect(s.state.players.player.wallet.favor).toBe(50 - 20 - 25);
  await expect(page.getByTestId('god-demeter')).toContainText('Excluded');
  await page.screenshot({ path: 'test-results/second-god.png' });
});

test('Celtic Shapeshift is a free action in battle and shows the aspect', async ({ page }) => {
  const d = driver('celtic', 'e2e-shift');
  const hero = d.state.heroes['fionn']!;
  hero.army.slots = slots([['celtic_pooka', 30], ['celtic_selkie', 6]]);
  hero.movementPoints = 2000;
  const rival = d.state.heroes['rival_odysseus']!;
  rival.army.slots = slots([['hoplite', 20]]);
  rival.position = { q: 12, r: 8 };
  hero.position = approachTile(d, rival.position, hero.id);
  d.do({ kind: 'MoveHero', heroId: hero.id, destination: rival.position, confirmEncounter: true });
  // Let the defender act until one of our shapeshifters is up.
  for (let i = 0; i < 20; i++) {
    const b = d.state.battle!;
    const a = b.activeStackId ? b.stacks[b.activeStackId]! : null;
    if (a && a.side === 'attacker') break;
    d.autoBattleStep();
  }
  const file = writeSave(d, 'shift');
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await page.getByTestId('menu-settings').click();
  await page.getByLabel('Battle speed').selectOption('instant');
  await page.getByTestId('settings-apply').click();
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await importAndLoad(page, file);
  const s = await waitFor(page, (x) => x.screen === 'battle' && x.humanTurn, 'battle, our turn');
  const active = s.state.battle.stacks[s.state.battle.activeStackId];
  const abilityId = active.creatureId === 'celtic_pooka' ? 'shapeshift_hare' : 'shapeshift_sealskin';
  await expect(page.getByTestId('effects-attacker')).toContainText('Free shapeshift');
  const btn = page.getByTestId(`battle-ability-${abilityId}`);
  await expect(btn).toContainText('(free)');
  await btn.click();
  const after = await waitFor(page, (x) => x.state.battle?.stacks[active.id]?.aspect === true, 'aspect taken');
  // Free: the same stack is still acting.
  expect(after.state.battle.activeStackId).toBe(active.id);
  await expect(page.getByText(/aspect$/).first()).toBeVisible();
  await page.screenshot({ path: 'test-results/shapeshift.png' });
});
