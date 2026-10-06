import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { ROAD_PARTS, ROAD_SHEET, ROAD_STEP, roadMaskName, roadTileOrder, roadTileSlot, roadTypeFor } from '../src/roads';

describe('painted road tiles', () => {
  it('lists all 63 connection masks once, 21 per sheet', () => {
    const order = roadTileOrder();
    const all = ROAD_PARTS.flatMap((p) => order[p]);
    for (const p of ROAD_PARTS) expect(order[p]).toHaveLength(ROAD_SHEET.cols * ROAD_SHEET.rows);
    expect(new Set(all).size).toBe(63);
    expect(Math.min(...all)).toBe(1);
    expect(Math.max(...all)).toBe(63);
    expect(roadTileSlot(0b001001)).toEqual({ part: 'a', index: 6 });
    expect(roadMaskName(0b010101)).toBe('e-sw-nw');
  });

  it('matches the layout file the guides were drawn from', () => {
    const layout = JSON.parse(readFileSync(new URL('../../../assets-source/sprites/road-tiles.json', import.meta.url), 'utf8')) as {
      cell: number;
      cols: number;
      rows: number;
      hexWidth: number;
      parts: Record<string, { mask: number; name: string }[]>;
    };
    expect([layout.cell, layout.cols, layout.rows, layout.hexWidth]).toEqual([ROAD_SHEET.cell, ROAD_SHEET.cols, ROAD_SHEET.rows, ROAD_SHEET.hexWidth]);
    const order = roadTileOrder();
    for (const p of ROAD_PARTS) {
      expect(layout.parts[p]!.map((c) => c.mask)).toEqual(order[p]);
      expect(layout.parts[p]!.map((c) => c.name)).toEqual(order[p].map(roadMaskName));
    }
  });

  it('steps across each edge to the neighbour in that direction', () => {
    expect(ROAD_STEP).toHaveLength(6);
    expect(roadTypeFor('temperate', 'marsh')).toBe('boardwalk');
    expect(roadTypeFor('desert', 'plains')).toBe('sand');
    expect(roadTypeFor('fjord', 'forest')).toBe('snow');
    expect(roadTypeFor('temperate', 'rough')).toBe('cobble');
    expect(roadTypeFor('autumn', 'forest')).toBe('dirt');
  });
});
