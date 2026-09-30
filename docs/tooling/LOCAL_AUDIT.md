# Local Audit MCP and CLI

The original server is `tools/pantheon-dev/server.mjs`. It needs Node but no npm package. It implements a bounded, sequential, tools-only MCP stdio exchange: initialize, initialized notification, ping, tools/list and tools/call. It advertises no resource subscriptions, sampling, elicitation, HTTP service or shell/file-write capability. This is a small project utility, not a general MCP SDK or protocol certification.

## Tool surface

| MCP tool | Input | Result |
| --- | --- | --- |
| `project_health` | Empty object | Presence of expected project components; missing folders are normal before coding |
| `validate_creature_pairs` | `path` to JSON aggregate | Exactly two forms, reciprocal links, shared faction/tier/growth/footprint |
| `inspect_gltf_asset` | `path`, optional `requiredClips` | Header/JSON metadata, clip names, missing names and unsafe external references |
| `check_local_asset_manifest` | `path` to `{assets:[{id,path}]}` | Local existence and safe-path checks for declared assets |

All tools carry read-only annotations, but the implementation restrictions matter more than hints. The server never opens a network listener, executes a shell, follows asset URLs or exposes an arbitrary file-reading tool.

## Allowed files

Inputs must be project-relative POSIX paths under `packages/content/`, `assets-runtime/`, or `tools/pantheon-dev/fixtures/`. Absolute paths, hidden components, traversal, URLs, backslashes and symlinks are rejected. JSON inputs are limited to 4 MiB; model and individual runtime assets to 64 MiB. Catalogs are bounded to 1,000 families/2,000 forms; manifests to 2,000 entries. Requests are bounded and serialized.

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
node tools/pantheon-dev/audit.mjs asset assets-runtime/creatures/griffin/base.glb idle_a move_fly attack_melee_a defeat
node tools/pantheon-dev/audit.mjs manifest packages/content/runtime-assets.audit.json
```

The CLI prints JSON; a failed check exits nonzero. Run from the project root. These commands do not write an output file unless you deliberately redirect stdout.

Manifest example:

```json
{"assets":[{"id":"griffin.base","path":"assets-runtime/creatures/griffin/base.glb"}]}
```

The manifest only checks entries actually declared. It cannot discover hidden CDN requests, prove browser cache completeness, or verify that a GLB's local URI files are bundled. Use the full glTF wrapper and cold-offline runtime tests separately. Clip-name inspection does not verify channels, weight painting, footprints in motion, conformance or performance.

## Live-client smoke test

After registering `pr-audit`, ask the local client to list its four tools, run `project_health`, validate the bundled pair fixture, then try an intentional `../` path and observe rejection. Do not use a real private file for the negative test. Report whether the client actually connects; the supplied automated harness is not a substitute for that test.
