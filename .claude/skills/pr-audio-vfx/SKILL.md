---
name: pr-audio-vfx
description: "Implement or review Pantheon Realms audio direction, music transitions, ambience, interface sounds, combat cues, creature preview sounds and visual effects. Use for Web Audio integration in packages/audio, PixiJS 2D effect strips and projectiles, mute/volume behavior, missing assets and animation speed/skip behavior. Keep effects purely presentational and all required runtime audio local."
---

# Audio and Visual Effects

Read [project-contract.md](references/project-contract.md) and `production/04_environment_towns_ui_and_audio.md`, the animation behavior contract, and current settings requirements.

## Workflow

1. Build a cue sheet keyed by committed presentation events and screen transitions. Define source asset, bus, spatial mode, duration, priority, concurrency and cleanup.
2. Separate music, ambience, combat, UI and optional voice buses. Implement transitions, crossfades, ducking and user settings consistently.
3. Map action cues to presentation time, not authoritative callbacks. Skipping effects must not skip damage, rewards, quest progression or saved state.
4. Pool short effects and bound simultaneous voices/particles. Cancel old scene/viewer sounds on navigation. Suspend/unlock audio gracefully; failure to initialize sound cannot stop play.
5. Package audio, fonts, effect strips, any audio decoders and source provenance locally. Do not use an online speech or music generation service as a runtime dependency.
6. Test muted launch, zero volume, reduced motion, rapid unit switching, repeated scenes, fast/instant combat and focus changes.

Visual effects are 2D: `effects` and `projectiles` entries in `assets-runtime/sprites/manifest.json` (centred anchors, optional additive blending), played by `packages/presentation` on the tween clock so skip/instant finishes them at once. Final effect strips come through the production queue (`GPT6_2D_CONTENT_GENERATION.md`, group H) and `npm run sprites:import`; placeholders stay labelled `placeholder`. A source image is not proof of offline playback. Creating new music with an external provider requires explicit service/cost/rights review; this skill does not authorize purchases or voice cloning.

## Creature and spell clarity

Differentiate Peltast javelins, Cyclops rocks and Adept bolts without changing their rules. Ward is a brief target effect, not a permanent area shield. Keep particles from hiding hex selection, stack labels and available actions. An upgraded appearance should read even when effects are disabled.

Output cue manifest, source/license notes, integration changes, mix/settings checks, render/audio measurements and outstanding art or composition work. Clearly distinguish generated source material from actually integrated and tested assets.
