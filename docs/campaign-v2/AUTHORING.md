# Campaign content v2 — authoring guide

How the 37 chapters of the campaign expansion (handoff 2026-10-15) are written
in code. The design source is `docs/campaign-v2/design/mission-content.json`
(one card per chapter: story, tasks, map, pressure, choice, neutral, finish) and
`design/campaign-graph.json` (prerequisites). `design/CAMPAIGN_DESIGN_REVIEW.txt`
has the campaign-wide cast and arcs. Values are proposed and unplaytested.

The reference implementation is `packages/content/src/campaign/v2/threeBeaconsV2.ts`.

## Files

| File | What |
|---|---|
| `packages/content/src/campaign/v2/regionMap.ts` | Region map compiler (paint ops, roads routed between sites) and the reachability / independent-approach checks |
| `packages/content/src/campaign/v2/kit.ts` | `chapter(spec)` → `MissionDefinition`; site makers `S.*`, objectives `O.*`, conditions `C.*`, `voice()` speakers, `armyText()` |
| `packages/content/src/campaign/v2/<campaign>V2.ts` | One builder per campaign: `build<Name>V2(camp: V2Campaign): V2Built` |
| `packages/content/src/campaign/v2/index.ts` | Registration (`BUILDERS`) |
| `packages/content/test/v2/checks.ts`, `harness.ts` | Shared checks; a catalog with one campaign under construction |
| `packages/content/test/v2/<campaign>.test.ts` | The campaign's own tests |
| `tools/campaign-v2/render.measure.ts`, `sim.measure.ts` | Text rendering of maps; computer journeys in both chapter orders |

## Map coordinates

Authoring positions are `[column, row]` on a rectangle (`cols` × `rows`), as
they look on screen: row 0 is the north edge, column 0 the west edge. The outer
ring is always the edge terrain (water on `coast`/`fjord`, else mountain unless
`edge` says otherwise). Odd rows are shifted half a hex to the east (odd-r):
the neighbours of `[x, y]` are `[x±1, y]` and, for even `y`, `[x-1, y±1]`,
`[x, y±1]`; for odd `y`, `[x, y±1]`, `[x+1, y±1]`.

Paint ops apply in order: `{ t, disc: [x, y, r] }`, `{ t, blob: [x, y, r] }`
(a natural edge), `{ t, line: [[x, y], …], width }`, `{ t, cells: [...] }`,
`{ t, rect: [x0, y0, x1, y1] }`. Terrain: plains, forest, rough, marsh (walkable,
costs 100/125/125/150), mountain and water (impassable). Sites are placed on
walkable ground automatically. Roads are routed by the compiler (`roads: [{ via:
[siteId | [x, y], …] }]`) along the cheapest walkable path and never through a
site that ends a route (only crossings and shortcut gates let a road pass).
A town's roads leave from its gate cell (`S.town(..., gate)`).

Render a map while working:

```
PREFIX=silent_oracle_v2 npx vitest run --config tools/campaign-v2/vitest.config.ts tools/campaign-v2/render.measure.ts
```
(only registered campaigns; for one under construction, print `compileRegionMap` output from your test).

## Regions, not corridors (hard requirements)

* No `MapTemplateDefinition`, no barrier columns, no strip copied from the arc
  builders (Restore/Hunt/Covenant/Seek/Rival/Refuge/Finale). Author each map from
  its card: lakes, rivers, ridges and settlements where the card puts them.
* A useful circuit (loop) through the main region; **two independent approaches**
  to the principal objective (`principal`), checked by `independentApproaches`
  (no single choke cell); a **shortcut opened through play** (`S.shortcut` with
  the flag that opens it — a stair, a winch, a service landing, a drained ford).
* Optional dead ends are short reward pockets. Some finales return to a changed
  home region rather than marching to the far edge.
* Roads end at real interaction cells: the town gate, bridges/crossings, ferry
  landings, sluices, objective sites.

## Mechanics vocabulary (all rules-enforced)

| Card asks for | Use |
|---|---|
| A guarded crossing / bridge / pass | `S.crossing` (roads pass once cleared) |
| A shortcut opened through play | `S.shortcut(id, at, …, [flags])` (a gate site, opens when all flags are set) |
| Water control that changes a route | `S.sluice(...)`: channel cells switch terrain (e.g. water ↔ marsh); OperateSluice by a hero standing on it; `openFlag` set while open. Never the only route: the checks require reachability with the sluices either way. |
| A ferry / canoe / boat crossing | two `S.ferry` landings pointing at each other; `requires: { flag, reason }` when it must be liberated first |
| A one-use resupply cache | `S.depot` (supply-depot picture) |
| A choice / negotiation / payment | `S.choice(id, at, name, desc, title, text, options)`: options carry `cost`, `reward` (incl. `flags`), `requiresFlags` (evidence in hand), `clearsSiteIds` (an authored resolution: those guards stand down — paying passage, a negotiated surrender). One-time, paid once. |
| Evidence / remembered decisions | mission flags; list them in `evidence` (journal ledger with icon evidence/pact/supply/evacuation/branch) and in `carried` (become campaign facts `fact:<flag>` for later chapters) |
| Order-aware dialogue | `briefingVariants` and `scenes` with `ifFlags` / `unlessFlags` over `fact:<flag>` — a character never names an investigation that has not happened |
| A bounded benefit in a later chapter | that chapter's `entryBonuses: [{ fact, label, wallet?, heroArmy?, garrison?, flags? }]` |
| A patrol with a home | `patrols: [{ commander, start, waypoints, army, home: siteId, purpose }]` — taking the home site (it must have a guard) makes the patrol withdraw for good |
| An announced counterattack | a patrol with `dormantUntil: flag` (it waits until the flag is set) |
| An announced deadline | `timers: [{ id, label, startWhen, days, metWhen, consequence, announce?, onExpire: { flags?, failObjectives? } }]` — starts only when `startWhen` holds (day saved), may fail **optional** objectives only, never the mission |
| A schedule (ice crossing, tide) | a timer whose expiry sets the flag of a shortcut gate (`metWhen: C.flag('never')`) — announced, never a trap |
| A required story fight | `guard({..., required: true})`: never joins or flees |
| A neutral hire of an existing creature | `S.camp(..., creatureId, weeklyGrowth, initialStock)` |
| A hiring site of a NEW neutral | `S.neutral(id, at, name, desc, creatureId, weeklyStock, pact?)` — Pegasus, Root-Runner, Serpopard, Baku, Afanc, Ahuitzotl (`NEUTRAL_V2_SITE_STOCK` in common/neutralsV2.ts). Finite stock each week, shared, never accumulating; `pact: { flag, reason }` keeps it closed until the pact flag is set. Put it in its habitat (Pegasus: upland meadow/limestone; Root-Runner: forest; Serpopard: sandstone river edge; Baku: misty cedar grove; Afanc: freshwater reeds; Ahuitzotl: warm cenote/jungle bank). |
| “Two of three” tasks | `C.atLeast(2, …)` |

Battles in campaigns are always fought by hand (rules-level guard); never write
“auto” or “quick battle” into a text. Objective texts name places and troops
with `armyText([...])` tokens (scaled by difficulty), never typed guard counts.

## Chapter spec essentials

* `economyFrom`: the content-v1 mission whose town economy, hero profile, divine
  options and purchasable list the chapter starts from (normally its first
  legacy mission). Override with `player: { wallet, army, buildings, population }`
  (e.g. a capped expedition army) and `purchasable`.
* `town: { siteId, townId, name }` + the `S.town` site with the same IDs.
  Reuse the v1 town IDs and names where the card's place matches.
* `principal`: the objective whose marker site must have two approaches.
* `legacy`: the v1 mission IDs whose beats the chapter carries (cards' `legacyMissionIds`).
* `loss`: plain-language loss rules (the protagonist must survive, etc.).
* Briefings and scenes use the existing cast (`voice(portraitAssetId, name)`;
  the v1 campaign file shows each speaker's portrait ID). No new heroes, gods or factions.
* Every chapter ends through an objective with `completesMission: true` or an
  activation with `completesMission: true`.

## Builder result

```ts
export function buildXV2(camp: V2Campaign): V2Built {
  return {
    missions: [m1, …],
    chapters: [{ missionId, chapter, requiresAll, legacyMissionIds, briefingArt: mN.briefingArt! }, …],
    epilogue: { art, lines, variants: [{ flag, lines }] },   // the final choice's outcomes
  };
}
```

`epilogue.art` must not contradict the chosen outcome: reuse a v1 ending picture
(`ending.<campaign>.<flag>`) only when its scene matches the v2 outcome it is
shown for, else use a campaign painting (`campaign.<id>.cover`,
`mission.<id>.m0N.briefing`).

## Checks to run

```
npx tsc -p tsconfig.core.json --noEmit            # filter to your files
npx vitest run packages/content/test/v2/<campaign>.test.ts
CAMPAIGN=<id> PANTHEON=<pantheon> MODULE=<file without .ts> EXPORT=<builder> RUNS=2 \
  npx vitest run --config tools/campaign-v2/vitest.config.ts tools/campaign-v2/sim.measure.ts
```

The sim plays every chapter in both orders with the campaign-sim autopilot (it
serves objectives, attacks when its preview wins). Aim for every chapter won in
both runs; a chapter the autopilot cannot finish usually has an unreachable or
unpayable step. These are computer-played measurements, not playtests.
