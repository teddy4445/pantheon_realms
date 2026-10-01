# Working agreements for AI-assisted development

Read `ARCHITECTURE.md`, `DEVELOPMENT_STATUS.md` and `IMPLEMENTATION_PLAN.md`
before changing code. `DESIGN_PROPOSALS.md` holds the proposed
designs (signatures, second god choice, support buildings; difficulty, story
scenes, skills/spells/sets, interventions, world features, random maps,
hot-seat, results screens) — proposals, not owner decisions.
`CAMPAIGN_2_NORSE_OUTLINE.md` is an unapproved campaign outline: do not build
it until the owner approves. The design documents in `docs/` are the source of truth;
do not reopen decisions they settle.

## Non-negotiables

* Stack: TypeScript rules + AI, React UI, Babylon.js 3D, Electron desktop,
  browser build from the same core. Do not substitute engines.
* All game state changes go through `processCommand`. React, Babylon,
  animation callbacks and the AI never mutate `MatchState`.
* The simulation core (`rules`, `content`, `mapgen`, `campaign`, `ai`,
  `session`) stays DOM-free and Node-free. Run `npm run check`.
* Content is data: new gods, heroes, buildings, creatures and abilities are
  definitions using the shared requirement/effect vocabulary, not new
  classes or `if (id === …)` branches. Pantheon signatures are effect bundles
  (`PantheonDefinition.signature`); a new mechanic is a new effect *type* any
  pantheon or god can use.
* Skirmish-only features stay behind `ScenarioFeatures` / `scope: 'expanded'`;
  The Three Beacons keeps them off. Story scenes are data on the mission and
  never change play.
* Six pantheons, seven tiers, one family per tier, exactly base + one upgrade;
  18 town locations (7 dwellings + 11 support). Gods per pantheon are
  content-driven.
* Never describe placeholder behavior as final. Keep `DEVELOPMENT_STATUS.md`
  honest: measured results vs targets, commands actually run.
* The desktop game must work with networking disabled; no CDN assets.
* Start-up size: `@pr/ui` takes values only from `@pr/presentation/core`;
  Babylon is imported by module path and the 3D layer loads on demand through
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
npm run assets:check     # unit + mounted-hero models: Khronos validator + manifest/GLB + game-binding tests
npm run assets:calibration  # regenerate the axis/scale calibration GLB
python3 tools/assets/prepare_placeholders.py  # re-crop town placeholders from "support images/"
python3 tools/assets/prepare_ui_art.py        # regenerate opening-screen art, icons, app icon from assets-source/ui/
```

Interface art: sources in `assets-source/ui/`, generated runtime files and
provenance in `assets-runtime/ui/` (ASSET_PIPELINE.md §11). The visual
language lives in the shared kit and `styles/components.css`; style screens
through those, not one by one.

Mounted adventure-map heroes: six animated GLBs copied from the owner's
separate Blender project into `assets-runtime/heroes/` with a path-updated
`animation_manifest.json` (ASSET_PIPELINE.md §12). The Blender project is
never a runtime dependency; to replace a model, copy the GLB, update its
checksum in the manifest and run `npm run assets:check`.

Battle and viewer scenes are right-handed (GLB models load natively); keep
`cellWorld`/`worldCell` in `meshkit.ts` as the only battle board transform.
UI tests build scenario fixtures as ordinary save files (`tests/e2e/fixtures.ts`)
and bring them in through Load → Import — never through privileged hooks.
