# @pr/ui

The React application: navigation, menus, adventure and battle controls, city management, campaign chronicles, dialogs, encyclopedia, map editor, preferences and asset lookup. It connects session state to presentation and audio.

## Read the code

| Entry point | Responsibility |
| --- | --- |
| [src/app/store.ts](src/app/store.ts) | Application orchestration, screen state and session notifications. |
| [src/screens](src/screens) | Player-facing screens, including Adventure, Battle, Town and SingleBattle. |
| [src/dialogs](src/dialogs) | Encounters, rewards, world choices, overlays and cheat UI. |
| [src/components](src/components) | Reusable controls, art-backed widgets and panels. |
| [src/scene/SceneHost.tsx](src/scene/SceneHost.tsx) | The one lazy gateway to heavy PixiJS scene controllers. |
| [src/assets/manifest.ts](src/assets/manifest.ts) | Stable asset IDs and art-pack precedence. |
| [src/audio](src/audio) | Game-event-to-audio mapping and UI audio integration. |
| [src/app/preferences.ts](src/app/preferences.ts) | User preference handling. |
| [src/styles](src/styles) | Screen and component styles. |

## Contracts and design decisions

Use GameSession commands for gameplay. UI selection and presentation state must not become a second MatchState. Asset overlay order is intentional: current packs can replace older IDs. Keep imports from @pr/presentation Pixi-free at startup except the approved lazy loader. Keyboard focus, accessible names and readable reduced-motion states are part of the interface contract.

## Making a change

Reuse the existing painted dialog/button system. Wire choices to existing quotes and commands, add keyboard behavior, and inspect desktop and small-window layouts. Test state-derived labels and availability independently where useful; browser tests verify full interactions.

## Verification

Run from the repository root:

```bash
npm test -- packages/ui/test --maxWorkers=2
npm run typecheck
npm run lint:boundaries
```

See the [developer handbook](../../docs/development/README.md), [extension recipes](../../docs/development/EXTENDING.md), and [complete source atlas](../../docs/development/SOURCE_INDEX.md). Tests and visual checks appropriate to the change are described in the [testing guide](../../docs/development/TESTING.md).
