import { test, expect } from '@playwright/test';
import { GameDriver } from '@pr/testing';
import { approachTile, importAndLoad, slots, writeSave } from './fixtures';
import { goldBattleDriver, usePrefs } from './momentFixtures';
import { boardingFixture, HERO } from './navalFixtures';
import { seaFixture } from './seaFixtures';
import { waitFor } from './helpers';

function fixture(kind: string, name: string): string {
  let d: GameDriver;
  if (kind === 'boarding') {
    d = boardingFixture(name).driver;
    d.do({ kind: 'AttackShip', heroId: HERO, targetShipId: 'map_ship_b' });
  } else if (kind === 'sea') {
    const f = seaFixture(name); d = f.driver;
    d.do({ kind: 'MoveHero', heroId: HERO, destination: f.monster, confirmEncounter: true });
  } else if (kind === 'siege') {
    d = GameDriver.mission('skirmish_twin_harbors', { matchId: name });
    const town = d.state.towns.eastharbor!;
    town.buildings.fortifications = 3;
    town.garrison.slots = slots([['hoplite', 10]]);
    d.state.heroes.rival_odysseus!.position = { q: 25, r: 3 };
    const hero = d.state.heroes.alexios!;
    hero.army.slots = slots([['hoplite', 30], ['peltast', 20]]);
    hero.movementPoints = 3000;
    for (const fog of Object.values(d.state.fog)) fog.explored.fill(1);
    hero.position = approachTile(d, town.coord, hero.id);
    d.do({ kind: 'MoveHero', heroId: hero.id, destination: town.coord, confirmEncounter: true });
  } else d = goldBattleDriver('skirmish_twin_harbors', name, [['hoplite', 30], ['peltast', 20]]);
  expect(d.state.battle).toBeTruthy();
  return writeSave(d, name);
}
for (const kind of ['land', 'siege', 'boarding', 'sea']) for (const scale of [1, 1.25, 1.6]) {
  test(`${kind} board clears the measured HUD at ${scale * 100}%`, async ({ page }, info) => {
    const file = fixture(kind, `hud-${kind}-${scale}`);
    await usePrefs(page, { graphicsTested: true, uiScale: scale, battleSpeed: 'instant' });
    await page.goto('/?e2e', { waitUntil: 'networkidle' });
    await importAndLoad(page, file);
    await waitFor(page, (s) => s.screen === 'battle' && !s.busy && !!s.state.battle, 'battle ready', 90_000);
    await expect(page.getByTestId('battle-loading')).toBeHidden({ timeout: 60_000 });
    await expect.poll(async () => page.evaluate(() => {
      const root = document.querySelector('.battle')!;
      const top = root.querySelector('.turn-order')!.getBoundingClientRect().bottom;
      const bottom = root.querySelector('.battle-bottom')!.getBoundingClientRect().top;
      const g = globalThis as unknown as { __prInspect: () => { state: { battle: { rows: number; cols: number } } }; __prProject: (k: string, col: number, row: number) => { x: number; y: number } | null };
      const b = g.__prInspect().state.battle;
      const points = [[0, 0], [b.cols - 1, 0], [0, b.rows - 1], [b.cols - 1, b.rows - 1]].map(([c, r]) => g.__prProject('battle', c!, r!));
      return points.every((p) => p && p.y > top + 1 && p.y < bottom - 1);
    }), { timeout: 15_000 }).toBe(true);
    await page.screenshot({ path: info.outputPath(`${kind}-${scale}.png`), animations: 'disabled' });
  });
}
