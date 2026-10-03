# Creature Pair Acceptance Checklist (2D)

## Identity

Use the canonical pairs from the current upgrade contract and content catalog. Every base points to one upgrade; every upgrade points back and has no next promotion. Base/upgrade share family, pantheon, tier, growth and footprint. Labels and portraits identify the exact form.

## Sources and provenance

Keep both canonical reference views (`assets-source/creatures/reference/`), both portraits, each form's delivered sheet in `assets-source/sprites/sheets/` (`sheet.creature.<pantheon>.tier<N>.<base|upgraded>.png`) and the strips cut from it in `assets-source/sprites/final/` (`sprite.creature.<…>.<animation>.png`, with their sidecar JSON), and a provenance record (generator, date, queue group, owner approval). A concept image is not an imported strip.

## Animation strips

Every creature: idle, move, attack, defend, hit, death, victory. Shooters add shoot; Flight adds takeoff, fly and landing; an active ability adds ability. No creature strip uses cast. Compare against `requiredAnimations` and the production queue; a file name alone does not prove the motion reads.

Every strip: transparent background, facing right, equal frames left to right without gaps, frames 512 x 512 (768 x 512 for two-hex creatures) or a uniform half/double scale, feet at 90 % of the frame height, one hex = 240 px, the same camera, scale and baseline in every frame, nothing touching the frame edge. The upgraded strip keeps the base strip's poses and timing.

Missing optional strips fall back (shoot to attack, fly to move to idle, ability to attack); a missing death strip lays the figure down. Fallbacks are acceptable for placeholders, not for a family declared final.

## Runtime

`npm run sprites:import` accepts every file and the manifest entries read `final`; the `inspect_sprite_manifest` audit reports no missing files. Review both forms in the Unit Detail viewer (every animation button, base/upgraded switch, reduced-motion still) and in battle at tactical zoom: anchored on the hex, mirrored as a defender, two-hex footprint aligned, normal/fast/instant playback with identical results, no save/RNG change from previews. Check grayscale silhouettes and team-colour independence. A family is not production-complete when only its base is finished.
