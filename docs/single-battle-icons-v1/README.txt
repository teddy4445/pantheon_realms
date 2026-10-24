Single Battle painted icons — integrated 23 October 2026

32 original icons generated with built-in ImageGen using two existing game icons as style references.
The complete icon-to-screen map is in icon-map.json; prompts and references are in prompts.json.
Open index.html for the icon catalog with actual-size samples, or icon-catalog.png for the contact sheet.

Source masters: assets-source/ui/single-battle-icons-v1/*.png
Runtime assets: assets-runtime/single-battle-icons-v1/*-{64,128}.webp
64 transparent WebP files total 395,794 bytes (about 0.4 MB).
Runtime manifest: assets-runtime/single-battle-icons-v1/manifest.json
Typed registry: packages/ui/src/assets/singleBattleIcons.ts
Importer: tools/assets/import_single_battle_icons.mjs (pass a local Sharp module path if needed).
generated-files.json records original ImageGen output locations; all masters are also copied into the project.

Integration covers New Game mode selection, Land/Siege/Naval setup, army controls, board tools,
terrain/climate/rules/seed settings, advanced settings, preset library, and battle results.
Undo/Redo share the painted back arrow; only the Redo image is mirrored.
Existing creature portraits, pantheon emblems, modal chrome, and shared shell controls are retained.
Import, export, load, delete, rotation, replay, and settings now have distinct action artwork.
Small stack controls retain compact dimensions. Short desktop windows use a shorter board preview
so the seed/settings controls remain in view.

Validation:
- All 32 masters have real transparent alpha; importer generates padded 64px and 128px assets.
- npm run typecheck: passed.
- npm run lint:boundaries: passed.
- npm run build: passed; all 64 WebP files verified in the production output.
- npx playwright test --config playwright.single-battle-icons.config.ts: passed.
  Checks loaded artwork, no old outline icons, add/undo/redo, advanced settings, preset save/load,
  Land/Siege/Naval setup, 1024x768 and 1280x720 layout, deployment, and battle results.
  Screenshots from the actual game are saved alongside this file.
