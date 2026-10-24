import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import '../src/assets/manifest';
import { pickSiteSprite, siteSpriteCandidates, spriteManifest } from '@pr/presentation/core';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const def = { kind: { type: 'town' as const, townId: 'test' } };
describe('map towns follow civic development', () => {
  for (const pantheonId of ['greek', 'norse', 'egyptian', 'japanese', 'celtic', 'mesoamerican']) {
    it(`${pantheonId}: four delivered stages, legacy levels and missing-art fallback`, () => {
      const files = new Set<string>();
      for (const level of [1, 2, 3, 4]) {
        const preferred = siteSpriteCandidates(def, null, { pantheonId, buildings: { civic_hall: level } });
        const chosen = pickSiteSprite(preferred, 'town', pantheonId);
        expect(chosen.id).toBe(`map.site.town.${pantheonId}.l${level}`);
        expect(chosen.def?.status).toBe('final');
        expect(existsSync(path.join(root, 'assets-runtime', chosen.def!.file))).toBe(true);
        files.add(chosen.def!.file);
      }
      expect(files.size).toBe(4);
      for (const [value, expected] of [[undefined, 1], [0, 1], [-1, 1], [2.8, 2], [9, 4]]) {
        const buildings = value === undefined ? {} : { civic_hall: value };
        expect(siteSpriteCandidates(def, null, { pantheonId, buildings })[0]).toBe(`map.site.town.${pantheonId}.l${expected}`);
      }
      expect(pickSiteSprite(['map.site.town.missing.l3'], 'town', pantheonId).id).toBe(`map.site.town.${pantheonId}`);
    });
  }
  it('preserves explicit campaign artwork before the development fallback', () => {
    const candidates = siteSpriteCandidates({ ...def, art: 'story-city' }, null, { pantheonId: 'greek', buildings: { civic_hall: 2 } });
    expect(candidates).toEqual(['map.site.story-city', 'map.site.town.greek.l2']);
    expect(pickSiteSprite(candidates, 'town', 'greek').id).toBe('map.site.town.greek.l2');
    expect(Object.keys(spriteManifest().sites).filter(id => /^map\.site\.town\.\w+\.l[1-4]$/.test(id))).toHaveLength(24);
  });
});
