# @pr/desktop — Electron shell

* `src/main.ts` — privileged `prgame://app` origin serving only `renderer/`, CSP header,
  sandbox + context isolation, sender-validated IPC with a strict save-ID alphabet and size cap,
  atomic save writes (temp → fsync → .bak → rename), denied permissions/navigation/new windows.
* `src/preload.ts` — the narrow `window.prDesktop` bridge.
* `scripts/build.mjs` — bundles main/preload and copies `apps/client/dist` to `renderer/`.
* `electron-builder.json` — installer configuration (`npm run desktop:dist`).

`PR_DEV_URL` (development only) loads a dev server instead of the packaged renderer.
