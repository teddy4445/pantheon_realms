PANTHEON CITY ART — HEROES III INSPIRED EXPANSION

This kit extends the accepted Greek city treatment to Norse, Egyptian, Japanese,
Celtic and Mesoamerican towns. Each city has:
  - A complete city concept (full-city.png).
  - Four empty landscapes, from village infrastructure to a ceremonial capital.
  - A matching damaged/recovery landscape.
  - 33 transparent building images covering every catalog level at 18 locations.
  - An editable layered preview, a building gallery and a background gallery.

The concepts establish art direction. The runtime city is assembled from generated
terrain and individual building layers; it is not a lossless cutout of the concept.
The terrain pads retain a common layout so the same upgrade chain stays anchored
while infrastructure changes. Each pantheon has its own materials and vegetation.

Open index.html through a local HTTP server to compare the five kits.
preview.html supports base/max presets, per-building version selection, showing
and hiding buildings, dragging, size/depth adjustments and exporting placements.
The background stage follows the selected civic hall level.

GAME TESTING
The in-game/ folders contain ordinary .prsave.json files for all four stages.
Start the game, choose Load, import a save and open the player's town.
Stage 1 has the resources needed to try the civic hall upgrade.
Recovery saves exercise the damaged landscape and its repair transition.

PRODUCTION
All artwork was generated with the built-in image_gen tool. No external image API
or fallback CLI was used. prompts.json records the individual asset prompts and
reference roles; concept-prompts.json records full-city concepts.
revision-prompts.json records the final pass that gives service buildings and
creature habitats more distinct functional silhouettes.
Original PNGs are preserved here. The runtime importer copies them to
assets-runtime/pantheon-cities-h3-v1 and registers stable catalog art IDs.
No building costs, prerequisites, recruitment effects or saved-game IDs change.

Commands, from the repository root:
  node tools/assets/import_pantheon_cities.mjs --prepare
  node tools/assets/import_pantheon_cities.mjs
  node tools/assets/verify_pantheon_cities.mjs
  npx playwright test --config playwright.pantheon-cities.config.ts

validation.json records image transparency and preview checks.
all-versions.png, assembled-preview.png and in-game screenshots support review.
