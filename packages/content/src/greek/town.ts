/**
 * Greek town: 18 logical locations (11 support + 7 dwellings) and the building
 * chains they hold. Costs/requirements: design/03 candidate values (P).
 *
 * Mapping of the v0.3 32-building catalog onto 18 locations (this build):
 *   Civic Hall: village_hall -> town_hall -> city_hall -> capitol
 *   Fortifications: fort -> citadel -> castle
 *   Mage Guild / Sanctum: sanctum_1 -> sanctum_2 -> sanctum_3
 *   Pantheon Temple: temple_1 -> temple_2
 *   Resource Depot: supply_depot; Workshop; Tavern; Marketplace (one level each)
 *   Training Academy, Watchtower, Artifact Merchant: one level each, PROPOSED this build
 *   Dwellings: base -> upgraded at the same location.
 * The v0.3 Centaur Grove pair is not part of the Greek roster in this build.
 *
 * Placements are percentages over the town composition (x = building center,
 * y = baseline where it meets its platform) matched to the empty terraces of
 * the owner's Greek town concept reference. The central agora hosts the Marketplace.
 */
import type { BuildingDefinition, BuildingSlotDefinition, EffectDefinition, RequirementDefinition, ResourceCost, TownArchetypeDefinition } from '@pr/rules';

const has = (buildingId: string): RequirementDefinition => ({ type: 'has_building', buildingId });
const covenant = (familyId: string): RequirementDefinition => ({ type: 'town_has_covenant', familyId });

interface B {
  id: string;
  name: string;
  slot: string;
  level: number;
  cost: ResourceCost;
  req?: RequirementDefinition[];
  fx?: EffectDefinition[];
  summary: string;
  dwelling?: { familyId: string; form: 'base' | 'upgraded' };
  planned?: boolean;
  /** Proposed this build (no document value): the three support services. */
  proposed?: boolean;
  art: string;
}

const G = 'greek';

const SUPPORT: B[] = [
  { id: 'village_hall', name: 'Village Hall', slot: 'civic_hall', level: 1, cost: {}, fx: [{ type: 'daily_income', resource: 'gold', amount: 500 }], summary: 'Starting civic building. 500 Gold per day.', art: 'town.greek.support.civic_hall.l1' },
  { id: 'town_hall', name: 'Town Hall', slot: 'civic_hall', level: 2, cost: { gold: 2500 }, req: [has('tavern')], fx: [{ type: 'daily_income', resource: 'gold', amount: 1000 }], summary: '1,000 Gold per day in total (replaces Village Hall income).', art: 'town.greek.support.civic_hall.l2' },
  { id: 'city_hall', name: 'City Hall', slot: 'civic_hall', level: 3, cost: { gold: 5000 }, req: [has('workshop'), has('market'), has('sanctum_1')], fx: [{ type: 'daily_income', resource: 'gold', amount: 2000 }], summary: '2,000 Gold per day in total.', art: 'town.greek.support.civic_hall.l3' },
  { id: 'capitol', name: 'Capitol', slot: 'civic_hall', level: 4, cost: { gold: 10000 }, req: [has('castle'), { type: 'unique_per_player', buildingId: 'capitol' }], fx: [{ type: 'daily_income', resource: 'gold', amount: 4000 }], summary: '4,000 Gold per day in total. One Capitol per player.', art: 'town.greek.support.civic_hall.l4' },
  { id: 'tavern', name: 'Tavern', slot: 'tavern', level: 1, cost: { gold: 500, wood: 5 }, req: [has('village_hall')], fx: [{ type: 'enables_hero_hiring' }], summary: 'Hire eligible heroes. Prerequisite for the Town Hall.', art: 'town.greek.support.tavern.l1' },
  { id: 'market', name: 'Marketplace', slot: 'marketplace', level: 1, cost: { gold: 500, wood: 5 }, req: [has('village_hall')], fx: [{ type: 'enables_market' }], summary: 'Sell resources for Gold or buy them with Gold.', art: 'town.greek.support.marketplace.l1' },
  { id: 'supply_depot', name: 'Resource Depot', slot: 'resource_depot', level: 1, cost: { gold: 5000, stone: 5 }, req: [has('market')], fx: [{ type: 'daily_income', resource: 'wood', amount: 1 }, { type: 'daily_income', resource: 'stone', amount: 1 }], summary: '+1 Wood and +1 Stone per day.', art: 'town.greek.support.resource_depot.l1' },
  { id: 'workshop', name: 'Workshop', slot: 'workshop', level: 1, cost: { gold: 1000, wood: 5 }, req: [has('village_hall')], fx: [{ type: 'enables_workshop', stockSize: 4, rarities: ['treasure'] }], summary: 'Military prerequisite (Training Court, City Hall). Sells four tier-1 items each week where the scenario has them; each one once a week.', art: 'town.greek.support.workshop.l1' },
  { id: 'sanctum_1', name: 'Sanctum I', slot: 'mage_guild', level: 1, cost: { gold: 2000, wood: 5, stone: 5 }, req: [has('village_hall')], fx: [{ type: 'spell_library', maxTier: 1 }, { type: 'enables_spellbook_purchase' }], summary: 'Tier-1 spells; sells spellbooks (500 Gold).', art: 'town.greek.support.mage_guild.l1' },
  { id: 'sanctum_2', name: 'Sanctum II', slot: 'mage_guild', level: 2, cost: { gold: 1000, wood: 5, stone: 5, crystal: 4 }, fx: [{ type: 'spell_library', maxTier: 2 }, { type: 'enables_spellbook_purchase' }], summary: 'Tier-2 spells.', art: 'town.greek.support.mage_guild.l2' },
  { id: 'sanctum_3', name: 'Sanctum III', slot: 'mage_guild', level: 3, cost: { gold: 1000, wood: 5, stone: 5, crystal: 6 }, fx: [{ type: 'spell_library', maxTier: 3 }, { type: 'enables_spellbook_purchase' }], summary: 'Tier-3 spells (Wisdom required to learn).', art: 'town.greek.support.mage_guild.l3' },
  { id: 'temple_1', name: 'Temple I', slot: 'pantheon_temple', level: 1, cost: { gold: 1000, stone: 5 }, req: [has('village_hall')], fx: [{ type: 'daily_income', resource: 'favor', amount: 1 }], summary: '1 Favor per day; unlocks the first minor-god choice.', art: 'town.greek.support.pantheon_temple.l1' },
  { id: 'temple_2', name: 'Temple II', slot: 'pantheon_temple', level: 2, cost: { gold: 2000, wood: 5, stone: 10, crystal: 3 }, req: [has('town_hall')], fx: [{ type: 'daily_income', resource: 'favor', amount: 2 }], summary: '2 Favor per day in total; required for the second minor-god choice.', art: 'town.greek.support.pantheon_temple.l2' },
  { id: 'fort', name: 'Fort', slot: 'fortifications', level: 1, cost: { gold: 5000, wood: 20, stone: 20 }, req: [has('village_hall')], fx: [{ type: 'siege_fortification', level: 1 }], summary: 'Perimeter walls and gate; military prerequisite.', art: 'town.greek.support.fortifications.l1' },
  { id: 'citadel', name: 'Citadel', slot: 'fortifications', level: 2, cost: { gold: 2500, stone: 5 }, fx: [{ type: 'growth_multiplier', numerator: 3, denominator: 2 }, { type: 'siege_fortification', level: 2 }], summary: '1.5× base weekly growth; keep and moat.', art: 'town.greek.support.fortifications.l2' },
  { id: 'castle', name: 'Castle', slot: 'fortifications', level: 3, cost: { gold: 5000, wood: 10, stone: 10 }, fx: [{ type: 'growth_multiplier', numerator: 2, denominator: 1 }, { type: 'siege_fortification', level: 3 }], summary: '2× base weekly growth; stronger walls and towers.', art: 'town.greek.support.fortifications.l3' },
  { id: 'training_academy', name: 'Training Academy', slot: 'training_academy', level: 1, cost: { gold: 2000, wood: 5, stone: 5 }, req: [has('tavern'), has('barracks')], fx: [{ type: 'enables_hero_training', xp: 500, gold: 1000 }], summary: 'Once per week, each visiting hero may train: 1,000 Gold for 500 experience.', proposed: true, art: 'town.greek.support.training_academy.l1' },
  { id: 'watchtower', name: 'Watchtower', slot: 'watchtower', level: 1, cost: { gold: 1500, wood: 5, stone: 5 }, req: [has('fort')], fx: [{ type: 'town_vision_radius', radius: 8 }], summary: 'The town sees 8 hexes around it (3 without a Watchtower).', proposed: true, art: 'town.greek.support.watchtower.l1' },
  { id: 'artifact_merchant', name: 'Artifact Merchant', slot: 'artifact_merchant', level: 1, cost: { gold: 3000, wood: 5, stone: 5, crystal: 2 }, req: [has('market'), has('town_hall')], fx: [{ type: 'enables_artifact_merchant', stockSize: 4 }], summary: 'Sells four artifacts to visiting heroes; the stock changes every week.', proposed: true, art: 'town.greek.support.artifact_merchant.l1' },
];

const dwell = (tier: number, familyId: string, base: B, up: B): B[] => [base, up].map((b, i) => ({
  ...b,
  slot: `dwelling_t${tier}`,
  level: i + 1,
  dwelling: { familyId, form: i === 0 ? 'base' : 'upgraded' },
  art: `town.greek.dwelling.tier${tier}.${i === 0 ? 'base' : 'upgraded'}`,
}));

const DWELLINGS: B[] = [
  ...dwell(1, 'hoplite',
    { id: 'barracks', name: 'Barracks', slot: '', level: 1, cost: { gold: 500, stone: 10 }, req: [has('fort')], fx: [{ type: 'recruit_access', creatureId: 'hoplite' }], summary: 'Recruit Hoplites. 14 per week.', art: '' },
    { id: 'barracks_up', name: 'Veteran Barracks', slot: '', level: 2, cost: { gold: 1000, stone: 5 }, fx: [{ type: 'recruit_access', creatureId: 'hoplite' }, { type: 'recruit_access', creatureId: 'veteran_hoplite' }], summary: 'Also recruit and train Veteran Hoplites. Shares the Hoplite pool.', art: '' }),
  ...dwell(2, 'peltast',
    { id: 'peltast_range', name: 'Peltast Range', slot: '', level: 1, cost: { gold: 1000, wood: 5, stone: 5 }, req: [has('barracks')], fx: [{ type: 'recruit_access', creatureId: 'peltast' }], summary: 'Recruit Peltasts. 9 per week.', art: '' },
    { id: 'peltast_range_up', name: 'Veteran Range', slot: '', level: 2, cost: { gold: 1000, wood: 5, stone: 5 }, fx: [{ type: 'recruit_access', creatureId: 'peltast' }, { type: 'recruit_access', creatureId: 'veteran_peltast' }], summary: 'Also recruit and train Veteran Peltasts.', art: '' }),
  ...dwell(3, 'griffin',
    { id: 'griffin_aerie', name: 'Griffin Aerie', slot: '', level: 1, cost: { gold: 2000, wood: 5, stone: 5 }, req: [has('peltast_range'), has('temple_1'), covenant('griffin')], fx: [{ type: 'recruit_access', creatureId: 'griffin' }], summary: 'Recruit Griffins. 7 per week. Requires an assigned Griffin covenant.', art: '' },
    { id: 'griffin_aerie_up', name: 'Windcrest Aerie', slot: '', level: 2, cost: { gold: 1500, stone: 5, crystal: 1 }, fx: [{ type: 'recruit_access', creatureId: 'griffin' }, { type: 'recruit_access', creatureId: 'windcrest_griffin' }], summary: 'Also recruit and train Windcrest Griffins.', art: '' }),
  ...dwell(4, 'cavalry',
    { id: 'training_court', name: 'Training Court', slot: '', level: 1, cost: { gold: 2000, wood: 5, stone: 5 }, req: [has('barracks'), has('workshop')], fx: [{ type: 'recruit_access', creatureId: 'cavalry' }], summary: 'Recruit Cavalry. 4 per week.', art: '' },
    { id: 'training_court_up', name: 'Companion Court', slot: '', level: 2, cost: { gold: 2000, stone: 5, crystal: 2 }, fx: [{ type: 'recruit_access', creatureId: 'cavalry' }, { type: 'recruit_access', creatureId: 'companion_cavalry' }], summary: 'Also recruit and train Companion Cavalry.', art: '' }),
  ...dwell(5, 'temple_adept',
    { id: 'adept_house', name: 'House of Adepts', slot: '', level: 1, cost: { gold: 3000, wood: 5, stone: 5, crystal: 4 }, req: [has('training_court'), has('sanctum_1')], fx: [{ type: 'recruit_access', creatureId: 'temple_adept' }], summary: 'Recruit Temple Adepts. 3 per week.', art: '' },
    { id: 'adept_house_up', name: 'House of Seers', slot: '', level: 2, cost: { gold: 1500, wood: 2, stone: 2, crystal: 2 }, fx: [{ type: 'recruit_access', creatureId: 'temple_adept' }, { type: 'recruit_access', creatureId: 'temple_seer' }], summary: 'Also recruit and train Temple Seers.', art: '' }),
  ...dwell(6, 'minotaur',
    { id: 'labyrinth', name: 'Labyrinth', slot: '', level: 1, cost: { gold: 5000, wood: 10, stone: 10, crystal: 5 }, req: [has('temple_2'), has('training_court'), covenant('minotaur')], fx: [{ type: 'recruit_access', creatureId: 'minotaur' }], summary: 'Recruit Minotaurs. 2 per week. Requires an assigned Minotaur covenant.', art: '' },
    { id: 'labyrinth_up', name: 'Warden Labyrinth', slot: '', level: 2, cost: { gold: 3000, stone: 5, crystal: 3 }, fx: [{ type: 'recruit_access', creatureId: 'minotaur' }, { type: 'recruit_access', creatureId: 'labyrinth_warden' }], summary: 'Also recruit and train Labyrinth Wardens.', art: '' }),
  ...dwell(7, 'cyclops',
    { id: 'thunder_quarry', name: 'Thunder Quarry', slot: '', level: 1, cost: { gold: 15000, wood: 10, stone: 15, crystal: 12 }, req: [has('temple_2'), has('adept_house'), has('citadel'), covenant('cyclops')], fx: [{ type: 'recruit_access', creatureId: 'cyclops' }], summary: 'Recruit Cyclopes. 1 per week. Requires an assigned Cyclops covenant.', art: '' },
    { id: 'thunder_quarry_up', name: 'Storm Forge', slot: '', level: 2, cost: { gold: 15000, stone: 10, crystal: 12 }, fx: [{ type: 'recruit_access', creatureId: 'cyclops' }, { type: 'recruit_access', creatureId: 'stormforged_cyclops' }], summary: 'Also recruit and train Stormforged Cyclopes.', art: '' }),
];

export const GREEK_BUILDINGS: readonly BuildingDefinition[] = [...SUPPORT, ...DWELLINGS].map((b) => ({
  id: b.id,
  pantheonId: G,
  name: b.name,
  slotId: b.slot,
  level: b.level,
  cost: b.cost,
  requirements: b.req ?? [],
  effects: b.fx ?? [],
  ...(b.dwelling ? { dwelling: { familyId: b.dwelling.familyId, form: b.dwelling.form, grantsInitialPopulation: b.dwelling.form === 'base' } } : {}),
  summary: b.summary,
  implementationStatus: b.planned ? 'planned' : 'implemented',
  artAssetId: b.art,
  provenance: b.planned
    ? { source: 'owner-architecture', note: 'Location from the owner architecture; mechanics not yet designed.' }
    : b.proposed
      ? { source: 'proposed-this-build', note: 'Location from the owner architecture; mechanics, cost and prerequisites proposed this build (P).' }
      : { source: 'v0.3-catalog', note: 'design/03 candidate cost and prerequisites (P)' },
}));

const slot = (
  id: string,
  kind: 'support' | 'dwelling',
  label: string,
  chain: string[],
  placement: BuildingSlotDefinition['placement'],
  extra: Partial<BuildingSlotDefinition> = {},
): BuildingSlotDefinition => ({ id, kind, label, chain, placement, ...extra });

export const GREEK_TOWN: TownArchetypeDefinition = {
  id: 'greek_polis',
  pantheonId: G,
  name: 'Greek Polis',
  backgroundAssetId: 'town.greek.background',
  // Sky and sea at the top left; Athena's statue stands at the top centre-right.
  hudAnchor: 'left',
  slots: [
    slot('civic_hall', 'support', 'Civic Hall', ['village_hall', 'town_hall', 'city_hall', 'capitol'], { x: 51, y: 38, width: 18, height: 18, layer: 4 }, { role: 'civic_hall' }),
    slot('pantheon_temple', 'support', 'Pantheon Temple', ['temple_1', 'temple_2'], { x: 47.5, y: 23, width: 14, height: 14, layer: 2 }, { role: 'pantheon_temple' }),
    slot('mage_guild', 'support', 'Mage Guild / Sanctum', ['sanctum_1', 'sanctum_2', 'sanctum_3'], { x: 63.5, y: 29, width: 13, height: 13, layer: 2 }, { role: 'mage_guild' }),
    slot('watchtower', 'support', 'Watchtower / Observatory', ['watchtower'], { x: 92, y: 27, width: 8, height: 8, layer: 2 }, { role: 'watchtower' }),
    slot('artifact_merchant', 'support', 'Artifact Merchant', ['artifact_merchant'], { x: 75, y: 39, width: 13, height: 13, layer: 4 }, { role: 'artifact_merchant' }),
    slot('tavern', 'support', 'Tavern / Heroes’ Lodge', ['tavern'], { x: 30, y: 43.5, width: 12, height: 12, layer: 4 }, { role: 'tavern' }),
    slot('marketplace', 'support', 'Marketplace', ['market'], { x: 51, y: 75, width: 14, height: 14, layer: 7 }, { role: 'marketplace' }),
    slot('training_academy', 'support', 'Training Academy', ['training_academy'], { x: 78, y: 57.5, width: 14, height: 14, layer: 5 }, { role: 'training_academy' }),
    slot('workshop', 'support', 'Workshop', ['workshop'], { x: 21, y: 74.5, width: 13, height: 13, layer: 7 }, { role: 'workshop' }),
    slot('resource_depot', 'support', 'Resource Depot', ['supply_depot'], { x: 33, y: 75.5, width: 11, height: 11, layer: 7 }, { role: 'resource_depot' }),
    slot('fortifications', 'support', 'Fortifications / Gatehouse', ['fort', 'citadel', 'castle'], { x: 51, y: 98, width: 22, height: 22, layer: 9 }, { role: 'fortifications' }),
    slot('dwelling_t1', 'dwelling', 'Tier 1 — Barracks', ['barracks', 'barracks_up'], { x: 67, y: 74.5, width: 13, height: 13, layer: 7 }, { tier: 1 }),
    slot('dwelling_t2', 'dwelling', 'Tier 2 — Peltast Range', ['peltast_range', 'peltast_range_up'], { x: 82, y: 74.5, width: 13, height: 13, layer: 7 }, { tier: 2 }),
    slot('dwelling_t3', 'dwelling', 'Tier 3 — Griffin Aerie', ['griffin_aerie', 'griffin_aerie_up'], { x: 89, y: 46, width: 12, height: 12, layer: 4 }, { tier: 3 }),
    slot('dwelling_t4', 'dwelling', 'Tier 4 — Training Court', ['training_court', 'training_court_up'], { x: 26, y: 34, width: 13, height: 13, layer: 3 }, { tier: 4 }),
    slot('dwelling_t5', 'dwelling', 'Tier 5 — House of Adepts', ['adept_house', 'adept_house_up'], { x: 19.5, y: 56, width: 12, height: 12, layer: 5 }, { tier: 5 }),
    slot('dwelling_t6', 'dwelling', 'Tier 6 — Labyrinth', ['labyrinth', 'labyrinth_up'], { x: 90.5, y: 64, width: 11, height: 11, layer: 6 }, { tier: 6 }),
    slot('dwelling_t7', 'dwelling', 'Tier 7 — Thunder Quarry', ['thunder_quarry', 'thunder_quarry_up'], { x: 8, y: 67, width: 12, height: 12, layer: 6 }, { tier: 7 }),
  ],
};
