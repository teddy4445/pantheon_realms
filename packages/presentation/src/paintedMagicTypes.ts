import type { EffectDefinition } from './sprites';
import type { FxSchool } from './fxLooks';

export type MagicParticle = 'metal' | 'electric' | 'splash' | 'stone' | 'frost' | 'feather' | 'snow' | 'sand' | 'glass' | 'venom' | 'ember' | 'paper' | 'star' | 'leaf' | 'wisp' | 'wood' | 'lava' | 'gravity';
export interface PaintedMagicRecipe {
  readonly icon: string;
  readonly particle: MagicParticle;
  readonly school: FxSchool;
  readonly durationMs: number;
  readonly size: number;
  readonly miracle: boolean;
  readonly name: string;
  readonly pantheon: string;
  readonly tier: number;
  readonly sequence: string;
  readonly strip: EffectDefinition;
}

/** Authored pose pacing: read the anticipation, snap the strike, let debris settle. */
export const MAGIC_POSE_WEIGHTS = [.13, .15, .08, .12, .16, .13, .12, .11] as const;
export function magicPoseAt(t: number): { frame: number; next: number; mix: number } {
  let start = 0;
  for (let i = 0; i < MAGIC_POSE_WEIGHTS.length; i++) {
    const duration = MAGIC_POSE_WEIGHTS[i]!;
    if (t < start + duration || i === 7) {
      const local = Math.max(0, Math.min(1, (t - start) / duration));
      // Very short dissolves smooth pose changes without a persistent double image.
      return { frame: i, next: Math.min(7, i + 1), mix: i === 7 ? 0 : Math.max(0, (local - .78) / .22) };
    }
    start += duration;
  }
  return { frame: 7, next: 7, mix: 0 };
}
