import { expect, test, type Page } from '@playwright/test';
import { GameDriver } from '@pr/testing';
import { createGeneratedMatch, createRandomSkirmish } from '@pr/campaign';
import { axialNeighbors, type HeroState, type SiteDefinition } from '@pr/rules';
import { inspect, waitFor } from './helpers';
import { approachTile, importAndLoad, slots, writeSave } from './fixtures';

/**
 * Brief 12 visuals (owner delivery 2026-10-05) through the real screens: every
 * town location of the six pantheons at base and upgraded dwellings, the nine
 * climate chips, the eight random-map site markers in the tile panel (key tent
 * and gate tinted with their key colour). Screenshots for review.
 */

const PANTHEONS = ['greek', 'norse', 'egyptian', 'japanese', 'celtic', 'mesoamerican'] as const;

function errorsOf(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  return errors;
}

/** A fresh page (no saves from the previous round), then Load → Import → load. */
async function load(page: Page, file: string) {
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await page.evaluate(() => new Promise<void>((done) => {
    const req = indexedDB.deleteDatabase('pantheon-realms');
    req.onsuccess = req.onerror = req.onblocked = () => done();
  }));
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await importAndLoad(page, file);
}

/** Every <img> under `sel` has decoded. */
async function imagesReady(page: Page, sel: string) {
  await expect
    .poll(() => page.locator(sel).evaluateAll((els) => els.length > 0 && els.every((e) => (e as HTMLImageElement).complete && (e as HTMLImageElement).naturalWidth > 0)), { timeout: 15_000 })
    .toBe(true);
}

for (const form of ['base', 'upgraded'] as const) {
  test(`towns: all 18 locations of every pantheon show delivered art (${form} dwellings)`, async ({ page }) => {
    test.setTimeout(240_000);
    const errors = errorsOf(page);
    for (const p of PANTHEONS) {
      const d = GameDriver.mission('skirmish_twin_harbors', { matchId: `e2e-b12-${p}-${form}` });
      const arch = Object.values(d.catalog.townArchetypes).find((a) => a.pantheonId === p)!;
      const t = d.state.towns['westharbor']!;
      t.archetypeId = arch.id;
      for (const s of arch.slots) t.buildings[s.id] = s.kind === 'dwelling' ? (form === 'base' ? 1 : s.chain.length) : s.chain.length;
      await load(page, writeSave(d, `b12 ${p} ${form}`));
      await waitFor(page, (s) => s.screen === 'adventure', 'adventure');
      await page.getByTestId('town-tab-westharbor').click();
      await waitFor(page, (s) => s.screen === 'town', 'town screen');
      const arts = page.locator('.town-slot__art');
      await expect(arts).toHaveCount(18);
      await imagesReady(page, 'img.town-slot__art, .town-slot__art img');
      const srcs = await page.locator('img.town-slot__art, .town-slot__art img').evaluateAll((els) => els.map((e) => (e as HTMLImageElement).getAttribute('src') ?? ''));
      expect(srcs.length, p).toBe(18);
      for (const src of srcs) expect(src, `${p} ${form}`).toMatch(/art\/town\//);
      if (form === 'upgraded') expect(srcs.filter((s) => /dwelling\.tier\d\.upgraded/.test(s)), p).toHaveLength(7);
      else expect(srcs.filter((s) => /dwelling\.tier\d\.base/.test(s)), p).toHaveLength(7);
      await page.waitForTimeout(600);
      await page.screenshot({ path: `test-results/b12-town-${p}-${form}.png` });
    }
    expect(errors.filter((e) => !/favicon/i.test(e))).toEqual([]);
  });
}

const BIOMES = ['moor', 'desert', 'storm_plateau', 'autumn', 'coast', 'fjord', 'high_pass', 'jungle', 'tundra'] as const;

test('climates: each of the nine battle chips shows its delivered icon with the rule as tooltip', async ({ page }) => {
  test.setTimeout(240_000);
  const errors = errorsOf(page);
  for (const biome of BIOMES) {
    const d = GameDriver.mission('skirmish_twin_harbors', { matchId: `e2e-b12-${biome}` });
    for (const fog of Object.values(d.state.fog)) fog.explored = fog.explored.map(() => 1);
    d.state.world.map.biome = biome;
    const hero = d.state.heroes['alexios']!;
    hero.army.slots = slots([['hoplite', 20]]);
    hero.movementPoints = 2000;
    const rival = d.state.heroes['rival_odysseus']!;
    rival.army.slots = slots([['hoplite', 8]]);
    rival.position = { q: 12, r: 8 };
    hero.position = approachTile(d, rival.position, hero.id);
    d.do({ kind: 'MoveHero', heroId: hero.id, destination: rival.position, confirmEncounter: true });
    await load(page, writeSave(d, `b12 climate ${biome}`));
    const s = await waitFor(page, (x) => x.screen === 'battle', 'battle screen', 30_000);
    expect(s.state.battle.climate?.id, biome).toBe(biome);
    const chip = page.getByTestId('battle-climate');
    await expect(chip).toHaveAttribute('data-climate', biome);
    await expect(chip.locator('img.climate-chip__icon')).toHaveAttribute('src', new RegExp(`icon\\.climate\\.${biome}\\.png$`));
    await imagesReady(page, '[data-testid="battle-climate"] img');
    await expect(chip).toHaveAttribute('title', /.+/);
    const box = (await chip.boundingBox())!;
    await page.screenshot({ path: `test-results/b12-climate-${biome}.png`, clip: { x: Math.max(0, box.x - 40), y: Math.max(0, box.y - 30), width: box.width + 80, height: box.height + 60 } });
  }
  expect(errors.filter((e) => !/favicon/i.test(e))).toEqual([]);
});

const MARKERS: [string, string][] = [
  ['learning_stone', 'learning-stone'],
  ['spell_shrine', 'spell-shrine'],
  ['skill_trainer', 'skill-trainer'],
  ['quest_hut', 'quest-hut'],
  ['key_tent', 'key-tent'],
  ['key_gate', 'key-gate'],
  ['windmill', 'windmill'],
  ['prison', 'prison'],
];

test('random-map sites: the tile panel shows each of the eight delivered markers; key tent and gate in their key colour', async ({ page }) => {
  test.setTimeout(480_000);
  const errors = errorsOf(page);
  const catalog = GameDriver.mission('skirmish_twin_harbors').catalog;
  let base: { g: ReturnType<typeof createRandomSkirmish>; seed: number } | null = null;
  for (let seed = 1; seed < 120 && !base; seed++) {
    const g = createRandomSkirmish(catalog, { seed, size: 'small', seats: [{ pantheonId: 'greek', controller: 'human' }, { pantheonId: 'norse', controller: 'ai' }], victory: { type: 'elimination' }, monsters: 'none', revealMap: true });
    if (MARKERS.every(([k]) => g.mission.sites.some((s) => s.kind.type === k))) base = { g, seed };
  }
  expect(base, 'a seed with all eight site kinds').not.toBeNull();
  for (const [kind, marker] of MARKERS) {
    const d = new GameDriver(createGeneratedMatch(catalog, base!.g, { matchId: `e2e-b12-${kind}`, startingGodId: 'zeus' }).match, catalog);
    const target: SiteDefinition = d.state.customMission!.sites.find((s) => s.kind.type === kind)!;
    const h: HeroState = Object.values(d.state.heroes).find((x) => x.ownerId === 'player' && x.status === 'active' && !x.monster)!;
    try {
      h.position = approachTile(d, target.coord, h.id);
    } catch {
      // A key gate stands in a pass the hero cannot path through yet: stand on any cell next to it (a screenshot fixture).
      const map = d.state.world.map;
      h.position = axialNeighbors(target.coord).find((c) => c.q >= 0 && c.r >= 0 && c.q < map.width && c.r < map.height)!;
    }
    await load(page, writeSave(d, `b12 marker ${kind}`));
    await waitFor(page, (s) => s.screen === 'adventure' && !s.busy, 'adventure map');
    let p: { x: number; y: number } | null = null;
    for (let i = 0; i < 40 && !p; i++) {
      p = await page.evaluate(([a, b]) => (globalThis as unknown as { __prProject: (k: string, a: number, b: number) => { x: number; y: number } | null }).__prProject('adventure', a!, b!), [target.coord.q, target.coord.r]);
      if (!p) await page.waitForTimeout(100);
    }
    expect(p, kind).not.toBeNull();
    await page.mouse.move(5, 300);
    await page.mouse.move(p!.x, p!.y, { steps: 8 });
    const panel = page.locator('.adv-tile');
    const icon = panel.locator('img.marker-icon').first();
    await expect(icon).toHaveAttribute('src', new RegExp(`icon\\.marker\\.${marker}\\.png$`));
    if (kind === 'key_tent' || kind === 'key_gate') await expect(panel.locator('.marker-icon__tint')).toHaveCount(1);
    else await expect(panel.locator('.marker-icon__tint')).toHaveCount(0);
    await imagesReady(page, '.adv-tile img.marker-icon');
    await page.waitForTimeout(300);
    const box = (await panel.boundingBox())!;
    await page.screenshot({ path: `test-results/b12-marker-${marker}.png`, clip: { x: box.x, y: box.y, width: box.width, height: Math.min(box.height, 220) } });
  }
  expect((await inspect(page)).screen).toBe('adventure');
  expect(errors.filter((e) => !/favicon/i.test(e))).toEqual([]);
});
