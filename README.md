# Pantheon Realms

Pantheon Realms is a desktop-first, offline-capable, data-driven deterministic
turn-based strategy game. TypeScript owns authoritative rules and AI. React
owns application interface screens. PixiJS owns the 2D Adventure Map, Tactical
Battle presentation, sprite animation, and animated Unit Detail viewer.
Electron packages the desktop application and a browser build uses the same
core. Content presentation uses high-resolution 2D backgrounds, sprites,
atlases, portraits, UI art and animation strips. Gameplay state changes only
through validated commands; presentation never defines gameplay outcomes.

> **Play-test build.** The architecture, screens and game logic are real.
> The art is final (GPT-6 paintings, creature and hero animation strips, map
> objects, effects, icons, cursors, town buildings), except the six town
> backgrounds, which are still crops of the owner's concept boards and the
> neutral map hero's silhouette. Music and sound effects are royalty-free
> Pixabay recordings (`assets-source/audio/`). Balance values are proposed
> and measured by AI-vs-AI runs, not yet play-tested. See
> [`DEVELOPMENT_STATUS.md`](DEVELOPMENT_STATUS.md).

## Playable now

* **The Three Beacons** — a three-mission Greek campaign with a persistent
  hero (Alexios), covenants, a minor-god choice, a finale on the storm
  plateau, and story scenes along the way (Ione at the Griffin shrine,
  Melas before the last battle, Thaleia on your losses) in a dialogue window
  with Continue and Backlog, plus an epilogue.
* **Twin Harbors** — a skirmish in which you choose your pantheon and the
  rival's from all six: Greek, Norse, Egyptian, Japanese, Celtic and
  Mesoamerican (36 pairings), on Easy, Normal or Hard — or against a second
  player on the same computer (hot-seat). Every non-Greek value is proposed
  and unplaytested.
* **Random maps** — a new symmetric map every time for two to four empires
  (any mix of AI and people), small/medium/large, *last empire standing* or
  *hold the relic*, with creature camps, one-time map events and wandering
  monsters.
* **Skirmish extras** (proposed): pantheon skills and spells, four artifact
  sets, divine interventions paid in Favor (once a week), and a weekly event.
* **End of game**: a summary with day-by-day charts and a score, and high
  scores for campaign and skirmish. Tips the first time you meet a mechanic,
  F1 for the keyboard shortcuts, and every shortcut can be rebound.
* **Town sieges**, Tactics deployment and Divine Sight on the adventure map.
* **Pantheon signatures** (proposed, skirmish only): Greek Glory, Norse
  Berserk Fury, Egyptian Afterlife, Japanese Harmony, Celtic Shapeshifting,
  Mesoamerican Offering — all built from shared rules
  ([`DESIGN_PROPOSALS.md`](DESIGN_PROPOSALS.md)).
* **A second god choice** (three gods per pantheon with real blessings) and
  the **Training Academy, Watchtower and Artifact Merchant** in every town
  (proposed values).
* **Sound**: menu, map (per region) and battle music, the victory, defeat,
  level-up and beacon fanfares, sea/wind/storm ambience, interface and combat
  sounds — all placeholders — with Master, Music, Ambience, Interface and
  Combat volumes, Mute all, mute in the background and "Calmer sound".

## Installing on Windows

`Pantheon-Realms-Setup-<version>-x64.exe` installs the game for the current
user (no administrator rights), adds Start-menu and desktop shortcuts, and runs
fully offline.

* The installer is **not code-signed** (development build), so Windows
  SmartScreen shows "Windows protected your PC". Choose **More info → Run
  anyway**.
* Saves and settings live in `%APPDATA%\Pantheon Realms\` and are **kept**
  when the game is uninstalled (Settings → Apps → Pantheon Realms).
* To build the installer yourself: `npm install`, then `npm run desktop:dist`
  (on Windows directly; on Linux it also needs Wine for the uninstaller step).

## Quick start (development)

Requires Node.js 22+.

```
npm install
npm run dev            # browser build at http://localhost:5173
npm run desktop        # build and launch the Electron app
npm run check          # import boundaries + type-check + unit tests
npm run test:e2e       # Playwright UI tests (Chromium)
npm run sprites:cut && npm run sprites:import   # cut delivered GPT-6 sheets and bring the sprites in
npm run balance        # AI-vs-AI balance report (tools/balance/README.md)
node tools/perf/load-time.mjs          # start-up and first-scene load times (after npm run build)
python3 tools/audio/make_placeholders.py   # regenerate the placeholder music and sounds
```

## Repository layout

```
apps/client        Vite entry (browser + Electron renderer)
apps/desktop       Electron main + preload
packages/rules     authoritative rules core (DOM-free)
packages/content   validated content catalog and campaign data
packages/mapgen    logical map generation and the random skirmish generator
packages/campaign  missions, carryover, campaign state machine
packages/ai        AI observation, planners, controller
packages/session   game session, checkpoints, save format
packages/platform  storage/window adapters (browser, desktop, memory)
packages/presentation  PixiJS 2D views: Adventure Map, Tactical Battle, Unit Detail viewer, sprite
                   animation (loaded on demand; presentation/core is the Pixi-free part the menu uses)
packages/audio     Web Audio mixer: sound manifest, buses, music/ambience crossfades
packages/ui        React screens, dialogs, preferences, asset manifest
packages/testing   headless game driver for tests
assets-runtime     runtime art (+ provenance): sprites (sprites/manifest.json: creatures, map
                   avatars, map objects, obstacles, effects), painted art (art/), towns, portraits,
                   interface art (ui/, icons/) and sounds (audio/)
assets-source      owner-supplied sources (interface art, icons, cursors, painted art, creature
                   reference views) and sprite tooling inputs (sprites/: content plan, final drops)
tests/e2e          Playwright UI tests
tools              boundary lint, desktop smoke test, load-time measurement, balance tool,
                   placeholder art and sound generators
```

## Documents

* [`ARCHITECTURE.md`](ARCHITECTURE.md) — packages, dependencies, data flow.
* [`IMPLEMENTATION_PLAN.md`](IMPLEMENTATION_PLAN.md) — phases and next steps.
* [`DEVELOPMENT_STATUS.md`](DEVELOPMENT_STATUS.md) — what works, what is
  partial or planned, tests actually run, temporary assets, deviations.
* [`DESIGN_PROPOSALS.md`](DESIGN_PROPOSALS.md) — proposed signatures, second
  god choice, support buildings, and this build's difficulty, story,
  skills/spells, sets, interventions, world features, random maps, hot-seat
  and results screens, with exact numbers.
* [`CAMPAIGN_2_NORSE_OUTLINE.md`](CAMPAIGN_2_NORSE_OUTLINE.md) — the proposed
  second campaign (*The Winter Oath*), an outline awaiting approval.
* [`ASSET_PIPELINE.md`](ASSET_PIPELINE.md) — the 2D sprite contract (file
  names, frame sizes, anchors, facing, animation names, import and
  validation), painted art, icons, cursors, and how to replace the
  placeholder sounds.
* `docs/` — the owner's design, content, campaign and production documents.
