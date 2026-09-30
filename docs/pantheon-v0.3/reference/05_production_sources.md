# Production Sources and Verification Scope

**Checked:** 2026-09-29. These primary technical references support implementation capabilities and constraints, not the invented campaign narrative, asset budgets, map design, or untested balance. URLs are supplied for the future development handoff. Pin actual software/exporter versions before coding; a live `latest` documentation URL is not a version lock.

| ID | Official source | Use in this package |
| --- | --- | --- |
| T01 | [Babylon.js glTF loader](https://doc.babylonjs.com/features/featuresDeepDive/importers/glTF) | GLB import, local compression decoders, production CDN cautions, coordinate handling |
| T02 | [Blender glTF exporter manual](https://docs.blender.org/manual/en/latest/addons/scene_gltf2.html) | Supported export data and action/NLA export modes; release-sensitive animation behavior |
| T03 | [Khronos glTF 2.0 specification](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html) | Runtime-neutral format, meters, right-handed axes, mesh/material/skin/animation representation |
| T04 | [React useEffect](https://react.dev/reference/react/useEffect) | External-system lifecycle and cleanup |
| T05 | [Electron security guidance](https://www.electronjs.org/docs/latest/tutorial/security) | Renderer isolation, sandboxing, restricted navigation and IPC |
| T06 | [Electron protocol API](https://www.electronjs.org/docs/latest/api/protocol) | Local application scheme and capability registration |
| T07 | [MDN storage quotas and eviction](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria) | Browser-save durability limits and explicit export/import need |
| T08 | [MDN Web Workers API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API) | Separate computation context and explicit messaging |
| T09 | [Babylon AudioEngineV2](https://doc.babylonjs.com/typedoc/classes/BABYLON.AudioEngineV2) | Audio buses, playback, streaming, unlock and lifecycle |
| T10 | [Babylon WebGPU support documentation](https://github.com/BabylonJS/Documentation/blob/master/content/setup/support/webGPU.md) | WebGL/WebGPU paths; choose and test rendering backend |
| T11 | [Vite static deployment](https://vite.dev/guide/static-deploy) | Shared browser bundle and distinction between preview and production hosting |
| T12 | [Khronos glTF Validator](https://github.com/KhronosGroup/glTF-Validator) | Format, reference, animation and buffer validation reports |
| T13 | [Electron context isolation](https://www.electronjs.org/docs/latest/tutorial/context-isolation) | Narrow typed preload methods rather than unrestricted IPC exposure |

## How to use sources

The campaign names, characters, dialogue, scenario rewards, and upgrade art directions are original game proposals. They are not ancient history. Historical unit notes remain in the earlier [lore document](../content/01_unit_history_and_lore.md), with their own sources and uncertainty labels.

The stack choices and exactly-one-upgrade requirement were adopted by the project owner in this conversation. API capabilities were checked against the references above. No software was installed or game renderer executed in this documentation pass. No external images, models, rigs, fonts, audio, or licensed asset packages are redistributed here.

Do not treat an exporter option documented for another Blender release as automatically compatible. Record and test the actual Blender version, exporter version, Babylon package versions, Electron runtime and target graphics backend together. Review changes when updating that toolchain.
