import { mkdirSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { GameDriver } from '@pr/testing';
import { authoredWorldMap, createGeneratedMatch } from '@pr/campaign';
import { cellIndex, type HexCoord, type MissionDefinition, type SiteDefinition } from '@pr/rules';
import { clickHex, inspect, waitFor } from './helpers';
import { approachTile, importAndLoad, writeSave } from './fixtures';

/**
 * Campaign content v2 on the adventure map (2026-10-15): the kit's site pictures
 * (ferry landings, supply depots, neutral hiring sites, the sluice open and
 * closed), the sluice dialog and OperateSluice redrawing the channel's ground,
 * the ferry's locked reason, the site descriptions and the campaign quest-marker
 * icons — through the real screens, from ordinary save fixtures imported with
 * Load → Import (no privileged hooks; the ?e2e readouts are read-only).
 * Screenshots at 1280×720 and 1366×768 go to /home/claude/capture/v2-sites/.
 */

const OUT = process.env.V2_SITES_OUT ?? '/home/claude/capture/v2-sites';
mkdirSync(OUT, { recursive: true });
const SIZES = [
  { width: 1280, height: 720 },
  { width: 1366, height: 768 },
] as const;
// The dev server and the emulated GPU are slow: each test loads the game afresh and captures two sizes.
test.describe.configure({ timeout: 480_000 });

interface SiteDebug {
  id: string;
  sprite: string | null;
  shown: boolean;
  quest: string | null;
}
const drawnSites = (page: Page): Promise<SiteDebug[]> => page.evaluate(() => ((globalThis as unknown as { __prScenery: () => { map: { sites: SiteDebug[] } | null } }).__prScenery().map?.sites ?? []));
const drawnSite = async (page: Page, id: string): Promise<SiteDebug | undefined> => (await drawnSites(page)).find((s) => s.id === id);
const ground = (page: Page): Promise<{ terrain: string; groundChanges: number; cache: unknown }> => page.evaluate(() => (globalThis as unknown as { __prGround: () => { terrain: string; groundChanges: number; cache: unknown } }).__prGround());

function revealAll(d: GameDriver): void {
  for (const fog of Object.values(d.state.fog)) fog.explored = fog.explored.map(() => 1);
}

/** Stand the player's hero one step from `c` (a walkable neighbour), with full movement. */
function besides(d: GameDriver, c: HexCoord): void {
  const h = d.hero();
  h.position = approachTile(d, c, h.id);
  h.movementPoints = 3000;
}

async function load(page: Page, file: string): Promise<void> {
  await page.setViewportSize(SIZES[0]);
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await importAndLoad(page, file);
  await waitFor(page, (s) => s.screen === 'adventure' && s.overlays.length === 0, 'adventure map');
}

/** Point at a hex (hover only): the map's tile panel describes what is there. */
async function hoverHex(page: Page, c: HexCoord): Promise<void> {
  const p = await page.evaluate(([q, r]) => (globalThis as unknown as { __prProject: (k: string, a: number, b: number) => { x: number; y: number } | null }).__prProject('adventure', q!, r!), [c.q, c.r]);
  if (!p) throw new Error(`hex ${c.q},${c.r} is off screen`);
  await page.mouse.move(p.x, p.y);
  await page.waitForTimeout(250);
}

/** Wait until the pictures in view are drawn (textures arrive between frames), then capture both sizes. */
async function shoot(page: Page, name: string, before?: () => Promise<void>): Promise<void> {
  for (const size of SIZES) {
    await page.setViewportSize(size);
    await page.waitForTimeout(900);
    if (before) await before();
    await page.screenshot({ path: `${OUT}/${name}-${size.width}x${size.height}.png` });
  }
}

const missionSites = (d: GameDriver, missionId: string): readonly SiteDefinition[] => d.catalog.missions[missionId]!.sites;

test('a ferry landing draws the ferry picture and describes the crossing; evidence sites carry the evidence marker', async ({ page }) => {
  const d = GameDriver.mission('silent_oracle_v2_m03', { matchId: 'e2e-v2-ferry' });
  revealAll(d);
  const sites = missionSites(d, 'silent_oracle_v2_m03');
  const landing = sites.find((s) => s.id === 'so3_north_landing')!;
  besides(d, landing.coord);
  await load(page, writeSave(d, 'v2-ferry'));
  await expect.poll(async () => (await drawnSite(page, 'so3_north_landing'))?.sprite).toBe('map.site.ferry');
  // Evidence objectives open at the start: their sites show the evidence icon over the picture.
  await expect.poll(async () => (await drawnSite(page, 'so3_hall'))?.quest).toBe('campaignv2.icon.evidence');
  expect((await drawnSite(page, 'so3_east_wing'))?.quest).toBe('campaignv2.icon.evidence');
  // A locked objective has no marker yet (the desk's choice opens later).
  expect((await drawnSite(page, 'so3_desk'))?.quest ?? null).toBeNull();
  await hoverHex(page, landing.coord);
  await expect(page.getByTestId('site-state')).toHaveText('Running');
  await expect(page.getByTestId('site-action')).toContainText('cross to');
  await expect(page.locator('.tile-info__title')).toHaveText(landing.name);
  await expect(page.locator('.tile-info')).toContainText('Ferry landing');
  // No debug coordinates in the description.
  await expect(page.locator('.tile-info')).not.toContainText(`${landing.coord.q},${landing.coord.r}`);
  await shoot(page, 'ferry-landing-and-evidence-markers', () => hoverHex(page, landing.coord));
  // The objectives panel shows the evidence icon with an accessible name.
  await expect(page.getByTestId('objective-marker-so3_records').getByRole('img', { name: 'Evidence objective' })).toBeVisible();
});

// The notice lasts a few seconds: each size walks onto the landing once (a fresh game each) and is captured as it shows.
for (const size of SIZES) {
  test(`a ferry that does not run keeps the hero at the landing and says why (${size.width}×${size.height})`, async ({ page }) => {
    const d = GameDriver.mission('silent_oracle_v2_m03', { matchId: 'e2e-v2-ferry-locked' });
    revealAll(d);
    const quay = missionSites(d, 'silent_oracle_v2_m03').find((s) => s.id === 'so3_chain_quay')!;
    const reason = (quay.kind as { lockedReason: string }).lockedReason;
    besides(d, quay.coord);
    await load(page, writeSave(d, 'v2-ferry-locked'));
    await page.setViewportSize(size);
    await expect.poll(async () => (await drawnSite(page, quay.id))?.sprite).toBe('map.site.ferry');
    await hoverHex(page, quay.coord);
    await expect(page.getByTestId('site-state')).toHaveText(reason);
    // Plan the step onto the landing, then take it with Continue journey (the first-route tip read and closed).
    await clickHex(page, quay.coord.q, quay.coord.r);
    const tip = page.getByRole('button', { name: 'Got it' });
    if (await tip.isVisible().catch(() => false)) await tip.click();
    await page.getByTestId('journey-continue').click();
    await expect(page.locator('.toast', { hasText: reason }).first()).toBeVisible();
    await page.screenshot({ path: `${OUT}/ferry-locked-notice-${size.width}x${size.height}.png` });
    // The hero stays at the landing (no crossing while the chain is up).
    const s = await waitFor(page, (x) => !x.busy, 'walk finished');
    expect(s.state.heroes.alexios.position).toEqual(quay.coord);
    // An ordinary command copies the state (a new map object, the same ground): the ground is not drawn again.
    expect((await ground(page)).groundChanges).toBe(0);
  });
}

test('a supply depot and the evacuation, supply and pact markers', async ({ page }) => {
  const d = GameDriver.mission('silent_oracle_v2_m01', { matchId: 'e2e-v2-depot' });
  revealAll(d);
  const sites = missionSites(d, 'silent_oracle_v2_m01');
  const depot = sites.find((s) => s.id === 'so1_olive_stores')!;
  besides(d, sites.find((s) => s.id === 'so1_north_shelter')!.coord);
  await load(page, writeSave(d, 'v2-depot'));
  await expect.poll(async () => (await drawnSite(page, depot.id))?.sprite).toBe('map.site.supply_depot');
  expect((await drawnSite(page, depot.id))?.quest).toBe('campaignv2.icon.supply');
  expect((await drawnSite(page, 'so1_north_shelter'))?.quest).toBe('campaignv2.icon.evacuation');
  expect((await drawnSite(page, 'so1_market'))?.quest).toBe('campaignv2.icon.pact');
  // An evidence site without an open objective carries no marker.
  expect((await drawnSite(page, 'so1_stall'))?.quest ?? null).toBeNull();
  await hoverHex(page, depot.coord);
  await expect(page.locator('.tile-info')).toContainText('Supply depot');
  await expect(page.getByTestId('site-state')).toHaveText('Not taken yet');
  await expect(page.getByTestId('tile-quest-marker').getByRole('img', { name: 'Supplies objective' })).toBeVisible();
  await shoot(page, 'supply-depot-and-quest-markers', () => hoverHex(page, depot.coord));
  await expect(page.getByTestId('objective-marker-so1_shelter_north').getByRole('img', { name: 'Evacuation objective' })).toBeVisible();
});

test('a neutral hiring site shows its picture, this week’s stock and its pact lock', async ({ page }) => {
  const d = GameDriver.mission('silent_oracle_v2_m02', { matchId: 'e2e-v2-hiring' });
  revealAll(d);
  const meadow = missionSites(d, 'silent_oracle_v2_m02').find((s) => s.id === 'so2_pegasus')!;
  const k = meadow.kind as { weeklyGrowth: number; lockedReason: string };
  besides(d, meadow.coord);
  await load(page, writeSave(d, 'v2-hiring'));
  await expect.poll(async () => (await drawnSite(page, meadow.id))?.sprite).toBe('map.site.neutral_dwelling.pegasus');
  expect((await drawnSite(page, meadow.id))?.quest ?? null).toBeNull();
  await hoverHex(page, meadow.coord);
  await expect(page.locator('.tile-info')).toContainText('Hiring site');
  await expect(page.getByTestId('site-state')).toContainText(`${k.weeklyGrowth} ${d.catalog.creatures['pegasus']!.pluralName} this week`);
  await expect(page.getByTestId('site-action')).toHaveText(`Not hiring yet: ${k.lockedReason}`);
  await shoot(page, 'neutral-hiring-site', () => hoverHex(page, meadow.coord));
});

/** The Three Beacons' first v2 chapter with a test sluice on the bay's east shore (closed: the bay's lower half is water; open: salt marsh). */
function sluiceDriver(): { d: GameDriver; sluice: SiteDefinition; channel: HexCoord[] } {
  const catalog = GameDriver.mission('three_beacons_v2_m01').catalog;
  const m = catalog.missions['three_beacons_v2_m01']!;
  // The bay's lower half, beside the causeway: rows 11 and 12 of the authored map.
  const channel = [...[12, 13, 14, 15, 16, 17, 18].map((q) => ({ q, r: 11 })), ...[11, 12, 13, 14, 15, 16, 17].map((q) => ({ q, r: 12 }))];
  const sluice: SiteDefinition = {
    id: 'e2e_bay_sluice',
    anchorId: 'e2e_bay_sluice',
    coord: { q: 19, r: 11 },
    name: 'Bay Sluice',
    description: 'An old tide sluice on the east shore of the bay, above the causeway.',
    kind: {
      type: 'sluice',
      channel,
      openTerrain: 'marsh',
      closedTerrain: 'water',
      startsOpen: false,
      openText: 'The lower bay drains to salt marsh: heroes can wade across it beside the causeway.',
      closeText: 'The lower bay floods again: its marsh becomes open water.',
      openFlag: 'e2e_bay_drained',
    },
    art: 'sluice',
  };
  const mission: MissionDefinition = { ...m, id: 'e2e_sluice_bay', sites: [...m.sites, sluice] };
  const { match } = createGeneratedMatch(catalog, { mission, map: authoredWorldMap(m.map!), decor: [] }, { matchId: 'e2e-v2-sluice', startingGodId: 'zeus', carryover: null });
  const d = new GameDriver(match, catalog);
  revealAll(d);
  d.hero().position = { ...sluice.coord };
  return { d, sluice, channel };
}

test('the sluice: its dialog, OperateSluice, the channel’s ground redrawn and the picture switched', async ({ page }) => {
  const { d, sluice, channel } = sluiceDriver();
  const map = d.state.world.map;
  const cells = channel.map((c) => cellIndex(map, c));
  expect(cells.every((i) => map.terrain[i] === 'w')).toBe(true);
  await load(page, writeSave(d, 'v2-sluice'));
  await expect.poll(async () => (await drawnSite(page, sluice.id))?.sprite).toBe('map.site.sluice.closed');
  const g0 = await ground(page);
  expect(cells.every((i) => g0.terrain[i] === 'w')).toBe(true);
  const camera0 = await page.evaluate(() => (globalThis as unknown as { __prCamera: () => unknown }).__prCamera());
  // The hero stands on the sluice: the map offers it.
  await expect(page.getByTestId('sluice-bar')).toContainText('Bay Sluice');
  await shoot(page, 'sluice-closed-before');
  // Clicking the sluice the hero stands on opens the dialog: name, picture, state, exactly what changes.
  await clickHex(page, sluice.coord.q, sluice.coord.r);
  await waitFor(page, (s) => s.overlays.includes('sluice'), 'sluice dialog');
  const dialog = page.getByTestId('sluice');
  await expect(dialog.getByRole('heading', { name: 'Bay Sluice' })).toBeVisible();
  await expect(dialog.getByTestId('sluice-picture')).toHaveAttribute('data-sprite', 'map.site.sluice.closed');
  await expect(dialog.getByTestId('sluice-state')).toContainText('Closed');
  await expect(dialog.getByTestId('sluice-change')).toHaveText((sluice.kind as { openText: string }).openText);
  const operate = dialog.getByTestId('sluice-operate');
  await expect(operate).toBeEnabled();
  // Keyboard: focus starts inside the dialog and Tab stays in it; Escape closes it and returns to the map.
  expect(await page.evaluate(() => !!document.activeElement?.closest('[data-testid="sluice"]'))).toBe(true);
  for (let i = 0; i < 4; i++) await page.keyboard.press('Tab');
  expect(await page.evaluate(() => !!document.activeElement?.closest('[data-testid="sluice"]'))).toBe(true);
  await shoot(page, 'sluice-dialog');
  await page.keyboard.press('Escape');
  await waitFor(page, (s) => !s.overlays.includes('sluice'), 'dialog closed');
  // Reopen from the offer and operate it with the keyboard.
  await page.getByTestId('sluice-offer').click();
  await waitFor(page, (s) => s.overlays.includes('sluice'), 'sluice dialog again');
  await page.getByTestId('sluice-operate').focus();
  await page.keyboard.press('Enter');
  const after = await waitFor(page, (s) => !s.overlays.includes('sluice') && s.state.world.sites[sluice.id]?.open === true, 'sluice opened');
  // The rules changed the channel's terrain; the view drew it without being rebuilt (same camera) and switched the picture.
  expect(cells.every((i) => after.state.world.map.terrain[i] === 's')).toBe(true);
  await expect.poll(async () => (await ground(page)).terrain).toBe(after.state.world.map.terrain);
  expect((await ground(page)).groundChanges).toBe(g0.groundChanges + 1);
  await expect.poll(async () => (await drawnSite(page, sluice.id))?.sprite).toBe('map.site.sluice.open');
  expect(await page.evaluate(() => (globalThis as unknown as { __prCamera: () => unknown }).__prCamera())).toEqual(camera0);
  await expect(page.locator('.toast', { hasText: 'opened Bay Sluice' }).first()).toBeVisible();
  await hoverHex(page, sluice.coord);
  await expect(page.getByTestId('site-state')).toHaveText('Open');
  await shoot(page, 'sluice-open-after', () => hoverHex(page, sluice.coord));
  // The drained bay is walkable now: a journey onto a former water cell is quoted by the rules (then cancelled).
  const st = await inspect(page);
  expect(st.state.mission.flags['e2e_bay_drained']).toBe(true);
  const wade = channel[3]!;
  await clickHex(page, wade.q, wade.r);
  await expect(page.getByTestId('journey-bar')).not.toHaveAttribute('data-status', 'blocked');
  await page.getByTestId('journey-cancel').click();
  await expect(page.getByTestId('sluice-bar')).toBeVisible();
  // And back: closing floods it again (water), with the closed picture.
  await page.getByTestId('sluice-offer').click();
  await waitFor(page, (s) => s.overlays.includes('sluice'), 'sluice dialog to close');
  await expect(page.getByTestId('sluice-change')).toHaveText((sluice.kind as { closeText: string }).closeText);
  await page.getByTestId('sluice-operate').click();
  const closed = await waitFor(page, (s) => s.state.world.sites[sluice.id]?.open === false, 'sluice closed');
  expect(cells.every((i) => closed.state.world.map.terrain[i] === 'w')).toBe(true);
  await expect.poll(async () => (await ground(page)).terrain).toBe(closed.state.world.map.terrain);
  await expect.poll(async () => (await drawnSite(page, sluice.id))?.sprite).toBe('map.site.sluice.closed');
  await shoot(page, 'sluice-closed-again');
});

test('the sluice refuses to strand a hero in the channel and says why', async ({ page }) => {
  const { d, sluice, channel } = sluiceDriver();
  // Opened before the save; a rival band waits on the drained bay.
  d.do({ kind: 'OperateSluice', heroId: 'alexios', siteId: sluice.id });
  const rival = Object.values(d.state.heroes).find((h) => h.ownerId !== 'player' && h.status === 'active')!;
  rival.position = { ...channel[2]! };
  await load(page, writeSave(d, 'v2-sluice-refused'));
  await page.getByTestId('sluice-offer').click();
  await waitFor(page, (s) => s.overlays.includes('sluice'), 'sluice dialog');
  await expect(page.getByTestId('sluice-reason')).toContainText('stands in the channel');
  await expect(page.getByTestId('sluice-operate')).toBeDisabled();
  await shoot(page, 'sluice-dialog-refused');
});
