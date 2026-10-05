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
 *
 * 2026-10-05 (random-map balance, one against one): the first weights made the
 * AI itself stronger or weaker by pantheon — Builders won 0.65, Raiders 0.42,
 * Disciplined 0.43 against the rest, while the same pantheons played the
 * neutral way scored 0.44–0.55. The weights are now small enough to keep each
 * rival's habits without changing its strength (DEVELOPMENT_STATUS.md).
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
    boldness: 0.95,
    aggression: 1.15,
    extraHeroes: 1,
    build: { military: 1.15, economy: 0.95 },
    magic: 0.9,
    faith: 1,
  },
  {
    id: 'egyptian',
    name: 'Builders',
    summary: 'Leans toward its economy and walls in close build choices and raids a little less.',
    boldness: 1,
    aggression: 0.95,
    extraHeroes: 0,
    build: { economy: 1.1, defense: 1.1 },
    magic: 1,
    faith: 1,
  },
  {
    id: 'japanese',
    name: 'Disciplined',
    summary: 'Upgrades its dwellings first in close build choices.',
    boldness: 1,
    aggression: 1,
    extraHeroes: 0,
    build: { elite: 1.05 },
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
