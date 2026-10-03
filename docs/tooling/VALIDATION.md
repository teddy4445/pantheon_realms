# Validation Report

**Executed:** 3 October 2026, after the 2D presentation migration (PixiJS sprites). **Environment:** Linux container, Node 22.22.2. These are toolkit checks, not a game implementation or a balance study. The earlier report (29 September 2026, 42 tests) covered tool integrations that were removed in this update and is superseded.

## Tests actually run

Command: `node --test tools/pantheon-dev/tests/toolkit.test.mjs`

**38 tests passed; zero failed, skipped, cancelled or pending.** The test suite exercised:

- Eight canonical families/sixteen forms and rejection of missing, third, self-linked, duplicate, orphaned or mismatched forms.
- Approved input roots; rejection of traversal, hidden paths, URLs, symlinks, wrong extensions and oversized files.
- Sprite-manifest inspection on synthetic `pantheon-realms-sprites-1` manifests: counts by section and status, missing files, remote and traversing references, invalid status or `file` fields, wrong schema and roots.
- Local asset-reference checks for declared runtime manifests.
- Configuration preservation, collision refusal, import idempotency, backups and paths containing spaces.
- Metadata-only version planning using mocked registry responses, failed-network behavior, exact installed-version checks and secret placeholders.
- Only the Playwright, Context7 and GitHub profiles remain; any other install or activation profile is rejected.
- Upstream snapshot path/license requirements and Git blob hash computation; no upstream file was downloaded.
- A real spawned local audit server with stdio initialization, tool listing (four read-only tools), a pair-validation call, an `inspect_sprite_manifest` call, clean JSON-RPC output and invalid-input handling.

The raw TAP output is in `toolkit-test-results.tap`.

Also run: `node tools/pantheon-dev/audit.mjs sprites` against the repository's `assets-runtime/sprites/manifest.json` (exit 0): 186 entries, all `placeholder` (creatures 102, heroes 7, sites 41, decor 6, obstacles 7, siege 12, projectiles 2, effects 9), 303 distinct referenced files, none missing. That is a snapshot of the game's assets on the run date, not a toolkit property.

## Package checks

All ten skill directories were checked (frontmatter name/description, UI metadata in `agents/openai.yaml`) and every `individual-skills/<name>/skill.zip` was rebuilt on 3 October 2026 with Python `zipfile` (sorted entries, fixed timestamp), one skill per archive with its SKILL.md entrypoint. JSON parsing, executable syntax (`node --check`) and authored local links are counted in `package-validation.json`; `FILE_MANIFEST.json` lists sizes and SHA-256 hashes.

`source-document-checksums.json` keeps the pre-migration hashes of the 35 v0.3 source documents. On 3 October 2026, 18 of them were revised for the 2D migration (stack, visual pipeline, animation strips; no game rules changed) and 17 still match that snapshot, which is what `sourceDocumentsPreserved` in `package-validation.json` counts. `FILE_MANIFEST.json` lists the current size and hash of every file, the revised documents included. No existing project CLAUDE.md/package.json/.mcp.json, actual game implementation, downloaded third-party packages, font files or private credentials are bundled as replacements.

## Not run / not established

| Item | Status |
| --- | --- |
| Skill triggering/output quality in a live Claude session | Not run; 30 authored evaluation prompts are supplied for later use |
| Local audit server inside Claude Code or another real MCP client | Not run; only the actual server + synthetic protocol harness was exercised |
| Playwright MCP/browser install and live UI interaction | Not run; source/configuration researched, setup staged |
| Context7 or authenticated GitHub connection | Not run |
| npm/GitHub install/download scripts with live network | Not run; network metadata branches tested with mocks where stated |
| Windows/macOS client behavior, installer, symlink permissions | Not run |
| Production game rules, campaign balance, real animations, audio or offline Electron build | Not implemented or tested by this toolkit |

Container downloads could not reach external package hosts, and no Claude executable was present. Do not convert researched setup commands into claims of installed or verified integrations. After copying the toolkit, run its tests and complete the local-client smoke checks before relying on external tools.
