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

## SRC-03 - Official Babylon MCP authoring servers

[Official Babylon MCP authoring servers](https://raw.githubusercontent.com/BabylonJS/Babylon.js/master/packages/public/@babylonjs/mcp-servers/readme.md)

**Publisher/status:** Official BabylonJS repository.

**Used for:** @babylonjs/mcp-servers; NME, NPE, NGE and other editors; local authoring/export.

## SRC-04 - Playwright MCP

[Playwright MCP](https://github.com/microsoft/playwright-mcp)

**Publisher/status:** Official Microsoft repository.

**Used for:** @playwright/mcp; browser configuration, isolated profile, vision, local tooling and security limitations.

## SRC-05 - Blender MCP

[Blender MCP](https://github.com/ahujasid/mcp-for-blender)

**Publisher/status:** Community maintainer repository, NOT official Blender.

**Used for:** Renamed package mcp-for-blender, add-on requirement, localhost socket, arbitrary Python, safe-mode limitations and telemetry controls.

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

## SRC-10 - Khronos glTF Validator

[Khronos glTF Validator](https://github.com/KhronosGroup/glTF-Validator)

**Publisher/status:** Official Khronos repository.

**Used for:** Full conformance validator, separate from the toolkit metadata audit.

## SRC-11 - MCP stdio transport

[MCP stdio transport](https://raw.githubusercontent.com/modelcontextprotocol/modelcontextprotocol/main/docs/specification/2025-11-25/basic/transports.mdx)

**Publisher/status:** Official MCP specification repository.

**Used for:** UTF-8 newline-delimited JSON-RPC and stderr/stdout separation.

## SRC-12 - Context7 source and authentication

[Context7 source and authentication](https://github.com/upstash/context7)

**Publisher/status:** Official Upstash repository.

**Used for:** Remote documentation queries, library resolution and anonymous/authenticated access.


## What is original and what is external

All ten `pr-*` skills and the local audit/setup/test scripts are newly authored for this project. They are not copied from Anthropic, Babylon, Microsoft, Blender, or an installed ChatGPT skill. Only the common Agent Skills file conventions are reused.

The 35 files in `docs/pantheon-v0.3/` are the user's prior current handoff, preserved unchanged. Their hashes are in `source-document-checksums.json`. They are a source snapshot, not a competing instruction hierarchy.

The two Anthropic skill candidates are researched but NOT bundled or enabled. The optional downloader resolves one commit, records Git blob hashes, preserves each skill's LICENSE.txt, and requires a separate enable step. Both inspected license files were Apache-2.0 at the research date; verify the downloaded snapshot rather than assuming all skills in that repository share a license.

Third-party MCP software, browser executables, Blender/add-ons, Python, Node, runtime game dependencies, models, fonts and audio are NOT bundled. npm metadata is resolved only when the user explicitly runs the plan command. The exact version and integrity are then recorded before installation. We did not verify those future resolved releases by executing them here.

## Verification limitations

There was no usable network access from the build container to npm/PyPI/GitHub downloads, although source pages could be inspected through web retrieval. No external executable was fetched, installed or run for this toolkit. The package therefore contains reviewed configuration logic and explicit staged installers rather than pretending it contains preinstalled third-party tools.

A pinned version/commit improves reproducibility; it is not a security or licensing guarantee. Network requests, account policies, tool schemas and package exports can change. Setup deliberately fails on unexpected executable names or missing licenses instead of guessing.
