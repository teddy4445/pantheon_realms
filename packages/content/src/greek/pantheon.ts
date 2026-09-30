/**
 * Greek pantheon: gods, heroes and the pantheon aggregate.
 *
 * Zeus (fixed campaign patron, no documented mechanical bonus), Athena and
 * Ares (exclusive first minor-god choice, design/02 §8) follow the documents.
 * Hermes, Demeter and Hades form a PROPOSED second choice (common/gods.ts).
 * The other four gods from the concept board are listed as undesigned.
 */
import type { GodDefinition, HeroDefinition, PantheonDefinition } from '@pr/rules';
import { BLESSINGS, blessing, secondMinorGod } from '../common/gods';
import { SIGNATURES } from '../common/signatures';

const undesigned = (id: string, name: string, domain: string): GodDefinition => ({
  id,
  pantheonId: 'greek',
  name,
  domain,
  role: 'undesigned',
  requirements: [],
  favorCost: 0,
  benefits: [],
  benefitSummary: ['Blessing not yet designed for this build.'],
  portraitAssetId: `god.greek.${id}.portrait`,
  implementationStatus: 'preparation',
  provenance: { source: 'concept-board' },
});

export const GREEK_GODS: readonly GodDefinition[] = [
  {
    id: 'zeus',
    pantheonId: 'greek',
    name: 'Zeus',
    domain: 'Lightning & Power',
    role: 'patron',
    requirements: [],
    favorCost: 0,
    benefits: [],
    benefitSummary: ['Fixed patron of The Three Beacons.', 'No mechanical bonus is defined in rule profile pr-0.2-candidate.'],
    quote: 'The storm answers to the one who keeps the lights.',
    portraitAssetId: 'god.greek.zeus.portrait',
    implementationStatus: 'implemented',
    provenance: { source: 'v0.3-campaign' },
  },
  {
    id: 'athena',
    pantheonId: 'greek',
    name: 'Athena',
    domain: 'Knowledge & Strategy',
    role: 'minor',
    exclusivityGroup: 'first_minor',
    requirements: [{ type: 'has_building', buildingId: 'temple_2' }],
    favorCost: 20,
    benefits: [
      { type: 'commander_attribute', attribute: 'defense', amount: 1 },
      { type: 'spell_eligibility', spellId: 'ward' },
    ],
    benefitSummary: ['+1 Defense for your commanders.', 'Ward becomes learnable at a later Sanctum visit.'],
    quote: 'Hold the road together.',
    portraitAssetId: 'god.greek.athena.portrait',
    implementationStatus: 'implemented',
    provenance: { source: 'v0.2-candidate-rules' },
  },
  {
    id: 'ares',
    pantheonId: 'greek',
    name: 'Ares',
    domain: 'War & Conquest',
    role: 'minor',
    exclusivityGroup: 'first_minor',
    requirements: [{ type: 'has_building', buildingId: 'temple_2' }],
    favorCost: 20,
    benefits: [
      { type: 'commander_attribute', attribute: 'attack', amount: 1 },
      { type: 'spell_eligibility', spellId: 'warcry' },
    ],
    benefitSummary: ['+1 Attack for your commanders.', 'War Cry becomes learnable at a later Sanctum visit.'],
    quote: 'Break the force that bars the road.',
    portraitAssetId: 'god.greek.ares.portrait',
    implementationStatus: 'implemented',
    provenance: { source: 'v0.2-candidate-rules' },
  },
  // Second minor-god choice (proposed this build; not available in The Three Beacons).
  ...(
    [
      ['hermes', 'Hermes', 'Trade & Movement', 'A road walked quickly is a road walked twice.', blessing(BLESSINGS.movement(15), BLESSINGS.income('gold', 250))],
      ['demeter', 'Demeter', 'Harvest & Abundance', 'Feed the valley and the valley will march for you.', blessing(BLESSINGS.growth(2, 3))],
      ['hades', 'Hades', 'Underworld & Control', 'Not every shade has to stay below.', blessing(BLESSINGS.recovery(15))],
    ] as const
  ).map(([id, name, domain, quote, b]) =>
    secondMinorGod({ id, pantheonId: 'greek', name, domain, quote, ...b, portraitAssetId: `god.greek.${id}.portrait`, templeId: 'temple_2', civicHallId: 'city_hall' }),
  ),
  undesigned('poseidon', 'Poseidon', 'Sea & Dominion'),
  undesigned('apollo', 'Apollo', 'Sun & Inspiration'),
  undesigned('artemis', 'Artemis', 'Hunt & Wilderness'),
  undesigned('hera', 'Hera', 'Authority & Family'),
];

const hero = (
  id: string,
  name: string,
  title: string,
  classId: string,
  availability: HeroDefinition['availability'],
  biography: string,
  source: HeroDefinition['provenance']['source'],
): HeroDefinition => ({
  id,
  pantheonId: 'greek',
  name,
  title,
  classId,
  biography,
  portraitAssetId: `hero.greek.${id}.portrait`,
  availability,
  provenance: { source },
});

export const GREEK_HEROES: readonly HeroDefinition[] = [
  hero('alexios', 'Alexios', 'Strategos of Asterion', 'strategos', 'campaign', 'The expedition commander sent to relight the three beacons of the Asterion coast. His command portrait, skills and artifacts persist through The Three Beacons.', 'v0.3-campaign'),
  hero('melas', 'Melas', 'Former Coastal Commander', 'champion', 'enemy', 'A former coastal commander who carried the great beacon’s lens to the storm plateau, believing one light should command the whole coast.', 'v0.3-campaign'),
  hero('scout_captain', 'Scout Captain', 'Plateau Patrol', 'champion', 'enemy', 'Leader of the patrol that sweeps the middle plateau between the first crossings and the ward gate.', 'v0.3-campaign'),
  hero('heracles', 'Heracles', 'Hero of Labors', 'champion', 'hireable', 'Concept-board hero. Class assignment is provisional. Hireable in skirmish; not part of The Three Beacons.', 'concept-board'),
  hero('achilles', 'Achilles', 'Swift Champion', 'champion', 'hireable', 'Concept-board hero. Class assignment is provisional. Hireable in skirmish; not part of The Three Beacons.', 'concept-board'),
  hero('odysseus', 'Odysseus', 'Cunning Voyager', 'strategos', 'hireable', 'Concept-board hero. Class assignment is provisional. Hireable in skirmish; not part of The Three Beacons.', 'concept-board'),
  hero('atalanta', 'Atalanta', 'Huntress of Arcadia', 'strategos', 'hireable', 'Concept-board hero. Class assignment is provisional. Hireable in skirmish; not part of The Three Beacons.', 'concept-board'),
  hero('perseus', 'Perseus', 'Slayer of the Gorgon', 'oracle', 'hireable', 'Concept-board hero. Class assignment is provisional. Hireable in skirmish; not part of The Three Beacons.', 'concept-board'),
];

export const GREEK_PANTHEON: PantheonDefinition = {
  id: 'greek',
  name: 'Greek',
  epithet: 'Glory & Champions',
  signature: SIGNATURES.greek,
  summary:
    'Disciplined hoplites, sky-borne griffins and the one-eyed giants of Thunder Quarry. The faction of The Three Beacons campaign; playable in skirmish too.',
  playability: 'playable',
  roster: [
    { tier: 1, familyId: 'hoplite' },
    { tier: 2, familyId: 'peltast' },
    { tier: 3, familyId: 'griffin' },
    { tier: 4, familyId: 'cavalry' },
    { tier: 5, familyId: 'temple_adept' },
    { tier: 6, familyId: 'minotaur' },
    { tier: 7, familyId: 'cyclops' },
  ],
  heroIds: GREEK_HEROES.map((h) => h.id),
  godIds: GREEK_GODS.map((g) => g.id),
  townArchetypeId: 'greek_polis',
  theme: { accent: '#3b73d9', accentSoft: '#1b2f57', emblemAssetId: 'emblem.greek', musicThemeId: 'music.greek.theme' },
  provenance: { source: 'v0.3-catalog', note: 'Roster provisionally reduced to one family per tier (Griffin at tier 3).' },
};
