/**
 * Campaign-chronicle fixtures (campaign expansion 2026-10-15): ordinary save
 * files of content-v2 and v1 campaign runs, built headlessly with the campaign
 * state machine (startCampaign → recordCompletion → startNextMission; chapters
 * are won "by fiat", a victory outcome on the entry state, as in
 * packages/campaign/test/campaignV2Run.test.ts) and brought in through
 * Load → Import. No privileged hooks.
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { Page } from '@playwright/test';
import { GameDriver } from '@pr/testing';
import { recordCompletion, startCampaign, startNextMission, startPracticeReplay, type CampaignState } from '@pr/campaign';
import { createEnvelope, serializeEnvelope, type SaveSnapshot } from '@pr/session';
import { missionSite, type ContentCatalog, type MatchState } from '@pr/rules';
import { approachTile } from './fixtures';
import { inspect, waitFor } from './helpers';

export const catalog: ContentCatalog = GameDriver.mission('three_beacons_m01').catalog;

/** The match won as it stands (with these mission flags set). */
export function wonByFiat(match: MatchState, flags: readonly string[] = []): MatchState {
  return {
    ...match,
    mission: { ...match.mission, flags: { ...match.mission.flags, ...Object.fromEntries(flags.map((f) => [f, true])) } },
    outcome: { status: 'victory', reason: 'Test fixture', day: match.day, winnerIds: ['player'] } as MatchState['outcome'],
    pendingDecisions: [],
  };
}

/**
 * A run of `campaignId` (content v2 unless `version: 1`) that has won `won` in
 * turn. `then`: stop at the last chapter's result (`'result'`, the default) or
 * go on into this chapter (running, its entry state).
 */
export function campaignRun(
  campaignId: string,
  won: readonly string[],
  opts: { then?: string; version?: 1 | 2; runId?: string; flags?: Readonly<Record<string, readonly string[]>> } = {},
): { campaign: CampaignState; match: MatchState } {
  let { campaign, start } = startCampaign(catalog, campaignId, { runId: opts.runId ?? `e2e-chron-${campaignId}`, startingGodId: null, contentVersion: opts.version ?? 2 });
  let match = start.match;
  for (let i = 0; i < won.length; i++) {
    if (match.mission.missionId !== won[i]) throw new Error(`expected ${won[i]}, got ${match.mission.missionId}`);
    match = wonByFiat(match, opts.flags?.[won[i]!] ?? []);
    campaign = recordCompletion(catalog, campaign, match);
    const next = i < won.length - 1 ? won[i + 1] : opts.then;
    if (next) {
      const n = startNextMission(catalog, campaign, opts.version === 1 ? undefined : next);
      campaign = n.campaign;
      match = n.start.match;
      if (match.mission.missionId !== next) throw new Error(`expected ${next}, got ${match.mission.missionId}`);
    }
  }
  return { campaign, match };
}

/** The practice replay of `missionId` a primary run starts (the same run ID the game gives it), won by fiat unless `won` is false. */
export function practiceWon(primary: CampaignState, missionId: string, won = true): SaveSnapshot {
  const p = startPracticeReplay(catalog, primary, missionId);
  return { match: won ? wonByFiat(p.start.match) : p.start.match, campaign: p.campaign };
}

/**
 * The Three Beacons (v2), chapter 2 with everything done but holding the beacon
 * approach: the lens recovered and set, the north relay lit, the network left to
 * the villages (the epilogue's variant), the storm raiders reduced to a few
 * hoplites and Alexios beside them with a strong army.
 */
export function finalBattleSave(): SaveSnapshot {
  const { campaign, match } = campaignRun('three_beacons', ['three_beacons_v2_m01'], { then: 'three_beacons_v2_m02', runId: 'e2e-chron-final' });
  const m = match;
  for (const id of ['tb2_lens', 'tb2_relay', 'tb2_install']) m.mission.objectives[id]!.status = 'completed';
  m.mission.objectives['tb2_defend']!.status = 'active';
  for (const f of ['tb2_lens', 'tb2_relay_north', 'tb2_relay_lit', 'tb2_lens_installed', 'tb_network_local']) m.mission.flags[f] = true;
  m.world.sites['tb2_melas']!.cleared = true;
  m.world.sites['tb2_melas']!.guard = null;
  m.world.sites['tb2_relay_north']!.activated = true;
  m.world.sites['tb2_beacon']!.activated = true;
  m.world.sites['tb2_approach']!.open = true;
  m.world.sites['tb2_assault']!.guard = [{ creatureId: 'hoplite', count: 4 }];
  for (const fog of Object.values(m.fog)) fog.explored = fog.explored.map(() => 1);
  const hero = m.heroes['alexios']!;
  // A strong army (the stacks it carried in, much larger), so the hand-fought battle is short.
  hero.army = { ...hero.army, slots: hero.army.slots.map((x) => (x ? { ...x, count: x.count * 8 + 40 } : x)) };
  hero.movementPoints = 3000;
  const d = new GameDriver(m, catalog);
  hero.position = approachTile(d, missionSite(catalog, m, 'tb2_assault')!.coord, 'alexios');
  return { match: m, campaign };
}

/**
 * Write a snapshot as a save file. `older`: drop the metadata fields added with
 * content v2 (`campaignContentVersion`, `chapterNumber`) as a save written before
 * them has none (the checksum covers the snapshot only).
 */
export function writeSnapshot(snapshot: SaveSnapshot, name: string, opts: { older?: boolean } = {}): string {
  const env = createEnvelope(catalog, snapshot, { id: 'manual-1', kind: 'manual', name, savedAt: new Date(0).toISOString() });
  let out: unknown = env;
  if (opts.older) {
    const { campaignContentVersion: _v, chapterNumber: _n, ...meta } = env.metadata;
    out = { ...env, metadata: meta };
  }
  const file = join(tmpdir(), `chronicle-${name.replace(/\W+/g, '-')}.prsave.json`);
  writeFileSync(file, serializeEnvelope(out as typeof env));
  return file;
}

/** Bring save files in through the save dialog's Import… (each into the next free manual slot). */
export async function importFiles(page: Page, files: readonly string[]): Promise<void> {
  for (const file of files) {
    const before = await page.locator('[data-testid^="save-manual-"]').getByText('(imported)').count();
    const chooser = page.waitForEvent('filechooser');
    await page.getByTestId('save-load').getByRole('button', { name: /Import/ }).click();
    await (await chooser).setFiles(file);
    await page.waitForFunction((n) => document.querySelectorAll('[data-testid^="save-manual-"]').length > 0 && [...document.querySelectorAll('[data-testid^="save-manual-"]')].filter((e) => /\(imported\)/.test(e.textContent ?? '')).length > n, before);
  }
}

/** Load the save in a manual slot from the open save dialog (confirming over a running game). */
export async function loadSlot(page: Page, slot: string): Promise<void> {
  await page.getByTestId(`save-${slot}`).click();
  await page.getByTestId('load-confirm').click();
  await page.waitForTimeout(200);
  if ((await inspect(page)).overlays.includes('confirm')) await page.getByTestId('confirm-ok').click();
  await waitFor(page, (s) => !!s.state && !s.overlays.includes('save-load'), 'loaded save', 30_000, true);
}

/** From the title: import these saves and load the first. */
export async function importAndOpen(page: Page, files: readonly string[]): Promise<void> {
  await page.goto('/?e2e', { waitUntil: 'networkidle' });
  await page.getByTestId('menu-load').click();
  await importFiles(page, files);
  await loadSlot(page, 'manual-1');
}
