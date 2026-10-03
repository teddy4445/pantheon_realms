# Quick Start

## 1. Copy the overlay safely

Use a normal local development checkout. Commit or back up current work before copying files. Include `.claude/skills` even when the file manager hides dot-directories. Keep your existing root CLAUDE.md, package.json, game code and .mcp.json. The toolkit supplies uniquely named root files and a separate tools directory, not a replacement game scaffold.

The supplied scripts were tested with Node 22.16.0 on Linux. Use a supported installed Node release and verify each third-party package's `engines` when resolving it. A local Claude Code installation/account is needed to use the skills/MCP interactively. Scripts can be inspected and the audit CLI used without Claude.

No global npm install, Python environment or browser download is required for the bundled local checks.

## 2. Run the toolkit checks

From the repository root:

```bash
node --test tools/pantheon-dev/tests/toolkit.test.mjs
node tools/pantheon-dev/audit.mjs catalog tools/pantheon-dev/fixtures/creature-pairs.valid.json
node tools/pantheon-dev/audit.mjs sprites
```

The last command reads the game's `assets-runtime/sprites/manifest.json` and reports entries by section and status (`placeholder`/`final`) and any referenced file missing locally. It does not judge art quality; in a checkout without the game assets it reports the missing manifest and exits nonzero.

## 3. Register only the local audit MCP

```bash
node tools/pantheon-dev/setup.mjs init --link-claude
```

This writes absolute executable/project paths for **this checkout on this machine**. Existing server entries are preserved; a name collision fails rather than replacing it. Changed files get a timestamped backup. The CLAUDE import is appended once, never substituted for the existing content. Omit `--link-claude` to make no change to CLAUDE.md, then add the import manually after review.

Review `.mcp.json` and the appended text. Restart/reload Claude Code, accept only the intended workspace/server prompts, and inspect `/mcp`. Project skills should appear through `/` or `/skills` according to the client version. [Official skill/MCP docs](SOURCES.md) describe discovery and project trust.

Move the repository or change Node? Inspect and deliberately update/remove the `pr-audit` entry before rerunning init. Its collision refusal is intentional. Do not commit machine-specific absolute configuration when collaborating; share the setup script/templates instead, or adopt a reviewed portable team configuration.

## 4. First actual task

```text
/pr-project-lead Inspect the project and current v0.3 specifications.
List what is implemented, what is only documented, and the next testable slice.
Use the local audit tools on the fixtures first. Keep external servers disabled.
```

Then use a specialist, for example:

```text
/pr-rules-engine Implement and test local base-to-upgrade training for
Hoplite -> Veteran Hoplite. Use the existing candidate economy as documented;
keep one population pool and reject unaffordable or invalid destinations.
```

## 5. Add optional tools only when needed

Follow [MCP setup](MCP_SETUP.md). The dependency planner uses network access only to fetch registry metadata; it does not install or execute it. Review the plan and lockfile before explicitly installing software.

Hosted web conversations cannot drive local tools just because these files were uploaded. Use a supported **local client** with the project and required applications installed. Never expose a local tool port on the public internet to work around this.

## Windows notes

The commands above run in PowerShell or a terminal where `node` is available. Paths written by setup are correctly JSON-escaped, including spaces.

A Claude process inherits environment variables when launched. Restart it from the terminal where optional credentials were set; merely writing a `.env` file does not guarantee that MCP configuration expands it. Never include real keys in source control or screenshots.

The live Windows client and installer were not tested here. The unit suite's symlink test can require Windows developer mode or appropriate permission; on a machine that cannot create test symlinks, record that test as not run rather than disabling path restrictions.
