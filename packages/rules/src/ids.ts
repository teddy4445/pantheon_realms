/**
 * Stable typed identifiers.
 *
 * Owns: the nominal ID types used across every domain.
 * Does not own: any lookup or validation (see content validators).
 *
 * The brand property is optional, so plain string literals remain assignable
 * (content can be authored as ordinary data), while passing an ID from one
 * domain where another is expected (e.g. a HeroId as a TownId) is a type error.
 */
export type Id<B extends string> = string & { readonly __brand?: B };

export type PlayerId = Id<'PlayerId'>;
export type HeroId = Id<'HeroId'>;
export type HeroDefinitionId = Id<'HeroDefinitionId'>;
export type HeroClassId = Id<'HeroClassId'>;
export type TownId = Id<'TownId'>;
export type TownArchetypeId = Id<'TownArchetypeId'>;
export type BuildingId = Id<'BuildingId'>;
export type BuildingSlotId = Id<'BuildingSlotId'>;
export type CreatureId = Id<'CreatureId'>;
export type CreatureFamilyId = Id<'CreatureFamilyId'>;
export type AbilityId = Id<'AbilityId'>;
export type PantheonId = Id<'PantheonId'>;
export type GodId = Id<'GodId'>;
export type SkillId = Id<'SkillId'>;
export type SpellId = Id<'SpellId'>;
export type ArtifactId = Id<'ArtifactId'>;
export type ArtifactInstanceId = Id<'ArtifactInstanceId'>;
export type EntitlementId = Id<'EntitlementId'>;
export type SiteId = Id<'SiteId'>;
export type ObjectiveId = Id<'ObjectiveId'>;
export type MissionId = Id<'MissionId'>;
export type CampaignId = Id<'CampaignId'>;
export type ScenarioId = Id<'ScenarioId'>;
export type MapTemplateId = Id<'MapTemplateId'>;
export type StackId = Id<'StackId'>;
export type BattleId = Id<'BattleId'>;
export type BattleStackId = Id<'BattleStackId'>;
export type CommandId = Id<'CommandId'>;
export type EventId = Id<'EventId'>;
export type LoreId = Id<'LoreId'>;
export type AssetId = Id<'AssetId'>;
export type DecisionId = Id<'DecisionId'>;
/** A hero ship on the adventure map (scenario feature `navalMovementV1`). */
export type ShipId = Id<'ShipId'>;
