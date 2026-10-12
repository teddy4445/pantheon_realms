import { expect, test, type Page } from '@playwright/test';
import { GameDriver } from '@pr/testing';
import { axialNeighbors, hexEquals, quoteMovement, type HeroState } from '@pr/rules';
import { inspect, waitFor } from './helpers';
import { importAndLoad, writeSave } from './fixtures';

/**
 * Load → Import, then load the slot that holds this save (by its name): a test that imports several
 * saves would otherwise load the first slot, which holds the first import.
 */
async function importNamed(page: Page, d: GameDriver, name: string) {
  const file = writeSave(d, name);
  await page.getByTestId('menu-load').click();
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: /Import/ }).click();
  await (await chooser).setFiles(file);
  // An import takes the first free manual slot, so find it by its name.
  const slot = page.locator('[data-testid^="save-manual-"]').filter({ hasText: `${name} (imported)` });
  await slot.waitFor();
  await slot.click();
  await page.getByTestId('load-confirm').click();
  await page.waitForTimeout(200);
  if ((await inspect(page)).overlays.includes('confirm')) await page.getByTestId('confirm-ok').click();
  await waitFor(page, (s) => !!s.state && !s.overlays.includes('save-load'), 'loaded save');
}

/**
 * The complete hero character portraits (owner delivery 2026-10-10): in each
 * pantheon's Lodge every candidate stands as their own painted bust (the asset
 * named after that hero's own portrait, never a name-guessed or borrowed one),
 * the hero screen shows the hero's bust beside the live identity, a meeting of
 * two of that pantheon's heroes shows both as themselves, and every picture
 * decodes with its transparency. Hiring rules are untouched (picking a
 * candidate only inspects). The handoff asks for desktop and phone widths: run
 * this file with a 390 px viewport too.
 */

const PANTHEONS = ['greek', 'norse', 'egyptian', 'japanese', 'celtic', 'mesoamerican'] as const;
const mission = (p: string) => (p === 'greek' ? 'skirmish_twin_harbors' : `skirmish_twin_harbors_${p}_vs_greek`);
const bustOf = (portraitAssetId: string) => `${portraitAssetId.slice(0, -'.portrait'.length)}.bust`;

/** Let the dialogs' short entrance transitions finish before a screenshot (endless idle loops excluded). */
async function settle(page: Page) {
  await page.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        .filter((a) => a.effect && 'target' in a.effect && a.effect.getComputedTiming().iterations !== Infinity)
        .map((a) => a.finished.catch(() => undefined)),
    ),
  );
}

async function decoded(page: Page, selector: string): Promise<boolean[]> {
  return page.locator(selector).evaluateAll(async (els) =>
    Promise.all(
      (els as HTMLImageElement[]).map(async (img) => {
        img.loading = 'eager';
        await img.decode().catch(() => undefined);
        return img.naturalWidth > 0;
      }),
    ),
  );
}

for (const p of PANTHEONS) {
  test(`${p}: Lodge candidates and the hero screen show each hero's own bust`, async ({ page }) => {
    test.setTimeout(240_000);
    const d = GameDriver.mission(mission(p), { matchId: `e2e-busts-${p}` });
    for (const fog of Object.values(d.state.fog)) fog.explored = fog.explored.map(() => 1);
    const town = Object.values(d.state.towns).find((t) => t.ownerId === 'player')!;
    town.buildings['tavern'] = 1;
    await page.goto('/?e2e', { waitUntil: 'networkidle' });
    await importAndLoad(page, writeSave(d, `busts-${p}`));
    await waitFor(page, (s) => s.screen === 'adventure', 'adventure');
    const heroesBefore = Object.keys((await inspect(page)).state.heroes).length;
    await page.getByTestId(`town-tab-${town.id}`).click();
    await waitFor(page, (s) => s.screen === 'town', 'town');
    await page.getByRole('button', { name: 'Tavern', exact: true }).click();
    const lodge = page.getByTestId('tavern');
    await expect(lodge).toBeVisible();
    const candidates = lodge.locator('[data-testid^="hire-candidate-"]');
    const n = await candidates.count();
    expect(n).toBeGreaterThan(0);
    for (let i = 0; i < n; i++) {
      const id = ((await candidates.nth(i).getAttribute('data-testid')) ?? '').replace('hire-candidate-', '');
      const def = d.catalog.heroes[id]!;
      await expect(candidates.nth(i).locator('img.ak-figure--bust')).toHaveAttribute('data-asset', bustOf(def.portraitAssetId));
    }
    expect((await decoded(page, '[data-testid="tavern"] img.ak-figure--bust')).every(Boolean)).toBe(true);
    // Every name fits its plate (two lines at most), and on a desktop window every candidate is in view.
    const plates = await lodge.locator('.ak-candidate__name').evaluateAll((els) =>
      els.map((e) => {
        const line = parseFloat(getComputedStyle(e).lineHeight);
        const kids = [...e.childNodes].filter((k) => k.nodeType === Node.TEXT_NODE);
        const range = document.createRange();
        if (kids[0]) range.selectNodeContents(kids[0]);
        const lines = kids[0] ? new Set([...range.getClientRects()].map((r) => Math.round(r.top))).size : 0;
        return { text: e.textContent, over: e.scrollWidth - e.clientWidth, lines, line };
      }),
    );
    for (const pl of plates) {
      expect(pl.over, `${pl.text}: no overflow`).toBeLessThanOrEqual(1);
      expect(pl.lines, `${pl.text}: at most two lines`).toBeLessThanOrEqual(2);
    }
    if ((page.viewportSize()?.width ?? 0) >= 1200 && n <= 8) {
      const row = await lodge.locator('.ak-tavern__candidates').evaluate((e) => e.scrollWidth - e.clientWidth);
      expect(row, 'all candidates in view').toBeLessThanOrEqual(1);
    }
    await candidates.nth(n - 1).click();
    await expect(candidates.nth(n - 1)).toHaveAttribute('aria-checked', 'true');
    expect(Object.keys((await inspect(page)).state.heroes).length).toBe(heroesBefore);
    await settle(page);
    await page.screenshot({ path: `test-results/busts-lodge-${p}.png` });
    await page.keyboard.press('Escape');
    // The hero screen: the leader's own bust beside its name and class.
    const leader = Object.values(d.state.heroes).find((h) => h.ownerId === 'player' && h.status === 'active')!;
    await page.goto('/?e2e', { waitUntil: 'networkidle' });
    await importNamed(page, d, `busts-${p}-hero`);
    await waitFor(page, (s) => s.screen === 'adventure', 'adventure again');
    await page.keyboard.press('h');
    await waitFor(page, (s) => s.screen === 'hero', 'hero screen');
    const bust = page.getByTestId('hero-bust').locator('img.ak-figure--bust');
    await expect(bust).toHaveAttribute('data-asset', bustOf(leader.portraitAssetId));
    expect((await decoded(page, '[data-testid="hero-bust"] img')).every(Boolean)).toBe(true);
    await settle(page);
    await page.screenshot({ path: `test-results/busts-hero-${p}.png` });

    // A meeting of two of this pantheon's heroes: the leader steps next to its town and a second hero is
    // hired there (the town's own pool, so the same pantheon); both stand as their own busts.
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
    for (const def of Object.values(d.catalog.heroes).filter((h) => h.pantheonId === p)) {
      if (Object.values(d.state.heroes).some((h) => h.definitionId === def.id)) continue;
      try {
        d.do({ kind: 'HireHero', townId: town.id, heroDefinitionId: def.id });
      } catch {
        continue;
      }
      second = Object.values(d.state.heroes).find((h) => h.definitionId === def.id);
      if (second) break;
    }
    expect(second, `a hireable ${p} hero`).toBeTruthy();
    await page.goto('/?e2e', { waitUntil: 'networkidle' });
    await importNamed(page, d, `busts-${p}-meeting`);
    await waitFor(page, (s) => s.screen === 'adventure', 'adventure for the meeting');
    await page.keyboard.press('h');
    await waitFor(page, (s) => s.screen === 'hero', 'hero screen for the meeting');
    const live = (await inspect(page)).state.heroes;
    const names = [live[leader.id].name, live[second!.id].name];
    await page.getByRole('button', { name: new RegExp(`^Exchange with (${names.join('|')})$`) }).first().click();
    await waitFor(page, (s) => s.overlays.includes('transfer'), 'meeting');
    const busts = page.getByTestId('transfer').locator('img.meet__bust');
    await expect(busts).toHaveCount(2);
    const shown = (await busts.evaluateAll((els) => els.map((e) => e.getAttribute('data-asset')))).sort();
    expect(shown).toEqual([bustOf(leader.portraitAssetId), bustOf(second!.portraitAssetId)].sort());
    expect((await decoded(page, '[data-testid="transfer"] img.meet__bust')).every(Boolean)).toBe(true);
    await settle(page);
    await page.screenshot({ path: `test-results/busts-meeting-${p}.png` });
  });
}
