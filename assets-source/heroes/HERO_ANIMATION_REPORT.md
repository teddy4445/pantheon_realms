> **Game copy.** Copied unchanged (below this note) from the Blender asset project
> `C:\Users\lazeb\Desktop\blannder_models` on 2026-10-01. In Pantheon Realms the
> runtime files live in `assets-runtime/heroes/<pantheon>/hero_<pantheon>.glb`, the
> path-updated manifest is `assets-runtime/heroes/animation_manifest.json` and the rig
> contract is `assets-runtime/heroes/shared/mounted_hero_animated_rig.json`. Links below
> to `source/`, `renders/` and `tools/` point into the Blender project, which the game
> does not need at runtime. Game-side integration: `ASSET_PIPELINE.md` §12.

# Mounted heroes — animation delivery

All six mounted heroes now have three baked skeletal animation clips. Import the animated GLBs from `runtime/models/heroes/animated/`; each contains its own model, skin, materials, and animations. The original neutral assets remain in their existing folders.

## Clips

| Exact game clip name | Duration | Blender frames at 30 fps | Playback | Behavior |
|---|---:|---|---|---|
| `Idle_Standing` | 4.0 s | 0–120 | Loop | Quiet mount breathing, small head, rider, tail, and cloak motion; hooves stay planted. |
| `Walk` | 1.6 s | 0–48 | Loop | Four-beat walk with synchronized rider motion and restrained secondary motion. |
| `Prepare_War` | 2.4 s | 0–72 | Play once, hold last pose | Anticipation, weapon/readiness gesture, and settle into a ready stance. |

Frames include both endpoints. The end pose duplicates the start pose for the two loops; use the stated duration, rather than adding another frame to the loop. These are 18 clips across six animated GLBs. All clips keep the root fixed. Motion is fully baked: the game needs ordinary skeletal animation and skinning, with no Blender constraints or procedural gait code.

## Import and use

1. Import the appropriate `hero_<pantheon>.glb` from the **animated** directory. Preserve the complete hierarchy, skins, vertex colors, and all three animation clips.
2. Enable looping for `Idle_Standing` and `Walk` in the game animation system. Disable looping for `Prepare_War` and enable its hold/clamp final pose setting. glTF animation tracks do not set your engine's loop flags or gameplay events automatically; read these settings from [animation_manifest.json](animation_manifest.json).
3. Start in `Idle_Standing`. Use a short crossfade (starting value: 0.2 seconds) between idle and walking. Drive the character's world position from game movement; these clips contain no root motion.
4. At original scale, the walk is authored for **0.75 metres per second** at playback rate 1.0. Set `walkPlaybackRate = movementSpeed / 0.75`. For a uniform asset scale `s`, use `movementSpeed / (0.75 * s)`. Match the speed and facing to reduce hoof sliding. Use idle when stopped; this set has no running gait.
5. Before battle, stop map movement, face the opponent, crossfade into `Prepare_War`, and play it once. Start the battle from the clip's completion event. Keep the final ready pose if battle setup takes longer. Cancel or ignore the completion callback if the encounter is cancelled, and blend back to idle.

Engine-neutral flow:

```text
Idle_Standing <---- speed / stop ----> Walk
       \                               /
        --- encounter accepted -------
                       |
               stop and face opponent
                       |
          Prepare_War (once, 2.4 seconds)
                       |
             animation finished event
                       |
                start battle once
```

Use the actual animation-finished event rather than a separate 2.4-second wall-clock timer, so pauses and playback-rate changes remain synchronized. This delivery supplies data and motion; the game must wire the controller and battle event.

Units are metres. Blender uses +Z up and -Y forward; the exported GLBs use +Y up and +Z forward. Leave the rig's scale at one and scale the outer game entity if required. The hoof bottoms have approximately 0.02 m clearance above the root ground plane; a -0.02 m vertical model offset aligns them exactly to flat terrain. Sloped ground adaptation is an engine-side task.

Optional walk footstep timestamps in each 1.6-second cycle: left hind 0.0 s, left front 0.4 s, right hind 0.8 s, right front 1.2 s. These are metadata for sound/effects; they are not embedded engine event callbacks.

## Readiness variations

| Hero | `Prepare_War` gesture |
|---|---|
| Greek | Lift the spear and bring the shield forward. |
| Norse | Lift and tip the axe forward with a shield adjustment. |
| Egyptian | Lift the khopesh while the horse and rider focus forward. |
| Japanese | Move the left hand toward the katana hilt while maintaining the rein posture. The katana stays sheathed. |
| Celtic | Raise the spear with a restrained seated readiness gesture. |
| Mesoamerican | Lift the macuahuitl and adjust the shield. |

These are short adventure-map readiness gestures. They contain no strikes, sword draw, rearing, or combat locomotion. The repeated six-hero preview GIF includes a viewing pause and repeats for review; the exported `Prepare_War` clip itself is intended to play once.

## Editable sources

- [Combined animated library](source/blender/heroes/animated/mounted_heroes_animated_library.blend): six scenes, one per pantheon.
- Individual animated `.blend` files beside the combined library.
- [Animated rig contract](assets/characters/heroes/shared/mounted_hero_animated_rig.json): shared 44-bone hierarchy and rest coordinates.
- [Animation manifest](animation_manifest.json): file paths, checksums, timing, loop flags, speed, and event metadata.
- `tools/animate_heroes.py`: repeatable authoring and GLB export helpers.
- `tools/validate_hero_animation.py`: baked-pose and GLB reimport checks.

In Blender, choose the hero scene, select its `RIG_Hero_<Pantheon>` armature, and select an Action in the Action Editor. Source Action names have a pantheon prefix, for example `Greek__Walk`. NLA track names and exported game clip names are exactly those in the table. The three NLA tracks are intentionally muted export containers so they do not layer simultaneously. Sources open at frame 0 with `Idle_Standing` active. To inspect the bind/rest shape, use the armature's Rest Position setting; switch back to Pose Position to play animation.

## Verification and limits

All six animated GLBs were reimported into fresh Blender scenes. Checks confirmed the exact clip names and durations, 44 bones, 9–10 skinned meshes, finite animation values, a stationary root, and matching endpoints for the loops. Five poses per clip were compared after reimport; the maximum joint-position difference was below 0.000003 m. The authoring checks sampled every frame for connected limb joints and hoof contact heights, and sampled deformed meshes for finite coordinates. Per-hero results are in `assets/characters/heroes/<pantheon>/animation_validation.json`.

Previews show side-view walking plus isometric walking/readiness poses. These are simplified stylized map assets with layered equipment. No collision, cloth simulation, facial animation, or engine-specific controller is included. The files have not been tested in your game's importer or runtime; the integration check there should confirm material vertex colors, axis orientation, loop flags, playback speed, and the battle completion event.

The earlier `HERO_ASSET_REPORT.md`, `asset_manifest.json`, and original delivery ZIP describe the neutral asset snapshot. Use this report, `animation_manifest.json`, and `mounted_heroes_animated_delivery.zip` for the animated release.

![Six readiness animations](renders/animations/prepare_war_all_heroes.gif)

![Walk preview](renders/animations/greek_walk.gif)
