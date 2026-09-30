# @pr/ai — AI players

ObservationBuilder → planner → command → `processCommand`.

* `observation.ts` — belief state: hides unseen heroes, other wallets/fog and unexplored sites.
* `strategic.ts` — scored candidates (level-ups, builds, recruitment, reinforcement, targets).
* `tactical.ts` — battle action choice from `legalActions` + damage previews.
* `controller.ts` — deterministic command IDs, step functions, full-turn runner.

The AI never writes state; every choice is validated like a human command.
