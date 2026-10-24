# @pr/ai

Chooses legal strategic and tactical commands from the information available to an AI player. It handles adventure priorities, building, combat, neutral tactics and specialized naval/caravan decisions.

## Read the code

| Entry point | Responsibility |
| --- | --- |
| [src/observation.ts](src/observation.ts) | Redacts state into the AI observation/belief view. |
| [src/controller.ts](src/controller.ts) | Schedules decisions and submits commands through the normal rules boundary. |
| [src/strategic.ts](src/strategic.ts) | Adventure objectives, routes, threats and resource priorities. |
| [src/tactical.ts](src/tactical.ts) | Battle action evaluation and selection. |
| [src/neutralTactics.ts](src/neutralTactics.ts) | Neutral creature combat and ability choices. |
| [src/build.ts](src/build.ts) | Town building and recruitment decisions. |
| [src/assessment.ts](src/assessment.ts) | Shared evaluations. |
| [src/naval.ts](src/naval.ts) | Ship and sea decisions. |
| [src/caravans.ts](src/caravans.ts) | Caravan planning. |

## Contracts and design decisions

Depends only on @pr/rules. Do not reach around observation to inspect hidden enemy state or fog. The AI proposes commands; it cannot mutate the live match. Bound planning work and keep deterministic tie-breaking where required.

## Making a change

Add a focused scenario for the decision and verify both legality and information limits. Test the fallback when the preferred plan becomes invalid. Use balance runs for comparative measurements, then check human-facing pacing and difficulty.

## Verification

Run from the repository root:

```bash
npm test -- packages/ai/test --maxWorkers=2
npm run typecheck
npm run lint:boundaries
```

See the [developer handbook](../../docs/development/README.md), [extension recipes](../../docs/development/EXTENDING.md), and [complete source atlas](../../docs/development/SOURCE_INDEX.md). Tests and visual checks appropriate to the change are described in the [testing guide](../../docs/development/TESTING.md).
