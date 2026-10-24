# @pr/mapgen

Produces logical maps and scenario definitions from seeded settings, authored templates or editor documents. Cosmetic decoration is derived separately so it cannot influence movement, rewards or gameplay randomness.

## Read the code

| Entry point | Responsibility |
| --- | --- |
| [src/index.ts](src/index.ts) | Public generation and validation entry points. |
| [src/skirmish.ts](src/skirmish.ts) | Random skirmish settings, symmetry, regions, roads, guards and scenario construction. |
| [src/custom.ts](src/custom.ts) | Conversion and validation of custom map documents. |
| [src/editorTools.ts](src/editorTools.ts) | Reusable editor operations and placement logic. |
| [src/neutralSites.ts](src/neutralSites.ts) | Neutral encounter/site selection. |

## Contracts and design decisions

Depends only on @pr/rules. Identical logical inputs and seed must reproduce the logical map. Check reachable towns, objectives and shore approaches before adding decorative density. The generated map is saved; loading should not regenerate it using a potentially changed generator.

## Making a change

Separate a new setting, its logical effect and its cosmetic effect. Test fixed seeds, invalid combinations, symmetry where promised, terrain connectivity and special sites such as docks/ships. See tools/maps for map-building and fairness helpers.

## Verification

Run from the repository root:

```bash
npm test -- packages/mapgen/test --maxWorkers=2
npm run typecheck
npm run lint:boundaries
```

See the [developer handbook](../../docs/development/README.md), [extension recipes](../../docs/development/EXTENDING.md), and [complete source atlas](../../docs/development/SOURCE_INDEX.md). Tests and visual checks appropriate to the change are described in the [testing guide](../../docs/development/TESTING.md).
