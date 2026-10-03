/**
 * Owner requests of 2026-10-02 in the production build: the last blow of a
 * battle is shown before the result; random maps with portals and neutral
 * creatures; the Neutral bestiary; and the four new campaigns on the campaign
 * screen. Fixtures are ordinary save files (Load → Import); the page is only
 * read through __prInspect.
 */
import { expect, test } from '@playwright/test';
import { GameDriver } from '@pr/testing';
import { approachTile, importAndLoad, slots, writeSave } from './fixtures';
import { inspect, waitFor } from './helpers';

test('the last blow of a battle is played on the board before the result opens', async ({ page }) => {
  test.setTimeout(180_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const d = GameDriver.mission('skirmish_twin_harbors', { matchId: 'e2e-last-blow' });
  for (const fog of Object.values(d.state.fog)) fog.explored = fog.explored.map(() => 1);
  const hero = d.state.heroes['alexios']!;
  hero.army.slots = slots([['minotaur', 20]]);
  hero.movementPoints = 2000;
  const rival = d.state.heroes['rival_odysseus']!;
  rival.army.slots = slots([['hoplite', 2]]);
  rival.position = { q: 12, r: 8 };
  hero.position = approachTile(d, rival.position, hero.id);
  d.do({ kind: 'MoveHero', heroId: hero.id, destination: rival.position, confirmEncounter: true });
  expect(d.state.battle).not.toBeNull();
  const file = writeSave(d, 'last blow');

  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await importAndLoad(page, file);
  await waitFor(page, (x) => x.screen === 'battle', 'battle screen');
  await page.getByTestId('battle-auto').click();
  // Sample the screen while the battle resolves: once the rules have ended the battle,
  // the board must still be up (the last blow and the fall of the last stack play there).
  let boardAfterEnd = 0;
  let result = false;
  for (let i = 0; i < 1200 && !result; i++) {
    const s = await inspect(page);
    if (s.screen === 'battle' && s.state.battle === null) boardAfterEnd++;
    if (s.screen === 'battle-result') result = true;
    await page.waitForTimeout(40);
  }
  expect(result).toBe(true);
  expect(boardAfterEnd, 'samples with the board still shown after the battle ended').toBeGreaterThan(2);
  expect(errors).toEqual([]);
});

test('random map: portals on by default and neutral creatures guard the sites', async ({ page }) => {
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await page.getByTestId('menu-new').click();
  await page.getByTestId('mode-random').click();
  await page.getByTestId('random-size-small').click();
  await page.getByTestId('random-seed').fill('4242');
  await expect(page.getByRole('switch', { name: 'Two-way portals' })).toHaveAttribute('aria-checked', 'true');
  await page.getByTestId('random-start').click();
  const s = await waitFor(page, (x) => x.screen === 'adventure', 'game start', 30_000);
  expect(s.overlays).not.toContain('briefing');
  const sites = s.state.customMission.sites as { kind: { type: string; exitSiteId?: string }; guard?: { army: { creatureId: string }[] } }[];
  const portals = sites.filter((x) => x.kind.type === 'portal');
  expect(portals.length).toBeGreaterThanOrEqual(2);
  for (const p of portals) expect(portals.some((q) => (q as unknown as { id: string }).id === p.kind.exitSiteId)).toBe(true);
  const guards = sites.flatMap((x) => x.guard?.army.map((a) => a.creatureId) ?? []);
  const neutral = new Set(['brigand', 'hill_slinger', 'wild_boar', 'clay_golem', 'wyvern', 'ogre', 'basilisk', 'elder_drake', 'centaur']);
  expect(guards.some((g) => neutral.has(g))).toBe(true);
});

test('bestiary: the Neutral section closes the bestiary with the creatures of no pantheon', async ({ page }) => {
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await page.getByTestId('menu-encyclopedia').click();
  const neutral = page.getByTestId('codex-pantheon-neutral');
  await neutral.scrollIntoViewIfNeeded();
  for (const id of ['brigand', 'wild_boar', 'clay_golem', 'wyvern', 'ogre', 'basilisk', 'elder_drake']) await expect(neutral.getByTestId(`codex-${id}`)).toBeVisible();
  await neutral.getByTestId('codex-hill_slinger').click();
  await expect(page.getByText(/hexes/).first()).toBeVisible();
});

for (const [campaignId, first, heroDef, patron] of [
  ['twelfth_hour', 'The Ember Dawn', 'egyptian_seshet', 'egyptian_ra'],
  ['lantern_road', 'The Unlit Lantern', 'japanese_akane', 'japanese_amaterasu'],
  ['silver_branch', 'The Cold Hearth', 'celtic_orla', 'celtic_dagda'],
  ['new_fire', 'The Cold Altar', 'mesoamerican_itzel', 'mesoamerican_quetzalcoatl'],
] as const) {
  test(`${campaignId} is playable from New Game: seven missions, fixed patron, first briefing`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('/?e2e', { waitUntil: 'networkidle' });
    await page.getByTestId('menu-new').click();
    await page.getByTestId('mode-campaign').click();
    await page.getByTestId(`scenario-${campaignId}`).click();
    await expect(page.locator('.setup-detail')).toContainText(first);
    await page.getByTestId('setup-begin').click();
    await waitFor(page, (s) => s.overlays.includes('briefing'), 'briefing');
    await expect(page.getByTestId('briefing')).toContainText(first);
    await page.getByTestId('briefing-begin').click();
    const s = await waitFor(page, (x) => x.screen === 'adventure' && x.overlays.length === 0, 'adventure map');
    expect(s.state.scenario.missionId).toBe(`${campaignId}_m01`);
    expect(s.state.players.player.pantheon.patronGodId).toBe(patron);
    expect(Object.values(s.state.heroes as Record<string, { definitionId: string }>).some((h) => h.definitionId === heroDef)).toBe(true);
    expect(s.campaign.campaignId).toBe(campaignId);
    expect(errors).toEqual([]);
  });
}
