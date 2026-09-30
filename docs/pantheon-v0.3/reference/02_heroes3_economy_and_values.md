# Heroes III Reference - Economy and Calendar

**Status:** R. Values are comparison data, not the Pantheon Realms economy. Sources: [M01, M02, V02, C01, C03](01_sources_and_version_scope.md).

## Resource model

| Resource | Ordinary controlled source | Typical output per world day |
| --- | --- | ---: |
| Gold | Gold mine | 1,000 |
| Wood | Sawmill | 2 |
| Ore | Ore pit | 2 |
| Mercury | Alchemist's lab | 1 |
| Sulfur | Sulfur dune | 1 |
| Crystal | Crystal cavern | 1 |
| Gems | Gem pond | 1 |

These are ordinary source yields, not guaranteed starting ownership. Town income is another source. Standard troops have recruitment prices rather than routine food or salary upkeep. Exploration can supply pickups, rewards, and additional production; their amounts depend on the object/scenario. [M01, C03]

## Hall-income ladder

| Building | Upgrade cost in Gold | Total Gold/day after upgrade | Main prerequisite context |
| --- | ---: | ---: | --- |
| Village Hall | Starting/basic building | 500 | Town exists |
| Town Hall | 2,500 | 1,000 | Village Hall and Tavern |
| City Hall | 5,000 | 2,000 | Town Hall, Blacksmith, Marketplace, Mage Guild I |
| Capitol | 10,000 | 4,000 | City Hall and Castle; one Capitol per player |

Income levels replace the earlier level; they do not add to 7,500/day. The marginal income increases are 500, 1,000, and 2,000. **Our arithmetic:** each upgrade's direct Gold cost equals five days of its additional income, ignoring prerequisites, construction opportunities, and time before payout. This is not a claim that rushing a Capitol is always strategically correct. [M01, V02, C01]

## Time, recruitment, and opportunity cost

A world week has seven days. Daily income and weekly creature availability create different planning horizons. Town pools retain unrecruited stock. Buying units spends resources and removes units from the pool; it does not create additional population. Construction is immediate but limited to one building per town per day, making the daily construction opportunity itself scarce. [M01, M02, C01]

Fortification growth factors are 1.0 without an advanced growth fortification, 1.5 with a Citadel, and 2.0 with a Castle. Citadel and Castle are successive states, not stacked multipliers of 1.5 x 2. Resource availability, access to a dwelling, stock in its pool, and an army slot are distinct constraints. [C01, C03]

A newly built town dwelling initially provides its base population; weekly bonuses matter at the next growth event. Classic external dwellings do not all use the same accumulation/free-recruitment behavior as town dwellings, and fan expansions can change them. Treat the town rule as the transferable design pattern, not as a blanket rule for every adventure object. [C03]

## Marketplace benchmarks

Marketplace efficiency improves with the number of markets owned. Selected classic-style Gold exchange benchmarks from the community exchange table:

| Owned marketplaces | Gold to buy 1 Wood/Ore | Gold received for 1 Wood/Ore | Gold to buy 1 rare resource | Gold received for 1 rare resource |
| --- | ---: | ---: | ---: | ---: |
| 1 | 2,500 | 25 | 5,000 | 50 |
| 3 | 1,250 | 50 | 2,500 | 100 |
| 9 or more | 500 | 125 | 1,000 | 250 |

This is a selected comparison table, not the full resource-to-resource exchange engine. Do not infer missing rates by linear interpolation. Verify exact rounding against the chosen version before implementing a compatibility mode. [C03]

## Design lessons for Pantheon Realms - analysis, not copied rules

There are three competing uses for scarce resources: generate more future income, unlock better production, or buy the army that secures the next map objective. A large population pool is not the same as a strong field army if the owner cannot afford to recruit it. A cheap force may be strategically valuable because it unlocks mines before expensive infrastructure repays its cost.

Weekly replenishment makes preparation before the week boundary important. Immediate building completion makes a day's decision understandable: the building exists now, but some benefits are paid later. The limited construction opportunity prevents one large treasure pickup from instantly completing every structure.

Our proposed five-resource adaptation and explicit day-boundary sequence are in [the economy profile](../design/02_economy_calendar_and_recruitment.md). They should be assessed on their own, not described as an exact reproduction of these seven-resource values.
