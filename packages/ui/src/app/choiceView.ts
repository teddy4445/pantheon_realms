/**
 * Story choice and negotiation (campaign expansion handoff 2026-10-15, screen
 * spec `choice`): what a one-time map event shows — the place, who is there,
 * the short exchange, and for each option its exact known cost and consequence
 * (the authored result text, the guards that stand down, the evidence and
 * decisions it records, what it needs) and its state: affordable, unaffordable
 * (with the shortfall), needing evidence not yet in hand, already decided, or a
 * repeat visit after "Decide later".
 *
 * Read-only, built on every render from committed state and the rules' own
 * `quoteMapEvent`; every consequence listed is read from the option's definition
 * (`cost`, `reward`, `clearsSiteIds`, `requiresFlags`) and the mission's
 * evidence, objectives and sites — nothing is invented. The rules record the
 * option taken (`SiteState.chosenOption`, 2026-10-15); for an event decided in a
 * save from before that, the chosen option is known from this session, or from
 * flags only that option records.
 */
import {
  missionSite,
  quoteMapEvent,
  resources,
  scenarioMission,
  shortfall,
  type ContentCatalog,
  type DialogueLine,
  type EvidenceDefinition,
  type MapEventOptionDefinition,
  type MatchState,
  type MissionDefinition,
  type ObjectiveCondition,
  type ResourceBundle,
} from '@pr/rules';
import { resourceText } from './neutralRecruit';
import { siteKnown } from './siteInfo';

/** The campaign icons an option's requirement or record can carry (`campaignv2.icon.<id>`). */
export type CampaignIconId = EvidenceDefinition['icon'];

export interface ChoiceNeed {
  readonly flag: string;
  readonly label: string;
  /** The evidence/pact/… icon when the requirement is a ledger entry; null for an ordinary deed. */
  readonly icon: CampaignIconId | null;
  readonly held: boolean;
  /** From an earlier chapter (a campaign fact). */
  readonly earlier: boolean;
}

export interface ChoiceRecord {
  readonly flag: string;
  readonly kind: 'evidence' | 'objective' | 'opens' | 'carried';
  readonly label: string;
  readonly icon: CampaignIconId | null;
}

export interface ChoiceStandDown {
  readonly siteId: string;
  /** The site's name, or null while the viewer does not know the site. */
  readonly name: string | null;
  readonly guard: string | null;
  readonly alreadyCleared: boolean;
}

export type ChoiceOptionState = 'available' | 'unaffordable' | 'needs' | 'unavailable';

export interface ChoiceOptionView {
  readonly index: number;
  readonly label: string;
  /** The authored exact result (matches cost and reward). */
  readonly summary: string;
  readonly cost: ResourceBundle | null;
  readonly legal: boolean;
  readonly state: ChoiceOptionState;
  readonly reason: string | null;
  readonly needs: readonly ChoiceNeed[];
  readonly records: readonly ChoiceRecord[];
  readonly standsDown: readonly ChoiceStandDown[];
  /** The icon the option wears: its first requirement's ledger icon (evidence, pact…). */
  readonly icon: CampaignIconId | null;
}

export interface ChoiceView {
  readonly title: string;
  readonly text: string;
  readonly location: string;
  readonly speaker: DialogueLine | null;
  /** Lines of the story scene that played on arriving here (the existing speakers), if any. */
  readonly exchange: readonly DialogueLine[];
  readonly committed: boolean;
  /** The option taken, when known (this session, or flags only that option records). */
  readonly chosen: { readonly index: number; readonly label: string; readonly summary: string } | null;
  /** The player left this choice undecided before and has come back. */
  readonly repeat: boolean;
  readonly options: readonly ChoiceOptionView[];
}

// ---------------------------------------------------------------------------
// Session memory (presentation only; never saved, never read by the rules)
// ---------------------------------------------------------------------------

const deferred = new Map<string, Set<string>>();
const made = new Map<string, Map<string, number>>();

/** The player closed this choice without deciding (Decide later, Close, Escape). */
export function noteChoiceDeferred(matchId: string, siteId: string): void {
  if (!deferred.has(matchId)) deferred.set(matchId, new Set());
  deferred.get(matchId)!.add(siteId);
}

export function choiceDeferred(matchId: string, siteId: string): boolean {
  return deferred.get(matchId)?.has(siteId) ?? false;
}

/** The player confirmed option `index` here (committed by the rules). */
export function noteChoiceMade(matchId: string, siteId: string, index: number): void {
  if (!made.has(matchId)) made.set(matchId, new Map());
  made.get(matchId)!.set(siteId, index);
}

export function choiceMadeInSession(matchId: string, siteId: string): number | null {
  return made.get(matchId)?.get(siteId) ?? null;
}

/** Forget the session memory (tests). */
export function resetChoiceMemory(): void {
  deferred.clear();
  made.clear();
}

// ---------------------------------------------------------------------------
// Naming requirements and records from the mission's own data
// ---------------------------------------------------------------------------

function conditionMentions(c: ObjectiveCondition, flag: string): boolean {
  const x = c as { type: string; flag?: string; conditions?: readonly ObjectiveCondition[] };
  if (x.type === 'flag') return x.flag === flag;
  return (x.conditions ?? []).some((k) => conditionMentions(k, flag));
}

function campaignMissions(catalog: ContentCatalog, mission: MissionDefinition | undefined): MissionDefinition[] {
  if (!mission?.campaignId) return mission ? [mission] : [];
  return Object.values(catalog.missions).filter((m) => m.campaignId === mission.campaignId);
}

/** What a required flag is, in the mission's words: its evidence entry, the objective, guard or choice that sets it. */
function needOf(catalog: ContentCatalog, state: MatchState, mission: MissionDefinition | undefined, flag: string): ChoiceNeed {
  const earlier = flag.startsWith('fact:');
  const bare = earlier ? flag.slice('fact:'.length) : flag;
  const pool = earlier ? campaignMissions(catalog, mission) : mission ? [mission] : [];
  const held = !!state.mission.flags[flag];
  const evidence = pool.flatMap((m) => m.evidence ?? []).find((e) => e.flag === bare);
  if (evidence) return { flag, label: evidence.title, icon: evidence.icon, held, earlier };
  for (const m of pool) {
    const obj = (m.objectives ?? []).find((o) => o.reward?.flags?.includes(bare));
    if (!obj) continue;
    // The objective's own quest marker (its sites' evidence, pact, supply… icon), when it has one.
    const marked = m.sites.find((s) => s.marker && (s.objectiveIds?.includes(obj.id) || s.id === obj.markerSiteId));
    return { flag, label: obj.title, icon: marked?.marker ?? null, held, earlier };
  }
  for (const m of pool) {
    for (const s of m.sites) {
      if (s.guard?.reward.flags?.includes(bare)) return { flag, label: `${s.guard.label} beaten at ${s.name}`, icon: null, held, earlier };
      if (s.kind.type === 'map_event') {
        const o = s.kind.options.find((x) => x.reward.flags?.includes(bare));
        if (o) return { flag, label: `${o.label} (${s.name})`, icon: null, held, earlier };
      }
      if ((s.kind.type === 'pickup' || s.kind.type === 'activation') && s.kind.reward.flags?.includes(bare)) return { flag, label: s.name, icon: null, held, earlier };
    }
  }
  return { flag, label: earlier ? 'Something learned in an earlier chapter' : 'A condition of this chapter', icon: null, held, earlier };
}

/** What a flag an option records means here: evidence in the ledger, an objective it counts toward, a gate it opens. */
function recordsOf(mission: MissionDefinition | undefined, flags: readonly string[]): ChoiceRecord[] {
  const out: ChoiceRecord[] = [];
  for (const flag of flags) {
    const before = out.length;
    const evidence = (mission?.evidence ?? []).find((e) => e.flag === flag);
    if (evidence) out.push({ flag, kind: 'evidence', label: evidence.title, icon: evidence.icon });
    for (const o of mission?.objectives ?? []) if (conditionMentions(o.condition, flag) && !out.some((r) => r.kind === 'objective' && r.label === o.title)) out.push({ flag, kind: 'objective', label: o.title, icon: null });
    for (const s of mission?.sites ?? []) if (s.kind.type === 'gate' && s.kind.openWhenFlags.includes(flag) && !out.some((r) => r.kind === 'opens' && r.label === s.name)) out.push({ flag, kind: 'opens', label: s.name, icon: null });
    if (out.length === before && mission?.carriedFlags?.includes(flag) && !out.some((r) => r.kind === 'carried')) out.push({ flag, kind: 'carried', label: 'Remembered in later chapters', icon: null });
  }
  return out;
}

/** The option a claimed event most likely took: only when its recorded flags are set and no other option records them all. */
function chosenByFlags(state: MatchState, options: readonly MapEventOptionDefinition[]): number | null {
  const hits = options
    .map((o, i) => ({ i, flags: o.reward.flags ?? [] }))
    .filter((x) => x.flags.length > 0 && x.flags.every((f) => state.mission.flags[f]));
  if (hits.length !== 1) return null;
  const only = hits[0]!;
  // Ambiguous when another option records exactly the same flags.
  const same = options.filter((o) => {
    const f = o.reward.flags ?? [];
    return f.length === only.flags.length && f.every((x) => only.flags.includes(x));
  });
  return same.length === 1 ? only.i : null;
}

/**
 * The choice at map event `siteId` for `heroId`, revalidated against the current
 * state. Null when the site is not a map event.
 */
export function choiceView(catalog: ContentCatalog, state: MatchState, playerId: string, heroId: string, siteId: string): ChoiceView | null {
  const def = missionSite(catalog, state, siteId);
  if (!def || def.kind.type !== 'map_event') return null;
  const kind = def.kind;
  const mission = scenarioMission(catalog, state);
  const hero = state.heroes[heroId];
  const wallet = resources(state.players[playerId]?.wallet ?? {});
  const committed = !!state.world.sites[siteId]?.claimed;
  const guarded = !!def.guard && !state.world.sites[siteId]?.cleared;
  const heroDef = hero ? catalog.heroes[hero.definitionId] : undefined;
  const speaker: DialogueLine | null = hero ? { speaker: hero.name, portraitAssetId: hero.portraitAssetId || heroDef?.portraitAssetId || `hero.${hero.definitionId}.portrait`, text: '' } : null;
  const played = new Set(state.mission.scenesPlayed ?? []);
  const exchange = (mission?.storyScenes ?? []).filter((s) => s.trigger.type === 'site_visited' && s.trigger.siteId === siteId && played.has(s.id)).flatMap((s) => s.lines);

  const options: ChoiceOptionView[] = kind.options.map((o, index) => {
    const q = quoteMapEvent(catalog, state, playerId, heroId, siteId, index);
    const needs = (o.requiresFlags ?? []).map((f) => needOf(catalog, state, mission, f));
    const missing = needs.filter((n) => !n.held);
    const cost = o.cost ? resources(o.cost) : null;
    let st: ChoiceOptionState = 'available';
    let reason: string | null = null;
    if (!q.legal) {
      if (q.code === 'missing_requirement' && missing.length && !guarded) {
        st = 'needs';
        reason = `Needs ${missing.map((n) => n.label).join(' and ')}`;
      } else if (q.code === 'insufficient_resources' && cost) {
        st = 'unaffordable';
        reason = `Not enough resources: short ${resourceText(shortfall(wallet, cost))}`;
      } else {
        st = 'unavailable';
        reason = q.reason ?? 'Not possible now';
      }
    }
    const standsDown: ChoiceStandDown[] = (o.clearsSiteIds ?? []).map((id) => {
      const s = missionSite(catalog, state, id);
      const known = !!s && siteKnown(state, playerId, s);
      return { siteId: id, name: known ? s!.name : null, guard: known ? (s!.guard?.label ?? null) : null, alreadyCleared: !!state.world.sites[id]?.cleared };
    });
    return {
      index,
      label: o.label,
      summary: o.summary,
      cost,
      legal: q.legal,
      state: st,
      reason,
      needs,
      records: recordsOf(mission, o.reward.flags ?? []),
      standsDown,
      icon: needs.find((n) => n.icon)?.icon ?? null,
    };
  });

  let chosen: ChoiceView['chosen'] = null;
  if (committed) {
    const i = state.world.sites[siteId]?.chosenOption ?? choiceMadeInSession(state.matchId, siteId) ?? chosenByFlags(state, kind.options);
    const o = i !== null ? kind.options[i] : undefined;
    if (o && i !== null) chosen = { index: i, label: o.label, summary: o.summary };
  }
  return {
    title: kind.title,
    text: kind.text,
    location: def.name,
    speaker,
    exchange,
    committed,
    chosen,
    repeat: !committed && choiceDeferred(state.matchId, siteId),
    options,
  };
}
