# Reference configurations

These files are examples, not active MCP configuration. Prefer `setup.mjs`, which resolves actual absolute paths and installed binary names, preserves existing servers, rejects collisions and checks required credentials.

Every `${...}` is an environment placeholder, never an automatically known project variable. Supply values through the client's actual environment or replace them deliberately. The Claude Code `.mcp.json` expansion contract is described in the official source registry. Other MCP clients may not use the same syntax.

Do not concatenate whole files to form JSON or copy an example over an existing .mcp.json. Merge only reviewed server entries. No config auto-approves tool access. Playwright needs its downloaded browser, and external accounts/services remain optional.
