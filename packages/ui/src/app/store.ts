/**
 * AppStore: application-level UI state (navigation, overlays, toasts,
 * preferences, setup draft) plus the current GameSession.
 *
 * Owns: which screen is shown, return context, modal stack, AI pacing and the
 * presentation queue. Does NOT own game truth: all game data is read from
 * session.state, and all changes go through session.dispatch (commands).
 */
import { KEY_COLOR_LABEL, campaignEpilogueLines, matchScore, scenarioMission, type ContentCatalog, type DialogueLine, type GameEvent, type CommandPayload, type HexCoord, type KeyColor, type Rejection } from '@pr/rules';
import { clearBattleLogs, recordBattleEvents } from './battleLog';
import { GameSession, campaignScore, type RandomSkirmish, type SaveSnapshot } from '@pr/session';
import type { PlatformServices } from '@pr/platform';
import { SaveManager, type SlotInfo } from './saves';
import { recordHighScore } from './records';
import { DEFAULT_PREFERENCES, applyPreferences, adventurePlaybackFactor, battlePlaybackFactor, savePreferences, type Preferences } from './preferences';

/** How long the battlefield stays after the final blow before the result screen (normal playback). */
// Long enough to see the winners celebrate (owner request 2026-10-03).
const FINAL_BLOW_BEAT_MS = 1200;
/** Screens a pending level-up opens over by itself (not the battle, its result or the menus). */
const LEVEL_UP_FROM: readonly ScreenId[] = ['adventure', 'town', 'hero', 'recruitment', 'pantheon', 'journal'];
import type { ReactNode } from 'react';
import type { GameAudio } from '../audio/gameAudio';
import { campaignEndingArtId } from '../assets/storyArt';
import { momentsFromEvents, type Moment } from './moments';

export type ScreenId =
  | 'main-menu'
  | 'game-mode'
  | 'scenario-select'
  | 'pantheon-select'
  | 'adventure'
  | 'hero'
  | 'town'
  | 'recruitment'
  | 'pantheon'
  | 'battle'
  | 'battle-result'
  | 'level-up'
  | 'journal'
  | 'encyclopedia'
  | 'settings'
  | 'unit-detail'
  | 'random-setup'
  | 'map-setup'
  | 'summary'
  | 'high-scores'
  | 'map-editor';

export const SCREEN_CODES: Record<ScreenId, string> = {
  'main-menu': 'S01',
  'game-mode': 'S02',
  'scenario-select': 'S03',
  'pantheon-select': 'S04',
  adventure: 'S06',
  hero: 'S07',
  town: 'S08',
  recruitment: 'S09',
  pantheon: 'S10',
  battle: 'S11',
  'battle-result': 'S12',
  'level-up': 'S13',
  journal: 'S14',
  encyclopedia: 'S16',
  settings: 'S17',
  'unit-detail': 'S18',
  'random-setup': 'S19',
  summary: 'S20',
  'high-scores': 'S21',
  'map-editor': 'S22',
  'map-setup': 'S23',
};

export interface ScreenEntry {
  readonly id: ScreenId;
  readonly key: number;
  params: Record<string, unknown>;
}

/** Who the spellbook belongs to (a hero, or a scripted battle commander). */
export interface SpellCaster {
  readonly name: string;
  readonly mana: number;
  readonly knownSpellIds: readonly string[];
  readonly spellbook: boolean;
}

/** A spellbook opened to cast: each known spell's state where it was opened, and what picking one does. */
export interface SpellCastRequest {
  readonly context: 'battle' | 'adventure';
  readonly options: Readonly<Record<string, { readonly castable: boolean; readonly reason?: string | null }>>;
  readonly onCast: (spellId: string) => void;
  readonly note?: string;
}

export type Overlay =
  | { kind: 'pause' }
  | { kind: 'save-load'; mode: 'save' | 'load' }
  | { kind: 'confirm'; title: string; body: string; confirmLabel: string; danger?: boolean; onConfirm: () => void; detail?: string[]; content?: ReactNode }
  | { kind: 'briefing' }
  | { kind: 'debrief' }
  | { kind: 'mission-failed' }
  | { kind: 'campaign-complete' }
  | { kind: 'help'; topicId: string }
  | { kind: 'transfer'; townId: string | null; heroId: string; otherHeroId?: string }
  /** Pre-battle dialog: shown before a MoveHero that would start an encounter. */
  | { kind: 'encounter'; heroId: string; dest: HexCoord }
  /** Beacon/relay activation confirmation. */
  | { kind: 'activate'; heroId: string; siteId: string }
  | { kind: 'stack-info'; creatureId: string; count?: number }
  /**
   * The spellbook pop-up (components/spellbook.tsx): read-only from the hero screen,
   * or a casting book from the map's and the battle's Spells buttons. `caster` stands
   * in for a battle commander without a hero; `cast.onCast` runs after the book closes.
   */
  | { kind: 'spellbook'; heroId: string; caster?: SpellCaster; cast?: SpellCastRequest }
  /** Hot-seat: the map stays hidden until the next player takes the seat. */
  | { kind: 'handoff'; playerId: string }
  /** Recruit from a neutral creature camp. */
  | { kind: 'camp'; heroId: string; siteId: string }
  /** One-time map event choice. */
  | { kind: 'map-event'; heroId: string; siteId: string }
  /** Treasure chest: Gold or experience (random maps). */
  | { kind: 'chest'; heroId: string; siteId: string }
  /** Quest hut: the quest and its reward (random maps). */
  | { kind: 'quest-hut'; heroId: string; siteId: string }
  /** Adventure-map divine interventions. */
  | { kind: 'interventions' }
  /** End of a skirmish (victory or defeat). */
  | { kind: 'game-over' }
  /** Keyboard shortcuts reference. */
  | { kind: 'shortcuts' };

/** One story scene (or the campaign epilogue) waiting in the dialogue window. */
export interface StoryEntry {
  readonly key: string;
  readonly title: string | null;
  readonly lines: readonly DialogueLine[];
  /** Opened after the scene closes (the campaign epilogue leads to the summary). */
  readonly then?: 'campaign-complete';
  /** Full-screen story picture behind the scene (the chosen ending of a campaign). */
  readonly backdropAssetId?: string | null;
}

export interface Toast {
  readonly id: number;
  readonly text: string;
  readonly tone: 'info' | 'error' | 'success';
  /** Seen by every player (e.g. an empire eliminated). Others are cleared at a hot-seat hand-over. */
  readonly public?: boolean;
}

export interface SetupDraft {
  mode: 'campaign' | 'skirmish' | null;
  campaignId: string | null;
  /** Skirmish scenario (its variants decide the mission for a pantheon pairing). */
  scenarioId?: string | null;
  /** Authored skirmish map (catalog `skirmishMaps`), set up on S23. */
  skirmishMapId?: string | null;
  missionId: string | null;
  pantheonId: string | null;
  /** Skirmish only: the AI rival's pantheon. */
  rivalPantheonId?: string | null;
  godId: string | null;
  /** Skirmish only: difficulty (AI resources and aggression). */
  difficultyId?: string | null;
  /** Skirmish only: who plays the rival seat (human = hot-seat on this computer). */
  rivalController?: 'ai' | 'human';
  /** Hot-seat: the rival's patron god. */
  rivalGodId?: string | null;
  /** Hot-seat: seat names. */
  playerName?: string;
  rivalName?: string;
}

/** Options for a new skirmish (passed through to the session's mission factory). */
export interface StartOptions {
  readonly difficultyId?: string | null;
  readonly controllers?: Readonly<Record<string, 'human' | 'ai'>>;
  readonly playerNames?: Readonly<Record<string, string>>;
  readonly patronGodIds?: Readonly<Record<string, string>>;
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
  /** Diagnostics: how many times a started battle opened the battlefield (read by UI tests). */
  battleScreenOpens = 0;
  /** Diagnostics: outcomes of the mounted heroes' readiness beats before battles (read by UI tests). */
  readonly prepareWar = { finished: 0, cancelled: 0, skipped: 0 };
  /** Sound (null until bootstrap attaches it, and in headless tests). Presentation only. */
  audio: GameAudio | null = null;
  /** Adventure selection survives navigation to other screens (return context). */
  selectedHeroId: string | null = null;
  /** One-shot camera focus request consumed by the adventure screen (journal markers etc.). */
  focusRequest: HexCoord | null = null;
  /**
   * Presentation only: looping map auras of the viewer's own spells that last
   * the day (Fleet Foot, Wings of Hermes), set when the cast plays. Shown while
   * the match and hero are the same and the day is before `untilDay`; never saved.
   */
  mapAuras: { matchId: string; heroId: string; id: string; untilDay: number }[] = [];
  /** Story scenes waiting to be shown (the dialogue window shows the first). */
  story: StoryEntry[] = [];
  /** Big moments waiting to be shown (miracle cards, new-week banners; the moment layer shows the first). */
  moments: Moment[] = [];
  private momentSeq = 1;
  /** Tips waiting to be shown (contextual help; the panel shows the first). */
  hints: string[] = [];
  private hintsShown = new Set<string>();
  /** Hot-seat: the human seat whose view was last handed over. */
  private shownViewer: string | null = null;
  /** Result of the last high-score recording (summary screen). */
  lastRecord: { table: 'campaign' | 'skirmish'; rank: number | null; score: number } | null = null;
  private presenters = new Set<Presenter>();
  /** Called synchronously with each batch before the screens re-render (a view can hold what the batch will animate). */
  private preparers = new Set<(events: readonly GameEvent[]) => void>();
  private unsubSession: (() => void) | null = null;
  private aiTimer: ReturnType<typeof setTimeout> | null = null;
  private levelUpQueued = false;
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
    this.checkLevelUp();
  }

  closeAllOverlays(): void {
    this.overlays = [];
    this.notify();
    this.checkLevelUp();
  }

  confirm(title: string, body: string, confirmLabel: string, onConfirm: () => void, opts: { danger?: boolean; detail?: string[]; content?: ReactNode } = {}): void {
    this.openOverlay({ kind: 'confirm', title, body, confirmLabel, onConfirm, ...opts });
  }

  toast(text: string, tone: Toast['tone'] = 'info', opts: { public?: boolean } = {}): void {
    const t = { id: this.toastSeq++, text, tone, ...(opts.public ? { public: true } : {}) };
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
    this.story = [];
    this.moments = [];
    this.hints = [];
    this.lastRecord = null;
    this.shownViewer = session.state.players[session.state.activePlayerId]?.controller === 'human' ? session.state.activePlayerId : null;
    clearBattleLogs();
    this.unsubSession = session.subscribe((u) => {
      if (u.events.length > 0) recordBattleEvents(this.catalog, u.state, u.events, this.prefs.combatLogDetail);
      if (u.events.length > 0) this.prepare(u.events);
      this.notify();
      if (u.events.length > 0) this.present(u.events, u.source);
      if (u.source === 'start' || u.source === 'load') {
        this.story = [];
        this.moments = [];
        this.shownViewer = u.source === 'start' ? u.state.activePlayerId : null;
      } else this.queueMoments(u.events);
      this.queueStory(u.events);
      this.routeAfterUpdate(u.events);
      this.checkHandoff();
      this.checkLevelUp();
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
    this.moments = [];
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

  startScenario(missionId: string, godId: string | null = null, opts: StartOptions = {}): void {
    const session = GameSession.newScenario(this.catalog, missionId, `skirmish-${Date.now().toString(36)}`, godId, opts);
    this.attach(session);
    this.resetTo('adventure');
    this.openOverlay({ kind: 'briefing' });
  }

  /**
   * Start a generated (random-map) skirmish: straight onto the adventure map —
   * a random map has no story, so there is no briefing to show first (its
   * objectives stay in the Journal).
   */
  startGenerated(generated: RandomSkirmish, godId: string | null, opts: StartOptions = {}): void {
    const session = GameSession.newGenerated(this.catalog, generated, `random-${Date.now().toString(36)}`, { ...opts, startingGodId: godId });
    this.attach(session);
    this.resetTo('adventure');
  }

  loadSnapshot(snapshot: SaveSnapshot): void {
    const session = GameSession.fromSnapshot(this.catalog, snapshot);
    this.attach(session);
    this.shownViewer = null;
    this.overlays = [];
    const s = session.state;
    if (s.battle) this.resetTo('battle');
    else this.resetTo('adventure');
    if (s.pendingDecisions.length > 0) this.goto('level-up');
    this.notify();
    this.checkHandoff();
    this.scheduleAI();
  }

  // ------------------------------------------------------------ big moments

  /**
   * Miracle cards and new-week banners for one committed update (human or AI
   * command). A miracle card rises at once, with its effect; a new-week banner
   * waits until the day's movement has played out.
   */
  private queueMoments(events: readonly GameEvent[]): void {
    const session = this.session;
    if (!session) return;
    const drafts = momentsFromEvents(this.catalog, session.state, session.humanPlayerId, events);
    if (drafts.length === 0) return;
    const add = (list: typeof drafts) => {
      if (this.session !== session || list.length === 0) return;
      this.moments = [...this.moments, ...list.map((d) => ({ ...d, key: `moment-${this.momentSeq++}` }))];
      this.notify();
    };
    add(drafts.filter((d) => d.kind === 'miracle'));
    const weeks = drafts.filter((d) => d.kind === 'new-week');
    if (weeks.length) void this.whenIdle().then(() => add(weeks));
  }

  /**
   * Resolves once no miracle card is showing or waiting (a miracle's effect on
   * the battlefield or the map plays after its card). Resolves at once when
   * there is none — miracle cards exist only where their art is delivered.
   */
  whenMiracleCardsClosed(): Promise<void> {
    return new Promise((resolve) => {
      let timer: ReturnType<typeof setTimeout> | null = null;
      const check = () => {
        if (this.moments.some((m) => m.kind === 'miracle')) return;
        done();
      };
      const done = () => {
        this.listeners.delete(check);
        if (timer) clearTimeout(timer);
        resolve();
      };
      this.listeners.add(check);
      // Never hold playback indefinitely (a card left open in a hidden window).
      timer = setTimeout(done, 20000);
      check();
    });
  }

  dismissMoment(key: string): void {
    if (!this.moments.some((m) => m.key === key)) return;
    this.moments = this.moments.filter((m) => m.key !== key);
    this.notify();
  }

  // ------------------------------------------------------------ story scenes

  private queueStory(events: readonly GameEvent[]): void {
    const session = this.session;
    if (!session) return;
    const ids = events.flatMap((e) => (e.kind === 'StoryScene' ? [e.sceneId] : []));
    if (ids.length === 0) return;
    const mission = scenarioMission(this.catalog, session.state);
    const entries = ids.flatMap((id): StoryEntry[] => {
      const scene = mission?.storyScenes?.find((x) => x.id === id);
      return scene ? [{ key: `${session.state.matchId}:${id}`, title: null, lines: scene.lines }] : [];
    });
    // Let the movement or blow that triggered the scene finish first.
    void this.whenIdle().then(() => {
      if (this.session !== session) return;
      for (const e of entries) if (!this.story.some((x) => x.key === e.key)) this.story = [...this.story, e];
      this.notify();
    });
  }

  /** Show lines in the dialogue window (campaign epilogue). */
  playStory(entry: StoryEntry): void {
    if (this.story.some((x) => x.key === entry.key)) return;
    this.story = [...this.story, entry];
    this.notify();
  }

  /** The dialogue window finished its scene. */
  closeStory(): void {
    const done = this.story[0];
    if (!done) return;
    this.story = this.story.slice(1);
    if (done.then === 'campaign-complete') this.openOverlay({ kind: 'campaign-complete' });
    this.notify();
    this.checkLevelUp();
    this.scheduleAI();
  }

  // ------------------------------------------------------------ contextual help

  /** Show a tip the first time its moment comes (Settings → Tutorial hints). */
  showHint(id: string): void {
    if (!this.prefs.tutorialHints || this.prefs.dismissedHints.includes(id) || this.hintsShown.has(id)) return;
    this.hintsShown.add(id);
    this.hints = [...this.hints, id];
    this.notify();
  }

  dismissHint(id: string): void {
    this.hints = this.hints.filter((h) => h !== id);
    const dismissed = this.prefs.dismissedHints.includes(id) ? this.prefs.dismissedHints : [...this.prefs.dismissedHints, id];
    void this.setPrefs({ ...this.prefs, dismissedHints: dismissed }, true);
  }

  disableHints(): void {
    this.hints = [];
    void this.setPrefs({ ...this.prefs, tutorialHints: false }, true);
  }

  resetHints(): void {
    this.hintsShown.clear();
  }

  // ------------------------------------------------------------ hot-seat hand-over

  /**
   * A hero of the viewer's reached a new level outside a battle (a quest
   * reward, a learning stone, a chest, the Training Academy, a freed prisoner):
   * the level-up screen opens by itself — no button — once the map is idle and
   * nothing waits in front of it (a story scene, a dialog, a hand-over). After a
   * battle the result screen's Continue leads there.
   */
  private checkLevelUp(): void {
    const session = this.session;
    if (!session || this.levelUpQueued || !this.levelUpReady(session)) return;
    this.levelUpQueued = true;
    void this.whenIdle().then(() => {
      this.levelUpQueued = false;
      if (this.session === session && this.levelUpReady(session)) this.goto('level-up');
    });
  }

  private levelUpReady(session: GameSession): boolean {
    const st = session.state;
    if (st.battle || this.story.length > 0 || this.overlays.length > 0) return false;
    if (!LEVEL_UP_FROM.includes(this.screen.id)) return false;
    const viewer = session.humanPlayerId;
    return st.pendingDecisions.some((d) => st.heroes[d.heroId]?.ownerId === viewer);
  }

  private checkHandoff(): void {
    const session = this.session;
    if (!session || session.humanSeats.length < 2) return;
    const st = session.state;
    if (st.battle || st.outcome.status !== 'running') return;
    const active = st.players[st.activePlayerId];
    if (!active || active.controller !== 'human' || active.eliminated) return;
    if (this.shownViewer === active.id) return;
    this.shownViewer = active.id;
    void this.whenIdle().then(() => {
      if (this.session !== session || session.state.activePlayerId !== active.id) return;
      this.selectedHeroId = null;
      // Hot-seat privacy: what the previous player saw (their toasts, their waiting
      // miracle cards, their tips) does not carry over to the next one; a new
      // week's banner is for everyone.
      this.toasts = this.toasts.filter((t) => t.public);
      this.moments = this.moments.filter((m) => m.kind === 'new-week');
      this.hints = [];
      this.overlays = this.overlays.filter((o) => o.kind !== 'handoff');
      if (this.screen.id !== 'adventure') this.resetTo('adventure');
      this.openOverlay({ kind: 'handoff', playerId: active.id });
    });
  }

  // ------------------------------------------------------------ results & high scores

  /** Record the finished match (and a finished campaign) in the high-score tables. */
  private async recordResults(): Promise<void> {
    const session = this.session;
    if (!session) return;
    const st = session.state;
    if (st.outcome.status === 'running') return;
    const mission = scenarioMission(this.catalog, st);
    const at = new Date().toISOString();
    try {
      if (session.campaign) {
        const camp = session.campaign;
        if (camp.branch !== 'primary' || camp.status !== 'completed') return;
        const player = st.players[mission?.player.playerId ?? st.playerOrder[0]!]!;
        const score = campaignScore(camp);
        const res = await recordHighScore(this.platform.records, {
          key: `campaign:${camp.campaignRunId}`,
          table: 'campaign',
          score,
          playerName: player.name,
          pantheonId: player.pantheonId,
          title: this.catalog.campaigns[camp.campaignId]?.name ?? camp.campaignId,
          outcome: 'victory',
          days: camp.completions.reduce((n, c) => n + c.summary.days, 0),
          difficultyId: null,
          recordedAt: at,
        });
        this.lastRecord = { table: 'campaign', rank: res.rank, score };
      } else {
        for (const id of session.humanSeats) {
          const player = st.players[id]!;
          const score = matchScore(this.catalog, st, id).total;
          const won = st.outcome.winnerIds?.includes(id) ?? false;
          const res = await recordHighScore(this.platform.records, {
            key: `skirmish:${st.matchId}:${id}`,
            table: 'skirmish',
            score,
            playerName: player.name,
            pantheonId: player.pantheonId,
            title: mission?.name ?? 'Skirmish',
            outcome: won ? 'victory' : 'defeat',
            days: st.outcome.day,
            difficultyId: st.scenario.difficultyId ?? null,
            recordedAt: at,
          });
          if (id === session.humanPlayerId) this.lastRecord = { table: 'skirmish', rank: res.rank, score };
        }
      }
      this.notify();
    } catch (e) {
      this.toast(`Could not record the high score: ${e instanceof Error ? e.message : String(e)}`, 'error');
    }
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
    this.announceSiteEvents(events);
    if (events.some((e) => e.kind === 'BattleStarted')) {
      const humanInvolved = !!s.battle && Object.values(s.battle.sides).some((side) => side.controller === 'human');
      if (humanInvolved) {
        // Let the approach movement finish playing, then open the battlefield.
        void this.whenIdle().then(() => {
          if (!session || this.session !== session || !session.state.battle) return;
          this.closeAllOverlays();
          if (this.screen.id !== 'battle') {
            this.battleScreenOpens += 1;
            this.goto('battle');
          }
        });
      }
      return;
    }
    if (events.some((e) => e.kind === 'BattleEnded')) {
      // The result screen opens after the rules committed casualties and rewards
      // and after the final blows have been shown.
      const result = s.lastBattleResult;
      const playerInvolved = result?.playerSide !== null;
      // A short beat on the battlefield after the final blow has played.
      const beat = playerInvolved && this.screen.id === 'battle' && battlePlaybackFactor(this.prefs) > 0 ? FINAL_BLOW_BEAT_MS : 0;
      void this.whenIdle()
        .then(() => (beat ? new Promise<void>((r) => setTimeout(r, beat)) : undefined))
        .then(() => {
          if (this.session !== session) return;
          if (playerInvolved) this.replaceBattleWithResult();
          else this.toast(`${result?.label ?? 'A battle'} was fought out of sight.`);
          this.routeMissionOutcome(events);
        });
      return;
    }
    this.routeMissionOutcome(events);
  }

  /**
   * Toasts for the viewer's own heroes at the sites added 2026-10-02 (learning
   * stones, shrines, trainers, key tents, windmills, prisons; refusals say why).
   * The chest, quest hut and neutral-reaction dialogs report their own results.
   */
  private announceSiteEvents(events: readonly GameEvent[]): void {
    const session = this.session;
    if (!session) return;
    const st = session.state;
    const me = session.humanPlayerId;
    const mine = (heroId: string) => st.heroes[heroId]?.ownerId === me;
    const heroName = (heroId: string) => st.heroes[heroId]?.name ?? 'Your hero';
    for (const e of events) {
      switch (e.kind) {
        case 'LearningStoneUsed':
          if (mine(e.heroId)) this.toast(`${heroName(e.heroId)} studies the learning stone: +${e.xp.toLocaleString('en-US')} experience`, 'success');
          break;
        case 'ShrineSpellLearned':
          if (mine(e.heroId)) this.toast(`${heroName(e.heroId)} learns ${this.catalog.spells[e.spellId]?.name ?? e.spellId}`, 'success');
          break;
        case 'SkillTrained':
          if (mine(e.heroId)) this.toast(`${heroName(e.heroId)} learns ${this.catalog.skills[e.skillId]?.name ?? e.skillId} (Basic)`, 'success');
          break;
        case 'KeyObtained':
          if (e.playerId === me) this.toast(`You receive the ${KEY_COLOR_LABEL[e.color as KeyColor]?.toLowerCase() ?? e.color} key: matching key gates now open for your heroes`, 'success');
          break;
        case 'WindmillCollected':
          if (mine(e.heroId))
            this.toast(
              `Windmill: ${Object.entries(e.amount)
                .filter(([, v]) => v > 0)
                .map(([k, v]) => `+${v.toLocaleString('en-US')} ${k}`)
                .join(', ')}`,
              'success',
            );
          break;
        case 'PrisonerFreed':
          if (mine(e.byHeroId)) this.toast(`${heroName(e.heroId)} is free and joins you`, 'success');
          break;
        case 'SiteRefused':
          if (mine(e.heroId)) this.toast(e.reason, 'info');
          break;
        default:
          break;
      }
    }
  }

  private routeMissionOutcome(events: readonly GameEvent[]): void {
    const session = this.session;
    for (const e of events) {
      if (e.kind !== 'PlayerEliminated' || !session) continue;
      const p = session.state.players[e.playerId];
      if (p && session.state.outcome.status === 'running') this.toast(`${p.name} has been eliminated.`, 'info', { public: true });
    }
    const ended = events.some((e) => e.kind === 'MissionFailed' || e.kind === 'MissionCompleted');
    if (!ended || !session) return;
    if (!session.campaign) {
      // Skirmish (one or more human seats): one result dialog, then the summary.
      this.openOverlay({ kind: 'game-over' });
      void this.recordResults();
      return;
    }
    if (events.some((e) => e.kind === 'MissionFailed')) this.openOverlay({ kind: 'mission-failed' });
    if (events.some((e) => e.kind === 'MissionCompleted')) {
      if (session.campaign.branch === 'primary') {
        session.completeMission();
        const last = !session.hasNextMission();
        if (last) {
          void this.recordResults();
          const camp = this.catalog.campaigns[session.campaign.campaignId];
          // The closing scene plays first; the campaign summary follows it.
          const lines = camp ? campaignEpilogueLines(camp, session.state.mission.flags) : [];
          if (camp && lines.length) this.playStory({ key: `epilogue:${camp.id}`, title: `${camp.name} — Epilogue`, lines, then: 'campaign-complete', backdropAssetId: campaignEndingArtId(camp, session.state.mission.flags) });
          else this.openOverlay({ kind: 'campaign-complete' });
        } else this.openOverlay({ kind: 'debrief' });
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

  /**
   * Register a synchronous step run for every published batch before the
   * screens re-render with the new state — e.g. the battle view keeps the
   * stacks a batch touches as they were drawn until its playback (presenters
   * run later, after any queued playback).
   */
  registerPreparer(p: (events: readonly GameEvent[]) => void): () => void {
    this.preparers.add(p);
    return () => this.preparers.delete(p);
  }

  private prepare(events: readonly GameEvent[]): void {
    for (const p of this.preparers) {
      try {
        p(events);
      } catch {
        // Presentation must never break the game.
      }
    }
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
    if (this.story.length > 0) return;
    if (this.overlays.some((o) => o.kind === 'mission-failed' || o.kind === 'debrief' || o.kind === 'campaign-complete' || o.kind === 'game-over')) return;
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
