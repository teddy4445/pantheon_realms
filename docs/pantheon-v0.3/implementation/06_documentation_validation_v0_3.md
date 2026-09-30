# v0.3 Documentation and Logical-Map Fixture Validation

**Date:** 29 September 2026. **Package:** `0.3-production-handoff`.

These checks were executed on the Markdown package and a small Python reference of its logical map templates. They validate document consistency, selected arithmetic, and graph constraints. They do **not** run the TypeScript game, render a Babylon scene, generate a Blender asset, simulate tactical victories, or establish balanced gameplay.

## Checks actually performed

| Check | Actual result and scope |
| --- | --- |
| Package structure | PASS: 35 current Markdown documents and 43 historical Markdown documents; 78 in the complete package |
| Archive preservation | PASS: all 43 Markdown files from the source v0.2 ZIP preserved byte-for-byte, either in the existing older archive or the new `archive/v0_2/` snapshot |
| Creature forms | PASS: exactly 16 unique catalog form IDs, matched to the 8 base/upgrade pairs and new creature-production briefs |
| Building inventory | PASS: all 32 existing building IDs occur in the new environment/town production inventory |
| Prior numeric tables | PASS: existing creature and building table rows match the original v0.2 tables exactly; new production notes do not change their prices, stats or growth |
| Campaign coordinates | PASS: 31 anchor rows parsed from the map specification match the three tested template fixtures; anchors are unique, inside the domain and on valid static cells |
| Authored roads | PASS: every declared road graph edge can be carved by canonical BFS without crossing other reserved site anchors; generated edges join adjacent cells |
| Reachability and guard gates | PASS: all required sites reachable with gates open; 14 closed/open-gate assertions passed across the three templates |
| Recovery and optional routes | PASS: starting Sawmill/Quarry locations are reachable before the mandatory entry guards; optional encounter cells do not become compulsory routes to required sites |
| Route ceilings | PASS: the reference all-gates-open route costs below satisfy the stated bounds |
| Required purchase arithmetic | PASS: the minimum transaction examples below recompute correctly and fit the declared initial non-Favor wallets; M02's named Favor rewards cover its commitment alongside starting Favor |
| Markdown structure | PASS: fenced JSON examples parse; code fences are closed; tables have consistent row widths; relative document links resolve within the package |
| Technical sourcing | Official tool/reference links are recorded in the production source registry; engineering budgets and campaign choices remain labeled proposals, not vendor guarantees |

## Reference route results

The fixture uses the documented axial neighbors, boundary and barrier masks, anchor reservations and canonical road-carving order. Protected-road edges cost 75 movement points; ordinary unvaried plains edges cost 100. It does not implement cosmetic scattering, seeded tie variants, terrain variation, fog rendering, tactical obstacles or a running AI.

| Mission | Anchors | Distinct road edges in fixture | Measured route cost | Specified bound |
| --- | ---: | ---: | --- | --- |
| M01 | 7 | 25 | Town -> ford -> beacon: 975 MP | At most 1,500 MP |
| M02 | 10 | 43 | Town -> pass -> nest: 1,275 MP; nest -> town: 1,275 MP | At most 1,800 MP each |
| M03 | 14 | 85 | Via north crossing and both relays: 2,400 MP; via south crossing and both relays: 3,025 MP | At most 4,000 MP |

M03 costs use the declared north-relay-then-south-relay order and all gates provisionally open for measuring the route. Actual play still requires clearing a legal first crossing, paying to activate both relays, and opening the ward gate. Return trips, optional encounters and construction days are not included in these route totals. A route-cost result is not a measured mission completion time.

The 14 gate assertions comprise one each for the M01 bridge and M02 pass, eight for M03 first-crossing combinations versus the two relays, and four for the final ward's two relay flags. These are structural graph checks, not a substitute for executing quest commands in a game.

## Transaction fixtures

| Mission | Gold | Wood | Stone | Crystal | Favor | Includes |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| M01 | 1,880 | 3 | 8 | 0 | 0 | Veteran Barracks, eight base recruits, training ten existing Hoplites, beacon restoration |
| M02 | 8,350 | 15 | 25 | 5 | 20 | Four required buildings, two Windcrest Griffins, patron commitment and beacon restoration |
| M03 | 1,000 | 0 | 6 | 3 | 5 | Both relay activations and final restoration; not an entire recruitment budget |

M02 starts with 15 Favor and its two required guardian rewards grant another 5 and 10. Temple income supplies additional Favor but is not needed to prove this minimum. An optional spellbook costs a further 500 Gold. Casualty replacement, discretionary spending, optional buildings and human mistakes are not included in these minimums; the test does not guarantee victory with an arbitrary army or purchase order.

## Not tested in this pass

No complete game build, Electron installer, browser/desktop parity test, save backend, animation export, glTF file, audio file, AI battle, human playtest, or measured performance run was produced. The specified PRNG and 1,000-variation-seed corpus were not executed here. Dependency/softlock reviews are not exhaustive state-space searches. The new per-form ability mapping remains a proposal to freeze before combat implementation.

The [40 production acceptance cases](05_production_campaign_acceptance.md) are future requirements. They must not be reported as passing simply because these document and reference-graph checks passed. Earlier v0.2 and old-demo test claims apply only to those earlier artifacts.

The final deliverables contain the authored specifications and preserved source documentation. Development tooling should reproduce these fixtures in TypeScript, add the full seed corpus, and test actual assets and legal command sequences before marking the campaign production-ready.
