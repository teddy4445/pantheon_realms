import type { Page } from '@playwright/test';

/** Read-only snapshot exposed only with ?e2e (no commands are exposed). */
export interface Inspect {
  screen: string;
  overlays: string[];
  /** Story scenes waiting in the dialogue window (keys). */
  story: string[];
  /** Contextual tips waiting to be shown. */
  hints: string[];
  /** Big moments waiting or shown (miracle cards, new-week banners). */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  moments: any[];
  busy: boolean;
  humanTurn: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  state: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  campaign: any;
}

export const inspect = (page: Page): Promise<Inspect> => page.evaluate(() => (globalThis as unknown as { __prInspect: () => Inspect }).__prInspect());

/** Read a story scene to its end through the dialogue window (Continue). Returns the lines' text. */
export async function readStory(page: Page): Promise<string[]> {
  const seen: string[] = [];
  for (let i = 0; i < 20; i++) {
    const box = page.getByTestId('story-dialogue');
    if (!(await box.isVisible().catch(() => false))) break;
    seen.push((await box.locator('.story-box__text p').textContent().catch(() => '')) ?? '');
    await page.getByTestId('story-continue').click();
    await page.waitForTimeout(120);
  }
  return seen;
}

/**
 * Poll the read-only inspector until `pred` holds. Story scenes never change
 * play, so unless `keepStory` is set, any scene that opens while waiting is
 * read to its end with Continue (as a player would) so it does not cover the
 * screen the test waits for.
 */
export async function waitFor(page: Page, pred: (s: Inspect) => boolean, label: string, ms = 20_000, keepStory = false): Promise<Inspect> {
  const t0 = Date.now();
  let last: Inspect | null = null;
  while (Date.now() - t0 < ms) {
    last = await inspect(page);
    if (pred(last)) return last;
    if (!keepStory && last.story.length > 0) await readStory(page);
    await page.waitForTimeout(150);
  }
  throw new Error(`Timed out waiting for ${label} (screen=${last?.screen}, overlays=${last?.overlays.join(',')})`);
}

/** Click the center of an adventure-map hex through the real canvas input path. */
export async function clickHex(page: Page, q: number, r: number, button: 'left' | 'right' = 'left'): Promise<void> {
  let p: { x: number; y: number } | null = null;
  for (let i = 0; i < 30 && !p; i++) {
    p = await page.evaluate(([a, b]) => (globalThis as unknown as { __prProject: (k: string, a: number, b: number) => { x: number; y: number } | null }).__prProject('adventure', a!, b!), [q, r]);
    if (!p) await page.waitForTimeout(100);
  }
  if (!p) throw new Error(`Hex ${q},${r} is not on screen`);
  await page.mouse.move(p.x, p.y);
  await page.waitForTimeout(60);
  await page.mouse.down({ button });
  await page.mouse.up({ button });
  await page.waitForTimeout(200);
}

export async function startCampaign(page: Page): Promise<void> {
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await page.getByTestId('menu-new').click();
  await page.getByTestId('mode-campaign').click();
  await page.getByTestId('scenario-three_beacons').click();
  await page.getByTestId('setup-begin').click();
  await page.getByTestId('briefing-begin').click();
  await waitFor(page, (s) => s.screen === 'adventure' && s.overlays.length === 0, 'adventure map');
}

export async function endDay(page: Page): Promise<void> {
  const before = await inspect(page);
  await page.getByTestId('end-day').click();
  await page.waitForTimeout(200);
  if ((await inspect(page)).overlays.includes('confirm')) await page.getByTestId('confirm-ok').click();
  await waitFor(page, (s) => s.humanTurn && s.state.day > before.state.day && !s.busy, 'next day', 30_000);
}
