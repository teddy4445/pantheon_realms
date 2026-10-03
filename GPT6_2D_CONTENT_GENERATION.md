# Pantheon Realms — GPT-6 2D content generation (sheet edition)

Generated 2026-10-03 by `npm run sprites:queue` from the repository's actual state (content version `content-0.8.0`): the content catalog, the 2D sprite manifest, delivered portraits and painted art. It lists **only what is still missing** after reusing the existing 2D content (`2D_MIGRATION_AUDIT.md`).

**Many items per image.** Instead of one image per strip or object, GPT-6 paints **sheets**: one large image holding a whole set — every animation of one creature form, all directions of one map hero, a dozen map objects, three families' portraits. `npm run sprites:cut` cuts each sheet into the single files the game imports. **140 sheets** replace 1,097 single images; only the 54 optional battlefield paintings stay one per image.

## 0. Summary

| Group | What | Sheets | Single files cut from them | In the game meanwhile |
|---|---|---|---|---|
| A | Creature canonical references (three-quarter masters), three families per sheet | **12** | 59 | silhouette placeholder |
| B | Creature portraits, three families per sheet | **12** | 59 | drawn stand-in portrait |
| C | Battle animations, **one sheet per creature form** (all its strips as rows) | **102** | 800 strips | reference still + simple motion (43 forms), animated silhouettes (59 forms) |
| D | Mounted map heroes (one sheet per pantheon: 5 directions × idle + walk) and the six hero-screen figures (one sheet) | **7** | 102 | side-view still, mirrored westward, step bob |
| E | Adventure-map locations and decoration (towns, resources, two location sheets) | **4** | 47 | concept crops; procedural decoration |
| F | Battlefield backgrounds per climate (optional; full paintings, one per image) | — | 54 | temperate painting |
| G | Battlefield obstacles (one sheet) and siege pieces (one sheet) | **2** | 19 | procedural placeholders |
| H | Spell / combat effects and projectiles (one sheet) | **1** | 11 | procedural placeholders |
| | **Total** | **140** | 1097 | |

## 1. How sheets work

1. **One sheet per request.** Generate the image at the size given (about 1.6 megapixels — the size GPT-6 has delivered so far) **or larger with the same proportions**: a larger image gives sharper sprites. Save it under its exact sheet file name (for example `sheet.creature.greek.tier1.base.png`) in **`assets-source/sprites/sheets/`**.
2. **Grid.** An invisible grid of equal cells. No grid lines, no borders, no labels, no numbers, no text. Every item stays inside its own cell with clear empty space around it; nothing touches or crosses a cell edge. Cells are filled left to right, rows top to bottom, exactly as listed; a cell marked *empty* stays empty.
3. **Animation rows.** In a creature or hero sheet each row (or half-row) is one animation; its frames are the cells left to right. Every frame shows the same creature at the same size and in the same place in its cell — only the pose changes, so the motion reads when the cells are played one after another.
4. **Then:** `npm run sprites:cut` (cuts every new or changed sheet; writes a preview of each cut to `assets-source/sprites/sheets/_preview/`), then `npm run sprites:import` and, for portraits, `npm run icons:import`. Nothing else changes; the cut files replace their placeholders.
5. **Too much for one image?** A sheet may be delivered as two images split between rows, named `<sheet>.part1.png` (the upper rows) and `<sheet>.part2.png` (the rest) — each keeps the same column count and cell shape. The cutter splits the rows evenly between the parts (the upper part gets the extra row when the count is odd), so generate them that way. Worth it for the creature sheets with more than six rows (shooters, fliers, active abilities): their cells are smallest; the C entries list the part sizes.
6. **What the cutter tolerates:** any image size; a background in flat magenta, grey or a fake checkerboard instead of real transparency (keyed out); figures a little off-centre or off the ground line in their cells (each animation is re-aligned on its feet). What it cannot fix: frames that touch or overlap, a different number of frames than asked, a creature that changes size or design between frames. The preview shows each cut frame with its ground line, so check it before importing.

## 2. Rules for every image

1. **Style:** modern high-resolution pre-rendered 2D fantasy strategy art — the painterly finish of the pantheon boards and the game's opening paintings. Not pixel art, not a photograph, not a 3D-render look, not anime, no ink outlines, no flat vector.
2. **Background:** Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). No ground plane, no cast shadow, no environment. (Portrait sheets and battlefield paintings are opaque; the effects sheet may use flat black instead of magenta.)
3. **No text** of any kind: no letters, numbers, runes or glyphs that read as writing, no logos, signatures or watermarks — and no grid lines or labels on the sheet.
4. **Camera:** one fixed elevated side / three-quarter strategy-game camera for every battle sheet (about 20° above the horizon, looking slightly down), the same for every creature and frame. Map objects and map heroes: the same camera from about 35° above the horizon.
5. **Facing:** battle creatures face **right** (the game mirrors the defending side). Map heroes: the five directions listed (the game mirrors them for west, north-west and south-west).
6. **Scale is set by the cell.** Each sheet states how many hex widths one cell spans and where the ground line is; draw every item to that scale. The game places sprites by these numbers, never by image size.
7. **Content wins over art.** Draw only actions the creature has in the game (the rows below come from its gameplay definition); do not add weapons, wings or powers it does not have. Where a pantheon board and this text disagree on looks, follow the board (as in Brief 5); where they disagree on what the creature does, follow this document.
8. **Base, then upgrade.** Make a base form's sheet first; make the upgraded form's sheet with the base sheet attached, keeping every frame's pose, timing, camera, scale and place in the cell (directive §17).

## 3. Reference files

| Ref | File | Use |
|---|---|---|
| Board Greek | `support images/ChatGPT Image Sep 29, 2026, 03_35_30 PM-1.png` | design authority for Greek creatures |
| Board Norse | `support images/ChatGPT Image Sep 29, 2026, 03_35_32 PM-2.png` | design authority for Norse creatures |
| Board Egyptian | `support images/ChatGPT Image Sep 29, 2026, 03_35_35 PM-3.png` | design authority for Egyptian creatures |
| Board Japanese | `support images/ChatGPT Image Sep 29, 2026, 03_35_37 PM-4.png` | design authority for Japanese creatures |
| Board Celtic | `support images/ChatGPT Image Sep 29, 2026, 03_35_41 PM-5.png` | design authority for Celtic creatures |
| Board Mesoamerican | `support images/ChatGPT Image Sep 29, 2026, 03_35_45 PM-6.png` | design authority for Mesoamerican creatures |
| Hero Greek | `support images/heros_full_view/ChatGPT Image Oct 1, 2026, 01_27_31 PM-1.png` | top / front / side of the Greek mounted hero |
| Hero Norse | `support images/heros_full_view/ChatGPT Image Oct 1, 2026, 01_27_33 PM-2.png` | top / front / side of the Norse mounted hero |
| Hero Egyptian | `support images/heros_full_view/ChatGPT Image Oct 1, 2026, 01_27_35 PM-3.png` | top / front / side of the Egyptian mounted hero |
| Hero Japanese | `support images/heros_full_view/ChatGPT Image Oct 1, 2026, 01_27_37 PM-4.png` | top / front / side of the Japanese mounted hero |
| Hero Celtic | `support images/heros_full_view/ChatGPT Image Oct 1, 2026, 01_27_39 PM-5.png` | top / front / side of the Celtic mounted hero |
| Hero Mesoamerican | `support images/heros_full_view/ChatGPT Image Oct 1, 2026, 01_27_48 PM-6.png` | top / front / side of the Mesoamerican mounted hero |
| Map objects | `assets-source/ui/sheets/map-markers-sheet.png` | approved look of map locations (towns per pantheon, mines, objects, structures, passages) |
| Creature masters | `assets-source/creatures/reference/creature.<…>.ref.threequarter.png` | the canonical design of each form (43 delivered; the rest from Group A) |
| Portraits | `assets-source/icons/final/creature.<…>.portrait.png` | finished look per form (43 delivered) |
| Creature brief | `assets-source/art/briefs/GPT6_BRIEF_5_CREATURES.md` | full description, lore and board notes per form |
| Ground / battlefields | `assets-source/art/briefs/GPT6_BRIEF_2_GROUND_AND_SKY.md` | battlefield layout (quiet centre for the hex board) |

## Group A — Creature canonical references (three families per sheet)

59 forms have no canonical reference yet (the other 43 are delivered). Each sheet holds up to three families of one pantheon, one family per row: **left cell the base form, right cell the upgraded form**, both full-body, standing, three-quarter view facing right, neutral studio light — the masters every later sheet is drawn from. Painting both forms of a family side by side keeps them consistent. Cut into `assets-source/creatures/reference/<form>.ref.threequarter.png`.

### A · `sheet.ref.japanese.1.png`

| Field | Value |
|---|---|
| Contains | row 1: *empty* (already delivered) · Nine-Tailed Kitsune (upgraded)<br>row 2: Kappa (base) · River Elder Kappa (upgraded)<br>row 3: Tengu (base) · Great Tengu (upgraded) |
| Image | 1024 × 1536 px (about 1.6 MP) or larger with the same proportions — 2 columns × 3 rows, cells 512 × 512 px |
| Background | transparent |
| Attach | `support images/ChatGPT Image Sep 29, 2026, 03_35_37 PM-4.png` (pantheon board); `assets-source/creatures/reference/creature.japanese.tier1.base.ref.threequarter.png` (delivered base master of Nine-Tailed Kitsune) |
| Cuts into | `creature.japanese.tier1.upgraded.ref.threequarter.png`, `creature.japanese.tier2.base.ref.threequarter.png`, `creature.japanese.tier2.upgraded.ref.threequarter.png`, `creature.japanese.tier3.base.ref.threequarter.png`, `creature.japanese.tier3.upgraded.ref.threequarter.png` |
| Status | missing (silhouette placeholders in the game) |

```text
Create one reference sheet for Pantheon Realms with the canonical designs of 5 creatures of the Japanese pantheon.
Image 1024 × 1536 px (or larger, same proportions): an invisible grid of 2 columns × 3 rows of equal square cells. No grid lines, no borders, no labels, no numbers, no text. Every item stays inside its own cell with clear empty space around it; nothing touches or crosses a cell edge.
Row 1, left cell: empty (leave it empty).
Row 1, right cell: Nine-Tailed Kitsune — fox skirmisher. Looks: A white fox with nine fanned tails and a ring of pale fox-fire. Design: the Nine-Tailed Kitsune card on the Japanese pantheon board (Level 1, right). Upgraded form of Kitsune: the same body plan, proportions and silhouette (up to 10 % larger); only armour, ornament, colour, markings and glow change.
Row 2, left cell: Kappa — river guard. Looks: A green turtle-shelled creature with a water-filled dish on its head and webbed hands. Design: the Kappa card on the Japanese pantheon board (Level 2, left).
Row 2, right cell: River Elder Kappa — river guard. Looks: A large mossy-shelled kappa with a white beard and a bamboo staff. Design: the River Elder Kappa card on the Japanese pantheon board (Level 2, right). Upgraded form of Kappa: the same body plan, proportions and silhouette (up to 10 % larger); only armour, ornament, colour, markings and glow change.
Row 3, left cell: Tengu — mountain flyer. Looks: A crow-winged warrior with a red long-nosed mask and a short sword. Design: the Tengu card on the Japanese pantheon board (Level 3, left).
Row 3, right cell: Great Tengu — mountain flyer. Looks: A tengu in monk’s robes with great black wings and a feather fan. Design: the Great Tengu card on the Japanese pantheon board (Level 3, right). Upgraded form of Tengu: the same body plan, proportions and silhouette (up to 10 % larger); only armour, ornament, colour, markings and glow change.
Each creature: full body, standing in a relaxed pose, three-quarter view facing right, whole figure inside its cell with margin, all at the same scale of drawing detail.
Modern high-resolution painterly fantasy strategy-game art, neutral even studio light, strong readable silhouettes.
Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). No ground, no shadows, no text.
```

### A · `sheet.ref.japanese.2.png`

| Field | Value |
|---|---|
| Contains | row 1: Oni (base) · Oni Warlord (upgraded)<br>row 2: Jorogumo (base) · Queen Jorogumo (upgraded)<br>row 3: Kirin (base) · Celestial Kirin (upgraded) |
| Image | 1024 × 1536 px (about 1.6 MP) or larger with the same proportions — 2 columns × 3 rows, cells 512 × 512 px |
| Background | transparent |
| Attach | `support images/ChatGPT Image Sep 29, 2026, 03_35_37 PM-4.png` (pantheon board) |
| Cuts into | `creature.japanese.tier4.base.ref.threequarter.png`, `creature.japanese.tier4.upgraded.ref.threequarter.png`, `creature.japanese.tier5.base.ref.threequarter.png`, `creature.japanese.tier5.upgraded.ref.threequarter.png`, `creature.japanese.tier6.base.ref.threequarter.png`, `creature.japanese.tier6.upgraded.ref.threequarter.png` |
| Status | missing (silhouette placeholders in the game) |

```text
Create one reference sheet for Pantheon Realms with the canonical designs of 6 creatures of the Japanese pantheon.
Image 1024 × 1536 px (or larger, same proportions): an invisible grid of 2 columns × 3 rows of equal square cells. No grid lines, no borders, no labels, no numbers, no text. Every item stays inside its own cell with clear empty space around it; nothing touches or crosses a cell edge.
Row 1, left cell: Oni — brute. Looks: A red-skinned horned ogre in a tiger-skin wrap carrying a studded iron club. Design: the Oni card on the Japanese pantheon board (Level 4, left).
Row 1, right cell: Oni Warlord — brute. Looks: A blue-skinned oni in lacquered samurai armor with a huge kanabō. Design: the Oni Warlord card on the Japanese pantheon board (Level 4, right). Upgraded form of Oni: the same body plan, proportions and silhouette (up to 10 % larger); only armour, ornament, colour, markings and glow change.
Row 2, left cell: Jorogumo — spider spirit. Looks: A pale woman in a web-patterned kimono whose shadow has eight spider legs. Design: the Jorogumo card on the Japanese pantheon board (Level 5, left).
Row 2, right cell: Queen Jorogumo — spider spirit. Looks: A spider-bodied woman in a gold-threaded kimono, webs glittering behind her. Design: the Queen Jorogumo card on the Japanese pantheon board (Level 5, right). Upgraded form of Jorogumo: the same body plan, proportions and silhouette (up to 10 % larger); only armour, ornament, colour, markings and glow change.
Row 3, left cell: Kirin — holy beast (ranged). Looks: A deer-like beast with dragon scales, a single antler and flames at its hooves. Design: the Kirin card on the Japanese pantheon board (Level 6, left).
Row 3, right cell: Celestial Kirin — holy beast (ranged). Looks: A golden-scaled kirin walking on clouds, mane of white fire streaming. Design: the Celestial Kirin card on the Japanese pantheon board (Level 6, right). Upgraded form of Kirin: the same body plan, proportions and silhouette (up to 10 % larger); only armour, ornament, colour, markings and glow change.
Each creature: full body, standing in a relaxed pose, three-quarter view facing right, whole figure inside its cell with margin, all at the same scale of drawing detail.
Modern high-resolution painterly fantasy strategy-game art, neutral even studio light, strong readable silhouettes.
Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). No ground, no shadows, no text.
```

### A · `sheet.ref.japanese.3.png`

| Field | Value |
|---|---|
| Contains | row 1: Orochi (base) · Imperial Orochi (upgraded) |
| Image | 1776 × 888 px (about 1.6 MP) or larger with the same proportions — 2 columns × 1 rows, cells 888 × 888 px |
| Background | transparent |
| Attach | `support images/ChatGPT Image Sep 29, 2026, 03_35_37 PM-4.png` (pantheon board) |
| Cuts into | `creature.japanese.tier7.base.ref.threequarter.png`, `creature.japanese.tier7.upgraded.ref.threequarter.png` |
| Status | missing (silhouette placeholders in the game) |

```text
Create one reference sheet for Pantheon Realms with the canonical designs of 2 creatures of the Japanese pantheon.
Image 1776 × 888 px (or larger, same proportions): an invisible grid of 2 columns × 1 rows of equal square cells. No grid lines, no borders, no labels, no numbers, no text. Every item stays inside its own cell with clear empty space around it; nothing touches or crosses a cell edge.
Row 1, left cell: Orochi — apex serpent. Looks: A vast serpent with many heads rising from one coiled body, eyes red as lanterns. Design: the Orochi card on the Japanese pantheon board (Level 7, left).
Row 1, right cell: Imperial Orochi — apex serpent. Looks: An eight-headed serpent with gold scales and a golden crest on every head. Design: the Imperial Orochi card on the Japanese pantheon board (Level 7, right). Upgraded form of Orochi: the same body plan, proportions and silhouette (up to 10 % larger); only armour, ornament, colour, markings and glow change.
Each creature: full body, standing in a relaxed pose, three-quarter view facing right, whole figure inside its cell with margin, all at the same scale of drawing detail.
Modern high-resolution painterly fantasy strategy-game art, neutral even studio light, strong readable silhouettes.
Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). No ground, no shadows, no text.
```

### A · `sheet.ref.celtic.1.png`

| Field | Value |
|---|---|
| Contains | row 1: Pooka (base) · Elder Pooka (upgraded)<br>row 2: Cu Sith (base) · Great Cu Sith (upgraded)<br>row 3: Kelpie (base) · Dread Kelpie (upgraded) |
| Image | 1024 × 1536 px (about 1.6 MP) or larger with the same proportions — 2 columns × 3 rows, cells 512 × 512 px |
| Background | transparent |
| Attach | `support images/ChatGPT Image Sep 29, 2026, 03_35_41 PM-5.png` (pantheon board) |
| Cuts into | `creature.celtic.tier1.base.ref.threequarter.png`, `creature.celtic.tier1.upgraded.ref.threequarter.png`, `creature.celtic.tier2.base.ref.threequarter.png`, `creature.celtic.tier2.upgraded.ref.threequarter.png`, `creature.celtic.tier3.base.ref.threequarter.png`, `creature.celtic.tier3.upgraded.ref.threequarter.png` |
| Status | missing (silhouette placeholders in the game) |

```text
Create one reference sheet for Pantheon Realms with the canonical designs of 6 creatures of the Celtic pantheon.
Image 1024 × 1536 px (or larger, same proportions): an invisible grid of 2 columns × 3 rows of equal square cells. No grid lines, no borders, no labels, no numbers, no text. Every item stays inside its own cell with clear empty space around it; nothing touches or crosses a cell edge.
Row 1, left cell: Pooka — shape-shifter. Looks: A black long-eared creature, half hare and half goat, with golden eyes. Design: the Pooka card on the Celtic pantheon board (Level 1, left).
Row 1, right cell: Elder Pooka — shape-shifter. Looks: A great dark horse-goat with curling horns and a shaggy mane. Design: the Elder Pooka card on the Celtic pantheon board (Level 1, right). Upgraded form of Pooka: the same body plan, proportions and silhouette (up to 10 % larger); only armour, ornament, colour, markings and glow change.
Row 2, left cell: Cu Sith — otherworld hound. Looks: A shaggy dark-green hound the size of a calf with a braided tail. Design: the Cu Sith card on the Celtic pantheon board (Level 2, left).
Row 2, right cell: Great Cu Sith — otherworld hound. Looks: A massive green hound with glowing eyes and a silver torc collar. Design: the Great Cu Sith card on the Celtic pantheon board (Level 2, right). Upgraded form of Cu Sith: the same body plan, proportions and silhouette (up to 10 % larger); only armour, ornament, colour, markings and glow change.
Row 3, left cell: Kelpie — water horse. Looks: A grey horse with a dripping weed-tangled mane and hooves turned backwards. Design: the Kelpie card on the Celtic pantheon board (Level 3, left).
Row 3, right cell: Dread Kelpie — water horse. Looks: A black water-horse with sea-green eyes and a mane like streaming kelp. Design: the Dread Kelpie card on the Celtic pantheon board (Level 3, right). Upgraded form of Kelpie: the same body plan, proportions and silhouette (up to 10 % larger); only armour, ornament, colour, markings and glow change.
Each creature: full body, standing in a relaxed pose, three-quarter view facing right, whole figure inside its cell with margin, all at the same scale of drawing detail.
Modern high-resolution painterly fantasy strategy-game art, neutral even studio light, strong readable silhouettes.
Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). No ground, no shadows, no text.
```

### A · `sheet.ref.celtic.2.png`

| Field | Value |
|---|---|
| Contains | row 1: Banshee (base) · Battle Banshee (upgraded)<br>row 2: Selkie (base) · Storm Selkie (upgraded)<br>row 3: Horned Stag Spirit (base) · Great Stag Spirit (upgraded) |
| Image | 1024 × 1536 px (about 1.6 MP) or larger with the same proportions — 2 columns × 3 rows, cells 512 × 512 px |
| Background | transparent |
| Attach | `support images/ChatGPT Image Sep 29, 2026, 03_35_41 PM-5.png` (pantheon board) |
| Cuts into | `creature.celtic.tier4.base.ref.threequarter.png`, `creature.celtic.tier4.upgraded.ref.threequarter.png`, `creature.celtic.tier5.base.ref.threequarter.png`, `creature.celtic.tier5.upgraded.ref.threequarter.png`, `creature.celtic.tier6.base.ref.threequarter.png`, `creature.celtic.tier6.upgraded.ref.threequarter.png` |
| Status | missing (silhouette placeholders in the game) |

```text
Create one reference sheet for Pantheon Realms with the canonical designs of 6 creatures of the Celtic pantheon.
Image 1024 × 1536 px (or larger, same proportions): an invisible grid of 2 columns × 3 rows of equal square cells. No grid lines, no borders, no labels, no numbers, no text. Every item stays inside its own cell with clear empty space around it; nothing touches or crosses a cell edge.
Row 1, left cell: Banshee — keening spirit (ranged). Looks: A pale grey-cloaked woman with long silver hair, mouth open in a cry. Design: the Banshee card on the Celtic pantheon board (Level 4, left).
Row 1, right cell: Battle Banshee — keening spirit (ranged). Looks: A banshee in torn battle-red wrappings, hair streaming like smoke. Design: the Battle Banshee card on the Celtic pantheon board (Level 4, right). Upgraded form of Banshee: the same body plan, proportions and silhouette (up to 10 % larger); only armour, ornament, colour, markings and glow change.
Row 2, left cell: Selkie — sea guardian. Looks: A great grey seal with a human gaze, rising from surf onto rocks. Design: the Selkie card on the Celtic pantheon board (Level 5, left).
Row 2, right cell: Storm Selkie — sea guardian. Looks: A dark storm-grey selkie with a mantle of spray and sea-glass eyes. Design: the Storm Selkie card on the Celtic pantheon board (Level 5, right). Upgraded form of Selkie: the same body plan, proportions and silhouette (up to 10 % larger); only armour, ornament, colour, markings and glow change.
Row 3, left cell: Horned Stag Spirit — forest charger. Looks: A huge white stag with moss-hung antlers and a faint green glow. Design: the Horned Stag Spirit card on the Celtic pantheon board (Level 6, left).
Row 3, right cell: Great Stag Spirit — forest charger. Looks: A stag of pale gold with an antler crown hung with leaves and stars. Design: the Great Stag Spirit card on the Celtic pantheon board (Level 6, right). Upgraded form of Horned Stag Spirit: the same body plan, proportions and silhouette (up to 10 % larger); only armour, ornament, colour, markings and glow change.
Each creature: full body, standing in a relaxed pose, three-quarter view facing right, whole figure inside its cell with margin, all at the same scale of drawing detail.
Modern high-resolution painterly fantasy strategy-game art, neutral even studio light, strong readable silhouettes.
Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). No ground, no shadows, no text.
```

### A · `sheet.ref.celtic.3.png`

| Field | Value |
|---|---|
| Contains | row 1: Fomorian Giant (base) · Ancient Fomorian (upgraded) |
| Image | 1776 × 888 px (about 1.6 MP) or larger with the same proportions — 2 columns × 1 rows, cells 888 × 888 px |
| Background | transparent |
| Attach | `support images/ChatGPT Image Sep 29, 2026, 03_35_41 PM-5.png` (pantheon board) |
| Cuts into | `creature.celtic.tier7.base.ref.threequarter.png`, `creature.celtic.tier7.upgraded.ref.threequarter.png` |
| Status | missing (silhouette placeholders in the game) |

```text
Create one reference sheet for Pantheon Realms with the canonical designs of 2 creatures of the Celtic pantheon.
Image 1776 × 888 px (or larger, same proportions): an invisible grid of 2 columns × 1 rows of equal square cells. No grid lines, no borders, no labels, no numbers, no text. Every item stays inside its own cell with clear empty space around it; nothing touches or crosses a cell edge.
Row 1, left cell: Fomorian Giant — apex giant. Looks: A towering giant with barnacled skin, a single great eye and a driftwood club. Design: the Fomorian Giant card on the Celtic pantheon board (Level 7, left).
Row 1, right cell: Ancient Fomorian — apex giant. Looks: An ancient sea-giant crowned with coral, a whale-jaw club over one shoulder. Design: the Ancient Fomorian card on the Celtic pantheon board (Level 7, right). Upgraded form of Fomorian Giant: the same body plan, proportions and silhouette (up to 10 % larger); only armour, ornament, colour, markings and glow change.
Each creature: full body, standing in a relaxed pose, three-quarter view facing right, whole figure inside its cell with margin, all at the same scale of drawing detail.
Modern high-resolution painterly fantasy strategy-game art, neutral even studio light, strong readable silhouettes.
Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). No ground, no shadows, no text.
```

### A · `sheet.ref.mesoamerican.1.png`

| Field | Value |
|---|---|
| Contains | row 1: Feathered Serpent (base) · Celestial Feathered Serpent (upgraded)<br>row 2: Jaguar Spirit (base) · Sun Jaguar (upgraded)<br>row 3: Eagle Warrior Spirit (base) · Solar Eagle Warrior (upgraded) |
| Image | 1024 × 1536 px (about 1.6 MP) or larger with the same proportions — 2 columns × 3 rows, cells 512 × 512 px |
| Background | transparent |
| Attach | `support images/ChatGPT Image Sep 29, 2026, 03_35_45 PM-6.png` (pantheon board) |
| Cuts into | `creature.mesoamerican.tier1.base.ref.threequarter.png`, `creature.mesoamerican.tier1.upgraded.ref.threequarter.png`, `creature.mesoamerican.tier2.base.ref.threequarter.png`, `creature.mesoamerican.tier2.upgraded.ref.threequarter.png`, `creature.mesoamerican.tier3.base.ref.threequarter.png`, `creature.mesoamerican.tier3.upgraded.ref.threequarter.png` |
| Status | missing (silhouette placeholders in the game) |

```text
Create one reference sheet for Pantheon Realms with the canonical designs of 6 creatures of the Mesoamerican pantheon.
Image 1024 × 1536 px (or larger, same proportions): an invisible grid of 2 columns × 3 rows of equal square cells. No grid lines, no borders, no labels, no numbers, no text. Every item stays inside its own cell with clear empty space around it; nothing touches or crosses a cell edge.
Row 1, left cell: Feathered Serpent — serpent swarm. Looks: A green serpent with a ruff of quetzal feathers around its head. Design: the Feathered Serpent card on the Mesoamerican pantheon board (Level 1, left).
Row 1, right cell: Celestial Feathered Serpent — serpent swarm. Looks: A turquoise serpent with long feathered wings spread against a gold sky. Design: the Celestial Feathered Serpent card on the Mesoamerican pantheon board (Level 1, right). Upgraded form of Feathered Serpent: the same body plan, proportions and silhouette (up to 10 % larger); only armour, ornament, colour, markings and glow change.
Row 2, left cell: Jaguar Spirit — pouncing predator. Looks: A black-spotted golden jaguar with jade eyes, crouched to spring. Design: the Jaguar Spirit card on the Mesoamerican pantheon board (Level 2, left).
Row 2, right cell: Sun Jaguar — pouncing predator. Looks: A bright-gold jaguar with a sun-disc pattern across its shoulders. Design: the Sun Jaguar card on the Mesoamerican pantheon board (Level 2, right). Upgraded form of Jaguar Spirit: the same body plan, proportions and silhouette (up to 10 % larger); only armour, ornament, colour, markings and glow change.
Row 3, left cell: Eagle Warrior Spirit — dart thrower. Looks: A warrior in a feathered eagle-head helmet holding an atlatl and darts. Design: the Eagle Warrior Spirit card on the Mesoamerican pantheon board (Level 3, left).
Row 3, right cell: Solar Eagle Warrior — dart thrower. Looks: An eagle warrior in golden feathers with a sun-ray shield and a bundle of darts. Design: the Solar Eagle Warrior card on the Mesoamerican pantheon board (Level 3, right). Upgraded form of Eagle Warrior Spirit: the same body plan, proportions and silhouette (up to 10 % larger); only armour, ornament, colour, markings and glow change.
Each creature: full body, standing in a relaxed pose, three-quarter view facing right, whole figure inside its cell with margin, all at the same scale of drawing detail.
Modern high-resolution painterly fantasy strategy-game art, neutral even studio light, strong readable silhouettes.
Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). No ground, no shadows, no text.
```

### A · `sheet.ref.mesoamerican.2.png`

| Field | Value |
|---|---|
| Contains | row 1: Cenote Crocodile (base) · Temple Crocodile (upgraded)<br>row 2: Camazotz (base) · Blood Moon Camazotz (upgraded)<br>row 3: Xiuhcoatl (base) · Divine Xiuhcoatl (upgraded) |
| Image | 1024 × 1536 px (about 1.6 MP) or larger with the same proportions — 2 columns × 3 rows, cells 512 × 512 px |
| Background | transparent |
| Attach | `support images/ChatGPT Image Sep 29, 2026, 03_35_45 PM-6.png` (pantheon board) |
| Cuts into | `creature.mesoamerican.tier4.base.ref.threequarter.png`, `creature.mesoamerican.tier4.upgraded.ref.threequarter.png`, `creature.mesoamerican.tier5.base.ref.threequarter.png`, `creature.mesoamerican.tier5.upgraded.ref.threequarter.png`, `creature.mesoamerican.tier6.base.ref.threequarter.png`, `creature.mesoamerican.tier6.upgraded.ref.threequarter.png` |
| Status | missing (silhouette placeholders in the game) |

```text
Create one reference sheet for Pantheon Realms with the canonical designs of 6 creatures of the Mesoamerican pantheon.
Image 1024 × 1536 px (or larger, same proportions): an invisible grid of 2 columns × 3 rows of equal square cells. No grid lines, no borders, no labels, no numbers, no text. Every item stays inside its own cell with clear empty space around it; nothing touches or crosses a cell edge.
Row 1, left cell: Cenote Crocodile — temple guardian. Looks: A dark crocodile with jade-green scutes emerging from still blue water. Design: the Cenote Crocodile card on the Mesoamerican pantheon board (Level 4, left).
Row 1, right cell: Temple Crocodile — temple guardian. Looks: A great crocodile with carved jade plates bound to its back. Design: the Temple Crocodile card on the Mesoamerican pantheon board (Level 4, right). Upgraded form of Cenote Crocodile: the same body plan, proportions and silhouette (up to 10 % larger); only armour, ornament, colour, markings and glow change.
Row 2, left cell: Camazotz — bat raider. Looks: A tall bat-headed figure with leathery wings and an obsidian blade. Design: the Camazotz card on the Mesoamerican pantheon board (Level 5, left).
Row 2, right cell: Blood Moon Camazotz — bat raider. Looks: A crimson-winged bat spirit silhouetted against a red moon. Design: the Blood Moon Camazotz card on the Mesoamerican pantheon board (Level 5, right). Upgraded form of Camazotz: the same body plan, proportions and silhouette (up to 10 % larger); only armour, ornament, colour, markings and glow change.
Row 3, left cell: Xiuhcoatl — fire serpent (ranged). Looks: A turquoise serpent with a flaming, segmented tail and a snout curling upward. Design: the Xiuhcoatl card on the Mesoamerican pantheon board (Level 6, left).
Row 3, right cell: Divine Xiuhcoatl — fire serpent (ranged). Looks: A blazing blue-and-gold serpent wreathed in a corona of fire. Design: the Divine Xiuhcoatl card on the Mesoamerican pantheon board (Level 6, right). Upgraded form of Xiuhcoatl: the same body plan, proportions and silhouette (up to 10 % larger); only armour, ornament, colour, markings and glow change.
Each creature: full body, standing in a relaxed pose, three-quarter view facing right, whole figure inside its cell with margin, all at the same scale of drawing detail.
Modern high-resolution painterly fantasy strategy-game art, neutral even studio light, strong readable silhouettes.
Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). No ground, no shadows, no text.
```

### A · `sheet.ref.mesoamerican.3.png`

| Field | Value |
|---|---|
| Contains | row 1: Stone Colossus (base) · Sun Colossus (upgraded) |
| Image | 1776 × 888 px (about 1.6 MP) or larger with the same proportions — 2 columns × 1 rows, cells 888 × 888 px |
| Background | transparent |
| Attach | `support images/ChatGPT Image Sep 29, 2026, 03_35_45 PM-6.png` (pantheon board) |
| Cuts into | `creature.mesoamerican.tier7.base.ref.threequarter.png`, `creature.mesoamerican.tier7.upgraded.ref.threequarter.png` |
| Status | missing (silhouette placeholders in the game) |

```text
Create one reference sheet for Pantheon Realms with the canonical designs of 2 creatures of the Mesoamerican pantheon.
Image 1776 × 888 px (or larger, same proportions): an invisible grid of 2 columns × 1 rows of equal square cells. No grid lines, no borders, no labels, no numbers, no text. Every item stays inside its own cell with clear empty space around it; nothing touches or crosses a cell edge.
Row 1, left cell: Stone Colossus — apex guardian. Looks: A towering basalt warrior statue with a feathered headdress and a stone shield. Design: the Stone Colossus card on the Mesoamerican pantheon board (Level 7, left).
Row 1, right cell: Sun Colossus — apex guardian. Looks: A colossal statue with glowing gold glyphs and a sun-disc on its chest. Design: the Sun Colossus card on the Mesoamerican pantheon board (Level 7, right). Upgraded form of Stone Colossus: the same body plan, proportions and silhouette (up to 10 % larger); only armour, ornament, colour, markings and glow change.
Each creature: full body, standing in a relaxed pose, three-quarter view facing right, whole figure inside its cell with margin, all at the same scale of drawing detail.
Modern high-resolution painterly fantasy strategy-game art, neutral even studio light, strong readable silhouettes.
Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). No ground, no shadows, no text.
```

### A · `sheet.ref.neutral.1.png`

| Field | Value |
|---|---|
| Contains | row 1: Brigand (base) · Brigand Cutthroat (upgraded)<br>row 2: Hill Slinger (base) · Sling Master (upgraded)<br>row 3: Wild Boar (base) · Great Tusked Boar (upgraded) |
| Image | 1024 × 1536 px (about 1.6 MP) or larger with the same proportions — 2 columns × 3 rows, cells 512 × 512 px |
| Background | transparent |
| Attach | Brief 5 §3 (neutral palette) |
| Cuts into | `creature.neutral.brigand.base.ref.threequarter.png`, `creature.neutral.brigand.upgraded.ref.threequarter.png`, `creature.neutral.hill_slinger.base.ref.threequarter.png`, `creature.neutral.hill_slinger.upgraded.ref.threequarter.png`, `creature.neutral.wild_boar.base.ref.threequarter.png`, `creature.neutral.wild_boar.upgraded.ref.threequarter.png` |
| Status | missing (silhouette placeholders in the game) |

```text
Create one reference sheet for Pantheon Realms with the canonical designs of 6 creatures of the Neutral creatures.
Image 1024 × 1536 px (or larger, same proportions): an invisible grid of 2 columns × 3 rows of equal square cells. No grid lines, no borders, no labels, no numbers, no text. Every item stays inside its own cell with clear empty space around it; nothing touches or crosses a cell edge.
Row 1, left cell: Brigand — line infantry (neutral). Looks: A ragged fighter with a hooded cloak, a short spear and a mismatched shield. Design: no board card — design it from the description, in the board’s style.
Row 1, right cell: Brigand Cutthroat — line infantry (neutral). Looks: A lean outlaw in a dark scarf with a notched spear and a dented round shield. Design: no board card — design it from the description, in the board’s style. Upgraded form of Brigand: the same body plan, proportions and silhouette (up to 10 % larger); only armour, ornament, colour, markings and glow change.
Row 2, left cell: Hill Slinger — short-range shooters (neutral). Looks: A shepherd in a wool cloak whirling a leather sling, a pouch of stones at the belt. Design: no board card — design it from the description, in the board’s style.
Row 2, right cell: Sling Master — short-range shooters (neutral). Looks: A slinger with a braided double sling and a bag of lead shot. Design: no board card — design it from the description, in the board’s style. Upgraded form of Hill Slinger: the same body plan, proportions and silhouette (up to 10 % larger); only armour, ornament, colour, markings and glow change.
Row 3, left cell: Wild Boar — charging beasts (neutral). Looks: A bristling dark boar with curved tusks, head lowered to charge. Design: no board card — design it from the description, in the board’s style.
Row 3, right cell: Great Tusked Boar — charging beasts (neutral). Looks: A huge scarred boar with long ivory tusks and a ridge of grey bristles. Design: no board card — design it from the description, in the board’s style. Upgraded form of Wild Boar: the same body plan, proportions and silhouette (up to 10 % larger); only armour, ornament, colour, markings and glow change.
Each creature: full body, standing in a relaxed pose, three-quarter view facing right, whole figure inside its cell with margin, all at the same scale of drawing detail.
Modern high-resolution painterly fantasy strategy-game art, neutral even studio light, strong readable silhouettes.
Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). No ground, no shadows, no text.
```

### A · `sheet.ref.neutral.2.png`

| Field | Value |
|---|---|
| Contains | row 1: Centaur (base) · Centaur Sentinel (upgraded)<br>row 2: Clay Golem (base) · Bronze Golem (upgraded)<br>row 3: Wyvern (base) · Wyvern Matriarch (upgraded) |
| Image | 1024 × 1536 px (about 1.6 MP) or larger with the same proportions — 2 columns × 3 rows, cells 512 × 512 px |
| Background | transparent |
| Attach | Brief 5 §3 (neutral palette) |
| Cuts into | `creature.neutral.centaur.base.ref.threequarter.png`, `creature.neutral.centaur.upgraded.ref.threequarter.png`, `creature.neutral.clay_golem.base.ref.threequarter.png`, `creature.neutral.clay_golem.upgraded.ref.threequarter.png`, `creature.neutral.wyvern.base.ref.threequarter.png`, `creature.neutral.wyvern.upgraded.ref.threequarter.png` |
| Status | missing (silhouette placeholders in the game) |

```text
Create one reference sheet for Pantheon Realms with the canonical designs of 6 creatures of the Neutral creatures.
Image 1024 × 1536 px (or larger, same proportions): an invisible grid of 2 columns × 3 rows of equal square cells. No grid lines, no borders, no labels, no numbers, no text. Every item stays inside its own cell with clear empty space around it; nothing touches or crosses a cell edge.
Row 1, left cell: Centaur — fast ground melee (neutral). Looks: A centaur with a chestnut coat, simple chest protection and a melee spear. Design: the Greek board’s Centaur card (Level 3, left) — but holding a spear, never a bow.
Row 1, right cell: Centaur Sentinel — fast ground melee (neutral). Looks: A centaur with foreleg protection, a tied crest and a reinforced spearhead. Design: the Greek board’s Noble Centaur card (Level 3, right) — but holding a spear, never a bow. Upgraded form of Centaur: the same body plan, proportions and silhouette (up to 10 % larger); only armour, ornament, colour, markings and glow change.
Row 2, left cell: Clay Golem — slow guardians (neutral). Looks: A heavy figure of red fired clay with a blank face and a sigil pressed into its chest. Design: no board card — design it from the description, in the board’s style.
Row 2, right cell: Bronze Golem — slow guardians (neutral). Looks: A clay golem plated in green-patinated bronze, with riveted shoulders. Design: no board card — design it from the description, in the board’s style. Upgraded form of Clay Golem: the same body plan, proportions and silhouette (up to 10 % larger); only armour, ornament, colour, markings and glow change.
Row 3, left cell: Wyvern — flying hunters (neutral). Looks: A lean two-legged winged dragon with leathery wings and a barbed tail. Design: no board card — design it from the description, in the board’s style.
Row 3, right cell: Wyvern Matriarch — flying hunters (neutral). Looks: A larger wyvern with a frilled crest and torn, battle-scarred wings. Design: no board card — design it from the description, in the board’s style. Upgraded form of Wyvern: the same body plan, proportions and silhouette (up to 10 % larger); only armour, ornament, colour, markings and glow change.
Each creature: full body, standing in a relaxed pose, three-quarter view facing right, whole figure inside its cell with margin, all at the same scale of drawing detail.
Modern high-resolution painterly fantasy strategy-game art, neutral even studio light, strong readable silhouettes.
Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). No ground, no shadows, no text.
```

### A · `sheet.ref.neutral.3.png`

| Field | Value |
|---|---|
| Contains | row 1: Ogre (base) · Ogre Chieftain (upgraded)<br>row 2: Basilisk (base) · Greater Basilisk (upgraded)<br>row 3: Elder Drake (base) · Ancient Drake (upgraded) |
| Image | 1024 × 1536 px (about 1.6 MP) or larger with the same proportions — 2 columns × 3 rows, cells 512 × 512 px |
| Background | transparent |
| Attach | Brief 5 §3 (neutral palette) |
| Cuts into | `creature.neutral.ogre.base.ref.threequarter.png`, `creature.neutral.ogre.upgraded.ref.threequarter.png`, `creature.neutral.basilisk.base.ref.threequarter.png`, `creature.neutral.basilisk.upgraded.ref.threequarter.png`, `creature.neutral.elder_drake.base.ref.threequarter.png`, `creature.neutral.elder_drake.upgraded.ref.threequarter.png` |
| Status | missing (silhouette placeholders in the game) |

```text
Create one reference sheet for Pantheon Realms with the canonical designs of 6 creatures of the Neutral creatures.
Image 1024 × 1536 px (or larger, same proportions): an invisible grid of 2 columns × 3 rows of equal square cells. No grid lines, no borders, no labels, no numbers, no text. Every item stays inside its own cell with clear empty space around it; nothing touches or crosses a cell edge.
Row 1, left cell: Ogre — brutes (neutral). Looks: A towering brute in hides with a knotted club over one shoulder. Design: no board card — design it from the description, in the board’s style.
Row 1, right cell: Ogre Chieftain — brutes (neutral). Looks: A scarred ogre wearing a crown of bent iron and a cloak of bear fur. Design: no board card — design it from the description, in the board’s style. Upgraded form of Ogre: the same body plan, proportions and silhouette (up to 10 % larger); only armour, ornament, colour, markings and glow change.
Row 2, left cell: Basilisk — armoured serpents (neutral). Looks: A great scaled serpent with a crest like a crown and pale, staring eyes. Design: no board card — design it from the description, in the board’s style.
Row 2, right cell: Greater Basilisk — armoured serpents (neutral). Looks: A larger basilisk with stone-grey scales and a ring of horns around its crown. Design: no board card — design it from the description, in the board’s style. Upgraded form of Basilisk: the same body plan, proportions and silhouette (up to 10 % larger); only armour, ornament, colour, markings and glow change.
Row 3, left cell: Elder Drake — ancient dragons (neutral). Looks: A massive four-legged dragon with bronze scales and folded wings over a heap of coins. Design: no board card — design it from the description, in the board’s style.
Row 3, right cell: Ancient Drake — ancient dragons (neutral). Looks: An immense dragon with horn-crowned head and scales dulled to dark gold by age. Design: no board card — design it from the description, in the board’s style. Upgraded form of Elder Drake: the same body plan, proportions and silhouette (up to 10 % larger); only armour, ornament, colour, markings and glow change.
Each creature: full body, standing in a relaxed pose, three-quarter view facing right, whole figure inside its cell with margin, all at the same scale of drawing detail.
Modern high-resolution painterly fantasy strategy-game art, neutral even studio light, strong readable silhouettes.
Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). No ground, no shadows, no text.
```

## Group B — Creature portraits (three families per sheet)

59 forms still show a drawn stand-in portrait (army slots, recruitment, turn order, bestiary). Same families and order as Group A: **left the base form, right the upgraded form**, each a square painting with its own background; generated with the forms' masters attached. Cut into `assets-source/icons/final/<portrait asset ID>.png` (then `npm run icons:import` makes the 256 px game images).

### B · `sheet.portrait.japanese.1.png`

| Field | Value |
|---|---|
| Contains | row 1: *empty* (already delivered) · Nine-Tailed Kitsune (upgraded)<br>row 2: Kappa (base) · River Elder Kappa (upgraded)<br>row 3: Tengu (base) · Great Tengu (upgraded) |
| Image | 1024 × 1536 px (about 1.6 MP) or larger with the same proportions — 2 columns × 3 rows, cells 512 × 512 px |
| Background | opaque: each cell its own painted background; a thin straight black gutter (about 1 % of the width) between cells |
| Attach | `assets-source/creatures/reference/creature.japanese.tier1.upgraded.ref.threequarter.png`; `assets-source/creatures/reference/creature.japanese.tier2.base.ref.threequarter.png`; `assets-source/creatures/reference/creature.japanese.tier2.upgraded.ref.threequarter.png`; `assets-source/creatures/reference/creature.japanese.tier3.base.ref.threequarter.png`; `assets-source/creatures/reference/creature.japanese.tier3.upgraded.ref.threequarter.png`; `support images/ChatGPT Image Sep 29, 2026, 03_35_37 PM-4.png` |
| Cuts into | `creature.japanese.tier1.upgraded.portrait.png`, `creature.japanese.tier2.base.portrait.png`, `creature.japanese.tier2.upgraded.portrait.png`, `creature.japanese.tier3.base.portrait.png`, `creature.japanese.tier3.upgraded.portrait.png` |
| Status | missing (stand-in portraits in the game) |

```text
Using the attached canonical references, paint one sheet of square creature portraits for Pantheon Realms (Japanese).
Image 1024 × 1536 px (or larger, same proportions): 2 columns × 3 rows of equal square paintings separated by thin straight black gutters. No labels, no numbers, no text.
Row 1, left: empty (flat black).
Row 1, right: Nine-Tailed Kitsune — A white fox with nine fanned tails and a ring of pale fox-fire.
Row 2, left: Kappa — A green turtle-shelled creature with a water-filled dish on its head and webbed hands.
Row 2, right: River Elder Kappa — A large mossy-shelled kappa with a white beard and a bamboo staff.
Row 3, left: Tengu — A crow-winged warrior with a red long-nosed mask and a short sword.
Row 3, right: Great Tengu — A tengu in monk’s robes with great black wings and a feather fan.
Each portrait: head and shoulders (a large creature: head and upper body), three-quarter view facing right, dramatic painterly light, a soft background in the pantheon's colours; the exact design, materials and colours of its reference; readable when reduced to 48 px. No frame, no border, no text.
```

### B · `sheet.portrait.japanese.2.png`

| Field | Value |
|---|---|
| Contains | row 1: Oni (base) · Oni Warlord (upgraded)<br>row 2: Jorogumo (base) · Queen Jorogumo (upgraded)<br>row 3: Kirin (base) · Celestial Kirin (upgraded) |
| Image | 1024 × 1536 px (about 1.6 MP) or larger with the same proportions — 2 columns × 3 rows, cells 512 × 512 px |
| Background | opaque: each cell its own painted background; a thin straight black gutter (about 1 % of the width) between cells |
| Attach | `assets-source/creatures/reference/creature.japanese.tier4.base.ref.threequarter.png`; `assets-source/creatures/reference/creature.japanese.tier4.upgraded.ref.threequarter.png`; `assets-source/creatures/reference/creature.japanese.tier5.base.ref.threequarter.png`; `assets-source/creatures/reference/creature.japanese.tier5.upgraded.ref.threequarter.png`; `assets-source/creatures/reference/creature.japanese.tier6.base.ref.threequarter.png`; `assets-source/creatures/reference/creature.japanese.tier6.upgraded.ref.threequarter.png`; `support images/ChatGPT Image Sep 29, 2026, 03_35_37 PM-4.png` |
| Cuts into | `creature.japanese.tier4.base.portrait.png`, `creature.japanese.tier4.upgraded.portrait.png`, `creature.japanese.tier5.base.portrait.png`, `creature.japanese.tier5.upgraded.portrait.png`, `creature.japanese.tier6.base.portrait.png`, `creature.japanese.tier6.upgraded.portrait.png` |
| Status | missing (stand-in portraits in the game) |

```text
Using the attached canonical references, paint one sheet of square creature portraits for Pantheon Realms (Japanese).
Image 1024 × 1536 px (or larger, same proportions): 2 columns × 3 rows of equal square paintings separated by thin straight black gutters. No labels, no numbers, no text.
Row 1, left: Oni — A red-skinned horned ogre in a tiger-skin wrap carrying a studded iron club.
Row 1, right: Oni Warlord — A blue-skinned oni in lacquered samurai armor with a huge kanabō.
Row 2, left: Jorogumo — A pale woman in a web-patterned kimono whose shadow has eight spider legs.
Row 2, right: Queen Jorogumo — A spider-bodied woman in a gold-threaded kimono, webs glittering behind her.
Row 3, left: Kirin — A deer-like beast with dragon scales, a single antler and flames at its hooves.
Row 3, right: Celestial Kirin — A golden-scaled kirin walking on clouds, mane of white fire streaming.
Each portrait: head and shoulders (a large creature: head and upper body), three-quarter view facing right, dramatic painterly light, a soft background in the pantheon's colours; the exact design, materials and colours of its reference; readable when reduced to 48 px. No frame, no border, no text.
```

### B · `sheet.portrait.japanese.3.png`

| Field | Value |
|---|---|
| Contains | row 1: Orochi (base) · Imperial Orochi (upgraded) |
| Image | 1776 × 888 px (about 1.6 MP) or larger with the same proportions — 2 columns × 1 rows, cells 888 × 888 px |
| Background | opaque: each cell its own painted background; a thin straight black gutter (about 1 % of the width) between cells |
| Attach | `assets-source/creatures/reference/creature.japanese.tier7.base.ref.threequarter.png`; `assets-source/creatures/reference/creature.japanese.tier7.upgraded.ref.threequarter.png`; `support images/ChatGPT Image Sep 29, 2026, 03_35_37 PM-4.png` |
| Cuts into | `creature.japanese.tier7.base.portrait.png`, `creature.japanese.tier7.upgraded.portrait.png` |
| Status | missing (stand-in portraits in the game) |

```text
Using the attached canonical references, paint one sheet of square creature portraits for Pantheon Realms (Japanese).
Image 1776 × 888 px (or larger, same proportions): 2 columns × 1 rows of equal square paintings separated by thin straight black gutters. No labels, no numbers, no text.
Row 1, left: Orochi — A vast serpent with many heads rising from one coiled body, eyes red as lanterns.
Row 1, right: Imperial Orochi — An eight-headed serpent with gold scales and a golden crest on every head.
Each portrait: head and shoulders (a large creature: head and upper body), three-quarter view facing right, dramatic painterly light, a soft background in the pantheon's colours; the exact design, materials and colours of its reference; readable when reduced to 48 px. No frame, no border, no text.
```

### B · `sheet.portrait.celtic.1.png`

| Field | Value |
|---|---|
| Contains | row 1: Pooka (base) · Elder Pooka (upgraded)<br>row 2: Cu Sith (base) · Great Cu Sith (upgraded)<br>row 3: Kelpie (base) · Dread Kelpie (upgraded) |
| Image | 1024 × 1536 px (about 1.6 MP) or larger with the same proportions — 2 columns × 3 rows, cells 512 × 512 px |
| Background | opaque: each cell its own painted background; a thin straight black gutter (about 1 % of the width) between cells |
| Attach | `assets-source/creatures/reference/creature.celtic.tier1.base.ref.threequarter.png`; `assets-source/creatures/reference/creature.celtic.tier1.upgraded.ref.threequarter.png`; `assets-source/creatures/reference/creature.celtic.tier2.base.ref.threequarter.png`; `assets-source/creatures/reference/creature.celtic.tier2.upgraded.ref.threequarter.png`; `assets-source/creatures/reference/creature.celtic.tier3.base.ref.threequarter.png`; `assets-source/creatures/reference/creature.celtic.tier3.upgraded.ref.threequarter.png`; `support images/ChatGPT Image Sep 29, 2026, 03_35_41 PM-5.png` |
| Cuts into | `creature.celtic.tier1.base.portrait.png`, `creature.celtic.tier1.upgraded.portrait.png`, `creature.celtic.tier2.base.portrait.png`, `creature.celtic.tier2.upgraded.portrait.png`, `creature.celtic.tier3.base.portrait.png`, `creature.celtic.tier3.upgraded.portrait.png` |
| Status | missing (stand-in portraits in the game) |

```text
Using the attached canonical references, paint one sheet of square creature portraits for Pantheon Realms (Celtic).
Image 1024 × 1536 px (or larger, same proportions): 2 columns × 3 rows of equal square paintings separated by thin straight black gutters. No labels, no numbers, no text.
Row 1, left: Pooka — A black long-eared creature, half hare and half goat, with golden eyes.
Row 1, right: Elder Pooka — A great dark horse-goat with curling horns and a shaggy mane.
Row 2, left: Cu Sith — A shaggy dark-green hound the size of a calf with a braided tail.
Row 2, right: Great Cu Sith — A massive green hound with glowing eyes and a silver torc collar.
Row 3, left: Kelpie — A grey horse with a dripping weed-tangled mane and hooves turned backwards.
Row 3, right: Dread Kelpie — A black water-horse with sea-green eyes and a mane like streaming kelp.
Each portrait: head and shoulders (a large creature: head and upper body), three-quarter view facing right, dramatic painterly light, a soft background in the pantheon's colours; the exact design, materials and colours of its reference; readable when reduced to 48 px. No frame, no border, no text.
```

### B · `sheet.portrait.celtic.2.png`

| Field | Value |
|---|---|
| Contains | row 1: Banshee (base) · Battle Banshee (upgraded)<br>row 2: Selkie (base) · Storm Selkie (upgraded)<br>row 3: Horned Stag Spirit (base) · Great Stag Spirit (upgraded) |
| Image | 1024 × 1536 px (about 1.6 MP) or larger with the same proportions — 2 columns × 3 rows, cells 512 × 512 px |
| Background | opaque: each cell its own painted background; a thin straight black gutter (about 1 % of the width) between cells |
| Attach | `assets-source/creatures/reference/creature.celtic.tier4.base.ref.threequarter.png`; `assets-source/creatures/reference/creature.celtic.tier4.upgraded.ref.threequarter.png`; `assets-source/creatures/reference/creature.celtic.tier5.base.ref.threequarter.png`; `assets-source/creatures/reference/creature.celtic.tier5.upgraded.ref.threequarter.png`; `assets-source/creatures/reference/creature.celtic.tier6.base.ref.threequarter.png`; `assets-source/creatures/reference/creature.celtic.tier6.upgraded.ref.threequarter.png`; `support images/ChatGPT Image Sep 29, 2026, 03_35_41 PM-5.png` |
| Cuts into | `creature.celtic.tier4.base.portrait.png`, `creature.celtic.tier4.upgraded.portrait.png`, `creature.celtic.tier5.base.portrait.png`, `creature.celtic.tier5.upgraded.portrait.png`, `creature.celtic.tier6.base.portrait.png`, `creature.celtic.tier6.upgraded.portrait.png` |
| Status | missing (stand-in portraits in the game) |

```text
Using the attached canonical references, paint one sheet of square creature portraits for Pantheon Realms (Celtic).
Image 1024 × 1536 px (or larger, same proportions): 2 columns × 3 rows of equal square paintings separated by thin straight black gutters. No labels, no numbers, no text.
Row 1, left: Banshee — A pale grey-cloaked woman with long silver hair, mouth open in a cry.
Row 1, right: Battle Banshee — A banshee in torn battle-red wrappings, hair streaming like smoke.
Row 2, left: Selkie — A great grey seal with a human gaze, rising from surf onto rocks.
Row 2, right: Storm Selkie — A dark storm-grey selkie with a mantle of spray and sea-glass eyes.
Row 3, left: Horned Stag Spirit — A huge white stag with moss-hung antlers and a faint green glow.
Row 3, right: Great Stag Spirit — A stag of pale gold with an antler crown hung with leaves and stars.
Each portrait: head and shoulders (a large creature: head and upper body), three-quarter view facing right, dramatic painterly light, a soft background in the pantheon's colours; the exact design, materials and colours of its reference; readable when reduced to 48 px. No frame, no border, no text.
```

### B · `sheet.portrait.celtic.3.png`

| Field | Value |
|---|---|
| Contains | row 1: Fomorian Giant (base) · Ancient Fomorian (upgraded) |
| Image | 1776 × 888 px (about 1.6 MP) or larger with the same proportions — 2 columns × 1 rows, cells 888 × 888 px |
| Background | opaque: each cell its own painted background; a thin straight black gutter (about 1 % of the width) between cells |
| Attach | `assets-source/creatures/reference/creature.celtic.tier7.base.ref.threequarter.png`; `assets-source/creatures/reference/creature.celtic.tier7.upgraded.ref.threequarter.png`; `support images/ChatGPT Image Sep 29, 2026, 03_35_41 PM-5.png` |
| Cuts into | `creature.celtic.tier7.base.portrait.png`, `creature.celtic.tier7.upgraded.portrait.png` |
| Status | missing (stand-in portraits in the game) |

```text
Using the attached canonical references, paint one sheet of square creature portraits for Pantheon Realms (Celtic).
Image 1776 × 888 px (or larger, same proportions): 2 columns × 1 rows of equal square paintings separated by thin straight black gutters. No labels, no numbers, no text.
Row 1, left: Fomorian Giant — A towering giant with barnacled skin, a single great eye and a driftwood club.
Row 1, right: Ancient Fomorian — An ancient sea-giant crowned with coral, a whale-jaw club over one shoulder.
Each portrait: head and shoulders (a large creature: head and upper body), three-quarter view facing right, dramatic painterly light, a soft background in the pantheon's colours; the exact design, materials and colours of its reference; readable when reduced to 48 px. No frame, no border, no text.
```

### B · `sheet.portrait.mesoamerican.1.png`

| Field | Value |
|---|---|
| Contains | row 1: Feathered Serpent (base) · Celestial Feathered Serpent (upgraded)<br>row 2: Jaguar Spirit (base) · Sun Jaguar (upgraded)<br>row 3: Eagle Warrior Spirit (base) · Solar Eagle Warrior (upgraded) |
| Image | 1024 × 1536 px (about 1.6 MP) or larger with the same proportions — 2 columns × 3 rows, cells 512 × 512 px |
| Background | opaque: each cell its own painted background; a thin straight black gutter (about 1 % of the width) between cells |
| Attach | `assets-source/creatures/reference/creature.mesoamerican.tier1.base.ref.threequarter.png`; `assets-source/creatures/reference/creature.mesoamerican.tier1.upgraded.ref.threequarter.png`; `assets-source/creatures/reference/creature.mesoamerican.tier2.base.ref.threequarter.png`; `assets-source/creatures/reference/creature.mesoamerican.tier2.upgraded.ref.threequarter.png`; `assets-source/creatures/reference/creature.mesoamerican.tier3.base.ref.threequarter.png`; `assets-source/creatures/reference/creature.mesoamerican.tier3.upgraded.ref.threequarter.png`; `support images/ChatGPT Image Sep 29, 2026, 03_35_45 PM-6.png` |
| Cuts into | `creature.mesoamerican.tier1.base.portrait.png`, `creature.mesoamerican.tier1.upgraded.portrait.png`, `creature.mesoamerican.tier2.base.portrait.png`, `creature.mesoamerican.tier2.upgraded.portrait.png`, `creature.mesoamerican.tier3.base.portrait.png`, `creature.mesoamerican.tier3.upgraded.portrait.png` |
| Status | missing (stand-in portraits in the game) |

```text
Using the attached canonical references, paint one sheet of square creature portraits for Pantheon Realms (Mesoamerican).
Image 1024 × 1536 px (or larger, same proportions): 2 columns × 3 rows of equal square paintings separated by thin straight black gutters. No labels, no numbers, no text.
Row 1, left: Feathered Serpent — A green serpent with a ruff of quetzal feathers around its head.
Row 1, right: Celestial Feathered Serpent — A turquoise serpent with long feathered wings spread against a gold sky.
Row 2, left: Jaguar Spirit — A black-spotted golden jaguar with jade eyes, crouched to spring.
Row 2, right: Sun Jaguar — A bright-gold jaguar with a sun-disc pattern across its shoulders.
Row 3, left: Eagle Warrior Spirit — A warrior in a feathered eagle-head helmet holding an atlatl and darts.
Row 3, right: Solar Eagle Warrior — An eagle warrior in golden feathers with a sun-ray shield and a bundle of darts.
Each portrait: head and shoulders (a large creature: head and upper body), three-quarter view facing right, dramatic painterly light, a soft background in the pantheon's colours; the exact design, materials and colours of its reference; readable when reduced to 48 px. No frame, no border, no text.
```

### B · `sheet.portrait.mesoamerican.2.png`

| Field | Value |
|---|---|
| Contains | row 1: Cenote Crocodile (base) · Temple Crocodile (upgraded)<br>row 2: Camazotz (base) · Blood Moon Camazotz (upgraded)<br>row 3: Xiuhcoatl (base) · Divine Xiuhcoatl (upgraded) |
| Image | 1024 × 1536 px (about 1.6 MP) or larger with the same proportions — 2 columns × 3 rows, cells 512 × 512 px |
| Background | opaque: each cell its own painted background; a thin straight black gutter (about 1 % of the width) between cells |
| Attach | `assets-source/creatures/reference/creature.mesoamerican.tier4.base.ref.threequarter.png`; `assets-source/creatures/reference/creature.mesoamerican.tier4.upgraded.ref.threequarter.png`; `assets-source/creatures/reference/creature.mesoamerican.tier5.base.ref.threequarter.png`; `assets-source/creatures/reference/creature.mesoamerican.tier5.upgraded.ref.threequarter.png`; `assets-source/creatures/reference/creature.mesoamerican.tier6.base.ref.threequarter.png`; `assets-source/creatures/reference/creature.mesoamerican.tier6.upgraded.ref.threequarter.png`; `support images/ChatGPT Image Sep 29, 2026, 03_35_45 PM-6.png` |
| Cuts into | `creature.mesoamerican.tier4.base.portrait.png`, `creature.mesoamerican.tier4.upgraded.portrait.png`, `creature.mesoamerican.tier5.base.portrait.png`, `creature.mesoamerican.tier5.upgraded.portrait.png`, `creature.mesoamerican.tier6.base.portrait.png`, `creature.mesoamerican.tier6.upgraded.portrait.png` |
| Status | missing (stand-in portraits in the game) |

```text
Using the attached canonical references, paint one sheet of square creature portraits for Pantheon Realms (Mesoamerican).
Image 1024 × 1536 px (or larger, same proportions): 2 columns × 3 rows of equal square paintings separated by thin straight black gutters. No labels, no numbers, no text.
Row 1, left: Cenote Crocodile — A dark crocodile with jade-green scutes emerging from still blue water.
Row 1, right: Temple Crocodile — A great crocodile with carved jade plates bound to its back.
Row 2, left: Camazotz — A tall bat-headed figure with leathery wings and an obsidian blade.
Row 2, right: Blood Moon Camazotz — A crimson-winged bat spirit silhouetted against a red moon.
Row 3, left: Xiuhcoatl — A turquoise serpent with a flaming, segmented tail and a snout curling upward.
Row 3, right: Divine Xiuhcoatl — A blazing blue-and-gold serpent wreathed in a corona of fire.
Each portrait: head and shoulders (a large creature: head and upper body), three-quarter view facing right, dramatic painterly light, a soft background in the pantheon's colours; the exact design, materials and colours of its reference; readable when reduced to 48 px. No frame, no border, no text.
```

### B · `sheet.portrait.mesoamerican.3.png`

| Field | Value |
|---|---|
| Contains | row 1: Stone Colossus (base) · Sun Colossus (upgraded) |
| Image | 1776 × 888 px (about 1.6 MP) or larger with the same proportions — 2 columns × 1 rows, cells 888 × 888 px |
| Background | opaque: each cell its own painted background; a thin straight black gutter (about 1 % of the width) between cells |
| Attach | `assets-source/creatures/reference/creature.mesoamerican.tier7.base.ref.threequarter.png`; `assets-source/creatures/reference/creature.mesoamerican.tier7.upgraded.ref.threequarter.png`; `support images/ChatGPT Image Sep 29, 2026, 03_35_45 PM-6.png` |
| Cuts into | `creature.mesoamerican.tier7.base.portrait.png`, `creature.mesoamerican.tier7.upgraded.portrait.png` |
| Status | missing (stand-in portraits in the game) |

```text
Using the attached canonical references, paint one sheet of square creature portraits for Pantheon Realms (Mesoamerican).
Image 1776 × 888 px (or larger, same proportions): 2 columns × 1 rows of equal square paintings separated by thin straight black gutters. No labels, no numbers, no text.
Row 1, left: Stone Colossus — A towering basalt warrior statue with a feathered headdress and a stone shield.
Row 1, right: Sun Colossus — A colossal statue with glowing gold glyphs and a sun-disc on its chest.
Each portrait: head and shoulders (a large creature: head and upper body), three-quarter view facing right, dramatic painterly light, a soft background in the pantheon's colours; the exact design, materials and colours of its reference; readable when reduced to 48 px. No frame, no border, no text.
```

### B · `sheet.portrait.neutral.1.png`

| Field | Value |
|---|---|
| Contains | row 1: Brigand (base) · Brigand Cutthroat (upgraded)<br>row 2: Hill Slinger (base) · Sling Master (upgraded)<br>row 3: Wild Boar (base) · Great Tusked Boar (upgraded) |
| Image | 1024 × 1536 px (about 1.6 MP) or larger with the same proportions — 2 columns × 3 rows, cells 512 × 512 px |
| Background | opaque: each cell its own painted background; a thin straight black gutter (about 1 % of the width) between cells |
| Attach | `assets-source/creatures/reference/creature.neutral.brigand.base.ref.threequarter.png`; `assets-source/creatures/reference/creature.neutral.brigand.upgraded.ref.threequarter.png`; `assets-source/creatures/reference/creature.neutral.hill_slinger.base.ref.threequarter.png`; `assets-source/creatures/reference/creature.neutral.hill_slinger.upgraded.ref.threequarter.png`; `assets-source/creatures/reference/creature.neutral.wild_boar.base.ref.threequarter.png`; `assets-source/creatures/reference/creature.neutral.wild_boar.upgraded.ref.threequarter.png` |
| Cuts into | `creature.neutral.brigand.base.portrait.png`, `creature.neutral.brigand.upgraded.portrait.png`, `creature.neutral.hill_slinger.base.portrait.png`, `creature.neutral.hill_slinger.upgraded.portrait.png`, `creature.neutral.wild_boar.base.portrait.png`, `creature.neutral.wild_boar.upgraded.portrait.png` |
| Status | missing (stand-in portraits in the game) |

```text
Using the attached canonical references, paint one sheet of square creature portraits for Pantheon Realms (Neutral).
Image 1024 × 1536 px (or larger, same proportions): 2 columns × 3 rows of equal square paintings separated by thin straight black gutters. No labels, no numbers, no text.
Row 1, left: Brigand — A ragged fighter with a hooded cloak, a short spear and a mismatched shield.
Row 1, right: Brigand Cutthroat — A lean outlaw in a dark scarf with a notched spear and a dented round shield.
Row 2, left: Hill Slinger — A shepherd in a wool cloak whirling a leather sling, a pouch of stones at the belt.
Row 2, right: Sling Master — A slinger with a braided double sling and a bag of lead shot.
Row 3, left: Wild Boar — A bristling dark boar with curved tusks, head lowered to charge.
Row 3, right: Great Tusked Boar — A huge scarred boar with long ivory tusks and a ridge of grey bristles.
Each portrait: head and shoulders (a large creature: head and upper body), three-quarter view facing right, dramatic painterly light, a soft background in the pantheon's colours; the exact design, materials and colours of its reference; readable when reduced to 48 px. No frame, no border, no text.
```

### B · `sheet.portrait.neutral.2.png`

| Field | Value |
|---|---|
| Contains | row 1: Centaur (base) · Centaur Sentinel (upgraded)<br>row 2: Clay Golem (base) · Bronze Golem (upgraded)<br>row 3: Wyvern (base) · Wyvern Matriarch (upgraded) |
| Image | 1024 × 1536 px (about 1.6 MP) or larger with the same proportions — 2 columns × 3 rows, cells 512 × 512 px |
| Background | opaque: each cell its own painted background; a thin straight black gutter (about 1 % of the width) between cells |
| Attach | `assets-source/creatures/reference/creature.neutral.centaur.base.ref.threequarter.png`; `assets-source/creatures/reference/creature.neutral.centaur.upgraded.ref.threequarter.png`; `assets-source/creatures/reference/creature.neutral.clay_golem.base.ref.threequarter.png`; `assets-source/creatures/reference/creature.neutral.clay_golem.upgraded.ref.threequarter.png`; `assets-source/creatures/reference/creature.neutral.wyvern.base.ref.threequarter.png`; `assets-source/creatures/reference/creature.neutral.wyvern.upgraded.ref.threequarter.png` |
| Cuts into | `creature.neutral.centaur.base.portrait.png`, `creature.neutral.centaur.upgraded.portrait.png`, `creature.neutral.clay_golem.base.portrait.png`, `creature.neutral.clay_golem.upgraded.portrait.png`, `creature.neutral.wyvern.base.portrait.png`, `creature.neutral.wyvern.upgraded.portrait.png` |
| Status | missing (stand-in portraits in the game) |

```text
Using the attached canonical references, paint one sheet of square creature portraits for Pantheon Realms (Neutral).
Image 1024 × 1536 px (or larger, same proportions): 2 columns × 3 rows of equal square paintings separated by thin straight black gutters. No labels, no numbers, no text.
Row 1, left: Centaur — A centaur with a chestnut coat, simple chest protection and a melee spear.
Row 1, right: Centaur Sentinel — A centaur with foreleg protection, a tied crest and a reinforced spearhead.
Row 2, left: Clay Golem — A heavy figure of red fired clay with a blank face and a sigil pressed into its chest.
Row 2, right: Bronze Golem — A clay golem plated in green-patinated bronze, with riveted shoulders.
Row 3, left: Wyvern — A lean two-legged winged dragon with leathery wings and a barbed tail.
Row 3, right: Wyvern Matriarch — A larger wyvern with a frilled crest and torn, battle-scarred wings.
Each portrait: head and shoulders (a large creature: head and upper body), three-quarter view facing right, dramatic painterly light, a soft background in the pantheon's colours; the exact design, materials and colours of its reference; readable when reduced to 48 px. No frame, no border, no text.
```

### B · `sheet.portrait.neutral.3.png`

| Field | Value |
|---|---|
| Contains | row 1: Ogre (base) · Ogre Chieftain (upgraded)<br>row 2: Basilisk (base) · Greater Basilisk (upgraded)<br>row 3: Elder Drake (base) · Ancient Drake (upgraded) |
| Image | 1024 × 1536 px (about 1.6 MP) or larger with the same proportions — 2 columns × 3 rows, cells 512 × 512 px |
| Background | opaque: each cell its own painted background; a thin straight black gutter (about 1 % of the width) between cells |
| Attach | `assets-source/creatures/reference/creature.neutral.ogre.base.ref.threequarter.png`; `assets-source/creatures/reference/creature.neutral.ogre.upgraded.ref.threequarter.png`; `assets-source/creatures/reference/creature.neutral.basilisk.base.ref.threequarter.png`; `assets-source/creatures/reference/creature.neutral.basilisk.upgraded.ref.threequarter.png`; `assets-source/creatures/reference/creature.neutral.elder_drake.base.ref.threequarter.png`; `assets-source/creatures/reference/creature.neutral.elder_drake.upgraded.ref.threequarter.png` |
| Cuts into | `creature.neutral.ogre.base.portrait.png`, `creature.neutral.ogre.upgraded.portrait.png`, `creature.neutral.basilisk.base.portrait.png`, `creature.neutral.basilisk.upgraded.portrait.png`, `creature.neutral.elder_drake.base.portrait.png`, `creature.neutral.elder_drake.upgraded.portrait.png` |
| Status | missing (stand-in portraits in the game) |

```text
Using the attached canonical references, paint one sheet of square creature portraits for Pantheon Realms (Neutral).
Image 1024 × 1536 px (or larger, same proportions): 2 columns × 3 rows of equal square paintings separated by thin straight black gutters. No labels, no numbers, no text.
Row 1, left: Ogre — A towering brute in hides with a knotted club over one shoulder.
Row 1, right: Ogre Chieftain — A scarred ogre wearing a crown of bent iron and a cloak of bear fur.
Row 2, left: Basilisk — A great scaled serpent with a crest like a crown and pale, staring eyes.
Row 2, right: Greater Basilisk — A larger basilisk with stone-grey scales and a ring of horns around its crown.
Row 3, left: Elder Drake — A massive four-legged dragon with bronze scales and folded wings over a heap of coins.
Row 3, right: Ancient Drake — An immense dragon with horn-crowned head and scales dulled to dark gold by age.
Each portrait: head and shoulders (a large creature: head and upper body), three-quarter view facing right, dramatic painterly light, a soft background in the pantheon's colours; the exact design, materials and colours of its reference; readable when reduced to 48 px. No frame, no border, no text.
```

## Group C — Battle animation sheets (one per creature form)

One sheet holds **every animation the form has** — one row per animation, 6 cells per row (two short animations share a row: `defend` cells 1–3 and `hit` cells 4–6; `takeoff` cells 1–3 and `landing` cells 4–6). The rows come from the form's gameplay content: the base rows for everyone; `shoot` for shooters; `takeoff`/`landing` and `fly` for Flight; `ability` for an active ability; no creature casts spells in battle. Cells are as wide as 2.13 hex widths (one-hex creatures) or 3.2 hex widths (two-hex creatures); the ground line is at **90 % of each cell's height**; the creature faces right and stands centred in its cell. Cut into `sprite.<form>.<animation>.png` strips (`assets-source/sprites/final/`).

Frame rates the game plays (from `sheet-layouts.json`): idle 6 frames at 3 fps, move 6 frames at 8 fps, attack 6 frames at 6 fps, shoot 6 frames at 6 fps, defend 3 frames at 8 fps, hit 3 frames at 10 fps, death 6 frames at 5 fps, victory 6 frames at 4 fps, takeoff 3 frames at 8 fps, fly 6 frames at 10 fps, landing 3 frames at 8 fps, ability 6 frames at 6 fps. Airborne frames (`takeoff` end, `fly`, `landing` start) hover with the feet about 15 % of the cell height above the ground line; the game adds the flight arc.

### C · Pooka — Celtic, tier 1, base form

| Field | Value |
|---|---|
| Sheet file | `sheet.creature.celtic.tier1.base.png` |
| Creature | `celtic_pooka` · Shape-shifter · occupies 1 hex · Shapeshift (Hare) (active) |
| Rows | 1. idle (6)<br>2. move (6)<br>3. attack (6)<br>4. defend (3) + hit (3)<br>5. death (6)<br>6. victory (6)<br>7. ability (6) |
| Image | 1160 × 1352 px (about 1.6 MP) or larger with the same proportions — 6 columns × 7 rows, cells 193 × 193 px<br>or two parts for sharper frames: `sheet.creature.celtic.tier1.base.part1.png` rows 1–4, 1536 × 1024 px; `sheet.creature.celtic.tier1.base.part2.png` rows 5–7, 1776 × 888 px |
| Scale | a cell is 2.13 hex widths wide and 2.13 tall; ground line at 90 % of the cell height; the creature stands about 42 % of the cell height |
| Attach | `assets-source/creatures/reference/creature.celtic.tier1.base.ref.threequarter.png` (canonical master — Group A first); `support images/ChatGPT Image Sep 29, 2026, 03_35_41 PM-5.png` |
| Cuts into | 8 strips: `sprite.creature.celtic.tier1.base.idle.png`, `sprite.creature.celtic.tier1.base.move.png`, `sprite.creature.celtic.tier1.base.attack.png`, `sprite.creature.celtic.tier1.base.defend.png`, `sprite.creature.celtic.tier1.base.hit.png`, `sprite.creature.celtic.tier1.base.death.png`, `sprite.creature.celtic.tier1.base.victory.png`, `sprite.creature.celtic.tier1.base.ability.png` |
| Status | idle placeholder, move placeholder, attack placeholder, defend placeholder, hit placeholder, death placeholder, victory placeholder, ability placeholder |

```text
Using the attached canonical reference of Pooka, create one animation sheet for Pantheon Realms.
The creature: Pooka — A black long-eared creature, half hare and half goat, with golden eyes.
Image 1160 × 1352 px (or larger, same proportions): an invisible grid of 6 columns × 7 rows of equal cells, each cell 2.13 hex widths wide. No grid lines, no borders, no labels, no numbers, no text. Every item stays inside its own cell with clear empty space around it; nothing touches or crosses a cell edge.
Each row is one animation; its frames run left to right:
Row 1 — idle (6 frames, loops): 1) neutral stance · 2) breathing in, chest rising · 3) breath held, weight shifts slightly forward · 4) small head turn · 5) breathing out, chest sinking · 6) settling back to neutral (loops into frame 1)
Row 2 — move (6 frames, loops): 1) front left foot down · 2) pushing off · 3) legs gathered · 4) front right foot down · 5) pushing off · 6) legs stretched (loops)
Row 3 — attack (6 frames): 1) ready stance · 2) anticipation: draws back, coiled · 3) strike: lunges forward and bites, claws raking · 4) impact pose, fully extended · 5) follow-through · 6) recovering to the ready stance
Row 4 — defend (cells 1–3): 1) ready stance · 2) lowers its head and braces · 3) braced (held) | hit (cells 4–6): 1) struck: jolts back · 2) recoils, flinching · 3) steadies
Row 5 — death (6 frames, last frame held): 1) struck a final time · 2) staggers back · 3) legs buckle · 4) falls · 5) hits the ground · 6) lying still on the ground (held: the body stays on the battlefield)
Row 6 — victory (6 frames, loops): 1) begins a triumphant gesture · 2) raises weapon, head or wings high · 3) peak of the gesture · 4) holds · 5) lowers slightly · 6) raises again (loops into frame 2)
Row 7 — ability (6 frames): 1) ready stance · 2) begins to use Shapeshift (Hare) (Slips into a hare’s shape to outrun the line) · 3) builds up · 4) the ability takes effect (a short glow around the creature; no text) · 5) glow fading · 6) recovering to the ready stance
In every frame: the exact same Pooka, same size, same anatomy, armour, equipment, materials and lighting; it faces right; its feet stand on the cell's ground line at 90% of the cell height, centred in the cell; it stands about 42% of the cell height tall.
Fixed elevated side / three-quarter strategy-game camera (about 20° above the horizon), the same in every cell.
Modern high-resolution pre-rendered fantasy strategy-game sprite style. Strong readable silhouette. Moderate detail appropriate for gameplay scale.
Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). No ground, no shadows, no environment, no text.
```

### C · Elder Pooka — Celtic, tier 1, upgraded form

| Field | Value |
|---|---|
| Sheet file | `sheet.creature.celtic.tier1.upgraded.png` |
| Creature | `celtic_elder_pooka` · Shape-shifter · occupies 1 hex · Charge Guard (passive) · Shapeshift (Hare) (active) |
| Rows | 1. idle (6)<br>2. move (6)<br>3. attack (6)<br>4. defend (3) + hit (3)<br>5. death (6)<br>6. victory (6)<br>7. ability (6) |
| Image | 1160 × 1352 px (about 1.6 MP) or larger with the same proportions — 6 columns × 7 rows, cells 193 × 193 px<br>or two parts for sharper frames: `sheet.creature.celtic.tier1.upgraded.part1.png` rows 1–4, 1536 × 1024 px; `sheet.creature.celtic.tier1.upgraded.part2.png` rows 5–7, 1776 × 888 px |
| Scale | a cell is 2.13 hex widths wide and 2.13 tall; ground line at 90 % of the cell height; the creature stands about 44 % of the cell height |
| Attach | `sheet.creature.celtic.tier1.base.png` (the base form's sheet — same layout and poses); `assets-source/creatures/reference/creature.celtic.tier1.upgraded.ref.threequarter.png` (canonical master — Group A first); `support images/ChatGPT Image Sep 29, 2026, 03_35_41 PM-5.png` |
| Cuts into | 8 strips: `sprite.creature.celtic.tier1.upgraded.idle.png`, `sprite.creature.celtic.tier1.upgraded.move.png`, `sprite.creature.celtic.tier1.upgraded.attack.png`, `sprite.creature.celtic.tier1.upgraded.defend.png`, `sprite.creature.celtic.tier1.upgraded.hit.png`, `sprite.creature.celtic.tier1.upgraded.death.png`, `sprite.creature.celtic.tier1.upgraded.victory.png`, `sprite.creature.celtic.tier1.upgraded.ability.png` |
| Status | idle placeholder, move placeholder, attack placeholder, defend placeholder, hit placeholder, death placeholder, victory placeholder, ability placeholder |

```text
Using the attached animation sheet of Pooka and the canonical reference of Elder Pooka, create the same animation sheet for Elder Pooka, its upgraded form, for Pantheon Realms.
Keep the attached sheet's layout, every frame's pose, timing, camera, scale and place in its cell; change only the creature design to the upgraded form.
The creature: Elder Pooka — A great dark horse-goat with curling horns and a shaggy mane.
Image 1160 × 1352 px (or larger, same proportions): an invisible grid of 6 columns × 7 rows of equal cells, each cell 2.13 hex widths wide. No grid lines, no borders, no labels, no numbers, no text. Every item stays inside its own cell with clear empty space around it; nothing touches or crosses a cell edge.
Each row is one animation; its frames run left to right:
Row 1 — idle (6 frames, loops): 1) neutral stance · 2) breathing in, chest rising · 3) breath held, weight shifts slightly forward · 4) small head turn · 5) breathing out, chest sinking · 6) settling back to neutral (loops into frame 1)
Row 2 — move (6 frames, loops): 1) front left foot down · 2) pushing off · 3) legs gathered · 4) front right foot down · 5) pushing off · 6) legs stretched (loops)
Row 3 — attack (6 frames): 1) ready stance · 2) anticipation: draws back, coiled · 3) strike: lunges forward and bites, claws raking · 4) impact pose, fully extended · 5) follow-through · 6) recovering to the ready stance
Row 4 — defend (cells 1–3): 1) ready stance · 2) lowers its head and braces · 3) braced (held) | hit (cells 4–6): 1) struck: jolts back · 2) recoils, flinching · 3) steadies
Row 5 — death (6 frames, last frame held): 1) struck a final time · 2) staggers back · 3) legs buckle · 4) falls · 5) hits the ground · 6) lying still on the ground (held: the body stays on the battlefield)
Row 6 — victory (6 frames, loops): 1) begins a triumphant gesture · 2) raises weapon, head or wings high · 3) peak of the gesture · 4) holds · 5) lowers slightly · 6) raises again (loops into frame 2)
Row 7 — ability (6 frames): 1) ready stance · 2) begins to use Shapeshift (Hare) (Slips into a hare’s shape to outrun the line) · 3) builds up · 4) the ability takes effect (a short glow around the creature; no text) · 5) glow fading · 6) recovering to the ready stance
In every frame: the exact same Elder Pooka, same size, same anatomy, armour, equipment, materials and lighting; it faces right; its feet stand on the cell's ground line at 90% of the cell height, centred in the cell; it stands about 44% of the cell height tall.
Fixed elevated side / three-quarter strategy-game camera (about 20° above the horizon), the same in every cell.
Modern high-resolution pre-rendered fantasy strategy-game sprite style. Strong readable silhouette. Moderate detail appropriate for gameplay scale.
Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). No ground, no shadows, no environment, no text.
```

### C · Cu Sith — Celtic, tier 2, base form

| Field | Value |
|---|---|
| Sheet file | `sheet.creature.celtic.tier2.base.png` |
| Creature | `celtic_cu_sith` · Otherworld hound · occupies 1 hex · Charge (passive) |
| Rows | 1. idle (6)<br>2. move (6)<br>3. attack (6)<br>4. defend (3) + hit (3)<br>5. death (6)<br>6. victory (6) |
| Image | 1256 × 1256 px (about 1.6 MP) or larger with the same proportions — 6 columns × 6 rows, cells 209 × 209 px |
| Scale | a cell is 2.13 hex widths wide and 2.13 tall; ground line at 90 % of the cell height; the creature stands about 44 % of the cell height |
| Attach | `assets-source/creatures/reference/creature.celtic.tier2.base.ref.threequarter.png` (canonical master — Group A first); `support images/ChatGPT Image Sep 29, 2026, 03_35_41 PM-5.png` |
| Cuts into | 7 strips: `sprite.creature.celtic.tier2.base.idle.png`, `sprite.creature.celtic.tier2.base.move.png`, `sprite.creature.celtic.tier2.base.attack.png`, `sprite.creature.celtic.tier2.base.defend.png`, `sprite.creature.celtic.tier2.base.hit.png`, `sprite.creature.celtic.tier2.base.death.png`, `sprite.creature.celtic.tier2.base.victory.png` |
| Status | idle placeholder, move placeholder, attack placeholder, defend placeholder, hit placeholder, death placeholder, victory placeholder |

```text
Using the attached canonical reference of Cu Sith, create one animation sheet for Pantheon Realms.
The creature: Cu Sith — A shaggy dark-green hound the size of a calf with a braided tail.
Image 1256 × 1256 px (or larger, same proportions): an invisible grid of 6 columns × 6 rows of equal cells, each cell 2.13 hex widths wide. No grid lines, no borders, no labels, no numbers, no text. Every item stays inside its own cell with clear empty space around it; nothing touches or crosses a cell edge.
Each row is one animation; its frames run left to right:
Row 1 — idle (6 frames, loops): 1) neutral stance · 2) breathing in, chest rising · 3) breath held, weight shifts slightly forward · 4) small head turn · 5) breathing out, chest sinking · 6) settling back to neutral (loops into frame 1)
Row 2 — move (6 frames, loops): 1) front left foot down · 2) pushing off · 3) legs gathered · 4) front right foot down · 5) pushing off · 6) legs stretched (loops)
Row 3 — attack (6 frames): 1) ready stance · 2) anticipation: draws back, coiled · 3) strike: lunges forward and bites, claws raking · 4) impact pose, fully extended · 5) follow-through · 6) recovering to the ready stance
Row 4 — defend (cells 1–3): 1) ready stance · 2) lowers its head and braces · 3) braced (held) | hit (cells 4–6): 1) struck: jolts back · 2) recoils, flinching · 3) steadies
Row 5 — death (6 frames, last frame held): 1) struck a final time · 2) staggers back · 3) legs buckle · 4) falls · 5) hits the ground · 6) lying still on the ground (held: the body stays on the battlefield)
Row 6 — victory (6 frames, loops): 1) begins a triumphant gesture · 2) raises weapon, head or wings high · 3) peak of the gesture · 4) holds · 5) lowers slightly · 6) raises again (loops into frame 2)
In every frame: the exact same Cu Sith, same size, same anatomy, armour, equipment, materials and lighting; it faces right; its feet stand on the cell's ground line at 90% of the cell height, centred in the cell; it stands about 44% of the cell height tall.
Fixed elevated side / three-quarter strategy-game camera (about 20° above the horizon), the same in every cell.
Modern high-resolution pre-rendered fantasy strategy-game sprite style. Strong readable silhouette. Moderate detail appropriate for gameplay scale.
Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). No ground, no shadows, no environment, no text.
```

### C · Great Cu Sith — Celtic, tier 2, upgraded form

| Field | Value |
|---|---|
| Sheet file | `sheet.creature.celtic.tier2.upgraded.png` |
| Creature | `celtic_great_cu_sith` · Otherworld hound · occupies 1 hex · Charge (passive) |
| Rows | 1. idle (6)<br>2. move (6)<br>3. attack (6)<br>4. defend (3) + hit (3)<br>5. death (6)<br>6. victory (6) |
| Image | 1256 × 1256 px (about 1.6 MP) or larger with the same proportions — 6 columns × 6 rows, cells 209 × 209 px |
| Scale | a cell is 2.13 hex widths wide and 2.13 tall; ground line at 90 % of the cell height; the creature stands about 46 % of the cell height |
| Attach | `sheet.creature.celtic.tier2.base.png` (the base form's sheet — same layout and poses); `assets-source/creatures/reference/creature.celtic.tier2.upgraded.ref.threequarter.png` (canonical master — Group A first); `support images/ChatGPT Image Sep 29, 2026, 03_35_41 PM-5.png` |
| Cuts into | 7 strips: `sprite.creature.celtic.tier2.upgraded.idle.png`, `sprite.creature.celtic.tier2.upgraded.move.png`, `sprite.creature.celtic.tier2.upgraded.attack.png`, `sprite.creature.celtic.tier2.upgraded.defend.png`, `sprite.creature.celtic.tier2.upgraded.hit.png`, `sprite.creature.celtic.tier2.upgraded.death.png`, `sprite.creature.celtic.tier2.upgraded.victory.png` |
| Status | idle placeholder, move placeholder, attack placeholder, defend placeholder, hit placeholder, death placeholder, victory placeholder |

```text
Using the attached animation sheet of Cu Sith and the canonical reference of Great Cu Sith, create the same animation sheet for Great Cu Sith, its upgraded form, for Pantheon Realms.
Keep the attached sheet's layout, every frame's pose, timing, camera, scale and place in its cell; change only the creature design to the upgraded form.
The creature: Great Cu Sith — A massive green hound with glowing eyes and a silver torc collar.
Image 1256 × 1256 px (or larger, same proportions): an invisible grid of 6 columns × 6 rows of equal cells, each cell 2.13 hex widths wide. No grid lines, no borders, no labels, no numbers, no text. Every item stays inside its own cell with clear empty space around it; nothing touches or crosses a cell edge.
Each row is one animation; its frames run left to right:
Row 1 — idle (6 frames, loops): 1) neutral stance · 2) breathing in, chest rising · 3) breath held, weight shifts slightly forward · 4) small head turn · 5) breathing out, chest sinking · 6) settling back to neutral (loops into frame 1)
Row 2 — move (6 frames, loops): 1) front left foot down · 2) pushing off · 3) legs gathered · 4) front right foot down · 5) pushing off · 6) legs stretched (loops)
Row 3 — attack (6 frames): 1) ready stance · 2) anticipation: draws back, coiled · 3) strike: lunges forward and bites, claws raking · 4) impact pose, fully extended · 5) follow-through · 6) recovering to the ready stance
Row 4 — defend (cells 1–3): 1) ready stance · 2) lowers its head and braces · 3) braced (held) | hit (cells 4–6): 1) struck: jolts back · 2) recoils, flinching · 3) steadies
Row 5 — death (6 frames, last frame held): 1) struck a final time · 2) staggers back · 3) legs buckle · 4) falls · 5) hits the ground · 6) lying still on the ground (held: the body stays on the battlefield)
Row 6 — victory (6 frames, loops): 1) begins a triumphant gesture · 2) raises weapon, head or wings high · 3) peak of the gesture · 4) holds · 5) lowers slightly · 6) raises again (loops into frame 2)
In every frame: the exact same Great Cu Sith, same size, same anatomy, armour, equipment, materials and lighting; it faces right; its feet stand on the cell's ground line at 90% of the cell height, centred in the cell; it stands about 46% of the cell height tall.
Fixed elevated side / three-quarter strategy-game camera (about 20° above the horizon), the same in every cell.
Modern high-resolution pre-rendered fantasy strategy-game sprite style. Strong readable silhouette. Moderate detail appropriate for gameplay scale.
Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). No ground, no shadows, no environment, no text.
```

### C · Kelpie — Celtic, tier 3, base form

| Field | Value |
|---|---|
| Sheet file | `sheet.creature.celtic.tier3.base.png` |
| Creature | `celtic_kelpie` · Water horse · occupies 2 hexes · Charge (passive) · Shapeshift (Water-horse) (active) |
| Rows | 1. idle (6)<br>2. move (6)<br>3. attack (6)<br>4. defend (3) + hit (3)<br>5. death (6)<br>6. victory (6)<br>7. ability (6) |
| Image | 1424 × 1104 px (about 1.6 MP) or larger with the same proportions — 6 columns × 7 rows, cells 237 × 158 px<br>or two parts for sharper frames: `sheet.creature.celtic.tier3.base.part1.png` rows 1–4, 1880 × 840 px; `sheet.creature.celtic.tier3.base.part2.png` rows 5–7, 2176 × 728 px |
| Scale | a cell is 3.20 hex widths wide and 2.13 tall; ground line at 90 % of the cell height; the creature stands about 45 % of the cell height |
| Attach | `assets-source/creatures/reference/creature.celtic.tier3.base.ref.threequarter.png` (canonical master — Group A first); `support images/ChatGPT Image Sep 29, 2026, 03_35_41 PM-5.png` |
| Cuts into | 8 strips: `sprite.creature.celtic.tier3.base.idle.png`, `sprite.creature.celtic.tier3.base.move.png`, `sprite.creature.celtic.tier3.base.attack.png`, `sprite.creature.celtic.tier3.base.defend.png`, `sprite.creature.celtic.tier3.base.hit.png`, `sprite.creature.celtic.tier3.base.death.png`, `sprite.creature.celtic.tier3.base.victory.png`, `sprite.creature.celtic.tier3.base.ability.png` |
| Status | idle placeholder, move placeholder, attack placeholder, defend placeholder, hit placeholder, death placeholder, victory placeholder, ability placeholder |

```text
Using the attached canonical reference of Kelpie, create one animation sheet for Pantheon Realms.
The creature: Kelpie — A grey horse with a dripping weed-tangled mane and hooves turned backwards.
Image 1424 × 1104 px (or larger, same proportions): an invisible grid of 6 columns × 7 rows of equal cells, each cell 3.20 hex widths wide. No grid lines, no borders, no labels, no numbers, no text. Every item stays inside its own cell with clear empty space around it; nothing touches or crosses a cell edge.
Each row is one animation; its frames run left to right:
Row 1 — idle (6 frames, loops): 1) neutral stance · 2) breathing in, chest rising · 3) breath held, weight shifts slightly forward · 4) small head turn · 5) breathing out, chest sinking · 6) settling back to neutral (loops into frame 1)
Row 2 — move (6 frames, loops): 1) front left foot down · 2) pushing off · 3) legs gathered · 4) front right foot down · 5) pushing off · 6) legs stretched (loops)
Row 3 — attack (6 frames): 1) ready stance · 2) anticipation: draws back, coiled · 3) strike: lunges forward and bites, claws raking · 4) impact pose, fully extended · 5) follow-through · 6) recovering to the ready stance
Row 4 — defend (cells 1–3): 1) ready stance · 2) lowers its head and braces · 3) braced (held) | hit (cells 4–6): 1) struck: jolts back · 2) recoils, flinching · 3) steadies
Row 5 — death (6 frames, last frame held): 1) struck a final time · 2) staggers back · 3) legs buckle · 4) falls · 5) hits the ground · 6) lying still on the ground (held: the body stays on the battlefield)
Row 6 — victory (6 frames, loops): 1) begins a triumphant gesture · 2) raises weapon, head or wings high · 3) peak of the gesture · 4) holds · 5) lowers slightly · 6) raises again (loops into frame 2)
Row 7 — ability (6 frames): 1) ready stance · 2) begins to use Shapeshift (Water-horse) (Becomes the drowning horse of the loch) · 3) builds up · 4) the ability takes effect (a short glow around the creature; no text) · 5) glow fading · 6) recovering to the ready stance
In every frame: the exact same Kelpie, same size, same anatomy, armour, equipment, materials and lighting; it faces right; its feet stand on the cell's ground line at 90% of the cell height, centred in the cell; it stands about 45% of the cell height tall.
Fixed elevated side / three-quarter strategy-game camera (about 20° above the horizon), the same in every cell.
Modern high-resolution pre-rendered fantasy strategy-game sprite style. Strong readable silhouette. Moderate detail appropriate for gameplay scale.
Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). No ground, no shadows, no environment, no text.
```

### C · Dread Kelpie — Celtic, tier 3, upgraded form

| Field | Value |
|---|---|
| Sheet file | `sheet.creature.celtic.tier3.upgraded.png` |
| Creature | `celtic_dread_kelpie` · Water horse · occupies 2 hexes · Charge (passive) · Charge Guard (passive) · Shapeshift (Water-horse) (active) |
| Rows | 1. idle (6)<br>2. move (6)<br>3. attack (6)<br>4. defend (3) + hit (3)<br>5. death (6)<br>6. victory (6)<br>7. ability (6) |
| Image | 1424 × 1104 px (about 1.6 MP) or larger with the same proportions — 6 columns × 7 rows, cells 237 × 158 px<br>or two parts for sharper frames: `sheet.creature.celtic.tier3.upgraded.part1.png` rows 1–4, 1880 × 840 px; `sheet.creature.celtic.tier3.upgraded.part2.png` rows 5–7, 2176 × 728 px |
| Scale | a cell is 3.20 hex widths wide and 2.13 tall; ground line at 90 % of the cell height; the creature stands about 47 % of the cell height |
| Attach | `sheet.creature.celtic.tier3.base.png` (the base form's sheet — same layout and poses); `assets-source/creatures/reference/creature.celtic.tier3.upgraded.ref.threequarter.png` (canonical master — Group A first); `support images/ChatGPT Image Sep 29, 2026, 03_35_41 PM-5.png` |
| Cuts into | 8 strips: `sprite.creature.celtic.tier3.upgraded.idle.png`, `sprite.creature.celtic.tier3.upgraded.move.png`, `sprite.creature.celtic.tier3.upgraded.attack.png`, `sprite.creature.celtic.tier3.upgraded.defend.png`, `sprite.creature.celtic.tier3.upgraded.hit.png`, `sprite.creature.celtic.tier3.upgraded.death.png`, `sprite.creature.celtic.tier3.upgraded.victory.png`, `sprite.creature.celtic.tier3.upgraded.ability.png` |
| Status | idle placeholder, move placeholder, attack placeholder, defend placeholder, hit placeholder, death placeholder, victory placeholder, ability placeholder |

```text
Using the attached animation sheet of Kelpie and the canonical reference of Dread Kelpie, create the same animation sheet for Dread Kelpie, its upgraded form, for Pantheon Realms.
Keep the attached sheet's layout, every frame's pose, timing, camera, scale and place in its cell; change only the creature design to the upgraded form.
The creature: Dread Kelpie — A black water-horse with sea-green eyes and a mane like streaming kelp.
Image 1424 × 1104 px (or larger, same proportions): an invisible grid of 6 columns × 7 rows of equal cells, each cell 3.20 hex widths wide. No grid lines, no borders, no labels, no numbers, no text. Every item stays inside its own cell with clear empty space around it; nothing touches or crosses a cell edge.
Each row is one animation; its frames run left to right:
Row 1 — idle (6 frames, loops): 1) neutral stance · 2) breathing in, chest rising · 3) breath held, weight shifts slightly forward · 4) small head turn · 5) breathing out, chest sinking · 6) settling back to neutral (loops into frame 1)
Row 2 — move (6 frames, loops): 1) front left foot down · 2) pushing off · 3) legs gathered · 4) front right foot down · 5) pushing off · 6) legs stretched (loops)
Row 3 — attack (6 frames): 1) ready stance · 2) anticipation: draws back, coiled · 3) strike: lunges forward and bites, claws raking · 4) impact pose, fully extended · 5) follow-through · 6) recovering to the ready stance
Row 4 — defend (cells 1–3): 1) ready stance · 2) lowers its head and braces · 3) braced (held) | hit (cells 4–6): 1) struck: jolts back · 2) recoils, flinching · 3) steadies
Row 5 — death (6 frames, last frame held): 1) struck a final time · 2) staggers back · 3) legs buckle · 4) falls · 5) hits the ground · 6) lying still on the ground (held: the body stays on the battlefield)
Row 6 — victory (6 frames, loops): 1) begins a triumphant gesture · 2) raises weapon, head or wings high · 3) peak of the gesture · 4) holds · 5) lowers slightly · 6) raises again (loops into frame 2)
Row 7 — ability (6 frames): 1) ready stance · 2) begins to use Shapeshift (Water-horse) (Becomes the drowning horse of the loch) · 3) builds up · 4) the ability takes effect (a short glow around the creature; no text) · 5) glow fading · 6) recovering to the ready stance
In every frame: the exact same Dread Kelpie, same size, same anatomy, armour, equipment, materials and lighting; it faces right; its feet stand on the cell's ground line at 90% of the cell height, centred in the cell; it stands about 47% of the cell height tall.
Fixed elevated side / three-quarter strategy-game camera (about 20° above the horizon), the same in every cell.
Modern high-resolution pre-rendered fantasy strategy-game sprite style. Strong readable silhouette. Moderate detail appropriate for gameplay scale.
Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). No ground, no shadows, no environment, no text.
```

### C · Banshee — Celtic, tier 4, base form

| Field | Value |
|---|---|
| Sheet file | `sheet.creature.celtic.tier4.base.png` |
| Creature | `celtic_banshee` · Keening spirit (ranged) · occupies 1 hex · shoots (range 9) · Shooter (passive) · No Melee Penalty (passive) |
| Rows | 1. idle (6)<br>2. move (6)<br>3. attack (6)<br>4. defend (3) + hit (3)<br>5. death (6)<br>6. victory (6)<br>7. shoot (6) |
| Image | 1160 × 1352 px (about 1.6 MP) or larger with the same proportions — 6 columns × 7 rows, cells 193 × 193 px<br>or two parts for sharper frames: `sheet.creature.celtic.tier4.base.part1.png` rows 1–4, 1536 × 1024 px; `sheet.creature.celtic.tier4.base.part2.png` rows 5–7, 1776 × 888 px |
| Scale | a cell is 2.13 hex widths wide and 2.13 tall; ground line at 90 % of the cell height; the creature stands about 63 % of the cell height |
| Attach | `assets-source/creatures/reference/creature.celtic.tier4.base.ref.threequarter.png` (canonical master — Group A first); `support images/ChatGPT Image Sep 29, 2026, 03_35_41 PM-5.png` |
| Cuts into | 8 strips: `sprite.creature.celtic.tier4.base.idle.png`, `sprite.creature.celtic.tier4.base.move.png`, `sprite.creature.celtic.tier4.base.attack.png`, `sprite.creature.celtic.tier4.base.defend.png`, `sprite.creature.celtic.tier4.base.hit.png`, `sprite.creature.celtic.tier4.base.death.png`, `sprite.creature.celtic.tier4.base.victory.png`, `sprite.creature.celtic.tier4.base.shoot.png` |
| Status | idle placeholder, move placeholder, attack placeholder, defend placeholder, hit placeholder, death placeholder, victory placeholder, shoot placeholder |

```text
Using the attached canonical reference of Banshee, create one animation sheet for Pantheon Realms.
The creature: Banshee — A pale grey-cloaked woman with long silver hair, mouth open in a cry.
Image 1160 × 1352 px (or larger, same proportions): an invisible grid of 6 columns × 7 rows of equal cells, each cell 2.13 hex widths wide. No grid lines, no borders, no labels, no numbers, no text. Every item stays inside its own cell with clear empty space around it; nothing touches or crosses a cell edge.
Each row is one animation; its frames run left to right:
Row 1 — idle (6 frames, loops): 1) neutral stance · 2) breathing in, chest rising · 3) breath held, weight shifts slightly forward · 4) small head turn · 5) breathing out, chest sinking · 6) settling back to neutral (loops into frame 1)
Row 2 — move (6 frames, loops): 1) drifting forward, robes trailing · 2) rising slightly · 3) gliding · 4) sinking slightly · 5) drifting forward · 6) gliding (loops)
Row 3 — attack (6 frames): 1) ready stance · 2) anticipation: draws back, coiled · 3) strike: surges forward and rakes with spectral hands or claws · 4) impact pose, fully extended · 5) follow-through · 6) recovering to the ready stance
Row 4 — defend (cells 1–3): 1) ready stance · 2) lowers its head and braces · 3) braced (held) | hit (cells 4–6): 1) struck: jolts back · 2) recoils, flinching · 3) steadies
Row 5 — death (6 frames, last frame held): 1) struck a final time · 2) staggers back · 3) legs buckle · 4) falls · 5) hits the ground · 6) lying still on the ground (held: the body stays on the battlefield)
Row 6 — victory (6 frames, loops): 1) begins a triumphant gesture · 2) raises weapon, head or wings high · 3) peak of the gesture · 4) holds · 5) lowers slightly · 6) raises again (loops into frame 2)
Row 7 — shoot (6 frames): 1) ready stance · 2) draws or winds up, aiming · 3) release: makes its ranged attack with the weapon shown in the reference · 4) follow-through (the missile has left; the game draws it in flight) · 5) recoil · 6) recovering to the ready stance
In every frame: the exact same Banshee, same size, same anatomy, armour, equipment, materials and lighting; it faces right; its feet stand on the cell's ground line at 90% of the cell height, centred in the cell; it stands about 63% of the cell height tall.
Fixed elevated side / three-quarter strategy-game camera (about 20° above the horizon), the same in every cell.
Modern high-resolution pre-rendered fantasy strategy-game sprite style. Strong readable silhouette. Moderate detail appropriate for gameplay scale.
Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). No ground, no shadows, no environment, no text.
```

### C · Battle Banshee — Celtic, tier 4, upgraded form

| Field | Value |
|---|---|
| Sheet file | `sheet.creature.celtic.tier4.upgraded.png` |
| Creature | `celtic_battle_banshee` · Keening spirit (ranged) · occupies 1 hex · shoots (range 10) · Shooter (passive) · No Melee Penalty (passive) |
| Rows | 1. idle (6)<br>2. move (6)<br>3. attack (6)<br>4. defend (3) + hit (3)<br>5. death (6)<br>6. victory (6)<br>7. shoot (6) |
| Image | 1160 × 1352 px (about 1.6 MP) or larger with the same proportions — 6 columns × 7 rows, cells 193 × 193 px<br>or two parts for sharper frames: `sheet.creature.celtic.tier4.upgraded.part1.png` rows 1–4, 1536 × 1024 px; `sheet.creature.celtic.tier4.upgraded.part2.png` rows 5–7, 1776 × 888 px |
| Scale | a cell is 2.13 hex widths wide and 2.13 tall; ground line at 90 % of the cell height; the creature stands about 67 % of the cell height |
| Attach | `sheet.creature.celtic.tier4.base.png` (the base form's sheet — same layout and poses); `assets-source/creatures/reference/creature.celtic.tier4.upgraded.ref.threequarter.png` (canonical master — Group A first); `support images/ChatGPT Image Sep 29, 2026, 03_35_41 PM-5.png` |
| Cuts into | 8 strips: `sprite.creature.celtic.tier4.upgraded.idle.png`, `sprite.creature.celtic.tier4.upgraded.move.png`, `sprite.creature.celtic.tier4.upgraded.attack.png`, `sprite.creature.celtic.tier4.upgraded.defend.png`, `sprite.creature.celtic.tier4.upgraded.hit.png`, `sprite.creature.celtic.tier4.upgraded.death.png`, `sprite.creature.celtic.tier4.upgraded.victory.png`, `sprite.creature.celtic.tier4.upgraded.shoot.png` |
| Status | idle placeholder, move placeholder, attack placeholder, defend placeholder, hit placeholder, death placeholder, victory placeholder, shoot placeholder |

```text
Using the attached animation sheet of Banshee and the canonical reference of Battle Banshee, create the same animation sheet for Battle Banshee, its upgraded form, for Pantheon Realms.
Keep the attached sheet's layout, every frame's pose, timing, camera, scale and place in its cell; change only the creature design to the upgraded form.
The creature: Battle Banshee — A banshee in torn battle-red wrappings, hair streaming like smoke.
Image 1160 × 1352 px (or larger, same proportions): an invisible grid of 6 columns × 7 rows of equal cells, each cell 2.13 hex widths wide. No grid lines, no borders, no labels, no numbers, no text. Every item stays inside its own cell with clear empty space around it; nothing touches or crosses a cell edge.
Each row is one animation; its frames run left to right:
Row 1 — idle (6 frames, loops): 1) neutral stance · 2) breathing in, chest rising · 3) breath held, weight shifts slightly forward · 4) small head turn · 5) breathing out, chest sinking · 6) settling back to neutral (loops into frame 1)
Row 2 — move (6 frames, loops): 1) drifting forward, robes trailing · 2) rising slightly · 3) gliding · 4) sinking slightly · 5) drifting forward · 6) gliding (loops)
Row 3 — attack (6 frames): 1) ready stance · 2) anticipation: draws back, coiled · 3) strike: surges forward and rakes with spectral hands or claws · 4) impact pose, fully extended · 5) follow-through · 6) recovering to the ready stance
Row 4 — defend (cells 1–3): 1) ready stance · 2) lowers its head and braces · 3) braced (held) | hit (cells 4–6): 1) struck: jolts back · 2) recoils, flinching · 3) steadies
Row 5 — death (6 frames, last frame held): 1) struck a final time · 2) staggers back · 3) legs buckle · 4) falls · 5) hits the ground · 6) lying still on the ground (held: the body stays on the battlefield)
Row 6 — victory (6 frames, loops): 1) begins a triumphant gesture · 2) raises weapon, head or wings high · 3) peak of the gesture · 4) holds · 5) lowers slightly · 6) raises again (loops into frame 2)
Row 7 — shoot (6 frames): 1) ready stance · 2) draws or winds up, aiming · 3) release: makes its ranged attack with the weapon shown in the reference · 4) follow-through (the missile has left; the game draws it in flight) · 5) recoil · 6) recovering to the ready stance
In every frame: the exact same Battle Banshee, same size, same anatomy, armour, equipment, materials and lighting; it faces right; its feet stand on the cell's ground line at 90% of the cell height, centred in the cell; it stands about 67% of the cell height tall.
Fixed elevated side / three-quarter strategy-game camera (about 20° above the horizon), the same in every cell.
Modern high-resolution pre-rendered fantasy strategy-game sprite style. Strong readable silhouette. Moderate detail appropriate for gameplay scale.
Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). No ground, no shadows, no environment, no text.
```

### C · Selkie — Celtic, tier 5, base form

| Field | Value |
|---|---|
| Sheet file | `sheet.creature.celtic.tier5.base.png` |
| Creature | `celtic_selkie` · Sea guardian · occupies 2 hexes · Double Retaliation (passive) · Shapeshift (Seal-skin) (active) |
| Rows | 1. idle (6)<br>2. move (6)<br>3. attack (6)<br>4. defend (3) + hit (3)<br>5. death (6)<br>6. victory (6)<br>7. ability (6) |
| Image | 1424 × 1104 px (about 1.6 MP) or larger with the same proportions — 6 columns × 7 rows, cells 237 × 158 px<br>or two parts for sharper frames: `sheet.creature.celtic.tier5.base.part1.png` rows 1–4, 1880 × 840 px; `sheet.creature.celtic.tier5.base.part2.png` rows 5–7, 2176 × 728 px |
| Scale | a cell is 3.20 hex widths wide and 2.13 tall; ground line at 90 % of the cell height; the creature stands about 48 % of the cell height |
| Attach | `assets-source/creatures/reference/creature.celtic.tier5.base.ref.threequarter.png` (canonical master — Group A first); `support images/ChatGPT Image Sep 29, 2026, 03_35_41 PM-5.png` |
| Cuts into | 8 strips: `sprite.creature.celtic.tier5.base.idle.png`, `sprite.creature.celtic.tier5.base.move.png`, `sprite.creature.celtic.tier5.base.attack.png`, `sprite.creature.celtic.tier5.base.defend.png`, `sprite.creature.celtic.tier5.base.hit.png`, `sprite.creature.celtic.tier5.base.death.png`, `sprite.creature.celtic.tier5.base.victory.png`, `sprite.creature.celtic.tier5.base.ability.png` |
| Status | idle placeholder, move placeholder, attack placeholder, defend placeholder, hit placeholder, death placeholder, victory placeholder, ability placeholder |

```text
Using the attached canonical reference of Selkie, create one animation sheet for Pantheon Realms.
The creature: Selkie — A great grey seal with a human gaze, rising from surf onto rocks.
Image 1424 × 1104 px (or larger, same proportions): an invisible grid of 6 columns × 7 rows of equal cells, each cell 3.20 hex widths wide. No grid lines, no borders, no labels, no numbers, no text. Every item stays inside its own cell with clear empty space around it; nothing touches or crosses a cell edge.
Each row is one animation; its frames run left to right:
Row 1 — idle (6 frames, loops): 1) neutral stance · 2) breathing in, chest rising · 3) breath held, weight shifts slightly forward · 4) small head turn · 5) breathing out, chest sinking · 6) settling back to neutral (loops into frame 1)
Row 2 — move (6 frames, loops): 1) front left foot down · 2) pushing off · 3) legs gathered · 4) front right foot down · 5) pushing off · 6) legs stretched (loops)
Row 3 — attack (6 frames): 1) ready stance · 2) anticipation: draws back, coiled · 3) strike: lunges forward and bites, claws raking · 4) impact pose, fully extended · 5) follow-through · 6) recovering to the ready stance
Row 4 — defend (cells 1–3): 1) ready stance · 2) lowers its head and braces · 3) braced (held) | hit (cells 4–6): 1) struck: jolts back · 2) recoils, flinching · 3) steadies
Row 5 — death (6 frames, last frame held): 1) struck a final time · 2) staggers back · 3) legs buckle · 4) falls · 5) hits the ground · 6) lying still on the ground (held: the body stays on the battlefield)
Row 6 — victory (6 frames, loops): 1) begins a triumphant gesture · 2) raises weapon, head or wings high · 3) peak of the gesture · 4) holds · 5) lowers slightly · 6) raises again (loops into frame 2)
Row 7 — ability (6 frames): 1) ready stance · 2) begins to use Shapeshift (Seal-skin) (Pulls on the seal-skin and sets like a rock) · 3) builds up · 4) the ability takes effect (a short glow around the creature; no text) · 5) glow fading · 6) recovering to the ready stance
In every frame: the exact same Selkie, same size, same anatomy, armour, equipment, materials and lighting; it faces right; its feet stand on the cell's ground line at 90% of the cell height, centred in the cell; it stands about 48% of the cell height tall.
Fixed elevated side / three-quarter strategy-game camera (about 20° above the horizon), the same in every cell.
Modern high-resolution pre-rendered fantasy strategy-game sprite style. Strong readable silhouette. Moderate detail appropriate for gameplay scale.
Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). No ground, no shadows, no environment, no text.
```

### C · Storm Selkie — Celtic, tier 5, upgraded form

| Field | Value |
|---|---|
| Sheet file | `sheet.creature.celtic.tier5.upgraded.png` |
| Creature | `celtic_storm_selkie` · Sea guardian · occupies 2 hexes · Double Retaliation (passive) · Ward (active) · Shapeshift (Seal-skin) (active) |
| Rows | 1. idle (6)<br>2. move (6)<br>3. attack (6)<br>4. defend (3) + hit (3)<br>5. death (6)<br>6. victory (6)<br>7. ability (6) |
| Image | 1424 × 1104 px (about 1.6 MP) or larger with the same proportions — 6 columns × 7 rows, cells 237 × 158 px<br>or two parts for sharper frames: `sheet.creature.celtic.tier5.upgraded.part1.png` rows 1–4, 1880 × 840 px; `sheet.creature.celtic.tier5.upgraded.part2.png` rows 5–7, 2176 × 728 px |
| Scale | a cell is 3.20 hex widths wide and 2.13 tall; ground line at 90 % of the cell height; the creature stands about 50 % of the cell height |
| Attach | `sheet.creature.celtic.tier5.base.png` (the base form's sheet — same layout and poses); `assets-source/creatures/reference/creature.celtic.tier5.upgraded.ref.threequarter.png` (canonical master — Group A first); `support images/ChatGPT Image Sep 29, 2026, 03_35_41 PM-5.png` |
| Cuts into | 8 strips: `sprite.creature.celtic.tier5.upgraded.idle.png`, `sprite.creature.celtic.tier5.upgraded.move.png`, `sprite.creature.celtic.tier5.upgraded.attack.png`, `sprite.creature.celtic.tier5.upgraded.defend.png`, `sprite.creature.celtic.tier5.upgraded.hit.png`, `sprite.creature.celtic.tier5.upgraded.death.png`, `sprite.creature.celtic.tier5.upgraded.victory.png`, `sprite.creature.celtic.tier5.upgraded.ability.png` |
| Status | idle placeholder, move placeholder, attack placeholder, defend placeholder, hit placeholder, death placeholder, victory placeholder, ability placeholder |

```text
Using the attached animation sheet of Selkie and the canonical reference of Storm Selkie, create the same animation sheet for Storm Selkie, its upgraded form, for Pantheon Realms.
Keep the attached sheet's layout, every frame's pose, timing, camera, scale and place in its cell; change only the creature design to the upgraded form.
The creature: Storm Selkie — A dark storm-grey selkie with a mantle of spray and sea-glass eyes.
Image 1424 × 1104 px (or larger, same proportions): an invisible grid of 6 columns × 7 rows of equal cells, each cell 3.20 hex widths wide. No grid lines, no borders, no labels, no numbers, no text. Every item stays inside its own cell with clear empty space around it; nothing touches or crosses a cell edge.
Each row is one animation; its frames run left to right:
Row 1 — idle (6 frames, loops): 1) neutral stance · 2) breathing in, chest rising · 3) breath held, weight shifts slightly forward · 4) small head turn · 5) breathing out, chest sinking · 6) settling back to neutral (loops into frame 1)
Row 2 — move (6 frames, loops): 1) front left foot down · 2) pushing off · 3) legs gathered · 4) front right foot down · 5) pushing off · 6) legs stretched (loops)
Row 3 — attack (6 frames): 1) ready stance · 2) anticipation: draws back, coiled · 3) strike: lunges forward and bites, claws raking · 4) impact pose, fully extended · 5) follow-through · 6) recovering to the ready stance
Row 4 — defend (cells 1–3): 1) ready stance · 2) lowers its head and braces · 3) braced (held) | hit (cells 4–6): 1) struck: jolts back · 2) recoils, flinching · 3) steadies
Row 5 — death (6 frames, last frame held): 1) struck a final time · 2) staggers back · 3) legs buckle · 4) falls · 5) hits the ground · 6) lying still on the ground (held: the body stays on the battlefield)
Row 6 — victory (6 frames, loops): 1) begins a triumphant gesture · 2) raises weapon, head or wings high · 3) peak of the gesture · 4) holds · 5) lowers slightly · 6) raises again (loops into frame 2)
Row 7 — ability (6 frames): 1) ready stance · 2) begins to use Ward (Places a protective ward on a friendly stack); Shapeshift (Seal-skin) (Pulls on the seal-skin and sets like a rock) · 3) builds up · 4) the ability takes effect (a short glow around the creature; no text) · 5) glow fading · 6) recovering to the ready stance
In every frame: the exact same Storm Selkie, same size, same anatomy, armour, equipment, materials and lighting; it faces right; its feet stand on the cell's ground line at 90% of the cell height, centred in the cell; it stands about 50% of the cell height tall.
Fixed elevated side / three-quarter strategy-game camera (about 20° above the horizon), the same in every cell.
Modern high-resolution pre-rendered fantasy strategy-game sprite style. Strong readable silhouette. Moderate detail appropriate for gameplay scale.
Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). No ground, no shadows, no environment, no text.
```

### C · Horned Stag Spirit — Celtic, tier 6, base form

| Field | Value |
|---|---|
| Sheet file | `sheet.creature.celtic.tier6.base.png` |
| Creature | `celtic_horned_stag_spirit` · Forest charger · occupies 2 hexes · Charge (passive) · Shapeshift (Rut) (active) |
| Rows | 1. idle (6)<br>2. move (6)<br>3. attack (6)<br>4. defend (3) + hit (3)<br>5. death (6)<br>6. victory (6)<br>7. ability (6) |
| Image | 1424 × 1104 px (about 1.6 MP) or larger with the same proportions — 6 columns × 7 rows, cells 237 × 158 px<br>or two parts for sharper frames: `sheet.creature.celtic.tier6.base.part1.png` rows 1–4, 1880 × 840 px; `sheet.creature.celtic.tier6.base.part2.png` rows 5–7, 2176 × 728 px |
| Scale | a cell is 3.20 hex widths wide and 2.13 tall; ground line at 90 % of the cell height; the creature stands about 49 % of the cell height |
| Attach | `assets-source/creatures/reference/creature.celtic.tier6.base.ref.threequarter.png` (canonical master — Group A first); `support images/ChatGPT Image Sep 29, 2026, 03_35_41 PM-5.png` |
| Cuts into | 8 strips: `sprite.creature.celtic.tier6.base.idle.png`, `sprite.creature.celtic.tier6.base.move.png`, `sprite.creature.celtic.tier6.base.attack.png`, `sprite.creature.celtic.tier6.base.defend.png`, `sprite.creature.celtic.tier6.base.hit.png`, `sprite.creature.celtic.tier6.base.death.png`, `sprite.creature.celtic.tier6.base.victory.png`, `sprite.creature.celtic.tier6.base.ability.png` |
| Status | idle placeholder, move placeholder, attack placeholder, defend placeholder, hit placeholder, death placeholder, victory placeholder, ability placeholder |

```text
Using the attached canonical reference of Horned Stag Spirit, create one animation sheet for Pantheon Realms.
The creature: Horned Stag Spirit — A huge white stag with moss-hung antlers and a faint green glow.
Image 1424 × 1104 px (or larger, same proportions): an invisible grid of 6 columns × 7 rows of equal cells, each cell 3.20 hex widths wide. No grid lines, no borders, no labels, no numbers, no text. Every item stays inside its own cell with clear empty space around it; nothing touches or crosses a cell edge.
Each row is one animation; its frames run left to right:
Row 1 — idle (6 frames, loops): 1) neutral stance · 2) breathing in, chest rising · 3) breath held, weight shifts slightly forward · 4) small head turn · 5) breathing out, chest sinking · 6) settling back to neutral (loops into frame 1)
Row 2 — move (6 frames, loops): 1) front left foot down · 2) pushing off · 3) legs gathered · 4) front right foot down · 5) pushing off · 6) legs stretched (loops)
Row 3 — attack (6 frames): 1) ready stance · 2) anticipation: draws back, coiled · 3) strike: lunges forward and bites, claws raking · 4) impact pose, fully extended · 5) follow-through · 6) recovering to the ready stance
Row 4 — defend (cells 1–3): 1) ready stance · 2) lowers its head and braces · 3) braced (held) | hit (cells 4–6): 1) struck: jolts back · 2) recoils, flinching · 3) steadies
Row 5 — death (6 frames, last frame held): 1) struck a final time · 2) staggers back · 3) legs buckle · 4) falls · 5) hits the ground · 6) lying still on the ground (held: the body stays on the battlefield)
Row 6 — victory (6 frames, loops): 1) begins a triumphant gesture · 2) raises weapon, head or wings high · 3) peak of the gesture · 4) holds · 5) lowers slightly · 6) raises again (loops into frame 2)
Row 7 — ability (6 frames): 1) ready stance · 2) begins to use Shapeshift (Rut) (The antlers lower; the forest charges) · 3) builds up · 4) the ability takes effect (a short glow around the creature; no text) · 5) glow fading · 6) recovering to the ready stance
In every frame: the exact same Horned Stag Spirit, same size, same anatomy, armour, equipment, materials and lighting; it faces right; its feet stand on the cell's ground line at 90% of the cell height, centred in the cell; it stands about 49% of the cell height tall.
Fixed elevated side / three-quarter strategy-game camera (about 20° above the horizon), the same in every cell.
Modern high-resolution pre-rendered fantasy strategy-game sprite style. Strong readable silhouette. Moderate detail appropriate for gameplay scale.
Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). No ground, no shadows, no environment, no text.
```

### C · Great Stag Spirit — Celtic, tier 6, upgraded form

| Field | Value |
|---|---|
| Sheet file | `sheet.creature.celtic.tier6.upgraded.png` |
| Creature | `celtic_great_stag_spirit` · Forest charger · occupies 2 hexes · Charge (passive) · Unyielding (passive) · Shapeshift (Rut) (active) |
| Rows | 1. idle (6)<br>2. move (6)<br>3. attack (6)<br>4. defend (3) + hit (3)<br>5. death (6)<br>6. victory (6)<br>7. ability (6) |
| Image | 1424 × 1104 px (about 1.6 MP) or larger with the same proportions — 6 columns × 7 rows, cells 237 × 158 px<br>or two parts for sharper frames: `sheet.creature.celtic.tier6.upgraded.part1.png` rows 1–4, 1880 × 840 px; `sheet.creature.celtic.tier6.upgraded.part2.png` rows 5–7, 2176 × 728 px |
| Scale | a cell is 3.20 hex widths wide and 2.13 tall; ground line at 90 % of the cell height; the creature stands about 51 % of the cell height |
| Attach | `sheet.creature.celtic.tier6.base.png` (the base form's sheet — same layout and poses); `assets-source/creatures/reference/creature.celtic.tier6.upgraded.ref.threequarter.png` (canonical master — Group A first); `support images/ChatGPT Image Sep 29, 2026, 03_35_41 PM-5.png` |
| Cuts into | 8 strips: `sprite.creature.celtic.tier6.upgraded.idle.png`, `sprite.creature.celtic.tier6.upgraded.move.png`, `sprite.creature.celtic.tier6.upgraded.attack.png`, `sprite.creature.celtic.tier6.upgraded.defend.png`, `sprite.creature.celtic.tier6.upgraded.hit.png`, `sprite.creature.celtic.tier6.upgraded.death.png`, `sprite.creature.celtic.tier6.upgraded.victory.png`, `sprite.creature.celtic.tier6.upgraded.ability.png` |
| Status | idle placeholder, move placeholder, attack placeholder, defend placeholder, hit placeholder, death placeholder, victory placeholder, ability placeholder |

```text
Using the attached animation sheet of Horned Stag Spirit and the canonical reference of Great Stag Spirit, create the same animation sheet for Great Stag Spirit, its upgraded form, for Pantheon Realms.
Keep the attached sheet's layout, every frame's pose, timing, camera, scale and place in its cell; change only the creature design to the upgraded form.
The creature: Great Stag Spirit — A stag of pale gold with an antler crown hung with leaves and stars.
Image 1424 × 1104 px (or larger, same proportions): an invisible grid of 6 columns × 7 rows of equal cells, each cell 3.20 hex widths wide. No grid lines, no borders, no labels, no numbers, no text. Every item stays inside its own cell with clear empty space around it; nothing touches or crosses a cell edge.
Each row is one animation; its frames run left to right:
Row 1 — idle (6 frames, loops): 1) neutral stance · 2) breathing in, chest rising · 3) breath held, weight shifts slightly forward · 4) small head turn · 5) breathing out, chest sinking · 6) settling back to neutral (loops into frame 1)
Row 2 — move (6 frames, loops): 1) front left foot down · 2) pushing off · 3) legs gathered · 4) front right foot down · 5) pushing off · 6) legs stretched (loops)
Row 3 — attack (6 frames): 1) ready stance · 2) anticipation: draws back, coiled · 3) strike: lunges forward and bites, claws raking · 4) impact pose, fully extended · 5) follow-through · 6) recovering to the ready stance
Row 4 — defend (cells 1–3): 1) ready stance · 2) lowers its head and braces · 3) braced (held) | hit (cells 4–6): 1) struck: jolts back · 2) recoils, flinching · 3) steadies
Row 5 — death (6 frames, last frame held): 1) struck a final time · 2) staggers back · 3) legs buckle · 4) falls · 5) hits the ground · 6) lying still on the ground (held: the body stays on the battlefield)
Row 6 — victory (6 frames, loops): 1) begins a triumphant gesture · 2) raises weapon, head or wings high · 3) peak of the gesture · 4) holds · 5) lowers slightly · 6) raises again (loops into frame 2)
Row 7 — ability (6 frames): 1) ready stance · 2) begins to use Shapeshift (Rut) (The antlers lower; the forest charges) · 3) builds up · 4) the ability takes effect (a short glow around the creature; no text) · 5) glow fading · 6) recovering to the ready stance
In every frame: the exact same Great Stag Spirit, same size, same anatomy, armour, equipment, materials and lighting; it faces right; its feet stand on the cell's ground line at 90% of the cell height, centred in the cell; it stands about 51% of the cell height tall.
Fixed elevated side / three-quarter strategy-game camera (about 20° above the horizon), the same in every cell.
Modern high-resolution pre-rendered fantasy strategy-game sprite style. Strong readable silhouette. Moderate detail appropriate for gameplay scale.
Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). No ground, no shadows, no environment, no text.
```

### C · Fomorian Giant — Celtic, tier 7, base form

| Field | Value |
|---|---|
| Sheet file | `sheet.creature.celtic.tier7.base.png` |
| Creature | `celtic_fomorian_giant` · Apex giant · occupies 2 hexes · Unyielding (passive) · Charge Guard (passive) |
| Rows | 1. idle (6)<br>2. move (6)<br>3. attack (6)<br>4. defend (3) + hit (3)<br>5. death (6)<br>6. victory (6) |
| Image | 1344 × 1176 px (about 1.6 MP) or larger with the same proportions — 6 columns × 6 rows, cells 224 × 196 px |
| Scale | a cell is 3.20 hex widths wide and 2.80 tall; ground line at 90 % of the cell height; the creature stands about 75 % of the cell height |
| Attach | `assets-source/creatures/reference/creature.celtic.tier7.base.ref.threequarter.png` (canonical master — Group A first); `support images/ChatGPT Image Sep 29, 2026, 03_35_41 PM-5.png` |
| Cuts into | 7 strips: `sprite.creature.celtic.tier7.base.idle.png`, `sprite.creature.celtic.tier7.base.move.png`, `sprite.creature.celtic.tier7.base.attack.png`, `sprite.creature.celtic.tier7.base.defend.png`, `sprite.creature.celtic.tier7.base.hit.png`, `sprite.creature.celtic.tier7.base.death.png`, `sprite.creature.celtic.tier7.base.victory.png` |
| Status | idle placeholder, move placeholder, attack placeholder, defend placeholder, hit placeholder, death placeholder, victory placeholder |

```text
Using the attached canonical reference of Fomorian Giant, create one animation sheet for Pantheon Realms.
The creature: Fomorian Giant — A towering giant with barnacled skin, a single great eye and a driftwood club.
Image 1344 × 1176 px (or larger, same proportions): an invisible grid of 6 columns × 6 rows of equal cells, each cell 3.20 hex widths wide. No grid lines, no borders, no labels, no numbers, no text. Every item stays inside its own cell with clear empty space around it; nothing touches or crosses a cell edge.
Each row is one animation; its frames run left to right:
Row 1 — idle (6 frames, loops): 1) neutral stance · 2) breathing in, chest rising · 3) breath held, weight shifts slightly forward · 4) small head turn · 5) breathing out, chest sinking · 6) settling back to neutral (loops into frame 1)
Row 2 — move (6 frames, loops): 1) right foot forward, heel down · 2) weight on the right foot · 3) left leg passing · 4) left foot forward, heel down · 5) weight on the left foot · 6) right leg passing (loops)
Row 3 — attack (6 frames): 1) ready stance · 2) anticipation: draws back, coiled · 3) strike: smashes down with its weapon or fists · 4) impact pose, fully extended · 5) follow-through · 6) recovering to the ready stance
Row 4 — defend (cells 1–3): 1) ready stance · 2) lowers its head and braces · 3) braced (held) | hit (cells 4–6): 1) struck: jolts back · 2) recoils, flinching · 3) steadies
Row 5 — death (6 frames, last frame held): 1) struck a final time · 2) staggers back · 3) legs buckle · 4) falls · 5) hits the ground · 6) lying still on the ground (held: the body stays on the battlefield)
Row 6 — victory (6 frames, loops): 1) begins a triumphant gesture · 2) raises weapon, head or wings high · 3) peak of the gesture · 4) holds · 5) lowers slightly · 6) raises again (loops into frame 2)
In every frame: the exact same Fomorian Giant, same size, same anatomy, armour, equipment, materials and lighting; it faces right; its feet stand on the cell's ground line at 90% of the cell height, centred in the cell; it stands about 75% of the cell height tall.
Fixed elevated side / three-quarter strategy-game camera (about 20° above the horizon), the same in every cell.
Modern high-resolution pre-rendered fantasy strategy-game sprite style. Strong readable silhouette. Moderate detail appropriate for gameplay scale.
Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). No ground, no shadows, no environment, no text.
```

### C · Ancient Fomorian — Celtic, tier 7, upgraded form

| Field | Value |
|---|---|
| Sheet file | `sheet.creature.celtic.tier7.upgraded.png` |
| Creature | `celtic_ancient_fomorian` · Apex giant · occupies 2 hexes · Unyielding (passive) · Charge Guard (passive) · Double Retaliation (passive) |
| Rows | 1. idle (6)<br>2. move (6)<br>3. attack (6)<br>4. defend (3) + hit (3)<br>5. death (6)<br>6. victory (6) |
| Image | 1320 × 1192 px (about 1.6 MP) or larger with the same proportions — 6 columns × 6 rows, cells 220 × 199 px |
| Scale | a cell is 3.20 hex widths wide and 2.90 tall; ground line at 90 % of the cell height; the creature stands about 76 % of the cell height |
| Attach | `sheet.creature.celtic.tier7.base.png` (the base form's sheet — same layout and poses); `assets-source/creatures/reference/creature.celtic.tier7.upgraded.ref.threequarter.png` (canonical master — Group A first); `support images/ChatGPT Image Sep 29, 2026, 03_35_41 PM-5.png` |
| Cuts into | 7 strips: `sprite.creature.celtic.tier7.upgraded.idle.png`, `sprite.creature.celtic.tier7.upgraded.move.png`, `sprite.creature.celtic.tier7.upgraded.attack.png`, `sprite.creature.celtic.tier7.upgraded.defend.png`, `sprite.creature.celtic.tier7.upgraded.hit.png`, `sprite.creature.celtic.tier7.upgraded.death.png`, `sprite.creature.celtic.tier7.upgraded.victory.png` |
| Status | idle placeholder, move placeholder, attack placeholder, defend placeholder, hit placeholder, death placeholder, victory placeholder |

```text
Using the attached animation sheet of Fomorian Giant and the canonical reference of Ancient Fomorian, create the same animation sheet for Ancient Fomorian, its upgraded form, for Pantheon Realms.
Keep the attached sheet's layout, every frame's pose, timing, camera, scale and place in its cell; change only the creature design to the upgraded form.
The creature: Ancient Fomorian — An ancient sea-giant crowned with coral, a whale-jaw club over one shoulder.
Image 1320 × 1192 px (or larger, same proportions): an invisible grid of 6 columns × 6 rows of equal cells, each cell 3.20 hex widths wide. No grid lines, no borders, no labels, no numbers, no text. Every item stays inside its own cell with clear empty space around it; nothing touches or crosses a cell edge.
Each row is one animation; its frames run left to right:
Row 1 — idle (6 frames, loops): 1) neutral stance · 2) breathing in, chest rising · 3) breath held, weight shifts slightly forward · 4) small head turn · 5) breathing out, chest sinking · 6) settling back to neutral (loops into frame 1)
Row 2 — move (6 frames, loops): 1) right foot forward, heel down · 2) weight on the right foot · 3) left leg passing · 4) left foot forward, heel down · 5) weight on the left foot · 6) right leg passing (loops)
Row 3 — attack (6 frames): 1) ready stance · 2) anticipation: draws back, coiled · 3) strike: smashes down with its weapon or fists · 4) impact pose, fully extended · 5) follow-through · 6) recovering to the ready stance
Row 4 — defend (cells 1–3): 1) ready stance · 2) lowers its head and braces · 3) braced (held) | hit (cells 4–6): 1) struck: jolts back · 2) recoils, flinching · 3) steadies
Row 5 — death (6 frames, last frame held): 1) struck a final time · 2) staggers back · 3) legs buckle · 4) falls · 5) hits the ground · 6) lying still on the ground (held: the body stays on the battlefield)
Row 6 — victory (6 frames, loops): 1) begins a triumphant gesture · 2) raises weapon, head or wings high · 3) peak of the gesture · 4) holds · 5) lowers slightly · 6) raises again (loops into frame 2)
In every frame: the exact same Ancient Fomorian, same size, same anatomy, armour, equipment, materials and lighting; it faces right; its feet stand on the cell's ground line at 90% of the cell height, centred in the cell; it stands about 76% of the cell height tall.
Fixed elevated side / three-quarter strategy-game camera (about 20° above the horizon), the same in every cell.
Modern high-resolution pre-rendered fantasy strategy-game sprite style. Strong readable silhouette. Moderate detail appropriate for gameplay scale.
Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). No ground, no shadows, no environment, no text.
```

### C · Sacred Scarab — Egyptian, tier 1, base form

| Field | Value |
|---|---|
| Sheet file | `sheet.creature.egyptian.tier1.base.png` |
| Creature | `egyptian_sacred_scarab` · Armored swarm · occupies 1 hex · Charge Guard (passive) |
| Rows | 1. idle (6)<br>2. move (6)<br>3. attack (6)<br>4. defend (3) + hit (3)<br>5. death (6)<br>6. victory (6) |
| Image | 1256 × 1256 px (about 1.6 MP) or larger with the same proportions — 6 columns × 6 rows, cells 209 × 209 px |
| Scale | a cell is 2.13 hex widths wide and 2.13 tall; ground line at 90 % of the cell height; the creature stands about 42 % of the cell height |
| Attach | `assets-source/creatures/reference/creature.egyptian.tier1.base.ref.threequarter.png` (canonical master); `assets-source/icons/final/creature.egyptian.tier1.base.portrait.png`; `support images/ChatGPT Image Sep 29, 2026, 03_35_35 PM-3.png` |
| Cuts into | 7 strips: `sprite.creature.egyptian.tier1.base.idle.png`, `sprite.creature.egyptian.tier1.base.move.png`, `sprite.creature.egyptian.tier1.base.attack.png`, `sprite.creature.egyptian.tier1.base.defend.png`, `sprite.creature.egyptian.tier1.base.hit.png`, `sprite.creature.egyptian.tier1.base.death.png`, `sprite.creature.egyptian.tier1.base.victory.png` |
| Status | idle placeholder, move missing, attack missing, defend missing, hit missing, death missing, victory missing |

```text
Using the attached canonical reference of Sacred Scarab, create one animation sheet for Pantheon Realms.
The creature: Sacred Scarab — A large dark-green scarab beetle with a gleaming carapace and forelegs raised.
Image 1256 × 1256 px (or larger, same proportions): an invisible grid of 6 columns × 6 rows of equal cells, each cell 2.13 hex widths wide. No grid lines, no borders, no labels, no numbers, no text. Every item stays inside its own cell with clear empty space around it; nothing touches or crosses a cell edge.
Each row is one animation; its frames run left to right:
Row 1 — idle (6 frames, loops): 1) neutral stance · 2) breathing in, chest rising · 3) breath held, weight shifts slightly forward · 4) small head turn · 5) breathing out, chest sinking · 6) settling back to neutral (loops into frame 1)
Row 2 — move (6 frames, loops): 1) front left foot down · 2) pushing off · 3) legs gathered · 4) front right foot down · 5) pushing off · 6) legs stretched (loops)
Row 3 — attack (6 frames): 1) ready stance · 2) anticipation: draws back, coiled · 3) strike: lunges forward and bites, claws raking · 4) impact pose, fully extended · 5) follow-through · 6) recovering to the ready stance
Row 4 — defend (cells 1–3): 1) ready stance · 2) lowers its head and braces · 3) braced (held) | hit (cells 4–6): 1) struck: jolts back · 2) recoils, flinching · 3) steadies
Row 5 — death (6 frames, last frame held): 1) struck a final time · 2) staggers back · 3) legs buckle · 4) falls · 5) hits the ground · 6) lying still on the ground (held: the body stays on the battlefield)
Row 6 — victory (6 frames, loops): 1) begins a triumphant gesture · 2) raises weapon, head or wings high · 3) peak of the gesture · 4) holds · 5) lowers slightly · 6) raises again (loops into frame 2)
In every frame: the exact same Sacred Scarab, same size, same anatomy, armour, equipment, materials and lighting; it faces right; its feet stand on the cell's ground line at 90% of the cell height, centred in the cell; it stands about 42% of the cell height tall.
Fixed elevated side / three-quarter strategy-game camera (about 20° above the horizon), the same in every cell.
Modern high-resolution pre-rendered fantasy strategy-game sprite style. Strong readable silhouette. Moderate detail appropriate for gameplay scale.
Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). No ground, no shadows, no environment, no text.
```

### C · Solar Scarab — Egyptian, tier 1, upgraded form

| Field | Value |
|---|---|
| Sheet file | `sheet.creature.egyptian.tier1.upgraded.png` |
| Creature | `egyptian_solar_scarab` · Armored swarm · occupies 1 hex · Charge Guard (passive) |
| Rows | 1. idle (6)<br>2. move (6)<br>3. attack (6)<br>4. defend (3) + hit (3)<br>5. death (6)<br>6. victory (6) |
| Image | 1256 × 1256 px (about 1.6 MP) or larger with the same proportions — 6 columns × 6 rows, cells 209 × 209 px |
| Scale | a cell is 2.13 hex widths wide and 2.13 tall; ground line at 90 % of the cell height; the creature stands about 44 % of the cell height |
| Attach | `sheet.creature.egyptian.tier1.base.png` (the base form's sheet — same layout and poses); `assets-source/creatures/reference/creature.egyptian.tier1.upgraded.ref.threequarter.png` (canonical master); `assets-source/icons/final/creature.egyptian.tier1.upgraded.portrait.png`; `support images/ChatGPT Image Sep 29, 2026, 03_35_35 PM-3.png` |
| Cuts into | 7 strips: `sprite.creature.egyptian.tier1.upgraded.idle.png`, `sprite.creature.egyptian.tier1.upgraded.move.png`, `sprite.creature.egyptian.tier1.upgraded.attack.png`, `sprite.creature.egyptian.tier1.upgraded.defend.png`, `sprite.creature.egyptian.tier1.upgraded.hit.png`, `sprite.creature.egyptian.tier1.upgraded.death.png`, `sprite.creature.egyptian.tier1.upgraded.victory.png` |
| Status | idle placeholder, move missing, attack missing, defend missing, hit missing, death missing, victory missing |

```text
Using the attached animation sheet of Sacred Scarab and the canonical reference of Solar Scarab, create the same animation sheet for Solar Scarab, its upgraded form, for Pantheon Realms.
Keep the attached sheet's layout, every frame's pose, timing, camera, scale and place in its cell; change only the creature design to the upgraded form.
The creature: Solar Scarab — A golden scarab holding a glowing sun-disc between its forelegs.
Image 1256 × 1256 px (or larger, same proportions): an invisible grid of 6 columns × 6 rows of equal cells, each cell 2.13 hex widths wide. No grid lines, no borders, no labels, no numbers, no text. Every item stays inside its own cell with clear empty space around it; nothing touches or crosses a cell edge.
Each row is one animation; its frames run left to right:
Row 1 — idle (6 frames, loops): 1) neutral stance · 2) breathing in, chest rising · 3) breath held, weight shifts slightly forward · 4) small head turn · 5) breathing out, chest sinking · 6) settling back to neutral (loops into frame 1)
Row 2 — move (6 frames, loops): 1) front left foot down · 2) pushing off · 3) legs gathered · 4) front right foot down · 5) pushing off · 6) legs stretched (loops)
Row 3 — attack (6 frames): 1) ready stance · 2) anticipation: draws back, coiled · 3) strike: lunges forward and bites, claws raking · 4) impact pose, fully extended · 5) follow-through · 6) recovering to the ready stance
Row 4 — defend (cells 1–3): 1) ready stance · 2) lowers its head and braces · 3) braced (held) | hit (cells 4–6): 1) struck: jolts back · 2) recoils, flinching · 3) steadies
Row 5 — death (6 frames, last frame held): 1) struck a final time · 2) staggers back · 3) legs buckle · 4) falls · 5) hits the ground · 6) lying still on the ground (held: the body stays on the battlefield)
Row 6 — victory (6 frames, loops): 1) begins a triumphant gesture · 2) raises weapon, head or wings high · 3) peak of the gesture · 4) holds · 5) lowers slightly · 6) raises again (loops into frame 2)
In every frame: the exact same Solar Scarab, same size, same anatomy, armour, equipment, materials and lighting; it faces right; its feet stand on the cell's ground line at 90% of the cell height, centred in the cell; it stands about 44% of the cell height tall.
Fixed elevated side / three-quarter strategy-game camera (about 20° above the horizon), the same in every cell.
Modern high-resolution pre-rendered fantasy strategy-game sprite style. Strong readable silhouette. Moderate detail appropriate for gameplay scale.
Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). No ground, no shadows, no environment, no text.
```

### C · Jackal Guardian — Egyptian, tier 2, base form

| Field | Value |
|---|---|
| Sheet file | `sheet.creature.egyptian.tier2.base.png` |
| Creature | `egyptian_jackal_guardian` · Javelin guard · occupies 1 hex · shoots (range 16) · Shooter (passive) |
| Rows | 1. idle (6)<br>2. move (6)<br>3. attack (6)<br>4. defend (3) + hit (3)<br>5. death (6)<br>6. victory (6)<br>7. shoot (6) |
| Image | 1160 × 1352 px (about 1.6 MP) or larger with the same proportions — 6 columns × 7 rows, cells 193 × 193 px<br>or two parts for sharper frames: `sheet.creature.egyptian.tier2.base.part1.png` rows 1–4, 1536 × 1024 px; `sheet.creature.egyptian.tier2.base.part2.png` rows 5–7, 1776 × 888 px |
| Scale | a cell is 2.13 hex widths wide and 2.13 tall; ground line at 90 % of the cell height; the creature stands about 53 % of the cell height |
| Attach | `assets-source/creatures/reference/creature.egyptian.tier2.base.ref.threequarter.png` (canonical master); `assets-source/icons/final/creature.egyptian.tier2.base.portrait.png`; `support images/ChatGPT Image Sep 29, 2026, 03_35_35 PM-3.png` |
| Cuts into | 8 strips: `sprite.creature.egyptian.tier2.base.idle.png`, `sprite.creature.egyptian.tier2.base.move.png`, `sprite.creature.egyptian.tier2.base.attack.png`, `sprite.creature.egyptian.tier2.base.defend.png`, `sprite.creature.egyptian.tier2.base.hit.png`, `sprite.creature.egyptian.tier2.base.death.png`, `sprite.creature.egyptian.tier2.base.victory.png`, `sprite.creature.egyptian.tier2.base.shoot.png` |
| Status | idle placeholder, move missing, attack missing, defend missing, hit missing, death missing, victory missing, shoot missing |

```text
Using the attached canonical reference of Jackal Guardian, create one animation sheet for Pantheon Realms.
The creature: Jackal Guardian — A jackal-headed warrior in a striped headdress with a bundle of javelins.
Image 1160 × 1352 px (or larger, same proportions): an invisible grid of 6 columns × 7 rows of equal cells, each cell 2.13 hex widths wide. No grid lines, no borders, no labels, no numbers, no text. Every item stays inside its own cell with clear empty space around it; nothing touches or crosses a cell edge.
Each row is one animation; its frames run left to right:
Row 1 — idle (6 frames, loops): 1) neutral stance · 2) breathing in, chest rising · 3) breath held, weight shifts slightly forward · 4) small head turn · 5) breathing out, chest sinking · 6) settling back to neutral (loops into frame 1)
Row 2 — move (6 frames, loops): 1) right foot forward, heel down · 2) weight on the right foot · 3) left leg passing · 4) left foot forward, heel down · 5) weight on the left foot · 6) right leg passing (loops)
Row 3 — attack (6 frames): 1) ready stance · 2) anticipation: draws back, coiled · 3) strike: jabs with a javelin or blade held close, guarding with its off arm · 4) impact pose, fully extended · 5) follow-through · 6) recovering to the ready stance
Row 4 — defend (cells 1–3): 1) ready stance · 2) raises its small shield or arm and crouches · 3) braced (held) | hit (cells 4–6): 1) struck: jolts back · 2) recoils, flinching · 3) steadies
Row 5 — death (6 frames, last frame held): 1) struck a final time · 2) staggers back · 3) legs buckle · 4) falls · 5) hits the ground · 6) lying still on the ground (held: the body stays on the battlefield)
Row 6 — victory (6 frames, loops): 1) begins a triumphant gesture · 2) raises weapon, head or wings high · 3) peak of the gesture · 4) holds · 5) lowers slightly · 6) raises again (loops into frame 2)
Row 7 — shoot (6 frames): 1) ready stance · 2) draws or winds up, aiming · 3) release: throws its ranged weapon (javelin, sling stone or arrow, as in the reference) · 4) follow-through (the missile has left; the game draws it in flight) · 5) recoil · 6) recovering to the ready stance
In every frame: the exact same Jackal Guardian, same size, same anatomy, armour, equipment, materials and lighting; it faces right; its feet stand on the cell's ground line at 90% of the cell height, centred in the cell; it stands about 53% of the cell height tall.
Fixed elevated side / three-quarter strategy-game camera (about 20° above the horizon), the same in every cell.
Modern high-resolution pre-rendered fantasy strategy-game sprite style. Strong readable silhouette. Moderate detail appropriate for gameplay scale.
Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). No ground, no shadows, no environment, no text.
```

### C · Anubian Warden — Egyptian, tier 2, upgraded form

| Field | Value |
|---|---|
| Sheet file | `sheet.creature.egyptian.tier2.upgraded.png` |
| Creature | `egyptian_anubian_warden` · Javelin guard · occupies 1 hex · shoots (range 17) · Shooter (passive) · No Melee Penalty (passive) |
| Rows | 1. idle (6)<br>2. move (6)<br>3. attack (6)<br>4. defend (3) + hit (3)<br>5. death (6)<br>6. victory (6)<br>7. shoot (6) |
| Image | 1160 × 1352 px (about 1.6 MP) or larger with the same proportions — 6 columns × 7 rows, cells 193 × 193 px<br>or two parts for sharper frames: `sheet.creature.egyptian.tier2.upgraded.part1.png` rows 1–4, 1536 × 1024 px; `sheet.creature.egyptian.tier2.upgraded.part2.png` rows 5–7, 1776 × 888 px |
| Scale | a cell is 2.13 hex widths wide and 2.13 tall; ground line at 90 % of the cell height; the creature stands about 55 % of the cell height |
| Attach | `sheet.creature.egyptian.tier2.base.png` (the base form's sheet — same layout and poses); `assets-source/creatures/reference/creature.egyptian.tier2.upgraded.ref.threequarter.png` (canonical master); `assets-source/icons/final/creature.egyptian.tier2.upgraded.portrait.png`; `support images/ChatGPT Image Sep 29, 2026, 03_35_35 PM-3.png` |
| Cuts into | 8 strips: `sprite.creature.egyptian.tier2.upgraded.idle.png`, `sprite.creature.egyptian.tier2.upgraded.move.png`, `sprite.creature.egyptian.tier2.upgraded.attack.png`, `sprite.creature.egyptian.tier2.upgraded.defend.png`, `sprite.creature.egyptian.tier2.upgraded.hit.png`, `sprite.creature.egyptian.tier2.upgraded.death.png`, `sprite.creature.egyptian.tier2.upgraded.victory.png`, `sprite.creature.egyptian.tier2.upgraded.shoot.png` |
| Status | idle placeholder, move missing, attack missing, defend missing, hit missing, death missing, victory missing, shoot missing |

```text
Using the attached animation sheet of Jackal Guardian and the canonical reference of Anubian Warden, create the same animation sheet for Anubian Warden, its upgraded form, for Pantheon Realms.
Keep the attached sheet's layout, every frame's pose, timing, camera, scale and place in its cell; change only the creature design to the upgraded form.
The creature: Anubian Warden — A black-furred jackal warrior in gold-banded armor with a javelin raised to throw.
Image 1160 × 1352 px (or larger, same proportions): an invisible grid of 6 columns × 7 rows of equal cells, each cell 2.13 hex widths wide. No grid lines, no borders, no labels, no numbers, no text. Every item stays inside its own cell with clear empty space around it; nothing touches or crosses a cell edge.
Each row is one animation; its frames run left to right:
Row 1 — idle (6 frames, loops): 1) neutral stance · 2) breathing in, chest rising · 3) breath held, weight shifts slightly forward · 4) small head turn · 5) breathing out, chest sinking · 6) settling back to neutral (loops into frame 1)
Row 2 — move (6 frames, loops): 1) right foot forward, heel down · 2) weight on the right foot · 3) left leg passing · 4) left foot forward, heel down · 5) weight on the left foot · 6) right leg passing (loops)
Row 3 — attack (6 frames): 1) ready stance · 2) anticipation: draws back, coiled · 3) strike: jabs with a javelin or blade held close, guarding with its off arm · 4) impact pose, fully extended · 5) follow-through · 6) recovering to the ready stance
Row 4 — defend (cells 1–3): 1) ready stance · 2) raises its small shield or arm and crouches · 3) braced (held) | hit (cells 4–6): 1) struck: jolts back · 2) recoils, flinching · 3) steadies
Row 5 — death (6 frames, last frame held): 1) struck a final time · 2) staggers back · 3) legs buckle · 4) falls · 5) hits the ground · 6) lying still on the ground (held: the body stays on the battlefield)
Row 6 — victory (6 frames, loops): 1) begins a triumphant gesture · 2) raises weapon, head or wings high · 3) peak of the gesture · 4) holds · 5) lowers slightly · 6) raises again (loops into frame 2)
Row 7 — shoot (6 frames): 1) ready stance · 2) draws or winds up, aiming · 3) release: throws its ranged weapon (javelin, sling stone or arrow, as in the reference) · 4) follow-through (the missile has left; the game draws it in flight) · 5) recoil · 6) recovering to the ready stance
In every frame: the exact same Anubian Warden, same size, same anatomy, armour, equipment, materials and lighting; it faces right; its feet stand on the cell's ground line at 90% of the cell height, centred in the cell; it stands about 55% of the cell height tall.
Fixed elevated side / three-quarter strategy-game camera (about 20° above the horizon), the same in every cell.
Modern high-resolution pre-rendered fantasy strategy-game sprite style. Strong readable silhouette. Moderate detail appropriate for gameplay scale.
Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). No ground, no shadows, no environment, no text.
```

### C · Ushabti — Egyptian, tier 3, base form

| Field | Value |
|---|---|
| Sheet file | `sheet.creature.egyptian.tier3.base.png` |
| Creature | `egyptian_ushabti` · Tireless construct · occupies 1 hex · Unyielding (passive) |
| Rows | 1. idle (6)<br>2. move (6)<br>3. attack (6)<br>4. defend (3) + hit (3)<br>5. death (6)<br>6. victory (6) |
| Image | 1232 × 1272 px (about 1.6 MP) or larger with the same proportions — 6 columns × 6 rows, cells 205 × 212 px |
| Scale | a cell is 2.13 hex widths wide and 2.20 tall; ground line at 90 % of the cell height; the creature stands about 76 % of the cell height |
| Attach | `assets-source/creatures/reference/creature.egyptian.tier3.base.ref.threequarter.png` (canonical master); `assets-source/icons/final/creature.egyptian.tier3.base.portrait.png`; `support images/ChatGPT Image Sep 29, 2026, 03_35_35 PM-3.png` |
| Cuts into | 7 strips: `sprite.creature.egyptian.tier3.base.idle.png`, `sprite.creature.egyptian.tier3.base.move.png`, `sprite.creature.egyptian.tier3.base.attack.png`, `sprite.creature.egyptian.tier3.base.defend.png`, `sprite.creature.egyptian.tier3.base.hit.png`, `sprite.creature.egyptian.tier3.base.death.png`, `sprite.creature.egyptian.tier3.base.victory.png` |
| Status | idle placeholder, move missing, attack missing, defend missing, hit missing, death missing, victory missing |

```text
Using the attached canonical reference of Ushabti, create one animation sheet for Pantheon Realms.
The creature: Ushabti — A mummiform blue-glazed figure holding a hoe and a basket, eyes painted wide.
Image 1232 × 1272 px (or larger, same proportions): an invisible grid of 6 columns × 6 rows of equal cells, each cell 2.13 hex widths wide. No grid lines, no borders, no labels, no numbers, no text. Every item stays inside its own cell with clear empty space around it; nothing touches or crosses a cell edge.
Each row is one animation; its frames run left to right:
Row 1 — idle (6 frames, loops): 1) neutral stance · 2) breathing in, chest rising · 3) breath held, weight shifts slightly forward · 4) small head turn · 5) breathing out, chest sinking · 6) settling back to neutral (loops into frame 1)
Row 2 — move (6 frames, loops): 1) right foot forward, heel down · 2) weight on the right foot · 3) left leg passing · 4) left foot forward, heel down · 5) weight on the left foot · 6) right leg passing (loops)
Row 3 — attack (6 frames): 1) ready stance · 2) anticipation: draws back, coiled · 3) strike: swings a massive arm in a crushing blow · 4) impact pose, fully extended · 5) follow-through · 6) recovering to the ready stance
Row 4 — defend (cells 1–3): 1) ready stance · 2) lowers its head and braces · 3) braced (held) | hit (cells 4–6): 1) struck: jolts back · 2) recoils, flinching · 3) steadies
Row 5 — death (6 frames, last frame held): 1) struck a final time · 2) staggers back · 3) legs buckle · 4) falls · 5) hits the ground · 6) lying still on the ground (held: the body stays on the battlefield)
Row 6 — victory (6 frames, loops): 1) begins a triumphant gesture · 2) raises weapon, head or wings high · 3) peak of the gesture · 4) holds · 5) lowers slightly · 6) raises again (loops into frame 2)
In every frame: the exact same Ushabti, same size, same anatomy, armour, equipment, materials and lighting; it faces right; its feet stand on the cell's ground line at 90% of the cell height, centred in the cell; it stands about 76% of the cell height tall.
Fixed elevated side / three-quarter strategy-game camera (about 20° above the horizon), the same in every cell.
Modern high-resolution pre-rendered fantasy strategy-game sprite style. Strong readable silhouette. Moderate detail appropriate for gameplay scale.
Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). No ground, no shadows, no environment, no text.
```

### C · Royal Ushabti — Egyptian, tier 3, upgraded form

| Field | Value |
|---|---|
| Sheet file | `sheet.creature.egyptian.tier3.upgraded.png` |
| Creature | `egyptian_royal_ushabti` · Tireless construct · occupies 1 hex · Unyielding (passive) · Charge Guard (passive) |
| Rows | 1. idle (6)<br>2. move (6)<br>3. attack (6)<br>4. defend (3) + hit (3)<br>5. death (6)<br>6. victory (6) |
| Image | 1208 × 1304 px (about 1.6 MP) or larger with the same proportions — 6 columns × 6 rows, cells 201 × 217 px |
| Scale | a cell is 2.13 hex widths wide and 2.30 tall; ground line at 90 % of the cell height; the creature stands about 76 % of the cell height |
| Attach | `sheet.creature.egyptian.tier3.base.png` (the base form's sheet — same layout and poses); `assets-source/creatures/reference/creature.egyptian.tier3.upgraded.ref.threequarter.png` (canonical master); `assets-source/icons/final/creature.egyptian.tier3.upgraded.portrait.png`; `support images/ChatGPT Image Sep 29, 2026, 03_35_35 PM-3.png` |
| Cuts into | 7 strips: `sprite.creature.egyptian.tier3.upgraded.idle.png`, `sprite.creature.egyptian.tier3.upgraded.move.png`, `sprite.creature.egyptian.tier3.upgraded.attack.png`, `sprite.creature.egyptian.tier3.upgraded.defend.png`, `sprite.creature.egyptian.tier3.upgraded.hit.png`, `sprite.creature.egyptian.tier3.upgraded.death.png`, `sprite.creature.egyptian.tier3.upgraded.victory.png` |
| Status | idle placeholder, move missing, attack missing, defend missing, hit missing, death missing, victory missing |

```text
Using the attached animation sheet of Ushabti and the canonical reference of Royal Ushabti, create the same animation sheet for Royal Ushabti, its upgraded form, for Pantheon Realms.
Keep the attached sheet's layout, every frame's pose, timing, camera, scale and place in its cell; change only the creature design to the upgraded form.
The creature: Royal Ushabti — A tall gilded ushabti with a royal headdress and rows of hieroglyphs on its body.
Image 1208 × 1304 px (or larger, same proportions): an invisible grid of 6 columns × 6 rows of equal cells, each cell 2.13 hex widths wide. No grid lines, no borders, no labels, no numbers, no text. Every item stays inside its own cell with clear empty space around it; nothing touches or crosses a cell edge.
Each row is one animation; its frames run left to right:
Row 1 — idle (6 frames, loops): 1) neutral stance · 2) breathing in, chest rising · 3) breath held, weight shifts slightly forward · 4) small head turn · 5) breathing out, chest sinking · 6) settling back to neutral (loops into frame 1)
Row 2 — move (6 frames, loops): 1) right foot forward, heel down · 2) weight on the right foot · 3) left leg passing · 4) left foot forward, heel down · 5) weight on the left foot · 6) right leg passing (loops)
Row 3 — attack (6 frames): 1) ready stance · 2) anticipation: draws back, coiled · 3) strike: swings a massive arm in a crushing blow · 4) impact pose, fully extended · 5) follow-through · 6) recovering to the ready stance
Row 4 — defend (cells 1–3): 1) ready stance · 2) lowers its head and braces · 3) braced (held) | hit (cells 4–6): 1) struck: jolts back · 2) recoils, flinching · 3) steadies
Row 5 — death (6 frames, last frame held): 1) struck a final time · 2) staggers back · 3) legs buckle · 4) falls · 5) hits the ground · 6) lying still on the ground (held: the body stays on the battlefield)
Row 6 — victory (6 frames, loops): 1) begins a triumphant gesture · 2) raises weapon, head or wings high · 3) peak of the gesture · 4) holds · 5) lowers slightly · 6) raises again (loops into frame 2)
In every frame: the exact same Royal Ushabti, same size, same anatomy, armour, equipment, materials and lighting; it faces right; its feet stand on the cell's ground line at 90% of the cell height, centred in the cell; it stands about 76% of the cell height tall.
Fixed elevated side / three-quarter strategy-game camera (about 20° above the horizon), the same in every cell.
Modern high-resolution pre-rendered fantasy strategy-game sprite style. Strong readable silhouette. Moderate detail appropriate for gameplay scale.
Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). No ground, no shadows, no environment, no text.
```

### C · Sphinx — Egyptian, tier 4, base form

| Field | Value |
|---|---|
| Sheet file | `sheet.creature.egyptian.tier4.base.png` |
| Creature | `egyptian_sphinx` · Guardian beast · occupies 2 hexes · Double Retaliation (passive) |
| Rows | 1. idle (6)<br>2. move (6)<br>3. attack (6)<br>4. defend (3) + hit (3)<br>5. death (6)<br>6. victory (6) |
| Image | 1536 × 1024 px (about 1.6 MP) or larger with the same proportions — 6 columns × 6 rows, cells 256 × 171 px |
| Scale | a cell is 3.20 hex widths wide and 2.13 tall; ground line at 90 % of the cell height; the creature stands about 46 % of the cell height |
| Attach | `assets-source/creatures/reference/creature.egyptian.tier4.base.ref.threequarter.png` (canonical master); `assets-source/icons/final/creature.egyptian.tier4.base.portrait.png`; `support images/ChatGPT Image Sep 29, 2026, 03_35_35 PM-3.png` |
| Cuts into | 7 strips: `sprite.creature.egyptian.tier4.base.idle.png`, `sprite.creature.egyptian.tier4.base.move.png`, `sprite.creature.egyptian.tier4.base.attack.png`, `sprite.creature.egyptian.tier4.base.defend.png`, `sprite.creature.egyptian.tier4.base.hit.png`, `sprite.creature.egyptian.tier4.base.death.png`, `sprite.creature.egyptian.tier4.base.victory.png` |
| Status | idle placeholder, move missing, attack missing, defend missing, hit missing, death missing, victory missing |

```text
Using the attached canonical reference of Sphinx, create one animation sheet for Pantheon Realms.
The creature: Sphinx — A lion with a human face and a striped royal headdress, crouched to spring.
Image 1536 × 1024 px (or larger, same proportions): an invisible grid of 6 columns × 6 rows of equal cells, each cell 3.20 hex widths wide. No grid lines, no borders, no labels, no numbers, no text. Every item stays inside its own cell with clear empty space around it; nothing touches or crosses a cell edge.
Each row is one animation; its frames run left to right:
Row 1 — idle (6 frames, loops): 1) neutral stance · 2) breathing in, chest rising · 3) breath held, weight shifts slightly forward · 4) small head turn · 5) breathing out, chest sinking · 6) settling back to neutral (loops into frame 1)
Row 2 — move (6 frames, loops): 1) front left foot down · 2) pushing off · 3) legs gathered · 4) front right foot down · 5) pushing off · 6) legs stretched (loops)
Row 3 — attack (6 frames): 1) ready stance · 2) anticipation: draws back, coiled · 3) strike: lunges forward and bites, claws raking · 4) impact pose, fully extended · 5) follow-through · 6) recovering to the ready stance
Row 4 — defend (cells 1–3): 1) ready stance · 2) lowers its head and braces · 3) braced (held) | hit (cells 4–6): 1) struck: jolts back · 2) recoils, flinching · 3) steadies
Row 5 — death (6 frames, last frame held): 1) struck a final time · 2) staggers back · 3) legs buckle · 4) falls · 5) hits the ground · 6) lying still on the ground (held: the body stays on the battlefield)
Row 6 — victory (6 frames, loops): 1) begins a triumphant gesture · 2) raises weapon, head or wings high · 3) peak of the gesture · 4) holds · 5) lowers slightly · 6) raises again (loops into frame 2)
In every frame: the exact same Sphinx, same size, same anatomy, armour, equipment, materials and lighting; it faces right; its feet stand on the cell's ground line at 90% of the cell height, centred in the cell; it stands about 46% of the cell height tall.
Fixed elevated side / three-quarter strategy-game camera (about 20° above the horizon), the same in every cell.
Modern high-resolution pre-rendered fantasy strategy-game sprite style. Strong readable silhouette. Moderate detail appropriate for gameplay scale.
Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). No ground, no shadows, no environment, no text.
```

### C · Great Sphinx — Egyptian, tier 4, upgraded form

| Field | Value |
|---|---|
| Sheet file | `sheet.creature.egyptian.tier4.upgraded.png` |
| Creature | `egyptian_great_sphinx` · Guardian beast · occupies 2 hexes · Double Retaliation (passive) · Flight (passive) |
| Rows | 1. idle (6)<br>2. move (6)<br>3. attack (6)<br>4. defend (3) + hit (3)<br>5. death (6)<br>6. victory (6)<br>7. takeoff (3) + landing (3)<br>8. fly (6) |
| Image | 1328 × 1184 px (about 1.6 MP) or larger with the same proportions — 6 columns × 8 rows, cells 221 × 148 px<br>or two parts for sharper frames: `sheet.creature.egyptian.tier4.upgraded.part1.png` rows 1–4, 1880 × 840 px; `sheet.creature.egyptian.tier4.upgraded.part2.png` rows 5–8, 1880 × 840 px |
| Scale | a cell is 3.20 hex widths wide and 2.13 tall; ground line at 90 % of the cell height; the creature stands about 49 % of the cell height |
| Attach | `sheet.creature.egyptian.tier4.base.png` (the base form's sheet — same layout and poses); `assets-source/creatures/reference/creature.egyptian.tier4.upgraded.ref.threequarter.png` (canonical master); `assets-source/icons/final/creature.egyptian.tier4.upgraded.portrait.png`; `support images/ChatGPT Image Sep 29, 2026, 03_35_35 PM-3.png` |
| Cuts into | 10 strips: `sprite.creature.egyptian.tier4.upgraded.idle.png`, `sprite.creature.egyptian.tier4.upgraded.move.png`, `sprite.creature.egyptian.tier4.upgraded.attack.png`, `sprite.creature.egyptian.tier4.upgraded.defend.png`, `sprite.creature.egyptian.tier4.upgraded.hit.png`, `sprite.creature.egyptian.tier4.upgraded.death.png`, `sprite.creature.egyptian.tier4.upgraded.victory.png`, `sprite.creature.egyptian.tier4.upgraded.takeoff.png`, `sprite.creature.egyptian.tier4.upgraded.landing.png`, `sprite.creature.egyptian.tier4.upgraded.fly.png` |
| Status | idle placeholder, move missing, attack missing, defend missing, hit missing, death missing, victory missing, takeoff missing, landing missing, fly missing |

```text
Using the attached animation sheet of Sphinx and the canonical reference of Great Sphinx, create the same animation sheet for Great Sphinx, its upgraded form, for Pantheon Realms.
Keep the attached sheet's layout, every frame's pose, timing, camera, scale and place in its cell; change only the creature design to the upgraded form.
The creature: Great Sphinx — A great sphinx with falcon wings spread, sandstone-coloured fur and a golden beard.
Image 1328 × 1184 px (or larger, same proportions): an invisible grid of 6 columns × 8 rows of equal cells, each cell 3.20 hex widths wide. No grid lines, no borders, no labels, no numbers, no text. Every item stays inside its own cell with clear empty space around it; nothing touches or crosses a cell edge.
Each row is one animation; its frames run left to right:
Row 1 — idle (6 frames, loops): 1) neutral stance · 2) breathing in, chest rising · 3) breath held, weight shifts slightly forward · 4) small head turn · 5) breathing out, chest sinking · 6) settling back to neutral (loops into frame 1)
Row 2 — move (6 frames, loops): 1) front left foot down · 2) pushing off · 3) legs gathered · 4) front right foot down · 5) pushing off · 6) legs stretched (loops)
Row 3 — attack (6 frames): 1) ready stance · 2) anticipation: draws back, coiled · 3) strike: lunges forward and bites, claws raking · 4) impact pose, fully extended · 5) follow-through · 6) recovering to the ready stance
Row 4 — defend (cells 1–3): 1) ready stance · 2) lowers its head and braces · 3) braced (held) | hit (cells 4–6): 1) struck: jolts back · 2) recoils, flinching · 3) steadies
Row 5 — death (6 frames, last frame held): 1) struck a final time · 2) staggers back · 3) legs buckle · 4) falls · 5) hits the ground · 6) lying still on the ground (held: the body stays on the battlefield)
Row 6 — victory (6 frames, loops): 1) begins a triumphant gesture · 2) raises weapon, head or wings high · 3) peak of the gesture · 4) holds · 5) lowers slightly · 6) raises again (loops into frame 2)
Row 7 — takeoff (cells 1–3): 1) crouches, wings rising · 2) first downbeat, feet leave the ground · 3) hovering at flight height | landing (cells 4–6): 1) hovering, wings spread to brake · 2) touchdown, legs absorbing the landing · 3) standing, wings folding
Row 8 — fly (6 frames, loops): 1) wings up · 2) downbeat · 3) wings down · 4) upstroke · 5) wings level · 6) wings rising (loops)
In every frame: the exact same Great Sphinx, same size, same anatomy, armour, equipment, materials and lighting; it faces right; its feet stand on the cell's ground line at 90% of the cell height, centred in the cell (airborne frames hover about 15% of the cell height above that line); it stands about 49% of the cell height tall.
Fixed elevated side / three-quarter strategy-game camera (about 20° above the horizon), the same in every cell.
Modern high-resolution pre-rendered fantasy strategy-game sprite style. Strong readable silhouette. Moderate detail appropriate for gameplay scale.
Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). No ground, no shadows, no environment, no text.
```

### C · Crocodile Beast — Egyptian, tier 5, base form

| Field | Value |
|---|---|
| Sheet file | `sheet.creature.egyptian.tier5.base.png` |
| Creature | `egyptian_crocodile_beast` · River shock beast · occupies 2 hexes · Charge (passive) |
| Rows | 1. idle (6)<br>2. move (6)<br>3. attack (6)<br>4. defend (3) + hit (3)<br>5. death (6)<br>6. victory (6) |
| Image | 1536 × 1024 px (about 1.6 MP) or larger with the same proportions — 6 columns × 6 rows, cells 256 × 171 px |
| Scale | a cell is 3.20 hex widths wide and 2.13 tall; ground line at 90 % of the cell height; the creature stands about 48 % of the cell height |
| Attach | `assets-source/creatures/reference/creature.egyptian.tier5.base.ref.threequarter.png` (canonical master); `assets-source/icons/final/creature.egyptian.tier5.base.portrait.png`; `support images/ChatGPT Image Sep 29, 2026, 03_35_35 PM-3.png` |
| Cuts into | 7 strips: `sprite.creature.egyptian.tier5.base.idle.png`, `sprite.creature.egyptian.tier5.base.move.png`, `sprite.creature.egyptian.tier5.base.attack.png`, `sprite.creature.egyptian.tier5.base.defend.png`, `sprite.creature.egyptian.tier5.base.hit.png`, `sprite.creature.egyptian.tier5.base.death.png`, `sprite.creature.egyptian.tier5.base.victory.png` |
| Status | idle placeholder, move missing, attack missing, defend missing, hit missing, death missing, victory missing |

```text
Using the attached canonical reference of Crocodile Beast, create one animation sheet for Pantheon Realms.
The creature: Crocodile Beast — A huge Nile crocodile with bronze rings on its forelegs, jaws half open.
Image 1536 × 1024 px (or larger, same proportions): an invisible grid of 6 columns × 6 rows of equal cells, each cell 3.20 hex widths wide. No grid lines, no borders, no labels, no numbers, no text. Every item stays inside its own cell with clear empty space around it; nothing touches or crosses a cell edge.
Each row is one animation; its frames run left to right:
Row 1 — idle (6 frames, loops): 1) neutral stance · 2) breathing in, chest rising · 3) breath held, weight shifts slightly forward · 4) small head turn · 5) breathing out, chest sinking · 6) settling back to neutral (loops into frame 1)
Row 2 — move (6 frames, loops): 1) front left foot down · 2) pushing off · 3) legs gathered · 4) front right foot down · 5) pushing off · 6) legs stretched (loops)
Row 3 — attack (6 frames): 1) ready stance · 2) anticipation: draws back, coiled · 3) strike: lunges forward and bites, claws raking · 4) impact pose, fully extended · 5) follow-through · 6) recovering to the ready stance
Row 4 — defend (cells 1–3): 1) ready stance · 2) lowers its head and braces · 3) braced (held) | hit (cells 4–6): 1) struck: jolts back · 2) recoils, flinching · 3) steadies
Row 5 — death (6 frames, last frame held): 1) struck a final time · 2) staggers back · 3) legs buckle · 4) falls · 5) hits the ground · 6) lying still on the ground (held: the body stays on the battlefield)
Row 6 — victory (6 frames, loops): 1) begins a triumphant gesture · 2) raises weapon, head or wings high · 3) peak of the gesture · 4) holds · 5) lowers slightly · 6) raises again (loops into frame 2)
In every frame: the exact same Crocodile Beast, same size, same anatomy, armour, equipment, materials and lighting; it faces right; its feet stand on the cell's ground line at 90% of the cell height, centred in the cell; it stands about 48% of the cell height tall.
Fixed elevated side / three-quarter strategy-game camera (about 20° above the horizon), the same in every cell.
Modern high-resolution pre-rendered fantasy strategy-game sprite style. Strong readable silhouette. Moderate detail appropriate for gameplay scale.
Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). No ground, no shadows, no environment, no text.
```

### C · Sobek Warbeast — Egyptian, tier 5, upgraded form

| Field | Value |
|---|---|
| Sheet file | `sheet.creature.egyptian.tier5.upgraded.png` |
| Creature | `egyptian_sobek_warbeast` · River shock beast · occupies 2 hexes · Charge (passive) · Double Retaliation (passive) |
| Rows | 1. idle (6)<br>2. move (6)<br>3. attack (6)<br>4. defend (3) + hit (3)<br>5. death (6)<br>6. victory (6) |
| Image | 1536 × 1024 px (about 1.6 MP) or larger with the same proportions — 6 columns × 6 rows, cells 256 × 171 px |
| Scale | a cell is 3.20 hex widths wide and 2.13 tall; ground line at 90 % of the cell height; the creature stands about 50 % of the cell height |
| Attach | `sheet.creature.egyptian.tier5.base.png` (the base form's sheet — same layout and poses); `assets-source/creatures/reference/creature.egyptian.tier5.upgraded.ref.threequarter.png` (canonical master); `assets-source/icons/final/creature.egyptian.tier5.upgraded.portrait.png`; `support images/ChatGPT Image Sep 29, 2026, 03_35_35 PM-3.png` |
| Cuts into | 7 strips: `sprite.creature.egyptian.tier5.upgraded.idle.png`, `sprite.creature.egyptian.tier5.upgraded.move.png`, `sprite.creature.egyptian.tier5.upgraded.attack.png`, `sprite.creature.egyptian.tier5.upgraded.defend.png`, `sprite.creature.egyptian.tier5.upgraded.hit.png`, `sprite.creature.egyptian.tier5.upgraded.death.png`, `sprite.creature.egyptian.tier5.upgraded.victory.png` |
| Status | idle placeholder, move missing, attack missing, defend missing, hit missing, death missing, victory missing |

```text
Using the attached animation sheet of Crocodile Beast and the canonical reference of Sobek Warbeast, create the same animation sheet for Sobek Warbeast, its upgraded form, for Pantheon Realms.
Keep the attached sheet's layout, every frame's pose, timing, camera, scale and place in its cell; change only the creature design to the upgraded form.
The creature: Sobek Warbeast — A crocodile in a bronze-scale harness with a sun-disc crest between its eyes.
Image 1536 × 1024 px (or larger, same proportions): an invisible grid of 6 columns × 6 rows of equal cells, each cell 3.20 hex widths wide. No grid lines, no borders, no labels, no numbers, no text. Every item stays inside its own cell with clear empty space around it; nothing touches or crosses a cell edge.
Each row is one animation; its frames run left to right:
Row 1 — idle (6 frames, loops): 1) neutral stance · 2) breathing in, chest rising · 3) breath held, weight shifts slightly forward · 4) small head turn · 5) breathing out, chest sinking · 6) settling back to neutral (loops into frame 1)
Row 2 — move (6 frames, loops): 1) front left foot down · 2) pushing off · 3) legs gathered · 4) front right foot down · 5) pushing off · 6) legs stretched (loops)
Row 3 — attack (6 frames): 1) ready stance · 2) anticipation: draws back, coiled · 3) strike: lunges forward and bites, claws raking · 4) impact pose, fully extended · 5) follow-through · 6) recovering to the ready stance
Row 4 — defend (cells 1–3): 1) ready stance · 2) lowers its head and braces · 3) braced (held) | hit (cells 4–6): 1) struck: jolts back · 2) recoils, flinching · 3) steadies
Row 5 — death (6 frames, last frame held): 1) struck a final time · 2) staggers back · 3) legs buckle · 4) falls · 5) hits the ground · 6) lying still on the ground (held: the body stays on the battlefield)
Row 6 — victory (6 frames, loops): 1) begins a triumphant gesture · 2) raises weapon, head or wings high · 3) peak of the gesture · 4) holds · 5) lowers slightly · 6) raises again (loops into frame 2)
In every frame: the exact same Sobek Warbeast, same size, same anatomy, armour, equipment, materials and lighting; it faces right; its feet stand on the cell's ground line at 90% of the cell height, centred in the cell; it stands about 50% of the cell height tall.
Fixed elevated side / three-quarter strategy-game camera (about 20° above the horizon), the same in every cell.
Modern high-resolution pre-rendered fantasy strategy-game sprite style. Strong readable silhouette. Moderate detail appropriate for gameplay scale.
Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). No ground, no shadows, no environment, no text.
```

### C · Bennu — Egyptian, tier 6, base form

| Field | Value |
|---|---|
| Sheet file | `sheet.creature.egyptian.tier6.base.png` |
| Creature | `egyptian_bennu` · Flying striker · occupies 2 hexes · Flight (passive) |
| Rows | 1. idle (6)<br>2. move (6)<br>3. attack (6)<br>4. defend (3) + hit (3)<br>5. death (6)<br>6. victory (6)<br>7. takeoff (3) + landing (3)<br>8. fly (6) |
| Image | 1280 × 1224 px (about 1.6 MP) or larger with the same proportions — 6 columns × 8 rows, cells 213 × 153 px<br>or two parts for sharper frames: `sheet.creature.egyptian.tier6.base.part1.png` rows 1–4, 1808 × 872 px; `sheet.creature.egyptian.tier6.base.part2.png` rows 5–8, 1808 × 872 px |
| Scale | a cell is 3.20 hex widths wide and 2.30 tall; ground line at 90 % of the cell height; the creature stands about 62 % of the cell height |
| Attach | `assets-source/creatures/reference/creature.egyptian.tier6.base.ref.threequarter.png` (canonical master); `assets-source/icons/final/creature.egyptian.tier6.base.portrait.png`; `support images/ChatGPT Image Sep 29, 2026, 03_35_35 PM-3.png` |
| Cuts into | 10 strips: `sprite.creature.egyptian.tier6.base.idle.png`, `sprite.creature.egyptian.tier6.base.move.png`, `sprite.creature.egyptian.tier6.base.attack.png`, `sprite.creature.egyptian.tier6.base.defend.png`, `sprite.creature.egyptian.tier6.base.hit.png`, `sprite.creature.egyptian.tier6.base.death.png`, `sprite.creature.egyptian.tier6.base.victory.png`, `sprite.creature.egyptian.tier6.base.takeoff.png`, `sprite.creature.egyptian.tier6.base.landing.png`, `sprite.creature.egyptian.tier6.base.fly.png` |
| Status | idle placeholder, move missing, attack missing, defend missing, hit missing, death missing, victory missing, takeoff missing, landing missing, fly missing |

```text
Using the attached canonical reference of Bennu, create one animation sheet for Pantheon Realms.
The creature: Bennu — A huge grey-gold heron-like bird with a two-feathered crest and ember-lit wings.
Image 1280 × 1224 px (or larger, same proportions): an invisible grid of 6 columns × 8 rows of equal cells, each cell 3.20 hex widths wide. No grid lines, no borders, no labels, no numbers, no text. Every item stays inside its own cell with clear empty space around it; nothing touches or crosses a cell edge.
Each row is one animation; its frames run left to right:
Row 1 — idle (6 frames, loops): 1) neutral stance · 2) breathing in, chest rising · 3) breath held, weight shifts slightly forward · 4) small head turn · 5) breathing out, chest sinking · 6) settling back to neutral (loops into frame 1)
Row 2 — move (6 frames, loops): 1) front left foot down · 2) pushing off · 3) legs gathered · 4) front right foot down · 5) pushing off · 6) legs stretched (loops)
Row 3 — attack (6 frames): 1) ready stance · 2) anticipation: draws back, coiled · 3) strike: lunges, raking with its front talons and snapping its beak · 4) impact pose, fully extended · 5) follow-through · 6) recovering to the ready stance
Row 4 — defend (cells 1–3): 1) ready stance · 2) draws its wings around its body and lowers its head · 3) braced (held) | hit (cells 4–6): 1) struck: jolts back · 2) recoils, flinching · 3) steadies
Row 5 — death (6 frames, last frame held): 1) struck a final time · 2) staggers back · 3) legs buckle · 4) falls · 5) hits the ground · 6) lying still on the ground (held: the body stays on the battlefield)
Row 6 — victory (6 frames, loops): 1) begins a triumphant gesture · 2) raises weapon, head or wings high · 3) peak of the gesture · 4) holds · 5) lowers slightly · 6) raises again (loops into frame 2)
Row 7 — takeoff (cells 1–3): 1) crouches, wings rising · 2) first downbeat, feet leave the ground · 3) hovering at flight height | landing (cells 4–6): 1) hovering, wings spread to brake · 2) touchdown, legs absorbing the landing · 3) standing, wings folding
Row 8 — fly (6 frames, loops): 1) wings up · 2) downbeat · 3) wings down · 4) upstroke · 5) wings level · 6) wings rising (loops)
In every frame: the exact same Bennu, same size, same anatomy, armour, equipment, materials and lighting; it faces right; its feet stand on the cell's ground line at 90% of the cell height, centred in the cell (airborne frames hover about 15% of the cell height above that line); it stands about 62% of the cell height tall.
Fixed elevated side / three-quarter strategy-game camera (about 20° above the horizon), the same in every cell.
Modern high-resolution pre-rendered fantasy strategy-game sprite style. Strong readable silhouette. Moderate detail appropriate for gameplay scale.
Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). No ground, no shadows, no environment, no text.
```

### C · Radiant Bennu — Egyptian, tier 6, upgraded form

| Field | Value |
|---|---|
| Sheet file | `sheet.creature.egyptian.tier6.upgraded.png` |
| Creature | `egyptian_radiant_bennu` · Flying striker · occupies 2 hexes · Flight (passive) · Unyielding (passive) |
| Rows | 1. idle (6)<br>2. move (6)<br>3. attack (6)<br>4. defend (3) + hit (3)<br>5. death (6)<br>6. victory (6)<br>7. takeoff (3) + landing (3)<br>8. fly (6) |
| Image | 1256 × 1256 px (about 1.6 MP) or larger with the same proportions — 6 columns × 8 rows, cells 209 × 157 px<br>or two parts for sharper frames: `sheet.creature.egyptian.tier6.upgraded.part1.png` rows 1–4, 1776 × 888 px; `sheet.creature.egyptian.tier6.upgraded.part2.png` rows 5–8, 1776 × 888 px |
| Scale | a cell is 3.20 hex widths wide and 2.40 tall; ground line at 90 % of the cell height; the creature stands about 63 % of the cell height |
| Attach | `sheet.creature.egyptian.tier6.base.png` (the base form's sheet — same layout and poses); `assets-source/creatures/reference/creature.egyptian.tier6.upgraded.ref.threequarter.png` (canonical master); `assets-source/icons/final/creature.egyptian.tier6.upgraded.portrait.png`; `support images/ChatGPT Image Sep 29, 2026, 03_35_35 PM-3.png` |
| Cuts into | 10 strips: `sprite.creature.egyptian.tier6.upgraded.idle.png`, `sprite.creature.egyptian.tier6.upgraded.move.png`, `sprite.creature.egyptian.tier6.upgraded.attack.png`, `sprite.creature.egyptian.tier6.upgraded.defend.png`, `sprite.creature.egyptian.tier6.upgraded.hit.png`, `sprite.creature.egyptian.tier6.upgraded.death.png`, `sprite.creature.egyptian.tier6.upgraded.victory.png`, `sprite.creature.egyptian.tier6.upgraded.takeoff.png`, `sprite.creature.egyptian.tier6.upgraded.landing.png`, `sprite.creature.egyptian.tier6.upgraded.fly.png` |
| Status | idle placeholder, move missing, attack missing, defend missing, hit missing, death missing, victory missing, takeoff missing, landing missing, fly missing |

```text
Using the attached animation sheet of Bennu and the canonical reference of Radiant Bennu, create the same animation sheet for Radiant Bennu, its upgraded form, for Pantheon Realms.
Keep the attached sheet's layout, every frame's pose, timing, camera, scale and place in its cell; change only the creature design to the upgraded form.
The creature: Radiant Bennu — A blazing golden bird with sun-rays in its crest and wings trailing light.
Image 1256 × 1256 px (or larger, same proportions): an invisible grid of 6 columns × 8 rows of equal cells, each cell 3.20 hex widths wide. No grid lines, no borders, no labels, no numbers, no text. Every item stays inside its own cell with clear empty space around it; nothing touches or crosses a cell edge.
Each row is one animation; its frames run left to right:
Row 1 — idle (6 frames, loops): 1) neutral stance · 2) breathing in, chest rising · 3) breath held, weight shifts slightly forward · 4) small head turn · 5) breathing out, chest sinking · 6) settling back to neutral (loops into frame 1)
Row 2 — move (6 frames, loops): 1) front left foot down · 2) pushing off · 3) legs gathered · 4) front right foot down · 5) pushing off · 6) legs stretched (loops)
Row 3 — attack (6 frames): 1) ready stance · 2) anticipation: draws back, coiled · 3) strike: lunges, raking with its front talons and snapping its beak · 4) impact pose, fully extended · 5) follow-through · 6) recovering to the ready stance
Row 4 — defend (cells 1–3): 1) ready stance · 2) draws its wings around its body and lowers its head · 3) braced (held) | hit (cells 4–6): 1) struck: jolts back · 2) recoils, flinching · 3) steadies
Row 5 — death (6 frames, last frame held): 1) struck a final time · 2) staggers back · 3) legs buckle · 4) falls · 5) hits the ground · 6) lying still on the ground (held: the body stays on the battlefield)
Row 6 — victory (6 frames, loops): 1) begins a triumphant gesture · 2) raises weapon, head or wings high · 3) peak of the gesture · 4) holds · 5) lowers slightly · 6) raises again (loops into frame 2)
Row 7 — takeoff (cells 1–3): 1) crouches, wings rising · 2) first downbeat, feet leave the ground · 3) hovering at flight height | landing (cells 4–6): 1) hovering, wings spread to brake · 2) touchdown, legs absorbing the landing · 3) standing, wings folding
Row 8 — fly (6 frames, loops): 1) wings up · 2) downbeat · 3) wings down · 4) upstroke · 5) wings level · 6) wings rising (loops)
In every frame: the exact same Radiant Bennu, same size, same anatomy, armour, equipment, materials and lighting; it faces right; its feet stand on the cell's ground line at 90% of the cell height, centred in the cell (airborne frames hover about 15% of the cell height above that line); it stands about 63% of the cell height tall.
Fixed elevated side / three-quarter strategy-game camera (about 20° above the horizon), the same in every cell.
Modern high-resolution pre-rendered fantasy strategy-game sprite style. Strong readable silhouette. Moderate detail appropriate for gameplay scale.
Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). No ground, no shadows, no environment, no text.
```

### C · Desert Colossus — Egyptian, tier 7, base form

| Field | Value |
|---|---|
| Sheet file | `sheet.creature.egyptian.tier7.base.png` |
| Creature | `egyptian_desert_colossus` · Apex siege construct · occupies 2 hexes · shoots (range 16) · Shooter (passive) · Wall Breaker (active) · No Melee Penalty (passive) |
| Rows | 1. idle (6)<br>2. move (6)<br>3. attack (6)<br>4. defend (3) + hit (3)<br>5. death (6)<br>6. victory (6)<br>7. shoot (6)<br>8. ability (6) |
| Image | 1232 × 1280 px (about 1.6 MP) or larger with the same proportions — 6 columns × 8 rows, cells 205 × 160 px<br>or two parts for sharper frames: `sheet.creature.egyptian.tier7.base.part1.png` rows 1–4, 1736 × 904 px; `sheet.creature.egyptian.tier7.base.part2.png` rows 5–8, 1736 × 904 px |
| Scale | a cell is 3.20 hex widths wide and 2.50 tall; ground line at 90 % of the cell height; the creature stands about 75 % of the cell height |
| Attach | `assets-source/creatures/reference/creature.egyptian.tier7.base.ref.threequarter.png` (canonical master); `assets-source/icons/final/creature.egyptian.tier7.base.portrait.png`; `support images/ChatGPT Image Sep 29, 2026, 03_35_35 PM-3.png` |
| Cuts into | 9 strips: `sprite.creature.egyptian.tier7.base.idle.png`, `sprite.creature.egyptian.tier7.base.move.png`, `sprite.creature.egyptian.tier7.base.attack.png`, `sprite.creature.egyptian.tier7.base.defend.png`, `sprite.creature.egyptian.tier7.base.hit.png`, `sprite.creature.egyptian.tier7.base.death.png`, `sprite.creature.egyptian.tier7.base.victory.png`, `sprite.creature.egyptian.tier7.base.shoot.png`, `sprite.creature.egyptian.tier7.base.ability.png` |
| Status | idle placeholder, move missing, attack missing, defend missing, hit missing, death missing, victory missing, shoot missing, ability missing |

```text
Using the attached canonical reference of Desert Colossus, create one animation sheet for Pantheon Realms.
The creature: Desert Colossus — A towering seated-king statue of red granite, now standing, with sand pouring from its joints.
Image 1232 × 1280 px (or larger, same proportions): an invisible grid of 6 columns × 8 rows of equal cells, each cell 3.20 hex widths wide. No grid lines, no borders, no labels, no numbers, no text. Every item stays inside its own cell with clear empty space around it; nothing touches or crosses a cell edge.
Each row is one animation; its frames run left to right:
Row 1 — idle (6 frames, loops): 1) neutral stance · 2) breathing in, chest rising · 3) breath held, weight shifts slightly forward · 4) small head turn · 5) breathing out, chest sinking · 6) settling back to neutral (loops into frame 1)
Row 2 — move (6 frames, loops): 1) right foot forward, heel down · 2) weight on the right foot · 3) left leg passing · 4) left foot forward, heel down · 5) weight on the left foot · 6) right leg passing (loops)
Row 3 — attack (6 frames): 1) ready stance · 2) anticipation: draws back, coiled · 3) strike: swings a massive arm in a crushing blow · 4) impact pose, fully extended · 5) follow-through · 6) recovering to the ready stance
Row 4 — defend (cells 1–3): 1) ready stance · 2) lowers its head and braces · 3) braced (held) | hit (cells 4–6): 1) struck: jolts back · 2) recoils, flinching · 3) steadies
Row 5 — death (6 frames, last frame held): 1) struck a final time · 2) staggers back · 3) legs buckle · 4) falls · 5) hits the ground · 6) lying still on the ground (held: the body stays on the battlefield)
Row 6 — victory (6 frames, loops): 1) begins a triumphant gesture · 2) raises weapon, head or wings high · 3) peak of the gesture · 4) holds · 5) lowers slightly · 6) raises again (loops into frame 2)
Row 7 — shoot (6 frames): 1) ready stance · 2) draws or winds up, aiming · 3) release: makes its ranged attack with the weapon shown in the reference · 4) follow-through (the missile has left; the game draws it in flight) · 5) recoil · 6) recovering to the ready stance
Row 8 — ability (6 frames): 1) ready stance · 2) begins to use Wall Breaker (Can target fortifications in a siege) · 3) builds up · 4) the ability takes effect (a short glow around the creature; no text) · 5) glow fading · 6) recovering to the ready stance
In every frame: the exact same Desert Colossus, same size, same anatomy, armour, equipment, materials and lighting; it faces right; its feet stand on the cell's ground line at 90% of the cell height, centred in the cell; it stands about 75% of the cell height tall.
Fixed elevated side / three-quarter strategy-game camera (about 20° above the horizon), the same in every cell.
Modern high-resolution pre-rendered fantasy strategy-game sprite style. Strong readable silhouette. Moderate detail appropriate for gameplay scale.
Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). No ground, no shadows, no environment, no text.
```

### C · Divine Colossus — Egyptian, tier 7, upgraded form

| Field | Value |
|---|---|
| Sheet file | `sheet.creature.egyptian.tier7.upgraded.png` |
| Creature | `egyptian_divine_colossus` · Apex siege construct · occupies 2 hexes · shoots (range 17) · Shooter (passive) · Wall Breaker (active) · No Melee Penalty (passive) |
| Rows | 1. idle (6)<br>2. move (6)<br>3. attack (6)<br>4. defend (3) + hit (3)<br>5. death (6)<br>6. victory (6)<br>7. shoot (6)<br>8. ability (6) |
| Image | 1208 × 1304 px (about 1.6 MP) or larger with the same proportions — 6 columns × 8 rows, cells 201 × 163 px<br>or two parts for sharper frames: `sheet.creature.egyptian.tier7.upgraded.part1.png` rows 1–4, 1704 × 920 px; `sheet.creature.egyptian.tier7.upgraded.part2.png` rows 5–8, 1704 × 920 px |
| Scale | a cell is 3.20 hex widths wide and 2.60 tall; ground line at 90 % of the cell height; the creature stands about 75 % of the cell height |
| Attach | `sheet.creature.egyptian.tier7.base.png` (the base form's sheet — same layout and poses); `assets-source/creatures/reference/creature.egyptian.tier7.upgraded.ref.threequarter.png` (canonical master); `assets-source/icons/final/creature.egyptian.tier7.upgraded.portrait.png`; `support images/ChatGPT Image Sep 29, 2026, 03_35_35 PM-3.png` |
| Cuts into | 9 strips: `sprite.creature.egyptian.tier7.upgraded.idle.png`, `sprite.creature.egyptian.tier7.upgraded.move.png`, `sprite.creature.egyptian.tier7.upgraded.attack.png`, `sprite.creature.egyptian.tier7.upgraded.defend.png`, `sprite.creature.egyptian.tier7.upgraded.hit.png`, `sprite.creature.egyptian.tier7.upgraded.death.png`, `sprite.creature.egyptian.tier7.upgraded.victory.png`, `sprite.creature.egyptian.tier7.upgraded.shoot.png`, `sprite.creature.egyptian.tier7.upgraded.ability.png` |
| Status | idle placeholder, move missing, attack missing, defend missing, hit missing, death missing, victory missing, shoot missing, ability missing |

```text
Using the attached animation sheet of Desert Colossus and the canonical reference of Divine Colossus, create the same animation sheet for Divine Colossus, its upgraded form, for Pantheon Realms.
Keep the attached sheet's layout, every frame's pose, timing, camera, scale and place in its cell; change only the creature design to the upgraded form.
The creature: Divine Colossus — A colossal statue with a gold-inlaid headdress and eyes of lapis, a stone block in each hand.
Image 1208 × 1304 px (or larger, same proportions): an invisible grid of 6 columns × 8 rows of equal cells, each cell 3.20 hex widths wide. No grid lines, no borders, no labels, no numbers, no text. Every item stays inside its own cell with clear empty space around it; nothing touches or crosses a cell edge.
Each row is one animation; its frames run left to right:
Row 1 — idle (6 frames, loops): 1) neutral stance · 2) breathing in, chest rising · 3) breath held, weight shifts slightly forward · 4) small head turn · 5) breathing out, chest sinking · 6) settling back to neutral (loops into frame 1)
Row 2 — move (6 frames, loops): 1) right foot forward, heel down · 2) weight on the right foot · 3) left leg passing · 4) left foot forward, heel down · 5) weight on the left foot · 6) right leg passing (loops)
Row 3 — attack (6 frames): 1) ready stance · 2) anticipation: draws back, coiled · 3) strike: swings a massive arm in a crushing blow · 4) impact pose, fully extended · 5) follow-through · 6) recovering to the ready stance
Row 4 — defend (cells 1–3): 1) ready stance · 2) lowers its head and braces · 3) braced (held) | hit (cells 4–6): 1) struck: jolts back · 2) recoils, flinching · 3) steadies
Row 5 — death (6 frames, last frame held): 1) struck a final time · 2) staggers back · 3) legs buckle · 4) falls · 5) hits the ground · 6) lying still on the ground (held: the body stays on the battlefield)
Row 6 — victory (6 frames, loops): 1) begins a triumphant gesture · 2) raises weapon, head or wings high · 3) peak of the gesture · 4) holds · 5) lowers slightly · 6) raises again (loops into frame 2)
Row 7 — shoot (6 frames): 1) ready stance · 2) draws or winds up, aiming · 3) release: makes its ranged attack with the weapon shown in the reference · 4) follow-through (the missile has left; the game draws it in flight) · 5) recoil · 6) recovering to the ready stance
Row 8 — ability (6 frames): 1) ready stance · 2) begins to use Wall Breaker (Can target fortifications in a siege) · 3) builds up · 4) the ability takes effect (a short glow around the creature; no text) · 5) glow fading · 6) recovering to the ready stance
In every frame: the exact same Divine Colossus, same size, same anatomy, armour, equipment, materials and lighting; it faces right; its feet stand on the cell's ground line at 90% of the cell height, centred in the cell; it stands about 75% of the cell height tall.
Fixed elevated side / three-quarter strategy-game camera (about 20° above the horizon), the same in every cell.
Modern high-resolution pre-rendered fantasy strategy-game sprite style. Strong readable silhouette. Moderate detail appropriate for gameplay scale.
Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). No ground, no shadows, no environment, no text.
```

### C · Hoplite — Greek, tier 1, base form

| Field | Value |
|---|---|
| Sheet file | `sheet.creature.greek.tier1.base.png` |
| Creature | `hoplite` · Line infantry · occupies 1 hex · Charge Guard (passive) |
| Rows | 1. idle (6)<br>2. move (6)<br>3. attack (6)<br>4. defend (3) + hit (3)<br>5. death (6)<br>6. victory (6) |
| Image | 1256 × 1256 px (about 1.6 MP) or larger with the same proportions — 6 columns × 6 rows, cells 209 × 209 px |
| Scale | a cell is 2.13 hex widths wide and 2.13 tall; ground line at 90 % of the cell height; the creature stands about 53 % of the cell height |
| Attach | `assets-source/creatures/reference/creature.greek.tier1.base.ref.threequarter.png` (canonical master); `assets-source/icons/final/creature.greek.tier1.base.portrait.png`; `support images/ChatGPT Image Sep 29, 2026, 03_35_30 PM-1.png` |
| Cuts into | 7 strips: `sprite.creature.greek.tier1.base.idle.png`, `sprite.creature.greek.tier1.base.move.png`, `sprite.creature.greek.tier1.base.attack.png`, `sprite.creature.greek.tier1.base.defend.png`, `sprite.creature.greek.tier1.base.hit.png`, `sprite.creature.greek.tier1.base.death.png`, `sprite.creature.greek.tier1.base.victory.png` |
| Status | idle placeholder, move missing, attack missing, defend missing, hit missing, death missing, victory missing |

```text
Using the attached canonical reference of Hoplite, create one animation sheet for Pantheon Realms.
The creature: Hoplite — A spear-and-shield soldier in a bronze helmet and pale linen tunic.
Image 1256 × 1256 px (or larger, same proportions): an invisible grid of 6 columns × 6 rows of equal cells, each cell 2.13 hex widths wide. No grid lines, no borders, no labels, no numbers, no text. Every item stays inside its own cell with clear empty space around it; nothing touches or crosses a cell edge.
Each row is one animation; its frames run left to right:
Row 1 — idle (6 frames, loops): 1) neutral stance · 2) breathing in, chest rising · 3) breath held, weight shifts slightly forward · 4) small head turn · 5) breathing out, chest sinking · 6) settling back to neutral (loops into frame 1)
Row 2 — move (6 frames, loops): 1) right foot forward, heel down · 2) weight on the right foot · 3) left leg passing · 4) left foot forward, heel down · 5) weight on the left foot · 6) right leg passing (loops)
Row 3 — attack (6 frames): 1) ready stance · 2) anticipation: draws back, coiled · 3) strike: thrusts its spear forward from behind its shield · 4) impact pose, fully extended · 5) follow-through · 6) recovering to the ready stance
Row 4 — defend (cells 1–3): 1) ready stance · 2) raises its shield and braces behind it · 3) braced (held) | hit (cells 4–6): 1) struck: jolts back · 2) recoils, flinching · 3) steadies
Row 5 — death (6 frames, last frame held): 1) struck a final time · 2) staggers back · 3) legs buckle · 4) falls · 5) hits the ground · 6) lying still on the ground (held: the body stays on the battlefield)
Row 6 — victory (6 frames, loops): 1) begins a triumphant gesture · 2) raises weapon, head or wings high · 3) peak of the gesture · 4) holds · 5) lowers slightly · 6) raises again (loops into frame 2)
In every frame: the exact same Hoplite, same size, same anatomy, armour, equipment, materials and lighting; it faces right; its feet stand on the cell's ground line at 90% of the cell height, centred in the cell; it stands about 53% of the cell height tall.
Fixed elevated side / three-quarter strategy-game camera (about 20° above the horizon), the same in every cell.
Modern high-resolution pre-rendered fantasy strategy-game sprite style. Strong readable silhouette. Moderate detail appropriate for gameplay scale.
Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). No ground, no shadows, no environment, no text.
```

### C · Veteran Hoplite — Greek, tier 1, upgraded form

| Field | Value |
|---|---|
| Sheet file | `sheet.creature.greek.tier1.upgraded.png` |
| Creature | `veteran_hoplite` · Line infantry · occupies 1 hex · Charge Guard (passive) |
| Rows | 1. idle (6)<br>2. move (6)<br>3. attack (6)<br>4. defend (3) + hit (3)<br>5. death (6)<br>6. victory (6) |
| Image | 1256 × 1256 px (about 1.6 MP) or larger with the same proportions — 6 columns × 6 rows, cells 209 × 209 px |
| Scale | a cell is 2.13 hex widths wide and 2.13 tall; ground line at 90 % of the cell height; the creature stands about 56 % of the cell height |
| Attach | `sheet.creature.greek.tier1.base.png` (the base form's sheet — same layout and poses); `assets-source/creatures/reference/creature.greek.tier1.upgraded.ref.threequarter.png` (canonical master); `assets-source/icons/final/creature.greek.tier1.upgraded.portrait.png`; `support images/ChatGPT Image Sep 29, 2026, 03_35_30 PM-1.png` |
| Cuts into | 7 strips: `sprite.creature.greek.tier1.upgraded.idle.png`, `sprite.creature.greek.tier1.upgraded.move.png`, `sprite.creature.greek.tier1.upgraded.attack.png`, `sprite.creature.greek.tier1.upgraded.defend.png`, `sprite.creature.greek.tier1.upgraded.hit.png`, `sprite.creature.greek.tier1.upgraded.death.png`, `sprite.creature.greek.tier1.upgraded.victory.png` |
| Status | idle placeholder, move missing, attack missing, defend missing, hit missing, death missing, victory missing |

```text
Using the attached animation sheet of Hoplite and the canonical reference of Veteran Hoplite, create the same animation sheet for Veteran Hoplite, its upgraded form, for Pantheon Realms.
Keep the attached sheet's layout, every frame's pose, timing, camera, scale and place in its cell; change only the creature design to the upgraded form.
The creature: Veteran Hoplite — A crested-helmet spear soldier with reinforced shoulder armor and a command sash.
Image 1256 × 1256 px (or larger, same proportions): an invisible grid of 6 columns × 6 rows of equal cells, each cell 2.13 hex widths wide. No grid lines, no borders, no labels, no numbers, no text. Every item stays inside its own cell with clear empty space around it; nothing touches or crosses a cell edge.
Each row is one animation; its frames run left to right:
Row 1 — idle (6 frames, loops): 1) neutral stance · 2) breathing in, chest rising · 3) breath held, weight shifts slightly forward · 4) small head turn · 5) breathing out, chest sinking · 6) settling back to neutral (loops into frame 1)
Row 2 — move (6 frames, loops): 1) right foot forward, heel down · 2) weight on the right foot · 3) left leg passing · 4) left foot forward, heel down · 5) weight on the left foot · 6) right leg passing (loops)
Row 3 — attack (6 frames): 1) ready stance · 2) anticipation: draws back, coiled · 3) strike: thrusts its spear forward from behind its shield · 4) impact pose, fully extended · 5) follow-through · 6) recovering to the ready stance
Row 4 — defend (cells 1–3): 1) ready stance · 2) raises its shield and braces behind it · 3) braced (held) | hit (cells 4–6): 1) struck: jolts back · 2) recoils, flinching · 3) steadies
Row 5 — death (6 frames, last frame held): 1) struck a final time · 2) staggers back · 3) legs buckle · 4) falls · 5) hits the ground · 6) lying still on the ground (held: the body stays on the battlefield)
Row 6 — victory (6 frames, loops): 1) begins a triumphant gesture · 2) raises weapon, head or wings high · 3) peak of the gesture · 4) holds · 5) lowers slightly · 6) raises again (loops into frame 2)
In every frame: the exact same Veteran Hoplite, same size, same anatomy, armour, equipment, materials and lighting; it faces right; its feet stand on the cell's ground line at 90% of the cell height, centred in the cell; it stands about 56% of the cell height tall.
Fixed elevated side / three-quarter strategy-game camera (about 20° above the horizon), the same in every cell.
Modern high-resolution pre-rendered fantasy strategy-game sprite style. Strong readable silhouette. Moderate detail appropriate for gameplay scale.
Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). No ground, no shadows, no environment, no text.
```

### C · Peltast — Greek, tier 2, base form

| Field | Value |
|---|---|
| Sheet file | `sheet.creature.greek.tier2.base.png` |
| Creature | `peltast` · Javelin skirmisher · occupies 1 hex · shoots (range 16) · Shooter (passive) |
| Rows | 1. idle (6)<br>2. move (6)<br>3. attack (6)<br>4. defend (3) + hit (3)<br>5. death (6)<br>6. victory (6)<br>7. shoot (6) |
| Image | 1160 × 1352 px (about 1.6 MP) or larger with the same proportions — 6 columns × 7 rows, cells 193 × 193 px<br>or two parts for sharper frames: `sheet.creature.greek.tier2.base.part1.png` rows 1–4, 1536 × 1024 px; `sheet.creature.greek.tier2.base.part2.png` rows 5–7, 1776 × 888 px |
| Scale | a cell is 2.13 hex widths wide and 2.13 tall; ground line at 90 % of the cell height; the creature stands about 53 % of the cell height |
| Attach | `assets-source/creatures/reference/creature.greek.tier2.base.ref.threequarter.png` (canonical master); `assets-source/icons/final/creature.greek.tier2.base.portrait.png`; `support images/ChatGPT Image Sep 29, 2026, 03_35_30 PM-1.png` |
| Cuts into | 8 strips: `sprite.creature.greek.tier2.base.idle.png`, `sprite.creature.greek.tier2.base.move.png`, `sprite.creature.greek.tier2.base.attack.png`, `sprite.creature.greek.tier2.base.defend.png`, `sprite.creature.greek.tier2.base.hit.png`, `sprite.creature.greek.tier2.base.death.png`, `sprite.creature.greek.tier2.base.victory.png`, `sprite.creature.greek.tier2.base.shoot.png` |
| Status | idle placeholder, move missing, attack missing, defend missing, hit missing, death missing, victory missing, shoot missing |

```text
Using the attached canonical reference of Peltast, create one animation sheet for Pantheon Realms.
The creature: Peltast — A lightly armored skirmisher with a crescent shield and a bundle of javelins.
Image 1160 × 1352 px (or larger, same proportions): an invisible grid of 6 columns × 7 rows of equal cells, each cell 2.13 hex widths wide. No grid lines, no borders, no labels, no numbers, no text. Every item stays inside its own cell with clear empty space around it; nothing touches or crosses a cell edge.
Each row is one animation; its frames run left to right:
Row 1 — idle (6 frames, loops): 1) neutral stance · 2) breathing in, chest rising · 3) breath held, weight shifts slightly forward · 4) small head turn · 5) breathing out, chest sinking · 6) settling back to neutral (loops into frame 1)
Row 2 — move (6 frames, loops): 1) right foot forward, heel down · 2) weight on the right foot · 3) left leg passing · 4) left foot forward, heel down · 5) weight on the left foot · 6) right leg passing (loops)
Row 3 — attack (6 frames): 1) ready stance · 2) anticipation: draws back, coiled · 3) strike: jabs with a javelin or blade held close, guarding with its off arm · 4) impact pose, fully extended · 5) follow-through · 6) recovering to the ready stance
Row 4 — defend (cells 1–3): 1) ready stance · 2) raises its small shield or arm and crouches · 3) braced (held) | hit (cells 4–6): 1) struck: jolts back · 2) recoils, flinching · 3) steadies
Row 5 — death (6 frames, last frame held): 1) struck a final time · 2) staggers back · 3) legs buckle · 4) falls · 5) hits the ground · 6) lying still on the ground (held: the body stays on the battlefield)
Row 6 — victory (6 frames, loops): 1) begins a triumphant gesture · 2) raises weapon, head or wings high · 3) peak of the gesture · 4) holds · 5) lowers slightly · 6) raises again (loops into frame 2)
Row 7 — shoot (6 frames): 1) ready stance · 2) draws or winds up, aiming · 3) release: throws its ranged weapon (javelin, sling stone or arrow, as in the reference) · 4) follow-through (the missile has left; the game draws it in flight) · 5) recoil · 6) recovering to the ready stance
In every frame: the exact same Peltast, same size, same anatomy, armour, equipment, materials and lighting; it faces right; its feet stand on the cell's ground line at 90% of the cell height, centred in the cell; it stands about 53% of the cell height tall.
Fixed elevated side / three-quarter strategy-game camera (about 20° above the horizon), the same in every cell.
Modern high-resolution pre-rendered fantasy strategy-game sprite style. Strong readable silhouette. Moderate detail appropriate for gameplay scale.
Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). No ground, no shadows, no environment, no text.
```

### C · Veteran Peltast — Greek, tier 2, upgraded form

| Field | Value |
|---|---|
| Sheet file | `sheet.creature.greek.tier2.upgraded.png` |
| Creature | `veteran_peltast` · Javelin skirmisher · occupies 1 hex · shoots (range 17) · Shooter (passive) |
| Rows | 1. idle (6)<br>2. move (6)<br>3. attack (6)<br>4. defend (3) + hit (3)<br>5. death (6)<br>6. victory (6)<br>7. shoot (6) |
| Image | 1160 × 1352 px (about 1.6 MP) or larger with the same proportions — 6 columns × 7 rows, cells 193 × 193 px<br>or two parts for sharper frames: `sheet.creature.greek.tier2.upgraded.part1.png` rows 1–4, 1536 × 1024 px; `sheet.creature.greek.tier2.upgraded.part2.png` rows 5–7, 1776 × 888 px |
| Scale | a cell is 2.13 hex widths wide and 2.13 tall; ground line at 90 % of the cell height; the creature stands about 55 % of the cell height |
| Attach | `sheet.creature.greek.tier2.base.png` (the base form's sheet — same layout and poses); `assets-source/creatures/reference/creature.greek.tier2.upgraded.ref.threequarter.png` (canonical master); `assets-source/icons/final/creature.greek.tier2.upgraded.portrait.png`; `support images/ChatGPT Image Sep 29, 2026, 03_35_30 PM-1.png` |
| Cuts into | 8 strips: `sprite.creature.greek.tier2.upgraded.idle.png`, `sprite.creature.greek.tier2.upgraded.move.png`, `sprite.creature.greek.tier2.upgraded.attack.png`, `sprite.creature.greek.tier2.upgraded.defend.png`, `sprite.creature.greek.tier2.upgraded.hit.png`, `sprite.creature.greek.tier2.upgraded.death.png`, `sprite.creature.greek.tier2.upgraded.victory.png`, `sprite.creature.greek.tier2.upgraded.shoot.png` |
| Status | idle placeholder, move missing, attack missing, defend missing, hit missing, death missing, victory missing, shoot missing |

```text
Using the attached animation sheet of Peltast and the canonical reference of Veteran Peltast, create the same animation sheet for Veteran Peltast, its upgraded form, for Pantheon Realms.
Keep the attached sheet's layout, every frame's pose, timing, camera, scale and place in its cell; change only the creature design to the upgraded form.
The creature: Veteran Peltast — A skirmisher with a reinforced helmet, braced throwing arm and a tidy javelin harness.
Image 1160 × 1352 px (or larger, same proportions): an invisible grid of 6 columns × 7 rows of equal cells, each cell 2.13 hex widths wide. No grid lines, no borders, no labels, no numbers, no text. Every item stays inside its own cell with clear empty space around it; nothing touches or crosses a cell edge.
Each row is one animation; its frames run left to right:
Row 1 — idle (6 frames, loops): 1) neutral stance · 2) breathing in, chest rising · 3) breath held, weight shifts slightly forward · 4) small head turn · 5) breathing out, chest sinking · 6) settling back to neutral (loops into frame 1)
Row 2 — move (6 frames, loops): 1) right foot forward, heel down · 2) weight on the right foot · 3) left leg passing · 4) left foot forward, heel down · 5) weight on the left foot · 6) right leg passing (loops)
Row 3 — attack (6 frames): 1) ready stance · 2) anticipation: draws back, coiled · 3) strike: jabs with a javelin or blade held close, guarding with its off arm · 4) impact pose, fully extended · 5) follow-through · 6) recovering to the ready stance
Row 4 — defend (cells 1–3): 1) ready stance · 2) raises its small shield or arm and crouches · 3) braced (held) | hit (cells 4–6): 1) struck: jolts back · 2) recoils, flinching · 3) steadies
Row 5 — death (6 frames, last frame held): 1) struck a final time · 2) staggers back · 3) legs buckle · 4) falls · 5) hits the ground · 6) lying still on the ground (held: the body stays on the battlefield)
Row 6 — victory (6 frames, loops): 1) begins a triumphant gesture · 2) raises weapon, head or wings high · 3) peak of the gesture · 4) holds · 5) lowers slightly · 6) raises again (loops into frame 2)
Row 7 — shoot (6 frames): 1) ready stance · 2) draws or winds up, aiming · 3) release: throws its ranged weapon (javelin, sling stone or arrow, as in the reference) · 4) follow-through (the missile has left; the game draws it in flight) · 5) recoil · 6) recovering to the ready stance
In every frame: the exact same Veteran Peltast, same size, same anatomy, armour, equipment, materials and lighting; it faces right; its feet stand on the cell's ground line at 90% of the cell height, centred in the cell; it stands about 55% of the cell height tall.
Fixed elevated side / three-quarter strategy-game camera (about 20° above the horizon), the same in every cell.
Modern high-resolution pre-rendered fantasy strategy-game sprite style. Strong readable silhouette. Moderate detail appropriate for gameplay scale.
Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). No ground, no shadows, no environment, no text.
```

### C · Griffin — Greek, tier 3, base form

| Field | Value |
|---|---|
| Sheet file | `sheet.creature.greek.tier3.base.png` |
| Creature | `griffin` · Flying interceptor · occupies 2 hexes · Flight (passive) · Double Retaliation (passive) |
| Rows | 1. idle (6)<br>2. move (6)<br>3. attack (6)<br>4. defend (3) + hit (3)<br>5. death (6)<br>6. victory (6)<br>7. takeoff (3) + landing (3)<br>8. fly (6) |
| Image | 1328 × 1184 px (about 1.6 MP) or larger with the same proportions — 6 columns × 8 rows, cells 221 × 148 px<br>or two parts for sharper frames: `sheet.creature.greek.tier3.base.part1.png` rows 1–4, 1880 × 840 px; `sheet.creature.greek.tier3.base.part2.png` rows 5–8, 1880 × 840 px |
| Scale | a cell is 3.20 hex widths wide and 2.13 tall; ground line at 90 % of the cell height; the creature stands about 62 % of the cell height |
| Attach | `assets-source/creatures/reference/creature.greek.tier3.base.ref.threequarter.png` (canonical master); `assets-source/icons/final/creature.greek.tier3.base.portrait.png`; `support images/ChatGPT Image Sep 29, 2026, 03_35_30 PM-1.png` |
| Cuts into | 10 strips: `sprite.creature.greek.tier3.base.idle.png`, `sprite.creature.greek.tier3.base.move.png`, `sprite.creature.greek.tier3.base.attack.png`, `sprite.creature.greek.tier3.base.defend.png`, `sprite.creature.greek.tier3.base.hit.png`, `sprite.creature.greek.tier3.base.death.png`, `sprite.creature.greek.tier3.base.victory.png`, `sprite.creature.greek.tier3.base.takeoff.png`, `sprite.creature.greek.tier3.base.landing.png`, `sprite.creature.greek.tier3.base.fly.png` |
| Status | idle placeholder, move missing, attack missing, defend missing, hit missing, death missing, victory missing, takeoff missing, landing missing, fly missing |

```text
Using the attached canonical reference of Griffin, create one animation sheet for Pantheon Realms.
The creature: Griffin — An eagle-headed, winged lion-bodied creature with tawny fur and pale head feathers.
Image 1328 × 1184 px (or larger, same proportions): an invisible grid of 6 columns × 8 rows of equal cells, each cell 3.20 hex widths wide. No grid lines, no borders, no labels, no numbers, no text. Every item stays inside its own cell with clear empty space around it; nothing touches or crosses a cell edge.
Each row is one animation; its frames run left to right:
Row 1 — idle (6 frames, loops): 1) neutral stance · 2) breathing in, chest rising · 3) breath held, weight shifts slightly forward · 4) small head turn · 5) breathing out, chest sinking · 6) settling back to neutral (loops into frame 1)
Row 2 — move (6 frames, loops): 1) front left foot down · 2) pushing off · 3) legs gathered · 4) front right foot down · 5) pushing off · 6) legs stretched (loops)
Row 3 — attack (6 frames): 1) ready stance · 2) anticipation: draws back, coiled · 3) strike: lunges, raking with its front talons and snapping its beak · 4) impact pose, fully extended · 5) follow-through · 6) recovering to the ready stance
Row 4 — defend (cells 1–3): 1) ready stance · 2) draws its wings around its body and lowers its head · 3) braced (held) | hit (cells 4–6): 1) struck: jolts back · 2) recoils, flinching · 3) steadies
Row 5 — death (6 frames, last frame held): 1) struck a final time · 2) staggers back · 3) legs buckle · 4) falls · 5) hits the ground · 6) lying still on the ground (held: the body stays on the battlefield)
Row 6 — victory (6 frames, loops): 1) begins a triumphant gesture · 2) raises weapon, head or wings high · 3) peak of the gesture · 4) holds · 5) lowers slightly · 6) raises again (loops into frame 2)
Row 7 — takeoff (cells 1–3): 1) crouches, wings rising · 2) first downbeat, feet leave the ground · 3) hovering at flight height | landing (cells 4–6): 1) hovering, wings spread to brake · 2) touchdown, legs absorbing the landing · 3) standing, wings folding
Row 8 — fly (6 frames, loops): 1) wings up · 2) downbeat · 3) wings down · 4) upstroke · 5) wings level · 6) wings rising (loops)
In every frame: the exact same Griffin, same size, same anatomy, armour, equipment, materials and lighting; it faces right; its feet stand on the cell's ground line at 90% of the cell height, centred in the cell (airborne frames hover about 15% of the cell height above that line); it stands about 62% of the cell height tall.
Fixed elevated side / three-quarter strategy-game camera (about 20° above the horizon), the same in every cell.
Modern high-resolution pre-rendered fantasy strategy-game sprite style. Strong readable silhouette. Moderate detail appropriate for gameplay scale.
Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). No ground, no shadows, no environment, no text.
```

### C · Windcrest Griffin — Greek, tier 3, upgraded form

| Field | Value |
|---|---|
| Sheet file | `sheet.creature.greek.tier3.upgraded.png` |
| Creature | `windcrest_griffin` · Flying interceptor · occupies 2 hexes · Flight (passive) · Unlimited Retaliation (passive) |
| Rows | 1. idle (6)<br>2. move (6)<br>3. attack (6)<br>4. defend (3) + hit (3)<br>5. death (6)<br>6. victory (6)<br>7. takeoff (3) + landing (3)<br>8. fly (6) |
| Image | 1312 × 1200 px (about 1.6 MP) or larger with the same proportions — 6 columns × 8 rows, cells 219 × 150 px<br>or two parts for sharper frames: `sheet.creature.greek.tier3.upgraded.part1.png` rows 1–4, 1856 × 848 px; `sheet.creature.greek.tier3.upgraded.part2.png` rows 5–8, 1856 × 848 px |
| Scale | a cell is 3.20 hex widths wide and 2.20 tall; ground line at 90 % of the cell height; the creature stands about 63 % of the cell height |
| Attach | `sheet.creature.greek.tier3.base.png` (the base form's sheet — same layout and poses); `assets-source/creatures/reference/creature.greek.tier3.upgraded.ref.threequarter.png` (canonical master); `assets-source/icons/final/creature.greek.tier3.upgraded.portrait.png`; `support images/ChatGPT Image Sep 29, 2026, 03_35_30 PM-1.png` |
| Cuts into | 10 strips: `sprite.creature.greek.tier3.upgraded.idle.png`, `sprite.creature.greek.tier3.upgraded.move.png`, `sprite.creature.greek.tier3.upgraded.attack.png`, `sprite.creature.greek.tier3.upgraded.defend.png`, `sprite.creature.greek.tier3.upgraded.hit.png`, `sprite.creature.greek.tier3.upgraded.death.png`, `sprite.creature.greek.tier3.upgraded.victory.png`, `sprite.creature.greek.tier3.upgraded.takeoff.png`, `sprite.creature.greek.tier3.upgraded.landing.png`, `sprite.creature.greek.tier3.upgraded.fly.png` |
| Status | idle placeholder, move missing, attack missing, defend missing, hit missing, death missing, victory missing, takeoff missing, landing missing, fly missing |

```text
Using the attached animation sheet of Griffin and the canonical reference of Windcrest Griffin, create the same animation sheet for Windcrest Griffin, its upgraded form, for Pantheon Realms.
Keep the attached sheet's layout, every frame's pose, timing, camera, scale and place in its cell; change only the creature design to the upgraded form.
The creature: Windcrest Griffin — A griffin with a swept feather crest, long primary feathers and pale-blue accents.
Image 1312 × 1200 px (or larger, same proportions): an invisible grid of 6 columns × 8 rows of equal cells, each cell 3.20 hex widths wide. No grid lines, no borders, no labels, no numbers, no text. Every item stays inside its own cell with clear empty space around it; nothing touches or crosses a cell edge.
Each row is one animation; its frames run left to right:
Row 1 — idle (6 frames, loops): 1) neutral stance · 2) breathing in, chest rising · 3) breath held, weight shifts slightly forward · 4) small head turn · 5) breathing out, chest sinking · 6) settling back to neutral (loops into frame 1)
Row 2 — move (6 frames, loops): 1) front left foot down · 2) pushing off · 3) legs gathered · 4) front right foot down · 5) pushing off · 6) legs stretched (loops)
Row 3 — attack (6 frames): 1) ready stance · 2) anticipation: draws back, coiled · 3) strike: lunges, raking with its front talons and snapping its beak · 4) impact pose, fully extended · 5) follow-through · 6) recovering to the ready stance
Row 4 — defend (cells 1–3): 1) ready stance · 2) draws its wings around its body and lowers its head · 3) braced (held) | hit (cells 4–6): 1) struck: jolts back · 2) recoils, flinching · 3) steadies
Row 5 — death (6 frames, last frame held): 1) struck a final time · 2) staggers back · 3) legs buckle · 4) falls · 5) hits the ground · 6) lying still on the ground (held: the body stays on the battlefield)
Row 6 — victory (6 frames, loops): 1) begins a triumphant gesture · 2) raises weapon, head or wings high · 3) peak of the gesture · 4) holds · 5) lowers slightly · 6) raises again (loops into frame 2)
Row 7 — takeoff (cells 1–3): 1) crouches, wings rising · 2) first downbeat, feet leave the ground · 3) hovering at flight height | landing (cells 4–6): 1) hovering, wings spread to brake · 2) touchdown, legs absorbing the landing · 3) standing, wings folding
Row 8 — fly (6 frames, loops): 1) wings up · 2) downbeat · 3) wings down · 4) upstroke · 5) wings level · 6) wings rising (loops)
In every frame: the exact same Windcrest Griffin, same size, same anatomy, armour, equipment, materials and lighting; it faces right; its feet stand on the cell's ground line at 90% of the cell height, centred in the cell (airborne frames hover about 15% of the cell height above that line); it stands about 63% of the cell height tall.
Fixed elevated side / three-quarter strategy-game camera (about 20° above the horizon), the same in every cell.
Modern high-resolution pre-rendered fantasy strategy-game sprite style. Strong readable silhouette. Moderate detail appropriate for gameplay scale.
Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). No ground, no shadows, no environment, no text.
```

### C · Cavalry — Greek, tier 4, base form

| Field | Value |
|---|---|
| Sheet file | `sheet.creature.greek.tier4.base.png` |
| Creature | `cavalry` · Mounted shock troops · occupies 2 hexes · Charge (passive) |
| Rows | 1. idle (6)<br>2. move (6)<br>3. attack (6)<br>4. defend (3) + hit (3)<br>5. death (6)<br>6. victory (6) |
| Image | 1536 × 1024 px (about 1.6 MP) or larger with the same proportions — 6 columns × 6 rows, cells 256 × 171 px |
| Scale | a cell is 3.20 hex widths wide and 2.13 tall; ground line at 90 % of the cell height; the creature stands about 73 % of the cell height |
| Attach | `assets-source/creatures/reference/creature.greek.tier4.base.ref.threequarter.png` (canonical master); `assets-source/icons/final/creature.greek.tier4.base.portrait.png`; `support images/ChatGPT Image Sep 29, 2026, 03_35_30 PM-1.png` |
| Cuts into | 7 strips: `sprite.creature.greek.tier4.base.idle.png`, `sprite.creature.greek.tier4.base.move.png`, `sprite.creature.greek.tier4.base.attack.png`, `sprite.creature.greek.tier4.base.defend.png`, `sprite.creature.greek.tier4.base.hit.png`, `sprite.creature.greek.tier4.base.death.png`, `sprite.creature.greek.tier4.base.victory.png` |
| Status | idle placeholder, move missing, attack missing, defend missing, hit missing, death missing, victory missing |

```text
Using the attached canonical reference of Cavalry, create one animation sheet for Pantheon Realms.
The creature: Cavalry — A lance-bearing rider with a shield on a compact warhorse with a saddle blanket.
Image 1536 × 1024 px (or larger, same proportions): an invisible grid of 6 columns × 6 rows of equal cells, each cell 3.20 hex widths wide. No grid lines, no borders, no labels, no numbers, no text. Every item stays inside its own cell with clear empty space around it; nothing touches or crosses a cell edge.
Each row is one animation; its frames run left to right:
Row 1 — idle (6 frames, loops): 1) neutral stance · 2) breathing in, chest rising · 3) breath held, weight shifts slightly forward · 4) small head turn · 5) breathing out, chest sinking · 6) settling back to neutral (loops into frame 1)
Row 2 — move (6 frames, loops): 1) front left foot down · 2) pushing off · 3) legs gathered · 4) front right foot down · 5) pushing off · 6) legs stretched (loops)
Row 3 — attack (6 frames): 1) ready stance · 2) anticipation: draws back, coiled · 3) strike: urges the mount a half step forward and drives the lance or blade forward · 4) impact pose, fully extended · 5) follow-through · 6) recovering to the ready stance
Row 4 — defend (cells 1–3): 1) ready stance · 2) lowers its head and braces · 3) braced (held) | hit (cells 4–6): 1) struck: jolts back · 2) recoils, flinching · 3) steadies
Row 5 — death (6 frames, last frame held): 1) struck a final time · 2) staggers back · 3) legs buckle · 4) falls · 5) hits the ground · 6) lying still on the ground (held: the body stays on the battlefield)
Row 6 — victory (6 frames, loops): 1) begins a triumphant gesture · 2) raises weapon, head or wings high · 3) peak of the gesture · 4) holds · 5) lowers slightly · 6) raises again (loops into frame 2)
In every frame: the exact same Cavalry, same size, same anatomy, armour, equipment, materials and lighting; it faces right; its feet stand on the cell's ground line at 90% of the cell height, centred in the cell; it stands about 73% of the cell height tall.
Fixed elevated side / three-quarter strategy-game camera (about 20° above the horizon), the same in every cell.
Modern high-resolution pre-rendered fantasy strategy-game sprite style. Strong readable silhouette. Moderate detail appropriate for gameplay scale.
Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). No ground, no shadows, no environment, no text.
```

### C · Companion Cavalry — Greek, tier 4, upgraded form

| Field | Value |
|---|---|
| Sheet file | `sheet.creature.greek.tier4.upgraded.png` |
| Creature | `companion_cavalry` · Mounted shock troops · occupies 2 hexes · Charge (passive) |
| Rows | 1. idle (6)<br>2. move (6)<br>3. attack (6)<br>4. defend (3) + hit (3)<br>5. death (6)<br>6. victory (6) |
| Image | 1512 × 1040 px (about 1.6 MP) or larger with the same proportions — 6 columns × 6 rows, cells 252 × 173 px |
| Scale | a cell is 3.20 hex widths wide and 2.20 tall; ground line at 90 % of the cell height; the creature stands about 74 % of the cell height |
| Attach | `sheet.creature.greek.tier4.base.png` (the base form's sheet — same layout and poses); `assets-source/creatures/reference/creature.greek.tier4.upgraded.ref.threequarter.png` (canonical master); `assets-source/icons/final/creature.greek.tier4.upgraded.portrait.png`; `support images/ChatGPT Image Sep 29, 2026, 03_35_30 PM-1.png` |
| Cuts into | 7 strips: `sprite.creature.greek.tier4.upgraded.idle.png`, `sprite.creature.greek.tier4.upgraded.move.png`, `sprite.creature.greek.tier4.upgraded.attack.png`, `sprite.creature.greek.tier4.upgraded.defend.png`, `sprite.creature.greek.tier4.upgraded.hit.png`, `sprite.creature.greek.tier4.upgraded.death.png`, `sprite.creature.greek.tier4.upgraded.victory.png` |
| Status | idle placeholder, move missing, attack missing, defend missing, hit missing, death missing, victory missing |

```text
Using the attached animation sheet of Cavalry and the canonical reference of Companion Cavalry, create the same animation sheet for Companion Cavalry, its upgraded form, for Pantheon Realms.
Keep the attached sheet's layout, every frame's pose, timing, camera, scale and place in its cell; change only the creature design to the upgraded form.
The creature: Companion Cavalry — A crested rider on a horse with layered neck and chest protection.
Image 1512 × 1040 px (or larger, same proportions): an invisible grid of 6 columns × 6 rows of equal cells, each cell 3.20 hex widths wide. No grid lines, no borders, no labels, no numbers, no text. Every item stays inside its own cell with clear empty space around it; nothing touches or crosses a cell edge.
Each row is one animation; its frames run left to right:
Row 1 — idle (6 frames, loops): 1) neutral stance · 2) breathing in, chest rising · 3) breath held, weight shifts slightly forward · 4) small head turn · 5) breathing out, chest sinking · 6) settling back to neutral (loops into frame 1)
Row 2 — move (6 frames, loops): 1) front left foot down · 2) pushing off · 3) legs gathered · 4) front right foot down · 5) pushing off · 6) legs stretched (loops)
Row 3 — attack (6 frames): 1) ready stance · 2) anticipation: draws back, coiled · 3) strike: urges the mount a half step forward and drives the lance or blade forward · 4) impact pose, fully extended · 5) follow-through · 6) recovering to the ready stance
Row 4 — defend (cells 1–3): 1) ready stance · 2) lowers its head and braces · 3) braced (held) | hit (cells 4–6): 1) struck: jolts back · 2) recoils, flinching · 3) steadies
Row 5 — death (6 frames, last frame held): 1) struck a final time · 2) staggers back · 3) legs buckle · 4) falls · 5) hits the ground · 6) lying still on the ground (held: the body stays on the battlefield)
Row 6 — victory (6 frames, loops): 1) begins a triumphant gesture · 2) raises weapon, head or wings high · 3) peak of the gesture · 4) holds · 5) lowers slightly · 6) raises again (loops into frame 2)
In every frame: the exact same Companion Cavalry, same size, same anatomy, armour, equipment, materials and lighting; it faces right; its feet stand on the cell's ground line at 90% of the cell height, centred in the cell; it stands about 74% of the cell height tall.
Fixed elevated side / three-quarter strategy-game camera (about 20° above the horizon), the same in every cell.
Modern high-resolution pre-rendered fantasy strategy-game sprite style. Strong readable silhouette. Moderate detail appropriate for gameplay scale.
Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). No ground, no shadows, no environment, no text.
```

### C · Temple Adept — Greek, tier 5, base form

| Field | Value |
|---|---|
| Sheet file | `sheet.creature.greek.tier5.base.png` |
| Creature | `temple_adept` · Ranged support · occupies 1 hex · shoots (range 18) · Shooter (passive) |
| Rows | 1. idle (6)<br>2. move (6)<br>3. attack (6)<br>4. defend (3) + hit (3)<br>5. death (6)<br>6. victory (6)<br>7. shoot (6) |
| Image | 1160 × 1352 px (about 1.6 MP) or larger with the same proportions — 6 columns × 7 rows, cells 193 × 193 px<br>or two parts for sharper frames: `sheet.creature.greek.tier5.base.part1.png` rows 1–4, 1536 × 1024 px; `sheet.creature.greek.tier5.base.part2.png` rows 5–7, 1776 × 888 px |
| Scale | a cell is 2.13 hex widths wide and 2.13 tall; ground line at 90 % of the cell height; the creature stands about 60 % of the cell height |
| Attach | `assets-source/creatures/reference/creature.greek.tier5.base.ref.threequarter.png` (canonical master); `assets-source/icons/final/creature.greek.tier5.base.portrait.png`; `support images/ChatGPT Image Sep 29, 2026, 03_35_30 PM-1.png` |
| Cuts into | 8 strips: `sprite.creature.greek.tier5.base.idle.png`, `sprite.creature.greek.tier5.base.move.png`, `sprite.creature.greek.tier5.base.attack.png`, `sprite.creature.greek.tier5.base.defend.png`, `sprite.creature.greek.tier5.base.hit.png`, `sprite.creature.greek.tier5.base.death.png`, `sprite.creature.greek.tier5.base.victory.png`, `sprite.creature.greek.tier5.base.shoot.png` |
| Status | idle placeholder, move missing, attack missing, defend missing, hit missing, death missing, victory missing, shoot missing |

```text
Using the attached canonical reference of Temple Adept, create one animation sheet for Pantheon Realms.
The creature: Temple Adept — A robed scholar with a staff topped by a geometric bronze focus.
Image 1160 × 1352 px (or larger, same proportions): an invisible grid of 6 columns × 7 rows of equal cells, each cell 2.13 hex widths wide. No grid lines, no borders, no labels, no numbers, no text. Every item stays inside its own cell with clear empty space around it; nothing touches or crosses a cell edge.
Each row is one animation; its frames run left to right:
Row 1 — idle (6 frames, loops): 1) neutral stance · 2) breathing in, chest rising · 3) breath held, weight shifts slightly forward · 4) small head turn · 5) breathing out, chest sinking · 6) settling back to neutral (loops into frame 1)
Row 2 — move (6 frames, loops): 1) right foot forward, heel down · 2) weight on the right foot · 3) left leg passing · 4) left foot forward, heel down · 5) weight on the left foot · 6) right leg passing (loops)
Row 3 — attack (6 frames): 1) ready stance · 2) anticipation: draws back, coiled · 3) strike: strikes with its staff in a short overhead blow · 4) impact pose, fully extended · 5) follow-through · 6) recovering to the ready stance
Row 4 — defend (cells 1–3): 1) ready stance · 2) raises its staff crosswise and steadies itself · 3) braced (held) | hit (cells 4–6): 1) struck: jolts back · 2) recoils, flinching · 3) steadies
Row 5 — death (6 frames, last frame held): 1) struck a final time · 2) staggers back · 3) legs buckle · 4) falls · 5) hits the ground · 6) lying still on the ground (held: the body stays on the battlefield)
Row 6 — victory (6 frames, loops): 1) begins a triumphant gesture · 2) raises weapon, head or wings high · 3) peak of the gesture · 4) holds · 5) lowers slightly · 6) raises again (loops into frame 2)
Row 7 — shoot (6 frames): 1) ready stance · 2) draws or winds up, aiming · 3) release: casts a bolt of power from its staff or hands · 4) follow-through (the missile has left; the game draws it in flight) · 5) recoil · 6) recovering to the ready stance
In every frame: the exact same Temple Adept, same size, same anatomy, armour, equipment, materials and lighting; it faces right; its feet stand on the cell's ground line at 90% of the cell height, centred in the cell; it stands about 60% of the cell height tall.
Fixed elevated side / three-quarter strategy-game camera (about 20° above the horizon), the same in every cell.
Modern high-resolution pre-rendered fantasy strategy-game sprite style. Strong readable silhouette. Moderate detail appropriate for gameplay scale.
Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). No ground, no shadows, no environment, no text.
```

### C · Temple Seer — Greek, tier 5, upgraded form

| Field | Value |
|---|---|
| Sheet file | `sheet.creature.greek.tier5.upgraded.png` |
| Creature | `temple_seer` · Ranged support · occupies 1 hex · shoots (range 19) · Shooter (passive) · Ward (active) |
| Rows | 1. idle (6)<br>2. move (6)<br>3. attack (6)<br>4. defend (3) + hit (3)<br>5. death (6)<br>6. victory (6)<br>7. shoot (6)<br>8. ability (6) |
| Image | 1088 × 1448 px (about 1.6 MP) or larger with the same proportions — 6 columns × 8 rows, cells 181 × 181 px<br>or two parts for sharper frames: `sheet.creature.greek.tier5.upgraded.part1.png` rows 1–4, 1536 × 1024 px; `sheet.creature.greek.tier5.upgraded.part2.png` rows 5–8, 1536 × 1024 px |
| Scale | a cell is 2.13 hex widths wide and 2.13 tall; ground line at 90 % of the cell height; the creature stands about 63 % of the cell height |
| Attach | `sheet.creature.greek.tier5.base.png` (the base form's sheet — same layout and poses); `assets-source/creatures/reference/creature.greek.tier5.upgraded.ref.threequarter.png` (canonical master); `assets-source/icons/final/creature.greek.tier5.upgraded.portrait.png`; `support images/ChatGPT Image Sep 29, 2026, 03_35_30 PM-1.png` |
| Cuts into | 9 strips: `sprite.creature.greek.tier5.upgraded.idle.png`, `sprite.creature.greek.tier5.upgraded.move.png`, `sprite.creature.greek.tier5.upgraded.attack.png`, `sprite.creature.greek.tier5.upgraded.defend.png`, `sprite.creature.greek.tier5.upgraded.hit.png`, `sprite.creature.greek.tier5.upgraded.death.png`, `sprite.creature.greek.tier5.upgraded.victory.png`, `sprite.creature.greek.tier5.upgraded.shoot.png`, `sprite.creature.greek.tier5.upgraded.ability.png` |
| Status | idle placeholder, move missing, attack missing, defend missing, hit missing, death missing, victory missing, shoot missing, ability missing |

```text
Using the attached animation sheet of Temple Adept and the canonical reference of Temple Seer, create the same animation sheet for Temple Seer, its upgraded form, for Pantheon Realms.
Keep the attached sheet's layout, every frame's pose, timing, camera, scale and place in its cell; change only the creature design to the upgraded form.
The creature: Temple Seer — A robed seer with a sculpted headpiece, layered mantle and a larger staff focus.
Image 1088 × 1448 px (or larger, same proportions): an invisible grid of 6 columns × 8 rows of equal cells, each cell 2.13 hex widths wide. No grid lines, no borders, no labels, no numbers, no text. Every item stays inside its own cell with clear empty space around it; nothing touches or crosses a cell edge.
Each row is one animation; its frames run left to right:
Row 1 — idle (6 frames, loops): 1) neutral stance · 2) breathing in, chest rising · 3) breath held, weight shifts slightly forward · 4) small head turn · 5) breathing out, chest sinking · 6) settling back to neutral (loops into frame 1)
Row 2 — move (6 frames, loops): 1) right foot forward, heel down · 2) weight on the right foot · 3) left leg passing · 4) left foot forward, heel down · 5) weight on the left foot · 6) right leg passing (loops)
Row 3 — attack (6 frames): 1) ready stance · 2) anticipation: draws back, coiled · 3) strike: strikes with its staff in a short overhead blow · 4) impact pose, fully extended · 5) follow-through · 6) recovering to the ready stance
Row 4 — defend (cells 1–3): 1) ready stance · 2) raises its staff crosswise and steadies itself · 3) braced (held) | hit (cells 4–6): 1) struck: jolts back · 2) recoils, flinching · 3) steadies
Row 5 — death (6 frames, last frame held): 1) struck a final time · 2) staggers back · 3) legs buckle · 4) falls · 5) hits the ground · 6) lying still on the ground (held: the body stays on the battlefield)
Row 6 — victory (6 frames, loops): 1) begins a triumphant gesture · 2) raises weapon, head or wings high · 3) peak of the gesture · 4) holds · 5) lowers slightly · 6) raises again (loops into frame 2)
Row 7 — shoot (6 frames): 1) ready stance · 2) draws or winds up, aiming · 3) release: casts a bolt of power from its staff or hands · 4) follow-through (the missile has left; the game draws it in flight) · 5) recoil · 6) recovering to the ready stance
Row 8 — ability (6 frames): 1) ready stance · 2) begins to use Ward (Places a protective ward on a friendly stack) · 3) builds up · 4) the ability takes effect (a short glow around the creature; no text) · 5) glow fading · 6) recovering to the ready stance
In every frame: the exact same Temple Seer, same size, same anatomy, armour, equipment, materials and lighting; it faces right; its feet stand on the cell's ground line at 90% of the cell height, centred in the cell; it stands about 63% of the cell height tall.
Fixed elevated side / three-quarter strategy-game camera (about 20° above the horizon), the same in every cell.
Modern high-resolution pre-rendered fantasy strategy-game sprite style. Strong readable silhouette. Moderate detail appropriate for gameplay scale.
Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). No ground, no shadows, no environment, no text.
```

### C · Minotaur — Greek, tier 6, base form

| Field | Value |
|---|---|
| Sheet file | `sheet.creature.greek.tier6.base.png` |
| Creature | `minotaur` · Heavy melee · occupies 2 hexes · Unyielding (passive) |
| Rows | 1. idle (6)<br>2. move (6)<br>3. attack (6)<br>4. defend (3) + hit (3)<br>5. death (6)<br>6. victory (6) |
| Image | 1536 × 1024 px (about 1.6 MP) or larger with the same proportions — 6 columns × 6 rows, cells 256 × 171 px |
| Scale | a cell is 3.20 hex widths wide and 2.13 tall; ground line at 90 % of the cell height; the creature stands about 75 % of the cell height |
| Attach | `assets-source/creatures/reference/creature.greek.tier6.base.ref.threequarter.png` (canonical master); `assets-source/icons/final/creature.greek.tier6.base.portrait.png`; `support images/ChatGPT Image Sep 29, 2026, 03_35_30 PM-1.png` |
| Cuts into | 7 strips: `sprite.creature.greek.tier6.base.idle.png`, `sprite.creature.greek.tier6.base.move.png`, `sprite.creature.greek.tier6.base.attack.png`, `sprite.creature.greek.tier6.base.defend.png`, `sprite.creature.greek.tier6.base.hit.png`, `sprite.creature.greek.tier6.base.death.png`, `sprite.creature.greek.tier6.base.victory.png` |
| Status | idle placeholder, move missing, attack missing, defend missing, hit missing, death missing, victory missing |

```text
Using the attached canonical reference of Minotaur, create one animation sheet for Pantheon Realms.
The creature: Minotaur — A bull-headed biped with powerful shoulders, chest straps and a heavy axe.
Image 1536 × 1024 px (or larger, same proportions): an invisible grid of 6 columns × 6 rows of equal cells, each cell 3.20 hex widths wide. No grid lines, no borders, no labels, no numbers, no text. Every item stays inside its own cell with clear empty space around it; nothing touches or crosses a cell edge.
Each row is one animation; its frames run left to right:
Row 1 — idle (6 frames, loops): 1) neutral stance · 2) breathing in, chest rising · 3) breath held, weight shifts slightly forward · 4) small head turn · 5) breathing out, chest sinking · 6) settling back to neutral (loops into frame 1)
Row 2 — move (6 frames, loops): 1) right foot forward, heel down · 2) weight on the right foot · 3) left leg passing · 4) left foot forward, heel down · 5) weight on the left foot · 6) right leg passing (loops)
Row 3 — attack (6 frames): 1) ready stance · 2) anticipation: draws back, coiled · 3) strike: swings its heavy weapon in a downward arc · 4) impact pose, fully extended · 5) follow-through · 6) recovering to the ready stance
Row 4 — defend (cells 1–3): 1) ready stance · 2) lowers its head and braces · 3) braced (held) | hit (cells 4–6): 1) struck: jolts back · 2) recoils, flinching · 3) steadies
Row 5 — death (6 frames, last frame held): 1) struck a final time · 2) staggers back · 3) legs buckle · 4) falls · 5) hits the ground · 6) lying still on the ground (held: the body stays on the battlefield)
Row 6 — victory (6 frames, loops): 1) begins a triumphant gesture · 2) raises weapon, head or wings high · 3) peak of the gesture · 4) holds · 5) lowers slightly · 6) raises again (loops into frame 2)
In every frame: the exact same Minotaur, same size, same anatomy, armour, equipment, materials and lighting; it faces right; its feet stand on the cell's ground line at 90% of the cell height, centred in the cell; it stands about 75% of the cell height tall.
Fixed elevated side / three-quarter strategy-game camera (about 20° above the horizon), the same in every cell.
Modern high-resolution pre-rendered fantasy strategy-game sprite style. Strong readable silhouette. Moderate detail appropriate for gameplay scale.
Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). No ground, no shadows, no environment, no text.
```

### C · Labyrinth Warden — Greek, tier 6, upgraded form

| Field | Value |
|---|---|
| Sheet file | `sheet.creature.greek.tier6.upgraded.png` |
| Creature | `labyrinth_warden` · Heavy melee · occupies 2 hexes · Unyielding (passive) |
| Rows | 1. idle (6)<br>2. move (6)<br>3. attack (6)<br>4. defend (3) + hit (3)<br>5. death (6)<br>6. victory (6) |
| Image | 1512 × 1040 px (about 1.6 MP) or larger with the same proportions — 6 columns × 6 rows, cells 252 × 173 px |
| Scale | a cell is 3.20 hex widths wide and 2.20 tall; ground line at 90 % of the cell height; the creature stands about 76 % of the cell height |
| Attach | `sheet.creature.greek.tier6.base.png` (the base form's sheet — same layout and poses); `assets-source/creatures/reference/creature.greek.tier6.upgraded.ref.threequarter.png` (canonical master); `assets-source/icons/final/creature.greek.tier6.upgraded.portrait.png`; `support images/ChatGPT Image Sep 29, 2026, 03_35_30 PM-1.png` |
| Cuts into | 7 strips: `sprite.creature.greek.tier6.upgraded.idle.png`, `sprite.creature.greek.tier6.upgraded.move.png`, `sprite.creature.greek.tier6.upgraded.attack.png`, `sprite.creature.greek.tier6.upgraded.defend.png`, `sprite.creature.greek.tier6.upgraded.hit.png`, `sprite.creature.greek.tier6.upgraded.death.png`, `sprite.creature.greek.tier6.upgraded.victory.png` |
| Status | idle placeholder, move missing, attack missing, defend missing, hit missing, death missing, victory missing |

```text
Using the attached animation sheet of Minotaur and the canonical reference of Labyrinth Warden, create the same animation sheet for Labyrinth Warden, its upgraded form, for Pantheon Realms.
Keep the attached sheet's layout, every frame's pose, timing, camera, scale and place in its cell; change only the creature design to the upgraded form.
The creature: Labyrinth Warden — A minotaur in patterned chest armor with horn fittings and a heavier axe.
Image 1512 × 1040 px (or larger, same proportions): an invisible grid of 6 columns × 6 rows of equal cells, each cell 3.20 hex widths wide. No grid lines, no borders, no labels, no numbers, no text. Every item stays inside its own cell with clear empty space around it; nothing touches or crosses a cell edge.
Each row is one animation; its frames run left to right:
Row 1 — idle (6 frames, loops): 1) neutral stance · 2) breathing in, chest rising · 3) breath held, weight shifts slightly forward · 4) small head turn · 5) breathing out, chest sinking · 6) settling back to neutral (loops into frame 1)
Row 2 — move (6 frames, loops): 1) right foot forward, heel down · 2) weight on the right foot · 3) left leg passing · 4) left foot forward, heel down · 5) weight on the left foot · 6) right leg passing (loops)
Row 3 — attack (6 frames): 1) ready stance · 2) anticipation: draws back, coiled · 3) strike: swings its heavy weapon in a downward arc · 4) impact pose, fully extended · 5) follow-through · 6) recovering to the ready stance
Row 4 — defend (cells 1–3): 1) ready stance · 2) lowers its head and braces · 3) braced (held) | hit (cells 4–6): 1) struck: jolts back · 2) recoils, flinching · 3) steadies
Row 5 — death (6 frames, last frame held): 1) struck a final time · 2) staggers back · 3) legs buckle · 4) falls · 5) hits the ground · 6) lying still on the ground (held: the body stays on the battlefield)
Row 6 — victory (6 frames, loops): 1) begins a triumphant gesture · 2) raises weapon, head or wings high · 3) peak of the gesture · 4) holds · 5) lowers slightly · 6) raises again (loops into frame 2)
In every frame: the exact same Labyrinth Warden, same size, same anatomy, armour, equipment, materials and lighting; it faces right; its feet stand on the cell's ground line at 90% of the cell height, centred in the cell; it stands about 76% of the cell height tall.
Fixed elevated side / three-quarter strategy-game camera (about 20° above the horizon), the same in every cell.
Modern high-resolution pre-rendered fantasy strategy-game sprite style. Strong readable silhouette. Moderate detail appropriate for gameplay scale.
Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). No ground, no shadows, no environment, no text.
```

### C · Cyclops — Greek, tier 7, base form

| Field | Value |
|---|---|
| Sheet file | `sheet.creature.greek.tier7.base.png` |
| Creature | `cyclops` · Apex ranged giant · occupies 2 hexes · shoots (range 18) · Shooter (passive) · Wall Breaker (active) · No Melee Penalty (passive) |
| Rows | 1. idle (6)<br>2. move (6)<br>3. attack (6)<br>4. defend (3) + hit (3)<br>5. death (6)<br>6. victory (6)<br>7. shoot (6)<br>8. ability (6) |
| Image | 1160 × 1352 px (about 1.6 MP) or larger with the same proportions — 6 columns × 8 rows, cells 193 × 169 px<br>or two parts for sharper frames: `sheet.creature.greek.tier7.base.part1.png` rows 1–4, 1640 × 960 px; `sheet.creature.greek.tier7.base.part2.png` rows 5–8, 1640 × 960 px |
| Scale | a cell is 3.20 hex widths wide and 2.80 tall; ground line at 90 % of the cell height; the creature stands about 75 % of the cell height |
| Attach | `assets-source/creatures/reference/creature.greek.tier7.base.ref.threequarter.png` (canonical master); `assets-source/icons/final/creature.greek.tier7.base.portrait.png`; `support images/ChatGPT Image Sep 29, 2026, 03_35_30 PM-1.png` |
| Cuts into | 9 strips: `sprite.creature.greek.tier7.base.idle.png`, `sprite.creature.greek.tier7.base.move.png`, `sprite.creature.greek.tier7.base.attack.png`, `sprite.creature.greek.tier7.base.defend.png`, `sprite.creature.greek.tier7.base.hit.png`, `sprite.creature.greek.tier7.base.death.png`, `sprite.creature.greek.tier7.base.victory.png`, `sprite.creature.greek.tier7.base.shoot.png`, `sprite.creature.greek.tier7.base.ability.png` |
| Status | idle placeholder, move missing, attack missing, defend missing, hit missing, death missing, victory missing, shoot missing, ability missing |

```text
Using the attached canonical reference of Cyclops, create one animation sheet for Pantheon Realms.
The creature: Cyclops — A one-eyed giant with a stone satchel and simple bracers.
Image 1160 × 1352 px (or larger, same proportions): an invisible grid of 6 columns × 8 rows of equal cells, each cell 3.20 hex widths wide. No grid lines, no borders, no labels, no numbers, no text. Every item stays inside its own cell with clear empty space around it; nothing touches or crosses a cell edge.
Each row is one animation; its frames run left to right:
Row 1 — idle (6 frames, loops): 1) neutral stance · 2) breathing in, chest rising · 3) breath held, weight shifts slightly forward · 4) small head turn · 5) breathing out, chest sinking · 6) settling back to neutral (loops into frame 1)
Row 2 — move (6 frames, loops): 1) right foot forward, heel down · 2) weight on the right foot · 3) left leg passing · 4) left foot forward, heel down · 5) weight on the left foot · 6) right leg passing (loops)
Row 3 — attack (6 frames): 1) ready stance · 2) anticipation: draws back, coiled · 3) strike: smashes down with its weapon or fists · 4) impact pose, fully extended · 5) follow-through · 6) recovering to the ready stance
Row 4 — defend (cells 1–3): 1) ready stance · 2) lowers its head and braces · 3) braced (held) | hit (cells 4–6): 1) struck: jolts back · 2) recoils, flinching · 3) steadies
Row 5 — death (6 frames, last frame held): 1) struck a final time · 2) staggers back · 3) legs buckle · 4) falls · 5) hits the ground · 6) lying still on the ground (held: the body stays on the battlefield)
Row 6 — victory (6 frames, loops): 1) begins a triumphant gesture · 2) raises weapon, head or wings high · 3) peak of the gesture · 4) holds · 5) lowers slightly · 6) raises again (loops into frame 2)
Row 7 — shoot (6 frames): 1) ready stance · 2) draws or winds up, aiming · 3) release: hurls a boulder overhand · 4) follow-through (the missile has left; the game draws it in flight) · 5) recoil · 6) recovering to the ready stance
Row 8 — ability (6 frames): 1) ready stance · 2) begins to use Wall Breaker (Can target fortifications in a siege) · 3) builds up · 4) the ability takes effect (a short glow around the creature; no text) · 5) glow fading · 6) recovering to the ready stance
In every frame: the exact same Cyclops, same size, same anatomy, armour, equipment, materials and lighting; it faces right; its feet stand on the cell's ground line at 90% of the cell height, centred in the cell; it stands about 75% of the cell height tall.
Fixed elevated side / three-quarter strategy-game camera (about 20° above the horizon), the same in every cell.
Modern high-resolution pre-rendered fantasy strategy-game sprite style. Strong readable silhouette. Moderate detail appropriate for gameplay scale.
Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). No ground, no shadows, no environment, no text.
```

### C · Stormforged Cyclops — Greek, tier 7, upgraded form

| Field | Value |
|---|---|
| Sheet file | `sheet.creature.greek.tier7.upgraded.png` |
| Creature | `stormforged_cyclops` · Apex ranged giant · occupies 2 hexes · shoots (range 19) · Shooter (passive) · Wall Breaker (active) · No Melee Penalty (passive) |
| Rows | 1. idle (6)<br>2. move (6)<br>3. attack (6)<br>4. defend (3) + hit (3)<br>5. death (6)<br>6. victory (6)<br>7. shoot (6)<br>8. ability (6) |
| Image | 1144 × 1376 px (about 1.6 MP) or larger with the same proportions — 6 columns × 8 rows, cells 191 × 172 px<br>or two parts for sharper frames: `sheet.creature.greek.tier7.upgraded.part1.png` rows 1–4, 1616 × 976 px; `sheet.creature.greek.tier7.upgraded.part2.png` rows 5–8, 1616 × 976 px |
| Scale | a cell is 3.20 hex widths wide and 2.90 tall; ground line at 90 % of the cell height; the creature stands about 76 % of the cell height |
| Attach | `sheet.creature.greek.tier7.base.png` (the base form's sheet — same layout and poses); `assets-source/creatures/reference/creature.greek.tier7.upgraded.ref.threequarter.png` (canonical master); `assets-source/icons/final/creature.greek.tier7.upgraded.portrait.png`; `support images/ChatGPT Image Sep 29, 2026, 03_35_30 PM-1.png` |
| Cuts into | 9 strips: `sprite.creature.greek.tier7.upgraded.idle.png`, `sprite.creature.greek.tier7.upgraded.move.png`, `sprite.creature.greek.tier7.upgraded.attack.png`, `sprite.creature.greek.tier7.upgraded.defend.png`, `sprite.creature.greek.tier7.upgraded.hit.png`, `sprite.creature.greek.tier7.upgraded.death.png`, `sprite.creature.greek.tier7.upgraded.victory.png`, `sprite.creature.greek.tier7.upgraded.shoot.png`, `sprite.creature.greek.tier7.upgraded.ability.png` |
| Status | idle placeholder, move missing, attack missing, defend missing, hit missing, death missing, victory missing, shoot missing, ability missing |

```text
Using the attached animation sheet of Cyclops and the canonical reference of Stormforged Cyclops, create the same animation sheet for Stormforged Cyclops, its upgraded form, for Pantheon Realms.
Keep the attached sheet's layout, every frame's pose, timing, camera, scale and place in its cell; change only the creature design to the upgraded form.
The creature: Stormforged Cyclops — A cyclops with forged bronze bracers, engraved seams and a faintly luminous boulder.
Image 1144 × 1376 px (or larger, same proportions): an invisible grid of 6 columns × 8 rows of equal cells, each cell 3.20 hex widths wide. No grid lines, no borders, no labels, no numbers, no text. Every item stays inside its own cell with clear empty space around it; nothing touches or crosses a cell edge.
Each row is one animation; its frames run left to right:
Row 1 — idle (6 frames, loops): 1) neutral stance · 2) breathing in, chest rising · 3) breath held, weight shifts slightly forward · 4) small head turn · 5) breathing out, chest sinking · 6) settling back to neutral (loops into frame 1)
Row 2 — move (6 frames, loops): 1) right foot forward, heel down · 2) weight on the right foot · 3) left leg passing · 4) left foot forward, heel down · 5) weight on the left foot · 6) right leg passing (loops)
Row 3 — attack (6 frames): 1) ready stance · 2) anticipation: draws back, coiled · 3) strike: smashes down with its weapon or fists · 4) impact pose, fully extended · 5) follow-through · 6) recovering to the ready stance
Row 4 — defend (cells 1–3): 1) ready stance · 2) lowers its head and braces · 3) braced (held) | hit (cells 4–6): 1) struck: jolts back · 2) recoils, flinching · 3) steadies
Row 5 — death (6 frames, last frame held): 1) struck a final time · 2) staggers back · 3) legs buckle · 4) falls · 5) hits the ground · 6) lying still on the ground (held: the body stays on the battlefield)
Row 6 — victory (6 frames, loops): 1) begins a triumphant gesture · 2) raises weapon, head or wings high · 3) peak of the gesture · 4) holds · 5) lowers slightly · 6) raises again (loops into frame 2)
Row 7 — shoot (6 frames): 1) ready stance · 2) draws or winds up, aiming · 3) release: hurls a boulder overhand · 4) follow-through (the missile has left; the game draws it in flight) · 5) recoil · 6) recovering to the ready stance
Row 8 — ability (6 frames): 1) ready stance · 2) begins to use Wall Breaker (Can target fortifications in a siege) · 3) builds up · 4) the ability takes effect (a short glow around the creature; no text) · 5) glow fading · 6) recovering to the ready stance
In every frame: the exact same Stormforged Cyclops, same size, same anatomy, armour, equipment, materials and lighting; it faces right; its feet stand on the cell's ground line at 90% of the cell height, centred in the cell; it stands about 76% of the cell height tall.
Fixed elevated side / three-quarter strategy-game camera (about 20° above the horizon), the same in every cell.
Modern high-resolution pre-rendered fantasy strategy-game sprite style. Strong readable silhouette. Moderate detail appropriate for gameplay scale.
Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). No ground, no shadows, no environment, no text.
```

### C · Kitsune — Japanese, tier 1, base form

| Field | Value |
|---|---|
| Sheet file | `sheet.creature.japanese.tier1.base.png` |
| Creature | `japanese_kitsune` · Fox skirmisher · occupies 1 hex |
| Rows | 1. idle (6)<br>2. move (6)<br>3. attack (6)<br>4. defend (3) + hit (3)<br>5. death (6)<br>6. victory (6) |
| Image | 1256 × 1256 px (about 1.6 MP) or larger with the same proportions — 6 columns × 6 rows, cells 209 × 209 px |
| Scale | a cell is 2.13 hex widths wide and 2.13 tall; ground line at 90 % of the cell height; the creature stands about 42 % of the cell height |
| Attach | `assets-source/creatures/reference/creature.japanese.tier1.base.ref.threequarter.png` (canonical master); `assets-source/icons/final/creature.japanese.tier1.base.portrait.png`; `support images/ChatGPT Image Sep 29, 2026, 03_35_37 PM-4.png` |
| Cuts into | 7 strips: `sprite.creature.japanese.tier1.base.idle.png`, `sprite.creature.japanese.tier1.base.move.png`, `sprite.creature.japanese.tier1.base.attack.png`, `sprite.creature.japanese.tier1.base.defend.png`, `sprite.creature.japanese.tier1.base.hit.png`, `sprite.creature.japanese.tier1.base.death.png`, `sprite.creature.japanese.tier1.base.victory.png` |
| Status | idle placeholder, move missing, attack missing, defend missing, hit missing, death missing, victory missing |

```text
Using the attached canonical reference of Kitsune, create one animation sheet for Pantheon Realms.
The creature: Kitsune — A russet fox with two tails and a faint blue flame floating beside it.
Image 1256 × 1256 px (or larger, same proportions): an invisible grid of 6 columns × 6 rows of equal cells, each cell 2.13 hex widths wide. No grid lines, no borders, no labels, no numbers, no text. Every item stays inside its own cell with clear empty space around it; nothing touches or crosses a cell edge.
Each row is one animation; its frames run left to right:
Row 1 — idle (6 frames, loops): 1) neutral stance · 2) breathing in, chest rising · 3) breath held, weight shifts slightly forward · 4) small head turn · 5) breathing out, chest sinking · 6) settling back to neutral (loops into frame 1)
Row 2 — move (6 frames, loops): 1) front left foot down · 2) pushing off · 3) legs gathered · 4) front right foot down · 5) pushing off · 6) legs stretched (loops)
Row 3 — attack (6 frames): 1) ready stance · 2) anticipation: draws back, coiled · 3) strike: lunges forward and bites, claws raking · 4) impact pose, fully extended · 5) follow-through · 6) recovering to the ready stance
Row 4 — defend (cells 1–3): 1) ready stance · 2) lowers its head and braces · 3) braced (held) | hit (cells 4–6): 1) struck: jolts back · 2) recoils, flinching · 3) steadies
Row 5 — death (6 frames, last frame held): 1) struck a final time · 2) staggers back · 3) legs buckle · 4) falls · 5) hits the ground · 6) lying still on the ground (held: the body stays on the battlefield)
Row 6 — victory (6 frames, loops): 1) begins a triumphant gesture · 2) raises weapon, head or wings high · 3) peak of the gesture · 4) holds · 5) lowers slightly · 6) raises again (loops into frame 2)
In every frame: the exact same Kitsune, same size, same anatomy, armour, equipment, materials and lighting; it faces right; its feet stand on the cell's ground line at 90% of the cell height, centred in the cell; it stands about 42% of the cell height tall.
Fixed elevated side / three-quarter strategy-game camera (about 20° above the horizon), the same in every cell.
Modern high-resolution pre-rendered fantasy strategy-game sprite style. Strong readable silhouette. Moderate detail appropriate for gameplay scale.
Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). No ground, no shadows, no environment, no text.
```

### C · Nine-Tailed Kitsune — Japanese, tier 1, upgraded form

| Field | Value |
|---|---|
| Sheet file | `sheet.creature.japanese.tier1.upgraded.png` |
| Creature | `japanese_nine_tailed_kitsune` · Fox skirmisher · occupies 1 hex · Ward (active) |
| Rows | 1. idle (6)<br>2. move (6)<br>3. attack (6)<br>4. defend (3) + hit (3)<br>5. death (6)<br>6. victory (6)<br>7. ability (6) |
| Image | 1160 × 1352 px (about 1.6 MP) or larger with the same proportions — 6 columns × 7 rows, cells 193 × 193 px<br>or two parts for sharper frames: `sheet.creature.japanese.tier1.upgraded.part1.png` rows 1–4, 1536 × 1024 px; `sheet.creature.japanese.tier1.upgraded.part2.png` rows 5–7, 1776 × 888 px |
| Scale | a cell is 2.13 hex widths wide and 2.13 tall; ground line at 90 % of the cell height; the creature stands about 44 % of the cell height |
| Attach | `sheet.creature.japanese.tier1.base.png` (the base form's sheet — same layout and poses); `assets-source/creatures/reference/creature.japanese.tier1.upgraded.ref.threequarter.png` (canonical master — Group A first); `support images/ChatGPT Image Sep 29, 2026, 03_35_37 PM-4.png` |
| Cuts into | 8 strips: `sprite.creature.japanese.tier1.upgraded.idle.png`, `sprite.creature.japanese.tier1.upgraded.move.png`, `sprite.creature.japanese.tier1.upgraded.attack.png`, `sprite.creature.japanese.tier1.upgraded.defend.png`, `sprite.creature.japanese.tier1.upgraded.hit.png`, `sprite.creature.japanese.tier1.upgraded.death.png`, `sprite.creature.japanese.tier1.upgraded.victory.png`, `sprite.creature.japanese.tier1.upgraded.ability.png` |
| Status | idle placeholder, move placeholder, attack placeholder, defend placeholder, hit placeholder, death placeholder, victory placeholder, ability placeholder |

```text
Using the attached animation sheet of Kitsune and the canonical reference of Nine-Tailed Kitsune, create the same animation sheet for Nine-Tailed Kitsune, its upgraded form, for Pantheon Realms.
Keep the attached sheet's layout, every frame's pose, timing, camera, scale and place in its cell; change only the creature design to the upgraded form.
The creature: Nine-Tailed Kitsune — A white fox with nine fanned tails and a ring of pale fox-fire.
Image 1160 × 1352 px (or larger, same proportions): an invisible grid of 6 columns × 7 rows of equal cells, each cell 2.13 hex widths wide. No grid lines, no borders, no labels, no numbers, no text. Every item stays inside its own cell with clear empty space around it; nothing touches or crosses a cell edge.
Each row is one animation; its frames run left to right:
Row 1 — idle (6 frames, loops): 1) neutral stance · 2) breathing in, chest rising · 3) breath held, weight shifts slightly forward · 4) small head turn · 5) breathing out, chest sinking · 6) settling back to neutral (loops into frame 1)
Row 2 — move (6 frames, loops): 1) front left foot down · 2) pushing off · 3) legs gathered · 4) front right foot down · 5) pushing off · 6) legs stretched (loops)
Row 3 — attack (6 frames): 1) ready stance · 2) anticipation: draws back, coiled · 3) strike: lunges forward and bites, claws raking · 4) impact pose, fully extended · 5) follow-through · 6) recovering to the ready stance
Row 4 — defend (cells 1–3): 1) ready stance · 2) lowers its head and braces · 3) braced (held) | hit (cells 4–6): 1) struck: jolts back · 2) recoils, flinching · 3) steadies
Row 5 — death (6 frames, last frame held): 1) struck a final time · 2) staggers back · 3) legs buckle · 4) falls · 5) hits the ground · 6) lying still on the ground (held: the body stays on the battlefield)
Row 6 — victory (6 frames, loops): 1) begins a triumphant gesture · 2) raises weapon, head or wings high · 3) peak of the gesture · 4) holds · 5) lowers slightly · 6) raises again (loops into frame 2)
Row 7 — ability (6 frames): 1) ready stance · 2) begins to use Ward (Places a protective ward on a friendly stack) · 3) builds up · 4) the ability takes effect (a short glow around the creature; no text) · 5) glow fading · 6) recovering to the ready stance
In every frame: the exact same Nine-Tailed Kitsune, same size, same anatomy, armour, equipment, materials and lighting; it faces right; its feet stand on the cell's ground line at 90% of the cell height, centred in the cell; it stands about 44% of the cell height tall.
Fixed elevated side / three-quarter strategy-game camera (about 20° above the horizon), the same in every cell.
Modern high-resolution pre-rendered fantasy strategy-game sprite style. Strong readable silhouette. Moderate detail appropriate for gameplay scale.
Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). No ground, no shadows, no environment, no text.
```

### C · Kappa — Japanese, tier 2, base form

| Field | Value |
|---|---|
| Sheet file | `sheet.creature.japanese.tier2.base.png` |
| Creature | `japanese_kappa` · River guard · occupies 1 hex · Charge Guard (passive) |
| Rows | 1. idle (6)<br>2. move (6)<br>3. attack (6)<br>4. defend (3) + hit (3)<br>5. death (6)<br>6. victory (6) |
| Image | 1256 × 1256 px (about 1.6 MP) or larger with the same proportions — 6 columns × 6 rows, cells 209 × 209 px |
| Scale | a cell is 2.13 hex widths wide and 2.13 tall; ground line at 90 % of the cell height; the creature stands about 44 % of the cell height |
| Attach | `assets-source/creatures/reference/creature.japanese.tier2.base.ref.threequarter.png` (canonical master — Group A first); `support images/ChatGPT Image Sep 29, 2026, 03_35_37 PM-4.png` |
| Cuts into | 7 strips: `sprite.creature.japanese.tier2.base.idle.png`, `sprite.creature.japanese.tier2.base.move.png`, `sprite.creature.japanese.tier2.base.attack.png`, `sprite.creature.japanese.tier2.base.defend.png`, `sprite.creature.japanese.tier2.base.hit.png`, `sprite.creature.japanese.tier2.base.death.png`, `sprite.creature.japanese.tier2.base.victory.png` |
| Status | idle placeholder, move placeholder, attack placeholder, defend placeholder, hit placeholder, death placeholder, victory placeholder |

```text
Using the attached canonical reference of Kappa, create one animation sheet for Pantheon Realms.
The creature: Kappa — A green turtle-shelled creature with a water-filled dish on its head and webbed hands.
Image 1256 × 1256 px (or larger, same proportions): an invisible grid of 6 columns × 6 rows of equal cells, each cell 2.13 hex widths wide. No grid lines, no borders, no labels, no numbers, no text. Every item stays inside its own cell with clear empty space around it; nothing touches or crosses a cell edge.
Each row is one animation; its frames run left to right:
Row 1 — idle (6 frames, loops): 1) neutral stance · 2) breathing in, chest rising · 3) breath held, weight shifts slightly forward · 4) small head turn · 5) breathing out, chest sinking · 6) settling back to neutral (loops into frame 1)
Row 2 — move (6 frames, loops): 1) front left foot down · 2) pushing off · 3) legs gathered · 4) front right foot down · 5) pushing off · 6) legs stretched (loops)
Row 3 — attack (6 frames): 1) ready stance · 2) anticipation: draws back, coiled · 3) strike: lunges forward and bites, claws raking · 4) impact pose, fully extended · 5) follow-through · 6) recovering to the ready stance
Row 4 — defend (cells 1–3): 1) ready stance · 2) lowers its head and braces · 3) braced (held) | hit (cells 4–6): 1) struck: jolts back · 2) recoils, flinching · 3) steadies
Row 5 — death (6 frames, last frame held): 1) struck a final time · 2) staggers back · 3) legs buckle · 4) falls · 5) hits the ground · 6) lying still on the ground (held: the body stays on the battlefield)
Row 6 — victory (6 frames, loops): 1) begins a triumphant gesture · 2) raises weapon, head or wings high · 3) peak of the gesture · 4) holds · 5) lowers slightly · 6) raises again (loops into frame 2)
In every frame: the exact same Kappa, same size, same anatomy, armour, equipment, materials and lighting; it faces right; its feet stand on the cell's ground line at 90% of the cell height, centred in the cell; it stands about 44% of the cell height tall.
Fixed elevated side / three-quarter strategy-game camera (about 20° above the horizon), the same in every cell.
Modern high-resolution pre-rendered fantasy strategy-game sprite style. Strong readable silhouette. Moderate detail appropriate for gameplay scale.
Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). No ground, no shadows, no environment, no text.
```

### C · River Elder Kappa — Japanese, tier 2, upgraded form

| Field | Value |
|---|---|
| Sheet file | `sheet.creature.japanese.tier2.upgraded.png` |
| Creature | `japanese_river_elder_kappa` · River guard · occupies 1 hex · Charge Guard (passive) · Double Retaliation (passive) |
| Rows | 1. idle (6)<br>2. move (6)<br>3. attack (6)<br>4. defend (3) + hit (3)<br>5. death (6)<br>6. victory (6) |
| Image | 1256 × 1256 px (about 1.6 MP) or larger with the same proportions — 6 columns × 6 rows, cells 209 × 209 px |
| Scale | a cell is 2.13 hex widths wide and 2.13 tall; ground line at 90 % of the cell height; the creature stands about 46 % of the cell height |
| Attach | `sheet.creature.japanese.tier2.base.png` (the base form's sheet — same layout and poses); `assets-source/creatures/reference/creature.japanese.tier2.upgraded.ref.threequarter.png` (canonical master — Group A first); `support images/ChatGPT Image Sep 29, 2026, 03_35_37 PM-4.png` |
| Cuts into | 7 strips: `sprite.creature.japanese.tier2.upgraded.idle.png`, `sprite.creature.japanese.tier2.upgraded.move.png`, `sprite.creature.japanese.tier2.upgraded.attack.png`, `sprite.creature.japanese.tier2.upgraded.defend.png`, `sprite.creature.japanese.tier2.upgraded.hit.png`, `sprite.creature.japanese.tier2.upgraded.death.png`, `sprite.creature.japanese.tier2.upgraded.victory.png` |
| Status | idle placeholder, move placeholder, attack placeholder, defend placeholder, hit placeholder, death placeholder, victory placeholder |

```text
Using the attached animation sheet of Kappa and the canonical reference of River Elder Kappa, create the same animation sheet for River Elder Kappa, its upgraded form, for Pantheon Realms.
Keep the attached sheet's layout, every frame's pose, timing, camera, scale and place in its cell; change only the creature design to the upgraded form.
The creature: River Elder Kappa — A large mossy-shelled kappa with a white beard and a bamboo staff.
Image 1256 × 1256 px (or larger, same proportions): an invisible grid of 6 columns × 6 rows of equal cells, each cell 2.13 hex widths wide. No grid lines, no borders, no labels, no numbers, no text. Every item stays inside its own cell with clear empty space around it; nothing touches or crosses a cell edge.
Each row is one animation; its frames run left to right:
Row 1 — idle (6 frames, loops): 1) neutral stance · 2) breathing in, chest rising · 3) breath held, weight shifts slightly forward · 4) small head turn · 5) breathing out, chest sinking · 6) settling back to neutral (loops into frame 1)
Row 2 — move (6 frames, loops): 1) front left foot down · 2) pushing off · 3) legs gathered · 4) front right foot down · 5) pushing off · 6) legs stretched (loops)
Row 3 — attack (6 frames): 1) ready stance · 2) anticipation: draws back, coiled · 3) strike: lunges forward and bites, claws raking · 4) impact pose, fully extended · 5) follow-through · 6) recovering to the ready stance
Row 4 — defend (cells 1–3): 1) ready stance · 2) lowers its head and braces · 3) braced (held) | hit (cells 4–6): 1) struck: jolts back · 2) recoils, flinching · 3) steadies
Row 5 — death (6 frames, last frame held): 1) struck a final time · 2) staggers back · 3) legs buckle · 4) falls · 5) hits the ground · 6) lying still on the ground (held: the body stays on the battlefield)
Row 6 — victory (6 frames, loops): 1) begins a triumphant gesture · 2) raises weapon, head or wings high · 3) peak of the gesture · 4) holds · 5) lowers slightly · 6) raises again (loops into frame 2)
In every frame: the exact same River Elder Kappa, same size, same anatomy, armour, equipment, materials and lighting; it faces right; its feet stand on the cell's ground line at 90% of the cell height, centred in the cell; it stands about 46% of the cell height tall.
Fixed elevated side / three-quarter strategy-game camera (about 20° above the horizon), the same in every cell.
Modern high-resolution pre-rendered fantasy strategy-game sprite style. Strong readable silhouette. Moderate detail appropriate for gameplay scale.
Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). No ground, no shadows, no environment, no text.
```

### C · Tengu — Japanese, tier 3, base form

| Field | Value |
|---|---|
| Sheet file | `sheet.creature.japanese.tier3.base.png` |
| Creature | `japanese_tengu` · Mountain flyer · occupies 1 hex · Flight (passive) |
| Rows | 1. idle (6)<br>2. move (6)<br>3. attack (6)<br>4. defend (3) + hit (3)<br>5. death (6)<br>6. victory (6)<br>7. takeoff (3) + landing (3)<br>8. fly (6) |
| Image | 1072 × 1472 px (about 1.6 MP) or larger with the same proportions — 6 columns × 8 rows, cells 179 × 184 px<br>or two parts for sharper frames: `sheet.creature.japanese.tier3.base.part1.png` rows 1–4, 1512 × 1040 px; `sheet.creature.japanese.tier3.base.part2.png` rows 5–8, 1512 × 1040 px |
| Scale | a cell is 2.13 hex widths wide and 2.20 tall; ground line at 90 % of the cell height; the creature stands about 62 % of the cell height |
| Attach | `assets-source/creatures/reference/creature.japanese.tier3.base.ref.threequarter.png` (canonical master — Group A first); `support images/ChatGPT Image Sep 29, 2026, 03_35_37 PM-4.png` |
| Cuts into | 10 strips: `sprite.creature.japanese.tier3.base.idle.png`, `sprite.creature.japanese.tier3.base.move.png`, `sprite.creature.japanese.tier3.base.attack.png`, `sprite.creature.japanese.tier3.base.defend.png`, `sprite.creature.japanese.tier3.base.hit.png`, `sprite.creature.japanese.tier3.base.death.png`, `sprite.creature.japanese.tier3.base.victory.png`, `sprite.creature.japanese.tier3.base.takeoff.png`, `sprite.creature.japanese.tier3.base.landing.png`, `sprite.creature.japanese.tier3.base.fly.png` |
| Status | idle placeholder, move placeholder, attack placeholder, defend placeholder, hit placeholder, death placeholder, victory placeholder, takeoff placeholder, landing placeholder, fly placeholder |

```text
Using the attached canonical reference of Tengu, create one animation sheet for Pantheon Realms.
The creature: Tengu — A crow-winged warrior with a red long-nosed mask and a short sword.
Image 1072 × 1472 px (or larger, same proportions): an invisible grid of 6 columns × 8 rows of equal cells, each cell 2.13 hex widths wide. No grid lines, no borders, no labels, no numbers, no text. Every item stays inside its own cell with clear empty space around it; nothing touches or crosses a cell edge.
Each row is one animation; its frames run left to right:
Row 1 — idle (6 frames, loops): 1) neutral stance · 2) breathing in, chest rising · 3) breath held, weight shifts slightly forward · 4) small head turn · 5) breathing out, chest sinking · 6) settling back to neutral (loops into frame 1)
Row 2 — move (6 frames, loops): 1) right foot forward, heel down · 2) weight on the right foot · 3) left leg passing · 4) left foot forward, heel down · 5) weight on the left foot · 6) right leg passing (loops)
Row 3 — attack (6 frames): 1) ready stance · 2) anticipation: draws back, coiled · 3) strike: beats its wings once and strikes forward with its weapon · 4) impact pose, fully extended · 5) follow-through · 6) recovering to the ready stance
Row 4 — defend (cells 1–3): 1) ready stance · 2) folds its wings forward like a shield · 3) braced (held) | hit (cells 4–6): 1) struck: jolts back · 2) recoils, flinching · 3) steadies
Row 5 — death (6 frames, last frame held): 1) struck a final time · 2) staggers back · 3) legs buckle · 4) falls · 5) hits the ground · 6) lying still on the ground (held: the body stays on the battlefield)
Row 6 — victory (6 frames, loops): 1) begins a triumphant gesture · 2) raises weapon, head or wings high · 3) peak of the gesture · 4) holds · 5) lowers slightly · 6) raises again (loops into frame 2)
Row 7 — takeoff (cells 1–3): 1) crouches, wings rising · 2) first downbeat, feet leave the ground · 3) hovering at flight height | landing (cells 4–6): 1) hovering, wings spread to brake · 2) touchdown, legs absorbing the landing · 3) standing, wings folding
Row 8 — fly (6 frames, loops): 1) wings up · 2) downbeat · 3) wings down · 4) upstroke · 5) wings level · 6) wings rising (loops)
In every frame: the exact same Tengu, same size, same anatomy, armour, equipment, materials and lighting; it faces right; its feet stand on the cell's ground line at 90% of the cell height, centred in the cell (airborne frames hover about 15% of the cell height above that line); it stands about 62% of the cell height tall.
Fixed elevated side / three-quarter strategy-game camera (about 20° above the horizon), the same in every cell.
Modern high-resolution pre-rendered fantasy strategy-game sprite style. Strong readable silhouette. Moderate detail appropriate for gameplay scale.
Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). No ground, no shadows, no environment, no text.
```

### C · Great Tengu — Japanese, tier 3, upgraded form

| Field | Value |
|---|---|
| Sheet file | `sheet.creature.japanese.tier3.upgraded.png` |
| Creature | `japanese_great_tengu` · Mountain flyer · occupies 1 hex · Flight (passive) · Double Retaliation (passive) |
| Rows | 1. idle (6)<br>2. move (6)<br>3. attack (6)<br>4. defend (3) + hit (3)<br>5. death (6)<br>6. victory (6)<br>7. takeoff (3) + landing (3)<br>8. fly (6) |
| Image | 1048 × 1504 px (about 1.6 MP) or larger with the same proportions — 6 columns × 8 rows, cells 175 × 188 px<br>or two parts for sharper frames: `sheet.creature.japanese.tier3.upgraded.part1.png` rows 1–4, 1480 × 1064 px; `sheet.creature.japanese.tier3.upgraded.part2.png` rows 5–8, 1480 × 1064 px |
| Scale | a cell is 2.13 hex widths wide and 2.30 tall; ground line at 90 % of the cell height; the creature stands about 62 % of the cell height |
| Attach | `sheet.creature.japanese.tier3.base.png` (the base form's sheet — same layout and poses); `assets-source/creatures/reference/creature.japanese.tier3.upgraded.ref.threequarter.png` (canonical master — Group A first); `support images/ChatGPT Image Sep 29, 2026, 03_35_37 PM-4.png` |
| Cuts into | 10 strips: `sprite.creature.japanese.tier3.upgraded.idle.png`, `sprite.creature.japanese.tier3.upgraded.move.png`, `sprite.creature.japanese.tier3.upgraded.attack.png`, `sprite.creature.japanese.tier3.upgraded.defend.png`, `sprite.creature.japanese.tier3.upgraded.hit.png`, `sprite.creature.japanese.tier3.upgraded.death.png`, `sprite.creature.japanese.tier3.upgraded.victory.png`, `sprite.creature.japanese.tier3.upgraded.takeoff.png`, `sprite.creature.japanese.tier3.upgraded.landing.png`, `sprite.creature.japanese.tier3.upgraded.fly.png` |
| Status | idle placeholder, move placeholder, attack placeholder, defend placeholder, hit placeholder, death placeholder, victory placeholder, takeoff placeholder, landing placeholder, fly placeholder |

```text
Using the attached animation sheet of Tengu and the canonical reference of Great Tengu, create the same animation sheet for Great Tengu, its upgraded form, for Pantheon Realms.
Keep the attached sheet's layout, every frame's pose, timing, camera, scale and place in its cell; change only the creature design to the upgraded form.
The creature: Great Tengu — A tengu in monk’s robes with great black wings and a feather fan.
Image 1048 × 1504 px (or larger, same proportions): an invisible grid of 6 columns × 8 rows of equal cells, each cell 2.13 hex widths wide. No grid lines, no borders, no labels, no numbers, no text. Every item stays inside its own cell with clear empty space around it; nothing touches or crosses a cell edge.
Each row is one animation; its frames run left to right:
Row 1 — idle (6 frames, loops): 1) neutral stance · 2) breathing in, chest rising · 3) breath held, weight shifts slightly forward · 4) small head turn · 5) breathing out, chest sinking · 6) settling back to neutral (loops into frame 1)
Row 2 — move (6 frames, loops): 1) right foot forward, heel down · 2) weight on the right foot · 3) left leg passing · 4) left foot forward, heel down · 5) weight on the left foot · 6) right leg passing (loops)
Row 3 — attack (6 frames): 1) ready stance · 2) anticipation: draws back, coiled · 3) strike: beats its wings once and strikes forward with its weapon · 4) impact pose, fully extended · 5) follow-through · 6) recovering to the ready stance
Row 4 — defend (cells 1–3): 1) ready stance · 2) folds its wings forward like a shield · 3) braced (held) | hit (cells 4–6): 1) struck: jolts back · 2) recoils, flinching · 3) steadies
Row 5 — death (6 frames, last frame held): 1) struck a final time · 2) staggers back · 3) legs buckle · 4) falls · 5) hits the ground · 6) lying still on the ground (held: the body stays on the battlefield)
Row 6 — victory (6 frames, loops): 1) begins a triumphant gesture · 2) raises weapon, head or wings high · 3) peak of the gesture · 4) holds · 5) lowers slightly · 6) raises again (loops into frame 2)
Row 7 — takeoff (cells 1–3): 1) crouches, wings rising · 2) first downbeat, feet leave the ground · 3) hovering at flight height | landing (cells 4–6): 1) hovering, wings spread to brake · 2) touchdown, legs absorbing the landing · 3) standing, wings folding
Row 8 — fly (6 frames, loops): 1) wings up · 2) downbeat · 3) wings down · 4) upstroke · 5) wings level · 6) wings rising (loops)
In every frame: the exact same Great Tengu, same size, same anatomy, armour, equipment, materials and lighting; it faces right; its feet stand on the cell's ground line at 90% of the cell height, centred in the cell (airborne frames hover about 15% of the cell height above that line); it stands about 62% of the cell height tall.
Fixed elevated side / three-quarter strategy-game camera (about 20° above the horizon), the same in every cell.
Modern high-resolution pre-rendered fantasy strategy-game sprite style. Strong readable silhouette. Moderate detail appropriate for gameplay scale.
Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). No ground, no shadows, no environment, no text.
```

### C · Oni — Japanese, tier 4, base form

| Field | Value |
|---|---|
| Sheet file | `sheet.creature.japanese.tier4.base.png` |
| Creature | `japanese_oni` · Brute · occupies 2 hexes · Unyielding (passive) |
| Rows | 1. idle (6)<br>2. move (6)<br>3. attack (6)<br>4. defend (3) + hit (3)<br>5. death (6)<br>6. victory (6) |
| Image | 1392 × 1128 px (about 1.6 MP) or larger with the same proportions — 6 columns × 6 rows, cells 232 × 188 px |
| Scale | a cell is 3.20 hex widths wide and 2.60 tall; ground line at 90 % of the cell height; the creature stands about 74 % of the cell height |
| Attach | `assets-source/creatures/reference/creature.japanese.tier4.base.ref.threequarter.png` (canonical master — Group A first); `support images/ChatGPT Image Sep 29, 2026, 03_35_37 PM-4.png` |
| Cuts into | 7 strips: `sprite.creature.japanese.tier4.base.idle.png`, `sprite.creature.japanese.tier4.base.move.png`, `sprite.creature.japanese.tier4.base.attack.png`, `sprite.creature.japanese.tier4.base.defend.png`, `sprite.creature.japanese.tier4.base.hit.png`, `sprite.creature.japanese.tier4.base.death.png`, `sprite.creature.japanese.tier4.base.victory.png` |
| Status | idle placeholder, move placeholder, attack placeholder, defend placeholder, hit placeholder, death placeholder, victory placeholder |

```text
Using the attached canonical reference of Oni, create one animation sheet for Pantheon Realms.
The creature: Oni — A red-skinned horned ogre in a tiger-skin wrap carrying a studded iron club.
Image 1392 × 1128 px (or larger, same proportions): an invisible grid of 6 columns × 6 rows of equal cells, each cell 3.20 hex widths wide. No grid lines, no borders, no labels, no numbers, no text. Every item stays inside its own cell with clear empty space around it; nothing touches or crosses a cell edge.
Each row is one animation; its frames run left to right:
Row 1 — idle (6 frames, loops): 1) neutral stance · 2) breathing in, chest rising · 3) breath held, weight shifts slightly forward · 4) small head turn · 5) breathing out, chest sinking · 6) settling back to neutral (loops into frame 1)
Row 2 — move (6 frames, loops): 1) right foot forward, heel down · 2) weight on the right foot · 3) left leg passing · 4) left foot forward, heel down · 5) weight on the left foot · 6) right leg passing (loops)
Row 3 — attack (6 frames): 1) ready stance · 2) anticipation: draws back, coiled · 3) strike: smashes down with its weapon or fists · 4) impact pose, fully extended · 5) follow-through · 6) recovering to the ready stance
Row 4 — defend (cells 1–3): 1) ready stance · 2) lowers its head and braces · 3) braced (held) | hit (cells 4–6): 1) struck: jolts back · 2) recoils, flinching · 3) steadies
Row 5 — death (6 frames, last frame held): 1) struck a final time · 2) staggers back · 3) legs buckle · 4) falls · 5) hits the ground · 6) lying still on the ground (held: the body stays on the battlefield)
Row 6 — victory (6 frames, loops): 1) begins a triumphant gesture · 2) raises weapon, head or wings high · 3) peak of the gesture · 4) holds · 5) lowers slightly · 6) raises again (loops into frame 2)
In every frame: the exact same Oni, same size, same anatomy, armour, equipment, materials and lighting; it faces right; its feet stand on the cell's ground line at 90% of the cell height, centred in the cell; it stands about 74% of the cell height tall.
Fixed elevated side / three-quarter strategy-game camera (about 20° above the horizon), the same in every cell.
Modern high-resolution pre-rendered fantasy strategy-game sprite style. Strong readable silhouette. Moderate detail appropriate for gameplay scale.
Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). No ground, no shadows, no environment, no text.
```

### C · Oni Warlord — Japanese, tier 4, upgraded form

| Field | Value |
|---|---|
| Sheet file | `sheet.creature.japanese.tier4.upgraded.png` |
| Creature | `japanese_oni_warlord` · Brute · occupies 2 hexes · Unyielding (passive) · Charge Guard (passive) |
| Rows | 1. idle (6)<br>2. move (6)<br>3. attack (6)<br>4. defend (3) + hit (3)<br>5. death (6)<br>6. victory (6) |
| Image | 1368 × 1152 px (about 1.6 MP) or larger with the same proportions — 6 columns × 6 rows, cells 228 × 192 px |
| Scale | a cell is 3.20 hex widths wide and 2.70 tall; ground line at 90 % of the cell height; the creature stands about 75 % of the cell height |
| Attach | `sheet.creature.japanese.tier4.base.png` (the base form's sheet — same layout and poses); `assets-source/creatures/reference/creature.japanese.tier4.upgraded.ref.threequarter.png` (canonical master — Group A first); `support images/ChatGPT Image Sep 29, 2026, 03_35_37 PM-4.png` |
| Cuts into | 7 strips: `sprite.creature.japanese.tier4.upgraded.idle.png`, `sprite.creature.japanese.tier4.upgraded.move.png`, `sprite.creature.japanese.tier4.upgraded.attack.png`, `sprite.creature.japanese.tier4.upgraded.defend.png`, `sprite.creature.japanese.tier4.upgraded.hit.png`, `sprite.creature.japanese.tier4.upgraded.death.png`, `sprite.creature.japanese.tier4.upgraded.victory.png` |
| Status | idle placeholder, move placeholder, attack placeholder, defend placeholder, hit placeholder, death placeholder, victory placeholder |

```text
Using the attached animation sheet of Oni and the canonical reference of Oni Warlord, create the same animation sheet for Oni Warlord, its upgraded form, for Pantheon Realms.
Keep the attached sheet's layout, every frame's pose, timing, camera, scale and place in its cell; change only the creature design to the upgraded form.
The creature: Oni Warlord — A blue-skinned oni in lacquered samurai armor with a huge kanabō.
Image 1368 × 1152 px (or larger, same proportions): an invisible grid of 6 columns × 6 rows of equal cells, each cell 3.20 hex widths wide. No grid lines, no borders, no labels, no numbers, no text. Every item stays inside its own cell with clear empty space around it; nothing touches or crosses a cell edge.
Each row is one animation; its frames run left to right:
Row 1 — idle (6 frames, loops): 1) neutral stance · 2) breathing in, chest rising · 3) breath held, weight shifts slightly forward · 4) small head turn · 5) breathing out, chest sinking · 6) settling back to neutral (loops into frame 1)
Row 2 — move (6 frames, loops): 1) right foot forward, heel down · 2) weight on the right foot · 3) left leg passing · 4) left foot forward, heel down · 5) weight on the left foot · 6) right leg passing (loops)
Row 3 — attack (6 frames): 1) ready stance · 2) anticipation: draws back, coiled · 3) strike: smashes down with its weapon or fists · 4) impact pose, fully extended · 5) follow-through · 6) recovering to the ready stance
Row 4 — defend (cells 1–3): 1) ready stance · 2) lowers its head and braces · 3) braced (held) | hit (cells 4–6): 1) struck: jolts back · 2) recoils, flinching · 3) steadies
Row 5 — death (6 frames, last frame held): 1) struck a final time · 2) staggers back · 3) legs buckle · 4) falls · 5) hits the ground · 6) lying still on the ground (held: the body stays on the battlefield)
Row 6 — victory (6 frames, loops): 1) begins a triumphant gesture · 2) raises weapon, head or wings high · 3) peak of the gesture · 4) holds · 5) lowers slightly · 6) raises again (loops into frame 2)
In every frame: the exact same Oni Warlord, same size, same anatomy, armour, equipment, materials and lighting; it faces right; its feet stand on the cell's ground line at 90% of the cell height, centred in the cell; it stands about 75% of the cell height tall.
Fixed elevated side / three-quarter strategy-game camera (about 20° above the horizon), the same in every cell.
Modern high-resolution pre-rendered fantasy strategy-game sprite style. Strong readable silhouette. Moderate detail appropriate for gameplay scale.
Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). No ground, no shadows, no environment, no text.
```

### C · Jorogumo — Japanese, tier 5, base form

| Field | Value |
|---|---|
| Sheet file | `sheet.creature.japanese.tier5.base.png` |
| Creature | `japanese_jorogumo` · Spider spirit · occupies 1 hex · Double Retaliation (passive) |
| Rows | 1. idle (6)<br>2. move (6)<br>3. attack (6)<br>4. defend (3) + hit (3)<br>5. death (6)<br>6. victory (6) |
| Image | 1256 × 1256 px (about 1.6 MP) or larger with the same proportions — 6 columns × 6 rows, cells 209 × 209 px |
| Scale | a cell is 2.13 hex widths wide and 2.13 tall; ground line at 90 % of the cell height; the creature stands about 65 % of the cell height |
| Attach | `assets-source/creatures/reference/creature.japanese.tier5.base.ref.threequarter.png` (canonical master — Group A first); `support images/ChatGPT Image Sep 29, 2026, 03_35_37 PM-4.png` |
| Cuts into | 7 strips: `sprite.creature.japanese.tier5.base.idle.png`, `sprite.creature.japanese.tier5.base.move.png`, `sprite.creature.japanese.tier5.base.attack.png`, `sprite.creature.japanese.tier5.base.defend.png`, `sprite.creature.japanese.tier5.base.hit.png`, `sprite.creature.japanese.tier5.base.death.png`, `sprite.creature.japanese.tier5.base.victory.png` |
| Status | idle placeholder, move placeholder, attack placeholder, defend placeholder, hit placeholder, death placeholder, victory placeholder |

```text
Using the attached canonical reference of Jorogumo, create one animation sheet for Pantheon Realms.
The creature: Jorogumo — A pale woman in a web-patterned kimono whose shadow has eight spider legs.
Image 1256 × 1256 px (or larger, same proportions): an invisible grid of 6 columns × 6 rows of equal cells, each cell 2.13 hex widths wide. No grid lines, no borders, no labels, no numbers, no text. Every item stays inside its own cell with clear empty space around it; nothing touches or crosses a cell edge.
Each row is one animation; its frames run left to right:
Row 1 — idle (6 frames, loops): 1) neutral stance · 2) breathing in, chest rising · 3) breath held, weight shifts slightly forward · 4) small head turn · 5) breathing out, chest sinking · 6) settling back to neutral (loops into frame 1)
Row 2 — move (6 frames, loops): 1) drifting forward, robes trailing · 2) rising slightly · 3) gliding · 4) sinking slightly · 5) drifting forward · 6) gliding (loops)
Row 3 — attack (6 frames): 1) ready stance · 2) anticipation: draws back, coiled · 3) strike: surges forward and rakes with spectral hands or claws · 4) impact pose, fully extended · 5) follow-through · 6) recovering to the ready stance
Row 4 — defend (cells 1–3): 1) ready stance · 2) lowers its head and braces · 3) braced (held) | hit (cells 4–6): 1) struck: jolts back · 2) recoils, flinching · 3) steadies
Row 5 — death (6 frames, last frame held): 1) struck a final time · 2) staggers back · 3) legs buckle · 4) falls · 5) hits the ground · 6) lying still on the ground (held: the body stays on the battlefield)
Row 6 — victory (6 frames, loops): 1) begins a triumphant gesture · 2) raises weapon, head or wings high · 3) peak of the gesture · 4) holds · 5) lowers slightly · 6) raises again (loops into frame 2)
In every frame: the exact same Jorogumo, same size, same anatomy, armour, equipment, materials and lighting; it faces right; its feet stand on the cell's ground line at 90% of the cell height, centred in the cell; it stands about 65% of the cell height tall.
Fixed elevated side / three-quarter strategy-game camera (about 20° above the horizon), the same in every cell.
Modern high-resolution pre-rendered fantasy strategy-game sprite style. Strong readable silhouette. Moderate detail appropriate for gameplay scale.
Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). No ground, no shadows, no environment, no text.
```

### C · Queen Jorogumo — Japanese, tier 5, upgraded form

| Field | Value |
|---|---|
| Sheet file | `sheet.creature.japanese.tier5.upgraded.png` |
| Creature | `japanese_queen_jorogumo` · Spider spirit · occupies 1 hex · Double Retaliation (passive) · Ward (active) |
| Rows | 1. idle (6)<br>2. move (6)<br>3. attack (6)<br>4. defend (3) + hit (3)<br>5. death (6)<br>6. victory (6)<br>7. ability (6) |
| Image | 1160 × 1352 px (about 1.6 MP) or larger with the same proportions — 6 columns × 7 rows, cells 193 × 193 px<br>or two parts for sharper frames: `sheet.creature.japanese.tier5.upgraded.part1.png` rows 1–4, 1536 × 1024 px; `sheet.creature.japanese.tier5.upgraded.part2.png` rows 5–7, 1776 × 888 px |
| Scale | a cell is 2.13 hex widths wide and 2.13 tall; ground line at 90 % of the cell height; the creature stands about 68 % of the cell height |
| Attach | `sheet.creature.japanese.tier5.base.png` (the base form's sheet — same layout and poses); `assets-source/creatures/reference/creature.japanese.tier5.upgraded.ref.threequarter.png` (canonical master — Group A first); `support images/ChatGPT Image Sep 29, 2026, 03_35_37 PM-4.png` |
| Cuts into | 8 strips: `sprite.creature.japanese.tier5.upgraded.idle.png`, `sprite.creature.japanese.tier5.upgraded.move.png`, `sprite.creature.japanese.tier5.upgraded.attack.png`, `sprite.creature.japanese.tier5.upgraded.defend.png`, `sprite.creature.japanese.tier5.upgraded.hit.png`, `sprite.creature.japanese.tier5.upgraded.death.png`, `sprite.creature.japanese.tier5.upgraded.victory.png`, `sprite.creature.japanese.tier5.upgraded.ability.png` |
| Status | idle placeholder, move placeholder, attack placeholder, defend placeholder, hit placeholder, death placeholder, victory placeholder, ability placeholder |

```text
Using the attached animation sheet of Jorogumo and the canonical reference of Queen Jorogumo, create the same animation sheet for Queen Jorogumo, its upgraded form, for Pantheon Realms.
Keep the attached sheet's layout, every frame's pose, timing, camera, scale and place in its cell; change only the creature design to the upgraded form.
The creature: Queen Jorogumo — A spider-bodied woman in a gold-threaded kimono, webs glittering behind her.
Image 1160 × 1352 px (or larger, same proportions): an invisible grid of 6 columns × 7 rows of equal cells, each cell 2.13 hex widths wide. No grid lines, no borders, no labels, no numbers, no text. Every item stays inside its own cell with clear empty space around it; nothing touches or crosses a cell edge.
Each row is one animation; its frames run left to right:
Row 1 — idle (6 frames, loops): 1) neutral stance · 2) breathing in, chest rising · 3) breath held, weight shifts slightly forward · 4) small head turn · 5) breathing out, chest sinking · 6) settling back to neutral (loops into frame 1)
Row 2 — move (6 frames, loops): 1) drifting forward, robes trailing · 2) rising slightly · 3) gliding · 4) sinking slightly · 5) drifting forward · 6) gliding (loops)
Row 3 — attack (6 frames): 1) ready stance · 2) anticipation: draws back, coiled · 3) strike: surges forward and rakes with spectral hands or claws · 4) impact pose, fully extended · 5) follow-through · 6) recovering to the ready stance
Row 4 — defend (cells 1–3): 1) ready stance · 2) lowers its head and braces · 3) braced (held) | hit (cells 4–6): 1) struck: jolts back · 2) recoils, flinching · 3) steadies
Row 5 — death (6 frames, last frame held): 1) struck a final time · 2) staggers back · 3) legs buckle · 4) falls · 5) hits the ground · 6) lying still on the ground (held: the body stays on the battlefield)
Row 6 — victory (6 frames, loops): 1) begins a triumphant gesture · 2) raises weapon, head or wings high · 3) peak of the gesture · 4) holds · 5) lowers slightly · 6) raises again (loops into frame 2)
Row 7 — ability (6 frames): 1) ready stance · 2) begins to use Ward (Places a protective ward on a friendly stack) · 3) builds up · 4) the ability takes effect (a short glow around the creature; no text) · 5) glow fading · 6) recovering to the ready stance
In every frame: the exact same Queen Jorogumo, same size, same anatomy, armour, equipment, materials and lighting; it faces right; its feet stand on the cell's ground line at 90% of the cell height, centred in the cell; it stands about 68% of the cell height tall.
Fixed elevated side / three-quarter strategy-game camera (about 20° above the horizon), the same in every cell.
Modern high-resolution pre-rendered fantasy strategy-game sprite style. Strong readable silhouette. Moderate detail appropriate for gameplay scale.
Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). No ground, no shadows, no environment, no text.
```

### C · Kirin — Japanese, tier 6, base form

| Field | Value |
|---|---|
| Sheet file | `sheet.creature.japanese.tier6.base.png` |
| Creature | `japanese_kirin` · Holy beast (ranged) · occupies 2 hexes · shoots (range 16) · Shooter (passive) · No Melee Penalty (passive) |
| Rows | 1. idle (6)<br>2. move (6)<br>3. attack (6)<br>4. defend (3) + hit (3)<br>5. death (6)<br>6. victory (6)<br>7. shoot (6) |
| Image | 1424 × 1104 px (about 1.6 MP) or larger with the same proportions — 6 columns × 7 rows, cells 237 × 158 px<br>or two parts for sharper frames: `sheet.creature.japanese.tier6.base.part1.png` rows 1–4, 1880 × 840 px; `sheet.creature.japanese.tier6.base.part2.png` rows 5–7, 2176 × 728 px |
| Scale | a cell is 3.20 hex widths wide and 2.13 tall; ground line at 90 % of the cell height; the creature stands about 49 % of the cell height |
| Attach | `assets-source/creatures/reference/creature.japanese.tier6.base.ref.threequarter.png` (canonical master — Group A first); `support images/ChatGPT Image Sep 29, 2026, 03_35_37 PM-4.png` |
| Cuts into | 8 strips: `sprite.creature.japanese.tier6.base.idle.png`, `sprite.creature.japanese.tier6.base.move.png`, `sprite.creature.japanese.tier6.base.attack.png`, `sprite.creature.japanese.tier6.base.defend.png`, `sprite.creature.japanese.tier6.base.hit.png`, `sprite.creature.japanese.tier6.base.death.png`, `sprite.creature.japanese.tier6.base.victory.png`, `sprite.creature.japanese.tier6.base.shoot.png` |
| Status | idle placeholder, move placeholder, attack placeholder, defend placeholder, hit placeholder, death placeholder, victory placeholder, shoot placeholder |

```text
Using the attached canonical reference of Kirin, create one animation sheet for Pantheon Realms.
The creature: Kirin — A deer-like beast with dragon scales, a single antler and flames at its hooves.
Image 1424 × 1104 px (or larger, same proportions): an invisible grid of 6 columns × 7 rows of equal cells, each cell 3.20 hex widths wide. No grid lines, no borders, no labels, no numbers, no text. Every item stays inside its own cell with clear empty space around it; nothing touches or crosses a cell edge.
Each row is one animation; its frames run left to right:
Row 1 — idle (6 frames, loops): 1) neutral stance · 2) breathing in, chest rising · 3) breath held, weight shifts slightly forward · 4) small head turn · 5) breathing out, chest sinking · 6) settling back to neutral (loops into frame 1)
Row 2 — move (6 frames, loops): 1) front left foot down · 2) pushing off · 3) legs gathered · 4) front right foot down · 5) pushing off · 6) legs stretched (loops)
Row 3 — attack (6 frames): 1) ready stance · 2) anticipation: draws back, coiled · 3) strike: lunges forward and bites, claws raking · 4) impact pose, fully extended · 5) follow-through · 6) recovering to the ready stance
Row 4 — defend (cells 1–3): 1) ready stance · 2) lowers its head and braces · 3) braced (held) | hit (cells 4–6): 1) struck: jolts back · 2) recoils, flinching · 3) steadies
Row 5 — death (6 frames, last frame held): 1) struck a final time · 2) staggers back · 3) legs buckle · 4) falls · 5) hits the ground · 6) lying still on the ground (held: the body stays on the battlefield)
Row 6 — victory (6 frames, loops): 1) begins a triumphant gesture · 2) raises weapon, head or wings high · 3) peak of the gesture · 4) holds · 5) lowers slightly · 6) raises again (loops into frame 2)
Row 7 — shoot (6 frames): 1) ready stance · 2) draws or winds up, aiming · 3) release: makes its ranged attack with the weapon shown in the reference · 4) follow-through (the missile has left; the game draws it in flight) · 5) recoil · 6) recovering to the ready stance
In every frame: the exact same Kirin, same size, same anatomy, armour, equipment, materials and lighting; it faces right; its feet stand on the cell's ground line at 90% of the cell height, centred in the cell; it stands about 49% of the cell height tall.
Fixed elevated side / three-quarter strategy-game camera (about 20° above the horizon), the same in every cell.
Modern high-resolution pre-rendered fantasy strategy-game sprite style. Strong readable silhouette. Moderate detail appropriate for gameplay scale.
Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). No ground, no shadows, no environment, no text.
```

### C · Celestial Kirin — Japanese, tier 6, upgraded form

| Field | Value |
|---|---|
| Sheet file | `sheet.creature.japanese.tier6.upgraded.png` |
| Creature | `japanese_celestial_kirin` · Holy beast (ranged) · occupies 2 hexes · shoots (range 17) · Shooter (passive) · No Melee Penalty (passive) |
| Rows | 1. idle (6)<br>2. move (6)<br>3. attack (6)<br>4. defend (3) + hit (3)<br>5. death (6)<br>6. victory (6)<br>7. shoot (6) |
| Image | 1424 × 1104 px (about 1.6 MP) or larger with the same proportions — 6 columns × 7 rows, cells 237 × 158 px<br>or two parts for sharper frames: `sheet.creature.japanese.tier6.upgraded.part1.png` rows 1–4, 1880 × 840 px; `sheet.creature.japanese.tier6.upgraded.part2.png` rows 5–7, 2176 × 728 px |
| Scale | a cell is 3.20 hex widths wide and 2.13 tall; ground line at 90 % of the cell height; the creature stands about 51 % of the cell height |
| Attach | `sheet.creature.japanese.tier6.base.png` (the base form's sheet — same layout and poses); `assets-source/creatures/reference/creature.japanese.tier6.upgraded.ref.threequarter.png` (canonical master — Group A first); `support images/ChatGPT Image Sep 29, 2026, 03_35_37 PM-4.png` |
| Cuts into | 8 strips: `sprite.creature.japanese.tier6.upgraded.idle.png`, `sprite.creature.japanese.tier6.upgraded.move.png`, `sprite.creature.japanese.tier6.upgraded.attack.png`, `sprite.creature.japanese.tier6.upgraded.defend.png`, `sprite.creature.japanese.tier6.upgraded.hit.png`, `sprite.creature.japanese.tier6.upgraded.death.png`, `sprite.creature.japanese.tier6.upgraded.victory.png`, `sprite.creature.japanese.tier6.upgraded.shoot.png` |
| Status | idle placeholder, move placeholder, attack placeholder, defend placeholder, hit placeholder, death placeholder, victory placeholder, shoot placeholder |

```text
Using the attached animation sheet of Kirin and the canonical reference of Celestial Kirin, create the same animation sheet for Celestial Kirin, its upgraded form, for Pantheon Realms.
Keep the attached sheet's layout, every frame's pose, timing, camera, scale and place in its cell; change only the creature design to the upgraded form.
The creature: Celestial Kirin — A golden-scaled kirin walking on clouds, mane of white fire streaming.
Image 1424 × 1104 px (or larger, same proportions): an invisible grid of 6 columns × 7 rows of equal cells, each cell 3.20 hex widths wide. No grid lines, no borders, no labels, no numbers, no text. Every item stays inside its own cell with clear empty space around it; nothing touches or crosses a cell edge.
Each row is one animation; its frames run left to right:
Row 1 — idle (6 frames, loops): 1) neutral stance · 2) breathing in, chest rising · 3) breath held, weight shifts slightly forward · 4) small head turn · 5) breathing out, chest sinking · 6) settling back to neutral (loops into frame 1)
Row 2 — move (6 frames, loops): 1) front left foot down · 2) pushing off · 3) legs gathered · 4) front right foot down · 5) pushing off · 6) legs stretched (loops)
Row 3 — attack (6 frames): 1) ready stance · 2) anticipation: draws back, coiled · 3) strike: lunges forward and bites, claws raking · 4) impact pose, fully extended · 5) follow-through · 6) recovering to the ready stance
Row 4 — defend (cells 1–3): 1) ready stance · 2) lowers its head and braces · 3) braced (held) | hit (cells 4–6): 1) struck: jolts back · 2) recoils, flinching · 3) steadies
Row 5 — death (6 frames, last frame held): 1) struck a final time · 2) staggers back · 3) legs buckle · 4) falls · 5) hits the ground · 6) lying still on the ground (held: the body stays on the battlefield)
Row 6 — victory (6 frames, loops): 1) begins a triumphant gesture · 2) raises weapon, head or wings high · 3) peak of the gesture · 4) holds · 5) lowers slightly · 6) raises again (loops into frame 2)
Row 7 — shoot (6 frames): 1) ready stance · 2) draws or winds up, aiming · 3) release: makes its ranged attack with the weapon shown in the reference · 4) follow-through (the missile has left; the game draws it in flight) · 5) recoil · 6) recovering to the ready stance
In every frame: the exact same Celestial Kirin, same size, same anatomy, armour, equipment, materials and lighting; it faces right; its feet stand on the cell's ground line at 90% of the cell height, centred in the cell; it stands about 51% of the cell height tall.
Fixed elevated side / three-quarter strategy-game camera (about 20° above the horizon), the same in every cell.
Modern high-resolution pre-rendered fantasy strategy-game sprite style. Strong readable silhouette. Moderate detail appropriate for gameplay scale.
Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). No ground, no shadows, no environment, no text.
```

### C · Orochi — Japanese, tier 7, base form

| Field | Value |
|---|---|
| Sheet file | `sheet.creature.japanese.tier7.base.png` |
| Creature | `japanese_orochi` · Apex serpent · occupies 2 hexes · Unlimited Retaliation (passive) |
| Rows | 1. idle (6)<br>2. move (6)<br>3. attack (6)<br>4. defend (3) + hit (3)<br>5. death (6)<br>6. victory (6) |
| Image | 1536 × 1024 px (about 1.6 MP) or larger with the same proportions — 6 columns × 6 rows, cells 256 × 171 px |
| Scale | a cell is 3.20 hex widths wide and 2.13 tall; ground line at 90 % of the cell height; the creature stands about 69 % of the cell height |
| Attach | `assets-source/creatures/reference/creature.japanese.tier7.base.ref.threequarter.png` (canonical master — Group A first); `support images/ChatGPT Image Sep 29, 2026, 03_35_37 PM-4.png` |
| Cuts into | 7 strips: `sprite.creature.japanese.tier7.base.idle.png`, `sprite.creature.japanese.tier7.base.move.png`, `sprite.creature.japanese.tier7.base.attack.png`, `sprite.creature.japanese.tier7.base.defend.png`, `sprite.creature.japanese.tier7.base.hit.png`, `sprite.creature.japanese.tier7.base.death.png`, `sprite.creature.japanese.tier7.base.victory.png` |
| Status | idle placeholder, move placeholder, attack placeholder, defend placeholder, hit placeholder, death placeholder, victory placeholder |

```text
Using the attached canonical reference of Orochi, create one animation sheet for Pantheon Realms.
The creature: Orochi — A vast serpent with many heads rising from one coiled body, eyes red as lanterns.
Image 1536 × 1024 px (or larger, same proportions): an invisible grid of 6 columns × 6 rows of equal cells, each cell 3.20 hex widths wide. No grid lines, no borders, no labels, no numbers, no text. Every item stays inside its own cell with clear empty space around it; nothing touches or crosses a cell edge.
Each row is one animation; its frames run left to right:
Row 1 — idle (6 frames, loops): 1) neutral stance · 2) breathing in, chest rising · 3) breath held, weight shifts slightly forward · 4) small head turn · 5) breathing out, chest sinking · 6) settling back to neutral (loops into frame 1)
Row 2 — move (6 frames, loops): 1) body curved left · 2) curve travelling back · 3) body straight · 4) body curved right · 5) curve travelling back · 6) body straight (loops)
Row 3 — attack (6 frames): 1) ready stance · 2) anticipation: draws back, coiled · 3) strike: rears back and strikes forward with its jaws · 4) impact pose, fully extended · 5) follow-through · 6) recovering to the ready stance
Row 4 — defend (cells 1–3): 1) ready stance · 2) coils tightly and lowers its head · 3) braced (held) | hit (cells 4–6): 1) struck: jolts back · 2) recoils, flinching · 3) steadies
Row 5 — death (6 frames, last frame held): 1) struck a final time · 2) staggers back · 3) legs buckle · 4) falls · 5) hits the ground · 6) lying still on the ground (held: the body stays on the battlefield)
Row 6 — victory (6 frames, loops): 1) begins a triumphant gesture · 2) raises weapon, head or wings high · 3) peak of the gesture · 4) holds · 5) lowers slightly · 6) raises again (loops into frame 2)
In every frame: the exact same Orochi, same size, same anatomy, armour, equipment, materials and lighting; it faces right; its feet stand on the cell's ground line at 90% of the cell height, centred in the cell; it stands about 69% of the cell height tall.
Fixed elevated side / three-quarter strategy-game camera (about 20° above the horizon), the same in every cell.
Modern high-resolution pre-rendered fantasy strategy-game sprite style. Strong readable silhouette. Moderate detail appropriate for gameplay scale.
Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). No ground, no shadows, no environment, no text.
```

### C · Imperial Orochi — Japanese, tier 7, upgraded form

| Field | Value |
|---|---|
| Sheet file | `sheet.creature.japanese.tier7.upgraded.png` |
| Creature | `japanese_imperial_orochi` · Apex serpent · occupies 2 hexes · Unlimited Retaliation (passive) · Unyielding (passive) |
| Rows | 1. idle (6)<br>2. move (6)<br>3. attack (6)<br>4. defend (3) + hit (3)<br>5. death (6)<br>6. victory (6) |
| Image | 1536 × 1024 px (about 1.6 MP) or larger with the same proportions — 6 columns × 6 rows, cells 256 × 171 px |
| Scale | a cell is 3.20 hex widths wide and 2.13 tall; ground line at 90 % of the cell height; the creature stands about 72 % of the cell height |
| Attach | `sheet.creature.japanese.tier7.base.png` (the base form's sheet — same layout and poses); `assets-source/creatures/reference/creature.japanese.tier7.upgraded.ref.threequarter.png` (canonical master — Group A first); `support images/ChatGPT Image Sep 29, 2026, 03_35_37 PM-4.png` |
| Cuts into | 7 strips: `sprite.creature.japanese.tier7.upgraded.idle.png`, `sprite.creature.japanese.tier7.upgraded.move.png`, `sprite.creature.japanese.tier7.upgraded.attack.png`, `sprite.creature.japanese.tier7.upgraded.defend.png`, `sprite.creature.japanese.tier7.upgraded.hit.png`, `sprite.creature.japanese.tier7.upgraded.death.png`, `sprite.creature.japanese.tier7.upgraded.victory.png` |
| Status | idle placeholder, move placeholder, attack placeholder, defend placeholder, hit placeholder, death placeholder, victory placeholder |

```text
Using the attached animation sheet of Orochi and the canonical reference of Imperial Orochi, create the same animation sheet for Imperial Orochi, its upgraded form, for Pantheon Realms.
Keep the attached sheet's layout, every frame's pose, timing, camera, scale and place in its cell; change only the creature design to the upgraded form.
The creature: Imperial Orochi — An eight-headed serpent with gold scales and a golden crest on every head.
Image 1536 × 1024 px (or larger, same proportions): an invisible grid of 6 columns × 6 rows of equal cells, each cell 3.20 hex widths wide. No grid lines, no borders, no labels, no numbers, no text. Every item stays inside its own cell with clear empty space around it; nothing touches or crosses a cell edge.
Each row is one animation; its frames run left to right:
Row 1 — idle (6 frames, loops): 1) neutral stance · 2) breathing in, chest rising · 3) breath held, weight shifts slightly forward · 4) small head turn · 5) breathing out, chest sinking · 6) settling back to neutral (loops into frame 1)
Row 2 — move (6 frames, loops): 1) body curved left · 2) curve travelling back · 3) body straight · 4) body curved right · 5) curve travelling back · 6) body straight (loops)
Row 3 — attack (6 frames): 1) ready stance · 2) anticipation: draws back, coiled · 3) strike: rears back and strikes forward with its jaws · 4) impact pose, fully extended · 5) follow-through · 6) recovering to the ready stance
Row 4 — defend (cells 1–3): 1) ready stance · 2) coils tightly and lowers its head · 3) braced (held) | hit (cells 4–6): 1) struck: jolts back · 2) recoils, flinching · 3) steadies
Row 5 — death (6 frames, last frame held): 1) struck a final time · 2) staggers back · 3) legs buckle · 4) falls · 5) hits the ground · 6) lying still on the ground (held: the body stays on the battlefield)
Row 6 — victory (6 frames, loops): 1) begins a triumphant gesture · 2) raises weapon, head or wings high · 3) peak of the gesture · 4) holds · 5) lowers slightly · 6) raises again (loops into frame 2)
In every frame: the exact same Imperial Orochi, same size, same anatomy, armour, equipment, materials and lighting; it faces right; its feet stand on the cell's ground line at 90% of the cell height, centred in the cell; it stands about 72% of the cell height tall.
Fixed elevated side / three-quarter strategy-game camera (about 20° above the horizon), the same in every cell.
Modern high-resolution pre-rendered fantasy strategy-game sprite style. Strong readable silhouette. Moderate detail appropriate for gameplay scale.
Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). No ground, no shadows, no environment, no text.
```

### C · Feathered Serpent — Mesoamerican, tier 1, base form

| Field | Value |
|---|---|
| Sheet file | `sheet.creature.mesoamerican.tier1.base.png` |
| Creature | `mesoamerican_feathered_serpent` · Serpent swarm · occupies 1 hex |
| Rows | 1. idle (6)<br>2. move (6)<br>3. attack (6)<br>4. defend (3) + hit (3)<br>5. death (6)<br>6. victory (6) |
| Image | 1256 × 1256 px (about 1.6 MP) or larger with the same proportions — 6 columns × 6 rows, cells 209 × 209 px |
| Scale | a cell is 2.13 hex widths wide and 2.13 tall; ground line at 90 % of the cell height; the creature stands about 58 % of the cell height |
| Attach | `assets-source/creatures/reference/creature.mesoamerican.tier1.base.ref.threequarter.png` (canonical master — Group A first); `support images/ChatGPT Image Sep 29, 2026, 03_35_45 PM-6.png` |
| Cuts into | 7 strips: `sprite.creature.mesoamerican.tier1.base.idle.png`, `sprite.creature.mesoamerican.tier1.base.move.png`, `sprite.creature.mesoamerican.tier1.base.attack.png`, `sprite.creature.mesoamerican.tier1.base.defend.png`, `sprite.creature.mesoamerican.tier1.base.hit.png`, `sprite.creature.mesoamerican.tier1.base.death.png`, `sprite.creature.mesoamerican.tier1.base.victory.png` |
| Status | idle placeholder, move placeholder, attack placeholder, defend placeholder, hit placeholder, death placeholder, victory placeholder |

```text
Using the attached canonical reference of Feathered Serpent, create one animation sheet for Pantheon Realms.
The creature: Feathered Serpent — A green serpent with a ruff of quetzal feathers around its head.
Image 1256 × 1256 px (or larger, same proportions): an invisible grid of 6 columns × 6 rows of equal cells, each cell 2.13 hex widths wide. No grid lines, no borders, no labels, no numbers, no text. Every item stays inside its own cell with clear empty space around it; nothing touches or crosses a cell edge.
Each row is one animation; its frames run left to right:
Row 1 — idle (6 frames, loops): 1) neutral stance · 2) breathing in, chest rising · 3) breath held, weight shifts slightly forward · 4) small head turn · 5) breathing out, chest sinking · 6) settling back to neutral (loops into frame 1)
Row 2 — move (6 frames, loops): 1) body curved left · 2) curve travelling back · 3) body straight · 4) body curved right · 5) curve travelling back · 6) body straight (loops)
Row 3 — attack (6 frames): 1) ready stance · 2) anticipation: draws back, coiled · 3) strike: rears back and strikes forward with its jaws · 4) impact pose, fully extended · 5) follow-through · 6) recovering to the ready stance
Row 4 — defend (cells 1–3): 1) ready stance · 2) coils tightly and lowers its head · 3) braced (held) | hit (cells 4–6): 1) struck: jolts back · 2) recoils, flinching · 3) steadies
Row 5 — death (6 frames, last frame held): 1) struck a final time · 2) staggers back · 3) legs buckle · 4) falls · 5) hits the ground · 6) lying still on the ground (held: the body stays on the battlefield)
Row 6 — victory (6 frames, loops): 1) begins a triumphant gesture · 2) raises weapon, head or wings high · 3) peak of the gesture · 4) holds · 5) lowers slightly · 6) raises again (loops into frame 2)
In every frame: the exact same Feathered Serpent, same size, same anatomy, armour, equipment, materials and lighting; it faces right; its feet stand on the cell's ground line at 90% of the cell height, centred in the cell; it stands about 58% of the cell height tall.
Fixed elevated side / three-quarter strategy-game camera (about 20° above the horizon), the same in every cell.
Modern high-resolution pre-rendered fantasy strategy-game sprite style. Strong readable silhouette. Moderate detail appropriate for gameplay scale.
Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). No ground, no shadows, no environment, no text.
```

### C · Celestial Feathered Serpent — Mesoamerican, tier 1, upgraded form

| Field | Value |
|---|---|
| Sheet file | `sheet.creature.mesoamerican.tier1.upgraded.png` |
| Creature | `mesoamerican_celestial_feathered_serpent` · Serpent swarm · occupies 1 hex · Flight (passive) |
| Rows | 1. idle (6)<br>2. move (6)<br>3. attack (6)<br>4. defend (3) + hit (3)<br>5. death (6)<br>6. victory (6)<br>7. takeoff (3) + landing (3)<br>8. fly (6) |
| Image | 1088 × 1448 px (about 1.6 MP) or larger with the same proportions — 6 columns × 8 rows, cells 181 × 181 px<br>or two parts for sharper frames: `sheet.creature.mesoamerican.tier1.upgraded.part1.png` rows 1–4, 1536 × 1024 px; `sheet.creature.mesoamerican.tier1.upgraded.part2.png` rows 5–8, 1536 × 1024 px |
| Scale | a cell is 2.13 hex widths wide and 2.13 tall; ground line at 90 % of the cell height; the creature stands about 61 % of the cell height |
| Attach | `sheet.creature.mesoamerican.tier1.base.png` (the base form's sheet — same layout and poses); `assets-source/creatures/reference/creature.mesoamerican.tier1.upgraded.ref.threequarter.png` (canonical master — Group A first); `support images/ChatGPT Image Sep 29, 2026, 03_35_45 PM-6.png` |
| Cuts into | 10 strips: `sprite.creature.mesoamerican.tier1.upgraded.idle.png`, `sprite.creature.mesoamerican.tier1.upgraded.move.png`, `sprite.creature.mesoamerican.tier1.upgraded.attack.png`, `sprite.creature.mesoamerican.tier1.upgraded.defend.png`, `sprite.creature.mesoamerican.tier1.upgraded.hit.png`, `sprite.creature.mesoamerican.tier1.upgraded.death.png`, `sprite.creature.mesoamerican.tier1.upgraded.victory.png`, `sprite.creature.mesoamerican.tier1.upgraded.takeoff.png`, `sprite.creature.mesoamerican.tier1.upgraded.landing.png`, `sprite.creature.mesoamerican.tier1.upgraded.fly.png` |
| Status | idle placeholder, move placeholder, attack placeholder, defend placeholder, hit placeholder, death placeholder, victory placeholder, takeoff placeholder, landing placeholder, fly placeholder |

```text
Using the attached animation sheet of Feathered Serpent and the canonical reference of Celestial Feathered Serpent, create the same animation sheet for Celestial Feathered Serpent, its upgraded form, for Pantheon Realms.
Keep the attached sheet's layout, every frame's pose, timing, camera, scale and place in its cell; change only the creature design to the upgraded form.
The creature: Celestial Feathered Serpent — A turquoise serpent with long feathered wings spread against a gold sky.
Image 1088 × 1448 px (or larger, same proportions): an invisible grid of 6 columns × 8 rows of equal cells, each cell 2.13 hex widths wide. No grid lines, no borders, no labels, no numbers, no text. Every item stays inside its own cell with clear empty space around it; nothing touches or crosses a cell edge.
Each row is one animation; its frames run left to right:
Row 1 — idle (6 frames, loops): 1) neutral stance · 2) breathing in, chest rising · 3) breath held, weight shifts slightly forward · 4) small head turn · 5) breathing out, chest sinking · 6) settling back to neutral (loops into frame 1)
Row 2 — move (6 frames, loops): 1) body curved left · 2) curve travelling back · 3) body straight · 4) body curved right · 5) curve travelling back · 6) body straight (loops)
Row 3 — attack (6 frames): 1) ready stance · 2) anticipation: draws back, coiled · 3) strike: rears back and strikes forward with its jaws · 4) impact pose, fully extended · 5) follow-through · 6) recovering to the ready stance
Row 4 — defend (cells 1–3): 1) ready stance · 2) coils tightly and lowers its head · 3) braced (held) | hit (cells 4–6): 1) struck: jolts back · 2) recoils, flinching · 3) steadies
Row 5 — death (6 frames, last frame held): 1) struck a final time · 2) staggers back · 3) legs buckle · 4) falls · 5) hits the ground · 6) lying still on the ground (held: the body stays on the battlefield)
Row 6 — victory (6 frames, loops): 1) begins a triumphant gesture · 2) raises weapon, head or wings high · 3) peak of the gesture · 4) holds · 5) lowers slightly · 6) raises again (loops into frame 2)
Row 7 — takeoff (cells 1–3): 1) crouches, wings rising · 2) first downbeat, feet leave the ground · 3) hovering at flight height | landing (cells 4–6): 1) hovering, wings spread to brake · 2) touchdown, legs absorbing the landing · 3) standing, wings folding
Row 8 — fly (6 frames, loops): 1) wings up · 2) downbeat · 3) wings down · 4) upstroke · 5) wings level · 6) wings rising (loops)
In every frame: the exact same Celestial Feathered Serpent, same size, same anatomy, armour, equipment, materials and lighting; it faces right; its feet stand on the cell's ground line at 90% of the cell height, centred in the cell (airborne frames hover about 15% of the cell height above that line); it stands about 61% of the cell height tall.
Fixed elevated side / three-quarter strategy-game camera (about 20° above the horizon), the same in every cell.
Modern high-resolution pre-rendered fantasy strategy-game sprite style. Strong readable silhouette. Moderate detail appropriate for gameplay scale.
Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). No ground, no shadows, no environment, no text.
```

### C · Jaguar Spirit — Mesoamerican, tier 2, base form

| Field | Value |
|---|---|
| Sheet file | `sheet.creature.mesoamerican.tier2.base.png` |
| Creature | `mesoamerican_jaguar_spirit` · Pouncing predator · occupies 1 hex · Charge (passive) |
| Rows | 1. idle (6)<br>2. move (6)<br>3. attack (6)<br>4. defend (3) + hit (3)<br>5. death (6)<br>6. victory (6) |
| Image | 1256 × 1256 px (about 1.6 MP) or larger with the same proportions — 6 columns × 6 rows, cells 209 × 209 px |
| Scale | a cell is 2.13 hex widths wide and 2.13 tall; ground line at 90 % of the cell height; the creature stands about 44 % of the cell height |
| Attach | `assets-source/creatures/reference/creature.mesoamerican.tier2.base.ref.threequarter.png` (canonical master — Group A first); `support images/ChatGPT Image Sep 29, 2026, 03_35_45 PM-6.png` |
| Cuts into | 7 strips: `sprite.creature.mesoamerican.tier2.base.idle.png`, `sprite.creature.mesoamerican.tier2.base.move.png`, `sprite.creature.mesoamerican.tier2.base.attack.png`, `sprite.creature.mesoamerican.tier2.base.defend.png`, `sprite.creature.mesoamerican.tier2.base.hit.png`, `sprite.creature.mesoamerican.tier2.base.death.png`, `sprite.creature.mesoamerican.tier2.base.victory.png` |
| Status | idle placeholder, move placeholder, attack placeholder, defend placeholder, hit placeholder, death placeholder, victory placeholder |

```text
Using the attached canonical reference of Jaguar Spirit, create one animation sheet for Pantheon Realms.
The creature: Jaguar Spirit — A black-spotted golden jaguar with jade eyes, crouched to spring.
Image 1256 × 1256 px (or larger, same proportions): an invisible grid of 6 columns × 6 rows of equal cells, each cell 2.13 hex widths wide. No grid lines, no borders, no labels, no numbers, no text. Every item stays inside its own cell with clear empty space around it; nothing touches or crosses a cell edge.
Each row is one animation; its frames run left to right:
Row 1 — idle (6 frames, loops): 1) neutral stance · 2) breathing in, chest rising · 3) breath held, weight shifts slightly forward · 4) small head turn · 5) breathing out, chest sinking · 6) settling back to neutral (loops into frame 1)
Row 2 — move (6 frames, loops): 1) front left foot down · 2) pushing off · 3) legs gathered · 4) front right foot down · 5) pushing off · 6) legs stretched (loops)
Row 3 — attack (6 frames): 1) ready stance · 2) anticipation: draws back, coiled · 3) strike: lunges forward and bites, claws raking · 4) impact pose, fully extended · 5) follow-through · 6) recovering to the ready stance
Row 4 — defend (cells 1–3): 1) ready stance · 2) lowers its head and braces · 3) braced (held) | hit (cells 4–6): 1) struck: jolts back · 2) recoils, flinching · 3) steadies
Row 5 — death (6 frames, last frame held): 1) struck a final time · 2) staggers back · 3) legs buckle · 4) falls · 5) hits the ground · 6) lying still on the ground (held: the body stays on the battlefield)
Row 6 — victory (6 frames, loops): 1) begins a triumphant gesture · 2) raises weapon, head or wings high · 3) peak of the gesture · 4) holds · 5) lowers slightly · 6) raises again (loops into frame 2)
In every frame: the exact same Jaguar Spirit, same size, same anatomy, armour, equipment, materials and lighting; it faces right; its feet stand on the cell's ground line at 90% of the cell height, centred in the cell; it stands about 44% of the cell height tall.
Fixed elevated side / three-quarter strategy-game camera (about 20° above the horizon), the same in every cell.
Modern high-resolution pre-rendered fantasy strategy-game sprite style. Strong readable silhouette. Moderate detail appropriate for gameplay scale.
Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). No ground, no shadows, no environment, no text.
```

### C · Sun Jaguar — Mesoamerican, tier 2, upgraded form

| Field | Value |
|---|---|
| Sheet file | `sheet.creature.mesoamerican.tier2.upgraded.png` |
| Creature | `mesoamerican_sun_jaguar` · Pouncing predator · occupies 1 hex · Charge (passive) · Double Retaliation (passive) |
| Rows | 1. idle (6)<br>2. move (6)<br>3. attack (6)<br>4. defend (3) + hit (3)<br>5. death (6)<br>6. victory (6) |
| Image | 1256 × 1256 px (about 1.6 MP) or larger with the same proportions — 6 columns × 6 rows, cells 209 × 209 px |
| Scale | a cell is 2.13 hex widths wide and 2.13 tall; ground line at 90 % of the cell height; the creature stands about 46 % of the cell height |
| Attach | `sheet.creature.mesoamerican.tier2.base.png` (the base form's sheet — same layout and poses); `assets-source/creatures/reference/creature.mesoamerican.tier2.upgraded.ref.threequarter.png` (canonical master — Group A first); `support images/ChatGPT Image Sep 29, 2026, 03_35_45 PM-6.png` |
| Cuts into | 7 strips: `sprite.creature.mesoamerican.tier2.upgraded.idle.png`, `sprite.creature.mesoamerican.tier2.upgraded.move.png`, `sprite.creature.mesoamerican.tier2.upgraded.attack.png`, `sprite.creature.mesoamerican.tier2.upgraded.defend.png`, `sprite.creature.mesoamerican.tier2.upgraded.hit.png`, `sprite.creature.mesoamerican.tier2.upgraded.death.png`, `sprite.creature.mesoamerican.tier2.upgraded.victory.png` |
| Status | idle placeholder, move placeholder, attack placeholder, defend placeholder, hit placeholder, death placeholder, victory placeholder |

```text
Using the attached animation sheet of Jaguar Spirit and the canonical reference of Sun Jaguar, create the same animation sheet for Sun Jaguar, its upgraded form, for Pantheon Realms.
Keep the attached sheet's layout, every frame's pose, timing, camera, scale and place in its cell; change only the creature design to the upgraded form.
The creature: Sun Jaguar — A bright-gold jaguar with a sun-disc pattern across its shoulders.
Image 1256 × 1256 px (or larger, same proportions): an invisible grid of 6 columns × 6 rows of equal cells, each cell 2.13 hex widths wide. No grid lines, no borders, no labels, no numbers, no text. Every item stays inside its own cell with clear empty space around it; nothing touches or crosses a cell edge.
Each row is one animation; its frames run left to right:
Row 1 — idle (6 frames, loops): 1) neutral stance · 2) breathing in, chest rising · 3) breath held, weight shifts slightly forward · 4) small head turn · 5) breathing out, chest sinking · 6) settling back to neutral (loops into frame 1)
Row 2 — move (6 frames, loops): 1) front left foot down · 2) pushing off · 3) legs gathered · 4) front right foot down · 5) pushing off · 6) legs stretched (loops)
Row 3 — attack (6 frames): 1) ready stance · 2) anticipation: draws back, coiled · 3) strike: lunges forward and bites, claws raking · 4) impact pose, fully extended · 5) follow-through · 6) recovering to the ready stance
Row 4 — defend (cells 1–3): 1) ready stance · 2) lowers its head and braces · 3) braced (held) | hit (cells 4–6): 1) struck: jolts back · 2) recoils, flinching · 3) steadies
Row 5 — death (6 frames, last frame held): 1) struck a final time · 2) staggers back · 3) legs buckle · 4) falls · 5) hits the ground · 6) lying still on the ground (held: the body stays on the battlefield)
Row 6 — victory (6 frames, loops): 1) begins a triumphant gesture · 2) raises weapon, head or wings high · 3) peak of the gesture · 4) holds · 5) lowers slightly · 6) raises again (loops into frame 2)
In every frame: the exact same Sun Jaguar, same size, same anatomy, armour, equipment, materials and lighting; it faces right; its feet stand on the cell's ground line at 90% of the cell height, centred in the cell; it stands about 46% of the cell height tall.
Fixed elevated side / three-quarter strategy-game camera (about 20° above the horizon), the same in every cell.
Modern high-resolution pre-rendered fantasy strategy-game sprite style. Strong readable silhouette. Moderate detail appropriate for gameplay scale.
Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). No ground, no shadows, no environment, no text.
```

### C · Eagle Warrior Spirit — Mesoamerican, tier 3, base form

| Field | Value |
|---|---|
| Sheet file | `sheet.creature.mesoamerican.tier3.base.png` |
| Creature | `mesoamerican_eagle_warrior_spirit` · Dart thrower · occupies 1 hex · shoots (range 14) · Shooter (passive) |
| Rows | 1. idle (6)<br>2. move (6)<br>3. attack (6)<br>4. defend (3) + hit (3)<br>5. death (6)<br>6. victory (6)<br>7. shoot (6) |
| Image | 1160 × 1352 px (about 1.6 MP) or larger with the same proportions — 6 columns × 7 rows, cells 193 × 193 px<br>or two parts for sharper frames: `sheet.creature.mesoamerican.tier3.base.part1.png` rows 1–4, 1536 × 1024 px; `sheet.creature.mesoamerican.tier3.base.part2.png` rows 5–7, 1776 × 888 px |
| Scale | a cell is 2.13 hex widths wide and 2.13 tall; ground line at 90 % of the cell height; the creature stands about 54 % of the cell height |
| Attach | `assets-source/creatures/reference/creature.mesoamerican.tier3.base.ref.threequarter.png` (canonical master — Group A first); `support images/ChatGPT Image Sep 29, 2026, 03_35_45 PM-6.png` |
| Cuts into | 8 strips: `sprite.creature.mesoamerican.tier3.base.idle.png`, `sprite.creature.mesoamerican.tier3.base.move.png`, `sprite.creature.mesoamerican.tier3.base.attack.png`, `sprite.creature.mesoamerican.tier3.base.defend.png`, `sprite.creature.mesoamerican.tier3.base.hit.png`, `sprite.creature.mesoamerican.tier3.base.death.png`, `sprite.creature.mesoamerican.tier3.base.victory.png`, `sprite.creature.mesoamerican.tier3.base.shoot.png` |
| Status | idle placeholder, move placeholder, attack placeholder, defend placeholder, hit placeholder, death placeholder, victory placeholder, shoot placeholder |

```text
Using the attached canonical reference of Eagle Warrior Spirit, create one animation sheet for Pantheon Realms.
The creature: Eagle Warrior Spirit — A warrior in a feathered eagle-head helmet holding an atlatl and darts.
Image 1160 × 1352 px (or larger, same proportions): an invisible grid of 6 columns × 7 rows of equal cells, each cell 2.13 hex widths wide. No grid lines, no borders, no labels, no numbers, no text. Every item stays inside its own cell with clear empty space around it; nothing touches or crosses a cell edge.
Each row is one animation; its frames run left to right:
Row 1 — idle (6 frames, loops): 1) neutral stance · 2) breathing in, chest rising · 3) breath held, weight shifts slightly forward · 4) small head turn · 5) breathing out, chest sinking · 6) settling back to neutral (loops into frame 1)
Row 2 — move (6 frames, loops): 1) right foot forward, heel down · 2) weight on the right foot · 3) left leg passing · 4) left foot forward, heel down · 5) weight on the left foot · 6) right leg passing (loops)
Row 3 — attack (6 frames): 1) ready stance · 2) anticipation: draws back, coiled · 3) strike: jabs with a javelin or blade held close, guarding with its off arm · 4) impact pose, fully extended · 5) follow-through · 6) recovering to the ready stance
Row 4 — defend (cells 1–3): 1) ready stance · 2) raises its small shield or arm and crouches · 3) braced (held) | hit (cells 4–6): 1) struck: jolts back · 2) recoils, flinching · 3) steadies
Row 5 — death (6 frames, last frame held): 1) struck a final time · 2) staggers back · 3) legs buckle · 4) falls · 5) hits the ground · 6) lying still on the ground (held: the body stays on the battlefield)
Row 6 — victory (6 frames, loops): 1) begins a triumphant gesture · 2) raises weapon, head or wings high · 3) peak of the gesture · 4) holds · 5) lowers slightly · 6) raises again (loops into frame 2)
Row 7 — shoot (6 frames): 1) ready stance · 2) draws or winds up, aiming · 3) release: throws its ranged weapon (javelin, sling stone or arrow, as in the reference) · 4) follow-through (the missile has left; the game draws it in flight) · 5) recoil · 6) recovering to the ready stance
In every frame: the exact same Eagle Warrior Spirit, same size, same anatomy, armour, equipment, materials and lighting; it faces right; its feet stand on the cell's ground line at 90% of the cell height, centred in the cell; it stands about 54% of the cell height tall.
Fixed elevated side / three-quarter strategy-game camera (about 20° above the horizon), the same in every cell.
Modern high-resolution pre-rendered fantasy strategy-game sprite style. Strong readable silhouette. Moderate detail appropriate for gameplay scale.
Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). No ground, no shadows, no environment, no text.
```

### C · Solar Eagle Warrior — Mesoamerican, tier 3, upgraded form

| Field | Value |
|---|---|
| Sheet file | `sheet.creature.mesoamerican.tier3.upgraded.png` |
| Creature | `mesoamerican_solar_eagle_warrior` · Dart thrower · occupies 1 hex · shoots (range 15) · Shooter (passive) |
| Rows | 1. idle (6)<br>2. move (6)<br>3. attack (6)<br>4. defend (3) + hit (3)<br>5. death (6)<br>6. victory (6)<br>7. shoot (6) |
| Image | 1160 × 1352 px (about 1.6 MP) or larger with the same proportions — 6 columns × 7 rows, cells 193 × 193 px<br>or two parts for sharper frames: `sheet.creature.mesoamerican.tier3.upgraded.part1.png` rows 1–4, 1536 × 1024 px; `sheet.creature.mesoamerican.tier3.upgraded.part2.png` rows 5–7, 1776 × 888 px |
| Scale | a cell is 2.13 hex widths wide and 2.13 tall; ground line at 90 % of the cell height; the creature stands about 57 % of the cell height |
| Attach | `sheet.creature.mesoamerican.tier3.base.png` (the base form's sheet — same layout and poses); `assets-source/creatures/reference/creature.mesoamerican.tier3.upgraded.ref.threequarter.png` (canonical master — Group A first); `support images/ChatGPT Image Sep 29, 2026, 03_35_45 PM-6.png` |
| Cuts into | 8 strips: `sprite.creature.mesoamerican.tier3.upgraded.idle.png`, `sprite.creature.mesoamerican.tier3.upgraded.move.png`, `sprite.creature.mesoamerican.tier3.upgraded.attack.png`, `sprite.creature.mesoamerican.tier3.upgraded.defend.png`, `sprite.creature.mesoamerican.tier3.upgraded.hit.png`, `sprite.creature.mesoamerican.tier3.upgraded.death.png`, `sprite.creature.mesoamerican.tier3.upgraded.victory.png`, `sprite.creature.mesoamerican.tier3.upgraded.shoot.png` |
| Status | idle placeholder, move placeholder, attack placeholder, defend placeholder, hit placeholder, death placeholder, victory placeholder, shoot placeholder |

```text
Using the attached animation sheet of Eagle Warrior Spirit and the canonical reference of Solar Eagle Warrior, create the same animation sheet for Solar Eagle Warrior, its upgraded form, for Pantheon Realms.
Keep the attached sheet's layout, every frame's pose, timing, camera, scale and place in its cell; change only the creature design to the upgraded form.
The creature: Solar Eagle Warrior — An eagle warrior in golden feathers with a sun-ray shield and a bundle of darts.
Image 1160 × 1352 px (or larger, same proportions): an invisible grid of 6 columns × 7 rows of equal cells, each cell 2.13 hex widths wide. No grid lines, no borders, no labels, no numbers, no text. Every item stays inside its own cell with clear empty space around it; nothing touches or crosses a cell edge.
Each row is one animation; its frames run left to right:
Row 1 — idle (6 frames, loops): 1) neutral stance · 2) breathing in, chest rising · 3) breath held, weight shifts slightly forward · 4) small head turn · 5) breathing out, chest sinking · 6) settling back to neutral (loops into frame 1)
Row 2 — move (6 frames, loops): 1) right foot forward, heel down · 2) weight on the right foot · 3) left leg passing · 4) left foot forward, heel down · 5) weight on the left foot · 6) right leg passing (loops)
Row 3 — attack (6 frames): 1) ready stance · 2) anticipation: draws back, coiled · 3) strike: jabs with a javelin or blade held close, guarding with its off arm · 4) impact pose, fully extended · 5) follow-through · 6) recovering to the ready stance
Row 4 — defend (cells 1–3): 1) ready stance · 2) raises its small shield or arm and crouches · 3) braced (held) | hit (cells 4–6): 1) struck: jolts back · 2) recoils, flinching · 3) steadies
Row 5 — death (6 frames, last frame held): 1) struck a final time · 2) staggers back · 3) legs buckle · 4) falls · 5) hits the ground · 6) lying still on the ground (held: the body stays on the battlefield)
Row 6 — victory (6 frames, loops): 1) begins a triumphant gesture · 2) raises weapon, head or wings high · 3) peak of the gesture · 4) holds · 5) lowers slightly · 6) raises again (loops into frame 2)
Row 7 — shoot (6 frames): 1) ready stance · 2) draws or winds up, aiming · 3) release: throws its ranged weapon (javelin, sling stone or arrow, as in the reference) · 4) follow-through (the missile has left; the game draws it in flight) · 5) recoil · 6) recovering to the ready stance
In every frame: the exact same Solar Eagle Warrior, same size, same anatomy, armour, equipment, materials and lighting; it faces right; its feet stand on the cell's ground line at 90% of the cell height, centred in the cell; it stands about 57% of the cell height tall.
Fixed elevated side / three-quarter strategy-game camera (about 20° above the horizon), the same in every cell.
Modern high-resolution pre-rendered fantasy strategy-game sprite style. Strong readable silhouette. Moderate detail appropriate for gameplay scale.
Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). No ground, no shadows, no environment, no text.
```

### C · Cenote Crocodile — Mesoamerican, tier 4, base form

| Field | Value |
|---|---|
| Sheet file | `sheet.creature.mesoamerican.tier4.base.png` |
| Creature | `mesoamerican_cenote_crocodile` · Temple guardian · occupies 2 hexes · Charge Guard (passive) |
| Rows | 1. idle (6)<br>2. move (6)<br>3. attack (6)<br>4. defend (3) + hit (3)<br>5. death (6)<br>6. victory (6) |
| Image | 1536 × 1024 px (about 1.6 MP) or larger with the same proportions — 6 columns × 6 rows, cells 256 × 171 px |
| Scale | a cell is 3.20 hex widths wide and 2.13 tall; ground line at 90 % of the cell height; the creature stands about 46 % of the cell height |
| Attach | `assets-source/creatures/reference/creature.mesoamerican.tier4.base.ref.threequarter.png` (canonical master — Group A first); `support images/ChatGPT Image Sep 29, 2026, 03_35_45 PM-6.png` |
| Cuts into | 7 strips: `sprite.creature.mesoamerican.tier4.base.idle.png`, `sprite.creature.mesoamerican.tier4.base.move.png`, `sprite.creature.mesoamerican.tier4.base.attack.png`, `sprite.creature.mesoamerican.tier4.base.defend.png`, `sprite.creature.mesoamerican.tier4.base.hit.png`, `sprite.creature.mesoamerican.tier4.base.death.png`, `sprite.creature.mesoamerican.tier4.base.victory.png` |
| Status | idle placeholder, move placeholder, attack placeholder, defend placeholder, hit placeholder, death placeholder, victory placeholder |

```text
Using the attached canonical reference of Cenote Crocodile, create one animation sheet for Pantheon Realms.
The creature: Cenote Crocodile — A dark crocodile with jade-green scutes emerging from still blue water.
Image 1536 × 1024 px (or larger, same proportions): an invisible grid of 6 columns × 6 rows of equal cells, each cell 3.20 hex widths wide. No grid lines, no borders, no labels, no numbers, no text. Every item stays inside its own cell with clear empty space around it; nothing touches or crosses a cell edge.
Each row is one animation; its frames run left to right:
Row 1 — idle (6 frames, loops): 1) neutral stance · 2) breathing in, chest rising · 3) breath held, weight shifts slightly forward · 4) small head turn · 5) breathing out, chest sinking · 6) settling back to neutral (loops into frame 1)
Row 2 — move (6 frames, loops): 1) front left foot down · 2) pushing off · 3) legs gathered · 4) front right foot down · 5) pushing off · 6) legs stretched (loops)
Row 3 — attack (6 frames): 1) ready stance · 2) anticipation: draws back, coiled · 3) strike: lunges forward and bites, claws raking · 4) impact pose, fully extended · 5) follow-through · 6) recovering to the ready stance
Row 4 — defend (cells 1–3): 1) ready stance · 2) lowers its head and braces · 3) braced (held) | hit (cells 4–6): 1) struck: jolts back · 2) recoils, flinching · 3) steadies
Row 5 — death (6 frames, last frame held): 1) struck a final time · 2) staggers back · 3) legs buckle · 4) falls · 5) hits the ground · 6) lying still on the ground (held: the body stays on the battlefield)
Row 6 — victory (6 frames, loops): 1) begins a triumphant gesture · 2) raises weapon, head or wings high · 3) peak of the gesture · 4) holds · 5) lowers slightly · 6) raises again (loops into frame 2)
In every frame: the exact same Cenote Crocodile, same size, same anatomy, armour, equipment, materials and lighting; it faces right; its feet stand on the cell's ground line at 90% of the cell height, centred in the cell; it stands about 46% of the cell height tall.
Fixed elevated side / three-quarter strategy-game camera (about 20° above the horizon), the same in every cell.
Modern high-resolution pre-rendered fantasy strategy-game sprite style. Strong readable silhouette. Moderate detail appropriate for gameplay scale.
Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). No ground, no shadows, no environment, no text.
```

### C · Temple Crocodile — Mesoamerican, tier 4, upgraded form

| Field | Value |
|---|---|
| Sheet file | `sheet.creature.mesoamerican.tier4.upgraded.png` |
| Creature | `mesoamerican_temple_crocodile` · Temple guardian · occupies 2 hexes · Charge Guard (passive) · Double Retaliation (passive) |
| Rows | 1. idle (6)<br>2. move (6)<br>3. attack (6)<br>4. defend (3) + hit (3)<br>5. death (6)<br>6. victory (6) |
| Image | 1536 × 1024 px (about 1.6 MP) or larger with the same proportions — 6 columns × 6 rows, cells 256 × 171 px |
| Scale | a cell is 3.20 hex widths wide and 2.13 tall; ground line at 90 % of the cell height; the creature stands about 49 % of the cell height |
| Attach | `sheet.creature.mesoamerican.tier4.base.png` (the base form's sheet — same layout and poses); `assets-source/creatures/reference/creature.mesoamerican.tier4.upgraded.ref.threequarter.png` (canonical master — Group A first); `support images/ChatGPT Image Sep 29, 2026, 03_35_45 PM-6.png` |
| Cuts into | 7 strips: `sprite.creature.mesoamerican.tier4.upgraded.idle.png`, `sprite.creature.mesoamerican.tier4.upgraded.move.png`, `sprite.creature.mesoamerican.tier4.upgraded.attack.png`, `sprite.creature.mesoamerican.tier4.upgraded.defend.png`, `sprite.creature.mesoamerican.tier4.upgraded.hit.png`, `sprite.creature.mesoamerican.tier4.upgraded.death.png`, `sprite.creature.mesoamerican.tier4.upgraded.victory.png` |
| Status | idle placeholder, move placeholder, attack placeholder, defend placeholder, hit placeholder, death placeholder, victory placeholder |

```text
Using the attached animation sheet of Cenote Crocodile and the canonical reference of Temple Crocodile, create the same animation sheet for Temple Crocodile, its upgraded form, for Pantheon Realms.
Keep the attached sheet's layout, every frame's pose, timing, camera, scale and place in its cell; change only the creature design to the upgraded form.
The creature: Temple Crocodile — A great crocodile with carved jade plates bound to its back.
Image 1536 × 1024 px (or larger, same proportions): an invisible grid of 6 columns × 6 rows of equal cells, each cell 3.20 hex widths wide. No grid lines, no borders, no labels, no numbers, no text. Every item stays inside its own cell with clear empty space around it; nothing touches or crosses a cell edge.
Each row is one animation; its frames run left to right:
Row 1 — idle (6 frames, loops): 1) neutral stance · 2) breathing in, chest rising · 3) breath held, weight shifts slightly forward · 4) small head turn · 5) breathing out, chest sinking · 6) settling back to neutral (loops into frame 1)
Row 2 — move (6 frames, loops): 1) front left foot down · 2) pushing off · 3) legs gathered · 4) front right foot down · 5) pushing off · 6) legs stretched (loops)
Row 3 — attack (6 frames): 1) ready stance · 2) anticipation: draws back, coiled · 3) strike: lunges forward and bites, claws raking · 4) impact pose, fully extended · 5) follow-through · 6) recovering to the ready stance
Row 4 — defend (cells 1–3): 1) ready stance · 2) lowers its head and braces · 3) braced (held) | hit (cells 4–6): 1) struck: jolts back · 2) recoils, flinching · 3) steadies
Row 5 — death (6 frames, last frame held): 1) struck a final time · 2) staggers back · 3) legs buckle · 4) falls · 5) hits the ground · 6) lying still on the ground (held: the body stays on the battlefield)
Row 6 — victory (6 frames, loops): 1) begins a triumphant gesture · 2) raises weapon, head or wings high · 3) peak of the gesture · 4) holds · 5) lowers slightly · 6) raises again (loops into frame 2)
In every frame: the exact same Temple Crocodile, same size, same anatomy, armour, equipment, materials and lighting; it faces right; its feet stand on the cell's ground line at 90% of the cell height, centred in the cell; it stands about 49% of the cell height tall.
Fixed elevated side / three-quarter strategy-game camera (about 20° above the horizon), the same in every cell.
Modern high-resolution pre-rendered fantasy strategy-game sprite style. Strong readable silhouette. Moderate detail appropriate for gameplay scale.
Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). No ground, no shadows, no environment, no text.
```

### C · Camazotz — Mesoamerican, tier 5, base form

| Field | Value |
|---|---|
| Sheet file | `sheet.creature.mesoamerican.tier5.base.png` |
| Creature | `mesoamerican_camazotz` · Bat raider · occupies 1 hex · Flight (passive) |
| Rows | 1. idle (6)<br>2. move (6)<br>3. attack (6)<br>4. defend (3) + hit (3)<br>5. death (6)<br>6. victory (6)<br>7. takeoff (3) + landing (3)<br>8. fly (6) |
| Image | 1048 × 1504 px (about 1.6 MP) or larger with the same proportions — 6 columns × 8 rows, cells 175 × 188 px<br>or two parts for sharper frames: `sheet.creature.mesoamerican.tier5.base.part1.png` rows 1–4, 1480 × 1064 px; `sheet.creature.mesoamerican.tier5.base.part2.png` rows 5–8, 1480 × 1064 px |
| Scale | a cell is 2.13 hex widths wide and 2.30 tall; ground line at 90 % of the cell height; the creature stands about 63 % of the cell height |
| Attach | `assets-source/creatures/reference/creature.mesoamerican.tier5.base.ref.threequarter.png` (canonical master — Group A first); `support images/ChatGPT Image Sep 29, 2026, 03_35_45 PM-6.png` |
| Cuts into | 10 strips: `sprite.creature.mesoamerican.tier5.base.idle.png`, `sprite.creature.mesoamerican.tier5.base.move.png`, `sprite.creature.mesoamerican.tier5.base.attack.png`, `sprite.creature.mesoamerican.tier5.base.defend.png`, `sprite.creature.mesoamerican.tier5.base.hit.png`, `sprite.creature.mesoamerican.tier5.base.death.png`, `sprite.creature.mesoamerican.tier5.base.victory.png`, `sprite.creature.mesoamerican.tier5.base.takeoff.png`, `sprite.creature.mesoamerican.tier5.base.landing.png`, `sprite.creature.mesoamerican.tier5.base.fly.png` |
| Status | idle placeholder, move placeholder, attack placeholder, defend placeholder, hit placeholder, death placeholder, victory placeholder, takeoff placeholder, landing placeholder, fly placeholder |

```text
Using the attached canonical reference of Camazotz, create one animation sheet for Pantheon Realms.
The creature: Camazotz — A tall bat-headed figure with leathery wings and an obsidian blade.
Image 1048 × 1504 px (or larger, same proportions): an invisible grid of 6 columns × 8 rows of equal cells, each cell 2.13 hex widths wide. No grid lines, no borders, no labels, no numbers, no text. Every item stays inside its own cell with clear empty space around it; nothing touches or crosses a cell edge.
Each row is one animation; its frames run left to right:
Row 1 — idle (6 frames, loops): 1) neutral stance · 2) breathing in, chest rising · 3) breath held, weight shifts slightly forward · 4) small head turn · 5) breathing out, chest sinking · 6) settling back to neutral (loops into frame 1)
Row 2 — move (6 frames, loops): 1) right foot forward, heel down · 2) weight on the right foot · 3) left leg passing · 4) left foot forward, heel down · 5) weight on the left foot · 6) right leg passing (loops)
Row 3 — attack (6 frames): 1) ready stance · 2) anticipation: draws back, coiled · 3) strike: beats its wings once and strikes forward with its weapon · 4) impact pose, fully extended · 5) follow-through · 6) recovering to the ready stance
Row 4 — defend (cells 1–3): 1) ready stance · 2) folds its wings forward like a shield · 3) braced (held) | hit (cells 4–6): 1) struck: jolts back · 2) recoils, flinching · 3) steadies
Row 5 — death (6 frames, last frame held): 1) struck a final time · 2) staggers back · 3) legs buckle · 4) falls · 5) hits the ground · 6) lying still on the ground (held: the body stays on the battlefield)
Row 6 — victory (6 frames, loops): 1) begins a triumphant gesture · 2) raises weapon, head or wings high · 3) peak of the gesture · 4) holds · 5) lowers slightly · 6) raises again (loops into frame 2)
Row 7 — takeoff (cells 1–3): 1) crouches, wings rising · 2) first downbeat, feet leave the ground · 3) hovering at flight height | landing (cells 4–6): 1) hovering, wings spread to brake · 2) touchdown, legs absorbing the landing · 3) standing, wings folding
Row 8 — fly (6 frames, loops): 1) wings up · 2) downbeat · 3) wings down · 4) upstroke · 5) wings level · 6) wings rising (loops)
In every frame: the exact same Camazotz, same size, same anatomy, armour, equipment, materials and lighting; it faces right; its feet stand on the cell's ground line at 90% of the cell height, centred in the cell (airborne frames hover about 15% of the cell height above that line); it stands about 63% of the cell height tall.
Fixed elevated side / three-quarter strategy-game camera (about 20° above the horizon), the same in every cell.
Modern high-resolution pre-rendered fantasy strategy-game sprite style. Strong readable silhouette. Moderate detail appropriate for gameplay scale.
Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). No ground, no shadows, no environment, no text.
```

### C · Blood Moon Camazotz — Mesoamerican, tier 5, upgraded form

| Field | Value |
|---|---|
| Sheet file | `sheet.creature.mesoamerican.tier5.upgraded.png` |
| Creature | `mesoamerican_blood_moon_camazotz` · Bat raider · occupies 1 hex · Flight (passive) · Double Retaliation (passive) |
| Rows | 1. idle (6)<br>2. move (6)<br>3. attack (6)<br>4. defend (3) + hit (3)<br>5. death (6)<br>6. victory (6)<br>7. takeoff (3) + landing (3)<br>8. fly (6) |
| Image | 1024 × 1536 px (about 1.6 MP) or larger with the same proportions — 6 columns × 8 rows, cells 171 × 192 px<br>or two parts for sharper frames: `sheet.creature.mesoamerican.tier5.upgraded.part1.png` rows 1–4, 1448 × 1088 px; `sheet.creature.mesoamerican.tier5.upgraded.part2.png` rows 5–8, 1448 × 1088 px |
| Scale | a cell is 2.13 hex widths wide and 2.40 tall; ground line at 90 % of the cell height; the creature stands about 63 % of the cell height |
| Attach | `sheet.creature.mesoamerican.tier5.base.png` (the base form's sheet — same layout and poses); `assets-source/creatures/reference/creature.mesoamerican.tier5.upgraded.ref.threequarter.png` (canonical master — Group A first); `support images/ChatGPT Image Sep 29, 2026, 03_35_45 PM-6.png` |
| Cuts into | 10 strips: `sprite.creature.mesoamerican.tier5.upgraded.idle.png`, `sprite.creature.mesoamerican.tier5.upgraded.move.png`, `sprite.creature.mesoamerican.tier5.upgraded.attack.png`, `sprite.creature.mesoamerican.tier5.upgraded.defend.png`, `sprite.creature.mesoamerican.tier5.upgraded.hit.png`, `sprite.creature.mesoamerican.tier5.upgraded.death.png`, `sprite.creature.mesoamerican.tier5.upgraded.victory.png`, `sprite.creature.mesoamerican.tier5.upgraded.takeoff.png`, `sprite.creature.mesoamerican.tier5.upgraded.landing.png`, `sprite.creature.mesoamerican.tier5.upgraded.fly.png` |
| Status | idle placeholder, move placeholder, attack placeholder, defend placeholder, hit placeholder, death placeholder, victory placeholder, takeoff placeholder, landing placeholder, fly placeholder |

```text
Using the attached animation sheet of Camazotz and the canonical reference of Blood Moon Camazotz, create the same animation sheet for Blood Moon Camazotz, its upgraded form, for Pantheon Realms.
Keep the attached sheet's layout, every frame's pose, timing, camera, scale and place in its cell; change only the creature design to the upgraded form.
The creature: Blood Moon Camazotz — A crimson-winged bat spirit silhouetted against a red moon.
Image 1024 × 1536 px (or larger, same proportions): an invisible grid of 6 columns × 8 rows of equal cells, each cell 2.13 hex widths wide. No grid lines, no borders, no labels, no numbers, no text. Every item stays inside its own cell with clear empty space around it; nothing touches or crosses a cell edge.
Each row is one animation; its frames run left to right:
Row 1 — idle (6 frames, loops): 1) neutral stance · 2) breathing in, chest rising · 3) breath held, weight shifts slightly forward · 4) small head turn · 5) breathing out, chest sinking · 6) settling back to neutral (loops into frame 1)
Row 2 — move (6 frames, loops): 1) right foot forward, heel down · 2) weight on the right foot · 3) left leg passing · 4) left foot forward, heel down · 5) weight on the left foot · 6) right leg passing (loops)
Row 3 — attack (6 frames): 1) ready stance · 2) anticipation: draws back, coiled · 3) strike: beats its wings once and strikes forward with its weapon · 4) impact pose, fully extended · 5) follow-through · 6) recovering to the ready stance
Row 4 — defend (cells 1–3): 1) ready stance · 2) folds its wings forward like a shield · 3) braced (held) | hit (cells 4–6): 1) struck: jolts back · 2) recoils, flinching · 3) steadies
Row 5 — death (6 frames, last frame held): 1) struck a final time · 2) staggers back · 3) legs buckle · 4) falls · 5) hits the ground · 6) lying still on the ground (held: the body stays on the battlefield)
Row 6 — victory (6 frames, loops): 1) begins a triumphant gesture · 2) raises weapon, head or wings high · 3) peak of the gesture · 4) holds · 5) lowers slightly · 6) raises again (loops into frame 2)
Row 7 — takeoff (cells 1–3): 1) crouches, wings rising · 2) first downbeat, feet leave the ground · 3) hovering at flight height | landing (cells 4–6): 1) hovering, wings spread to brake · 2) touchdown, legs absorbing the landing · 3) standing, wings folding
Row 8 — fly (6 frames, loops): 1) wings up · 2) downbeat · 3) wings down · 4) upstroke · 5) wings level · 6) wings rising (loops)
In every frame: the exact same Blood Moon Camazotz, same size, same anatomy, armour, equipment, materials and lighting; it faces right; its feet stand on the cell's ground line at 90% of the cell height, centred in the cell (airborne frames hover about 15% of the cell height above that line); it stands about 63% of the cell height tall.
Fixed elevated side / three-quarter strategy-game camera (about 20° above the horizon), the same in every cell.
Modern high-resolution pre-rendered fantasy strategy-game sprite style. Strong readable silhouette. Moderate detail appropriate for gameplay scale.
Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). No ground, no shadows, no environment, no text.
```

### C · Xiuhcoatl — Mesoamerican, tier 6, base form

| Field | Value |
|---|---|
| Sheet file | `sheet.creature.mesoamerican.tier6.base.png` |
| Creature | `mesoamerican_xiuhcoatl` · Fire serpent (ranged) · occupies 2 hexes · shoots (range 16) · Shooter (passive) · No Melee Penalty (passive) |
| Rows | 1. idle (6)<br>2. move (6)<br>3. attack (6)<br>4. defend (3) + hit (3)<br>5. death (6)<br>6. victory (6)<br>7. shoot (6) |
| Image | 1424 × 1104 px (about 1.6 MP) or larger with the same proportions — 6 columns × 7 rows, cells 237 × 158 px<br>or two parts for sharper frames: `sheet.creature.mesoamerican.tier6.base.part1.png` rows 1–4, 1880 × 840 px; `sheet.creature.mesoamerican.tier6.base.part2.png` rows 5–7, 2176 × 728 px |
| Scale | a cell is 3.20 hex widths wide and 2.13 tall; ground line at 90 % of the cell height; the creature stands about 67 % of the cell height |
| Attach | `assets-source/creatures/reference/creature.mesoamerican.tier6.base.ref.threequarter.png` (canonical master — Group A first); `support images/ChatGPT Image Sep 29, 2026, 03_35_45 PM-6.png` |
| Cuts into | 8 strips: `sprite.creature.mesoamerican.tier6.base.idle.png`, `sprite.creature.mesoamerican.tier6.base.move.png`, `sprite.creature.mesoamerican.tier6.base.attack.png`, `sprite.creature.mesoamerican.tier6.base.defend.png`, `sprite.creature.mesoamerican.tier6.base.hit.png`, `sprite.creature.mesoamerican.tier6.base.death.png`, `sprite.creature.mesoamerican.tier6.base.victory.png`, `sprite.creature.mesoamerican.tier6.base.shoot.png` |
| Status | idle placeholder, move placeholder, attack placeholder, defend placeholder, hit placeholder, death placeholder, victory placeholder, shoot placeholder |

```text
Using the attached canonical reference of Xiuhcoatl, create one animation sheet for Pantheon Realms.
The creature: Xiuhcoatl — A turquoise serpent with a flaming, segmented tail and a snout curling upward.
Image 1424 × 1104 px (or larger, same proportions): an invisible grid of 6 columns × 7 rows of equal cells, each cell 3.20 hex widths wide. No grid lines, no borders, no labels, no numbers, no text. Every item stays inside its own cell with clear empty space around it; nothing touches or crosses a cell edge.
Each row is one animation; its frames run left to right:
Row 1 — idle (6 frames, loops): 1) neutral stance · 2) breathing in, chest rising · 3) breath held, weight shifts slightly forward · 4) small head turn · 5) breathing out, chest sinking · 6) settling back to neutral (loops into frame 1)
Row 2 — move (6 frames, loops): 1) body curved left · 2) curve travelling back · 3) body straight · 4) body curved right · 5) curve travelling back · 6) body straight (loops)
Row 3 — attack (6 frames): 1) ready stance · 2) anticipation: draws back, coiled · 3) strike: rears back and strikes forward with its jaws · 4) impact pose, fully extended · 5) follow-through · 6) recovering to the ready stance
Row 4 — defend (cells 1–3): 1) ready stance · 2) coils tightly and lowers its head · 3) braced (held) | hit (cells 4–6): 1) struck: jolts back · 2) recoils, flinching · 3) steadies
Row 5 — death (6 frames, last frame held): 1) struck a final time · 2) staggers back · 3) legs buckle · 4) falls · 5) hits the ground · 6) lying still on the ground (held: the body stays on the battlefield)
Row 6 — victory (6 frames, loops): 1) begins a triumphant gesture · 2) raises weapon, head or wings high · 3) peak of the gesture · 4) holds · 5) lowers slightly · 6) raises again (loops into frame 2)
Row 7 — shoot (6 frames): 1) ready stance · 2) draws or winds up, aiming · 3) release: makes its ranged attack with the weapon shown in the reference · 4) follow-through (the missile has left; the game draws it in flight) · 5) recoil · 6) recovering to the ready stance
In every frame: the exact same Xiuhcoatl, same size, same anatomy, armour, equipment, materials and lighting; it faces right; its feet stand on the cell's ground line at 90% of the cell height, centred in the cell; it stands about 67% of the cell height tall.
Fixed elevated side / three-quarter strategy-game camera (about 20° above the horizon), the same in every cell.
Modern high-resolution pre-rendered fantasy strategy-game sprite style. Strong readable silhouette. Moderate detail appropriate for gameplay scale.
Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). No ground, no shadows, no environment, no text.
```

### C · Divine Xiuhcoatl — Mesoamerican, tier 6, upgraded form

| Field | Value |
|---|---|
| Sheet file | `sheet.creature.mesoamerican.tier6.upgraded.png` |
| Creature | `mesoamerican_divine_xiuhcoatl` · Fire serpent (ranged) · occupies 2 hexes · shoots (range 17) · Shooter (passive) · No Melee Penalty (passive) |
| Rows | 1. idle (6)<br>2. move (6)<br>3. attack (6)<br>4. defend (3) + hit (3)<br>5. death (6)<br>6. victory (6)<br>7. shoot (6) |
| Image | 1424 × 1104 px (about 1.6 MP) or larger with the same proportions — 6 columns × 7 rows, cells 237 × 158 px<br>or two parts for sharper frames: `sheet.creature.mesoamerican.tier6.upgraded.part1.png` rows 1–4, 1880 × 840 px; `sheet.creature.mesoamerican.tier6.upgraded.part2.png` rows 5–7, 2176 × 728 px |
| Scale | a cell is 3.20 hex widths wide and 2.13 tall; ground line at 90 % of the cell height; the creature stands about 70 % of the cell height |
| Attach | `sheet.creature.mesoamerican.tier6.base.png` (the base form's sheet — same layout and poses); `assets-source/creatures/reference/creature.mesoamerican.tier6.upgraded.ref.threequarter.png` (canonical master — Group A first); `support images/ChatGPT Image Sep 29, 2026, 03_35_45 PM-6.png` |
| Cuts into | 8 strips: `sprite.creature.mesoamerican.tier6.upgraded.idle.png`, `sprite.creature.mesoamerican.tier6.upgraded.move.png`, `sprite.creature.mesoamerican.tier6.upgraded.attack.png`, `sprite.creature.mesoamerican.tier6.upgraded.defend.png`, `sprite.creature.mesoamerican.tier6.upgraded.hit.png`, `sprite.creature.mesoamerican.tier6.upgraded.death.png`, `sprite.creature.mesoamerican.tier6.upgraded.victory.png`, `sprite.creature.mesoamerican.tier6.upgraded.shoot.png` |
| Status | idle placeholder, move placeholder, attack placeholder, defend placeholder, hit placeholder, death placeholder, victory placeholder, shoot placeholder |

```text
Using the attached animation sheet of Xiuhcoatl and the canonical reference of Divine Xiuhcoatl, create the same animation sheet for Divine Xiuhcoatl, its upgraded form, for Pantheon Realms.
Keep the attached sheet's layout, every frame's pose, timing, camera, scale and place in its cell; change only the creature design to the upgraded form.
The creature: Divine Xiuhcoatl — A blazing blue-and-gold serpent wreathed in a corona of fire.
Image 1424 × 1104 px (or larger, same proportions): an invisible grid of 6 columns × 7 rows of equal cells, each cell 3.20 hex widths wide. No grid lines, no borders, no labels, no numbers, no text. Every item stays inside its own cell with clear empty space around it; nothing touches or crosses a cell edge.
Each row is one animation; its frames run left to right:
Row 1 — idle (6 frames, loops): 1) neutral stance · 2) breathing in, chest rising · 3) breath held, weight shifts slightly forward · 4) small head turn · 5) breathing out, chest sinking · 6) settling back to neutral (loops into frame 1)
Row 2 — move (6 frames, loops): 1) body curved left · 2) curve travelling back · 3) body straight · 4) body curved right · 5) curve travelling back · 6) body straight (loops)
Row 3 — attack (6 frames): 1) ready stance · 2) anticipation: draws back, coiled · 3) strike: rears back and strikes forward with its jaws · 4) impact pose, fully extended · 5) follow-through · 6) recovering to the ready stance
Row 4 — defend (cells 1–3): 1) ready stance · 2) coils tightly and lowers its head · 3) braced (held) | hit (cells 4–6): 1) struck: jolts back · 2) recoils, flinching · 3) steadies
Row 5 — death (6 frames, last frame held): 1) struck a final time · 2) staggers back · 3) legs buckle · 4) falls · 5) hits the ground · 6) lying still on the ground (held: the body stays on the battlefield)
Row 6 — victory (6 frames, loops): 1) begins a triumphant gesture · 2) raises weapon, head or wings high · 3) peak of the gesture · 4) holds · 5) lowers slightly · 6) raises again (loops into frame 2)
Row 7 — shoot (6 frames): 1) ready stance · 2) draws or winds up, aiming · 3) release: makes its ranged attack with the weapon shown in the reference · 4) follow-through (the missile has left; the game draws it in flight) · 5) recoil · 6) recovering to the ready stance
In every frame: the exact same Divine Xiuhcoatl, same size, same anatomy, armour, equipment, materials and lighting; it faces right; its feet stand on the cell's ground line at 90% of the cell height, centred in the cell; it stands about 70% of the cell height tall.
Fixed elevated side / three-quarter strategy-game camera (about 20° above the horizon), the same in every cell.
Modern high-resolution pre-rendered fantasy strategy-game sprite style. Strong readable silhouette. Moderate detail appropriate for gameplay scale.
Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). No ground, no shadows, no environment, no text.
```

### C · Stone Colossus — Mesoamerican, tier 7, base form

| Field | Value |
|---|---|
| Sheet file | `sheet.creature.mesoamerican.tier7.base.png` |
| Creature | `mesoamerican_stone_colossus` · Apex guardian · occupies 2 hexes · Unyielding (passive) · Charge Guard (passive) |
| Rows | 1. idle (6)<br>2. move (6)<br>3. attack (6)<br>4. defend (3) + hit (3)<br>5. death (6)<br>6. victory (6) |
| Image | 1416 × 1112 px (about 1.6 MP) or larger with the same proportions — 6 columns × 6 rows, cells 236 × 185 px |
| Scale | a cell is 3.20 hex widths wide and 2.50 tall; ground line at 90 % of the cell height; the creature stands about 75 % of the cell height |
| Attach | `assets-source/creatures/reference/creature.mesoamerican.tier7.base.ref.threequarter.png` (canonical master — Group A first); `support images/ChatGPT Image Sep 29, 2026, 03_35_45 PM-6.png` |
| Cuts into | 7 strips: `sprite.creature.mesoamerican.tier7.base.idle.png`, `sprite.creature.mesoamerican.tier7.base.move.png`, `sprite.creature.mesoamerican.tier7.base.attack.png`, `sprite.creature.mesoamerican.tier7.base.defend.png`, `sprite.creature.mesoamerican.tier7.base.hit.png`, `sprite.creature.mesoamerican.tier7.base.death.png`, `sprite.creature.mesoamerican.tier7.base.victory.png` |
| Status | idle placeholder, move placeholder, attack placeholder, defend placeholder, hit placeholder, death placeholder, victory placeholder |

```text
Using the attached canonical reference of Stone Colossus, create one animation sheet for Pantheon Realms.
The creature: Stone Colossus — A towering basalt warrior statue with a feathered headdress and a stone shield.
Image 1416 × 1112 px (or larger, same proportions): an invisible grid of 6 columns × 6 rows of equal cells, each cell 3.20 hex widths wide. No grid lines, no borders, no labels, no numbers, no text. Every item stays inside its own cell with clear empty space around it; nothing touches or crosses a cell edge.
Each row is one animation; its frames run left to right:
Row 1 — idle (6 frames, loops): 1) neutral stance · 2) breathing in, chest rising · 3) breath held, weight shifts slightly forward · 4) small head turn · 5) breathing out, chest sinking · 6) settling back to neutral (loops into frame 1)
Row 2 — move (6 frames, loops): 1) right foot forward, heel down · 2) weight on the right foot · 3) left leg passing · 4) left foot forward, heel down · 5) weight on the left foot · 6) right leg passing (loops)
Row 3 — attack (6 frames): 1) ready stance · 2) anticipation: draws back, coiled · 3) strike: swings a massive arm in a crushing blow · 4) impact pose, fully extended · 5) follow-through · 6) recovering to the ready stance
Row 4 — defend (cells 1–3): 1) ready stance · 2) lowers its head and braces · 3) braced (held) | hit (cells 4–6): 1) struck: jolts back · 2) recoils, flinching · 3) steadies
Row 5 — death (6 frames, last frame held): 1) struck a final time · 2) staggers back · 3) legs buckle · 4) falls · 5) hits the ground · 6) lying still on the ground (held: the body stays on the battlefield)
Row 6 — victory (6 frames, loops): 1) begins a triumphant gesture · 2) raises weapon, head or wings high · 3) peak of the gesture · 4) holds · 5) lowers slightly · 6) raises again (loops into frame 2)
In every frame: the exact same Stone Colossus, same size, same anatomy, armour, equipment, materials and lighting; it faces right; its feet stand on the cell's ground line at 90% of the cell height, centred in the cell; it stands about 75% of the cell height tall.
Fixed elevated side / three-quarter strategy-game camera (about 20° above the horizon), the same in every cell.
Modern high-resolution pre-rendered fantasy strategy-game sprite style. Strong readable silhouette. Moderate detail appropriate for gameplay scale.
Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). No ground, no shadows, no environment, no text.
```

### C · Sun Colossus — Mesoamerican, tier 7, upgraded form

| Field | Value |
|---|---|
| Sheet file | `sheet.creature.mesoamerican.tier7.upgraded.png` |
| Creature | `mesoamerican_sun_colossus` · Apex guardian · occupies 2 hexes · Unyielding (passive) · Charge Guard (passive) · Unlimited Retaliation (passive) |
| Rows | 1. idle (6)<br>2. move (6)<br>3. attack (6)<br>4. defend (3) + hit (3)<br>5. death (6)<br>6. victory (6) |
| Image | 1392 × 1128 px (about 1.6 MP) or larger with the same proportions — 6 columns × 6 rows, cells 232 × 188 px |
| Scale | a cell is 3.20 hex widths wide and 2.60 tall; ground line at 90 % of the cell height; the creature stands about 75 % of the cell height |
| Attach | `sheet.creature.mesoamerican.tier7.base.png` (the base form's sheet — same layout and poses); `assets-source/creatures/reference/creature.mesoamerican.tier7.upgraded.ref.threequarter.png` (canonical master — Group A first); `support images/ChatGPT Image Sep 29, 2026, 03_35_45 PM-6.png` |
| Cuts into | 7 strips: `sprite.creature.mesoamerican.tier7.upgraded.idle.png`, `sprite.creature.mesoamerican.tier7.upgraded.move.png`, `sprite.creature.mesoamerican.tier7.upgraded.attack.png`, `sprite.creature.mesoamerican.tier7.upgraded.defend.png`, `sprite.creature.mesoamerican.tier7.upgraded.hit.png`, `sprite.creature.mesoamerican.tier7.upgraded.death.png`, `sprite.creature.mesoamerican.tier7.upgraded.victory.png` |
| Status | idle placeholder, move placeholder, attack placeholder, defend placeholder, hit placeholder, death placeholder, victory placeholder |

```text
Using the attached animation sheet of Stone Colossus and the canonical reference of Sun Colossus, create the same animation sheet for Sun Colossus, its upgraded form, for Pantheon Realms.
Keep the attached sheet's layout, every frame's pose, timing, camera, scale and place in its cell; change only the creature design to the upgraded form.
The creature: Sun Colossus — A colossal statue with glowing gold glyphs and a sun-disc on its chest.
Image 1392 × 1128 px (or larger, same proportions): an invisible grid of 6 columns × 6 rows of equal cells, each cell 3.20 hex widths wide. No grid lines, no borders, no labels, no numbers, no text. Every item stays inside its own cell with clear empty space around it; nothing touches or crosses a cell edge.
Each row is one animation; its frames run left to right:
Row 1 — idle (6 frames, loops): 1) neutral stance · 2) breathing in, chest rising · 3) breath held, weight shifts slightly forward · 4) small head turn · 5) breathing out, chest sinking · 6) settling back to neutral (loops into frame 1)
Row 2 — move (6 frames, loops): 1) right foot forward, heel down · 2) weight on the right foot · 3) left leg passing · 4) left foot forward, heel down · 5) weight on the left foot · 6) right leg passing (loops)
Row 3 — attack (6 frames): 1) ready stance · 2) anticipation: draws back, coiled · 3) strike: swings a massive arm in a crushing blow · 4) impact pose, fully extended · 5) follow-through · 6) recovering to the ready stance
Row 4 — defend (cells 1–3): 1) ready stance · 2) lowers its head and braces · 3) braced (held) | hit (cells 4–6): 1) struck: jolts back · 2) recoils, flinching · 3) steadies
Row 5 — death (6 frames, last frame held): 1) struck a final time · 2) staggers back · 3) legs buckle · 4) falls · 5) hits the ground · 6) lying still on the ground (held: the body stays on the battlefield)
Row 6 — victory (6 frames, loops): 1) begins a triumphant gesture · 2) raises weapon, head or wings high · 3) peak of the gesture · 4) holds · 5) lowers slightly · 6) raises again (loops into frame 2)
In every frame: the exact same Sun Colossus, same size, same anatomy, armour, equipment, materials and lighting; it faces right; its feet stand on the cell's ground line at 90% of the cell height, centred in the cell; it stands about 75% of the cell height tall.
Fixed elevated side / three-quarter strategy-game camera (about 20° above the horizon), the same in every cell.
Modern high-resolution pre-rendered fantasy strategy-game sprite style. Strong readable silhouette. Moderate detail appropriate for gameplay scale.
Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). No ground, no shadows, no environment, no text.
```

### C · Draugr — Norse, tier 1, base form

| Field | Value |
|---|---|
| Sheet file | `sheet.creature.norse.tier1.base.png` |
| Creature | `norse_draugr` · Line infantry · occupies 1 hex |
| Rows | 1. idle (6)<br>2. move (6)<br>3. attack (6)<br>4. defend (3) + hit (3)<br>5. death (6)<br>6. victory (6) |
| Image | 1256 × 1256 px (about 1.6 MP) or larger with the same proportions — 6 columns × 6 rows, cells 209 × 209 px |
| Scale | a cell is 2.13 hex widths wide and 2.13 tall; ground line at 90 % of the cell height; the creature stands about 58 % of the cell height |
| Attach | `assets-source/creatures/reference/creature.norse.tier1.base.ref.threequarter.png` (canonical master); `assets-source/icons/final/creature.norse.tier1.base.portrait.png`; `support images/ChatGPT Image Sep 29, 2026, 03_35_32 PM-2.png` |
| Cuts into | 7 strips: `sprite.creature.norse.tier1.base.idle.png`, `sprite.creature.norse.tier1.base.move.png`, `sprite.creature.norse.tier1.base.attack.png`, `sprite.creature.norse.tier1.base.defend.png`, `sprite.creature.norse.tier1.base.hit.png`, `sprite.creature.norse.tier1.base.death.png`, `sprite.creature.norse.tier1.base.victory.png` |
| Status | idle placeholder, move missing, attack missing, defend missing, hit missing, death missing, victory missing |

```text
Using the attached canonical reference of Draugr, create one animation sheet for Pantheon Realms.
The creature: Draugr — A gaunt warrior in corroded mail and a frost-rimed helmet, holding an axe and round shield.
Image 1256 × 1256 px (or larger, same proportions): an invisible grid of 6 columns × 6 rows of equal cells, each cell 2.13 hex widths wide. No grid lines, no borders, no labels, no numbers, no text. Every item stays inside its own cell with clear empty space around it; nothing touches or crosses a cell edge.
Each row is one animation; its frames run left to right:
Row 1 — idle (6 frames, loops): 1) neutral stance · 2) breathing in, chest rising · 3) breath held, weight shifts slightly forward · 4) small head turn · 5) breathing out, chest sinking · 6) settling back to neutral (loops into frame 1)
Row 2 — move (6 frames, loops): 1) drifting forward, robes trailing · 2) rising slightly · 3) gliding · 4) sinking slightly · 5) drifting forward · 6) gliding (loops)
Row 3 — attack (6 frames): 1) ready stance · 2) anticipation: draws back, coiled · 3) strike: surges forward and rakes with spectral hands or claws · 4) impact pose, fully extended · 5) follow-through · 6) recovering to the ready stance
Row 4 — defend (cells 1–3): 1) ready stance · 2) lowers its head and braces · 3) braced (held) | hit (cells 4–6): 1) struck: jolts back · 2) recoils, flinching · 3) steadies
Row 5 — death (6 frames, last frame held): 1) struck a final time · 2) staggers back · 3) legs buckle · 4) falls · 5) hits the ground · 6) lying still on the ground (held: the body stays on the battlefield)
Row 6 — victory (6 frames, loops): 1) begins a triumphant gesture · 2) raises weapon, head or wings high · 3) peak of the gesture · 4) holds · 5) lowers slightly · 6) raises again (loops into frame 2)
In every frame: the exact same Draugr, same size, same anatomy, armour, equipment, materials and lighting; it faces right; its feet stand on the cell's ground line at 90% of the cell height, centred in the cell; it stands about 58% of the cell height tall.
Fixed elevated side / three-quarter strategy-game camera (about 20° above the horizon), the same in every cell.
Modern high-resolution pre-rendered fantasy strategy-game sprite style. Strong readable silhouette. Moderate detail appropriate for gameplay scale.
Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). No ground, no shadows, no environment, no text.
```

### C · Deathless Draugr — Norse, tier 1, upgraded form

| Field | Value |
|---|---|
| Sheet file | `sheet.creature.norse.tier1.upgraded.png` |
| Creature | `norse_deathless_draugr` · Line infantry · occupies 1 hex · Unyielding (passive) |
| Rows | 1. idle (6)<br>2. move (6)<br>3. attack (6)<br>4. defend (3) + hit (3)<br>5. death (6)<br>6. victory (6) |
| Image | 1256 × 1256 px (about 1.6 MP) or larger with the same proportions — 6 columns × 6 rows, cells 209 × 209 px |
| Scale | a cell is 2.13 hex widths wide and 2.13 tall; ground line at 90 % of the cell height; the creature stands about 61 % of the cell height |
| Attach | `sheet.creature.norse.tier1.base.png` (the base form's sheet — same layout and poses); `assets-source/creatures/reference/creature.norse.tier1.upgraded.ref.threequarter.png` (canonical master); `assets-source/icons/final/creature.norse.tier1.upgraded.portrait.png`; `support images/ChatGPT Image Sep 29, 2026, 03_35_32 PM-2.png` |
| Cuts into | 7 strips: `sprite.creature.norse.tier1.upgraded.idle.png`, `sprite.creature.norse.tier1.upgraded.move.png`, `sprite.creature.norse.tier1.upgraded.attack.png`, `sprite.creature.norse.tier1.upgraded.defend.png`, `sprite.creature.norse.tier1.upgraded.hit.png`, `sprite.creature.norse.tier1.upgraded.death.png`, `sprite.creature.norse.tier1.upgraded.victory.png` |
| Status | idle placeholder, move missing, attack missing, defend missing, hit missing, death missing, victory missing |

```text
Using the attached animation sheet of Draugr and the canonical reference of Deathless Draugr, create the same animation sheet for Deathless Draugr, its upgraded form, for Pantheon Realms.
Keep the attached sheet's layout, every frame's pose, timing, camera, scale and place in its cell; change only the creature design to the upgraded form.
The creature: Deathless Draugr — A draugr with rune-etched armor plates, glowing blue eyes and a notched longaxe.
Image 1256 × 1256 px (or larger, same proportions): an invisible grid of 6 columns × 6 rows of equal cells, each cell 2.13 hex widths wide. No grid lines, no borders, no labels, no numbers, no text. Every item stays inside its own cell with clear empty space around it; nothing touches or crosses a cell edge.
Each row is one animation; its frames run left to right:
Row 1 — idle (6 frames, loops): 1) neutral stance · 2) breathing in, chest rising · 3) breath held, weight shifts slightly forward · 4) small head turn · 5) breathing out, chest sinking · 6) settling back to neutral (loops into frame 1)
Row 2 — move (6 frames, loops): 1) drifting forward, robes trailing · 2) rising slightly · 3) gliding · 4) sinking slightly · 5) drifting forward · 6) gliding (loops)
Row 3 — attack (6 frames): 1) ready stance · 2) anticipation: draws back, coiled · 3) strike: surges forward and rakes with spectral hands or claws · 4) impact pose, fully extended · 5) follow-through · 6) recovering to the ready stance
Row 4 — defend (cells 1–3): 1) ready stance · 2) lowers its head and braces · 3) braced (held) | hit (cells 4–6): 1) struck: jolts back · 2) recoils, flinching · 3) steadies
Row 5 — death (6 frames, last frame held): 1) struck a final time · 2) staggers back · 3) legs buckle · 4) falls · 5) hits the ground · 6) lying still on the ground (held: the body stays on the battlefield)
Row 6 — victory (6 frames, loops): 1) begins a triumphant gesture · 2) raises weapon, head or wings high · 3) peak of the gesture · 4) holds · 5) lowers slightly · 6) raises again (loops into frame 2)
In every frame: the exact same Deathless Draugr, same size, same anatomy, armour, equipment, materials and lighting; it faces right; its feet stand on the cell's ground line at 90% of the cell height, centred in the cell; it stands about 61% of the cell height tall.
Fixed elevated side / three-quarter strategy-game camera (about 20° above the horizon), the same in every cell.
Modern high-resolution pre-rendered fantasy strategy-game sprite style. Strong readable silhouette. Moderate detail appropriate for gameplay scale.
Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). No ground, no shadows, no environment, no text.
```

### C · Frost Wolf — Norse, tier 2, base form

| Field | Value |
|---|---|
| Sheet file | `sheet.creature.norse.tier2.base.png` |
| Creature | `norse_frost_wolf` · Fast flanker · occupies 1 hex · Charge (passive) |
| Rows | 1. idle (6)<br>2. move (6)<br>3. attack (6)<br>4. defend (3) + hit (3)<br>5. death (6)<br>6. victory (6) |
| Image | 1256 × 1256 px (about 1.6 MP) or larger with the same proportions — 6 columns × 6 rows, cells 209 × 209 px |
| Scale | a cell is 2.13 hex widths wide and 2.13 tall; ground line at 90 % of the cell height; the creature stands about 44 % of the cell height |
| Attach | `assets-source/creatures/reference/creature.norse.tier2.base.ref.threequarter.png` (canonical master); `assets-source/icons/final/creature.norse.tier2.base.portrait.png`; `support images/ChatGPT Image Sep 29, 2026, 03_35_32 PM-2.png` |
| Cuts into | 7 strips: `sprite.creature.norse.tier2.base.idle.png`, `sprite.creature.norse.tier2.base.move.png`, `sprite.creature.norse.tier2.base.attack.png`, `sprite.creature.norse.tier2.base.defend.png`, `sprite.creature.norse.tier2.base.hit.png`, `sprite.creature.norse.tier2.base.death.png`, `sprite.creature.norse.tier2.base.victory.png` |
| Status | idle placeholder, move missing, attack missing, defend missing, hit missing, death missing, victory missing |

```text
Using the attached canonical reference of Frost Wolf, create one animation sheet for Pantheon Realms.
The creature: Frost Wolf — A large white-grey wolf with frost on its muzzle and pale blue eyes.
Image 1256 × 1256 px (or larger, same proportions): an invisible grid of 6 columns × 6 rows of equal cells, each cell 2.13 hex widths wide. No grid lines, no borders, no labels, no numbers, no text. Every item stays inside its own cell with clear empty space around it; nothing touches or crosses a cell edge.
Each row is one animation; its frames run left to right:
Row 1 — idle (6 frames, loops): 1) neutral stance · 2) breathing in, chest rising · 3) breath held, weight shifts slightly forward · 4) small head turn · 5) breathing out, chest sinking · 6) settling back to neutral (loops into frame 1)
Row 2 — move (6 frames, loops): 1) front left foot down · 2) pushing off · 3) legs gathered · 4) front right foot down · 5) pushing off · 6) legs stretched (loops)
Row 3 — attack (6 frames): 1) ready stance · 2) anticipation: draws back, coiled · 3) strike: lunges forward and bites, claws raking · 4) impact pose, fully extended · 5) follow-through · 6) recovering to the ready stance
Row 4 — defend (cells 1–3): 1) ready stance · 2) lowers its head and braces · 3) braced (held) | hit (cells 4–6): 1) struck: jolts back · 2) recoils, flinching · 3) steadies
Row 5 — death (6 frames, last frame held): 1) struck a final time · 2) staggers back · 3) legs buckle · 4) falls · 5) hits the ground · 6) lying still on the ground (held: the body stays on the battlefield)
Row 6 — victory (6 frames, loops): 1) begins a triumphant gesture · 2) raises weapon, head or wings high · 3) peak of the gesture · 4) holds · 5) lowers slightly · 6) raises again (loops into frame 2)
In every frame: the exact same Frost Wolf, same size, same anatomy, armour, equipment, materials and lighting; it faces right; its feet stand on the cell's ground line at 90% of the cell height, centred in the cell; it stands about 44% of the cell height tall.
Fixed elevated side / three-quarter strategy-game camera (about 20° above the horizon), the same in every cell.
Modern high-resolution pre-rendered fantasy strategy-game sprite style. Strong readable silhouette. Moderate detail appropriate for gameplay scale.
Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). No ground, no shadows, no environment, no text.
```

### C · Fenrir Wolf — Norse, tier 2, upgraded form

| Field | Value |
|---|---|
| Sheet file | `sheet.creature.norse.tier2.upgraded.png` |
| Creature | `norse_fenrir_wolf` · Fast flanker · occupies 1 hex · Charge (passive) |
| Rows | 1. idle (6)<br>2. move (6)<br>3. attack (6)<br>4. defend (3) + hit (3)<br>5. death (6)<br>6. victory (6) |
| Image | 1256 × 1256 px (about 1.6 MP) or larger with the same proportions — 6 columns × 6 rows, cells 209 × 209 px |
| Scale | a cell is 2.13 hex widths wide and 2.13 tall; ground line at 90 % of the cell height; the creature stands about 46 % of the cell height |
| Attach | `sheet.creature.norse.tier2.base.png` (the base form's sheet — same layout and poses); `assets-source/creatures/reference/creature.norse.tier2.upgraded.ref.threequarter.png` (canonical master); `assets-source/icons/final/creature.norse.tier2.upgraded.portrait.png`; `support images/ChatGPT Image Sep 29, 2026, 03_35_32 PM-2.png` |
| Cuts into | 7 strips: `sprite.creature.norse.tier2.upgraded.idle.png`, `sprite.creature.norse.tier2.upgraded.move.png`, `sprite.creature.norse.tier2.upgraded.attack.png`, `sprite.creature.norse.tier2.upgraded.defend.png`, `sprite.creature.norse.tier2.upgraded.hit.png`, `sprite.creature.norse.tier2.upgraded.death.png`, `sprite.creature.norse.tier2.upgraded.victory.png` |
| Status | idle placeholder, move missing, attack missing, defend missing, hit missing, death missing, victory missing |

```text
Using the attached animation sheet of Frost Wolf and the canonical reference of Fenrir Wolf, create the same animation sheet for Fenrir Wolf, its upgraded form, for Pantheon Realms.
Keep the attached sheet's layout, every frame's pose, timing, camera, scale and place in its cell; change only the creature design to the upgraded form.
The creature: Fenrir Wolf — A massive dark-grey wolf with a broken chain collar and a scarred muzzle.
Image 1256 × 1256 px (or larger, same proportions): an invisible grid of 6 columns × 6 rows of equal cells, each cell 2.13 hex widths wide. No grid lines, no borders, no labels, no numbers, no text. Every item stays inside its own cell with clear empty space around it; nothing touches or crosses a cell edge.
Each row is one animation; its frames run left to right:
Row 1 — idle (6 frames, loops): 1) neutral stance · 2) breathing in, chest rising · 3) breath held, weight shifts slightly forward · 4) small head turn · 5) breathing out, chest sinking · 6) settling back to neutral (loops into frame 1)
Row 2 — move (6 frames, loops): 1) front left foot down · 2) pushing off · 3) legs gathered · 4) front right foot down · 5) pushing off · 6) legs stretched (loops)
Row 3 — attack (6 frames): 1) ready stance · 2) anticipation: draws back, coiled · 3) strike: lunges forward and bites, claws raking · 4) impact pose, fully extended · 5) follow-through · 6) recovering to the ready stance
Row 4 — defend (cells 1–3): 1) ready stance · 2) lowers its head and braces · 3) braced (held) | hit (cells 4–6): 1) struck: jolts back · 2) recoils, flinching · 3) steadies
Row 5 — death (6 frames, last frame held): 1) struck a final time · 2) staggers back · 3) legs buckle · 4) falls · 5) hits the ground · 6) lying still on the ground (held: the body stays on the battlefield)
Row 6 — victory (6 frames, loops): 1) begins a triumphant gesture · 2) raises weapon, head or wings high · 3) peak of the gesture · 4) holds · 5) lowers slightly · 6) raises again (loops into frame 2)
In every frame: the exact same Fenrir Wolf, same size, same anatomy, armour, equipment, materials and lighting; it faces right; its feet stand on the cell's ground line at 90% of the cell height, centred in the cell; it stands about 46% of the cell height tall.
Fixed elevated side / three-quarter strategy-game camera (about 20° above the horizon), the same in every cell.
Modern high-resolution pre-rendered fantasy strategy-game sprite style. Strong readable silhouette. Moderate detail appropriate for gameplay scale.
Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). No ground, no shadows, no environment, no text.
```

### C · Frost Troll — Norse, tier 3, base form

| Field | Value |
|---|---|
| Sheet file | `sheet.creature.norse.tier3.base.png` |
| Creature | `norse_frost_troll` · Bruiser · occupies 2 hexes · Charge Guard (passive) |
| Rows | 1. idle (6)<br>2. move (6)<br>3. attack (6)<br>4. defend (3) + hit (3)<br>5. death (6)<br>6. victory (6) |
| Image | 1416 × 1112 px (about 1.6 MP) or larger with the same proportions — 6 columns × 6 rows, cells 236 × 185 px |
| Scale | a cell is 3.20 hex widths wide and 2.50 tall; ground line at 90 % of the cell height; the creature stands about 75 % of the cell height |
| Attach | `assets-source/creatures/reference/creature.norse.tier3.base.ref.threequarter.png` (canonical master); `assets-source/icons/final/creature.norse.tier3.base.portrait.png`; `support images/ChatGPT Image Sep 29, 2026, 03_35_32 PM-2.png` |
| Cuts into | 7 strips: `sprite.creature.norse.tier3.base.idle.png`, `sprite.creature.norse.tier3.base.move.png`, `sprite.creature.norse.tier3.base.attack.png`, `sprite.creature.norse.tier3.base.defend.png`, `sprite.creature.norse.tier3.base.hit.png`, `sprite.creature.norse.tier3.base.death.png`, `sprite.creature.norse.tier3.base.victory.png` |
| Status | idle placeholder, move missing, attack missing, defend missing, hit missing, death missing, victory missing |

```text
Using the attached canonical reference of Frost Troll, create one animation sheet for Pantheon Realms.
The creature: Frost Troll — A hulking blue-grey troll with icicles in its beard and a stone club.
Image 1416 × 1112 px (or larger, same proportions): an invisible grid of 6 columns × 6 rows of equal cells, each cell 3.20 hex widths wide. No grid lines, no borders, no labels, no numbers, no text. Every item stays inside its own cell with clear empty space around it; nothing touches or crosses a cell edge.
Each row is one animation; its frames run left to right:
Row 1 — idle (6 frames, loops): 1) neutral stance · 2) breathing in, chest rising · 3) breath held, weight shifts slightly forward · 4) small head turn · 5) breathing out, chest sinking · 6) settling back to neutral (loops into frame 1)
Row 2 — move (6 frames, loops): 1) right foot forward, heel down · 2) weight on the right foot · 3) left leg passing · 4) left foot forward, heel down · 5) weight on the left foot · 6) right leg passing (loops)
Row 3 — attack (6 frames): 1) ready stance · 2) anticipation: draws back, coiled · 3) strike: smashes down with its weapon or fists · 4) impact pose, fully extended · 5) follow-through · 6) recovering to the ready stance
Row 4 — defend (cells 1–3): 1) ready stance · 2) lowers its head and braces · 3) braced (held) | hit (cells 4–6): 1) struck: jolts back · 2) recoils, flinching · 3) steadies
Row 5 — death (6 frames, last frame held): 1) struck a final time · 2) staggers back · 3) legs buckle · 4) falls · 5) hits the ground · 6) lying still on the ground (held: the body stays on the battlefield)
Row 6 — victory (6 frames, loops): 1) begins a triumphant gesture · 2) raises weapon, head or wings high · 3) peak of the gesture · 4) holds · 5) lowers slightly · 6) raises again (loops into frame 2)
In every frame: the exact same Frost Troll, same size, same anatomy, armour, equipment, materials and lighting; it faces right; its feet stand on the cell's ground line at 90% of the cell height, centred in the cell; it stands about 75% of the cell height tall.
Fixed elevated side / three-quarter strategy-game camera (about 20° above the horizon), the same in every cell.
Modern high-resolution pre-rendered fantasy strategy-game sprite style. Strong readable silhouette. Moderate detail appropriate for gameplay scale.
Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). No ground, no shadows, no environment, no text.
```

### C · Ancient Frost Troll — Norse, tier 3, upgraded form

| Field | Value |
|---|---|
| Sheet file | `sheet.creature.norse.tier3.upgraded.png` |
| Creature | `norse_ancient_frost_troll` · Bruiser · occupies 2 hexes · Charge Guard (passive) |
| Rows | 1. idle (6)<br>2. move (6)<br>3. attack (6)<br>4. defend (3) + hit (3)<br>5. death (6)<br>6. victory (6) |
| Image | 1392 × 1128 px (about 1.6 MP) or larger with the same proportions — 6 columns × 6 rows, cells 232 × 188 px |
| Scale | a cell is 3.20 hex widths wide and 2.60 tall; ground line at 90 % of the cell height; the creature stands about 75 % of the cell height |
| Attach | `sheet.creature.norse.tier3.base.png` (the base form's sheet — same layout and poses); `assets-source/creatures/reference/creature.norse.tier3.upgraded.ref.threequarter.png` (canonical master); `assets-source/icons/final/creature.norse.tier3.upgraded.portrait.png`; `support images/ChatGPT Image Sep 29, 2026, 03_35_32 PM-2.png` |
| Cuts into | 7 strips: `sprite.creature.norse.tier3.upgraded.idle.png`, `sprite.creature.norse.tier3.upgraded.move.png`, `sprite.creature.norse.tier3.upgraded.attack.png`, `sprite.creature.norse.tier3.upgraded.defend.png`, `sprite.creature.norse.tier3.upgraded.hit.png`, `sprite.creature.norse.tier3.upgraded.death.png`, `sprite.creature.norse.tier3.upgraded.victory.png` |
| Status | idle placeholder, move missing, attack missing, defend missing, hit missing, death missing, victory missing |

```text
Using the attached animation sheet of Frost Troll and the canonical reference of Ancient Frost Troll, create the same animation sheet for Ancient Frost Troll, its upgraded form, for Pantheon Realms.
Keep the attached sheet's layout, every frame's pose, timing, camera, scale and place in its cell; change only the creature design to the upgraded form.
The creature: Ancient Frost Troll — A towering troll with a crust of blue ice across its back and a boulder-headed club.
Image 1392 × 1128 px (or larger, same proportions): an invisible grid of 6 columns × 6 rows of equal cells, each cell 3.20 hex widths wide. No grid lines, no borders, no labels, no numbers, no text. Every item stays inside its own cell with clear empty space around it; nothing touches or crosses a cell edge.
Each row is one animation; its frames run left to right:
Row 1 — idle (6 frames, loops): 1) neutral stance · 2) breathing in, chest rising · 3) breath held, weight shifts slightly forward · 4) small head turn · 5) breathing out, chest sinking · 6) settling back to neutral (loops into frame 1)
Row 2 — move (6 frames, loops): 1) right foot forward, heel down · 2) weight on the right foot · 3) left leg passing · 4) left foot forward, heel down · 5) weight on the left foot · 6) right leg passing (loops)
Row 3 — attack (6 frames): 1) ready stance · 2) anticipation: draws back, coiled · 3) strike: smashes down with its weapon or fists · 4) impact pose, fully extended · 5) follow-through · 6) recovering to the ready stance
Row 4 — defend (cells 1–3): 1) ready stance · 2) lowers its head and braces · 3) braced (held) | hit (cells 4–6): 1) struck: jolts back · 2) recoils, flinching · 3) steadies
Row 5 — death (6 frames, last frame held): 1) struck a final time · 2) staggers back · 3) legs buckle · 4) falls · 5) hits the ground · 6) lying still on the ground (held: the body stays on the battlefield)
Row 6 — victory (6 frames, loops): 1) begins a triumphant gesture · 2) raises weapon, head or wings high · 3) peak of the gesture · 4) holds · 5) lowers slightly · 6) raises again (loops into frame 2)
In every frame: the exact same Ancient Frost Troll, same size, same anatomy, armour, equipment, materials and lighting; it faces right; its feet stand on the cell's ground line at 90% of the cell height, centred in the cell; it stands about 75% of the cell height tall.
Fixed elevated side / three-quarter strategy-game camera (about 20° above the horizon), the same in every cell.
Modern high-resolution pre-rendered fantasy strategy-game sprite style. Strong readable silhouette. Moderate detail appropriate for gameplay scale.
Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). No ground, no shadows, no environment, no text.
```

### C · Valkyrie — Norse, tier 4, base form

| Field | Value |
|---|---|
| Sheet file | `sheet.creature.norse.tier4.base.png` |
| Creature | `norse_valkyrie` · Flying lancer · occupies 1 hex · Flight (passive) |
| Rows | 1. idle (6)<br>2. move (6)<br>3. attack (6)<br>4. defend (3) + hit (3)<br>5. death (6)<br>6. victory (6)<br>7. takeoff (3) + landing (3)<br>8. fly (6) |
| Image | 1072 × 1472 px (about 1.6 MP) or larger with the same proportions — 6 columns × 8 rows, cells 179 × 184 px<br>or two parts for sharper frames: `sheet.creature.norse.tier4.base.part1.png` rows 1–4, 1512 × 1040 px; `sheet.creature.norse.tier4.base.part2.png` rows 5–8, 1512 × 1040 px |
| Scale | a cell is 2.13 hex widths wide and 2.20 tall; ground line at 90 % of the cell height; the creature stands about 64 % of the cell height |
| Attach | `assets-source/creatures/reference/creature.norse.tier4.base.ref.threequarter.png` (canonical master); `assets-source/icons/final/creature.norse.tier4.base.portrait.png`; `support images/ChatGPT Image Sep 29, 2026, 03_35_32 PM-2.png` |
| Cuts into | 10 strips: `sprite.creature.norse.tier4.base.idle.png`, `sprite.creature.norse.tier4.base.move.png`, `sprite.creature.norse.tier4.base.attack.png`, `sprite.creature.norse.tier4.base.defend.png`, `sprite.creature.norse.tier4.base.hit.png`, `sprite.creature.norse.tier4.base.death.png`, `sprite.creature.norse.tier4.base.victory.png`, `sprite.creature.norse.tier4.base.takeoff.png`, `sprite.creature.norse.tier4.base.landing.png`, `sprite.creature.norse.tier4.base.fly.png` |
| Status | idle placeholder, move missing, attack missing, defend missing, hit missing, death missing, victory missing, takeoff missing, landing missing, fly missing |

```text
Using the attached canonical reference of Valkyrie, create one animation sheet for Pantheon Realms.
The creature: Valkyrie — A winged warrior woman in a silver helm with a spear and round shield.
Image 1072 × 1472 px (or larger, same proportions): an invisible grid of 6 columns × 8 rows of equal cells, each cell 2.13 hex widths wide. No grid lines, no borders, no labels, no numbers, no text. Every item stays inside its own cell with clear empty space around it; nothing touches or crosses a cell edge.
Each row is one animation; its frames run left to right:
Row 1 — idle (6 frames, loops): 1) neutral stance · 2) breathing in, chest rising · 3) breath held, weight shifts slightly forward · 4) small head turn · 5) breathing out, chest sinking · 6) settling back to neutral (loops into frame 1)
Row 2 — move (6 frames, loops): 1) right foot forward, heel down · 2) weight on the right foot · 3) left leg passing · 4) left foot forward, heel down · 5) weight on the left foot · 6) right leg passing (loops)
Row 3 — attack (6 frames): 1) ready stance · 2) anticipation: draws back, coiled · 3) strike: beats its wings once and strikes forward with its weapon · 4) impact pose, fully extended · 5) follow-through · 6) recovering to the ready stance
Row 4 — defend (cells 1–3): 1) ready stance · 2) folds its wings forward like a shield · 3) braced (held) | hit (cells 4–6): 1) struck: jolts back · 2) recoils, flinching · 3) steadies
Row 5 — death (6 frames, last frame held): 1) struck a final time · 2) staggers back · 3) legs buckle · 4) falls · 5) hits the ground · 6) lying still on the ground (held: the body stays on the battlefield)
Row 6 — victory (6 frames, loops): 1) begins a triumphant gesture · 2) raises weapon, head or wings high · 3) peak of the gesture · 4) holds · 5) lowers slightly · 6) raises again (loops into frame 2)
Row 7 — takeoff (cells 1–3): 1) crouches, wings rising · 2) first downbeat, feet leave the ground · 3) hovering at flight height | landing (cells 4–6): 1) hovering, wings spread to brake · 2) touchdown, legs absorbing the landing · 3) standing, wings folding
Row 8 — fly (6 frames, loops): 1) wings up · 2) downbeat · 3) wings down · 4) upstroke · 5) wings level · 6) wings rising (loops)
In every frame: the exact same Valkyrie, same size, same anatomy, armour, equipment, materials and lighting; it faces right; its feet stand on the cell's ground line at 90% of the cell height, centred in the cell (airborne frames hover about 15% of the cell height above that line); it stands about 64% of the cell height tall.
Fixed elevated side / three-quarter strategy-game camera (about 20° above the horizon), the same in every cell.
Modern high-resolution pre-rendered fantasy strategy-game sprite style. Strong readable silhouette. Moderate detail appropriate for gameplay scale.
Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). No ground, no shadows, no environment, no text.
```

### C · Battle Valkyrie — Norse, tier 4, upgraded form

| Field | Value |
|---|---|
| Sheet file | `sheet.creature.norse.tier4.upgraded.png` |
| Creature | `norse_battle_valkyrie` · Flying lancer · occupies 1 hex · Flight (passive) · Double Retaliation (passive) |
| Rows | 1. idle (6)<br>2. move (6)<br>3. attack (6)<br>4. defend (3) + hit (3)<br>5. death (6)<br>6. victory (6)<br>7. takeoff (3) + landing (3)<br>8. fly (6) |
| Image | 1048 × 1504 px (about 1.6 MP) or larger with the same proportions — 6 columns × 8 rows, cells 175 × 188 px<br>or two parts for sharper frames: `sheet.creature.norse.tier4.upgraded.part1.png` rows 1–4, 1480 × 1064 px; `sheet.creature.norse.tier4.upgraded.part2.png` rows 5–8, 1480 × 1064 px |
| Scale | a cell is 2.13 hex widths wide and 2.30 tall; ground line at 90 % of the cell height; the creature stands about 64 % of the cell height |
| Attach | `sheet.creature.norse.tier4.base.png` (the base form's sheet — same layout and poses); `assets-source/creatures/reference/creature.norse.tier4.upgraded.ref.threequarter.png` (canonical master); `assets-source/icons/final/creature.norse.tier4.upgraded.portrait.png`; `support images/ChatGPT Image Sep 29, 2026, 03_35_32 PM-2.png` |
| Cuts into | 10 strips: `sprite.creature.norse.tier4.upgraded.idle.png`, `sprite.creature.norse.tier4.upgraded.move.png`, `sprite.creature.norse.tier4.upgraded.attack.png`, `sprite.creature.norse.tier4.upgraded.defend.png`, `sprite.creature.norse.tier4.upgraded.hit.png`, `sprite.creature.norse.tier4.upgraded.death.png`, `sprite.creature.norse.tier4.upgraded.victory.png`, `sprite.creature.norse.tier4.upgraded.takeoff.png`, `sprite.creature.norse.tier4.upgraded.landing.png`, `sprite.creature.norse.tier4.upgraded.fly.png` |
| Status | idle placeholder, move missing, attack missing, defend missing, hit missing, death missing, victory missing, takeoff missing, landing missing, fly missing |

```text
Using the attached animation sheet of Valkyrie and the canonical reference of Battle Valkyrie, create the same animation sheet for Battle Valkyrie, its upgraded form, for Pantheon Realms.
Keep the attached sheet's layout, every frame's pose, timing, camera, scale and place in its cell; change only the creature design to the upgraded form.
The creature: Battle Valkyrie — A valkyrie in blue-enamelled scale armor with broad white wings and a long spear.
Image 1048 × 1504 px (or larger, same proportions): an invisible grid of 6 columns × 8 rows of equal cells, each cell 2.13 hex widths wide. No grid lines, no borders, no labels, no numbers, no text. Every item stays inside its own cell with clear empty space around it; nothing touches or crosses a cell edge.
Each row is one animation; its frames run left to right:
Row 1 — idle (6 frames, loops): 1) neutral stance · 2) breathing in, chest rising · 3) breath held, weight shifts slightly forward · 4) small head turn · 5) breathing out, chest sinking · 6) settling back to neutral (loops into frame 1)
Row 2 — move (6 frames, loops): 1) right foot forward, heel down · 2) weight on the right foot · 3) left leg passing · 4) left foot forward, heel down · 5) weight on the left foot · 6) right leg passing (loops)
Row 3 — attack (6 frames): 1) ready stance · 2) anticipation: draws back, coiled · 3) strike: beats its wings once and strikes forward with its weapon · 4) impact pose, fully extended · 5) follow-through · 6) recovering to the ready stance
Row 4 — defend (cells 1–3): 1) ready stance · 2) folds its wings forward like a shield · 3) braced (held) | hit (cells 4–6): 1) struck: jolts back · 2) recoils, flinching · 3) steadies
Row 5 — death (6 frames, last frame held): 1) struck a final time · 2) staggers back · 3) legs buckle · 4) falls · 5) hits the ground · 6) lying still on the ground (held: the body stays on the battlefield)
Row 6 — victory (6 frames, loops): 1) begins a triumphant gesture · 2) raises weapon, head or wings high · 3) peak of the gesture · 4) holds · 5) lowers slightly · 6) raises again (loops into frame 2)
Row 7 — takeoff (cells 1–3): 1) crouches, wings rising · 2) first downbeat, feet leave the ground · 3) hovering at flight height | landing (cells 4–6): 1) hovering, wings spread to brake · 2) touchdown, legs absorbing the landing · 3) standing, wings folding
Row 8 — fly (6 frames, loops): 1) wings up · 2) downbeat · 3) wings down · 4) upstroke · 5) wings level · 6) wings rising (loops)
In every frame: the exact same Battle Valkyrie, same size, same anatomy, armour, equipment, materials and lighting; it faces right; its feet stand on the cell's ground line at 90% of the cell height, centred in the cell (airborne frames hover about 15% of the cell height above that line); it stands about 64% of the cell height tall.
Fixed elevated side / three-quarter strategy-game camera (about 20° above the horizon), the same in every cell.
Modern high-resolution pre-rendered fantasy strategy-game sprite style. Strong readable silhouette. Moderate detail appropriate for gameplay scale.
Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). No ground, no shadows, no environment, no text.
```

### C · Lindworm — Norse, tier 5, base form

| Field | Value |
|---|---|
| Sheet file | `sheet.creature.norse.tier5.base.png` |
| Creature | `norse_lindworm` · Ranged breath · occupies 2 hexes · shoots (range 16) · Shooter (passive) |
| Rows | 1. idle (6)<br>2. move (6)<br>3. attack (6)<br>4. defend (3) + hit (3)<br>5. death (6)<br>6. victory (6)<br>7. shoot (6) |
| Image | 1424 × 1104 px (about 1.6 MP) or larger with the same proportions — 6 columns × 7 rows, cells 237 × 158 px<br>or two parts for sharper frames: `sheet.creature.norse.tier5.base.part1.png` rows 1–4, 1880 × 840 px; `sheet.creature.norse.tier5.base.part2.png` rows 5–7, 2176 × 728 px |
| Scale | a cell is 3.20 hex widths wide and 2.13 tall; ground line at 90 % of the cell height; the creature stands about 65 % of the cell height |
| Attach | `assets-source/creatures/reference/creature.norse.tier5.base.ref.threequarter.png` (canonical master); `assets-source/icons/final/creature.norse.tier5.base.portrait.png`; `support images/ChatGPT Image Sep 29, 2026, 03_35_32 PM-2.png` |
| Cuts into | 8 strips: `sprite.creature.norse.tier5.base.idle.png`, `sprite.creature.norse.tier5.base.move.png`, `sprite.creature.norse.tier5.base.attack.png`, `sprite.creature.norse.tier5.base.defend.png`, `sprite.creature.norse.tier5.base.hit.png`, `sprite.creature.norse.tier5.base.death.png`, `sprite.creature.norse.tier5.base.victory.png`, `sprite.creature.norse.tier5.base.shoot.png` |
| Status | idle placeholder, move missing, attack missing, defend missing, hit missing, death missing, victory missing, shoot missing |

```text
Using the attached canonical reference of Lindworm, create one animation sheet for Pantheon Realms.
The creature: Lindworm — A long wingless serpent-dragon with two clawed forelegs and frost on its scales.
Image 1424 × 1104 px (or larger, same proportions): an invisible grid of 6 columns × 7 rows of equal cells, each cell 3.20 hex widths wide. No grid lines, no borders, no labels, no numbers, no text. Every item stays inside its own cell with clear empty space around it; nothing touches or crosses a cell edge.
Each row is one animation; its frames run left to right:
Row 1 — idle (6 frames, loops): 1) neutral stance · 2) breathing in, chest rising · 3) breath held, weight shifts slightly forward · 4) small head turn · 5) breathing out, chest sinking · 6) settling back to neutral (loops into frame 1)
Row 2 — move (6 frames, loops): 1) body curved left · 2) curve travelling back · 3) body straight · 4) body curved right · 5) curve travelling back · 6) body straight (loops)
Row 3 — attack (6 frames): 1) ready stance · 2) anticipation: draws back, coiled · 3) strike: rears back and strikes forward with its jaws · 4) impact pose, fully extended · 5) follow-through · 6) recovering to the ready stance
Row 4 — defend (cells 1–3): 1) ready stance · 2) coils tightly and lowers its head · 3) braced (held) | hit (cells 4–6): 1) struck: jolts back · 2) recoils, flinching · 3) steadies
Row 5 — death (6 frames, last frame held): 1) struck a final time · 2) staggers back · 3) legs buckle · 4) falls · 5) hits the ground · 6) lying still on the ground (held: the body stays on the battlefield)
Row 6 — victory (6 frames, loops): 1) begins a triumphant gesture · 2) raises weapon, head or wings high · 3) peak of the gesture · 4) holds · 5) lowers slightly · 6) raises again (loops into frame 2)
Row 7 — shoot (6 frames): 1) ready stance · 2) draws or winds up, aiming · 3) release: makes its ranged attack with the weapon shown in the reference · 4) follow-through (the missile has left; the game draws it in flight) · 5) recoil · 6) recovering to the ready stance
In every frame: the exact same Lindworm, same size, same anatomy, armour, equipment, materials and lighting; it faces right; its feet stand on the cell's ground line at 90% of the cell height, centred in the cell; it stands about 65% of the cell height tall.
Fixed elevated side / three-quarter strategy-game camera (about 20° above the horizon), the same in every cell.
Modern high-resolution pre-rendered fantasy strategy-game sprite style. Strong readable silhouette. Moderate detail appropriate for gameplay scale.
Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). No ground, no shadows, no environment, no text.
```

### C · Storm Lindworm — Norse, tier 5, upgraded form

| Field | Value |
|---|---|
| Sheet file | `sheet.creature.norse.tier5.upgraded.png` |
| Creature | `norse_storm_lindworm` · Ranged breath · occupies 2 hexes · shoots (range 17) · Shooter (passive) · No Melee Penalty (passive) |
| Rows | 1. idle (6)<br>2. move (6)<br>3. attack (6)<br>4. defend (3) + hit (3)<br>5. death (6)<br>6. victory (6)<br>7. shoot (6) |
| Image | 1424 × 1104 px (about 1.6 MP) or larger with the same proportions — 6 columns × 7 rows, cells 237 × 158 px<br>or two parts for sharper frames: `sheet.creature.norse.tier5.upgraded.part1.png` rows 1–4, 1880 × 840 px; `sheet.creature.norse.tier5.upgraded.part2.png` rows 5–7, 2176 × 728 px |
| Scale | a cell is 3.20 hex widths wide and 2.13 tall; ground line at 90 % of the cell height; the creature stands about 68 % of the cell height |
| Attach | `sheet.creature.norse.tier5.base.png` (the base form's sheet — same layout and poses); `assets-source/creatures/reference/creature.norse.tier5.upgraded.ref.threequarter.png` (canonical master); `assets-source/icons/final/creature.norse.tier5.upgraded.portrait.png`; `support images/ChatGPT Image Sep 29, 2026, 03_35_32 PM-2.png` |
| Cuts into | 8 strips: `sprite.creature.norse.tier5.upgraded.idle.png`, `sprite.creature.norse.tier5.upgraded.move.png`, `sprite.creature.norse.tier5.upgraded.attack.png`, `sprite.creature.norse.tier5.upgraded.defend.png`, `sprite.creature.norse.tier5.upgraded.hit.png`, `sprite.creature.norse.tier5.upgraded.death.png`, `sprite.creature.norse.tier5.upgraded.victory.png`, `sprite.creature.norse.tier5.upgraded.shoot.png` |
| Status | idle placeholder, move missing, attack missing, defend missing, hit missing, death missing, victory missing, shoot missing |

```text
Using the attached animation sheet of Lindworm and the canonical reference of Storm Lindworm, create the same animation sheet for Storm Lindworm, its upgraded form, for Pantheon Realms.
Keep the attached sheet's layout, every frame's pose, timing, camera, scale and place in its cell; change only the creature design to the upgraded form.
The creature: Storm Lindworm — A slate-blue lindworm with crackling pale markings and a raised crest.
Image 1424 × 1104 px (or larger, same proportions): an invisible grid of 6 columns × 7 rows of equal cells, each cell 3.20 hex widths wide. No grid lines, no borders, no labels, no numbers, no text. Every item stays inside its own cell with clear empty space around it; nothing touches or crosses a cell edge.
Each row is one animation; its frames run left to right:
Row 1 — idle (6 frames, loops): 1) neutral stance · 2) breathing in, chest rising · 3) breath held, weight shifts slightly forward · 4) small head turn · 5) breathing out, chest sinking · 6) settling back to neutral (loops into frame 1)
Row 2 — move (6 frames, loops): 1) body curved left · 2) curve travelling back · 3) body straight · 4) body curved right · 5) curve travelling back · 6) body straight (loops)
Row 3 — attack (6 frames): 1) ready stance · 2) anticipation: draws back, coiled · 3) strike: rears back and strikes forward with its jaws · 4) impact pose, fully extended · 5) follow-through · 6) recovering to the ready stance
Row 4 — defend (cells 1–3): 1) ready stance · 2) coils tightly and lowers its head · 3) braced (held) | hit (cells 4–6): 1) struck: jolts back · 2) recoils, flinching · 3) steadies
Row 5 — death (6 frames, last frame held): 1) struck a final time · 2) staggers back · 3) legs buckle · 4) falls · 5) hits the ground · 6) lying still on the ground (held: the body stays on the battlefield)
Row 6 — victory (6 frames, loops): 1) begins a triumphant gesture · 2) raises weapon, head or wings high · 3) peak of the gesture · 4) holds · 5) lowers slightly · 6) raises again (loops into frame 2)
Row 7 — shoot (6 frames): 1) ready stance · 2) draws or winds up, aiming · 3) release: makes its ranged attack with the weapon shown in the reference · 4) follow-through (the missile has left; the game draws it in flight) · 5) recoil · 6) recovering to the ready stance
In every frame: the exact same Storm Lindworm, same size, same anatomy, armour, equipment, materials and lighting; it faces right; its feet stand on the cell's ground line at 90% of the cell height, centred in the cell; it stands about 68% of the cell height tall.
Fixed elevated side / three-quarter strategy-game camera (about 20° above the horizon), the same in every cell.
Modern high-resolution pre-rendered fantasy strategy-game sprite style. Strong readable silhouette. Moderate detail appropriate for gameplay scale.
Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). No ground, no shadows, no environment, no text.
```

### C · Jotunn — Norse, tier 6, base form

| Field | Value |
|---|---|
| Sheet file | `sheet.creature.norse.tier6.base.png` |
| Creature | `norse_jotunn` · Giant warrior · occupies 2 hexes · Double Retaliation (passive) |
| Rows | 1. idle (6)<br>2. move (6)<br>3. attack (6)<br>4. defend (3) + hit (3)<br>5. death (6)<br>6. victory (6) |
| Image | 1368 × 1152 px (about 1.6 MP) or larger with the same proportions — 6 columns × 6 rows, cells 228 × 192 px |
| Scale | a cell is 3.20 hex widths wide and 2.70 tall; ground line at 90 % of the cell height; the creature stands about 75 % of the cell height |
| Attach | `assets-source/creatures/reference/creature.norse.tier6.base.ref.threequarter.png` (canonical master); `assets-source/icons/final/creature.norse.tier6.base.portrait.png`; `support images/ChatGPT Image Sep 29, 2026, 03_35_32 PM-2.png` |
| Cuts into | 7 strips: `sprite.creature.norse.tier6.base.idle.png`, `sprite.creature.norse.tier6.base.move.png`, `sprite.creature.norse.tier6.base.attack.png`, `sprite.creature.norse.tier6.base.defend.png`, `sprite.creature.norse.tier6.base.hit.png`, `sprite.creature.norse.tier6.base.death.png`, `sprite.creature.norse.tier6.base.victory.png` |
| Status | idle placeholder, move missing, attack missing, defend missing, hit missing, death missing, victory missing |

```text
Using the attached canonical reference of Jotunn, create one animation sheet for Pantheon Realms.
The creature: Jotunn — A towering giant in furs and iron bands with a frost-covered greataxe.
Image 1368 × 1152 px (or larger, same proportions): an invisible grid of 6 columns × 6 rows of equal cells, each cell 3.20 hex widths wide. No grid lines, no borders, no labels, no numbers, no text. Every item stays inside its own cell with clear empty space around it; nothing touches or crosses a cell edge.
Each row is one animation; its frames run left to right:
Row 1 — idle (6 frames, loops): 1) neutral stance · 2) breathing in, chest rising · 3) breath held, weight shifts slightly forward · 4) small head turn · 5) breathing out, chest sinking · 6) settling back to neutral (loops into frame 1)
Row 2 — move (6 frames, loops): 1) right foot forward, heel down · 2) weight on the right foot · 3) left leg passing · 4) left foot forward, heel down · 5) weight on the left foot · 6) right leg passing (loops)
Row 3 — attack (6 frames): 1) ready stance · 2) anticipation: draws back, coiled · 3) strike: smashes down with its weapon or fists · 4) impact pose, fully extended · 5) follow-through · 6) recovering to the ready stance
Row 4 — defend (cells 1–3): 1) ready stance · 2) lowers its head and braces · 3) braced (held) | hit (cells 4–6): 1) struck: jolts back · 2) recoils, flinching · 3) steadies
Row 5 — death (6 frames, last frame held): 1) struck a final time · 2) staggers back · 3) legs buckle · 4) falls · 5) hits the ground · 6) lying still on the ground (held: the body stays on the battlefield)
Row 6 — victory (6 frames, loops): 1) begins a triumphant gesture · 2) raises weapon, head or wings high · 3) peak of the gesture · 4) holds · 5) lowers slightly · 6) raises again (loops into frame 2)
In every frame: the exact same Jotunn, same size, same anatomy, armour, equipment, materials and lighting; it faces right; its feet stand on the cell's ground line at 90% of the cell height, centred in the cell; it stands about 75% of the cell height tall.
Fixed elevated side / three-quarter strategy-game camera (about 20° above the horizon), the same in every cell.
Modern high-resolution pre-rendered fantasy strategy-game sprite style. Strong readable silhouette. Moderate detail appropriate for gameplay scale.
Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). No ground, no shadows, no environment, no text.
```

### C · Runic Jotunn — Norse, tier 6, upgraded form

| Field | Value |
|---|---|
| Sheet file | `sheet.creature.norse.tier6.upgraded.png` |
| Creature | `norse_runic_jotunn` · Giant warrior · occupies 2 hexes · Double Retaliation (passive) · Ward (active) |
| Rows | 1. idle (6)<br>2. move (6)<br>3. attack (6)<br>4. defend (3) + hit (3)<br>5. death (6)<br>6. victory (6)<br>7. ability (6) |
| Image | 1240 × 1264 px (about 1.6 MP) or larger with the same proportions — 6 columns × 7 rows, cells 207 × 181 px<br>or two parts for sharper frames: `sheet.creature.norse.tier6.upgraded.part1.png` rows 1–4, 1640 × 960 px; `sheet.creature.norse.tier6.upgraded.part2.png` rows 5–7, 1896 × 832 px |
| Scale | a cell is 3.20 hex widths wide and 2.80 tall; ground line at 90 % of the cell height; the creature stands about 76 % of the cell height |
| Attach | `sheet.creature.norse.tier6.base.png` (the base form's sheet — same layout and poses); `assets-source/creatures/reference/creature.norse.tier6.upgraded.ref.threequarter.png` (canonical master); `assets-source/icons/final/creature.norse.tier6.upgraded.portrait.png`; `support images/ChatGPT Image Sep 29, 2026, 03_35_32 PM-2.png` |
| Cuts into | 8 strips: `sprite.creature.norse.tier6.upgraded.idle.png`, `sprite.creature.norse.tier6.upgraded.move.png`, `sprite.creature.norse.tier6.upgraded.attack.png`, `sprite.creature.norse.tier6.upgraded.defend.png`, `sprite.creature.norse.tier6.upgraded.hit.png`, `sprite.creature.norse.tier6.upgraded.death.png`, `sprite.creature.norse.tier6.upgraded.victory.png`, `sprite.creature.norse.tier6.upgraded.ability.png` |
| Status | idle placeholder, move missing, attack missing, defend missing, hit missing, death missing, victory missing, ability missing |

```text
Using the attached animation sheet of Jotunn and the canonical reference of Runic Jotunn, create the same animation sheet for Runic Jotunn, its upgraded form, for Pantheon Realms.
Keep the attached sheet's layout, every frame's pose, timing, camera, scale and place in its cell; change only the creature design to the upgraded form.
The creature: Runic Jotunn — A giant with glowing blue runes cut into stone bracers and a rune-marked hammer.
Image 1240 × 1264 px (or larger, same proportions): an invisible grid of 6 columns × 7 rows of equal cells, each cell 3.20 hex widths wide. No grid lines, no borders, no labels, no numbers, no text. Every item stays inside its own cell with clear empty space around it; nothing touches or crosses a cell edge.
Each row is one animation; its frames run left to right:
Row 1 — idle (6 frames, loops): 1) neutral stance · 2) breathing in, chest rising · 3) breath held, weight shifts slightly forward · 4) small head turn · 5) breathing out, chest sinking · 6) settling back to neutral (loops into frame 1)
Row 2 — move (6 frames, loops): 1) right foot forward, heel down · 2) weight on the right foot · 3) left leg passing · 4) left foot forward, heel down · 5) weight on the left foot · 6) right leg passing (loops)
Row 3 — attack (6 frames): 1) ready stance · 2) anticipation: draws back, coiled · 3) strike: smashes down with its weapon or fists · 4) impact pose, fully extended · 5) follow-through · 6) recovering to the ready stance
Row 4 — defend (cells 1–3): 1) ready stance · 2) lowers its head and braces · 3) braced (held) | hit (cells 4–6): 1) struck: jolts back · 2) recoils, flinching · 3) steadies
Row 5 — death (6 frames, last frame held): 1) struck a final time · 2) staggers back · 3) legs buckle · 4) falls · 5) hits the ground · 6) lying still on the ground (held: the body stays on the battlefield)
Row 6 — victory (6 frames, loops): 1) begins a triumphant gesture · 2) raises weapon, head or wings high · 3) peak of the gesture · 4) holds · 5) lowers slightly · 6) raises again (loops into frame 2)
Row 7 — ability (6 frames): 1) ready stance · 2) begins to use Ward (Places a protective ward on a friendly stack) · 3) builds up · 4) the ability takes effect (a short glow around the creature; no text) · 5) glow fading · 6) recovering to the ready stance
In every frame: the exact same Runic Jotunn, same size, same anatomy, armour, equipment, materials and lighting; it faces right; its feet stand on the cell's ground line at 90% of the cell height, centred in the cell; it stands about 76% of the cell height tall.
Fixed elevated side / three-quarter strategy-game camera (about 20° above the horizon), the same in every cell.
Modern high-resolution pre-rendered fantasy strategy-game sprite style. Strong readable silhouette. Moderate detail appropriate for gameplay scale.
Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). No ground, no shadows, no environment, no text.
```

### C · Nidhogg Wyrm — Norse, tier 7, base form

| Field | Value |
|---|---|
| Sheet file | `sheet.creature.norse.tier7.base.png` |
| Creature | `norse_nidhogg_wyrm` · Apex wyrm · occupies 2 hexes · Unyielding (passive) · Unlimited Retaliation (passive) |
| Rows | 1. idle (6)<br>2. move (6)<br>3. attack (6)<br>4. defend (3) + hit (3)<br>5. death (6)<br>6. victory (6) |
| Image | 1536 × 1024 px (about 1.6 MP) or larger with the same proportions — 6 columns × 6 rows, cells 256 × 171 px |
| Scale | a cell is 3.20 hex widths wide and 2.13 tall; ground line at 90 % of the cell height; the creature stands about 69 % of the cell height |
| Attach | `assets-source/creatures/reference/creature.norse.tier7.base.ref.threequarter.png` (canonical master); `assets-source/icons/final/creature.norse.tier7.base.portrait.png`; `support images/ChatGPT Image Sep 29, 2026, 03_35_32 PM-2.png` |
| Cuts into | 7 strips: `sprite.creature.norse.tier7.base.idle.png`, `sprite.creature.norse.tier7.base.move.png`, `sprite.creature.norse.tier7.base.attack.png`, `sprite.creature.norse.tier7.base.defend.png`, `sprite.creature.norse.tier7.base.hit.png`, `sprite.creature.norse.tier7.base.death.png`, `sprite.creature.norse.tier7.base.victory.png` |
| Status | idle placeholder, move missing, attack missing, defend missing, hit missing, death missing, victory missing |

```text
Using the attached canonical reference of Nidhogg Wyrm, create one animation sheet for Pantheon Realms.
The creature: Nidhogg Wyrm — A huge dark serpent-dragon coiled around ice-covered roots, jaws open.
Image 1536 × 1024 px (or larger, same proportions): an invisible grid of 6 columns × 6 rows of equal cells, each cell 3.20 hex widths wide. No grid lines, no borders, no labels, no numbers, no text. Every item stays inside its own cell with clear empty space around it; nothing touches or crosses a cell edge.
Each row is one animation; its frames run left to right:
Row 1 — idle (6 frames, loops): 1) neutral stance · 2) breathing in, chest rising · 3) breath held, weight shifts slightly forward · 4) small head turn · 5) breathing out, chest sinking · 6) settling back to neutral (loops into frame 1)
Row 2 — move (6 frames, loops): 1) body curved left · 2) curve travelling back · 3) body straight · 4) body curved right · 5) curve travelling back · 6) body straight (loops)
Row 3 — attack (6 frames): 1) ready stance · 2) anticipation: draws back, coiled · 3) strike: rears back and strikes forward with its jaws · 4) impact pose, fully extended · 5) follow-through · 6) recovering to the ready stance
Row 4 — defend (cells 1–3): 1) ready stance · 2) coils tightly and lowers its head · 3) braced (held) | hit (cells 4–6): 1) struck: jolts back · 2) recoils, flinching · 3) steadies
Row 5 — death (6 frames, last frame held): 1) struck a final time · 2) staggers back · 3) legs buckle · 4) falls · 5) hits the ground · 6) lying still on the ground (held: the body stays on the battlefield)
Row 6 — victory (6 frames, loops): 1) begins a triumphant gesture · 2) raises weapon, head or wings high · 3) peak of the gesture · 4) holds · 5) lowers slightly · 6) raises again (loops into frame 2)
In every frame: the exact same Nidhogg Wyrm, same size, same anatomy, armour, equipment, materials and lighting; it faces right; its feet stand on the cell's ground line at 90% of the cell height, centred in the cell; it stands about 69% of the cell height tall.
Fixed elevated side / three-quarter strategy-game camera (about 20° above the horizon), the same in every cell.
Modern high-resolution pre-rendered fantasy strategy-game sprite style. Strong readable silhouette. Moderate detail appropriate for gameplay scale.
Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). No ground, no shadows, no environment, no text.
```

### C · World-Serpent Wyrm — Norse, tier 7, upgraded form

| Field | Value |
|---|---|
| Sheet file | `sheet.creature.norse.tier7.upgraded.png` |
| Creature | `norse_world_serpent_wyrm` · Apex wyrm · occupies 2 hexes · Unyielding (passive) · Unlimited Retaliation (passive) · Charge Guard (passive) |
| Rows | 1. idle (6)<br>2. move (6)<br>3. attack (6)<br>4. defend (3) + hit (3)<br>5. death (6)<br>6. victory (6) |
| Image | 1536 × 1024 px (about 1.6 MP) or larger with the same proportions — 6 columns × 6 rows, cells 256 × 171 px |
| Scale | a cell is 3.20 hex widths wide and 2.13 tall; ground line at 90 % of the cell height; the creature stands about 72 % of the cell height |
| Attach | `sheet.creature.norse.tier7.base.png` (the base form's sheet — same layout and poses); `assets-source/creatures/reference/creature.norse.tier7.upgraded.ref.threequarter.png` (canonical master); `assets-source/icons/final/creature.norse.tier7.upgraded.portrait.png`; `support images/ChatGPT Image Sep 29, 2026, 03_35_32 PM-2.png` |
| Cuts into | 7 strips: `sprite.creature.norse.tier7.upgraded.idle.png`, `sprite.creature.norse.tier7.upgraded.move.png`, `sprite.creature.norse.tier7.upgraded.attack.png`, `sprite.creature.norse.tier7.upgraded.defend.png`, `sprite.creature.norse.tier7.upgraded.hit.png`, `sprite.creature.norse.tier7.upgraded.death.png`, `sprite.creature.norse.tier7.upgraded.victory.png` |
| Status | idle placeholder, move missing, attack missing, defend missing, hit missing, death missing, victory missing |

```text
Using the attached animation sheet of Nidhogg Wyrm and the canonical reference of World-Serpent Wyrm, create the same animation sheet for World-Serpent Wyrm, its upgraded form, for Pantheon Realms.
Keep the attached sheet's layout, every frame's pose, timing, camera, scale and place in its cell; change only the creature design to the upgraded form.
The creature: World-Serpent Wyrm — A vast sea-green serpent with barnacled scales and glowing rune-like markings.
Image 1536 × 1024 px (or larger, same proportions): an invisible grid of 6 columns × 6 rows of equal cells, each cell 3.20 hex widths wide. No grid lines, no borders, no labels, no numbers, no text. Every item stays inside its own cell with clear empty space around it; nothing touches or crosses a cell edge.
Each row is one animation; its frames run left to right:
Row 1 — idle (6 frames, loops): 1) neutral stance · 2) breathing in, chest rising · 3) breath held, weight shifts slightly forward · 4) small head turn · 5) breathing out, chest sinking · 6) settling back to neutral (loops into frame 1)
Row 2 — move (6 frames, loops): 1) body curved left · 2) curve travelling back · 3) body straight · 4) body curved right · 5) curve travelling back · 6) body straight (loops)
Row 3 — attack (6 frames): 1) ready stance · 2) anticipation: draws back, coiled · 3) strike: rears back and strikes forward with its jaws · 4) impact pose, fully extended · 5) follow-through · 6) recovering to the ready stance
Row 4 — defend (cells 1–3): 1) ready stance · 2) coils tightly and lowers its head · 3) braced (held) | hit (cells 4–6): 1) struck: jolts back · 2) recoils, flinching · 3) steadies
Row 5 — death (6 frames, last frame held): 1) struck a final time · 2) staggers back · 3) legs buckle · 4) falls · 5) hits the ground · 6) lying still on the ground (held: the body stays on the battlefield)
Row 6 — victory (6 frames, loops): 1) begins a triumphant gesture · 2) raises weapon, head or wings high · 3) peak of the gesture · 4) holds · 5) lowers slightly · 6) raises again (loops into frame 2)
In every frame: the exact same World-Serpent Wyrm, same size, same anatomy, armour, equipment, materials and lighting; it faces right; its feet stand on the cell's ground line at 90% of the cell height, centred in the cell; it stands about 72% of the cell height tall.
Fixed elevated side / three-quarter strategy-game camera (about 20° above the horizon), the same in every cell.
Modern high-resolution pre-rendered fantasy strategy-game sprite style. Strong readable silhouette. Moderate detail appropriate for gameplay scale.
Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). No ground, no shadows, no environment, no text.
```

### C · Brigand — Neutral, tier 1, base form

| Field | Value |
|---|---|
| Sheet file | `sheet.creature.neutral.brigand.base.png` |
| Creature | `brigand` · Line infantry (neutral) · occupies 1 hex |
| Rows | 1. idle (6)<br>2. move (6)<br>3. attack (6)<br>4. defend (3) + hit (3)<br>5. death (6)<br>6. victory (6) |
| Image | 1256 × 1256 px (about 1.6 MP) or larger with the same proportions — 6 columns × 6 rows, cells 209 × 209 px |
| Scale | a cell is 2.13 hex widths wide and 2.13 tall; ground line at 90 % of the cell height; the creature stands about 53 % of the cell height |
| Attach | `assets-source/creatures/reference/creature.neutral.brigand.base.ref.threequarter.png` (canonical master — Group A first) |
| Cuts into | 7 strips: `sprite.creature.neutral.brigand.base.idle.png`, `sprite.creature.neutral.brigand.base.move.png`, `sprite.creature.neutral.brigand.base.attack.png`, `sprite.creature.neutral.brigand.base.defend.png`, `sprite.creature.neutral.brigand.base.hit.png`, `sprite.creature.neutral.brigand.base.death.png`, `sprite.creature.neutral.brigand.base.victory.png` |
| Status | idle placeholder, move placeholder, attack placeholder, defend placeholder, hit placeholder, death placeholder, victory placeholder |

```text
Using the attached canonical reference of Brigand, create one animation sheet for Pantheon Realms.
The creature: Brigand — A ragged fighter with a hooded cloak, a short spear and a mismatched shield.
Image 1256 × 1256 px (or larger, same proportions): an invisible grid of 6 columns × 6 rows of equal cells, each cell 2.13 hex widths wide. No grid lines, no borders, no labels, no numbers, no text. Every item stays inside its own cell with clear empty space around it; nothing touches or crosses a cell edge.
Each row is one animation; its frames run left to right:
Row 1 — idle (6 frames, loops): 1) neutral stance · 2) breathing in, chest rising · 3) breath held, weight shifts slightly forward · 4) small head turn · 5) breathing out, chest sinking · 6) settling back to neutral (loops into frame 1)
Row 2 — move (6 frames, loops): 1) right foot forward, heel down · 2) weight on the right foot · 3) left leg passing · 4) left foot forward, heel down · 5) weight on the left foot · 6) right leg passing (loops)
Row 3 — attack (6 frames): 1) ready stance · 2) anticipation: draws back, coiled · 3) strike: thrusts its spear forward from behind its shield · 4) impact pose, fully extended · 5) follow-through · 6) recovering to the ready stance
Row 4 — defend (cells 1–3): 1) ready stance · 2) raises its shield and braces behind it · 3) braced (held) | hit (cells 4–6): 1) struck: jolts back · 2) recoils, flinching · 3) steadies
Row 5 — death (6 frames, last frame held): 1) struck a final time · 2) staggers back · 3) legs buckle · 4) falls · 5) hits the ground · 6) lying still on the ground (held: the body stays on the battlefield)
Row 6 — victory (6 frames, loops): 1) begins a triumphant gesture · 2) raises weapon, head or wings high · 3) peak of the gesture · 4) holds · 5) lowers slightly · 6) raises again (loops into frame 2)
In every frame: the exact same Brigand, same size, same anatomy, armour, equipment, materials and lighting; it faces right; its feet stand on the cell's ground line at 90% of the cell height, centred in the cell; it stands about 53% of the cell height tall.
Fixed elevated side / three-quarter strategy-game camera (about 20° above the horizon), the same in every cell.
Modern high-resolution pre-rendered fantasy strategy-game sprite style. Strong readable silhouette. Moderate detail appropriate for gameplay scale.
Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). No ground, no shadows, no environment, no text.
```

### C · Brigand Cutthroat — Neutral, tier 1, upgraded form

| Field | Value |
|---|---|
| Sheet file | `sheet.creature.neutral.brigand.upgraded.png` |
| Creature | `brigand_cutthroat` · Line infantry (neutral) · occupies 1 hex |
| Rows | 1. idle (6)<br>2. move (6)<br>3. attack (6)<br>4. defend (3) + hit (3)<br>5. death (6)<br>6. victory (6) |
| Image | 1256 × 1256 px (about 1.6 MP) or larger with the same proportions — 6 columns × 6 rows, cells 209 × 209 px |
| Scale | a cell is 2.13 hex widths wide and 2.13 tall; ground line at 90 % of the cell height; the creature stands about 56 % of the cell height |
| Attach | `sheet.creature.neutral.brigand.base.png` (the base form's sheet — same layout and poses); `assets-source/creatures/reference/creature.neutral.brigand.upgraded.ref.threequarter.png` (canonical master — Group A first) |
| Cuts into | 7 strips: `sprite.creature.neutral.brigand.upgraded.idle.png`, `sprite.creature.neutral.brigand.upgraded.move.png`, `sprite.creature.neutral.brigand.upgraded.attack.png`, `sprite.creature.neutral.brigand.upgraded.defend.png`, `sprite.creature.neutral.brigand.upgraded.hit.png`, `sprite.creature.neutral.brigand.upgraded.death.png`, `sprite.creature.neutral.brigand.upgraded.victory.png` |
| Status | idle placeholder, move placeholder, attack placeholder, defend placeholder, hit placeholder, death placeholder, victory placeholder |

```text
Using the attached animation sheet of Brigand and the canonical reference of Brigand Cutthroat, create the same animation sheet for Brigand Cutthroat, its upgraded form, for Pantheon Realms.
Keep the attached sheet's layout, every frame's pose, timing, camera, scale and place in its cell; change only the creature design to the upgraded form.
The creature: Brigand Cutthroat — A lean outlaw in a dark scarf with a notched spear and a dented round shield.
Image 1256 × 1256 px (or larger, same proportions): an invisible grid of 6 columns × 6 rows of equal cells, each cell 2.13 hex widths wide. No grid lines, no borders, no labels, no numbers, no text. Every item stays inside its own cell with clear empty space around it; nothing touches or crosses a cell edge.
Each row is one animation; its frames run left to right:
Row 1 — idle (6 frames, loops): 1) neutral stance · 2) breathing in, chest rising · 3) breath held, weight shifts slightly forward · 4) small head turn · 5) breathing out, chest sinking · 6) settling back to neutral (loops into frame 1)
Row 2 — move (6 frames, loops): 1) right foot forward, heel down · 2) weight on the right foot · 3) left leg passing · 4) left foot forward, heel down · 5) weight on the left foot · 6) right leg passing (loops)
Row 3 — attack (6 frames): 1) ready stance · 2) anticipation: draws back, coiled · 3) strike: thrusts its spear forward from behind its shield · 4) impact pose, fully extended · 5) follow-through · 6) recovering to the ready stance
Row 4 — defend (cells 1–3): 1) ready stance · 2) raises its shield and braces behind it · 3) braced (held) | hit (cells 4–6): 1) struck: jolts back · 2) recoils, flinching · 3) steadies
Row 5 — death (6 frames, last frame held): 1) struck a final time · 2) staggers back · 3) legs buckle · 4) falls · 5) hits the ground · 6) lying still on the ground (held: the body stays on the battlefield)
Row 6 — victory (6 frames, loops): 1) begins a triumphant gesture · 2) raises weapon, head or wings high · 3) peak of the gesture · 4) holds · 5) lowers slightly · 6) raises again (loops into frame 2)
In every frame: the exact same Brigand Cutthroat, same size, same anatomy, armour, equipment, materials and lighting; it faces right; its feet stand on the cell's ground line at 90% of the cell height, centred in the cell; it stands about 56% of the cell height tall.
Fixed elevated side / three-quarter strategy-game camera (about 20° above the horizon), the same in every cell.
Modern high-resolution pre-rendered fantasy strategy-game sprite style. Strong readable silhouette. Moderate detail appropriate for gameplay scale.
Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). No ground, no shadows, no environment, no text.
```

### C · Wild Boar — Neutral, tier 2, base form

| Field | Value |
|---|---|
| Sheet file | `sheet.creature.neutral.wild_boar.base.png` |
| Creature | `wild_boar` · Charging beasts (neutral) · occupies 1 hex · Charge (passive) |
| Rows | 1. idle (6)<br>2. move (6)<br>3. attack (6)<br>4. defend (3) + hit (3)<br>5. death (6)<br>6. victory (6) |
| Image | 1256 × 1256 px (about 1.6 MP) or larger with the same proportions — 6 columns × 6 rows, cells 209 × 209 px |
| Scale | a cell is 2.13 hex widths wide and 2.13 tall; ground line at 90 % of the cell height; the creature stands about 44 % of the cell height |
| Attach | `assets-source/creatures/reference/creature.neutral.wild_boar.base.ref.threequarter.png` (canonical master — Group A first) |
| Cuts into | 7 strips: `sprite.creature.neutral.wild_boar.base.idle.png`, `sprite.creature.neutral.wild_boar.base.move.png`, `sprite.creature.neutral.wild_boar.base.attack.png`, `sprite.creature.neutral.wild_boar.base.defend.png`, `sprite.creature.neutral.wild_boar.base.hit.png`, `sprite.creature.neutral.wild_boar.base.death.png`, `sprite.creature.neutral.wild_boar.base.victory.png` |
| Status | idle placeholder, move placeholder, attack placeholder, defend placeholder, hit placeholder, death placeholder, victory placeholder |

```text
Using the attached canonical reference of Wild Boar, create one animation sheet for Pantheon Realms.
The creature: Wild Boar — A bristling dark boar with curved tusks, head lowered to charge.
Image 1256 × 1256 px (or larger, same proportions): an invisible grid of 6 columns × 6 rows of equal cells, each cell 2.13 hex widths wide. No grid lines, no borders, no labels, no numbers, no text. Every item stays inside its own cell with clear empty space around it; nothing touches or crosses a cell edge.
Each row is one animation; its frames run left to right:
Row 1 — idle (6 frames, loops): 1) neutral stance · 2) breathing in, chest rising · 3) breath held, weight shifts slightly forward · 4) small head turn · 5) breathing out, chest sinking · 6) settling back to neutral (loops into frame 1)
Row 2 — move (6 frames, loops): 1) front left foot down · 2) pushing off · 3) legs gathered · 4) front right foot down · 5) pushing off · 6) legs stretched (loops)
Row 3 — attack (6 frames): 1) ready stance · 2) anticipation: draws back, coiled · 3) strike: lunges forward and bites, claws raking · 4) impact pose, fully extended · 5) follow-through · 6) recovering to the ready stance
Row 4 — defend (cells 1–3): 1) ready stance · 2) lowers its head and braces · 3) braced (held) | hit (cells 4–6): 1) struck: jolts back · 2) recoils, flinching · 3) steadies
Row 5 — death (6 frames, last frame held): 1) struck a final time · 2) staggers back · 3) legs buckle · 4) falls · 5) hits the ground · 6) lying still on the ground (held: the body stays on the battlefield)
Row 6 — victory (6 frames, loops): 1) begins a triumphant gesture · 2) raises weapon, head or wings high · 3) peak of the gesture · 4) holds · 5) lowers slightly · 6) raises again (loops into frame 2)
In every frame: the exact same Wild Boar, same size, same anatomy, armour, equipment, materials and lighting; it faces right; its feet stand on the cell's ground line at 90% of the cell height, centred in the cell; it stands about 44% of the cell height tall.
Fixed elevated side / three-quarter strategy-game camera (about 20° above the horizon), the same in every cell.
Modern high-resolution pre-rendered fantasy strategy-game sprite style. Strong readable silhouette. Moderate detail appropriate for gameplay scale.
Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). No ground, no shadows, no environment, no text.
```

### C · Hill Slinger — Neutral, tier 2, base form

| Field | Value |
|---|---|
| Sheet file | `sheet.creature.neutral.hill_slinger.base.png` |
| Creature | `hill_slinger` · Short-range shooters (neutral) · occupies 1 hex · shoots (range 9) · Shooter (passive) |
| Rows | 1. idle (6)<br>2. move (6)<br>3. attack (6)<br>4. defend (3) + hit (3)<br>5. death (6)<br>6. victory (6)<br>7. shoot (6) |
| Image | 1160 × 1352 px (about 1.6 MP) or larger with the same proportions — 6 columns × 7 rows, cells 193 × 193 px<br>or two parts for sharper frames: `sheet.creature.neutral.hill_slinger.base.part1.png` rows 1–4, 1536 × 1024 px; `sheet.creature.neutral.hill_slinger.base.part2.png` rows 5–7, 1776 × 888 px |
| Scale | a cell is 2.13 hex widths wide and 2.13 tall; ground line at 90 % of the cell height; the creature stands about 53 % of the cell height |
| Attach | `assets-source/creatures/reference/creature.neutral.hill_slinger.base.ref.threequarter.png` (canonical master — Group A first) |
| Cuts into | 8 strips: `sprite.creature.neutral.hill_slinger.base.idle.png`, `sprite.creature.neutral.hill_slinger.base.move.png`, `sprite.creature.neutral.hill_slinger.base.attack.png`, `sprite.creature.neutral.hill_slinger.base.defend.png`, `sprite.creature.neutral.hill_slinger.base.hit.png`, `sprite.creature.neutral.hill_slinger.base.death.png`, `sprite.creature.neutral.hill_slinger.base.victory.png`, `sprite.creature.neutral.hill_slinger.base.shoot.png` |
| Status | idle placeholder, move placeholder, attack placeholder, defend placeholder, hit placeholder, death placeholder, victory placeholder, shoot placeholder |

```text
Using the attached canonical reference of Hill Slinger, create one animation sheet for Pantheon Realms.
The creature: Hill Slinger — A shepherd in a wool cloak whirling a leather sling, a pouch of stones at the belt.
Image 1160 × 1352 px (or larger, same proportions): an invisible grid of 6 columns × 7 rows of equal cells, each cell 2.13 hex widths wide. No grid lines, no borders, no labels, no numbers, no text. Every item stays inside its own cell with clear empty space around it; nothing touches or crosses a cell edge.
Each row is one animation; its frames run left to right:
Row 1 — idle (6 frames, loops): 1) neutral stance · 2) breathing in, chest rising · 3) breath held, weight shifts slightly forward · 4) small head turn · 5) breathing out, chest sinking · 6) settling back to neutral (loops into frame 1)
Row 2 — move (6 frames, loops): 1) right foot forward, heel down · 2) weight on the right foot · 3) left leg passing · 4) left foot forward, heel down · 5) weight on the left foot · 6) right leg passing (loops)
Row 3 — attack (6 frames): 1) ready stance · 2) anticipation: draws back, coiled · 3) strike: jabs with a javelin or blade held close, guarding with its off arm · 4) impact pose, fully extended · 5) follow-through · 6) recovering to the ready stance
Row 4 — defend (cells 1–3): 1) ready stance · 2) raises its small shield or arm and crouches · 3) braced (held) | hit (cells 4–6): 1) struck: jolts back · 2) recoils, flinching · 3) steadies
Row 5 — death (6 frames, last frame held): 1) struck a final time · 2) staggers back · 3) legs buckle · 4) falls · 5) hits the ground · 6) lying still on the ground (held: the body stays on the battlefield)
Row 6 — victory (6 frames, loops): 1) begins a triumphant gesture · 2) raises weapon, head or wings high · 3) peak of the gesture · 4) holds · 5) lowers slightly · 6) raises again (loops into frame 2)
Row 7 — shoot (6 frames): 1) ready stance · 2) draws or winds up, aiming · 3) release: throws its ranged weapon (javelin, sling stone or arrow, as in the reference) · 4) follow-through (the missile has left; the game draws it in flight) · 5) recoil · 6) recovering to the ready stance
In every frame: the exact same Hill Slinger, same size, same anatomy, armour, equipment, materials and lighting; it faces right; its feet stand on the cell's ground line at 90% of the cell height, centred in the cell; it stands about 53% of the cell height tall.
Fixed elevated side / three-quarter strategy-game camera (about 20° above the horizon), the same in every cell.
Modern high-resolution pre-rendered fantasy strategy-game sprite style. Strong readable silhouette. Moderate detail appropriate for gameplay scale.
Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). No ground, no shadows, no environment, no text.
```

### C · Sling Master — Neutral, tier 2, upgraded form

| Field | Value |
|---|---|
| Sheet file | `sheet.creature.neutral.hill_slinger.upgraded.png` |
| Creature | `sling_master` · Short-range shooters (neutral) · occupies 1 hex · shoots (range 10) · Shooter (passive) |
| Rows | 1. idle (6)<br>2. move (6)<br>3. attack (6)<br>4. defend (3) + hit (3)<br>5. death (6)<br>6. victory (6)<br>7. shoot (6) |
| Image | 1160 × 1352 px (about 1.6 MP) or larger with the same proportions — 6 columns × 7 rows, cells 193 × 193 px<br>or two parts for sharper frames: `sheet.creature.neutral.hill_slinger.upgraded.part1.png` rows 1–4, 1536 × 1024 px; `sheet.creature.neutral.hill_slinger.upgraded.part2.png` rows 5–7, 1776 × 888 px |
| Scale | a cell is 2.13 hex widths wide and 2.13 tall; ground line at 90 % of the cell height; the creature stands about 55 % of the cell height |
| Attach | `sheet.creature.neutral.hill_slinger.base.png` (the base form's sheet — same layout and poses); `assets-source/creatures/reference/creature.neutral.hill_slinger.upgraded.ref.threequarter.png` (canonical master — Group A first) |
| Cuts into | 8 strips: `sprite.creature.neutral.hill_slinger.upgraded.idle.png`, `sprite.creature.neutral.hill_slinger.upgraded.move.png`, `sprite.creature.neutral.hill_slinger.upgraded.attack.png`, `sprite.creature.neutral.hill_slinger.upgraded.defend.png`, `sprite.creature.neutral.hill_slinger.upgraded.hit.png`, `sprite.creature.neutral.hill_slinger.upgraded.death.png`, `sprite.creature.neutral.hill_slinger.upgraded.victory.png`, `sprite.creature.neutral.hill_slinger.upgraded.shoot.png` |
| Status | idle placeholder, move placeholder, attack placeholder, defend placeholder, hit placeholder, death placeholder, victory placeholder, shoot placeholder |

```text
Using the attached animation sheet of Hill Slinger and the canonical reference of Sling Master, create the same animation sheet for Sling Master, its upgraded form, for Pantheon Realms.
Keep the attached sheet's layout, every frame's pose, timing, camera, scale and place in its cell; change only the creature design to the upgraded form.
The creature: Sling Master — A slinger with a braided double sling and a bag of lead shot.
Image 1160 × 1352 px (or larger, same proportions): an invisible grid of 6 columns × 7 rows of equal cells, each cell 2.13 hex widths wide. No grid lines, no borders, no labels, no numbers, no text. Every item stays inside its own cell with clear empty space around it; nothing touches or crosses a cell edge.
Each row is one animation; its frames run left to right:
Row 1 — idle (6 frames, loops): 1) neutral stance · 2) breathing in, chest rising · 3) breath held, weight shifts slightly forward · 4) small head turn · 5) breathing out, chest sinking · 6) settling back to neutral (loops into frame 1)
Row 2 — move (6 frames, loops): 1) right foot forward, heel down · 2) weight on the right foot · 3) left leg passing · 4) left foot forward, heel down · 5) weight on the left foot · 6) right leg passing (loops)
Row 3 — attack (6 frames): 1) ready stance · 2) anticipation: draws back, coiled · 3) strike: jabs with a javelin or blade held close, guarding with its off arm · 4) impact pose, fully extended · 5) follow-through · 6) recovering to the ready stance
Row 4 — defend (cells 1–3): 1) ready stance · 2) raises its small shield or arm and crouches · 3) braced (held) | hit (cells 4–6): 1) struck: jolts back · 2) recoils, flinching · 3) steadies
Row 5 — death (6 frames, last frame held): 1) struck a final time · 2) staggers back · 3) legs buckle · 4) falls · 5) hits the ground · 6) lying still on the ground (held: the body stays on the battlefield)
Row 6 — victory (6 frames, loops): 1) begins a triumphant gesture · 2) raises weapon, head or wings high · 3) peak of the gesture · 4) holds · 5) lowers slightly · 6) raises again (loops into frame 2)
Row 7 — shoot (6 frames): 1) ready stance · 2) draws or winds up, aiming · 3) release: throws its ranged weapon (javelin, sling stone or arrow, as in the reference) · 4) follow-through (the missile has left; the game draws it in flight) · 5) recoil · 6) recovering to the ready stance
In every frame: the exact same Sling Master, same size, same anatomy, armour, equipment, materials and lighting; it faces right; its feet stand on the cell's ground line at 90% of the cell height, centred in the cell; it stands about 55% of the cell height tall.
Fixed elevated side / three-quarter strategy-game camera (about 20° above the horizon), the same in every cell.
Modern high-resolution pre-rendered fantasy strategy-game sprite style. Strong readable silhouette. Moderate detail appropriate for gameplay scale.
Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). No ground, no shadows, no environment, no text.
```

### C · Great Tusked Boar — Neutral, tier 2, upgraded form

| Field | Value |
|---|---|
| Sheet file | `sheet.creature.neutral.wild_boar.upgraded.png` |
| Creature | `tusked_boar` · Charging beasts (neutral) · occupies 1 hex · Charge (passive) |
| Rows | 1. idle (6)<br>2. move (6)<br>3. attack (6)<br>4. defend (3) + hit (3)<br>5. death (6)<br>6. victory (6) |
| Image | 1256 × 1256 px (about 1.6 MP) or larger with the same proportions — 6 columns × 6 rows, cells 209 × 209 px |
| Scale | a cell is 2.13 hex widths wide and 2.13 tall; ground line at 90 % of the cell height; the creature stands about 46 % of the cell height |
| Attach | `sheet.creature.neutral.wild_boar.base.png` (the base form's sheet — same layout and poses); `assets-source/creatures/reference/creature.neutral.wild_boar.upgraded.ref.threequarter.png` (canonical master — Group A first) |
| Cuts into | 7 strips: `sprite.creature.neutral.wild_boar.upgraded.idle.png`, `sprite.creature.neutral.wild_boar.upgraded.move.png`, `sprite.creature.neutral.wild_boar.upgraded.attack.png`, `sprite.creature.neutral.wild_boar.upgraded.defend.png`, `sprite.creature.neutral.wild_boar.upgraded.hit.png`, `sprite.creature.neutral.wild_boar.upgraded.death.png`, `sprite.creature.neutral.wild_boar.upgraded.victory.png` |
| Status | idle placeholder, move placeholder, attack placeholder, defend placeholder, hit placeholder, death placeholder, victory placeholder |

```text
Using the attached animation sheet of Wild Boar and the canonical reference of Great Tusked Boar, create the same animation sheet for Great Tusked Boar, its upgraded form, for Pantheon Realms.
Keep the attached sheet's layout, every frame's pose, timing, camera, scale and place in its cell; change only the creature design to the upgraded form.
The creature: Great Tusked Boar — A huge scarred boar with long ivory tusks and a ridge of grey bristles.
Image 1256 × 1256 px (or larger, same proportions): an invisible grid of 6 columns × 6 rows of equal cells, each cell 2.13 hex widths wide. No grid lines, no borders, no labels, no numbers, no text. Every item stays inside its own cell with clear empty space around it; nothing touches or crosses a cell edge.
Each row is one animation; its frames run left to right:
Row 1 — idle (6 frames, loops): 1) neutral stance · 2) breathing in, chest rising · 3) breath held, weight shifts slightly forward · 4) small head turn · 5) breathing out, chest sinking · 6) settling back to neutral (loops into frame 1)
Row 2 — move (6 frames, loops): 1) front left foot down · 2) pushing off · 3) legs gathered · 4) front right foot down · 5) pushing off · 6) legs stretched (loops)
Row 3 — attack (6 frames): 1) ready stance · 2) anticipation: draws back, coiled · 3) strike: lunges forward and bites, claws raking · 4) impact pose, fully extended · 5) follow-through · 6) recovering to the ready stance
Row 4 — defend (cells 1–3): 1) ready stance · 2) lowers its head and braces · 3) braced (held) | hit (cells 4–6): 1) struck: jolts back · 2) recoils, flinching · 3) steadies
Row 5 — death (6 frames, last frame held): 1) struck a final time · 2) staggers back · 3) legs buckle · 4) falls · 5) hits the ground · 6) lying still on the ground (held: the body stays on the battlefield)
Row 6 — victory (6 frames, loops): 1) begins a triumphant gesture · 2) raises weapon, head or wings high · 3) peak of the gesture · 4) holds · 5) lowers slightly · 6) raises again (loops into frame 2)
In every frame: the exact same Great Tusked Boar, same size, same anatomy, armour, equipment, materials and lighting; it faces right; its feet stand on the cell's ground line at 90% of the cell height, centred in the cell; it stands about 46% of the cell height tall.
Fixed elevated side / three-quarter strategy-game camera (about 20° above the horizon), the same in every cell.
Modern high-resolution pre-rendered fantasy strategy-game sprite style. Strong readable silhouette. Moderate detail appropriate for gameplay scale.
Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). No ground, no shadows, no environment, no text.
```

### C · Clay Golem — Neutral, tier 3, base form

| Field | Value |
|---|---|
| Sheet file | `sheet.creature.neutral.clay_golem.base.png` |
| Creature | `clay_golem` · Slow guardians (neutral) · occupies 1 hex · Unyielding (passive) |
| Rows | 1. idle (6)<br>2. move (6)<br>3. attack (6)<br>4. defend (3) + hit (3)<br>5. death (6)<br>6. victory (6) |
| Image | 1232 × 1272 px (about 1.6 MP) or larger with the same proportions — 6 columns × 6 rows, cells 205 × 212 px |
| Scale | a cell is 2.13 hex widths wide and 2.20 tall; ground line at 90 % of the cell height; the creature stands about 76 % of the cell height |
| Attach | `assets-source/creatures/reference/creature.neutral.clay_golem.base.ref.threequarter.png` (canonical master — Group A first) |
| Cuts into | 7 strips: `sprite.creature.neutral.clay_golem.base.idle.png`, `sprite.creature.neutral.clay_golem.base.move.png`, `sprite.creature.neutral.clay_golem.base.attack.png`, `sprite.creature.neutral.clay_golem.base.defend.png`, `sprite.creature.neutral.clay_golem.base.hit.png`, `sprite.creature.neutral.clay_golem.base.death.png`, `sprite.creature.neutral.clay_golem.base.victory.png` |
| Status | idle placeholder, move placeholder, attack placeholder, defend placeholder, hit placeholder, death placeholder, victory placeholder |

```text
Using the attached canonical reference of Clay Golem, create one animation sheet for Pantheon Realms.
The creature: Clay Golem — A heavy figure of red fired clay with a blank face and a sigil pressed into its chest.
Image 1232 × 1272 px (or larger, same proportions): an invisible grid of 6 columns × 6 rows of equal cells, each cell 2.13 hex widths wide. No grid lines, no borders, no labels, no numbers, no text. Every item stays inside its own cell with clear empty space around it; nothing touches or crosses a cell edge.
Each row is one animation; its frames run left to right:
Row 1 — idle (6 frames, loops): 1) neutral stance · 2) breathing in, chest rising · 3) breath held, weight shifts slightly forward · 4) small head turn · 5) breathing out, chest sinking · 6) settling back to neutral (loops into frame 1)
Row 2 — move (6 frames, loops): 1) right foot forward, heel down · 2) weight on the right foot · 3) left leg passing · 4) left foot forward, heel down · 5) weight on the left foot · 6) right leg passing (loops)
Row 3 — attack (6 frames): 1) ready stance · 2) anticipation: draws back, coiled · 3) strike: swings a massive arm in a crushing blow · 4) impact pose, fully extended · 5) follow-through · 6) recovering to the ready stance
Row 4 — defend (cells 1–3): 1) ready stance · 2) lowers its head and braces · 3) braced (held) | hit (cells 4–6): 1) struck: jolts back · 2) recoils, flinching · 3) steadies
Row 5 — death (6 frames, last frame held): 1) struck a final time · 2) staggers back · 3) legs buckle · 4) falls · 5) hits the ground · 6) lying still on the ground (held: the body stays on the battlefield)
Row 6 — victory (6 frames, loops): 1) begins a triumphant gesture · 2) raises weapon, head or wings high · 3) peak of the gesture · 4) holds · 5) lowers slightly · 6) raises again (loops into frame 2)
In every frame: the exact same Clay Golem, same size, same anatomy, armour, equipment, materials and lighting; it faces right; its feet stand on the cell's ground line at 90% of the cell height, centred in the cell; it stands about 76% of the cell height tall.
Fixed elevated side / three-quarter strategy-game camera (about 20° above the horizon), the same in every cell.
Modern high-resolution pre-rendered fantasy strategy-game sprite style. Strong readable silhouette. Moderate detail appropriate for gameplay scale.
Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). No ground, no shadows, no environment, no text.
```

### C · Centaur — Neutral, tier 3, base form

| Field | Value |
|---|---|
| Sheet file | `sheet.creature.neutral.centaur.base.png` |
| Creature | `centaur` · Fast ground melee (neutral) · occupies 2 hexes |
| Rows | 1. idle (6)<br>2. move (6)<br>3. attack (6)<br>4. defend (3) + hit (3)<br>5. death (6)<br>6. victory (6) |
| Image | 1536 × 1024 px (about 1.6 MP) or larger with the same proportions — 6 columns × 6 rows, cells 256 × 171 px |
| Scale | a cell is 3.20 hex widths wide and 2.13 tall; ground line at 90 % of the cell height; the creature stands about 66 % of the cell height |
| Attach | `assets-source/creatures/reference/creature.neutral.centaur.base.ref.threequarter.png` (canonical master — Group A first) |
| Cuts into | 7 strips: `sprite.creature.neutral.centaur.base.idle.png`, `sprite.creature.neutral.centaur.base.move.png`, `sprite.creature.neutral.centaur.base.attack.png`, `sprite.creature.neutral.centaur.base.defend.png`, `sprite.creature.neutral.centaur.base.hit.png`, `sprite.creature.neutral.centaur.base.death.png`, `sprite.creature.neutral.centaur.base.victory.png` |
| Status | idle placeholder, move placeholder, attack placeholder, defend placeholder, hit placeholder, death placeholder, victory placeholder |

```text
Using the attached canonical reference of Centaur, create one animation sheet for Pantheon Realms.
The creature: Centaur — A centaur with a chestnut coat, simple chest protection and a melee spear.
Image 1536 × 1024 px (or larger, same proportions): an invisible grid of 6 columns × 6 rows of equal cells, each cell 3.20 hex widths wide. No grid lines, no borders, no labels, no numbers, no text. Every item stays inside its own cell with clear empty space around it; nothing touches or crosses a cell edge.
Each row is one animation; its frames run left to right:
Row 1 — idle (6 frames, loops): 1) neutral stance · 2) breathing in, chest rising · 3) breath held, weight shifts slightly forward · 4) small head turn · 5) breathing out, chest sinking · 6) settling back to neutral (loops into frame 1)
Row 2 — move (6 frames, loops): 1) front left foot down · 2) pushing off · 3) legs gathered · 4) front right foot down · 5) pushing off · 6) legs stretched (loops)
Row 3 — attack (6 frames): 1) ready stance · 2) anticipation: draws back, coiled · 3) strike: rears a little and drives its weapon forward · 4) impact pose, fully extended · 5) follow-through · 6) recovering to the ready stance
Row 4 — defend (cells 1–3): 1) ready stance · 2) lowers its head and braces · 3) braced (held) | hit (cells 4–6): 1) struck: jolts back · 2) recoils, flinching · 3) steadies
Row 5 — death (6 frames, last frame held): 1) struck a final time · 2) staggers back · 3) legs buckle · 4) falls · 5) hits the ground · 6) lying still on the ground (held: the body stays on the battlefield)
Row 6 — victory (6 frames, loops): 1) begins a triumphant gesture · 2) raises weapon, head or wings high · 3) peak of the gesture · 4) holds · 5) lowers slightly · 6) raises again (loops into frame 2)
In every frame: the exact same Centaur, same size, same anatomy, armour, equipment, materials and lighting; it faces right; its feet stand on the cell's ground line at 90% of the cell height, centred in the cell; it stands about 66% of the cell height tall.
Fixed elevated side / three-quarter strategy-game camera (about 20° above the horizon), the same in every cell.
Modern high-resolution pre-rendered fantasy strategy-game sprite style. Strong readable silhouette. Moderate detail appropriate for gameplay scale.
Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). No ground, no shadows, no environment, no text.
```

### C · Centaur Sentinel — Neutral, tier 3, upgraded form

| Field | Value |
|---|---|
| Sheet file | `sheet.creature.neutral.centaur.upgraded.png` |
| Creature | `centaur_sentinel` · Fast ground melee (neutral) · occupies 2 hexes |
| Rows | 1. idle (6)<br>2. move (6)<br>3. attack (6)<br>4. defend (3) + hit (3)<br>5. death (6)<br>6. victory (6) |
| Image | 1536 × 1024 px (about 1.6 MP) or larger with the same proportions — 6 columns × 6 rows, cells 256 × 171 px |
| Scale | a cell is 3.20 hex widths wide and 2.13 tall; ground line at 90 % of the cell height; the creature stands about 70 % of the cell height |
| Attach | `sheet.creature.neutral.centaur.base.png` (the base form's sheet — same layout and poses); `assets-source/creatures/reference/creature.neutral.centaur.upgraded.ref.threequarter.png` (canonical master — Group A first) |
| Cuts into | 7 strips: `sprite.creature.neutral.centaur.upgraded.idle.png`, `sprite.creature.neutral.centaur.upgraded.move.png`, `sprite.creature.neutral.centaur.upgraded.attack.png`, `sprite.creature.neutral.centaur.upgraded.defend.png`, `sprite.creature.neutral.centaur.upgraded.hit.png`, `sprite.creature.neutral.centaur.upgraded.death.png`, `sprite.creature.neutral.centaur.upgraded.victory.png` |
| Status | idle placeholder, move placeholder, attack placeholder, defend placeholder, hit placeholder, death placeholder, victory placeholder |

```text
Using the attached animation sheet of Centaur and the canonical reference of Centaur Sentinel, create the same animation sheet for Centaur Sentinel, its upgraded form, for Pantheon Realms.
Keep the attached sheet's layout, every frame's pose, timing, camera, scale and place in its cell; change only the creature design to the upgraded form.
The creature: Centaur Sentinel — A centaur with foreleg protection, a tied crest and a reinforced spearhead.
Image 1536 × 1024 px (or larger, same proportions): an invisible grid of 6 columns × 6 rows of equal cells, each cell 3.20 hex widths wide. No grid lines, no borders, no labels, no numbers, no text. Every item stays inside its own cell with clear empty space around it; nothing touches or crosses a cell edge.
Each row is one animation; its frames run left to right:
Row 1 — idle (6 frames, loops): 1) neutral stance · 2) breathing in, chest rising · 3) breath held, weight shifts slightly forward · 4) small head turn · 5) breathing out, chest sinking · 6) settling back to neutral (loops into frame 1)
Row 2 — move (6 frames, loops): 1) front left foot down · 2) pushing off · 3) legs gathered · 4) front right foot down · 5) pushing off · 6) legs stretched (loops)
Row 3 — attack (6 frames): 1) ready stance · 2) anticipation: draws back, coiled · 3) strike: rears a little and drives its weapon forward · 4) impact pose, fully extended · 5) follow-through · 6) recovering to the ready stance
Row 4 — defend (cells 1–3): 1) ready stance · 2) lowers its head and braces · 3) braced (held) | hit (cells 4–6): 1) struck: jolts back · 2) recoils, flinching · 3) steadies
Row 5 — death (6 frames, last frame held): 1) struck a final time · 2) staggers back · 3) legs buckle · 4) falls · 5) hits the ground · 6) lying still on the ground (held: the body stays on the battlefield)
Row 6 — victory (6 frames, loops): 1) begins a triumphant gesture · 2) raises weapon, head or wings high · 3) peak of the gesture · 4) holds · 5) lowers slightly · 6) raises again (loops into frame 2)
In every frame: the exact same Centaur Sentinel, same size, same anatomy, armour, equipment, materials and lighting; it faces right; its feet stand on the cell's ground line at 90% of the cell height, centred in the cell; it stands about 70% of the cell height tall.
Fixed elevated side / three-quarter strategy-game camera (about 20° above the horizon), the same in every cell.
Modern high-resolution pre-rendered fantasy strategy-game sprite style. Strong readable silhouette. Moderate detail appropriate for gameplay scale.
Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). No ground, no shadows, no environment, no text.
```

### C · Bronze Golem — Neutral, tier 3, upgraded form

| Field | Value |
|---|---|
| Sheet file | `sheet.creature.neutral.clay_golem.upgraded.png` |
| Creature | `bronze_golem` · Slow guardians (neutral) · occupies 1 hex · Unyielding (passive) · Charge Guard (passive) |
| Rows | 1. idle (6)<br>2. move (6)<br>3. attack (6)<br>4. defend (3) + hit (3)<br>5. death (6)<br>6. victory (6) |
| Image | 1208 × 1304 px (about 1.6 MP) or larger with the same proportions — 6 columns × 6 rows, cells 201 × 217 px |
| Scale | a cell is 2.13 hex widths wide and 2.30 tall; ground line at 90 % of the cell height; the creature stands about 76 % of the cell height |
| Attach | `sheet.creature.neutral.clay_golem.base.png` (the base form's sheet — same layout and poses); `assets-source/creatures/reference/creature.neutral.clay_golem.upgraded.ref.threequarter.png` (canonical master — Group A first) |
| Cuts into | 7 strips: `sprite.creature.neutral.clay_golem.upgraded.idle.png`, `sprite.creature.neutral.clay_golem.upgraded.move.png`, `sprite.creature.neutral.clay_golem.upgraded.attack.png`, `sprite.creature.neutral.clay_golem.upgraded.defend.png`, `sprite.creature.neutral.clay_golem.upgraded.hit.png`, `sprite.creature.neutral.clay_golem.upgraded.death.png`, `sprite.creature.neutral.clay_golem.upgraded.victory.png` |
| Status | idle placeholder, move placeholder, attack placeholder, defend placeholder, hit placeholder, death placeholder, victory placeholder |

```text
Using the attached animation sheet of Clay Golem and the canonical reference of Bronze Golem, create the same animation sheet for Bronze Golem, its upgraded form, for Pantheon Realms.
Keep the attached sheet's layout, every frame's pose, timing, camera, scale and place in its cell; change only the creature design to the upgraded form.
The creature: Bronze Golem — A clay golem plated in green-patinated bronze, with riveted shoulders.
Image 1208 × 1304 px (or larger, same proportions): an invisible grid of 6 columns × 6 rows of equal cells, each cell 2.13 hex widths wide. No grid lines, no borders, no labels, no numbers, no text. Every item stays inside its own cell with clear empty space around it; nothing touches or crosses a cell edge.
Each row is one animation; its frames run left to right:
Row 1 — idle (6 frames, loops): 1) neutral stance · 2) breathing in, chest rising · 3) breath held, weight shifts slightly forward · 4) small head turn · 5) breathing out, chest sinking · 6) settling back to neutral (loops into frame 1)
Row 2 — move (6 frames, loops): 1) right foot forward, heel down · 2) weight on the right foot · 3) left leg passing · 4) left foot forward, heel down · 5) weight on the left foot · 6) right leg passing (loops)
Row 3 — attack (6 frames): 1) ready stance · 2) anticipation: draws back, coiled · 3) strike: swings a massive arm in a crushing blow · 4) impact pose, fully extended · 5) follow-through · 6) recovering to the ready stance
Row 4 — defend (cells 1–3): 1) ready stance · 2) lowers its head and braces · 3) braced (held) | hit (cells 4–6): 1) struck: jolts back · 2) recoils, flinching · 3) steadies
Row 5 — death (6 frames, last frame held): 1) struck a final time · 2) staggers back · 3) legs buckle · 4) falls · 5) hits the ground · 6) lying still on the ground (held: the body stays on the battlefield)
Row 6 — victory (6 frames, loops): 1) begins a triumphant gesture · 2) raises weapon, head or wings high · 3) peak of the gesture · 4) holds · 5) lowers slightly · 6) raises again (loops into frame 2)
In every frame: the exact same Bronze Golem, same size, same anatomy, armour, equipment, materials and lighting; it faces right; its feet stand on the cell's ground line at 90% of the cell height, centred in the cell; it stands about 76% of the cell height tall.
Fixed elevated side / three-quarter strategy-game camera (about 20° above the horizon), the same in every cell.
Modern high-resolution pre-rendered fantasy strategy-game sprite style. Strong readable silhouette. Moderate detail appropriate for gameplay scale.
Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). No ground, no shadows, no environment, no text.
```

### C · Wyvern — Neutral, tier 4, base form

| Field | Value |
|---|---|
| Sheet file | `sheet.creature.neutral.wyvern.base.png` |
| Creature | `wyvern` · Flying hunters (neutral) · occupies 2 hexes · Flight (passive) |
| Rows | 1. idle (6)<br>2. move (6)<br>3. attack (6)<br>4. defend (3) + hit (3)<br>5. death (6)<br>6. victory (6)<br>7. takeoff (3) + landing (3)<br>8. fly (6) |
| Image | 1312 × 1200 px (about 1.6 MP) or larger with the same proportions — 6 columns × 8 rows, cells 219 × 150 px<br>or two parts for sharper frames: `sheet.creature.neutral.wyvern.base.part1.png` rows 1–4, 1856 × 848 px; `sheet.creature.neutral.wyvern.base.part2.png` rows 5–8, 1856 × 848 px |
| Scale | a cell is 3.20 hex widths wide and 2.20 tall; ground line at 90 % of the cell height; the creature stands about 61 % of the cell height |
| Attach | `assets-source/creatures/reference/creature.neutral.wyvern.base.ref.threequarter.png` (canonical master — Group A first) |
| Cuts into | 10 strips: `sprite.creature.neutral.wyvern.base.idle.png`, `sprite.creature.neutral.wyvern.base.move.png`, `sprite.creature.neutral.wyvern.base.attack.png`, `sprite.creature.neutral.wyvern.base.defend.png`, `sprite.creature.neutral.wyvern.base.hit.png`, `sprite.creature.neutral.wyvern.base.death.png`, `sprite.creature.neutral.wyvern.base.victory.png`, `sprite.creature.neutral.wyvern.base.takeoff.png`, `sprite.creature.neutral.wyvern.base.landing.png`, `sprite.creature.neutral.wyvern.base.fly.png` |
| Status | idle placeholder, move placeholder, attack placeholder, defend placeholder, hit placeholder, death placeholder, victory placeholder, takeoff placeholder, landing placeholder, fly placeholder |

```text
Using the attached canonical reference of Wyvern, create one animation sheet for Pantheon Realms.
The creature: Wyvern — A lean two-legged winged dragon with leathery wings and a barbed tail.
Image 1312 × 1200 px (or larger, same proportions): an invisible grid of 6 columns × 8 rows of equal cells, each cell 3.20 hex widths wide. No grid lines, no borders, no labels, no numbers, no text. Every item stays inside its own cell with clear empty space around it; nothing touches or crosses a cell edge.
Each row is one animation; its frames run left to right:
Row 1 — idle (6 frames, loops): 1) neutral stance · 2) breathing in, chest rising · 3) breath held, weight shifts slightly forward · 4) small head turn · 5) breathing out, chest sinking · 6) settling back to neutral (loops into frame 1)
Row 2 — move (6 frames, loops): 1) front left foot down · 2) pushing off · 3) legs gathered · 4) front right foot down · 5) pushing off · 6) legs stretched (loops)
Row 3 — attack (6 frames): 1) ready stance · 2) anticipation: draws back, coiled · 3) strike: lunges, raking with its front talons and snapping its beak · 4) impact pose, fully extended · 5) follow-through · 6) recovering to the ready stance
Row 4 — defend (cells 1–3): 1) ready stance · 2) draws its wings around its body and lowers its head · 3) braced (held) | hit (cells 4–6): 1) struck: jolts back · 2) recoils, flinching · 3) steadies
Row 5 — death (6 frames, last frame held): 1) struck a final time · 2) staggers back · 3) legs buckle · 4) falls · 5) hits the ground · 6) lying still on the ground (held: the body stays on the battlefield)
Row 6 — victory (6 frames, loops): 1) begins a triumphant gesture · 2) raises weapon, head or wings high · 3) peak of the gesture · 4) holds · 5) lowers slightly · 6) raises again (loops into frame 2)
Row 7 — takeoff (cells 1–3): 1) crouches, wings rising · 2) first downbeat, feet leave the ground · 3) hovering at flight height | landing (cells 4–6): 1) hovering, wings spread to brake · 2) touchdown, legs absorbing the landing · 3) standing, wings folding
Row 8 — fly (6 frames, loops): 1) wings up · 2) downbeat · 3) wings down · 4) upstroke · 5) wings level · 6) wings rising (loops)
In every frame: the exact same Wyvern, same size, same anatomy, armour, equipment, materials and lighting; it faces right; its feet stand on the cell's ground line at 90% of the cell height, centred in the cell (airborne frames hover about 15% of the cell height above that line); it stands about 61% of the cell height tall.
Fixed elevated side / three-quarter strategy-game camera (about 20° above the horizon), the same in every cell.
Modern high-resolution pre-rendered fantasy strategy-game sprite style. Strong readable silhouette. Moderate detail appropriate for gameplay scale.
Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). No ground, no shadows, no environment, no text.
```

### C · Wyvern Matriarch — Neutral, tier 4, upgraded form

| Field | Value |
|---|---|
| Sheet file | `sheet.creature.neutral.wyvern.upgraded.png` |
| Creature | `wyvern_matriarch` · Flying hunters (neutral) · occupies 2 hexes · Flight (passive) · Double Retaliation (passive) |
| Rows | 1. idle (6)<br>2. move (6)<br>3. attack (6)<br>4. defend (3) + hit (3)<br>5. death (6)<br>6. victory (6)<br>7. takeoff (3) + landing (3)<br>8. fly (6) |
| Image | 1280 × 1224 px (about 1.6 MP) or larger with the same proportions — 6 columns × 8 rows, cells 213 × 153 px<br>or two parts for sharper frames: `sheet.creature.neutral.wyvern.upgraded.part1.png` rows 1–4, 1808 × 872 px; `sheet.creature.neutral.wyvern.upgraded.part2.png` rows 5–8, 1808 × 872 px |
| Scale | a cell is 3.20 hex widths wide and 2.30 tall; ground line at 90 % of the cell height; the creature stands about 62 % of the cell height |
| Attach | `sheet.creature.neutral.wyvern.base.png` (the base form's sheet — same layout and poses); `assets-source/creatures/reference/creature.neutral.wyvern.upgraded.ref.threequarter.png` (canonical master — Group A first) |
| Cuts into | 10 strips: `sprite.creature.neutral.wyvern.upgraded.idle.png`, `sprite.creature.neutral.wyvern.upgraded.move.png`, `sprite.creature.neutral.wyvern.upgraded.attack.png`, `sprite.creature.neutral.wyvern.upgraded.defend.png`, `sprite.creature.neutral.wyvern.upgraded.hit.png`, `sprite.creature.neutral.wyvern.upgraded.death.png`, `sprite.creature.neutral.wyvern.upgraded.victory.png`, `sprite.creature.neutral.wyvern.upgraded.takeoff.png`, `sprite.creature.neutral.wyvern.upgraded.landing.png`, `sprite.creature.neutral.wyvern.upgraded.fly.png` |
| Status | idle placeholder, move placeholder, attack placeholder, defend placeholder, hit placeholder, death placeholder, victory placeholder, takeoff placeholder, landing placeholder, fly placeholder |

```text
Using the attached animation sheet of Wyvern and the canonical reference of Wyvern Matriarch, create the same animation sheet for Wyvern Matriarch, its upgraded form, for Pantheon Realms.
Keep the attached sheet's layout, every frame's pose, timing, camera, scale and place in its cell; change only the creature design to the upgraded form.
The creature: Wyvern Matriarch — A larger wyvern with a frilled crest and torn, battle-scarred wings.
Image 1280 × 1224 px (or larger, same proportions): an invisible grid of 6 columns × 8 rows of equal cells, each cell 3.20 hex widths wide. No grid lines, no borders, no labels, no numbers, no text. Every item stays inside its own cell with clear empty space around it; nothing touches or crosses a cell edge.
Each row is one animation; its frames run left to right:
Row 1 — idle (6 frames, loops): 1) neutral stance · 2) breathing in, chest rising · 3) breath held, weight shifts slightly forward · 4) small head turn · 5) breathing out, chest sinking · 6) settling back to neutral (loops into frame 1)
Row 2 — move (6 frames, loops): 1) front left foot down · 2) pushing off · 3) legs gathered · 4) front right foot down · 5) pushing off · 6) legs stretched (loops)
Row 3 — attack (6 frames): 1) ready stance · 2) anticipation: draws back, coiled · 3) strike: lunges, raking with its front talons and snapping its beak · 4) impact pose, fully extended · 5) follow-through · 6) recovering to the ready stance
Row 4 — defend (cells 1–3): 1) ready stance · 2) draws its wings around its body and lowers its head · 3) braced (held) | hit (cells 4–6): 1) struck: jolts back · 2) recoils, flinching · 3) steadies
Row 5 — death (6 frames, last frame held): 1) struck a final time · 2) staggers back · 3) legs buckle · 4) falls · 5) hits the ground · 6) lying still on the ground (held: the body stays on the battlefield)
Row 6 — victory (6 frames, loops): 1) begins a triumphant gesture · 2) raises weapon, head or wings high · 3) peak of the gesture · 4) holds · 5) lowers slightly · 6) raises again (loops into frame 2)
Row 7 — takeoff (cells 1–3): 1) crouches, wings rising · 2) first downbeat, feet leave the ground · 3) hovering at flight height | landing (cells 4–6): 1) hovering, wings spread to brake · 2) touchdown, legs absorbing the landing · 3) standing, wings folding
Row 8 — fly (6 frames, loops): 1) wings up · 2) downbeat · 3) wings down · 4) upstroke · 5) wings level · 6) wings rising (loops)
In every frame: the exact same Wyvern Matriarch, same size, same anatomy, armour, equipment, materials and lighting; it faces right; its feet stand on the cell's ground line at 90% of the cell height, centred in the cell (airborne frames hover about 15% of the cell height above that line); it stands about 62% of the cell height tall.
Fixed elevated side / three-quarter strategy-game camera (about 20° above the horizon), the same in every cell.
Modern high-resolution pre-rendered fantasy strategy-game sprite style. Strong readable silhouette. Moderate detail appropriate for gameplay scale.
Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). No ground, no shadows, no environment, no text.
```

### C · Ogre — Neutral, tier 5, base form

| Field | Value |
|---|---|
| Sheet file | `sheet.creature.neutral.ogre.base.png` |
| Creature | `ogre` · Brutes (neutral) · occupies 2 hexes |
| Rows | 1. idle (6)<br>2. move (6)<br>3. attack (6)<br>4. defend (3) + hit (3)<br>5. death (6)<br>6. victory (6) |
| Image | 1392 × 1128 px (about 1.6 MP) or larger with the same proportions — 6 columns × 6 rows, cells 232 × 188 px |
| Scale | a cell is 3.20 hex widths wide and 2.60 tall; ground line at 90 % of the cell height; the creature stands about 76 % of the cell height |
| Attach | `assets-source/creatures/reference/creature.neutral.ogre.base.ref.threequarter.png` (canonical master — Group A first) |
| Cuts into | 7 strips: `sprite.creature.neutral.ogre.base.idle.png`, `sprite.creature.neutral.ogre.base.move.png`, `sprite.creature.neutral.ogre.base.attack.png`, `sprite.creature.neutral.ogre.base.defend.png`, `sprite.creature.neutral.ogre.base.hit.png`, `sprite.creature.neutral.ogre.base.death.png`, `sprite.creature.neutral.ogre.base.victory.png` |
| Status | idle placeholder, move placeholder, attack placeholder, defend placeholder, hit placeholder, death placeholder, victory placeholder |

```text
Using the attached canonical reference of Ogre, create one animation sheet for Pantheon Realms.
The creature: Ogre — A towering brute in hides with a knotted club over one shoulder.
Image 1392 × 1128 px (or larger, same proportions): an invisible grid of 6 columns × 6 rows of equal cells, each cell 3.20 hex widths wide. No grid lines, no borders, no labels, no numbers, no text. Every item stays inside its own cell with clear empty space around it; nothing touches or crosses a cell edge.
Each row is one animation; its frames run left to right:
Row 1 — idle (6 frames, loops): 1) neutral stance · 2) breathing in, chest rising · 3) breath held, weight shifts slightly forward · 4) small head turn · 5) breathing out, chest sinking · 6) settling back to neutral (loops into frame 1)
Row 2 — move (6 frames, loops): 1) right foot forward, heel down · 2) weight on the right foot · 3) left leg passing · 4) left foot forward, heel down · 5) weight on the left foot · 6) right leg passing (loops)
Row 3 — attack (6 frames): 1) ready stance · 2) anticipation: draws back, coiled · 3) strike: smashes down with its weapon or fists · 4) impact pose, fully extended · 5) follow-through · 6) recovering to the ready stance
Row 4 — defend (cells 1–3): 1) ready stance · 2) lowers its head and braces · 3) braced (held) | hit (cells 4–6): 1) struck: jolts back · 2) recoils, flinching · 3) steadies
Row 5 — death (6 frames, last frame held): 1) struck a final time · 2) staggers back · 3) legs buckle · 4) falls · 5) hits the ground · 6) lying still on the ground (held: the body stays on the battlefield)
Row 6 — victory (6 frames, loops): 1) begins a triumphant gesture · 2) raises weapon, head or wings high · 3) peak of the gesture · 4) holds · 5) lowers slightly · 6) raises again (loops into frame 2)
In every frame: the exact same Ogre, same size, same anatomy, armour, equipment, materials and lighting; it faces right; its feet stand on the cell's ground line at 90% of the cell height, centred in the cell; it stands about 76% of the cell height tall.
Fixed elevated side / three-quarter strategy-game camera (about 20° above the horizon), the same in every cell.
Modern high-resolution pre-rendered fantasy strategy-game sprite style. Strong readable silhouette. Moderate detail appropriate for gameplay scale.
Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). No ground, no shadows, no environment, no text.
```

### C · Ogre Chieftain — Neutral, tier 5, upgraded form

| Field | Value |
|---|---|
| Sheet file | `sheet.creature.neutral.ogre.upgraded.png` |
| Creature | `ogre_chieftain` · Brutes (neutral) · occupies 2 hexes · Double Retaliation (passive) |
| Rows | 1. idle (6)<br>2. move (6)<br>3. attack (6)<br>4. defend (3) + hit (3)<br>5. death (6)<br>6. victory (6) |
| Image | 1344 × 1176 px (about 1.6 MP) or larger with the same proportions — 6 columns × 6 rows, cells 224 × 196 px |
| Scale | a cell is 3.20 hex widths wide and 2.80 tall; ground line at 90 % of the cell height; the creature stands about 74 % of the cell height |
| Attach | `sheet.creature.neutral.ogre.base.png` (the base form's sheet — same layout and poses); `assets-source/creatures/reference/creature.neutral.ogre.upgraded.ref.threequarter.png` (canonical master — Group A first) |
| Cuts into | 7 strips: `sprite.creature.neutral.ogre.upgraded.idle.png`, `sprite.creature.neutral.ogre.upgraded.move.png`, `sprite.creature.neutral.ogre.upgraded.attack.png`, `sprite.creature.neutral.ogre.upgraded.defend.png`, `sprite.creature.neutral.ogre.upgraded.hit.png`, `sprite.creature.neutral.ogre.upgraded.death.png`, `sprite.creature.neutral.ogre.upgraded.victory.png` |
| Status | idle placeholder, move placeholder, attack placeholder, defend placeholder, hit placeholder, death placeholder, victory placeholder |

```text
Using the attached animation sheet of Ogre and the canonical reference of Ogre Chieftain, create the same animation sheet for Ogre Chieftain, its upgraded form, for Pantheon Realms.
Keep the attached sheet's layout, every frame's pose, timing, camera, scale and place in its cell; change only the creature design to the upgraded form.
The creature: Ogre Chieftain — A scarred ogre wearing a crown of bent iron and a cloak of bear fur.
Image 1344 × 1176 px (or larger, same proportions): an invisible grid of 6 columns × 6 rows of equal cells, each cell 3.20 hex widths wide. No grid lines, no borders, no labels, no numbers, no text. Every item stays inside its own cell with clear empty space around it; nothing touches or crosses a cell edge.
Each row is one animation; its frames run left to right:
Row 1 — idle (6 frames, loops): 1) neutral stance · 2) breathing in, chest rising · 3) breath held, weight shifts slightly forward · 4) small head turn · 5) breathing out, chest sinking · 6) settling back to neutral (loops into frame 1)
Row 2 — move (6 frames, loops): 1) right foot forward, heel down · 2) weight on the right foot · 3) left leg passing · 4) left foot forward, heel down · 5) weight on the left foot · 6) right leg passing (loops)
Row 3 — attack (6 frames): 1) ready stance · 2) anticipation: draws back, coiled · 3) strike: smashes down with its weapon or fists · 4) impact pose, fully extended · 5) follow-through · 6) recovering to the ready stance
Row 4 — defend (cells 1–3): 1) ready stance · 2) lowers its head and braces · 3) braced (held) | hit (cells 4–6): 1) struck: jolts back · 2) recoils, flinching · 3) steadies
Row 5 — death (6 frames, last frame held): 1) struck a final time · 2) staggers back · 3) legs buckle · 4) falls · 5) hits the ground · 6) lying still on the ground (held: the body stays on the battlefield)
Row 6 — victory (6 frames, loops): 1) begins a triumphant gesture · 2) raises weapon, head or wings high · 3) peak of the gesture · 4) holds · 5) lowers slightly · 6) raises again (loops into frame 2)
In every frame: the exact same Ogre Chieftain, same size, same anatomy, armour, equipment, materials and lighting; it faces right; its feet stand on the cell's ground line at 90% of the cell height, centred in the cell; it stands about 74% of the cell height tall.
Fixed elevated side / three-quarter strategy-game camera (about 20° above the horizon), the same in every cell.
Modern high-resolution pre-rendered fantasy strategy-game sprite style. Strong readable silhouette. Moderate detail appropriate for gameplay scale.
Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). No ground, no shadows, no environment, no text.
```

### C · Basilisk — Neutral, tier 6, base form

| Field | Value |
|---|---|
| Sheet file | `sheet.creature.neutral.basilisk.base.png` |
| Creature | `basilisk` · Armoured serpents (neutral) · occupies 2 hexes · Double Retaliation (passive) |
| Rows | 1. idle (6)<br>2. move (6)<br>3. attack (6)<br>4. defend (3) + hit (3)<br>5. death (6)<br>6. victory (6) |
| Image | 1536 × 1024 px (about 1.6 MP) or larger with the same proportions — 6 columns × 6 rows, cells 256 × 171 px |
| Scale | a cell is 3.20 hex widths wide and 2.13 tall; ground line at 90 % of the cell height; the creature stands about 67 % of the cell height |
| Attach | `assets-source/creatures/reference/creature.neutral.basilisk.base.ref.threequarter.png` (canonical master — Group A first) |
| Cuts into | 7 strips: `sprite.creature.neutral.basilisk.base.idle.png`, `sprite.creature.neutral.basilisk.base.move.png`, `sprite.creature.neutral.basilisk.base.attack.png`, `sprite.creature.neutral.basilisk.base.defend.png`, `sprite.creature.neutral.basilisk.base.hit.png`, `sprite.creature.neutral.basilisk.base.death.png`, `sprite.creature.neutral.basilisk.base.victory.png` |
| Status | idle placeholder, move placeholder, attack placeholder, defend placeholder, hit placeholder, death placeholder, victory placeholder |

```text
Using the attached canonical reference of Basilisk, create one animation sheet for Pantheon Realms.
The creature: Basilisk — A great scaled serpent with a crest like a crown and pale, staring eyes.
Image 1536 × 1024 px (or larger, same proportions): an invisible grid of 6 columns × 6 rows of equal cells, each cell 3.20 hex widths wide. No grid lines, no borders, no labels, no numbers, no text. Every item stays inside its own cell with clear empty space around it; nothing touches or crosses a cell edge.
Each row is one animation; its frames run left to right:
Row 1 — idle (6 frames, loops): 1) neutral stance · 2) breathing in, chest rising · 3) breath held, weight shifts slightly forward · 4) small head turn · 5) breathing out, chest sinking · 6) settling back to neutral (loops into frame 1)
Row 2 — move (6 frames, loops): 1) body curved left · 2) curve travelling back · 3) body straight · 4) body curved right · 5) curve travelling back · 6) body straight (loops)
Row 3 — attack (6 frames): 1) ready stance · 2) anticipation: draws back, coiled · 3) strike: rears back and strikes forward with its jaws · 4) impact pose, fully extended · 5) follow-through · 6) recovering to the ready stance
Row 4 — defend (cells 1–3): 1) ready stance · 2) coils tightly and lowers its head · 3) braced (held) | hit (cells 4–6): 1) struck: jolts back · 2) recoils, flinching · 3) steadies
Row 5 — death (6 frames, last frame held): 1) struck a final time · 2) staggers back · 3) legs buckle · 4) falls · 5) hits the ground · 6) lying still on the ground (held: the body stays on the battlefield)
Row 6 — victory (6 frames, loops): 1) begins a triumphant gesture · 2) raises weapon, head or wings high · 3) peak of the gesture · 4) holds · 5) lowers slightly · 6) raises again (loops into frame 2)
In every frame: the exact same Basilisk, same size, same anatomy, armour, equipment, materials and lighting; it faces right; its feet stand on the cell's ground line at 90% of the cell height, centred in the cell; it stands about 67% of the cell height tall.
Fixed elevated side / three-quarter strategy-game camera (about 20° above the horizon), the same in every cell.
Modern high-resolution pre-rendered fantasy strategy-game sprite style. Strong readable silhouette. Moderate detail appropriate for gameplay scale.
Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). No ground, no shadows, no environment, no text.
```

### C · Greater Basilisk — Neutral, tier 6, upgraded form

| Field | Value |
|---|---|
| Sheet file | `sheet.creature.neutral.basilisk.upgraded.png` |
| Creature | `greater_basilisk` · Armoured serpents (neutral) · occupies 2 hexes · Double Retaliation (passive) · Charge Guard (passive) |
| Rows | 1. idle (6)<br>2. move (6)<br>3. attack (6)<br>4. defend (3) + hit (3)<br>5. death (6)<br>6. victory (6) |
| Image | 1536 × 1024 px (about 1.6 MP) or larger with the same proportions — 6 columns × 6 rows, cells 256 × 171 px |
| Scale | a cell is 3.20 hex widths wide and 2.13 tall; ground line at 90 % of the cell height; the creature stands about 70 % of the cell height |
| Attach | `sheet.creature.neutral.basilisk.base.png` (the base form's sheet — same layout and poses); `assets-source/creatures/reference/creature.neutral.basilisk.upgraded.ref.threequarter.png` (canonical master — Group A first) |
| Cuts into | 7 strips: `sprite.creature.neutral.basilisk.upgraded.idle.png`, `sprite.creature.neutral.basilisk.upgraded.move.png`, `sprite.creature.neutral.basilisk.upgraded.attack.png`, `sprite.creature.neutral.basilisk.upgraded.defend.png`, `sprite.creature.neutral.basilisk.upgraded.hit.png`, `sprite.creature.neutral.basilisk.upgraded.death.png`, `sprite.creature.neutral.basilisk.upgraded.victory.png` |
| Status | idle placeholder, move placeholder, attack placeholder, defend placeholder, hit placeholder, death placeholder, victory placeholder |

```text
Using the attached animation sheet of Basilisk and the canonical reference of Greater Basilisk, create the same animation sheet for Greater Basilisk, its upgraded form, for Pantheon Realms.
Keep the attached sheet's layout, every frame's pose, timing, camera, scale and place in its cell; change only the creature design to the upgraded form.
The creature: Greater Basilisk — A larger basilisk with stone-grey scales and a ring of horns around its crown.
Image 1536 × 1024 px (or larger, same proportions): an invisible grid of 6 columns × 6 rows of equal cells, each cell 3.20 hex widths wide. No grid lines, no borders, no labels, no numbers, no text. Every item stays inside its own cell with clear empty space around it; nothing touches or crosses a cell edge.
Each row is one animation; its frames run left to right:
Row 1 — idle (6 frames, loops): 1) neutral stance · 2) breathing in, chest rising · 3) breath held, weight shifts slightly forward · 4) small head turn · 5) breathing out, chest sinking · 6) settling back to neutral (loops into frame 1)
Row 2 — move (6 frames, loops): 1) body curved left · 2) curve travelling back · 3) body straight · 4) body curved right · 5) curve travelling back · 6) body straight (loops)
Row 3 — attack (6 frames): 1) ready stance · 2) anticipation: draws back, coiled · 3) strike: rears back and strikes forward with its jaws · 4) impact pose, fully extended · 5) follow-through · 6) recovering to the ready stance
Row 4 — defend (cells 1–3): 1) ready stance · 2) coils tightly and lowers its head · 3) braced (held) | hit (cells 4–6): 1) struck: jolts back · 2) recoils, flinching · 3) steadies
Row 5 — death (6 frames, last frame held): 1) struck a final time · 2) staggers back · 3) legs buckle · 4) falls · 5) hits the ground · 6) lying still on the ground (held: the body stays on the battlefield)
Row 6 — victory (6 frames, loops): 1) begins a triumphant gesture · 2) raises weapon, head or wings high · 3) peak of the gesture · 4) holds · 5) lowers slightly · 6) raises again (loops into frame 2)
In every frame: the exact same Greater Basilisk, same size, same anatomy, armour, equipment, materials and lighting; it faces right; its feet stand on the cell's ground line at 90% of the cell height, centred in the cell; it stands about 70% of the cell height tall.
Fixed elevated side / three-quarter strategy-game camera (about 20° above the horizon), the same in every cell.
Modern high-resolution pre-rendered fantasy strategy-game sprite style. Strong readable silhouette. Moderate detail appropriate for gameplay scale.
Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). No ground, no shadows, no environment, no text.
```

### C · Elder Drake — Neutral, tier 7, base form

| Field | Value |
|---|---|
| Sheet file | `sheet.creature.neutral.elder_drake.base.png` |
| Creature | `elder_drake` · Ancient dragons (neutral) · occupies 2 hexes · Flight (passive) · Double Retaliation (passive) |
| Rows | 1. idle (6)<br>2. move (6)<br>3. attack (6)<br>4. defend (3) + hit (3)<br>5. death (6)<br>6. victory (6)<br>7. takeoff (3) + landing (3)<br>8. fly (6) |
| Image | 1280 × 1224 px (about 1.6 MP) or larger with the same proportions — 6 columns × 8 rows, cells 213 × 153 px<br>or two parts for sharper frames: `sheet.creature.neutral.elder_drake.base.part1.png` rows 1–4, 1808 × 872 px; `sheet.creature.neutral.elder_drake.base.part2.png` rows 5–8, 1808 × 872 px |
| Scale | a cell is 3.20 hex widths wide and 2.30 tall; ground line at 90 % of the cell height; the creature stands about 64 % of the cell height |
| Attach | `assets-source/creatures/reference/creature.neutral.elder_drake.base.ref.threequarter.png` (canonical master — Group A first) |
| Cuts into | 10 strips: `sprite.creature.neutral.elder_drake.base.idle.png`, `sprite.creature.neutral.elder_drake.base.move.png`, `sprite.creature.neutral.elder_drake.base.attack.png`, `sprite.creature.neutral.elder_drake.base.defend.png`, `sprite.creature.neutral.elder_drake.base.hit.png`, `sprite.creature.neutral.elder_drake.base.death.png`, `sprite.creature.neutral.elder_drake.base.victory.png`, `sprite.creature.neutral.elder_drake.base.takeoff.png`, `sprite.creature.neutral.elder_drake.base.landing.png`, `sprite.creature.neutral.elder_drake.base.fly.png` |
| Status | idle placeholder, move placeholder, attack placeholder, defend placeholder, hit placeholder, death placeholder, victory placeholder, takeoff placeholder, landing placeholder, fly placeholder |

```text
Using the attached canonical reference of Elder Drake, create one animation sheet for Pantheon Realms.
The creature: Elder Drake — A massive four-legged dragon with bronze scales and folded wings over a heap of coins.
Image 1280 × 1224 px (or larger, same proportions): an invisible grid of 6 columns × 8 rows of equal cells, each cell 3.20 hex widths wide. No grid lines, no borders, no labels, no numbers, no text. Every item stays inside its own cell with clear empty space around it; nothing touches or crosses a cell edge.
Each row is one animation; its frames run left to right:
Row 1 — idle (6 frames, loops): 1) neutral stance · 2) breathing in, chest rising · 3) breath held, weight shifts slightly forward · 4) small head turn · 5) breathing out, chest sinking · 6) settling back to neutral (loops into frame 1)
Row 2 — move (6 frames, loops): 1) front left foot down · 2) pushing off · 3) legs gathered · 4) front right foot down · 5) pushing off · 6) legs stretched (loops)
Row 3 — attack (6 frames): 1) ready stance · 2) anticipation: draws back, coiled · 3) strike: lunges, raking with its front talons and snapping its beak · 4) impact pose, fully extended · 5) follow-through · 6) recovering to the ready stance
Row 4 — defend (cells 1–3): 1) ready stance · 2) draws its wings around its body and lowers its head · 3) braced (held) | hit (cells 4–6): 1) struck: jolts back · 2) recoils, flinching · 3) steadies
Row 5 — death (6 frames, last frame held): 1) struck a final time · 2) staggers back · 3) legs buckle · 4) falls · 5) hits the ground · 6) lying still on the ground (held: the body stays on the battlefield)
Row 6 — victory (6 frames, loops): 1) begins a triumphant gesture · 2) raises weapon, head or wings high · 3) peak of the gesture · 4) holds · 5) lowers slightly · 6) raises again (loops into frame 2)
Row 7 — takeoff (cells 1–3): 1) crouches, wings rising · 2) first downbeat, feet leave the ground · 3) hovering at flight height | landing (cells 4–6): 1) hovering, wings spread to brake · 2) touchdown, legs absorbing the landing · 3) standing, wings folding
Row 8 — fly (6 frames, loops): 1) wings up · 2) downbeat · 3) wings down · 4) upstroke · 5) wings level · 6) wings rising (loops)
In every frame: the exact same Elder Drake, same size, same anatomy, armour, equipment, materials and lighting; it faces right; its feet stand on the cell's ground line at 90% of the cell height, centred in the cell (airborne frames hover about 15% of the cell height above that line); it stands about 64% of the cell height tall.
Fixed elevated side / three-quarter strategy-game camera (about 20° above the horizon), the same in every cell.
Modern high-resolution pre-rendered fantasy strategy-game sprite style. Strong readable silhouette. Moderate detail appropriate for gameplay scale.
Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). No ground, no shadows, no environment, no text.
```

### C · Ancient Drake — Neutral, tier 7, upgraded form

| Field | Value |
|---|---|
| Sheet file | `sheet.creature.neutral.elder_drake.upgraded.png` |
| Creature | `ancient_drake` · Ancient dragons (neutral) · occupies 2 hexes · Flight (passive) · Unlimited Retaliation (passive) |
| Rows | 1. idle (6)<br>2. move (6)<br>3. attack (6)<br>4. defend (3) + hit (3)<br>5. death (6)<br>6. victory (6)<br>7. takeoff (3) + landing (3)<br>8. fly (6) |
| Image | 1256 × 1256 px (about 1.6 MP) or larger with the same proportions — 6 columns × 8 rows, cells 209 × 157 px<br>or two parts for sharper frames: `sheet.creature.neutral.elder_drake.upgraded.part1.png` rows 1–4, 1776 × 888 px; `sheet.creature.neutral.elder_drake.upgraded.part2.png` rows 5–8, 1776 × 888 px |
| Scale | a cell is 3.20 hex widths wide and 2.40 tall; ground line at 90 % of the cell height; the creature stands about 64 % of the cell height |
| Attach | `sheet.creature.neutral.elder_drake.base.png` (the base form's sheet — same layout and poses); `assets-source/creatures/reference/creature.neutral.elder_drake.upgraded.ref.threequarter.png` (canonical master — Group A first) |
| Cuts into | 10 strips: `sprite.creature.neutral.elder_drake.upgraded.idle.png`, `sprite.creature.neutral.elder_drake.upgraded.move.png`, `sprite.creature.neutral.elder_drake.upgraded.attack.png`, `sprite.creature.neutral.elder_drake.upgraded.defend.png`, `sprite.creature.neutral.elder_drake.upgraded.hit.png`, `sprite.creature.neutral.elder_drake.upgraded.death.png`, `sprite.creature.neutral.elder_drake.upgraded.victory.png`, `sprite.creature.neutral.elder_drake.upgraded.takeoff.png`, `sprite.creature.neutral.elder_drake.upgraded.landing.png`, `sprite.creature.neutral.elder_drake.upgraded.fly.png` |
| Status | idle placeholder, move placeholder, attack placeholder, defend placeholder, hit placeholder, death placeholder, victory placeholder, takeoff placeholder, landing placeholder, fly placeholder |

```text
Using the attached animation sheet of Elder Drake and the canonical reference of Ancient Drake, create the same animation sheet for Ancient Drake, its upgraded form, for Pantheon Realms.
Keep the attached sheet's layout, every frame's pose, timing, camera, scale and place in its cell; change only the creature design to the upgraded form.
The creature: Ancient Drake — An immense dragon with horn-crowned head and scales dulled to dark gold by age.
Image 1256 × 1256 px (or larger, same proportions): an invisible grid of 6 columns × 8 rows of equal cells, each cell 3.20 hex widths wide. No grid lines, no borders, no labels, no numbers, no text. Every item stays inside its own cell with clear empty space around it; nothing touches or crosses a cell edge.
Each row is one animation; its frames run left to right:
Row 1 — idle (6 frames, loops): 1) neutral stance · 2) breathing in, chest rising · 3) breath held, weight shifts slightly forward · 4) small head turn · 5) breathing out, chest sinking · 6) settling back to neutral (loops into frame 1)
Row 2 — move (6 frames, loops): 1) front left foot down · 2) pushing off · 3) legs gathered · 4) front right foot down · 5) pushing off · 6) legs stretched (loops)
Row 3 — attack (6 frames): 1) ready stance · 2) anticipation: draws back, coiled · 3) strike: lunges, raking with its front talons and snapping its beak · 4) impact pose, fully extended · 5) follow-through · 6) recovering to the ready stance
Row 4 — defend (cells 1–3): 1) ready stance · 2) draws its wings around its body and lowers its head · 3) braced (held) | hit (cells 4–6): 1) struck: jolts back · 2) recoils, flinching · 3) steadies
Row 5 — death (6 frames, last frame held): 1) struck a final time · 2) staggers back · 3) legs buckle · 4) falls · 5) hits the ground · 6) lying still on the ground (held: the body stays on the battlefield)
Row 6 — victory (6 frames, loops): 1) begins a triumphant gesture · 2) raises weapon, head or wings high · 3) peak of the gesture · 4) holds · 5) lowers slightly · 6) raises again (loops into frame 2)
Row 7 — takeoff (cells 1–3): 1) crouches, wings rising · 2) first downbeat, feet leave the ground · 3) hovering at flight height | landing (cells 4–6): 1) hovering, wings spread to brake · 2) touchdown, legs absorbing the landing · 3) standing, wings folding
Row 8 — fly (6 frames, loops): 1) wings up · 2) downbeat · 3) wings down · 4) upstroke · 5) wings level · 6) wings rising (loops)
In every frame: the exact same Ancient Drake, same size, same anatomy, armour, equipment, materials and lighting; it faces right; its feet stand on the cell's ground line at 90% of the cell height, centred in the cell (airborne frames hover about 15% of the cell height above that line); it stands about 64% of the cell height tall.
Fixed elevated side / three-quarter strategy-game camera (about 20° above the horizon), the same in every cell.
Modern high-resolution pre-rendered fantasy strategy-game sprite style. Strong readable silhouette. Moderate detail appropriate for gameplay scale.
Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). No ground, no shadows, no environment, no text.
```

## Group D — Mounted map heroes

One sheet per pantheon: **5 rows = directions** (east, north-east, north, south, south-east; the game mirrors east, north-east and south-east for west, north-west and south-west), each row **idle in cells 1–4** and **walk in cells 5–10**. Cells are 2.13 map-hex widths square; the ground point between the horse's feet sits at **88 % of the cell height**, centred. Cut into `sprite.hero.<pantheon>.<idle|walk>.<direction>.png`. A seventh sheet holds the six hero-screen figures.

### D · Greek mounted hero

| Field | Value |
|---|---|
| Sheet file | `sheet.hero.greek.png` |
| Rows | 1. east — facing right, side-on: idle (4) + walk (6)<br>2. north-east — facing right and away from the viewer: idle (4) + walk (6)<br>3. north — walking away from the viewer (we see the back): idle (4) + walk (6)<br>4. south — walking toward the viewer (we see the front): idle (4) + walk (6)<br>5. south-east — facing right and toward the viewer: idle (4) + walk (6) |
| Image | 1776 × 888 px (about 1.6 MP) or larger with the same proportions — 10 columns × 5 rows, cells 178 × 178 px |
| Scale | a cell is 2.13 map-hex widths square; ground point between the horse's feet at 88 % of the cell height; rider and horse about 60 % of the cell height |
| Attach | `support images/heros_full_view/ChatGPT Image Oct 1, 2026, 01_27_31 PM-1.png` (top / front / side views — the design authority); `assets-source/icons/final/emblem.greek.png` |
| Cuts into | 10 strips: `sprite.hero.greek.idle.<e|ne|n|s|se>.png`, `sprite.hero.greek.walk.<e|ne|n|s|se>.png` |
| Status | placeholder (side-view still from the board, mirrored westward, step bob) |

```text
Using the attached Greek mounted-hero sheet (top, front and side views), create one animation sheet of the same mounted hero for the Pantheon Realms adventure map.
Image 1776 × 888 px (or larger, same proportions): an invisible grid of 10 columns × 5 rows of equal square cells. No grid lines, no borders, no labels, no numbers, no text. Every item stays inside its own cell with clear empty space around it; nothing touches or crosses a cell edge.
Each row is one direction of travel: row 1: east — facing right, side-on; row 2: north-east — facing right and away from the viewer; row 3: north — walking away from the viewer (we see the back); row 4: south — walking toward the viewer (we see the front); row 5: south-east — facing right and toward the viewer.
In every row, cells 1–4: idle (standing still, the horse breathing, mane, cloak and banner stirring; loops); cells 5–10: walk (one full walking gait cycle of the horse, the rider swaying with it; loops).
The ground point between the horse's feet stands at 88% of the cell height, centred; the same scale in every cell; rider and horse about 60% of the cell height.
Elevated strategy-map camera about 35° above the horizon. Exact same rider, horse, armour, weapon and colours as the attached sheet in every cell; the rider's weapon held upright.
Modern high-resolution painterly fantasy strategy-game sprite. Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). No ground, no shadow, no text.
```

### D · Norse mounted hero

| Field | Value |
|---|---|
| Sheet file | `sheet.hero.norse.png` |
| Rows | 1. east — facing right, side-on: idle (4) + walk (6)<br>2. north-east — facing right and away from the viewer: idle (4) + walk (6)<br>3. north — walking away from the viewer (we see the back): idle (4) + walk (6)<br>4. south — walking toward the viewer (we see the front): idle (4) + walk (6)<br>5. south-east — facing right and toward the viewer: idle (4) + walk (6) |
| Image | 1776 × 888 px (about 1.6 MP) or larger with the same proportions — 10 columns × 5 rows, cells 178 × 178 px |
| Scale | a cell is 2.13 map-hex widths square; ground point between the horse's feet at 88 % of the cell height; rider and horse about 60 % of the cell height |
| Attach | `support images/heros_full_view/ChatGPT Image Oct 1, 2026, 01_27_33 PM-2.png` (top / front / side views — the design authority); `assets-source/icons/final/emblem.norse.png` |
| Cuts into | 10 strips: `sprite.hero.norse.idle.<e|ne|n|s|se>.png`, `sprite.hero.norse.walk.<e|ne|n|s|se>.png` |
| Status | placeholder (side-view still from the board, mirrored westward, step bob) |

```text
Using the attached Norse mounted-hero sheet (top, front and side views), create one animation sheet of the same mounted hero for the Pantheon Realms adventure map.
Image 1776 × 888 px (or larger, same proportions): an invisible grid of 10 columns × 5 rows of equal square cells. No grid lines, no borders, no labels, no numbers, no text. Every item stays inside its own cell with clear empty space around it; nothing touches or crosses a cell edge.
Each row is one direction of travel: row 1: east — facing right, side-on; row 2: north-east — facing right and away from the viewer; row 3: north — walking away from the viewer (we see the back); row 4: south — walking toward the viewer (we see the front); row 5: south-east — facing right and toward the viewer.
In every row, cells 1–4: idle (standing still, the horse breathing, mane, cloak and banner stirring; loops); cells 5–10: walk (one full walking gait cycle of the horse, the rider swaying with it; loops).
The ground point between the horse's feet stands at 88% of the cell height, centred; the same scale in every cell; rider and horse about 60% of the cell height.
Elevated strategy-map camera about 35° above the horizon. Exact same rider, horse, armour, weapon and colours as the attached sheet in every cell; the rider's weapon held upright.
Modern high-resolution painterly fantasy strategy-game sprite. Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). No ground, no shadow, no text.
```

### D · Egyptian mounted hero

| Field | Value |
|---|---|
| Sheet file | `sheet.hero.egyptian.png` |
| Rows | 1. east — facing right, side-on: idle (4) + walk (6)<br>2. north-east — facing right and away from the viewer: idle (4) + walk (6)<br>3. north — walking away from the viewer (we see the back): idle (4) + walk (6)<br>4. south — walking toward the viewer (we see the front): idle (4) + walk (6)<br>5. south-east — facing right and toward the viewer: idle (4) + walk (6) |
| Image | 1776 × 888 px (about 1.6 MP) or larger with the same proportions — 10 columns × 5 rows, cells 178 × 178 px |
| Scale | a cell is 2.13 map-hex widths square; ground point between the horse's feet at 88 % of the cell height; rider and horse about 60 % of the cell height |
| Attach | `support images/heros_full_view/ChatGPT Image Oct 1, 2026, 01_27_35 PM-3.png` (top / front / side views — the design authority); `assets-source/icons/final/emblem.egyptian.png` |
| Cuts into | 10 strips: `sprite.hero.egyptian.idle.<e|ne|n|s|se>.png`, `sprite.hero.egyptian.walk.<e|ne|n|s|se>.png` |
| Status | placeholder (side-view still from the board, mirrored westward, step bob) |

```text
Using the attached Egyptian mounted-hero sheet (top, front and side views), create one animation sheet of the same mounted hero for the Pantheon Realms adventure map.
Image 1776 × 888 px (or larger, same proportions): an invisible grid of 10 columns × 5 rows of equal square cells. No grid lines, no borders, no labels, no numbers, no text. Every item stays inside its own cell with clear empty space around it; nothing touches or crosses a cell edge.
Each row is one direction of travel: row 1: east — facing right, side-on; row 2: north-east — facing right and away from the viewer; row 3: north — walking away from the viewer (we see the back); row 4: south — walking toward the viewer (we see the front); row 5: south-east — facing right and toward the viewer.
In every row, cells 1–4: idle (standing still, the horse breathing, mane, cloak and banner stirring; loops); cells 5–10: walk (one full walking gait cycle of the horse, the rider swaying with it; loops).
The ground point between the horse's feet stands at 88% of the cell height, centred; the same scale in every cell; rider and horse about 60% of the cell height.
Elevated strategy-map camera about 35° above the horizon. Exact same rider, horse, armour, weapon and colours as the attached sheet in every cell; the rider's weapon held upright.
Modern high-resolution painterly fantasy strategy-game sprite. Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). No ground, no shadow, no text.
```

### D · Japanese mounted hero

| Field | Value |
|---|---|
| Sheet file | `sheet.hero.japanese.png` |
| Rows | 1. east — facing right, side-on: idle (4) + walk (6)<br>2. north-east — facing right and away from the viewer: idle (4) + walk (6)<br>3. north — walking away from the viewer (we see the back): idle (4) + walk (6)<br>4. south — walking toward the viewer (we see the front): idle (4) + walk (6)<br>5. south-east — facing right and toward the viewer: idle (4) + walk (6) |
| Image | 1776 × 888 px (about 1.6 MP) or larger with the same proportions — 10 columns × 5 rows, cells 178 × 178 px |
| Scale | a cell is 2.13 map-hex widths square; ground point between the horse's feet at 88 % of the cell height; rider and horse about 60 % of the cell height |
| Attach | `support images/heros_full_view/ChatGPT Image Oct 1, 2026, 01_27_37 PM-4.png` (top / front / side views — the design authority); `assets-source/icons/final/emblem.japanese.png` |
| Cuts into | 10 strips: `sprite.hero.japanese.idle.<e|ne|n|s|se>.png`, `sprite.hero.japanese.walk.<e|ne|n|s|se>.png` |
| Status | placeholder (side-view still from the board, mirrored westward, step bob) |

```text
Using the attached Japanese mounted-hero sheet (top, front and side views), create one animation sheet of the same mounted hero for the Pantheon Realms adventure map.
Image 1776 × 888 px (or larger, same proportions): an invisible grid of 10 columns × 5 rows of equal square cells. No grid lines, no borders, no labels, no numbers, no text. Every item stays inside its own cell with clear empty space around it; nothing touches or crosses a cell edge.
Each row is one direction of travel: row 1: east — facing right, side-on; row 2: north-east — facing right and away from the viewer; row 3: north — walking away from the viewer (we see the back); row 4: south — walking toward the viewer (we see the front); row 5: south-east — facing right and toward the viewer.
In every row, cells 1–4: idle (standing still, the horse breathing, mane, cloak and banner stirring; loops); cells 5–10: walk (one full walking gait cycle of the horse, the rider swaying with it; loops).
The ground point between the horse's feet stands at 88% of the cell height, centred; the same scale in every cell; rider and horse about 60% of the cell height.
Elevated strategy-map camera about 35° above the horizon. Exact same rider, horse, armour, weapon and colours as the attached sheet in every cell; the rider's weapon held upright.
Modern high-resolution painterly fantasy strategy-game sprite. Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). No ground, no shadow, no text.
```

### D · Celtic mounted hero

| Field | Value |
|---|---|
| Sheet file | `sheet.hero.celtic.png` |
| Rows | 1. east — facing right, side-on: idle (4) + walk (6)<br>2. north-east — facing right and away from the viewer: idle (4) + walk (6)<br>3. north — walking away from the viewer (we see the back): idle (4) + walk (6)<br>4. south — walking toward the viewer (we see the front): idle (4) + walk (6)<br>5. south-east — facing right and toward the viewer: idle (4) + walk (6) |
| Image | 1776 × 888 px (about 1.6 MP) or larger with the same proportions — 10 columns × 5 rows, cells 178 × 178 px |
| Scale | a cell is 2.13 map-hex widths square; ground point between the horse's feet at 88 % of the cell height; rider and horse about 60 % of the cell height |
| Attach | `support images/heros_full_view/ChatGPT Image Oct 1, 2026, 01_27_39 PM-5.png` (top / front / side views — the design authority); `assets-source/icons/final/emblem.celtic.png` |
| Cuts into | 10 strips: `sprite.hero.celtic.idle.<e|ne|n|s|se>.png`, `sprite.hero.celtic.walk.<e|ne|n|s|se>.png` |
| Status | placeholder (side-view still from the board, mirrored westward, step bob) |

```text
Using the attached Celtic mounted-hero sheet (top, front and side views), create one animation sheet of the same mounted hero for the Pantheon Realms adventure map.
Image 1776 × 888 px (or larger, same proportions): an invisible grid of 10 columns × 5 rows of equal square cells. No grid lines, no borders, no labels, no numbers, no text. Every item stays inside its own cell with clear empty space around it; nothing touches or crosses a cell edge.
Each row is one direction of travel: row 1: east — facing right, side-on; row 2: north-east — facing right and away from the viewer; row 3: north — walking away from the viewer (we see the back); row 4: south — walking toward the viewer (we see the front); row 5: south-east — facing right and toward the viewer.
In every row, cells 1–4: idle (standing still, the horse breathing, mane, cloak and banner stirring; loops); cells 5–10: walk (one full walking gait cycle of the horse, the rider swaying with it; loops).
The ground point between the horse's feet stands at 88% of the cell height, centred; the same scale in every cell; rider and horse about 60% of the cell height.
Elevated strategy-map camera about 35° above the horizon. Exact same rider, horse, armour, weapon and colours as the attached sheet in every cell; the rider's weapon held upright.
Modern high-resolution painterly fantasy strategy-game sprite. Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). No ground, no shadow, no text.
```

### D · Mesoamerican mounted hero

| Field | Value |
|---|---|
| Sheet file | `sheet.hero.mesoamerican.png` |
| Rows | 1. east — facing right, side-on: idle (4) + walk (6)<br>2. north-east — facing right and away from the viewer: idle (4) + walk (6)<br>3. north — walking away from the viewer (we see the back): idle (4) + walk (6)<br>4. south — walking toward the viewer (we see the front): idle (4) + walk (6)<br>5. south-east — facing right and toward the viewer: idle (4) + walk (6) |
| Image | 1776 × 888 px (about 1.6 MP) or larger with the same proportions — 10 columns × 5 rows, cells 178 × 178 px |
| Scale | a cell is 2.13 map-hex widths square; ground point between the horse's feet at 88 % of the cell height; rider and horse about 60 % of the cell height |
| Attach | `support images/heros_full_view/ChatGPT Image Oct 1, 2026, 01_27_48 PM-6.png` (top / front / side views — the design authority); `assets-source/icons/final/emblem.mesoamerican.png` |
| Cuts into | 10 strips: `sprite.hero.mesoamerican.idle.<e|ne|n|s|se>.png`, `sprite.hero.mesoamerican.walk.<e|ne|n|s|se>.png` |
| Status | placeholder (side-view still from the board, mirrored westward, step bob) |

```text
Using the attached Mesoamerican mounted-hero sheet (top, front and side views), create one animation sheet of the same mounted hero for the Pantheon Realms adventure map.
Image 1776 × 888 px (or larger, same proportions): an invisible grid of 10 columns × 5 rows of equal square cells. No grid lines, no borders, no labels, no numbers, no text. Every item stays inside its own cell with clear empty space around it; nothing touches or crosses a cell edge.
Each row is one direction of travel: row 1: east — facing right, side-on; row 2: north-east — facing right and away from the viewer; row 3: north — walking away from the viewer (we see the back); row 4: south — walking toward the viewer (we see the front); row 5: south-east — facing right and toward the viewer.
In every row, cells 1–4: idle (standing still, the horse breathing, mane, cloak and banner stirring; loops); cells 5–10: walk (one full walking gait cycle of the horse, the rider swaying with it; loops).
The ground point between the horse's feet stands at 88% of the cell height, centred; the same scale in every cell; rider and horse about 60% of the cell height.
Elevated strategy-map camera about 35° above the horizon. Exact same rider, horse, armour, weapon and colours as the attached sheet in every cell; the rider's weapon held upright.
Modern high-resolution painterly fantasy strategy-game sprite. Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). No ground, no shadow, no text.
```

### D · hero-screen figures (all six pantheons)

| Field | Value |
|---|---|
| Sheet file | `sheet.hero.figures.png` |
| Cells | row 1, cell 1: Greek<br>row 1, cell 2: Norse<br>row 1, cell 3: Egyptian<br>row 2, cell 1: Japanese<br>row 2, cell 2: Celtic<br>row 2, cell 3: Mesoamerican |
| Image | 1536 × 1024 px (about 1.6 MP) or larger with the same proportions — 3 columns × 2 rows, cells 512 × 512 px |
| Attach | the six hero boards above |
| Cuts into | `sprite.hero.greek.figure.png`, `sprite.hero.norse.figure.png`, `sprite.hero.egyptian.figure.png`, `sprite.hero.japanese.figure.png`, `sprite.hero.celtic.figure.png`, `sprite.hero.mesoamerican.figure.png` |
| Status | placeholder (the boards' side views) |

```text
Using the six attached mounted-hero sheets, paint one sheet of six large standing figures for the Pantheon Realms hero screen: 3 columns × 2 rows of equal square cells, image 1536 × 1024 px (or larger). Order: Greek, Norse, Egyptian, Japanese, Celtic, Mesoamerican.
Each cell: that pantheon's mounted hero, rider and horse standing, side view facing right, whole figure inside the cell with margin, dramatic painterly light on the figure only. No grid lines, no borders, no labels, no numbers, no text. Every item stays inside its own cell with clear empty space around it; nothing touches or crosses a cell edge.
Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). No ground, no shadow, no text.
```

## Group E — Adventure-map locations and decoration

Four sheets of square cells; each cell **1.83 map-hex widths** wide, one object per cell, standing on the cell's ground line at 88 % of the cell height, centred, at its true map size (stated per cell). Elevated map camera (~35°), the painterly style of the map-marker sheet; no banner in the owner's colour (the game draws it). Cut into `sprite.map.site.<kind>[.<variant>].png` and `sprite.map.decor.<kind>.png`.

### E · `sheet.map.towns.png`

| Field | Value |
|---|---|
| Image | 1776 × 888 px (about 1.6 MP) or larger with the same proportions — 4 columns × 2 rows, cells 444 × 444 px |
| Cells | row 1, cell 1: `map.site.town` — a neutral walled town (no pantheon), plain stone and timber (about 1.5 hex wide)<br>row 1, cell 2: `map.site.town.greek` — a Greek town: walls, gate and the pantheon's characteristic buildings, in the style of its pantheon board (about 1.5 hex wide)<br>row 1, cell 3: `map.site.town.norse` — a Norse town: walls, gate and the pantheon's characteristic buildings, in the style of its pantheon board (about 1.5 hex wide)<br>row 1, cell 4: `map.site.town.egyptian` — an Egyptian town: walls, gate and the pantheon's characteristic buildings, in the style of its pantheon board (about 1.5 hex wide)<br>row 2, cell 1: `map.site.town.japanese` — a Japanese town: walls, gate and the pantheon's characteristic buildings, in the style of its pantheon board (about 1.5 hex wide)<br>row 2, cell 2: `map.site.town.celtic` — a Celtic town: walls, gate and the pantheon's characteristic buildings, in the style of its pantheon board (about 1.5 hex wide)<br>row 2, cell 3: `map.site.town.mesoamerican` — a Mesoamerican town: walls, gate and the pantheon's characteristic buildings, in the style of its pantheon board (about 1.5 hex wide) |
| Attach | `assets-source/ui/sheets/map-markers-sheet.png` (approved look of map objects); the six pantheon boards |
| Status | placeholder (concept-sheet crops; procedural decoration) |

```text
Create one sheet of adventure-map objects for Pantheon Realms: 4 columns × 2 rows of equal square cells, image 1776 × 888 px (or larger, same proportions). No grid lines, no borders, no labels, no numbers, no text. Every item stays inside its own cell with clear empty space around it; nothing touches or crosses a cell edge.
Row 1, cell 1: a neutral walled town (no pantheon), plain stone and timber, about 82% of the cell width.
Row 1, cell 2: a Greek town: walls, gate and the pantheon's characteristic buildings, in the style of its pantheon board, about 82% of the cell width.
Row 1, cell 3: a Norse town: walls, gate and the pantheon's characteristic buildings, in the style of its pantheon board, about 82% of the cell width.
Row 1, cell 4: an Egyptian town: walls, gate and the pantheon's characteristic buildings, in the style of its pantheon board, about 82% of the cell width.
Row 2, cell 1: a Japanese town: walls, gate and the pantheon's characteristic buildings, in the style of its pantheon board, about 82% of the cell width.
Row 2, cell 2: a Celtic town: walls, gate and the pantheon's characteristic buildings, in the style of its pantheon board, about 82% of the cell width.
Row 2, cell 3: a Mesoamerican town: walls, gate and the pantheon's characteristic buildings, in the style of its pantheon board, about 82% of the cell width.
Row 2, cell 4: empty (leave it empty).
Every object stands on the cell's ground line at 88% of the cell height, centred, with a small ground skirt; elevated strategy-map camera about 35° above the horizon; all at the same map scale.
Match the painterly style of the attached map-marker sheet. Modern high-resolution fantasy strategy-game art. Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). No text, no owner banner, no cast shadow beyond the ground skirt.
```

### E · `sheet.map.resources.png`

| Field | Value |
|---|---|
| Image | 1448 × 1088 px (about 1.6 MP) or larger with the same proportions — 4 columns × 3 rows, cells 362 × 363 px |
| Cells | row 1, cell 1: `map.site.sawmill` — a sawmill with a waterwheel or saw shed and stacked logs (about 1.25 hex wide)<br>row 1, cell 2: `map.site.quarry` — a stone quarry cut into a rocky outcrop, with dressed blocks (about 1.25 hex wide)<br>row 1, cell 3: `map.site.gold_mine` — a gold mine entrance in a rocky hill with timber supports and an ore cart (about 1.25 hex wide)<br>row 1, cell 4: `map.site.crystal_deposit` — a cave mouth glittering with large blue crystals (about 1.25 hex wide)<br>row 2, cell 1: `map.site.pickup` — a small pile of mixed resources lying on the ground (about 0.8 hex wide)<br>row 2, cell 2: `map.site.pickup.gold` — a pile of gold coins and ingots (about 0.8 hex wide)<br>row 2, cell 3: `map.site.pickup.wood` — a stack of cut logs (about 0.8 hex wide)<br>row 2, cell 4: `map.site.pickup.stone` — a heap of dressed stone (about 0.8 hex wide)<br>row 3, cell 1: `map.site.pickup.crystal` — a cluster of blue crystals (about 0.8 hex wide)<br>row 3, cell 2: `map.site.pickup.favor` — a glowing golden sun-disc offering on a small altar (about 0.8 hex wide)<br>row 3, cell 3: `map.site.pickup.artifact` — a legendary item resting on a small pedestal (about 0.8 hex wide)<br>row 3, cell 4: `map.site.treasure_chest` — an ornate treasure chest on the ground (about 0.75 hex wide) |
| Attach | `assets-source/ui/sheets/map-markers-sheet.png` (approved look of map objects) |
| Status | placeholder (concept-sheet crops; procedural decoration) |

```text
Create one sheet of adventure-map objects for Pantheon Realms: 4 columns × 3 rows of equal square cells, image 1448 × 1088 px (or larger, same proportions). No grid lines, no borders, no labels, no numbers, no text. Every item stays inside its own cell with clear empty space around it; nothing touches or crosses a cell edge.
Row 1, cell 1: a sawmill with a waterwheel or saw shed and stacked logs, about 68% of the cell width.
Row 1, cell 2: a stone quarry cut into a rocky outcrop, with dressed blocks, about 68% of the cell width.
Row 1, cell 3: a gold mine entrance in a rocky hill with timber supports and an ore cart, about 68% of the cell width.
Row 1, cell 4: a cave mouth glittering with large blue crystals, about 68% of the cell width.
Row 2, cell 1: a small pile of mixed resources lying on the ground, about 44% of the cell width.
Row 2, cell 2: a pile of gold coins and ingots, about 44% of the cell width.
Row 2, cell 3: a stack of cut logs, about 44% of the cell width.
Row 2, cell 4: a heap of dressed stone, about 44% of the cell width.
Row 3, cell 1: a cluster of blue crystals, about 44% of the cell width.
Row 3, cell 2: a glowing golden sun-disc offering on a small altar, about 44% of the cell width.
Row 3, cell 3: a legendary item resting on a small pedestal, about 44% of the cell width.
Row 3, cell 4: an ornate treasure chest on the ground, about 41% of the cell width.
Every object stands on the cell's ground line at 88% of the cell height, centred, with a small ground skirt; elevated strategy-map camera about 35° above the horizon; all at the same map scale.
Match the painterly style of the attached map-marker sheet. Modern high-resolution fantasy strategy-game art. Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). No text, no owner banner, no cast shadow beyond the ground skirt.
```

### E · `sheet.map.locations.1.png`

| Field | Value |
|---|---|
| Image | 1448 × 1088 px (about 1.6 MP) or larger with the same proportions — 4 columns × 3 rows, cells 362 × 363 px |
| Cells | row 1, cell 1: `map.site.watchtower` — a tall stone watchtower with a banner (about 1.0 hex wide)<br>row 1, cell 2: `map.site.crossing_bridge` — an old stone bridge over a stream (about 1.35 hex wide)<br>row 1, cell 3: `map.site.crossing_pass` — a narrow mountain pass between two rocky crags (about 1.2 hex wide)<br>row 1, cell 4: `map.site.nest` — a creature lair: a rocky nest of branches and bones (about 1.1 hex wide)<br>row 2, cell 1: `map.site.refuge` — a sheltered refuge: a small stone hut with a healing spring (about 1.0 hex wide)<br>row 2, cell 2: `map.site.quarry_cache` — a cache of dressed stone blocks under a tarp (about 0.9 hex wide)<br>row 2, cell 3: `map.site.grove` — a sacred grove: a great old tree in a ring of standing stones (about 1.15 hex wide)<br>row 2, cell 4: `map.site.beacon` — a beacon: an iron fire-basket on a stone altar (about 1.0 hex wide)<br>row 3, cell 1: `map.site.relay` — a small relay fire on a cairn (about 0.9 hex wide)<br>row 3, cell 2: `map.site.gate` — a barred gate blocking a pass between rocks (about 1.0 hex wide)<br>row 3, cell 3: `map.site.key_gate` — a keymaster's barrier: a stone gateway with a heavy lock (the game adds the key colour) (about 1.0 hex wide)<br>row 3, cell 4: `map.site.camp` — a creature camp: tents around a campfire (about 1.0 hex wide) |
| Attach | `assets-source/ui/sheets/map-markers-sheet.png` (approved look of map objects) |
| Status | placeholder (concept-sheet crops; procedural decoration) |

```text
Create one sheet of adventure-map objects for Pantheon Realms: 4 columns × 3 rows of equal square cells, image 1448 × 1088 px (or larger, same proportions). No grid lines, no borders, no labels, no numbers, no text. Every item stays inside its own cell with clear empty space around it; nothing touches or crosses a cell edge.
Row 1, cell 1: a tall stone watchtower with a banner, about 55% of the cell width.
Row 1, cell 2: an old stone bridge over a stream, about 74% of the cell width.
Row 1, cell 3: a narrow mountain pass between two rocky crags, about 66% of the cell width.
Row 1, cell 4: a creature lair: a rocky nest of branches and bones, about 60% of the cell width.
Row 2, cell 1: a sheltered refuge: a small stone hut with a healing spring, about 55% of the cell width.
Row 2, cell 2: a cache of dressed stone blocks under a tarp, about 49% of the cell width.
Row 2, cell 3: a sacred grove: a great old tree in a ring of standing stones, about 63% of the cell width.
Row 2, cell 4: a beacon: an iron fire-basket on a stone altar, about 55% of the cell width.
Row 3, cell 1: a small relay fire on a cairn, about 49% of the cell width.
Row 3, cell 2: a barred gate blocking a pass between rocks, about 55% of the cell width.
Row 3, cell 3: a keymaster's barrier: a stone gateway with a heavy lock (the game adds the key colour), about 55% of the cell width.
Row 3, cell 4: a creature camp: tents around a campfire, about 55% of the cell width.
Every object stands on the cell's ground line at 88% of the cell height, centred, with a small ground skirt; elevated strategy-map camera about 35° above the horizon; all at the same map scale.
Match the painterly style of the attached map-marker sheet. Modern high-resolution fantasy strategy-game art. Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). No text, no owner banner, no cast shadow beyond the ground skirt.
```

### E · `sheet.map.locations.2.png`

| Field | Value |
|---|---|
| Image | 1256 × 1256 px (about 1.6 MP) or larger with the same proportions — 4 columns × 4 rows, cells 314 × 314 px |
| Cells | row 1, cell 1: `map.site.event_site` — a wayside shrine with a weathered statue (about 1.0 hex wide)<br>row 1, cell 2: `map.site.relic` — a relic shrine: a golden reliquary on a stepped stone platform (about 1.15 hex wide)<br>row 1, cell 3: `map.site.portal` — a two-way portal: a stone arch around a glowing veil (about 1.1 hex wide)<br>row 1, cell 4: `map.site.learning_stone` — a tall carved standing stone with a glowing mark (no readable writing) (about 0.95 hex wide)<br>row 2, cell 1: `map.site.spell_shrine` — a small domed shrine with a floating glowing orb (about 0.9 hex wide)<br>row 2, cell 2: `map.site.skill_trainer` — a training ground: a weapon rack, practice post and target under an awning (about 1.0 hex wide)<br>row 2, cell 3: `map.site.quest_hut` — a scholar's hut with scrolls and a lantern (about 0.95 hex wide)<br>row 2, cell 4: `map.site.key_tent` — a keymaster's striped tent (the game adds a coloured key pennant) (about 1.0 hex wide)<br>row 3, cell 1: `map.site.prison` — a ruined prison tower with a barred door (about 1.15 hex wide)<br>row 3, cell 2: `map.site.windmill` — a windmill with four sails (about 1.05 hex wide)<br>row 3, cell 3: `map.decor.tree` — a single broad-leaved tree (about 0.45 hex wide)<br>row 3, cell 4: `map.decor.pine` — a single pine tree (about 0.35 hex wide)<br>row 4, cell 1: `map.decor.rock` — a small rock (about 0.3 hex wide)<br>row 4, cell 2: `map.decor.shrub` — a low shrub (about 0.3 hex wide)<br>row 4, cell 3: `map.decor.grass` — a tuft of tall grass (about 0.2 hex wide)<br>row 4, cell 4: `map.decor.mountain` — a rocky mountain peak with a snow cap (fills one mountain hex) (about 1.0 hex wide) |
| Attach | `assets-source/ui/sheets/map-markers-sheet.png` (approved look of map objects); `assets-runtime/art/terrain/terrain.temperate.plains.webp` (the ground decoration stands on) |
| Status | placeholder (concept-sheet crops; procedural decoration) |

```text
Create one sheet of adventure-map objects for Pantheon Realms: 4 columns × 4 rows of equal square cells, image 1256 × 1256 px (or larger, same proportions). No grid lines, no borders, no labels, no numbers, no text. Every item stays inside its own cell with clear empty space around it; nothing touches or crosses a cell edge.
Row 1, cell 1: a wayside shrine with a weathered statue, about 55% of the cell width.
Row 1, cell 2: a relic shrine: a golden reliquary on a stepped stone platform, about 63% of the cell width.
Row 1, cell 3: a two-way portal: a stone arch around a glowing veil, about 60% of the cell width.
Row 1, cell 4: a tall carved standing stone with a glowing mark (no readable writing), about 52% of the cell width.
Row 2, cell 1: a small domed shrine with a floating glowing orb, about 49% of the cell width.
Row 2, cell 2: a training ground: a weapon rack, practice post and target under an awning, about 55% of the cell width.
Row 2, cell 3: a scholar's hut with scrolls and a lantern, about 52% of the cell width.
Row 2, cell 4: a keymaster's striped tent (the game adds a coloured key pennant), about 55% of the cell width.
Row 3, cell 1: a ruined prison tower with a barred door, about 63% of the cell width.
Row 3, cell 2: a windmill with four sails, about 57% of the cell width.
Row 3, cell 3: a single broad-leaved tree, about 25% of the cell width.
Row 3, cell 4: a single pine tree, about 19% of the cell width.
Row 4, cell 1: a small rock, about 16% of the cell width.
Row 4, cell 2: a low shrub, about 16% of the cell width.
Row 4, cell 3: a tuft of tall grass, about 11% of the cell width.
Row 4, cell 4: a rocky mountain peak with a snow cap (fills one mountain hex), about 55% of the cell width.
Every object stands on the cell's ground line at 88% of the cell height, centred, with a small ground skirt; elevated strategy-map camera about 35° above the horizon; all at the same map scale.
Match the painterly style of the attached map-marker sheet. Modern high-resolution fantasy strategy-game art. Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). No text, no owner banner, no cast shadow beyond the ground skirt.
```

## Group F — Battlefield backgrounds (optional, one painting per image)

The six temperate paintings are final and used in every climate. Climate variants are optional: the game picks `battlefield.<archetype>.ground.<climate>` when it exists (ASSET_PIPELINE.md §13). These are full paintings and cannot share an image. Format and composition exactly as Brief 2 §6: seen from above and foreshortened by the game, the quiet centre left calm for the hex board. Files → `assets-source/art/final/` (then `npm run art:import`).

| Asset ID | File | Archetype | Climate | Attach |
|---|---|---|---|---|
| `battlefield.beacon_clearing.ground.autumn` | `battlefield.beacon_clearing.ground.autumn.png` | beacon clearing | autumn | `assets-source/art/final/battlefield.beacon_clearing.ground.png`; `assets-source/art/final/terrain.autumn.plains.png` |
| `battlefield.beacon_clearing.ground.coast` | `battlefield.beacon_clearing.ground.coast.png` | beacon clearing | coast | `assets-source/art/final/battlefield.beacon_clearing.ground.png`; `assets-source/art/final/terrain.coast.plains.png` |
| `battlefield.beacon_clearing.ground.desert` | `battlefield.beacon_clearing.ground.desert.png` | beacon clearing | desert | `assets-source/art/final/battlefield.beacon_clearing.ground.png`; `assets-source/art/final/terrain.desert.plains.png` |
| `battlefield.beacon_clearing.ground.fjord` | `battlefield.beacon_clearing.ground.fjord.png` | beacon clearing | fjord | `assets-source/art/final/battlefield.beacon_clearing.ground.png`; `assets-source/art/final/terrain.fjord.plains.png` |
| `battlefield.beacon_clearing.ground.high_pass` | `battlefield.beacon_clearing.ground.high_pass.png` | beacon clearing | high pass | `assets-source/art/final/battlefield.beacon_clearing.ground.png`; `assets-source/art/final/terrain.high_pass.plains.png` |
| `battlefield.beacon_clearing.ground.jungle` | `battlefield.beacon_clearing.ground.jungle.png` | beacon clearing | jungle | `assets-source/art/final/battlefield.beacon_clearing.ground.png`; `assets-source/art/final/terrain.jungle.plains.png` |
| `battlefield.beacon_clearing.ground.moor` | `battlefield.beacon_clearing.ground.moor.png` | beacon clearing | moor | `assets-source/art/final/battlefield.beacon_clearing.ground.png`; `assets-source/art/final/terrain.moor.plains.png` |
| `battlefield.beacon_clearing.ground.storm_plateau` | `battlefield.beacon_clearing.ground.storm_plateau.png` | beacon clearing | storm plateau | `assets-source/art/final/battlefield.beacon_clearing.ground.png`; `assets-source/art/final/terrain.storm_plateau.plains.png` |
| `battlefield.beacon_clearing.ground.tundra` | `battlefield.beacon_clearing.ground.tundra.png` | beacon clearing | tundra | `assets-source/art/final/battlefield.beacon_clearing.ground.png`; `assets-source/art/final/terrain.tundra.plains.png` |
| `battlefield.coast_road.ground.autumn` | `battlefield.coast_road.ground.autumn.png` | coast road | autumn | `assets-source/art/final/battlefield.coast_road.ground.png`; `assets-source/art/final/terrain.autumn.plains.png` |
| `battlefield.coast_road.ground.coast` | `battlefield.coast_road.ground.coast.png` | coast road | coast | `assets-source/art/final/battlefield.coast_road.ground.png`; `assets-source/art/final/terrain.coast.plains.png` |
| `battlefield.coast_road.ground.desert` | `battlefield.coast_road.ground.desert.png` | coast road | desert | `assets-source/art/final/battlefield.coast_road.ground.png`; `assets-source/art/final/terrain.desert.plains.png` |
| `battlefield.coast_road.ground.fjord` | `battlefield.coast_road.ground.fjord.png` | coast road | fjord | `assets-source/art/final/battlefield.coast_road.ground.png`; `assets-source/art/final/terrain.fjord.plains.png` |
| `battlefield.coast_road.ground.high_pass` | `battlefield.coast_road.ground.high_pass.png` | coast road | high pass | `assets-source/art/final/battlefield.coast_road.ground.png`; `assets-source/art/final/terrain.high_pass.plains.png` |
| `battlefield.coast_road.ground.jungle` | `battlefield.coast_road.ground.jungle.png` | coast road | jungle | `assets-source/art/final/battlefield.coast_road.ground.png`; `assets-source/art/final/terrain.jungle.plains.png` |
| `battlefield.coast_road.ground.moor` | `battlefield.coast_road.ground.moor.png` | coast road | moor | `assets-source/art/final/battlefield.coast_road.ground.png`; `assets-source/art/final/terrain.moor.plains.png` |
| `battlefield.coast_road.ground.storm_plateau` | `battlefield.coast_road.ground.storm_plateau.png` | coast road | storm plateau | `assets-source/art/final/battlefield.coast_road.ground.png`; `assets-source/art/final/terrain.storm_plateau.plains.png` |
| `battlefield.coast_road.ground.tundra` | `battlefield.coast_road.ground.tundra.png` | coast road | tundra | `assets-source/art/final/battlefield.coast_road.ground.png`; `assets-source/art/final/terrain.tundra.plains.png` |
| `battlefield.grove.ground.autumn` | `battlefield.grove.ground.autumn.png` | grove | autumn | `assets-source/art/final/battlefield.grove.ground.png`; `assets-source/art/final/terrain.autumn.plains.png` |
| `battlefield.grove.ground.coast` | `battlefield.grove.ground.coast.png` | grove | coast | `assets-source/art/final/battlefield.grove.ground.png`; `assets-source/art/final/terrain.coast.plains.png` |
| `battlefield.grove.ground.desert` | `battlefield.grove.ground.desert.png` | grove | desert | `assets-source/art/final/battlefield.grove.ground.png`; `assets-source/art/final/terrain.desert.plains.png` |
| `battlefield.grove.ground.fjord` | `battlefield.grove.ground.fjord.png` | grove | fjord | `assets-source/art/final/battlefield.grove.ground.png`; `assets-source/art/final/terrain.fjord.plains.png` |
| `battlefield.grove.ground.high_pass` | `battlefield.grove.ground.high_pass.png` | grove | high pass | `assets-source/art/final/battlefield.grove.ground.png`; `assets-source/art/final/terrain.high_pass.plains.png` |
| `battlefield.grove.ground.jungle` | `battlefield.grove.ground.jungle.png` | grove | jungle | `assets-source/art/final/battlefield.grove.ground.png`; `assets-source/art/final/terrain.jungle.plains.png` |
| `battlefield.grove.ground.moor` | `battlefield.grove.ground.moor.png` | grove | moor | `assets-source/art/final/battlefield.grove.ground.png`; `assets-source/art/final/terrain.moor.plains.png` |
| `battlefield.grove.ground.storm_plateau` | `battlefield.grove.ground.storm_plateau.png` | grove | storm plateau | `assets-source/art/final/battlefield.grove.ground.png`; `assets-source/art/final/terrain.storm_plateau.plains.png` |
| `battlefield.grove.ground.tundra` | `battlefield.grove.ground.tundra.png` | grove | tundra | `assets-source/art/final/battlefield.grove.ground.png`; `assets-source/art/final/terrain.tundra.plains.png` |
| `battlefield.open_field.ground.autumn` | `battlefield.open_field.ground.autumn.png` | open field | autumn | `assets-source/art/final/battlefield.open_field.ground.png`; `assets-source/art/final/terrain.autumn.plains.png` |
| `battlefield.open_field.ground.coast` | `battlefield.open_field.ground.coast.png` | open field | coast | `assets-source/art/final/battlefield.open_field.ground.png`; `assets-source/art/final/terrain.coast.plains.png` |
| `battlefield.open_field.ground.desert` | `battlefield.open_field.ground.desert.png` | open field | desert | `assets-source/art/final/battlefield.open_field.ground.png`; `assets-source/art/final/terrain.desert.plains.png` |
| `battlefield.open_field.ground.fjord` | `battlefield.open_field.ground.fjord.png` | open field | fjord | `assets-source/art/final/battlefield.open_field.ground.png`; `assets-source/art/final/terrain.fjord.plains.png` |
| `battlefield.open_field.ground.high_pass` | `battlefield.open_field.ground.high_pass.png` | open field | high pass | `assets-source/art/final/battlefield.open_field.ground.png`; `assets-source/art/final/terrain.high_pass.plains.png` |
| `battlefield.open_field.ground.jungle` | `battlefield.open_field.ground.jungle.png` | open field | jungle | `assets-source/art/final/battlefield.open_field.ground.png`; `assets-source/art/final/terrain.jungle.plains.png` |
| `battlefield.open_field.ground.moor` | `battlefield.open_field.ground.moor.png` | open field | moor | `assets-source/art/final/battlefield.open_field.ground.png`; `assets-source/art/final/terrain.moor.plains.png` |
| `battlefield.open_field.ground.storm_plateau` | `battlefield.open_field.ground.storm_plateau.png` | open field | storm plateau | `assets-source/art/final/battlefield.open_field.ground.png`; `assets-source/art/final/terrain.storm_plateau.plains.png` |
| `battlefield.open_field.ground.tundra` | `battlefield.open_field.ground.tundra.png` | open field | tundra | `assets-source/art/final/battlefield.open_field.ground.png`; `assets-source/art/final/terrain.tundra.plains.png` |
| `battlefield.plateau.ground.autumn` | `battlefield.plateau.ground.autumn.png` | plateau | autumn | `assets-source/art/final/battlefield.plateau.ground.png`; `assets-source/art/final/terrain.autumn.plains.png` |
| `battlefield.plateau.ground.coast` | `battlefield.plateau.ground.coast.png` | plateau | coast | `assets-source/art/final/battlefield.plateau.ground.png`; `assets-source/art/final/terrain.coast.plains.png` |
| `battlefield.plateau.ground.desert` | `battlefield.plateau.ground.desert.png` | plateau | desert | `assets-source/art/final/battlefield.plateau.ground.png`; `assets-source/art/final/terrain.desert.plains.png` |
| `battlefield.plateau.ground.fjord` | `battlefield.plateau.ground.fjord.png` | plateau | fjord | `assets-source/art/final/battlefield.plateau.ground.png`; `assets-source/art/final/terrain.fjord.plains.png` |
| `battlefield.plateau.ground.high_pass` | `battlefield.plateau.ground.high_pass.png` | plateau | high pass | `assets-source/art/final/battlefield.plateau.ground.png`; `assets-source/art/final/terrain.high_pass.plains.png` |
| `battlefield.plateau.ground.jungle` | `battlefield.plateau.ground.jungle.png` | plateau | jungle | `assets-source/art/final/battlefield.plateau.ground.png`; `assets-source/art/final/terrain.jungle.plains.png` |
| `battlefield.plateau.ground.moor` | `battlefield.plateau.ground.moor.png` | plateau | moor | `assets-source/art/final/battlefield.plateau.ground.png`; `assets-source/art/final/terrain.moor.plains.png` |
| `battlefield.plateau.ground.storm_plateau` | `battlefield.plateau.ground.storm_plateau.png` | plateau | storm plateau | `assets-source/art/final/battlefield.plateau.ground.png`; `assets-source/art/final/terrain.storm_plateau.plains.png` |
| `battlefield.plateau.ground.tundra` | `battlefield.plateau.ground.tundra.png` | plateau | tundra | `assets-source/art/final/battlefield.plateau.ground.png`; `assets-source/art/final/terrain.tundra.plains.png` |
| `battlefield.ridge_pass.ground.autumn` | `battlefield.ridge_pass.ground.autumn.png` | ridge pass | autumn | `assets-source/art/final/battlefield.ridge_pass.ground.png`; `assets-source/art/final/terrain.autumn.plains.png` |
| `battlefield.ridge_pass.ground.coast` | `battlefield.ridge_pass.ground.coast.png` | ridge pass | coast | `assets-source/art/final/battlefield.ridge_pass.ground.png`; `assets-source/art/final/terrain.coast.plains.png` |
| `battlefield.ridge_pass.ground.desert` | `battlefield.ridge_pass.ground.desert.png` | ridge pass | desert | `assets-source/art/final/battlefield.ridge_pass.ground.png`; `assets-source/art/final/terrain.desert.plains.png` |
| `battlefield.ridge_pass.ground.fjord` | `battlefield.ridge_pass.ground.fjord.png` | ridge pass | fjord | `assets-source/art/final/battlefield.ridge_pass.ground.png`; `assets-source/art/final/terrain.fjord.plains.png` |
| `battlefield.ridge_pass.ground.high_pass` | `battlefield.ridge_pass.ground.high_pass.png` | ridge pass | high pass | `assets-source/art/final/battlefield.ridge_pass.ground.png`; `assets-source/art/final/terrain.high_pass.plains.png` |
| `battlefield.ridge_pass.ground.jungle` | `battlefield.ridge_pass.ground.jungle.png` | ridge pass | jungle | `assets-source/art/final/battlefield.ridge_pass.ground.png`; `assets-source/art/final/terrain.jungle.plains.png` |
| `battlefield.ridge_pass.ground.moor` | `battlefield.ridge_pass.ground.moor.png` | ridge pass | moor | `assets-source/art/final/battlefield.ridge_pass.ground.png`; `assets-source/art/final/terrain.moor.plains.png` |
| `battlefield.ridge_pass.ground.storm_plateau` | `battlefield.ridge_pass.ground.storm_plateau.png` | ridge pass | storm plateau | `assets-source/art/final/battlefield.ridge_pass.ground.png`; `assets-source/art/final/terrain.storm_plateau.plains.png` |
| `battlefield.ridge_pass.ground.tundra` | `battlefield.ridge_pass.ground.tundra.png` | ridge pass | tundra | `assets-source/art/final/battlefield.ridge_pass.ground.png`; `assets-source/art/final/terrain.tundra.plains.png` |

```text
Using the attached temperate battlefield painting as the layout and the attached terrain texture as the climate, repaint the battlefield [ARCHETYPE] for the [CLIMATE] climate for Pantheon Realms, at the same size and proportions as the attached painting, seen from above. Keep the composition: the calm central area stays open, even ground for the hex board; features stay toward the edges. Painterly high-resolution fantasy strategy-game art, soft daylight. No creatures, no people, no text, no hex grid.
```

## Group G — Battlefield obstacles and siege pieces

Transparent obstacles stand on the cells the rules block (the art never decides which cells are blocked). Battle camera (elevated side / three-quarter, ~20°), the same light as the creature sheets.

### G · `sheet.battle.obstacles.png`

| Field | Value |
|---|---|
| Image | 1776 × 888 px (about 1.6 MP) or larger with the same proportions — 4 columns × 2 rows, cells 444 × 444 px |
| Cells | row 1, cell 1: `battle.obstacle.rock` — a waist-high rock (about 0.8 hex wide)<br>row 1, cell 2: `battle.obstacle.boulder` — a large boulder (about 1.0 hex wide)<br>row 1, cell 3: `battle.obstacle.log` — a fallen log (about 1.0 hex wide)<br>row 1, cell 4: `battle.obstacle.tree` — a single tree (about 0.9 hex wide)<br>row 2, cell 1: `battle.obstacle.stump` — a broad tree stump (about 0.7 hex wide)<br>row 2, cell 2: `battle.obstacle.column` — a broken marble column (about 0.5 hex wide)<br>row 2, cell 3: `battle.obstacle.stone_circle` — three short standing stones (about 1.0 hex wide) |
| Scale | a cell is 2.13 battle-hex widths square; ground line at 88 % of the cell height |
| Attach | `assets-runtime/art/battle/battlefield.open_field.ground.webp`; one finished creature sheet (for scale) |
| Status | placeholder (procedural) |

```text
Create one sheet of battlefield obstacles for Pantheon Realms: 4 columns × 2 rows of equal square cells, image 1776 × 888 px (or larger). No grid lines, no borders, no labels, no numbers, no text. Every item stays inside its own cell with clear empty space around it; nothing touches or crosses a cell edge.
Row 1, cell 1: a waist-high rock, about 38% of the cell width.
Row 1, cell 2: a large boulder, about 47% of the cell width.
Row 1, cell 3: a fallen log, about 47% of the cell width.
Row 1, cell 4: a single tree, about 42% of the cell width.
Row 2, cell 1: a broad tree stump, about 33% of the cell width.
Row 2, cell 2: a broken marble column, about 23% of the cell width.
Row 2, cell 3: three short standing stones, about 47% of the cell width.
Row 2, cell 4: empty (leave it empty).
Each stands on the cell's ground line at 88% of the cell height, centred. The fixed elevated side / three-quarter battle camera (about 20° above the horizon). Neutral colours that sit on every battlefield. Painterly high-resolution fantasy strategy-game style. Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). No shadow, no text.
```

### G · `sheet.battle.siege.png`

| Field | Value |
|---|---|
| Image | 1088 × 1448 px (about 1.6 MP) or larger with the same proportions — 3 columns × 4 rows, cells 363 × 362 px |
| Cells | rows: 1 wall, 2 gate, 3 tower, 4 keep; columns: 1 intact, 2 damaged, 3 rubble |
| Scale | a cell is 3.2 battle-hex widths square; ground line at 88 % of the cell height; wall, gate and tower one hex wide, the keep about 1.6 |
| Attach | `assets-runtime/art/battle/battlefield.beacon_clearing.ground.webp` |
| Status | placeholder (procedural) |

```text
Create one sheet of town-siege pieces for Pantheon Realms: 3 columns × 4 rows of equal square cells, image 1088 × 1448 px (or larger). No grid lines, no borders, no labels, no numbers, no text. Every item stays inside its own cell with clear empty space around it; nothing touches or crosses a cell edge.
Row 1: a section of crenellated town wall, one hex wide — left intact; middle battered: cracked stones, a chunk knocked out of the top; right destroyed: a low heap of rubble and broken timber.
Row 2: a fortified gatehouse door between two stone posts, one hex wide — left intact; middle battered: cracked stones, a chunk knocked out of the top; right destroyed: a low heap of rubble and broken timber.
Row 3: a round arrow tower with a conical roof, one hex wide — left intact; middle battered: cracked stones, a chunk knocked out of the top; right destroyed: a low heap of rubble and broken timber.
Row 4: the town keep: a tall square tower about 1.6 hexes wide — left intact; middle battered: cracked stones, a chunk knocked out of the top; right destroyed: a low heap of rubble and broken timber.
The same stone and timber in all three states and all four pieces. Each stands on the cell's ground line at 88% of the cell height, centred, at the scale stated. The fixed elevated side / three-quarter battle camera. Painterly high-resolution fantasy style. Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). No text.
```

## Group H — Spell and combat effects, projectiles

Only effects the game plays (the rules decide every result; effects are drawn after it). One sheet: one row per effect, 6 frames left to right (build-up, peak, fade to nothing), centred in the cells with the target's ground point at 62 % of the cell height; a cell is 1.6 battle-hex widths. The last row holds the projectiles. Cut into `sprite.fx.<effect>.png` and `sprite.battle.projectile.<kind>.png`.

### H · `sheet.fx.png`

| Field | Value |
|---|---|
| Image | 968 × 1616 px (about 1.6 MP) or larger with the same proportions — 6 columns × 10 rows, cells 161 × 162 px |
| Rows | 1. `fx.impact` — a melee hit: a bright short burst and sparks<br>2. `fx.spell.damage` — a striking bolt of power hitting one target (lightning-like) (used by Spark, Lightning, Apollo’s Arrow, Wrath of Sekhmet, Kitsune-bi)<br>3. `fx.spell.area` — a blast hitting a target and the cells around it (spreads over most of the cell) (used by Thunderclap, Scarab Swarm, Wild Hunt, Obsidian Rain, Ember Burst, Starfall…)<br>4. `fx.spell.heal` — healing: soft green-gold motes rising (used by Mend, Hearthlight, Renewal, Ankh of Renewal, Balance of Ma’at, Cauldron of the Dagda…)<br>5. `fx.spell.buff` — a blessing: a golden ring of light rising around the target<br>6. `fx.spell.curse` — a curse: violet smoke coiling down around the target<br>7. `fx.ward` — a creature's protective ward: a translucent shield dome<br>8. `fx.morale.up` — high morale: a golden star rising<br>9. `fx.morale.down` — low morale: a red downward swirl<br>10. projectiles: cell 1 `battle.projectile.arrow`, cell 2 `battle.projectile.stone` |
| Attach | one finished creature sheet (for scale) |
| Status | placeholder (procedural) |

```text
Create one sheet of battle effects for Pantheon Realms: 6 columns × 10 rows of equal square cells, image 968 × 1616 px (or larger, same proportions). No grid lines, no borders, no labels, no numbers, no text. Every item stays inside its own cell with clear empty space around it; nothing touches or crosses a cell edge.
Row 1: a melee hit: a bright short burst and sparks — 6 frames: 1 build-up, 2 growing, 3 peak, 4 peak fading, 5 fading, 6 almost gone.
Row 2: a striking bolt of power hitting one target (lightning-like) — 6 frames: 1 build-up, 2 growing, 3 peak, 4 peak fading, 5 fading, 6 almost gone.
Row 3: a blast hitting a target and the cells around it (spreads over most of the cell) — 6 frames: 1 build-up, 2 growing, 3 peak, 4 peak fading, 5 fading, 6 almost gone.
Row 4: healing: soft green-gold motes rising — 6 frames: 1 build-up, 2 growing, 3 peak, 4 peak fading, 5 fading, 6 almost gone.
Row 5: a blessing: a golden ring of light rising around the target — 6 frames: 1 build-up, 2 growing, 3 peak, 4 peak fading, 5 fading, 6 almost gone.
Row 6: a curse: violet smoke coiling down around the target — 6 frames: 1 build-up, 2 growing, 3 peak, 4 peak fading, 5 fading, 6 almost gone.
Row 7: a creature's protective ward: a translucent shield dome — 6 frames: 1 build-up, 2 growing, 3 peak, 4 peak fading, 5 fading, 6 almost gone.
Row 8: high morale: a golden star rising — 6 frames: 1 build-up, 2 growing, 3 peak, 4 peak fading, 5 fading, 6 almost gone.
Row 9: low morale: a red downward swirl — 6 frames: 1 build-up, 2 growing, 3 peak, 4 peak fading, 5 fading, 6 almost gone.
Row 10: cell 1: an arrow in flight, side view pointing right (about 50% of the cell width); cell 2: a thrown stone (about 15% of the cell width); the other cells empty.
Effects centred in their cells, the target's ground point at 62% of the cell height. Painterly high-resolution fantasy style, soft glow. Transparent background, or if transparency is impossible a perfectly flat pure black #000000 (the game adds these effects' light over the battlefield). No text.
```

## Checklist

A 12 · B 12 · C 102 · D 7 · E 4 · G 2 · H 1 — **140 sheets**, cut into 1097 files; F 54 optional paintings.

Single files in the names of `ASSET_PIPELINE.md` §4 are still accepted by `npm run sprites:import` (for a strip or object redone on its own).

