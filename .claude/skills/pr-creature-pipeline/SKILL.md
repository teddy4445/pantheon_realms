---
name: pr-creature-pipeline
description: "Plan, produce, import or review Pantheon Realms 2D creature art for both forms of a family: canonical reference views, portraits, battle animation strips and bestiary previews. Use for every new creature family or upgrade, GPT-6 deliveries, sprite imports, placeholders and animation-vocabulary questions. Require exactly one upgraded form and distinguish concept images from imported, game-ready sprite strips."
---

# Creature Pair Production (2D)

Read [project-contract.md](references/project-contract.md), the sprite sections of `ASSET_PIPELINE.md`, `CREATURE_ANIMATION_REQUIREMENTS.md`, the family's entries in `GPT6_2D_CONTENT_GENERATION.md` (the production queue) and the upgrade contract. Read [pair-checklist.md](references/pair-checklist.md) before declaring completion.

## Author a family, not an isolated unit

1. Confirm canonical IDs, pantheon, tier, stats/abilities, footprint (one or two hexes) and lore status from the content catalog. Do not change mechanics to fit the art.
2. Canonical references: a three-quarter master view (front/side/top optional) of the base and the upgraded form in `assets-source/creatures/reference/`. Approve both together with grayscale silhouettes; the upgrade needs a readable difference in shape, equipment or bearing, not only colour or glow.
3. Portraits: one per form, delivered to `assets-source/icons/final/` and registered with `npm run icons:import`.
4. Battle strips: one horizontal strip of equal frames per animation the creature actually has. Base vocabulary `idle, move, attack, defend, hit, death, victory`; plus `shoot` for shooters, `takeoff, fly, landing` for Flight, `ability` for an active ability. `cast` is reserved for heroes. Take the list from `requiredAnimations` and the queue, never from guesswork.
5. Sheet format: one image per form holding every animation it has, one row per animation, six cells per row (`defend`+`hit` and `takeoff`+`landing` share a row); transparent PNG (or flat magenta), facing right, feet on each cell's ground line at 90 % of the cell height, the cell size in hex widths as the queue states, the same camera, scale and place in the cell in every frame. Generate the base sheet first, then the upgraded sheet against it with matching poses and timing.
6. Name each sheet `sheet.creature.<pantheon>.tier<N>.<base|upgraded>.png` exactly as the queue lists it, save it in `assets-source/sprites/sheets/`, run `npm run sprites:cut` (one strip per animation, re-aligned on the feet; check `assets-source/sprites/sheets/_preview/`) and `npm run sprites:import`. The importer checks transparency, frame grid and size, writes WebP under `assets-runtime/sprites/final/` and flips the manifest entry to `final`; no code change is needed. A single strip `sprite.creature.<form>.<animation>.png` may still be delivered on its own.
7. Rerun `npm run sprites:queue` so delivered items leave the queue, then review both forms in the Unit Detail viewer and in battle at normal/fast/instant speed, mirrored as a defender and with reduced motion.

## Placeholders

`npm run sprites:placeholders` regenerates the placeholder entries: creature stills cut from delivered reference views, animated silhouettes for the rest, all labelled `placeholder` with provenance. A placeholder is never reported as finished art, and replacing it with a final strip needs no code change.

## Tool boundary

Image generation happens outside the repository in the owner's GPT-6 sessions. Do not enable paid generation, upload unreleased art or change licences without authorization. Record provenance for every imported file. The owner's separate legacy modelling project on their computer is not part of this pipeline and is never modified.

## Do not invent actions

Centaurs are ground melee, not archers. Griffins have no ranged wind spell. Peltast upgrades do not gain two shots. Temple Seer, not the base Adept, has Ward. Stormforged appearance is not chain lightning. Frame timing, hit flashes and sprite motion never decide damage or travel.

## Required delivery

Both reference views, both portraits, every required strip for both forms imported as `final`, provenance records and actual review evidence (viewer and battle screenshots). Report missing strips explicitly. A placeholder, or a strip that merely passes the importer, is not a finished animated creature.
