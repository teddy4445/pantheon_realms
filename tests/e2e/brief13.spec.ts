import { expect, test, type Page } from '@playwright/test';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { GameDriver } from '@pr/testing';
import { inspect, waitFor } from './helpers';
import { approachTile, importAndLoad, slots, writeSave } from './fixtures';
import { goldBattleDriver, leaderOf, toHumanBattleTurn } from './momentFixtures';

/**
 * Brief 13 icons (owner delivery 2026-10-05, Parts B–E: 94 interface icons,
 * map markers, effect and status icons and divine interventions) through the
 * real screens: wherever one of them is shown, the game draws the delivered
 * final file, never the concept-pack crop it replaced. Screens visited: main
 * menu, New Game, the adventure map (resource bar, hero and town tabs, the
 * tile panel over own, hostile and neutral towns, mines and a cache), the
 * hero screen, a town building's costs, the Pantheon screen, the map
 * interventions, the Journal, the Encyclopedia and a battle with its action
 * bar and intervention menu. Screenshots and the list of icons seen are kept
 * for review (test-results/b13-*).
 */

const OUT = 'test-results';
const FINAL = JSON.parse(readFileSync('assets-runtime/ui/final-manifest.json', 'utf8')) as { assets: Record<string, { file: string; provenance: string }> };
const UI = JSON.parse(readFileSync('assets-runtime/ui/manifest.json', 'utf8')) as { assets: Record<string, { file: string }> };
const DELIVERED = Object.entries(FINAL.assets).filter(([, a]) => /Brief 13/.test(a.provenance)).map(([id]) => id);
/** The concept-pack crop each delivered icon replaced (none for the interventions). */
const REPLACED = new Map(DELIVERED.filter((id) => UI.assets[id]).map((id) => [UI.assets[id]!.file, id]));
const FINAL_FILE = new Map(DELIVERED.map((id) => [FINAL.assets[id]!.file, id]));

const seen = new Set<string>();

function errorsOf(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  return errors;
}

/** Every icon URL on screen: <img src>, SVG <image href> (the Icon component) and inline style URLs. */
async function iconUrls(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const out: string[] = [];
    document.querySelectorAll('img').forEach((e) => out.push(e.getAttribute('src') ?? ''));
    document.querySelectorAll('image').forEach((e) => out.push(e.getAttribute('href') ?? e.getAttribute('xlink:href') ?? ''));
    document.querySelectorAll('[style*="ui/icons/"]').forEach((e) => {
      for (const m of (e.getAttribute('style') ?? '').matchAll(/url\(["']?([^"')]+)/g)) out.push(m[1]!);
    });
    return out.filter((u) => u.includes('ui/icons/'));
  });
}

/** No replaced crop on screen; record the delivered icons that are; every icon image decoded. */
async function check(page: Page, label: string): Promise<void> {
  await expect
    .poll(
      () =>
        page.evaluate(() =>
          [...document.querySelectorAll('img')].filter((e) => (e.getAttribute('src') ?? '').includes('ui/icons/')).every((e) => e.complete && e.naturalWidth > 0),
        ),
      { timeout: 15_000 },
    )
    .toBe(true);
  const urls = await iconUrls(page);
  const stale = urls.filter((u) => [...REPLACED.keys()].some((f) => u.endsWith(f)));
  expect(stale, `${label}: concept crops still shown`).toEqual([]);
  for (const u of urls) for (const [f, id] of FINAL_FILE) if (u.endsWith(f)) seen.add(id);
  await page.waitForTimeout(250);
  await page.screenshot({ path: `${OUT}/b13-${label}.png` });
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
  await waitFor(page, (s) => s.screen === 'adventure' && !s.busy && s.overlays.length === 0, 'adventure map');
}

async function hoverHex(page: Page, q: number, r: number) {
  const project = () =>
    page.evaluate(([a, b]) => (globalThis as unknown as { __prProject: (k: string, a: number, b: number) => { x: number; y: number } | null }).__prProject('adventure', a!, b!), [q, r]);
  // Wait until the camera has settled on the hero: the same screen point twice in a row.
  let p: { x: number; y: number } | null = null;
  for (let i = 0; i < 60; i++) {
    const a = await project();
    await page.waitForTimeout(150);
    const b = await project();
    if (a && b && Math.abs(a.x - b.x) < 0.5 && Math.abs(a.y - b.y) < 0.5) {
      p = b;
      break;
    }
  }
  expect(p, `hex ${q},${r} on screen`).not.toBeNull();
  await page.mouse.move(5, 300);
  await page.mouse.move(p!.x, p!.y, { steps: 8 });
}

async function back(page: Page) {
  await page.keyboard.press('Escape');
  await waitFor(page, (s) => s.screen === 'adventure' && s.overlays.length === 0, 'back on the map');
}

test.describe.configure({ mode: 'serial' });

test('the delivery: 94 registrations, each a transparent PNG at its size', () => {
  expect(DELIVERED).toHaveLength(94);
  for (const id of DELIVERED) {
    const data = readFileSync(`assets-runtime/${FINAL.assets[id]!.file}`);
    expect(data.subarray(1, 4).toString('latin1'), id).toBe('PNG');
    expect(data[25], `${id} has alpha`).toBe(6);
    expect(data.readUInt32BE(16), id).toBe(id.startsWith('icon.menu.') ? 192 : 96);
  }
});

test('main menu and New Game show the delivered menu icons', async ({ page }) => {
  test.setTimeout(120_000);
  const errors = errorsOf(page);
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await expect(page.getByRole('button', { name: /new game/i }).first()).toBeVisible();
  await check(page, 'menu');
  await page.getByRole('button', { name: /new game/i }).first().click();
  await expect(page.getByTestId('mode-campaign')).toBeVisible();
  await check(page, 'new-game');
  expect(errors.filter((e) => !/favicon/i.test(e))).toEqual([]);
});

test('adventure map, tile panel markers, hero, town, Pantheon, interventions, Journal and Encyclopedia', async ({ page }) => {
  test.setTimeout(600_000);
  const errors = errorsOf(page);
  const base = () => {
    const d = GameDriver.mission('skirmish_twin_harbors', { matchId: 'e2e-b13' });
    for (const fog of Object.values(d.state.fog)) fog.explored = fog.explored.map(() => 1);
    d.player.wallet.favor = 40;
    leaderOf(d).army.slots = slots([['hoplite', 20], ['peltast', 12]]);
    return d;
  };
  const sites = GameDriver.mission('skirmish_twin_harbors').catalog.missions['skirmish_twin_harbors']!.sites;
  const at = (id: string) => sites.find((s) => s.id === id)!.coord;

  // Own town (the leader starts next to it): bars, tabs, tile panel.
  let d = base();
  await load(page, writeSave(d, 'b13 map'));
  await hoverHex(page, d.state.towns['westharbor']!.coord.q, d.state.towns['westharbor']!.coord.r);
  // The tile panel can also show an objective's quest marker (campaign v2, 2026-10-15): look for the site's own marker.
  await expect(page.locator('.adv-tile img.marker-icon[src$="icon.marker.town.png"]')).toBeVisible();
  await check(page, 'map-own-town');

  // Hostile and neutral town, the mines, the gold mine, a cache, a claimed cache.
  const visits: [string, string, (d: GameDriver) => void][] = [
    ['sk_town_e', 'hostile-town', () => {}],
    ['sk_town_e', 'neutral-town', (x) => {
      x.state.towns['eastharbor']!.ownerId = null;
      x.state.world.sites['sk_town_e']!.owner = null;
    }],
    ['sk_sawmill_w', 'sawmill', () => {}],
    ['sk_quarry_w', 'quarry', () => {}],
    ['sk_crystal_w', 'crystal', () => {}],
    ['sk_gold', 'mine', () => {}],
    ['sk_cache_w', 'chest', () => {}],
    ['sk_cache_e', 'check', (x) => {
      x.state.world.sites['sk_cache_e']!.claimed = true;
    }],
  ];
  for (const [site, marker, tweak] of visits) {
    d = base();
    tweak(d);
    const h = leaderOf(d);
    h.position = approachTile(d, at(site), h.id);
    await load(page, writeSave(d, `b13 ${marker}`));
    await hoverHex(page, at(site).q, at(site).r);
    await expect(page.locator(`.adv-tile img.marker-icon[src$="icon.marker.${marker}.png"]`), marker).toBeVisible();
    await check(page, `marker-${marker}`);
  }

  // Screens reached from the map.
  d = base();
  await load(page, writeSave(d, 'b13 screens'));
  await page.getByTitle('Hero (H)').click();
  await waitFor(page, (s) => s.screen === 'hero', 'hero screen');
  await check(page, 'hero');
  await back(page);

  await page.getByTestId('town-tab-westharbor').click();
  await waitFor(page, (s) => s.screen === 'town', 'town screen');
  await check(page, 'town');
  await page.getByTestId('slot-pantheon_temple').click();
  await expect(page.getByTestId('building-popup')).toBeVisible();
  await check(page, 'town-building-costs');
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');
  await waitFor(page, (s) => s.screen === 'adventure' && s.overlays.length === 0, 'back on the map');

  await page.getByTitle('Pantheon (P)').click();
  await waitFor(page, (s) => s.screen === 'pantheon', 'pantheon screen');
  await check(page, 'pantheon');
  await back(page);

  await page.getByTestId('open-interventions').click();
  await expect(page.locator('[data-testid^="invoke-"]').first()).toBeVisible();
  await check(page, 'map-interventions');
  await page.keyboard.press('Escape');
  await waitFor(page, (s) => s.screen === 'adventure' && s.overlays.length === 0, 'dialog closed');

  await page.getByTitle('Journal (J)').click();
  await waitFor(page, (s) => s.screen === 'journal', 'journal');
  await check(page, 'journal');
  await back(page);

  await page.getByTitle('Encyclopedia (B)').click();
  await waitFor(page, (s) => s.screen === 'encyclopedia', 'encyclopedia');
  await check(page, 'encyclopedia');

  expect((await inspect(page)).screen).toBe('encyclopedia');
  expect(errors.filter((e) => !/favicon/i.test(e))).toEqual([]);
});

test('battle: action bar, stats and the divine intervention menu', async ({ page }) => {
  test.setTimeout(180_000);
  const errors = errorsOf(page);
  const d = goldBattleDriver('skirmish_twin_harbors', 'b13-battle', [['hoplite', 30], ['peltast', 20]], 40);
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await importAndLoad(page, writeSave(d, 'b13 battle'));
  await toHumanBattleTurn(page);
  await check(page, 'battle');
  await page.getByTestId('battle-miracles').click();
  await expect(page.locator('[data-testid^="battle-miracle-"]').first()).toBeVisible();
  await check(page, 'battle-interventions');
  expect(errors.filter((e) => !/favicon/i.test(e))).toEqual([]);
});

test.afterAll(() => {
  mkdirSync(OUT, { recursive: true });
  const shown = DELIVERED.filter((id) => seen.has(id)).sort();
  const notShown = DELIVERED.filter((id) => !seen.has(id)).sort();
  writeFileSync(`${OUT}/b13-coverage.json`, JSON.stringify({ shown, notShown }, null, 2));
});
