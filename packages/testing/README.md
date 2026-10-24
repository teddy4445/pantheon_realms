# @pr/testing

Shared headless test utilities for constructing and driving the game through its real rules. Test helpers should make scenarios concise without giving tests a privileged gameplay path.

## Read the code

| Entry point | Responsibility |
| --- | --- |
| [src/driver.ts](src/driver.ts) | GameDriver: scripted play using normal validated commands. |
| [src/naval.ts](src/naval.ts) | Reusable naval test setup. |
| [src/index.ts](src/index.ts) | Public testing exports. |

## Contracts and design decisions

Can depend on rules, content, campaign, AI and mapgen. Keep production code independent of this package. Fixture setup may construct a scenario, but actions under test should go through the processor so validation failures remain visible.

## Making a change

Add a helper only when it clarifies repeated scenario setup. Keep seeds and assertions explicit. Do not hide rejected commands or silently force the expected outcome in a helper.

## Verification

Run from the repository root:

```bash
npm test -- --maxWorkers=2
npm run typecheck
npm run lint:boundaries
```

See the [developer handbook](../../docs/development/README.md), [extension recipes](../../docs/development/EXTENDING.md), and [complete source atlas](../../docs/development/SOURCE_INDEX.md). Tests and visual checks appropriate to the change are described in the [testing guide](../../docs/development/TESTING.md).
