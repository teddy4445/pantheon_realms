# Design proposals

Two groups of proposals live here: the 0.3 group (signatures, second god
choice, support buildings — sections 1–3) and the 0.4 group (difficulty,
help, story, expanded skirmish content, random maps, hot-seat, results
screens — sections 4–12). The second campaign is a separate outline:
[`CAMPAIGN_2_NORSE_OUTLINE.md`](CAMPAIGN_2_NORSE_OUTLINE.md).

## Group 0.3 — signatures, gods, support buildings

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
| Japanese — Spirits & Harmony | **Harmony** | With **3 or more** distinct creature families in the battle army, every stack gains **+1 Defense**. A +1/+1 step at 5 families let full-roster Japanese armies win 0.72–0.75 of duels and was removed (content 0.6.0: they now score 0.47–0.53 in the four army tables, 0.43 with starting escorts); an earlier +2/+2 step at 7 families was far stronger still. The effect type keeps several steps for any content that wants them. |
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

**Egypt's two-week duel weakness** (0.27–0.33) turned out not to be Egyptian
values: swapping one tier at a time for the Greek unit showed the T6 Bennu
(Speed 9–10, flying) as the weak link, and slowing it made Egypt too strong
everywhere. The tactical AI flew fast stacks alone into the enemy line when
they could not strike yet. That AI rule is fixed (no lone advance); Egyptian
values are unchanged and now score 0.40–0.54 in every army table.

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


---

## Group 0.4 — proposals added in 0.4.0

_Status: **P — proposed this build, unplaytested.** Owner request: difficulty
levels and in-game help; more story in The Three Beacons; an outline for a
second campaign; pantheon spells/skills and artifact sets; Favor-paid divine
interventions; a livelier world map; random skirmish maps; hot-seat; an
end-of-game summary, keyboard help with rebinding and high scores; remove the
Multiplayer panel. Owner answers: difficulty is **skirmish only** (the
campaign keeps its authored balance); the second campaign is **Norse**, outline
only; the map editor comes **later**._

**Scope rule.** Everything in this group that changes play is either
*expanded* content (`scope: 'expanded'`) or a scenario feature
(`ScenarioFeatures`: `expandedContent`, `weeklyEvents`, `interventions`).
Twin Harbors and every random map switch all three on. **The Three Beacons
switches them off**, so the campaign's documented content, economy and Favor
use are unchanged. The only campaign changes are story scenes (text that never
changes play), the epilogue, and a mission score in the completion record.

### 4. Difficulty (skirmish only)

| | Easy | Normal | Hard |
|---|---|---|---|
| Human starting resources | 125% | 100% | 100% |
| AI starting resources | 75% | 100% | 130% |
| AI dawn income | 75% | 100% | 125% |
| AI attacks a hero at strength ratio ≥ | 1.5 | 1.2 | 1.05 |
| AI attacks a neutral guard at ≥ | 1.6 | 1.3 | 1.15 |
| AI besieges a town at ≥ | 1.6 | 1.25 | 1.1 |
| Heroes the AI keeps | 2 | 3 | 4 |
| Score multiplier | ×0.7 | ×1.0 | ×1.4 |

Difficulty never changes creature statistics (campaign doc §"No difficulty
modifier changes existing creature statistics"). It is stored in the match
(`scenario.difficultyId`), not in preferences. Normal equals the previous
skirmish behaviour (the AI margins are the old constants). Hot-seat games
(no AI seat) are always Normal.

### 5. Contextual help

Thirteen one-time tips (`packages/ui/src/app/hints.ts`): route planning, out
of movement, guarded paths, first battle, troop training, battle losses,
level-up, creature camps, map events, interventions, weekly events, wandering
monsters, hot-seat. Each shows once, in a non-blocking panel, with *Got it*
(remembered) and *Turn off tips*. Settings → Gameplay → *Tutorial hints* and
*Reset tips*. Presentation only.

### 6. Story scenes in The Three Beacons

Scenes are data on the mission (`storyScenes`), each with a trigger
(`objective_completed`, `site_visited`, `site_cleared`, `battle_started`,
`casualties`, `god_committed`, `flag`, `day_at_least`). The rules record a
played scene in `MatchState.mission.scenesPlayed` and emit `StoryScene`, so a
loaded game never repeats one. Scenes never change play.

| Mission | Scene | Trigger |
|---|---|---|
| M01 | Alexios and Thaleia at the open bridge | bridge guard defeated |
| M01 | Alexios before the lighthouse battle | battle at the Outer Lighthouse starts |
| M01 | Thaleia on losses | a battle costing ≥ 4 creatures |
| M02 | **Ione at the Griffin shrine** (covenant explained) | nesting ground freed |
| M02 | Ione on Athena / on Ares (one plays) | the god is committed |
| M02 | Thaleia's courier on losses | a battle costing ≥ 6 creatures |
| M03 | Alexios and Ione at the open crossing | an approach opened |
| M03 | Melas when the ward gate opens | ward gate objective |
| M03 | **Melas's threat before the final battle** | battle at the Storm Beacon starts |
| M03 | Melas defeated | Storm Beacon guard defeated |
| M03 | Thaleia on losses | a battle costing ≥ 8 creatures |
| End | **Epilogue** (Thaleia, Ione, Alexios — four lines) | campaign complete |

The dialogue window (campaign doc: "a text-first dialogue overlay with
portraits, subtitles, Backlog and Continue is sufficient") shows one line at
a time: *Continue* (Enter/Space), *Backlog* (L — every line shown this session
plus the current scene), *Skip* (Esc). The AI waits while it is open. The
Journal's *Story* tab lists every scene played so far, with *Replay*. Both
divine paths still lead to the same third mission; the god lines only
acknowledge the choice (campaign doc, mission 2).

### 7. Pantheon skills and spells

Two new skills for every hero — **Estates** (+250/500/750 Gold per day) and
**Mysticism** (+2/4/6 mana at dawn) — and one per pantheon, offered only to
that pantheon's heroes:

| Pantheon | Skill | Ranks |
|---|---|---|
| Greek | Phalanx Drill | tier 1–3 creatures +1/+2/+3 Defense |
| Norse | Skaldic Lore | +15/30/45% battle XP |
| Egyptian | Embalming Rites | 5/10/15% of losses return after a won battle |
| Japanese | Bushidō | tier 5–7 creatures +1/+2/+3 Attack |
| Celtic | Druidcraft | +15/30/50% spell damage and +1/2/3 mana at dawn |
| Mesoamerican | Sun Calendar | +1/2/3 Favor per day |

Sixteen spells (tier ≤ 3). Every Sanctum teaches **Swiftness** (ally +2
Speed), **Weariness** (enemy −2 Speed), **Fleet Foot** (adventure: +400
movement today) and **Homecoming** (adventure: return to the nearest own
town; movement ends). Each pantheon's Sanctum adds two of its own: Greek
Aegis (army +2 Defense) and Thunderclap (20 + 8×Power to a stack and its
neighbours); Norse Berserkergang (army +2 Attack) and Frost Breath (enemy −3
Speed); Egyptian Scarab Swarm (15 + 6×Power area) and Eye of Horus (adventure
reveal radius 5); Japanese Divine Wind (army +2 Speed) and Blossom Veil (ally
+5 Defense); Celtic Glamour (enemy −3 Attack) and Wild Hunt (25 + 9×Power
area); Mesoamerican Obsidian Rain (15 + 7×Power area) and Fifth Sun (army +3
Attack this round). New spell effect types: `speed_bonus`, `mass_bonus`,
`area_damage`, `movement_bonus`, `recall`. Durations run "through the current
and next round" like the existing battle statuses.

### 8. Artifact sets

Four sets of three pieces (twelve new artifacts; merchant stock, ruin
treasure and two map events in skirmish). Wearing 2 and 3 pieces adds a
bonus on top of the pieces' own effects:

| Set | 2 pieces | 3 pieces |
|---|---|---|
| Panoply of the Phalanx (spear, aspis, helm) | +1 morale | every creature +2 Defense |
| Regalia of the Sun King (diadem, scepter, signet) | +3 mana at dawn | +25% spell damage |
| Wayfarer's Kit (boots, cloak, compass) | +10% movement | +300 Gold per day |
| Relics of the Fallen Champion (blade, torc, banner) | +20% battle XP | every creature +2 Attack |

The Hero screen shows each worn set, its pieces and which bonuses are active.

### 9. Divine interventions (Favor)

A player may invoke **one intervention per world week**, on the map or in
battle (at the start of one of their stacks' activations). Eight are offered
to every pantheon and one more to each pantheon:

| Intervention | Favor | Where | Effect |
|---|---|---|---|
| Inspiration | 5 | map | every hero +15 mana |
| Tithe of the Faithful | 6 | map | +1,500 Gold |
| Favorable Winds | 8 | map | every hero +50% of a day's movement |
| Bountiful Harvest | 10 | map | chosen town: +4 recruits per tier 1–3 family |
| Mending Light | 6 | battle | front creature of every stack heals up to 30 HP |
| Rally the Faithful | 8 | battle | army +2 Attack, 2 rounds |
| Shield of the Gods | 8 | battle | army +3 Defense, 2 rounds |
| Wrath from Above | 10 | battle | one enemy stack takes 120 damage |
| Thunderbolt of Zeus (Greek) | 14 | battle | 200 damage |
| Ride of the Valkyries (Norse) | 8 | battle | army +2 Speed, 2 rounds |
| Blessing of the Nile (Egyptian) | 12 | map | +3 recruits per tier 1–5 family |
| Ward of the Kami (Japanese) | 12 | battle | army +4 Defense, 3 rounds |
| Mists of the Sídhe (Celtic) | 12 | map | every hero a full day's movement |
| Gift of the Feathered Serpent (Mesoamerican) | 10 | map | +1,000 Gold, +3 Crystal |

This answers open question 3 of group 0.3 for skirmish. The AI also invokes
interventions, keeping 25 Favor in reserve until it has made both god
choices.
Mending Light never resurrects (design/04 §5 unchanged).

### 10. A livelier world map

* **Creature camps** sell one neutral creature at its normal price to a
  visiting hero. Stock grows every week (low camps: tier 1–2, 6 at start,
  +4 per week; high lairs: tier 3–4, 3 at start, +2 per week). Guarded camps
  must be cleared first.
* **Map events** happen once: the first hero to arrive picks one of two
  results, each shown exactly before choosing. Ten templates, split into
  near and far bands: abandoned camp, wandering scholar, warrior's shrine,
  mercenary band, old battlefield, spring of clarity, merchant caravan,
  hermit's garden, forgotten armory and lost pilgrims.
* **Wandering monsters** are creature bands with a home and a patrol radius
  of 3. They attack heroes they out-match by 1.5×, never leave their area and
  pay a Gold bounty (600 / 900) when defeated. *Few* = one per empire region,
  *Many* = two.
* **Weekly events** are drawn at every new week from week 2 (weights in
  brackets): A Quiet Week (12), Plenty (+3 growth for tier 1–3, 4), Merchants
  (+300 Gold/day, 4), Storms (−15% movement, 3), Valor (+1 morale, 3), Omens
  (+1 luck, 3), the Muse (+3 mana at dawn, 3), Builders (+1 Wood and Stone per
  day, 3). They affect every empire alike and show in the top bar.

### 11. Random skirmish maps

`packages/mapgen/src/skirmish.ts` (`pr-skirmishgen-0.1`): a hexagonal map
(radius 14 / 17 / 21 for small / medium / large) for 2–4 empires. Towns sit
at hex-symmetric points around the center. Terrain, roads, sites, guards,
rewards and monsters are generated once for the first empire's region and
copied to every other empire by the exact rotation or reflection that maps
the first town onto theirs, so every empire has the same distances, costs and
treasures. Every map is checked before it is offered: every site reachable,
no site on impassable ground, one site per tile, equal town-to-center cost,
and equal cost from each town to its own sites. The center holds either a
guarded gold mine (*last empire standing*) or the **Shrine of the First
Flame** (*hold the relic* for 5 / 7 / 10 dawns, or eliminate everyone). Four
empires need a medium or large map. Same seed + settings → same map.

### 12. Hot-seat, summary, high scores, keys

* **Hot-seat:** any seat of Twin Harbors or a random map can be a person.
  Players share the computer; at every hand-over the map is hidden until the
  next player presses *Begin*. Battles between two people are played on the
  same screen, each side by its owner. Each human seat chooses its own
  patron; AI rivals still start without one (as before).
* **Summary (S20):** day-by-day charts of army size (recruitment value),
  income (Gold equivalent: Wood/Stone 250, Crystal/Favor 500 — for
  statistics only, not a market rate), towns and treasury for every empire;
  totals (battles, creatures defeated/lost/recruited, buildings, captures);
  score breakdown. The rules record the statistics in `MatchState.stats` at
  the start and at every dawn, so a loaded game shows the same history.
* **Score:** victory 2,000; speed bonus max(0, 1,500 − 25 × day) on a win;
  army value ÷ 100; 300 per town; 100 per site; 100 per battle won; 2 per
  creature defeated; times the difficulty multiplier. A campaign's score is
  the sum of its mission scores.
* **High scores (S21):** the 20 best campaign runs and the 20 best skirmish
  results on this computer (`records.json` on desktop, browser storage on the
  web), separate from saves and preferences.
* **Keys:** F1 opens the shortcut list on every screen (also ? on the map). Settings → Controls
  rebinds every shortcut (a key moved onto another action in the same context
  unbinds that action). Esc, F1 and the arrow keys are fixed.

### Removed

The disabled *Multiplayer* and *Custom Map* cards are gone from New Game.
Online play is not planned at this stage; the map editor is later.

### Touch points with the documents (group 0.4)

* **campaign/01 §"Story"**: "No … cinematic dialogue system is required" —
  the dialogue window is the "text-first dialogue overlay with portraits,
  subtitles, Backlog and Continue" the same section allows.
* **campaign/01 difficulty line**: honoured — no campaign difficulty, and
  skirmish difficulty never touches creature statistics.
* **design/02 §8 Favor**: unchanged in the campaign; interventions are a
  skirmish feature.
* **design/04 §5 resurrection**: Mending Light only heals living creatures.

### Open questions for the owner (group 0.4)

1. All values are first proposals checked only by AI-vs-AI runs and unit
   tests. Human playtests are the next step.
2. Should weekly events, interventions and the expanded skills/spells ever
   appear in campaigns (e.g. the proposed Norse campaign)?
3. Is one intervention per week the right limit, or should it be per day
   with higher prices?
4. Should map events and camps use pantheon-neutral creatures only? Today the
   mercenary event offers Centaurs (a Greek family) on every map.
5. Score formula weights.

---

## Group 0.5 — owner requests of 2026-10-01 (after the mounted heroes)

_Status: the **requests and four answers are owner decisions**; every value
below is **P — proposed this build, unplaytested**. Owner request: a central
catalog of every icon; a second campaign with seven missions; Three Beacons
Mission 2 played in order; more complex random maps with more settings
(learning from Age of Mythology and Heroes 3); a hero screen much closer to
Heroes 3; more spells and artifacts with stories, documented for icon
production. Owner answers: the campaign is **Norse — The Winter Oath**; M02
gets **both** a map block and an early-completion rule, applied to every
campaign; the hero screen gets **Heroes-3-style slots** (content version bump,
old saves incompatible); about **30 spells and 45 artifacts**._

### 13. Steps in order, with early work counted (owner decision)

An objective may list `requires` (steps that must be completed first; it then
starts *locked*). A locked step opens when its prerequisites complete, and if
its own goal is already met at that moment it completes at once — so a player
who chose a god or raised Griffins ahead of time loses nothing. The journal
shows "Opens after: …" on locked steps and a **Done early** chip when a locked
step's goal already holds. Three Beacons M02 now runs pass → nest → covenant →
god → Windcrest Griffins → beacon; the map already enforces the first part
(the ridge is solid except the guarded pass). The validator rejects unknown
prerequisites, cycles and a `requires` step that does not start locked. The
Winter Oath uses the same rule in all seven missions.

### 14. The hero screen in the style of Heroes 3

* **Layout:** left — portrait, the four primary skills as tiles, experience and
  mana bars, morale, luck, movement and vision, eight secondary-skill slots
  (Basic / Advanced / Expert); centre — a paper doll around the hero's own 3D
  mounted model (click it for a salute) with the spellbook button; right — the
  player's heroes; bottom — army, exchange and quest buttons.
* **Equipment:** 19 slots — head, neck, cape, weapon, shield, armor, two rings,
  feet, mount and five miscellaneous — plus the backpack. An artifact has a
  *kind* and fits every slot of that kind; equipping with no free slot of the
  kind swaps with the first one. Pick an item in the backpack, then click a
  matching slot (non-matching slots refuse); pick an equipped item to read it
  and take it off. Rarity classes: treasure, minor, major, relic (the socket
  frame shows it). A set whose pieces could not all be worn at once is
  rejected by the validator.
* Content version **0.8.0**: the equipment layout changed, so older saves are
  refused as incompatible (as for every content-version change).

### 15. More spells and artifacts, with stories

* **30 new spells** (54 in all): 12 shared and 3 per pantheon, each with a
  short lore text. Four new spell effects any content may use —
  `melee_mitigation` (a fraction of melee damage taken), `min_damage_roll`
  (a cursed stack rolls minimum damage), `mass_heal`, `mass_damage` — and the
  target `enemy_army` (army-wide penalties).
* **Town spell libraries (Heroes-3 style):** a Rune Circle / Sanctum offers the
  town's own pantheon spells of each tier it has, plus a draw of shared spells
  fixed per match and town (`librarySpellsPerTier` 6 / 5 / 4 for tiers 1–3), so
  two towns of the same pantheon need not teach the same spells.
* **54 new artifacts** (79 in all) across every slot kind, each with lore,
  rarity, origin pantheon and price, and **6 new sets** — one per pantheon:
  Gear of Perseus, Arms of the Einherjar, Regalia of the Two Lands, Treasures
  of Takamagahara, Treasures of the Tuatha, Gifts of the Feathered Serpent.
  Existing spells and artifacts received lore too.
* All new spells, artifacts and sets are *expanded* content (skirmish, random
  maps, The Winter Oath); The Three Beacons keeps its documented items.
* Every spell and artifact, with its lore and a drawing brief, is listed in
  `ICON_CATALOG.md` (§17).

### 16. Random maps 0.2 (`pr-skirmishgen-0.2`)

* **Six map types**, each a different structure on the same symmetric
  construction: *Continental* (open land; Age of Mythology land maps),
  *Highlands* (a mountain ring around every home valley with two guarded
  passes; HoMM3 templates with guarded zone links), *Lake Isle* (a lake in the
  middle, the contested site on an island, one causeway per empire; AoM
  Ghost Lake), *Wild Forest* (deep forest and glades, roads are lifelines; AoM
  Alfheim), *Marshlands* (fens and pools split the land; AoM Marsh),
  *Crossroads* (peaks around a rich centre entered only through one strongly
  guarded gate per empire; HoMM3 Jebus Cross).
* **Zones:** every empire has a home zone (mines, cache, a shrine with a
  treasure-class artifact, a near event) and an outer zone (camps, ruins with
  minor artifacts, far events, the guarded gold mine, a high-tier lair); the
  centre holds the gold mine or the relic shrine (a relic-class artifact on
  rich and Crossroads maps).
* **Settings:** size small / medium / large / **huge** (radius 14 / 17 / 21 /
  25; four empires need medium or larger); guard strength weak / normal /
  strong (60 / 100 / 160 % of every guard and wandering band); treasure scarce
  / normal / rich (60 / 100 / 150 % of rewards; scarce drops the near event,
  the home shrine and the crystal mine, rich adds a home gold mine, a sealed
  vault with a major artifact and a second crystal mine); starting wealth low
  / normal / high (50 / 100 / 200 %); roads full / sparse (sparse: roads only
  to the sawmill and quarry); revealed map (terrain and sites start explored,
  heroes stay hidden). Every setting is part of the map's identity, so the same
  seed and settings always give the same map.
* **Checks** (all must pass before a map is offered): SKM-1…5 as before, plus
  **SKM-6** on Highlands and Crossroads — the centre is reachable only through
  the guarded openings, one or more per empire.
* **AI fix found on the way:** two AI empires could each sit in their own town
  because each judged the other's visiting hero alone too strong; the AI now
  counts its garrison when deciding whether its town is threatened.

### 17. Icon catalog (owner request)

`ICON_CATALOG.md` and `assets-source/icons/ICON_CATALOG.xlsx` / `.csv` list
every icon and small illustration (695 entries in 12 sections) with its asset
ID, the screens that show it, what is shown today and a brief; they are
generated from the game (`npm run icons:catalog`). Delivered icons dropped into
`assets-source/icons/final/` are registered by `npm run icons:import`.

### 18. The Winter Oath (owner decision: build it)

Seven Norse missions; see `CAMPAIGN_2_NORSE_OUTLINE.md`. New generic data:
objective conditions `hero_defeated` and `town_owned`, a minor-god `count`,
starting town garrisons, epilogue variants by flag, and the winter
presentation biomes `tundra` and `fjord`.

### Open questions for the owner (group 0.5)

1. Hero screen: is the 19-slot doll (five miscellaneous slots, Heroes 3) right,
   or should it be smaller for this game's item count?
2. Spell libraries: should every town of a pantheon teach the same spells
   (predictable), or keep the per-match draw (proposed)?
3. Random maps: are the six types the right set? Which should be the default?
4. The Winter Oath: see its own open questions (difficulty, expanded content,
   order, portraits and music).
