# Working agreements for AI-assisted development

Read `ARCHITECTURE.md`, `DEVELOPMENT_STATUS.md` and `IMPLEMENTATION_PLAN.md`
before changing code. `DESIGN_PROPOSALS.md` holds the proposed
designs (signatures, second god choice, support buildings; difficulty, story
scenes, skills/spells/sets, interventions, world features, random maps,
hot-seat, results screens) — proposals, not owner decisions.
`CAMPAIGN_2_NORSE_OUTLINE.md` describes The Winter Oath, the seven-mission
Norse campaign the owner asked for (built with proposed, unplaytested values);
`CAMPAIGNS_3_TO_6_OUTLINE.md` the Egyptian, Japanese, Celtic and Mesoamerican
campaigns built on its reusable arc (`packages/content/src/campaign/arc.ts`).
The Silent Oracle (`campaign/silentOracle.ts`, owner request 2026-10-14) is
the second Greek campaign on the same arc, listed right after The Three
Beacons (the tutorial); its story art is GPT-6 Brief 18
(`assets-source/art/briefs/GPT6_BRIEF_18_SILENT_ORACLE.md`; delivered and imported
2026-10-14, ASSET_PIPELINE.md §18).
The design documents in `docs/` are the source of truth; do not reopen
decisions they settle.

## Non-negotiables

* Stack: TypeScript rules + AI, React UI, PixiJS 2D (Adventure Map, Tactical
  Battle, sprite animation, Unit Detail viewer), Electron desktop, browser
  build from the same core. Do not substitute engines. The 2D migration
  (2026-10-03) deleted the obsolete Babylon.js 3D layer; do not reintroduce
  3D code, GLB/glTF assets or Blender steps.
* All game state changes go through `processCommand`. React, Pixi views,
  animation callbacks and the AI never mutate `MatchState`; animation never
  decides an outcome (instant and normal playback give identical results).
* A player's planned journeys (2026-10-14) are session presentation intent
  (`session/src/journeys.ts`, saved as the optional `SaveSnapshot.presentation`),
  never rules state: only the destination is kept, routes are re-quoted, and
  following one is an ordinary `MoveHero`. Keep per-player privacy (a journey
  belongs to one player and match) and never move a hero without the player.
* The simulation core (`rules`, `content`, `mapgen`, `campaign`, `ai`,
  `session`) stays DOM-free and Node-free. Run `npm run check`.
* Content is data: new gods, heroes, buildings, creatures and abilities are
  definitions using the shared requirement/effect vocabulary, not new
  classes or `if (id === …)` branches. Pantheon signatures are effect bundles
  (`PantheonDefinition.signature`); a new mechanic is a new effect *type* any
  pantheon or god can use. Site kinds (e.g. the two-way `portal`) and
  objective conditions are shared data too.
* Skirmish-only features stay behind `ScenarioFeatures` / `scope: 'expanded'`;
  The Three Beacons keeps them off (The Winter Oath and the five arc campaigns turn expanded content on).
  Climate rules (`climateRules`) and AI temperaments (`aiTemperaments`) are on in
  skirmishes and random maps only; a temperament changes the AI's choices,
  never a rule. Story scenes are data on the mission and
  never change play.
* Six pantheons, seven tiers, one family per tier, exactly base + one upgrade;
  18 town locations (7 dwellings + 11 support). Gods per pantheon are
  content-driven.
* Never describe placeholder behavior as final. Keep `DEVELOPMENT_STATUS.md`
  honest: measured results vs targets, commands actually run.
* The desktop game must work with networking disabled; no CDN assets.
* Start-up size: `@pr/ui` takes values only from `@pr/presentation/core`
  (no Pixi there); the PixiJS views load on demand through
  `ui/src/scene/SceneHost.tsx` (the boundary lint enforces this). Measure with
  `node tools/perf/load-time.mjs` after changes that touch start-up.
* Frame rate (2026-10-06): the map and battle views keep their layers in
  PixiJS render groups (`enableRenderGroup`), so the camera and the animated
  figures never re-send the ground; never redraw a `Graphics` every frame
  (animate it by transform), redraw keyed shapes and texts only when they
  change, and load pictures through `textures.ts` (decoded off the main
  thread, sent to the GPU between frames, handed to a sprite only once sent). High is capped at 60 fps; adaptive
  resolution (Settings → Display) lowers the drawn pixels while frames run
  slow. In this container the GPU is SwiftShader: compare main-thread time per
  frame and uploads (`tests/perf`, `?gputime`), not frame rates; the owner
  measures the frame rate with Settings → Display → Frame rate.
* Sound is referenced by sound ID only (`assets-runtime/audio/manifest.json`);
  every sound must accompany something shown on screen, and silence must
  never block play.
* Do not reset the repository, remove saves, publish assets, buy services or
  upload private content without explicit authorization. Development tools
  and MCP servers are never packaged into the game. No privileged action hooks
  in production builds (the `?e2e` hooks are read-only).
* Commit or push only when the owner asks.

## Commands

```
npm install
npm run check        # boundaries + type-check + unit tests
npm run dev          # browser dev server
npm run build        # browser build (apps/client/dist)
npm run test:e2e     # Playwright UI tests (builds + previews automatically)
npm run desktop      # build and launch Electron
npm run desktop:dist # installers via electron-builder
installer\build-installer.cmd   # (Windows, owner's PC; installer/ is not in git) builds the installer from this checkout into installer\: npm ci when needed, desktop:dist, SHA-256; --check runs npm run check first
xvfb-run -a node tools/desktop-smoke.mjs   # headless desktop smoke (after desktop:build)
PR_SMOKE_EXE=apps/desktop/release/linux-unpacked/pantheon-realms xvfb-run -a node tools/desktop-smoke.mjs  # packaged-layout smoke
npm run balance      # AI-vs-AI balance report (tools/balance/README.md); re-run after any value change
npm run balance -- random --matches 4   # random-map seat fairness only
npm run balance -- random1v1 --matches 30   # every pantheon pairing on random maps, both seats (nine layouts; --map-types, --sizes, --focus); target: each pantheon 0.45–0.55
node tools/perf/load-time.mjs [dist]          # start-up + first-scene load times (after npm run build)
npx playwright test --config playwright.perf.config.ts tests/perf/frames.spec.ts    # frame timing per scenario (map idle/pan/zoom/walk, huge map, battle); PERF_GPU=1 (?gputime: GPU wait timed apart from main-thread time), PERF_DPR, PERF_ONLY=a,b, PERF_LABEL → test-results/perf/<label>.json
npx playwright test --config playwright.perf.config.ts tests/perf/fullgame.spec.ts  # a full test game frame by frame (map, the computer's turns, a battle) + long tasks; PERF_DAYS, PERF_GPU=1, PERF_DPR=0.5
PR_NO_MINIFY=1 npm run build && npx playwright test --config playwright.perf.config.ts tests/perf/profile.spec.ts  # main-thread CPU profiles (readable names; rebuild without PR_NO_MINIFY afterwards)
python3 tools/audio/make_placeholders.py      # regenerate placeholder music/sounds + audio manifest (numpy, scipy, ffmpeg); keeps "final" entries
python3 tools/audio/import_music.py --from <folder with pixabay-<id>.mp3>   # map music per pantheon (assets-source/audio/music/tracks.json) → Ogg + music.map.<pantheon> playlists
python3 tools/audio/import_sounds.py --from <folder with pixabay-<id>.mp3>  # menu, battle (per pantheon), siege, resolution music, stingers, effects, ambience (assets-source/audio/sounds.json) → Ogg, level-matched, manifest "final"
npm run sprites:plan          # content plan (forms, animations, sites, battlefields) → assets-source/sprites/content-plan.json
npm run sprites:cut -- --only <sheet>  # cut ONE GPT-6 sheet from assets-source/sprites/sheets/ into single files (layouts: sheet-layouts*.json; previews in sheets/_preview/); never re-cut the delivered sheets; --self-test checks the cutter
npm run sprites:import        # final sprites from assets-source/sprites/final/ (cut files or single files) → manifest status "final"
npm run sprites:queue         # writes GPT6_2D_CONTENT_GENERATION.md + sheet-layouts.json for sprites still missing (new content only; overwrites sheet-layouts.json)
npm run vfx:list              # writes VFX_MAGIC_AND_FAVORS.md (spell, miracle, gift VFX still to make; looks in tools/assets/vfx/briefs.ts)
python3 tools/assets/prepare_ui_art.py        # regenerate opening-screen art, icons, app icon from assets-source/ui/
npm run icons:catalog    # icon inventory check + writes ICON_CATALOG.md + assets-source/icons/ICON_CATALOG.xlsx/.csv (a production list; not kept once delivered)
npm run icons:import     # register final icons dropped into assets-source/icons/final/ (named by asset ID); `-- --new` imports only icons not yet registered (a full run re-encodes and re-dates every icon)
npm run cursors:import   # mouse cursors from assets-source/ui/cursors/ (Brief 7, 128 px, named by cursor ID) → 32 px + hotspots in assets-runtime/ui/cursors/
npm run art:import       # painted art from assets-source/art/final/ → assets-runtime/art/ (story art incl. the Herald, terrain, battlefields, skies, miracle cards, splashes, banners, town levels, dwellings, town backgrounds; never upscales; keeps runtime art whose master is not in this checkout unless `-- --prune`; `-- --self-test` checks the names)
npm run art:briefs       # (delivered; writes the documents again only when needed) GPT-6 briefs 8–11 (god portraits + god-card icons, hero portraits, town building levels, map-hero prepare/cast) + assets-source/sprites/sheet-layouts.briefs.json
npm run art:brief12      # GPT-6 Brief 12: every visual still missing, from the game (dwellings, services, climate icons, site markers, town backgrounds, fx.god.commit) + sheet-layouts.brief12.json + town layout guides
npm run balance -- skirmish --no-temperaments   # the same matches with every AI empire playing the neutral way (compare with the default)
npm run balance -- maps --matches 2   # the six authored skirmish maps, each pantheon line-up from every seat (--maps a,b)
npm run campaign-sim -- --runs 20   # the computer plays every campaign at Story, Normal and Hard (objective autopilot); per-level target bands, per-mission wins, days, costliest battle, verdicts (tools/campaign-sim; --difficulty story|normal|hard|written, --check)
npm run maps:build       # builds the authored skirmish maps from tools/maps/maps.ts, checks them, plays the seat-fairness test on the ones that changed and ships only the fair ones (packages/content/src/skirmish/maps/*.prmap.json; record tools/maps/fairness.json; --all, --no-fairness) + layout guides for Brief 14
npm run maps:fairness    # the seat-fairness test on the shipped authored maps only (report; -- --maps a,b)
npm run balance -- random1v1 --matches 30 --check   # …and exit 1 when a pantheon is significantly under the layout floor (0.40 on a map type)
npm run art:siege-guide  # the siege layout guide for GPT-6 Brief 15 (assets-source/art/briefs/guides/siege.layout.png)
npm run art:road-guides  # GPT-6 Brief 16 road guides (guides/road.<a|b|c>.layout.png, road.join-example.png) + assets-source/sprites/road-tiles.json, from the game's hex geometry
npm run roads:import     # painted road sheets (assets-source/sprites/final/sheet.road.<type>.<a|b|c>.png) → assets-runtime/sprites/final/roads/ + sprite manifest `roads`; `-- --dry-run`, `-- --only dirt`, `-- --note "<review status>"`, `-- --self-test`
npm run art:ground-guides  # GPT-6 Brief 17 ground-transition guides (guides/ground.<edges|shore>.layout.png, ground.join-example.png) + assets-source/sprites/ground-edges.json
npm run ground:import    # Brief 17 Parts A/B: sheet.ground.<character>.png masks + sheet.ground.shore.foam.png → assets-runtime/sprites/final/ground/ (edges.json, foam.webp) + manifest `ground`; `-- --dry-run`, `-- --keep-going`, `-- --self-test`
```

Authored skirmish maps (2026-10-05): six custom map documents in
`packages/content/src/skirmish/maps/` (catalog `skirmishMaps`), designed for
one empire in `tools/maps/maps.ts` and copied by exact hex symmetry; edit the
design and run `npm run maps:build`, never the JSON. The custom map types
live in `@pr/rules` (`definitions/customMap.ts`). Their pictures are GPT-6
Brief 14 (`assets-source/art/briefs/GPT6_BRIEF_14_SKIRMISH_MAPS.md`); siege art
(each pantheon's walls, gates, towers, keep, siege battlefield, the catapult)
is Brief 15 (`GPT6_BRIEF_15_SIEGES.md`). Both were delivered on 2026-10-05 below
the asked resolutions (accepted by the owner; never enlarged); the siege
paintings are aligned on screen by `SIEGE_GROUND_SHIFT`. Painted roads are
Brief 16 (`GPT6_BRIEF_16_ROADS.md`, five road types × three sheets, one tile per
hex connection pattern); the map keeps its code-drawn roads until every road
type a map needs is imported (`npm run roads:import`); all five road types were
delivered and imported on 2026-10-06 (dirt approved by the owner after its
review; the other four await in-game acceptance), so every map draws painted roads. A dwelling never requires a dwelling
of a higher tier (owner decision 2026-10-05; `BuildingTreeValidator`).

**GPT-6 Brief 17** (`assets-source/art/briefs/GPT6_BRIEF_17_FINAL_VISUALS.md`,
2026-10-06) is the last art request: ground transitions (six mask sheets) and
shore foam, the six town backgrounds (was Brief 13 Part A), the three markers
still cut from the concept pack, the neutral map hero and 16 story portraits
(ASSET_PIPELINE.md §16). It was delivered and imported on 2026-10-06 (app
0.13.4; the owner widened Part C to **24** town backgrounds,
`town.<pantheon>.background.l1`–`l4`, one per town-hall level, native
1448 × 1086): the town screen picks the stage from the `civic_hall` level
(`townBackground()` in `ui/src/assets/manifest.ts`; a missing stage falls back
to `.l1`, then the unsuffixed ID), and the dialogue box shows the delivered
square story portraits beside the painted busts. The map draws painted ground
transitions only when all six mask sheets are imported (`groundEdges.ts`,
`paintGroundEdges`), else the softened hex edges. Battle stacks carry the Brief 13 status, action and miracle
icons over their count (`ui/src/app/stackMarks.ts` → `BattleStackView.marks`;
presentation only). The strategic AI judges a stack of few creatures by
`fightingStrength` ((n + 1) / n on the shared heuristic, which stays unchanged
for the neutral-reaction rule) and keeps a home guard in its towns
(`homeGuardTransfers`).

**Nature scenery** (owner delivery 2026-10-06, app 0.13.5; ASSET_PIPELINE.md
§17): 318 climate stills, `decor` IDs `nature.<climate|water profile>.<role>.0N`
(`npm run sprites:import -- --only sprite.map.decor.nature.`; the importer trims
them to their painted pixels). `packages/presentation/src/nature.ts` — the
delivery's reference selector in TypeScript, its `nature-policy.json` beside
it — plans the map's scenery once per map (climate first, terrain second;
border clumps; sea, lake or river by shape in `classifyWater`) from stable
hashes, presentation only; battle obstacles show the climate's rock, deadwood
or tree (`battleObstacleId`), the generic columns and standing stones stay.
Never pick scenery from a pantheon or a ground colour; unknown water kinds get
nothing. Read-only check: `__prScenery()` under `?e2e`. The hero screen's
equipment figure is the delivered `assets-runtime/ui/hero-equipment-schematic-v2.png`
(`HERO_EQUIPMENT_SCHEMATIC`), a decorative `<img>` behind the slot buttons.

**Owner round 2026-10-07 (app 0.13.6):** one hero hire per empire per week
(`heroHiredThisWeek`); unowned towns (`MissionDefinition.neutralTowns`; random
maps `unownedTowns`, authored maps' town sites without `owner`, compiled by
`packages/mapgen/src/unownedTowns.ts`); shared miracles named by each pantheon
(`InterventionDefinition.names` — show names through `interventionsFor` /
`interventionOf`, never `catalog.interventions[id].name` in front of a
player); random-map roads routed with trunk sharing and turn penalties
(`pr-skirmishgen-0.7`) and drawn one material per stretch
(`smoothRoadTypes`); varied ground borders and rounded corners
(`GROUND_VARIETY`, `planGroundCorners`); map guards face either way
(`facesLeft`, a stable hash). Headers carry no screen codes.

**App 1.0.0 (2026-10-07, owner Teddy Lazebnik):** campaign difficulty levels
are `DifficultyDefinition`s with `scope: 'campaign'` (`campaign_story`,
`campaign_normal`, `campaign_hard`); the mission factory scales guards, hostile
armies and rival armies through `scaleStackCount`, and any creature count in a
mission text is an army token (`{army:id=count,…}`, `armyToken`) shown through
`missionText` — never type a guard's number into an objective. The map's ground
is shown from `GroundCache` chunks: anything that changes the ground layer must
call `groundCache.invalidate()` (as `drawTerrain`, `drawRoads` and a new grid
do). Views report a frame pace (`pace()`: full / ambient / still) and call the
engine's `wake()` when they change without input; the readout judges only
moving frames. Authored maps ship only through `npm run maps:build` with the
seat-fairness gate (`tools/maps/fairness.json` records each verdict).

Interface art: sources in `assets-source/ui/`, generated runtime files and
provenance in `assets-runtime/ui/` (ASSET_PIPELINE.md §11). The visual
language lives in the shared kit and `styles/components.css`; style screens
through those, not one by one.

2D sprites (ASSET_PIPELINE.md §1): every creature form, map avatar, map
location, decoration, obstacle, siege piece, projectile and effect is an
entry in `assets-runtime/sprites/manifest.json` with an explicit anchor
(battle: feet, bottom centre; map avatars: the ground point between the
mount's feet), `status` (`placeholder` | `final`) and provenance. Sprites
face right; the views mirror defenders and westward travel. Replacing a
placeholder is an art drop + `npm run sprites:cut` + `npm run sprites:import`,
never a code change.
Keep `packages/presentation/src/hexmath.ts` as the only screen↔hex
transform, so sprite sizes never change which hex a click selects.
Magic and Favor effects play the delivered strips under their full `fx.*`
asset IDs (all 177 delivered 2026-10-04, plus `fx.god.commit` from Brief 12); a phase
without a strip — e.g. a new spell or miracle — is drawn by code from the looks
in `packages/presentation/src/fxLooks.ts` (painted by `fx.ts`; a new spell gets
a look from its effect type, so add a table entry only to refine it). The
importer keeps full `fx.*` IDs and sidecar loops (`import_sprites.py
--self-test`).
The delivered final PNGs and JSON sidecars in `assets-source/sprites/final/`
are authoritative (some strips carry held-frame repairs and reviewed
component cuts). The sheets they were cut from were removed in the release
clean-up of 2026-10-05 (git history keeps them; the production lists
`GPT6_2D_CONTENT_GENERATION.md`, `VFX_MAGIC_AND_FAVORS.md` and `ICON_CATALOG.md`
too); only the Brief 12 sheets remain in `assets-source/sprites/sheets/`. A new or
corrected sheet is cut alone with `npm run sprites:cut -- --only <sheet>` —
never an unrestricted re-cut. Briefs 1–11 were delivered and their documents
removed; Brief 12 (`assets-source/art/briefs/GPT6_BRIEF_12_REMAINING_VISUALS.md`,
town layout guides in `briefs/guides/`) was delivered on 2026-10-05 except the
optional town-background repaints (the town backgrounds came with Brief 17).
Brief 13's 94
icons (Parts B–E) were delivered and imported on 2026-10-05 (the main-menu
icons are 192 px, the rest 96 px; `tests/e2e/brief13.spec.ts`); its Part A (the
six town backgrounds) and the three concept crops it did not list
(`icon.marker.hero`, `icon.marker.enemy-hero`, `icon.marker.encounter`) became
Parts C and D of Brief 17. The god cards
show their blessings, price and state as icon rows (`components/godIcons.tsx`)
whose tooltips keep the content's sentences.

UI tests build scenario fixtures as ordinary save files (`tests/e2e/fixtures.ts`)
and bring them in through Load → Import — never through privileged hooks.

**Campaign content v2 (campaign expansion, 2026-10-15; app 1.2.0):** the 37
chapters (`packages/content/src/campaign/v2/`, one builder per campaign,
registered in `index.ts`; guide `docs/campaign-v2/AUTHORING.md`, design source
`docs/campaign-v2/design/`) are authored region maps — never a
`MapTemplateDefinition` or an arc-builder corridor. New runs play them; a run
without `contentVersion` is a v1 run and stays on the v1 missions to the end:
never reinterpret, merge, migrate or delete the v1 missions, campaigns or saves,
and keep `catalog.versions.contentVersion` unchanged unless the owner decides
otherwise (old saves are checked against it). Facts (`carriedFlags` →
`fact:<flag>`) are kept apart from completion; a practice replay is its own
branch and never advances the run. Campaign battles are manual by rule
(`automationForbidden` in the processor; never only a hidden button). The six
neutrals of the kit (Pegasus, Root-Runner, Serpopard, Baku, Afanc, Ahuitzotl)
were single-form at first; on the owner's request of 2026-10-15 each family now
has exactly one delivered upgrade (Dawncrest Pegasus, Crownroot Runner, Crested
Serpopard, Dreamtusk Baku, Ridgeback Afanc, Crownfin Ahuitzotl; app 1.3.0,
ASSET_PIPELINE.md §21) — never invent an upgrade without delivered art. Their
sprites are frame-region atlases (`SpriteStrip.regions`, constant `sourceScale`,
pixel anchors) from `assets-runtime/campaign-v2/` and
`assets-runtime/battle-fx-neutral-upgrades-v1/`. A neutral hiring site offers
both forms from ONE shared weekly stock (`RecruitFromCamp.creatureId`, validated
against the site's family; omitted = the base form) and trains a visiting base
stack (`TrainAtCamp`); other camps keep their single listed creature
(`campSiteForms`). Shooters fly their own missile and impact
(`projectileProfiles` by creature ID; presentation only). Check a chapter with
`npx vitest run packages/content/test/v2/<campaign>.test.ts` and the autopilot
in both chapter orders (`tools/campaign-v2/sim.measure.ts`;
`npm run campaign-sim -- --content 2`).

