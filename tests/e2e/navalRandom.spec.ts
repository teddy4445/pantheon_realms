import { mkdirSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { inspect, waitFor } from './helpers';
import { usePrefs } from './momentFixtures';

/**
 * Naval random-map templates through the real setup screen (2026-10-17, docs/naval-random-v1/): The
 * Shattered Crown and The Serpent Straits in the chooser with their paintings and the "Ships required"
 * tag; the selected type's description, facts and readiness; seat and size reasons (unsupported options
 * disabled, the player count never changed for the player); the locked portal option ("Ships connect
 * these islands."); the default victory; Create World with the type's loading painting; and both maps
 * started to the adventure map (asserted through the read-only ?e2e state: the naval travel rule, one
 * owned empty ship per empire beside its harbor). Ship sprites are drawn by the naval presentation work;
 * this spec checks the state and the DOM.
 * Screenshots: /home/claude/capture/naval-random/.
 */

const OUT = '/home/claude/capture/naval-random';
mkdirSync(OUT, { recursive: true });

function errorsOf(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  return errors;
}
const realErrors = (errors: string[]) => errors.filter((e) => !/favicon|Failed to load resource/i.test(e));

async function decoded(page: Page, selector: string): Promise<{ total: number; broken: string[] }> {
  return page.locator(selector).evaluateAll(async (els) => {
    const imgs = els.flatMap((e) => (e instanceof HTMLImageElement ? [e] : [...e.querySelectorAll('img')]));
    for (const i of imgs) i.loading = 'eager';
    await Promise.all(imgs.map((i) => i.decode().catch(() => undefined)));
    return { total: imgs.length, broken: imgs.filter((i) => !i.complete || i.naturalWidth === 0).map((i) => i.currentSrc || i.src) };
  });
}

async function openRandomSetup(page: Page): Promise<void> {
  await usePrefs(page, { graphicsTested: true, tutorialHints: false, confirmEndDayWithMovement: false });
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await page.getByTestId('menu-new').click();
  await page.getByTestId('mode-random').click();
  await waitFor(page, (s) => s.screen === 'random-setup', 'random setup', 60_000);
}

/** Start the selected naval type: the loading painting first, then the adventure map. */
async function startNaval(page: Page, shot?: string): Promise<Awaited<ReturnType<typeof inspect>>> {
  await page.getByTestId('random-start').click();
  const loading = page.getByTestId('random-naval-loading');
  await expect(loading).toBeVisible({ timeout: 15_000 });
  if (shot) {
    // The painting is up for about a second and a half: shoot as soon as it has decoded.
    await page.waitForFunction(() => {
      const img = document.querySelector<HTMLImageElement>('[data-testid="random-naval-loading"] img');
      return !!img && img.complete && img.naturalWidth > 0;
    }, undefined, { timeout: 5_000 });
    const src = await loading.locator('img').getAttribute('src', { timeout: 2_000 });
    await page.screenshot({ path: `${OUT}/${shot}` });
    expect(src).toMatch(/naval-random-v1\/(shattered-crown|serpent-straits)-loading\.png$/);
  }
  return waitFor(page, (s) => s.screen === 'adventure' && s.overlays.length === 0 && !s.busy, 'adventure map', 180_000);
}

const near = (a: { q: number; r: number }, b: { q: number; r: number }) => (Math.abs(a.q - b.q) + Math.abs(a.r - b.r) + Math.abs(a.q + a.r - b.q - b.r)) / 2;

test.describe('naval random maps', () => {
  test.setTimeout(420_000);

  test('the chooser: both naval cards with their paintings and "Ships required"; descriptions, reasons, the portal lock, the default victory', async ({ page }) => {
    const errors = errorsOf(page);
    await openRandomSetup(page);
    const types = page.locator('[data-testid^="random-type-"][role="radio"]');
    const ids = await types.evaluateAll((els) => els.map((e) => e.getAttribute('data-testid')!.replace('random-type-', '')));
    expect(ids.slice(-2)).toEqual(['shattered_crown', 'serpent_straits']);
    expect(ids).toHaveLength(11);
    const pics = await decoded(page, '[data-testid="random-type"]');
    expect(pics.total).toBe(11);
    expect(pics.broken).toEqual([]);
    for (const id of ['shattered_crown', 'serpent_straits']) {
      await expect(page.getByTestId(`random-type-${id}`)).toContainText(id === 'shattered_crown' ? 'The Shattered Crown' : 'The Serpent Straits');
      await expect(page.getByTestId(`random-type-${id}-ships`)).toHaveText('Ships required');
      const src = await page.getByTestId(`random-type-${id}`).locator('img').getAttribute('src');
      expect(src).toContain(`naval-random-v1/${id.replace('_', '-')}-card.png`);
    }
    await page.getByTestId('random-type-serpent_straits').scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${OUT}/chooser-cards.png` });

    // The Shattered Crown: Huge only, 2 / 3 / 6 empires, hold the relic 7 days by default, portals locked.
    await page.getByTestId('random-type-shattered_crown').click();
    await expect(page.getByTestId('random-type-shattered_crown')).toHaveAttribute('aria-checked', 'true');
    const detail = page.getByTestId('random-type-detail');
    await expect(detail).toContainText('Separate island kingdoms surround the broken Crown.');
    await expect(page.getByTestId('random-naval-description')).toContainText('Thirteen islands and no land between them');
    await expect(page.getByTestId('random-naval-detail')).toContainText('Ships required');
    await expect(page.getByTestId('random-naval-ready')).toContainText('Hero ships are ready');
    await expect(page.getByTestId('random-size-huge')).toHaveAttribute('aria-checked', 'true');
    for (const size of ['small', 'medium', 'large']) {
      await expect(page.getByTestId(`random-size-${size}`)).toBeDisabled();
      await expect(page.getByTestId(`random-size-${size}`)).toHaveAttribute('title', /Huge only/);
    }
    for (const n of ['4', '5']) {
      await expect(page.getByTestId(`random-count-${n}`).first()).toBeDisabled();
      await expect(page.getByTestId(`random-count-${n}`).first()).toHaveAttribute('title', /2, 3 or 6 empires/);
    }
    await expect(page.getByTestId('random-portals-lock')).toContainText('Ships connect these islands.');
    await expect(page.getByTestId('random-portals-lock').getByRole('switch')).toBeDisabled();
    await expect(page.getByTestId('random-portals-lock').getByRole('switch')).toHaveAttribute('aria-checked', 'false');
    await detail.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${OUT}/selected-shattered-crown.png` });
    await page.getByTestId('random-chapter-rules').click();
    await expect(page.getByTestId('random-victory-hold_relic')).toHaveAttribute('aria-checked', 'true');
    await expect(page.getByTestId('random-relic-days-7')).toHaveAttribute('aria-checked', 'true');
    await page.getByTestId('random-chapter-land').click();

    // The Serpent Straits: a duel (2 empires), elimination by default.
    await page.getByTestId('random-type-serpent_straits').click();
    await expect(page.getByTestId('random-type-serpent_straits')).toHaveAttribute('aria-checked', 'true');
    await expect(page.getByTestId('random-naval-description')).toContainText('A naval duel');
    for (const n of ['3', '4', '5', '6']) await expect(page.getByTestId(`random-count-${n}`).first()).toBeDisabled();
    await expect(page.getByTestId('random-portals-lock')).toContainText('Ships connect these islands.');
    await page.getByTestId('random-type-detail').scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${OUT}/selected-serpent-straits.png` });
    await page.getByTestId('random-chapter-rules').click();
    await expect(page.getByTestId('random-victory-elimination')).toHaveAttribute('aria-checked', 'true');
    await page.getByTestId('random-chapter-land').click();

    // Seat reasons: with four empires chosen on a land layout, both naval cards are disabled with their reason
    // and the count stays four.
    await page.getByTestId('random-type-continental').click();
    await page.getByTestId('random-count-4').first().click();
    await expect(page.getByTestId('random-type-shattered_crown')).toHaveAttribute('aria-disabled', 'true');
    await expect(page.getByTestId('random-type-shattered_crown')).toContainText('For 2, 3 or 6 empires');
    await expect(page.getByTestId('random-type-serpent_straits')).toContainText('For 2 empires');
    await page.getByTestId('random-type-shattered_crown').click({ force: true });
    await expect(page.getByTestId('random-type-continental')).toHaveAttribute('aria-checked', 'true');
    await expect(page.getByTestId('random-count-4').first()).toHaveAttribute('aria-checked', 'true');
    // Three empires: The Shattered Crown is available again, The Serpent Straits still not.
    await page.getByTestId('random-count-3').first().click();
    await expect(page.getByTestId('random-type-shattered_crown')).not.toHaveAttribute('aria-disabled', 'true');
    await expect(page.getByTestId('random-type-serpent_straits')).toHaveAttribute('aria-disabled', 'true');
    // Six empires: unowned "Both" is disabled with its reason on The Shattered Crown.
    await page.getByTestId('random-count-6').first().click();
    await page.getByTestId('random-type-shattered_crown').click();
    await expect(page.getByTestId('random-unowned-both')).toBeDisabled();
    await expect(page.getByTestId('random-unowned-both')).toHaveAttribute('title', /Two unowned towns/);
    expect(realErrors(errors)).toEqual([]);
  });

  for (const type of ['shattered_crown', 'serpent_straits'] as const) {
    test(`${type}: Create World shows the loading painting and opens the adventure map with the naval rule and the starting ships`, async ({ page }) => {
      const errors = errorsOf(page);
      await openRandomSetup(page);
      await page.getByTestId(`random-type-${type}`).click();
      const s = await startNaval(page, `loading-${type}.png`);
      const m = s.state.customMission;
      expect(m.id).toMatch(new RegExp(`^random_huge_2p_\\d+_${type}-2p-`));
      expect(m.navalPolicy).toMatchObject({ id: 'naval_only_v1', portals: false, interIslandTravel: 'ships_only', requiredFeature: 'navalMovementV1' });
      expect(m.sites.some((x: { kind: { type: string } }) => x.kind.type === 'portal' || x.kind.type === 'sluice')).toBe(false);
      expect(s.state.scenario.features.navalMovementV1).toBe(true);
      expect(s.state.world.map.generatorVersion).toBe('pr-naval-templates-1');
      expect(s.state.world.map.biome).toBe(type === 'shattered_crown' ? 'coast' : 'fjord');
      if (type === 'shattered_crown') expect(m.victoryCondition).toMatchObject({ type: 'hold_site', siteId: 'relic', days: 7 });
      else expect(m.victoryCondition).toEqual({ type: 'elimination' });
      const ships = s.state.world.ships as Record<string, { ownerId: string | null; heroId: string | null; state: string; coord: { q: number; r: number } }>;
      expect(ships['start_ship_1']).toMatchObject({ ownerId: 'player', heroId: null, state: 'empty' });
      expect(ships['start_ship_2']).toMatchObject({ ownerId: 'p2', heroId: null, state: 'empty' });
      // The leader stands at its town's gate, two hexes at most from its own ship.
      const town = s.state.towns['town_1'];
      const hero = s.state.heroes['leader_1'];
      expect(near(hero.position, town.coord)).toBe(1);
      expect(near(hero.position, ships['start_ship_1']!.coord)).toBeLessThanOrEqual(2);
      await page.waitForTimeout(1500);
      await page.screenshot({ path: `${OUT}/adventure-start-${type}.png` });
      expect(realErrors(errors)).toEqual([]);
    });
  }

  test('seed minimaps: three revealed maps of each type, every one with its naval rule', async ({ page }) => {
    test.setTimeout(900_000);
    for (const type of ['shattered_crown', 'serpent_straits'] as const) {
      for (let k = 1; k <= 3; k++) {
        await openRandomSetup(page);
        await page.getByTestId(`random-type-${type}`).click();
        await page.getByRole('switch', { name: 'Revealed map' }).click();
        const s = await startNaval(page);
        expect(s.state.customMission.navalPolicy.portals).toBe(false);
        const seed = s.state.world.map.seed;
        const minimap = page.locator('.adv-minimap').first();
        await expect(minimap).toBeVisible({ timeout: 30_000 });
        await page.waitForTimeout(1200);
        await minimap.screenshot({ path: `${OUT}/minimap-${type}-${k}-seed${seed}.png` });
      }
    }
  });
});
