# Migration from the Screen Demo and Remaining Decisions

> v0.3 superseding scope: the [three-mission campaign](../campaign/01_the_three_beacons.md) and paired-creature production pipeline are now the concrete demo target. The old staged order below remains migration context; technology is no longer open. Numeric balance is still proposed.
**Status:** P. This is a plan, not a claim that the existing HTML demo has been updated.

## Preserve the old review artifact

Keep the old HTML/ZIP and saved review notes intact. The existing demo has its own temporary rule set and tests. This package archives its rules for comparison, not as an implementation authority. No new unit, menu, settings feature, AI, or siege is claimed to be working because it appears in these documents.

## Ordered migration

### Milestone 1 - One economic state

Introduce `pr-0.2-candidate` content/rule IDs; five-resource wallet; Day 1 start; explicit dawn events; immediate building transactions and used-day allowance. Replace town progress/queue fields and displayed timers. Implement hall replacement income, growth multipliers, and shared family pools. Migrate the resource header and overview at the same time.

### Milestone 2 - Recruitment and hero definitions

Implement local destinations, upgrades, seven-slot conservation, and covenant assignment. Replace demo unit prices/stats from the authoritative catalog for the four initial families. Replace hero Health/extra primary fields with four attributes and derived movement. Update spell costs/formulas and level offers together, not one view at a time.

### Milestone 3 - Combat

Replace the fixed-damage/divisor formula, independent initiative, move-OR-attack restriction, queue-end Wait, and half-damage Defend. Add Speed snapshots, two wait phases, legal footprint movement, move-plus-melee, shots, retaliations, exact HP, seeded morale/luck, and a shared preview/resolver. Keep the original auto-resolve fixture only as historical data; rerun battle tests against the new rules.

### Milestone 4 - Front door and reference screens

Make S01 a real main menu with compatible-save metadata and S17 a committed/draft preference system. Implement S16 search and S18 static unit details first. Then connect the optional animation viewer using the documented contract. Add D03 inspection and return-context preservation. Hide the review sidebar outside review mode.

### Milestone 5 - Expansion after the loop works

Add remaining Greek families and upgrades, the full building tree, actual opposing-empire AI, hero loss/recovery, sieges, and conquest. Campaigns, the other mythologies, multiplayer, and final audiovisual production are separate milestones. They are not all prerequisites for reviewing the new screens.

## Breaking changes that require a save strategy

A v0.1 save has construction timers, different costs, different battle actions/stat definitions, different starting state, different spells, and different XP thresholds. Do not load it directly into v0.2. The simplest first migration is read-only recognition with the message **This save uses the earlier review rules; open it in that demo or start a new v0.2 game**.

A future converter would need to define resources, in-progress projects, populations, level/skill mapping, army stats, quest gates, and pending results. No automatic conversion is designed here. Never destroy the original save while trying a conversion.

## Relationship to the original decision register

The original DEC IDs stay meaningful. v0.2 supplies proposed answers, not silently adopted resolutions:

| Original decision | New candidate location | Status |
| --- | --- | --- |
| DEC-01 day/week ordering | Economy | Proposed exact ordering |
| DEC-02 hero battlefield role | Combat / heroes | Off-grid retained |
| DEC-03 hero loss | Combat | Explicit candidate; campaign/faction exceptions later |
| DEC-04 capacity/morale | Combat / skills | Seven slots, no strength cap; bounded morale |
| DEC-05 leveling | Heroes | Explicit curve/offering/skill limits |
| DEC-06 construction | Economy / town | Major revision to instant one-per-day |
| DEC-07 growth/covenants | Economy / roster | Shared family pools, fixed town slots |
| DEC-08 divine scope | Economy | Player-wide deity, town-bound covenants |
| DEC-09 combat | Combat | Candidate formulas/action economy; not executable parity |
| DEC-10 armies/hiring | Economy / combat | Local recipients, slots, finite heroes, siege selection |
| DEC-11 map/movement | Heroes | Authored hex map and explicit costs |
| DEC-12 Favor | Economy | Temple income; no casualty-farming currency |
| DEC-13 magic | Heroes | Small fully specified library |
| DEC-14 artifacts/quests | Heroes / combat | Limited inventory, exactly-once rewards; full sets later |
| DEC-15 sieges | Combat | Simplified candidate; later milestone |
| DEC-16 conquest | Economy | Candidate elimination/grace-period rule |
| DEC-17 diplomacy | Economy / town | Hostile Greek rivals first; cross-faction conversion later |
| DEC-18 technology | [Production architecture](../production/01_approved_stack_and_architecture.md) | ADOPTED in v0.3: TypeScript, React, Electron; desktop-first/offline plus shared browser core. Presentation since 2026-10-03: PixiJS 2D sprites ([DEC-23](../DECISIONS_v0_3.md)) |
| DEC-19 saves | Data/menu documents | Versioned checkpoint proposal; no old-save conversion |
| DEC-20 content/lore | Roster / lore | Greek draft; other cultures and final assets still OPEN |

## New screen/content decisions

S01 Main Menu and S17 Settings are expanded requirements, not new duplicate screens. S18 Unit Detail is new. Since the 2D migration (DEC-23, 2026-10-03) S18 shows the animated sprite viewer (PixiJS) with animation state buttons and a base/upgraded switch; static portraits remain accessibility/loading fallbacks, not the intended animated production treatment. Voice narration is optional and uncommissioned. The prototype may display sourced lore as text without voice or motion.

## Review record template

```text
Decision ID:
Date and owner instruction:
Status: PROPOSED / ADOPTED / REPLACED
Chosen rule:
Reason and alternatives rejected:
Affected tables, screens, saves, and tests:
Remaining questions:
```

Use this record for consequential changes. Do not interpret test review notes, a successful arithmetic check, or an attractive screenshot as approval of balance.
