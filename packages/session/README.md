# @pr/session

Hosts the authoritative match and campaign state for the application, coordinates command results and checkpoints, and serializes plain-data save envelopes. It has no storage I/O or rendering dependency.

## Read the code

| Entry point | Responsibility |
| --- | --- |
| [src/session.ts](src/session.ts) | GameSession: command processing, subscribers, checkpoints and campaign coordination. |
| [src/save.ts](src/save.ts) | Versioned save schema, metadata, checksum and compatibility validation. |
| [src/singleBattle.ts](src/singleBattle.ts) | Standalone battle session setup and lifecycle. |
| [src/journeys.ts](src/journeys.ts) | Versioned presentation intent for planned hero journeys. |
| [src/index.ts](src/index.ts) | Public session and persistence contracts. |

## Contracts and design decisions

Depends on @pr/rules, @pr/campaign and @pr/ai. Saves hold logical maps, state and RNG, never Pixi objects, DOM nodes or native handles. Cosmetic journey intent is separate from authoritative movement. Older saves may omit newer optional presentation fields.

## Making a change

When a persistent contract changes, document compatibility and test loading both older and new shapes. Keep storage errors in the platform/UI integration path. Notify subscribers only through the session lifecycle rather than maintaining competing copies of match state.

## Verification

Run from the repository root:

```bash
npm test -- packages/session/test --maxWorkers=2
npm run typecheck
npm run lint:boundaries
```

See the [developer handbook](../../docs/development/README.md), [extension recipes](../../docs/development/EXTENDING.md), and [complete source atlas](../../docs/development/SOURCE_INDEX.md). Tests and visual checks appropriate to the change are described in the [testing guide](../../docs/development/TESTING.md).
