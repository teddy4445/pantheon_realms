# Pantheon Realms — Art Brief 2 of 3 for GPT-6: GROUND AND SKY

**What this file is.** A complete production brief for **76 images**:
60 seamless ground textures (6 ground types × 10 climates), 6 battlefield
grounds and 10 sky backdrops — plus an optional second wave of 18 battlefield
variants. Every image has its own description, exact size and the **exact file
name** the game will look for.

**Who reads it.** GPT-6 (the image generator) and the person running it. The
sections "How to work", "Style" and the group rules apply to every image.

---

## 0. The game and where these images go

*Pantheon Realms* is a turn-based fantasy strategy game in the tradition of
classic hero-and-army strategy games: six mythological pantheons (Greek, Norse,
Egyptian, Japanese, Celtic, Mesoamerican) explore an **adventure map** made of
hexagonal tiles and fight on a **hex-grid battlefield**. Both are 3D scenes seen
from a fixed, high, angled camera.

* **Ground textures** are painted onto the tiles of the adventure map. Each tile
  has a ground type (plains, forest, rough, marsh, mountain, water) and each map
  has a climate (temperate, desert, tundra…). The game tiles the texture across
  the whole map in world space, so **it must repeat seamlessly** in every
  direction. Trees, peaks, rocks, towns and sites are separate 3D objects placed
  on top; the textures are only the ground under them.
* **Battlefield grounds** are painted onto the ground of the battle scene. The
  game draws the hex grid, the creatures and the obstacles (rocks, trees) on
  top.
* **Sky backdrops** are shown far behind the battlefield and around the edges of
  the adventure map, and give the scene its light and atmosphere.

---

## 1. How to work (rules for every image)

1. **One image per request**, at the exact pixel size given in its group. PNG,
   sRGB.
2. **Name the file exactly** as written (lowercase, dots and underscores). The
   game finds every image by this name.
3. **No text, letters, numbers, logos, signatures, watermarks, UI, frames or
   borders.** No people, creatures or animals unless the description asks for
   them.
4. Ground textures and battlefield grounds are **seen straight from above**
   (orthographic, no perspective, no horizon, no sky).
5. When the words and the reference images seem to disagree on style, **follow
   the reference images.**

---

## 2. Reference images to attach

| # | File in the project folder | What it shows | Use it for |
|---|---|---|---|
| R1 | `support images/ChatGPT Image Sep 29, 2026, 02_38_43 PM-4.png` | The game's adventure-map concept: painted hex-free terrain seen from above — coasts, forests, mountains, roads, clouds | **the target look of the ground textures**: painterly, rich, readable from above |
| R2 | `support images/ChatGPT Image Sep 29, 2026, 02_38_47 PM-7.png` | Battle-screen concept: a battlefield seen from an angle with units on hexes | the look of battlefield grounds |
| R3 | `support images/ChatGPT Image Sep 29, 2026, 04_11_16 PM-1.png` … `04_11_31 PM-6.png` (Greek, Norse, Egyptian, Japanese, Celtic, Mesoamerican town concepts) | Painted ground around buildings: grass, snow, sand, jungle, moss | ground materials per climate |
| R4 | `assets-source/ui/backgrounds/opening-*.png` (11 files) | The game's opening paintings: skies, clouds, light, mist | **the target look of the sky backdrops** |
| R5 | `support images/ChatGPT Image Sep 29, 2026, 02_38_36 PM-1.png` | The visual-direction board (palette, materials) | overall direction |

If you can attach only a few: **R1 and R3** for ground textures and battlefields,
**R4** for skies.

---

## 3. Style

* **Hand-painted game texture**, in the same painterly language as the
  references — rich, warm, slightly stylised natural materials with visible
  brush texture; **not** a photograph, **not** a 3D-scanned material, **not**
  flat vector or cartoon.
* **Readable from above at small size**: clear material, gentle variation, no
  noisy high-contrast detail. Hero markers, banners, paths and icons are drawn on
  top and must stay readable.
* **Light:** for textures and battlefield grounds, **even, neutral daylight from
  straight above** — soft contact shadows in crevices only, **no directional
  cast shadows, no sun glare, no vignetting**, no lighter or darker corners. The
  game lights the scene itself.
* **Colour:** natural, saturated like the references, never neon. Each texture
  below lists an **average colour** — the colour the game uses for that tile
  today (and on the minimap). Keep the overall average near it (a richer, more
  varied painting around that average is welcome).

---

## 4. Files in this brief

All files go into the project folder **`assets-source/art/final/`**.

| Group | Count | Size (px) | File name pattern |
|---|---|---|---|
| A. Ground textures (seamless) | 60 | 1024 × 1024 | `terrain.<climate>.<ground>.png` |
| B. Battlefield grounds | 6 | 4096 × 3200 | `battlefield.<battlefield>.ground.png` |
| C. Sky backdrops | 10 | 4096 × 1536 | `sky.<climate>.png` |
| B2. Battlefield climate variants (optional, second wave) | 18 | 4096 × 3200 | `battlefield.<battlefield>.ground.<climate>.png` |

**Climates** (`<climate>`), in priority order — generate in this order:

| Priority | Climate id | Where the game uses it | Character |
|---|---|---|---|
| 1 | `temperate` | Twin Harbors skirmish, most random maps, two rival-town missions | mild green lowlands |
| 2 | `high_pass` | highland random maps, six mountain missions | cool, bright alpine passes |
| 3 | `coast` | lake and marsh random maps, three island and coast missions | sunny sea coasts |
| 4 | `storm_plateau` | crossroads random maps, the four campaign finales | dark, wind-scoured heights under storms |
| 5 | `desert` | The Twelfth Hour (Egyptian) | golden sand, sun-baked clay, green river banks |
| 6 | `tundra` | The Winter Oath (Norse) | snowbound northern uplands |
| 7 | `jungle` | The New Fire (Mesoamerican), one Egyptian marsh mission | wet rainforest, red earth, turquoise water |
| 8 | `moor` | The Silver Branch (Celtic) | heather, peat, grey stone, mist |
| 9 | `fjord` | The Winter Oath coast missions | snowy rock coasts, dark sea |
| 10 | `autumn` | The Lantern Road (Japanese) | autumn valleys, maples, golden grass |

**Ground types** (`<ground>`): `plains`, `forest`, `rough`, `marsh`, `mountain`,
`water`.

**Battlefields** (`<battlefield>`): `open_field`, `coast_road`, `ridge_pass`,
`grove`, `plateau`, `beacon_clearing`.

---

## 5. Group A — Ground textures (60)

### 5.0 Rules for all ground textures

* **Size:** 1024 × 1024 px, PNG, no transparency.
* **Seamless on all four edges**: the left edge must continue into the right
  edge and the top into the bottom with no visible seam. Check by imagining the
  image tiled 3 × 3: no repeating landmark should stand out.
* **Scale:** one texture covers roughly two map tiles across (about the width of
  a small farmhouse plot). Small elements (pebbles, grass tufts, leaves) are
  about 1–3 % of the image width; **no single element larger than about 10 %**
  of the width; no paths, rivers or roads (the game draws those).
* **What the six ground types mean:**
  * `plains` — open, walkable land typical of the climate.
  * `forest` — the **floor of a forest** (leaf litter, needles, moss, roots,
    undergrowth). The trees themselves are 3D objects added by the game, so do
    **not** paint tree crowns.
  * `rough` — broken ground: stones, gravel, scrub, cracked earth.
  * `marsh` — wet ground with shallow pools, reeds and mud.
  * `mountain` — **bare rock surface seen from above** (the peaks are 3D objects
    placed on top); ledges, cracks, scree.
  * `water` — the **surface of water** seen from above, calm with gentle ripples.
    No foam lines and no shoreline (the game adds shores and moving waves).

### 5.1 Temperate (priority 1)

**A01 · `terrain.temperate.plains.png`** — average `#7F8F4F`
A lush, even meadow: short grass in mid-greens with warm yellow-green highlights,
scattered clover patches and tiny white and yellow wildflowers, a few small bare
earth spots and pebbles. Gentle, inviting, the "home" ground of the game.

**A02 · `terrain.temperate.forest.png`** — average `#3F6136`
The floor of a mixed oak-and-pine wood: brown oak leaves and pine needles,
cushions of moss, small ferns, a few exposed roots and acorns, dappled
darker-green and brown patches.

**A03 · `terrain.temperate.rough.png`** — average `#8C7B58`
Dry broken ground: tan earth with fine cracks, scattered grey stones and pebbles
of varied size, tufts of dry golden grass, a few small thorny shrubs.

**A04 · `terrain.temperate.marsh.png`** — average `#4D6B5C`
A waterlogged meadow: dark mud, small irregular pools of still water reflecting
a soft blue-grey sky colour, clumps of reeds and rushes, bright green algae at
the pool edges.

**A05 · `terrain.temperate.mountain.png`** — average `#6F6A64`
Grey weathered limestone seen from above: cracked slabs and ledges, scree in the
cracks, small orange and pale-green lichen spots, a few tufts of grass in
sheltered cracks.

**A06 · `terrain.temperate.water.png`** — average `#2C5C86`
Clear deep blue lake water with gentle wind ripples and soft lighter streaks;
slightly darker and lighter patches suggesting depth. Calm.

### 5.2 High pass (priority 2)

**A07 · `terrain.high_pass.plains.png`** — average `#778B51`
An alpine meadow: short tough grass in cool greens, tiny blue gentian-like and
white alpine flowers, small grey granite stones poking through, a few cushion
plants.

**A08 · `terrain.high_pass.forest.png`** — average `#3B5E37`
A conifer forest floor: thick carpet of russet pine needles, pine cones, bright
green moss cushions, small grey boulders, roots.

**A09 · `terrain.high_pass.rough.png`** — average `#84775A`
Granite scree and gravel: grey, pink-grey and tan stones of varied size, tufts of
hardy grass, a few tiny patches of old snow in shaded hollows.

**A10 · `terrain.high_pass.marsh.png`** — average `#48685E`
A mountain bog: spongy sphagnum moss in green, gold and rusty red, small dark
peaty pools, white tufts of cotton-grass.

**A11 · `terrain.high_pass.mountain.png`** — average `#686766`
Grey granite with white quartz veins, frost-shattered blocks, snow lying in the
cracks and on small ledges.

**A12 · `terrain.high_pass.water.png`** — average `#295989`
A cold mountain lake: clear blue water with a slight milky glacial turquoise
tint, very gentle ripples.

### 5.3 Coast (priority 3)

**A13 · `terrain.coast.plains.png`** — average `#7F8F4D`
Coastal grassland on sandy soil: sun-bleached green grass in tufts, patches of
pale sand between them, small yellow coastal flowers, a few smooth pebbles.

**A14 · `terrain.coast.forest.png`** — average `#3F6135`
The floor of a coastal pine and olive grove: sandy soil, pine needles, dry olive
leaves, low clumps of wild herbs (grey-green rosemary, thyme), dappled shade.

**A15 · `terrain.coast.rough.png`** — average `#8C7B56`
Rocky shore ground above the tide: pale limestone rocks and rounded pebbles, sand
between them, small salt-loving succulents, bits of dry seaweed.

**A16 · `terrain.coast.marsh.png`** — average `#4D6B5A`
A salt marsh: grey-brown tidal mud with winding shallow channels, red-green
samphire, white salt crust at the edges, shallow brackish pools.

**A17 · `terrain.coast.mountain.png`** — average `#6F6A62`
Sea-cliff rock from above: pale ochre-grey limestone with layers and ledges,
white salt and bird-lime streaks, small hardy plants in cracks.

**A18 · `terrain.coast.water.png`** — average `#2C5C83`
The sea: rich blue with turquoise lighter zones, a soft wave texture and small
sun sparkles; no foam, no shore.

### 5.4 Storm plateau (priority 4)

**A19 · `terrain.storm_plateau.plains.png`** — average `#6D814F`
Wind-flattened grass in dull olive and grey-green, every blade combed the same
diagonal way by the wind, small dark stones between. Slightly desaturated.

**A20 · `terrain.storm_plateau.forest.png`** — average `#365736`
The floor of a stunted, wind-bent thicket: dark heather, gnarled exposed roots,
dark moss, scattered dead branches.

**A21 · `terrain.storm_plateau.rough.png`** — average `#786F58`
Dark slate shards and broken flat rocks, gravel, black streaks of old lightning
scorch on a few stones.

**A22 · `terrain.storm_plateau.marsh.png`** — average `#42605C`
A dark peat bog: black water pools reflecting a stormy grey, sparse rushes,
dark wet moss.

**A23 · `terrain.storm_plateau.mountain.png`** — average `#5F5F64`
Dark blue-grey basalt and slate with sharp fractured edges and a wet sheen.

**A24 · `terrain.storm_plateau.water.png`** — average `#265386`
Dark storm-blue water with a choppy wind texture and small whitish wind streaks
(no foam lines).

### 5.5 Desert (priority 5)

**A25 · `terrain.desert.plains.png`** — average `#B7AA66`
Firm sun-baked desert floor: golden sand with fine wind ripples, a sprinkle of
small stones, a few dry grass tufts.

**A26 · `terrain.desert.forest.png`** — average `#697945`
The floor of a river-side palm grove: sandy soil, fallen palm fronds, green
grass and low riverbank plants, cool shade patches.

**A27 · `terrain.desert.rough.png`** — average `#BDA16B`
Rocky desert: ochre and red sandstone rubble, cracked flat stones, wind-polished
pebbles, a little loose sand.

**A28 · `terrain.desert.marsh.png`** — average `#9F9A6C`
A papyrus marsh by the river: dark mud, shallow water, dense clumps of papyrus
seen from above (round feathery heads), floating lotus leaves with a few white
and blue flowers.

**A29 · `terrain.desert.mountain.png`** — average `#928265`
Layered ochre-red sandstone from above: horizontal bands, wind-carved grooves,
sand drifted into the cracks.

**A30 · `terrain.desert.water.png`** — average `#3C647B`
Great-river water: warm blue-green with a faint silty brown tint, slow flowing
swirls.

### 5.6 Tundra (priority 6)

**A31 · `terrain.tundra.plains.png`** — average `#B3BEA2`
A snowfield over frozen ground: wind-sculpted snow with soft drifts in blue-white,
tips of brown grass and small dark rocks poking through. Cool blue shadows in the
hollows only.

**A32 · `terrain.tundra.forest.png`** — average `#93A795`
A snowy birch and spruce forest floor: snow with fallen needles and twigs, darker
patches of bare needle litter, small animal tracks.

**A33 · `terrain.tundra.rough.png`** — average `#B9B4A6`
Frost-shattered grey rock with snow and ice between the stones, crusts of pale
lichen.

**A34 · `terrain.tundra.marsh.png`** — average `#9AACA8`
A frozen bog: cracked sheets of ice over dark water, frosted reeds standing
through, drifts of snow.

**A35 · `terrain.tundra.mountain.png`** — average `#ABACAC`
Grey rock outcrops under heavy snow, blue ice in the cracks.

**A36 · `terrain.tundra.water.png`** — average `#6488A7`
Half-frozen water: dark blue-grey open water with drifting plates of white ice and
thin grey ice skins.

### 5.7 Jungle (priority 7)

**A37 · `terrain.jungle.plains.png`** — average `#5F8643`
A rainforest clearing: red-brown earth with dense low green growth (broad leaves,
ferns), a few large fallen leaves, a wet sheen.

**A38 · `terrain.jungle.forest.png`** — average `#366733`
A deep jungle floor: tangled roots, huge fallen leaves, ferns, moss, small orange
mushrooms, dark wet earth.

**A39 · `terrain.jungle.rough.png`** — average `#677848`
Red laterite rubble and broken pale limestone blocks with roots and vines
crawling over them.

**A40 · `terrain.jungle.marsh.png`** — average `#3F6D4B`
A mangrove swamp: dark tea-coloured water, arching mangrove roots, floating
leaves and lily pads.

**A41 · `terrain.jungle.mountain.png`** — average `#5F6C57`
Dark wet limestone karst covered in moss and creeping vines.

**A42 · `terrain.jungle.water.png`** — average `#2A6171`
Warm turquoise-green lake water, clearer and lighter where it is shallow, a hint
of sandy bottom.

### 5.8 Moor (priority 8)

**A43 · `terrain.moor.plains.png`** — average `#7B855B`
Moorland: heather in purple and rust, bracken, short grass and moss, small
patches of dark peat.

**A44 · `terrain.moor.forest.png`** — average `#43603E`
The floor of an old oak and birch wood: a thick moss carpet, ferns, lichen-covered
stones, fallen twigs.

**A45 · `terrain.moor.rough.png`** — average `#857662`
Grey granite boulders and stone scatter among heather and gorse with small yellow
flowers.

**A46 · `terrain.moor.marsh.png`** — average `#556A65`
A peat bog: black peat pools, sphagnum moss, white tufts of bog cotton.

**A47 · `terrain.moor.mountain.png`** — average `#6E6968`
Grey granite tor rock with rounded weathered shapes, lichen and moss.

**A48 · `terrain.moor.water.png`** — average `#2F5B86`
Dark lake water, tea-brown where it is shallow, deep blue-grey elsewhere, small
ripples.

### 5.9 Fjord (priority 9)

**A49 · `terrain.fjord.plains.png`** — average `#AAB694`
Snow-patched coastal grass: wet snow over dark green crowberry and grass, a few
black rocks.

**A50 · `terrain.fjord.forest.png`** — average `#859C86`
A spruce forest floor with snow: dark green needle litter, clumps of snow, cones.

**A51 · `terrain.fjord.rough.png`** — average `#B2AB9A`
Black wet coastal rock and gravel with snow lying between.

**A52 · `terrain.fjord.marsh.png`** — average `#8DA29C`
A frozen shore marsh: ice-crusted mud, frozen pools, frosted sedge.

**A53 · `terrain.fjord.mountain.png`** — average `#A1A1A0`
Dark granite with snow on every ledge, a cold blue tint in the shadows.

**A54 · `terrain.fjord.water.png`** — average `#557C9E`
Deep dark fjord water, steel blue-green, with small floating ice floes.

### 5.10 Autumn (priority 10)

**A55 · `terrain.autumn.plains.png`** — average `#8D8546`
Golden autumn grass (tall pampas-like grass seen from above) with scattered red
maple leaves.

**A56 · `terrain.autumn.forest.png`** — average `#736235`
A maple and cedar forest floor: a thick carpet of red, orange and gold maple
leaves, moss, cedar needles.

**A57 · `terrain.autumn.rough.png`** — average `#97764E`
Mossy dark volcanic stones and gravel with clumps of dry grass and fallen leaves.

**A58 · `terrain.autumn.marsh.png`** — average `#636951`
A reed marsh: shallow clear water, reeds, red and gold leaves floating.

**A59 · `terrain.autumn.mountain.png`** — average `#79685A`
Dark volcanic rock with moss and tiny red maple seedlings in the cracks.

**A60 · `terrain.autumn.water.png`** — average `#2D5A7E`
Clear mountain-river water in blue-green with a few red maple leaves floating.

---

## 6. Group B — Battlefield grounds (6)

### 6.0 Rules for all battlefield grounds

* **Size:** 4096 × 3200 px, PNG. **Not** seamless — one painted ground for the
  whole battle, **seen straight from above**.
* **Layout (important):** the game's battle board (15 × 11 hexes) sits in the
  middle. Divide the image into three zones:
  1. **Centre — about 1500 × 1000 px around the exact centre:** flat, even,
     walkable ground with low contrast and **no** rocks, trees, water, walls or
     strong marks. The game draws the hex grid here and places obstacles itself.
  2. **Middle ring — out to about 2600 × 1900 px:** the same ground with a little
     more texture (worn patches, small stones, grass tufts, a faint track) so the
     board blends into the landscape.
  3. **Outer margins — the rest:** the scenery of that battlefield, still seen
     from above (cliff edges, sea, tree canopy, ruins, hedges…).
* **Light:** even, from straight above; soft contact shadows only.
* **Climate:** these six are the **default (temperate)** versions and are used in
  every climate for now — keep the central ground a natural, neutral earth and
  grass. Climate variants are listed in Group B2.

**B1 · `battlefield.open_field.ground.png` — Open field**
A broad meadow. Centre: even green grass with a few wildflowers (white, yellow).
Middle ring: slightly longer grass, a faint cart track crossing from left to
right, a few molehills. Margins: hedgerows of dark green shrubs, a wooden rail
fence, patchwork strips of wheat and barley fields in gold, a small stream in one
corner.

**B2 · `battlefield.coast_road.ground.png` — Coast road**
A coastal road. Centre: firm sandy earth with worn short grass. Middle ring: the
edges of an old paved road, some cobbles showing, wheel ruts. Margins: along the
**top edge**, the rim of a sea cliff falling to turquoise sea with white foam
breaking on rocks; along the bottom edge, a low dry-stone wall with dry grass and
a few olive trees seen from above.

**B3 · `battlefield.ridge_pass.ground.png` — Ridge pass**
A narrow mountain pass. Centre: packed earth and fine gravel, trodden. Middle
ring: larger gravel and small rocks, scree fans spilling in from the sides.
Margins: on the **left and right**, the tops of steep rock walls and cliffs with
pine trees and snow patches; the pass continues out at the top and bottom edges.

**B4 · `battlefield.grove.ground.png` — Sacred grove**
A clearing in an ancient grove. Centre: soft short grass with scattered fallen
leaves and tiny flowers. Middle ring: moss, roots reaching inward, a few
mushrooms. Margins: a dense ring of ancient trees seen from above (rich green
canopy), with three or four mossy standing stones at the corners of the clearing.

**B5 · `battlefield.plateau.ground.png` — High plateau**
A wind-swept plateau. Centre: short wiry grass and flat grey slate. Middle ring:
wind-flattened grass streaks, scattered flat stones. Margins: dark rock outcrops;
along the **top edge**, the dark edge of a deep chasm; a few gnarled bushes.

**B6 · `battlefield.beacon_clearing.ground.png` — Beacon clearing**
A clearing around an old signal beacon. Centre: trampled grass and earth. Middle
ring: scattered ash and charcoal flecks, a few dropped pieces of firewood.
Margins: at the **top edge**, the round stone base of a great beacon with a
scorched black ring around it; stacks of firewood under canvas; a stone path
leading away at the bottom edge; low grass and heather elsewhere.

### 6.1 Group B2 — Battlefield climate variants (optional, second wave: 18)

Same size, same three-zone layout and the same scenery idea as B1–B6, but
re-dressed for a climate. Generate only after B1–B6 are approved.

* `.desert` — centre of firm golden sand and baked clay; margins with sandstone,
  palms, dry river channels.
* `.tundra` — centre of packed snow over frozen ground (low contrast, slightly
  blue-grey so units stand out); margins with snowdrifts, spruce, ice and dark
  rock.
* `.jungle` — centre of red-brown earth and low green growth; margins with dense
  jungle canopy, vines, pale limestone ruins.

Files:

```
battlefield.open_field.ground.desert.png
battlefield.coast_road.ground.desert.png
battlefield.ridge_pass.ground.desert.png
battlefield.grove.ground.desert.png
battlefield.plateau.ground.desert.png
battlefield.beacon_clearing.ground.desert.png
battlefield.open_field.ground.tundra.png
battlefield.coast_road.ground.tundra.png
battlefield.ridge_pass.ground.tundra.png
battlefield.grove.ground.tundra.png
battlefield.plateau.ground.tundra.png
battlefield.beacon_clearing.ground.tundra.png
battlefield.open_field.ground.jungle.png
battlefield.coast_road.ground.jungle.png
battlefield.ridge_pass.ground.jungle.png
battlefield.grove.ground.jungle.png
battlefield.plateau.ground.jungle.png
battlefield.beacon_clearing.ground.jungle.png
```

---

## 7. Group C — Sky backdrops (10)

### 7.0 Rules for all skies

* **Size:** 4096 × 1536 px, PNG.
* **Seamless left-to-right**: the left edge continues into the right edge (the
  backdrop wraps around the scene). Top and bottom need not be seamless.
* **Layout:** the **horizon line at about 62 % from the top**. Above it: sky and
  clouds. Below it: only a **distant** landscape silhouette (far hills,
  mountains, sea) fading into haze — no foreground, no buildings, no people.
* **Sun:** when visible, low and in the **left third** of the image (the game
  will match its scene light to that side); never in the exact centre.
* **Style:** the skies of the opening paintings (R4): luminous, painterly
  clouds, god-rays, atmospheric haze.
* The game also samples the sky's colours for ambient light and fog, so each sky
  must have **one clear overall mood**.

**C01 · `sky.temperate.png` — Temperate** (priority 1)
Bright late morning. A deep blue sky with large soft white cumulus clouds lit gold
on their tops; gentle god-rays. Below the horizon, rolling green hills and a hint
of a silver sea in hazy blue distance.

**C02 · `sky.high_pass.png` — High pass** (priority 2)
Crisp, cold, clear: a strong blue sky fading to pale near the horizon, thin
high cirrus streaks, a low sun on the left. Below, a jagged line of snowy peaks
with blue shadows and drifting cloud banks in the valleys.

**C03 · `sky.coast.png` — Coast** (priority 3)
Golden afternoon over the sea: warm golden light, scattered clouds edged with
light, the sun low on the left reflecting on a calm sea. Below, a far horizon of
sea with small hazy islands.

**C04 · `sky.storm_plateau.png` — Storm plateau** (priority 4)
A dramatic storm: towering dark blue-grey clouds, a bright tear of light on the
left where the sun breaks through, distant lightning forks inside the clouds,
curtains of rain on the right. Below, dark flat-topped mountain silhouettes.

**C05 · `sky.desert.png` — Desert** (priority 5)
Hot, hazy gold: a pale gold-to-blue sky with long thin clouds, a bright white-gold
sun low on the left in heat haze. Below, distant mesas and dunes fading into
golden dust, a thin green line where a river runs.

**C06 · `sky.tundra.png` — Tundra** (priority 6)
Northern dusk: a deep blue sky with faint teal-green aurora ribbons, a low pink-
orange glow at the horizon on the left, a few stars. Below, distant snowy fells
and dark lines of spruce.

**C07 · `sky.jungle.png` — Jungle** (priority 7)
Humid and bright: towering white cumulus clouds over a hazy blue-green sky, rays
of sun on the left, mist rising. Below, an endless dark-green canopy horizon with
a distant smoking volcano.

**C08 · `sky.moor.png` — Moor** (priority 8)
Soft grey-gold: layered grey clouds with gold light breaking through on the left,
a fine mist. Below, rolling heather hills in purple-grey with a few distant
standing stones as tiny silhouettes on a ridge.

**C09 · `sky.fjord.png` — Fjord** (priority 9)
Blue northern twilight: a clear dark-blue sky with a broad green-teal aurora,
first stars, a cold pale glow on the left. Below, steep dark fjord mountains with
snow on their tops and a strip of dark still water reflecting the aurora.

**C10 · `sky.autumn.png` — Autumn** (priority 10)
A soft autumn sunset: pink, peach and lilac clouds, the sun low on the left.
Below, misty layered blue mountains and one tall snow-capped volcanic peak in the
distance.

---

## 8. Delivery checklist

Put every file in `assets-source/art/final/`. Names must match exactly.

**Group A — 60 ground textures**

```
terrain.temperate.plains.png
terrain.temperate.forest.png
terrain.temperate.rough.png
terrain.temperate.marsh.png
terrain.temperate.mountain.png
terrain.temperate.water.png
terrain.high_pass.plains.png
terrain.high_pass.forest.png
terrain.high_pass.rough.png
terrain.high_pass.marsh.png
terrain.high_pass.mountain.png
terrain.high_pass.water.png
terrain.coast.plains.png
terrain.coast.forest.png
terrain.coast.rough.png
terrain.coast.marsh.png
terrain.coast.mountain.png
terrain.coast.water.png
terrain.storm_plateau.plains.png
terrain.storm_plateau.forest.png
terrain.storm_plateau.rough.png
terrain.storm_plateau.marsh.png
terrain.storm_plateau.mountain.png
terrain.storm_plateau.water.png
terrain.desert.plains.png
terrain.desert.forest.png
terrain.desert.rough.png
terrain.desert.marsh.png
terrain.desert.mountain.png
terrain.desert.water.png
terrain.tundra.plains.png
terrain.tundra.forest.png
terrain.tundra.rough.png
terrain.tundra.marsh.png
terrain.tundra.mountain.png
terrain.tundra.water.png
terrain.jungle.plains.png
terrain.jungle.forest.png
terrain.jungle.rough.png
terrain.jungle.marsh.png
terrain.jungle.mountain.png
terrain.jungle.water.png
terrain.moor.plains.png
terrain.moor.forest.png
terrain.moor.rough.png
terrain.moor.marsh.png
terrain.moor.mountain.png
terrain.moor.water.png
terrain.fjord.plains.png
terrain.fjord.forest.png
terrain.fjord.rough.png
terrain.fjord.marsh.png
terrain.fjord.mountain.png
terrain.fjord.water.png
terrain.autumn.plains.png
terrain.autumn.forest.png
terrain.autumn.rough.png
terrain.autumn.marsh.png
terrain.autumn.mountain.png
terrain.autumn.water.png
```

**Group B — 6 battlefield grounds**

```
battlefield.open_field.ground.png
battlefield.coast_road.ground.png
battlefield.ridge_pass.ground.png
battlefield.grove.ground.png
battlefield.plateau.ground.png
battlefield.beacon_clearing.ground.png
```

**Group C — 10 skies**

```
sky.temperate.png
sky.high_pass.png
sky.coast.png
sky.storm_plateau.png
sky.desert.png
sky.tundra.png
sky.jungle.png
sky.moor.png
sky.fjord.png
sky.autumn.png
```

(Group B2's 18 optional files are listed in section 6.1.)

**Quick test for a texture:** place four copies of the image in a 2 × 2 square.
If you can see the seam or a repeating landmark, regenerate it.
