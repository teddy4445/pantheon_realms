# Browser and desktop renderer

This Vite application mounts `@pr/ui` with the appropriate platform adapter. Electron uses the same built renderer. Gameplay logic lives in workspace packages, not in the entry point.

## Key files

- [src/main.tsx](src/main.tsx): application bootstrap.
- [vite.config.ts](vite.config.ts): relative build paths, local runtime asset directory, application version injection, lazy chunk options and removal of legacy absolute provenance paths from built copies.
- [package.json](package.json): development/build/preview scripts.
- [magic-preview.html](magic-preview.html): a focused effect-art preview, separate from gameplay validation.

## Run from the repository root

```bash
npm ci
npm run dev
npm run build
npm run preview
```

Development uses port **5173** with `strictPort`; production preview normally uses **4173**. Build output is `apps/client/dist/`. Assets come from the repository's `assets-runtime/` public directory and fonts are bundled locally.

## Build options

`PR_OUT_DIR` overrides the output location. `PR_FEW_CHUNKS=1` groups the deferred Pixi code for hosts with file-count limits. `PR_NO_MINIFY=1` preserves readable function names for profiling and should not be used for a release. These are build environment variables, not player settings.

Keep native APIs behind `@pr/platform`. Preserve the lazy renderer boundary through `SceneHost` and avoid adding CDN/runtime network requirements. See [UI guide](../../packages/ui/README.md) and [testing guide](../../docs/development/TESTING.md).
