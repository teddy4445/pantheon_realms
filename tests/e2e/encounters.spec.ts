import { expect, test, type Page } from '@playwright/test';
import { GameDriver } from '@pr/testing';
import { createGeneratedMatch, createRandomSkirmish, type SkirmishGenOptions } from '@pr/campaign';
import { axialNeighbors, hexEquals, quoteMovement, type HeroState, type SiteDefinition } from '@pr/rules';
import { clickHex, inspect, waitFor } from './helpers';
import { approachTile, importAndLoad, writeSave } from './fixtures';

/**
 * The 1.1.0 encounter scenes through the real screens: the hero meeting (camp
 * painting, each hero's own bust or portrait, every slot, one command per
 * gesture), the garrison exchange, the scenario-introduction scroll (Begin only
 * closes it) and the reward receipts (read from the committed result, shown
 * once, never granted twice). Screenshots are kept for review.
 */

function errorsOf(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  return errors;
}

const leaderOf = (d: GameDriver): HeroState => Object.values(d.state.heroes).find((h) => h.ownerId === 'player' && h.status === 'active' && !h.monster)!;
const stacks = (h: { army: { slots: ({ count: number; creatureId: string } | null)[] } }) => h.army.slots.filter(Boolean) as { count: number; creatureId: string }[];

/** Let the dialogs' short entrance transitions finish before a screenshot (software rendering is slow). */
async function settle(page: Page) {
  await page.evaluate(() => Promise.all(document.getAnimations().filter((a) => a.effect && 'target' in a.effect).map((a) => a.finished.catch(() => undefined))));
}

async function load(page: Page, file: string) {
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await importAndLoad(page, file);
  await waitFor(page, (s) => s.screen === 'adventure' && s.overlays.length === 0, 'adventure');
}

test('hero meeting: the camp of the acting hero, each hero as themselves, every slot; one click sends one transfer', async ({ page }) => {
  test.setTimeout(150_000);
  const errors = errorsOf(page);
  const d = GameDriver.mission('skirmish_twin_harbors', { matchId: 'e2e-meeting' });
  const leader = leaderOf(d);
  const town = Object.values(d.state.towns).find((t) => t.ownerId === 'player')!;
  // The leader steps off the town's visitor tile onto open ground next to it; a second hero is hired from the
  // tavern (whichever the town offers) and appears on the visitor tile — right next to the leader.
  const free = axialNeighbors(town.coord).find((c) => {
    const keep = d.state.heroes[leader.id]!.position;
    d.state.heroes[leader.id]!.position = town.coord;
    const q = quoteMovement(d.catalog, d.state, leader.id, c);
    d.state.heroes[leader.id]!.position = keep;
    return q.reachable && q.path.length === 1 && !Object.values(d.state.heroes).some((h) => hexEquals(h.position, c));
  })!;
  expect(free, 'open ground next to the town').toBeTruthy();
  d.state.heroes[leader.id]!.position = free;
  let second: HeroState | undefined;
  for (const def of Object.values(d.catalog.heroes)) {
    if (Object.values(d.state.heroes).some((h) => h.definitionId === def.id)) continue;
    try {
      d.do({ kind: 'HireHero', townId: town.id, heroDefinitionId: def.id });
    } catch {
      continue;
    }
    second = Object.values(d.state.heroes).find((h) => h.definitionId === def.id);
    if (second) break;
  }
  expect(second, 'a hireable hero').toBeTruthy();
  const file = writeSave(d, 'meeting');
  await load(page, file);
  // The hero screen offers the meeting with the hero standing next to this one.
  await page.keyboard.press('h');
  await waitFor(page, (s) => s.screen === 'hero', 'hero screen');
  const other = (await inspect(page)).state.heroes;
  const names = [other[leader.id].name, other[second!.id].name];
  const btn = page.getByRole('button', { name: new RegExp(`^Exchange with (${names.join('|')})$`) }).first();
  await btn.click();
  await waitFor(page, (s) => s.overlays.includes('transfer'), 'meeting');
  const meet = page.getByTestId('transfer');
  await expect(meet.locator('.meet')).toBeVisible();
  await expect(meet.locator('.meet__camp')).toBeVisible();
  await expect(meet.locator('.meet__camp')).toHaveAttribute('src', /encounters-v1\.1\.0\/meeting-[a-z]+\.png$/);
  await expect(meet.locator('.meet__title')).toHaveText('Exchange troops');
  // Every slot of both real armies is shown, empty ones too.
  const s0 = await inspect(page);
  const a = s0.state.heroes[leader.id];
  const b = s0.state.heroes[second!.id];
  await expect(meet.locator('[data-testid="transfer-l"] .slot, [data-testid="transfer-r"] .slot')).toHaveCount(a.army.slots.length + b.army.slots.length);
  // Each side shows that hero: the painted bust when there is one, else the same hero's portrait.
  await expect(meet.locator('.meet__bust, .meet__medallion')).toHaveCount(2);
  await settle(page);
  await page.screenshot({ path: 'test-results/encounter-meeting.png' });
  // Move the smallest stack of the side with more stacks into an empty slot of the other, with a double click.
  const [from, to, fromId, toId] = stacks(a).length >= stacks(b).length ? (['l', 'r', leader.id, second!.id] as const) : (['r', 'l', second!.id, leader.id] as const);
  const src = s0.state.heroes[fromId];
  const srcIdx = src.army.slots.findIndex((x: unknown) => !!x);
  const moved = src.army.slots[srcIdx] as { count: number; creatureId: string };
  const dstIdx = s0.state.heroes[toId].army.slots.findIndex((x: unknown) => !x);
  const totalOf = (h: HeroState, c: string) => stacks(h).filter((x) => x.creatureId === c).reduce((n, x) => n + x.count, 0);
  const destBefore = totalOf(s0.state.heroes[toId], moved.creatureId);
  await page.getByTestId(`transfer-${from}-slot-${srcIdx}`).click();
  await expect(meet.locator('.meet__army.is-source')).toHaveCount(1);
  await page.getByTestId(`transfer-${to}-slot-${dstIdx}`).dblclick();
  const s1 = await waitFor(page, (x) => totalOf(x.state.heroes[toId], moved.creatureId) !== destBefore, 'transfer committed');
  expect(totalOf(s1.state.heroes[toId], moved.creatureId)).toBe(destBefore + moved.count);
  // Cancel only clears a pending selection; Done closes the meeting.
  if ((await meet.getByTestId('transfer-cancel').count()) > 0) await meet.getByTestId('transfer-cancel').click();
  await meet.getByTestId('transfer-done').click();
  await waitFor(page, (x) => !x.overlays.includes('transfer'), 'meeting closed');
  const s2 = await inspect(page);
  expect(totalOf(s2.state.heroes[toId], moved.creatureId)).toBe(destBefore + moved.count);
  expect(errors.filter((e) => !/favicon/i.test(e))).toEqual([]);
});

test('garrison exchange: the town under its own painting and name, no invented second hero', async ({ page }) => {
  const errors = errorsOf(page);
  const d = GameDriver.mission('skirmish_twin_harbors', { matchId: 'e2e-garrison' });
  const leader = leaderOf(d);
  const town = Object.values(d.state.towns).find((t) => t.ownerId === 'player')!;
  d.state.heroes[leader.id]!.position = town.coord;
  const file = writeSave(d, 'garrison');
  await load(page, file);
  await page.keyboard.press('h');
  await waitFor(page, (s) => s.screen === 'hero', 'hero screen');
  await page.getByRole('button', { name: `Exchange with ${town.name}` }).click();
  const meet = page.getByTestId('transfer');
  await expect(meet.locator('.meet__kicker')).toContainText(town.name);
  // 1.1.4 (GUI audit D09): the town as built — its stage with each constructed building on its slot.
  await expect(meet.locator('.meet__town .town-thumb')).toHaveCount(1);
  expect(await meet.locator('.meet__town .town-thumb').evaluate((e) => getComputedStyle(e).backgroundImage)).toMatch(/town\.greek\.background\.l\d\.webp/);
  const built = Object.keys(town.buildings).filter((k) => (town.buildings[k] ?? 0) > 0).length;
  expect(await meet.locator('.meet__town .town-thumb__slot').count()).toBeGreaterThan(0);
  expect(await meet.locator('.meet__town .town-thumb__slot').count()).toBeLessThanOrEqual(built);
  await expect(meet.locator('.meet__bust, .meet__medallion')).toHaveCount(1);
  await expect(meet.locator('.meet__army').nth(1)).toContainText('Town garrison');
  await settle(page);
  await page.screenshot({ path: 'test-results/encounter-garrison.png' });
  await meet.getByTestId('transfer-done').click();
  expect(errors.filter((e) => !/favicon/i.test(e))).toEqual([]);
});

test('briefing scroll: every visible objective, real speakers, and Begin closes it without a new game', async ({ page }) => {
  const errors = errorsOf(page);
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await page.getByTestId('menu-new').click();
  await page.getByTestId('mode-campaign').click();
  await page.getByTestId('scenario-three_beacons').click();
  await page.getByTestId('setup-begin').click();
  const s0 = await waitFor(page, (s) => s.overlays.includes('briefing'), 'briefing', 30_000, true);
  const brief = page.getByTestId('briefing');
  await expect(brief.locator('.brief__paper')).toHaveAttribute('src', /encounters-v1\.1\.0\/intro-scroll\.png$/);
  // A new run plays the content-v2 chapters (2026-10-15): the introduction lists the open
  // required tasks (not every objective), the kicker names the chapter, battles are by hand.
  expect(s0.campaign.contentVersion).toBe(2);
  await expect(brief.getByTestId('briefing-tasks').locator('.brief__task').first()).toBeVisible();
  await expect(brief.locator('.brief__kicker')).toContainText('Chapter 1');
  await expect(brief.getByTestId('manual-battle-notice')).toBeVisible();
  await expect(brief.getByTestId('briefing-facts')).toBeVisible();
  await settle(page);
  await page.screenshot({ path: 'test-results/encounter-briefing.png' });
  await brief.getByTestId('briefing-begin').click();
  const s1 = await waitFor(page, (s) => !s.overlays.includes('briefing'), 'briefing closed', 30_000, true);
  // The same game: no new match, no command.
  expect(s1.state.matchId).toBe(s0.state.matchId);
  expect(s1.state.revision).toBe(s0.state.revision);
  expect(errors.filter((e) => !/favicon/i.test(e))).toEqual([]);
});

// --- Rewards (random-map sites) --------------------------------------------------------------

function genOpts(seed: number): SkirmishGenOptions {
  return { seed, size: 'small', seats: [{ pantheonId: 'greek', controller: 'human' }, { pantheonId: 'norse', controller: 'ai' }], victory: { type: 'elimination' }, monsters: 'none', revealMap: true };
}
function randomDriver(matchId: string, kinds: string[]): GameDriver {
  const catalog = GameDriver.mission('skirmish_twin_harbors').catalog;
  for (let seed = 1; seed < 80; seed++) {
    const g = createRandomSkirmish(catalog, genOpts(seed));
    const mine = g.mission.sites.filter((s) => s.id.endsWith('_1'));
    if (!kinds.every((k) => mine.some((s) => s.kind.type === k))) continue;
    return new GameDriver(createGeneratedMatch(catalog, g, { matchId, startingGodId: 'zeus' }).match, catalog);
  }
  throw new Error('no seed with the sites');
}
const siteOf = (d: GameDriver, type: string): SiteDefinition => d.state.customMission!.sites.find((s) => s.id.endsWith('_1') && s.kind.type === type)!;
function besides(d: GameDriver, target: SiteDefinition): HeroState {
  const h = leaderOf(d);
  h.position = approachTile(d, target.coord, h.id);
  h.movementPoints = 3000;
  return h;
}
async function walkTo(page: Page, c: { q: number; r: number }) {
  await clickHex(page, c.q, c.r);
  await clickHex(page, c.q, c.r);
}

test('a chest pays once: a passing reward tray from the committed gold, even on a double-clicked Confirm', async ({ page }) => {
  const errors = errorsOf(page);
  const d = randomDriver('e2e-reward-chest', ['treasure_chest']);
  const chest = siteOf(d, 'treasure_chest');
  besides(d, chest);
  const file = writeSave(d, 'reward-chest');
  await load(page, file);
  const gold = (await inspect(page)).state.players.player.wallet.gold;
  await walkTo(page, chest.coord);
  await waitFor(page, (s) => s.overlays.includes('chest'), 'chest dialog');
  // Choose the Gold, then confirm with a double click: the chest opens once.
  await page.getByTestId('chest-gold').click();
  await page.getByTestId('chest-confirm').dblclick();
  const k = chest.kind as { gold: number };
  await waitFor(page, (x) => x.state.players.player.wallet.gold === gold + k.gold, 'chest gold');
  const toast = page.getByTestId('reward-toast');
  await expect(toast).toBeVisible();
  await expect(toast).toContainText(`+${k.gold.toLocaleString('en-US')}`);
  await expect(toast).toContainText('Gold');
  // A small pickup does not stop play with a dialog.
  expect((await inspect(page)).overlays).toEqual([]);
  await page.screenshot({ path: 'test-results/encounter-reward-toast.png' });
  await page.waitForTimeout(800);
  expect((await inspect(page)).state.players.player.wallet.gold).toBe(gold + k.gold);
  expect(errors.filter((e) => !/favicon|already|empty/i.test(e))).toEqual([]);
});

test('a quest hut shows its receipt once: the tray of committed rewards; Continue only closes it; a reload shows none', async ({ page }) => {
  test.setTimeout(120_000);
  const errors = errorsOf(page);
  const d = randomDriver('e2e-reward-hut', ['quest_hut']);
  const hut = siteOf(d, 'quest_hut');
  const quest = (hut.kind as { quest: { type: string; resources?: Record<string, number>; siteId?: string } }).quest;
  if (quest.type === 'deliver') {
    for (const [k, v] of Object.entries(quest.resources ?? {})) (d.player.wallet as Record<string, number>)[k] = Math.max((d.player.wallet as Record<string, number>)[k] ?? 0, (v ?? 0) + 1);
  } else {
    const t = d.state.world.sites[quest.siteId!]!;
    t.cleared = true;
    t.clearedBy = 'player';
  }
  besides(d, hut);
  const file = writeSave(d, 'reward-hut');
  await load(page, file);
  await walkTo(page, hut.coord);
  await waitFor(page, (s) => s.overlays.includes('quest-hut'), 'quest hut dialog');
  await page.getByTestId('quest-complete').click();
  const s1 = await waitFor(page, (x) => x.state.world.sites[hut.id]?.claimed === true && x.overlays.includes('reward'), 'receipt');
  const receipt = page.getByTestId('reward');
  await expect(receipt.locator('.reward-tray')).toBeVisible();
  await expect(receipt.locator('.reward-cell').first()).toBeVisible();
  await expect(receipt.getByTestId('reward-continue')).toBeFocused();
  await settle(page);
  await page.screenshot({ path: 'test-results/encounter-reward-receipt.png' });
  const wallet = JSON.stringify(s1.state.players.player.wallet);
  await receipt.getByTestId('reward-continue').click();
  const s2 = await waitFor(page, (x) => !x.overlays.includes('reward'), 'receipt closed');
  // Continue never grants again.
  expect(JSON.stringify(s2.state.players.player.wallet)).toBe(wallet);
  expect(s2.state.revision).toBe(s1.state.revision);
  // A reload replays nothing.
  await page.reload({ waitUntil: 'networkidle' });
  await expect(page.getByTestId('reward')).toHaveCount(0);
  expect(errors.filter((e) => !/favicon/i.test(e))).toEqual([]);
});
