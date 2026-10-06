# Pantheon Realms — Art Brief 17 for GPT-6: THE FINAL VISUALS

_Written 2026-10-06 from the game itself (every manifest, the icon inventory and the screens). This is the last art request: it lists everything the game still shows as a stand-in or would draw better with painted art. Everything else is already final — see §8. The game already reads every file named here: a delivery is a copy plus one import command per part, never a code change._

## At a glance

| Part | What | Files | Size | Priority |
|---|---|---|---|---|
| A | **Ground transitions** — how each kind of ground reaches into its neighbour, so the map stops looking like tiles | 6 mask sheets | 1536 × 768 each (6 × 3 cells of 256 × 256), black and white | **highest** |
| B | **Shore foam** — the surf line where land meets water | 1 sheet | 1536 × 768, transparent | high (deliver with A's shore sheet) |
| C | **Town backgrounds**, repainted sharper (the last concept crops on a main screen; was Brief 13 Part A) | 6 | 2048 × 1536 (4:3), opaque | high |
| D | **Map markers** still cut from the concept pack: your hero, an enemy hero, a failed objective | 3 | 96 × 96 shown (larger masters welcome), transparent | medium |
| E | **The neutral map hero** — the mounted figure of a hero without a pantheon (today a drawn silhouette) | 20 strips | frames of 320 × 320, transparent | medium |
| F | **Story-character portraits** — 15 campaign characters and the Herald have a dialogue bust but no square portrait (a generated square stands in) | 16 | 256 × 256 shown (1024 masters welcome), opaque | medium |
| — | Roads (Brief 16) | 15 sheets | delivered 2026-10-06 | — |

Order of work: **A and B first** (one sheet, check it in the game, then the rest), then C, then D–F.

## 1. Rules for every image

* **Look.** The game's painted style, as in the delivered map-site sprites, ground paintings, town buildings and portraits: crisp painted forms, warm light from the upper left, a soft cool shadow side, readable shapes. Not photographic, not pixel art, not flat vector.
* **No text, letters, numbers, logos or watermarks** anywhere.
* **One file per asset, named exactly as listed**, PNG (sRGB). **Never enlarge** an image to reach a size: paint at the size or larger and scale down. If the tool's largest image is smaller than a size asked for, deliver its largest native size in the same proportions and say so (as for Briefs 14 and 15); sheets (Parts A, B) may be assembled from cells painted separately, as long as every cell keeps the guide's exact geometry.
* Attach the references named in each part.

## 2. Part A — Ground transitions (6 sheets)

**What the game does with them.** The adventure map paints each hex with its ground (plains, forest, rough, marsh, mountain, water — each climate has its own painting of each). Where two grounds meet, the *higher* one reaches into the lower one's hex across their shared edge — order, lowest to highest: **water, marsh, plains, rough, forest, mountain** — and any land reaches into water as a shore. The game fills the reaching shape **with the reaching ground's own painting**, so one set of shapes serves every climate. What GPT-6 paints is only the **shapes**: masks, white where the neighbouring ground covers, black where it does not.

**The six sheets** (save in `assets-source/sprites/final/`):

| File | Character | Used where this ground reaches into a lower one | Shape | Depth into the hex |
|---|---|---|---|---|
| `sheet.ground.meadow.png` | meadow | plains | a soft, ragged grassy edge with tuft-shaped notches and a few small clumps just off the edge | 25–40 % |
| `sheet.ground.woodland.png` | woodland | forest | rounded lobes like the dark undergrowth at a wood's edge, with a few separate round bushes | 25–45 % |
| `sheet.ground.rocky.png` | rocky | rough ground | an angular, broken edge with chipped corners and small angular stones scattered beyond it | 20–40 % |
| `sheet.ground.boggy.png` | boggy | marsh | puddle-like rounded bays and inlets, soft and irregular, a few separate pools of shape | 25–40 % |
| `sheet.ground.scree.png` | scree | mountain | a fan of rubble spreading from the edge: angular pieces, some reaching further than others | 30–45 % |
| `sheet.ground.shore.png` | shore | any land into water | one smooth, gently curving coastline (a beach line), no separate pieces | 15–35 % |

**The sheet** (attach `assets-source/art/briefs/guides/ground.edges.layout.png`; for the shore sheet `ground.shore.layout.png`; and `ground.join-example.png` to show how it ends up on the map):

* 6 columns × 3 rows of 256 × 256 px cells, 1536 × 768 px, no gutters. **Column = the edge** the neighbour lies across, left to right: **e** (right), **se** (lower right), **sw** (lower left), **w** (left), **nw** (upper left), **ne** (upper right). **Row = a variant**: three different shapes for each edge, so long borders do not repeat.
* In every cell sits one hex exactly as on the guide: pointy-top, 224 px wide between its vertical sides, centred, **foreshortened to 84 % in height** like the map. The cell's edge is the thick white line on the guide.
* **Black background, white shape** (pure greyscale; a soft 2–6 px anti-aliased boundary is welcome, no larger blur).
* The white shape **runs along the whole marked edge** (it continues the neighbouring ground) and reaches into the hex no further than the light band on the guide: deepest near the edge's middle (the character's depth above), about a third as deep near the edge's two corners — so the pieces of two neighbouring edges join without a notch. **Nothing white on the other five edges**, nothing outside the hex (the game clips to the hex anyway).
* **No holes** inside a shape (a pool is a bay open to the edge, not a black hole in the white). Separate small pieces just off the main shape are fine, except on the shore sheet.
* Vary the three rows clearly; avoid shapes that look like a repeated stamp.

```text
Paint a sheet of black-and-white masks for a hex-map game, 1536 × 768 px, 6 columns × 3 rows of 256 × 256 px cells laid out exactly as the attached guide. In each cell, a pure white shape on pure black: the edge of [CHARACTER: e.g. a forest's dark undergrowth — rounded lobes and a few separate round bushes] reaching into the hex across the edge marked in white on the guide. The white runs along that whole edge and reaches inward no further than the light band (deepest in the middle, shallower towards the corners). Nothing white on the hex's other edges, no holes inside the shapes, no other colours, no text. Three clearly different shapes per column.
```

**Check before delivering:** lay the guide over the sheet at 50 % opacity — every white shape touches its marked edge along its whole length and stays inside the light band.

## 3. Part B — Shore foam (1 sheet)

`assets-source/sprites/final/sheet.ground.shore.foam.png`: the same layout as the shore mask (attach your `sheet.ground.shore.png` and `ground.shore.layout.png`). In each cell, a **thin line of white surf and foam (8–20 px) following the outline of the shore mask in the same cell**, on its water side, a little lighter and broken where it fades towards the corners; a faint pale rim of wet sand on the land side is fine. **Transparent background**, nothing else in the cell (no water, no ground — the game paints those). The game draws the foam over the water hex exactly where it draws the matching shore shape, so the two must line up cell for cell.

## 4. Part C — Town backgrounds (6)

The town screen paints the 18 buildings over a background painting. The six backgrounds are still the owner's concept paintings at 1448 × 1086 px, cropped for the game — they look right but soft on large screens. Repaint each at **2048 × 1536 px** (the same 4:3; if the tool cannot paint that size, its largest native 4:3 image, not enlarged — anything sharper than today is an improvement) and keep the composition **exactly**: every plot where a building stands stays where it is, at the same size, **empty** (the game draws the buildings there; they were painted for these plots in Briefs 10 and 12). Attach today's painting as the base and its layout guide as the check: `assets-source/art/briefs/guides/town.<pantheon>.layout.png` marks every location's footprint (blue: dwellings, gold: services); `town-placements.json` beside it gives the same in numbers.

| Pantheon | Deliver as | Today (attach) | Keep |
|---|---|---|---|
| Greek | `assets-source/art/final/town.greek.background.png` | `assets-runtime/placeholders/town/greek/background.jpg` + `assets-source/art/briefs/guides/town.greek.layout.png` | white-marble terraces stepping down a sunlit sea cliff, waterfalls into a blue bay, cypresses, a great statue and temple on the summit, snowy mountains far behind |
| Norse | `assets-source/art/final/town.norse.background.png` | `assets-runtime/placeholders/town/norse/background.jpg` + `assets-source/art/briefs/guides/town.norse.layout.png` | stone and timber terraces over frozen waterfalls in a snowy fjord, pines, braziers, a giant warrior statue and a fortress gate at the top, the aurora in the night sky |
| Egyptian | `assets-source/art/final/town.egyptian.background.png` | `assets-runtime/placeholders/town/egyptian/background.jpg` + `assets-source/art/briefs/guides/town.egyptian.layout.png` | sandstone terraces and quays over waterfalls into the green Nile, palms, obelisks and sphinxes, a sailing boat, the pyramids and a temple city on the horizon |
| Japanese | `assets-source/art/final/town.japanese.background.png` | `assets-runtime/placeholders/town/japanese/background.jpg` + `assets-source/art/briefs/guides/town.japanese.layout.png` | terraces on misty cliffs joined by red arched bridges, waterfalls, cherry trees in blossom, torii gates, pagodas and a snow-capped mountain at sunset |
| Celtic | `assets-source/art/final/town.celtic.background.png` | `assets-runtime/placeholders/town/celtic/background.jpg` + `assets-source/art/briefs/guides/town.celtic.layout.png` | mossy terraces among waterfalls in a misty highland valley, standing stones, a giant oak on the left, a stag statue and a stone arch on the far crag |
| Mesoamerican | `assets-source/art/final/town.mesoamerican.background.png` | `assets-runtime/placeholders/town/mesoamerican/background.jpg` + `assets-source/art/briefs/guides/town.mesoamerican.layout.png` | stepped stone terraces and causeways over turquoise pools and waterfalls in the rainforest, crimson banners, a great sun temple on the central axis at sunrise |

```text
Repaint the attached town background for the fantasy strategy game Pantheon Realms at 2048 × 1536 px, keeping its composition exactly: the same terraces, plots, paths, bridges, waterfalls and horizon in the same places and at the same sizes (the second attachment marks every plot that must stay an empty, flat, walkable platform — the game paints the buildings there). Sharpen and enrich the painting: crisper stone, water and foliage, warm light, atmospheric depth. No buildings on the marked plots, no people, no text, no frame.
```

**Check before delivering:** lay the layout guide over the repaint at 50 % opacity — every marked plot must still be an empty platform of the same size in the same place. A repaint that moves a plot cannot be used (the buildings would float).

## 5. Part D — Map markers (3)

Small markers in the style of the delivered Brief 13 markers (attach `assets-runtime/ui/icons/final/icon.marker.town.png` and `icon.marker.hostile-town.png`): painted metal-and-enamel, gold rim, transparent background, readable at 32 px. Save in `assets-source/icons/final/` (larger masters are scaled to 96 px).

| File | Shown | Draw |
|---|---|---|
| `icon.marker.hero.png` | the tile panel over one of your heroes | a plumed hero's helmet with a **blue** plume over crossed reins |
| `icon.marker.enemy-hero.png` | the tile panel over another empire's hero | the same helmet with a **red** plume |
| `icon.marker.encounter.png` | a failed objective in the Journal | a torn banner on a broken spear |

## 6. Part E — The neutral map hero (20 strips)

A hero without a pantheon (some campaign and random-map heroes) rides the adventure map as a drawn silhouette. Paint a **mounted wandering captain**: a plain sturdy horse, a rider in a weathered travelling cloak and leather armour, a spear or sword, a small **plain white** pennant (the game adds the owner's colour in its own ring and flag) — no pantheon symbols. Match the scale, camera and look of the six pantheon heroes (attach `assets-runtime/sprites/final/heroes/greek/idle/e.webp`, `…/walk/e.webp` and `…/cast/e.webp`).

* Files: `assets-source/sprites/final/sprite.hero.neutral.<animation>.<direction>.png` for **animation** `idle` (4 frames), `walk` (6), `prepare` (6: drawing breath, raising the weapon), `cast` (6: weapon or hand thrust up, a short flash) and **direction** `e`, `ne`, `n`, `s`, `se` (the game mirrors the other three) — 20 strips.
* Each strip: frames of **320 × 320 px side by side** (idle 1280 × 320, the others 1920 × 320), transparent, the same scale and place in every frame, the ground point between the horse's hooves at **88 %** of the frame height, centred.

## 7. Part F — Story-character portraits (16)

Square portraits for characters that so far have only their dialogue bust. For each, **paint the same person as the attached bust** (`assets-runtime/art/busts/<id>.bust.webp`), head and shoulders, in the square format and style of the delivered hero portraits (attach `assets-runtime/ui/icons/final/hero.greek.alexios.portrait.webp` for format): an opaque painted background in the character's colours, warm key light, looking slightly to the side. Save as `assets-source/icons/final/<id>.portrait.png`, square, at least 256 px (1024 welcome).

| Portrait file | Bust to attach | Who |
|---|---|---|
| `hero.celtic.cathal.portrait.png` | `hero.celtic.cathal.bust.webp` | Cathal |
| `hero.celtic.sadb.portrait.png` | `hero.celtic.sadb.bust.webp` | Sadb |
| `hero.egyptian.nebet.portrait.png` | `hero.egyptian.nebet.bust.webp` | Nebet |
| `hero.egyptian.pawah.portrait.png` | `hero.egyptian.pawah.bust.webp` | Pawah |
| `hero.greek.ione.portrait.png` | `hero.greek.ione.bust.webp` | Ione |
| `hero.greek.thaleia.portrait.png` | `hero.greek.thaleia.bust.webp` | Thaleia |
| `hero.japanese.genzo.portrait.png` | `hero.japanese.genzo.bust.webp` | Genzo |
| `hero.japanese.shiro.portrait.png` | `hero.japanese.shiro.bust.webp` | Shiro |
| `hero.mesoamerican.chimal.portrait.png` | `hero.mesoamerican.chimal.bust.webp` | Chimal |
| `hero.mesoamerican.xoco.portrait.png` | `hero.mesoamerican.xoco.bust.webp` | Grandmother Xoco |
| `hero.norse.eydis.portrait.png` | `hero.norse.eydis.bust.webp` | Eydis |
| `hero.norse.jokul.portrait.png` | `hero.norse.jokul.bust.webp` | Jökul |
| `hero.norse.skeggi.portrait.png` | `hero.norse.skeggi.bust.webp` | Skeggi |
| `hero.norse.svanhild.portrait.png` | `hero.norse.svanhild.bust.webp` | Svanhild |
| `hero.norse.troll_wife.portrait.png` | `hero.norse.troll_wife.bust.webp` | The Troll-wife |
| `story.herald.portrait.png` | `story.herald.bust.webp` | The Herald |

## 8. Already final — nothing to paint

All 102 creature forms and their battle animations; the six pantheon map heroes (idle, walk, prepare, cast); every map site, decoration, obstacle and projectile; all magic and Favor effect strips; the catapult and its throw; every pantheon's walls, gates, towers and keeps; all battlefields (incl. 54 climate variants and six siege battlefields), terrain and sky paintings; town buildings at every level; god and hero portraits (74), dialogue busts (36), campaign covers, cards, mission pictures and endings; miracle cards, victory and defeat splashes, banners; every interface, resource, stat, spell, artifact, skill, ability, climate, marker, status and miracle icon (Brief 13); the six skirmish-map paintings; the road tiles of all five road types (Brief 16, delivered 2026-10-06); cursors and emblems. The opening paintings, logo, menu frame and app icon are the owner's chosen art and stay as they are. All sounds and music are final (not GPT-6 work).

## 9. How a delivery enters the game

| Part | Save in | Then run |
|---|---|---|
| A, B | `assets-source/sprites/final/` | `npm run ground:import` — checks every cell against the guide (white along the marked edge, nothing on the other edges or beyond the band), turns each mask into the game's edge shapes and writes them with the foam atlas to `assets-runtime/sprites/final/ground/`. The map uses painted transitions once all six mask sheets are in (until then it keeps today's softened hex edges); the foam once its sheet is in. |
| C | `assets-source/art/final/` | `npm run art:import` (the town screen shows the repaint in place of the concept painting; the importer warns on any proportion other than 4:3) |
| D, F | `assets-source/icons/final/` | `npm run icons:import -- --new` |
| E | `assets-source/sprites/final/` | `npm run sprites:import -- --only sprite.hero.neutral.` |

Then `npm run check`, and look: a random map of each climate (borders between grounds, coasts), each town screen (buildings on their plots), a hero's tile panel, the Journal, a neutral hero on the map, and the dialogue and journal portraits.

_Guides: `npm run art:ground-guides` (`tools/assets/briefs/ground_guides.py`) writes the Part A/B guides and `assets-source/sprites/ground-edges.json` from the game's own hex geometry; the town guides come from Brief 12 (`npm run art:brief12`)._
