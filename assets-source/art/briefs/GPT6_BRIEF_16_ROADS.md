# Pantheon Realms — Art Brief 16 for GPT-6: ROADS (painted road tiles for the adventure map)

_Written 2026-10-05 after the owner's play-test: the roads should look like real, designed roads, different for each kind of land — a straight, every bend and every possible crossing, for each road type. Today the game draws its roads by code (smoothed lines with ruts, flagstone joints or cobbles). This brief asks for painted road tiles: one tile per hex, chosen by the directions the road leaves that hex. The game already reads these sheets: when they arrive, `npm run roads:import` is the only step._

_Status 2026-10-06: **delivered and in the game** — all 15 sheets. The dirt track was reviewed in the game first and approved by the owner; cobble, sand, snow and boardwalk followed (in-game acceptance not yet recorded; some width, texture and colour joins remain visible)._

## At a glance

| What | Sheets | Size | Priority |
|---|---|---|---|
| Five road types × three sheets (a: ends, straights and bends; b: three-way crossings and the six-way; c: four- and five-way crossings) | 15 | 1792 × 768 px each (7 × 3 cells of 256 × 256), transparent PNG | **Dirt track first** — deliver its three sheets, approve them in the game, then the other four |

Attach to every request: the sheet's guide `assets-source/art/briefs/guides/road.<a|b|c>.layout.png`, the join example `assets-source/art/briefs/guides/road.join-example.png`, and for the land, the ground paintings the road lies on (`assets-runtime/art/terrain/terrain.<climate>.<ground>.webp`, listed per road type below).

## 1. The road types

| Road type | Files (`<part>` = a, b, c) | Used on | Look |
|---|---|---|---|
| **Dirt track** | `sheet.road.dirt.<part>.png` | grassland and forest in the temperate, autumn, coast, moor and jungle climates (the most common road) | packed brown earth, two cart ruts, a thin strip of grass between them, soft grassy edges with a few tufts and pebbles; attach `terrain.temperate.plains`, `terrain.temperate.forest` |
| **Cobbled road** | `sheet.road.cobble.<part>.png` | rough ground in every green climate, and all land in the high-pass and storm-plateau climates | rounded grey fieldstone cobbles with a slight crown, moss in the joints, a kerb of larger dark stones along both sides; attach `terrain.high_pass.plains`, `terrain.temperate.rough` |
| **Desert flagstone road** | `sheet.road.sand.<part>.png` | every land in the desert climate (except marsh) | large pale sandstone flags, worn smooth, sand drifted over the edges and into the joints, a few cracked or missing flags; attach `terrain.desert.plains` |
| **Snow road** | `sheet.road.snow.<part>.png` | every land in the tundra and fjord climates (except marsh) | packed blue-white snow with two sled or cart tracks, a little grey gravel showing through, low snow banks along the sides; attach `terrain.tundra.plains`, `terrain.fjord.plains` |
| **Plank boardwalk** | `sheet.road.boardwalk.<part>.png` | marsh in every climate (and where a road crosses water) | weathered grey-brown planks laid across two beams on short posts, a few planks missing or patched, reeds and dark water at the edges; junctions are small plank platforms; attach `terrain.temperate.marsh` |

The game picks the type per hex from its land (`roadTypeFor` in `packages/presentation/src/roads.ts`), so a road changes from dirt to boardwalk where it enters a marsh. The look should be the map's painted style — like the ground paintings and the map-site sprites — warm light from the upper left, crisp painted detail, no photographic texture.

## 2. The tile and the sheet (read with the guide)

* **The hex.** Each cell is 256 × 256 px with one hex in the middle: a pointy-top hex 224 px wide (between its two vertical sides), seen at the map's camera — a slightly tilted top-down view, so the hex is **foreshortened to 84 % in height** (the guide draws it exactly). Paint the road flat on the ground in that same view: no perspective vanishing, no horizon, no cast shadows beyond the ruts and kerbs themselves.
* **Where the road may go.** The road leaves the hex **only across the edges listed for that cell**, always at **the middle of the edge** (the red bar on the guide), running straight across the edge toward the next hex's centre. At the edge the road surface covers the **middle 36 %** of the edge and its soft verge the **middle 50 %** (the guide's light band and its darker rim). Every tile uses exactly this crossing, so any two tiles join: keep the road's width, colour, texture scale and the position of its ruts or kerbs the same at every crossing.
* **Inside the hex.** Follow the guide's band: two-way tiles are smooth curves through the middle (never a sharp corner), a dead end is a rounded end near the centre, crossings merge naturally — round the inner corners where roads meet and let the middle widen a little into a small square or platform, always inside the hex.
* **Outside the road: transparent.** Nothing but the road and its verge — no ground, no grass carpet, no hex outline, no guide lines, no shadow plate. The game lays the tile on its own ground painting and clips each tile to its hex, so anything painted outside the hex is cut off.
* **No text, numbers or watermarks.**
* **One sheet per file**, named exactly as above, PNG with alpha, **1792 × 768** (an exact 2× sheet, 3584 × 1536, is welcome and is scaled down; a smaller one is refused — never enlarge an image to reach the size). Cells sit edge to edge with no gutters, in the order below (row by row, left to right — the same order as the guide). You may paint each cell on its own at a larger size and assemble the sheet afterwards, as long as each cell keeps the guide's exact hex position and crossings.

Directions (as on the screen): `e` right, `w` left, `ne` up-right, `nw` up-left, `se` down-right, `sw` down-left (up is the far, north side of the map).

## 3. Sheet a — ends, straights and bends (`sheet.road.<type>.a.png`, guide `road.a.layout.png`)

| Cell | Row, column | Connections | Shape |
|---|---|---|---|
| a01 | 1, 1 | `e` | dead end |
| a02 | 1, 2 | `se` | dead end |
| a03 | 1, 3 | `sw` | dead end |
| a04 | 1, 4 | `w` | dead end |
| a05 | 1, 5 | `nw` | dead end |
| a06 | 1, 6 | `ne` | dead end |
| a07 | 1, 7 | `e-w` | straight |
| a08 | 2, 1 | `se-nw` | straight |
| a09 | 2, 2 | `sw-ne` | straight |
| a10 | 2, 3 | `e-sw` | wide bend (120°) |
| a11 | 2, 4 | `se-w` | wide bend (120°) |
| a12 | 2, 5 | `sw-nw` | wide bend (120°) |
| a13 | 2, 6 | `w-ne` | wide bend (120°) |
| a14 | 2, 7 | `e-nw` | wide bend (120°) |
| a15 | 3, 1 | `se-ne` | wide bend (120°) |
| a16 | 3, 2 | `e-se` | sharp bend (60°) |
| a17 | 3, 3 | `se-sw` | sharp bend (60°) |
| a18 | 3, 4 | `sw-w` | sharp bend (60°) |
| a19 | 3, 5 | `w-nw` | sharp bend (60°) |
| a20 | 3, 6 | `nw-ne` | sharp bend (60°) |
| a21 | 3, 7 | `e-ne` | sharp bend (60°) |

## 4. Sheet b — three-way crossings and the six-way (`sheet.road.<type>.b.png`, guide `road.b.layout.png`)

| Cell | Row, column | Connections | Shape |
|---|---|---|---|
| b01 | 1, 1 | `e-sw-nw` | Y crossing |
| b02 | 1, 2 | `se-w-ne` | Y crossing |
| b03 | 1, 3 | `e-se-w` | a straight with a branch |
| b04 | 1, 4 | `se-sw-nw` | a straight with a branch |
| b05 | 1, 5 | `sw-w-ne` | a straight with a branch |
| b06 | 1, 6 | `e-w-nw` | a straight with a branch |
| b07 | 1, 7 | `se-nw-ne` | a straight with a branch |
| b08 | 2, 1 | `e-sw-ne` | a straight with a branch |
| b09 | 2, 2 | `e-se-nw` | a straight with a branch |
| b10 | 2, 3 | `se-sw-ne` | a straight with a branch |
| b11 | 2, 4 | `e-sw-w` | a straight with a branch |
| b12 | 2, 5 | `se-w-nw` | a straight with a branch |
| b13 | 2, 6 | `sw-nw-ne` | a straight with a branch |
| b14 | 2, 7 | `e-w-ne` | a straight with a branch |
| b15 | 3, 1 | `e-se-sw` | fan (three side by side) |
| b16 | 3, 2 | `se-sw-w` | fan (three side by side) |
| b17 | 3, 3 | `sw-w-nw` | fan (three side by side) |
| b18 | 3, 4 | `w-nw-ne` | fan (three side by side) |
| b19 | 3, 5 | `e-nw-ne` | fan (three side by side) |
| b20 | 3, 6 | `e-se-ne` | fan (three side by side) |
| b21 | 3, 7 | `e-se-sw-w-nw-ne` | six-way |

## 5. Sheet c — four- and five-way crossings (`sheet.road.<type>.c.png`, guide `road.c.layout.png`)

| Cell | Row, column | Connections | Shape |
|---|---|---|---|
| c01 | 1, 1 | `se-sw-nw-ne` | X crossing (two straights) |
| c02 | 1, 2 | `e-sw-w-ne` | X crossing (two straights) |
| c03 | 1, 3 | `e-se-w-nw` | X crossing (two straights) |
| c04 | 1, 4 | `se-w-nw-ne` | four-way |
| c05 | 1, 5 | `e-sw-nw-ne` | four-way |
| c06 | 1, 6 | `e-se-w-ne` | four-way |
| c07 | 1, 7 | `e-se-sw-nw` | four-way |
| c08 | 2, 1 | `se-sw-w-ne` | four-way |
| c09 | 2, 2 | `e-sw-w-nw` | four-way |
| c10 | 2, 3 | `sw-w-nw-ne` | four-way |
| c11 | 2, 4 | `e-w-nw-ne` | four-way |
| c12 | 2, 5 | `e-se-nw-ne` | four-way |
| c13 | 2, 6 | `e-se-sw-ne` | four-way |
| c14 | 2, 7 | `e-se-sw-w` | four-way |
| c15 | 3, 1 | `se-sw-w-nw` | four-way |
| c16 | 3, 2 | `se-sw-w-nw-ne` | five-way |
| c17 | 3, 3 | `e-sw-w-nw-ne` | five-way |
| c18 | 3, 4 | `e-se-w-nw-ne` | five-way |
| c19 | 3, 5 | `e-se-sw-nw-ne` | five-way |
| c20 | 3, 6 | `e-se-sw-w-ne` | five-way |
| c21 | 3, 7 | `e-se-sw-w-nw` | five-way |

## 6. How a delivery enters the game

1. Save the sheets in `assets-source/sprites/final/` and run `npm run roads:import`. The importer checks each cell against the guide (the road must reach every listed edge at its middle and no other edge), clips every tile to its hex, writes one WebP per sheet in `assets-runtime/sprites/final/roads/` and registers it in `assets-runtime/sprites/manifest.json` under `roads`.
2. A map shows painted roads once **all three sheets of every road type it uses** are imported (until then it keeps the roads drawn by code, so a map never mixes the two). Dirt alone already covers most green maps that have no marsh or rough ground on their roads.
3. Run `npm run check` and look at a few maps: the roads must run on without visible joins from hex to hex, through bends and every kind of crossing, and change type where the land changes.

_Guides and layout: `npm run art:road-guides` (`tools/assets/briefs/road_guides.py`) writes the three guides, the join example and `assets-source/sprites/road-tiles.json` (cell order and geometry) from the game's own hex geometry._
