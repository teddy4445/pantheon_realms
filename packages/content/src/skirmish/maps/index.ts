/**
 * Authored skirmish maps (owner request 2026-10-05: "suggest 4 new skirmish
 * maps … suggest 2 more and build all of them").
 *
 * Each map is a custom map document (the map editor's format) written by
 * `npm run maps:build` from `tools/maps/maps.ts`: designed for one empire and
 * copied to the others by exact hex-grid symmetry (a half turn, turns of 120° or
 * 60°, or a mirror and a half turn), so every empire's lands, sites and distances
 * are the same. The JSON files are data; edit the design and rebuild rather than
 * the files. Pantheons and controllers are chosen per seat at setup; the
 * documents' pantheons are only defaults. Values are proposed and measured only
 * in AI-against-AI games (DEVELOPMENT_STATUS.md).
 */
import type { CustomMapDocument, SkirmishMapDefinition } from '@pr/rules';
import frostgate from './frostgate.prmap.json' with { type: 'json' };
import burningOasis from './burning_oasis.prmap.json' with { type: 'json' };
import circleOfGates from './circle_of_gates.prmap.json' with { type: 'json' };
import barrows from './barrows.prmap.json' with { type: 'json' };
import goldenFords from './golden_fords.prmap.json' with { type: 'json' };
import sixThrones from './six_thrones.prmap.json' with { type: 'json' };

const doc = (json: unknown) => json as CustomMapDocument;

export const SKIRMISH_MAPS: readonly SkirmishMapDefinition[] = [
  {
    id: 'frostgate',
    order: 1,
    name: 'Frostgate',
    tagline: 'Two fjord valleys, one pass, and the key on the ice.',
    summary:
      'Two empires face each other across a frozen fjord. The only way between them is a pass through the ridge, shut by twin crimson gates. Each empire’s crimson key lies on its own glacier island, reached by portal and guarded by nesting wyverns — whoever takes the key first decides when the war begins.',
    highlights: ['One pass, barred by two crimson key gates.', 'Each empire’s key waits on a glacier island, reached by portal.', 'Icy spray: the fjord climate in every battle.'],
    thumbnailAssetId: 'mission.skirmish.frostgate.thumbnail',
    map: doc(frostgate),
  },
  {
    id: 'burning_oasis',
    order: 2,
    name: 'The Burning Oasis',
    tagline: 'Four empires, four oases, one shrine in the fire.',
    summary:
      'Four empires hold the corners of a burning desert. Between each pair of neighbours lies an oasis: the northern and southern ones hide gold mines, the eastern and western ones crystal, and every oasis keeps a creature camp. At the centre, ringed by red rock, stands the Burning Shrine — hold it for seven days, or conquer every rival.',
    highlights: ['Four empires; every neighbour shares an oasis with you.', 'Hold the Burning Shrine seven days to win.', 'Scorching sand slows ground troops in battle.'],
    thumbnailAssetId: 'mission.skirmish.burning_oasis.thumbnail',
    map: doc(burningOasis),
  },
  {
    id: 'circle_of_gates',
    order: 3,
    name: 'The Circle of Gates',
    tagline: 'Three valleys and a ring of portals: every rival is at your back door.',
    summary:
      'Three high valleys surround a peak sanctum with spell shrines and a crown on its summit, reached by guarded paths. Ridges with one guarded crossing part the valleys. A ring of portals links them: each home gate opens behind the next empire’s town, and each back gate leads to the previous empire’s home.',
    highlights: ['A ring of six portals: raid your neighbour’s back — and watch your own.', 'Three spell shrines and the Crown of the Summit in the sanctum.', 'Thin air: the high-pass climate in every battle.'],
    thumbnailAssetId: 'mission.skirmish.circle_of_gates.thumbnail',
    map: doc(circleOfGates),
  },
  {
    id: 'barrows',
    order: 4,
    name: 'Barrows of the Lost Kings',
    tagline: 'A fog moor of burial mounds, captive heroes and sealed hoards.',
    summary:
      'A fog-bound moor scattered with barrows. In each empire’s nearest barrow a hero of its own people waits to be freed; in the King’s Barrows wait veterans. Hermits pay for deeds, and two hoards sealed behind amber and violet gates open only for their keys — one kept in each empire’s back country. Gold is scarce: one mine each.',
    highlights: ['Prisons with captive heroes, guarded by barrow-wights.', 'Amber and violet key vaults with major artifacts.', 'Scarce gold and moorland fog.'],
    thumbnailAssetId: 'mission.skirmish.barrows.thumbnail',
    map: doc(barrows),
  },
  {
    id: 'golden_fords',
    order: 5,
    name: 'The Golden Fords',
    tagline: 'A rich valley between two rivers. Fast, open, and generous.',
    summary:
      'A golden autumn valley between two rivers, with three guarded fords across each. The fields between the rivers hold gold and crystal mines, a mill, camps and the Horn of Plenty. Every empire starts with twice the usual treasury and the whole map revealed: a fast, open game and a good first skirmish.',
    highlights: ['Twice the usual treasury; the map is revealed.', 'Three guarded fords on each river.', 'The Horn of Plenty between the rivers.'],
    thumbnailAssetId: 'mission.skirmish.golden_fords.thumbnail',
    map: doc(goldenFords),
  },
  {
    id: 'six_thrones',
    order: 6,
    name: 'The Six Thrones',
    tagline: 'Six empires, one island, one shrine.',
    summary:
      'One island shared by six thrones. Each empire holds a wedge of land between two ridges, with one guarded pass to each neighbour and one guarded path to the Shrine at the island’s heart. Hold the Shrine for ten days, or be the last throne standing. Seats left to the AI play as AI empires.',
    highlights: ['Six empires; every seat human or AI.', 'Hold the Shrine of Six Thrones ten days to win.', 'Guarded ridge passes to both neighbours.'],
    thumbnailAssetId: 'mission.skirmish.six_thrones.thumbnail',
    map: doc(sixThrones),
  },
];
