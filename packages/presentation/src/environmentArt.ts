/**
 * Ground and sky art lookup (ASSET_PIPELINE.md §13, Brief 2) — presentation only,
 * no PixiJS import (part of `@pr/presentation/core`).
 *
 * The interface registers a resolver from its own asset manifest at start-up
 * (`registerEnvironmentArt`); the 2D views ask it for terrain textures by
 * climate and ground type, battlefield paintings by archetype (and climate, for
 * later variants) and sky panoramas by climate. When nothing is registered or a
 * file is missing, the views keep their procedural colours.
 */
import type { Terrain } from '@pr/rules';

export interface EnvironmentArt {
  readonly url: string;
  readonly width: number;
  readonly height: number;
  /** Terrain and sky: 'repeat' once the seams are verified, else 'mirror' (no hard seam lines). */
  readonly wrap?: 'repeat' | 'mirror';
  /** Average colour (#RRGGBB): terrain overall; sky above the horizon; battlefield overall. */
  readonly average?: string;
  /** Battlefield: average colour of the far (top) margin, used for the ground beyond the painting. */
  readonly edge?: string;
  /** Sky: colour just below the horizon (distant haze). */
  readonly haze?: string;
  /** Sky: horizon line as a fraction of the image height from the top (brief: about 0.62). */
  readonly horizon?: number;
}

type Resolver = (assetId: string) => EnvironmentArt | null;

let resolver: Resolver = () => null;

/** Set by the interface from its asset manifest (asset ID → runtime file and facts). */
export function registerEnvironmentArt(fn: Resolver): void {
  resolver = fn;
}

/** Ground texture of one terrain type in one climate (`terrain.<climate>.<ground>`). */
export function terrainArt(climate: string, terrain: Terrain): EnvironmentArt | null {
  return resolver(`terrain.${climate}.${terrain}`);
}

/**
 * Battlefield painting: the climate variant when one exists
 * (`battlefield.<archetype>.ground.<climate>`), else the default (temperate)
 * painting used in every climate (`battlefield.<archetype>.ground`).
 */
export function battlefieldArt(archetype: string, climate?: string | null): EnvironmentArt | null {
  return (climate ? resolver(`battlefield.${archetype}.ground.${climate}`) : null) ?? resolver(`battlefield.${archetype}.ground`);
}

/** Sky panorama of a climate (`sky.<climate>`), temperate when that climate has none. */
export function skyArt(climate: string): EnvironmentArt | null {
  return resolver(`sky.${climate}`) ?? resolver('sky.temperate');
}

/** Hex radii covered by one ground texture: about two map tiles across (Brief 2, §5.0). */
export const TERRAIN_TEXTURE_WORLD = 2 * Math.sqrt(3);

/**
 * Where the battle board sits in a battlefield painting (Brief 2, §6.0, in
 * 4096 × 3200 coordinates): the quiet centre is about 1500 × 1000 px around the
 * image centre. The board (15 × 11 hexes) is fitted inside it.
 */
export const BATTLEFIELD_LAYOUT = { width: 4096, height: 3200, centreWidth: 1500, centreHeight: 1000 } as const;
