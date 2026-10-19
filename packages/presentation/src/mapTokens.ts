/**
 * Map tokens of the expedition kit (2026-10-17) — presentation only, no PixiJS import (part of
 * `@pr/presentation/core`).
 *
 * The kit paints one neutral ship hull and one caravan wagon in three facings (E, NE, SE) and a
 * ship wreck; W, NW and SW are the same pictures mirrored horizontally (never a rotated flat
 * picture: that would tilt the mast). The interface merges them into the sprite manifest's
 * `mapTokens` section from `assets-runtime/expedition-v1/manifest.json` (written by
 * `npm run expedition:import`); the views find them here by token ID and heading:
 *
 *   const t = mapTokenPicture('ship', tokenHeading(dx, dy)); // dx, dy: projected screen travel
 *   sprite.texture = await loadTexture(t.url); sprite.scale.x = t.flipX ? -s : s;
 *   const s = mapTokenScale(t.picture, HEX_W, t.def.displayHexWidths); // visible hull ≈ 1.2 hexes
 *   anchor = t.picture.groundAnchor (mirrored x when flipped: `mirroredAnchor`)
 *
 * The owner flag is a separate overlay (`flag.mount`, x → 1 − x when mirrored, tinted with the
 * player's colour — never the hull). Motion (`motion`) is presentation displacement only; reduced
 * motion disables bob, roll and wake. Nothing here reads or changes a rule.
 */
import type { MapDirection } from './hexmath';
import { spriteManifest, spriteUrl } from './sprites';

/** The painted facings. */
export type MapTokenFacing = 'e' | 'ne' | 'se';
/** The six hex headings: painted E/NE/SE plus their mirrors. */
export type MapTokenHeading = 'e' | 'ne' | 'se' | 'w' | 'nw' | 'sw';
export const MAP_TOKEN_HEADINGS: readonly MapTokenHeading[] = ['e', 'ne', 'se', 'w', 'nw', 'sw'];

/** Token IDs in the manifest's `mapTokens` section. */
export const MAP_TOKEN_IDS = ['ship', 'wagon', 'ship-wreck'] as const;
export type MapTokenId = (typeof MAP_TOKEN_IDS)[number];

/** One native picture of a token (its transparent margin is not its footprint: size by `visibleBounds`). */
export interface MapTokenPicture {
  /** The kit asset ID (`expedition.ship-e`, …), also resolvable by the interface's asset manifest. */
  readonly assetId: string;
  /** Runtime path relative to the application root (`expedition-v1/ship-e.png`). */
  readonly file: string;
  readonly width: number;
  readonly height: number;
  /** Painted pixels as fractions [left, top, right, bottom]. */
  readonly visibleBounds: readonly [number, number, number, number];
  /** Ground contact point as fractions [x, y] of the picture (unmirrored). */
  readonly groundAnchor: readonly [number, number];
}

export interface MapTokenFlag {
  /** Flag mast point as fractions of the unmirrored picture. */
  readonly mount: readonly [number, number];
  /** Where the flag colour comes from (the player's colour, the same source as the land banner). */
  readonly ownerColor: string;
  readonly mirror: string;
  readonly emptyShip: string;
  /** The flag shape overlay's asset ID (`expedition.overlay.flag-template`). */
  readonly shapeAssetId?: string;
}

export interface MapTokenDefinition {
  readonly status: 'final' | 'placeholder';
  readonly provenance: string;
  /** Suggested drawn width of the visible part, in hex widths. */
  readonly displayHexWidths: number;
  /** Directional tokens: the painted facings … */
  readonly facings?: Readonly<Partial<Record<MapTokenFacing, MapTokenPicture>>>;
  /** … and which facing (and mirror) draws each heading. */
  readonly directions?: Readonly<Partial<Record<MapTokenHeading, { readonly facing: MapTokenFacing; readonly flipX: boolean }>>>;
  /** Still tokens (the wreck): one picture, mirrored with the token it replaces. */
  readonly still?: MapTokenPicture;
  readonly flag?: MapTokenFlag;
  /** The wake overlay's asset ID (ships). */
  readonly wakeAssetId?: string;
  /** The token that replaces this one after a defeat (`ship-wreck`). */
  readonly wreck?: string;
  /** The kit's motion parameters by state (durations, bob, roll, wake opacity); presentation only. */
  readonly motion?: Readonly<Record<string, unknown>>;
  readonly reducedMotion?: string;
}

/** A token's definition from the registered sprite manifest (null until the kit is imported). */
export function mapTokenDefinition(id: MapTokenId | string): MapTokenDefinition | null {
  return spriteManifest().mapTokens?.[id] ?? null;
}

/**
 * The heading of a projected screen travel vector (+y down), as the kit's runtime reference
 * (`runtime/ship-motion.js`): beyond ±90° the picture is mirrored; within ±15° of the horizontal
 * the E picture, above it NE, below it SE. Pure north or south falls on the NE / SE side.
 */
export function tokenHeading(dx: number, dy: number, previous: MapTokenHeading = 'e'): MapTokenHeading {
  if (dx === 0 && dy === 0) return previous;
  const a = (Math.atan2(dy, dx) * 180) / Math.PI;
  const west = Math.abs(a) > 90;
  const local = west ? (a >= 0 ? 180 - a : -180 - a) : a;
  const f: MapTokenFacing = local < -15 ? 'ne' : local > 15 ? 'se' : 'e';
  if (!west) return f;
  return f === 'e' ? 'w' : f === 'ne' ? 'nw' : 'sw';
}

/** The heading for an eight-way map direction (`hexmath.directionOf`); N and S keep the side they face. */
export function headingFromMapDirection(d: MapDirection, previous: MapTokenHeading = 'e'): MapTokenHeading {
  const westward = previous === 'w' || previous === 'nw' || previous === 'sw';
  switch (d) {
    case 'n':
      return westward ? 'nw' : 'ne';
    case 's':
      return westward ? 'sw' : 'se';
    default:
      return d;
  }
}

export interface ResolvedMapToken {
  readonly id: string;
  readonly def: MapTokenDefinition;
  readonly picture: MapTokenPicture;
  /** Draw mirrored horizontally (around the ground anchor's mirrored x). */
  readonly flipX: boolean;
  /** Runtime URL of the picture. */
  readonly url: string;
}

/** The picture (and mirror) that draws a token at a heading; null when the token is not registered. */
export function mapTokenPicture(id: MapTokenId | string, heading: MapTokenHeading = 'e'): ResolvedMapToken | null {
  const def = mapTokenDefinition(id);
  if (!def) return null;
  const flipped = heading === 'w' || heading === 'nw' || heading === 'sw';
  if (def.still) return { id, def, picture: def.still, flipX: flipped, url: spriteUrl(def.still.file) };
  const dir = def.directions?.[heading];
  const picture = dir ? def.facings?.[dir.facing] : undefined;
  if (!dir || !picture) return null;
  return { id, def, picture, flipX: dir.flipX, url: spriteUrl(picture.file) };
}

/** Drawn pixels per source pixel so the picture's visible width spans `hexWidths` hexes of `hexWidthPx`. */
export function mapTokenScale(picture: MapTokenPicture, hexWidthPx: number, hexWidths: number): number {
  const visible = (picture.visibleBounds[2] - picture.visibleBounds[0]) * picture.width;
  return visible > 0 ? (hexWidthPx * hexWidths) / visible : 0;
}

/** The ground anchor as drawn (x mirrored when the picture is flipped). */
export function mirroredAnchor(picture: MapTokenPicture, flipX: boolean): readonly [number, number] {
  return flipX ? [1 - picture.groundAnchor[0], picture.groundAnchor[1]] : picture.groundAnchor;
}

/** The flag's mast point as drawn (x → 1 − x when the hull is mirrored; the flag itself is never mirrored). */
export function flagMount(def: MapTokenDefinition, flipX: boolean): readonly [number, number] | null {
  const m = def.flag?.mount;
  if (!m) return null;
  return flipX ? [1 - m[0], m[1]] : m;
}
