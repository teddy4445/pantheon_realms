/**
 * Expanded content (PROPOSED this build, unplaytested): pantheon skills and
 * spells, artifact sets, divine interventions, weekly events and skirmish
 * difficulty levels.
 *
 * Everything here is 'expanded' scope: it appears only in scenarios that enable
 * it (skirmish), never in The Three Beacons, whose content is fixed by the
 * owner's campaign document. Every effect uses the shared vocabulary in
 * @pr/rules (definitions/logic.ts, definitions/skirmish.ts); nothing in the
 * rules names a skill, spell, artifact or pantheon.
 */
import type {
  ArtifactDefinition,
  ArtifactSetDefinition,
  DifficultyDefinition,
  EffectDefinition,
  InterventionDefinition,
  MapEventTemplateDefinition,
  SkillDefinition,
  SpellDefinition,
  WeeklyEventDefinition,
} from '@pr/rules';

// ---------------------------------------------------------------------------
// Secondary skills: two for every hero, one per pantheon (offered only to that pantheon's heroes)
// ---------------------------------------------------------------------------

const effectsSkill = (
  id: string,
  name: string,
  summary: string,
  ranks: readonly (readonly EffectDefinition[])[],
  rankSummaries: string[],
  pantheonId?: string,
): SkillDefinition => ({
  id,
  name,
  summary,
  rankSummaries,
  rule: { type: 'effects', effectsByRank: ranks },
  iconAssetId: `icon.skill.${id}`,
  scope: 'expanded',
  ...(pantheonId ? { pantheonId } : {}),
});

export const EXPANDED_SKILLS: readonly SkillDefinition[] = [
  effectsSkill(
    'estates',
    'Estates',
    'Revenue from the hero’s holdings, paid every dawn.',
    [[{ type: 'daily_income', resource: 'gold', amount: 250 }], [{ type: 'daily_income', resource: 'gold', amount: 500 }], [{ type: 'daily_income', resource: 'gold', amount: 750 }]],
    ['+250 Gold per day', '+500 Gold per day', '+750 Gold per day'],
  ),
  effectsSkill(
    'mysticism',
    'Mysticism',
    'Faster mana recovery away from a Sanctum.',
    [[{ type: 'mana_regen', amount: 2 }], [{ type: 'mana_regen', amount: 4 }], [{ type: 'mana_regen', amount: 6 }]],
    ['+2 mana at dawn', '+4 mana at dawn', '+6 mana at dawn'],
  ),
  effectsSkill(
    'phalanx_drill',
    'Phalanx Drill',
    'Greek: the hero drills the line infantry to hold shield to shield.',
    [
      [{ type: 'creature_stat', stat: 'defense', amount: 1, maxTier: 3 }],
      [{ type: 'creature_stat', stat: 'defense', amount: 2, maxTier: 3 }],
      [{ type: 'creature_stat', stat: 'defense', amount: 3, maxTier: 3 }],
    ],
    ['Tier 1–3 creatures +1 Defense in battle', 'Tier 1–3 creatures +2 Defense in battle', 'Tier 1–3 creatures +3 Defense in battle'],
    'greek',
  ),
  effectsSkill(
    'skaldic_lore',
    'Skaldic Lore',
    'Norse: deeds sung by the skald teach the army faster.',
    [[{ type: 'battle_xp_percent', percent: 15 }], [{ type: 'battle_xp_percent', percent: 30 }], [{ type: 'battle_xp_percent', percent: 45 }]],
    ['+15% battle experience', '+30% battle experience', '+45% battle experience'],
    'norse',
  ),
  effectsSkill(
    'embalming',
    'Embalming Rites',
    'Egyptian: after a victory, some of the fallen are restored.',
    [[{ type: 'casualty_recovery', percent: 5 }], [{ type: 'casualty_recovery', percent: 10 }], [{ type: 'casualty_recovery', percent: 15 }]],
    ['5% of losses return after a won battle', '10% of losses return after a won battle', '15% of losses return after a won battle'],
    'egyptian',
  ),
  effectsSkill(
    'bushido',
    'Bushidō',
    'Japanese: the elite fight with perfect resolve.',
    [
      [{ type: 'creature_stat', stat: 'attack', amount: 1, minTier: 5 }],
      [{ type: 'creature_stat', stat: 'attack', amount: 2, minTier: 5 }],
      [{ type: 'creature_stat', stat: 'attack', amount: 3, minTier: 5 }],
    ],
    ['Tier 5–7 creatures +1 Attack in battle', 'Tier 5–7 creatures +2 Attack in battle', 'Tier 5–7 creatures +3 Attack in battle'],
    'japanese',
  ),
  effectsSkill(
    'druidcraft',
    'Druidcraft',
    'Celtic: grove lore sharpens spells and restores mana.',
    [
      [{ type: 'spell_damage_percent', percent: 15 }, { type: 'mana_regen', amount: 1 }],
      [{ type: 'spell_damage_percent', percent: 30 }, { type: 'mana_regen', amount: 2 }],
      [{ type: 'spell_damage_percent', percent: 50 }, { type: 'mana_regen', amount: 3 }],
    ],
    ['+15% spell damage, +1 mana at dawn', '+30% spell damage, +2 mana at dawn', '+50% spell damage, +3 mana at dawn'],
    'celtic',
  ),
  effectsSkill(
    'sun_calendar',
    'Sun Calendar',
    'Mesoamerican: the hero keeps the sacred calendar, earning the gods’ attention.',
    [[{ type: 'daily_income', resource: 'favor', amount: 1 }], [{ type: 'daily_income', resource: 'favor', amount: 2 }], [{ type: 'daily_income', resource: 'favor', amount: 3 }]],
    ['+1 Favor per day', '+2 Favor per day', '+3 Favor per day'],
    'mesoamerican',
  ),
];

// ---------------------------------------------------------------------------
// Spells: four for every Sanctum, two per pantheon (learnable only in that pantheon's towns)
// ---------------------------------------------------------------------------

const spell = (s: Omit<SpellDefinition, 'iconAssetId' | 'implementationStatus' | 'access' | 'scope'>): SpellDefinition => ({
  ...s,
  access: 'sanctum',
  scope: 'expanded',
  iconAssetId: `icon.spell.${s.id}`,
  implementationStatus: 'implemented',
});

export const EXPANDED_SPELLS: readonly SpellDefinition[] = [
  spell({ id: 'swiftness', name: 'Swiftness', tier: 1, manaCost: 4, context: 'battle', target: 'ally_stack', effect: { type: 'speed_bonus', amount: 2, durationRounds: 2 }, summary: 'Ally +2 Speed through the current and next round.' }),
  spell({ id: 'weariness', name: 'Weariness', tier: 2, manaCost: 5, context: 'battle', target: 'enemy_stack', effect: { type: 'speed_bonus', amount: -2, durationRounds: 2 }, summary: 'Enemy −2 Speed through the current and next round (never below 1).' }),
  spell({ id: 'fleet_foot', name: 'Fleet Foot', tier: 2, manaCost: 6, context: 'adventure', target: 'self', effect: { type: 'movement_bonus', points: 400 }, summary: 'Adventure only: the caster gains 400 movement points today.' }),
  spell({ id: 'homecoming', name: 'Homecoming', tier: 3, manaCost: 14, context: 'adventure', target: 'self', effect: { type: 'recall' }, summary: 'Adventure only: the caster returns to the nearest town you own; its movement ends for the day.' }),
  // Greek
  spell({ id: 'aegis', name: 'Aegis', tier: 3, manaCost: 9, context: 'battle', target: 'friendly_army', effect: { type: 'mass_bonus', stat: 'defense', amount: 2, durationRounds: 2 }, summary: 'Every friendly stack +2 Defense through the current and next round.', pantheonId: 'greek' }),
  spell({ id: 'thunderclap', name: 'Thunderclap', tier: 3, manaCost: 12, context: 'battle', target: 'enemy_stack', effect: { type: 'area_damage', base: 20, perPower: 8 }, summary: 'Enemy stack and every enemy stack beside it take 20 + 8 × Power damage.', pantheonId: 'greek' }),
  // Norse
  spell({ id: 'berserkergang', name: 'Berserkergang', tier: 3, manaCost: 9, context: 'battle', target: 'friendly_army', effect: { type: 'mass_bonus', stat: 'attack', amount: 2, durationRounds: 2 }, summary: 'Every friendly stack +2 Attack through the current and next round.', pantheonId: 'norse' }),
  spell({ id: 'frost_breath', name: 'Frost Breath', tier: 2, manaCost: 6, context: 'battle', target: 'enemy_stack', effect: { type: 'speed_bonus', amount: -3, durationRounds: 2 }, summary: 'Enemy −3 Speed through the current and next round (never below 1).', pantheonId: 'norse' }),
  // Egyptian
  spell({ id: 'scarab_swarm', name: 'Scarab Swarm', tier: 3, manaCost: 10, context: 'battle', target: 'enemy_stack', effect: { type: 'area_damage', base: 15, perPower: 6 }, summary: 'Enemy stack and every enemy stack beside it take 15 + 6 × Power damage.', pantheonId: 'egyptian' }),
  spell({ id: 'eye_of_horus', name: 'Eye of Horus', tier: 2, manaCost: 8, context: 'adventure', target: 'known_tile', effect: { type: 'reveal_radius', radius: 5 }, summary: 'Adventure only: reveal radius 5 around a known tile until next dawn.', pantheonId: 'egyptian' }),
  // Japanese
  spell({ id: 'divine_wind', name: 'Divine Wind', tier: 3, manaCost: 8, context: 'battle', target: 'friendly_army', effect: { type: 'mass_bonus', stat: 'speed', amount: 2, durationRounds: 2 }, summary: 'Every friendly stack +2 Speed through the current and next round.', pantheonId: 'japanese' }),
  spell({ id: 'blossom_veil', name: 'Blossom Veil', tier: 2, manaCost: 6, context: 'battle', target: 'ally_stack', effect: { type: 'defense_bonus', amount: 5, durationRounds: 2 }, summary: 'Ally +5 Defense through the current and next round.', pantheonId: 'japanese' }),
  // Celtic
  spell({ id: 'glamour', name: 'Glamour', tier: 2, manaCost: 6, context: 'battle', target: 'enemy_stack', effect: { type: 'attack_bonus', amount: -3, durationRounds: 2 }, summary: 'Enemy −3 Attack through the current and next round.', pantheonId: 'celtic' }),
  spell({ id: 'wild_hunt', name: 'Wild Hunt', tier: 3, manaCost: 13, context: 'battle', target: 'enemy_stack', effect: { type: 'area_damage', base: 25, perPower: 9 }, summary: 'Enemy stack and every enemy stack beside it take 25 + 9 × Power damage.', pantheonId: 'celtic' }),
  // Mesoamerican
  spell({ id: 'obsidian_rain', name: 'Obsidian Rain', tier: 3, manaCost: 11, context: 'battle', target: 'enemy_stack', effect: { type: 'area_damage', base: 15, perPower: 7 }, summary: 'Enemy stack and every enemy stack beside it take 15 + 7 × Power damage.', pantheonId: 'mesoamerican' }),
  spell({ id: 'fifth_sun', name: 'Fifth Sun', tier: 3, manaCost: 12, context: 'battle', target: 'friendly_army', effect: { type: 'mass_bonus', stat: 'attack', amount: 3, durationRounds: 1 }, summary: 'Every friendly stack +3 Attack through the current round.', pantheonId: 'mesoamerican' }),
];

// ---------------------------------------------------------------------------
// Artifact sets (four sets of three; merchant stock and map finds in skirmish)
// ---------------------------------------------------------------------------

const piece = (
  id: string,
  name: string,
  slot: ArtifactDefinition['slot'],
  effects: readonly EffectDefinition[],
  summary: string,
  setId: string,
  price: ArtifactDefinition['merchantPrice'],
): ArtifactDefinition => ({
  id,
  name,
  slot,
  effects,
  summary,
  iconAssetId: `icon.artifact.${id}`,
  unique: false,
  merchantPrice: price,
  setId,
  scope: 'expanded',
  provenance: { source: 'proposed-this-build', note: 'Artifact set piece (P).' },
});

export const SET_ARTIFACTS: readonly ArtifactDefinition[] = [
  piece('phalanx_spear', 'Phalanx Spear', 'weapon', [{ type: 'commander_attribute', attribute: 'attack', amount: 2 }], '+2 commander Attack. Panoply of the Phalanx.', 'panoply_of_the_phalanx', { gold: 2500 }),
  piece('phalanx_aspis', 'Phalanx Aspis', 'shield', [{ type: 'commander_attribute', attribute: 'defense', amount: 2 }], '+2 commander Defense. Panoply of the Phalanx.', 'panoply_of_the_phalanx', { gold: 2500 }),
  piece('phalanx_helm', 'Crested Helm', 'head', [{ type: 'commander_attribute', attribute: 'defense', amount: 1 }], '+1 commander Defense. Panoply of the Phalanx.', 'panoply_of_the_phalanx', { gold: 1800 }),
  piece('sun_diadem', 'Sun Diadem', 'head', [{ type: 'commander_attribute', attribute: 'power', amount: 2 }], '+2 commander Spell Power. Regalia of the Sun King.', 'regalia_of_the_sun_king', { gold: 3000, crystal: 1 }),
  piece('sun_scepter', 'Sun Scepter', 'weapon', [{ type: 'commander_attribute', attribute: 'power', amount: 1 }, { type: 'commander_attribute', attribute: 'knowledge', amount: 1 }], '+1 commander Spell Power and +1 Knowledge. Regalia of the Sun King.', 'regalia_of_the_sun_king', { gold: 3000, crystal: 1 }),
  piece('sun_signet', 'Sun Signet', 'ring', [{ type: 'commander_attribute', attribute: 'knowledge', amount: 2 }], '+2 commander Knowledge. Regalia of the Sun King.', 'regalia_of_the_sun_king', { gold: 2500 }),
  piece('wayfarer_boots', 'Wayfarer’s Boots', 'feet', [{ type: 'movement_percent', percent: 10 }], '+10% daily land movement. Wayfarer’s Kit.', 'wayfarers_kit', { gold: 2000 }),
  piece('wayfarer_cloak', 'Wayfarer’s Cloak', 'cape', [{ type: 'commander_attribute', attribute: 'defense', amount: 1 }, { type: 'vision_radius', amount: 1 }], '+1 commander Defense and +1 hex of vision. Wayfarer’s Kit.', 'wayfarers_kit', { gold: 2000 }),
  piece('wayfarer_compass', 'Star Compass', 'misc', [{ type: 'vision_radius', amount: 2 }], '+2 hexes of adventure vision. Wayfarer’s Kit.', 'wayfarers_kit', { gold: 1800 }),
  piece('champion_blade', 'Champion’s Blade', 'weapon', [{ type: 'commander_attribute', attribute: 'attack', amount: 2 }], '+2 commander Attack. Relics of the Fallen Champion.', 'relics_of_the_fallen_champion', { gold: 3000 }),
  piece('champion_torc', 'Champion’s Torc', 'neck', [{ type: 'luck', amount: 1 }], '+1 Luck for the army. Relics of the Fallen Champion.', 'relics_of_the_fallen_champion', { gold: 2500 }),
  piece('champion_banner', 'Champion’s Banner', 'misc', [{ type: 'morale', amount: 1 }], '+1 morale for the army. Relics of the Fallen Champion.', 'relics_of_the_fallen_champion', { gold: 2500 }),
];

export const ARTIFACT_SETS: readonly ArtifactSetDefinition[] = [
  {
    id: 'panoply_of_the_phalanx',
    name: 'Panoply of the Phalanx',
    summary: 'Spear, shield and helm of a front-rank commander.',
    pieceIds: ['phalanx_spear', 'phalanx_aspis', 'phalanx_helm'],
    bonuses: [
      { pieces: 2, effects: [{ type: 'morale', amount: 1 }], summary: '2 pieces: +1 morale' },
      { pieces: 3, effects: [{ type: 'creature_stat', stat: 'defense', amount: 2 }], summary: '3 pieces: every creature +2 Defense in battle' },
    ],
  },
  {
    id: 'regalia_of_the_sun_king',
    name: 'Regalia of the Sun King',
    summary: 'Crown, scepter and ring of a priest-king.',
    pieceIds: ['sun_diadem', 'sun_scepter', 'sun_signet'],
    bonuses: [
      { pieces: 2, effects: [{ type: 'mana_regen', amount: 3 }], summary: '2 pieces: +3 mana at dawn' },
      { pieces: 3, effects: [{ type: 'spell_damage_percent', percent: 25 }], summary: '3 pieces: +25% spell damage' },
    ],
  },
  {
    id: 'wayfarers_kit',
    name: 'Wayfarer’s Kit',
    summary: 'Boots, cloak and compass of a tireless traveller.',
    pieceIds: ['wayfarer_boots', 'wayfarer_cloak', 'wayfarer_compass'],
    bonuses: [
      { pieces: 2, effects: [{ type: 'movement_percent', percent: 10 }], summary: '2 pieces: +10% daily land movement' },
      { pieces: 3, effects: [{ type: 'daily_income', resource: 'gold', amount: 300 }], summary: '3 pieces: +300 Gold per day (trade on the road)' },
    ],
  },
  {
    id: 'relics_of_the_fallen_champion',
    name: 'Relics of the Fallen Champion',
    summary: 'Blade, torc and banner of a champion whose name is forgotten.',
    pieceIds: ['champion_blade', 'champion_torc', 'champion_banner'],
    bonuses: [
      { pieces: 2, effects: [{ type: 'battle_xp_percent', percent: 20 }], summary: '2 pieces: +20% battle experience' },
      { pieces: 3, effects: [{ type: 'creature_stat', stat: 'attack', amount: 2 }], summary: '3 pieces: every creature +2 Attack in battle' },
    ],
  },
];

// ---------------------------------------------------------------------------
// Divine interventions (Favor; once per world week)
// ---------------------------------------------------------------------------

const intervention = (d: Omit<InterventionDefinition, 'iconAssetId'>): InterventionDefinition => ({ ...d, iconAssetId: `icon.intervention.${d.id}` });

export const INTERVENTIONS: readonly InterventionDefinition[] = [
  intervention({ id: 'favorable_winds', name: 'Favorable Winds', summary: 'Every hero of yours regains half a day’s movement.', favorCost: 8, context: 'adventure', target: 'none', effect: { type: 'restore_movement', percent: 50 } }),
  intervention({ id: 'bountiful_harvest', name: 'Bountiful Harvest', summary: 'The chosen town gains 4 recruits for every tier 1–3 creature family it houses.', favorCost: 10, context: 'adventure', target: 'own_town', effect: { type: 'town_growth', maxTier: 3, amount: 4 } }),
  intervention({ id: 'tithe_of_the_faithful', name: 'Tithe of the Faithful', summary: '+1,500 Gold at once.', favorCost: 6, context: 'adventure', target: 'none', effect: { type: 'grant_resources', resources: { gold: 1500 } } }),
  intervention({ id: 'inspiration', name: 'Inspiration', summary: 'Every hero of yours regains 15 mana (never above its maximum).', favorCost: 5, context: 'adventure', target: 'none', effect: { type: 'restore_mana', amount: 15 } }),
  intervention({ id: 'rally_the_faithful', name: 'Rally the Faithful', summary: 'Every friendly stack +2 Attack through the current and next round.', favorCost: 8, context: 'battle', target: 'none', effect: { type: 'battle_status', stat: 'attack', amount: 2, durationRounds: 2 } }),
  intervention({ id: 'shield_of_the_gods', name: 'Shield of the Gods', summary: 'Every friendly stack +3 Defense through the current and next round.', favorCost: 8, context: 'battle', target: 'none', effect: { type: 'battle_status', stat: 'defense', amount: 3, durationRounds: 2 } }),
  intervention({ id: 'mending_light', name: 'Mending Light', summary: 'The front creature of every friendly stack heals up to 30 HP (no resurrection).', favorCost: 6, context: 'battle', target: 'none', effect: { type: 'battle_heal', amount: 30 } }),
  intervention({ id: 'wrath_from_above', name: 'Wrath from Above', summary: 'One enemy stack takes 120 damage.', favorCost: 10, context: 'battle', target: 'enemy_stack', effect: { type: 'battle_smite', damage: 120 } }),
  // One per pantheon.
  intervention({ id: 'thunderbolt_of_zeus', name: 'Thunderbolt of Zeus', summary: 'One enemy stack takes 200 damage.', favorCost: 14, context: 'battle', target: 'enemy_stack', effect: { type: 'battle_smite', damage: 200 }, pantheonIds: ['greek'] }),
  intervention({ id: 'ride_of_the_valkyries', name: 'Ride of the Valkyries', summary: 'Every friendly stack +2 Speed through the current and next round.', favorCost: 8, context: 'battle', target: 'none', effect: { type: 'battle_status', stat: 'speed', amount: 2, durationRounds: 2 }, pantheonIds: ['norse'] }),
  intervention({ id: 'blessing_of_the_nile', name: 'Blessing of the Nile', summary: 'The chosen town gains 3 recruits for every tier 1–5 creature family it houses.', favorCost: 12, context: 'adventure', target: 'own_town', effect: { type: 'town_growth', maxTier: 5, amount: 3 }, pantheonIds: ['egyptian'] }),
  intervention({ id: 'ward_of_the_kami', name: 'Ward of the Kami', summary: 'Every friendly stack +4 Defense through the current and next two rounds.', favorCost: 12, context: 'battle', target: 'none', effect: { type: 'battle_status', stat: 'defense', amount: 4, durationRounds: 3 }, pantheonIds: ['japanese'] }),
  intervention({ id: 'mists_of_the_sidhe', name: 'Mists of the Sídhe', summary: 'Every hero of yours regains a full day’s movement.', favorCost: 12, context: 'adventure', target: 'none', effect: { type: 'restore_movement', percent: 100 }, pantheonIds: ['celtic'] }),
  intervention({ id: 'gift_of_the_feathered_serpent', name: 'Gift of the Feathered Serpent', summary: '+1,000 Gold and +3 Crystal at once.', favorCost: 10, context: 'adventure', target: 'none', effect: { type: 'grant_resources', resources: { gold: 1000, crystal: 3 } }, pantheonIds: ['mesoamerican'] }),
];

// ---------------------------------------------------------------------------
// Weekly events (drawn at every new week from week 2; weights are relative)
// ---------------------------------------------------------------------------

export const WEEKLY_EVENTS: readonly WeeklyEventDefinition[] = [
  { id: 'quiet_week', name: 'A Quiet Week', summary: 'Nothing unusual stirs this week.', weight: 12, effects: [] },
  { id: 'week_of_plenty', name: 'Week of Plenty', summary: 'Every tier 1–3 creature family grows by 3 extra this week.', weight: 4, effects: [{ type: 'weekly_growth_bonus', maxTier: 3, amount: 3 }] },
  { id: 'week_of_merchants', name: 'Week of the Merchants', summary: 'Caravans crowd the roads: +300 Gold per day for every empire with a town.', weight: 4, effects: [{ type: 'daily_income', resource: 'gold', amount: 300 }] },
  { id: 'week_of_storms', name: 'Week of Storms', summary: 'Gales and rain: every hero has 15% less daily movement.', weight: 3, effects: [{ type: 'movement_percent', percent: -15 }] },
  { id: 'week_of_valor', name: 'Week of Valor', summary: 'Heralds sing of courage: every army +1 morale.', weight: 3, effects: [{ type: 'morale', amount: 1 }] },
  { id: 'week_of_omens', name: 'Week of Omens', summary: 'The auguries are bright: every army +1 luck.', weight: 3, effects: [{ type: 'luck', amount: 1 }] },
  { id: 'week_of_the_muse', name: 'Week of the Muse', summary: 'Inspiration flows: every hero recovers 3 extra mana at dawn.', weight: 3, effects: [{ type: 'mana_regen', amount: 3 }] },
  { id: 'week_of_builders', name: 'Week of the Builders', summary: 'Quarries and sawmills overflow: +1 Wood and +1 Stone per day for every empire with a town.', weight: 3, effects: [{ type: 'daily_income', resource: 'wood', amount: 1 }, { type: 'daily_income', resource: 'stone', amount: 1 }] },
];

// ---------------------------------------------------------------------------
// Skirmish difficulty
// ---------------------------------------------------------------------------

export const DIFFICULTIES: readonly DifficultyDefinition[] = [
  {
    id: 'easy',
    name: 'Easy',
    order: 1,
    summary: 'A cautious opponent with a thinner treasury.',
    details: ['You start with 125% resources', 'AI empires start with 75% and earn 75% income', 'The AI attacks only with a clear advantage', 'Score ×0.7'],
    humanStartPercent: 125,
    aiStartPercent: 75,
    aiIncomePercent: 75,
    ai: { heroAttackMargin: 1.5, guardMargin: 1.6, siegeMargin: 1.6, targetHeroes: 2 },
    scorePercent: 70,
  },
  {
    id: 'normal',
    name: 'Normal',
    order: 2,
    summary: 'Equal footing: the scenario’s own resources for everyone.',
    details: ['Everyone starts with the scenario’s resources', 'Equal income', 'Score ×1.0'],
    humanStartPercent: 100,
    aiStartPercent: 100,
    aiIncomePercent: 100,
    ai: { heroAttackMargin: 1.2, guardMargin: 1.3, siegeMargin: 1.25, targetHeroes: 3 },
    scorePercent: 100,
  },
  {
    id: 'hard',
    name: 'Hard',
    order: 3,
    summary: 'A bold opponent with a richer treasury.',
    details: ['AI empires start with 130% resources and earn 125% income', 'The AI attacks at smaller advantages and keeps more heroes', 'Score ×1.4'],
    humanStartPercent: 100,
    aiStartPercent: 130,
    aiIncomePercent: 125,
    ai: { heroAttackMargin: 1.05, guardMargin: 1.15, siegeMargin: 1.1, targetHeroes: 4 },
    scorePercent: 140,
  },
];

// ---------------------------------------------------------------------------
// Map events for random skirmish maps (each happens once, to the first hero to arrive)
// ---------------------------------------------------------------------------

export const MAP_EVENT_TEMPLATES: readonly MapEventTemplateDefinition[] = [
  {
    id: 'abandoned_camp',
    title: 'Abandoned Camp',
    text: 'Cold ashes, a torn tent and crates nobody came back for.',
    band: 'near',
    options: [
      { label: 'Take the supplies', summary: '+600 Gold and +3 Wood', reward: { resources: { gold: 600, wood: 3 } } },
      { label: 'Study the scout’s notes', summary: '+300 experience', reward: { questXp: 300 } },
    ],
  },
  {
    id: 'wandering_scholar',
    title: 'Wandering Scholar',
    text: 'A scholar with ink-stained fingers offers lessons — for a fee.',
    band: 'near',
    options: [
      { label: 'Pay for lessons', summary: 'Pay 1,000 Gold: +1 Knowledge', cost: { gold: 1000 }, reward: { attributes: { knowledge: 1 } } },
      { label: 'Ask for directions', summary: '+500 movement today', reward: { movement: 500 } },
    ],
  },
  {
    id: 'warriors_shrine',
    title: 'Warrior’s Shrine',
    text: 'Old weapons hang from a stone altar, each left by a victor.',
    band: 'far',
    options: [
      { label: 'Pray for strength', summary: '+1 Attack', reward: { attributes: { attack: 1 } } },
      { label: 'Pray for endurance', summary: '+1 Defense', reward: { attributes: { defense: 1 } } },
    ],
  },
  {
    id: 'mercenary_band',
    title: 'Mercenary Band',
    text: 'Centaur outriders between contracts will ride with you — for gold.',
    band: 'far',
    options: [
      { label: 'Hire them', summary: 'Pay 1,500 Gold: 6 Centaurs join your army', cost: { gold: 1500 }, reward: { creatures: [{ creatureId: 'centaur', count: 6 }] } },
      { label: 'Send them on their way', summary: 'Nothing happens', reward: {} },
    ],
  },
  {
    id: 'old_battlefield',
    title: 'Old Battlefield',
    text: 'Rusted arms and a crested helm lie among the grass.',
    band: 'far',
    options: [
      { label: 'Search the fallen', summary: 'Find a Crested Helm (Panoply of the Phalanx)', reward: { artifactIds: ['phalanx_helm'] } },
      { label: 'Bury the dead', summary: '+500 experience', reward: { questXp: 500 } },
    ],
  },
  {
    id: 'spring_of_clarity',
    title: 'Spring of Clarity',
    text: 'Water so clear it seems to hum.',
    band: 'near',
    options: [
      { label: 'Drink', summary: '+20 mana (up to the hero’s maximum)', reward: { mana: 20 } },
      { label: 'Meditate beside it', summary: '+1 Spell Power', reward: { attributes: { power: 1 } } },
    ],
  },
  {
    id: 'merchant_caravan',
    title: 'Merchant Caravan',
    text: 'A caravan stuck in the mud offers a deal, or a reward for help.',
    band: 'near',
    options: [
      { label: 'Trade', summary: 'Pay 1,000 Gold: +5 Wood and +5 Stone', cost: { gold: 1000 }, reward: { resources: { wood: 5, stone: 5 } } },
      { label: 'Help them free the carts', summary: '+1 Crystal and +200 experience', reward: { resources: { crystal: 1 }, questXp: 200 } },
    ],
  },
  {
    id: 'hermits_garden',
    title: 'Hermit’s Garden',
    text: 'A hermit tends herbs and keeps the old rites.',
    band: 'far',
    options: [
      { label: 'Join the rite', summary: '+4 Favor', reward: { resources: { favor: 4 } } },
      { label: 'Learn the herbs', summary: '+1 Knowledge', reward: { attributes: { knowledge: 1 } } },
    ],
  },
  {
    id: 'forgotten_armory',
    title: 'Forgotten Armory',
    text: 'A locked armory; the quartermaster’s ghost still names a price.',
    band: 'far',
    options: [
      { label: 'Pay the price', summary: 'Pay 2,000 Gold: take the Champion’s Blade', cost: { gold: 2000 }, reward: { artifactIds: ['champion_blade'] } },
      { label: 'Leave it locked', summary: 'Nothing happens', reward: {} },
    ],
  },
  {
    id: 'lost_pilgrims',
    title: 'Lost Pilgrims',
    text: 'Pilgrims have lost the road to the shrine.',
    band: 'near',
    options: [
      { label: 'Guide them', summary: '+400 experience', reward: { questXp: 400 } },
      { label: 'Ask for alms in return', summary: '+2 Favor and +300 Gold', reward: { resources: { favor: 2, gold: 300 } } },
    ],
  },
];
