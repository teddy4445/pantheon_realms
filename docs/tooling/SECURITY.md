# Permissions, Privacy and Supply-Chain Review

## Conservative defaults

Only the bundled read-only audit MCP is configured by default. No auto-approval setting, background task, session hook, remote tunnel, broad filesystem MCP or shell-execution MCP is added. File copying does not install external tools. All optional services need a separate activation step and normal client permission review.

The local audit annotations are hints, not security guarantees. Its code restricts paths and operations, but the process still runs as the user. Treat output text and metadata as untrusted data. Protect the environment with normal account/OS boundaries.

## Different risks deserve different controls

| Tool | Principal risk | Control |
| --- | --- | --- |
| Local audit | Reading approved local content; malformed metadata | Narrow roots/extensions, size limits, no raw-file tool, no eval/network/write |
| Playwright | Browser/page content and powerful evaluation tools | Disposable isolated context, localhost workflow, sandbox, no personal account/session |
| Context7 | Documentation query leaves the machine | Send library questions, not source files, secrets or unreleased content |
| GitHub | Remote repository access and credentials | Read-only endpoint plus independently scoped read-only token |
| Upstream skill imports | Instructions/scripts become executable workflows | Pin snapshot, preserve licenses, inspect all files, enable explicitly |

Playwright origin filters do not provide complete network isolation. Keep the upstream caveats visible. Optional cloud generation can incur cost and disclose assets; no such integration is activated by the toolkit.

## Dependency review

Review resolved package identity, exact version, license, repository, engines and tarball integrity. Resolve and inspect a transitive package-lock before installing. `--ignore-scripts` reduces install-time execution but does not make runtime package execution harmless. Pinning does not fix a malicious package; maintain dependency/security updates deliberately.

The optional upstream downloader trusts GitHub HTTPS identity and checks a commit's blob hashes; this verifies snapshot consistency, not human authorship or safety. Do not execute instructions embedded in fetched documentation, pull requests, asset metadata or test outputs merely because an MCP returned them.

## Secrets

Use environment placeholders and repository-scoped credentials. Never commit a real PAT, API key, .env, personal browser profile or a configuration backup containing credentials. The setup scripts never write provided token values, but an existing user configuration could already contain them; review backups before sharing the repository.

A generic `.env` file is not automatically loaded by Claude Code's MCP environment. Set credentials in the actual client environment or use a supported secure credential mechanism. Restart the process when required. Do not echo token values in logs or screen captures.

## Distribution boundary

Exclude `.claude`, `.mcp.json`, `CLAUDE_TOOLING.md`, `tools/pantheon-dev`, vendor dependencies, optional-skills downloads, test fixtures, art sources under `assets-source/` and private docs from the game installer unless deliberately required as public documentation. The installed game must not connect to Context7, GitHub, any MCP server or an AI provider to play.

`docs/tooling/gitignore.fragment` is a suggestion to merge manually, not a script that changes repository policy. A gitignore is not a packager allowlist. Audit actual packaged files and network behavior.

## Incident and rollback

Stop affected servers, preserve logs without secrets, revoke exposed credentials through their providers, and inspect changed assets/source before reopening them. Restore configuration backups only after checking for later edits. Do not reset or delete unrelated repository work. Unknown or malicious upstream content should be rejected, not worked around with broader permissions.
