/**
 * Adventure-map content: terrain, map templates, sites and encounters.
 *
 * The logical map (WorldMapDefinition) is produced by @pr/mapgen from a template
 * and is immutable for a mission. Babylon geometry is built from it; geometry
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

export type Terrain = 'plains' | 'forest' | 'rough' | 'marsh' | 'mountain' | 'water';
export const TERRAIN_CODES: Readonly<Record<Terrain, string>> = {
  plains: 'p',
  forest: 'f',
  rough: 'r',
  marsh: 's',
  mountain: 'm',
  water: 'w',
};
export const TERRAIN_BY_CODE: Readonly<Record<string, Terrain>> = {
  p: 'plains',
  f: 'forest',
  r: 'rough',
  s: 'marsh',
  m: 'mountain',
  w: 'water',
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
   * Presentation biome hint (materials/lighting), never a rule. Coast-like
   * biomes ('coast', 'fjord') use water for the map edge, the others mountain.
   */
  readonly biome: 'coast' | 'high_pass' | 'storm_plateau' | 'temperate' | 'tundra' | 'fjord';
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
  | { readonly type: 'relic' };

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
