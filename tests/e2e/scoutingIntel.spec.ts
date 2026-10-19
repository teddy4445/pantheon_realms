import { mkdirSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { importAndLoad } from './fixtures';
import { clickHex, inspect, waitFor } from './helpers';
import { usePrefs } from './momentFixtures';
import { FOE, HIDDEN_NUMBERS, intelFixture, type IntelFixture } from './intelFixtures';

/**
 * Scouting intel (expedition kit §05/§11, `scoutingIntelV1`) through the real adventure
 * screen: a distant sighting, troops identified, a scout report from a Scouting hero, the
 * LAST KNOWN marker and report after the enemy left vision (it moved and grew unseen), the
 * encounter summary without a quick-battle oracle, and a legacy save that still shows
 * today's full information. Every check reads the DOM — text, aria labels, titles, alt and
 * data attributes — and finds no hidden quantity. Fixtures are ordinary saves brought in
 * through Load → Import (the ?e2e readout is read-only). Screenshots:
 * /home/claude/capture/expedition/scouting/.
 */

const OUT = '/home/claude/capture/expedition/scouting';
mkdirSync(OUT, { recursive: true });

function errorsOf(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  return errors;
}
const realErrors = (errors: string[]) => errors.filter((e) => !/favicon|Failed to load resource/i.test(e));

async function settle(page: Page, ms = 600) {
  await page.evaluate(() => Promise.all(document.getAnimations().filter((a) => a.effect && 'target' in a.effect && a.playState === 'running' && (a.effect.getTiming().iterations ?? 1) !== Infinity).map((a) => a.finished.catch(() => undefined))));
  await page.waitForTimeout(ms);
}

async function open(page: Page, f: IntelFixture) {
  await usePrefs(page, { graphicsTested: true, tutorialHints: false });
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await importAndLoad(page, f.file);
  await waitFor(page, (s) => s.screen === 'adventure' && s.humanTurn && !s.busy && s.overlays.length === 0, 'adventure map', 90_000);
}

/** Everything a player or a screen reader meets under `selector`: text and readable attribute values (no icon path data, no file names). */
async function readable(page: Page, selector: string): Promise<string> {
  return page.evaluate((sel) => {
    const out: string[] = [];
    for (const root of document.querySelectorAll(sel)) {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
      for (let n: Node | null = walker.currentNode; n; n = walker.nextNode()) {
        if (n.nodeType === Node.TEXT_NODE) {
          if (!(n.parentElement && n.parentElement.closest('svg'))) out.push(n.textContent ?? '');
          continue;
        }
        const el = n as Element;
        if (el.closest('svg') && el.tagName.toLowerCase() !== 'svg') continue;
        for (const a of el.getAttributeNames()) {
          if (['class', 'style', 'src', 'href', 'd', 'viewbox', 'points', 'srcset'].includes(a.toLowerCase())) continue;
          out.push(`${a}=${el.getAttribute(a)}`);
        }
      }
    }
    return out.join('\n');
  }, selector);
}

/** No hidden quantity anywhere in the page next to a creature name (resources, days and my own army hold numbers of their own). */
async function expectNoHiddenCountInPage(page: Page) {
  const all = await readable(page, 'body');
  const names = '(Veteran Hoplites?|Hoplites?|Peltasts?)';
  const nums = `(${HIDDEN_NUMBERS.join('|')})`;
  expect(all).not.toMatch(new RegExp(`(^|[^0-9])${nums}\\s+${names}`));
  expect(all).not.toMatch(new RegExp(`${names}[^0-9\\n]{0,4}${nums}([^0-9–]|$)`));
}

/** No hidden quantity under `selector` (none of the rival's real counts at all), and none in the page next to a creature name. */
async function expectNoHiddenCount(page: Page, selector: string) {
  const local = await readable(page, selector);
  for (const n of HIDDEN_NUMBERS) expect(local, `hidden count ${n} under ${selector}`).not.toMatch(new RegExp(`(^|[^0-9–])${n}([^0-9–]|$)`));
  await expectNoHiddenCountInPage(page);
}

async function pin(page: Page, q: number, r: number) {
  await clickHex(page, q, r, 'right');
  await expect(page.locator('.adv-tile')).toBeVisible();
}

test.describe.configure({ timeout: 240_000 });

test('distant sighting: owner banner and one strength band; no creatures, no numbers', async ({ page }) => {
  const errors = errorsOf(page);
  const f = intelFixture('sighting', { me: 16, foe: 21 });
  await open(page, f);
  await pin(page, 21, 7);
  const panel = page.locator('.adv-tile [data-testid="foe-intel"]');
  await expect(panel).toHaveAttribute('data-stage', 'sighting');
  await expect(panel).toContainText('Distant sighting');
  await expect(panel).toContainText('Creatures unknown');
  await expect(panel.getByTestId('foe-intel-strength')).toContainText(/Strength: (Small patrol|Modest force|Substantial force|Large army|Vast army)/);
  await expect(panel.locator('[data-creature]')).toHaveCount(0);
  await expect(page.getByTestId('foe-army')).toHaveCount(0);
  await expect(panel).toHaveAttribute('aria-label', /Distant sighting/);
  await expectNoHiddenCount(page, '.adv-tile');
  await settle(page);
  await page.screenshot({ path: `${OUT}/01-distant-sighting.png` });
  expect(realErrors(errors)).toEqual([]);
});

test('troops identified within 3 hexes: grouped creature types with portraits, every number unknown', async ({ page }) => {
  const errors = errorsOf(page);
  const f = intelFixture('identified', { me: 16, foe: 19 });
  await open(page, f);
  await pin(page, 19, 7);
  const panel = page.locator('.adv-tile [data-testid="foe-intel"]');
  await expect(panel).toHaveAttribute('data-stage', 'identified');
  await expect(panel).toContainText('Troops identified');
  // Two Hoplite stacks are one line; Veteran Hoplites (the upgrade) are their own.
  await expect(panel.locator('[data-creature]')).toHaveCount(3);
  await expect(panel.locator('[data-creature="hoplite"]')).toHaveAttribute('aria-label', 'Hoplites: number unknown');
  await expect(panel.locator('[data-creature="veteran_hoplite"]')).toHaveCount(1);
  await expect(panel.locator('.army-intel__count')).toHaveText(['?', '?', '?']);
  await expectNoHiddenCount(page, '.adv-tile');
  await settle(page);
  await page.screenshot({ path: `${OUT}/02-troops-identified.png` });
  expect(realErrors(errors)).toEqual([]);
});

test('scout report from a Scouting hero: approximate ranges, never the exact counts', async ({ page }) => {
  const errors = errorsOf(page);
  const f = intelFixture('scouted', { me: 16, foe: 19, scouting: 2 });
  await open(page, f);
  await pin(page, 19, 7);
  const panel = page.locator('.adv-tile [data-testid="foe-intel"]');
  await expect(panel).toHaveAttribute('data-stage', 'scouted');
  await expect(panel).toContainText('Scout report');
  await expect(panel.locator('[data-creature="hoplite"]')).toHaveAttribute('aria-label', 'Hoplites: about 20–39');
  await expect(panel.locator('[data-creature="peltast"]')).toHaveAttribute('aria-label', 'Peltasts: about 10–19');
  await expect(panel.locator('[data-creature="veteran_hoplite"]')).toHaveAttribute('aria-label', 'Veteran Hoplites: about 5–9');
  await expectNoHiddenCount(page, '.adv-tile');
  await settle(page);
  await page.screenshot({ path: `${OUT}/03-scout-report.png` });
  expect(realErrors(errors)).toEqual([]);
});

test('last known: the marker stays where the enemy was seen, dated; what it did out of sight never shows', async ({ page }) => {
  const errors = errorsOf(page);
  // Seen at 3 hexes on day 1, then out of sight: it marched east and grew to 311 Hoplites unseen; two days passed.
  const f = intelFixture('last-known', { me: 15, foe: 22, walk: [19, 12], hiddenMove: 28, days: 2 });
  await open(page, f);
  const markers = await page.evaluate(() => (globalThis as unknown as { __prLastKnown: () => unknown }).__prLastKnown());
  expect(markers).toEqual([{ id: FOE, q: 22, r: 7, day: 1 }]);
  await pin(page, 22, 7);
  const panel = page.locator('.adv-tile [data-testid="last-known-intel"]');
  await expect(panel).toHaveAttribute('data-mode', 'last_known');
  await expect(panel.getByTestId('last-known-intel-title')).toHaveText('Last known · Troops identified');
  await expect(panel.getByTestId('last-known-intel-observed')).toHaveText('Last known Week 1 · Day 1 (2 days ago)');
  await expect(panel.locator('[data-creature]')).toHaveCount(3);
  await expectNoHiddenCount(page, '.adv-tile');
  await settle(page);
  await page.screenshot({ path: `${OUT}/04-last-known-marker.png` });
  // Where it really stands (out of sight) the tile shows nothing of it.
  await page.locator('.adv-tile__unpin').click();
  await pin(page, 28, 7).catch(() => undefined);
  if (await page.locator('.adv-tile').isVisible()) {
    await expect(page.locator('.adv-tile [data-testid="foe-intel"], .adv-tile [data-testid="last-known-intel"]')).toHaveCount(0);
    await expect(page.locator('.adv-tile')).not.toContainText('Odysseus');
  }
  await expectNoHiddenCountInPage(page);
  const s = await inspect(page);
  expect(s.state.intel.player[FOE].observedDay).toBe(1);
  expect(realErrors(errors)).toEqual([]);
});

test('encounter summary: the projected report and no quick-battle preview against an army not seen in full', async ({ page }) => {
  const errors = errorsOf(page);
  const f = intelFixture('encounter', { me: 16, foe: 18 });
  await open(page, f);
  await clickHex(page, 18, 7);
  if (!(await inspect(page)).overlays.includes('encounter')) await clickHex(page, 18, 7);
  await waitFor(page, (s) => s.overlays.includes('encounter'), 'encounter dialog', 30_000);
  const dialog = page.getByTestId('encounter');
  await expect(dialog.getByTestId('encounter-intel')).toHaveAttribute('data-stage', 'identified');
  await expect(dialog.getByTestId('quick-battle')).toHaveAttribute('data-status', 'hidden');
  await expect(dialog.getByTestId('encounter-quick')).toBeEnabled();
  await expectNoHiddenCount(page, '[data-testid="encounter"]');
  await settle(page, 900);
  await page.screenshot({ path: `${OUT}/05-encounter-summary.png` });
  await page.getByTestId('encounter-withdraw').click();
  expect(realErrors(errors)).toEqual([]);
});

test('legacy save (no scouting flag): today\'s full information about a visible army, no last-known markers', async ({ page }) => {
  const errors = errorsOf(page);
  const f = intelFixture('legacy', { me: 16, foe: 21, legacy: true });
  await open(page, f);
  await pin(page, 21, 7);
  await expect(page.locator('.adv-tile [data-testid="foe-intel"]')).toHaveCount(0);
  const army = page.locator('.adv-tile [data-testid="foe-army"]');
  await expect(army).toBeVisible();
  await expect(army.getByRole('listitem', { name: '23 Hoplites' })).toBeVisible();
  await expect(army.getByRole('listitem', { name: '6 Veteran Hoplites' })).toBeVisible();
  const markers = await page.evaluate(() => (globalThis as unknown as { __prLastKnown: () => unknown }).__prLastKnown());
  expect(markers).toEqual([]);
  const s = await inspect(page);
  expect(s.state.scenario.features.scoutingIntelV1).toBeUndefined();
  expect(s.state.intel).toBeUndefined();
  await settle(page);
  await page.screenshot({ path: `${OUT}/06-legacy-full-information.png` });
  expect(realErrors(errors)).toEqual([]);
});
