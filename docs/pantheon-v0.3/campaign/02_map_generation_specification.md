# Campaign Map Generation: Authored Structure, Seeded Detail

**Version:** `pr-mapgen-0.3` | **Status:** P - implementable generation specification; no production generator is supplied by this Markdown file.  
**Inputs:** [Three Beacons mission definitions](01_the_three_beacons.md), `pr-0.2-candidate` movement, and the adopted desktop/browser architecture.

## 1. Why not unrestricted procedural maps?

The three missions teach a specific progression. An unrestricted random map could put the required Aerie resources behind the Aerie objective, strand a hero on an island, allow a guard bypass, or produce a long detour that defeats the short-demo goal.

Use a hybrid: authored story graph, fixed mandatory anchors and barriers, deterministic road carving, seeded non-critical terrain and decoration, then explicit validation. The campaign is three scenarios, not one random map with an incrementing difficulty number. First play uses three golden seeds. A replay may change approved scenery and terrain variation without changing the story, fixed rewards, mandatory enemy counts or upgrade economy.

The authoritative output is a logical map plus object/encounter definitions. Babylon builds a visual scene from it. A 3D mesh, texture, collider, or animated gate cannot silently determine legal movement.

## 2. Coordinate system

Use a rectangular **axial-hex coordinate domain**: integer q from 0 to W-1 and r from 0 to H-1. Six neighbors, in the fixed canonical order, are `(q+1,r)`, `(q+1,r-1)`, `(q,r-1)`, `(q-1,r)`, `(q-1,r+1)`, `(q,r+1)`. This parallelogram-shaped logical domain is intentional; do not mix it with an odd-row-offset array.

Hex distance is `(abs(dq) + abs(dr) + abs(dq+dr)) / 2`. The tactical board remains the separate **15 x 11 odd-row-offset board** defined in v0.2. Convert coordinate representations explicitly when necessary; adventure coordinates are never used directly as tactical cell indices.

An example pointy-top rendering transform for adventure hex radius R is `x = sqrt(3)*R*(q+r/2)`, `z = 1.5*R*r`, with Y as vertical. This display transform uses floating point; rules pathfinding uses integer graph edges. Proposed scene radii are 2 meters for adventure tiles and 1.5 meters for tactical cells. The adventure scene is an abstract diorama, not literal geographical scale.

Terrain cost is the existing destination-edge rule: road 75, plains 100, forest/rough 125, marsh 150 movement points. Mountains and water are impassable. A road is an edge property between adjacent cells, not an assumption that every neighboring road-painted cell has a free connection. Flight in a creature stack does not let its hero fly over mountains on the adventure map.

## 3. Canonical mission templates

All outer-boundary cells (`q=0`, `q=W-1`, `r=0`, `r=H-1`) are impassable. No pathfinding is permitted outside the domain. Barrier columns below replace their cells with impassable terrain except named crossings. A named crossing is the only way through that barrier, including diagonal hex movement.

| Mission | Template ID | Size | Golden seed | Barrier mask |
| --- | --- | --- | ---: | --- |
| M01 | `three_beacons_m01_v1` | 20 x 14 | 170101 | q=10 water, except bridge `(10,7)` |
| M02 | `three_beacons_m02_v1` | 26 x 18 | 170202 | q=13 mountains, except pass `(13,8)` |
| M03 | `three_beacons_m03_v1` | 30 x 20 | 170303 | q=12 mountains except `(12,6)` and `(12,13)`; q=21 mountains except ward gate `(21,10)` |

All remaining interior cells start as plains. Heights, coastline meshes and mountain silhouettes are presentation layers constrained by this logical mask. The M01 water column can be presented as a river/tidal cut, not an unnavigable void disguised as a traversable beach.

### M01 anchors

| Anchor ID | q | r | Definition |
| --- | ---: | ---: | --- |
| `m01_town` | 3 | 7 | Asterion, owned town and player spawn |
| `m01_sawmill` | 3 | 3 | Unowned Sawmill; unguarded |
| `m01_quarry` | 6 | 10 | Unowned Quarry; unguarded |
| `m01_cache` | 7 | 5 | 300 G pickup |
| `m01_centaur_cache` | 6 | 2 | Optional 3-Centaur encounter and Warding Token |
| `m01_ford` | 10 | 7 | Mandatory guarded bridge |
| `m01_beacon` | 16 | 7 | Final guard and restoration interaction |

Road graph edges: town-ford, ford-beacon, town-sawmill, town-quarry, sawmill-centaur_cache, town-cache. Each named edge is carved as one contiguous legal route, not a teleport link.

Before the ford encounter is cleared, the western component must not reach the beacon. After it clears, the beacon approach must be reachable, but the beacon itself still requires its own encounter and restoration prerequisites.

### M02 anchors

| Anchor ID | q | r | Definition |
| --- | ---: | ---: | --- |
| `m02_town` | 3 | 8 | Passhaven and player spawn |
| `m02_sawmill` | 5 | 4 | Unowned Sawmill |
| `m02_quarry` | 6 | 12 | Unowned Quarry |
| `m02_cache` | 8 | 11 | 500 G pickup |
| `m02_watchtower` | 8 | 5 | Reveal nesting-ground coordinate |
| `m02_sentinel_cache` | 7 | 3 | Optional 3-Centaur-Sentinel encounter |
| `m02_pass_guard` | 13 | 8 | Mandatory guarded ridge pass |
| `m02_nest_guard` | 20 | 6 | Raiders and Griffin covenant objective |
| `m02_beacon` | 22 | 10 | Second beacon, upgrade/patron gate |
| `m02_crystal` | 19 | 13 | Unowned Crystal Deposit |

Road graph edges: town-pass_guard, pass_guard-nest_guard, pass_guard-beacon, town-sawmill, town-quarry, town-cache, town-watchtower, watchtower-sentinel_cache, beacon-crystal. The optional Sentinel route ends on the starting side; it cannot create a second passage through the ridge.

The round trip from the nest to the town is deliberate. The hero must return for actual local Windcrest recruitment or training. Do not place a second town, free remote recruitment button, or teleport shrine beside the beacon to bypass this mechanic.

### M03 anchors

| Anchor ID | q | r | Definition |
| --- | ---: | ---: | --- |
| `m03_town` | 3 | 10 | Highwatch and player spawn |
| `m03_sawmill` | 5 | 6 | Unowned Sawmill |
| `m03_quarry` | 6 | 15 | Unowned Quarry |
| `m03_gold_mine` | 7 | 15 | Unowned Gold Mine |
| `m03_watchtower` | 9 | 4 | Reveals both relay coordinates |
| `m03_north_guard` | 12 | 6 | Northern approach guard |
| `m03_south_guard` | 12 | 13 | Southern approach guard |
| `m03_relay_north` | 16 | 5 | First relay |
| `m03_relay_south` | 16 | 14 | Second relay |
| `m03_scout_spawn` | 17 | 10 | One finite hostile hero |
| `m03_labyrinth` | 17 | 2 | Optional Minotaur/Warden encounter |
| `m03_cyclops_cache` | 18 | 17 | Optional base Cyclops encounter |
| `m03_ward_gate` | 21 | 10 | Opens only when both relays are active |
| `m03_beacon` | 26 | 10 | Melas encounter and final restoration |

Road graph edges: town-north_guard, town-south_guard, north_guard-relay_north, south_guard-relay_south, relay_north-relay_south, relay_north-ward_gate, relay_south-ward_gate, ward_gate-beacon, town-sawmill, town-quarry, quarry-gold_mine, town-watchtower, relay_north-labyrinth, relay_south-cyclops_cache. Patrol waypoints are `(15,8)`, `(18,10)`, `(15,12)`, `(17,10)`; connect each sequential pair and the closing pair with legal internal roads, without crossing a mandatory barrier.

Clearing either first crossing must permit access to both relays. Clearing neither must leave the middle plateau inaccessible. Neither relay alone may unlock q=21. Both relay flags unlock exactly the ward-gate crossing; they do not delete a whole mountain column or reveal all final enemies.

## 4. Generator pipeline

### Stage A - Validate inputs

Validate template ID/version, bounded dimensions, uint32 seed, content/rules versions, unique IDs and anchor coordinates. Resolve every unit, building, reward and ability reference before allocating scene objects. Missing content is a descriptive error, never replaced with an unrelated creature.

### Stage B - Build terrain and reserve anchors

Create the all-plains interior and immutable outer boundary. Apply barrier masks. Reserve one logical cell per adventure site plus a radius-one presentation clearance halo. Important objects can have visually larger prefabs, but the hero's interaction anchor remains explicit. Reserve all mandatory gate cells and town arrival positions.

Mark all anchors and their approach cells as required passable cells, except a gate's state-dependent entry. Interactions at optional guarded resource/lore sites require defeating that site's guardian even if other paths approach from a different direction. They do not automatically guard an entire region.

### Stage C - Carve the authored road graph

Process graph edges in their declared order. For each pair, find a shortest path using BFS on the current static passability mask with all campaign gates provisionally open. The endpoints are allowed; other site anchor cells are excluded unless explicitly named as a waypoint. Ordinary road intersections may be shared.

On the golden seed, tie-break neighbors in the canonical order. In scenery-variation mode, seeded neighbor ordering may choose another equally short path, but may not change the path length or violate reserved anchors/crossings. Set an undirected road flag for every traversed edge. Road corridors and radius-one clearance cells become protected against later blocking decoration or terrain modification.

Do not carve through a mountain barrier except at its named opening. A failure to connect an edge rejects that candidate. Do not repair it by making a random mountain passable: that would erase the authored gate.

### Stage D - Add bounded terrain variation

Outside all protected cells and immutable masks, choose plains/forest/rough in proportions 60/25/15 using an integer weighted draw. The first release adds no new impassable terrain in this stage. This guarantees that optional decoration cannot sever an essential route. Marsh can be an explicit authored patch in a later template version; it is not silently introduced to extend the demo.

A tree mesh may overlap the edge of a passable forest tile, but colliders and selectable meshes must not override logical travel. Keep large occluders out of the interaction clearance halo. On protected roads, purely cosmetic grass/pebbles are allowed, never tall opaque cover over the hero or a waypoint.

### Stage E - Place gameplay objects and encounters

Instantiate the exact anchor records, ownership, starting buildings/pools and encounter compositions from the campaign document. Place the player once. Initial stock is loaded directly; do not call a build handler that grants population again. Put each named quest reward in a unique event definition. No random loot, free third forms, or bonus resource lottery is introduced.

Create the patrol with its explicit permissions and route. Do not spawn more patrols because the player waits. Guardian bodies may be presentation markers, but the associated blocked anchor/interaction is the authoritative encounter.

### Stage F - Build presentation manifest

Choose biome-compatible grass, trees, cliff modules, rocks, ruins, shoreline pieces and distant backgrounds from a **cosmetic** seed stream. Record object IDs, local transform, prefab version and color variation separately from the core map. Use fixed archetype sockets for important sites rather than asking an image generator to infer walkability from a painted map.

Create scene chunks (proposed 8 x 8 logical cells), ground meshes, instanced non-skinned props, explicit pick targets and an invisible selection surface. Keep fog rendering separate from cached map geometry. Never render live hidden enemy positions merely because their region was explored previously.

### Stage G - Validate, hash and save

Run the invariants below before presenting a mission. Serialize the logical map in stable ID/coordinate order and store its hash, template version, generator version, seed and generation report. Keep a separate presentation hash when useful. A screenshot is not the saved map.

The game may show a generation progress screen and permit cancellation before the new mission commits. Cancelling leaves the previous campaign checkpoint intact. Generation failures must not strand the player on an empty scene.

## 5. Seed and RNG contract

Use one explicit unsigned 32-bit seed per mission. Proposed stream derivation: UTF-8 FNV-1a of the string `pr-mapgen-0.3|templateId|masterSeed|streamName|attempt`. Start at 2166136261; for every byte xor then multiply by 16777619 with `Math.imul`, converting to uint32. If a derived state is zero, substitute `0x6d2b79f5`. This is a deterministic identifier/PRNG seed mechanism, not a security hash.

Each stream uses xorshift32 with shifts 13, 17 and 5, converting the final state to uint32. For bounded draws, the nonzero xorshift32 output domain has M = 2^32 - 1 values: set `sample = nextUint32() - 1`, reject samples at or above `M - (M mod n)`, and return `sample mod n`. Validate n is an integer from 1 through M. This avoids treating the excluded zero state as a possible draw; no bound in this generator requires n = 2^32. Never rely on `Math.random()`, current time, locale string ordering, frame count, asynchronous completion order or GPU noise for logical generation.

Separate streams: `road_ties`, `terrain`, `decor`, and `tactical_layout`. Combat outcomes and hero skill offerings use different saved streams outside map generation. Changing a tree texture, display resolution, model LOD or animation quality must not change a road, reward, AI plan or combat RNG state.

The golden mission chooses canonical road tie order, regardless of `road_ties`. Variation mode may randomize shortest-path ties as described. Every accepted logical result still records the actual map; a later generator version cannot regenerate it implicitly on load.

## 6. Required validation

| ID | Check | Reject or report |
| --- | --- | --- |
| MAP-01 | Every anchor is in bounds, uniquely identified and on its allowed terrain | Reject missing, duplicated or blocked anchors |
| MAP-02 | Every road edge connects adjacent legal hexes and is symmetric | Reject diagonal/index mistakes |
| MAP-03 | With all logical gates open, every required site is reachable from town | Reject disconnected maps |
| MAP-04 | M01/M02 bridge/pass closed disconnects the final region | Reject guard bypass |
| MAP-05 | M03 both first crossings closed isolate middle region; opening either reaches both relays | Reject mandatory double-guard requirement or bypass |
| MAP-06 | M03 ward gate remains closed with zero/one relay, open with both | Reject story-gate bypass |
| MAP-07 | Optional guards are not required on every path to a mandatory objective | Reject accidental compulsory detours |
| MAP-08 | Starting Sawmill/Quarry and return to town are reachable without optional encounters | Reject economic recovery failure |
| MAP-09 | Required building chains/costs, local destinations and unique rewards form an acyclic dependency graph | Reject a resource/covenant locked behind itself |
| MAP-10 | All encounter and reinforcement forms exist and have exactly one paired counterpart | Reject third/unpaired forms |
| MAP-11 | Route previews use actual edge costs, not rendered distance or a movement slider | Reject mismatch |
| MAP-12 | Starting visibility uses hero radius 5 and town radius 3; stories reveal only specified coordinates | Reject leaked hidden state |
| MAP-13 | Cosmetic seed or quality changes leave the logical map hash unchanged | Reject generation/presentation coupling |
| MAP-14 | Gold/Favor/growth payouts are not executed by scene creation or save reload | Reject duplicate initialization |
| MAP-15 | Actual patrol paths remain inside its region and obey ordinary movement/vision | Reject teleporting or omniscient behavior |

Proposed all-gates-open route-cost ceilings: M01 town->bridge->beacon <=1,500 MP; M02 town->pass->nest <=1,800 MP and nest->town <=1,800 MP; M03 town->either first crossing->both relays->ward gate->beacon <=4,000 MP. These bound the intended route, not the whole player's mission, and do not imply it fits one day. Required return trips, building days and battles remain real.

Generation validation can establish connectivity and arithmetic, not a guaranteed tactical victory. Run separate deterministic battle simulations and player tests to tune the stated encounter quantities. A ratio of army HP is not proof that a battle is fair.

## 7. Failure and fallback policy

Try at most 16 bounded candidates for a selected variation seed. Preserve the user's requested seed and the chosen attempt index. If all fail, load the shipped reviewed golden logical map for that same mission/rules version and clearly record the fallback in diagnostics. Never silently remove a guardian, give free troops, widen a required gate, or change an objective to make validation pass.

Shipping a golden fallback requires exporting and testing it first. This documentation provides its templates/anchors, not a claim that its production JSON or Babylon scene has already been built. An invalid or missing golden fallback is a build failure, not an excuse to continue with an empty map.

## 8. Tactical maps

Use the existing 15 x 11 odd-row-offset combat rules and two-hex footprint validation. Each campaign encounter references a small battlefield archetype: coast road, ridge pass, grove, plateau, or beacon clearing. Optional visual clutter must not add new projectile-cover mechanics absent from v0.2.

Protect each side's deployment zone and expanded Tactics zone. Every initial stack must have a legal placement; both ground armies need at least one route into melee contact; flying units need legal landings. Reserve a two-hex-wide movement corridor where required. Use an empty-board fallback for an invalid decorative obstacle arrangement, not a forced victory.

Guard and final-commander quantities come from the campaign, not the tactical-layout stream. No town-wall template is used for the final open-field beacon battle. Battlefield animation speed cannot affect generated obstacles or battle seed.

## 9. Generation pseudo-interface

```text
generateMission(template, seed, content, rules, mode):
    validateDefinitions(template, content, rules)
    for attempt in 0..15:
        streams = deriveStreams(seed, template.id, attempt)
        map = buildMasksAndReserveAnchors(template)
        if not carveDeclaredRoads(map, template.edges, streams.road_ties, mode): continue
        addNonBlockingTerrainVariation(map, streams.terrain)
        attachExactSitesEncountersAndInitialState(map, template, content)
        report = validateLogicalMapAndDependencyGraph(map, template, rules)
        if report.valid:
            visuals = buildPresentationManifest(map, streams.decor)
            return freezeVersionHashAndPackage(map, visuals, report)
    return loadAndValidateGoldenFallback(template.id, rules.version)
```

Run this in a worker. Its output is data, not a Babylon scene. The authoritative mission state is committed only after generation and validation succeed. Desktop and browser must produce identical canonical logical hashes for the same versions, seed and mode.

## 10. Developer tooling and acceptance corpus

Provide an internal map-review mode with layers for coordinates, road edges, blocked cells, objective dependency states, fog, sites, threat labels, and patrol permissions. It is not visible in normal player mode. Export the actual generated JSON and validation report for reproducible bug reports.

Before release, test the three golden maps, at least 1,000 variation seeds per mission, boundary seeds (0, 1, 2^32-1), both god paths, gate-state combinations, and save round trips. These are future acceptance tests, not reported test results. Store each failing seed with the generator/content versions and reproduce it without graphics.
