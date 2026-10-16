/**
 * Campaign state machine and CarryoverPolicy (campaign/01 §4, §8).
 *
 * The next mission is initialized from exactly one committed completion record.
 * Completing twice, reloading, or clicking Continue twice cannot create a second
 * reinforcement army: every transition is keyed by the record.
 *
 * Content version 2 (campaign expansion handoff, 2026-10-15): a campaign is a
 * chapter graph (`CampaignDefinition.chapters`, `requiresAll`). After a chapter
 * the player chooses the next one among those whose prerequisites are all
 * complete — an order choice, never exclusive branches, and never two maps at
 * once. Evidence and choices travel as campaign facts, separate from completion;
 * the chronologically latest completion supplies the hero carryover. Runs
 * started before content v2 (no `contentVersion`) stay bound to the v1 linear
 * `missionIds` and their own mission definitions.
 */
import { getCampaign, hashValue, matchScore, type CampaignChapterDefinition, type ContentCatalog, type GodId, type MatchState, requireScenarioMission } from '@pr/rules';
import { carryoverFromHero, createMissionMatch, type HeroCarryover, type MissionStart } from './missionFactory';

export interface CompletionRecord {
  readonly missionId: string;
  readonly campaignRunId: string;
  readonly entryHash: string;
  readonly resultHash: string;
  readonly day: number;
  readonly carryover: HeroCarryover;
  /** Idempotency key for initializing the next mission. */
  readonly nextEntryKey: string;
  readonly summary: MissionSummary;
  /** Content v2: the mission's carried flags that were set (evidence found, choices made). */
  readonly facts?: readonly string[];
}

export interface MissionSummary {
  readonly missionName: string;
  readonly days: number;
  readonly battlesWon: number;
  readonly objectivesCompleted: number;
  readonly objectivesTotal: number;
  readonly upgradesTrained: number;
  readonly chosenGodIds: readonly string[];
  readonly heroLevel: number;
  readonly heroXp: number;
  readonly xpCapped: boolean;
  /** Mission score (proposed this build; absent in records made by older builds). */
  readonly score?: number;
}

export interface CampaignState {
  readonly kind: 'campaign';
  readonly campaignId: string;
  readonly campaignRunId: string;
  readonly branch: 'primary' | 'practice';
  readonly startingGodId: GodId | null;
  /**
   * Campaign difficulty level, kept for every mission of the run (proposed
   * 2026-10-07). Absent in runs started by older builds: their missions keep
   * the values as written, so their recorded entry hashes still match.
   */
  readonly difficultyId?: string | null;
  readonly currentMissionId: string;
  readonly currentEntryHash: string;
  /** Carryover used to create the current mission (null for mission 1). */
  readonly currentEntryCarryover: HeroCarryover | null;
  readonly completions: readonly CompletionRecord[];
  readonly status: 'in_progress' | 'completed';
  readonly battlesWon: number;
  /** Campaign content version of this run (absent = 1: a run started before content v2). */
  readonly contentVersion?: 1 | 2;
  /** Content v2: campaign facts collected so far (evidence and choices), in first-seen order. */
  readonly facts?: readonly string[];
  /** Content v2: the facts the current mission was created with (restart rebuilds the same entry). */
  readonly currentEntryFacts?: readonly string[];
}

/** The run's content version (1 for runs started before content v2). */
export function contentVersionOf(campaign: CampaignState): 1 | 2 {
  return campaign.contentVersion ?? 1;
}

/** The content version a new run of this campaign plays: 2 when it has a chapter graph. */
export function newRunContentVersion(catalog: ContentCatalog, campaignId: string): 1 | 2 {
  return getCampaign(catalog, campaignId).chapters?.length ? 2 : 1;
}

/** The run's chapters (v2), or null for a v1 run. */
export function runChapters(catalog: ContentCatalog, campaign: CampaignState): readonly CampaignChapterDefinition[] | null {
  if (contentVersionOf(campaign) !== 2) return null;
  return getCampaign(catalog, campaign.campaignId).chapters ?? null;
}

/** The mission IDs of a run in order: v2 chapters, else the v1 list. */
export function runMissionIds(catalog: ContentCatalog, campaign: CampaignState): readonly string[] {
  return runChapters(catalog, campaign)?.map((c) => c.missionId) ?? getCampaign(catalog, campaign.campaignId).missionIds;
}

/**
 * Content v2: the chapters the player may start next — not yet complete, every
 * prerequisite complete. Empty while the current chapter is unfinished (one map
 * at a time) and for v1 runs.
 */
export function availableChapters(catalog: ContentCatalog, campaign: CampaignState): CampaignChapterDefinition[] {
  const chapters = runChapters(catalog, campaign);
  if (!chapters) return [];
  const done = new Set(campaign.completions.map((c) => c.missionId));
  if (!done.has(campaign.currentMissionId)) return [];
  return chapters.filter((c) => !done.has(c.missionId) && c.requiresAll.every((r) => done.has(r)));
}

/** Content v2: a chapter's state for the chronicle. */
export function chapterState(catalog: ContentCatalog, campaign: CampaignState, missionId: string): 'completed' | 'current' | 'available' | 'locked' {
  const done = new Set(campaign.completions.map((c) => c.missionId));
  if (done.has(missionId)) return 'completed';
  if (campaign.currentMissionId === missionId) return 'current';
  return availableChapters(catalog, campaign).some((c) => c.missionId === missionId) ? 'available' : 'locked';
}

export interface CampaignStart {
  readonly campaign: CampaignState;
  readonly start: MissionStart;
}

export function startCampaign(
  catalog: ContentCatalog,
  campaignId: string,
  opts: { runId: string; startingGodId: GodId | null; difficultyId?: string | null; contentVersion?: 1 | 2 },
): CampaignStart {
  const camp = getCampaign(catalog, campaignId);
  if (camp.status !== 'playable') throw new Error(`${camp.name} is not available in this build`);
  if (opts.startingGodId && !camp.startingGodOptions.includes(opts.startingGodId)) {
    throw new Error(`${opts.startingGodId} is not a starting option for ${camp.name}`);
  }
  const godId = opts.startingGodId ?? camp.startingGodOptions[0] ?? null;
  const difficultyId = opts.difficultyId ?? null;
  if (difficultyId && catalog.difficulties?.[difficultyId]?.scope !== 'campaign') throw new Error(`${difficultyId} is not a campaign difficulty`);
  const version = opts.contentVersion ?? newRunContentVersion(catalog, campaignId);
  if (version === 2 && !camp.chapters?.length) throw new Error(`${camp.name} has no content version 2`);
  const roots = version === 2 ? camp.chapters!.filter((c) => c.requiresAll.length === 0) : [];
  if (version === 2 && roots.length !== 1) throw new Error(`${camp.name}: content v2 needs exactly one opening chapter`);
  const firstMission = version === 2 ? roots[0]!.missionId : camp.missionIds[0]!;
  const start = createMissionMatch(catalog, firstMission, { matchId: `${opts.runId}:${firstMission}`, startingGodId: godId, difficultyId, ...(version === 2 ? { facts: [] } : {}) });
  return {
    campaign: {
      kind: 'campaign',
      campaignId,
      campaignRunId: opts.runId,
      branch: 'primary',
      startingGodId: godId,
      difficultyId,
      currentMissionId: firstMission,
      currentEntryHash: start.entryHash,
      currentEntryCarryover: null,
      completions: [],
      status: 'in_progress',
      battlesWon: 0,
      ...(version === 2 ? { contentVersion: 2 as const, facts: [], currentEntryFacts: [] } : {}),
    },
    start,
  };
}

/** Rebuild the current mission's exact entry state (restart / checkpoint of last resort). */
export function restartCurrentMission(catalog: ContentCatalog, campaign: CampaignState): MissionStart {
  const start = createMissionMatch(catalog, campaign.currentMissionId, {
    matchId: `${campaign.campaignRunId}:${campaign.currentMissionId}`,
    carryover: campaign.currentEntryCarryover,
    startingGodId: campaign.startingGodId,
    difficultyId: campaign.difficultyId ?? null,
    ...(contentVersionOf(campaign) === 2 ? { facts: campaign.currentEntryFacts ?? [] } : {}),
  });
  if (start.entryHash !== campaign.currentEntryHash) {
    throw new Error('Mission entry state no longer matches its recorded hash (content or rules version changed)');
  }
  return start;
}

function summarize(catalog: ContentCatalog, match: MatchState, heroId: string, battlesWon: number): MissionSummary {
  const mission = requireScenarioMission(catalog, match);
  const hero = match.heroes[heroId]!;
  const objs = Object.values(match.mission.objectives);
  const trained = Object.entries(match.mission.counters)
    .filter(([k]) => k.startsWith('trained:'))
    .reduce((n, [, v]) => n + v, 0);
  const player = match.players[mission.player.playerId];
  return {
    missionName: mission.name,
    days: match.day,
    battlesWon,
    objectivesCompleted: objs.filter((o) => o.status === 'completed').length,
    objectivesTotal: objs.length,
    upgradesTrained: trained,
    chosenGodIds: [...(player?.pantheon.patronGodId ? [player.pantheon.patronGodId] : []), ...(player?.pantheon.minorGodIds ?? [])],
    heroLevel: hero.level,
    heroXp: hero.xp,
    xpCapped: mission.xpCap !== null && hero.xp >= mission.xpCap,
    score: matchScore(catalog, match, mission.player.playerId).total,
  };
}

/** Campaign score: the sum of the primary branch's mission scores. */
export function campaignScore(campaign: CampaignState): number {
  return campaign.completions.reduce((n, c) => n + (c.summary.score ?? 0), 0);
}

/** Commit the completion record exactly once. */
export function recordCompletion(catalog: ContentCatalog, campaign: CampaignState, match: MatchState): CampaignState {
  if (match.mission.missionId !== campaign.currentMissionId) throw new Error('This match is not the current campaign mission');
  const existing = campaign.completions.find((c) => c.missionId === match.mission.missionId);
  if (existing) return campaign;
  if (match.outcome.status !== 'victory') throw new Error('The mission is not complete');
  if (match.pendingDecisions.length > 0) throw new Error('Resolve pending level-up choices first');
  const mission = requireScenarioMission(catalog, match);
  const hero = match.heroes[mission.player.hero.heroId];
  if (!hero) throw new Error('Campaign hero missing');
  const carryover = carryoverFromHero(match, hero);
  const resultHash = hashValue(match);
  const battlesWon = campaign.battlesWon;
  const v2 = contentVersionOf(campaign) === 2;
  // Content v2: the evidence and choices this chapter leaves behind, kept apart from completion.
  const facts = v2 ? (mission.carriedFlags ?? []).filter((f) => match.mission.flags[f]) : [];
  const record: CompletionRecord = {
    missionId: mission.id,
    campaignRunId: campaign.campaignRunId,
    entryHash: campaign.currentEntryHash,
    resultHash,
    day: match.day,
    carryover,
    nextEntryKey: `${campaign.campaignRunId}:${mission.id}:${resultHash}`,
    summary: summarize(catalog, match, hero.id, battlesWon),
    ...(v2 ? { facts } : {}),
  };
  const camp = getCampaign(catalog, campaign.campaignId);
  const isLast = v2 ? camp.finalChapterId === mission.id : camp.missionIds[camp.missionIds.length - 1] === mission.id;
  const merged = v2 ? [...(campaign.facts ?? []), ...facts.filter((f) => !(campaign.facts ?? []).includes(f))] : undefined;
  return { ...campaign, completions: [...campaign.completions, record], status: isLast ? 'completed' : 'in_progress', ...(merged ? { facts: merged } : {}) };
}

/** The next mission: v1 — the next in order; v2 — the only available chapter (null when there is a choice or none). */
export function nextMissionId(catalog: ContentCatalog, campaign: CampaignState): string | null {
  if (contentVersionOf(campaign) === 2) {
    const avail = availableChapters(catalog, campaign);
    return avail.length === 1 ? avail[0]!.missionId : null;
  }
  const camp = getCampaign(catalog, campaign.campaignId);
  const idx = camp.missionIds.indexOf(campaign.currentMissionId);
  return camp.missionIds[idx + 1] ?? null;
}

/** True when another mission follows (v2: at least one chapter is available). */
export function hasNextMission(catalog: ContentCatalog, campaign: CampaignState): boolean {
  if (contentVersionOf(campaign) === 2) return availableChapters(catalog, campaign).length > 0;
  return nextMissionId(catalog, campaign) !== null;
}

/**
 * Initialize the next mission from the committed completion record. Deterministic:
 * calling it again yields the identical entry state (no duplicate armies).
 */
export function startNextMission(catalog: ContentCatalog, campaign: CampaignState, chosenMissionId?: string): { campaign: CampaignState; start: MissionStart } {
  const record = campaign.completions.find((c) => c.missionId === campaign.currentMissionId);
  if (!record) throw new Error('The current mission has no committed completion record');
  if (contentVersionOf(campaign) === 2) {
    // Content v2: the player's chosen chapter, validated against the graph.
    const avail = availableChapters(catalog, campaign);
    const next = chosenMissionId ?? (avail.length === 1 ? avail[0]!.missionId : null);
    if (!next) throw new Error(avail.length === 0 ? 'The campaign has no further chapters' : 'Choose the next chapter');
    if (!avail.some((c) => c.missionId === next)) throw new Error('That chapter is not available yet');
    // The latest completion supplies the bounded hero carryover; facts carry the story.
    const latest = campaign.completions[campaign.completions.length - 1]!;
    const facts = [...(campaign.facts ?? [])];
    const start = createMissionMatch(catalog, next, {
      matchId: `${campaign.campaignRunId}:${next}`,
      carryover: latest.carryover,
      startingGodId: campaign.startingGodId,
      difficultyId: campaign.difficultyId ?? null,
      facts,
    });
    return {
      campaign: { ...campaign, currentMissionId: next, currentEntryHash: start.entryHash, currentEntryCarryover: latest.carryover, currentEntryFacts: facts },
      start,
    };
  }
  const next = nextMissionId(catalog, campaign);
  if (!next) throw new Error('The campaign has no further missions');
  if (chosenMissionId && chosenMissionId !== next) throw new Error('That mission is not next in this campaign');
  const start = createMissionMatch(catalog, next, {
    matchId: `${campaign.campaignRunId}:${next}`,
    carryover: record.carryover,
    startingGodId: campaign.startingGodId,
    difficultyId: campaign.difficultyId ?? null,
  });
  return {
    campaign: { ...campaign, currentMissionId: next, currentEntryHash: start.entryHash, currentEntryCarryover: record.carryover },
    start,
  };
}

/** Replay an unlocked mission in a separate practice branch (never feeds the primary run). */
export function startPracticeReplay(catalog: ContentCatalog, campaign: CampaignState, missionId: string): { campaign: CampaignState; start: MissionStart } {
  const camp = getCampaign(catalog, campaign.campaignId);
  const v2 = contentVersionOf(campaign) === 2;
  let entryCarry: CompletionRecord['carryover'] | null;
  let facts: string[] | undefined;
  if (v2) {
    // Practice on a completed or reachable chapter: the entry its prerequisites gave.
    const chapter = camp.chapters?.find((c) => c.missionId === missionId);
    if (!chapter) throw new Error('Unknown chapter');
    const indexOf = (id: string) => campaign.completions.findIndex((c) => c.missionId === id);
    if (chapter.requiresAll.some((r) => indexOf(r) < 0)) throw new Error('Chapter not yet unlocked');
    const last = Math.max(-1, ...chapter.requiresAll.map(indexOf));
    entryCarry = last >= 0 ? campaign.completions[last]!.carryover : null;
    facts = [...new Set(campaign.completions.slice(0, last + 1).flatMap((c) => c.facts ?? []))];
  } else {
    const idx = camp.missionIds.indexOf(missionId);
    if (idx < 0) throw new Error('Unknown mission');
    const unlocked = idx === 0 || campaign.completions.some((c) => c.missionId === camp.missionIds[idx - 1]);
    if (!unlocked) throw new Error('Mission not yet unlocked');
    entryCarry = idx === 0 ? null : (campaign.completions.find((c) => c.missionId === camp.missionIds[idx - 1])?.carryover ?? null);
  }
  const runId = `${campaign.campaignRunId}:practice:${missionId}`;
  const start = createMissionMatch(catalog, missionId, { matchId: `${runId}:${missionId}`, carryover: entryCarry, startingGodId: campaign.startingGodId, difficultyId: campaign.difficultyId ?? null, ...(facts ? { facts } : {}) });
  return {
    campaign: {
      kind: 'campaign',
      campaignId: campaign.campaignId,
      campaignRunId: runId,
      branch: 'practice',
      startingGodId: campaign.startingGodId,
      difficultyId: campaign.difficultyId ?? null,
      currentMissionId: missionId,
      currentEntryHash: start.entryHash,
      currentEntryCarryover: entryCarry,
      completions: [],
      status: 'in_progress',
      battlesWon: 0,
      ...(v2 ? { contentVersion: 2 as const, facts: facts ?? [], currentEntryFacts: facts ?? [] } : {}),
    },
    start,
  };
}

export function noteBattleWon(campaign: CampaignState): CampaignState {
  return { ...campaign, battlesWon: campaign.battlesWon + 1 };
}
