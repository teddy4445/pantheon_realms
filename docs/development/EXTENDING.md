# Extend the game without splitting the rules

Use the [source atlas](SOURCE_INDEX.md) to locate related modules and the [package guides](../../README.md#inside-the-code) to understand ownership. Definitions, gameplay behavior, availability and presentation are separate pieces of a feature.

## Add or upgrade a creature

1. Read the [creature contracts](../../packages/rules/src/definitions/creatures.ts) and an implemented family such as [neutralDragons.ts](../../packages/content/src/common/neutralDragons.ts). Preserve base/upgrade relationships, movement, tier, footprint and ability semantics.
2. Add the authored family and ability data to the appropriate pantheon or common library, then register it in [catalog.ts](../../packages/content/src/catalog.ts). The shared builders generate both forms where appropriate.
3. Make it obtainable: update the relevant dwelling, neutral site, reward, editor roster or encounter. A catalog entry alone does not guarantee recruitment or random-map placement.
4. Import portraits, map stills and animation strips with stable asset IDs. Follow [ASSET_PIPELINE.md](../../ASSET_PIPELINE.md) for frame grids, anchors, facing and fallback animations. Register the pack in [UI asset lookup](../../packages/ui/src/assets/manifest.ts); add only the necessary boundary exception.
5. Check encyclopedia and single-battle visibility, both base and upgrade, battle footprint, map scale and missing-animation fallbacks.
6. Test any new ability in rules and AI. Reuse shared ability semantics where possible; avoid creature-name checks spread through battle code.

## Add a spell or divine intervention

[expansionMagic.ts](../../packages/content/src/common/expansionMagic.ts) is an example of authored spell/intervention definitions; its 42 spells and 12 miracles are additions to the wider library.

- Define the mechanical effect, target, cost, tier, scope, access and pantheon eligibility. A spell's availability depends on these fields and the scenario's enabled content.
- Extend the shared effect union and rule handling only if existing effects cannot express the mechanic. Test resource payment, illegal targets, damage/loss limits and interaction with immunities or other modifiers.
- Add an icon and a presentation recipe. [paintedMagicData.ts](../../packages/presentation/src/paintedMagicData.ts) binds IDs to strips; [paintedMagicTypes.ts](../../packages/presentation/src/paintedMagicTypes.ts) describes interpolation and recipe fields; [paintedMagic.ts](../../packages/presentation/src/paintedMagic.ts) plays them.
- Design distinct silhouettes, timing and material motion. A recolored particle cloud is not a new mechanical effect or a complete animation design.
- Verify full effects, simple effects, skipped playback, target footprint and cleanup when leaving the scene. The same cast must produce the same rules result in all cases.

## Add a landmark or restoration site

Read [landmarks.ts](../../packages/rules/src/systems/landmarks.ts), [restorationTemples.ts](../../packages/rules/src/systems/restorationTemples.ts), and the [world definitions](../../packages/rules/src/definitions/world.ts).

Decide whether a reward is one-time globally, one-time per player, or repeatable per hero/week. Persist that policy explicitly and reuse the map-event choices for costs and rewards. Test insufficient resources, no army slot, already-known spell, duplicate confirmation, save/load and a second hero's visit.

Generation must preserve reachable approaches and not block towns, roads or authored objectives. Waterfall artwork may sit on water while its interaction coordinate must be reachable land. Ruined/built art is a state-derived choice, not a separate source of truth.

## Add a campaign chapter

Start with [campaign/v2](../../packages/content/src/campaign/v2), [the shared-world campaigns](../../packages/content/src/campaign/confluence), and [missionFactory.ts](../../packages/campaign/src/missionFactory.ts).

Specify the chapter's map, heroes, opponents, starting resources, objectives, failure conditions, dialogue and carryover. Make required journal actions explicit to players. Test access to ships and objective sites, optional encounters, chapter completion, replay/practice behavior and continuation. Difficulty and weekly growth should be applied through shared systems rather than hardcoded separately in each story.

Use the campaign simulator to catch structural failures, then play the chapter. Automated completion does not prove a mission is engaging, readable or balanced. Document any deliberate deadline and the intended reason to return to town and recruit.

## Add map decoration or city art

Keep cosmetic placement separate from logical map generation. Use stable map-coordinate hashes for variation, respect biome/terrain rules, cull off-screen work and keep scenery clear of interaction targets. The [presentation guide](../../packages/presentation/README.md) identifies the relevant modules.

Cities combine a scene aspect ratio, development backgrounds and positioned building chains. Check every upgrade at the actual scene ratio, including overlap, depth order and pointer targets. Refresh the website showcase through [documentation tools](../../tools/docs/README.md) after changing public city art.

## Finish the feature

Validate the catalog, run relevant regression tests and the boundary/type checks, then capture the feature in the actual UI. Update the encyclopedia/help text and contributor docs where needed. Keep provenance and optimized runtime derivatives together with the change. See [CONTRIBUTING.md](../../CONTRIBUTING.md).
