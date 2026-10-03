# Development Status

_Last updated: 2026-10-03 · **app 0.7.0** (Windows installer built for play-testing, see below; 0.6.0 before it) · new in 0.7.0: the **owner's interface pass**, the **first 43 creature portraits** and the **2026-10-03 requests** (context cursors, divine gifts, a smarter AI, graphics quality; below) · since 0.5.0: **172 final functional icons**, **hero specialties, all 60 gods, nine new map sites, neutral reactions**, the **92 story pictures**, the **76 ground and sky pictures** and the **41 big-moment pictures** · rules `pr-0.2-candidate` + proposed effects (hero movement 750–1,000, shooting ranges, specialties, reactions) · content `content-0.8.0` (values changed without a version bump; its saves still load, with the new features off) · campaigns `campaign-three-beacons-0.4`, *The Winter Oath* and four arc campaigns (proposed) · mapgen `pr-mapgen-0.3` + random maps **`pr-skirmishgen-0.4`** · save schema 1 (saves from content-0.7.0 refused) · preferences schema 2_

Everything below distinguishes what was **measured** (commands actually run
in this session) from targets. Placeholder behavior is labeled as such.

## Owner fixes of 2026-10-03, second round (town gates, the fallen, victory, town armies), the delivered cursors and pantheon emblems

**Not in the 0.7.0 installer.** Owner decisions (rules changes, unplaytested):

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
  DevTools. (The small calibration GLB stays in the bundle, as in the browser
  build; it is loaded only in the `?e2e=calibration` test mode, which the
  installed app cannot navigate to.)
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
* **GLB model pipeline**: bundled unit manifests bound by creature ID,
  validation (clip names, sockets, no CDN-decoder extensions), right-handed
  battle and viewer scenes, independent rigs per figure, clip playback by
  semantic state with the same speed/instant/skip timing as procedural motion,
  proxy fallback with a reason, viewer Play/Pause/Stop/Restart and
  0.5×/1×/2×, states without a clip disabled with a reason. Artist spec:
  `ASSET_PIPELINE.md`. Calibration fixture generated by
  `tools/assets/make-calibration-glb.mjs`.
* **Saves, desktop, UI, presentation**: as before (versioned envelopes,
  atomic desktop saves, shared Babylon engine, event playback), now 21
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
  is instant. Settings: Master, Music, Ambience, Interface, Combat, Voice
  (disabled), Mute all, mute in the background, Calmer sound, a test sound;
  volumes preview live and Cancel restores them. Silence never blocks play.
* **On-demand 3D layer**: the start-up script no longer contains Babylon.js;
  the 3D layer is fetched in the background once the menu is up, and the
  glTF loader only when a model is loaded.

## Partial

* **No production 3D models exist yet.** Every creature shows its procedural
  placeholder; only the calibration fixture exercises the GLB path (and only
  in the `?e2e=calibration` test mode). Battle playback loops `fly` during a
  flight arc; `takeoff`/`land` are validated but not yet played. The
  adventure map is still a left-handed scene (it loads no GLB).
* **Town screen** is a composed 2D scene (owner concept backgrounds + cropped
  building sprites), not a 3D town. Norse, Egyptian, Japanese, Celtic and
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
  seamless loops, no clipping, spectrograms — not listened to. Voice volume is
  shown but disabled (no voice lines). Captions are not needed yet because
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
* Stack merging before a siege; manual ballistics; the map editor (later, by
  owner decision); final audio and voice. (Graphics quality presets: built
  2026-10-03, see above.) Online
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
* 3D creatures, heroes, sites, siege structures and props: procedural
  primitives; animations are procedural transforms mapped to the final
  state names.
* `assets-runtime/units/_calibration/forward_arrow/` — generated calibration
  GLB (development fixture, never bound to a creature; only loaded in the
  `?e2e=calibration` test mode).
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
   merging** during defender selection (identical forms stay separate).
10. **AI information honesty**: belief state hides unseen heroes, wallets,
    other fog, unexplored sites and unseen garrisons.
11. The e2e read-only hooks (`__prInspect`, `__prProject`) and the
    presentation-only `?e2e=calibration` model fixture exist only when the page
    URL contains `?e2e`; they expose no commands.
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
36. **Loading**: Babylon is imported by module path and the 3D layer loads on
    demand (§ Tests). The UI may take values only from
    `@pr/presentation/core`, enforced by the boundary lint.
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
