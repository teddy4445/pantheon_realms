/**
 * Deterministic random number generation.
 *
 * Owns: the documented FNV-1a stream derivation and xorshift32 generator
 * (campaign/02 §5), plus unbiased bounded draws.
 * Does not own: which stream a system uses. Gameplay streams are stored in
 * MatchState.rng; cosmetic randomness must use a separate stream that is never saved.
 *
 * Never use Math.random(), wall-clock time or frame counts for gameplay.
 */

const FNV_OFFSET = 2166136261;
const FNV_PRIME = 16777619;
const ZERO_SUBSTITUTE = 0x6d2b79f5;
const UINT32_MAX_NONZERO_DOMAIN = 0xffffffff; // M = 2^32 - 1 possible nonzero outputs

/** UTF-8 encode without relying on DOM/Node globals. */
export function utf8Bytes(text: string): number[] {
  const out: number[] = [];
  for (let i = 0; i < text.length; i++) {
    let code = text.charCodeAt(i);
    if (code >= 0xd800 && code <= 0xdbff && i + 1 < text.length) {
      const next = text.charCodeAt(i + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        code = 0x10000 + ((code - 0xd800) << 10) + (next - 0xdc00);
        i++;
      }
    }
    if (code < 0x80) out.push(code);
    else if (code < 0x800) out.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    else if (code < 0x10000) out.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
    else
      out.push(
        0xf0 | (code >> 18),
        0x80 | ((code >> 12) & 0x3f),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f),
      );
  }
  return out;
}

/** FNV-1a 32-bit over UTF-8 bytes. Identifier/seed mechanism, not a security hash. */
export function fnv1a32(text: string, offset: number = FNV_OFFSET): number {
  let h = offset >>> 0;
  for (const byte of utf8Bytes(text)) {
    h ^= byte;
    h = Math.imul(h, FNV_PRIME) >>> 0;
  }
  return h >>> 0;
}

/** Seed state from a stream label; zero is replaced as documented. */
export function seedFromLabel(label: string): number {
  const s = fnv1a32(label);
  return s === 0 ? ZERO_SUBSTITUTE : s;
}

/** One xorshift32 step (shifts 13, 17, 5). Returns the new state (also the output). */
export function xorshift32(state: number): number {
  let x = state >>> 0;
  if (x === 0) x = ZERO_SUBSTITUTE;
  x ^= x << 13;
  x >>>= 0;
  x ^= x >>> 17;
  x ^= x << 5;
  return x >>> 0;
}

/**
 * Mutable cursor over a saved RNG state. Systems copy the state in, draw, and write
 * `state` back into MatchState in the same transaction.
 */
export class RngCursor {
  constructor(public state: number) {
    if (this.state === 0) this.state = ZERO_SUBSTITUTE;
  }

  nextUint32(): number {
    this.state = xorshift32(this.state);
    return this.state;
  }

  /** Unbiased integer in [0, n). */
  nextInt(n: number): number {
    if (!Number.isInteger(n) || n < 1 || n > UINT32_MAX_NONZERO_DOMAIN) {
      throw new Error(`invalid RNG bound ${n}`);
    }
    if (n === 1) return 0; // still a legal draw; callers decide whether to draw at all
    const limit = UINT32_MAX_NONZERO_DOMAIN - (UINT32_MAX_NONZERO_DOMAIN % n);
    for (;;) {
      const sample = this.nextUint32() - 1; // 0 .. 2^32-2
      if (sample < limit) return sample % n;
    }
  }

  /** Uniform integer in [min, max] inclusive. */
  nextRange(min: number, max: number): number {
    if (max < min) throw new Error('invalid RNG range');
    if (max === min) return min;
    return min + this.nextInt(max - min + 1);
  }

  /** True with probability numerator/denominator. */
  chance(numerator: number, denominator: number): boolean {
    if (numerator <= 0) return false;
    if (numerator >= denominator) return true;
    return this.nextInt(denominator) < numerator;
  }
}

/** Separate, never-saved cosmetic generator for presentation (idle offsets, decor wobble). */
export function cosmeticRng(label: string): RngCursor {
  return new RngCursor(seedFromLabel(`cosmetic|${label}`));
}
