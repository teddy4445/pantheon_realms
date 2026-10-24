LIVING RESOURCE SITES AND SHORES

Enabled in the adventure map for all pantheons:
- Windmill sails turn above a separately painted stationary body.
- Sawmill chimneys emit soft drifting smoke.
- Crystal deposits glint at staggered intervals.
- Gold mines and quarries have small working miners.
- Shorelines have subtle wavelets, sparse swaying reeds and occasional bird passes.
- Towns directly beside water receive a small decorative wooden pier.

Effects do not change resources, movement, construction or embarkation rules.
The pier is scenery, not a new usable harbor or movement tile.
Activity appears only in current sight; shore details require both neighboring
land and water cells to be visible. Animation is paused under reduced motion and
Low graphics, and skipped outside the viewport. Shore dressing is capped at 120
groups and regenerated when terrain changes, including sluices.

ART
windmill-body.png was generated using built-in imagegen with the existing map
windmill as reference. prompt.txt contains the exact edit prompt. The runtime
body is assets-runtime/map-life-v1/windmill-body.webp. Rotating sails and the
small ambient effects use reusable Pixi geometry; no per-frame image generation.

Reimport the body from the repository root:
node tools/assets/import_map_life.mjs [absolute path to installed sharp package]

PREVIEW
living-map.png and windmill-close.png show the integrated artwork.
living-map.prsave.json is an ordinary test save for Load -> Import. Its small lake
beside the Greek town was added only to the test fixture to demonstrate piers.
No actual map definition was modified.

CHECKS
npx vitest run packages/presentation/test/mapLife.test.ts
npx playwright test --config playwright.map-life.config.ts
