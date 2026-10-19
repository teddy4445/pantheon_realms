import { describe, expect, it } from 'vitest';
import { loadCatalog } from '@pr/content';
import { deepClone, hashValue, type ContentCatalog, type MissionDefinition } from '@pr/rules';
import { captureRegion, regionalSnapshots, recordCompletion, restartCurrentMission, startCampaign, startNextMission, startPracticeReplay } from '../src';

/** A test-only six-protagonist campaign using existing mission setups, not shipped chapter content. */
function catalogWithRegions(): ContentCatalog {
  const catalog = deepClone(loadCatalog());
  const originals = ['silent_oracle', 'winter_oath', 'twelfth_hour', 'lantern_road', 'silver_branch', 'new_fire'];
  const ids = originals.map((_, i) => `region_test_${i}`);
  const missions: Record<string, MissionDefinition> = {};
  originals.forEach((id, i) => {
    const c = catalog.campaigns[id]!;
    const m = catalog.missions[c.chapters![0]!.missionId]!;
    missions[ids[i]!] = { ...m, id: ids[i]!, campaignId: 'region_test', regionalState: { worldId: 'test-world', regionId: m.player.pantheonId, defaultPatronGodId: c.startingGodOptions[0] } };
  });
  const base = catalog.campaigns.silent_oracle!;
  return { ...catalog, missions: { ...catalog.missions, ...missions }, campaigns: { ...catalog.campaigns,
    region_test: { ...base, id: 'region_test', regionalWorldId: 'test-world', missionIds: ids,
      chapters: ids.map((missionId, i) => ({ missionId, requiresAll: i ? [ids[i - 1]!] : [] })), finalChapterId: ids.at(-1)!, },
  } };
}

describe('regional campaign records', () => {
  it('switches all six protagonists without transferring a foreign hero or patron, and freezes complete regional progress', () => {
    const catalog = catalogWithRegions();
    let run = startCampaign(catalog, 'region_test', { runId: 'regions', startingGodId: null });
    const originals: string[] = [];
    for (let i = 0; i < 6; i++) {
      const m = catalog.missions[run.campaign.currentMissionId]!;
      const s = run.start.match;
      const hero = s.heroes[m.player.hero.heroId]!;
      expect(hero.definitionId).toBe(m.player.hero.definitionId);
      expect(s.players[m.player.playerId]!.pantheonId).toBe(m.player.pantheonId);
      expect(s.players[m.player.playerId]!.pantheon.patronGodId).toBe(m.regionalState!.defaultPatronGodId);
      expect(restartCurrentMission(catalog, run.campaign).entryHash).toBe(run.start.entryHash);
      s.day = 10 + i;
      hero.army.slots[0]!.count = 50 + i;
      s.players[m.player.playerId]!.wallet.gold = 7000 + i;
      s.towns[m.player.town.townId]!.population.test_stock = 30 + i;
      const site = Object.values(s.world.sites)[0]!;
      site.claimed = true; site.chosenOption = i % 2;
      s.outcome = { status: 'victory', day: s.day };
      run.campaign = recordCompletion(catalog, run.campaign, s);
      const snap = run.campaign.completions.at(-1)!.region!;
      originals.push(snap.stateHash);
      hero.army.slots[0]!.count = 1;
      expect(snap.state.heroes[hero.id]!.army.slots[0]!.count).toBe(50 + i);
      expect(recordCompletion(catalog, run.campaign, s)).toBe(run.campaign);
      run.campaign = JSON.parse(JSON.stringify(run.campaign));
      if (i < 5) run = startNextMission(catalog, run.campaign);
    }
    const snapshots = regionalSnapshots('test-world', run.campaign.completions);
    expect(snapshots).toHaveLength(6);
    expect(new Set(snapshots.map((s) => s.protagonistId)).size).toBe(6);
    expect(snapshots.map((s) => hashValue(s.state))).toEqual(originals);
    expect(snapshots.map((s) => s.capturedDay)).toEqual([10, 11, 12, 13, 14, 15]);
    const practice = startPracticeReplay(catalog, run.campaign, 'region_test_3');
    const expected = catalog.missions.region_test_3!.player.hero;
    expect(practice.start.match.heroes[expected.heroId]!.definitionId).toBe(expected.definitionId);
    expect(restartCurrentMission(catalog, practice.campaign).entryHash).toBe(practice.start.entryHash);
  });
  it('rejects missing, mixed-world and modified snapshots without changing valid history', () => {
    const c = catalogWithRegions();
    const run = startCampaign(c, 'region_test', { runId: 'validation', startingGodId: null });
    const hero = c.missions.region_test_0!.player.hero.definitionId;
    const region = captureRegion('world', 'coast', hero, run.start.match);
    expect(() => regionalSnapshots('world', [{ region }], ['fjord'])).toThrow('missing');
    expect(() => regionalSnapshots('other', [{ region }])).toThrow('another world');
    const tampered = deepClone(region); tampered.state.day++;
    expect(() => regionalSnapshots('world', [{ region: tampered }])).toThrow('altered');
    const copy = regionalSnapshots('world', [{ region }])[0]!;
    copy.state.day++;
    expect(hashValue(region.state)).toBe(region.stateHash);
  });
});
