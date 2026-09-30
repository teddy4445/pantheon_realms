# Pantheon developer utilities

Run from the project root. See `docs/tooling/QUICKSTART.md` for setup and `docs/tooling/LOCAL_AUDIT.md` for schemas.

- `audit.mjs`: dependency-free local CLI.
- `server.mjs`: dependency-free, read-only, tools-only MCP stdio server.
- `setup.mjs`: explicit local configuration and external metadata planning/activation; never installs packages.
- `upstream-skills.mjs`: optional commit/hash-pinned Anthropic skill download with a separate activation step.
- `validate-gltf.mjs`: optional wrapper around an explicitly installed Khronos validator.
- `tests/toolkit.test.mjs`: actual toolkit tests, not gameplay tests.
- `fixtures/`: deliberately limited test data, not production game content.
- `mcp-templates/`: illustrative alternatives to the setup generator; placeholders must be supplied explicitly.

Never import these utilities into the runtime game packages. They use plain Node JavaScript with JSDoc so the local audit works without npm/transpilation. That development-tool choice does not change the approved TypeScript rules/AI architecture.
