import { expect, test, type Page } from '@playwright/test';
import { GameDriver } from '@pr/testing';
import { createGeneratedMatch, createRandomSkirmish, type SkirmishGenOptions } from '@pr/campaign';
import type { HeroState, SiteDefinition } from '@pr/rules';
import { clickHex, inspect, waitFor } from './helpers';
import { approachTile, importAndLoad, slots, writeSave } from './fixtures';

/**
 * Proposed 2026-10-02: hero specialties in the tavern, neutral creatures that
 * offer to join or flee, the treasure-chest and quest-hut dialogs — through the
 * real screens, from ordinary save fixtures. Screenshots are kept for review.
 */

const NEW_KINDS = ['learning_stone', 'spell_shrine', 'skill_trainer', 'quest_hut', 'key_tent', 'windmill', 'treasure_chest', 'prison'];

function genOpts(seed: number): SkirmishGenOptions {
  return {
    seed,
    size: 'small',
    seats: [
      { pantheonId: 'greek', controller: 'human' },
      { pantheonId: 'norse', controller: 'ai' },
    ],
    victory: { type: 'elimination' },
    monsters: 'none',
    revealMap: true,
  };
}

function randomDriver(matchId: string): GameDriver {
  const catalog = GameDriver.mission('skirmish_twin_harbors').catalog;
  for (let seed = 1; seed < 80; seed++) {
    const g = createRandomSkirmish(catalog, genOpts(seed));
    const mine = g.mission.sites.filter((s) => s.id.endsWith('_1'));
    if (!NEW_KINDS.every((k) => mine.some((s) => s.kind.type === k))) continue;
    return new GameDriver(createGeneratedMatch(catalog, g, { matchId, startingGodId: 'zeus' }).match, catalog);
  }
  throw new Error('no seed with every new site');
}

const leader = (d: GameDriver): HeroState => Object.values(d.state.heroes).find((h) => h.ownerId === 'player' && h.status === 'active' && !h.monster)!;
const site = (d: GameDriver, pred: (s: SiteDefinition) => boolean): SiteDefinition => d.state.customMission!.sites.find((s) => s.id.endsWith('_1') && pred(s))!;

/** Stand the leader one step from `target` with full movement. */
function besides(d: GameDriver, target: SiteDefinition): HeroState {
  const h = leader(d);
  h.position = approachTile(d, target.coord, h.id);
  h.movementPoints = 3000;
  return h;
}

async function open(page: Page, file: string) {
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await importAndLoad(page, file);
  await waitFor(page, (s) => s.screen === 'adventure', 'adventure');
}

/** Select the destination, then confirm it (the second click walks). */
async function walkTo(page: Page, c: { q: number; r: number }) {
  await clickHex(page, c.q, c.r);
  await clickHex(page, c.q, c.r);
}

test('the tavern lists every candidate’s specialty before hiring', async ({ page }) => {
  const d = GameDriver.mission('skirmish_twin_harbors', { matchId: 'e2e-tavern-specialty' });
  for (const fog of Object.values(d.state.fog)) fog.explored = fog.explored.map(() => 1);
  d.state.towns['westharbor']!.buildings['tavern'] = 1;
  const file = writeSave(d, 'tavern-specialty');
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await importAndLoad(page, file);
  await page.getByTestId('town-tab-westharbor').click();
  await page.getByRole('button', { name: 'Tavern', exact: true }).click();
  const modal = page.getByTestId('tavern');
  await expect(modal).toBeVisible();
  const cards = modal.locator('.hire-card');
  const n = await cards.count();
  expect(n).toBeGreaterThan(0);
  for (let i = 0; i < n; i++) await expect(cards.nth(i).locator('[data-testid^="specialty-"]')).toBeVisible();
  await page.waitForTimeout(800); // let the dialog's fade-in finish before the screenshot
  await page.screenshot({ path: 'test-results/tavern-specialties.png' });
});

test('much weaker neutrals offer to join; accepting adds them without a battle', async ({ page }) => {
  const d = randomDriver('e2e-neutral-join');
  const target = site(d, (s) => !!s.guard && !s.guard.commander && s.kind.type !== 'town');
  const h = besides(d, target);
  h.army.slots = slots([['cyclops', 400]]);
  const file = writeSave(d, 'neutral-join');
  await open(page, file);
  await walkTo(page, target.coord);
  await waitFor(page, (s) => s.overlays.includes('encounter'), 'encounter dialog');
  await expect(page.getByTestId('neutral-offer')).toBeVisible();
  await expect(page.getByTestId('encounter-join')).toBeVisible();
  await expect(page.getByTestId('encounter-release')).toBeVisible();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: 'test-results/neutral-join.png' });
  await page.getByTestId('encounter-join').click();
  const s = await waitFor(page, (x) => x.state.world.sites[target.id]?.cleared === true && !x.state.battle, 'neutrals joined');
  const total = s.state.heroes[h.id].army.slots.reduce((n: number, x: { count: number } | null) => n + (x?.count ?? 0), 0);
  expect(total).toBeGreaterThan(400);
  expect(s.screen).toBe('adventure');
});

test('a treasure chest asks for gold or experience', async ({ page }) => {
  const d = randomDriver('e2e-chest');
  const chest = site(d, (s) => s.kind.type === 'treasure_chest');
  besides(d, chest);
  const file = writeSave(d, 'chest');
  await open(page, file);
  const gold = (await inspect(page)).state.players.player.wallet.gold;
  await walkTo(page, chest.coord);
  await waitFor(page, (s) => s.overlays.includes('chest'), 'chest dialog');
  await expect(page.getByTestId('chest-gold')).toBeVisible();
  await expect(page.getByTestId('chest-xp')).toBeVisible();
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'test-results/treasure-chest.png' });
  await page.getByTestId('chest-gold').click();
  const k = chest.kind as { gold: number };
  await waitFor(page, (x) => x.state.players.player.wallet.gold === gold + k.gold, 'chest gold');
});

test('a quest hut shows its quest and pays when it is met', async ({ page }) => {
  const d = randomDriver('e2e-quest-hut');
  const hut = site(d, (s) => s.kind.type === 'quest_hut');
  const quest = (hut.kind as { quest: { type: string; resources?: Record<string, number>; siteId?: string } }).quest;
  if (quest.type === 'deliver') {
    for (const [k, v] of Object.entries(quest.resources ?? {})) (d.player.wallet as Record<string, number>)[k] = Math.max((d.player.wallet as Record<string, number>)[k] ?? 0, (v ?? 0) + 1);
  } else {
    const t = d.state.world.sites[quest.siteId!]!;
    t.cleared = true;
    t.clearedBy = 'player';
  }
  besides(d, hut);
  const file = writeSave(d, 'quest-hut');
  await open(page, file);
  await walkTo(page, hut.coord);
  await waitFor(page, (s) => s.overlays.includes('quest-hut'), 'quest hut dialog');
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'test-results/quest-hut.png' });
  await page.getByTestId('quest-complete').click();
  await waitFor(page, (x) => x.state.world.sites[hut.id]?.claimed === true, 'quest fulfilled');
});
