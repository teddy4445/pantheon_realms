# Source registry and provenance

**Inspected:** 29 September 2026. The sources below were inspected through web retrieval. They are mutable references, not a claim that a specific future release has been security-audited.

## SRC-01 - Claude Code project skills

[Claude Code project skills](https://code.claude.com/docs/en/skills)

**Publisher/status:** Official Anthropic documentation.

**Used for:** Project .claude/skills layout, entrypoint frontmatter and direct slash invocation.

## SRC-02 - Claude Code MCP configuration

[Claude Code MCP configuration](https://code.claude.com/docs/en/mcp)

**Publisher/status:** Official Anthropic documentation.

**Used for:** Project .mcp.json, stdio/HTTP entries, environment substitutions and project approval.

## SRC-04 - Playwright MCP

[Playwright MCP](https://github.com/microsoft/playwright-mcp)

**Publisher/status:** Official Microsoft repository.

**Used for:** @playwright/mcp; browser configuration, isolated profile, vision, local tooling and security limitations.

## SRC-06 - Context7 for Claude Code

[Context7 for Claude Code](https://raw.githubusercontent.com/upstash/context7/master/docs/clients/claude-code.mdx)

**Publisher/status:** Official Upstash repository.

**Used for:** Hosted documentation MCP endpoint and optional authenticated configuration.

## SRC-07 - GitHub MCP remote configuration

[GitHub MCP remote configuration](https://raw.githubusercontent.com/github/github-mcp-server/main/docs/remote-server.md)

**Publisher/status:** Official GitHub repository.

**Used for:** Remote endpoint and /readonly option; authentication and restricted toolsets.

## SRC-08 - Anthropic frontend-design skill

[Anthropic frontend-design skill](https://github.com/anthropics/skills/tree/main/skills/frontend-design)

**Publisher/status:** Official Anthropic repository.

**Used for:** Optional upstream visual-interface design workflow; inspect LICENSE.txt in the selected snapshot.

## SRC-09 - Anthropic webapp-testing skill

[Anthropic webapp-testing skill](https://github.com/anthropics/skills/tree/main/skills/webapp-testing)

**Publisher/status:** Official Anthropic repository.

**Used for:** Optional browser testing workflow; Python examples do not override this project TypeScript test architecture.

## SRC-11 - MCP stdio transport

[MCP stdio transport](https://raw.githubusercontent.com/modelcontextprotocol/modelcontextprotocol/main/docs/specification/2025-11-25/basic/transports.mdx)

**Publisher/status:** Official MCP specification repository.

**Used for:** UTF-8 newline-delimited JSON-RPC and stderr/stdout separation.

## SRC-12 - Context7 source and authentication

[Context7 source and authentication](https://github.com/upstash/context7)

**Publisher/status:** Official Upstash repository.

**Used for:** Remote documentation queries, library resolution and anonymous/authenticated access.

## SRC-13 - PixiJS 8 guides

[PixiJS 8 guides](https://pixijs.com/8.x/guides)

**Publisher/status:** Official PixiJS documentation. Inspected 3 October 2026.

**Used for:** Renderer, application/ticker, sprites, textures and assets, and v8 migration notes behind the `pr-pixi-scene` skill. Check the game's pinned `pixi.js` version before applying an example.

Sources SRC-03, SRC-05 and SRC-10 were removed on 3 October 2026 with the 2D presentation migration; they described tool integrations the project no longer uses. Their IDs are not reused.


## What is original and what is external

All ten `pr-*` skills and the local audit/setup/test scripts are newly authored for this project. They are not copied from Anthropic, Microsoft, PixiJS or an installed ChatGPT skill. Only the common Agent Skills file conventions are reused.

The 35 files in `docs/pantheon-v0.3/` are the user's prior handoff. Their pre-migration hashes are in `source-document-checksums.json`; 18 of them were revised for the 2D migration on 3 October 2026, so a mismatch there marks a revised document, not corruption (`FILE_MANIFEST.json` has their current hashes). They are a source snapshot, not a competing instruction hierarchy.

The two Anthropic skill candidates are researched but NOT bundled or enabled. The optional downloader resolves one commit, records Git blob hashes, preserves each skill's LICENSE.txt, and requires a separate enable step. Both inspected license files were Apache-2.0 at the research date; verify the downloaded snapshot rather than assuming all skills in that repository share a license.

Third-party MCP software, browser executables, Python, Node, runtime game dependencies, art, fonts and audio are NOT bundled. npm metadata is resolved only when the user explicitly runs the plan command. The exact version and integrity are then recorded before installation. We did not verify those future resolved releases by executing them here.

## Verification limitations

There was no usable network access from the build container to npm/GitHub downloads, although source pages could be inspected through web retrieval. No external executable was fetched, installed or run for this toolkit. The package therefore contains reviewed configuration logic and explicit staged installers rather than pretending it contains preinstalled third-party tools.

A pinned version/commit improves reproducibility; it is not a security or licensing guarantee. Network requests, account policies, tool schemas and package exports can change. Setup deliberately fails on unexpected executable names or missing licenses instead of guessing.
