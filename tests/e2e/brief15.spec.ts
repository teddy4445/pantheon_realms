import { expect, test, type Page } from '@playwright/test';
import { GameDriver } from '@pr/testing';
import { inspect, waitFor } from './helpers';
import { approachTile, importAndLoad, slots, writeSave } from './fixtures';
import { toHumanBattleTurn } from './momentFixtures';

/**
 * Brief 15 siege art (owner delivery 2026-10-05) and the Brief 14 skirmish
 * pictures in the real screens: every pantheon's level-2 and level-3 siege
 * draws its own wall, gate, tower and keep and its own siege battlefield; the
 * damaged and fallen pieces; the catapult's still and throw strip. Screenshots
 * for review (test-results/b15-*); the requests made by the page show which
 * files were drawn.
 */

const PANTHEONS = ['greek', 'norse', 'egyptian', 'japanese', 'celtic', 'mesoamerican'] as const;

function watch(page: Page): { urls: string[]; errors: string[] } {
  const urls: string[] = [];
  const errors: string[] = [];
  page.on('response', (r) => {
    if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`);
    else urls.push(r.url());
  });
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  return { urls, errors };
}

/** A fresh page (no saves from the previous step), then Load → Import → load. */
async function load(page: Page, file: string) {
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await page.evaluate(() => new Promise<void>((done) => {
    const req = indexedDB.deleteDatabase('pantheon-realms');
    req.onsuccess = req.onerror = req.onblocked = () => done();
  }));
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await importAndLoad(page, file);
}

/** The player's leader attacks Eastharbor, rebuilt as a town of `pantheon` with fortifications of `level`. */
function siegeDriver(pantheon: string, level: 2 | 3, damage = false, garrison: [string, number][] = [['hoplite', 4]]): GameDriver {
  const d = GameDriver.mission('skirmish_twin_harbors', { matchId: `e2e-b15-${pantheon}-${level}` });
  for (const fog of Object.values(d.state.fog)) fog.explored = fog.explored.map(() => 1);
  const arch = Object.values(d.catalog.townArchetypes).find((a) => a.pantheonId === pantheon)!;
  const east = d.state.towns['eastharbor']!;
  east.archetypeId = arch.id;
  east.pantheonId = arch.pantheonId;
  east.buildings['fortifications'] = level;
  east.garrison.slots = slots(garrison);
  const rival = d.state.heroes['rival_odysseus']!;
  rival.position = { q: 25, r: 3 };
  const hero = d.state.heroes['alexios']!;
  hero.army.slots = slots([['hoplite', 30], ['peltast', 20], ['cyclops', 4]]);
  hero.movementPoints = 3000;
  hero.position = approachTile(d, east.coord, hero.id);
  d.do({ kind: 'MoveHero', heroId: hero.id, destination: east.coord, confirmEncounter: true });
  const siege = d.state.battle!.siege!;
  expect(siege.level, `${pantheon} fortification level`).toBe(level);
  if (damage) {
    // Show every state at once: a fallen and a damaged wall section, a damaged tower and keep.
    for (const s of siege.structures) {
      if (s.id === 'wall_1' || s.id === 'tower_n') s.hp = Math.max(1, s.maxHp - 1);
      if (s.id === 'wall_3') s.hp = 0;
      if (s.id === 'keep') s.hp = Math.max(1, Math.floor(s.maxHp / 2));
    }
  }
  return d;
}

test.describe.configure({ mode: 'serial' });

for (const level of [3, 2] as const) {
  test(`sieges, level ${level}: each pantheon's walls, gate, ${level === 3 ? 'towers, ' : ''}keep and battlefield`, async ({ page }) => {
    test.setTimeout(420_000);
    const { urls, errors } = watch(page);
    for (const p of PANTHEONS) {
      const from = urls.length;
      await load(page, writeSave(siegeDriver(p, level), `b15 ${p} ${level}`));
      await toHumanBattleTurn(page);
      await page.waitForTimeout(1500);
      await page.screenshot({ path: `test-results/b15-siege-${p}-l${level}.png` });
      const seen = urls.slice(from).join('\n');
      // Siege revision 2 (2026-10-10): the pantheon's gate/tower/keep atlas, its wall strip, its
      // whole-view siege ground and the shared moat/bridge atlas (assets-runtime/siege-v2) replace
      // the Brief 15 stills and battlefield; every state is a frame of the same atlas.
      for (const file of [`kit.${p}`, `wall.${p}`, `ground.${p}`, 'groundworks-capped']) expect(seen, `${p} ${file}`).toContain(`/siege-v2/${file}.png`);
      expect(seen, 'catapult still').toContain('/siege/catapult.intact.webp');
    }
    expect(errors).toEqual([]);
  });
}

test('damage states: a fallen and a damaged wall section, a damaged tower and keep', async ({ page }) => {
  test.setTimeout(300_000);
  const { urls, errors } = watch(page);
  for (const p of ['greek', 'japanese'] as const) {
    const from = urls.length;
    await load(page, writeSave(siegeDriver(p, 3, true), `b15 ${p} damage`));
    await toHumanBattleTurn(page);
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `test-results/b15-damage-${p}.png` });
    const seen = urls.slice(from).join('\n');
    // Siege revision 2: the damaged and fallen pieces are frames of the pantheon's wall strip and kit atlases.
    for (const f of [`wall.${p}`, `kit.${p}`]) expect(seen, f).toContain(`/siege-v2/${f}.png`);
  }
  expect(errors).toEqual([]);
});

test('the catapult: the throw strip plays in place of the still, and the stone flies on', async ({ page }) => {
  // 30 screenshots while the battle animates: about 7 s each on SwiftShader in the cloud container (2026-10-11).
  test.setTimeout(480_000);
  const { urls, errors } = watch(page);
  // The catapult shoots at the start of every round (round 1's shot was fired when the save was made):
  // play on automatically and film the start of round 2.
  await load(page, writeSave(siegeDriver('greek', 3, false, [['hoplite', 60], ['peltast', 40], ['hoplite', 60]]), 'b15 catapult'));
  await toHumanBattleTurn(page);
  await page.getByTestId('battle-auto').click();
  await waitFor(page, (x) => x.state.battle?.round >= 2, 'round 2', 120_000);
  for (let i = 0; i < 30; i++) {
    await page.screenshot({ path: `test-results/b15-catapult-${String(i).padStart(2, '0')}.png`, clip: { x: 0, y: 150, width: 800, height: 650 } });
    await page.waitForTimeout(40);
  }
  const s = await inspect(page);
  // Two shots (rounds 1 and 2) at the first structure in ID order: the gate.
  const gate = s.state.battle.siege.structures.find((x: { id: string }) => x.id === 'gate');
  expect(gate.hp).toBe(Math.max(0, gate.maxHp - 2));
  expect(urls.join('\n')).toContain('/effects/fx.siege.catapult.throw.webp');
  expect(errors).toEqual([]);
});

test('skirmish list, detail and setup show the Brief 14 pictures', async ({ page }) => {
  test.setTimeout(180_000);
  const { urls, errors } = watch(page);
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /new game/i }).first().click();
  await page.getByTestId('mode-skirmish').click();
  for (const id of ['frostgate', 'burning_oasis', 'circle_of_gates', 'barrows', 'golden_fords', 'six_thrones']) {
    await page.getByTestId(`skirmish-map-${id}`).click();
    await page.waitForTimeout(700);
    await page.screenshot({ path: `test-results/b15-skirmish-${id}.png` });
  }
  const seen = urls.join('\n');
  for (const id of ['frostgate', 'burning_oasis', 'circle_of_gates', 'barrows', 'golden_fords', 'six_thrones']) {
    expect(seen, `${id} card`).toContain(`mission.skirmish.${id}.thumbnail.webp`);
    expect(seen, `${id} picture`).toContain(`mission.skirmish.${id}.briefing.webp`);
  }
  await page.getByTestId('skirmish-map-six_thrones').click();
  await page.getByRole('button', { name: /set up empires/i }).click();
  await expect(page.getByTestId('map-setup-seats')).toBeVisible();
  await page.waitForTimeout(700);
  await page.screenshot({ path: 'test-results/b15-setup-six_thrones.png' });
  expect(errors).toEqual([]);
});
