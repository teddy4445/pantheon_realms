# Validation Report

**Executed:** 29 September 2026. **Environment:** Linux container, Node 22.16.0. These are toolkit checks, not a game implementation or a balance study.

## Tests actually run

Command: `node --test tools/pantheon-dev/tests/toolkit.test.mjs`

**42 tests passed; zero failed, skipped, cancelled or pending.** The test suite exercised:

- Eight canonical families/sixteen forms and rejection of missing, third, self-linked, duplicate, orphaned or mismatched forms.
- Approved input roots; rejection of traversal, hidden paths, URLs, symlinks, wrong extensions and oversized files.
- Synthetic GLB header parsing, required/duplicate clip reporting, encoded unsafe URIs and local asset-reference checks.
- Configuration preservation, collision refusal, import idempotency, backups and paths containing spaces.
- Metadata-only version planning using mocked registry responses, failed-network behavior, exact installed-version checks and secret placeholders.
- Blender opt-in configuration with a fixed fixture version, localhost and telemetry disabled; no Blender process was executed.
- Upstream snapshot path/license requirements and Git blob hash computation; no upstream file was downloaded.
- A real spawned local audit server with stdio initialization, tool listing/calls, clean JSON-RPC output and invalid-input handling.

The raw TAP output is in `toolkit-test-results.tap`. The included metadata model fixture is not a conforming animated production asset.

## Package checks

All ten skill directories were initialized and packaged with the preinstalled skill-creator tooling; every individual archive is named `skill.zip` and contains one SKILL.md entrypoint. Frontmatter, required UI metadata, source preservation, JSON parsing, executable syntax and authored local links are checked by the package validation report.

See `package-validation.json` for machine-readable counts. The 35 current v0.3 source documents match their original SHA-256 values. No existing project CLAUDE.md/package.json/.mcp.json, actual game implementation, downloaded third-party packages, font files or private credentials are bundled as replacements.

## Not run / not established

| Item | Status |
| --- | --- |
| Skill triggering/output quality in a live Claude session | Not run; 30 authored evaluation prompts are supplied for later use |
| Local audit server inside Claude Code or another real MCP client | Not run; only the actual server + synthetic protocol harness was exercised |
| Playwright MCP/browser install and live UI interaction | Not run; source/configuration researched, setup staged |
| Babylon NME/NPE/NGE authoring session and runtime graph compatibility | Not run |
| Blender application, add-on, Python execution, rig/export integration | Not run |
| Context7 or authenticated GitHub connection | Not run |
| npm/PyPI/GitHub install/download scripts with live network | Not run; network metadata branches tested with mocks where stated |
| Full Khronos validator wrapper with an installed upstream package | Not run; syntax checked, optional install required |
| Windows/macOS client behavior, installer, symlink permissions | Not run |
| Production game rules, campaign balance, real animations, audio or offline Electron build | Not implemented or tested by this toolkit |

Container downloads could not reach external package hosts, and no Claude/Blender executable was present. Do not convert researched setup commands into claims of installed or verified integrations. After copying the toolkit, run its tests and complete the local-client smoke checks before relying on external authoring tools.
