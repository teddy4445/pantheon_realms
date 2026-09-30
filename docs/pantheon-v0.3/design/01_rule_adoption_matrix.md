# Adoption Matrix - What We Borrow and What We Keep Original

**Status:** P. The user asked to learn from Heroes III; no individual new value is automatically approved. The following is one coherent candidate profile, not a menu of undocumented alternatives.

| System | Heroes III reference | Earlier Pantheon demo | Proposed Pantheon v0.2 | Why / consequence |
| --- | --- | --- | --- | --- |
| Resources | Seven economic resources | Gold, Wood, Stone, Crystal, Favor | Retain those five | Lower economic complexity; rare-resource compression is an explicit departure |
| Income | Hall ladder and controlled mines | Council Hall 400/day | Hall ladder 500/1,000/2,000/4,000 | Makes investment and field-army spending comparable |
| Construction | One immediate building per town/day | One multi-day active project | One immediate building or upgrade per town/day | No active construction timer or queue remains |
| Growth | Weekly town pools | Weekly plus fixture-specific grants | Seven-day weeks; base grant on dwelling creation; explicit weekly multiplier | Prevent double grants from view opening or upgrading |
| Recruitment | Town population plus payment | Four unit types, direct/garrison recipients | Shared base/upgrade family pool and explicit recipient | Purchases remain atomic |
| Production | Seven fixed faction tiers | Small Greek sample | Four core tiers plus three covenant tiers | Preserves exploration-driven roster choices |
| Army | Seven stacks | Seven stacks | Seven slots, unlimited count within technical bounds | No unsupported Leadership population cap or upkeep |
| Hero role | Off-grid commander | Off-grid commander | Keep | No hero Health or personal melee attack |
| Primary stats | Attack, Defense, Power, Knowledge | Six primary-looking fields | Four primary stats; movement derived; Leadership a skill | Removes ambiguity between tactical Speed and adventure movement |
| Skill level-up | Up to two choices, eight skills | Three choices in fixture | Two offers, three ranks, eight learned skills | Deterministic offering contract for tests |
| Tactical order | Speed and wait phases | Independent initiative, wait at queue end | Speed-based rounds; waiting phase reverses speed priority | Turn-order preview must match actual scheduling |
| Movement/attack | Walking plus legal melee | Move OR attack | Move plus melee; shooting stationary unless ability says otherwise | Removes a major difference in battle feel |
| Defend | +20% Defense | Half damage | +20% effective Defense, rounded up | Not a universal damage shield |
| Damage | Attack/Defense difference and modifiers | Fixed damage / defense divisor | Capped difference formula with ranges | Small and large stacks use the same calculation |
| Morale/Luck | Probabilistic, bounded | Morale largely informational | Explicit seeded morale/luck model | Animation cannot consume these RNG streams |
| Town capture | Changes ownership and military/economic control | No rival empire | Retain structures/pools; preserve daily build use | Capturing is not a free second build |
| Fog | Classic exploration model | Unknown/remembered/current visibility | Keep three states | Our information model, not a compatibility claim |
| Mythology | Fantasy factions | Zeus, Athena/Ares, Griffin Covenant | Keep and extend with explicit scope | Gods are player-wide; covenants are assigned per town |
| Unit biography | Reference game has unit info | Small encyclopedia | Searchable codex plus animated S18 detail | History, fictional lore, stats, and context are separated |

Reference facts are sourced in [the reference section](../reference/01_sources_and_version_scope.md). The rightmost two columns are our design choices.

## The five review decisions that matter most

1. Confirm instant construction versus retaining the original timed system. The candidate documents below assume instant construction throughout.
2. Confirm five resources rather than seven economic resources plus Favor. The five-resource version compresses strategic scarcity and will require its own balance pass.
3. Confirm the seven-tier/four-core/three-covenant production pattern and the limited initial roster.
4. Confirm the four-primary-stat, eight-skill hero model and the Speed-based combat/action rules.
5. Confirm how much of the larger blueprint belongs in the next playable slice. Do not confuse a complete specification with a single development sprint.

These are review topics, not repeated requests for clarification. All downstream documents specify a usable candidate answer so development can proceed once authorized.

## Non-negotiable design consistency

A construction queue must not remain in one screen if the rule is immediate construction. A unit's initiative must not remain a separate number in a card when the combat rule uses Speed. A unit-detail attack preview must not display a damage calculation different from the battle engine. A god choice must not be treated as both town-specific and player-wide. Every active table in this package belongs to rule profile `pr-0.2-candidate`.
