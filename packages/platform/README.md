# @pr/platform

Defines the small host boundary for saves, preferences and window actions. Browser and Electron adapters let the same game run without platform-specific branches in its rules. The contracts also admit memory-backed test doubles.

## Read the code

| Entry point | Responsibility |
| --- | --- |
| [src/contracts.ts](src/contracts.ts) | SaveRepository, preferences and native-window contracts. |
| [src/browser.ts](src/browser.ts) | Browser storage and host behavior. |
| [src/desktop.ts](src/desktop.ts) | Adapter to the validated Electron preload bridge. |
| [src/index.ts](src/index.ts) | Public exports and detection of the browser or desktop host. |

## Contracts and design decisions

No workspace dependencies. Do not place gameplay decisions here. Treat persistence failures as ordinary errors and preserve an existing save when a write fails. Desktop paths and IPC validation remain the main process responsibility.

## Making a change

Add capability to the contract first and provide the appropriate implementations/fallbacks. Test the adapter contract without importing Electron into the browser bundle. User saves and preferences must remain separate from generated build assets.

## Verification

Run from the repository root:

```bash
npm test -- packages/platform/test --maxWorkers=2
npm run typecheck
npm run lint:boundaries
```

See the [developer handbook](../../docs/development/README.md), [extension recipes](../../docs/development/EXTENDING.md), and [complete source atlas](../../docs/development/SOURCE_INDEX.md). Tests and visual checks appropriate to the change are described in the [testing guide](../../docs/development/TESTING.md).
