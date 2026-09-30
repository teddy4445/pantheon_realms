---
name: pr-creature-pipeline
description: "Plan, author, inspect or integrate Pantheon Realms creature assets in Blender and Babylon, including anatomy, base/upgrade silhouettes, rigs, sockets, animations, GLB export, portraits, LODs and bestiary previews. Use for every new creature family or upgrade. Require exactly one upgraded form and distinguish concept images from game-ready geometry, animation metadata from visual validation."
---

# Creature Pair Production

Read [project-contract.md](references/project-contract.md), the entire relevant pair brief in `production/03_creature_pairs_and_animation_bible.md`, the visual pipeline, the unit catalog and the upgrade contract. Read [pair-checklist.md](references/pair-checklist.md) before declaring completion.

## Author a family, not an isolated unit

1. Confirm canonical IDs, stats/abilities, footprint, tier, required clips, allowed equipment, pair budget and lore status. Do not change mechanics to fit an asset.
2. Approve base/upgrade turnarounds and grayscale silhouettes together. AI-generated images are references, not a mesh, consistent rig or guaranteed licensed asset.
3. Build editable Blender sources, clean topology, materials and a compatible deform rig. Prefer shared anatomy, bones and sockets across the pair.
4. Add both visual forms. The upgrade needs readable geometric/portrait differences, not only team color or glow. Do not add a third promotion or boss-specific gameplay form.
5. Animate the actual anatomy, bake exportable actions, verify foot/hoof/wing contact and prop sockets, then export locally as GLB.
6. Inspect metadata/clip names, run full Khronos validation when installed, and load both forms in the actual Babylon viewer and battle scene.
7. Review base/upgrade at gameplay zoom, two-cell facing, reduced motion, fast playback, missing assets and repeated viewer changes.

## Tool boundary

Use Blender MCP only after the user has installed and enabled its add-on and explicitly opened a scratch/backup file. It can execute Python: localhost and safe-mode filters are not a security sandbox. Keep telemetry disabled; do not enable paid generation or cloud asset uploads without authorization. Save outputs inside approved project paths. Prefer a reviewed deterministic Blender script for repeatable export steps.

## Do not invent actions

Centaurs are ground melee, not archers. Griffins have no ranged wind spell. Peltast upgrades do not gain two shots. Temple Seer, not the base Adept, has Ward. Stormforged appearance is not chain lightning. Cosmetic root motion, hit cues and ragdolls never decide damage or travel.

## Required delivery

Editable source, both meshes/GLBs, rig and clips, sockets, export settings, runtime manifest, both portraits, provenance/license record and actual QA evidence. Report missing pieces explicitly. A static placeholder or clip-name pass is not a finished animated creature.
