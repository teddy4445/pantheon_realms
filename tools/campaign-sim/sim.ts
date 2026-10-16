/**
 * Campaign simulation (development tool; never packaged): the computer plays
 * campaign missions with the mission autopilot (pilot.ts) for the player seat
 * and the shipped AI for every other side, many times, and reports what
 * happened. A journey plays a campaign's seven missions in order with the
 * normal carry-over; after a mission that is not won, the rest of the journey
 * starts each mission directly (its own starting hero), so every mission is
 * still measured.
 */
import { processCommand, requireScenarioMission, type ContentCatalog, type GameCommand, type MatchState } from '@pr/rules';
import { createMissionMatch, recordCompletion, startCampaign, startNextMission, type CampaignState } from '@pr/campaign';
import { heroPower, levelUpCandidates, runAITurn } from '@pr/ai';
import { fightOut, mainHeroOf, newPilotMemory, pilotTurn, type PilotBlock } from './pilot';

export interface MissionRun {
  readonly campaignId: string;
  /** Campaign difficulty level (null: the missions as written). */
  readonly difficultyId: string | null;
  readonly missionId: string;
  readonly order: number;
  readonly run: number;
  /** carried: started from the previous mission's completion; direct: from its own starting hero. */
  readonly start: 'carried' | 'direct';
  readonly outcome: 'victory' | 'defeat' | 'timeout';
  readonly day: number;
  readonly reason: string | null;
  /** Primary objectives still open at the end (timeouts and defeats). */
  readonly open: readonly string[];
  /** Why each open objective could not be advanced (the pilot's last note). */
  readonly blocks: readonly PilotBlock[];
  readonly battlesWon: number;
  readonly battlesLost: number;
  /** The largest share of the army's value lost in one battle (0–1), and that battle. */
  readonly worstLoss: number;
  readonly worstBattle: string | null;
  readonly heroLevel: number;
  readonly heroPower: number;
  readonly seconds: number;
}

function patronOf(catalog: ContentCatalog, campaignId: string): string | null {
  const camp = catalog.campaigns[campaignId]!;
  const gods = catalog.pantheons[camp.pantheonId]?.godIds ?? [];
  return gods.find((g) => catalog.gods[g]?.role === 'patron' && catalog.gods[g]?.implementationStatus === 'implemented') ?? null;
}

/** Resolve pending level-ups even after the mission ended (the completion record needs none pending). */
function settleLevelUps(catalog: ContentCatalog, state: MatchState): MatchState {
  if (state.pendingDecisions.length === 0) return state;
  const outcome = state.outcome;
  let s: MatchState = { ...state, outcome: { ...outcome, status: 'running' } as MatchState['outcome'] };
  for (let i = 0; i < 30 && s.pendingDecisions.length > 0; i++) {
    const owner = s.heroes[s.pendingDecisions[0]!.heroId]?.ownerId;
    if (!owner) break;
    const [cmd] = levelUpCandidates(catalog, s, owner);
    if (!cmd) break;
    const r = processCommand({ catalog }, s, { ...cmd, commandId: `settle:${s.revision}`, expectedRevision: s.revision, actorPlayerId: s.activePlayerId } as GameCommand);
    if (!r.ok) {
      // Level-ups are the player's own; act as that player.
      const r2 = processCommand({ catalog }, { ...s, activePlayerId: owner }, { ...cmd, commandId: `settle2:${s.revision}`, expectedRevision: s.revision, actorPlayerId: owner } as GameCommand);
      if (!r2.ok) break;
      s = { ...r2.state, activePlayerId: s.activePlayerId };
    } else s = r.state;
  }
  return { ...s, outcome };
}

/** Play one mission to its end or the day cap. */
export function playMission(catalog: ContentCatalog, initial: MatchState, maxDay: number): { state: MatchState; outcome: MissionRun['outcome']; reason: string | null; mem: ReturnType<typeof newPilotMemory> } {
  const mission = requireScenarioMission(catalog, initial);
  const playerId = mission.player.playerId;
  const mem = newPilotMemory();
  let state: MatchState = initial;
  let guard = 0;
  while (state.outcome.status === 'running' && state.day <= maxDay && guard++ < maxDay * 40) {
    const before = state;
    if (state.battle) state = fightOut(catalog, state, playerId, mem);
    else if (state.activePlayerId === playerId) state = pilotTurn(catalog, state, playerId, mem);
    else state = runAITurn(catalog, state);
    if (state === before) break; // nothing could act
  }
  const outcome = state.outcome.status === 'victory' ? 'victory' : state.outcome.status === 'defeat' ? 'defeat' : 'timeout';
  const reason = state.outcome.status === 'defeat' ? ((state.outcome as { reason?: string }).reason ?? 'defeat') : outcome === 'timeout' ? `day cap ${maxDay}` : null;
  return { state: outcome === 'victory' ? settleLevelUps(catalog, state) : state, outcome, reason, mem };
}

function summarize(catalog: ContentCatalog, campaignId: string, difficultyId: string | null, order: number, run: number, start: MissionRun['start'], res: ReturnType<typeof playMission>, seconds: number): MissionRun {
  const s = res.state;
  const mission = requireScenarioMission(catalog, s);
  const open = mission.objectives.filter((o) => o.category === 'primary' && s.mission.objectives[o.id]?.status !== 'completed').map((o) => o.id);
  const heroId = mainHeroOf(catalog, s, mission.player.playerId);
  const hero = heroId ? s.heroes[heroId] : undefined;
  return {
    campaignId,
    difficultyId,
    missionId: mission.id,
    order,
    run,
    start,
    outcome: res.outcome,
    day: s.day,
    reason: res.reason,
    open: res.outcome === 'victory' ? [] : open,
    blocks: res.outcome === 'victory' ? [] : open.flatMap((id) => (res.mem.blocks.get(id) ? [res.mem.blocks.get(id)!] : [])),
    battlesWon: res.mem.days.battlesWon,
    battlesLost: res.mem.days.battlesLost,
    worstLoss: Math.max(0, ...res.mem.battles.map((b) => b.lossShare)),
    worstBattle: [...res.mem.battles].sort((a, b) => b.lossShare - a.lossShare)[0]?.label ?? null,
    heroLevel: hero?.level ?? 0,
    heroPower: hero ? Math.round(heroPower(catalog, s, hero)) : 0,
    seconds,
  };
}

/**
 * The chapters of a content-v2 campaign in a playable order: at every choice the
 * first available chapter (`order` 'first') or the last ('last'), so the two
 * orders of every parallel pair are both measured.
 */
export function chapterOrder(catalog: ContentCatalog, campaignId: string, order: 'first' | 'last'): string[] {
  const chapters = catalog.campaigns[campaignId]!.chapters ?? [];
  const done = new Set<string>();
  const out: string[] = [];
  while (out.length < chapters.length) {
    const avail = chapters.filter((c) => !done.has(c.missionId) && c.requiresAll.every((r) => done.has(r)));
    if (avail.length === 0) break;
    const pick = order === 'first' ? avail[0]! : avail[avail.length - 1]!;
    done.add(pick.missionId);
    out.push(pick.missionId);
  }
  return out;
}

/**
 * A content-v2 journey (campaign expansion, 2026-10-15): the chapters in the given
 * order with the campaign state machine's own transitions (carry-over from the
 * latest completion, campaign facts). After a chapter that is not won, the rest
 * start directly with no facts.
 */
export function playJourneyV2(catalog: ContentCatalog, campaignId: string, run: number, maxDay: number, difficultyId: string | null, order: 'first' | 'last', onMission?: (r: MissionRun) => void): MissionRun[] {
  const out: MissionRun[] = [];
  const godId = patronOf(catalog, campaignId);
  const sequence = chapterOrder(catalog, campaignId, order);
  const s0 = startCampaign(catalog, campaignId, { runId: `sim2-${campaignId}-${order}-${run}`, startingGodId: godId, difficultyId, contentVersion: 2 });
  let campaign: CampaignState | null = s0.campaign;
  let state: MatchState = s0.start.match;
  for (let i = 0; i < sequence.length; i++) {
    const t0 = Date.now();
    const start: MissionRun['start'] = campaign ? 'carried' : 'direct';
    const res = playMission(catalog, state, maxDay);
    const r = summarize(catalog, campaignId, difficultyId, i + 1, run, start, res, (Date.now() - t0) / 1000);
    out.push(r);
    onMission?.(r);
    const next = sequence[i + 1];
    if (!next) break;
    if (campaign && res.outcome === 'victory') {
      try {
        campaign = recordCompletion(catalog, campaign, res.state);
        const n = startNextMission(catalog, campaign, next);
        campaign = n.campaign;
        state = n.start.match;
        continue;
      } catch {
        campaign = null;
      }
    }
    campaign = null;
    state = createMissionMatch(catalog, next, { matchId: `sim2-${campaignId}-${run}:${next}:direct`, startingGodId: godId, carryover: null, difficultyId, facts: [] }).match;
  }
  return out;
}

/** One journey through a campaign: every mission once, with carry-over while the missions are won (content v1). */
export function playJourney(catalog: ContentCatalog, campaignId: string, run: number, maxDay: number, difficultyId: string | null = null, onMission?: (r: MissionRun) => void): MissionRun[] {
  const camp = catalog.campaigns[campaignId]!;
  const out: MissionRun[] = [];
  const godId = patronOf(catalog, campaignId);
  let campaign: CampaignState | null = null;
  let state: MatchState;
  {
    const s = startCampaign(catalog, campaignId, { runId: `sim-${campaignId}-${run}`, startingGodId: godId, difficultyId, contentVersion: 1 });
    campaign = s.campaign;
    state = s.start.match;
  }
  for (let i = 0; i < camp.missionIds.length; i++) {
    const t0 = Date.now();
    const start: MissionRun['start'] = campaign ? 'carried' : 'direct';
    const res = playMission(catalog, state, maxDay);
    const r = summarize(catalog, campaignId, difficultyId, i + 1, run, i === 0 ? 'carried' : start, res, (Date.now() - t0) / 1000);
    out.push(r);
    onMission?.(r);
    const next = camp.missionIds[i + 1];
    if (!next) break;
    if (campaign && res.outcome === 'victory') {
      try {
        campaign = recordCompletion(catalog, campaign, res.state);
        const n = startNextMission(catalog, campaign);
        campaign = n.campaign;
        state = n.start.match;
        continue;
      } catch {
        campaign = null;
      }
    }
    campaign = null;
    state = createMissionMatch(catalog, next, { matchId: `sim-${campaignId}-${run}:${next}:direct`, startingGodId: godId, carryover: null, difficultyId }).match;
  }
  return out;
}
