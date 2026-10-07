/**
 * Map editor tools (2026-10-07): the symmetry brush and "generate a random map,
 * then edit it".
 */
import { describe, expect, it } from 'vitest';
import { buildCatalog, validateGeneratedMission } from '@pr/content';
import { axialDistance, type HexCoord } from '@pr/rules';
import {
  compileCustomMap,
  createRandomSkirmish,
  customInRect,
  customMapFromGenerated,
  customRowOffset,
  newCustomMap,
  parseCustomMap,
  serializeCustomMap,
  symmetricCells,
  symmetricEdges,
  validateCustomMap,
  type CustomMapDocument,
} from '../src';

const catalog = buildCatalog();
const cell = (doc: CustomMapDocument, x: number, y: number): HexCoord => ({ q: x - Math.floor(y / 2) + customRowOffset(doc.height), r: y });
const rectOf = (doc: CustomMapDocument) => ({ cols: doc.width - customRowOffset(doc.height), rows: doc.height });

describe('symmetry brush', () => {
  it('turning half around is exact: every cell maps onto the map and back to itself', () => {
    for (const size of ['small', 'medium'] as const) {
      const doc = newCustomMap(catalog, size);
      const { cols, rows } = rectOf(doc);
      for (let y = 0; y < rows; y++)
        for (let x = 0; x < cols; x++) {
          const c = cell(doc, x, y);
          const [self, turned] = symmetricCells(doc, c, 'rotate');
          expect(self).toEqual(c);
          if (!turned) continue; // the exact centre cell (none on even sizes)
          expect(customInRect(cols, rows, turned)).toBe(true);
          expect(symmetricCells(doc, turned, 'rotate')[1]).toEqual(c);
        }
    }
  });

  it('four ways gives four cells away from the middle lines; mirrors stay on the map', () => {
    const doc = newCustomMap(catalog, 'small');
    const { cols, rows } = rectOf(doc);
    expect(symmetricCells(doc, cell(doc, 3, 4), 'quad')).toHaveLength(4);
    for (let y = 0; y < rows; y++)
      for (let x = 0; x < cols; x++) for (const m of symmetricCells(doc, cell(doc, x, y), 'mirror_lr')) expect(customInRect(cols, rows, m)).toBe(true);
    expect(symmetricCells(doc, cell(doc, 3, 4), 'none')).toHaveLength(1);
  });

  it('a road copies to neighbouring cells', () => {
    const doc = newCustomMap(catalog, 'small');
    const a = cell(doc, 4, 6);
    const b = { q: a.q + 1, r: a.r };
    const edges = symmetricEdges(doc, a, b, 'rotate');
    expect(edges).toHaveLength(2);
    for (const k of edges) {
      const [p, q] = k.split('|').map((s) => {
        const [x, y] = s.split(',').map(Number);
        return { q: x!, r: y! };
      });
      expect(axialDistance(p!, q!)).toBe(1);
    }
  });
});

describe('generate, then edit', () => {
  for (const [seed, mapType, unowned] of [
    [11, 'continental', 'none'],
    [12, 'archipelago', 'both'],
    [13, 'crossroads', 'own'],
  ] as const) {
    it(`a ${mapType} random map becomes a valid editor document that plays (seed ${seed})`, () => {
      const g = createRandomSkirmish(catalog, {
        seed,
        size: 'small',
        mapType,
        seats: [
          { pantheonId: 'greek', controller: 'human' },
          { pantheonId: 'norse', controller: 'ai' },
        ],
        victory: { type: 'elimination' },
        monsters: 'few',
        unownedTowns: unowned,
      });
      const { doc, leftOut } = customMapFromGenerated(catalog, g, 'From the generator');
      const errors = validateCustomMap(catalog, doc).filter((i) => i.severity === 'error');
      expect(errors.map((e) => e.text)).toEqual([]);
      // Survives the file format.
      const again = parseCustomMap(serializeCustomMap(doc));
      expect(again.ok).toBe(true);
      // The same ground and roads (moved, not changed).
      const land = (t: string) => [...t].filter((x) => x !== 'v').sort().join('');
      expect(land(doc.terrain)).toBe(land(g.map.terrain));
      expect(doc.roads.length).toBe(g.map.roads.length);
      // Every town and most sites carried over.
      expect(doc.sites.filter((s) => s.kind === 'town').length).toBe(g.mission.sites.filter((s) => s.kind.type === 'town').length);
      expect(doc.sites.length + leftOut.length).toBeGreaterThanOrEqual(g.mission.sites.length);
      // And it compiles into a playable mission.
      const compiled = compileCustomMap(catalog, doc, [{ controller: 'human' }, { controller: 'ai' }], { unownedTowns: 'map' });
      expect(validateGeneratedMission(catalog, compiled.mission).issues.map((i) => i.message)).toEqual([]);
    });
  }
});
