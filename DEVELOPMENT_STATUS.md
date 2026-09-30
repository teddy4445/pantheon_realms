# Development Status

_Last updated: 2026-09-30 · rules `pr-0.2-candidate` + proposed signature/service effects · content `content-0.5.0` · campaign `campaign-three-beacons-0.3` · mapgen `pr-mapgen-0.3` · save schema 1_

Everything below distinguishes what was **measured** (commands actually run
in this session) from targets. Placeholder behavior is labeled as such.

## Tests and checks actually run

| Command | Result |
|---|---|
| `npx vitest run` (12 files) | **132 passed**, 0 failed |
| `npx tsc -p tsconfig.core.json` / `apps/client` / `apps/desktop` | pass / pass / pass |
| `node tools/check-boundaries.mjs` | pass |
| `npm run build` (Vite browser build) | pass — main chunk ≈ 6.8 MB (1.5 MB gzip), dominated by Babylon.js |
| `npx playwright test` (Chromium + SwiftShader) | **23 of 23 passed** (8.7 min), including 5 new UI tests: Mesoamerican offering at the Temple, Training Academy + Watchtower, Artifact Merchant purchase, second god choice on the Pantheon screen, Celtic free Shapeshift in battle |
| `npm run desktop:build` + `xvfb-run -a node tools/desktop-smoke.mjs` | **pass** (development layout) and **pass with `PR_SMOKE_EXE`** on an electron-builder `--linux dir` packaged build: `isPackaged` true, name "Pantheon Realms", DevTools refused, saves written |
| `npx electron-builder --win nsis --x64 --linux dir --x64` (Linux + Wine) | **built** `Pantheon-Realms-Setup-0.2.0-x64.exe` (131,810,293 bytes, SHA-256 `46d08be5…c56382`); its `app-64.7z` payload extracts byte-identical to `win-unpacked`, whose `app.asar` carries content 0.5.0 and the menu label v0.2.0 (a first 0.2.0 build still said v0.1.0 because the client was built before the version bump; replaced). The packaged Linux build passes `tools/desktop-smoke.mjs` again. **Not run on Windows**; unsigned |
| Wine 64-bit install test (earlier 0.2.0 build, same NSIS script) | a test-only variant with the "app is running" check emptied installs the game files, creates the Desktop and Start-menu shortcuts and registers the uninstaller. The real installer's check falsely reports the app as running under Wine only, so the unmodified installer could not finish there. The installed game did not open a window under Wine; that says nothing about Windows |
| `npm run balance -- --seeds 16 --matches 5 --jobs 2` | 645 jobs in 9.5 min; results below |

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

### Balance measurements with signatures, gods and services (AI-vs-AI, not playtests)

`npm run balance -- --seeds 16 --matches 5 --jobs 2` on content 0.5.0 (645
jobs, 9.5 min). Pantheon average score against the other five (0.50 = even;
⚠ outside 0.35–0.65). The skirmish suite plays everything (signatures, both
god choices, offerings, academy, merchant, watchtower); the army/escort duels
now carry each side's in-battle signature (Harmony, Fury, free Shapeshift).

| Suite | Greek | Norse | Egyptian | Japanese | Celtic | Mesoamerican |
|---|---|---|---|---|---|---|
| Skirmish (360 whole matches) | 0.57 | 0.47 | 0.55 | 0.40 | 0.59 | 0.42 |
| Armies, 1 week, base | 0.41 | 0.49 | 0.55 | 0.63 | 0.57 | 0.36 |
| Armies, 1 week, upgraded | 0.31 ⚠ | 0.44 | 0.50 | 0.72 ⚠ | 0.57 | 0.46 |
| Armies, 2 weeks, base | 0.63 | 0.63 | 0.27 ⚠ | 0.60 | 0.43 | 0.44 |
| Armies, 2 weeks, upgraded | 0.37 | 0.64 | 0.33 ⚠ | 0.75 ⚠ | 0.39 | 0.53 |
| Starting escorts | 0.38 | 0.56 | 0.44 | 0.51 | 0.59 | 0.52 |

Skirmish: 322 of 360 matches decided by elimination (mean day 9.0), 38 scored
at the day-40 cap. Fairness checks: **west-town score 0.56, first-mover score
0.41** (content 0.4: 0.52 and 0.48). The shift is 1.5–3 standard errors, so a
small second-mover edge may be real; it was not investigated this session.

Reading the table: every pantheon stays inside 0.35–0.65 in whole skirmishes.
**Harmony** is the swing factor in full-roster duels: the first proposal
(+2/+2 at 7 families) gave Japanese armies 0.78–0.92 and was cut to +1/+1 at
5+ families; a Defense-only test still gave 0.51–0.69, while the Japanese
skirmish score was already the lowest (0.40), so the +1/+1 version was kept
and the duel outlier is reported rather than hidden. **Afterlife** acts only
between battles, so Egyptian two-week duel scores (0.27/0.33) do not include
it; its skirmish score is 0.55. Greek values are still the untuned design/06
candidates. Duels at equal strength are very sensitive (a +1 Defense edge on
every stack moves a pairing by up to ~0.2), so these numbers are for spotting
outliers, not for fine tuning.

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
  human has played them. Measured duel outliers: Japanese upgraded full
  rosters (Harmony, 0.72–0.75), Egyptian two-week armies (0.27–0.33; Afterlife
  acts only between battles), Greek one-week upgraded armies (0.31).
* **AI use of the new mechanics** is heuristic: it never takes a Shapeshift
  that costs the activation, values gods by a fixed blessing score, and its
  army-strength estimate ignores signatures and blessings.
* **Windows installer** (0.2.0, this build) is built and its contents checked,
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
  "The Fallen Titan"; custom/random maps; key rebinding; audio; graphics
  quality tiers; tutorials.

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
* Fonts bundled locally (OFL). No audio.

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
