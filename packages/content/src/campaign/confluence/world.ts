/** One authored geography for both eras. Coordinates are offset columns/rows, never screen pixels. */
import { TERRAIN_CODES, type AuthoredMapDefinition } from '@pr/rules';
import { compileRegionMap, toAxial, toXY, type PaintOp, type XY } from '../v2/regionMap';

export const CONFLUENCE_WORLD_ID = 'confluence-v1';
export const CONFLUENCE_COLS = 96;
export const CONFLUENCE_ROWS = 72;
export const CONFLUENCE_REGIONS = ['greek', 'norse', 'egyptian', 'japanese', 'celtic', 'mesoamerican'] as const;
export type ConfluenceRegion = typeof CONFLUENCE_REGIONS[number];
export const CONFLUENCE_TOWNS: Record<ConfluenceRegion, { name: string; at: XY; gate: XY; landing: XY; island: XY }> = {
  greek: { name: 'First Harbor', at: [19, 30], gate: [18, 30], landing: [20, 30], island: [29, 31] },
  norse: { name: 'Frostwatch', at: [42, 12], gate: [41, 12], landing: [43, 12], island: [45, 23] },
  egyptian: { name: 'Sunbank', at: [28, 54], gate: [27, 54], landing: [29, 54], island: [35, 47] },
  japanese: { name: 'Lantern Haven', at: [80, 33], gate: [81, 33], landing: [79, 33], island: [87, 22] },
  celtic: { name: 'Hazel Ford', at: [70, 19], gate: [71, 19], landing: [69, 19], island: [63, 27] },
  mesoamerican: { name: 'Ember Quay', at: [67, 55], gate: [68, 55], landing: [66, 55], island: [60, 47] },
};
export const ACCORD_ISLE: XY = [48, 36];
export const ACCORD_LANDINGS: readonly XY[] = [[43, 36], [53, 36]];
const sea: XY[] = [];
for (let y = 1; y < CONFLUENCE_ROWS - 1; y++) for (let x = 1; x < CONFLUENCE_COLS - 1; x++) {
  const basin = ((x - 48) / 30) ** 2 + ((y - 36) / 23) ** 2 < 1;
  const strait = x >= 77 && x <= 91 && y >= 17 && y <= 50;
  if (basin || strait) sea.push([x, y]);
}
const paint: PaintOp[] = [
  { t: 'water', cells: sea },
  { t: 'water', line: [[44, 1], [44, 15], [48, 22]], width: 1 },
  { t: 'water', line: [[34, 49], [25, 59], [21, 71]], width: 1 },
  { t: 'water', line: [[34, 49], [34, 61], [33, 71]], width: 1 },
  { t: 'water', line: [[34, 49], [41, 61], [46, 71]], width: 1 },
  { t: 'plains', disc: [48, 36, 5] },
  { t: 'plains', disc: [85, 33, 5] },
  { t: 'plains', disc: [87, 22, 3] },
  { t: 'plains', disc: [86, 48, 4] },
  { t: 'plains', rect: [77, 40, 79, 49] },
  // Small survey islands make each maritime investigation a real voyage.
  ...CONFLUENCE_REGIONS.filter((r) => r !== 'japanese').map((r): PaintOp => ({ t: 'plains', disc: [...CONFLUENCE_TOWNS[r].island, 2] })),
  { t: 'mountain', line: [[23, 5], [32, 5], [36, 8]], width: 1 },
  { t: 'mountain', line: [[54, 5], [63, 8]], width: 1 },
  { t: 'forest', blob: [78, 9, 6] },
  { t: 'forest', blob: [12, 19, 5] },
  { t: 'rough', blob: [68, 64, 5] },
  { t: 'marsh', blob: [18, 57, 4] },
  // Fixed bridges keep the mainland loop; they do not connect the Accord Isle.
  { t: 'plains', cells: [[43, 8], [44, 8], [45, 8], [24, 62], [25, 62], [26, 62], [33, 64], [34, 64], [35, 64], [41, 64], [42, 64], [43, 64]] },
  { t: 'plains', cells: CONFLUENCE_REGIONS.flatMap((r) => [CONFLUENCE_TOWNS[r].at, CONFLUENCE_TOWNS[r].gate]) },
  { t: 'water', cells: CONFLUENCE_REGIONS.map((r) => CONFLUENCE_TOWNS[r].landing) },
];
export const CONFLUENCE_MASTER = compileRegionMap({
  id: CONFLUENCE_WORLD_ID, cols: CONFLUENCE_COLS, rows: CONFLUENCE_ROWS, biome: 'coast', base: 'plains', edge: 'water',
  seed: 181026, paint, texture: { forest: 30, rough: 30 }, roads: [],
}, []);

/** Regional access follows a fixed geographic partition, including its sea approaches. */
export function confluenceRegionAt(at: XY): ConfluenceRegion | 'accord' {
  if ((at[0] - 48) ** 2 + (at[1] - 36) ** 2 <= 49) return 'accord';
  let region: ConfluenceRegion = 'greek';
  let best = Infinity;
  for (const r of CONFLUENCE_REGIONS) {
    const p = CONFLUENCE_TOWNS[r].at;
    const distance = (at[0] - p[0]) ** 2 + (at[1] - p[1]) ** 2;
    if (distance < best) { best = distance; region = r; }
  }
  return region;
}

/** Inactive regions are physically out of play, not merely concealed by fog. */
export function confluenceMap(era: 'discovery' | 'aftermath', active?: ConfluenceRegion): AuthoredMapDefinition {
  const master = CONFLUENCE_MASTER.map;
  const rows = master.rows.map((row, y) => [...row].map((code, q) => {
    if (code === TERRAIN_CODES.void) return code;
    const at = toXY(CONFLUENCE_ROWS, { q, r: y });
    if (active && confluenceRegionAt(at) !== active) return TERRAIN_CODES.void;
    // Local scorched vegetation, with every coast/river/landing unchanged eighteen years later.
    if (era === 'aftermath' && code === TERRAIN_CODES.forest && (at[0] * 7 + at[1] * 11) % 3 === 0) return TERRAIN_CODES.rough;
    return code;
  }).join(''));
  return { ...master, id: `${CONFLUENCE_WORLD_ID}:${era}:${active ?? 'all'}`, rows, desertCells: rows.flatMap((row, r) => [...row].flatMap((c, q) => (c === 'p' || c === 'r') && confluenceRegionAt(toXY(CONFLUENCE_ROWS, { q, r })) === 'egyptian' ? [r * master.width + q] : [])) };
}
export const confluenceCoord = (at: XY) => toAxial(CONFLUENCE_ROWS, at);
