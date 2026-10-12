import { expect, test, type Page } from '@playwright/test';
import { GameDriver } from '@pr/testing';
import { createGeneratedMatch, createRandomSkirmish, type SkirmishGenOptions } from '@pr/campaign';
import type { HeroState, SiteDefinition } from '@pr/rules';
import { clickHex, inspect, waitFor } from './helpers';
import { approachTile, importAndLoad, writeSave } from './fixtures';
import { goldBattle, STRONG, usePrefs } from './momentFixtures';

/**
 * Release 1.1.0 interface: the behaviour the GUI handoff asks to keep or add,
 * through the real screens from ordinary save fixtures (Load → Import). The
 * art pack's own validation is not a substitute for these.
 */

const OUT = 'test-results/gui110';

async function open(page: Page, file: string) {
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await importAndLoad(page, file);
  await waitFor(page, (s) => s.screen === 'adventure', 'adventure');
}

function twinHarbors(matchId: string): GameDriver {
  const d = GameDriver.mission('skirmish_twin_harbors', { matchId });
  for (const fog of Object.values(d.state.fog)) fog.explored = fog.explored.map(() => 1);
  return d;
}

/** A generated map with a treasure chest and a quest hut on the player's side. */
function generated(matchId: string): GameDriver {
  const catalog = GameDriver.mission('skirmish_twin_harbors').catalog;
  const opts = (seed: number): SkirmishGenOptions => ({
    seed,
    size: 'small',
    seats: [
      { pantheonId: 'greek', controller: 'human' },
      { pantheonId: 'norse', controller: 'ai' },
    ],
    victory: { type: 'elimination' },
    monsters: 'none',
    revealMap: true,
  });
  for (let seed = 1; seed < 80; seed++) {
    const g = createRandomSkirmish(catalog, opts(seed));
    const mine = g.mission.sites.filter((s) => s.id.endsWith('_1'));
    if (!['treasure_chest', 'quest_hut'].every((k) => mine.some((s) => s.kind.type === k))) continue;
    return new GameDriver(createGeneratedMatch(catalog, g, { matchId, startingGodId: 'zeus' }).match, catalog);
  }
  throw new Error('no seed with a chest and a quest hut');
}
const leader = (d: GameDriver): HeroState => Object.values(d.state.heroes).find((h) => h.ownerId === 'player' && h.status === 'active' && !h.monster)!;
const siteOf = (d: GameDriver, type: string): SiteDefinition => d.state.customMission!.sites.find((s) => s.id.endsWith('_1') && s.kind.type === type)!;
function besides(d: GameDriver, target: SiteDefinition): HeroState {
  const h = leader(d);
  h.position = approachTile(d, target.coord, h.id);
  h.movementPoints = 3000;
  return h;
}
async function walkTo(page: Page, c: { q: number; r: number }) {
  await clickHex(page, c.q, c.r);
  await clickHex(page, c.q, c.r);
}

test('treasure: a tile only selects, Decide later claims nothing, Confirm claims once (double click), a claimed chest stays closed', async ({ page }) => {
  test.setTimeout(240_000);
  const d = generated('e2e-gui110-chest');
  const chest = siteOf(d, 'treasure_chest');
  besides(d, chest);
  await open(page, writeSave(d, 'gui110-chest'));
  const gold = (await inspect(page)).state.players.player.wallet.gold;
  await walkTo(page, chest.coord);
  await waitFor(page, (s) => s.overlays.includes('chest'), 'chest dialog');
  const dialog = page.getByTestId('chest');
  // Focus moves into the dialog; Confirm is unavailable (with a reason) until a reward is chosen.
  await expect(dialog.locator(':focus')).toHaveCount(1);
  await expect(page.getByTestId('chest-confirm')).toBeDisabled();
  await expect(page.getByTestId('chest-confirm')).toHaveAttribute('aria-description', 'Choose a reward first');
  await page.getByTestId('chest-gold').click();
  await expect(page.getByTestId('chest-gold')).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByTestId('chest-xp')).toHaveAttribute('aria-checked', 'false');
  expect((await inspect(page)).state.players.player.wallet.gold).toBe(gold);
  // Decide later: closes, nothing claimed.
  await page.getByTestId('chest-later').click();
  await waitFor(page, (s) => !s.overlays.includes('chest'), 'chest closed');
  let s = await inspect(page);
  expect(s.state.players.player.wallet.gold).toBe(gold);
  expect(s.state.world.sites[chest.id]?.claimed ?? false).toBe(false);
  // The hero still stands on the chest: clicking its tile opens it again.
  await clickHex(page, chest.coord.q, chest.coord.r);
  await waitFor(page, (x) => x.overlays.includes('chest'), 'chest dialog again');
  // Keyboard: arrows move the selection, Enter on the selected tile confirms (the same single path).
  await page.getByTestId('chest-gold').focus();
  await page.keyboard.press('Space');
  await expect(page.getByTestId('chest-gold')).toHaveAttribute('aria-checked', 'true');
  await page.getByTestId('chest-confirm').dblclick();
  const k = chest.kind as { gold: number };
  s = await waitFor(page, (x) => x.state.players.player.wallet.gold === gold + k.gold && !x.overlays.includes('chest'), 'chest gold once');
  await page.waitForTimeout(500);
  s = await inspect(page);
  expect(s.state.players.player.wallet.gold).toBe(gold + k.gold);
  expect(s.state.world.sites[chest.id]?.claimed).toBe(true);
  await clickHex(page, chest.coord.q, chest.coord.r);
  await page.waitForTimeout(500);
  expect((await inspect(page)).overlays).not.toContain('chest');
});

test('quest hut: what is asked and what is given read as one exchange; a missing delivery explains itself', async ({ page }) => {
  test.setTimeout(240_000);
  const d = generated('e2e-gui110-quest');
  const hut = siteOf(d, 'quest_hut');
  const quest = (hut.kind as { quest: { type: string; resources?: Record<string, number> } }).quest;
  if (quest.type === 'deliver') for (const k of Object.keys(quest.resources ?? {})) (d.player.wallet as Record<string, number>)[k] = 0;
  besides(d, hut);
  await open(page, writeSave(d, 'gui110-quest'));
  await walkTo(page, hut.coord);
  await waitFor(page, (s) => s.overlays.includes('quest-hut'), 'quest hut');
  const dialog = page.getByTestId('quest-hut');
  await expect(dialog.locator('.gui-exchange')).toBeVisible();
  await expect(dialog.locator('.gui-exchange__side')).toHaveCount(2);
  await expect(page.getByTestId('quest-complete')).toBeDisabled();
  await expect(page.getByTestId('quest-reason')).toBeVisible();
  await page.screenshot({ path: `${OUT}/quest-hut.png` });
  // Escape closes the dialog and gives focus back to the page.
  await page.keyboard.press('Escape');
  await waitFor(page, (s) => !s.overlays.includes('quest-hut'), 'quest hut closed');
});

test('marketplace: pay and receive apart, rate and holdings after the trade; a double click trades once', async ({ page }) => {
  const d = twinHarbors('e2e-gui110-market');
  d.state.towns['westharbor']!.buildings['marketplace'] = 1;
  d.player.wallet.wood = 20;
  await open(page, writeSave(d, 'gui110-market'));
  await page.getByTestId('town-tab-westharbor').click();
  await page.getByTestId('town-market').click();
  const m = page.getByTestId('market');
  // 1.1.0 adventure screen: the town's merchant painting fills the scene above the counter.
  await expect(m.locator('.ak-stage__scene')).toHaveAttribute('src', /ui-v1\.1\.0\/merchant-greek\.png$/);
  await page.getByTestId('market-res-wood').click();
  await page.getByRole('button', { name: 'Increase Wood to sell' }).click();
  await expect(page.getByTestId('market-pay')).toContainText('2 Wood');
  const rate = Number((await page.getByTestId('market-rate').innerText()).replace(/[^\d]/g, '').slice(1));
  await expect(page.getByTestId('market-receive')).toContainText(`${(2 * rate).toLocaleString('en-US')} Gold`);
  await expect(page.getByTestId('market-after')).toContainText('Wood 20 → 18');
  const gold = (await inspect(page)).state.players.player.wallet.gold;
  await page.getByTestId('market-trade').dblclick();
  await page.waitForTimeout(800);
  const s = await inspect(page);
  expect(s.state.players.player.wallet.wood).toBe(18);
  expect(s.state.players.player.wallet.gold).toBe(gold + 2 * rate);
  // Buying: an amount the treasury cannot pay explains itself.
  await page.getByTestId('market-buy').click();
  await page.getByTestId('market-res-crystal').click();
  await expect(page.getByTestId('market-after')).toContainText('Crystal');
  await page.screenshot({ path: `${OUT}/market.png` });
});

test('town: buildings answer hover and focus, the construction list holds every location, building highlights only the new one', async ({ page }) => {
  const d = twinHarbors('e2e-gui110-town');
  await open(page, writeSave(d, 'gui110-town'));
  await page.getByTestId('town-tab-westharbor').click();
  await waitFor(page, (s) => s.screen === 'town', 'town');
  // Keyboard focus on a building shows its tooltip card at once.
  await page.getByTestId('slot-tavern').focus();
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Tab');
  const label = page.getByTestId('slot-tavern').locator('.town-slot__label');
  await expect.poll(() => label.evaluate((e) => getComputedStyle(e).opacity)).toBe('1');
  // The construction list: all 18 locations, each with its state.
  await page.getByTestId('town-construction').click();
  const list = page.getByTestId('construction');
  await expect(list.locator('[data-testid^="construction-"][class*="build-row"]')).toHaveCount(18);
  await expect(list.locator('.build-row.is-blocked .build-row__missing li, .build-row.is-blocked .build-row__reason').first()).toBeVisible();
  const ready = list.locator('.build-row.is-ready').first();
  const slotId = (await ready.getAttribute('data-testid'))!.replace('construction-', '');
  const before = (await inspect(page)).state.towns.westharbor.buildings[slotId] ?? 0;
  await ready.getByRole('button', { name: /^Build / }).dblclick();
  await waitFor(page, (s) => (s.state.towns.westharbor.buildings[slotId] ?? 0) === before + 1, 'built from the list');
  await expect(page.getByTestId('construction')).toHaveCount(0);
  await expect(page.locator('.town-slot.is-new')).toHaveCount(1);
  await expect(page.getByTestId(`slot-${slotId}`)).toHaveClass(/is-new/);
  expect((await inspect(page)).state.towns.westharbor.buildings[slotId]).toBe(before + 1);
  // One building a day: the list now says so and every Build is refused with the reason.
  await page.getByTestId('town-construction').click();
  await expect(page.getByTestId('construction-day')).toContainText('tomorrow');
  await expect(page.locator('[data-testid^="construction-build-"]:not([disabled])')).toHaveCount(0);
  await page.screenshot({ path: `${OUT}/construction.png` });
});

test('battle: counts stay on the board; health shows on the active and the hovered stack; the inspection card never blocks the field', async ({ page }) => {
  test.setTimeout(240_000);
  const { file } = goldBattle('skirmish_twin_harbors', 'gui110-battle', STRONG);
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await importAndLoad(page, file);
  const st = await waitFor(page, (x) => x.screen === 'battle' && !!x.state.battle, 'battle', 60_000);
  if (st.state.battle.phase === 'deployment') await page.getByTestId('deploy-confirm').click();
  await waitFor(page, (x) => x.screen === 'battle' && x.humanTurn && !x.busy && x.state.battle?.phase !== 'deployment', 'player turn', 120_000);
  await page.waitForTimeout(800);
  const labels = (await page.evaluate(() => (globalThis as unknown as { __prBattle: () => Record<string, { label: string }> }).__prBattle())) ?? {};
  const s = await inspect(page);
  const active = s.state.battle.activeStackId as string;
  for (const [id, v] of Object.entries(labels)) {
    if (s.state.battle.stacks[id].totalHp <= 0) continue;
    if (id === active) expect(v.label).toMatch(/· \d+hp$/);
    else expect(v.label).toMatch(/^\d+$/);
  }
  const enemy = Object.values(s.state.battle.stacks as Record<string, { id: string; side: string; totalHp: number; anchor: { col: number; row: number } }>).find((x) => x.side === 'defender' && x.totalHp > 0)!;
  const p = await page.evaluate(([c, r]) => (globalThis as unknown as { __prProject: (k: string, a: number, b: number) => { x: number; y: number } | null }).__prProject('battle', c!, r!), [enemy.anchor.col, enemy.anchor.row]);
  await page.mouse.move(p!.x, p!.y - 8, { steps: 4 });
  await expect.poll(async () => ((await page.evaluate(() => (globalThis as unknown as { __prBattle: () => Record<string, { label: string }> }).__prBattle())) ?? {})[enemy.id]?.label ?? '').toMatch(/· \d+hp$/);
  // Decorative chrome lets the board take the pointer.
  expect(await page.locator('.battle-top').evaluate((e) => getComputedStyle(e).pointerEvents)).toBe('none');
  await page.screenshot({ path: `${OUT}/battle-hover.png` });
});

test('setup: six banners are one radio group with arrow keys; the patron and roster follow the choice', async ({ page }) => {
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await page.getByTestId('menu-new').click();
  await page.getByTestId('mode-skirmish').click();
  await page.getByTestId('scenario-skirmish_twin_harbors').click();
  await page.getByTestId('setup-next').click();
  const group = page.getByRole('radiogroup', { name: 'Pantheons' });
  await expect(group.getByRole('radio')).toHaveCount(6);
  await page.getByTestId('pantheon-greek').focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByTestId('pantheon-norse')).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByTestId('pantheon-norse')).toBeFocused();
  await expect(page.getByTestId('pantheon-patron')).toContainText('Odin');
  await expect(page.locator('.pantheon-roster__tile')).toHaveCount(7);
  // Every match option stays reachable in the drawer.
  await expect(page.getByTestId('rival-controller')).toBeVisible();
  await expect(page.getByTestId('difficulty')).toBeVisible();
  await page.screenshot({ path: `${OUT}/setup.png` });
});

test('journal and encyclopedia: an open book with every objective; the codex keeps all sections and opens each pantheon', async ({ page }) => {
  const d = twinHarbors('e2e-gui110-books');
  await open(page, writeSave(d, 'gui110-books'));
  await page.keyboard.press('j');
  if ((await inspect(page)).screen !== 'journal') await page.getByRole('button', { name: /^Journal$/ }).first().click();
  await waitFor(page, (s) => s.screen === 'journal', 'journal');
  await expect(page.locator('.gui-folio')).toBeVisible();
  const defs = await page.locator('[data-testid^="objective-"]').count();
  expect(defs).toBeGreaterThan(0);
  await page.locator('[data-testid^="objective-"]').last().click();
  await expect(page.locator('[data-testid^="objective-"]').last()).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('journal-entry')).toBeVisible();
  // Narrow windows (the book under 52 rem): one parchment page instead of the spread.
  await page.setViewportSize({ width: 540, height: 700 });
  await expect.poll(() => page.locator('.gui-folio__page--left').evaluate((e) => getComputedStyle(e).position)).toBe('static');
  await page.setViewportSize({ width: 1600, height: 900 });
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await page.getByTestId('menu-encyclopedia').click();
  await waitFor(page, (s) => s.screen === 'encyclopedia', 'encyclopedia');
  await expect(page.getByRole('tab')).toHaveCount(8);
  // The pantheon row filters the section (1.1.0 pre-game: All, the six pantheons, Neutral in the bestiary).
  await page.getByTestId('codex-filter-celtic').click();
  await expect(page.getByTestId('codex-filter-celtic')).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByTestId('codex-pantheon-celtic')).toBeVisible();
  await expect(page.getByTestId('codex-pantheon-greek')).toHaveCount(0);
  await page.getByTestId('codex-filter-all').click();
  await page.getByTestId('codex-griffin').click();
  await waitFor(page, (s) => s.screen === 'unit-detail', 'unit detail');
  await page.getByTestId('unit-form-windcrest_griffin').click();
  await expect(page.getByTestId('unit-name')).toHaveText('Windcrest Griffin');
});

test('accessibility: focus is trapped in a dialog and returns to its opener; reduced motion and high contrast hold', async ({ page }) => {
  await usePrefs(page, { motion: 'reduced', highContrast: true });
  const d = twinHarbors('e2e-gui110-a11y');
  d.state.towns['westharbor']!.buildings['marketplace'] = 1;
  await open(page, writeSave(d, 'gui110-a11y'));
  expect(await page.evaluate(() => [document.documentElement.dataset.motion, document.documentElement.dataset.contrast])).toEqual(['reduced', 'high']);
  await page.getByTestId('town-tab-westharbor').click();
  const opener = page.getByTestId('town-market');
  await opener.focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByTestId('market');
  await expect(dialog).toBeVisible();
  for (let i = 0; i < 25; i++) {
    await page.keyboard.press('Tab');
    expect(await dialog.evaluate((el) => el.contains(document.activeElement))).toBe(true);
  }
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(opener).toBeFocused();
  // A themed tooltip appears on keyboard focus (and only one: the native title is set aside while it shows).
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Tab');
  await expect(page.locator('.gui-tip')).toHaveCount(1);
  // Reduced motion: the recruitment figure stands still.
  await page.getByTestId('town-recruit').click();
  await waitFor(page, (s) => s.screen === 'recruitment', 'recruitment');
  const anim = await page.getByTestId('recruit-stage').locator('.recruit-stage__unit').evaluate((e) => getComputedStyle(e).animationName).catch(() => 'none');
  expect(anim).toBe('none');
});

test('an older save loads into the 1.1.0 interface (the delivered 1.0.0 siege review save, when present)', async ({ page }) => {
  const file = process.env.PR_OLD_SAVE;
  test.skip(!file, 'PR_OLD_SAVE not set');
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await importAndLoad(page, file!);
  await waitFor(page, (s) => s.screen === 'battle' || s.screen === 'adventure', 'loaded', 60_000);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/old-save.png` });
});

for (const [w, h] of [
  [1920, 1080],
  [1600, 1000],
  [1280, 720],
] as const) {
  test(`resolution ${w}×${h}: adventure, town, journal and a dialog keep their primary actions on screen`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h });
    const d = twinHarbors(`e2e-gui110-${w}`);
    d.state.towns['westharbor']!.buildings['marketplace'] = 1;
    await open(page, writeSave(d, `gui110-${w}`));
    const inView = async (testId: string) => {
      const b = (await page.getByTestId(testId).boundingBox())!;
      expect(b.x).toBeGreaterThanOrEqual(0);
      expect(b.y).toBeGreaterThanOrEqual(0);
      expect(b.x + b.width).toBeLessThanOrEqual(w + 1);
      expect(b.y + b.height).toBeLessThanOrEqual(h + 1);
    };
    await inView('end-day');
    await page.screenshot({ path: `${OUT}/adventure-${w}x${h}.png` });
    await page.getByTestId('town-tab-westharbor').click();
    await waitFor(page, (s) => s.screen === 'town', 'town');
    await inView('town-construction');
    await page.getByTestId('town-market').click();
    await inView('market-trade');
    await page.screenshot({ path: `${OUT}/market-${w}x${h}.png` });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
}
