/**
 * Greek lore entries (content/01). Sourced notes and original fiction are kept
 * in separate fields and labeled in S18.
 */
import type { LoreDefinition } from '@pr/rules';

export const GREEK_LORE: readonly LoreDefinition[] = [
  {
    id: 'lore.hoplite',
    sourceNote:
      'Greek hoplites are associated with armored infantry, a spear and shield, and fighting in close formation. Equipment and practice varied by place and period. This note does not establish troop price, formation bonus or recruitment speed.',
    sourceRefs: ['L01 — museum scholarship on Greek hoplite equipment'],
    sourceStatus: 'draft_requires_review',
    gameLore:
      'The road to Asterion is lined with shields bearing names rather than royal crests. Each belongs to a household that promised someone would stand when the warning bells rang. Hoplites learn to hold a narrow path together, trusting the shield beside them as much as their own spear.',
    upgradeLore: 'Veteran Hoplites teach the pause before a charge reaches the line. Their distinction is practiced steadiness, not a divine transformation.',
  },
  {
    id: 'lore.peltast',
    sourceNote:
      "Xenophon's Hellenica discusses Iphicrates and his peltasts in the Lechaeum campaign context. This supports an ancient light-troop tradition as inspiration; not every peltast fought identically or wore one uniform.",
    sourceRefs: ['L06 — Xenophon, Hellenica'],
    sourceStatus: 'draft_requires_review',
    gameLore:
      'Peltasts learn the hills before they learn the parade ground. They carry only what lets them cross a dry riverbed, find a gap between shields, and return before a heavier enemy can close. The best return with useful news and an unused last weapon.',
    upgradeLore: 'Veteran Peltasts choose their own firing ground and carry additional ammunition — represented by the upgrade statistics, not an extra action.',
  },
  {
    id: 'lore.centaur',
    sourceNote:
      "Ancient accounts include named centaurs such as Pholus and Chiron as well as hostile centaur encounters (Apollodorus, Library 2.5.4). Our grove-dwelling family is a fictional adaptation.",
    sourceRefs: ['L03 — Apollodorus, Library 2.5.4'],
    sourceStatus: 'draft_requires_review',
    gameLore:
      "The grove's covenant is written on neither parchment nor stone. Its terms are paths left open, springs left clean, and warnings answered before smoke reaches the canopy. Centaurs who ride with the polis follow an agreement between neighbors.",
    upgradeLore: 'Sentinels know the old boundary routes and lead the first response when a covenant’s roads are threatened.',
  },
  {
    id: 'lore.griffin',
    sourceNote:
      'Greek literary sources, including passages of Herodotus, tell of griffins associated with guarded gold. Griffin imagery is not exclusively Greek. The winged battlefield ally is a game interpretation.',
    sourceRefs: ['L05 — Herodotus'],
    sourceStatus: 'draft_requires_review',
    gameLore:
      'Above Griffin Pass, the nests face the first light. The first envoys brought gold and were driven from the cliffs; the next brought food and waited. The covenant began when a wounded fledgling was returned without chains.',
    upgradeLore: 'Windcrest Griffins are experienced guardians of the highest nests. Their persistence is expressed by the retaliation rule, not invulnerability.',
  },
  {
    id: 'lore.cavalry',
    sourceNote:
      "Xenophon's Cavalry Commander discusses horsemanship, terrain practice, supplies and command. It inspires trained mounted troops, not our exact charge modifier. 'Companion Cavalry' is a fictional upgrade name here.",
    sourceRefs: ['L07 — Xenophon, Cavalry Commander'],
    sourceStatus: 'draft_requires_review',
    gameLore:
      'The court measures a rider by the condition of the horse at the journey’s end. Young cavalry learn patience before speed: which track will hold after rain, where a line can be approached, and when a charge would spend lives for nothing.',
    upgradeLore: 'Companion riders train together until the commander’s signal is almost unnecessary.',
  },
  {
    id: 'lore.temple_adept',
    sourceNote:
      'This magical combat profession and its institution are original Pantheon Realms fiction. It is not a historical Greek military class, and no ancient source is claimed.',
    sourceRefs: [],
    sourceStatus: 'original_invention',
    gameLore:
      'Temple Adepts keep the records that armies would rather forget: every promise made before a march and every name missing afterward. The light they carry into battle belongs to this world’s living gods.',
    upgradeLore: 'Seers learn to place a brief ward over their companions. The rite is shared by the whole company — one family-wide charge.',
  },
  {
    id: 'lore.minotaur',
    sourceNote:
      'Apollodorus describes the Minotaur in the story of Pasiphae and the Labyrinth. That named being is not a historical account of a recruitable species; our Minotaur people are a deliberate fantasy expansion.',
    sourceRefs: ['L02 — Apollodorus'],
    sourceStatus: 'draft_requires_review',
    gameLore:
      'The wardens of the lower labyrinth remember a time when every corridor ended in a locked gate. They now carve their own signs into the stone, choosing who may enter and what may leave. Their loyalty is an agreement, not a property of their horns.',
    upgradeLore: 'A Labyrinth Warden is entrusted with the passages others must not lose. Its steadiness is the minimum-morale rule; it does not make the whole army fearless.',
  },
  {
    id: 'lore.cyclops',
    sourceNote:
      "Hesiod's Theogony associates named Cyclopes with Zeus' thunder weapon, while Odyssey 9 presents Polyphemus in a different setting. Our siege specialist combines selected motifs as original fiction.",
    sourceRefs: ['L04 — Hesiod, Theogony; Homer, Odyssey 9'],
    sourceStatus: 'draft_requires_review',
    gameLore:
      'Thunder Quarry is less a mine than a negotiation with the mountain. A Cyclops may spend a day shaping a single stone until it sits correctly in one vast hand. In battle, the same patience becomes a frightening economy of movement.',
    upgradeLore: 'Stormforged Cyclopes carry stones marked by the forge’s rites. The name adds no lightning damage.',
  },
];
