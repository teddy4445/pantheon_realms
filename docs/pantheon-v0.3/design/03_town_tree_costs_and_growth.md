# Greek Town Blueprint - Buildings, Dependencies, and Values

> v0.3 scope: the [campaign](../campaign/01_the_three_beacons.md) supplies explicit starting buildings and per-mission purchase allowlists. Its first mission requires real creature upgrades; the older scope-gate paragraph below is historical staging, not a reason to omit them.
**Status:** P. This is a larger content blueprint, not a commitment to implement every structure in the next sprint. All costs are original candidate values except where deliberately matching an identified Heroes III benchmark.

**Notation:** G = Gold, W = Wood, S = Stone, C = Crystal. Unlisted resources cost zero. Every purchased building/upgrade is immediate and uses the town's one daily build opportunity. Prerequisites are AND unless explicitly written OR. An upgraded prerequisite satisfies its lower-level requirement.

## Economic, defensive, and divine structures

| ID | Building | Cost | Prerequisites | Result |
| --- | --- | --- | --- | --- |
| `village_hall` | Village Hall | Starting building | Town exists | 500 G/day |
| `town_hall` | Town Hall | 2,500 G | Village Hall + Tavern | 1,000 G/day total |
| `city_hall` | City Hall | 5,000 G | Town Hall + Workshop + Market + Sanctum I | 2,000 G/day total |
| `capitol` | Capitol | 10,000 G | City Hall + Castle; no other owned Capitol | 4,000 G/day total |
| `fort` | Fort | 5,000 G + 20 W + 20 S | Village Hall | Siege perimeter; military prerequisite |
| `citadel` | Citadel | 2,500 G + 5 S | Fort | 1.5x base weekly growth; keep and moat |
| `castle` | Castle | 5,000 G + 10 W + 10 S | Citadel | 2x base growth; stronger wall and side towers |
| `tavern` | Tavern | 500 G + 5 W | Village Hall | Hire eligible heroes |
| `market` | Market | 500 G + 5 W | Village Hall | Gold/resource exchange |
| `workshop` | Workshop | 1,000 G + 5 W | Village Hall | Military prerequisite; later siege support |
| `supply_depot` | Supply Depot | 5,000 G + 5 S | Market | +1 W and +1 S/day |
| `sanctum_1` | Sanctum I | 2,000 G + 5 W + 5 S | Village Hall | Tier-1 spell list and spellbook purchase |
| `sanctum_2` | Sanctum II | 1,000 G + 5 W + 5 S + 4 C | Sanctum I | Tier-2 spells |
| `sanctum_3` | Sanctum III | 1,000 G + 5 W + 5 S + 6 C | Sanctum II | Tier-3 spells; Wisdom required to learn |
| `temple_1` | Temple I | 1,000 G + 5 S | Village Hall | 1 Favor/day |
| `temple_2` | Temple II | 2,000 G + 5 W + 10 S + 3 C | Temple I + Town Hall | 2 Favor/day total; minor-god eligibility |

Hall, Fort/Citadel/Castle, and some common costs deliberately use the H3 benchmark scale. Crystal compression, Temple/Favor behavior, and spell-library content are our adaptations. Do not silently restore the four separate rare-resource costs.

If a player with a Capitol captures another Capitol, downgrade the captured economic level to City Hall without refund. Other structures remain. A town's faction remains Greek in the first slice; cross-faction conversion is deferred.

## Military production: four core lines and three mythic slots

The active production tiers are 1 Hoplite, 2 Peltast, 3 Centaur OR Griffin, 4 Cavalry, 5 Temple Adept, 6 Minotaur, 7 Cyclops. There are eight family candidates but at most seven active families in one town. This is unrelated to how many army slots a hero happens to occupy.

| ID | Dwelling | Tier | Cost | Prerequisites | Base growth |
| --- | --- | ---: | --- | --- | ---: |
| `barracks` | Barracks | 1 | 500 G + 10 S | Fort | 14 Hoplites |
| `peltast_range` | Peltast Range | 2 | 1,000 G + 5 W + 5 S | Barracks | 9 Peltasts |
| `centaur_grove` | Centaur Grove | 3 | 1,500 G + 5 W + 5 S | Barracks + assigned light Centaur Covenant | 7 Centaurs |
| `griffin_aerie` | Griffin Aerie | 3 | 2,000 G + 5 W + 5 S | Training Court + assigned light Griffin Covenant | 7 Griffins |
| `training_court` | Training Court | 4 | 2,000 G + 5 W + 5 S | Barracks + Workshop | 4 Cavalry |
| `adept_house` | House of Adepts | 5 | 3,000 G + 5 W + 5 S + 4 C | Training Court + Sanctum I | 3 Temple Adepts |
| `labyrinth` | Labyrinth | 6 | 5,000 G + 10 W + 10 S + 5 C | Temple II + Training Court + assigned middle Covenant | 2 Minotaurs |
| `thunder_quarry` | Thunder Quarry | 7 | 15,000 G + 10 W + 15 S + 12 C | Temple II + House of Adepts + Citadel + assigned apex Covenant | 1 Cyclops |

The Griffin path deliberately depends on the Cavalry building, so a higher-tier prerequisite can unlock a lower-tier mythic option. A covenant alone is not free recruitment. No building can unlock both light covenants in one town.

## Upgrade buildings

Each requires its own base dwelling, replaces its recruitment-form access, shares the existing family pool, and grants no initial population. Base units may still be recruited at their listed price; upgrade unlocks the additional form rather than making base recruits impossible.

| ID | Upgrade display name | Cost | New recruit form |
| --- | --- | --- | --- |
| `barracks_up` | Veteran Barracks | 1,000 G + 5 S | Veteran Hoplite |
| `peltast_range_up` | Veteran Range | 1,000 G + 5 W + 5 S | Veteran Peltast |
| `centaur_grove_up` | Sentinel Grove | 1,000 G + 5 W | Centaur Sentinel |
| `griffin_aerie_up` | Windcrest Aerie | 1,500 G + 5 S + 1 C | Windcrest Griffin |
| `training_court_up` | Companion Court | 2,000 G + 5 S + 2 C | Companion Cavalry |
| `adept_house_up` | House of Seers | 1,500 G + 2 W + 2 S + 2 C | Temple Seer |
| `labyrinth_up` | Warden Labyrinth | 3,000 G + 5 S + 3 C | Labyrinth Warden |
| `thunder_quarry_up` | Storm Forge | 15,000 G + 10 S + 12 C | Stormforged Cyclops |

## Dependency routes in plain language

Economy: Tavern -> Town Hall; Workshop + Market + Sanctum I -> City Hall; Citadel -> Castle -> eligibility for Capitol.

Military: Fort -> Barracks -> Peltast Range; Barracks + Workshop -> Training Court; Training Court + Sanctum I -> House of Adepts. Exploration supplies the independent covenant requirements.

Divine: Temple I + Town Hall -> Temple II -> Athena/Ares commitment. The commitment is player-wide, not a separate god choice in every town. A Temple does not automatically supply spells without their learning requirements.

## What the Town screen must communicate

Show total and component income; remaining build allowance; present buildings; a selected building's exact prerequisites/cost; and whether it is built, available, locked, or already upgraded. A locked card explains the first missing dependency and can expand the full chain. A resource shortfall is not the same as a prerequisite failure.

The old build queue is replaced by **Built today: [building] / Next build: tomorrow**. After a purchase, the city state and recruitment options change immediately. The income preview explicitly says **next dawn**. Weekly recruitment shows current stock and the next expected addition, not a misleading stock-per-day number.

A town can be managed without moving the hero there, but recruitment to that hero must still require their presence. Always display garrison and visiting army separately and expose a legal transfer operation. A siege may deploy at most seven stacks in this profile; see the combat document for selecting defenders.

## Scope gates

First revised slice: existing core town UI, Hall ladder through City Hall, one Fort upgrade, Barracks, Peltast Range, Training Court, Temple I/II, and Griffin Aerie with the simple spell library. Subsequent milestones add the second light option, higher tiers, upgrade buildings, Capitol, and full siege structures. Unimplemented cards are clearly marked as planned, not fake working purchases.

Calling this larger blueprint complete does not mean the prototype still has only twelve buildings. Scope growth is deliberate and staged. The building definitions, not hand-authored UI labels, supply prices and prerequisites.
