# S01 - Main Menu, Resume, and Pause Flow

> v0.3 production overlay: use the adopted 2D (PixiJS sprites and painted backgrounds)/React presentation and the [three-level campaign](../campaign/01_the_three_beacons.md). The functional menu contract below is retained; art/audio specifics are proposed in [the element inventory](../production/04_environment_towns_ui_and_audio.md).
**Status:** P. The earlier S01 Landing technically existed, but it was a review-demo entry rather than a fully specified game front door. This expands S01 without renumbering the other screens. Visual style and music remain undecided.

## Main menu purpose

Let the player resume confidently, begin a new match, learn about creatures, or configure the experience without entering a fake expedition. The review sidebar is a developer/reviewer tool and is hidden in ordinary game mode.

Logical layout:

```text
GAME TITLE / VERSION
[ Continue: scenario, hero, week/day, saved time ]
[ New Game ]   [ Load Game ]
[ Encyclopedia / Bestiary ]
[ Settings ]  [ Credits ]  [ Quit - native desktop only ]
Save/storage status and compact help
```

> **Owner decision 2026-10-03:** no Credits entry; Campaign and Skirmish are reached through New Game only. The pause overlay (D01) has no logo, no Quit to Desktop and no close button — Resume or Esc returns to play; quitting goes through the main menu.

The title/menu is functional before final background art exists. An optional brief splash can precede it, but does not need a separate full-screen feature or a mandatory animation. First launch must not force an account, online connection, or personal-data entry.

## Actions and destination contracts

| Action | Behavior | Disabled / edge state |
| --- | --- | --- |
| Continue | Resume the most recent compatible playable checkpoint; show scenario, faction, hero, world date, save timestamp, rule version | No valid save: disabled with reason, not an empty expedition |
| New Game | Open S02 mode selection, then S03-S05 as applicable | Starting a new match never silently deletes existing saves |
| Load Game | Open D02 save browser with metadata and compatibility status | Corrupt/incompatible file remains visible with a helpful explanation |
| Encyclopedia / Bestiary | Open S16 without an active match | Base content only; no invented contextual stack stats |
| Settings | Open S17 with return target S01 | Settings work without a match |
| Credits | Show local credits, source/asset acknowledgments when available | No fabricated production credits |
| Quit | Confirm only when an active unsaved session would be discarded | Native desktop only; browser hides this action rather than promising to close the tab |
| Multiplayer | Omit from playable menu until supported, or explicitly label Planned in review builds | No fake matchmaking or login flow |

A screenshot thumbnail is optional. Textual save metadata is required so a player does not need to recognize an image. A read failure must not overwrite or delete the failed save.

## D01 - In-game pause/menu overlay

Accessible from the Adventure Map and combat through Escape or a labeled menu control. Its contents differ from the main menu:

**Resume**, **Save**, **Load**, **Settings**, **Encyclopedia**, **Restart scenario**, **Return to Main Menu**. Native builds may also include Quit. The overlay does not advance the day or tactical action order. In an action-resolution lock, pause after the authoritative action finishes rather than interrupting half a transaction.

Save is available only outside unresolved combat and after mandatory reward/level choices in the first implementation. Explain the reason when unavailable. Load, Restart, and Return to Main Menu require confirmation when progress would be lost. Confirmations state the last checkpoint and do not use vague 'Are you sure?' text alone. Returning to the main menu does not imply saving.

Opening settings or a unit page from pause preserves its return stack: close unit page -> pause -> same battle/map state. Escape closes the topmost non-mandatory layer; it does not skip an unresolved required level-up or overwrite confirmation.

## D02 - Save/load browser

Each row: slot name, scenario, faction, hero, world day/week, timestamp, rule version, manual/autosave label, and compatibility. Actions: load, create manual save, rename supported local slot, delete with confirmation, export/import where the platform supports those features.

Use three rotating autosave slots plus five manual slots as the initial UX proposal; save capacity is not a gameplay rule. Autosave at a safe dawn checkpoint and before an eligible major encounter, never during a partly applied transaction. Keep game settings separate from save files. An incompatible v0.1 demo save must not be loaded as v0.2 by guessing values.

Storage is platform-dependent. A browser implementation must distinguish unavailable/denied storage from 'no saves' and should provide file export as a fallback. Do not claim cross-device synchronization or cloud saving without implementing it.

## States, accessibility, and checks

First launch, existing save, unsupported version, missing scenario/content, corrupt save, loading, storage denied, and active unsaved match are separate states. Keyboard navigation has a visible focus; Continue is the initial focus only when valid, otherwise New Game. Controls have text labels, not icons alone. No mandatory moving background; reduced motion uses a static frame.

Acceptance: start with no save; create a game; save; return; Continue restores exact state. Settings and bestiary must also work from a fresh menu with no match. Canceling New Game/Load/Restart leaves the previous session unchanged. A double-click on Continue cannot create two active simulations.
