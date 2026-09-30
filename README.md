# Pantheon Realms

A desktop-first, offline-capable, turn-based mythological strategy game.
TypeScript rules and AI, React interface, Babylon.js 3D, Electron desktop
shell, and a browser build from the same core.

> **Development build.** The architecture, screens and game logic are real;
> all art, models, animation and portraits are temporary placeholders (the GLB
> model pipeline is ready, but no production model exists yet). There is no
> audio yet. See [`DEVELOPMENT_STATUS.md`](DEVELOPMENT_STATUS.md).

## Playable now

* **The Three Beacons** — a three-mission Greek campaign with a persistent
  hero (Alexios), covenants, a minor-god choice and a finale on the storm
  plateau.
* **Twin Harbors** — a skirmish against a local AI rival in which you choose
  your pantheon and the rival's from all six: Greek, Norse, Egyptian,
  Japanese, Celtic and Mesoamerican (36 pairings). Every non-Greek value is
  proposed and unplaytested.
* **Town sieges**, Tactics deployment and Divine Sight on the adventure map.
* **Pantheon signatures** (proposed, skirmish only): Greek Glory, Norse
  Berserk Fury, Egyptian Afterlife, Japanese Harmony, Celtic Shapeshifting,
  Mesoamerican Offering — all built from shared rules
  ([`DESIGN_PROPOSALS.md`](DESIGN_PROPOSALS.md)).
* **A second god choice** (three gods per pantheon with real blessings) and
  the **Training Academy, Watchtower and Artifact Merchant** in every town
  (proposed values).

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
npm run assets:check   # validate unit models (Khronos validator + game checks)
npm run balance        # AI-vs-AI balance report (tools/balance/README.md)
```

## Repository layout

```
apps/client        Vite entry (browser + Electron renderer)
apps/desktop       Electron main + preload
packages/rules     authoritative rules core (DOM-free)
packages/content   validated content catalog and campaign data
packages/mapgen    logical map generation
packages/campaign  missions, carryover, campaign state machine
packages/ai        AI observation, planners, controller
packages/session   game session, checkpoints, save format
packages/platform  storage/window adapters (browser, desktop, memory)
packages/presentation  Babylon.js scene controllers and placeholder proxies
packages/ui        React screens, dialogs, preferences, asset manifest
packages/testing   headless game driver for tests
assets-runtime     committed runtime placeholders (+ provenance) and unit models (units/)
tests/e2e          Playwright UI tests
tools              boundary lint, desktop smoke test, placeholder asset tooling
```

## Documents

* [`ARCHITECTURE.md`](ARCHITECTURE.md) — packages, dependencies, data flow.
* [`IMPLEMENTATION_PLAN.md`](IMPLEMENTATION_PLAN.md) — phases and next steps.
* [`DEVELOPMENT_STATUS.md`](DEVELOPMENT_STATUS.md) — what works, what is
  partial or planned, tests actually run, temporary assets, deviations.
* [`DESIGN_PROPOSALS.md`](DESIGN_PROPOSALS.md) — proposed signatures, second
  god choice and the three support buildings, with exact numbers.
* [`ASSET_PIPELINE.md`](ASSET_PIPELINE.md) — artist spec for creature GLBs:
  orientation, scale, the eight clip names, manifests, validation.
* `docs/` — the owner's design, content, campaign and production documents.
