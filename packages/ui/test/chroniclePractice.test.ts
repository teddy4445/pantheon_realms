/**
 * Practice replay from the chronicle and the next-chapter choice, through the
 * AppStore (campaign expansion 2026-10-15): the primary run is kept before
 * `startPractice` and restored with `session.load` — byte-identical — when the
 * player returns; a practice branch never continues the campaign; a pair of
 * open chapters needs a choice, which the campaign state machine validates.
 * The store runs headless over an in-memory save repository (no DOM).
 */
import { describe, expect, it } from 'vitest';
import { loadCatalog } from '@pr/content';
import { recordCompletion, startCampaign } from '@pr/campaign';
import { snapshotChecksum, type SaveSnapshot } from '@pr/session';
import type { MatchState } from '@pr/rules';
import type { PlatformServices, SaveRepository } from '@pr/platform';
import { AppStore } from '../src/app/store';

const catalog = loadCatalog();

function memoryPlatform(): PlatformServices {
  const files = new Map<string, string>();
  const saves: SaveRepository = {
    kind: 'memory',
    availability: async () => ({ ok: true }),
    list: async () => [...files].map(([id, text]) => ({ id, text, bytes: text.length })),
    read: async (id) => files.get(id) ?? null,
    write: async (id, text) => void files.set(id, text),
    remove: async (id) => void files.delete(id),
    exportSave: async () => false,
    importSave: async () => null,
  };
  const store = { load: async () => null, save: async () => undefined };
  return {
    kind: 'browser',
    appVersion: 'test',
    saves,
    maps: { list: async () => [], read: async () => null, write: async () => undefined, remove: async () => undefined, exportFile: async () => false, importFile: async () => null },
    preferences: store,
    records: store,
    canQuit: false,
    quit: async () => undefined,
    supportsWindowMode: false,
    setWindowMode: async () => undefined,
    getWindowMode: async () => 'windowed',
  };
}

/** A primary v2 run standing at the result of its first chapter (won by fiat). */
function chapterOneWon(campaignId: string): SaveSnapshot {
  const { campaign, start } = startCampaign(catalog, campaignId, { runId: `practice-${campaignId}`, startingGodId: null });
  const match: MatchState = { ...start.match, outcome: { status: 'victory', day: start.match.day, winnerIds: ['player'] } as MatchState['outcome'], pendingDecisions: [] };
  return { match, campaign: recordCompletion(catalog, campaign, match) };
}

describe('practice replay through the store', () => {
  it('keeps the primary run and restores it byte-identical; the replay never continues the campaign', async () => {
    const store = new AppStore(catalog, memoryPlatform());
    store.loadSnapshot(chapterOneWon('silent_oracle'));
    // A save at a won chapter opens its result again.
    expect(store.overlays.map((o) => o.kind)).toEqual(['debrief']);
    const session = store.session!;
    const before = JSON.stringify(session.snapshot());
    const checksum = snapshotChecksum(session.snapshot());
    expect(session.availableChapters()).toEqual(['silent_oracle_v2_m02', 'silent_oracle_v2_m03']);

    expect(store.startPracticeReplay('silent_oracle_v2_m01')).toBeNull();
    expect(session.campaign!.branch).toBe('practice');
    expect(session.state.mission.missionId).toBe('silent_oracle_v2_m01');
    expect(session.state.outcome.status).toBe('running');
    expect(store.practiceReturn?.missionId).toBe('silent_oracle_v2_m01');
    expect(store.overlays.map((o) => o.kind)).toEqual(['briefing']);
    // The practice branch: nothing to continue to, and a refusal changes nothing.
    expect(session.availableChapters()).toEqual([]);
    expect(session.hasNextMission()).toBe(false);
    const practiceState = session.state;
    expect(store.continueCampaign('silent_oracle_v2_m02')).not.toBeNull();
    expect(session.state).toBe(practiceState);
    // A second practice on top of the first is refused.
    expect(store.startPracticeReplay('silent_oracle_v2_m01')).not.toBeNull();
    // The kept copy is independent of the live replay.
    expect(store.practiceReturn!.campaign.branch).toBe('primary');

    expect(store.returnFromPractice()).toBe(true);
    expect(store.practiceReturn).toBeNull();
    expect(JSON.stringify(session.snapshot())).toBe(before);
    expect(snapshotChecksum(session.snapshot())).toBe(checksum);
    expect(session.campaign!.branch).toBe('primary');
    // Back at the result, with the same choice open.
    expect(store.overlays.map((o) => o.kind)).toEqual(['debrief']);
    expect(session.availableChapters()).toEqual(['silent_oracle_v2_m02', 'silent_oracle_v2_m03']);
    // The safety copy on disk is the primary run as kept.
    await new Promise((r) => setTimeout(r, 0));
    const auto = (await store.saves.list()).find((s) => s.name === 'Campaign — before practice replay');
    expect(auto?.envelope?.snapshot.campaign?.branch).toBe('primary');
    expect(auto?.metadata?.branch).toBe('primary');
  });

  it('a pair of open chapters needs a choice; the chosen chapter starts with its briefing', () => {
    const store = new AppStore(catalog, memoryPlatform());
    store.loadSnapshot(chapterOneWon('silent_oracle'));
    const session = store.session!;
    const revision = session.state.revision;
    // No choice given: refused by the state machine, the result stays open.
    expect(store.continueCampaign()?.message).toMatch(/Choose the next chapter/);
    expect(store.overlays.map((o) => o.kind)).toEqual(['debrief']);
    expect(session.state.revision).toBe(revision);
    // A locked chapter is refused too.
    expect(store.continueCampaign('silent_oracle_v2_m04')?.message).toMatch(/not available/);
    expect(store.continueCampaign('silent_oracle_v2_m03')).toBeNull();
    expect(session.campaign!.currentMissionId).toBe('silent_oracle_v2_m03');
    expect(session.state.mission.missionId).toBe('silent_oracle_v2_m03');
    expect(store.overlays.map((o) => o.kind)).toEqual(['briefing']);
    expect(store.screen.id).toBe('adventure');
  });

  it('loading another game drops the kept run; the replay’s own save keeps it', () => {
    const store = new AppStore(catalog, memoryPlatform());
    store.loadSnapshot(chapterOneWon('three_beacons'));
    store.startPracticeReplay('three_beacons_v2_m01');
    const practiceSave = store.session!.snapshot();
    store.loadSnapshot(JSON.parse(JSON.stringify(practiceSave)) as SaveSnapshot);
    expect(store.practiceReturn).not.toBeNull();
    store.loadSnapshot(chapterOneWon('winter_oath'));
    expect(store.practiceReturn).toBeNull();
    expect(store.returnFromPractice()).toBe(false);
  });
});

describe('inspection over a dialog', () => {
  it('the Bestiary opened from a card sets the open dialogs aside and Back brings them back', () => {
    const store = new AppStore(catalog, memoryPlatform());
    store.resetTo('adventure');
    store.openOverlay({ kind: 'camp', heroId: 'h', siteId: 's' } as never);
    store.goto('unit-detail', { creatureId: 'pegasus' }, { setOverlaysAside: true });
    expect(store.screen.id).toBe('unit-detail');
    expect(store.overlays).toEqual([]);
    store.back();
    expect(store.screen.id).toBe('adventure');
    expect(store.overlays.map((o) => o.kind)).toEqual(['camp']);
    // An ordinary goto keeps the dialogs as before.
    store.goto('unit-detail', { creatureId: 'pegasus' });
    expect(store.overlays.map((o) => o.kind)).toEqual(['camp']);
  });
});

it('keeps a dedicated campaign checkpoint after a non-final chapter for New Game replay',async()=>{
 const platform=memoryPlatform();
 const store=new AppStore(catalog,platform);
 store.loadSnapshot(chapterOneWon('three_beacons'));
 await (store as unknown as {recordResults:()=>Promise<void>}).recordResults();
 const slots=await store.saves.list();
 const progress=slots.find(s=>s.id.startsWith('campaign-three_beacons-'));
 expect(progress?.envelope?.snapshot.campaign?.completions.some(c=>c.missionId==='three_beacons_v2_m01')).toBe(true);
 const reloaded=new AppStore(catalog,platform);
 reloaded.loadSnapshot(progress!.envelope!.snapshot);
 expect(reloaded.startPracticeReplay('three_beacons_v2_m01')).toBeNull();
});
