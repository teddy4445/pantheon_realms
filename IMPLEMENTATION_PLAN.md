# Implementation continuation — 18 October 2026

This plan records the owner's request to continue Claude Code's local work. Read it with `CLAUDE.md`, `ARCHITECTURE.md`, and `DEVELOPMENT_STATUS.md`. The checkout started at app **1.6.0**, with substantial uncommitted changes from Claude's synced releases. Preserve them. Do not reset, replace, commit, or push them as part of this continuation.

## Current implementation status — 1.7.0

The baseline and checkpoints below are retained as history. `DEVELOPMENT_STATUS.md` contains the current acceptance evidence.

Both approved packs are integrated: 14 Confluence chapters, 40 artifacts, 40 spells and 12 blessings. The final catalog is 9 campaigns / 51 current chapters, 128 artifacts, 94 spells and 26 interventions. Native artwork, atlas icons and VFX are connected. Frozen regional state, restored journeys, six native town owners, shared treasury/day/fog, finale reserve choices, finite assault waves, continuous-control timers and settlement endings are implemented and tested.

The caravan, battle HUD, minimap, coastal journal, AI scouting and New Fire fixes are in. Naval AI can recover a stranded fleet using marketplace resource trades; the conquest regression completes. Both sides receive Mooring protection in boarding battles. Campaign human battles remain manual. Source changes and existing user work are preserved locally, uncommitted.

Boundary/type checks and browser production build pass. All full-suite failures were resolved or identified as new fixture errors and covered by passing focused reruns. All 12 battle-HUD variants, both coalition finales and the new spell/relic browser flow pass. The packaged Windows app passes its isolated smoke check, including all 40 new expansion images. The 1.7.0 installer has been generated; see the status document for output paths, checksum and build acceptance.

Balance limitations: New Fire Normal/Hard casualty rates exceed proposed targets; one measured naval match lasted 147 days. Structural campaign tests do not prove difficulty balance or replace all 14 human chapter playthroughs. The sequel uses its disclosed canonical ruined-world start rather than importing the prequel's completed world. Separate currents/reef rules are not part of this implementation.

## Baseline and evidence

The initial catalog audit is saved in `C:/Users/lazeb/Desktop/blannder_models/implementation-audit-2026-10-18/catalog-audit.json`. The same directory contains the initial Git status, untracked-path list, tracked-change patch and validation logs. The patch is not a backup of untracked file contents.

The actual catalog contains 7 playable campaigns / 37 current chapters, 88 artifacts, 54 spells, 14 interventions, 60 gods, 124 creature forms, 60 dedication profiles and 11 town service rules. The 118 mission definitions also include legacy and skirmish variants; they are not 118 campaign chapters.

Claude's 1.3–1.6 implementation is present: projectile/impact profiles, upgraded land neutrals, city dedications, battle inspection, scouting, caravans, an aimed destructible catapult, ships, naval random maps, sea creatures, coastal towers, salvage and wrecks. Existing campaigns already prohibit human automatic battle resolution. Features are scenario-gated; their presence in the catalog does not mean every older campaign enables them.

At the audit baseline neither `worlds_met` nor `ashes_accord` existed in the catalog, and neither expansion pack was imported. The continuation progress below supersedes that baseline; an imported pack is not a completed gameplay implementation.

## 1. Stabilize the existing 1.6.0 implementation

First establish local boundary/type/unit-test results independently of Claude's cloud report. Preserve legacy saves and feature-off behavior. Finish these items in small, tested changes:

1. **Done 18 October:** remove abandoned caravan blockers when their owner is eliminated. The existing destruction event is emitted with no refund/loot. Old running saves are recovered on their next rules command; completed receipts and stale movement cursors are removed too. Seven regression cases failed before the change, then passed with all 34 caravan rules/UI tests. Other owners' shipments remain intact.
2. Connect the battle controller's existing `setInsets` to actual HUD measurements. Verify deployment and combat at 100%, 125% and 160% UI scale on ordinary, siege, boarding and single-ship boards. Preserve canvas-relative CSS-pixel measurements.
3. Draw visible caravans on the minimap; include visible ship actions in the rival-turn summary without revealing hidden movements. Coastal-watch sightings already appear in the summary; add durable alert history only through the established journal/save model.
4. Reproduce the reported New Fire chapter 2 Hard failure (`no path to 39,11`). Determine whether it is unreachable map geometry, a guard/target selection failure or an unsafe-army estimate before changing the map or difficulty.
5. Improve the AI's use of uncertain scouting bands without reading hidden exact armies. Keep the old v1 campaign flags unchanged until regression simulations support enabling them.
6. Re-run representative naval matches across pantheons and seats. Investigate Serpent Straits stalling and the reported Greek advantage; measure before tuning values. Run the balance suite for any balance changes.

Sea monsters that do not roam are a documented v1 scope limitation, not a missing art asset. Summon/teleport/resurrection/displacement are new mechanics needed by the next expansion, not features already implemented merely because naval occupancy validators exist.

## 2. Integrate the two approved campaigns

Source: `C:/Users/lazeb/Desktop/blannder_models/twin-campaign-production-2026-10-17/CLAUDE_HANDOFF.txt` and its design files. Preserve all existing campaign IDs and saves.

- Copy approved assets and metadata to the exact runtime/source/docs destinations in the handoff; do not ship draft reference images or absolute desktop paths.
- Implement one stable Confluence world topology, regional access masks and persistent landmark states. Prototype the proposed 192 × 144 envelope and ship travel before committing to that size. Maintain two approaches, loops and recoverable sea access.
- Add regional snapshots for all six protagonists: armies, towns, stocks, wallets, ships, explored cells, routes, sites, choices and consumed events. Freeze inactive regions. The current single-hero carryover is insufficient.
- Implement allied ownership, union fog, atomic coalition payments and a single world-day advance for the six-faction finales. Do not simply change the selected hero's owner or patron.
- Author `worlds_met_m01`–`m07` and `ashes_accord_m01`–`m07`, briefings, revelations, choices, marks and endings. Preserve Japanese P4/E5 and Celtic P5/E4 pairings.
- Wire campaign selection, chronicle/import choices, hero/town navigation, chapter transitions, journal and final settlement screens. Both endings keep the open future-content hook.
- Validate all chapters at Story/Normal/Hard, save/reload/transition, mandatory sailing access and campaign manual battles. After additive integration the current roster becomes **9 campaigns / 51 chapters**.

## 3. Integrate Mythic Library II (the latest prompt)

Source: `C:/Users/lazeb/Desktop/blannder_models/relics-magic-blessings-2026-10-18/CLAUDE_HANDOFF.md`. Read `GLOBAL_RULES.md`, all 92 design entries and VFX recipes before enabling content. Initial numerical values are balance proposals.

- Import the ten approved atlases with their measured source rectangles and hashes. The 36 VFX cells are separate materials, not successive animation frames.
- Add an atlas-aware icon component/resolver that preserves standalone-image support. Register effects with the existing texture/TweenPlayer lifecycle and reduced-motion/instant modes.
- Add typed shared semantic effect tags, eligibility, costs, quotas and a default-off `mythicLibraryV2` scenario flag. Existing saves do not silently gain the pack.
- Implement real conditional combat/economy hooks first, then cleanse/dispel/scouting/travel/ammunition, then safe displacement/flight/zones/reservations/courier escrow, then temporary resurrection/illusion/barriers. Each enabled entry needs rule validation, deterministic events, AI behavior, save support and UI feedback. Never substitute a generic stat buff for a specified mechanic.
- Add 40 artifacts (6 per pantheon + 4 general), 40 spells (5 per pantheon + 10 general; 25 battle / 15 adventure), and 12 Favor blessings (2 per pantheon). Blessings use the existing god commitments and shared once-per-week Favor allowance; they are not extra gods or permanent town dedications.
- Update inventory, merchants/loot, spellbooks, Favor, inspection/status, recruitment reservations, naval targets and encyclopedia. Preserve manual campaign combat and persistent hero destinations.
- Test illegal/cancelled targets, cost previews, quotas across transfer/save/split, temporary-unit cleanup, water and two-hex footprints, anti-softlock barriers, hidden information, AI and playback determinism.

Expected additive catalog totals: **128 artifacts / 94 spells / 26 interventions**. Do not expose unsupported entries in ordinary play to reach those totals cosmetically.

## 4. Release acceptance

Run boundaries, all TypeScript checks and the full unit suite. Run focused UI/E2E on a freshly started server, campaign simulations, naval balance and performance checks appropriate to changed code. Inspect screenshots for all affected screens. Build an offline browser bundle and then a Windows installer after acceptance; source version alone is not an installed playable build. Record commands actually run and unresolved issues in `DEVELOPMENT_STATUS.md`.

No additional illustration generation is currently needed for the two pending packs. Validate the supplied visuals in-game before requesting replacements.

## Progress

### Historical checkpoints, 18 October (superseded by the final status above)

- HUD insets now follow measured header/turn-order/footer bounds via ResizeObserver. Caravan minimap diamonds, visible-only naval rival summaries, saved coastal alert history (100 reports) and AI privacy for that history are implemented. Focused tests: 4 files / 36 tests passed. Core/client/desktop typechecks and the browser build passed at this checkpoint. Cross-layout browser checks are running; do not claim final acceptance yet.
- New Fire chapter 2's apparent route failure reproduced as an early patrol defeat. Its authored patrol now has a 12-hex regional leash. AI army estimates use the conservative portion of observed quantity bands, never hidden exact counts. A 30-mission, two-run, three-difficulty New Fire sample had zero blocked missions: Story and Normal 100% victories, Hard 90%. Normal/Hard casualty costs remain above target; this is not a balanced-release claim.
- Naval sample (150-day cap): Shattered Crown seed101 finished day30 with Norse victory; Serpent Straits seed7 finished day147 with Greek victory. Zero ship invariant issues. Two matches do not establish faction balance, and the long Straits duration remains a concern.
- Imported both approved packs with SHA-256 verification. New `tools/assets/import_twin_campaigns.py` is reproducible and refuses conflicting image overwrites. Atlas-aware asset resolution and SVG cropping register all 92 icons, 36 independent VFX textures, 14 chapter pairs, campaign covers, damaged town backgrounds and 48 landmark/town frames. Four artwork tests passed. VFX material playback is now connected to spell and blessing cast/impact events; map landmark use is not yet wired.
- Implemented all 40 artifacts, 40 spells and 12 blessings behind `mythicLibraryV2`. New random/editor/skirmish games and the two Confluence campaigns opt in; saved scenario flags remain authoritative. This includes shared action budgets, finite field/illusion/life effects, travel quotas, report-only scouting, escrow courier delivery, camp reservations, seed-town selection and reactive shadow-step ownership. UI, AI, full-suite and campaign integration acceptance remain in progress; do not treat catalog presence as final acceptance.
- Shared-world campaign foundation captures full frozen regional records into completion records, validates their hashes/world, and selects hero-specific carryover/patrons on transition and practice. Seven regional/existing campaign state-machine tests passed. The test-only six-region campaign is not shipped content. Final coalition restoration, actual map/chapter authoring and regional journey restoration remain to implement.
- Additional content/AI/campaign regression checkpoint: 12 files / 113 tests passed. Logs are in the external audit directory. No installer has been built from this continuation yet.

- [x] Inspect Claude's synced source, current catalog, delivery packs and known limitations.
- [x] Preserve baseline tracked diff and path inventories outside the game checkout.
- [x] Run local boundary and TypeScript checks: passed.
- [x] Complete local full-unit baseline: 145 files / 1,389 tests passed; one huge-map route-search test hit its 60-second timeout. The entire route-search file passed alone (4 tests; the slow case took 29.9 seconds). No clean single-run full-suite pass is claimed.
- [x] Fix eliminated-owner caravans; 7 regression cases plus all existing caravan rules/UI tests passed (34 total). Boundary and core/client/desktop TypeScript checks passed again after the fix.
- [x] Finish the remaining 1.6.0 fixes and targeted validation; record numerical balance limitations.
- [x] Integrate and validate the 14 new campaign chapters.
- [x] Integrate and validate the 92-entry content expansion.
- [x] Complete targeted release acceptance and build the 1.7.0 Windows x64 installer. Packaged app smoke test passes; broad human balance testing remains documented.
