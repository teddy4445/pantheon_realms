/**
 * Adventure-map content: terrain, map templates, sites and encounters.
 *
 * The logical map (WorldMapDefinition) is produced by @pr/mapgen from a template
 * and is immutable for a mission. The 2D map is drawn from it; drawing
 * never defines legal movement.
 */
import type {
  AssetId,
  CreatureId,
  EntitlementId,
  CreatureFamilyId,
  HeroClassId,
  HeroDefinitionId,
  MapTemplateId,
  ObjectiveId,
  SiteId,
  SkillId,
  SpellId,
  TownId,
} from '../ids';
import type { HexCoord } from '../core/hex';
import type { ResourceCost, ResourceKey } from '../core/resources';
import type { HeroAttribute, RequirementDefinition, RewardDefinition } from './logic';

/**
 * Ground types. `void` is not ground: the cells of the stored map array that lie
 * outside the map's own shape (a square random map kept in the axial array).
 * Impassable, never explored, drawn black (owner request 2026-10-04).
 */
export type Terrain = 'plains' | 'forest' | 'rough' | 'marsh' | 'mountain' | 'water' | 'void';
export const TERRAIN_CODES: Readonly<Record<Terrain, string>> = {
  plains: 'p',
  forest: 'f',
  rough: 'r',
  marsh: 's',
  mountain: 'm',
  water: 'w',
  void: 'v',
};
export const TERRAIN_BY_CODE: Readonly<Record<string, Terrain>> = {
  p: 'plains',
  f: 'forest',
  r: 'rough',
  s: 'marsh',
  m: 'mountain',
  w: 'water',
  v: 'void',
};

export interface MapBarrierDefinition {
  /** Column q replaced with impassable terrain except the named openings. */
  readonly q: number;
  readonly terrain: 'water' | 'mountain';
  readonly openings: readonly HexCoord[];
}

export interface MapAnchorDefinition {
  readonly id: string;
  readonly coord: HexCoord;
}

export interface MapTemplateDefinition {
  readonly id: MapTemplateId;
  readonly version: number;
  readonly width: number;
  readonly height: number;
  readonly goldenSeed: number;
  readonly barriers: readonly MapBarrierDefinition[];
  readonly anchors: readonly MapAnchorDefinition[];
  /** Declared road graph edges by anchor ID, carved in this order. */
  readonly roadEdges: readonly (readonly [string, string])[];
  /** Additional coordinate waypoints connected in order (and closed) with internal roads. */
  readonly patrolLoop?: readonly HexCoord[];
  /**
   * Presentation biome hint (ground art, sky and colours), never a rule. Coast-like
   * biomes ('coast', 'fjord') use water for the map edge, the others mountain.
   */
  readonly biome: 'coast' | 'high_pass' | 'storm_plateau' | 'temperate' | 'tundra' | 'fjord' | 'desert' | 'jungle' | 'autumn' | 'moor';
  /**
   * 'point': the generated map is symmetric under a 180° rotation of the grid,
   * (q, r) -> (width-1-q, height-1-r), which preserves hex distance. Anchors,
   * barriers and roads must come in mirrored pairs; terrain and roads are
   * mirrored so both halves cost the same to cross (fair two-player maps).
   */
  readonly symmetry?: 'point';
}

/** Generated logical map: the authoritative terrain/road graph for one mission. */
export interface WorldMapDefinition {
  readonly templateId: MapTemplateId;
  readonly templateVersion: number;
  readonly generatorVersion: string;
  readonly seed: number;
  readonly attempt: number;
  readonly mode: 'golden' | 'variation' | 'golden_fallback';
  readonly width: number;
  readonly height: number;
  /** Row-major terrain codes, index = r * width + q. */
  readonly terrain: string;
  /** Sorted undirected road edge keys (see hex.edgeKey). */
  readonly roads: readonly string[];
  readonly logicalHash: string;
  readonly biome: MapTemplateDefinition['biome'];
}

export type BattlefieldArchetype = 'coast_road' | 'ridge_pass' | 'grove' | 'plateau' | 'beacon_clearing' | 'open_field';

export interface StackSpec {
  readonly creatureId: CreatureId;
  readonly count: number;
}

export interface CommanderSpec {
  readonly heroDefinitionId: HeroDefinitionId;
  readonly name: string;
  readonly classId: HeroClassId;
  readonly level: number;
  readonly attributes: Readonly<Record<HeroAttribute, number>>;
  readonly skills: readonly { readonly skillId: SkillId; readonly rank: number }[];
  readonly spellbook: boolean;
  readonly spellIds: readonly SpellId[];
  readonly mana: number;
  readonly portraitAssetId: AssetId;
}

export interface GuardDefinition {
  readonly army: readonly StackSpec[];
  /** Optional stationary commander (e.g. Melas). Neutral guards have none. */
  readonly commander?: CommanderSpec;
  readonly reward: RewardDefinition;
  readonly battlefield: BattlefieldArchetype;
  /** Label used in encounter confirmation, e.g. "Bridge garrison". */
  readonly label: string;
}

export type ResourceSiteType = 'sawmill' | 'quarry' | 'gold_mine' | 'crystal_deposit';

export type SiteKind =
  | { readonly type: 'town'; readonly townId: TownId }
  | {
      readonly type: 'resource_site';
      readonly siteType: ResourceSiteType;
      readonly resource: ResourceKey;
      readonly dailyYield: number;
    }
  | { readonly type: 'pickup'; readonly reward: RewardDefinition }
  | { readonly type: 'watchtower'; readonly revealSiteIds: readonly SiteId[] }
  /** A guarded barrier opening (bridge/pass/crossing). */
  | { readonly type: 'crossing' }
  /** Story location whose guard gates a quest (nest, refuge, cache). */
  | { readonly type: 'landmark'; readonly landmark: 'nest' | 'refuge' | 'quarry_cache' | 'grove' }
  | {
      readonly type: 'activation';
      readonly label: 'beacon' | 'relay';
      readonly cost: ResourceCost;
      readonly requirements: readonly RequirementDefinition[];
      readonly reward: RewardDefinition;
      readonly completesMission: boolean;
      readonly confirmText: string;
    }
  | { readonly type: 'gate'; readonly openWhenFlags: readonly string[] }
  /**
   * Neutral creature camp: a visiting hero may recruit its creatures at their
   * normal price. Stock starts at `initialStock` and grows by `weeklyGrowth`
   * each new week (proposed this build).
   */
  | { readonly type: 'creature_camp'; readonly creatureId: CreatureId; readonly weeklyGrowth: number; readonly initialStock: number }
  /** One-time map event: the first hero to arrive chooses one option. */
  | { readonly type: 'map_event'; readonly title: string; readonly text: string; readonly options: readonly MapEventOptionDefinition[] }
  /** Capturable relic shrine (hold-the-relic victory). */
  | { readonly type: 'relic' }
  /**
   * Two-way portal (proposed 2026-10-02): a hero who ends its move on it steps
   * out of its twin `exitSiteId` at once, at no movement cost. Blocked while
   * another hero stands on the twin. To travel back, step off and on again.
   */
  | { readonly type: 'portal'; readonly exitSiteId: SiteId }
  // --- Adventure-map sites added 2026-10-02 (owner request; random maps; proposed values) ---
  /** Learning stone: every hero that stops here once gains `xp` experience. */
  | { readonly type: 'learning_stone'; readonly xp: number }
  /** Spell shrine: every hero with a spellbook (and the Wisdom for its tier) learns the spell once. */
  | { readonly type: 'spell_shrine'; readonly spellId: SpellId }
  /** Skill trainer: every hero with a free skill slot that lacks the skill learns it at Basic, once. */
  | { readonly type: 'skill_trainer'; readonly skillId: SkillId }
  /** Quest hut: the first hero to fulfil the quest and stop here receives the reward (once). */
  | { readonly type: 'quest_hut'; readonly quest: QuestHutQuest; readonly reward: RewardDefinition }
  /** Key tent: a visiting hero's player receives the key of this colour (opens matching key gates). */
  | { readonly type: 'key_tent'; readonly color: KeyColor }
  /** Key gate: passable only for players holding the key of its colour; blocks everyone else. */
  | { readonly type: 'key_gate'; readonly color: KeyColor }
  /** Windmill: the first hero to stop here each world week collects `weekly` for its player. */
  | { readonly type: 'windmill'; readonly weekly: ResourceCost }
  /** Treasure chest: the first hero to open it chooses `gold` Gold or `xp` experience. */
  | { readonly type: 'treasure_chest'; readonly gold: number; readonly xp: number }
  /** Prison: the first hero to stop here frees a captive hero, who joins that player at `level`. */
  | { readonly type: 'prison'; readonly heroDefinitionId: HeroDefinitionId; readonly level: number };

/** What a quest hut asks for (proposed 2026-10-02). */
export type QuestHutQuest =
  /** Hand over these resources when you stop at the hut. */
  | { readonly type: 'deliver'; readonly resources: ResourceCost }
  /** Defeat the guard of this site yourself first (a battle won, or the guards fled or joined you). */
  | { readonly type: 'defeat'; readonly siteId: SiteId; readonly label: string };

/** Key colours of key tents and gates (HoMM3 border guards). */
export type KeyColor = 'azure' | 'crimson' | 'emerald' | 'amber' | 'violet' | 'ivory';
export const KEY_COLOR_LABEL: Readonly<Record<KeyColor, string>> = { azure: 'Azure', crimson: 'Crimson', emerald: 'Emerald', amber: 'Amber', violet: 'Violet', ivory: 'Ivory' };
export const KEY_COLOR_HEX: Readonly<Record<KeyColor, string>> = { azure: '#3b8fe0', crimson: '#c0392b', emerald: '#2e9e5b', amber: '#d9a21b', violet: '#8e5bd6', ivory: '#e8e2cf' };

export interface MapEventOptionDefinition {
  readonly label: string;
  /** Exact result shown to the player; must match `reward` and `cost`. */
  readonly summary: string;
  readonly reward: RewardDefinition;
  readonly cost?: ResourceCost;
}

export interface SiteDefinition {
  readonly id: SiteId;
  readonly anchorId: string;
  readonly coord: HexCoord;
  readonly name: string;
  readonly description: string;
  readonly kind: SiteKind;
  readonly guard?: GuardDefinition;
  /** Hidden sites get no precise journal marker until revealed. */
  readonly markerHiddenUntilRevealed?: boolean;
  readonly objectiveIds?: readonly ObjectiveId[];
}

export interface EntitlementDefinition {
  readonly id: EntitlementId;
  readonly name: string;
  readonly kind: 'covenant';
  readonly familyId: CreatureFamilyId;
  readonly summary: string;
}

export interface HostileHeroDefinition {
  readonly commander: CommanderSpec;
  /**
   * Wandering monster: an army without a commander (no attributes, skills or
   * spells in battle). `bounty` goes to whoever defeats it.
   */
  readonly monster?: { readonly bounty: ResourceCost };
  readonly startCoord: HexCoord;
  readonly army: readonly StackSpec[];
  readonly ai: {
    readonly profile: 'patrol';
    readonly waypoints: readonly HexCoord[];
    readonly regionMinQ: number;
    readonly regionMaxQ: number;
    /** Optional circular region (wandering monsters stay within `radius` of `center`). */
    readonly regionCenter?: HexCoord;
    readonly regionRadius?: number;
    /** Attack when estimated own strength / target strength >= numerator/denominator. */
    readonly attackThreshold: { readonly numerator: number; readonly denominator: number };
  };
}
