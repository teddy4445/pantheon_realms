# Adopted Decisions and Proposed Production Profile

**Date:** 2026-09-29; DEC-23 added 2026-10-03. The owner's latest instruction overrides older statements that technology and the presentation style remain undecided.

| ID | Status | Decision / scope |
| --- | --- | --- |
| DEC-18 | ADOPTED (presentation part superseded by DEC-23) | Desktop-first, offline-capable; TypeScript rules and AI; React; Electron desktop and browser build from the same core. **Obsolete (2026-10-03):** the original presentation clause "Babylon.js stylized 3D; Blender/glTF" describes the abandoned 3D pipeline; superseded by the 2D migration (PixiJS sprites). Kept as history only. |
| DEC-21 | ADOPTED | Every creature family has exactly one upgrade: base plus one upgraded form; no branching or third promotions |
| DEC-22 | ADOPTED scope | First demonstration campaign has exactly three short levels; the detailed story, encounters and numbers below are proposed |
| DEC-23 | ADOPTED (2026-10-03, owner directive "2D Presentation Migration Directive") | PixiJS owns the 2D Adventure Map, Tactical Battle presentation, sprite animation and animated Unit Detail viewer; content presentation uses high-resolution 2D backgrounds, sprites, atlases, portraits, UI art and animation strips; sprite manifest with explicit anchors, right-facing strips mirrored by the renderer, fixed animation vocabulary with fallbacks; labelled placeholders replaced by GPT-6 deliveries through `npm run sprites:import`. Rules, AI, content, saves, campaign, map generation and the React interface are unchanged |
| PROD-01 | PROPOSED | TypeScript module boundaries, worker contracts, local save adapters and packaging/security implementation in production/01 |
| CAMP-01 | PROPOSED | The Three Beacons story, manifests, fixed expedition carryover, XP caps and failure/checkpoint behavior |
| MAP-01 | PROPOSED | Three authored axial-hex templates with seeded non-critical terrain/decor and validated guard/relay gates |
| ART-01 | OBSOLETE (2026-10-03), superseded by ART-02 | **Obsolete (2026-10-03):** describes the abandoned 3D pipeline; superseded by the 2D migration (PixiJS sprites). Kept as history only. Shared pair rigs, original stylized Greek art direction, clip sets, budgets and non-creature inventory |
| ART-02 | PROPOSED (2026-10-03) | Paired 2D sprite sets (shared canonical reference, base strips first, upgrade strips derived frame for frame), original stylized Greek art direction, strip sets, frame-size and texture-memory budgets and non-creature inventory in production/02-04 |
| CONTENT-01 | PROPOSED clarification | Explicit per-form ability bindings in the creature bible, including Cyclops no-melee-penalty; review with the rules freeze |

All existing v0.2 numerical economy, combat, growth, unit and building values remain **P - proposed balance**, except where an owner decision explicitly says otherwise. Neither the technology decision nor the 2D migration turns any previous balance value into an approved fact; DEC-23 changes presentation technology only.

## Source precedence

Latest explicit owner instruction > this adopted-decision record > a later recorded rules approval > current proposed production/campaign documents for their own scope > current v0.2 proposed system rules > historical archives. Campaign-specific overrides apply only to The Three Beacons, not every future skirmish.

The exact data links and sprite/strip filenames are contracts to implement, not evidence that those files already exist. Documentation validation is not graphics, gameplay or balance validation. Keep the previous HTML screen demo unchanged until a separate implementation request.

## Closed versus still open

Technology and the 2D presentation are no longer open. One upgrade per creature is no longer open. Exact dependency versions, supported OS release matrix, reference hardware, final art approval, audio production, final balance, full multiplayer services and the other mythologies are still open production details. The new campaign provides a concrete proposed implementation target without pretending these later concerns are finished.

> **Obsolete (2026-10-03):** the 2026-09-29 wording of this section read "Technology and stylized 3D are no longer open"; it describes the abandoned 3D pipeline; superseded by the 2D migration (PixiJS sprites). Kept as history only.
