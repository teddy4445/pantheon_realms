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
  NEUTRAL_PLAYER_ID,
  processCommand,
  type CommandPayload,
  type ContentCatalog,
  type GameCommand,
  type GameEvent,
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
  createMissionMatch,
  nextMissionId,
  type CampaignState,
  type CompletionRecord,
} from '@pr/campaign';
import { battleActor, chooseBattleAction, isAiControlledBattleTurn, stepBattleAI, stepStrategicAI } from '@pr/ai';
import type { SaveSnapshot } from './save';

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
  private _state: MatchState;
  private _campaign: CampaignState | null;
  private readonly listeners = new Set<SessionListener>();
  private readonly checkpointListeners = new Set<CheckpointListener>();
  private seq = 0;
  private readonly aiTried = new Set<string>();
  private aiTurnOwner: PlayerId | null = null;
  readonly sessionId: string;

  private constructor(readonly catalog: ContentCatalog, state: MatchState, campaign: CampaignState | null) {
    this._state = state;
    this._campaign = campaign;
    sessionSerial += 1;
    this.sessionId = `s${sessionSerial}`;
  }

  // ------------------------------------------------------------------ factories

  static newCampaign(catalog: ContentCatalog, campaignId: string, startingGodId: string | null, runId: string): GameSession {
    const { campaign, start } = startCampaign(catalog, campaignId, { runId, startingGodId });
    return new GameSession(catalog, start.match, campaign);
  }

  static newScenario(catalog: ContentCatalog, missionId: string, matchId: string, startingGodId: string | null = null): GameSession {
    const { match } = createMissionMatch(catalog, missionId, { matchId, startingGodId });
    return new GameSession(catalog, match, null);
  }

  static fromSnapshot(catalog: ContentCatalog, snapshot: SaveSnapshot): GameSession {
    return new GameSession(catalog, snapshot.match, snapshot.campaign);
  }

  // ------------------------------------------------------------------ accessors

  get state(): MatchState {
    return this._state;
  }

  get campaign(): CampaignState | null {
    return this._campaign;
  }

  get humanPlayerId(): PlayerId {
    return this._state.playerOrder.find((p) => this._state.players[p]?.controller === 'human') ?? this._state.playerOrder[0]!;
  }

  snapshot(): SaveSnapshot {
    return { match: this._state, campaign: this._campaign };
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

  /** Submit a human command. Returns the rejection unchanged when invalid. */
  dispatch(payload: CommandPayload, actor: PlayerId = this.humanPlayerId): DispatchResult {
    const before = this._state;
    const command = { ...payload, commandId: this.nextCommandId(), expectedRevision: before.revision, actorPlayerId: actor } as GameCommand;
    const res = processCommand({ catalog: this.catalog }, before, command);
    if (!res.ok) return { ok: false, rejection: res.rejection };
    this._state = res.state;
    if (res.events.some((e) => e.kind === 'BattleStarted')) this.checkpoint('pre_encounter', { match: before, campaign: this._campaign });
    this.afterCommit(res.events);
    this.publish(res.events, 'human');
    return { ok: true, events: res.events };
  }

  private afterCommit(events: readonly GameEvent[]): void {
    if (this._campaign) {
      const won = events.find((e) => e.kind === 'BattleEnded' && e.winner === (this._state.lastBattleResult?.playerSide ?? '__'));
      if (won) this._campaign = noteBattleWon(this._campaign);
    }
    if (events.some((e) => e.kind === 'DayStarted') && this.isHumanTurn()) {
      this.checkpoint('dawn', this.snapshot());
    }
  }

  isHumanTurn(): boolean {
    const s = this._state;
    if (s.outcome.status !== 'running') return false;
    if (s.battle) return !isAiControlledBattleTurn(s);
    return s.players[s.activePlayerId]?.controller === 'human';
  }

  /** True when the game is waiting on an AI actor (an AI turn or an AI battle side). */
  needsAI(): boolean {
    const s = this._state;
    if (s.outcome.status !== 'running') return false;
    if (s.battle) return isAiControlledBattleTurn(s);
    return s.players[s.activePlayerId]?.controller === 'ai';
  }

  /** Perform exactly one AI command through the normal processor. */
  stepAI(): DispatchResult {
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
    if (result.events.some((e) => e.kind === 'BattleStarted')) this.checkpoint('pre_encounter', { match: s, campaign: this._campaign });
    this._state = result.state;
    this.afterCommit(result.events);
    this.publish(result.events, 'ai');
    return { ok: true, events: result.events };
  }

  /** Auto-combat for the human side: the tactical AI chooses, the normal processor validates. */
  autoBattleStep(): DispatchResult {
    const s = this._state;
    if (!s.battle || isAiControlledBattleTurn(s)) return { ok: false, rejection: { code: 'illegal_action', message: 'Not your stack' } };
    const payload = chooseBattleAction(this.catalog, s);
    const actor = battleActor(s) ?? this.humanPlayerId;
    if (!payload) return { ok: false, rejection: { code: 'illegal_action', message: 'No action' } };
    return this.dispatch(payload, actor === NEUTRAL_PLAYER_ID ? this.humanPlayerId : actor);
  }

  // ------------------------------------------------------------------ campaign transitions

  /** Commit the mission completion record exactly once. */
  completeMission(): CompletionRecord | null {
    if (!this._campaign) return null;
    this._campaign = recordCompletion(this.catalog, this._campaign, this._state);
    return this._campaign.completions.find((c) => c.missionId === this._state.mission.missionId) ?? null;
  }

  hasNextMission(): boolean {
    return !!this._campaign && this._campaign.branch === 'primary' && nextMissionId(this.catalog, this._campaign) !== null;
  }

  /** Initialize the next mission from the committed record (deterministic, idempotent). */
  continueToNextMission(): void {
    if (!this._campaign) throw new Error('Not a campaign');
    const { campaign, start } = startNextMission(this.catalog, this._campaign);
    this._campaign = campaign;
    this._state = start.match;
    this.checkpoint('mission_start', this.snapshot());
    this.publish([], 'start');
  }

  restartMission(): void {
    if (this._campaign) {
      const start = restartCurrentMission(this.catalog, this._campaign);
      this._state = start.match;
    } else {
      const { match } = createMissionMatch(this.catalog, this._state.mission.missionId, { matchId: this._state.matchId });
      this._state = match;
    }
    this.publish([], 'start');
  }

  startPractice(missionId: string): void {
    if (!this._campaign) throw new Error('Not a campaign');
    const { campaign, start } = startPracticeReplay(this.catalog, this._campaign, missionId);
    this._campaign = campaign;
    this._state = start.match;
    this.publish([], 'start');
  }

  /** Replace the whole session state from a validated snapshot (Load). */
  load(snapshot: SaveSnapshot): void {
    this._state = snapshot.match;
    this._campaign = snapshot.campaign;
    this.aiTried.clear();
    this.aiTurnOwner = null;
    this.publish([], 'load');
  }
}
