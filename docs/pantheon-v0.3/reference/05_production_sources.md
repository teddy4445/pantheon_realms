# Production Sources and Verification Scope

**Checked:** 2026-09-29; presentation sources replaced 2026-10-03 for the 2D migration ([DEC-23](../DECISIONS_v0_3.md)). These primary technical references support implementation capabilities and constraints, not the invented campaign narrative, asset budgets, map design, or untested balance. URLs are supplied for the future development handoff. Pin actual software versions before coding; a live `latest` documentation URL is not a version lock.

| ID | Official source | Use in this package |
| --- | --- | --- |
| T01 | [PixiJS Assets guide](https://pixijs.com/8.x/guides/components/assets) | Promise-based, cached loading of local runtime images; no CDN dependency |
| T02 | [PixiJS Textures guide](https://pixijs.com/8.x/guides/components/textures) | Texture sources, frames cut from strips, texture memory and release |
| T03 | [PixiJS Sprite guide](https://pixijs.com/8.x/guides/components/scene-objects/sprite) | Sprite anchors, scale and horizontal mirroring |
| T04 | [React useEffect](https://react.dev/reference/react/useEffect) | External-system lifecycle and cleanup |
| T05 | [Electron security guidance](https://www.electronjs.org/docs/latest/tutorial/security) | Renderer isolation, sandboxing, restricted navigation and IPC |
| T06 | [Electron protocol API](https://www.electronjs.org/docs/latest/api/protocol) | Local application scheme and capability registration |
| T07 | [MDN storage quotas and eviction](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria) | Browser-save durability limits and explicit export/import need |
| T08 | [MDN Web Workers API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API) | Separate computation context and explicit messaging |
| T09 | [MDN Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API) | Audio graph, gain buses, playback, suspend/resume and lifecycle |
| T10 | [PixiJS Renderers guide](https://pixijs.com/8.x/guides/components/renderers) | WebGL/WebGPU renderer paths; choose and test rendering backend |
| T11 | [Vite static deployment](https://vite.dev/guide/static-deploy) | Shared browser bundle and distinction between preview and production hosting |
| T12 | [PixiJS Scene Graph guide](https://pixijs.com/8.x/guides/concepts/scene-graph) | Render order, depth sorting by container order, culling and coordinate systems |
| T13 | [Electron context isolation](https://www.electronjs.org/docs/latest/tutorial/context-isolation) | Narrow typed preload methods rather than unrestricted IPC exposure |
| T14 | [PixiJS Performance Tips](https://pixijs.com/8.x/guides/concepts/performance-tips) | Sprite batching, texture management and other measured-performance practices |

The PixiJS guide pages above were confirmed to exist on 2026-10-03. Sprite import validation (transparency, frame grid, size) is the project's own tool, `npm run sprites:import`; there is no external validator to cite for it.

## How to use sources

The campaign names, characters, dialogue, scenario rewards, and upgrade art directions are original game proposals. They are not ancient history. Historical unit notes remain in the earlier [lore document](../content/01_unit_history_and_lore.md), with their own sources and uncertainty labels.

The stack choices and exactly-one-upgrade requirement were adopted by the project owner; the 2D presentation replaced the earlier presentation decision by owner directive on 2026-10-03. API capabilities were checked against the references above. No software was installed or game renderer executed in this documentation pass. No external images, sprites, fonts, audio, or licensed asset packages are redistributed here.

Do not treat an API documented for another PixiJS major version as automatically compatible. Record and test the actual PixiJS version (`pixi.js` 8.22.0 at the migration), the sprite import tool versions (Python, Pillow), the Electron runtime and the target graphics backend together. Review changes when updating that toolchain.

## Superseded sources (history)

> **Obsolete (2026-10-03):** describes the abandoned 3D pipeline; superseded by the 2D migration (PixiJS sprites). Kept as history only. Until 2026-10-03 the IDs below pointed to: T01 Babylon.js glTF loader (GLB import, compression decoders, coordinate handling); T02 Blender glTF exporter manual (action/NLA export modes); T03 Khronos glTF 2.0 specification (meters, right-handed axes, mesh/material/skin/animation representation); T09 Babylon AudioEngineV2 (audio buses); T10 Babylon WebGPU support documentation; T12 Khronos glTF Validator (format, reference, animation and buffer validation). The 2026-09-29 instruction to record the Blender and exporter versions applied only to that pipeline.
