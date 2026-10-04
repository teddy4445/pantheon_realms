/**
 * Magic and Favor effects (owner request 2026-10-03, "do 1"): the code-drawn
 * spell, miracle and gift effects and the status overlays on battle stacks
 * (placeholders until the fx.* strips are delivered). Observed only through
 * the read-only ?e2e readouts — __prFx (the effect asset IDs the views played)
 * and __prBattle (each stack's overlays) — and the page itself. Saves come in
 * through Load → Import. Screenshots go to TOUR_OUT (default test-results/).
 */
import { expect, test, type Page } from '@playwright/test';
import { GameDriver } from '@pr/testing';
import { clickHex, inspect, waitFor } from './helpers';
import { approachTile, importAndLoad, slots, writeSave } from './fixtures';
import { clickBattleCell, leaderOf, toHumanBattleTurn, usePrefs } from './momentFixtures';

const OUT = process.env.TOUR_OUT ?? 'test-results';
const PREFS = { graphicsTested: true, graphicsQuality: 'high', tutorialHints: false };

type Fx = { battle: string[] | null; adventure: string[] | null };
const fxLog = (page: Page) => page.evaluate(() => (globalThis as unknown as { __prFx: () => Fx }).__prFx());
const overlaysOf = (page: Page, id: string) => page.evaluate((sid) => (globalThis as unknown as { __prBattle: () => Record<string, { overlays: string[] }> | null }).__prBattle()?.[sid]?.overlays ?? [], id);

/** A few frames of an effect as it plays (the test browser draws about one frame a second). */
async function film(page: Page, name: string, n = 4, gap = 700): Promise<void> {
  for (let i = 0; i < n; i++) {
    await page.screenshot({ path: `${OUT}/${name}-${i}.png` });
    await page.waitForTimeout(gap);
  }
}

/** Record every burst the page shows (they last about 1.7 s, shorter than a slow test frame). */
async function watchBursts(page: Page): Promise<void> {
  await page.evaluate(() => {
    const w = window as unknown as { __bursts?: string[] };
    if (w.__bursts) return;
    w.__bursts = [];
    new MutationObserver(() => {
      for (const el of document.querySelectorAll<HTMLElement>('[data-testid^="burst-"]')) {
        const id = el.dataset['testid']!;
        if (!el.dataset['seen']) {
          el.dataset['seen'] = '1';
          w.__bursts!.push(id);
        }
      }
    }).observe(document.body, { childList: true, subtree: true });
  });
}
const bursts = (page: Page) => page.evaluate(() => (window as unknown as { __bursts?: string[] }).__bursts ?? []);

/** The player's leader attacking the gold mine's guards, with a spellbook (and Favor). */
function spellBattle(name: string, spells: string[], favor = 0): string {
  const d = GameDriver.mission('skirmish_twin_harbors', { matchId: `e2e-${name}` });
  for (const fog of Object.values(d.state.fog)) fog.explored = fog.explored.map(() => 1);
  const gold = d.catalog.missions['skirmish_twin_harbors']!.sites.find((x) => x.id === 'sk_gold')!.coord;
  const h = leaderOf(d);
  h.army.slots = slots([['cyclops', 20], ['hoplite', 30]]);
  h.spellbook = true;
  h.knownSpellIds = spells;
  h.mana = 100;
  h.position = approachTile(d, gold, h.id);
  h.movementPoints = 3000;
  d.player.wallet.favor = favor;
  d.do({ kind: 'MoveHero', heroId: h.id, destination: gold, confirmEncounter: true });
  return writeSave(d, name);
}

type Stack = { id: string; side: string; totalHp: number; anchor: { col: number; row: number } };
function sides(s: Awaited<ReturnType<typeof inspect>>): { mine: Stack[]; theirs: Stack[] } {
  const battle = s.state.battle;
  const mySide = Object.values(battle.sides as Record<string, { sideId: string; playerId: string | null }>).find((x) => x.playerId === 'player')!.sideId;
  const all = Object.values(battle.stacks as Record<string, Stack>).filter((x) => x.totalHp > 0);
  return { mine: all.filter((x) => x.side === mySide), theirs: all.filter((x) => x.side !== mySide) };
}

async function castAt(page: Page, spellId: string, cell: { col: number; row: number }): Promise<void> {
  await page.getByTestId('battle-spell').click();
  await page.getByTestId(`cast-${spellId}`).click();
  await waitFor(page, (x) => !x.overlays.includes('spellbook'), 'book closed');
  await clickBattleCell(page, cell.col, cell.row);
}

test('battle: a spell gathers at the commander’s corner and strikes from the sky; its own effect plays', async ({ page }) => {
  test.setTimeout(240_000);
  await usePrefs(page, PREFS);
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await importAndLoad(page, spellBattle('r12-lightning', ['lightning', 'blessing']));
  const s = await toHumanBattleTurn(page);
  const enemy = sides(s).theirs[0]!;
  await castAt(page, 'lightning', enemy.anchor);
  await film(page, 'r12-lightning', 5, 600);
  await expect.poll(async () => (await fxLog(page)).battle ?? [], { timeout: 60_000 }).toContain('fx.spell.lightning');
  const after = await waitFor(page, (x) => !x.busy, 'playback finished', 60_000);
  const left = after.state.battle ? (after.state.battle.stacks[enemy.id]?.totalHp ?? 0) : 0;
  expect(left).toBeLessThan(enemy.totalHp);
});

test('battle: Blessing lands on the stack and leaves its shimmer as a lasting overlay', async ({ page }) => {
  test.setTimeout(240_000);
  await usePrefs(page, PREFS);
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await importAndLoad(page, spellBattle('r12-blessing', ['lightning', 'blessing']));
  const s = await toHumanBattleTurn(page);
  const own = sides(s).mine[0]!;
  expect(await overlaysOf(page, own.id)).toEqual([]);
  await castAt(page, 'blessing', own.anchor);
  await film(page, 'r12-blessing', 3, 600);
  await expect.poll(() => overlaysOf(page, own.id), { timeout: 60_000 }).toContain('blessed');
  expect((await fxLog(page)).battle).toContain('fx.spell.blessing');
  await page.screenshot({ path: `${OUT}/r12-blessing-overlay.png` });
});

test('battle: a miracle’s light falls on the whole army after its card, and each stack keeps the Defense overlay', async ({ page }) => {
  test.setTimeout(240_000);
  await usePrefs(page, PREFS);
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await importAndLoad(page, spellBattle('r12-miracle', ['lightning'], 30));
  const s = await toHumanBattleTurn(page);
  const { mine } = sides(s);
  await page.getByTestId('battle-miracles').click();
  await page.getByTestId('battle-miracle-shield_of_the_gods').click();
  // The miracle's card comes first (when its painting is delivered); then the light.
  await expect.poll(async () => (await fxLog(page)).battle ?? [], { timeout: 90_000, intervals: [250] }).toContain('fx.miracle.shield_of_the_gods');
  await film(page, 'r12-miracle', 4, 600);
  for (const st of mine) await expect.poll(() => overlaysOf(page, st.id), { timeout: 60_000 }).toContain('defense_up');
  await page.screenshot({ path: `${OUT}/r12-miracle-overlays.png` });
});

test('map: Far Sight spreads its ring over the chosen tile; Fleet Foot winds round the hero', async ({ page }) => {
  test.setTimeout(240_000);
  await usePrefs(page, PREFS);
  const d = GameDriver.mission('skirmish_twin_harbors', { matchId: 'e2e-r12-map' });
  for (const fog of Object.values(d.state.fog)) fog.explored = fog.explored.map(() => 1);
  const h = leaderOf(d);
  h.spellbook = true;
  h.knownSpellIds = ['far_sight', 'fleet_foot'];
  h.mana = 60;
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await importAndLoad(page, writeSave(d, 'r12-map'));
  await waitFor(page, (x) => x.screen === 'adventure' && x.overlays.length === 0 && x.humanTurn, 'map');
  await page.getByTestId('open-spells').click();
  await page.getByTestId('cast-far_sight').click();
  await expect(page.getByTestId('casting-hint')).toBeVisible();
  await clickHex(page, h.position.q + 2, h.position.r);
  await film(page, 'r12-far-sight', 4, 600);
  await expect.poll(async () => (await fxLog(page)).adventure ?? [], { timeout: 60_000 }).toContain('fx.spell.far_sight');
  await waitFor(page, (x) => !x.busy, 'playback finished', 60_000);
  await page.getByTestId('open-spells').click();
  // Record what the caster's avatar draws every frame (Brief 11: the rider's own cast strip, once, then idle).
  await page.evaluate((id) => {
    const g = globalThis as unknown as { __drawn: string[]; __prHeroes: () => Record<string, { drawn: string | null }> | null };
    g.__drawn = [];
    const step = () => {
      const x = g.__prHeroes()?.[id]?.drawn ?? 'none';
      if (g.__drawn[g.__drawn.length - 1] !== x) g.__drawn.push(x);
      if (g.__drawn.length < 50) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, h.id);
  await page.getByTestId('cast-fleet_foot').click();
  await film(page, 'r12-fleet-foot', 3, 600);
  await expect.poll(async () => (await fxLog(page)).adventure ?? [], { timeout: 60_000 }).toContain('fx.spell.fleet_foot');
  await waitFor(page, (x) => !x.busy, 'playback finished', 60_000);
  const drawn = await page.evaluate(() => (globalThis as unknown as { __drawn: string[] }).__drawn);
  expect(drawn).toContain('cast');
  expect(drawn[drawn.length - 1]).toBe('idle');
});

test('map miracle: Tithe of the Faithful showers coins over the Gold counter after its card', async ({ page }) => {
  test.setTimeout(240_000);
  await usePrefs(page, PREFS);
  const d = GameDriver.mission('skirmish_twin_harbors', { matchId: 'e2e-r12-tithe' });
  d.player.wallet.favor = 30;
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await importAndLoad(page, writeSave(d, 'r12-tithe'));
  await waitFor(page, (x) => x.screen === 'adventure' && x.overlays.length === 0, 'map');
  await watchBursts(page);
  await page.getByTestId('open-interventions').click();
  await page.getByTestId('invoke-tithe_of_the_faithful').click();
  await expect.poll(async () => (await fxLog(page)).adventure ?? [], { timeout: 90_000, intervals: [250] }).toContain('fx.miracle.tithe_of_the_faithful');
  await page.screenshot({ path: `${OUT}/r12-tithe.png` });
  await expect.poll(() => bursts(page), { timeout: 30_000 }).toContain('burst-coins');
});

test('town: a divine gift rises from the Temple; the building pop-up and town actions have their sounds wired', async ({ page }) => {
  test.setTimeout(240_000);
  await usePrefs(page, PREFS);
  const d = GameDriver.mission('skirmish_twin_harbors', { matchId: 'e2e-r12-gift' });
  for (const fog of Object.values(d.state.fog)) fog.explored = fog.explored.map(() => 1);
  d.state.towns['westharbor']!.buildings['pantheon_temple'] = 1;
  d.player.wallet.favor = 30;
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await importAndLoad(page, writeSave(d, 'r12-gift'));
  await waitFor(page, (x) => x.screen === 'adventure' && x.overlays.length === 0, 'map');
  await page.getByTestId('town-tab-westharbor').click();
  await waitFor(page, (x) => x.screen === 'town', 'town screen');
  await watchBursts(page);
  await page.getByTestId('slot-pantheon_temple').click();
  await page.getByTestId('gifts-open').click();
  await page.getByTestId('gift-tears_of_the_gods-receive').click();
  await page.getByTestId('confirm-ok').click();
  await waitFor(page, (x) => x.state.players.player.wallet.favor < 30, 'favor spent');
  await expect.poll(() => bursts(page), { timeout: 30_000 }).toContain('burst-crystal');
  await page.screenshot({ path: `${OUT}/r12-gift.png` });
});
