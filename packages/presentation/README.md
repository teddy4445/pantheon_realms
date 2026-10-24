# @pr/presentation

Renders the adventure map, battles and unit viewer with PixiJS. It translates authoritative state/events into painted sprites, camera motion and effects; it never decides legality, rewards or combat damage.

## Read the code

| Entry point | Responsibility |
| --- | --- |
| [src/core.ts](src/core.ts) | Pixi-free helpers that the menu and UI may import eagerly. |
| [src/engineHost.ts](src/engineHost.ts) | Shared renderer/canvas ownership and scene hosting. |
| [src/adventure.ts](src/adventure.ts) | Map scene, entities, camera and movement playback. |
| [src/battle.ts](src/battle.ts) | Battlefield layout, stack visuals and action playback. |
| [src/viewer.ts](src/viewer.ts) | Animated unit detail scene. |
| [src/figure.ts](src/figure.ts) | Sprite figure motion and animation transitions. |
| [src/sprites.ts](src/sprites.ts) | Manifest contracts, frame selection and animation fallbacks. |
| [src/textures.ts](src/textures.ts) | Shared texture loading, caching and lifetime. |
| [src/decodeQueue.ts](src/decodeQueue.ts) | Bounded decode work with priority for urgent requests. |
| [src/viewportCull.ts](src/viewportCull.ts) | Viewport visibility and padding helpers. |
| [src/groundMosaic.ts](src/groundMosaic.ts) | Deterministic ground variation. |
| [src/sceneryExpansion.ts](src/sceneryExpansion.ts) | Additional environmental artwork. |
| [src/siteAmbient.ts](src/siteAmbient.ts) | Small resource-site animation and particles. |
| [src/mapFlags.ts](src/mapFlags.ts) | Player flag presentation. |
| [src/paintedMagic.ts](src/paintedMagic.ts) | Painted attack sequences and material particle aftermath. |

## Contracts and design decisions

Depends on @pr/rules, @pr/mapgen and pixi.js. UI startup may import values only through @pr/presentation/core; SceneHost loads the heavy entry on demand. Dispose owned sprites/tweens and transient containers, not shared textures still in use. Handle asynchronous loads completing after disposal. Camera and effects must respect player visibility and reduced/simple effects.

## Making a change

Keep frame-rate-independent timing and normalized recipe units. Test animation selection and geometry with unit tests, then inspect the actual scene for anchors, overlap, tile footprints and camera behavior. See the performance guide before adding per-frame allocation or full-map work.

## Verification

Run from the repository root:

```bash
npm test -- packages/presentation/test --maxWorkers=2
npm run typecheck
npm run lint:boundaries
```

See the [developer handbook](../../docs/development/README.md), [extension recipes](../../docs/development/EXTENDING.md), and [complete source atlas](../../docs/development/SOURCE_INDEX.md). Tests and visual checks appropriate to the change are described in the [testing guide](../../docs/development/TESTING.md).
