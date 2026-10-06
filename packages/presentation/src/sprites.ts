/**
 * 2D sprite manifest model, lookup and animation vocabulary (presentation
 * only; no PixiJS import, part of `@pr/presentation/core`).
 *
 * Every rendered entity is found by a stable ID in the sprite manifest
 * (`assets-runtime/sprites/manifest.json`, written by the placeholder generator
 * and by `npm run sprites:import`); no component hard-codes a file path. A
 * sprite set carries its status (placeholder or final), provenance, the pixels
 * that make one hex in its frames (its drawn size), and one strip per semantic
 * animation with frame timing and an explicit anchor:
 *
 *   battle creatures: horizontal centre + bottom at the feet / contact point;
 *   mounted map heroes: horizontal centre + ground point between the mount's feet.
 *
 * Sprites face right; the defending side and westward map movement mirror
 * them. A missing optional animation falls back along a fixed chain (e.g.
 * shoot → attack → idle) and the view adds a little motion of its own; the
 * rules never wait for, read or depend on any animation.
 */
import type { CreatureDefinition, ContentCatalog } from '@pr/rules';
import type { MapDirection } from './hexmath';

/** Battle and bestiary animation names (directive §9). */
export const CREATURE_ANIMATIONS = ['idle', 'move', 'attack', 'shoot', 'defend', 'hit', 'death', 'victory', 'takeoff', 'fly', 'landing', 'cast', 'ability'] as const;
export type CreatureAnimation = (typeof CREATURE_ANIMATIONS)[number];

/** Every ordinary creature needs these. */
export const BASE_ANIMATIONS: readonly CreatureAnimation[] = ['idle', 'move', 'attack', 'defend', 'hit', 'death', 'victory'];

/** Map location kinds as drawn on the adventure map (`SiteDefinition` kinds; sprite IDs `map.site.<kind>[.<variant>]`). */
export const SITE_ARCHETYPES = [
  'town', 'sawmill', 'quarry', 'gold_mine', 'crystal_deposit', 'pickup', 'watchtower', 'crossing_bridge', 'crossing_pass',
  'nest', 'refuge', 'quarry_cache', 'grove', 'beacon', 'relay', 'gate', 'camp', 'event_site', 'relic', 'portal',
  'learning_stone', 'spell_shrine', 'skill_trainer', 'quest_hut', 'key_tent', 'key_gate', 'windmill', 'treasure_chest', 'prison',
] as const;
export type SiteArchetype = (typeof SITE_ARCHETYPES)[number];

/** Map-avatar animation names (directive §16 D: 8 directions, idle and walk). */
export const HERO_MAP_ANIMATIONS = ['idle', 'walk'] as const;

export type SpriteStatus = 'final' | 'placeholder';

/** One horizontal strip of equally sized frames. */
export interface SpriteStrip {
  /** Runtime path relative to the application root (e.g. `sprites/creatures/hoplite/idle.webp`). */
  readonly file: string;
  readonly frames: number;
  readonly frameWidth: number;
  readonly frameHeight: number;
  /** Frames per second at normal speed. */
  readonly fps: number;
  readonly loop: boolean;
  /** Anchor inside a frame as fractions of its width and height. */
  readonly anchor: readonly [number, number];
  /** This strip's own scale when it differs from its set's (a delivered strip in a set still partly placeholder). */
  readonly pixelsPerHex?: number;
  /** This strip is tinted with the owner's colour (silhouette placeholders). */
  readonly tint?: 'accent';
  /** Delivered final art (set by `npm run sprites:import`); absent = the set's status. */
  readonly status?: SpriteStatus;
}

export interface SpriteAnimationDefinition extends SpriteStrip {
  /** Map avatars: one strip per direction; absent = this strip faces right (mirrored for the west). */
  readonly directions?: Partial<Record<MapDirection, SpriteStrip>>;
}

export interface SpriteSetDefinition {
  readonly status: SpriteStatus;
  readonly provenance: string;
  /** All strips face right. */
  readonly facing: 'right';
  /** Source pixels that span one hex width at the board's scale (sets the drawn size). */
  readonly pixelsPerHex: number;
  /** Silhouette placeholders are tinted with the owner's colour. */
  readonly tint?: 'accent';
  readonly animations: Readonly<Partial<Record<string, SpriteAnimationDefinition>>>;
}

/** A single still image (map sites, decoration, obstacles, siege pieces, projectiles). */
export interface StaticSpriteDefinition {
  readonly file: string;
  readonly width: number;
  readonly height: number;
  readonly anchor: readonly [number, number];
  readonly pixelsPerHex: number;
  readonly status: SpriteStatus;
  readonly provenance: string;
  readonly tint?: 'accent' | 'key';
}

/** A one-shot effect strip (impacts, spell bursts). */
export interface EffectDefinition extends SpriteStrip {
  readonly pixelsPerHex: number;
  readonly status: SpriteStatus;
  readonly provenance: string;
  /** Additive blending (glows). */
  readonly additive?: boolean;
}

export interface HeroSpriteDefinition extends SpriteSetDefinition {
  /** Large still for the hero screen (same design as the map avatar). */
  readonly figure?: { readonly file: string; readonly width: number; readonly height: number; readonly status: SpriteStatus };
}

export interface SpriteManifest {
  readonly schema: 'pantheon-realms-sprites-1';
  readonly notice?: string;
  readonly creatures: Readonly<Record<string, SpriteSetDefinition>>;
  readonly heroes: Readonly<Record<string, HeroSpriteDefinition>>;
  readonly sites: Readonly<Record<string, StaticSpriteDefinition>>;
  readonly decor: Readonly<Record<string, StaticSpriteDefinition>>;
  readonly obstacles: Readonly<Record<string, StaticSpriteDefinition>>;
  readonly siege: Readonly<Record<string, StaticSpriteDefinition>>;
  readonly projectiles: Readonly<Record<string, StaticSpriteDefinition>>;
  readonly effects: Readonly<Record<string, EffectDefinition>>;
  /** Painted road sheets (GPT-6 Brief 16), keyed `<road type>.<a|b|c>`; written by `npm run roads:import`. */
  readonly roads?: Readonly<Record<string, RoadSheetDefinition>>;
  /** Painted ground transitions (GPT-6 Brief 17): traced edge masks and the shore foam atlas; written by `npm run ground:import`. */
  readonly ground?: {
    readonly edges?: GroundEdgesDefinition;
    readonly foam?: GroundFoamDefinition;
  };
}

/** The traced ground-transition masks (`edges.json`), one per ground character. */
export interface GroundEdgesDefinition {
  readonly file: string;
  readonly status: 'final' | 'placeholder';
  readonly characters: readonly string[];
  readonly provenance: string;
}

/** The shore foam atlas: the shore mask sheet's layout, transparent. */
export interface GroundFoamDefinition {
  readonly file: string;
  readonly status: 'final' | 'placeholder';
  readonly width: number;
  readonly height: number;
  readonly cell: number;
  readonly cols: number;
  readonly rows: number;
  readonly hexWidth: number;
  readonly provenance: string;
}

/**
 * Contents of `edges.json`: per character, six edges (e, se, sw, w, nw, ne), each a list of
 * variants, each a list of outlines `[level index, flat x,y points in hex widths around the hex centre]`.
 */
export interface GroundEdgesData {
  readonly schema: 'pantheon-realms-ground-edges-1';
  readonly hexWidth: number;
  readonly levels: readonly { readonly level: number; readonly alpha: number }[];
  readonly priority: readonly string[];
  readonly characters: Readonly<Record<string, readonly (readonly (readonly (readonly [number, readonly number[]])[])[])[]>>;
}

/** One road sheet: `cols` × `rows` cells of `cell` px, each a hex `hexWidth` px wide, in `roadTileOrder()`. */
export interface RoadSheetDefinition {
  readonly file: string;
  readonly status: 'final' | 'placeholder';
  readonly width: number;
  readonly height: number;
  readonly cell: number;
  readonly cols: number;
  readonly rows: number;
  readonly hexWidth: number;
  readonly provenance: string;
}

const EMPTY: SpriteManifest = { schema: 'pantheon-realms-sprites-1', creatures: {}, heroes: {}, sites: {}, decor: {}, obstacles: {}, siege: {}, projectiles: {}, effects: {} };
let manifest: SpriteManifest = EMPTY;
let urlOf: (file: string) => string = (f) => `./${f}`;

/** Set by the interface at start-up from `assets-runtime/sprites/manifest.json`. */
export function registerSpriteManifest(m: SpriteManifest, resolveUrl?: (file: string) => string): void {
  manifest = m;
  if (resolveUrl) urlOf = resolveUrl;
}

export function spriteManifest(): SpriteManifest {
  return manifest;
}

/** Runtime URL of a manifest file path. */
export function spriteUrl(file: string): string {
  return urlOf(file);
}

export function creatureSprites(creatureId: string | undefined): SpriteSetDefinition | null {
  return (creatureId && manifest.creatures[creatureId]) || null;
}

/** The pantheon's mounted map avatar, else the neutral one. */
export function heroSprites(pantheonId: string | null | undefined): HeroSpriteDefinition | null {
  return (pantheonId && manifest.heroes[pantheonId]) || manifest.heroes['neutral'] || null;
}

/** A map site: `map.site.<kind>.<variant>` first, then `map.site.<kind>`. */
export function siteSprite(kind: string, variant?: string | null): StaticSpriteDefinition | null {
  return (variant ? manifest.sites[`map.site.${kind}.${variant}`] : undefined) ?? manifest.sites[`map.site.${kind}`] ?? null;
}

/** Fallback chain per animation (directive §12: a missing optional animation degrades gracefully). */
export const ANIMATION_FALLBACK: Readonly<Record<string, readonly string[]>> = {
  idle: [],
  move: ['fly', 'idle'],
  attack: ['idle'],
  shoot: ['attack', 'idle'],
  defend: ['idle'],
  hit: ['idle'],
  death: [],
  victory: ['idle'],
  takeoff: ['move', 'idle'],
  fly: ['move', 'idle'],
  landing: ['move', 'idle'],
  cast: ['ability', 'attack', 'idle'],
  ability: ['cast', 'attack', 'idle'],
  walk: ['idle'],
};

export interface ResolvedAnimation {
  /** The animation actually drawn. */
  readonly name: string;
  readonly def: SpriteAnimationDefinition;
  /** True when the requested animation is missing and another one stands in. */
  readonly fallback: boolean;
}

/** The strip to draw for `name`, following the fallback chain; null when not even idle exists. */
export function resolveAnimation(set: SpriteSetDefinition | null, name: string): ResolvedAnimation | null {
  if (!set) return null;
  const own = set.animations[name];
  if (own) return { name, def: own, fallback: false };
  for (const alt of ANIMATION_FALLBACK[name] ?? ['idle']) {
    const d = set.animations[alt];
    if (d) return { name: alt, def: d, fallback: true };
  }
  return null;
}

/** The strip for a map direction: the direction's own strip, else the right-facing strip (mirrored when going west). */
export function directionalStrip(def: SpriteAnimationDefinition, dir: MapDirection): { strip: SpriteStrip; mirror: boolean } {
  const own = def.directions?.[dir];
  if (own) return { strip: own, mirror: false };
  // Mirror the opposite direction when only one side was delivered.
  const opposite: Record<MapDirection, MapDirection> = { e: 'w', ne: 'nw', n: 'n', nw: 'ne', w: 'e', sw: 'se', s: 's', se: 'sw' };
  const opp = def.directions?.[opposite[dir]];
  if (opp) return { strip: opp, mirror: true };
  return { strip: def, mirror: dir === 'w' || dir === 'nw' || dir === 'sw' };
}

/**
 * The animations a creature form needs, from its gameplay content only
 * (directive §9 and §18: never from its artwork): the seven base animations,
 * `shoot` for shooters, `takeoff`/`fly`/`landing` for Flight, `ability` for an
 * active ability. No creature casts spells in battle today, so `cast` is
 * requested only for a creature whose active ability is spell-like.
 */
export function requiredAnimations(catalog: ContentCatalog, def: CreatureDefinition): CreatureAnimation[] {
  const out: CreatureAnimation[] = [...BASE_ANIMATIONS];
  const rules = def.abilityIds.map((id) => catalog.abilities[id]).filter((a) => !!a);
  if ((def.stats?.shots ?? 0) > 0) out.splice(3, 0, 'shoot');
  if (rules.some((a) => a.rule.type === 'flight')) out.push('takeoff', 'fly', 'landing');
  if (rules.some((a) => a.activation === 'active')) out.push('ability');
  return out;
}
