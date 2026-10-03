# Production Stack and Architecture

**Version:** 0.3-production-handoff | **Date:** 2026-09-29 | **Updated:** 2026-10-03 (2D presentation migration, owner directive; [DEC-23](../DECISIONS_v0_3.md))  
**D - Adopted:** Pantheon Realms is a desktop-first, offline-capable, data-driven deterministic turn-based strategy game. TypeScript owns authoritative rules and AI. React owns application interface screens. PixiJS owns the 2D Adventure Map, Tactical Battle presentation, sprite animation, and animated Unit Detail viewer. Electron packages the desktop application and a browser build uses the same core. Content presentation uses high-resolution 2D backgrounds, sprites, atlases, portraits, UI art and animation strips. Gameplay state changes only through validated commands; presentation never defines gameplay outcomes.  
**P - Engineering specification:** The module boundaries, budgets, packaging details, and milestone sequence below. These are implementation proposals, not claims that a production game exists.

## 1. Product contract

Pantheon Realms is a complete local strategy game, not a webpage that requires a game server to work. After the desktop package is installed, a player must be able to launch it with networking disabled, open the main menu and settings, browse the bestiary, play all three demo missions against local AI, save, close, relaunch, and continue. No login, online license check, cloud-generated dialogue, downloaded AI response, CDN font, or remote asset is required for these actions.

The browser build uses the same rules, content IDs, AI, React components, and PixiJS presentation. Platform adapters change storage, packaging, and supported native actions; they do not maintain a second set of damage or economy formulas. A browser's first visit still needs asset delivery; offline browser availability can only be advertised after a complete local cache has been verified. The desktop installer includes the complete demo asset pack.

High-resolution pre-rendered 2D is the selected direction. One fixed elevated three-quarter camera per view (pan and zoom only), clear silhouettes, painted terrain, skies and battlefields, composed town backgrounds with building overlays, and animated sprite strips for tactical units are the target. Every sprite is authored facing right and the renderer mirrors it for the other side. This is not an unrestricted photorealistic open-world project. Icons, portraits, typography, and static fallbacks remain parts of the interface.

## 2. Stack ownership

| Layer | Choice | Owns | Does not own |
| --- | --- | --- | --- |
| Rules | TypeScript, strict type checking | Commands, legality, calendars, combat, economy, progression, authoritative RNG | DOM, PixiJS display objects, audio, OS paths |
| Content | Validated JSON plus localized text | Units, paired upgrades, buildings, spells, campaign templates, references | Mutable HP, current resources, progression snapshots |
| AI | TypeScript plus dedicated workers | Legal planning using an authorized observation and a rules snapshot | Hidden player information, display objects, alternate combat mathematics |
| Presentation | PixiJS 8 (`@pr/presentation`) | 2D Adventure Map, Tactical Battle presentation, animated Unit Detail viewer, sprite animation, 2D camera (pan/zoom), effects, interpolation, picking through the hex transform | Whether an action succeeds or how much damage it deals |
| Interface | React and CSS | Menus, settings, accessible controls, journals, quotations, view models | A second resource wallet or editable creature base statistics |
| Authoring | 2D art pipeline: reference art -> portraits -> animation strips (GPT-6 deliveries queued in `GPT6_2D_CONTENT_GENERATION.md`; labelled placeholders meanwhile) | Canonical reference views, portraits, animation strips, painted backgrounds, map objects, effects, UI art | Authoritative terrain costs or battle footprints |
| Runtime assets | Sprite manifest (`assets-runtime/sprites/manifest.json`, schema `pantheon-realms-sprites-1`) plus WebP strips and stills; art, icon and audio manifests | Frame grid, explicit anchor, facing, frame rate, loop policy, `placeholder`/`final` status and provenance per entry | Source images, briefs and deliveries (kept in `assets-source/`) |
| Desktop | Electron | Local asset origin, lifecycle, native saves, import/export and window commands | Game rules embedded in privileged IPC handlers |
| Browser | Static client build | Same game application and browser storage adapter | Native filesystem or desktop-only Quit promises |
| Build and tests | Proposed: Vite, Vitest, Playwright, Electron packaging tooling | Bundles, headless tests, UI tests, release automation | A claimed performance guarantee |

PixiJS documents the asset loading, texture and sprite-anchor behaviour the runtime relies on; React documents setup/cleanup for an external system such as a persistent canvas. See [T01, T02, T03, T04](../reference/05_production_sources.md). Specific dependency versions must be selected and locked in the implementation repository (`pixi.js` 8.22.0 at the 2D migration), not inferred from a moving documentation page.

## 3. Suggested repository

```text
apps/
  client/                  # browser build (Vite) of the shared React app
  desktop/                 # Electron main + sandboxed preload
packages/
  rules/                   # DOM-free authoritative simulation
  ai/                      # strategic and tactical planners
  content/                 # schemas, validated definitions, campaign data
  campaign/                # mission state machine and carryover policy
  mapgen/                  # deterministic logical generation + validation
  presentation/            # PixiJS 2D views (adventure map, battle, unit viewer),
                           # sprite manifest types, animation vocabulary, hex transforms
  audio/                   # audio director (Web Audio buses)
  ui/                      # React views, keyboard/focus and view-model bindings
  platform/                # explicit desktop/browser service contracts
  testing/                 # seeds, fixtures and deterministic replay assertions
assets-source/             # reference art, briefs, GPT-6 deliveries (sprites/final/), audio sources
assets-runtime/            # imported runtime assets: sprite manifest + WebP strips, art, icons, audio
tools/                     # content validator, map reviewer, sprite placeholder/import/queue tools
```

Do not turn this into a requirement for thirteen independently published packages. A workspace or clearly separated folders is sufficient initially. Enforce the important import boundaries in lint/build checks: `rules`, `ai`, `campaign`, and `mapgen` must not import React, PixiJS, Electron, or browser storage.

## 4. One simulation, one command path

The local application has one authoritative simulation host. For the first implementation, it runs the synchronous TypeScript rules on the application's main JavaScript thread; expensive AI searches and map generation run in workers. If profiling later justifies moving the simulation host itself to a worker, its command interface must remain unchanged. There are never two concurrently mutable authoritative copies.

```text
Input -> Command -> Validate -> Commit -> New state + immutable events
                                         |             |
                                         v             v
                                    React view     PixiJS/audio playback

AI worker -> Proposed command -> SAME validation and commit path
Save adapter <- explicit versioned snapshot of the authoritative state
```

A command carries `commandId`, `expectedRevision`, `actorPlayerId`, `kind`, and a typed payload. Validation checks the actor, phase, revision, resources, legal targets, and scenario restrictions. Failure returns a structured reason and changes nothing. A committed command increments the revision and emits ordered events with unique IDs. Duplicate command IDs cannot repeat a purchase or reward.

Illustrative commands: `MoveHero`, `BuildStructure`, `RecruitUnits`, `UpgradeStack`, `AssignCovenant`, `CommitMinorGod`, `BattleMelee`, `BattleShoot`, `CastSpell`, `CompleteMission`. A screen can ask for a read-only quote using the same resolver before submitting a command.

Keep the v0.2 proposed economy and combat profile as a coherent baseline. This stack decision does not by itself approve every balance number. In particular, do not mix the old demo's multi-day construction with v0.2 immediate one-build-per-town-per-day behavior.

## 5. Determinism and presentation

Use seeded, explicit RNG streams for battle, progression, and generation. Cosmetic randomness belongs to presentation and never advances a gameplay stream. Persist full RNG states, not only the original seed. Stable ID ordering, integer resource accounting, explicit rounding, and versioned content are necessary for a useful replay; a seed alone is insufficient.

Define fixed-point or rational calculations where fractional rule coefficients would otherwise introduce ambiguous rounding. Serialize plain values, not JS class prototypes, Maps with incidental ordering, PixiJS points or display objects, or native objects. Canonical hashes exclude wall-clock timestamps, camera settings, and cosmetic events.

An attack resolves once in the rules. Its result event includes the participants, target, damage, surviving count, and result revision. The renderer animates that known result. A footstep, projectile arrival, strip end, or effect callback never subtracts HP. Normal, fast, and instant playback must produce the same final rules hash. During presentation, input may be queued or temporarily locked, but world days never advance because an animation takes two seconds.

## 6. React and PixiJS integration

Create one long-lived renderer for the current application session: one PixiJS renderer (WebGL) shared by the views, with its own frame loop and a frame cap. View controllers explicitly create and dispose the adventure map, battlefield, and unit viewer; the town screen is React over a 2D background with building overlays. The PixiJS views load on demand as a lazy chunk (`packages/ui/src/scene/SceneHost.tsx`); the interface takes values only from `@pr/presentation/core`. React owns the canvas container and lifecycle boundary, not every moving sprite or particle. Update DOM text when relevant game state changes, not on each rendered frame. Correct cleanup is required even when React development behavior repeats setup/cleanup [T04](../reference/05_production_sources.md).

Keep S01 Main Menu, S17 Settings, S16 Encyclopedia index, and S18 Unit Detail available without a match. Preserve the caller's context when inspecting a unit from recruitment or combat. Unit quantities and prices come from the shared resolver. The bestiary is not a second creature database.

The unit viewer may reuse cached textures, but each animated sprite keeps its own frame clock where animations differ. Switching views must cancel stale loading tasks, release references, stop obsolete audio, and avoid double-running frame loops. Start with a single active full-size view; a bestiary overlay pauses or hides unnecessary background rendering.

## 7. Desktop packaging and security

Use an application-owned local origin such as `prgame://app/`, registered before application readiness, and serve only validated packaged paths. Register the capabilities needed for relative URLs, asset fetches, workers and streaming; do not grant a blanket CSP bypass. Electron documents custom protocols and recommends limiting renderer privileges [T05, T06](../reference/05_production_sources.md).

Require `nodeIntegration: false`, `contextIsolation: true`, and a sandboxed renderer. The preload bridge exposes narrow operations such as `listSaves`, `readSave`, `writeSave`, `exportSave`, `importSave`, `setWindowMode`, and `quitApplication`; never arbitrary filesystem access, shell execution, or unrestricted IPC sending. Validate IPC sender and arguments in the main process. Confine save identifiers to the game's save directory and reject path traversal. Treat imported saves and mod-like content as untrusted data.

Disable unexpected navigation and new windows. Explicit external help links require an allowlist and user action. Apply a restrictive Content Security Policy that is tested with the chosen worker and image-decoding paths; do not solve a load error by enabling unsafe evaluation or disabling web security. PixiJS runs under this policy through its `pixi.js/unsafe-eval` module, so the renderer needs no `eval`.

Desktop builds load their own packaged assets, not the public website. A development server is a development convenience, not a launch requirement. Signing/notarization, installer formats, and supported operating systems are release tasks. Windows is the proposed first QA target; additional OS releases need actual packaging and hardware testing, not a cross-platform claim by assumption.

## 8. Offline completeness: hidden dependencies count

Runtime images (WebP strips, stills, painted backgrounds, icons) are loaded from the application's own origin [T01](../reference/05_production_sources.md); no texture, font, decoder or worker script is fetched from a CDN. Vendor every needed worker script, texture, shader support file and font locally. Test a clean machine or profile, not just a developer cache.

The dependency audit must fail a release if playing the campaign requests an unapproved network origin. Optional update checks time out gracefully and never block the main menu. No telemetry is necessary for the demo. Audio creation must tolerate suspended/unavailable audio contexts without stopping play.

For the browser, provide an explicit asset download/cache status rather than promising offline play after loading only the menu. Use versioned caches and retain the assets needed by a running version until it closes. Browser storage is quota-limited and may be evicted; provide save export/import and handle failures honestly [T07](../reference/05_production_sources.md). The desktop's offline guarantee must not be weakened to match browser caching limitations.

## 9. Saves and campaign progress

A save envelope records `saveSchemaVersion`, `rulesVersion`, `contentVersion`, `campaignVersion`, `mapGeneratorVersion`, map seed and generated-map hash, RNG states, mission state, current entities, pending mandatory choices, and committed event IDs. The immutable logical map is stored with the save or referenced by a retained exact version; loading must not regenerate a different map under a newer algorithm.

Desktop saves use a temporary file, validation/checksum, replacement, and a previous-good backup. Recovery must be tested for interruption; do not claim every filesystem offers identical atomic guarantees. Browser snapshots use an IndexedDB transaction behind the same adapter. Settings live separately from gameplay snapshots.

The initial explicit save UI is available only outside unresolved combat and after mandatory choices. Maintain a pre-encounter checkpoint for recovery. A clean interruption during combat resumes from that checkpoint, not from half-applied damage. Campaign completion records and next-mission initialization use an idempotent transition, described in the campaign document. Never silently overwrite a player's earlier branch or import an incompatible v0.1 save.

## 10. Local AI

Workers allow costly work away from the UI thread; communication uses explicit messages rather than DOM access [T08](../reference/05_production_sources.md). Each AI request includes an observation, rules/content version, snapshot revision, seed, and search budget. Stale answers are rejected after state changes. Cancellation and worker failure return to a legal safe plan, not an invented victory.

Strategic scoring considers income, reinforcement access, objectives, threats, travel cost, and expected attrition. Tactical search enumerates legal moves, attacks, spells, waits, and defends through the shared rules. Search is forbidden from consuming the real game's RNG or observing private enemy inventory. Rollout randomness belongs to a separate planning stream.

Use fixed node budgets for deterministic automated tests. Live play may additionally enforce a wall-clock responsiveness ceiling, with a best-so-far legal action; record the resulting action for replay. Tie-break by explicit stable IDs. No online LLM is required for ordinary opponents. Python may analyze exported results offline; it is not a second authoritative game engine. Rust/WASM is a later optimization only after profiling identifies a specific bottleneck.

## 11. Audio, graphics, and platform quality

The Web Audio API provides the audio graph, gain nodes and suspend/resume behavior [T09](../reference/05_production_sources.md). Place an original audio director (`packages/audio`) above it: music, ambience, interface, combat, and optional voice buses. Scene transitions crossfade; settings apply consistently; a bestiary request never leaves a creature loop playing after exit. Sources and codecs are packaged locally and tested on the supported runtime.

Use WebGL2 as the first required rendering backend and validate WebGPU as an optional enhancement. PixiJS documents both renderer paths [T10](../reference/05_production_sources.md); our own effects, quality presets and asset-loading path still need testing. Select a backend before view construction. Device/context loss must return a recoverable view or a checkpoint, not corrupt the match.

Proposed acceptance targets, not measured claims: 60 FPS at 1080p on an explicitly recorded reference PC, a stable 30 FPS lower-quality profile, no long interface freeze during AI, and bounded memory over repeated town/battle/bestiary visits. Record CPU, GPU, RAM, OS, driver, resolution, backend, and asset pack with every result. Texture-memory and frame-size budgets in the asset documents are starting budgets to profile, not hardware guarantees.

## 12. Development sequence and definition of done

1. Headless rules/content validation; lock the upgrade topology and three mission manifests.
2. Shared React shell, real menu/settings/save adapters, offline Electron launch, browser build.
3. One production-quality Hoplite pair, one map region, one town, one tactical encounter, and S18 inspection.
4. Campaign mission 1 with real upgrades, outcomes, checkpoints and completion.
5. Complete flight/ranged/mounted/large-creature pipelines; missions 2 and 3; local AI.
6. Package all required assets, test clean offline installation, regression-test campaign transitions and browser/desktop parity.

Vite's output can be served statically; its preview command is not a production server [T11](../reference/05_production_sources.md). Select and pin a supported Electron packaging solution during the technical spike. Store the toolchain and the sprite placeholder/import tool configuration in version control. This document does not instruct the developer to install arbitrary `latest` dependencies or to reproduce obsolete API snippets.

Done means the connected campaign works with real assets and verified local persistence. A beautiful scene without rules, a headless simulator without screens, or a mocked online-only menu does not satisfy the approved product contract.
