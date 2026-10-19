/**
 * The campaign chronicle view models (campaign expansion 2026-10-15): the graph
 * is laid out from `requiresAll` (no per-campaign layout), chapter states come
 * from the campaign state machine, locked chapters say why and keep their story
 * hidden, a completed chapter names the facts it recorded and the bounded
 * carry-over, the v2 epilogue replaces the v1 ending, and save metadata reads
 * correctly for v2, v1 and older saves without the new fields. Chapters are
 * completed "by fiat" (a victory outcome on the entry state), as in
 * packages/campaign/test/campaignV2Run.test.ts.
 */
import { describe, expect, it } from 'vitest';
import { loadCatalog } from '@pr/content';
import { recordCompletion, startCampaign, startNextMission, startPracticeReplay } from '@pr/campaign';
import { buildMetadata, type SaveSnapshot } from '@pr/session';
import type { MatchState } from '@pr/rules';
import {
  campaignEpilogue,
  carryoverLines,
  chapterColumns,
  chapterFacts,
  chapterList,
  chapterTitle,
  chronicleModel,
  defaultSelection,
  saveRunInfo,
  type RunState,
} from '../src/app/chronicle';

const catalog = loadCatalog();
const v2Campaigns = Object.values(catalog.campaigns).filter((c) => c.chapters?.length);

function won(match: MatchState, flags: readonly string[] = []): MatchState {
  return {
    ...match,
    mission: { ...match.mission, flags: { ...match.mission.flags, ...Object.fromEntries(flags.map((f) => [f, true])) } },
    outcome: { status: 'victory', day: match.day, winnerIds: ['player'] } as MatchState['outcome'],
    pendingDecisions: [],
  };
}

/** A v2 run that has won `order` in turn (flags per chapter), stopped at the last one's result. */
function runThrough(campaignId: string, order: readonly string[], flags: Readonly<Record<string, readonly string[]>> = {}): { run: RunState; match: MatchState } {
  let { campaign, start } = startCampaign(catalog, campaignId, { runId: `chron-${campaignId}`, startingGodId: null });
  let match = start.match;
  for (let i = 0; i < order.length; i++) {
    expect(match.mission.missionId).toBe(order[i]);
    match = won(match, flags[order[i]!] ?? []);
    campaign = recordCompletion(catalog, campaign, match);
    if (i < order.length - 1) {
      const next = startNextMission(catalog, campaign, order[i + 1]);
      campaign = next.campaign;
      match = next.start.match;
    }
  }
  return { run: campaign, match };
}

describe('chronicle layout', () => {
  it('lays every campaign out from its requiresAll edges: column = longest chain, rows centred', () => {
    for (const camp of v2Campaigns) {
      const model = chronicleModel(catalog, camp.id, null)!;
      expect(model.nodes).toHaveLength(camp.chapters!.length);
      for (const ch of camp.chapters!) {
        const node = model.nodes.find((n) => n.missionId === ch.missionId)!;
        // Every prerequisite stands in an earlier column.
        for (const r of ch.requiresAll) expect(model.nodes.find((n) => n.missionId === r)!.col).toBeLessThan(node.col);
        expect(model.edges.filter((e) => e.to === ch.missionId).map((e) => e.from).sort()).toEqual([...ch.requiresAll].sort());
      }
      // Rows stay inside the grid and no two nodes share a cell.
      const cells = model.nodes.map((n) => `${n.col}:${n.row}`);
      expect(new Set(cells).size).toBe(cells.length);
      for (const n of model.nodes) {
        expect(n.row).toBeGreaterThanOrEqual(0);
        expect(n.row).toBeLessThanOrEqual(model.rows - 1);
      }
    }
    // The documented shapes (handoff §3), measured, not typed in by campaign.
    const shape = (id: string) => {
      const cols = chapterColumns(catalog.campaigns[id]!.chapters!);
      const out: number[] = [];
      for (const c of cols.values()) out[c] = (out[c] ?? 0) + 1;
      return out;
    };
    expect(shape('three_beacons')).toEqual([1, 1]);
    expect(shape('silent_oracle')).toEqual([1, 2, 2, 1]);
    expect(shape('winter_oath')).toEqual([1, 1, 2, 1, 1]);
    expect(shape('twelfth_hour')).toEqual([1, 2, 1, 1, 1]);
    expect(shape('new_fire')).toEqual([1, 1, 2, 1]);
    const so = chronicleModel(catalog, 'silent_oracle', null)!;
    expect(so.cols).toBe(4);
    expect(so.rows).toBe(2);
    expect(so.nodes[0]!.row).toBe(0.5);
    expect(so.hasParallel).toBe(true);
    expect(chronicleModel(catalog, 'three_beacons', null)!.hasParallel).toBe(false);
  });

  it('a new run: only the opening chapter is available; locked chapters say why and keep their story hidden', () => {
    for (const camp of v2Campaigns) {
      const model = chronicleModel(catalog, camp.id, null)!;
      expect(model.inRun).toBe(false);
      expect(model.nodes.filter((n) => n.state === 'available').map((n) => n.chapter)).toEqual([1]);
      expect(model.nodes.filter((n) => n.state !== 'available').every((n) => n.state === 'locked')).toBe(true);
      // Nothing can be continued to before a run exists.
      expect(model.available).toEqual([]);
      expect(defaultSelection(model)).toBe(camp.chapters![0]!.missionId);
      const first = model.nodes[0]!;
      expect(first.revealed).toBe(true);
      expect(first.firstLine?.text).toBe(catalog.missions[first.missionId]!.briefing[0]!.text);
      expect(first.knownTask).toBeTruthy();
      expect(first.coverAssetId).toBe(camp.chapters![0]!.briefingArt[0]);
      for (const n of model.nodes.filter((x) => x.state === 'locked')) {
        expect(n.revealed).toBe(false);
        expect(n.summary).toBeNull();
        expect(n.firstLine).toBeNull();
        expect(n.knownTask).toBeNull();
        expect(n.lockedReason).toMatch(/^Needs chapters? /);
        expect(n.label).toContain('Locked');
        // The legacy chapters it carries are listed even while locked.
        expect(n.legacy.length).toBeGreaterThan(0);
      }
    }
    const so = chronicleModel(catalog, 'silent_oracle', null)!;
    expect(so.nodes.find((n) => n.chapter === 4)!.lockedReason).toBe('Needs chapters 2 and 3');
    expect(so.nodes.find((n) => n.chapter === 6)!.lockedReason).toBe('Needs chapters 4 and 5');
    expect(so.nodes.find((n) => n.chapter === 2)!.label).toBe('Chapter 2: The Bronze Bull and the Eyrie — Locked. Needs chapter 1');
    expect(so.nodes.find((n) => n.chapter === 2)!.legacy).toEqual(['Mission 2 — The Bronze Bull', 'Mission 3 — The Eyrie of Aetos']);
  });

  it('chapterList reads naturally', () => {
    expect(chapterList([2])).toBe('chapter 2');
    expect(chapterList([4, 3])).toBe('chapters 3 and 4');
    expect(chapterList([2, 4, 3])).toBe('chapters 2, 3 and 4');
  });
});

describe('chronicle states in a run', () => {
  it('branch pair pending: both chapters available, each with its own title', () => {
    const { run } = runThrough('silent_oracle', ['silent_oracle_v2_m01']);
    const model = chronicleModel(catalog, 'silent_oracle', run, { allowPractice: true })!;
    const state = (n: number) => model.nodes.find((x) => x.chapter === n)!.state;
    expect(state(1)).toBe('completed');
    expect(state(2)).toBe('available');
    expect(state(3)).toBe('available');
    expect(state(4)).toBe('locked');
    expect(model.available).toEqual(['silent_oracle_v2_m02', 'silent_oracle_v2_m03']);
    expect(model.nodes.find((x) => x.chapter === 2)!.parallel).toBe(true);
    expect(model.edges.filter((e) => e.from === 'silent_oracle_v2_m01').every((e) => e.done)).toBe(true);
    expect(model.nodes.find((x) => x.chapter === 1)!.replayable).toBe(true);
    expect(defaultSelection(model)).toBe('silent_oracle_v2_m02');
    expect(chapterTitle(catalog, 'silent_oracle_v2_m03')).toBe('Chapter 3: The Hall of Echoes');
    expect(chapterTitle(catalog, 'silent_oracle_m03')).toBe('Mission 3: The Eyrie of Aetos');
  });

  it('one parallel chapter done: the other is the only choice; the next pair waits for it', () => {
    const { run } = runThrough('silent_oracle', ['silent_oracle_v2_m01', 'silent_oracle_v2_m02']);
    const model = chronicleModel(catalog, 'silent_oracle', run)!;
    expect(model.available).toEqual(['silent_oracle_v2_m03']);
    expect(model.nodes.find((x) => x.chapter === 4)!.lockedReason).toBe('Needs chapter 3');
    // Without allowPractice nothing is offered for replay.
    expect(model.nodes.some((n) => n.replayable)).toBe(false);
  });

  it('a chapter in progress is current; a chapter whose prerequisites are done waits for it (one map at a time)', () => {
    const { run: done } = runThrough('winter_oath', ['winter_oath_v2_m01', 'winter_oath_v2_m02']);
    const next = startNextMission(catalog, done, 'winter_oath_v2_m03');
    const model = chronicleModel(catalog, 'winter_oath', next.campaign)!;
    const n = (k: number) => model.nodes.find((x) => x.chapter === k)!;
    expect(n(3).state).toBe('current');
    expect(n(3).revealed).toBe(true);
    expect(n(4).state).toBe('locked');
    expect(n(4).lockedReason).toBe('Opens once chapter 3 is complete (one chapter at a time)');
    expect(n(5).lockedReason).toBe('Needs chapters 3 and 4');
    expect(model.available).toEqual([]);
  });

  it('practice replay: the replayed chapter is marked; a practice branch never offers replay or continue', () => {
    const { run } = runThrough('three_beacons', ['three_beacons_v2_m01']);
    const model = chronicleModel(catalog, 'three_beacons', run, { practiceMissionId: 'three_beacons_v2_m01' })!;
    expect(model.nodes[0]!.state).toBe('practice');
    expect(model.nodes[0]!.label).toContain('Practice replay');
    expect(defaultSelection(model)).toBe('three_beacons_v2_m01');
    const practice = startPracticeReplay(catalog, run, 'three_beacons_v2_m01').campaign;
    const pm = chronicleModel(catalog, 'three_beacons', practice, { allowPractice: true })!;
    expect(pm.nodes.some((x) => x.replayable)).toBe(false);
  });

  it('a v1 run has no chronicle (its linear flow is kept)', () => {
    const { campaign } = startCampaign(catalog, 'silent_oracle', { runId: 'v1', startingGodId: null, contentVersion: 1 });
    expect(chronicleModel(catalog, 'silent_oracle', campaign)).toBeNull();
  });
});

describe('what a chapter leaves behind', () => {
  it('names each recorded fact by the chapter’s evidence entry (readable fallback otherwise) and lists the bounded carry-over', () => {
    const { run } = runThrough('three_beacons', ['three_beacons_v2_m01'], { three_beacons_v2_m01: ['tb1_hamlet_first'] });
    const record = run.completions[0]!;
    expect(record.facts).toEqual(['tb1_hamlet_first']);
    const mission = catalog.missions['three_beacons_v2_m01']!;
    const facts = chapterFacts(catalog, mission, record);
    const own = mission.evidence!.find((e) => e.flag === 'tb1_hamlet_first')!;
    expect(facts).toEqual([{ flag: 'tb1_hamlet_first', title: own.title, text: own.text, icon: own.icon }]);
    // A fact without an evidence entry reads as words, never as a raw flag.
    const fallback = chapterFacts(catalog, mission, { facts: ['tb9_unknown_marker'] });
    expect(fallback[0]!.title).toBe('Unknown marker');
    expect(fallback[0]!.icon).toBeNull();
    const lines = carryoverLines(catalog, record);
    expect(lines[0]!.label).toBe(record.carryover.name);
    expect(lines[0]!.value).toContain(`Level ${record.carryover.level}`);
    expect(lines.map((l) => l.label)).toEqual([record.carryover.name, 'Skills', 'Spells', 'Artifacts', 'Gods']);
  });
});

describe('epilogue', () => {
  it('a v2 run plays epilogueV2 and the variant of its final choice over its own art; a v1 run keeps its ending', () => {
    for (const camp of v2Campaigns) {
      const e = camp.epilogueV2!;
      for (const v of e.variants ?? []) {
        // From the final chapter's mission flags…
        const byFlag = campaignEpilogue(camp, { contentVersion: 2, facts: [] }, { [v.flag]: true });
        expect(byFlag.lines).toEqual([...e.lines, ...v.lines]);
        expect(byFlag.artId).toBe(e.art);
        // …or from the run's facts.
        expect(campaignEpilogue(camp, { contentVersion: 2, facts: [v.flag] }, {}).lines).toEqual([...e.lines, ...v.lines]);
      }
      expect(campaignEpilogue(camp, { contentVersion: 2, facts: [] }, {}).lines).toEqual(e.lines);
      // Never a v1 ending picture behind a v2 epilogue.
      expect(e.art.startsWith('ending.')).toBe(false);
      const v1 = campaignEpilogue(camp, null, {});
      expect(v1.lines).toEqual(camp.epilogue ?? []);
      expect(v1.artId === null || v1.artId.startsWith('ending.')).toBe(true);
    }
  });
});

describe('save metadata', () => {
  const snap = (run: RunState, match: MatchState): SaveSnapshot => ({ match, campaign: run });

  it('v2: content version and the actual chapter, from the metadata or from the snapshot alone', () => {
    const { run: done } = runThrough('silent_oracle', ['silent_oracle_v2_m01']);
    const next = startNextMission(catalog, done, 'silent_oracle_v2_m03');
    const s = snap(next.campaign, next.start.match);
    const meta = buildMetadata(catalog, s);
    expect(meta.campaignContentVersion).toBe(2);
    const info = saveRunInfo(catalog, meta, s);
    expect(info).toMatchObject({ version: 2, versionLabel: 'Chronicle (v2)', progress: 'Chapter 3 of 6 — The Hall of Echoes', branch: 'primary', branchLabel: null, completed: false });
    // A save written before the new fields: the same, from the snapshot.
    const { campaignContentVersion: _v, chapterNumber: _n, ...older } = meta;
    expect(saveRunInfo(catalog, older, s)).toEqual(info);
    // Only the metadata readable (an incompatible save): what it says.
    expect(saveRunInfo(catalog, meta, null)).toMatchObject({ version: 2, progress: 'Chapter 3 — The Hall of Echoes' });
  });

  it('v1 and saves from before content v2 (no contentVersion) read as the legacy campaign', () => {
    let { campaign, start } = startCampaign(catalog, 'silent_oracle', { runId: 'old', startingGodId: null, contentVersion: 1 });
    campaign = recordCompletion(catalog, campaign, won(start.match));
    let next = startNextMission(catalog, campaign);
    next = startNextMission(catalog, recordCompletion(catalog, next.campaign, won(next.start.match)));
    const old = { ...next.campaign } as Record<string, unknown>;
    delete old['contentVersion'];
    const s = snap(old as unknown as RunState, next.start.match);
    const meta = buildMetadata(catalog, s);
    const { campaignContentVersion: _v, chapterNumber: _n, ...older } = meta;
    for (const m of [meta, older]) expect(saveRunInfo(catalog, m, s)).toMatchObject({ version: 1, versionLabel: 'Legacy campaign (v1)', progress: 'Mission 3 of 7', branch: 'primary' });
  });

  it('a practice replay is marked apart; a finished run says so; a skirmish has no campaign tags', () => {
    const { run } = runThrough('three_beacons', ['three_beacons_v2_m01']);
    const p = startPracticeReplay(catalog, run, 'three_beacons_v2_m01');
    const ps = snap(p.campaign, p.start.match);
    expect(saveRunInfo(catalog, buildMetadata(catalog, ps), ps)).toMatchObject({ version: 2, branch: 'practice', branchLabel: 'Practice replay', progress: 'Chapter 1 of 2 — The Silent Shore — Wings over the Pass' });
    const { run: fin, match } = runThrough('three_beacons', ['three_beacons_v2_m01', 'three_beacons_v2_m02']);
    expect(fin.status).toBe('completed');
    expect(saveRunInfo(catalog, null, snap(fin, match)).completed).toBe(true);
    const sk = { match, campaign: null };
    expect(saveRunInfo(catalog, buildMetadata(catalog, sk), sk)).toMatchObject({ version: null, versionLabel: null, branch: 'skirmish' });
  });
});
