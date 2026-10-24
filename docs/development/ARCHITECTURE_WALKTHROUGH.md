# Follow an action through the game

The detailed [architecture reference](../../ARCHITECTURE.md) describes the contracts. This walkthrough gives a contributor concrete entry points to inspect while changing a feature.

## 1. Bootstrap and content

The [client entry](../../apps/client/src/main.tsx) mounts the React application with a platform adapter. [Catalog assembly](../../packages/content/src/catalog.ts) combines the pantheons, common libraries and campaigns into indexed definitions. The loader validates references and freezes the resulting catalog; game code reads those definitions rather than mutating them.

Content IDs join definitions, saved state and asset manifests. A spell name can change without changing its ID; changing an ID requires considering saves, missions, AI, presentation and tests.

## 2. UI intent and session ownership

The [UI store](../../packages/ui/src/app/store.ts) coordinates selection, navigation, pending interactions and session notifications. Its screen state is not a second rules engine. [GameSession](../../packages/session/src/session.ts) owns the authoritative match, invokes the processor and exposes checkpoints and campaign transitions.

For a new action, begin with [GameCommand](../../packages/rules/src/commands/commands.ts). Commands describe intent and carry identifiers used by validation and duplicate-command handling. Read the neighboring command rather than manufacturing state mutations in a button handler.

## 3. Validation, draft and commit

[processCommand](../../packages/rules/src/engine/processor.ts) is the command dispatch boundary. Accepted commands operate on the engine's draft and return a new revision with events. Rejection preserves the original match. [Resolvers](../../packages/rules/src/resolvers) answer questions used by previews and validation; [systems](../../packages/rules/src/systems) implement authoritative transitions.

When adding a rule, ask:

1. What must be true before the action is legal?
2. Can the UI explain the same requirement without mutating state?
3. Which resources, RNG streams and persistent records change on success?
4. Which events let presentation explain the result?
5. What happens after save/load, duplicate submission, or a rejected action?

Keep these answers in the rule's documentation and regression tests. Rendering speed, missing art and animation cancellation must not change the outcome.

## 4. Example: rebuilding a temple

[restorationTemples.ts](../../packages/rules/src/systems/restorationTemples.ts) constructs shared definitions for authored, generated and editor sites. New-map installation finds reachable land and avoids existing sites. Definitions and instance state are saved so loading a game does not randomly reposition a temple.

The site uses the existing map-event choice system. A confirmed choice spends Favor and grants one gift; an already restored site cannot pay out again for another hero. [world.ts](../../packages/rules/src/systems/world.ts) applies those authoritative choices. [WorldDialogs.tsx](../../packages/ui/src/dialogs/WorldDialogs.tsx) presents the available choices. Presentation derives ruined/built artwork from state; it never grants the reward.

This is why a visual "rebuilt" animation must not be the point at which payment occurs: it may be skipped, interrupted or absent in headless tests.

## 5. Visual playback and camera

[SceneHost](../../packages/ui/src/scene/SceneHost.tsx) loads the PixiJS presentation module on demand. [EngineHost](../../packages/presentation/src/engineHost.ts) owns the renderer, while [adventure](../../packages/presentation/src/adventure.ts), [battle](../../packages/presentation/src/battle.ts) and [viewer](../../packages/presentation/src/viewer.ts) controllers manage scene-specific objects.

Logical coordinates are authoritative; on-screen positions interpolate during playback. A hero's camera should follow its displayed journey rather than immediately jumping to its final logical coordinate. Enemy presentation must respect visibility. Do not use render visibility to change pathfinding or game rules.

[SpriteFigure](../../packages/presentation/src/figure.ts) handles creature motion. [paintedMagic.ts](../../packages/presentation/src/paintedMagic.ts) combines authored strips and material particles. [textures.ts](../../packages/presentation/src/textures.ts) and [decodeQueue.ts](../../packages/presentation/src/decodeQueue.ts) manage loading and decode pressure. All of these can change without changing combat arithmetic.

## 6. Persistence and platforms

[save.ts](../../packages/session/src/save.ts) wraps a plain-data snapshot in a versioned, checksummed envelope. A snapshot includes the logical map, RNG state and pending decisions; it excludes textures, DOM objects and native handles. Optional presentation intent has its own versioned contract.

[Platform contracts](../../packages/platform/src/contracts.ts) isolate storage and window behavior. Browser adapters use browser storage, desktop adapters call the preload bridge, and the contracts allow memory-backed test doubles. Electron's [main process](../../apps/desktop/src/main.ts) validates IPC and handles native files. New gameplay belongs outside that process.

## 7. Package boundaries are executable documentation

[The boundary checker](../../tools/check-boundaries.mjs) defines allowed dependencies and specific asset-manifest exceptions. It also prevents eager PixiJS imports through the UI startup path. The core TypeScript configuration omits DOM types. Run both checks when changing imports; an exception should explain a real architectural need, not hide a dependency cycle.
