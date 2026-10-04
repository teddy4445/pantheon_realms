# Pantheon Realms — Art Brief 10 for GPT-6: TOWN BUILDING LEVELS

Generated 2026-10-04 by `npm run art:briefs` (owner request: "a list of the town buildings that have upgrades but use the same visual, for GPT to generate the versions — as a sheet cut into the versions, to reduce the number of images").

**What shares a picture today.** In every town the locations below have several levels, but every level shows the same painting (the location’s one picture). The creature dwellings already have one picture for the base and one for the upgraded building, and the other locations have one level. **72 level pictures** on **6 sheets** (one per pantheon) replace them.

| Pantheon | Location | Levels | Today |
|---|---|---|---|
| Greek | Civic Hall | 1. Village Hall · 2. Town Hall · 3. City Hall · 4. Capitol | `town.greek.support.civic_hall` (one picture for every level) |
| Greek | Pantheon Temple | 1. Temple I · 2. Temple II | `town.greek.support.pantheon_temple` (one picture for every level) |
| Greek | Mage Guild / Sanctum | 1. Sanctum I · 2. Sanctum II · 3. Sanctum III | `town.greek.support.mage_guild` (one picture for every level) |
| Greek | Fortifications / Gatehouse | 1. Fort · 2. Citadel · 3. Castle | `town.greek.support.fortifications` (one picture for every level) |
| Norse | Civic Hall | 1. Longhouse · 2. Jarl’s Hall · 3. High Hall · 4. Hall of Kings | `town.norse.support.civic_hall` (one picture for every level) |
| Norse | Pantheon Temple (Hof) | 1. Hof I · 2. Hof II | `town.norse.support.pantheon_temple` (one picture for every level) |
| Norse | Rune Circle | 1. Rune Circle I · 2. Rune Circle II · 3. Rune Circle III | `town.norse.support.mage_guild` (one picture for every level) |
| Norse | Fortifications / Gatehouse | 1. Palisade · 2. Stronghold · 3. Fortress | `town.norse.support.fortifications` (one picture for every level) |
| Egyptian | Civic Hall | 1. Nome House · 2. Governor's Palace · 3. Vizier's Palace · 4. Pharaoh's Palace | `town.egyptian.support.civic_hall` (one picture for every level) |
| Egyptian | Pantheon Temple (Temple of the Sun) | 1. Temple of the Sun I · 2. Temple of the Sun II | `town.egyptian.support.pantheon_temple` (one picture for every level) |
| Egyptian | House of Life | 1. House of Life I · 2. House of Life II · 3. House of Life III | `town.egyptian.support.mage_guild` (one picture for every level) |
| Egyptian | Fortifications / Gatehouse | 1. Enclosure Wall · 2. Fortress · 3. Great Fortress | `town.egyptian.support.fortifications` (one picture for every level) |
| Japanese | Civic Hall | 1. Headman's House · 2. Magistrate's Hall · 3. Daimyo's Hall · 4. Shogun's Palace | `town.japanese.support.civic_hall` (one picture for every level) |
| Japanese | Pantheon Temple (Shrine) | 1. Shrine · 2. Grand Shrine | `town.japanese.support.pantheon_temple` (one picture for every level) |
| Japanese | Onmyō Hall | 1. Onmyō Hall I · 2. Onmyō Hall II · 3. Onmyō Hall III | `town.japanese.support.mage_guild` (one picture for every level) |
| Japanese | Fortifications / Gatehouse | 1. Stockade · 2. Castle Walls · 3. Great Castle | `town.japanese.support.fortifications` (one picture for every level) |
| Celtic | Civic Hall | 1. Roundhouse · 2. Chieftain's Hall · 3. High King's Hall · 4. Hall of Tara | `town.celtic.support.civic_hall` (one picture for every level) |
| Celtic | Pantheon Temple (Nemeton) | 1. Nemeton I · 2. Nemeton II | `town.celtic.support.pantheon_temple` (one picture for every level) |
| Celtic | Druid Grove | 1. Druid Grove I · 2. Druid Grove II · 3. Druid Grove III | `town.celtic.support.mage_guild` (one picture for every level) |
| Celtic | Fortifications / Gatehouse | 1. Palisade · 2. Ringfort · 3. Hillfort | `town.celtic.support.fortifications` (one picture for every level) |
| Mesoamerican | Civic Hall | 1. Calpulli House · 2. Tecpan · 3. Great Palace · 4. Palace of the Sun | `town.mesoamerican.support.civic_hall` (one picture for every level) |
| Mesoamerican | Pantheon Temple (Pyramid) | 1. Temple Pyramid · 2. Great Pyramid | `town.mesoamerican.support.pantheon_temple` (one picture for every level) |
| Mesoamerican | House of the Codex | 1. House of the Codex I · 2. House of the Codex II · 3. House of the Codex III | `town.mesoamerican.support.mage_guild` (one picture for every level) |
| Mesoamerican | Fortifications / Gatehouse | 1. Stone Walls · 2. Fortified Precinct · 3. Great Precinct | `town.mesoamerican.support.fortifications` (one picture for every level) |

## 1. Rules for every sheet

1. **One sheet per request**, at the size given (about 1.6 megapixels, the size GPT-6 has delivered so far) **or larger with the same proportions**. Save it under its exact file name in **`assets-source/sprites/sheets/`**.
2. **Invisible grid** of equal cells, filled left to right, rows top to bottom, exactly as listed. Every picture stays inside its own cell; nothing touches or crosses a cell edge. A cell marked *empty* stays empty.
3. **No text** of any kind: no letters, numbers, runes or glyphs that read as writing, no logos, signatures, watermarks, frames, grid lines or labels.
4. **Then:** `npm run sprites:cut -- --only <sheet name>` cuts that sheet (and only that one: the sheets already delivered keep their reviewed cuts) into its single files (a preview of each cut goes to `assets-source/sprites/sheets/_preview/` — check it), then the importer named in the sheet’s *Then* line. Nothing else changes: the game picks the files up by name.
5. **Too much for one image?** A sheet may come as two images split between rows, `<sheet>.part1.png` (upper rows) and `<sheet>.part2.png` (the rest), each with the same columns and cell shape.
6. **Style:** modern high-resolution painterly fantasy strategy art — the look of the pantheon boards and the game’s opening paintings. Not pixel art, not a photograph, not a 3D-render look, not anime, no ink outlines, no flat vector.
7. **Respect.** Gods and heroes of living and historical traditions are painted dignified and powerful — never comic, never horror; adults only, no gore, no nudity.

Each sheet: **1536 × 1536 px**, 4 columns × 4 rows of square cells (384 × 384): **one row per location, its levels left to right**, unused cells *empty*. Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). The building alone — no ground plane, no cast shadow, no sky — seen from the town view’s camera (slightly above, three-quarter, as on the town board), its base resting on an invisible ground line at about 85 % of the cell height and centred. **The same building growing:** level 1 is the smallest and plainest; every level keeps the materials, colours and silhouette of the one before and adds to it (a storey, a wing, a dome or tower, columns, gilding, banners, braziers); the last level is the grandest. Keep the scale step between levels moderate so they sit in the same spot in the town. Cut into `assets-source/art/final/<asset ID>.png`; then `npm run art:import`.

### Greek town · `sheet.town.greek.levels.png`

| Field | Value |
|---|---|
| Rows | 1. Civic Hall: cell 1 Village Hall · cell 2 Town Hall · cell 3 City Hall · cell 4 Capitol<br>2. Pantheon Temple: cell 1 Temple I · cell 2 Temple II · cells 3–4 *empty*<br>3. Mage Guild / Sanctum: cell 1 Sanctum I · cell 2 Sanctum II · cell 3 Sanctum III · cell 4 *empty*<br>4. Fortifications / Gatehouse: cell 1 Fort · cell 2 Citadel · cell 3 Castle · cell 4 *empty* |
| Image | 1536 × 1536 px (or larger, same proportions) — 4 columns × 4 rows, cells 384 × 384 |
| Background | Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). |
| Attach | `support images/ChatGPT Image Sep 29, 2026, 04_17_21 PM-1.png` (the town board — architecture and colours); `assets-runtime/placeholders/town/greek/support.civic_hall.png` (today’s Civic Hall); `assets-runtime/placeholders/town/greek/support.pantheon_temple.png` (today’s Pantheon Temple); `assets-runtime/placeholders/town/greek/support.mage_guild.png` (today’s Mage Guild / Sanctum); `assets-runtime/placeholders/town/greek/support.fortifications.png` (today’s Fortifications / Gatehouse) |
| Cuts into | `town.greek.support.civic_hall.l1.png`, `town.greek.support.civic_hall.l2.png`, `town.greek.support.civic_hall.l3.png`, `town.greek.support.civic_hall.l4.png`, `town.greek.support.pantheon_temple.l1.png`, `town.greek.support.pantheon_temple.l2.png`, `town.greek.support.mage_guild.l1.png`, `town.greek.support.mage_guild.l2.png`, `town.greek.support.mage_guild.l3.png`, `town.greek.support.fortifications.l1.png`, `town.greek.support.fortifications.l2.png`, `town.greek.support.fortifications.l3.png` |
| Then | `npm run sprites:cut -- --only sheet.town.greek.levels`, then `npm run art:import` |

```text
Paint one sheet of town buildings for the fantasy strategy game Pantheon Realms (Greek town), in the style and architecture of the attached town board.
Image 1536 × 1536 px: an invisible grid of 4 columns × 4 rows of equal square cells. No grid lines, no labels, no numbers, no text. Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else).
Each row is ONE building growing level by level from left to right: the same materials, colours and silhouette, each level larger and richer than the one before; the attached picture of that building is its current look — keep its architecture.
Row 1 — Civic Hall: cell 1: Village Hall (level 1, the smallest) — Starting civic building. 500 Gold per day.; cell 2: Town Hall (level 2) — 1,000 Gold per day in total (replaces Village Hall income).; cell 3: City Hall (level 3) — 2,000 Gold per day in total.; cell 4: Capitol (level 4, the grandest) — 4,000 Gold per day in total. One Capitol per player..
Row 2 — Pantheon Temple: cell 1: Temple I (level 1, the smallest) — 1 Favor per day.; cell 2: Temple II (level 2, the grandest) — 2 Favor per day in total; enables a minor-god commitment.; cells 3–4: empty.
Row 3 — Mage Guild / Sanctum: cell 1: Sanctum I (level 1, the smallest) — Tier-1 spells; sells spellbooks (500 Gold).; cell 2: Sanctum II (level 2) — Tier-2 spells.; cell 3: Sanctum III (level 3, the grandest) — Tier-3 spells (Wisdom required to learn).; cells 4–4: empty.
Row 4 — Fortifications / Gatehouse: cell 1: Fort (level 1, the smallest) — Perimeter walls and gate; military prerequisite.; cell 2: Citadel (level 2) — 1.5× base weekly growth; keep and moat.; cell 3: Castle (level 3, the grandest) — 2× base weekly growth; stronger walls and towers.; cells 4–4: empty.
Each building alone, seen slightly from above in three-quarter view as on the town board, its base on an invisible ground line at 85 % of the cell height, centred; no ground, no shadow, no sky. Palette: royal blue, white marble and gold; laurel, meander borders, bronze.
```

### Norse town · `sheet.town.norse.levels.png`

| Field | Value |
|---|---|
| Rows | 1. Civic Hall: cell 1 Longhouse · cell 2 Jarl’s Hall · cell 3 High Hall · cell 4 Hall of Kings<br>2. Pantheon Temple (Hof): cell 1 Hof I · cell 2 Hof II · cells 3–4 *empty*<br>3. Rune Circle: cell 1 Rune Circle I · cell 2 Rune Circle II · cell 3 Rune Circle III · cell 4 *empty*<br>4. Fortifications / Gatehouse: cell 1 Palisade · cell 2 Stronghold · cell 3 Fortress · cell 4 *empty* |
| Image | 1536 × 1536 px (or larger, same proportions) — 4 columns × 4 rows, cells 384 × 384 |
| Background | Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). |
| Attach | `support images/ChatGPT Image Sep 29, 2026, 04_17_23 PM-2.png` (the town board — architecture and colours); `assets-runtime/placeholders/town/norse/support.civic_hall.png` (today’s Civic Hall); `assets-runtime/placeholders/town/norse/support.pantheon_temple.png` (today’s Pantheon Temple (Hof)); `assets-runtime/placeholders/town/norse/support.mage_guild.png` (today’s Rune Circle); `assets-runtime/placeholders/town/norse/support.fortifications.png` (today’s Fortifications / Gatehouse) |
| Cuts into | `town.norse.support.civic_hall.l1.png`, `town.norse.support.civic_hall.l2.png`, `town.norse.support.civic_hall.l3.png`, `town.norse.support.civic_hall.l4.png`, `town.norse.support.pantheon_temple.l1.png`, `town.norse.support.pantheon_temple.l2.png`, `town.norse.support.mage_guild.l1.png`, `town.norse.support.mage_guild.l2.png`, `town.norse.support.mage_guild.l3.png`, `town.norse.support.fortifications.l1.png`, `town.norse.support.fortifications.l2.png`, `town.norse.support.fortifications.l3.png` |
| Then | `npm run sprites:cut -- --only sheet.town.norse.levels`, then `npm run art:import` |

```text
Paint one sheet of town buildings for the fantasy strategy game Pantheon Realms (Norse town), in the style and architecture of the attached town board.
Image 1536 × 1536 px: an invisible grid of 4 columns × 4 rows of equal square cells. No grid lines, no labels, no numbers, no text. Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else).
Each row is ONE building growing level by level from left to right: the same materials, colours and silhouette, each level larger and richer than the one before; the attached picture of that building is its current look — keep its architecture.
Row 1 — Civic Hall: cell 1: Longhouse (level 1, the smallest) — Starting civic building. 500 Gold per day.; cell 2: Jarl’s Hall (level 2) — 1,000 Gold per day in total (replaces Longhouse income).; cell 3: High Hall (level 3) — 2,000 Gold per day in total.; cell 4: Hall of Kings (level 4, the grandest) — 4,000 Gold per day in total. One per player..
Row 2 — Pantheon Temple (Hof): cell 1: Hof I (level 1, the smallest) — 1 Favor per day.; cell 2: Hof II (level 2, the grandest) — 2 Favor per day in total; enables a minor-god commitment.; cells 3–4: empty.
Row 3 — Rune Circle: cell 1: Rune Circle I (level 1, the smallest) — Tier-1 spells; sells spellbooks (500 Gold).; cell 2: Rune Circle II (level 2) — Tier-2 spells.; cell 3: Rune Circle III (level 3, the grandest) — Tier-3 spells (Wisdom required to learn).; cells 4–4: empty.
Row 4 — Fortifications / Gatehouse: cell 1: Palisade (level 1, the smallest) — Perimeter walls and gate; military prerequisite.; cell 2: Stronghold (level 2) — 1.5× base weekly growth; keep and moat.; cell 3: Fortress (level 3, the grandest) — 2× base weekly growth; stronger walls and towers.; cells 4–4: empty.
Each building alone, seen slightly from above in three-quarter view as on the town board, its base on an invisible ground line at 85 % of the cell height, centred; no ground, no shadow, no sky. Palette: night navy, steel silver, fur browns and ember orange; knotwork, ravens, snow.
```

### Egyptian town · `sheet.town.egyptian.levels.png`

| Field | Value |
|---|---|
| Rows | 1. Civic Hall: cell 1 Nome House · cell 2 Governor's Palace · cell 3 Vizier's Palace · cell 4 Pharaoh's Palace<br>2. Pantheon Temple (Temple of the Sun): cell 1 Temple of the Sun I · cell 2 Temple of the Sun II · cells 3–4 *empty*<br>3. House of Life: cell 1 House of Life I · cell 2 House of Life II · cell 3 House of Life III · cell 4 *empty*<br>4. Fortifications / Gatehouse: cell 1 Enclosure Wall · cell 2 Fortress · cell 3 Great Fortress · cell 4 *empty* |
| Image | 1536 × 1536 px (or larger, same proportions) — 4 columns × 4 rows, cells 384 × 384 |
| Background | Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). |
| Attach | `support images/ChatGPT Image Sep 29, 2026, 04_17_25 PM-3.png` (the town board — architecture and colours); `assets-runtime/placeholders/town/egyptian/support.civic_hall.png` (today’s Civic Hall); `assets-runtime/placeholders/town/egyptian/support.pantheon_temple.png` (today’s Pantheon Temple (Temple of the Sun)); `assets-runtime/placeholders/town/egyptian/support.mage_guild.png` (today’s House of Life); `assets-runtime/placeholders/town/egyptian/support.fortifications.png` (today’s Fortifications / Gatehouse) |
| Cuts into | `town.egyptian.support.civic_hall.l1.png`, `town.egyptian.support.civic_hall.l2.png`, `town.egyptian.support.civic_hall.l3.png`, `town.egyptian.support.civic_hall.l4.png`, `town.egyptian.support.pantheon_temple.l1.png`, `town.egyptian.support.pantheon_temple.l2.png`, `town.egyptian.support.mage_guild.l1.png`, `town.egyptian.support.mage_guild.l2.png`, `town.egyptian.support.mage_guild.l3.png`, `town.egyptian.support.fortifications.l1.png`, `town.egyptian.support.fortifications.l2.png`, `town.egyptian.support.fortifications.l3.png` |
| Then | `npm run sprites:cut -- --only sheet.town.egyptian.levels`, then `npm run art:import` |

```text
Paint one sheet of town buildings for the fantasy strategy game Pantheon Realms (Egyptian town), in the style and architecture of the attached town board.
Image 1536 × 1536 px: an invisible grid of 4 columns × 4 rows of equal square cells. No grid lines, no labels, no numbers, no text. Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else).
Each row is ONE building growing level by level from left to right: the same materials, colours and silhouette, each level larger and richer than the one before; the attached picture of that building is its current look — keep its architecture.
Row 1 — Civic Hall: cell 1: Nome House (level 1, the smallest) — Starting civic building. 500 Gold per day.; cell 2: Governor's Palace (level 2) — 1,000 Gold per day in total (replaces Nome House income).; cell 3: Vizier's Palace (level 3) — 2,000 Gold per day in total.; cell 4: Pharaoh's Palace (level 4, the grandest) — 4,000 Gold per day in total. One per player..
Row 2 — Pantheon Temple (Temple of the Sun): cell 1: Temple of the Sun I (level 1, the smallest) — 1 Favor per day.; cell 2: Temple of the Sun II (level 2, the grandest) — 2 Favor per day in total; enables a minor-god commitment.; cells 3–4: empty.
Row 3 — House of Life: cell 1: House of Life I (level 1, the smallest) — Tier-1 spells; sells spellbooks (500 Gold).; cell 2: House of Life II (level 2) — Tier-2 spells.; cell 3: House of Life III (level 3, the grandest) — Tier-3 spells (Wisdom required to learn).; cells 4–4: empty.
Row 4 — Fortifications / Gatehouse: cell 1: Enclosure Wall (level 1, the smallest) — Perimeter walls and gate; military prerequisite.; cell 2: Fortress (level 2) — 1.5× base weekly growth; keep and moat.; cell 3: Great Fortress (level 3, the grandest) — 2× base weekly growth; stronger walls and towers.; cells 4–4: empty.
Each building alone, seen slightly from above in three-quarter view as on the town board, its base on an invisible ground line at 85 % of the cell height, centred; no ground, no shadow, no sky. Palette: sand gold, white linen, lapis blue and carnelian; sun discs, spread wings, broad collars.
```

### Japanese town · `sheet.town.japanese.levels.png`

| Field | Value |
|---|---|
| Rows | 1. Civic Hall: cell 1 Headman's House · cell 2 Magistrate's Hall · cell 3 Daimyo's Hall · cell 4 Shogun's Palace<br>2. Pantheon Temple (Shrine): cell 1 Shrine · cell 2 Grand Shrine · cells 3–4 *empty*<br>3. Onmyō Hall: cell 1 Onmyō Hall I · cell 2 Onmyō Hall II · cell 3 Onmyō Hall III · cell 4 *empty*<br>4. Fortifications / Gatehouse: cell 1 Stockade · cell 2 Castle Walls · cell 3 Great Castle · cell 4 *empty* |
| Image | 1536 × 1536 px (or larger, same proportions) — 4 columns × 4 rows, cells 384 × 384 |
| Background | Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). |
| Attach | `support images/ChatGPT Image Sep 29, 2026, 04_17_27 PM-4.png` (the town board — architecture and colours); `assets-runtime/placeholders/town/japanese/support.civic_hall.png` (today’s Civic Hall); `assets-runtime/placeholders/town/japanese/support.pantheon_temple.png` (today’s Pantheon Temple (Shrine)); `assets-runtime/placeholders/town/japanese/support.mage_guild.png` (today’s Onmyō Hall); `assets-runtime/placeholders/town/japanese/support.fortifications.png` (today’s Fortifications / Gatehouse) |
| Cuts into | `town.japanese.support.civic_hall.l1.png`, `town.japanese.support.civic_hall.l2.png`, `town.japanese.support.civic_hall.l3.png`, `town.japanese.support.civic_hall.l4.png`, `town.japanese.support.pantheon_temple.l1.png`, `town.japanese.support.pantheon_temple.l2.png`, `town.japanese.support.mage_guild.l1.png`, `town.japanese.support.mage_guild.l2.png`, `town.japanese.support.mage_guild.l3.png`, `town.japanese.support.fortifications.l1.png`, `town.japanese.support.fortifications.l2.png`, `town.japanese.support.fortifications.l3.png` |
| Then | `npm run sprites:cut -- --only sheet.town.japanese.levels`, then `npm run art:import` |

```text
Paint one sheet of town buildings for the fantasy strategy game Pantheon Realms (Japanese town), in the style and architecture of the attached town board.
Image 1536 × 1536 px: an invisible grid of 4 columns × 4 rows of equal square cells. No grid lines, no labels, no numbers, no text. Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else).
Each row is ONE building growing level by level from left to right: the same materials, colours and silhouette, each level larger and richer than the one before; the attached picture of that building is its current look — keep its architecture.
Row 1 — Civic Hall: cell 1: Headman's House (level 1, the smallest) — Starting civic building. 500 Gold per day.; cell 2: Magistrate's Hall (level 2) — 1,000 Gold per day in total (replaces Headman's House income).; cell 3: Daimyo's Hall (level 3) — 2,000 Gold per day in total.; cell 4: Shogun's Palace (level 4, the grandest) — 4,000 Gold per day in total. One per player..
Row 2 — Pantheon Temple (Shrine): cell 1: Shrine (level 1, the smallest) — 1 Favor per day.; cell 2: Grand Shrine (level 2, the grandest) — 2 Favor per day in total; enables a minor-god commitment.; cells 3–4: empty.
Row 3 — Onmyō Hall: cell 1: Onmyō Hall I (level 1, the smallest) — Tier-1 spells; sells spellbooks (500 Gold).; cell 2: Onmyō Hall II (level 2) — Tier-2 spells.; cell 3: Onmyō Hall III (level 3, the grandest) — Tier-3 spells (Wisdom required to learn).; cells 4–4: empty.
Row 4 — Fortifications / Gatehouse: cell 1: Stockade (level 1, the smallest) — Perimeter walls and gate; military prerequisite.; cell 2: Castle Walls (level 2) — 1.5× base weekly growth; keep and moat.; cell 3: Great Castle (level 3, the grandest) — 2× base weekly growth; stronger walls and towers.; cells 4–4: empty.
Each building alone, seen slightly from above in three-quarter view as on the town board, its base on an invisible ground line at 85 % of the cell height, centred; no ground, no shadow, no sky. Palette: vermilion, black lacquer and white with cherry pink and gold; clouds, waves, lacquered armour.
```

### Celtic town · `sheet.town.celtic.levels.png`

| Field | Value |
|---|---|
| Rows | 1. Civic Hall: cell 1 Roundhouse · cell 2 Chieftain's Hall · cell 3 High King's Hall · cell 4 Hall of Tara<br>2. Pantheon Temple (Nemeton): cell 1 Nemeton I · cell 2 Nemeton II · cells 3–4 *empty*<br>3. Druid Grove: cell 1 Druid Grove I · cell 2 Druid Grove II · cell 3 Druid Grove III · cell 4 *empty*<br>4. Fortifications / Gatehouse: cell 1 Palisade · cell 2 Ringfort · cell 3 Hillfort · cell 4 *empty* |
| Image | 1536 × 1536 px (or larger, same proportions) — 4 columns × 4 rows, cells 384 × 384 |
| Background | Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). |
| Attach | `support images/ChatGPT Image Sep 29, 2026, 04_17_35 PM-5.png` (the town board — architecture and colours); `assets-runtime/placeholders/town/celtic/support.civic_hall.png` (today’s Civic Hall); `assets-runtime/placeholders/town/celtic/support.pantheon_temple.png` (today’s Pantheon Temple (Nemeton)); `assets-runtime/placeholders/town/celtic/support.mage_guild.png` (today’s Druid Grove); `assets-runtime/placeholders/town/celtic/support.fortifications.png` (today’s Fortifications / Gatehouse) |
| Cuts into | `town.celtic.support.civic_hall.l1.png`, `town.celtic.support.civic_hall.l2.png`, `town.celtic.support.civic_hall.l3.png`, `town.celtic.support.civic_hall.l4.png`, `town.celtic.support.pantheon_temple.l1.png`, `town.celtic.support.pantheon_temple.l2.png`, `town.celtic.support.mage_guild.l1.png`, `town.celtic.support.mage_guild.l2.png`, `town.celtic.support.mage_guild.l3.png`, `town.celtic.support.fortifications.l1.png`, `town.celtic.support.fortifications.l2.png`, `town.celtic.support.fortifications.l3.png` |
| Then | `npm run sprites:cut -- --only sheet.town.celtic.levels`, then `npm run art:import` |

```text
Paint one sheet of town buildings for the fantasy strategy game Pantheon Realms (Celtic town), in the style and architecture of the attached town board.
Image 1536 × 1536 px: an invisible grid of 4 columns × 4 rows of equal square cells. No grid lines, no labels, no numbers, no text. Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else).
Each row is ONE building growing level by level from left to right: the same materials, colours and silhouette, each level larger and richer than the one before; the attached picture of that building is its current look — keep its architecture.
Row 1 — Civic Hall: cell 1: Roundhouse (level 1, the smallest) — Starting civic building. 500 Gold per day.; cell 2: Chieftain's Hall (level 2) — 1,000 Gold per day in total (replaces Roundhouse income).; cell 3: High King's Hall (level 3) — 2,000 Gold per day in total.; cell 4: Hall of Tara (level 4, the grandest) — 4,000 Gold per day in total. One per player..
Row 2 — Pantheon Temple (Nemeton): cell 1: Nemeton I (level 1, the smallest) — 1 Favor per day.; cell 2: Nemeton II (level 2, the grandest) — 2 Favor per day in total; enables a minor-god commitment.; cells 3–4: empty.
Row 3 — Druid Grove: cell 1: Druid Grove I (level 1, the smallest) — Tier-1 spells; sells spellbooks (500 Gold).; cell 2: Druid Grove II (level 2) — Tier-2 spells.; cell 3: Druid Grove III (level 3, the grandest) — Tier-3 spells (Wisdom required to learn).; cells 4–4: empty.
Row 4 — Fortifications / Gatehouse: cell 1: Palisade (level 1, the smallest) — Perimeter walls and gate; military prerequisite.; cell 2: Ringfort (level 2) — 1.5× base weekly growth; keep and moat.; cell 3: Hillfort (level 3, the grandest) — 2× base weekly growth; stronger walls and towers.; cells 4–4: empty.
Each building alone, seen slightly from above in three-quarter view as on the town board, its base on an invisible ground line at 85 % of the cell height, centred; no ground, no shadow, no sky. Palette: forest green and gold with grey stone, woad blue and heather; spirals, torcs, mist.
```

### Mesoamerican town · `sheet.town.mesoamerican.levels.png`

| Field | Value |
|---|---|
| Rows | 1. Civic Hall: cell 1 Calpulli House · cell 2 Tecpan · cell 3 Great Palace · cell 4 Palace of the Sun<br>2. Pantheon Temple (Pyramid): cell 1 Temple Pyramid · cell 2 Great Pyramid · cells 3–4 *empty*<br>3. House of the Codex: cell 1 House of the Codex I · cell 2 House of the Codex II · cell 3 House of the Codex III · cell 4 *empty*<br>4. Fortifications / Gatehouse: cell 1 Stone Walls · cell 2 Fortified Precinct · cell 3 Great Precinct · cell 4 *empty* |
| Image | 1536 × 1536 px (or larger, same proportions) — 4 columns × 4 rows, cells 384 × 384 |
| Background | Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). |
| Attach | `support images/ChatGPT Image Sep 29, 2026, 04_17_37 PM-6.png` (the town board — architecture and colours); `assets-runtime/placeholders/town/mesoamerican/support.civic_hall.png` (today’s Civic Hall); `assets-runtime/placeholders/town/mesoamerican/support.pantheon_temple.png` (today’s Pantheon Temple (Pyramid)); `assets-runtime/placeholders/town/mesoamerican/support.mage_guild.png` (today’s House of the Codex); `assets-runtime/placeholders/town/mesoamerican/support.fortifications.png` (today’s Fortifications / Gatehouse) |
| Cuts into | `town.mesoamerican.support.civic_hall.l1.png`, `town.mesoamerican.support.civic_hall.l2.png`, `town.mesoamerican.support.civic_hall.l3.png`, `town.mesoamerican.support.civic_hall.l4.png`, `town.mesoamerican.support.pantheon_temple.l1.png`, `town.mesoamerican.support.pantheon_temple.l2.png`, `town.mesoamerican.support.mage_guild.l1.png`, `town.mesoamerican.support.mage_guild.l2.png`, `town.mesoamerican.support.mage_guild.l3.png`, `town.mesoamerican.support.fortifications.l1.png`, `town.mesoamerican.support.fortifications.l2.png`, `town.mesoamerican.support.fortifications.l3.png` |
| Then | `npm run sprites:cut -- --only sheet.town.mesoamerican.levels`, then `npm run art:import` |

```text
Paint one sheet of town buildings for the fantasy strategy game Pantheon Realms (Mesoamerican town), in the style and architecture of the attached town board.
Image 1536 × 1536 px: an invisible grid of 4 columns × 4 rows of equal square cells. No grid lines, no labels, no numbers, no text. Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else).
Each row is ONE building growing level by level from left to right: the same materials, colours and silhouette, each level larger and richer than the one before; the attached picture of that building is its current look — keep its architecture.
Row 1 — Civic Hall: cell 1: Calpulli House (level 1, the smallest) — Starting civic building. 500 Gold per day.; cell 2: Tecpan (level 2) — 1,000 Gold per day in total (replaces Calpulli House income).; cell 3: Great Palace (level 3) — 2,000 Gold per day in total.; cell 4: Palace of the Sun (level 4, the grandest) — 4,000 Gold per day in total. One per player..
Row 2 — Pantheon Temple (Pyramid): cell 1: Temple Pyramid (level 1, the smallest) — 1 Favor per day.; cell 2: Great Pyramid (level 2, the grandest) — 2 Favor per day in total; enables a minor-god commitment.; cells 3–4: empty.
Row 3 — House of the Codex: cell 1: House of the Codex I (level 1, the smallest) — Tier-1 spells; sells spellbooks (500 Gold).; cell 2: House of the Codex II (level 2) — Tier-2 spells.; cell 3: House of the Codex III (level 3, the grandest) — Tier-3 spells (Wisdom required to learn).; cells 4–4: empty.
Row 4 — Fortifications / Gatehouse: cell 1: Stone Walls (level 1, the smallest) — Perimeter walls and gate; military prerequisite.; cell 2: Fortified Precinct (level 2) — 1.5× base weekly growth; keep and moat.; cell 3: Great Precinct (level 3, the grandest) — 2× base weekly growth; stronger walls and towers.; cells 4–4: empty.
Each building alone, seen slightly from above in three-quarter view as on the town board, its base on an invisible ground line at 85 % of the cell height, centred; no ground, no shadow, no sky. Palette: turquoise and crimson with jade and gold; quetzal feathers, step-fret patterns, jade.
```

## Checklist

* One sheet per pantheon, named exactly as above, transparent, one building per cell, each row the same building growing.
* `npm run sprites:cut -- --only <sheet name>` for each new sheet (check the previews), then `npm run art:import`. The town then shows each level’s own picture.
