# Development Status

_Last updated: 2026-10-06 · **app 0.13.5** (Windows installer for play-testing): **climate-aware nature scenery** (318 painted stills: each climate's trees, shrubs, rocks, deadwood, mountains and border clumps on the map, sea, lake and river scenery, battle obstacles in the map's climate) and **the hero screen's new equipment figure** (below) · before it, **app 0.13.4**: **the frame rate on the map and in battle** (the map, the battle and their figures in PixiJS render groups — a map frame sent 2.1 MB to the GPU, now 8 KB —, pictures decoded off the main thread, the fog redrawn only when it changes, the movement range and the computer's routes without their spikes, High capped at 60 frames per second, adaptive resolution and a frame-rate readout in Settings → Display; the frame rate on the owner's laptop is a target until measured there) and **GPT-6 Brief 17 in the game** (painted ground transitions and shore foam, 24 town backgrounds by town-hall level, the three markers, the neutral map hero, 16 story portraits) (below) · before it, **app 0.13.3**: **GPT-6 Brief 17**, the last art request (ground transitions and shore foam — the map is ready for them —, the town backgrounds, the last stand-in markers, the neutral map hero, 16 story portraits), **the status, action and miracle icons in battle** (marks over each stack, icons before the floating words, miracle icons on the map), **a steadier AI** (a lone big creature judged at its real strength; a home guard in every town) and **all five road types of Brief 16 in the game** (dirt approved by the owner; cobble, sand, snow and boardwalk awaiting in-game acceptance) (below) · before it, **app 0.13.2**: **the ground crisp again** (only the edges between grounds slightly softened), **GPT-6 Brief 16** (painted road tiles: five road types × every way a road crosses a hex; the game reads them already) and **Briefs 14 and 15 in the game** (six skirmish-map paintings, each pantheon's walls, gate, towers, keep and siege battlefield, the catapult's throw; below the asked resolutions, accepted) (below) · before it, **app 0.13.1**: **Brief 13 icons in the game** (94 interface icons, map markers, effect and status icons and interventions; the town backgrounds, Part A, still open) (below) · before it, **app 0.13.0**: **six authored skirmish maps** (Frostgate, The Burning Oasis, The Circle of Gates, Barrows of the Lost Kings, The Golden Fords, The Six Thrones; seat setup S23; GPT-6 Brief 14 for their pictures), **the owner's ten fixes** (rounded roads styled by the land, soft ground and fog, the pantheon and recruit pages, the End Day button and town icons, dwellings never needing a higher tier, battle playback, the result screen, the catapult and smaller arrows; GPT-6 Brief 15 for siege art) (below) · before it, **app 0.12.0**: **pantheon balance on random maps** (new `random1v1` suite; Norse 0.51, Egyptian 0.53, Japanese 0.47, Mesoamerican 0.47 inside 0.45–0.55, Greek 0.57 and Celtic 0.45 at the edges; AI temperaments softened), **every sound final** (105 Pixabay recordings: menu, battle music per pantheon, siege, results, stingers, effects, ambience), **three new random-map layouts** (Archipelago, Twin Continents, Central Valley; `pr-skirmishgen-0.6`), **the map editor** (S22, `*.prmap.json`), **Brief 12 in the game** (84 dwellings, 42 services, climate icons, site markers, `fx.god.commit`), **the release clean-up** (973 files and 55 unused functions removed) and **GPT-6 Brief 13** (what is still to paint) (below) · before it: **map music per pantheon** (30 licensed tracks, final), **climate rules** and **AI temperaments** (skirmish and random maps), **the god commitment** (icon rows in the dialog, a moment on the card), **GPT-6 Brief 12** (every visual still missing) and **the visual-completion delivery** (33 icons, the Herald's bust, twelve quieter opening paintings) (below; not yet in a Windows installer) · **the owner's briefs 8–11 in the game** (60 god and 74 hero portraits, 72 town building levels, the map heroes' `prepare` and `cast`, god-card icon rows; below; not yet in an installer) · **the owner's magic and Favor strips, town icons and battlefield climates in the game** (177 effect strips under their full `fx.*` IDs, 6 town-action icons, 54 climate battlefields; importer fixed; map aura loops; below; not yet in an installer) · **app 0.11.0** (Windows installer for play-testing): the **owner's delivered 2D art** (all 102 creature forms, six map heroes, map locations, battle objects and effects; below) and the **owner's 21 requests of 2026-10-04** (the Workshop's weekly wares, twelve new heroes, rarer joining and fleeing, square random maps for up to six empires, map and battle fixes, a miracle book, GPT-6 briefs 8–11) · app 0.10.0 with **code-drawn magic and Favor effects** and **34 new placeholder sounds** (five campaign soundscapes; below) · **owner interface pass, third round** (14 requests) · app 0.9.0 (the first installer with the 2D migration) · **GPT-6 queue in sheets** (140 images instead of 1,097) · **2D presentation migration** (PixiJS replaces the 3D layer; every sprite a labelled placeholder; below) · 0.8.0 before it · new in 0.8.0: town gates, the fallen stay on the battlefield, victory celebration, town drag and drop, the 24 delivered cursors and the 6 pantheon emblems · new in 0.7.0: the **owner's interface pass**, the **first 43 creature portraits** and the **2026-10-03 requests** (context cursors, divine gifts, a smarter AI, graphics quality; below) · since 0.5.0: **172 final functional icons**, **hero specialties, all 60 gods, nine new map sites, neutral reactions**, the **92 story pictures**, the **76 ground and sky pictures** and the **41 big-moment pictures** · rules `pr-0.2-candidate` + proposed effects (hero movement 750–1,000, shooting ranges, specialties, reactions) · content `content-0.8.0` (values changed without a version bump; its saves still load, with the new features off) · campaigns `campaign-three-beacons-0.4`, *The Winter Oath* and four arc campaigns (proposed) · mapgen `pr-mapgen-0.3` + random maps **`pr-skirmishgen-0.6`** · save schema 1 (saves from content-0.7.0 refused) · preferences schema 3_

Everything below distinguishes what was **measured** (commands actually run
in this session) from targets. Placeholder behavior is labeled as such.

Sections dated before the 2D migration are history: their mentions of the
deleted 3D layer are marked **obsolete** where they occur.

## Climate-aware nature scenery and the hero equipment figure; app 0.13.5 (owner deliveries, 2026-10-06)

Owner deliveries: "Pantheon Realms — climate-aware nature expansion" (318
painted stills in `blannder_models\nature-expansion-2026-10-06`, with an
ecology policy and a reference selector), then "replace the hero equipment
screen's body diagram with the second, simpler schematic image"
(`blannder_models\hero-equipment-panel-2026-10-06`). Both folders were only
read.

### The nature scenery

**Delivery in the game.** The 318 PNGs and their 318 JSON sidecars were
copied into `assets-source/sprites/final/` (`cp -n`: no existing file
replaced; SHA-256 equal to the delivery's `CHECKSUMS.sha256` on the owner's
computer and in the cloud copy), `data/nature-policy.json` into
`packages/presentation/src/nature-policy.json`; `npm run sprites:import --
--only sprite.map.decor.nature.` registered **318 `decor` keys
`nature.<climate|water profile>.<role>.0N`**, 0 problems, every runtime file
decoding at its listed size, no other manifest entry changed. The importer now
trims these stills to their painted pixels (alpha above 4/255; the cells carry
a wide transparent margin and a faint fringe) with the anchor kept on the same
picture point (`import_sprites.py --self-test` checks it): 41 % of the frame
area on average.

**The selector** (`packages/presentation/src/nature.ts`) is the delivery's
`tools/nature-selector.mjs` in TypeScript (same hash, same picks): the
delivery's own 3,425 checks pass on the port (`presentation/test/nature.test.ts`),
and a comparison run against the reference module gave identical answers in
about 327,000 cases (land, borders, water, battle obstacles, every climate);
the delivery's `node tools/test-selector.mjs` itself: 3,425 passed.

**On the map** (`planNatureScenery`, drawn by `adventure.ts`; presentation
only — stable hashes of the map seed, the tile and the slot; no game RNG, no
change to the state, the logical map or its hash; tested):

* Climate first, terrain second: `map.biome` picks the family, the hex's
  terrain the role (policy weights), density from the policy × the climate's
  multiplier (desert 0.42, tundra 0.4 … jungle 1.15). Forests hold at most two
  big canopies, a third item is low dressing; plains on a road stay bare;
  items stand toward a border no road crosses, off the hero's spot; map
  locations and town entrances stay clear.
* Every mountain tile carries one of its climate's three mountains (a
  neighbour's variant avoided where possible); the tile stays impassable as
  before.
* Borders between grounds: each border planned once (lower tile first), 30 %
  of them, at most two clumps a tile, none where a road crosses — woodland
  clumps on the forest side, rocky ones on the rough or mountain side, wet
  plants on the marsh side and on the land bank of lakes and rivers; on a sea
  shore salt-marsh plants only on coast and jungle maps (the mangrove), rocky
  clumps elsewhere — never desert papyrus on a beach. The Brief 17 ground masks
  stay underneath.
* Water: `classifyWater` sorts each body into sea, lake or river from its
  shape (the map formats carry no water-body data): never touching the map's
  edge → a lake (a river when long and one ring wide); touching the edge and
  one ring wide → a river; touching the edge, 24+ tiles and two rings wide →
  the sea on coast and fjord maps, elsewhere only when it is also 15 % of the
  map; else unknown (nothing drawn). The sea takes its climate's profile
  (temperate, tropical or frozen), lakes and rivers freshwater. Per tile at most
  one piece by the policy's rates, three hexes apart, a budget per body; boats
  need 12 tiles of water, whales and dolphins 40 and two rings, no lilies on
  rivers or in the cold; the tundra's pack-ice water carries no boats and
  nothing swimming. Bridges, roads into water and locations by the water stay
  clear. In the shipped content the sea occurs on The Three Beacons 1, The
  Winter Oath 1 and 4, the four arc campaigns' fourth missions and random
  archipelagos; the campaigns' water barriers are rivers; Lake Isle has lakes.
* Graphics quality: Medium and Low leave out the low dressing (groundcover,
  shrubs, the three kinds of border clumps), Low also every other tree and
  rock and the boats and wildlife; mountains always stay. Fog as before: a
  piece shows once its tile is explored. Only the climate's own pictures load,
  and a picture is shown only after the engine has sent it to the GPU (see
  below). The plan is remembered for the last map, so the map built again after
  a battle does not plan again.

**In battle** (`battle.ts`, `battleObstacleId`): each obstacle cell the rules
placed shows the map climate's rock, deadwood or tree (the policy's weights
for the battlefield), drawn about 0.9 hex across; the generic columns and
standing stones stay; sieges unchanged. A missing still falls back to the
neutral boulder or rock, then a drawn grey stone — never the first picture in
the list. The board is rebuilt when the climate changes. Not added: cosmetic
dressing and mountains beyond the board, and the optional bobbing of boats.

**Frame rate with the scenery** (`tests/perf/frames.spec.ts`, each frame waited
for, 1280 × 720): main-thread time per frame while panning, zooming and walking
0.7–1.1 ms (0.13.4: 0.5–0.9), huge map panning 0.76 ms; data sent to the GPU
while panning 11–31 KB a frame (unchanged); two draw calls more. Emulated GPU
time: map 335–409 ms, huge map 556 ms; with the scenery hidden (a temporary
switch, removed) 385 and 490 ms — the scenery adds about a tenth on the map and
a seventh on a huge map. Those scenery-hidden numbers are above the 285–325 ms
recorded for 0.13.4, which were measured before Brief 17's painted ground
transitions were switched on; that difference was not broken down further.
The emulator's run-to-run spread is about ±30 ms. Not added: culling of
off-screen scenery — it sits in the objects' render group, costs nothing on the
main thread while still, and Pixi's culling would rebuild the group's draw list
during every pan.

A picture is now handed to a sprite only once the engine has sent it to the GPU
(`textures.ts` `markUploaded`; at most 1.5 s of waiting): before, a map's
hundred new scenery pictures were all sent in its first frames. Full test game
(`fullgame.spec.ts`, run `nature135b`, the same game as for 0.13.4):

| What was on screen | Frames | Main-thread time per frame: mean / longest | Longest other main-thread work |
|---|---|---|---|
| The map, the player's turn | 1,052 | 1.10 / 59 ms | Continue on the battle result 67 ms (the map is built again; 96 ms before the plan was remembered, 61 ms in 0.13.4); clicking a tile ≤ 29 ms |
| The map, the computer's turn | 85 | 1.32 / 7.1 ms | the computer's steps ≤ 37 ms |
| The battle | 408 | 1.18 / 74 ms | nothing over 10 ms |

Frames over 16 ms of main-thread work: four, all where a view opens — the map
(37 ms), the map after the battle (32 and 59 ms), the battle's first second
(74 ms). The laptop's frame rate stays a target until measured there.

Review screenshots (`tests/e2e/nature.spec.ts`, test-results/nature-*): every
climate on an archipelago with a close-up where most grounds meet; water: a
temperate lake, moor ponds, a jungle sea, a fjord sea, an autumn river; the
same map reloaded (identical), Medium and Low, fog; battlefields — all six in
desert, tundra and jungle, one each in the other seven climates.

### The hero equipment figure

`hero-equipment-schematic-v2.png` (1122 × 1402, SHA-256 `537a129a…`; the
simpler schematic, not the bronze figure) was copied to
`assets-runtime/ui/` and `assets-source/ui/` on both sides and is used as
delivered (`HERO_EQUIPMENT_SCHEMATIC = './ui/hero-equipment-schematic-v2.png'`
in `ui/src/assets/manifest.ts`). In `Hero.tsx` an `<img>` replaces the drawn
SVG body inside `.h3-doll__stage`: empty alt text, `aria-hidden`, not
draggable, `pointer-events: none`, `object-fit: cover`, the 4:5 stage kept.
The fifteen slots and the spellbook stay separate buttons over it at the
handoff's centres (the neck at 20 % instead of 19 %, clear of the head box at
the smallest stage); the boxes are 13 % of the stage wide (2.3–3.5 rem) with
an opaque navy fill, a gold border, a visible keyboard focus ring and the
hover, picked and drop-target states as before. Drag and drop, tooltips, set
badges, the inventory, the mount slot and the spellbook are unchanged. The
narrow layout (windows under 1100 px) was squeezing the equipment and
inventory plates into strips; the column now scrolls with each plate whole.

Checked (`tests/e2e/heroschematic.spec.ts`): at 1280 × 720, 1366 × 768,
1600 × 900, 1920 × 1080 and 1024 × 768, with an empty and a fully equipped
hero — the picture is the delivered file, decorative and full-stage at 4:5;
all sixteen controls lie inside the stage, none overlaps another, each takes
the click at its own centre; equipping by click, unequipping by double-click,
dragging a ring backpack → left → right → backpack, a drop on the figure
ignored, equipping by keyboard (Enter) with the focus ring shown, the
spellbook opening; and the existing `heroscreen.spec.ts`.

### Verification of 0.13.5 (commands actually run)

| Command (cloud copy of the project) | Result |
|---|---|
| `node tools/test-selector.mjs` (the delivery's own checks, run from a copy of the delivery) | 3,425 checks passed |
| a temporary comparison test: `makeNatureSelector` (TypeScript) against the delivery's `nature-selector.mjs` | identical in about 327,000 cases; removed afterwards |
| `npm run sprites:import -- --only sprite.map.decor.nature.` | 318 imported, 0 problems; 318 `decor` keys equal to the policy's IDs, every file decodes at its size, no other manifest entry changed |
| `python3 tools/assets/sprites/import_sprites.py --self-test` | passed (incl. the new trim case: the visible block keeps its place relative to the anchor within a pixel) |
| `npm run check` (boundaries, type-check, unit tests) | passed: **448 / 448** tests in 50 files (new: `presentation/test/nature.test.ts`, 17 tests — the delivery's checks, water kinds, every climate's own art, determinism and an untouched map, freshwater and ice rules, road/site/town clearances, qualities, missing art, neighbour variety, battle obstacles, the remembered plan) |
| `tests/perf/frames.spec.ts` (`PERF_GPU=1`; with a temporary switch hiding scenery kinds, removed) and `tests/perf/fullgame.spec.ts` (`PERF_GPU=1 PERF_DPR=0.5 PERF_DAYS=7`, runs `nature135`, `nature135b`) | the tables above |
| `npx playwright test` (all 141 UI tests, release build, run alone) | **139 / 141**. The two failures, both from the new picture queue: `sprites2d.spec.ts` playback (an animation strip waited behind a hundred scenery pictures — strips, effects and icons now go first; then **passed**) and `heroes.spec.ts` walk (the walk took 17 s here, the emulator's frames being slower with the scenery, against a 15 s wait; the wait raised to 45 s, every walking check unchanged; then **passed**) |
| `npx playwright test` on the final build: `heroes.spec.ts`, `sprites2d.spec.ts`, then `battles`, `bigMoments`, `brief17`, `framerate`, `nature` | heroes 5 / 6 (the walk; rerun alone with the longer wait: passed), sprites2d 4 / 4; then **21 passed, 0 failed** — the run was stopped there to deliver (the nature battlefields, rounds 3, 10, 11, 12 and the siege were not rerun after the queue order change; they passed in the full run just before it) |
| `tests/e2e/heroschematic.spec.ts`, `tests/e2e/heroscreen.spec.ts` | 3 / 3 and 3 / 3 (also within the full run) |
| `npm run build`, `npm run desktop:build`, `electron-builder --win nsis --x64 --linux dir --x64` | `Pantheon-Realms-Setup-0.13.5-x64.exe`, 549,142,187 bytes, SHA-256 `fa841bbf8d16dfc2add329b585b775a938ab846ceb9d1b0926c29350c99c19df` (unsigned, not run on Windows); the packed app equals the build file for file (3,247 files incl. the 318 scenery stills and the equipment figure; only `package.json` rewritten by the packer; nothing from `tools/` or test servers) |
| packaged payload check, offline packaged smoke (`unshare -n`) | OK with networking off: the map draws (WebGL), 1,629 sprite entries (318 more), 550 painted pictures and 662 interface images resolve, saves and records written, sounds decode, packaged without developer tools |

Not measured here: the frame rate on the owner's laptop; the scenery, the battle obstacles and the equipment figure judged in play by the owner.

**Delivery.** The nature sources (318 PNGs and 318 sidecars) and the
equipment figure were copied into the owner's folder from the delivery folders
(SHA-256 checked there); bundle 26 (`apply_sync.py`, not committed) then wrote
344 files (323 new) with 0 problems, the old versions checked there first. The
0.13.5 installer was copied to the owner's `installer\` folder in 27 parts and
joined there (SHA-256 checked: `fa841bbf…19df`).

## The frame rate on the map and in battle; app 0.13.4 (owner request, 2026-10-06)

Owner request: "it feels like the frame-rate of the map and battle are really
bad — do some analysis about the framerate and consider optimizations to
ensure it is above 30 in the high graphic settings without dropping below for
a full test-game". Where it is worst: "everywhere, always"; the computer: a
laptop with built-in graphics.

**What can be measured here.** This container has no GPU: WebGL runs on
SwiftShader (the GPU emulated on 2 processor cores). Its frame rates say
nothing about a laptop's graphics chip, and its compositor misbehaves under
load (measured: once a few frames fall behind, Chrome's compositor thread
spins at 90–100 % of a core and starves the emulator; the frame rate of the
map or a battle then collapses whatever is drawn). What *is* measured here and
carries over: the main-thread (processor) time each frame costs, how much
data each frame sends to the GPU, the long tasks of game logic and interface,
and the emulated GPU time per frame with each frame waited for (`?gputime`, a
one-pixel read-back), compared between layers and resolutions. **The frame
rate on the owner's laptop is a target until measured there** — Settings →
Display → Frame rate (new, below) shows it.

### What made it slow (measured before the changes)

Benchmark `tests/perf/frames.spec.ts` (new), High, 1280 × 720, Twin Harbors
fully explored, a huge random map with six empires, a battle of two full
armies:

| Scenario | Data sent to the GPU per frame | Main thread (CPU profile) |
|---|---|---|
| Map, idle | **2,149 KB** (vertices and indices, every frame) | 96 % in `bufferSubData` |
| Map, panning | 2,150 KB | 97 % in `bufferSubData` |
| Huge map, idle | 343 KB; 7,338 display objects | — |
| Battle, idle | 96 KB; 45 draw calls | 95 % in `bufferSubData` |
| Battle, auto-combat | — | 90 % in `texImage2D`; the slowest frame **10.7 s** |

The causes, found in the code:

* **The whole map was one render group** (PixiJS 8 re-sends a group's entire
  vertex buffer when anything in it changes), and *something always changed*:
  the selected hero's ring was cleared and redrawn every frame (which also
  rebuilds the group's draw list), the idle figures animate, and moving the
  camera moved every vertex. Each frame re-packed and re-sent ~80,000
  vertices — 60,000 of them the **soft shadows** (four tessellated ellipses
  under every tree, rock, site and figure). The battle had the same shape
  (the active stack's ring redrawn every frame).
* **Pictures were decoded and sent to the GPU the first time a frame showed
  them** — a creature's first attack, a spell's first strip — on the main
  thread, inside that frame.
* The **fog** was redrawn after every command (keyed by the state's revision),
  with the grid, the roads (all road tiles destroyed and created again) and a
  2048-pixel blurred fog picture re-sent to the GPU.
* The **movement range** (`reachableTiles`) sorted its whole frontier for every
  tile it settled (quadratic), after every command; the **computer players**
  ran one route search per destination they weighed (dozens per decision) —
  huge map: median 6.5 ms, p95 30 ms, the longest **65 ms** per step, between
  the map's frames.
* The **minimap frame** was polled into the map screen's own state: panning
  re-rendered the whole map screen every 150 ms. Every battle-screen update
  redrew all count badges (a new text picture each). High had **no frame cap**
  (a 120/144 Hz laptop panel draws 2–2.4× the frames, and the chip heats and
  slows).

### What changed

* **Render groups** (`adventure.ts`, `battle.ts`): the camera is one group
  transform; the ground (terrain, borders, roads, grid), the reach, the route,
  the walk's trail, the objects, the fog and the effects each sit in their own
  group, so a change re-sends only its own layer. The black around the map and
  the plain ground around the battlefield are the renderer's background
  colour (one full-screen fill less). The selection and active-stack rings
  are drawn once and pulse by scale; the hover outline is drawn once and
  moved; a walk's trail is drawn once per walk and hidden step by step;
  battle badges are redrawn only when the count or its colour changes.
* **Shadows** are one shared soft-disc picture (four vertices each instead of
  ~130), drawn the same (`staticSprites.ts`).
* **Pictures** (`textures.ts`): decoded off the main thread
  (`createImageBitmap`, the old image path as fallback) and sent to the GPU by
  the engine a few per frame within 4 ms, before a frame needs them; the
  ground paintings (drawn 5–20 times smaller than their pixels) with mipmaps.
* **Fog** redrawn only when the explored or visible tiles actually change (the
  grid, roads and decoration only when the explored ones do); the soft-fog
  picture at most 1,536 pixels across.
* **Rules** (`world.ts`, results unchanged — tests compare them tile by tile
  with the old searches): the movement range from a heap; `withSharedPaths`
  lets the computer player read one route tree per hero per decision.
* **Interface**: the minimap holds its own frame state (panning redraws only
  the minimap's frame).
* **High: 60 frames per second at most**, with a cap that averages 60 on a
  144 Hz panel (`frameDue`). **Adaptive resolution** (Settings → Display, on
  by default): while frames run slower than about 34 per second for two
  seconds of drawing — not while game logic held the thread — the view draws
  85 % of the pixels per step, down to 60 %; back up when frames are at the
  cap again (a step that proves too slow is not retried for a minute;
  `adaptResolutionStep`). **Frame rate** readout (Settings → Display, off by
  default): frames per second, the slowest recent frame, frames slower than
  1/30 s since the view opened, and the resolution when lowered.

### Measured after the changes

Benchmark `tests/perf/frames.spec.ts`, same scenes, High, 1280 × 720:

| Scenario | Data sent to the GPU per frame (before → after) | Draw calls | Frame rate in the emulator, idle (before → after) |
|---|---|---|---|
| Map, idle | 2,149 KB → **8 KB** | 6 → 7 | 2.2–5.4 → **60** (the cap) |
| Huge map, idle | 343 KB → **4 KB** | 10–12 → 11 | 13.6 → **59.5** |
| Battle, idle | 96 KB → **6 KB** | 45 → **27** | 14 → **52** |
| Battle, auto-combat | slowest frame 10.7 s → 0.58 s (emulator) | 44 → 26 | — |

Main-thread time per frame, each frame waited for (`?gputime`, so the time is
the processor's alone): map idle, panning, zooming, a hero walking **0.5–0.9
ms**; huge map panning 0.85 ms; battle idle 0.74 ms, auto-combat **1.9 ms**.
Before, the same frames re-packed and re-sent 2.1 MB each (the CPU profile:
96–97 % of the main thread in `bufferSubData`).

Emulated GPU time per frame (SwiftShader, serialized, 1280 × 720): map
285–325 ms, battle 174–238 ms in every scenario — panning, zooming and walking
add no GPU work any more. It follows the pixels drawn: 75 % resolution → 62 %
of the time, 50 % → 37 % (so adaptive resolution helps a slow graphics chip
almost in proportion). Where it goes on the map (layers hidden one at a time):
the ground ~49 %, the soft-fog picture ~28 %, the reach overlay ~19 % (the
benchmark hero has 3,000 movement points: the whole map), the objects ~14 %,
the road tiles ~6 %. A real integrated GPU draws such a frame in a few
milliseconds; how many on the owner's laptop is not known here.

The computer player's decision steps (Node, AI-against-AI step timer; the same
seeds and days, the same decisions — identical step counts):

| Map | Before (median / p95 / longest) | After |
|---|---|---|
| Twin Harbors, 19 days (171 steps) | 4.5 / 16.6 / **45.7 ms** | 4.9 / 12.8 / **19.7 ms** |
| Huge random map, six empires, 16 days (742 steps) | 6.0 / 27.5 / **52.0 ms** | 5.4 / 11.8 / **19.9 ms** |

Before, 4.3 of 6.3 s went into route searches, one per destination weighed;
now one per hero and decision. Tests compare every route of every hero to every
tile of Twin Harbors (fogged and explored) and of a huge map, alone and shared:
identical; the movement range likewise, entry for entry and in order.

A full test game (`tests/perf/fullgame.spec.ts`, new): Twin Harbors, seven
days, played through the screens — the hero marches east along the road, the
player pans and zooms each day, ends the day and watches the rival's turn; on
day 2 the gold mine's guard is fought (auto-combat, normal speed). Each frame
waited for (`?gputime`), drawn at half resolution so the emulator keeps up;
long animation frames attributed to their scripts. The release build of this
delivery (run `final2`, 4.9 minutes of play):

| What was on screen | Frames | Main-thread time per frame: mean / longest | Longest other main-thread work |
|---|---|---|---|
| The map, the player's turn | 1,074 | 0.89 / 43.6 ms | **Continue** on the battle result 61 ms (the map is built again) and a picture's load handler 33 ms right after it; clicking a tile ≤ 24 ms; timers ≤ 22 ms |
| The map, the computer's turn | 70 | 0.91 / 4.9 ms | the computer's steps (timers) ≤ 27 ms |
| The battle | 430 | 0.97 / 38 ms | nothing over 8 ms |

Frames with more than 16 ms of main-thread work in the whole game: **three**,
each where a view opens — the battle's first second (38 ms) and the map's
first two seconds after the battle (43.5 and 43.6 ms: the map is built again
and its pictures go back to the GPU). Three runs of the same game gave 29.9,
71.9 and 43.6 ms as the longest frame, always at such a change of view; the
timed log places the 57–61 ms click on the result's Continue. Outside those
moments nothing on the main thread came near 1/30 s. Still open: the map is
rebuilt after every battle (keeping it alive through the battle would remove
that hitch); the emulator's own frame rate (4–14 fps here) says nothing about
the laptop.

Start-up is not part of these numbers. Under the benchmark's uncapped
settings (`--disable-frame-rate-limit`) the first WebGL context of a run waited
12–455 s for the emulated GPU process (CPU profile: `getContext`); with the
normal test settings (vsync) the same import and load measured one 0.6 s and
one 1.0 s task (creating the WebGL context, building the map) in the emulator.

## GPT-6 Brief 17 delivered: the final visuals in the game (owner delivery, 2026-10-06)

Owner delivery `blannder_models\brief17-final-visuals-2026-10-06` (read
only): 70 PNGs and 20 animation sidecars, checked against its
`ASSET_MANIFEST.json` (SHA-256 of all 70 equal on the owner's computer and in
the cloud copy), copied into the game's `assets-source` (`cp -n`: no existing
file replaced; only PNGs and the hero sidecars — no masters, prompts,
references or QA composites). The owner widened Part C from six town
backgrounds to **24**: four per pantheon, one per town-hall level.

| Part | Delivered | In the game |
|---|---|---|
| A, B | six ground-transition masks (meadow, woodland, rocky, boggy, scree, shore), 1536 × 768, and the shore foam | `npm run ground:import`: 6 mask sheets, foam yes, **0 problems** → `sprites/final/ground/edges.json` (traced outlines) and `foam.webp`. The map now draws **painted transitions** (`__prGround().edges = 'painted'`) instead of the softened hex edges |
| C | 24 town backgrounds `town.<pantheon>.background.l1–l4`, **1448 × 1086** (4:3; below the asked 2048 × 1536, nothing enlarged) | `npm run art:import` (background pattern extended to `.l1`–`.l4`): 24 added, no other entry changed. **Code**: `townBackground()` (`ui/src/assets/manifest.ts`) picks the stage of the town hall (`civic_hall`): none/0 → stage 1, above 4 → stage 4, a missing stage → stage 1, then the old single painting. Buildings stay overlays at their places on every stage |
| D | markers `icon.marker.hero`, `icon.marker.enemy-hero`, `icon.marker.encounter` | `npm run icons:import -- --new` (96 px). Already wired: the tile panel over your / another empire's hero; a failed objective in the Journal |
| E | the neutral map hero: idle (4), walk (6), prepare (6), cast (6) × E, NE, N, S, SE (W, NW, SW mirrored), 320 px frames, anchor 0.88, 150 px per hex | `npm run sprites:import -- --only sprite.hero.neutral.`: 20 strips, 0 problems; stored at 192 px frames, 90 px per hex (the same scale, as the pantheon heroes are stored), fps 3/8/6/6, idle and walk loop, prepare and cast once. Shown for a hero without a pantheon (none in the current content; checked with a test fixture). The existing readiness beat and cast playback are unchanged (presentation only) |
| F | 16 story portraits (Cathal, Sadb, Nebet, Pawah, Ione, Thaleia, Genzo, Shiro, Chimal, Xoco, Eydis, Jökul, Skeggi, Svanhild, the Troll-wife, the Herald) | `icons:import -- --new` (256 px WebP). **Code**: `SpeakerPortrait` shows the delivered square portrait in the dialogue box and the Journal's dialogue lists (the painted busts still stand beside the box; on a small window, where the bust has no room beside the box, the box shows the square portrait instead of the bust; the setup screen's campaign cards keep their busts) |

Review notes (measured from the files, not judged in play):

* **The neutral hero is drawn about 26 % taller than the six pantheon heroes**
  at the declared 150 px per hex (idle E: 1.62 hex widths tall against
  1.28–1.29). Kept as delivered; a sidecar value of about 189 px per hex would
  match them (re-import with `sprites:import -- --only sprite.hero.neutral.`).
* Its walk N and NE strips shift sideways between two frames (about a tenth of
  a hex) — the small frame-to-frame changes the handoff names.
* Town backgrounds are the delivery's native 1448 × 1086, as disclosed.

Review screenshots (`tests/e2e/brief17art.spec.ts`, test-results/b17a-*): all
24 town stages with buildings of mixed levels (stage 1 with every building
complete, stage 4 with every building at its first level), the ground of all
ten climates with a close-up of a coast, both hero markers, the failed
objective, the Journal story of ten missions (all 16 portraits) and the
Troll-wife's scene in the dialogue box, the neutral hero on the map; and a
frame sheet of its four actions at map scale with the ground line.

### Verification of 0.13.4 (commands actually run, both parts)

| Command (cloud copy of the project) | Result |
|---|---|
| `npm run check` (boundaries, type-check, unit tests) | passed: **431 / 431** tests in 49 files (new: `rules/test/reach.test.ts` — movement range and shared routes equal to the old searches tile by tile; `presentation/test/graphics.test.ts` — frame cap and adaptive resolution; `ui/test/brief17.test.ts`; town-stage cases in `ui/test/townArt.test.ts`) |
| `npx playwright test --config playwright.perf.config.ts tests/perf/frames.spec.ts` (`PERF_GPU=1`, `PERF_ONLY`, `PERF_DPR`), before and after each change | the frame tables above |
| `PR_NO_MINIFY=1 npm run build` + `tests/perf/profile.spec.ts` (main-thread CPU profiles; release build rebuilt afterwards) | the "before" profiles above (`bufferSubData`, `texImage2D`) |
| `PERF_LABEL=final2 PERF_GPU=1 PERF_DPR=0.5 PERF_DAYS=7 npx playwright test --config playwright.perf.config.ts tests/perf/fullgame.spec.ts` (release build; two more runs `dpr05-sync`, `final`) | the full-game table above |
| AI step timer (a temporary `tools/balance` script, Node; removed before delivery) | the computer-player table above |
| `python3 tools/assets/import_story_art.py --self-test` | 19 / 19 (the `.l1`–`.l4` stages; `.l0`, `.l5` refused) |
| `npm run ground:import`, `npm run art:import`, `npm run icons:import -- --new`, `npm run sprites:import -- --only sprite.hero.neutral.` | 0 problems each; the manifests' other entries unchanged |
| `npx playwright test` (all 134 UI tests, release build, run alone) | **133 / 134**; the one failure was `storyArt.spec.ts` (small window) still expecting the bust inside the dialogue box, which now shows the delivered square portrait (Brief 17) — the test was updated and `storyArt.spec.ts` then passed **3 / 3**. Includes `brief17art.spec.ts` (towns, ground of ten climates, markers, portraits, neutral hero), `brief17.spec.ts` and `framerate.spec.ts` (Settings toggles, the readout) |
| `npm run build`, `npm run desktop:build`, `electron-builder --win nsis --x64 --linux dir --x64` | `Pantheon-Realms-Setup-0.13.4-x64.exe`, 546,666,105 bytes, SHA-256 `cd4e3538bce5b2c2587a33b9f215bb4e51557b8331d90463c4cd37db105fa5b5` (unsigned, not run on Windows); the packed app equals the build file for file (2,928 files; only `package.json` rewritten by the packer; nothing from `tools/` or test servers) |
| packaged payload check, offline packaged smoke (`unshare -n`, `PR_SMOKE_EXE=…/linux-unpacked/pantheon-realms xvfb-run -a node tools/desktop-smoke.mjs`) | OK with networking off: the map draws (WebGL), 1,311 sprite entries, 550 painted pictures and 662 interface images resolve, saves and records written, sounds decode, packaged without developer tools |

Not measured here: the frame rate on the owner's laptop (Settings → Display → Frame rate shows it); the delivered art judged in play by the owner.

**Delivery.** The Brief 17 sources (70 PNGs and the 20 hero sidecars) were
copied into the owner's folder from the delivery folder (SHA-256 checked
there); bundle 25 (`apply_sync.py`, not committed) then wrote 111 files (73
new) with 0 problems, the old versions measured there first. The 0.13.4
installer was copied to the owner's `installer\` folder in 27 parts and joined
there (SHA-256 checked: `cd4e3538…a5b5`).

## Brief 17 (the final visuals), delivered art shown in battle, a steadier AI, all five road types; app 0.13.3 (owner requests, 2026-10-06)

Owner requests: "give me the full visuals brief for GPT 6 — include everything
so this will be the last time we are using GPT 6 for content"; then: ground
transitions, town backgrounds, the leftover stand-ins, the delivered miracle
and status icons that no screen showed, "the computer leaves its towns empty",
"the computer misjudges one big creature"; then the owner's road
deliveries (Brief 16): the dirt track for review, then — approved — the other
four road types.

### GPT-6 Brief 17: the final visuals

`assets-source/art/briefs/GPT6_BRIEF_17_FINAL_VISUALS.md` (project doc
`gpt6-brief-17-final-visuals.md`; copied to the owner's folder ahead of this
delivery with its guides). From an audit of every manifest, the icon inventory
and the screens: **A** ground transitions — six black-and-white mask sheets
(meadow, woodland, rocky, boggy, scree, shore; one column per hex edge, three
variants), **B** the shore foam, **C** the six town backgrounds repainted
sharper (was Brief 13 Part A), **D** the three markers still cut from the
concept pack (`icon.marker.hero`, `icon.marker.enemy-hero`,
`icon.marker.encounter`), **E** the neutral map hero (20 strips), **F** 16
story-character portraits; §8 lists what is final. The guides come from the
game's hex geometry (`npm run art:ground-guides`); every part enters by an
existing import command (ASSET_PIPELINE.md §16). Nothing of Brief 17 is
painted yet.

**Game side, ready for the delivery.** `npm run ground:import`
(`tools/assets/ground/import_ground.py`) checks each mask against the guide,
clips it to its hex and traces it at three grey levels into outlines
(`assets-runtime/sprites/final/ground/edges.json`) and writes the foam atlas;
nothing is written while a sheet has a problem unless `--keep-going`. The map
(`groundEdges.ts`, `paintGroundEdges` in `adventure.ts`) lets the higher ground
reach into the lower one's hex — water < marsh < plains < rough < forest <
mountain, any land into water as a shore — in its character's shape, filled
with the reaching ground's own painting (opacities 0.35, 0.5, 1: a soft rim and
a solid core), one of three variants per hex and edge, and lays the surf over
the water hex in the matching cell. Only when all six sheets are imported;
until then the softened hex edges of 0.13.2 stay. Checked with synthetic masks
made from the guides (imported into the runtime, drawn on archipelago and
continental random maps: shorelines with foam, rocky and woodland borders),
then removed again — the shipped manifest has no `ground` entry.

### Delivered art now shown: status, action and miracle icons in battle

The 14 miracle icons and most status icons of Brief 13 were registered but
no screen showed them. Now (presentation only; no rule changed):

* **Marks over each stack's count** (`ui/src/app/stackMarks.ts` →
  `BattleStackView.marks`, drawn by `battle.ts`): defending
  (`icon.action.defend`), waited (`icon.action.wait`), its Shapeshift aspect
  (`icon.fx.summon`), and every running status — a miracle's with the
  miracle's own icon, a spell's or ability's with its kind's: Attack up/down
  `status.buff`/`status.debuff`, Defense up/down `fx.shield`/`status.weaken`,
  Speed up/down `stat.speed`/`status.frozen`, maximum/minimum damage
  `fx.divine`/`fx.shadow`, melee/ranged ward `fx.shield`/`fx.arrow`. Up to five
  icons on dark gold-rimmed discs; they appear when the spell or miracle lands,
  like the status glow. The active stack's card and the attack preview list the
  same marks with their meaning (alt text and tooltip: "Rally the Faithful:
  Attack +2 (2 rounds left)").
* **Icons before the floating words**: Defend, Wait, Ward, Lucky, morale
  (`stat.morale`) and a faltering stack (`status.stun`), healing
  (`status.heal`), damage spells by their look (`status.burning`,
  `status.frozen`, `fx.lightning`, `fx.shadow`, `status.poison` for blight and
  swarm spells — a picture of the damage, no damage over time), and a
  miracle's word or smite with the miracle's icon.
* **Map miracles**: the miracle's icon rises over the heroes or the town it
  touches (Favorable Winds, Bountiful Harvest, Tithe, Inspiration, Blessing of
  the Nile, Mists of the Sidhe, Gift of the Feathered Serpent).

Shown now: all 14 `icon.intervention.*` and `status.buff`, `status.debuff`,
`status.weaken`, `status.frozen`, `status.heal`, `status.burning`,
`status.stun`, `status.poison`. The book of Favor keeps its painted cards
(the owner's choice: no icon before miracle names).

### The AI: one big creature, and a home guard

**One big creature.** Measured with duels (four seeds per point, six
pantheons, a mixed tier-1–4 army attacking): a lone tier-7 creature held off
armies of **2.1–2.8×** its strength by the shared heuristic (two tier-6: 1.7–1.9;
an equal-strength stack of tier-2 creatures 1.2–1.7; a mixed guard 0.9–1.0). A
stack's damage falls only as whole creatures die, so a single creature hits
at full force to its last hit point. The strategic AI now judges every army
by `fightingStrength`: the shared heuristic per stack × (n + 1) / n for n
creatures (twice for one, half again for two, about 1 for big stacks); the
same duels then break even at 1.2–1.45 for a lone tier 7, in line with other
single-stack guards, which the AI's margins (1.3 for guards) cover. Its own
heroes are judged the same way (`heroPower`). The shared heuristic in the
rules is unchanged (the neutral join/flee rule uses it).

**Home guard** (`homeGuardTransfers` in `strategic.ts`). A hero visiting a
town takes the garrison's stacks highest tier first but leaves a guard, and
leaves its own lowest tiers (shooters first among equals) when the garrison is
short: from day 8, **20 %** of the strength there (hero and garrison; 10–30 %
by temperament: more with a defensive build weight, less when aggressive),
days 4–7 half that, days 1–3 nothing. The guard grows to hold the walls
against the strongest visible enemy hero within 16 hexes and, from day 4,
against a rival's fresh Tavern hero (ten tier-1 creatures) — at most 60 % of
the strength there. A hero no longer walks home for a garrison it may not
take. Found with a day-by-day trace of a Burning Oasis match: a town left with
a fifth of the strength fell on day 7 to a rival's ten-creature hero; with the
guard it holds.

**Measured** (AI against AI, the same commands before and after; small
samples, not playtest verdicts):

`npm run balance -- maps --matches 2` (each pantheon line-up from every seat,
day cap 40):

| Map | Matches | Decided (by the shrine), before → after | First knock-out, before → after (matches, mean day) | Seat scores after |
|---|---|---|---|---|
| Frostgate | 4 | 3 (0) → 2 (0) | 3, day 26.3 → 2, day 29.5 | 0.13, 0.88 (before 0.50, 0.50) |
| The Burning Oasis | 8 | 5 (2) → 4 (3) | 8, day 7.8 → 7, day 10.1 | 0.25, 0.13, 0.25, 0.38 |
| The Circle of Gates | 6 | 2 (0) → 2 (0) | 5, day 15.0 → 6, day 22.2 | 0.17, 0.33, 0.50 |
| Barrows of the Lost Kings | 4 | 1 (0) → 0 | 1, day 30.0 → none | 0.25, 0.75 |
| The Golden Fords | 4 | 2 (0) → 2 (0) | 2, day 30.0 → 2, day 26.0 | 0.63, 0.38 |
| The Six Thrones | 12 | 1 (1) → 0 | 12, day 13.7 → 11, day 22.1 | 0.19, 0.03, 0.28, 0.19, 0.19, 0.11 |

`npm run balance -- random --matches 4` (small random maps, every seat the
same pantheon): two empires 23 of 24 decided, mean day 21.8, seats 0.50/0.50 →
19 of 24, day 22.1, seats 0.48/0.52; three empires 20 of 24 decided, day 28.6,
seats 0.46/0.29/0.25 → 13 of 24, day 28.2, seats **0.38/0.33/0.29** (even
0.33).

Towns now fall later (the first empire is knocked out 2–8 days later on the
four- to six-empire maps) and fewer matches end before the day cap; the
three-empire random maps came closer to even seats. Four matches per
two-empire map are far too few to read seat scores from (Frostgate's 0.13/0.88
is two decided matches). The "before" runs used the 0.13.2 AI sources with
everything else equal (run in the same session; reports kept outside the
repository).

### The road brief (16): all five road types in the game

Two owner deliveries from `blannder_models\brief16-roads-2026-10-06` (read
only). **First the dirt track**, for review: only the three selected sheets
copied into `assets-source/sprites/final/` on both sides, `npm run
roads:import -- --dry-run` (0 problems), then the import; checked in the game
on Twin Harbors at play zoom and close up. The owner approved the dirt stage
and delivered the rest. **Then cobble, sand, snow and boardwalk** (12 sheets;
the delivery's handoff lists 1,890 edge checks passed and says some joins stay
visible): copied the same way (none existed before; all 15 SHA-256 values equal
to the delivery's `asset-manifest.json` on both sides), dry run over all 15 (0
problems), import — 15 WebP atlases, manifest `roads` with 15 entries, no other
entry changed. The importer gained `--only <text>` and `--note <text>`; the
notes record the state: dirt "approved by the owner after the in-game review",
the other four "in-game acceptance not yet recorded". Masters, proofs, guides
and the delivery's own runtime files were not copied.

In the game every map now draws painted roads (a map draws them when all three
sheets of every road type it needs are in, else the code roads — now only a
fallback). `tests/e2e/brief16.spec.ts`: on Twin Harbors (dirt), The Three
Beacons M02 (cobble), The Winter Oath M1 (snow) and The Twelfth Hour M1 (sand)
every road hex draws its tile and only that type's three atlases load; Twin
Harbors with six straight road hexes turned to marsh and rough ground draws
boardwalk and cobbles between the dirt. Screenshots at play zoom and close up
(`test-results/b16-*.png`, checked by eye): the tiles join through straights,
bends and crossings; at close zoom some joins show the steps in width and
texture the delivery notes, and a change of road type (dirt to boardwalk to
cobbles) is a hard cut at the hex edge. **Acceptance of cobble, sand, snow and
boardwalk in the game is the owner's to record.**

### Verification (commands actually run)

| Command | Result |
|---|---|
| `npm run check` | boundaries OK, type-check clean, **415/415** unit tests in 47 files (new: painted ground transitions, 4 — who reaches into whom, variants, the plan, the outline lookup; stack marks, 4 — every status kind has a delivered icon, miracles use their own, order and merging; the AI, 6 — the few-creatures factor, no attack on a lone tier 7 with 1.5× plain strength but with 3.2×, the home guard by week, the lowest tiers left behind, the guard raised by a visible enemy) |
| `python3 tools/assets/ground/import_ground.py --self-test`, `python3 tools/assets/roads/import_roads.py --self-test` | both passed |
| `npm run roads:import -- --dry-run` (15 sheets), then the imports with `--note` | 0 problems; complete road types: boardwalk, cobble, dirt, sand, snow |
| `npx playwright test` (whole suite, one worker) | **122/124 passed** in 1.4 h. Failed: the first `brief16.spec.ts` (the test's own fault: its second load found the first save; rewritten for the complete road set) and `round11.spec.ts` "the Spell button opens the casting book" (the button never settled in time under load; **passed** when rerun alone, 24 s) |
| `npx playwright test tests/e2e/brief16.spec.ts tests/e2e/brief17.spec.ts` (after the full road set) | **7/7 passed**: dirt, cobble, snow and sand maps draw every road hex as a painted tile with only their own atlases loaded, the marsh/rough stretch draws boardwalk and cobbles; battle marks over defending, waiting, blessed, cursed and slowed stacks and a miracle's own icon, the marks on the stack card, a miracle invoked in battle marking its army; the map's ground borders `softened` |
| `npm run balance -- maps --matches 2`, `npm run balance -- random --matches 4` | before and after, above |
| `npm run build` + `npm run desktop:build` + (in `apps/desktop`) `npx electron-builder --config electron-builder.json --win nsis --x64 --linux dir --x64` | **built** `Pantheon-Realms-Setup-0.13.3-x64.exe`, 530,144,312 bytes, SHA-256 `4bea4be7201770222e08f0c0546a06640a40accafc98c6a080a0f350c32b6abc`; `app.asar` 424.4 MB, 3,063 entries (0.13.2 plus the 15 road atlases; `dist/`, `package.json`, `renderer/` only) |
| `7z x` of the installer's `app-64.7z` | its `app.asar` is byte-identical to `win-unpacked` |
| `unshare -n` (no network) + packaged smoke (`tools/desktop-smoke.mjs`) | **DESKTOP SMOKE OK**: 1,293 sprites, 526 paintings, 643 interface images, 91 sounds, the map drawn with WebGL — The Three Beacons M01 with its painted dirt roads |

App version **0.13.3**; content `content-0.8.0` (saves of 0.12.0–0.13.2
load). Unsigned; **not run on Windows** here. Not checked: a human play-test
of the AI changes, of the cobble, sand, snow and boardwalk roads and of the
battle marks; Brief 17's art (not painted yet). The before/after balance
reports and the trace scripts stay outside the repository.

**Delivery.** The owner's 15 road sheets were copied into the owner's folder
from the delivery folder (SHA-256 checked there), and the Brief 17 brief, its
three ground guides and `ground-edges.json` ahead of the rest; bundle 24
(`apply_sync.py`, not committed) then wrote 50 files (24 new) with 0 problems,
the old versions measured there first (the three guides had arrived
re-encoded — same pixels — and were replaced byte for byte). The 0.13.3
installer was copied to the owner's `installer\` folder in 27 parts and joined
there (SHA-256 checked: `4bea4be7…6abc`).

## Ground edges, the road brief (16), Briefs 14 and 15 in the game; app 0.13.2 (owner requests, 2026-10-05)

Owner requests: "reverse the map's land smoothing back, it looks really bad.
Just smooth a bit the edges, not so much it looks like a blur"; "we want roads
as with real design. So give GPT 6 a guide to generate the sheets with the
styles. For each one, have a line, an angle, all possible crossing … and repeat
for each road type"; then the owner's combined delivery of Briefs 14 and 15.

### The ground: crisp again, edges only slightly softened

The soft-ground blend of 0.13.0 painted the whole map into one picture at
reduced resolution with a blur a third of a hex wide; it is gone. Each ground
type's painting is drawn per hex at full resolution again, and only where two
different grounds meet does each reach a sixth of a hex into the other in
three fading steps (`featherGroundEdges` in `presentation/src/adventure.ts`;
the map's outer edge and same-ground neighbours are untouched). Setting
`softGround` now means this edge softening. The fog's soft edges are
unchanged. Checked on screenshots of temperate, desert and tundra random maps
at two zoom levels.

### GPT-6 Brief 16: painted road tiles

`assets-source/art/briefs/GPT6_BRIEF_16_ROADS.md`. Five road types — dirt
track, cobbled road, desert flagstones, snow road, plank boardwalk — each in
three sheets: **a** dead ends (6), straights (3), wide bends (6), sharp bends
(6); **b** three-way crossings (20: two Y crossings, twelve straights with a
branch, six fans) and the six-way; **c** four-way (15, incl. the three X
crossings) and five-way (6). That is every one of the 63 ways a road can
leave a hex, 15 sheets of 7 × 3 cells (256 × 256 px; the hex 224 px wide and
foreshortened to 84 % like the map). The guides are drawn from the game's own
hex geometry (`npm run art:road-guides`): each cell shows the hex, the road's
footprint and a red bar where it must cross each connected edge (the middle
36 % of the edge for the surface, 50 % with its verge), so any two tiles join;
a join example shows tiles meeting on the map. Which road a hex gets follows
its land (`roadTypeFor`): boardwalks over marsh (and water), desert flagstones
in the desert, snow roads in tundra and fjord, cobbles in the mountain
climates and on rough ground, dirt tracks elsewhere.

The game reads the sheets already: `npm run roads:import` checks every cell
against the guide (the road must reach each connected edge at its middle and
no other edge), clips each tile to its hex and writes one WebP atlas per sheet
(`assets-runtime/sprites/final/roads/`, manifest `roads`). The adventure map
draws one tile per road hex by its connections and land once all three sheets
of every road type the map needs are imported; until then it keeps the
code-drawn roads, so a map never mixes the two. Checked with synthetic sheets
made from the guides (imported, rendered on a random map: the tiles join
across hexes through bends and crossings, type changes on rough ground), then
removed again; `import_roads.py --self-test` passed; unit tests keep the cell
order equal in the guides and the game.

### Briefs 14 and 15 in the game (owner delivery)

**Copied and imported.** From the owner's delivery folder (read only) into the
game, in the owner's folder and the cloud copy: 12 paintings into
`assets-source/art/final/` and 74 sprites plus the throw strip's JSON sidecar
into `assets-source/sprites/final/` — 87 files, none existing before, all 86
PNG SHA-256 values equal to the delivery's `asset-manifest.json` on both sides.
`npm run sprites:import -- --only siege.` imported 74 files with 0 problems;
`npm run art:import` (no `--prune`) made 526 runtime files and kept the 180
whose masters are not in the cloud copy. Result: **73 new siege stills, 1 new
effect strip, 18 new art entries** (six cards, six full pictures, six siege
battlefields); every other runtime file and manifest entry unchanged (hash
comparison before and after). The importer's provenance now names Brief 15 for
the throw strip.

**Accepted resolution exception** (the owner's choice: "deliver native paintings
and clearly document resolution shortfalls"). The six map paintings are native
1672 × 941 (Six Thrones 1672 × 940), below the brief's 1920 × 1080; the six
siege battlefields are native 1419 × 1108 (Celtic 1419 × 1109), below
4096 × 3200, and look softer stretched over the field. None was enlarged; the
cards (640 × 360) and full pictures are the importer's usual derivatives.
Sprites meet their sizes.

**Integration.**
* *Skirmish pictures:* the list cards, the selected map's picture (now capped at
  38 % of the screen height so the facts and the layout stay in view) and the
  seat setup show the paintings; the backdrop uses the full picture.
* *Sieges:* the defending town's pantheon chooses the wall, gate, tower and keep
  pieces and the battlefield (the shared set stays the fallback). A pantheon's
  own keep is drawn at the board's scale (the old shared keep was enlarged
  1.6×), and a siege board keeps two hex widths east of the field so the keep
  is whole on screen.
* *Siege battlefields:* each painting's ditch and crossing were painted off the
  brief's design positions (ditch up to 1.8 hexes east, crossing about a row and
  a half above the gate). Measured per file and corrected by shifting the
  painting on screen (`SIEGE_GROUND_SHIFT`): Greek −1.6 %/+3.75 %, Norse
  −4.45 %/+4.4 %, Egyptian 0/+3.2 %, Japanese −2.45 %/+3.0 %, Celtic
  −1.74 %/+3.25 %, Mesoamerican −3.0 %/+3.9 % of the painting's width/height.
  The board never moves; the moat cells now lie on the painted ditch and the
  gate row on its crossing. The painted town streets start farther east than
  the brief asked (open ground just inside the wall).
* *Catapult:* the still stands west of the field; at each shot it hides and the
  throw strip plays once in its place (same frame, anchor and scale), the
  game's stone leaves the cup at the strip's release frame (frame 5, 1/3 s at
  12 fps) and flies on while the arm settles, then the still returns. On Low
  graphics (simple effects) the still stays and only the stone flies.

### Verification (commands actually run)

| Command | Result |
|---|---|
| `npm run check` | boundaries OK, type-check clean, **401/401** unit tests in 44 files (new: road tile order and land, 3; siege battlefields per pantheon, 1; the art-count tests now include the six map pictures and six siege battlefields, and the effect-strip test the catapult's throw) |
| `python3 tools/assets/roads/import_roads.py --self-test`, `python3 tools/assets/sprites/import_sprites.py --self-test` | both passed |
| `npx playwright test` (whole suite, the final build, one worker) | **121/121 passed** in 1.1 h, among them the new `brief15.spec.ts` (5: every pantheon's level-3 and level-2 siege draws its own pieces and battlefield, the damage states, the catapult's throw filmed at a round start, the skirmish pictures in the list, detail and setup) |
| `npm run build` + `npm run desktop:build` + (in `apps/desktop`) `npx electron-builder --config electron-builder.json --win nsis --x64 --linux dir --x64` | **built** `Pantheon-Realms-Setup-0.13.2-x64.exe`, 525,320,292 bytes, SHA-256 `9046057514a03d6b3e157f31c025e881719c2deefeb5f2f68b4b07b64e98efbd`; `app.asar` 419.6 MB, 3,047 entries (0.13.1 plus the 92 new runtime files; `dist/`, `package.json`, `renderer/` only) |
| `7z x` of the installer's `app-64.7z` | its `app.asar` is byte-identical to `win-unpacked` |
| `unshare -n` (no network) + packaged smoke (`tools/desktop-smoke.mjs`) | **DESKTOP SMOKE OK**: 1,293 sprites (1,219 before), 526 paintings (508), 643 interface images, 91 sounds, the map drawn with WebGL |

App version **0.13.2**; content `content-0.8.0` (saves of 0.12.0–0.13.1 load).
Unsigned; **not run on Windows** here. Not checked: a human play-test of a
siege of every pantheon, the road brief's art (not painted yet), and the
skirmish pictures on large displays.

**Delivery.** The 87 delivered files were copied into the owner's folder from
the delivery folder (hashes checked there); bundle 23 (`apply_sync.py`, not
committed) then wrote 123 files (102 new) with 0 problems, the old versions of
the 21 changed files measured there first. The 0.13.2 installer was copied to
the owner's `installer\` folder in 26 parts and joined there (SHA-256 checked:
`9046057…efbd`).

## Brief 13 icons in the game; app 0.13.1 (owner delivery, 2026-10-05)

The owner delivered Parts B–E of GPT-6 Brief 13: **94 icons** (38 interface
icons, 22 map markers, 20 effect and status icons, 14 divine interventions),
prepared in a separate delivery folder with a scoped import helper
(`import_brief13.py`, a dry run unless `--apply`). **Part A, the six town
backgrounds, was not part of it and is still open.**

**Import.** The delivery was checked first: 94 masters (1254 × 1254 RGBA) and
94 runtime PNGs (96 × 96; the nine main-menu icons 192 × 192, as the brief's
interface section asks), every SHA-256 matching the delivery's manifest, every
runtime file transparent RGBA. The helper was read before use: it copies only
the 94 masters into `assets-source/icons/final/` and the 94 runtime files into
`assets-runtime/ui/icons/final/`, merges their 94 entries into
`assets-runtime/ui/final-manifest.json` without touching any other, and backs
up the previous manifest. It was run with `python3 -B` (nothing written into
the delivery folder), dry run first, in the cloud copy and then in the owner's
folder: 94 registrations, 188 copies, 491 other entries kept; afterwards 585
entries, the 491 earlier ones equal as JSON values, the top-level fields
unchanged. The manifest is byte-identical in both places (SHA-256
`6dd864cb…0c7e`) and all 188 files hash as delivered in both. The game's own
importer was not used: its full run re-encodes and re-dates every icon, and
the delivered runtime files are what it makes (same Lanczos downscale, PNG with
alpha) except that it would have shrunk the menu icons to 96 px. The helper's
backup of the old manifest stays in the owner's folder
(`assets-source/icons/import-backups/brief13-20261005-190251-073589/`, not
tracked; in the cloud copy it was moved out of the repository).

**Code.** None for the art: each file is found by its asset ID, and final art
takes precedence over the concept crops (which stay in `assets-runtime/ui/icons/`
as the fallback). Two tool fixes so that 192-px menu icons are expected: the
final-art unit test (`packages/ui/test/uiArt.test.ts`, which failed on its
first run with the delivery) and `npm run icons:import` now read the interface
section's "menu icons 192 px" for `icon.menu.*`; both read 96 px before.

**Icon inventory** (`npm run icons:catalog`): 843 entries in 14 sections, **827
final art**, 16 procedural (hero and Herald portraits that are a generated
square outside the dialogue window); `icon-inventory.json` updated. The
Markdown, CSV and XLSX production lists it also writes were not kept (removed
in the release clean-up as finished lists).

**Where they show** (`tests/e2e/brief13.spec.ts`, new, **4/4 passed**: on every
visited screen no replaced crop is drawn and every icon image decodes;
screenshots `test-results/b13-*.png` checked by eye): main menu and New Game;
resource bar and costs at 24 px, the day counter, the hero and town tabs; the
tile panel over the player's own town (blue banner), a hostile town (red) and
a neutral town (grey), sawmill, quarry, crystal deposit, gold mine, a supply
cache and a claimed one (check); hero statistics; a building's costs; the
Pantheon screen; the miracle book on the map and in battle; the Journal; the
Encyclopedia; the battle action bar (Spell disabled and greyed) and the stack's
statistics. 44 of the 94 were on those screens. The rest, and why:

* the other 12 markers — on maps with those sites (artifact, creature camp,
  portal, shrine, watchtower, gates and so on); Twin Harbors has none;
* `icon.action.ability` and `icon.action.surrender` — a stack with an active
  ability, a battle against a hero; Quit — the desktop build only (its
  screenshot shows it); Credits — no screen yet;
* the 20 effect and status icons — stand-ins for a spell without its own icon
  (every spell has one) or not used yet, as the brief said;
* **the 14 intervention icons — no screen shows them today**: the miracle book
  shows each miracle's painted card (all 14 delivered), and the owner's fix of
  2026-10-05 removed the icon before each miracle's name on the Pantheon page.
  They are registered under the interventions' `iconAssetId` and appear wherever
  a card is missing; the layout was not changed to show them.

All 94 were also composited on the game's dark panel and on the miracle book's
parchment at 24 and 48 px: clean edges, no fringe.

**Still concept crops on screen** (not in Brief 13 — the inventory step lists
them as unused files although the code shows them): `icon.marker.hero` and
`icon.marker.enemy-hero` (tile panel over a hero) and `icon.marker.encounter`
(a failed objective in the Journal).

### Verification (commands actually run)

| Command | Result |
|---|---|
| `python3 -B import_brief13.py --project <checkout>` then `--apply` (cloud copy, owner's folder) | dry run and apply as above; manifests identical, 188/188 file hashes as delivered |
| `npm run check` | boundaries OK, type-check clean, **397/397** unit tests in 43 files |
| `npm run icons:catalog` | 843 entries, 827 final, 16 procedural |
| `npx playwright test tests/e2e/brief13.spec.ts` | **4/4 passed** |
| `npx playwright test tests/e2e/features.spec.ts tests/e2e/heroscreen.spec.ts tests/e2e/mapSites.spec.ts tests/e2e/menu.spec.ts tests/e2e/round19.spec.ts` | **22/22 passed** |
| `npm run build` + `npm run desktop:build` + (in `apps/desktop`) `npx electron-builder --config electron-builder.json --win nsis --x64 --linux dir --x64` | **built** `Pantheon-Realms-Setup-0.13.1-x64.exe`, 517,555,335 bytes, SHA-256 `6575636defca3018d5ef65717b041d63dafbc2952b1cd4585811b645c87cf7b3`; `app.asar` 411.8 MB, 2,955 entries (0.13.0 plus the 94 icons; `dist/`, `package.json`, `renderer/` only) |
| `7z x` of the installer's `app-64.7z` | its `app.asar` is byte-identical to `win-unpacked` |
| `unshare -n` (no network) + `PR_SMOKE_EXE=apps/desktop/release/linux-unpacked/pantheon-realms xvfb-run -a node tools/desktop-smoke.mjs` | **DESKTOP SMOKE OK**: 1,219 sprites, 508 paintings, **643** interface images (549 before), 91 sounds, the map drawn with WebGL, the menu with the new icons and v0.13.1 |

App version **0.13.1** (art only; content `content-0.8.0`, saves of 0.12.0 and
0.13.0 load). Unsigned; **not run on Windows** here. Not checked: the icons on
real displays at other scalings, and the markers of sites Twin Harbors lacks
inside the running game.

**Delivery.** Bundle 22 (`apply_sync.py`, not committed) wrote the 10 changed
files (one new) into the owner's folder with 0 problems, their old versions
measured there first. The 0.13.1 installer was copied to the owner's
`installer\` folder in 25 parts and joined there (SHA-256 checked:
`6575636d…f7b3`).

## Six skirmish maps and the owner's ten fixes; app 0.13.0 (owner requests, 2026-10-05)

### Six authored skirmish maps (proposed)

Owner request: "suggest 4 new skirmish maps", then "suggest 2 more and build
all of them … have a file for GPT 6 to generate the images we need for the
skirmish picking window".

| Map | Empires | Size | Climate | Goal | What shapes it |
|---|---|---|---|---|---|
| Frostgate | 2 | 38 × 30 | fjord (Icy spray) | conquest | one pass through the ridge, shut by twin crimson key gates; each empire's crimson key on its own glacier island, reached by portal, guarded by 8 wyverns |
| The Burning Oasis | 4 | 46 × 36 | desert (Scorching sand) | hold the shrine 7 days, or conquest | four corners; between each pair of neighbours an oasis (gold mines north and south, crystal east and west, a creature camp in each); the Burning Shrine in a ring of red rock with one opening toward each empire |
| The Circle of Gates | 3 | 54 × 42 | high pass (Thin air) | conquest | three valleys round a peak sanctum (three spell shrines, the Crown of the Summit), guarded paths and ridge crossings; a ring of portals: each home gate opens on a walled terrace behind the next empire's town (guarded), each back gate leads to the previous empire's home |
| Barrows of the Lost Kings | 2 | 38 × 30 | moor (fog) | conquest | prisons (a level-5 hero of your own pantheon behind barrow-wights; a level-7 veteran in the King's Barrow), two quest huts, amber and violet key vaults with a major artifact, a relic in the middle, one gold mine per side |
| The Golden Fords | 2 | 38 × 30 | autumn (Harvest wind) | conquest | two rivers with three guarded fords each; the rich middle (mines, mill, camp, the Horn of Plenty); twice the usual treasury; revealed map |
| The Six Thrones | 6 | 68 × 56 | coast | hold the shrine 10 days, or conquest | one island in six wedges between ridges with one guarded pass to each neighbour and one guarded path to the central shrine |

**How they are made.** Each map is a custom map document (the editor's
`*.prmap.json`) written by `npm run maps:build` from `tools/maps/maps.ts`:
designed for empire 1 and copied to the others by exact hex-grid symmetries
(half turn; turns of 120° or 60°; mirror and half turn for four), so every
empire's ground, sites and distances are the same. Scattered ground (woods,
dunes, bogs) reads the copy of each tile in empire 1's part of the map, so its
density does not pile up with the number of copies. The build checks the
editor's validation, exact symmetry of the ground, one road into every town
and each map's promises (e.g. Frostgate's pass is shut without the key, the
Circle's land is shut without portals) and prints distances: towns are 26
(Frostgate), 24/26/36 (Oasis), 17/17 (Circle), 32 (Barrows), 26 (Fords) and
20/36/40 (Six Thrones) steps apart, the same for every empire. Layout guides
for the brief: `assets-source/art/briefs/guides/skirmish.<map>.layout.png`.

**Format and rules.** The custom map types moved to `@pr/rules`
(`definitions/customMap.ts`, re-exported by `@pr/mapgen`) so content carries
the maps (`packages/content/src/skirmish/maps/`, catalog `skirmishMaps`,
`SkirmishMapValidator`). The format gained six site kinds the rules already
had — key tent and key gate (colour), prison (level, hero or the nearest
empire's pantheon), quest hut (bring resources or beat a named guard; reward
Gold, experience, artifact), watchtower (range) and artifact (named, or a
rarity picked deterministically per map) — plus guards of several stacks with
a label and a reward. The map editor places and edits all of them and opens a
copy of any skirmish map. `compileSkirmishMap(catalog, mapId, seats)` compiles
a map for the chosen pantheons; the mission is an ordinary generated mission
(saves embed it).

**AI fixes found on the way** (all maps, random maps too): a hero now routes
through a known portal to a target it cannot reach on foot at all (it used to
consider portals only for far targets, so a hero that took a portal to an
island stayed there), and a hero standing on a portal steps off and back on to
use it again.

**Screens.** New Game → Skirmish lists the six maps after Twin Harbors with a
picture (the drawn layout until Brief 14 arrives), the detail panel gives the
facts (empires, size, goal, climate, treasury, revealed map) and the layout;
**Set Up Empires** opens S23 (one seat per empire: pantheon, human or AI, name,
patron; difficulty), and Start opens the adventure map. A delivered painting
also becomes the screen's backdrop when its map is selected.

**Measured** (AI against AI, `npm run balance -- maps`, each pantheon line-up
played from every seat, day cap 45; small samples, not playtest verdicts):

| Map | Matches | Decided (by the shrine) | Mean decisive day | Seat scores |
|---|---|---|---|---|
| Frostgate (after the islet guard was eased to 8 wyverns) | 6 | 5 (0) | 29.4 | 0.50, 0.50 |
| The Burning Oasis | 8 | 5 (2) | 28.8 | 0.25, 0.13, 0.25, 0.38 |
| The Circle of Gates (before the guarded terrace) | 6 | 6 (0) | 32.5 | 0.50, 0.17, 0.33 |
| Barrows of the Lost Kings | 6 | 3 (0) | 21.7 | 0.50, 0.50 |
| The Golden Fords (after the ford guards were raised) | 6 | 5 (0) | 34.4 | 0.33, 0.67 |
| The Six Thrones | 12 | 5 (5) | 37.4 | 0.04, 0.29, 0.38, 0.21, 0.04, 0.04 |

The maps are symmetric by construction, so seat differences come from the
turn order and the AI; the samples are far too small to tune on. Early
knock-outs (days 5–8) happen on the open maps (Oasis, Fords before the guard
change) when a neighbour's first army finds a town with an empty garrison.
Frostgate's first version stranded both AI leaders on their islands (the
portal fix above) and lost heroes to a drake the AI underrates (one big unit
reads weaker than it fights); the islet now holds wyverns.

**GPT-6 Brief 14** (`assets-source/art/briefs/GPT6_BRIEF_14_SKIRMISH_MAPS.md`):
six 1920 × 1080 paintings, `mission.skirmish.<map>.thumbnail.png`, with prompts
and the layout guides; `npm run art:import` makes the card and keeps the full
picture (the importer recognises `mission.skirmish.<map>.thumbnail`).

### The owner's ten fixes (2026-10-05)

1. **Roads** are joined into runs between junctions, rounded (corner cutting)
   and drawn in the land's style (`presentation/src/roads.ts`): rutted dirt on
   grass (by climate: brown, golden, sandy, peat, red earth), sandstone flags
   in the desert, packed snow in the north, cobbles in the mountains, plank
   boardwalks over marsh. Code only; no road art needed.
2. **Pantheon page:** no subtitle; the signature under the patron's text on the
   left (its "Proposed · active here" chip removed); only first- and
   second-choice gods in the list; miracles show their price as the number and
   the Favor icon, without the icon before the name or the explanation line.
3. **Recruit page:** no subtitle; "Upgrade troops" (button and hint too); the
   bestiary entry is a book icon beside the creature's name.
4. **Adventure map:** End Day starts level with the hero list; a town that can
   still build today shows a hammer icon instead of the "Build" tag.
5. **Soft ground:** the ground is painted once per map into one picture in which
   each ground type fades into the next over a third of a hex (the map's outer
   edge stays crisp); the fog's edges fade the same way. Setting
   `softGround` (on at every quality level).
6. **Dwellings:** the tier-3 dwelling now needs the tier-2 dwelling and the first
   temple (Greek Griffin Aerie: Peltast Range + Temple I; Norse Troll Cave:
   Wolf Den + Hof I; the other four pantheons follow the Greek tree), never the
   tier-4 one; the content validator refuses any dwelling that needs a higher
   tier. **Owner decision; changes The Three Beacons' town too.**
7. **Battle:** no burst over a struck creature; a killing blow shows the whole
   hit strip, a pause, then the death; a creature that moved and won the last
   fight of a battle no longer jumps back to where it started (the final view
   never arrives, so its move is now remembered).
8. **Result screen:** the Won/Lost tags are gone.
9. **GPT-6 Brief 15** (`GPT6_BRIEF_15_SIEGES.md`, guide `guides/siege.layout.png`):
   each pantheon's wall, gate, tower and keep in three states, a siege
   battlefield per pantheon with the town's streets, and the catapult with a
   throw strip. The game already looks them up (`<kind>.<state>.<pantheon>`,
   `battlefield.siege.ground.<pantheon>`, `catapult.intact`,
   `fx.siege.catapult.throw`; the importer knows the names). Wall pieces now
   stand on one straight line between the zig-zagging cells of the wall column.
10. **Siege:** a catapult stands west of the field and throws (its arm whips up
    and the stone leaves the cup; drawn by code until Brief 15); arrows are
    drawn at a third of their size.

### Verification (commands actually run)

* `npm run maps:build` — six maps, all checks green.
* `npm run check` — boundaries, type-check, **397/397** unit tests (new:
  skirmish maps 18, roads 3, dwelling order 1).
* `npm run balance -- maps --matches 2` and `-- maps --maps frostgate,golden_fords,barrows --matches 3` (above).
* `npx playwright test` (the whole suite, the final build, Chromium +
  SwiftShader, one worker) — **112/112 passed** in 55.0 min, among them the
  new `skirmishMaps.spec.ts` (3: the six cards with picture, facts and layout;
  Frostgate's two seats to the adventure map; The Six Thrones' six seats and
  hold-the-shrine goal) and `campaign.spec.ts` with the "Upgrade" button.
* Screenshots checked by eye (cloud build): soft ground and fog, the roads by
  land (desert flags, moor planks), the pantheon and recruit pages, End Day
  level with the hero list, the town's hammer icon, the drawn catapult in a
  siege, the smaller arrows.
* `node tools/perf/load-time.mjs` (3-run medians, SwiftShader): local menu
  **207 ms**, first scene **913 ms**; web 474 / 910 ms (0.12.0: 229 / 879 and
  467 / 885 ms). The soft ground is painted once per map after its textures
  settle.

### App 0.13.0 (Windows installer for play-testing)

| Command | Result |
|---|---|
| `npm run build` + `npm run desktop:build` + (in `apps/desktop`) `npx electron-builder --config electron-builder.json --win nsis --x64 --linux dir --x64` (Linux + Wine) | **built** `Pantheon-Realms-Setup-0.13.0-x64.exe`, 515,839,545 bytes, SHA-256 `ca044e0f28c891e98a00ca007a6820705286e47b36aa87c0c7c4572dd2cfabb1`; `app.asar` 410.0 MB, 2,861 entries (`dist/`, `package.json`, `renderer/` only: no development tools, MCP servers, sources, tests, source maps, briefs or map-authoring tools) |
| `7z x` of the installer's `app-64.7z` | its `app.asar` is byte-identical to `win-unpacked` |
| `unshare -n` (no network; loopback only) + `PR_SMOKE_EXE=apps/desktop/release/linux-unpacked/pantheon-realms xvfb-run -a node tools/desktop-smoke.mjs` | **DESKTOP SMOKE OK**: `prgame://app/index.html`, saves and records written, 1,219 sprites, 508 paintings, 549 interface images, the custom cursor, 91 sounds (6 decoded at the menu, context running), the adventure map drawn with WebGL (soft ground and fog visible in its screenshot), packaged without dev tools |

App version **0.13.0**; content stays `content-0.8.0`, so 0.12.0 saves load
(a town in such a save keeps what it has built; the new dwelling
requirements apply to what it builds next).
Unsigned (Windows SmartScreen will ask once); **not run on Windows** here.

Not checked: a run on Windows itself, a human play-test of the six maps and
of the battle and road changes, and the GPT-6 art of Briefs 14 and 15 (not
painted yet: the skirmish cards show the drawn layout, the siege the shared
wall set and the code-drawn catapult).

**Delivery.** Bundle 21 (`apply_sync.py`, not committed) wrote 73 files (30
new) into the owner's folder with 0 problems; the old versions of the 43
changed files were first measured there with `git hash-object` (one, this
file, held the bundle 20 delivery note written after that bundle). The
installer was copied to the owner's `installer\` folder in 25 parts and
joined there (SHA-256 checked: `ca044e0f…abb1`); the 0.12.0 installer stays
beside it.

## Release round: pantheon balance, final sounds, three map layouts, the map editor, Brief 12, the clean-up and app 0.12.0 (owner requests, 2026-10-05)

Seven owner requests and one delivery, in the cloud copy and the owner's
folder (bundle 20, hash-checked; not committed).

### Pantheon balance on random maps (target: every pantheon 0.45–0.55)

A new balance suite, `random1v1` (`npm run balance -- random1v1 --matches N`;
`--map-types`, `--sizes`, `--focus`), plays every pairing of the six pantheons
on generated small maps, each map twice (once from each seat, so the map and
the first move cancel out), the map types in turn, few wandering monsters,
last empire standing, day cap 40. A match still open at the cap counts for a
side at least 25% stronger in armies, else half a win each. The report gives
the matrix, each pantheon's average against the other five with a "Target
0.45–0.55" column, the score by map type and the first seat's score; a day-15
snapshot per seat (army strength, buildings, gods, gold, heroes, towns) is
kept for diagnosis. AI-vs-AI measurements with the shipped AI, not playtest
verdicts.

Measured (commands actually run, 2 workers):

| Run | Content | Maps | Greek | Norse | Egyptian | Japanese | Celtic | Mesoamerican |
|---|---|---|---|---|---|---|---|---|
| `random1v1 --matches 20 --map-types continental,highlands,lake_isle,wild_forest,marshlands,crossroads` | before this round | 600 | 0.55 | 0.46 | **0.62** | **0.42** | 0.47 | 0.50 |
| same | Japanese and Egyptian creatures, leaders (below) | 600 | 0.53 | **0.42** | **0.65** | **0.43** | 0.50 | 0.48 |
| same, `--matches 12 --no-temperaments` | same | 360 | 0.55 | 0.52 | 0.51 | 0.53 | 0.45 | 0.44 |
| `random1v1 --matches 24` (all nine layouts) | Raiders and Builders softened, tier-7 Health | 720 | 0.55 | 0.51 | **0.64** | **0.39** | 0.46 | 0.46 |
| `random1v1 --matches 12 --focus japanese,egyptian` | Builders and Disciplined softer still | 216 | 0.50 | 0.52 | **0.58** | **0.41** | 0.48 | 0.52 |
| same, `--focus japanese`, Disciplined neutral | (experiment) | 120 | — | — | — | 0.49 | — | — |
| `random1v1 --matches 24` (all nine layouts) | Builders and Disciplined near neutral | 720 | 0.56 | 0.54 | 0.54 | **0.40** | 0.47 | 0.49 |
| `random1v1 --matches 24 --focus japanese`, merged with the run above | **final**: Kappa Speed 5/6, Kirin and Jorogumo Health | **720** | **0.57** | **0.51** | **0.53** | **0.47** | **0.45** | **0.47** |
| `random1v1 --matches 24 --focus greek,celtic`, merged (experiment, reverted) | Glory +15%, Selkie Speed 6 | 720 | 0.58 | 0.52 | 0.54 | 0.45 | 0.43 | 0.48 |

The finding: once the creatures were close, the remaining gaps came from the
**AI temperaments**, not from the pantheons. Played the neutral way, the six
pantheons scored 0.44–0.55; with the first temperament weights the Egyptian
Builders (wider attack margin, economy and walls ×1.4) won 0.62–0.65 and the
Norse Raiders (attacking at smaller margins) and Japanese Disciplined
(upgrading dwellings first) lost. The temperaments keep their habits with
smaller weights (`packages/content/src/common/temperaments.ts`): Raiders
boldness 0.95 (was 0.88), raid value ×1.15 (1.3), military ×1.15 (1.25),
economy ×0.95 (0.9), magic 0.9 (0.85), still one extra hero; Builders
boldness 1 (1.12), raid value ×0.95 (0.85), economy and defense ×1.1 (1.4);
Disciplined elite ×1.05 (1.5, then 1.2). Their summaries say what they still
do. A Japan-only experiment with a fully neutral temperament scored 0.49
(120 matches) against 0.41 with a Disciplined of boldness 1.06 and elite ×1.05 — so even small weights move
the AI's strength by pantheon; the temperament checks belong in every
balance run. Content changes (proposed values, DESIGN_PROPOSALS.md item 42):

* Japanese creatures were the weakest for their price at almost every tier
  (same-tier duels): River Elder Kappa, Tengu, Great Tengu, Oni, Jorogumo,
  Queen Jorogumo, Kirin, Celestial Kirin, Orochi and Imperial Orochi gain a
  little Attack, Defense, Health or damage; the tier-4 and tier-6 prices match
  the other pantheons (350/450 and 1,000/1,250 Gold); the skirmish escort is
  23 Kitsune (was 21).
* Egyptian outliers a little weaker: Royal Ushabti (Defense 11, Health 32),
  Crocodile Beast (Attack 11, Health 34), Anubian Warden (Defense 4), Desert
  Colossus (Health 214).
* Japanese, second pass: Kappa Speed 5 (was 4), River Elder Kappa 6 (5),
  Kirin Health 90 (84), Celestial Kirin 104 (97), Jorogumo 38 (36), Queen
  Jorogumo 44 (42).
* Tier 7: Stone Colossus Health 255 (was 240), Sun Colossus 298 (280),
  Fomorian Giant 260 (250), Ancient Fomorian 312 (300).
* Random maps: every empire's first leader has the same kind of specialty
  (+250 Gold a day: Odysseus, Ragnar, Hatshepsut, Yamato Takeru, Medb,
  Nezahualcoyotl).
* The Afterlife signature stays at 20% (10% and 15% were tried; no
  measurable difference).

Content stays `content-0.8.0` (values changed without a version bump), so
0.11.0 saves still load and play on with the new values. Noise: 240 matches
give each average a standard error of about 0.03; the per-pairing cells (48
matches) about 0.07.

**Result (final content, 720 matches on all nine layouts, both seats):**
Norse 0.51, Egyptian 0.53, Japanese 0.47 and Mesoamerican 0.47 are inside
0.45–0.55; **Greek 0.57 is above it and Celtic 0.45 (0.446) at its lower
edge**. The owner stopped the tuning here (2026-10-05: "good enough"). The
last experiment — Glory +15% XP and Selkie Speed 6 — measured Greek 0.58 and
Celtic 0.43, no better within the noise, and was reverted, so the shipped
values are the ones measured as final. The first seat scored 0.47 (623
matches decided by elimination, mean day 21.3; 79 on army strength at the
cap; 18 draws).

| Layout | Greek | Norse | Egyptian | Japanese | Celtic | Mesoamerican |
|---|---|---|---|---|---|---|
| continental | 0.60 | 0.60 | 0.67 | 0.35 | 0.38 | 0.41 |
| highlands | 0.58 | 0.48 | 0.55 | 0.46 | 0.31 | 0.62 |
| lake_isle | 0.44 | 0.68 | 0.68 | 0.44 | 0.46 | 0.25 |
| wild_forest | 0.48 | 0.63 | 0.36 | 0.62 | 0.46 | 0.46 |
| marshlands | 0.60 | 0.50 | 0.54 | 0.46 | 0.46 | 0.43 |
| crossroads | 0.47 | 0.48 | 0.50 | 0.38 | 0.57 | 0.61 |
| archipelago | 0.50 | 0.54 | 0.62 | 0.50 | 0.46 | 0.38 |
| twin_continents | 0.75 | 0.27 | 0.52 | 0.54 | 0.39 | 0.54 |
| central_valley | 0.77 | 0.41 | 0.32 | 0.44 | 0.50 | 0.55 |

(80 matches per cell; standard error about 0.06.) The merged run is honest
only because the later runs changed one pantheon's units at a time: the
Japanese re-run replaced every Japanese pairing of the 720-match run with
the same maps and seeds, and the pairings without Japan are untouched by
Japanese values. A run of 720 took 37–93 minutes with two workers.

### Final music and sounds (Pixabay, with the owner's approval)

Every sound the game plays is now a recording (status **final**; the
manifest holds 91 entries, none a placeholder). 105 sources from Pixabay
under the **Pixabay Content License (no attribution required)**, chosen with
the owner's approval: only items not marked AI-generated and without a
YouTube Content ID registration at selection time. The list — every sound ID,
the tracks it uses, each source's title, author, page and licence — is
`assets-source/audio/sounds.json`; `tools/audio/import_sounds.py --from <dir>`
converts and registers them (CLAUDE.md):

* **Music** (two-pass EBU R128 to −16 LUFS as the map music, Ogg q2,
  streamed): a menu theme (two tracks), battle music by the viewing player's
  pantheon (`music.battle.<pantheon>`: three tracks each, two for the
  Japanese), siege music for any battle at a town's walls (`music.siege`, two
  tracks), mission-results music (two tracks); `music.battle` (the first
  track of each pantheon) stays as the fallback. 23 files, 70.4 minutes.
* **Stingers** (victory 7.7 s, defeat 15 s, level-up, beacon) and **effects**
  (61 sound IDs: interface, building and recruiting, the day and week, combat
  blows, shots, deaths, sieges, spells and Favor): leading and trailing
  silence trimmed, cut to each sound's length limit, loudness matched to the
  placeholder it replaced so the mix keeps its balance, Ogg q3–q4. Several
  combat sounds have two or three variants.
* **Ambience** (nine soundscapes and the battlefield): seamless loops of at
  most 60 s (equal-power crossfade of the end into the start), level-matched.

The downloads came through the built-in browser; 75 waited as `.tmp` files
until the owner approved them in chat, and each of the 106 downloaded files
was identified by its SHA-256 against the Pixabay CDN copy (two approved files
carried another item's name; one track, Japanese battle music “Joushitai”,
never downloaded and was dropped from the playlist). Audio total in the game
161 MB (map music 104 MB).

The adventure map's old "soundscape" music (`music.explore.*`, eight
synthesized loops that only played when a pantheon had no playlist) is
retired: the map plays the viewing player's pantheon playlist, else the Greek
one; the soundscapes keep their ambience. `tools/audio/make_placeholders.py`
no longer makes them; `sounds.json` lists them under `retire`.

### Three more random-map layouts (`pr-skirmishgen-0.6`)

Archipelago (every region an island; straits, a lagoon around the central
isle crossed by one sandbar per empire, the open sea along the rim; twin
portals cross the straits), Twin Continents (two empires; a strait splits
the land, the central island is the only land bridge, twin portals cross the
water) and Central Valley (a valley ringed by ridges with two guarded passes
per empire; inside, a guarded gold mine and crystal deposit per empire
besides the central prize). The older six layouts draw the same maps from the
same seed as before (noise label kept at 0.5). The setup offers nine layouts
and disables Twin Continents for more than two empires. Unit tests: every
layout generates for two to six empires where allowed, connected and
symmetric (SKM tests); `tests/e2e/round20.spec.ts` **passed** (nine layout
cards, Twin Continents disabled at three empires, an Archipelago map starts
with more than 100 water cells and over 20 sites).

### Map editor (S22)

New Game → **Map Editor** (`packages/ui/src/screens/MapEditor.tsx`, document
model `packages/mapgen/src/custom.ts`): paint the six grounds with brush 1–3,
lay or remove roads, place towns (one per empire), mines, treasure chests,
supply caches, learning stones, spell shrines, skill trainers, windmills,
creature camps, twin portals (in pairs), monsters and the Shrine of the First
Flame, each guardable with a chosen creature and count; set two to six
empires and their pantheons, the land, the victory goal (last empire standing
or hold the shrine), starting wealth and a revealed map. Undo and redo;
Escape asks before leaving unsaved work. The Check tab lists what keeps the
map from being played (no town for an empire, a site on water or mountains,
a site nobody can reach, a lone portal, a missing shrine). Maps live in a map
library (desktop: `<userData>/maps/<id>.prmap.json`, 4 MB cap, IPC
`pr:listMaps` / `readMap` / `writeMap` / `deleteMap` / `exportMap` /
`importMap`; browser: local storage) and export or import as `*.prmap.json`
(untrusted files are validated before use). Play compiles the map into an
ordinary generated mission (seats, patron gods, difficulty), so a custom game
saves and loads like a random map. Measured: `packages/campaign/test/customMap.test.ts`
5/5; `tests/e2e/mapEditor.spec.ts` **2/2 passed** (paint, road, both towns, a
guarded mine and a portal pair → "Ready to play"; guard edited; saved,
reopened from the library; exported file checked; played to the adventure
map; a damaged file refused with its reason; Escape asks first).

### Brief 12 visuals (owner delivery, 2026-10-05)

The owner's checkout already held the delivery (84 dwelling and 42 service
cutouts, 9 climate icons, 8 site markers, `fx.god.commit`; imported there by
the delivery's own steps); the cloud copy took the same runtime files and
manifests from it. Checked here through the real screens
(`tests/e2e/brief12.spec.ts`, **4/4 passed**): all 18 locations of every
pantheon's town show delivered art with base and upgraded dwellings (12
screenshots, every slot from `art/town/`); the nine battle climate chips show
their own icon with the rule as tooltip; the tile panel shows each of the
eight random-map site markers. The key tent and key gate markers are now
tinted with their key's colour in the tile panel (their light surfaces were
painted for it; `MarkerIcon` `tint`, isolated in the marker), as the map
sprites already were. The god commitment plays the new strip once and not
under reduced motion (`round19.spec.ts` 4/4). Still placeholders: the six
town backgrounds (Part E was not painted) and the neutral map hero.

### Release clean-up (owner choices of 2026-10-05)

Removed from the working tree (git history keeps everything; 973 files):
the 221 GPT-6 sheets already cut into final strips (the 20 Brief 12 sheets,
`README.md` and `cut-log.json` stay), the 234 creature reference views, 303
old placeholder sprites in `assets-runtime/sprites/` that the manifest no
longer pointed at, 150 town-building placeholder crops replaced by Brief 12
(the six backgrounds and the menu fallback stay), `assets-source/ui/backgrounds-old/`
(11), `support images/` (33 concept boards), the brief documents 1–11, the
finished production lists `GPT6_2D_CONTENT_GENERATION.md`,
`VFX_MAGIC_AND_FAVORS.md`, `ICON_CATALOG.md` (+ `.xlsx`, `.csv`) and
`2D_MIGRATION_AUDIT.md`, the two placeholder generators
(`tools/assets/sprites/make_sprite_placeholders.py` with `npm run
sprites:placeholders`, `tools/assets/prepare_placeholders.py`) and the
finished review sweep `tests/e2e/zz-moments-review.spec.ts`. In the code: 55
exported functions and constants nothing used (among them two 3D-era hex
transforms, in-memory storage adapters, an unused hero-figure lookup and
four UI components with their CSS), 21 unused imports and three unused
fields; `tsconfig.base.json` now sets `noUnusedLocals`, so the type-check
keeps it that way. No source file was unreachable (import-graph audit from
every entry point). Kept: the six final hero figures in the sprite manifest
(no screen shows them now; removing final art was not asked), node_modules
and the local build output (the owner had no preference).

### App 0.12.0 (Windows installer for play-testing)

| Command | Result |
|---|---|
| `npm run build` + `npm run desktop:build` + `npx electron-builder --config electron-builder.json --win nsis --x64 --linux dir --x64` (Linux + Wine) | **built** `Pantheon-Realms-Setup-0.12.0-x64.exe`, 515,818,606 bytes, SHA-256 `7ea20e7060f533fce8cd691c59a2ccc7b65ffd0ec970324fbbd645270dd31935`; `app.asar` 409.9 MB, 2,861 entries (`dist/`, `package.json`, `renderer/` only: no development tools, MCP servers, sources, tests, source maps, briefs or 3D files) |
| `7z x` of the installer's `app-64.7z` | its `app.asar` is byte-identical to `win-unpacked` |
| `unshare -n` (no network) + `PR_SMOKE_EXE=apps/desktop/release/linux-unpacked/pantheon-realms xvfb-run -a node tools/desktop-smoke.mjs` | **DESKTOP SMOKE OK**: `prgame://app/index.html`, saves and records written, 1,219 sprites, 508 paintings, 549 interface images, the custom cursor, 91 sounds (6 decoded at the menu, context running), the adventure map drawn with WebGL, packaged without dev tools |

Why it is larger than 0.11.0 (290.7 MB): the deliveries of 2026-10-04 and
10-05 that were not yet in an installer — the 177 magic and Favor strips, the
map heroes' `prepare`/`cast` strips, 134 god and hero portraits, the town
building levels and the Brief 12 buildings (art 112 MB, sprites 104 MB) —
and the final sounds (audio 161 MB, of which the map music is 104 MB).
App version **0.12.0**; content stays `content-0.8.0`, so 0.11.0 saves load.
Unsigned (Windows SmartScreen will ask once); **not run on Windows** here.

### Verification

| Command | Result |
|---|---|
| `npm run check` | boundaries OK, type-check clean (now with `noUnusedLocals`), **375/375** unit tests in 41 files |
| `npx playwright test` (every spec except `audio.spec.ts`, the build of mid-round, Chromium + SwiftShader, two balance workers on the same two CPUs) | **103 passed, 2 failed** of 105 in 1.4 h: the Japanese pantheon test still expected the old 21-Kitsune escort (now 23; fixed, rerun **passed**), and `round19b`'s twelve-painting sweep ran out of time under the CPU load (rerun alone **4/4 passed**) |
| `npx playwright test tests/e2e/audio.spec.ts` (final sounds) | **4/4 passed**: every sound file in the manifest decodes in Chromium; the menu, the Greek map playlist with the coast ambience (the test now waits for the decoded ambience too), Settings volumes and mute, and in battle the war horn, `music.battle.greek` and combat sounds |
| `npx playwright test tests/e2e/brief12.spec.ts tests/e2e/round19.spec.ts tests/e2e/mapEditor.spec.ts tests/e2e/round20.spec.ts` | **4/4, 4/4, 2/2, 1/1 passed** (sections above) |
| `npx playwright test tests/e2e/pantheons.spec.ts tests/e2e/battles.spec.ts` (final content) | **10/10 passed** |
| `node tools/perf/load-time.mjs` (3-run medians, SwiftShader) | first measurement with the recordings: local menu 245 ms, first scene **1,500 ms**; web 464 / 1,400 ms. The combat and magic sounds (now real recordings) were decoded during the first map frame; they now wait 5 s and then for an idle moment (`gameAudio.ts`; a sound needed earlier loads on first use). Again: local **229 / 879 ms**, web **467 / 885 ms** (before this round 219 / 960 and 440 / 1,009) |
| `python3 tools/audio/import_sounds.py --from <identified files>` | 85 sound IDs converted and registered, manifest 91 entries all `final`; the 73 effects and stingers converted again with their trailing silence trimmed at the same matched level (e.g. `ui.click` 1.52 → 0.55 s, same active RMS) |

Not checked: a run on Windows itself (the installer is unsigned and was
only built and unpacked here), a human play-test of the new values, and the
map editor and the new layouts on real hardware.

**Delivery.** Bundle 20 (hash-checked against HEAD `9eaea29` plus the
owner's Brief 12 working tree; `apply_sync.py`, not committed) wrote 214 files
and removed the 1,067 approved files (the clean-up above and the 94 audio
placeholders the recordings replaced); one file had changed on the owner's
computer since HEAD (`assets-source/icons/ICON_CATALOG.xlsx`, rewritten by the
Brief 12 import) and was removed with the owner's current version checked.
The installer was copied to the owner's `installer\` folder in 26 parts and
joined there (SHA-256 checked: `7ea20e70…1935`). The 106 Pixabay downloads in
the owner's Downloads folder were deleted after conversion, as the owner
asked; their sources stay listed in `assets-source/audio/sounds.json`.

## Map music, climate rules, AI temperaments, the god commitment, Brief 12 and the visual-completion delivery (owner requests, 2026-10-04)

Five owner requests and one delivery, in the cloud copy and the owner's
folder (bundle 19, hash-checked; not committed, not yet in a Windows installer).

* **Map music per pantheon (final audio, licensed).** 30 royalty-free tracks
  from Pixabay under the **Pixabay Content License (no attribution
  required)**, five per pantheon, downloaded with the owner's approval; only
  tracks not marked AI-generated and without a YouTube Content ID claim were
  taken. `tools/audio/import_music.py` converts them (two-pass EBU R128 to
  −16 LUFS, true peak ≤ −1.5 dBTP, Ogg Vorbis q2, 44.1 kHz stereo) into
  `assets-runtime/audio/music/<pantheon>/` and registers `music.map.<pantheon>`
  (status **final**, provenance with each title, author and page; the list is
  `assets-source/audio/music/tracks.json`). Measured: 157.8 minutes, 104.4 MB
  (Greek 25.2 min, Norse 26.8, Egyptian 20.4, Japanese 35.5, Celtic 20.1,
  Mesoamerican 29.7). The adventure map, town and hero screens play the
  **viewing player's** pantheon playlist: a random first track, then the
  others in order with a crossfade, streamed through a media element (never
  decoded whole); a file that fails is skipped, and silence never blocks play.
  Without an entry the mission's soundscape music plays as before. Battle,
  menu and the remaining music stay placeholders (Settings says which).
* **Climate rules (skirmish and random maps only; `climateRules`).** Nine
  biomes carry a battle climate (`catalog.climates`): Harvest wind (+1 Speed
  for fliers), Salt spray (shooters −3 range), Scorching sand (−1 Speed
  without Flight), Icy spray (−1 Defense), Thin air (shooters +2 range, fliers
  −1 Speed), Dense canopy (shooters −4 range, fliers −1 Speed), Fog (shooters
  −6 range), Thunderstorm (fliers −2 Speed), Biting cold (−1 Attack). Both
  armies alike; the encounter dialog names it and the battle shows a chip with
  the sentence as tooltip. The random-map setup can turn it off. Campaigns
  keep it off. Icons are interface glyphs until Brief 12 part C is delivered.
* **AI temperaments (skirmish and random maps only; `aiTemperaments`).** Each
  AI empire plays its pantheon's way — a change to the AI's choices, never to
  a rule (`packages/content/src/common/temperaments.ts`,
  `packages/ai/src/temperament.ts`): Greek **Strategists** (neutral), Norse
  **Raiders** (attacks at a lower strength margin, values rival heroes, towns
  and mines 1.3×, one extra hero, favours military buildings), Egyptian
  **Builders** (economy and defense buildings first, attacks later), Japanese
  **Disciplined** (elite dwellings first), Celtic **Mystics** (Mage Guild
  first, a little more weight on casters and magic skills), Mesoamerican
  **Devout** (keeps making Temple offerings from garrisons once its gods are
  chosen). The setup names the rival's temperament; the random-map setup lists
  one per AI seat and has a "Pantheon temperaments" switch. The Three Beacons
  stays neutral (checked by a unit test). Values are proposals, tuned by
  AI-vs-AI runs, not playtested.
* **The god commitment.** The confirmation dialog shows the god's blessing and
  price icon rows (each token keeps its sentence as tooltip and screen-reader
  text) and the gods the choice shuts out; the patron panel carries its role
  and permanence icons. When the command succeeds the card glows, rays turn
  behind the portrait and a seal lands on it (about 1.5 s, once, after the
  rule result; nothing under reduced motion). The burst is the Anointing
  gift's strip until `fx.god.commit` is delivered (Brief 12 part F).
* **GPT-6 Brief 12 — every visual still missing**
  (`assets-source/art/briefs/GPT6_BRIEF_12_REMAINING_VISUALS.md`,
  `npm run art:brief12`, generated from the game): A 84 creature dwellings
  (34 of today's crops show a different building), B 42 town services, C 9
  climate icons, D 8 random-map site markers, E 6 sharper town backgrounds
  (optional), F the commitment effect (optional) — 14 sheets, 143 cells, with
  cut layouts in `assets-source/sprites/sheet-layouts.brief12.json` and town
  layout guides (`assets-source/art/briefs/guides/town.<pantheon>.layout.png`)
  that outline every plot. It takes this round's delivery into account (the
  Workshop treasures, set emblems, ability badges, the Herald and the twelve
  paintings are listed as delivered).
* **The visual-completion delivery** (`visual-completion-2026-10-04`): 33
  icons (9 Workshop treasures, 14 creature-ability badges, 10 artifact-set
  emblems) → `assets-source/icons/final` and `npm run icons:import -- --new`
  (only the 33 new files and manifest entries; every other icon byte-identical
  to the owner's); the Herald's bust → `assets-source/art/final` and
  `npm run art:import` (`assets-runtime/art/busts/story.herald.bust.webp`,
  768 × 1152, kind `bust`, alphaBox [0.036, 0.011, 0.967, 1.0]; the content
  keeps `story.herald.portrait` as fallback; the importer's self-test now
  recognises the name, 12/12); the twelve quieter opening paintings →
  `assets-source/ui/backgrounds` and `prepare_ui_art.py` (12 WebP and 12
  manifest entries, one new: `menu.background.mesoamerican-battle`; branding,
  cursors and icons unchanged; the eleven old paintings stay archived in
  `backgrounds-old` and are not imported). No rule, balance, save or existing
  asset ID changed; no runtime code refers to the delivery folder.
* **Importer fixes.** `art:import` used to delete runtime art whose master was
  not in the checkout (54 battlefield files in the cloud copy; restored from
  the owner's folder before anything was delivered): it now keeps them unless
  `-- --prune`. `icons:import` re-encodes and re-dates every icon; `-- --new`
  imports only icons not yet registered.

**Measured AI-vs-AI skirmish win rates** (Twin Harbors, both sides AI, average
against the other five; ⚠ band 0.35–0.65):

| Pantheon | Temperaments on (288 matches) | Off (216 matches) |
|---|---|---|
| Greek | 0.44 | 0.49 |
| Norse | 0.45 | 0.40 |
| Egyptian | 0.47 | 0.55 |
| Japanese | 0.47 | 0.46 |
| Celtic | 0.63 | 0.63 |
| Mesoamerican | 0.54 | 0.47 |

With temperaments on: west town 0.45, first mover 0.47. The first tuning made
Celtic 0.73–0.78 and Mesoamerican 0.22–0.31; ablations traced these to the
magic-skill weight and to building the Temple early, which were cut back
(final: Mystics' magic weight 1.1; Devout's faith weight 1.25, which only
tips close build choices).
Celtic stays at the band's edge with temperaments off too (an existing
imbalance, not this round's).

**Code changes:** rules definitions (`AITemperamentDefinition`,
`ScenarioFeatures.aiTemperaments`, `catalog.aiTemperaments`; climates in the
battle setup), content (`climates.ts`, `temperaments.ts`, validators,
feature defaults), mapgen option, AI (`temperament.ts`, `strategic.ts`,
`services.ts`, `growth.ts`), audio (`playlist` entries, streamed playlists in
`director.ts`), UI (`sounds.ts`, `gameAudio.ts`, Settings note,
`components/temperament.tsx`, Setup, RandomSetup, Pantheon commit dialog and
moment, ClimateChip, styles), tools (`import_music.py`,
`make_placeholders.py` keeps final entries, `import_story_art.py`,
`import_icons.py --new`, `prepare_ui_art.py` provenance, `brief12.measure.ts`,
`town_guides.py`, `inventory.measure.ts`, balance `--no-temperaments`). New
tests: `ai/test/temperament.test.ts` (8), audio playlist tests, the pantheon
music test, `round19.spec.ts` (4), `round19b.spec.ts` (4); `audio.spec.ts`
now expects `music.map.greek` on the campaign map.

| Command | Result |
|---|---|
| `npm run check` | boundaries + type-check OK; 40 files / 365 tests passed |
| `npm run build` | OK; start-up script 2,008.34 KB / 466.70 KB gzip (before: 1,976.57 / 459.42 — the manifests grew); `dist` 363 MB (the music is 104 MB of it) |
| `node tools/perf/load-time.mjs` | local: menu 219 ms, first scene 960 ms; web profile: menu 440 ms, first scene 1,009 ms (before: 194 / 910 and 448 / 1,153) |
| `npm run balance -- skirmish --matches 4 --jobs 2` / `npm run balance -- skirmish random --matches 3 --jobs 2 --no-temperaments` (reports in a scratch folder, not kept in the repository) | the table above (2.5 and 5.4 min) |
| `npx playwright test tests/e2e/round19.spec.ts tests/e2e/round19b.spec.ts` | 8 passed: fog on the moor (encounter line, battle chip, range −6), temperaments in both setups and the switch, the commit dialog and moment (none under reduced motion), the nine treasures and set badges (active and inactive) on the hero screen, the ability badges with their names (retaliation and the four shapeshift forms are eight different pictures), the Herald's bust in the Eastharbor briefing (768 px wide), and over each of the 12 paintings at 1280 × 720 (the desktop window's minimum) and 1280 × 800: the logo, the four menu buttons, Continue disabled with its reason, New Game focused, Load hovered; no drift under reduced motion |
| Playwright, every spec (`--grep-invert zz-`, 102 tests) | 100 passed, 2 failed in 40.9 min — both in `round19b.spec.ts` and test-side: the hero-screen icons and the Herald's bust were read before the busy machine had decoded them (`complete` false, `naturalWidth` 0). The checks now wait for the pictures (up to 15 s), and the menu check also asserts the disabled Continue and New Game's keyboard focus; `round19b.spec.ts` re-run: 4 / 4 passed (4.0 min) |
| `python3 tools/assets/import_story_art.py --self-test` | 12 / 12 |
| `npm run desktop:build` + `npx electron-builder --config electron-builder.json --linux dir --x64` (no Windows installer this round) | OK; `app.asar` 373.5 MB, 3,225 entries: the 30 music files, the Herald's bust, the 12 paintings (with `opening-mesoamerican-battle.webp`), the 33 new icons and both manifests, byte-equal to `assets-runtime` (six spot-checked by hash); no `assets-source`, tools, MCP servers, Playwright or source maps |
| Packaged offline smoke (`unshare -n`, loopback only; `PR_SMOKE_EXE=…/linux-unpacked/pantheon-realms xvfb-run -a node tools/desktop-smoke.mjs`) | DESKTOP SMOKE OK: map on WebGL, saves and records written, 1,218 sprite files, 382 painted pictures, 532 interface images, 92 sounds (86 + the six map playlists), packaged without DevTools |

Known limits: I chose the tracks from their pages and measured them; I did not
listen to them, so three of them picked for variety (Temple of the Heights,
Herr Mannelig, Spirit Tribe) may be livelier than the rest — remove a track by
deleting its line in `tracks.json` and running
`import_music.py --register-only`. The music adds about 104 MB to the
installer. The menu paintings were checked in SwiftShader screenshots (all 24 looked
at), not by a person on a real screen. The climate icons, site markers and the
commitment strip are stand-ins until Brief 12 is delivered.

## Gods, heroes, town levels and map-hero animations in the game (owner delivery of briefs 8–11, 2026-10-04)

The owner's delivery (`blannder_models\gods_heroes_towns_delivery_2026-10-04`,
287 assets) had already been copied into the owner's folder with its own
scoped `copy_to_project.py` (not committed). Checked there: all 287 runtime
files and all 659 payload files hash-equal to the delivery's
`asset-index.json` / `bundle-files.json`, and the three merged manifests only
**add** entries (UI 155 IDs, art 72, sprites the six avatars' `prepare` and
`cast`); no existing entry changed or disappeared. The cloud copy took the same
files and manifests (hash-checked again after transfer). Nothing is loaded
from the art project at run time.

* **60 god portraits and 74 hero portraits** (painted, 256 × 256 WebP): every
  god and hero of the content has its own (IDs matched one for one). They
  reach every screen through the existing portrait components — god choice and
  Pantheon screen, Encyclopedia, Tavern, the map's hero list, hero screen,
  encounters — and **the battle header now shows each commanding hero's
  portrait** beside the name (neutral guards have none).
* **72 town building levels** (`town.<pantheon>.support.<building>.lN`,
  320 × 320 transparent cutouts): the town already picked the exact level's
  picture, so they appear with no code change; checked for all six towns at
  levels 1–4 (Civic Hall 1–4, Temple 1–2, Mage Guild 1–3, Fortifications 1–3),
  drawn in proportion over the painting with their transparency.
* **21 god-card icons** and the **icon rows** the brief asked for
  (`components/godIcons.tsx`): on the Pantheon screen and in the
  Encyclopedia each blessing is a token of who or what improves, the
  attribute or resource icon and the definition's number; the price is the
  Favor icon and cost and one icon per requirement (temple level 1 or 2, civic
  hall, after the first choice), outlined red when unmet; the state chips
  carry the patron, first/second choice, committed and excluded icons, and the
  choice rule the permanent icon. Each token's tooltip and screen-reader text
  is the content's own sentence, so no number or condition is lost; the
  missing-requirement list and the reasons stay visible under the card.
  Patrons without a mechanical blessing keep their sentences. Eight icons were
  cut at their native 192–250 px (not enlarged); the icon test now allows that.
* **60 map-hero strips** (`prepare` and `cast`, five drawn directions, 6
  frames at 6 fps, played once, their own frame size, anchor and 90 px per
  hex). `prepare` now plays on the beat's clock and **holds its ready pose
  until the map closes for the battle** (it used to drop back to idle at the
  end of the beat); an abandoned encounter returns the hero to idle; a second
  beat request for the same hero while one is pending is skipped. Map spells,
  Homecoming included, play `cast` once with the spell's own effects, then
  idle. The camera is unchanged (pan and zoom only; zoom keeps the angle).

**Code changes (presentation, UI, tests, tools; no rule or content change):**
`presentation/src/adventure.ts` (prepare hold, double-beat guard, Homecoming
cast), `ui/src/components/godIcons.tsx` (new), `ui/src/screens/Pantheon.tsx`,
`Encyclopedia.tsx`, `Battle.tsx`, `ui/src/components/art.tsx`
(`HeroPortrait` takes a snapshot's portrait ID), styles,
`tools/assets/icon-catalog/inventory.measure.ts` (delivered art is no longer
counted as missing; god-card icon notes). Tests: `godIcons.test.tsx` (new:
every designed god's blessings have icons carrying their sentence and number;
prices; the 21 files), `sprites.test.ts` (prepare/cast metadata and
mirroring), `uiArt.test.ts` (native-size icons), `heroes.spec.ts` (the
delivered prepare strip is what is drawn and held), `round12.spec.ts` (the
caster draws `cast`, then idle).

**Docs:** ASSET_PIPELINE.md (top note, §12, §13), CLAUDE.md, ICON_CATALOG.md
(regenerated: 834 entries, 23 without art of their own — seven Workshop
artifacts and 16 story characters).

| Command | Result |
|---|---|
| Delivery audit (device: Python over the owner's folder; cloud: after transfer) | 287 / 287 runtime files and 659 / 659 payload files equal the delivery's hashes; manifests: +155 UI, +72 art, +648 sprite keys, 0 changed, 0 removed; every god and hero of the content has its portrait ID delivered, every delivered town level is a content building's art |
| `npm run check` | boundaries + type-check OK; 38 files / 346 tests passed (new `godIcons.test.tsx`; `sprites.test.ts` +1) |
| `npm run build` | OK; start-up script 1,976.57 KB / 459.42 KB gzip (before: 1,910.96 / 453.79) |
| `node tools/perf/load-time.mjs` | local: menu 194 ms, first scene 910 ms; web profile: menu 448 ms, first scene 1,153 ms |
| Playwright, every spec (`--grep-invert zz-`, 94 tests) | 94 passed in 36.0 min. Before it, one failure fixed: the Encyclopedia's Towns cards differed by 29 px once the square level pictures loaded after the cards were equalised (the building picture now has a fixed 4:3 box drawn with `contain`, and cards re-equalise when a picture loads); `heroes.spec` and `round12.spec` re-run with their new assertions: pass |
| Visual tour (temporary spec, 1280 × 720, SwiftShader; deleted afterwards) | per pantheon: Pantheon screen with icon rows (first choice committed in three, so committed and excluded show), the map hero idle → `cast` (Far Sight, Fleet Foot) → idle and idle → `prepare` facing the rival in six directions (`e`, `ne`, `nw`·mirrored, `w`·mirrored, `sw`·mirrored, `se`; the readout matched the expected facing every time), the battle header portraits; all six towns at levels 1–4 (each location requested its exact `.lN` picture); Encyclopedia gods and heroes; the Tavern |

Known limits: checked in SwiftShader captures at 1280 × 720 (not at speed on a
GPU, not by a person). The `n` and `s` strips are not reachable as neighbour
directions on the map and were checked only by metadata. A prepare beat
abandoned by leaving the map is covered by the existing test; there is no
in-game "cancel" once the battle is accepted. The start-up script grew to
1,976.57 KB (453.79 → 459.42 KB gzip) because the embedded manifests grew.

## Magic and Favor strips, town icons and battlefield climates in the game (owner delivery, 2026-10-04)

The owner's delivery (`blannder_models\magic_icons_battlefields_delivery_2026-10-04`,
237 new assets) had already been imported into the owner's folder and committed
(HEAD 2de3a50); the cloud copy took the same runtime files and manifests (all
237 runtime files SHA-256-checked against the delivery's `ASSET_INDEX.json`,
and the three manifests equal to HEAD; the delivery's `FINAL_VALIDATION.json`:
237 passed, 0 failures). Nothing is loaded from the art project at run time.

* **177 VFX phase strips** under their full `fx.*` IDs (9 status overlays, 117
  battle-spell, 15 adventure-spell, 28 miracle phases, 6 gifts, 2 offering
  phases) next to the nine shared effects; loops only for status overlays,
  `travel` and `aura`.
* **6 town-action icons** (`icon.ui.build`, `recruit`, `market`, `tavern`,
  `merchant`, `gift`): they replace the SVG stand-ins through the existing
  icon lookup (no code change).
* **54 battlefield paintings** (`battlefield.<archetype>.ground.<climate>`,
  six archetypes × nine climates), native 1419 × 1108 (the proportions of the
  4096 × 3200 layout; not 4K, not enlarged); the battle picks them from the
  map's climate, temperate keeps the default painting.

**Code changes (presentation and tools only; no rule or content change):**

1. **Importer fixed** (`tools/assets/sprites/import_sprites.py`): it stripped
   the `fx.` prefix and forced every effect to play once; it now keeps full
   `fx.*` IDs (the nine shared effects keep their short IDs), takes `loop` and
   `additive` from the sidecar, and imports a subset with `--only`. Regression:
   `--self-test` (synthetic strips in a temporary project) run by
   `packages/presentation/test/importSprites.test.ts`, which also checks the
   game manifest (no stripped IDs; loops only where the brief plays one).
2. **Map aura loops**: Fleet Foot and Wings of Hermes loop their `aura` strip on
   the hero for the rest of the day they were cast (the interface keeps the
   cast — match, hero, day — while the session lasts; presentation only, not
   saved, so a reload drops the aura though the extra movement stays). A still
   frame under Reduce motion, nothing on Low quality. Read-only `aura` in the
   map's hero readout (`__prHeroes`).
3. **Whole-view strips** cover the view with their proportions kept (no
   stretching), at 60 % opacity easing in and out, mirrored for the defender;
   they now also play for the seven map miracles, whose drawn look has no
   whole-view moment (their `screen` strips were otherwise never shown).
4. **Homecoming** plays its `cast` phase on the hero before `depart`/`arrive`.
5. **Town**: the gift's strip, smaller and centred, also lands where the gift
   goes — the resource counters, the visiting hero's portrait (Anointing,
   Temple Relic) — and `fx.offering.favor` plays on the Favor counter after an
   offering, once the dialog has closed. Strip bursts follow the window height
   (frame pixels were fixed before). Found in the tour: a counter burst placed
   straight in a screen was made `relative` by `.screen > *` and drawn below
   the window; it now keeps `position: fixed` (two-class rule).
6. **Status overlays** from strips show their first frame as soon as the strip
   loads, so they read as still shapes on Low quality and under Reduce motion.
7. `packages/presentation/test/vfxHooks.test.ts`: every delivered `fx.*` strip
   is one the game asks for.
8. Map area scale checked: the strip's ring spans two hexes at scale 1 and is
   scaled to (reveal radius + ½) hex widths, so its diameter is twice that —
   no double scaling.

**Docs:** `VFX_MAGIC_AND_FAVORS.md` (generator now marks delivered IDs: 177 of
177 ✓), `ICON_CATALOG.md`, ASSET_PIPELINE.md §5, §11 and §13, CLAUDE.md.

| Command | Result |
|---|---|
| `python3 tools/assets/sprites/import_sprites.py --self-test` | self-test passed (synthetic strips in a temporary project) |
| `npm run check` | boundaries + type-check OK; 37 files / 341 tests passed (including `importSprites`, `vfxHooks`, the 54 climate paintings in `groundArt`) |
| `npm run build` | OK; start-up script 1,910.96 KB / 453.79 KB gzip (before: 1,839.60 / 448.99) |
| `node tools/perf/load-time.mjs` | local: menu 216 ms, first scene 1,129 ms; web profile: menu 453 ms, first scene 1,293 ms |
| Playwright `bigMoments`, `groundArt`, `round11`, `round12`, `services`, `sprites2d` | 33 tests passed (two runs; the first stopped at the 10-minute tool limit after 22 passes, the rest re-run) |
| Visual tour (temporary spec with video, 1280 × 720, SwiftShader; deleted afterwards) | battle: Lightning (cast, sky travel, impact), Rallying Hymn (whole view), Ill Omen and Blessing (status overlays), Ember Burst; Thunderbolt miracle (card, then whole view, then impact); map: Far Sight, Fleet Foot (aura readout `fx.spell.fleet_foot.aura`, ring at the hero's feet), Favorable Winds, Homecoming (cast, depart, arrive); town: offering (rise at the temple, sparkle on the Favor counter), Temple Treasury (temple burst, coins on the Gold counter), the six action icons; 60 battles — six archetypes × ten climates — each requested its own painting (`battlefield.<archetype>.ground.<climate>`, the default for temperate) and showed it under a readable board |

Known limits: the effects were looked at frame by frame only in SwiftShader
video captures at 1280 × 720 — not at speed on a GPU or by a person. The start-up
script grew to 1,910.65 KB (448.99 → 453.63 KB gzip) because the sprite and art
manifests it embeds grew with the delivery. An aura set before a reload is not
shown again after it.

## App 0.11.0: the delivered 2D art in the game, and the owner's 21 requests of 2026-10-04

**Delivered 2D art (owner commit 071968c).** The owner's GPT-6 delivery is
read through the manifests only (no code names a file): in
`assets-runtime/sprites/manifest.json` all **102 creature forms**, the **six
pantheon map heroes** (idle and walk in all eight
directions), **41 map locations**, 6 decorations, 7 obstacles, 12 siege pieces, 2
projectiles and 9 effect strips are `final`; only the neutral map hero is
still a placeholder. The delivery note reports thirteen creature strips that
hold or reuse a few generated poses to keep weapons continuous (sidecar
`assemblyNote`; listed in the delivery's `frame-assembly-recipes.json`). Checked by screenshots (SwiftShader, 1600 × 900) in each
context: every pantheon's hero on the map (standing, zoomed, walking in
several directions), a revealed random map with every kind of location, a
battle per pantheon and two neutral groups with all seven base forms against
their upgrades, the bestiary viewer (every animation button of a sample per
pantheon) and the hero screen. The shared effect strips (`spell.damage`,
`spell.area`, `spell.heal`, `spell.buff`, `spell.curse`, `ward`) now stand for
a spell's or miracle's impact when its look matches (`genericImpactOf`,
`fx.ts`); other impacts stay code-drawn. Not checked by a person at speed on a
GPU.

**The 21 requests**, one by one (proposed values, not play-tested):

1. **Encyclopedia:** the line under a creature's name (form · role) is gone.
2. **Gods and their icons for GPT-6:** `assets-source/art/briefs/GPT6_BRIEF_8_GODS_AND_ICONS.md`
   — part A, the 60 god portraits on 6 sheets (one per pantheon, from Brief 4's
   descriptions); part B, **21 god-card icons** on one sheet (advantage: who
   benefits, growth, recovery, a spell to learn, daily income, offerings,
   fury; price: Temple, Grand Temple, City Hall, after the first choice;
   state: patron, first/second choice, committed, excluded, permanent),
   listed in `tools/assets/briefs/godIcons.ts` and in the icon catalog (new
   section *God-card icons*). **The god cards do not use them yet**: the icon
   row is built once they are delivered; until then the cards keep their
   sentences.
3. **Hero portraits for GPT-6:** `GPT6_BRIEF_9_HERO_PORTRAITS.md` — 74 heroes on 6
   sheets (one per pantheon, 4 columns), with each hero's class, title and
   story, and the dialogue bust attached where one exists.
4. **Twelve new hireable heroes (proposed)**, three each: Egyptian Ahmose
   (Medjay), Tiye (Vizier), Peseshet (Lector Priest); Japanese Kusunoki
   Masashige (Daimyo), Abe no Seimei (Onmyoji), Hangaku Gozen (Samurai);
   Celtic Medb (Chieftain), Amergin (Druid), Fergus mac Roich (Fian);
   Mesoamerican Moctezuma Ilhuicamina (Tlatoani), Lady Six Sky (Jaguar
   Knight), Chilam Balam (Day-keeper). Each has a specialty from the shared
   vocabulary and a short story; they use generated portraits until Brief 9
   is delivered. 74 heroes in all; each of these four pantheons now has 8
   hireable heroes; the random tavern pool is 47.
5. **Town building levels for GPT-6:** `GPT6_BRIEF_10_TOWN_BUILDING_LEVELS.md`
   — the locations whose levels all share one painting (Civic Hall 4 levels,
   Temple 2, Mage Guild 3, Fortifications 3 in every pantheon): 72 level
   pictures on **6 sheets** (4 columns × 4 rows, one row per building), cut by
   `npm run sprites:cut` into `assets-source/art/final/<level asset ID>.png`
   and imported by `npm run art:import` (new kind `building`, kept
   transparent, at most 512 px, into `assets-runtime/art/town/`). The town
   already asks for the exact level's picture first, so a delivery needs no
   code change.
6. **The Workshop:** the Blacksmith/Workshop is called **Workshop** in every
   pantheon. A new effect type `enables_workshop` (stock size, rarities) on
   the Greek and Norse workshop buildings and, through the pantheon kit, on
   the other four. Every week it shows **four different tier-1 items**
   (rarity *treasure*; 9 new plain-gear items added, 12 in the pool) drawn
   from the match seed and the week; a bought item is marked *Sold — back in
   stock next week* until the new week. The store (`WorkshopModal`, from the
   town bar or the Workshop's pop-up) shows the visiting hero who receives the
   item, the week and days to the next stock, and four counters with icon,
   slot, effect, price and Buy. Skirmish-only: The Three Beacons keeps its
   content core-only, so its Workshops have no wares and no store button.
7. **Neutral reactions:** when a strong enough army approaches, neutrals now
   offer to **join a quarter as often** and **flee a third as often** as
   before (`NEUTRAL_JOIN_CHANCE`, `NEUTRAL_FLEE_CHANCE`, `systems/sites.ts`);
   otherwise they stand their ground. The roll is fixed per group, hero and
   day (`seedFromLabel`), so reloading does not change it; the next day can.
8. **Creature details:** statistics and abilities on the left, the animation
   viewer on the right.
9. **Map hero facing and animation brief:** the hero plays the strip of each
   step's direction (all eight directions are in the manifest for the six
   pantheons), checked through the read-only `__prHeroes` readout
   (`facing: "e"` walking east, `"w"` walking west, on screenshots too). `GPT6_BRIEF_11_MAP_HERO_ANIMATIONS.md`
   asks for the two missing moments for all six pantheons: **prepare**
   (starting a battle) and **cast** (a map spell), one 12 × 5 sheet per
   pantheon; the importer and the map view already play them when delivered
   (until then the code-drawn rise and the sigil).
10. **Around the map:** black — the sea, sky and per-tile noise around the map
    are gone (new terrain `void`, code `v`, impassable, never hovered or
    fogged).
11. **Battle facing:** before an attack the attacker turns toward its target
    and the target toward the attacker; after the blow both turn back to
    their side's facing (the fallen stay as they fell).
12. **Campaign victory:** the debrief is wider (70rem when there is a next
    mission) and its three buttons stand on one line.
13. **Mission summary:** no subtitle under the title; the over-time charts
    have a 10 % padding inside their cards.
14. **Random map setup:** no subtitle, no map picture (the settings use the
    full width), no seed field (a new seed is drawn at each Start); up to
    **six empires**, four or more only on Large or Huge maps (the smaller
    sizes are disabled with the reason); a line under *Starting wealth*
    gives the actual treasury. Random maps are **square** at every size
    (mapgen `pr-skirmishgen-0.5`: a square of land, `void` outside it,
    mountains in the corners; five empires use the six-fold layout with one
    wild sector).
15. **Map pace and frame:** the hero walks slower (360 ms per step, was 210;
    the walk strip at 0.7× its rate). Random maps have no Objectives card.
    The minimap is **twice as large** everywhere (it shows only the map's
    land, black around it). The camera stops half a hex past the map's edge.
16. **Map controls:** End Day sits at the top centre under the resources; the
    eight buttons are centred at the bottom with no card around them.
17. **Tiles:** no lines between tiles; the hovered tile is outlined (the
    *Hex grid* setting now defaults to *on hover*, and a saved *always* moves
    to *on hover* once: preferences schema 3). The tile pop-up has no "Tile"
    title or divider, no grid position and no route cost tag (only the
    reason when the tile cannot be reached).
18. **Resource icons:** the plate around each resource icon is removed (the
    `res.*` icons regenerated by `prepare_ui_art.py`; only the icon remains).
19. **Town:** a building is built on click, with no confirmation.
20. **Battle deaths:** a killed stack plays its hit, then its death once.
    The cause was a race (the view applied the new state before its
    animation hold); now `AppStore.registerPreparer` holds the stacks
    synchronously, and `sufferBlow` / `die` never play a death twice. The
    battle readout counts `deaths` and `hits` per stack; `round10.spec`
    checks one death per killed stack.
21. **Miracles:** a book in the spellbook's style (`components/miraclebook.tsx`)
    — tabs All / Battle / Map with counts, the Favor gem, painted card
    thumbnails with their cost, the target and the reason when unavailable —
    in battle (an enemy-stack miracle asks for its target next; the others act
    at once, without a confirmation) and on the map (Divine Interventions).

Also: a selected option of a segmented control keeps its gold look under
the mouse.

| Command | Result |
|---|---|
| `npm run check` | pass — boundaries, type-check, 35 files / 337 unit tests (new: rules `workshop.test.ts`, presentation `genericImpact.test.ts`; counts updated for 74 heroes, the 47-hero tavern pool, 8 hireable heroes per later pantheon, preferences schema 3, the `void` colour, random maps 0.5) |
| `npm run build` | pass — start-up script 1,839.60 KB / 448.99 KB gzip (0.10.0: 1,730.94 / 433.31); most of the growth is the delivered sprite manifest, which the start-up script embeds (318 KB of JSON, 194 KB in 0.10.0) |
| `node tools/perf/load-time.mjs` (3-run medians, SwiftShader) | menu 205 / 446 ms, first scene 1,116 / 1,369 ms (local / throttled web) |
| `npm run art:briefs` | briefs 8–11: 7, 6, 6 and 6 sheets |
| `npm run icons:catalog` | 834 entries in 13 sections (new: *God-card icons*, 21; the twelve new heroes' portraits) |
| `npm run sprites:queue` (run once, output not kept) | 0 sheets left in groups A–E, G and H. The generator now leaves out delivered map heroes and the reference views of forms whose strips are all final, and keeps the layouts of delivered sheets for re-cuts. Its output was **not kept**: `GPT6_2D_CONTENT_GENERATION.md` and `sheet-layouts.json` stay exactly as delivered (the delivery note asks not to rebuild the queue over the delivery). `cut_sheets.py --self-test` passed; no delivered sheet was re-cut |
| `npm run vfx:list` | unchanged (0 looks missing) |
| Playwright, every spec (fresh build) | 136 tests in three runs: 92 passed, 6 failed, 42 skipped (the opt-in review sweep). The 6 were test-side: four expected placeholder sprites that the owner's delivery replaced (`heroes.spec`, `sprites2d.spec`; now read the status from the manifest), one panned vertically at the opening zoom, which the tighter camera no longer allows on Twin Harbors (now zooms in first), and `groundArt.spec` expected the sky (now checks it is not loaded). Re-runs of the three specs: 14 / 14 pass. `campaign.spec` now also checks that the debrief's three buttons share one line |
| Visual check (screenshots, 1600 × 900) | random setup (six empires), a six-empire random map, the map HUD, tile pop-up, hero walking east then west, the map and battle miracle books, the Workshop before and after a purchase, the Encyclopedia, creature details, the debrief, the mission summary |
| `npm run desktop:build` + electron-builder (Windows NSIS x64, Linux dir) | `Pantheon-Realms-Setup-0.11.0-x64.exe`, 290,744,270 bytes, SHA-256 `d76175c4914fad9b9b582dc58398a6c355b49674f10a6217e69c6abe48f3f30a`; `app.asar` 183.8 MB, 2,616 entries, no development tools, MCP servers, sources, tests, briefs or 3D files. Unsigned; not run on Windows |
| Packaged offline smoke (`unshare -n`, loopback only; `PR_SMOKE_EXE=…/linux-unpacked/pantheon-realms xvfb-run -a node tools/desktop-smoke.mjs`) | DESKTOP SMOKE OK: map on WebGL, saves and records written, 981 sprite files, 255 painted pictures, 338 interface images, 86 sounds, packaged without DevTools |

Known limits: the shared impact strips are wired and unit-tested but were not
seen frame by frame (the SwiftShader screenshots missed their few frames). The
ten sky paintings are no longer shown (their files stay in the game, 1.1 MB).
The god-card icons, hero portraits, town level pictures and
map-hero prepare/cast strips are briefs only (nothing delivered); the new
items and heroes show glyph and generated stand-ins (the cloak shows the
movement glyph, a boot, until its icon is delivered). Content values changed
without a version bump (`content-0.8.0`): 0.10.0 saves still load; an
existing Workshop starts its stock at the next week.

## Magic and Favor effects, new sounds, app 0.10.0 (owner requests 1, 7 and 6, 2026-10-03)

All presentation (no rule, content value or save change; the content
change is presentation data: the missions' `soundscape`). Everything new is a
**placeholder** until final art and audio are delivered.

**1 — Code-drawn magic and Favor effects** (`VFX_MAGIC_AND_FAVORS.md`):

* `packages/presentation/src/fxLooks.ts` (core, no Pixi): a *look* for every
  spell (54), divine intervention (14) and divine gift (6) — colour school
  (28 palettes), travel, impact (23 kinds), whole-field moment (8), reach and
  sound family — from its effect type, refined per ID; new content gets one
  automatically. `fx.ts` paints them (sigil, bolt / orb / arrow / swarm /
  wisps / sky strike, the impacts, map rings, field moments) on the view's
  tween clock, so instant playback and Skip finish them at once.
* **Battle:** each spell gathers at its commander's banner corner, travels,
  lands on every stack it reaches (target; target and the stacks beside it
  for area spells; the whole side for army spells, with the field moment),
  then the numbers — split per stack when the total divides evenly — or the
  effect's word ("Attack −3", "Blessed"). Battle miracles play after their
  painted card closes (the view holds the stacks meanwhile), then the light,
  dome, banner or smite on each stack; a smite shows its damage.
* **Status overlays:** each status leaves a looping overlay with its own shape
  (rising or falling chevrons, a studded ground ring, a broken ring, wind
  arcs, violet haze, gold sparkles, a grey cloud with a crow, a shield, a
  dome); they appear when the spell lands and stay still on Low quality and
  under Reduce motion.
* **Map:** the sigil on the casting hero; Far Sight / Clear Skies / Divine
  Sight / Eye of Horus spread a ring over the chosen tile; Fleet Foot and
  Wings of Hermes wind round the hero; Homecoming lifts the hero away in a
  column of light and sets it down at the town. The player's own map
  miracles: wind or mist on every hero, motes over heroes or the chosen
  town, coins over the capital and over the Gold counter.
* **Town:** gifts and offerings rise from the Temple (coins, timber and stone,
  crystals, light; Blessed Brood lights each dwelling) — CSS bursts.
* Every phase first looks for a delivered strip under its asset ID
  (`fx.spell.<id>.<phase>`, `fx.miracle.<id>.<phase>`, `fx.status.<name>`,
  `fx.gift.<id>`, `fx.offering.rise`) and plays that instead. Not drawn yet:
  the two map `aura` loops (a trail while Fleet Foot / Wings of Hermes last).

**7 — Sounds** (34 new IDs, 86 in all; **synthesized in code**: the free sound
sites and generation services were not reachable from the development
environment — blocked by its network policy — so nothing was downloaded and
no service was used):

* Spellbook: `ui.book_open`, `ui.book_close`, `ui.book_page` (a filter
  change); town: `ui.popup` (a building's pop-up), `ui.town_action` (market,
  tavern, temple, merchant).
* Magic: `magic.cast` and one sound per look family (`magic.strike`,
  `thunder`, `fire`, `heal`, `bless`, `curse`, `wind`, `frost`, `nature`,
  `swarm`, `water`, `shadow`, `holy`, `smite`, `reveal`, `teleport`,
  `coins`, `horn`) for battle spells and miracles, map spells and miracles,
  gifts and offerings.
* Soundscapes (music + ambience loops): `fjord` (The Winter Oath), `desert`
  (Egyptian campaign), `shrine` (Japanese), `glen` (Celtic), `jungle`
  (Mesoamerican) — new modes (hijaz, two pentatonics), instruments (reed,
  bamboo flute, tin whistle, clay flute, koto, harp) and drum patterns.
  Each of those campaigns now uses its own soundscape and keeps
  `storm_plateau` for its darkest missions; The Three Beacons is unchanged.
* Loudness checked by decoding every new file (RMS/peak alongside the
  existing ones: music −17.6 to −19.3 dB RMS, effects −16 to −27 dB). Not
  listened to by a person yet.

**6 — 0.10.0 installer** (version bumped in `package.json`,
`apps/desktop/package.json`, `package-lock.json`; content still
`content-0.8.0`, so saves load).

| Command | Result |
|---|---|
| `npm run check` | pass — boundaries, type-check, 33 files / **326** unit tests (new: `presentation/test/fxLooks.test.ts`, magic and soundscape cases in `ui/test/audio.test.ts`) |
| `python3 tools/audio/make_placeholders.py --only <34 IDs>` | wrote the 34 files; the first 52 manifest entries unchanged |
| `npm run vfx:list` | regenerated `VFX_MAGIC_AND_FAVORS.md` (status text updated) |
| `npm run build` | pass (start-up script 1,730.94 KB / 433.31 KB gzip) |
| Full Playwright suite (`npx playwright test`), first on the build before the owner's art came in | 136 tests: **94 passed**, 42 skipped (opt-in review sweeps), 0 failed (39.7 min) |
| New `tests/e2e/round12.spec.ts` (Lightning, Blessing's overlay, Shield of the Gods after its card, Far Sight and Fleet Foot, Tithe's coin shower, a Temple gift) | 6 / 6 pass |
| Re-run of `round9`–`round12` + `bigMoments` on the build with the last effect fixes (overlay rings moved outside the stack's rings, delivered gift strips, magic sounds pre-loaded) | 25 / 25 pass |
| Full Playwright suite again, on the final build (with the owner's art) | 136 tests: 93 passed, 42 skipped, **1 failed** — `menu.spec.ts` expected the Nine-Tailed Kitsune portrait to be missing; the owner's import delivered every creature portrait, so the check now picks an undelivered form only while one exists. Re-run `menu` 4 / 4, `sprites2d` 4 / 4 (its silhouette check was updated the same way) |
| Owner's art commit `f36fd19` ("fix screens": bundle 14 plus the owner's own art import) brought into the build | the 409 runtime files it changed (21 creature forms with final sprites, new creature portraits, re-encoded icons, both manifests) taken at their committed versions; the owner's source sheets and reference views stay only in the owner's folder; uncommitted art in the owner's working tree (an in-progress Oni re-cut and 292 strips the working-tree sprite manifest names) is **not** in this installer |
| `sprites2d.spec.ts` after that import | its silhouette check now picks a creature still drawn as a silhouette (Celtic Pooka has final sprites now) |
| `npm run desktop:build` + `npx electron-builder --config electron-builder.json --win nsis --x64 --linux dir --x64` (Linux + Wine) | **built** `Pantheon-Realms-Setup-0.10.0-x64.exe` (242,224,482 bytes, SHA-256 `53dd8839671fee86704c802b65fa8c27d9183e1b55896f8968489472b8e10f1d`) |
| Payload check (7-Zip) | `app-64.7z` extracts byte-identical to `win-unpacked`; `app.asar` 134.9 MB, 1,702 entries, packaged version 0.10.0, 94 sound files (86 IDs), 170 final creature strips; no `.glb`/`.gltf`/`.blend`, Babylon, `assets-source/`, source maps, tools or MCP servers |
| `PR_SMOKE_EXE=apps/desktop/release/linux-unpacked/pantheon-realms xvfb-run -a node tools/desktop-smoke.mjs` in a network namespace with only loopback (`unshare -n`) | **DESKTOP SMOKE OK** (packaged: `isPackaged`, DevTools refused; 468 sprite files, map on WebGL, saves, records, 255 painted-art files, 338 interface images, 86 sounds, audio running) |
| Copied to the owner's `installer\` folder | in 13 parts of 20 MB, joined on the computer; SHA-256 matches |

**Not run on Windows; unsigned** (SmartScreen: More info → Run anyway).

Known limits: the effects are placeholders drawn with shapes and particles;
in the software-rendered test browser they were checked frame by frame from
screenshots, not at speed on a GPU. Map miracles invoked from the Pantheon
screen (not the map) play no map effect (the map is not on screen).

## Owner interface pass of 2026-10-03, third round (14 requests)

What changed, request by request (all presentation; no rule, content value or
save change — the one content addition is presentation data, `hudAnchor`):

1. **Main menu:** no Credits, Campaign or Skirmish entries (both under New Game).
2. **Encyclopedia:** no header subtitle; every section's cards share one height
   (`useEqualHeights`, per `data-eq` group, re-measured on resize and font load);
   all 62 heroes show a short story (five Greek concept heroes gained one; the
   build notes "Concept-board hero…", "Hireable in skirmish…" are stripped).
3. **Creature window (S18):** one panel — portrait, name again, larger summary,
   statistics with growth and cost, abilities, lore. No right-hand chips,
   Implemented/Balance tags, Assets section, lore tags or base/upgrade tabs.
4. **New Game:** no header subtitles; the campaign list has no tags, no
   "What carries between missions" and no "Other pantheon campaigns" card; the
   Campaigns/Skirmish tabs are gone. A campaign goes from its card straight to
   the briefing (the pantheon and patron steps are skipped); the **Starting
   Patron screen (S05) is removed** — each pantheon has one implemented patron,
   preselected. Pantheon cards redesigned (medallion, faction band, name and
   epithet 4 px larger at 1920 px), no Playable/god/hero tags.
5. **Map:** the **Overview button and screen (S15) are removed**; no top-right
   hero panel; the left lists have no title or icon.
6. **Pause menu:** no logo, no Quit to Desktop, no close button (Resume or Esc).
7. **Before an attack:** the tile panel shows the guards (or a monster band /
   enemy hero) as portraits with counts, tier and ability badges
   (`ArmyPreview`); the "Estimate vs …" strength heuristic is gone.
8. **Spells:** a spellbook pop-up (`components/spellbook.tsx`) — an open tome
   of a fixed size with the use filters (All/Battle/Adventure, with counts)
   and tier filters always shown, mana gems, Roman tier seals and pantheon
   crests. The map has a **Spells** button (key C) and the battle's Spell
   button (key S) opens it to cast; picking a spell with a target asks for
   the target next. The hero screen's book uses the same component.
9. **Dialogue:** no Backlog button (nor the L key).
10. **Hero screen ("Hero's State"):** a schematic body (SVG) with a box on each
    body part for its item, accessories and mount beside it, the spellbook in
    the corner; the inventory as a grid of all 30 boxes on the right; the army
    centred with larger slots and no caption or hint text.
11. **Movement:** a location at the hero's destination keeps its look until the
    hero arrives (the view holds it while the walk plays); the viewer's own
    walk draws its route on the ground and clears it tile by tile. Arriving at
    one of your towns opens it.
12. **Town:** no header subtitle; the painting fills the screen; the town
    economy is a compact panel on the painting's top edge, placed per town
    where the sky is free (`TownArchetypeDefinition.hudAnchor`; checked on all
    six paintings); a building opens a pop-up beside it with icon actions
    (build, recruit, market, tavern, gods, offering, gifts, training, merchant,
    spellbook) and no tags; the garrison and visiting army are centred with an
    ornamental divider. The wallet sits in the middle of every screen header
    (as on the map). **Recruiting never asks for approval** (the "Confirm
    large recruitments" setting is gone; training never asked). Building
    still asks once.
13. **Journal:** no header subtitle; statuses are icons (check, flag, star,
    lock, cross) instead of tags; a locked step already achieved reads as
    completed (also in the map's objective list).
14. **VFX list:** `VFX_MAGIC_AND_FAVORS.md`, generated by `npm run vfx:list`
    (`tools/assets/vfx/`) from the content: 9 shared status overlays, 47
    battle spells, 7 adventure spells, 14 miracles, 6 divine gifts and the
    Temple offering — 84 effects, 177 asset IDs, each with its phases, what
    the game shows today and a one-line look. **A list only; nothing
    implemented.**

Also fixed: Esc while choosing a map spell's tile now cancels the spell (it
opened the pause menu before).

| Command | Result |
|---|---|
| `npm run check` | pass — boundaries, type-check, 32 files / 315 unit tests |
| `npm run build` | pass (start-up script 1,706.43 KB / 430.73 KB gzip) |
| `npm run vfx:list` | wrote `VFX_MAGIC_AND_FAVORS.md` (0 looks missing) |
| `npm run icons:catalog` | 792 entries; the six new town-action glyphs listed as `icon.ui.<name>` with briefs |
| Full Playwright suite (`npx playwright test`, fresh build) | 130 tests: 86 passed, 2 failed, 42 skipped (opt-in review sweep). The two failures were test issues, fixed and re-run: the fixed-size book was measured during the dialog's opening scale (now layout height), and the battle-board check projected before the on-demand battle view loaded (now waits). Re-run of `round10` + `round11` + `heroscreen`: all pass (one flaky cursor check passed on re-run and now also waits for the map view) |
| New `tests/e2e/round11.spec.ts` (setup flow, map, spells on the map and in battle, town, journal, recruit without approval) | 5 / 5 pass |
| `node tools/perf/load-time.mjs` (3-run medians, SwiftShader; tool updated to the new New Game flow) | menu 215 / 436 ms, first scene 1,107 / 1,244 ms (local / throttled web) |
| `npm run desktop:build` + `xvfb-run -a node tools/desktop-smoke.mjs` (smoke updated to the new flow) | DESKTOP SMOKE OK (map on WebGL, saves, audio) |
| Visual check (screenshots, 1600×900) | every changed screen; the economy panel and pop-ups on all six town paintings |

Known limits: icon glyphs for the new town actions (`build`, `recruit`,
`market`, `tavern`, `merchant`, `gift`) are simple SVG stand-ins until icon art
is delivered as `icon.ui.<name>`. The hero-screen figure sprites
(`sprite.hero.<pantheon>.figure`, GPT-6 sheet D) are no longer shown; that
sheet can be skipped. In the test container (software WebGL) the map renders
at 1–10 frames per second, so dialog fade-ins look slow there; not measured on
a GPU.

## 0.9.0 installer and the sheet-based GPT-6 queue (owner requests, 2026-10-03)

**0.9.0 Windows installer** (version bumped in `package.json`,
`apps/desktop/package.json`, `package-lock.json`; content unchanged,
`content-0.8.0`, so saves still load). The first installer with the 2D
presentation.

| Command | Result |
|---|---|
| `npm run build` + `npm run desktop:build` | pass (start-up script 1,716.76 KB / 432.17 KB gzip; PixiJS chunk 364.29 KB, loaded after the menu) |
| `npx electron-builder --config electron-builder.json --win nsis --x64 --linux dir --x64` (Linux + Wine) | **built** `Pantheon-Realms-Setup-0.9.0-x64.exe` (225,791,725 bytes, SHA-256 `2c6d499e01deabb71829c8170118603959d542960a51743b15dcc592efa0e659`) |
| Payload check (7-Zip) | the installer's `app-64.7z` extracts byte-identical to `win-unpacked`; `app.asar` 118.1 MB, 1,415 entries, packaged version 0.9.0; no `.glb`/`.gltf`/`.blend`, Babylon, `assets-source/`, source maps or development tools |
| `PR_SMOKE_EXE=apps/desktop/release/linux-unpacked/pantheon-realms xvfb-run -a node tools/desktop-smoke.mjs` inside `unshare -n` (no network) | **pass** (packaged: `isPackaged`, DevTools refused; 303 sprite files, the map drawn on WebGL, saves, records, 255 painted-art files, 279 interface images, audio running) |
| Copied to the owner's `installer\` folder | in 12 parts, joined on the computer; SHA-256 matches |

**Not run on Windows; unsigned** (SmartScreen: More info → Run anyway).

**GPT-6 queue in sheets** (owner request: "generate inside the same image as
much content as possible"). `GPT6_2D_CONTENT_GENERATION.md` now asks for
**140 sheets** instead of 1,097 single images (the 54 optional battlefield
paintings stay one per image):

| Group | Sheets | Files cut from them |
|---|---|---|
| A canonical references — three families per sheet, base left, upgraded right | 12 | 59 |
| B portraits — the same families, opaque, black gutters | 12 | 59 |
| C battle animations — **one sheet per creature form**, one row per animation, six cells per row | 102 | 800 strips |
| D mounted heroes — one per pantheon (5 directions × idle 4 + walk 6) + one sheet of the six figures | 7 | 102 |
| E map objects — towns, resources, two location sheets (decoration included) | 4 | 47 |
| G obstacles, siege pieces (rows = piece, columns = intact / damaged / rubble) | 2 | 19 |
| H effects (one row each) and projectiles | 1 | 11 |

Changes that come with it (proposed, unplaytested): creature animations
have **6 frames** (`defend`, `hit`, `takeoff`, `landing` 3) instead of 8
(6, 4), with frame rates that keep the pacing targets (idle 6 at 3 fps = 2 s,
attack 6 at 6 fps = 1 s, death 6 at 5 fps, victory 6 at 4 fps); map heroes
need **5 directions** (the game already mirrors east, north-east and
south-east for the west) and walk 6 frames instead of 8. At the image size
GPT-6 has delivered so far (about 1.6 MP) a creature cell is about
150–210 px — the battlefield at 100 % zoom shows a one-hex creature's frame
at about 147 px, so this is enough at normal zoom but softer when zoomed in
or on high-DPI screens; each sheet asks for "this size or larger", and the
busiest sheets (more than six rows) may be delivered in two parts.

New tool `npm run sprites:cut` (`tools/assets/sprites/cut_sheets.py`) with
the layouts written by `npm run sprites:queue`
(`assets-source/sprites/sheet-layouts.json`): keys out a non-transparent
background (flat magenta, grey, fake checkerboard; edge pixels unmixed, a
magenta key removed everywhere including enclosed gaps), moves each cut to
the emptiest line near the grid, re-aligns every animation on the creature's
feet (median ground contact and foot position; airborne frames keep the idle
row's height), crops objects to content with the anchor at the ground
contact, squares references and figures, cuts portraits along their
gutters, writes a sidecar per strip (frames, fps, loop, anchor, pixels per
hex), a preview per sheet, and a cut log (a sheet is re-cut only when it
changes; files it did not cut are never overwritten). `npm run
sprites:import` reads the sidecars (any frame size; runtime scale never
above the nominal, never enlarged), completes a map hero with five
directions, and accepts hero figures from 300 px.

| Check (cloud) | Result |
|---|---|
| `python3 tools/assets/sprites/cut_sheets.py --self-test` (synthetic sheets: jittered figures on magenta, a two-part transparent hero sheet, objects on a fake checkerboard, opaque portraits; re-run skipping; no overwrite of foreign files) | **pass** |
| Realistic sheets made from the delivered Hoplite and Griffin reference stills (Hoplite on flat magenta at 1256², Griffin transparent at 1.4 × the size, rows jittered by up to 5 %) → `cut_all` → `import_sprites.py --src …` (real import) | 17 strips cut and imported, 0 problems; both sets became `final`; `sprites.test.ts` 9/9; the built game's Unit Detail showed "Final sprites", the Hoplite on its pedestal and the Griffin hovering in `fly`; magenta fully removed after the edge-unmixing fix. **Reverted afterwards** (manifest restored, `assets-runtime/sprites/final/` removed) |
| Synthetic sheets for every other layout kind (hero, effects + projectiles, towns, locations + decoration, siege, obstacles, references, figures, portraits) with the real layouts | 69 sprite files + 5 references + 5 portraits cut; `import_sprites.py --dry-run` 0 problems; a real import of the Greek hero sheet marked the hero `final` with five directions (reverted) |
| `npm run sprites:queue` | 140 sheets, Brief 5 descriptions for 102/102 forms |

**Not established:** how well GPT-6 keeps a 6-column grid, one creature at
one size across 36–54 frames, and empty space between frames — no real
sheet has been generated yet. Suggested pilot: `sheet.creature.greek.tier1.base`
first, then `npm run sprites:cut` and look at its preview.

## 2D presentation migration (owner directive, 2026-10-03)

> Pantheon Realms is a desktop-first, offline-capable, data-driven
> deterministic turn-based strategy game. TypeScript owns authoritative rules
> and AI. React owns application interface screens. PixiJS owns the 2D
> Adventure Map, Tactical Battle presentation, sprite animation, and animated
> Unit Detail viewer. Electron packages the desktop application and a browser
> build uses the same core. Content presentation uses high-resolution 2D
> backgrounds, sprites, atlases, portraits, UI art and animation strips.
> Gameplay state changes only through validated commands; presentation never
> defines gameplay outcomes.

The owner's *2D Presentation Migration Directive* replaced Babylon.js with
PixiJS 8 (`pixi.js` 8.22.0) for the Adventure Map, the Tactical Battle and the
Unit Detail viewer. Rules, AI, content, campaigns, saves and the React screens
are unchanged (no rule, value or save format changed; content stays
`content-0.8.0`, saves still load). Inventory and plan:
`2D_MIGRATION_AUDIT.md`. App version not bumped in this step (the 0.9.0
installer above contains it).

**What the game does now (measured in the browser build and the desktop build):**

* **Adventure Map** — PixiJS layers: sea and sky backdrop, painted terrain
  (the delivered ground paintings repeating in map space), roads, optional
  grid, reachable area, route preview and selection, map locations,
  decoration, guards and one mounted avatar per pantheon (depth-sorted), fog,
  effects. Picking inverts the hex projection, so sprite size cannot change
  which hex is chosen. Avatars walk facing the step's direction (mirrored
  westward until direction strips exist) and hold a 1.2 s readiness beat
  before an accepted battle (skipped at Instant). 2D camera: drag/arrow-key
  pan, wheel zoom 0.42–2.2, clamped to the map.
* **Tactical Battle** — painted battlefield background fitted under the
  logical 15 × 11 hex overlay, obstacles, siege pieces in intact / damaged /
  rubble states, creature sprites standing on their anchor cell (defenders
  mirrored), count badges, projectiles and effects; the fallen play `death`
  (or are laid down) and stay; winners cheer. The React HUD is unchanged and
  the board is laid out between its insets.
* **Unit Detail** — portrait plus the animated 2D viewer: base/upgraded
  switch, one button per animation the creature's content needs (stand-ins
  marked `*`), Play/Pause/Stop/Restart, 0.5×/1×/2×, Autoplay, Face left;
  reduced motion shows a still frame; the Assets tab lists every strip with
  its status and provenance.
* **Hero screen** — the pantheon avatar's still in the paper doll.
* **Towns** — unchanged 2D background + building overlays; 18 locations per
  pantheon (7 dwellings + 11 support), base and upgraded dwelling pictures
  replace each other at one location (new unit test).
* **Settings** — 3D-only and non-working options removed (camera
  auto-rotation, map labels, tooltips toggle, voice volume, camera shake,
  screen flashes); graphics presets now drive the 2D renderer (resolution,
  anti-aliasing, ground shadows, decoration density, painted ground, ambient
  animation, effects level, frame cap).

**1. 2D assets reused** (not regenerated): the 92 story pictures, 76 ground and
sky paintings (map terrain, battle backgrounds, skies), 41 big-moment
pictures, 43 creature portraits, 172 functional icons, 24 cursors, 6 pantheon
emblems, the opening/menu art, the town backgrounds and building art of all
six pantheons, and — as placeholder sources — the 172 creature reference
views (still poses for 43 forms), the six mounted-hero boards (map avatars and
hero-screen figures) and the map-marker concept sheet (40 map locations).

**2. Placeholders created** (`assets-runtime/sprites/`, 7.1 MB, 186 manifest
entries, every one `status: "placeholder"` with provenance; generated by
`npm run sprites:placeholders`): 102 creature sets (43 stills cut from the
delivered three-quarter reference views, 59 silhouette strips with the
animations each form needs), 7 map-avatar sets (6 from the hero boards, 1
neutral rider) with 6 hero-screen figures, 41 map locations (40 from the
marker sheet, 1 drawn windmill), 6 decorations, 7 obstacles, 12 siege pieces,
2 projectiles and 9 effect strips. A contact sheet is in
`assets-source/sprites/placeholder-contact.png`.

**3. Still to be generated by GPT-6** (`GPT6_2D_CONTENT_GENERATION.md` as
first written, one entry per file — **replaced the same day by the sheet
edition above**: 140 sheets cut into these files): A 59 canonical references (forms without one), B 59 portraits, C 800
battle animation strips (102 forms), D 102 map-avatar files (6 pantheons × 8
directions × idle/walk + 6 figures), E 48 adventure objects, F 54 battle
backgrounds (optional climate variants), G 19 obstacles and siege pieces,
H 11 effects/projectiles. Delivered files are imported with
`npm run sprites:import` (no code change).

**4. 3D removed** (deleted, git history is the backup): dependencies
`@babylonjs/core` 9.28.0, `@babylonjs/loaders` 9.28.0, `@gltf-transform/core`,
`gltf-validator`; the Babylon scene code (`meshkit`, `proxies`, `models`,
`modelRegistry`, `mountedHeroes`, `contactShadow`, `artTextures`,
`animations`, the 3D `viewer` and `heroFigure`, 2,546 lines) and its tests
(`heroes.test.ts`, `models.test.ts`, `tests/e2e/models.spec.ts`, the
`?e2e=calibration` mode); the six mounted-hero GLBs with their animation
manifest and rig contract (9.4 MB) and the calibration GLB; the GLB tools
(`validate-units.mjs`, `make-calibration-glb.mjs`, npm scripts `assets:check`,
`assets:calibration`), `HERO_ANIMATION_REPORT.md`; the GLB sections of
`ASSET_PIPELINE.md`; in the owner's toolkit the `pr-babylon-scene` skill
(replaced by `pr-pixi-scene`) and the glTF/Babylon/Blender parts of
`tools/pantheon-dev`. No `.glb`, `.gltf` or `.blend` file remains in the
repository. The owner's separate Blender project was not touched.

**5. Tests and checks run (cloud, 2026-10-03):**

| Command | Result |
|---|---|
| `npm run check` (boundaries + type-check + unit tests) | **pass** — 32 files, 315 tests (new: sprite manifest, animation vocabulary, hex round trips, town art) |
| `node --test tools/pantheon-dev/tests/toolkit.test.mjs` | **pass** — 38 tests |
| `npm run build` | pass — start-up script 1,716.76 KB / 432.17 KB gzip (0.8.0 before the migration: 1,587.69 / 428.87; the sprite manifest is bundled), PixiJS chunk 364.29 KB / 108.56 KB gzip, loaded after the menu |
| `npx playwright test` (full suite, Chromium + SwiftShader, against the fresh build) | 125 tests: **81 passed, 2 failed, 42 skipped** (the opt-in screenshot sweep `zz-moments-review`, `PR_REVIEW=1`) in 34 min. Both failures were test assumptions: `round9` asked for a hex's screen position before the on-demand 2D view had loaded, and expected the old graphics-preset wording. Fixed in the test (it now waits for the view; new wording); `round9.spec.ts` rerun **4/4 passed** |
| `npm run desktop:build` + `xvfb-run -a node tools/desktop-smoke.mjs` | **pass** (dev layout): 303 sprite files served and decoded, no `.glb/.gltf/.blend` in the renderer, the adventure map drawn on WebGL without a view error, saves, records, 255 painted-art files, 279 interface images, audio running |
| `node tools/perf/load-time.mjs apps/client/dist --runs 3` | menu **214 ms** local / **443 ms** web (0.7.0 round: 221 / 446); first scene **912 ms** local / **1,220 ms** web (0.7.0 round with the 3D layer: 1,311 / 1,255; 3-run medians on the software renderer, noisy) |
| the same smoke inside a network namespace with only loopback (`unshare -n`; `curl https://example.com` fails) | **pass** — the desktop game starts and draws the map with networking disabled |
| `electron-builder --linux dir --x64` + `PR_SMOKE_EXE=…/linux-unpacked/pantheon-realms` smoke, also inside `unshare -n` | **pass** (packaged: `isPackaged`, DevTools refused); `app.asar` 118.1 MB (0.8.0: 124.6 MB), 1,415 entries, no `.glb`/`.gltf`/`.blend` or Babylon file, no `assets-source/`, source maps or development tools |
| stale-term search (directive §23) | see below |

Not run: the game on Windows after the migration, a real GPU (all rendering
was SwiftShader, which the automatic graphics pick sets to Low), Safari or
Firefox, a human play-test of the 2D views.

**Stale-term search after the migration** (`Babylon babylon GLB glb glTF gltf
Blender blender mesh skeleton armature "3D model" "3d model" SceneLoader
ArcRotateCamera`, all non-generated files; `apps/desktop/renderer/` is build
output and was rebuilt):
**no remaining match claims a 3D renderer, GLB/glTF runtime format, Blender
pipeline, rigs or 3D units.** No `.glb`, `.gltf` or `.blend` file is in the
repository, `npm ls` finds no Babylon or glTF package, and the 10 skill zips
hold no match. Remaining matches (case-insensitive), all classified:

| File (matches) | Classification |
|---|---|
| `DEVELOPMENT_STATUS.md` (58) | this section's record of what was deleted and of the search itself; the rest are in dated history sections, each marked **Obsolete (in part / whole section)** |
| `2D_MIGRATION_AUDIT.md` (35) | the pre-migration audit (a required deliverable); marked at the top as a record of the removed 3D state |
| `tools/check-boundaries.mjs` (1), `tools/desktop-smoke.mjs` (3), `tests/e2e/heroes.spec.ts` (2) | valid non-3D meaning: checks that **forbid** Babylon imports and `.glb/.gltf/.blend` files |
| `ARCHITECTURE.md` (3), `CLAUDE.md` (2), `IMPLEMENTATION_PLAN.md` (1) | the boundary lint's forbidden list, the smoke check, and "deleted/obsolete" notes |
| `docs/pantheon-v0.3/` `CHANGELOG_v0_3.md` (3), `DECISIONS_v0_3.md` (1), `implementation/06…` (3), `reference/05…` (1) | inside passages explicitly marked obsolete (the decision log records DEC-23, the 2D migration) |
| `assets-source/creatures/reference/delivery-notes/` (6) | the creature delivery's unaltered records (hashes in its manifest); marked obsolete by the folder's README (1 match, the marking note) |

Generated build output (`apps/client/dist`, `apps/desktop/renderer`,
`apps/desktop/release`) was rebuilt and holds no 3D engine code; its only
matches are inside PixiJS itself (its 2D `mesh` drawing pipe and `glBuffer`
WebGL helpers — third-party code, valid 2D meaning).

**6. Owner decisions needed** (nothing here blocks play):

1. **Placeholder art is what the game shows** until the GPT-6 queue is
   delivered: is the queue's order (A references → … → H effects) and its
   scope (54 optional climate backgrounds) right?
2. **Egyptian tiers 2 and 5 change body plan on upgrade** (four-legged base,
   upright upgrade, following the pantheon board): keep (two motion designs
   per pair) or redesign so each pair shares one?
3. **Hero-screen figure**: a still of the pantheon's map avatar (the 3D
   figure's salute is gone); a different picture per named hero would be new
   art.
4. **Version and installer**: done — the 0.9.0 installer (above) contains the migration.
5. The six-pantheon **v0.3 design documents** in `docs/pantheon-v0.3/` were
   updated for the 2D stack (18 of 35 files; history marked obsolete, the
   original hashes kept in `docs/tooling/source-document-checksums.json`):
   please confirm the rewritten production chapters 01–04.

## 0.8.0 Windows installer (2026-10-03, for play-testing)

> **Obsolete in part (2026-10-03):** the mentions of the deleted 3D layer in this dated section (Babylon.js, GLB/glTF models, the calibration model, meshes, 3D scenes) are history only; the 2D migration replaced them (see "2D presentation migration" above). Measurements were taken on that build.

Version bumped from 0.7.0 to **0.8.0** (`package.json`, `apps/desktop/package.json`,
`package-lock.json`): the first installer with the second fix round, the delivered
cursors and the pantheon emblems (below). Content `content-0.8.0`, so earlier saves
load; heroes saved standing on a town's tile are moved to its gate when loaded.

| Command | Result |
|---|---|
| `npm run build` + `npm run desktop:build` | pass (start-up script 1,587.69 KB / 428.87 KB gzip) |
| `npx electron-builder --config electron-builder.json --win nsis --x64 --linux dir --x64` (Linux + Wine) | **built** `Pantheon-Realms-Setup-0.8.0-x64.exe` (222,612,988 bytes, SHA-256 `46d655248461dbbe016664d4fad4beb1a45f1b16ef1b87083dc010a3d8e68f4b`) |
| Payload check (7-Zip) | the installer's `app-64.7z` extracts byte-identical to `win-unpacked`; `app.asar` (124.6 MB) says version 0.8.0, holds the 58 cursor images and the 6 emblems, and no `assets-source/` or source maps |
| `PR_SMOKE_EXE=apps/desktop/release/linux-unpacked/pantheon-realms xvfb-run -a node tools/desktop-smoke.mjs` | **pass** (packaged: `isPackaged` true, DevTools refused; saves, records, unit GLB, six hero GLBs, 255 painted-art files, audio running). New smoke check: all **279 interface images** (58 cursor rasters at 1x and 2x, 221 final icons with the emblems) are served by the app protocol and decode, and the interface cursor variable points at the delivered arrow (`prgame://app/ui/cursors/…`) |
| Copied to the owner's `installer\` folder | in 9 parts, joined on the computer, SHA-256 matches |

**Not run on Windows; unsigned** (SmartScreen warns: More info → Run anyway). The
cursors' look and hotspots on a real Windows screen (and at 125–200 % display
scaling) are untested.

## Owner fixes of 2026-10-03, second round (town gates, the fallen, victory, town armies), the delivered cursors and pantheon emblems

**In the 0.8.0 installer.** Owner decisions (rules changes, unplaytested):

1. **Victory:** when a battle is won, every surviving creature of the winning side
   plays its victory animation, then keeps cheering until the result opens (the
   beat on the board after the last blow is now 1.2 s; it was 0.7 s).
2. **The fallen stay on the battlefield:** a destroyed stack plays its dying
   animation and stays lying where it fell (no base disc or count label). **Rules
   change:** its cells stay taken for the rest of the battle (`occupancy` marks them
   `corpse:<id>`): ground stacks cannot end there or walk through; flyers still pass
   over; corpses in a wall or gate opening do not block (so a breach can never be
   sealed). A battle loaded from a save shows its dead lying down.
3. **Town gates:** a hero never stands on a town's own tile. **Rules change:** each
   town has a gate — the neighbouring tile joined to it by a road (several: the one
   nearest the map centre, so point-symmetric maps get mirrored gates; Twin Harbors
   (4, 8) and (30, 8)) — and the town site is used from there: visiting, recruiting
   to the hero, the Tavern placing a new hero, training, the merchant, divine gifts,
   garrison exchange, Recall/Homecoming, capture and sieges (the defending visitor
   stands at the gate). The town tile is a building nobody enters; moving "to" a
   town goes to its gate. Missions that placed heroes in a town start them at its
   gate, and older saves are settled the same way when loaded. Effects: routes from
   a town start one road step out (implementation/06 reference costs are 75 MP
   shorter from the gate: Three Beacons M01 900, M02 1,200, M03 2,325 / 2,950);
   a town's other road exits are reached around it. Clicking the town while the
   hero stands at its gate opens it.
4. **Town armies:** the Exchange troops button is gone. Stacks are dragged between
   the garrison and the visiting hero (and within either): matching stacks merge,
   different stacks swap; Shift- or Ctrl-drag splits (choose how many in a small
   dialog); clicking a stack and choosing a quantity, then clicking a slot, also
   splits. Rules unchanged (`TransferStack`). On the map, clicking an own hero next
   to the selected one opens the troop exchange (the *meet* cursor).
5. **Mouse cursors delivered:** the 24 cursor masters (128 px, owner's art project,
   2026-10-03) are in `assets-source/ui/cursors/` (all 24 SHA-256 match the
   delivery manifest; the manifest is kept beside them). `npm run cursors:import`
   now writes 32 px (1x) and 64 px (2x) rasters with the delivery's hotspots
   (arrow and gauntlet 2,2; sword 30,16; magnifier and the rest 16,16) and the sword
   turned to the six hex sides on a grown canvas (44 × 44 / 88 × 88 for the slanted
   ones) with its point as the hotspot; the game uses
   `image-set(1x, 2x) x y, <system cursor>` (absolute URLs, preloaded), so the
   system cursor shows while they load. Settings → Display → Game cursors (on by
   default) keeps the system cursors.

6. **Pantheon emblems delivered:** the six crests (1024 × 1024 RGBA, owner's art
   project, 2026-10-03; all six SHA-256 match the delivery manifest) are in
   `assets-source/icons/final/`; `npm run icons:import` wrote them at 256 px to
   `assets-runtime/ui/icons/final/` and registered them (`emblem.<pantheon>`; 221
   final icons now). The shared `Emblem` component shows them everywhere a pantheon
   is marked (setup cards and rival chips, random-map seats, Encyclopedia dividers,
   Pantheon, Town, Kingdom Overview and hero screens, world dialogs, summary and high
   scores), contained in its box (no cropping of the different silhouettes).

**Checks run (cloud):**

| Command | Result |
|---|---|
| `npm run check` | pass (final run after the emblems) — **315 unit tests in 32 files**. New: `rules/test/townGate.test.ts` (4: gates on the road and mirrored on Twin Harbors; heroes start at the gate, the town tile is blocked, moving to the town stops at the gate; capture from the gate; older saves settled), `rules/test/corpses.test.ts` (a destroyed stack's cells stay taken, ground stacks cannot reach them); `ui/test/cursors.test.ts` rewritten for the delivered art (every ID resolves to its 1x/2x files with the delivery's hotspot; the six turned swords keep their point on the side they face). Tests updated for gates: reference routes, hiring, Homecoming, siege capture, divine gifts, a skirmish AI test (walks two tiles out so the Tavern can place a hero), and `GameDriver.marchTo` (a town destination means its gate) |
| `npm run cursors:import` | 24 cursor files → 29 images (24 + 5 extra sword angles), 1x and 2x, hotspots equal to the delivery's `hotspot32` for all 24 |
| `npm run build` | pass |
| `npx playwright test tests/e2e/round10.spec.ts` | **5 / 5**: hero at the gate, clicking the town opens it, walking back stops at the gate; drag a stack hero → garrison, Shift-drag split (dialog), click-select split of 3; corpses lie on the board and the winners celebrate before the result; all 29 cursor images served at 1x and 2x, the map picks attack / hero / move cursors with the 16,16 hotspot and the system fallback; the battle board on screen has odd rows shifted right and y downward, as the sword angles assume |
| Town-related specs (siege, services, round9, journey, campaign, features, mapSites, bigMoments, pantheons) | **37 passed, 2 failed** (19.3 min); both failures expected the old behaviour — `round9` the drawn stand-in attack cursor, `siege` the hero standing on the captured town's tile. Updated (delivered cursor; the town's gate) and rerun: pass |
| `npm run icons:import` + `npm run icons:catalog` | 221 final icons registered (215 + the 6 emblems at 256 px); catalog 786 entries. `uiArt.test.ts` read the illustrations section's size the way the importer does not ("emblems 256 px; thumbnails 640 × 360 px" → it expected 640); it now reads it like the importer (256) |
| `menu.spec.ts` (4) | pass — every registered final icon, the emblems included, is served and decodes at its size |
| Emblem review (temporary script, not kept) | 13 emblem images on the pantheon setup screen (cards 48 px, rival chips 21 px, detail 67 px), the Encyclopedia dividers (medallion), the Town title (30 px): all 256 px sources decode, shapes contained in their boxes, no clipping |
| Screenshots reviewed | hero at the gate beside Westharbor, town armies after the moves, a battle with two fallen stacks lying on their hexes, the delivered cursor and emblem contact sheets, emblems on setup, Encyclopedia and Town |

Not run: the full Playwright suite (owner request), the balance tool, the desktop
build and an installer. The cursors were checked by style and file tests; how each
looks and clicks at real size in the desktop app, with every melee side and on a
high-density screen, still needs a person.

## 0.7.0 Windows installer (2026-10-03, for play-testing)

> **Obsolete in part (2026-10-03):** the mentions of the deleted 3D layer in this dated section (Babylon.js, GLB/glTF models, the calibration model, meshes, 3D scenes) are history only; the 2D migration replaced them (see "2D presentation migration" above). Measurements were taken on that build.

Version bumped from 0.6.0 to **0.7.0** (`package.json`, `apps/desktop/package.json`,
`package-lock.json`): the first installer with the owner's interface pass, the
first 43 creature portraits and the 2026-10-03 requests (below). Content
`content-0.8.0`, so 0.6.0 and 0.5.0 saves load. Preferences gain
`graphicsTested`: on the first start of 0.7.0 the quick graphics test picks a
preset once, also for people who had 0.6.0.

| Command | Result |
|---|---|
| `npm run build` + `npm run desktop:build` | pass (start-up script 1,576.36 KB / 426.17 KB gzip) |
| `npx electron-builder --config electron-builder.json --win nsis --x64 --linux dir --x64` (Linux + Wine) | **built** `Pantheon-Realms-Setup-0.7.0-x64.exe` (221,808,939 bytes, SHA-256 `f3be34eeccf4f6012179c0a7e004b2b458a23f70d25bd6a621bb9d5de67d12de`) |
| Payload check (7-Zip) | the installer's `app-64.7z` extracts byte-identical to `win-unpacked`; `app.asar` (123.7 MB) says version 0.7.0, holds `renderer/ui/cursors/manifest.json`, and no `assets-source/` or source maps |
| `PR_SMOKE_EXE=apps/desktop/release/linux-unpacked/pantheon-realms xvfb-run -a node tools/desktop-smoke.mjs` | **pass** (packaged: `isPackaged` true, DevTools refused; saves, records, unit GLB, six hero GLBs, all 255 painted-art files, audio running) |
| Copied to the owner's `installer\` folder | in 9 parts, joined on the computer, SHA-256 matches |

**Not run on Windows; unsigned** (SmartScreen warns: More info → Run anyway).
The automatic graphics pick and the presets have only been run on the
software renderer here; on a real Windows GPU they are untested.

## Owner requests of 2026-10-03 (cursors, divine gifts, smarter AI, three fixes, graphics quality)

> **Obsolete in part (2026-10-03):** the mentions of the deleted 3D layer in this dated section (Babylon.js, GLB/glTF models, the calibration model, meshes, 3D scenes) are history only; the 2D migration replaced them (see "2D presentation migration" above). Measurements were taken on that build.

**In the 0.7.0 installer.** Designs and proposed values:
`DESIGN_PROPOSALS.md` group 0.8 (§29–32). Owner answers: Favor buys **divine
gifts at the Temple**; graphics use **presets + an automatic pick**.

1. **Context cursors (stand-ins):** the 24 IDs of Brief 7 switch by what a
   click would do — on the map (move, move later, attack, siege, visit, portal,
   own hero or town, blocked; busy on another empire's turn; grabbing while
   the map is dragged) and in battle (move, fly, melee — the sword turned to
   the side of the hex the strike comes from — shoot, weak shot, structure,
   spell, ability, info, blocked). Until the art is delivered: system cursors
   where the meaning is the same, otherwise drawn 32 px stand-ins.
   `npm run cursors:import` brings the delivered art in with no code change
   (ASSET_PIPELINE.md §11, *Mouse cursors*). Settings → Display → *Game
   cursors* (on by default) switches back to the system pointer. The battle
   sword's six angles were checked in unit tests, not yet looked at by a person
   on every side.
2. **Divine gifts at the Temple:** six gifts (5–20 Favor: Gold, Wood and Stone,
   Crystal, +1,000 experience, half a week of tier 1–4 recruits, a minor
   artifact), one per town with a Temple per week; skirmish, random maps and
   the later campaigns (The Three Beacons: off). The AI buys them with Favor
   it does not need for gods or the week's intervention.
3. **AI:** judges heroes by army, commander, matching battle stat bonuses
   (pantheon, gods, specialties, sets, the week), Offense/Archery/Armorer,
   morale, luck and magic (`packages/ai/src/assessment.ts`), and reads the
   week's event: lower Gold reserves in a week of extra income, going home to
   recruit early in a week of extra growth. Proposed weights; measured effect
   below.
4. **Minimap view frame:** the minimap draws the part of the map on screen (the
   camera's ground footprint, updated about 7 times a second while the minimap
   is shown).
5. **Combat log:** events are recorded as the store receives them (last six
   battles), so the first round — published before the battle screen mounts —
   is in the log.
6. **Hot-seat messages:** at the hand-over, notices meant for the previous
   player (toasts, hints, big moments) are cleared; only public ones (an empire
   eliminated) and the new-week banner stay.
7. **Graphics quality:** Low / Medium / High (resolution, anti-aliasing at the
   next start, soft contact shadows, figures per troop, map detail, painted
   ground, small animations, frame cap). On the first start a quick WebGL test
   (at most 0.6 s, when the menu is idle) picks one; Settings → Display shows
   what each preset changes and can run the test again. Resolution and frame
   cap change at once, the rest from the next map or battle view. UI-test mode
   (`?e2e`) skips the automatic pick (High stays, as before) so runs are
   reproducible. Babylon shadow maps were tried and dropped (on the test
   renderer they shaded the casters, not the ground). The test's thresholds are
   proposed and were **not calibrated on real PCs** — this cloud has only a
   software renderer, which always picks Low.

**Checks run (cloud, 2026-10-03):**

| Command | Result |
|---|---|
| `npm run check` | pass — boundaries, type-check, **310 unit tests in 30 files** (new: `ui/test/cursors.test.ts` 5, `rules/test/gifts.test.ts` 4, `ai/test/assessment.test.ts` 3, `presentation/test/graphics.test.ts` 5, `ai/test/services.test.ts` +1). The first run failed one test: *The Silver Branch* headless journey lost its M05 assault — the rival AI, now judging Orla's upgraded war-band stronger, stayed behind its walls instead of meeting her in the field (with the old heuristic it attacked and lost). The four arc journeys now recruit the town's troops before marching (66 → 102 creatures); all pass |
| `npm run balance -- skirmish random --jobs 2` | 252 jobs in 4.5 min (`balance-reports/balance-2026-10-03T04-14-51.md`). Twin Harbors: 216 matches, 206 decided (mean day **15.3**; 14.9 before), 10 at the day cap (6 before); west **0.54** (0.54), first mover **0.71** (0.68); pantheon averages **0.42–0.63** (0.37–0.60). Random maps (18 matches each, noisy): 2 empires 0.33 / 0.67 (0.50 / 0.50 before; 3 undecided, 0 before); 3 empires 0.33 / 0.33 / 0.33 (0.56 / 0.39 / 0.06 before) |
| `npm run build` | pass — start-up script 1,576.36 KB / 426.17 KB gzip (the cursor stand-ins, presets and quick test; 1,542.83 / 417.49 at the interface pass), dist 121 MB |
| `node tools/perf/load-time.mjs apps/client/dist --runs 5` | menu **209 ms** local / **422 ms** web (219 / 452 before); settled 994 / 1,407 ms (2,640 / 3,446 before) — **not comparable**: the tool opens the build without `?e2e`, so the automatic pick chose Low on the software renderer (no painted ground) |
| `npx playwright test tests/e2e/round9.spec.ts` | 4/4 pass: map cursor (a drawn stand-in over the guarded mine, another over the hero) and the minimap frame; a Temple gift through the town screen (Favor 30 → 25, Gold +2,000, the Temple then waits); a battle started from the map has "— Round 1 —" in its log; Settings shows three presets and the quick test, and Low fetches no ground or sky textures |
| Full `npx playwright test` (production build) | first run: tests 1–49 of 118 passed, then the calibration-model battle (`models.spec.ts`, a known slow test) stalled — the browser stayed at full CPU for about 15 minutes past its limit and the run was stopped. That test then passed alone (2.1 min), and the remaining eight files were rerun together: **28 passed, 0 failed** (13.5 min; the 42 opt-in review tests skipped). Every test passed at least once on this build; the stall was not reproduced |
| Screenshots reviewed | map cursor, Low map (plain ground, no sky), town Temple panel with *Divine gifts*, Settings → Display, battle on High (contact shadows) and Low (one figure per troop, plain board) |

Not run: the desktop build and smoke, an installer, a hot-seat UI test of the
hand-over (the change is two lines in the store's hand-over; the existing
hot-seat tests pass), real-GPU checks of the presets and the quick test.

## Creature art, first part (Brief 5, delivery 2026-10-03)

> **Obsolete in part (2026-10-03):** the mentions of the deleted 3D layer in this dated section (Babylon.js, GLB/glTF models, the calibration model, meshes, 3D scenes) are history only; the 2D migration replaced them (see "2D presentation migration" above). Measurements were taken on that build.

The owner's art project delivered **forms 001–043** of the 102 (all Greek,
Norse and Egyptian forms and the Kitsune): 172 model-reference views and 43
painted portraits, already copied into the folder. All 215 files match the
delivery's SHA-256 manifest; the Nine-Tailed Kitsune (form 044, an unfinished
draft) and forms 045–102 are not delivered and are not registered.

* **Portraits in the game:** `npm run icons:import` registered the 43
  (`creature.<pantheon>.tier<N>.<base|upgraded>.portrait`). The importer now
  writes fully opaque pictures as 256 px **WebP** (1.2 MB for the 43; 6.6 MB as
  PNG) and keeps PNG for icons with transparency (the 172 earlier icons were
  re-imported byte-identical). Shown through `CreaturePortrait` in its gold
  frame: army slots, recruitment and training, battle turn order and stack
  panel, Bestiary, encounters, results; the creature detail screen's portrait
  is larger (8 rem). Each portrait was checked against its creature's name on a
  labelled contact sheet (43/43 correct).
* **Reference views** stay in `assets-source/creatures/reference/` for the
  later 3D step (the game never reads them), with the delivery's notes copied to
  `delivery-notes/`. Painted, not orthographic; 1254 × 1254 instead of 1024
  (not resized). **Open owner decision:** the Egyptian board gives tier 2 and
  tier 5 different body plans for base and upgrade (four-legged Jackal Guardian
  → upright Anubian Warden; four-legged Crocodile Beast → upright Sobek
  Warbeast), so those families need two skeletons each; the brief asked one.
  The art follows the board.
* `ICON_CATALOG.md` / `.xlsx` / `.csv` regenerated (`npm run icons:catalog`): the
  43 rows read "Final art".

Checks run:

| Command | Result |
|---|---|
| SHA-256 of the 215 delivered files in the folder against `DELIVERY_MANIFEST.csv` | 215/215 match; no other creature files in the two folders |
| `npm run icons:import` | 215 registered (172 earlier icons unchanged byte for byte, 43 new WebP) |
| `npm run icons:catalog` | 786 entries; the 43 portraits listed as final art |
| `npm run check` | pass — 292 unit tests in 26 files (`uiArt.test.ts` now accepts opaque WebP portraits at their catalog size) |
| `npm run build` | pass — start-up script 1,553.36 KB / 418.01 KB gzip (+10.5 KB: the larger final-art manifest is bundled), dist 121 MB |
| Playwright: `menu.spec` (4, incl. a new test: every registered final icon and portrait is served and decodes at its size; Hoplite and Kitsune show the painting, the Nine-Tailed Kitsune keeps the stand-in), `models.spec` bestiary viewer, `round3.spec` bestiary, `pantheons.spec` Norse and Egyptian setup/town/recruit | 8/8 pass |
| Screenshots reviewed | contact sheets of all 43; Bestiary (Greek, Egyptian, Japanese), creature detail, hero army, recruitment and training, battle turn order and stack panel |

Not run: the full Playwright suite, the desktop build and smoke, an installer.

## Owner interface pass (2026-10-03, after the 0.6.0 installer)

Twelve changes the owner asked for after play-testing 0.6.0. **Not in the
0.6.0 installer.** Rules and content values are unchanged except item 9.

1. **Main menu:** title is the logo lettering only (`brand.logo.text`, cut from
   the full logo by `prepare_ui_art.py`); no tagline, no emblem and no
   "Temporary art" chip in the footer; Random Map and High Scores are no longer
   menu entries (Random Map is under New Game, High Scores open from the
   end-of-game summary); a flat 20 % black layer between the painting and the
   menu (it replaced the gradient scrim).
2. **Credits:** the logo lettering, "Created by", **Teddy Lazebnik**, in large type.
3. **Settings:** no subtitle under the title.
4. **Encyclopedia:** eight pages — Bestiary, Gods, Heroes, Towns, Spells,
   Skills, Artifacts (with the artifact sets), Abilities. The Pantheons,
   Skirmish & World and Rules pages are gone. Most of their text is still in
   the game elsewhere — map sites in a random map's Journal help, difficulty
   effects on the setup screens, each miracle in the Miracles dialog, the
   current weekly event at its dawn — but the lists of all weekly events and
   the movement / economy / combat rules summary are no longer shown anywhere.
   Bestiary, Gods, Heroes and Towns show every pantheon one
   below the other under a divider (emblem medallion, name, epithet; Neutral
   closes the Bestiary); no pantheon buttons, no tags (status that matters is a
   plain line, e.g. "Planned — not in play"). Every spell, skill, artifact and
   ability has its own card; text about two steps larger (Encyclopedia only).
   Hero cards show the story only (the content's "Concept-board hero… Hireable
   in skirmish" notes are left out). Heroes and gods use the larger portrait;
   a hero with a painted dialogue bust now shows it (head and shoulders) as its
   portrait everywhere — 20 of 62 heroes; the others and all 60 gods still show
   generated stand-ins until portraits are delivered (Brief 4 covers the gods).
5. **Setup:** the MODE / SCENARIO / PANTHEON / PATRON / BRIEFING step bar is
   gone; the New Game cards have no "Playable" badge and larger text and titles.
6. **Random Map:** one panel (map, game, empires) with **Start** in its own bar;
   the live preview, its fairness list and legend and the footer Back button
   are gone (the preview code is removed; the map is generated when Start is
   pressed — a generator error shows under Start). Random maps start straight
   on the adventure map, **without a briefing** (objectives stay in the Journal).
7. **Pantheon icons:** every pantheon icon goes through one component
   (`Emblem`), now also in the Town and Kingdom Overview titles. The emblems are
   (stand-ins until the six crests arrived on 2026-10-03, see above): **GPT-6 Brief 6** (`GPT6_BRIEF_6_PANTHEON_EMBLEMS.md`)
   asks for the six crests; `npm run icons:import` brings them in with no code
   change.
8. **Battle result (victory and defeat):** no line under the title; the two
   sides' boxes directly below it at one height; Outcome centred under them;
   Continue under Outcome; a 20 % black layer over the painting.
9. **Random-map taverns:** hire from the 30 hireable heroes **and the 5
   campaign heroes** (Alexios, Seshet, Akane, Orla, Itzel; Hervor was already
   hireable) — 35, each in the towns of the hero's own pantheon
   (`randomMapTavernPool`, `MissionDefinition.hireableHeroIds`). Campaign
   opponents stay out; authored skirmishes and the campaigns are unchanged.
   Generator version not bumped (same maps for the same seed; only the
   mission's tavern list changed), so random maps saved before keep their old
   list.
10. **Attack panel:** your army and the opponent's face each other across a VS
    medallion; the strength "Estimate" is gone from the panel (the tile panel
    still shows its estimate); Withdraw has an icon.
11. **Level-up:** opens by itself — after a battle through the result's
    Continue, otherwise as soon as the map is idle and no dialog, story scene
    or hand-over is open (from the map, town, hero, recruitment, pantheon,
    journal or overview screens); the "Level up" buttons on the map status bar
    and the hero screen are gone. No panel title, no Confirm: clicking a skill
    card is the choice (a second click within 0.35 s is ignored, so a double
    click cannot also pick the next level's offer); with no offers a Continue
    button remains. Large skill icon on the left of each card, details on the
    right. After the last choice the screen underneath returns.
12. **Mouse cursors:** **GPT-6 Brief 7** (`GPT6_BRIEF_7_CURSORS.md`): 24 context
    cursors (interface, adventure map, battle; one sword turned to the six
    sides of a hex) with hotspot rules. (Wired into the game with stand-ins on
    2026-10-03, see above.)

**Checks run for the interface pass (cloud, 2026-10-03):**

| Command | Result |
|---|---|
| `npm run check` | pass — boundaries, type-check, **292 unit tests in 26 files** (new: `packages/rules/test/randomTavern.test.ts`, 4 tests) |
| `npm run build` | pass — start-up script 1,542.83 KB / 417.49 KB gzip (1,549 / 420 at 0.6.0), dist 120 MB |
| `npx playwright test` (full suite) | **69 passed, 1 failed**, 42 skipped (the opt-in review sweep), 37.7 min; the failure was `menu.spec` still counting the removed footer emblem — test updated, then passed |
| After a last CSS change (random-map panel on small windows) and rebuild: `menu.spec`, `features.spec`, `round3.spec` (menu, credits, New Game, both random-map tests, bestiary) | 6/6 pass |
| Targeted earlier in the round: `bigMoments.spec` (victory and defeat layout checks, level-up without Confirm), `heroes.spec` Withdraw (two-sided attack panel, Withdraw icon) | pass |
| Screenshots reviewed | main menu, Credits, Settings, New Game, Random Map (1600 × 900 and 1024 × 640), all eight Encyclopedia pages, scenario/pantheon/patron setup, battle result victory and defeat, level-up, attack panel |

Not run this round: the balance tool (no value changed except the random-map
tavern list, which the AI uses through the same hiring rules), the desktop
build and smoke, an installer (0.6.0 stays the latest).

## 0.5.0 Windows installer (2026-10-02)

> **Obsolete in part (2026-10-03):** the mentions of the deleted 3D layer in this dated section (Babylon.js, GLB/glTF models, the calibration model, meshes, 3D scenes) are history only; the 2D migration replaced them (see "2D presentation migration" above). Measurements were taken on that build.

Version bumped from 0.4.1 to **0.5.0** (`package.json`, `apps/desktop/package.json`,
`package-lock.json`) — the first installer with the mounted heroes and both
2026-10-01 and 2026-10-02 rounds. Content, rules and saves are unchanged by the
bump (content `content-0.8.0`).

| Command | Result |
|---|---|
| `npm run build` + `npm run desktop:build` | pass (start-up script 1,413.92 KB / 394.18 KB gzip) |
| `npx electron-builder --config electron-builder.json --win nsis --x64 --linux dir --x64` (Linux + Wine) | **built** `Pantheon-Realms-Setup-0.5.0-x64.exe` (145,218,092 bytes, SHA-256 `a96f1cffdd53bcba917310c541fdae7e1f176f79b0943000cd0368e3916f4c1f`) |
| Payload check (7-Zip) | the installer's `app-64.7z` extracts byte-identical to `win-unpacked`; `app.asar` (45 MB) says version 0.5.0, holds `renderer/heroes/`, no `assets-source/`, tools, source maps or `.blend` |
| `PR_SMOKE_EXE=apps/desktop/release/linux-unpacked/pantheon-realms xvfb-run -a node tools/desktop-smoke.mjs` | **pass** (packaged: `isPackaged` true, DevTools refused; saves, records, unit GLB, six hero GLBs, audio running); the menu footer reads "v0.5.0 · Desktop build" |
| Copied to the owner's `installer\` folder | in 8 parts, joined on the computer, SHA-256 matches |

**Not run on Windows; unsigned** (SmartScreen warns). Per-user install, saves in
`%APPDATA%\Pantheon Realms\saves`; saves from content 0.7.0 are listed as
incompatible and kept.

## 0.6.0 Windows installer (2026-10-02, for play-testing)

> **Obsolete in part (2026-10-03):** the mentions of the deleted 3D layer in this dated section (Babylon.js, GLB/glTF models, the calibration model, meshes, 3D scenes) are history only; the 2D migration replaced them (see "2D presentation migration" above). Measurements were taken on that build.

Version bumped from 0.5.0 to **0.6.0** (`package.json`, `apps/desktop/package.json`,
`package-lock.json`): the first installer with the 172 functional icons, hero
specialties, all 60 gods, the nine map sites, neutral reactions and the three
painted-art deliveries (story, ground and sky, big moments). Content
`content-0.8.0`, so 0.5.0 saves load (their new features stay off).

| Command | Result |
|---|---|
| `npm run build` + `npm run desktop:build` | pass (start-up script 1,549 KB / 420 KB gzip; renderer 120 MB, of which painted art 69 MB) |
| `npx electron-builder --config electron-builder.json --win nsis --x64 --linux dir --x64` (Linux + Wine) | **built** `Pantheon-Realms-Setup-0.6.0-x64.exe` (220,640,503 bytes, SHA-256 `e063aff998e2ca0b6329d951e6eae2b3b5db6bce40d35d86d840188f7535f7a5`); 0.5.0 was 145 MB — the difference is the painted art |
| Payload check (7-Zip) | the installer's `app-64.7z` extracts byte-identical to `win-unpacked`; `app.asar` (122.5 MB, 1,177 files) says version 0.6.0, holds the 117 ground/sky/big-moment WebP files and the six hero GLBs, and no `assets-source/`, tests, source maps or `.blend` |
| `PR_SMOKE_EXE=apps/desktop/release/linux-unpacked/pantheon-realms xvfb-run -a node tools/desktop-smoke.mjs` | **pass** (packaged: `isPackaged` true, DevTools refused; saves, records, unit GLB, six hero GLBs, audio running). New check in the smoke tool: **all 255 painted-art files** are served by the app protocol and decode at their registered sizes |
| Copied to the owner's `installer\` folder | in 10 parts, joined on the computer, SHA-256 matches |

**Not run on Windows; unsigned** (SmartScreen warns: More info → Run anyway).
Per-user install. Saves live in `%APPDATA%\Pantheon Realms\saves`, which the
installer and uninstaller leave alone (`deleteAppDataOnUninstall: false`; by
configuration — not tried on Windows).

## Big-moment art (Brief 3, delivery 2026-10-02)

> **Obsolete in part (2026-10-03):** the mentions of the deleted 3D layer in this dated section (Babylon.js, GLB/glTF models, the calibration model, meshes, 3D scenes) are history only; the 2D migration replaced them (see "2D presentation migration" above). Measurements were taken on that build.

The owner's 41 big-moment pictures (14 miracle cards, 12 victory/defeat
splashes, 6 level-up and 9 new-week banners) are in the game, imported by
`npm run art:import` and shown at the matching game events (`ASSET_PIPELINE.md`
§13, "Big moments in the game"). Presentation only: rules, balance, combat
flow, camera angle and the 96 px miracle icons are unchanged; every word on the
pictures is live interface text. **Not in the 0.5.0 installer.**

**Not production-finished (as delivered):** 27 of the 41 masters differ from
the brief's sizes — splashes 1672 × 941 (one 1672 × 940; brief 1920 × 1080),
banners 2172 × 724 (brief 1536 × 512); the miracle cards are 1024 × 1536 as
asked. The exact-size export of the masters is the owner's open decision and
was **not** done; the masters are untouched. The game shows display copies:
cards reduced to 768 × 1152, splashes at their native size (not enlarged),
banners reduced to 1536 × 512 (same 3:1 shape), transparency and padding kept.

**Where.** Miracle card: rises in the kit's gold frame with a live nameplate
over its bottom 18 % when an intervention is invoked (after the rules accept
it) — the player's own on the map or in battle, and an opponent's battle
miracle in the player's battle. Splash: the player's own pantheon painting
behind the battle result (win or loss), the skirmish result, mission failed,
debrief, campaign complete and the summary; live title in the painting's calm
upper centre (x 30–70 %, y 8–30 %), panels in the lower half, existing bottom
scrim plus a soft contrast pool behind the title. Level-up: the hero's own
pantheon banner above the choices, name and "Level up · Level N" on its
measured plaque. New week: at the dawn of day 8, 15, … the weekly event's own
banner (or the default), "Week N", event name and effect on its plaque,
replacing the text day banner; once per dawn, never on load. Timing reuses the
day banner's 2.2 s / 3.6 s (cards 3.6 s), shortened by the chosen animation
speed, counted as time on screen; a click or Esc closes it; reduced motion
removes the rise and fade.

**Found and fixed on the way:** the published `WeeklyEventStarted` event's own
`eventId` field is overwritten by the event envelope's ID (rules processor), so
the text day banner never named the weekly event and the weekly-event tip never
appeared. The interface now reads the drawn event from the committed state
(`weeklyEventOf`); the rules event is unchanged (renaming its field is a rules
change left for the owner). The story-scene busts lost their CSS drop shadow
(the performance rule: no CSS filters over the 3D map).

| Command | Result |
|---|---|
| SHA-256 of the 41 copies in the owner's folder and here vs the delivery `manifest.json` | 41 / 41 match |
| `npm run art:import` | 255 runtime files (214 before + 41), 71.6 MB; the 41 new ones 10.1 MB (cards 2.7, splashes 3.7, banners 3.7); every banner's plaque measured (15 / 15); no warnings |
| `npm run check` | pass — **288** unit tests in 25 files (new `packages/ui/test/bigMoments.test.ts`: 41 files at registered sizes inside `assets-runtime`, banners with alpha and the paintings opaque, never upscaled, aspect kept; every intervention, pantheon and weekly event resolves, unknown ones fall back; moments only from committed events — own miracles, an opponent's battle miracle in your battle, one banner per dawn with the drawn event; hold times) |
| `npm run build` | pass — start-up script 1,549 KB / 420 KB gzip (manifest +7 KB); `dist/` 120 MB, painted art 69 MB |
| `npx playwright test tests/e2e/bigMoments.spec.ts` | **10 / 10** (each trigger once: map miracle with frame, nameplate over the bottom 18 %, Esc without the pause menu, effect applied once, nothing on load; reduced motion without the rise; full motion with the rise and the 3.6 s hold; battle miracle on an enemy stack; won and lost battle results; lost match over the defeat painting; hot-seat long title inside x 30–70 % / y 8–30 % on two lines; level-up banner; week 2 with the Week of the Muse banner once, none on load; the default banner) |
| `npx playwright test` (full suite, production build, after both art rounds) | **70 / 70 passed** in 37.6 min (the 42 opt-in review tests skipped) |
| `node tools/perf/load-time.mjs apps/client/dist --runs 5` | menu **219 ms** local / **452 ms** web (217 / 442 before this round); settled 2,640 / 3,446 ms (ground and sky round: 2,654 / 3,027; noisy single 5-run medians on the software renderer) |
| Review sweep `PR_REVIEW=1 npx playwright test zz-moments-review` (opt-in, screenshots not kept in the repo) | 42 / 42: all 14 cards invoked in play, all 12 paintings under the real battle-result panels (7-stack tables; Greek also at 1024 × 640), all 6 level-up banners with each pantheon's longest hero name, all 9 week banners over a temperate and a snowy (light) map, all banners and cards on a dark and a light sheet — no halos or hard edges seen |

**Seen in the review.** The paintings keep their calm upper centre except the
Japanese victory (the goddess's arm reaches into the title area); the soft
contrast pool keeps the title readable there. Titles and panels never cover the
banner emblems; text stays inside every plaque (an ornament that hangs into a
plaque, like the Egyptian lotus, is measured out). Splashes are 1672 px wide, so
on a 1920 × 1080 window the browser stretches them about 1.15 × (softer, no new
detail); cards are shown from the 768 × 1152 copy (up to ~700 px tall, so on a
high-density display the browser enlarges them slightly). The game has no
laurel title frame (R7 in the brief); titles use the kit's ornament divider.

**Limitations.** Software renderer only (SwiftShader), not a real GPU, the
desktop app or Windows. In this test browser the first composited frames can be
held back for seconds, so the rise is not seen smoothly there; the hold counts
time on screen, so the picture is still shown for its full time. A new-week
banner shows over whatever screen is open at dawn (in hot-seat, over the
hand-over screen). The weekly event's rules event still carries the envelope ID
in its `eventId` field (see above).

## Ground and sky art (Brief 2, delivery 2026-10-02)

> **Obsolete in part (2026-10-03):** the mentions of the deleted 3D layer in this dated section (Babylon.js, GLB/glTF models, the calibration model, meshes, 3D scenes) are history only; the 2D migration replaced them (see "2D presentation migration" above). Measurements were taken on that build.

The owner's 76 ground and sky pictures (60 terrain textures, 6 battlefield
paintings, 10 skies) are in the game: imported by `npm run art:import` and drawn
on the adventure map, around it and in battles (`ASSET_PIPELINE.md` §13, "Ground
and sky in the game"). Presentation only — rules, camera angle, panning and zoom
unchanged. Owner decisions: **mirrored repeat** for the terrain until finished,
seamless versions arrive; the **sky past the north edge of the map** (the fixed
cameras never look up to the horizon; battles show no sky). **Not in the 0.5.0
installer.**

**Not production-finished (as delivered):** terrain 1254² (brief 1024²; the
runtime copy is reduced to 1024², a power of two), battlefields 1419 × 1108
(brief 4096 × 3200, shown at native size), skies 2048 × 768 (brief 4096 × 1536,
native). Terrain and sky seams are **not** seamless: the delivery measures terrain
edge differences 1.2–2.7 × the inside difference (median 1.44; all ten water
textures ≥ 1.9) and sky left/right edges 5–14 ×. Several terrain averages differ
from the brief's colours (median distance 38, up to 64 of 441); the minimap keeps
the brief's colours. Sky horizons are the brief's 62 % target, not measured.

| Command | Result |
|---|---|
| SHA-256 of the 76 copies in the owner's folder and here vs the delivery `manifest.json` | 76 / 76 match |
| `npm run art:import` | 214 runtime files (138 story + 76 ground/sky), 61.5 MB; the 138 story files byte-identical to before |
| `npm run check` | pass — **276** unit tests in 24 files (new `packages/ui/test/groundArt.test.ts`: all 60 terrain IDs for the ten map climates, 6 battlefields, 10 skies and the temperate fallback resolve; files at the registered sizes inside `assets-runtime`; never upscaled; `wrap` = mirror; minimap colours unchanged) |
| `npm run build` | pass — start-up script 1,535 KB / 417 KB gzip (manifest +13 KB); `dist/` 110 MB, of which painted art 60 MB |
| `npx playwright test` | **60 / 60 passed** in 32.5 min (new `groundArt.spec.ts`: temperate and tundra maps fetch only their climate's textures and sky, all 200; the camera's angle is unchanged by panning; a battle fetches its painting) |
| Temporary inspection (not kept): every climate at map centre, north edge and close zoom; every battlefield | screenshots reviewed: climate switching, textures under fog and decor, sea in the climate's water, sky beyond the north edge; battle paintings oriented as the brief says (coast sea, plateau chasm and beacon base at the top, ridge walls left and right), board in the quiet centre, units and grid readable |
| 3 × 3 repeat review of four textures (plain and mirrored) | plain repeat shows only faint seams on these four; **mirrored repeat shows kaleidoscope symmetry** ("butterfly" shapes on the mirror axes), most visible on tundra plains and desert rough |
| `node tools/perf/load-time.mjs apps/client/dist --runs 5` | menu 217 / 442 ms (unchanged); **settled 2,654 ms local / 3,027 ms web (was 1,456 / 1,860)**: decoding and uploading seven 1024² textures with mipmaps on the software renderer. "First scene" now reads 24 ms local / 1,932 ms web because the map is built behind the full-screen briefing before Begin; the measure no longer isolates scene building |

**Limitations.** Software renderer only (SwiftShader); not on a real GPU, not in
the desktop app, not on Windows. With mirrored repeat a second, mirrored sun can
come into view when panning far along the north edge. Sides of the hex tiles keep
their flat colours. Forest and mountain tiles keep the 3D trees and peaks on top
of the painted floor/rock, as the brief asks.

## Owner requests of 2026-10-02, afternoon (specialties, gods, map sites, neutrals) and the story art

Two rounds delivered together: the owner's gameplay request (hero specialties,
the last 24 gods, new map sites, neutral reactions; `DESIGN_PROPOSALS.md` §24–28)
and the **story art** (92 pictures from the owner's art project). All values are
**proposed, unplaytested**. The Three Beacons keeps its documented rules.
**Not in the 0.5.0 installer**; a rebuilt installer is needed to see either
round in the installed game.

### What changed

* **Hero specialties** — all 62 heroes (41 creature, 12 spell, 9 resource),
  shown in the tavern (Heroes' Lodge) before hiring, on the hero screen and in
  the Encyclopedia; scenario feature `heroSpecialties` (skirmish, random maps,
  The Winter Oath, the four arc campaigns). New effects: `creature_stat` may
  name a family; `spell_power_bonus`. Spell specialists start knowing their
  spell (also when hired or freed). The AI orders the tavern by specialty value.
* **Gods** — the 24 undesigned gods now have blessings (two per pantheon join
  the first choice, two the second); new effects `mana_regen`, `wounded_fury`.
  60 gods: 6 patrons, 24 first-choice, 30 second-choice; none undesigned. The
  campaigns' god lists are unchanged, so the new gods appear in skirmish and
  random maps. GPT brief for all 60 portraits:
  `assets-source/art/briefs/GPT6_BRIEF_4_GOD_PORTRAITS.md`.
* **Map sites** — nine new site kinds (learning stone, spell shrine, skill
  trainer, quest hut, key tent, key gate, windmill, treasure chest, prison),
  new commands `OpenChest` and `CompleteQuestHut`, events and sounds, tile-panel
  details, chest and quest-hut dialogs, Encyclopedia "Map sites" and "Neutral
  creatures" panels, marker IDs (`icon.marker.learning-stone` …, the nearest
  existing marker until delivered). Random maps `pr-skirmishgen-0.4` place them
  for every empire alike; new check SKM-7. Tavern lists skip imprisoned heroes.
* **Neutral reactions** — much weaker neutral guards and wandering bands offer
  to join for free (≥ 3× strength, all stacks fit) or flee (≥ 2×); the encounter
  dialog offers Accept them / Let them go / Fight anyway. No experience; reward
  and bounty kept; `clearedBy` recorded for quest huts. Feature
  `neutralReactions` (skirmish and random maps only). The AI uses it.
* **Path-finding speed-up** (needed by the 3-empire AI test): site index cached
  per sites object, hero occupancy built once per search, a binary heap in
  `findHeroPath`. Same routes; the 3-empire all-AI test went from 215 s to 17 s
  with the identical result.
* **Story art** (`ASSET_PIPELINE.md` §13): copied into `assets-source/art/final/`
  (92 of 92 SHA-256 match the delivery manifest), imported by the new
  `npm run art:import` into 138 runtime WebP files (33.4 MB) without upscaling;
  busts beside the dialogue box (mirrored on the right), campaign covers behind
  campaign selection and its setup steps with 640 × 360 cards, a new
  full-screen briefing scene on the mission picture, mission and skirmish
  cards, and the chosen ending behind the campaign epilogue. The skirmish and
  random-map herald now has its own portrait ID (`story.herald.portrait`)
  instead of the leader's.
* Smaller: modal footers wrap on narrow windows; "+1 hex" (not "hexes") in
  vision blessings; the balance tool switches specialties off in its troop
  duels (whole matches keep them).

### Tests and checks actually run

| Command | Result |
|---|---|
| SHA-256 of the 92 copies (on the owner's computer and here) vs the delivery's `delivery-manifest.json` | 92 / 92 match; destination held only `README.md`; no name conflicts |
| `npm run art:import` | 35 busts, 6 covers, 11 endings, 40 mission pictures → 138 runtime files, 33.4 MB (busts 768 × 1152 RGBA; landscapes native 1672 × 940/941; cards 640 × 360) |
| `npm run check` | pass — boundaries, type-check, **272** unit tests in 23 files. New: `packages/rules/test/mapSites.test.ts` (17: specialties scaling/spell/income/off in The Three Beacons; each new site; key gates per player; prisons and the tavern; join/flee/fight, no XP, thresholds, feature off), `packages/ui/test/storyArt.test.ts` (7: files and sizes, no paths outside `assets-runtime`, never upscaled, 35 busts ↔ speakers, 6 covers, 11 ending routes, 38 + 2 mission pictures, speaker sides) |
| `npm run build` | pass — start-up script 1,522 KB / 415 KB gzip (before this round 1,450 / 398 KB); `dist/` 83 MB of which story art 33 MB |
| `npx playwright test` (production build, Chromium + SwiftShader) | **57 tests in 26.0 min: 56 passed**; the one failure expected "Fairness checks 5/5" on the random-map screen — generator 0.4 adds SKM-7, so it now reads 6/6; the test was updated and passed on rerun. New: `mapSites.spec.ts` (4: tavern specialties, neutrals offer to join and join without a battle, treasure chest, quest hut) and `storyArt.spec.ts` (3: covers and cards + briefing art + busts and mirroring at 1600 × 900 and 1024 × 640; the Three Beacons ending behind its epilogue, reached from a save on the last beacon, at both sizes; every `<img>` decoded). After the last CSS changes the 7 new tests were rerun: 7 / 7 |
| `npm run balance` (all suites, 2 workers) | 537 jobs in 9.9 min (`balance-reports/balance-2026-10-02T14-34-52.md`). **Twin Harbors: 216 matches, mean decisive day 14.9 (20.0 before), west 0.54, first mover 0.68 (0.42 before)**; pantheon averages 0.37 (Greek) – 0.60 (Norse). Random maps: 2 empires 0.50 / 0.50 (18 matches, mean day 20.3); 3 empires 0.56 / 0.39 / 0.06 (18 matches; noisy, earlier runs 0.41 / 0.41 / 0.18). Army, escort and tier duels unchanged from the last report (they play troops only; specialties are off in duels) — see the attribution runs below |
| `node tools/perf/load-time.mjs apps/client/dist --runs 5` | menu **221 ms** local / **446 ms** web (before 211 / 431); first scene 1,311 / 1,255 ms (single 5-run medians on the software renderer) |
| `npm run icons:catalog` | 786 entries (+8 map markers, +`story.herald.portrait`); mission and campaign cards now count as delivered art |
| Random-map probe (990 maps: every size, type, 2–4 empires) | all valid (SKM-1…7); key pockets on 818 (83 %) |

### Neutral reactions and turn order (attribution runs, Twin Harbors skirmish suite only, 216 matches each; the source was restored after each run)

| Variant | Mean decisive day | West | First mover |
|---|---|---|---|
| Shipped: flee at 2×, join free at 3× | 14.9 | 0.54 | **0.68** |
| Reactions off (specialties on) | 20.0 | 0.55 | 0.45 |
| Flee at 3×, join at 4× | 19.9 | 0.55 | 0.46 |
| Flee at 2×, never join | 19.6 | 0.51 | 0.48 |

Free joiners are what shortens the game — and on this small two-town map
they give the empire that moves first each day a clear edge (0.68): its leader
collects the free troops on the way first. Specialties alone leave turn order
as it was (0.45). This is the owner's chosen rule; options are in
`DESIGN_PROPOSALS.md` group 0.7, question 3.

### Story art — measured notes and per-image adjustments

* **Resolution:** the 57 landscapes are native 1672 × 940/941, not the brief's
  1920 × 1080 / 2560 × 1440. Shown at their native size; on screens wider than
  1672 px they are scaled up by the browser (soft, not sharpened). The owner's
  resize-only export decision is still open.
* **Framing on screen:** pictures fill the window (`cover`). At 16:9 nothing is
  cut; at 16:10 about 5 % of each side; at 4:3 about 12.5 % of each side.
  Endings with their characters at the left edge would lose part of a figure at
  4:3: The Three Beacons epilogue (Ione), New Fire "old sun" (Xoco), Lantern
  Road "lanterns lit" (Akane) and Winter Oath "sword broken" (Hervor). A
  per-image focal point (`object-position`) would fix it; not added, since no
  4:3 layout is supported today.
* **Busts:** clean transparent cut-outs (checked on a contact sheet). Five reach
  the top edge in the painting itself (Dubhghall's antlers, Itztli's headdress,
  the Grey Jarl's crown, Hrafn's axe, Svanhild's helmet wing), so their tops are
  flat; many cloaks touch the side edges, which shows as a straight vertical
  edge where the bust stands beside the box. Only a repaint or outpaint fixes
  either; the game does not crop busts.
* **Dialogue over paintings:** in the briefing scene and the epilogue the bust
  keeps to the dialogue band (30 % / 26 % of the window height) and stands beside
  the box only on windows at least 1,500 px wide; narrower windows show it in a
  2:3 slot inside the box. The story window (no painting behind) keeps the tall
  bust.

### Limitations

* Headless Chromium (SwiftShader) only; not in the desktop app, not on Windows.
* Balance of specialties, the new gods, sites and reactions is AI-vs-AI only.
  The faster AI middle game shortened the idle-player Twin Harbors tests (the
  rival reaches an undefended Westharbor on day 6, was day 11–12); two tests now
  garrison Westharbor.
* Not committed.

## Functional icons delivered 2026-10-02 (172: interface, spells, artifacts, skills)

> **Obsolete in part (2026-10-03):** the mentions of the deleted 3D layer in this dated section (Babylon.js, GLB/glTF models, the calibration model, meshes, 3D scenes) are history only; the 2D migration replaced them (see "2D presentation migration" above). Measurements were taken on that build.

An art integration, not a redesign: layouts, labels, tooltips and
accessibility are unchanged. **Not in the 0.5.0 installer** (built before the
icons); a rebuilt installer is needed to see them in the installed game.

* **Copied, not moved:** the 172 PNGs (`<asset ID>.png`, 1254 × 1254 RGBA, 247 MB)
  from the owner's handoff folder
  `blannder_models\icon_delivery_2026-10-02\assets-source\icons\final\` into
  `assets-source/icons/final/` (merged; the folder held only `.gitkeep`; no ID
  conflicts). All 172 SHA-256 match the handoff's `delivery-manifest.json`. The
  originals were not touched; nothing links to or loads from the Blender
  workspace. No separate `masters/` copy was made: `final/` already keeps the
  unmodified masters (the importer only reads them).
* **Imported** with `npm run icons:import` — "imported 172 final icon(s); 172
  registered": 54 spell + 79 artifact icons at 128 px, 22 interface + 17 skill
  icons at 96 px, RGBA, 3.73 MB in `assets-runtime/ui/icons/final/`, registered
  in the game's own `assets-runtime/ui/final-manifest.json` (empty before; the
  handoff's manifest was not used). `npm run icons:catalog` regenerated
  `ICON_CATALOG.md`/`.xlsx`/`.csv`: 777 entries, **221** still without their own
  art (393 before).
* **Where each icon now shows** (existing components where they already existed):
  spells — spellbook, Encyclopedia, adventure cast buttons, the battle spell
  choice (shown when two or more spells can be cast); artifacts — paper doll,
  backpack, item cards, Encyclopedia, Artifact Merchant, battle-result loot,
  encounter reward preview; skills — hero skill slots, level-up offers,
  Encyclopedia; interface — every place the game draws that glyph
  (`iconArt` → `icon.ui.<name>`; explicit `glyph` uses keep the SVG). The menu's
  own owner icons (Campaign etc.) are unchanged.

Code changes: `SkillIcon` added beside `SpellIcon`/`ArtifactIcon`
(`components/art.tsx`; generic star glyph when a skill has no file); icons added
to `LevelUp.tsx`, `Encyclopedia.tsx` (skills), `Town.tsx` (merchant),
`BattleResult.tsx` (loot), `Overlays.tsx` (encounter reward chips), `Battle.tsx`
(spell choice) and `Adventure.tsx` (cast buttons; the eye/spell glyph is
replaced by the spell's icon). `.spell-socket img` now shows the art at 80 %
without the circular clip — 29 delivered spell silhouettes reach past the
inscribed circle (up to 1.20 × its radius), so 86 % with `border-radius: 50%`
cut their tips; the socket keeps its round frame. `.skill-socket` styles added.
The catalog tool now counts glyphs chosen in expressions and the ability-badge
stand-ins (`ABILITY_GLYPH`, now exported from `components/badges.tsx`), and
reads interface art under `icon.ui.<name>`.

**Reserved icons.** The handoff lists `bow`, `upgrade` and `check` as "not
shown on any screen yet" — copied from the old catalog, which missed three
existing uses: `bow` and `upgrade` are the stand-in glyphs of the Shooter and
Shapeshift ability badges, `check` marks completed objectives (adventure panel,
journal). They are registered and now show there; no button or feature was
added. The corrected catalog lists these uses.

### Tests and checks actually run (icons)

| Command | Result |
|---|---|
| SHA-256 of the 172 copies vs `delivery-manifest.json` (on the owner's computer and here) | 172 / 172 match |
| Delivery `icon-placement.csv` vs the game's catalog and manifest | 172 rows: names, runtime URLs and target sizes all agree. `shown_on` differs for spells and artifacts because the game lists the screens that really show them (no town spell-library list or map-event loot icons exist) |
| `npm run check` | pass — boundaries, type-check, **248** unit tests (new: every final-manifest entry is a catalog ID with a bundled RGBA PNG of its section size, and every delivered source file is registered) |
| `npm run build` | pass — start-up script 1,450 KB / 398 KB gzip (+36 / +3.4 KB: the manifest with 172 provenance lines is part of the start-up catalog) |
| `node tools/perf/load-time.mjs apps/client/dist --runs 5` | menu **211 ms** local / **431 ms** web (before: 209 / 434 — no measurable change); first scene 1,542 ms local, 1,247 ms web (noisy single 5-run medians on the software renderer; before 1,495 / 1,281) |
| HTTP fetch of all 172 manifest URLs from `npm run preview` | 172 × 200, all PNG |
| Contact sheets of the runtime files at 24 / 48 / 64 px on dark and light | viewed: clean alpha edges, no halos; interface icons readable at 24 px |
| Playwright inspection of the production build (temporary script, not kept): main menu, Encyclopedia (spells/skills/artifacts, creature viewer), adventure map with cast buttons, hero screen (doll, backpack, skills), spellbook, town, Artifact Merchant, encounter dialog with artifact reward, battle with spell choice, battle result with loot, level-up | pass; **167** distinct final icons requested (all 150 spell/skill/artifact icons on the Encyclopedia page; 17 interface icons), 0 non-200 responses, 0 failed requests, 0 console errors; every final-icon `<img>` decoded. Screenshots reviewed: no cropped spell sockets (image 0.75 of socket, no clip), rarity frames and set badges intact |
| `npx playwright test` on the specs that cover the changed screens: `menu`, `heroscreen`, `services`, `round3`, `journey`, `features`, `heroes` | **31 of 31 passed** (12.4 min). The full suite (50 tests) was not rerun |
| Old art | the 111 other files in `assets-runtime/ui/` are byte-identical to the owner's copy; `manifest.json` unchanged |

### Limitations (icons)

* Inspected in headless Chromium (SwiftShader) only — not in the desktop app,
  not on Windows, not on a real GPU. Headless screenshots drop dialogs drawn
  over the WebGL map, so the spellbook and encounter dialogs were captured with
  the canvas hidden (a capture workaround; the same happened before this change).
* Five interface icons were not seen during the inspection (`beacon`,
  `check`, `growth`, `lock`, `save`); they resolve through the same path.
* Not every listed surface exists: the town Library shows its tier only (no
  spell list), and map events name their loot in text — no icons were added
  there, since that would be new UI.
* The battle spell choice appears only when two or more spells can be cast (as
  before); the single Spell button keeps its glyph. Encounter reward chips show
  the artifact at 20 px — small but legible.
* Not committed.

## Owner requests of 2026-10-02 (AI, hero screen, random maps 0.3, four campaigns, three fixes)

> **Obsolete in part (2026-10-03):** the mentions of the deleted 3D layer in this dated section (Babylon.js, GLB/glTF models, the calibration model, meshes, 3D scenes) are history only; the 2D migration replaced them (see "2D presentation migration" above). Measurements were taken on that build.

Designs and values: `DESIGN_PROPOSALS.md` §19–23 and
`CAMPAIGNS_3_TO_6_OUTLINE.md`. Owner answers: about **8 hexes a day**;
**maximum range + half damage in the far half**; **seven missions** per
campaign; **a neutral roster mixed with pantheon creatures**. Everything else
is **proposed, unplaytested**.

* **The last attack is shown** — the battle screen keeps the board when the
  rules end the battle, plays the final blow and the fall of the last stack,
  then opens the result (700 ms at normal speed, none at instant speed).
* **Shooting range per creature** — `range` (hexes) on all 22 shooters
  (content validator 2–20): no shot beyond it, half damage in its far half
  (replaces the old rule: half damage beyond 10 hexes, no limit). Proposed
  ranges: most shooters 16/17, Greek Temple Adepts and Cyclopes 18/19, Eagle
  Warriors 14/15, **short range** Banshees and Hill Slingers 9/10 (the field
  is 15 × 11). A first set of 6–11 was measured and rejected (below). Shown
  on the creature card, beside the active stack in battle and in an "Out of
  range: N hexes away" refusal. The tactical AI holds a shooter with nothing
  in range while enemy troops approach (unless it is under fire), and
  otherwise steps only as far as it must to bring an enemy into range.
* **Hero movement** is the rules-profile table `movementBySlowestSpeed`
  (it already was a property): now 750–1,000 points, about 7.5–10 plains
  hexes a day (was 1,500–2,000). Fleet Foot, Wings of Hermes and the
  "directions" event were halved with it.
* **Random maps 0.3** — eight **neutral families** (Brigands, Hill Slingers,
  Wild Boars, Clay Golems, Wyverns, Ogres, Basilisks, Elder Drakes; with the
  Centaurs 18 creatures) drawn half and half with pantheon creatures for
  guards, camps and wandering monsters, and a **Neutral** filter in the
  bestiary; **two-way portals** (setting, on by default; the existing
  `icon.marker.portal`), paired by the map's symmetry so every empire gets the
  same; **roads to the centre** with full roads; **rotating turn order**
  (setting, the default with three or four empires: the day's first empire
  moves last the next day).
* **Three-empire fairness** — re-measured on 30 different maps instead of
  five maps six times: the "second seat" lead was a sampling artifact; the
  weak seat is the one that moves first. Rotating turn order spreads that
  but does not remove it (table below).
* **Rule change (proposed)**: defeated heroes return to the tavern pool as
  new recruits (long games stalled when an empire's pool ran dry).
* **AI** (`packages/ai/src/growth.ts`) — level-up choices by value to that
  hero and army; artifacts valued as a whole loadout with set bonuses (equip,
  swap, buy at the merchant by gain per Gold); adventure spells (movement,
  scouting, Recall). Map fixes found on the way: reinforcing from any owned
  town, approaching an unseen rival town only with enough strength, the last
  town valued higher, portals used as shortcuts, and equally scored moves no
  longer broken by coordinate order (the west and east empires used to prefer
  different directions on a mirrored map).
* **Hero screen** — drag and drop between the backpack and the doll; a
  comparison of a picked item with what each slot wears (attributes and set
  bonuses gained or lost); **set badges** and **ability badges** (army slots,
  creature details, Encyclopedia) that show `icon.set.<id>` /
  `icon.ability.<id>` as soon as they are delivered and a temporary stand-in
  until then.
* **Four campaigns, seven missions each** — *The Twelfth Hour* (Egyptian),
  *The Lantern Road* (Japanese), *The Silver Branch* (Celtic), *The New Fire*
  (Mesoamerican): 28 missions built on the Winter Oath's mission shapes
  (`packages/content/src/campaign/arc.ts`), four new campaign heroes, twenty
  enemy heroes, story scenes, two endings each, a pantheon artifact set
  collected along the way; four presentation biomes (`desert`, `jungle`,
  `autumn`, `moor`).
* **Icon catalog** regenerated: 777 entries (was 695), 393 still without art of their own; set and ability sections now describe the badges.

### Tests and checks actually run (2026-10-02)

| Command | Result |
|---|---|
| `npm run check` | **pass — 246 tests** (21 files; rerun after the final values). New: `packages/ai/test/ai.test.ts` +1 (a shooter with nothing in range holds while enemy troops approach and otherwise steps only into range); `packages/ai/test/growth.test.ts` (6: Archery/Offense by army, Wisdom only with a spellbook, a set piece over a slightly stronger loose item, a swap that completes a set bonus, a movement spell with a battle reserve, Recall to a threatened town); `packages/campaign/test/arcCampaigns.test.ts` (16: per campaign data and order rules, every map generates and validates, both endings, and a **headless journey through all seven missions with carryover**, every battle fought by the tactical AI on both sides); `random.test.ts` +6 (portal pairs the same for every empire, roads to the centre, the neutral mix, a portal step and a blocked twin, rotating turn order on and off); `battle.test.ts` +1 (every shooter has a range; no shot beyond it, half damage in its far half — with the short-range Hill Slingers). The existing all-AI three-empire match test now ends with a single winner again after the defeated-hero and AI fixes (it had stalled to its day limit during this round) |
| `npm run build` | pass — start-up script **1,413.92 KB (394.18 KB gzip)**; previous round 1,210 / 340. The four campaigns' text and the neutral roster are part of the start-up catalog |
| `npx playwright test` (Chromium + SwiftShader, production build) | **50 tests, two full runs.** First run 49/50 (first range set): the calibration-model battle timed out waiting for the result (150 s) — its Peltasts had to walk into range, so the auto-battle played more moves, and the run shared the CPU with balance measurements; the test's limit is now 270 s. Final build: 49/50 in 35.9 min; the one failure was the Egyptian escort count written into `pantheons.spec.ts` (20 → 21, changed this round), passed on rerun. New `tests/e2e/round3.spec.ts` (7): the last blow is shown (the board stays up after the rules end the battle), random map with portals on by default and neutral guards, the Neutral bestiary, all four new campaigns from New Game to their first map; `heroscreen.spec.ts` +1: drag and drop, comparison, set badges |
| `node tools/perf/load-time.mjs apps/client/dist --runs 5` | menu **209 ms** local / **434 ms** web (previous round 180 / 378); first scene 1,495 ms local, 1,281 ms web (single 5-run medians on the noisy software renderer; previous round 1,199 / 1,689). The larger start-up script costs roughly 30–55 ms on the menu |
| `npm run desktop:build` + `xvfb-run -a node tools/desktop-smoke.mjs` | **pass** (development layout: saves, records, unit GLB, the six hero GLBs, audio running). The packaged-layout smoke (`PR_SMOKE_EXE`) was **not** run |
| `npm run icons:catalog` | pass — 777 entries, 60 glyph thumbnails rendered |
| `node tools/balance/run.mjs random` (30 matches per empire count, a different generated map per match; four runs) | see the fairness table below |
| `node tools/balance/run.mjs armies starts tiers skirmish` (several runs; see below) | final: Twin Harbors 216 matches, **west 0.52, first mover 0.42**, pantheon averages 0.40–0.60; full-roster armies 0.35–0.64 except Celtic upgraded 0.68 (as in 0.4.0); starting escorts 0.42–0.57 |

**Shooting ranges, measured before they were chosen** (AI-vs-AI, 12 duels per
direction and pairing; pantheon averages, 0.50 = even):

| Ranges | Greek armies | Egyptian armies | Norse armies | Starting escorts |
|---|---|---|---|---|
| Old rule (no limit, half damage beyond 10) on this round's code | 0.38–0.47 | 0.41–0.52 | 0.44–0.56 | 0.42–0.59 |
| First set, 6–11 (full damage only up to 3–5 hexes) | **0.31–0.33** | 0.32–0.37 | 0.59–0.69 | Greek 0.30, **Egyptian 0.18**, Norse 0.72 |
| 9–15 + AI holds shooters out of range | 0.27–0.38 | 0.35–0.52 | 0.49–0.66 | Greek 0.29, Egyptian 0.32, Norse 0.68 |
| **Shipped**: 16–19 (short 9/10, Eagle Warriors 14/15), Egyptian escort 21 + 8 | 0.35–0.44 | 0.37–0.51 | 0.39–0.63 | 0.42–0.57 |

Why: with full damage only in the near half of the range, every hex of range
counts twice; shooter-heavy rosters (Greek three shooters, Egyptian two) lost
most. Single-stack duels still show the short-range Banshee at 0.01 (base).

**Twin Harbors turn order.** The slower map (8 hexes a day) moved the
first-mover score from 0.43 (the same code with the old 1,500–2,000 movement)
to **0.34**: the empire that moves first walks into the middle on day 3 and
is caught by a hero it cannot see (vision 5, reach 8). Fixing the AI's
tie-breaks (equal moves were ordered by coordinates), measured together with
the final ranges, brought it back to **0.42** with the west score at 0.52.
Measured but **not shipped**: hero vision 8 instead of 5 gives first mover
0.47 but west 0.56 (a rules change; an open question for the owner). 0.4.0 measured 0.52; the remaining gap is not yet
explained.

**Three-empire fairness** (small random maps, every seat the same pantheon,
all AI, day cap 40; undecided matches scored on army strength):

| Measurement | Matches | Decided | Seat scores 1, 2, 3 (even 0.33) | First knocked out (seat 1, 2, 3) |
|---|---|---|---|---|
| 0.4.0 (generator 0.2, five maps × six) | 30 | 6 | 0.23, **0.60**, 0.17 | — |
| This round before rotation, five maps × six | 30 | — | 0.29, **0.49**, 0.22 | — |
| This round before rotation, 30 different maps | 30 | 18 | **0.21**, 0.38, 0.41 | 13, 11, 6 |
| With rotating turn order, 30 different maps | 30 | 15 (5, 5, 5 by seat) | 0.32, 0.29, 0.39 | 6, 10, 12 |
| **Final code** (rotating, AI tie-break fix, final ranges), 30 different maps | 30 | 18 (6, 10, 2 by seat) | 0.41, 0.41, **0.18** | 5, 11, **12** |

Two empires on 30 different maps: 0.48, 0.52 before and **0.47, 0.53** with
the final code (24 decided, mean decisive day 20.4). The old "second seat
wins" result came mostly from playing only five maps: on thirty different maps
seat 2 was not ahead, and the empire that moves first each day was knocked out
first most often (it moves into the others' reach before they move).
**Rotating turn order** spreads that disadvantage but does **not** remove it:
in both rotating runs the empire that moves first on day 3 (seat 3) was the one
knocked out first most often (12 of 28 each time). The final seat scores
disagree between the two runs (seat 3 best in one, worst in the other); with
30 matches one seat's score has a sampling error of about ±0.09, so neither
run shows the seats even or uneven with confidence. Next steps: more matches
per run, and an AI that keeps the day's first mover out of unseen reach (see
Twin Harbors above). Many three-empire matches still reach the day-40 cap
(mean decisive day 26–28).

### Limitations (2026-10-02)

1. **All values are proposals** — ranges, movement, the neutral roster, the
   portals and every campaign's guards, wallets and costs were checked by unit
   tests and AI-vs-AI runs only. The headless journeys follow a direct route,
   so they say the missions are winnable, not that they are well paced.
2. The four campaigns reuse the Winter Oath's mission shapes and economy
   closely; each has its own story, enemies, rewards and biome, not its own
   mechanics. Celtic Mission 5 is the costliest step of the four journeys.
3. With about 8 hexes a day, maps feel larger and AI-vs-AI games run longer
   (Twin Harbors: mean decisive day 20 instead of 9–10); random-map sizes
   were not reduced.
4. **Turn-order fairness is not settled**: Twin Harbors first mover 0.42
   (0.4.0: 0.52); with three empires the day-3 first mover is knocked out
   first most often even with rotating turn order. Ranges keep the pantheons
   inside 0.35–0.65 except Celtic upgraded armies (0.68, as before), but the
   longest ranges rarely stop a shot on the 15-column field.
5. New characters (4 heroes, 20 enemy heroes), the neutral creatures, the
   badges and the portal model use **placeholders** (generated portraits,
   proxy models, gem/glyph stand-ins). The campaigns reuse the three existing
   soundscapes.
6. The start-up script grew by about 200 KB (54 KB gzip) with the campaign
   text; the catalog is not split by campaign yet.
7. Not committed or pushed when written; the owner has since committed it, and the 0.5.0 installer (above) contains it.

## Owner requests of 2026-10-01 (icons, second campaign, M02 order, random maps, hero screen, spells and artifacts)

> **Obsolete in part (2026-10-03):** the mentions of the deleted 3D layer in this dated section (Babylon.js, GLB/glTF models, the calibration model, meshes, 3D scenes) are history only; the 2D migration replaced them (see "2D presentation migration" above). Measurements were taken on that build.

Designs and values: `DESIGN_PROPOSALS.md` §13–18 and
`CAMPAIGN_2_NORSE_OUTLINE.md`. Owner answers: Norse — *The Winter Oath*; M02
blocked on the map **and** early completion (every campaign); Heroes-3-style
slots (content version bump, old saves refused); about 30 spells and 45
artifacts. Everything else is **proposed, unplaytested**.

* **Icon catalog** — `ICON_CATALOG.md` (repo root) and
  `assets-source/icons/ICON_CATALOG.xlsx` / `icon_catalog.csv`: 695 entries in
  12 sections (interface icons, map markers, spells, artifacts, sets, skills,
  interventions, abilities, effect art, portraits, creatures, emblems /
  buildings / thumbnails) with asset ID, screens, what is shown today
  (thumbnail in the spreadsheet), a drawing brief, details and lore; 345 have
  no art of their own yet. Generated from the game by `npm run icons:catalog`
  (development tool in `tools/assets/icon-catalog/`). New drop-in path for
  final art: PNGs named by asset ID in `assets-source/icons/final/` +
  `npm run icons:import` → `assets-runtime/ui/final-manifest.json` (takes
  precedence over every placeholder; interface glyphs pick up `icon.ui.<name>`).
* **The Winter Oath** — seven Norse missions with Hervor, carryover, story
  scenes, two endings; new generic data: objective conditions `hero_defeated`
  and `town_owned`, minor-god `count`, starting garrisons, epilogue variants,
  winter biomes `tundra` / `fjord` (frosted map colours; `fjord` has a water
  edge). Five Norse enemy heroes. Mission 5 seats a full AI rival empire.
* **Three Beacons M02 in order** — `requires` on objectives + early
  completion; journal "Opens after" and "Done early".
* **Random maps 0.2** — six map types, zones, guarded passes and gates, huge
  size, guard / treasure / wealth / road / revealed-map settings, SKM-6; AI fix
  (garrison counted when judging a threatened town).
* **Hero screen** in the Heroes-3 layout with the 3D mounted model, a 19-slot
  paper doll and backpack, and a spellbook dialog.
* **Spells and artifacts** — 30 new spells (54), 54 new artifacts (79), 6 new
  sets (10), four new spell effects and the `enemy_army` target, town spell
  libraries with a per-match draw; lore on every spell and artifact.

### Tests and checks actually run (this round)

| Command | Result |
|---|---|
| `npm run check` | **pass — 216 tests** (19 files). New: `packages/campaign/test/winterOath.test.ts` (6: data and order rules, both epilogues, an early-completed step, M5 rival set-up, M7 played directly to "sword returned", and one headless journey through **all seven missions with carryover** to "sword broken", every battle fought by the tactical AI on both sides); `random.test.ts` +10 (every map type fair and valid for 2/3/4 empires, SKM-6, guard/treasure/wealth scaling, sparse roads, revealed map, huge maps deterministic); M02 order tests in `threeBeacons.test.ts`. Two older tests adjusted: the Norse hero list now includes the campaign's enemy heroes; the camp-restock test keeps its passive player safe from the AI rival for the week (with the new maps the AI took the idle player's town by day 7) |
| Journey numbers (headless, auto-combat) | missions end on days 1–4 of a direct scripted route; Hervor reaches level 9; she wears all four Arms of the Einherjar at the final battle; losses are moderate (the final stretch to the Grey Jarl costs her all 18 Fenrir Wolves and 8 Ancient Frost Trolls) |
| AI-vs-AI game length, 2 empires, small, 12 seeds each (old 0.1 generator from the owner's copy vs 0.2) | days to a winner: 0.1 — median 9 (3–21); 0.2 continental — median 12.5 (3–40). Per map type (6 seeds): highlands 2–17, lake isle 3–30, wild forest 4–28, marshlands 7–25, crossroads 3–8 and **one stall to the day cap** (seed 43: both empires keep losing their heroes and piling troops into garrisons) |
| `npm run icons:catalog` / `npm run icons:import` | catalog written (695 entries); import checked with a test icon (resized to 128 px, registered, then removed again) |
| `npm run build` | pass — start-up script 1,210 KB (340 KB gzip; before this round 1,063 / 300): the new content (spells, artifacts, lore, the campaign text) is part of the start-up catalog |
| `npx playwright test` (Chromium + SwiftShader, production build) | **42 of 42 passed** (20.1 min). New `tests/e2e/heroscreen.spec.ts` (2): hero screen — doll slots, equip from the backpack into the weapon and both ring slots, a helm refused by the feet slot, unequip from the artifact card, the spellbook lists Rune of Tyr, the 3D figure reaches `ready`, no console errors; The Winter Oath from New Game → briefing → Kaldvik (Odin, Hervor, fjord biome) |
| Visual check (screenshots) | Winter Oath M1 and M5 maps in the frosted palette; the icon spreadsheet's thumbnails (rendered to PDF) |
| `node tools/perf/load-time.mjs apps/client/dist --runs 5` | menu **180 ms** local / **378 ms** web (mounted-hero build: 157–166 / ~330 ms); first scene 1,199 ms local, 1,689 ms web (single 5-run medians on the noisy software renderer; the mounted-hero build measured 1,397–1,461 ms local). The larger start-up script costs roughly 15–50 ms on the menu |
| `npm run desktop:build` + `xvfb-run -a node tools/desktop-smoke.mjs` | **pass** (development layout: saves, records, unit GLB, the six hero GLBs, audio running). The packaged-layout smoke (`PR_SMOKE_EXE`) was **not** run this round |

### Limitations (this round)

1. **All values are proposals**: the campaign's guards, wallets and costs, the
   new spells and artifacts and the random-map settings were tested by unit
   tests and AI-vs-AI runs only. The headless journey follows a direct route,
   so it says the missions are winnable, not that they are well paced.
2. The **AI rival in M5** strips Hvitstrand's garrison into Ulfhild's field
   army (existing AI behaviour); the journey took the town on day 4 while she
   was near Ravnholt.
3. **Short AI-vs-AI games** on small 2-empire maps (both generators): a leader
   lost early leaves an empty town. One crossroads stall in 30 runs.
4. New characters, the five enemy heroes, every new spell and artifact use
   placeholders (generated portraits; effect-family or kind icons). Campaign
   missions reuse the three existing soundscapes.
5. **Saves from content 0.7.0 are refused** (equipment layout changed).
6. Abilities and artifact sets have reserved icon IDs only; the screens still
   show text for them.
7. Not committed or pushed; no new installer.

## Mounted adventure-map heroes (owner request, after 0.4.1)

> **Obsolete (2026-10-03):** this whole section describes the mounted-hero GLB models and their 3D animation, deleted by the 2D migration (map avatars are 2D sprites now; see "2D presentation migration" above). Kept as history only.

The six animated mounted heroes (rider + mount, one skinned GLB per
pantheon, release `MountedHero_Animations_v1`) were **copied** from the
owner's separate Blender project (`C:\Users\lazeb\Desktop\blannder_models`)
into the game; the game has no link, import or runtime path into that
project. Details and the file table: `ASSET_PIPELINE.md` §12.

* **Copied** (byte-identical, SHA-256 checked on both computers):
  `runtime\models\heroes\animated\hero_<pantheon>.glb` →
  `assets-runtime/heroes/<pantheon>/hero_<pantheon>.glb` (six);
  `assets\characters\heroes\shared\mounted_hero_animated_rig.json` →
  `assets-runtime/heroes/shared/`. **Copied with game paths**:
  `animation_manifest.json` → `assets-runtime/heroes/animation_manifest.json`
  (`assets[].runtime`, `skeleton.contract`, `integration_guide` rewritten; a
  `game_copy` block names the source); `HERO_ANIMATION_REPORT.md` →
  `assets-source/heroes/` under a short note. The Blender sources, the
  delivery zip and the preview GIFs were not copied (editing only). The
  Blender project was only read.
* **Map heroes**: each hero entity on the adventure map shows its pantheon's
  mounted model (hero definition's pantheon, else the owner's) with its own
  skeleton and animation groups; one container node turns the model's +Z
  front to the map's +X and scales it uniformly by 0.36 (measured heights
  1.28–1.43 map units on a 1.73-unit hex); owner banner + translucent owner
  disc keep faction ownership visible; selection, picking, movement, fog
  visibility and town offsets are unchanged. Placeholder riders show until a
  model has loaded (models load once the map has drawn its first frames) and
  stay if a load fails.
* **Animation**: Idle_Standing loops while standing (random phase per hero);
  Walk loops while the map moves the entity, facing each step, with 0.2 s
  crossfades, rate = speed ÷ (0.75 × 0.36) capped at 3.5; back to idle on
  stop. Loop flags come from the manifest and are set explicitly.
* **Prepare_War before battle**: after **Attack** in the encounter dialog
  (the rules commit the move and the battle start exactly as before), the
  hero walks to the approach tile, stops, faces the opponent (a defending
  mounted hero turns to meet it), plays Prepare_War once and holds the last
  pose; the battle screen opens from the animation group's end event, once.
  If the encounter goes away meanwhile (load, Main Menu, Restart Mission)
  the completion is ignored and the hero blends back to idle. Withdraw
  cancels before anything is committed.
* **Fixed map camera**: yaw and pitch limits locked, no orbit/tilt/rotate
  input (only the wheel zoom), left/middle drag and the arrow/pan keys
  translate the target screen-relatively, clamped to the map. **Bug fixed on
  the way**: Babylon's `ArcRotateCamera.target` setter re-derived radius (and
  alpha/beta, then clamped) from the old camera position, so every drag
  changed the zoom slightly (measured 0.053 units per 220 px drag); the
  camera now keeps alpha, beta and radius when the target moves
  (`overrideCloneAlphaBetaRadius`).
* Read-only `?e2e` additions: `__prHeroes()` (per-hero model state, clip,
  rates, weights, Prepare_War counts, yaw), `__prCamera()` (alpha, beta,
  radius, target), and `battleScreenOpens` / `prepareWar` outcome counters in
  `__prInspect()`. No commands are exposed.

### Tests and checks actually run (mounted heroes)

| Command | Result |
|---|---|
| `npm run check` | **pass — 198 tests** (18 files). New `packages/presentation/test/heroes.test.ts` (6): copies and checksums match the manifest, paths stay inside the game; the three exact clips, skin and loop policy per GLB; the rate formula; all six load in a headless left-handed scene with their own skeleton, skin attributes, materials and vertex colours at one scale; instances independent; +Z front lands on +X; Walk crossfade at the matching rate, the cap, back to idle; Prepare_War not finished at 1 s, finished once after 2.6 s, holds the pose, never fires again; a cancelled gesture resolves "cancelled", ignores the end event and returns to idle |
| `node tools/assets/validate-units.mjs --no-write` | six hero GLBs pass (checksum, clips, skin, no CDN-decoder extension, Khronos validator 0 errors); the script now checks `assets-runtime/heroes` too |
| `npx playwright test` (Chromium + SwiftShader, production build) | **40 of 40 passed** twice (19.0 min; and 18.4 min on the final code, after the deferred model loading and a frame-time-tolerant wait in one test). New `tests/e2e/heroes.spec.ts` (6): six pantheons each show their own model, idling, every request same-origin and the six GLBs fetched from `/heroes/<pantheon>/`; a 4-step move plays Walk on that hero only (crossfade seen, rate 3.5 of a requested ~30.5), faces the last step, returns to idle, camera angle constant throughout; Withdraw → no battle, no gesture; Attack → Walk then Prepare_War once, attacker and defender face each other, the map stays ≥ 2.2 s until the clip ends, battle screen opened exactly once, outcome "finished"; Main Menu during the gesture → no battle screen, outcome "cancelled"; left/right/up/down drags, middle drag, right drag, arrow keys and wheel leave alpha and beta unchanged (drags keep the radius exactly), edge clamp holds |
| `npm run build` | pass — start-up script 1,063 KB (299.7 KB gzip; 0.4.1: 1,055 / 295; the manifest fields the game reads), 701 files; the GLBs are served unhashed from `heroes/` |
| `vite` dev server (`apps/client`) + a scratch browser script | Mission 1 through the menus: Alexios shows the Greek model (`ready`, `Idle_Standing`), fetched from `/heroes/greek/hero_greek.glb`; no request left the dev server |
| `npm run desktop:build` + `xvfb-run -a node tools/desktop-smoke.mjs` | **pass** (development layout) and **pass with `PR_SMOKE_EXE`** on a fresh `--linux dir` build (`app.asar` 46.4 MB, 0.4.1: 36.6 MB; contains `renderer/heroes/`, no `assets-source/`, no `.blend`). New smoke check: the six hero GLBs are served intact by the app protocol (sizes match the manifest) |
| Load time, 9 interleaved runs of the `load-time.mjs` measurement (scratch copy) on three builds: no hero models / models loaded at once / models after the first frames | first scene **local 805 / 1,397 / 1,461 ms**, web profile 1,245 / 1,835 / 1,548 ms (settled 1,245 / 1,835 / 2,092 ms). The models cost about 0.6 s of the first software-rendered scene locally: the measurement's Begin click closes the Mission 1 briefing while the hero model (1.6 MB GLB, three PBR materials) is already loading behind it, and fetching, parsing and compiling its shaders on the CPU renderer lands in those frames either way. Deferring the load helps the web profile only. Not measured on a real GPU. Menu time unchanged (157–166 ms) |
| Visual check (screenshots in the UI test and a scratch test) | six distinct mounted heroes with their materials, banners and owner discs at one scale; attacker and defender facing each other during Prepare_War |

### Limitations (mounted heroes)

1. **Walk speed**: at normal adventure speed the map moves a hero 8.25 map
   units/s; the formula asks for playback ×30.5 (×68 at "fast"), so the
   rate is capped at 3.5 and the hooves slide. Matching the clip would mean
   a much slower map pace — an owner decision.
2. **Edge scrolling** was not added (the game had none); panning is mouse
   drag (left or middle button) and the arrow / pan keys.
3. **First-scene cost** as measured above (software renderer); the battle
   screen and other scenes are unchanged.
4. **When Prepare_War plays**: Attack commits the encounter atomically in the
   rules (as before), so the gesture plays after the commitment; cancelling
   *during* the gesture means leaving that game (load, Main Menu, restart).
   Opening the pause menu during the gesture does not hold the battle: it
   opens when the clip ends and closes the overlays, as it did after movement
   playback before.
5. **Skipped gesture** (battle opens at once, as before): instant or reduced
   motion, a monster attacker, an attacker out of sight, battles with no
   human side.
6. The battlefield still has no commander model; one model per pantheon (two
   Greek heroes look alike apart from banner colour); the 0.36 scale and the
   banner/disc marks are not owner-reviewed.
7. The copied manifest keeps the Blender delivery's own record
   `validation.engine_runtime_tested: false` unchanged; the game-side results
   are the ones in this section.
8. Not committed or pushed; no new installer.

## Tests and checks actually run (0.4.1 visual update, this session)

> **Obsolete in part (2026-10-03):** the mentions of the deleted 3D layer in this dated section (Babylon.js, GLB/glTF models, the calibration model, meshes, 3D scenes) are history only; the 2D migration replaced them (see "2D presentation migration" above). Measurements were taken on that build.

| Command | Result |
|---|---|
| `python3 tools/assets/prepare_ui_art.py` | 120 UI assets (11 backgrounds, logo, emblem, frame, 9 menu icons, 96 pack icons, app icon), 6.2 MB of runtime files; contact sheet of the 96 crops checked by eye |
| `npm run check` | **pass — 192 tests** (17 files; new `packages/ui/test/uiArt.test.ts`, 4: every listed file bundled and readable PNG/WebP with provenance, backgrounds listed, frame window measured, every asset ID the UI names exists, `icon.ico` carries 16–256 px) |
| `npm run build` | pass — start-up script 1,055 KB (295 KB gzip; 0.4.0: 1,016 / 290), 693 files (UI art adds 122) |
| `npx playwright test` | **34 of 34 passed** on the redesign (12.8 min), again after the spell sockets and version change (13.1 min), and on the final build after the performance fix below (13.0 min). `menu.spec.ts` now also checks that the opening background comes from the manifest list, that every image on the main menu loaded, and that all menu entries are visible |
| `npm run desktop:build` + `xvfb-run -a node tools/desktop-smoke.mjs` | **pass** (development layout; opening screen checked in Electron: background, logo, frame, icons and Quit) and **pass with `PR_SMOKE_EXE`** on a fresh `--linux dir` build (`app.asar` 36.6 MB with `renderer/ui/`, no `assets-source/`, tools or source maps) |
| `node tools/perf/load-time.mjs apps/client/dist --runs 7` | menu **149 ms** local / **330 ms** web (0.4.0: 140 / 321); first 3D scene 743 ms local (samples 232–1,256 ms), 1,024 ms web. Same headless SwiftShader setup; the scene samples are too noisy for single medians, so 0.4.0 and 0.4.1 were also measured **interleaved** (12 + 12 local runs, a scratch copy of the tool): **741 ms vs 730 ms** median — no measurable difference locally. The web profile is slower (0.4.0: 721 ms) because the new icons and backgrounds also come over the throttled 20 Mbit/s link; the desktop game reads them from disk |
| `npx electron-builder --config electron-builder.json --win nsis --x64` (Linux + Wine) | **built** `Pantheon-Realms-Setup-0.4.1-x64.exe` (142,758,279 bytes, SHA-256 `c45a5f9cfb1fd3c384bdad8853738b553f30744bd63e6a1edd642db54162eafb`). Its `app-64.7z` payload extracts byte-identical to `win-unpacked`; `app.asar` carries version 0.4.1 and the interface art; the exe icon is the owner's emblem. Copied into the owner's `installer\` folder (ignored by git). **Not run on Windows**; unsigned |
| Performance fix found on the way | the first redesign put CSS `filter: drop-shadow` on icons and a large inset blur on every panel; over the 3D canvas the compositor re-applies filters each frame (first scene 868 vs 681 ms in an interleaved run). Removed: icon shadows are in the art, panels use a gradient vignette; a comment in `components.css` records the rule |

## Tests and checks actually run (0.4.0, earlier on 2026-10-01)

> **Obsolete in part (2026-10-03):** the mentions of the deleted 3D layer in this dated section (Babylon.js, GLB/glTF models, the calibration model, meshes, 3D scenes) are history only; the 2D migration replaced them (see "2D presentation migration" above). Measurements were taken on that build.

| Command | Result |
|---|---|
| `npm run check` (boundaries + 3 type-checks + `vitest run`, 16 files) | **pass — 188 tests passed**, 0 failed. New: `packages/rules/test/expanded.test.ts` (14: interventions incl. once-a-week and campaign refusal, pantheon interventions, town growth, camps and weekly restock, map events once, weekly events, sets, pantheon skills, Fleet Foot/Homecoming, difficulty wallets/income, statistics and score, the bridge scene once, the Athena scene) and `packages/campaign/test/random.test.ts` (14: fairness checks and validation for 2–4 empires on every size, determinism, equal distances, camps/events/monsters, relic victory condition, refusals, an all-AI 3-empire match to a winner, a relic hold win on day 4, hot-seat names/patrons) |
| `npm run build` | pass — start-up script `index-*.js` 1,016 KB (290 KB gzip; 0.3.0: 879 KB / 253 KB), 3D layer `src-*.js` 565 KB (145 KB gzip), 571 files (250 JS) |
| `node tools/perf/load-time.mjs apps/client/dist --runs 7` | menu **140 ms** local / **321 ms** web profile (0.3.0: 144 / 311); first 3D scene 663 ms local / 808 ms web (0.3.0: 734 / 817); start-up JS 1 file, 1.02 MB (0.29 MB gzip). Same headless SwiftShader setup as below; no real GPU |
| `npx playwright test` (Chromium + SwiftShader) | **34 of 34 passed** (11.4 min). New `features.spec.ts` (7): New Game has Campaign/Skirmish/Random Map and no Multiplayer or Custom Map; Twin Harbors on Hard; a two-person random map with hand-overs (Escape cannot lift them); F1 list and a rebound key; the route tip and "Got it" remembered after reload; the last rival falls → game over → summary → high-score table; End Day with tips on. `campaign.spec.ts` now reads the bridge scene through Continue and Backlog and checks the lighthouse scene; `journey.spec.ts` reads the bridge scene with Continue. Later UI edits (summary axis labels, tips only on play screens, set-bonus text, setup subtitle, Journal tips) were re-checked afterwards: `npx playwright test tests/e2e/features.spec.ts tests/e2e/menu.spec.ts` **9 of 9 passed** (2.0 min) |
| `npm run desktop:build` + `xvfb-run -a node tools/desktop-smoke.mjs` | **pass** (development layout) and **pass with `PR_SMOKE_EXE`** on the `--linux dir` build (`isPackaged` true, DevTools refused, saves written). New check: the high-score store writes `records.json` beside the preferences and nothing appears in `saves/` |
| `npx electron-builder --config electron-builder.json --win nsis --x64 --linux dir --x64` (Linux + Wine) | **built** `Pantheon-Realms-Setup-0.4.0-x64.exe` (136,194,820 bytes, SHA-256 `2018c14d98bc77640817364f64f970cdb276a0dee6cf83831902a47bee4d1640`). Its embedded `app-64.7z` payload extracts byte-identical to `win-unpacked`; `app.asar` carries version 0.4.0, content 0.7.0, the 60 sound files and no development tools or source maps. **Not run on Windows**; unsigned |
| `npm run balance -- --seeds 16 --matches 5 --jobs 2` | 705 jobs in 24.6 min (all five suites). It exposed a **balance-tool bug**: with every seat AI, the match outcome's victory/defeat is written from a human seat's point of view, so the tool counted every all-AI result as an east win (west score 0.10). The tool now reads `outcome.winnerIds`; the game itself was not affected (its UI already uses `winnerIds`) |
| Browser page (claude.ai artifact, `PR_FEW_CHUNKS=1` build) | a 0.4.0 copy was built and checked locally (276 files; campaign map renders, coast music and ambience play, no failed requests), but **not published**: publishing was not permitted in this session, so the hosted page still shows 0.3.0 |
| `npm run balance -- skirmish random --matches 5 --jobs 2` (after the fix) | 420 jobs in 18.5 min; results below. The army, escort and tier tables below come from the first run (they do not read match outcomes) |

### Start-up load time (measured on the 0.3.0 build; 0.4.0 figures are in the table above)

`node tools/perf/load-time.mjs <dist> --runs 7` (median of 7, headless
Chromium with SwiftShader software rendering, served with gzip; "web" adds
20 Mbit/s and 40 ms round trips). *Menu* = page load until the main menu
buttons respond; *first scene* = clicking Begin on the Mission 1 briefing
until the 3D map has drawn two frames.

| | Before (content 0.5.0 build) | After |
|---|---|---|
| Menu, local | 752 ms | **144 ms** |
| Menu, web profile | 1,989 ms | **311 ms** |
| Start-up scripts | 200 files, 8.26 MB (1.93 MB gzip) | **1 file, 0.88 MB (0.25 MB gzip)** |
| First 3D scene, local (after a 3 s pause on the menu) | 347 ms (353 ms) | **734 ms (733 ms) — slower** |
| First 3D scene, web profile (after a 3 s pause) | 346 ms (351 ms) | **817 ms (828 ms) — slower** |

The menu is 5–6× faster. The first 3D scene is about 0.4 s slower, and not
fixed: it stays slower when the 3D layer was already fetched during the
pause, in a build without sound, with the whole Babylon barrel inside the
on-demand chunk, and with the engine created early (all four tried and
measured; the last was reverted). A CPU profile shows the main thread idle
for most of the gap, so the time is most likely spent producing frames in
the software renderer rather than loading scripts; the cause is not
confirmed. Whether it happens on a real GPU was not
measured.

`npm run check` was not run as one command; each of its parts above was.

New tests this build (unit): every pantheon has a signature built from shared
effects and none apply in The Three Beacons; Afterlife returns floor(20%) of
each winning stack's losses and never touches XP; a pantheon without
recovery gets none; Glory's +25% XP; Fury's +2 Attack exactly at half
strength; Harmony counts families not stacks and feeds effective stats;
free Shapeshift keeps the activation once, a second change and a
non-Celtic army's change spend it, other targets are refused; offerings (rate,
cap, once per week, Temple needed, last-creature rule, non-Mesoamerican
refused); academy (XP, price, once per week, presence); Watchtower radius;
merchant stock (4 distinct priced items, deterministic, same catalog in both
towns, weekly refresh, purchase); second god choice (first commitment,
buildings, exclusivity, 25 Favor, Hermes income); growth and creature-stat
blessings; the campaign's god allowlist. AI: god commitment, offering only
when Favor is needed, training and buying with reserves, and the Pooka taking
the Hare aspect to reach an enemy.

Fixed while testing: dialogs opened inside the Town screen (Market, Tavern and
the new ones) were pulled into the page flow by a generic `.screen > *` rule
and pushed the town layout up; they are full-window overlays again.

### The west-side advantage — found and fixed

The earlier AI-vs-AI runs (west town won 11 of 13) had five causes, all fixed:

1. **Map asymmetry.** Twin Harbors v1 was not symmetric in hex distance: the
   east town was 75 movement closer to the gold mine and 200 closer to the
   crystal, the west town 200 closer to the grove. **v2 is point-symmetric**
   (every site, road and terrain cell mirrored under a 180° rotation) — path
   costs from both towns to mirrored sites were measured equal.
2. **Map scale.** On v1 a hero could reach the enemy town in one day (1,200
   movement against a 1,500–2,000 budget), so one misstep lost the game on
   day 1. v2 is wider (35 × 17): towns 2,250 apart (two days), the gold mine
   1,050 from each.
3. **AI hiring bug.** The AI read the Tavern roster from its belief state,
   where the unseen enemy leader is missing, so it tried to hire that hero,
   was refused, and stopped hiring for the turn. In Greek vs Greek the west AI
   never hired at all. The AI now gets the true roster of its own Taverns (what
   a human owner sees on the Tavern screen).
4. **AI holding bug.** A hero stayed inside its town while *any* enemy hero was
   within 8 hexes — even a 10-Hoplite raider — which also blocked its Tavern.
   It now holds only against enemies it cannot beat in the field, and hunts
   the others.
5. **Unequal leaders.** Pairings gave one side a Champion-type leader and the
   other a Strategos-type one. Every Twin Harbors leader is now Strategos-type
   (same attributes, skill and class growth).

Also new: heroes no longer end a move where a visible enemy at least as
strong can reach them next turn.

Measured afterwards (360 AI-vs-AI matches, both towns and both first movers
per pairing): **west-town score 0.52, first-mover score 0.48** (0.50 = no
advantage). A separate 120 mirror matches (same pantheon both sides): west
0.53, first mover 0.44. The per-pantheon first-mover score in mirrors swings
between seeds (Greek 0.17 in one run, 0.70 in another), so no stable
turn-order advantage was found; the human always moves first in Twin Harbors.

### Turn order and the duel outliers — found and fixed (content 0.6.0)

`npm run balance -- --seeds 16 --matches 5 --jobs 2` (645 jobs, 14.0 min; the
report file's header still says content-0.5.0 because the version label was
bumped after the run started — the values are content 0.6.0). Pantheon
average score against the other five (0.50 = even; ⚠ outside 0.35–0.65):

| Suite | Greek | Norse | Egyptian | Japanese | Celtic | Mesoamerican |
|---|---|---|---|---|---|---|
| Skirmish (360 whole matches) | 0.51 | 0.42 | 0.59 | 0.48 | 0.55 | 0.45 |
| Armies, 1 week, base | 0.40 | 0.54 | 0.54 | 0.47 | 0.60 | 0.44 |
| Armies, 1 week, upgraded | 0.36 | 0.44 | 0.54 | 0.50 | 0.68 ⚠ | 0.49 |
| Armies, 2 weeks, base | 0.44 | 0.55 | 0.50 | 0.49 | 0.49 | 0.53 |
| Armies, 2 weeks, upgraded | 0.38 | 0.44 | 0.40 | 0.53 | 0.68 ⚠ | 0.57 |
| Starting escorts | 0.48 | 0.55 | 0.46 | 0.43 | 0.59 | 0.49 |

Skirmish: 291 of 360 decided by elimination (mean day 9.0), 69 scored at the
day-40 cap (content 0.5.0: 322 and 38 — the more careful AI draws more).
Fairness checks: **first-mover score 0.52** (was 0.41), **west-town score
0.47** (was 0.56).

**Why the second mover won.** Instrumented mirror matches (same pantheon on
both sides, 60 matches) showed the first empire-vs-empire blow landing on day
2, struck by the second mover, in 26 of 32 matches. Whoever moves first each
day advances into the unseen middle first; its heroes are then seen and
caught by armies they never saw, or that came into view during their own
move. Of 189 hero-vs-hero strikes on days 1–12, 113 hit a hero whose owner
could already see the striker at the end of its turn, and 97 of those heroes
had moved that turn. Three AI rules fixed it (all from public knowledge; the
AI still never reads hidden state):

1. **Retreat.** A hero standing within reach of a visible, stronger enemy
   steps back out of reach (into its own town if it can arrive today) while
   it has movement left; the "return home" move no longer stops short in
   danger. First-mover score 0.41 → 0.47.
2. **Fog caution for secondary heroes.** A hero below 60% of its empire's
   strongest hero ends its moves on its own half of the map or within 3
   hexes of that hero. First-mover score → 0.53 (then 0.52 with 3.).
3. **No lone advance (tactical AI).** Found while chasing the Egyptian
   outlier (below): a stack that cannot strike this activation pays 2 cells
   of progress for every enemy melee stack that could reach its cell next
   beyond the allies standing beside it. A blanket "wait instead of
   advancing" rule was tried and rejected: it moved Greek duels to 0.17–0.24
   and Celtic to 0.74–0.85. A penalty of 3 cells left Greek upgraded armies
   at 0.25; 2 cells is kept.

**Japanese Harmony (0.72–0.75 in upgraded full-roster duels).** Cut to one
step: 3 or more families give every stack +1 Defense (the +1 Attack at 5
families is gone). Japanese scores are now 0.47–0.53 in the four army
tables (0.43 with starting escorts) and 0.48 in skirmish. (Last session a
Defense-only test gave 0.51–0.69 and a 0.40 skirmish score, so +1/+1 was
kept then; the AI fixes changed that picture.)

**Egyptian two-week armies (0.27–0.33)** were not an Egyptian values problem.
Swapping one tier at a time for the Greek unit (12 seeds per direction)
raised two-week base armies from 0.17 to 0.83 against Norse only when the T6
Bennu was swapped; slowing the Bennu from Speed 9/10 to 7/8 put Egypt at
0.72–0.79 everywhere. The tactical AI flew fast stacks alone into the enemy
line; rule 3 fixes that, and Egypt now scores 0.40–0.54 in every army table
with its values unchanged. (A test giving the Egyptian javelin throwers more
ammunition changed nothing and was reverted.)

**Still outside the band:** Celtic upgraded armies 0.68 (the old AI hid their
strength: upgraded Celtic units already led several tier duels), and Greek
upgraded armies are the weakest (0.36–0.38) against the proposed pantheons.
Greek values are the design/06 candidates and were not changed. Duels at equal
strength remain sensitive (one stat point on every stack moves a pairing by up
to ~0.2), so these numbers are for spotting outliers, not for fine tuning.

The content-0.5.0 table (before these fixes; 9.5 min run):

| Suite | Greek | Norse | Egyptian | Japanese | Celtic | Mesoamerican |
|---|---|---|---|---|---|---|
| Skirmish (360 whole matches) | 0.57 | 0.47 | 0.55 | 0.40 | 0.59 | 0.42 |
| Armies, 1 week, base | 0.41 | 0.49 | 0.55 | 0.63 | 0.57 | 0.36 |
| Armies, 1 week, upgraded | 0.31 ⚠ | 0.44 | 0.50 | 0.72 ⚠ | 0.57 | 0.46 |
| Armies, 2 weeks, base | 0.63 | 0.63 | 0.27 ⚠ | 0.60 | 0.43 | 0.44 |
| Armies, 2 weeks, upgraded | 0.37 | 0.64 | 0.33 ⚠ | 0.75 ⚠ | 0.39 | 0.53 |
| Starting escorts | 0.38 | 0.56 | 0.44 | 0.51 | 0.59 | 0.52 |

The content-0.4 table (troops-only guard duels, before signatures):

| Suite | Greek | Norse | Egyptian | Japanese | Celtic | Mesoamerican |
|---|---|---|---|---|---|---|
| Skirmish (360 whole matches) | 0.53 | 0.50 | 0.61 | 0.45 | 0.42 | 0.48 |
| Armies, 1 week, base | 0.43 | 0.56 | 0.57 | 0.48 | 0.54 | 0.41 |
| Armies, 1 week, upgraded | 0.29 ⚠ | 0.47 | 0.64 | 0.49 | 0.65 | 0.45 |
| Armies, 2 weeks, base | 0.68 ⚠ | 0.57 | 0.33 ⚠ | 0.49 | 0.42 | 0.50 |
| Armies, 2 weeks, upgraded | 0.41 | 0.56 | 0.39 | 0.51 | 0.53 | 0.59 |
| Starting escorts | 0.41 | 0.61 | 0.43 | 0.46 | 0.54 | 0.54 |

Value changes in the previous session (attack, defense, HP, damage, speed, shots,
footprint): Norse — Frost Wolf 6/3/10 → 6/4/11; Frost Troll 8/8/26 → 9/8/27;
Lindworm 11/8/32 → 11/9/34; Nidhogg Wyrm 24/21/250 [40–52] → 25/22/258
[41–52]; World-Serpent Wyrm 27/24/300 [46–58] → 28/24/308 [47–58].
Egyptian — Anubian Warden shots 10 → 8; Ushabti HP 26 → 28; Royal Ushabti 32
→ 34; Sphinx 10/12/40 → 10/11/39; Great Sphinx HP 46 → 45; Crocodile Beast
HP 38 → 36; Sobek Warbeast 13/11/43 → 13/10/41; Bennu HP 96 → 100; Radiant
Bennu 110 → 116; Desert Colossus 210 → 220. Mesoamerican — Jaguar Spirit HP
10 → 11; Eagle Warrior Spirit HP 26 → 28, damage 3–5 → 3–6; Solar Eagle
Warrior HP 32 → 34, shots 10 → 12; Cenote Crocodile HP 40 → 42; Camazotz HP
34 → 36; Xiuhcoatl HP 80 → 84; starting escort 23 → 24 Feathered Serpents.
Japanese and Celtic unchanged.

### Balance in 0.4.0 (measured, AI-vs-AI)

Reports: `balance-reports/balance-2026-10-01T08-56-44.md` (skirmish +
random, after the winner fix) and `balance-reports/balance-2026-10-01T08-29-58.md`
(armies, escorts, tiers). Twin Harbors now includes weekly events,
interventions and the expanded skills/spells/sets, so these numbers are not
directly comparable with 0.3.0.

**Twin Harbors** (360 matches, 297 decided by elimination, mean day 9.4; 63
at the day-40 cap scored on strength): **west score 0.50, first-mover score
0.50**. Pantheon averages:

| Greek | Norse | Egyptian | Japanese | Celtic | Mesoamerican |
|---|---|---|---|---|---|
| 0.51 | 0.45 | 0.57 | 0.47 | 0.53 | 0.48 |

Mirror matches (10 each) still swing by pantheon (west 0.30–0.70, first
mover 0.50–0.80) — small samples.

**Random maps** (small, few monsters, all seats the same pantheon, 30
matches each):

| Empires | Decided by elimination | Mean decisive day | Seat scores (incl. strength at the cap) |
|---|---|---|---|
| 2 | 14 of 30 | 5.6 | 0.43, 0.57 (even 0.50) |
| 3 | 6 of 30 | 9.5 | 0.23, **0.60**, 0.17 (even 0.33) |

The two-empire seats are close to even. **Three-empire maps favour seat 2**
in AI-only games although every map passed the five fairness checks (equal
town-to-center and town-to-site costs, same sites and monsters per empire).
The likely cause is the AI, not the map: targets of equal value are broken
by a fixed coordinate order, so in a three-way game the empires do not split
their attention evenly (not yet fixed). *Re-measured on 2026-10-02 on thirty
different maps: the seat-2 lead came mostly from the five-map sample; the
first mover was the weak seat — see the top of this file.* The AI also rarely finishes a random
map within 40 days (16 of 30 two-empire and 24 of 30 three-empire matches
reached the cap).

**Duels** (unchanged rules; same AI): full-roster armies — Celtic upgraded
armies 0.68 ⚠ (1 and 2 weeks), Greek upgraded 0.36–0.38, everything else
0.40–0.60; starting escorts 0.43–0.59; same-tier duels show the usual
single-stack outliers (e.g. Norse Draugr 0.78, Japanese Jorogumo 0.17).

### Playtest pass (scripted, not human)

Each non-Greek pantheon was played through the real screens: setup with a
rival, the 18-location town, a build and a recruit (`pantheons.spec.ts`), and
a full field battle of its whole roster against the whole Greek roster with
auto-combat to the result screen (`battles.spec.ts`), with no page errors.
The battle screenshots showed every new creature's placeholder on the board.
No bug was found in these runs; the remaining issues found this session were
the AI and map problems above. Human playtests have still not happened.

Not run: the installer on a real Windows machine, macOS/Linux installers,
code signing, real GPU performance measurement, long soak tests, human
playtests.

## New in 0.4.1 — visual design (owner GUI references, 2026-10-01)

> **Obsolete in part (2026-10-03):** the mentions of the deleted 3D layer in this dated section (Babylon.js, GLB/glTF models, the calibration model, meshes, 3D scenes) are history only; the 2D migration replaced them (see "2D presentation migration" above). Measurements were taken on that build.

No rules, content, saves, AI or screen flow changed; content stays
`content-0.7.0`, so 0.4.0 saves load unchanged.

* **Opening screen.** One of the owner's opening backgrounds is chosen at
  random each time the game starts (11 delivered: a landscape for each of the
  six pantheons and battles for five; a slow drift, off with reduced motion).
  The title is the owner's full logo; the menu sits inside the owner's ornate
  frame, with the owner's nine menu icons mapped by meaning (Continue, New
  Game, Load Game, Campaign, Skirmish, Encyclopedia, Settings, Credits, Quit).
  Random Map and High Scores (added in 0.4.0, no art of their own) are a
  smaller row at the foot of the frame. Hovering or focusing an entry shows its
  description under the frame. Continue keeps its save details and its
  "No compatible save" reason. Every test ID and the footer are unchanged.
* **Branding.** The owner's emblem is the app/installer icon (`icon.ico`
  16–256 px, `icon.png`), the favicon, the Electron window icon, and small
  branding in the menu footer, the pause dialog and the credits.
* **Shared visual language** (`styles/components.css`, `tokens.css`, the kit
  components): navy/slate plates with double gold rims and chamfered corner
  ornaments; title bars with a gold divider and centre diamond; Cinzel small
  capitals; burnished-gold primary buttons and navy secondary buttons with
  normal/hover/pressed/focus/disabled states; round icon buttons for close and
  back; tabs with a gold top; framed resource counters; portrait frames with
  corner studs; army slots with unit-count plates; sockets for artifacts and
  spells; cards for lists, saves, recruitment, bestiary and seats; sunken
  inputs, selects, sliders, checkboxes, radios and toggles; framed bars;
  gold scrollbars; ornate dialogs and tooltips. The menu-style screens show
  this run's background art, darkened, behind their panels.
* **Icon art.** 96 icons cropped from the owner's resource & status icon pack
  (`tools/assets/prepare_ui_art.py`): resources, hero stats, world status,
  battle actions (Wait, Defend, Spell, Ability, Retreat, Surrender), status
  effects and map markers. The shared `Icon` component draws them wherever
  those names were used, so resource counters, cost lists, stat blocks and
  the adventure and battle command bars all changed at once. Map-marker art
  marks the site in the adventure tile panel and each Journal objective (by
  status: active, completed, locked, failed); spellbook entries sit in round
  sockets with the effect-family icon until spells get their own art.
* **Command bars.** Adventure tools and battle actions are framed icon
  buttons with a small label (same buttons, names, shortcuts and test IDs).

What did not change: the 3D adventure map and battle board (terrain, sites,
creatures, selection rings) — the map-marker sheet was used for the 2D
panels only; unit models, portraits and town art are still the earlier
placeholders.

## New in 0.4.0 (proposed, unplaytested — `DESIGN_PROPOSALS.md` §4–12)

Owner request: difficulty and help, more story, a second-campaign outline,
pantheon spells/skills and artifact sets, Favor interventions, a livelier
world map, random maps, hot-seat, summary/keys/high scores, and no
Multiplayer panel. All of it works end to end in this build; every value is a
first proposal checked only by unit tests, scripted UI tests and AI-vs-AI
runs.

* **New Game** shows Campaign, Skirmish and Random Map. The disabled
  *Multiplayer* and *Custom Map* cards are gone (online play is not planned;
  the map editor is later).
* **Skirmish difficulty** Easy / Normal / Hard (Twin Harbors and random maps):
  starting resources, AI income and AI attack margins, score multiplier.
  Normal equals the previous behaviour. The campaign has no difficulty.
* **Contextual tips**: 13 one-time tips in a non-blocking panel; Settings →
  Gameplay → Tutorial hints (now enabled) and Reset tips.
* **Story in The Three Beacons**: 12 scenes (Ione at the Griffin shrine, Ione
  on Athena *or* Ares, Melas when the gate opens and before the final battle,
  Thaleia on losses in every mission, and more) plus a four-line epilogue, in
  a dialogue window with Continue, Backlog (L) and Skip; the AI waits while it
  is open. Journal → Story lists played scenes with Replay. Scenes never
  change play.
* **Second campaign**: (0.4.0) Norse outline only — `CAMPAIGN_2_NORSE_OUTLINE.md`
  (*The Winter Oath*). *Since then built as seven missions — see the top of
  this file.*
* **Pantheon skills and spells, artifact sets** (skirmish only): 8 skills
  (Estates, Mysticism + one per pantheon), 16 spells (4 for every Sanctum + 2
  per pantheon; mass, area, slow, haste, movement and recall effects), 4
  three-piece sets with 2- and 3-piece bonuses shown on the Hero screen and in
  the Encyclopedia.
* **Divine interventions** (skirmish only): 8 for every pantheon + 1 each,
  5–14 Favor, one per world week, on the map (Miracles button, Pantheon
  screen, key I) or in battle (Miracle button). The AI uses them too.
* **Livelier world map** (random maps; the effects are generic): creature
  camps with weekly stock, one-time map events (10 templates), wandering
  monsters that patrol their area, relic shrines; **weekly events** (8) from
  week 2 in every skirmish, shown in the top bar.
* **Random maps** (S19): 2–4 empires, small / medium / large, last empire
  standing or hold the relic (5/7/10 days), monsters none/few/many, seed,
  live preview with the five fairness checks. Saves of random maps are
  self-contained (the generated scenario travels in the save).
* **Hot-seat**: any Twin Harbors or random-map seat can be a person, each with
  a name and patron; a hand-over screen hides the map between people;
  battles between two people are played on one screen.
* **Summary (S20)**: charts of army size, income, towns and treasury per day
  for every empire, empire totals and the score breakdown; **High Scores
  (S21)** for campaign and skirmish (best 20 each, on this computer).
* **Keyboard**: F1 (and ? on the map) lists every shortcut; Settings →
  Controls rebinds them (Esc, F1 and the arrows are fixed).

## Implemented (working end to end)

* **Rules core**: commands/events/processor with duplicate, stale-revision,
  actor, pending-decision and battle gates; economy; recruitment; training;
  stack transfers; hero XP/levels; spellbooks and learning; artifacts; divine
  commitments; covenants; objectives; mission outcome; dawn processing; hero
  hiring (Tavern) including the retreated-hero return roster.
* **Adventure**: movement, fog (explored + derived vision + Divine Sight
  temporary vision until next dawn), sites, encounters, **adventure-map
  spellcasting** (`CastAdventureSpell`, Divine Sight: 10 mana, radius 3 around
  an explored tile; learned at Sanctum III with Wisdom I).
* **Tactical battle**: 15×11 board, Speed order, wait phase, morale/luck,
  retaliation, charge, ward, shooters, spells, defend, retreat/surrender,
  exact-rational damage, resolution, XP, rewards exactly once.
* **Town sieges** (design/04 §8, temporary deterministic model, proposed
  values): Fort walls + gate (2 HP), Citadel adds an off-board keep (20 dmg
  per round) and a moat (stops ground movement, 10 damage once per entry, no
  attack after entering), Castle walls 3 HP plus two towers (10 dmg per round);
  automatic Catapult removes 1 HP from the intact structure with the lowest
  stable ID each round; Cyclopes batter a structure instead of shooting; the
  gate opens only for the defender; wall factor ×½ for attacker shots into the
  town; town capture. **BAT-14**: the human defender picks ≤ 7 of garrison +
  visitor, with the reserve warning shown first; reserves survive a hold and
  are lost with the town; the town defender cannot retreat or surrender.
* **Tactics deployment** (owner decision: interactive only with Tactics):
  zone 2 + Tactics columns (≤ 7; inside/outside the walls in a siege), move or
  swap stacks, "Start battle"; obstacles avoid expanded zones; auto-combat
  confirms the default formation.
* **Campaign**: *The Three Beacons* M01–M03 with carryover, completion records,
  restart, practice replay. Headless journeys for all three missions pass, and
  a Playwright test now plays Mission 1 to its debrief and continues into
  Mission 2 through the real screens.
* **All six pantheons playable in skirmish.** Greek (design values) plus five
  pantheons with **proposed, unplaytested** values: Norse, Egyptian, Japanese,
  Celtic and Mesoamerican. Each has seven families (base + one upgrade, stats,
  abilities from the shared vocabulary, lore stubs), an 18-location town that
  mirrors the Greek tree cost-for-cost with its own names and placeholder art,
  a patron with no bonus (mirrors Zeus: Odin, Ra, Amaterasu, Dagda,
  Quetzalcoatl), an exclusive first-minor pair unlocked by Temple II for 20
  Favor (mirrors Ares/Athena: Thor/Tyr, Set/Isis, Hachiman/Susanoo,
  Morrigan/Brigid, Huitzilopochtli/Coatlicue), seven listed-but-undesigned
  gods, three classes (mirror Champion/Strategos/Oracle) and five hireable
  heroes. The four newest are built by a shared data kit
  (`packages/content/src/pantheonKit.ts`); no rule branch names a pantheon.
* **Twin Harbors skirmish setup**: choose your pantheon and the AI rival's
  (36 pairings, one mission each) on a point-symmetric 35 × 17 map (v2). Each
  side starts with its civic hall, tavern, first fortification and tier-1
  dwelling, a Strategos-type pantheon leader, a tier-1/tier-2 escort and the
  three dwelling covenants.
* **Pantheon signatures** (proposed; `DESIGN_PROPOSALS.md`), each a bundle of
  shared effect types any pantheon or god can use: Greek **Glory** (+25%
  battle XP), Norse **Berserk Fury** (+2 Attack at ≤ half strength), Egyptian
  **Afterlife** (20% of a winning stack's losses return; capped by the
  battle's losses, no XP or rewards), Japanese **Harmony** (3–4 distinct
  families: +1 Defense; 5+: +1 Attack and +1 Defense), Celtic **Shapeshifting**
  (new Shapeshift ability on Pooka, Kelpie, Selkie and Horned Stag Spirit;
  free once per activation for Celtic armies), Mesoamerican **Offering**
  (weekly Temple rite: 1 Favor per 150 Gold of creatures, ≤ 10 per town per
  week). Off in The Three Beacons (`signatureMechanics: false`).
* **Second minor-god choice** (proposed): 18 gods (three per pantheon) with
  real blessings — movement, income, weekly growth, casualty recovery,
  commander attributes, luck/morale, vision, creature-stat blessings (flyers,
  shooters, low tiers) and a better offering rate. Needs a first commitment,
  Temple II + the level-3 civic hall in one town, 25 Favor; the campaign
  allows only Athena and Ares (`committableGodIds`). 24 gods remain
  undesigned (4 per pantheon).
* **Training Academy, Watchtower, Artifact Merchant** (proposed) in all six
  towns: 500 XP for 1,000 Gold once per hero per week; town vision 8; a
  weekly 4-item stock from 12 priced artifacts (10 new), sold to the
  visiting hero. Buttons on the Town screen; the AI uses all three.
* **Balance tool** (`npm run balance`, `tools/balance/README.md`; never
  packaged): whole AI-vs-AI skirmishes, full-roster armies, starting escorts
  and same-tier duels, side- and turn-order-neutral, split across worker
  processes, written to `balance-reports/` as Markdown + JSON.
* **Windows installer** (`npm run desktop:dist`): per-user NSIS x64 installer
  with Start-menu and desktop shortcuts, an original placeholder icon, saves
  kept on uninstall; the installed build ignores `PR_DEV_URL` and has no
  DevTools.
* **Skirmish AI**: builds from data, hires heroes (and returning heroes) from
  its true Tavern roster, explores, buys divine gifts with spare Favor, **besieges visible towns** when it is
  clearly stronger after a wall factor, **defends threatened towns** against
  enemies it cannot beat in the field (and hunts weaker raiders), avoids
  ending a move within reach of a stronger visible enemy, and plays sieges
  tactically (routes around intact walls, waits by the gate for a breach,
  Cyclopes batter the gate first). **New:** commits to gods, equips loot,
  makes Temple offerings while it needs Favor, trains at the academy, buys
  artifacts for empty slots, saves for a new hero when it has none, and uses
  free Shapeshift in battle.
* **2D presentation (PixiJS, since 2026-10-03)**: the Adventure Map, Tactical
  Battle and Unit Detail viewer draw sprites from one manifest
  (`assets-runtime/sprites/manifest.json`) with explicit anchors, statuses
  and provenance; animation by semantic state (`idle, move, attack, defend,
  hit, death, victory` + `shoot`, `takeoff/fly/landing`, `ability` as the
  content needs) with the same speed/instant/skip timing everywhere, a
  fallback chain for missing strips, viewer Play/Pause/Stop/Restart,
  0.5×/1×/2×, Autoplay and Face left. Labelled placeholders for everything
  (`npm run sprites:placeholders`), an importer for final art
  (`npm run sprites:import`) and the production queue
  (`GPT6_2D_CONTENT_GENERATION.md`). Artist spec: `ASSET_PIPELINE.md` §1–9.
* **Saves, desktop, UI, presentation**: as before (versioned envelopes,
  atomic desktop saves, one shared PixiJS renderer, event playback), now 21
  screens (S19 Random Map, S20 Summary, S21 High Scores) and a separate
  high-score store.
* **Sound** (`@pr/audio` + `ui/src/audio`, placeholder files): one Web Audio
  graph with music, ambience, interface, combat and voice buses, a safety
  limiter and mute on focus loss; music and ambience crossfade by screen and
  by the mission's soundscape (menu theme, three map themes, battle loop,
  campaign resolution); victory, defeat, level-up and beacon stingers dip
  the music; interface sounds for clicks, dialogs, errors, building,
  recruiting, trading, pickups, captures, gods, objectives and the calendar
  (new day / new week / end day); hero footsteps while walking; combat sounds
  timed to battle playback cues (swing and impact, shot and hit, deaths,
  spells, heals, wards, defend, morale, shapeshift, Afterlife, catapult,
  stone hits, breaches, towers, moat), or one sound per action when playback
  is instant. Settings: Master, Music, Ambience, Interface, Combat, Mute all,
  mute in the background, Calmer sound, a test sound (no Voice volume until
  there are voice lines: Settings shows only working options);
  volumes preview live and Cancel restores them. Silence never blocks play.
* **On-demand presentation layer**: the start-up script does not contain
  PixiJS; the 2D views' chunk (about 363 KB) is fetched in the background once
  the menu is up.

## Partial

* **No final sprite exists yet.** Every battle sprite, map avatar, map
  location, decoration, obstacle, siege piece, projectile and effect is a
  labelled placeholder (186 manifest entries, all `placeholder`): 43 creature
  forms show a still cut from their reference view (the game supplies the
  motion), 59 forms simple silhouette strips, the map avatars one direction
  mirrored westward. Battle playback loops `fly` during a flight arc;
  `takeoff`/`landing` play only once strips exist.
* **Town screen** is a composed 2D scene (owner concept backgrounds + cropped
  building sprites), unchanged by the 2D migration. Norse, Egyptian, Japanese, Celtic and
  Mesoamerican placements are first-pass estimates checked on composite
  previews; several dwellings use themed stand-in art (below).
* **Balance** of the five proposed pantheons, the six signatures, the 18 new
  gods and the three services rests on AI-vs-AI measurements only (above); no
  human has played them. Remaining measured duel outliers: Celtic upgraded
  full rosters (0.68); Greek upgraded armies are the weakest (0.36–0.38). More
  skirmishes now reach the day cap (69 of 360) because the AI plays safer.
* **Sound is all placeholder.** Every music track, ambience and effect is
  synthesized by `tools/audio/make_placeholders.py` (plucked strings, simple
  pads, drums, filtered noise) and was checked by measurement only — levels,
  seamless loops, no clipping, spectrograms — not listened to. There is no
  Voice volume (no voice lines yet; removed with the 2D settings pass). Captions are not needed yet because
  every sound accompanies something already on screen. Music is Ogg Vorbis:
  decoding was verified in Chromium and Electron only (not Safari/Firefox).
* **AI caution** (retreat, secondaries on their own half, no lone advance) is
  heuristic: a secondary hero can still be caught on its own half by an army
  it cannot see, and the half-map rule assumes two opposed empires.
* **AI use of the new mechanics** is heuristic: it never takes a Shapeshift
  that costs the activation, values gods by a fixed blessing score, and its
  army-strength estimate ignores signatures and blessings.
* **Windows installer** (0.4.0, this build) is built and its contents checked,
  but no version has been run on Windows yet, and it is unsigned (SmartScreen
  warns).
* **Combat log** and **minimap frame**: fixed on 2026-10-03 (the log is
  recorded by the store from the battle's first event; the minimap frames the
  view).
* **AI** remains heuristic (greedy scoring). Since 2026-10-02 it casts
  movement, scouting and Recall spells on the map, values artifact sets and
  picks skills by their value to the hero (`ai/src/growth.ts`); early battles
  still decide most AI-vs-AI skirmishes.
* **AI and the 0.4 features** is heuristic too: it recruits from camps it
  stands on, picks the map-event option with the highest fixed value, invokes
  interventions while keeping 25 Favor until both god choices are made, and
  scores the new battle spells by their immediate value. Since 2026-10-03 its
  strength estimate counts skills, morale, luck, magic and matching battle
  bonuses (sets, gods, signatures, the week) and it adjusts reserves to the
  weekly event (`ai/src/assessment.ts`); it still does not weigh the
  interventions an opponent could invoke in battle.
* **Hot-seat**: since 2026-10-03 the hand-over clears the previous player's
  notices (public ones, like an eliminated empire, and the new-week banner
  stay). A battle between two people shows "Victory"
  from the winner's side. Two people cannot play the campaign together.
* **Random maps** (generator 0.3) are land maps with optional two-way
  portals (no water crossings or underground); full roads now also lead to
  the contested centre. The first week has no weekly event. Guards, camps and
  monsters mix the neutral roster with every pantheon's creatures, and the
  mercenary event always offers Centaurs.
* **Story scenes** use the existing placeholder portraits; there is no voice.
  The Winter Oath's new characters have generated placeholder portraits.
* **Siege presentation** uses primitive walls/towers/keep; structure damage is
  shown by height/colour and HP labels.

## Planned (present in data/UI, not playable)

* Undesigned gods (4 per pantheon, 24 in all): listed, not selectable.
* (Favor's late-game use: divine gifts at the Temple since 2026-10-03, in
  every scenario with interventions.)
* Favor in the campaign: interventions are skirmish-only, so in The Three
  Beacons Favor still only buys gods (documented economy unchanged).
* More authored skirmish maps. (Campaigns for the Egyptian, Japanese,
  Celtic and Mesoamerican pantheons were built on 2026-10-02.)
* Stack merging before a siege; manual ballistics; the map editor (later, by
  owner decision); final audio and voice. (Graphics quality presets: built
  2026-10-03, see above.) Online
  multiplayer is not planned at this stage.

## Blocked

Nothing is blocked. Open owner decisions are listed under deviations.

## Temporary assets

* `assets-runtime/placeholders/town/greek/*` and `town/norse/*` (building
  sprites + backgrounds) and `menu/background.jpg` — cropped/derived from the
  owner's concept boards by `tools/assets/prepare_placeholders.py`; provenance
  per file in `assets-runtime/placeholders/manifest.json`. Greek stand-ins as
  before. **Norse stand-ins:** the buildings board orders its dwellings
  differently from the Norse pantheon board, so tier-1 Draugr uses the
  "Draugr Tomb" art, tier-2 Frost Wolves the "Wolf Den", tier-3 Frost Trolls the
  "Jotun Outpost", tier-5 Lindworms the "Raven Roost", tier-6 Jotnar the
  "Frost Giant Camp".
* **Egyptian, Japanese, Celtic, Mesoamerican** town sprites and backgrounds
  are cropped from the owner's boards the same way (provenance per file in the
  manifest). Their buildings boards order the dwellings by theme rather than by
  roster tier, so these tiers use the closest-themed stand-in: Egyptian tier 1
  Scarab ← "Scorpion Lair", tier 6 Bennu ← "Falcon Aerie"; Japanese tier 2 Kappa
  ← "Archery Range", tier 5 Jorogumo ← "Ronin Barracks", tier 6 Kirin ←
  "Phoenix Aerie"; Celtic tier 1 Pooka ← "Boar Clan", tier 3 Kelpie ← "Staghorn
  Riders", tier 4 Banshee ← "Bear Circle", tier 5 Selkie ← "Eagle Aerie", tier 7
  Fomorian ← "Ancient Entwives"; Mesoamerican tier 5 Camazotz ← "Stag Grove",
  tier 7 Stone Colossus ← "Warrior Altar". The other dwellings match by name.
* Creature portraits: 43 of the 102 forms have final paintings (Brief 5, first
  part, 2026-10-03); the other 59, hero portraits without a story bust, all god
  portraits are still procedural SVG (the six pantheon emblems are final art since 2026-10-03). Mission and
  campaign cards now come from the delivered story art (below).
* **Story art (2026-10-02)** — 35 dialogue busts, 6 campaign covers, 11 ending
  pictures and 40 mission pictures delivered by the owner (masters in
  `assets-source/art/final/`, runtime WebP in `assets-runtime/art/`). Final art,
  not stand-ins; the landscapes are native 1672 × 940/941 (below the brief's
  sizes, not upscaled). Square portraits of the story characters (for lists) are
  still procedural where no hero portrait exists; lists show the bust in a 2:3
  slot instead.
* **Sprites (2D migration, 2026-10-03)** — `assets-runtime/sprites/` (7.1 MB,
  186 manifest entries, every one `status: "placeholder"` with its
  provenance): creature stills cut from the 43 delivered reference views,
  silhouette strips for the other 59 forms, map avatars and hero-screen
  figures cut from the owner's six hero boards, 40 map locations cut from the
  owner's map-marker sheet (plus a drawn windmill), procedural decoration,
  obstacles, siege pieces, projectiles and effects. Generated by
  `npm run sprites:placeholders`; replaced by file through
  `npm run sprites:import`.
* **Interface art (0.4.1)** — opening backgrounds, full logo, emblem, menu
  frame, the nine menu icons and the resource & status icon pack are
  owner-supplied AI-generated visual references (sources in
  `assets-source/ui/`, runtime files and provenance in `assets-runtime/ui/`,
  `assets-runtime/icons/`). Usable as delivered, replaceable by asset ID.
* **Final functional icons (2026-10-02)** — 22 interface, 54 spell, 79
  artifact and 17 skill icons delivered by the owner (masters in
  `assets-source/icons/final/`, runtime files in `assets-runtime/ui/icons/final/`).
  Final art, not stand-ins; 221 catalog entries still use glyphs or procedural art.
* `apps/desktop/build-resources/icon.ico` / `icon.png` and the favicon — made
  from the owner's emblem (`logo.png`) by `tools/assets/prepare_ui_art.py`.
* `assets-runtime/placeholders/menu/background.jpg` — the earlier menu
  background, now only a fallback when no opening background is present.
* Fonts bundled locally (OFL).
* `assets-runtime/audio/placeholder/*.ogg` (60 files, 5.1 MB: 6 music loops,
  4 stingers, 4 ambience beds, 46 effects incl. variants) and
  `assets-runtime/audio/manifest.json` — synthesized by
  `tools/audio/make_placeholders.py` with fixed seeds (no recordings, no
  third-party samples); each manifest entry says `status: "placeholder"`.
  Settings → Audio says so too.

## Deviations and decisions to confirm

1. **Greek roster** follows the v0.3 catalog order; the Centaur pair is neutral.
2. **18-location mapping** of the 32-building catalog; the three support
   locations (Training Academy, Watchtower, Artifact Merchant) now have
   proposed mechanics (25–27 below).
3. **S05** offers a single fixed patron per scenario (Zeus for the campaign;
   each pantheon's patron in skirmish).
4. **Hero hiring** (proposed): Tavern, 2,500 Gold, free visitor position, 10
   tier-1 base creatures; returning heroes come back with 1 creature and no
   movement. Disabled in the campaign by the mission manifest.
5. **Spell learning** happens on entering a town and at dawn in a town with a Sanctum.
6. **M03 balance risk** (unplaytested).
7. **Adventure map shape**: axial-row templates render as parallelograms.
8. **Deployment is interactive only when the human commander has Tactics**
   (owner decision this session). design/04 §1 says "Confirm deployment before
   round 1"; without Tactics the default formation is the two-column
   deployment and battle starts at once. AI/neutral sides always use the
   default formation.
9. **Siege simplifications** (proposed): the wall factor applies to attacker
   shots from outside at targets inside when the structure on the *target's
   row* is intact (a row rule, not a line trace), never to defenders; the keep
   stands off-board and aims from cell (14, 5); the Catapult may target the
   keep; the moat affects both sides and a flyer landing in it cannot attack
   that activation; a town without a Fort is defended in the open; **no stack
   merging** during defender selection (identical forms stay separate).
10. **AI information honesty**: belief state hides unseen heroes, wallets,
    other fog, unexplored sites and unseen garrisons.
11. The e2e read-only hooks (`__prInspect`, `__prProject`, `__prHeroes`,
    `__prCamera`, `__prBattle`) exist only when the page URL contains `?e2e`;
    they read presentation state and expose no commands.
12. **Tactical AI**: an engaged stack with no profitable trade now strikes in
    place instead of side-stepping (this removed 60-round stalls exposed by
    Norse retaliation-heavy units).
13. **Norse values are all proposed** (owner decision "Propose them"): stats,
    costs, growth, abilities, town costs, gods, classes, starting armies. The
    town and gods deliberately mirror the Greek structure. (Skirmish now
    grants the dwelling covenants; see 16.)
14. **Content version is now `content-0.4.0`** (new Twin Harbors map, leaders
    and values). Saves made with earlier content versions are listed as
    incompatible and kept (never migrated or deleted).
15. **All pantheons playable now** (owner request: "add the other pantheons…
    so we have all of them inside the game"). I proceeded without further
    questions and assumed, as for Norse, that Claude proposes every number and
    that the Greek structure is mirrored (town tree and costs, god roles, class
    numbers). Hero class assignments, location names, starting escorts and
    leaders are proposed. Identity notes: Egyptian javelin guards at tier 2 and
    a wall-breaking shooter colossus at tier 7; Japanese fast spirits and a
    ranged Kirin; Celtic chargers and a ranged Banshee, no flyers; Mesoamerican
    two ranged tiers and flying bats/serpents.
16. **Skirmish grants the three dwelling covenants** (the families of the
    tier-3, -6 and -7 dwellings) to both towns, so every roster can be built in
    full. This also changes the Greek and Norse skirmishes (previously those
    dwellings could not be built there). The campaign is unchanged.
17. **Twin Harbors is one scenario with 36 pantheon variants.** The previous
    mission IDs `skirmish_twin_harbors_norse` and `skirmish_twin_harbors_vs_norse`
    are now `skirmish_twin_harbors_norse_vs_greek` and
    `skirmish_twin_harbors_greek_vs_norse`; `skirmish_twin_harbors` stays Greek
    vs Greek.
18. **Empty town plots now draw above built art** so every location can be
    clicked. The Greek town had two covered plots (Pantheon Temple under the
    Civic Hall, tier 4 under the Tavern) and the Norse town several; they were
    found by a geometry check run over all six towns.
19. Placeholder hero portraits pick their look from the class's starting skill
    (offense, leadership, or spellbook), so pantheon classes reuse the three
    procedural looks without naming class IDs.
20. **Twin Harbors v2** replaces v1: point-symmetric, 35 × 17, two groves
    (north/south) and a crystal deposit per side instead of one grove and one
    contested deposit; both supply caches give 400 Gold + 2 Wood + 2 Stone.
    `MapTemplateDefinition.symmetry: 'point'` is new, optional generator
    vocabulary; other templates generate exactly as before (golden tests
    unchanged), so `pr-mapgen-0.3` was kept.
21. **Skirmish leaders are all Strategos-type** so no pairing hands one side a
    stronger commander: Alexios vs Odysseus (Greek), Ragnar vs Lagertha,
    Hatshepsut vs Cleopatra, Yoshitsune vs Benkei, Fionn mac Cumhaill vs
    Boudicca, Nezahualcoyotl vs Eight Deer Jaguar Claw. The previous leaders
    (Heracles, Sigurd, Ramses, Tomoe Gozen, Cu Chulainn, Hunahpu) are hireable.
22. **AI information**: the AI now reads its own Taverns' true rosters (as a
    human sees them); everything else still comes from the belief state.
23. **Turn order** is unchanged (the human moves first); no stable first-mover
    advantage was measured, so no compensation was added.
24. **Installer**: per-user (no admin), x64 only, unsigned; `productName`
    "Pantheon Realms", so saves live in `%APPDATA%\Pantheon Realms\saves`.
25. **Pantheon signatures** (owner request, items 4 and "all six"): proposed
    mechanics and numbers in `DESIGN_PROPOSALS.md`. Touch points:
    design/04 §5 defers resurrection — Afterlife and the recovery gods follow
    every constraint it lists (capped by the battle's own losses, winner only,
    no XP/reward/kill loop); design/02 §8 says faction Favor methods "come
    later" — the Offering rite is one, weekly and capped, never from
    casualties (DEC-12) and not a market trade; Glory multiplies the design/04
    §9 XP amount; Harmony counts families and leaves the same-faction morale
    rule alone. Shapeshift aspects are battle statuses, not forms (DEC-21).
    **The Three Beacons is unchanged** (`signatureMechanics: false`).
26. **Second minor-god choice** (owner answer "Add a second choice"): 25 Favor,
    Temple II + level-3 civic hall in one town, a first commitment first. The
    first choice (design/02 §8) is unchanged.
27. **Support buildings** (owner answer "Hero training" for the Academy):
    costs, prerequisites and effects proposed; Watchtower vision 8; merchant
    stock drawn from a hash of match and week, the same in every town (no RNG
    stream consumed; a per-town draw would favor one harbor).
    Outside the campaign allowlists.
28. **AI additions**: god commitments (best blessing score), equipping
    backpack items, offerings only while Favor is needed, academy training
    and merchant purchases with Gold reserves, and a heroless empire now saves
    for a new hero instead of spending everything on its garrison (before, a
    rival that lost every hero early could sit near 1,000 Gold until the day
    cap). Tactical AI takes a free Shapeshift when the other aspect gives a
    clearly better best action.
29. **Content version is now `content-0.5.0`**; saves from 0.4 are listed as
    incompatible and kept.
30. **Balance duels changed**: army/escort/tier duels are now hero battles in
    the matching pairing so each side carries its signature
    (`--no-signatures` restores the troops-only guard duel). Numbers are not
    directly comparable with the content-0.4 table.
31. **Audio buses and Settings** (owner request): settings/02 §4 proposed
    Master, Music, Effects, Ambience and Voice; production/04 §7 routes music,
    ambience, interface, combat and voices through their own buses. This
    build shows **separate Interface and Combat volumes instead of one
    Effects** volume (a schema-1 Effects value carries over to both; the
    preferences schema is now 2), plus **Mute all** (volumes kept) and
    **Calmer sound**. settings/02 §4 said to show "Audio is not implemented"
    rather than fake test sounds; the owner asked for generated placeholder
    sounds, so Settings instead says they are temporary placeholders, and
    the Test button plays real (placeholder) files.
32. **Autoplay**: browsers start audio after the first click; the desktop app
    sets Chromium's `autoplay-policy` switch so the menu music can start at
    launch.
33. **Mission `soundscape`** (presentation data on `MissionDefinition`, never
    read by the rules) picks each map's music and ambience: The Silent Shore
    and Twin Harbors `coast`, The High Pass `high_pass`, the finale
    `storm_plateau`.
34. **Harmony** is now +1 Defense at 3 or more families (the +1 Attack at 5
    families is removed) and **content is `content-0.6.0`**: 0.2.0 saves are
    listed as incompatible and kept.
35. **AI changes** (turn-order fairness, above): retreat out of a visible
    stronger enemy's reach; secondary heroes (below 60% of their strongest)
    stay on their own half unless within 3 hexes of it; the tactical AI does
    not advance alone into more enemy reach than it has allies beside it.
36. **Loading**: the PixiJS layer loads on demand (§ Tests). The UI may take
    values only from `@pr/presentation/core` (no Pixi), enforced by the
    boundary lint.
37. **0.4 proposals** (`DESIGN_PROPOSALS.md` §4–12) are all skirmish
    features or expanded content, switched off in The Three Beacons
    (`features` all false), so the campaign's documented content and
    economy are unchanged. The campaign gains only story scenes, an epilogue
    and a mission score in its completion records
    (`campaign-three-beacons-0.4`).
38. **Story text** (campaign/01 §"Story": "No … cinematic dialogue system is
    required"): the scenes use the "text-first dialogue overlay with
    portraits, subtitles, Backlog and Continue" that section allows. All
    scene lines are new text written for this build — owner review wanted.
39. **Content version is now `content-0.7.0`**; 0.3.0 saves are listed as
    incompatible and kept (as with every earlier content change).
40. **Weekly events and interventions change Twin Harbors** compared with
    0.3.0 (they are on in every skirmish), so the skirmish balance numbers are
    not directly comparable with the 0.3.0 report.
41. **"The Fallen Titan"** was an empty placeholder card from an earlier build
    (not in the owner's documents); it is replaced by the Norse outline card.
42. **High scores** are kept in a separate records store (`records.json` on
    desktop) so they never show up as broken saves; the desktop bridge gained
    `readRecords`/`writeRecords` (validated text only, same size cap).
43. **Visual update is 0.4.1**, not a new content version: no rules or
    content changed, so 0.4.0 saves stay compatible.
44. **Eleven opening backgrounds, not twelve.** The request named
    `opening_screen_background_1.png` … `_12.png`; eleven distinct images
    reached this session (no Mesoamerican battle scene). The menu picks from
    whatever `assets-source/ui/backgrounds/` holds, so a twelfth is one file
    plus a re-run of `prepare_ui_art.py`. The files were renamed by content
    (`opening-<pantheon>-<landscape|battle>`), since the original numbering
    did not come with them.
45. **GUI guide sheets.** `gui_guide.png` and the UI-kit sheet were seen in
    the request but not available as files when this was built; the shared
    style follows them as described (frames, button states, tabs, counters,
    slots, controls) together with the frame, logo and the two icon sheets
    that were available. Owner review of the details is wanted.
46. **Menu icons.** The owner's nine `init_icon` files in
    `assets-runtime/icons/` were renamed by meaning and moved, unchanged, to
    `assets-source/ui/menu-icons/menu-<entry>.png`; `assets-runtime/icons/`
    now holds the same names at 192 px (the 1254 px originals would have added
    7 MB to the installer).
47. **Random Map and High Scores** stay on the main menu as a compact row in
    the frame (the nine framed entries match the owner's icon set); they use
    the SVG glyphs until they get icons of their own.
