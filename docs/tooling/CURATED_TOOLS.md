# Curated Tools for Pantheon Realms

Selection is based on our approved stack, not the size of a tool catalog. A **skill** teaches a workflow; an **MCP server** exposes executable tools or external data. Neither is a runtime requirement for the player's game. Source IDs resolve in [SOURCES.md](SOURCES.md).

## Included original skills

| Command | Work it guides |
| --- | --- |
| `/pr-project-lead` | Source precedence, connected slices, scope and specialist routing |
| `/pr-rules-engine` | Deterministic commands, combat/economy, conservation and upgrade transactions |
| `/pr-campaign-mapgen` | Authored story structure, seeded detail, gates and campaign carryover |
| `/pr-local-ai` | Legal local planners, worker budgets, hidden information and reproducible search |
| `/pr-pixi-scene` | PixiJS 2D views: engine-host lifecycle, sprite manifest, anchors/facing, hex picking, camera/fog and rendering performance |
| `/pr-react-game-ui` | Main menu, settings, recruitment, contextual bestiary and accessibility |
| `/pr-creature-pipeline` | Paired reference views, portraits, battle animation strips, sprite import and actual runtime review |
| `/pr-audio-vfx` | Music buses, ambience, combat cues, effects and cleanup |
| `/pr-electron-offline` | Isolated IPC, native saves, local assets and packaged offline testing |
| `/pr-qa-release` | Reproducible layered tests and honest completion evidence |

These are project-tailored instructions, not autonomous background agents. They do not run automatically merely because their directories exist, grant unrestricted tools, or implement the game by themselves. Claude Code can discover relevant descriptions and invoke them; direct slash commands make intent explicit [SRC-01].

## MCP shortlist

| Integration | Publisher | Why use it | Default |
| --- | --- | --- | --- |
| Pantheon project audit | Original toolkit code | Pair invariants, sprite-manifest status and missing files, local asset paths, repository component presence | Only server initialized by default |
| Playwright MCP | Microsoft | Drive browser UI, inspect semantic states, capture canvas screenshots | Opt-in after browser app exists |
| Context7 | Upstash | Retrieve current library documentation and examples | Optional online documentation |
| GitHub MCP read-only | GitHub | Read repository issues, PRs and CI context | Optional online, scoped credentials |

### Why these choices

Playwright can drive semantic browser elements and has vision-oriented tools, but the PixiJS canvas is not a DOM tree of creatures. Pair screenshot/coordinate actions with read-only authorized debug information where needed; never expose a production-only bypass API [SRC-04].

No art-authoring MCP is configured. Creature references, portraits and animation strips are produced outside the repository and enter the game only through the sprite importer (`npm run sprites:import`), which checks transparency, frame grid and size; the official PixiJS 8 guides document the renderer side [SRC-13].

Context7 helps with changing APIs; it does not know our rules. Confirm the actual library/version, consult original docs (for the renderer, the PixiJS 8 guides) when coverage is missing, and send API questions rather than private source code [SRC-06, SRC-12, SRC-13].

GitHub is unnecessary for basic local file edits and git operations. Add its read-only remote endpoint only when hosted repository data is useful. Keep token permissions constrained independently of the server's read-only mode [SRC-07].

## Optional upstream skills found

| Skill | Upstream | Reason to keep optional |
| --- | --- | --- |
| `frontend-design` | Anthropic skills repository | Useful aesthetic work, but must respect the existing game screens, offline assets and accessibility contracts |
| `webapp-testing` | Anthropic skills repository | Useful browser-testing workflow; its Python examples must not create a second permanent test architecture when our project uses TypeScript |

Both can be fetched as a fixed commit snapshot with preserved license files using the supplied script. They are not downloaded or activated in this ZIP. The ten original skills are usable without either [SRC-08, SRC-09].

## Playwright CLI alternative

The Playwright maintainers also document CLI-plus-skills as an alternative for coding agents, with less tool-schema overhead. This kit keeps MCP for interactive browser review and recommends checked-in test scripts for repeatable regression. Do not install both interfaces automatically; choose the one that fits the task [SRC-04].

## Tools that do not need an MCP

Use native coding-client file/shell/git tools for ordinary code edits and builds. Use the repository's sprite importer for art format checks, Vitest for rules and presentation tests and checked-in Playwright/Electron tests for regression. Do not add generic unrestricted filesystem/shell MCPs, database servers, persistent agent-memory servers, cloud image generators or live-service infrastructure just to enlarge the tool list.

No MCP promises automatic production-quality creature animation strips, music, complete AI or game balance. Authoring and testing remain multi-step work with review gates.
