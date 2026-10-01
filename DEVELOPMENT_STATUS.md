# Development Status

_Last updated: 2026-10-01 · app 0.4.1 (0.4.0 + visual design) · rules `pr-0.2-candidate` + proposed effects · content `content-0.7.0` · campaign `campaign-three-beacons-0.4` · mapgen `pr-mapgen-0.3` + random maps `pr-skirmishgen-0.1` · save schema 1 · preferences schema 2_

Everything below distinguishes what was **measured** (commands actually run
in this session) from targets. Placeholder behavior is labeled as such.

## Tests and checks actually run (0.4.1 visual update, this session)

| Command | Result |
|---|---|
| `python3 tools/assets/prepare_ui_art.py` | 120 UI assets (11 backgrounds, logo, emblem, frame, 9 menu icons, 96 pack icons, app icon), 6.2 MB of runtime files; contact sheet of the 96 crops checked by eye |
| `npm run check` | **pass — 192 tests** (17 files; new `packages/ui/test/uiArt.test.ts`, 4: every listed file bundled and readable PNG/WebP with provenance, backgrounds listed, frame window measured, every asset ID the UI names exists, `icon.ico` carries 16–256 px) |
| `npm run build` | pass — start-up script 1,055 KB (295 KB gzip; 0.4.0: 1,016 / 290), 693 files (UI art adds 122) |
| `npx playwright test` | **34 of 34 passed** on the redesign (12.8 min), again after the spell sockets and version change (13.1 min), and on the final build after the performance fix below (13.0 min). `menu.spec.ts` now also checks that the opening background comes from the manifest list, that every image on the main menu loaded, and that all menu entries are visible |
| `npm run desktop:build` + `xvfb-run -a node tools/desktop-smoke.mjs` | **pass** (development layout; opening screen checked in Electron: background, logo, frame, icons and Quit) and **pass with `PR_SMOKE_EXE`** on a fresh `--linux dir` build (`app.asar` 36.6 MB with `renderer/ui/`, no `assets-source/`, tools or source maps) |
| `node tools/perf/load-time.mjs apps/client/dist --runs 7` | menu **149 ms** local / **330 ms** web (0.4.0: 140 / 321); first 3D scene 743 ms local (samples 232–1,256 ms), 1,024 ms web. Same headless SwiftShader setup; the scene samples are too noisy for single medians, so 0.4.0 and 0.4.1 were also measured **interleaved** (12 + 12 local runs, a scratch copy of the tool): **741 ms vs 730 ms** median — no measurable difference locally. The web profile is slower (0.4.0: 721 ms) because the new icons and backgrounds also come over the throttled 20 Mbit/s link; the desktop game reads them from disk |
| Windows installer | **not rebuilt** for 0.4.1 in this session (the 0.4.0 installer from earlier today does not have the new look); `npm run desktop:dist` on Windows builds it with the new icon |
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
their attention evenly (not yet fixed). The AI also rarely finishes a random
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
* **Second campaign**: Norse outline only — `CAMPAIGN_2_NORSE_OUTLINE.md`
  (*The Winter Oath*). It replaces the empty "The Fallen Titan" card as
  "Outline — awaiting approval"; no mission is built.
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
  its true Tavern roster, explores, **besieges visible towns** when it is
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
* **Combat log** does not back-fill events published before the battle screen
  opened (e.g. the opening round's Catapult shot).
* **Minimap** has no viewport frame.
* **AI** remains heuristic (greedy scoring); it does not cast adventure spells
  (Fleet Foot, Homecoming, Eye of Horus, Divine Sight), and early battles still
  decide most AI-vs-AI skirmishes (see the balance report for this build).
* **AI and the 0.4 features** is heuristic too: it recruits from camps it
  stands on, picks the map-event option with the highest fixed value, invokes
  interventions while keeping 25 Favor until both god choices are made, and
  scores the new battle spells by their immediate value; it does not plan
  around artifact sets or weekly events, and its strength estimate ignores
  skills, sets and interventions.
* **Hot-seat** has no per-player privacy for toasts that report events seen
  by the previous player, and a battle between two people shows "Victory"
  from the winner's side. Two people cannot play the campaign together.
* **Random maps** are one land hexagon (no water crossings or underground);
  roads link each town to its own sites but not to the contested center or to
  other empires (by design of the first generator). The first week has no
  weekly event. Camp, guard and monster creatures are drawn from every
  pantheon's base forms, and the mercenary event always offers Centaurs, so
  an empire meets other pantheons' creatures as neutrals.
* **Story scenes** use the existing placeholder portraits; there is no voice.
  The Norse campaign is an outline only.
* **Siege presentation** uses primitive walls/towers/keep; structure damage is
  shown by height/colour and HP labels.

## Planned (present in data/UI, not playable)

* Undesigned gods (4 per pantheon, 24 in all): listed, not selectable.
* Favor has no use beyond god commitments, so the Offering rite loses value
  once both choices are made (open question in `DESIGN_PROPOSALS.md`).
* Favor in the campaign: interventions are skirmish-only, so in The Three
  Beacons Favor still only buys gods (documented economy unchanged).
* Campaigns for the five non-Greek pantheons — the Norse one is outlined
  (`CAMPAIGN_2_NORSE_OUTLINE.md`) and awaits the owner's approval; more
  authored skirmish maps.
* Stack merging before a siege; manual ballistics; the map editor (later, by
  owner decision); final audio and voice; graphics quality tiers. Online
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
* Creature/hero/god portraits, emblems, mission thumbnails: procedural SVG.
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
