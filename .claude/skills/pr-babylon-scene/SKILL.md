---
name: pr-babylon-scene
description: "Create, debug, or optimize Pantheon Realms Babylon.js adventure maps, tactical scenes, town compositions, GLB loading, cameras, materials, particles and animated viewers. Use for render lifecycle, asset-loading failures, scene transitions and WebGL2/WebGPU parity. Keep React lifecycle, logical map data, offline decoding and authoritative rules separate from graphics."
---

# Babylon Scene Production

Read [project-contract.md](references/project-contract.md) and the production architecture/visual pipeline in `docs/pantheon-v0.3/production/`. Verify APIs against the installed Babylon version and official docs; do not use unpinned playground snippets as production architecture.

## Workflow

1. Bind a scene controller to an existing logical state/view model. Do not infer passability from meshes, map pixels or collision callbacks.
2. Maintain an explicit engine/scene lifecycle. Dispose observers, animation groups, loading tasks, textures, render targets and audio on exit; handle React development remounts.
3. Use local GLB/material/environment resources. Vendor/configure required compression decoders and workers locally instead of relying on a warm CDN cache.
4. Drive movement and impact visuals from committed events. Model count represents a stack visually; it is not an independent combat army.
5. Use readable fixed/constrained cameras, legal pick targets, fog and clear ownership/stack labels. Hidden entities must not leak through render lists or inspection hooks.
6. Test at normal tactical zoom, low quality, context loss and repeated scene changes. Record measured hardware and asset versions.

## Optional MCP authoring

Use official Babylon NME for materials, NPE for particles and NGE for geometric props when useful. Save local exports with source graphs and provenance. Validate graph/runtime version compatibility before committing them. Do not substitute Babylon GUI for the approved React UI, or Flow Graph for the rules engine. Publishing to a public snippet service requires explicit permission.

## Checks

Run the local `inspect_gltf_asset` tool for metadata and required clip names, then the optional Khronos validator and a real Babylon load. Metadata success alone says nothing about skin deformation or performance. Compare ordinary/fast/instant event playback: final rules hashes must match. A missing model needs a visible fallback, not a hidden stack.

Output controller changes, exported graphs, asset/version manifest, before/after screenshots, lifecycle/performance evidence, offline-origin findings and explicit missing visual work.
