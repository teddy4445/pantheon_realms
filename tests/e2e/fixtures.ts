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
import { createEnvelope, serializeEnvelope } from '@pr/session';
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
