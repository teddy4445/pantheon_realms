/**
 * Pantheon, god, hero, skill, spell and artifact content.
 *
 * Gods are data (no subclasses). A pantheon may have any number of gods; the
 * number is content-driven and unrelated to the town's building count.
 */
import type {
  ArtifactId,
  AssetId,
  CreatureFamilyId,
  GodId,
  HeroClassId,
  HeroDefinitionId,
  PantheonId,
  SkillId,
  SpellId,
  TownArchetypeId,
} from '../ids';
import type { ImplementationStatus, ProvenanceInfo } from './common';
import type { ResourceCost } from '../core/resources';
import type { CreatureTier } from './creatures';
import type { EffectDefinition, HeroAttribute, RequirementDefinition } from './logic';

export interface PantheonThemeDefinition {
  /** Faction accent (UI trims, banners). Always paired with emblem/text for ownership. */
  readonly accent: string;
  readonly accentSoft: string;
  readonly emblemAssetId: AssetId;
  readonly musicThemeId: AssetId;
}

/**
 * A pantheon's signature mechanic: a named bundle of ordinary player-wide
 * effects from the shared vocabulary (logic.ts). Any pantheon — or god —
 * may use the same effect types; nothing in the rules names a pantheon.
 */
export interface PantheonSignatureDefinition {
  readonly name: string;
  readonly summary: string;
  /** Exact rules shown to players; must match `effects`. */
  readonly rules: readonly string[];
  readonly effects: readonly EffectDefinition[];
}

export interface PantheonDefinition {
  readonly id: PantheonId;
  readonly name: string;
  readonly epithet: string;
  readonly summary: string;
  /** Proposed signature mechanic (skirmish; scenarios may disable signatures). */
  readonly signature?: PantheonSignatureDefinition;
  readonly playability: 'playable' | 'preparation';
  /** Exactly seven entries, one family per tier 1..7. */
  readonly roster: readonly { readonly tier: CreatureTier; readonly familyId: CreatureFamilyId }[];
  readonly heroIds: readonly HeroDefinitionId[];
  readonly godIds: readonly GodId[];
  readonly townArchetypeId?: TownArchetypeId;
  readonly theme: PantheonThemeDefinition;
  readonly provenance: ProvenanceInfo;
}

export type GodRole = 'patron' | 'minor' | 'undesigned';

export interface GodDefinition {
  readonly id: GodId;
  readonly pantheonId: PantheonId;
  readonly name: string;
  readonly domain: string;
  readonly role: GodRole;
  /** Choosing one god in a group excludes the others (e.g. the first minor-god choice). */
  readonly exclusivityGroup?: string;
  readonly requirements: readonly RequirementDefinition[];
  readonly favorCost: number;
  readonly benefits: readonly EffectDefinition[];
  /** Human-readable exact effects; must match `benefits`. */
  readonly benefitSummary: readonly string[];
  readonly quote?: string;
  readonly portraitAssetId: AssetId;
  readonly implementationStatus: ImplementationStatus;
  readonly provenance: ProvenanceInfo;
}

export interface HeroClassDefinition {
  readonly id: HeroClassId;
  readonly name: string;
  readonly startingAttributes: Readonly<Record<HeroAttribute, number>>;
  readonly startingSkills: readonly { readonly skillId: SkillId; readonly rank: number }[];
  /** Applied one step per level gained, starting at level 2. */
  readonly primaryGainCycle: readonly HeroAttribute[];
  readonly startsWithSpellbook: boolean;
  readonly summary: string;
}

export interface HeroDefinition {
  readonly id: HeroDefinitionId;
  readonly pantheonId: PantheonId;
  readonly name: string;
  readonly title: string;
  readonly classId: HeroClassId;
  readonly biography: string;
  readonly portraitAssetId: AssetId;
  /** campaign: scripted campaign hero; enemy: scenario opponent; preview: listed but not playable yet. */
  readonly availability: 'campaign' | 'hireable' | 'enemy' | 'preview';
  readonly provenance: ProvenanceInfo;
}

export type SkillRule =
  | { readonly type: 'offense'; readonly percentByRank: readonly number[] }
  | { readonly type: 'archery'; readonly percentByRank: readonly number[] }
  | { readonly type: 'armorer'; readonly reductionPercentByRank: readonly number[] }
  | { readonly type: 'logistics'; readonly percentByRank: readonly number[] }
  | { readonly type: 'leadership'; readonly moraleByRank: readonly number[] }
  | { readonly type: 'fortune'; readonly luckByRank: readonly number[] }
  | { readonly type: 'wisdom'; readonly maxSpellTierByRank: readonly number[] }
  | { readonly type: 'scouting'; readonly radiusByRank: readonly number[] }
  | { readonly type: 'tactics'; readonly columnsByRank: readonly number[] };

export interface SkillDefinition {
  readonly id: SkillId;
  readonly name: string;
  readonly rankSummaries: readonly string[];
  readonly rule: SkillRule;
  readonly iconAssetId: AssetId;
}

export type SpellEffect =
  | { readonly type: 'direct_damage'; readonly base: number; readonly perPower: number }
  | { readonly type: 'max_damage_roll'; readonly durationRounds: number }
  | { readonly type: 'defense_bonus'; readonly amount: number; readonly durationRounds: number }
  | { readonly type: 'attack_bonus'; readonly amount: number; readonly durationRounds: number }
  | { readonly type: 'heal_front'; readonly base: number; readonly perPower: number }
  | {
      readonly type: 'ranged_mitigation';
      readonly numerator: number;
      readonly denominator: number;
      readonly durationRounds: number;
    }
  | { readonly type: 'reveal_radius'; readonly radius: number };

export interface SpellDefinition {
  readonly id: SpellId;
  readonly name: string;
  readonly tier: number;
  readonly manaCost: number;
  readonly context: 'battle' | 'adventure';
  readonly target: 'enemy_stack' | 'ally_stack' | 'known_tile';
  readonly effect: SpellEffect;
  readonly summary: string;
  /** Library access: 'sanctum' spells are learnable up to the town library tier; 'god' spells need eligibility. */
  readonly access: 'sanctum' | 'god_eligibility';
  readonly iconAssetId: AssetId;
  readonly implementationStatus: ImplementationStatus;
}

export type ArtifactSlot = 'weapon' | 'armor' | 'head' | 'relic' | 'ring' | 'mount';
export const ARTIFACT_SLOTS: readonly ArtifactSlot[] = ['weapon', 'armor', 'head', 'relic', 'ring', 'mount'];

export interface ArtifactDefinition {
  readonly id: ArtifactId;
  readonly name: string;
  readonly slot: ArtifactSlot;
  readonly effects: readonly EffectDefinition[];
  readonly summary: string;
  readonly iconAssetId: AssetId;
  readonly unique: boolean;
  /** Price at an Artifact Merchant; artifacts without one are never stocked. */
  readonly merchantPrice?: ResourceCost;
  readonly provenance: ProvenanceInfo;
}
