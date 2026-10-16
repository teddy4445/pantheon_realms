import { expect, test, type Browser, type Page } from '@playwright/test';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { inspect, waitFor } from './helpers';
import { importAndLoad } from './fixtures';
import { loadCatalog } from '@pr/content';
import { PANTHEONS, recruitFixture, writeFixture, type RecruitSetup } from './recruitFixtures';

/**
 * Recruitment redesign (handoff 2026-10-14): all six pantheons, the approved layout at the four
 * desktop sizes without scrolling panels, the narrow views, a large interface scale, the
 * variant rules (no dwelling, base only, upgraded, shared pool) and Recruit all as ONE
 * atomic batch with no confirmation.
 */

test.use({ actionTimeout: 20_000 });

const SHOTS = process.env.PR_SHOTS ?? join(tmpdir(), 'pr-recruit-shots');
const SIZES = [
  [1280, 720],
  [1366, 768],
  [1600, 900],
  [1920, 1080],
] as const;

/** A fresh browser context per fixture (each import lands in the first save slot). */
async function openRecruitment(browser: Browser, pantheon: string, setup: RecruitSetup = {}, size: readonly [number, number] = [1920, 1080]) {
  const f = recruitFixture(pantheon, setup);
  const ctx = await browser.newContext({ viewport: { width: size[0], height: size[1] } });
  ctx.setDefaultTimeout(20_000);
  const page = await ctx.newPage();
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await importAndLoad(page, writeFixture(f, `recruit ${pantheon}`));
  await waitFor(page, (s) => s.screen === 'adventure' && s.humanTurn && !s.busy, 'map');
  await page.getByTestId(`town-tab-${f.townId}`).click();
  await waitFor(page, (s) => s.screen === 'town', 'town');
  await page.getByTestId('town-recruit').click();
  await waitFor(page, (s) => s.screen === 'recruitment', 'recruitment');
  await expect(page.getByTestId('recruit-figure')).toBeVisible();
  // The stage strip and portraits decode.
  await page.waitForTimeout(700);
  return { f, page };
}

/** Nothing essential outside the window, and no panel scrolls (desktop sizes). */
async function fitsWithoutScrolling(page: Page) {
  const vp = page.viewportSize()!;
  const r = await page.evaluate(() => {
    const q = (s: string) => document.querySelector(s) as HTMLElement | null;
    const over = (el: HTMLElement | null) => (el ? el.scrollHeight - el.clientHeight : 0);
    const box = (s: string) => {
      const el = q(s);
      if (!el) return null;
      const b = el.getBoundingClientRect();
      return { l: b.left, t: b.top, r: b.right, b: b.bottom };
    };
    return {
      rr: over(q('.rr')),
      detail: over(q('.rr-detail')),
      train: over(q('.rr-train')),
      body: over(q('.ak-recruit-stage .ak-body')),
      boxes: ['[data-testid="recruit-confirm"]', '[data-testid="recruit-all"]', '[data-testid="train-panel"]', '.rr-army', '[data-testid="recruit-tier-1"]', '[data-testid="recruit-tier-7"]', '.rr-medal', '[data-testid="recruit-back"]'].map((s) => ({ s, b: box(s) })),
      tabs: getComputedStyle(q('.rr-views')!).display,
      textMin: Math.min(...[...document.querySelectorAll('.rr-detail, .rr-detail *, .rr-dock .rr-all__sub, .rr-tier__pool')].filter((e) => (e as HTMLElement).innerText?.trim()).map((e) => parseFloat(getComputedStyle(e).fontSize))),
    };
  });
  expect(r.tabs).toBe('none');
  expect(r.rr).toBeLessThanOrEqual(1);
  expect(r.detail).toBeLessThanOrEqual(1);
  expect(r.train).toBeLessThanOrEqual(1);
  expect(r.body).toBeLessThanOrEqual(1);
  for (const { s, b } of r.boxes) {
    expect(b, s).not.toBeNull();
    expect(b!.l, s).toBeGreaterThanOrEqual(0);
    expect(b!.t, s).toBeGreaterThanOrEqual(0);
    expect(b!.r, s).toBeLessThanOrEqual(vp.width + 0.5);
    expect(b!.b, s).toBeLessThanOrEqual(vp.height + 0.5);
  }
  expect(r.textMin).toBeGreaterThanOrEqual(14);
}

/** The figure: whole silhouette inside the stage, prominent, feet near the ground line. */
async function figureFits(page: Page) {
  const f = await page.evaluate(() => {
    const stage = document.querySelector('[data-testid="recruit-stage"]') as HTMLElement;
    const unit = document.querySelector('[data-testid="recruit-figure"]') as HTMLElement;
    const sb = stage.getBoundingClientRect();
    const ub = unit.getBoundingClientRect();
    return { sw: sb.width, sh: sb.height, uw: ub.width, uh: ub.height, native: stage.dataset.native, bg: unit.style.backgroundImage };
  });
  expect(f.native).toBe('true');
  expect(f.bg).toContain('recruitment-route-v1/creatures/');
  return f;
}

test('all six pantheons: seven dwellings, both forms with their own art, the upgraded form first where it stands', async ({ browser }) => {
  test.setTimeout(900_000);
  for (const p of PANTHEONS) {
    const { f, page } = await openRecruitment(browser, p);
    await expect(page.locator('.rr-tier')).toHaveCount(7);
    // Tier 1 has its upgraded dwelling: the upgraded form is selected on entry; both medallions open.
    const t1 = f.tiers[0]!;
    await expect(page.getByTestId(`recruit-${t1.upgraded}`)).toHaveAttribute('aria-checked', 'true');
    await expect(page.getByTestId(`recruit-${t1.base}`)).toHaveAttribute('aria-disabled', 'false');
    await figureFits(page);
    const bg1 = await page.getByTestId('recruit-figure').evaluate((e) => (e as HTMLElement).style.backgroundImage);
    expect(bg1).toContain(`/creatures/${t1.upgraded}.idle.png`);
    // Explicit base choice is kept while the quantity and destination change.
    await page.getByTestId(`recruit-${t1.base}`).click();
    await expect(page.getByTestId(`recruit-${t1.base}`)).toHaveAttribute('aria-checked', 'true');
    await page.locator('.recruit-detail').getByRole('button', { name: 'Max' }).click();
    await page.getByTestId('recruit-dest-garrison').click();
    await expect(page.getByTestId(`recruit-${t1.base}`)).toHaveAttribute('aria-checked', 'true');
    expect(await page.getByTestId('recruit-figure').evaluate((e) => (e as HTMLElement).style.backgroundImage)).toContain(`/creatures/${t1.base}.idle.png`);
    // Tier 2 has only its base dwelling: base selected, upgraded locked with its requirement; training locked.
    const t2 = f.tiers[1]!;
    await page.getByTestId('recruit-tier-2').click();
    await expect(page.getByTestId(`recruit-${t2.base}`)).toHaveAttribute('aria-checked', 'true');
    await expect(page.getByTestId(`recruit-${t2.upgraded}`)).toHaveAttribute('aria-disabled', 'true');
    await expect(page.getByTestId(`recruit-${t2.upgraded}`)).toHaveAttribute('aria-label', /locked: requires/);
    await page.getByTestId(`recruit-${t2.upgraded}`).click({ force: true });
    await expect(page.getByTestId(`recruit-${t2.base}`)).toHaveAttribute('aria-checked', 'true');
    await expect(page.getByTestId('train-locked')).toContainText('Requires');
    // Tier 4: no dwelling — the card is locked, the reason names the building, nothing to buy.
    await page.getByTestId('recruit-tier-4').click();
    await expect(page.getByTestId('recruit-tier-4')).toHaveClass(/is-locked/);
    await expect(page.getByTestId('recruit-reason')).toContainText('Build the');
    await expect(page.getByTestId('recruit-confirm')).toBeDisabled();
    // Every tier shows its own creature (never another pantheon's), base and upgraded.
    for (const t of f.tiers) {
      await page.getByTestId(`recruit-tier-${t.tier}`).click();
      const bg = await page.getByTestId('recruit-figure').evaluate((e) => (e as HTMLElement).style.backgroundImage);
      expect(bg.includes(`/creatures/${t.upgraded}.idle.png`) || bg.includes(`/creatures/${t.base}.idle.png`), `${p} tier ${t.tier}`).toBe(true);
    }
    await page.getByTestId('recruit-tier-1').click();
    await page.getByTestId(`recruit-${t1.upgraded}`).click();
    await page.mouse.move(5, 5);
    await page.screenshot({ path: join(SHOTS, `recruit-${p}-1920x1080.png`) });
    await page.context().close();
  }
});

test('the approved layout fits 1280×720, 1366×768, 1600×900 and 1920×1080 without scrolling panels', async ({ browser }) => {
  test.setTimeout(600_000);
  for (const size of SIZES) {
    const { page } = await openRecruitment(browser, 'greek', { secondHero: true }, size);
    await fitsWithoutScrolling(page);
    // A two-hex creature and a winged one stay whole on the stage.
    await page.mouse.move(5, 5);
    await page.screenshot({ path: join(SHOTS, `recruit-greek-${size[0]}x${size[1]}.png`) });
    await page.context().close();
  }
});

test('large creatures: humanoid, winged, mounted and two-hex forms stand whole and grounded', async ({ browser }) => {
  test.setTimeout(300_000);
  const { f, page } = await openRecruitment(browser, 'greek', { levels: [2, 2, 2, 2, 2, 2, 2] }, [1366, 768]);
  for (const t of f.tiers) {
    await page.getByTestId(`recruit-tier-${t.tier}`).click();
    const fit = await figureFits(page);
    // The stage scale fills most of the height or the width (the visible union, not the frame).
    expect(Math.max(fit.uh / fit.sh, fit.uw / fit.sw)).toBeGreaterThan(0.5);
    await page.mouse.move(5, 5);
    await page.screenshot({ path: join(SHOTS, `recruit-greek-tier${t.tier}-1366x768.png`) });
  }
});

test('narrow window: Creature / Recruit / Train views over a persistent action dock; a large interface scale uses them too', async ({ browser }) => {
  test.setTimeout(300_000);
  const { page } = await openRecruitment(browser, 'norse', {}, [1000, 720]);
  await expect(page.locator('.rr-views')).toBeVisible();
  await expect(page.getByTestId('recruit-confirm-dock')).toBeVisible();
  await expect(page.getByTestId('recruit-all')).toBeVisible();
  await page.screenshot({ path: join(SHOTS, 'recruit-narrow-creature.png') });
  await page.getByTestId('recruit-view-recruit').click();
  await expect(page.getByTestId('recruit-confirm')).toBeVisible();
  await page.screenshot({ path: join(SHOTS, 'recruit-narrow-recruit.png') });
  await page.getByTestId('recruit-view-train').click();
  await expect(page.getByTestId('train-panel')).toBeVisible();
  await page.screenshot({ path: join(SHOTS, 'recruit-narrow-train.png') });
  // Seven tiers reachable: four over three.
  const rows = await page.locator('.rr-tier').evaluateAll((els) => new Set(els.map((e) => Math.round(e.getBoundingClientRect().top))).size);
  expect(rows).toBe(2);

  // A large interface scale at a desktop size.
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.getByTestId('recruit-back').click();
  await page.keyboard.press('Escape');
  await waitFor(page, (s) => s.screen === 'adventure', 'map');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: /Settings/ }).click();
  await page.getByTestId('settings-tab-interface').click();
  await page.getByLabel('Interface scale').fill('1.45');
  await page.getByTestId('settings-apply').click();
  await page.getByRole('button', { name: 'Back' }).first().click();
  await waitFor(page, (s) => s.screen === 'adventure', 'map again');
  const town = (await inspect(page)).state.towns;
  const tid = Object.keys(town).find((k) => town[k].ownerId === 'player')!;
  await page.getByTestId(`town-tab-${tid}`).click();
  await page.getByTestId('town-recruit').click();
  await waitFor(page, (s) => s.screen === 'recruitment', 'recruitment');
  await page.waitForTimeout(600);
  await expect(page.locator('.rr-views')).toBeVisible();
  await page.screenshot({ path: join(SHOTS, 'recruit-uiscale-145-1366x768.png') });
});

test('Recruit all: one batch across every family, one form per pool, exact spend, no confirmation; blocked as a whole with a reason', async ({ browser }) => {
  test.setTimeout(400_000);
  const { f, page } = await openRecruitment(browser, 'greek', { levels: [2, 1, 2, 0, 1, 0, 0], pools: [14, 9, 6, 4, 3, 2, 1] }, [1600, 900]);
  const before = await inspect(page);
  const wallet0 = { ...before.state.players.player.wallet };
  const summary = await page.getByTestId('recruit-all-summary').innerText();
  // 14 + 9 + 6 + 3 (tier 4 has no dwelling; tiers 6–7 none).
  expect(summary).toContain('32');
  // Hover shows the breakdown per family and form.
  await page.getByTestId('recruit-all').hover();
  await expect(page.locator('.rr-all__breakdown')).toBeVisible();
  await page.screenshot({ path: join(SHOTS, 'recruit-all-breakdown.png') });
  await page.getByTestId('recruit-all').click();
  const after = await waitFor(page, (s) => s.state.revision > before.state.revision, 'batch applied');
  expect(after.overlays).not.toContain('confirm');
  expect(after.state.revision).toBe(before.state.revision + 1);
  const town = after.state.towns[f.townId];
  for (const t of f.tiers.slice(0, 3)) expect(town.population[t.familyId]).toBe(0);
  expect(town.population[f.tiers[3]!.familyId]).toBe(4);
  // Exact spend: the price of each form recruited (upgraded where its dwelling stands).
  const cost = (id: string) => f.catalog.creatures[id]!.cost as Record<string, number>;
  const expected: Record<string, number> = {};
  const add = (id: string, n: number) => {
    for (const [k, v] of Object.entries(cost(id))) expected[k] = (expected[k] ?? 0) + v * n;
  };
  add(f.tiers[0]!.upgraded, 14);
  add(f.tiers[1]!.base, 9);
  add(f.tiers[2]!.upgraded, 6);
  add(f.tiers[4]!.base, 3);
  for (const k of Object.keys(wallet0)) expect(after.state.players.player.wallet[k], k).toBe(wallet0[k] - (expected[k] ?? 0));
  await expect(page.getByTestId('recruit-all')).toBeDisabled();

  // Not enough gold for the whole batch: disabled with the shortfall; nothing partial.
  const short = (await openRecruitment(browser, 'greek', { wallet: { gold: 300 } }, [1600, 900])).page;
  await expect(short.getByTestId('recruit-all')).toBeDisabled();
  await expect(short.getByTestId('recruit-all-reason')).toContainText('Short');
  await expect(short.getByTestId('recruit-confirm')).toBeEnabled();
  await short.screenshot({ path: join(SHOTS, 'recruit-all-short-gold.png') });

  // A full army: needs more slots.
  const cat = loadCatalog();
  const norse = Object.values(cat.families).filter((x) => cat.creatures[x.baseCreatureId]?.pantheonId === 'norse').slice(0, 7);
  const full = norse.map((x) => ({ creatureId: x.baseCreatureId, count: 1 }));
  expect(full).toHaveLength(7);
  const crowded = (await openRecruitment(browser, 'greek', { heroArmy: full }, [1600, 900])).page;
  await expect(crowded.getByTestId('recruit-all-reason')).toContainText('more army slot');
});

test('edge cases: no visiting hero, zero stock, one shared pool, special-resource costs', async ({ browser }) => {
  test.setTimeout(300_000);
  const { f, page } = await openRecruitment(browser, 'egyptian', { noHero: true, levels: [2, 1, 2, 0, 1, 2, 2], pools: [0, 9, 6, 4, 3, 2, 1] }, [1366, 768]);
  // No visiting hero: the garrison is the only destination.
  await expect(page.locator('.rr-dest__opt')).toHaveCount(1);
  await expect(page.getByTestId('recruit-dest-name')).toContainText('garrison');
  // Zero stock behind an open dwelling: "0 available" (not a lock), quantity 0, Recruit off with the reason.
  await expect(page.getByTestId('recruit-tier-1')).toContainText('0 available');
  await expect(page.getByTestId('recruit-tier-1')).not.toHaveClass(/is-locked/);
  await expect(page.getByTestId('recruit-available')).toContainText('0 available');
  await expect(page.locator('.recruit-detail .qty__value')).toHaveText('0');
  await expect(page.getByTestId('recruit-confirm')).toBeDisabled();
  await expect(page.getByTestId('recruit-reason')).toContainText('None available');
  await page.screenshot({ path: join(SHOTS, 'recruit-zero-stock-no-hero.png') });
  // One pool for both forms: two of the base form leave four for the upgraded one.
  const t3 = f.tiers[2]!;
  await page.getByTestId('recruit-tier-3').click();
  await page.getByTestId(`recruit-${t3.base}`).click();
  await page.locator('.recruit-detail').getByRole('button', { name: /Increase/ }).click();
  const rev = (await inspect(page)).state.revision;
  await page.getByTestId('recruit-confirm').click();
  await waitFor(page, (s) => s.state.revision > rev, 'recruited');
  await page.getByTestId(`recruit-${t3.upgraded}`).click();
  await expect(page.getByTestId('recruit-available')).toContainText('4 available');
  await expect(page.getByTestId('recruit-tier-3')).toContainText('4 available');
  // A form that costs more than gold shows every resource of its price.
  const special = f.tiers.find((t) => Object.keys(f.catalog.creatures[t.upgraded]!.cost).some((k) => k !== 'gold') && t.tier >= 6);
  if (special) {
    await page.getByTestId(`recruit-tier-${special.tier}`).click();
    for (const k of Object.keys(f.catalog.creatures[special.upgraded]!.cost)) await expect(page.locator(`.rr-facts__cost [data-icon="${k}"]`)).toHaveCount(1);
    await page.screenshot({ path: join(SHOTS, 'recruit-special-resources.png') });
  }
  await page.context().close();
});

