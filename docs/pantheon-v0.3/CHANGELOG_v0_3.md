# v0.3 Documentation Changes

**Date:** 2026-09-29. Documentation update only; the existing HTML demo, source game code, saved games and audiovisual assets are not modified. The 2026-10-03 entry below records a later presentation-technology update; the Added, Reconciled and Preservation sections describe the 2026-09-29 handoff.

## 2026-10-03 - 2D presentation migration (owner directive)

The owner's *2D Presentation Migration Directive* (2026-10-03) replaces the earlier presentation decision: PixiJS now owns the 2D Adventure Map, Tactical Battle presentation, sprite animation and animated Unit Detail viewer, and content presentation uses high-resolution 2D backgrounds, sprites, atlases, portraits, UI art and animation strips. Recorded as [DEC-23](DECISIONS_v0_3.md) (and ART-02 replacing ART-01).

Rewritten for 2D: the stack statements in README, CLAUDE, production/01 and the reconciled files; production/02 is now the 2D sprite pipeline (reference art -> portraits -> animation strips -> import/validation, frame sizes and anchors, sprite manifest, animation vocabulary and fallbacks); the creature bible's per-family plans are animation-strip plans; the environment/town/screen inventory describes painted layers, sprites and building overlays; the source registry lists PixiJS and Web Audio references. No game rule, number, roster, upgrade topology, campaign content or screen ID changed. Superseded statements kept as history are marked obsolete where they remain.

## Added

> **Obsolete (2026-10-03):** describes the abandoned 3D pipeline; superseded by the 2D migration (PixiJS sprites). Kept as history only. The "full Blender/glTF visual pipeline" listed below was rewritten as the 2D sprite pipeline on 2026-10-03.

Approved-stack architecture; The Three Beacons three-mission campaign; fixed-anchor/seeded-detail map-generation rules; explicit exactly-one-upgrade contract; full Blender/glTF visual pipeline; individual briefs for eight creature pairs; 32-building/non-creature/all-screen asset inventory; audio companion brief; official technical sources; production acceptance cases and current documentation QA report.

## Reconciled

Root README and CLAUDE now recognize the adopted technology and upgrade decisions. Active animation/data/migration/screen/catalog files point to the new production specification instead of saying the engine and 2D/3D choice are still open. The candidate unit statistics, building prices and combat formulas are retained, not silently rebalanced. The per-form ability assignment gap is explicitly labeled a proposed clarification.

The campaign resets armies/wallets between missions while carrying hero development, equipment, spells and the chosen minor deity. This is an explicit three-mission demo policy, not a global change to skirmishes. Procedural variation cannot change mandatory content or bypass story gates.

## Preservation and limitations

> **Obsolete (2026-10-03):** describes the abandoned 3D pipeline; superseded by the 2D migration (PixiJS sprites). Kept as history only. The renderer named below is no longer part of the game.

The 23 original active v0.2 documents are preserved under archive/v0_2. Existing v0.1 and screen-demo archives are unchanged. Previous validation claims remain scoped to their original package. New validation reports only current document/fixture checks; no game, Babylon renderer, Electron package, animations, music, balance simulation or human playtest is claimed to have run.
