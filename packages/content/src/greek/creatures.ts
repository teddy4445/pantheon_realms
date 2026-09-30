/**
 * Greek creature families: seven roster families (one per tier) plus the paired
 * neutral Centaur family used by optional campaign encounters.
 *
 * Numbers: design/06 candidate values (P, unplaytested). Ability bindings:
 * production/03 §10 proposed mapping. Roster: PROVISIONAL resolution of the
 * 8-family v0.3 catalog against the owner's 7-families-per-pantheon invariant
 * (see DEVELOPMENT_STATUS.md, "Known deviations").
 */
import type { CreatureDefinition, CreatureFamilyDefinition, CreatureStats, CreatureTier, BodyProfile, CreatureRole, ResourceCost } from '@pr/rules';

export interface FormSpec {
  id: string;
  name: string;
  plural: string;
  stats: CreatureStats;
  cost: ResourceCost;
  abilities: string[];
  summary: string;
  portraitAlt: string;
}

export interface FamilySpec {
  familyId: string;
  name: string;
  pantheonId: string | null;
  tier: CreatureTier;
  growth: number;
  role: CreatureRole;
  roleLabel: string;
  body: BodyProfile;
  dwelling?: string;
  dwellingUp?: string;
  base: FormSpec;
  upgraded: FormSpec;
}

export const s = (attack: number, defense: number, hp: number, dmg: [number, number], speed: number, shots: number, footprint: 1 | 2): CreatureStats => ({
  attack,
  defense,
  hp,
  damageMin: dmg[0],
  damageMax: dmg[1],
  speed,
  shots,
  footprint,
});

export const GREEK_FAMILY_SPECS: readonly FamilySpec[] = [
  {
    familyId: 'hoplite',
    name: 'Hoplites',
    pantheonId: 'greek',
    tier: 1,
    growth: 14,
    role: 'line_infantry',
    roleLabel: 'Line infantry',
    body: 'humanoid_spear',
    dwelling: 'barracks',
    dwellingUp: 'barracks_up',
    base: {
      id: 'hoplite',
      name: 'Hoplite',
      plural: 'Hoplites',
      stats: s(4, 5, 10, [1, 3], 4, 0, 1),
      cost: { gold: 60 },
      abilities: ['charge_guard'],
      summary: 'Shield-forward spear infantry that holds narrow ground and blunts cavalry charges.',
      portraitAlt: 'A spear-and-shield soldier in a bronze helmet and pale linen tunic.',
    },
    upgraded: {
      id: 'veteran_hoplite',
      name: 'Veteran Hoplite',
      plural: 'Veteran Hoplites',
      stats: s(6, 5, 10, [2, 3], 5, 0, 1),
      cost: { gold: 75 },
      abilities: ['charge_guard'],
      summary: 'Seasoned shield-bearers with crested helmets and practiced steadiness.',
      portraitAlt: 'A crested-helmet spear soldier with reinforced shoulder armor and a command sash.',
    },
  },
  {
    familyId: 'peltast',
    name: 'Peltasts',
    pantheonId: 'greek',
    tier: 2,
    growth: 9,
    role: 'skirmisher',
    roleLabel: 'Javelin skirmisher',
    body: 'humanoid_thrower',
    dwelling: 'peltast_range',
    dwellingUp: 'peltast_range_up',
    base: {
      id: 'peltast',
      name: 'Peltast',
      plural: 'Peltasts',
      stats: s(6, 3, 10, [2, 3], 5, 12, 1),
      cost: { gold: 100 },
      abilities: ['shooter'],
      summary: 'Light javelin throwers who strike from range and need protection up close.',
      portraitAlt: 'A lightly armored skirmisher with a crescent shield and a bundle of javelins.',
    },
    upgraded: {
      id: 'veteran_peltast',
      name: 'Veteran Peltast',
      plural: 'Veteran Peltasts',
      stats: s(7, 4, 12, [3, 4], 6, 16, 1),
      cost: { gold: 150 },
      abilities: ['shooter'],
      summary: 'Experienced skirmishers who choose their own firing ground and carry more javelins.',
      portraitAlt: 'A skirmisher with a reinforced helmet, braced throwing arm and a tidy javelin harness.',
    },
  },
  {
    familyId: 'griffin',
    name: 'Griffins',
    pantheonId: 'greek',
    tier: 3,
    growth: 7,
    role: 'flying_interceptor',
    roleLabel: 'Flying interceptor',
    body: 'griffin',
    dwelling: 'griffin_aerie',
    dwellingUp: 'griffin_aerie_up',
    base: {
      id: 'griffin',
      name: 'Griffin',
      plural: 'Griffins',
      stats: s(8, 8, 25, [3, 6], 7, 0, 2),
      cost: { gold: 240 },
      abilities: ['flight', 'retaliation_2'],
      summary: 'Winged guardians that bypass the front line and answer two attacks each round.',
      portraitAlt: 'An eagle-headed, winged lion-bodied creature with tawny fur and pale head feathers.',
    },
    upgraded: {
      id: 'windcrest_griffin',
      name: 'Windcrest Griffin',
      plural: 'Windcrest Griffins',
      stats: s(9, 9, 30, [3, 6], 9, 0, 2),
      cost: { gold: 300 },
      abilities: ['flight', 'retaliation_unlimited'],
      summary: 'Guardians of the highest nests whose retaliation has no count limit.',
      portraitAlt: 'A griffin with a swept feather crest, long primary feathers and pale-blue accents.',
    },
  },
  {
    familyId: 'cavalry',
    name: 'Cavalry',
    pantheonId: 'greek',
    tier: 4,
    growth: 4,
    role: 'mounted_shock',
    roleLabel: 'Mounted shock troops',
    body: 'rider',
    dwelling: 'training_court',
    dwellingUp: 'training_court_up',
    base: {
      id: 'cavalry',
      name: 'Cavalry',
      plural: 'Cavalry',
      stats: s(10, 10, 35, [6, 9], 7, 0, 2),
      cost: { gold: 350 },
      abilities: ['charge'],
      summary: 'Lance riders whose charge grows stronger over open ground.',
      portraitAlt: 'A lance-bearing rider with a shield on a compact warhorse with a saddle blanket.',
    },
    upgraded: {
      id: 'companion_cavalry',
      name: 'Companion Cavalry',
      plural: 'Companion Cavalry',
      stats: s(12, 12, 40, [7, 10], 8, 0, 2),
      cost: { gold: 450 },
      abilities: ['charge'],
      summary: 'Trusted riders in layered armor who train together until signals are almost unnecessary.',
      portraitAlt: 'A crested rider on a horse with layered neck and chest protection.',
    },
  },
  {
    familyId: 'temple_adept',
    name: 'Temple Adepts',
    pantheonId: 'greek',
    tier: 5,
    growth: 3,
    role: 'ranged_support',
    roleLabel: 'Ranged support',
    body: 'humanoid_caster',
    dwelling: 'adept_house',
    dwellingUp: 'adept_house_up',
    base: {
      id: 'temple_adept',
      name: 'Temple Adept',
      plural: 'Temple Adepts',
      stats: s(11, 7, 30, [9, 12], 5, 12, 1),
      cost: { gold: 400 },
      abilities: ['shooter'],
      summary: 'Ritual scholars who hurl focused energy bolts from the back line.',
      portraitAlt: 'A robed scholar with a staff topped by a geometric bronze focus.',
    },
    upgraded: {
      id: 'temple_seer',
      name: 'Temple Seer',
      plural: 'Temple Seers',
      stats: s(12, 10, 35, [10, 13], 6, 16, 1),
      cost: { gold: 500 },
      abilities: ['shooter', 'family_ward'],
      summary: 'Seers who can place one shared protective ward per battle.',
      portraitAlt: 'A robed seer with a sculpted headpiece, layered mantle and a larger staff focus.',
    },
  },
  {
    familyId: 'minotaur',
    name: 'Minotaurs',
    pantheonId: 'greek',
    tier: 6,
    growth: 2,
    role: 'heavy_melee',
    roleLabel: 'Heavy melee',
    body: 'bull_biped',
    dwelling: 'labyrinth',
    dwellingUp: 'labyrinth_up',
    base: {
      id: 'minotaur',
      name: 'Minotaur',
      plural: 'Minotaurs',
      stats: s(15, 14, 95, [16, 24], 6, 0, 2),
      cost: { gold: 1000 },
      abilities: ['unyielding'],
      summary: 'Bull-headed axe fighters with reliable morale.',
      portraitAlt: 'A bull-headed biped with powerful shoulders, chest straps and a heavy axe.',
    },
    upgraded: {
      id: 'labyrinth_warden',
      name: 'Labyrinth Warden',
      plural: 'Labyrinth Wardens',
      stats: s(17, 16, 110, [20, 25], 7, 0, 2),
      cost: { gold: 1200 },
      abilities: ['unyielding'],
      summary: 'Wardens entrusted with the passages others must not lose.',
      portraitAlt: 'A minotaur in patterned chest armor with horn fittings and a heavier axe.',
    },
  },
  {
    familyId: 'cyclops',
    name: 'Cyclopes',
    pantheonId: 'greek',
    tier: 7,
    growth: 1,
    role: 'apex_ranged',
    roleLabel: 'Apex ranged giant',
    body: 'giant',
    dwelling: 'thunder_quarry',
    dwellingUp: 'thunder_quarry_up',
    base: {
      id: 'cyclops',
      name: 'Cyclops',
      plural: 'Cyclopes',
      stats: s(22, 22, 200, [40, 50], 7, 8, 2),
      cost: { gold: 3000, crystal: 1 },
      abilities: ['shooter', 'wall_breaker', 'no_melee_penalty'],
      summary: 'One-eyed giants who hurl shaped boulders and strike hard up close.',
      portraitAlt: 'A one-eyed giant with a stone satchel and simple bracers.',
    },
    upgraded: {
      id: 'stormforged_cyclops',
      name: 'Stormforged Cyclops',
      plural: 'Stormforged Cyclopes',
      stats: s(25, 25, 250, [45, 55], 8, 12, 2),
      cost: { gold: 4500, crystal: 2 },
      abilities: ['shooter', 'wall_breaker', 'no_melee_penalty'],
      summary: 'Cyclopes bearing forge-marked stones; the name adds no lightning damage.',
      portraitAlt: 'A cyclops with forged bronze bracers, engraved seams and a faintly luminous boulder.',
    },
  },
  // Neutral paired family (not part of any pantheon roster).
  {
    familyId: 'centaur',
    name: 'Centaurs',
    pantheonId: null,
    tier: 3,
    growth: 7,
    role: 'fast_melee',
    roleLabel: 'Fast ground melee (neutral)',
    body: 'centaur',
    base: {
      id: 'centaur',
      name: 'Centaur',
      plural: 'Centaurs',
      stats: s(8, 6, 22, [4, 6], 7, 0, 2),
      cost: { gold: 200 },
      abilities: [],
      summary: 'Grove-dwelling spear fighters bound by old boundary agreements. Not archers.',
      portraitAlt: 'A centaur with a chestnut coat, simple chest protection and a melee spear.',
    },
    upgraded: {
      id: 'centaur_sentinel',
      name: 'Centaur Sentinel',
      plural: 'Centaur Sentinels',
      stats: s(9, 7, 25, [4, 7], 8, 0, 2),
      cost: { gold: 250 },
      abilities: [],
      summary: 'Seasoned grove guardians who lead the first response on old boundary routes.',
      portraitAlt: 'A centaur with foreleg protection, a tied crest and a reinforced spearhead.',
    },
  },
];

function assetBase(spec: FamilySpec, form: 'base' | 'upgraded'): string {
  return spec.pantheonId ? `creature.${spec.pantheonId}.tier${spec.tier}.${form}` : `creature.neutral.${spec.familyId}.${form}`;
}

const GREEK_PROVENANCE: CreatureDefinition['provenance'] = { source: 'v0.3-catalog', note: 'design/06 candidate values; production/03 §10 ability mapping (P)' };

export function buildFamilies(
  specs: readonly FamilySpec[],
  provenance: CreatureDefinition['provenance'] = GREEK_PROVENANCE,
): { families: CreatureFamilyDefinition[]; creatures: CreatureDefinition[] } {
  const families: CreatureFamilyDefinition[] = [];
  const creatures: CreatureDefinition[] = [];
  for (const f of specs) {
    const fam: CreatureFamilyDefinition = {
      id: f.familyId,
      name: f.name,
      pantheonId: f.pantheonId,
      classification: f.pantheonId ? 'pantheon_roster' : 'neutral',
      tier: f.tier,
      baseCreatureId: f.base.id,
      upgradedCreatureId: f.upgraded.id,
      baseGrowth: f.growth,
      ...(f.dwelling ? { dwellingBuildingId: f.dwelling } : {}),
      ...(f.dwellingUp ? { upgradedDwellingBuildingId: f.dwellingUp } : {}),
      implementationStatus: 'implemented',
    };
    families.push(fam);
    for (const form of ['base', 'upgraded'] as const) {
      const spec = form === 'base' ? f.base : f.upgraded;
      const asset = assetBase(f, form);
      creatures.push({
        id: spec.id,
        familyId: f.familyId,
        pantheonId: f.pantheonId,
        tier: f.tier,
        form,
        ...(form === 'base' ? { upgradeId: f.upgraded.id } : { baseId: f.base.id }),
        name: spec.name,
        pluralName: spec.plural,
        role: f.role,
        roleLabel: f.roleLabel,
        stats: spec.stats,
        cost: spec.cost,
        abilityIds: spec.abilities,
        summary: spec.summary,
        loreId: `lore.${f.familyId}`,
        presentation: {
          bodyProfile: f.body,
          portraitAssetId: `${asset}.portrait`,
          modelAssetId: `${asset}.model`,
          animationProfileId: `anim.${f.body}`,
          portraitAlt: spec.portraitAlt,
        },
        implementationStatus: 'implemented',
        balanceStatus: 'proposed_unplaytested',
        provenance,
      });
    }
  }
  return { families, creatures };
}
