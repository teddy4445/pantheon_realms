WORLD POLISH V2 — 23 October 2026

Integrated into the game:
- Six painted temple-dialog banners: Greek, Norse, Egyptian, Japanese,
  Celtic and Mesoamerican. The temple's pantheon selects its panorama.
- Sixteen small map flags: standard and swallowtail designs in blue, red,
  green, amber, purple, teal, ivory and charcoal. Used by ownership markers,
  heroes, caravans and ships; nearby campaign color shades select a matching flag.
- Forty-eight scenery sprites in six groups of eight: woodland, mountains,
  drylands, freshwater banks, coastlines and small ground details. Placement
  follows climate, water type and the existing road/site clearance rules.
- Larger seamless ground mosaics, blended from the existing terrain paintings.
  Deterministic rotations and soft overlapping patches reduce repetition.
  Each mosaic spans about sixteen hexes and is baked once when the map opens.

These visual changes also appear when existing saved maps are reopened.
They do not change movement costs, terrain rules or battle obstacles.

ART AND PREVIEWS
Art generated using built-in ImageGen with existing game art as references.
prompts.json: all fourteen generation prompts and references.
sheets.json: the eight named elements on each scenery sheet.
generated-files.json: original ImageGen output locations.
asset-catalog.png: all 48 scenery pieces and 16 flags.
banner-catalog.png: all six temple panoramas.
in-game/: actual map and temple screenshots for all six pantheons.

Original panels: assets-source/world-polish-v2/
Game-ready WebPs and manifest: assets-runtime/world-polish-v2/
The 70 WebPs plus manifest occupy 4,589,320 bytes (about 4.38 MiB).

IMPORT
Run from the repository root:
  node tools/assets/import_world_polish.mjs <absolute path to sharp module>
The importer reads generated-files.json, preserves source panels, separates
objects by their alpha outlines, and writes normalized transparent sprites.
This preserves branches and roots that cross the nominal sheet cell borders.

VERIFICATION
- TypeScript checks for rules, client and desktop: passed.
- Module boundary check: passed.
- Scenery, ground variation, flags and art registration: 23 tests passed.
- Ship motion, ground edges and hidden travel regression: 19 tests passed.
- Browser integration: all six pantheons passed; all 70 art files decoded,
  painted town flags loaded, six ground mosaics loaded, temple banners opened.
- Production client build: passed.

No installer was requested or created for this update.
