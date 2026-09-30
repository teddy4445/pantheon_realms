# Heroes III Reference - Building and Castle Benchmarks

**Status:** R. These are factual comparison values, not our Greek town's final balance. Sources: [M01, V02, V03, C01, C02, C03](01_sources_and_version_scope.md).

**Notation:** G = Gold; W = Wood; O = Ore; R = each of Mercury, Sulfur, Crystal, and Gems when explicitly stated.

## Common structures

| Structure | Reference cost | Function / dependency |
| --- | --- | --- |
| Fort | 5,000 G + 20 W + 20 O | Walls; prerequisite for ordinary military development |
| Citadel | 2,500 G + 5 O | Requires Fort; moat/central defense; +50% base growth |
| Castle | 5,000 G + 10 W + 10 O | Requires Citadel; stronger defenses; +100% base growth instead of +50% |
| Tavern | 500 G + 5 W | Hero recruitment; prerequisite on economic path |
| Marketplace | 500 G + 5 W | Resource exchange |
| Blacksmith | 1,000 G + 5 W | War-machine access and faction dependencies |
| Resource Silo | 5,000 G + 5 O | Requires Marketplace; recurring resource output depends on town |
| Mage Guild I | 2,000 G + 5 W + 5 O | Initial spell access |
| Mage Guild II | 1,000 G + 5 W + 5 O + 4 of each R | Requires preceding guild |
| Mage Guild III | 1,000 G + 5 W + 5 O + 6 of each R | Requires preceding guild |
| Mage Guild IV | 1,000 G + 5 W + 5 O + 8 of each R | Requires preceding guild |
| Mage Guild V | 1,000 G + 5 W + 5 O + 10 of each R | Not available in every town; Castle stops at IV |

Do not confuse the faction called **Castle** with the common fortification building called **Castle**. [M01, C01, V03]

## Castle's military dependency pattern

| Tier / dwelling | Base cost | Important prerequisite | Upgrade cost |
| --- | --- | --- | --- |
| 1 Guardhouse | 500 G + 10 O | Fort | 1,000 G + 5 O |
| 2 Archer's Tower | 1,000 G + 5 W + 5 O | Guardhouse | 1,000 G + 5 W + 5 O |
| 3 Griffin Tower | 1,000 G + 5 O | Barracks | 1,000 G + 5 O |
| 4 Barracks | 2,000 G + 5 O | Guardhouse + Blacksmith | 2,000 G + 5 O + 5 Crystal |
| 5 Monastery | 3,000 G + 5 W + 5 O + 2 of each R | Barracks + Mage Guild I | 1,000 G + 2 W + 2 O + 2 of each R |
| 6 Training Grounds | 5,000 G + 20 W | Stables | 3,000 G + 10 W |
| 7 Portal of Glory | 20,000 G + 10 of each R | Monastery | 20,000 G + 10 of each R |

Upgrades also require their own base dwelling. The tree is not simply tier 1 -> 2 -> 3 -> 4: a tier-3 Griffin dwelling depends on the tier-4 Barracks. This is the useful lesson: dependencies create competing routes through a town's development. [M01, V03, C02]

## Castle creature values

Base weekly growth is shown before Citadel/Castle and other bonuses. A/D are creature stats before a hero's modifiers. Damage and HP are **per creature**. Gem costs below are the later classic/Complete-style benchmark, not an assertion that every 1999 table shows them. [C02]

| Tier | Creature | Gold | Gems | Growth | A | D | HP | Damage | Speed |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | ---: |
| 1 | Pikeman | 60 | 0 | 14 | 4 | 5 | 10 | 1-3 | 4 |
| 1 | Halberdier | 75 | 0 | 14 | 6 | 5 | 10 | 2-3 | 5 |
| 2 | Archer | 100 | 0 | 9 | 6 | 3 | 10 | 2-3 | 4 |
| 2 | Marksman | 150 | 0 | 9 | 6 | 3 | 10 | 2-3 | 6 |
| 3 | Griffin | 200 | 0 | 7 | 8 | 8 | 25 | 3-6 | 6 |
| 3 | Royal Griffin | 240 | 0 | 7 | 9 | 9 | 25 | 3-6 | 9 |
| 4 | Swordsman | 300 | 0 | 4 | 10 | 12 | 35 | 6-9 | 5 |
| 4 | Crusader | 400 | 0 | 4 | 12 | 12 | 35 | 7-10 | 6 |
| 5 | Monk | 400 | 0 | 3 | 12 | 7 | 30 | 10-12 | 5 |
| 5 | Zealot | 450 | 0 | 3 | 12 | 10 | 30 | 10-12 | 7 |
| 6 | Cavalier | 1,000 | 0 | 2 | 15 | 15 | 100 | 15-25 | 7 |
| 6 | Champion | 1,200 | 0 | 2 | 16 | 16 | 100 | 20-25 | 9 |
| 7 | Angel | 3,000 | 1 | 1 | 20 | 20 | 200 | 50 | 12 |
| 7 | Archangel | 5,000 | 3 | 1 | 30 | 30 | 250 | 50 | 18 |

These numbers illustrate the scale between a low-tier body and a scarce high-tier unit. They do not establish that a Greek Cyclops should be an Angel with different artwork. Abilities, movement, recruitment access, and resource costs all change practical value.

**Our derived budget example:** one full base-growth week of the unupgraded Castle lines costs 840 + 900 + 1,400 + 1,200 + 1,200 + 2,000 + 3,000 = **10,540 Gold + 1 Gem**. At a Castle growth multiplier, the corresponding recruitment bill is **21,080 Gold + 2 Gems**, before other growth bonuses. Construction spending and hero purchases are additional. This arithmetic illustrates why income and recruitment must be considered together; it is not an optimal-build recommendation.
