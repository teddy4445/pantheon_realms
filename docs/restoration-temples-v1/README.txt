PANTHEON REALMS — SCENERY AND RESTORABLE SANCTUARIES

36 transparent paintings generated with built-in ImageGen:
- 12 scenery variants: alpine peaks, sandstone arch, basalt columns, granite,
  mossy rocks, obsidian, oak, cedar, palms, blossom tree, flowers and fallen timber.
- 12 sanctuaries: a small shrine and a large temple for each of the six pantheons.
  Every sanctuary has matching ruined and restored artwork (24 images).

PLAY
New campaign levels and skirmishes place sanctuaries near the pantheons represented
by their towns when suitable reachable ground is available. They avoid roads and
existing sites. Old saves keep their existing visitable sites.
Visit a ruin with a hero, choose one gift, then confirm the Favor offering.
Restoration is permanent and each sanctuary grants one gift globally, not per hero
or per week. The restored building remains on the map and is saved with the game.

SMALL SHRINE — 8 Favor, choose one:
  Supplies: 700 Gold, 4 Wood, 3 Stone.
  Guardians: 8 native tier-2 creatures.
  Teaching: an available core spell, preferring tier 2 and native magic when present.
LARGE TEMPLE — 20 Favor, choose one:
  Supplies: 2,000 Gold, 8 Stone, 5 Crystal.
  Guardians: 4 native tier-4 creatures.
  Teaching: an available core spell, preferring tier 3 and native magic when present.
Spell choices name the actual spell and tier before confirmation. They require
a spellbook and sufficient Wisdom; an already-known spell cannot be chosen.
Guardians require a matching army stack or a free slot. Invalid offers never
spend Favor. Other reward choices remain available.

MAP EDITOR
Under landmarks, choose Ruined Shrine (small) or Ruined Temple (large), place it,
and choose its Sanctuary pantheon in the site panel. Both templates compile into
normal playable sites and survive exporting and reopening the map.
Scenery is chosen automatically by climate and terrain, with fuller open land.
Roads, sites, fog of war and graphics-quality settings remain respected.

ART FILES
asset-catalog.png: all 36 paintings, with built/ruined pairs side by side.
in-game/: browser screenshots of temple offers, gifts and restored map buildings.
prompts.json: original generation prompts and references.
ruin-prompts.json: edit prompts used to derive ruins from the intact buildings.
generated-files.json: original ImageGen output paths.
../../assets-source/world-expansion-v1/: original PNGs retained in the repository.
../../assets-runtime/world-expansion-v1/: WebP sprites and runtime manifest.
../../tools/assets/import_world_expansion.mjs: reproducible import and catalog.

Technical: scenery uses 320px sprites; temples use 512px sprites. Paired temple
states retain their full canvas, ground anchor and display scale. New scenery is
presentation only and does not change movement costs or battlefield obstacles.

VERIFIED (23 October 2026)
- TypeScript checks and package-boundary lint passed.
- 49 focused rules, scenery, editor and artwork tests passed.
- Six browser tests passed, one for each pantheon, covering all three reward
  types, both temple sizes, visible ruined/restored sprite changes, and a fresh
  browser save/load check. All 36 images decoded successfully in the browser.
- Production build passed and contains all 36 sprites plus their manifest.
