import { validateSingleBattleReplay, type SingleBattleReplay } from './singleBattle';
import { createSingleBattle, type SingleBattleSpec } from '@pr/rules';
/**
 * GameSession: the single runtime host around one authoritative MatchState.
 *
 * Owns: the current state, campaign progress, command submission (human and AI),
 * the recent event feed for presentation, and checkpoint signals.
 * Does not own: rendering, React state, persistence I/O (platform adapters) or
 * any game rule (all rules live in @pr/rules).
 *
 * There is never a second mutable authoritative copy; presentation receives
 * read-only states and immutable events.
 */
import {
  MANUAL_BATTLE_MESSAGE,
  NEUTRAL_PLAYER_ID,
  hexEquals,
  manualBattlesRequired,
  processCommand,
  siteAt,
  missionSite,
  settleHeroesAtTownGates,
  type CommandPayload,
  type ContentCatalog,
  type GameCommand,
  type GameEvent,
  type HexCoord,
  type MatchState,
  type PlayerId,
  type Rejection,
} from '@pr/rules';
import {
  noteBattleWon,
  recordCompletion,
  restartCurrentMission,
  startCampaign,
  startNextMission,
  startPracticeReplay,
  createGeneratedMatch,
  createMissionMatch,
  availableChapters,
  hasNextMission as campaignHasNext,
  type CampaignState,
  type CompletionRecord,
  type GeneratedScenario,
  type MissionStartOptions,
} from '@pr/campaign';
import { battleActor, chooseBattleAction, isAiControlledBattleTurn, runQuickBattle, stepBattleAI, stepStrategicAI } from '@pr/ai';
import type { SaveSnapshot } from './save';
import {
  EMPTY_PRESENTATION,
  journeyOf,
  reconcileJourneys,
  sanitizePresentation,
  withJourney,
  withoutJourney,
  type JourneyIntent,
  type SessionPresentation,
} from './journeys';

export type CheckpointKind = 'pre_encounter' | 'dawn' | 'mission_start';

export interface SessionUpdate {
  readonly state: MatchState;
  readonly events: readonly GameEvent[];
  readonly source: 'human' | 'ai' | 'load' | 'start';
}

export type SessionListener = (update: SessionUpdate) => void;
export type CheckpointListener = (kind: CheckpointKind, snapshot: SaveSnapshot) => void;

export type DispatchResult = { readonly ok: true; readonly events: readonly GameEvent[] } | { readonly ok: false; readonly rejection: Rejection };

let sessionSerial = 0;

export class GameSession {
  private replayTape: SingleBattleReplay | null = null;
  private replayCursor = 0;
  get isReplay(): boolean { return this.replayTape !== null; }
  private _state: MatchState;
  private _campaign: CampaignState | null;
  /** Each human player's planned journeys (presentation intent, saved with the match; never a rule). */
  private _presentation: SessionPresentation = EMPTY_PRESENTATION;
  private readonly listeners = new Set<SessionListener>();
  private readonly checkpointListeners = new Set<CheckpointListener>();
  private seq = 0;
  private readonly aiTried = new Set<string>();
  private aiTurnOwner: PlayerId | null = null;
  /** The human seat that acted most recently (hot-seat: whose view to show between turns). */
  private lastHumanId: PlayerId | null = null;
  readonly sessionId: string;

  private constructor(readonly catalog: ContentCatalog, state: MatchState, campaign: CampaignState | null, presentation: unknown = undefined) {
    this._state = state;
    this._campaign = campaign;
    this._presentation = sanitizePresentation(presentation, state);
    sessionSerial += 1;
    this.sessionId = `s${sessionSerial}`;
  }

  // ------------------------------------------------------------------ factories

  /** A new campaign run: content v2 when the campaign has a chapter graph, unless `contentVersion` pins v1 (tests of the legacy missions). */
  static newCampaign(catalog: ContentCatalog, campaignId: string, startingGodId: string | null, runId: string, difficultyId: string | null = null, contentVersion?: 1 | 2): GameSession {
    const { campaign, start } = startCampaign(catalog, campaignId, { runId, startingGodId, difficultyId, ...(contentVersion ? { contentVersion } : {}) });
    return new GameSession(catalog, start.match, campaign);
  }

  static newScenario(
    catalog: ContentCatalog,
    missionId: string,
    matchId: string,
    startingGodId: string | null = null,
    opts: Pick<MissionStartOptions, 'difficultyId' | 'controllers' | 'playerNames' | 'patronGodIds'> = {},
  ): GameSession {
    const { match } = createMissionMatch(catalog, missionId, { matchId, startingGodId, ...opts });
    return new GameSession(catalog, match, null);
  }

  /** A generated skirmish (random map): its definition travels inside the match. */
  static newGenerated(
    catalog: ContentCatalog,
    generated: GeneratedScenario,
    matchId: string,
    opts: Pick<MissionStartOptions, 'difficultyId' | 'controllers' | 'playerNames' | 'patronGodIds' | 'startingGodId'> = {},
  ): GameSession {
    const { match } = createGeneratedMatch(catalog, generated, { matchId, ...opts });
    return new GameSession(catalog, match, null);
  }

  static newSingleBattle(catalog: ContentCatalog, spec: SingleBattleSpec): GameSession {
    return new GameSession(catalog, createSingleBattle(catalog, spec), null);
  }

  static fromBattleReplay(catalog: ContentCatalog, value: unknown): GameSession {
    const replay = validateSingleBattleReplay(catalog, value);
    const session = GameSession.newSingleBattle(catalog, replay.spec);
    session.replayTape = replay;
    return session;
  }

  static fromSnapshot(catalog: ContentCatalog, snapshot: SaveSnapshot): GameSession {
    // Saves from before 2026-10-03 may have heroes on a town's own tile: move them to its gate.
    settleHeroesAtTownGates(catalog, snapshot.match);
    return new GameSession(catalog, snapshot.match, snapshot.campaign, snapshot.presentation);
  }

  // ------------------------------------------------------------------ accessors

  get state(): MatchState {
    return this._state;
  }

  get campaign(): CampaignState | null {
    return this._campaign;
  }

  /**
   * The human seat whose view is shown: the active player when it is a human
   * (hot-seat games have several), otherwise the human who acted last, else the
   * first human seat.
   */
  get humanPlayerId(): PlayerId {
    return viewerPlayerId(this._state, this.lastHumanId);
  }

  /** Human seats in turn order (more than one in a hot-seat game). */
  get humanSeats(): PlayerId[] {
    return this._state.playerOrder.filter((p) => this._state.players[p]?.controller === 'human');
  }

  snapshot(): SaveSnapshot {
    return this.snapshotOf(this._state);
  }

  /** A snapshot of `match` with this session's campaign and (when any) planned journeys. */
  private snapshotOf(match: MatchState): SaveSnapshot {
    const any = Object.values(this._presentation.journeys).some((byHero) => Object.keys(byHero).length > 0);
    return any ? { match, campaign: this._campaign, presentation: this._presentation } : { match, campaign: this._campaign };
  }

  // ------------------------------------------------------------------ planned journeys

  get presentation(): SessionPresentation {
    return this._presentation;
  }

  /** The planned journey of one of `playerId`'s heroes (null when none). */
  journey(heroId: string, playerId: PlayerId = this.humanPlayerId): JourneyIntent | null {
    return journeyOf(this._presentation, playerId, heroId);
  }

  /**
   * Plan (or replace) a hero's journey: an explicit choice of destination by the player
   * who commands the hero. A mere hover never calls this.
   */
  planJourney(heroId: string, target: HexCoord, playerId: PlayerId = this.humanPlayerId): JourneyIntent | null {
    const hero = this._state.heroes[heroId];
    if (!hero || hero.ownerId !== playerId || hero.status !== 'active' || this._state.players[playerId]?.controller !== 'human') return null;
    const site = siteAt(this.catalog, this._state, target);
    const j: JourneyIntent = {
      version: 1,
      matchId: this._state.matchId,
      playerId,
      heroId,
      target: { q: target.q, r: target.r },
      ...(site ? { targetSiteId: site.def.id } : {}),
      status: 'planned',
    };
    this._presentation = withJourney(this._presentation, j);
    return j;
  }

  /** Cancel one hero's journey (explicit Cancel journey); other heroes keep theirs. */
  cancelJourney(heroId: string, playerId: PlayerId = this.humanPlayerId): void {
    this._presentation = withoutJourney(this._presentation, playerId, heroId);
  }

  subscribe(listener: SessionListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  onCheckpoint(listener: CheckpointListener): () => void {
    this.checkpointListeners.add(listener);
    return () => this.checkpointListeners.delete(listener);
  }

  private publish(events: readonly GameEvent[], source: SessionUpdate['source']): void {
    const update = { state: this._state, events, source };
    for (const l of this.listeners) l(update);
  }

  private checkpoint(kind: CheckpointKind, snapshot: SaveSnapshot): void {
    for (const l of this.checkpointListeners) l(kind, snapshot);
  }

  // ------------------------------------------------------------------ commands

  private nextCommandId(): string {
    this.seq += 1;
    return `${this.sessionId}:c${this.seq}:r${this._state.revision}`;
  }

  /**
   * Submit a human command. Returns the rejection unchanged when invalid.
   * `automated` marks an order chosen by auto-combat rather than the player; the
   * rules refuse it for a human side of a campaign battle (handoff 2026-10-15).
   */
  dispatch(payload: CommandPayload, actor?: PlayerId, automated = false): DispatchResult {
    const before = this._state;
    if (!actor) {
      // In a battle the side that acts now commands (two human sides in a hot-seat battle).
      const battleSide = before.battle && payload.kind.startsWith('Battle') ? battleActor(before) : null;
      actor = battleSide && before.players[battleSide]?.controller === 'human' ? battleSide : this.humanPlayerId;
    }
    const base = { ...payload, commandId: this.nextCommandId(), expectedRevision: before.revision, actorPlayerId: actor };
    const command = (automated ? { ...base, automated: true } : base) as GameCommand;
    if (this.isReplay) return { ok: false, rejection: { code: 'illegal_action', message: 'Replay is read-only' } };
    const res = processCommand({ catalog: this.catalog }, before, command);
    if (!res.ok) return { ok: false, rejection: res.rejection };
    this._state = res.state;
    if (before.players[actor]?.controller === 'human') this.lastHumanId = actor;
    const eventSite = payload.kind === 'ResolveMapEvent' ? missionSite(this.catalog, before, payload.siteId) : null;
    const eventCheckpoint = payload.kind === 'ResolveMapEvent' && eventSite?.kind.type === 'map_event' && eventSite.kind.options[payload.optionIndex]?.checkpointBefore;
    if (eventCheckpoint || res.events.some((e) => e.kind === 'BattleStarted')) this.checkpoint('pre_encounter', this.snapshotOf(before));
    // Following a planned journey again resumes it (a paused journey is planned once more).
    if (payload.kind === 'MoveHero' && !this._state.battle) {
      const j = journeyOf(this._presentation, actor, payload.heroId);
      if (j && j.status === 'paused') this._presentation = withJourney(this._presentation, { ...j, status: 'planned' });
    }
    this.afterCommit(res.events);
    this.publish(res.events, 'human');
    return { ok: true, events: res.events };
  }

  private afterCommit(events: readonly GameEvent[]): void {
    // Journeys follow the state: lost or arrived heroes drop theirs; heroes in a battle, or
    // carried elsewhere (a portal, Homecoming), pause theirs — re-quoted from where they are.
    const b = this._state.battle;
    const interrupted = new Set<string>(b ? [b.sides.attacker.commander?.heroId, b.sides.defender.commander?.heroId].filter((h): h is string => !!h) : []);
    for (const e of events) {
      if (e.kind !== 'HeroTeleported') continue;
      // A journey to the portal itself ends when the hero goes through it.
      const owner = this._state.heroes[e.heroId]?.ownerId;
      const j = owner ? journeyOf(this._presentation, owner, e.heroId) : null;
      if (owner && j && e.viaSiteId && (j.targetSiteId === e.viaSiteId || hexEquals(j.target, e.from))) this._presentation = withoutJourney(this._presentation, owner, e.heroId);
      else interrupted.add(e.heroId);
    }
    this._presentation = reconcileJourneys(this.catalog, this._state, this._presentation, interrupted);
    if (this._campaign) {
      const won = events.find((e) => e.kind === 'BattleEnded' && e.winner === (this._state.lastBattleResult?.playerSide ?? '__'));
      if (won) this._campaign = noteBattleWon(this._campaign);
    }
    if (events.some((e) => e.kind === 'DayStarted') && this.isHumanTurn()) {
      this.checkpoint('dawn', this.snapshot());
    }
  }

  isHumanTurn(): boolean {
    if (this.isReplay) return false;
    const s = this._state;
    if (s.outcome.status !== 'running') return false;
    if (s.battle) return !isAiControlledBattleTurn(s);
    return s.players[s.activePlayerId]?.controller === 'human';
  }

  /** True when the game is waiting on an AI actor (an AI turn or an AI battle side). */
  needsAI(): boolean {
    if (this.replayTape) return this.replayCursor < this.replayTape.commands.length;
    const s = this._state;
    if (s.outcome.status !== 'running') return false;
    if (s.battle) return isAiControlledBattleTurn(s);
    if (s.standalone) return false;
    return s.players[s.activePlayerId]?.controller === 'ai';
  }

  /** Perform exactly one AI command through the normal processor. */
  stepAI(): DispatchResult {
    if (this.replayTape) {
      const c = this.replayTape.commands[this.replayCursor];
      if (!c) return { ok: false, rejection: { code: 'illegal_action', message: 'Replay finished' } };
      const res = processCommand({ catalog: this.catalog }, this._state, c);
      if (!res.ok) return res;
      this.replayCursor++; this._state = res.state;
      this.publish(res.events, 'ai');
      return { ok: true, events: res.events };
    }
    const s = this._state;
    if (!this.needsAI()) return { ok: false, rejection: { code: 'not_your_turn', message: 'No AI action pending' } };
    let result;
    if (s.battle) {
      result = stepBattleAI(this.catalog, s);
    } else {
      if (this.aiTurnOwner !== s.activePlayerId) {
        this.aiTried.clear();
        this.aiTurnOwner = s.activePlayerId;
      }
      result = stepStrategicAI(this.catalog, s, this.aiTried);
      if (result.command?.kind === 'EndTurn') this.aiTurnOwner = null;
    }
    if (result.events.some((e) => e.kind === 'BattleStarted')) this.checkpoint('pre_encounter', this.snapshotOf(s));
    this._state = result.state;
    this.afterCommit(result.events);
    this.publish(result.events, 'ai');
    return { ok: true, events: result.events };
  }

  /**
   * Auto-combat for the human side: the tactical AI chooses, the normal processor
   * validates. The order is marked automated, so in a campaign battle the rules
   * refuse it (`manual_battle_required`) and nothing changes.
   */
  autoBattleStep(): DispatchResult {
    const s = this._state;
    if (!s.battle || isAiControlledBattleTurn(s)) return { ok: false, rejection: { code: 'illegal_action', message: 'Not your stack' } };
    const payload = chooseBattleAction(this.catalog, s);
    const actor = battleActor(s) ?? this.humanPlayerId;
    if (!payload) return { ok: false, rejection: { code: 'illegal_action', message: 'No action' } };
    return this.dispatch(payload, actor === NEUTRAL_PLAYER_ID ? this.humanPlayerId : actor, true);
  }

  /** Campaign battles are fought by hand: no auto-combat, no quick battle (handoff 2026-10-15). */
  get manualBattlesOnly(): boolean {
    return manualBattlesRequired(this._state);
  }

  /**
   * Quick battle (2026-10-07): submit the encounter move and fight the battle it
   * starts to the end with the tactical AI on both sides, without the
   * battlefield. The same function on the same state gives the encounter panel's
   * preview, so the result matches what the panel showed. One checkpoint before,
   * one published batch after (the movement, the battle and its result).
   */
  quickBattle(payload: CommandPayload): DispatchResult {
    const before = this._state;
    const actor = this.humanPlayerId;
    if (before.players[actor]?.controller !== 'human' || before.activePlayerId !== actor) return { ok: false, rejection: { code: 'not_your_turn', message: 'It is not your turn' } };
    if (manualBattlesRequired(before)) return { ok: false, rejection: { code: 'manual_battle_required', message: MANUAL_BATTLE_MESSAGE } };
    const run = runQuickBattle(this.catalog, before, actor, payload);
    if (!run.ok) return { ok: false, rejection: { code: 'invalid_command', message: run.reason } };
    this.checkpoint('pre_encounter', this.snapshotOf(before));
    this._state = run.state;
    this.lastHumanId = actor;
    this.afterCommit(run.events);
    this.publish(run.events, 'human');
    return { ok: true, events: run.events };
  }

  // ------------------------------------------------------------------ campaign transitions

  /** Commit the mission completion record exactly once. */
  completeMission(): CompletionRecord | null {
    if (!this._campaign) return null;
    this._campaign = recordCompletion(this.catalog, this._campaign, this._state, Object.values(this._presentation.journeys).flatMap(Object.values));
    return this._campaign.completions.find((c) => c.missionId === this._state.mission.missionId) ?? null;
  }

  hasNextMission(): boolean {
    return !!this._campaign && this._campaign.branch === 'primary' && campaignHasNext(this.catalog, this._campaign);
  }

  /**
   * Content v2: the chapters the player may start next (after the current one is
   * complete), validated by the campaign state machine. Empty in a practice replay.
   */
  availableChapters(): string[] {
    if (!this._campaign || this._campaign.branch !== 'primary') return [];
    return availableChapters(this.catalog, this._campaign).map((c) => c.missionId);
  }

  /** Initialize the next mission from the committed record (deterministic, idempotent). */
  continueToNextMission(chosenMissionId?: string): void {
    if (!this._campaign) throw new Error('Not a campaign');
    if (this._campaign.branch !== 'primary') throw new Error('A practice replay never advances the campaign');
    const { campaign, start } = startNextMission(this.catalog, this._campaign, chosenMissionId);
    this._campaign = campaign;
    this._state = start.match;
    this.restoreRegionalJourneys();
    this.checkpoint('mission_start', this.snapshot());
    this.publish([], 'start');
  }

  private restoreRegionalJourneys(): void {
    const journeys: Record<string, Record<string, JourneyIntent>> = {};
    for (const region of this._campaign?.currentEntryRegions ?? []) for (const j of region.journeys ?? []) {
      const heroId = this._state.heroes[j.heroId]?.ownerId === j.playerId ? j.heroId : `region:${region.regionId}:${j.heroId}`;
      (journeys[j.playerId] ??= {})[heroId] = { ...j, heroId, version: 1, matchId: this._state.matchId, status: 'paused', reason: 'interrupted' };
    }
    this._presentation = sanitizePresentation({ version: 1, journeys }, this._state);
  }

  restartMission(): void {
    if (this._campaign) {
      const start = restartCurrentMission(this.catalog, this._campaign);
      this._state = start.match;
    } else {
      const s = this._state;
      const opts = {
        matchId: s.matchId,
        difficultyId: s.scenario.difficultyId ?? null,
        controllers: Object.fromEntries(s.playerOrder.filter((p) => s.players[p]!.role !== 'scripted_hostile').map((p) => [p, s.players[p]!.controller])),
        playerNames: Object.fromEntries(s.playerOrder.map((p) => [p, s.players[p]!.name])),
        // Keep every seat's patron (the player's and hot-seat rivals').
        startingGodId: Object.values(s.players).find((p) => p.role === 'player')?.pantheon.patronGodId ?? null,
        patronGodIds: Object.fromEntries(
          s.playerOrder.flatMap((p) => {
            const pl = s.players[p]!;
            return pl.role === 'rival' && pl.pantheon.patronGodId ? [[p, pl.pantheon.patronGodId]] : [];
          }),
        ),
      };
      const { match } = s.customMission
        ? createGeneratedMatch(this.catalog, { mission: s.customMission, map: s.world.map, decor: [] }, opts)
        : createMissionMatch(this.catalog, s.mission.missionId, opts);
      this._state = match;
    }
    this.lastHumanId = null;
    this.restoreRegionalJourneys();
    this.publish([], 'start');
  }

  startPractice(missionId: string): void {
    if (!this._campaign) throw new Error('Not a campaign');
    const { campaign, start } = startPracticeReplay(this.catalog, this._campaign, missionId);
    this._campaign = campaign;
    this._state = start.match;
    this.restoreRegionalJourneys();
    this.publish([], 'start');
  }

  /** Replace the whole session state from a validated snapshot (Load). */
  load(snapshot: SaveSnapshot): void {
    this._state = snapshot.match;
    this._campaign = snapshot.campaign;
    this._presentation = sanitizePresentation(snapshot.presentation, snapshot.match);
    this.aiTried.clear();
    this.aiTurnOwner = null;
    this.lastHumanId = null;
    this.publish([], 'load');
  }
}

/** Whose view to show: the active human, else the last human who acted, else the first human seat. */
export function viewerPlayerId(state: MatchState, lastHumanId: PlayerId | null = null): PlayerId {
  const active = state.players[state.activePlayerId];
  if (active?.controller === 'human' && !active.eliminated) return state.activePlayerId;
  if (lastHumanId && state.players[lastHumanId]?.controller === 'human') return lastHumanId;
  // Between human turns: the human seat that played most recently in turn order.
  const order = state.playerOrder;
  const at = Math.max(0, order.indexOf(state.activePlayerId));
  for (let k = 1; k <= order.length; k++) {
    const id = order[(at - k + order.length) % order.length]!;
    if (state.players[id]?.controller === 'human') return id;
  }
  return order.find((p) => state.players[p]?.controller === 'human') ?? order[0]!;
}
