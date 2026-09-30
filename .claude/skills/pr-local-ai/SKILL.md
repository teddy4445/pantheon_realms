---
name: pr-local-ai
description: "Build or review Pantheon Realms local strategic AI, adventure planning, tactical search, threat evaluation, worker communication, cancellation and deterministic simulation tests. Use when an opponent freezes the UI, cheats through fog, emits stale commands, or evaluates combat differently from the player. Do not add an online model dependency to ordinary gameplay."
---

# Local Strategy and Tactical AI

Read [project-contract.md](references/project-contract.md), the architecture's local-AI section, and the current combat/campaign rules.

## Workflow

1. Define the AI observation as an authorized player view. Do not pass the full hidden world and rely on convention to ignore it.
2. Separate strategic objective selection, route/reinforcement planning and tactical action scoring. Use the shared legal-action generator and combat resolver.
3. Send immutable snapshots to a worker with actor, revision, rules/content versions, planning seed and search budget.
4. Search cloned values with an independent planning RNG. Never mutate the live state or consume its gameplay RNG.
5. Return a proposed command to the same authoritative validator used by human input. Reject stale results and cancel obsolete work.
6. Provide a legal best-so-far fallback on timeout, failure or empty search; never invent a victory or bypass costs.

## Decisions worth modeling first

Evaluate path cost, resource access, reinforcement distance, opponent pressure, objective progress, likely attrition and home defense. In battle evaluate damage, retaliation, target access, ranged engagement, exposed landings, waits, Defend and spell opportunity costs. Treat ratios such as total HP as heuristics, not proven combat outcomes.

Use fixed node budgets and stable tie-breaks for automated tests. Live time ceilings can select a different best-so-far command; record that chosen command in the replay. Explain that replayed commands are deterministic without claiming wall-clock search itself is identical everywhere.

## Tests

Check legality of every emitted action; same observation/seed/node budget yields the same plan; changing hidden enemy data without changing observation cannot change the plan; stale replies are rejected; cancellation leaves state unchanged; worker crash does not end the match; forced low budgets still terminate. Exercise the finite M03 patrol with its actual region/vision permissions.

Output planner changes, heuristics, reproducible fixtures, timing on identified hardware, and losses or tactical gaps. Optimize only measured bottlenecks; do not create a second Python rules engine.
