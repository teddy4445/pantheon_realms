/**
 * Campaign content v2 (expansion of 2026-10-15) in the Journal, the mission
 * introduction and the adventure HUD: pure view models over the saved match
 * and the mission definition. Nothing here decides an outcome or reads hidden
 * information: deadlines show the saved days, evidence appears only once its
 * flag is set, and a patrol is listed with the purpose its definition states.
 * Content v1 missions get nothing from these functions (`isV2Mission`).
 */
import {
  cellIndex,
  manualBattlesRequired,
  missionBriefingLines,
  missionSite,
  missionText,
  timerDaysLeft,
  timerStates,
  type ContentCatalog,
  type DialogueLine,
  type EvidenceDefinition,
  type MatchState,
  type MissionDefinition,
  type ObjectiveDefinition,
  type PlayerId,
} from '@pr/rules';

/** A content-v2 chapter (absent `contentVersion` = a v1 mission, shown as before). */
export function isV2Mission(mission: Pick<MissionDefinition, 'contentVersion'> | null | undefined): boolean {
  return mission?.contentVersion === 2;
}

/** The ledger icon of an evidence entry (the delivered campaign kit; accessible names below). */
export const EVIDENCE_ICON: Record<EvidenceDefinition['icon'], { readonly id: string; readonly label: string }> = {
  evidence: { id: 'campaignv2.icon.evidence', label: 'Evidence' },
  pact: { id: 'campaignv2.icon.pact', label: 'Pact' },
  supply: { id: 'campaignv2.icon.supply', label: 'Supplies' },
  evacuation: { id: 'campaignv2.icon.evacuation', label: 'Evacuation' },
  branch: { id: 'campaignv2.icon.branch', label: 'Decision' },
};

export const MANUAL_BATTLE_ICON = 'campaignv2.icon.manual.battle.v2';
export const MANUAL_BATTLE_NOTICE = 'Battles in this campaign are fought on the battlefield';

// ---------------------------------------------------------------------------
// Objectives
// ---------------------------------------------------------------------------

/**
 * How an objective's status reads in a v2 journal: a failed optional objective
 * is a missed opportunity, never a defeat.
 */
export function objectiveStatusText(o: Pick<ObjectiveDefinition, 'category'>, status: string): string {
  if (status === 'failed') return o.category === 'optional' ? 'Missed' : 'Failed';
  if (status === 'completed') return 'Completed';
  if (status === 'available') return 'Ready to claim';
  if (status === 'locked') return 'Not open yet';
  return 'In progress';
}

/**
 * The deadline that cost an optional objective (an expired timer that fails it),
 * so the journal can say why the opportunity was missed.
 */
export function missedBecause(catalog: ContentCatalog, state: MatchState, objectiveId: string): { readonly label: string; readonly day: number | null } | null {
  for (const { def, state: t } of timerStates(catalog, state)) {
    if (t.status === 'expired' && (def.onExpire.failObjectives ?? []).includes(objectiveId)) return { label: def.label, day: t.resolvedDay ?? null };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Deadlines
// ---------------------------------------------------------------------------

export interface DeadlineEntry {
  readonly id: string;
  readonly label: string;
  /** 'announced': waiting with an announcement (no deadline yet). */
  readonly status: 'announced' | 'running' | 'met' | 'expired';
  /** The one line shown under the label. */
  readonly text: string;
  /** The stated consequence of missing it (running and announced timers). */
  readonly consequence: string | null;
  readonly daysLeft: number | null;
  readonly deadlineDay: number | null;
  readonly startedDay: number | null;
  readonly resolvedDay: number | null;
}

/** "8 days left", "1 day left", "last day". */
export function daysLeftText(n: number): string {
  if (n <= 0) return 'last day';
  return n === 1 ? '1 day left' : `${n} days left`;
}

/**
 * Every deadline the player knows of, from the SAVED timer days: an announced
 * one before it starts (its announcement — no deadline is invented), a running
 * one with its deadline, start day and days left, and the day it was met or
 * expired. A waiting timer without an announcement is not listed.
 */
export function deadlineEntries(catalog: ContentCatalog, state: MatchState): DeadlineEntry[] {
  const out: DeadlineEntry[] = [];
  for (const { id, def, state: t } of timerStates(catalog, state)) {
    const base = { id, label: def.label, deadlineDay: t.deadlineDay ?? null, startedDay: t.startedDay ?? null, resolvedDay: t.resolvedDay ?? null };
    const consequence = def.consequence ? missionText(catalog, state, def.consequence) : null;
    if (t.status === 'waiting') {
      if (!def.announce) continue;
      out.push({ ...base, status: 'announced', text: missionText(catalog, state, def.announce), consequence, daysLeft: null });
    } else if (t.status === 'running') {
      const left = timerDaysLeft(state, t);
      const started = t.startedDay !== undefined ? ` (started day ${t.startedDay})` : '';
      const text = t.deadlineDay !== undefined ? `Deadline: day ${t.deadlineDay}${started}${left !== null ? ` · ${daysLeftText(left)}` : ''}` : 'Running';
      out.push({ ...base, status: 'running', text, consequence, daysLeft: left });
    } else if (t.status === 'met') {
      out.push({ ...base, status: 'met', text: t.resolvedDay !== undefined ? `Met on day ${t.resolvedDay}` : 'Met', consequence: null, daysLeft: null });
    } else {
      out.push({ ...base, status: 'expired', text: t.resolvedDay !== undefined ? `Expired on day ${t.resolvedDay}` : 'Expired', consequence, daysLeft: null });
    }
  }
  return out;
}

/** The running deadlines only (the adventure HUD), most urgent first. */
export function runningDeadlines(catalog: ContentCatalog, state: MatchState): DeadlineEntry[] {
  return deadlineEntries(catalog, state)
    .filter((d) => d.status === 'running')
    .sort((a, b) => (a.daysLeft ?? 0) - (b.daysLeft ?? 0));
}

// ---------------------------------------------------------------------------
// Evidence & decisions
// ---------------------------------------------------------------------------

/** The evidence and decisions found so far (flag set), in the chapter's order. Unfound entries are not listed. */
export function evidenceLedger(mission: Pick<MissionDefinition, 'evidence'>, flags: Readonly<Record<string, boolean | undefined>>): EvidenceDefinition[] {
  return (mission.evidence ?? []).filter((e) => !!flags[e.flag]);
}

// ---------------------------------------------------------------------------
// Known threats
// ---------------------------------------------------------------------------

export interface ThreatEntry {
  /** The hostile hero's state ID. */
  readonly id: string;
  readonly name: string;
  readonly purpose: string;
  /** 'waiting': an announced counterattack that has not marched yet. */
  readonly status: 'active' | 'waiting' | 'withdrawn' | 'defeated';
  readonly homeSiteId: string | null;
  readonly homeName: string | null;
  /** The home camp has been taken (the reason it withdrew). */
  readonly homeFallen: boolean;
}

/**
 * Each hostile patrol with its stated purpose: withdrawn once its home camp has
 * fallen (or it retreated), defeated when beaten, waiting while an announced
 * counterattack's flag is unset.
 */
export function knownThreats(catalog: ContentCatalog, state: MatchState, mission: Pick<MissionDefinition, 'hostileHeroes'>): ThreatEntry[] {
  const out: ThreatEntry[] = [];
  mission.hostileHeroes.forEach((hh, i) => {
    if (!hh.purpose) return;
    const id = `${hh.commander.heroDefinitionId}_${i}`;
    const hero = state.heroes[id];
    const home = hh.homeSiteId ?? null;
    const homeFallen = !!home && state.world.sites[home]?.cleared === true;
    const status: ThreatEntry['status'] =
      hero?.status === 'defeated'
        ? 'defeated'
        : homeFallen || hero?.status === 'retreated'
          ? 'withdrawn'
          : hh.dormantUntilFlag && !state.mission.flags[hh.dormantUntilFlag]
            ? 'waiting'
            : 'active';
    out.push({
      id,
      name: hero?.name ?? hh.commander.name,
      purpose: missionText(catalog, state, hh.purpose),
      status,
      homeSiteId: home,
      homeName: home ? (missionSite(catalog, state, home)?.name ?? null) : null,
      homeFallen,
    });
  });
  return out;
}

export const THREAT_STATUS_TEXT: Record<ThreatEntry['status'], string> = {
  active: 'Active',
  waiting: 'Waiting',
  withdrawn: 'Withdrawn',
  defeated: 'Defeated',
};

/** Whether the player knows where a site is (explored, or revealed by the story). */
export function siteKnown(catalog: ContentCatalog, state: MatchState, playerId: PlayerId, siteId: string): boolean {
  const site = missionSite(catalog, state, siteId);
  if (!site) return false;
  return state.fog[playerId]?.explored[cellIndex(state.world.map, site.coord)] === 1 || state.mission.revealedSiteIds.includes(site.id);
}

// ---------------------------------------------------------------------------
// Carried from earlier chapters
// ---------------------------------------------------------------------------

export interface CarriedFact {
  readonly flag: string;
  readonly title: string;
  readonly text: string | null;
  readonly icon: EvidenceDefinition['icon'] | null;
}

export interface CarriedLedger {
  /** Entry bonuses granted at this chapter's start (their fact is set). */
  readonly bonuses: readonly { readonly fact: string; readonly label: string }[];
  /** Campaign facts known from earlier chapters. */
  readonly facts: readonly CarriedFact[];
}

/** A readable name for a fact without an evidence definition ("so3_records" → "Records"). */
export function humanizeFact(flag: string): string {
  const words = flag.replace(/^[a-z]{1,4}\d*_/, '').replace(/_/g, ' ').trim();
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : flag;
}

/**
 * The title of a campaign fact: the evidence definition with that flag in any
 * mission (the campaign's own chapters first), else a readable form of the flag.
 */
export function factInfo(catalog: ContentCatalog, flag: string, campaignId: string | null): CarriedFact {
  const missions = Object.values(catalog.missions);
  const ordered = [...missions.filter((m) => m.campaignId === campaignId), ...missions.filter((m) => m.campaignId !== campaignId)];
  for (const m of ordered) {
    const e = m.evidence?.find((x) => x.flag === flag);
    if (e) return { flag, title: e.title, text: e.text, icon: e.icon };
  }
  return { flag, title: humanizeFact(flag), text: null, icon: null };
}

/** What this chapter carries from earlier ones: the granted entry bonuses and the known facts (`fact:<flag>`). */
export function carriedFromEarlier(catalog: ContentCatalog, mission: Pick<MissionDefinition, 'entryBonuses' | 'campaignId'>, flags: Readonly<Record<string, boolean | undefined>>): CarriedLedger {
  const bonuses = (mission.entryBonuses ?? []).filter((b) => !!flags[`fact:${b.fact}`]).map((b) => ({ fact: b.fact, label: b.label }));
  const facts = Object.keys(flags)
    .filter((f) => f.startsWith('fact:') && flags[f])
    .map((f) => f.slice('fact:'.length))
    .sort()
    .map((f) => factInfo(catalog, f, mission.campaignId));
  return { bonuses, facts };
}

// ---------------------------------------------------------------------------
// Mission introduction
// ---------------------------------------------------------------------------

export interface MissionIntro {
  /** The briefing for the facts in hand (base lines, then the matching variants). */
  readonly lines: readonly DialogueLine[];
  readonly v2: boolean;
  /** The chapter's cover painting (`briefingArt[0]`), v2 only. */
  readonly coverAssetId: string | null;
  /** Required tasks open now (locked steps stay hidden), with how many open later. */
  readonly requiredTasks: readonly { readonly id: string; readonly title: string; readonly status: string }[];
  readonly laterTasks: number;
  readonly lossConditions: readonly string[];
  /** Announced or running deadlines. */
  readonly deadlines: readonly DeadlineEntry[];
  readonly entryBonuses: readonly string[];
  readonly manualBattles: boolean;
}

export function missionIntro(catalog: ContentCatalog, state: MatchState, mission: MissionDefinition): MissionIntro {
  const lines = missionBriefingLines(mission, state.mission.flags);
  if (!isV2Mission(mission)) {
    return { lines, v2: false, coverAssetId: null, requiredTasks: [], laterTasks: 0, lossConditions: [], deadlines: [], entryBonuses: [], manualBattles: false };
  }
  const required = mission.objectives.filter((o) => o.category === 'primary');
  const open = required.filter((o) => (state.mission.objectives[o.id]?.status ?? o.initialStatus) !== 'locked');
  return {
    lines,
    v2: true,
    coverAssetId: mission.briefingArt?.[0] ?? null,
    requiredTasks: open.map((o) => ({ id: o.id, title: o.title, status: state.mission.objectives[o.id]?.status ?? o.initialStatus })),
    laterTasks: required.length - open.length,
    lossConditions: mission.lossConditions ?? [],
    deadlines: deadlineEntries(catalog, state).filter((d) => d.status === 'announced' || d.status === 'running'),
    entryBonuses: carriedFromEarlier(catalog, mission, state.mission.flags).bonuses.map((b) => b.label),
    manualBattles: manualBattlesRequired(state),
  };
}

// ---------------------------------------------------------------------------
// Event illustrations
// ---------------------------------------------------------------------------

/**
 * The painting behind a story scene of a v2 chapter that carries several legacy
 * chapters (`briefingArt.length > 1`): the cover stays the introduction's; the
 * additional paintings follow the required objectives — the first once one
 * required objective is complete, later ones spread evenly over the rest.
 * Null for v1 missions, single-painting chapters and scenes before the first
 * required objective (they play as before).
 */
export function sceneIllustrationId(mission: Pick<MissionDefinition, 'contentVersion' | 'briefingArt' | 'objectives'> | null | undefined, state: MatchState): string | null {
  const art = mission?.briefingArt ?? [];
  if (!mission || !isV2Mission(mission) || art.length < 2) return null;
  const required = mission.objectives.filter((o) => o.category === 'primary');
  if (required.length === 0) return null;
  const done = required.filter((o) => state.mission.objectives[o.id]?.status === 'completed').length;
  if (done === 0) return null;
  const index = Math.min(art.length - 1, Math.ceil((done * (art.length - 1)) / required.length));
  return index >= 1 ? (art[index] ?? null) : null;
}
