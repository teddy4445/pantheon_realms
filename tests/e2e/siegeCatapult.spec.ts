import { expect, test, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { GameDriver } from '@pr/testing';
import { approachTile, importAndLoad, slots, writeSave } from './fixtures';
import { inspect, waitFor, type Inspect } from './helpers';
import { clickBattleCell, usePrefs } from './momentFixtures';

/**
 * The stationary, killable siege catapult (scenario feature `targetableCatapultV1`, expedition kit
 * 2026-10-17) through the real battle screen: aiming by a click on the battlefield and by the
 * keyboard list, Fire and Skip, the damaged and destroyed engine, a defender shooting it by clicking
 * it, and all six pantheons' siege themes (screenshots in /home/claude/capture/expedition/catapult/).
 * Saves are ordinary save files built headlessly and brought in through Load → Import.
 */

const OUT = 'test-results/catapult';
const PANTHEONS = ['greek', 'norse', 'egyptian', 'japanese', 'celtic', 'mesoamerican'] as const;

test.describe.configure({ mode: 'serial' });
test.beforeAll(() => mkdirSync(OUT, { recursive: true }));

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
async function load(page: Page, file: string): Promise<void> {
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await page.evaluate(
    () =>
      new Promise<void>((done) => {
        const req = indexedDB.deleteDatabase('pantheon-realms');
        req.onsuccess = req.onerror = req.onblocked = () => done();
      }),
  );
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await importAndLoad(page, file);
}

/** Every stack defends until the round's engine phase opens (headless, before the save is written). */
function toEnginePhase(d: GameDriver): void {
  for (let i = 0; i < 40 && d.state.battle!.phase !== 'engine'; i++) {
    const b = d.state.battle!;
    const st = b.stacks[b.activeStackId!]!;
    d.do({ kind: 'BattleDefend', stackId: st.id }, b.sides[st.side].playerId!);
  }
  expect(d.state.battle!.phase).toBe('engine');
}

/** Alexios besieges Eastharbor rebuilt as a town of `pantheon` (fortifications `level`); the save opens in round 1's catapult phase. */
function engineSiege(pantheon: string, level: 1 | 2 | 3, name: string, engineHp?: number): string {
  const d = GameDriver.mission('skirmish_twin_harbors', { matchId: `e2e-cat-${name}` });
  expect(d.state.scenario.features?.targetableCatapultV1).toBe(true);
  for (const fog of Object.values(d.state.fog)) fog.explored = fog.explored.map(() => 1);
  const arch = Object.values(d.catalog.townArchetypes).find((a) => a.pantheonId === pantheon)!;
  const east = d.state.towns['eastharbor']!;
  east.archetypeId = arch.id;
  east.pantheonId = arch.pantheonId;
  east.buildings['fortifications'] = level;
  east.garrison.slots = slots([['hoplite', 6]]);
  d.state.heroes['rival_odysseus']!.position = { q: 25, r: 3 };
  const hero = d.state.heroes['alexios']!;
  hero.army.slots = slots([['hoplite', 30], ['peltast', 20]]);
  hero.movementPoints = 3000;
  hero.position = approachTile(d, east.coord, hero.id);
  d.do({ kind: 'MoveHero', heroId: hero.id, destination: east.coord, confirmEncounter: true });
  expect(d.state.battle!.siege!.engine).toBeTruthy();
  toEnginePhase(d);
  if (engineHp !== undefined) d.state.battle!.siege!.engine!.hp = engineHp;
  return writeSave(d, `catapult ${name}`);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const siege = (page: Page): Promise<any> => page.evaluate(() => (globalThis as unknown as { __prSiege: () => unknown }).__prSiege());

/** The player commands the catapult phase and the engine's picture is drawn. */
async function enginePhaseReady(page: Page): Promise<Inspect> {
  const s = await waitFor(page, (x) => x.screen === 'battle' && x.humanTurn && !x.busy && x.state.battle?.phase === 'engine', 'the catapult phase', 60_000);
  for (let i = 0; i < 120; i++) {
    const info = await siege(page);
    if (info?.ready && info.engine?.drawn && info.engine.visible) return s;
    await page.waitForTimeout(250);
  }
  throw new Error('engine picture not drawn');
}

const hpOf = (s: Inspect, id: string): number => s.state.battle.siege.structures.find((x: { id: string }) => x.id === id).hp;

for (const target of ['wall_2', 'keep'] as const) test('one click fires at ' + target + ' without the side panel', async ({ page }) => {
  await usePrefs(page, { graphicsTested: true, battleSpeed: '2' });
  const { errors } = watch(page);
  await load(page, engineSiege('greek', 3, 'direct-' + target));
  const beforeState = await enginePhaseReady(page);
  await expect(page.getByTestId('catapult-phase')).toHaveCount(0);
  await expect(page.getByTestId('siege-status')).not.toContainText(/\d+\/\d+/);
  const before = hpOf(beforeState, target);
  if (target === 'wall_2') await clickBattleCell(page, 10, 3);
  else { const info = await siege(page); await page.mouse.click(info.structures.keep.x, info.structures.keep.y); }
  const after = await waitFor(page, x => x.state.battle?.round === 2 && !x.busy, 'shot completes', 60000);
  expect(hpOf(after,target)).toBe(before-1);
  expect(after.state.battle.siege.engine.firedRound).toBe(1);
  expect(errors).toEqual([]);
});

test('keyboard can fire directly through the accessible structure strip', async ({ page }) => {
  await usePrefs(page, { graphicsTested: true, battleSpeed: '2' });
  await load(page, engineSiege('norse', 2, 'keyboard'));
  const before = await enginePhaseReady(page);
  await page.getByTestId('catapult-aim-gate').focus();
  await page.keyboard.press('Enter');
  const after = await waitFor(page, x => x.state.battle?.round === 2, 'direct keyboard shot', 60000);
  expect(hpOf(after,'gate')).toBe(hpOf(before,'gate')-1);
});

test('the damaged engine (1–60 HP) and its shot; the destroyed engine after a defender shoots it by clicking it', async ({ page }) => {
  test.setTimeout(420_000);
  await usePrefs(page, { graphicsTested: true, battleSpeed: '2' });
  const { urls, errors } = watch(page);
  await load(page, engineSiege('egyptian', 3, 'damaged', 50));
  await enginePhaseReady(page);
  const controls = page.getByTestId('catapult-controls');
  await expect(controls).toHaveAttribute('data-stage', 'damaged');
  await expect(page.getByTestId('catapult-hp')).toHaveText('50/120');
  const info = await siege(page);
  expect(info.engine.drawn.url).toContain('expedition-v1/catapult-damaged.png');
  expect(info.engine.drawn.tinted).toBe(false);
  expect(info.engine.facesWalls).toBe(true);
  // Normalised by its visible box: as wide as the intact engine's painted part (190 px of 256 at the still's scale).
  const width = info.engine.drawn.box.x1.x - info.engine.drawn.box.x0.x;
  expect(width).toBeGreaterThan(40);
  await page.getByTestId('catapult-inspect').click();
  await expect(page.getByTestId('catapult-card')).toContainText('Defense 6');
  await page.screenshot({ path: `${OUT}/engine-damaged.png` });
  // A damaged engine still fires (its own picture recoils; the stone leaves the cup).
  await page.getByTestId('catapult-aim-gate').click();
  const s = await waitFor(page, (x) => x.state.battle?.round === 2, 'round 2', 60_000);
  expect(hpOf(s, 'gate')).toBe(1);

  // The defender's side: the rival besieges the player's Westharbor; the player's peltasts shoot its engine.
  const d = GameDriver.mission('skirmish_twin_harbors', { matchId: 'e2e-cat-destroy' });
  for (const fog of Object.values(d.state.fog)) fog.explored = fog.explored.map(() => 1);
  const west = d.state.towns['westharbor']!;
  west.buildings['fortifications'] = 2;
  west.garrison.slots = slots([['peltast', 25]]);
  const alexios = d.state.heroes['alexios']!;
  alexios.position = { q: 4, r: 14 };
  const rival = d.state.heroes['rival_odysseus']!;
  rival.army.slots = slots([['hoplite', 12]]);
  rival.position = approachTile(d, west.coord, rival.id);
  rival.movementPoints = 3000;
  d.state.activePlayerId = 'rival';
  d.do({ kind: 'MoveHero', heroId: rival.id, destination: west.coord, confirmEncounter: true }, 'rival');
  expect(d.state.battle!.siege!.engine!.side).toBe('attacker');
  d.state.battle!.siege!.engine!.hp = 8;
  await load(page, writeSave(d, 'catapult destroy'));
  let t = await waitFor(page, (x) => x.screen === 'battle' && x.humanTurn && !x.busy && !!x.state.battle?.activeStackId, 'the player’s peltasts', 90_000);
  expect(t.state.battle.stacks[t.state.battle.activeStackId].creatureId).toBe('peltast');
  await expect(page.getByTestId('catapult-controls')).toHaveAttribute('data-stage', 'damaged');
  await clickBattleCell(page, 0, 0);
  t = await waitFor(page, (x) => x.state.battle?.siege?.engine?.hp === 0 || !x.state.battle, 'engine destroyed', 60_000);
  await expect.poll(async () => (await siege(page))?.engine?.stage, { timeout: 30_000 }).toBe('destroyed');
  await expect.poll(async () => (await siege(page))?.engine?.drawn?.url ?? '', { timeout: 30_000 }).toContain('expedition-v1/catapult-destroyed.png');
  await expect(page.getByTestId('catapult-controls')).toHaveAttribute('data-stage', 'destroyed');
  await expect(page.getByTestId('catapult-state')).toContainText('Destroyed');
  const wreck = await siege(page);
  expect(wreck.engine.facesWalls).toBe(true);
  expect(wreck.engine.label).toBeNull();
  expect(wreck.mirrored).toBe(true); // the human defender stands on the left
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/engine-destroyed.png` });
  expect(urls.join('\n')).toContain('expedition-v1/catapult-destroyed.png');
  expect(errors).toEqual([]);
});

test('all six pantheon siege themes: direct firing, the engine, walls and gate', async ({ page }) => {
  test.setTimeout(900_000);
  await usePrefs(page, { graphicsTested: true, battleSpeed: '2' });
  const { urls, errors } = watch(page);
  for (const p of PANTHEONS) {
    const from = urls.length;
    await load(page, engineSiege(p, 3, `theme-${p}`));
    await enginePhaseReady(page);
    await page.getByTestId('catapult-aim-gate').click();
    await waitFor(page, x => x.state.battle?.round === 2 && !x.busy, 'gate shot completes', 60000);
    const info = await siege(page);
    expect(info.engine.facesWalls, p).toBe(true);
    expect(info.engine.stage, p).toBe('intact');
    expect(info.legacyCatapult, p).toBeNull();
    expect(info.engine.ground.x, p).toBeLessThan(info.structures.gate.x);
    expect(info.engine.ground.y, p).toBeLessThan(info.structures.gate.y);
    expect(hpOf(await inspect(page), 'gate')).toBe(1);
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${OUT}/theme-${p}.png` });
    const seen = urls.slice(from).join('\n');
    for (const file of [`kit.${p}`, `wall.${p}`, `ground.${p}`]) expect(seen, `${p} ${file}`).toContain(`/siege-v2/${file}.png`);
    expect(seen, `${p} gate`).toContain(`/siege-gates-v3/gate.${p}-v5.png`);
    expect(seen, `${p} catapult still`).toContain('/siege/catapult.intact.webp');
  }
  expect(errors).toEqual([]);
});
