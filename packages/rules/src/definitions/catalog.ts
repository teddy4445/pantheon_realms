/**
 * ContentCatalog: the indexed, validated registry of all immutable definitions.
 *
 * Owns: lookups with descriptive failures. Does not own: authoring (see @pr/content)
 * or validation rules (see @pr/content validation).
 */
import type {
  AbilityId,
  ArtifactId,
  BuildingId,
  CampaignId,
  CreatureFamilyId,
  CreatureId,
  EntitlementId,
  GodId,
  HeroClassId,
  HeroDefinitionId,
  LoreId,
  MapTemplateId,
  MissionId,
  PantheonId,
  ScenarioId,
  SkillId,
  SpellId,
  TownArchetypeId,
} from '../ids';
import type { CampaignDefinition, MissionDefinition, SkirmishScenarioDefinition } from './campaign';
import type { AbilityDefinition, CreatureDefinition, CreatureFamilyDefinition, LoreDefinition } from './creatures';
import type { SkirmishMapDefinition } from './customMap';
import type { ClimateRuleDefinition, AITemperamentDefinition, DifficultyDefinition, DivineGiftDefinition, InterventionDefinition, MapEventTemplateDefinition, SkirmishKitDefinition, WeeklyEventDefinition } from './skirmish';
import type {
  ArtifactDefinition,
  ArtifactSetDefinition,
  GodDefinition,
  GodPerkDefinition,
  HeroClassDefinition,
  HeroDefinition,
  PantheonDefinition,
  SkillDefinition,
  SpellDefinition,
} from './pantheons';
import type { RulesProfile } from './rulesProfile';
import type { BuildingDefinition, TownArchetypeDefinition } from './towns';
import type { EntitlementDefinition, MapTemplateDefinition } from './world';

export interface VersionBundle {
  readonly rulesVersion: string;
  readonly contentVersion: string;
  readonly campaignVersion: string;
  readonly mapGeneratorVersion: string;
  readonly saveSchemaVersion: number;
}

export interface ContentCatalog {
  readonly versions: VersionBundle;
  readonly rulesProfile: RulesProfile;
  readonly pantheons: Readonly<Record<PantheonId, PantheonDefinition>>;
  readonly families: Readonly<Record<CreatureFamilyId, CreatureFamilyDefinition>>;
  readonly creatures: Readonly<Record<CreatureId, CreatureDefinition>>;
  readonly abilities: Readonly<Record<AbilityId, AbilityDefinition>>;
  readonly lore: Readonly<Record<LoreId, LoreDefinition>>;
  readonly buildings: Readonly<Record<BuildingId, BuildingDefinition>>;
  readonly townArchetypes: Readonly<Record<TownArchetypeId, TownArchetypeDefinition>>;
  readonly gods: Readonly<Record<GodId, GodDefinition>>;
  /** Gods' gifts to heroes at levels 10 and 15 (two per god; absent in older catalogs). */
  readonly godPerks?: Readonly<Record<string, GodPerkDefinition>>;
  readonly heroes: Readonly<Record<HeroDefinitionId, HeroDefinition>>;
  readonly heroClasses: Readonly<Record<HeroClassId, HeroClassDefinition>>;
  readonly skills: Readonly<Record<SkillId, SkillDefinition>>;
  readonly spells: Readonly<Record<SpellId, SpellDefinition>>;
  readonly artifacts: Readonly<Record<ArtifactId, ArtifactDefinition>>;
  readonly artifactSets: Readonly<Record<string, ArtifactSetDefinition>>;
  /** Skirmish difficulty levels (in `order`). */
  readonly difficulties: Readonly<Record<string, DifficultyDefinition>>;
  readonly interventions: Readonly<Record<string, InterventionDefinition>>;
  /** Temple gifts bought with Favor (absent in older catalogs). */
  readonly divineGifts?: Readonly<Record<string, DivineGiftDefinition>>;
  /** Battle rules of each climate (scenario feature `climateRules`; proposed 2026-10-04). */
  readonly climates?: Readonly<Record<string, ClimateRuleDefinition>>;
  /** How each pantheon's AI rival plays (scenario feature `aiTemperaments`; proposed 2026-10-04). */
  readonly aiTemperaments?: Readonly<Record<string, AITemperamentDefinition>>;
  readonly weeklyEvents: Readonly<Record<string, WeeklyEventDefinition>>;
  /** Per-pantheon skirmish starting kits (random maps). */
  readonly skirmishKits: Readonly<Record<PantheonId, SkirmishKitDefinition>>;
  /** Map events the random-map generator may place. */
  readonly mapEventTemplates: Readonly<Record<string, MapEventTemplateDefinition>>;
  readonly entitlements: Readonly<Record<EntitlementId, EntitlementDefinition>>;
  readonly campaigns: Readonly<Record<CampaignId, CampaignDefinition>>;
  readonly missions: Readonly<Record<MissionId, MissionDefinition>>;
  readonly skirmishes: Readonly<Record<ScenarioId, SkirmishScenarioDefinition>>;
  /** Authored skirmish maps (custom map documents; absent in older catalogs). */
  readonly skirmishMaps?: Readonly<Record<string, SkirmishMapDefinition>>;
  readonly mapTemplates: Readonly<Record<MapTemplateId, MapTemplateDefinition>>;
  /** Display order for pantheon selection and encyclopedia filters. */
  readonly pantheonOrder: readonly PantheonId[];
}

export class ContentLookupError extends Error {
  constructor(kind: string, id: string) {
    super(`Unknown ${kind} "${id}"`);
    this.name = 'ContentLookupError';
  }
}

function lookup<K extends string, V>(kind: string, table: Readonly<Record<K, V>>, id: K): V {
  const value = table[id];
  if (value === undefined) throw new ContentLookupError(kind, id);
  return value;
}

export const getCreature = (c: ContentCatalog, id: CreatureId) => lookup('creature', c.creatures, id);
export const getFamily = (c: ContentCatalog, id: CreatureFamilyId) => lookup('creature family', c.families, id);
export const getAbility = (c: ContentCatalog, id: AbilityId) => lookup('ability', c.abilities, id);
export const getBuilding = (c: ContentCatalog, id: BuildingId) => lookup('building', c.buildings, id);
export const getTownArchetype = (c: ContentCatalog, id: TownArchetypeId) => lookup('town archetype', c.townArchetypes, id);
export const getGod = (c: ContentCatalog, id: GodId) => lookup('god', c.gods, id);
export const getHeroClass = (c: ContentCatalog, id: HeroClassId) => lookup('hero class', c.heroClasses, id);
export const getSkill = (c: ContentCatalog, id: SkillId) => lookup('skill', c.skills, id);
export const getSpell = (c: ContentCatalog, id: SpellId) => lookup('spell', c.spells, id);
export const getArtifact = (c: ContentCatalog, id: ArtifactId) => lookup('artifact', c.artifacts, id);
export const getEntitlement = (c: ContentCatalog, id: EntitlementId) => lookup('entitlement', c.entitlements, id);
export const getMission = (c: ContentCatalog, id: MissionId) => lookup('mission', c.missions, id);
export const getCampaign = (c: ContentCatalog, id: CampaignId) => lookup('campaign', c.campaigns, id);
export const getMapTemplate = (c: ContentCatalog, id: MapTemplateId) => lookup('map template', c.mapTemplates, id);

/** Stats are mandatory for any creature that can appear in play. */
export function requireStats(c: ContentCatalog, id: CreatureId) {
  const def = getCreature(c, id);
  if (!def.stats || !def.cost) throw new Error(`Creature "${id}" has no gameplay stats in this build`);
  return { def, stats: def.stats, cost: def.cost };
}
