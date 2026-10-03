# Screen Inventory v0.2 - Stable IDs and Integrated Navigation

> v0.3: IDs remain stable. S03 includes three campaign mission nodes; briefing/debrief are supporting overlays. The adopted desktop/offline stack and all-screen visual assembly are specified in [production/01](../production/01_approved_stack_and_architecture.md) and [production/04](../production/04_environment_towns_ui_and_audio.md).
**Status:** P. Keep the old 17 IDs so existing review notes remain useful; add S18. 'Screen' describes a functional view, not a requirement to render every item as a separate full-window page.

> **Owner decision 2026-10-03:** S05 and S15 are removed from the game. Every pantheon has one implemented patron, preselected, so a campaign goes from S03 straight to its briefing and a skirmish from S04; the adventure map has no Overview button or screen. The IDs stay reserved so old review notes still read correctly. S18 shows one creature form per page (no base/upgrade switch; both forms open from the Encyclopedia).

| ID | Name | v0.2 responsibility / change |
| --- | --- | --- |
| S01 | Main Menu | Full resume/new/load/reference/settings entry; no debug sidebar in ordinary mode |
| S02 | Mode Selection | Working Skirmish; campaign/custom/multiplayer clearly gated |
| S03 | Scenario Setup | Map, opponents, rules, difficulty, victory, start resources; rule profile shown |
| S04 | Mythology Selection | Greek functional slice; other factions inspectable/planned |
| S05 | Patron Selection | Fixed Zeus in first slice; no false choice between major and minor gods |
| S06 | Adventure Map | Five resources, separate day/week, route preview, selection, end player turn |
| S07 | Hero / Army | Four primary stats, derived movement, eight skills, seven stacks; inspect via S18 |
| S08 | Town | Immediate build quota, dependency tree, income, garrison/visitor, weekly growth |
| S09 | Recruitment / Upgrade | Shared family pool, quantity, exact cost, local destination, S18 links |
| S10 | Pantheon | Player-wide commitment, Favor cost, exclusions, town-owned covenant context |
| S11 | Tactical Battle | Speed-based phases, move-plus-melee, real Defend, known damage preview |
| S12 | Battle Result | Persistent survivors, XP, loot, ownership, hero outcome; exactly-once resolution |
| S13 | Level-Up | Two legal offers where possible; queued levels; no reroll on reopen |
| S14 | Journal | Tracked quests, one-time claims, known locations, game lore |
| S15 | World Overview | Owned towns/heroes/mines, total income, unused build actions, threats known to player |
| S16 | Encyclopedia Index | Search/filter creatures, gods, buildings, spells, artifacts, and rules |
| S17 | Settings | Preferences independent of match rules; accessible, persistent, cancelable |
| S18 | Unit Detail | Animated/still viewer, base/effective stats, abilities, history, lore, recruitment/upgrades |

## Supporting dialogs

D01 Pause; D02 Save/Load; D03 Unit Inspector; D04 Encounter/Attack confirmation; D05 Cost/irreversible-choice confirmation; D06 Army split/transfer; D07 Victory/Defeat summary; D08 Credits; D09 Keybinding capture. These are not additional numbered campaign screens.

## Navigation contract

```text
S01 -> Continue / D02 -> S06
S01 -> S02 -> S03 -> S04 -> S05 -> S06
S01 <-> S16 <-> S18
S01 <-> S17

S06 <-> S07 / S08 / S10 / S14 / S15 / S16
S08 <-> S09
S07 / S08 / S09 / S11 -> D03 -> S18 -> original caller
S06 -> D04 -> S11 -> S12 -> S13 when required -> S06
S06 or S11 -> D01 -> S17 / S16 / D02 -> D01 -> original caller
Scenario completion -> D07 -> review map / next supported scenario / S01
```

Return context includes selected entity, camera, scroll position, tabs, draft quantity, and legal targeting state. It is not permission to preserve an invalid command after game state changes. If the underlying entity disappears, return to its parent with a clear message.

## Shared UI vocabulary

Use **World day**, **Your turn**, **Combat round**, **Stack activation**, **Movement points**, **Mana**, **Favor**, **Recruitment stock**, and **Weekly growth** consistently. 'Turn' alone is insufficient when multiple clocks exist. All costs come from the same content definitions; all effective stats from the same resolver.

Towns show 'build available / built today', not remaining construction turns. Battle cards show Speed, not a stale independent Initiative field. Heroes have no personal Health bar. Unit comparisons label per-creature damage and stack totals separately. The resource header always has the same five resources in the same order.

## Review build versus player build

The 1-18 screen-jump sidebar, isolated sample battles, and feedback export belong to a Review mode. Ordinary play uses real navigation and earned events. Samples are labeled, isolated, and cannot grant XP, recruits, or currency. A main-menu entry is not equivalent to loading a prefilled demo expedition.

Every screen handles loading, empty, unavailable, stale, and error states where relevant. A unavailable option explains why; it never pretends a future feature works. Screens cannot silently modify the simulation just by opening or displaying an animation.
