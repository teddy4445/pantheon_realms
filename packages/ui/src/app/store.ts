/**
 * AppStore: application-level UI state (navigation, overlays, toasts,
 * preferences, setup draft) plus the current GameSession.
 *
 * Owns: which screen is shown, return context, modal stack, AI pacing and the
 * presentation queue. Does NOT own game truth: all game data is read from
 * session.state, and all changes go through session.dispatch (commands).
 */
import type { ContentCatalog, GameEvent, CommandPayload, HexCoord, Rejection } from '@pr/rules';
import { GameSession, type SaveSnapshot } from '@pr/session';
import type { PlatformServices } from '@pr/platform';
import { SaveManager, type SlotInfo } from './saves';
import { DEFAULT_PREFERENCES, applyPreferences, adventurePlaybackFactor, savePreferences, type Preferences } from './preferences';
import type { GameAudio } from '../audio/gameAudio';

export type ScreenId =
  | 'main-menu'
  | 'game-mode'
  | 'scenario-select'
  | 'pantheon-select'
  | 'divine-select'
  | 'adventure'
  | 'hero'
  | 'town'
  | 'recruitment'
  | 'pantheon'
  | 'battle'
  | 'battle-result'
  | 'level-up'
  | 'journal'
  | 'overview'
  | 'encyclopedia'
  | 'settings'
  | 'unit-detail';

export const SCREEN_CODES: Record<ScreenId, string> = {
  'main-menu': 'S01',
  'game-mode': 'S02',
  'scenario-select': 'S03',
  'pantheon-select': 'S04',
  'divine-select': 'S05',
  adventure: 'S06',
  hero: 'S07',
  town: 'S08',
  recruitment: 'S09',
  pantheon: 'S10',
  battle: 'S11',
  'battle-result': 'S12',
  'level-up': 'S13',
  journal: 'S14',
  overview: 'S15',
  encyclopedia: 'S16',
  settings: 'S17',
  'unit-detail': 'S18',
};

export interface ScreenEntry {
  readonly id: ScreenId;
  readonly key: number;
  params: Record<string, unknown>;
}

export type Overlay =
  | { kind: 'pause' }
  | { kind: 'save-load'; mode: 'save' | 'load' }
  | { kind: 'confirm'; title: string; body: string; confirmLabel: string; danger?: boolean; onConfirm: () => void; detail?: string[] }
  | { kind: 'briefing' }
  | { kind: 'debrief' }
  | { kind: 'mission-failed' }
  | { kind: 'campaign-complete' }
  | { kind: 'credits' }
  | { kind: 'help'; topicId: string }
  | { kind: 'transfer'; townId: string | null; heroId: string; otherHeroId?: string }
  /** Pre-battle dialog: shown before a MoveHero that would start an encounter. */
  | { kind: 'encounter'; heroId: string; dest: HexCoord }
  /** Beacon/relay activation confirmation. */
  | { kind: 'activate'; heroId: string; siteId: string }
  | { kind: 'stack-info'; creatureId: string; count?: number };

export interface Toast {
  readonly id: number;
  readonly text: string;
  readonly tone: 'info' | 'error' | 'success';
}

export interface SetupDraft {
  mode: 'campaign' | 'skirmish' | null;
  campaignId: string | null;
  /** Skirmish scenario (its variants decide the mission for a pantheon pairing). */
  scenarioId?: string | null;
  missionId: string | null;
  pantheonId: string | null;
  /** Skirmish only: the AI rival's pantheon. */
  rivalPantheonId?: string | null;
  godId: string | null;
}

export type Presenter = (events: readonly GameEvent[], source: string) => Promise<void>;

let keySeq = 1;

export class AppStore {
  private listeners = new Set<() => void>();
  private _version = 0;
  stack: ScreenEntry[] = [{ id: 'main-menu', key: keySeq++, params: {} }];
  overlays: Overlay[] = [];
  toasts: Toast[] = [];
  prefs: Preferences = DEFAULT_PREFERENCES;
  session: GameSession | null = null;
  setup: SetupDraft = { mode: null, campaignId: null, missionId: null, pantheonId: null, godId: null };
  readonly saves: SaveManager;
  continueSlot: SlotInfo | null = null;
  continueChecked = false;
  storageError: string | null = null;
  presentationBusy = false;
  /** Sound (null until bootstrap attaches it, and in headless tests). Presentation only. */
  audio: GameAudio | null = null;
  /** Adventure selection survives navigation to other screens (return context). */
  selectedHeroId: string | null = null;
  /** One-shot camera focus request consumed by the adventure screen (journal markers etc.). */
  focusRequest: HexCoord | null = null;
  private presenters = new Set<Presenter>();
  private unsubSession: (() => void) | null = null;
  private aiTimer: ReturnType<typeof setTimeout> | null = null;
  private presentQueue: Promise<void> = Promise.resolve();
  private toastSeq = 1;

  constructor(
    readonly catalog: ContentCatalog,
    readonly platform: PlatformServices,
  ) {
    this.saves = new SaveManager(catalog, platform.saves);
  }

  // ------------------------------------------------------------ subscription

  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };

  getVersion = () => this._version;

  notify(): void {
    this._version++;
    for (const l of this.listeners) l();
  }

  // ------------------------------------------------------------ navigation

  get screen(): ScreenEntry {
    return this.stack[this.stack.length - 1]!;
  }

  goto(id: ScreenId, params: Record<string, unknown> = {}): void {
    this.stack = [...this.stack, { id, key: keySeq++, params }];
    this.notify();
  }

  replace(id: ScreenId, params: Record<string, unknown> = {}): void {
    this.stack = [...this.stack.slice(0, -1), { id, key: keySeq++, params }];
    this.notify();
  }

  resetTo(id: ScreenId, params: Record<string, unknown> = {}): void {
    this.stack = [{ id, key: keySeq++, params }];
    this.notify();
  }

  /** Return to the caller, preserving its params (selection, quantities, tabs). */
  back(): void {
    if (this.stack.length > 1) {
      this.stack = this.stack.slice(0, -1);
      this.notify();
    }
  }

  /** Persist UI context on the current entry (used for return context). */
  setParams(patch: Record<string, unknown>): void {
    const top = this.screen;
    top.params = { ...top.params, ...patch };
  }

  /** After a battle or on load: make the adventure map the base of the stack. */
  toAdventure(): void {
    this.resetTo('adventure');
  }

  // ------------------------------------------------------------ overlays & toasts

  openOverlay(o: Overlay): void {
    this.overlays = [...this.overlays, o];
    this.notify();
  }

  closeOverlay(): void {
    this.overlays = this.overlays.slice(0, -1);
    this.notify();
  }

  closeAllOverlays(): void {
    this.overlays = [];
    this.notify();
  }

  confirm(title: string, body: string, confirmLabel: string, onConfirm: () => void, opts: { danger?: boolean; detail?: string[] } = {}): void {
    this.openOverlay({ kind: 'confirm', title, body, confirmLabel, onConfirm, ...opts });
  }

  toast(text: string, tone: Toast['tone'] = 'info'): void {
    const t = { id: this.toastSeq++, text, tone };
    this.toasts = [...this.toasts.slice(-3), t];
    this.notify();
    setTimeout(() => {
      this.toasts = this.toasts.filter((x) => x.id !== t.id);
      this.notify();
    }, tone === 'error' ? 5200 : 3400);
  }

  // ------------------------------------------------------------ preferences

  setPrefs(p: Preferences, persist: boolean): Promise<string | null> {
    this.prefs = p;
    applyPreferences(p);
    this.audio?.apply(p);
    this.notify();
    return persist ? savePreferences(this.platform.preferences, p) : Promise.resolve(null);
  }

  // ------------------------------------------------------------ session lifecycle

  private attach(session: GameSession): void {
    this.unsubSession?.();
    this.session = session;
    this.selectedHeroId = null;
    this.focusRequest = null;
    this.unsubSession = session.subscribe((u) => {
      this.notify();
      if (u.events.length > 0) this.present(u.events, u.source);
      this.routeAfterUpdate(u.events);
      this.scheduleAI();
    });
    session.onCheckpoint((kind, snapshot) => {
      void this.writeCheckpoint(kind, snapshot);
    });
  }

  private async writeCheckpoint(kind: string, snapshot: SaveSnapshot): Promise<void> {
    try {
      if (kind === 'pre_encounter') await this.saves.checkpoint(snapshot, 'Before battle');
      else if (kind === 'dawn') await this.saves.autosave(snapshot, `Autosave — Day ${snapshot.match.day}`);
      else if (kind === 'mission_start') await this.saves.autosave(snapshot, 'Mission start');
      this.continueChecked = false;
    } catch (e) {
      this.storageError = e instanceof Error ? e.message : 'Autosave failed';
      this.toast(`Autosave failed: ${this.storageError}`, 'error');
    }
  }

  /** Request the adventure camera to center on a coordinate. */
  focusOn(c: HexCoord): void {
    this.focusRequest = c;
  }

  endSession(): void {
    this.unsubSession?.();
    this.unsubSession = null;
    this.session = null;
    if (this.aiTimer) clearTimeout(this.aiTimer);
    this.aiTimer = null;
    this.overlays = [];
    this.continueChecked = false;
    this.notify();
  }

  startCampaign(campaignId: string, godId: string | null): void {
    const runId = `run-${Date.now().toString(36)}`;
    const session = GameSession.newCampaign(this.catalog, campaignId, godId, runId);
    this.attach(session);
    void this.saves.autosave(session.snapshot(), 'Campaign start').catch(() => undefined);
    this.resetTo('adventure');
    this.openOverlay({ kind: 'briefing' });
  }

  resetSetup(mode: SetupDraft['mode'] = null): void {
    this.setup = { mode, campaignId: null, scenarioId: null, missionId: null, pantheonId: null, rivalPantheonId: null, godId: null };
  }

  startScenario(missionId: string, godId: string | null = null): void {
    const session = GameSession.newScenario(this.catalog, missionId, `skirmish-${Date.now().toString(36)}`, godId);
    this.attach(session);
    this.resetTo('adventure');
    this.openOverlay({ kind: 'briefing' });
  }

  loadSnapshot(snapshot: SaveSnapshot): void {
    const session = GameSession.fromSnapshot(this.catalog, snapshot);
    this.attach(session);
    this.overlays = [];
    const s = session.state;
    if (s.battle) this.resetTo('battle');
    else this.resetTo('adventure');
    if (s.pendingDecisions.length > 0) this.goto('level-up');
    this.notify();
    this.scheduleAI();
  }

  // ------------------------------------------------------------ commands

  /** Submit a player command; returns the rejection so screens can explain it. */
  dispatch(payload: CommandPayload): Rejection | null {
    const session = this.session;
    if (!session) return { code: 'invalid_command', message: 'No game in progress' };
    if (this.presentationBusy && payload.kind.startsWith('Battle')) return { code: 'invalid_command', message: 'Wait for the current action to finish' };
    const res = session.dispatch(payload);
    if (!res.ok) {
      this.toast(res.rejection.message, 'error');
      return res.rejection;
    }
    return null;
  }

  // ------------------------------------------------------------ routing after events

  private routeAfterUpdate(events: readonly GameEvent[]): void {
    const s = this.session?.state;
    if (!s) return;
    const session = this.session;
    if (events.some((e) => e.kind === 'BattleStarted')) {
      const humanInvolved = !!s.battle && Object.values(s.battle.sides).some((side) => side.controller === 'human');
      if (humanInvolved) {
        // Let the approach movement finish playing, then open the battlefield.
        void this.whenIdle().then(() => {
          if (!session || this.session !== session || !session.state.battle) return;
          this.closeAllOverlays();
          if (this.screen.id !== 'battle') this.goto('battle');
        });
      }
      return;
    }
    if (events.some((e) => e.kind === 'BattleEnded')) {
      // The result screen opens after the rules committed casualties and rewards
      // and after the final blows have been shown.
      const result = s.lastBattleResult;
      const playerInvolved = result?.playerSide !== null;
      void this.whenIdle().then(() => {
        if (this.session !== session) return;
        if (playerInvolved) this.replaceBattleWithResult();
        else this.toast(`${result?.label ?? 'A battle'} was fought out of sight.`);
        this.routeMissionOutcome(events);
      });
      return;
    }
    this.routeMissionOutcome(events);
  }

  private routeMissionOutcome(events: readonly GameEvent[]): void {
    if (events.some((e) => e.kind === 'MissionFailed')) this.openOverlay({ kind: 'mission-failed' });
    if (events.some((e) => e.kind === 'MissionCompleted')) {
      if (this.session?.campaign && this.session.campaign.branch === 'primary') {
        this.session.completeMission();
        const last = !this.session.hasNextMission();
        this.openOverlay({ kind: last ? 'campaign-complete' : 'debrief' });
      } else this.openOverlay({ kind: 'debrief' });
    }
  }

  private replaceBattleWithResult(): void {
    const idx = this.stack.findIndex((e) => e.id === 'battle');
    if (idx >= 0) this.stack = [...this.stack.slice(0, idx), { id: 'battle-result', key: keySeq++, params: {} }];
    else this.stack = [...this.stack, { id: 'battle-result', key: keySeq++, params: {} }];
    this.notify();
  }

  // ------------------------------------------------------------ presentation queue

  registerPresenter(p: Presenter): () => void {
    this.presenters.add(p);
    return () => this.presenters.delete(p);
  }

  private present(events: readonly GameEvent[], source: string): void {
    this.presentationBusy = true;
    this.presentQueue = this.presentQueue
      .then(() => Promise.all([...this.presenters].map((p) => p(events, source).catch(() => undefined))).then(() => undefined))
      .finally(() => {
        this.presentationBusy = false;
        this.notify();
        this.scheduleAI();
      });
  }

  /** Resolves once queued presentation has finished (used by the AI pacing loop). */
  whenIdle(): Promise<void> {
    return this.presentQueue;
  }

  // ------------------------------------------------------------ AI pacing

  scheduleAI(): void {
    const session = this.session;
    if (!session || this.aiTimer || !session.needsAI()) return;
    if (this.overlays.some((o) => o.kind === 'mission-failed' || o.kind === 'debrief' || o.kind === 'campaign-complete')) return;
    const enemyDelay = 180 * adventurePlaybackFactor(this.prefs, true);
    this.aiTimer = setTimeout(() => {
      this.aiTimer = null;
      void this.whenIdle().then(() => {
        if (this.session !== session || !session.needsAI()) return;
        if (this.presentationBusy) return this.scheduleAI();
        try {
          session.stepAI();
        } catch (e) {
          this.toast(`AI error: ${e instanceof Error ? e.message : String(e)}`, 'error');
        }
      });
    }, session.state.battle ? 60 : enemyDelay);
  }

  // ------------------------------------------------------------ continue

  async refreshContinue(): Promise<void> {
    try {
      const avail = await this.saves.availability();
      if (!avail.ok) {
        this.storageError = avail.reason;
        this.continueSlot = null;
      } else {
        this.storageError = null;
        this.continueSlot = await this.saves.continueTarget();
      }
    } catch (e) {
      this.storageError = e instanceof Error ? e.message : 'Storage unavailable';
      this.continueSlot = null;
    }
    this.continueChecked = true;
    this.notify();
  }
}
