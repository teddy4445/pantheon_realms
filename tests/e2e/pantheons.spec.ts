import { expect, test } from '@playwright/test';
import { inspect, waitFor } from './helpers';

/**
 * Every non-Greek pantheon through the real menus: choose it and an AI rival in
 * the Twin Harbors setup, confirm its patron, open its 18-location town, build
 * and recruit. Screenshots of each town land in test-results/.
 */
const CASES = [
  { id: 'norse', rival: 'greek', patron: 'Odin', leader: 'ragnar', t1: 'norse_draugr', start: 24 },
  { id: 'egyptian', rival: 'norse', patron: 'Ra', leader: 'hatshepsut', t1: 'egyptian_sacred_scarab', start: 21 },
  { id: 'japanese', rival: 'celtic', patron: 'Amaterasu', leader: 'yoshitsune', t1: 'japanese_kitsune', start: 21 },
  { id: 'celtic', rival: 'mesoamerican', patron: 'Dagda', leader: 'fionn', t1: 'celtic_pooka', start: 22 },
  { id: 'mesoamerican', rival: 'egyptian', patron: 'Quetzalcoatl', leader: 'nezahualcoyotl', t1: 'mesoamerican_feathered_serpent', start: 24 },
] as const;

for (const c of CASES) {
  test(`${c.id} skirmish vs ${c.rival}: setup, town, build and recruit through the UI`, async ({ page }) => {
    test.setTimeout(180_000);
    await page.goto('/?e2e', { waitUntil: 'networkidle' });
    await page.getByTestId('menu-new').click();
    await page.getByTestId('mode-skirmish').click();
    await page.getByTestId('scenario-skirmish_twin_harbors').click();
    await page.getByTestId('setup-next').click();
    // Pantheon step: every pantheon is playable; the rival is chosen here too.
    await page.getByTestId(`pantheon-${c.id}`).click();
    // Cards show emblem, name and epithet only: no 'Playable' tag, no god or hero counts.
    await expect(page.getByTestId(`pantheon-${c.id}`)).not.toContainText('Playable');
    await page.getByTestId(`rival-${c.rival}`).click();
    await expect(page.getByTestId(`rival-${c.rival}`)).toHaveAttribute('aria-checked', 'true');
    // A single implemented patron is preselected (no mechanical bonus — mirrors Zeus).
    await expect(page.getByText(c.patron).first()).toBeVisible();
    await page.getByTestId('setup-begin').click();
    await page.getByTestId('briefing-begin').click();
    let s = await waitFor(page, (x) => x.screen === 'adventure' && x.overlays.length === 0, 'adventure map');
    expect(s.state.players.player.pantheonId).toBe(c.id);
    expect(s.state.players.rival.pantheonId).toBe(c.rival);
    expect(s.state.towns.eastharbor.pantheonId).toBe(c.rival);
    expect(s.state.heroes[c.leader].army.slots[0]).toMatchObject({ creatureId: c.t1, count: c.start });

    await page.getByTestId('town-tab-westharbor').click();
    await waitFor(page, (x) => x.screen === 'town', 'town screen');
    await expect(page.locator('[data-testid^="slot-"]')).toHaveCount(18);
    await page.waitForTimeout(400);
    await page.screenshot({ path: `test-results/town-${c.id}.png` });
    await page.getByTestId('slot-marketplace').click();
    await page.getByTestId('build').click();
    s = await waitFor(page, (x) => x.state.towns.westharbor.buildings.marketplace === 1, 'marketplace built');
    await page.getByRole('button', { name: 'Recruit', exact: true }).first().click();
    await page.getByTestId(`recruit-${c.t1}`).click();
    await page.locator('.recruit-detail').getByRole('button', { name: 'Max' }).click();
    await page.getByTestId('recruit-confirm').click();
    await waitFor(page, (x) => x.state.heroes[c.leader].army.slots[0].count > c.start || (x.state.towns.westharbor.garrison?.slots ?? []).some((g: { creatureId: string } | null) => g?.creatureId === c.t1), `${c.t1} recruited`);
    expect((await inspect(page)).state.towns.westharbor.population[c.t1]).toBe(0);
  });
}
