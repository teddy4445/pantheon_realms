# Design proposals — signatures, gods, support buildings

_Status: **P — proposed this build, unplaytested.** Owner request (items 4–6):
signature mechanics per pantheon as shared rules, two or three more minor gods
per pantheon with real blessings, and designs for the Training Academy,
Watchtower and Artifact Merchant. Owner answers: all six pantheons get a
signature; the new gods form a **second** choice (the documented first choice
stays); the Training Academy trains heroes._

The owner's `docs/` stay the source of truth. Nothing here reopens a settled
decision. Where a proposal touches a documented rule, it is listed under
[Touch points with the documents](#touch-points-with-the-documents).

## How it is built

Every mechanic is an **effect type** in the shared vocabulary
(`packages/rules/src/definitions/logic.ts`). A pantheon's signature is a named
bundle of these effects (`PantheonDefinition.signature`). A god's blessing is
the same kind of list. The rules read effect *types*: no code path names a
pantheon, god or building. Any pantheon or god can use any effect. For example,
Hades (Greek) and Hel (Norse) use the same `casualty_recovery` effect as the
Egyptian signature.

Player-wide effects come from two sources: the pantheon signature and every
committed god (`resolvers/effects.ts`). Battle-relevant effects are frozen on
each battle side when the battle starts (`BattleSideState.effects`), so the
preview, the AI and execution read the same numbers. The Three Beacons sets
`signatureMechanics: false` and allows only Athena and Ares, so the campaign
keeps its documented rules and its tested balance.

| New effect | Meaning |
|---|---|
| `battle_xp_percent` | A winning hero gains this much more battle XP (floored). |
| `wounded_fury` | A stack with at most N/D of its starting creatures alive gains +Attack. |
| `casualty_recovery` | After a battle this player **wins**, each stack regains floor(p% of the creatures it lost in that battle). All sources add up, capped at 100%. |
| `army_harmony` | If the deployed army has ≥ N distinct creature families, every stack gains +Attack/+Defense. The highest threshold met applies. |
| `free_shapeshift` | The Shapeshift ability does not spend the activation (once per activation). |
| `offering` | Weekly Temple rite: creatures become Favor. |
| `creature_stat` | Battle-only ±Attack/Defense/Speed for this player's creatures matching a tier range and/or ability type. |
| `weekly_growth_bonus` | +N weekly growth for families of tier ≤ T in this player's towns. |
| `vision_radius` | +N hexes of hero adventure vision. |
| `daily_income` (existing) | Now also works as a player-wide effect, paid while the player owns a town. |
| `enables_hero_training` / `town_vision_radius` / `enables_artifact_merchant` | The three support buildings. |

New creature ability: **Shapeshift** (`shapeshift` rule). The stack toggles
between its normal aspect and one alternate aspect. The aspect is a battle
status, not a creature form: DEC-21 (exactly base plus one upgrade) is
unchanged.

New requirement: `has_god_in_group`.

## 1. Signature mechanics

| Pantheon | Signature | Exact rule (proposed numbers) |
|---|---|---|
| Greek — Glory & Champions | **Glory** | A winning hero gains **+25%** battle XP (floored). |
| Norse — Fate & Battle | **Berserk Fury** | A stack with **at most half** of its starting creatures alive gains **+2 Attack**. |
| Egyptian — Afterlife & Resurrection | **Afterlife** | After a battle you win, each stack regains **20%** of its losses in that battle (floored). |
| Japanese — Spirits & Harmony | **Harmony** | Distinct families in the battle army: **3–4 → +0/+1**, **5+ → +1/+1** (Attack/Defense, every stack). A first +2/+2 step at 7 families was measured far too strong (full-roster armies won 0.78–0.92) and removed. |
| Celtic — Nature & Transformation | **Shapeshifting** | Shapeshift is **free** at the start of an activation, once per activation. |
| Mesoamerican — Ritual & Sacrifice | **Offering** | Once per week per town with a Temple, offer creatures from the garrison or the visiting hero: **1 Favor per 150 Gold** of recruitment price (floored), **at most 10 Favor** per offering. |

**Afterlife** respects every design/04 §5 constraint on resurrection:

* restoration is capped by each stack's own losses in that battle;
* it applies only to the winning side, never to a retreat, surrender or stalemate;
* it grants no XP, reward or kill credit, so it cannot create a reward loop;
* summoned or temporary troops do not exist yet and would be excluded.

The design/04 §9 note ("no Egyptian afterlife exception exists until it is
separately designed") is about hero loss. Heroes are still lost on defeat;
this proposal does not change that.

**Harmony** counts families, not stacks, so splitting one family into many
stacks does not count. It does not touch the documented same-faction morale
rule (design/04 §6).

**Shapeshifting** gives four Celtic families (both forms) an aspect:

| Family | Aspect | Change |
|---|---|---|
| Pooka (T1) | Hare | +2 Speed, −1 Defense |
| Kelpie (T3) | Water-horse | +2 Attack, −2 Defense |
| Selkie (T5) | Seal-skin | +3 Defense, −2 Speed |
| Horned Stag Spirit (T6) | Rut | +3 Attack, −3 Defense |

A Speed change affects movement at once and turn order from the next round,
matching design/04 §2's buff rule. It never affects adventure travel. Without
the Celtic rite (e.g. a player who captured a Celtic town), Shapeshift spends
the activation.

**Offering** can't farm Favor: the rite is once per town per week and capped at
10 Favor, and 10 Favor costs 1,500 Gold of recruited troops. It is not a market
trade, so design/02 §7 "Favor cannot be traded" at markets still holds. Battle
casualties never produce Favor, so DEC-12 "no casualty-farming currency" also
still holds. A hero cannot offer its last creature.

## 2. The second minor-god choice

The documented first choice is unchanged: Temple II, 20 Favor, Athena OR Ares
and each pantheon's mirror. The new second choice is a separate, permanent
commitment. The player picks **one of three** gods. It requires:

* a first commitment already made;
* **Temple II and the level-3 civic hall** (City Hall or its equivalent) in the same owned town;
* **25 Favor**.

The Three Beacons only allows Athena and Ares.

| Pantheon | God | Blessing |
|---|---|---|
| Greek | Hermes | +15% land movement; +250 Gold per day |
| | Demeter | +2 weekly growth for tiers 1–3 |
| | Hades | Casualty recovery 15% |
| Norse | Freyja | +1 weekly growth for tiers 1–5 |
| | Heimdall | +2 hero vision; +1 Defense for all creatures |
| | Hel | Casualty recovery 15% |
| Egyptian | Osiris | Casualty recovery 15% (35% with Afterlife) |
| | Thoth | +1 Spell Power, +1 Knowledge |
| | Horus | Flying creatures +1 Attack, +1 Speed |
| Japanese | Inari | +300 Gold and +1 Wood per day |
| | Fujin | +20% land movement |
| | Raijin | +1 Spell Power; shooters +2 Attack |
| Celtic | Cernunnos | Tier 1–3 creatures +1 Attack, +1 Defense |
| | Epona | +20% land movement |
| | Lugh | +1 Luck, +1 morale |
| Mesoamerican | Tlaloc | +2 weekly growth for tiers 1–3 |
| | Tezcatlipoca | +2 Luck |
| | Xiuhtecuhtli | Offerings: 1 Favor per 100 Gold, at most 15 |

Each pantheon now has 4 gods still undesigned (24 in all; previously 42).

## 3. The three support buildings

Each is one level in every town. The Greek values below are mirrored into the
other five towns exactly like the rest of the tree.

| Building | Cost | Prerequisites | Effect |
|---|---|---|---|
| **Training Academy** | 2,000 G + 5 W + 5 S | Tavern + tier-1 dwelling | Once per world week, each visiting hero may pay **1,000 Gold for 500 XP**. The mission XP cap applies. |
| **Watchtower** | 1,500 G + 5 W + 5 S | Fort | Town vision radius **8** (3 without it). |
| **Artifact Merchant** | 3,000 G + 5 W + 5 S + 2 C | Marketplace + Town Hall | Sells **4 artifacts** to a visiting hero. The stock changes every week. |

The merchant's weekly stock is drawn without replacement from every priced,
non-unique artifact. The draw is a pure function of match and week (every merchant
in a match offers the same catalog that week, so neither harbor is favored),
so it never touches a gameplay RNG stream. A bought item is equipped into a free slot,
otherwise it goes into the backpack. The buy is refused if the backpack is full.
Merchant pool (all proposed):

| Artifact | Slot | Effect | Price |
|---|---|---|---|
| Bronze Spear | Weapon | +1 Attack | 1,500 G |
| Storm-iron Blade | Weapon | +2 Attack | 3,500 G + 1 C |
| Linen Cuirass | Armor | +1 Defense | 1,500 G |
| Scale Hauberk | Armor | +2 Defense | 3,500 G + 1 C |
| Seer's Circlet | Head | +1 Spell Power | 1,500 G |
| Crown of Counsel | Head | +1 Spell Power, +1 Knowledge | 3,000 G + 1 C |
| Bronze Standard (existing) | Relic | +1 morale | 2,000 G |
| Knucklebone Charm | Relic | +1 Luck | 2,000 G |
| Band of Insight | Ring | +1 Knowledge | 1,500 G |
| Watcher's Ring | Ring | +2 adventure vision | 1,200 G |
| Winged Sandals (existing) | Mount | +10% movement | 2,000 G |
| Swift Saddle | Mount | +15% movement | 3,000 G + 1 C |

The Warding Token stays a unique campaign reward and is never sold.

## Touch points with the documents

* **design/04 §5** defers resurrection. Afterlife and the recovery gods are the
  requested design, built inside every constraint that section lists.
* **design/02 §8** says faction-specific Favor generation "comes later". The
  offering rite is that faction method.
* **design/04 §9** XP rule: Glory is an explicit percentage modifier on top of
  the documented amount, which is unchanged.
* **design/02 §8** first minor-god choice: unchanged. The second choice is an
  addition.
* **Owner architecture §11**: the three support locations were "planned" with
  no mechanics. They are now buildable in skirmish. The campaign allowlists
  exclude them.

## Open questions for the owner

1. The numbers are all first proposals checked only by AI-vs-AI runs
   (`npm run balance`). Human playtests are the next step.
2. Should the Afterlife also protect a hero on defeat? That is a separate hero-loss
   rule (design/04 §9) and was not added.
3. Should Favor get more uses (e.g. divine powers)? Today it only buys gods,
   so Offering's value falls once both choices are made.
