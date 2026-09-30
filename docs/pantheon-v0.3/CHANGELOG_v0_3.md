# v0.3 Documentation Changes

**Date:** 2026-09-29. Documentation update only; the existing HTML demo, source game code, saved games and audiovisual assets are not modified.

## Added

Approved-stack architecture; The Three Beacons three-mission campaign; fixed-anchor/seeded-detail map-generation rules; explicit exactly-one-upgrade contract; full Blender/glTF visual pipeline; individual briefs for eight creature pairs; 32-building/non-creature/all-screen asset inventory; audio companion brief; official technical sources; production acceptance cases and current documentation QA report.

## Reconciled

Root README and CLAUDE now recognize the adopted technology and upgrade decisions. Active animation/data/migration/screen/catalog files point to the new production specification instead of saying the engine and 2D/3D choice are still open. The candidate unit statistics, building prices and combat formulas are retained, not silently rebalanced. The per-form ability assignment gap is explicitly labeled a proposed clarification.

The campaign resets armies/wallets between missions while carrying hero development, equipment, spells and the chosen minor deity. This is an explicit three-mission demo policy, not a global change to skirmishes. Procedural variation cannot change mandatory content or bypass story gates.

## Preservation and limitations

The 23 original active v0.2 documents are preserved under archive/v0_2. Existing v0.1 and screen-demo archives are unchanged. Previous validation claims remain scoped to their original package. New validation reports only current document/fixture checks; no game, Babylon renderer, Electron package, animations, music, balance simulation or human playtest is claimed to have run.
