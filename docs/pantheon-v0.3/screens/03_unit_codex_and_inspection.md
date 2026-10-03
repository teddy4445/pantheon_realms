# S18 - Unit Detail, Animated Bestiary, and Contextual Inspection

> v0.3 production overlay: all eight Greek families have a base and exactly one upgrade. Their animated sprite previews (PixiJS, since the 2D migration of 2026-10-03) use the [paired-creature bible](../production/03_creature_pairs_and_animation_bible.md); the 2D viewer described below is the chosen production renderer.
**Status:** P. This is the newly requested unit-information experience. S16 is the searchable reference index; S18 is the focused unit page. A lightweight D03 inspector provides the same facts within hero, town, recruitment, and battle views.

## 1. What the player should learn

What is this creature? What can it do? What does it cost? How do I unlock or upgrade it? Why is it useful in my army? What changes in the current battle? What is drawn from mythology or history, and what is original fiction?

The screen must answer those questions without requiring the player to infer mechanics from an animation or decorative story.

## 2. Entry points and navigation

Enter from S16 search/results, a creature card in S07 Hero, S08 Town, S09 Recruitment, an S11 battlefield stack or initiative portrait, a reward preview, or a linked covenant/building. The caller supplies context and a return route; the unit page never assumes a live match exists.

Click or focus a unit card and use **Inspect** for D03, then **Open full entry** for S18. Do not require right-click alone. Back returns to the exact selected hero, town, recruitment quantity, or battle stack without committing a purchase or losing a planned route.

Example: Recruitment -> inspect Griffin -> compare upgrade -> read covenant requirement -> Back -> same Griffin quantity and destination. Clicking a building link opens a read-only requirement view, not an automatic build.

## 3. Logical page layout

```text
[Back]  Griffin / Greek / Tier 3 / Flying interceptor   [Compare]

[Animated sprite]            [Base / Current context stats]
[Idle | Move | Attack ...]  [Attack, Defense, HP, damage, Speed]
[Play/Pause | base/upgrade] [Shots, footprint, retaliations, morale]

[Abilities] [Recruitment & upgrades] [History & mythology] [Game lore]

Source/status badge | content implementation state | related entries
```

Keep unit name, tier, role, variant, and essential stats visible without scrolling on the target desktop layout. On smaller viewports the animation collapses above a vertically flowing details panel. Decorative space must not push the unit's cost below several screens of lore.

## 4. Base data versus a live stack

**Base mode**, including main-menu browsing: shows a single full-health creature's defined Attack, Defense, HP, min/max damage, Speed, shots, footprint, abilities, base weekly growth, cost, and upgrade. No pretend hero bonuses or troop count.

**Current context mode** appears only when a legitimate hero/town/battle stack was supplied. It adds count, total current HP, leading creature's HP, remaining ammunition/retaliations/charges, current statuses and expiry, effective Attack/Defense/Speed, and visible modifier breakdowns.

| Field | Example and interpretation |
| --- | --- |
| HP per creature | Griffin: 25; not the whole stack's health |
| Quantity | 8 Griffins |
| Total current HP | 183 / 200; leading creature 8 / 25 |
| Base damage per creature | 3-6 |
| Stack base damage range | 24-48 before attacker/target effects |
| Effective Attack | 8 base + 2 commander + 1 Ares = 11 |
| Retaliations | 1 of 2 remaining this round; not 'unlimited' |
| Weekly growth | 7 base; 10 next week in a Citadel town, if still eligible |

These examples are arithmetic fixtures, not a current player's save. Effective values come from the shared resolver, not repeated manual text.

Damage prediction against a target is a separate panel: it requires a selected legal target and uses the battle engine's known-information view. Label uncertain ranges. An enemy inspect action may show the public species entry and observed stack information, but not unseen hero inventory, private skills, fogged reinforcements, or hidden effects.

## 5. Abilities tab

Every ability has a name, short purpose, exact rule, activation/passive label, cost, range, target type, duration, charges, and exceptions. Show an example of the relevant action when useful. 'Powerful charge' is insufficient: show the +5%-per-hex capped modifier and that Hoplites negate its charge component.

Shared charges must be obvious. Temple Seer displays **Ward: 1 charge shared by this army's Temple Adept family**, not '1 per creature'. A unit with no active ability displays its passives and normal actions rather than an unexplained empty toolbar.

## 6. Recruitment, growth, and upgrade tab

Show per-unit resource price; current selected-town stock when available; base and next-week growth; required dwelling; covenant and god requirements; and the exact base-to-upgrade price difference. No selected owned town means generic requirements, not invented availability.

Status chips distinguish: obtainable and affordable; obtainable but unaffordable; requires a building; requires covenant; excluded light-slot choice; no population; not implemented in this build. A locked entry can still teach the player what it is without granting access.

**Compare** pins at most two forms/families side by side with the same stat order and explicit differences. A price comparison includes Crystal, not just Gold. A unit in a different role is not assigned a fake universal 'better' score. Do not double-count base/upgrade growth as separate production.

## 7. History and fiction tabs

**History & mythology** gives a concise factual or literary-source note, its tradition/context, source reference, and a status badge: verified note, draft requiring review, or original invention. **Game lore** contains the fictional biography from this project's content files. Never label our repeat-recruitable Minotaurs as a literal ancient account of a widespread Minotaur civilization.

For a non-historical invented class such as Temple Adept, state that its combat magic and institution are original game fiction. Do not manufacture a source merely to fill the tab. An upgrade can have its own game-lore sentence while sharing the base family's source note.

## 8. Animation viewer

Offer only states that exist for this unit: Idle, Move/Fly, Melee, Shoot, Ability, Hit, Defeat, Victory. Idle may loop if the user's motion setting permits it. Attacks/abilities/defeat play only on request and return to idle or a static frame. A ranged animation does not authorize an extra gameplay attack.

Strips are authored facing right and may be mirrored; switch between the base and upgraded form with the same state selected. Do not display a rotation control for a sprite. Show loading/missing-asset fallbacks without hiding stats. Playback has Pause, Stop, speed selection, and a static-image alternative. The [animation contract](../content/02_animation_behavior_contract.md) is authoritative for behavior.

No animation preview advances simulation, consumes mana, spends ammunition, applies a status, or consumes gameplay RNG. Keep only one unit viewer active; comparison uses still portraits unless the player deliberately selects one side to animate.

## 9. S16 index and D03 compact inspector

S16 supports search by name, family, and ability; filters for faction, tier, role, base/upgraded form, and implemented/planned status. Categories include Creatures, Gods, Buildings, Spells, Artifacts, Rules. A zero-result state shows the active filters and Clear filters. Browsing the codex never reveals scenario-specific hidden locations.

D03 prioritizes name/form/count, effective known stats, current statuses, and the most important ability. It offers Open full entry and Close. In battle it must not obscure the selected target confirmation or automatically commit an action. Its default is a still portrait, not a resource-heavy looping viewer on every hover.

## 10. Acceptance examples

From the main menu, open any implemented unit and see base stats without a match. From a hero stack, see the same base values plus derived bonuses. An injured eight-Griffin stack shows 183/200 and 8/25, not eight wounded creatures. Changing a stat definition updates codex, recruiting, and battle display together. Closing an entry preserves recruitment quantity. Searching reveals no private army data. Pausing or disabling animation leaves all information accessible. A missing animation shows a labeled fallback rather than a broken screen.
