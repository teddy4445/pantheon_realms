/**
 * Arcana — the 2026-10-01 spell and artifact library (owner request: "more spells
 * and artifacts ... with logical stories"). PROPOSED, unplaytested values.
 *
 * Thirty spells (three more for each pantheon, so every pantheon has five, and
 * twelve shared Sanctum spells) and forty-six artifacts for every paper-doll
 * slot, including six new sets. All of it is 'expanded' content: skirmish,
 * random maps and The Winter Oath use it; The Three Beacons keeps it off.
 * Every entry carries `lore` — a short in-world story used by the encyclopedia
 * and by the icon brief in ICON_CATALOG.md. Nothing here is read by name in the
 * rules: effects use the shared vocabulary.
 */
import type { ArtifactDefinition, ArtifactRarity, ArtifactSetDefinition, EffectDefinition, SpellDefinition } from '@pr/rules';

// ---------------------------------------------------------------------------
// Spells
// ---------------------------------------------------------------------------

const spell = (s: Omit<SpellDefinition, 'iconAssetId' | 'implementationStatus' | 'access' | 'scope'> & { lore: string }): SpellDefinition => ({
  ...s,
  access: 'sanctum',
  scope: 'expanded',
  iconAssetId: `icon.spell.${s.id}`,
  implementationStatus: 'implemented',
});

export const ARCANA_SPELLS: readonly SpellDefinition[] = [
  // --- Shared Sanctum spells (any pantheon's library may hold them) ---
  spell({
    id: 'ill_omen', name: 'Ill Omen', tier: 1, manaCost: 5, context: 'battle', target: 'enemy_stack',
    effect: { type: 'min_damage_roll', durationRounds: 2 },
    summary: 'Enemy stack rolls its minimum damage through the current and next round (a Blessing on it cancels out).',
    lore: 'Every army has a soldier who sees a crow on the left and loses heart. The spell finds that soldier in every rank at once and makes him right.',
  }),
  spell({
    id: 'shield_of_faith', name: 'Shield of Faith', tier: 1, manaCost: 5, context: 'battle', target: 'ally_stack',
    effect: { type: 'melee_mitigation', numerator: 4, denominator: 5, durationRounds: 2 },
    summary: 'Ally takes ×0.8 damage from melee strikes through the current and next round.',
    lore: 'Priests of every road-shrine teach the same prayer: not for victory, only that the next blow land a little lighter. Soldiers say it under their breath before the lines meet.',
  }),
  spell({
    id: 'hearthlight', name: 'Hearthlight', tier: 1, manaCost: 4, context: 'battle', target: 'ally_stack',
    effect: { type: 'heal_front', base: 12, perPower: 4 },
    summary: 'Heal up to 12 + 4 × Power of the front creature’s missing HP; no resurrection.',
    lore: 'A glow like the fire of home, carried into the field. Wounds close a little, as they do when a mother is near.',
  }),
  spell({
    id: 'far_sight', name: 'Far Sight', tier: 1, manaCost: 5, context: 'adventure', target: 'known_tile',
    effect: { type: 'reveal_radius', radius: 2 },
    summary: 'Adventure only: reveal radius 2 around a known tile until next dawn.',
    lore: 'Shepherds’ magic: look at a hill long enough and you can see what grazes on its far side.',
  }),
  spell({
    id: 'ember_burst', name: 'Ember Burst', tier: 2, manaCost: 8, context: 'battle', target: 'enemy_stack',
    effect: { type: 'area_damage', base: 12, perPower: 5 },
    summary: 'Enemy stack and every enemy stack beside it take 12 + 5 × Power damage.',
    lore: 'A handful of coals from the forge, thrown with a word. Smiths invented it to keep thieves from their yards; captains made it a weapon.',
  }),
  spell({
    id: 'sapping_touch', name: 'Sapping Touch', tier: 2, manaCost: 6, context: 'battle', target: 'enemy_stack',
    effect: { type: 'attack_bonus', amount: -3, durationRounds: 2 },
    summary: 'Enemy −3 Attack through the current and next round.',
    lore: 'The fever-healer’s art turned backwards: instead of drawing sickness out, it pours weariness in.',
  }),
  spell({
    id: 'steadfast', name: 'Steadfast', tier: 2, manaCost: 6, context: 'battle', target: 'ally_stack',
    effect: { type: 'defense_bonus', amount: 4, durationRounds: 2 },
    summary: 'Ally +4 Defense through the current and next round.',
    lore: 'Old sergeants call it the stubborn spell. It does not make soldiers braver, only harder to move.',
  }),
  spell({
    id: 'clear_skies', name: 'Clear Skies', tier: 2, manaCost: 8, context: 'adventure', target: 'known_tile',
    effect: { type: 'reveal_radius', radius: 4 },
    summary: 'Adventure only: reveal radius 4 around a known tile until next dawn.',
    lore: 'Sailors pay well for it: one day without fog, and a whole valley laid out like a map.',
  }),
  spell({
    id: 'starfall', name: 'Starfall', tier: 3, manaCost: 14, context: 'battle', target: 'enemy_army',
    effect: { type: 'mass_damage', base: 10, perPower: 4 },
    summary: 'Every enemy stack takes 10 + 4 × Power damage.',
    lore: 'On the night the old gods quarrelled, stars fell on both their armies. Astronomers learned to ask for a few more — but only over the enemy.',
  }),
  spell({
    id: 'rallying_hymn', name: 'Rallying Hymn', tier: 3, manaCost: 10, context: 'battle', target: 'friendly_army',
    effect: { type: 'mass_bonus', stat: 'defense', amount: 3, durationRounds: 1 },
    summary: 'Every friendly stack +3 Defense through the current round.',
    lore: 'Every people has a song it sings when the line is about to break. The spell lets the whole army hear it at once.',
  }),
  spell({
    id: 'leaden_air', name: 'Leaden Air', tier: 3, manaCost: 11, context: 'battle', target: 'enemy_army',
    effect: { type: 'mass_bonus', stat: 'speed', amount: -1, durationRounds: 2 },
    summary: 'Every enemy stack −1 Speed through the current and next round (never below 1).',
    lore: 'The air over the enemy turns thick as summer before a storm. Horses balk; even birds fly low.',
  }),
  spell({
    id: 'renewal', name: 'Renewal', tier: 3, manaCost: 12, context: 'battle', target: 'friendly_army',
    effect: { type: 'mass_heal', base: 10, perPower: 5 },
    summary: 'The front creature of every friendly stack heals up to 10 + 5 × Power HP (no resurrection).',
    lore: 'Springtime, called down for a moment over a battlefield. It cannot bring back the dead, but it remembers the living.',
  }),

  // --- Greek: Glory & Champions ---
  spell({
    id: 'hoplon_wall', name: 'Hoplon Wall', tier: 1, manaCost: 5, context: 'battle', target: 'ally_stack', pantheonId: 'greek',
    effect: { type: 'melee_mitigation', numerator: 3, denominator: 4, durationRounds: 2 },
    summary: 'Ally takes ×0.75 damage from melee strikes through the current and next round.',
    lore: 'Each round shield covers the neighbour’s left side; the line stands or falls together. The spell locks the shields edge to edge as if one smith had forged them all.',
  }),
  spell({
    id: 'apollos_arrow', name: 'Apollo’s Arrow', tier: 2, manaCost: 8, context: 'battle', target: 'enemy_stack', pantheonId: 'greek',
    effect: { type: 'direct_damage', base: 20, perPower: 8 },
    summary: 'Enemy stack takes 20 + 8 × Power direct damage.',
    lore: 'The far-shooting god’s arrows brought plague to the proud and light to the faithful. His priests ask only for one arrow, and aim it themselves.',
  }),
  spell({
    id: 'wings_of_hermes', name: 'Wings of Hermes', tier: 2, manaCost: 7, context: 'adventure', target: 'self', pantheonId: 'greek',
    effect: { type: 'movement_bonus', points: 150 },
    summary: 'Adventure only: the caster gains 150 movement points today.',
    lore: 'The messenger of the gods never walked when he could run, and never ran when he could fly. Heralds who honour him find the road shorter.',
  }),

  // --- Norse: Fate & Battle ---
  spell({
    id: 'rune_of_tyr', name: 'Rune of Tyr', tier: 1, manaCost: 5, context: 'battle', target: 'ally_stack', pantheonId: 'norse',
    effect: { type: 'attack_bonus', amount: 4, durationRounds: 1 },
    summary: 'Ally +4 Attack through the current round.',
    lore: 'Tyr gave his hand to bind the wolf. Warriors cut his arrow-rune on their blades and ask him for one honest stroke.',
  }),
  spell({
    id: 'norns_thread', name: 'The Norns’ Thread', tier: 2, manaCost: 7, context: 'battle', target: 'enemy_stack', pantheonId: 'norse',
    effect: { type: 'min_damage_roll', durationRounds: 2 },
    summary: 'Enemy stack rolls its minimum damage through the current and next round.',
    lore: 'At the root of the world-tree three women spin every life. A völva who knows the right song can make them shorten one thread — for a little while.',
  }),
  spell({
    id: 'gjallarhorn', name: 'Gjallarhorn', tier: 3, manaCost: 12, context: 'battle', target: 'enemy_army', pantheonId: 'norse',
    effect: { type: 'mass_bonus', stat: 'attack', amount: -2, durationRounds: 2 },
    summary: 'Every enemy stack −2 Attack through the current and next round.',
    lore: 'Heimdall will blow the horn once, at the end of all things. Its echo, called up by a skald, is enough to make an enemy feel that the end has come.',
  }),

  // --- Egyptian: Afterlife & Resurrection ---
  spell({
    id: 'ankh_of_renewal', name: 'Ankh of Renewal', tier: 1, manaCost: 4, context: 'battle', target: 'ally_stack', pantheonId: 'egyptian',
    effect: { type: 'heal_front', base: 15, perPower: 5 },
    summary: 'Heal up to 15 + 5 × Power of the front creature’s missing HP; no resurrection.',
    lore: 'The key of life, held to a wound. Temple healers say the ankh does not heal — it only reminds the body what it was.',
  }),
  spell({
    id: 'wrath_of_sekhmet', name: 'Wrath of Sekhmet', tier: 2, manaCost: 8, context: 'battle', target: 'enemy_stack', pantheonId: 'egyptian',
    effect: { type: 'direct_damage', base: 22, perPower: 9 },
    summary: 'Enemy stack takes 22 + 9 × Power direct damage.',
    lore: 'The lioness once nearly devoured mankind and was calmed only with red beer. Her priests can still wake a little of that rage — and point it.',
  }),
  spell({
    id: 'balance_of_maat', name: 'Balance of Ma’at', tier: 3, manaCost: 13, context: 'battle', target: 'friendly_army', pantheonId: 'egyptian',
    effect: { type: 'mass_heal', base: 12, perPower: 6 },
    summary: 'The front creature of every friendly stack heals up to 12 + 6 × Power HP (no resurrection).',
    lore: 'On the scale of judgement a heart is weighed against a feather. Ma’at restores what was taken unjustly — and in battle, much is.',
  }),

  // --- Japanese: Spirits & Harmony ---
  spell({
    id: 'kitsune_fire', name: 'Kitsune-bi', tier: 1, manaCost: 5, context: 'battle', target: 'enemy_stack', pantheonId: 'japanese',
    effect: { type: 'direct_damage', base: 12, perPower: 5 },
    summary: 'Enemy stack takes 12 + 5 × Power direct damage.',
    lore: 'Fox-fire drifts over the rice paddies on autumn nights. Travellers who follow it are lost; enemies who are followed by it burn.',
  }),
  spell({
    id: 'yata_mirror', name: 'Mirror of Yata', tier: 2, manaCost: 7, context: 'battle', target: 'ally_stack', pantheonId: 'japanese',
    effect: { type: 'ranged_mitigation', numerator: 1, denominator: 2, durationRounds: 2 },
    summary: 'Ally takes ×0.5 damage from ranged strikes through the current and next round.',
    lore: 'A mirror once drew the sun goddess out of her cave. Its reflection, cast over a company, turns arrows aside like light from polished bronze.',
  }),
  spell({
    id: 'raijin_drums', name: 'Raijin’s Drums', tier: 3, manaCost: 14, context: 'battle', target: 'enemy_army', pantheonId: 'japanese',
    effect: { type: 'mass_damage', base: 12, perPower: 5 },
    summary: 'Every enemy stack takes 12 + 5 × Power damage.',
    lore: 'The thunder god beats a ring of drums across the sky. When his shrine-maidens dance, he sometimes beats them over the enemy’s camp.',
  }),

  // --- Celtic: Nature & Transformation ---
  spell({
    id: 'bramble_snare', name: 'Bramble Snare', tier: 1, manaCost: 4, context: 'battle', target: 'enemy_stack', pantheonId: 'celtic',
    effect: { type: 'speed_bonus', amount: -2, durationRounds: 1 },
    summary: 'Enemy −2 Speed through the current round (never below 1).',
    lore: 'Hawthorn is the fairies’ tree; cut it and it takes revenge. The druids simply ask it to reach for the enemy’s ankles.',
  }),
  spell({
    id: 'cauldron_of_dagda', name: 'Cauldron of the Dagda', tier: 2, manaCost: 7, context: 'battle', target: 'ally_stack', pantheonId: 'celtic',
    effect: { type: 'heal_front', base: 25, perPower: 6 },
    summary: 'Heal up to 25 + 6 × Power of the front creature’s missing HP; no resurrection.',
    lore: 'No one ever left the Dagda’s cauldron hungry. A ladle of its broth, summoned to the field, mends what hunger and steel have opened.',
  }),
  spell({
    id: 'mist_of_manannan', name: 'Mist of Manannán', tier: 3, manaCost: 11, context: 'battle', target: 'enemy_army', pantheonId: 'celtic',
    effect: { type: 'mass_bonus', stat: 'speed', amount: -2, durationRounds: 2 },
    summary: 'Every enemy stack −2 Speed through the current and next round (never below 1).',
    lore: 'The sea god hides his islands behind a cloak of mist. Druids borrow a corner of it, and the enemy marches in circles.',
  }),

  // --- Mesoamerican: Ritual & Sacrifice ---
  spell({
    id: 'jaguar_spirit', name: 'Jaguar Spirit', tier: 1, manaCost: 5, context: 'battle', target: 'ally_stack', pantheonId: 'mesoamerican',
    effect: { type: 'attack_bonus', amount: 4, durationRounds: 1 },
    summary: 'Ally +4 Attack through the current round.',
    lore: 'The jaguar hunts by night and by surprise. Warriors who wear its pelt call its spirit into their arms for one leap.',
  }),
  spell({
    id: 'smoking_mirror', name: 'Smoking Mirror', tier: 2, manaCost: 7, context: 'battle', target: 'enemy_stack', pantheonId: 'mesoamerican',
    effect: { type: 'attack_bonus', amount: -4, durationRounds: 2 },
    summary: 'Enemy −4 Attack through the current and next round.',
    lore: 'Tezcatlipoca’s obsidian mirror shows each man his own death. Those who glimpse it fight like men already beaten.',
  }),
  spell({
    id: 'rain_of_tlaloc', name: 'Rain of Tlaloc', tier: 2, manaCost: 8, context: 'battle', target: 'friendly_army', pantheonId: 'mesoamerican',
    effect: { type: 'mass_heal', base: 8, perPower: 4 },
    summary: 'The front creature of every friendly stack heals up to 8 + 4 × Power HP (no resurrection).',
    lore: 'The rain god keeps four jars: one waters the maize, the others bring frost, drought and blight. His priests pray only for the first.',
  }),
];

// ---------------------------------------------------------------------------
// Artifacts
// ---------------------------------------------------------------------------

type Price = ArtifactDefinition['merchantPrice'];

const art = (
  id: string,
  name: string,
  slot: ArtifactDefinition['slot'],
  rarity: ArtifactRarity,
  effects: readonly EffectDefinition[],
  summary: string,
  lore: string,
  origin: string | null,
  price: Price | null,
  setId?: string,
): ArtifactDefinition => ({
  id,
  name,
  slot,
  effects,
  summary,
  lore,
  iconAssetId: `icon.artifact.${id}`,
  unique: rarity === 'relic',
  rarity,
  ...(price ? { merchantPrice: price } : {}),
  ...(origin ? { originPantheonId: origin } : {}),
  ...(setId ? { setId } : {}),
  scope: 'expanded',
  provenance: { source: 'proposed-this-build', note: 'Arcana library 2026-10-01 (P).' },
});

const atk = (amount: number): EffectDefinition => ({ type: 'commander_attribute', attribute: 'attack', amount });
const def = (amount: number): EffectDefinition => ({ type: 'commander_attribute', attribute: 'defense', amount });
const pow = (amount: number): EffectDefinition => ({ type: 'commander_attribute', attribute: 'power', amount });
const know = (amount: number): EffectDefinition => ({ type: 'commander_attribute', attribute: 'knowledge', amount });
const morale = (amount: number): EffectDefinition => ({ type: 'morale', amount });
const luck = (amount: number): EffectDefinition => ({ type: 'luck', amount });
const move = (percent: number): EffectDefinition => ({ type: 'movement_percent', percent });
const vision = (amount: number): EffectDefinition => ({ type: 'vision_radius', amount });
const mana = (amount: number): EffectDefinition => ({ type: 'mana_regen', amount });
const income = (resource: 'gold' | 'wood' | 'stone' | 'crystal' | 'favor', amount: number): EffectDefinition => ({ type: 'daily_income', resource, amount });

export const ARCANA_ARTIFACTS: readonly ArtifactDefinition[] = [
  // --- Head ---
  art('boar_crest_helm', 'Boar-crested Helm', 'head', 'minor', [def(2)], '+2 commander Defense.',
    'A bronze boar rides the crest, bristles raised. Northern smiths believed the boar watched over a sleeping warrior and woke him before an ambush.', 'norse', { gold: 2500 }),
  art('cap_of_darkness', 'Cap of Darkness', 'head', 'major', [vision(2), luck(1)], '+2 hexes of adventure vision and +1 Luck.',
    'Made by the Cyclopes for the lord of the dead, it hides its wearer from every eye. A hero who wears it sees much and is seldom seen.', 'greek', { gold: 3500, crystal: 1 }, 'gear_of_perseus'),
  art('nemes_of_ra', 'Nemes of Ra', 'head', 'major', [pow(1), know(1)], '+1 commander Spell Power and +1 Knowledge.',
    'The striped headcloth of kings, gold and lapis for the sun and the night sky. Whoever wears it speaks with the authority of both.', 'egyptian', { gold: 3000, crystal: 1 }, 'regalia_of_the_two_lands'),
  art('dragon_kabuto', 'Dragon Kabuto', 'head', 'minor', [atk(1), def(1)], '+1 commander Attack and +1 Defense.',
    'A lacquered helmet with a gilded dragon between its horns. It was made for a general who never once turned his back on a battle.', 'japanese', { gold: 2500 }, 'treasures_of_takamagahara'),
  art('mistletoe_crown', 'Mistletoe Crown', 'head', 'minor', [know(2)], '+2 commander Knowledge.',
    'Cut from an oak with a golden sickle on the sixth night of the moon. Druids wear it when they must remember everything at once.', 'celtic', { gold: 2000 }),
  art('quetzal_war_crown', 'Quetzal War Crown', 'head', 'major', [atk(1), morale(1)], '+1 commander Attack and +1 morale.',
    'Green plumes of the sacred bird, worth more than gold. A captain who wears them is seen from across the battlefield — that is the point.', 'mesoamerican', { gold: 3000, crystal: 1 }, 'gifts_of_the_feathered_serpent'),

  // --- Neck ---
  art('brisingamen_link', 'Link of Brísingamen', 'neck', 'major', [luck(1), pow(1)], '+1 Luck and +1 commander Spell Power.',
    'One link of the necklace four dwarves made for the goddess of love and war. It still glows faintly, like a hearth seen through snow.', 'norse', { gold: 3000, crystal: 1 }),
  art('heart_scarab', 'Heart Scarab', 'neck', 'minor', [mana(2)], '+2 mana at dawn.',
    'A green stone beetle laid over the heart of the dead, inscribed: “Do not stand against me.” The living wear it so their courage does not testify against them.', 'egyptian', { gold: 2000 }),
  art('magatama_string', 'String of Magatama', 'neck', 'major', [luck(1), vision(1)], '+1 Luck and +1 hex of adventure vision.',
    'Curved jewels like claws or crescent moons, strung on silk. They were offered to the sun goddess when the world went dark.', 'japanese', { gold: 2800 }, 'treasures_of_takamagahara'),
  art('torc_of_the_high_king', 'Torc of the High King', 'neck', 'major', [morale(1), def(1)], '+1 morale and +1 commander Defense.',
    'A twisted gold collar no one may wear who has run from a fight. The warband knows the rule; seeing it on their leader steadies them.', 'celtic', { gold: 3000 }),
  art('jade_pectoral', 'Jade Pectoral', 'neck', 'major', [pow(2)], '+2 commander Spell Power.',
    'Green jade is the breath of life. Priest-kings wore a carved plaque over the heart to keep their spirit strong in the presence of gods.', 'mesoamerican', { gold: 3000, crystal: 1 }, 'gifts_of_the_feathered_serpent'),

  // --- Shoulders (cape) ---
  art('wanderers_grey_cloak', 'Wanderer’s Grey Cloak', 'cape', 'major', [vision(2), move(5)], '+2 hexes of vision and +5% daily land movement.',
    'A broad-brimmed traveller in a grey cloak asks for a seat by every fire and listens more than he speaks. Some say he leaves his cloak behind for those who listen too.', 'norse', { gold: 3000 }),
  art('nemean_lionskin', 'Nemean Lionskin', 'cape', 'relic', [def(3)], '+3 commander Defense. Unique.',
    'No blade could cut the lion of Nemea; the hero strangled it and flayed it with its own claws. The pelt still turns steel.', 'greek', null),
  art('raven_feather_cloak', 'Raven-feather Cloak', 'cape', 'minor', [move(10)], '+10% daily land movement.',
    'The battle-crow goddess flies over every field before the fighting. A cloak of her feathers makes the road feel like flight.', 'celtic', { gold: 2500 }),
  art('jaguar_pelt_cape', 'Jaguar-pelt Cape', 'cape', 'major', [{ type: 'creature_stat', stat: 'attack', amount: 1, maxTier: 3 }], 'Tier 1–3 creatures +1 Attack in battle.',
    'Only a warrior who has taken four captives may wear the jaguar. Young soldiers fight harder near one, hoping to earn their own.', 'mesoamerican', { gold: 3500 }),

  // --- Weapon ---
  art('harpe_of_perseus', 'Harpe of Perseus', 'weapon', 'major', [atk(3)], '+3 commander Attack.',
    'A sickle-sword given by the god of messengers, sharp enough to take the head of a monster whose gaze turned men to stone.', 'greek', { gold: 4000, crystal: 1 }, 'gear_of_perseus'),
  art('rune_marked_sword', 'Rune-marked Sword', 'weapon', 'major', [atk(2), luck(1)], '+2 commander Attack and +1 Luck.',
    'Its maker hammered his name into the blade in letters no other smith could read. It bends, springs back and never breaks.', 'norse', { gold: 3500 }, 'arms_of_the_einherjar'),
  art('khopesh_of_set', 'Khopesh of Set', 'weapon', 'major', [atk(2), pow(1)], '+2 commander Attack and +1 Spell Power.',
    'A hooked bronze blade of the red desert’s god — storm, strength and confusion. It strikes from angles a shield does not expect.', 'egyptian', { gold: 3500 }, 'regalia_of_the_two_lands'),
  art('storm_gods_tachi', 'Storm God’s Tachi', 'weapon', 'relic', [atk(2), def(1), luck(1)], '+2 commander Attack, +1 Defense and +1 Luck. Unique.',
    'The storm god found it in the tail of the eight-headed serpent he had slain. It is said to part grass like wind and fire like water.', 'japanese', null),
  art('spear_of_lugh', 'Spear of Lugh', 'weapon', 'relic', [atk(3), morale(1)], '+3 commander Attack and +1 morale. Unique.',
    'One of four treasures the gods brought to Ireland. No battle was ever won against the one who held it.', 'celtic', null, 'treasures_of_the_tuatha'),
  art('obsidian_macuahuitl', 'Obsidian Macuahuitl', 'weapon', 'major', [atk(3)], '+3 commander Attack.',
    'A wooden war-club edged with blades of volcanic glass sharper than any steel. Each blade is a fragment of the smoking mirror.', 'mesoamerican', { gold: 4000, crystal: 1 }),

  // --- Shield ---
  art('polished_bronze_shield', 'Polished Bronze Shield', 'shield', 'major', [def(2), vision(1)], '+2 commander Defense and +1 hex of vision.',
    'Polished until it was a mirror, so its bearer could look at what must not be looked at. Scouts use it to see around corners.', 'greek', { gold: 3000 }, 'gear_of_perseus'),
  art('shieldmaiden_round_shield', 'Shieldmaiden’s Round Shield', 'shield', 'major', [def(1), { type: 'creature_stat', stat: 'defense', amount: 1, maxTier: 2 }], '+1 commander Defense; tier 1–2 creatures +1 Defense in battle.',
    'Painted linden-wood with an iron boss. Shieldmaidens held the front of the wall so the young warriors behind them could learn.', 'norse', { gold: 3000 }, 'arms_of_the_einherjar'),
  art('shield_of_the_medjay', 'Shield of the Medjay', 'shield', 'minor', [def(1), atk(1)], '+1 commander Defense and +1 Attack.',
    'Cowhide over a wooden frame, carried by the desert scouts who policed the tombs of kings. Light enough to run with, strong enough to stop a spear.', 'egyptian', { gold: 2200 }),
  art('fianna_targe', 'Targe of the Fianna', 'shield', 'minor', [def(2)], '+2 commander Defense.',
    'No one joined the war-band of the Fianna until they had stood in a pit with only a shield and a hazel stick, and nine warriors had cast spears at them.', 'celtic', { gold: 2500 }),
  art('eagle_chimalli', 'Eagle Chimalli', 'shield', 'major', [def(2), morale(1)], '+2 commander Defense and +1 morale.',
    'A round shield faced with eagle feathers and a gold rim. The eagle fights the sun’s enemies every dawn; its warriors fight the empire’s.', 'mesoamerican', { gold: 3200 }, 'gifts_of_the_feathered_serpent'),
  art('bronze_buckler', 'Bronze Buckler', 'shield', 'treasure', [def(1)], '+1 commander Defense.',
    'A small fist-shield sold in every market from the harbours to the mountains. Not glorious, but often enough.', null, { gold: 1200 }),

  // --- Armor ---
  art('einherjar_mail', 'Mail of the Einherjar', 'armor', 'major', [def(3)], '+3 commander Defense.',
    'The chosen dead fight every day in the hall of the slain and are whole again by evening. Their mail mends with them.', 'norse', { gold: 4000, crystal: 1 }, 'arms_of_the_einherjar'),
  art('lacquered_oyoroi', 'Lacquered Ō-yoroi', 'armor', 'major', [def(2), morale(1)], '+2 commander Defense and +1 morale.',
    'Hundreds of lacquered scales laced with silk in the colours of a house. Soldiers recognise the colours across a field and stand firmer.', 'japanese', { gold: 3500 }, 'treasures_of_takamagahara'),
  art('quilted_cotton_armor', 'Quilted Cotton Armor', 'armor', 'minor', [def(2)], '+2 commander Defense.',
    'Two fingers of salt-hardened cotton, stitched tight. Conquerors from over the sea laughed at it, then traded their steel for it.', 'mesoamerican', { gold: 2200 }),
  art('scarab_scale_corselet', 'Scarab-scale Corselet', 'armor', 'major', [def(2), mana(1)], '+2 commander Defense and +1 mana at dawn.',
    'Bronze scales shaped like beetles that roll the sun across the sky. The corselet is warm at dawn, as if it knows.', 'egyptian', { gold: 3200 }, 'regalia_of_the_two_lands'),

  // --- Rings ---
  art('draupnir_echo', 'Echo of Draupnir', 'ring', 'major', [income('gold', 250)], '+250 Gold per day.',
    'Every ninth night the All-father’s ring drips eight rings as heavy as itself. This is one of those — and it remembers the trick, a little.', 'norse', { gold: 4000, crystal: 2 }),
  art('andvaris_ring', 'Andvari’s Ring', 'ring', 'major', [income('gold', 500), luck(-1)], '+500 Gold per day, −1 Luck.',
    'The dwarf Andvari cursed the ring when it was taken from him: it would bring gold and ruin to all who owned it. Many have decided the gold is worth it.', 'norse', { gold: 3000 }),
  art('signet_of_hermes', 'Signet of Hermes', 'ring', 'minor', [move(10)], '+10% daily land movement.',
    'A herald’s ring with a winged staff cut in carnelian. Gatekeepers wave its bearer through; roads seem to agree.', 'greek', { gold: 2500 }),
  art('jade_ring_of_tlaloc', 'Jade Ring of Tlaloc', 'ring', 'minor', [mana(2)], '+2 mana at dawn.',
    'Cool as rainwater even in the dry season. Priests wear it to keep their spirit from drying out during long fasts.', 'mesoamerican', { gold: 2200 }),
  art('fairy_ring_band', 'Fairy-ring Band', 'ring', 'minor', [luck(1)], '+1 Luck.',
    'Woven from grass taken from inside a ring of mushrooms at dawn. The Fair Folk are said to look kindly on whoever wears it — or at least to look elsewhere.', 'celtic', { gold: 2000 }),

  // --- Feet ---
  art('boots_of_the_long_road', 'Boots of the Long Road', 'feet', 'major', [move(15)], '+15% daily land movement.',
    'Cobbled for a pilgrim who swore to visit every shrine of every god. He made it, they say, and the boots outlived him.', null, { gold: 3500, crystal: 1 }),
  art('tengu_geta', 'Tengu Geta', 'feet', 'minor', [move(10), vision(1)], '+10% daily land movement and +1 hex of vision.',
    'Tall one-toothed sandals of the mountain goblins, who taught swordsmanship to a boy in the forest. Wearers walk the ridges as if on a road.', 'japanese', { gold: 2500 }),
  art('scribes_papyrus_sandals', 'Scribe’s Papyrus Sandals', 'feet', 'treasure', [know(1), move(5)], '+1 commander Knowledge and +5% daily land movement.',
    'Woven reed sandals of the temple scribes, who walked between the granaries counting everything. Light, quiet and quick.', 'egyptian', { gold: 1500 }),
  art('skis_of_ullr', 'Skis of Ullr', 'feet', 'major', [move(15)], '+15% daily land movement.',
    'The god of the hunt crosses the winter faster on his skis than a horse on summer roads. He lends them to anyone who swears by his ring.', 'norse', { gold: 3500, crystal: 1 }),

  // --- Mount ---
  art('sleipnir_horseshoe', 'Horseshoe of Sleipnir', 'mount', 'relic', [move(20)], '+20% daily land movement. Unique.',
    'A shoe thrown by the eight-legged horse as it leapt the gate of the dead. Any mount that wears it forgets what tiredness was.', 'norse', null),
  art('solar_chariot_harness', 'Solar Chariot Harness', 'mount', 'major', [move(10), morale(1)], '+10% daily land movement and +1 morale.',
    'Gilded straps from the chariot of a king who drove into battle under the sun-disc. His soldiers followed the glint.', 'egyptian', { gold: 3200 }),
  art('hippeis_barding', 'Barding of the Hippeis', 'mount', 'minor', [def(1), move(5)], '+1 commander Defense and +5% daily land movement.',
    'Bronze chest-plate for the horse of a cavalry noble. Expensive, heavy, and much admired at festivals.', 'greek', { gold: 2200 }),
  art('wild_hunt_saddle', 'Saddle of the Wild Hunt', 'mount', 'major', [move(10), atk(1)], '+10% daily land movement and +1 commander Attack.',
    'On storm nights the Hunt rides across the sky. A saddle dropped from it still smells of rain and wants to gallop.', 'celtic', { gold: 3200 }),

  // --- Miscellaneous ---
  art('valkyries_horn', 'Valkyrie’s Horn', 'misc', 'major', [morale(1), { type: 'battle_xp_percent', percent: 10 }], '+1 morale and +10% battle experience.',
    'The choosers of the slain drink from it before they ride. Warriors who hear it blown know they are being watched — and judged.', 'norse', { gold: 3000 }, 'arms_of_the_einherjar'),
  art('djed_amulet', 'Djed Amulet', 'misc', 'major', [{ type: 'casualty_recovery', percent: 10 }], 'After a won battle each stack regains 10% of its losses (floored).',
    'The backbone of the god who died and rose again. Soldiers carry it so that what falls may stand up.', 'egyptian', { gold: 4000, crystal: 2 }),
  art('omamori_charm', 'Omamori Charm', 'misc', 'treasure', [luck(1)], '+1 Luck.',
    'A silk pouch from a shrine, holding a prayer no one may read. Opening it would let the luck out.', 'japanese', { gold: 1500 }),
  art('ogham_staves', 'Ogham Staves', 'misc', 'major', [{ type: 'spell_damage_percent', percent: 15 }], '+15% spell damage.',
    'Twenty letters cut as notches on yew staves, each a tree. Poets cast them to read fate and, when needed, to write it.', 'celtic', { gold: 3500, crystal: 1 }),
  art('sun_stone_codex', 'Sun-stone Codex', 'misc', 'major', [{ type: 'spell_damage_percent', percent: 10 }, pow(1)], '+10% spell damage and +1 commander Spell Power.',
    'A folding book of bark paper that counts the days of five suns. Its reader knows which hour belongs to which god.', 'mesoamerican', { gold: 3500, crystal: 1 }),
  art('lamp_of_prometheus', 'Lamp of Prometheus', 'misc', 'major', [mana(2), pow(1)], '+2 mana at dawn and +1 commander Spell Power.',
    'A clay lamp lit, the story goes, from the coal the Titan stole for mankind. It has never gone out.', 'greek', { gold: 3500, crystal: 1 }),
  art('cornucopia', 'Cornucopia', 'misc', 'relic', [income('wood', 1), income('stone', 1), income('gold', 200)], '+200 Gold, +1 Wood and +1 Stone per day. Unique.',
    'The horn of the goat who nursed the king of the gods, broken off and filled forever. Armies that carry it never forage.', 'greek', null),
  art('kibisis', 'Kibisis', 'misc', 'minor', [{ type: 'battle_xp_percent', percent: 10 }], '+10% battle experience.',
    'The silver satchel that carried the monster’s head. Whatever goes into it — trophies, stories, lessons — comes out larger.', 'greek', { gold: 2500 }, 'gear_of_perseus'),
  art('cauldron_of_plenty', 'Cauldron of Plenty', 'misc', 'relic', [{ type: 'casualty_recovery', percent: 10 }, morale(1)], 'After a won battle each stack regains 10% of its losses; +1 morale. Unique.',
    'The second treasure of the gods of Ireland. It fed every company that came to it, and none went away unsatisfied.', 'celtic', null, 'treasures_of_the_tuatha'),
  art('stone_of_fal', 'Stone of Fál', 'misc', 'relic', [luck(1), def(1)], '+1 Luck and +1 commander Defense. Unique.',
    'The third treasure: a stone that roars when the rightful king steps upon it. A fragment of it hums under the hand of a true leader.', 'celtic', null, 'treasures_of_the_tuatha'),
];

export const ARCANA_SETS: readonly ArtifactSetDefinition[] = [
  {
    id: 'gear_of_perseus',
    name: 'Gear of Perseus',
    summary: 'Sickle-sword, mirror shield, cap of darkness and satchel of the hero who slew the Gorgon.',
    pieceIds: ['harpe_of_perseus', 'polished_bronze_shield', 'cap_of_darkness', 'kibisis'],
    bonuses: [
      { pieces: 2, effects: [move(10)], summary: '2 pieces: +10% daily land movement' },
      { pieces: 4, effects: [{ type: 'creature_stat', stat: 'attack', amount: 2, ability: 'flight' }, { type: 'battle_xp_percent', percent: 15 }], summary: '4 pieces: flying creatures +2 Attack; +15% battle experience' },
    ],
  },
  {
    id: 'arms_of_the_einherjar',
    name: 'Arms of the Einherjar',
    summary: 'Sword, shield, mail and horn of the warriors chosen for the hall of the slain.',
    pieceIds: ['rune_marked_sword', 'shieldmaiden_round_shield', 'einherjar_mail', 'valkyries_horn'],
    bonuses: [
      { pieces: 2, effects: [morale(1)], summary: '2 pieces: +1 morale' },
      { pieces: 4, effects: [{ type: 'creature_stat', stat: 'attack', amount: 1 }, { type: 'creature_stat', stat: 'defense', amount: 1 }], summary: '4 pieces: every creature +1 Attack and +1 Defense in battle' },
    ],
  },
  {
    id: 'regalia_of_the_two_lands',
    name: 'Regalia of the Two Lands',
    summary: 'Headcloth, blade and corselet of a king of the river and the desert.',
    pieceIds: ['nemes_of_ra', 'khopesh_of_set', 'scarab_scale_corselet'],
    bonuses: [
      { pieces: 2, effects: [mana(2)], summary: '2 pieces: +2 mana at dawn' },
      { pieces: 3, effects: [{ type: 'casualty_recovery', percent: 10 }], summary: '3 pieces: after a won battle each stack regains 10% of its losses' },
    ],
  },
  {
    id: 'treasures_of_takamagahara',
    name: 'Treasures of Takamagahara',
    summary: 'Helmet, jewels and armour from the high plain of heaven.',
    pieceIds: ['dragon_kabuto', 'magatama_string', 'lacquered_oyoroi'],
    bonuses: [
      { pieces: 2, effects: [luck(1)], summary: '2 pieces: +1 Luck' },
      { pieces: 3, effects: [{ type: 'creature_stat', stat: 'speed', amount: 1, maxTier: 4 }], summary: '3 pieces: tier 1–4 creatures +1 Speed in battle' },
    ],
  },
  {
    id: 'treasures_of_the_tuatha',
    name: 'Treasures of the Tuatha Dé',
    summary: 'The spear, the cauldron and the stone the gods brought to Ireland.',
    pieceIds: ['spear_of_lugh', 'cauldron_of_plenty', 'stone_of_fal'],
    bonuses: [
      { pieces: 2, effects: [morale(1)], summary: '2 pieces: +1 morale' },
      { pieces: 3, effects: [{ type: 'creature_stat', stat: 'defense', amount: 2 }, luck(1)], summary: '3 pieces: every creature +2 Defense in battle; +1 Luck' },
    ],
  },
  {
    id: 'gifts_of_the_feathered_serpent',
    name: 'Gifts of the Feathered Serpent',
    summary: 'Crown, pectoral and shield blessed by the wind god who brought maize and books.',
    pieceIds: ['quetzal_war_crown', 'jade_pectoral', 'eagle_chimalli'],
    bonuses: [
      { pieces: 2, effects: [luck(1)], summary: '2 pieces: +1 Luck' },
      { pieces: 3, effects: [{ type: 'spell_damage_percent', percent: 20 }], summary: '3 pieces: +20% spell damage' },
    ],
  },
];

/**
 * Stories for the spells and artifacts that existed before this library (the
 * catalog merges them in; definitions that already carry `lore` keep it).
 */
export const EXISTING_LORE: Readonly<Record<string, string>> = {
  // Spells
  spark: 'The first thing every apprentice learns: a crack of light between two fingers, thrown hard. Masters never stop using it.',
  blessing: 'A priest touches a spear-point and names a god. For a little while every blow lands as if aimed by that god’s own hand.',
  ward: 'A circle drawn in the air around a company. Patron gods grant it to those who keep their oaths.',
  warcry: 'A shout that is half prayer, half threat. Soldiers who hear it remember why they came.',
  lightning: 'The sky-father’s weapon, borrowed for one stroke. Those who ask too often find the sky stops answering.',
  mend: 'Field-surgeons’ magic, plain and practical: flesh remembers being whole and is persuaded to be so again.',
  veil: 'A shimmer in the air like heat over stones. Arrows lose their way in it.',
  divine_sight: 'Gods see the whole world at once. For a single night, they lend a hero a corner of that view.',
  swiftness: 'Spoken over a soldier’s feet, it makes the ground feel like a downhill road.',
  weariness: 'Every soldier knows the hour before dawn when the shield gets heavy. This spell brings that hour early.',
  fleet_foot: 'Couriers’ magic: the day stretches a little longer for whoever carries urgent news.',
  homecoming: 'Every hearth remembers the one who left it. The spell lets that memory pull the hero home.',
  aegis: 'The goatskin shield of the sky-father, lent to his daughter of wisdom. Its shadow over an army turns aside every second blow.',
  thunderclap: 'The noise of the king of the gods losing his temper. Anyone close enough to hear it is close enough to be hurt.',
  berserkergang: 'Bear-shirted warriors who bite their shields and feel no wounds. The spell spreads their madness through the ranks — briefly.',
  frost_breath: 'The breath of the frost giants, who were here before the gods. Joints stiffen, feet freeze to the ground.',
  scarab_swarm: 'The scarab rolls the sun across the sky. When angered, a thousand of them roll over whatever stands in the way.',
  eye_of_horus: 'The falcon god lost an eye fighting for his father’s throne; it was healed and became a charm of seeing.',
  divine_wind: 'A wind sent by the gods once scattered an invading fleet. Called over an army, it pushes every soldier forward.',
  blossom_veil: 'Cherry blossoms fall for only a few days. While they fall, nothing sharp seems to reach the one they cover.',
  glamour: 'The Fair Folk’s favourite trick: make a sword look like a stick, a captain like a fool. The enemy forgets how to fight.',
  wild_hunt: 'Hounds, horns and riders out of the storm. Whatever the Hunt passes over is never quite the same.',
  obsidian_rain: 'Volcanic glass falls like hail from a sky the colour of smoke. Priests say the mountain is only returning what was taken from it.',
  fifth_sun: 'Four suns have died and the fifth is kept alive by sacrifice. For one round, every warrior burns with its light.',
  // Artifacts
  warding_token: 'A clay token stamped with a centaur’s hoof, found in a cache in the hills. Shepherds say it keeps wolves — and arrows — away.',
  bronze_standard: 'A bronze eagle on an ash pole. Where it stands, the line stands.',
  winged_sandals: 'Sandals with small wings at the heel, of the kind the messenger god wears. These are a mortal smith’s copy, and almost as good.',
  bronze_spear: 'An honest spear of ash and bronze, the weapon of every citizen soldier.',
  storm_iron_blade: 'Forged from iron that fell from the sky in a thunderstorm. It hums before a battle.',
  linen_cuirass: 'Layers of linen glued and stitched until they are as stiff as wood. Cheaper than bronze and cooler in summer.',
  scale_hauberk: 'Overlapping bronze scales on a leather shirt, like the skin of a river serpent.',
  seers_circlet: 'A thin silver band worn by oracles, who see further with their eyes closed.',
  crown_of_counsel: 'A crown given to a queen who never made a decision without hearing the poorest of her people first.',
  knucklebone_charm: 'Five sheep knucklebones from a game soldiers play in camp. Someone always wins; whoever carries these wins more often.',
  band_of_insight: 'A ring of plain iron, engraved inside with “Know yourself.”',
  watchers_ring: 'A ring set with a stone like an eye. The night watch passes it from sentry to sentry.',
  swift_saddle: 'A light saddle of the steppe riders, who are born in the saddle and never quite leave it.',
  phalanx_spear: 'Long, heavy, and meant to be held with a hundred others pointing the same way.',
  phalanx_aspis: 'A great round shield, carried on the left arm to cover the neighbour as much as oneself.',
  phalanx_helm: 'A bronze helm with a horsehair crest that makes a man look a head taller in the front rank.',
  sun_diadem: 'A diadem of gold rays, worn by a priest-king who was the sun’s representative on earth.',
  sun_scepter: 'A gold rod topped with a sun-disc. The priest-king pointed it, and the kingdom moved.',
  sun_signet: 'The priest-king’s seal: a sun pressed into wax made any order law.',
  wayfarer_boots: 'Boots resoled so many times that nothing of the first pair remains — except, perhaps, the luck.',
  wayfarer_cloak: 'A heavy travelling cloak with deep pockets and a hood that keeps out rain from any direction.',
  wayfarer_compass: 'A needle that points not north but toward the nearest place worth seeing.',
  champion_blade: 'The sword of a champion whose name is lost. It still remembers every duel.',
  champion_torc: 'A champion’s gold neck-ring, worn smooth by years of fighting.',
  champion_banner: 'A tattered banner whose emblem has faded. Soldiers still know what it means.',
};
