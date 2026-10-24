# Electron desktop host

The desktop app supplies native storage and window services around the shared browser renderer. Rules and content remain in TypeScript workspace packages. The supported distributed artifact is a Windows x64 NSIS installer.

## Code map

| File | Responsibility |
| --- | --- |
| [src/main.ts](src/main.ts) | Window lifecycle, local `prgame://app` protocol, security policy, validated IPC and native save handling. |
| [src/preload.ts](src/preload.ts) | Narrow renderer bridge; do not expose unrestricted Node or filesystem access. |
| [scripts/build.mjs](scripts/build.mjs) | Build main/preload and prepare the desktop renderer copy. |
| [scripts/optimize-assets.mjs](scripts/optimize-assets.mjs) | Cached image derivatives and runtime path remapping in the renderer copy. |
| [electron-builder.json](electron-builder.json) | Packaging, icons, per-user install behavior and output naming. |

## Build on Windows

From the repository root:

```bash
npm ci
npm run desktop
npm run desktop:dist
```

`desktop` builds and launches the app. `desktop:dist` builds the renderer and desktop bundles, then packages under `apps/desktop/release/`. The current installer name is `Pantheon-Realms-Setup-1.0.0-x64.exe`. Output and the asset cache are ignored by Git. Configuration for other platforms exists, but the distributed release and installation instructions here are for Windows x64.

## Persistence and trust boundaries

User data lives under `%APPDATA%\Pantheon Realms\`. The installer is per-user, does not request administrator elevation and preserves application data on uninstall. The current release is unsigned.

Treat IPC payloads and requested paths as untrusted. Keep validation and atomic writes in the main process. Do not bypass the preload bridge, disable sandboxing to solve a UI problem, or add game rules to native handlers. Save-envelope validation remains in `@pr/session`.

## Release checks

Run type/boundary checks and relevant unit tests. Test the actual packaged app, including art resolution, save/load and scene changes; a browser-only test does not exercise the custom protocol. Use the [testing guide](../../docs/development/TESTING.md) and [performance guide](../../docs/development/PERFORMANCE.md). Record file size and SHA-256 for a release, and update the website's download metadata only for that exact artifact.
