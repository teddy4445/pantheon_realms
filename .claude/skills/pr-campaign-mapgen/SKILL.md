---
name: pr-campaign-mapgen
description: "Implement, validate, or debug the Three Beacons campaign, mission state, carryover, seeded map generation, route previews, story gates and resource dependencies in Pantheon Realms. Use for mission manifests, golden seeds, blocked-route bugs, procedural decoration, optional encounter placement and campaign save transitions. Keep logical generation independent of PixiJS and preserve every creature pair."
---

# Campaign and Map Generation

Read [project-contract.md](references/project-contract.md), then `docs/pantheon-v0.3/campaign/01_the_three_beacons.md` and `campaign/02_map_generation_specification.md` in full for the mission being changed. Do not reconstruct encounters from a screenshot.

## Workflow

1. Load the mission manifest, exact anchors, road graph, barriers, resource/upgrade requirements, objectives and carryover policy.
2. Build the logical map before any scene. Adventure coordinates are axial; the tactical board is a separate 15-by-11 odd-row-offset geometry. Make conversions explicit.
3. Reserve mandatory anchors, approach clearances and gates. Carve roads only through permitted terrain/openings using the documented ordering.
4. Vary approved non-critical terrain and cosmetic detail from independent streams. Do not randomize mandatory armies, rewards, objectives or economic prerequisites by implication.
5. Validate every gate-state combination and dependency cycle before committing a mission. Preserve the prior checkpoint on cancellation/failure.
6. Serialize the actual map, versions, seed, attempt and canonical hash. Loading must not regenerate it with a newer algorithm.

## Mission invariants

- M01: 20 x 14, seed 170101; the guarded bridge is the only eastern crossing.
- M02: 26 x 18, seed 170202; the ridge pass gates the far region; local return for Windcrest training remains real.
- M03: 30 x 20, seed 170303; either first crossing reaches both relays; the final gate needs both relay flags.
- All gates open: required sites reachable. All relevant gates closed: no bypass, including diagonal hex movement.
- Sawmill/Quarry recovery and town return cannot depend on an optional encounter.
- Scenario triggers and rewards are idempotent. A new scene grants no income, stock or XP.
- Named final enemies reuse existing forms, not a third upgrade.
- Retry at most the documented bound; fallback only to a shipped, version-matched validated golden map.

## Evidence

Run the three golden maps, boundary seeds, gate combinations, save round trips, and a stated variation corpus. The release goal of 1,000 seeds per mission is a future acceptance target until executed. Compare browser/desktop logical hashes. Connectivity and budget arithmetic do not prove tactical balance; report battle simulations/playtests separately.

Output changed manifests, generator code, gate/dependency tests, failing seeds, canonical hashes, and remaining playtest work.
