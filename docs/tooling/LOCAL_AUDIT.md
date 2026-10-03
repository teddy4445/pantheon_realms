# Local Audit MCP and CLI

The original server is `tools/pantheon-dev/server.mjs`. It needs Node but no npm package. It implements a bounded, sequential, tools-only MCP stdio exchange: initialize, initialized notification, ping, tools/list and tools/call. It advertises no resource subscriptions, sampling, elicitation, HTTP service or shell/file-write capability. This is a small project utility, not a general MCP SDK or protocol certification.

## Tool surface

| MCP tool | Input | Result |
| --- | --- | --- |
| `project_health` | Empty object | Presence of expected project components; missing folders are normal before coding |
| `validate_creature_pairs` | `path` to JSON aggregate | Exactly two forms, reciprocal links, shared faction/tier/growth/footprint |
| `inspect_sprite_manifest` | Optional `path` (default `assets-runtime/sprites/manifest.json`) | Entries by section and status (`placeholder`/`final`), referenced files missing locally, invalid statuses or file fields |
| `check_local_asset_manifest` | `path` to `{assets:[{id,path}]}` | Local existence and safe-path checks for declared assets |

All tools carry read-only annotations, but the implementation restrictions matter more than hints. The server never opens a network listener, executes a shell, follows asset URLs or exposes an arbitrary file-reading tool.

## Allowed files

Inputs must be project-relative POSIX paths under `packages/content/`, `assets-runtime/`, or `tools/pantheon-dev/fixtures/`. Absolute paths, hidden components, traversal, URLs, backslashes and symlinks are rejected. JSON inputs are limited to 4 MiB; individual runtime assets to 64 MiB. Catalogs are bounded to 1,000 families/2,000 forms; manifests to 2,000 entries. Requests are bounded and serialized.

Do not put secrets in the approved content roots. This is defense-in-depth validation within a same-user local process, not a hardened operating-system sandbox against a concurrent hostile process changing files.

## Pair aggregate schema

A minimal aggregate looks like:

```json
{
  "families": [{"familyId":"griffin","baseId":"griffin","upgradeId":"windcrest_griffin","growthPerWeek":7}],
  "creatures": [
    {"id":"griffin","familyId":"griffin","factionId":"greek","tier":3,"form":"base","upgradeId":"windcrest_griffin","baseGrowth":7,"stats":{"footprintHexes":2}},
    {"id":"windcrest_griffin","familyId":"griffin","factionId":"greek","tier":3,"form":"upgraded","baseId":"griffin","baseGrowth":7,"stats":{"footprintHexes":2}}
  ]
}
```

Export an aggregate adapter when the implementation stores creatures across files. Do not restructure the game merely to satisfy this audit input. The complete fixture includes eight families/sixteen forms, but no attack/cost balance or complete gameplay schema. It cannot prove that all required game definitions or animation assets exist.

## CLI equivalents

```bash
node tools/pantheon-dev/audit.mjs health
node tools/pantheon-dev/audit.mjs catalog packages/content/catalog.audit.json
node tools/pantheon-dev/audit.mjs sprites
node tools/pantheon-dev/audit.mjs sprites assets-runtime/sprites/manifest.json
node tools/pantheon-dev/audit.mjs manifest packages/content/runtime-assets.audit.json
```

The CLI prints JSON; a failed check exits nonzero. Run from the project root. These commands do not write an output file unless you deliberately redirect stdout.

Manifest example:

```json
{"assets":[{"id":"griffin.base.idle","path":"assets-runtime/sprites/creatures/griffin/idle.webp"}]}
```

The manifest only checks entries actually declared. It cannot discover hidden CDN requests or prove browser cache completeness; run cold-offline runtime tests separately.

## Sprite manifest inspection

`inspect_sprite_manifest` reads a `pantheon-realms-sprites-1` manifest (sections `creatures`, `heroes`, `sites`, `decor`, `obstacles`, `siege`, `projectiles`, `effects`). It returns `entryCount`, per-section and overall counts by `status`, the number of distinct `file` references, and `missingFiles`: references that do not resolve to a local `.webp`/`.png` under `assets-runtime/` (missing, remote, traversing or otherwise unsafe paths are all listed). `valid` is false when a file is missing or an entry has an invalid status or `file` field; placeholders are counted, not treated as errors.

It is bookkeeping only. It does not check frame grids, anchors, transparency, facing, how an animation reads or rendering performance; the sprite importer (`npm run sprites:import`) and a review in the Unit Detail viewer and battle do that.

## Live-client smoke test

After registering `pr-audit`, ask the local client to list its four tools, run `project_health`, validate the bundled pair fixture, then try an intentional `../` path and observe rejection. Do not use a real private file for the negative test. Report whether the client actually connects; the supplied automated harness is not a substitute for that test.
