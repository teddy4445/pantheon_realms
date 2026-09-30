# Acceptance Tests and Worked Examples

**Status:** P - executable acceptance requirements for later development, plus arithmetic examples evaluated while preparing this document. The game behavior below has NOT been implemented or tested by this documentation task.

## A. Closed 14-day economy ledger

This is a deliberately controlled fixture, not a recommended opening or a normal-save claim. Start Day 1 with **10,000 Gold, 30 Wood, 30 Stone, 10 Crystal, 10 Favor**; Village Hall, Tavern, Fort, Barracks; an owned Sawmill and Quarry; and an already-earned, unassigned Griffin Covenant. Hero remains at town. No gold mine, treasure, combat income, trade, or hidden resource gift is used. These fixture assumptions differ from the ordinary starting setup's unowned mines and 20 Wood/Stone.

Income arrives before that day's purchase. The Hall upgrade changes the following dawn's income. Temple income starts at the following dawn. Assign the already-earned Griffin Covenant before the Aerie purchase on Day 12; assignment is not a second building. No divine pledge is purchased in this ledger, so Favor is not spent.

| Day | Gold income at dawn | Action | Closing Gold | Wood | Stone | Crystal | Favor |
| --- | ---: | --- | ---: | ---: | ---: | ---: | ---: |
| 1 | 0 | Town Hall | 7,500 | 30 | 30 | 10 | 10 |
| 2 | 1,000 | Market | 8,000 | 27 | 32 | 10 | 10 |
| 3 | 1,000 | Workshop | 8,000 | 24 | 34 | 10 | 10 |
| 4 | 1,000 | Sanctum I | 7,000 | 21 | 31 | 10 | 10 |
| 5 | 1,000 | City Hall | 3,000 | 23 | 33 | 10 | 10 |
| 6 | 2,000 | Peltast Range | 4,000 | 20 | 30 | 10 | 10 |
| 7 | 2,000 | Citadel | 3,500 | 22 | 27 | 10 | 10 |
| 8 | 2,000 | Castle | 500 | 14 | 19 | 10 | 10 |
| 9 | 2,000 | Temple I | 1,500 | 16 | 16 | 10 | 10 |
| 10 | 2,000 | Temple II | 1,500 | 13 | 8 | 7 | 11 |
| 11 | 2,000 | Training Court | 1,500 | 10 | 5 | 7 | 13 |
| 12 | 2,000 | Griffin Aerie | 1,500 | 7 | 2 | 7 | 15 |
| 13 | 2,000 | Recruit 10 Hoplites, 9 Peltasts, 2 Cavalry, 2 Griffins | 820 | 9 | 4 | 7 | 17 |
| 14 | 2,000 | No purchase | 2,820 | 11 | 6 | 7 | 19 |


At Day 8 dawn the town has a **Citadel**, not yet a Castle, so Hoplite growth is 21 and Peltast growth 13. With initial pools of 14 and 9, the pools become 35 and 22. The Castle bought later that day does not change those additions. The new Training Court adds 4 Cavalry on Day 11; the new Aerie adds 7 Griffins on Day 12. Day 13 purchases leave 25 Hoplites, 13 Peltasts, 2 Cavalry, and 5 Griffins in their pools. Day 15 Castle growth would add 28, 18, 8, and 14 respectively, assuming the same ownership/buildings.

This checks affordability and boundary interpretation only. It is not a simulated opponent, a winning strategy, or proof that the town progresses at an enjoyable pace.

## B. Damage and casualty examples

All examples choose a declared base-damage roll and no unmentioned buffs. Use the shared formula; do not infer that those rolls are guaranteed in play.

1. **Positive Attack difference:** 20 Hoplites with chosen B=40, effective Attack 6 against Defense 4. Bonus = 0.10; damage = floor(40 x 1.10) = **44**.
2. **Defense advantage:** B=40, Attack 6 against Defense 10. Reduction = 0.10; damage = **36**.
3. **Defend is not half damage:** target Defense 10 becomes ceil(12)=12. Against Attack 6, reduction = 0.15; B=40 gives **34**, not 20.
4. **Additive Luck/Offense:** B=100, Attack bonus 0.20, Offense bonus 0.10, successful Luck bonus 1.00. Damage before reductions = **230**, not 260.
5. **Stacked reductions:** B=100, equal Attack/Defense, long-range factor 0.5, wall factor 0.5, Armorer factor 0.85 gives floor(21.25)=**21**.
6. **Casualty conservation:** eight Griffins have 200 HP. Take 67 damage -> 133 HP -> six Griffins with front HP 8/25. Deaths = two; a surviving battle-end army has six full-health Griffins, not eight. A preview at 183 HP instead contains eight Griffins, front HP 8/25.
7. **Upgrade cost:** 12 Hoplites -> Veterans spends **180 Gold**, no population. Two Cyclopes -> Stormforged spends **3,000 Gold + 2 Crystal**.
8. **Growth rounding:** 9 x 1.5 gives **13**, not 14; 1 x 1.5 gives **1**, not 2. Castle gives 18 and 2 respectively.

## C. Given/When/Then acceptance checklist

### Economy, construction, and growth

| ID | Given / when | Required result |
| --- | --- | --- |
| ECO-01 | Town has enough resources and unused daily build; buy a legal building | Full cost once; building active immediately; used-day marker set |
| ECO-02 | Try a second building the same day | Rejected; no partial spending |
| ECO-03 | Capture a town already built in today | Ownership changes, allowance stays used |
| ECO-04 | Upgrade Village Hall to Town Hall | Next dawn pays 1,000 total, not 1,500 |
| ECO-05 | Open/close town or load a dawn checkpoint repeatedly | No extra income, growth, or population grant |
| ECO-06 | Build a dwelling on Day 7 | Base stock once now; normal weekly growth once at Day 8 |
| ECO-07 | Build its upgrade | No new stock; base/upgrade share the family pool |
| ECO-08 | Build Castle after Day 8 growth | No retroactive extra recruits |
| ECO-09 | Buy with insufficient Crystal but enough Gold | Entire operation fails, not partial Gold loss |
| ECO-10 | Trade repeatedly in any supported market tier | No profitable sell-buy cycle from the same resource |

### Armies, recruitment, and heroes

| ID | Given / when | Required result |
| --- | --- | --- |
| ARM-01 | Hero is away; recruitment chooses that hero | Disabled with local-presence reason; garrison remains possible |
| ARM-02 | Buy matching form into a full seven-slot army | Merge allowed if exact-form stack exists; otherwise reject |
| ARM-03 | Partially upgrade a stack with no spare/merge slot | Reject without spending |
| ARM-04 | Split/merge/transfer all stacks through legal operations | Total count conserved; movement/charges not refreshed |
| ARM-05 | Town has Griffin light covenant; try Centaur assignment | Excluded; no second tier-3 production line |
| ARM-06 | Rehire an existing returned hero | No new starting-army gift; documented recovery rules apply |
| ARM-07 | Reopen an earned level-up | Same persisted offers; XP and primary gain not reapplied |
| ARM-08 | Eight skills all at maximum | Primary gain still applied; acknowledgment instead of impossible choices |

### Combat and persistence

| ID | Given / when | Required result |
| --- | --- | --- |
| BAT-01 | Enemy lies within move-to-adjacency distance | One legal activation can move and melee |
| BAT-02 | Shooter attempts move plus shot | Rejected unless an explicit ability authorizes it |
| BAT-03 | Several stacks Wait | Normal phase finishes first; waiting phase uses slow-to-fast snapshot |
| BAT-04 | A defending stack is attacked repeatedly | +20% rounded Defense; no blanket 0.5 factor |
| BAT-05 | Normal defender is struck twice in a round | One retaliation; Griffin up to two; Windcrest subject to no count cap |
| BAT-06 | Defender dies to first strike | No retaliation from the removed stack |
| BAT-07 | Six Seers split into several stacks | One shared family Ward charge, not one per split stack |
| BAT-08 | Morale grants extra activation | No recursive morale, extra wait, or retaliation reset |
| BAT-09 | A two-hex flyer has only one free landing hex | Landing rejected; not squeezed into one hex |
| BAT-10 | Preview damage repeatedly before attacking | RNG state unchanged; actual legal calculation uses the same formula |
| BAT-11 | Same seed and actions at 1x versus Instant animations | Identical actions, logs, casualties, resources, XP, and RNG state |
| BAT-12 | Reopen battle result or reload completed reward state | Rewards and casualties remain applied once |
| BAT-13 | Close settings during unresolved battle | Return to same round/activation; no day advancement |
| BAT-14 | Siege visitor plus garrison exceeds seven stacks | Explicit defender selection; reserves/outcome warning shown |
| BAT-15 | Kill a summoned unit or heal a front creature repeatedly | No permanent-unit XP, Favor, or recruit duplication |

### Menus, settings, and unit information

| ID | Given / when | Required result |
| --- | --- | --- |
| UI-01 | Fresh install with no save | Continue disabled; New Game, settings, and codex usable |
| UI-02 | Incompatible/corrupt save selected | Explain, preserve file, no guessed migration |
| UI-03 | Preview settings then Cancel | Restore committed values, including volume/text preview |
| UI-04 | Load a match after changing motion preference | Preference stays; saved game does not overwrite it |
| UI-05 | Large text and keyboard-only navigation | All required controls remain reachable; no clipped confirmation |
| UI-06 | Open Griffin from a menu versus live hero stack | Same base data; contextual fields only when authorized |
| UI-07 | Open injured stack details | Correct per-creature HP, front HP, total HP and count |
| UI-08 | Inspect an enemy with hidden modifiers | No inventory/skill leak through codex or damage log |
| UI-09 | Close full unit page opened from recruitment | Same town, quantity, form, destination, and scroll context |
| UI-10 | Missing animation or reduced motion | Usable still portrait and complete information |
| UI-11 | Switch/compare units rapidly | One active viewer; no orphan animation/audio loops |
| UI-12 | Play attack/defeat in unit viewer | No combat action, resource change, RNG use, or reward |
| UI-13 | Reset preferences or review notes | Match saves and owner approvals are not deleted/invented |
| UI-14 | Edit search text while gameplay shortcuts exist | No unintended move, end-day, or Defend command |

These are future tests to implement, not a report that the game passed them. Actual documentation checks are listed separately in [the validation report](04_document_validation.md).
