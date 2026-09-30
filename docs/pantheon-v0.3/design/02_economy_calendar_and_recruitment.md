# Candidate Economy, Calendar, and Recruitment Rules

**Status:** P. **Rule profile:** `pr-0.2-candidate`. These are Pantheon Realms rules, inspired by but not identical to [Heroes III](../reference/02_heroes3_economy_and_values.md).

## 1. Resource ledger

Store non-negative integers for exactly five resources:

| ID | Display name | Role | Ordinary producer / daily output |
| --- | --- | --- | --- |
| `gold` | Gold | Buildings, units, heroes, upgrades | Gold mine: 1,000 |
| `wood` | Wood | Construction | Sawmill: 2 |
| `stone` | Stone | Construction and fortification | Quarry: 2 |
| `crystal` | Crystal | Advanced magic and mythic production | Crystal deposit: 1 |
| `favor` | Divine Favor | Divine commitment and selected powers | Temple I: 1; Temple II: 2 total |

Stone replaces the economic role of Ore. Crystal compresses several rare-material roles; **one Crystal is not a mathematically equivalent substitute for each missing Heroes III resource**. Favor remains a separate divine mechanism. Do not introduce food, wages, army upkeep, or automatic negative balances.

A quote contains every cost, every prerequisite, and the post-transaction balance. Failed validation changes nothing. No town, hero, or unit screen maintains a second resource wallet.

## 2. Match start versus the review fixture

Proposed ordinary test-map start: Day 1, one level-1 hero, one town, 10,000 Gold, 20 Wood, 20 Stone, 10 Crystal, 10 Favor. The town has a Village Hall, Tavern, Fort, and Barracks. Hero army: 20 Hoplites and 8 Peltasts; garrison empty. Barracks stock begins with 14 recruitable Hoplites. Starting Peltasts do not imply a built Peltast Range or a Peltast recruitment pool. Zeus is the fixed first-slice patron.

Mines near the start are not automatically owned in normal play. Their ownership is explicitly set by a scenario. The economic test ledger in the acceptance document deliberately pre-owns a Sawmill and Quarry to isolate arithmetic; it is not a claim about the normal opening.

Initialize Day 1 once with those quantities. Do not pay an extra dawn income merely because a new-game screen closes. The old demo's Week 1 Day 6, level-2 hero, and 3,600 Gold checkpoint remains historical.

## 3. Clocks and daily transition

A player turn permits legal hero, town, market, and management actions. A **world day** advances only after all active players finish. Tactical rounds do not advance it. Week = `1 + floor((day - 1) / 7)`; day-in-week = `1 + ((day - 1) mod 7)`.

After the final player's turn, run one atomic dawn transition:

1. Increment absolute day and snapshot current ownership.
2. Pay recurring town, mine, depot, and Temple income using that ownership and the buildings already present.
3. On days 8, 15, 22, ... apply weekly growth once to eligible town family pools using fortifications already present.
4. Reset each town's daily build allowance; refresh heroes' daily movement and mana under the hero rules.
5. Expire world-day effects whose specified boundary is now reached; update objectives and elimination counters.
6. Create the dawn checkpoint and begin the next player's turn sequence.

Each payout/growth has an event ID. Retrying a load or UI operation cannot apply it again. New buildings constructed during the new day do not retroactively change that dawn's income or growth. Effect definitions must identify whether they apply to step 2, 3, or 4; do not rely on screen update order.

## 4. Immediate construction

A town may complete **one purchased building or upgrade per world day**. The action validates ownership, prerequisites, uniqueness, balance, and `buildUsedDay != currentDay`; it pays the full price, creates/upgrades the building, and records the day in the same transaction. There is no construction queue, timer, progress bar, or cancellation refund.

A hero is not required to be present to manage an owned town. Buying creatures, upgrading troops, hiring a hero, or trading resources does not use the building allowance. Selecting, inspecting, and canceling a quotation are free. A Fort or Temple upgrade consumes the same allowance as a new dwelling.

Capture preserves the town's used-day marker; a town cannot be built in twice that day by changing owners. Economic effects start at the next applicable dawn; immediate access effects, such as recruiting from a new dwelling, are available now. Building a Castle after a weekly dawn does not retroactively upgrade that week's growth.

## 5. Population and fortification growth

A town owns one population pool per creature family, shared by its base and upgraded forms. A first construction of a family's dwelling adds exactly one **base-growth** quantity. Constructing its upgrade grants no new population and does not convert existing soldiers for free.

At a weekly boundary:

```text
weeklyAddition = floor(baseGrowth * growthMultiplier)
growthMultiplier = 1.0 normally, 1.5 with Citadel, 2.0 with Castle
poolAfter = poolBefore + weeklyAddition
```

Only the highest fortification applies. No pool cap or random monster-week event is included in v0.2. Example: Peltast base growth 9 yields 9 / 13 / 18; a Griffin line of 7 yields 7 / 10 / 14. Store integer quantities.

A dwelling built on Day 7 can provide its initial base grant and receive normal growth at Day 8 dawn. That is two distinct legitimate events, not duplicate processing. Existing town pools survive capture, unless a later scenario explicitly overrides that rule. External covenants do not independently produce an accumulating recruit pool in this candidate profile.

## 6. Recruitment and upgrades

Choose unit form, quantity, and destination. The destination is either the town's seven-slot garrison or its one currently visiting friendly hero. A remote hero is not an eligible recipient. Merge into an existing exact-form stack or allocate an empty slot. A zero quantity is not a transaction.

Validate population, resources, ownership, form unlock, and destination capacity together. Commit cost deduction, population deduction, and stack increase together. Disabled confirmation explains the limiting factor and affordable maximum.

Upgrading troops requires the relevant upgraded dwelling and local garrison/visiting hero. Pay `quantity * (upgradeCost - baseCost)` resource by resource. No upgrade in this catalog has a negative component. Upgrade does not consume population. Replacing an entire stack preserves its slot; partially upgrading requires a second slot unless an upgrade-form stack already exists. Down-conversion and refund arbitrage are not supported.

Split/merge/transfer is free outside combat when heroes occupy adjacent passable tiles or share a friendly town. Total counts are conserved. Do not leave a traveling hero with zero troops. Transfers never replenish daily movement or per-battle family charges.

## 7. Markets and heroes

Our compressed economy needs its own exchange prices. Proposed Gold-only market profile:

| Owned Markets | Buy 1 Wood / Stone | Sell 1 Wood / Stone | Buy 1 Crystal | Sell 1 Crystal |
| --- | ---: | ---: | ---: | ---: |
| 1 | 500 | 50 | 1,000 | 100 |
| 2 | 450 | 60 | 900 | 120 |
| 3+ | 400 | 75 | 800 | 150 |

These are intentionally NOT the Heroes III rates. No direct resource-to-resource barter in the first profile: sell then buy through Gold. Favor cannot be traded. Sell and buy spreads prevent a positive exchange cycle. No market can spend another player's wallet.

A new hero costs 2,500 Gold at a Tavern, receives 10 Hoplites, and appears in the town's free visitor position. Candidates are finite scenario-defined IDs, at most eight roaming heroes per player. Rehiring a retreated/surrendered hero does not grant a fresh starting army. Recruitment is unavailable while the visitor position is occupied. A hero cannot repeatedly be dismissed/recruited to mint starting troops.

## 8. Divine economy and covenants

Temple I gives 1 Favor/day; Temple II replaces that with 2/day. The first minor-god choice requires Temple II in an owned town and costs 20 Favor, paid once. Zeus -> Athena OR Ares is player-wide and irreversible for the first-slice match. Athena adds +1 Defense to friendly commanders; Ares adds +1 Attack. Those are explicit passive modifiers, not a free change to every creature's base record.

Defeating a named quest guardian may award its declared Favor once. Ordinary kills, friendly casualties, summoned units, and repeatable self-created fights do not automatically generate Favor in the Greek slice. Faction-specific generation methods come later.

A covenant is a player-held entitlement assigned permanently to a compatible empty town slot: light (Centaur OR Griffin), middle (Minotaur), or apex (Cyclops). It is not consumed when opening a screen. Once assigned, it cannot be swapped in this profile. Building and recruiting remain separate expenditures. Capturing the town transfers its assigned covenant and dwelling access; it does not also give the previous owner a second copy. Unassigned entitlements remain with their owner. No demolition/reassignment system is implied.

## 9. Conquest and loss

The next two-player Greek test scenario uses hostile players and conquest: a player with no towns AND no active heroes is eliminated immediately. A player with no towns but a surviving hero has seven complete dawns to capture one; reset the counter on capture. No diplomacy or shared victory yet. A scenario-specific expedition objective may still be used for the smallest slice, but must not be labeled full conquest.

The conquest/capture rules are proposed additions, not features the existing demo already implements. Resolve combat first, then transfer ownership and check objectives exactly once. Do not grant fixed Gold after every battle unless the scenario's encounter definition actually has that reward.
