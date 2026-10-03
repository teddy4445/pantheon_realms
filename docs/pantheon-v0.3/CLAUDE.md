# Development Handoff for Claude or Another Collaborator

## Current mission

Develop Pantheon Realms from this specification when implementation is explicitly requested. The approved platform: Pantheon Realms is a desktop-first, offline-capable, data-driven deterministic turn-based strategy game. TypeScript owns authoritative rules and AI. React owns application interface screens. PixiJS owns the 2D Adventure Map, Tactical Battle presentation, sprite animation, and animated Unit Detail viewer. Electron packages the desktop application and a browser build uses the same core. Content presentation uses high-resolution 2D backgrounds, sprites, atlases, portraits, UI art and animation strips. Gameplay state changes only through validated commands; presentation never defines gameplay outcomes. **Do not reopen the engine decision as if it were still undecided** (the 2D presentation is [DEC-23](DECISIONS_v0_3.md), 2026-10-03).

Every creature family has exactly a base and one upgrade. The current Greek catalog is eight families/sixteen forms. The demo campaign has exactly three levels. Story, encounter quantities, architecture details, generation parameters and asset budgets are concrete proposals, not proof of implementation or balance.

Read root README, DECISIONS_v0_3, production/01, both campaign documents, content/03, all remaining production files, then the current design/screens/implementation documents. Archived instructions are historical.

## Non-negotiable invariants

- One authoritative TypeScript rules implementation serves human commands, AI, previews, saves and both platforms. Keep it independent of React/PixiJS/Electron.
- The installed desktop campaign works with networking disabled, including all assets, codecs, AI, bestiary, settings and saving. No runtime generation service or login is required.
- PixiJS presents committed outcomes. Animation strips, frame callbacks, contacts and effect callbacks never apply damage, rewards or training.
- Preserve the existing candidate rule profile consistently: five resources, immediate one-building-per-town-per-day construction, shared family pools, Speed-based battle order, off-grid heroes and explicit movement/attack rules.
- Enforce exactly one upgrade for every defined creature family. Different sprite resolutions, costumes, damage poses and named encounters are not third gameplay forms.
- The campaign's fixed reinforcement/carryover policy, guarded crossings and two-relay finale are explicit scenario rules; do not replace them with hidden cheats or arbitrary random maps.
- The bestiary, recruitment, combat and hero views use the same creature data. Preserve base/context and per-creature/stack distinctions.
- Settings, the main menu, save compatibility and missing-asset fallbacks are functional features, not decorative screenshots.
- Keep primary history/mythology notes separate from original game fiction. Use original or properly authorized assets and record provenance.

## First development response

Explain the three-mission player journey, list the concrete modules and assets needed for mission 1, and identify any actual contradiction that blocks implementation. Do not ask for confirmation of the already approved stack or upgrade rule. Do not claim a short demo needs all six mythologies, multiplayer or a live service.

When code is authorized, begin with shared rules/content validation and offline packaging, then one fully working Hoplite base/upgrade pair through battle, recruitment and S18. Proceed to mission 1 and its save/completion loop before expanding the content volume. Use placeholders only with explicit development status; do not call placeholder-only graphics production complete.

The per-form ability mapping in production/03 is a P clarification of an earlier gap. Review it alongside the rule catalog rather than letting an animator accidentally choose abilities. Pin the actual TypeScript/PixiJS/React/Electron versions and the sprite import tool versions, and test that every runtime image loads locally.

## Definition of evidence

Report which commands/tests actually ran, the relevant versions/seeds and limitations. Document checks are not gameplay tests. A sprite import check (transparency, frame grid, size) does not prove good motion or frame rate. A golden map's connectivity does not prove fair combat. Browser automation does not replace actual desktop/device testing.

Never overwrite incompatible old saves. Keep the current HTML review demo and archived documents available for provenance. Update active docs when a rule changes, with a recorded decision and save/content version.

## Ready-to-paste initial development prompt

```text
Read the Pantheon Realms v0.3 documentation, starting with README.md,
DECISIONS_v0_3.md and CLAUDE.md. The stack is already approved: desktop-first,
offline-capable TypeScript rules/AI, React screens, PixiJS 2D presentation
(sprites, animation strips, painted backgrounds) and Electron, with a browser
build from the same core. Every creature must have exactly one upgrade.

Use The Three Beacons as the three-level demo target. First give a concrete
implementation sequence and repository structure grounded in these files.
Distinguish adopted direction from proposed balance and art budgets. Flag
contradictions, but do not substitute another engine or silently change rules.
Do not claim sprites, animations, gameplay or tests exist until they do.
After implementation is authorized, begin with the shared rules, offline
shell and one complete base/upgrade creature pipeline through mission 1.
```
