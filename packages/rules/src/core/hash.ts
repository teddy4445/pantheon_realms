/**
 * Canonical serialization and hashing of plain data.
 *
 * Owns: stable JSON (sorted object keys) and a 64-bit style hex digest built
 * from two FNV-1a passes. Used for map hashes, save checksums and
 * determinism assertions (normal vs instant playback must match).
 * Does not own: what is included in a hash; callers exclude cosmetic data.
 */
import { fnv1a32 } from './rng';

export function canonicalJson(value: unknown): string {
  return JSON.stringify(sortKeys(value));
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      const v = (value as Record<string, unknown>)[key];
      if (v !== undefined) out[key] = sortKeys(v);
    }
    return out;
  }
  if (typeof value === 'number' && !Number.isFinite(value)) {
    throw new Error('canonicalJson: non-finite numbers are not serializable');
  }
  return value;
}

export function hashString(text: string): string {
  const a = fnv1a32(text).toString(16).padStart(8, '0');
  const b = fnv1a32(text, 0x811c9dc5 ^ 0x5bd1e995).toString(16).padStart(8, '0');
  return `${a}${b}`;
}

export function hashValue(value: unknown): string {
  return hashString(canonicalJson(value));
}

/**
 * Canonical game-state hash for determinism checks: excludes transport identity
 * (processed command IDs), which differs between a live session and a replay.
 */
export function canonicalStateHash(state: { processedCommandIds?: unknown }): string {
  const { processedCommandIds: _ignored, ...rest } = state as Record<string, unknown>;
  void _ignored;
  return hashValue(rest);
}
