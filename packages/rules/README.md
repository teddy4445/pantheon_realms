# @pr/rules

The authoritative, DOM-free simulation. It defines content contracts, serializable match state, legal commands and gameplay transitions. No UI or renderer may bypass this layer to alter an outcome.

## Read the code

| Entry point | Responsibility |
| --- | --- |
| [src/engine/processor.ts](src/engine/processor.ts) | The command boundary: validation, draft mutation, accepted revision and emitted events. |
| [src/commands/commands.ts](src/commands/commands.ts) | The discriminated command vocabulary used by UI, AI and tests. |
| [src/state/match.ts](src/state/match.ts) | Persistent match state; keep it plain data and keyed by stable IDs. |
| [src/definitions](src/definitions) | Contracts for creatures, spells, towns, scenarios and other authored content. |
| [src/resolvers](src/resolvers) | Read-side queries, quotes, legality and scenario views. |
| [src/systems](src/systems) | Economy, world interactions, heroes, turns, naval rules and other transitions. |
| [src/systems/battle](src/systems/battle) | Battle creation, targeting, attacks, abilities, resolution and rewards. |
| [src/core](src/core) | Shared IDs, hex math, deterministic RNG and data helpers. |

## Contracts and design decisions

This package imports no other workspace package and has no DOM, Node, React or Pixi dependency. Rejected commands must leave the original match untouched. Gameplay randomness must use the saved RNG streams. Events describe authoritative outcomes; animation callbacks never apply those outcomes.

## Making a change

Add an intent to the command union, reuse or extend a read-side quote, implement the transition in a system, wire it through the processor, and test success, rejection and repeated submission. For new persistent fields, cover save/load compatibility through the session tests.

## Verification

Run from the repository root:

```bash
npm test -- packages/rules/test --maxWorkers=2
npm run typecheck
npm run lint:boundaries
```

See the [developer handbook](../../docs/development/README.md), [extension recipes](../../docs/development/EXTENDING.md), and [complete source atlas](../../docs/development/SOURCE_INDEX.md). Tests and visual checks appropriate to the change are described in the [testing guide](../../docs/development/TESTING.md).
