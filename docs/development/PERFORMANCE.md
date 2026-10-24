# Performance: preserve the painted world

The game uses many large 2D assets. Improve loading, visibility and lifetime before lowering every image's quality. The October 23 optimization work is recorded in [release notes](../performance-20261023/README.txt).

## Runtime controls

| Mechanism | Code | Reason |
| --- | --- | --- |
| Pixi-free menu and lazy scene loading | [SceneHost](../../packages/ui/src/scene/SceneHost.tsx), [core entry](../../packages/presentation/src/core.ts) | Avoid loading the renderer just to show menus. |
| One renderer shared across scene controllers | [EngineHost](../../packages/presentation/src/engineHost.ts) | Avoid repeated context setup and unnecessary canvas lifetimes. |
| Viewport culling | [viewportCull.ts](../../packages/presentation/src/viewportCull.ts), adventure controller | Avoid drawing or updating distant scenery. Keep enough margin for sprites extending beyond their tile. |
| Bounded image decoding | [decodeQueue.ts](../../packages/presentation/src/decodeQueue.ts), [textures.ts](../../packages/presentation/src/textures.ts) | Four concurrent decodes by default; urgent animation requests overtake waiting scenery. Uploads do not hold decode slots. |
| Ground caching and deterministic variation | [groundCache.ts](../../packages/presentation/src/groundCache.ts), [groundMosaic.ts](../../packages/presentation/src/groundMosaic.ts) | Reuse terrain work and make variation independent of gameplay RNG. |
| Simple-effects mode | [graphics.ts](../../packages/presentation/src/graphics.ts), [paintedMagic.ts](../../packages/presentation/src/paintedMagic.ts) | Reduce particles and playback complexity without changing rules outcomes. |

Textures may be shared. Destroy a scene's sprites and transient particle containers without destroying a shared texture still used elsewhere. Release owned decoded bitmaps when their texture source is destroyed, as part of loader teardown. Treat promises resolving after scene disposal as normal cancellation, not as permission to attach objects to a destroyed layer.

## Packaged asset derivatives

[optimize-assets.mjs](../../apps/desktop/scripts/optimize-assets.mjs) works on the desktop renderer copy. It generates cached WebP derivatives and path remaps rather than overwriting the source artwork. The release pass converted 757 large PNG images and resized 54 oversized portraits from 1024×1536 to 640×960. Exact selection policy lives in the optimizer, not in this summary.

The verified October 23 installer went from **2,062,723,316** to **849,739,984 bytes**, about **59% smaller**. This is an artifact-size result, not an FPS or RAM benchmark. The supplied 1.0.0 download describes the latter build.

## Measure a proposed optimization

1. Pick a reproducible save/seed, camera position, map size and graphics setting.
2. Measure startup, first scene, pan/zoom, hero travel and a large battle separately. Separate first-load decode costs from a warm cache.
3. Compare visual captures at actual gameplay scale. Check alpha edges, text, atlas seams, roads, shorelines and creature anchors.
4. Check scene transitions and repeated visits for retained objects. A faster first frame is not a success if memory keeps growing.
5. Keep rules and presentation timing separate. Skipping particles must not skip combat or change RNG consumption.

[Load-time tooling](../../tools/perf/load-time.mjs) provides a starting measurement harness. Tests for decode priority, culling and animation timing guard implementation invariants; they do not replace profiling on the target hardware.
