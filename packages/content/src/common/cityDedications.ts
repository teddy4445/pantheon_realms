/**
 * City dedications (CITY DEDICATIONS handoff, 2026-10-17; app 1.5.0): the 60 authored
 * god profiles, the eleven town-service rules and the feature's terms, exactly as
 * delivered in docs/divine-city-benefits-v1/design/ (god-city-profiles.json,
 * service-rules.json, feature-policy.json). Proposed values, unplaytested; tune them
 * HERE (data), never with code branches. packages/content/test/cityDedications.test.ts
 * checks this table against the delivered JSON.
 */
import type { CityDedicationPolicy, CityDedicationProfile, CityServiceRule } from '@pr/rules';

export const CITY_SERVICE_RULES: readonly CityServiceRule[] = [
  { id: 'training', name: 'Hero training', kind: 'gold_discount', percent: 20, requiredRole: 'training_academy', summary: '20% less Gold for weekly hero training; XP and the once-per-hero-per-week limit stay unchanged.' },
  { id: 'trade', name: 'Market purchases', kind: 'market_buy_discount', percent: 10, requiredRole: 'marketplace', summary: '10% less Gold when buying Wood, Stone or Crystal at this city; selling prices stay unchanged.' },
  { id: 'fortify', name: 'Fortification construction', kind: 'construction_gold_discount', percent: 10, targetRole: 'fortifications', summary: '10% less Gold to build or upgrade this city’s Fort, Citadel and Castle; material costs and one build per day stay unchanged.' },
  { id: 'library', name: 'Library construction', kind: 'construction_gold_discount', percent: 10, targetRole: 'mage_guild', summary: '10% less Gold to build or upgrade this city’s spell library; material costs and spell prerequisites stay unchanged.' },
  { id: 'spellbook', name: 'Spellbook purchase', kind: 'gold_discount', percent: 25, requiredRole: 'mage_guild', requiredEffect: 'enables_spellbook_purchase', summary: '25% less Gold for a visiting hero’s spellbook. Learning eligible spells remains free, as in the current game.' },
  { id: 'recruit', name: 'Favored recruitment', kind: 'family_recruit_gold_discount', percent: 5, requiredRole: 'favored_dwelling', summary: '5% less Gold per recruited member of the favored family, both unlocked forms. Other resources, population and access checks stay unchanged.' },
  { id: 'upgrade', name: 'Favored troop training', kind: 'family_upgrade_gold_discount', percent: 15, requiredRole: 'favored_upgraded_dwelling', summary: '15% less Gold on the normal per-unit upgrade price difference for the favored family in this city. No extra stock is consumed.' },
  { id: 'equipment', name: 'Artifact purchases', kind: 'shop_gold_discount', percent: 10, requiredRolesAny: ['artifact_merchant', 'workshop'], summary: '10% less Gold for purchases from this city’s Artifact Merchant or Workshop. Stocks, rarities and other resource costs stay unchanged.' },
  { id: 'watch', name: 'Watchtower vision', kind: 'town_vision_bonus', amount: 2, requiredRole: 'watchtower', summary: '+2 hexes to this city’s existing vision radius while its Watchtower is built; no hero vision bonus and no fog-map reveal on dedication.' },
  { id: 'dwelling', name: 'Favored dwelling construction', kind: 'family_dwelling_gold_discount', percent: 10, targetRole: 'favored_dwelling', summary: '10% less Gold to build or upgrade the favored family’s dwelling in this city. No new creature access or covenant is granted.' },
  { id: 'civic', name: 'Civic construction', kind: 'construction_gold_discount', percent: 10, targetRole: 'civic_hall', summary: '10% less Gold on this city’s civic-hall upgrades; level prerequisites and construction limits stay unchanged.' },
];

/**
 * Tuning after the delivery (owner decision 2026-10-17), recorded here and checked by
 * packages/content/test/cityDedications.test.ts: the two gods who lost the most empire-wide
 * income break even at about three dedicated cities instead of four to six.
 *  - Inari: 600 → 1,200 Gold a week (legacy +300 Gold and +1 Wood a day empire-wide);
 *  - Njord: 4 Wood → 3 Crystal a week (legacy +200 Gold and +1 Crystal a day empire-wide).
 */
export const CITY_DEDICATION_TUNING: Readonly<Record<string, { readonly delivered: Readonly<Record<string, number>>; readonly tuned: Readonly<Record<string, number>> }>> = {
  japanese_inari: { delivered: { gold: 600 }, tuned: { gold: 1200 } },
  norse_njord: { delivered: { wood: 4 }, tuned: { crystal: 3 } },
};

/** One profile per god: weekly gift, favored family and its weekly quarter-creatures, service. */
export const CITY_DEDICATION_PROFILES: readonly CityDedicationProfile[] = [
  { godId: 'zeus', weeklyResource: { crystal: 1 }, favoredFamilyId: 'cyclops', weeklyGrowthQuarters: 1, serviceId: 'fortify' },
  { godId: 'athena', weeklyResource: { stone: 3 }, favoredFamilyId: 'hoplite', weeklyGrowthQuarters: 8, serviceId: 'training' },
  { godId: 'ares', weeklyResource: { gold: 300 }, favoredFamilyId: 'peltast', weeklyGrowthQuarters: 8, serviceId: 'upgrade' },
  { godId: 'apollo', weeklyResource: { crystal: 1 }, favoredFamilyId: 'temple_adept', weeklyGrowthQuarters: 4, serviceId: 'spellbook' },
  { godId: 'artemis', weeklyResource: { wood: 3 }, favoredFamilyId: 'griffin', weeklyGrowthQuarters: 4, serviceId: 'watch' },
  { godId: 'hermes', weeklyResource: { gold: 600 }, favoredFamilyId: 'cavalry', weeklyGrowthQuarters: 4, serviceId: 'trade' },
  { godId: 'demeter', weeklyResource: { wood: 4 }, favoredFamilyId: 'hoplite', weeklyGrowthQuarters: 8, serviceId: 'recruit' },
  { godId: 'hades', weeklyResource: { stone: 3 }, favoredFamilyId: 'minotaur', weeklyGrowthQuarters: 2, serviceId: 'upgrade' },
  { godId: 'poseidon', weeklyResource: { wood: 3 }, favoredFamilyId: 'cavalry', weeklyGrowthQuarters: 4, serviceId: 'dwelling' },
  { godId: 'hera', weeklyResource: { gold: 400 }, favoredFamilyId: 'griffin', weeklyGrowthQuarters: 4, serviceId: 'civic' },
  { godId: 'norse_odin', weeklyResource: { crystal: 1 }, favoredFamilyId: 'norse_lindworm', weeklyGrowthQuarters: 4, serviceId: 'spellbook' },
  { godId: 'norse_thor', weeklyResource: { stone: 3 }, favoredFamilyId: 'norse_jotunn', weeklyGrowthQuarters: 2, serviceId: 'fortify' },
  { godId: 'norse_tyr', weeklyResource: { stone: 3 }, favoredFamilyId: 'norse_draugr', weeklyGrowthQuarters: 8, serviceId: 'training' },
  { godId: 'norse_frigg', weeklyResource: { crystal: 1 }, favoredFamilyId: 'norse_valkyrie', weeklyGrowthQuarters: 4, serviceId: 'watch' },
  { godId: 'norse_baldr', weeklyResource: { gold: 300 }, favoredFamilyId: 'norse_valkyrie', weeklyGrowthQuarters: 4, serviceId: 'library' },
  { godId: 'norse_freyja', weeklyResource: { wood: 4 }, favoredFamilyId: 'norse_valkyrie', weeklyGrowthQuarters: 4, serviceId: 'recruit' },
  { godId: 'norse_heimdall', weeklyResource: { stone: 3 }, favoredFamilyId: 'norse_draugr', weeklyGrowthQuarters: 8, serviceId: 'watch' },
  { godId: 'norse_hel', weeklyResource: { crystal: 1 }, favoredFamilyId: 'norse_draugr', weeklyGrowthQuarters: 8, serviceId: 'upgrade' },
  { godId: 'norse_loki', weeklyResource: { gold: 400 }, favoredFamilyId: 'norse_lindworm', weeklyGrowthQuarters: 4, serviceId: 'equipment' },
  { godId: 'norse_njord', weeklyResource: { crystal: 3 }, favoredFamilyId: 'norse_frost_troll', weeklyGrowthQuarters: 4, serviceId: 'trade' },
  { godId: 'egyptian_ra', weeklyResource: { gold: 400 }, favoredFamilyId: 'egyptian_sacred_scarab', weeklyGrowthQuarters: 8, serviceId: 'civic' },
  { godId: 'egyptian_set', weeklyResource: { stone: 3 }, favoredFamilyId: 'egyptian_desert_colossus', weeklyGrowthQuarters: 1, serviceId: 'fortify' },
  { godId: 'egyptian_isis', weeklyResource: { crystal: 1 }, favoredFamilyId: 'egyptian_bennu', weeklyGrowthQuarters: 2, serviceId: 'library' },
  { godId: 'egyptian_anubis', weeklyResource: { crystal: 1 }, favoredFamilyId: 'egyptian_jackal_guardian', weeklyGrowthQuarters: 8, serviceId: 'upgrade' },
  { godId: 'egyptian_bastet', weeklyResource: { gold: 300 }, favoredFamilyId: 'egyptian_sphinx', weeklyGrowthQuarters: 4, serviceId: 'watch' },
  { godId: 'egyptian_osiris', weeklyResource: { stone: 3 }, favoredFamilyId: 'egyptian_ushabti', weeklyGrowthQuarters: 4, serviceId: 'recruit' },
  { godId: 'egyptian_thoth', weeklyResource: { crystal: 2 }, favoredFamilyId: 'egyptian_sphinx', weeklyGrowthQuarters: 4, serviceId: 'spellbook' },
  { godId: 'egyptian_horus', weeklyResource: { wood: 3 }, favoredFamilyId: 'egyptian_bennu', weeklyGrowthQuarters: 2, serviceId: 'training' },
  { godId: 'egyptian_hathor', weeklyResource: { gold: 600 }, favoredFamilyId: 'egyptian_sacred_scarab', weeklyGrowthQuarters: 8, serviceId: 'trade' },
  { godId: 'egyptian_sobek', weeklyResource: { stone: 3 }, favoredFamilyId: 'egyptian_crocodile_beast', weeklyGrowthQuarters: 4, serviceId: 'dwelling' },
  { godId: 'japanese_amaterasu', weeklyResource: { gold: 400 }, favoredFamilyId: 'japanese_kitsune', weeklyGrowthQuarters: 8, serviceId: 'civic' },
  { godId: 'japanese_hachiman', weeklyResource: { stone: 3 }, favoredFamilyId: 'japanese_oni', weeklyGrowthQuarters: 4, serviceId: 'training' },
  { godId: 'japanese_susanoo', weeklyResource: { wood: 3 }, favoredFamilyId: 'japanese_orochi', weeklyGrowthQuarters: 1, serviceId: 'fortify' },
  { godId: 'japanese_tsukuyomi', weeklyResource: { crystal: 1 }, favoredFamilyId: 'japanese_jorogumo', weeklyGrowthQuarters: 4, serviceId: 'watch' },
  { godId: 'japanese_benzaiten', weeklyResource: { crystal: 1 }, favoredFamilyId: 'japanese_kirin', weeklyGrowthQuarters: 2, serviceId: 'spellbook' },
  { godId: 'japanese_inari', weeklyResource: { gold: 1200 }, favoredFamilyId: 'japanese_kitsune', weeklyGrowthQuarters: 8, serviceId: 'recruit' },
  { godId: 'japanese_fujin', weeklyResource: { wood: 3 }, favoredFamilyId: 'japanese_tengu', weeklyGrowthQuarters: 4, serviceId: 'dwelling' },
  { godId: 'japanese_raijin', weeklyResource: { crystal: 2 }, favoredFamilyId: 'japanese_kirin', weeklyGrowthQuarters: 2, serviceId: 'upgrade' },
  { godId: 'japanese_izanagi', weeklyResource: { stone: 4 }, favoredFamilyId: 'japanese_kappa', weeklyGrowthQuarters: 8, serviceId: 'library' },
  { godId: 'japanese_izanami', weeklyResource: { crystal: 1 }, favoredFamilyId: 'japanese_jorogumo', weeklyGrowthQuarters: 4, serviceId: 'equipment' },
  { godId: 'celtic_dagda', weeklyResource: { wood: 4 }, favoredFamilyId: 'celtic_pooka', weeklyGrowthQuarters: 8, serviceId: 'civic' },
  { godId: 'celtic_morrigan', weeklyResource: { crystal: 1 }, favoredFamilyId: 'celtic_banshee', weeklyGrowthQuarters: 4, serviceId: 'upgrade' },
  { godId: 'celtic_brigid', weeklyResource: { stone: 3 }, favoredFamilyId: 'celtic_cu_sith', weeklyGrowthQuarters: 8, serviceId: 'fortify' },
  { godId: 'celtic_nuada', weeklyResource: { gold: 300 }, favoredFamilyId: 'celtic_fomorian_giant', weeklyGrowthQuarters: 1, serviceId: 'training' },
  { godId: 'celtic_danu', weeklyResource: { wood: 3 }, favoredFamilyId: 'celtic_horned_stag_spirit', weeklyGrowthQuarters: 2, serviceId: 'library' },
  { godId: 'celtic_cernunnos', weeklyResource: { wood: 4 }, favoredFamilyId: 'celtic_cu_sith', weeklyGrowthQuarters: 8, serviceId: 'recruit' },
  { godId: 'celtic_epona', weeklyResource: { gold: 400 }, favoredFamilyId: 'celtic_kelpie', weeklyGrowthQuarters: 4, serviceId: 'dwelling' },
  { godId: 'celtic_lugh', weeklyResource: { crystal: 1 }, favoredFamilyId: 'celtic_horned_stag_spirit', weeklyGrowthQuarters: 2, serviceId: 'equipment' },
  { godId: 'celtic_arawn', weeklyResource: { crystal: 1 }, favoredFamilyId: 'celtic_cu_sith', weeklyGrowthQuarters: 8, serviceId: 'spellbook' },
  { godId: 'celtic_manannan', weeklyResource: { wood: 4 }, favoredFamilyId: 'celtic_selkie', weeklyGrowthQuarters: 4, serviceId: 'trade' },
  { godId: 'mesoamerican_quetzalcoatl', weeklyResource: { crystal: 1 }, favoredFamilyId: 'mesoamerican_feathered_serpent', weeklyGrowthQuarters: 8, serviceId: 'library' },
  { godId: 'mesoamerican_huitzilopochtli', weeklyResource: { gold: 300 }, favoredFamilyId: 'mesoamerican_eagle_warrior_spirit', weeklyGrowthQuarters: 4, serviceId: 'training' },
  { godId: 'mesoamerican_coatlicue', weeklyResource: { stone: 3 }, favoredFamilyId: 'mesoamerican_stone_colossus', weeklyGrowthQuarters: 1, serviceId: 'fortify' },
  { godId: 'mesoamerican_mixcoatl', weeklyResource: { wood: 3 }, favoredFamilyId: 'mesoamerican_eagle_warrior_spirit', weeklyGrowthQuarters: 4, serviceId: 'watch' },
  { godId: 'mesoamerican_xolotl', weeklyResource: { gold: 400 }, favoredFamilyId: 'mesoamerican_jaguar_spirit', weeklyGrowthQuarters: 8, serviceId: 'upgrade' },
  { godId: 'mesoamerican_tlaloc', weeklyResource: { wood: 4 }, favoredFamilyId: 'mesoamerican_cenote_crocodile', weeklyGrowthQuarters: 4, serviceId: 'dwelling' },
  { godId: 'mesoamerican_tezcatlipoca', weeklyResource: { crystal: 1 }, favoredFamilyId: 'mesoamerican_camazotz', weeklyGrowthQuarters: 4, serviceId: 'equipment' },
  { godId: 'mesoamerican_xiuhtecuhtli', weeklyResource: { stone: 3 }, favoredFamilyId: 'mesoamerican_xiuhcoatl', weeklyGrowthQuarters: 2, serviceId: 'equipment' },
  { godId: 'mesoamerican_chalchiuhtlicue', weeklyResource: { wood: 4 }, favoredFamilyId: 'mesoamerican_cenote_crocodile', weeklyGrowthQuarters: 4, serviceId: 'recruit' },
  { godId: 'mesoamerican_mictlantecuhtli', weeklyResource: { crystal: 1 }, favoredFamilyId: 'mesoamerican_camazotz', weeklyGrowthQuarters: 4, serviceId: 'upgrade' },
];

export const CITY_DEDICATION_POLICY: CityDedicationPolicy = {
  id: 'cityDedicationsV1',
  requiredTempleLevel: 2,
  firstDedicationCost: {},
  switchCost: { gold: 500 },
  suppressedGodEffectTypes: ['daily_income', 'weekly_growth_bonus'],
};

/**
 * God cards with city dedications on (handoff §05): the remaining `benefitSummary` lines of
 * the twelve gods whose direct `daily_income` / `weekly_growth_bonus` benefits the profiles
 * replace (legacy-benefit-replacement.json), one line per retained benefit, in order.
 * Explicit data (`godBenefitsForMode` never parses the legacy sentences); an empty list =
 * no empire-wide blessing left, the god's economy now comes from its city dedication.
 * Legacy-mode cards keep the gods' original summaries.
 */
export const CITY_MODE_GOD_SUMMARIES: Readonly<Record<string, readonly string[]>> = {
  hermes: ['+15% land movement for your heroes.'],
  demeter: [],
  hera: ['+1 morale for your armies.'],
  norse_freyja: [],
  norse_njord: [],
  egyptian_hathor: ['+1 morale for your armies.'],
  egyptian_sobek: [],
  japanese_inari: [],
  japanese_izanagi: ['+2 mana for your heroes at every dawn.'],
  celtic_danu: ['+1 Spell Power for your commanders.'],
  mesoamerican_tlaloc: [],
  mesoamerican_chalchiuhtlicue: ['After a battle you win, each stack regains 10% of its losses (rounded down; adds to other recovery).'],
};
