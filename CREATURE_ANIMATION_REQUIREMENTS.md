# Pantheon Realms - Creature Animation Requirements

**Date:** 2026-09-29  
**Status:** Proposed production checklist. Preserves the existing independent-rules/presentation boundary and the approved base-plus-one-upgrade requirement.  
**Purpose:** Specify which motion assets to commission, which states can reuse motion, and which effects are not creature animation clips.

## 1. Scope and authority

The working full-game scope is six factions with seven core creature families per faction. Each family has one base form and exactly one upgraded form: 42 families and 84 creature appearances. These counts describe the requested core roster, not completed assets.

Prepare one compatible source animation library per family wherever anatomy and equipment permit. Both forms must independently pass runtime checks. Reusing motion does not make an upgraded mesh automatically animation-ready.

This checklist does not replace creature statistics, weapons, abilities, tier assignments, recruitment rules, or the campaign. Recent roster and building concept boards disagree with portions of the v0.3 written catalog. Resolve each family's approved IDs, weapon, movement type, and abilities before commissioning its final motion set. A bow, fiery mouth, wing, or glowing ornament in concept art does not itself authorize a gameplay action.

Treat the existing v0.3 production documents as the provenance for shared motion names, playback separation, static fallbacks, and pair-level production. New polish options below are proposals. This addendum does not claim that those earlier documents have been rewritten or that a production rig exists.

## 2. Seven core authored clips

Every ordinary ground creature with a melee action needs these seven clips. Flying and unusual movement profiles substitute or extend locomotion as described below.

| Semantic state | Suggested source clip | Loop policy | Purpose / constraint |
| --- | --- | --- | --- |
| Idle | `idle_a` | Loop | Breathing, weight shift, quiet feather/tail motion. Keep the selection area readable. |
| Move | `move_walk` | Loop | A complete walk, trot, crawl, slither, or other approved ground gait. Author in place. The semantic Move alias may point to a differently named gait. |
| Melee | `attack_melee_a` | Once | Anticipation, contact, and recovery in one clip. Also supplies the initial retaliation animation. |
| Defend | `guard` | Loop or held pose, declared explicitly | Distinct bracing posture. Does not imply immunity, a miss, or a separate blocking mechanic. |
| Hit | `hit_a` | Once | Short reaction to an already-resolved damaging hit. Does not grant stun, displacement, or an extra action. |
| Defeat | `defeat` | Once, then hold/hide | Full-stack defeat or an approved representative casualty. Fall, crumble, or dissipate as appropriate. Never loop. |
| Victory | `victory` | Once | Brief optional-to-play end-of-battle flourish. Required in the polished production set; skippable during play. |

A minimal development placeholder may temporarily lack polish, but a finished family must deliver its declared required clips for both forms. A creature explicitly unable to perform melee needs a reviewed exception; do not display an attack button just because an animation exists.

### States that do not need additional unique clips initially

| Runtime state / interaction | Initial implementation |
| --- | --- |
| Selection / ready | Outline, floor marker, sound, and existing idle. Add `select` later if it improves character. |
| Turning | Rotate the presentation root with a short transition; add `turn_left` and `turn_right` when planted feet or long bodies make sliding conspicuous. A turn cannot change a two-cell footprint illegally. |
| Wait | Ordinary idle with a visible queue/status marker. Do not portray waiting as sleeping or stunned. |
| Retaliation | Reuse `attack_melee_a`, triggered by the separate retaliation result event. No return charge or long travel animation. |
| Dead / removed | Hold the last defeat pose or hide the actor according to the corpse policy. No animated corpse loop required. |
| Getting healed / buffed | Shared effect and status indicator over the appropriate pose. No mandatory unique clip per buff. |
| Upgrade training | Shared transition effect and a model/form swap after the upgrade command succeeds. Not a unique skeletal transformation for every family. |

## 3. Role-specific additions

### 3.1 Ranged creatures

Add `attack_shoot`. Keep `attack_melee_a` when the creature can fight at close range or retaliate. The shooting animation has three authored phases within one clip: prepare/aim, release, and recover.

Examples: a bow draws/releases an arrow; a javelin thrower throws one javelin; a Cyclops winds up and throws one boulder. Use the weapon in the approved definition, not a weapon inferred from an illustrative sheet.

The projectile is a separate presentation object. Register its origin socket and release cue in the asset manifest. The rules own ammunition, legality, damage, and target selection. A cosmetic replacement arrow/rock in the model's hand does not replenish ammunition. A multi-projectile flourish must not imply multiple damaging attacks unless that is the actual rule.

`reload` and `aim_idle` are optional additional clips, not default gameplay phases. Stationary shooting remains stationary unless an explicit rule permits movement and shooting together.

### 3.2 Flying creatures

Default production policy: fliers stand or perch between actions and take off for travel. This keeps ground hit, guard, idle, and defeat animations reusable.

Required flyer set:

```text
idle_a
move_ground
takeoff
move_fly
land
attack_melee_a
guard
hit_a
defeat
victory
```

That is ten source clips for a grounded-idle melee flier. `move_ground` covers short authorized repositioning rather than granting an extra movement mode to the rules. `move_fly` is the in-place traversal loop. Flight height is controlled by presentation over the legal path; landing uses the approved full footprint.

Sequence: Idle -> Takeoff -> Fly loop -> Land -> Idle or Melee. Attack actions can have a shorter local hop without needing an extra ability. Flight is not invulnerability or free travel.

A permanently airborne species needs additional `idle_fly`, `hit_fly`, and `defeat_fly` treatment as appropriate. Do not commission those for every flier when the grounded-idle policy is adequate. Wing sounds, dust on landing, and air trails are separate effects.

### 3.3 Active abilities and casters

Add one semantic `ability_<id>` mapping for each mechanically distinct active ability that needs visible performance. Several abilities can reuse a compatible casting gesture and differ through effects; a new spell name does not automatically require a new skeleton clip.

A support ward can use `ability_ward`; breath can use `ability_breath` only where breath is actually defined. A passive trait such as extra retaliation, morale protection, or resistance does not need a new active animation/button.

Charge, channel, release, and recovery can be phases of one clip. Add separate start/loop/end channel clips only when the implemented interaction actually requires variable-duration channeling.

### 3.4 Mounted, large, multi-legged, and multi-headed bodies

| Body profile | Additional checks / optional clips |
| --- | --- |
| Rider and mount | Synchronize hoof contacts, saddle contact, reins and weapon. Include a stationary melee response. Add a charge finish only for a real charge action; distance bonus comes from rules, never root motion. |
| Centaur | Validate equine gait plus balanced humanoid torso. Do not retarget a human walk to four legs. Weapon role must be settled before melee or ranged clips are authored. |
| Giant / colossus | Convey weight through anticipation, planted feet, impact sound and measured recovery, not excessively long turns. Heavy-hit or crumble variants are optional. |
| Spider-like creature | Check the approved limb count and stepping order, torso stability and foot contact. A web cast requires a real web ability. |
| Serpent / aquatic creature | Use a coherent slither/crawl/float appearance matching its approved battlefield locomotion. Do not add swimming or water-only movement implicitly. |
| Multi-headed creature | Give each head sensible idle motion; bind attacks to the resolved action. Multiple moving heads are not automatically multiple hits or an area attack. |
| Spirit / undead / construct | Substitute fitting motion and defeat treatment for breathing or biological collapse. Material fade and particles are separate from the skeleton. |

## 4. Status effects, revival, and cosmetic overlays

These are conditional on real mechanics. Do not commission effects for systems absent from the build as though they already exist.

| Event / state | Preferred production treatment |
| --- | --- |
| Poison / burning | Reusable attached particle/material effect plus explicit status icon. A short hit reaction may be reused when tick damage is presented. |
| Buff / curse | Shared visual vocabulary and icon with a bounded, non-obscuring effect. No all-unit permanent flashing. |
| Stun / sleep / fear | A held pose or optional species-specific loop only if that condition is implemented. Its appearance does not invent lost turns. |
| Petrification / freeze | Material/pose treatment and status icon when supported. Do not imply movement blocking that the rules lack. |
| Summon / apparition | Shared spawn effect plus optional `spawn` performance for genuinely summoned entities. Opening the bestiary is not a summon. |
| Resurrection | Optional `revive` where a real resurrection event exists. Do not simply play all death clips backward, especially rubble or dissipation. |
| Upgrade | A shared brief transition; change to the new form only after the transaction. Never imply a third promotion. |

Avoid dedicated dodge, parry, full block, knockback, knockdown, dismemberment, and free-form ragdoll systems unless their behavior is separately approved. A guard reaction may show an impact absorbed by armor while still taking the resolved damage.

## 5. Base and upgrade production

Approve both forms together. Prefer shared bone names, bind pose, origin, sockets and compatible body proportions. Attach or skin upgrade armor, helmets, feathers, cloth, and ornaments to that rig, then check every clip on both meshes.

A valid paired delivery includes separate appearances, portraits and correct base/upgrade data bindings. Motion reuse is expected where practical; recolor alone is not sufficient visual differentiation. New tails, appendages, weapons or proportions can increase animation work even within a single family, so settle those choices before rigging.

An upgraded form can share all core motions and add one appropriate flourish or an actual new-ability animation. It need not have a completely different walk/attack library. An upgraded unit cannot omit defeat or melee support simply because only the base was animated.

## 6. Example commission packets

### Ordinary ground melee pair

Seven core clips: Idle, Move, Melee, Guard, Hit, Defeat, Victory.

Possible polish after integration: a second idle, a short selection response, left/right turn transitions, or one attack variation. Commission only the options that visibly improve the unit at gameplay zoom.

### Ordinary ranged pair

Seven core clips plus Shoot: eight core clips. Projectiles, release sounds, hit flashes and ammunition display are separate assets/systems.

### Griffin or Pegasus pair with grounded idle

The ten-clip flight set above. Griffin attack might be a talon/beak strike; Pegasus might use a kick or rear-and-strike. Do not share species-inappropriate attacks merely because both have wings. Optional alternate retaliation must remain a normal legal response.

### Ranged giant pair

Seven core clips plus Shoot: eight core clips. Optional heavy hit, heavier attack variant, and structure-targeted shot alias if sieges are supported. A wall-breaking shot can share the throwing motion; its actual target is resolved separately.

### Creature with an active support ability

Seven core clips plus Shoot if ranged, plus the declared active-ability gesture. Typical initial result: eight or nine clips, depending on role. A large spell library can still use a small set of carefully chosen compatible gestures.

These packet counts are illustrative source-clip budgets, not an estimate of hours or a claim that all seven tiers have the same animation complexity.

## 7. Timing, camera, and playback proposals

Retain the v0.3 starting art-timing targets until measured in a real battle:

| Clip type | Proposed nominal duration |
| --- | --- |
| Idle | 2-4 seconds, seamless loop |
| Locomotion | 0.7-1.3 seconds per gait cycle, repeat to match path |
| Melee / Shoot | 0.8-1.4 seconds including anticipation and recovery |
| Hit | 0.2-0.45 seconds |
| Defeat | 1-1.8 seconds |
| Victory | 1.5-2.5 seconds, skippable |

These are visual pacing targets, not world days, combat rounds, cooldowns, or simulation ticks. Heavy creatures may need exceptions. Long travel repeats a gait; it does not require a separately authored animation for each path length.

Provide battle playback at 1x, 2x and Instant. Bestiary controls: choose clip, Play/Pause, Stop, Restart, 0.5x/1x/2x, inspect base/upgrade, and camera orbit where the actual asset supports it. Default to a usable still when reduced motion is enabled. User-requested playback can run once with a visible Stop control. Never autoplay a death sequence.

Creature battles remain 3D under the approved stack even when towns use layered backgrounds and building sprites. Author a rigged model and rotation-capable motion library, rather than requiring eight directional sprite sheets for the default battle implementation. Any later 2D unit fallback is a separate production decision.

## 8. Runtime ownership and sequence

The rules resolve an action once, including costs, RNG, positions, retaliation, damage, casualties and resulting revision. Presentation consumes the ordered result events. It does not calculate damage from a weapon collider or projectile impact.

Example presentation:

```text
Resolved action received
-> Face target without changing logical occupied cells
-> Play legal movement when present
-> Play attack anticipation
-> Play contact/release cue, sound and effect
-> Present target hit OR defeat from the resolved outcome
-> Present a separately resolved retaliation when eligible
-> Return surviving actors to appropriate idle/guard state
```

A single attack clip normally contains anticipation/contact/recovery. Cues such as `impactAt` refer only to visual synchronization. Never pay resources, consume ammunition, change HP, or grant rewards from an animation callback.

Instant playback reaches the same rules state as full playback. Deduplicate event IDs; skip or cancel stale visual cues safely. Visual effects, idle variation and animation phase offsets use cosmetic randomness, not the gameplay stream.

### Stack-specific behavior

A stack represents many creatures but may display only a few actors. Losing three of twenty soldiers does not mean the whole stack plays its terminal defeat. Show a bounded casualty or hit presentation while survivors remain active. Full-stack removal uses the defeat state when the final creature is gone.

Conversely, three representative soldier models are not three independent damage events. Keep numbers, turn order and target selection visible during flourishes. Dead meshes and decorative wings do not acquire their own gameplay collision rules.

## 9. Export and acceptance checklist

Required asset records: family ID, exact form ID, rig ID, model path, supported semantic states, exported clip names, loop/hold policy, duration, optional presentation cues, sockets, origin/scale, static portrait, source/export versions, provenance, and verification status.

Check in both the battle camera and close-up viewer:

- All declared clips exist with the expected names, duration and loop policy.
- Foot/hoof/talon contact is credible; no sliding, floating saddle, detached weapon or collapsing joints.
- Base and upgraded armor, horns, wings, tails and cloth remain compatible with each motion.
- Hit is distinguishable from Defeat; Guard is distinguishable from Idle and Attack.
- Two-cell shapes turn and land only where legal; art does not change reach or occupy extra cells.
- Projectiles originate from the right socket and disappear correctly; a second flourish cannot apply another hit.
- Representative casualties do not destroy surviving stacks.
- 1x, 2x, Instant, skipped animation and viewer playback preserve the same authoritative outcome/state hash for the same command history.
- Previewing, switching forms, opening a town or closing the viewer never consumes gameplay RNG or resources.
- Reduced motion, missing optional clips, interrupted loads, rapid unit switches and scene cleanup remain usable.
- Both forms have been inspected in the actual runtime; an export validator alone cannot establish good deformation or art quality.

## 10. Related scope

Gods currently define blessings and benefits, rather than deployable creature stacks. Their portraits may have optional ambient motion, but they do not need the creature locomotion/combat suite. Hero commander battle presentation and adventure-map movement are separate briefs; do not create hero melee mechanics just to justify an animation.

Building sprites likewise do not need creature motions. Optional flags, smoke, water, forge glow or temple light belong in a separate town-effects inventory.

## Source documents consulted

Existing project sources, not new claims of implemented assets:

1. Pantheon Realms v0.3 `production/03_creature_pairs_and_animation_bible.md`: shared seven-clip ground set, flyer additions, weapon/ability alignment, family anatomy, paired delivery.
2. Pantheon Realms v0.3 `production/02_visual_and_animation_pipeline.md`: in-place movement, timing proposals, runtime export and preview checks, immutable-event playback, static fallbacks, stack presentation.
3. Pantheon Realms v0.3 `content/03_exactly_one_upgrade_contract.md`: exactly one upgrade, compatible rigs, visible form differences, no missing counterpart animations.
4. Later owner directions in this conversation: six pantheons, seven core creature tiers, increased deity choice, and town backgrounds with separate building artwork.

The exact roster and building names must be reconciled separately; this file deliberately specifies animation profiles without silently selecting between contradictory concept-board rosters.
