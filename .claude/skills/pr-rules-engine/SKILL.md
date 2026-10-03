---
name: pr-rules-engine
description: "Implement or review Pantheon Realms headless TypeScript rules, economy, combat, calendars, recruitment, creature upgrades, saved state, or command validation. Use for rule changes, shared stat/price calculations, casualty accounting, replay determinism and idempotency bugs. Preserve current candidate-rule provenance and keep rules independent of React, PixiJS, Electron, network APIs and presentation timing."
---

# Deterministic Rules Engine

Read [project-contract.md](references/project-contract.md). Load the current `design/02_economy_calendar_and_recruitment.md`, `design/04_combat_specification.md`, `design/05_heroes_logistics_and_magic.md`, and `content/03_exactly_one_upgrade_contract.md` under `docs/pantheon-v0.3/` as relevant.

## Workflow

1. Locate the authoritative state, command validator, content definitions and tests. Identify the version of the rule being changed.
2. Specify preconditions, cost quote, mutation, emitted immutable events, failure reason, and persistence effect. Validate all preconditions before any mutation.
3. Implement in TypeScript without DOM, PixiJS, Electron, wall-clock randomness or renderer references. Use explicit integer/rational rounding and stable ordering.
4. Use saved gameplay RNG streams; never consume them to create previews, search rollouts, cosmetic effects or UI examples.
5. Add success, rejection, replay and repeated-command tests before connecting a view. Quotes and displayed outcomes must use the same calculation as commits.
6. Run the repository's actual tests. Save a regression seed and event sequence for probabilistic failures.

## Required invariants

- A repeated command ID does not pay, recruit, damage or reward twice; stale revisions are rejected.
- A world day advances only after the player-turn sequence, not during tactical rounds or animation.
- Proposed immediate construction uses a per-town/day marker; capture does not reset it.
- Family pools are shared by base and upgraded forms. An upgraded dwelling grants no extra initial population. Training pays the resource difference and changes no population.
- Exactly two forms per family; seven stack slots are not seven creature definitions.
- Off-grid hero commanders have no invented battlefield HP or adjacency buffs.
- Derived stats preserve base values; HP per creature, total stack HP and casualties remain distinct.
- Hidden information stays out of enemy inspection and preview models.

## Companion audit

Export a read-only aggregate compatible with `tools/pantheon-dev/fixtures/creature-pairs.valid.json`. Run `node tools/pantheon-dev/audit.mjs catalog <relative-json-path>` or the `validate_creature_pairs` MCP tool. The aggregate is a test adapter, not a requirement to change the production schema. A topology pass is not a balance pass.

## Output

Return the rule-version/source, changed code and tests, exact commands/results, replay evidence, migration implications, and any unresolved mechanics. Never cite old-demo tests as evidence for the new rule profile.
