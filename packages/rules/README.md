# @pr/rules — authoritative rules core

The only place game rules live. Pure TypeScript with no DOM, Node, React,
Babylon or Electron imports.

* `definitions/` — immutable content **types** (the vocabulary content is written in).
* `state/match.ts` — `MatchState`, the plain serializable runtime record.
* `commands/`, `events/` — every requested mutation and every committed fact.
* `engine/` — `processCommand` (validate → handler on a draft → objectives/outcome → commit) and `Tx`.
* `resolvers/` — read-only derivations (town effects, requirements, hero modifiers, paths, vision).
* `systems/` — quote/commit pairs: economy, heroes, divine, quests, adventure, turn/dawn, battle.

Every UI legality question is answered by a `quote*` function that shares code with its commit.
