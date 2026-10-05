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
  (Basic / Advanced / Expert); centre — a paper doll around the hero's
  mounted figure (a 2D still of the pantheon's avatar since the 2D migration)
  with the spellbook button; right — the
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

## Group 0.6 — owner requests of 2026-10-02

Owner request: the AI should use more of the game; hero-screen polish; random
maps with portals, roads to the centre, neutral creatures and a fix for the
three-player imbalance; campaigns for the four pantheons that had none; and
three fixes (show the last attack, per-unit shooting range, fewer hero steps
a day). Owner answers: about **8 hexes a day**; **maximum range + half damage
in the far half**; **seven missions per campaign**; **a neutral roster mixed
with pantheon creatures**. Everything below is **proposed, unplaytested**
unless marked as an owner decision.

### 19. Battle fixes (owner decisions)

* **The last attack is shown.** The battle screen keeps the last board when
  the rules end the battle, plays the final blow and the fall of the last
  stack, and opens the result after a short beat (700 ms at normal speed,
  none at instant speed).
* **Shooting range per creature** (owner decision: maximum range + far-half
  penalty). Every shooter has `range` (hexes, 2–20; content validator). No
  shot beyond it; in the far half (distance × 2 > range) a shot does half
  damage — this replaces the old fixed "long range" distance (half damage
  beyond 10 hexes, no limit). Distance is the shortest distance between the
  two stacks' cells; the field is 15 × 11, so the far corner is about 19 hexes
  away. Proposed ranges (base / upgrade): most shooters 16/17 — Peltasts,
  Jackal Guardians, Lindworms, Kirin, Xiuhcoatl, Desert Colossi; the Greek
  Temple Adepts and Cyclopes 18/19; Eagle Warriors 14/15; **short range**
  Banshees and Hill Slingers 9/10. A first set (6–11) was measured and
  rejected: with full damage only up to half the range, shooter-heavy rosters
  collapsed in AI-vs-AI duels (Greek armies 0.31–0.33, Egyptian escorts 0.18;
  `DEVELOPMENT_STATUS.md`). The Egyptian starting escort gained one Sacred
  Scarab (21 + 8) to stay even. The AI holds a shooter with nothing in range
  while enemy troops approach (unless it is under fire) and otherwise steps
  only as far as it must to bring an enemy into range, away from enemy reach.
* **About 8 hexes a day** (owner decision): the movement table by the
  army's slowest speed is now 750–1,000 points (speeds 3–11), i.e. about
  7.5–10 plains hexes; roads cost 75 per hex. Two movement bonuses were halved
  with it (Fleet Foot +200, Wings of Hermes +150; the "Ask for directions"
  event +250).

### 20. Random maps 0.3 (`pr-skirmishgen-0.3`)

* **Neutral roster.** Eight new neutral families (base + upgrade, original
  folklore notes): Brigands (T1), Hill Slingers (T2 shooters, range 9/10),
  Wild Boars (T2, charge), Clay Golems (T3, unyielding), Wyverns (T4, flight),
  Ogres (T5), Basilisks (T6) and Elder Drakes (T7, flight); with the old
  Centaurs, nine. Guards, camps and wandering monsters draw **neutral and
  pantheon creatures half and half** wherever a tier band has both. The
  Encyclopedia's bestiary has a **Neutral** filter.
* **Two-way portals** (setting, on by default; the existing `icon.marker.portal`
  marks them). A hero who stops on a portal steps out of its twin at once, at
  no movement cost; a hero on the twin blocks it. The pairing is copied by the
  map's symmetry, so every empire gets the same portals: with 2 or 4 empires
  one portal per empire, paired by the 180° turn or the 4-empire reflection;
  with 3 empires two per empire (one leading to each neighbour). A portal sits
  on the side of its region away from its twin's region, so it is a real
  shortcut. The random-map preview draws them as violet rings.
* **Roads to the centre** with full roads (sparse roads still stop at the
  sawmill and quarry). With 8 hexes a day, rival towns stay two days or more
  apart.
* **Three-empire fairness.** The old measurement played five maps six times
  each; it now plays a different map in every match and reports who is
  knocked out first. On thirty maps the "second seat wins" result did not
  hold: the empire that moves first each day was the weak seat. **Rotating
  turn order** (setting, the default with three or four empires; the day's
  first empire moves last the next day) spreads that disadvantage but does
  not remove it — the seat that moves first on day 3 is now knocked out
  first most often (measurements in `DEVELOPMENT_STATUS.md`). A real fix
  needs the AI to keep the day's first mover out of unseen reach.

### 21. The AI uses more of the game (`packages/ai/src/growth.ts`)

* **Level-ups** take the offer worth most to that hero: Archery with
  shooters, Offense with melee troops, Wisdom and mana skills only with a
  spellbook, generic skills by their effects (one scale: about 10 points per
  point of commander Attack).
* **Artifacts and sets.** The AI values a whole loadout — every item, every
  set bonus met and half of the next one in progress — and equips, swaps (a
  set piece over a slightly stronger loose item) and buys at the merchant by
  loadout gain per Gold, keeping a reserve.
* **Adventure spells.** A movement spell when the chosen move falls just short
  today (keeping half the mana for battle when the hero knows battle spells);
  a scouting spell on an unseen rival town within two days' march; Recall to a
  threatened town with no hero inside when walking would take longer than
  today.
* **Map fixes found on the way:** heroes reinforce from any owned town (not
  only the first) and skip a trickle of daily recruits; an unseen rival town
  is approached only by a hero strong enough for a typical garrison (half a
  week of its tier 1–5 growth per week played, up to eight weeks), which ends
  the walk-up-and-back loops; an empire's last town counts half again; portals
  the empire has used are taken as shortcuts; equally scored moves are broken
  by a hash of the empire and the move instead of by coordinates (on a
  mirrored map the west and east empires used to prefer different
  directions).
* **Rule change (proposed): defeated heroes return to the tavern pool** as new
  recruits. Long games used to stall when an empire's pool ran dry and it could
  never field a hero again.

### 22. Hero screen polish

Drag and drop (backpack → a slot, ring to ring and misc to misc, a worn item
→ the backpack) next to the click-to-pick flow; a **comparison** of a picked
backpack item with what is worn in each slot it fits (attribute changes and
set bonuses gained or lost); **set badges** on worn and packed set pieces and
in the set list, and **ability badges** on army slots, creature details and
the Encyclopedia. Badges show the delivered icon (`icon.set.<id>`,
`icon.ability.<id>`) as soon as it exists; until then a clearly temporary
stand-in (a coloured gem; the nearest interface glyph).

### 23. Four more campaigns (owner decision: seven missions each)

The Winter Oath's seven mission shapes (Restore, Hunt, Covenant, Seek, Rival,
Refuge, Finale) are now a reusable builder (`packages/content/src/campaign/arc.ts`):
a campaign supplies the writing, the creatures of each guard, the biome and
the rewards; the objective order, the economy and the war-bands follow the
Winter Oath. Each campaign has an original story, a new campaign hero, five
opponents, two covenants (tiers 3 and 6), a set of its pantheon's artifacts
collected along the way and two endings. Outlines:
`CAMPAIGNS_3_TO_6_OUTLINE.md`. New presentation biomes: `desert`, `jungle`,
`autumn`, `moor`.

### Open questions for the owner (group 0.6)

1. Ranges: long ranges (16–19) keep the pantheons close to their old balance
   but rarely stop a shot on the 15-column field; only Banshees and Hill
   Slingers (9/10) feel the limit. Shorter ranges need compensation elsewhere
   (shooter damage, or full damage further out). Which do you prefer? Should
   range also count in sieges (walls ignore it today)?
2. Movement: 750–1,000 points makes maps feel larger — keep it, or move only
   the random-map sizes down?
3. Portals: on by default? Should a portal ever be guarded?
4. Neutral roster: names and tiers fine? Should neutral creatures also appear
   in campaign missions more widely (they guard many of the new campaigns' sites)?
5. Defeated heroes back in the tavern pool: as level-1 recruits (proposed) or
   with their old level, as in Heroes 3?
6. The four new campaigns reuse the Winter Oath's mission shapes closely. Is
   that what you want, or should later passes give each its own mechanics?
7. Hero vision: with about 8 hexes a day a hero can be reached by an enemy it
   cannot see (vision 5). Vision 8 measured fairer for turn order on Twin
   Harbors (first mover 0.47 instead of 0.42) but less fair between the two
   towns (0.56 instead of 0.52). Keep 5, or try 7–8?

## Group 0.7 — owner requests of 2026-10-02 (afternoon)

Owner request: hero specialties listed in the tavern; finish the 24 gods that
were listed but not designed (plus a list for GPT to paint all 60 gods); new
map sites; neutral creatures that join or flee when the army is much stronger.
Owner answers: the four new gods of each pantheon are **split 2 + 2** (two join
the first choice, two the second); the new sites appear on **random maps**;
neutrals **join for free or flee**; the GPT list covers **all 60 gods**.
Everything below is **proposed, unplaytested** unless marked as an owner
decision. The Three Beacons keeps its documented rules (no specialties, no new
gods offered, no reactions, no new sites).

### 24. Hero specialties

Every one of the 62 heroes has one specialty (`packages/content/src/common/specialties.ts`),
built only from shared effects (no rule names a hero). The tavern (Heroes'
Lodge), the hero screen and the Encyclopedia show it with its exact rule text
before hiring.

* **Creature** (41 heroes): the family, base and upgrade, gets +1 Attack and
  +1 Defense in this hero's battles, one more of each at hero levels 4 and 8.
* **Spell** (12): the hero knows the spell from the start (given a spellbook
  class) and casts it with +1 Spell Power, one more at levels 3, 6 and 9 —
  only damage and healing spells, whose effect grows with Power.
* **Resource** (9): a flat daily income while the hero is in play — +250 Gold,
  +2 Wood or Stone, +1 Crystal or Favor.

Active in every skirmish and random map, The Winter Oath and the four arc
campaigns (scenario feature `heroSpecialties`); a save from before keeps its
rules. The AI hires by specialty value (after returning heroes).

| Pantheon | Tavern heroes | Campaign heroes |
|---|---|---|
| Greek | Alexios: Hoplites; Melas: Peltasts; Scout Captain: Griffins; Heracles: Minotaurs; Achilles: Cavalry; Odysseus: +250 Gold a day; Atalanta: +2 Wood a day; Perseus: Lightning (spell) | — |
| Norse | Sigurd: Lindworms; Brynhild: Valkyries; Ragnar: +250 Gold a day; Lagertha: Frost Wolves; Hervor: Spark (spell); The Grey Jarl: Draugar; Ulfhild: Frost Trolls; Hrafn the Hollow: Jotnar; Bone-Helm: Nidhogg Wyrms; Barrow Captain: Draugar | — |
| Egyptian | Imhotep: +2 Stone a day; Hatshepsut: +250 Gold a day; Ramses: Sphinxes; Cleopatra: +1 Crystal a day; Nefertiti: Ankh of Renewal (spell) | Seshet: Wrath of Sekhmet (spell); Djedkhonsu: Scarab Swarm (spell); Paser: Ushabti; Ankhwen: Crocodile Beasts; Hekaib: Jackal Guardians; Iti: Bennu |
| Japanese | Momotaro: Kitsune; Yamato Takeru: +250 Gold a day; Tomoe Gozen: Kirin; Benkei: Oni; Yoshitsune: Tengu | Akane: Kitsune-bi (spell); Yamikage: Raijin’s Drums (spell); Kurogane: Jorogumo; Gonryō: Kappa; Oboro: Orochi; Kagerō: Tengu |
| Celtic | Cu Chulainn: Cu Sith; Fionn mac Cumhaill: Horned Stag Spirits; Scathach: Kelpies; Deirdre: Cauldron of the Dagda (spell); Boudicca: +1 Favor a day | Orla: Wild Hunt (spell); Dubhghall: Banshees; Fiachra: Fomorian Giants; Corc: Selkies; Tadhg the Grey: Pooka; Ciar: Banshees |
| Mesoamerican | Hunahpu: Camazotz; Xbalanque: Jaguar Spirits; Nezahualcoyotl: +250 Gold a day; Topiltzin Quetzalcoatl: Rain of Tlaloc (spell); Eight Deer Jaguar Claw: Eagle Warrior Spirits | Itzel: Obsidian Rain (spell); Itztli: Ember Burst (spell); Tecuani: Xiuhcoatl; Acatl: Cenote Crocodiles; Mazatl: Stone Colossi; Tlacatl: Feathered Serpents |

### 25. The last 24 gods (owner decision: split 2 + 2)

No god is "not designed" any more: each pantheon has its patron, **four
first-choice gods** (Temple I, 20 Favor; the two documented ones plus two new)
and **five second-choice gods** (three from group 0.3 plus two new). New
effect types: `mana_regen` (mana at every dawn) and `wounded_fury` (Attack for
stacks at half strength or less).

| Pantheon | New first choice | New second choice |
|---|---|---|
| Greek | Apollo: +1 Power, +1 morale · Artemis: shooters +2 Attack, +1 vision | Poseidon: +10% movement, tier 4–7 +1 Attack · Hera: +1 growth tiers 1–4, +1 morale |
| Norse | Frigg: +1 Knowledge, +2 vision · Baldr: +1 Power, +2 mana a dawn | Loki: +2 Luck, +10% movement · Njord: +200 Gold, +1 Crystal a day |
| Egyptian | Anubis: +1 Knowledge, 10% recovery · Bastet: +1 Luck, tiers 1–3 +1 Defense | Hathor: +250 Gold a day, +1 morale · Sobek: +2 growth tiers 1–3, +1 Stone a day |
| Japanese | Tsukuyomi: +1 Power, +1 vision · Benzaiten: +1 Knowledge, +2 mana a dawn | Izanagi: +1 growth tiers 1–4, +2 mana a dawn · Izanami: 20% recovery |
| Celtic | Nuada: +1 morale, tiers 4–7 +1 Defense · Danu: +1 Power, +1 growth tiers 1–2 | Arawn: 15% recovery, +1 Luck · Manannan: +2 vision, +15% movement |
| Mesoamerican | Mixcoatl: shooters +2 Attack, +1 vision · Xolotl: +1 Knowledge, +10% movement | Chalchiuhtlicue: 10% recovery, +1 growth tiers 1–4 · Mictlantecuhtli: +2 Attack at half strength, +1 Luck |

The campaigns name the gods each mission may offer (`committableGodIds`), so
the new gods appear only in skirmish and random maps; The Three Beacons still
offers Athena or Ares. The portraits of all 60 gods are briefed for GPT in
`assets-source/art/briefs/GPT6_BRIEF_4_GOD_PORTRAITS.md` (1024 × 1024, round
crop, delivered through `npm run icons:import`).

### 26. New map sites (random maps, `pr-skirmishgen-0.4`)

Nine new site kinds, every one shared data (`SiteDefinition.kind`), placed by
the random-map generator for every empire alike (copied by the map's
symmetry, after monsters and portals):

| Site | Rule | Placed per empire |
|---|---|---|
| Learning stone | +1,000 experience, once per hero | 1, home region |
| Spell shrine | teaches a tier 1–2 Sanctum spell to a hero with a spellbook and the Wisdom for it | 1 |
| Skill trainer | teaches a non-pantheon skill at Basic to a hero with a free slot | 1 |
| Quest hut | half ask for a delivery (10 Wood + 10 Stone, or 5 Crystal, or 6 + 6 + 2 Crystal) for 1,500 Gold and a minor artifact; half for the defeat of the region's ruin guardians (cleared by **that** empire) for 1,500 experience and a minor artifact | 1 |
| Key tent + key gate | the tent gives the empire a key of its colour; the matching gate opens only for empires holding it. The gate closes a mountain pocket with a treasury (1,500 Gold, 3 Crystal, an artifact) | 1 pair where a pocket fits (about 83 % of maps; otherwise neither) |
| Windmill | pays the first hero each week (one of: 3 Wood + 3 Stone, 2 Crystal, 600 Gold + 2 Wood, 2 Stone + 1 Crystal) | 1, home region, on a road |
| Treasure chest | choose 1,000 Gold or 750 experience (far chest 1,500 / 1,250); scarce treasure removes the near one | 2 |
| Prison | frees a level-4 hero of the empire's pantheon (not its leader) with 10 tier-1 troops, who joins at once; the captive is not offered in any tavern until freed | 1 (an empty prison with 500 Gold when the pantheon has nobody left) |

New check **SKM-7**: every key gate has a tent of its colour, every prisoner
is a real hero, every quest names a real site. Measured on 990 maps (all
sizes, types and 2–4 empires): all valid.

### 27. Neutral reactions (owner decision: join free or flee)

When a hero attacks neutral creatures (a site guard without a commander, or a
wandering monster band) and its army is much stronger — strength ratio by the
same heuristic as the threat estimate, with the hero's Attack and Defense —
the creatures do not fight unless the player insists:

* ratio **≥ 3** and every stack fits the army: they **offer to join for free**
  (Accept them / Let them go / Fight anyway);
* ratio **≥ 2**: they **flee** (Let them go / Fight anyway).

Either way the guard is gone and its reward (or the band's bounty) is kept, but
no experience is gained and quest "defeat" conditions count it as cleared by
that empire. Skirmish and random maps only (scenario feature
`neutralReactions`); the campaigns keep every battle. The AI accepts joiners
when that is legal. Measured effect (AI vs AI, `DEVELOPMENT_STATUS.md`): Twin
Harbors matches end on day 14.9 instead of 20.0 and the AI rival reaches an
undefended Westharbor on day 6 (11–12 before), so the middle game is faster as
intended — but the empire that moves first each day now wins 0.68 of the
matches (0.42–0.48 without free joiners): its leader collects the joiners first.

### 28. Story art in the game (delivery 2026-10-02)

Presentation only. The 92 delivered pictures are wired by documented asset-ID
conventions (`ASSET_PIPELINE.md` §13): dialogue busts beside the dialogue box
(speaker's `portraitAssetId` with `.bust`), campaign covers behind campaign
selection and its setup steps (cards made from them), mission pictures behind a
new full-screen **briefing scene** (title top left, objectives top right, the
briefing lines in the dialogue box one at a time with Next/Back; Begin is always
available), and the chosen ending behind the campaign epilogue. The campaign
hero speaks from the left, other speakers alternate by first appearance;
right-hand busts are mirrored. The skirmish herald now has a portrait ID of its
own (`story.herald.portrait`) instead of borrowing the leader's face.

### Open questions for the owner (group 0.7)

1. Specialty sizes: +1/+1 per family (and more at levels 4 and 8), +1 Power
   per three levels, +250 Gold a day. Too strong, too weak?
2. Should specialties also be active in The Three Beacons (documented rules
   say no specialties today)?
3. Neutral reactions: free joiners favour the first mover on Twin Harbors
   (0.68). Options measured: flee only, or flee at 3× / join at 4× — both bring
   turn order back to 0.46–0.48 but also the game length back to about 20 days.
   Not yet measured: joiners for Gold (Heroes 3 style), only part of the guard
   joining, or no joining in the first week. Which do you prefer? Should the
   campaigns use reactions too?
4. Prisons free a level-4 hero; should the level grow with map size?
5. Key pockets appear on about 83 % of maps (only where the terrain allows a
   closed pocket). Acceptable, or should the generator carve one every time?
6. Briefing: one line at a time (like story scenes) or all lines listed as
   before?

## Group 0.8 — owner requests of 2026-10-03

Owner request: context cursors now (with stand-ins, so the Brief 7 art drops
in without code changes); a late-game use for Favor; a smarter mid-game AI
(weekly events; army strength with skills, sets and pantheon bonuses); three
small fixes (minimap view frame, the combat log's first round, hot-seat
messages); graphics quality settings for weaker PCs. Owner answers: Favor buys
**divine gifts at the Temple**; graphics are **presets + an automatic pick**.
Everything below is **proposed, unplaytested** unless marked as an owner
decision. The Three Beacons keeps divine gifts off (as it keeps interventions
off).

### 29. Divine gifts at the Temple (owner decision: this use of Favor)

A town with a Temple grants **one gift per world week** for Favor (Town →
Temple → *Divine gifts*). Gifts are data (`DIVINE_GIFTS`,
`packages/content/src/common/expanded.ts`); the rules are a quote/commit
service (`packages/rules/src/systems/gifts.ts`, command `ReceiveDivineGift`).
Proposed values:

| Gift | Favor | Gives |
|---|---|---|
| Temple Treasury | 5 | 2,000 Gold |
| Timber and Stone | 5 | 5 Wood + 5 Stone |
| Tears of the Gods | 6 | 4 Crystal |
| Anointing | 8 | +1,000 experience for a hero in the town |
| Blessed Brood | 10 | recruits for every built dwelling of tier 1–4: half a week's growth each (at least 1) |
| Temple Relic | 20 | a minor artifact for a hero in the town, the same pick for the whole week (drawn from match, town and week — no gameplay random stream) |

Only in scenarios with divine interventions (skirmish, random maps, The Winter
Oath and the four arc campaigns). The AI uses them too: with Favor it does not
need for gods, and keeping 10 back while the week's intervention is unused, it
takes the best value per Favor at each Temple town that is not threatened.

### 30. The AI judges strength more fully and plans around the week (`packages/ai/src/assessment.ts`)

* **Strength:** the shared heuristic (army hit points and damage with the
  commander's Attack and Defense, which already count artifacts, set
  attributes, skills and gods) now also counts what it ignored: battle stat
  bonuses that match each creature (pantheon signatures, gods, specialties,
  set bonuses, the weekly event), Offense/Archery (√(1 + bonus)), Armorer
  (√(100 / (100 − cut))), morale and luck (±4 % and ±3 % per point, at most
  ±3 points) and spell casting (up to +25 % with Power, halved below 10 mana).
  Used everywhere the strategic AI compares heroes (targets, danger, patrols,
  retreats). The weights are proposed, like every AI margin.
* **The week:** the weekly event is read from its effects (no event is
  named): a week of extra Gold income lowers the Gold kept back for building
  (1,500 − 3 × daily bonus, at least 500) and for hiring (3,000 − 4 × daily
  bonus, at least 1,500); a week of extra growth makes walking home to recruit
  worth 1.5 × in its first three days.
* **Measured effect** (AI vs AI, `npm run balance -- skirmish random`): see
  DEVELOPMENT_STATUS.md. One side effect: rival heroes facing a stronger
  war-band now stay behind their walls instead of meeting it in the field —
  the headless arc-campaign journeys now recruit the town's troops before the
  M05 assault (as a player would).

### 31. Graphics quality (owner decision: presets + automatic pick)

Low / Medium / High (`packages/presentation/src/graphics.ts`), picked on the
first start by a quick test and changeable in Settings → Display (with *Test
again*). Proposed values:

Since the 2D migration (2026-10-03) the presets drive the PixiJS views:

| | High | Medium | Low |
|---|---|---|---|
| Render resolution | up to 2 × on sharp screens | CSS pixels (1 ×) | 70 % of CSS pixels |
| Anti-aliasing (next start) | on | on | off |
| Soft ground shadows under figures, heroes, map objects and obstacles | on | on | off |
| Map decoration | all | no grass tufts or shrubs | trees and rocks thinned by half |
| Painted ground, sea, sky, battlefield | yes | yes | no (procedural colours) |
| Small ambient animations (idle loops, beacon glows, cheering) | on | on | off |
| Spell and combat effects | effect strips and glows | effect strips and glows | short flashes only |
| Frame-rate cap | display rate | 60 | 30 |

The quick test: a hidden 1280 × 720 WebGL 2 canvas, a fixed-cost shader drawn
three passes at a time (median of up to five samples, at most 0.6 s), plus the
renderer name. Proposed thresholds: under 4 ms a pass → High, under 12 ms →
Medium, slower → Low; software renderers (SwiftShader, llvmpipe, Microsoft
Basic Render) → Low; fewer than four cores or under 4 GB memory cap the pick at
Medium. Not calibrated on a range of real PCs.

### 32. Context cursors (stand-ins until Brief 7)

The 24 cursor IDs of `GPT6_BRIEF_7_CURSORS.md` are in the game now
(`packages/ui/src/assets/cursors.ts`, picked by `app/cursorContext.ts`). Where
the system has a cursor with the same meaning (arrow, hand, grab, busy,
not-allowed) it is used; the others are drawn 32 px stand-ins (helmet, gate,
horseshoe, crossed swords, tower, banner, portal ring, spell star, boot,
wing, bow, broken arrow, wall, star medallion, magnifier; the sword turns to
the hex side the strike comes from). `npm run cursors:import` registers
delivered art (§11 of ASSET_PIPELINE.md); no code changes. Settings → Display
→ *Game cursors* switches back to the system pointer. `cursor.map.meet` has no
trigger yet (meeting a friendly hero is not a map action).

### 33. Town gates, the fallen, town armies (owner decisions, second round)

* **Town gates:** heroes use a town from its gate — the road tile in front of it —
  and never stand on the town's own tile. Proposed details: the gate is the
  road-connected neighbour (nearest the map centre when there are several; a town
  without a road uses its walkable neighbour nearest the centre); the gate holds
  the town site for movement, so passing a town means walking around its gate.
* **The fallen** block their cells for the rest of the battle, except in wall or
  gate openings (proposed, so a corpse never seals a town); flyers pass over them.
  Not measured AI-vs-AI yet.
* **Town armies** by drag and drop (Shift/Ctrl-drag or click-and-choose to split);
  an adjacent own hero is met (troop exchange) by clicking it on the map.

### Open questions for the owner (group 0.8)

1. Divine gifts: are the prices right (5–20 Favor), and should a Temple give
   more than one gift a week at Temple level 2?
2. Should the Relic draw be visible a week ahead (it is fixed for the week
   already, so the player can see it before paying)?
3. Graphics: should Low keep the painted ground (it is most of the look; its
   cost is texture memory, not frame time)?
4. The automatic pick's thresholds come from no real-PC measurements: may we
   log the test result (locally, in Settings) during play-testing?
5. Corpses: should healing or resurrection ever clear a corpse's cell, and should
   corpses block shots (they do not today)?
6. Town gates: which tile should be the gate when a town has several roads (today:
   the one nearest the map centre)?

## Group 0.9 — owner requests of 2026-10-04 (proposed values)

The owner decided *what* (the Workshop's weekly stock, rarer joining and
fleeing, square random maps for up to six empires, three hireable heroes for
each of the four later pantheons); the values below are proposed and not
play-tested or measured AI-vs-AI.

### 34. The Workshop's weekly wares

* Four different tier-1 (rarity *treasure*) items a week, the same four in
  every Workshop of the match (drawn from match and week), each bought once per
  Workshop until the next week. Effect type `enables_workshop` (stock size,
  rarities), so another building or pantheon can sell another class later.
* Nine plain-gear items were added so the pool (12) is larger than a week's
  stock: +1 to one commander attribute (1,000–1,200 Gold), +1 morale (1,300),
  +5 % daily land movement (900–1,000), +1 vision, +1 mana at dawn.
* Skirmish feature (`scope: 'expanded'` items): The Three Beacons has no wares.

### 35. Neutral reactions, rarer (`systems/sites.ts`)

* A neutral group facing a strong enough army that it could join now offers to
  join with chance 1/4 (it always offered before) and flees with chance 1/4
  (3/4 × 1/3); a group too strong to join but outmatched flees with chance 1/3
  (it always fled before). Otherwise it stands its ground.
* The roll is a pure function of match, group, hero and day, so reloading does
  not change it and coming back the next day can.

### 36. Random maps 0.5 (`pr-skirmishgen-0.5`)

* Square at every size: the generator lays out its hexagon inside a square of
  land; cells outside the square are `void` (black, impassable) and the
  square's corners are mountains.
* Two to six empires; four or more only on Large or Huge. Five empires use the
  six-fold layout with the sixth sector left wild (its gates walled, portals
  still in every sector).

### 37. Twelve hireable heroes

Three per pantheon for the Egyptian, Japanese, Celtic and Mesoamerican
pantheons (historical or legendary figures, dignified; see the content's
`heroes` for their stories), each with a specialty from the shared vocabulary
(a creature family, a spell or a resource). Portraits are ordered in Brief 9.

### Open questions for the owner (group 0.9)

1. Workshop: is four items a week right, and should a second Workshop level
   add minor items?
2. Neutrals: with joining rarer, should the join price drop?
3. Six empires: the Huge map gives each empire about the land of a Large
   four-empire map; is that enough room?

## Group 1.0 — owner requests of 2026-10-04 (evening; proposed values)

The owner asked for climates that matter, rivals that play differently by
pantheon, more use of the god-card icons, and map music per pantheon. The
values below are proposed and unplaytested; the AI-vs-AI measurements are in
DEVELOPMENT_STATUS.md.

### 38. Climate rules (scenario feature `climateRules`)

One small battle rule per map climate, the same for both armies
(`content/src/common/climates.ts`, effect types `creature_stat` and
`shooting_range`; the battle keeps its own copy of the rule, so a save keeps
the battle it began):

| Climate | Weather | Rule |
|---|---|---|
| autumn | Harvest wind | flyers +1 Speed |
| coast | Salt spray | shooting range −3 |
| desert | Scorching sand | creatures without Flight −1 Speed |
| fjord | Icy spray | every creature −1 Defense |
| high_pass | Thin air | shooting range +2; flyers −1 Speed |
| jungle | Dense canopy | shooting range −4; flyers −1 Speed |
| moor | Fog | shooting range −6 |
| storm_plateau | Thunderstorm | flyers −2 Speed |
| tundra | Biting cold | every creature −1 Attack |

Temperate maps have none. On in skirmishes and random maps (a switch in the
random-map setup), off in The Three Beacons and the campaigns. The encounter
dialog names the weather and the battle shows a chip with it (icons ordered in
Brief 12). A shooter's range never falls below 1.

### 39. Pantheon temperaments for AI rivals (scenario feature `aiTemperaments`)

Each pantheon's AI rival plays in its own way (`content/src/common/temperaments.ts`,
`ai/src/temperament.ts`). A temperament changes only the AI's choices — never
a rule, price or statistic — and the difficulty still sets the strength
margins, which the temperament scales (never below 1: the AI never attacks an
army it judges stronger).

| Pantheon | Temperament | What changes |
|---|---|---|
| Greek | Strategists | nothing (the neutral reference) |
| Norse | Raiders | margins ×0.88, rival heroes, towns and mines worth ×1.3, one extra hero, troops ×1.25 and comforts ×0.9 in the build order, magic ×0.85 |
| Egyptian | Builders | margins ×1.12, raiding ×0.85, economy and walls ×1.4 in the build order |
| Japanese | Disciplined | dwelling upgrades and the Training Academy ×1.5 in the build order |
| Celtic | Mystics | the Mage Guild ×1.35 in the build order; magic skills and spellcasters ×1.1 |
| Mesoamerican | Devout | once its gods are chosen it keeps offering garrison creatures (never a hero's army) up to 15 Favor for miracles and gifts; the Temple ×1.25 in the build order (it only tips close choices: an early Temple measured 0.29 for the Mesoamericans) |

A favoured kind of building also gains a fixed bonus (1,500 per point of
weight above 1), so a preference shows even for buildings the base score values
little (walls, Temple). On in skirmishes and random maps (a switch in the
random-map setup), off in the campaigns. The setup screens name the rival's
temperament. First tuning (2026-10-04): stronger Mystics (magic skills ×1.5)
and Devout (offerings from heroes too, Temple ×1.6, raiding ×1.1) moved the
Twin Harbors averages to Celtic 0.73–0.78 and Mesoamerican 0.22–0.31; the
values above are the softened ones. Ablations (Greek, Celtic, Mesoamerican, 6
matches per pairing) traced the Celtic jump to the magic weight on skills and
hiring (×1.3: Celtic 0.83) rather than the Mage Guild (Celtic 0.61), and the
Mesoamerican drop to the early Temple (×1.4: 0.24–0.29) rather than the
offerings (0.46).

### 40. God commitment

The commitment dialog shows the god with its icon rows (blessings, price) and
the gods of the same choice it shuts out for good; the patron panel and the
committed list carry the role icons. When the commitment is made, the god's
card shows a short moment (rays, the Anointing burst, the committed seal;
1.7 s, none under Reduce motion); a dedicated `fx.god.commit` strip replaces
the burst when delivered (Brief 12).

### 41. Map music per pantheon

On the adventure map, town and hero screens the viewing player's pantheon
plays its own playlist (`music.map.<pantheon>`): five long royalty-free tracks
per pantheon (Pixabay Content License, no attribution required; chosen from
tracks that are neither AI-generated nor registered with YouTube Content ID),
streamed one after another with a crossfade instead of decoded whole. The
mission's soundscape keeps its ambience; battles and menus keep their music.
Without a playlist the map falls back to the soundscape music.

### Open questions for the owner (group 1.0)

1. Climate rules in campaigns: should a campaign mission opt in (fog in a
   moor mission, sand in the desert campaign)?
2. Temperaments in campaigns: should campaign rivals get their pantheon's
   temperament too?
3. Music: keep five tracks per pantheon, or trim the two 16-minute meditations
   (Japanese, Mesoamerican) to save about 20 MB?
