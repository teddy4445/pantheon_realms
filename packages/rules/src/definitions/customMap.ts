/**
 * Custom map documents (`*.prmap.json`, map editor 2026-10-05) and the authored
 * skirmish maps built from them (2026-10-05).
 *
 * The document is plain data: terrain and roads of a rectangular hex map, two to
 * six empires (one pantheon each), the sites placed on it and the victory goal.
 * It never holds code or file paths. The types live here (not in the map
 * generator) so content can ship authored maps; `@pr/mapgen` parses, validates
 * and compiles them into an ordinary mission.
 */
import type { AssetId } from '../ids';
import type { KeyColor, MapTemplateDefinition, Terrain } from './world';
import type { NavalTraversalPolicy } from './navalPolicy';

export const CUSTOM_MAP_FORMAT = 'pantheon-realms-map';
export const CUSTOM_MAP_VERSION = 1;

/** What a custom map can place. */
export type CustomSiteKind =
  | 'town'
  | 'sawmill'
  | 'quarry'
  | 'gold_mine'
  | 'crystal_deposit'
  | 'treasure_chest'
  | 'resource_cache'
  | 'learning_stone'
  | 'spell_shrine'
  | 'skill_trainer'
  | 'windmill'
  | 'creature_camp'
  | 'portal'
  | 'relic'
  | 'monster'
  // Added 2026-10-05 for the authored skirmish maps (all already rules site kinds).
  | 'key_tent'
  | 'key_gate'
  | 'prison'
  | 'quest_hut'
  | 'watchtower'
  | 'artifact'
  // Added 2026-10-15 (campaign expansion handoff; optional, older documents never hold them):
  // a hiring site of one of the six new neutrals, a sluice with its channel, a ferry
  // landing (placed in pairs) and a one-use supply depot.
  | 'neutral_dwelling'
  | 'sluice'
  | 'ferry'
  | 'supply_depot'
  | 'restoration_shrine'
  | 'restoration_temple'
  // Added 2026-10-18 (sea-sites kit; optional, older documents never hold them): a capturable coastal
  // lookout on land, floating salvage and a shipwreck on water.
  | 'coastal_watchtower'
  | 'sea_pickup'
  | 'shipwreck'
  // Added 2026-10-18 (sea creatures; optional): a neutral sea-monster stack on one water hex (`seaEncountersV1`).
  | 'sea_monster';

/** Ground a sluice channel switches between (never void). */
export type CustomChannelTerrain = Exclude<Terrain, 'void'>;

/**
 * Where a neutral hiring site may stand (campaign expansion 2026-10-15). The data
 * lives with the creatures in content (`NEUTRAL_V2_HABITATS`); the map editor, its
 * checks and the random-map generator receive it as data.
 */
export interface NeutralHabitat {
  /** One line for players. */
  readonly habitat: string;
  /** Settings it lives in (any one is enough). */
  readonly tags: readonly string[];
  /** Settings it never lives in. */
  readonly forbidden: readonly string[];
  /** Map biomes (`MapTemplateDefinition['biome']`) whose lands have its settings. */
  readonly biomes: readonly string[];
}

/** The hiring-site table: creature → habitat, and creature → weekly stock of one site (`NEUTRAL_V2_SITE_STOCK`). */
export interface NeutralSiteTable {
  readonly habitats: Readonly<Record<string, NeutralHabitat>>;
  readonly stock: Readonly<Record<string, number>>;
}

/** A neutral army: one stack, or several (`more`). */
export interface CustomGuard {
  readonly creatureId: string;
  readonly count: number;
  /** Further stacks of the same army. */
  readonly more?: readonly { readonly creatureId: string; readonly count: number }[];
  /** Shown before the battle (default: "<creatures> on guard"). */
  readonly label?: string;
}

/** A reward written in the map: resources, experience and at most one artifact. */
export interface CustomReward {
  readonly gold?: number;
  readonly wood?: number;
  readonly stone?: number;
  readonly crystal?: number;
  readonly xp?: number;
  /** A named artifact… */
  readonly artifactId?: string;
  /** …or one of this rarity, chosen when the map is compiled (the same map always gives the same one). */
  readonly artifactRarity?: 'minor' | 'major' | 'relic';
}

/** What a quest hut asks for. */
export type CustomQuest =
  /** Hand over these resources at the hut. */
  | { readonly type: 'deliver'; readonly gold?: number; readonly wood?: number; readonly stone?: number; readonly crystal?: number }
  /** Defeat the guard of this site yourself first. */
  | { readonly type: 'defeat'; readonly siteId: string };

export interface CustomSite {
  readonly id: string;
  readonly kind: CustomSiteKind;
  readonly q: number;
  readonly r: number;
  /**
   * Towns: the empire (player slot) that starts with it; absent = an unowned town
   * (2026-10-07: no owner, no hero, held by its own militia). Prisons: the empire
   * whose pantheon the captive comes from (default: the nearest town's).
   */
  readonly owner?: number;
  /**
   * Unowned towns: their pantheon — 'nearest' (the nearest empire's, the default),
   * 'other' (one no empire plays, else not the nearest empire's) or a pantheon ID.
   */
  readonly pantheon?: string;
  readonly name?: string;
  readonly guard?: CustomGuard | null;
  /** Portals and ferry landings: the twin's site ID. */
  readonly twinId?: string;
  /** Spell shrines: the spell; skill trainers: the skill; creature camps and neutral hiring sites: the creature. */
  readonly spellId?: string;
  readonly skillId?: string;
  readonly creatureId?: string;
  /** Key tents and key gates. */
  readonly color?: KeyColor;
  /** Prisons: the captive's level (default 5) and, optionally, the hero. */
  readonly level?: number;
  readonly heroId?: string;
  /** Quest huts. */
  readonly quest?: CustomQuest;
  /** Quest huts and artifact caches: what the site gives; guarded sites: what beating the guard gives (default: Gold worth a quarter of the guard). */
  readonly reward?: CustomReward;
  /** Watchtowers: sites within this many hexes are revealed (default 9). Coastal watchtowers: their owner's sight (default: the policy's, 6). */
  readonly radius?: number;
  /** Optional text shown in the site panel instead of the default description. */
  readonly text?: string;
  /** Sluices (2026-10-15): the stored cells whose ground the sluice switches. */
  readonly channel?: readonly { readonly q: number; readonly r: number }[];
  /** Sluices: the channel's ground while open (default marsh) and while closed (default water). */
  readonly openTerrain?: CustomChannelTerrain;
  readonly closedTerrain?: CustomChannelTerrain;
  /** Sluices: open when the game starts (default closed). */
  readonly startsOpen?: boolean;
  /** Floating salvage (sea-sites kit): what floats here (default gold) and how much (absent: drawn once when the map is compiled). */
  readonly resource?: 'wood' | 'stone' | 'gold';
  readonly amount?: number;
  /** Shipwrecks: what lies aboard (absent: drawn once when the map is compiled, by the policy's weights). */
  readonly outcome?: 'abandoned_cargo' | 'guarded_salvage' | 'rare_cache';
  /** Shipwrecks: the picture (absent: drawn when compiled). Presentation only. */
  readonly skin?: 'broken_mast' | 'split_hull';
}

/**
 * An empty ship placed on a water tile (expedition kit, scenario feature `navalMovementV1`;
 * optional, older documents never hold one). Neutral without `owner`, else the empire slot
 * that owns it. Any hero may claim a neutral ship by embarking; an owned one serves its empire.
 */
export interface CustomShip {
  readonly id: string;
  readonly q: number;
  readonly r: number;
  readonly owner?: number;
}

export interface CustomPlayer {
  readonly pantheonId: string;
  readonly name?: string;
}

export type CustomVictory = { readonly type: 'elimination' } | { readonly type: 'hold_relic'; readonly days: number };

export interface CustomMapDocument {
  readonly format: typeof CUSTOM_MAP_FORMAT;
  readonly version: number;
  readonly name: string;
  readonly description: string;
  readonly author?: string;
  /** Stored axial array (columns + the row stagger); cells outside the rectangle are void. */
  readonly width: number;
  readonly height: number;
  /** Row-major terrain codes (TERRAIN_CODES), index = r * width + q. */
  readonly terrain: string;
  readonly roads: readonly string[];
  readonly biome?: MapTemplateDefinition['biome'];
  readonly players: readonly CustomPlayer[];
  readonly sites: readonly CustomSite[];
  /** Empty ships on water (absent = none; kept by every export and import, never dropped silently). */
  readonly ships?: readonly CustomShip[];
  /**
   * Naval-only travel (naval random templates, 2026-10-17; optional): islands are reached by ship only and
   * portals stay off. Kept by every export and import; a damaged rule or `portals: true` is refused.
   */
  readonly navalPolicy?: NavalTraversalPolicy;
  readonly victory: CustomVictory;
  readonly startWealth?: 'low' | 'normal' | 'high';
  readonly revealMap?: boolean;
}

/**
 * An authored skirmish map (proposed 2026-10-05): a custom map document plus
 * what the skirmish list shows. Each seat's pantheon and controller are chosen
 * at setup; the document's pantheons are only the defaults.
 */
export interface SkirmishMapDefinition {
  readonly id: string;
  /** Position in the skirmish list (after the authored scenarios). */
  readonly order: number;
  readonly name: string;
  /** One line under the name on the list card. */
  readonly tagline: string;
  /** The paragraph of the detail panel. */
  readonly summary: string;
  /** What makes the map different, one short sentence each. */
  readonly highlights: readonly string[];
  /** The 640 × 360 card and the large picture (GPT-6 Brief 14); a drawn map preview stands in until delivered. */
  readonly thumbnailAssetId: AssetId;
  readonly map: CustomMapDocument;
}
