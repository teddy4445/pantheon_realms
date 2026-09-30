# Creature Pair Acceptance Checklist

## Identity

Use the eight canonical pairs from the current upgrade contract. Every base points to one upgrade; every upgrade points back and has no next promotion. Base/upgrade share family, faction, tier, growth and footprint. Labels and portraits identify the exact form.

## Source and export

Retain editable Blender sources, both meshes/materials, deform rig, actions, socket conventions, export preset and provenance. Use source units/transforms as specified by the current visual pipeline. Preserve negative-scale/skin checks and bake unsupported constraints. A generated reference image is not an exportable rig.

## Animation

Ground common clips: idle_a, move_walk, attack_melee_a, guard, hit_a, defeat, victory. Every shooter also requires attack_shoot. Griffins use takeoff, move_fly, land and move_ground plus idle/melee/guard/hit/defeat/victory. Temple Seer adds ability_ward. Compare actual required clips against the current asset manifest; names alone do not validate channels or contacts.

Confirm held equipment/socket release, root anchor, contact, two-hex facing, independent instance pose, event timing, transitions, reduced motion and cleanup for BOTH forms. Make weapon trails/projectiles presentation-only. Retaliation can reuse the legal melee clip; it cannot recursively dispatch another attack.

## Runtime

Check GLB metadata; run Khronos validation; load in Babylon; inspect at tactical and bestiary zoom; test animation at normal/fast/instant settings; verify no save/RNG change from previews. Missing assets show a labeled fallback. Review grayscale silhouette and team-color independence. A family is not production-complete when only its base is finished.
