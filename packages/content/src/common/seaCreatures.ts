/**
 * The five neutral sea-creature families of the sea-creature delivery (2026-10-17,
 * assets-source/art/sea-creatures-v1, design/sea-creature-roster.json): Hippocampus → Tempest
 * Hippocampus, Cetus → Crownfin Cetus, Hafgufa → Abyssal Hafgufa (a rare encounter boss), Isonade →
 * Razorwake Isonade and Triton → Stormcaller Triton. (The rejected two-fish family is not part of the
 * game.) Exactly base + one delivered upgrade per family.
 *
 * Neutral and met only in sea encounters (`availability: 'sea_encounters'`): never a town roster or a
 * hiring site, never on land, never joining an army; the random-map generator leaves them out.
 *
 * Traits are explicit abilities, never names or themes: both Hippocampi fly (`flight`, one hex,
 * melee); the other eight forms carry the aquatic `swimmer` trait, `shooter`, and their family's innate
 * sea attack — a `renewable_shots` ability (capacity 2, set to 2 at every round start, round 1
 * included) named for the attack (Brine Jet, Deepwater Blast, Barbed Spray, Conch Blast). The ranges
 * are the delivery's (8 → 9, 9 → 10, 8 → 9, 9 → 10); on the single-ship sea board a swimmer's shot
 * reaches at least 8 hexes after climate (the layout's `swimmerShotRangeFloor`).
 *
 * Statistics, prices and growth are NOT in the delivery: PROPOSED here, unplaytested, placed in the
 * band of each tier's comparable neutral and roster creatures (Hippocampus tier 3 beside the Griffin
 * and Pegasus; Triton tier 4 beside the Cavalry and Wyvern; Isonade tier 5 beside the Temple Adept and
 * the Norse tier-5 shooter; Cetus tier 6 beside the Minotaur and Basilisk; Hafgufa tier 7 beside the
 * Cyclops and Elder Drake). Shooters sit a little below their tier's melee creatures in Attack,
 * Defense and HP (the existing shooter discount); their ammunition renews but each shot still costs a
 * whole activation. The Hippocampi take one hex, so their HP sits a little under the two-hex tier-3
 * flyers. The Hafgufa is a boss: the tier's HP and Defense, a step slower.
 */
import type { AbilityDefinition, LoreDefinition } from '@pr/rules';
import { s, type FamilySpec } from '../greek/creatures';

const MYTH = 'Mythological inspiration only; the game creature, its upgrade, its attack and its numbers are an original adaptation without faction allegiance.';
const portrait = (id: string) => ({ portraitAssetId: `seacreatures.portrait.${id}` });
const SHOT_RULE = 'Its ammunition is set to 2 at the start of every battle round, round 1 included (never more). A shot spends one and the stack’s whole action; the refill grants no action.';
const SHOT_LIMIT = 'Cannot shoot while an enemy stands adjacent (it may strike in melee instead); half damage in the far half of its range. On the single-ship sea board its shots reach at least 8 hexes.';

/** The aquatic trait and the four innate sea attacks (renewable shots; proposed, unplaytested). */
export const SEA_ABILITIES: readonly AbilityDefinition[] = [
  {
    id: 'swimmer',
    name: 'Swimmer',
    activation: 'passive',
    summary: 'Lives in the water: it swims and never comes on deck.',
    exactRule: 'On a sea battlefield every hex of this stack stays in the water; it fights deck enemies with its shots, or in melee across the rail when they stand adjacent.',
    restriction: 'Cannot enter the deck or any land hex. A pull or push toward the deck simply fails.',
    rule: { type: 'swimmer' },
    implementationStatus: 'implemented',
  },
  {
    id: 'sea_brine_jet',
    name: 'Brine Jet',
    activation: 'passive',
    summary: 'A pale turquoise jet of sea water, two every round.',
    exactRule: SHOT_RULE,
    restriction: SHOT_LIMIT,
    rule: { type: 'renewable_shots', capacity: 2 },
    implementationStatus: 'implemented',
  },
  {
    id: 'sea_deepwater_blast',
    name: 'Deepwater Blast',
    activation: 'passive',
    summary: 'A dark sphere of crushing water pressure, two every round.',
    exactRule: SHOT_RULE,
    restriction: SHOT_LIMIT,
    rule: { type: 'renewable_shots', capacity: 2 },
    implementationStatus: 'implemented',
  },
  {
    id: 'sea_barbed_spray',
    name: 'Barbed Spray',
    activation: 'passive',
    summary: 'A lash of the tail flings ivory hooked barbs, two every round.',
    exactRule: SHOT_RULE,
    restriction: SHOT_LIMIT,
    rule: { type: 'renewable_shots', capacity: 2 },
    implementationStatus: 'implemented',
  },
  {
    id: 'sea_conch_blast',
    name: 'Conch Blast',
    activation: 'passive',
    summary: 'Rings of sound pressure from a war conch, two every round.',
    exactRule: SHOT_RULE,
    restriction: SHOT_LIMIT,
    rule: { type: 'renewable_shots', capacity: 2 },
    implementationStatus: 'implemented',
  },
];

/** Proposed balance status of the sea families (read by the interface's notes; never a rule). */
export const SEA_CREATURE_BALANCE_NOTE = 'Proposed values (sea-creature delivery 2026-10-17): statistics, prices and growth are not playtested.';

export const SEA_FAMILY_SPECS: readonly FamilySpec[] = [
  {
    familyId: 'hippocampus',
    name: 'Hippocampi',
    pantheonId: null,
    tier: 3,
    growth: 6,
    role: 'flying_interceptor',
    roleLabel: 'Winged sea raider (neutral)',
    body: 'griffin',
    availability: 'sea_encounters',
    base: {
      id: 'hippocampus',
      name: 'Hippocampus',
      plural: 'Hippocampi',
      stats: s(8, 6, 22, [3, 5], 8, 0, 1),
      cost: { gold: 230 },
      abilities: ['flight'],
      summary: 'Winged sea-horses with ivory faces and teal fins. They hover over the waves and dive on a ship’s deck with a wing strike.',
      portraitAlt: 'A winged sea-horse with an ivory horse face, teal fins and compact feathered wings over the sea.',
      ...portrait('hippocampus'),
    },
    upgraded: {
      id: 'tempest_hippocampus',
      name: 'Tempest Hippocampus',
      plural: 'Tempest Hippocampi',
      stats: s(10, 8, 27, [4, 6], 10, 0, 1),
      cost: { gold: 300 },
      abilities: ['flight'],
      summary: 'Storm-riders of the open sea: a great fan of wings, a tall golden fin crest and cobalt scales. Faster, and harder to shake off.',
      portraitAlt: 'A winged sea-horse with a large wing fan, a tall golden fin crest and cobalt scales over stormy water.',
      ...portrait('tempest_hippocampus'),
    },
  },
  {
    familyId: 'triton',
    name: 'Tritons',
    pantheonId: null,
    tier: 4,
    growth: 4,
    role: 'ranged_support',
    roleLabel: 'Sea warrior with a war conch (neutral)',
    body: 'humanoid_caster',
    availability: 'sea_encounters',
    base: {
      id: 'triton',
      name: 'Triton',
      plural: 'Tritons',
      stats: s(9, 7, 28, [5, 7], 6, 2, 1, 9),
      cost: { gold: 360 },
      abilities: ['swimmer', 'shooter', 'sea_conch_blast'],
      summary: 'Fish-tailed sea warriors with jade scales and an ivory conch. Its blast carries across the waves to a ship’s deck.',
      portraitAlt: 'A fish-tailed sea warrior with jade scales, dark kelp hair, an ivory conch and a compact shell guard.',
      ...portrait('triton'),
    },
    upgraded: {
      id: 'stormcaller_triton',
      name: 'Stormcaller Triton',
      plural: 'Stormcaller Tritons',
      stats: s(11, 9, 33, [6, 8], 7, 2, 1, 10),
      cost: { gold: 460 },
      abilities: ['swimmer', 'shooter', 'sea_conch_blast'],
      summary: 'Heralds of the storm: a tall red fin crest, white hair, broad shell pauldrons and a conch that glows indigo. Reaches one hex further.',
      portraitAlt: 'A fish-tailed sea warrior with a tall red dorsal crest, white hair, expanded shell pauldrons and a glowing indigo conch.',
      ...portrait('stormcaller_triton'),
    },
  },
  {
    familyId: 'isonade',
    name: 'Isonade',
    pantheonId: null,
    tier: 5,
    growth: 3,
    role: 'ranged_support',
    roleLabel: 'Barbed sea hunter (neutral)',
    body: 'serpent',
    availability: 'sea_encounters',
    base: {
      id: 'isonade',
      name: 'Isonade',
      plural: 'Isonade',
      stats: s(12, 8, 36, [8, 11], 6, 2, 2, 8),
      cost: { gold: 420 },
      abilities: ['swimmer', 'shooter', 'sea_barbed_spray'],
      summary: 'A shark-headed hunter of the coastal shallows whose hooked tail lashes barbs across the water.',
      portraitAlt: 'A great shark-headed sea creature with a long hooked tail rising from dark water.',
      ...portrait('isonade'),
    },
    upgraded: {
      id: 'razorwake_isonade',
      name: 'Razorwake Isonade',
      plural: 'Razorwake Isonade',
      stats: s(13, 10, 41, [9, 12], 7, 2, 2, 9),
      cost: { gold: 530 },
      abilities: ['swimmer', 'shooter', 'sea_barbed_spray'],
      summary: 'The oldest hunters, with a high red dorsal sail and double rows of ivory barbs along the tail. Reaches one hex further.',
      portraitAlt: 'A shark-headed sea creature with a tall red dorsal sail and double rows of ivory tail barbs.',
      ...portrait('razorwake_isonade'),
    },
  },
  {
    familyId: 'cetus',
    name: 'Ceti',
    pantheonId: null,
    tier: 6,
    growth: 2,
    role: 'ranged_support',
    roleLabel: 'Sea monster with a brine jet (neutral)',
    body: 'serpent',
    availability: 'sea_encounters',
    base: {
      id: 'cetus',
      name: 'Cetus',
      plural: 'Ceti',
      stats: s(14, 13, 85, [14, 19], 5, 2, 2, 8),
      cost: { gold: 1000 },
      abilities: ['swimmer', 'shooter', 'sea_brine_jet'],
      summary: 'A great sea monster with a short red crest and small tusks. It needs no boarding: its brine jet strikes the deck from the water.',
      portraitAlt: 'A huge sea monster with a short red crest and small tusks breaking the surface.',
      ...portrait('cetus'),
    },
    upgraded: {
      id: 'crownfin_cetus',
      name: 'Crownfin Cetus',
      plural: 'Crownfin Ceti',
      stats: s(16, 15, 100, [16, 22], 6, 2, 2, 9),
      cost: { gold: 1250 },
      abilities: ['swimmer', 'shooter', 'sea_brine_jet'],
      summary: 'Crowned with five tall ivory fins and great curved cheek tusks. Reaches one hex further.',
      portraitAlt: 'A huge sea monster crowned with five tall ivory fins and prominent curved cheek tusks.',
      ...portrait('crownfin_cetus'),
    },
  },
  {
    familyId: 'hafgufa',
    name: 'Hafgufas',
    pantheonId: null,
    tier: 7,
    growth: 1,
    role: 'apex_ranged',
    roleLabel: 'Rare sea boss (neutral)',
    body: 'serpent',
    availability: 'sea_encounters',
    base: {
      id: 'hafgufa',
      name: 'Hafgufa',
      plural: 'Hafgufas',
      stats: s(22, 24, 220, [36, 46], 5, 2, 2, 9),
      cost: { gold: 3000, crystal: 1 },
      abilities: ['swimmer', 'shooter', 'sea_deepwater_blast'],
      summary: 'The vast whale-like mist of the northern sea, grey and crusted with barnacles. Rare, slow and enormously hard to kill.',
      portraitAlt: 'A colossal whale-like sea creature with a rounded grey head crusted with barnacles.',
      ...portrait('hafgufa'),
    },
    upgraded: {
      id: 'abyssal_hafgufa',
      name: 'Abyssal Hafgufa',
      plural: 'Abyssal Hafgufas',
      stats: s(25, 27, 260, [42, 52], 6, 2, 2, 10),
      cost: { gold: 4500, crystal: 2 },
      abilities: ['swimmer', 'shooter', 'sea_deepwater_blast'],
      summary: 'Risen from the abyss with a pale crag crown, a dark hide and a luminous turquoise throat. Reaches one hex further.',
      portraitAlt: 'A colossal dark sea creature with a pale crag crown and a luminous turquoise throat.',
      ...portrait('abyssal_hafgufa'),
    },
  },
];

export const SEA_LORE: readonly LoreDefinition[] = [
  {
    id: 'lore.hippocampus',
    sourceNote: `Hippocampi are the fish-tailed sea-horses of Greek myth that draw Poseidon’s chariot; winged hippocamps appear in ancient art. ${MYTH}`,
    sourceRefs: ['https://www.theoi.com/Ther/Hippokampoi.html'],
    sourceStatus: 'draft_requires_review',
    gameLore: 'Since the worlds collided, wild hippocampi have gone without a chariot to draw. They hunt the sea lanes in winged herds and treat a lone ship as a rival in their water.',
    upgradeLore: 'A tempest hippocampus rides the front of a storm; sailors say its golden crest is the last light before the squall.',
  },
  {
    id: 'lore.triton',
    sourceNote: `The Tritones are fish-tailed sea beings of Greek tradition, associated with conch shells. This is a sea warrior of their kind, not the named god Triton. ${MYTH}`,
    sourceRefs: ['https://www.theoi.com/Pontios/Tritones.html'],
    sourceStatus: 'draft_requires_review',
    gameLore: 'Tritons guard the reefs no god claims any more. They warn a ship once with the conch; the second call is no warning.',
    upgradeLore: 'A stormcaller’s conch glows indigo when it draws breath, and the sea answers it.',
  },
  {
    id: 'lore.isonade',
    sourceNote: `The isonade is a sea yōkai of Japanese folklore, a huge shark-like creature that hooks sailors with its barbed tail. ${MYTH}`,
    sourceRefs: ['https://en.wikipedia.org/wiki/Isonade'],
    sourceStatus: 'draft_requires_review',
    gameLore: 'Fishermen of the western coasts know the isonade by the wake it leaves and never by its face. Its tail barbs fly before the hunter shows itself.',
    upgradeLore: 'A razorwake’s red sail cuts the surface only when it has already chosen its prey.',
  },
  {
    id: 'lore.cetus',
    sourceNote: `Ketos (Cetus) is the sea monster of Greek myth sent against Aethiopia (the story of Andromeda). ${MYTH}`,
    sourceRefs: ['https://www.theoi.com/Ther/KetosAithiopios.html'],
    sourceStatus: 'draft_requires_review',
    gameLore: 'The ceti have outlived every god who once sent them. They still rise against ships out of old habit, and still need no boarding: a jet of brine does the work.',
    upgradeLore: 'Five ivory fins mark a crownfin: the oldest of the ceti, and the most patient.',
  },
  {
    id: 'lore.hafgufa',
    sourceNote: `The hafgufa is the vast sea monster of medieval Norse maritime tradition (the King’s Mirror), sometimes taken for an island. ${MYTH}`,
    sourceRefs: ['https://en.wikipedia.org/wiki/Hafgufa'],
    sourceStatus: 'draft_requires_review',
    gameLore: 'Crews who have seen a hafgufa rise describe an island that breathes. Few have seen one twice; it is rare, slow to anger and slower to fall.',
    upgradeLore: 'From the abyss, the hafgufa returns crowned in pale stone, its throat burning with a cold turquoise light.',
  },
];
