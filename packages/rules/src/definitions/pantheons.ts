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
import type { ContentScope, EffectDefinition, HeroAttribute, RequirementDefinition } from './logic';

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

/**
 * A hero's specialty (proposed 2026-10-02, owner request: "a special unit, spell
 * or resource ... list them in the tavern"). Plain effects from the shared
 * vocabulary; `growth` repeats its effects once for every `everyLevels` hero
 * levels reached (level scaling). Applies only in scenarios with the
 * `heroSpecialties` feature (The Three Beacons keeps its documented rules).
 */
export interface HeroSpecialtyDefinition {
  readonly kind: 'creature' | 'spell' | 'resource';
  /** Short label for the Tavern card (e.g. "Hoplites", "Lightning", "Gold"). */
  readonly name: string;
  /** Exact rule text shown to players; must match `effects` and `growth`. */
  readonly summary: string;
  readonly effects: readonly EffectDefinition[];
  readonly growth?: { readonly everyLevels: number; readonly effects: readonly EffectDefinition[] };
  /** Spell specialty: the hero knows this spell from the start (it needs a spellbook class). */
  readonly spellId?: SpellId;
  /** Creature specialty: the family it improves (for icons and the AI). */
  readonly familyId?: CreatureFamilyId;
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
  /** Proposed specialty (see HeroSpecialtyDefinition). */
  readonly specialty?: HeroSpecialtyDefinition;
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
  | { readonly type: 'tactics'; readonly columnsByRank: readonly number[] }
  /** Generic skill: each rank grants these effects from the shared vocabulary (rank 1 = index 0). */
  | { readonly type: 'effects'; readonly effectsByRank: readonly (readonly EffectDefinition[])[] };

export interface SkillDefinition {
  readonly id: SkillId;
  readonly name: string;
  readonly rankSummaries: readonly string[];
  readonly rule: SkillRule;
  readonly iconAssetId: AssetId;
  /** Offered only to heroes of this pantheon (omitted: any hero). */
  readonly pantheonId?: PantheonId;
  /** Content pool (default 'core'). */
  readonly scope?: ContentScope;
  /** One-line description for the encyclopedia and level-up cards. */
  readonly summary?: string;
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
  | { readonly type: 'reveal_radius'; readonly radius: number }
  /** Speed change for a stack (negative slows), through the current and following rounds. */
  | { readonly type: 'speed_bonus'; readonly amount: number; readonly durationRounds: number }
  /** Damage to the target and to every enemy stack adjacent to it. */
  | { readonly type: 'area_damage'; readonly base: number; readonly perPower: number }
  /** Attack, Defense or Speed change for every stack of the caster's side. */
  | { readonly type: 'mass_bonus'; readonly stat: 'attack' | 'defense' | 'speed'; readonly amount: number; readonly durationRounds: number }
  /** Adventure: the caster gains movement points today. */
  | { readonly type: 'movement_bonus'; readonly points: number }
  /** Adventure: the caster returns to the nearest town its player owns (spends all remaining movement). */
  | { readonly type: 'recall' }
  /** Melee strikes against the target are multiplied by numerator/denominator. */
  | { readonly type: 'melee_mitigation'; readonly numerator: number; readonly denominator: number; readonly durationRounds: number }
  /** The target rolls its minimum damage (a curse; cancels a max-damage blessing). */
  | { readonly type: 'min_damage_roll'; readonly durationRounds: number }
  /** Heal the front creature of every friendly stack (no resurrection). */
  | { readonly type: 'mass_heal'; readonly base: number; readonly perPower: number }
  /** Damage to every enemy stack. */
  | { readonly type: 'mass_damage'; readonly base: number; readonly perPower: number };

export interface SpellDefinition {
  readonly id: SpellId;
  readonly name: string;
  readonly tier: number;
  readonly manaCost: number;
  readonly context: 'battle' | 'adventure';
  /**
   * 'friendly_army' / 'enemy_army' affect every stack of that side (any stack of it is the
   * nominal target); 'self' is the casting hero.
   */
  readonly target: 'enemy_stack' | 'ally_stack' | 'known_tile' | 'friendly_army' | 'enemy_army' | 'self';
  readonly effect: SpellEffect;
  readonly summary: string;
  /** Library access: 'sanctum' spells are learnable up to the town library tier; 'god' spells need eligibility. */
  readonly access: 'sanctum' | 'god_eligibility';
  readonly iconAssetId: AssetId;
  readonly implementationStatus: ImplementationStatus;
  /** Learnable only in towns of this pantheon (omitted: any Sanctum). */
  readonly pantheonId?: PantheonId;
  /** In-world story of the spell (encyclopedia and icon brief; never read by the rules). */
  readonly lore?: string;
  /** Content pool (default 'core'). */
  readonly scope?: ContentScope;
}

/**
 * Artifact kinds, Heroes-3 style (owner decision 2026-10-01), plus a mount slot
 * for the mounted heroes. Rings and miscellaneous items have several positions.
 */
export type ArtifactSlot = 'head' | 'neck' | 'cape' | 'weapon' | 'shield' | 'armor' | 'ring' | 'feet' | 'mount' | 'misc';
export const ARTIFACT_SLOTS: readonly ArtifactSlot[] = ['head', 'neck', 'cape', 'weapon', 'shield', 'armor', 'ring', 'feet', 'mount', 'misc'];

export type ArtifactRarity = 'treasure' | 'minor' | 'major' | 'relic';

/** Paper-doll positions on a hero. */
export type EquipSlot = 'head' | 'neck' | 'cape' | 'weapon' | 'shield' | 'armor' | 'ring_left' | 'ring_right' | 'feet' | 'mount' | 'misc_1' | 'misc_2' | 'misc_3' | 'misc_4' | 'misc_5';
export const EQUIP_SLOTS: readonly EquipSlot[] = ['head', 'neck', 'cape', 'weapon', 'shield', 'armor', 'ring_left', 'ring_right', 'feet', 'mount', 'misc_1', 'misc_2', 'misc_3', 'misc_4', 'misc_5'];

/** Which artifact kind each position holds. */
export const EQUIP_SLOT_KIND: Readonly<Record<EquipSlot, ArtifactSlot>> = {
  head: 'head',
  neck: 'neck',
  cape: 'cape',
  weapon: 'weapon',
  shield: 'shield',
  armor: 'armor',
  ring_left: 'ring',
  ring_right: 'ring',
  feet: 'feet',
  mount: 'mount',
  misc_1: 'misc',
  misc_2: 'misc',
  misc_3: 'misc',
  misc_4: 'misc',
  misc_5: 'misc',
};

export const ARTIFACT_SLOT_LABEL: Readonly<Record<ArtifactSlot, string>> = {
  head: 'Head',
  neck: 'Neck',
  cape: 'Shoulders',
  weapon: 'Weapon',
  shield: 'Shield',
  armor: 'Armor',
  ring: 'Ring',
  feet: 'Feet',
  mount: 'Mount',
  misc: 'Miscellaneous',
};

export const EQUIP_SLOT_LABEL: Readonly<Record<EquipSlot, string>> = {
  head: 'Head',
  neck: 'Neck',
  cape: 'Shoulders',
  weapon: 'Weapon',
  shield: 'Shield',
  armor: 'Armor',
  ring_left: 'Left ring',
  ring_right: 'Right ring',
  feet: 'Feet',
  mount: 'Mount',
  misc_1: 'Misc 1',
  misc_2: 'Misc 2',
  misc_3: 'Misc 3',
  misc_4: 'Misc 4',
  misc_5: 'Misc 5',
};

/** The positions an artifact of this kind may occupy, in fill order. */
export function equipSlotsFor(kind: ArtifactSlot): EquipSlot[] {
  return EQUIP_SLOTS.filter((s) => EQUIP_SLOT_KIND[s] === kind);
}

/** First empty position for this kind, or null when every one is taken. */
export function freeEquipSlot(equipment: Partial<Record<EquipSlot, unknown>>, kind: ArtifactSlot): EquipSlot | null {
  return equipSlotsFor(kind).find((s) => !equipment[s]) ?? null;
}

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
  /** Member of this artifact set (bonuses for wearing several pieces). */
  readonly setId?: string;
  /** In-world story of the item (encyclopedia and icon brief; never read by the rules). */
  readonly lore?: string;
  /** Pantheon whose lands the item comes from (presentation and icon brief only). */
  readonly originPantheonId?: PantheonId;
  /** Heroes-3 style class: treasure < minor < major < relic (map treasure value; relics are unique finds). */
  readonly rarity?: ArtifactRarity;
  /** Content pool (default 'core'): expanded items are stocked/placed only where expanded content is enabled. */
  readonly scope?: ContentScope;
}

/** Bonuses for wearing several pieces of one set (the highest met thresholds all apply). */
export interface ArtifactSetDefinition {
  readonly id: string;
  readonly name: string;
  readonly summary: string;
  readonly pieceIds: readonly ArtifactId[];
  readonly bonuses: readonly { readonly pieces: number; readonly effects: readonly EffectDefinition[]; readonly summary: string }[];
}
