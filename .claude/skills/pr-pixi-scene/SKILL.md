---
name: pr-pixi-scene
description: "Create, debug or optimize the Pantheon Realms PixiJS 2D views in packages/presentation: the layered Adventure Map, the Tactical Battle presentation, sprite animation and the animated Unit Detail viewer. Use for engine-host lifecycle, sprite manifest lookups, anchors and facing, hex picking, camera pan/zoom, depth sorting, playback speed and offline/CSP loading. Keep React, logical map data and authoritative rules separate from rendering."
---

# PixiJS 2D Scene Production

Read [project-contract.md](references/project-contract.md), `packages/presentation/README.md`, `ARCHITECTURE.md` and the sprite-manifest section of `ASSET_PIPELINE.md`. Verify APIs against the installed `pixi.js` version (pinned in `packages/presentation/package.json`) and the official PixiJS 8 guides; do not paste unpinned examples into production code.

## Package map (`packages/presentation/src`)

| Module | Owns |
| --- | --- |
| `engineHost.ts` | One long-lived Pixi renderer (WebGL) shared by the views; its own frame loop with a frame cap; resize, context loss, dispose |
| `adventure.ts` | Adventure Map layers: backdrop, painted terrain, roads, grid, reach, ground markers, objects depth-sorted by screen y, fog, effects; 2D camera pan/zoom with clamps |
| `battle.ts` | Painted battlefield, logical hex overlay, obstacles, siege pieces, creature stack sprites, projectiles, effects, overlays; the React HUD sits on top |
| `viewer.ts` | Animated Unit Detail viewer: animation buttons, base/upgraded switch, reduced-motion still frame |
| `figure.ts` | `SpriteFigure`: loops run on the frame clock, one-shots on the tween clock so skip/instant finishes them at once |
| `sprites.ts` | Manifest types, animation vocabulary, fallback chain, `requiredAnimations` |
| `hexmath.ts` | The only screen-to-hex and hex-to-screen transforms (pointy-top hexes, vertical squash) |
| `textures.ts`, `staticSprites.ts`, `graphics.ts`, `tween.ts`, `palette.ts`, `environmentArt.ts` | Texture loading, still sprites, quality presets, tweens, colours, ground/sky art lookup |

## Workflow

1. Bind a view controller to a view model built from committed state and immutable events. Do not infer passability, reach or targets from sprites, textures or pixels.
2. Convert positions only through `hexmath.ts`. Picking inverts the board transform and never depends on sprite size, alpha or bounds.
3. Look up every sprite by ID in `assets-runtime/sprites/manifest.json` through `sprites.ts`; never hard-code file paths or frame sizes. Place each strip by its explicit anchor (battle creatures bottom-centre at the feet, map heroes at the ground point between the mount's feet, map sites at their ground contact, effects centred) and its `pixelsPerHex`.
4. Every sprite is authored facing right; the renderer mirrors enemies and defenders. Depth-sort map objects by screen y.
5. Request animations by semantic name (`idle, move, attack, defend, hit, death, victory`, plus `shoot`, `takeoff/fly/landing` and `ability` where the creature has them). Let the fallback chain resolve missing optional strips; a missing `death` strip lays the figure down. A missing sprite shows a visible placeholder, never a hidden stack.
6. Presentation never decides outcomes: render code and animation callbacks consume no RNG, change no state and reveal no hidden information. Normal, fast and instant playback must produce identical final state and hashes.
7. Keep one engine host. Dispose textures, ticker callbacks, listeners and display objects on view exit and on React development remounts. Respect quality presets and reduced motion.

## Boundaries and offline

- `@pr/presentation/core` stays PixiJS-free. The UI takes values only from it and loads the views lazily through `packages/ui/src/scene/SceneHost.tsx`. `npm run lint:boundaries` (`tools/check-boundaries.mjs`) enforces this.
- The desktop build runs under a strict CSP: Pixi is loaded with the `pixi.js/unsafe-eval` shim, so no `eval` is needed. Textures come only from local `assets-runtime/`; no CDN or remote URLs.

## Checks

Run `npm run lint:boundaries`, `npm run typecheck` and `npm test` (includes `packages/presentation/test`), then the Playwright specs `tests/e2e/sprites2d.spec.ts` and `tests/e2e/heroes.spec.ts` through `npm run test:e2e`. Use the local `inspect_sprite_manifest` audit tool for placeholder/final counts and missing files. A screenshot shows how a frame looks, not that rules are correct.

Output controller changes, manifest IDs used, before/after screenshots, lifecycle and frame-time evidence on identified hardware, offline/CSP findings, and the placeholders still in use.
