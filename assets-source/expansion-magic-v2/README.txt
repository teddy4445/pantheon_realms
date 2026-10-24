PANTHEON REALMS — PAINTED MAGIC V2
2026-10-23

Delivery: 54 painted icons and 54 distinct eight-pose animation sheets (432 poses).
42 spells: six per pantheon and six shared. Twelve miracles: two per pantheon.
Created with the built-in image_gen tool, using the existing Apollo Arrow,
Scarab Swarm and Serpent Fire artwork as style references. No API/CLI generator.

SOURCE ART AND PROMPTS (this folder)
  *-icons.png             Seven source icon atlases.
  exp_*.png               The 54 final source animation atlases.
  icon-prompts.json        Full original icon prompt set.
  icon-revisions.json      Final shared-icon revision prompt.
  frame-prompts.json       Full per-ability animation prompts.
  frame-revisions.json     Margin corrections for four animation sheets.
  oni-revision.json        Oni Flame spacing correction.
  plan.json               Each ability's eight-beat action and material choices.
  review/*.png             Seven visual-review contact sheets.
  import-report.json       Per-frame opacity/occupancy checks from the importer.

RUNTIME ART
  assets-runtime/expansion-magic-v2/icons/*.webp
  assets-runtime/expansion-magic-v2/effects/*.webp
  assets-runtime/expansion-magic-v2/icons.json
  assets-runtime/expansion-magic-v2/manifest.json

INTEGRATION
  packages/presentation/src/paintedMagic.ts plays the painted frames with
  authored pose holds, short crossfades and 18 material-particle families.
  It uses ordinary alpha for physical material and limited additive sparks.
  Frame origins stay fixed: the importer locates actual transparent seams,
  then pads every pose around its nominal origin before making runtime atlases.
  Runtime frames are 192 px for spells and 256 px for miracles, loaded on demand.
  Low graphics uses the contact pose with a short fade and no extra particles.
  Speed zero and Skip finish the presentation without changing game outcomes.
  Battle hit reactions and numbers use the authored contact timing.
  Existing expansion spell and miracle IDs stay unchanged; saved games retain them.

PREVIEW
  Start the normal Vite client and open /magic-preview.html.
  Browse icons, filter pantheons, replay individual attacks, play a tour,
  slow playback, or expand the eight-frame sheet.
  The gallery uses the same FxPainter as the game against existing battlefield art.

REBUILD ART
  node tools/assets/import_magic_v2.mjs <path-to-sharp>
  node tools/assets/preview_magic_v2.mjs <path-to-sharp>
  tools/assets/wire_magic_v2.mjs records the visual bindings and icon-manifest switch.

CHECKS
  packages/presentation/test/paintedMagic.test.ts checks all 54 mappings,
  file availability, eight-frame bounds, unique actions and material paths.
  tests/e2e/expansionMagic.spec.ts plays all 54 effects with no missing sheets,
  checks Low/instant playback and cleanup, and exercises gallery filtering/tours/Skip.
  TypeScript, package-boundary validation and the production client build are checked.

The Windows x64 installer was rebuilt on 23 October 2026 with these assets.
Delivery: installer/Pantheon-Realms-Setup-1.0.0-x64.exe (version 1.0.0).
Package verification compares all 108 artwork files and the client JS/CSS with
the source build, then checks the packaged main menu and New Game screen.
