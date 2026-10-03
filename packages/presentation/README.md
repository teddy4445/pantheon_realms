# @pr/presentation — PixiJS 2D views

One long-lived `EngineHost` (a PixiJS WebGL renderer and canvas) and three view controllers:

* `AdventureSceneController` — layered 2D map: terrain (painted ground per climate), roads,
  hex grid and reachable area, decoration, map locations and heroes (depth-sorted), route
  preview, fog of war, effects; 2D camera (pan, zoom); hex picking by inverting the board
  transform; movement playback with the pantheon's mounted map avatar (idle / walk).
* `BattleSceneController` — painted battlefield, logical hex overlay, obstacle and siege
  sprites, creature sprites (defenders mirrored), projectiles and effects; playback of
  committed battle events (strips by semantic name, simple motion where a strip is missing).
* `UnitViewerController` — the bestiary's animated sprite viewer (the animations a creature's
  content calls for, playback controls, reduced-motion still).

`@pr/presentation/core` holds everything without PixiJS (loaded at start-up): the sprite
manifest model and lookup (`sprites.ts`: semantic animation names, anchors, fallbacks,
`requiredAnimations`), hex ↔ screen conversions (`hexmath.ts`), palette, ground/sky art
lookup and graphics presets.

Controllers receive view models built from committed state and immutable events. They never
decide legality or change state. Every sprite comes from `assets-runtime/sprites/manifest.json`
by ID (placeholder or final; ASSET_PIPELINE.md §1); replacing art never needs a code change.
