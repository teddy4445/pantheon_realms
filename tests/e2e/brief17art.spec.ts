import { expect, test, type Page } from '@playwright/test';
import { GameDriver } from '@pr/testing';
import { createGeneratedMatch, createRandomSkirmish } from '@pr/campaign';
import { inspect, readStory, waitFor } from './helpers';
import { importAndLoad, writeSave } from './fixtures';
import { usePrefs } from './momentFixtures';

/**
 * GPT-6 Brief 17 delivered (owner delivery 2026-10-06), through the real
 * screens: the four town-hall stages of every pantheon's town (with buildings of
 * mixed levels), the painted ground transitions and shore foam in every
 * climate, the own/enemy hero markers in the tile panel, a failed objective in
 * the Journal, the 16 story portraits in the Journal and the dialogue box, and
 * the neutral map hero. Screenshots for the owner's review (test-results/b17a-*).
 */

const PANTHEONS = ['greek', 'norse', 'egyptian', 'japanese', 'celtic', 'mesoamerican'] as const;

function errorsOf(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  return errors;
}

/** A fresh page (no saves from an earlier step), then Load → Import → load. */
async function load(page: Page, d: GameDriver, name: string) {
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await page.evaluate(() => new Promise<void>((done) => {
    const req = indexedDB.deleteDatabase('pantheon-realms');
    req.onsuccess = req.onerror = req.onblocked = () => done();
  }));
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await importAndLoad(page, writeSave(d, name));
  await waitFor(page, (x) => x.screen === 'adventure' && x.overlays.length === 0, 'adventure map', 60_000);
}

/** Where hex (q, r) is on the page (waits until the map view is up). */
async function project(page: Page, q: number, r: number): Promise<{ x: number; y: number } | null> {
  for (let i = 0; i < 50; i++) {
    const p = await page.evaluate(([a, b]) => (globalThis as unknown as { __prProject?: (k: string, a: number, b: number) => { x: number; y: number } | null }).__prProject?.('adventure', a!, b!) ?? null, [q, r]);
    if (p) return p;
    await page.waitForTimeout(200);
  }
  return null;
}

test.beforeEach(async ({ page }) => {
  await usePrefs(page, { graphicsTested: true, graphicsQuality: 'high', tutorialHints: false });
});

test('towns: the four town-hall stages of every pantheon, with buildings of mixed levels', async ({ page }) => {
  test.setTimeout(900_000);
  const errors = errorsOf(page);
  for (const p of PANTHEONS) {
    for (const level of [1, 2, 3, 4]) {
      const d = GameDriver.mission('skirmish_twin_harbors', { matchId: `e2e-b17-${p}-${level}` });
      const arch = Object.values(d.catalog.townArchetypes).find((a) => a.pantheonId === p)!;
      const t = d.state.towns['westharbor']!;
      t.archetypeId = arch.id;
      // Stage 1 with every other building complete (advanced buildings on the first stage), stage 4 with the
      // rest at their first level (plain buildings on the last stage); stages 2 and 3 grow evenly.
      for (const s of arch.slots) {
        const top = s.chain.length;
        t.buildings[s.id] = level === 1 ? top : level === 4 ? 1 : Math.min(top, level);
      }
      t.buildings['civic_hall'] = level;
      await load(page, d, `b17 ${p} ${level}`);
      await page.getByTestId('town-tab-westharbor').click();
      await waitFor(page, (s) => s.screen === 'town', 'town screen');
      const scene = page.getByTestId('town-scene');
      await expect(scene).toHaveAttribute('style', new RegExp(`town\\.${p}\\.background\\.l${level}\\.webp`));
      await expect(page.locator('.town-slot__art')).toHaveCount(18);
      await expect
        .poll(() => page.locator('img.town-slot__art, .town-slot__art img').evaluateAll((els) => els.length > 0 && els.every((e) => (e as HTMLImageElement).complete && (e as HTMLImageElement).naturalWidth > 0)), { timeout: 20_000 })
        .toBe(true);
      await page.waitForTimeout(500);
      await page.screenshot({ path: `test-results/b17a-town-${p}-l${level}.png` });
    }
  }
  expect(errors.filter((e) => !/favicon/i.test(e))).toEqual([]);
});

const BIOMES = ['temperate', 'moor', 'desert', 'storm_plateau', 'autumn', 'coast', 'fjord', 'high_pass', 'jungle', 'tundra'] as const;

test('ground: painted transitions between grounds and the shore foam in every climate', async ({ page }) => {
  test.setTimeout(900_000);
  const errors = errorsOf(page);
  for (const [n, biome] of BIOMES.entries()) {
    // An archipelago: every ground meets water and the others; the climate set per run.
    const catalog = GameDriver.mission('skirmish_twin_harbors').catalog;
    const g0 = createRandomSkirmish(catalog, { seed: 1700 + n, size: 'small', mapType: 'archipelago', seats: [{ pantheonId: 'greek', controller: 'human' }, { pantheonId: 'norse', controller: 'ai' }], victory: { type: 'elimination' }, monsters: 'none', revealMap: true });
    const { match } = createGeneratedMatch(catalog, g0, { matchId: `e2e-b17-ground-${biome}` });
    const d = new GameDriver(match, catalog);
    (d.state.world.map as { biome: string }).biome = biome;
    for (const fog of Object.values(d.state.fog)) fog.explored = fog.explored.map(() => 1);
    await load(page, d, `b17 ground ${biome}`);
    let g: { edges: string; pieces: number; foam: number } | null = null;
    for (let i = 0; i < 80 && !(g && g.edges === 'painted' && g.foam > 0); i++) {
      await page.waitForTimeout(250);
      g = await page.evaluate(() => (globalThis as unknown as { __prGround: () => { edges: string; pieces: number; foam: number } | null }).__prGround());
    }
    expect(g?.edges, biome).toBe('painted');
    expect(g!.pieces, biome).toBeGreaterThan(50);
    expect(g!.foam, biome).toBeGreaterThan(0);
    await page.screenshot({ path: `test-results/b17a-ground-${biome}.png` });
    // Close up on a coast near the hero (water meets land along several edge directions).
    const lead = Object.values(d.state.heroes).find((h) => h.ownerId === 'player')!;
    const map = d.state.world.map;
    let coast = lead.position;
    for (let r = 0, best = Infinity; r < map.height; r++) {
      for (let q = 0; q < map.width; q++) {
        const i = r * map.width + q;
        if (map.terrain[i] !== 'w') continue;
        const near = [[1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1], [1, -1]].some(([a, b]) => { const t = map.terrain[(r + b!) * map.width + q + a!]; return !!t && t !== 'w' && t !== 'v'; });
        const dd = Math.abs(q - lead.position.q) + Math.abs(r - lead.position.r);
        if (near && dd < best) ({ best, coast } = { best: dd, coast: { q, r } });
      }
    }
    const p = await project(page, coast.q, coast.r);
    if (p && p.x > 80 && p.y > 80) {
      await page.mouse.move(Math.max(120, p.x), p.y);
      for (let i = 0; i < 5; i++) await page.mouse.wheel(0, -120);
      await page.waitForTimeout(700);
      await page.screenshot({ path: `test-results/b17a-ground-${biome}-coast.png` });
    }
  }
  expect(errors.filter((e) => !/favicon/i.test(e))).toEqual([]);
});

test('markers: your hero and an enemy hero in the tile panel; a failed objective in the Journal', async ({ page }) => {
  test.setTimeout(240_000);
  const d = GameDriver.mission('skirmish_twin_harbors', { matchId: 'e2e-b17-markers' });
  for (const fog of Object.values(d.state.fog)) fog.explored = fog.explored.map(() => 1);
  const me = d.state.heroes['alexios']!;
  // Away from the town gate (its tile shows the town's marker) and from any site.
  me.position = { q: me.position.q + 4, r: me.position.r };
  d.state.heroes['rival_odysseus']!.position = { q: me.position.q + 3, r: me.position.r };
  const objective = Object.keys(d.state.mission.objectives)[0]!;
  d.state.mission.objectives[objective]!.status = 'failed';
  await load(page, d, 'b17 markers');
  for (const [hero, asset] of [[me, 'icon.marker.hero'], [d.state.heroes['rival_odysseus']!, 'icon.marker.enemy-hero']] as const) {
    const p = (await project(page, hero.position.q, hero.position.r))!;
    await page.mouse.move(p.x, p.y + 4, { steps: 4 });
    const icon = page.locator('.tile-info .marker-icon').first();
    await expect(icon).toHaveAttribute('src', new RegExp(`${asset.replace(/\./g, '\\.')}\\.png$`), { timeout: 15_000 });
    await page.screenshot({ path: `test-results/b17a-${asset}.png` });
  }
  await page.keyboard.press('j');
  if ((await inspect(page)).screen !== 'journal') await page.getByRole('button', { name: /^Journal$/ }).first().click();
  await waitFor(page, (s) => s.screen === 'journal', 'journal');
  const row = page.getByTestId(`objective-${objective}`);
  await expect(row.locator('.marker-icon')).toHaveAttribute('src', /icon\.marker\.encounter\.png$/);
  await page.screenshot({ path: 'test-results/b17a-journal-failed.png' });
});

/** Missions whose briefing and scenes hold all 16 painted story portraits between them. */
const STORY: [string, string[]][] = [
  ['three_beacons_m01', ['hero.greek.thaleia.portrait']],
  ['three_beacons_m02', ['hero.greek.ione.portrait']],
  ['silver_branch_m01', ['hero.celtic.cathal.portrait', 'hero.celtic.sadb.portrait']],
  ['twelfth_hour_m01', ['hero.egyptian.nebet.portrait', 'hero.egyptian.pawah.portrait']],
  ['lantern_road_m01', ['hero.japanese.genzo.portrait', 'hero.japanese.shiro.portrait']],
  ['new_fire_m01', ['hero.mesoamerican.chimal.portrait', 'hero.mesoamerican.xoco.portrait']],
  ['winter_oath_m01', ['hero.norse.eydis.portrait', 'hero.norse.skeggi.portrait']],
  ['winter_oath_m03', ['hero.norse.svanhild.portrait', 'hero.norse.troll_wife.portrait']],
  ['winter_oath_m06', ['hero.norse.jokul.portrait']],
  ['skirmish_twin_harbors', ['story.herald.portrait']],
];

test('portraits: the 16 story characters in the Journal’s story, and in the dialogue box', async ({ page }) => {
  test.setTimeout(900_000);
  const errors = errorsOf(page);
  const seen = new Set<string>();
  for (const [missionId, want] of STORY) {
    const d = GameDriver.mission(missionId, { matchId: `e2e-b17-story-${missionId}` });
    const mission = d.catalog.missions[missionId]!;
    d.state.mission.scenesPlayed = (mission.storyScenes ?? []).map((s) => s.id);
    await load(page, d, `b17 story ${missionId}`);
    await page.keyboard.press('j');
    if ((await inspect(page)).screen !== 'journal') await page.getByRole('button', { name: /^Journal$/ }).first().click();
    await waitFor(page, (s) => s.screen === 'journal', 'journal');
    await page.getByRole('tab', { name: 'Story' }).click();
    const assets = await page.locator('.dialogue__line .portrait img').evaluateAll((els) => els.map((e) => e.getAttribute('data-asset') ?? ''));
    for (const id of want) {
      expect(assets, `${missionId}: ${id}`).toContain(id);
      seen.add(id);
    }
    await expect
      .poll(() => page.locator('.dialogue__line .portrait img').evaluateAll((els) => els.every((e) => (e as HTMLImageElement).complete && (e as HTMLImageElement).naturalWidth > 0)), { timeout: 15_000 })
      .toBe(true);
    await page.screenshot({ path: `test-results/b17a-journal-${missionId}.png`, fullPage: true });
  }
  expect(seen.size).toBe(16);
  // The dialogue box: the painted bust beside it, the square portrait inside it (the Troll-wife's pact).
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  const d = GameDriver.mission('winter_oath_m03', { matchId: 'e2e-b17-story-box' });
  d.state.mission.scenesPlayed = ['m03_troll_pact'];
  await load(page, d, 'b17 story box');
  await page.keyboard.press('j');
  if ((await inspect(page)).screen !== 'journal') await page.getByRole('button', { name: /^Journal$/ }).first().click();
  await waitFor(page, (s) => s.screen === 'journal', 'journal');
  await page.getByRole('tab', { name: 'Story' }).click();
  await page.getByTestId('journal-scene-m03_troll_pact').getByRole('button', { name: 'Replay scene' }).click();
  const box = page.locator('.story-box');
  await expect(box).toBeVisible({ timeout: 15_000 });
  let shot = 0;
  for (let i = 0; i < 12 && (await box.isVisible().catch(() => false)); i++) {
    const mini = box.locator('.story-box__mini img, .story-box__body > .portrait img').first();
    const asset = await mini.getAttribute('data-asset').catch(() => null);
    if (asset === 'hero.norse.troll_wife.portrait' && shot === 0) {
      await expect(page.getByTestId('story-bust')).toBeVisible();
      await page.waitForTimeout(400);
      await page.screenshot({ path: 'test-results/b17a-dialogue-troll-wife.png' });
      shot++;
    }
    await page.getByTestId('story-continue').click();
    await page.waitForTimeout(250);
  }
  expect(shot).toBe(1);
  await readStory(page);
  expect(errors.filter((e) => !/favicon/i.test(e))).toEqual([]);
});

test('the neutral map hero: a hero without a pantheon rides the delivered neutral strips', async ({ page }) => {
  test.setTimeout(240_000);
  const fetched: string[] = [];
  page.on('response', (r) => r.url().includes('/heroes/neutral/') && r.status() < 400 && fetched.push(r.url().split('/heroes/neutral/')[1]!));
  const d = GameDriver.mission('skirmish_twin_harbors', { matchId: 'e2e-b17-neutral' });
  for (const fog of Object.values(d.state.fog)) fog.explored = fog.explored.map(() => 1);
  // No pantheon: a hero definition the catalogue does not know, owned by a player of no known pantheon (test fixture only).
  const rival = d.state.heroes['rival_odysseus']!;
  const me = d.state.heroes['alexios']!;
  rival.definitionId = 'wandering_captain';
  (d.state.players['rival'] as { pantheonId: string }).pantheonId = 'neutral';
  rival.position = { q: me.position.q + 3, r: me.position.r + 1 };
  await load(page, d, 'b17 neutral hero');
  await expect.poll(() => fetched.some((f) => f.startsWith('idle/')), { timeout: 20_000 }).toBe(true);
  const heroes = await page.evaluate(() => (globalThis as unknown as { __prHeroes: () => Record<string, { status: string | null; clip: string; sprite: string }> }).__prHeroes());
  expect(heroes['rival_odysseus']?.status).toBe('final');
  const p = (await project(page, rival.position.q, rival.position.r))!;
  await page.mouse.move(p.x, Math.max(80, p.y - 160));
  for (let i = 0; i < 5; i++) await page.mouse.wheel(0, -120);
  await page.waitForTimeout(900);
  await page.screenshot({ path: 'test-results/b17a-neutral-hero.png' });
  // Its strips for all four actions load with it (the map's figures preload their whole set).
  await expect.poll(() => ['idle/', 'walk/', 'prepare/', 'cast/'].every((a) => fetched.some((f) => f.startsWith(a))), { timeout: 20_000 }).toBe(true);
});
