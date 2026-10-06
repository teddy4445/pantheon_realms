import { expect, test, type Page } from '@playwright/test';
import { GameDriver } from '@pr/testing';
import { createGeneratedMatch, createRandomSkirmish } from '@pr/campaign';
import type { SkirmishMapType } from '@pr/mapgen';
import { waitFor } from './helpers';
import { importAndLoad, writeSave } from './fixtures';
import { goldBattleDriver, usePrefs } from './momentFixtures';

/**
 * The climate-aware nature scenery (owner art delivery 2026-10-06) through the
 * real screens: every climate dressed with its own plants, rocks, mountains and
 * border clumps; water bodies told apart (the sea's profile, freshwater on
 * lakes and rivers, no boats on small or ice-choked water); the graphics
 * qualities; the same map dressed the same on every load; nothing shown on
 * unexplored ground; the battlefield obstacles in the map's climate on the very
 * cells the rules placed them. Screenshots for review: test-results/nature-*.
 * The climate is set on the save (`map.biome`, presentation only).
 */

const CLIMATES = ['temperate', 'autumn', 'coast', 'desert', 'fjord', 'high_pass', 'tundra', 'jungle', 'moor', 'storm_plateau'] as const;
const SEA: Record<string, string> = { temperate: 'marine_temperate', autumn: 'marine_temperate', coast: 'marine_temperate', desert: 'marine_tropical', fjord: 'marine_frozen', high_pass: 'marine_frozen', tundra: 'marine_frozen', jungle: 'marine_tropical', moor: 'marine_temperate', storm_plateau: 'marine_temperate' };

interface MapScenery {
  climate: string;
  nature: boolean;
  items: number;
  drawn: number;
  shown: number;
  shownUnexplored: number;
  byRole: Record<string, number>;
  byKind: Record<string, number>;
  ids: string[];
  water: { kind: string | null; area: number; boundary: boolean; maxClearance: number }[];
  waterItems: { id: string; tile: number; body: string | null; area: number }[];
}
type Obstacle = { col: number; row: number; id: string; source: string };

function errorsOf(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  return errors;
}

async function load(page: Page, d: GameDriver, name: string, screen: 'adventure' | 'battle' = 'adventure') {
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await page.evaluate(() => new Promise<void>((done) => {
    const req = indexedDB.deleteDatabase('pantheon-realms');
    req.onsuccess = req.onerror = req.onblocked = () => done();
  }));
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await importAndLoad(page, writeSave(d, name));
  await waitFor(page, (x) => x.screen === screen && (screen === 'battle' || x.overlays.length === 0), screen, 60_000, true);
}

async function scenery(page: Page): Promise<MapScenery> {
  let s: MapScenery | null = null;
  for (let i = 0; i < 80 && !(s && s.drawn > 0); i++) {
    if (i) await page.waitForTimeout(250);
    s = await page.evaluate(() => (globalThis as unknown as { __prScenery: () => { map: MapScenery | null } }).__prScenery().map);
  }
  expect(s, 'map scenery').toBeTruthy();
  return s!;
}

async function project(page: Page, q: number, r: number): Promise<{ x: number; y: number } | null> {
  for (let i = 0; i < 50; i++) {
    const p = await page.evaluate(([a, b]) => (globalThis as unknown as { __prProject?: (k: string, a: number, b: number) => { x: number; y: number } | null }).__prProject?.('adventure', a!, b!) ?? null, [q, r]);
    if (p) return p;
    await page.waitForTimeout(200);
  }
  return null;
}

/** A random map of the given layout, wholly explored, drawn in `climate`. */
function randomMap(mapType: SkirmishMapType, climate: string, seed: number, explored = true): GameDriver {
  const catalog = GameDriver.mission('skirmish_twin_harbors').catalog;
  const g = createRandomSkirmish(catalog, { seed, size: 'small', mapType, seats: [{ pantheonId: 'greek', controller: 'human' }, { pantheonId: 'norse', controller: 'ai' }], victory: { type: 'elimination' }, monsters: 'none', revealMap: explored });
  const { match } = createGeneratedMatch(catalog, g, { matchId: `e2e-nature-${mapType}-${climate}` });
  const d = new GameDriver(match, catalog);
  (d.state.world.map as { biome: string }).biome = climate;
  if (explored) for (const fog of Object.values(d.state.fog)) fog.explored = fog.explored.map(() => 1);
  return d;
}

/** The tile where the most different grounds meet within two hexes (the close-up spot). */
function mixedSpot(d: GameDriver): { q: number; r: number } {
  const m = d.state.world.map;
  let best = { q: Math.floor(m.width / 2), r: Math.floor(m.height / 2) };
  let most = 0;
  for (let r = 2; r < m.height - 2; r++)
    for (let q = 2; q < m.width - 2; q++) {
      const seen = new Set<string>();
      for (let dr = -2; dr <= 2; dr++) for (let dq = -2; dq <= 2; dq++) if (Math.abs(dq + dr) <= 2) seen.add(m.terrain[(r + dr) * m.width + q + dq]!);
      seen.delete('v');
      if (seen.size > most) ({ most, best } = { most: seen.size, best: { q, r } });
    }
  return best;
}

async function closeUp(page: Page, at: { q: number; r: number }, path: string) {
  const p = await project(page, at.q, at.r);
  if (!p) return;
  await page.mouse.move(Math.min(Math.max(140, p.x), 1140), Math.min(Math.max(140, p.y), 580));
  for (let i = 0; i < 4; i++) await page.mouse.wheel(0, -120);
  await page.waitForTimeout(900);
  await page.screenshot({ path });
  for (let i = 0; i < 4; i++) await page.mouse.wheel(0, 120);
  await page.waitForTimeout(300);
}

const climateOf = (id: string) => id.split('.')[1]!;

test.beforeEach(async ({ page }) => {
  await usePrefs(page, { graphicsTested: true, graphicsQuality: 'high', tutorialHints: false });
});

test('every climate: its own plants, rocks, mountains and border clumps, its sea profile', async ({ page }) => {
  test.setTimeout(1_500_000);
  const errors = errorsOf(page);
  for (const [n, climate] of CLIMATES.entries()) {
    const d = randomMap('archipelago', climate, 1700 + n);
    await load(page, d, `nature ${climate}`);
    const s = await scenery(page);
    expect(s.nature, climate).toBe(true);
    expect(s.climate).toBe(climate);
    for (const id of s.ids) {
      if (id === 'mountain') throw new Error(`${climate}: the generic mountain stands in`);
      const c = climateOf(id);
      expect([climate, SEA[climate], 'freshwater'], id).toContain(c);
    }
    expect(s.byKind['land'] ?? 0, climate).toBeGreaterThan(20);
    expect(s.byKind['edge'] ?? 0, climate).toBeGreaterThan(5);
    // With a few mountains on the map, all three of the climate's silhouettes appear.
    if ((s.byKind['mountain'] ?? 0) >= 8) for (const v of ['01', '02', '03']) expect(s.ids, `${climate} mountain ${v}`).toContain(`nature.${climate}.mountain.${v}`);
    // The archipelago's sea is the climate's profile.
    expect(s.water.some((w) => w.kind === 'sea'), climate).toBe(true);
    for (const w of s.waterItems) expect(climateOf(w.id), w.id).toBe(w.body === 'sea' ? SEA[climate] : 'freshwater');
    if (climate === 'tundra') for (const w of s.waterItems) expect(w.id, 'ice-choked water').not.toMatch(/\.boat\.|water_life\.03/);
    expect(s.shownUnexplored).toBe(0);
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `test-results/nature-${climate}.png` });
    await closeUp(page, mixedSpot(d), `test-results/nature-${climate}-close.png`);
  }
  expect(errors.filter((e) => !/favicon/i.test(e))).toEqual([]);
});

test('water: lakes and rivers take freshwater scenery, the sea its profile; no boats on small water, no whales inland', async ({ page }) => {
  test.setTimeout(900_000);
  const errors = errorsOf(page);
  const cases: { name: string; d: () => GameDriver }[] = [
    { name: 'lake-temperate', d: () => randomMap('lake_isle', 'temperate', 1801) },
    { name: 'ponds-moor', d: () => randomMap('marshlands', 'moor', 1802) },
    { name: 'sea-jungle', d: () => randomMap('archipelago', 'jungle', 1803) },
    { name: 'sea-fjord', d: () => randomMap('archipelago', 'fjord', 1804) },
    {
      name: 'river-autumn',
      d: () => {
        const d = GameDriver.mission('lantern_road_m01', { matchId: 'e2e-nature-river' });
        for (const fog of Object.values(d.state.fog)) fog.explored = fog.explored.map(() => 1);
        return d;
      },
    },
  ];
  for (const c of cases) {
    const d = c.d();
    await load(page, d, `nature ${c.name}`);
    const s = await scenery(page);
    for (const w of s.waterItems) {
      expect(w.body, w.id).not.toBeNull();
      if (w.body !== 'sea') {
        expect(w.id, `${c.name}: inland water`).toMatch(/^nature\.freshwater\./);
        expect(w.id).not.toMatch(/whale|dolphin/);
      }
      if (w.area < 12) expect(w.id, `${c.name}: small water`).not.toMatch(/\.boat\./);
      if (w.body === 'river') expect(w.id, 'no lilies on a river').not.toBe('nature.freshwater.water_life.02');
    }
    if (c.name.startsWith('lake')) expect(s.water.some((w) => w.kind === 'lake' && w.area >= 12)).toBe(true);
    if (c.name.startsWith('river')) expect(s.water.every((w) => w.kind === 'river')).toBe(true);
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `test-results/nature-water-${c.name}.png` });
    // Close up on a piece of water scenery.
    const first = s.waterItems[0];
    if (first) {
      const m = d.state.world.map;
      await closeUp(page, { q: first.tile % m.width, r: Math.floor(first.tile / m.width) }, `test-results/nature-water-${c.name}-close.png`);
    }
  }
  expect(errors.filter((e) => !/favicon/i.test(e))).toEqual([]);
});

test('the same map is dressed the same on every load; lower qualities drop the low dressing; fog hides what is unexplored', async ({ page }) => {
  test.setTimeout(900_000);
  const d = randomMap('continental', 'autumn', 1901, false);
  await load(page, d, 'nature stable 1');
  const a = await scenery(page);
  expect(a.shown).toBeLessThan(a.drawn);
  expect(a.shownUnexplored).toBe(0);
  await load(page, d, 'nature stable 2');
  const b = await scenery(page);
  expect(b.ids).toEqual(a.ids);
  expect(b.items).toBe(a.items);
  expect(b.byRole).toEqual(a.byRole);
  await page.screenshot({ path: 'test-results/nature-fog.png' });
  const counts: Record<string, MapScenery> = { high: a };
  for (const q of ['medium', 'low'] as const) {
    await usePrefs(page, { graphicsTested: true, graphicsQuality: q, tutorialHints: false });
    await load(page, d, `nature ${q}`);
    counts[q] = await scenery(page);
    await page.screenshot({ path: `test-results/nature-quality-${q}.png` });
  }
  const low = (s: MapScenery) => ['groundcover', 'shrub', 'woodland_edge', 'rocky_edge', 'wet_edge'].reduce((n, r) => n + (s.byRole[r] ?? 0), 0);
  expect(low(counts['high']!)).toBeGreaterThan(0);
  expect(low(counts['medium']!)).toBe(0);
  expect(low(counts['low']!)).toBe(0);
  expect(counts['medium']!.byKind['mountain']).toBe(a.byKind['mountain']);
  expect(counts['low']!.byKind['mountain']).toBe(a.byKind['mountain']);
  expect(counts['low']!.items).toBeLessThan(counts['medium']!.items);
});

const ARCHETYPES = ['open_field', 'grove', 'ridge_pass', 'plateau', 'beacon_clearing', 'coast_road'] as const;

test('battlefields: the obstacles stand on the same cells in the map’s climate; columns and standing stones keep their art', async ({ page }) => {
  test.setTimeout(1_800_000);
  const errors = errorsOf(page);
  const runs: [string, string][] = [];
  for (const climate of ['desert', 'tundra', 'jungle']) for (const a of ARCHETYPES) runs.push([climate, a]);
  const rest = CLIMATES.filter((c) => !['desert', 'tundra', 'jungle'].includes(c));
  rest.forEach((c, i) => runs.push([c, ARCHETYPES[i % ARCHETYPES.length]!]));
  for (const [climate, archetype] of runs) {
    const d = goldBattleDriver('skirmish_twin_harbors', `nature-battle-${climate}-${archetype}`, [['hoplite', 20]]);
    (d.state.world.map as { biome: string }).biome = climate;
    (d.state.battle as { archetype: string }).archetype = archetype;
    const cells = d.state.battle!.obstacles.map((c) => `${c.col},${c.row}`).sort();
    await load(page, d, `nature battle ${climate} ${archetype}`, 'battle');
    let obs: Obstacle[] | null = null;
    for (let i = 0; i < 60 && !(obs && obs.length === cells.length); i++) {
      await page.waitForTimeout(250);
      obs = await page.evaluate(() => (globalThis as unknown as { __prScenery: () => { battle: Obstacle[] | null } }).__prScenery().battle);
    }
    expect(obs!.map((o) => `${o.col},${o.row}`).sort(), `${climate} ${archetype}: obstacle cells`).toEqual(cells);
    for (const o of obs!) {
      if (o.source === 'nature') expect(climateOf(o.id), o.id).toBe(climate);
      else expect(['column', 'stone_circle'], `${climate} ${archetype}: ${o.id}`).toContain(o.id);
    }
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `test-results/nature-battle-${climate}-${archetype}.png` });
  }
  expect(errors.filter((e) => !/favicon/i.test(e))).toEqual([]);
});
