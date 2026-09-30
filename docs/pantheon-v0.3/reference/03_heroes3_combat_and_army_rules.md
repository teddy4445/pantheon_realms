# Heroes III Reference - Armies, Battles, and Heroes

**Status:** R. This is the core pattern to learn from, not a full compatibility specification. Sources: [M01, M02, V01, V03, V04](01_sources_and_version_scope.md).

## Core battlefield behavior

A hero carries up to seven creature stacks; each stack acts as a battlefield unit. The commander normally remains off the battlefield and supports the army through attributes and spells. Creature Speed matters for movement and action priority. Walking into a legal melee attack can be part of the same activation; a ranged shot normally uses the unit's action without walking first. [M01, M02]

Fast units normally act before slow units. Waiting defers action into a later part of the round; the classic waiting sequence reverses speed priority. A living defender normally retaliates against the first eligible melee attack in a round, with creature-specific exceptions. Defend improves Defense by 20%, rather than applying an unconditional 50% damage cut. Heroes have a once-per-round spell opportunity. [M01]

Creature identity can alter these rules: Marksmen have two ranged attacks; Griffins can retaliate twice, Royal Griffins without the ordinary retaliation-count limit; flight bypasses intervening ground obstacles but still requires a legal landing space. These are distinct rules, not just higher statistics. [V03]

## Numeric combat pattern

Let B be the stack's rolled base damage and delta be effective attacker Attack minus defender Defense.

```text
Attack advantage bonus = min(0.05 * max(delta, 0), 3.00)
Defense advantage reduction = min(0.025 * max(-delta, 0), 0.70)
```

The difference-related factor ranges from 0.30 to 4.00. The original manual's 2% defensive figure is not used here; see the source-conflict record. Other bonuses and reductions must not be collapsed into that factor. For example, additive offensive/luck bonuses and multiplicative reductions belong to different stages. A lucky strike is not safely modeled as doubling the already fully modified final result. [V01, V04]

Stack casualties depend on accumulated damage and per-creature HP. Wounded survivors do not mean that dead members have been resurrected. A surviving wounded front creature heals between battles under the classic model. [M01]

## Morale and Luck

Selected corroborated classic-style probability parameters, without creature immunity details:

| Effective value | Positive morale: extra opportunity | Negative morale: lost opportunity | Positive luck: damage bonus event |
| --- | ---: | ---: | ---: |
| 1 | 1/24 | 2/24 at -1 | 1/24 |
| 2 | 2/24 | 4/24 at -2 | 2/24 |
| 3 | 3/24 | 6/24 at -3 | 3/24 |

Negative Luck is not automatically a functioning classic damage penalty. Fan versions and optional recreation settings can differ. Seven slots are not a Leadership-weighted army population cap. [V01]

## Hero and logistics anchors

The four primary attributes are Attack, Defense, Spell Power, and Knowledge. A hero can learn up to eight secondary skills with Basic, Advanced, and Expert ranks. A standard level-up offers up to two secondary-skill options. Knowledge relates to mana capacity; daily movement is separate from personal battlefield movement. [M02, V01]

Selected base land movement allowances indexed by the slowest creature's Speed:

| Slowest Speed | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11+ |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Daily points | 1,500 | 1,560 | 1,630 | 1,700 | 1,760 | 1,830 | 1,900 | 1,960 | 2,000 |

A nominal terrain-step cost of 100 points provides a useful scale; roads, terrain, skills, and other effects modify travel. These numbers are not a promise that every route can be estimated by dividing by 100. [V01]

Retreat, surrender, and outright defeat are different outcomes. Surrender involves payment to preserve forces in an eligible hero-versus-hero encounter; retreat is not equivalent to keeping the army. Town sieges add walls, gates, towers, and siege machinery rather than just a universal defense multiplier. [M01, M02]

## Features not claimed as reproduced

Exact original RNG distribution, every tie-break, damage-rounding edge case, every spell/skill, all morale interactions, surrender discounts, creature-specific immunity chains, hero specialty growth, and every siege detail are outside this research baseline. Our [combat profile](../design/04_combat_specification.md) selects explicit rules for those parts required by the prototype and marks later systems clearly.
