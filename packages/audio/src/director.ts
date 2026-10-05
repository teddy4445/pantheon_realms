/**
 * AudioDirector: the one Web Audio graph for the application session.
 *
 *   source -> sound gain -> bus (music | ambience | interface | combat | voice)
 *          -> [music only: stinger duck] -> master -> focus -> limiter -> speakers
 *
 * Music and ambience are single looping tracks that crossfade when the scene
 * changes; a music playlist (long tracks) is streamed through media elements
 * instead, one track after another with a crossfade between them. Effects are
 * one-shots with per-sound voice limits and cooldowns.
 * Everything is loaded from bundled files on first use and cached. When audio
 * is unavailable (no Web Audio, a failed device, a file that will not decode)
 * the director stays silent and reports why; gameplay never waits for it.
 */
import { BUSES, SILENT_LEVELS, busGain, intensityGain, isLooping, mayStart, nextPlaylistIndex, type AudioLevels, type BusId, type SoundDefinition, type SoundManifest } from './manifest';

export interface AudioDirectorOptions {
  readonly manifest: SoundManifest;
  /** Resolve a manifest file path to a URL the page can fetch (bundled; never a CDN). */
  readonly resolveUrl: (file: string) => string;
  /** Create the audio context (null = no audio). Defaults to the browser's AudioContext. */
  readonly createContext?: () => AudioContext | null;
  /** Fetch a file's bytes. Defaults to fetch(). */
  readonly load?: (url: string) => Promise<ArrayBuffer>;
  /** Crossfade length for music and ambience changes. */
  readonly fadeMs?: number;
  /** Create a streaming media element for a playlist track (null = cannot stream). Defaults to `new Audio()`. */
  readonly createMediaElement?: () => HTMLMediaElement | null;
  /** Pick the first track of a playlist (0 ≤ result < length). Defaults to random. */
  readonly pickStart?: (length: number) => number;
}

export interface AudioStatus {
  readonly available: boolean;
  /** Why audio is silent, when it is. */
  readonly reason: string | null;
  readonly state: AudioContextState | 'unavailable';
  readonly music: string | null;
  /** The file the music is playing now (a playlist's current track). */
  readonly musicFile: string | null;
  readonly ambience: string | null;
  readonly loops: readonly string[];
  readonly failed: readonly string[];
  /** One-shots and stingers started since launch. */
  readonly played: number;
  /** The last few sound IDs started (newest last). */
  readonly recent: readonly string[];
  readonly busGains: Readonly<Record<BusId, number>>;
  readonly focused: boolean;
}

type Channel = 'music' | 'ambience';

interface Track {
  readonly id: string;
  readonly file: string;
  readonly gain: GainNode;
  /** Decoded, looping track. */
  readonly src?: AudioBufferSourceNode;
  /** Streamed playlist track. */
  readonly el?: HTMLMediaElement;
  readonly node?: MediaElementAudioSourceNode;
}

/** A music playlist in progress: its definition and the index of the current track. */
interface Playlist {
  readonly def: SoundDefinition;
  index: number;
  /** Tracks that failed in a row (all failed: stay silent). */
  failures: number;
  /** Set once the next track has been started for the current one. */
  advanced: boolean;
}

const RECENT = 16;

function defaultContext(): AudioContext | null {
  const w = globalThis as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext };
  const Ctor = w.AudioContext ?? w.webkitAudioContext;
  return Ctor ? new Ctor({ latencyHint: 'interactive' }) : null;
}

function defaultMediaElement(): HTMLMediaElement | null {
  const w = globalThis as { Audio?: typeof Audio };
  return w.Audio ? new w.Audio() : null;
}

async function defaultLoad(url: string): Promise<ArrayBuffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.arrayBuffer();
}

export class AudioDirector {
  private readonly defs = new Map<string, SoundDefinition>();
  private readonly opts: AudioDirectorOptions;
  private readonly fadeS: number;
  private ctx: AudioContext | null = null;
  private reason: string | null = null;
  private buses = {} as Record<BusId, GainNode>;
  private duck: GainNode | null = null;
  private master: GainNode | null = null;
  private focusGain: GainNode | null = null;
  private readonly buffers = new Map<string, Promise<AudioBuffer | null>>();
  private readonly failed = new Map<string, string>();
  private readonly live = new Map<string, Set<AudioBufferSourceNode>>();
  private readonly lastStart = new Map<string, number>();
  private readonly tracks: Record<Channel, Track | null> = { music: null, ambience: null };
  private readonly wanted: Record<Channel, string | null> = { music: null, ambience: null };
  private readonly loops = new Map<string, Track>();
  private playlist: Playlist | null = null;
  /** A streamed track whose play() the browser refused before the first interaction (retried on unlock). */
  private blocked: HTMLMediaElement | null = null;
  private levels: AudioLevels = SILENT_LEVELS;
  private focused = true;
  private muteOnFocusLoss = true;
  private played = 0;
  private readonly recent: string[] = [];
  private duckUntil = 0;

  constructor(opts: AudioDirectorOptions) {
    this.opts = opts;
    this.fadeS = (opts.fadeMs ?? 1600) / 1000;
    for (const s of opts.manifest.sounds) this.defs.set(s.id, s);
    try {
      this.ctx = (opts.createContext ?? defaultContext)();
      if (!this.ctx) this.reason = 'This browser has no Web Audio support';
    } catch (e) {
      this.ctx = null;
      this.reason = `Audio device unavailable (${e instanceof Error ? e.message : String(e)})`;
    }
    if (this.ctx) this.buildGraph(this.ctx);
  }

  private buildGraph(ctx: AudioContext): void {
    const limiter = ctx.createDynamicsCompressor();
    // A gentle safety limiter: keeps many overlapping effects from clipping.
    limiter.threshold.value = -8;
    limiter.knee.value = 6;
    limiter.ratio.value = 8;
    limiter.attack.value = 0.004;
    limiter.release.value = 0.2;
    limiter.connect(ctx.destination);
    this.focusGain = ctx.createGain();
    this.focusGain.connect(limiter);
    this.master = ctx.createGain();
    this.master.connect(this.focusGain);
    this.duck = ctx.createGain();
    this.duck.connect(this.master);
    for (const b of BUSES) {
      const g = ctx.createGain();
      g.gain.value = 0;
      g.connect(b === 'music' ? this.duck : this.master);
      this.buses[b] = g;
    }
  }

  get available(): boolean {
    return !!this.ctx;
  }

  has(id: string): boolean {
    return this.defs.has(id);
  }

  /** Browsers start audio suspended until the player interacts; call from a click or key press. */
  unlock(): void {
    if (this.ctx && this.ctx.state === 'suspended') void this.ctx.resume().catch(() => undefined);
    const el = this.blocked;
    if (el) {
      this.blocked = null;
      void Promise.resolve(el.play()).catch(() => undefined);
    }
  }

  setLevels(levels: AudioLevels): void {
    this.levels = levels;
    const ctx = this.ctx;
    if (!ctx) return;
    for (const b of BUSES) this.buses[b].gain.setTargetAtTime(busGain(levels, b), ctx.currentTime, 0.03);
    this.master!.gain.setTargetAtTime(1, ctx.currentTime, 0.03);
  }

  /** Window focus changes; with "mute on focus loss" the whole mix fades out while away. */
  setFocus(focused: boolean, muteOnFocusLoss: boolean): void {
    this.focused = focused;
    this.muteOnFocusLoss = muteOnFocusLoss;
    const ctx = this.ctx;
    if (!ctx) return;
    this.focusGain!.gain.setTargetAtTime(focused || !muteOnFocusLoss ? 1 : 0, ctx.currentTime, 0.08);
  }

  /** Start fetching and decoding sounds ahead of use (e.g. the interface set at start-up). */
  preload(ids: readonly string[]): void {
    for (const id of ids) {
      const d = this.defs.get(id);
      if (d) for (const f of d.files) void this.buffer(f);
    }
  }

  private buffer(file: string): Promise<AudioBuffer | null> {
    let p = this.buffers.get(file);
    if (!p) {
      const ctx = this.ctx;
      p = !ctx
        ? Promise.resolve(null)
        : (this.opts.load ?? defaultLoad)(this.opts.resolveUrl(file))
            .then((bytes) => ctx.decodeAudioData(bytes))
            .catch((e: unknown) => {
              const why = e instanceof Error ? e.message : String(e);
              this.failed.set(file, why);
              console.warn(`[audio] ${file} could not be loaded or decoded — staying silent for it (${why})`);
              return null;
            });
      this.buffers.set(file, p);
    }
    return p;
  }

  /** A decoded buffer if it is ready now (effects never play late). */
  private readyBuffers = new Map<string, AudioBuffer>();

  private pick(def: SoundDefinition): string {
    return def.files.length === 1 ? def.files[0]! : def.files[Math.floor(Math.random() * def.files.length)]!;
  }

  private note(id: string): void {
    this.played++;
    this.recent.push(id);
    if (this.recent.length > RECENT) this.recent.shift();
  }

  /**
   * Play a one-shot effect or stinger. Returns false when it was skipped (unknown,
   * voice limit, cooldown, not decoded yet — it is then loaded for next time).
   */
  play(id: string, opts: { gain?: number } = {}): boolean {
    const ctx = this.ctx;
    const def = this.defs.get(id);
    if (!ctx || !def || isLooping(def)) return false;
    const now = performance.now();
    const set = this.live.get(id) ?? new Set<AudioBufferSourceNode>();
    if (!mayStart(def, now, this.lastStart.get(id), set.size, this.levels.reduced)) return false;
    const file = this.pick(def);
    const buf = this.readyBuffers.get(file);
    if (!buf) {
      void this.buffer(file).then((b) => {
        if (b) this.readyBuffers.set(file, b);
      });
      return false;
    }
    this.lastStart.set(id, now);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    if (def.pitchJitterCents) src.detune.value = (Math.random() * 2 - 1) * def.pitchJitterCents;
    const g = ctx.createGain();
    g.gain.value = def.gain * intensityGain(def, this.levels.reduced) * (opts.gain ?? 1);
    src.connect(g).connect(this.buses[def.bus]);
    set.add(src);
    this.live.set(id, set);
    src.onended = () => {
      set.delete(src);
      g.disconnect();
    };
    src.start();
    this.note(id);
    if (def.role === 'stinger') this.duckMusic(buf.duration);
    return true;
  }

  private duckMusic(seconds: number): void {
    const ctx = this.ctx!;
    const t = ctx.currentTime;
    this.duck!.gain.cancelScheduledValues(t);
    this.duck!.gain.setTargetAtTime(0.25, t, 0.08);
    this.duckUntil = Math.max(this.duckUntil, t + seconds);
    this.duck!.gain.setTargetAtTime(1, this.duckUntil, 0.6);
  }

  /** Crossfade the music to a looping track (null = fade to silence). */
  setMusic(id: string | null): void {
    this.setChannel('music', id);
  }

  /** Crossfade the ambience bed (null = fade to silence). */
  setAmbience(id: string | null): void {
    this.setChannel('ambience', id);
  }

  private setChannel(ch: Channel, id: string | null): void {
    if (this.wanted[ch] === id) return;
    this.wanted[ch] = id;
    const ctx = this.ctx;
    if (!ctx) return;
    this.fadeOut(this.tracks[ch]);
    this.tracks[ch] = null;
    if (ch === 'music') this.playlist = null;
    const def = id ? this.defs.get(id) : undefined;
    if (!id || !def) return;
    if (ch === 'music' && def.playlist) {
      const start = Math.min(def.files.length - 1, Math.max(0, Math.floor((this.opts.pickStart ?? ((n) => Math.random() * n))(def.files.length))));
      this.playlist = { def, index: start, failures: 0, advanced: false };
      this.tracks.music = this.streamTrack(this.playlist);
      return;
    }
    const file = this.pick(def);
    void this.buffer(file).then((buf) => {
      if (!buf || this.wanted[ch] !== id || this.tracks[ch]) return;
      this.tracks[ch] = this.startTrack(def, buf, this.buses[def.bus], file);
      this.evict(ch, file);
    });
  }

  /**
   * Start the playlist's current track as a streamed media element through the
   * music bus. Shortly before it ends the next track starts and the two
   * crossfade; a track that fails is reported and skipped (all failed: silence).
   */
  private streamTrack(list: Playlist): Track | null {
    const ctx = this.ctx!;
    const def = list.def;
    const file = def.files[list.index]!;
    let el: HTMLMediaElement | null = null;
    let node: MediaElementAudioSourceNode | null = null;
    try {
      el = (this.opts.createMediaElement ?? defaultMediaElement)();
      if (el) node = ctx.createMediaElementSource(el);
    } catch (e) {
      this.failed.set(file, e instanceof Error ? e.message : String(e));
      el = null;
    }
    if (!el || !node) {
      if (!this.failed.has(file)) this.failed.set(file, 'streaming is not available');
      return null;
    }
    const gain = ctx.createGain();
    const target = def.gain * intensityGain(def, this.levels.reduced);
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(target, ctx.currentTime + this.fadeS);
    node.connect(gain).connect(this.buses[def.bus]);
    const track: Track = { id: def.id, file, gain, el, node };
    list.advanced = false;
    const advance = () => {
      if (this.playlist !== list || list.advanced || this.tracks.music !== track) return;
      list.advanced = true;
      list.index = nextPlaylistIndex(def.files.length, list.index);
      this.fadeOut(track);
      this.tracks.music = this.streamTrack(list);
    };
    el.addEventListener('timeupdate', () => {
      const d = el!.duration;
      if (Number.isFinite(d) && d > this.fadeS * 2 && d - el!.currentTime <= this.fadeS) advance();
    });
    el.addEventListener('ended', advance);
    el.addEventListener('playing', () => {
      if (this.playlist === list) list.failures = 0;
    });
    el.addEventListener('error', () => {
      this.failed.set(file, 'could not be streamed');
      console.warn(`[audio] ${file} could not be streamed — skipping to the next track`);
      if (this.playlist !== list || this.tracks.music !== track) return;
      list.failures++;
      if (list.failures >= def.files.length) {
        this.fadeOut(track);
        this.tracks.music = null;
        this.playlist = null;
        return;
      }
      advance();
    });
    el.preload = 'auto';
    el.src = this.opts.resolveUrl(file);
    void Promise.resolve(el.play()).catch(() => {
      // Refused before the first interaction (autoplay policy): retried on unlock().
      if (this.tracks.music === track) this.blocked = el;
    });
    return track;
  }

  private startTrack(def: SoundDefinition, buf: AudioBuffer, bus: GainNode, file: string): Track {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const gain = ctx.createGain();
    const target = def.gain * intensityGain(def, this.levels.reduced);
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(target, ctx.currentTime + this.fadeS);
    src.connect(gain).connect(bus);
    src.start();
    return { id: def.id, file, src, gain };
  }

  private fadeOut(t: Track | null): void {
    const ctx = this.ctx;
    if (!t || !ctx) return;
    const now = ctx.currentTime;
    t.gain.gain.cancelScheduledValues(now);
    t.gain.gain.setValueAtTime(t.gain.gain.value, now);
    t.gain.gain.linearRampToValueAtTime(0, now + this.fadeS);
    if (t.src) {
      t.src.stop(now + this.fadeS + 0.05);
      t.src.onended = () => t.gain.disconnect();
    }
    if (t.el) {
      const el = t.el;
      if (this.blocked === el) this.blocked = null;
      // Stop streaming after the fade and release the file.
      setTimeout(() => {
        el.pause();
        el.removeAttribute('src');
        el.load();
        t.node?.disconnect();
        t.gain.disconnect();
      }, this.fadeS * 1000 + 100);
    }
  }

  /** Keep decoded memory bounded: long tracks other than the current one are dropped. */
  private evict(ch: Channel, keep: string): void {
    for (const [file] of this.buffers) {
      const def = [...this.defs.values()].find((d) => d.files.includes(file));
      if (!def || def.role !== ch || file === keep) continue;
      this.buffers.delete(file);
    }
  }

  /** Start a named effect loop (e.g. footsteps while a hero walks). */
  startLoop(key: string, id: string): void {
    const ctx = this.ctx;
    const def = this.defs.get(id);
    if (!ctx || !def || def.role !== 'loop' || this.loops.has(key)) return;
    const file = this.pick(def);
    const buf = this.readyBuffers.get(file);
    if (!buf) {
      void this.buffer(file).then((b) => {
        if (b) this.readyBuffers.set(file, b);
      });
      return;
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(def.gain * intensityGain(def, this.levels.reduced), ctx.currentTime + 0.08);
    src.connect(gain).connect(this.buses[def.bus]);
    src.start();
    this.loops.set(key, { id, file, src, gain });
  }

  stopLoop(key: string): void {
    const t = this.loops.get(key);
    const ctx = this.ctx;
    if (!t || !ctx) return;
    this.loops.delete(key);
    const now = ctx.currentTime;
    t.gain.gain.cancelScheduledValues(now);
    t.gain.gain.setValueAtTime(t.gain.gain.value, now);
    t.gain.gain.linearRampToValueAtTime(0, now + 0.15);
    t.src?.stop(now + 0.2);
    if (t.src) t.src.onended = () => t.gain.disconnect();
  }

  /** Warm the decoded cache for effects so their first use is on time. */
  warm(ids: readonly string[]): void {
    for (const id of ids) {
      const d = this.defs.get(id);
      if (!d) continue;
      for (const f of d.files)
        void this.buffer(f).then((b) => {
          if (b) this.readyBuffers.set(f, b);
        });
    }
  }

  status(): AudioStatus {
    const busGains = {} as Record<BusId, number>;
    for (const b of BUSES) busGains[b] = busGain(this.levels, b);
    return {
      available: !!this.ctx,
      reason: this.reason,
      state: this.ctx ? this.ctx.state : 'unavailable',
      music: this.tracks.music?.id ?? null,
      musicFile: this.tracks.music?.file ?? null,
      ambience: this.tracks.ambience?.id ?? null,
      loops: [...this.loops.values()].map((t) => t.id),
      failed: [...this.failed.keys()],
      played: this.played,
      recent: [...this.recent],
      busGains,
      focused: this.focused || !this.muteOnFocusLoss,
    };
  }

  dispose(): void {
    for (const ch of ['music', 'ambience'] as const) {
      const t = this.tracks[ch];
      t?.src?.stop();
      t?.el?.pause();
      this.tracks[ch] = null;
    }
    this.playlist = null;
    for (const t of this.loops.values()) t.src?.stop();
    this.loops.clear();
    void this.ctx?.close().catch(() => undefined);
    this.ctx = null;
  }
}
