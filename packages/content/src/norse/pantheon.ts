/**
 * Norse pantheon: gods, heroes, hero classes and the pantheon aggregate.
 *
 * PROPOSED for this build. The divine structure mirrors the Greek one so the
 * two pantheons stay comparable: a patron with no mechanical bonus (like Zeus)
 * and one exclusive first-minor pair unlocked by Hof II for 20 Favor (like
 * Athena/Ares), built only from the shared effect vocabulary. The other gods on
 * the owner's board are listed as undesigned. Hero classes mirror the three
 * existing classes' numbers with Norse names.
 */
import type { GodDefinition, HeroClassDefinition, HeroDefinition, PantheonDefinition } from '@pr/rules';
import { BLESSINGS, blessing, secondMinorGod } from '../common/gods';
import { SIGNATURES } from '../common/signatures';

const undesigned = (id: string, name: string, domain: string): GodDefinition => ({
  id,
  pantheonId: 'norse',
  name,
  domain,
  role: 'undesigned',
  requirements: [],
  favorCost: 0,
  benefits: [],
  benefitSummary: ['Blessing not yet designed for this build.'],
  portraitAssetId: `god.norse.${id.replace(/^norse_/, '')}.portrait`,
  implementationStatus: 'preparation',
  provenance: { source: 'concept-board' },
});

export const NORSE_GODS: readonly GodDefinition[] = [
  {
    id: 'norse_odin',
    pantheonId: 'norse',
    name: 'Odin',
    domain: 'Wisdom & Knowledge',
    role: 'patron',
    requirements: [],
    favorCost: 0,
    benefits: [],
    benefitSummary: ['Patron of the Norse skirmish armies.', 'No mechanical bonus in rule profile pr-0.2-candidate (mirrors Zeus; proposed).'],
    quote: 'Every road north is paid for in wisdom.',
    portraitAssetId: 'god.norse.odin.portrait',
    implementationStatus: 'implemented',
    provenance: { source: 'proposed-this-build', note: 'Patron role mirrors Zeus; no bonus.' },
  },
  {
    id: 'norse_thor',
    pantheonId: 'norse',
    name: 'Thor',
    domain: 'Strength & Storms',
    role: 'minor',
    exclusivityGroup: 'first_minor',
    requirements: [{ type: 'has_building', buildingId: 'norse_hof_2' }],
    favorCost: 20,
    benefits: [
      { type: 'commander_attribute', attribute: 'attack', amount: 1 },
      { type: 'spell_eligibility', spellId: 'warcry' },
    ],
    benefitSummary: ['+1 Attack for your commanders.', 'War Cry becomes learnable at a later Rune Circle visit.'],
    quote: 'Swing first, and swing true.',
    portraitAssetId: 'god.norse.thor.portrait',
    implementationStatus: 'implemented',
    provenance: { source: 'proposed-this-build', note: 'Mirrors Ares (P).' },
  },
  {
    id: 'norse_tyr',
    pantheonId: 'norse',
    name: 'Tyr',
    domain: 'Law & Honor',
    role: 'minor',
    exclusivityGroup: 'first_minor',
    requirements: [{ type: 'has_building', buildingId: 'norse_hof_2' }],
    favorCost: 20,
    benefits: [
      { type: 'commander_attribute', attribute: 'defense', amount: 1 },
      { type: 'spell_eligibility', spellId: 'ward' },
    ],
    benefitSummary: ['+1 Defense for your commanders.', 'Ward becomes learnable at a later Rune Circle visit.'],
    quote: 'An oath holds the line longer than a shield.',
    portraitAssetId: 'god.norse.tyr.portrait',
    implementationStatus: 'implemented',
    provenance: { source: 'proposed-this-build', note: 'Mirrors Athena (P).' },
  },
  // Second minor-god choice (proposed this build).
  ...(
    [
      ['norse_freyja', 'Freyja', 'Love & Fertility', 'Every hall fills again by spring.', blessing(BLESSINGS.growth(1, 5))],
      ['norse_heimdall', 'Heimdall', 'Vigilance & Alertness', 'I hear the grass grow. I heard you coming.', blessing(BLESSINGS.vision(2), BLESSINGS.creatures('defense', 1, { label: 'All your creatures' }))],
      ['norse_hel', 'Hel', 'Death & Transition', 'Half of what falls is mine. I may lend it back.', blessing(BLESSINGS.recovery(15))],
    ] as const
  ).map(([id, name, domain, quote, b]) =>
    secondMinorGod({ id, pantheonId: 'norse', name, domain, quote, ...b, portraitAssetId: `god.norse.${id.replace(/^norse_/, '')}.portrait`, templeId: 'norse_hof_2', civicHallId: 'norse_high_hall' }),
  ),
  undesigned('norse_loki', 'Loki', 'Trickery & Change'),
  undesigned('norse_frigg', 'Frigg', 'Foresight & Protection'),
  undesigned('norse_baldr', 'Baldr', 'Light & Purity'),
  undesigned('norse_njord', 'Njord', 'Sea & Prosperity'),
];

/** Norse-named classes; numbers mirror Champion, Strategos and Oracle (proposed). */
export const NORSE_HERO_CLASSES: readonly HeroClassDefinition[] = [
  {
    id: 'huscarl',
    name: 'Huscarl',
    startingAttributes: { attack: 2, defense: 2, power: 1, knowledge: 1 },
    startingSkills: [{ skillId: 'offense', rank: 1 }],
    primaryGainCycle: ['attack', 'defense', 'attack', 'knowledge'],
    startsWithSpellbook: false,
    summary: 'A sworn household warrior who leads from the shield wall (mirrors Champion; proposed).',
  },
  {
    id: 'jarl',
    name: 'Jarl',
    startingAttributes: { attack: 1, defense: 2, power: 1, knowledge: 2 },
    startingSkills: [{ skillId: 'leadership', rank: 1 }],
    primaryGainCycle: ['defense', 'attack', 'knowledge', 'power'],
    startsWithSpellbook: false,
    summary: 'A war-leader whose word keeps the host together (mirrors Strategos; proposed).',
  },
  {
    id: 'volva',
    name: 'Völva',
    startingAttributes: { attack: 0, defense: 0, power: 3, knowledge: 3 },
    startingSkills: [{ skillId: 'wisdom', rank: 1 }],
    primaryGainCycle: ['power', 'knowledge', 'power', 'defense'],
    startsWithSpellbook: true,
    summary: 'A seeress who reads the runes and casts them in battle (mirrors Oracle; proposed).',
  },
];

const hero = (id: string, name: string, title: string, classId: string, biography: string): HeroDefinition => ({
  id,
  pantheonId: 'norse',
  name,
  title,
  classId,
  biography,
  portraitAssetId: `hero.norse.${id.replace(/^norse_/, '')}.portrait`,
  availability: 'hireable',
  provenance: { source: 'concept-board', note: 'Name and title from the owner Norse board; class assignment proposed.' },
});

export const NORSE_HEROES: readonly HeroDefinition[] = [
  hero('norse_sigurd', 'Sigurd', 'Dragonslayer & Destiny', 'huscarl', 'Concept-board hero. A wanderer who once stood against a wyrm and now leads others against worse. Hireable in skirmish.'),
  hero('norse_brynhild', 'Brynhild', 'Valkyrie & Devotion', 'huscarl', 'Concept-board hero. A shieldmaiden bound by an oath she chose herself. Hireable in skirmish.'),
  hero('norse_ragnar', 'Ragnar', 'Conquest & Glory', 'jarl', 'Concept-board hero. A raider-king who measures a season by the harbors that answer to him. Hireable in skirmish.'),
  hero('norse_lagertha', 'Lagertha', 'Leadership & Resilience', 'jarl', 'Concept-board hero. A war-leader who has never lost a retreat she ordered. Hireable in skirmish.'),
  hero('norse_hervor', 'Hervor', 'Ancestral Power & Vengeance', 'volva', 'Concept-board hero. She woke a grave to claim a sword; the runes have answered her since. Hireable in skirmish.'),
];

export const NORSE_PANTHEON: PantheonDefinition = {
  id: 'norse',
  name: 'Norse',
  epithet: 'Fate & Battle',
  signature: SIGNATURES.norse,
  summary:
    'Barrow-risen Draugar, frost wolves, valkyries and the root-gnawing wyrms of the deep north. Playable in skirmish with proposed, unplaytested values.',
  playability: 'playable',
  roster: [
    { tier: 1, familyId: 'norse_draugr' },
    { tier: 2, familyId: 'norse_frost_wolf' },
    { tier: 3, familyId: 'norse_frost_troll' },
    { tier: 4, familyId: 'norse_valkyrie' },
    { tier: 5, familyId: 'norse_lindworm' },
    { tier: 6, familyId: 'norse_jotunn' },
    { tier: 7, familyId: 'norse_nidhogg_wyrm' },
  ],
  heroIds: NORSE_HEROES.map((h) => h.id),
  godIds: NORSE_GODS.map((g) => g.id),
  townArchetypeId: 'norse_hold',
  theme: { accent: '#7fb3d9', accentSoft: '#27435a', emblemAssetId: 'emblem.norse', musicThemeId: 'music.norse.theme' },
  provenance: { source: 'proposed-this-build', note: 'Owner decision: Claude proposes every Norse number; labelled proposed.' },
};
