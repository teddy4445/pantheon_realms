/**
 * Save-file fixtures for UI tests. A fixture is an ordinary save envelope built
 * from a headless match (the same rules and processor as the game) and brought
 * in through the real Load → Import path — no privileged hooks.
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { Page } from '@playwright/test';
import { GameDriver } from '@pr/testing';
import { GameSession, createEnvelope, serializeEnvelope } from '@pr/session';
import { axialNeighbors, quoteMovement, type CreatureStackState, type HexCoord } from '@pr/rules';
import { inspect, waitFor } from './helpers';

type Army = [string, number][];
export const slots = (army: Army): (CreatureStackState | null)[] => {
  const out: (CreatureStackState | null)[] = [null, null, null, null, null, null, null];
  army.forEach(([creatureId, count], i) => (out[i] = { creatureId, count }));
  return out;
};

/** A walkable neighbor of `c` from which `heroId` reaches `c` in one step. */
export function approachTile(d: GameDriver, c: HexCoord, heroId: string): HexCoord {
  const hero = d.state.heroes[heroId]!;
  const home = hero.position;
  for (const n of axialNeighbors(c)) {
    hero.position = n;
    const q = quoteMovement(d.catalog, d.state, heroId, c);
    if (q.reachable && q.path.length === 1) {
      hero.position = home;
      return n;
    }
  }
  hero.position = home;
  throw new Error('no approach tile');
}

export function skirmishDriver(): GameDriver {
  const d = GameDriver.mission('skirmish_twin_harbors', { matchId: 'e2e-siege' });
  for (const fog of Object.values(d.state.fog)) fog.explored = fog.explored.map(() => 1);
  return d;
}

/** Write the driver's state as a save file and return its path. */
export function writeSave(d: GameDriver, name: string): string {
  const env = createEnvelope(d.catalog, { match: d.state, campaign: null }, { id: 'manual-1', kind: 'manual', name, savedAt: new Date(0).toISOString() });
  const file = join(tmpdir(), `${name.replace(/\W+/g, '-')}.prsave.json`);
  writeFileSync(file, serializeEnvelope(env));
  return file;
}

/** Import a save file through Load → Import…, then load it. */
export async function importAndLoad(page: Page, file: string): Promise<void> {
  await page.getByTestId('menu-load').click();
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: /Import/ }).click();
  await (await chooser).setFiles(file);
  const slot = page.getByTestId('save-manual-1');
  await slot.getByText('(imported)').waitFor();
  await slot.click();
  await page.getByTestId('load-confirm').click();
  await page.waitForTimeout(200);
  if ((await inspect(page)).overlays.includes('confirm')) await page.getByTestId('confirm-ok').click();
  await waitFor(page, (s) => !!s.state && !s.overlays.includes('save-load'), 'loaded save');
}

/**
 * A legacy (content v1) campaign run at its first mission, as a build from before
 * the campaign expansion (2026-10-15) saved it: no contentVersion on the run. New
 * runs play content v2; old runs stay bound to the v1 missions, so the v1 journeys
 * are played from such a save.
 */
export function legacyCampaignSave(campaignId: string, startingGodId: string | null, name: string): string {
  const d = GameDriver.mission('three_beacons_m01');
  const session = GameSession.newCampaign(d.catalog, campaignId, startingGodId, `e2e-legacy-${campaignId}`, null, 1);
  const snap = JSON.parse(JSON.stringify(session.snapshot()));
  delete snap.campaign.contentVersion;
  const env = createEnvelope(d.catalog, snap, { id: 'manual-1', kind: 'manual', name, savedAt: new Date(0).toISOString() });
  const file = join(tmpdir(), `${name.replace(/\W+/g, '-')}.prsave.json`);
  writeFileSync(file, serializeEnvelope(env));
  return file;
}

/** Start the legacy Three Beacons run (mission 1) through Load → Import, on the adventure map. */
export async function startLegacyCampaign(page: Page): Promise<void> {
  const file = legacyCampaignSave('three_beacons', 'zeus', 'Legacy Three Beacons');
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await importAndLoad(page, file);
  for (let i = 0; i < 10; i++) {
    const s = await inspect(page);
    if (s.screen === 'adventure' && s.overlays.length === 0) break;
    if (s.overlays.includes('briefing')) await page.getByTestId('briefing-begin').click();
    await page.waitForTimeout(300);
  }
  await waitFor(page, (s) => s.screen === 'adventure' && s.overlays.length === 0 && s.state.mission.missionId === 'three_beacons_m01', 'legacy mission 1 map');
}
