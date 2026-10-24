# @pr/audio

Loads bundled sound and manages the Web Audio mix: separate buses, music/ambience transitions, stingers, voice limits and the calmer-sound policy. The UI decides which game event maps to which sound.

## Read the code

| Entry point | Responsibility |
| --- | --- |
| [src/director.ts](src/director.ts) | Audio lifecycle, mixing and playback control. |
| [src/manifest.ts](src/manifest.ts) | Sound manifest types and validation. |
| [src/index.ts](src/index.ts) | Public audio entry point. |

## Contracts and design decisions

No workspace dependencies and no gameplay mutation. Fetch only bundled audio. Respect user volume/mute/background preferences, browser audio-unlock requirements and voice limits. Dispose owned audio resources and avoid starting duplicate loops on repeated state updates.

## Making a change

Add source and license records, generate/import runtime audio, update the manifest and wire event selection under packages/ui/src/audio. Verify mute, background behavior, transition cleanup and missing-file handling. See ASSET_CREDITS.md for attribution records.

## Verification

Run from the repository root:

```bash
npm test -- packages/audio/test --maxWorkers=2
npm run typecheck
npm run lint:boundaries
```

See the [developer handbook](../../docs/development/README.md), [extension recipes](../../docs/development/EXTENDING.md), and [complete source atlas](../../docs/development/SOURCE_INDEX.md). Tests and visual checks appropriate to the change are described in the [testing guide](../../docs/development/TESTING.md).
