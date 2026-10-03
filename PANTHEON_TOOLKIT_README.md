# Pantheon Realms - Skills and MCP Development Toolkit

**Prepared:** 29 September 2026; updated 3 October 2026 for the 2D presentation migration (PixiJS sprites) | **Toolkit:** 1.1.0 | **Source design:** v0.3 + 2D migration

This is a repository add-on for developing the real Pantheon Realms game with Claude Code. It is not a game engine, an implemented campaign, or a collection of preinstalled external apps.

## Start here

Extract the toolkit, then copy its contents into the **root of the development repository**, including the hidden `.claude` directory. Review conflicts before copying. No root CLAUDE.md, package.json or .mcp.json is included, so this overlay does not replace those project files. The included source docs live in their own `docs/pantheon-v0.3/` folder.

Read [Quick Start](docs/tooling/QUICKSTART.md), then run from the project root with Node.js available:

```bash
node --test tools/pantheon-dev/tests/toolkit.test.mjs
node tools/pantheon-dev/setup.mjs init --link-claude
```

The second command writes/merges a **local-only audit server** in `.mcp.json`, backs up changed existing files, and appends `@CLAUDE_TOOLING.md` once to the existing CLAUDE.md. It does not download software or enable hosted services. Restart your local Claude Code session and review its project/tool approval prompts.

Begin with:

```text
/pr-project-lead Read the current project documents and inspect the repository.
Plan the first production-quality Hoplite/Veteran Hoplite slice, including
rules, both animated assets, town recruitment, S18 inspection and offline QA.
Do not install optional integrations or change approved mechanics yet.
```

## Included and ready to inspect

| Item | Contents |
| --- | --- |
| Ten original project skills | Architecture, rules, map generation, local AI, PixiJS 2D scenes, React UI, 2D creature production, audio/VFX, Electron offline, QA |
| Local audit MCP | Four read-only tools; no npm dependencies, HTTP listener, shell execution or write tool |
| Optional MCP preparation | Staged configuration for Playwright, Context7 and read-only GitHub |
| Optional upstream skill preparation | Commit-pinned downloader for Anthropic frontend-design and webapp-testing; not bundled/enabled |
| Validation helpers | Pair topology CLI, 2D sprite-manifest inspector (status counts, missing files), local manifest checker |
| Test suite | Local script/protocol/security-boundary/configuration tests with fixtures |
| Source documentation | The 35 v0.3 Markdown files; their original hashes are recorded, and their owners are revising some of them for the 2D migration |
| Individual skill archives | `individual-skills/<name>/skill.zip`, one skill per archive |

## Recommended activation sequence

Start with the bundled skills and audit. Add Playwright when a browser build exists. Add Context7 for external API documentation. Add read-only GitHub only when repository-hosted issues/PRs/CI are useful. Avoid enabling the whole set at startup.

The default audit server works after Node is installed. External tools need explicit installation. Context7/GitHub need network access; GitHub needs credentials. An offline-capable game does not mean the coding assistant itself works offline.

## Guide map

- [Quick Start and Windows notes](docs/tooling/QUICKSTART.md)
- [Curated skills and MCP choices](docs/tooling/CURATED_TOOLS.md)
- [MCP setup, permission and rollback guide](docs/tooling/MCP_SETUP.md)
- [Local audit tools and file schemas](docs/tooling/LOCAL_AUDIT.md)
- [Three practical development workflows](docs/tooling/WORKFLOWS.md)
- [Security and supply-chain review](docs/tooling/SECURITY.md)
- [Sources and provenance](docs/tooling/SOURCES.md)
- [Tests actually run and remaining limitations](docs/tooling/VALIDATION.md)

No external server/client integration has been tested in the user's environment. The test report distinguishes local protocol/fixture checks from live Claude Code, Playwright and Electron testing. Tool descriptions do not promise finished art, animations or balanced gameplay.
