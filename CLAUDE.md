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
  (`2D_MIGRATION_AUDIT.md`, 2026-10-03) deleted the obsolete Babylon.js 3D
  layer; do not reintroduce 3D code, GLB/glTF assets or Blender steps.
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
  The Three Beacons keeps them off (The Winter Oath and the four arc campaigns turn expanded content on). Story scenes are data on the mission and
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
node tools/perf/load-time.mjs [dist]          # start-up + first-scene load times (after npm run build)
python3 tools/audio/make_placeholders.py      # regenerate placeholder music/sounds + audio manifest (numpy, scipy, ffmpeg)
npm run sprites:plan          # content plan (forms, animations, sites, battlefields) → assets-source/sprites/content-plan.json
npm run sprites:placeholders  # regenerate labelled placeholder sprites + assets-runtime/sprites/manifest.json (keeps final entries)
npm run sprites:cut           # cut GPT-6 sheets from assets-source/sprites/sheets/ into single files (layouts: sheet-layouts.json; previews in sheets/_preview/); --self-test checks the cutter
npm run sprites:import        # final sprites from assets-source/sprites/final/ (cut files or single files) → manifest status "final"
npm run sprites:queue         # regenerate GPT6_2D_CONTENT_GENERATION.md + sheet-layouts.json from the manifest's actual gaps
npm run vfx:list              # regenerate VFX_MAGIC_AND_FAVORS.md (spell, miracle, gift VFX still to make; looks in tools/assets/vfx/briefs.ts)
python3 tools/assets/prepare_placeholders.py  # re-crop town placeholders from "support images/"
python3 tools/assets/prepare_ui_art.py        # regenerate opening-screen art, icons, app icon from assets-source/ui/
npm run icons:catalog    # regenerate ICON_CATALOG.md + assets-source/icons/ICON_CATALOG.xlsx/.csv from the game
npm run icons:import     # register final icons dropped into assets-source/icons/final/ (named by asset ID)
npm run cursors:import   # mouse cursors from assets-source/ui/cursors/ (Brief 7, 128 px, named by cursor ID) → 32 px + hotspots in assets-runtime/ui/cursors/
npm run art:import       # painted art from assets-source/art/final/ → assets-runtime/art/ (story art, terrain, battlefields, skies, miracle cards, splashes, banners; never upscales)
```

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
`GPT6_2D_CONTENT_GENERATION.md` is the production queue for the remaining
art, as *sheets* (many sprites per image: one per creature form, one per map
hero, grouped objects and effects); regenerate it with `npm run sprites:queue`
after the manifest changes.

UI tests build scenario fixtures as ordinary save files (`tests/e2e/fixtures.ts`)
and bring them in through Load → Import — never through privileged hooks.
