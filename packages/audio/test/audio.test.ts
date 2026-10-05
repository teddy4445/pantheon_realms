import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { AudioDirector, busGain, intensityGain, mayStart, nextPlaylistIndex, sliderGain, validateSoundManifest, voiceLimit, type AudioLevels, type SoundDefinition, type SoundManifest } from '../src';
import { REQUIRED_SOUND_IDS, SOUNDSCAPES, MUSIC, AMBIENCE } from '../../ui/src/audio/sounds';
import { loadCatalog } from '@pr/content';

const root = path.resolve(__dirname, '../../..');
const manifest = JSON.parse(readFileSync(path.join(root, 'assets-runtime/audio/manifest.json'), 'utf8')) as SoundManifest;

/**
 * The director tests need two decoded, looping music entries; the shipped menu and battle
 * music are streamed playlists (2026-10-05), so the tests give them one file each.
 */
const loopManifest: SoundManifest = {
  ...manifest,
  sounds: manifest.sounds.map((s) => {
    if (s.id !== 'music.menu' && s.id !== 'music.battle') return s;
    const { playlist: _p, ...rest } = s;
    return { ...rest, files: [s.id === 'music.menu' ? 'audio/music_menu.ogg' : 'audio/music_battle.ogg'] };
  }),
};

const LEVELS: AudioLevels = { master: 100, music: 50, ambience: 100, interface: 80, combat: 0, voice: 100, muted: false, reduced: false };

describe('sound manifest', () => {
  it('is valid and provides every sound the game plays', () => {
    expect(validateSoundManifest(manifest, REQUIRED_SOUND_IDS)).toEqual([]);
  });

  it('points only at bundled Ogg files that exist', () => {
    for (const s of manifest.sounds)
      for (const f of s.files) {
        const file = path.join(root, 'assets-runtime', f);
        expect(existsSync(file), f).toBe(true);
        expect(readFileSync(file).subarray(0, 4).toString('latin1'), f).toBe('OggS');
      }
  });

  it('final sounds name their Pixabay sources and licence; the rest are labelled placeholders', () => {
    for (const s of manifest.sounds) {
      if (s.status === 'final') {
        // Royalty-free tracks and effects (2026-10-04 map music; 2026-10-05 the rest) with their pages and licence.
        expect(s.provenance, s.id).toMatch(/Pixabay Content License/);
        expect(s.provenance, s.id).toMatch(/https:\/\/pixabay\.com\/(music|sound-effects)\//);
        if (s.role === 'music') expect(s.playlist, s.id).toBe(true);
        continue;
      }
      expect(s.status).toBe('placeholder');
      expect(s.provenance).toMatch(/placeholder/i);
    }
  });

  it('the final sounds of 2026-10-05 match their source list: battle music per pantheon, siege, menu, results, stingers, effects, ambience loops', () => {
    const spec = JSON.parse(readFileSync(path.join(root, 'assets-source/audio/sounds.json'), 'utf8')) as {
      sounds: { id: string; role: string; tracks: { pixabayId: number; file: string }[] }[];
      sources: Record<string, { title: string; author: string; page: string }>;
      licenseNote: string;
    };
    expect(spec.licenseNote).toMatch(/no attribution required/);
    const catalog = loadCatalog();
    for (const p of catalog.pantheonOrder) {
      const e = manifest.sounds.find((s) => s.id === MUSIC.battleOf(p));
      expect(e?.status, p).toBe('final');
      expect(e!.files.length, p).toBeGreaterThanOrEqual(2);
    }
    for (const id of [MUSIC.menu, MUSIC.siege, MUSIC.resolution, 'stinger.victory', 'stinger.defeat']) expect(manifest.sounds.find((s) => s.id === id)?.status, id).toBe('final');
    for (const s of spec.sounds) {
      const e = manifest.sounds.find((x) => x.id === s.id);
      expect(e?.status, s.id).toBe('final');
      expect(e!.files).toEqual(s.tracks.map((t) => t.file));
      for (const t of s.tracks) {
        const src = spec.sources[String(t.pixabayId)];
        expect(src?.title && src.author && /^https:\/\/pixabay\.com\//.test(src.page), `${s.id} ${t.pixabayId}`).toBeTruthy();
      }
    }
    // Every sound the game plays is final.
    const left = manifest.sounds.filter((s) => s.status !== 'final').map((s) => s.id);
    expect(left, left.join(', ')).toEqual([]);
  });

  it('every pantheon has a map playlist of long tracks listed with title, author, page and licence', () => {
    const tracks = (JSON.parse(readFileSync(path.join(root, 'assets-source/audio/music/tracks.json'), 'utf8')) as { tracks: { pantheon: string; file: string; title: string; author: string; page: string; license: string; durationSeconds: number }[] }).tracks;
    const catalog = loadCatalog();
    for (const p of catalog.pantheonOrder) {
      const entry = manifest.sounds.find((s) => s.id === MUSIC.map(p));
      expect(entry, p).toBeDefined();
      expect(entry!.files.length, p).toBeGreaterThanOrEqual(3);
      const mine = tracks.filter((t) => t.pantheon === p);
      expect(entry!.files).toEqual(mine.map((t) => t.file));
      for (const t of mine) {
        expect(t.title && t.author && t.page.startsWith('https://pixabay.com/music/'), t.file).toBeTruthy();
        expect(t.license).toMatch(/no attribution required/);
        expect(t.durationSeconds, t.file).toBeGreaterThanOrEqual(170);
      }
    }
  });

  it('has ambience for every mission soundscape', () => {
    const catalog = loadCatalog();
    const ids = new Set(manifest.sounds.map((s) => s.id));
    for (const m of Object.values(catalog.missions)) {
      expect(m.soundscape, m.id).toBeDefined();
      expect(SOUNDSCAPES as readonly string[]).toContain(m.soundscape);
      expect(ids.has(AMBIENCE.of(m.soundscape!))).toBe(true);
    }
  });

  it('rejects URLs, parent paths and wrong buses', () => {
    const bad: SoundManifest = {
      schema: 'pantheon-realms-sound-manifest',
      schemaVersion: 1,
      sounds: [
        { id: 'a', role: 'effect', bus: 'interface', files: ['https://cdn.example/x.ogg'], gain: 1, status: 'final', provenance: 'x' },
        { id: 'b', role: 'music', bus: 'combat', files: ['../x.ogg'], gain: 1, status: 'final', provenance: 'x' },
        { id: 'b', role: 'effect', bus: 'interface', files: [], gain: 0, status: 'final', provenance: '' },
      ],
    };
    const issues = validateSoundManifest(bad, ['missing.one']).join('\n');
    expect(issues).toMatch(/never a URL/);
    expect(issues).toMatch(/relative path/);
    expect(issues).toMatch(/music must use the music bus/);
    expect(issues).toMatch(/duplicate id/);
    expect(issues).toMatch(/no files/);
    expect(issues).toMatch(/missing required sound "missing.one"/);
  });
});

describe('mixing policy', () => {
  const effect: SoundDefinition = { id: 'x', role: 'effect', bus: 'combat', files: ['a.ogg'], gain: 1, status: 'placeholder', provenance: 'p', maxVoices: 3, cooldownMs: 50 };
  const strong: SoundDefinition = { ...effect, id: 'y', intensity: 'strong' };

  it('uses a perceptual slider curve and multiplies by master', () => {
    expect(sliderGain(0)).toBe(0);
    expect(sliderGain(100)).toBe(1);
    expect(sliderGain(50)).toBeCloseTo(0.25);
    expect(busGain(LEVELS, 'music')).toBeCloseTo(0.25);
    expect(busGain({ ...LEVELS, master: 50 }, 'ambience')).toBeCloseTo(0.25);
    expect(busGain(LEVELS, 'combat')).toBe(0);
  });

  it('mute silences every bus without changing the stored volumes', () => {
    const muted = { ...LEVELS, muted: true };
    for (const b of ['music', 'ambience', 'interface', 'combat', 'voice'] as const) expect(busGain(muted, b)).toBe(0);
    expect(muted.music).toBe(50);
  });

  it('"Calmer sound" softens strong sounds and allows one copy at a time', () => {
    expect(intensityGain(strong, true)).toBeLessThan(intensityGain(effect, true));
    expect(intensityGain(effect, false)).toBe(1);
    expect(voiceLimit(effect, false)).toBe(3);
    expect(voiceLimit(effect, true)).toBe(1);
  });

  it('enforces voice limits and cooldowns', () => {
    expect(mayStart(effect, 1000, undefined, 0, false)).toBe(true);
    expect(mayStart(effect, 1020, 1000, 1, false)).toBe(false); // cooldown
    expect(mayStart(effect, 1060, 1000, 1, false)).toBe(true);
    expect(mayStart(effect, 2000, 1000, 3, false)).toBe(false); // voice limit
    expect(mayStart(effect, 1080, 1000, 0, true)).toBe(false); // doubled cooldown when calmer
  });
});

// ---------------------------------------------------------------------------
// A minimal fake Web Audio graph, enough to check the director's behavior.
// ---------------------------------------------------------------------------

class FakeParam {
  value = 1;
  events: string[] = [];
  setTargetAtTime(v: number) {
    this.value = v;
  }
  setValueAtTime(v: number) {
    this.value = v;
  }
  linearRampToValueAtTime(v: number) {
    this.value = v;
  }
  cancelScheduledValues() {}
}
class FakeNode {
  gain = new FakeParam();
  threshold = new FakeParam();
  knee = new FakeParam();
  ratio = new FakeParam();
  attack = new FakeParam();
  release = new FakeParam();
  connect<T>(n: T): T {
    return n;
  }
  disconnect() {}
}
class FakeSource extends FakeNode {
  buffer: unknown = null;
  loop = false;
  detune = new FakeParam();
  onended: (() => void) | null = null;
  started = false;
  stopped = false;
  constructor(private readonly log: FakeSource[]) {
    super();
  }
  start() {
    this.started = true;
    this.log.push(this);
  }
  stop() {
    this.stopped = true;
  }
}
/** A streamed track: fires its listeners when the test says so. */
class FakeMedia {
  src = '';
  preload = '';
  duration = NaN;
  currentTime = 0;
  paused = true;
  playCalls = 0;
  refuse = false;
  private readonly listeners = new Map<string, (() => void)[]>();
  addEventListener(type: string, fn: () => void) {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), fn]);
  }
  emit(type: string) {
    for (const fn of this.listeners.get(type) ?? []) fn();
  }
  play() {
    this.playCalls++;
    if (this.refuse) return Promise.reject(new Error('NotAllowedError'));
    this.paused = false;
    return Promise.resolve();
  }
  pause() {
    this.paused = true;
  }
  removeAttribute(name: string) {
    if (name === 'src') this.src = '';
  }
  load() {}
}
class FakeContext {
  state: 'suspended' | 'running' | 'closed' = 'suspended';
  currentTime = 0;
  destination = new FakeNode();
  sources: FakeSource[] = [];
  createMediaElementSource() {
    return new FakeNode();
  }
  createGain() {
    return new FakeNode();
  }
  createDynamicsCompressor() {
    return new FakeNode();
  }
  createBufferSource() {
    return new FakeSource(this.sources);
  }
  async decodeAudioData(bytes: ArrayBuffer) {
    if (new Uint8Array(bytes)[0] === 0) throw new Error('cannot decode');
    return { duration: 1 } as unknown as AudioBuffer;
  }
  async resume() {
    this.state = 'running';
  }
  async close() {
    this.state = 'closed';
  }
}

const tick = () => new Promise((r) => setTimeout(r, 0));

function director(fail: string[] = []) {
  const ctx = new FakeContext();
  const d = new AudioDirector({
    manifest: loopManifest,
    resolveUrl: (f) => f,
    createContext: () => ctx as unknown as AudioContext,
    load: async (url) => (fail.some((f) => url.includes(f)) ? new Uint8Array([0]).buffer : new Uint8Array([1]).buffer),
  });
  d.setLevels(LEVELS);
  return { d, ctx };
}

describe('AudioDirector', () => {
  it('is silent, not broken, without Web Audio', () => {
    const d = new AudioDirector({ manifest, resolveUrl: (f) => f, createContext: () => null });
    expect(d.available).toBe(false);
    expect(d.play('ui.click')).toBe(false);
    d.setMusic('music.menu');
    expect(d.status().reason).toMatch(/no Web Audio/);
  });

  it('crossfades music: one track at a time, the old one stopped', async () => {
    const { d, ctx } = director();
    d.setMusic('music.menu');
    await tick();
    await tick();
    expect(d.status().music).toBe('music.menu');
    const first = ctx.sources.at(-1)!;
    expect(first.loop).toBe(true);
    d.setMusic('music.battle');
    expect(first.stopped).toBe(true);
    await tick();
    await tick();
    expect(d.status().music).toBe('music.battle');
    d.setMusic('music.battle'); // same track: no restart
    expect(ctx.sources.filter((s) => s.loop).length).toBe(2);
  });

  it('plays effects only once decoded, then respects the voice limit', async () => {
    const { d } = director();
    expect(d.play('combat.hit')).toBe(false); // first call loads
    d.warm(['combat.hit']);
    await tick();
    await tick();
    let started = 0;
    for (let i = 0; i < 6; i++) if (d.play('combat.hit')) started++;
    // Cooldown blocks immediate repeats of the same sound.
    expect(started).toBe(1);
    expect(d.status().recent.at(-1)).toBe('combat.hit');
  });

  it('reports files that fail to decode and stays silent for them', async () => {
    const { d } = director(['music_menu']);
    d.setMusic('music.menu');
    await tick();
    await tick();
    expect(d.status().music).toBeNull();
    expect(d.status().failed.some((f) => f.includes('music_menu'))).toBe(true);
  });

  it('resumes a suspended context on unlock and follows focus when asked', async () => {
    const { d, ctx } = director();
    expect(d.status().state).toBe('suspended');
    d.unlock();
    await tick();
    expect(ctx.state).toBe('running');
    d.setFocus(false, true);
    expect(d.status().focused).toBe(false);
    d.setFocus(false, false);
    expect(d.status().focused).toBe(true);
  });

  it('streams a music playlist track after track, crossfading near each end and wrapping around', async () => {
    const list: SoundDefinition = { id: 'music.map.test', role: 'music', bus: 'music', files: ['music/a.ogg', 'music/b.ogg', 'music/c.ogg'], gain: 0.8, playlist: true, status: 'final', provenance: 'test' };
    const ctx = new FakeContext();
    const media: FakeMedia[] = [];
    const d = new AudioDirector({
      manifest: { ...loopManifest, sounds: [...loopManifest.sounds, list] },
      resolveUrl: (f) => `/${f}`,
      createContext: () => ctx as unknown as AudioContext,
      createMediaElement: () => {
        const m = new FakeMedia();
        media.push(m);
        return m as unknown as HTMLMediaElement;
      },
      pickStart: () => 1,
      fadeMs: 1000,
    });
    d.setLevels(LEVELS);
    d.setMusic('music.map.test');
    // Streamed, not decoded: no buffer source, one media element on the chosen first track.
    expect(ctx.sources.length).toBe(0);
    expect(media.length).toBe(1);
    expect(media[0]!.src).toBe('/music/b.ogg');
    expect(d.status()).toMatchObject({ music: 'music.map.test', musicFile: 'music/b.ogg' });
    // Mid-track: nothing happens.
    media[0]!.duration = 200;
    media[0]!.currentTime = 100;
    media[0]!.emit('timeupdate');
    expect(media.length).toBe(1);
    // Within the fade of the end: the next track starts (crossfade) — once.
    media[0]!.currentTime = 199.5;
    media[0]!.emit('timeupdate');
    media[0]!.emit('ended');
    expect(media.length).toBe(2);
    expect(media[1]!.src).toBe('/music/c.ogg');
    expect(d.status().musicFile).toBe('music/c.ogg');
    // The last track wraps to the first.
    media[1]!.emit('ended');
    expect(media[2]!.src).toBe('/music/a.ogg');
    // The same music again is not restarted.
    d.setMusic('music.map.test');
    expect(media.length).toBe(3);
    // Another scene: the playlist stops advancing.
    d.setMusic('music.battle');
    media[2]!.emit('ended');
    expect(media.length).toBe(3);
    await tick();
  });

  it('skips a playlist track that fails, goes silent when every track fails, and retries a refused start on unlock', async () => {
    const list: SoundDefinition = { id: 'music.map.test', role: 'music', bus: 'music', files: ['music/a.ogg', 'music/b.ogg'], gain: 1, playlist: true, status: 'final', provenance: 'test' };
    const ctx = new FakeContext();
    const media: FakeMedia[] = [];
    const d = new AudioDirector({
      manifest: { ...manifest, sounds: [...manifest.sounds, list] },
      resolveUrl: (f) => f,
      createContext: () => ctx as unknown as AudioContext,
      createMediaElement: () => {
        const m = new FakeMedia();
        m.refuse = media.length === 0;
        media.push(m);
        return m as unknown as HTMLMediaElement;
      },
      pickStart: () => 0,
    });
    d.setLevels(LEVELS);
    d.setMusic('music.map.test');
    await tick();
    // Refused before any interaction: played again on unlock.
    expect(media[0]!.playCalls).toBe(1);
    media[0]!.refuse = false;
    d.unlock();
    await tick();
    expect(media[0]!.playCalls).toBe(2);
    // A broken file is reported and skipped …
    media[0]!.emit('error');
    expect(d.status().failed).toContain('music/a.ogg');
    expect(d.status().musicFile).toBe('music/b.ogg');
    // … and when the other one fails too, the music goes silent instead of looping on errors.
    media[1]!.emit('error');
    expect(d.status().music).toBeNull();
    expect(media.length).toBe(2);
  });

  it('only music may be a playlist; the next index wraps', () => {
    const bad: SoundManifest = { ...manifest, sounds: [{ id: 'amb.x', role: 'ambience', bus: 'ambience', files: ['a.ogg'], gain: 1, playlist: true, status: 'placeholder', provenance: 'x' }] };
    expect(validateSoundManifest(bad)).toContain('amb.x: only music can be a playlist');
    expect(nextPlaylistIndex(3, 0)).toBe(1);
    expect(nextPlaylistIndex(3, 2)).toBe(0);
    expect(nextPlaylistIndex(1, 0)).toBe(0);
  });

  it('bus gains follow the levels and mute', () => {
    const { d } = director();
    expect(d.status().busGains.music).toBeCloseTo(0.25);
    d.setLevels({ ...LEVELS, muted: true });
    expect(Object.values(d.status().busGains).every((g) => g === 0)).toBe(true);
  });
});
