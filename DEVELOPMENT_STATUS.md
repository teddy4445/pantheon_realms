# Development Status

_Last updated: 2026-10-01 · app 0.3.0 · rules `pr-0.2-candidate` + proposed signature/service effects · content `content-0.6.0` · campaign `campaign-three-beacons-0.3` · mapgen `pr-mapgen-0.3` · save schema 1 · preferences schema 2_

Everything below distinguishes what was **measured** (commands actually run
in this session) from targets. Placeholder behavior is labeled as such.

## Tests and checks actually run

| Command | Result |
|---|---|
| `npx vitest run` (14 files) | **160 passed**, 0 failed (new: `packages/audio/test/audio.test.ts`, `packages/ui/test/audio.test.ts`, three AI tests, Harmony tests rewritten) |
| `npx tsc -p tsconfig.core.json` / `apps/client` / `apps/desktop` | pass / pass / pass |
| `node tools/check-boundaries.mjs` | pass (now also enforces the on-demand 3D rule and `@pr/audio`'s place) |
| `npm run build` (Vite browser build) | pass — start-up script `index-*.js` 879 KB (253 KB gzip); 3D layer `src-*.js` 564 KB (146 KB gzip) plus Babylon modules, fetched after the menu; glTF 2.0 loader 745 KB (171 KB gzip), fetched only when a model loads. 571 files (250 JS) |
| `node tools/perf/load-time.mjs <dist> --runs 7` | before/after table in "Start-up load time" below |
| `python3 tools/audio/make_placeholders.py` | 60 Ogg Vorbis files for 52 sound IDs + `assets-runtime/audio/manifest.json`. Peak/RMS levels, DC offset, loop seams and spectrograms were checked by script; **no person has listened to them** |
| `npx playwright test` (Chromium + SwiftShader) | **26 of 27 passed** (10.8 min), including 4 new sound tests (menu music after the first click and every file decodes; Settings preview, Mute all and restore; the campaign map's soundscape; battle music and combat sounds during playback). The one failure was an outdated assertion in `menu.spec.ts` (it expected the old "No audio in this build" note); the test now checks the disabled Voice slider, and `npx playwright test tests/e2e/menu.spec.ts` passed 2 of 2 |
| `npm run desktop:build` + `xvfb-run -a node tools/desktop-smoke.mjs` | **pass** (development layout) and **pass with `PR_SMOKE_EXE`** on the electron-builder `--linux dir` build: `isPackaged` true, name "Pantheon Realms", DevTools refused, saves written; new sound check: manifest lists 52 sounds, 6 files decoded, the audio context runs without a click |
| `npx electron-builder --win nsis --x64 --linux dir --x64` (Linux + Wine) | **built** `Pantheon-Realms-Setup-0.3.0-x64.exe` (136,163,139 bytes, SHA-256 `11a25130…60de55`); its `app-64.7z` payload extracts byte-identical to `win-unpacked`, whose `app.asar` carries content 0.6.0, version 0.3.0, the 52-sound manifest and its 60 files, and no development tools. **Not run on Windows**; unsigned |
| Wine 64-bit install test (0.2.0 build, same NSIS script; not repeated) | a test-only variant with the "app is running" check emptied installs the game files, creates the Desktop and Start-menu shortcuts and registers the uninstaller. The real installer's check falsely reports the app as running under Wine only, so the unmodified installer could not finish there. The installed game did not open a window under Wine; that says nothing about Windows |
| `npm run balance -- --seeds 16 --matches 5 --jobs 2` | 645 jobs in 14.0 min; results below |

### Start-up load time (measured)

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
  atomic desktop saves, 18 screens, shared Babylon engine, event playback).
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
* **Windows installer** (0.3.0, this build) is built and its contents checked,
  but no version has been run on Windows yet, and it is unsigned (SmartScreen
  warns).
* **Combat log** does not back-fill events published before the battle screen
  opened (e.g. the opening round's Catapult shot).
* **Minimap** has no viewport frame.
* **AI** remains heuristic (greedy scoring); it does not cast adventure spells,
  and early battles still decide most AI-vs-AI skirmishes (mean decisive day
  ≈ 9; about a quarter reach the day-40 cap).
* **Siege presentation** uses primitive walls/towers/keep; structure damage is
  shown by height/colour and HP labels.

## Planned (present in data/UI, not playable)

* Undesigned gods (4 per pantheon, 24 in all): listed, not selectable.
* Favor has no use beyond god commitments, so the Offering rite loses value
  once both choices are made (open question in `DESIGN_PROPOSALS.md`).
* Campaigns for the five non-Greek pantheons; more skirmish maps; more than
  one AI rival.
* Stack merging before a siege; manual ballistics; multiplayer; campaign
  "The Fallen Titan"; custom/random maps; key rebinding; final audio and voice;
  graphics quality tiers; tutorials.

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
* `apps/desktop/build-resources/icon.ico` / `icon.png` — an original
  placeholder icon (gold temple on navy), drawn for this build.
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
