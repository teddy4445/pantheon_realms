/**
 * Campaign state machine and CarryoverPolicy (campaign/01 §4, §8).
 *
 * The next mission is initialized from exactly one committed completion record.
 * Completing twice, reloading, or clicking Continue twice cannot create a second
 * reinforcement army: every transition is keyed by the record.
 */
import { getCampaign, hashValue, type ContentCatalog, type GodId, type MatchState } from '@pr/rules';
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
}

export interface CampaignState {
  readonly kind: 'campaign';
  readonly campaignId: string;
  readonly campaignRunId: string;
  readonly branch: 'primary' | 'practice';
  readonly startingGodId: GodId | null;
  readonly currentMissionId: string;
  readonly currentEntryHash: string;
  /** Carryover used to create the current mission (null for mission 1). */
  readonly currentEntryCarryover: HeroCarryover | null;
  readonly completions: readonly CompletionRecord[];
  readonly status: 'in_progress' | 'completed';
  readonly battlesWon: number;
}

export interface CampaignStart {
  readonly campaign: CampaignState;
  readonly start: MissionStart;
}

export function startCampaign(
  catalog: ContentCatalog,
  campaignId: string,
  opts: { runId: string; startingGodId: GodId | null },
): CampaignStart {
  const camp = getCampaign(catalog, campaignId);
  if (camp.status !== 'playable') throw new Error(`${camp.name} is not available in this build`);
  if (opts.startingGodId && !camp.startingGodOptions.includes(opts.startingGodId)) {
    throw new Error(`${opts.startingGodId} is not a starting option for ${camp.name}`);
  }
  const godId = opts.startingGodId ?? camp.startingGodOptions[0] ?? null;
  const firstMission = camp.missionIds[0]!;
  const start = createMissionMatch(catalog, firstMission, { matchId: `${opts.runId}:${firstMission}`, startingGodId: godId });
  return {
    campaign: {
      kind: 'campaign',
      campaignId,
      campaignRunId: opts.runId,
      branch: 'primary',
      startingGodId: godId,
      currentMissionId: firstMission,
      currentEntryHash: start.entryHash,
      currentEntryCarryover: null,
      completions: [],
      status: 'in_progress',
      battlesWon: 0,
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
  });
  if (start.entryHash !== campaign.currentEntryHash) {
    throw new Error('Mission entry state no longer matches its recorded hash (content or rules version changed)');
  }
  return start;
}

function summarize(catalog: ContentCatalog, match: MatchState, heroId: string, battlesWon: number): MissionSummary {
  const mission = catalog.missions[match.mission.missionId]!;
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
  };
}

/** Commit the completion record exactly once. */
export function recordCompletion(catalog: ContentCatalog, campaign: CampaignState, match: MatchState): CampaignState {
  if (match.mission.missionId !== campaign.currentMissionId) throw new Error('This match is not the current campaign mission');
  const existing = campaign.completions.find((c) => c.missionId === match.mission.missionId);
  if (existing) return campaign;
  if (match.outcome.status !== 'victory') throw new Error('The mission is not complete');
  if (match.pendingDecisions.length > 0) throw new Error('Resolve pending level-up choices first');
  const mission = catalog.missions[match.mission.missionId]!;
  const hero = match.heroes[mission.player.hero.heroId];
  if (!hero) throw new Error('Campaign hero missing');
  const carryover = carryoverFromHero(match, hero);
  const resultHash = hashValue(match);
  const battlesWon = campaign.battlesWon;
  const record: CompletionRecord = {
    missionId: mission.id,
    campaignRunId: campaign.campaignRunId,
    entryHash: campaign.currentEntryHash,
    resultHash,
    day: match.day,
    carryover,
    nextEntryKey: `${campaign.campaignRunId}:${mission.id}:${resultHash}`,
    summary: summarize(catalog, match, hero.id, battlesWon),
  };
  const camp = getCampaign(catalog, campaign.campaignId);
  const isLast = camp.missionIds[camp.missionIds.length - 1] === mission.id;
  return { ...campaign, completions: [...campaign.completions, record], status: isLast ? 'completed' : 'in_progress' };
}

export function nextMissionId(catalog: ContentCatalog, campaign: CampaignState): string | null {
  const camp = getCampaign(catalog, campaign.campaignId);
  const idx = camp.missionIds.indexOf(campaign.currentMissionId);
  return camp.missionIds[idx + 1] ?? null;
}

/**
 * Initialize the next mission from the committed completion record. Deterministic:
 * calling it again yields the identical entry state (no duplicate armies).
 */
export function startNextMission(catalog: ContentCatalog, campaign: CampaignState): { campaign: CampaignState; start: MissionStart } {
  const record = campaign.completions.find((c) => c.missionId === campaign.currentMissionId);
  if (!record) throw new Error('The current mission has no committed completion record');
  const next = nextMissionId(catalog, campaign);
  if (!next) throw new Error('The campaign has no further missions');
  const start = createMissionMatch(catalog, next, {
    matchId: `${campaign.campaignRunId}:${next}`,
    carryover: record.carryover,
    startingGodId: campaign.startingGodId,
  });
  return {
    campaign: { ...campaign, currentMissionId: next, currentEntryHash: start.entryHash, currentEntryCarryover: record.carryover },
    start,
  };
}

/** Replay an unlocked mission in a separate practice branch (never feeds the primary run). */
export function startPracticeReplay(catalog: ContentCatalog, campaign: CampaignState, missionId: string): { campaign: CampaignState; start: MissionStart } {
  const camp = getCampaign(catalog, campaign.campaignId);
  const idx = camp.missionIds.indexOf(missionId);
  if (idx < 0) throw new Error('Unknown mission');
  const unlocked = idx === 0 || campaign.completions.some((c) => c.missionId === camp.missionIds[idx - 1]);
  if (!unlocked) throw new Error('Mission not yet unlocked');
  const entryCarry = idx === 0 ? null : (campaign.completions.find((c) => c.missionId === camp.missionIds[idx - 1])?.carryover ?? null);
  const runId = `${campaign.campaignRunId}:practice:${missionId}`;
  const start = createMissionMatch(catalog, missionId, { matchId: `${runId}:${missionId}`, carryover: entryCarry, startingGodId: campaign.startingGodId });
  return {
    campaign: {
      kind: 'campaign',
      campaignId: campaign.campaignId,
      campaignRunId: runId,
      branch: 'practice',
      startingGodId: campaign.startingGodId,
      currentMissionId: missionId,
      currentEntryHash: start.entryHash,
      currentEntryCarryover: entryCarry,
      completions: [],
      status: 'in_progress',
      battlesWon: 0,
    },
    start,
  };
}

export function noteBattleWon(campaign: CampaignState): CampaignState {
  return { ...campaign, battlesWon: campaign.battlesWon + 1 };
}
