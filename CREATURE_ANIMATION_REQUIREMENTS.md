# Pantheon Realms - Creature Animation Requirements

**Date:** 2026-09-29  
**Updated:** 2026-10-03 — rewritten for the 2D presentation migration (owner directive, *2D Presentation Migration Directive*): creature motion is delivered as 2D animation strips drawn by PixiJS. Gameplay semantics, the roster and the upgrade rule are unchanged.  
**Status:** Proposed production checklist. Preserves the existing independent-rules/presentation boundary and the approved base-plus-one-upgrade requirement.  
**Purpose:** Specify which animation strips to commission, which states can reuse a strip, and which effects are not creature animation strips.

## 1. Scope and authority

The working full-game scope is six factions with seven core creature families per faction. Each family has one base form and exactly one upgraded form: 42 families and 84 creature appearances. These counts describe the requested core roster, not completed assets. (The sprite manifest currently lists 102 forms because it also covers the neutral families.)

Prepare one motion design per family wherever anatomy and equipment permit: the base form's strips first, then the upgraded form's strips generated from them frame for frame. Both forms must independently pass the import and in-game checks. Sharing a motion design does not make an upgraded strip correct automatically; every frame must show the upgrade's own equipment.

This checklist does not replace creature statistics, weapons, abilities, tier assignments, recruitment rules, or the campaign. Recent roster and building concept boards disagree with portions of the v0.3 written catalog. Resolve each family's approved IDs, weapon, movement type, and abilities before commissioning its final strip set. A bow, fiery mouth, wing, or glowing ornament in concept art does not itself authorize a gameplay action.

Treat the existing v0.3 production documents as the provenance for shared motion names, playback separation, static fallbacks, and pair-level production. New polish options below are proposals. This addendum does not claim that final strips exist: until GPT-6 deliveries from the production queue (`GPT6_2D_CONTENT_GENERATION.md`) are imported with `npm run sprites:import`, labelled placeholders stand in.

## 2. Seven core animation strips

Every ordinary ground creature with a melee action needs these seven strips. Flying and unusual movement profiles substitute or extend locomotion as described below. Every strip is one horizontal row of equal frames, authored facing right (the renderer mirrors the other side), with the feet on the baseline at 90 % of the frame height.

| Semantic state | Strip name | Loop policy | Purpose / constraint |
| --- | --- | --- | --- |
| Idle | `idle` | Loop | Breathing, weight shift, quiet feather/tail motion. Keep the selection area readable. |
| Move | `move` | Loop | A complete walk, trot, crawl, slither, or other approved ground gait. Draw in place; the renderer moves the figure along the legal path. |
| Melee | `attack` | Once | Anticipation, contact, and recovery in one strip. Also supplies the initial retaliation animation. |
| Defend | `defend` | Once, then return to idle | Distinct bracing posture. Does not imply immunity, a miss, or a separate blocking mechanic. |
| Hit | `hit` | Once | Short reaction to an already-resolved damaging hit. Does not grant stun, displacement, or an extra action. |
| Defeat | `death` | Once, last frame held | Full-stack defeat. Fall, crumble, or dissipate as appropriate. Never loop. A missing death strip is presented by laying the figure down. |
| Victory | `victory` | Loop, skippable | Brief optional-to-play end-of-battle flourish. Required in the polished production set; skippable during play. |

A minimal development placeholder may temporarily lack polish, but a finished family must deliver its declared required strips for both forms. A creature explicitly unable to perform melee needs a reviewed exception; do not display an attack button just because an animation exists.

### States that do not need additional unique strips initially

| Runtime state / interaction | Initial implementation |
| --- | --- |
| Selection / ready | Outline, floor marker, sound, and existing idle. Add a selection strip later only if it improves character. |
| Turning | Mirror the figure horizontally (every battle strip faces right). Battle creatures need no directional strips; eight directions exist only for mounted map hero avatars. A turn cannot change a two-cell footprint illegally. |
| Wait | Ordinary idle with a visible queue/status marker. Do not portray waiting as sleeping or stunned. |
| Retaliation | Reuse `attack`, triggered by the separate retaliation result event. No return charge or long travel animation. |
| Dead / removed | Hold the last `death` frame or hide the figure according to the corpse policy. No animated corpse loop required. |
| Getting healed / buffed | Shared effect and status indicator over the appropriate pose. No mandatory unique strip per buff. |
| Upgrade training | Shared transition effect and a sprite-set/form swap after the upgrade command succeeds. Not a unique transformation strip for every family. |

## 3. Role-specific additions

### 3.1 Ranged creatures

Add `shoot`. Keep `attack` when the creature can fight at close range or retaliate. The shooting strip has three phases: prepare/aim, release, and recover. A missing `shoot` strip falls back to `attack`, then `idle`.

Examples: a bow draws/releases an arrow; a javelin thrower throws one javelin; a Cyclops winds up and throws one boulder. Use the weapon in the approved definition, not a weapon inferred from an illustrative sheet.

The projectile is a separate presentation object: a sprite from the manifest's `projectiles` section that leaves the figure at a presentation release point. The rules own ammunition, legality, damage, and target selection. A cosmetic replacement arrow/rock drawn in the hand does not replenish ammunition. A multi-projectile flourish must not imply multiple damaging attacks unless that is the actual rule.

Reload and aim-idle strips are not part of the animation vocabulary; they would be a later proposal, not default gameplay phases. Stationary shooting remains stationary unless an explicit rule permits movement and shooting together.

### 3.2 Flying creatures

Default production policy: fliers stand or perch between actions and take off for travel. This keeps ground hit, defend, idle, and death strips reusable.

Required flyer set:

```text
idle
move
takeoff
fly
landing
attack
defend
hit
death
victory
```

That is ten strips for a grounded-idle melee flier. `move` covers short authorized repositioning rather than granting an extra movement mode to the rules. `fly` is the in-place traversal loop. Flight height is controlled by presentation over the legal path; landing uses the approved full footprint. Missing `takeoff`, `fly` or `landing` strips fall back to `move`, then `idle`.

Sequence: Idle -> Takeoff -> Fly loop -> Landing -> Idle or Attack. Attack actions can have a shorter local hop without needing an extra ability. Flight is not invulnerability or free travel.

A permanently airborne species would need airborne idle, hit and death treatment; those are not in the current vocabulary and would be a recorded extension. Do not commission them for every flier when the grounded-idle policy is adequate. Wing sounds, dust on landing, and air trails are separate effects.

### 3.3 Active abilities and casters

Add one `ability` strip for a form whose active ability needs visible performance. The vocabulary has one `ability` strip per form; several abilities can reuse a compatible gesture and differ through effects, and a new spell name does not automatically require a new strip. `cast` is reserved for heroes: creatures do not cast.

A support ward uses `ability`; a breath gesture belongs only to a creature whose breath is actually defined. A passive trait such as extra retaliation, morale protection, or resistance does not need a new active animation/button. A missing `ability` strip falls back to `attack`, then `idle`.

Charge, channel, release, and recovery can be phases of one strip. Separate start/loop/end channel strips are a later extension, only when the implemented interaction actually requires variable-duration channeling.

### 3.4 Mounted, large, multi-legged, and multi-headed bodies

| Body profile | Additional checks / optional strips |
| --- | --- |
| Rider and mount | Synchronize hoof contacts, saddle contact, reins and weapon across frames. Include a stationary melee response. Add a charge finish only for a real charge action; distance bonus comes from rules, never from the drawn movement. Two-hex frames (768 x 512 delivery). |
| Centaur | Draw an equine gait with a balanced humanoid torso. Do not draw a human walk on four legs. Weapon role must be settled before melee or ranged strips are generated. |
| Giant / colossus | Convey weight through anticipation, planted feet, impact sound and measured recovery, not excessively long strips. Heavy-hit or crumble variants are optional. |
| Spider-like creature | Check the approved limb count and stepping order, torso stability and foot contact in every frame. A web cast requires a real web ability. |
| Serpent / aquatic creature | Use a coherent slither/crawl/float appearance matching its approved battlefield locomotion. Do not add swimming or water-only movement implicitly. |
| Multi-headed creature | Give each head sensible idle motion; bind attacks to the resolved action. Multiple moving heads are not automatically multiple hits or an area attack. |
| Spirit / undead / construct | Substitute fitting motion and death treatment for breathing or biological collapse. Fades and particles are effects drawn separately from the strip. |

## 4. Status effects, revival, and cosmetic overlays

These are conditional on real mechanics. Do not commission effects for systems absent from the build as though they already exist.

| Event / state | Preferred production treatment |
| --- | --- |
| Poison / burning | Reusable effect strip or tint over the figure plus explicit status icon. A short hit reaction may be reused when tick damage is presented. |
| Buff / curse | Shared visual vocabulary and icon with a bounded, non-obscuring effect. No all-unit permanent flashing. |
| Stun / sleep / fear | A held frame or optional species-specific loop only if that condition is implemented. Its appearance does not invent lost turns. |
| Petrification / freeze | Tint/held-frame treatment and status icon when supported. Do not imply movement blocking that the rules lack. |
| Summon / apparition | Shared spawn effect plus an optional spawn strip (a vocabulary extension) for genuinely summoned entities. Opening the bestiary is not a summon. |
| Resurrection | Optional revive strip (a vocabulary extension) where a real resurrection event exists. Do not simply play death strips backward, especially rubble or dissipation. |
| Upgrade | A shared brief transition; change to the new form only after the transaction. Never imply a third promotion. |

Avoid dedicated dodge, parry, full block, knockback, knockdown, dismemberment, and free-form ragdoll systems unless their behavior is separately approved. A defend reaction may show an impact absorbed by armor while still taking the resolved damage.

## 5. Base and upgrade production

Approve both forms together. Use one canonical reference view per form (`assets-source/creatures/reference/`), the same frame size, anchor, baseline and animation names, and compatible body proportions. Generate each upgraded strip with the base strip attached, keeping every frame's pose, timing, camera, scale and baseline, and draw the upgrade's armor, helmets, feathers, cloth, and ornaments in every frame; then check every strip of both forms.

A valid paired delivery includes separate appearances, portraits and correct base/upgrade data bindings. Motion reuse is expected where practical; recolor alone is not sufficient visual differentiation. New tails, appendages, weapons or proportions can increase animation work even within a single family, so settle those choices before generating strips.

An upgraded form can share all core motions and add one appropriate flourish or an actual new-ability strip. It need not have a completely different walk/attack set. An upgraded unit cannot omit death or attack support simply because only the base was animated.

## 6. Example commission packets

### Ordinary ground melee pair

Seven core strips: Idle, Move, Attack, Defend, Hit, Death, Victory.

Possible polish after integration: a second idle, a short selection response, or one attack variation. Commission only the options that visibly improve the unit at gameplay zoom.

### Ordinary ranged pair

Seven core strips plus Shoot: eight core strips. Projectiles, release sounds, hit flashes and ammunition display are separate assets/systems.

### Griffin or Pegasus pair with grounded idle

The ten-strip flight set above. Griffin attack might be a talon/beak strike; Pegasus might use a kick or rear-and-strike. Do not share species-inappropriate attacks merely because both have wings. Optional alternate retaliation must remain a normal legal response.

### Ranged giant pair

Seven core strips plus Shoot: eight core strips. Optional heavy hit and heavier attack variant. A shot at a structure, if sieges are supported, reuses the throwing strip; its actual target is resolved separately.

### Creature with an active support ability

Seven core strips plus Shoot if ranged, plus the declared `ability` gesture. Typical initial result: eight or nine strips, depending on role. A large spell library can still use a small set of carefully chosen compatible gestures.

These packet counts are illustrative strip budgets, not an estimate of hours or a claim that all seven tiers have the same animation complexity.

## 7. Timing, camera, and playback proposals

Retain the v0.3 starting art-timing targets until measured in a real battle:

| Animation type | Proposed nominal duration |
| --- | --- |
| Idle | 2-4 seconds, seamless loop |
| Locomotion | 0.7-1.3 seconds per gait cycle, repeat to match path |
| Attack / Shoot | 0.8-1.4 seconds including anticipation and recovery |
| Hit | 0.2-0.45 seconds |
| Death | 1-1.8 seconds |
| Victory | 1.5-2.5 seconds, skippable |

These are visual pacing targets, not world days, combat rounds, cooldowns, or simulation ticks. Heavy creatures may need exceptions. Long travel repeats a gait; it does not require a separately drawn animation for each path length. The production queue draws each creature form as one sheet (one row per animation, six cells per row), and its frame counts and frame rates are chosen to land inside these targets: idle 6 frames at 3 fps (2 s), move 6 at 8 fps (0.75 s), attack and shoot 6 at 6 fps (1 s), defend 3 at 8 fps, hit 3 at 10 fps (0.3 s), death 6 at 5 fps (1.2 s), victory 6 at 4 fps (1.5 s), takeoff and landing 3 at 8 fps, fly 6 at 10 fps. The sidecar JSON the cutter writes next to each strip carries these; it may be edited to override frame rate, loop policy or anchor. Measure the delivered result against these targets before final approval.

Provide battle playback at 1x, 2x and Instant. Bestiary controls: choose animation, Play/Pause, Stop, Restart, 0.5x/1x/2x, and switch base/upgrade; there is no rotation control. Default to a usable still frame when reduced motion is enabled. User-requested playback can run once with a visible Stop control. Never autoplay a death sequence.

Creature battles are 2D under the approved stack: animated sprite strips on the logical hex board over a painted battlefield, seen from one fixed elevated camera (about 20 degrees above the horizon) with pan and zoom only. Battle creatures need one facing (right), mirrored by the renderer; eight-direction strips are required only for the mounted map hero avatars (idle and walk).

## 8. Runtime ownership and sequence

The rules resolve an action once, including costs, RNG, positions, retaliation, damage, casualties and resulting revision. Presentation consumes the ordered result events. It does not calculate damage from a sprite overlap or projectile arrival.

Example presentation:

```text
Resolved action received
-> Face target (mirror if needed) without changing logical occupied cells
-> Play legal movement when present
-> Play attack anticipation
-> Play contact/release cue, sound and effect
-> Present target hit OR death from the resolved outcome
-> Present a separately resolved retaliation when eligible
-> Return surviving figures to appropriate idle/defend state
```

A single attack strip normally contains anticipation/contact/recovery. Presentation cues (impact, shot) refer only to visual and sound synchronization. Never pay resources, consume ammunition, change HP, or grant rewards from an animation callback.

Instant playback reaches the same rules state as full playback: loops run on the frame clock and one-shots on the tween clock, so skip/instant playback finishes them at once. Deduplicate event IDs; skip or cancel stale visual cues safely. Visual effects, idle variation and animation phase offsets use cosmetic randomness, not the gameplay stream.

### Stack-specific behavior

A stack represents many creatures but is drawn as one animated figure with its exact count label. Losing three of twenty soldiers does not mean the whole stack plays its terminal death strip. Show a hit presentation while survivors remain active. Full-stack removal uses the death state when the final creature is gone.

If a later formation draws several representative figures per stack, they are not independent damage events. Keep numbers, turn order and target selection visible during flourishes. Held death frames and decorative wings do not acquire their own gameplay picking or collision rules.

## 9. Import and acceptance checklist

Required asset records: family ID, exact form ID, sprite set ID, strip files, supported semantic states, frame count and frame size, frame rate, loop/hold policy, anchor, facing, scale (pixels per hex), optional presentation cues, static portrait, generation and import tool versions, provenance, and `placeholder`/`final` status.

Check in both the battle view and the S18 viewer:

- All declared strips exist with the expected names, frame grid, frame rate and loop policy; `npm run sprites:import` accepts them (transparency, frame grid, size).
- Foot/hoof/talon baseline stays stable across frames; no sliding, floating saddle, detached weapon or collapsing joints.
- Base and upgraded armor, horns, wings, tails and cloth remain consistent in every frame of every strip.
- Hit is distinguishable from Death; Defend is distinguishable from Idle and Attack.
- Two-cell shapes mirror and land only where legal; art does not change reach or occupy extra cells; nothing touches the frame edge.
- Projectiles leave from the release point and disappear correctly; a second flourish cannot apply another hit.
- Hit and death presentation never removes a surviving stack.
- 1x, 2x, Instant, skipped animation and viewer playback preserve the same authoritative outcome/state hash for the same command history.
- Previewing, switching forms, opening a town or closing the viewer never consumes gameplay RNG or resources.
- Reduced motion (still frame), missing optional strips (fallback chain), interrupted loads, rapid unit switches and view cleanup remain usable.
- Both forms have been inspected in the actual runtime; the importer's checks alone cannot establish good motion or art quality.

## 10. Related scope

Gods currently define blessings and benefits, rather than deployable creature stacks. Their portraits may have optional ambient motion, but they do not need the creature locomotion/combat suite. Hero commander battle presentation and adventure-map movement are separate briefs (the mounted map avatars: idle and walk, up to eight directions); do not create hero melee mechanics just to justify an animation.

Building sprites likewise do not need creature motions. Optional flags, smoke, water, forge glow or temple light belong in a separate town-effects inventory.

## Source documents consulted

Existing project sources, not new claims of implemented assets:

1. Pantheon Realms v0.3 `production/03_creature_pairs_and_animation_bible.md`: shared seven-strip ground set, flyer additions, weapon/ability alignment, family anatomy, paired delivery.
2. Pantheon Realms v0.3 `production/02_visual_and_animation_pipeline.md`: in-place movement, timing proposals, runtime import and preview checks, immutable-event playback, static fallbacks, stack presentation.
3. Pantheon Realms v0.3 `content/03_exactly_one_upgrade_contract.md`: exactly one upgrade, shared motion design, visible form differences, no missing counterpart animations.
4. Later owner directions in this conversation: six pantheons, seven core creature tiers, increased deity choice, and town backgrounds with separate building artwork.
5. The owner's *2D Presentation Migration Directive* (2026-10-03) and the production queue `GPT6_2D_CONTENT_GENERATION.md`: strip vocabulary, frame sizes, anchors, facing and delivery.

The exact roster and building names must be reconciled separately; this file deliberately specifies animation profiles without silently selecting between contradictory concept-board rosters.
