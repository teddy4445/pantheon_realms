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
* The simulation core (`rules`, `content`, `mapgen`, `campaign`, `ai`,
  `session`) stays DOM-free and Node-free. Run `npm run check`.
* Content is data: new gods, heroes, buildings, creatures and abilities are
  definitions using the shared requirement/effect vocabulary, not new
  classes or `if (id === …)` branches. Pantheon signatures are effect bundles
  (`PantheonDefinition.signature`); a new mechanic is a new effect *type* any
  pantheon or god can use. Site kinds (e.g. the two-way `portal`) and
  objective conditions are shared data too.
* Skirmish-only features stay behind `ScenarioFeatures` / `scope: 'expanded'`;
  The Three Beacons keeps them off (The Winter Oath and the four arc campaigns turn expanded content on).
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
xvfb-run -a node tools/desktop-smoke.mjs   # headless desktop smoke (after desktop:build)
PR_SMOKE_EXE=apps/desktop/release/linux-unpacked/pantheon-realms xvfb-run -a node tools/desktop-smoke.mjs  # packaged-layout smoke
npm run balance      # AI-vs-AI balance report (tools/balance/README.md); re-run after any value change
npm run balance -- random --matches 4   # random-map seat fairness only
npm run balance -- random1v1 --matches 30   # every pantheon pairing on random maps, both seats (nine layouts; --map-types, --sizes, --focus); target: each pantheon 0.45–0.55
node tools/perf/load-time.mjs [dist]          # start-up + first-scene load times (after npm run build)
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
npm run maps:build       # writes the authored skirmish maps (packages/content/src/skirmish/maps/*.prmap.json) from tools/maps/maps.ts, checked, + layout guides for Brief 14
npm run art:siege-guide  # the siege layout guide for GPT-6 Brief 15 (assets-source/art/briefs/guides/siege.layout.png)
```

Authored skirmish maps (2026-10-05): six custom map documents in
`packages/content/src/skirmish/maps/` (catalog `skirmishMaps`), designed for
one empire in `tools/maps/maps.ts` and copied by exact hex symmetry; edit the
design and run `npm run maps:build`, never the JSON. The custom map types
live in `@pr/rules` (`definitions/customMap.ts`). Their pictures are GPT-6
Brief 14 (`assets-source/art/briefs/GPT6_BRIEF_14_SKIRMISH_MAPS.md`); siege art
(each pantheon's walls, gates, towers, keep, siege battlefield, the catapult)
is Brief 15 (`GPT6_BRIEF_15_SIEGES.md`). A dwelling never requires a dwelling
of a higher tier (owner decision 2026-10-05; `BuildingTreeValidator`).

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
optional town-background repaints, so the town backgrounds are still the
cropped concept placeholders in `assets-runtime/placeholders/`. What GPT-6 can
still make is in `assets-source/art/briefs/GPT6_BRIEF_13_RELEASE_POLISH.md`
Part A (the six town backgrounds); its 94 icons (Parts B–E) were delivered and
imported on 2026-10-05 (the main-menu icons are 192 px, the rest 96 px;
`tests/e2e/brief13.spec.ts`). Three concept crops the brief did not list are
still shown: `icon.marker.hero` and `icon.marker.enemy-hero` (tile panel over a
hero) and `icon.marker.encounter` (a failed objective in the Journal). The god cards
show their blessings, price and state as icon rows (`components/godIcons.tsx`)
whose tooltips keep the content's sentences.

UI tests build scenario fixtures as ordinary save files (`tests/e2e/fixtures.ts`)
and bring them in through Load → Import — never through privileged hooks.
