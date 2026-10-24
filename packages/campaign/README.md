# @pr/campaign

Turns authored or generated mission definitions into a match, and manages campaign progression, chapter completion, replay/practice and hero carryover. Story data belongs in content; storage belongs in platform.

## Read the code

| Entry point | Responsibility |
| --- | --- |
| [src/missionFactory.ts](src/missionFactory.ts) | Mission-to-match construction, difficulty, controllers and initial world state. |
| [src/campaign.ts](src/campaign.ts) | Campaign state transitions, completion records and carryover. |
| [src/regionalState.ts](src/regionalState.ts) | Persistent regional progression shared by campaign chapters. |
| [src/randomSkirmish.ts](src/randomSkirmish.ts) | Session-facing random skirmish creation. |
| [src/index.ts](src/index.ts) | Supported package exports. |

## Contracts and design decisions

Depends on @pr/rules and @pr/mapgen. It does not render or persist files. Keep primary progression distinct from chapter practice/replay; a replay must not accidentally overwrite the main run. Respect existing content-version handling when changing chapter graphs.

## Making a change

Author the chapter in content, then add tests for initial state, completion, failure and carryover. Verify optional objectives and required journal interactions in the UI. Run the campaign simulator and play through travel/ship access; simulation alone does not establish pacing.

## Verification

Run from the repository root:

```bash
npm test -- packages/campaign/test --maxWorkers=2
npm run typecheck
npm run lint:boundaries
```

See the [developer handbook](../../docs/development/README.md), [extension recipes](../../docs/development/EXTENDING.md), and [complete source atlas](../../docs/development/SOURCE_INDEX.md). Tests and visual checks appropriate to the change are described in the [testing guide](../../docs/development/TESTING.md).
