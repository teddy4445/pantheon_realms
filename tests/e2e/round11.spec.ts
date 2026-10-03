import { expect, test, type Page } from '@playwright/test';
import { GameDriver } from '@pr/testing';
import { scenarioMission } from '@pr/rules';
import { clickHex, inspect, waitFor } from './helpers';
import { approachTile, importAndLoad, slots, writeSave } from './fixtures';
import { leaderOf, toHumanBattleTurn, usePrefs } from './momentFixtures';

/**
 * Owner fixes of 2026-10-03 (third round): a leaner main menu and New Game
 * flow, the map without Overview or hero panel, army previews instead of a
 * strength estimate, the spellbook pop-up for casting on the map and in
 * battle, the town with its economy panel on the painting and a pop-up beside
 * each building, the Journal with status icons, and no approval for recruits.
 * Screenshots are kept for review.
 */

const viewportCenter = (page: Page) => (page.viewportSize()?.width ?? 1600) / 2;
const centerX = async (page: Page, selector: string) => {
  const b = await page.locator(selector).first().boundingBox();
  return b ? b.x + b.width / 2 : -1;
};

function skirmish(name: string): GameDriver {
  const d = GameDriver.mission('skirmish_twin_harbors', { matchId: `e2e-${name}` });
  for (const fog of Object.values(d.state.fog)) fog.explored = fog.explored.map(() => 1);
  return d;
}

test('New Game: the campaign goes straight to its briefing; lists and pantheon cards carry no tags', async ({ page }) => {
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await page.getByTestId('menu-new').click();
  await expect(page.locator('.screen-header__subtitle')).toHaveCount(0);
  await page.getByTestId('mode-campaign').click();
  await expect(page.locator('.screen-header__subtitle')).toHaveCount(0);
  await expect(page.getByRole('tab')).toHaveCount(0);
  await page.getByTestId('scenario-three_beacons').click();
  await expect(page.locator('.setup-screen .chip')).toHaveCount(0);
  await expect(page.locator('.setup-screen')).not.toContainText(/What carries between missions|Other pantheon campaigns|Playable/);
  await page.screenshot({ path: 'test-results/round11-campaigns.png' });
  // No pantheon step and no patron step: the briefing opens at once.
  await page.getByTestId('setup-begin').click();
  const s = await waitFor(page, (x) => x.overlays.includes('briefing'), 'briefing');
  expect(s.state.players.player.pantheon.patronGodId).toBe('zeus');

  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await page.getByTestId('menu-new').click();
  await page.getByTestId('mode-skirmish').click();
  await page.getByTestId('scenario-skirmish_twin_harbors').click();
  await page.getByTestId('setup-next').click();
  await expect(page.locator('.screen-header__title')).toHaveText('Choose a Pantheon');
  await expect(page.locator('.screen-header__subtitle')).toHaveCount(0);
  const card = page.getByTestId('pantheon-norse');
  await expect(card).not.toContainText(/Playable|gods|heroes/);
  // Names and epithets 4 px larger than before at a 1920-wide window (1.05rem → 1.3rem, 0.78rem → 1.03rem).
  const sizes = await card.evaluate((el) => {
    const root = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const px = (sel: string) => parseFloat(getComputedStyle(el.querySelector(sel)!).fontSize) / root;
    return { name: px('.pantheon-card__name'), epithet: px('.pantheon-card__epithet') };
  });
  expect(sizes.name).toBeGreaterThanOrEqual(1.29);
  expect(sizes.epithet).toBeGreaterThanOrEqual(1.02);
  await page.screenshot({ path: 'test-results/round11-pantheons.png' });
  // The patron is preselected (one per pantheon): Begin starts the skirmish.
  await page.getByTestId('setup-begin').click();
  await waitFor(page, (x) => x.overlays.includes('briefing'), 'skirmish briefing');
});

function mapFixture(name: string): { file: string; site: { q: number; r: number }; heroId: string } {
  const d = skirmish(name);
  const hero = leaderOf(d);
  hero.spellbook = true;
  hero.knownSpellIds = ['fleet_foot', 'far_sight', 'spark', 'blessing'];
  hero.mana = 30;
  const mission = scenarioMission(d.catalog, d.state)!;
  const guarded = mission.sites.find((s) => s.guard && !d.state.world.sites[s.id]?.cleared)!;
  hero.position = approachTile(d, guarded.coord, hero.id);
  return { file: writeSave(d, name), site: guarded.coord, heroId: hero.id };
}

test('map: no Overview or hero panel; guards shown as portraits without an estimate; Spells opens the casting book; a lean pause menu', async ({ page }) => {
  test.setTimeout(240_000);
  await usePrefs(page, { graphicsTested: true, tutorialHints: false });
  const { file, site, heroId } = mapFixture('r11-map');
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await importAndLoad(page, file);
  await waitFor(page, (x) => x.screen === 'adventure' && x.overlays.length === 0 && x.humanTurn, 'map');
  await expect(page.getByRole('button', { name: 'Overview' })).toHaveCount(0);
  await expect(page.locator('.adv-hero')).toHaveCount(0);
  await expect(page.locator('.adv-left .panel__header')).toHaveCount(0);

  // The tile panel: the guards as portraits with counts, no "Estimate vs" heuristic.
  await clickHex(page, site.q, site.r, 'right');
  const guards = page.getByTestId('guard-army');
  await expect(guards).toBeVisible();
  expect(await guards.locator('.army-preview__stack').count()).toBeGreaterThan(0);
  await expect(page.locator('.adv-tile')).not.toContainText('Estimate');
  await page.screenshot({ path: 'test-results/round11-tile.png' });

  // Spells: the book pop-up, fixed size, filters always there; a self spell casts at once.
  const before = (await inspect(page)).state.heroes[heroId].movementPoints as number;
  await page.getByTestId('open-spells').click();
  await waitFor(page, (x) => x.overlays.includes('spellbook'), 'spell book');
  await expect(page.getByTestId('spell-cast')).toBeVisible();
  for (const id of ['book-use-all', 'book-use-battle', 'book-use-adventure']) await expect(page.getByTestId(id)).toBeVisible();
  await expect(page.getByTestId('cast-fleet_foot')).toBeEnabled();
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'test-results/round11-spells-map.png' });
  await page.getByTestId('cast-fleet_foot').click();
  const s = await waitFor(page, (x) => !x.overlays.includes('spellbook') && x.state.heroes[heroId].movementPoints > before, 'Fleet Foot cast');
  expect(s.state.heroes[heroId].mana).toBeLessThan(30);
  // A spell with a target asks for the tile next.
  await page.getByTestId('open-spells').click();
  await page.getByTestId('cast-far_sight').click();
  await expect(page.getByTestId('casting-hint')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('casting-hint')).toHaveCount(0);

  // Pause: no logo, no Quit to Desktop, no close button.
  await page.getByTitle('Menu (Esc)').click();
  const pause = page.getByTestId('pause');
  await expect(pause).toBeVisible();
  await expect(pause.locator('img, .brand-emblem')).toHaveCount(0);
  await expect(pause.getByRole('button', { name: /Quit to Desktop/i })).toHaveCount(0);
  await expect(pause.getByRole('button', { name: 'Close' })).toHaveCount(0);
  await page.keyboard.press('Escape');
  await waitFor(page, (x) => !x.overlays.includes('pause'), 'pause closed');
});

test('battle: the Spell button opens the casting book; picking a spell asks for its target', async ({ page }) => {
  test.setTimeout(180_000);
  await usePrefs(page, { graphicsTested: true, tutorialHints: false });
  const d = GameDriver.mission('skirmish_twin_harbors', { matchId: 'e2e-r11-battle' });
  for (const fog of Object.values(d.state.fog)) fog.explored = fog.explored.map(() => 1);
  const gold = d.catalog.missions['skirmish_twin_harbors']!.sites.find((x) => x.id === 'sk_gold')!.coord;
  const h = leaderOf(d);
  h.army.slots = slots([['cyclops', 20]]);
  h.spellbook = true;
  h.knownSpellIds = ['spark', 'blessing', 'fleet_foot'];
  h.mana = 30;
  h.position = approachTile(d, gold, h.id);
  h.movementPoints = 3000;
  d.do({ kind: 'MoveHero', heroId: h.id, destination: gold, confirmEncounter: true });
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await importAndLoad(page, writeSave(d, 'r11 battle'));
  await toHumanBattleTurn(page);
  await page.getByTestId('battle-spell').click();
  await waitFor(page, (x) => x.overlays.includes('spellbook'), 'spell book');
  await expect(page.getByTestId('spell-cast')).toBeVisible();
  await expect(page.getByTestId('cast-spark')).toBeEnabled();
  // A map spell is listed but cannot be cast in battle.
  await page.getByTestId('book-use-all').click();
  await expect(page.getByTestId('cast-fleet_foot')).toBeDisabled();
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'test-results/round11-spells-battle.png' });
  await page.getByTestId('cast-spark').click();
  await waitFor(page, (x) => !x.overlays.includes('spellbook'), 'book closed');
  await expect(page.locator('.battle').first()).toContainText('Cast Spark');
});

test('town: economy panel on the painting, a pop-up beside the building with icon actions, armies centred, resources in the middle; recruiting asks nothing', async ({ page }) => {
  test.setTimeout(180_000);
  await usePrefs(page, { graphicsTested: true, tutorialHints: false });
  const d = skirmish('r11-town');
  const town = d.state.towns['westharbor']!;
  town.buildings['dwelling_t1'] = 1;
  town.population['hoplite'] = 60;
  d.player.wallet.gold = 50_000;
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await importAndLoad(page, writeSave(d, 'r11 town'));
  await waitFor(page, (x) => x.screen === 'adventure' && x.overlays.length === 0, 'map');
  await page.getByTestId('town-tab-westharbor').click();
  await waitFor(page, (x) => x.screen === 'town', 'town');
  await expect(page.locator('.screen-header__subtitle')).toHaveCount(0);
  // Resources in the middle of the screen.
  expect(Math.abs((await centerX(page, '.screen-header__resources')) - viewportCenter(page))).toBeLessThan(30);
  // The economy panel sits on the painting's top edge.
  const scene = (await page.getByTestId('town-scene').boundingBox())!;
  const hud = (await page.getByTestId('town-economy').boundingBox())!;
  expect(hud.y).toBeGreaterThanOrEqual(scene.y);
  expect(hud.y + hud.height).toBeLessThan(scene.y + scene.height * 0.16);
  // The armies are centred with a divider between them.
  await expect(page.locator('.town-armies__divider')).toBeVisible();
  expect(Math.abs((await centerX(page, '.town-armies__divider')) - viewportCenter(page))).toBeLessThan(40);

  // A pop-up beside the building: no tags, icon actions.
  await page.getByTestId('slot-dwelling_t1').click();
  const pop = page.getByTestId('building-popup');
  await expect(pop).toBeVisible();
  await expect(pop.locator('.chip')).toHaveCount(0);
  const slotBox = (await page.getByTestId('slot-dwelling_t1').boundingBox())!;
  const popBox = (await pop.boundingBox())!;
  expect(popBox.x >= slotBox.x + slotBox.width - 4 || popBox.x + popBox.width <= slotBox.x + 4).toBe(true);
  for (const b of await pop.locator('.bld-pop__actions button').all()) {
    expect((await b.innerText()).trim()).toBe('');
    expect(await b.getAttribute('aria-label')).toBeTruthy();
  }
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'test-results/round11-town.png' });

  // Recruit straight from the pop-up: a large purchase goes through without a confirmation.
  await pop.getByTestId('popup-recruit').click();
  await waitFor(page, (x) => x.screen === 'recruitment', 'recruitment');
  await page.getByTestId('recruit-hoplite').click();
  await page.locator('.recruit-detail').getByRole('button', { name: 'Max' }).click();
  await page.getByTestId('recruit-confirm').click();
  await page.waitForTimeout(300);
  expect((await inspect(page)).overlays).not.toContain('confirm');
  const s = await waitFor(page, (x) => x.state.towns.westharbor.population.hoplite === 0, 'recruited without approval');
  expect(s.state.players.player.wallet.gold).toBeLessThanOrEqual(50_000 - 2000);
  // Back in the town the pop-up is closed; Esc then leaves the town.
  await page.keyboard.press('Escape');
  await waitFor(page, (x) => x.screen === 'town', 'town again');
  await expect(page.getByTestId('building-popup')).toHaveCount(0);
});

test('journal: status icons instead of tags; a step met before it opens reads as completed; no header subtitle', async ({ page }) => {
  await usePrefs(page, { graphicsTested: true, tutorialHints: false });
  const d = GameDriver.mission('three_beacons_m02', { matchId: 'e2e-r11-journal' });
  // A god chosen before "Choose a patron's ally" opens: the step is already met.
  d.state.players['player']!.pantheon.minorGodIds = ['athena'];
  expect(d.state.mission.objectives['m02_pantheon']?.status).toBe('locked');
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await importAndLoad(page, writeSave(d, 'r11 journal'));
  await waitFor(page, (x) => x.screen === 'adventure', 'map');
  await page.keyboard.press('j');
  await waitFor(page, (x) => x.screen === 'journal', 'journal');
  await expect(page.locator('.screen-header__subtitle')).toHaveCount(0);
  await expect(page.locator('.journal-body .objective .chip')).toHaveCount(0);
  await expect(page.getByTestId('objective-m02_pantheon').locator('.status-icon')).toHaveAttribute('data-status', 'completed');
  await expect(page.getByTestId('objective-m02_pantheon')).not.toContainText(/Done early|Opens after/);
  expect(await page.locator('.journal-body .status-icon[data-status="active"]').count()).toBeGreaterThan(0);
  await page.screenshot({ path: 'test-results/round11-journal.png' });
});
