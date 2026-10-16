/**
 * Campaign content v2 run state (campaign expansion handoff, 2026-10-15): new
 * runs play the chapter graph, v1 runs stay bound to the v1 missions, both
 * orders of a parallel pair are playable, facts are kept apart from
 * completion, and restart / practice replay never advance the run.
 * Missions are completed "by fiat" (a victory outcome on the entry state):
 * this checks the run's state machine, not the chapters' play (that is
 * packages/content/test/v2 and tools/campaign-v2/sim.measure.ts).
 */
import { describe, expect, it } from 'vitest';
import { loadCatalog } from '@pr/content';
import type { MatchState } from '@pr/rules';
import {
  availableChapters,
  chapterState,
  contentVersionOf,
  hasNextMission,
  nextMissionId,
  recordCompletion,
  restartCurrentMission,
  startCampaign,
  startNextMission,
  startPracticeReplay,
  type CampaignState,
} from '../src';

const catalog = loadCatalog();
const v2Campaigns = Object.values(catalog.campaigns).filter((c) => c.chapters?.length);

/** Win the match as it stands, with the given mission flags set. */
function won(match: MatchState, flags: readonly string[] = []): MatchState {
  return {
    ...match,
    mission: { ...match.mission, flags: { ...match.mission.flags, ...Object.fromEntries(flags.map((f) => [f, true])) } },
    outcome: { status: 'victory', day: match.day, winnerIds: ['player'] } as MatchState['outcome'],
  };
}

/** Every topological order of the chapter graph that takes the "other" branch first at each fork. */
function orders(campaignId: string): string[][] {
  const chapters = catalog.campaigns[campaignId]!.chapters!;
  const result: string[][] = [];
  for (const reverse of [false, true]) {
    const done: string[] = [];
    while (done.length < chapters.length) {
      const avail = chapters.filter((c) => !done.includes(c.missionId) && c.requiresAll.every((r) => done.includes(r)));
      const pick = reverse ? avail[avail.length - 1]! : avail[0]!;
      done.push(pick.missionId);
    }
    result.push(done);
  }
  return result;
}

describe('campaign content v2 runs', () => {
  it('all seven campaigns have a chapter graph; new runs play it from its single opening chapter', () => {
    expect(v2Campaigns.map((c) => c.id).sort()).toEqual(
      ['lantern_road', 'new_fire', 'silent_oracle', 'silver_branch', 'three_beacons', 'twelfth_hour', 'winter_oath'],
    );
    expect(v2Campaigns.reduce((n, c) => n + c.chapters!.length, 0)).toBe(37);
    // The campaign screen's summary for a new run names its chapters, not the legacy missions.
    const words = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven'];
    for (const camp of v2Campaigns) expect(camp.summaryV2, camp.id).toContain(`${words[camp.chapters!.length]} chapters`);
    for (const camp of v2Campaigns) {
      const { campaign, start } = startCampaign(catalog, camp.id, { runId: `${camp.id}-v2`, startingGodId: null });
      expect(contentVersionOf(campaign)).toBe(2);
      expect(campaign.currentMissionId).toBe(`${camp.id}_v2_m01`);
      expect(start.match.mission.missionId).toBe(`${camp.id}_v2_m01`);
      expect(campaign.facts).toEqual([]);
      // One map at a time: nothing else is available until this chapter is won.
      expect(availableChapters(catalog, campaign)).toEqual([]);
      expect(chapterState(catalog, campaign, `${camp.id}_v2_m01`)).toBe('current');
    }
  });

  it('a v1 run (no content version, as saved before v2) stays on the v1 missions', () => {
    for (const camp of v2Campaigns) {
      const { campaign, start } = startCampaign(catalog, camp.id, { runId: `${camp.id}-v1`, startingGodId: null, contentVersion: 1 });
      // A save from before content v2 has no contentVersion field at all.
      const old = { ...campaign } as Record<string, unknown>;
      delete old['contentVersion'];
      const v1 = old as unknown as CampaignState;
      expect(contentVersionOf(v1)).toBe(1);
      expect(v1.currentMissionId).toBe(camp.missionIds[0]);
      expect(restartCurrentMission(catalog, v1).entryHash).toBe(v1.currentEntryHash);
      const after = recordCompletion(catalog, v1, won(start.match));
      expect(nextMissionId(catalog, after)).toBe(camp.missionIds[1]);
      const next = startNextMission(catalog, after);
      expect(next.campaign.currentMissionId).toBe(camp.missionIds[1]);
      expect(next.campaign.contentVersion).toBeUndefined();
      expect(next.start.match.mission.missionId).toBe(camp.missionIds[1]);
      // A v2 chapter is never offered to a v1 run, and v1 definitions are still in the catalog.
      expect(() => startNextMission(catalog, after, `${camp.id}_v2_m02`)).toThrow();
      for (const id of camp.missionIds) expect(catalog.missions[id], id).toBeDefined();
    }
  });

  it('plays every campaign through its graph in both orders; a fork asks for a choice and refuses a locked chapter', () => {
    for (const camp of v2Campaigns) {
      for (const order of orders(camp.id)) {
        let { campaign, start } = startCampaign(catalog, camp.id, { runId: `${camp.id}-${order.join('.')}`, startingGodId: null });
        expect(campaign.currentMissionId).toBe(order[0]);
        for (let i = 0; i < order.length; i++) {
          expect(start.match.mission.missionId).toBe(order[i]);
          campaign = recordCompletion(catalog, campaign, won(start.match));
          // Recording twice is a no-op.
          expect(recordCompletion(catalog, campaign, won(start.match))).toBe(campaign);
          if (i === order.length - 1) break;
          const avail = availableChapters(catalog, campaign).map((c) => c.missionId);
          expect(avail, `${camp.id} after ${order[i]}`).toContain(order[i + 1]);
          if (avail.length > 1) {
            expect(() => startNextMission(catalog, campaign)).toThrow(/Choose the next chapter/);
            expect(nextMissionId(catalog, campaign)).toBeNull();
          }
          const locked = camp.chapters!.find((c) => !avail.includes(c.missionId) && !campaign.completions.some((d) => d.missionId === c.missionId));
          if (locked) expect(() => startNextMission(catalog, campaign, locked.missionId)).toThrow(/not available/);
          ({ campaign, start } = startNextMission(catalog, campaign, order[i + 1]));
        }
        expect(campaign.status).toBe('completed');
        expect(hasNextMission(catalog, campaign)).toBe(false);
        expect(campaign.completions.map((c) => c.missionId)).toEqual(order);
      }
    }
  });

  it('facts are kept apart from completion and reach later chapters as fact: flags', () => {
    for (const camp of v2Campaigns) {
      const first = catalog.missions[`${camp.id}_v2_m01`]!;
      const carried = first.carriedFlags ?? [];
      expect(carried.length, `${camp.id}: chapter 1 carries facts`).toBeGreaterThan(0);
      const fact = carried[0]!;
      let { campaign, start } = startCampaign(catalog, camp.id, { runId: `${camp.id}-facts`, startingGodId: null });
      // A mission flag that is not carried does not become a fact.
      campaign = recordCompletion(catalog, campaign, won(start.match, [fact, 'not_a_carried_flag']));
      expect(campaign.facts).toEqual([fact]);
      expect(campaign.completions[0]!.facts).toEqual([fact]);
      // Facts never mark a chapter complete.
      expect(campaign.completions.map((c) => c.missionId)).toEqual([first.id]);
      const nextId = availableChapters(catalog, campaign)[0]!.missionId;
      ({ campaign, start } = startNextMission(catalog, campaign, nextId));
      expect(start.match.mission.flags[`fact:${fact}`]).toBe(true);
      expect(campaign.currentEntryFacts).toEqual([fact]);
      // Restart rebuilds the identical entry, facts included.
      const again = restartCurrentMission(catalog, campaign);
      expect(again.entryHash).toBe(campaign.currentEntryHash);
      expect(again.match.mission.flags[`fact:${fact}`]).toBe(true);
    }
  });

  it('practice replay is a separate branch: the primary run is unchanged and a replay victory never advances it', () => {
    const camp = v2Campaigns.find((c) => c.id === 'winter_oath')!;
    let { campaign, start } = startCampaign(catalog, camp.id, { runId: 'wo-practice', startingGodId: null });
    campaign = recordCompletion(catalog, campaign, won(start.match, [catalog.missions['winter_oath_v2_m01']!.carriedFlags![0]!]));
    ({ campaign, start } = startNextMission(catalog, campaign));
    const before = JSON.stringify(campaign);
    const practice = startPracticeReplay(catalog, campaign, 'winter_oath_v2_m01');
    expect(practice.campaign.branch).toBe('practice');
    expect(practice.campaign.campaignRunId).not.toBe(campaign.campaignRunId);
    expect(practice.campaign.completions).toEqual([]);
    // Winning the replay records only in the practice branch.
    const practiceDone = recordCompletion(catalog, practice.campaign, won(practice.start.match));
    expect(practiceDone.completions).toHaveLength(1);
    expect(JSON.stringify(campaign)).toBe(before);
    // A chapter whose prerequisites are not complete cannot be practised.
    expect(() => startPracticeReplay(catalog, campaign, 'winter_oath_v2_m05')).toThrow(/not yet unlocked/);
    // Practising chapter 2 starts from the facts chapter 1 left.
    const p2 = startPracticeReplay(catalog, campaign, 'winter_oath_v2_m02');
    expect(p2.campaign.facts).toEqual(campaign.facts);
  });
});
