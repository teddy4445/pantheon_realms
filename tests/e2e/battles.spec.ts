import { expect, test } from '@playwright/test';
import { GameDriver } from '@pr/testing';
import { waitFor } from './helpers';
import { approachTile, importAndLoad, slots, writeSave } from './fixtures';

/**
 * Playtest pass for the proposed pantheons: each one's full roster (one stack
 * per tier, a week of growth) fights the full Greek roster in the field
 * through the real battle screen with auto-combat. Checks that every new
 * creature renders, acts and resolves without a page error, and keeps a
 * screenshot of the opening board and the result.
 */
const CASES = [
  { id: 'norse', leader: 'ragnar' },
  { id: 'egyptian', leader: 'hatshepsut' },
  { id: 'japanese', leader: 'yoshitsune' },
  { id: 'celtic', leader: 'fionn' },
  { id: 'mesoamerican', leader: 'nezahualcoyotl' },
] as const;

function rosterArmy(d: GameDriver, pantheonId: string): [string, number][] {
  return d.catalog.pantheons[pantheonId]!.roster.map((r) => {
    const f = d.catalog.families[r.familyId]!;
    return [f.baseCreatureId, f.baseGrowth] as [string, number];
  });
}

async function instantBattles(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await page.getByTestId('menu-settings').click();
  await page.getByLabel('Battle speed').selectOption('instant');
  await page.getByTestId('settings-apply').click();
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
}

for (const c of CASES) {
  test(`${c.id} roster vs the Greek roster: a full field battle through the UI`, async ({ page }) => {
    test.setTimeout(300_000);
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text());
    });

    const d = GameDriver.mission(`skirmish_twin_harbors_${c.id}_vs_greek`, { matchId: `e2e-battle-${c.id}` });
    for (const fog of Object.values(d.state.fog)) fog.explored = fog.explored.map(() => 1);
    const hero = d.state.heroes[c.leader]!;
    hero.army.slots = slots(rosterArmy(d, c.id));
    hero.movementPoints = 2000;
    const rival = d.state.heroes['rival_odysseus']!;
    rival.army.slots = slots(rosterArmy(d, 'greek'));
    // Meet in the open field between the towns.
    rival.position = { q: 12, r: 8 };
    hero.position = approachTile(d, rival.position, hero.id);
    d.do({ kind: 'MoveHero', heroId: hero.id, destination: rival.position, confirmEncounter: true });
    expect(d.state.battle).not.toBeNull();
    const file = writeSave(d, `battle ${c.id}`);

    await instantBattles(page);
    await importAndLoad(page, file);
    const s = await waitFor(page, (x) => x.screen === 'battle', 'battle screen');
    expect(Object.values(s.state.battle.stacks).filter((st: any) => st.side === 'attacker')).toHaveLength(7);
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `test-results/battle-${c.id}.png` });
    await page.getByTestId('battle-auto').click();
    const done = await waitFor(page, (x) => x.screen === 'battle-result', 'battle result', 180_000);
    expect(['attacker', 'defender']).toContain(done.state.lastBattleResult.winner);
    await page.screenshot({ path: `test-results/battle-${c.id}-result.png` });
    expect(errors.filter((e) => !/favicon/i.test(e))).toEqual([]);
  });
}
