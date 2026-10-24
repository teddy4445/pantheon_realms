/**
 * Norse town "Frosthold": 18 logical locations (11 support + 7 dwellings).
 *
 * PROPOSED for this build. The chains, costs, prerequisites and effects mirror
 * the Greek design/03 candidate tree location by location (same functions,
 * same prices), with Norse names. Only the names, the dwelling prerequisites
 * that reference Norse families, and the placements differ — the rules see the
 * same shared effect vocabulary. Covenant gates sit on tiers 3, 6 and 7 as in
 * the Greek tree.
 *
 * Placements are percentages over the owner's Norse town concept reference
 * (x = building center, y = baseline where it meets its terrace).
 */
import type { BuildingDefinition, BuildingSlotDefinition, EffectDefinition, RequirementDefinition, ResourceCost, TownArchetypeDefinition } from '@pr/rules';
import { withH3CityArt } from '../townArt/h3City';

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
  /** Proposed this build: the three support services. */
  proposed?: boolean;
  art: string;
}

const N = 'norse';

const SUPPORT: B[] = [
  { id: 'norse_longhouse', name: 'Longhouse', slot: 'civic_hall', level: 1, cost: {}, fx: [{ type: 'daily_income', resource: 'gold', amount: 500 }], summary: 'Starting civic building. 500 Gold per day.', art: 'town.norse.support.civic_hall.l1' },
  { id: 'norse_jarls_hall', name: 'Jarl’s Hall', slot: 'civic_hall', level: 2, cost: { gold: 2500 }, req: [has('norse_mead_hall')], fx: [{ type: 'daily_income', resource: 'gold', amount: 1000 }], summary: '1,000 Gold per day in total (replaces Longhouse income).', art: 'town.norse.support.civic_hall.l2' },
  { id: 'norse_high_hall', name: 'High Hall', slot: 'civic_hall', level: 3, cost: { gold: 5000 }, req: [has('norse_smithy'), has('norse_trading_post'), has('norse_rune_circle_1')], fx: [{ type: 'daily_income', resource: 'gold', amount: 2000 }], summary: '2,000 Gold per day in total.', art: 'town.norse.support.civic_hall.l3' },
  { id: 'norse_hall_of_kings', name: 'Hall of Kings', slot: 'civic_hall', level: 4, cost: { gold: 10000 }, req: [has('norse_fortress'), { type: 'unique_per_player', buildingId: 'norse_hall_of_kings' }], fx: [{ type: 'daily_income', resource: 'gold', amount: 4000 }], summary: '4,000 Gold per day in total. One per player.', art: 'town.norse.support.civic_hall.l4' },
  { id: 'norse_mead_hall', name: 'Mead Hall', slot: 'tavern', level: 1, cost: { gold: 500, wood: 5 }, req: [has('norse_longhouse')], fx: [{ type: 'enables_hero_hiring' }], summary: 'Hire eligible heroes. Prerequisite for the Jarl’s Hall.', art: 'town.norse.support.tavern.l1' },
  { id: 'norse_trading_post', name: 'Trading Post', slot: 'marketplace', level: 1, cost: { gold: 500, wood: 5 }, req: [has('norse_longhouse')], fx: [{ type: 'enables_market' }], summary: 'Sell resources for Gold or buy them with Gold.', art: 'town.norse.support.marketplace.l1' },
  { id: 'norse_storehouse', name: 'Storehouse', slot: 'resource_depot', level: 1, cost: { gold: 5000, stone: 5 }, req: [has('norse_trading_post')], fx: [{ type: 'daily_income', resource: 'wood', amount: 1 }, { type: 'daily_income', resource: 'stone', amount: 1 }], summary: '+1 Wood and +1 Stone per day.', art: 'town.norse.support.resource_depot.l1' },
  { id: 'norse_smithy', name: 'Workshop', slot: 'workshop', level: 1, cost: { gold: 1000, wood: 5 }, req: [has('norse_longhouse')], fx: [{ type: 'enables_workshop', stockSize: 4, rarities: ['treasure'] }], summary: 'Military prerequisite (Valkyrie Aerie, High Hall). Sells four tier-1 items each week where the scenario has them; each one once a week.', art: 'town.norse.support.workshop.l1' },
  { id: 'norse_rune_circle_1', name: 'Rune Circle I', slot: 'mage_guild', level: 1, cost: { gold: 2000, wood: 5, stone: 5 }, req: [has('norse_longhouse')], fx: [{ type: 'spell_library', maxTier: 1 }, { type: 'enables_spellbook_purchase' }], summary: 'Tier-1 spells; sells spellbooks (500 Gold).', art: 'town.norse.support.mage_guild.l1' },
  { id: 'norse_rune_circle_2', name: 'Rune Circle II', slot: 'mage_guild', level: 2, cost: { gold: 1000, wood: 5, stone: 5, crystal: 4 }, fx: [{ type: 'spell_library', maxTier: 2 }, { type: 'enables_spellbook_purchase' }], summary: 'Tier-2 spells.', art: 'town.norse.support.mage_guild.l2' },
  { id: 'norse_rune_circle_3', name: 'Rune Circle III', slot: 'mage_guild', level: 3, cost: { gold: 1000, wood: 5, stone: 5, crystal: 6 }, fx: [{ type: 'spell_library', maxTier: 3 }, { type: 'enables_spellbook_purchase' }], summary: 'Tier-3 spells (Wisdom required to learn).', art: 'town.norse.support.mage_guild.l3' },
  { id: 'norse_hof_1', name: 'Hof I', slot: 'pantheon_temple', level: 1, cost: { gold: 1000, stone: 5 }, req: [has('norse_longhouse')], fx: [{ type: 'daily_income', resource: 'favor', amount: 1 }], summary: '1 Favor per day; unlocks the first minor-god choice.', art: 'town.norse.support.pantheon_temple.l1' },
  { id: 'norse_hof_2', name: 'Hof II', slot: 'pantheon_temple', level: 2, cost: { gold: 2000, wood: 5, stone: 10, crystal: 3 }, req: [has('norse_jarls_hall')], fx: [{ type: 'daily_income', resource: 'favor', amount: 2 }], summary: '2 Favor per day in total; required for the second minor-god choice.', art: 'town.norse.support.pantheon_temple.l2' },
  { id: 'norse_palisade', name: 'Palisade', slot: 'fortifications', level: 1, cost: { gold: 5000, wood: 20, stone: 20 }, req: [has('norse_longhouse')], fx: [{ type: 'siege_fortification', level: 1 }], summary: 'Perimeter walls and gate; military prerequisite.', art: 'town.norse.support.fortifications.l1' },
  { id: 'norse_stronghold', name: 'Stronghold', slot: 'fortifications', level: 2, cost: { gold: 2500, stone: 5 }, fx: [{ type: 'growth_multiplier', numerator: 3, denominator: 2 }, { type: 'siege_fortification', level: 2 }], summary: '1.5× base weekly growth; keep and moat.', art: 'town.norse.support.fortifications.l2' },
  { id: 'norse_fortress', name: 'Fortress', slot: 'fortifications', level: 3, cost: { gold: 5000, wood: 10, stone: 10 }, fx: [{ type: 'growth_multiplier', numerator: 2, denominator: 1 }, { type: 'siege_fortification', level: 3 }], summary: '2× base weekly growth; stronger walls and towers.', art: 'town.norse.support.fortifications.l3' },
  { id: 'norse_training_ground', name: 'Training Ground', slot: 'training_academy', level: 1, cost: { gold: 2000, wood: 5, stone: 5 }, req: [has('norse_mead_hall'), has('norse_barrow')], fx: [{ type: 'enables_hero_training', xp: 500, gold: 1000 }], summary: 'Once per week, each visiting hero may train: 1,000 Gold for 500 experience.', proposed: true, art: 'town.norse.support.training_academy.l1' },
  { id: 'norse_watchtower', name: 'Watchtower', slot: 'watchtower', level: 1, cost: { gold: 1500, wood: 5, stone: 5 }, req: [has('norse_palisade')], fx: [{ type: 'town_vision_radius', radius: 8 }], summary: 'The town sees 8 hexes around it (3 without a Watchtower).', proposed: true, art: 'town.norse.support.watchtower.l1' },
  { id: 'norse_rune_merchant', name: 'Rune Merchant', slot: 'artifact_merchant', level: 1, cost: { gold: 3000, wood: 5, stone: 5, crystal: 2 }, req: [has('norse_trading_post'), has('norse_jarls_hall')], fx: [{ type: 'enables_artifact_merchant', stockSize: 4 }], summary: 'Sells four artifacts to visiting heroes; the stock changes every week.', proposed: true, art: 'town.norse.support.artifact_merchant.l1' },
];

const dwell = (tier: number, familyId: string, base: B, up: B): B[] =>
  [base, up].map((b, i) => ({
    ...b,
    slot: `dwelling_t${tier}`,
    level: i + 1,
    dwelling: { familyId, form: i === 0 ? 'base' : 'upgraded' },
    art: `town.norse.dwelling.tier${tier}.${i === 0 ? 'base' : 'upgraded'}`,
  }));

const access = (...ids: string[]): EffectDefinition[] => ids.map((creatureId) => ({ type: 'recruit_access', creatureId }));

const DWELLINGS: B[] = [
  ...dwell(1, 'norse_draugr',
    { id: 'norse_barrow', name: 'Draugr Barrow', slot: '', level: 1, cost: { gold: 500, stone: 10 }, req: [has('norse_palisade')], fx: access('norse_draugr'), summary: 'Recruit Draugar. 14 per week.', art: '' },
    { id: 'norse_barrow_up', name: 'Deathless Barrow', slot: '', level: 2, cost: { gold: 1000, stone: 5 }, fx: access('norse_draugr', 'norse_deathless_draugr'), summary: 'Also recruit and train Deathless Draugar. Shares the Draugr pool.', art: '' }),
  ...dwell(2, 'norse_frost_wolf',
    { id: 'norse_wolf_den', name: 'Wolf Den', slot: '', level: 1, cost: { gold: 1000, wood: 5, stone: 5 }, req: [has('norse_barrow')], fx: access('norse_frost_wolf'), summary: 'Recruit Frost Wolves. 9 per week.', art: '' },
    { id: 'norse_wolf_den_up', name: 'Fenrir Den', slot: '', level: 2, cost: { gold: 1000, wood: 5, stone: 5 }, fx: access('norse_frost_wolf', 'norse_fenrir_wolf'), summary: 'Also recruit and train Fenrir Wolves.', art: '' }),
  ...dwell(3, 'norse_frost_troll',
    { id: 'norse_troll_cave', name: 'Troll Cave', slot: '', level: 1, cost: { gold: 2000, wood: 5, stone: 5 }, req: [has('norse_wolf_den'), has('norse_hof_1'), covenant('norse_frost_troll')], fx: access('norse_frost_troll'), summary: 'Recruit Frost Trolls. 6 per week. Requires an assigned Frost Troll covenant.', art: '' },
    { id: 'norse_troll_cave_up', name: 'Ancient Troll Cave', slot: '', level: 2, cost: { gold: 1500, stone: 5, crystal: 1 }, fx: access('norse_frost_troll', 'norse_ancient_frost_troll'), summary: 'Also recruit and train Ancient Frost Trolls.', art: '' }),
  ...dwell(4, 'norse_valkyrie',
    { id: 'norse_valkyrie_aerie', name: 'Valkyrie Aerie', slot: '', level: 1, cost: { gold: 2000, wood: 5, stone: 5 }, req: [has('norse_barrow'), has('norse_smithy')], fx: access('norse_valkyrie'), summary: 'Recruit Valkyries. 4 per week.', art: '' },
    { id: 'norse_valkyrie_aerie_up', name: 'Hall of the Chosen', slot: '', level: 2, cost: { gold: 2000, stone: 5, crystal: 2 }, fx: access('norse_valkyrie', 'norse_battle_valkyrie'), summary: 'Also recruit and train Battle Valkyries.', art: '' }),
  ...dwell(5, 'norse_lindworm',
    { id: 'norse_lindworm_roost', name: 'Lindworm Roost', slot: '', level: 1, cost: { gold: 3000, wood: 5, stone: 5, crystal: 4 }, req: [has('norse_valkyrie_aerie'), has('norse_rune_circle_1')], fx: access('norse_lindworm'), summary: 'Recruit Lindworms. 3 per week.', art: '' },
    { id: 'norse_lindworm_roost_up', name: 'Storm Roost', slot: '', level: 2, cost: { gold: 1500, wood: 2, stone: 2, crystal: 2 }, fx: access('norse_lindworm', 'norse_storm_lindworm'), summary: 'Also recruit and train Storm Lindworms.', art: '' }),
  ...dwell(6, 'norse_jotunn',
    { id: 'norse_jotunn_camp', name: 'Jotunn Camp', slot: '', level: 1, cost: { gold: 5000, wood: 10, stone: 10, crystal: 5 }, req: [has('norse_hof_2'), has('norse_valkyrie_aerie'), covenant('norse_jotunn')], fx: access('norse_jotunn'), summary: 'Recruit Jotnar. 2 per week. Requires an assigned Jotunn covenant.', art: '' },
    { id: 'norse_jotunn_camp_up', name: 'Rune Hall of the Giants', slot: '', level: 2, cost: { gold: 3000, stone: 5, crystal: 3 }, fx: access('norse_jotunn', 'norse_runic_jotunn'), summary: 'Also recruit and train Runic Jotnar.', art: '' }),
  ...dwell(7, 'norse_nidhogg_wyrm',
    { id: 'norse_serpent_lair', name: 'Serpent Lair', slot: '', level: 1, cost: { gold: 15000, wood: 10, stone: 15, crystal: 12 }, req: [has('norse_hof_2'), has('norse_lindworm_roost'), has('norse_stronghold'), covenant('norse_nidhogg_wyrm')], fx: access('norse_nidhogg_wyrm'), summary: 'Recruit Nidhogg Wyrms. 1 per week. Requires an assigned Nidhogg Wyrm covenant.', art: '' },
    { id: 'norse_serpent_lair_up', name: 'World-Serpent Lair', slot: '', level: 2, cost: { gold: 15000, stone: 10, crystal: 12 }, fx: access('norse_nidhogg_wyrm', 'norse_world_serpent_wyrm'), summary: 'Also recruit and train World-Serpent Wyrms.', art: '' }),
];

export const NORSE_BUILDINGS: readonly BuildingDefinition[] = [...SUPPORT, ...DWELLINGS].map((b) => ({
  id: b.id,
  pantheonId: N,
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
    : { source: 'proposed-this-build', note: 'Norse names; cost and prerequisites mirror the Greek design/03 location (P).' },
}));

const slot = (
  id: string,
  kind: 'support' | 'dwelling',
  label: string,
  chain: string[],
  placement: BuildingSlotDefinition['placement'],
  extra: Partial<BuildingSlotDefinition> = {},
): BuildingSlotDefinition => ({ id, kind, label, chain, placement, ...extra });

export const NORSE_TOWN: TownArchetypeDefinition = withH3CityArt({
  id: 'norse_hold',
  pantheonId: N,
  name: 'Norse Hold',
  backgroundAssetId: 'town.norse.background',
  // Aurora over the peaks at the top centre; the giant's statue stands at the top left, the great hall at the top right.
  hudAnchor: 'center',
  slots: [
    slot('civic_hall', 'support', 'Civic Hall', ['norse_longhouse', 'norse_jarls_hall', 'norse_high_hall', 'norse_hall_of_kings'], { x: 55, y: 47, width: 17, height: 17, layer: 4 }, { role: 'civic_hall' }),
    slot('pantheon_temple', 'support', 'Pantheon Temple (Hof)', ['norse_hof_1', 'norse_hof_2'], { x: 60, y: 21.5, width: 13, height: 13, layer: 2 }, { role: 'pantheon_temple' }),
    slot('mage_guild', 'support', 'Rune Circle', ['norse_rune_circle_1', 'norse_rune_circle_2', 'norse_rune_circle_3'], { x: 82, y: 21, width: 11, height: 11, layer: 2 }, { role: 'mage_guild' }),
    slot('watchtower', 'support', 'Watchtower / Observatory', ['norse_watchtower'], { x: 33, y: 35.5, width: 8, height: 8, layer: 3 }, { role: 'watchtower' }),
    slot('artifact_merchant', 'support', 'Artifact Merchant', ['norse_rune_merchant'], { x: 82, y: 31, width: 12, height: 12, layer: 3 }, { role: 'artifact_merchant' }),
    slot('tavern', 'support', 'Mead Hall / Heroes’ Lodge', ['norse_mead_hall'], { x: 36, y: 42, width: 12, height: 12, layer: 4 }, { role: 'tavern' }),
    slot('marketplace', 'support', 'Trading Post', ['norse_trading_post'], { x: 52, y: 71, width: 14, height: 14, layer: 7 }, { role: 'marketplace' }),
    slot('training_academy', 'support', 'Training Ground', ['norse_training_ground'], { x: 71, y: 43, width: 11, height: 11, layer: 4 }, { role: 'training_academy' }),
    slot('workshop', 'support', 'Workshop', ['norse_smithy'], { x: 40, y: 55.5, width: 12, height: 12, layer: 5 }, { role: 'workshop' }),
    slot('resource_depot', 'support', 'Storehouse', ['norse_storehouse'], { x: 22.5, y: 55.5, width: 13, height: 13, layer: 5 }, { role: 'resource_depot' }),
    slot('fortifications', 'support', 'Fortifications / Gatehouse', ['norse_palisade', 'norse_stronghold', 'norse_fortress'], { x: 52, y: 97, width: 22, height: 22, layer: 9 }, { role: 'fortifications' }),
    slot('dwelling_t1', 'dwelling', 'Tier 1 — Draugr Barrow', ['norse_barrow', 'norse_barrow_up'], { x: 26, y: 72, width: 14, height: 14, layer: 7 }, { tier: 1 }),
    slot('dwelling_t2', 'dwelling', 'Tier 2 — Wolf Den', ['norse_wolf_den', 'norse_wolf_den_up'], { x: 78, y: 72, width: 14, height: 14, layer: 7 }, { tier: 2 }),
    slot('dwelling_t3', 'dwelling', 'Tier 3 — Troll Cave', ['norse_troll_cave', 'norse_troll_cave_up'], { x: 66, y: 56.5, width: 12, height: 12, layer: 5 }, { tier: 3 }),
    slot('dwelling_t4', 'dwelling', 'Tier 4 — Valkyrie Aerie', ['norse_valkyrie_aerie', 'norse_valkyrie_aerie_up'], { x: 51, y: 31, width: 12, height: 12, layer: 3 }, { tier: 4 }),
    slot('dwelling_t5', 'dwelling', 'Tier 5 — Lindworm Roost', ['norse_lindworm_roost', 'norse_lindworm_roost_up'], { x: 86, y: 53.5, width: 13, height: 13, layer: 5 }, { tier: 5 }),
    slot('dwelling_t6', 'dwelling', 'Tier 6 — Jotunn Camp', ['norse_jotunn_camp', 'norse_jotunn_camp_up'], { x: 11, y: 47, width: 12, height: 12, layer: 4 }, { tier: 6 }),
    slot('dwelling_t7', 'dwelling', 'Tier 7 — Serpent Lair', ['norse_serpent_lair', 'norse_serpent_lair_up'], { x: 88, y: 93, width: 14, height: 14, layer: 8 }, { tier: 7 }),
  ],
});
