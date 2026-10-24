# Current snapshot — 2026-10-24

The application remains **1.0.0**. The validated catalog contains six playable pantheons, nine campaigns with 51 current chapters, 65 creature families / 130 forms, 136 spells and 38 interventions. Availability varies by scenario. Current code includes the dragon families, painted magic expansion, visitable landmarks, restoration temples, city development art and expanded living-map scenery. Balance still needs human playtesting.

The latest Windows release artifact was built on 2026-10-23: **849,739,984 bytes**. See [performance evidence](docs/performance-20261023/README.txt), the [content snapshot](docs/development/content-snapshot.json), and the [new contributor handbook](docs/development/README.md). Documentation and the separate website were refreshed on 2026-10-24; this refresh does not constitute a new game build or a public deployment.

## Historical development entries

The dated entries below record what was true when written. Old chapter counts, preparation status and proposed delivery plans can be superseded by the current catalog.

# Local continuation acceptance — 1.7.0 (19 October 2026)

This section supersedes the cloud 1.6.0 “Remaining” list below where explicitly noted. The source checkout is still uncommitted. Implementation and application acceptance are complete for this continuation. Numerical balance remains subject to the playtesting limits below.

- Catalog: 9 campaigns / 51 current chapters, 128 artifacts, 94 spells, 26 Favor interventions. The additive packs are Mythic Library II and the two Confluence campaigns. Existing campaign IDs remain registered.
- Fixed abandoned caravans, measured battle HUD insets, visible caravan minimap markers, visible naval AI summaries, saved coastal alert history, and the New Fire chapter-two patrol leash. Campaign human battles remain manual.
- Mythic Library II: 40 relics, 40 spells and 12 blessings have typed rule implementations. The feature is saved and defaults off for old saves. The two Confluence campaigns and new random/editor/skirmish games opt in; older campaign definitions and saved scenario flags retain their prior scope. Low-level map-generator defaults retain the legacy seed outputs. Native atlas icons and independent VFX materials are connected to the UI and battle renderer.
- Confluence: one 96 × 72 offset-coordinate coast (compiled to the axial map envelope), six geographically masked regional chapters and a shared six-faction finale per era. Frozen region records restore armies, wallets, stocks, consumed sites, ships, dates, caravans and saved journey destinations. No offline region simulation. Coalition ownership/patrons remain native; treasury, visibility and the day are shared. Finales restart from the same recorded entry.
- Chapter content includes investigations, evacuation sites, independently operated sluices, island routes, neutral hiring sites, occupied forts, reconstruction and visible landmark choice variants. Aftermath town paintings remain until the normal Civic Hall reaches level two. Existing creature/hero art is reused; no new hero roster.
- First Accord: three announced commander pairs, a choice of reserve recipient before each act, then ratification. World We Leave Behind: three capturable anchors, the fortified Council siege, an explicit checkpoint before stabilization, three finite announced counterattacks, continuous-control timer, and two open-ended settlement choices.
- The sequel currently starts from a **disclosed canonical damaged settlement**, not an automatic import from a completed prequel run. Both campaigns preserve their own regional chronicle. Ocean currents and separate reef rules do not exist: Njord's Sounding reports explored landing opportunities and says so in its description. Sea monsters remain static encounters.

Acceptance:

- Boundaries and core/client/desktop TypeScript checks pass on the 1.7.0 source. Fresh browser production build passes.
- Full unit run: 163 files / 1,512 tests, 1,511 passed and one new coalition test fixture failed. The fixture assumed authored IDs instead of factory-generated IDs. After correcting only that fixture, the complete coalition file passes (5/5); focused catalog and campaign files also pass. This is full-suite coverage plus a focused rerun, not a claim that the initial full run was all green.
- All 14 Confluence chapters start at Story, Normal and Hard; land/sea reachability, both campaign orders, saved region restoration, shared treasury/day, finite finale waves and continuous-control timers are covered by automated tests. This does not replace a human playthrough of all chapters.
- All 12 battle HUD combinations (land, siege, boarding, ship/sea at 100%, 125%, 160%) passed across the original run and the isolated siege-125% rerun. Both new six-town finale browser tests pass with native owner switching and an unchanged shared treasury. Screenshots were inspected. The Library II browser check also passes: native spell/relic atlas rendering, legal target binding and casting-action consumption. Its initial failure was a test selector that counted the close icon; the corrected selector targets expansion artwork only.
- Naval conquest regression completes on day 136 after marketplace ship recovery, without ship invariant issues. Mooring protects both attacker and defender vessels. A separate two-map naval sample had victories on days 30 and 147, with no ship invariant issues.
- New Fire: 30 mission simulations, zero blocked missions, Story/Normal 100% victories and Hard 90%. Normal/Hard casualty costs remain above the proposed target. Long naval games and expansion difficulty still need broader human balance testing.
- Desktop build passes. The packaged Windows application passes its isolated smoke check: 1,655 sprite files, 572 paintings, 40 expansion images and 666 UI images decode; six audio samples decode/play; map rendering, manual save writing, records storage, origin isolation and packaged-mode restrictions pass. The 1.7.0 NSIS x64 installer and blockmap built successfully (exit 0); file version and SHA-256 are verified.

Build outputs:

- Run without installation: [Pantheon Realms 1.7.0](<C:/Users/lazeb/Desktop/pantheon_realms/apps/desktop/release/win-unpacked/Pantheon Realms.exe>). Keep the entire `win-unpacked` folder together.
- Windows x64 installer: [Pantheon-Realms-Setup-1.7.0-x64.exe](C:/Users/lazeb/Desktop/pantheon_realms/apps/desktop/release/Pantheon-Realms-Setup-1.7.0-x64.exe), 1,417,452,731 bytes. Built locally without a signing certificate. Installation on the user's existing profile was not performed; the exact packaged executable was smoke-tested with an isolated temporary profile.
- Browser production output: `C:/Users/lazeb/Desktop/pantheon_realms/apps/client/dist` (serve as static files).
- Installer SHA-256: `5365B37505AC3DF5D4309E6EC064565256F59412362330C5CBE042FA8CEF2033`.
- Rebuild: `npm run build`, `npm run desktop:build`, then `npm --workspace @pr/desktop run dist -- --win --x64`. Local graphics acceptance: `PR_E2E_HARDWARE=1`; CI retains SwiftShader by default.

Trying the new content:

- Start **New Game → Campaign** and select **When the Worlds Met** or **The Ashes of the Accord**. Each has seven chapters; the finale brings the six native heroes and towns together. Chapter completion, chronicle entries and saved destinations carry forward within the campaign.
- Start a new random, editor or skirmish game for Mythic Library II in ordinary play. Existing saves retain their recorded feature settings. Relic powers appear under **Relics** during battle, spells use the ordinary spellbooks, and blessings use the existing Favor commitment/weekly allowance.
- In coalition finales, use the town and hero tabs to switch the controlled native faction. This does not grant movement or a new day. All six share the treasury; **End Day** advances the coalition together.

Evidence: `C:/Users/lazeb/Desktop/blannder_models/implementation-audit-2026-10-18`. Historical cloud reports and intermediate checkpoints below are preserved; this section is authoritative for the continuation.

---

# Development Status

_Last updated: 2026-10-18 · **app 1.6.0** (the expedition kit: battle inspection, gradual scouting, an aimed catapult on the siege board, recruitment caravans, hero ships and boarding battles; two naval random maps, The Shattered Crown and The Serpent Straits; five sea-creature families and the ship-against-the-sea battle with the Deck Harpoon; coastal watchtowers, floating salvage and shipwrecks — no installer built; below) · before it, **app 1.5.0** (city dedications: each town with Temple II honors its patron or a committed minor god for a weekly gift, extra favored-creature stock and one town service; the gods' empire-wide income and growth move into these local profiles — synced to the PC, no installer built; below) · before it, **app 1.4.0** (three of the ten improvement ideas: a stack's count changes as the blow lands, each missile's own sounds and a brief hold on killing blows; a weekly training allowance at neutral hiring sites, and the computer hiring and training there; smarter patrols that chase, guard and, with a commander, fall back, walking their whole route — synced to the PC, no installer built; below) · before it, **app 1.3.0** (the battle FX & neutral-upgrade handoff: each of the 22 shooters, the siege towers and the catapult fly their own delivered missile and impact; six upgraded neutral creatures hired and trained at their hiring sites from one shared stock; both forms in the Bestiary — synced to the PC, no installer built; below) · before it, **app 1.2.0** (the campaign expansion and neutral creatures handoff: all seven campaigns as 37 chapters on authored region maps with a chapter graph, chapters in either order, remembered facts and practice replay; manual battles in campaigns enforced by the rules; six single-form neutral creatures with hiring sites, abilities and atlases; the chronicle, result, load, introduction, journal ledger, story choice, neutral recruitment, bestiary, battle and editor screens; older saves load and older runs keep their missions — synced to the PC, no installer built; below) · before it, **app 1.1.6** (the recruitment & persistent journey handoff: a redesigned recruitment screen for all six pantheons with Recruit all as one all-or-nothing command, painted route markers on the map, and each hero's journey kept from day to day, across screens and in saves — no installer built yet; below) · before it, **app 1.1.5** (Windows installer `installer\Pantheon-Realms-Setup-1.1.5-x64.exe` and `installer\build-installer.cmd`, which builds an up-to-date one on the PC; The Silent Oracle — the second Greek campaign, seven missions, listed after the tutorial, its story art — GPT-6 Brief 18 — delivered and imported the same day; named guard commanders' portraits in the battle header; The Three Beacons' second mission reduced to training two Griffins in town; no scroll rail over the map; the player stands on the left in blue when a computer hero attacks; the day of arrival beside the map cursor). 1.1.4: **app 1.1.4** (Windows installer: the 1.1.2 GUI audit’s fixes — each pantheon’s new siege gate as an opening in the wall on the gate cell, Start battle readable on its painted face, ink labels on parchment, paper under the book and scroll text while their pictures load, no internal caption on the town, battles that take no orders before their pictures are drawn; below) · before it, **app 1.1.3** (Windows installer: the owner’s five pre-game fixes — the title always on the kit’s hall painting with its slim menu panel, the encyclopedia’s sections in a rail at the left and its cards in painted frames, no footer Back on New Game, leather and parchment grain on the pantheon screens, a two-page creature page with the creature on its pantheon’s court; below) · before it, **app 1.1.2** (Windows installer: 1.1.1 with the two sessions’ work merged and the painted primary buttons fixed where their footers squashed them; below) · before it, **app 1.1.1** (Windows installer built in the cloud container: the 1.1.0 interface redesign, the pre-game screens and their frontend kit, the encounter scenes and reward receipts of a second session merged in, six adventure screens — Heroes’ Lodge, recruitment and creature camps, Marketplace, level-up, spellbook, encounter preview — and the 54 hero busts that complete the character portraits; below) · before it, **siege visual revision 2** (each pantheon's whole-view siege ground, gate/tower/keep atlas and continuous wall strip, the shared moat and bridge; checked in the game and built; in the 1.1.1 installer; below) · before it, **app 1.0.0** (Windows installer; owner Teddy Lazebnik): **the owner's third list of 2026-10-07** (campaign difficulty Story / Normal / Hard with the campaign simulator checking each level, a seat-fairness test that gates the authored maps — The Circle of Gates measured unfair and shipped unchanged —, a floor check per random-map layout, the map's ground drawn from a texture cache and calm frame pacing; below) · before it, **app 0.14.0**: **the owner's second list of 2026-10-07** (quick battles with exact expected losses, a late-game computer player and a summary of the rivals' turns, the campaigns checked by simulation, pantheon balance inside 0.45–0.55, a morale penalty for mixed armies, finished sieges, the gods' gifts at hero levels 10 and 15, the map editor's symmetry brush and generate-then-edit; below) · before it, **app 0.13.6**: **the owner's twelve requests** (one scenario-list style, unowned towns on random and skirmish maps, one hero hire a week, pantheon-named miracles, better-aligned roads, varied ground borders, map creatures facing both ways, interface clean-ups; below) · before it, **app 0.13.5**: **climate-aware nature scenery** (318 painted stills: each climate's trees, shrubs, rocks, deadwood, mountains and border clumps on the map, sea, lake and river scenery, battle obstacles in the map's climate) and **the hero screen's new equipment figure** (below) · before it, **app 0.13.4**: **the frame rate on the map and in battle** (the map, the battle and their figures in PixiJS render groups — a map frame sent 2.1 MB to the GPU, now 8 KB —, pictures decoded off the main thread, the fog redrawn only when it changes, the movement range and the computer's routes without their spikes, High capped at 60 frames per second, adaptive resolution and a frame-rate readout in Settings → Display; the frame rate on the owner's laptop is a target until measured there) and **GPT-6 Brief 17 in the game** (painted ground transitions and shore foam, 24 town backgrounds by town-hall level, the three markers, the neutral map hero, 16 story portraits) (below) · before it, **app 0.13.3**: **GPT-6 Brief 17**, the last art request (ground transitions and shore foam — the map is ready for them —, the town backgrounds, the last stand-in markers, the neutral map hero, 16 story portraits), **the status, action and miracle icons in battle** (marks over each stack, icons before the floating words, miracle icons on the map), **a steadier AI** (a lone big creature judged at its real strength; a home guard in every town) and **all five road types of Brief 16 in the game** (dirt approved by the owner; cobble, sand, snow and boardwalk awaiting in-game acceptance) (below) · before it, **app 0.13.2**: **the ground crisp again** (only the edges between grounds slightly softened), **GPT-6 Brief 16** (painted road tiles: five road types × every way a road crosses a hex; the game reads them already) and **Briefs 14 and 15 in the game** (six skirmish-map paintings, each pantheon's walls, gate, towers, keep and siege battlefield, the catapult's throw; below the asked resolutions, accepted) (below) · before it, **app 0.13.1**: **Brief 13 icons in the game** (94 interface icons, map markers, effect and status icons and interventions; the town backgrounds, Part A, still open) (below) · before it, **app 0.13.0**: **six authored skirmish maps** (Frostgate, The Burning Oasis, The Circle of Gates, Barrows of the Lost Kings, The Golden Fords, The Six Thrones; seat setup S23; GPT-6 Brief 14 for their pictures), **the owner's ten fixes** (rounded roads styled by the land, soft ground and fog, the pantheon and recruit pages, the End Day button and town icons, dwellings never needing a higher tier, battle playback, the result screen, the catapult and smaller arrows; GPT-6 Brief 15 for siege art) (below) · before it, **app 0.12.0**: **pantheon balance on random maps** (new `random1v1` suite; Norse 0.51, Egyptian 0.53, Japanese 0.47, Mesoamerican 0.47 inside 0.45–0.55, Greek 0.57 and Celtic 0.45 at the edges; AI temperaments softened), **every sound final** (105 Pixabay recordings: menu, battle music per pantheon, siege, results, stingers, effects, ambience), **three new random-map layouts** (Archipelago, Twin Continents, Central Valley; `pr-skirmishgen-0.6`), **the map editor** (S22, `*.prmap.json`), **Brief 12 in the game** (84 dwellings, 42 services, climate icons, site markers, `fx.god.commit`), **the release clean-up** (973 files and 55 unused functions removed) and **GPT-6 Brief 13** (what is still to paint) (below) · before it: **map music per pantheon** (30 licensed tracks, final), **climate rules** and **AI temperaments** (skirmish and random maps), **the god commitment** (icon rows in the dialog, a moment on the card), **GPT-6 Brief 12** (every visual still missing) and **the visual-completion delivery** (33 icons, the Herald's bust, twelve quieter opening paintings) (below; not yet in a Windows installer) · **the owner's briefs 8–11 in the game** (60 god and 74 hero portraits, 72 town building levels, the map heroes' `prepare` and `cast`, god-card icon rows; below; not yet in an installer) · **the owner's magic and Favor strips, town icons and battlefield climates in the game** (177 effect strips under their full `fx.*` IDs, 6 town-action icons, 54 climate battlefields; importer fixed; map aura loops; below; not yet in an installer) · **app 0.11.0** (Windows installer for play-testing): the **owner's delivered 2D art** (all 102 creature forms, six map heroes, map locations, battle objects and effects; below) and the **owner's 21 requests of 2026-10-04** (the Workshop's weekly wares, twelve new heroes, rarer joining and fleeing, square random maps for up to six empires, map and battle fixes, a miracle book, GPT-6 briefs 8–11) · app 0.10.0 with **code-drawn magic and Favor effects** and **34 new placeholder sounds** (five campaign soundscapes; below) · **owner interface pass, third round** (14 requests) · app 0.9.0 (the first installer with the 2D migration) · **GPT-6 queue in sheets** (140 images instead of 1,097) · **2D presentation migration** (PixiJS replaces the 3D layer; every sprite a labelled placeholder; below) · 0.8.0 before it · new in 0.8.0: town gates, the fallen stay on the battlefield, victory celebration, town drag and drop, the 24 delivered cursors and the 6 pantheon emblems · new in 0.7.0: the **owner's interface pass**, the **first 43 creature portraits** and the **2026-10-03 requests** (context cursors, divine gifts, a smarter AI, graphics quality; below) · since 0.5.0: **172 final functional icons**, **hero specialties, all 60 gods, nine new map sites, neutral reactions**, the **92 story pictures**, the **76 ground and sky pictures** and the **41 big-moment pictures** · rules `pr-0.2-candidate` + proposed effects (hero movement 750–1,000, shooting ranges, specialties, reactions) · content `content-0.8.0` (values changed without a version bump; its saves still load, with the new features off) · campaigns `campaign-three-beacons-0.4`, *The Winter Oath* and four arc campaigns (proposed) · mapgen `pr-mapgen-0.3` + random maps **`pr-skirmishgen-0.7`** · save schema 1 (saves from content-0.7.0 refused) · preferences schema 4_

Everything below distinguishes what was **measured** (commands actually run
in this session) from targets. Placeholder behavior is labeled as such.

Sections dated before the 2D migration are history: their mentions of the
deleted 3D layer are marked **obsolete** where they occur.

## Local continuation audit and caravan fix (2026-10-18; still app 1.6.0)

The owner asked Codex to take over the current local implementation after Claude Code ran out of tokens. The existing synced changes were preserved. `IMPLEMENTATION_PLAN.md` records the continuation order. Full audit and logs: `C:/Users/lazeb/Desktop/blannder_models/implementation-audit-2026-10-18/` (development evidence, not runtime assets).

- **Confirmed catalog:** 7 campaigns / 37 current chapters, 88 artifacts, 54 spells, 14 interventions, 60 gods, 124 creature forms. The two seven-chapter campaigns (`worlds_met`, `ashes_accord`) and Mythic Library II (40 artifacts / 40 spells / 12 blessings) are not integrated. All 30 approved campaign images and 10 expansion atlases passed fresh file/hash validation in their source delivery folders. No art was imported by this continuation.
- **Fixed:** eliminated players' caravans no longer remain as frozen blockers. `removeEliminatedCaravans` runs from the skirmish outcome evaluation for newly and previously eliminated owners, removes completed receipts too, clears their stale turn cursor and invalidates tile occupancy. Active shipments emit the existing destruction event, without loot/refund. Older running saves recover at the next rules command. Other players' shipments are untouched.
- **Measured locally before the fix:** boundaries and core/client/desktop TypeScript checks passed. Full unit run with two workers: 145 files / 1,389 tests passed, one huge-map route-search test timed out at 60 seconds (754.89 seconds total). The complete route-search file then passed alone: 4 tests, slow case 29.9 seconds. The earlier unrestricted-worker run was interrupted. This is not a clean single-run full-suite pass.
- **Measured after the fix:** seven new caravan regression cases had failed before the implementation; all 34 caravan rules/UI tests passed afterward. Boundaries and all three TypeScript checks passed again. No full-suite rerun, fresh E2E, visual acceptance, full balance run or installer build was performed in this continuation.
- **Still open:** HUD inset wiring, minimap/report refinements, AI intel estimation and naval balance, New Fire chapter 2 Hard simulation failure, both new delivery packs and release acceptance. Details in the plan; Claude's historical 1.6.0 report below remains unchanged.

## App 1.6.0 — Expedition: ships, sea battles, caravans, scouting, the aimed catapult; naval random maps, sea creatures, coastal sites (2026-10-18)

Four deliveries of 2026-10-17, implemented together: the EXPEDITION, NAVAL & SIEGE handoff (copied to `docs/expedition-v1/` and `assets-source/expedition-v1/`), the TWO NAVAL RANDOM-MAP TEMPLATES (`assets-source/art/naval-random-v1/`), the SEA-CREATURE ANIMATION & BATTLE handoff (`assets-source/art/sea-creatures-v1/`) and the COASTAL SITES AND SEA SALVAGE handoff (`assets-source/art/sea-sites-v1/`). All values are proposed and unplaytested. Saves: format, schema and `catalog.versions` unchanged; every stateful system has its own scenario flag (absent = off), so 1.5.0 saves load and play as before.

### What is in the game

- **Battle inspection** (presentation only; `ui/app/battleInspection.ts`, `components/battleInspection.tsx`): right-click, the `I` key or the info control; live Attack/Defense/damage/speed/shots/retaliations from the combat resolvers, front-creature health, effects with rounds left and their source (`BattleStatusState.sourceHeroId/sourceStackId/sourceSide`), pin.
- **Scouting intel** (`scoutingIntelV1`; `rules/resolvers/intel.ts`, `systems/intel.ts`, policy `catalog.scoutingIntelPolicy`): sighting beyond 3 hexes (owner + strength band), creature types within 3, quantity ranges with Scouting 1/2/3 within 2/3/4; last-known snapshots per observer in `MatchState.intel`; the AI plans on `estimatedArmy`. Guards and garrisons stay fully visible.
- **Targetable catapult** (`targetableCatapultV1`; `systems/battle/engine.ts`): a two-cell attacker engine at the top left of fortified sieges (120 HP, Defense 6, `rulesProfile.combat.siege.engine`), an engine phase after both creature queues (`BattleFireCatapult` / `BattleSkipCatapult`), attackable and spell-targetable by the defenders, damaged/destroyed art at 60/0 HP; no legacy automatic shot when on.
- **Recruitment caravans** (`recruitmentCaravansV1`; `rules/{definitions,resolvers,systems}/caravans.ts`, `CARAVAN_POLICY`): `DispatchCaravan` (the recruitment quote + 150 Gold, ≤ 7 stacks, one transaction), 600 movement at each owner turn start (saved cursor), holds on blockers / lost destination / full garrison, free `RerouteCaravan`, interception battles with hero-less cargo; the wagon on the map; the AI dispatches, reroutes and intercepts.
- **Hero ships** (`navalMovementV1`; `rules/{definitions,resolvers,systems}/naval.ts`): `world.ships`; `LaunchShip` (1,500 Gold + 10 Wood at a coastal town), `EmbarkHero` / `DisembarkHero` (≥ 100 movement, uses all), sailing at 100 per sea hex through `quoteTravel` (the UI previews with it), mixed routes stop at each transition for a confirmation, journeys keep the reason; ship invariants checked on load. On screen: `presentation/src/ships.ts` and `shipMotion.ts` (the kit's ship motion in TypeScript: idle, sailing with wake, embark/disembark crossfades, boarding, hit, sinking into the wreck; reduced motion), owner-colour flags, ShipInspect, the town's launch service, embark/disembark confirmations, the editor ship tool.
- **Boarding battles** (`boarding_two_ships_v1`, `systems/battle/board.ts`): two decks and a two-row bridge, 102 legal cells; one layout occupancy policy for every placement and move; drawn and hit-tested through hexmath (`layoutBoardProjection`, `pickCellOn`); the winner's ship takes the hex, the loser's sinks; retreat/surrender sail to the first free water hex, disabled with a reason when hemmed in.
- **Naval random maps** (`packages/mapgen/src/naval/`, `pr-naval-templates-1`, template v2): The Shattered Crown (2/3/6 empires, hold the relic 7 days) and The Serpent Straits (duel, elimination), Huge only; islands reached only by ship (`navalPolicy`, portals forced off, "Ships connect these islands."), a free starting ship per empire, ≥ 2 launch cells, checks NAV-1…NAV-21, ≤ 32 candidates then a reference-shaped fallback; painted cards and loading art; the AI's naval campaign (`ai/src/navalCampaign.ts`).
- **Sea creatures** (`seaEncountersV1`; `content/src/common/seaCreatures.ts`, `rules/systems/battle/seaBoard.ts`, `renewableShots.ts`, `systems/seaEncounter.ts`): five neutral families × base + upgrade (Hippocampus flies; Triton, Isonade, Cetus, Hafgufa swim with 2 renewable shots a round), proposed stats; the single-ship sea battle `single_ship_sea_encounter_v2` (deck 0–7, water 8–15, footprints never across the rail, the ship side bound to `sourceShipId`, range floor 8), Deck Harpoon (`BattleHarpoon`, 35 %, range 24, no retaliation, preview = resolution); the delivered frame regions, sockets and FX (the Deepwater Blast turned by π); the Bestiary sea section; editor placement on water.
- **Coastal sites** (`rules/{definitions,resolvers,systems}/seaSites.ts`, `catalog.seaSitePolicy`): coastal watchtowers (taken on foot, live 6-hex sight, one "Enemy ship sighted" alert per ship per owner-turn in `MatchState.seaWatch`), floating salvage (claimed once from a ship), shipwrecks (`ExploreWreck` for 100 movement; cargo, raiders on the boarding board, or an artifact with the swap/leave choice); placed in both naval templates with equal budgets.
- **Fixed**: Enter/Space on a focused adventure-map button no longer also ends the day.

### Integration review and fixes (lead)

An independent review of the whole change found one major and three minor items; fixed:

- **Retreats and launches onto sea sites** (major): `vacantWater` ignored sea monsters, wrecks and unclaimed salvage, so a retreating ship could stop on the monster's own hex (the site then unfightable) and a launch could put a hull on a site. `vacantWater`, `freeLaunchCells`, `withdrawalCoord` and `boardingWithdrawalBlocked` now take the catalog and skip those hexes; the sea retreat test asserts it.
- **Hiring onto an enemy caravan**: `quoteHireHero` refuses while an enemy shipment stands at the town's gate (a town captured while its owner's caravan waited there); new caravan test.
- **AI time**: the strategic AI no longer computes naval targets on maps without ships.
- **The v1 campaigns keep the old rules**: with scouting intel on, the campaign autopilot lost the fifth chapters of Twelfth Hour (Normal and Hard), The Winter Oath and Lantern Road (Hard) — 0/4 each. The flags are now off in the v1 missions (`arc.ts`, `winterOath.ts`; new runs play the v2 chapters, where both are on), which restores the 1.4.0 results exactly. Turning on only the catapult changed nothing there; the intel estimate is what the autopilot misjudges (see Remaining).

### Checks run (this container)

Commands run on 2026-10-18 (cloud container, two cores, SwiftShader):

- `npm run lint:boundaries`, both type checks: passed.
- `npx vitest run`: **146 files, 1,390 tests passed** (1.5.0: 110 / 1,033). New suites include rules naval (21), naval boarding (14), caravans (25), sea creatures (32), sea sites (22), intel (19), catapult (21); ai naval, naval campaign, caravans, sea creatures, sea sites; presentation ship motion, board projection, sea creatures; ui naval, sea creatures, caravans, inspection; mapgen naval templates (19), legacy hashes (10), sea sites (9); session naval saves.
- `npm run build`: production client 1.6.0.
- E2E (Playwright, one worker, dev server without file watching), 26 specs in one run (menu, frontend110, journey, plannedJourneys, recruitment, cityDedications, siege, battles, campaign, v2battle, v2neutral, v2upgrades, mapEditor, skirmishMaps, encounters, services, features, pantheons, battleInspection, siegeCatapult, scoutingIntel, caravans, naval, navalRandom, seaCreatures, seaSites): **167 passed, 3 failed** (1.7 h). The three: `frontend110` read the version from a server started before the version bump (passed after a restart); `recruitment` › edge cases, the known flake (passed alone); `menu` › portraits compared the interface manifest's creature portraits with every catalog form — outdated since the neutral forms of 1.2.0 brought their own portraits — so it now counts only forms whose portrait lives there (passed).
- Campaign simulator, 4 runs per campaign and level:
  - v2 (`--content 2`): Story 100 %, Normal 99 %, Hard 93 % (1.5.0: 100 / 98.6 / 93.9 %). New Fire chapter 2 Hard stays blocked (0/4, "no path to 39,11" — the open content item since 1.2.0).
  - v1, after the fix above: Story 100 %, Normal 100 %, Hard 94 % — the 1.4.0 numbers.
- Naval random maps: 100/100 seeds per seat count (Crown 2, 3, 6; Serpent 2) and 495/495 unowned-town and neutral-site settings, no fallback; legacy map hashes unchanged.
- Headless naval AI matches (150–200-day cap): Shattered Crown 6/6 finished by holding the relic (days 29–141); Serpent Straits 11/16 finished within 150 days before the coastal sites, every match within 200 days after (average 136 days). The Greek AI won 9 of the 11 finished Serpent matches from either seat.
- Screenshots: `/home/claude/capture/expedition/{inspection,catapult,scouting,caravans,ships}/`, `/home/claude/capture/naval-random/`, `/home/claude/capture/sea-creatures/`, `/home/claude/capture/sea-sites/`.

### Remaining / not done

- **Balance**: `npm run balance` was not re-run for 1.6.0. Serpent Straits stalls and the Greek advantage there need a pass. With scouting intel the AI's army estimate can be too optimistic (the v1 autopilot losses above); check the AI's bands before the release. Sea-creature stats, caravan fee, ship price and catapult values are unplaytested.
- **Screens**: the battle view's `setInsets` is not wired by the UI (pre-existing): at 160 % the HUD bars cover the top/bottom band of painted boards (cells stay clear). Wagons are not on the minimap; AI ship events are not in the rivals' summary; no event log for tower alerts beyond toasts and "While you waited".
- **Rules**: sea monsters never roam (ship-as-defender only by script); the game has no summon/teleport/resurrection/knockback in battle, so those validators are tested in isolation; an eliminated owner's caravans stay frozen on the map.
- **PC**: synced on 2026-10-18 with `pantheon-realms-1.6.0-sync.tgz` in `blannder_models\gui-review-2026-10-10\delivery-1.6.0\`: 395 text files (390 written, 5 identical, 0 conflicts against `after-sync:1.5.0`); the 132 kit pictures were re-created on the PC by the four importers (`--kit` on the delivery folders) and match the cloud byte for byte; the packages, tools, tests and apps digests are equal. The PC drive had 331 MB free afterwards. No installer built; nothing committed.

## App 1.5.0 — City dedications (2026-10-17)

The CITY DEDICATIONS handoff of 2026-10-17 (delivery `blannder_models\divine-city-benefits-2026-10-17`; documents copied byte for byte to `docs/divine-city-benefits-v1/`). Values are proposed and unplaytested, with one owner-approved tuning: Inari 600 → 1,200 Gold a week and Njord 4 Wood → 3 Crystal a week (`CITY_DEDICATION_TUNING`). Saves: format, schema and `catalog.versions` unchanged. The scenario flag `cityDedicationsV1` is additive: absent means off, so 1.4.0 saves load in legacy mode and nothing switches on after a load.

### What is in the game

- **Data** (`packages/content/src/common/cityDedications.ts`, catalog `cityDedicationProfiles` / `cityServiceRules` / `cityDedicationPolicy`):
  - The 60 god profiles (weekly resource, favored family with its quarter-creatures per week, service), the 11 service rules and the policy (Temple II, first dedication free, switch 500 Gold).
  - Checked against the delivered JSON by `packages/content/test/cityDedications.test.ts` (only the recorded tuning differs) and by `CityDedicationValidator`.
  - Explicit new-mode summaries for the 12 affected gods (`cityModeGodSummaries`).
- **Rules** (`packages/rules/src/systems/dedication.ts`, `dedicationSystem.ts`, `dedicationView.ts`):
  - Commands `DedicateTown` (free, only without an active or pending dedication; services at once) and `ScheduleTownRededication` (500 Gold spent on confirm, activates at the next world-week boundary; one pending switch; never for another player). Both have pure quotes, and commits requote.
  - Eligibility: owned town of the player's pantheon with Temple II; the god is the current patron or a committed minor.
  - **Dawn**: one idempotent transaction per town and week (`applyOnce` key plus the persisted `TownDedicationState.lastProcessedWeek`, stamped even when the town is ineligible):
    1. a due, valid switch activates (an invalid one waits, `TownRededicationDelayed`);
    2. the existing income;
    3. the gift, after the owner's `incomePercent` with each resource floored;
    4. after ordinary growth, one favored-family credit update: quarters added; whole creatures go to the shared pool only with the base dwelling built; never multiplied.
  - **Dormancy and capture**: a lost Temple makes the dedication dormant (nothing applies; identity and credits kept). `changeTownOwner` → `clearTownDedication` clears god, pending switch and credits but keeps the stamp. It is the only place a town's owner changes.
  - **Legacy god economics**: with the feature on, `godEffects` leaves out direct `daily_income` / `weekly_growth_bonus` god benefits (12 gods). Hero god perks, signatures, events and buildings are unchanged (`godBenefitsForMode`).
- **Services** (`packages/rules/src/systems/dedicationServices.ts`, one dispatcher by rule kind):
  - The service is local, needs its building, is Gold only and is applied per unit then multiplied; the highest percentage wins.
  - Quotes that carry a `dedication` saving: construction, recruitment (single and batch), troop upgrade, market buy (floored at the best sell rate of any tier + 1, so no buy/sell loop pays), hero training, artifact merchant and workshop, spellbook.
  - `townVisionRadius(catalog, state, town)` is state-aware (+2 with a watchtower).
- **AI** (`packages/ai/src/dedication.ts`, build scoring in `build.ts`):
  - Dedications go through the same view, quotes and commands.
  - It weighs only eligible gods over four weeks cut to an estimated end: gifts by its build plan's material needs, extra stock only where the dwelling stands or is coming and it can buy them, service savings only on transactions it plans.
  - It waits, at most until the eve of the week, for a commitment worth a switch. It switches only on a construction or commitment trigger, never while one is pending, and only when the gain is at least 1.25 × the fee.
  - Commitments are scored by the blessing that applies in the match's mode, and Temple II gets a bonus.
  - `npm run balance -- <suite> --legacy-gods` plays the same matches with dedications off, and the reports have an economy-and-dedications section.
- **Screens** (`packages/ui/src/app/dedication.ts`, `components/dedication.tsx`):
  - **Town**: a temple medallion and a dedication pane with three illustrated rows, each with its own status (weekly gift and payout day; favored growth and rare-growth progress in words; service and its building).
  - **Selection**: only the patron and committed gods are choices, the rest are "Future choices" with reasons. Confirmations for the free first dedication and for a switch (cost, both gods' benefits, activation day, no cancel, no refund on capture).
  - **Pantheon screen**: cards split into "Empire blessing" and "Available city dedication", with the player's cities.
  - **Recruitment**: growth breakdown, god medallion and discounted prices.
  - **Services**: "X's patronage — saves N Gold" in construction, market, academy, merchant, workshop, spellbook and troop upgrade.
  - **End of day**: a "City blessings" section in "While you waited".
  - **Encyclopedia**: mode-aware.
  - All of it is hidden in legacy games. Only existing art is used.
- **Feature flag**: on for new skirmishes, random, editor and authored maps, arc campaigns, The Winter Oath, The Silent Oracle and the campaign-v2 chapters. Explicitly `false` for The Three Beacons, v1 and v2.

### Checks run (this container)

Commands run on 2026-10-17 (cloud container, two cores, SwiftShader):

- `npm run lint:boundaries`, `npm run typecheck` (core, client, desktop): passed.
- `npx vitest run`: **110 files, 1,033 tests passed** before the tuning (was 102 / 915). After the tuning the five dedication test files passed again: 112 tests.
  - New: content `cityDedications` (10, plus the tuning check), rules `cityDedications` (29) and `cityServices` (36, including the market no-profit sweep over towns, tiers and resources), session `cityDedicationsSave` (2), campaign `cityDedicationsFlag` (3), ai `cityServices` (2) and `cityDedications` (22), ui `dedication` (14).
  - Changed: `signatures.test.ts` and `random.test.ts`, because skirmishes now default to the feature.
- `npm run build`: production client 1.5.0; no local disk path in `dist`.
- Balance, AI vs AI, both computers on the new AI, feature on vs `--legacy-gods`:
  - Skirmish (144 matches each): every pantheon's score is within ±0.06 of legacy, which is noise.
  - Random 1v1 (120 matches each): the same, within ±0.06.
  - City gifts are under 2 % of weekly income. Computer empires reach Temple II around day 19–25 (Mesoamerican day 6–7) and the matches end around day 18–22.
  - Hermes, Njord, Hathor and Inari were never committed in either mode, so these suites cannot see their loss. Their change was sized from the data (weekly Gold equivalent, legacy → new):

    | God | 1 town | 3 towns | 6 towns |
    |---|---|---|---|
    | Inari | 3,850 → 648 | 3,850 → 1,944 | 3,850 → 3,888 |
    | Njord | 4,900 → 1,100 | 4,900 → 3,300 | 4,900 → 6,600 |
    | Hathor | 1,750 → 648 | 1,750 → 1,944 | 1,750 → 3,888 |
    | Hermes | 1,750 → 740 | 1,750 → 2,220 | 1,750 → 4,440 |

    These figures are before the tuning. After it, Inari and Njord break even at about 3 towns. Danu, Izanagi, Tlaloc, Chalchiuhtlicue, Demeter, Freyja and Hera gain even with 1 town.
- Campaign simulator v2, 4 runs: Story 148/148, Normal 146/148, Hard 139/148 (1.4.0: 148 / 146 / 137). Twelfth Hour 3 Hard went 2 → 3/4 and Twelfth Hour 5 Hard 3 → 4/4. The autopilot dedicated 246 of 248 eligible towns.
- E2E (Playwright, one worker, dev server without file watching): `cityDedications` 26 (new: the six pantheons' pane and selection at 1280 × 720 and 160 %, keyboard and pointer, switch, pending, dormant, foreign, recruitment, savings, summary, Pantheon, Encyclopedia, legacy save), plus `brief13`, `recruitment`, `gui110`, `round19`, `services`, `campaign`, `journey`, `encounters`, `siege` and `battles` in one run: **70 passed, 1 failed, 1 skipped** (42.9 min). The failure was `recruitment` › edge cases, which timed out waiting for the town tab after a save import and **passed when re-run alone** (37.6 s). The UI agent saw the same flake once in another test of that spec. `brief13`'s tile-panel marker check was updated: since campaign v2 the panel can also show an objective's quest marker, so the spec now looks for the site's own marker.
- Screenshots: `/home/claude/capture/city-dedications/`: the temple pane and selection for all six pantheons at 1280 × 720 and 160 %, confirmations, pending, dormant, foreign, recruitment, savings, summary, Pantheon screen, Encyclopedia.

### Remaining / not done

- **Balance**:
  - The suites cannot measure the economic gods (never committed before the day cap). The old income loss matters for human players.
  - Computer empires start without a patron (`missionFactory` sets `patronGodId: null` for AI rivals and random-map seats; pre-existing), so their first dedication waits for Temple II and a 20-Favor commitment.
  - The AI never trades, upgrades town stacks or buys spellbooks, so those services never draw it to a god.
- **Screens**:
  - The merchant, workshop, spellbook and troop-upgrade saving lines are implemented but not covered by e2e.
  - "City blessings" comes from the dawn's live events, so reloading after the dawn does not bring them back.
  - The hero screen shows no service prices.
  - The medallion is smaller than the kit's 44 px buttons; the temple pop-up's action is the large alternative.
  - Zeus' authored blessing text ("Fixed patron of The Three Beacons…") now appears under "Empire blessing" in skirmishes (content text).
- **Rules**: no other percentage discounts exist yet; the highest-percentage rule is in place for them. There is no town "upgrade all" path.
- **PC**: synced on 2026-10-17 with the bundle `pantheon-realms-1.5.0-sync.tgz` in `blannder_models\gui-review-2026-10-10\delivery-1.5.0\`. The conflict cutoff was the end of the 1.4.0 sync (`after-sync:1.4.0`). The handoff documents had already been copied byte for byte from the delivery folder. No installer was built; nothing was committed.

## App 1.4.0 — Blows that land, the AI at neutral camps, smarter patrols (2026-10-16)

Three of the ten improvement ideas proposed on 2026-10-16, chosen by the owner
(1, 3 and 5), with the owner's two decisions: the weekly training allowance is
the site's weekly stock, shared by every empire; only patrols with a commander
fall back, wandering monsters never flee. Values are proposed and unplaytested.
Saves: format, schema and `content-0.8.0` unchanged; older saves load (no
training counted this week; a patrol's round starts from its stored
`waypointIndex`, 0 in every older save).

### What is in the game

- **Blows that land** (presentation and audio only):
  - **Count badges.** A stack held for playback keeps the count it shows until its blow lands (melee, shot, tower arrow, moat, damaging spell or miracle), until a heal or status lands on it, or until its playback ends (`packages/presentation/src/impactTiming.ts` `nextBadge`; `battle.ts` `applyBadge`). A destroyed stack's badge goes with the blow. Instant playback and skip end with the same badges as before. This closes the 1.3.0 item "a target's count badge drops before the missile lands". A stack hit twice in one batch shows the batch's final count at its first blow.
  - **Missile sounds.** Each of the 24 projectile profiles carries release and impact sound IDs (`sounds`). They come from the importer's `SOUNDS` table and use existing sounds only (ASSET_PIPELINE.md §21). The director's new `play(id, { maxMs })` cuts long magic sounds with a 70 ms fade. The shooters no longer play the bow and arrow-hit sounds; the towers and the catapult keep theirs.
  - **Killing blows.** A blow that kills creatures (melee, shot, tower arrow) holds the whole playback for 60 ms, or 100 ms when the stack is destroyed, multiplied by battle speed (`TweenPlayer.freeze`). It also flashes softly at the contact point, except on Low graphics or with reduced motion.
  - These change no rule, random draw or camera.
- **Weekly training allowance** (`packages/rules/src/systems/world.ts`):
  - A neutral hiring site upgrades at most `campTrainingAllowance` creatures a week: the site kind's optional `weeklyTraining`, else its `weeklyGrowth`. All empires share it, and it renews in the week the stock refills.
  - The count is kept in `SiteState.trainedThisWeek` / `trainedWeek`, both optional. A count from an earlier world week means none trained this week.
  - `quoteCampTraining` reports `weeklyAllowance` and `leftThisWeek` and caps `maxQuantity`. Asking for more is refused with "Its trainers can take N more this week (M a week)". Training still uses no hiring stock.
  - The Train strip shows "N of M left this week". Its quantity and Max stop at what is left, and once none are left the reason is the visible disabled state.
- **The AI at neutral camps** (`packages/ai/src/services.ts`):
  - It hires the form that adds the most `fightingStrength` for the Gold above 1,500, with ties going to the upgrade. It trains its base stacks above 1,000 Gold, within the allowance. Hiring and training are ranked by strength per Gold.
  - It values a camp by the best form it could buy plus the possible training (`campTargetValue`). It skips camps behind an unmade pact.
  - Patrols and scripted hostile players still never use camps. The campaign autopilot holds training back while an objective waits for Gold (`tools/campaign-sim/pilot.ts`).
- **Smarter patrols** (`packages/ai/src/patrol.ts`; shared helpers moved to `threat.ts`). The patrol plays on the belief only, deterministically, in this order:
  1. It waits while dormant.
  2. A commander falls back when a visible enemy of at least 1.25 × its strength can reach it next turn: to a safe chase, else its home camp (a free tile beside it while the guard holds the tile), else its safest waypoint, else it holds.
  3. It chases the visible hero it can best beat by its unchanged `attackThreshold`: nearest by path cost, then the biggest margin.
  4. It guards: a visible enemy within 6 hexes of a waypoint or its camp sends it to the point nearest that enemy, where it holds.
  5. Otherwise it walks its round.

  Guard, round and fall-back moves never stop where a much stronger visible enemy can reach. Wandering monsters never flee.

  Two fixes found by measuring:
  - A waypoint still in the hostile side's fog is now approached through explored tiles. Before, Acatl, Tlacatl and Phaidon never moved.
  - The round follows `HeroAiState.waypointIndex`, which `commitMoveHero` now advances on arrival (`patrolWaypointIndex`). Before, the stateless round turned back on legs longer than a day and skipped a waypoint listed twice.
- **Town threat**: a wandering monster near a town with no hero inside no longer makes the town "threatened" (`strategic.ts`). Patrols never move on towns. With guarding patrols, a strong hero was being recalled home every day and never left again (Lantern Road chapter 6 in the simulator).

### Checks run (this container)

Commands run on 2026-10-16 (cloud container, two cores, SwiftShader):

- `npm run lint:boundaries`, `npm run typecheck` (core, client, desktop): passed.
- `npx vitest run`: **102 files, 915 tests passed** (was 98 / 855). New or extended:
  - `presentation/test/impacts.test.ts` (14): freeze, badge timing, hit-stop, flash, profile sounds.
  - Audio director `maxMs`, and UI `cueSound` with sound coverage.
  - `rules/test/neutralUpgrades.test.ts` (24, was 16): allowance shared and renewed, refusal text, old state, `weeklyTraining`.
  - `rules/test/patrolWaypoints.test.ts` (5).
  - `ai/test/campUpgrades.test.ts` (12).
  - `ai/test/patrol.test.ts` (13).
  - `session/test/neutralUpgradesSave.test.ts` (5, was 3).
  - `ui/test/neutralRecruit.test.ts` (19, was 16).
- `npm run build`: production client 1.4.0; no local disk path in `dist`.
- Campaign simulator, 4 runs per level, computer-played (not playtests). Baselines are the 1.3.0 code, run the same day.

  | | Story | Normal | Hard |
  |---|---|---|---|
  | content v2, 1.3.0 | 148/148, costliest 8 % | 147/148, 39 % | 136/148 (92 %), 41 % |
  | content v2, 1.4.0 | 148/148, 8 % | 146/148, 39 % | 137/148 (93 %), 39 % |
  | content v1, 1.3.0 | 180/180, 4 % | 180/180, 18 % | 169/180 (94 %), 34 % |
  | content v1, 1.4.0 | 180/180, 4 % | 180/180, 18 % | 169/180 (94 %), 34 % |

  v2 chapters whose wins changed:
  - Silver Branch 2 Hard: 0/4 → 3/4 (the boar now comes to guard its route and is found).
  - Silver Branch 3 Hard: 3/4 → 4/4.
  - New Fire 3 Hard: 4/4 → 2/4 (timeouts: after a lost chapter 2 the autopilot chases the raiders round their route and never explores to the objective).
  - Twelfth Hour 5 Hard: 4/4 → 3/4 (the reserve guards beside the rookery and catches a weakened Seshet).
  - New Fire 1 Normal: 4/4 → 3/4 (the jaguars walk their whole round and catch Itzel after a 93 % loss).

  New Fire 2 Hard stays 0/4, for a new reason. Acatl now walks his authored round north first and catches Itzel coming down the northern stairs on day 2; in 1.3.0 he never moved and caught her on day 4. Normal's costliest battle stays outside its band. No campaign content or values were changed.
- AI smoke: `npm run balance -- skirmish --matches 2` (144 jobs, all finished; 128 by elimination, mean day 18.9).
- Probes (temporary scripts, not kept):
  - 8 small random maps with neutral hiring sites: the AI hired 60 upgraded and 5 base creatures and trained 5.
  - `npm run balance -- random --matches 4` before and after the patrol change: two empires 0.54/0.46 in both, mean decisive day 21.1 → 25.4 (wandering monsters that guard slow matches down).
- E2E (Playwright, one worker, dev server):
  - The feature agents' runs: `v2fx` **9 passed** (twice), with new checks for the badge at the impact, hit-stop, flash and the cue sounds; `v2upgrades` **10 passed**, with new checks for the left-this-week text, the cap and the spent state, including at 160 %.
  - The lead's regression run after integration: `campaign` 2, `siege` 2, `v2battle` 8, `v2fx` 9 and `v2neutral` 11: **32 passed** (42.4 min). Then `v2upgrades` 10, `journey` 1 and `battles` 5: **16 passed** (23.6 min). Both runs used one worker and a dev server without file watching. Two small changes came after these runs: seven files given back their CRLF line endings, and a patrol's round kept after its chases in case the rules refuse every chase. Both were checked with the full unit suite and both simulator runs, whose numbers are identical to the ones above.

### Remaining / not done

- **Sounds not listened to**: chosen from durations, envelopes and titles. Please listen to the frost breath (`magic.water`), the boulder release (`combat.catapult`) and the sling thud (`combat.hit_heavy`).
  - Most `magic.*` sounds allow one voice, so overlapping shots at 2× can skip one (silently).
  - Instant playback still plays one summary sound (`combat.arrow_hit` for any shot).
- **Held stacks defer every label change** (the acting stack's health suffix too) until their blow or release. Floating words keep moving during a hit-stop. Spell, miracle and moat kills have no hit-stop.
- **Balance**:
  - On the AI's strength heuristic an upgrade is ×1.32–1.37 a base creature. Hire base, hire upgrade and train are close in strength per Gold (0.084–0.135), and training is the best deal everywhere (Afanc most).
  - A site can now turn out up to twice its stock in upgrades a week (hire the stock, train the allowance).
  - The (n+1)/n few-creatures factor can rank a small new hire above training a large stack.
  - The balance suites never switch on random-map neutral sites, so there is no measurement beyond the 8-map probe.
- **Patrols**:
  - New Fire 2 on Hard is too hard for the autopilot with Acatl walking his route. Options for the owner (content): start his round on the south shore, raise his Hard attack threshold, or give Itzel a stronger start.
  - Twelfth Hour 5 Hard: a smaller guard radius or that reserve's waypoints away from the rookery.
  - The simulator autopilot can chase a patrol round its route (New Fire 3).
  - About 8 % more planning time per simulated day.
  - A replayed 1.3.0 command log that trained over the allowance in one week would now be refused (saves are state, so they load).
- **PC**: synced on 2026-10-17 with `tools/sync/apply_bundle.py` (bundle `pantheon-realms-1.4.0-sync.tgz` in `blannder_models\gui-review-2026-10-10\delivery-1.4.0-ideas\`). The conflict cutoff was the end of the 1.3.0 sync on the PC (`after-sync:1.3.0`, read from `sync-report-1.3.0.json`); no PC source file had changed since then (only the owner's 1.3.0 installer). No installer built this round; nothing committed.

## App 1.3.0 — Shooters' own missiles and impacts; six upgraded neutral creatures (2026-10-16)

The PROJECTILES, IMPACTS & SIX NEUTRAL UPGRADES handoff of 2026-10-15
(delivery `blannder_models\battle-fx-neutral-upgrades-2026-10-15`). It
supersedes the campaign-v2 instruction that the six new neutrals are single
form (owner request). Values are proposed and unplaytested. Saves: format,
schema and `content-0.8.0` unchanged; older saves load with their armies as
they were (nothing upgrades itself); upgraded stacks round-trip.

### What is in the game

- **Art** (`npm run battlefx:import`, ASSET_PIPELINE.md §21): the 25 delivered
  PNGs byte for byte in `assets-source/` and `assets-runtime/battle-fx-neutral-upgrades-v1/`
  (SHA-256 checked), the handoff and JSON metadata in
  `docs/battle-fx-neutral-upgrades-v1/`, a namespaced runtime manifest merged
  into the sprite manifest by `packages/ui/src/assets/manifest.ts` (never
  replacing it): six upgraded creature sets, 24 impacts, 24 travel stills and 24
  `projectileProfiles`.
- **Missiles and impacts** (`packages/presentation/src/battle.ts`, new pure
  `projectiles.ts`): each of the 22 shooter forms flies its own missile — the
  catalog's shooters are exactly the delivery's 22 — and lands its own impact;
  `SiegeTurretShot` uses the tower arrow, the catapult its stone, and a
  wall-breaking shooter (Cyclops, Colossus and upgrades) its own boulder or
  block; a shooter's melee blow flies nothing; an unknown future shooter keeps
  the generic arrow. Paths: high arc (stones), low arc (javelins, darts,
  arrows, slings), straight (magic, breath, wail, fire), the arc kept inside
  the board's frame; flight time from the profile's range by distance, scaled
  by battle speed; released on the shoot strip's release frame from a
  calibrated per-unit socket (table in `projectiles.ts`); travel frame 0 moved
  through the world (physical) or four looping poses (magic), rotated along the
  path and never mirrored twice; the impact once at the contact point with the
  hit reaction and damage words, fading over its last 100 ms; frame-region
  effects set each frame's pixel anchor and `sourceScale`. Graphics Low shows
  the first impact frame; reduced motion is instant playback (no missile).
  Cosmetic only: no rule, damage or random draw changes.
- **Six upgraded neutrals** (`packages/content/src/common/neutralsV2.ts`):
  Dawncrest Pegasus, Crownroot Runner, Crested Serpopard, Dreamtusk Baku,
  Ridgeback Afanc, Crownfin Ahuitzotl — the upgrade of each existing family
  (base IDs, family, tier, growth, footprint unchanged), the delivered stats and
  gold prices, the same abilities (only the Pegasus pair flies), portraits
  `neutralupgrade.portrait.<id>`.
- **Rules** (`packages/rules/src/systems/world.ts`): `campSiteForms` decides
  from data what a camp offers — both forms for a weekly-restocking camp of a
  neutral family, else its one listed creature (campaign wolf/centaur/golem
  camps and skirmish camps unchanged). `RecruitFromCamp.creatureId` (optional;
  omitted = the base form, so older commands and the AI are unchanged) is
  validated against it — a foreign or malformed ID is refused; both forms draw
  on the site's one weekly stock, which never doubles. New `TrainAtCamp`
  (`quoteCampTraining`, event `CampTrained`): a visiting hero's base stack of
  the site's family upgraded for the gold difference, no stock used, count
  kept, never merging forms or losing creatures (a partial training needs a
  free slot or an upgraded stack), movement capped as town training does; the
  same presence, guard, pact and pending-decision checks; towns never train
  these neutrals.
- **Screens**: the hiring dialog's base / upgraded selectors (pointer and
  keyboard) with the chosen form's portrait, facts, price and the shared stock,
  Recruit / Recruit all affordable for that form, and a Train strip only when
  the visiting hero has a base stack; the Bestiary and the unit page show both
  forms; habitat and site art resolve by family (`creatureHabitat`,
  `neutralSiteBase`); the editor still lists exactly six neutral hiring sites.
  Army strips, battle panels, tooltips, rewards and results already resolve by
  the actual creature ID (checked).
- **In-game calibration** (metadata only, `CALIBRATION` in the importer, from
  battle captures): Dawncrest flight `sourceScale` 0.65 → 0.78 (its body was
  15–20 % smaller in the air); Dawncrest and Dreamtusk body scale (pixels per
  hex 123.1 → 130 and 116.23 → 128; the Dreamtusk had reached 2.1 hexes on its
  two); two Dawncrest death anchors +3 / +4 px (the body sank); javelin, dart,
  sling and tower-arrow impacts 0.5 → 0.7 hex.

### Checks run (this container)

Commands run on 2026-10-15/16 (cloud container, two cores, SwiftShader):

- `npx tsc -p tsconfig.core.json --noEmit` and `npx tsc -p apps/client/tsconfig.json --noEmit`:
  clean. `npm run lint:boundaries`: passed (the new manifest import added to the
  allow-list).
- `npx vitest run`: **98 files, 855 tests passed** (was 94 / 760). New:
  `presentation/test/projectiles.test.ts` (66: each of the 22 shooters and both
  siege actors resolve to their profile and impact, the catalog's shooters are
  exactly the profiled ones, melee and unknown units, paths, durations, angles,
  sockets, region anchor and scale), `rules/test/neutralUpgrades.test.ts` (16:
  form choice, foreign and malformed IDs refused, one shared stock across forms
  and empires, weekly reset without doubling, full / partial / refused training,
  pact, no town training, the AI's old command), `session/test/neutralUpgradesSave.test.ts`
  (3: upgraded stacks round-trip, a base-only save unchanged),
  `content/test/neutralUpgrades.test.ts` (2), and extended `sprites.test.ts`
  (114 forms; the calibrated scales), `neutralRecruit`, `neutralCodex`,
  `routeKit`, `editorV2Sites`.
- `npm run build`: production client 1.3.0; `battle-fx-neutral-upgrades-v1/`
  in `dist`; no local disk path in `dist`.
- E2E (Playwright, one worker, dev server):
  - `v2fx` 9, `v2upgrades` 10, `v2neutral` 11, `v2battle` 8, `siege` 2 in one
    run after the calibration: **37 passed, 2 failed** — `siege` BAT-14 timed
    out waiting for the first page of a cold dev server (passed alone on a warm
    one, 24 s), and the Dawncrest flight test still expected the delivered 0.65
    flight scale (updated to the calibrated 0.78; passed).
  - `frontend110` title (1.3.0 in the footer), `battles` (6 pantheon rosters),
    `brief15` (siege art), `encounters`, `round10` (fallen stay down, cursors):
    **20 passed, 1 failed** — `encounters` › briefing scroll still expected the
    v1 objective list of a new campaign (outdated since 1.2.0's chapters);
    updated to the v2 introduction and passed.
  - `v2fx` covers all 22 shooters on dark ground, sand and snow (left, right,
    diagonal, near, far, one- and two-hex targets, a kill), a siege (Cyclops and
    Divine Colossus at the walls, the catapult, three turret arrows), a speed
    change, leaving mid-flight, a replay of the same save (same points, path and
    timing), graphics Low, reduced motion, a mirrored board and 1920 × 1080; it
    checks one impact per shot, none at launch, the impact at the contact point
    in the same tick as the hit reaction.
  - `v2upgrades` covers the hiring selectors (pointer and keyboard), shared
    stock, training (partial, full, too little gold, no space), the pact lock,
    160 % interface scale without nested scrolling, the Bestiary and unit pages,
    each base beside its upgrade in battle on both sides (one scale per pose,
    feet on the ground point), and the Dawncrest's takeoff, flight and landing
    at one scale per phase.
- Captures: `/home/claude/capture/v2-fx/` (85 shots mid-flight and at impact,
  contact sheets in `crops/`) and `/home/claude/capture/v2-upgrades/` (each
  hiring and codex state at 1280 × 720, 1366 × 768, 1920 × 1080 and 160 %; the
  battle pairs; calibration sheets); a selection in the session outputs.
- Not run this round: the rest of the e2e suite, `npm run balance`, the
  campaign simulator (the AI and autopilot hire base forms only).

### Remaining / not done

- **Balance (proposed values; rough power per gold, abilities ignored)**: the
  neutral upgrades gain ×1.69–1.85 power for ×1.29–1.32 cost (pantheon tier-3
  upgrades ×1.29–1.66 for ×1.24–1.25). Ridgeback Afanc is the best value
  compared at tier 3 (1.55 power per gold; pantheon tier-3 upgrades 0.95–1.19);
  Crownroot Runner, a tier-2 unit with speed 9, is 0.73 (pantheon tier-2
  upgrades 0.42–0.60). Training has no stock limit (35–75 gold each). Every
  campaign-v2 neutral hiring site now offers the upgrade too, which makes those
  chapters easier; the campaign autopilot and the AI hire base forms only, so a
  simulation would not show it. Playtest before keeping these numbers.
- **Visual**: the small physical impacts are subtle by design even at 0.7 hex;
  the contact point is a body-height heuristic (no visible-bounds data); a
  target's count badge drops before the missile lands (existing behaviour); a
  battle-speed change applies from the next event batch; turrets have no
  per-tower socket; a future melee wall breaker would get the old generic stone.
- **PC**: synced on 2026-10-16 with `tools/sync/apply_bundle.py` (bundle
  `pantheon-realms-1.3.0-sync.tgz` in
  `blannder_models\gui-review-2026-10-10\delivery-1.3.0-battle-fx\` with the
  review screenshots; the 25 PNGs copied from the delivery folder on the PC,
  hash-checked); no PC source file had changed since the 1.2.0 sync (only the
  owner's desktop build output). No installer built this round; nothing
  committed.

## App 1.2.0 — The campaign expansion: 37 chapters as regions, six neutral creatures, battles by hand (2026-10-15)

The CAMPAIGN EXPANSION AND NEUTRAL CREATURES handoff of 2026-10-15, implemented
in the cloud container (the PC was offline for most of it; see "PC" below).
Values are proposed and unplaytested.

### What is in the game

- **Campaign content v2** (`packages/content/src/campaign/v2/`, guide
  `docs/campaign-v2/AUTHORING.md`): all seven campaigns rewritten as **37
  chapters** that carry each of the 45 legacy missions exactly once — The Three
  Beacons 2 (1 → 2), The Silent Oracle 6 (1 → {2, 3} → {4, 5} → 6), The Winter
  Oath 6, The Twelfth Hour 6 (1 → {2, 3} → 4 → 5 → 6), The Lantern Road 6, The
  Silver Branch 6 (1 → 2 → {3, 4} → 5 → 6) and The New Fire 5 (1 → 2 → {3, 4} →
  5). Every chapter is an **authored region map** compiled from its design card
  (`regionMap.ts`: paint ops, roads routed between sites) — no map template and
  no arc corridor — and the tests require: every objective site reachable, two
  independent approaches to the principal objective (max-flow, no single choke
  cell), a shortcut opened through play, reachability with every sluice open
  and closed, patrols with a home site or an announced trigger, deadlines that
  fail optional objectives only, an end through `completesMission`, facts read
  only from chapters that can come earlier, both orders of each parallel pair
  coherent (briefing variants and scenes keyed on `fact:` flags), and
  `briefingArt` per the cards. Existing heroes and cast only.
- **Rules vocabulary** (shared data, usable by any mission): sluices
  (`OperateSluice` switches a channel's terrain; refused while guarded or with
  a hero in the channel), ferry portals with a liberation flag, supply depots,
  patrols with `homeSiteId` (they withdraw when it falls) and
  `dormantUntilFlag`, announced timers (`evaluateTimers`; optional objectives
  only), map-event options with `requiresFlags` and `clearsSiteIds` (guards
  stand down with no battle) and the option chosen recorded on the site
  (`chosenOption`), `required` guards, camps with weekly or no restock and pact
  locks. A gate whose flag an objective reward or a deadline sets opens in the
  same command (the processor runs `updateGates` again after the objectives and
  timers).
- **Manual battles in campaigns** (`systems/battle/policy.ts`): the processor
  refuses an `automated` battle command in a campaign mission
  (`manual_battle_required`) before any state or dice change; the session and
  the UI offer no Auto, quick battle or casualty preview there; the pre-battle
  dialog has a single Fight. The computer's own battles and skirmishes are
  unchanged.
- **Runs and saves**: `CampaignState.contentVersion` (absent = 1). New runs play
  v2; a run saved before keeps its v1 missions to the end (v1 definitions stay
  in the catalog unchanged; nothing is reinterpreted, merged, migrated or
  deleted). `facts` (carried flags → `fact:<flag>` in later chapters) are kept
  apart from `completions`; `availableChapters` / `startNextMission(…, id)`
  validate the graph; practice replay is its own branch and never advances the
  run; restart rebuilds the entry hash with its facts. The save format, schema
  and `content-0.8.0` stamp are unchanged (the old siege saves of 2026-10-11 in
  this container still load); metadata gains the optional
  `campaignContentVersion` and `chapterNumber`.
- **Six single-form neutral creatures** (`common/neutralsV2.ts`): Pegasus,
  Root-Runner, Serpopard, Baku, Afanc, Ahuitzotl, with the kit's stats, habitats
  and one ability each (Sheltering Wings, Distract, Long Reach — passive —,
  Devour Dread, Reed Guard, Tail Snare; `neutralAbilities.ts`; statuses end at
  the user's next activation; once per battle per stack). Hiring sites with a
  finite weekly stock shared by everyone and never accumulating, some behind a
  pact. `isSingleForm`/`familyForms`: no fabricated upgrades. The battle AI uses
  the abilities when its scoring finds them useful (`ai/src/neutralTactics.ts`);
  two AI-vs-AI battles without neutrals end in identical states before and
  after.
- **Sprites**: the frame-region atlas adapter (`SpriteStrip.regions`: source
  rectangle, pixel anchor, constant `sourceScale`, mirrored for the defender;
  victory and ability aliases; Pegasus takeoff 3 + fly 4 + landing 4 poses
  without the clipped [0,2] pose, flight scale 0.62 checked against the core
  frames). Kit imported by `npm run campaignv2:import` (ASSET_PIPELINE.md §20).
- **Screens** (each with keyboard access and checked at 1280 × 720, 1366 × 768,
  1920 × 1080 and a 160 % interface scale):
  - Campaign Chronicles: the chapter graph (complete / current / available /
    locked with its reason / practice), the chapter's painting, first line and
    the legacy missions it carries, the manual-battle line; the v2 summary of
    each campaign.
  - Result: Continue to the one chapter, or the choice of two; what the chapter
    leaves behind and what is carried; practice replay of a finished chapter
    (the run is kept and restored byte for byte); the v2 epilogue and its
    variant over the campaign painting.
  - Continue / Load: Chronicle (v2) or Legacy campaign (v1), the chapter or
    mission, practice replays apart; Continue prefers the primary run.
  - Introduction: tasks, deadlines, carried bonuses, loss conditions, manual
    battles; "Chapter N" kicker.
  - Journal: Required tasks / Optional opportunities, "Missed" for a failed
    optional task, the Ledger (deadlines, known threats with Show on map,
    evidence and decisions, carried facts), the chronicle on the Campaign tab;
    HUD deadline line.
  - Map: kit pictures for hiring sites, sluices (dialog with the exact change,
    refused with its reason), ferries (locked notice), depots; objective markers
    with the campaign icons; terrain redrawn when a sluice changes it, camera kept.
  - Story choices: exact cost, gain, guards that stand down, what is recorded,
    needs (evidence/pact icons); affordable, unaffordable, needs, decided,
    repeat visit.
  - Neutral recruitment: portrait over its background, single form, stats,
    ability rule, habitat, stock and price, the seven slots, Recruit and Recruit
    all affordable, locked / empty / full / unaffordable states.
  - Bestiary: the six under Neutral with habitat and hiring source; unit page
    "Single form" and the atlas animations (preview dispatches nothing).
  - Battle: ability buttons with the exact rule, uses left, legal targets, the
    pull slide, status marks, log lines.
  - Map editor and random maps: the six hiring sites with a habitat check,
    sluices with channels and an open/closed connectivity check, ferry pairs,
    depots; an optional "New neutral creatures" random pool, off by default
    (default output byte-identical: 84 random maps and the six shipped maps
    hashed before and after).

### Checks run (this container)

Commands run on 2026-10-15 (cloud container, two cores, Chromium with
SwiftShader; the software renderer drew the map at about 1 frame per second
during the final runs):

- `npx tsc -p tsconfig.core.json --noEmit` and
  `npx tsc -p apps/client/tsconfig.json --noEmit`: clean.
  `npm run lint:boundaries`: passed (the `assets-runtime/campaign-v2/manifest.json`
  import added to its allow-list).
- `npx vitest run`: **94 files, 760 tests passed** (was 81 / 676 when the seven
  content agents finished; the legacy journeys `arcCampaigns`, `threeBeacons`,
  `winterOath`, `campaignDifficulty` and the save checkpoint test now pin
  `contentVersion: 1`, as an older run is). New or extended: the seven
  campaigns' own tests (`packages/content/test/v2/*.test.ts`, 10–13 each) and
  `campaignV2.test.ts`; `campaignV2Run.test.ts` (graph in both orders, a fork
  asks for a choice, a locked chapter refused, facts apart from completion,
  restart, practice never advancing, v1 runs staying v1, v2 summaries);
  `save.test.ts` (a v2 run round-trips; a v1 save without `contentVersion`
  loads as v1); `manualBattle.test.ts`; `neutralAbilities.test.ts` (rules and
  AI); `sprites.test.ts` (108 forms; region atlases inside their PNGs, one scale
  per animation, the aliases, Pegasus without the [0,2] pose); `v2Sites`,
  `siteInfo`, `missionLedger`, `chronicle`, `chroniclePractice` (incl. the
  Bestiary over a dialog), `choiceView` (the recorded choice), `neutralRecruit`,
  `neutralCodex`, `battleAbilities`, `battlePlayback`, `continueTarget`,
  `editorV2Sites`, `customMapV2`, `neutralPool`, `routeKit`.
- `npm run build`: production client 1.2.0, 19.5 s; `campaign-v2/` (31 PNGs,
  16 display WebPs, manifest) in `dist`; no `C:\Users`, `lazeb` or
  `/home/claude` string in `dist`.
- Each campaign's autopilot run in both chapter orders
  (`tools/campaign-v2/sim.measure.ts`, `RUNS=2`, by the content agents): every
  chapter of all seven campaigns won in both orders, no validation issue.
- `npm run campaign-sim -- --content 2 --runs 4 --jobs 1` (444 chapter runs,
  9.9 min; computer-played, not playtests):

  | Level | Target | Chapters won | Costliest battle (median) | Check |
  |---|---|---|---|---|
  | Story | 95–100 %, 0–15 % | 148/148 | 8 % | pass (22 chapters "too easy") |
  | Normal | 85–100 %, 10–30 % | 147/148 | 39 % | outside the band (fights costlier than the band) |
  | Hard | 60–95 %, 20–45 % | 136/148 (92 %) | 41 % | outside the band: New Fire ch. 2 0/4 (Itzel caught by Acatl on day 4), Silver Branch ch. 2 0/4 (the boar never found) |

  The single Normal loss: The Silent Oracle ch. 2 (the Bronze Bull, run 0).
  Hard also lost Twelfth Hour ch. 3 twice and Silent Oracle ch. 2 once.
- E2E (Playwright, one worker, dev server):
  - The six new specs plus the two they touch, in one run: `v2battle` 8,
    `v2chronicle` 7, `v2editor` 3, `v2journal` 8, `v2neutral` 11, `v2sites` 7,
    `storyArt` 3, `mapEditor` 2 — **49 passed, 0 failed** (55 min).
  - `campaign.spec` (the legacy Mission 1 → 2 journey, now started from a v1
    save fixture, and a new v2 run with the Journal chronicle): **2 passed**.
    Its first two runs failed on the 15 s wait for the hero's walk (about 2 s
    per hex at this frame rate); the waits are now 60 s.
  - `journey.spec` (v1 save → build → recruit → battle by hand → save → load →
    Continue): **passed** after saving into slot 2 (slot 1 holds the imported
    legacy run).
  - `frontend110` (16 tests; the chronicle replaces the read-only outline),
    `brief18` (4; the Silent Oracle's v1 story art still checked from a v1
    run), `audio` (4): passed — `frontend110`'s title test after the dev server
    was restarted at 1.2.0, and `brief18`'s second ending test after it waits
    for a scene that opens late.
  - Not run this round: the rest of the suite (siege, perf, round*, brief12–17
    and older specs).
- Old saves: the twelve siege saves of 2026-10-11 in this container (content
  `content-0.8.0`) parse as compatible and load.
- Captures: `/home/claude/capture/v2-{chronicle,journal,sites,neutral,battle,editor,maps}/`
  (each screen at 1280 × 720, 1366 × 768, 1920 × 1080 and 160 % interface
  scale); a selection in the session outputs `campaign-v2-screens/`.
- `node tools/perf/load-time.mjs`: not completed (stopped after 10 minutes at
  this frame rate); start-up adds the campaign-v2 manifest (31 entries) and the
  neutral content — unmeasured.

### Remaining / not done

- **PC (done, for the record)**: synced on 2026-10-15 with `tools/sync/apply_bundle.py` from the
  bundle `pantheon-realms-1.2.0-sync.tgz` (kept in
  `blannder_models\gui-review-2026-10-10\delivery-1.2.0-campaign-v2\` with the
  review screenshots): 251 files from the session (code, tests, docs, display
  art, manifest) and the kit's 31 PNGs copied from the kit folder on the PC into
  `assets-source/campaign-v2` and `assets-runtime/campaign-v2`, every file
  checked against its hash; no file there had changed since the 1.1.6 sync
  (no conflicts), nothing deleted. Afterwards the PC tree and this container's
  matched in every source, test, tool, doc and kit folder compared (line
  endings ignored). The script left `sync-report-1.2.0.json` at the checkout
  root. About 2 GB was free on C: afterwards. Nothing committed; no installer
  built (`installer\build-installer.cmd` builds one from this checkout).
- **Balance (computer measurements, not playtests)**: Normal's costliest battle
  (median 39 %) is above its 10–30 % band; on Hard the autopilot lost Itzel on
  day 4 of New Fire chapter 2 in 4 of 4 runs (Acatl's patrol, 170 % on Hard,
  catches her after the jailers) and never found The Silver Branch chapter 2's
  boar (it charges only a war-band it is sure to beat; the autopilot does not
  explore toward an unseen target). Many chapters read "too easy" on Story.
  Values are proposed; tune after playtests.
- **Approximations of the cards** (kit limits): patrols follow fixed waypoints
  (no retargeting to the richest bank or the latest district); mixed refuges
  are one-time events; a few allied towns (Pyrgos, Hvitstrand, Per-Wadjet, the
  Akashi camps) are unowned towns; the autopilot finishes faster and with fewer
  battles than the cards' estimates; a Baku grove stands on a coast map.
- **Not built**: the editor's Generate dialog does not offer the neutral pool;
  custom maps have no pact locks (no mission flags); Serpopard and Ahuitzotl
  never appear on random maps (no desert or jungle map type); a decided story
  choice cannot be reopened on the map; a scene replayed from the Journal shows
  no backdrop; leaving to the main menu during a practice replay drops the kept
  run (an autosave "before practice replay" is written).
- **Size**: `assets-runtime/campaign-v2/` adds 66 MB of native PNGs to the build.
- Frame rate: this container's software renderer ran at about 1 frame per
  second on the map during the final runs (main-thread work under 1 ms per
  frame); movement playback in the UI tests takes about 2 s per hex here.

## App 1.1.6 — Recruitment redesign, painted routes, journeys kept between days (2026-10-14)

Handoff "PANTHEON REALMS — RECRUITMENT & PERSISTENT JOURNEY HANDOFF" (14 October
2026; approved concepts `recruitment-upgrade-unlocked.png`,
`recruitment-upgrade-locked.png`, `adventure-route-concept.png`, copied with the
handoff to `docs/recruitment-route-v1/`). Version 1.1.6; no installer built
(`installer\build-installer.cmd` builds one on the PC). Rules values and content
are unchanged; saves gain one optional field.

1. **Kit import** (`npm run recruitroute:import`, new focused step
   `tools/assets/import_recruitment_route.py`, run in the owner's checkout with
   `--kit`; see `ASSET_PIPELINE.md` §19): the nine 1254 × 1254 RGBA PNGs to
   `assets-source/ui/recruitment-route-v1/` (SHA-256 checked against the kit),
   runtime copies (256/512 px, premultiplied reduction, visible bounds) and
   102 recruitment-only native idle strips (byte copies, frame grid, timing,
   anchor, visible union; the 84 pantheon unions equal the kit's
   `creature-map.json`) in `assets-runtime/recruitment-route-v1/` with its
   `manifest.json`. Registered through `assets/manifest.ts` (`recruitroute.*`,
   `creatureStageStrip`, `registerRouteArt`); the boundary check allows the new
   manifest. No wholesale sprite recut; map and battle sprites unchanged.
2. **Recruit all** (rules): `RecruitBatch` command, `recruitAllItems`,
   `quoteRecruitBatch` (simulated army and wallet, cumulative merges, new
   slots and cost; whole-batch refusal with "Needs N more army slot(s)" /
   "Short …" / stale pool), commit re-quotes then applies inside one
   transaction. `packages/rules/test/recruitBatch.test.ts` (10).
3. **Planned journeys** (session): `packages/session/src/journeys.ts`, the
   session's `journey` / `planJourney` / `cancelJourney`, reconciliation after
   every command (arrival, loss, capture, other match → dropped; unreachable →
   blocked and kept; battle or teleport → paused; a journey to a portal ends
   through it), `SaveSnapshot.presentation` (version 1, written only when a
   journey exists; old saves load with none; sanitised on load); new mission,
   restart and practice clear them. `packages/session/test/journeys.test.ts`
   (7: three-day journey cleared only on arrival, two heroes and Cancel, save
   round trip and an old save, sanitising, blocked/paused/lost, a new mission,
   the portal).
4. **Map screen**: the selected hero's journey from the session (no component
   state); End Day, selecting another hero and right-click keep it; a second
   click on the destination, the journey bar's **Continue journey** (kit icon,
   tooltip with the current key) or the continue-move key (held key: one move;
   not while a walk plays; overlays and text fields keep their keys) follow
   it; **Cancel journey** clears it. The bar says Arrives today / tomorrow /
   in N turns, steps today, no movement left ("Continue next day"), paused,
   "Route unavailable — …", or "Route changed" with **Accept new route**
   (`app/journeyRoute.ts`: same way, the rest of it after walking, or an
   equally long way → unchanged; another length, a new battle, the hero off the
   route → changed; `packages/ui/test/journeyRoute.test.ts`, 6). The planning
   tip moved above the bar and its text describes the new markers.
5. **Painted route** (`presentation/src/adventure.ts`, `routeArt.ts`): the
   pathfinder's steps with `routeStepDays`; an arrowhead per step but the last
   (0.30 tile width today, 0.27 later, measured by the painted part, a soft
   tinted copy beneath), turned in the ground plane then squashed once; an
   upright hourglass at each new day's first step; the compass seal (0.54 tile)
   on the ground with a gentle pulse (still under reduced motion or Low), the
   blank parchment with the live arrival day; crossed swords instead of the
   seal before a battle; seal and lock when blocked. The walking trail uses the
   same arrowheads. The selection ring is the painted ring (its breath also
   stills under reduced motion). Below zoom 0.72 every other arrowhead and the
   later hourglasses are left out; below 0.9 the markers keep their screen
   size. Under the fog and the figures, `eventMode: 'none'`; pictures loaded
   once through `textures.ts` (mipmapped); the drawn shapes remain the
   fallback. `routeDebug()` / `__prRoute` (read-only, `?e2e`).
6. **Recruitment** (`screens/Recruitment.tsx`, `styles/adventure.css` `.rr-*`,
   `AdventureStage` `compact` and `aside`): compact title strip with the
   treasury; seven dwelling cards in one row; stage ≈ 56 % / details ≈ 44 %;
   the creature's native idle strip scaled once for the whole clip so its
   visible union fills 82 % of the stage height or 90 % of the width beside the
   medallions, feet on a shared ground line with a soft shadow, first frame held
   under reduced motion; base/upgraded medallions over the stage's left edge
   (locked form: lock, requirement on hover/focus, never selectable); upgraded
   chosen first where recruitable, an explicit base choice kept (screen
   params); six stats with icons, ranged badges, ability chips (exact rule on
   hover/focus), pool and growth (one pool for both forms), unit cost,
   destination as portraits (radio group, arrow keys, check mark, name shown
   once), quantity (0 and a reason at zero), **Recruit N** with its total; dock:
   the destination's seven slots (placement highlighted), training for the
   selected family (its stacks in the destination first, a selector when
   several, −/+/Max, "Training locked · Requires …"), **Recruit all** (troops and
   every resource inline, breakdown on hover/focus, reason when off).
   Container query below 1100 px, 80 rem or 40 rem high (large interface
   scales too): Creature / Recruit / Train views, 4 + 3 dwellings, a dock with
   Back, Recruit all and Recruit N always in view.
7. **Tests updated**: `campaign.spec.ts` trains through `train-max` and
   `train-hoplite`; `owner115.spec.ts` selects the Griffins' card first.

### Checks run (this container)

- `npm run check`: boundary check passed; typecheck (core, client, desktop)
  clean; vitest **68 files, 552 tests passed**.
- New unit tests: `recruitBatch.test.ts` 10, `journeys.test.ts` 7,
  `journeyRoute.test.ts` 6, `routeKit.test.ts` 3 (the nine pictures, the six
  markers and three icons, all 102 recruitment strips), `routeDays.test.ts`
  +1 (`routeStepDays`).
- E2E (Playwright, Chromium with SwiftShader, dev server):
- `tests/e2e/plannedJourneys.spec.ts` (new) **5 passed**: the three-day
    journey (one click, Continue on day 1, End Day keeps it and moves nobody,
    Space on day 2, arrival on day 3 clears it; painted route with day 3 → 2 →
    1 on the parchment); two heroes through a town, Settings, right-click and
    a manual save, End Day and load, Cancel clearing one; a blocked
    destination kept and shown locked, a held Space moving once; the route on
    The Winter Oath (snow), The Twelfth Hour (desert), The Silver Branch and
    The New Fire maps near and far with a fog edge; remapping the key to G
    (Space no longer walks, G does, the tooltip says G).
  - `tests/e2e/recruitment.spec.ts` (new, fixtures `recruitFixtures.ts`): six
    pantheons (seven cards, upgraded first, explicit base kept across quantity
    and destination, base-only and no-dwelling cases, every tier's own strip);
    the four desktop sizes with no scrolling panel, every control inside the
    window and text ≥ 14 px; seven Greek forms whole on the stage; the narrow
    views and interface scale 145 %; Recruit all (32 troops in one command, one
    revision, exact spend, no confirmation; short of gold and a full army
    refused with their reasons); no visiting hero, zero stock, the shared pool,
    a crystal price. Last full run **5 passed, 1 failed** — the Recruit all test
    timed out (20 s) clicking the town tab of its third fixture; run again on
    its own it **passed**.
  - Existing specs touched by the change: `features`, `gui110`, `journey`,
    `pantheons`, `round11`, `owner115` — **32 passed, 1 skipped (the old-save
    check without `PR_OLD_SAVE`), 1 failed**: `owner115`'s days-to-arrive test
    still expected "N days" in the old route line; it now reads the journey
    bar ("Arrives tomorrow" / "Arrives in N turns") and **passed**.
    `campaign.spec.ts` (trains through the new dock) **1 passed**.
  - Not run this round: the rest of the e2e suite.
- Screenshots: `blannder_models\gui-review-2026-10-10\delivery-1.1.6-recruit-route\`.

### Remaining / not done

- **Creature sharpness**: the recruitment figures are the delivered native idle
  strips (207–348 px frames) enlarged about 1.8× (1280 × 720) to 2.9×
  (1920 × 1080); they are softer than the concept paintings. New larger idle
  strips would be needed for concept-sharp figures.
- Not tested in a real multiplayer session (there is none: hot-seat only);
  journeys are per player and private by construction (unit-tested), and
  hot-seat hand-overs show only the active player's.
- A movement bonus that changes a route's length after it was planned is
  covered by the reroute rule and its unit tests, not by an e2e run.
- The route's look was checked on snow, desert, temperate and jungle maps and
  at near/far zoom in the cloud renderer (SwiftShader); the owner's GPU and the
  frame rate with long routes are unmeasured.

## App 1.1.5 — GPT-6 Brief 18 imported: The Silent Oracle's story art (2026-10-14)

Handoff "PANTHEON REALMS — BRIEF 18: THE SILENT ORACLE, CLAUDE CODE HANDOFF"
(14 October 2026): integrate the 18 delivered masters through the existing
pipeline, then empty the test allowlist. The version stays 1.1.5 (no
installer had been built for it). Saves, preferences, rules and content are
unchanged.

1. **Sources** (owner's checkout): `assets-source/art/final/` — four busts,
   the cover, seven mission pictures, two endings; `assets-source/icons/final/`
   — four square portraits. Measured as the handoff lists them: busts
   1024 × 1536 RGBA (alpha 0–254), portraits 1254 × 1254 RGB, cover
   1672 × 940, mission pictures and endings 1672 × 941 (m03 1671 × 941), no
   ICC profile (sRGB).
2. **Import**, unchanged scripts, no `--prune`, in the owner's checkout through
   the PC shell (Python 3, Pillow 12.3.0, libwebp 1.6.0; scipy installed there
   for the banners' plaque measure):
   - `tools/assets/import_story_art.py`: the shell ends a command after three
     minutes and a full run needs about four, so the script ran three times,
     each over every third of the 512 masters, in its own temporary root (a
     byte-identical copy of the script, links to the masters,
     `seamless-verified.txt`) — 72 s, 63 s and 67 s. Joined, the three runs
     give 572 entries and no warnings (40 busts, 7 covers, 13 endings, 53
     mission pictures, 60 terrains, 66 battlefields, 10 skies, 14 miracle
     cards, 12 splashes, 15 banners, 198 town buildings, 24 town
     backgrounds). All 550 runtime files already in the checkout came out
     byte for byte the same and their manifest entries unchanged; the 22 new
     files were copied in, and `assets-runtime/art/manifest.json` and
     `assets-source/art/IMPORT_REPORT.json` were written as a single run
     writes them (the report now has a source for every entry, including the
     180 it listed without one since 2026-10-06).
   - `tools/assets/icon-catalog/import_icons.py --new`: 4 imported with the
     expected four "not in the icon catalog" warnings; 608 registered; the 604
     earlier entries unchanged.
   - The icon inventory step of `npm run icons:catalog` (`npx vitest run
     --config tools/assets/icon-catalog/vitest.config.ts`) added the four
     portraits and the eight new cards to
     `assets-source/icons/icon-inventory.json` (and refreshed 24 "where
     shown" texts from the current code); `uiArt.test.ts` checks every
     registered icon against it. The glyph SVGs it writes equal the PC's
     `assets-source/icons/current/`.
3. **Runtime files (26)**: `art/busts/hero.greek.{theron,myrrine,doros,phaidon}.bust.webp`
   768 × 1152 with alpha (transparent padding kept, `alphaBox` recorded);
   `ui/icons/final/hero.greek.*.portrait.webp` 256 × 256;
   `art/covers/campaign.silent_oracle.cover.webp` 1672 × 940 and its card
   `art/cards/campaign.silent_oracle.thumbnail.webp` 640 × 360;
   `art/missions/mission.silent_oracle.m0N.briefing.webp` at native size and
   `art/cards/mission.silent_oracle.m0N.thumbnail.webp` 640 × 360;
   `art/endings/ending.silent_oracle.{oracle_speaks,cities_decide}.webp`
   1672 × 941. Nothing enlarged. Registered in `art/manifest.json` (22) and
   `ui/final-manifest.json` (4).
4. **Tests**: `packages/ui/test/awaitingArt.ts` keeps the object and helpers
   with both lists empty. `storyArt.test.ts`: 40 busts; story entries
   40 + 7 + 7 + 13 + 53 + 53; thirteen ending routes; 45 campaign mission
   pictures; a bust must belong to a story speaker **or a catalog hero**
   (Phaidon never speaks — his bust stands in his encounter scene).
   `heroPortraits.test.ts`: comment only. New `tests/e2e/brief18.spec.ts` (4):
   the cover, the campaign card and the seven mission cards in order; Doros's
   bust (right, mirrored) and square portrait in his scene and his portrait
   in the battle header; each ending's own picture.
5. **Named guard commanders in the battle header**
   (`packages/ui/src/screens/Battle.tsx`, `commanderPortrait`): the brief
   promised Doros's and Theron's square portraits in the battle header, but
   the header showed a portrait only for a hero on the map. A guard's named
   commander (battle snapshot with `heroId: null` and its own portrait ID)
   now shows that portrait too — Doros at the labyrinth gate, Theron in the
   inner hall, and every other guard with a named commander (for example
   Melas and the storm guard at the end of The Three Beacons). Guards without
   a commander still show none;
   wandering monsters still fight without a commander. Presentation only.

### Windows installer 1.1.5 and the PC build script (2026-10-14)

Owner request: "give me an updated installer and also give me in the same
folder a file that by running it, it will generate up-to-date installer".

- **Source checked first.** The files the installer is built from —
  `package.json`, `package-lock.json`, the two root tsconfigs, `apps/client`,
  `apps/desktop`, `packages/` and all of `assets-runtime/` (270 folders) —
  were hashed in the cloud container and on the PC: identical, except 15
  files under `packages/presentation` and `packages/ui` that differed only in
  line endings (CRLF on the PC); the PC's copies were taken.
- **Build** (cloud container): `npm run build`, `npm run desktop:build`,
  `npx electron-builder --config electron-builder.json --win nsis` (under
  Wine, unsigned) → `Pantheon-Realms-Setup-1.1.5-x64.exe`, 1,035,855,202
  bytes, SHA-256
  `c25d5cdc5e9a3a72cfb4a916f6e7c9b1b52ea632c36103050a676600b90c3576`. Its
  `app.asar` (945,732,429 bytes, 3,694 entries) holds the 26 Brief 18 files,
  package `pantheon-realms` 1.1.5, no `.claude`, MCP, `tools/`,
  `assets-source/` or `zz-` file, and no `lazeb` / `C:\Users` string.
- **Smoke test**: `electron-builder --linux dir` of the same app, then
  `PR_SMOKE_EXE=…/linux-unpacked/pantheon-realms xvfb-run -a node
  tools/desktop-smoke.mjs` inside `unshare -rn` (no network): **DESKTOP SMOKE
  OK** — `prgame://app/index.html`, a manual save written and read back, 572
  painted-art entries, 1,629 sprites, the map drawn with WebGL, sounds
  decoded, `isPackaged` true, no DevTools. The Windows installer itself was
  not run on Windows here.
- **Delivery**: copied to the PC in 44 parts of 24 MB (30 MB parts were
  refused by the transfer), joined in `installer\`; each 24 MB range and the
  whole file's SHA-256 checked on the PC (identical). The emptied parts are in
  `installer\_to_delete-empty-parts-1.1.5\` (0 bytes; the shell here cannot
  delete). About 3.5 GB stayed free on C:.
- **`installer\build-installer.cmd`** (new; `installer/` is not in git, so
  the script lives only there): double-click to build an up-to-date installer
  on the PC from its own checkout. It checks Node.js (20 or newer) and npm;
  asks for about 4 GB free and, when there is less, offers to delete the
  installers already in the folder (answer `y`); runs `npm ci` only when the
  installed packages differ from `package-lock.json` (the PC's `node_modules`
  of 2026-10-05 differs in five packages, so its first run reinstalls them);
  with `--check` runs `npm run check` first; then `npm run desktop:dist`,
  moves `Pantheon-Realms-Setup-<version>-x64.exe` into `installer\`, prints
  its size and SHA-256 and removes `apps\desktop\release`. It prints what to
  do when Node is missing, the space is short, `npm ci` fails or
  electron-builder cannot create symbolic links (Windows Developer Mode or
  run as administrator). Measured only as far as possible here: its control
  flow ran under Wine's `cmd` with stand-in `node`, `npm` and `powershell`
  (no dependencies, dependencies present, `--check`, a failed build, space
  short with the answer no); the version and dependency one-liners ran under
  Node 22. It has not been run on Windows.

### Checks run (this container and the owner's PC)

- Before the lists were emptied, the guard tests failed as designed (six
  failures: "delivered — empty AWAITING_BRIEF_18", 173 story entries instead
  of 151, 40 busts instead of 36): the game's asset resolution sees the files.
- `npm run check` after the change: boundary check passed, type-check clean,
  **64 files / 525 unit tests passed**.
- Playwright against the dev server (one worker): `brief18` 4/4, then 8/8 with
  `--repeat-each 2` (the first full run failed its two ending tests at the
  default 1600 × 900 window — the offering's hex at the map's east edge sat
  under the side panel and the click helper refused it; those tests now use
  1920 × 1080); `storyArt`, `owner115`, `campaign`, `siege`, `menu`,
  `frontend110`, `round3`: **37 passed**. The full suite was not run.
- In the running game (1920 × 1080 unless noted; captures in the review set
  `blannder_models\gui-review-2026-10-10\delivery-1.1.5-brief18\`): the
  campaign screen with the cover and the campaign card in the list, at
  1920 × 1080 and 1024 × 640; the seven mission cards m01–m07 in order; all
  seven briefings (each `scene-art` is its own `mission.silent_oracle.m0N.briefing.webp`,
  the dialogue box below the picture); Theron's square portrait on the
  mission-7 scroll; Theron's bust on the left (mission 4, alone) and on the
  right, mirrored (mission 7, with Alexios); Doros on the right, mirrored;
  Myrrine on the right (Unseal the spring) and on the left (Leave the spring
  sealed); each line's square portrait in the dialogue box; Doros's,
  Theron's and Phaidon's portraits in the battle header; Phaidon's bust in
  his encounter, facing Alexios; Theron and Myrrine in the Journal; the two
  endings — the flowing spring with Myrrine, and the assembly with the sealed
  spring on the mountain — not swapped. The busts composited on dark and
  light backgrounds (Myrrine's veil has 4.6 % partly transparent pixels, no
  fringe or rectangle); the eight cards at 640 × 360. Every image loaded.
- Not done: no installer, no full Playwright suite, nothing committed.

## App 1.1.5 — The Silent Oracle, Wings over the Pass in town, the player on the left (2026-10-14)

Owner request (2026-10-14, with two screenshots of the map's left column):
"generate a new campaign for the greeks to be second, as the first is just to
teach the player how to play the game — it should be also 7 levels but it can
use the same heros. Make sure to prepare a document I can give GPT 6 to
generate any new visuals we need for this campign. For the first campign, the
second level, remove the "wings for the road" task — just ask the player to
train 2 griffins and that it, no need for out-the-town stuff at all. Remove
the line showed inside the red box in the attached image. When the player is
getting attacked by another hero, still make it blue and from the left side of
the battle and not the other way. In the map, when asking the hero to go
beyond its range, show a small number next to the icon of how many days needed
to get to this location." Shipped as **1.1.5** (`package.json`,
`apps/desktop/package.json`, the lockfile; release notes in `CHANGELOG.md`).
Saves (format and schema) and preferences are unchanged; `contentVersion` is
unchanged, so every save still loads.

1. **The Silent Oracle** (`packages/content/src/campaign/silentOracle.ts`): the
   second Greek campaign, seven missions on the campaign arc (`arc.ts`) —
   Restore, Hunt, Covenant, Seek, Rival, Refuge, Finale — listed right after
   The Three Beacons (`catalog.ts` builds it first among the arc campaigns
   and indexes it second). Original fiction: the Oracle of Kalliste has fallen
   silent; Theron the Hierophant sealed her spring and speaks in her name.
   Reused characters: Alexios (hero), Thaleia, Ione, Melas (the mission-5
   rival empire, `heroId: 'melas'`) and the Scout Captain (mission-4 patrol).
   New: Theron (final, `greek_theron`), Doros (gate, `greek_doros`), Phaidon
   (patrol, `greek_phaidon`) — catalog heroes with specialties — and the
   speaker Myrrine. Two arc options were added for it, both data:
   `buildingOf` (a town with its own building names: the Greek polis' slot
   chains) and `heroDefaults` (a might hero's starting profile per mission,
   same points and skill ranks as the arc's). Gods: Zeus fixed; Athena, Ares,
   Apollo or Artemis in M3; Hermes, Demeter, Hades, Poseidon or Hera in M5.
   Covenants `covenant.griffin.silent_oracle3`, `covenant.minotaur.silent_oracle6`.
   Rewards are Greek artifacts. Expanded content and specialties on. Values
   proposed and unplaytested. The mode card now says "7 story campaigns across
   6 pantheons" (`Setup.tsx`; "one for each" only while each pantheon has one).
   Outline: project doc `claude/campaign-7-silent-oracle-outline.md`.
2. **GPT-6 Brief 18** (`assets-source/art/briefs/GPT6_BRIEF_18_SILENT_ORACLE.md`,
   ASSET_PIPELINE.md §18): four busts and square portraits (Theron, Myrrine,
   Doros, Phaidon), the cover, seven mission pictures, two endings — 18 files
   under the names the game reads. Not delivered: the game shows its stand-ins.
   `packages/ui/test/awaitingArt.ts` lists the awaited art; the story-art and
   portrait tests require everything else and assert the awaited files are
   still absent (empty the list after the import). *Delivered and imported
   later the same day — see the section above.*
3. **The Three Beacons, mission 2** (owner change; recorded in
   `docs/pantheon-v0.3/campaign/01_the_three_beacons.md` §6): one primary
   objective, `m02_train_griffins` — "Train 2 Griffins" (counter
   `trained:griffin` ≥ 2), reward 2,000 quest XP, `completesMission`.
   Passhaven starts with the Griffin covenant; the beacon activation and the
   other objectives are gone; the ridge, guards, nest, watchtower, sentinel
   grove and mines stay as optional ground (template and golden map
   unchanged). New shared data: `ObjectiveDefinition.completesMission` (an
   objective can win the mission, as an activation site can). Saves made
   during the old mission 2: `evaluateObjectives` gives a mission objective
   that a save does not hold its initial state on the next command, so such a
   save carries on under the new objective (tested).
4. **Left column over the map** (`styles/gui.css`): `.adv-left.adv-info` keeps
   `overflow-y: auto` with `scrollbar-width: none` (and no WebKit bar). The
   line in the screenshot was a classic (Windows) scroll bar: the panels'
   corner ornaments overflow the column by about 2 px, enough to show a
   scroll bar whose gold thumb ran down the column's right edge.
5. **Player on the left, in blue** (`ui/src/app/battleOrientation.ts`): when
   the defender is human and the attacker is not, `BattleView.mirrored` and
   `blueSide: 'defender'`. `BattleSceneController` gives the board container a
   negative x scale about the frame's centre; count badges, structure labels
   and floating words are turned upright; whole-field effects take the
   screen direction; `local()` (pointer → board) and `projectCell` /
   `siegeDebug` / `stackDebug` (board → page) use the same transform, so
   cells, hover offsets, the melee side under the pointer and the rules'
   facings are unchanged. Markers, badges and turn-order marks are blue for
   `blueSide` (`tone-blue` / `tone-red`), the label colours follow, the
   header shows the player's side first (left styling), the melee cursor's
   angle turns with the board, and the battle result lists the player's side
   first. Sieges of the player's towns are mirrored too (walls on the left).
   Hot seat (two humans) and AI-only battles keep the attacker on the left.
6. **Days to arrive** (`rules/systems/adventure.ts` `routeDays`: today =
   day 1 with the remaining points, each later day a full `movementBudget`):
   `adventureCursor` returns `days` for a destination not reached today, and
   the map shows it as a small gold badge just right of the cursor
   (`route-days`, following the pointer through a ref); the route line under
   the map adds "· N days".

Read-only test hooks: `__prSiege().mirrored`; `__prBattle()` positions and
`mirrored` are as seen on screen.

Tests added or changed: `packages/rules/test/routeDays.test.ts` (new, 2);
`packages/ui/test/battleOrientation.test.ts` (new, 3); `cursors.test.ts`
(mirrored sword, the day count for every far tile);
`packages/campaign/test/threeBeacons.test.ts` (M02 won in town, ridge still
gates the far side, an older save gains the new objective);
`arcCampaigns.test.ts` (The Silent Oracle: data, maps, endings, the seven-
mission journey; buildings read from the archetype's chains);
`mapSites.test.ts` (77 heroes); `storyArt.test.ts` / `heroPortraits.test.ts`
(the awaited Brief 18 art); `tests/e2e/owner115.spec.ts` (new, 4: M02 through
the recruitment screen, no scroll rail with real scroll bars, a rival attacks
— mirrored, blue, a click moves the stack to that cell —, the days badge);
`round11.spec.ts` (the journal's "done early" step now from The Winter Oath);
`round3.spec.ts` (The Silent Oracle from New Game); `frontend110.spec.ts`
(seven campaigns, The Silent Oracle second).

### Checks run (this container)

Commands run on 2026-10-14 (cloud container, SwiftShader, two cores):

- `npm run check`: boundary check passed, type-check clean, **64 files / 525
  unit tests passed** (was 62 / 515).
- `npm run build`: production client 1.1.5; no `C:\Users`, `C:/Users` or
  `lazeb` string in `apps/client/dist`.
- The Silent Oracle's headless journey (`arcCampaigns.test.ts`, tactical AI on
  both sides): all seven missions won with carry-over — M1 day 2 (L1), M2 day
  3 (L2), M3 day 6 (L4), M4 day 4 (L6), M5 day 5 (L7, Pyrgos taken, Melas
  still in the field), M6 day 4 (L8), M7 day 3 (L9).
- `node tools/campaign-sim/run.mjs --campaigns silent_oracle,three_beacons
  --runs 20` (600 mission runs, 2.7 min): The Silent Oracle — Story 140/140
  missions won (costliest battle median 0–15 %; six missions "too easy"),
  Normal 139/140 (M5 lost once: Melas caught Alexios on day 3), Hard 136/140
  (M5 16/20: Melas caught Alexios early; costliest battle per mission, median, 7–57 %). The Three
  Beacons — every run won at every level; the new Mission 2 is won on day 2
  (its optional Centaur Sentinels were the only fight). Both levels Story and
  Normal in their bands; Hard 98 % over these two campaigns, above its band
  (as before for the computer pilot). Computer-played measurements, not
  playtests; values unchanged by this measurement.
- Playwright against the dev server (one worker): `owner115` 4/4 passed.
  `audit114`, `campaign`, `frontend110`, `gui110`, `round11`, `round3`,
  `siege`: 55 passed, 2 skipped (the old-save tests, which need
  `PR_OLD_SAVE` / `PR_OLD_SIEGE_SAVES`), 1 failed — `frontend110` › title hall
  expected the footer "v1.1.5" from a dev server started at 1.1.4; after a
  restart it passed. BAT-14 (the player defends a town, now mirrored) and the
  Tactics siege passed. **The full suite was not re-run** this round.
- Captures (cloud only, not in the repository): the left column at 1920 × 1080
  with Windows-style scroll bars before and after (the rail gone); a rival
  attacking Alexios in the open and besieging Westharbor (both mirrored); the
  days badge; The Three Beacons' new Mission 2; The Silent Oracle on the
  campaign screen and its first briefing (stand-in pictures).
- No desktop build or installer this round (not asked; C: had about 1.5 GB
  free after 1.1.4).

## App 1.1.4 — GUI audit fixes and the six-pantheon siege gates (2026-10-11)

Owner request (2026-10-11): implement another tool's handoff, "PANTHEON REALMS
— 1.1.2 GUI AUDIT AND SIX-PANTHEON SIEGE GATE REPLACEMENT"
(`docs/gui-audit-1.1.2/CLAUDE_HANDOFF.txt`, with its audit results,
screenshots and gate validation), then "make sure to have a new installer for
tests". 1.1.3 had already shipped, so this is **1.1.4** (`package.json`,
`apps/desktop/package.json`, the lockfile; release notes in `CHANGELOG.md`).
Rules, content values, AI, saves (format and schema), preferences, the fixed
world camera, combat cells and siege HP are unchanged. The delivery's
documentation and screenshots stay in `docs/gui-audit-1.1.2/` on the PC; only
`assets-runtime/siege-gates-v3/` (its `manifest.json` and the six selected
atlases) is a game asset. Its drafts and provenance (`assets-source/siege-gates-v3/`)
are never registered.

1. **Siege gates (handoff FIX 1).** `ui/src/assets/manifest.ts` imports
   `assets-runtime/siege-gates-v3/manifest.json` and spreads its `siege` (only
   the 18 keys `gate.<intact|damaged|rubble>.<pantheon>`) last, after the
   sprite manifest and siege-v2; the boundary check allows that import. The
   frames and anchors are used as delivered (anchor = painted passage centre,
   different per frame; nothing trimmed or re-centred); `StaticSpriteDefinition`
   gained the optional `registration`. `presentation/src/siegeGate.ts` draws a
   registered gate: the passage centre on `siegeWallPoint(wallCol, gateRow)`
   plus a −3 px presentation shift that lines the gate's wall axis up with the
   v2 walkway; one painted passage pitch = one board row × `GATE_FIT` 1.33.
   At exactly one row per pitch the gate read as a low insert in the taller,
   coarser v2 wall; 1.33 matches their masonry and face height. The doorway
   still centres on the gate cell, and the breach's clear gap lies inside it.
   The picture is cut into a north part (connector, lintel, door; depth just
   behind the gate cell) and a south part (south jamb and connector; in front
   of it), so a creature in the gateway is drawn in front of the far jamb and
   behind the near one. While the wall section beside the gate stands, the
   gate's connector draws that cell (rows 4 and 6). `drawStructures` skips the
   painted strip there, so the wall is never doubled. When the section falls,
   the connector is cut back to the gate's own jamb (`JAMBS`, measured per
   pantheon on the pictures) and the section's rubble strip shows. Ground,
   road and moat are unchanged (`siegeGroundLayer` follows the gate row), so
   the road runs from the bridge through the doorway into the town. The gate
   picture has no ground and no bridge. The state comes from the rules' HP
   (full / partial / 0, as before), so saves load in the state they hold. The
   label "Gate n/m" stands over the lintel. Without the pack the v2 gate
   stills draw as before (`isWallGate`).
2. **Start battle (FIX 2).** A primary command in the battle bar (Start
   battle, Auto: on) keeps the painted face's own layout: icon beside the
   label, centred on the face, face 2.6 rem, hit target ≥ 44 px; the other
   commands stay icon-over-label tiles (`styles/gui.css`).
3. **Parchment labels (FIX 3).** `.setting-block__label` is ink
   (`--gui-ink-head`) inside `.gui-surface--parchment` / `.panel--parchment`
   and stays gold on the dark panels (and on a dark plate inside parchment).
4. **Readable cold load of books and scrolls (FIX 4).** `guiArt.ts`:
   `artReady(url)` decodes a picture once and remembers the answer;
   `preloadReadingSkins()` decodes the open book and the parchment 1.5 s after
   the adventure map opens (first tried at the title, where it only added
   network activity to every start). `components/gui.tsx`: `useArtState(url)` and `Folio`'s
   `data-art` (pending / ready / failed). Until ready, each page is plain paper
   a little larger than its text (box-shadow outside the scroll box, so
   scrolling and focus are unchanged); the book fades in when decoded; a
   failed book keeps the paper. Narrow windows keep their single parchment
   page. The briefing scroll (`BriefingDialog`) does the same with its
   writing rectangle. `ui-v1.1.0/book-open.png` is reused; the Journal itself
   is not changed.
5. **Town caption (FIX 5).** "Placeholder town art · owner concept reference"
   is shown only when the town's painting is not final (never over the
   delivered town art).
6. **Battle readiness (FIX 6).** `BattleSceneController` reports
   `onBoardReady(false)` for a new board and `onBoardReady(true)` once its
   battlefield painting, its siege pieces (current states, moat and bridge)
   and each stack's idle strip have loaded or failed (cap 15 s). Nothing else
   from the catalog is waited for. `SpriteFigure.firstFrame` shows the idle
   frame as soon as that strip arrives, instead of after every strip; a fallen
   stack never stands up in it. A stack whose picture is missing or failed
   stands as a silhouette. The battle screen veils the field ("Preparing the
   battlefield…", `battle-loading`, takes the clicks) and withholds commands,
   Auto and shortcuts; the Menu stays. `AppStore.boardLoading` makes battle
   commands wait and the AI wait. Under `?e2e`, `busy` includes it.
   `SceneViewport` reports a failed view (`onError`), so a missing WebGL never
   blocks a battle.
7. **Optional polish.** The creature viewer never enlarges a strip past 2.25
   screen pixels per painted pixel (`MAX_MAGNIFY`, `viewer.ts`). The troop
   exchange with a town shows `TownThumbnail` (its town-hall stage with each
   constructed building on its slot, as on the town screen). Tips on the
   recruitment screen dock at the bottom left (clear of Recruit and Train), and
   every tip docks at the top on narrow windows (≤ 720 px).
8. **Found while checking real zoom.** `EngineHost.fit` sets the resolution
   for a new device pixel ratio (browser zoom changes it) and redraws at once
   after a resize.

Read-only test hooks (`?e2e`): `__prSiege()` (gate picture, frame, passage
centre in page pixels, part depths, neighbours, wall rows drawn, stack depths
and positions, board readiness) and `boardLoading` in `__prInspect()` /
`__prScreen()`.

Tests: `tests/e2e/audit114.spec.ts` (new, 15):

- Each pantheon: intact, damaged, breached, and breached with both neighbours
  fallen. Checked: only the v5 atlas and the state's frame; the passage centre
  identical in every state (< 0.6 px); north part behind and south part in
  front of the passage; wall rows 4/6 drawn by the gate while standing and as
  rubble when fallen; no strip on the gate cell; v2 pieces still requested; no
  draft requested.
- A hoplite walking from the bridge through the breach into the town (the
  rules move it; sampled while crossing, drawn between the two parts).
- Start battle and Auto: on: the label inside the painted face, one line,
  44 px, focus and Enter; at 1600 × 1000 and 1280 × 720.
- Settings labels: ≥ 4.5:1 on their surface on the campaign page, the pantheon
  drawer, map seats and random map.
- The journal with the book held back (paper, ink ≥ 4.5:1), then released
  (book), narrow, then the book request failing (paper, focus).
- The briefing with the scroll failing.
- No caption on the town.
- A battle with its creature strips and painting held back: notice shown,
  busy, no commands, a click on the field changes nothing, Menu enabled.
  Released: drawn, then an order is taken.
- The same pictures failing: silhouettes, playable, Menu.
- `PR_OLD_SIEGE_SAVES`: the twelve 2026-10-10 siege review saves (older build)
  load with the gate frame and neighbours their HP says.

`packages/presentation/test/siegeGate.test.ts` (new, 3): the 18 keys and their
files, frames and anchors; v2 walls/towers/keeps kept; scale and jamb limits.
`encounters.spec` › garrison exchange now expects the town thumbnail.

### Checks run (this container)

Commands run on 2026-10-11/12 (cloud container, SwiftShader, two cores):

- `npm run check`: boundary check passed (the gate manifest import added to
  its allow-list), type-check clean, **62 files / 515 unit tests passed**.
- `npm run build`: production client 1.1.4; no `C:\Users`, `C:/Users` or
  `lazeb` string in `apps/client/dist`.
- **Full Playwright suite** (`npx playwright test`, production preview of
  that build, one worker, `PR_OLD_SAVE` = the 2026-10-10 Greek siege review
  save, `PR_OLD_SIEGE_SAVES` = its folder of twelve, 3.4 h): **207 passed, 3
  failed, 2 did not run** of 212. The three failures were test timeouts, not
  failed assertions:
  - `brief13` › adventure screens (7.1 min against 7 min; it ran while the
    first Windows installer was being built alongside);
  - `brief15` › the catapult: 4.1 min against 4 min. Its 30 screenshots during
    the animated battle take about 7 s each here, and it also failed this way
    in a 2026-10-10 run.
  - `round19b` › the twelve opening paintings: 4.0 min against 4 min; 24 title
    loads, measured at 10–14 s each.

  The 2 that did not run were the serial tests after them. The four GUI
  suites of the audit's `playwright.audit.config.ts` all passed: frontend110
  15, gui110 12, encounters 5, heroPortraits 6. That includes the nested web
  base test against the built client and the old-save test with the review
  save; the 15 `audit114` tests passed too.
- Then the reading-skin preload moved from the title to the adventure map
  (above), and those three tests got time limits for what they do here: 10,
  8 and 7 min. With that build, `brief13` (4/4), `brief15` (6/6) and the
  `round19b` paintings test passed (5.1, 5.4 and 5.2 min); `audit114` journal
  and briefing and `gui110` journal and resolutions passed 6/6. The rest of
  the suite was not re-run after that one move.
- Captures (`zz` probes, not in the repository): every gate state per
  pantheon; the breach walk; the twelve old saves. Battle, campaign, journal,
  exchange, town, recruitment tip and creature page at 1280 × 720,
  1600 × 1000, 1920 × 1080 and 390 × 844, plus the creature page at
  2560 × 1440. Keyboard focus on Start battle, reduced motion, browser zoom
  as 1280 × 800 at DPR 1.25, and a 2× screen.
- Desktop: `npm run desktop:build`, `electron-builder --linux dir`. Inside
  `unshare -rn` (loopback only):
  - packaged smoke: **DESKTOP SMOKE OK**;
  - the six 1.1.x art packs decode (36/17/33/8/21/54); footer "v1.1.4 ·
    Desktop build";
  - the six gate atlases decode at 1536 × 1024;
  - an older Norse siege save (gate 0/2, wall 2 fallen), imported through
    Load → Import with the native dialog stubbed in the harness only, draws
    the v5 rubble frame with the north connector cut back;
  - the window's real zoom factor at 125 % (devicePixelRatio 1.25, CSS
    viewport 1024 × 720): no horizontal scroll, the board refitted, sharp
    after the `EngineHost.fit` fix.

  No `lazeb` in either `app.asar`.
- **Windows installer** `Pantheon-Realms-Setup-1.1.4-x64.exe` (`--win nsis`
  under Wine, unsigned, from the final source): 1,030,521,805 bytes, SHA-256
  `935cd4d8b2a825fd60a940bc564afc12e3ce7419e6c368e4bf51e320d3b4ecf4`.
  - Copied to the PC in 43 parts and joined in place as
    `pantheon_realms\installer\Pantheon-Realms-Setup-1.1.4-x64.exe` (SHA-256
    checked on the PC, identical).
  - An earlier build of the same day (SHA-256 `07ab1487…`, the preload still
    at the title) was delivered first and then replaced.
  - The emptied parts are in `installer\_to_delete-empty-parts-1.1.4\` and
    `…-1.1.4b\`.
  - Not run on Windows here; not tagged, published or uploaded. C: had about
    1.5 GB free afterwards.
- Review set on the PC: `blannder_models\gui-review-2026-10-10\delivery-1.1.4\`.
- Not done: the new gate pictures themselves are unchanged (no retouching;
  Norse, Celtic and Mesoamerican gates are lighter than their siege-v2 walls,
  as delivered). A damaged wall section beside the gate shows its damage only
  on its other row while the gate's connector draws the row next to the gate.

## App 1.1.3 — the owner's five pre-game fixes (2026-10-11)

Owner request (2026-10-11), five fixes "to move from 1.1.1 to 1.1.2": the
title still showed the old pictures instead of the new one; the encyclopedia's
first menu to the left and cards that wrap their objects, with the generated
frames and a very minimal background instead of a whitish box; no Back in the
blue strip at the bottom of New Game (the header has one); more texture on the
pantheon screen's background; a nicer, better structured creature page. A
second session had already built and delivered a 1.1.2 installer that morning (its section below); asked, the owner
chose to ship these fixes as **1.1.3** on top of it. Its two changed CSS files,
version, changelog and status were taken into this tree first. Version 1.1.3
in `package.json`, `apps/desktop/package.json` and the lockfile; release notes
in `CHANGELOG.md`. Rules, content values, AI, saves, preferences, the fixed
map camera and siege-v2 are unchanged.

1. **Title.** `menuBackground()` (`ui/src/assets/manifest.ts`) returns the
   frontend kit's title painting (`frontendkit.backdrop.title`) whenever its
   file exists; 1.1.0–1.1.2 drew it at random among thirteen pictures, so
   twelve starts in thirteen showed an older painting. The twelve remain the
   fallback. Over the hall the menu is the kit's slim panel between the
   pillars (`.main-menu--kit` in `styles/frontend.css`, as the kit's own QA
   capture composes it), not the 2026-10-05 ornate frame, which stays for the
   fallback paintings. Same controls and IDs.
2. **Encyclopedia** (`screens/Encyclopedia.tsx`, `styles/frontend.css`): the
   eight sections are a rail at the left under the search (`.codex-rail`,
   `role="tablist"` with `aria-orientation="vertical"`, arrow/Home/End keys;
   a horizontal row under 900 px), the pantheon filter and the page to its
   right. Cards (`.codex-frame`) lose the paper fill and wear a painted frame
   as a nine-slice: in a pantheon's section that pantheon's own 1.1.0 frame
   (`gui.frame.<pantheon>`, via `data-gui-theme` on the section), elsewhere the
   painted socket rim (`gui.control.socket`); a faint warm tint inside the
   frame line is the only fill. Creature portraits sit in the socket rim, gods
   in the kit's round medallion; each bestiary family shows its two forms side
   by side with an arrow and a Base / Upgraded label. The page's parchment is
   tiled at its own grain. Returning from a creature's page re-applies the
   saved scroll for about a second (fonts, pictures and equal card heights can
   still grow the page), unless the player scrolls first.
3. **New Game**: the footer with Back is gone; the header's Back remains
   (`GameModeScreen`, `screens/Setup.tsx`).
4. **Pantheon screens**: the painted leather (and parchment) at their own
   grain instead of flat navy, with lighter overlays and vignettes — the
   pantheon choice (`.fe-pantheon-screen`: patron, creatures, setup drawer,
   roster tiles, the parchment summary, more of the atlas painting behind) and
   the gods screen in a match (`.pantheon-screen`: every panel, god cards and
   the signature). Both readings of "the pantheon screen" are covered.
5. **Creature page** (`screens/UnitDetail.tsx`): two framed pages in the
   creature's pantheon frame (neutral: the neutral frame). Left: name; pantheon,
   tier and size; the summary; both forms as socketed tiles (current one
   checked); the statistics as a grid of tiles (attack, defense, damage,
   health, speed, growth, plus shots and range for shooters); the cost; each
   ability as a row with its badge; the lore. Right: the animated creature on
   its pantheon's recruitment court (`adventurekit.recruit.<pantheon>`; neutral
   creatures `adventurekit.encounter.temperate`) — `UnitViewerController.setBackdrop`
   (`presentation/src/viewer.ts`) loads it through `textures.ts`, cover-fits it
   with a light shade and drops the stone plinth; a CSS inset shadow over the
   stage is the vignette (no filter over the canvas) — and the controls in one
   labelled band: Animation, Playback, Speed, View. Every test selector kept;
   new `unit-stats`.

Tests: `tests/e2e/owner113.spec.ts` (new: the title painting on every start,
the kit panel under the logo and centred, no ornate frame; New Game without a
footer; the rail at the left with vertical keyboard order and the search
above; the Greek and Norse frames, the socket rim for neutral and shared
cards, no paper fill, town slots without fill; the creature page's two Greek
frames, tiles, forms, labelled controls, the other form; leather and
parchment on both pantheon screens). Updated: `menu.spec` and `frontend110`
(the title painting is now fixed; New Game has no footer).

### Checks run (this container)

Commands run on 2026-10-11 (cloud container, SwiftShader):

- `npm run check`: boundary check passed, type-check clean, **61 files / 512
  unit tests passed**.
- `npm run build`: production client 1.1.3; no `C:\Users`, `C:/Users` or
  `lazeb` string in `apps/client/dist`.
- **Full Playwright suite** (`npx playwright test`, production preview, one
  worker, 2.0 h): **195 passed, 1 failed, 1 skipped** of 197 (the five new
  `owner113` tests included). The failure was `frontend110` › encyclopedia
  scroll kept after a creature page: Playwright's click scrolled the
  partly hidden last card into view (6 px) before opening it, and the page
  then correctly restored that new position; the test now reads the position
  after bringing the card fully into view. Skipped: `gui110` › old save (needs
  `PR_OLD_SAVE`).
- After that run the encyclopedia page also got `overflow-anchor: none`; on
  that final build `owner113` (5), `frontend110` (15) and `menu` (4) passed,
  24/24. The other suites were not re-run after that one CSS rule.
- Captures (final build): title, New Game, the eight encyclopedia sections and
  the neutral bestiary, four creature pages and the pantheon choice at
  1600 × 1000, 1366 × 768 and 390 × 844; the gods screen in a match for all
  six pantheons; before/after pairs at 1600 × 1000 (before = 1.1.2 on the same
  machine; the gods screen's before is the 1.1.0 capture of 2026-10-10).
- Desktop: `npm run desktop:build`, `electron-builder --linux dir`; packaged
  smoke inside `unshare -rn` (loopback only): **DESKTOP SMOKE OK** (saves,
  records, 1,629 sprites, WebGL map, 550 art and 662 interface pictures,
  audio running, packaged, no dev tools); all six 1.1.x art packs decode in
  the packaged app (36/17/33/8/21/54); footer "v1.1.3 · Desktop build"; no
  `lazeb` in either `app.asar`.
- **Windows installer** `Pantheon-Realms-Setup-1.1.3-x64.exe` (`--win nsis`
  under Wine, unsigned): 1,018,593,169 bytes, SHA-256
  `f2b903c033ca269b0ee5b653dce37301b98ec5f354ff842520afff1ac084da31`. Copied
  to the PC in 43 parts and joined there as
  `pantheon_realms\installer\Pantheon-Realms-Setup-1.1.3-x64.exe` (SHA-256
  checked on the PC, identical; the emptied parts are in
  `installer\_to_delete-empty-parts-1.1.3\`). Not run on Windows here; not
  tagged, published or uploaded. C: had about 2.3 GB free afterwards.
- Review set on the PC: `blannder_models\gui-review-2026-10-10\delivery-1.1.3\`
  (README, before/after pairs, the after screens at three sizes, the packaged
  app's screens).
- Seen on the PC, not part of this request and not implemented: another
  tool's `docs/gui-audit-1.1.2/` (a GUI audit with a handoff) and
  `assets-runtime/siege-gates-v3/` (new siege gate art).

## App 1.1.2 — the two sessions merged; painted buttons fixed (2026-10-11)

Version 1.1.2 in `package.json`, `apps/desktop/package.json` and the lockfile
(the owner: "now the other finished, merge and make a new installer 1.1.2").
Release notes: `CHANGELOG.md`. Rules, content values, AI, the save format and
schema, preferences, the fixed map camera and siege-v2 are unchanged.

**What was merged.** Two sessions worked on this checkout on 2026-10-10 (see
1.1.1 below). The second session (the one writing this section) had built its
own pre-game screens and the encounter scenes; 1.1.1 already carried its
encounter work (reward receipts, hero meeting, briefing scroll, battle-result
tray). The remaining difference was the 14 pre-game screens, built twice. The
owner was shown both side by side and chose to keep 1.1.1's; the second
session's version is not in this tree. 1.1.2 is the 1.1.1 tree as the first
session left it on the PC (pulled 2026-10-11 02:50 UTC, nothing changed there
after 20:15 UTC) plus the fix below.

**Fixed.** gui.css draws the primary button's painted face inside a box at
least `max(face, 44 px)` tall (transparent hit bands above and below). Two
footers set a smaller `min-height` on every button with a more specific
selector (`.ak-foot .btn` 2.75rem, `.meet__bar .btn` 2.6rem), so at a 11–14 px
root size the face was squeezed into a thin strip (found by an audit of every
visible primary button: Marketplace "Confirm trade" 30 px high at 1280 × 720,
37 px at 1600 × 900, against 44 px). Those rules now set the face height
(`--btn-face-h`) for primary buttons and keep `min-height` for the others
(`styles/adventure.css`, `styles/encounters.css`). After the fix the audit
found no squeezed primary button on the map, town, Lodge, Marketplace,
recruitment (1280 × 720, 1600 × 900) or any pre-game screen (1280 × 720,
1366 × 768, 390 × 844), and no horizontal page scroll.

### Checks run (cloud container, SwiftShader; 2026-10-11)

- Boundary check passed; type-check clean (core, client, desktop).
- `vitest run`: 511 of 512 passed. The failure is `uiArt.test.ts` › "registers
  every delivered source file": this container's copy has no
  `assets-source/ui/` (604 source files not transferred); the first session
  measured 512/512 with them. No unit-tested code changed.
- `npm run build`: production client built; `__APP_VERSION__` 1.1.2.
- Playwright on that build (production preview, one worker): `encounters`,
  `gui110`, `audio`, `menu`, `mapSites` — **29 passed, 1 skipped** (gui110 old
  save: needs `PR_OLD_SAVE`). The audio suite ran with the delivered Ogg files
  (154 MB copied from the PC for this build). The other suites were not re-run:
  the code change is two CSS rules; 1.1.1's full run (190/192, see below) is the
  last full measurement.
- Desktop: `npm run desktop:build`; `electron-builder --win nsis --x64 --linux
  dir --x64` under Wine 9.0 (`wine64` and `wine32:i386`; the NSIS uninstaller
  step needs 32-bit Wine). Packaged-layout smoke (`tools/desktop-smoke.mjs`,
  `PR_SMOKE_EXE=…/linux-unpacked/pantheon-realms`) inside `unshare -rn` with only
  loopback up: **DESKTOP SMOKE OK** (`prgame://app/index.html`, auto and manual
  save, records, 1,629 sprites, WebGL map, 550 art and 662 interface pictures,
  audio running, packaged, no dev tools). `app.asar` 928,305,489 bytes, 3,660
  entries, no `lazeb` string.
- **Windows installer** `Pantheon-Realms-Setup-1.1.2-x64.exe`, 1,018,586,404
  bytes, SHA-256
  `b0735f9890364bd1403b2b09672ee0e32e5a5d25e541f24a7da171064897d974`
  (unsigned). Copied to the PC as `installer/Pantheon-Realms-Setup-1.1.2-x64.exe`
  (hash checked there). Not run on Windows here; not tagged, published or
  uploaded.

## App 1.1.1 — encounter scenes, adventure screens, hero portraits, and two sessions merged (2026-10-10)

Version 1.1.1 in `package.json`, `apps/desktop/package.json` and the lockfile
(the owner asked for "a new installer with all the new improvements from today
as 1.1.1"); 1.1.0 was never released on its own, so 1.1.1 carries the 1.1.0
interface redesign and the pre-game screens (both described below) plus the
two deliveries that followed. Release notes: `CHANGELOG.md`. Rules, content
values, AI, the save format and schema, the fixed map camera and siege-v2 are
unchanged.

**Two sessions on one working tree.** At 17:46–17:47 UTC another session
wrote its own implementation of the pre-game handoff plus the encounter
handoff (`docs/encounters-v1.1.0`) over 27 of the files this session had just
synced to the PC, and added 8. Its 35 files were backed up and compared with
the tree before either session; on the owner's instruction ("try your best to
merge the two sessions") the merged tree keeps this session's tested in-game
GUI, pre-game screens and frontend kit, and takes the other session's
encounter work: `app/rewards.ts` (receipts read from one command's committed
events and the state before and after it), `components/rewards.tsx` (tray,
receipt dialog), `AppStore.claimReward` (closes the choice dialog by kind,
small rewards as a tray notice, major ones as a receipt; never re-dispatches),
the reward receipt in the toasts, the hero-meeting `TransferDialog`, the
briefing scroll `BriefingDialog`, the battle result's reward tray, the
encounter styles (`styles/encounters.css`, lifted from its `frontend.css`),
`tests/e2e/encounters.spec.ts` (the chest step adapted to this tree's
select-then-Confirm chest) and `packages/ui/test/rewards.test.ts`. Adapted to
this tree: `useModalFocus` for its `useDialogFocus`, `ArtIcon` gained the
`glyph` fallback, `encounterKitArt()` registers `encounterkit.*` from the
delivered manifest (`ui/src/assets/manifest.ts`; boundary rule added) instead
of its generated table. Not taken (moved, not deleted, to
`_merge-leftovers-2026-10-10/` at the repository root): its generated art
table `frontendArt.generated.ts`, the generator
`tools/assets/frontend_art_table.mjs` and `components/cropped.tsx` (this tree
reads the delivered manifests directly and drops disk paths from the bundle
with the `dropDiskPaths` Vite plugin), and its own versions of the pre-game
screens. Its `package.json` (1.0.0, script `art:frontend-table`) is replaced.

**Adventure screens** (`docs/adventure-gui-v1.1.0`, 21 runtime PNGs under
`adventurekit.*`, `adventureKitArt()`; all 1,920 files of its
`copy-inventory.json` present and hash-equal in this tree). One stage
(`ui/src/components/adventure.tsx`: `AdventureStage`, `HeroFigure`,
`HeroMedallion`, `SkillPlaque`, `CreatureStage`, scene helpers;
`styles/adventure.css`, scoped `.ak-*`) for the Heroes' Lodge, town
recruitment and creature camps, the Marketplace, the level-up, the spellbook
and the encounter preview. Each keeps its quotes and commands (`hireOptions`
/ `quoteHireHero` / confirm + `HireHero`; `quoteRecruitment` / `RecruitUnits`
and `quoteUpgrade` / `UpgradeStack`; `quoteCampRecruitment` /
`RecruitFromCamp`; `quoteTrade` / `TradeResources`; `ChooseLevelUp` on the
skill click; `cast.onCast`; `MoveHero(confirmEncounter)`, `quickBattle`,
`encounterChoice`). Themes: the town's pantheon for the Lodge, recruitment and
market; the hero's for the level-up, the book and the encounter frame. The
encounter landscape comes from the map's climate and the destination's ground
(`encounterBiome`: tundra, high pass and fjord alpine; desert; jungle;
mountain ground alpine; forest ground or autumn woodland; else temperate) —
no climate of the game is volcanic, so that painting is registered but unused;
a siege shows the besieged town's own painting. Changed by design: the Lodge
shows one candidate's details at a time (the 2026-10-07 "price and Hire on
the right of each row" layout is replaced by the approved concept; up to
eight candidates stand in view, each name plate sizes its lettering to the
name on at most two lines, so "Topiltzin Quetzalcoatl" is never cut), the
level-up offers are skill plaques (icon above the text), the spellbook's
right page shows the chosen spell (in casting mode one click still casts; the
page also has a Cast button).

**Hero character portraits** (`docs/hero-portraits-complete`, owner delivery
of 2026-10-10): the 54 busts the story-art manifest lacked
(`assets-runtime/hero-portraits-complete`, 1024 × 1536 PNGs with alpha, hashes
checked against the delivery manifest) are read as an additive pack in
`ui/src/assets/manifest.ts` (`HERO_BUSTS`, consulted only for `*.bust` IDs the
story-art manifest does not have, by `resolveArt` and `resolveAsset`; boundary
rule and `dropDiskPaths` cover its manifest). `speakerBust` therefore finds a
bust for every one of the 74 catalog heroes (`packages/ui/test/heroPortraits.test.ts`
checks all of them, the 54 files' PNG headers, sizes and alpha, that no
delivered bust changed, and that the delivery's 15 art-only identities are not
catalog heroes; Abe no Seimei uses the manifest's `bust-v2` file). Shown
through the existing `.portrait → .bust` route in the Lodge, dialogue,
meeting and encounter (`tests/e2e/heroPortraits.spec.ts`: for each pantheon
the Lodge candidates, the hero screen and a meeting of two of its heroes,
each picture decoded, at 1600 × 900 and 390 × 844), and newly on the hero screen (`hero-bust`, beside the
name), on the encyclopedia's hero cards and beside the level-up choice on
windows at least 1400 × 760; images load lazily when shown.

**Briefing.** The encounter pack's scroll replaces the 1.1.0 briefing's
three-objective summary (it shows every visible objective, as that handoff
asks); `briefing-goals` / `briefing-full` and their styles are gone.

**Also fixed while testing:** the pantheon choice's names had dropped to
1rem under the kit's pennant label (`round11` caught it); back to 1.3rem. The
encounter stylesheet lifted from the other session lost a comment opener when
it was cut out; the production CSS minifier refused it (the dev server had
silently dropped one rule) — fixed before any build was kept.

**Shipped copies without desktop paths.** Five delivered JSON files
(`frontend-v1.1.0/manifest.json`, `frontend-kit-v1.1.0/manifest.json` and
`complete-assets.json`, `adventure-gui-v1.1.0/complete-assets.json`,
`encounters-v1.1.0/dependencies.json`) carry the delivery machine's absolute
paths (`sourceAbsolute`, `runtimeAbsolute`) as provenance. The bundle never
contained them (`dropDiskPaths`), but `publicDir` copied the files into the
build and so into the installer. A second build step
(`dropDiskPathsFromCopies`, `apps/client/vite.config.ts`) now rewrites each
copied JSON file that holds a local disk path without those values after the
build; `assets-runtime/` keeps the delivered bytes.

### Checks run (this container)

Commands run on 2026-10-10/11 on the final tree (cloud container, SwiftShader):

- `npm run check`: boundary check passed, type-check clean, **61 files / 512
  unit tests passed** (includes `heroPortraits.test.ts` and `rewards.test.ts`).
- `npm run build`: production client built; no `C:\Users`, `C:/Users` or
  `lazeb` string anywhere in `apps/client/dist` (bundle and copied JSON, after
  `dropDiskPathsFromCopies`); `assets-runtime/` unchanged.
- **Full Playwright suite** (`npx playwright test`, production preview, one
  worker, 2.1 h): **190 passed, 1 failed, 1 skipped** of 192. The failure was
  `menu.spec.ts` › main menu, which still expected the older `logo-text`
  lettering although the title shows the frontend kit's logo layer since the
  kit was added; the expectation was updated and `menu.spec.ts` then passed
  4/4 on the same build. Skipped: `gui110.spec.ts` › old save (needs
  `PR_OLD_SAVE`, an owner save file; not available here).
- After the full run the Lodge's name plates were changed (the longest
  names were cut; see above) and the copied JSON stripped; on that final
  build: `heroPortraits.spec.ts` 6/6 at 1600 × 900 and 6/6 at 390 × 844 (now
  also: names fit their plates, two lines at most, every candidate in view on
  desktop, a two-hero meeting per pantheon), `encounters.spec.ts` 5/5 at
  1600 × 900, 1366 × 768 and 390 × 844, `frontend110.spec.ts` (incl. the
  packaged-manifest fetch) and `menu.spec.ts` passed. The other suites were
  not re-run after those two changes.
- Captures for review (final build): the six adventure screens for all six
  pantheons at 1600 × 1000, Greek also at 1366 × 768 and 390 × 844, creature
  camp at three sizes, hero screen and encyclopedia heroes; encounter scenes
  at three sizes; hero portraits (Lodge, hero screen, meeting) per pantheon
  at two sizes.
- Desktop: `npm run desktop:build`, `electron-builder --linux dir`; the
  packaged-layout smoke (`tools/desktop-smoke.mjs`, `PR_SMOKE_EXE=…/linux-unpacked/pantheon-realms`)
  run inside a network namespace with no outside network (`unshare -rn`,
  loopback only): **DESKTOP SMOKE OK** (`prgame://app/index.html`, auto and
  manual save written, records, 1,629 sprites, map drawn with WebGL, 550 art
  and 662 interface pictures decoded, audio running, packaged, no dev tools).
  A cloud-only check in the same packaged app decoded every file of the six
  1.1.x packs from its own files (ui 36/36, frontend 17/17, frontend kit
  33/33, encounters 8/8, adventure 21/21, hero portraits 54/54); footer
  "v1.1.1 · Desktop build". No `lazeb` string in either `app.asar`.
- **Windows installer** `Pantheon-Realms-Setup-1.1.1-x64.exe` built in the
  cloud container with `electron-builder --win nsis` under Wine (unsigned):
  1,018,593,135 bytes, SHA-256
  `fc24b3864b5b985cd2848bba3bd506bebcde7db09180ba78c326a68cf41e3e0e`
  (larger than 1.0.0 by the new packs: hero busts 163 MB, adventure 50 MB,
  encounters 17 MB). Copied to the PC in 43 parts and joined there:
  `C:\Users\lazeb\Desktop\blannder_models\gui-review-2026-10-10\delivery-1.1.1\installer\`
  (SHA-256 checked on the PC, identical). Not run on Windows here; not
  tagged, published or uploaded.
- Review set on the PC: `…\gui-review-2026-10-10\delivery-1.1.1\` (README,
  the 1.1.1 captures as JPEG, the earlier 1.1.0 in-game and pre-game sets as
  zips).
- Not measured this round: frame timing (`tests/perf`), load time, balance
  and campaign simulations (no rule, content or AI change).

## App 1.1.0 — interface redesign (2026-10-10)

The owner-approved GUI handoff (`docs/gui-v1.1.0/CLAUDE_CODE_HANDOFF_1.1.0.txt`,
14 concepts in `docs/gui-concepts-2026-10-10/`, 36 production layers in
`assets-runtime/ui-v1.1.0/`) implemented over the working tree of the siege
visual revision 2 (not committed; HEAD `8745680`). Rules, content values, AI,
the save format and schema, the fixed map camera and siege-v2 are unchanged.
Version 1.1.0 in `package.json`, `apps/desktop/package.json` and the lockfile;
the screens read it from the build (`__APP_VERSION__`). Superseded the same day by 1.1.1
(above), which carries this work; 1.1.0 was never released on its own. Release notes:
`CHANGELOG.md`.

**Code.** `ui/src/assets/guiArt.ts` registers the pack as its own typed `gui.*`
namespace (relative URLs, manifest metadata: nine-slice borders, measured
surface insets, safe page and content rectangles, the stage's ground point) and
installs the material variables; `ui/src/styles/gui.css` is the 1.1.0 skin
(frame-over-surface windows, painted primary buttons with code-drawn states and
44 px hit bands, socket rims, choice tiles, exchange, tooltip, banner, folio,
stage, merchant header, and each screen recipe); `ui/src/components/gui.tsx`
holds the shared pieces (theme selection, sockets, select-then-confirm choices
with `useOnce`, encounter headers, faction banners, the folio, one tooltip
layer). Screens changed: map decisions (`WorldDialogs.tsx`), adventure sidebar,
hero, recruitment, town and its shops, battle, battle result, pantheon setup,
journal, encyclopedia, unit detail, level-up, briefing and story; every other
window takes the shared skin through the kit (`Modal`, `Panel`, `Button`).
`tools/check-boundaries.mjs` allows `guiArt.ts` to read the pack's manifest.
`presentation/src/battle.ts` only adds the shown stack label to the read-only
`?e2e` stack inspector.

**Behaviour that changed (by design).** A reward tile only selects; Confirm
runs the command once and Decide later closes without claiming (chest, map
event); a shop or market purchase cannot be repeated by a double click;
construction from the town's new list or pop-up; the battle's stack labels
default to the count with health on the acting and the hovered stack
(preferences schema 4 migrates the old default once; "Count and health,
always" stays); Escape closes a closable dialog only; the Tooltips setting now
switches the themed tooltip off.

**Window coverage.** All 98 windows of `docs/gui-v1.1.0/window-coverage.json`
captured after the change at 1600 × 1000 with the owner's review scripts
(94) plus a short script for the four they did not reach (B02, B04, S12A,
S12B); 94 have before/after pairs (the before set lacks those four).
Principal screens in all six themes (adventure, pause, town, building, list
of buildings, market, recruitment, hero, journal, pantheon, briefing, battle,
miracle book, retreat, setup): 90 captures. Delivered to the PC with the 1.1.1
review set: `C:\Users\lazeb\Desktop\blannder_models\gui-review-2026-10-10\delivery-1.1.1\gui-1.1.0\`
(JPEG copies).

**Pre-game screens (second handoff of 2026-10-10, `docs/frontend-v1.1.0/`).**
The 17 pre-game paintings are copied byte-identical into
`assets-runtime/frontend-v1.1.0/` (runtime), `assets-source/frontend-v1.1.0/`
and `docs/frontend-v1.1.0/` (concepts, recipes, coverage, the handoff) and
registered in `ui/src/assets/manifest.ts` under `frontend.*` (`frontendArt`,
relative `./frontend-v1.1.0/...` URLs; absolute or drive paths are refused;
`tools/check-boundaries.mjs` allows the manifest import). Outside a match the
document wears a new neutral theme (`data-gui-theme="neutral"`, a code-drawn
dark blue and bronze nine-slice in `guiArt.ts`); a pantheon's frame appears
only on its own panels. Shared pieces: `ui/src/components/frontend.tsx`
(`FrontendShell`: backdrop, title plaque, one main region, a footer that stays
in view; `IllustratedChoice`; `radioKeys`; `EmptyArchive`) and
`ui/src/styles/frontend.css`. Screens: title (Hall of Records link — the
optional addition, implemented; footer version only; the frontend kit's title
background joins the twelve opening paintings in the random rotation), New Game, Campaign
Chronicles, Skirmish Atlas, Random Map (Land / Empires / Rules over one draft;
no seed field), seats, encyclopedia (filter, search, return state), creature
page, settings (rail, parchment page, footer; Escape now asks before
discarding — it used to leave), Saved Journeys, map library, map editor
frame, Hall of Records, the shared confirmation (parchment; the safe action
focused). The complete frontend kit that followed the pack (`assets-runtime/frontend-kit-v1.1.0`, 33 pieces, `frontendkit.*`,
`frontendKitArt`; masters and prompts in `assets-source/frontend-kit-v1.1.0`; every one of the 1,891 files of
`complete-copy-inventory.json` present and hash-equal in this checkout) supplies the title background and logo
(separate layers), the six finished pennants (`FactionBanner`, `MiniBanner`: pantheon choice, seats, battle
sides), the section, settings and editor icons (`ArtIcon`, `Button artUrl`), the warning seal on destructive
confirmations, the records medallion and the blank title plate (a nine-slice behind each pre-game title).
Store: `AppStore.leaveGuard` (Settings' Escape) and
`confirm(..., { cancelLabel })`. No rule, content value, save format, schema,
camera or siege change; `random-map-types.json`'s nine IDs are the game's own.

**Measured contrast** (WCAG, on the darkest 2 % of the parchment and on the
stone panel): parchment ink 10.2:1, soft ink 6.9, faint ink 4.5, headings
7.3, warning 5.0, error 4.9, success 5.1 (darkened from 4.2), keyboard
focus on parchment 5.5; stone: body text 10.3, gold headings 11.5, focus
ring 14.1, faint text 5.3 (raised from #7c7462, 3.5:1); painted button text
on its face 11.2; selected outline on parchment by its border 5.1:1.

## Siege visual revision 2 (2026-10-10)

Delivered into the working tree on 2026-10-10 (not committed; HEAD `8745680`):
for each of the six pantheons a whole-view siege ground painting, a gate /
tower / keep atlas and a continuous wall-strip atlas, each with intact, damaged
and rubble states, plus a shared moat / end-cap / bridge atlas —
`assets-runtime/siege-v2/` (19 PNGs and `manifest.json`: 6 grounds, 72
fortification states, 4 ground pieces, measured atlas frames and anchors;
sources and prompts in `assets-source/siege-v2/`, byte-identical). Native
1536 × 1024 (grounds, walls, groundworks) and 1254 × 1254 (kits), below Brief
15's 4096 × 3200 (accepted by the owner; never enlarged). Code:
`presentation/src/siegeLayout.ts` (shared wall positions, painting frame, keep
point, palettes), `siegeScenery.ts` (painted wall strips with one world-space
repeat phase, moat with caps only at its outer ends, bridge and road on the
real gate row, code-drawn fallbacks), and changes in `battle.ts` (ground layer,
atlas pieces, contact shadows, more room for the keep, quieter siege grid,
structure labels on hover or while damaged), `staticSprites.ts`
(`stillTexture`: cached atlas-frame views), `sprites.ts` (`frame`, `layout`),
`environmentArt.ts` (`layout: 'siege-v2'`), `ui/src/assets/manifest.ts` (the
siege-v2 grounds resolve first; its siege entries overlay the Brief 15 ones,
which stay in the sprite manifest) and `tools/check-boundaries.mjs`.
Presentation only: rules, targeting, movement costs, siege levels and saves
are unchanged; `SIEGE_GROUND_SHIFT` now applies only to the older siege
paintings. Re-register after replacing an atlas: `python
tools/assets/import_siege_v2.py` (Pillow, numpy, scipy; metadata only).

### Checks run (this container, the owner's working tree copied byte for byte)

* Working tree against HEAD: exactly the six changed files and the new files
  listed above; `git diff --check` clean (with the owner's `core.autocrlf`).
* `npm run lint:boundaries`, `npm run typecheck`: pass. The four focused
  suites (`siegeScenery`, `sprites`, `rules/siege`, `ui/groundArt`): **38/38**.
  All unit tests: **502/502** (59 files; `assets-source/icons/final` was
  present by file name only in the container).
* Playwright, release build: `siege.spec.ts` 2/2, `round0108.spec.ts` sieges
  2/2 (the Catapult aimed at a tower; the defender combining stacks),
  `brief15.spec.ts` **5/5 after updating its expected files** — it asserted the
  Brief 15 `.webp` siege stills and battlefields, which siege-v2 now replaces;
  it now expects each pantheon's `siege-v2/kit`, `wall`, `ground` and the
  shared `groundworks-capped` pictures (level 3 failed before the update).
* The twelve delivered review saves (six pantheons, intact and damaged /
  breached) opened in the game at 1600 × 1000: no page errors or failed
  requests, each siege loads its own kit, wall and ground and the shared moat
  atlas; 0.3–1.0 % of pixels differ from the delivered captures (idle
  animation, text). Intact labels appear on hover (all six); after deployment
  the moat, bridge and labels stay and the catapult's shots change the art.
  Live window resizing 1920 × 1080, 1366 × 768, 1280 × 720, 1024 × 768: the
  board corners and both wall ends stay on screen, the keep in frame.
  Fortification levels 1 and 2 built headlessly for every pantheon: no towers,
  the keep and the moat only at level 2, no moat atlas requested at level 1.
  The Greek review save under `npm run dev` draws the same siege.
* `npm run build`: 973 modules; `apps/client/dist` 3,266 files (110 bundle
  files and the 3,155 runtime files, all 19 siege-v2 PNGs referenced);
  built twice, identical.
* `npm run desktop:build` and `electron-builder --win nsis --x64 --linux dir
  --x64` (wine for NSIS): `Pantheon-Realms-Setup-1.0.0-x64.exe`, 597,081,857
  bytes, SHA-256
  `c0dbfd8320644302086e8f6cbb2daa87bef5a041be75df676636160880cf985b`; the
  packed renderer equals the build (3,265 files, only `.gitkeep` left out);
  packaged-layout desktop smoke offline OK (1,629 sprites, 550 art, 662
  interface images, 91 sounds, saves and records); all 19 siege-v2 files
  served from `prgame://app/` and decoded offline. Unsigned; version still
  1.0.0; not copied to the owner's PC; not run on Windows.

Seen, not changed: at levels 1 and 2 (no towers) the wall strip ends square at
rows 0 and 10; a few wall strips show where their picture repeats (e.g. the
Egyptian south section); in SwiftShader the siege pictures appear a few
seconds after the battle opens (the field shows the plain ground and the
paving overlay until then).

Delivery on the owner's PC: `apps\client\dist` rebuilt (the old one dated
from 2026-10-01) and checked file by file against this build (3,266 SHA-256
matches); `tests/e2e/brief15.spec.ts` updated as above.

## The owner's third list of 2026-10-07; app 1.0.0

The owner asked for difficulty levels in the campaigns, a seat-fairness check
for the authored maps and the random-map layouts, a better frame rate, and then
to stop the fairness balancing and make the installer **1.0.0**, owned by
**Teddy Lazebnik** (not Skana Robotics). Values are proposed and unplaytested
unless a measurement is quoted; DESIGN_PROPOSALS.md items 56–58.

### Campaign difficulty (Story / Normal / Hard)

Chosen on the campaign page (default Normal, the exact effects listed under the
choice), kept for the whole run — next missions, restarts and practice replays
(`CampaignState.difficultyId`) — named in the briefing, multiplied into the
score and shown in the campaign high-score table. A level changes how many
creatures stand in guards, wandering monsters, scripted enemy armies and unowned
garrisons (75% / 130% / 170%), the computer rivals' starting armies (85% / 115%
/ 110%), purse and income (75%+90% / 100% / 130%+120%), the margins the computer
fights at, and how readily scripted enemy heroes attack (130% / 100% / 90% of
their written margin, never below even). Creature statistics never change. A run
started by 0.14 or earlier has no level: its missions stay as written and its
recorded entry hashes still match (tested). The objective texts now carry the
armies as tokens and show the counts the match really has
(`missionText`; a test checks every token against its mission's armies).

Content changed with the levels (missions the simulation found trivial even at
Normal): the four arc campaigns' mission 4 landing guard 36 Brigands + 14
Cutthroats (was 20 + 8) and goal guard 4 + 2 (was 3 + 1); The Winter Oath's
mission 4 landing 30 + 12 Draugar (was 20 + 8) and wyrm brood 4 + 2 (was 3 + 1);
The Twelfth Hour's mission 1 monument 20 + 6 (was 14 + 4) and mission 3 pass
24 + 10 (was 16 + 6). Tried and reverted: rival town garrisons × 1.5 in mission 5
(it freed the rival's hero to strike early: mission 5 became unwinnable at Hard),
and Hard rival armies at 130% (the same).

**Campaign simulator** (`npm run campaign-sim`, now every campaign — The Three
Beacons included — at all three levels, with per-level target bands and
`--check`). The autopilot was improved: before a fight the preview says it
loses, it walks home for the garrison and the creatures its towns sell (it had
wandered for 56 days in Three Beacons mission 3 with 22,000 Gold unspent).
Measured, 20 journeys per campaign and level (2,280 mission runs, 5.3 min,
4 workers on 2 cores):

| Level | Target | Missions won | Costliest battle (median share of the army lost) | Too easy | Hard | Unwinnable or blocked | Check |
|---|---|---|---|---|---|---|---|
| Story | wins ≥ 95%, costliest ≤ 15% | 100% | 5% | 31 | 0 | 0 | pass |
| Normal | wins ≥ 85%, costliest 10–30% | 100% | 20% | 7 | 0 | 0 | pass |
| Hard | wins 60–95%, costliest 20–45% | 94% | 34% | 1 | 3 | 0 | pass |
| *As written (no level), same autopilot* | — | 100% | 10% | 16 | 0 | 0 | — |

Normal's seven "too easy" missions: The Three Beacons 1 and 2 (the
introductory campaign), Silver Branch 1, Twelfth Hour 3, and three missions 5
(New Fire, Twelfth Hour, Winter Oath — their test is the rival empire, which
the costliest-battle measure does not capture). Hard's three "hard" missions are
all missions 5 (Lantern Road 35%, Silver Branch 40%, Winter Oath 40% won): the
richer, bolder rival. The autopilot never starts a fight the preview says it
loses, so these are computer-played measurements, not playtests.

### Seat fairness of the authored maps

`npm run maps:build` (`tools/maps/build.mjs`) now stages the maps, plays the
seat-fairness test (`tools/maps/fairness.ts`, verdict in `fairnessJudge.mjs`) on
those that changed since `tools/maps/fairness.json` and ships only the fair
ones; `npm run maps:fairness` tests the shipped maps (`--matches`, `--from`,
`--out` for an investigation; `--dry-run` to try a design change). Measured on
the shipped maps (all-AI mirror matches, rotating turn order as in the game):

| Map | Matches | Seat shares | Verdict |
|---|---|---|---|
| Frostgate | 12 | 63%, 38% | fair |
| The Golden Fords | 12 | 54%, 46% | fair |
| Barrows of the Lost Kings | 36 | 38%, 63% | fair |
| The Burning Oasis | 36 | 25%, 18%, 19%, 39% | uneven, within chance |
| The Six Thrones | 36 | 17%, 10%, 17%, 12%, 12%, 31% | uneven, within chance |
| **The Circle of Gates** | 36 + 60 | 37/25/38%, then 59/11/30% | **unfair** (seat 2 ≈ 16%, z −3.65 on the 60) |

The Circle of Gates was not fixed: four design changes, 48 matches each — the
portal ring reversed (43/20/38%), stronger gate-terrace wardens (36/13/51%), 10
ridge ogres (48/22/31%), 16 ridge ogres (46/16/39%) — left the second seat
weakest, and the owner then stopped the balancing for 1.0.0. The map ships
unchanged; the record says so. Traces show the first towns falling to a
neighbour's early raid around day 4–5, which the rotating turn order decides,
rather than any difference in the ground (distances and sites are the same for
every seat).

**Random-map layout floor:** the `random1v1` report marks every pantheon ×
map type under 0.40 and fails a cell only when the top of its one-sided 95%
range is still under it (`--check` exits 1). The large run to settle the cells
was **not played** (the owner stopped the balancing).

### Frame rate

Two changes, both presentation only:

* **Ground cache** (`presentation/src/groundCache.ts`): the map's ground layer
  (painted terrain, painted transitions, shore foam, roads, grid) is drawn into
  512-pixel textures on the screen's pixel grid, multisampled like the screen;
  while they cover the view the live ground is not drawn. At most four chunks
  (about 6 ms) per frame; the live ground is drawn whenever the chunks do not
  cover the view yet (opening, a ground change, a zoom — chunks follow 200 ms
  after the wheel rests —, a pan faster than the ring around the view).
* **Frame pacing** (`engineHost.ts`, `FramePace`): full rate while anything
  moves or the player points; 30 frames a second while only idle loops play,
  8 when nothing changes (Low, reduced motion). The frame-rate readout judges
  only moving frames and says "calm" otherwise.

Measured in this container (SwiftShader GPU emulation, 1280 × 720, High; GPU
time per frame from `tests/perf/frames.spec.ts` with `PERF_GPU=1`; these compare
versions, the laptop's frame rate is still to be measured there):

| Scenario | Before (live ground) | After |
|---|---|---|
| Twin Harbors, panning | 415–426 ms | 177–193 ms (−55 to −58%) |
| Huge random map (six empires), panning | 624 ms | 168–218 ms (−65 to −73%) |
| Twin Harbors, zooming | 367 ms | 446 ms (each wheel step draws the live ground; in the emulator's 2–3 frames a second the chunks are redrawn between steps) |
| Map idle, frames drawn per second | 60 (the cap) | 29.8 (ambient pace) |
| Battle idle, frames drawn per second | 60 | 30.1 |

Where the GPU time went (Twin Harbors, panning, live ground, a temporary
switch removed afterwards): whole frame 426 ms; without the painted transitions
201; without the terrain 349; without the whole ground 133; without the
objects 400; without the fog 374. The cached ground matches the live one
(screenshots of the same view: mean difference 0.07 of 255 per channel; 510 of
921,600 pixels differ by more than 24 — the selection ring's pulse and the
map's outer edge). Main-thread time per chunk drawn in this emulator: 5–10 ms
on Twin Harbors, up to about 20 ms on the huge map. The perf scenario
"a hero walking" did not start its walk in the GPU-timed runs (it did in a run
without GPU timing).

### 1.0.0 and the owner

Version 1.0.0 in `package.json`, `apps/desktop/package.json` and
`package-lock.json`; installer metadata: author and publisher **Teddy
Lazebnik**, copyright "Copyright © 2026 Teddy Lazebnik", application ID
`com.teddylazebnik.pantheonrealms` (was `com.skanarobotics.pantheonrealms`).
The new ID makes Windows treat 1.0.0 as a new installation: **uninstall the
0.13/0.14 play-test build from Apps & features before installing 1.0.0**
(saves, preferences and records live in the user data folder, which an
uninstall keeps). The end-of-campaign note no longer calls the game a
development build with placeholder art (all sprites and art are final).

### Checks run (this container)

* `npm run check` (boundaries, type check, unit tests): **498/498** in 58
  files. New: `packages/campaign/test/campaignDifficulty.test.ts` (8 tests:
  levels, scaling of guards, hostile armies and thresholds, rival armies and
  purse, texts, the level kept across the run, old runs unchanged, scopes,
  every army token matches its mission).
* Full `npx playwright test`: **153 of 154 passed in 1.8 h**; `sprites2d.spec.ts:136`
  (playback speed) timed out at the end of the run, as in 0.14.0, and passed
  alone (52 s). New `tests/e2e/round0109.spec.ts` (campaign difficulty through
  the campaign page, briefing, match and Journal) passed; `framerate.spec.ts`
  now checks the calm readout and the measured one while panning.
* Installer `Pantheon-Realms-Setup-1.0.0-x64.exe`, 549,156,666 bytes, SHA-256
  `3360e72000f49cdc86ba7cb28d620a1ec4c161c82716cdf8801517205ee59f52`: the
  packaged app equals the build (3,248 files; only `package.json` differs —
  version 1.0.0, author Teddy Lazebnik; no development files); the executable's
  version information names Teddy Lazebnik and no longer Skana Robotics; the
  packaged-layout desktop smoke ran offline (1,629 sprites, 550 art, 662
  interface images, 91 sounds, saves and records written, packaged, no
  developer tools). Not signed; not run on Windows here.
* Campaign simulator and fairness numbers above; the frame numbers are
  SwiftShader measurements in this container, not the laptop's.

Delivery: bundle 29 (`apply_sync.py`, dry run first) over the owner's commit
`d483cd1` (which matched bundles 27 and 28 exactly), not committed; the
installer in `installer\` (28 parts of 20 MB joined on the device and
hash-checked).

## The owner's second list of 2026-10-07; app 0.14.0

The owner's list, item by item (values are proposed and unplaytested unless a
measurement is quoted; DESIGN_PROPOSALS.md items 48–55):

1. **Quick battles from the encounter panel.** When an encounter opens, the
   panel fights the battle on a copy of the current state with the battle AI
   on both sides (the Auto of the battle screen) and shows **Victory/Defeat,
   the rounds, the experience and each of your losses** ("You lose −2 of 14
   Hoplites, −1 of 8 Peltasts"). **Quick battle** resolves it without the
   battlefield and opens the result screen. It is the same function on the
   same state (`runQuickBattle`, `GameSession.quickBattle`), and the dice
   travel in the state, so the result is exactly the preview (tested: equal
   state hashes; the e2e test compares the result screen's lines with the
   headless preview). Not offered when another human seat commands the other
   army (hot-seat); a checkpoint is saved before, as for any battle.
2. **A smarter computer player in the late game** (`packages/ai`):
   * **Hand-offs** (`handoff.ts`): from day 15 a secondary hero carrying 15–80%
     of the main army's strength walks to the main hero (at most two days,
     never stopping where a stronger visible enemy reaches) and hands over its
     stacks — the most valuable first, swapping for the main army's weakest
     when worth 20% more — keeping one creature, then goes home for the next
     recruits.
   * **Miracles at the decisive moment:** the weekly miracle is kept while an
     enemy empire's army or town is within about two days, until the last two
     days of the week; in battle it is called (rounds 1–4) in a siege, against
     another empire's hero or in a close fight — not in walkovers (> 3 : 1),
     easy fights against neutrals (> 1.6 : 1) or lost causes (< 0.3 : 1, unless
     its own town is at stake).
   * **Counterattacks:** a town lost in the last 21 days is worth 1.6 × as much
     and is besieged at 0.85 × the usual margin (never below even). Every
     ownership change is recorded (`PlayerState.lostTowns`, public) and now
     emits `TownCaptured` with the previous owner, also for a town walked into.
   * **The rivals' turns in a few lines:** when your turn begins, "While you
     waited" lists one line per empire — "Norse took the Sawmill and recruited
     at Hvitstrand". Only what you could see when it happened, or what touched
     you (your town, mine or hero, wherever it was); town captures and
     eliminations are public; enemy heroes that came into view near your towns.
     Hot-seat: each human seat gets its own. Close it with ×.
3. **The campaigns checked by simulation** (`npm run campaign-sim`,
   `tools/campaign-sim`, never packaged): the computer plays the player's side
   of The Winter Oath and the four arc campaigns with an objective autopilot
   (recruit, train and build for the counters; commit gods, claim, assign
   covenants, activate — saving or buying at a market what an activation costs
   —, resolve the map event that sets a needed flag, walk to sites, hunt the
   named hero, take the town; a guarded objective only when the quick battle on
   the current state wins), the shipped AI plays everyone else, and journeys
   play the seven missions in order with carry-over. Results below; **no
   mission was unwinnable or blocked**, so nothing was changed.
4. **Pantheon balance:** three larger runs and three targeted changes put
   every pantheon inside 0.45–0.55 on random maps (below).
5. **Mixed-pantheon armies:** one pantheon +1 morale (as before); each further
   pantheon −1, at most −2; neutral creatures never count. The hero screen's
   morale includes the army's part (tooltip says which).
6. **Finished sieges:**
   * a town defender with more than seven stacks can **combine identical
     stacks** (garrison and visiting hero) in the defender choice — **Combine
     identical stacks**; seven or fewer left, all of them defend; the game's
     own defenders always combine first (the "not available" note is gone);
   * the attacker **aims the Catapult**: on one of its own turns, click a
     standing wall, gate, tower or keep in the fortification list (it shows the
     current target); from the next round start the Catapult hits it while it
     stands (round 1 hits the gate: nobody has acted yet); the AI aims at the
     gate while it has ground troops, otherwise at the weakest turret;
   * **towers and the keep pick their targets**: the attacker stack their shot
     hurts most (Gold worth of the Health it removes, shooters with shots
     × 1.5; ties: closest, then ID) instead of always the closest.
7. **The gods' gifts at levels 10 and 15** (expanded rules: skirmishes, random
   maps, The Winter Oath and the arc campaigns): the level-up first offers two
   gifts from the gods your empire committed to (from two different gods when
   it has two or more); one must be taken, the other is gone for that hero.
   Every one of the 60 gods gives two gifts, one per word of its domain
   (Athena's Knowledge +2 Knowledge, Zeus' Lightning +20% spell damage, Hera's
   Guard …; 18 small themes in `content/src/common/godPerks.ts`). **No new art:**
   each gift shows its god's existing portrait with the theme's existing stat
   icon; the hero screen lists the gifts taken under the specialty. The AI
   takes fighting gifts for fighters, spell gifts for casters.
8. **Map editor:** a **symmetry brush** (Off, Left–right, Top–bottom, Four ways,
   Turned) for ground and roads, the copies outlined under the cursor; Turned
   is exact on every map size, a mirror shifts alternate rows by half a hex.
   **Generate** runs the random-map generator (size, 2–4 empires, map type,
   unowned towns) and opens the map as an ordinary editor document — same
   ground and roads, towns, mines, guards and rewards; one-off map events have
   no editor site and are named in a message; wandering monsters become
   standing armies. Tested on three generated maps: valid, the same ground and
   roads, every town, and they compile into a playable mission.

### Pantheon balance (random maps, one against one; target 0.45–0.55)

Measured with `npm run balance -- random1v1 --matches 24` (720 matches on the
nine layouts, each map from both seats; 2 workers):

| Run | Content | Matches | Greek | Norse | Egyptian | Japanese | Celtic | Mesoamerican |
|---|---|---|---|---|---|---|---|---|
| 0.13.6 (last round, for reference) | before this round's rules | 720 | 0.57 | 0.51 | 0.53 | 0.47 | 0.45 | 0.47 |
| full run (29.9 min) | this round's rules and AI, no value change | 720 | **0.58** | **0.44** | 0.53 | 0.53 | 0.48 | **0.45** |
| `--focus greek,norse` (15.3 min) | Greek tier 6 in line; Raiders boldness 1 | 432 (merged: 720) | 0.57 | 0.52 | 0.53 | 0.50 | 0.45 | **0.42** |
| `--focus mesoamerican,celtic` (13.5 min; experiment, reverted) | Devout and Mystic weights softer | 432 (merged) | 0.57 | 0.52 | 0.54 | 0.54 | **0.44** | **0.40** |
| `--focus mesoamerican` (8.8 min) | **final**: Offering 1 Favor per 125 Gold | 240 (merged: **720**) | **0.55** | **0.51** | **0.53** | **0.50** | **0.45** | **0.45** |

Final (720 matches; three runs merged by pairing — every pairing comes from
the last run that played it, and no later change touches a pairing kept from
an earlier run): Greek 0.552, Norse 0.512, Egyptian 0.529, Japanese 0.504,
Celtic 0.448, Mesoamerican 0.454; 560 decided by elimination (mean day 24.0),
137 on army strength at the day cap, 23 draws; first seat 0.51. Standard error
about 0.03 per average, 0.07 per pairing. Greek and Celtic sit on the edges of
the band, inside it within the noise.

The changes (proposed values):

* **Norse Raiders attack at the same margins as every rival** (AI temperament
  boldness 1, was 0.95; they still value raids × 1.15, raise troops first and
  keep an extra hero). This round's AI (counterattacks, held miracles) had
  pushed the Raiders, who attacked at smaller advantages, to 0.44; with even
  margins Norse scores 0.51.
* **Greek tier 6 in line with the other pantheons:** Minotaur damage 16–22
  (was 16–24), Labyrinth Warden 1,250 Gold (was 1,200, the only tier-6 upgrade
  below 1,250). No measurable effect on its own (0.58 → 0.57).
* **Mesoamerican Offering: 1 Favor per 125 Gold** of creatures (was 150; still
  at most 10 a week; Xiuhtecuhtli's blessing 100/15 unchanged). Mesoamerican
  0.42 → 0.45, and Greek 0.57 → 0.55 through their pairing (0.67 → 0.57).
* Tried and reverted: the Devout (Mesoamerican) offering and Temple weights
  1.1 (were 1.25) and the Mystic (Celtic) Mage Guild weight 1.2 (1.35) —
  Mesoamerican 0.40 and Celtic 0.44, no better (the habits seem to help them).

Same-tier duels (`balance -- tiers`) and army duels (`armies starts`) were
measured for diagnosis: Greek units score low in single-stack duels (several
below 0.35) while Greek wins on the map, so its lead comes from how its
empire plays (the neutral temperament), not from its creatures.

### Authored skirmish maps (larger samples)

`npm run balance -- maps --matches 4 --max-day 45` (each pantheon line-up
played once from every seat, so pantheon strength cancels out; 76 matches,
6.0 min with 2 workers; the earlier run had 2 line-ups per map — 44 matches):

| Map | Empires | Matches | Decided (by the shrine) | Mean decisive day | Seat scores (1, 2, …; even = 1/N) | Earlier (2 line-ups) |
|---|---|---|---|---|---|---|
| Frostgate | 2 | 8 | 3 (0) | 30.7 | 0.38, 0.63 | 0.50, 0.50 |
| The Burning Oasis | 4 | 16 | 6 (1) | 35.0 | 0.23, 0.11, 0.48, 0.17 | 0.25, 0.13, 0.25, 0.38 |
| The Circle of Gates | 3 | 12 | 6 (0) | 28.0 | 0.47, **0.06**, 0.47 | 0.50, 0.17, 0.33 |
| Barrows of the Lost Kings | 2 | 8 | 5 (0) | 32.2 | 0.38, 0.63 | 0.50, 0.50 |
| The Golden Fords | 2 | 8 | 4 (0) | 36.8 | 0.50, 0.50 | 0.33, 0.67 |
| The Six Thrones | 6 | 24 | 6 (6) | 39.8 | 0.04, 0.17, 0.21, 0.33, 0.17, 0.08 | 0.04, 0.29, 0.38, 0.21, 0.04, 0.04 |

The maps are symmetric by construction, so a seat's score reflects the turn
order and the AI. The samples are still small (a two-empire map's seat score
moves by 0.06 per match), and most seats stay within the noise of an even
share — except **The Circle of Gates' second seat**: 0.06 now and 0.17 before
(18 matches, about 2 wins), and the first empire knocked out in 5 of 10
matches with a knock-out. Proposed next step (not done): watch that seat's
first two weeks (its town's guarded terrace and the rotating turn order) before
changing the map.

### Campaign simulation (`npm run campaign-sim -- --runs 20`)

The computer played each campaign 20 times (700 mission runs, 1.7 min with 2
workers; day cap 56 per mission). Measured, not playtested — the autopilot is
quicker and more literal than a person, so the days are short:

| Campaign | Journeys won in one go | Missions with every run won | Runs not won | Verdicts |
|---|---|---|---|---|
| The Winter Oath | 20 / 20 | 7 / 7 | 0 | 5 ok, 2 too easy (M04, M05) |
| The Twelfth Hour | 18 / 20 | 6 / 7 | 2 (M05: Seshet defeated after taking Per-Wadjet, day 8) | 3 ok, 4 too easy (M01–M04) |
| The Lantern Road | 20 / 20 | 7 / 7 | 0 | 4 ok, 3 too easy (M01, M03, M04) |
| The Silver Branch | 20 / 20 | 7 / 7 | 0 | 2 ok, 5 too easy (M01–M05) |
| The New Fire | 20 / 20 | 7 / 7 | 0 | 4 ok, 3 too easy (M01, M04, M05) |

* **No mission is nearly unwinnable, and no fight or gate blocks progress**:
  every objective was reached, so no mission was changed.
* **Too easy** (every run won and the costliest battle took a median of less
  than 10% of the army): 17 of 35, mostly the first four missions of each
  campaign (introductions) and the M05 sieges of Hvitstrand-like towns that
  the computer rival often leaves lightly held. The toughest fights are the
  M06 gate guards and the M07 final courts (13–25% of the army lost).
* The only losses: The Twelfth Hour M05, 2 of 20 runs — the hero was defeated
  after taking Per-Wadjet (the rival's counterattack).
* Proposed, not done: stronger guards for the "too easy" missions, if the
  owner's own play agrees.

### Verification of 0.14.0 (commands actually run)

| Command (cloud copy of the project) | Result |
|---|---|
| `npm run check` (boundaries, type-check, unit tests) | passed: **490 / 490** tests in 57 files (new: army make-up and morale; the gods' gifts — content for all 60 gods, offers at 10 and 15 from two committed gods, exclusive and required, effects applied, none without the expanded rules, the AI's choice; quick battles — the preview equals the committed result, a defeat foreseen, refused without a battle or against another human seat; finished sieges — aiming, turret targets, combining for a human and an AI defender, the AI's aim and an automatic siege to the end; the late-game AI — hand-offs from week three only, the miracle kept mid-week and spent at the week's end, lost towns recorded and counterattacked at closer odds; the rival summary — in view or yours only, captures public, one line per empire, heroes coming into view; editor tools — symmetry exact when turned, generated maps valid and playable). The Raiders' boldness test now checks the mechanism with a local bold catalog, the Offering test 1 Favor per 125 Gold. |
| `npm run campaign-sim -- --runs 20 --jobs 2` (twice: before and after the balance changes; identical) | 700 mission runs in 1.7 min; table above |
| `npm run balance -- random1v1 --matches 24` (+ `--focus greek,norse`, `--focus mesoamerican,celtic`, `--focus mesoamerican`) | above; 29.9 + 15.3 + 13.5 + 8.8 min |
| `npm run balance -- maps --matches 4 --max-day 45`; `-- tiers`; `-- armies starts`; a 30-match `random1v1 --matches 1` smoke | above (diagnosis only for the duels) |
| `npx playwright test` (all 153 UI tests, release build, one worker) | **151 / 153** passed (2.3 h). The two failures: `services.spec.ts` offering — it expected 8 Favor for 20 Feathered Serpents, the new Offering rate gives 9 (expectation updated to 1 Favor per 125 Gold, then **passed**); `sprites2d.spec.ts` playback (instant and normal auto-battles identical) — the 5-minute limit ran out at the end of the long run in the emulator; run alone it **passed** in about a minute, nothing changed |
| `tests/e2e/round0108.spec.ts` (new, 6 tests) | 6 / 6 (also run on their own): the quick-battle panel's losses equal the headless preview and the result screen's lines, no battlefield opened; level 10 offers two gifts with the god's portrait and a stat icon, skills locked until one is taken, the hero screen lists it; the Catapult aimed at the north tower; the defender combines eight stacks into two (18 Hoplites, 13 Peltasts) and the battle starts; "While you waited" reports the rival taking your Gold Mine and closes; the editor's turned brush paints both copies, Generate opens a valid Highlands map with 2 towns |
| `npm run build`, `npm run desktop:build`, `electron-builder --win nsis --x64 --linux dir --x64` | `Pantheon-Realms-Setup-0.14.0-x64.exe`, 549,154,871 bytes, SHA-256 `b0ee2784005ccd8f9e409a14a6b686a104cac75f5a3b0d471c9b5a9b11a92e25` (unsigned, not run on Windows); the packed app equals the build file for file (3,248 files; only `package.json` rewritten by the packer; nothing from `tools/`, tests or reports) |
| offline packaged smoke (`unshare -n`, loopback only; `PR_SMOKE_EXE=…/linux-unpacked/pantheon-realms xvfb-run -a node tools/desktop-smoke.mjs`) | DESKTOP SMOKE OK with networking off: the map draws (WebGL), 1,629 sprite entries, 550 painted pictures and 662 interface images resolve, saves and records written, 91 sounds, packaged without developer tools |

Not measured here: any of this played by a person — the quick-battle panel on
large sieges (it computes the battle when the panel opens; instant on the
fights measured, longer for big armies), the late-game AI over whole games
beyond the balance runs, the gods' gifts' values, and the "too easy" missions.
Screenshots of the new screens: `test-results/r0108-*.png` (cloud).

**Delivery.** Bundle 28 (`apply_sync.py`, not committed) for the owner's
folder over HEAD `8c96bf6` + bundle 27: 77 files (22 new), every one of the
55 replaced files measured on the device first (`hash-object`: all equal to
the bundle-27 state); the eight documents the owner removed in `8c96bf6` were
not sent again. The 0.14.0 installer was copied to the owner's `installer\`
folder in 27 parts and joined there (SHA-256 checked: `b0ee2784…2e25`; the
parts removed).

## The owner's twelve requests of 2026-10-07; app 0.13.6

The owner's list, item by item (values are proposed and unplaytested unless a
measurement is quoted):

1. **Choose a Scenario.** Twin Harbors is now a card like the six skirmish
   maps (its painting without the frame, "2 empires · tagline"), in one list
   without the "Skirmish maps" heading. Every detail panel has the Twin Harbors
   layout: a small picture (12.8 × 7.2 rem) beside the tagline and summary, then
   the sub-sections **Highlights** and **The map** (empires, size, victory,
   climate, treasury, map) — the content the new maps had, now also written for
   Twin Harbors (`tagline`, `highlights` on the scenario; its size shows "Small
   (595 hexes)"). The drawn layout preview and the closing "Every empire's
   lands…" sentence are gone; Twin Harbors' "Known limits" paragraph too. A
   selected Twin Harbors shows its painting behind the list, like the maps.
2. **Creature view:** no "Final sprites" label any more; stand-ins keep their
   "Placeholder sprites" label (a placeholder is never shown as final).
3. **Borders between lands vary** (`groundEdges.ts`, presentation only, stable
   per map): the painted transition shapes reach 0.7–1.9 × as far as painted,
   swelling and narrowing along a border (smooth noise of the map seed); half of
   them are mirrored along their edge; on about 30 % of land borders the lower
   ground reaches back into the higher one (never into mountains or water); and
   at about three quarters of the corners where one hex pokes between two of
   another ground, that ground reaches round the corner with a soft rounded
   patch (radius 0.18–0.42 hex), so a border bends instead of stepping hex by
   hex. Shores (and their surf line) are unchanged. Tested: one piece per border
   as before, shores identical, depths in range, ~10–40 % reversed, both
   mirrorings, deterministic per salt, corners and edges of a piece never move.
4. **Better-aligned roads.**
   * Random maps (`pr-skirmishgen-0.7`): roads are routed over (hex, heading)
     with a binary heap; a step along a road already laid costs 40 % (later
     roads join the trunk instead of running beside it), a 60° turn costs 2 and
     a 120° turn 6 (long straight runs, fewer zig-zags); still in the first
     empire's frame and copied by the symmetry. Measured on 70 maps (9 types,
     2–6 empires, seeds 3 and 77; a temporary test, removed): road tiles
     12,827 → 11,061, side-by-side road tiles 1,742 → 257, bends of 60° 2,251 →
     955, sharp bends 35 → 24, dead ends that reach no site 0 → 0; generation
     13.9 s → 15.8 s for the 70 maps. Every fairness check still passes.
   * Drawing (`roads.ts` `smoothRoadTypes`): one road material per stretch
     between junctions (the one most of its hexes ask for), a junction takes
     the material of most meeting stretches; boardwalks stay hex by hex over
     marsh. Before, every rough hex switched a dirt road to cobbles for one
     tile (a patchwork with seams). Computed over every road of the map, so the
     fog never changes a tile.
5. **No screen code** ("S03", "S10", …) in any header.
6. **Unowned towns** (towns without an owner or a hero at the start):
   * Rules: `MissionDefinition.neutralTowns`; the mission factory creates them
     with no owner. Walking into an unguarded one takes it; a garrisoned one is
     a siege against neutral troops (already supported by the rules); then it is
     the taker's town in every way. The AI already valued unowned towns; in
     three AI-only 3-empire games with two unowned towns each (40 days; a
     temporary test, removed) every unowned town was taken by an empire.
   * Random maps: Map options → **Unowned towns: None / Same pantheon / Other
     pantheon / Both** (one or two per empire, in its outer lands, a road to
     each, a neutral garrison of the town's own tier 2 and 3 creatures worth
     3,600 Gold × the guard setting; the civic hall and first dwelling only, no
     Tavern or walls; half the first dwelling's recruits; the skirmish
     covenants). New check SKM-8: every empire's unowned town is the same
     travel cost away.
   * Authored skirmish maps: each of the six now has one unowned-town spot per
     empire (`MapBuilder.unownedTown`: open ground already there, no terrain
     changed); the seat setup offers **None / Same pantheon / Other pantheon**
     (default None). With None the map compiles exactly as before (checked for
     all six: same map, same mission; the road to the spot is dropped).
   * Map editor: the Town tool and the town's panel have **Unowned**, with the
     town's pantheon (the nearest empire's, another, or a named one).
7. **Random-map seats:** no patron picker; each human seat shows its patron
   ("Patron: Zeus") — every pantheon has one. A picker returns only if a
   pantheon ever gets a second patron.
8. **Miracles belong to the pantheon.** The eight shared miracles now carry each
   pantheon's own name (`InterventionDefinition.names`; e.g. Tithe of the
   Faithful is Tribute of Hera, Riches of Njord, Hathor's Prosperity, Gift of
   Amaterasu, Arawn's Hoard, Treasure of Coatlicue); same effect, cost and art.
   Each pantheon's own ninth miracle (Thunderbolt of Zeus, Ride of the
   Valkyries, …) is offered only to it, as before. `interventionsFor`,
   `interventionOf` and the quote use the player's names; the map, battle and
   miracle cards show them. Tested: every pantheon's nine miracles are its own
   and no name is shared between pantheons.
9. **Map HUD:** the hero panel and End Day sit 24 px lower (the turn banner
   too).
10. **Hero hiring: one hero per empire per week** (`heroHiredThisWeek`; the
    rules refuse a second hire with "One hero per week"; the AI proposes one
    hire a week). The Tavern lists the price and **Hire** on the right of each
    row and says the rule above the list.
11. **Pantheon page:** the weekly rule reads "The gods answer once per week"
    (no "— wait for the next week"); Favor prices are the symbol and the number
    without a tag (miracles and god cards; short of Favor, the number turns
    red).
12. **Map creatures face both ways:** each location guard and each wandering
    band at rest faces left or right by a stable hash of its ID (about half
    each way; walking still turns a band).

### Verification of 0.13.6 (commands actually run)

| Command (cloud copy of the project) | Result |
|---|---|
| `npm run check` (boundaries, type-check, unit tests) | passed: **460 / 460** tests in 50 files (new: weekly hiring; every pantheon's nine miracles its own, names never shared; road materials per stretch; varied borders and rounded corners; creature facing; unowned towns on random maps — fair (SKM-8), valid, unowned and garrisoned, own/other pantheon, taken by siege then built in) |
| temporary measurement tests (removed afterwards) | road quality on 70 random maps before/after (numbers above); AI-only games with unowned towns (every unowned town taken); the six authored maps compiled without unowned towns equal their earlier documents (map and mission) |
| `npx vitest run --config tools/maps/vitest.config.ts tools/maps/build.author.ts` (the checks and JSON of `npm run maps:build`; the Brief 14 layout guides were not redrawn) | the six maps built: validation without errors, exact symmetry, one road into every town (the unowned ones included), the earlier walking distances unchanged |
| `npx playwright test` (all 147 UI tests, release build, one worker) | first run (stopped at test 42 when the container restarted): 41 passed, 1 failed — `brief16` "mixed" expected the old cobbles on every rough hex; rewritten for one material per stretch (a rough stretch cobbled, a lone rough hex dirt, marsh boardwalk) and **passed**; the remaining 106 tests, then: **105 passed**, 1 failed — `skirmishMaps` checked that no detail panel says "Every empire", but The Golden Fords' own summary does; narrowed to the removed sentence, **passed** |
| `tests/e2e/round0107.spec.ts` (new, 5 tests) | 5 / 5: no screen codes; the patron shown without a picker; a random map with both kinds of unowned towns; Frostgate with its unowned towns; the HUD 24 px lower; the Pantheon page (plain Favor, Greek miracle names, the weekly rule's text); map guards facing both ways (between 20 and 80 % each way) |
| `npm run build`, `npm run desktop:build`, `electron-builder --win nsis --x64 --linux dir --x64` | `Pantheon-Realms-Setup-0.13.6-x64.exe`, 549,145,840 bytes, SHA-256 `f673428a969c59ff2eb384b9d939b8f980777237da8bb1692f804d6be2e6f48a` (unsigned, not run on Windows); the packed app equals the build file for file (3,248 files; only `package.json` rewritten by the packer; nothing from `tools/` or test servers) |
| offline packaged smoke (`unshare -n`, loopback only; `PR_SMOKE_EXE=…/linux-unpacked/pantheon-realms xvfb-run -a node tools/desktop-smoke.mjs`) | DESKTOP SMOKE OK with networking off: the map draws (WebGL), 1,629 sprite entries, 550 painted pictures and 662 interface images resolve, saves and records written, 91 sounds, packaged without developer tools |

Not measured here: the borders, roads and unowned towns judged in play by the
owner; balance with one hire a week and with unowned towns (the AI-vs-AI
balance suites were not rerun).

**Delivery.** Bundle 27 (`apply_sync.py`, not committed) wrote 65 files (2
new) into the owner's folder over HEAD `8c96bf6` with 0 problems, every replaced
file checked there first; the eight documents the owner removed in `8c96bf6`
were not sent again. The 0.13.6 installer was copied to the owner's
`installer\` folder in 28 parts and joined there (SHA-256 checked:
`f673428a…f48a`).

## Climate-aware nature scenery and the hero equipment figure; app 0.13.5 (owner deliveries, 2026-10-06)

Owner deliveries: "Pantheon Realms — climate-aware nature expansion" (318
painted stills in `blannder_models\nature-expansion-2026-10-06`, with an
ecology policy and a reference selector), then "replace the hero equipment
screen's body diagram with the second, simpler schematic image"
(`blannder_models\hero-equipment-panel-2026-10-06`). Both folders were only
read.

### The nature scenery

**Delivery in the game.** The 318 PNGs and their 318 JSON sidecars were
copied into `assets-source/sprites/final/` (`cp -n`: no existing file
replaced; SHA-256 equal to the delivery's `CHECKSUMS.sha256` on the owner's
computer and in the cloud copy), `data/nature-policy.json` into
`packages/presentation/src/nature-policy.json`; `npm run sprites:import --
--only sprite.map.decor.nature.` registered **318 `decor` keys
`nature.<climate|water profile>.<role>.0N`**, 0 problems, every runtime file
decoding at its listed size, no other manifest entry changed. The importer now
trims these stills to their painted pixels (alpha above 4/255; the cells carry
a wide transparent margin and a faint fringe) with the anchor kept on the same
picture point (`import_sprites.py --self-test` checks it): 41 % of the frame
area on average.

**The selector** (`packages/presentation/src/nature.ts`) is the delivery's
`tools/nature-selector.mjs` in TypeScript (same hash, same picks): the
delivery's own 3,425 checks pass on the port (`presentation/test/nature.test.ts`),
and a comparison run against the reference module gave identical answers in
about 327,000 cases (land, borders, water, battle obstacles, every climate);
the delivery's `node tools/test-selector.mjs` itself: 3,425 passed.

**On the map** (`planNatureScenery`, drawn by `adventure.ts`; presentation
only — stable hashes of the map seed, the tile and the slot; no game RNG, no
change to the state, the logical map or its hash; tested):

* Climate first, terrain second: `map.biome` picks the family, the hex's
  terrain the role (policy weights), density from the policy × the climate's
  multiplier (desert 0.42, tundra 0.4 … jungle 1.15). Forests hold at most two
  big canopies, a third item is low dressing; plains on a road stay bare;
  items stand toward a border no road crosses, off the hero's spot; map
  locations and town entrances stay clear.
* Every mountain tile carries one of its climate's three mountains (a
  neighbour's variant avoided where possible); the tile stays impassable as
  before.
* Borders between grounds: each border planned once (lower tile first), 30 %
  of them, at most two clumps a tile, none where a road crosses — woodland
  clumps on the forest side, rocky ones on the rough or mountain side, wet
  plants on the marsh side and on the land bank of lakes and rivers; on a sea
  shore salt-marsh plants only on coast and jungle maps (the mangrove), rocky
  clumps elsewhere — never desert papyrus on a beach. The Brief 17 ground masks
  stay underneath.
* Water: `classifyWater` sorts each body into sea, lake or river from its
  shape (the map formats carry no water-body data): never touching the map's
  edge → a lake (a river when long and one ring wide); touching the edge and
  one ring wide → a river; touching the edge, 24+ tiles and two rings wide →
  the sea on coast and fjord maps, elsewhere only when it is also 15 % of the
  map; else unknown (nothing drawn). The sea takes its climate's profile
  (temperate, tropical or frozen), lakes and rivers freshwater. Per tile at most
  one piece by the policy's rates, three hexes apart, a budget per body; boats
  need 12 tiles of water, whales and dolphins 40 and two rings, no lilies on
  rivers or in the cold; the tundra's pack-ice water carries no boats and
  nothing swimming. Bridges, roads into water and locations by the water stay
  clear. In the shipped content the sea occurs on The Three Beacons 1, The
  Winter Oath 1 and 4, the four arc campaigns' fourth missions and random
  archipelagos; the campaigns' water barriers are rivers; Lake Isle has lakes.
* Graphics quality: Medium and Low leave out the low dressing (groundcover,
  shrubs, the three kinds of border clumps), Low also every other tree and
  rock and the boats and wildlife; mountains always stay. Fog as before: a
  piece shows once its tile is explored. Only the climate's own pictures load,
  and a picture is shown only after the engine has sent it to the GPU (see
  below). The plan is remembered for the last map, so the map built again after
  a battle does not plan again.

**In battle** (`battle.ts`, `battleObstacleId`): each obstacle cell the rules
placed shows the map climate's rock, deadwood or tree (the policy's weights
for the battlefield), drawn about 0.9 hex across; the generic columns and
standing stones stay; sieges unchanged. A missing still falls back to the
neutral boulder or rock, then a drawn grey stone — never the first picture in
the list. The board is rebuilt when the climate changes. Not added: cosmetic
dressing and mountains beyond the board, and the optional bobbing of boats.

**Frame rate with the scenery** (`tests/perf/frames.spec.ts`, each frame waited
for, 1280 × 720): main-thread time per frame while panning, zooming and walking
0.7–1.1 ms (0.13.4: 0.5–0.9), huge map panning 0.76 ms; data sent to the GPU
while panning 11–31 KB a frame (unchanged); two draw calls more. Emulated GPU
time: map 335–409 ms, huge map 556 ms; with the scenery hidden (a temporary
switch, removed) 385 and 490 ms — the scenery adds about a tenth on the map and
a seventh on a huge map. Those scenery-hidden numbers are above the 285–325 ms
recorded for 0.13.4, which were measured before Brief 17's painted ground
transitions were switched on; that difference was not broken down further.
The emulator's run-to-run spread is about ±30 ms. Not added: culling of
off-screen scenery — it sits in the objects' render group, costs nothing on the
main thread while still, and Pixi's culling would rebuild the group's draw list
during every pan.

A picture is now handed to a sprite only once the engine has sent it to the GPU
(`textures.ts` `markUploaded`; at most 1.5 s of waiting): before, a map's
hundred new scenery pictures were all sent in its first frames. Full test game
(`fullgame.spec.ts`, run `nature135b`, the same game as for 0.13.4):

| What was on screen | Frames | Main-thread time per frame: mean / longest | Longest other main-thread work |
|---|---|---|---|
| The map, the player's turn | 1,052 | 1.10 / 59 ms | Continue on the battle result 67 ms (the map is built again; 96 ms before the plan was remembered, 61 ms in 0.13.4); clicking a tile ≤ 29 ms |
| The map, the computer's turn | 85 | 1.32 / 7.1 ms | the computer's steps ≤ 37 ms |
| The battle | 408 | 1.18 / 74 ms | nothing over 10 ms |

Frames over 16 ms of main-thread work: four, all where a view opens — the map
(37 ms), the map after the battle (32 and 59 ms), the battle's first second
(74 ms). The laptop's frame rate stays a target until measured there.

Review screenshots (`tests/e2e/nature.spec.ts`, test-results/nature-*): every
climate on an archipelago with a close-up where most grounds meet; water: a
temperate lake, moor ponds, a jungle sea, a fjord sea, an autumn river; the
same map reloaded (identical), Medium and Low, fog; battlefields — all six in
desert, tundra and jungle, one each in the other seven climates.

### The hero equipment figure

`hero-equipment-schematic-v2.png` (1122 × 1402, SHA-256 `537a129a…`; the
simpler schematic, not the bronze figure) was copied to
`assets-runtime/ui/` and `assets-source/ui/` on both sides and is used as
delivered (`HERO_EQUIPMENT_SCHEMATIC = './ui/hero-equipment-schematic-v2.png'`
in `ui/src/assets/manifest.ts`). In `Hero.tsx` an `<img>` replaces the drawn
SVG body inside `.h3-doll__stage`: empty alt text, `aria-hidden`, not
draggable, `pointer-events: none`, `object-fit: cover`, the 4:5 stage kept.
The fifteen slots and the spellbook stay separate buttons over it at the
handoff's centres (the neck at 20 % instead of 19 %, clear of the head box at
the smallest stage); the boxes are 13 % of the stage wide (2.3–3.5 rem) with
an opaque navy fill, a gold border, a visible keyboard focus ring and the
hover, picked and drop-target states as before. Drag and drop, tooltips, set
badges, the inventory, the mount slot and the spellbook are unchanged. The
narrow layout (windows under 1100 px) was squeezing the equipment and
inventory plates into strips; the column now scrolls with each plate whole.

Checked (`tests/e2e/heroschematic.spec.ts`): at 1280 × 720, 1366 × 768,
1600 × 900, 1920 × 1080 and 1024 × 768, with an empty and a fully equipped
hero — the picture is the delivered file, decorative and full-stage at 4:5;
all sixteen controls lie inside the stage, none overlaps another, each takes
the click at its own centre; equipping by click, unequipping by double-click,
dragging a ring backpack → left → right → backpack, a drop on the figure
ignored, equipping by keyboard (Enter) with the focus ring shown, the
spellbook opening; and the existing `heroscreen.spec.ts`.

### Verification of 0.13.5 (commands actually run)

| Command (cloud copy of the project) | Result |
|---|---|
| `node tools/test-selector.mjs` (the delivery's own checks, run from a copy of the delivery) | 3,425 checks passed |
| a temporary comparison test: `makeNatureSelector` (TypeScript) against the delivery's `nature-selector.mjs` | identical in about 327,000 cases; removed afterwards |
| `npm run sprites:import -- --only sprite.map.decor.nature.` | 318 imported, 0 problems; 318 `decor` keys equal to the policy's IDs, every file decodes at its size, no other manifest entry changed |
| `python3 tools/assets/sprites/import_sprites.py --self-test` | passed (incl. the new trim case: the visible block keeps its place relative to the anchor within a pixel) |
| `npm run check` (boundaries, type-check, unit tests) | passed: **448 / 448** tests in 50 files (new: `presentation/test/nature.test.ts`, 17 tests — the delivery's checks, water kinds, every climate's own art, determinism and an untouched map, freshwater and ice rules, road/site/town clearances, qualities, missing art, neighbour variety, battle obstacles, the remembered plan) |
| `tests/perf/frames.spec.ts` (`PERF_GPU=1`; with a temporary switch hiding scenery kinds, removed) and `tests/perf/fullgame.spec.ts` (`PERF_GPU=1 PERF_DPR=0.5 PERF_DAYS=7`, runs `nature135`, `nature135b`) | the tables above |
| `npx playwright test` (all 141 UI tests, release build, run alone) | **139 / 141**. The two failures, both from the new picture queue: `sprites2d.spec.ts` playback (an animation strip waited behind a hundred scenery pictures — strips, effects and icons now go first; then **passed**) and `heroes.spec.ts` walk (the walk took 17 s here, the emulator's frames being slower with the scenery, against a 15 s wait; the wait raised to 45 s, every walking check unchanged; then **passed**) |
| `npx playwright test` on the final build: `heroes.spec.ts`, `sprites2d.spec.ts`, then `battles`, `bigMoments`, `brief17`, `framerate`, `nature` | heroes 5 / 6 (the walk; rerun alone with the longer wait: passed), sprites2d 4 / 4; then **21 passed, 0 failed** — the run was stopped there to deliver (the nature battlefields, rounds 3, 10, 11, 12 and the siege were not rerun after the queue order change; they passed in the full run just before it) |
| `tests/e2e/heroschematic.spec.ts`, `tests/e2e/heroscreen.spec.ts` | 3 / 3 and 3 / 3 (also within the full run) |
| `npm run build`, `npm run desktop:build`, `electron-builder --win nsis --x64 --linux dir --x64` | `Pantheon-Realms-Setup-0.13.5-x64.exe`, 549,142,187 bytes, SHA-256 `fa841bbf8d16dfc2add329b585b775a938ab846ceb9d1b0926c29350c99c19df` (unsigned, not run on Windows); the packed app equals the build file for file (3,247 files incl. the 318 scenery stills and the equipment figure; only `package.json` rewritten by the packer; nothing from `tools/` or test servers) |
| packaged payload check, offline packaged smoke (`unshare -n`) | OK with networking off: the map draws (WebGL), 1,629 sprite entries (318 more), 550 painted pictures and 662 interface images resolve, saves and records written, sounds decode, packaged without developer tools |

Not measured here: the frame rate on the owner's laptop; the scenery, the battle obstacles and the equipment figure judged in play by the owner.

**Delivery.** The nature sources (318 PNGs and 318 sidecars) and the
equipment figure were copied into the owner's folder from the delivery folders
(SHA-256 checked there); bundle 26 (`apply_sync.py`, not committed) then wrote
344 files (323 new) with 0 problems, the old versions checked there first. The
0.13.5 installer was copied to the owner's `installer\` folder in 27 parts and
joined there (SHA-256 checked: `fa841bbf…19df`).

## The frame rate on the map and in battle; app 0.13.4 (owner request, 2026-10-06)

Owner request: "it feels like the frame-rate of the map and battle are really
bad — do some analysis about the framerate and consider optimizations to
ensure it is above 30 in the high graphic settings without dropping below for
a full test-game". Where it is worst: "everywhere, always"; the computer: a
laptop with built-in graphics.

**What can be measured here.** This container has no GPU: WebGL runs on
SwiftShader (the GPU emulated on 2 processor cores). Its frame rates say
nothing about a laptop's graphics chip, and its compositor misbehaves under
load (measured: once a few frames fall behind, Chrome's compositor thread
spins at 90–100 % of a core and starves the emulator; the frame rate of the
map or a battle then collapses whatever is drawn). What *is* measured here and
carries over: the main-thread (processor) time each frame costs, how much
data each frame sends to the GPU, the long tasks of game logic and interface,
and the emulated GPU time per frame with each frame waited for (`?gputime`, a
one-pixel read-back), compared between layers and resolutions. **The frame
rate on the owner's laptop is a target until measured there** — Settings →
Display → Frame rate (new, below) shows it.

### What made it slow (measured before the changes)

Benchmark `tests/perf/frames.spec.ts` (new), High, 1280 × 720, Twin Harbors
fully explored, a huge random map with six empires, a battle of two full
armies:

| Scenario | Data sent to the GPU per frame | Main thread (CPU profile) |
|---|---|---|
| Map, idle | **2,149 KB** (vertices and indices, every frame) | 96 % in `bufferSubData` |
| Map, panning | 2,150 KB | 97 % in `bufferSubData` |
| Huge map, idle | 343 KB; 7,338 display objects | — |
| Battle, idle | 96 KB; 45 draw calls | 95 % in `bufferSubData` |
| Battle, auto-combat | — | 90 % in `texImage2D`; the slowest frame **10.7 s** |

The causes, found in the code:

* **The whole map was one render group** (PixiJS 8 re-sends a group's entire
  vertex buffer when anything in it changes), and *something always changed*:
  the selected hero's ring was cleared and redrawn every frame (which also
  rebuilds the group's draw list), the idle figures animate, and moving the
  camera moved every vertex. Each frame re-packed and re-sent ~80,000
  vertices — 60,000 of them the **soft shadows** (four tessellated ellipses
  under every tree, rock, site and figure). The battle had the same shape
  (the active stack's ring redrawn every frame).
* **Pictures were decoded and sent to the GPU the first time a frame showed
  them** — a creature's first attack, a spell's first strip — on the main
  thread, inside that frame.
* The **fog** was redrawn after every command (keyed by the state's revision),
  with the grid, the roads (all road tiles destroyed and created again) and a
  2048-pixel blurred fog picture re-sent to the GPU.
* The **movement range** (`reachableTiles`) sorted its whole frontier for every
  tile it settled (quadratic), after every command; the **computer players**
  ran one route search per destination they weighed (dozens per decision) —
  huge map: median 6.5 ms, p95 30 ms, the longest **65 ms** per step, between
  the map's frames.
* The **minimap frame** was polled into the map screen's own state: panning
  re-rendered the whole map screen every 150 ms. Every battle-screen update
  redrew all count badges (a new text picture each). High had **no frame cap**
  (a 120/144 Hz laptop panel draws 2–2.4× the frames, and the chip heats and
  slows).

### What changed

* **Render groups** (`adventure.ts`, `battle.ts`): the camera is one group
  transform; the ground (terrain, borders, roads, grid), the reach, the route,
  the walk's trail, the objects, the fog and the effects each sit in their own
  group, so a change re-sends only its own layer. The black around the map and
  the plain ground around the battlefield are the renderer's background
  colour (one full-screen fill less). The selection and active-stack rings
  are drawn once and pulse by scale; the hover outline is drawn once and
  moved; a walk's trail is drawn once per walk and hidden step by step;
  battle badges are redrawn only when the count or its colour changes.
* **Shadows** are one shared soft-disc picture (four vertices each instead of
  ~130), drawn the same (`staticSprites.ts`).
* **Pictures** (`textures.ts`): decoded off the main thread
  (`createImageBitmap`, the old image path as fallback) and sent to the GPU by
  the engine a few per frame within 4 ms, before a frame needs them; the
  ground paintings (drawn 5–20 times smaller than their pixels) with mipmaps.
* **Fog** redrawn only when the explored or visible tiles actually change (the
  grid, roads and decoration only when the explored ones do); the soft-fog
  picture at most 1,536 pixels across.
* **Rules** (`world.ts`, results unchanged — tests compare them tile by tile
  with the old searches): the movement range from a heap; `withSharedPaths`
  lets the computer player read one route tree per hero per decision.
* **Interface**: the minimap holds its own frame state (panning redraws only
  the minimap's frame).
* **High: 60 frames per second at most**, with a cap that averages 60 on a
  144 Hz panel (`frameDue`). **Adaptive resolution** (Settings → Display, on
  by default): while frames run slower than about 34 per second for two
  seconds of drawing — not while game logic held the thread — the view draws
  85 % of the pixels per step, down to 60 %; back up when frames are at the
  cap again (a step that proves too slow is not retried for a minute;
  `adaptResolutionStep`). **Frame rate** readout (Settings → Display, off by
  default): frames per second, the slowest recent frame, frames slower than
  1/30 s since the view opened, and the resolution when lowered.

### Measured after the changes

Benchmark `tests/perf/frames.spec.ts`, same scenes, High, 1280 × 720:

| Scenario | Data sent to the GPU per frame (before → after) | Draw calls | Frame rate in the emulator, idle (before → after) |
|---|---|---|---|
| Map, idle | 2,149 KB → **8 KB** | 6 → 7 | 2.2–5.4 → **60** (the cap) |
| Huge map, idle | 343 KB → **4 KB** | 10–12 → 11 | 13.6 → **59.5** |
| Battle, idle | 96 KB → **6 KB** | 45 → **27** | 14 → **52** |
| Battle, auto-combat | slowest frame 10.7 s → 0.58 s (emulator) | 44 → 26 | — |

Main-thread time per frame, each frame waited for (`?gputime`, so the time is
the processor's alone): map idle, panning, zooming, a hero walking **0.5–0.9
ms**; huge map panning 0.85 ms; battle idle 0.74 ms, auto-combat **1.9 ms**.
Before, the same frames re-packed and re-sent 2.1 MB each (the CPU profile:
96–97 % of the main thread in `bufferSubData`).

Emulated GPU time per frame (SwiftShader, serialized, 1280 × 720): map
285–325 ms, battle 174–238 ms in every scenario — panning, zooming and walking
add no GPU work any more. It follows the pixels drawn: 75 % resolution → 62 %
of the time, 50 % → 37 % (so adaptive resolution helps a slow graphics chip
almost in proportion). Where it goes on the map (layers hidden one at a time):
the ground ~49 %, the soft-fog picture ~28 %, the reach overlay ~19 % (the
benchmark hero has 3,000 movement points: the whole map), the objects ~14 %,
the road tiles ~6 %. A real integrated GPU draws such a frame in a few
milliseconds; how many on the owner's laptop is not known here.

The computer player's decision steps (Node, AI-against-AI step timer; the same
seeds and days, the same decisions — identical step counts):

| Map | Before (median / p95 / longest) | After |
|---|---|---|
| Twin Harbors, 19 days (171 steps) | 4.5 / 16.6 / **45.7 ms** | 4.9 / 12.8 / **19.7 ms** |
| Huge random map, six empires, 16 days (742 steps) | 6.0 / 27.5 / **52.0 ms** | 5.4 / 11.8 / **19.9 ms** |

Before, 4.3 of 6.3 s went into route searches, one per destination weighed;
now one per hero and decision. Tests compare every route of every hero to every
tile of Twin Harbors (fogged and explored) and of a huge map, alone and shared:
identical; the movement range likewise, entry for entry and in order.

A full test game (`tests/perf/fullgame.spec.ts`, new): Twin Harbors, seven
days, played through the screens — the hero marches east along the road, the
player pans and zooms each day, ends the day and watches the rival's turn; on
day 2 the gold mine's guard is fought (auto-combat, normal speed). Each frame
waited for (`?gputime`), drawn at half resolution so the emulator keeps up;
long animation frames attributed to their scripts. The release build of this
delivery (run `final2`, 4.9 minutes of play):

| What was on screen | Frames | Main-thread time per frame: mean / longest | Longest other main-thread work |
|---|---|---|---|
| The map, the player's turn | 1,074 | 0.89 / 43.6 ms | **Continue** on the battle result 61 ms (the map is built again) and a picture's load handler 33 ms right after it; clicking a tile ≤ 24 ms; timers ≤ 22 ms |
| The map, the computer's turn | 70 | 0.91 / 4.9 ms | the computer's steps (timers) ≤ 27 ms |
| The battle | 430 | 0.97 / 38 ms | nothing over 8 ms |

Frames with more than 16 ms of main-thread work in the whole game: **three**,
each where a view opens — the battle's first second (38 ms) and the map's
first two seconds after the battle (43.5 and 43.6 ms: the map is built again
and its pictures go back to the GPU). Three runs of the same game gave 29.9,
71.9 and 43.6 ms as the longest frame, always at such a change of view; the
timed log places the 57–61 ms click on the result's Continue. Outside those
moments nothing on the main thread came near 1/30 s. Still open: the map is
rebuilt after every battle (keeping it alive through the battle would remove
that hitch); the emulator's own frame rate (4–14 fps here) says nothing about
the laptop.

Start-up is not part of these numbers. Under the benchmark's uncapped
settings (`--disable-frame-rate-limit`) the first WebGL context of a run waited
12–455 s for the emulated GPU process (CPU profile: `getContext`); with the
normal test settings (vsync) the same import and load measured one 0.6 s and
one 1.0 s task (creating the WebGL context, building the map) in the emulator.

## GPT-6 Brief 17 delivered: the final visuals in the game (owner delivery, 2026-10-06)

Owner delivery `blannder_models\brief17-final-visuals-2026-10-06` (read
only): 70 PNGs and 20 animation sidecars, checked against its
`ASSET_MANIFEST.json` (SHA-256 of all 70 equal on the owner's computer and in
the cloud copy), copied into the game's `assets-source` (`cp -n`: no existing
file replaced; only PNGs and the hero sidecars — no masters, prompts,
references or QA composites). The owner widened Part C from six town
backgrounds to **24**: four per pantheon, one per town-hall level.

| Part | Delivered | In the game |
|---|---|---|
| A, B | six ground-transition masks (meadow, woodland, rocky, boggy, scree, shore), 1536 × 768, and the shore foam | `npm run ground:import`: 6 mask sheets, foam yes, **0 problems** → `sprites/final/ground/edges.json` (traced outlines) and `foam.webp`. The map now draws **painted transitions** (`__prGround().edges = 'painted'`) instead of the softened hex edges |
| C | 24 town backgrounds `town.<pantheon>.background.l1–l4`, **1448 × 1086** (4:3; below the asked 2048 × 1536, nothing enlarged) | `npm run art:import` (background pattern extended to `.l1`–`.l4`): 24 added, no other entry changed. **Code**: `townBackground()` (`ui/src/assets/manifest.ts`) picks the stage of the town hall (`civic_hall`): none/0 → stage 1, above 4 → stage 4, a missing stage → stage 1, then the old single painting. Buildings stay overlays at their places on every stage |
| D | markers `icon.marker.hero`, `icon.marker.enemy-hero`, `icon.marker.encounter` | `npm run icons:import -- --new` (96 px). Already wired: the tile panel over your / another empire's hero; a failed objective in the Journal |
| E | the neutral map hero: idle (4), walk (6), prepare (6), cast (6) × E, NE, N, S, SE (W, NW, SW mirrored), 320 px frames, anchor 0.88, 150 px per hex | `npm run sprites:import -- --only sprite.hero.neutral.`: 20 strips, 0 problems; stored at 192 px frames, 90 px per hex (the same scale, as the pantheon heroes are stored), fps 3/8/6/6, idle and walk loop, prepare and cast once. Shown for a hero without a pantheon (none in the current content; checked with a test fixture). The existing readiness beat and cast playback are unchanged (presentation only) |
| F | 16 story portraits (Cathal, Sadb, Nebet, Pawah, Ione, Thaleia, Genzo, Shiro, Chimal, Xoco, Eydis, Jökul, Skeggi, Svanhild, the Troll-wife, the Herald) | `icons:import -- --new` (256 px WebP). **Code**: `SpeakerPortrait` shows the delivered square portrait in the dialogue box and the Journal's dialogue lists (the painted busts still stand beside the box; on a small window, where the bust has no room beside the box, the box shows the square portrait instead of the bust; the setup screen's campaign cards keep their busts) |

Review notes (measured from the files, not judged in play):

* **The neutral hero is drawn about 26 % taller than the six pantheon heroes**
  at the declared 150 px per hex (idle E: 1.62 hex widths tall against
  1.28–1.29). Kept as delivered; a sidecar value of about 189 px per hex would
  match them (re-import with `sprites:import -- --only sprite.hero.neutral.`).
* Its walk N and NE strips shift sideways between two frames (about a tenth of
  a hex) — the small frame-to-frame changes the handoff names.
* Town backgrounds are the delivery's native 1448 × 1086, as disclosed.

Review screenshots (`tests/e2e/brief17art.spec.ts`, test-results/b17a-*): all
24 town stages with buildings of mixed levels (stage 1 with every building
complete, stage 4 with every building at its first level), the ground of all
ten climates with a close-up of a coast, both hero markers, the failed
objective, the Journal story of ten missions (all 16 portraits) and the
Troll-wife's scene in the dialogue box, the neutral hero on the map; and a
frame sheet of its four actions at map scale with the ground line.

### Verification of 0.13.4 (commands actually run, both parts)

| Command (cloud copy of the project) | Result |
|---|---|
| `npm run check` (boundaries, type-check, unit tests) | passed: **431 / 431** tests in 49 files (new: `rules/test/reach.test.ts` — movement range and shared routes equal to the old searches tile by tile; `presentation/test/graphics.test.ts` — frame cap and adaptive resolution; `ui/test/brief17.test.ts`; town-stage cases in `ui/test/townArt.test.ts`) |
| `npx playwright test --config playwright.perf.config.ts tests/perf/frames.spec.ts` (`PERF_GPU=1`, `PERF_ONLY`, `PERF_DPR`), before and after each change | the frame tables above |
| `PR_NO_MINIFY=1 npm run build` + `tests/perf/profile.spec.ts` (main-thread CPU profiles; release build rebuilt afterwards) | the "before" profiles above (`bufferSubData`, `texImage2D`) |
| `PERF_LABEL=final2 PERF_GPU=1 PERF_DPR=0.5 PERF_DAYS=7 npx playwright test --config playwright.perf.config.ts tests/perf/fullgame.spec.ts` (release build; two more runs `dpr05-sync`, `final`) | the full-game table above |
| AI step timer (a temporary `tools/balance` script, Node; removed before delivery) | the computer-player table above |
| `python3 tools/assets/import_story_art.py --self-test` | 19 / 19 (the `.l1`–`.l4` stages; `.l0`, `.l5` refused) |
| `npm run ground:import`, `npm run art:import`, `npm run icons:import -- --new`, `npm run sprites:import -- --only sprite.hero.neutral.` | 0 problems each; the manifests' other entries unchanged |
| `npx playwright test` (all 134 UI tests, release build, run alone) | **133 / 134**; the one failure was `storyArt.spec.ts` (small window) still expecting the bust inside the dialogue box, which now shows the delivered square portrait (Brief 17) — the test was updated and `storyArt.spec.ts` then passed **3 / 3**. Includes `brief17art.spec.ts` (towns, ground of ten climates, markers, portraits, neutral hero), `brief17.spec.ts` and `framerate.spec.ts` (Settings toggles, the readout) |
| `npm run build`, `npm run desktop:build`, `electron-builder --win nsis --x64 --linux dir --x64` | `Pantheon-Realms-Setup-0.13.4-x64.exe`, 546,666,105 bytes, SHA-256 `cd4e3538bce5b2c2587a33b9f215bb4e51557b8331d90463c4cd37db105fa5b5` (unsigned, not run on Windows); the packed app equals the build file for file (2,928 files; only `package.json` rewritten by the packer; nothing from `tools/` or test servers) |
| packaged payload check, offline packaged smoke (`unshare -n`, `PR_SMOKE_EXE=…/linux-unpacked/pantheon-realms xvfb-run -a node tools/desktop-smoke.mjs`) | OK with networking off: the map draws (WebGL), 1,311 sprite entries, 550 painted pictures and 662 interface images resolve, saves and records written, sounds decode, packaged without developer tools |

Not measured here: the frame rate on the owner's laptop (Settings → Display → Frame rate shows it); the delivered art judged in play by the owner.

**Delivery.** The Brief 17 sources (70 PNGs and the 20 hero sidecars) were
copied into the owner's folder from the delivery folder (SHA-256 checked
there); bundle 25 (`apply_sync.py`, not committed) then wrote 111 files (73
new) with 0 problems, the old versions measured there first. The 0.13.4
installer was copied to the owner's `installer\` folder in 27 parts and joined
there (SHA-256 checked: `cd4e3538…a5b5`).

## Brief 17 (the final visuals), delivered art shown in battle, a steadier AI, all five road types; app 0.13.3 (owner requests, 2026-10-06)

Owner requests: "give me the full visuals brief for GPT 6 — include everything
so this will be the last time we are using GPT 6 for content"; then: ground
transitions, town backgrounds, the leftover stand-ins, the delivered miracle
and status icons that no screen showed, "the computer leaves its towns empty",
"the computer misjudges one big creature"; then the owner's road
deliveries (Brief 16): the dirt track for review, then — approved — the other
four road types.

### GPT-6 Brief 17: the final visuals

`assets-source/art/briefs/GPT6_BRIEF_17_FINAL_VISUALS.md` (project doc
`gpt6-brief-17-final-visuals.md`; copied to the owner's folder ahead of this
delivery with its guides). From an audit of every manifest, the icon inventory
and the screens: **A** ground transitions — six black-and-white mask sheets
(meadow, woodland, rocky, boggy, scree, shore; one column per hex edge, three
variants), **B** the shore foam, **C** the six town backgrounds repainted
sharper (was Brief 13 Part A), **D** the three markers still cut from the
concept pack (`icon.marker.hero`, `icon.marker.enemy-hero`,
`icon.marker.encounter`), **E** the neutral map hero (20 strips), **F** 16
story-character portraits; §8 lists what is final. The guides come from the
game's hex geometry (`npm run art:ground-guides`); every part enters by an
existing import command (ASSET_PIPELINE.md §16). Nothing of Brief 17 is
painted yet.

**Game side, ready for the delivery.** `npm run ground:import`
(`tools/assets/ground/import_ground.py`) checks each mask against the guide,
clips it to its hex and traces it at three grey levels into outlines
(`assets-runtime/sprites/final/ground/edges.json`) and writes the foam atlas;
nothing is written while a sheet has a problem unless `--keep-going`. The map
(`groundEdges.ts`, `paintGroundEdges` in `adventure.ts`) lets the higher ground
reach into the lower one's hex — water < marsh < plains < rough < forest <
mountain, any land into water as a shore — in its character's shape, filled
with the reaching ground's own painting (opacities 0.35, 0.5, 1: a soft rim and
a solid core), one of three variants per hex and edge, and lays the surf over
the water hex in the matching cell. Only when all six sheets are imported;
until then the softened hex edges of 0.13.2 stay. Checked with synthetic masks
made from the guides (imported into the runtime, drawn on archipelago and
continental random maps: shorelines with foam, rocky and woodland borders),
then removed again — the shipped manifest has no `ground` entry.

### Delivered art now shown: status, action and miracle icons in battle

The 14 miracle icons and most status icons of Brief 13 were registered but
no screen showed them. Now (presentation only; no rule changed):

* **Marks over each stack's count** (`ui/src/app/stackMarks.ts` →
  `BattleStackView.marks`, drawn by `battle.ts`): defending
  (`icon.action.defend`), waited (`icon.action.wait`), its Shapeshift aspect
  (`icon.fx.summon`), and every running status — a miracle's with the
  miracle's own icon, a spell's or ability's with its kind's: Attack up/down
  `status.buff`/`status.debuff`, Defense up/down `fx.shield`/`status.weaken`,
  Speed up/down `stat.speed`/`status.frozen`, maximum/minimum damage
  `fx.divine`/`fx.shadow`, melee/ranged ward `fx.shield`/`fx.arrow`. Up to five
  icons on dark gold-rimmed discs; they appear when the spell or miracle lands,
  like the status glow. The active stack's card and the attack preview list the
  same marks with their meaning (alt text and tooltip: "Rally the Faithful:
  Attack +2 (2 rounds left)").
* **Icons before the floating words**: Defend, Wait, Ward, Lucky, morale
  (`stat.morale`) and a faltering stack (`status.stun`), healing
  (`status.heal`), damage spells by their look (`status.burning`,
  `status.frozen`, `fx.lightning`, `fx.shadow`, `status.poison` for blight and
  swarm spells — a picture of the damage, no damage over time), and a
  miracle's word or smite with the miracle's icon.
* **Map miracles**: the miracle's icon rises over the heroes or the town it
  touches (Favorable Winds, Bountiful Harvest, Tithe, Inspiration, Blessing of
  the Nile, Mists of the Sidhe, Gift of the Feathered Serpent).

Shown now: all 14 `icon.intervention.*` and `status.buff`, `status.debuff`,
`status.weaken`, `status.frozen`, `status.heal`, `status.burning`,
`status.stun`, `status.poison`. The book of Favor keeps its painted cards
(the owner's choice: no icon before miracle names).

### The AI: one big creature, and a home guard

**One big creature.** Measured with duels (four seeds per point, six
pantheons, a mixed tier-1–4 army attacking): a lone tier-7 creature held off
armies of **2.1–2.8×** its strength by the shared heuristic (two tier-6: 1.7–1.9;
an equal-strength stack of tier-2 creatures 1.2–1.7; a mixed guard 0.9–1.0). A
stack's damage falls only as whole creatures die, so a single creature hits
at full force to its last hit point. The strategic AI now judges every army
by `fightingStrength`: the shared heuristic per stack × (n + 1) / n for n
creatures (twice for one, half again for two, about 1 for big stacks); the
same duels then break even at 1.2–1.45 for a lone tier 7, in line with other
single-stack guards, which the AI's margins (1.3 for guards) cover. Its own
heroes are judged the same way (`heroPower`). The shared heuristic in the
rules is unchanged (the neutral join/flee rule uses it).

**Home guard** (`homeGuardTransfers` in `strategic.ts`). A hero visiting a
town takes the garrison's stacks highest tier first but leaves a guard, and
leaves its own lowest tiers (shooters first among equals) when the garrison is
short: from day 8, **20 %** of the strength there (hero and garrison; 10–30 %
by temperament: more with a defensive build weight, less when aggressive),
days 4–7 half that, days 1–3 nothing. The guard grows to hold the walls
against the strongest visible enemy hero within 16 hexes and, from day 4,
against a rival's fresh Tavern hero (ten tier-1 creatures) — at most 60 % of
the strength there. A hero no longer walks home for a garrison it may not
take. Found with a day-by-day trace of a Burning Oasis match: a town left with
a fifth of the strength fell on day 7 to a rival's ten-creature hero; with the
guard it holds.

**Measured** (AI against AI, the same commands before and after; small
samples, not playtest verdicts):

`npm run balance -- maps --matches 2` (each pantheon line-up from every seat,
day cap 40):

| Map | Matches | Decided (by the shrine), before → after | First knock-out, before → after (matches, mean day) | Seat scores after |
|---|---|---|---|---|
| Frostgate | 4 | 3 (0) → 2 (0) | 3, day 26.3 → 2, day 29.5 | 0.13, 0.88 (before 0.50, 0.50) |
| The Burning Oasis | 8 | 5 (2) → 4 (3) | 8, day 7.8 → 7, day 10.1 | 0.25, 0.13, 0.25, 0.38 |
| The Circle of Gates | 6 | 2 (0) → 2 (0) | 5, day 15.0 → 6, day 22.2 | 0.17, 0.33, 0.50 |
| Barrows of the Lost Kings | 4 | 1 (0) → 0 | 1, day 30.0 → none | 0.25, 0.75 |
| The Golden Fords | 4 | 2 (0) → 2 (0) | 2, day 30.0 → 2, day 26.0 | 0.63, 0.38 |
| The Six Thrones | 12 | 1 (1) → 0 | 12, day 13.7 → 11, day 22.1 | 0.19, 0.03, 0.28, 0.19, 0.19, 0.11 |

`npm run balance -- random --matches 4` (small random maps, every seat the
same pantheon): two empires 23 of 24 decided, mean day 21.8, seats 0.50/0.50 →
19 of 24, day 22.1, seats 0.48/0.52; three empires 20 of 24 decided, day 28.6,
seats 0.46/0.29/0.25 → 13 of 24, day 28.2, seats **0.38/0.33/0.29** (even
0.33).

Towns now fall later (the first empire is knocked out 2–8 days later on the
four- to six-empire maps) and fewer matches end before the day cap; the
three-empire random maps came closer to even seats. Four matches per
two-empire map are far too few to read seat scores from (Frostgate's 0.13/0.88
is two decided matches). The "before" runs used the 0.13.2 AI sources with
everything else equal (run in the same session; reports kept outside the
repository).

### The road brief (16): all five road types in the game

Two owner deliveries from `blannder_models\brief16-roads-2026-10-06` (read
only). **First the dirt track**, for review: only the three selected sheets
copied into `assets-source/sprites/final/` on both sides, `npm run
roads:import -- --dry-run` (0 problems), then the import; checked in the game
on Twin Harbors at play zoom and close up. The owner approved the dirt stage
and delivered the rest. **Then cobble, sand, snow and boardwalk** (12 sheets;
the delivery's handoff lists 1,890 edge checks passed and says some joins stay
visible): copied the same way (none existed before; all 15 SHA-256 values equal
to the delivery's `asset-manifest.json` on both sides), dry run over all 15 (0
problems), import — 15 WebP atlases, manifest `roads` with 15 entries, no other
entry changed. The importer gained `--only <text>` and `--note <text>`; the
notes record the state: dirt "approved by the owner after the in-game review",
the other four "in-game acceptance not yet recorded". Masters, proofs, guides
and the delivery's own runtime files were not copied.

In the game every map now draws painted roads (a map draws them when all three
sheets of every road type it needs are in, else the code roads — now only a
fallback). `tests/e2e/brief16.spec.ts`: on Twin Harbors (dirt), The Three
Beacons M02 (cobble), The Winter Oath M1 (snow) and The Twelfth Hour M1 (sand)
every road hex draws its tile and only that type's three atlases load; Twin
Harbors with six straight road hexes turned to marsh and rough ground draws
boardwalk and cobbles between the dirt. Screenshots at play zoom and close up
(`test-results/b16-*.png`, checked by eye): the tiles join through straights,
bends and crossings; at close zoom some joins show the steps in width and
texture the delivery notes, and a change of road type (dirt to boardwalk to
cobbles) is a hard cut at the hex edge. **Acceptance of cobble, sand, snow and
boardwalk in the game is the owner's to record.**

### Verification (commands actually run)

| Command | Result |
|---|---|
| `npm run check` | boundaries OK, type-check clean, **415/415** unit tests in 47 files (new: painted ground transitions, 4 — who reaches into whom, variants, the plan, the outline lookup; stack marks, 4 — every status kind has a delivered icon, miracles use their own, order and merging; the AI, 6 — the few-creatures factor, no attack on a lone tier 7 with 1.5× plain strength but with 3.2×, the home guard by week, the lowest tiers left behind, the guard raised by a visible enemy) |
| `python3 tools/assets/ground/import_ground.py --self-test`, `python3 tools/assets/roads/import_roads.py --self-test` | both passed |
| `npm run roads:import -- --dry-run` (15 sheets), then the imports with `--note` | 0 problems; complete road types: boardwalk, cobble, dirt, sand, snow |
| `npx playwright test` (whole suite, one worker) | **122/124 passed** in 1.4 h. Failed: the first `brief16.spec.ts` (the test's own fault: its second load found the first save; rewritten for the complete road set) and `round11.spec.ts` "the Spell button opens the casting book" (the button never settled in time under load; **passed** when rerun alone, 24 s) |
| `npx playwright test tests/e2e/brief16.spec.ts tests/e2e/brief17.spec.ts` (after the full road set) | **7/7 passed**: dirt, cobble, snow and sand maps draw every road hex as a painted tile with only their own atlases loaded, the marsh/rough stretch draws boardwalk and cobbles; battle marks over defending, waiting, blessed, cursed and slowed stacks and a miracle's own icon, the marks on the stack card, a miracle invoked in battle marking its army; the map's ground borders `softened` |
| `npm run balance -- maps --matches 2`, `npm run balance -- random --matches 4` | before and after, above |
| `npm run build` + `npm run desktop:build` + (in `apps/desktop`) `npx electron-builder --config electron-builder.json --win nsis --x64 --linux dir --x64` | **built** `Pantheon-Realms-Setup-0.13.3-x64.exe`, 530,144,312 bytes, SHA-256 `4bea4be7201770222e08f0c0546a06640a40accafc98c6a080a0f350c32b6abc`; `app.asar` 424.4 MB, 3,063 entries (0.13.2 plus the 15 road atlases; `dist/`, `package.json`, `renderer/` only) |
| `7z x` of the installer's `app-64.7z` | its `app.asar` is byte-identical to `win-unpacked` |
| `unshare -n` (no network) + packaged smoke (`tools/desktop-smoke.mjs`) | **DESKTOP SMOKE OK**: 1,293 sprites, 526 paintings, 643 interface images, 91 sounds, the map drawn with WebGL — The Three Beacons M01 with its painted dirt roads |

App version **0.13.3**; content `content-0.8.0` (saves of 0.12.0–0.13.2
load). Unsigned; **not run on Windows** here. Not checked: a human play-test
of the AI changes, of the cobble, sand, snow and boardwalk roads and of the
battle marks; Brief 17's art (not painted yet). The before/after balance
reports and the trace scripts stay outside the repository.

**Delivery.** The owner's 15 road sheets were copied into the owner's folder
from the delivery folder (SHA-256 checked there), and the Brief 17 brief, its
three ground guides and `ground-edges.json` ahead of the rest; bundle 24
(`apply_sync.py`, not committed) then wrote 50 files (24 new) with 0 problems,
the old versions measured there first (the three guides had arrived
re-encoded — same pixels — and were replaced byte for byte). The 0.13.3
installer was copied to the owner's `installer\` folder in 27 parts and joined
there (SHA-256 checked: `4bea4be7…6abc`).

## Ground edges, the road brief (16), Briefs 14 and 15 in the game; app 0.13.2 (owner requests, 2026-10-05)

Owner requests: "reverse the map's land smoothing back, it looks really bad.
Just smooth a bit the edges, not so much it looks like a blur"; "we want roads
as with real design. So give GPT 6 a guide to generate the sheets with the
styles. For each one, have a line, an angle, all possible crossing … and repeat
for each road type"; then the owner's combined delivery of Briefs 14 and 15.

### The ground: crisp again, edges only slightly softened

The soft-ground blend of 0.13.0 painted the whole map into one picture at
reduced resolution with a blur a third of a hex wide; it is gone. Each ground
type's painting is drawn per hex at full resolution again, and only where two
different grounds meet does each reach a sixth of a hex into the other in
three fading steps (`featherGroundEdges` in `presentation/src/adventure.ts`;
the map's outer edge and same-ground neighbours are untouched). Setting
`softGround` now means this edge softening. The fog's soft edges are
unchanged. Checked on screenshots of temperate, desert and tundra random maps
at two zoom levels.

### GPT-6 Brief 16: painted road tiles

`assets-source/art/briefs/GPT6_BRIEF_16_ROADS.md`. Five road types — dirt
track, cobbled road, desert flagstones, snow road, plank boardwalk — each in
three sheets: **a** dead ends (6), straights (3), wide bends (6), sharp bends
(6); **b** three-way crossings (20: two Y crossings, twelve straights with a
branch, six fans) and the six-way; **c** four-way (15, incl. the three X
crossings) and five-way (6). That is every one of the 63 ways a road can
leave a hex, 15 sheets of 7 × 3 cells (256 × 256 px; the hex 224 px wide and
foreshortened to 84 % like the map). The guides are drawn from the game's own
hex geometry (`npm run art:road-guides`): each cell shows the hex, the road's
footprint and a red bar where it must cross each connected edge (the middle
36 % of the edge for the surface, 50 % with its verge), so any two tiles join;
a join example shows tiles meeting on the map. Which road a hex gets follows
its land (`roadTypeFor`): boardwalks over marsh (and water), desert flagstones
in the desert, snow roads in tundra and fjord, cobbles in the mountain
climates and on rough ground, dirt tracks elsewhere.

The game reads the sheets already: `npm run roads:import` checks every cell
against the guide (the road must reach each connected edge at its middle and
no other edge), clips each tile to its hex and writes one WebP atlas per sheet
(`assets-runtime/sprites/final/roads/`, manifest `roads`). The adventure map
draws one tile per road hex by its connections and land once all three sheets
of every road type the map needs are imported; until then it keeps the
code-drawn roads, so a map never mixes the two. Checked with synthetic sheets
made from the guides (imported, rendered on a random map: the tiles join
across hexes through bends and crossings, type changes on rough ground), then
removed again; `import_roads.py --self-test` passed; unit tests keep the cell
order equal in the guides and the game.

### Briefs 14 and 15 in the game (owner delivery)

**Copied and imported.** From the owner's delivery folder (read only) into the
game, in the owner's folder and the cloud copy: 12 paintings into
`assets-source/art/final/` and 74 sprites plus the throw strip's JSON sidecar
into `assets-source/sprites/final/` — 87 files, none existing before, all 86
PNG SHA-256 values equal to the delivery's `asset-manifest.json` on both sides.
`npm run sprites:import -- --only siege.` imported 74 files with 0 problems;
`npm run art:import` (no `--prune`) made 526 runtime files and kept the 180
whose masters are not in the cloud copy. Result: **73 new siege stills, 1 new
effect strip, 18 new art entries** (six cards, six full pictures, six siege
battlefields); every other runtime file and manifest entry unchanged (hash
comparison before and after). The importer's provenance now names Brief 15 for
the throw strip.

**Accepted resolution exception** (the owner's choice: "deliver native paintings
and clearly document resolution shortfalls"). The six map paintings are native
1672 × 941 (Six Thrones 1672 × 940), below the brief's 1920 × 1080; the six
siege battlefields are native 1419 × 1108 (Celtic 1419 × 1109), below
4096 × 3200, and look softer stretched over the field. None was enlarged; the
cards (640 × 360) and full pictures are the importer's usual derivatives.
Sprites meet their sizes.

**Integration.**
* *Skirmish pictures:* the list cards, the selected map's picture (now capped at
  38 % of the screen height so the facts and the layout stay in view) and the
  seat setup show the paintings; the backdrop uses the full picture.
* *Sieges:* the defending town's pantheon chooses the wall, gate, tower and keep
  pieces and the battlefield (the shared set stays the fallback). A pantheon's
  own keep is drawn at the board's scale (the old shared keep was enlarged
  1.6×), and a siege board keeps two hex widths east of the field so the keep
  is whole on screen.
* *Siege battlefields:* each painting's ditch and crossing were painted off the
  brief's design positions (ditch up to 1.8 hexes east, crossing about a row and
  a half above the gate). Measured per file and corrected by shifting the
  painting on screen (`SIEGE_GROUND_SHIFT`): Greek −1.6 %/+3.75 %, Norse
  −4.45 %/+4.4 %, Egyptian 0/+3.2 %, Japanese −2.45 %/+3.0 %, Celtic
  −1.74 %/+3.25 %, Mesoamerican −3.0 %/+3.9 % of the painting's width/height.
  The board never moves; the moat cells now lie on the painted ditch and the
  gate row on its crossing. The painted town streets start farther east than
  the brief asked (open ground just inside the wall).
* *Catapult:* the still stands west of the field; at each shot it hides and the
  throw strip plays once in its place (same frame, anchor and scale), the
  game's stone leaves the cup at the strip's release frame (frame 5, 1/3 s at
  12 fps) and flies on while the arm settles, then the still returns. On Low
  graphics (simple effects) the still stays and only the stone flies.

### Verification (commands actually run)

| Command | Result |
|---|---|
| `npm run check` | boundaries OK, type-check clean, **401/401** unit tests in 44 files (new: road tile order and land, 3; siege battlefields per pantheon, 1; the art-count tests now include the six map pictures and six siege battlefields, and the effect-strip test the catapult's throw) |
| `python3 tools/assets/roads/import_roads.py --self-test`, `python3 tools/assets/sprites/import_sprites.py --self-test` | both passed |
| `npx playwright test` (whole suite, the final build, one worker) | **121/121 passed** in 1.1 h, among them the new `brief15.spec.ts` (5: every pantheon's level-3 and level-2 siege draws its own pieces and battlefield, the damage states, the catapult's throw filmed at a round start, the skirmish pictures in the list, detail and setup) |
| `npm run build` + `npm run desktop:build` + (in `apps/desktop`) `npx electron-builder --config electron-builder.json --win nsis --x64 --linux dir --x64` | **built** `Pantheon-Realms-Setup-0.13.2-x64.exe`, 525,320,292 bytes, SHA-256 `9046057514a03d6b3e157f31c025e881719c2deefeb5f2f68b4b07b64e98efbd`; `app.asar` 419.6 MB, 3,047 entries (0.13.1 plus the 92 new runtime files; `dist/`, `package.json`, `renderer/` only) |
| `7z x` of the installer's `app-64.7z` | its `app.asar` is byte-identical to `win-unpacked` |
| `unshare -n` (no network) + packaged smoke (`tools/desktop-smoke.mjs`) | **DESKTOP SMOKE OK**: 1,293 sprites (1,219 before), 526 paintings (508), 643 interface images, 91 sounds, the map drawn with WebGL |

App version **0.13.2**; content `content-0.8.0` (saves of 0.12.0–0.13.1 load).
Unsigned; **not run on Windows** here. Not checked: a human play-test of a
siege of every pantheon, the road brief's art (not painted yet), and the
skirmish pictures on large displays.

**Delivery.** The 87 delivered files were copied into the owner's folder from
the delivery folder (hashes checked there); bundle 23 (`apply_sync.py`, not
committed) then wrote 123 files (102 new) with 0 problems, the old versions of
the 21 changed files measured there first. The 0.13.2 installer was copied to
the owner's `installer\` folder in 26 parts and joined there (SHA-256 checked:
`9046057…efbd`).

## Brief 13 icons in the game; app 0.13.1 (owner delivery, 2026-10-05)

The owner delivered Parts B–E of GPT-6 Brief 13: **94 icons** (38 interface
icons, 22 map markers, 20 effect and status icons, 14 divine interventions),
prepared in a separate delivery folder with a scoped import helper
(`import_brief13.py`, a dry run unless `--apply`). **Part A, the six town
backgrounds, was not part of it and is still open.**

**Import.** The delivery was checked first: 94 masters (1254 × 1254 RGBA) and
94 runtime PNGs (96 × 96; the nine main-menu icons 192 × 192, as the brief's
interface section asks), every SHA-256 matching the delivery's manifest, every
runtime file transparent RGBA. The helper was read before use: it copies only
the 94 masters into `assets-source/icons/final/` and the 94 runtime files into
`assets-runtime/ui/icons/final/`, merges their 94 entries into
`assets-runtime/ui/final-manifest.json` without touching any other, and backs
up the previous manifest. It was run with `python3 -B` (nothing written into
the delivery folder), dry run first, in the cloud copy and then in the owner's
folder: 94 registrations, 188 copies, 491 other entries kept; afterwards 585
entries, the 491 earlier ones equal as JSON values, the top-level fields
unchanged. The manifest is byte-identical in both places (SHA-256
`6dd864cb…0c7e`) and all 188 files hash as delivered in both. The game's own
importer was not used: its full run re-encodes and re-dates every icon, and
the delivered runtime files are what it makes (same Lanczos downscale, PNG with
alpha) except that it would have shrunk the menu icons to 96 px. The helper's
backup of the old manifest stays in the owner's folder
(`assets-source/icons/import-backups/brief13-20261005-190251-073589/`, not
tracked; in the cloud copy it was moved out of the repository).

**Code.** None for the art: each file is found by its asset ID, and final art
takes precedence over the concept crops (which stay in `assets-runtime/ui/icons/`
as the fallback). Two tool fixes so that 192-px menu icons are expected: the
final-art unit test (`packages/ui/test/uiArt.test.ts`, which failed on its
first run with the delivery) and `npm run icons:import` now read the interface
section's "menu icons 192 px" for `icon.menu.*`; both read 96 px before.

**Icon inventory** (`npm run icons:catalog`): 843 entries in 14 sections, **827
final art**, 16 procedural (hero and Herald portraits that are a generated
square outside the dialogue window); `icon-inventory.json` updated. The
Markdown, CSV and XLSX production lists it also writes were not kept (removed
in the release clean-up as finished lists).

**Where they show** (`tests/e2e/brief13.spec.ts`, new, **4/4 passed**: on every
visited screen no replaced crop is drawn and every icon image decodes;
screenshots `test-results/b13-*.png` checked by eye): main menu and New Game;
resource bar and costs at 24 px, the day counter, the hero and town tabs; the
tile panel over the player's own town (blue banner), a hostile town (red) and
a neutral town (grey), sawmill, quarry, crystal deposit, gold mine, a supply
cache and a claimed one (check); hero statistics; a building's costs; the
Pantheon screen; the miracle book on the map and in battle; the Journal; the
Encyclopedia; the battle action bar (Spell disabled and greyed) and the stack's
statistics. 44 of the 94 were on those screens. The rest, and why:

* the other 12 markers — on maps with those sites (artifact, creature camp,
  portal, shrine, watchtower, gates and so on); Twin Harbors has none;
* `icon.action.ability` and `icon.action.surrender` — a stack with an active
  ability, a battle against a hero; Quit — the desktop build only (its
  screenshot shows it); Credits — no screen yet;
* the 20 effect and status icons — stand-ins for a spell without its own icon
  (every spell has one) or not used yet, as the brief said;
* **the 14 intervention icons — no screen shows them today**: the miracle book
  shows each miracle's painted card (all 14 delivered), and the owner's fix of
  2026-10-05 removed the icon before each miracle's name on the Pantheon page.
  They are registered under the interventions' `iconAssetId` and appear wherever
  a card is missing; the layout was not changed to show them.

All 94 were also composited on the game's dark panel and on the miracle book's
parchment at 24 and 48 px: clean edges, no fringe.

**Still concept crops on screen** (not in Brief 13 — the inventory step lists
them as unused files although the code shows them): `icon.marker.hero` and
`icon.marker.enemy-hero` (tile panel over a hero) and `icon.marker.encounter`
(a failed objective in the Journal).

### Verification (commands actually run)

| Command | Result |
|---|---|
| `python3 -B import_brief13.py --project <checkout>` then `--apply` (cloud copy, owner's folder) | dry run and apply as above; manifests identical, 188/188 file hashes as delivered |
| `npm run check` | boundaries OK, type-check clean, **397/397** unit tests in 43 files |
| `npm run icons:catalog` | 843 entries, 827 final, 16 procedural |
| `npx playwright test tests/e2e/brief13.spec.ts` | **4/4 passed** |
| `npx playwright test tests/e2e/features.spec.ts tests/e2e/heroscreen.spec.ts tests/e2e/mapSites.spec.ts tests/e2e/menu.spec.ts tests/e2e/round19.spec.ts` | **22/22 passed** |
| `npm run build` + `npm run desktop:build` + (in `apps/desktop`) `npx electron-builder --config electron-builder.json --win nsis --x64 --linux dir --x64` | **built** `Pantheon-Realms-Setup-0.13.1-x64.exe`, 517,555,335 bytes, SHA-256 `6575636defca3018d5ef65717b041d63dafbc2952b1cd4585811b645c87cf7b3`; `app.asar` 411.8 MB, 2,955 entries (0.13.0 plus the 94 icons; `dist/`, `package.json`, `renderer/` only) |
| `7z x` of the installer's `app-64.7z` | its `app.asar` is byte-identical to `win-unpacked` |
| `unshare -n` (no network) + `PR_SMOKE_EXE=apps/desktop/release/linux-unpacked/pantheon-realms xvfb-run -a node tools/desktop-smoke.mjs` | **DESKTOP SMOKE OK**: 1,219 sprites, 508 paintings, **643** interface images (549 before), 91 sounds, the map drawn with WebGL, the menu with the new icons and v0.13.1 |

App version **0.13.1** (art only; content `content-0.8.0`, saves of 0.12.0 and
0.13.0 load). Unsigned; **not run on Windows** here. Not checked: the icons on
real displays at other scalings, and the markers of sites Twin Harbors lacks
inside the running game.

**Delivery.** Bundle 22 (`apply_sync.py`, not committed) wrote the 10 changed
files (one new) into the owner's folder with 0 problems, their old versions
measured there first. The 0.13.1 installer was copied to the owner's
`installer\` folder in 25 parts and joined there (SHA-256 checked:
`6575636d…f7b3`).

## Six skirmish maps and the owner's ten fixes; app 0.13.0 (owner requests, 2026-10-05)

### Six authored skirmish maps (proposed)

Owner request: "suggest 4 new skirmish maps", then "suggest 2 more and build
all of them … have a file for GPT 6 to generate the images we need for the
skirmish picking window".

| Map | Empires | Size | Climate | Goal | What shapes it |
|---|---|---|---|---|---|
| Frostgate | 2 | 38 × 30 | fjord (Icy spray) | conquest | one pass through the ridge, shut by twin crimson key gates; each empire's crimson key on its own glacier island, reached by portal, guarded by 8 wyverns |
| The Burning Oasis | 4 | 46 × 36 | desert (Scorching sand) | hold the shrine 7 days, or conquest | four corners; between each pair of neighbours an oasis (gold mines north and south, crystal east and west, a creature camp in each); the Burning Shrine in a ring of red rock with one opening toward each empire |
| The Circle of Gates | 3 | 54 × 42 | high pass (Thin air) | conquest | three valleys round a peak sanctum (three spell shrines, the Crown of the Summit), guarded paths and ridge crossings; a ring of portals: each home gate opens on a walled terrace behind the next empire's town (guarded), each back gate leads to the previous empire's home |
| Barrows of the Lost Kings | 2 | 38 × 30 | moor (fog) | conquest | prisons (a level-5 hero of your own pantheon behind barrow-wights; a level-7 veteran in the King's Barrow), two quest huts, amber and violet key vaults with a major artifact, a relic in the middle, one gold mine per side |
| The Golden Fords | 2 | 38 × 30 | autumn (Harvest wind) | conquest | two rivers with three guarded fords each; the rich middle (mines, mill, camp, the Horn of Plenty); twice the usual treasury; revealed map |
| The Six Thrones | 6 | 68 × 56 | coast | hold the shrine 10 days, or conquest | one island in six wedges between ridges with one guarded pass to each neighbour and one guarded path to the central shrine |

**How they are made.** Each map is a custom map document (the editor's
`*.prmap.json`) written by `npm run maps:build` from `tools/maps/maps.ts`:
designed for empire 1 and copied to the others by exact hex-grid symmetries
(half turn; turns of 120° or 60°; mirror and half turn for four), so every
empire's ground, sites and distances are the same. Scattered ground (woods,
dunes, bogs) reads the copy of each tile in empire 1's part of the map, so its
density does not pile up with the number of copies. The build checks the
editor's validation, exact symmetry of the ground, one road into every town
and each map's promises (e.g. Frostgate's pass is shut without the key, the
Circle's land is shut without portals) and prints distances: towns are 26
(Frostgate), 24/26/36 (Oasis), 17/17 (Circle), 32 (Barrows), 26 (Fords) and
20/36/40 (Six Thrones) steps apart, the same for every empire. Layout guides
for the brief: `assets-source/art/briefs/guides/skirmish.<map>.layout.png`.

**Format and rules.** The custom map types moved to `@pr/rules`
(`definitions/customMap.ts`, re-exported by `@pr/mapgen`) so content carries
the maps (`packages/content/src/skirmish/maps/`, catalog `skirmishMaps`,
`SkirmishMapValidator`). The format gained six site kinds the rules already
had — key tent and key gate (colour), prison (level, hero or the nearest
empire's pantheon), quest hut (bring resources or beat a named guard; reward
Gold, experience, artifact), watchtower (range) and artifact (named, or a
rarity picked deterministically per map) — plus guards of several stacks with
a label and a reward. The map editor places and edits all of them and opens a
copy of any skirmish map. `compileSkirmishMap(catalog, mapId, seats)` compiles
a map for the chosen pantheons; the mission is an ordinary generated mission
(saves embed it).

**AI fixes found on the way** (all maps, random maps too): a hero now routes
through a known portal to a target it cannot reach on foot at all (it used to
consider portals only for far targets, so a hero that took a portal to an
island stayed there), and a hero standing on a portal steps off and back on to
use it again.

**Screens.** New Game → Skirmish lists the six maps after Twin Harbors with a
picture (the drawn layout until Brief 14 arrives), the detail panel gives the
facts (empires, size, goal, climate, treasury, revealed map) and the layout;
**Set Up Empires** opens S23 (one seat per empire: pantheon, human or AI, name,
patron; difficulty), and Start opens the adventure map. A delivered painting
also becomes the screen's backdrop when its map is selected.

**Measured** (AI against AI, `npm run balance -- maps`, each pantheon line-up
played from every seat, day cap 45; small samples, not playtest verdicts):

| Map | Matches | Decided (by the shrine) | Mean decisive day | Seat scores |
|---|---|---|---|---|
| Frostgate (after the islet guard was eased to 8 wyverns) | 6 | 5 (0) | 29.4 | 0.50, 0.50 |
| The Burning Oasis | 8 | 5 (2) | 28.8 | 0.25, 0.13, 0.25, 0.38 |
| The Circle of Gates (before the guarded terrace) | 6 | 6 (0) | 32.5 | 0.50, 0.17, 0.33 |
| Barrows of the Lost Kings | 6 | 3 (0) | 21.7 | 0.50, 0.50 |
| The Golden Fords (after the ford guards were raised) | 6 | 5 (0) | 34.4 | 0.33, 0.67 |
| The Six Thrones | 12 | 5 (5) | 37.4 | 0.04, 0.29, 0.38, 0.21, 0.04, 0.04 |

The maps are symmetric by construction, so seat differences come from the
turn order and the AI; the samples are far too small to tune on. Early
knock-outs (days 5–8) happen on the open maps (Oasis, Fords before the guard
change) when a neighbour's first army finds a town with an empty garrison.
Frostgate's first version stranded both AI leaders on their islands (the
portal fix above) and lost heroes to a drake the AI underrates (one big unit
reads weaker than it fights); the islet now holds wyverns.

**GPT-6 Brief 14** (`assets-source/art/briefs/GPT6_BRIEF_14_SKIRMISH_MAPS.md`):
six 1920 × 1080 paintings, `mission.skirmish.<map>.thumbnail.png`, with prompts
and the layout guides; `npm run art:import` makes the card and keeps the full
picture (the importer recognises `mission.skirmish.<map>.thumbnail`).

### The owner's ten fixes (2026-10-05)

1. **Roads** are joined into runs between junctions, rounded (corner cutting)
   and drawn in the land's style (`presentation/src/roads.ts`): rutted dirt on
   grass (by climate: brown, golden, sandy, peat, red earth), sandstone flags
   in the desert, packed snow in the north, cobbles in the mountains, plank
   boardwalks over marsh. Code only; no road art needed.
2. **Pantheon page:** no subtitle; the signature under the patron's text on the
   left (its "Proposed · active here" chip removed); only first- and
   second-choice gods in the list; miracles show their price as the number and
   the Favor icon, without the icon before the name or the explanation line.
3. **Recruit page:** no subtitle; "Upgrade troops" (button and hint too); the
   bestiary entry is a book icon beside the creature's name.
4. **Adventure map:** End Day starts level with the hero list; a town that can
   still build today shows a hammer icon instead of the "Build" tag.
5. **Soft ground:** the ground is painted once per map into one picture in which
   each ground type fades into the next over a third of a hex (the map's outer
   edge stays crisp); the fog's edges fade the same way. Setting
   `softGround` (on at every quality level).
6. **Dwellings:** the tier-3 dwelling now needs the tier-2 dwelling and the first
   temple (Greek Griffin Aerie: Peltast Range + Temple I; Norse Troll Cave:
   Wolf Den + Hof I; the other four pantheons follow the Greek tree), never the
   tier-4 one; the content validator refuses any dwelling that needs a higher
   tier. **Owner decision; changes The Three Beacons' town too.**
7. **Battle:** no burst over a struck creature; a killing blow shows the whole
   hit strip, a pause, then the death; a creature that moved and won the last
   fight of a battle no longer jumps back to where it started (the final view
   never arrives, so its move is now remembered).
8. **Result screen:** the Won/Lost tags are gone.
9. **GPT-6 Brief 15** (`GPT6_BRIEF_15_SIEGES.md`, guide `guides/siege.layout.png`):
   each pantheon's wall, gate, tower and keep in three states, a siege
   battlefield per pantheon with the town's streets, and the catapult with a
   throw strip. The game already looks them up (`<kind>.<state>.<pantheon>`,
   `battlefield.siege.ground.<pantheon>`, `catapult.intact`,
   `fx.siege.catapult.throw`; the importer knows the names). Wall pieces now
   stand on one straight line between the zig-zagging cells of the wall column.
10. **Siege:** a catapult stands west of the field and throws (its arm whips up
    and the stone leaves the cup; drawn by code until Brief 15); arrows are
    drawn at a third of their size.

### Verification (commands actually run)

* `npm run maps:build` — six maps, all checks green.
* `npm run check` — boundaries, type-check, **397/397** unit tests (new:
  skirmish maps 18, roads 3, dwelling order 1).
* `npm run balance -- maps --matches 2` and `-- maps --maps frostgate,golden_fords,barrows --matches 3` (above).
* `npx playwright test` (the whole suite, the final build, Chromium +
  SwiftShader, one worker) — **112/112 passed** in 55.0 min, among them the
  new `skirmishMaps.spec.ts` (3: the six cards with picture, facts and layout;
  Frostgate's two seats to the adventure map; The Six Thrones' six seats and
  hold-the-shrine goal) and `campaign.spec.ts` with the "Upgrade" button.
* Screenshots checked by eye (cloud build): soft ground and fog, the roads by
  land (desert flags, moor planks), the pantheon and recruit pages, End Day
  level with the hero list, the town's hammer icon, the drawn catapult in a
  siege, the smaller arrows.
* `node tools/perf/load-time.mjs` (3-run medians, SwiftShader): local menu
  **207 ms**, first scene **913 ms**; web 474 / 910 ms (0.12.0: 229 / 879 and
  467 / 885 ms). The soft ground is painted once per map after its textures
  settle.

### App 0.13.0 (Windows installer for play-testing)

| Command | Result |
|---|---|
| `npm run build` + `npm run desktop:build` + (in `apps/desktop`) `npx electron-builder --config electron-builder.json --win nsis --x64 --linux dir --x64` (Linux + Wine) | **built** `Pantheon-Realms-Setup-0.13.0-x64.exe`, 515,839,545 bytes, SHA-256 `ca044e0f28c891e98a00ca007a6820705286e47b36aa87c0c7c4572dd2cfabb1`; `app.asar` 410.0 MB, 2,861 entries (`dist/`, `package.json`, `renderer/` only: no development tools, MCP servers, sources, tests, source maps, briefs or map-authoring tools) |
| `7z x` of the installer's `app-64.7z` | its `app.asar` is byte-identical to `win-unpacked` |
| `unshare -n` (no network; loopback only) + `PR_SMOKE_EXE=apps/desktop/release/linux-unpacked/pantheon-realms xvfb-run -a node tools/desktop-smoke.mjs` | **DESKTOP SMOKE OK**: `prgame://app/index.html`, saves and records written, 1,219 sprites, 508 paintings, 549 interface images, the custom cursor, 91 sounds (6 decoded at the menu, context running), the adventure map drawn with WebGL (soft ground and fog visible in its screenshot), packaged without dev tools |

App version **0.13.0**; content stays `content-0.8.0`, so 0.12.0 saves load
(a town in such a save keeps what it has built; the new dwelling
requirements apply to what it builds next).
Unsigned (Windows SmartScreen will ask once); **not run on Windows** here.

Not checked: a run on Windows itself, a human play-test of the six maps and
of the battle and road changes, and the GPT-6 art of Briefs 14 and 15 (not
painted yet: the skirmish cards show the drawn layout, the siege the shared
wall set and the code-drawn catapult).

**Delivery.** Bundle 21 (`apply_sync.py`, not committed) wrote 73 files (30
new) into the owner's folder with 0 problems; the old versions of the 43
changed files were first measured there with `git hash-object` (one, this
file, held the bundle 20 delivery note written after that bundle). The
installer was copied to the owner's `installer\` folder in 25 parts and
joined there (SHA-256 checked: `ca044e0f…abb1`); the 0.12.0 installer stays
beside it.

## Release round: pantheon balance, final sounds, three map layouts, the map editor, Brief 12, the clean-up and app 0.12.0 (owner requests, 2026-10-05)

Seven owner requests and one delivery, in the cloud copy and the owner's
folder (bundle 20, hash-checked; not committed).

### Pantheon balance on random maps (target: every pantheon 0.45–0.55)

A new balance suite, `random1v1` (`npm run balance -- random1v1 --matches N`;
`--map-types`, `--sizes`, `--focus`), plays every pairing of the six pantheons
on generated small maps, each map twice (once from each seat, so the map and
the first move cancel out), the map types in turn, few wandering monsters,
last empire standing, day cap 40. A match still open at the cap counts for a
side at least 25% stronger in armies, else half a win each. The report gives
the matrix, each pantheon's average against the other five with a "Target
0.45–0.55" column, the score by map type and the first seat's score; a day-15
snapshot per seat (army strength, buildings, gods, gold, heroes, towns) is
kept for diagnosis. AI-vs-AI measurements with the shipped AI, not playtest
verdicts.

Measured (commands actually run, 2 workers):

| Run | Content | Maps | Greek | Norse | Egyptian | Japanese | Celtic | Mesoamerican |
|---|---|---|---|---|---|---|---|---|
| `random1v1 --matches 20 --map-types continental,highlands,lake_isle,wild_forest,marshlands,crossroads` | before this round | 600 | 0.55 | 0.46 | **0.62** | **0.42** | 0.47 | 0.50 |
| same | Japanese and Egyptian creatures, leaders (below) | 600 | 0.53 | **0.42** | **0.65** | **0.43** | 0.50 | 0.48 |
| same, `--matches 12 --no-temperaments` | same | 360 | 0.55 | 0.52 | 0.51 | 0.53 | 0.45 | 0.44 |
| `random1v1 --matches 24` (all nine layouts) | Raiders and Builders softened, tier-7 Health | 720 | 0.55 | 0.51 | **0.64** | **0.39** | 0.46 | 0.46 |
| `random1v1 --matches 12 --focus japanese,egyptian` | Builders and Disciplined softer still | 216 | 0.50 | 0.52 | **0.58** | **0.41** | 0.48 | 0.52 |
| same, `--focus japanese`, Disciplined neutral | (experiment) | 120 | — | — | — | 0.49 | — | — |
| `random1v1 --matches 24` (all nine layouts) | Builders and Disciplined near neutral | 720 | 0.56 | 0.54 | 0.54 | **0.40** | 0.47 | 0.49 |
| `random1v1 --matches 24 --focus japanese`, merged with the run above | **final**: Kappa Speed 5/6, Kirin and Jorogumo Health | **720** | **0.57** | **0.51** | **0.53** | **0.47** | **0.45** | **0.47** |
| `random1v1 --matches 24 --focus greek,celtic`, merged (experiment, reverted) | Glory +15%, Selkie Speed 6 | 720 | 0.58 | 0.52 | 0.54 | 0.45 | 0.43 | 0.48 |

The finding: once the creatures were close, the remaining gaps came from the
**AI temperaments**, not from the pantheons. Played the neutral way, the six
pantheons scored 0.44–0.55; with the first temperament weights the Egyptian
Builders (wider attack margin, economy and walls ×1.4) won 0.62–0.65 and the
Norse Raiders (attacking at smaller margins) and Japanese Disciplined
(upgrading dwellings first) lost. The temperaments keep their habits with
smaller weights (`packages/content/src/common/temperaments.ts`): Raiders
boldness 0.95 (was 0.88), raid value ×1.15 (1.3), military ×1.15 (1.25),
economy ×0.95 (0.9), magic 0.9 (0.85), still one extra hero; Builders
boldness 1 (1.12), raid value ×0.95 (0.85), economy and defense ×1.1 (1.4);
Disciplined elite ×1.05 (1.5, then 1.2). Their summaries say what they still
do. A Japan-only experiment with a fully neutral temperament scored 0.49
(120 matches) against 0.41 with a Disciplined of boldness 1.06 and elite ×1.05 — so even small weights move
the AI's strength by pantheon; the temperament checks belong in every
balance run. Content changes (proposed values, DESIGN_PROPOSALS.md item 42):

* Japanese creatures were the weakest for their price at almost every tier
  (same-tier duels): River Elder Kappa, Tengu, Great Tengu, Oni, Jorogumo,
  Queen Jorogumo, Kirin, Celestial Kirin, Orochi and Imperial Orochi gain a
  little Attack, Defense, Health or damage; the tier-4 and tier-6 prices match
  the other pantheons (350/450 and 1,000/1,250 Gold); the skirmish escort is
  23 Kitsune (was 21).
* Egyptian outliers a little weaker: Royal Ushabti (Defense 11, Health 32),
  Crocodile Beast (Attack 11, Health 34), Anubian Warden (Defense 4), Desert
  Colossus (Health 214).
* Japanese, second pass: Kappa Speed 5 (was 4), River Elder Kappa 6 (5),
  Kirin Health 90 (84), Celestial Kirin 104 (97), Jorogumo 38 (36), Queen
  Jorogumo 44 (42).
* Tier 7: Stone Colossus Health 255 (was 240), Sun Colossus 298 (280),
  Fomorian Giant 260 (250), Ancient Fomorian 312 (300).
* Random maps: every empire's first leader has the same kind of specialty
  (+250 Gold a day: Odysseus, Ragnar, Hatshepsut, Yamato Takeru, Medb,
  Nezahualcoyotl).
* The Afterlife signature stays at 20% (10% and 15% were tried; no
  measurable difference).

Content stays `content-0.8.0` (values changed without a version bump), so
0.11.0 saves still load and play on with the new values. Noise: 240 matches
give each average a standard error of about 0.03; the per-pairing cells (48
matches) about 0.07.

**Result (final content, 720 matches on all nine layouts, both seats):**
Norse 0.51, Egyptian 0.53, Japanese 0.47 and Mesoamerican 0.47 are inside
0.45–0.55; **Greek 0.57 is above it and Celtic 0.45 (0.446) at its lower
edge**. The owner stopped the tuning here (2026-10-05: "good enough"). The
last experiment — Glory +15% XP and Selkie Speed 6 — measured Greek 0.58 and
Celtic 0.43, no better within the noise, and was reverted, so the shipped
values are the ones measured as final. The first seat scored 0.47 (623
matches decided by elimination, mean day 21.3; 79 on army strength at the
cap; 18 draws).

| Layout | Greek | Norse | Egyptian | Japanese | Celtic | Mesoamerican |
|---|---|---|---|---|---|---|
| continental | 0.60 | 0.60 | 0.67 | 0.35 | 0.38 | 0.41 |
| highlands | 0.58 | 0.48 | 0.55 | 0.46 | 0.31 | 0.62 |
| lake_isle | 0.44 | 0.68 | 0.68 | 0.44 | 0.46 | 0.25 |
| wild_forest | 0.48 | 0.63 | 0.36 | 0.62 | 0.46 | 0.46 |
| marshlands | 0.60 | 0.50 | 0.54 | 0.46 | 0.46 | 0.43 |
| crossroads | 0.47 | 0.48 | 0.50 | 0.38 | 0.57 | 0.61 |
| archipelago | 0.50 | 0.54 | 0.62 | 0.50 | 0.46 | 0.38 |
| twin_continents | 0.75 | 0.27 | 0.52 | 0.54 | 0.39 | 0.54 |
| central_valley | 0.77 | 0.41 | 0.32 | 0.44 | 0.50 | 0.55 |

(80 matches per cell; standard error about 0.06.) The merged run is honest
only because the later runs changed one pantheon's units at a time: the
Japanese re-run replaced every Japanese pairing of the 720-match run with
the same maps and seeds, and the pairings without Japan are untouched by
Japanese values. A run of 720 took 37–93 minutes with two workers.

### Final music and sounds (Pixabay, with the owner's approval)

Every sound the game plays is now a recording (status **final**; the
manifest holds 91 entries, none a placeholder). 105 sources from Pixabay
under the **Pixabay Content License (no attribution required)**, chosen with
the owner's approval: only items not marked AI-generated and without a
YouTube Content ID registration at selection time. The list — every sound ID,
the tracks it uses, each source's title, author, page and licence — is
`assets-source/audio/sounds.json`; `tools/audio/import_sounds.py --from <dir>`
converts and registers them (CLAUDE.md):

* **Music** (two-pass EBU R128 to −16 LUFS as the map music, Ogg q2,
  streamed): a menu theme (two tracks), battle music by the viewing player's
  pantheon (`music.battle.<pantheon>`: three tracks each, two for the
  Japanese), siege music for any battle at a town's walls (`music.siege`, two
  tracks), mission-results music (two tracks); `music.battle` (the first
  track of each pantheon) stays as the fallback. 23 files, 70.4 minutes.
* **Stingers** (victory 7.7 s, defeat 15 s, level-up, beacon) and **effects**
  (61 sound IDs: interface, building and recruiting, the day and week, combat
  blows, shots, deaths, sieges, spells and Favor): leading and trailing
  silence trimmed, cut to each sound's length limit, loudness matched to the
  placeholder it replaced so the mix keeps its balance, Ogg q3–q4. Several
  combat sounds have two or three variants.
* **Ambience** (nine soundscapes and the battlefield): seamless loops of at
  most 60 s (equal-power crossfade of the end into the start), level-matched.

The downloads came through the built-in browser; 75 waited as `.tmp` files
until the owner approved them in chat, and each of the 106 downloaded files
was identified by its SHA-256 against the Pixabay CDN copy (two approved files
carried another item's name; one track, Japanese battle music “Joushitai”,
never downloaded and was dropped from the playlist). Audio total in the game
161 MB (map music 104 MB).

The adventure map's old "soundscape" music (`music.explore.*`, eight
synthesized loops that only played when a pantheon had no playlist) is
retired: the map plays the viewing player's pantheon playlist, else the Greek
one; the soundscapes keep their ambience. `tools/audio/make_placeholders.py`
no longer makes them; `sounds.json` lists them under `retire`.

### Three more random-map layouts (`pr-skirmishgen-0.6`)

Archipelago (every region an island; straits, a lagoon around the central
isle crossed by one sandbar per empire, the open sea along the rim; twin
portals cross the straits), Twin Continents (two empires; a strait splits
the land, the central island is the only land bridge, twin portals cross the
water) and Central Valley (a valley ringed by ridges with two guarded passes
per empire; inside, a guarded gold mine and crystal deposit per empire
besides the central prize). The older six layouts draw the same maps from the
same seed as before (noise label kept at 0.5). The setup offers nine layouts
and disables Twin Continents for more than two empires. Unit tests: every
layout generates for two to six empires where allowed, connected and
symmetric (SKM tests); `tests/e2e/round20.spec.ts` **passed** (nine layout
cards, Twin Continents disabled at three empires, an Archipelago map starts
with more than 100 water cells and over 20 sites).

### Map editor (S22)

New Game → **Map Editor** (`packages/ui/src/screens/MapEditor.tsx`, document
model `packages/mapgen/src/custom.ts`): paint the six grounds with brush 1–3,
lay or remove roads, place towns (one per empire), mines, treasure chests,
supply caches, learning stones, spell shrines, skill trainers, windmills,
creature camps, twin portals (in pairs), monsters and the Shrine of the First
Flame, each guardable with a chosen creature and count; set two to six
empires and their pantheons, the land, the victory goal (last empire standing
or hold the shrine), starting wealth and a revealed map. Undo and redo;
Escape asks before leaving unsaved work. The Check tab lists what keeps the
map from being played (no town for an empire, a site on water or mountains,
a site nobody can reach, a lone portal, a missing shrine). Maps live in a map
library (desktop: `<userData>/maps/<id>.prmap.json`, 4 MB cap, IPC
`pr:listMaps` / `readMap` / `writeMap` / `deleteMap` / `exportMap` /
`importMap`; browser: local storage) and export or import as `*.prmap.json`
(untrusted files are validated before use). Play compiles the map into an
ordinary generated mission (seats, patron gods, difficulty), so a custom game
saves and loads like a random map. Measured: `packages/campaign/test/customMap.test.ts`
5/5; `tests/e2e/mapEditor.spec.ts` **2/2 passed** (paint, road, both towns, a
guarded mine and a portal pair → "Ready to play"; guard edited; saved,
reopened from the library; exported file checked; played to the adventure
map; a damaged file refused with its reason; Escape asks first).

### Brief 12 visuals (owner delivery, 2026-10-05)

The owner's checkout already held the delivery (84 dwelling and 42 service
cutouts, 9 climate icons, 8 site markers, `fx.god.commit`; imported there by
the delivery's own steps); the cloud copy took the same runtime files and
manifests from it. Checked here through the real screens
(`tests/e2e/brief12.spec.ts`, **4/4 passed**): all 18 locations of every
pantheon's town show delivered art with base and upgraded dwellings (12
screenshots, every slot from `art/town/`); the nine battle climate chips show
their own icon with the rule as tooltip; the tile panel shows each of the
eight random-map site markers. The key tent and key gate markers are now
tinted with their key's colour in the tile panel (their light surfaces were
painted for it; `MarkerIcon` `tint`, isolated in the marker), as the map
sprites already were. The god commitment plays the new strip once and not
under reduced motion (`round19.spec.ts` 4/4). Still placeholders: the six
town backgrounds (Part E was not painted) and the neutral map hero.

### Release clean-up (owner choices of 2026-10-05)

Removed from the working tree (git history keeps everything; 973 files):
the 221 GPT-6 sheets already cut into final strips (the 20 Brief 12 sheets,
`README.md` and `cut-log.json` stay), the 234 creature reference views, 303
old placeholder sprites in `assets-runtime/sprites/` that the manifest no
longer pointed at, 150 town-building placeholder crops replaced by Brief 12
(the six backgrounds and the menu fallback stay), `assets-source/ui/backgrounds-old/`
(11), `support images/` (33 concept boards), the brief documents 1–11, the
finished production lists `GPT6_2D_CONTENT_GENERATION.md`,
`VFX_MAGIC_AND_FAVORS.md`, `ICON_CATALOG.md` (+ `.xlsx`, `.csv`) and
`2D_MIGRATION_AUDIT.md`, the two placeholder generators
(`tools/assets/sprites/make_sprite_placeholders.py` with `npm run
sprites:placeholders`, `tools/assets/prepare_placeholders.py`) and the
finished review sweep `tests/e2e/zz-moments-review.spec.ts`. In the code: 55
exported functions and constants nothing used (among them two 3D-era hex
transforms, in-memory storage adapters, an unused hero-figure lookup and
four UI components with their CSS), 21 unused imports and three unused
fields; `tsconfig.base.json` now sets `noUnusedLocals`, so the type-check
keeps it that way. No source file was unreachable (import-graph audit from
every entry point). Kept: the six final hero figures in the sprite manifest
(no screen shows them now; removing final art was not asked), node_modules
and the local build output (the owner had no preference).

### App 0.12.0 (Windows installer for play-testing)

| Command | Result |
|---|---|
| `npm run build` + `npm run desktop:build` + `npx electron-builder --config electron-builder.json --win nsis --x64 --linux dir --x64` (Linux + Wine) | **built** `Pantheon-Realms-Setup-0.12.0-x64.exe`, 515,818,606 bytes, SHA-256 `7ea20e7060f533fce8cd691c59a2ccc7b65ffd0ec970324fbbd645270dd31935`; `app.asar` 409.9 MB, 2,861 entries (`dist/`, `package.json`, `renderer/` only: no development tools, MCP servers, sources, tests, source maps, briefs or 3D files) |
| `7z x` of the installer's `app-64.7z` | its `app.asar` is byte-identical to `win-unpacked` |
| `unshare -n` (no network) + `PR_SMOKE_EXE=apps/desktop/release/linux-unpacked/pantheon-realms xvfb-run -a node tools/desktop-smoke.mjs` | **DESKTOP SMOKE OK**: `prgame://app/index.html`, saves and records written, 1,219 sprites, 508 paintings, 549 interface images, the custom cursor, 91 sounds (6 decoded at the menu, context running), the adventure map drawn with WebGL, packaged without dev tools |

Why it is larger than 0.11.0 (290.7 MB): the deliveries of 2026-10-04 and
10-05 that were not yet in an installer — the 177 magic and Favor strips, the
map heroes' `prepare`/`cast` strips, 134 god and hero portraits, the town
building levels and the Brief 12 buildings (art 112 MB, sprites 104 MB) —
and the final sounds (audio 161 MB, of which the map music is 104 MB).
App version **0.12.0**; content stays `content-0.8.0`, so 0.11.0 saves load.
Unsigned (Windows SmartScreen will ask once); **not run on Windows** here.

### Verification

| Command | Result |
|---|---|
| `npm run check` | boundaries OK, type-check clean (now with `noUnusedLocals`), **375/375** unit tests in 41 files |
| `npx playwright test` (every spec except `audio.spec.ts`, the build of mid-round, Chromium + SwiftShader, two balance workers on the same two CPUs) | **103 passed, 2 failed** of 105 in 1.4 h: the Japanese pantheon test still expected the old 21-Kitsune escort (now 23; fixed, rerun **passed**), and `round19b`'s twelve-painting sweep ran out of time under the CPU load (rerun alone **4/4 passed**) |
| `npx playwright test tests/e2e/audio.spec.ts` (final sounds) | **4/4 passed**: every sound file in the manifest decodes in Chromium; the menu, the Greek map playlist with the coast ambience (the test now waits for the decoded ambience too), Settings volumes and mute, and in battle the war horn, `music.battle.greek` and combat sounds |
| `npx playwright test tests/e2e/brief12.spec.ts tests/e2e/round19.spec.ts tests/e2e/mapEditor.spec.ts tests/e2e/round20.spec.ts` | **4/4, 4/4, 2/2, 1/1 passed** (sections above) |
| `npx playwright test tests/e2e/pantheons.spec.ts tests/e2e/battles.spec.ts` (final content) | **10/10 passed** |
| `node tools/perf/load-time.mjs` (3-run medians, SwiftShader) | first measurement with the recordings: local menu 245 ms, first scene **1,500 ms**; web 464 / 1,400 ms. The combat and magic sounds (now real recordings) were decoded during the first map frame; they now wait 5 s and then for an idle moment (`gameAudio.ts`; a sound needed earlier loads on first use). Again: local **229 / 879 ms**, web **467 / 885 ms** (before this round 219 / 960 and 440 / 1,009) |
| `python3 tools/audio/import_sounds.py --from <identified files>` | 85 sound IDs converted and registered, manifest 91 entries all `final`; the 73 effects and stingers converted again with their trailing silence trimmed at the same matched level (e.g. `ui.click` 1.52 → 0.55 s, same active RMS) |

Not checked: a run on Windows itself (the installer is unsigned and was
only built and unpacked here), a human play-test of the new values, and the
map editor and the new layouts on real hardware.

**Delivery.** Bundle 20 (hash-checked against HEAD `9eaea29` plus the
owner's Brief 12 working tree; `apply_sync.py`, not committed) wrote 214 files
and removed the 1,067 approved files (the clean-up above and the 94 audio
placeholders the recordings replaced); one file had changed on the owner's
computer since HEAD (`assets-source/icons/ICON_CATALOG.xlsx`, rewritten by the
Brief 12 import) and was removed with the owner's current version checked.
The installer was copied to the owner's `installer\` folder in 26 parts and
joined there (SHA-256 checked: `7ea20e70…1935`). The 106 Pixabay downloads in
the owner's Downloads folder were deleted after conversion, as the owner
asked; their sources stay listed in `assets-source/audio/sounds.json`.

## Map music, climate rules, AI temperaments, the god commitment, Brief 12 and the visual-completion delivery (owner requests, 2026-10-04)

Five owner requests and one delivery, in the cloud copy and the owner's
folder (bundle 19, hash-checked; not committed, not yet in a Windows installer).

* **Map music per pantheon (final audio, licensed).** 30 royalty-free tracks
  from Pixabay under the **Pixabay Content License (no attribution
  required)**, five per pantheon, downloaded with the owner's approval; only
  tracks not marked AI-generated and without a YouTube Content ID claim were
  taken. `tools/audio/import_music.py` converts them (two-pass EBU R128 to
  −16 LUFS, true peak ≤ −1.5 dBTP, Ogg Vorbis q2, 44.1 kHz stereo) into
  `assets-runtime/audio/music/<pantheon>/` and registers `music.map.<pantheon>`
  (status **final**, provenance with each title, author and page; the list is
  `assets-source/audio/music/tracks.json`). Measured: 157.8 minutes, 104.4 MB
  (Greek 25.2 min, Norse 26.8, Egyptian 20.4, Japanese 35.5, Celtic 20.1,
  Mesoamerican 29.7). The adventure map, town and hero screens play the
  **viewing player's** pantheon playlist: a random first track, then the
  others in order with a crossfade, streamed through a media element (never
  decoded whole); a file that fails is skipped, and silence never blocks play.
  Without an entry the mission's soundscape music plays as before. Battle,
  menu and the remaining music stay placeholders (Settings says which).
* **Climate rules (skirmish and random maps only; `climateRules`).** Nine
  biomes carry a battle climate (`catalog.climates`): Harvest wind (+1 Speed
  for fliers), Salt spray (shooters −3 range), Scorching sand (−1 Speed
  without Flight), Icy spray (−1 Defense), Thin air (shooters +2 range, fliers
  −1 Speed), Dense canopy (shooters −4 range, fliers −1 Speed), Fog (shooters
  −6 range), Thunderstorm (fliers −2 Speed), Biting cold (−1 Attack). Both
  armies alike; the encounter dialog names it and the battle shows a chip with
  the sentence as tooltip. The random-map setup can turn it off. Campaigns
  keep it off. Icons are interface glyphs until Brief 12 part C is delivered.
* **AI temperaments (skirmish and random maps only; `aiTemperaments`).** Each
  AI empire plays its pantheon's way — a change to the AI's choices, never to
  a rule (`packages/content/src/common/temperaments.ts`,
  `packages/ai/src/temperament.ts`): Greek **Strategists** (neutral), Norse
  **Raiders** (attacks at a lower strength margin, values rival heroes, towns
  and mines 1.3×, one extra hero, favours military buildings), Egyptian
  **Builders** (economy and defense buildings first, attacks later), Japanese
  **Disciplined** (elite dwellings first), Celtic **Mystics** (Mage Guild
  first, a little more weight on casters and magic skills), Mesoamerican
  **Devout** (keeps making Temple offerings from garrisons once its gods are
  chosen). The setup names the rival's temperament; the random-map setup lists
  one per AI seat and has a "Pantheon temperaments" switch. The Three Beacons
  stays neutral (checked by a unit test). Values are proposals, tuned by
  AI-vs-AI runs, not playtested.
* **The god commitment.** The confirmation dialog shows the god's blessing and
  price icon rows (each token keeps its sentence as tooltip and screen-reader
  text) and the gods the choice shuts out; the patron panel carries its role
  and permanence icons. When the command succeeds the card glows, rays turn
  behind the portrait and a seal lands on it (about 1.5 s, once, after the
  rule result; nothing under reduced motion). The burst is the Anointing
  gift's strip until `fx.god.commit` is delivered (Brief 12 part F).
* **GPT-6 Brief 12 — every visual still missing**
  (`assets-source/art/briefs/GPT6_BRIEF_12_REMAINING_VISUALS.md`,
  `npm run art:brief12`, generated from the game): A 84 creature dwellings
  (34 of today's crops show a different building), B 42 town services, C 9
  climate icons, D 8 random-map site markers, E 6 sharper town backgrounds
  (optional), F the commitment effect (optional) — 14 sheets, 143 cells, with
  cut layouts in `assets-source/sprites/sheet-layouts.brief12.json` and town
  layout guides (`assets-source/art/briefs/guides/town.<pantheon>.layout.png`)
  that outline every plot. It takes this round's delivery into account (the
  Workshop treasures, set emblems, ability badges, the Herald and the twelve
  paintings are listed as delivered).
* **The visual-completion delivery** (`visual-completion-2026-10-04`): 33
  icons (9 Workshop treasures, 14 creature-ability badges, 10 artifact-set
  emblems) → `assets-source/icons/final` and `npm run icons:import -- --new`
  (only the 33 new files and manifest entries; every other icon byte-identical
  to the owner's); the Herald's bust → `assets-source/art/final` and
  `npm run art:import` (`assets-runtime/art/busts/story.herald.bust.webp`,
  768 × 1152, kind `bust`, alphaBox [0.036, 0.011, 0.967, 1.0]; the content
  keeps `story.herald.portrait` as fallback; the importer's self-test now
  recognises the name, 12/12); the twelve quieter opening paintings →
  `assets-source/ui/backgrounds` and `prepare_ui_art.py` (12 WebP and 12
  manifest entries, one new: `menu.background.mesoamerican-battle`; branding,
  cursors and icons unchanged; the eleven old paintings stay archived in
  `backgrounds-old` and are not imported). No rule, balance, save or existing
  asset ID changed; no runtime code refers to the delivery folder.
* **Importer fixes.** `art:import` used to delete runtime art whose master was
  not in the checkout (54 battlefield files in the cloud copy; restored from
  the owner's folder before anything was delivered): it now keeps them unless
  `-- --prune`. `icons:import` re-encodes and re-dates every icon; `-- --new`
  imports only icons not yet registered.

**Measured AI-vs-AI skirmish win rates** (Twin Harbors, both sides AI, average
against the other five; ⚠ band 0.35–0.65):

| Pantheon | Temperaments on (288 matches) | Off (216 matches) |
|---|---|---|
| Greek | 0.44 | 0.49 |
| Norse | 0.45 | 0.40 |
| Egyptian | 0.47 | 0.55 |
| Japanese | 0.47 | 0.46 |
| Celtic | 0.63 | 0.63 |
| Mesoamerican | 0.54 | 0.47 |

With temperaments on: west town 0.45, first mover 0.47. The first tuning made
Celtic 0.73–0.78 and Mesoamerican 0.22–0.31; ablations traced these to the
magic-skill weight and to building the Temple early, which were cut back
(final: Mystics' magic weight 1.1; Devout's faith weight 1.25, which only
tips close build choices).
Celtic stays at the band's edge with temperaments off too (an existing
imbalance, not this round's).

**Code changes:** rules definitions (`AITemperamentDefinition`,
`ScenarioFeatures.aiTemperaments`, `catalog.aiTemperaments`; climates in the
battle setup), content (`climates.ts`, `temperaments.ts`, validators,
feature defaults), mapgen option, AI (`temperament.ts`, `strategic.ts`,
`services.ts`, `growth.ts`), audio (`playlist` entries, streamed playlists in
`director.ts`), UI (`sounds.ts`, `gameAudio.ts`, Settings note,
`components/temperament.tsx`, Setup, RandomSetup, Pantheon commit dialog and
moment, ClimateChip, styles), tools (`import_music.py`,
`make_placeholders.py` keeps final entries, `import_story_art.py`,
`import_icons.py --new`, `prepare_ui_art.py` provenance, `brief12.measure.ts`,
`town_guides.py`, `inventory.measure.ts`, balance `--no-temperaments`). New
tests: `ai/test/temperament.test.ts` (8), audio playlist tests, the pantheon
music test, `round19.spec.ts` (4), `round19b.spec.ts` (4); `audio.spec.ts`
now expects `music.map.greek` on the campaign map.

| Command | Result |
|---|---|
| `npm run check` | boundaries + type-check OK; 40 files / 365 tests passed |
| `npm run build` | OK; start-up script 2,008.34 KB / 466.70 KB gzip (before: 1,976.57 / 459.42 — the manifests grew); `dist` 363 MB (the music is 104 MB of it) |
| `node tools/perf/load-time.mjs` | local: menu 219 ms, first scene 960 ms; web profile: menu 440 ms, first scene 1,009 ms (before: 194 / 910 and 448 / 1,153) |
| `npm run balance -- skirmish --matches 4 --jobs 2` / `npm run balance -- skirmish random --matches 3 --jobs 2 --no-temperaments` (reports in a scratch folder, not kept in the repository) | the table above (2.5 and 5.4 min) |
| `npx playwright test tests/e2e/round19.spec.ts tests/e2e/round19b.spec.ts` | 8 passed: fog on the moor (encounter line, battle chip, range −6), temperaments in both setups and the switch, the commit dialog and moment (none under reduced motion), the nine treasures and set badges (active and inactive) on the hero screen, the ability badges with their names (retaliation and the four shapeshift forms are eight different pictures), the Herald's bust in the Eastharbor briefing (768 px wide), and over each of the 12 paintings at 1280 × 720 (the desktop window's minimum) and 1280 × 800: the logo, the four menu buttons, Continue disabled with its reason, New Game focused, Load hovered; no drift under reduced motion |
| Playwright, every spec (`--grep-invert zz-`, 102 tests) | 100 passed, 2 failed in 40.9 min — both in `round19b.spec.ts` and test-side: the hero-screen icons and the Herald's bust were read before the busy machine had decoded them (`complete` false, `naturalWidth` 0). The checks now wait for the pictures (up to 15 s), and the menu check also asserts the disabled Continue and New Game's keyboard focus; `round19b.spec.ts` re-run: 4 / 4 passed (4.0 min) |
| `python3 tools/assets/import_story_art.py --self-test` | 12 / 12 |
| `npm run desktop:build` + `npx electron-builder --config electron-builder.json --linux dir --x64` (no Windows installer this round) | OK; `app.asar` 373.5 MB, 3,225 entries: the 30 music files, the Herald's bust, the 12 paintings (with `opening-mesoamerican-battle.webp`), the 33 new icons and both manifests, byte-equal to `assets-runtime` (six spot-checked by hash); no `assets-source`, tools, MCP servers, Playwright or source maps |
| Packaged offline smoke (`unshare -n`, loopback only; `PR_SMOKE_EXE=…/linux-unpacked/pantheon-realms xvfb-run -a node tools/desktop-smoke.mjs`) | DESKTOP SMOKE OK: map on WebGL, saves and records written, 1,218 sprite files, 382 painted pictures, 532 interface images, 92 sounds (86 + the six map playlists), packaged without DevTools |

Known limits: I chose the tracks from their pages and measured them; I did not
listen to them, so three of them picked for variety (Temple of the Heights,
Herr Mannelig, Spirit Tribe) may be livelier than the rest — remove a track by
deleting its line in `tracks.json` and running
`import_music.py --register-only`. The music adds about 104 MB to the
installer. The menu paintings were checked in SwiftShader screenshots (all 24 looked
at), not by a person on a real screen. The climate icons, site markers and the
commitment strip are stand-ins until Brief 12 is delivered.

## Gods, heroes, town levels and map-hero animations in the game (owner delivery of briefs 8–11, 2026-10-04)

The owner's delivery (`blannder_models\gods_heroes_towns_delivery_2026-10-04`,
287 assets) had already been copied into the owner's folder with its own
scoped `copy_to_project.py` (not committed). Checked there: all 287 runtime
files and all 659 payload files hash-equal to the delivery's
`asset-index.json` / `bundle-files.json`, and the three merged manifests only
**add** entries (UI 155 IDs, art 72, sprites the six avatars' `prepare` and
`cast`); no existing entry changed or disappeared. The cloud copy took the same
files and manifests (hash-checked again after transfer). Nothing is loaded
from the art project at run time.

* **60 god portraits and 74 hero portraits** (painted, 256 × 256 WebP): every
  god and hero of the content has its own (IDs matched one for one). They
  reach every screen through the existing portrait components — god choice and
  Pantheon screen, Encyclopedia, Tavern, the map's hero list, hero screen,
  encounters — and **the battle header now shows each commanding hero's
  portrait** beside the name (neutral guards have none).
* **72 town building levels** (`town.<pantheon>.support.<building>.lN`,
  320 × 320 transparent cutouts): the town already picked the exact level's
  picture, so they appear with no code change; checked for all six towns at
  levels 1–4 (Civic Hall 1–4, Temple 1–2, Mage Guild 1–3, Fortifications 1–3),
  drawn in proportion over the painting with their transparency.
* **21 god-card icons** and the **icon rows** the brief asked for
  (`components/godIcons.tsx`): on the Pantheon screen and in the
  Encyclopedia each blessing is a token of who or what improves, the
  attribute or resource icon and the definition's number; the price is the
  Favor icon and cost and one icon per requirement (temple level 1 or 2, civic
  hall, after the first choice), outlined red when unmet; the state chips
  carry the patron, first/second choice, committed and excluded icons, and the
  choice rule the permanent icon. Each token's tooltip and screen-reader text
  is the content's own sentence, so no number or condition is lost; the
  missing-requirement list and the reasons stay visible under the card.
  Patrons without a mechanical blessing keep their sentences. Eight icons were
  cut at their native 192–250 px (not enlarged); the icon test now allows that.
* **60 map-hero strips** (`prepare` and `cast`, five drawn directions, 6
  frames at 6 fps, played once, their own frame size, anchor and 90 px per
  hex). `prepare` now plays on the beat's clock and **holds its ready pose
  until the map closes for the battle** (it used to drop back to idle at the
  end of the beat); an abandoned encounter returns the hero to idle; a second
  beat request for the same hero while one is pending is skipped. Map spells,
  Homecoming included, play `cast` once with the spell's own effects, then
  idle. The camera is unchanged (pan and zoom only; zoom keeps the angle).

**Code changes (presentation, UI, tests, tools; no rule or content change):**
`presentation/src/adventure.ts` (prepare hold, double-beat guard, Homecoming
cast), `ui/src/components/godIcons.tsx` (new), `ui/src/screens/Pantheon.tsx`,
`Encyclopedia.tsx`, `Battle.tsx`, `ui/src/components/art.tsx`
(`HeroPortrait` takes a snapshot's portrait ID), styles,
`tools/assets/icon-catalog/inventory.measure.ts` (delivered art is no longer
counted as missing; god-card icon notes). Tests: `godIcons.test.tsx` (new:
every designed god's blessings have icons carrying their sentence and number;
prices; the 21 files), `sprites.test.ts` (prepare/cast metadata and
mirroring), `uiArt.test.ts` (native-size icons), `heroes.spec.ts` (the
delivered prepare strip is what is drawn and held), `round12.spec.ts` (the
caster draws `cast`, then idle).

**Docs:** ASSET_PIPELINE.md (top note, §12, §13), CLAUDE.md, ICON_CATALOG.md
(regenerated: 834 entries, 23 without art of their own — seven Workshop
artifacts and 16 story characters).

| Command | Result |
|---|---|
| Delivery audit (device: Python over the owner's folder; cloud: after transfer) | 287 / 287 runtime files and 659 / 659 payload files equal the delivery's hashes; manifests: +155 UI, +72 art, +648 sprite keys, 0 changed, 0 removed; every god and hero of the content has its portrait ID delivered, every delivered town level is a content building's art |
| `npm run check` | boundaries + type-check OK; 38 files / 346 tests passed (new `godIcons.test.tsx`; `sprites.test.ts` +1) |
| `npm run build` | OK; start-up script 1,976.57 KB / 459.42 KB gzip (before: 1,910.96 / 453.79) |
| `node tools/perf/load-time.mjs` | local: menu 194 ms, first scene 910 ms; web profile: menu 448 ms, first scene 1,153 ms |
| Playwright, every spec (`--grep-invert zz-`, 94 tests) | 94 passed in 36.0 min. Before it, one failure fixed: the Encyclopedia's Towns cards differed by 29 px once the square level pictures loaded after the cards were equalised (the building picture now has a fixed 4:3 box drawn with `contain`, and cards re-equalise when a picture loads); `heroes.spec` and `round12.spec` re-run with their new assertions: pass |
| Visual tour (temporary spec, 1280 × 720, SwiftShader; deleted afterwards) | per pantheon: Pantheon screen with icon rows (first choice committed in three, so committed and excluded show), the map hero idle → `cast` (Far Sight, Fleet Foot) → idle and idle → `prepare` facing the rival in six directions (`e`, `ne`, `nw`·mirrored, `w`·mirrored, `sw`·mirrored, `se`; the readout matched the expected facing every time), the battle header portraits; all six towns at levels 1–4 (each location requested its exact `.lN` picture); Encyclopedia gods and heroes; the Tavern |

Known limits: checked in SwiftShader captures at 1280 × 720 (not at speed on a
GPU, not by a person). The `n` and `s` strips are not reachable as neighbour
directions on the map and were checked only by metadata. A prepare beat
abandoned by leaving the map is covered by the existing test; there is no
in-game "cancel" once the battle is accepted. The start-up script grew to
1,976.57 KB (453.79 → 459.42 KB gzip) because the embedded manifests grew.

## Magic and Favor strips, town icons and battlefield climates in the game (owner delivery, 2026-10-04)

The owner's delivery (`blannder_models\magic_icons_battlefields_delivery_2026-10-04`,
237 new assets) had already been imported into the owner's folder and committed
(HEAD 2de3a50); the cloud copy took the same runtime files and manifests (all
237 runtime files SHA-256-checked against the delivery's `ASSET_INDEX.json`,
and the three manifests equal to HEAD; the delivery's `FINAL_VALIDATION.json`:
237 passed, 0 failures). Nothing is loaded from the art project at run time.

* **177 VFX phase strips** under their full `fx.*` IDs (9 status overlays, 117
  battle-spell, 15 adventure-spell, 28 miracle phases, 6 gifts, 2 offering
  phases) next to the nine shared effects; loops only for status overlays,
  `travel` and `aura`.
* **6 town-action icons** (`icon.ui.build`, `recruit`, `market`, `tavern`,
  `merchant`, `gift`): they replace the SVG stand-ins through the existing
  icon lookup (no code change).
* **54 battlefield paintings** (`battlefield.<archetype>.ground.<climate>`,
  six archetypes × nine climates), native 1419 × 1108 (the proportions of the
  4096 × 3200 layout; not 4K, not enlarged); the battle picks them from the
  map's climate, temperate keeps the default painting.

**Code changes (presentation and tools only; no rule or content change):**

1. **Importer fixed** (`tools/assets/sprites/import_sprites.py`): it stripped
   the `fx.` prefix and forced every effect to play once; it now keeps full
   `fx.*` IDs (the nine shared effects keep their short IDs), takes `loop` and
   `additive` from the sidecar, and imports a subset with `--only`. Regression:
   `--self-test` (synthetic strips in a temporary project) run by
   `packages/presentation/test/importSprites.test.ts`, which also checks the
   game manifest (no stripped IDs; loops only where the brief plays one).
2. **Map aura loops**: Fleet Foot and Wings of Hermes loop their `aura` strip on
   the hero for the rest of the day they were cast (the interface keeps the
   cast — match, hero, day — while the session lasts; presentation only, not
   saved, so a reload drops the aura though the extra movement stays). A still
   frame under Reduce motion, nothing on Low quality. Read-only `aura` in the
   map's hero readout (`__prHeroes`).
3. **Whole-view strips** cover the view with their proportions kept (no
   stretching), at 60 % opacity easing in and out, mirrored for the defender;
   they now also play for the seven map miracles, whose drawn look has no
   whole-view moment (their `screen` strips were otherwise never shown).
4. **Homecoming** plays its `cast` phase on the hero before `depart`/`arrive`.
5. **Town**: the gift's strip, smaller and centred, also lands where the gift
   goes — the resource counters, the visiting hero's portrait (Anointing,
   Temple Relic) — and `fx.offering.favor` plays on the Favor counter after an
   offering, once the dialog has closed. Strip bursts follow the window height
   (frame pixels were fixed before). Found in the tour: a counter burst placed
   straight in a screen was made `relative` by `.screen > *` and drawn below
   the window; it now keeps `position: fixed` (two-class rule).
6. **Status overlays** from strips show their first frame as soon as the strip
   loads, so they read as still shapes on Low quality and under Reduce motion.
7. `packages/presentation/test/vfxHooks.test.ts`: every delivered `fx.*` strip
   is one the game asks for.
8. Map area scale checked: the strip's ring spans two hexes at scale 1 and is
   scaled to (reveal radius + ½) hex widths, so its diameter is twice that —
   no double scaling.

**Docs:** `VFX_MAGIC_AND_FAVORS.md` (generator now marks delivered IDs: 177 of
177 ✓), `ICON_CATALOG.md`, ASSET_PIPELINE.md §5, §11 and §13, CLAUDE.md.

| Command | Result |
|---|---|
| `python3 tools/assets/sprites/import_sprites.py --self-test` | self-test passed (synthetic strips in a temporary project) |
| `npm run check` | boundaries + type-check OK; 37 files / 341 tests passed (including `importSprites`, `vfxHooks`, the 54 climate paintings in `groundArt`) |
| `npm run build` | OK; start-up script 1,910.96 KB / 453.79 KB gzip (before: 1,839.60 / 448.99) |
| `node tools/perf/load-time.mjs` | local: menu 216 ms, first scene 1,129 ms; web profile: menu 453 ms, first scene 1,293 ms |
| Playwright `bigMoments`, `groundArt`, `round11`, `round12`, `services`, `sprites2d` | 33 tests passed (two runs; the first stopped at the 10-minute tool limit after 22 passes, the rest re-run) |
| Visual tour (temporary spec with video, 1280 × 720, SwiftShader; deleted afterwards) | battle: Lightning (cast, sky travel, impact), Rallying Hymn (whole view), Ill Omen and Blessing (status overlays), Ember Burst; Thunderbolt miracle (card, then whole view, then impact); map: Far Sight, Fleet Foot (aura readout `fx.spell.fleet_foot.aura`, ring at the hero's feet), Favorable Winds, Homecoming (cast, depart, arrive); town: offering (rise at the temple, sparkle on the Favor counter), Temple Treasury (temple burst, coins on the Gold counter), the six action icons; 60 battles — six archetypes × ten climates — each requested its own painting (`battlefield.<archetype>.ground.<climate>`, the default for temperate) and showed it under a readable board |

Known limits: the effects were looked at frame by frame only in SwiftShader
video captures at 1280 × 720 — not at speed on a GPU or by a person. The start-up
script grew to 1,910.65 KB (448.99 → 453.63 KB gzip) because the sprite and art
manifests it embeds grew with the delivery. An aura set before a reload is not
shown again after it.

## App 0.11.0: the delivered 2D art in the game, and the owner's 21 requests of 2026-10-04

**Delivered 2D art (owner commit 071968c).** The owner's GPT-6 delivery is
read through the manifests only (no code names a file): in
`assets-runtime/sprites/manifest.json` all **102 creature forms**, the **six
pantheon map heroes** (idle and walk in all eight
directions), **41 map locations**, 6 decorations, 7 obstacles, 12 siege pieces, 2
projectiles and 9 effect strips are `final`; only the neutral map hero is
still a placeholder. The delivery note reports thirteen creature strips that
hold or reuse a few generated poses to keep weapons continuous (sidecar
`assemblyNote`; listed in the delivery's `frame-assembly-recipes.json`). Checked by screenshots (SwiftShader, 1600 × 900) in each
context: every pantheon's hero on the map (standing, zoomed, walking in
several directions), a revealed random map with every kind of location, a
battle per pantheon and two neutral groups with all seven base forms against
their upgrades, the bestiary viewer (every animation button of a sample per
pantheon) and the hero screen. The shared effect strips (`spell.damage`,
`spell.area`, `spell.heal`, `spell.buff`, `spell.curse`, `ward`) now stand for
a spell's or miracle's impact when its look matches (`genericImpactOf`,
`fx.ts`); other impacts stay code-drawn. Not checked by a person at speed on a
GPU.

**The 21 requests**, one by one (proposed values, not play-tested):

1. **Encyclopedia:** the line under a creature's name (form · role) is gone.
2. **Gods and their icons for GPT-6:** `assets-source/art/briefs/GPT6_BRIEF_8_GODS_AND_ICONS.md`
   — part A, the 60 god portraits on 6 sheets (one per pantheon, from Brief 4's
   descriptions); part B, **21 god-card icons** on one sheet (advantage: who
   benefits, growth, recovery, a spell to learn, daily income, offerings,
   fury; price: Temple, Grand Temple, City Hall, after the first choice;
   state: patron, first/second choice, committed, excluded, permanent),
   listed in `tools/assets/briefs/godIcons.ts` and in the icon catalog (new
   section *God-card icons*). **The god cards do not use them yet**: the icon
   row is built once they are delivered; until then the cards keep their
   sentences.
3. **Hero portraits for GPT-6:** `GPT6_BRIEF_9_HERO_PORTRAITS.md` — 74 heroes on 6
   sheets (one per pantheon, 4 columns), with each hero's class, title and
   story, and the dialogue bust attached where one exists.
4. **Twelve new hireable heroes (proposed)**, three each: Egyptian Ahmose
   (Medjay), Tiye (Vizier), Peseshet (Lector Priest); Japanese Kusunoki
   Masashige (Daimyo), Abe no Seimei (Onmyoji), Hangaku Gozen (Samurai);
   Celtic Medb (Chieftain), Amergin (Druid), Fergus mac Roich (Fian);
   Mesoamerican Moctezuma Ilhuicamina (Tlatoani), Lady Six Sky (Jaguar
   Knight), Chilam Balam (Day-keeper). Each has a specialty from the shared
   vocabulary and a short story; they use generated portraits until Brief 9
   is delivered. 74 heroes in all; each of these four pantheons now has 8
   hireable heroes; the random tavern pool is 47.
5. **Town building levels for GPT-6:** `GPT6_BRIEF_10_TOWN_BUILDING_LEVELS.md`
   — the locations whose levels all share one painting (Civic Hall 4 levels,
   Temple 2, Mage Guild 3, Fortifications 3 in every pantheon): 72 level
   pictures on **6 sheets** (4 columns × 4 rows, one row per building), cut by
   `npm run sprites:cut` into `assets-source/art/final/<level asset ID>.png`
   and imported by `npm run art:import` (new kind `building`, kept
   transparent, at most 512 px, into `assets-runtime/art/town/`). The town
   already asks for the exact level's picture first, so a delivery needs no
   code change.
6. **The Workshop:** the Blacksmith/Workshop is called **Workshop** in every
   pantheon. A new effect type `enables_workshop` (stock size, rarities) on
   the Greek and Norse workshop buildings and, through the pantheon kit, on
   the other four. Every week it shows **four different tier-1 items**
   (rarity *treasure*; 9 new plain-gear items added, 12 in the pool) drawn
   from the match seed and the week; a bought item is marked *Sold — back in
   stock next week* until the new week. The store (`WorkshopModal`, from the
   town bar or the Workshop's pop-up) shows the visiting hero who receives the
   item, the week and days to the next stock, and four counters with icon,
   slot, effect, price and Buy. Skirmish-only: The Three Beacons keeps its
   content core-only, so its Workshops have no wares and no store button.
7. **Neutral reactions:** when a strong enough army approaches, neutrals now
   offer to **join a quarter as often** and **flee a third as often** as
   before (`NEUTRAL_JOIN_CHANCE`, `NEUTRAL_FLEE_CHANCE`, `systems/sites.ts`);
   otherwise they stand their ground. The roll is fixed per group, hero and
   day (`seedFromLabel`), so reloading does not change it; the next day can.
8. **Creature details:** statistics and abilities on the left, the animation
   viewer on the right.
9. **Map hero facing and animation brief:** the hero plays the strip of each
   step's direction (all eight directions are in the manifest for the six
   pantheons), checked through the read-only `__prHeroes` readout
   (`facing: "e"` walking east, `"w"` walking west, on screenshots too). `GPT6_BRIEF_11_MAP_HERO_ANIMATIONS.md`
   asks for the two missing moments for all six pantheons: **prepare**
   (starting a battle) and **cast** (a map spell), one 12 × 5 sheet per
   pantheon; the importer and the map view already play them when delivered
   (until then the code-drawn rise and the sigil).
10. **Around the map:** black — the sea, sky and per-tile noise around the map
    are gone (new terrain `void`, code `v`, impassable, never hovered or
    fogged).
11. **Battle facing:** before an attack the attacker turns toward its target
    and the target toward the attacker; after the blow both turn back to
    their side's facing (the fallen stay as they fell).
12. **Campaign victory:** the debrief is wider (70rem when there is a next
    mission) and its three buttons stand on one line.
13. **Mission summary:** no subtitle under the title; the over-time charts
    have a 10 % padding inside their cards.
14. **Random map setup:** no subtitle, no map picture (the settings use the
    full width), no seed field (a new seed is drawn at each Start); up to
    **six empires**, four or more only on Large or Huge maps (the smaller
    sizes are disabled with the reason); a line under *Starting wealth*
    gives the actual treasury. Random maps are **square** at every size
    (mapgen `pr-skirmishgen-0.5`: a square of land, `void` outside it,
    mountains in the corners; five empires use the six-fold layout with one
    wild sector).
15. **Map pace and frame:** the hero walks slower (360 ms per step, was 210;
    the walk strip at 0.7× its rate). Random maps have no Objectives card.
    The minimap is **twice as large** everywhere (it shows only the map's
    land, black around it). The camera stops half a hex past the map's edge.
16. **Map controls:** End Day sits at the top centre under the resources; the
    eight buttons are centred at the bottom with no card around them.
17. **Tiles:** no lines between tiles; the hovered tile is outlined (the
    *Hex grid* setting now defaults to *on hover*, and a saved *always* moves
    to *on hover* once: preferences schema 3). The tile pop-up has no "Tile"
    title or divider, no grid position and no route cost tag (only the
    reason when the tile cannot be reached).
18. **Resource icons:** the plate around each resource icon is removed (the
    `res.*` icons regenerated by `prepare_ui_art.py`; only the icon remains).
19. **Town:** a building is built on click, with no confirmation.
20. **Battle deaths:** a killed stack plays its hit, then its death once.
    The cause was a race (the view applied the new state before its
    animation hold); now `AppStore.registerPreparer` holds the stacks
    synchronously, and `sufferBlow` / `die` never play a death twice. The
    battle readout counts `deaths` and `hits` per stack; `round10.spec`
    checks one death per killed stack.
21. **Miracles:** a book in the spellbook's style (`components/miraclebook.tsx`)
    — tabs All / Battle / Map with counts, the Favor gem, painted card
    thumbnails with their cost, the target and the reason when unavailable —
    in battle (an enemy-stack miracle asks for its target next; the others act
    at once, without a confirmation) and on the map (Divine Interventions).

Also: a selected option of a segmented control keeps its gold look under
the mouse.

| Command | Result |
|---|---|
| `npm run check` | pass — boundaries, type-check, 35 files / 337 unit tests (new: rules `workshop.test.ts`, presentation `genericImpact.test.ts`; counts updated for 74 heroes, the 47-hero tavern pool, 8 hireable heroes per later pantheon, preferences schema 3, the `void` colour, random maps 0.5) |
| `npm run build` | pass — start-up script 1,839.60 KB / 448.99 KB gzip (0.10.0: 1,730.94 / 433.31); most of the growth is the delivered sprite manifest, which the start-up script embeds (318 KB of JSON, 194 KB in 0.10.0) |
| `node tools/perf/load-time.mjs` (3-run medians, SwiftShader) | menu 205 / 446 ms, first scene 1,116 / 1,369 ms (local / throttled web) |
| `npm run art:briefs` | briefs 8–11: 7, 6, 6 and 6 sheets |
| `npm run icons:catalog` | 834 entries in 13 sections (new: *God-card icons*, 21; the twelve new heroes' portraits) |
| `npm run sprites:queue` (run once, output not kept) | 0 sheets left in groups A–E, G and H. The generator now leaves out delivered map heroes and the reference views of forms whose strips are all final, and keeps the layouts of delivered sheets for re-cuts. Its output was **not kept**: `GPT6_2D_CONTENT_GENERATION.md` and `sheet-layouts.json` stay exactly as delivered (the delivery note asks not to rebuild the queue over the delivery). `cut_sheets.py --self-test` passed; no delivered sheet was re-cut |
| `npm run vfx:list` | unchanged (0 looks missing) |
| Playwright, every spec (fresh build) | 136 tests in three runs: 92 passed, 6 failed, 42 skipped (the opt-in review sweep). The 6 were test-side: four expected placeholder sprites that the owner's delivery replaced (`heroes.spec`, `sprites2d.spec`; now read the status from the manifest), one panned vertically at the opening zoom, which the tighter camera no longer allows on Twin Harbors (now zooms in first), and `groundArt.spec` expected the sky (now checks it is not loaded). Re-runs of the three specs: 14 / 14 pass. `campaign.spec` now also checks that the debrief's three buttons share one line |
| Visual check (screenshots, 1600 × 900) | random setup (six empires), a six-empire random map, the map HUD, tile pop-up, hero walking east then west, the map and battle miracle books, the Workshop before and after a purchase, the Encyclopedia, creature details, the debrief, the mission summary |
| `npm run desktop:build` + electron-builder (Windows NSIS x64, Linux dir) | `Pantheon-Realms-Setup-0.11.0-x64.exe`, 290,744,270 bytes, SHA-256 `d76175c4914fad9b9b582dc58398a6c355b49674f10a6217e69c6abe48f3f30a`; `app.asar` 183.8 MB, 2,616 entries, no development tools, MCP servers, sources, tests, briefs or 3D files. Unsigned; not run on Windows |
| Packaged offline smoke (`unshare -n`, loopback only; `PR_SMOKE_EXE=…/linux-unpacked/pantheon-realms xvfb-run -a node tools/desktop-smoke.mjs`) | DESKTOP SMOKE OK: map on WebGL, saves and records written, 981 sprite files, 255 painted pictures, 338 interface images, 86 sounds, packaged without DevTools |

Known limits: the shared impact strips are wired and unit-tested but were not
seen frame by frame (the SwiftShader screenshots missed their few frames). The
ten sky paintings are no longer shown (their files stay in the game, 1.1 MB).
The god-card icons, hero portraits, town level pictures and
map-hero prepare/cast strips are briefs only (nothing delivered); the new
items and heroes show glyph and generated stand-ins (the cloak shows the
movement glyph, a boot, until its icon is delivered). Content values changed
without a version bump (`content-0.8.0`): 0.10.0 saves still load; an
existing Workshop starts its stock at the next week.

## Magic and Favor effects, new sounds, app 0.10.0 (owner requests 1, 7 and 6, 2026-10-03)

All presentation (no rule, content value or save change; the content
change is presentation data: the missions' `soundscape`). Everything new is a
**placeholder** until final art and audio are delivered.

**1 — Code-drawn magic and Favor effects** (`VFX_MAGIC_AND_FAVORS.md`):

* `packages/presentation/src/fxLooks.ts` (core, no Pixi): a *look* for every
  spell (54), divine intervention (14) and divine gift (6) — colour school
  (28 palettes), travel, impact (23 kinds), whole-field moment (8), reach and
  sound family — from its effect type, refined per ID; new content gets one
  automatically. `fx.ts` paints them (sigil, bolt / orb / arrow / swarm /
  wisps / sky strike, the impacts, map rings, field moments) on the view's
  tween clock, so instant playback and Skip finish them at once.
* **Battle:** each spell gathers at its commander's banner corner, travels,
  lands on every stack it reaches (target; target and the stacks beside it
  for area spells; the whole side for army spells, with the field moment),
  then the numbers — split per stack when the total divides evenly — or the
  effect's word ("Attack −3", "Blessed"). Battle miracles play after their
  painted card closes (the view holds the stacks meanwhile), then the light,
  dome, banner or smite on each stack; a smite shows its damage.
* **Status overlays:** each status leaves a looping overlay with its own shape
  (rising or falling chevrons, a studded ground ring, a broken ring, wind
  arcs, violet haze, gold sparkles, a grey cloud with a crow, a shield, a
  dome); they appear when the spell lands and stay still on Low quality and
  under Reduce motion.
* **Map:** the sigil on the casting hero; Far Sight / Clear Skies / Divine
  Sight / Eye of Horus spread a ring over the chosen tile; Fleet Foot and
  Wings of Hermes wind round the hero; Homecoming lifts the hero away in a
  column of light and sets it down at the town. The player's own map
  miracles: wind or mist on every hero, motes over heroes or the chosen
  town, coins over the capital and over the Gold counter.
* **Town:** gifts and offerings rise from the Temple (coins, timber and stone,
  crystals, light; Blessed Brood lights each dwelling) — CSS bursts.
* Every phase first looks for a delivered strip under its asset ID
  (`fx.spell.<id>.<phase>`, `fx.miracle.<id>.<phase>`, `fx.status.<name>`,
  `fx.gift.<id>`, `fx.offering.rise`) and plays that instead. Not drawn yet:
  the two map `aura` loops (a trail while Fleet Foot / Wings of Hermes last).

**7 — Sounds** (34 new IDs, 86 in all; **synthesized in code**: the free sound
sites and generation services were not reachable from the development
environment — blocked by its network policy — so nothing was downloaded and
no service was used):

* Spellbook: `ui.book_open`, `ui.book_close`, `ui.book_page` (a filter
  change); town: `ui.popup` (a building's pop-up), `ui.town_action` (market,
  tavern, temple, merchant).
* Magic: `magic.cast` and one sound per look family (`magic.strike`,
  `thunder`, `fire`, `heal`, `bless`, `curse`, `wind`, `frost`, `nature`,
  `swarm`, `water`, `shadow`, `holy`, `smite`, `reveal`, `teleport`,
  `coins`, `horn`) for battle spells and miracles, map spells and miracles,
  gifts and offerings.
* Soundscapes (music + ambience loops): `fjord` (The Winter Oath), `desert`
  (Egyptian campaign), `shrine` (Japanese), `glen` (Celtic), `jungle`
  (Mesoamerican) — new modes (hijaz, two pentatonics), instruments (reed,
  bamboo flute, tin whistle, clay flute, koto, harp) and drum patterns.
  Each of those campaigns now uses its own soundscape and keeps
  `storm_plateau` for its darkest missions; The Three Beacons is unchanged.
* Loudness checked by decoding every new file (RMS/peak alongside the
  existing ones: music −17.6 to −19.3 dB RMS, effects −16 to −27 dB). Not
  listened to by a person yet.

**6 — 0.10.0 installer** (version bumped in `package.json`,
`apps/desktop/package.json`, `package-lock.json`; content still
`content-0.8.0`, so saves load).

| Command | Result |
|---|---|
| `npm run check` | pass — boundaries, type-check, 33 files / **326** unit tests (new: `presentation/test/fxLooks.test.ts`, magic and soundscape cases in `ui/test/audio.test.ts`) |
| `python3 tools/audio/make_placeholders.py --only <34 IDs>` | wrote the 34 files; the first 52 manifest entries unchanged |
| `npm run vfx:list` | regenerated `VFX_MAGIC_AND_FAVORS.md` (status text updated) |
| `npm run build` | pass (start-up script 1,730.94 KB / 433.31 KB gzip) |
| Full Playwright suite (`npx playwright test`), first on the build before the owner's art came in | 136 tests: **94 passed**, 42 skipped (opt-in review sweeps), 0 failed (39.7 min) |
| New `tests/e2e/round12.spec.ts` (Lightning, Blessing's overlay, Shield of the Gods after its card, Far Sight and Fleet Foot, Tithe's coin shower, a Temple gift) | 6 / 6 pass |
| Re-run of `round9`–`round12` + `bigMoments` on the build with the last effect fixes (overlay rings moved outside the stack's rings, delivered gift strips, magic sounds pre-loaded) | 25 / 25 pass |
| Full Playwright suite again, on the final build (with the owner's art) | 136 tests: 93 passed, 42 skipped, **1 failed** — `menu.spec.ts` expected the Nine-Tailed Kitsune portrait to be missing; the owner's import delivered every creature portrait, so the check now picks an undelivered form only while one exists. Re-run `menu` 4 / 4, `sprites2d` 4 / 4 (its silhouette check was updated the same way) |
| Owner's art commit `f36fd19` ("fix screens": bundle 14 plus the owner's own art import) brought into the build | the 409 runtime files it changed (21 creature forms with final sprites, new creature portraits, re-encoded icons, both manifests) taken at their committed versions; the owner's source sheets and reference views stay only in the owner's folder; uncommitted art in the owner's working tree (an in-progress Oni re-cut and 292 strips the working-tree sprite manifest names) is **not** in this installer |
| `sprites2d.spec.ts` after that import | its silhouette check now picks a creature still drawn as a silhouette (Celtic Pooka has final sprites now) |
| `npm run desktop:build` + `npx electron-builder --config electron-builder.json --win nsis --x64 --linux dir --x64` (Linux + Wine) | **built** `Pantheon-Realms-Setup-0.10.0-x64.exe` (242,224,482 bytes, SHA-256 `53dd8839671fee86704c802b65fa8c27d9183e1b55896f8968489472b8e10f1d`) |
| Payload check (7-Zip) | `app-64.7z` extracts byte-identical to `win-unpacked`; `app.asar` 134.9 MB, 1,702 entries, packaged version 0.10.0, 94 sound files (86 IDs), 170 final creature strips; no `.glb`/`.gltf`/`.blend`, Babylon, `assets-source/`, source maps, tools or MCP servers |
| `PR_SMOKE_EXE=apps/desktop/release/linux-unpacked/pantheon-realms xvfb-run -a node tools/desktop-smoke.mjs` in a network namespace with only loopback (`unshare -n`) | **DESKTOP SMOKE OK** (packaged: `isPackaged`, DevTools refused; 468 sprite files, map on WebGL, saves, records, 255 painted-art files, 338 interface images, 86 sounds, audio running) |
| Copied to the owner's `installer\` folder | in 13 parts of 20 MB, joined on the computer; SHA-256 matches |

**Not run on Windows; unsigned** (SmartScreen: More info → Run anyway).

Known limits: the effects are placeholders drawn with shapes and particles;
in the software-rendered test browser they were checked frame by frame from
screenshots, not at speed on a GPU. Map miracles invoked from the Pantheon
screen (not the map) play no map effect (the map is not on screen).

## Owner interface pass of 2026-10-03, third round (14 requests)

What changed, request by request (all presentation; no rule, content value or
save change — the one content addition is presentation data, `hudAnchor`):

1. **Main menu:** no Credits, Campaign or Skirmish entries (both under New Game).
2. **Encyclopedia:** no header subtitle; every section's cards share one height
   (`useEqualHeights`, per `data-eq` group, re-measured on resize and font load);
   all 62 heroes show a short story (five Greek concept heroes gained one; the
   build notes "Concept-board hero…", "Hireable in skirmish…" are stripped).
3. **Creature window (S18):** one panel — portrait, name again, larger summary,
   statistics with growth and cost, abilities, lore. No right-hand chips,
   Implemented/Balance tags, Assets section, lore tags or base/upgrade tabs.
4. **New Game:** no header subtitles; the campaign list has no tags, no
   "What carries between missions" and no "Other pantheon campaigns" card; the
   Campaigns/Skirmish tabs are gone. A campaign goes from its card straight to
   the briefing (the pantheon and patron steps are skipped); the **Starting
   Patron screen (S05) is removed** — each pantheon has one implemented patron,
   preselected. Pantheon cards redesigned (medallion, faction band, name and
   epithet 4 px larger at 1920 px), no Playable/god/hero tags.
5. **Map:** the **Overview button and screen (S15) are removed**; no top-right
   hero panel; the left lists have no title or icon.
6. **Pause menu:** no logo, no Quit to Desktop, no close button (Resume or Esc).
7. **Before an attack:** the tile panel shows the guards (or a monster band /
   enemy hero) as portraits with counts, tier and ability badges
   (`ArmyPreview`); the "Estimate vs …" strength heuristic is gone.
8. **Spells:** a spellbook pop-up (`components/spellbook.tsx`) — an open tome
   of a fixed size with the use filters (All/Battle/Adventure, with counts)
   and tier filters always shown, mana gems, Roman tier seals and pantheon
   crests. The map has a **Spells** button (key C) and the battle's Spell
   button (key S) opens it to cast; picking a spell with a target asks for
   the target next. The hero screen's book uses the same component.
9. **Dialogue:** no Backlog button (nor the L key).
10. **Hero screen ("Hero's State"):** a schematic body (SVG) with a box on each
    body part for its item, accessories and mount beside it, the spellbook in
    the corner; the inventory as a grid of all 30 boxes on the right; the army
    centred with larger slots and no caption or hint text.
11. **Movement:** a location at the hero's destination keeps its look until the
    hero arrives (the view holds it while the walk plays); the viewer's own
    walk draws its route on the ground and clears it tile by tile. Arriving at
    one of your towns opens it.
12. **Town:** no header subtitle; the painting fills the screen; the town
    economy is a compact panel on the painting's top edge, placed per town
    where the sky is free (`TownArchetypeDefinition.hudAnchor`; checked on all
    six paintings); a building opens a pop-up beside it with icon actions
    (build, recruit, market, tavern, gods, offering, gifts, training, merchant,
    spellbook) and no tags; the garrison and visiting army are centred with an
    ornamental divider. The wallet sits in the middle of every screen header
    (as on the map). **Recruiting never asks for approval** (the "Confirm
    large recruitments" setting is gone; training never asked). Building
    still asks once.
13. **Journal:** no header subtitle; statuses are icons (check, flag, star,
    lock, cross) instead of tags; a locked step already achieved reads as
    completed (also in the map's objective list).
14. **VFX list:** `VFX_MAGIC_AND_FAVORS.md`, generated by `npm run vfx:list`
    (`tools/assets/vfx/`) from the content: 9 shared status overlays, 47
    battle spells, 7 adventure spells, 14 miracles, 6 divine gifts and the
    Temple offering — 84 effects, 177 asset IDs, each with its phases, what
    the game shows today and a one-line look. **A list only; nothing
    implemented.**

Also fixed: Esc while choosing a map spell's tile now cancels the spell (it
opened the pause menu before).

| Command | Result |
|---|---|
| `npm run check` | pass — boundaries, type-check, 32 files / 315 unit tests |
| `npm run build` | pass (start-up script 1,706.43 KB / 430.73 KB gzip) |
| `npm run vfx:list` | wrote `VFX_MAGIC_AND_FAVORS.md` (0 looks missing) |
| `npm run icons:catalog` | 792 entries; the six new town-action glyphs listed as `icon.ui.<name>` with briefs |
| Full Playwright suite (`npx playwright test`, fresh build) | 130 tests: 86 passed, 2 failed, 42 skipped (opt-in review sweep). The two failures were test issues, fixed and re-run: the fixed-size book was measured during the dialog's opening scale (now layout height), and the battle-board check projected before the on-demand battle view loaded (now waits). Re-run of `round10` + `round11` + `heroscreen`: all pass (one flaky cursor check passed on re-run and now also waits for the map view) |
| New `tests/e2e/round11.spec.ts` (setup flow, map, spells on the map and in battle, town, journal, recruit without approval) | 5 / 5 pass |
| `node tools/perf/load-time.mjs` (3-run medians, SwiftShader; tool updated to the new New Game flow) | menu 215 / 436 ms, first scene 1,107 / 1,244 ms (local / throttled web) |
| `npm run desktop:build` + `xvfb-run -a node tools/desktop-smoke.mjs` (smoke updated to the new flow) | DESKTOP SMOKE OK (map on WebGL, saves, audio) |
| Visual check (screenshots, 1600×900) | every changed screen; the economy panel and pop-ups on all six town paintings |

Known limits: icon glyphs for the new town actions (`build`, `recruit`,
`market`, `tavern`, `merchant`, `gift`) are simple SVG stand-ins until icon art
is delivered as `icon.ui.<name>`. The hero-screen figure sprites
(`sprite.hero.<pantheon>.figure`, GPT-6 sheet D) are no longer shown; that
sheet can be skipped. In the test container (software WebGL) the map renders
at 1–10 frames per second, so dialog fade-ins look slow there; not measured on
a GPU.

## 0.9.0 installer and the sheet-based GPT-6 queue (owner requests, 2026-10-03)

**0.9.0 Windows installer** (version bumped in `package.json`,
`apps/desktop/package.json`, `package-lock.json`; content unchanged,
`content-0.8.0`, so saves still load). The first installer with the 2D
presentation.

| Command | Result |
|---|---|
| `npm run build` + `npm run desktop:build` | pass (start-up script 1,716.76 KB / 432.17 KB gzip; PixiJS chunk 364.29 KB, loaded after the menu) |
| `npx electron-builder --config electron-builder.json --win nsis --x64 --linux dir --x64` (Linux + Wine) | **built** `Pantheon-Realms-Setup-0.9.0-x64.exe` (225,791,725 bytes, SHA-256 `2c6d499e01deabb71829c8170118603959d542960a51743b15dcc592efa0e659`) |
| Payload check (7-Zip) | the installer's `app-64.7z` extracts byte-identical to `win-unpacked`; `app.asar` 118.1 MB, 1,415 entries, packaged version 0.9.0; no `.glb`/`.gltf`/`.blend`, Babylon, `assets-source/`, source maps or development tools |
| `PR_SMOKE_EXE=apps/desktop/release/linux-unpacked/pantheon-realms xvfb-run -a node tools/desktop-smoke.mjs` inside `unshare -n` (no network) | **pass** (packaged: `isPackaged`, DevTools refused; 303 sprite files, the map drawn on WebGL, saves, records, 255 painted-art files, 279 interface images, audio running) |
| Copied to the owner's `installer\` folder | in 12 parts, joined on the computer; SHA-256 matches |

**Not run on Windows; unsigned** (SmartScreen: More info → Run anyway).

**GPT-6 queue in sheets** (owner request: "generate inside the same image as
much content as possible"). `GPT6_2D_CONTENT_GENERATION.md` now asks for
**140 sheets** instead of 1,097 single images (the 54 optional battlefield
paintings stay one per image):

| Group | Sheets | Files cut from them |
|---|---|---|
| A canonical references — three families per sheet, base left, upgraded right | 12 | 59 |
| B portraits — the same families, opaque, black gutters | 12 | 59 |
| C battle animations — **one sheet per creature form**, one row per animation, six cells per row | 102 | 800 strips |
| D mounted heroes — one per pantheon (5 directions × idle 4 + walk 6) + one sheet of the six figures | 7 | 102 |
| E map objects — towns, resources, two location sheets (decoration included) | 4 | 47 |
| G obstacles, siege pieces (rows = piece, columns = intact / damaged / rubble) | 2 | 19 |
| H effects (one row each) and projectiles | 1 | 11 |

Changes that come with it (proposed, unplaytested): creature animations
have **6 frames** (`defend`, `hit`, `takeoff`, `landing` 3) instead of 8
(6, 4), with frame rates that keep the pacing targets (idle 6 at 3 fps = 2 s,
attack 6 at 6 fps = 1 s, death 6 at 5 fps, victory 6 at 4 fps); map heroes
need **5 directions** (the game already mirrors east, north-east and
south-east for the west) and walk 6 frames instead of 8. At the image size
GPT-6 has delivered so far (about 1.6 MP) a creature cell is about
150–210 px — the battlefield at 100 % zoom shows a one-hex creature's frame
at about 147 px, so this is enough at normal zoom but softer when zoomed in
or on high-DPI screens; each sheet asks for "this size or larger", and the
busiest sheets (more than six rows) may be delivered in two parts.

New tool `npm run sprites:cut` (`tools/assets/sprites/cut_sheets.py`) with
the layouts written by `npm run sprites:queue`
(`assets-source/sprites/sheet-layouts.json`): keys out a non-transparent
background (flat magenta, grey, fake checkerboard; edge pixels unmixed, a
magenta key removed everywhere including enclosed gaps), moves each cut to
the emptiest line near the grid, re-aligns every animation on the creature's
feet (median ground contact and foot position; airborne frames keep the idle
row's height), crops objects to content with the anchor at the ground
contact, squares references and figures, cuts portraits along their
gutters, writes a sidecar per strip (frames, fps, loop, anchor, pixels per
hex), a preview per sheet, and a cut log (a sheet is re-cut only when it
changes; files it did not cut are never overwritten). `npm run
sprites:import` reads the sidecars (any frame size; runtime scale never
above the nominal, never enlarged), completes a map hero with five
directions, and accepts hero figures from 300 px.

| Check (cloud) | Result |
|---|---|
| `python3 tools/assets/sprites/cut_sheets.py --self-test` (synthetic sheets: jittered figures on magenta, a two-part transparent hero sheet, objects on a fake checkerboard, opaque portraits; re-run skipping; no overwrite of foreign files) | **pass** |
| Realistic sheets made from the delivered Hoplite and Griffin reference stills (Hoplite on flat magenta at 1256², Griffin transparent at 1.4 × the size, rows jittered by up to 5 %) → `cut_all` → `import_sprites.py --src …` (real import) | 17 strips cut and imported, 0 problems; both sets became `final`; `sprites.test.ts` 9/9; the built game's Unit Detail showed "Final sprites", the Hoplite on its pedestal and the Griffin hovering in `fly`; magenta fully removed after the edge-unmixing fix. **Reverted afterwards** (manifest restored, `assets-runtime/sprites/final/` removed) |
| Synthetic sheets for every other layout kind (hero, effects + projectiles, towns, locations + decoration, siege, obstacles, references, figures, portraits) with the real layouts | 69 sprite files + 5 references + 5 portraits cut; `import_sprites.py --dry-run` 0 problems; a real import of the Greek hero sheet marked the hero `final` with five directions (reverted) |
| `npm run sprites:queue` | 140 sheets, Brief 5 descriptions for 102/102 forms |

**Not established:** how well GPT-6 keeps a 6-column grid, one creature at
one size across 36–54 frames, and empty space between frames — no real
sheet has been generated yet. Suggested pilot: `sheet.creature.greek.tier1.base`
first, then `npm run sprites:cut` and look at its preview.

## 2D presentation migration (owner directive, 2026-10-03)

> Pantheon Realms is a desktop-first, offline-capable, data-driven
> deterministic turn-based strategy game. TypeScript owns authoritative rules
> and AI. React owns application interface screens. PixiJS owns the 2D
> Adventure Map, Tactical Battle presentation, sprite animation, and animated
> Unit Detail viewer. Electron packages the desktop application and a browser
> build uses the same core. Content presentation uses high-resolution 2D
> backgrounds, sprites, atlases, portraits, UI art and animation strips.
> Gameplay state changes only through validated commands; presentation never
> defines gameplay outcomes.

The owner's *2D Presentation Migration Directive* replaced Babylon.js with
PixiJS 8 (`pixi.js` 8.22.0) for the Adventure Map, the Tactical Battle and the
Unit Detail viewer. Rules, AI, content, campaigns, saves and the React screens
are unchanged (no rule, value or save format changed; content stays
`content-0.8.0`, saves still load). Inventory and plan:
`2D_MIGRATION_AUDIT.md`. App version not bumped in this step (the 0.9.0
installer above contains it).

**What the game does now (measured in the browser build and the desktop build):**

* **Adventure Map** — PixiJS layers: sea and sky backdrop, painted terrain
  (the delivered ground paintings repeating in map space), roads, optional
  grid, reachable area, route preview and selection, map locations,
  decoration, guards and one mounted avatar per pantheon (depth-sorted), fog,
  effects. Picking inverts the hex projection, so sprite size cannot change
  which hex is chosen. Avatars walk facing the step's direction (mirrored
  westward until direction strips exist) and hold a 1.2 s readiness beat
  before an accepted battle (skipped at Instant). 2D camera: drag/arrow-key
  pan, wheel zoom 0.42–2.2, clamped to the map.
* **Tactical Battle** — painted battlefield background fitted under the
  logical 15 × 11 hex overlay, obstacles, siege pieces in intact / damaged /
  rubble states, creature sprites standing on their anchor cell (defenders
  mirrored), count badges, projectiles and effects; the fallen play `death`
  (or are laid down) and stay; winners cheer. The React HUD is unchanged and
  the board is laid out between its insets.
* **Unit Detail** — portrait plus the animated 2D viewer: base/upgraded
  switch, one button per animation the creature's content needs (stand-ins
  marked `*`), Play/Pause/Stop/Restart, 0.5×/1×/2×, Autoplay, Face left;
  reduced motion shows a still frame; the Assets tab lists every strip with
  its status and provenance.
* **Hero screen** — the pantheon avatar's still in the paper doll.
* **Towns** — unchanged 2D background + building overlays; 18 locations per
  pantheon (7 dwellings + 11 support), base and upgraded dwelling pictures
  replace each other at one location (new unit test).
* **Settings** — 3D-only and non-working options removed (camera
  auto-rotation, map labels, tooltips toggle, voice volume, camera shake,
  screen flashes); graphics presets now drive the 2D renderer (resolution,
  anti-aliasing, ground shadows, decoration density, painted ground, ambient
  animation, effects level, frame cap).

**1. 2D assets reused** (not regenerated): the 92 story pictures, 76 ground and
sky paintings (map terrain, battle backgrounds, skies), 41 big-moment
pictures, 43 creature portraits, 172 functional icons, 24 cursors, 6 pantheon
emblems, the opening/menu art, the town backgrounds and building art of all
six pantheons, and — as placeholder sources — the 172 creature reference
views (still poses for 43 forms), the six mounted-hero boards (map avatars and
hero-screen figures) and the map-marker concept sheet (40 map locations).

**2. Placeholders created** (`assets-runtime/sprites/`, 7.1 MB, 186 manifest
entries, every one `status: "placeholder"` with provenance; generated by
`npm run sprites:placeholders`): 102 creature sets (43 stills cut from the
delivered three-quarter reference views, 59 silhouette strips with the
animations each form needs), 7 map-avatar sets (6 from the hero boards, 1
neutral rider) with 6 hero-screen figures, 41 map locations (40 from the
marker sheet, 1 drawn windmill), 6 decorations, 7 obstacles, 12 siege pieces,
2 projectiles and 9 effect strips. A contact sheet is in
`assets-source/sprites/placeholder-contact.png`.

**3. Still to be generated by GPT-6** (`GPT6_2D_CONTENT_GENERATION.md` as
first written, one entry per file — **replaced the same day by the sheet
edition above**: 140 sheets cut into these files): A 59 canonical references (forms without one), B 59 portraits, C 800
battle animation strips (102 forms), D 102 map-avatar files (6 pantheons × 8
directions × idle/walk + 6 figures), E 48 adventure objects, F 54 battle
backgrounds (optional climate variants), G 19 obstacles and siege pieces,
H 11 effects/projectiles. Delivered files are imported with
`npm run sprites:import` (no code change).

**4. 3D removed** (deleted, git history is the backup): dependencies
`@babylonjs/core` 9.28.0, `@babylonjs/loaders` 9.28.0, `@gltf-transform/core`,
`gltf-validator`; the Babylon scene code (`meshkit`, `proxies`, `models`,
`modelRegistry`, `mountedHeroes`, `contactShadow`, `artTextures`,
`animations`, the 3D `viewer` and `heroFigure`, 2,546 lines) and its tests
(`heroes.test.ts`, `models.test.ts`, `tests/e2e/models.spec.ts`, the
`?e2e=calibration` mode); the six mounted-hero GLBs with their animation
manifest and rig contract (9.4 MB) and the calibration GLB; the GLB tools
(`validate-units.mjs`, `make-calibration-glb.mjs`, npm scripts `assets:check`,
`assets:calibration`), `HERO_ANIMATION_REPORT.md`; the GLB sections of
`ASSET_PIPELINE.md`; in the owner's toolkit the `pr-babylon-scene` skill
(replaced by `pr-pixi-scene`) and the glTF/Babylon/Blender parts of
`tools/pantheon-dev`. No `.glb`, `.gltf` or `.blend` file remains in the
repository. The owner's separate Blender project was not touched.

**5. Tests and checks run (cloud, 2026-10-03):**

| Command | Result |
|---|---|
| `npm run check` (boundaries + type-check + unit tests) | **pass** — 32 files, 315 tests (new: sprite manifest, animation vocabulary, hex round trips, town art) |
| `node --test tools/pantheon-dev/tests/toolkit.test.mjs` | **pass** — 38 tests |
| `npm run build` | pass — start-up script 1,716.76 KB / 432.17 KB gzip (0.8.0 before the migration: 1,587.69 / 428.87; the sprite manifest is bundled), PixiJS chunk 364.29 KB / 108.56 KB gzip, loaded after the menu |
| `npx playwright test` (full suite, Chromium + SwiftShader, against the fresh build) | 125 tests: **81 passed, 2 failed, 42 skipped** (the opt-in screenshot sweep `zz-moments-review`, `PR_REVIEW=1`) in 34 min. Both failures were test assumptions: `round9` asked for a hex's screen position before the on-demand 2D view had loaded, and expected the old graphics-preset wording. Fixed in the test (it now waits for the view; new wording); `round9.spec.ts` rerun **4/4 passed** |
| `npm run desktop:build` + `xvfb-run -a node tools/desktop-smoke.mjs` | **pass** (dev layout): 303 sprite files served and decoded, no `.glb/.gltf/.blend` in the renderer, the adventure map drawn on WebGL without a view error, saves, records, 255 painted-art files, 279 interface images, audio running |
| `node tools/perf/load-time.mjs apps/client/dist --runs 3` | menu **214 ms** local / **443 ms** web (0.7.0 round: 221 / 446); first scene **912 ms** local / **1,220 ms** web (0.7.0 round with the 3D layer: 1,311 / 1,255; 3-run medians on the software renderer, noisy) |
| the same smoke inside a network namespace with only loopback (`unshare -n`; `curl https://example.com` fails) | **pass** — the desktop game starts and draws the map with networking disabled |
| `electron-builder --linux dir --x64` + `PR_SMOKE_EXE=…/linux-unpacked/pantheon-realms` smoke, also inside `unshare -n` | **pass** (packaged: `isPackaged`, DevTools refused); `app.asar` 118.1 MB (0.8.0: 124.6 MB), 1,415 entries, no `.glb`/`.gltf`/`.blend` or Babylon file, no `assets-source/`, source maps or development tools |
| stale-term search (directive §23) | see below |

Not run: the game on Windows after the migration, a real GPU (all rendering
was SwiftShader, which the automatic graphics pick sets to Low), Safari or
Firefox, a human play-test of the 2D views.

**Stale-term search after the migration** (`Babylon babylon GLB glb glTF gltf
Blender blender mesh skeleton armature "3D model" "3d model" SceneLoader
ArcRotateCamera`, all non-generated files; `apps/desktop/renderer/` is build
output and was rebuilt):
**no remaining match claims a 3D renderer, GLB/glTF runtime format, Blender
pipeline, rigs or 3D units.** No `.glb`, `.gltf` or `.blend` file is in the
repository, `npm ls` finds no Babylon or glTF package, and the 10 skill zips
hold no match. Remaining matches (case-insensitive), all classified:

| File (matches) | Classification |
|---|---|
| `DEVELOPMENT_STATUS.md` (58) | this section's record of what was deleted and of the search itself; the rest are in dated history sections, each marked **Obsolete (in part / whole section)** |
| `2D_MIGRATION_AUDIT.md` (35) | the pre-migration audit (a required deliverable); marked at the top as a record of the removed 3D state |
| `tools/check-boundaries.mjs` (1), `tools/desktop-smoke.mjs` (3), `tests/e2e/heroes.spec.ts` (2) | valid non-3D meaning: checks that **forbid** Babylon imports and `.glb/.gltf/.blend` files |
| `ARCHITECTURE.md` (3), `CLAUDE.md` (2), `IMPLEMENTATION_PLAN.md` (1) | the boundary lint's forbidden list, the smoke check, and "deleted/obsolete" notes |
| `docs/pantheon-v0.3/` `CHANGELOG_v0_3.md` (3), `DECISIONS_v0_3.md` (1), `implementation/06…` (3), `reference/05…` (1) | inside passages explicitly marked obsolete (the decision log records DEC-23, the 2D migration) |
| `assets-source/creatures/reference/delivery-notes/` (6) | the creature delivery's unaltered records (hashes in its manifest); marked obsolete by the folder's README (1 match, the marking note) |

Generated build output (`apps/client/dist`, `apps/desktop/renderer`,
`apps/desktop/release`) was rebuilt and holds no 3D engine code; its only
matches are inside PixiJS itself (its 2D `mesh` drawing pipe and `glBuffer`
WebGL helpers — third-party code, valid 2D meaning).

**6. Owner decisions needed** (nothing here blocks play):

1. **Placeholder art is what the game shows** until the GPT-6 queue is
   delivered: is the queue's order (A references → … → H effects) and its
   scope (54 optional climate backgrounds) right?
2. **Egyptian tiers 2 and 5 change body plan on upgrade** (four-legged base,
   upright upgrade, following the pantheon board): keep (two motion designs
   per pair) or redesign so each pair shares one?
3. **Hero-screen figure**: a still of the pantheon's map avatar (the 3D
   figure's salute is gone); a different picture per named hero would be new
   art.
4. **Version and installer**: done — the 0.9.0 installer (above) contains the migration.
5. The six-pantheon **v0.3 design documents** in `docs/pantheon-v0.3/` were
   updated for the 2D stack (18 of 35 files; history marked obsolete, the
   original hashes kept in `docs/tooling/source-document-checksums.json`):
   please confirm the rewritten production chapters 01–04.

## 0.8.0 Windows installer (2026-10-03, for play-testing)

> **Obsolete in part (2026-10-03):** the mentions of the deleted 3D layer in this dated section (Babylon.js, GLB/glTF models, the calibration model, meshes, 3D scenes) are history only; the 2D migration replaced them (see "2D presentation migration" above). Measurements were taken on that build.

Version bumped from 0.7.0 to **0.8.0** (`package.json`, `apps/desktop/package.json`,
`package-lock.json`): the first installer with the second fix round, the delivered
cursors and the pantheon emblems (below). Content `content-0.8.0`, so earlier saves
load; heroes saved standing on a town's tile are moved to its gate when loaded.

| Command | Result |
|---|---|
| `npm run build` + `npm run desktop:build` | pass (start-up script 1,587.69 KB / 428.87 KB gzip) |
| `npx electron-builder --config electron-builder.json --win nsis --x64 --linux dir --x64` (Linux + Wine) | **built** `Pantheon-Realms-Setup-0.8.0-x64.exe` (222,612,988 bytes, SHA-256 `46d655248461dbbe016664d4fad4beb1a45f1b16ef1b87083dc010a3d8e68f4b`) |
| Payload check (7-Zip) | the installer's `app-64.7z` extracts byte-identical to `win-unpacked`; `app.asar` (124.6 MB) says version 0.8.0, holds the 58 cursor images and the 6 emblems, and no `assets-source/` or source maps |
| `PR_SMOKE_EXE=apps/desktop/release/linux-unpacked/pantheon-realms xvfb-run -a node tools/desktop-smoke.mjs` | **pass** (packaged: `isPackaged` true, DevTools refused; saves, records, unit GLB, six hero GLBs, 255 painted-art files, audio running). New smoke check: all **279 interface images** (58 cursor rasters at 1x and 2x, 221 final icons with the emblems) are served by the app protocol and decode, and the interface cursor variable points at the delivered arrow (`prgame://app/ui/cursors/…`) |
| Copied to the owner's `installer\` folder | in 9 parts, joined on the computer, SHA-256 matches |

**Not run on Windows; unsigned** (SmartScreen warns: More info → Run anyway). The
cursors' look and hotspots on a real Windows screen (and at 125–200 % display
scaling) are untested.

## Owner fixes of 2026-10-03, second round (town gates, the fallen, victory, town armies), the delivered cursors and pantheon emblems

**In the 0.8.0 installer.** Owner decisions (rules changes, unplaytested):

1. **Victory:** when a battle is won, every surviving creature of the winning side
   plays its victory animation, then keeps cheering until the result opens (the
   beat on the board after the last blow is now 1.2 s; it was 0.7 s).
2. **The fallen stay on the battlefield:** a destroyed stack plays its dying
   animation and stays lying where it fell (no base disc or count label). **Rules
   change:** its cells stay taken for the rest of the battle (`occupancy` marks them
   `corpse:<id>`): ground stacks cannot end there or walk through; flyers still pass
   over; corpses in a wall or gate opening do not block (so a breach can never be
   sealed). A battle loaded from a save shows its dead lying down.
3. **Town gates:** a hero never stands on a town's own tile. **Rules change:** each
   town has a gate — the neighbouring tile joined to it by a road (several: the one
   nearest the map centre, so point-symmetric maps get mirrored gates; Twin Harbors
   (4, 8) and (30, 8)) — and the town site is used from there: visiting, recruiting
   to the hero, the Tavern placing a new hero, training, the merchant, divine gifts,
   garrison exchange, Recall/Homecoming, capture and sieges (the defending visitor
   stands at the gate). The town tile is a building nobody enters; moving "to" a
   town goes to its gate. Missions that placed heroes in a town start them at its
   gate, and older saves are settled the same way when loaded. Effects: routes from
   a town start one road step out (implementation/06 reference costs are 75 MP
   shorter from the gate: Three Beacons M01 900, M02 1,200, M03 2,325 / 2,950);
   a town's other road exits are reached around it. Clicking the town while the
   hero stands at its gate opens it.
4. **Town armies:** the Exchange troops button is gone. Stacks are dragged between
   the garrison and the visiting hero (and within either): matching stacks merge,
   different stacks swap; Shift- or Ctrl-drag splits (choose how many in a small
   dialog); clicking a stack and choosing a quantity, then clicking a slot, also
   splits. Rules unchanged (`TransferStack`). On the map, clicking an own hero next
   to the selected one opens the troop exchange (the *meet* cursor).
5. **Mouse cursors delivered:** the 24 cursor masters (128 px, owner's art project,
   2026-10-03) are in `assets-source/ui/cursors/` (all 24 SHA-256 match the
   delivery manifest; the manifest is kept beside them). `npm run cursors:import`
   now writes 32 px (1x) and 64 px (2x) rasters with the delivery's hotspots
   (arrow and gauntlet 2,2; sword 30,16; magnifier and the rest 16,16) and the sword
   turned to the six hex sides on a grown canvas (44 × 44 / 88 × 88 for the slanted
   ones) with its point as the hotspot; the game uses
   `image-set(1x, 2x) x y, <system cursor>` (absolute URLs, preloaded), so the
   system cursor shows while they load. Settings → Display → Game cursors (on by
   default) keeps the system cursors.

6. **Pantheon emblems delivered:** the six crests (1024 × 1024 RGBA, owner's art
   project, 2026-10-03; all six SHA-256 match the delivery manifest) are in
   `assets-source/icons/final/`; `npm run icons:import` wrote them at 256 px to
   `assets-runtime/ui/icons/final/` and registered them (`emblem.<pantheon>`; 221
   final icons now). The shared `Emblem` component shows them everywhere a pantheon
   is marked (setup cards and rival chips, random-map seats, Encyclopedia dividers,
   Pantheon, Town, Kingdom Overview and hero screens, world dialogs, summary and high
   scores), contained in its box (no cropping of the different silhouettes).

**Checks run (cloud):**

| Command | Result |
|---|---|
| `npm run check` | pass (final run after the emblems) — **315 unit tests in 32 files**. New: `rules/test/townGate.test.ts` (4: gates on the road and mirrored on Twin Harbors; heroes start at the gate, the town tile is blocked, moving to the town stops at the gate; capture from the gate; older saves settled), `rules/test/corpses.test.ts` (a destroyed stack's cells stay taken, ground stacks cannot reach them); `ui/test/cursors.test.ts` rewritten for the delivered art (every ID resolves to its 1x/2x files with the delivery's hotspot; the six turned swords keep their point on the side they face). Tests updated for gates: reference routes, hiring, Homecoming, siege capture, divine gifts, a skirmish AI test (walks two tiles out so the Tavern can place a hero), and `GameDriver.marchTo` (a town destination means its gate) |
| `npm run cursors:import` | 24 cursor files → 29 images (24 + 5 extra sword angles), 1x and 2x, hotspots equal to the delivery's `hotspot32` for all 24 |
| `npm run build` | pass |
| `npx playwright test tests/e2e/round10.spec.ts` | **5 / 5**: hero at the gate, clicking the town opens it, walking back stops at the gate; drag a stack hero → garrison, Shift-drag split (dialog), click-select split of 3; corpses lie on the board and the winners celebrate before the result; all 29 cursor images served at 1x and 2x, the map picks attack / hero / move cursors with the 16,16 hotspot and the system fallback; the battle board on screen has odd rows shifted right and y downward, as the sword angles assume |
| Town-related specs (siege, services, round9, journey, campaign, features, mapSites, bigMoments, pantheons) | **37 passed, 2 failed** (19.3 min); both failures expected the old behaviour — `round9` the drawn stand-in attack cursor, `siege` the hero standing on the captured town's tile. Updated (delivered cursor; the town's gate) and rerun: pass |
| `npm run icons:import` + `npm run icons:catalog` | 221 final icons registered (215 + the 6 emblems at 256 px); catalog 786 entries. `uiArt.test.ts` read the illustrations section's size the way the importer does not ("emblems 256 px; thumbnails 640 × 360 px" → it expected 640); it now reads it like the importer (256) |
| `menu.spec.ts` (4) | pass — every registered final icon, the emblems included, is served and decodes at its size |
| Emblem review (temporary script, not kept) | 13 emblem images on the pantheon setup screen (cards 48 px, rival chips 21 px, detail 67 px), the Encyclopedia dividers (medallion), the Town title (30 px): all 256 px sources decode, shapes contained in their boxes, no clipping |
| Screenshots reviewed | hero at the gate beside Westharbor, town armies after the moves, a battle with two fallen stacks lying on their hexes, the delivered cursor and emblem contact sheets, emblems on setup, Encyclopedia and Town |

Not run: the full Playwright suite (owner request), the balance tool, the desktop
build and an installer. The cursors were checked by style and file tests; how each
looks and clicks at real size in the desktop app, with every melee side and on a
high-density screen, still needs a person.

## 0.7.0 Windows installer (2026-10-03, for play-testing)

> **Obsolete in part (2026-10-03):** the mentions of the deleted 3D layer in this dated section (Babylon.js, GLB/glTF models, the calibration model, meshes, 3D scenes) are history only; the 2D migration replaced them (see "2D presentation migration" above). Measurements were taken on that build.

Version bumped from 0.6.0 to **0.7.0** (`package.json`, `apps/desktop/package.json`,
`package-lock.json`): the first installer with the owner's interface pass, the
first 43 creature portraits and the 2026-10-03 requests (below). Content
`content-0.8.0`, so 0.6.0 and 0.5.0 saves load. Preferences gain
`graphicsTested`: on the first start of 0.7.0 the quick graphics test picks a
preset once, also for people who had 0.6.0.

| Command | Result |
|---|---|
| `npm run build` + `npm run desktop:build` | pass (start-up script 1,576.36 KB / 426.17 KB gzip) |
| `npx electron-builder --config electron-builder.json --win nsis --x64 --linux dir --x64` (Linux + Wine) | **built** `Pantheon-Realms-Setup-0.7.0-x64.exe` (221,808,939 bytes, SHA-256 `f3be34eeccf4f6012179c0a7e004b2b458a23f70d25bd6a621bb9d5de67d12de`) |
| Payload check (7-Zip) | the installer's `app-64.7z` extracts byte-identical to `win-unpacked`; `app.asar` (123.7 MB) says version 0.7.0, holds `renderer/ui/cursors/manifest.json`, and no `assets-source/` or source maps |
| `PR_SMOKE_EXE=apps/desktop/release/linux-unpacked/pantheon-realms xvfb-run -a node tools/desktop-smoke.mjs` | **pass** (packaged: `isPackaged` true, DevTools refused; saves, records, unit GLB, six hero GLBs, all 255 painted-art files, audio running) |
| Copied to the owner's `installer\` folder | in 9 parts, joined on the computer, SHA-256 matches |

**Not run on Windows; unsigned** (SmartScreen warns: More info → Run anyway).
The automatic graphics pick and the presets have only been run on the
software renderer here; on a real Windows GPU they are untested.

## Owner requests of 2026-10-03 (cursors, divine gifts, smarter AI, three fixes, graphics quality)

> **Obsolete in part (2026-10-03):** the mentions of the deleted 3D layer in this dated section (Babylon.js, GLB/glTF models, the calibration model, meshes, 3D scenes) are history only; the 2D migration replaced them (see "2D presentation migration" above). Measurements were taken on that build.

**In the 0.7.0 installer.** Designs and proposed values:
`DESIGN_PROPOSALS.md` group 0.8 (§29–32). Owner answers: Favor buys **divine
gifts at the Temple**; graphics use **presets + an automatic pick**.

1. **Context cursors (stand-ins):** the 24 IDs of Brief 7 switch by what a
   click would do — on the map (move, move later, attack, siege, visit, portal,
   own hero or town, blocked; busy on another empire's turn; grabbing while
   the map is dragged) and in battle (move, fly, melee — the sword turned to
   the side of the hex the strike comes from — shoot, weak shot, structure,
   spell, ability, info, blocked). Until the art is delivered: system cursors
   where the meaning is the same, otherwise drawn 32 px stand-ins.
   `npm run cursors:import` brings the delivered art in with no code change
   (ASSET_PIPELINE.md §11, *Mouse cursors*). Settings → Display → *Game
   cursors* (on by default) switches back to the system pointer. The battle
   sword's six angles were checked in unit tests, not yet looked at by a person
   on every side.
2. **Divine gifts at the Temple:** six gifts (5–20 Favor: Gold, Wood and Stone,
   Crystal, +1,000 experience, half a week of tier 1–4 recruits, a minor
   artifact), one per town with a Temple per week; skirmish, random maps and
   the later campaigns (The Three Beacons: off). The AI buys them with Favor
   it does not need for gods or the week's intervention.
3. **AI:** judges heroes by army, commander, matching battle stat bonuses
   (pantheon, gods, specialties, sets, the week), Offense/Archery/Armorer,
   morale, luck and magic (`packages/ai/src/assessment.ts`), and reads the
   week's event: lower Gold reserves in a week of extra income, going home to
   recruit early in a week of extra growth. Proposed weights; measured effect
   below.
4. **Minimap view frame:** the minimap draws the part of the map on screen (the
   camera's ground footprint, updated about 7 times a second while the minimap
   is shown).
5. **Combat log:** events are recorded as the store receives them (last six
   battles), so the first round — published before the battle screen mounts —
   is in the log.
6. **Hot-seat messages:** at the hand-over, notices meant for the previous
   player (toasts, hints, big moments) are cleared; only public ones (an empire
   eliminated) and the new-week banner stay.
7. **Graphics quality:** Low / Medium / High (resolution, anti-aliasing at the
   next start, soft contact shadows, figures per troop, map detail, painted
   ground, small animations, frame cap). On the first start a quick WebGL test
   (at most 0.6 s, when the menu is idle) picks one; Settings → Display shows
   what each preset changes and can run the test again. Resolution and frame
   cap change at once, the rest from the next map or battle view. UI-test mode
   (`?e2e`) skips the automatic pick (High stays, as before) so runs are
   reproducible. Babylon shadow maps were tried and dropped (on the test
   renderer they shaded the casters, not the ground). The test's thresholds are
   proposed and were **not calibrated on real PCs** — this cloud has only a
   software renderer, which always picks Low.

**Checks run (cloud, 2026-10-03):**

| Command | Result |
|---|---|
| `npm run check` | pass — boundaries, type-check, **310 unit tests in 30 files** (new: `ui/test/cursors.test.ts` 5, `rules/test/gifts.test.ts` 4, `ai/test/assessment.test.ts` 3, `presentation/test/graphics.test.ts` 5, `ai/test/services.test.ts` +1). The first run failed one test: *The Silver Branch* headless journey lost its M05 assault — the rival AI, now judging Orla's upgraded war-band stronger, stayed behind its walls instead of meeting her in the field (with the old heuristic it attacked and lost). The four arc journeys now recruit the town's troops before marching (66 → 102 creatures); all pass |
| `npm run balance -- skirmish random --jobs 2` | 252 jobs in 4.5 min (`balance-reports/balance-2026-10-03T04-14-51.md`). Twin Harbors: 216 matches, 206 decided (mean day **15.3**; 14.9 before), 10 at the day cap (6 before); west **0.54** (0.54), first mover **0.71** (0.68); pantheon averages **0.42–0.63** (0.37–0.60). Random maps (18 matches each, noisy): 2 empires 0.33 / 0.67 (0.50 / 0.50 before; 3 undecided, 0 before); 3 empires 0.33 / 0.33 / 0.33 (0.56 / 0.39 / 0.06 before) |
| `npm run build` | pass — start-up script 1,576.36 KB / 426.17 KB gzip (the cursor stand-ins, presets and quick test; 1,542.83 / 417.49 at the interface pass), dist 121 MB |
| `node tools/perf/load-time.mjs apps/client/dist --runs 5` | menu **209 ms** local / **422 ms** web (219 / 452 before); settled 994 / 1,407 ms (2,640 / 3,446 before) — **not comparable**: the tool opens the build without `?e2e`, so the automatic pick chose Low on the software renderer (no painted ground) |
| `npx playwright test tests/e2e/round9.spec.ts` | 4/4 pass: map cursor (a drawn stand-in over the guarded mine, another over the hero) and the minimap frame; a Temple gift through the town screen (Favor 30 → 25, Gold +2,000, the Temple then waits); a battle started from the map has "— Round 1 —" in its log; Settings shows three presets and the quick test, and Low fetches no ground or sky textures |
| Full `npx playwright test` (production build) | first run: tests 1–49 of 118 passed, then the calibration-model battle (`models.spec.ts`, a known slow test) stalled — the browser stayed at full CPU for about 15 minutes past its limit and the run was stopped. That test then passed alone (2.1 min), and the remaining eight files were rerun together: **28 passed, 0 failed** (13.5 min; the 42 opt-in review tests skipped). Every test passed at least once on this build; the stall was not reproduced |
| Screenshots reviewed | map cursor, Low map (plain ground, no sky), town Temple panel with *Divine gifts*, Settings → Display, battle on High (contact shadows) and Low (one figure per troop, plain board) |

Not run: the desktop build and smoke, an installer, a hot-seat UI test of the
hand-over (the change is two lines in the store's hand-over; the existing
hot-seat tests pass), real-GPU checks of the presets and the quick test.

## Creature art, first part (Brief 5, delivery 2026-10-03)

> **Obsolete in part (2026-10-03):** the mentions of the deleted 3D layer in this dated section (Babylon.js, GLB/glTF models, the calibration model, meshes, 3D scenes) are history only; the 2D migration replaced them (see "2D presentation migration" above). Measurements were taken on that build.

The owner's art project delivered **forms 001–043** of the 102 (all Greek,
Norse and Egyptian forms and the Kitsune): 172 model-reference views and 43
painted portraits, already copied into the folder. All 215 files match the
delivery's SHA-256 manifest; the Nine-Tailed Kitsune (form 044, an unfinished
draft) and forms 045–102 are not delivered and are not registered.

* **Portraits in the game:** `npm run icons:import` registered the 43
  (`creature.<pantheon>.tier<N>.<base|upgraded>.portrait`). The importer now
  writes fully opaque pictures as 256 px **WebP** (1.2 MB for the 43; 6.6 MB as
  PNG) and keeps PNG for icons with transparency (the 172 earlier icons were
  re-imported byte-identical). Shown through `CreaturePortrait` in its gold
  frame: army slots, recruitment and training, battle turn order and stack
  panel, Bestiary, encounters, results; the creature detail screen's portrait
  is larger (8 rem). Each portrait was checked against its creature's name on a
  labelled contact sheet (43/43 correct).
* **Reference views** stay in `assets-source/creatures/reference/` for the
  later 3D step (the game never reads them), with the delivery's notes copied to
  `delivery-notes/`. Painted, not orthographic; 1254 × 1254 instead of 1024
  (not resized). **Open owner decision:** the Egyptian board gives tier 2 and
  tier 5 different body plans for base and upgrade (four-legged Jackal Guardian
  → upright Anubian Warden; four-legged Crocodile Beast → upright Sobek
  Warbeast), so those families need two skeletons each; the brief asked one.
  The art follows the board.
* `ICON_CATALOG.md` / `.xlsx` / `.csv` regenerated (`npm run icons:catalog`): the
  43 rows read "Final art".

Checks run:

| Command | Result |
|---|---|
| SHA-256 of the 215 delivered files in the folder against `DELIVERY_MANIFEST.csv` | 215/215 match; no other creature files in the two folders |
| `npm run icons:import` | 215 registered (172 earlier icons unchanged byte for byte, 43 new WebP) |
| `npm run icons:catalog` | 786 entries; the 43 portraits listed as final art |
| `npm run check` | pass — 292 unit tests in 26 files (`uiArt.test.ts` now accepts opaque WebP portraits at their catalog size) |
| `npm run build` | pass — start-up script 1,553.36 KB / 418.01 KB gzip (+10.5 KB: the larger final-art manifest is bundled), dist 121 MB |
| Playwright: `menu.spec` (4, incl. a new test: every registered final icon and portrait is served and decodes at its size; Hoplite and Kitsune show the painting, the Nine-Tailed Kitsune keeps the stand-in), `models.spec` bestiary viewer, `round3.spec` bestiary, `pantheons.spec` Norse and Egyptian setup/town/recruit | 8/8 pass |
| Screenshots reviewed | contact sheets of all 43; Bestiary (Greek, Egyptian, Japanese), creature detail, hero army, recruitment and training, battle turn order and stack panel |

Not run: the full Playwright suite, the desktop build and smoke, an installer.

## Owner interface pass (2026-10-03, after the 0.6.0 installer)

Twelve changes the owner asked for after play-testing 0.6.0. **Not in the
0.6.0 installer.** Rules and content values are unchanged except item 9.

1. **Main menu:** title is the logo lettering only (`brand.logo.text`, cut from
   the full logo by `prepare_ui_art.py`); no tagline, no emblem and no
   "Temporary art" chip in the footer; Random Map and High Scores are no longer
   menu entries (Random Map is under New Game, High Scores open from the
   end-of-game summary); a flat 20 % black layer between the painting and the
   menu (it replaced the gradient scrim).
2. **Credits:** the logo lettering, "Created by", **Teddy Lazebnik**, in large type.
3. **Settings:** no subtitle under the title.
4. **Encyclopedia:** eight pages — Bestiary, Gods, Heroes, Towns, Spells,
   Skills, Artifacts (with the artifact sets), Abilities. The Pantheons,
   Skirmish & World and Rules pages are gone. Most of their text is still in
   the game elsewhere — map sites in a random map's Journal help, difficulty
   effects on the setup screens, each miracle in the Miracles dialog, the
   current weekly event at its dawn — but the lists of all weekly events and
   the movement / economy / combat rules summary are no longer shown anywhere.
   Bestiary, Gods, Heroes and Towns show every pantheon one
   below the other under a divider (emblem medallion, name, epithet; Neutral
   closes the Bestiary); no pantheon buttons, no tags (status that matters is a
   plain line, e.g. "Planned — not in play"). Every spell, skill, artifact and
   ability has its own card; text about two steps larger (Encyclopedia only).
   Hero cards show the story only (the content's "Concept-board hero… Hireable
   in skirmish" notes are left out). Heroes and gods use the larger portrait;
   a hero with a painted dialogue bust now shows it (head and shoulders) as its
   portrait everywhere — 20 of 62 heroes; the others and all 60 gods still show
   generated stand-ins until portraits are delivered (Brief 4 covers the gods).
5. **Setup:** the MODE / SCENARIO / PANTHEON / PATRON / BRIEFING step bar is
   gone; the New Game cards have no "Playable" badge and larger text and titles.
6. **Random Map:** one panel (map, game, empires) with **Start** in its own bar;
   the live preview, its fairness list and legend and the footer Back button
   are gone (the preview code is removed; the map is generated when Start is
   pressed — a generator error shows under Start). Random maps start straight
   on the adventure map, **without a briefing** (objectives stay in the Journal).
7. **Pantheon icons:** every pantheon icon goes through one component
   (`Emblem`), now also in the Town and Kingdom Overview titles. The emblems are
   (stand-ins until the six crests arrived on 2026-10-03, see above): **GPT-6 Brief 6** (`GPT6_BRIEF_6_PANTHEON_EMBLEMS.md`)
   asks for the six crests; `npm run icons:import` brings them in with no code
   change.
8. **Battle result (victory and defeat):** no line under the title; the two
   sides' boxes directly below it at one height; Outcome centred under them;
   Continue under Outcome; a 20 % black layer over the painting.
9. **Random-map taverns:** hire from the 30 hireable heroes **and the 5
   campaign heroes** (Alexios, Seshet, Akane, Orla, Itzel; Hervor was already
   hireable) — 35, each in the towns of the hero's own pantheon
   (`randomMapTavernPool`, `MissionDefinition.hireableHeroIds`). Campaign
   opponents stay out; authored skirmishes and the campaigns are unchanged.
   Generator version not bumped (same maps for the same seed; only the
   mission's tavern list changed), so random maps saved before keep their old
   list.
10. **Attack panel:** your army and the opponent's face each other across a VS
    medallion; the strength "Estimate" is gone from the panel (the tile panel
    still shows its estimate); Withdraw has an icon.
11. **Level-up:** opens by itself — after a battle through the result's
    Continue, otherwise as soon as the map is idle and no dialog, story scene
    or hand-over is open (from the map, town, hero, recruitment, pantheon,
    journal or overview screens); the "Level up" buttons on the map status bar
    and the hero screen are gone. No panel title, no Confirm: clicking a skill
    card is the choice (a second click within 0.35 s is ignored, so a double
    click cannot also pick the next level's offer); with no offers a Continue
    button remains. Large skill icon on the left of each card, details on the
    right. After the last choice the screen underneath returns.
12. **Mouse cursors:** **GPT-6 Brief 7** (`GPT6_BRIEF_7_CURSORS.md`): 24 context
    cursors (interface, adventure map, battle; one sword turned to the six
    sides of a hex) with hotspot rules. (Wired into the game with stand-ins on
    2026-10-03, see above.)

**Checks run for the interface pass (cloud, 2026-10-03):**

| Command | Result |
|---|---|
| `npm run check` | pass — boundaries, type-check, **292 unit tests in 26 files** (new: `packages/rules/test/randomTavern.test.ts`, 4 tests) |
| `npm run build` | pass — start-up script 1,542.83 KB / 417.49 KB gzip (1,549 / 420 at 0.6.0), dist 120 MB |
| `npx playwright test` (full suite) | **69 passed, 1 failed**, 42 skipped (the opt-in review sweep), 37.7 min; the failure was `menu.spec` still counting the removed footer emblem — test updated, then passed |
| After a last CSS change (random-map panel on small windows) and rebuild: `menu.spec`, `features.spec`, `round3.spec` (menu, credits, New Game, both random-map tests, bestiary) | 6/6 pass |
| Targeted earlier in the round: `bigMoments.spec` (victory and defeat layout checks, level-up without Confirm), `heroes.spec` Withdraw (two-sided attack panel, Withdraw icon) | pass |
| Screenshots reviewed | main menu, Credits, Settings, New Game, Random Map (1600 × 900 and 1024 × 640), all eight Encyclopedia pages, scenario/pantheon/patron setup, battle result victory and defeat, level-up, attack panel |

Not run this round: the balance tool (no value changed except the random-map
tavern list, which the AI uses through the same hiring rules), the desktop
build and smoke, an installer (0.6.0 stays the latest).

## 0.5.0 Windows installer (2026-10-02)

> **Obsolete in part (2026-10-03):** the mentions of the deleted 3D layer in this dated section (Babylon.js, GLB/glTF models, the calibration model, meshes, 3D scenes) are history only; the 2D migration replaced them (see "2D presentation migration" above). Measurements were taken on that build.

Version bumped from 0.4.1 to **0.5.0** (`package.json`, `apps/desktop/package.json`,
`package-lock.json`) — the first installer with the mounted heroes and both
2026-10-01 and 2026-10-02 rounds. Content, rules and saves are unchanged by the
bump (content `content-0.8.0`).

| Command | Result |
|---|---|
| `npm run build` + `npm run desktop:build` | pass (start-up script 1,413.92 KB / 394.18 KB gzip) |
| `npx electron-builder --config electron-builder.json --win nsis --x64 --linux dir --x64` (Linux + Wine) | **built** `Pantheon-Realms-Setup-0.5.0-x64.exe` (145,218,092 bytes, SHA-256 `a96f1cffdd53bcba917310c541fdae7e1f176f79b0943000cd0368e3916f4c1f`) |
| Payload check (7-Zip) | the installer's `app-64.7z` extracts byte-identical to `win-unpacked`; `app.asar` (45 MB) says version 0.5.0, holds `renderer/heroes/`, no `assets-source/`, tools, source maps or `.blend` |
| `PR_SMOKE_EXE=apps/desktop/release/linux-unpacked/pantheon-realms xvfb-run -a node tools/desktop-smoke.mjs` | **pass** (packaged: `isPackaged` true, DevTools refused; saves, records, unit GLB, six hero GLBs, audio running); the menu footer reads "v0.5.0 · Desktop build" |
| Copied to the owner's `installer\` folder | in 8 parts, joined on the computer, SHA-256 matches |

**Not run on Windows; unsigned** (SmartScreen warns). Per-user install, saves in
`%APPDATA%\Pantheon Realms\saves`; saves from content 0.7.0 are listed as
incompatible and kept.

## 0.6.0 Windows installer (2026-10-02, for play-testing)

> **Obsolete in part (2026-10-03):** the mentions of the deleted 3D layer in this dated section (Babylon.js, GLB/glTF models, the calibration model, meshes, 3D scenes) are history only; the 2D migration replaced them (see "2D presentation migration" above). Measurements were taken on that build.

Version bumped from 0.5.0 to **0.6.0** (`package.json`, `apps/desktop/package.json`,
`package-lock.json`): the first installer with the 172 functional icons, hero
specialties, all 60 gods, the nine map sites, neutral reactions and the three
painted-art deliveries (story, ground and sky, big moments). Content
`content-0.8.0`, so 0.5.0 saves load (their new features stay off).

| Command | Result |
|---|---|
| `npm run build` + `npm run desktop:build` | pass (start-up script 1,549 KB / 420 KB gzip; renderer 120 MB, of which painted art 69 MB) |
| `npx electron-builder --config electron-builder.json --win nsis --x64 --linux dir --x64` (Linux + Wine) | **built** `Pantheon-Realms-Setup-0.6.0-x64.exe` (220,640,503 bytes, SHA-256 `e063aff998e2ca0b6329d951e6eae2b3b5db6bce40d35d86d840188f7535f7a5`); 0.5.0 was 145 MB — the difference is the painted art |
| Payload check (7-Zip) | the installer's `app-64.7z` extracts byte-identical to `win-unpacked`; `app.asar` (122.5 MB, 1,177 files) says version 0.6.0, holds the 117 ground/sky/big-moment WebP files and the six hero GLBs, and no `assets-source/`, tests, source maps or `.blend` |
| `PR_SMOKE_EXE=apps/desktop/release/linux-unpacked/pantheon-realms xvfb-run -a node tools/desktop-smoke.mjs` | **pass** (packaged: `isPackaged` true, DevTools refused; saves, records, unit GLB, six hero GLBs, audio running). New check in the smoke tool: **all 255 painted-art files** are served by the app protocol and decode at their registered sizes |
| Copied to the owner's `installer\` folder | in 10 parts, joined on the computer, SHA-256 matches |

**Not run on Windows; unsigned** (SmartScreen warns: More info → Run anyway).
Per-user install. Saves live in `%APPDATA%\Pantheon Realms\saves`, which the
installer and uninstaller leave alone (`deleteAppDataOnUninstall: false`; by
configuration — not tried on Windows).

## Big-moment art (Brief 3, delivery 2026-10-02)

> **Obsolete in part (2026-10-03):** the mentions of the deleted 3D layer in this dated section (Babylon.js, GLB/glTF models, the calibration model, meshes, 3D scenes) are history only; the 2D migration replaced them (see "2D presentation migration" above). Measurements were taken on that build.

The owner's 41 big-moment pictures (14 miracle cards, 12 victory/defeat
splashes, 6 level-up and 9 new-week banners) are in the game, imported by
`npm run art:import` and shown at the matching game events (`ASSET_PIPELINE.md`
§13, "Big moments in the game"). Presentation only: rules, balance, combat
flow, camera angle and the 96 px miracle icons are unchanged; every word on the
pictures is live interface text. **Not in the 0.5.0 installer.**

**Not production-finished (as delivered):** 27 of the 41 masters differ from
the brief's sizes — splashes 1672 × 941 (one 1672 × 940; brief 1920 × 1080),
banners 2172 × 724 (brief 1536 × 512); the miracle cards are 1024 × 1536 as
asked. The exact-size export of the masters is the owner's open decision and
was **not** done; the masters are untouched. The game shows display copies:
cards reduced to 768 × 1152, splashes at their native size (not enlarged),
banners reduced to 1536 × 512 (same 3:1 shape), transparency and padding kept.

**Where.** Miracle card: rises in the kit's gold frame with a live nameplate
over its bottom 18 % when an intervention is invoked (after the rules accept
it) — the player's own on the map or in battle, and an opponent's battle
miracle in the player's battle. Splash: the player's own pantheon painting
behind the battle result (win or loss), the skirmish result, mission failed,
debrief, campaign complete and the summary; live title in the painting's calm
upper centre (x 30–70 %, y 8–30 %), panels in the lower half, existing bottom
scrim plus a soft contrast pool behind the title. Level-up: the hero's own
pantheon banner above the choices, name and "Level up · Level N" on its
measured plaque. New week: at the dawn of day 8, 15, … the weekly event's own
banner (or the default), "Week N", event name and effect on its plaque,
replacing the text day banner; once per dawn, never on load. Timing reuses the
day banner's 2.2 s / 3.6 s (cards 3.6 s), shortened by the chosen animation
speed, counted as time on screen; a click or Esc closes it; reduced motion
removes the rise and fade.

**Found and fixed on the way:** the published `WeeklyEventStarted` event's own
`eventId` field is overwritten by the event envelope's ID (rules processor), so
the text day banner never named the weekly event and the weekly-event tip never
appeared. The interface now reads the drawn event from the committed state
(`weeklyEventOf`); the rules event is unchanged (renaming its field is a rules
change left for the owner). The story-scene busts lost their CSS drop shadow
(the performance rule: no CSS filters over the 3D map).

| Command | Result |
|---|---|
| SHA-256 of the 41 copies in the owner's folder and here vs the delivery `manifest.json` | 41 / 41 match |
| `npm run art:import` | 255 runtime files (214 before + 41), 71.6 MB; the 41 new ones 10.1 MB (cards 2.7, splashes 3.7, banners 3.7); every banner's plaque measured (15 / 15); no warnings |
| `npm run check` | pass — **288** unit tests in 25 files (new `packages/ui/test/bigMoments.test.ts`: 41 files at registered sizes inside `assets-runtime`, banners with alpha and the paintings opaque, never upscaled, aspect kept; every intervention, pantheon and weekly event resolves, unknown ones fall back; moments only from committed events — own miracles, an opponent's battle miracle in your battle, one banner per dawn with the drawn event; hold times) |
| `npm run build` | pass — start-up script 1,549 KB / 420 KB gzip (manifest +7 KB); `dist/` 120 MB, painted art 69 MB |
| `npx playwright test tests/e2e/bigMoments.spec.ts` | **10 / 10** (each trigger once: map miracle with frame, nameplate over the bottom 18 %, Esc without the pause menu, effect applied once, nothing on load; reduced motion without the rise; full motion with the rise and the 3.6 s hold; battle miracle on an enemy stack; won and lost battle results; lost match over the defeat painting; hot-seat long title inside x 30–70 % / y 8–30 % on two lines; level-up banner; week 2 with the Week of the Muse banner once, none on load; the default banner) |
| `npx playwright test` (full suite, production build, after both art rounds) | **70 / 70 passed** in 37.6 min (the 42 opt-in review tests skipped) |
| `node tools/perf/load-time.mjs apps/client/dist --runs 5` | menu **219 ms** local / **452 ms** web (217 / 442 before this round); settled 2,640 / 3,446 ms (ground and sky round: 2,654 / 3,027; noisy single 5-run medians on the software renderer) |
| Review sweep `PR_REVIEW=1 npx playwright test zz-moments-review` (opt-in, screenshots not kept in the repo) | 42 / 42: all 14 cards invoked in play, all 12 paintings under the real battle-result panels (7-stack tables; Greek also at 1024 × 640), all 6 level-up banners with each pantheon's longest hero name, all 9 week banners over a temperate and a snowy (light) map, all banners and cards on a dark and a light sheet — no halos or hard edges seen |

**Seen in the review.** The paintings keep their calm upper centre except the
Japanese victory (the goddess's arm reaches into the title area); the soft
contrast pool keeps the title readable there. Titles and panels never cover the
banner emblems; text stays inside every plaque (an ornament that hangs into a
plaque, like the Egyptian lotus, is measured out). Splashes are 1672 px wide, so
on a 1920 × 1080 window the browser stretches them about 1.15 × (softer, no new
detail); cards are shown from the 768 × 1152 copy (up to ~700 px tall, so on a
high-density display the browser enlarges them slightly). The game has no
laurel title frame (R7 in the brief); titles use the kit's ornament divider.

**Limitations.** Software renderer only (SwiftShader), not a real GPU, the
desktop app or Windows. In this test browser the first composited frames can be
held back for seconds, so the rise is not seen smoothly there; the hold counts
time on screen, so the picture is still shown for its full time. A new-week
banner shows over whatever screen is open at dawn (in hot-seat, over the
hand-over screen). The weekly event's rules event still carries the envelope ID
in its `eventId` field (see above).

## Ground and sky art (Brief 2, delivery 2026-10-02)

> **Obsolete in part (2026-10-03):** the mentions of the deleted 3D layer in this dated section (Babylon.js, GLB/glTF models, the calibration model, meshes, 3D scenes) are history only; the 2D migration replaced them (see "2D presentation migration" above). Measurements were taken on that build.

The owner's 76 ground and sky pictures (60 terrain textures, 6 battlefield
paintings, 10 skies) are in the game: imported by `npm run art:import` and drawn
on the adventure map, around it and in battles (`ASSET_PIPELINE.md` §13, "Ground
and sky in the game"). Presentation only — rules, camera angle, panning and zoom
unchanged. Owner decisions: **mirrored repeat** for the terrain until finished,
seamless versions arrive; the **sky past the north edge of the map** (the fixed
cameras never look up to the horizon; battles show no sky). **Not in the 0.5.0
installer.**

**Not production-finished (as delivered):** terrain 1254² (brief 1024²; the
runtime copy is reduced to 1024², a power of two), battlefields 1419 × 1108
(brief 4096 × 3200, shown at native size), skies 2048 × 768 (brief 4096 × 1536,
native). Terrain and sky seams are **not** seamless: the delivery measures terrain
edge differences 1.2–2.7 × the inside difference (median 1.44; all ten water
textures ≥ 1.9) and sky left/right edges 5–14 ×. Several terrain averages differ
from the brief's colours (median distance 38, up to 64 of 441); the minimap keeps
the brief's colours. Sky horizons are the brief's 62 % target, not measured.

| Command | Result |
|---|---|
| SHA-256 of the 76 copies in the owner's folder and here vs the delivery `manifest.json` | 76 / 76 match |
| `npm run art:import` | 214 runtime files (138 story + 76 ground/sky), 61.5 MB; the 138 story files byte-identical to before |
| `npm run check` | pass — **276** unit tests in 24 files (new `packages/ui/test/groundArt.test.ts`: all 60 terrain IDs for the ten map climates, 6 battlefields, 10 skies and the temperate fallback resolve; files at the registered sizes inside `assets-runtime`; never upscaled; `wrap` = mirror; minimap colours unchanged) |
| `npm run build` | pass — start-up script 1,535 KB / 417 KB gzip (manifest +13 KB); `dist/` 110 MB, of which painted art 60 MB |
| `npx playwright test` | **60 / 60 passed** in 32.5 min (new `groundArt.spec.ts`: temperate and tundra maps fetch only their climate's textures and sky, all 200; the camera's angle is unchanged by panning; a battle fetches its painting) |
| Temporary inspection (not kept): every climate at map centre, north edge and close zoom; every battlefield | screenshots reviewed: climate switching, textures under fog and decor, sea in the climate's water, sky beyond the north edge; battle paintings oriented as the brief says (coast sea, plateau chasm and beacon base at the top, ridge walls left and right), board in the quiet centre, units and grid readable |
| 3 × 3 repeat review of four textures (plain and mirrored) | plain repeat shows only faint seams on these four; **mirrored repeat shows kaleidoscope symmetry** ("butterfly" shapes on the mirror axes), most visible on tundra plains and desert rough |
| `node tools/perf/load-time.mjs apps/client/dist --runs 5` | menu 217 / 442 ms (unchanged); **settled 2,654 ms local / 3,027 ms web (was 1,456 / 1,860)**: decoding and uploading seven 1024² textures with mipmaps on the software renderer. "First scene" now reads 24 ms local / 1,932 ms web because the map is built behind the full-screen briefing before Begin; the measure no longer isolates scene building |

**Limitations.** Software renderer only (SwiftShader); not on a real GPU, not in
the desktop app, not on Windows. With mirrored repeat a second, mirrored sun can
come into view when panning far along the north edge. Sides of the hex tiles keep
their flat colours. Forest and mountain tiles keep the 3D trees and peaks on top
of the painted floor/rock, as the brief asks.

## Owner requests of 2026-10-02, afternoon (specialties, gods, map sites, neutrals) and the story art

Two rounds delivered together: the owner's gameplay request (hero specialties,
the last 24 gods, new map sites, neutral reactions; `DESIGN_PROPOSALS.md` §24–28)
and the **story art** (92 pictures from the owner's art project). All values are
**proposed, unplaytested**. The Three Beacons keeps its documented rules.
**Not in the 0.5.0 installer**; a rebuilt installer is needed to see either
round in the installed game.

### What changed

* **Hero specialties** — all 62 heroes (41 creature, 12 spell, 9 resource),
  shown in the tavern (Heroes' Lodge) before hiring, on the hero screen and in
  the Encyclopedia; scenario feature `heroSpecialties` (skirmish, random maps,
  The Winter Oath, the four arc campaigns). New effects: `creature_stat` may
  name a family; `spell_power_bonus`. Spell specialists start knowing their
  spell (also when hired or freed). The AI orders the tavern by specialty value.
* **Gods** — the 24 undesigned gods now have blessings (two per pantheon join
  the first choice, two the second); new effects `mana_regen`, `wounded_fury`.
  60 gods: 6 patrons, 24 first-choice, 30 second-choice; none undesigned. The
  campaigns' god lists are unchanged, so the new gods appear in skirmish and
  random maps. GPT brief for all 60 portraits:
  `assets-source/art/briefs/GPT6_BRIEF_4_GOD_PORTRAITS.md`.
* **Map sites** — nine new site kinds (learning stone, spell shrine, skill
  trainer, quest hut, key tent, key gate, windmill, treasure chest, prison),
  new commands `OpenChest` and `CompleteQuestHut`, events and sounds, tile-panel
  details, chest and quest-hut dialogs, Encyclopedia "Map sites" and "Neutral
  creatures" panels, marker IDs (`icon.marker.learning-stone` …, the nearest
  existing marker until delivered). Random maps `pr-skirmishgen-0.4` place them
  for every empire alike; new check SKM-7. Tavern lists skip imprisoned heroes.
* **Neutral reactions** — much weaker neutral guards and wandering bands offer
  to join for free (≥ 3× strength, all stacks fit) or flee (≥ 2×); the encounter
  dialog offers Accept them / Let them go / Fight anyway. No experience; reward
  and bounty kept; `clearedBy` recorded for quest huts. Feature
  `neutralReactions` (skirmish and random maps only). The AI uses it.
* **Path-finding speed-up** (needed by the 3-empire AI test): site index cached
  per sites object, hero occupancy built once per search, a binary heap in
  `findHeroPath`. Same routes; the 3-empire all-AI test went from 215 s to 17 s
  with the identical result.
* **Story art** (`ASSET_PIPELINE.md` §13): copied into `assets-source/art/final/`
  (92 of 92 SHA-256 match the delivery manifest), imported by the new
  `npm run art:import` into 138 runtime WebP files (33.4 MB) without upscaling;
  busts beside the dialogue box (mirrored on the right), campaign covers behind
  campaign selection and its setup steps with 640 × 360 cards, a new
  full-screen briefing scene on the mission picture, mission and skirmish
  cards, and the chosen ending behind the campaign epilogue. The skirmish and
  random-map herald now has its own portrait ID (`story.herald.portrait`)
  instead of the leader's.
* Smaller: modal footers wrap on narrow windows; "+1 hex" (not "hexes") in
  vision blessings; the balance tool switches specialties off in its troop
  duels (whole matches keep them).

### Tests and checks actually run

| Command | Result |
|---|---|
| SHA-256 of the 92 copies (on the owner's computer and here) vs the delivery's `delivery-manifest.json` | 92 / 92 match; destination held only `README.md`; no name conflicts |
| `npm run art:import` | 35 busts, 6 covers, 11 endings, 40 mission pictures → 138 runtime files, 33.4 MB (busts 768 × 1152 RGBA; landscapes native 1672 × 940/941; cards 640 × 360) |
| `npm run check` | pass — boundaries, type-check, **272** unit tests in 23 files. New: `packages/rules/test/mapSites.test.ts` (17: specialties scaling/spell/income/off in The Three Beacons; each new site; key gates per player; prisons and the tavern; join/flee/fight, no XP, thresholds, feature off), `packages/ui/test/storyArt.test.ts` (7: files and sizes, no paths outside `assets-runtime`, never upscaled, 35 busts ↔ speakers, 6 covers, 11 ending routes, 38 + 2 mission pictures, speaker sides) |
| `npm run build` | pass — start-up script 1,522 KB / 415 KB gzip (before this round 1,450 / 398 KB); `dist/` 83 MB of which story art 33 MB |
| `npx playwright test` (production build, Chromium + SwiftShader) | **57 tests in 26.0 min: 56 passed**; the one failure expected "Fairness checks 5/5" on the random-map screen — generator 0.4 adds SKM-7, so it now reads 6/6; the test was updated and passed on rerun. New: `mapSites.spec.ts` (4: tavern specialties, neutrals offer to join and join without a battle, treasure chest, quest hut) and `storyArt.spec.ts` (3: covers and cards + briefing art + busts and mirroring at 1600 × 900 and 1024 × 640; the Three Beacons ending behind its epilogue, reached from a save on the last beacon, at both sizes; every `<img>` decoded). After the last CSS changes the 7 new tests were rerun: 7 / 7 |
| `npm run balance` (all suites, 2 workers) | 537 jobs in 9.9 min (`balance-reports/balance-2026-10-02T14-34-52.md`). **Twin Harbors: 216 matches, mean decisive day 14.9 (20.0 before), west 0.54, first mover 0.68 (0.42 before)**; pantheon averages 0.37 (Greek) – 0.60 (Norse). Random maps: 2 empires 0.50 / 0.50 (18 matches, mean day 20.3); 3 empires 0.56 / 0.39 / 0.06 (18 matches; noisy, earlier runs 0.41 / 0.41 / 0.18). Army, escort and tier duels unchanged from the last report (they play troops only; specialties are off in duels) — see the attribution runs below |
| `node tools/perf/load-time.mjs apps/client/dist --runs 5` | menu **221 ms** local / **446 ms** web (before 211 / 431); first scene 1,311 / 1,255 ms (single 5-run medians on the software renderer) |
| `npm run icons:catalog` | 786 entries (+8 map markers, +`story.herald.portrait`); mission and campaign cards now count as delivered art |
| Random-map probe (990 maps: every size, type, 2–4 empires) | all valid (SKM-1…7); key pockets on 818 (83 %) |

### Neutral reactions and turn order (attribution runs, Twin Harbors skirmish suite only, 216 matches each; the source was restored after each run)

| Variant | Mean decisive day | West | First mover |
|---|---|---|---|
| Shipped: flee at 2×, join free at 3× | 14.9 | 0.54 | **0.68** |
| Reactions off (specialties on) | 20.0 | 0.55 | 0.45 |
| Flee at 3×, join at 4× | 19.9 | 0.55 | 0.46 |
| Flee at 2×, never join | 19.6 | 0.51 | 0.48 |

Free joiners are what shortens the game — and on this small two-town map
they give the empire that moves first each day a clear edge (0.68): its leader
collects the free troops on the way first. Specialties alone leave turn order
as it was (0.45). This is the owner's chosen rule; options are in
`DESIGN_PROPOSALS.md` group 0.7, question 3.

### Story art — measured notes and per-image adjustments

* **Resolution:** the 57 landscapes are native 1672 × 940/941, not the brief's
  1920 × 1080 / 2560 × 1440. Shown at their native size; on screens wider than
  1672 px they are scaled up by the browser (soft, not sharpened). The owner's
  resize-only export decision is still open.
* **Framing on screen:** pictures fill the window (`cover`). At 16:9 nothing is
  cut; at 16:10 about 5 % of each side; at 4:3 about 12.5 % of each side.
  Endings with their characters at the left edge would lose part of a figure at
  4:3: The Three Beacons epilogue (Ione), New Fire "old sun" (Xoco), Lantern
  Road "lanterns lit" (Akane) and Winter Oath "sword broken" (Hervor). A
  per-image focal point (`object-position`) would fix it; not added, since no
  4:3 layout is supported today.
* **Busts:** clean transparent cut-outs (checked on a contact sheet). Five reach
  the top edge in the painting itself (Dubhghall's antlers, Itztli's headdress,
  the Grey Jarl's crown, Hrafn's axe, Svanhild's helmet wing), so their tops are
  flat; many cloaks touch the side edges, which shows as a straight vertical
  edge where the bust stands beside the box. Only a repaint or outpaint fixes
  either; the game does not crop busts.
* **Dialogue over paintings:** in the briefing scene and the epilogue the bust
  keeps to the dialogue band (30 % / 26 % of the window height) and stands beside
  the box only on windows at least 1,500 px wide; narrower windows show it in a
  2:3 slot inside the box. The story window (no painting behind) keeps the tall
  bust.

### Limitations

* Headless Chromium (SwiftShader) only; not in the desktop app, not on Windows.
* Balance of specialties, the new gods, sites and reactions is AI-vs-AI only.
  The faster AI middle game shortened the idle-player Twin Harbors tests (the
  rival reaches an undefended Westharbor on day 6, was day 11–12); two tests now
  garrison Westharbor.
* Not committed.

## Functional icons delivered 2026-10-02 (172: interface, spells, artifacts, skills)

> **Obsolete in part (2026-10-03):** the mentions of the deleted 3D layer in this dated section (Babylon.js, GLB/glTF models, the calibration model, meshes, 3D scenes) are history only; the 2D migration replaced them (see "2D presentation migration" above). Measurements were taken on that build.

An art integration, not a redesign: layouts, labels, tooltips and
accessibility are unchanged. **Not in the 0.5.0 installer** (built before the
icons); a rebuilt installer is needed to see them in the installed game.

* **Copied, not moved:** the 172 PNGs (`<asset ID>.png`, 1254 × 1254 RGBA, 247 MB)
  from the owner's handoff folder
  `blannder_models\icon_delivery_2026-10-02\assets-source\icons\final\` into
  `assets-source/icons/final/` (merged; the folder held only `.gitkeep`; no ID
  conflicts). All 172 SHA-256 match the handoff's `delivery-manifest.json`. The
  originals were not touched; nothing links to or loads from the Blender
  workspace. No separate `masters/` copy was made: `final/` already keeps the
  unmodified masters (the importer only reads them).
* **Imported** with `npm run icons:import` — "imported 172 final icon(s); 172
  registered": 54 spell + 79 artifact icons at 128 px, 22 interface + 17 skill
  icons at 96 px, RGBA, 3.73 MB in `assets-runtime/ui/icons/final/`, registered
  in the game's own `assets-runtime/ui/final-manifest.json` (empty before; the
  handoff's manifest was not used). `npm run icons:catalog` regenerated
  `ICON_CATALOG.md`/`.xlsx`/`.csv`: 777 entries, **221** still without their own
  art (393 before).
* **Where each icon now shows** (existing components where they already existed):
  spells — spellbook, Encyclopedia, adventure cast buttons, the battle spell
  choice (shown when two or more spells can be cast); artifacts — paper doll,
  backpack, item cards, Encyclopedia, Artifact Merchant, battle-result loot,
  encounter reward preview; skills — hero skill slots, level-up offers,
  Encyclopedia; interface — every place the game draws that glyph
  (`iconArt` → `icon.ui.<name>`; explicit `glyph` uses keep the SVG). The menu's
  own owner icons (Campaign etc.) are unchanged.

Code changes: `SkillIcon` added beside `SpellIcon`/`ArtifactIcon`
(`components/art.tsx`; generic star glyph when a skill has no file); icons added
to `LevelUp.tsx`, `Encyclopedia.tsx` (skills), `Town.tsx` (merchant),
`BattleResult.tsx` (loot), `Overlays.tsx` (encounter reward chips), `Battle.tsx`
(spell choice) and `Adventure.tsx` (cast buttons; the eye/spell glyph is
replaced by the spell's icon). `.spell-socket img` now shows the art at 80 %
without the circular clip — 29 delivered spell silhouettes reach past the
inscribed circle (up to 1.20 × its radius), so 86 % with `border-radius: 50%`
cut their tips; the socket keeps its round frame. `.skill-socket` styles added.
The catalog tool now counts glyphs chosen in expressions and the ability-badge
stand-ins (`ABILITY_GLYPH`, now exported from `components/badges.tsx`), and
reads interface art under `icon.ui.<name>`.

**Reserved icons.** The handoff lists `bow`, `upgrade` and `check` as "not
shown on any screen yet" — copied from the old catalog, which missed three
existing uses: `bow` and `upgrade` are the stand-in glyphs of the Shooter and
Shapeshift ability badges, `check` marks completed objectives (adventure panel,
journal). They are registered and now show there; no button or feature was
added. The corrected catalog lists these uses.

### Tests and checks actually run (icons)

| Command | Result |
|---|---|
| SHA-256 of the 172 copies vs `delivery-manifest.json` (on the owner's computer and here) | 172 / 172 match |
| Delivery `icon-placement.csv` vs the game's catalog and manifest | 172 rows: names, runtime URLs and target sizes all agree. `shown_on` differs for spells and artifacts because the game lists the screens that really show them (no town spell-library list or map-event loot icons exist) |
| `npm run check` | pass — boundaries, type-check, **248** unit tests (new: every final-manifest entry is a catalog ID with a bundled RGBA PNG of its section size, and every delivered source file is registered) |
| `npm run build` | pass — start-up script 1,450 KB / 398 KB gzip (+36 / +3.4 KB: the manifest with 172 provenance lines is part of the start-up catalog) |
| `node tools/perf/load-time.mjs apps/client/dist --runs 5` | menu **211 ms** local / **431 ms** web (before: 209 / 434 — no measurable change); first scene 1,542 ms local, 1,247 ms web (noisy single 5-run medians on the software renderer; before 1,495 / 1,281) |
| HTTP fetch of all 172 manifest URLs from `npm run preview` | 172 × 200, all PNG |
| Contact sheets of the runtime files at 24 / 48 / 64 px on dark and light | viewed: clean alpha edges, no halos; interface icons readable at 24 px |
| Playwright inspection of the production build (temporary script, not kept): main menu, Encyclopedia (spells/skills/artifacts, creature viewer), adventure map with cast buttons, hero screen (doll, backpack, skills), spellbook, town, Artifact Merchant, encounter dialog with artifact reward, battle with spell choice, battle result with loot, level-up | pass; **167** distinct final icons requested (all 150 spell/skill/artifact icons on the Encyclopedia page; 17 interface icons), 0 non-200 responses, 0 failed requests, 0 console errors; every final-icon `<img>` decoded. Screenshots reviewed: no cropped spell sockets (image 0.75 of socket, no clip), rarity frames and set badges intact |
| `npx playwright test` on the specs that cover the changed screens: `menu`, `heroscreen`, `services`, `round3`, `journey`, `features`, `heroes` | **31 of 31 passed** (12.4 min). The full suite (50 tests) was not rerun |
| Old art | the 111 other files in `assets-runtime/ui/` are byte-identical to the owner's copy; `manifest.json` unchanged |

### Limitations (icons)

* Inspected in headless Chromium (SwiftShader) only — not in the desktop app,
  not on Windows, not on a real GPU. Headless screenshots drop dialogs drawn
  over the WebGL map, so the spellbook and encounter dialogs were captured with
  the canvas hidden (a capture workaround; the same happened before this change).
* Five interface icons were not seen during the inspection (`beacon`,
  `check`, `growth`, `lock`, `save`); they resolve through the same path.
* Not every listed surface exists: the town Library shows its tier only (no
  spell list), and map events name their loot in text — no icons were added
  there, since that would be new UI.
* The battle spell choice appears only when two or more spells can be cast (as
  before); the single Spell button keeps its glyph. Encounter reward chips show
  the artifact at 20 px — small but legible.
* Not committed.

## Owner requests of 2026-10-02 (AI, hero screen, random maps 0.3, four campaigns, three fixes)

> **Obsolete in part (2026-10-03):** the mentions of the deleted 3D layer in this dated section (Babylon.js, GLB/glTF models, the calibration model, meshes, 3D scenes) are history only; the 2D migration replaced them (see "2D presentation migration" above). Measurements were taken on that build.

Designs and values: `DESIGN_PROPOSALS.md` §19–23 and
`CAMPAIGNS_3_TO_6_OUTLINE.md`. Owner answers: about **8 hexes a day**;
**maximum range + half damage in the far half**; **seven missions** per
campaign; **a neutral roster mixed with pantheon creatures**. Everything else
is **proposed, unplaytested**.

* **The last attack is shown** — the battle screen keeps the board when the
  rules end the battle, plays the final blow and the fall of the last stack,
  then opens the result (700 ms at normal speed, none at instant speed).
* **Shooting range per creature** — `range` (hexes) on all 22 shooters
  (content validator 2–20): no shot beyond it, half damage in its far half
  (replaces the old rule: half damage beyond 10 hexes, no limit). Proposed
  ranges: most shooters 16/17, Greek Temple Adepts and Cyclopes 18/19, Eagle
  Warriors 14/15, **short range** Banshees and Hill Slingers 9/10 (the field
  is 15 × 11). A first set of 6–11 was measured and rejected (below). Shown
  on the creature card, beside the active stack in battle and in an "Out of
  range: N hexes away" refusal. The tactical AI holds a shooter with nothing
  in range while enemy troops approach (unless it is under fire), and
  otherwise steps only as far as it must to bring an enemy into range.
* **Hero movement** is the rules-profile table `movementBySlowestSpeed`
  (it already was a property): now 750–1,000 points, about 7.5–10 plains
  hexes a day (was 1,500–2,000). Fleet Foot, Wings of Hermes and the
  "directions" event were halved with it.
* **Random maps 0.3** — eight **neutral families** (Brigands, Hill Slingers,
  Wild Boars, Clay Golems, Wyverns, Ogres, Basilisks, Elder Drakes; with the
  Centaurs 18 creatures) drawn half and half with pantheon creatures for
  guards, camps and wandering monsters, and a **Neutral** filter in the
  bestiary; **two-way portals** (setting, on by default; the existing
  `icon.marker.portal`), paired by the map's symmetry so every empire gets the
  same; **roads to the centre** with full roads; **rotating turn order**
  (setting, the default with three or four empires: the day's first empire
  moves last the next day).
* **Three-empire fairness** — re-measured on 30 different maps instead of
  five maps six times: the "second seat" lead was a sampling artifact; the
  weak seat is the one that moves first. Rotating turn order spreads that
  but does not remove it (table below).
* **Rule change (proposed)**: defeated heroes return to the tavern pool as
  new recruits (long games stalled when an empire's pool ran dry).
* **AI** (`packages/ai/src/growth.ts`) — level-up choices by value to that
  hero and army; artifacts valued as a whole loadout with set bonuses (equip,
  swap, buy at the merchant by gain per Gold); adventure spells (movement,
  scouting, Recall). Map fixes found on the way: reinforcing from any owned
  town, approaching an unseen rival town only with enough strength, the last
  town valued higher, portals used as shortcuts, and equally scored moves no
  longer broken by coordinate order (the west and east empires used to prefer
  different directions on a mirrored map).
* **Hero screen** — drag and drop between the backpack and the doll; a
  comparison of a picked item with what each slot wears (attributes and set
  bonuses gained or lost); **set badges** and **ability badges** (army slots,
  creature details, Encyclopedia) that show `icon.set.<id>` /
  `icon.ability.<id>` as soon as they are delivered and a temporary stand-in
  until then.
* **Four campaigns, seven missions each** — *The Twelfth Hour* (Egyptian),
  *The Lantern Road* (Japanese), *The Silver Branch* (Celtic), *The New Fire*
  (Mesoamerican): 28 missions built on the Winter Oath's mission shapes
  (`packages/content/src/campaign/arc.ts`), four new campaign heroes, twenty
  enemy heroes, story scenes, two endings each, a pantheon artifact set
  collected along the way; four presentation biomes (`desert`, `jungle`,
  `autumn`, `moor`).
* **Icon catalog** regenerated: 777 entries (was 695), 393 still without art of their own; set and ability sections now describe the badges.

### Tests and checks actually run (2026-10-02)

| Command | Result |
|---|---|
| `npm run check` | **pass — 246 tests** (21 files; rerun after the final values). New: `packages/ai/test/ai.test.ts` +1 (a shooter with nothing in range holds while enemy troops approach and otherwise steps only into range); `packages/ai/test/growth.test.ts` (6: Archery/Offense by army, Wisdom only with a spellbook, a set piece over a slightly stronger loose item, a swap that completes a set bonus, a movement spell with a battle reserve, Recall to a threatened town); `packages/campaign/test/arcCampaigns.test.ts` (16: per campaign data and order rules, every map generates and validates, both endings, and a **headless journey through all seven missions with carryover**, every battle fought by the tactical AI on both sides); `random.test.ts` +6 (portal pairs the same for every empire, roads to the centre, the neutral mix, a portal step and a blocked twin, rotating turn order on and off); `battle.test.ts` +1 (every shooter has a range; no shot beyond it, half damage in its far half — with the short-range Hill Slingers). The existing all-AI three-empire match test now ends with a single winner again after the defeated-hero and AI fixes (it had stalled to its day limit during this round) |
| `npm run build` | pass — start-up script **1,413.92 KB (394.18 KB gzip)**; previous round 1,210 / 340. The four campaigns' text and the neutral roster are part of the start-up catalog |
| `npx playwright test` (Chromium + SwiftShader, production build) | **50 tests, two full runs.** First run 49/50 (first range set): the calibration-model battle timed out waiting for the result (150 s) — its Peltasts had to walk into range, so the auto-battle played more moves, and the run shared the CPU with balance measurements; the test's limit is now 270 s. Final build: 49/50 in 35.9 min; the one failure was the Egyptian escort count written into `pantheons.spec.ts` (20 → 21, changed this round), passed on rerun. New `tests/e2e/round3.spec.ts` (7): the last blow is shown (the board stays up after the rules end the battle), random map with portals on by default and neutral guards, the Neutral bestiary, all four new campaigns from New Game to their first map; `heroscreen.spec.ts` +1: drag and drop, comparison, set badges |
| `node tools/perf/load-time.mjs apps/client/dist --runs 5` | menu **209 ms** local / **434 ms** web (previous round 180 / 378); first scene 1,495 ms local, 1,281 ms web (single 5-run medians on the noisy software renderer; previous round 1,199 / 1,689). The larger start-up script costs roughly 30–55 ms on the menu |
| `npm run desktop:build` + `xvfb-run -a node tools/desktop-smoke.mjs` | **pass** (development layout: saves, records, unit GLB, the six hero GLBs, audio running). The packaged-layout smoke (`PR_SMOKE_EXE`) was **not** run |
| `npm run icons:catalog` | pass — 777 entries, 60 glyph thumbnails rendered |
| `node tools/balance/run.mjs random` (30 matches per empire count, a different generated map per match; four runs) | see the fairness table below |
| `node tools/balance/run.mjs armies starts tiers skirmish` (several runs; see below) | final: Twin Harbors 216 matches, **west 0.52, first mover 0.42**, pantheon averages 0.40–0.60; full-roster armies 0.35–0.64 except Celtic upgraded 0.68 (as in 0.4.0); starting escorts 0.42–0.57 |

**Shooting ranges, measured before they were chosen** (AI-vs-AI, 12 duels per
direction and pairing; pantheon averages, 0.50 = even):

| Ranges | Greek armies | Egyptian armies | Norse armies | Starting escorts |
|---|---|---|---|---|
| Old rule (no limit, half damage beyond 10) on this round's code | 0.38–0.47 | 0.41–0.52 | 0.44–0.56 | 0.42–0.59 |
| First set, 6–11 (full damage only up to 3–5 hexes) | **0.31–0.33** | 0.32–0.37 | 0.59–0.69 | Greek 0.30, **Egyptian 0.18**, Norse 0.72 |
| 9–15 + AI holds shooters out of range | 0.27–0.38 | 0.35–0.52 | 0.49–0.66 | Greek 0.29, Egyptian 0.32, Norse 0.68 |
| **Shipped**: 16–19 (short 9/10, Eagle Warriors 14/15), Egyptian escort 21 + 8 | 0.35–0.44 | 0.37–0.51 | 0.39–0.63 | 0.42–0.57 |

Why: with full damage only in the near half of the range, every hex of range
counts twice; shooter-heavy rosters (Greek three shooters, Egyptian two) lost
most. Single-stack duels still show the short-range Banshee at 0.01 (base).

**Twin Harbors turn order.** The slower map (8 hexes a day) moved the
first-mover score from 0.43 (the same code with the old 1,500–2,000 movement)
to **0.34**: the empire that moves first walks into the middle on day 3 and
is caught by a hero it cannot see (vision 5, reach 8). Fixing the AI's
tie-breaks (equal moves were ordered by coordinates), measured together with
the final ranges, brought it back to **0.42** with the west score at 0.52.
Measured but **not shipped**: hero vision 8 instead of 5 gives first mover
0.47 but west 0.56 (a rules change; an open question for the owner). 0.4.0 measured 0.52; the remaining gap is not yet
explained.

**Three-empire fairness** (small random maps, every seat the same pantheon,
all AI, day cap 40; undecided matches scored on army strength):

| Measurement | Matches | Decided | Seat scores 1, 2, 3 (even 0.33) | First knocked out (seat 1, 2, 3) |
|---|---|---|---|---|
| 0.4.0 (generator 0.2, five maps × six) | 30 | 6 | 0.23, **0.60**, 0.17 | — |
| This round before rotation, five maps × six | 30 | — | 0.29, **0.49**, 0.22 | — |
| This round before rotation, 30 different maps | 30 | 18 | **0.21**, 0.38, 0.41 | 13, 11, 6 |
| With rotating turn order, 30 different maps | 30 | 15 (5, 5, 5 by seat) | 0.32, 0.29, 0.39 | 6, 10, 12 |
| **Final code** (rotating, AI tie-break fix, final ranges), 30 different maps | 30 | 18 (6, 10, 2 by seat) | 0.41, 0.41, **0.18** | 5, 11, **12** |

Two empires on 30 different maps: 0.48, 0.52 before and **0.47, 0.53** with
the final code (24 decided, mean decisive day 20.4). The old "second seat
wins" result came mostly from playing only five maps: on thirty different maps
seat 2 was not ahead, and the empire that moves first each day was knocked out
first most often (it moves into the others' reach before they move).
**Rotating turn order** spreads that disadvantage but does **not** remove it:
in both rotating runs the empire that moves first on day 3 (seat 3) was the one
knocked out first most often (12 of 28 each time). The final seat scores
disagree between the two runs (seat 3 best in one, worst in the other); with
30 matches one seat's score has a sampling error of about ±0.09, so neither
run shows the seats even or uneven with confidence. Next steps: more matches
per run, and an AI that keeps the day's first mover out of unseen reach (see
Twin Harbors above). Many three-empire matches still reach the day-40 cap
(mean decisive day 26–28).

### Limitations (2026-10-02)

1. **All values are proposals** — ranges, movement, the neutral roster, the
   portals and every campaign's guards, wallets and costs were checked by unit
   tests and AI-vs-AI runs only. The headless journeys follow a direct route,
   so they say the missions are winnable, not that they are well paced.
2. The four campaigns reuse the Winter Oath's mission shapes and economy
   closely; each has its own story, enemies, rewards and biome, not its own
   mechanics. Celtic Mission 5 is the costliest step of the four journeys.
3. With about 8 hexes a day, maps feel larger and AI-vs-AI games run longer
   (Twin Harbors: mean decisive day 20 instead of 9–10); random-map sizes
   were not reduced.
4. **Turn-order fairness is not settled**: Twin Harbors first mover 0.42
   (0.4.0: 0.52); with three empires the day-3 first mover is knocked out
   first most often even with rotating turn order. Ranges keep the pantheons
   inside 0.35–0.65 except Celtic upgraded armies (0.68, as before), but the
   longest ranges rarely stop a shot on the 15-column field.
5. New characters (4 heroes, 20 enemy heroes), the neutral creatures, the
   badges and the portal model use **placeholders** (generated portraits,
   proxy models, gem/glyph stand-ins). The campaigns reuse the three existing
   soundscapes.
6. The start-up script grew by about 200 KB (54 KB gzip) with the campaign
   text; the catalog is not split by campaign yet.
7. Not committed or pushed when written; the owner has since committed it, and the 0.5.0 installer (above) contains it.

## Owner requests of 2026-10-01 (icons, second campaign, M02 order, random maps, hero screen, spells and artifacts)

> **Obsolete in part (2026-10-03):** the mentions of the deleted 3D layer in this dated section (Babylon.js, GLB/glTF models, the calibration model, meshes, 3D scenes) are history only; the 2D migration replaced them (see "2D presentation migration" above). Measurements were taken on that build.

Designs and values: `DESIGN_PROPOSALS.md` §13–18 and
`CAMPAIGN_2_NORSE_OUTLINE.md`. Owner answers: Norse — *The Winter Oath*; M02
blocked on the map **and** early completion (every campaign); Heroes-3-style
slots (content version bump, old saves refused); about 30 spells and 45
artifacts. Everything else is **proposed, unplaytested**.

* **Icon catalog** — `ICON_CATALOG.md` (repo root) and
  `assets-source/icons/ICON_CATALOG.xlsx` / `icon_catalog.csv`: 695 entries in
  12 sections (interface icons, map markers, spells, artifacts, sets, skills,
  interventions, abilities, effect art, portraits, creatures, emblems /
  buildings / thumbnails) with asset ID, screens, what is shown today
  (thumbnail in the spreadsheet), a drawing brief, details and lore; 345 have
  no art of their own yet. Generated from the game by `npm run icons:catalog`
  (development tool in `tools/assets/icon-catalog/`). New drop-in path for
  final art: PNGs named by asset ID in `assets-source/icons/final/` +
  `npm run icons:import` → `assets-runtime/ui/final-manifest.json` (takes
  precedence over every placeholder; interface glyphs pick up `icon.ui.<name>`).
* **The Winter Oath** — seven Norse missions with Hervor, carryover, story
  scenes, two endings; new generic data: objective conditions `hero_defeated`
  and `town_owned`, minor-god `count`, starting garrisons, epilogue variants,
  winter biomes `tundra` / `fjord` (frosted map colours; `fjord` has a water
  edge). Five Norse enemy heroes. Mission 5 seats a full AI rival empire.
* **Three Beacons M02 in order** — `requires` on objectives + early
  completion; journal "Opens after" and "Done early".
* **Random maps 0.2** — six map types, zones, guarded passes and gates, huge
  size, guard / treasure / wealth / road / revealed-map settings, SKM-6; AI fix
  (garrison counted when judging a threatened town).
* **Hero screen** in the Heroes-3 layout with the 3D mounted model, a 19-slot
  paper doll and backpack, and a spellbook dialog.
* **Spells and artifacts** — 30 new spells (54), 54 new artifacts (79), 6 new
  sets (10), four new spell effects and the `enemy_army` target, town spell
  libraries with a per-match draw; lore on every spell and artifact.

### Tests and checks actually run (this round)

| Command | Result |
|---|---|
| `npm run check` | **pass — 216 tests** (19 files). New: `packages/campaign/test/winterOath.test.ts` (6: data and order rules, both epilogues, an early-completed step, M5 rival set-up, M7 played directly to "sword returned", and one headless journey through **all seven missions with carryover** to "sword broken", every battle fought by the tactical AI on both sides); `random.test.ts` +10 (every map type fair and valid for 2/3/4 empires, SKM-6, guard/treasure/wealth scaling, sparse roads, revealed map, huge maps deterministic); M02 order tests in `threeBeacons.test.ts`. Two older tests adjusted: the Norse hero list now includes the campaign's enemy heroes; the camp-restock test keeps its passive player safe from the AI rival for the week (with the new maps the AI took the idle player's town by day 7) |
| Journey numbers (headless, auto-combat) | missions end on days 1–4 of a direct scripted route; Hervor reaches level 9; she wears all four Arms of the Einherjar at the final battle; losses are moderate (the final stretch to the Grey Jarl costs her all 18 Fenrir Wolves and 8 Ancient Frost Trolls) |
| AI-vs-AI game length, 2 empires, small, 12 seeds each (old 0.1 generator from the owner's copy vs 0.2) | days to a winner: 0.1 — median 9 (3–21); 0.2 continental — median 12.5 (3–40). Per map type (6 seeds): highlands 2–17, lake isle 3–30, wild forest 4–28, marshlands 7–25, crossroads 3–8 and **one stall to the day cap** (seed 43: both empires keep losing their heroes and piling troops into garrisons) |
| `npm run icons:catalog` / `npm run icons:import` | catalog written (695 entries); import checked with a test icon (resized to 128 px, registered, then removed again) |
| `npm run build` | pass — start-up script 1,210 KB (340 KB gzip; before this round 1,063 / 300): the new content (spells, artifacts, lore, the campaign text) is part of the start-up catalog |
| `npx playwright test` (Chromium + SwiftShader, production build) | **42 of 42 passed** (20.1 min). New `tests/e2e/heroscreen.spec.ts` (2): hero screen — doll slots, equip from the backpack into the weapon and both ring slots, a helm refused by the feet slot, unequip from the artifact card, the spellbook lists Rune of Tyr, the 3D figure reaches `ready`, no console errors; The Winter Oath from New Game → briefing → Kaldvik (Odin, Hervor, fjord biome) |
| Visual check (screenshots) | Winter Oath M1 and M5 maps in the frosted palette; the icon spreadsheet's thumbnails (rendered to PDF) |
| `node tools/perf/load-time.mjs apps/client/dist --runs 5` | menu **180 ms** local / **378 ms** web (mounted-hero build: 157–166 / ~330 ms); first scene 1,199 ms local, 1,689 ms web (single 5-run medians on the noisy software renderer; the mounted-hero build measured 1,397–1,461 ms local). The larger start-up script costs roughly 15–50 ms on the menu |
| `npm run desktop:build` + `xvfb-run -a node tools/desktop-smoke.mjs` | **pass** (development layout: saves, records, unit GLB, the six hero GLBs, audio running). The packaged-layout smoke (`PR_SMOKE_EXE`) was **not** run this round |

### Limitations (this round)

1. **All values are proposals**: the campaign's guards, wallets and costs, the
   new spells and artifacts and the random-map settings were tested by unit
   tests and AI-vs-AI runs only. The headless journey follows a direct route,
   so it says the missions are winnable, not that they are well paced.
2. The **AI rival in M5** strips Hvitstrand's garrison into Ulfhild's field
   army (existing AI behaviour); the journey took the town on day 4 while she
   was near Ravnholt.
3. **Short AI-vs-AI games** on small 2-empire maps (both generators): a leader
   lost early leaves an empty town. One crossroads stall in 30 runs.
4. New characters, the five enemy heroes, every new spell and artifact use
   placeholders (generated portraits; effect-family or kind icons). Campaign
   missions reuse the three existing soundscapes.
5. **Saves from content 0.7.0 are refused** (equipment layout changed).
6. Abilities and artifact sets have reserved icon IDs only; the screens still
   show text for them.
7. Not committed or pushed; no new installer.

## Mounted adventure-map heroes (owner request, after 0.4.1)

> **Obsolete (2026-10-03):** this whole section describes the mounted-hero GLB models and their 3D animation, deleted by the 2D migration (map avatars are 2D sprites now; see "2D presentation migration" above). Kept as history only.

The six animated mounted heroes (rider + mount, one skinned GLB per
pantheon, release `MountedHero_Animations_v1`) were **copied** from the
owner's separate Blender project (`C:\Users\lazeb\Desktop\blannder_models`)
into the game; the game has no link, import or runtime path into that
project. Details and the file table: `ASSET_PIPELINE.md` §12.

* **Copied** (byte-identical, SHA-256 checked on both computers):
  `runtime\models\heroes\animated\hero_<pantheon>.glb` →
  `assets-runtime/heroes/<pantheon>/hero_<pantheon>.glb` (six);
  `assets\characters\heroes\shared\mounted_hero_animated_rig.json` →
  `assets-runtime/heroes/shared/`. **Copied with game paths**:
  `animation_manifest.json` → `assets-runtime/heroes/animation_manifest.json`
  (`assets[].runtime`, `skeleton.contract`, `integration_guide` rewritten; a
  `game_copy` block names the source); `HERO_ANIMATION_REPORT.md` →
  `assets-source/heroes/` under a short note. The Blender sources, the
  delivery zip and the preview GIFs were not copied (editing only). The
  Blender project was only read.
* **Map heroes**: each hero entity on the adventure map shows its pantheon's
  mounted model (hero definition's pantheon, else the owner's) with its own
  skeleton and animation groups; one container node turns the model's +Z
  front to the map's +X and scales it uniformly by 0.36 (measured heights
  1.28–1.43 map units on a 1.73-unit hex); owner banner + translucent owner
  disc keep faction ownership visible; selection, picking, movement, fog
  visibility and town offsets are unchanged. Placeholder riders show until a
  model has loaded (models load once the map has drawn its first frames) and
  stay if a load fails.
* **Animation**: Idle_Standing loops while standing (random phase per hero);
  Walk loops while the map moves the entity, facing each step, with 0.2 s
  crossfades, rate = speed ÷ (0.75 × 0.36) capped at 3.5; back to idle on
  stop. Loop flags come from the manifest and are set explicitly.
* **Prepare_War before battle**: after **Attack** in the encounter dialog
  (the rules commit the move and the battle start exactly as before), the
  hero walks to the approach tile, stops, faces the opponent (a defending
  mounted hero turns to meet it), plays Prepare_War once and holds the last
  pose; the battle screen opens from the animation group's end event, once.
  If the encounter goes away meanwhile (load, Main Menu, Restart Mission)
  the completion is ignored and the hero blends back to idle. Withdraw
  cancels before anything is committed.
* **Fixed map camera**: yaw and pitch limits locked, no orbit/tilt/rotate
  input (only the wheel zoom), left/middle drag and the arrow/pan keys
  translate the target screen-relatively, clamped to the map. **Bug fixed on
  the way**: Babylon's `ArcRotateCamera.target` setter re-derived radius (and
  alpha/beta, then clamped) from the old camera position, so every drag
  changed the zoom slightly (measured 0.053 units per 220 px drag); the
  camera now keeps alpha, beta and radius when the target moves
  (`overrideCloneAlphaBetaRadius`).
* Read-only `?e2e` additions: `__prHeroes()` (per-hero model state, clip,
  rates, weights, Prepare_War counts, yaw), `__prCamera()` (alpha, beta,
  radius, target), and `battleScreenOpens` / `prepareWar` outcome counters in
  `__prInspect()`. No commands are exposed.

### Tests and checks actually run (mounted heroes)

| Command | Result |
|---|---|
| `npm run check` | **pass — 198 tests** (18 files). New `packages/presentation/test/heroes.test.ts` (6): copies and checksums match the manifest, paths stay inside the game; the three exact clips, skin and loop policy per GLB; the rate formula; all six load in a headless left-handed scene with their own skeleton, skin attributes, materials and vertex colours at one scale; instances independent; +Z front lands on +X; Walk crossfade at the matching rate, the cap, back to idle; Prepare_War not finished at 1 s, finished once after 2.6 s, holds the pose, never fires again; a cancelled gesture resolves "cancelled", ignores the end event and returns to idle |
| `node tools/assets/validate-units.mjs --no-write` | six hero GLBs pass (checksum, clips, skin, no CDN-decoder extension, Khronos validator 0 errors); the script now checks `assets-runtime/heroes` too |
| `npx playwright test` (Chromium + SwiftShader, production build) | **40 of 40 passed** twice (19.0 min; and 18.4 min on the final code, after the deferred model loading and a frame-time-tolerant wait in one test). New `tests/e2e/heroes.spec.ts` (6): six pantheons each show their own model, idling, every request same-origin and the six GLBs fetched from `/heroes/<pantheon>/`; a 4-step move plays Walk on that hero only (crossfade seen, rate 3.5 of a requested ~30.5), faces the last step, returns to idle, camera angle constant throughout; Withdraw → no battle, no gesture; Attack → Walk then Prepare_War once, attacker and defender face each other, the map stays ≥ 2.2 s until the clip ends, battle screen opened exactly once, outcome "finished"; Main Menu during the gesture → no battle screen, outcome "cancelled"; left/right/up/down drags, middle drag, right drag, arrow keys and wheel leave alpha and beta unchanged (drags keep the radius exactly), edge clamp holds |
| `npm run build` | pass — start-up script 1,063 KB (299.7 KB gzip; 0.4.1: 1,055 / 295; the manifest fields the game reads), 701 files; the GLBs are served unhashed from `heroes/` |
| `vite` dev server (`apps/client`) + a scratch browser script | Mission 1 through the menus: Alexios shows the Greek model (`ready`, `Idle_Standing`), fetched from `/heroes/greek/hero_greek.glb`; no request left the dev server |
| `npm run desktop:build` + `xvfb-run -a node tools/desktop-smoke.mjs` | **pass** (development layout) and **pass with `PR_SMOKE_EXE`** on a fresh `--linux dir` build (`app.asar` 46.4 MB, 0.4.1: 36.6 MB; contains `renderer/heroes/`, no `assets-source/`, no `.blend`). New smoke check: the six hero GLBs are served intact by the app protocol (sizes match the manifest) |
| Load time, 9 interleaved runs of the `load-time.mjs` measurement (scratch copy) on three builds: no hero models / models loaded at once / models after the first frames | first scene **local 805 / 1,397 / 1,461 ms**, web profile 1,245 / 1,835 / 1,548 ms (settled 1,245 / 1,835 / 2,092 ms). The models cost about 0.6 s of the first software-rendered scene locally: the measurement's Begin click closes the Mission 1 briefing while the hero model (1.6 MB GLB, three PBR materials) is already loading behind it, and fetching, parsing and compiling its shaders on the CPU renderer lands in those frames either way. Deferring the load helps the web profile only. Not measured on a real GPU. Menu time unchanged (157–166 ms) |
| Visual check (screenshots in the UI test and a scratch test) | six distinct mounted heroes with their materials, banners and owner discs at one scale; attacker and defender facing each other during Prepare_War |

### Limitations (mounted heroes)

1. **Walk speed**: at normal adventure speed the map moves a hero 8.25 map
   units/s; the formula asks for playback ×30.5 (×68 at "fast"), so the
   rate is capped at 3.5 and the hooves slide. Matching the clip would mean
   a much slower map pace — an owner decision.
2. **Edge scrolling** was not added (the game had none); panning is mouse
   drag (left or middle button) and the arrow / pan keys.
3. **First-scene cost** as measured above (software renderer); the battle
   screen and other scenes are unchanged.
4. **When Prepare_War plays**: Attack commits the encounter atomically in the
   rules (as before), so the gesture plays after the commitment; cancelling
   *during* the gesture means leaving that game (load, Main Menu, restart).
   Opening the pause menu during the gesture does not hold the battle: it
   opens when the clip ends and closes the overlays, as it did after movement
   playback before.
5. **Skipped gesture** (battle opens at once, as before): instant or reduced
   motion, a monster attacker, an attacker out of sight, battles with no
   human side.
6. The battlefield still has no commander model; one model per pantheon (two
   Greek heroes look alike apart from banner colour); the 0.36 scale and the
   banner/disc marks are not owner-reviewed.
7. The copied manifest keeps the Blender delivery's own record
   `validation.engine_runtime_tested: false` unchanged; the game-side results
   are the ones in this section.
8. Not committed or pushed; no new installer.

## Tests and checks actually run (0.4.1 visual update, this session)

> **Obsolete in part (2026-10-03):** the mentions of the deleted 3D layer in this dated section (Babylon.js, GLB/glTF models, the calibration model, meshes, 3D scenes) are history only; the 2D migration replaced them (see "2D presentation migration" above). Measurements were taken on that build.

| Command | Result |
|---|---|
| `python3 tools/assets/prepare_ui_art.py` | 120 UI assets (11 backgrounds, logo, emblem, frame, 9 menu icons, 96 pack icons, app icon), 6.2 MB of runtime files; contact sheet of the 96 crops checked by eye |
| `npm run check` | **pass — 192 tests** (17 files; new `packages/ui/test/uiArt.test.ts`, 4: every listed file bundled and readable PNG/WebP with provenance, backgrounds listed, frame window measured, every asset ID the UI names exists, `icon.ico` carries 16–256 px) |
| `npm run build` | pass — start-up script 1,055 KB (295 KB gzip; 0.4.0: 1,016 / 290), 693 files (UI art adds 122) |
| `npx playwright test` | **34 of 34 passed** on the redesign (12.8 min), again after the spell sockets and version change (13.1 min), and on the final build after the performance fix below (13.0 min). `menu.spec.ts` now also checks that the opening background comes from the manifest list, that every image on the main menu loaded, and that all menu entries are visible |
| `npm run desktop:build` + `xvfb-run -a node tools/desktop-smoke.mjs` | **pass** (development layout; opening screen checked in Electron: background, logo, frame, icons and Quit) and **pass with `PR_SMOKE_EXE`** on a fresh `--linux dir` build (`app.asar` 36.6 MB with `renderer/ui/`, no `assets-source/`, tools or source maps) |
| `node tools/perf/load-time.mjs apps/client/dist --runs 7` | menu **149 ms** local / **330 ms** web (0.4.0: 140 / 321); first 3D scene 743 ms local (samples 232–1,256 ms), 1,024 ms web. Same headless SwiftShader setup; the scene samples are too noisy for single medians, so 0.4.0 and 0.4.1 were also measured **interleaved** (12 + 12 local runs, a scratch copy of the tool): **741 ms vs 730 ms** median — no measurable difference locally. The web profile is slower (0.4.0: 721 ms) because the new icons and backgrounds also come over the throttled 20 Mbit/s link; the desktop game reads them from disk |
| `npx electron-builder --config electron-builder.json --win nsis --x64` (Linux + Wine) | **built** `Pantheon-Realms-Setup-0.4.1-x64.exe` (142,758,279 bytes, SHA-256 `c45a5f9cfb1fd3c384bdad8853738b553f30744bd63e6a1edd642db54162eafb`). Its `app-64.7z` payload extracts byte-identical to `win-unpacked`; `app.asar` carries version 0.4.1 and the interface art; the exe icon is the owner's emblem. Copied into the owner's `installer\` folder (ignored by git). **Not run on Windows**; unsigned |
| Performance fix found on the way | the first redesign put CSS `filter: drop-shadow` on icons and a large inset blur on every panel; over the 3D canvas the compositor re-applies filters each frame (first scene 868 vs 681 ms in an interleaved run). Removed: icon shadows are in the art, panels use a gradient vignette; a comment in `components.css` records the rule |

## Tests and checks actually run (0.4.0, earlier on 2026-10-01)

> **Obsolete in part (2026-10-03):** the mentions of the deleted 3D layer in this dated section (Babylon.js, GLB/glTF models, the calibration model, meshes, 3D scenes) are history only; the 2D migration replaced them (see "2D presentation migration" above). Measurements were taken on that build.

| Command | Result |
|---|---|
| `npm run check` (boundaries + 3 type-checks + `vitest run`, 16 files) | **pass — 188 tests passed**, 0 failed. New: `packages/rules/test/expanded.test.ts` (14: interventions incl. once-a-week and campaign refusal, pantheon interventions, town growth, camps and weekly restock, map events once, weekly events, sets, pantheon skills, Fleet Foot/Homecoming, difficulty wallets/income, statistics and score, the bridge scene once, the Athena scene) and `packages/campaign/test/random.test.ts` (14: fairness checks and validation for 2–4 empires on every size, determinism, equal distances, camps/events/monsters, relic victory condition, refusals, an all-AI 3-empire match to a winner, a relic hold win on day 4, hot-seat names/patrons) |
| `npm run build` | pass — start-up script `index-*.js` 1,016 KB (290 KB gzip; 0.3.0: 879 KB / 253 KB), 3D layer `src-*.js` 565 KB (145 KB gzip), 571 files (250 JS) |
| `node tools/perf/load-time.mjs apps/client/dist --runs 7` | menu **140 ms** local / **321 ms** web profile (0.3.0: 144 / 311); first 3D scene 663 ms local / 808 ms web (0.3.0: 734 / 817); start-up JS 1 file, 1.02 MB (0.29 MB gzip). Same headless SwiftShader setup as below; no real GPU |
| `npx playwright test` (Chromium + SwiftShader) | **34 of 34 passed** (11.4 min). New `features.spec.ts` (7): New Game has Campaign/Skirmish/Random Map and no Multiplayer or Custom Map; Twin Harbors on Hard; a two-person random map with hand-overs (Escape cannot lift them); F1 list and a rebound key; the route tip and "Got it" remembered after reload; the last rival falls → game over → summary → high-score table; End Day with tips on. `campaign.spec.ts` now reads the bridge scene through Continue and Backlog and checks the lighthouse scene; `journey.spec.ts` reads the bridge scene with Continue. Later UI edits (summary axis labels, tips only on play screens, set-bonus text, setup subtitle, Journal tips) were re-checked afterwards: `npx playwright test tests/e2e/features.spec.ts tests/e2e/menu.spec.ts` **9 of 9 passed** (2.0 min) |
| `npm run desktop:build` + `xvfb-run -a node tools/desktop-smoke.mjs` | **pass** (development layout) and **pass with `PR_SMOKE_EXE`** on the `--linux dir` build (`isPackaged` true, DevTools refused, saves written). New check: the high-score store writes `records.json` beside the preferences and nothing appears in `saves/` |
| `npx electron-builder --config electron-builder.json --win nsis --x64 --linux dir --x64` (Linux + Wine) | **built** `Pantheon-Realms-Setup-0.4.0-x64.exe` (136,194,820 bytes, SHA-256 `2018c14d98bc77640817364f64f970cdb276a0dee6cf83831902a47bee4d1640`). Its embedded `app-64.7z` payload extracts byte-identical to `win-unpacked`; `app.asar` carries version 0.4.0, content 0.7.0, the 60 sound files and no development tools or source maps. **Not run on Windows**; unsigned |
| `npm run balance -- --seeds 16 --matches 5 --jobs 2` | 705 jobs in 24.6 min (all five suites). It exposed a **balance-tool bug**: with every seat AI, the match outcome's victory/defeat is written from a human seat's point of view, so the tool counted every all-AI result as an east win (west score 0.10). The tool now reads `outcome.winnerIds`; the game itself was not affected (its UI already uses `winnerIds`) |
| Browser page (claude.ai artifact, `PR_FEW_CHUNKS=1` build) | a 0.4.0 copy was built and checked locally (276 files; campaign map renders, coast music and ambience play, no failed requests), but **not published**: publishing was not permitted in this session, so the hosted page still shows 0.3.0 |
| `npm run balance -- skirmish random --matches 5 --jobs 2` (after the fix) | 420 jobs in 18.5 min; results below. The army, escort and tier tables below come from the first run (they do not read match outcomes) |

### Start-up load time (measured on the 0.3.0 build; 0.4.0 figures are in the table above)

`node tools/perf/load-time.mjs <dist> --runs 7` (median of 7, headless
Chromium with SwiftShader software rendering, served with gzip; "web" adds
20 Mbit/s and 40 ms round trips). *Menu* = page load until the main menu
buttons respond; *first scene* = clicking Begin on the Mission 1 briefing
until the 3D map has drawn two frames.

| | Before (content 0.5.0 build) | After |
|---|---|---|
| Menu, local | 752 ms | **144 ms** |
| Menu, web profile | 1,989 ms | **311 ms** |
| Start-up scripts | 200 files, 8.26 MB (1.93 MB gzip) | **1 file, 0.88 MB (0.25 MB gzip)** |
| First 3D scene, local (after a 3 s pause on the menu) | 347 ms (353 ms) | **734 ms (733 ms) — slower** |
| First 3D scene, web profile (after a 3 s pause) | 346 ms (351 ms) | **817 ms (828 ms) — slower** |

The menu is 5–6× faster. The first 3D scene is about 0.4 s slower, and not
fixed: it stays slower when the 3D layer was already fetched during the
pause, in a build without sound, with the whole Babylon barrel inside the
on-demand chunk, and with the engine created early (all four tried and
measured; the last was reverted). A CPU profile shows the main thread idle
for most of the gap, so the time is most likely spent producing frames in
the software renderer rather than loading scripts; the cause is not
confirmed. Whether it happens on a real GPU was not
measured.

`npm run check` was not run as one command; each of its parts above was.

New tests this build (unit): every pantheon has a signature built from shared
effects and none apply in The Three Beacons; Afterlife returns floor(20%) of
each winning stack's losses and never touches XP; a pantheon without
recovery gets none; Glory's +25% XP; Fury's +2 Attack exactly at half
strength; Harmony counts families not stacks and feeds effective stats;
free Shapeshift keeps the activation once, a second change and a
non-Celtic army's change spend it, other targets are refused; offerings (rate,
cap, once per week, Temple needed, last-creature rule, non-Mesoamerican
refused); academy (XP, price, once per week, presence); Watchtower radius;
merchant stock (4 distinct priced items, deterministic, same catalog in both
towns, weekly refresh, purchase); second god choice (first commitment,
buildings, exclusivity, 25 Favor, Hermes income); growth and creature-stat
blessings; the campaign's god allowlist. AI: god commitment, offering only
when Favor is needed, training and buying with reserves, and the Pooka taking
the Hare aspect to reach an enemy.

Fixed while testing: dialogs opened inside the Town screen (Market, Tavern and
the new ones) were pulled into the page flow by a generic `.screen > *` rule
and pushed the town layout up; they are full-window overlays again.

### The west-side advantage — found and fixed

The earlier AI-vs-AI runs (west town won 11 of 13) had five causes, all fixed:

1. **Map asymmetry.** Twin Harbors v1 was not symmetric in hex distance: the
   east town was 75 movement closer to the gold mine and 200 closer to the
   crystal, the west town 200 closer to the grove. **v2 is point-symmetric**
   (every site, road and terrain cell mirrored under a 180° rotation) — path
   costs from both towns to mirrored sites were measured equal.
2. **Map scale.** On v1 a hero could reach the enemy town in one day (1,200
   movement against a 1,500–2,000 budget), so one misstep lost the game on
   day 1. v2 is wider (35 × 17): towns 2,250 apart (two days), the gold mine
   1,050 from each.
3. **AI hiring bug.** The AI read the Tavern roster from its belief state,
   where the unseen enemy leader is missing, so it tried to hire that hero,
   was refused, and stopped hiring for the turn. In Greek vs Greek the west AI
   never hired at all. The AI now gets the true roster of its own Taverns (what
   a human owner sees on the Tavern screen).
4. **AI holding bug.** A hero stayed inside its town while *any* enemy hero was
   within 8 hexes — even a 10-Hoplite raider — which also blocked its Tavern.
   It now holds only against enemies it cannot beat in the field, and hunts
   the others.
5. **Unequal leaders.** Pairings gave one side a Champion-type leader and the
   other a Strategos-type one. Every Twin Harbors leader is now Strategos-type
   (same attributes, skill and class growth).

Also new: heroes no longer end a move where a visible enemy at least as
strong can reach them next turn.

Measured afterwards (360 AI-vs-AI matches, both towns and both first movers
per pairing): **west-town score 0.52, first-mover score 0.48** (0.50 = no
advantage). A separate 120 mirror matches (same pantheon both sides): west
0.53, first mover 0.44. The per-pantheon first-mover score in mirrors swings
between seeds (Greek 0.17 in one run, 0.70 in another), so no stable
turn-order advantage was found; the human always moves first in Twin Harbors.

### Turn order and the duel outliers — found and fixed (content 0.6.0)

`npm run balance -- --seeds 16 --matches 5 --jobs 2` (645 jobs, 14.0 min; the
report file's header still says content-0.5.0 because the version label was
bumped after the run started — the values are content 0.6.0). Pantheon
average score against the other five (0.50 = even; ⚠ outside 0.35–0.65):

| Suite | Greek | Norse | Egyptian | Japanese | Celtic | Mesoamerican |
|---|---|---|---|---|---|---|
| Skirmish (360 whole matches) | 0.51 | 0.42 | 0.59 | 0.48 | 0.55 | 0.45 |
| Armies, 1 week, base | 0.40 | 0.54 | 0.54 | 0.47 | 0.60 | 0.44 |
| Armies, 1 week, upgraded | 0.36 | 0.44 | 0.54 | 0.50 | 0.68 ⚠ | 0.49 |
| Armies, 2 weeks, base | 0.44 | 0.55 | 0.50 | 0.49 | 0.49 | 0.53 |
| Armies, 2 weeks, upgraded | 0.38 | 0.44 | 0.40 | 0.53 | 0.68 ⚠ | 0.57 |
| Starting escorts | 0.48 | 0.55 | 0.46 | 0.43 | 0.59 | 0.49 |

Skirmish: 291 of 360 decided by elimination (mean day 9.0), 69 scored at the
day-40 cap (content 0.5.0: 322 and 38 — the more careful AI draws more).
Fairness checks: **first-mover score 0.52** (was 0.41), **west-town score
0.47** (was 0.56).

**Why the second mover won.** Instrumented mirror matches (same pantheon on
both sides, 60 matches) showed the first empire-vs-empire blow landing on day
2, struck by the second mover, in 26 of 32 matches. Whoever moves first each
day advances into the unseen middle first; its heroes are then seen and
caught by armies they never saw, or that came into view during their own
move. Of 189 hero-vs-hero strikes on days 1–12, 113 hit a hero whose owner
could already see the striker at the end of its turn, and 97 of those heroes
had moved that turn. Three AI rules fixed it (all from public knowledge; the
AI still never reads hidden state):

1. **Retreat.** A hero standing within reach of a visible, stronger enemy
   steps back out of reach (into its own town if it can arrive today) while
   it has movement left; the "return home" move no longer stops short in
   danger. First-mover score 0.41 → 0.47.
2. **Fog caution for secondary heroes.** A hero below 60% of its empire's
   strongest hero ends its moves on its own half of the map or within 3
   hexes of that hero. First-mover score → 0.53 (then 0.52 with 3.).
3. **No lone advance (tactical AI).** Found while chasing the Egyptian
   outlier (below): a stack that cannot strike this activation pays 2 cells
   of progress for every enemy melee stack that could reach its cell next
   beyond the allies standing beside it. A blanket "wait instead of
   advancing" rule was tried and rejected: it moved Greek duels to 0.17–0.24
   and Celtic to 0.74–0.85. A penalty of 3 cells left Greek upgraded armies
   at 0.25; 2 cells is kept.

**Japanese Harmony (0.72–0.75 in upgraded full-roster duels).** Cut to one
step: 3 or more families give every stack +1 Defense (the +1 Attack at 5
families is gone). Japanese scores are now 0.47–0.53 in the four army
tables (0.43 with starting escorts) and 0.48 in skirmish. (Last session a
Defense-only test gave 0.51–0.69 and a 0.40 skirmish score, so +1/+1 was
kept then; the AI fixes changed that picture.)

**Egyptian two-week armies (0.27–0.33)** were not an Egyptian values problem.
Swapping one tier at a time for the Greek unit (12 seeds per direction)
raised two-week base armies from 0.17 to 0.83 against Norse only when the T6
Bennu was swapped; slowing the Bennu from Speed 9/10 to 7/8 put Egypt at
0.72–0.79 everywhere. The tactical AI flew fast stacks alone into the enemy
line; rule 3 fixes that, and Egypt now scores 0.40–0.54 in every army table
with its values unchanged. (A test giving the Egyptian javelin throwers more
ammunition changed nothing and was reverted.)

**Still outside the band:** Celtic upgraded armies 0.68 (the old AI hid their
strength: upgraded Celtic units already led several tier duels), and Greek
upgraded armies are the weakest (0.36–0.38) against the proposed pantheons.
Greek values are the design/06 candidates and were not changed. Duels at equal
strength remain sensitive (one stat point on every stack moves a pairing by up
to ~0.2), so these numbers are for spotting outliers, not for fine tuning.

The content-0.5.0 table (before these fixes; 9.5 min run):

| Suite | Greek | Norse | Egyptian | Japanese | Celtic | Mesoamerican |
|---|---|---|---|---|---|---|
| Skirmish (360 whole matches) | 0.57 | 0.47 | 0.55 | 0.40 | 0.59 | 0.42 |
| Armies, 1 week, base | 0.41 | 0.49 | 0.55 | 0.63 | 0.57 | 0.36 |
| Armies, 1 week, upgraded | 0.31 ⚠ | 0.44 | 0.50 | 0.72 ⚠ | 0.57 | 0.46 |
| Armies, 2 weeks, base | 0.63 | 0.63 | 0.27 ⚠ | 0.60 | 0.43 | 0.44 |
| Armies, 2 weeks, upgraded | 0.37 | 0.64 | 0.33 ⚠ | 0.75 ⚠ | 0.39 | 0.53 |
| Starting escorts | 0.38 | 0.56 | 0.44 | 0.51 | 0.59 | 0.52 |

The content-0.4 table (troops-only guard duels, before signatures):

| Suite | Greek | Norse | Egyptian | Japanese | Celtic | Mesoamerican |
|---|---|---|---|---|---|---|
| Skirmish (360 whole matches) | 0.53 | 0.50 | 0.61 | 0.45 | 0.42 | 0.48 |
| Armies, 1 week, base | 0.43 | 0.56 | 0.57 | 0.48 | 0.54 | 0.41 |
| Armies, 1 week, upgraded | 0.29 ⚠ | 0.47 | 0.64 | 0.49 | 0.65 | 0.45 |
| Armies, 2 weeks, base | 0.68 ⚠ | 0.57 | 0.33 ⚠ | 0.49 | 0.42 | 0.50 |
| Armies, 2 weeks, upgraded | 0.41 | 0.56 | 0.39 | 0.51 | 0.53 | 0.59 |
| Starting escorts | 0.41 | 0.61 | 0.43 | 0.46 | 0.54 | 0.54 |

Value changes in the previous session (attack, defense, HP, damage, speed, shots,
footprint): Norse — Frost Wolf 6/3/10 → 6/4/11; Frost Troll 8/8/26 → 9/8/27;
Lindworm 11/8/32 → 11/9/34; Nidhogg Wyrm 24/21/250 [40–52] → 25/22/258
[41–52]; World-Serpent Wyrm 27/24/300 [46–58] → 28/24/308 [47–58].
Egyptian — Anubian Warden shots 10 → 8; Ushabti HP 26 → 28; Royal Ushabti 32
→ 34; Sphinx 10/12/40 → 10/11/39; Great Sphinx HP 46 → 45; Crocodile Beast
HP 38 → 36; Sobek Warbeast 13/11/43 → 13/10/41; Bennu HP 96 → 100; Radiant
Bennu 110 → 116; Desert Colossus 210 → 220. Mesoamerican — Jaguar Spirit HP
10 → 11; Eagle Warrior Spirit HP 26 → 28, damage 3–5 → 3–6; Solar Eagle
Warrior HP 32 → 34, shots 10 → 12; Cenote Crocodile HP 40 → 42; Camazotz HP
34 → 36; Xiuhcoatl HP 80 → 84; starting escort 23 → 24 Feathered Serpents.
Japanese and Celtic unchanged.

### Balance in 0.4.0 (measured, AI-vs-AI)

Reports: `balance-reports/balance-2026-10-01T08-56-44.md` (skirmish +
random, after the winner fix) and `balance-reports/balance-2026-10-01T08-29-58.md`
(armies, escorts, tiers). Twin Harbors now includes weekly events,
interventions and the expanded skills/spells/sets, so these numbers are not
directly comparable with 0.3.0.

**Twin Harbors** (360 matches, 297 decided by elimination, mean day 9.4; 63
at the day-40 cap scored on strength): **west score 0.50, first-mover score
0.50**. Pantheon averages:

| Greek | Norse | Egyptian | Japanese | Celtic | Mesoamerican |
|---|---|---|---|---|---|
| 0.51 | 0.45 | 0.57 | 0.47 | 0.53 | 0.48 |

Mirror matches (10 each) still swing by pantheon (west 0.30–0.70, first
mover 0.50–0.80) — small samples.

**Random maps** (small, few monsters, all seats the same pantheon, 30
matches each):

| Empires | Decided by elimination | Mean decisive day | Seat scores (incl. strength at the cap) |
|---|---|---|---|
| 2 | 14 of 30 | 5.6 | 0.43, 0.57 (even 0.50) |
| 3 | 6 of 30 | 9.5 | 0.23, **0.60**, 0.17 (even 0.33) |

The two-empire seats are close to even. **Three-empire maps favour seat 2**
in AI-only games although every map passed the five fairness checks (equal
town-to-center and town-to-site costs, same sites and monsters per empire).
The likely cause is the AI, not the map: targets of equal value are broken
by a fixed coordinate order, so in a three-way game the empires do not split
their attention evenly (not yet fixed). *Re-measured on 2026-10-02 on thirty
different maps: the seat-2 lead came mostly from the five-map sample; the
first mover was the weak seat — see the top of this file.* The AI also rarely finishes a random
map within 40 days (16 of 30 two-empire and 24 of 30 three-empire matches
reached the cap).

**Duels** (unchanged rules; same AI): full-roster armies — Celtic upgraded
armies 0.68 ⚠ (1 and 2 weeks), Greek upgraded 0.36–0.38, everything else
0.40–0.60; starting escorts 0.43–0.59; same-tier duels show the usual
single-stack outliers (e.g. Norse Draugr 0.78, Japanese Jorogumo 0.17).

### Playtest pass (scripted, not human)

Each non-Greek pantheon was played through the real screens: setup with a
rival, the 18-location town, a build and a recruit (`pantheons.spec.ts`), and
a full field battle of its whole roster against the whole Greek roster with
auto-combat to the result screen (`battles.spec.ts`), with no page errors.
The battle screenshots showed every new creature's placeholder on the board.
No bug was found in these runs; the remaining issues found this session were
the AI and map problems above. Human playtests have still not happened.

Not run: the installer on a real Windows machine, macOS/Linux installers,
code signing, real GPU performance measurement, long soak tests, human
playtests.

## New in 0.4.1 — visual design (owner GUI references, 2026-10-01)

> **Obsolete in part (2026-10-03):** the mentions of the deleted 3D layer in this dated section (Babylon.js, GLB/glTF models, the calibration model, meshes, 3D scenes) are history only; the 2D migration replaced them (see "2D presentation migration" above). Measurements were taken on that build.

No rules, content, saves, AI or screen flow changed; content stays
`content-0.7.0`, so 0.4.0 saves load unchanged.

* **Opening screen.** One of the owner's opening backgrounds is chosen at
  random each time the game starts (11 delivered: a landscape for each of the
  six pantheons and battles for five; a slow drift, off with reduced motion).
  The title is the owner's full logo; the menu sits inside the owner's ornate
  frame, with the owner's nine menu icons mapped by meaning (Continue, New
  Game, Load Game, Campaign, Skirmish, Encyclopedia, Settings, Credits, Quit).
  Random Map and High Scores (added in 0.4.0, no art of their own) are a
  smaller row at the foot of the frame. Hovering or focusing an entry shows its
  description under the frame. Continue keeps its save details and its
  "No compatible save" reason. Every test ID and the footer are unchanged.
* **Branding.** The owner's emblem is the app/installer icon (`icon.ico`
  16–256 px, `icon.png`), the favicon, the Electron window icon, and small
  branding in the menu footer, the pause dialog and the credits.
* **Shared visual language** (`styles/components.css`, `tokens.css`, the kit
  components): navy/slate plates with double gold rims and chamfered corner
  ornaments; title bars with a gold divider and centre diamond; Cinzel small
  capitals; burnished-gold primary buttons and navy secondary buttons with
  normal/hover/pressed/focus/disabled states; round icon buttons for close and
  back; tabs with a gold top; framed resource counters; portrait frames with
  corner studs; army slots with unit-count plates; sockets for artifacts and
  spells; cards for lists, saves, recruitment, bestiary and seats; sunken
  inputs, selects, sliders, checkboxes, radios and toggles; framed bars;
  gold scrollbars; ornate dialogs and tooltips. The menu-style screens show
  this run's background art, darkened, behind their panels.
* **Icon art.** 96 icons cropped from the owner's resource & status icon pack
  (`tools/assets/prepare_ui_art.py`): resources, hero stats, world status,
  battle actions (Wait, Defend, Spell, Ability, Retreat, Surrender), status
  effects and map markers. The shared `Icon` component draws them wherever
  those names were used, so resource counters, cost lists, stat blocks and
  the adventure and battle command bars all changed at once. Map-marker art
  marks the site in the adventure tile panel and each Journal objective (by
  status: active, completed, locked, failed); spellbook entries sit in round
  sockets with the effect-family icon until spells get their own art.
* **Command bars.** Adventure tools and battle actions are framed icon
  buttons with a small label (same buttons, names, shortcuts and test IDs).

What did not change: the 3D adventure map and battle board (terrain, sites,
creatures, selection rings) — the map-marker sheet was used for the 2D
panels only; unit models, portraits and town art are still the earlier
placeholders.

## New in 0.4.0 (proposed, unplaytested — `DESIGN_PROPOSALS.md` §4–12)

Owner request: difficulty and help, more story, a second-campaign outline,
pantheon spells/skills and artifact sets, Favor interventions, a livelier
world map, random maps, hot-seat, summary/keys/high scores, and no
Multiplayer panel. All of it works end to end in this build; every value is a
first proposal checked only by unit tests, scripted UI tests and AI-vs-AI
runs.

* **New Game** shows Campaign, Skirmish and Random Map. The disabled
  *Multiplayer* and *Custom Map* cards are gone (online play is not planned;
  the map editor is later).
* **Skirmish difficulty** Easy / Normal / Hard (Twin Harbors and random maps):
  starting resources, AI income and AI attack margins, score multiplier.
  Normal equals the previous behaviour. The campaign has no difficulty.
* **Contextual tips**: 13 one-time tips in a non-blocking panel; Settings →
  Gameplay → Tutorial hints (now enabled) and Reset tips.
* **Story in The Three Beacons**: 12 scenes (Ione at the Griffin shrine, Ione
  on Athena *or* Ares, Melas when the gate opens and before the final battle,
  Thaleia on losses in every mission, and more) plus a four-line epilogue, in
  a dialogue window with Continue, Backlog (L) and Skip; the AI waits while it
  is open. Journal → Story lists played scenes with Replay. Scenes never
  change play.
* **Second campaign**: (0.4.0) Norse outline only — `CAMPAIGN_2_NORSE_OUTLINE.md`
  (*The Winter Oath*). *Since then built as seven missions — see the top of
  this file.*
* **Pantheon skills and spells, artifact sets** (skirmish only): 8 skills
  (Estates, Mysticism + one per pantheon), 16 spells (4 for every Sanctum + 2
  per pantheon; mass, area, slow, haste, movement and recall effects), 4
  three-piece sets with 2- and 3-piece bonuses shown on the Hero screen and in
  the Encyclopedia.
* **Divine interventions** (skirmish only): 8 for every pantheon + 1 each,
  5–14 Favor, one per world week, on the map (Miracles button, Pantheon
  screen, key I) or in battle (Miracle button). The AI uses them too.
* **Livelier world map** (random maps; the effects are generic): creature
  camps with weekly stock, one-time map events (10 templates), wandering
  monsters that patrol their area, relic shrines; **weekly events** (8) from
  week 2 in every skirmish, shown in the top bar.
* **Random maps** (S19): 2–4 empires, small / medium / large, last empire
  standing or hold the relic (5/7/10 days), monsters none/few/many, seed,
  live preview with the five fairness checks. Saves of random maps are
  self-contained (the generated scenario travels in the save).
* **Hot-seat**: any Twin Harbors or random-map seat can be a person, each with
  a name and patron; a hand-over screen hides the map between people;
  battles between two people are played on one screen.
* **Summary (S20)**: charts of army size, income, towns and treasury per day
  for every empire, empire totals and the score breakdown; **High Scores
  (S21)** for campaign and skirmish (best 20 each, on this computer).
* **Keyboard**: F1 (and ? on the map) lists every shortcut; Settings →
  Controls rebinds them (Esc, F1 and the arrows are fixed).

## Implemented (working end to end)

* **Rules core**: commands/events/processor with duplicate, stale-revision,
  actor, pending-decision and battle gates; economy; recruitment; training;
  stack transfers; hero XP/levels; spellbooks and learning; artifacts; divine
  commitments; covenants; objectives; mission outcome; dawn processing; hero
  hiring (Tavern) including the retreated-hero return roster.
* **Adventure**: movement, fog (explored + derived vision + Divine Sight
  temporary vision until next dawn), sites, encounters, **adventure-map
  spellcasting** (`CastAdventureSpell`, Divine Sight: 10 mana, radius 3 around
  an explored tile; learned at Sanctum III with Wisdom I).
* **Tactical battle**: 15×11 board, Speed order, wait phase, morale/luck,
  retaliation, charge, ward, shooters, spells, defend, retreat/surrender,
  exact-rational damage, resolution, XP, rewards exactly once.
* **Town sieges** (design/04 §8, temporary deterministic model, proposed
  values): Fort walls + gate (2 HP), Citadel adds an off-board keep (20 dmg
  per round) and a moat (stops ground movement, 10 damage once per entry, no
  attack after entering), Castle walls 3 HP plus two towers (10 dmg per round);
  automatic Catapult removes 1 HP from the intact structure with the lowest
  stable ID each round; Cyclopes batter a structure instead of shooting; the
  gate opens only for the defender; wall factor ×½ for attacker shots into the
  town; town capture. **BAT-14**: the human defender picks ≤ 7 of garrison +
  visitor, with the reserve warning shown first; reserves survive a hold and
  are lost with the town; the town defender cannot retreat or surrender.
* **Tactics deployment** (owner decision: interactive only with Tactics):
  zone 2 + Tactics columns (≤ 7; inside/outside the walls in a siege), move or
  swap stacks, "Start battle"; obstacles avoid expanded zones; auto-combat
  confirms the default formation.
* **Campaign**: *The Three Beacons* M01–M03 with carryover, completion records,
  restart, practice replay. Headless journeys for all three missions pass, and
  a Playwright test now plays Mission 1 to its debrief and continues into
  Mission 2 through the real screens.
* **All six pantheons playable in skirmish.** Greek (design values) plus five
  pantheons with **proposed, unplaytested** values: Norse, Egyptian, Japanese,
  Celtic and Mesoamerican. Each has seven families (base + one upgrade, stats,
  abilities from the shared vocabulary, lore stubs), an 18-location town that
  mirrors the Greek tree cost-for-cost with its own names and placeholder art,
  a patron with no bonus (mirrors Zeus: Odin, Ra, Amaterasu, Dagda,
  Quetzalcoatl), an exclusive first-minor pair unlocked by Temple II for 20
  Favor (mirrors Ares/Athena: Thor/Tyr, Set/Isis, Hachiman/Susanoo,
  Morrigan/Brigid, Huitzilopochtli/Coatlicue), seven listed-but-undesigned
  gods, three classes (mirror Champion/Strategos/Oracle) and five hireable
  heroes. The four newest are built by a shared data kit
  (`packages/content/src/pantheonKit.ts`); no rule branch names a pantheon.
* **Twin Harbors skirmish setup**: choose your pantheon and the AI rival's
  (36 pairings, one mission each) on a point-symmetric 35 × 17 map (v2). Each
  side starts with its civic hall, tavern, first fortification and tier-1
  dwelling, a Strategos-type pantheon leader, a tier-1/tier-2 escort and the
  three dwelling covenants.
* **Pantheon signatures** (proposed; `DESIGN_PROPOSALS.md`), each a bundle of
  shared effect types any pantheon or god can use: Greek **Glory** (+25%
  battle XP), Norse **Berserk Fury** (+2 Attack at ≤ half strength), Egyptian
  **Afterlife** (20% of a winning stack's losses return; capped by the
  battle's losses, no XP or rewards), Japanese **Harmony** (3–4 distinct
  families: +1 Defense; 5+: +1 Attack and +1 Defense), Celtic **Shapeshifting**
  (new Shapeshift ability on Pooka, Kelpie, Selkie and Horned Stag Spirit;
  free once per activation for Celtic armies), Mesoamerican **Offering**
  (weekly Temple rite: 1 Favor per 150 Gold of creatures, ≤ 10 per town per
  week). Off in The Three Beacons (`signatureMechanics: false`).
* **Second minor-god choice** (proposed): 18 gods (three per pantheon) with
  real blessings — movement, income, weekly growth, casualty recovery,
  commander attributes, luck/morale, vision, creature-stat blessings (flyers,
  shooters, low tiers) and a better offering rate. Needs a first commitment,
  Temple II + the level-3 civic hall in one town, 25 Favor; the campaign
  allows only Athena and Ares (`committableGodIds`). 24 gods remain
  undesigned (4 per pantheon).
* **Training Academy, Watchtower, Artifact Merchant** (proposed) in all six
  towns: 500 XP for 1,000 Gold once per hero per week; town vision 8; a
  weekly 4-item stock from 12 priced artifacts (10 new), sold to the
  visiting hero. Buttons on the Town screen; the AI uses all three.
* **Balance tool** (`npm run balance`, `tools/balance/README.md`; never
  packaged): whole AI-vs-AI skirmishes, full-roster armies, starting escorts
  and same-tier duels, side- and turn-order-neutral, split across worker
  processes, written to `balance-reports/` as Markdown + JSON.
* **Windows installer** (`npm run desktop:dist`): per-user NSIS x64 installer
  with Start-menu and desktop shortcuts, an original placeholder icon, saves
  kept on uninstall; the installed build ignores `PR_DEV_URL` and has no
  DevTools.
* **Skirmish AI**: builds from data, hires heroes (and returning heroes) from
  its true Tavern roster, explores, buys divine gifts with spare Favor, **besieges visible towns** when it is
  clearly stronger after a wall factor, **defends threatened towns** against
  enemies it cannot beat in the field (and hunts weaker raiders), avoids
  ending a move within reach of a stronger visible enemy, and plays sieges
  tactically (routes around intact walls, waits by the gate for a breach,
  Cyclopes batter the gate first). **New:** commits to gods, equips loot,
  makes Temple offerings while it needs Favor, trains at the academy, buys
  artifacts for empty slots, saves for a new hero when it has none, and uses
  free Shapeshift in battle.
* **2D presentation (PixiJS, since 2026-10-03)**: the Adventure Map, Tactical
  Battle and Unit Detail viewer draw sprites from one manifest
  (`assets-runtime/sprites/manifest.json`) with explicit anchors, statuses
  and provenance; animation by semantic state (`idle, move, attack, defend,
  hit, death, victory` + `shoot`, `takeoff/fly/landing`, `ability` as the
  content needs) with the same speed/instant/skip timing everywhere, a
  fallback chain for missing strips, viewer Play/Pause/Stop/Restart,
  0.5×/1×/2×, Autoplay and Face left. Labelled placeholders for everything
  (`npm run sprites:placeholders`), an importer for final art
  (`npm run sprites:import`) and the production queue
  (`GPT6_2D_CONTENT_GENERATION.md`). Artist spec: `ASSET_PIPELINE.md` §1–9.
* **Saves, desktop, UI, presentation**: as before (versioned envelopes,
  atomic desktop saves, one shared PixiJS renderer, event playback), now 21
  screens (S19 Random Map, S20 Summary, S21 High Scores) and a separate
  high-score store.
* **Sound** (`@pr/audio` + `ui/src/audio`, placeholder files): one Web Audio
  graph with music, ambience, interface, combat and voice buses, a safety
  limiter and mute on focus loss; music and ambience crossfade by screen and
  by the mission's soundscape (menu theme, three map themes, battle loop,
  campaign resolution); victory, defeat, level-up and beacon stingers dip
  the music; interface sounds for clicks, dialogs, errors, building,
  recruiting, trading, pickups, captures, gods, objectives and the calendar
  (new day / new week / end day); hero footsteps while walking; combat sounds
  timed to battle playback cues (swing and impact, shot and hit, deaths,
  spells, heals, wards, defend, morale, shapeshift, Afterlife, catapult,
  stone hits, breaches, towers, moat), or one sound per action when playback
  is instant. Settings: Master, Music, Ambience, Interface, Combat, Mute all,
  mute in the background, Calmer sound, a test sound (no Voice volume until
  there are voice lines: Settings shows only working options);
  volumes preview live and Cancel restores them. Silence never blocks play.
* **On-demand presentation layer**: the start-up script does not contain
  PixiJS; the 2D views' chunk (about 363 KB) is fetched in the background once
  the menu is up.

## Partial

* **No final sprite exists yet.** Every battle sprite, map avatar, map
  location, decoration, obstacle, siege piece, projectile and effect is a
  labelled placeholder (186 manifest entries, all `placeholder`): 43 creature
  forms show a still cut from their reference view (the game supplies the
  motion), 59 forms simple silhouette strips, the map avatars one direction
  mirrored westward. Battle playback loops `fly` during a flight arc;
  `takeoff`/`landing` play only once strips exist.
* **Town screen** is a composed 2D scene (owner concept backgrounds + cropped
  building sprites), unchanged by the 2D migration. Norse, Egyptian, Japanese, Celtic and
  Mesoamerican placements are first-pass estimates checked on composite
  previews; several dwellings use themed stand-in art (below).
* **Balance** of the five proposed pantheons, the six signatures, the 18 new
  gods and the three services rests on AI-vs-AI measurements only (above); no
  human has played them. Remaining measured duel outliers: Celtic upgraded
  full rosters (0.68); Greek upgraded armies are the weakest (0.36–0.38). More
  skirmishes now reach the day cap (69 of 360) because the AI plays safer.
* **Sound is all placeholder.** Every music track, ambience and effect is
  synthesized by `tools/audio/make_placeholders.py` (plucked strings, simple
  pads, drums, filtered noise) and was checked by measurement only — levels,
  seamless loops, no clipping, spectrograms — not listened to. There is no
  Voice volume (no voice lines yet; removed with the 2D settings pass). Captions are not needed yet because
  every sound accompanies something already on screen. Music is Ogg Vorbis:
  decoding was verified in Chromium and Electron only (not Safari/Firefox).
* **AI caution** (retreat, secondaries on their own half, no lone advance) is
  heuristic: a secondary hero can still be caught on its own half by an army
  it cannot see, and the half-map rule assumes two opposed empires.
* **AI use of the new mechanics** is heuristic: it never takes a Shapeshift
  that costs the activation, values gods by a fixed blessing score, and its
  army-strength estimate ignores signatures and blessings.
* **Windows installer** (0.4.0, this build) is built and its contents checked,
  but no version has been run on Windows yet, and it is unsigned (SmartScreen
  warns).
* **Combat log** and **minimap frame**: fixed on 2026-10-03 (the log is
  recorded by the store from the battle's first event; the minimap frames the
  view).
* **AI** remains heuristic (greedy scoring). Since 2026-10-02 it casts
  movement, scouting and Recall spells on the map, values artifact sets and
  picks skills by their value to the hero (`ai/src/growth.ts`); early battles
  still decide most AI-vs-AI skirmishes.
* **AI and the 0.4 features** is heuristic too: it recruits from camps it
  stands on, picks the map-event option with the highest fixed value, invokes
  interventions while keeping 25 Favor until both god choices are made, and
  scores the new battle spells by their immediate value. Since 2026-10-03 its
  strength estimate counts skills, morale, luck, magic and matching battle
  bonuses (sets, gods, signatures, the week) and it adjusts reserves to the
  weekly event (`ai/src/assessment.ts`); it still does not weigh the
  interventions an opponent could invoke in battle.
* **Hot-seat**: since 2026-10-03 the hand-over clears the previous player's
  notices (public ones, like an eliminated empire, and the new-week banner
  stay). A battle between two people shows "Victory"
  from the winner's side. Two people cannot play the campaign together.
* **Random maps** (generator 0.3) are land maps with optional two-way
  portals (no water crossings or underground); full roads now also lead to
  the contested centre. The first week has no weekly event. Guards, camps and
  monsters mix the neutral roster with every pantheon's creatures, and the
  mercenary event always offers Centaurs.
* **Story scenes** use the existing placeholder portraits; there is no voice.
  The Winter Oath's new characters have generated placeholder portraits.
* **Siege presentation** uses primitive walls/towers/keep; structure damage is
  shown by height/colour and HP labels.

## Planned (present in data/UI, not playable)

* Undesigned gods (4 per pantheon, 24 in all): listed, not selectable.
* (Favor's late-game use: divine gifts at the Temple since 2026-10-03, in
  every scenario with interventions.)
* Favor in the campaign: interventions are skirmish-only, so in The Three
  Beacons Favor still only buys gods (documented economy unchanged).
* More authored skirmish maps. (Campaigns for the Egyptian, Japanese,
  Celtic and Mesoamerican pantheons were built on 2026-10-02.)
* Final voice. (Since built: graphics quality presets 2026-10-03, the map
  editor and final audio 2026-10-05, stack merging before a siege and aiming
  the Catapult 2026-10-07.) Online
  multiplayer is not planned at this stage.

## Blocked

Nothing is blocked. Open owner decisions are listed under deviations.

## Temporary assets

* `assets-runtime/placeholders/town/greek/*` and `town/norse/*` (building
  sprites + backgrounds) and `menu/background.jpg` — cropped/derived from the
  owner's concept boards by `tools/assets/prepare_placeholders.py`; provenance
  per file in `assets-runtime/placeholders/manifest.json`. Greek stand-ins as
  before. **Norse stand-ins:** the buildings board orders its dwellings
  differently from the Norse pantheon board, so tier-1 Draugr uses the
  "Draugr Tomb" art, tier-2 Frost Wolves the "Wolf Den", tier-3 Frost Trolls the
  "Jotun Outpost", tier-5 Lindworms the "Raven Roost", tier-6 Jotnar the
  "Frost Giant Camp".
* **Egyptian, Japanese, Celtic, Mesoamerican** town sprites and backgrounds
  are cropped from the owner's boards the same way (provenance per file in the
  manifest). Their buildings boards order the dwellings by theme rather than by
  roster tier, so these tiers use the closest-themed stand-in: Egyptian tier 1
  Scarab ← "Scorpion Lair", tier 6 Bennu ← "Falcon Aerie"; Japanese tier 2 Kappa
  ← "Archery Range", tier 5 Jorogumo ← "Ronin Barracks", tier 6 Kirin ←
  "Phoenix Aerie"; Celtic tier 1 Pooka ← "Boar Clan", tier 3 Kelpie ← "Staghorn
  Riders", tier 4 Banshee ← "Bear Circle", tier 5 Selkie ← "Eagle Aerie", tier 7
  Fomorian ← "Ancient Entwives"; Mesoamerican tier 5 Camazotz ← "Stag Grove",
  tier 7 Stone Colossus ← "Warrior Altar". The other dwellings match by name.
* Creature portraits: 43 of the 102 forms have final paintings (Brief 5, first
  part, 2026-10-03); the other 59, hero portraits without a story bust, all god
  portraits are still procedural SVG (the six pantheon emblems are final art since 2026-10-03). Mission and
  campaign cards now come from the delivered story art (below).
* **Story art (2026-10-02)** — 35 dialogue busts, 6 campaign covers, 11 ending
  pictures and 40 mission pictures delivered by the owner (masters in
  `assets-source/art/final/`, runtime WebP in `assets-runtime/art/`). Final art,
  not stand-ins; the landscapes are native 1672 × 940/941 (below the brief's
  sizes, not upscaled). Square portraits of the story characters (for lists) are
  still procedural where no hero portrait exists; lists show the bust in a 2:3
  slot instead.
* **Sprites (2D migration, 2026-10-03)** — `assets-runtime/sprites/` (7.1 MB,
  186 manifest entries, every one `status: "placeholder"` with its
  provenance): creature stills cut from the 43 delivered reference views,
  silhouette strips for the other 59 forms, map avatars and hero-screen
  figures cut from the owner's six hero boards, 40 map locations cut from the
  owner's map-marker sheet (plus a drawn windmill), procedural decoration,
  obstacles, siege pieces, projectiles and effects. Generated by
  `npm run sprites:placeholders`; replaced by file through
  `npm run sprites:import`.
* **Interface art (0.4.1)** — opening backgrounds, full logo, emblem, menu
  frame, the nine menu icons and the resource & status icon pack are
  owner-supplied AI-generated visual references (sources in
  `assets-source/ui/`, runtime files and provenance in `assets-runtime/ui/`,
  `assets-runtime/icons/`). Usable as delivered, replaceable by asset ID.
* **Final functional icons (2026-10-02)** — 22 interface, 54 spell, 79
  artifact and 17 skill icons delivered by the owner (masters in
  `assets-source/icons/final/`, runtime files in `assets-runtime/ui/icons/final/`).
  Final art, not stand-ins; 221 catalog entries still use glyphs or procedural art.
* `apps/desktop/build-resources/icon.ico` / `icon.png` and the favicon — made
  from the owner's emblem (`logo.png`) by `tools/assets/prepare_ui_art.py`.
* `assets-runtime/placeholders/menu/background.jpg` — the earlier menu
  background, now only a fallback when no opening background is present.
* Fonts bundled locally (OFL).
* `assets-runtime/audio/placeholder/*.ogg` (60 files, 5.1 MB: 6 music loops,
  4 stingers, 4 ambience beds, 46 effects incl. variants) and
  `assets-runtime/audio/manifest.json` — synthesized by
  `tools/audio/make_placeholders.py` with fixed seeds (no recordings, no
  third-party samples); each manifest entry says `status: "placeholder"`.
  Settings → Audio says so too.

## Deviations and decisions to confirm

1. **Greek roster** follows the v0.3 catalog order; the Centaur pair is neutral.
2. **18-location mapping** of the 32-building catalog; the three support
   locations (Training Academy, Watchtower, Artifact Merchant) now have
   proposed mechanics (25–27 below).
3. **S05** offers a single fixed patron per scenario (Zeus for the campaign;
   each pantheon's patron in skirmish).
4. **Hero hiring** (proposed): Tavern, 2,500 Gold, free visitor position, 10
   tier-1 base creatures; returning heroes come back with 1 creature and no
   movement. Disabled in the campaign by the mission manifest.
5. **Spell learning** happens on entering a town and at dawn in a town with a Sanctum.
6. **M03 balance risk** (unplaytested).
7. **Adventure map shape**: axial-row templates render as parallelograms.
8. **Deployment is interactive only when the human commander has Tactics**
   (owner decision this session). design/04 §1 says "Confirm deployment before
   round 1"; without Tactics the default formation is the two-column
   deployment and battle starts at once. AI/neutral sides always use the
   default formation.
9. **Siege simplifications** (proposed): the wall factor applies to attacker
   shots from outside at targets inside when the structure on the *target's
   row* is intact (a row rule, not a line trace), never to defenders; the keep
   stands off-board and aims from cell (14, 5); the Catapult may target the
   keep; the moat affects both sides and a flyer landing in it cannot attack
   that activation; a town without a Fort is defended in the open; **no stack
   merging** during defender selection (identical forms stay separate) —
   superseded 2026-10-07: identical stacks may be combined, the attacker aims
   the Catapult and turrets pick their targets (0.14.0).
10. **AI information honesty**: belief state hides unseen heroes, wallets,
    other fog, unexplored sites and unseen garrisons.
11. The e2e read-only hooks (`__prInspect`, `__prProject`, `__prHeroes`,
    `__prCamera`, `__prBattle`) exist only when the page URL contains `?e2e`;
    they read presentation state and expose no commands.
12. **Tactical AI**: an engaged stack with no profitable trade now strikes in
    place instead of side-stepping (this removed 60-round stalls exposed by
    Norse retaliation-heavy units).
13. **Norse values are all proposed** (owner decision "Propose them"): stats,
    costs, growth, abilities, town costs, gods, classes, starting armies. The
    town and gods deliberately mirror the Greek structure. (Skirmish now
    grants the dwelling covenants; see 16.)
14. **Content version is now `content-0.4.0`** (new Twin Harbors map, leaders
    and values). Saves made with earlier content versions are listed as
    incompatible and kept (never migrated or deleted).
15. **All pantheons playable now** (owner request: "add the other pantheons…
    so we have all of them inside the game"). I proceeded without further
    questions and assumed, as for Norse, that Claude proposes every number and
    that the Greek structure is mirrored (town tree and costs, god roles, class
    numbers). Hero class assignments, location names, starting escorts and
    leaders are proposed. Identity notes: Egyptian javelin guards at tier 2 and
    a wall-breaking shooter colossus at tier 7; Japanese fast spirits and a
    ranged Kirin; Celtic chargers and a ranged Banshee, no flyers; Mesoamerican
    two ranged tiers and flying bats/serpents.
16. **Skirmish grants the three dwelling covenants** (the families of the
    tier-3, -6 and -7 dwellings) to both towns, so every roster can be built in
    full. This also changes the Greek and Norse skirmishes (previously those
    dwellings could not be built there). The campaign is unchanged.
17. **Twin Harbors is one scenario with 36 pantheon variants.** The previous
    mission IDs `skirmish_twin_harbors_norse` and `skirmish_twin_harbors_vs_norse`
    are now `skirmish_twin_harbors_norse_vs_greek` and
    `skirmish_twin_harbors_greek_vs_norse`; `skirmish_twin_harbors` stays Greek
    vs Greek.
18. **Empty town plots now draw above built art** so every location can be
    clicked. The Greek town had two covered plots (Pantheon Temple under the
    Civic Hall, tier 4 under the Tavern) and the Norse town several; they were
    found by a geometry check run over all six towns.
19. Placeholder hero portraits pick their look from the class's starting skill
    (offense, leadership, or spellbook), so pantheon classes reuse the three
    procedural looks without naming class IDs.
20. **Twin Harbors v2** replaces v1: point-symmetric, 35 × 17, two groves
    (north/south) and a crystal deposit per side instead of one grove and one
    contested deposit; both supply caches give 400 Gold + 2 Wood + 2 Stone.
    `MapTemplateDefinition.symmetry: 'point'` is new, optional generator
    vocabulary; other templates generate exactly as before (golden tests
    unchanged), so `pr-mapgen-0.3` was kept.
21. **Skirmish leaders are all Strategos-type** so no pairing hands one side a
    stronger commander: Alexios vs Odysseus (Greek), Ragnar vs Lagertha,
    Hatshepsut vs Cleopatra, Yoshitsune vs Benkei, Fionn mac Cumhaill vs
    Boudicca, Nezahualcoyotl vs Eight Deer Jaguar Claw. The previous leaders
    (Heracles, Sigurd, Ramses, Tomoe Gozen, Cu Chulainn, Hunahpu) are hireable.
22. **AI information**: the AI now reads its own Taverns' true rosters (as a
    human sees them); everything else still comes from the belief state.
23. **Turn order** is unchanged (the human moves first); no stable first-mover
    advantage was measured, so no compensation was added.
24. **Installer**: per-user (no admin), x64 only, unsigned; `productName`
    "Pantheon Realms", so saves live in `%APPDATA%\Pantheon Realms\saves`.
25. **Pantheon signatures** (owner request, items 4 and "all six"): proposed
    mechanics and numbers in `DESIGN_PROPOSALS.md`. Touch points:
    design/04 §5 defers resurrection — Afterlife and the recovery gods follow
    every constraint it lists (capped by the battle's own losses, winner only,
    no XP/reward/kill loop); design/02 §8 says faction Favor methods "come
    later" — the Offering rite is one, weekly and capped, never from
    casualties (DEC-12) and not a market trade; Glory multiplies the design/04
    §9 XP amount; Harmony counts families and leaves the same-faction morale
    rule alone. Shapeshift aspects are battle statuses, not forms (DEC-21).
    **The Three Beacons is unchanged** (`signatureMechanics: false`).
26. **Second minor-god choice** (owner answer "Add a second choice"): 25 Favor,
    Temple II + level-3 civic hall in one town, a first commitment first. The
    first choice (design/02 §8) is unchanged.
27. **Support buildings** (owner answer "Hero training" for the Academy):
    costs, prerequisites and effects proposed; Watchtower vision 8; merchant
    stock drawn from a hash of match and week, the same in every town (no RNG
    stream consumed; a per-town draw would favor one harbor).
    Outside the campaign allowlists.
28. **AI additions**: god commitments (best blessing score), equipping
    backpack items, offerings only while Favor is needed, academy training
    and merchant purchases with Gold reserves, and a heroless empire now saves
    for a new hero instead of spending everything on its garrison (before, a
    rival that lost every hero early could sit near 1,000 Gold until the day
    cap). Tactical AI takes a free Shapeshift when the other aspect gives a
    clearly better best action.
29. **Content version is now `content-0.5.0`**; saves from 0.4 are listed as
    incompatible and kept.
30. **Balance duels changed**: army/escort/tier duels are now hero battles in
    the matching pairing so each side carries its signature
    (`--no-signatures` restores the troops-only guard duel). Numbers are not
    directly comparable with the content-0.4 table.
31. **Audio buses and Settings** (owner request): settings/02 §4 proposed
    Master, Music, Effects, Ambience and Voice; production/04 §7 routes music,
    ambience, interface, combat and voices through their own buses. This
    build shows **separate Interface and Combat volumes instead of one
    Effects** volume (a schema-1 Effects value carries over to both; the
    preferences schema is now 2), plus **Mute all** (volumes kept) and
    **Calmer sound**. settings/02 §4 said to show "Audio is not implemented"
    rather than fake test sounds; the owner asked for generated placeholder
    sounds, so Settings instead says they are temporary placeholders, and
    the Test button plays real (placeholder) files.
32. **Autoplay**: browsers start audio after the first click; the desktop app
    sets Chromium's `autoplay-policy` switch so the menu music can start at
    launch.
33. **Mission `soundscape`** (presentation data on `MissionDefinition`, never
    read by the rules) picks each map's music and ambience: The Silent Shore
    and Twin Harbors `coast`, The High Pass `high_pass`, the finale
    `storm_plateau`.
34. **Harmony** is now +1 Defense at 3 or more families (the +1 Attack at 5
    families is removed) and **content is `content-0.6.0`**: 0.2.0 saves are
    listed as incompatible and kept.
35. **AI changes** (turn-order fairness, above): retreat out of a visible
    stronger enemy's reach; secondary heroes (below 60% of their strongest)
    stay on their own half unless within 3 hexes of it; the tactical AI does
    not advance alone into more enemy reach than it has allies beside it.
36. **Loading**: the PixiJS layer loads on demand (§ Tests). The UI may take
    values only from `@pr/presentation/core` (no Pixi), enforced by the
    boundary lint.
37. **0.4 proposals** (`DESIGN_PROPOSALS.md` §4–12) are all skirmish
    features or expanded content, switched off in The Three Beacons
    (`features` all false), so the campaign's documented content and
    economy are unchanged. The campaign gains only story scenes, an epilogue
    and a mission score in its completion records
    (`campaign-three-beacons-0.4`).
38. **Story text** (campaign/01 §"Story": "No … cinematic dialogue system is
    required"): the scenes use the "text-first dialogue overlay with
    portraits, subtitles, Backlog and Continue" that section allows. All
    scene lines are new text written for this build — owner review wanted.
39. **Content version is now `content-0.7.0`**; 0.3.0 saves are listed as
    incompatible and kept (as with every earlier content change).
40. **Weekly events and interventions change Twin Harbors** compared with
    0.3.0 (they are on in every skirmish), so the skirmish balance numbers are
    not directly comparable with the 0.3.0 report.
41. **"The Fallen Titan"** was an empty placeholder card from an earlier build
    (not in the owner's documents); it is replaced by the Norse outline card.
42. **High scores** are kept in a separate records store (`records.json` on
    desktop) so they never show up as broken saves; the desktop bridge gained
    `readRecords`/`writeRecords` (validated text only, same size cap).
43. **Visual update is 0.4.1**, not a new content version: no rules or
    content changed, so 0.4.0 saves stay compatible.
44. **Eleven opening backgrounds, not twelve.** The request named
    `opening_screen_background_1.png` … `_12.png`; eleven distinct images
    reached this session (no Mesoamerican battle scene). The menu picks from
    whatever `assets-source/ui/backgrounds/` holds, so a twelfth is one file
    plus a re-run of `prepare_ui_art.py`. The files were renamed by content
    (`opening-<pantheon>-<landscape|battle>`), since the original numbering
    did not come with them.
45. **GUI guide sheets.** `gui_guide.png` and the UI-kit sheet were seen in
    the request but not available as files when this was built; the shared
    style follows them as described (frames, button states, tabs, counters,
    slots, controls) together with the frame, logo and the two icon sheets
    that were available. Owner review of the details is wanted.
46. **Menu icons.** The owner's nine `init_icon` files in
    `assets-runtime/icons/` were renamed by meaning and moved, unchanged, to
    `assets-source/ui/menu-icons/menu-<entry>.png`; `assets-runtime/icons/`
    now holds the same names at 192 px (the 1254 px originals would have added
    7 MB to the installer).
47. **Random Map and High Scores** stay on the main menu as a compact row in
    the frame (the nine framed entries match the owner's icon set); they use
    the SVG glyphs until they get icons of their own.
