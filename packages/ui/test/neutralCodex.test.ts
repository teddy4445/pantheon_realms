/**
 * The encyclopedia's expansion neutrals (packages/ui/src/app/neutralCodex.ts;
 * screen spec `unit-details`, campaign expansion 2026-10-15): both forms (the
 * upgrades of the battle FX & neutral upgrades delivery), the family's habitat,
 * and where they are hired — read from the catalog's missions and the map
 * editor's site kinds. Other two-form families (pantheon rosters and the older
 * neutral families) get nothing new.
 */
import { describe, expect, it } from 'vitest';
import { loadCatalog } from '@pr/content';
import { NEUTRAL_V2_HABITATS } from '@pr/content';
import { hiringSource, neutralFacts } from '../src/app/neutralCodex';

const catalog = loadCatalog();
const SIX = ['pegasus', 'root_runner', 'serpopard', 'baku', 'afanc', 'ahuitzotl'];

describe('expansion neutral facts', () => {
  it('the six species: both forms, the family’s habitat, and every chapter that hires them', () => {
    for (const id of SIX) {
      const f = neutralFacts(catalog, id)!;
      expect(f, id).not.toBeNull();
      expect(f.singleForm).toBe(false);
      expect(f.habitat).toBe(NEUTRAL_V2_HABITATS[id]!.habitat);
      const up = catalog.creatures[catalog.families[id]!.upgradedCreatureId!]!;
      const base = catalog.creatures[id]!;
      expect(f.forms).toBe(`Both forms are hired at the same hiring sites from one shared weekly stock; ${base.pluralName} already in an army train there into ${up.pluralName} for ${(up.cost!.gold ?? 0) - (base.cost!.gold ?? 0)} Gold each.`);
      // The upgrade's page reads the same family facts: habitat (by family/base ID) and hiring places.
      const fu = neutralFacts(catalog, up.id)!;
      expect(fu.habitat).toBe(f.habitat);
      expect(fu.hiring.places.map((p) => p.siteId)).toEqual(f.hiring.places.map((p) => p.siteId));
      expect(fu.hiring.text).toBe(f.hiring.text);
      const sites = Object.values(catalog.missions).flatMap((m) => m.sites.filter((s) => s.kind.type === 'creature_camp' && s.kind.creatureId === id));
      expect(f.hiring.places).toHaveLength(sites.length);
      expect(f.hiring.places.length, id).toBeGreaterThan(0);
      expect(f.hiring.siteKinds).toEqual(['Hiring site']);
      expect(f.hiring.editorSite).toBe('Creature Camp');
      expect(f.hiring.text.startsWith('Hired at hiring sites in ')).toBe(true);
      expect(f.hiring.text.endsWith('; on editor maps at a Creature Camp.')).toBe(true);
    }
  });

  it('names campaigns with their chapter counts (and no chapter or site names, which would spoil the story)', () => {
    const rr = hiringSource(catalog, 'root_runner');
    expect(rr.campaigns.map((c) => [c.name, c.chapters])).toEqual([
      ['The Winter Oath', 3],
      ['The Silver Branch', 1],
    ]);
    expect(rr.text).toBe('Hired at hiring sites in The Winter Oath (3 chapters) and The Silver Branch (1 chapter); on editor maps at a Creature Camp.');
    expect(rr.places.filter((p) => p.pact).map((p) => p.siteId)).toEqual(['sb5_root_runners']);
    const pegasus = hiringSource(catalog, 'pegasus');
    expect(pegasus.text).toBe('Hired at hiring sites in The Silent Oracle (2 chapters); on editor maps at a Creature Camp.');
  });

  it('older two-form families keep their pages as they were', () => {
    expect(neutralFacts(catalog, 'centaur')).toBeNull();
    expect(neutralFacts(catalog, 'centaur_sentinel')).toBeNull();
    expect(neutralFacts(catalog, 'hoplite')).toBeNull();
    expect(neutralFacts(catalog, 'no_such_creature')).toBeNull();
  });
});
