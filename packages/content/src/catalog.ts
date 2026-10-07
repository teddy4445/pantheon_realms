/**
 * ContentLoader + ContentRegistry: assembles all definitions into one indexed,
 * frozen ContentCatalog and validates it.
 */
import { buildGodPerks } from './common/godPerks';
import { PR_02_CANDIDATE, deepFreeze, type ContentCatalog, type VersionBundle } from '@pr/rules';
import { ABILITIES } from './common/abilities';
import { ARTIFACTS, HERO_CLASSES, SKILLS, SPELLS } from './common/heroesMagic';
import { withSpecialties } from './common/specialties';
import { GREEK_FAMILY_SPECS, buildFamilies } from './greek/creatures';
import { GREEK_LORE } from './greek/lore';
import { NEUTRAL_FAMILY_SPECS, NEUTRAL_LORE } from './common/neutrals';
import { GREEK_BUILDINGS, GREEK_TOWN } from './greek/town';
import { GREEK_GODS, GREEK_HEROES, GREEK_PANTHEON } from './greek/pantheon';
import { buildPantheonKit } from './pantheonKit';
import { EGYPTIAN_SPEC } from './egyptian/pantheon';
import { JAPANESE_SPEC } from './japanese/pantheon';
import { CELTIC_SPEC } from './celtic/pantheon';
import { MESOAMERICAN_SPEC } from './mesoamerican/pantheon';
import { buildNorseFamilies } from './norse/creatures';
import { NORSE_LORE } from './norse/lore';
import { NORSE_BUILDINGS, NORSE_TOWN } from './norse/town';
import { NORSE_GODS, NORSE_HERO_CLASSES, NORSE_HEROES, NORSE_PANTHEON } from './norse/pantheon';
import { COMING_SOON_CAMPAIGNS, ENTITLEMENTS, TEMPLATES, THREE_BEACONS, THREE_BEACONS_MISSIONS } from './campaign/threeBeacons';
import { WINTER_OATH, WINTER_OATH_ENTITLEMENTS, WINTER_OATH_MISSIONS, WINTER_OATH_TEMPLATES } from './campaign/winterOath';
import { ARC_CAMPAIGN_HEROES, buildArcCampaigns } from './campaign/arcCampaigns';
import { SKIRMISH_MAPS } from './skirmish/maps';
import { SKIRMISH_KITS, SKIRMISH_MISSIONS, SKIRMISH_SCENARIOS, SKIRMISH_TEMPLATES } from './skirmish/skirmish';
import { CLIMATE_RULES } from './common/climates';
import { AI_TEMPERAMENTS } from './common/temperaments';
import { ARTIFACT_SETS, DIFFICULTIES, DIVINE_GIFTS, EXPANDED_SKILLS, EXPANDED_SPELLS, INTERVENTIONS, MAP_EVENT_TEMPLATES, SET_ARTIFACTS, WEEKLY_EVENTS } from './common/expanded';
import { ARCANA_ARTIFACTS, ARCANA_SETS, ARCANA_SPELLS, EXISTING_LORE } from './common/arcana';
import { validateCatalog } from './validation/validators';

/** Merge the stories written for spells and artifacts that predate the Arcana library. */
function withLore<T extends { readonly id: string; readonly lore?: string }>(defs: readonly T[]): T[] {
  return defs.map((d) => (d.lore || !EXISTING_LORE[d.id] ? d : { ...d, lore: EXISTING_LORE[d.id] }));
}

export const VERSIONS: VersionBundle = {
  rulesVersion: 'pr-0.2-candidate',
  contentVersion: 'content-0.8.0',
  campaignVersion: 'campaign-three-beacons-0.4',
  mapGeneratorVersion: 'pr-mapgen-0.3',
  saveSchemaVersion: 1,
};

function index<T extends { id: string }>(items: readonly T[], kind: string): Record<string, T> {
  const out: Record<string, T> = {};
  for (const item of items) {
    if (out[item.id]) throw new Error(`Duplicate ${kind} ID "${item.id}"`);
    out[item.id] = item;
  }
  return out;
}

/** Pantheons built from compact specs by the shared kit (proposed values). */
export const KIT_SPECS = [EGYPTIAN_SPEC, JAPANESE_SPEC, CELTIC_SPEC, MESOAMERICAN_SPEC] as const;

export function buildCatalog(): ContentCatalog {
  const greek = buildFamilies(GREEK_FAMILY_SPECS);
  const norse = buildNorseFamilies();
  const neutral = buildFamilies(NEUTRAL_FAMILY_SPECS, { source: 'proposed-this-build', note: 'Neutral roster (owner request 2026-10-02); proposed values, unplaytested' });
  const kits = KIT_SPECS.map(buildPantheonKit);
  const pantheons = [GREEK_PANTHEON, NORSE_PANTHEON, ...kits.map((k) => k.pantheon)];
  const creatureList = [...greek.creatures, ...norse.creatures, ...kits.flatMap((k) => k.creatures), ...neutral.creatures];
  const creatureIndex = index(creatureList, 'creature');
  // The four arc campaigns name troops in their objectives (names come from the creatures above).
  const arc = buildArcCampaigns((id) => creatureIndex[id], (id) => creatureIndex[id]?.familyId ?? id);
  const familyIndex = index([...greek.families, ...norse.families, ...kits.flatMap((k) => k.families), ...neutral.families], 'family');
  const spellIndex = index(withLore([...SPELLS, ...EXPANDED_SPELLS, ...ARCANA_SPELLS]), 'spell');
  const godList = [...GREEK_GODS, ...NORSE_GODS, ...kits.flatMap((k) => k.gods)];
  const heroList = withSpecialties([...GREEK_HEROES, ...NORSE_HEROES, ...kits.flatMap((k) => k.heroes), ...ARC_CAMPAIGN_HEROES], { families: familyIndex, creatures: creatureIndex, spells: spellIndex });
  const catalog: ContentCatalog = {
    versions: VERSIONS,
    rulesProfile: PR_02_CANDIDATE,
    pantheons: index(pantheons, 'pantheon'),
    families: familyIndex,
    creatures: creatureIndex,
    abilities: index(ABILITIES, 'ability'),
    lore: index([...GREEK_LORE, ...NORSE_LORE, ...kits.flatMap((k) => k.lore), ...NEUTRAL_LORE], 'lore'),
    buildings: index([...GREEK_BUILDINGS, ...NORSE_BUILDINGS, ...kits.flatMap((k) => k.buildings)], 'building'),
    townArchetypes: index([GREEK_TOWN, NORSE_TOWN, ...kits.map((k) => k.town)], 'town archetype'),
    gods: index(godList, 'god'),
    godPerks: index(buildGodPerks(godList), 'god perk'),
    heroes: index(heroList, 'hero'),
    heroClasses: index([...HERO_CLASSES, ...NORSE_HERO_CLASSES, ...kits.flatMap((k) => k.classes)], 'hero class'),
    skills: index([...SKILLS, ...EXPANDED_SKILLS], 'skill'),
    spells: spellIndex,
    artifacts: index(withLore([...ARTIFACTS, ...SET_ARTIFACTS, ...ARCANA_ARTIFACTS]), 'artifact'),
    artifactSets: index([...ARTIFACT_SETS, ...ARCANA_SETS], 'artifact set'),
    difficulties: index(DIFFICULTIES, 'difficulty'),
    interventions: index(INTERVENTIONS, 'intervention'),
    divineGifts: index(DIVINE_GIFTS, 'divine gift'),
    climates: index(CLIMATE_RULES, 'climate rule'),
    aiTemperaments: index(AI_TEMPERAMENTS, 'AI temperament'),
    weeklyEvents: index(WEEKLY_EVENTS, 'weekly event'),
    skirmishKits: Object.fromEntries(SKIRMISH_KITS.map((k) => [k.pantheonId, k])),
    mapEventTemplates: index(MAP_EVENT_TEMPLATES, 'map event'),
    entitlements: index([...ENTITLEMENTS, ...WINTER_OATH_ENTITLEMENTS, ...arc.entitlements], 'entitlement'),
    campaigns: index([THREE_BEACONS, WINTER_OATH, ...arc.campaigns, ...COMING_SOON_CAMPAIGNS], 'campaign'),
    missions: index([...THREE_BEACONS_MISSIONS, ...WINTER_OATH_MISSIONS, ...arc.missions, ...SKIRMISH_MISSIONS], 'mission'),
    skirmishes: index(SKIRMISH_SCENARIOS, 'skirmish'),
    skirmishMaps: index(SKIRMISH_MAPS, 'skirmish map'),
    mapTemplates: index([...TEMPLATES, ...WINTER_OATH_TEMPLATES, ...arc.templates, ...SKIRMISH_TEMPLATES], 'map template'),
    pantheonOrder: ['greek', 'norse', 'egyptian', 'japanese', 'celtic', 'mesoamerican'],
  };
  return deepFreeze(catalog);
}

let cached: ContentCatalog | null = null;

/** The validated game catalog. Throws with every issue if validation fails. */
export function loadCatalog(): ContentCatalog {
  if (cached) return cached;
  const catalog = buildCatalog();
  const report = validateCatalog(catalog);
  if (!report.ok) {
    throw new Error(`Content validation failed:\n${report.issues.map((i) => `  [${i.validator}] ${i.message}`).join('\n')}`);
  }
  cached = catalog;
  return catalog;
}
