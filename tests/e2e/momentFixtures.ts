/**
 * Fixtures and probes for the big-moment UI tests (bigMoments.spec.ts and the
 * opt-in review sweep zz-moments-review.spec.ts). Saves are ordinary save
 * files built headlessly and imported through Load → Import; the probe only
 * observes the page (a MutationObserver), it never changes game state.
 */
import { expect, type Page } from '@playwright/test';
import { GameDriver } from '@pr/testing';
import { processCommand, type GameCommand } from '@pr/rules';
import { waitFor, type Inspect } from './helpers';
import { approachTile, slots, writeSave } from './fixtures';

export const PREFS_KEY = 'pantheon-realms.preferences.v1';

/** Preferences for this page (as if chosen in Settings earlier): applied before the game starts. */
export async function usePrefs(page: Page, prefs: Record<string, unknown>): Promise<void> {
  await page.addInitScript(([k, v]) => localStorage.setItem(k!, v!), [PREFS_KEY, JSON.stringify({ tutorialHints: false, ...prefs })]);
}

export const leaderOf = (d: GameDriver) => Object.values(d.state.heroes).find((h) => h.ownerId === 'player' && h.status === 'active')!;

/** The player's leader next to the gold mine's guards, attacking (headless). */
export function goldBattleDriver(missionId: string, name: string, army: [string, number][], favor = 0): GameDriver {
  const d = GameDriver.mission(missionId, { matchId: `e2e-${name}` });
  for (const fog of Object.values(d.state.fog)) fog.explored = fog.explored.map(() => 1);
  const gold = d.catalog.missions[missionId]!.sites.find((x) => x.id === 'sk_gold')!.coord;
  const h = leaderOf(d);
  h.army.slots = slots(army);
  h.position = approachTile(d, gold, h.id);
  h.movementPoints = 3000;
  d.player.wallet.favor = favor;
  d.do({ kind: 'MoveHero', heroId: h.id, destination: gold, confirmEncounter: true });
  expect(d.state.battle).toBeTruthy();
  return d;
}

export const STRONG: [string, number][] = [['cyclops', 40], ['cyclops', 40]];
export const WEAK: [string, number][] = [['hoplite', 1]];

export function goldBattle(missionId: string, name: string, army: [string, number][], favor = 0): { d: GameDriver; file: string } {
  const d = goldBattleDriver(missionId, name, army, favor);
  return { d, file: writeSave(d, name) };
}

/**
 * A save at the end of day 7 in which the player ends the day last, so the
 * week's draw follows from the saved state and the End Day click alone; the
 * progression seed is chosen headlessly (same command) to draw `eventId`
 * (null: weekly events switched off — the default banner).
 */
export function weekDawnDriver(missionId: string, eventId: string | null, name: string): { d: GameDriver; snapshot: string } {
  const d = GameDriver.mission(missionId, { matchId: `e2e-${name}` });
  d.state.towns['westharbor']!.garrison.slots[0] = { stackId: 'test_guard', creatureId: 'cyclops', count: 40 };
  while (d.state.day < 7) d.do({ kind: 'EndTurn' }, d.state.activePlayerId);
  d.state.playerOrder = [...d.state.playerOrder.filter((p) => p !== 'player'), 'player'];
  d.state.activePlayerId = 'player';
  for (const h of Object.values(d.state.heroes)) {
    if (h.ownerId === 'player') h.movementPoints = 0;
    // The rival keeps its town but has no heroes out, so its next turn is short.
    else if (!h.monster) h.status = 'defeated';
  }
  if (eventId === null) {
    d.state.scenario.features = { expandedContent: true, interventions: true, ...d.state.scenario.features, weeklyEvents: false };
  } else {
    const snap = JSON.stringify(d.state);
    let seed = 0;
    for (let i = 1; i < 2000 && !seed; i++) {
      const st = JSON.parse(snap);
      st.rng.progression = i;
      const r = processCommand({ catalog: d.catalog }, st, { kind: 'EndTurn', commandId: `probe${i}`, expectedRevision: st.revision, actorPlayerId: 'player' } as GameCommand);
      if (r.ok && r.state.world.weeklyEventId === eventId) seed = i;
    }
    expect(seed, `a seed drawing ${eventId}`).toBeGreaterThan(0);
    d.state.rng.progression = seed;
  }
  return { d, snapshot: JSON.stringify(d.state) };
}

export async function toHumanBattleTurn(page: Page): Promise<Inspect> {
  const s = await waitFor(page, (x) => x.screen === 'battle' && !!x.state.battle, 'battle', 20_000);
  if (s.state.battle.phase === 'deployment') await page.getByTestId('deploy-confirm').click();
  return waitFor(page, (x) => x.screen === 'battle' && x.humanTurn && !x.busy && x.state.battle?.phase !== 'deployment', 'the player’s turn', 30_000);
}

export async function finishBattle(page: Page): Promise<Inspect> {
  await page.getByTestId('battle-auto').click();
  return waitFor(page, (x) => x.screen === 'battle-result', 'battle result', 90_000);
}

export async function clickBattleCell(page: Page, col: number, row: number): Promise<void> {
  let p: { x: number; y: number } | null = null;
  for (let i = 0; i < 30 && !p; i++) {
    p = await page.evaluate(([c, r]) => (globalThis as unknown as { __prProject: (k: string, a: number, b: number) => { x: number; y: number } | null }).__prProject('battle', c!, r!), [col, row]);
    if (!p) await page.waitForTimeout(100);
  }
  if (!p) throw new Error(`cell ${col},${row} not on screen`);
  await page.mouse.click(p.x, p.y);
}

export async function imagesLoaded(page: Page): Promise<string[]> {
  return page.evaluate(async () => {
    const imgs = [...document.querySelectorAll('img')];
    await Promise.all(imgs.map((i) => (i.complete ? null : new Promise((r) => { i.onload = r; i.onerror = r; }))));
    return imgs.filter((i) => i.naturalWidth === 0).map((i) => i.getAttribute('src') ?? '?');
  });
}

/** What the probe saw when a moment appeared (measured in the page at that moment) and when it went. */
export interface MomentSighting {
  testId: string;
  asset: string | null;
  text: string;
  shownAt: number;
  goneAt: number | null;
  animation: string;
  /** Miracle cards: painting width / height and height in px; plate height / painting height; frame corners. */
  artRatio?: number;
  artHeight?: number;
  plateRatio?: number;
  corners?: number;
  /** Banners: whether every text line lies inside the plaque and nothing is clipped (and what is wrong if not). */
  textInPlaque?: boolean;
  textProblems?: string[];
}

/**
 * Watch for miracle cards and new-week banners from now on. In this software-
 * rendered test browser frames take ~0.5 s and the main thread can stall for
 * seconds, so the page records each sighting itself instead of relying on
 * polling from the test.
 */
export async function watchMoments(page: Page): Promise<void> {
  await page.evaluate(() => {
    const w = window as unknown as { __moments: MomentSighting[] };
    if (w.__moments) return;
    w.__moments = [];
    const look = () => {
      for (const id of ['miracle-card', 'new-week-banner']) {
        const el = document.querySelector<HTMLElement>(`[data-testid=${id}]`);
        const open = w.__moments.find((m) => m.testId === id && m.goneAt === null);
        if (el && !open) {
          const s: MomentSighting = { testId: id, asset: el.getAttribute('data-asset') ?? el.querySelector('[data-asset]')?.getAttribute('data-asset') ?? null, text: el.innerText.replace(/\s+/g, ' ').trim(), shownAt: performance.now(), goneAt: null, animation: getComputedStyle(el).animationDuration };
          const art = el.querySelector('.miracle-card__art img')?.getBoundingClientRect();
          const plate = el.querySelector('.miracle-card__plate')?.getBoundingClientRect();
          if (art && plate) {
            s.artRatio = art.width / art.height;
            s.artHeight = art.height;
            s.plateRatio = plate.height / art.height;
            s.corners = el.querySelectorAll('.panel__corner').length;
          }
          const plaque = el.querySelector('.banner-art__plaque')?.getBoundingClientRect();
          if (plaque) {
            s.textProblems = [];
            for (const t of el.querySelectorAll<HTMLElement>('.banner-art__plaque > *')) {
              const r = t.getBoundingClientRect();
              const name = t.className;
              if (r.top < plaque.top - 1 || r.bottom > plaque.bottom + 1) s.textProblems.push(`${name}: ${Math.round(r.top)}–${Math.round(r.bottom)} outside plaque ${Math.round(plaque.top)}–${Math.round(plaque.bottom)}`);
              // Clipped text: more lines than shown (line clamp) or cut off sideways (ellipsis).
              if (t.scrollHeight > t.clientHeight * 1.25) s.textProblems.push(`${name}: clipped lines ${t.scrollHeight}/${t.clientHeight}`);
              if (t.scrollWidth > t.clientWidth + 1) s.textProblems.push(`${name}: clipped width ${t.scrollWidth}/${t.clientWidth}`);
            }
            s.textInPlaque = s.textProblems.length === 0;
          }
          w.__moments.push(s);
        } else if (!el && open) open.goneAt = performance.now();
      }
    };
    new MutationObserver(look).observe(document.body, { childList: true, subtree: true });
    look();
  });
}

export async function sightings(page: Page): Promise<MomentSighting[]> {
  return page.evaluate(() => (window as unknown as { __moments: MomentSighting[] }).__moments ?? []);
}

export async function waitForSighting(page: Page, testId: string, ms = 60_000): Promise<MomentSighting> {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    const hit = (await sightings(page)).find((x) => x.testId === testId);
    if (hit) return hit;
    await page.waitForTimeout(150);
  }
  throw new Error(`no ${testId} appeared`);
}
