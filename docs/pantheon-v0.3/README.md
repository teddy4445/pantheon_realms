# Pantheon Realms - Production, Campaign and Asset Handoff

**Package version:** 0.3-production-handoff  
**Updated:** 2026-09-29; presentation technology updated 2026-10-03 (2D migration, [DEC-23](DECISIONS_v0_3.md))  
**Purpose:** Extend the existing gameplay/rules documentation into a concrete development and asset-production specification. This is documentation, not a new executable game or a delivered art pack.

## Adopted direction

Pantheon Realms is a desktop-first, offline-capable, data-driven deterministic turn-based strategy game. TypeScript owns authoritative rules and AI. React owns application interface screens. PixiJS owns the 2D Adventure Map, Tactical Battle presentation, sprite animation, and animated Unit Detail viewer. Electron packages the desktop application and a browser build uses the same core. Content presentation uses high-resolution 2D backgrounds, sprites, atlases, portraits, UI art and animation strips. Gameplay state changes only through validated commands; presentation never defines gameplay outcomes. Every creature has exactly one upgrade.

Creature art follows the 2D pipeline: canonical reference views -> portraits -> animation strips (facing right, explicit anchors), delivered by GPT-6 from the production queue `GPT6_2D_CONTENT_GENERATION.md` and imported with `npm run sprites:import`; labelled placeholders stand in until then.

The first proposed campaign is **The Three Beacons**, three short linked missions. Its story, exact encounters, map templates and economy fixtures are original proposals; they have not been playtested. The eight Greek families already defined in v0.2 are retained as sixteen base/upgraded forms.

## Read first

1. [Adopted decisions and status](DECISIONS_v0_3.md), then [CLAUDE.md](CLAUDE.md).
2. [Approved stack and architecture](production/01_approved_stack_and_architecture.md).
3. [The Three Beacons campaign](campaign/01_the_three_beacons.md) and [map generation](campaign/02_map_generation_specification.md).
4. [Exactly-one-upgrade contract](content/03_exactly_one_upgrade_contract.md).
5. [Visual/animation pipeline](production/02_visual_and_animation_pipeline.md), [all creature pairs](production/03_creature_pairs_and_animation_bible.md), and [environment/town/UI/audio inventory](production/04_environment_towns_ui_and_audio.md).
6. Existing [economy](design/02_economy_calendar_and_recruitment.md), [town values](design/03_town_tree_costs_and_growth.md), [combat](design/04_combat_specification.md), [hero/magic rules](design/05_heroes_logistics_and_magic.md), [unit values](design/06_greek_unit_catalog_values.md), and [adoption matrix](design/01_rule_adoption_matrix.md).
7. [Production acceptance](implementation/05_production_campaign_acceptance.md), [current documentation validation](implementation/06_documentation_validation_v0_3.md), and [technical sources](reference/05_production_sources.md).

## Document map

| Area | Contents |
| --- | --- |
| `production/` | Stack, independent simulation, local AI, offline packaging, 2D sprite/animation workflow, sixteen creature briefs, every other visual element |
| `campaign/` | Three exact mission manifests, narrative/quests/carryover, seeds/anchors/roads/gates, generation and validation logic |
| `content/` | One-upgrade invariant, lore, original animation behavior contract |
| `design/` | Existing five-resource economy, 32 building definitions, 16 creature forms, battle/hero/magic candidate rules |
| `screens/` | Main menu, settings, S18 unit viewer, stable screen inventory and navigation |
| `implementation/` | Data contracts, previous and new acceptance cases, migration, scoped validation reports |
| `reference/` | Original Heroes III research and new official production references |
| `archive/v0_1/` | Original 19-document gameplay handoff, unchanged |
| `archive/screen_demo/` | Old executable review-demo rules, unchanged |
| `archive/v0_2/` | Original 23 active v0.2 documents before this update, unchanged |

## Status vocabulary

**D - Adopted** is supported by an explicit owner instruction. **R - Reference** describes researched external material, not necessarily our game. **P - Proposed** is a concrete candidate rule/content/engineering decision. **O - Open** still needs production work or selection. **H - Historical** is context only.

The stack and one-upgrade topology are D. Campaign content, map generation details, art briefs, budgets and per-form ability mapping are P. Existing v0.2 numeric balance is still P. The design does not require exact Heroes III reproduction or reuse of its assets.

## Important integration rules

Do not resurrect the old two-day construction queue, independent initiative values or half-damage Defend just because the demo code already has them. Do not create a separate browser rules implementation. Do not bind damage, quest completion or upgrade purchases to animation callbacks. Do not create separate base/upgraded weekly populations.

All eighteen screen IDs remain stable: S01 is the real main menu, S17 settings, S16 the searchable index and S18 the animated unit page. The campaign uses setup/briefing/debrief overlays around those screens. No new duplicate main menu or settings screen is needed.

The existing single-file HTML demo remains a navigation reference, not the production architecture. This package does not modify it. API choices are checked against official sources, but actual dependencies must be pinned and tested. The original v0.2 validation report describes only that earlier pass; the new report states exactly what was checked now.

## Handoff

Share this folder or the combined current-document edition. Begin with the prompt in [CLAUDE.md](CLAUDE.md). The archives preserve provenance but must not override the root instructions. All actual game implementation, map runtime output and final audiovisual production occur after this documentation handoff.
