import { expect, test, type Page } from '@playwright/test';
import { clickHex, endDay, inspect, readStory, startCampaign, waitFor, type Inspect } from './helpers';

/**
 * Plays Mission 1 of The Three Beacons to its debrief through the real UI and
 * continues into Mission 2: town build, recruitment, training, both guarded
 * sites, level-ups, the beacon activation, the debrief screen and the
 * Mission 2 briefing. Checks the carryover the headless tests promise.
 */

async function settleAfterBattle(page: Page, onResult?: () => Promise<void>): Promise<Inspect> {
  let s = await waitFor(page, (x) => x.screen === 'battle-result', 'battle result', 120_000);
  expect(s.state.lastBattleResult.winner).toBe('attacker');
  // A story scene triggered by the battle opens over the result.
  await page.waitForTimeout(600);
  if (onResult) await onResult();
  await readStory(page);
  await page.getByTestId('result-continue').click();
  for (let i = 0; i < 4; i++) {
    s = await inspect(page);
    if (s.screen !== 'level-up') break;
    await page.getByTestId('offer-0').click();
    await page.waitForTimeout(500);
  }
  return waitFor(page, (x) => x.screen === 'adventure' && x.overlays.length === 0, 'map after battle');
}

type Hex = { q: number; r: number };
const axial = (a: Hex, b: Hex) => (Math.abs(a.q - b.q) + Math.abs(a.r - b.r) + Math.abs(a.q + a.r - b.q - b.r)) / 2;

/** The destination if explored, else the explored walkable tile closest to it (routes never use unknown tiles). */
function waypoint(s: Inspect, dest: Hex): Hex {
  const map = s.state.world.map;
  const explored: number[] = s.state.fog.player.explored;
  const idx = (c: Hex) => c.r * map.width + c.q;
  if (explored[idx(dest)] === 1) return dest;
  const occupied = new Set([...Object.values(s.state.heroes as Record<string, { position: Hex }>).map((h) => `${h.position.q},${h.position.r}`)]);
  let best: Hex = dest;
  let bestD = Infinity;
  for (let r = 0; r < map.height; r++) {
    for (let q = 0; q < map.width; q++) {
      const c = { q, r };
      const t = map.terrain[idx(c)];
      if (explored[idx(c)] !== 1 || t === 'm' || t === 'w' || occupied.has(`${q},${r}`)) continue;
      const d = axial(c, dest);
      if (d < bestD) {
        bestD = d;
        best = c;
      }
    }
  }
  return best;
}

/** Walk the selected hero to `dest` over several days and fight the guard there. */
async function marchAndFight(page: Page, dest: Hex, label: string, onResult?: () => Promise<void>): Promise<void> {
  for (let i = 0; i < 16; i++) {
    const s = await inspect(page);
    if (s.overlays.includes('encounter') || s.screen === 'battle') break;
    if (s.state.heroes.alexios.movementPoints < 150) {
      await endDay(page);
      continue;
    }
    const before = s.state.heroes.alexios.position;
    const to = waypoint(s, dest);
    await clickHex(page, to.q, to.r);
    await clickHex(page, to.q, to.r);
    await page.waitForTimeout(400);
    const after = await waitFor(page, (x) => !x.busy, 'movement playback', 15_000);
    if (!after.overlays.includes('encounter') && after.state.heroes.alexios.position.q === before.q && after.state.heroes.alexios.position.r === before.r) await endDay(page);
  }
  await waitFor(page, (x) => x.overlays.includes('encounter'), `pre-battle dialog (${label})`);
  await page.getByTestId('encounter-attack').click();
  await waitFor(page, (x) => x.screen === 'battle', `battle screen (${label})`, 15_000);
  // A scene can open as the battle starts (the lighthouse); read it first.
  await page.waitForTimeout(500);
  await readStory(page);
  await page.getByTestId('battle-auto').click();
  await settleAfterBattle(page, onResult);
}

test('Mission 1 to its debrief, then into Mission 2 through the UI', async ({ page }) => {
  test.setTimeout(420_000);
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await page.getByTestId('menu-settings').click();
  await page.getByLabel('Battle speed').selectOption('instant');
  await page.getByTestId('settings-apply').click();
  await startCampaign(page);

  // Asterion: Veteran Barracks, recruit all Hoplites, train at least ten.
  await page.getByTestId('town-tab-asterion').click();
  await page.getByTestId('slot-dwelling_t1').click();
  await page.getByTestId('build').click();
  await waitFor(page, (s) => s.state.towns.asterion.buildings.dwelling_t1 === 2, 'Veteran Barracks');
  await page.getByRole('button', { name: 'Recruit', exact: true }).first().click();
  await page.getByTestId('recruit-hoplite').click();
  await page.locator('.recruit-detail').getByRole('button', { name: 'Max' }).click();
  await page.getByTestId('recruit-confirm').click();
  await waitFor(page, (x) => (x.state.mission.counters['recruited:hoplite'] ?? 0) >= 8, 'recruit counter');
  const row = page.locator('.upgrade-row').first();
  await row.getByRole('button', { name: 'Max' }).click();
  await row.getByRole('button', { name: /^Train \d+/ }).click();
  let s = await waitFor(page, (x) => (x.state.mission.counters['trained:hoplite'] ?? 0) >= 10, 'trained counter');
  expect(s.state.mission.objectives.m01_recruit.status).toBe('completed');
  expect(s.state.mission.objectives.m01_upgrade.status).toBe('completed');
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');
  await waitFor(page, (x) => x.screen === 'adventure', 'back to map');

  // The bridge (its story scene: Continue; no Backlog button), then the lighthouse garrison.
  await marchAndFight(page, { q: 10, r: 7 }, 'ford', async () => {
    const box = page.getByTestId('story-dialogue');
    await expect(box).toBeVisible();
    await expect(box).toContainText('The bridge is ours');
    await page.getByTestId('story-continue').click();
    await expect(box).toContainText('Keep the road watched');
    await expect(page.getByTestId('story-backlog-toggle')).toHaveCount(0);
  });
  s = await inspect(page);
  expect(s.state.world.sites.m01_ford.cleared).toBe(true);
  expect(s.state.mission.scenesPlayed).toContain('m01_bridge_open');
  await marchAndFight(page, { q: 16, r: 7 }, 'beacon');
  s = await inspect(page);
  expect(s.state.world.sites.m01_beacon.cleared).toBe(true);
  expect(s.state.heroes.alexios.position).toEqual({ q: 16, r: 7 });
  expect(s.state.mission.scenesPlayed).toContain('m01_lighthouse_battle');

  // Relight the beacon: click the hero's own tile, confirm the activation.
  await clickHex(page, 16, 7);
  await waitFor(page, (x) => x.overlays.includes('activate'), 'activation dialog');
  await page.getByTestId('activate-confirm').click();
  for (let i = 0; i < 20; i++) {
    s = await inspect(page);
    if (s.overlays.includes('debrief')) break;
    // Victory waits for the quest-XP level-up, which opens by itself (no button on the map).
    expect(await page.getByTestId('levelup-pending').count()).toBe(0);
    if (s.screen === 'level-up') await page.getByTestId('offer-0').click();
    await page.waitForTimeout(500);
  }
  s = await waitFor(page, (x) => x.overlays.includes('debrief'), 'debrief');
  expect(s.state.outcome.status).toBe('victory');
  expect(s.campaign.completions).toHaveLength(1);
  const m1Hero = s.state.heroes.alexios;
  await expect(page.getByTestId('debrief')).toContainText('Victory');
  // Main Menu, Mission summary and Continue stand on one line (owner request 2026-10-04).
  const tops = await page.getByTestId('debrief-actions').locator('button').evaluateAll((bs) => bs.map((b) => Math.round(b.getBoundingClientRect().top + b.getBoundingClientRect().height / 2)));
  expect(tops).toHaveLength(3);
  expect(Math.max(...tops) - Math.min(...tops)).toBeLessThanOrEqual(4);
  await page.screenshot({ path: 'test-results/debrief.png' });

  // Continue into Mission 2: new map, briefing, the same hero.
  await page.getByTestId('debrief-continue').click();
  s = await waitFor(page, (x) => x.state.mission.missionId === 'three_beacons_m02' && x.overlays.includes('briefing'), 'Mission 2 briefing');
  await expect(page.getByTestId('briefing')).toContainText('Mission 2');
  await page.getByTestId('briefing-begin').click();
  s = await waitFor(page, (x) => x.screen === 'adventure' && x.overlays.length === 0, 'Mission 2 map');
  expect(s.state.day).toBe(1);
  expect(s.state.heroes.alexios.level).toBe(m1Hero.level);
  expect(s.state.heroes.alexios.xp).toBe(m1Hero.xp);
  expect(s.state.heroes.alexios.army.slots.some((x: { creatureId: string } | null) => x?.creatureId === 'veteran_hoplite' || x?.creatureId === 'hoplite')).toBe(true);
  expect(s.campaign.currentMissionId).toBe('three_beacons_m02');
  expect(s.campaign.completions[0].missionId).toBe('three_beacons_m01');
});
