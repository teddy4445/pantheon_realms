Living map and creature motion, October 2026

Uses existing creature frames and procedural Pixi shapes; no new sprite frames.
Applies to all pantheons and existing saves wherever the corresponding sites exist.

Creature improvements:
- Shared pose timeline for frame selection, melee contact and projectile release.
- Variable six-pose attack holds (110,150,60,80,100,160 milliseconds).
- Weighted idle holds and stable per-instance idle offsets.
- Distance-driven walking cycles, eased departure and arrival.
- Subtle breathing, weight shift, hover and body-transform transitions.
- Reduced motion disables ambient body movement.
- Guards preload idle only; map figures preload map-relevant actions.
- Reference-counted creature strips; unused decoded texture cache capped at 24 MiB.
  Active textures are retained. Existing frame-region atlas support is preserved.

26 new map effects:
01 Town pennants
02 Warm town windows
03 Tower beacon flame
04 Circling tower birds
05 Campfire flame
06 Campfire embers
07 Shrine light rays
08 Shrine motes
09 Floating stone runes
10 Swinging hut lantern
11 Tent pennant cloth
12 Portal spiral motes
13 Expanding portal rings
14 Floating relic halo
15 Treasure glint
16 Statue votive flames
17 Falling sacred-tree leaves
18 Tree/grove butterflies
19 Waterfall stream streaks
20 Waterfall mist
21 Waterfall foam ripples
22 Ruins dust
23 Ruins fireflies
24 Sluice droplets
25 Moving mine cart
26 Quarry dust

These supplement the earlier resource and coastline effects.
Effects require loaded, currently visible, on-screen sites. Claimed pickups stop
glinting. Pools are allocated once, with a map-wide limit of 240 active particles.
Reduced motion and low graphics disable the new ambience. System motion changes
are observed while the adventure screen is open.

Preview: map-overview.png and map-detail.png.
Test save: living-map.prsave.json (import through Load -> Import).

Verification:
- 79 targeted presentation unit tests.
- Creature browser checks: bestiary states/upgrades, reduced motion, battle
  placement/mirroring, and identical instant/normal battle outcomes.
- Map browser check: active effects, pool budget, reduced-motion pause/resume.
- TypeScript, package boundaries, production build, and diff whitespace checks.

This does not add skeletal/limb rigs or repack existing art files. Those require
separate asset preparation; the motion changes here reuse the delivered artwork.
