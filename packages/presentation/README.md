# @pr/presentation — Babylon.js scenes

One long-lived `EngineHost` and three scene controllers:

* `AdventureSceneController` — terrain, fog, roads, decor, sites, heroes, reachable area, path preview, picking, movement playback.
* `BattleSceneController` — hex board, stacks, highlights, playback of committed battle events.
* `UnitViewerController` — bestiary viewer with the states `idle, move, melee, ranged, defend, hit, defeat, victory`.

Controllers receive view models built from committed state and immutable events.
They never decide legality or change state. Placeholder geometry lives in `proxies.ts`;
final GLBs replace it per asset ID.
