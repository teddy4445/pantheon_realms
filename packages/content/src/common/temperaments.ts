/**
 * Pantheon AI temperaments (owner request 2026-10-04: "Norse play
 * aggressively, Egyptians build up, Celts favour magic … rival empires should
 * feel different, not just look different"). Proposed, unplaytested values.
 *
 * Scenario feature `aiTemperaments` (skirmishes and random maps; The Three
 * Beacons and the campaigns keep it off). A temperament changes only what the
 * AI chooses — which building first, when to attack, which skill and hero to
 * take, whether to keep praying — never a rule, price or statistic. Weights of
 * 1 (or absent) mean "as every other rival"; the Greek temperament is the
 * neutral reference.
 */
import type { AITemperamentDefinition } from '@pr/rules';

export const AI_TEMPERAMENTS: readonly AITemperamentDefinition[] = [
  {
    id: 'greek',
    name: 'Strategists',
    summary: 'Weighs every option evenly: builds, fights and prays as the moment asks.',
    boldness: 1,
    aggression: 1,
    extraHeroes: 0,
    build: {},
    magic: 1,
    faith: 1,
  },
  {
    id: 'norse',
    name: 'Raiders',
    summary: 'Attacks at smaller advantages, keeps an extra hero on the road and raises troops before comforts.',
    boldness: 0.88,
    aggression: 1.3,
    extraHeroes: 1,
    build: { military: 1.25, economy: 0.9 },
    magic: 0.85,
    faith: 1,
  },
  {
    id: 'egyptian',
    name: 'Builders',
    summary: 'Builds its economy and walls first and fights only with a wider margin.',
    boldness: 1.12,
    aggression: 0.85,
    extraHeroes: 0,
    build: { economy: 1.4, defense: 1.4 },
    magic: 1,
    faith: 1,
  },
  {
    id: 'japanese',
    name: 'Disciplined',
    summary: 'Upgrades its dwellings and trains its heroes before raising new ones.',
    boldness: 1,
    aggression: 1,
    extraHeroes: 0,
    build: { elite: 1.5 },
    magic: 1,
    faith: 1,
  },
  {
    id: 'celtic',
    name: 'Mystics',
    summary: 'Raises its Mage Guild before its other buildings and leans a little toward spellcasters and magic skills.',
    boldness: 1,
    aggression: 1,
    extraHeroes: 0,
    build: { magic: 1.35 },
    magic: 1.1,
    faith: 1,
  },
  {
    id: 'mesoamerican',
    name: 'Devout',
    summary: 'Keeps making Temple offerings from its garrisons once its gods are chosen, for more miracles and gifts, and favours the Temple in close build choices.',
    boldness: 1,
    aggression: 1,
    extraHeroes: 0,
    build: { faith: 1.25 },
    magic: 1,
    faith: 1.25,
  },
];
