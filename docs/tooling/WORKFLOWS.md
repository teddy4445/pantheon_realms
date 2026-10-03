# Three Useful Development Workflows

These are prompts and review sequences, not claims that the game implementation exists. Use current repository commands after inspecting the project.

## 1. A complete Hoplite pair

Start with `/pr-project-lead` to scope the slice. Use `/pr-rules-engine` for definition/upgrade transaction tests. Feed both creature forms into the aggregate audit, while keeping candidate numbers in the real catalog.

Use `/pr-creature-pipeline` to prepare both canonical reference views, both portraits, every required battle animation strip and two visibly distinct forms. Deliveries follow the production queue (`GPT6_2D_CONTENT_GENERATION.md`) and enter the game through `npm run sprites:import`; do not invent extra abilities to match an effect.

Run `inspect_sprite_manifest` (or `node tools/pantheon-dev/audit.mjs sprites`), then `/pr-pixi-scene` to review the Unit Detail viewer and battle presentation. `/pr-react-game-ui` connects S18 and recruitment using shared definitions. `/pr-qa-release` tests base purchase, training, stack conservation, comparison, strip playback, reduced motion and identical normal/instant rules outcomes.

A useful prompt:

```text
/pr-creature-pipeline Prepare Hoplite and Veteran Hoplite as one family.
Read the approved brief and actual current content first. Inventory existing
assets before creating anything. Propose the required reference, portrait and
animation-strip work, then implement only the authorized stage. Do not use
external paid generation, change stats or declare a pair complete from a
placeholder or a single strip.
```

## 2. Mission 1 from menu to completion

Use `/pr-campaign-mapgen` with the canonical M01 anchors/seed and guard gate. Write gate-state tests and ensure the economic upgrade chain is not circular. Do not invent a second road around the mandatory crossing.

Use `/pr-react-game-ui` and Playwright to walk Main Menu -> Campaign -> mission start -> town recruitment/upgrades -> guarded encounter -> result -> beacon restoration. Test failure and back-navigation states, not just the happy path. Inspect the canvas visually while reading authoritative authorized state through ordinary UI or a read-only dev hook that is disabled in production.

Check every result is applied exactly once. Store the canonical map, versions, checkpoint and completion flag. Record a failing fixture/seed instead of patching generation with free resources.

## 3. A real offline desktop release candidate

Use `/pr-electron-offline` to inspect local protocol, IPC and package inclusion rules. Exclude this toolkit and all MCP/developer tokens from the game. Audit sprite, texture, audio and font loading under the strict CSP (PixiJS through `pixi.js/unsafe-eval`), then run a clean installed build on identified hardware with network access disabled.

Open the main menu and settings, inspect both forms in the bestiary, play a mission with local AI, save, close the app and relaunch. Verify recovery and compatibility errors. Repeat browser UI tests separately; do not call them native persistence evidence.

Use `/pr-qa-release` to summarize pass/fail/not-run evidence. A release decision needs executable results, not only a successful build or attractive screenshots.

## Tools not available yet

Missing final art means the manifest entries stay `placeholder`; prepare or update queue entries instead of reporting finished animation. Missing Playwright/browser dependencies mean write or inspect tests without claiming they ran. Missing game scripts mean the next deliverable is a scaffold or plan, not an invented end-to-end test result.
