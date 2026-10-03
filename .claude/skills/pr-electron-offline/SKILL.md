---
name: pr-electron-offline
description: "Implement or audit Pantheon Realms Electron packaging, preload/IPC interfaces, save import/export, local asset protocols, installers and offline completeness. Use for desktop release, native persistence, network dependency leaks, corrupt saves or platform differences. Preserve the shared TypeScript core and keep development MCP servers, credentials and authoring tools out of the shipped game."
---

# Secure Offline Desktop Production

Read [project-contract.md](references/project-contract.md), the architecture's Electron/offline/save sections, and current main-menu/settings contracts. Consult official Electron docs for the installed version.

## Workflow

1. Identify actual main/preload/renderer entrypoints and packaging paths. No development server or external website is a launch requirement.
2. Keep renderer isolation, sandbox and `nodeIntegration: false`. Expose narrow typed IPC operations; validate sender, arguments and save identifiers in the main process.
3. Confine custom-protocol asset resolution to packaged paths. Reject traversal, unexpected navigation/windows and unsolicited remote content. Do not disable web security to fix asset loading.
4. Implement versioned save envelopes, checksums, backups, interruption recovery and import validation. Native filesystem writes are not the game's rule resolver.
5. Package sprites, atlases, backgrounds, portraits, audio and licensed font assets locally under `assets-runtime/`. Keep PixiJS on the `pixi.js/unsafe-eval` shim so the strict CSP needs no `eval`; check dynamic loader defaults and that no texture URL leaves the packaged origin.
6. Exclude `.claude`, `.mcp.json`, `tools/pantheon-dev`, vendor tool dependencies, secrets and authoring sources from distributable game assets.
7. Test a packaged build on identified target hardware with empty caches and networking disabled. Launch menu/settings/bestiary, complete a mission, save, close, relaunch and resume.

## Evidence boundaries

The manifest audit checks only declared paths; it cannot prove offline behavior. Playwright against the web build cannot prove Electron IPC, installer behavior, filesystem durability or signing. Test actual packaging and native flows separately; use a disposable profile and save directory. Never expose a debug port on public interfaces.

Browser storage is a different adapter with failure/export handling. Browser first-load asset delivery and cache persistence are not equivalent to the installed desktop guarantee. Optional updates must not block launch. A test report identifies OS, runtime, GPU/driver, app and content versions, backend and network conditions.

Output packaging changes, IPC contract, denied-input tests, actual cold-offline test log, save-recovery evidence and untested platforms. Do not claim cross-platform releases from a single browser run.
