import { scenarioMission } from '@pr/rules';
/**
 * GameAudio: connects the AudioDirector to the interface.
 *
 * - Music and ambience follow the screen and the mission's soundscape.
 * - The player's own committed actions, stingers and the day calendar are heard
 *   through a presenter that never delays the presentation queue.
 * - Battle sounds follow the battle scene's playback cues (see BattleCue), or a
 *   single summary sound per action when playback is instant.
 * - Buttons click, dialogs open and close, errors sound once.
 *
 * Presentation only: nothing here reads hidden information or changes state,
 * and every sound accompanies something already shown on screen, so no
 * information is carried by sound alone.
 */
import { AudioDirector, validateSoundManifest, type AudioLevels, type AudioStatus, type SoundManifest } from '@pr/audio';
import type { BattleCue } from '@pr/presentation';
import type { GameEvent } from '@pr/rules';
import soundManifest from '../../../../assets-runtime/audio/manifest.json';
import { battlePlaybackFactor, adventurePlaybackFactor, type Preferences } from '../app/preferences';
import type { AppStore } from '../app/store';
import { COMBAT_SOUNDS, MAGIC_SOUNDS, REQUIRED_SOUND_IDS, STINGERS, UI_SOUNDS, soundForCue, soundsForEvents, soundscapeFor, summaryCue } from './sounds';

export const SOUND_MANIFEST = soundManifest as SoundManifest;

export function levelsFrom(p: Preferences): AudioLevels {
  return {
    master: p.masterVolume,
    music: p.musicVolume,
    ambience: p.ambienceVolume,
    interface: p.interfaceVolume,
    combat: p.combatVolume,
    voice: p.voiceVolume,
    muted: p.muteAll,
    reduced: p.calmerSound,
  };
}

/** True when every sound file in the manifest is a placeholder (shown in Settings). */
export function soundsArePlaceholders(): boolean {
  return SOUND_MANIFEST.sounds.every((s) => s.status === 'placeholder');
}

/** Run `fn` when the page is idle (at the latest after `timeoutMs`). */
function whenIdle(fn: () => void, timeoutMs: number): void {
  if (typeof requestIdleCallback === 'function') requestIdleCallback(() => fn(), { timeout: timeoutMs });
  else setTimeout(fn, Math.min(timeoutMs, 300));
}

const CLICKABLE = 'button, [role="button"], [role="tab"], [role="menuitem"], a[href], summary, input[type="checkbox"], input[type="radio"]';

export class GameAudio {
  readonly director: AudioDirector;
  private prefs: Preferences;
  private lastScreenKey = -1;
  private lastScreenId = '';
  private lastToast = 0;
  private overlayCount = 0;
  private topOverlay: string | null = null;
  private sessionWarmed = false;
  private wantMusic: string | null | undefined = undefined;
  private wantAmbience: string | null | undefined = undefined;
  private readonly detachers: (() => void)[] = [];

  constructor(
    private readonly store: AppStore,
    opts: { createContext?: () => AudioContext | null } = {},
  ) {
    const issues = validateSoundManifest(SOUND_MANIFEST, REQUIRED_SOUND_IDS);
    if (issues.length) console.warn(`[audio] sound manifest problems: ${issues.join('; ')}`);
    this.director = new AudioDirector({ manifest: SOUND_MANIFEST, resolveUrl: (f) => `./${f}`, createContext: opts.createContext });
    this.prefs = store.prefs;
    this.apply(store.prefs);
    this.director.warm(UI_SOUNDS);
  }

  /** Committed preferences (also used to restore after a Settings preview). */
  apply(p: Preferences): void {
    this.prefs = p;
    this.director.setLevels(levelsFrom(p));
    this.director.setFocus(this.hasFocus(), p.muteOnFocusLoss);
  }

  /** Live preview of a Settings draft (Cancel restores with apply(store.prefs)). */
  preview(draft: Preferences): void {
    this.director.setLevels(levelsFrom(draft));
  }

  /** Settings "Play a test sound": one interface sound, then one combat sound. */
  sample(): void {
    this.director.unlock();
    this.director.play('ui.confirm');
    setTimeout(() => this.director.play('combat.hit'), 450);
  }

  private hasFocus(): boolean {
    if (typeof document === 'undefined') return true;
    return document.visibilityState !== 'hidden' && (typeof document.hasFocus !== 'function' || document.hasFocus());
  }

  /** Wire browser events and the store. Returns a function that undoes it. */
  attach(win: Window): () => void {
    const doc = win.document;
    const unlock = () => this.director.unlock();
    const onClick = (e: MouseEvent) => {
      const el = (e.target as Element | null)?.closest?.(CLICKABLE) as HTMLElement | null;
      if (!el || el.closest('[data-sound="none"]')) return;
      if ((el as HTMLButtonElement).disabled || el.getAttribute('aria-disabled') === 'true') return;
      this.director.play('ui.click');
    };
    const onFocus = () => this.director.setFocus(this.hasFocus(), this.prefs.muteOnFocusLoss);
    win.addEventListener('pointerdown', unlock, true);
    win.addEventListener('keydown', unlock, true);
    doc.addEventListener('click', onClick, true);
    win.addEventListener('focus', onFocus);
    win.addEventListener('blur', onFocus);
    doc.addEventListener('visibilitychange', onFocus);
    const unsub = this.store.subscribe(this.sync);
    const unpresent = this.store.registerPresenter(this.present);
    this.detachers.push(
      () => win.removeEventListener('pointerdown', unlock, true),
      () => win.removeEventListener('keydown', unlock, true),
      () => doc.removeEventListener('click', onClick, true),
      () => win.removeEventListener('focus', onFocus),
      () => win.removeEventListener('blur', onFocus),
      () => doc.removeEventListener('visibilitychange', onFocus),
      unsub,
      unpresent,
    );
    this.sync();
    return () => this.detach();
  }

  detach(): void {
    for (const d of this.detachers.splice(0)) d();
  }

  /** Called on every store change: music, screen stingers, dialogs and error sounds. */
  private readonly sync = (): void => {
    const store = this.store;
    const session = store.session;
    const mission = session ? scenarioMission(store.catalog, session.state) : undefined;
    const scape = soundscapeFor({
      screen: store.screen.id,
      overlays: store.overlays.map((o) => o.kind),
      inSession: !!session,
      soundscape: mission?.soundscape ?? null,
    });
    // Loading and decoding tracks competes with building the map or battle for the CPU and the
    // network, so music changes and the combat pre-load wait until the page is idle.
    if (scape.music !== this.wantMusic || scape.ambience !== this.wantAmbience) {
      this.wantMusic = scape.music;
      this.wantAmbience = scape.ambience;
      whenIdle(() => {
        this.director.setMusic(this.wantMusic ?? null);
        this.director.setAmbience(this.wantAmbience ?? null);
      }, 900);
    }

    if (session && !this.sessionWarmed) {
      this.sessionWarmed = true;
      whenIdle(() => this.director.warm([...COMBAT_SOUNDS, ...MAGIC_SOUNDS, ...Object.values(STINGERS)]), 4000);
    }
    if (!session) this.sessionWarmed = false;

    const screen = store.screen;
    if (screen.key !== this.lastScreenKey) {
      const was = this.lastScreenId;
      this.lastScreenKey = screen.key;
      this.lastScreenId = screen.id;
      if (screen.id === 'battle' && was !== 'battle') this.director.play('combat.start');
      if (screen.id === 'battle-result') {
        const r = session?.state.lastBattleResult;
        if (r && r.playerSide && r.outcome !== 'stalemate') this.director.play(r.winner === r.playerSide ? STINGERS.victory : STINGERS.defeat);
      }
    }

    // Dialogs open and close with a soft whoosh; the spellbook with its own leather-and-paper sound.
    const top = store.overlays[store.overlays.length - 1]?.kind ?? null;
    const overlays = store.overlays.length;
    if (overlays > this.overlayCount) this.director.play(top === 'spellbook' ? 'ui.book_open' : 'ui.open');
    else if (overlays < this.overlayCount) this.director.play(this.topOverlay === 'spellbook' ? 'ui.book_close' : 'ui.close');
    this.overlayCount = overlays;
    this.topOverlay = top;

    const last = store.toasts[store.toasts.length - 1];
    if (last && last.id > this.lastToast) {
      this.lastToast = last.id;
      if (last.tone === 'error') this.director.play('ui.error');
      else if (last.tone === 'success') this.director.play('ui.confirm');
    }
  };

  /** Presenter: sounds for a committed batch. Resolves at once (never delays play). */
  private readonly present = async (events: readonly GameEvent[]): Promise<void> => {
    const session = this.store.session;
    if (!session) return;
    for (const id of soundsForEvents(this.store.catalog, session.state, session.humanPlayerId, events)) this.director.play(id);
    // Battle playback that is instant (or reduced motion) produces no cues: one sound per action instead.
    if (this.store.screen.id === 'battle' && battlePlaybackFactor(this.prefs) === 0 && events.some((e) => e.kind.startsWith('Battle') || e.kind.startsWith('Siege'))) {
      const id = summaryCue(events);
      if (id) this.director.play(id);
    }
  };

  /** Battle scene playback cue (see BattleSceneController callbacks). */
  battleCue(cue: BattleCue): void {
    this.director.play(soundForCue(cue));
  }

  /** A sound that goes with something the interface shows (a page turned, a pop-up, a map miracle's light). */
  effect(id: string): void {
    this.director.play(id);
  }

  /** Footsteps while the player's hero walks on the adventure map (animated moves only). */
  heroSteps(walking: boolean): void {
    if (walking && adventurePlaybackFactor(this.prefs) > 0) this.director.startLoop('hero-steps', 'sfx.steps');
    else this.director.stopLoop('hero-steps');
  }

  status(): AudioStatus {
    return this.director.status();
  }
}
