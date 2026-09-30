/**
 * ContentLoader + ContentRegistry: assembles all definitions into one indexed,
 * frozen ContentCatalog and validates it.
 */
import { PR_02_CANDIDATE, deepFreeze, type ContentCatalog, type VersionBundle } from '@pr/rules';
import { ABILITIES } from './common/abilities';
import { ARTIFACTS, HERO_CLASSES, SKILLS, SPELLS } from './common/heroesMagic';
import { GREEK_FAMILY_SPECS, buildFamilies } from './greek/creatures';
import { GREEK_LORE } from './greek/lore';
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
import { SKIRMISH_MISSIONS, SKIRMISH_SCENARIOS, SKIRMISH_TEMPLATES } from './skirmish/skirmish';
import { validateCatalog } from './validation/validators';

export const VERSIONS: VersionBundle = {
  rulesVersion: 'pr-0.2-candidate',
  contentVersion: 'content-0.5.0',
  campaignVersion: 'campaign-three-beacons-0.3',
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
  const kits = KIT_SPECS.map(buildPantheonKit);
  const pantheons = [GREEK_PANTHEON, NORSE_PANTHEON, ...kits.map((k) => k.pantheon)];
  const catalog: ContentCatalog = {
    versions: VERSIONS,
    rulesProfile: PR_02_CANDIDATE,
    pantheons: index(pantheons, 'pantheon'),
    families: index([...greek.families, ...norse.families, ...kits.flatMap((k) => k.families)], 'family'),
    creatures: index([...greek.creatures, ...norse.creatures, ...kits.flatMap((k) => k.creatures)], 'creature'),
    abilities: index(ABILITIES, 'ability'),
    lore: index([...GREEK_LORE, ...NORSE_LORE, ...kits.flatMap((k) => k.lore)], 'lore'),
    buildings: index([...GREEK_BUILDINGS, ...NORSE_BUILDINGS, ...kits.flatMap((k) => k.buildings)], 'building'),
    townArchetypes: index([GREEK_TOWN, NORSE_TOWN, ...kits.map((k) => k.town)], 'town archetype'),
    gods: index([...GREEK_GODS, ...NORSE_GODS, ...kits.flatMap((k) => k.gods)], 'god'),
    heroes: index([...GREEK_HEROES, ...NORSE_HEROES, ...kits.flatMap((k) => k.heroes)], 'hero'),
    heroClasses: index([...HERO_CLASSES, ...NORSE_HERO_CLASSES, ...kits.flatMap((k) => k.classes)], 'hero class'),
    skills: index(SKILLS, 'skill'),
    spells: index(SPELLS, 'spell'),
    artifacts: index(ARTIFACTS, 'artifact'),
    entitlements: index(ENTITLEMENTS, 'entitlement'),
    campaigns: index([THREE_BEACONS, ...COMING_SOON_CAMPAIGNS], 'campaign'),
    missions: index([...THREE_BEACONS_MISSIONS, ...SKIRMISH_MISSIONS], 'mission'),
    skirmishes: index(SKIRMISH_SCENARIOS, 'skirmish'),
    mapTemplates: index([...TEMPLATES, ...SKIRMISH_TEMPLATES], 'map template'),
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
