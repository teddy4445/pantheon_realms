import { expect, test, type Page } from '@playwright/test';
import { GameDriver } from '@pr/testing';
import { waitFor } from './helpers';
import { approachTile, importAndLoad, writeSave } from './fixtures';

/**
 * Ground and sky art (Brief 2, delivery 2026-10-02) in the production build:
 * the map's climate picks its six terrain textures, its water for the sea and
 * its sky past the north edge; a battle shows its battlefield painting; panning
 * never changes the zoom. Every texture is served from the game's own runtime
 * folder. Screenshots are kept for review.
 */

type Pose = { x: number; y: number; zoom: number };
const camera = (page: Page): Promise<Pose> => page.evaluate(() => (globalThis as unknown as { __prCamera: () => Pose }).__prCamera());

function served(page: Page): Map<string, number> {
  const seen = new Map<string, number>();
  page.on('response', (r) => {
    const u = new URL(r.url());
    if (u.pathname.includes('/art/')) seen.set(u.pathname.slice(u.pathname.indexOf('/art/') + 1), r.status());
  });
  return seen;
}

async function settle(page: Page, seen: Map<string, number>, files: string[]): Promise<void> {
  for (let i = 0; i < 80 && !files.every((f) => seen.has(f)); i++) await page.waitForTimeout(250);
  for (const f of files) expect(seen.get(f), f).toBe(200);
}

for (const climate of ['temperate', 'tundra'] as const) {
  test(`the ${climate} climate paints the map, the sea and the sky; panning keeps the zoom`, async ({ page }) => {
    const seen = served(page);
    const d = GameDriver.mission('skirmish_twin_harbors', { matchId: `e2e-ground-${climate}` });
    for (const fog of Object.values(d.state.fog)) fog.explored = fog.explored.map(() => 1);
    // Presentation-only override: the same map drawn in another climate.
    (d.state.world.map as { biome: string }).biome = climate;
    const file = writeSave(d, `ground-${climate}`);
    await page.goto('/?e2e', { waitUntil: 'networkidle' });
    const before = await camera(page).catch(() => null);
    await importAndLoad(page, file);
    await waitFor(page, (s) => s.screen === 'adventure', 'adventure', 20_000, true);
    const grounds = [...new Set(d.state.world.map.terrain)].length;
    expect(grounds).toBeGreaterThan(2);
    await settle(page, seen, [`art/terrain/terrain.${climate}.plains.webp`, `art/terrain/terrain.${climate}.forest.webp`, `art/terrain/terrain.${climate}.water.webp`, `art/sky/sky.${climate}.webp`]);
    // Only this climate's terrain is fetched.
    expect([...seen.keys()].filter((k) => k.startsWith('art/terrain/') && !k.includes(`.${climate}.`))).toEqual([]);
    void before;
    const pose = await camera(page);
    // Toward the north edge, where the sky panorama stands.
    for (let i = 0; i < 30; i++) await page.keyboard.press('ArrowUp');
    await page.waitForTimeout(600);
    const after = await camera(page);
    expect(after.zoom).toBe(pose.zoom);
    expect(after.y).toBeLessThan(pose.y);
    await page.screenshot({ path: `test-results/ground-${climate}.png` });
  });
}

test('a battle shows its battlefield painting under the board', async ({ page }) => {
  const seen = served(page);
  const d = GameDriver.mission('skirmish_twin_harbors', { matchId: 'e2e-ground-battle' });
  for (const fog of Object.values(d.state.fog)) fog.explored = fog.explored.map(() => 1);
  const gold = d.catalog.missions['skirmish_twin_harbors']!.sites.find((x) => x.id === 'sk_gold')!.coord;
  const h = d.state.heroes['alexios']!;
  h.position = approachTile(d, gold, 'alexios');
  h.movementPoints = 3000;
  d.do({ kind: 'MoveHero', heroId: 'alexios', destination: gold, confirmEncounter: true });
  expect(d.state.battle).toBeTruthy();
  const field = d.state.battle!.archetype;
  const file = writeSave(d, 'ground-battle');
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await importAndLoad(page, file);
  await waitFor(page, (s) => s.screen === 'battle', 'battle', 20_000, true);
  await settle(page, seen, [`art/battle/battlefield.${field}.ground.webp`]);
  await page.waitForTimeout(800);
  await page.screenshot({ path: `test-results/ground-battle-${field}.png` });
});
