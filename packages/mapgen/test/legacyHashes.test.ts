/**
 * The nine land map types keep their maps (naval random templates, 2026-10-17): the hash of the whole
 * generated scenario (mission, map, decoration) for a spread of types, sizes, empire counts and
 * settings, captured before the naval templates were added. Any change here means a legacy seed would
 * give another map.
 */
import { describe, expect, it } from 'vitest';
import { buildCatalog } from '@pr/content';
import { hashValue } from '@pr/rules';
import { generateSkirmish, SKIRMISH_MAP_TYPES, type SkirmishGenOptions, type SkirmishMapType } from '../src';

const catalog = buildCatalog();
const pool = ['greek', 'norse', 'egyptian', 'japanese', 'celtic', 'mesoamerican'];

/** `<type>|<case>` -> hashValue({ mission, map, decor }) before 2026-10-17. */
const LEGACY: Readonly<Record<string, string>> = {
  'continental|small-2-11': '85e9788724f00ebc',
  'continental|medium-3-4242': '8043d2096b75cb6c',
  'continental|huge-2-90210': 'ea4b9ebad670fa5f',
  'continental|large-4-5': 'a6d7ab8d09df996a',
  'continental|huge-6-123': 'f67346eda24a88ec',
  'highlands|small-2-11': 'f5a2ecb6975efc01',
  'highlands|medium-3-4242': '119b2dd81985c26f',
  'highlands|huge-2-90210': '87c108c722f0482e',
  'highlands|large-4-5': '6225651fcb1e9e7a',
  'highlands|huge-6-123': 'b6db6013f79fe53c',
  'lake_isle|small-2-11': '1e392b9912267198',
  'lake_isle|medium-3-4242': '38c36421dbd59fa2',
  'lake_isle|huge-2-90210': '4ae4ce36ce897e25',
  'lake_isle|large-4-5': 'a99e82e646b4070b',
  'lake_isle|huge-6-123': 'cf559333123f399c',
  'wild_forest|small-2-11': '735216d8efcbf2ef',
  'wild_forest|medium-3-4242': 'a44fa11f649d5f12',
  'wild_forest|huge-2-90210': '5d5a079c0195969f',
  'wild_forest|large-4-5': '37a4fe801dac8af5',
  'wild_forest|huge-6-123': '1d6c017bbc1991a2',
  'marshlands|small-2-11': '5fb55ce0fdd808b9',
  'marshlands|medium-3-4242': 'dfe558c74c401a84',
  'marshlands|huge-2-90210': 'edb70f92212f5591',
  'marshlands|large-4-5': '5aaa5a93a982d5ce',
  'marshlands|huge-6-123': '25c32654a22d5335',
  'crossroads|small-2-11': 'ca1f9d1fcf05e390',
  'crossroads|medium-3-4242': '04bd4e2d4f0aa310',
  'crossroads|huge-2-90210': 'd31c2b3a4ef3798b',
  'crossroads|large-4-5': 'ca9c84e6629c8f63',
  'crossroads|huge-6-123': 'd8cd2df3741706f2',
  'archipelago|small-2-11': 'e744e202b2ee44bd',
  'archipelago|medium-3-4242': '5b7ab52412c1c509',
  'archipelago|huge-2-90210': 'fb593b0f4151d010',
  'archipelago|large-4-5': '674e0ce757d504c0',
  'archipelago|huge-6-123': 'c27231069a8cdb75',
  'twin_continents|small-2-11': '85876cac86d6f0fd',
  'twin_continents|huge-2-90210': 'ec81aa6635c03361',
  'central_valley|small-2-11': '3135af856be972b4',
  'central_valley|medium-3-4242': '559a70743e0c9ba9',
  'central_valley|huge-2-90210': '61baadba15a448e1',
  'central_valley|large-4-5': '021536bc80f42607',
  'central_valley|huge-6-123': 'd274093461a62f8b',
};

const CASES: [string, Partial<SkirmishGenOptions> & { n: number }][] = [
  ['small-2-11', { n: 2, size: 'small', seed: 11 }],
  ['medium-3-4242', { n: 3, size: 'medium', seed: 4242, victory: { type: 'hold_relic', days: 7 } }],
  ['huge-2-90210', { n: 2, size: 'huge', seed: 90210, treasure: 'rich', guards: 'strong', unownedTowns: 'both' }],
  ['large-4-5', { n: 4, size: 'large', seed: 5, portals: false, roads: 'sparse', startWealth: 'low' }],
  ['huge-6-123', { n: 6, size: 'huge', seed: 123, monsters: 'many' }],
];

describe('legacy random-map seeds are unchanged by the naval templates', () => {
  it('the nine land types are still the nine of SKIRMISH_MAP_TYPES, in order', () => {
    expect(SKIRMISH_MAP_TYPES.map((t) => t.id)).toEqual(['continental', 'highlands', 'lake_isle', 'wild_forest', 'marshlands', 'crossroads', 'archipelago', 'twin_continents', 'central_valley']);
  });
  for (const t of SKIRMISH_MAP_TYPES) {
    it(`${t.label}: every captured case hashes as before`, () => {
      for (const [label, c] of CASES) {
        if (t.id === 'twin_continents' && c.n > 2) continue;
        const { n, ...rest } = c;
        const o = { seed: 1, size: 'small', seats: pool.slice(0, n).map((pantheonId) => ({ pantheonId, controller: 'ai' as const })), victory: { type: 'elimination' }, monsters: 'few', mapType: t.id as SkirmishMapType, ...rest } as SkirmishGenOptions;
        const g = generateSkirmish(catalog, o);
        expect(hashValue({ mission: g.mission, map: g.map, decor: g.decor }), `${t.id}|${label}`).toBe(LEGACY[`${t.id}|${label}`]);
      }
    });
  }
});
