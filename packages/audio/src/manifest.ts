/**
 * Sound manifest: stable sound IDs -> runtime files, with the bus each sound is
 * mixed on and how it may be played. The game refers to sound IDs only, so a
 * final recording replaces a placeholder by changing the manifest entry (or by
 * dropping a new file at the same path) — no code changes.
 *
 * Pure and DOM-free: validated by unit tests and by the placeholder generator.
 */

/** Mixing buses (production/04 §7: music, ambience, interface, combat, optional voices). */
export const BUSES = ['music', 'ambience', 'interface', 'combat', 'voice'] as const;
export type BusId = (typeof BUSES)[number];

/** How a sound is used; decides looping and crossfade handling. */
export type SoundRole = 'music' | 'ambience' | 'stinger' | 'effect' | 'loop';

export interface SoundDefinition {
  readonly id: string;
  readonly role: SoundRole;
  readonly bus: BusId;
  /** One or more files (relative to the app base); several = variants picked at random. */
  readonly files: readonly string[];
  /** Linear gain applied to this sound (1 = as authored). */
  readonly gain: number;
  /** Loud or sudden sounds (thunder, crashes) are softened by "Calmer sound". */
  readonly intensity?: 'normal' | 'strong';
  /** Most copies of this sound allowed at once (default 2). */
  readonly maxVoices?: number;
  /** Minimum milliseconds between two starts of this sound (default 60). */
  readonly cooldownMs?: number;
  /** Random pitch variation in cents (±), for repeated effects. */
  readonly pitchJitterCents?: number;
  readonly status: 'placeholder' | 'final';
  readonly provenance: string;
}

export interface SoundManifest {
  readonly schema: 'pantheon-realms-sound-manifest';
  readonly schemaVersion: 1;
  readonly note?: string;
  readonly sounds: readonly SoundDefinition[];
}

const LOOPING: ReadonlySet<SoundRole> = new Set(['music', 'ambience', 'loop']);

export function isLooping(def: SoundDefinition): boolean {
  return LOOPING.has(def.role);
}

/** Structural checks; returns human-readable problems (empty = valid). */
export function validateSoundManifest(m: SoundManifest, required: readonly string[] = []): string[] {
  const issues: string[] = [];
  if (m.schema !== 'pantheon-realms-sound-manifest') issues.push('manifest: wrong schema name');
  if (m.schemaVersion !== 1) issues.push('manifest: unsupported schemaVersion');
  const seen = new Set<string>();
  for (const s of m.sounds) {
    if (seen.has(s.id)) issues.push(`${s.id}: duplicate id`);
    seen.add(s.id);
    if (!BUSES.includes(s.bus)) issues.push(`${s.id}: unknown bus "${s.bus}"`);
    if (s.files.length === 0) issues.push(`${s.id}: no files`);
    for (const f of s.files) {
      if (!/^[a-z0-9_./-]+\.(ogg|mp3|wav|m4a|webm)$/i.test(f) || f.includes('..') || f.startsWith('/')) issues.push(`${s.id}: file "${f}" must be a relative path to an audio file`);
      if (/^[a-z]+:/i.test(f)) issues.push(`${s.id}: file "${f}" must be bundled, never a URL`);
    }
    if (!(s.gain > 0 && s.gain <= 4)) issues.push(`${s.id}: gain must be in (0, 4]`);
    if (s.role === 'music' && s.bus !== 'music') issues.push(`${s.id}: music must use the music bus`);
    if (s.role === 'stinger' && s.bus !== 'music') issues.push(`${s.id}: stingers use the music bus`);
    if (s.role === 'ambience' && s.bus !== 'ambience') issues.push(`${s.id}: ambience must use the ambience bus`);
    if (s.maxVoices !== undefined && !(Number.isInteger(s.maxVoices) && s.maxVoices >= 1)) issues.push(`${s.id}: maxVoices must be a positive integer`);
    if (s.cooldownMs !== undefined && !(s.cooldownMs >= 0)) issues.push(`${s.id}: cooldownMs must be ≥ 0`);
    if (!s.provenance) issues.push(`${s.id}: provenance is required`);
  }
  for (const id of required) if (!seen.has(id)) issues.push(`missing required sound "${id}"`);
  return issues;
}

// ---------------------------------------------------------------------------
// Mixing policy (pure; unit-tested)
// ---------------------------------------------------------------------------

/** Settings-side levels, each 0..100, plus the switches that affect mixing. */
export interface AudioLevels {
  readonly master: number;
  readonly music: number;
  readonly ambience: number;
  readonly interface: number;
  readonly combat: number;
  readonly voice: number;
  /** Mute everything without forgetting the volumes. */
  readonly muted: boolean;
  /** "Calmer sound": softer strong sounds, fewer overlapping copies. */
  readonly reduced: boolean;
}

export const SILENT_LEVELS: AudioLevels = { master: 0, music: 0, ambience: 0, interface: 0, combat: 0, voice: 0, muted: true, reduced: false };

/** Perceptual slider curve: 0..100 -> linear gain 0..1 (50% ≈ −12 dB). */
export function sliderGain(v: number): number {
  const x = Math.min(100, Math.max(0, v)) / 100;
  return x * x;
}

/** Gain of one bus after master and mute. */
export function busGain(levels: AudioLevels, bus: BusId): number {
  if (levels.muted) return 0;
  return sliderGain(levels.master) * sliderGain(levels[bus]);
}

/** Per-sound gain multiplier from the "Calmer sound" option. */
export function intensityGain(def: SoundDefinition, reduced: boolean): number {
  if (!reduced) return 1;
  if (def.intensity === 'strong') return 0.35;
  if (def.bus === 'combat' || def.role === 'stinger') return 0.7;
  return 1;
}

/** Copies allowed at once, after "Calmer sound". */
export function voiceLimit(def: SoundDefinition, reduced: boolean): number {
  const base = def.maxVoices ?? 2;
  return reduced ? 1 : base;
}

/** Whether a new start is allowed given the time of the last start and the live copies. */
export function mayStart(def: SoundDefinition, nowMs: number, lastStartMs: number | undefined, live: number, reduced: boolean): boolean {
  if (live >= voiceLimit(def, reduced)) return false;
  const cool = (def.cooldownMs ?? 60) * (reduced ? 2 : 1);
  return lastStartMs === undefined || nowMs - lastStartMs >= cool;
}
