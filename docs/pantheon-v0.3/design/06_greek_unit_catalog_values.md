# Greek Creature Catalog - Candidate Values

> v0.3 adopted topology: every family has exactly one upgrade, as formalized in [content/03](../content/03_exactly_one_upgrade_contract.md). The [creature bible](../production/03_creature_pairs_and_animation_bible.md) covers all sixteen forms and labels a proposed per-form ability mapping. The following numeric balance remains P.
**Status:** P - original candidate balance. Do not label this table as Heroes III data. The separate [Castle reference](../reference/04_heroes3_town_and_roster_benchmarks.md) supplies the research benchmark.

## Roster topology

Four core families occupy tiers 1, 2, 4, and 5. A town has three mythological slots: light tier 3 chooses Centaur OR Griffin, middle tier 6 uses Minotaur, apex tier 7 uses Cyclops. Eight family definitions therefore produce seven active recruitment lines, not eight army slots. Seven army slots may contain any legal carried composition, including creatures transferred from other towns.

Our Centaur and Cyclops tiers do not match the tiers of similarly named Heroes III creatures. Roles and costs are designed for this roster, not copied by name. All units in this first Greek profile are living and morale-eligible. No healing, magic immunity, terrain bonus, or attack is implied merely by a unit's name.

## Numeric table

Damage and HP are per creature. A/D exclude hero, equipment, god, and temporary effects. Growth is the shared family base weekly growth. Costs are per recruit. `Hexes` is occupied footprint, not movement range. Zero shots means no ranged attack. Crystal is our resource, not a direct conversion of H3 Gems.

| ID / name | Tier | Gold | Crystal | Growth | Attack | Defense | HP | Damage | Speed | Shots | Hexes |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | ---: | ---: | ---: |
| `hoplite` - Hoplite | 1 | 60 | 0 | 14 | 4 | 5 | 10 | 1-3 | 4 | 0 | 1 |
| `veteran_hoplite` - Veteran Hoplite | 1 | 75 | 0 | 14 | 6 | 5 | 10 | 2-3 | 5 | 0 | 1 |
| `peltast` - Peltast | 2 | 100 | 0 | 9 | 6 | 3 | 10 | 2-3 | 5 | 12 | 1 |
| `veteran_peltast` - Veteran Peltast | 2 | 150 | 0 | 9 | 7 | 4 | 12 | 3-4 | 6 | 16 | 1 |
| `centaur` - Centaur | 3 | 200 | 0 | 7 | 8 | 6 | 22 | 4-6 | 7 | 0 | 2 |
| `centaur_sentinel` - Centaur Sentinel | 3 | 250 | 0 | 7 | 9 | 7 | 25 | 4-7 | 8 | 0 | 2 |
| `griffin` - Griffin | 3 | 240 | 0 | 7 | 8 | 8 | 25 | 3-6 | 7 | 0 | 2 |
| `windcrest_griffin` - Windcrest Griffin | 3 | 300 | 0 | 7 | 9 | 9 | 30 | 3-6 | 9 | 0 | 2 |
| `cavalry` - Cavalry | 4 | 350 | 0 | 4 | 10 | 10 | 35 | 6-9 | 7 | 0 | 2 |
| `companion_cavalry` - Companion Cavalry | 4 | 450 | 0 | 4 | 12 | 12 | 40 | 7-10 | 8 | 0 | 2 |
| `temple_adept` - Temple Adept | 5 | 400 | 0 | 3 | 11 | 7 | 30 | 9-12 | 5 | 12 | 1 |
| `temple_seer` - Temple Seer | 5 | 500 | 0 | 3 | 12 | 10 | 35 | 10-13 | 6 | 16 | 1 |
| `minotaur` - Minotaur | 6 | 1,000 | 0 | 2 | 15 | 14 | 95 | 16-24 | 6 | 0 | 2 |
| `labyrinth_warden` - Labyrinth Warden | 6 | 1,200 | 0 | 2 | 17 | 16 | 110 | 20-25 | 7 | 0 | 2 |
| `cyclops` - Cyclops | 7 | 3,000 | 1 | 1 | 22 | 22 | 200 | 40-50 | 7 | 8 | 2 |
| `stormforged_cyclops` - Stormforged Cyclops | 7 | 4,500 | 2 | 1 | 25 | 25 | 250 | 45-55 | 8 | 12 | 2 |


## Ability definitions

| Ability ID | Exact effect | Important restriction |
| --- | --- | --- |
| `charge_guard` | Ignore the attacker's chargeBonus against this stack | Does not negate the underlying melee strike or Offense |
| `shooter` | Enables the standard stationary shot action | Engagement, ammo, range, wall, and melee penalties apply |
| `flight` | May cross intervening blocked/occupied cells | Requires legal whole-footprint landing; no free travel beyond Speed |
| `retaliation_2` | Two eligible retaliations each round | Count is reset only at round start |
| `retaliation_unlimited` | No retaliation-count limit | Dead or disabled stacks still cannot retaliate |
| `charge` | Add 0.05 per traversed hex in a shortest legal approach, capped at +0.25 | Melee activation only; no retaliation charge; detours cannot farm distance |
| `family_ward` | Spend activation to grant a friendly stack +3 Defense through current and next round | One charge shared by the entire Temple Adept family per army/battle; no hero mana |
| `unyielding` | Effective morale is at least +1, before the final +3 cap | Does not create an extra roll, grant immunity, or affect allies |
| `wall_breaker` | Alternative siege shot removes 1 structure HP | Uses activation and one ammunition; cannot also damage a troop stack |
| `no_melee_penalty` | Do not apply the shooter's 0.5 melee penalty | Still has ordinary ranged distance/wall limits |

## Family roles and counterplay

Hoplites protect space and reduce charging threats, but their slow pace affects the army's adventure travel. Peltasts need protection from adjacent enemies; the upgrade improves numbers rather than automatically gaining the Marksman's two-shot rule. Centaurs offer fast ground access but cannot bypass terrain. Griffins can bypass a front line, although a bad landing can expose them to many attacks; their retaliation identity encourages careful opponent sequencing.

Cavalry benefits from approach distance and open lanes; Hoplite charge protection makes matchup information useful. Temple Adepts add mid-tier ranged output; Seers trade an action for one army-shared protective ability. Minotaurs supply durable melee pressure with reliable morale rather than a kill-farming rage resource. Cyclopes combine expensive ranged pressure and wall-breaking; their scarce pool and Crystal cost matter even when the player has enough Gold.

These are design intentions, not tested matchup claims. No AI-value or power-rating number is asserted until measured.

## Upgrade and growth rules

The upgraded form has the same base weekly growth and shares its family's population pool. Upgrading 12 Hoplites costs 12 x (75 - 60) = 180 Gold, not 900 Gold and not 12 additional population. Upgrading 2 Cyclopes costs 3,000 Gold + 2 Crystal. Troop upgrades cannot use unearned upgraded-dwelling access.

At Citadel/Castle, base growth 14 becomes 21/28; 9 becomes 13/18; 7 becomes 10/14; 4 becomes 6/8; 3 becomes 4/6; 2 becomes 3/4; 1 becomes 1/2. Rounding is per family, not across the total population.

## Scope and content status

The first revised slice only needs Hoplite, Peltast, Cavalry, Griffin and the commander spell subset to prove the loop. All sixteen rows are the later catalog contract, not a claim that sixteen animations, icons, voices, or balanced units exist. The codex must distinguish implemented, preview-only, and planned definitions without allowing purchase of unavailable content.

For each row, production content needs an animation profile, original unit description, source-status note, upgrade relationship, accessible portrait description, and localized labels. Those requirements are specified in the [unit screen](../screens/03_unit_codex_and_inspection.md), [lore](../content/01_unit_history_and_lore.md), and [animation contract](../content/02_animation_behavior_contract.md).

## Derived weekly recruitment budget

For the unupgraded seven-family roster with **Griffin** in the light slot, purchasing one complete growth event costs **11,020 Gold + 1 Crystal** at base growth, **14,660 Gold + 1 Crystal** with Citadel rounding, or **22,040 Gold + 2 Crystal** with Castle growth. A Capitol generates 28,000 Gold over seven dawns before mines, expenses, or ownership changes. The difference is not a balance guarantee: construction, upgrades, hero hiring, losses, spellbooks, and reserves compete for that income. These totals were calculated from this table, not taken from Heroes III.
