# Mouse cursors (source art)

The 24 cursor masters for `GPT6_BRIEF_7_CURSORS.md`, delivered by the owner's art
project on 2026-10-03 (`blannder_models/cursor_art_delivery_2026-10-03`): 128 × 128
RGBA PNGs named by cursor ID. `delivery-manifest.json` is the delivery's own record
(design, use, SHA-256 of each file, hotspots at 128/64/32 px); all 24 hashes were
checked against it when the files were copied here.

`npm run cursors:import` (`tools/assets/import_cursors.py`) writes the runtime
cursors to `assets-runtime/ui/cursors/`: 32 px (1x) and 64 px (2x) rasters with the
delivery's hotspots, and the melee sword turned to the six hex sides (0, 60, …, 300°
clockwise on screen) on a grown canvas with its point as the hotspot. The game reads
only the runtime files (never the art project). To replace a cursor, overwrite its PNG
here (same name), update `delivery-manifest.json` if the hotspot moved, and re-run the
import.
