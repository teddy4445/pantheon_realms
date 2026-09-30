# MCP Installation and Activation Guide

Sources and risks are listed in [SOURCES.md](SOURCES.md) and [SECURITY.md](SECURITY.md). Use a local Claude Code client. Other clients may use a different configuration path/schema; this toolkit does not automatically configure every desktop chat application.

## A. Local audit: no third-party package installation

```bash
node tools/pantheon-dev/setup.mjs init --link-claude
```

Only `pr-audit` is added. `.mcp.json` is created/merged after validating existing content. The script resolves absolute Node/server/project paths, preserves other entries, and refuses a conflicting `pr-*` name. Approve it through the client's normal trust flow. It is a stdio subprocess, not a TCP listener.

## B. Resolve exact external versions before installation

Choose only needed npm tools. Add `blender` to this first plan only when preparing that integration too:

```bash
node tools/pantheon-dev/setup.mjs plan --with=playwright,babylon,gltf
```

This makes metadata requests to the official npm registry and writes:

- `tools/pantheon-dev/vendor/plan.json`: exact resolved versions, tarball integrity and source metadata.
- `tools/pantheon-dev/vendor/package.json`: exact direct dependencies; no version ranges.

It does NOT install packages or run their code. There are no preclaimed current release versions in this ZIP. `plan` resolves the published version at your run time; review its publisher, license, engines, source, scripts and security notes before proceeding. A changed Babylon authoring version must be tested with the pinned game runtime, not used as a reason to upgrade the renderer blindly.

Create and review the transitive lockfile, then install explicitly:

```bash
npm --prefix tools/pantheon-dev/vendor install --package-lock-only --ignore-scripts --no-audit --no-fund
npm --prefix tools/pantheon-dev/vendor ci --ignore-scripts --no-audit --no-fund
```

Read `package-lock.json` BETWEEN these commands. Lifecycle scripts remain disabled. Some packages may require additional audited setup; do not solve that by enabling arbitrary scripts globally. Running a server later still executes its code: `--ignore-scripts` is not a sandbox.

Preserve the plan and lockfile for reproducibility. Re-planning refuses to replace an existing plan. To update versions, stop the tools, archive the old plan/lock, review the new release, remove the old vendor installation deliberately and regenerate it. Do not use floating `npx ...@latest` in every MCP launch.

## C. Playwright browser QA

After installing the reviewed plan, install the browser explicitly using the Playwright CLI supplied by the MCP's installed dependency:

```bash
node tools/pantheon-dev/vendor/node_modules/playwright/cli.js install chromium
node tools/pantheon-dev/setup.mjs activate --with=playwright
```

If the pinned package has changed its dependency layout and that CLI is absent, inspect its README and installed package metadata; do not guess another binary or silently change versions. Browser download can require network/disk space and OS dependencies. It is not included in this ZIP.

The supplied config uses Chromium, headless mode, Chromium sandbox enabled, a clean isolated context, 1440 x 900 viewport, core/vision tools, and local development origins on ports 5173/4173. Start the project's actual development/preview command separately. A URL is not a running app.

Origin restrictions are best-effort routing limits, NOT a security boundary and not comprehensive redirect isolation. Use a disposable profile and no personal sessions. Do not enable unrestricted file access, a browser extension attached to your logged-in profile, or no-sandbox merely for convenience. Use a machine/container that supports the intended sandbox.

The isolated MCP browser loses its storage when closed. Use checked-in tests with a deliberate test profile for persistence; separately test the packaged Electron app. The DOM snapshot cannot prove what a WebGL creature looks like. Use screenshots, required human/visual checks and authorized semantic state.

## D. Official Babylon authoring

```bash
node tools/pantheon-dev/setup.mjs activate --with=babylon
```

This adds `pr-babylon-nme`, `pr-babylon-npe` and `pr-babylon-nge`, using the installed package's exact version and documented executable names. Setup fails if a bin is missing. It does not use the GUI or Flow Graph tools.

Use NME for unit/terrain materials, NPE for beacon/spell particles, and NGE for optional geometric prop work. Keep source graphs and exported files local in the project and validate them in the game. The official authoring tools can expose temporary local editor sessions; do not forward their ports or publish snippets/assets without explicit approval. Tools do not replace Blender rigging or the game's code.

## E. Context7: optional online documentation

```bash
node tools/pantheon-dev/setup.mjs activate --with=context7
```

The hosted endpoint is `https://mcp.context7.com/mcp`. The default has no stored credential. When a `CONTEXT7_API_KEY` is present in the launching environment, setup writes a placeholder Authorization header, not the secret value. Anonymous access/quotas depend on the service and may change. Review provider terms/account requirements before use.

Confirm the requested library and installed version. Avoid sending private game documents, credentials or entire source files. This is online developer assistance, not a game dependency.

## F. GitHub read-only: optional repository context

Set `PANTHEON_GITHUB_TOKEN` in the environment of your local coding client, using a fine-grained read-only token limited to the relevant repository. Then:

```bash
node tools/pantheon-dev/setup.mjs activate --with=github
```

Setup refuses a missing token, writes only `${PANTHEON_GITHUB_TOKEN}`, and uses `https://api.githubcopilot.com/mcp/readonly`. Existing client/provider account and organization policies still apply. Do not assume a `.env` file is loaded automatically; restart the client with the correct environment. Write operations, pushes, issue creation and public publication are not authorized by this configuration.

## G. Blender: optional, explicit higher-risk authoring

Blender requires the installed Blender application, the community add-on, a local bridge session and uv/uvx. No add-on or Blender executable is bundled.

Include `blender` when creating the vendor plan, for example `--with=playwright,babylon,gltf,blender`. Read the exact package version from `vendor/plan.json`. Use that version rather than the literal placeholder below:

```bash
uvx --python 3.11 --from mcp-for-blender==PINNED_VERSION mcp-for-blender install-addon
node tools/pantheon-dev/setup.mjs activate --with=blender --uvx=/absolute/path/to/uvx
```

`install-addon` is a separate, explicit user command because it writes to Blender's user configuration. Read the upstream instructions and review the pinned add-on before running it. Python 3.11 is the maintainer-recommended compatibility choice at the research date; uvx may need to download Python/packages the first time. Enable the add-on inside Blender, open a disposable/backup scene, and start its local server as documented.

This uvx recipe pins the top-level Python package, not all of its transitive dependencies. For a reproducible team authoring environment, create a reviewed dedicated uv project and commit its dependency lock before standardizing the setup. Do not claim the npm lockfile covers Blender/Python dependencies.

Setup supplies `BLENDER_HOST=127.0.0.1`, `BLENDER_PORT=9876`, `BLENDER_MCP_SAFE_MODE=1` and `DISABLE_TELEMETRY=true`. Check the actual add-on is also bound to loopback. Safe mode is a script filter, not isolation; arbitrary Python access remains a serious capability. Do not expose the port to a network. Do not enable optional cloud-generation or download services by default. Stop the bridge when the task is finished.

The configuration cannot create a good rig by itself. Use the paired-creature skill and actual export/deformation checks.

## H. Optional full glTF conformance

After installing `gltf` from the reviewed plan:

```bash
node tools/pantheon-dev/validate-gltf.mjs assets-runtime/creatures/hoplite/base.glb
```

This wrapper loads the exact installed Khronos validator and permits only safe local asset references. It does not upload the model. A full validator still does not judge anatomy, silhouette, movement quality or frame rate.

## I. Optional upstream skills

```bash
node tools/pantheon-dev/upstream-skills.mjs plan
```

Review the resolved Anthropic repository commit and file list in `tools/pantheon-dev/upstream-plan.json`, then:

```bash
node tools/pantheon-dev/upstream-skills.mjs fetch
```

Read the complete downloaded skills, scripts and licenses in `optional-skills`. No scripts have been executed. Enable only the desired reviewed skill:

```bash
node tools/pantheon-dev/upstream-skills.mjs enable frontend-design
node tools/pantheon-dev/upstream-skills.mjs enable webapp-testing
```

The snapshot is hash-checked, license-preserving, staged and collision-refusing. It is not a guarantee that upstream instructions are safe or suitable. The `pr-*` skills and approved game contracts retain precedence. Upstream Python examples do not replace the project's TypeScript testing strategy.

## Disable and rollback

Stop the local client and authoring sessions. Remove only the selected `pr-*` entries from `.mcp.json`; keep unrelated servers. Remove the `@CLAUDE_TOOLING.md` import only when intentionally removing this toolkit. Restore a backup after comparing it with newer user changes, not by blindly overwriting the current file. Remove only the corresponding skill directory to stop its discovery.

Keep credentials outside the repository. Installed vendor folders and absolute machine-local config should not go into the game package. See [security](SECURITY.md) before enabling an external tool.
