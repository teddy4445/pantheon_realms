# @pr/content

The authored game catalog: six playable pantheons, creature families, gods, heroes, buildings, magic, artifacts, campaign chapters and skirmish definitions. It builds data against the rules contracts and validates references before play.

## Read the code

| Entry point | Responsibility |
| --- | --- |
| [src/catalog.ts](src/catalog.ts) | Assembly, ID indexing, version bundle and validated/frozen catalog loading. |
| [src/validation/validators.ts](src/validation/validators.ts) | Cross-reference and content-contract validation. |
| [src/pantheonKit.ts](src/pantheonKit.ts) | Shared builder for compact pantheon specs. |
| [src/greek](src/greek) | Greek roster, town, patrons and lore; the other named pantheon directories serve the same role. |
| [src/common](src/common) | Shared mechanics data, neutral/naval creatures, dragons, magic and policies. |
| [src/campaign/v2](src/campaign/v2) | Current chapter-based campaign writing and map/objective definitions. |
| [src/campaign/confluence](src/campaign/confluence) | When the Worlds Met and The Ashes of the Accord. |
| [src/townArt](src/townArt) | Current city scene layouts and art bindings. |

## Contracts and design decisions

Depends only on @pr/rules. Keep rules behavior in the rules package; builders may construct definitions but should not create a second simulation. A catalog record does not imply availability in every scenario: scope, access, eligibility and mission settings still apply. App version and content compatibility versions are different contracts.

## Making a change

Prefer an existing definition or shared builder over a faction-specific engine branch. Register new IDs in catalog.ts, validate all references, then add availability and presentation bindings. The current counts are generated in ../../docs/development/content-snapshot.json.

## Verification

Run from the repository root:

```bash
npm test -- packages/content/test --maxWorkers=2
npm run typecheck
npm run lint:boundaries
```

See the [developer handbook](../../docs/development/README.md), [extension recipes](../../docs/development/EXTENDING.md), and [complete source atlas](../../docs/development/SOURCE_INDEX.md). Tests and visual checks appropriate to the change are described in the [testing guide](../../docs/development/TESTING.md).
