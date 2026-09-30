# Unit Animation and Preview Contract - Behavior Before Assets

**Status:** P. This specifies how future animations work in S18 and battle. v0.3 now adopts stylized 3D, Babylon.js and Blender/glTF; see [the production pipeline](../production/02_visual_and_animation_pipeline.md). Final art approval, music, voice and asset sourcing remain production tasks. No animation assets are produced in this documentation step.

## One creature, several presentation states

| State ID | Required when | Viewer behavior | Battle meaning |
| --- | --- | --- | --- |
| `idle` | Every animated creature | Optional loop; static fallback always available | Waiting/standing, no action |
| `move` | Ground unit | User-requested short loop | Present a precomputed legal movement |
| `fly` | Flying unit when separate from move | User-requested loop | Same traversal result, different presentation |
| `melee` | Melee-capable unit | One cycle, return to idle | Present one already resolved attack |
| `shoot` | Shooter | One cycle | Present shot; projectile asset may be separate |
| `ability` | Active ability with bespoke animation | One cycle | Present that declared ability only |
| `hit` | Every animated creature | One cycle on explicit selection | Reaction, not an additional damage event |
| `defeat` | Every animated creature | Manual single play; never default autoplay | Present removal; no resurrection on replay |
| `victory` | Optional | Manual single play | Cosmetic; no reward trigger |

A missing optional state disables its selector with a reason. A missing required state uses a static portrait and logs a development warning, not an empty or crashing unit screen. Do not promise rotation unless a 3D model exists; use facing selectors for 2D sheets.

## Separation from the rules engine

The simulation validates and computes an action, including costs, RNG results, positions, statuses, and casualties, exactly once. Presentation consumes that immutable event. It may synchronize a visual impact with the already-computed event, but an animation callback must not be the authority that subtracts HP or spends ammunition.

Skipping, speeding, pausing, closing the viewer, losing focus, or reloading an asset cannot replay damage or award a second battle reward. Unit preview uses a separate harmless pose state and cosmetic RNG, never a cloned live battle that can accidentally dispatch commands.

## Playback controls

S18 provides Play/Pause, Stop, Restart selected clip, playback speed 0.5x/1x/2x, and supported facing selection. The default selected state is Idle. Only Idle may autoplay and only if user preferences permit it. Defeat, hit, and attack clips require explicit selection/play. After a single-action clip completes, return to Idle or the reduced-motion still.

With reduced motion: do not autoplay, sway the camera, shake the screen, pulse the background, or run the idle loop. An explicit Play may run that one requested clip; Stop must be immediately available. Stats and lore never depend on playback.

## Resource lifecycle

Only one animated viewer is active at a time. Pause and release unnecessary resources when the page is hidden, the entry changes, a comparison side loses selection, or the view closes. Cache shared family assets where safe, but preserve base/upgrade identity. Load the essential text/stat content before waiting for large animation assets.

The production engine must later set measured texture/model/clip budgets using target hardware. No untested universal memory/FPS number is asserted here. Quality settings can replace decoration with a still image but cannot hide creature quantity, ownership, action, or status.

## Manifest requirements

Each unit references an `animationProfileId`, not hard-coded filenames in the UI. A profile records renderer type, supported states, available facings, logical scale, origin/footprint anchor, source/licensing metadata, accessible still portrait, and whether each clip loops. Timing and frame metadata belong to the actual chosen asset pipeline.

A two-hex footprint is a rule, not something inferred from how wide a painted character looks. Art scale cannot increase attack range. Sound cues, if added later, are optional presentation events and respect independent volume/mute preferences.

## Review acceptance

A missing file leaves usable stats; switching units rapidly does not leave two audio/animation loops; playback never changes the save checksum; 1x and Instant battle playback yield identical logs and final state for a seed; reduced-motion default stays static; one player's unit preview cannot inspect another player's hidden assets/modifiers; comparison controls never imply an unsupported 3D view.
