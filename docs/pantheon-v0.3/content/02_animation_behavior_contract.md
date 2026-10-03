# Unit Animation and Preview Contract - Behavior Before Assets

**Status:** P. This specifies how future animations work in S18 and battle. Since the 2D migration of 2026-10-03, presentation is PixiJS 2D: each state is one right-facing sprite strip with an explicit anchor in the sprite manifest; see [the production pipeline](../production/02_visual_and_animation_pipeline.md). Final art approval, music, voice and asset sourcing remain production tasks. No animation assets are produced in this documentation step.

## One creature, several presentation states

| State ID | Sprite strip | Required when | Viewer behavior | Battle meaning |
| --- | --- | --- | --- | --- |
| `idle` | `idle` | Every animated creature | Optional loop; static fallback always available | Waiting/standing, no action |
| `move` | `move` | Ground unit | User-requested short loop | Present a precomputed legal movement |
| `fly` | `takeoff`, `fly`, `landing` | Flying unit when separate from move | User-requested loop | Same traversal result, different presentation |
| `melee` | `attack` | Melee-capable unit | One cycle, return to idle | Present one already resolved attack |
| `shoot` | `shoot` | Shooter | One cycle | Present shot; projectile sprite is separate |
| `ability` | `ability` | Active ability with bespoke animation | One cycle | Present that declared ability only |
| `hit` | `hit` | Every animated creature | One cycle on explicit selection | Reaction, not an additional damage event |
| `defend` | `defend` | Every animated creature | One cycle on explicit selection | Present the Defend action; no extra mechanic |
| `defeat` | `death` | Every animated creature | Manual single play; never default autoplay | Present removal; no resurrection on replay |
| `victory` | `victory` | Optional | Manual single play | Cosmetic; no reward trigger |

A missing optional state follows the fallback chain of the [production pipeline](../production/02_visual_and_animation_pipeline.md) (for example `shoot -> attack -> idle`, `fly -> move -> idle`) or disables its selector with a reason. A missing required state uses a still frame or the static portrait and logs a development warning, not an empty or crashing unit screen; a missing death strip is presented by laying the figure down. Strips are authored facing right and mirrored by the renderer; there is no free rotation.

## Separation from the rules engine

The simulation validates and computes an action, including costs, RNG results, positions, statuses, and casualties, exactly once. Presentation consumes that immutable event. It may synchronize a visual impact with the already-computed event, but an animation callback must not be the authority that subtracts HP or spends ammunition.

Skipping, speeding, pausing, closing the viewer, losing focus, or reloading an asset cannot replay damage or award a second battle reward. Unit preview uses a separate harmless pose state and cosmetic RNG, never a cloned live battle that can accidentally dispatch commands.

## Playback controls

S18 provides Play/Pause, Stop, Restart selected animation, playback speed 0.5x/1x/2x, and supported facing selection. The default selected state is Idle. Only Idle may autoplay and only if user preferences permit it. Defeat, hit, and attack animations require explicit selection/play. After a single-action animation completes, return to Idle or the reduced-motion still.

With reduced motion: do not autoplay, sway the camera, shake the screen, pulse the background, or run the idle loop. An explicit Play may run that one requested animation; Stop must be immediately available. Stats and lore never depend on playback.

## Resource lifecycle

Only one animated viewer is active at a time. Pause and release unnecessary resources when the page is hidden, the entry changes, a comparison side loses selection, or the view closes. Cache shared family assets where safe, but preserve base/upgrade identity. Load the essential text/stat content before waiting for large animation assets.

The production engine must later set measured texture-memory, frame-size and strip budgets using target hardware. No untested universal memory/FPS number is asserted here. Quality settings can replace decoration with a still image but cannot hide creature quantity, ownership, action, or status.

## Manifest requirements

Each unit references an `animationProfileId`, not hard-coded filenames in the UI. A profile records renderer type, supported states, available facings, logical scale, origin/footprint anchor, source/licensing metadata, accessible still portrait, and whether each strip loops. Frame grid, frame rate and anchor live in the sprite manifest (`assets-runtime/sprites/manifest.json`).

A two-hex footprint is a rule, not something inferred from how wide a painted character looks. Art scale cannot increase attack range. Sound cues, if added later, are optional presentation events and respect independent volume/mute preferences.

## Review acceptance

A missing file leaves usable stats; switching units rapidly does not leave two audio/animation loops; playback never changes the save checksum; 1x and Instant battle playback yield identical logs and final state for a seed; reduced-motion default stays static; one player's unit preview cannot inspect another player's hidden assets/modifiers; comparison controls never imply an unsupported rotating view.
