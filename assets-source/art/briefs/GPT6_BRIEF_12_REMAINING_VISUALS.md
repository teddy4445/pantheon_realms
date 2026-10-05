# Pantheon Realms — Art Brief 12 for GPT-6: THE VISUALS STILL MISSING

Generated 2026-10-04 by `npm run art:brief12` from the game itself (owner request: “give me a file that explains GPT 6 what visuals are still lacking, what we want to have in them and how we need it to add them later to the game”). Everything listed here is shown in the game **today** with a stand-in — a crop of a concept board, a crop of a *different* building, a generated placeholder or an interface glyph — and is replaced by the delivered file **without a code change**: drop the sheet, cut it, run the importer.

Already delivered and **not** in this brief: creatures and their animations, map heroes (idle, walk, prepare, cast), map sites and decorations, battle obstacles and siege pieces, the 177 magic and Favor effects, terrain, battlefields and skies, story busts (the Herald’s too, 2026-10-04), covers, endings and mission art, miracle cards, splashes and banners, god and hero portraits, the god-card icons, the 72 town-building levels of Brief 10, spells, skills, every artifact (the nine Workshop treasures delivered 2026-10-04), the artifact-set emblems and creature-ability badges (2026-10-04), interface icons, cursors, emblems and the twelve quieter opening paintings (2026-10-04).

## What is still missing — at a glance

| Part | What | Count | Today in the game | Sheets | Importer | Priority |
|---|---|---|---|---|---|---|
| A | Creature dwellings (base + upgraded), town cutouts | 84 | crops from the concept boards; **34 of them show a different building** (stand-ins) | 6 (`sheet.town.<pantheon>.dwellings`) | `art:import` | **high** |
| B | Town services (Tavern, Marketplace, Resource Depot, Workshop, Training Academy, Watchtower, Artifact Merchant) | 42 | crops from the concept boards, with ground and cut edges | 6 (`sheet.town.<pantheon>.services`) | `art:import` | **high** |
| C | Climate icons (new climate rules) | 9 | an interface glyph in the battle chip | 1 (`sheet.icons.climate`) | `icons:import` | **high** |
| D | Map markers of the random-map sites | 8 | the nearest older marker | 1 (`sheet.icons.sitemarkers`) | `icons:import` | medium |
| E | Town backgrounds, sharper repaint (optional) | 6 | the owner’s concept paintings at 1448 × 1086 | — (single paintings) | `art:import` | medium |
| F | God commitment effect (optional) | 1 | the Anointing gift’s burst | — (one strip) | `sprites:import` | low |

**Suggested order:** A and B together per pantheon (each town then looks finished), C (the climate rules are new and still show glyphs), then D, E if the towns look soft on large screens, and the rest when convenient.

## 1. Rules for every sheet

1. **One sheet per request**, at the size given **or larger with the same proportions**. Save it under its exact file name in **`assets-source/sprites/sheets/`**.
2. **Invisible grid** of equal cells, filled left to right, rows top to bottom, exactly as listed. Every picture stays inside its own cell; nothing touches or crosses a cell edge. A cell marked *empty* stays empty.
3. **No text** of any kind: no letters, numbers, runes or glyphs that read as writing, no logos, signatures, watermarks, frames, grid lines or labels.
4. **Then:** `npm run sprites:cut -- --only <sheet name>` cuts that sheet — and only that one: the sheets already delivered keep their reviewed cuts — into its single files (check the preview of each cut in `assets-source/sprites/sheets/_preview/`), then run the importer named in the sheet’s *Then* line. Nothing else changes: the game picks the files up by name.
5. **Too much for one image?** A sheet may come as two images split between rows, `<sheet>.part1.png` (upper rows) and `<sheet>.part2.png` (the rest), each with the same columns and cell shape.
6. **Style:** modern high-resolution painterly fantasy strategy art — the look of the pantheon boards, the delivered town levels (Brief 10) and the game’s opening paintings. Not pixel art, not a photograph, not a 3D-render look, not anime, no ink outlines, no flat vector.
7. **Respect.** Gods, heroes and cultures of living and historical traditions are shown dignified — never comic, never horror; adults only, no gore, no nudity.

## 2. How a delivery enters the game (the same for every part)

1. Save the image under its exact file name — sheets in `assets-source/sprites/sheets/`, single paintings (part E) in `assets-source/art/final/`, the effect strip (part F) in `assets-source/sprites/final/`.
2. Sheets: `npm run sprites:cut -- --only <sheet name>` writes one file per cell, named by asset ID, into `assets-source/art/final/` (town art) or `assets-source/icons/final/` (icons and portraits). Check `assets-source/sprites/sheets/_preview/<sheet name>.png`.
3. Run the importer of the part: `npm run art:import` (town art → `assets-runtime/art/town/`, ≤ 512 px with transparency for buildings, ≤ 2048 px for backgrounds), `npm run icons:import -- --new` (new icons and portraits → `assets-runtime/ui/icons/final/`, sized per the icon catalog; without `--new` every icon is re-encoded and re-dated), `npm run sprites:import` (effect strip → the sprite manifest).
4. The game finds every picture by its asset ID (town buildings by their level’s ID, icons by `icon.*`, the effect by `fx.god.commit`); the stand-in disappears by itself. Then `npm run icons:catalog` updates ICON_CATALOG.md, and `npm run check` must stay green.
5. Never re-cut all sheets and never edit the delivered files in `assets-source/sprites/final/` by hand: cut a new or corrected sheet alone with `--only`.

## Part A — Creature dwellings (town cutouts)

Each town has seven dwellings, one per creature tier, each with its base building and its upgraded building (84 pictures). Today they are cut from the owner’s concept boards: they stand on chunks of rock or ground, many are cut off at the edges, and **34** show a different building than the dwelling they stand for (marked *stand-in* below — paint the real dwelling of that creature). They should match the **delivered town levels of Brief 10** (`assets-source/sprites/sheets/sheet.town.<pantheon>.levels.png`): the building alone, no ground.

Each sheet: **1536 × 1536 px**, 4 columns × 4 rows of square cells (384 × 384): tier 1 base, tier 1 upgraded, tier 2 base, tier 2 upgraded — and so on, left to right, top to bottom; the last two cells *empty*. Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). The building alone — **no ground plane, no rock base, no cast shadow, no sky** — seen from the town view’s camera (slightly above, three-quarter), its base on an invisible ground line at about 85 % of the cell height, centred. **The upgraded building is the base building made grander** (the same silhouette with added storeys, banners, gilding, braziers, statues), so the two read as one building improved. Each dwelling shows who lives there: the creature’s statue, emblem, nest, kennel, stable or forge in its architecture (not the creature itself standing in front).

### Greek dwellings · `sheet.town.greek.dwellings.png`

| Cell | Asset ID | Building | For | Today |
|---|---|---|---|---|
| 1.1 | `town.greek.dwelling.tier1.base` | Barracks | the dwelling of the Hoplite (tier 1) | concept-board crop |
| 1.2 | `town.greek.dwelling.tier1.upgraded` | Veteran Barracks | the upgraded dwelling of the Veteran Hoplite (tier 1) | concept-board crop |
| 1.3 | `town.greek.dwelling.tier2.base` | Peltast Range | the dwelling of the Peltast (tier 2) | **stand-in crop (Archery Range (base) — stand-in for Peltast Range)** — paint the real one |
| 1.4 | `town.greek.dwelling.tier2.upgraded` | Veteran Range | the upgraded dwelling of the Veteran Peltast (tier 2) | **stand-in crop (Archery Range (upgraded) — stand-in for Veteran Range)** — paint the real one |
| 2.1 | `town.greek.dwelling.tier3.base` | Griffin Aerie | the dwelling of the Griffin (tier 3) | concept-board crop |
| 2.2 | `town.greek.dwelling.tier3.upgraded` | Windcrest Aerie | the upgraded dwelling of the Windcrest Griffin (tier 3) | concept-board crop |
| 2.3 | `town.greek.dwelling.tier4.base` | Training Court | the dwelling of the Cavalry (tier 4) | **stand-in crop (Training Academy art — stand-in for the Cavalry Training Court)** — paint the real one |
| 2.4 | `town.greek.dwelling.tier4.upgraded` | Companion Court | the upgraded dwelling of the Companion Cavalry (tier 4) | **stand-in crop (Centaur Grove (upgraded) art — stand-in for Companion Court)** — paint the real one |
| 3.1 | `town.greek.dwelling.tier5.base` | House of Adepts | the dwelling of the Temple Adept (tier 5) | **stand-in crop (Artifact Merchant art — stand-in for House of Adepts)** — paint the real one |
| 3.2 | `town.greek.dwelling.tier5.upgraded` | House of Seers | the upgraded dwelling of the Temple Seer (tier 5) | **stand-in crop (Observatory art — stand-in for House of Seers)** — paint the real one |
| 3.3 | `town.greek.dwelling.tier6.base` | Labyrinth | the dwelling of the Minotaur (tier 6) | concept-board crop |
| 3.4 | `town.greek.dwelling.tier6.upgraded` | Warden Labyrinth | the upgraded dwelling of the Labyrinth Warden (tier 6) | concept-board crop |
| 4.1 | `town.greek.dwelling.tier7.base` | Thunder Quarry | the dwelling of the Cyclops (tier 7) | concept-board crop |
| 4.2 | `town.greek.dwelling.tier7.upgraded` | Storm Forge | the upgraded dwelling of the Stormforged Cyclops (tier 7) | concept-board crop |

| Field | Value |
|---|---|
| Image | 1536 × 1536 px (or larger, same proportions) — 4 columns × 4 rows, cells 384 × 384; cells 4.3 and 4.4 *empty* |
| Background | Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). |
| Attach | `support images/ChatGPT Image Sep 29, 2026, 04_17_21 PM-1.png` (the town board — architecture and colours); `assets-source/sprites/sheets/sheet.town.greek.levels.png` (the delivered levels — match their finish); today’s crops `assets-runtime/placeholders/town/greek/dwelling.tier<N>.<base|upgraded>.png` (keep the ones that are not stand-ins) |
| Cuts into | `assets-source/art/final/town.greek.dwelling.tier<1–7>.<base|upgraded>.png` (14 files) |
| Then | `npm run sprites:cut -- --only sheet.town.greek.dwellings`, then `npm run art:import` |

```text
Paint one sheet of creature dwellings for the town of the fantasy strategy game Pantheon Realms (Greek town), in the style and architecture of the attached town board and the attached sheet of town buildings.
Image 1536 × 1536 px: an invisible grid of 4 columns × 4 rows of equal square cells. No grid lines, no labels, no numbers, no text. Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else).
Row 1, cell 1: Barracks — the dwelling of the Hoplite (tier 1).
Row 1, cell 2: Veteran Barracks — the upgraded dwelling of the Veteran Hoplite (tier 1): the same building as the cell before, made grander.
Row 1, cell 3: Peltast Range — the dwelling of the Peltast (tier 2) (design it fresh; the attached crop shows another building).
Row 1, cell 4: Veteran Range — the upgraded dwelling of the Veteran Peltast (tier 2): the same building as the cell before, made grander (design it fresh; the attached crop shows another building).
Row 2, cell 1: Griffin Aerie — the dwelling of the Griffin (tier 3).
Row 2, cell 2: Windcrest Aerie — the upgraded dwelling of the Windcrest Griffin (tier 3): the same building as the cell before, made grander.
Row 2, cell 3: Training Court — the dwelling of the Cavalry (tier 4) (design it fresh; the attached crop shows another building).
Row 2, cell 4: Companion Court — the upgraded dwelling of the Companion Cavalry (tier 4): the same building as the cell before, made grander (design it fresh; the attached crop shows another building).
Row 3, cell 1: House of Adepts — the dwelling of the Temple Adept (tier 5) (design it fresh; the attached crop shows another building).
Row 3, cell 2: House of Seers — the upgraded dwelling of the Temple Seer (tier 5): the same building as the cell before, made grander (design it fresh; the attached crop shows another building).
Row 3, cell 3: Labyrinth — the dwelling of the Minotaur (tier 6).
Row 3, cell 4: Warden Labyrinth — the upgraded dwelling of the Labyrinth Warden (tier 6): the same building as the cell before, made grander.
Row 4, cell 1: Thunder Quarry — the dwelling of the Cyclops (tier 7).
Row 4, cell 2: Storm Forge — the upgraded dwelling of the Stormforged Cyclops (tier 7): the same building as the cell before, made grander.
Row 4, cells 3–4: empty.
Each building alone, seen slightly from above in three-quarter view as on the town board, its base on an invisible ground line at 85 % of the cell height, centred; no ground, no rocks under it, no shadow, no sky. Each shows who lives there through its architecture (a statue, emblem, nest, stable or forge of that creature). Palette: royal blue, white marble and gold; laurel, meander borders, bronze.
```

### Norse dwellings · `sheet.town.norse.dwellings.png`

| Cell | Asset ID | Building | For | Today |
|---|---|---|---|---|
| 1.1 | `town.norse.dwelling.tier1.base` | Draugr Barrow | the dwelling of the Draugr (tier 1) | concept-board crop |
| 1.2 | `town.norse.dwelling.tier1.upgraded` | Deathless Barrow | the upgraded dwelling of the Deathless Draugr (tier 1) | concept-board crop |
| 1.3 | `town.norse.dwelling.tier2.base` | Wolf Den | the dwelling of the Frost Wolf (tier 2) | concept-board crop |
| 1.4 | `town.norse.dwelling.tier2.upgraded` | Fenrir Den | the upgraded dwelling of the Fenrir Wolf (tier 2) | concept-board crop |
| 2.1 | `town.norse.dwelling.tier3.base` | Troll Cave | the dwelling of the Frost Troll (tier 3) | **stand-in crop (Jotun Outpost (base) — stand-in for the Frost Troll dwelling)** — paint the real one |
| 2.2 | `town.norse.dwelling.tier3.upgraded` | Ancient Troll Cave | the upgraded dwelling of the Ancient Frost Troll (tier 3) | **stand-in crop (Jotun Outpost (upgraded) — stand-in)** — paint the real one |
| 2.3 | `town.norse.dwelling.tier4.base` | Valkyrie Aerie | the dwelling of the Valkyrie (tier 4) | concept-board crop |
| 2.4 | `town.norse.dwelling.tier4.upgraded` | Hall of the Chosen | the upgraded dwelling of the Battle Valkyrie (tier 4) | concept-board crop |
| 3.1 | `town.norse.dwelling.tier5.base` | Lindworm Roost | the dwelling of the Lindworm (tier 5) | **stand-in crop (Raven Roost (base) — stand-in for the Lindworm dwelling)** — paint the real one |
| 3.2 | `town.norse.dwelling.tier5.upgraded` | Storm Roost | the upgraded dwelling of the Storm Lindworm (tier 5) | **stand-in crop (Raven Roost (upgraded) — stand-in)** — paint the real one |
| 3.3 | `town.norse.dwelling.tier6.base` | Jotunn Camp | the dwelling of the Jotunn (tier 6) | concept-board crop |
| 3.4 | `town.norse.dwelling.tier6.upgraded` | Rune Hall of the Giants | the upgraded dwelling of the Runic Jotunn (tier 6) | concept-board crop |
| 4.1 | `town.norse.dwelling.tier7.base` | Serpent Lair | the dwelling of the Nidhogg Wyrm (tier 7) | concept-board crop |
| 4.2 | `town.norse.dwelling.tier7.upgraded` | World-Serpent Lair | the upgraded dwelling of the World-Serpent Wyrm (tier 7) | concept-board crop |

| Field | Value |
|---|---|
| Image | 1536 × 1536 px (or larger, same proportions) — 4 columns × 4 rows, cells 384 × 384; cells 4.3 and 4.4 *empty* |
| Background | Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). |
| Attach | `support images/ChatGPT Image Sep 29, 2026, 04_17_23 PM-2.png` (the town board — architecture and colours); `assets-source/sprites/sheets/sheet.town.norse.levels.png` (the delivered levels — match their finish); today’s crops `assets-runtime/placeholders/town/norse/dwelling.tier<N>.<base|upgraded>.png` (keep the ones that are not stand-ins) |
| Cuts into | `assets-source/art/final/town.norse.dwelling.tier<1–7>.<base|upgraded>.png` (14 files) |
| Then | `npm run sprites:cut -- --only sheet.town.norse.dwellings`, then `npm run art:import` |

```text
Paint one sheet of creature dwellings for the town of the fantasy strategy game Pantheon Realms (Norse town), in the style and architecture of the attached town board and the attached sheet of town buildings.
Image 1536 × 1536 px: an invisible grid of 4 columns × 4 rows of equal square cells. No grid lines, no labels, no numbers, no text. Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else).
Row 1, cell 1: Draugr Barrow — the dwelling of the Draugr (tier 1).
Row 1, cell 2: Deathless Barrow — the upgraded dwelling of the Deathless Draugr (tier 1): the same building as the cell before, made grander.
Row 1, cell 3: Wolf Den — the dwelling of the Frost Wolf (tier 2).
Row 1, cell 4: Fenrir Den — the upgraded dwelling of the Fenrir Wolf (tier 2): the same building as the cell before, made grander.
Row 2, cell 1: Troll Cave — the dwelling of the Frost Troll (tier 3) (design it fresh; the attached crop shows another building).
Row 2, cell 2: Ancient Troll Cave — the upgraded dwelling of the Ancient Frost Troll (tier 3): the same building as the cell before, made grander (design it fresh; the attached crop shows another building).
Row 2, cell 3: Valkyrie Aerie — the dwelling of the Valkyrie (tier 4).
Row 2, cell 4: Hall of the Chosen — the upgraded dwelling of the Battle Valkyrie (tier 4): the same building as the cell before, made grander.
Row 3, cell 1: Lindworm Roost — the dwelling of the Lindworm (tier 5) (design it fresh; the attached crop shows another building).
Row 3, cell 2: Storm Roost — the upgraded dwelling of the Storm Lindworm (tier 5): the same building as the cell before, made grander (design it fresh; the attached crop shows another building).
Row 3, cell 3: Jotunn Camp — the dwelling of the Jotunn (tier 6).
Row 3, cell 4: Rune Hall of the Giants — the upgraded dwelling of the Runic Jotunn (tier 6): the same building as the cell before, made grander.
Row 4, cell 1: Serpent Lair — the dwelling of the Nidhogg Wyrm (tier 7).
Row 4, cell 2: World-Serpent Lair — the upgraded dwelling of the World-Serpent Wyrm (tier 7): the same building as the cell before, made grander.
Row 4, cells 3–4: empty.
Each building alone, seen slightly from above in three-quarter view as on the town board, its base on an invisible ground line at 85 % of the cell height, centred; no ground, no rocks under it, no shadow, no sky. Each shows who lives there through its architecture (a statue, emblem, nest, stable or forge of that creature). Palette: night navy, steel silver, fur browns and ember orange; knotwork, ravens, snow.
```

### Egyptian dwellings · `sheet.town.egyptian.dwellings.png`

| Cell | Asset ID | Building | For | Today |
|---|---|---|---|---|
| 1.1 | `town.egyptian.dwelling.tier1.base` | Scarab Burrow | the dwelling of the Sacred Scarab (tier 1) | **stand-in crop (Scorpion Lair (base) — the board's level-2 dwelling, used for tier 1 (themed stand-in))** — paint the real one |
| 1.2 | `town.egyptian.dwelling.tier1.upgraded` | Solar Burrow | the upgraded dwelling of the Solar Scarab (tier 1) | **stand-in crop (Scorpion Lair (upgraded) — the board's level-2 dwelling, used for tier 1 (themed stand-in))** — paint the real one |
| 1.3 | `town.egyptian.dwelling.tier2.base` | Jackal Kennels | the dwelling of the Jackal Guardian (tier 2) | concept-board crop |
| 1.4 | `town.egyptian.dwelling.tier2.upgraded` | Hall of Anubis | the upgraded dwelling of the Anubian Warden (tier 2) | concept-board crop |
| 2.1 | `town.egyptian.dwelling.tier3.base` | Ushabti Workshop | the dwelling of the Ushabti (tier 3) | concept-board crop |
| 2.2 | `town.egyptian.dwelling.tier3.upgraded` | Royal Tomb Workshop | the upgraded dwelling of the Royal Ushabti (tier 3) | concept-board crop |
| 2.3 | `town.egyptian.dwelling.tier4.base` | Sphinx Terrace | the dwelling of the Sphinx (tier 4) | concept-board crop |
| 2.4 | `town.egyptian.dwelling.tier4.upgraded` | Sphinx Bastion | the upgraded dwelling of the Great Sphinx (tier 4) | concept-board crop |
| 3.1 | `town.egyptian.dwelling.tier5.base` | Crocodile Pens | the dwelling of the Crocodile Beast (tier 5) | concept-board crop |
| 3.2 | `town.egyptian.dwelling.tier5.upgraded` | Temple of Sobek | the upgraded dwelling of the Sobek Warbeast (tier 5) | concept-board crop |
| 3.3 | `town.egyptian.dwelling.tier6.base` | Bennu Aerie | the dwelling of the Bennu (tier 6) | **stand-in crop (Falcon Aerie (base) — the board's level-4 dwelling, used for tier 6 (themed stand-in))** — paint the real one |
| 3.4 | `town.egyptian.dwelling.tier6.upgraded` | Radiant Aerie | the upgraded dwelling of the Radiant Bennu (tier 6) | **stand-in crop (Falcon Aerie (upgraded) — the board's level-4 dwelling, used for tier 6 (themed stand-in))** — paint the real one |
| 4.1 | `town.egyptian.dwelling.tier7.base` | Colossus Quarry | the dwelling of the Desert Colossus (tier 7) | concept-board crop |
| 4.2 | `town.egyptian.dwelling.tier7.upgraded` | Divine Foundry | the upgraded dwelling of the Divine Colossus (tier 7) | concept-board crop |

| Field | Value |
|---|---|
| Image | 1536 × 1536 px (or larger, same proportions) — 4 columns × 4 rows, cells 384 × 384; cells 4.3 and 4.4 *empty* |
| Background | Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). |
| Attach | `support images/ChatGPT Image Sep 29, 2026, 04_17_25 PM-3.png` (the town board — architecture and colours); `assets-source/sprites/sheets/sheet.town.egyptian.levels.png` (the delivered levels — match their finish); today’s crops `assets-runtime/placeholders/town/egyptian/dwelling.tier<N>.<base|upgraded>.png` (keep the ones that are not stand-ins) |
| Cuts into | `assets-source/art/final/town.egyptian.dwelling.tier<1–7>.<base|upgraded>.png` (14 files) |
| Then | `npm run sprites:cut -- --only sheet.town.egyptian.dwellings`, then `npm run art:import` |

```text
Paint one sheet of creature dwellings for the town of the fantasy strategy game Pantheon Realms (Egyptian town), in the style and architecture of the attached town board and the attached sheet of town buildings.
Image 1536 × 1536 px: an invisible grid of 4 columns × 4 rows of equal square cells. No grid lines, no labels, no numbers, no text. Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else).
Row 1, cell 1: Scarab Burrow — the dwelling of the Sacred Scarab (tier 1) (design it fresh; the attached crop shows another building).
Row 1, cell 2: Solar Burrow — the upgraded dwelling of the Solar Scarab (tier 1): the same building as the cell before, made grander (design it fresh; the attached crop shows another building).
Row 1, cell 3: Jackal Kennels — the dwelling of the Jackal Guardian (tier 2).
Row 1, cell 4: Hall of Anubis — the upgraded dwelling of the Anubian Warden (tier 2): the same building as the cell before, made grander.
Row 2, cell 1: Ushabti Workshop — the dwelling of the Ushabti (tier 3).
Row 2, cell 2: Royal Tomb Workshop — the upgraded dwelling of the Royal Ushabti (tier 3): the same building as the cell before, made grander.
Row 2, cell 3: Sphinx Terrace — the dwelling of the Sphinx (tier 4).
Row 2, cell 4: Sphinx Bastion — the upgraded dwelling of the Great Sphinx (tier 4): the same building as the cell before, made grander.
Row 3, cell 1: Crocodile Pens — the dwelling of the Crocodile Beast (tier 5).
Row 3, cell 2: Temple of Sobek — the upgraded dwelling of the Sobek Warbeast (tier 5): the same building as the cell before, made grander.
Row 3, cell 3: Bennu Aerie — the dwelling of the Bennu (tier 6) (design it fresh; the attached crop shows another building).
Row 3, cell 4: Radiant Aerie — the upgraded dwelling of the Radiant Bennu (tier 6): the same building as the cell before, made grander (design it fresh; the attached crop shows another building).
Row 4, cell 1: Colossus Quarry — the dwelling of the Desert Colossus (tier 7).
Row 4, cell 2: Divine Foundry — the upgraded dwelling of the Divine Colossus (tier 7): the same building as the cell before, made grander.
Row 4, cells 3–4: empty.
Each building alone, seen slightly from above in three-quarter view as on the town board, its base on an invisible ground line at 85 % of the cell height, centred; no ground, no rocks under it, no shadow, no sky. Each shows who lives there through its architecture (a statue, emblem, nest, stable or forge of that creature). Palette: sand gold, white linen, lapis blue and carnelian; sun discs, spread wings, broad collars.
```

### Japanese dwellings · `sheet.town.japanese.dwellings.png`

| Cell | Asset ID | Building | For | Today |
|---|---|---|---|---|
| 1.1 | `town.japanese.dwelling.tier1.base` | Kitsune Grove | the dwelling of the Kitsune (tier 1) | concept-board crop |
| 1.2 | `town.japanese.dwelling.tier1.upgraded` | Nine-Tail Shrine | the upgraded dwelling of the Nine-Tailed Kitsune (tier 1) | concept-board crop |
| 1.3 | `town.japanese.dwelling.tier2.base` | Kappa Pond | the dwelling of the Kappa (tier 2) | **stand-in crop (Archery Range (base) — the board's level-2 dwelling, used for tier 2 (themed stand-in))** — paint the real one |
| 1.4 | `town.japanese.dwelling.tier2.upgraded` | Elder's Pond | the upgraded dwelling of the River Elder Kappa (tier 2) | **stand-in crop (Archery Range (upgraded) — the board's level-2 dwelling, used for tier 2 (themed stand-in))** — paint the real one |
| 2.1 | `town.japanese.dwelling.tier3.base` | Tengu Nest | the dwelling of the Tengu (tier 3) | concept-board crop |
| 2.2 | `town.japanese.dwelling.tier3.upgraded` | Great Tengu Peak | the upgraded dwelling of the Great Tengu (tier 3) | concept-board crop |
| 2.3 | `town.japanese.dwelling.tier4.base` | Oni Quarry | the dwelling of the Oni (tier 4) | concept-board crop |
| 2.4 | `town.japanese.dwelling.tier4.upgraded` | Warlord's Fortress | the upgraded dwelling of the Oni Warlord (tier 4) | concept-board crop |
| 3.1 | `town.japanese.dwelling.tier5.base` | Spider Hollow | the dwelling of the Jorogumo (tier 5) | **stand-in crop (Ronin Barracks (base) — the board's level-1 dwelling, used for tier 5 (themed stand-in))** — paint the real one |
| 3.2 | `town.japanese.dwelling.tier5.upgraded` | Queen's Web | the upgraded dwelling of the Queen Jorogumo (tier 5) | **stand-in crop (Ronin Barracks (upgraded) — the board's level-1 dwelling, used for tier 5 (themed stand-in))** — paint the real one |
| 3.3 | `town.japanese.dwelling.tier6.base` | Kirin Pavilion | the dwelling of the Kirin (tier 6) | **stand-in crop (Phoenix Aerie (base) — the board's level-7 dwelling, used for tier 6 (themed stand-in))** — paint the real one |
| 3.4 | `town.japanese.dwelling.tier6.upgraded` | Celestial Pavilion | the upgraded dwelling of the Celestial Kirin (tier 6) | **stand-in crop (Phoenix Aerie (upgraded) — the board's level-7 dwelling, used for tier 6 (themed stand-in))** — paint the real one |
| 4.1 | `town.japanese.dwelling.tier7.base` | Orochi Sanctuary | the dwelling of the Orochi (tier 7) | concept-board crop |
| 4.2 | `town.japanese.dwelling.tier7.upgraded` | Imperial Sanctuary | the upgraded dwelling of the Imperial Orochi (tier 7) | concept-board crop |

| Field | Value |
|---|---|
| Image | 1536 × 1536 px (or larger, same proportions) — 4 columns × 4 rows, cells 384 × 384; cells 4.3 and 4.4 *empty* |
| Background | Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). |
| Attach | `support images/ChatGPT Image Sep 29, 2026, 04_17_27 PM-4.png` (the town board — architecture and colours); `assets-source/sprites/sheets/sheet.town.japanese.levels.png` (the delivered levels — match their finish); today’s crops `assets-runtime/placeholders/town/japanese/dwelling.tier<N>.<base|upgraded>.png` (keep the ones that are not stand-ins) |
| Cuts into | `assets-source/art/final/town.japanese.dwelling.tier<1–7>.<base|upgraded>.png` (14 files) |
| Then | `npm run sprites:cut -- --only sheet.town.japanese.dwellings`, then `npm run art:import` |

```text
Paint one sheet of creature dwellings for the town of the fantasy strategy game Pantheon Realms (Japanese town), in the style and architecture of the attached town board and the attached sheet of town buildings.
Image 1536 × 1536 px: an invisible grid of 4 columns × 4 rows of equal square cells. No grid lines, no labels, no numbers, no text. Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else).
Row 1, cell 1: Kitsune Grove — the dwelling of the Kitsune (tier 1).
Row 1, cell 2: Nine-Tail Shrine — the upgraded dwelling of the Nine-Tailed Kitsune (tier 1): the same building as the cell before, made grander.
Row 1, cell 3: Kappa Pond — the dwelling of the Kappa (tier 2) (design it fresh; the attached crop shows another building).
Row 1, cell 4: Elder's Pond — the upgraded dwelling of the River Elder Kappa (tier 2): the same building as the cell before, made grander (design it fresh; the attached crop shows another building).
Row 2, cell 1: Tengu Nest — the dwelling of the Tengu (tier 3).
Row 2, cell 2: Great Tengu Peak — the upgraded dwelling of the Great Tengu (tier 3): the same building as the cell before, made grander.
Row 2, cell 3: Oni Quarry — the dwelling of the Oni (tier 4).
Row 2, cell 4: Warlord's Fortress — the upgraded dwelling of the Oni Warlord (tier 4): the same building as the cell before, made grander.
Row 3, cell 1: Spider Hollow — the dwelling of the Jorogumo (tier 5) (design it fresh; the attached crop shows another building).
Row 3, cell 2: Queen's Web — the upgraded dwelling of the Queen Jorogumo (tier 5): the same building as the cell before, made grander (design it fresh; the attached crop shows another building).
Row 3, cell 3: Kirin Pavilion — the dwelling of the Kirin (tier 6) (design it fresh; the attached crop shows another building).
Row 3, cell 4: Celestial Pavilion — the upgraded dwelling of the Celestial Kirin (tier 6): the same building as the cell before, made grander (design it fresh; the attached crop shows another building).
Row 4, cell 1: Orochi Sanctuary — the dwelling of the Orochi (tier 7).
Row 4, cell 2: Imperial Sanctuary — the upgraded dwelling of the Imperial Orochi (tier 7): the same building as the cell before, made grander.
Row 4, cells 3–4: empty.
Each building alone, seen slightly from above in three-quarter view as on the town board, its base on an invisible ground line at 85 % of the cell height, centred; no ground, no rocks under it, no shadow, no sky. Each shows who lives there through its architecture (a statue, emblem, nest, stable or forge of that creature). Palette: vermilion, black lacquer and white with cherry pink and gold; clouds, waves, lacquered armour.
```

### Celtic dwellings · `sheet.town.celtic.dwellings.png`

| Cell | Asset ID | Building | For | Today |
|---|---|---|---|---|
| 1.1 | `town.celtic.dwelling.tier1.base` | Pooka Warren | the dwelling of the Pooka (tier 1) | **stand-in crop (Boar Clan (base) — the board's level-3 dwelling, used for tier 1 (themed stand-in))** — paint the real one |
| 1.2 | `town.celtic.dwelling.tier1.upgraded` | Elder Warren | the upgraded dwelling of the Elder Pooka (tier 1) | **stand-in crop (Boar Clan (upgraded) — the board's level-3 dwelling, used for tier 1 (themed stand-in))** — paint the real one |
| 1.3 | `town.celtic.dwelling.tier2.base` | Hound Kennel | the dwelling of the Cu Sith (tier 2) | concept-board crop |
| 1.4 | `town.celtic.dwelling.tier2.upgraded` | Great Hound Kennel | the upgraded dwelling of the Great Cu Sith (tier 2) | concept-board crop |
| 2.1 | `town.celtic.dwelling.tier3.base` | Kelpie Loch | the dwelling of the Kelpie (tier 3) | **stand-in crop (Staghorn Riders (base) — the board's level-6 dwelling, used for tier 3 (themed stand-in))** — paint the real one |
| 2.2 | `town.celtic.dwelling.tier3.upgraded` | Dread Loch | the upgraded dwelling of the Dread Kelpie (tier 3) | **stand-in crop (Staghorn Riders (upgraded) — the board's level-6 dwelling, used for tier 3 (themed stand-in))** — paint the real one |
| 2.3 | `town.celtic.dwelling.tier4.base` | Banshee Cairn | the dwelling of the Banshee (tier 4) | **stand-in crop (Bear Circle (base) — the board's level-4 dwelling, used for tier 4 (themed stand-in))** — paint the real one |
| 2.4 | `town.celtic.dwelling.tier4.upgraded` | Keening Cairn | the upgraded dwelling of the Battle Banshee (tier 4) | **stand-in crop (Bear Circle (upgraded) — the board's level-4 dwelling, used for tier 4 (themed stand-in))** — paint the real one |
| 3.1 | `town.celtic.dwelling.tier5.base` | Selkie Cove | the dwelling of the Selkie (tier 5) | **stand-in crop (Eagle Aerie (base) — the board's level-5 dwelling, used for tier 5 (themed stand-in))** — paint the real one |
| 3.2 | `town.celtic.dwelling.tier5.upgraded` | Storm Cove | the upgraded dwelling of the Storm Selkie (tier 5) | **stand-in crop (Eagle Aerie (upgraded) — the board's level-5 dwelling, used for tier 5 (themed stand-in))** — paint the real one |
| 3.3 | `town.celtic.dwelling.tier6.base` | Stag Grove | the dwelling of the Horned Stag Spirit (tier 6) | concept-board crop |
| 3.4 | `town.celtic.dwelling.tier6.upgraded` | Great Stag Grove | the upgraded dwelling of the Great Stag Spirit (tier 6) | concept-board crop |
| 4.1 | `town.celtic.dwelling.tier7.base` | Fomorian Hold | the dwelling of the Fomorian Giant (tier 7) | **stand-in crop (Ancient Entwives (base) — the board's level-7 dwelling, used for tier 7 (themed stand-in))** — paint the real one |
| 4.2 | `town.celtic.dwelling.tier7.upgraded` | Ancient Hold | the upgraded dwelling of the Ancient Fomorian (tier 7) | **stand-in crop (Ancient Entwives (upgraded) — the board's level-7 dwelling, used for tier 7 (themed stand-in))** — paint the real one |

| Field | Value |
|---|---|
| Image | 1536 × 1536 px (or larger, same proportions) — 4 columns × 4 rows, cells 384 × 384; cells 4.3 and 4.4 *empty* |
| Background | Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). |
| Attach | `support images/ChatGPT Image Sep 29, 2026, 04_17_35 PM-5.png` (the town board — architecture and colours); `assets-source/sprites/sheets/sheet.town.celtic.levels.png` (the delivered levels — match their finish); today’s crops `assets-runtime/placeholders/town/celtic/dwelling.tier<N>.<base|upgraded>.png` (keep the ones that are not stand-ins) |
| Cuts into | `assets-source/art/final/town.celtic.dwelling.tier<1–7>.<base|upgraded>.png` (14 files) |
| Then | `npm run sprites:cut -- --only sheet.town.celtic.dwellings`, then `npm run art:import` |

```text
Paint one sheet of creature dwellings for the town of the fantasy strategy game Pantheon Realms (Celtic town), in the style and architecture of the attached town board and the attached sheet of town buildings.
Image 1536 × 1536 px: an invisible grid of 4 columns × 4 rows of equal square cells. No grid lines, no labels, no numbers, no text. Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else).
Row 1, cell 1: Pooka Warren — the dwelling of the Pooka (tier 1) (design it fresh; the attached crop shows another building).
Row 1, cell 2: Elder Warren — the upgraded dwelling of the Elder Pooka (tier 1): the same building as the cell before, made grander (design it fresh; the attached crop shows another building).
Row 1, cell 3: Hound Kennel — the dwelling of the Cu Sith (tier 2).
Row 1, cell 4: Great Hound Kennel — the upgraded dwelling of the Great Cu Sith (tier 2): the same building as the cell before, made grander.
Row 2, cell 1: Kelpie Loch — the dwelling of the Kelpie (tier 3) (design it fresh; the attached crop shows another building).
Row 2, cell 2: Dread Loch — the upgraded dwelling of the Dread Kelpie (tier 3): the same building as the cell before, made grander (design it fresh; the attached crop shows another building).
Row 2, cell 3: Banshee Cairn — the dwelling of the Banshee (tier 4) (design it fresh; the attached crop shows another building).
Row 2, cell 4: Keening Cairn — the upgraded dwelling of the Battle Banshee (tier 4): the same building as the cell before, made grander (design it fresh; the attached crop shows another building).
Row 3, cell 1: Selkie Cove — the dwelling of the Selkie (tier 5) (design it fresh; the attached crop shows another building).
Row 3, cell 2: Storm Cove — the upgraded dwelling of the Storm Selkie (tier 5): the same building as the cell before, made grander (design it fresh; the attached crop shows another building).
Row 3, cell 3: Stag Grove — the dwelling of the Horned Stag Spirit (tier 6).
Row 3, cell 4: Great Stag Grove — the upgraded dwelling of the Great Stag Spirit (tier 6): the same building as the cell before, made grander.
Row 4, cell 1: Fomorian Hold — the dwelling of the Fomorian Giant (tier 7) (design it fresh; the attached crop shows another building).
Row 4, cell 2: Ancient Hold — the upgraded dwelling of the Ancient Fomorian (tier 7): the same building as the cell before, made grander (design it fresh; the attached crop shows another building).
Row 4, cells 3–4: empty.
Each building alone, seen slightly from above in three-quarter view as on the town board, its base on an invisible ground line at 85 % of the cell height, centred; no ground, no rocks under it, no shadow, no sky. Each shows who lives there through its architecture (a statue, emblem, nest, stable or forge of that creature). Palette: forest green and gold with grey stone, woad blue and heather; spirals, torcs, mist.
```

### Mesoamerican dwellings · `sheet.town.mesoamerican.dwellings.png`

| Cell | Asset ID | Building | For | Today |
|---|---|---|---|---|
| 1.1 | `town.mesoamerican.dwelling.tier1.base` | Serpent Nest | the dwelling of the Feathered Serpent (tier 1) | concept-board crop |
| 1.2 | `town.mesoamerican.dwelling.tier1.upgraded` | Celestial Nest | the upgraded dwelling of the Celestial Feathered Serpent (tier 1) | concept-board crop |
| 1.3 | `town.mesoamerican.dwelling.tier2.base` | Jaguar Prowl | the dwelling of the Jaguar Spirit (tier 2) | concept-board crop |
| 1.4 | `town.mesoamerican.dwelling.tier2.upgraded` | Sun Jaguar Temple | the upgraded dwelling of the Sun Jaguar (tier 2) | concept-board crop |
| 2.1 | `town.mesoamerican.dwelling.tier3.base` | Eagle Aerie | the dwelling of the Eagle Warrior Spirit (tier 3) | concept-board crop |
| 2.2 | `town.mesoamerican.dwelling.tier3.upgraded` | Solar Eagle House | the upgraded dwelling of the Solar Eagle Warrior (tier 3) | concept-board crop |
| 2.3 | `town.mesoamerican.dwelling.tier4.base` | Cenote Pool | the dwelling of the Cenote Crocodile (tier 4) | concept-board crop |
| 2.4 | `town.mesoamerican.dwelling.tier4.upgraded` | Temple Cenote | the upgraded dwelling of the Temple Crocodile (tier 4) | concept-board crop |
| 3.1 | `town.mesoamerican.dwelling.tier5.base` | Bat Cave | the dwelling of the Camazotz (tier 5) | **stand-in crop (Stag Grove (base) — the board's level-5 dwelling, used for tier 5 (themed stand-in))** — paint the real one |
| 3.2 | `town.mesoamerican.dwelling.tier5.upgraded` | Blood Moon Cave | the upgraded dwelling of the Blood Moon Camazotz (tier 5) | **stand-in crop (Stag Grove (upgraded) — the board's level-5 dwelling, used for tier 5 (themed stand-in))** — paint the real one |
| 3.3 | `town.mesoamerican.dwelling.tier6.base` | Fire Serpent Sanctum | the dwelling of the Xiuhcoatl (tier 6) | concept-board crop |
| 3.4 | `town.mesoamerican.dwelling.tier6.upgraded` | Divine Sanctum | the upgraded dwelling of the Divine Xiuhcoatl (tier 6) | concept-board crop |
| 4.1 | `town.mesoamerican.dwelling.tier7.base` | Colossus Quarry | the dwelling of the Stone Colossus (tier 7) | **stand-in crop (Warrior Altar (base) — the board's level-4 dwelling, used for tier 7 (themed stand-in))** — paint the real one |
| 4.2 | `town.mesoamerican.dwelling.tier7.upgraded` | Sun Colossus Altar | the upgraded dwelling of the Sun Colossus (tier 7) | **stand-in crop (Warrior Altar (upgraded) — the board's level-4 dwelling, used for tier 7 (themed stand-in))** — paint the real one |

| Field | Value |
|---|---|
| Image | 1536 × 1536 px (or larger, same proportions) — 4 columns × 4 rows, cells 384 × 384; cells 4.3 and 4.4 *empty* |
| Background | Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). |
| Attach | `support images/ChatGPT Image Sep 29, 2026, 04_17_37 PM-6.png` (the town board — architecture and colours); `assets-source/sprites/sheets/sheet.town.mesoamerican.levels.png` (the delivered levels — match their finish); today’s crops `assets-runtime/placeholders/town/mesoamerican/dwelling.tier<N>.<base|upgraded>.png` (keep the ones that are not stand-ins) |
| Cuts into | `assets-source/art/final/town.mesoamerican.dwelling.tier<1–7>.<base|upgraded>.png` (14 files) |
| Then | `npm run sprites:cut -- --only sheet.town.mesoamerican.dwellings`, then `npm run art:import` |

```text
Paint one sheet of creature dwellings for the town of the fantasy strategy game Pantheon Realms (Mesoamerican town), in the style and architecture of the attached town board and the attached sheet of town buildings.
Image 1536 × 1536 px: an invisible grid of 4 columns × 4 rows of equal square cells. No grid lines, no labels, no numbers, no text. Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else).
Row 1, cell 1: Serpent Nest — the dwelling of the Feathered Serpent (tier 1).
Row 1, cell 2: Celestial Nest — the upgraded dwelling of the Celestial Feathered Serpent (tier 1): the same building as the cell before, made grander.
Row 1, cell 3: Jaguar Prowl — the dwelling of the Jaguar Spirit (tier 2).
Row 1, cell 4: Sun Jaguar Temple — the upgraded dwelling of the Sun Jaguar (tier 2): the same building as the cell before, made grander.
Row 2, cell 1: Eagle Aerie — the dwelling of the Eagle Warrior Spirit (tier 3).
Row 2, cell 2: Solar Eagle House — the upgraded dwelling of the Solar Eagle Warrior (tier 3): the same building as the cell before, made grander.
Row 2, cell 3: Cenote Pool — the dwelling of the Cenote Crocodile (tier 4).
Row 2, cell 4: Temple Cenote — the upgraded dwelling of the Temple Crocodile (tier 4): the same building as the cell before, made grander.
Row 3, cell 1: Bat Cave — the dwelling of the Camazotz (tier 5) (design it fresh; the attached crop shows another building).
Row 3, cell 2: Blood Moon Cave — the upgraded dwelling of the Blood Moon Camazotz (tier 5): the same building as the cell before, made grander (design it fresh; the attached crop shows another building).
Row 3, cell 3: Fire Serpent Sanctum — the dwelling of the Xiuhcoatl (tier 6).
Row 3, cell 4: Divine Sanctum — the upgraded dwelling of the Divine Xiuhcoatl (tier 6): the same building as the cell before, made grander.
Row 4, cell 1: Colossus Quarry — the dwelling of the Stone Colossus (tier 7) (design it fresh; the attached crop shows another building).
Row 4, cell 2: Sun Colossus Altar — the upgraded dwelling of the Sun Colossus (tier 7): the same building as the cell before, made grander (design it fresh; the attached crop shows another building).
Row 4, cells 3–4: empty.
Each building alone, seen slightly from above in three-quarter view as on the town board, its base on an invisible ground line at 85 % of the cell height, centred; no ground, no rocks under it, no shadow, no sky. Each shows who lives there through its architecture (a statue, emblem, nest, stable or forge of that creature). Palette: turquoise and crimson with jade and gold; quetzal feathers, step-fret patterns, jade.
```

## Part B — Town services (one level each)

Seven locations of every town have a single level and still show a crop of the concept board (on its ground, edges cut). They become cutouts like the Brief 10 levels. The Civic Hall, Temple, Mage Guild and Fortifications are already delivered (Brief 10).

Each sheet: **1536 × 768 px**, 4 columns × 2 rows of square cells (384 × 384), the last cell *empty*. Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). Same camera, ground line (85 %) and finish as Part A; no ground, no shadow, no sky.

### Greek services · `sheet.town.greek.services.png`

| Cell | Asset ID | Building | What it does | Today |
|---|---|---|---|---|
| 1.1 | `town.greek.support.tavern.l1` | Tavern | Hire eligible heroes. Prerequisite for the Town Hall. | concept-board crop |
| 1.2 | `town.greek.support.marketplace.l1` | Marketplace | Sell resources for Gold or buy them with Gold. | concept-board crop |
| 1.3 | `town.greek.support.resource_depot.l1` | Resource Depot | +1 Wood and +1 Stone per day. | concept-board crop |
| 1.4 | `town.greek.support.workshop.l1` | Workshop | Military prerequisite (Training Court, City Hall). Sells four tier-1 items each week where the scenario has them; each one once a week. | concept-board crop |
| 2.1 | `town.greek.support.training_academy.l1` | Training Academy | Once per week, each visiting hero may train: 1,000 Gold for 500 experience. | concept-board crop |
| 2.2 | `town.greek.support.watchtower.l1` | Watchtower | The town sees 8 hexes around it (3 without a Watchtower). | concept-board crop |
| 2.3 | `town.greek.support.artifact_merchant.l1` | Artifact Merchant | Sells four artifacts to visiting heroes; the stock changes every week. | concept-board crop |

| Field | Value |
|---|---|
| Image | 1536 × 768 px (or larger, same proportions) — 4 columns × 2 rows, cells 384 × 384; cell 2.4 *empty* |
| Background | Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). |
| Attach | `support images/ChatGPT Image Sep 29, 2026, 04_17_21 PM-1.png`; `assets-source/sprites/sheets/sheet.town.greek.levels.png`; today’s crops `assets-runtime/placeholders/town/greek/support.<location>.png` (keep their architecture) |
| Cuts into | `town.greek.support.tavern.l1.png`, `town.greek.support.marketplace.l1.png`, `town.greek.support.resource_depot.l1.png`, `town.greek.support.workshop.l1.png`, `town.greek.support.training_academy.l1.png`, `town.greek.support.watchtower.l1.png`, `town.greek.support.artifact_merchant.l1.png` |
| Then | `npm run sprites:cut -- --only sheet.town.greek.services`, then `npm run art:import` |

```text
Paint one sheet of town buildings for the fantasy strategy game Pantheon Realms (Greek town), in the style and architecture of the attached town board and the attached sheet of town buildings.
Image 1536 × 768 px: an invisible grid of 4 columns × 2 rows of equal square cells. No grid lines, no labels, no numbers, no text. Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else).
Row 1, cell 1: Tavern — Hire eligible heroes. Prerequisite for the Town Hall; keep the architecture of the attached crop of this building.
Row 1, cell 2: Marketplace — Sell resources for Gold or buy them with Gold; keep the architecture of the attached crop of this building.
Row 1, cell 3: Resource Depot — +1 Wood and +1 Stone per day; keep the architecture of the attached crop of this building.
Row 1, cell 4: Workshop — Military prerequisite (Training Court, City Hall). Sells four tier-1 items each week where the scenario has them; each one once a week; keep the architecture of the attached crop of this building.
Row 2, cell 1: Training Academy — Once per week, each visiting hero may train: 1,000 Gold for 500 experience; keep the architecture of the attached crop of this building.
Row 2, cell 2: Watchtower — The town sees 8 hexes around it (3 without a Watchtower); keep the architecture of the attached crop of this building.
Row 2, cell 3: Artifact Merchant — Sells four artifacts to visiting heroes; the stock changes every week; keep the architecture of the attached crop of this building.
Row 2, cell 4: empty.
Each building alone, seen slightly from above in three-quarter view as on the town board, its base on an invisible ground line at 85 % of the cell height, centred; no ground, no rocks under it, no shadow, no sky. Palette: royal blue, white marble and gold; laurel, meander borders, bronze.
```

### Norse services · `sheet.town.norse.services.png`

| Cell | Asset ID | Building | What it does | Today |
|---|---|---|---|---|
| 1.1 | `town.norse.support.tavern.l1` | Mead Hall | Hire eligible heroes. Prerequisite for the Jarl’s Hall. | concept-board crop |
| 1.2 | `town.norse.support.marketplace.l1` | Trading Post | Sell resources for Gold or buy them with Gold. | concept-board crop |
| 1.3 | `town.norse.support.resource_depot.l1` | Storehouse | +1 Wood and +1 Stone per day. | concept-board crop |
| 1.4 | `town.norse.support.workshop.l1` | Workshop | Military prerequisite (Valkyrie Aerie, High Hall). Sells four tier-1 items each week where the scenario has them; each one once a week. | concept-board crop |
| 2.1 | `town.norse.support.training_academy.l1` | Training Ground | Once per week, each visiting hero may train: 1,000 Gold for 500 experience. | concept-board crop |
| 2.2 | `town.norse.support.watchtower.l1` | Watchtower | The town sees 8 hexes around it (3 without a Watchtower). | concept-board crop |
| 2.3 | `town.norse.support.artifact_merchant.l1` | Rune Merchant | Sells four artifacts to visiting heroes; the stock changes every week. | concept-board crop |

| Field | Value |
|---|---|
| Image | 1536 × 768 px (or larger, same proportions) — 4 columns × 2 rows, cells 384 × 384; cell 2.4 *empty* |
| Background | Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). |
| Attach | `support images/ChatGPT Image Sep 29, 2026, 04_17_23 PM-2.png`; `assets-source/sprites/sheets/sheet.town.norse.levels.png`; today’s crops `assets-runtime/placeholders/town/norse/support.<location>.png` (keep their architecture) |
| Cuts into | `town.norse.support.tavern.l1.png`, `town.norse.support.marketplace.l1.png`, `town.norse.support.resource_depot.l1.png`, `town.norse.support.workshop.l1.png`, `town.norse.support.training_academy.l1.png`, `town.norse.support.watchtower.l1.png`, `town.norse.support.artifact_merchant.l1.png` |
| Then | `npm run sprites:cut -- --only sheet.town.norse.services`, then `npm run art:import` |

```text
Paint one sheet of town buildings for the fantasy strategy game Pantheon Realms (Norse town), in the style and architecture of the attached town board and the attached sheet of town buildings.
Image 1536 × 768 px: an invisible grid of 4 columns × 2 rows of equal square cells. No grid lines, no labels, no numbers, no text. Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else).
Row 1, cell 1: Mead Hall — Hire eligible heroes. Prerequisite for the Jarl’s Hall; keep the architecture of the attached crop of this building.
Row 1, cell 2: Trading Post — Sell resources for Gold or buy them with Gold; keep the architecture of the attached crop of this building.
Row 1, cell 3: Storehouse — +1 Wood and +1 Stone per day; keep the architecture of the attached crop of this building.
Row 1, cell 4: Workshop — Military prerequisite (Valkyrie Aerie, High Hall). Sells four tier-1 items each week where the scenario has them; each one once a week; keep the architecture of the attached crop of this building.
Row 2, cell 1: Training Ground — Once per week, each visiting hero may train: 1,000 Gold for 500 experience; keep the architecture of the attached crop of this building.
Row 2, cell 2: Watchtower — The town sees 8 hexes around it (3 without a Watchtower); keep the architecture of the attached crop of this building.
Row 2, cell 3: Rune Merchant — Sells four artifacts to visiting heroes; the stock changes every week; keep the architecture of the attached crop of this building.
Row 2, cell 4: empty.
Each building alone, seen slightly from above in three-quarter view as on the town board, its base on an invisible ground line at 85 % of the cell height, centred; no ground, no rocks under it, no shadow, no sky. Palette: night navy, steel silver, fur browns and ember orange; knotwork, ravens, snow.
```

### Egyptian services · `sheet.town.egyptian.services.png`

| Cell | Asset ID | Building | What it does | Today |
|---|---|---|---|---|
| 1.1 | `town.egyptian.support.tavern.l1` | Caravan House | Hire eligible heroes. Prerequisite for the Governor's Palace. | concept-board crop |
| 1.2 | `town.egyptian.support.marketplace.l1` | Bazaar | Sell resources for Gold or buy them with Gold. | concept-board crop |
| 1.3 | `town.egyptian.support.resource_depot.l1` | Granary | +1 Wood and +1 Stone per day. | concept-board crop |
| 1.4 | `town.egyptian.support.workshop.l1` | Workshop | Military prerequisite (Sphinx Terrace, Vizier's Palace). Sells four tier-1 items each week where the scenario has them; each one once a week. | concept-board crop |
| 2.1 | `town.egyptian.support.training_academy.l1` | Training Grounds | Once per week, each visiting hero may train: 1,000 Gold for 500 experience. | concept-board crop |
| 2.2 | `town.egyptian.support.watchtower.l1` | Obelisk Watch | The town sees 8 hexes around it (3 without a Watchtower). | concept-board crop |
| 2.3 | `town.egyptian.support.artifact_merchant.l1` | Treasury Merchant | Sells four artifacts to visiting heroes; the stock changes every week. | concept-board crop |

| Field | Value |
|---|---|
| Image | 1536 × 768 px (or larger, same proportions) — 4 columns × 2 rows, cells 384 × 384; cell 2.4 *empty* |
| Background | Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). |
| Attach | `support images/ChatGPT Image Sep 29, 2026, 04_17_25 PM-3.png`; `assets-source/sprites/sheets/sheet.town.egyptian.levels.png`; today’s crops `assets-runtime/placeholders/town/egyptian/support.<location>.png` (keep their architecture) |
| Cuts into | `town.egyptian.support.tavern.l1.png`, `town.egyptian.support.marketplace.l1.png`, `town.egyptian.support.resource_depot.l1.png`, `town.egyptian.support.workshop.l1.png`, `town.egyptian.support.training_academy.l1.png`, `town.egyptian.support.watchtower.l1.png`, `town.egyptian.support.artifact_merchant.l1.png` |
| Then | `npm run sprites:cut -- --only sheet.town.egyptian.services`, then `npm run art:import` |

```text
Paint one sheet of town buildings for the fantasy strategy game Pantheon Realms (Egyptian town), in the style and architecture of the attached town board and the attached sheet of town buildings.
Image 1536 × 768 px: an invisible grid of 4 columns × 2 rows of equal square cells. No grid lines, no labels, no numbers, no text. Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else).
Row 1, cell 1: Caravan House — Hire eligible heroes. Prerequisite for the Governor's Palace; keep the architecture of the attached crop of this building.
Row 1, cell 2: Bazaar — Sell resources for Gold or buy them with Gold; keep the architecture of the attached crop of this building.
Row 1, cell 3: Granary — +1 Wood and +1 Stone per day; keep the architecture of the attached crop of this building.
Row 1, cell 4: Workshop — Military prerequisite (Sphinx Terrace, Vizier's Palace). Sells four tier-1 items each week where the scenario has them; each one once a week; keep the architecture of the attached crop of this building.
Row 2, cell 1: Training Grounds — Once per week, each visiting hero may train: 1,000 Gold for 500 experience; keep the architecture of the attached crop of this building.
Row 2, cell 2: Obelisk Watch — The town sees 8 hexes around it (3 without a Watchtower); keep the architecture of the attached crop of this building.
Row 2, cell 3: Treasury Merchant — Sells four artifacts to visiting heroes; the stock changes every week; keep the architecture of the attached crop of this building.
Row 2, cell 4: empty.
Each building alone, seen slightly from above in three-quarter view as on the town board, its base on an invisible ground line at 85 % of the cell height, centred; no ground, no rocks under it, no shadow, no sky. Palette: sand gold, white linen, lapis blue and carnelian; sun discs, spread wings, broad collars.
```

### Japanese services · `sheet.town.japanese.services.png`

| Cell | Asset ID | Building | What it does | Today |
|---|---|---|---|---|
| 1.1 | `town.japanese.support.tavern.l1` | Teahouse | Hire eligible heroes. Prerequisite for the Magistrate's Hall. | concept-board crop |
| 1.2 | `town.japanese.support.marketplace.l1` | Market Street | Sell resources for Gold or buy them with Gold. | concept-board crop |
| 1.3 | `town.japanese.support.resource_depot.l1` | Storehouse | +1 Wood and +1 Stone per day. | concept-board crop |
| 1.4 | `town.japanese.support.workshop.l1` | Workshop | Military prerequisite (Oni Quarry, Daimyo's Hall). Sells four tier-1 items each week where the scenario has them; each one once a week. | concept-board crop |
| 2.1 | `town.japanese.support.training_academy.l1` | Dojo | Once per week, each visiting hero may train: 1,000 Gold for 500 experience. | concept-board crop |
| 2.2 | `town.japanese.support.watchtower.l1` | Watch Pagoda | The town sees 8 hexes around it (3 without a Watchtower). | concept-board crop |
| 2.3 | `town.japanese.support.artifact_merchant.l1` | Curio Shop | Sells four artifacts to visiting heroes; the stock changes every week. | concept-board crop |

| Field | Value |
|---|---|
| Image | 1536 × 768 px (or larger, same proportions) — 4 columns × 2 rows, cells 384 × 384; cell 2.4 *empty* |
| Background | Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). |
| Attach | `support images/ChatGPT Image Sep 29, 2026, 04_17_27 PM-4.png`; `assets-source/sprites/sheets/sheet.town.japanese.levels.png`; today’s crops `assets-runtime/placeholders/town/japanese/support.<location>.png` (keep their architecture) |
| Cuts into | `town.japanese.support.tavern.l1.png`, `town.japanese.support.marketplace.l1.png`, `town.japanese.support.resource_depot.l1.png`, `town.japanese.support.workshop.l1.png`, `town.japanese.support.training_academy.l1.png`, `town.japanese.support.watchtower.l1.png`, `town.japanese.support.artifact_merchant.l1.png` |
| Then | `npm run sprites:cut -- --only sheet.town.japanese.services`, then `npm run art:import` |

```text
Paint one sheet of town buildings for the fantasy strategy game Pantheon Realms (Japanese town), in the style and architecture of the attached town board and the attached sheet of town buildings.
Image 1536 × 768 px: an invisible grid of 4 columns × 2 rows of equal square cells. No grid lines, no labels, no numbers, no text. Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else).
Row 1, cell 1: Teahouse — Hire eligible heroes. Prerequisite for the Magistrate's Hall; keep the architecture of the attached crop of this building.
Row 1, cell 2: Market Street — Sell resources for Gold or buy them with Gold; keep the architecture of the attached crop of this building.
Row 1, cell 3: Storehouse — +1 Wood and +1 Stone per day; keep the architecture of the attached crop of this building.
Row 1, cell 4: Workshop — Military prerequisite (Oni Quarry, Daimyo's Hall). Sells four tier-1 items each week where the scenario has them; each one once a week; keep the architecture of the attached crop of this building.
Row 2, cell 1: Dojo — Once per week, each visiting hero may train: 1,000 Gold for 500 experience; keep the architecture of the attached crop of this building.
Row 2, cell 2: Watch Pagoda — The town sees 8 hexes around it (3 without a Watchtower); keep the architecture of the attached crop of this building.
Row 2, cell 3: Curio Shop — Sells four artifacts to visiting heroes; the stock changes every week; keep the architecture of the attached crop of this building.
Row 2, cell 4: empty.
Each building alone, seen slightly from above in three-quarter view as on the town board, its base on an invisible ground line at 85 % of the cell height, centred; no ground, no rocks under it, no shadow, no sky. Palette: vermilion, black lacquer and white with cherry pink and gold; clouds, waves, lacquered armour.
```

### Celtic services · `sheet.town.celtic.services.png`

| Cell | Asset ID | Building | What it does | Today |
|---|---|---|---|---|
| 1.1 | `town.celtic.support.tavern.l1` | Mead House | Hire eligible heroes. Prerequisite for the Chieftain's Hall. | concept-board crop |
| 1.2 | `town.celtic.support.marketplace.l1` | Fair Green | Sell resources for Gold or buy them with Gold. | concept-board crop |
| 1.3 | `town.celtic.support.resource_depot.l1` | Stores | +1 Wood and +1 Stone per day. | concept-board crop |
| 1.4 | `town.celtic.support.workshop.l1` | Workshop | Military prerequisite (Banshee Cairn, High King's Hall). Sells four tier-1 items each week where the scenario has them; each one once a week. | concept-board crop |
| 2.1 | `town.celtic.support.training_academy.l1` | Fianna Camp | Once per week, each visiting hero may train: 1,000 Gold for 500 experience. | concept-board crop |
| 2.2 | `town.celtic.support.watchtower.l1` | Beacon Hill | The town sees 8 hexes around it (3 without a Watchtower). | concept-board crop |
| 2.3 | `town.celtic.support.artifact_merchant.l1` | Torc Trader | Sells four artifacts to visiting heroes; the stock changes every week. | concept-board crop |

| Field | Value |
|---|---|
| Image | 1536 × 768 px (or larger, same proportions) — 4 columns × 2 rows, cells 384 × 384; cell 2.4 *empty* |
| Background | Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). |
| Attach | `support images/ChatGPT Image Sep 29, 2026, 04_17_35 PM-5.png`; `assets-source/sprites/sheets/sheet.town.celtic.levels.png`; today’s crops `assets-runtime/placeholders/town/celtic/support.<location>.png` (keep their architecture) |
| Cuts into | `town.celtic.support.tavern.l1.png`, `town.celtic.support.marketplace.l1.png`, `town.celtic.support.resource_depot.l1.png`, `town.celtic.support.workshop.l1.png`, `town.celtic.support.training_academy.l1.png`, `town.celtic.support.watchtower.l1.png`, `town.celtic.support.artifact_merchant.l1.png` |
| Then | `npm run sprites:cut -- --only sheet.town.celtic.services`, then `npm run art:import` |

```text
Paint one sheet of town buildings for the fantasy strategy game Pantheon Realms (Celtic town), in the style and architecture of the attached town board and the attached sheet of town buildings.
Image 1536 × 768 px: an invisible grid of 4 columns × 2 rows of equal square cells. No grid lines, no labels, no numbers, no text. Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else).
Row 1, cell 1: Mead House — Hire eligible heroes. Prerequisite for the Chieftain's Hall; keep the architecture of the attached crop of this building.
Row 1, cell 2: Fair Green — Sell resources for Gold or buy them with Gold; keep the architecture of the attached crop of this building.
Row 1, cell 3: Stores — +1 Wood and +1 Stone per day; keep the architecture of the attached crop of this building.
Row 1, cell 4: Workshop — Military prerequisite (Banshee Cairn, High King's Hall). Sells four tier-1 items each week where the scenario has them; each one once a week; keep the architecture of the attached crop of this building.
Row 2, cell 1: Fianna Camp — Once per week, each visiting hero may train: 1,000 Gold for 500 experience; keep the architecture of the attached crop of this building.
Row 2, cell 2: Beacon Hill — The town sees 8 hexes around it (3 without a Watchtower); keep the architecture of the attached crop of this building.
Row 2, cell 3: Torc Trader — Sells four artifacts to visiting heroes; the stock changes every week; keep the architecture of the attached crop of this building.
Row 2, cell 4: empty.
Each building alone, seen slightly from above in three-quarter view as on the town board, its base on an invisible ground line at 85 % of the cell height, centred; no ground, no rocks under it, no shadow, no sky. Palette: forest green and gold with grey stone, woad blue and heather; spirals, torcs, mist.
```

### Mesoamerican services · `sheet.town.mesoamerican.services.png`

| Cell | Asset ID | Building | What it does | Today |
|---|---|---|---|---|
| 1.1 | `town.mesoamerican.support.tavern.l1` | Traveller's House | Hire eligible heroes. Prerequisite for the Tecpan. | concept-board crop |
| 1.2 | `town.mesoamerican.support.marketplace.l1` | Tianguis Market | Sell resources for Gold or buy them with Gold. | concept-board crop |
| 1.3 | `town.mesoamerican.support.resource_depot.l1` | Storehouse | +1 Wood and +1 Stone per day. | concept-board crop |
| 1.4 | `town.mesoamerican.support.workshop.l1` | Workshop | Military prerequisite (Cenote Pool, Great Palace). Sells four tier-1 items each week where the scenario has them; each one once a week. | concept-board crop |
| 2.1 | `town.mesoamerican.support.training_academy.l1` | Warrior House | Once per week, each visiting hero may train: 1,000 Gold for 500 experience. | concept-board crop |
| 2.2 | `town.mesoamerican.support.watchtower.l1` | Observatory | The town sees 8 hexes around it (3 without a Watchtower). | concept-board crop |
| 2.3 | `town.mesoamerican.support.artifact_merchant.l1` | Jade Merchant | Sells four artifacts to visiting heroes; the stock changes every week. | concept-board crop |

| Field | Value |
|---|---|
| Image | 1536 × 768 px (or larger, same proportions) — 4 columns × 2 rows, cells 384 × 384; cell 2.4 *empty* |
| Background | Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). |
| Attach | `support images/ChatGPT Image Sep 29, 2026, 04_17_37 PM-6.png`; `assets-source/sprites/sheets/sheet.town.mesoamerican.levels.png`; today’s crops `assets-runtime/placeholders/town/mesoamerican/support.<location>.png` (keep their architecture) |
| Cuts into | `town.mesoamerican.support.tavern.l1.png`, `town.mesoamerican.support.marketplace.l1.png`, `town.mesoamerican.support.resource_depot.l1.png`, `town.mesoamerican.support.workshop.l1.png`, `town.mesoamerican.support.training_academy.l1.png`, `town.mesoamerican.support.watchtower.l1.png`, `town.mesoamerican.support.artifact_merchant.l1.png` |
| Then | `npm run sprites:cut -- --only sheet.town.mesoamerican.services`, then `npm run art:import` |

```text
Paint one sheet of town buildings for the fantasy strategy game Pantheon Realms (Mesoamerican town), in the style and architecture of the attached town board and the attached sheet of town buildings.
Image 1536 × 768 px: an invisible grid of 4 columns × 2 rows of equal square cells. No grid lines, no labels, no numbers, no text. Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else).
Row 1, cell 1: Traveller's House — Hire eligible heroes. Prerequisite for the Tecpan; keep the architecture of the attached crop of this building.
Row 1, cell 2: Tianguis Market — Sell resources for Gold or buy them with Gold; keep the architecture of the attached crop of this building.
Row 1, cell 3: Storehouse — +1 Wood and +1 Stone per day; keep the architecture of the attached crop of this building.
Row 1, cell 4: Workshop — Military prerequisite (Cenote Pool, Great Palace). Sells four tier-1 items each week where the scenario has them; each one once a week; keep the architecture of the attached crop of this building.
Row 2, cell 1: Warrior House — Once per week, each visiting hero may train: 1,000 Gold for 500 experience; keep the architecture of the attached crop of this building.
Row 2, cell 2: Observatory — The town sees 8 hexes around it (3 without a Watchtower); keep the architecture of the attached crop of this building.
Row 2, cell 3: Jade Merchant — Sells four artifacts to visiting heroes; the stock changes every week; keep the architecture of the attached crop of this building.
Row 2, cell 4: empty.
Each building alone, seen slightly from above in three-quarter view as on the town board, its base on an invisible ground line at 85 % of the cell height, centred; no ground, no rocks under it, no shadow, no sky. Palette: turquoise and crimson with jade and gold; quetzal feathers, step-fret patterns, jade.
```

## Part C — Climate icons

### Climate icons · `sheet.icons.climate.png`

The climate rules (skirmish option, new on 2026-10-04) change every battle a little on some map climates — fog shortens shots, sand slows the ground troops, storms keep flyers low. The battle shows a chip with the weather’s name and this icon; the encounter dialog shows it too. One icon per climate rule; each must read as its weather at 20 px.

| Cell | Asset ID | Name | Draw |
|---|---|---|---|
| 1.1 | `icon.climate.autumn` | Harvest wind (autumn) <sub>every flying creature has +1 Speed in battle.</sub> | a gust of wind drawn as a curling golden stream carrying three red-gold leaves and one long feather |
| 1.2 | `icon.climate.coast` | Salt spray (coast) <sub>every shooter’s range is 3 hexes shorter in battle.</sub> | a breaking sea wave throwing white spray over a single arrow that falls short |
| 1.3 | `icon.climate.desert` | Scorching sand (desert) <sub>every creature without Flight has −1 Speed in battle.</sub> | a blazing white-gold sun over two rippled sand dunes, a faint heat shimmer between them |
| 2.1 | `icon.climate.fjord` | Icy spray (fjord) <sub>every creature has −1 Defense in battle.</sub> | a jagged blue-white ice shard with frozen droplets around it and frost creeping over a round shield rim |
| 2.2 | `icon.climate.high_pass` | Thin air (high pass) <sub>every shooter’s range is 2 hexes longer and every flying creature has −1 Speed in battle.</sub> | a snowy mountain peak with thin cloud wisps and an arrow flying high above it |
| 2.3 | `icon.climate.jungle` | Dense canopy (jungle) <sub>every shooter’s range is 4 hexes shorter and every flying creature has −1 Speed in battle.</sub> | broad dark-green jungle leaves and hanging vines closing over like a roof |
| 3.1 | `icon.climate.moor` | Fog (moor) <sub>every shooter’s range is 6 hexes shorter in battle.</sub> | a pale grey bank of fog swallowing the lower half of a lone standing stone |
| 3.2 | `icon.climate.storm_plateau` | Thunderstorm (storm plateau) <sub>every flying creature has −2 Speed in battle.</sub> | a dark thundercloud with one bright lightning bolt and slanting rain |
| 3.3 | `icon.climate.tundra` | Biting cold (tundra) <sub>every creature has −1 Attack in battle.</sub> | a large six-pointed snowflake crystal in front of a frosted sword hilt |

| Field | Value |
|---|---|
| Image | 768 × 768 px (or larger, same proportions) — 3 columns × 3 rows, cells 256 × 256 |
| Background | Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). |
| Attach | `assets-runtime/ui/icons/res.favor.png`, `assets-runtime/ui/icons/attr.attack.png` (the icon style to match) |
| Shown | Battle (round box chip), encounter dialog |
| Cuts into | `assets-source/icons/final/<asset ID>.png` (9 files); the importer makes them 128 × 128 px |
| Then | `npm run sprites:cut -- --only sheet.icons.climate`, then `npm run icons:import` |

```text
Paint one sheet of game icons for the fantasy strategy game Pantheon Realms, in the style of the attached icons: a single object per icon, rich painted colours with a soft rim light, slightly three-quarter view, a crisp silhouette readable at 24 px.
Image 768 × 768 px: an invisible grid of 3 columns × 3 rows of equal square cells. Each icon centred in its cell, filling about 75 % of it. No grid lines, no labels, no numbers, no letters, no text. Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else).
Row 1, cell 1: a gust of wind drawn as a curling golden stream carrying three red-gold leaves and one long feather.
Row 1, cell 2: a breaking sea wave throwing white spray over a single arrow that falls short.
Row 1, cell 3: a blazing white-gold sun over two rippled sand dunes, a faint heat shimmer between them.
Row 2, cell 1: a jagged blue-white ice shard with frozen droplets around it and frost creeping over a round shield rim.
Row 2, cell 2: a snowy mountain peak with thin cloud wisps and an arrow flying high above it.
Row 2, cell 3: broad dark-green jungle leaves and hanging vines closing over like a roof.
Row 3, cell 1: a pale grey bank of fog swallowing the lower half of a lone standing stone.
Row 3, cell 2: a dark thundercloud with one bright lightning bolt and slanting rain.
Row 3, cell 3: a large six-pointed snowflake crystal in front of a frosted sword hilt.
```

## Part D — Map markers of the random-map sites

### Site markers · `sheet.icons.sitemarkers.png`

The tile panel of the adventure map and the Journal show a marker for each site. The eight sites added for random maps borrow the nearest older marker (a learning stone shows the story marker, a prison the hero marker). The key tent and key gate are tinted by the key’s colour in the game: paint them in light neutral colours.

| Cell | Asset ID | Name | Draw |
|---|---|---|---|
| 1.1 | `icon.marker.learning-stone` | Learning stone | A carved standing stone with a glowing rune |
| 1.2 | `icon.marker.spell-shrine` | Spell shrine | A small open shrine with a floating spell scroll |
| 1.3 | `icon.marker.skill-trainer` | Skill trainer | A training post with crossed practice staves |
| 1.4 | `icon.marker.quest-hut` | Quest hut | A thatched hut with a hanging notice scroll |
| 2.1 | `icon.marker.key-tent` | Key tent | A small pointed tent with a key on its flap; light neutral colours so it can be tinted |
| 2.2 | `icon.marker.key-gate` | Key gate | A barred gate with a keyhole seal; light neutral colours so it can be tinted |
| 2.3 | `icon.marker.windmill` | Windmill | A small windmill with a sack at its door |
| 2.4 | `icon.marker.prison` | Prison | A stone cell door with iron bars |

| Field | Value |
|---|---|
| Image | 1024 × 512 px (or larger, same proportions) — 4 columns × 2 rows, cells 256 × 256 |
| Background | Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). |
| Attach | `assets-runtime/ui/icons/marker.mine.png` and two other markers from `assets-runtime/ui/icons/` (the marker style to match) |
| Shown | Adventure map tile panel, Journal |
| Cuts into | `assets-source/icons/final/<asset ID>.png` (8 files); the importer makes them 96 × 96 px |
| Then | `npm run sprites:cut -- --only sheet.icons.sitemarkers`, then `npm run icons:import` |

```text
Paint one sheet of game icons for the fantasy strategy game Pantheon Realms, in the style of the attached icons: a single object per icon, rich painted colours with a soft rim light, slightly three-quarter view, a crisp silhouette readable at 24 px.
Image 1024 × 512 px: an invisible grid of 4 columns × 2 rows of equal square cells. Each icon centred in its cell, filling about 75 % of it. No grid lines, no labels, no numbers, no letters, no text. Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else).
Row 1, cell 1: A carved standing stone with a glowing rune.
Row 1, cell 2: A small open shrine with a floating spell scroll.
Row 1, cell 3: A training post with crossed practice staves.
Row 1, cell 4: A thatched hut with a hanging notice scroll.
Row 2, cell 1: A small pointed tent with a key on its flap; light neutral colours so it can be tinted.
Row 2, cell 2: A barred gate with a keyhole seal; light neutral colours so it can be tinted.
Row 2, cell 3: A small windmill with a sack at its door.
Row 2, cell 4: A stone cell door with iron bars.
```

## Part E — Town backgrounds (optional sharper repaint)

The town screen paints the buildings over a background painting. Today’s six backgrounds are the owner’s concept paintings at **1448 × 1086 px** — they look right but soft on large screens. A repaint at **2048 × 1536 px** (the same 4:3) keeps the composition **exactly**: every plot where a building stands stays where it is, at the same size, empty (the game draws the buildings). Use today’s painting as the base image and the layout guide as a check: `assets-source/art/briefs/guides/town.<pantheon>.layout.png` marks every location’s footprint (blue: dwellings, gold: services), written by `python3 tools/assets/briefs/town_guides.py`.

| Pantheon | File | Today | Keeps |
|---|---|---|---|
| Greek | `town.greek.background.png` → `assets-source/art/final/` | `assets-runtime/placeholders/town/greek/background.jpg` | white-marble terraces stepping down a sunlit sea cliff, waterfalls into a blue bay, cypresses, a great statue and temple on the summit, snowy mountains far behind |
| Norse | `town.norse.background.png` → `assets-source/art/final/` | `assets-runtime/placeholders/town/norse/background.jpg` | stone and timber terraces over frozen waterfalls in a snowy fjord, pines, braziers, a giant warrior statue and a fortress gate at the top, the aurora in the night sky |
| Egyptian | `town.egyptian.background.png` → `assets-source/art/final/` | `assets-runtime/placeholders/town/egyptian/background.jpg` | sandstone terraces and quays over waterfalls into the green Nile, palms, obelisks and sphinxes, a sailing boat, the pyramids and a temple city on the horizon |
| Japanese | `town.japanese.background.png` → `assets-source/art/final/` | `assets-runtime/placeholders/town/japanese/background.jpg` | terraces on misty cliffs joined by red arched bridges, waterfalls, cherry trees in blossom, torii gates, pagodas and a snow-capped mountain at sunset |
| Celtic | `town.celtic.background.png` → `assets-source/art/final/` | `assets-runtime/placeholders/town/celtic/background.jpg` | mossy terraces among waterfalls in a misty highland valley, standing stones, a giant oak on the left, a stag statue and a stone arch on the far crag |
| Mesoamerican | `town.mesoamerican.background.png` → `assets-source/art/final/` | `assets-runtime/placeholders/town/mesoamerican/background.jpg` | stepped stone terraces and causeways over turquoise pools and waterfalls in the rainforest, crimson banners, a great sun temple on the central axis at sunrise |

| Field | Value |
|---|---|
| Image | 2048 × 1536 px, opaque, 4:3 (the importer warns on any other proportion) |
| Attach | today’s background (the base), its layout guide, the town board |
| Then | `npm run art:import` (the town shows it in place of the concept painting) |

```text
Repaint the attached town background for the fantasy strategy game Pantheon Realms at 2048 × 1536 px, keeping its composition exactly: the same terraces, plots, paths, bridges, waterfalls and horizon in the same places and at the same sizes (the second attachment marks every plot that must stay an empty, flat, walkable platform — the game paints the buildings there). Sharpen and enrich the painting: crisper stone, water and foliage, warm sunlight, atmospheric depth. No buildings on the marked plots, no people, no text, no frame.
```

## Part F — The god accepts a commitment (optional effect strip)

When a player commits to a minor god, the god’s card on the Pantheon screen shows a short moment: rays, a burst over the portrait and the committed seal pressed onto the card (1.7 s; none under Reduce motion). The burst is today the Anointing gift’s golden strip; a strip of its own replaces it by name.

| Field | Value |
|---|---|
| File | `assets-source/sprites/final/sprite.fx.god.commit.png` + `sprite.fx.god.commit.json` (`{"frames": 10, "fps": 12, "loop": false, "additive": false}`) |
| Strip | 10 frames left to right, each 256 × 256 px (2560 × 256), transparent, centred at 62 % of the frame height like the other interface bursts |
| Look | a ring of soft golden light opens behind the portrait, a column of light descends, a laurel-like halo of rays flares and settles into a few drifting motes; no symbols, no text, no pantheon-specific shapes (it serves every pantheon) |
| Then | `npm run sprites:import` (the card plays `fx.god.commit` instead of the Anointing burst) |

## Not needed now

* **Square portraits of the story characters who have a painted bust** (all of them since the Herald’s bust of 2026-10-04): the dialogue window shows the bust; the square portrait is only a fallback.
* **Neutral map hero** (`heroes.neutral` in the sprite manifest): a tinted silhouette for a hero without a pantheon avatar; every hero in the content has its pantheon’s rider, so nothing shows it today.
* **Opening-screen paintings, logo, app icon:** the owner’s own art (`assets-source/ui/`, `python3 tools/assets/prepare_ui_art.py`); the twelve quieter opening paintings were delivered on 2026-10-04 (the earlier ones are archived, unused, in `assets-source/ui/backgrounds-old/`).
* **Music and sounds** are not visuals: the map music per pantheon is handled separately (royalty-free tracks, audio manifest).

## Checklist

* 14 sheets named exactly as above in `assets-source/sprites/sheets/`, up to 6 background paintings in `assets-source/art/final/`, one effect strip in `assets-source/sprites/final/`.
* `npm run sprites:cut -- --only <sheet name>` for each new sheet (check the previews), then the part’s importer; `npm run icons:catalog`; `npm run check`.
* In the game: a town of each pantheon at several levels (every dwelling and service its own cutout, in proportion over the background), a battle on a fog, sand and storm map (the climate chip’s icon), the map tile panel on a random map’s new sites, the Pantheon screen when a god is committed.
