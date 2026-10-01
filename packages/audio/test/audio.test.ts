import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { AudioDirector, busGain, intensityGain, mayStart, sliderGain, validateSoundManifest, voiceLimit, type AudioLevels, type SoundDefinition, type SoundManifest } from '../src';
import { REQUIRED_SOUND_IDS, SOUNDSCAPES, MUSIC, AMBIENCE } from '../../ui/src/audio/sounds';
import { loadCatalog } from '@pr/content';

const root = path.resolve(__dirname, '../../..');
const manifest = JSON.parse(readFileSync(path.join(root, 'assets-runtime/audio/manifest.json'), 'utf8')) as SoundManifest;

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

  it('marks every file as a placeholder with provenance (none is presented as final)', () => {
    for (const s of manifest.sounds) {
      expect(s.status).toBe('placeholder');
      expect(s.provenance).toMatch(/placeholder/i);
    }
  });

  it('has music and ambience for every mission soundscape', () => {
    const catalog = loadCatalog();
    const ids = new Set(manifest.sounds.map((s) => s.id));
    for (const m of Object.values(catalog.missions)) {
      expect(m.soundscape, m.id).toBeDefined();
      expect(SOUNDSCAPES as readonly string[]).toContain(m.soundscape);
      expect(ids.has(MUSIC.explore(m.soundscape!))).toBe(true);
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
class FakeContext {
  state: 'suspended' | 'running' | 'closed' = 'suspended';
  currentTime = 0;
  destination = new FakeNode();
  sources: FakeSource[] = [];
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
    manifest,
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

  it('bus gains follow the levels and mute', () => {
    const { d } = director();
    expect(d.status().busGains.music).toBeCloseTo(0.25);
    d.setLevels({ ...LEVELS, muted: true });
    expect(Object.values(d.status().busGains).every((g) => g === 0)).toBe(true);
  });
});
