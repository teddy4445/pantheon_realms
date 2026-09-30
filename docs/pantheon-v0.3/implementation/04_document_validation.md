# Documentation Validation Report

**Date:** 29 September 2026. **Package:** 0.2-researched-proposal.

These checks were run on the generated Markdown and arithmetic fixtures. They do not execute the game, verify original Heroes III binary behavior, or establish balanced gameplay.

| Check | Actual result |
| --- | --- |
| Creature catalog | PASS - 16 unique forms in 8 two-form families; shared growth/tier, valid damage/HP/footprints, non-negative upgrade costs. |
| Recruitment budget | PASS - Computed three growth-state bills from the candidate roster; Castle benchmark arithmetic separately verified at 10,540 / 21,080 Gold. |
| Rendered roster consistency | PASS - All 16 Markdown rows match the structured validation fixture, including costs, growth, combat stats, ammunition, and footprint. |
| Town tree | PASS - 32 unique building IDs; listed dependency graph has no missing references or cycles. Covenant conditions remain explicit non-building requirements. |
| Economy ledger | PASS - All 14 rows recomputed from the declared fixture; purchases affordable, building prerequisites present, final balances 2,820 G / 11 W / 6 S / 7 C / 19 Favor. |
| Worked combat/growth examples | PASS - Exact rational damage outputs, Defend rounding, HP/count/front-HP examples, upgrade differences, and weekly rounding recomputed. |
| Data examples | PASS - 3 fenced JSON examples parsed successfully; examples are contracts, not a runtime engine. |
| Relative document links | PASS - all current-package Markdown links resolve to files or declared local targets. Archived original documents are preserved, not rewritten. |
| Markdown table structure | PASS - table rows have consistent cell counts within each table. |
| Source registry | PASS - all cited source IDs occur in the source registry; URLs retain explicit provenance and access scope. This is not a claim that every external URL was re-fetched during validation. |
| Historical preservation | PASS - all 19 original GDD Markdown files match the archived copies byte-for-byte. |

## What was not tested

No revised browser/native game was implemented or run. No new AI, siege, menu, settings backend, animation, sound, save conversion, or accessible runtime was tested. The acceptance scenarios in the adjacent document are future development requirements. No balance simulation, human playtest, or original-game executable comparison was performed.

The source study used original manuals, recreation source/configuration, and labeled community numeric references. Remaining version/rounding/source limitations are recorded in the reference document. Numeric defaults in the proposed profile are design choices, not established empirical optimums.
