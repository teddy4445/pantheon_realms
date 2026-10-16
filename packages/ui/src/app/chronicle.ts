/**
 * The campaign chronicle (campaign expansion of 2026-10-15, screen spec
 * `campaign-chronicle`; reused by the `result` and `load-continue` screens):
 * pure view models over the campaign definition and the saved run.
 *
 * - `chronicleModel`: the chapter graph laid out from its `requiresAll` edges
 *   (column = longest path from the opening chapter, rows centred in the
 *   tallest column — never a per-campaign layout), each chapter's state
 *   (completed / current / available / locked / practice replay), why a locked
 *   chapter is locked, and the summary a selected chapter shows. Locked
 *   chapters keep their story hidden (only the name, the cover and the legacy
 *   chapters they carry are listed). States come from the campaign state
 *   machine (`chapterState`), never decided here.
 * - `chapterLeftBehind`: what a completed chapter recorded (its facts, named by
 *   the chapter's own evidence entries) and the bounded hero carry-over.
 * - `campaignEpilogue`: the closing lines and picture for the run's content version.
 * - `saveRunInfo`: the content version, current chapter and branch of a save,
 *   from its metadata or — for saves written before those fields — its snapshot.
 *
 * Nothing here mutates a run or names a campaign, chapter or character.
 */
import {
  campaignEpilogueLines,
  campaignEpilogueV2Lines,
  type CampaignChapterDefinition,
  type CampaignDefinition,
  type ContentCatalog,
  type DialogueLine,
  type EvidenceDefinition,
  type MissionDefinition,
} from '@pr/rules';
import { chapterState, contentVersionOf, runMissionIds, type SaveMetadata, type SaveSnapshot } from '@pr/session';
import { campaignEndingArtId } from '../assets/storyArt';
import { factInfo } from './missionLedger';

/** A campaign run as saved (the UI reaches the campaign package only through @pr/session). */
export type RunState = NonNullable<SaveSnapshot['campaign']>;

export type ChapterState = 'completed' | 'current' | 'available' | 'locked' | 'practice';

/** Visible wording of each state (shown beside its icon, so state never rests on colour alone). */
export const CHAPTER_STATE_TEXT: Record<ChapterState, string> = {
  completed: 'Complete',
  current: 'Current',
  available: 'Available',
  locked: 'Locked',
  practice: 'Practice replay',
};

export interface ChronicleNode {
  readonly missionId: string;
  /** Local chapter number (1-based). */
  readonly chapter: number;
  readonly name: string;
  readonly state: ChapterState;
  /** Graph column: the longest prerequisite chain before it (0 = the opening chapter). */
  readonly col: number;
  /** Graph row, centred in the tallest column (may be a half step). */
  readonly row: number;
  /** Why a locked chapter cannot be started yet ("Needs chapters 3 and 4"); null when not locked. */
  readonly lockedReason: string | null;
  /** The chapter's story may be shown (locked chapters keep their briefing hidden). */
  readonly revealed: boolean;
  /** The chapter's cover painting (`briefingArt[0]`). */
  readonly coverAssetId: string | null;
  /** Revealed chapters: the situation and the first briefing line. */
  readonly summary: string | null;
  readonly firstLine: DialogueLine | null;
  /** Revealed chapters: the principal objective (the known task). */
  readonly knownTask: string | null;
  /** The legacy (content v1) chapters whose story this chapter carries, readable. */
  readonly legacy: readonly string[];
  /** Prerequisite chapter numbers. */
  readonly requires: readonly number[];
  /** One of two chapters open in either order (both are required). */
  readonly parallel: boolean;
  /** A completed chapter that may be replayed as practice from here. */
  readonly replayable: boolean;
  /** The accessible name of the node: number, name and state (and why it is locked). */
  readonly label: string;
}

export interface ChronicleEdge {
  readonly from: string;
  readonly to: string;
  /** The prerequisite is complete. */
  readonly done: boolean;
}

export interface ChronicleModel {
  readonly campaignId: string;
  readonly campaignName: string;
  readonly nodes: readonly ChronicleNode[];
  readonly edges: readonly ChronicleEdge[];
  readonly cols: number;
  readonly rows: number;
  /** Chapters the player may start next (a run whose current chapter is complete), by chapter order. */
  readonly available: readonly string[];
  /** The graph has chapters played in either order. */
  readonly hasParallel: boolean;
  /** The run (null for the setup screen's new run). */
  readonly inRun: boolean;
}

/** "chapter 2", "chapters 3 and 4", "chapters 2, 3 and 4". */
export function chapterList(numbers: readonly number[]): string {
  const n = [...numbers].sort((a, b) => a - b);
  if (n.length === 0) return '';
  if (n.length === 1) return `chapter ${n[0]}`;
  return `chapters ${n.slice(0, -1).join(', ')} and ${n[n.length - 1]}`;
}

/** Graph columns: the longest prerequisite chain before each chapter (cycles are refused by the content checks). */
export function chapterColumns(chapters: readonly CampaignChapterDefinition[]): Map<string, number> {
  const byId = new Map(chapters.map((c) => [c.missionId, c]));
  const memo = new Map<string, number>();
  const depth = (id: string, seen: Set<string>): number => {
    const hit = memo.get(id);
    if (hit !== undefined) return hit;
    const c = byId.get(id);
    if (!c || seen.has(id)) return 0;
    seen.add(id);
    const d = c.requiresAll.length === 0 ? 0 : 1 + Math.max(...c.requiresAll.map((r) => depth(r, seen)));
    seen.delete(id);
    memo.set(id, d);
    return d;
  };
  for (const c of chapters) depth(c.missionId, new Set());
  return memo;
}

function legacyLabel(catalog: ContentCatalog, id: string): string {
  const m = catalog.missions[id];
  return m ? `Mission ${m.order} — ${m.name}` : id;
}

function knownTaskOf(mission: MissionDefinition | undefined): string | null {
  if (!mission) return null;
  const o = mission.objectives.find((x) => x.id === mission.principalObjectiveId);
  return o?.title ?? null;
}

/**
 * The chronicle of a content-v2 campaign: for a new run (`run` null) only the
 * opening chapter is available; for a run, each chapter's state comes from the
 * campaign state machine. `practiceMissionId` marks the chapter being replayed
 * as practice; `allowPractice` offers practice on completed chapters. Null for
 * a campaign without a chapter graph or a v1 run.
 */
export function chronicleModel(
  catalog: ContentCatalog,
  campaignId: string,
  run: RunState | null,
  opts: { readonly practiceMissionId?: string | null; readonly allowPractice?: boolean } = {},
): ChronicleModel | null {
  const camp: CampaignDefinition | undefined = catalog.campaigns[campaignId];
  const chapters = camp?.chapters;
  if (!camp || !chapters?.length) return null;
  if (run && (run.campaignId !== campaignId || contentVersionOf(run) !== 2)) return null;
  const cols = chapterColumns(chapters);
  const byCol = new Map<number, CampaignChapterDefinition[]>();
  for (const c of [...chapters].sort((a, b) => a.chapter - b.chapter)) {
    const col = cols.get(c.missionId) ?? 0;
    byCol.set(col, [...(byCol.get(col) ?? []), c]);
  }
  const rows = Math.max(1, ...[...byCol.values()].map((l) => l.length));
  const numberOf = new Map(chapters.map((c) => [c.missionId, c.chapter]));
  const done = new Set(run?.completions.map((c) => c.missionId) ?? []);
  const stateOf = (id: string): ChapterState => {
    if (opts.practiceMissionId && opts.practiceMissionId === id) return 'practice';
    if (!run) return chapters.find((c) => c.missionId === id)?.requiresAll.length === 0 ? 'available' : 'locked';
    return chapterState(catalog, run, id);
  };
  const currentNumber = run ? numberOf.get(run.currentMissionId) : undefined;
  const nodes: ChronicleNode[] = [];
  for (const [col, list] of byCol) {
    list.forEach((c, i) => {
      const m = catalog.missions[c.missionId];
      const state = stateOf(c.missionId);
      const missing = c.requiresAll.filter((r) => !done.has(r)).map((r) => numberOf.get(r) ?? 0);
      const lockedReason =
        state !== 'locked'
          ? null
          : missing.length > 0
            ? `Needs ${chapterList(missing)}`
            : currentNumber !== undefined
              ? `Opens once chapter ${currentNumber} is complete (one chapter at a time)`
              : 'Not open yet';
      const revealed = state !== 'locked';
      const name = m?.name ?? c.missionId;
      nodes.push({
        missionId: c.missionId,
        chapter: c.chapter,
        name,
        state,
        col,
        row: i + (rows - list.length) / 2,
        lockedReason,
        revealed,
        coverAssetId: c.briefingArt[0] ?? m?.briefingArt?.[0] ?? null,
        summary: revealed ? (m?.summary ?? null) : null,
        firstLine: revealed ? (m?.briefing[0] ?? null) : null,
        knownTask: revealed ? knownTaskOf(m) : null,
        legacy: c.legacyMissionIds.map((id) => legacyLabel(catalog, id)),
        requires: c.requiresAll.map((r) => numberOf.get(r) ?? 0).sort((a, b) => a - b),
        parallel: list.length > 1,
        replayable: !!run && !!opts.allowPractice && state === 'completed' && run.branch === 'primary',
        label: `Chapter ${c.chapter}: ${name} — ${CHAPTER_STATE_TEXT[state]}${lockedReason ? `. ${lockedReason}` : ''}`,
      });
    });
  }
  nodes.sort((a, b) => a.chapter - b.chapter);
  const edges: ChronicleEdge[] = chapters.flatMap((c) => c.requiresAll.map((r) => ({ from: r, to: c.missionId, done: done.has(r) })));
  const available = nodes.filter((n) => n.state === 'available' && run).map((n) => n.missionId);
  return {
    campaignId,
    campaignName: camp.name,
    nodes,
    edges,
    cols: Math.max(1, ...nodes.map((n) => n.col + 1)),
    rows,
    available,
    hasParallel: nodes.some((n) => n.parallel),
    inRun: !!run,
  };
}

/** The chapter a selected-node view should open on: the current or first available chapter, else the last completed. */
export function defaultSelection(model: ChronicleModel): string | null {
  const pick = (s: ChapterState) => model.nodes.find((n) => n.state === s)?.missionId;
  const completed = model.nodes.filter((n) => n.state === 'completed');
  return pick('practice') ?? pick('available') ?? pick('current') ?? completed[completed.length - 1]?.missionId ?? model.nodes[0]?.missionId ?? null;
}

/** "Chapter 4: The Return of Melas" (v2) — the label of a next-chapter choice. */
export function chapterTitle(catalog: ContentCatalog, missionId: string): string {
  const m = catalog.missions[missionId];
  const camp = m?.campaignId ? catalog.campaigns[m.campaignId] : undefined;
  const ch = camp?.chapters?.find((c) => c.missionId === missionId);
  return ch ? `Chapter ${ch.chapter}: ${m?.name ?? missionId}` : m ? `Mission ${m.order}: ${m.name}` : missionId;
}

// ---------------------------------------------------------------------------
// What a chapter leaves behind
// ---------------------------------------------------------------------------

export interface LeftBehindFact {
  readonly flag: string;
  readonly title: string;
  readonly text: string | null;
  readonly icon: EvidenceDefinition['icon'] | null;
}

export interface CarryoverLine {
  readonly label: string;
  readonly value: string;
}

/** The completion record shape this view needs (from `CampaignState.completions`). */
type CompletionLike = RunState['completions'][number];

/**
 * The facts a completed chapter recorded (`completions[].facts`), each named by
 * the chapter's own evidence entry, else the campaign's, else a readable form
 * of the flag.
 */
export function chapterFacts(catalog: ContentCatalog, mission: Pick<MissionDefinition, 'evidence' | 'campaignId'>, record: Pick<CompletionLike, 'facts'> | null | undefined): LeftBehindFact[] {
  return (record?.facts ?? []).map((flag) => {
    const own = mission.evidence?.find((e) => e.flag === flag);
    if (own) return { flag, title: own.title, text: own.text, icon: own.icon };
    const info = factInfo(catalog, flag, mission.campaignId);
    return { flag, title: info.title, text: info.text, icon: info.icon };
  });
}

/** The bounded hero carry-over a completion record hands to the next chapter. */
export function carryoverLines(catalog: ContentCatalog, record: Pick<CompletionLike, 'carryover' | 'summary'>): CarryoverLine[] {
  const c = record.carryover;
  const artifacts = Object.keys(c.equipment).length + c.backpack.length;
  const gods = [c.patronGodId, ...c.minorGodIds].filter((g): g is string => !!g).map((g) => catalog.gods[g]?.name ?? g);
  const skills = c.skills.map((s) => catalog.skills[s.skillId]?.name ?? s.skillId);
  return [
    { label: c.name, value: `Level ${c.level} · ${c.xp.toLocaleString('en-US')} XP${record.summary.xpCapped ? ' (capped for this chapter)' : ''}` },
    { label: 'Skills', value: skills.length ? skills.join(', ') : 'None' },
    { label: 'Spells', value: c.knownSpellIds.length ? `${c.knownSpellIds.length} known${c.spellbook ? '' : ' (no spellbook)'}` : c.spellbook ? 'Spellbook, no spells yet' : 'None' },
    { label: 'Artifacts', value: artifacts ? `${artifacts} (worn and carried)` : 'None' },
    { label: 'Gods', value: gods.length ? gods.join(', ') : 'None' },
  ];
}

// ---------------------------------------------------------------------------
// Epilogue
// ---------------------------------------------------------------------------

/**
 * The closing scene of a finished run: content v2 plays `epilogueV2` (its common
 * lines, then the variant whose flag the final choices set) over `epilogueV2.art`;
 * a v1 run keeps its own epilogue and ending picture. `flags` are the final
 * chapter's mission flags; a v2 run's campaign facts count as set flags too.
 */
export function campaignEpilogue(camp: CampaignDefinition, run: Pick<RunState, 'contentVersion' | 'facts'> | null, missionFlags: Readonly<Record<string, boolean | undefined>>): { readonly lines: readonly DialogueLine[]; readonly artId: string | null } {
  const v2 = (run?.contentVersion ?? 1) === 2 && !!camp.epilogueV2;
  if (v2) {
    const flags: Record<string, boolean | undefined> = { ...missionFlags };
    for (const f of run?.facts ?? []) flags[f] = true;
    return { lines: campaignEpilogueV2Lines(camp, flags), artId: camp.epilogueV2!.art };
  }
  return { lines: campaignEpilogueLines(camp, missionFlags), artId: campaignEndingArtId(camp, missionFlags) };
}

// ---------------------------------------------------------------------------
// Saves: content version, chapter and branch
// ---------------------------------------------------------------------------

export interface SaveRunInfo {
  /** 1 (legacy missions) or 2 (the chapter graph); null outside campaigns. */
  readonly version: 1 | 2 | null;
  readonly versionLabel: string | null;
  /** "Chapter 3 of 6 — The Hall of Echoes" (v2) or "Mission 3 of 7" (v1); null outside campaigns. */
  readonly progress: string | null;
  readonly branch: 'primary' | 'practice' | 'skirmish';
  /** "Practice replay" for a practice branch (kept apart from the primary run); null otherwise. */
  readonly branchLabel: string | null;
  /** The run's final chapter is complete. */
  readonly completed: boolean;
}

export const CONTENT_VERSION_LABEL: Record<1 | 2, string> = { 1: 'Legacy campaign (v1)', 2: 'Chronicle (v2)' };

/**
 * A save's campaign facts for the save list and Continue. The snapshot is
 * authoritative; saves written before `campaignContentVersion` / `chapterNumber`
 * existed get them from their snapshot (no content version = v1). When only the
 * metadata is readable (an incompatible save), the metadata alone is used.
 */
export function saveRunInfo(catalog: ContentCatalog, metadata: SaveMetadata | null | undefined, snapshot: SaveSnapshot | null | undefined): SaveRunInfo {
  const run = snapshot?.campaign ?? null;
  const branch: SaveRunInfo['branch'] = run ? run.branch : (metadata?.branch ?? 'skirmish');
  const isCampaign = !!run || (!!metadata?.campaignName && branch !== 'skirmish');
  if (!isCampaign) return { version: null, versionLabel: null, progress: null, branch: 'skirmish', branchLabel: null, completed: false };
  const version: 1 | 2 = run ? contentVersionOf(run) : (metadata?.campaignContentVersion ?? 1);
  const branchLabel = branch === 'practice' ? 'Practice replay' : null;
  if (!run) {
    const n = metadata?.chapterNumber;
    const progress = n ? (version === 2 ? `Chapter ${n} — ${metadata?.missionName ?? ''}` : `Mission ${n}`) : null;
    return { version, versionLabel: CONTENT_VERSION_LABEL[version], progress, branch, branchLabel, completed: false };
  }
  const camp = catalog.campaigns[run.campaignId];
  const completed = run.status === 'completed';
  let progress: string | null = null;
  if (camp) {
    const ids = runMissionIds(catalog, run);
    const index = ids.indexOf(run.currentMissionId);
    if (version === 2) {
      const ch = camp.chapters?.find((c) => c.missionId === run.currentMissionId);
      const n = ch?.chapter ?? (index >= 0 ? index + 1 : metadata?.chapterNumber);
      const name = catalog.missions[run.currentMissionId]?.name ?? metadata?.missionName ?? '';
      progress = n ? `Chapter ${n} of ${camp.chapters?.length ?? ids.length} — ${name}` : null;
    } else {
      const n = index >= 0 ? index + 1 : metadata?.chapterNumber;
      progress = n ? `Mission ${n} of ${ids.length}` : null;
    }
  }
  return { version, versionLabel: CONTENT_VERSION_LABEL[version], progress, branch, branchLabel, completed };
}
