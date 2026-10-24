MAP TOWN DEVELOPMENT — SIX PANTHEONS

Adventure-map settlements now select their artwork from the civic hall level:
1. Small settlement, simple enclosure and modest hall or shrine.
2. Established town, more houses and a low stone wall.
3. Fortified city, larger hall and a strengthened gate.
4. Ornate capital, retaining the game's existing mature town sprite.

Greek, Norse, Egyptian, Japanese, Celtic and Mesoamerican towns each have four
bindings. Missing or zero civic levels use level 1; levels above 4 use level 4.
Explicit campaign site artwork takes priority so story locations remain intact.
Missing staged artwork falls back to the original pantheon town.
No saved-game schema, costs, defenses or gameplay rules were changed.

ART
The 18 new transparent PNG sources were generated with built-in imagegen using
the corresponding original mature map town as the reference. prompts.json
contains the exact prompts. Level 4 WebP copies retain the original artwork.
Runtime WebPs are normalized to a shared contact point and slightly growing
footprints, preserving transparency. index.html compares all 24 appearances.

Reimport:
node tools/assets/import_map_towns.mjs [absolute path to installed sharp package]

Runtime:
assets-runtime/map-town-development-v1/manifest.json
assets-runtime/map-town-development-v1/*.webp

Verification:
npx vitest run packages/ui/test/mapTownArt.test.ts
npx playwright test --config playwright.map-towns.config.ts
validation.json records source transparency. in-game contains the map screenshots
and ordinary saved games produced by browser verification.
