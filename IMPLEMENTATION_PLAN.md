# Implementation Plan

The game is built from the inside out: a deterministic TypeScript rules core
first, then the application shell, then every screen wired to real rules,
then the campaign, then hardening. Art stays temporary until the structure is
proven; placeholders are replaced by asset ID, never by rewriting screens.

Status legend: ✅ done · 🟡 partial · ⬜ not started

## Phase A — Foundation ✅

* ✅ npm-workspaces monorepo, strict TypeScript, DOM-free core tsconfig,
  vitest.
* ✅ `@pr/rules`: IDs, resources, RNG streams, hex math, content types,
  `MatchState`, commands, events, `processCommand`, quotes and commits.
* ✅ `@pr/content`: six playable pantheons (Norse, Egyptian, Japanese, Celtic, Mesoamerican values proposed),
  magic, *The Three Beacons*, *Twin Harbors*, validators (roster invariants,
  upgrade pairs, 18 town locations, acyclic building trees, gods, heroes,
  campaigns, asset references).
* ✅ `@pr/mapgen`: templates, barriers, anchors, roads, variation, validation,
  logical hash, golden fallback, decor stream.

## Phase B — Application shell ✅

* ✅ Electron main + preload (custom origin, CSP, sandbox, validated IPC,
  atomic saves); browser platform adapters.
* ✅ React shell: router with return context, overlays, toasts, keyboard.
* ✅ Babylon `EngineHost` (one engine, re-parented canvas).
* ✅ Preferences (draft/apply/persist), save-slot policy, placeholder asset
  manifest + procedural portraits.

## Phase C — All eighteen screens ✅

* ✅ S01–S05 main menu and setup flow (mode → campaign/scenario → pantheon →
  patron → briefing).
* ✅ S06–S18 in-game screens and dialogs, all driven by rules quotes.

## Phase D — Adventure and town logic ✅

* ✅ Movement, fog, sites, encounters, dawn/income/growth, building,
  recruitment, training, transfers, market, spellbooks, gods, covenants,
  hiring (incl. returning heroes), objectives, adventure spells (Divine Sight).

## Phase E — Tactical battle ✅

* ✅ Battle rules and resolution, tactical AI, auto-combat, Babylon battle
  scene with placeholder animation playback, previews, result and level-up
  flows.
* ✅ Town sieges (walls, gate, keep, moat, towers, Catapult, wall breaker,
  capture), BAT-14 defender selection, Tactics deployment.

## Phase F — Campaign 🟡

* ✅ M01–M03 manifests, carryover, completion records, restart, practice
  replay; headless journeys.
* ✅ UI-level automated test of Mission 1 to its debrief and into M02.
* ⬜ Balance pass on M03 finale (owner playtest).

## Phase G — Hardening 🟡

* ✅ Boundary lint, e2e journey, desktop smoke, save corruption handling.
* ⬜ Babylon deep imports to cut the 7.4 MB main chunk.
* 🟡 Installer builds: Windows x64 NSIS installer built and inspected (not yet
  run on Windows; unsigned). macOS/Linux installers not built.
* ⬜ Performance budget measurement on target GPUs (frame time, memory).
* ⬜ Accessibility audit (screen reader labels on the 3D views, focus order).
* ⬜ Owner review of every "proposed" number (no planned-only town location remains).

## Phase H — All six pantheons and asset pipeline ✅ (values proposed)

* ✅ Norse playable in skirmish from data only (Norse vs Greek, Greek vs Norse).
* ✅ Egyptian, Japanese, Celtic and Mesoamerican playable in skirmish from data
  only (shared pantheon kit); Twin Harbors offers all 36 pairings, chosen in
  setup (own pantheon + AI rival).
* ✅ GLB unit-model pipeline: manifests, validation, right-handed battle/viewer
  scenes, rigs with clip playback, proxy fallback, calibration fixture,
  `ASSET_PIPELINE.md` for artists.
* ⬜ First production creature pair (Hoplite) through the pipeline.
* ✅ Fair skirmish: point-symmetric Twin Harbors v2, same-archetype leaders,
  AI hiring/holding/danger fixes; `npm run balance` measures all pantheons
  side- and turn-order-neutral.

## Phase I — Pantheon identity ✅ (values proposed)

* ✅ Signature mechanics for all six pantheons as shared effect types
  (XP bonus, wounded fury, casualty recovery, army harmony, free shapeshift,
  Temple offering); The Three Beacons keeps its documented rules.
* ✅ Second minor-god choice: three gods per pantheon (18) with blessings
  from the shared vocabulary; campaign allowlist keeps Athena/Ares only.
* ✅ Training Academy, Watchtower and Artifact Merchant buildable in every
  town, with 10 new merchant artifacts; AI uses all of them.
* ⬜ Owner review of `DESIGN_PROPOSALS.md`; human playtests of the signatures.

## Next steps (in order)

1. Install the Windows build on a real PC and play; report anything that breaks.
2. Owner review of `DESIGN_PROPOSALS.md` (signatures, second god choice,
   support buildings) and of the proposed numbers for the five non-Greek pantheons, the
   skirmish covenant grant, the Strategos-type leaders and the siege
   simplifications (deviations in DEVELOPMENT_STATUS).
3. Human playtests per pantheon (re-run `npm run balance` after any value
   change); replace the dwelling stand-in art noted in the placeholder manifest.
4. First production model pair (Hoplite / Veteran Hoplite) through
   `ASSET_PIPELINE.md`; play `takeoff`/`land` in battle when the first flyer lands.
5. Babylon deep imports + chunk splitting; measure load time.
6. Minimap viewport frame; combat-log back-fill of the opening round.
7. AI use of adventure spells; stack merging before sieges; code signing for
   the installer (needs a certificate — owner decision).
