# Campaign 2: The Winter Oath — Norse campaign

**Status: built in this build with proposed, unplaytested values.** The owner
asked for the second campaign with seven missions (decision 2026-10-01: "Norse –
The Winter Oath", missions played in order, early work still counts). Content
lives in `packages/content/src/campaign/winterOath.ts`; the headless journey is
`packages/campaign/test/winterOath.test.ts`. Every map, guard army, wallet, cost,
reward and line of dialogue is a first proposal for the owner to playtest and
change. Target playtimes are targets, unmeasured.

This is original game fiction in a Norse-inspired setting, not a retelling of
any saga. Names of gods, the pantheon roster and the hero Hervor come from the
owner's Norse concept board; the other characters are new.

---

## 1. Premise

The winter did not end. Spring should have reached the fjord-hold of
**Kaldvik** two months ago; instead the ice thickens and the barrow above the
hold has cracked open. Nine winters ago the seeress **Hervor** took a sword from
a mound in the north and hid it under Kaldvik's rune-stone. She did not know the
blade was the keystone of an oath: **Hrolf, the Grey Jarl**, a king of a
thousand winters ago, swore to hold the winter under his mound in exchange for a
kingdom when it ended — and the winter never ended. Now he wants his sword back,
and the north with it.

**Theme:** Wake. Bind. Endure. Oaths inherited, oaths broken, oaths chosen.

## 2. Characters

| Character | Role | In the game |
|---|---|---|
| **Hervor** (Völva) | Persistent campaign hero, spell-led (starts with a spellbook). | `norse_hervor` (concept-board hero; still hireable in skirmish). |
| **Eydis** | Steward of Kaldvik; counts the living and the dead and reacts to losses. | Dialogue portrait only (placeholder). |
| **Skeggi** | Old skald; explains runes, gods and covenants. | Dialogue portrait only (placeholder). |
| **The Grey Jarl (Hrolf)** | Antagonist; speaks from afar in M1–M2, final commander in M7. | `norse_grey_jarl`, enemy hero (huscarl class). |
| **Svanhild** | Valkyrie captain of the aerie (M3). | Dialogue portrait only. |
| **The troll-wife** | Speaks for the frost trolls; offers the covenant for a price (M3). | Dialogue portrait only. |
| **Bone-Helm** | Draugr captain of the ship of nails; patrols the frozen sound (M4). | `norse_bone_helm`, enemy hero. |
| **The grey wanderer** | One eye, two ravens, a grey cloak — never named (M4 map event). | Map event only. |
| **Ulfhild** | Living Jarl of Hvitstrand, sworn to keep the winter (M5). | `norse_ulfhild`, enemy hero leading a full AI rival empire. |
| **Jökul** | Elder of the frozen giants of Hrimgard (M6). | Dialogue portrait only. |
| **Hrafn the Hollow** | An einherjar who left Valhalla for the Jarl's endless war (M6). | `norse_hrafn`, guard commander. |
| **Barrow Captain** | Patrols the glacier plateau (M7). | `norse_barrow_captain`, enemy hero. |

The barrow-dead question: the Norse tier 1 are Draugar. The fiction says *the
dead answer whoever holds a rune-oath*, so Hervor's Draugar and the Jarl's are
the same creature on opposite oaths.

## 3. Campaign rules (proposed)

* Patron **Odin** is fixed. Thor or Tyr in **M3**; a second god (Freyja,
  Heimdall or Hel, 25 Favor, needs the High Hall) in **M5**.
* The Norse signature **Berserk Fury** is on; so is the **expanded content**
  (Norse spells and skills, artifact sets, the arcana artifacts). Weekly events
  and divine interventions stay off. *(The Three Beacons keeps all of them off.)*
* Hero hiring is off; losing Hervor fails the attempt (as Alexios in Three Beacons).
* Carryover is the Three Beacons policy: Hervor's level, XP (capped per
  mission), skills, spellbook, spells, equipment and gods carry; army, wallet
  and towns are replaced by each mission's war-band manifest.
* Steps are played in order (each primary step `requires` the one before);
  work done early completes the moment its step opens.

XP caps: M1 3,199 (L3) · M2 4,599 (L4) · M3 6,199 (L5) · M4 7,999 (L6) · M5
9,999 (L7) · M6 12,199 (L8) · M7 none.

## 4. Missions

| # | Mission | Map (template) | Primary steps, in order | New for the player |
|---|---|---|---|---|
| 1 | **Barrow Light** (Restore) · 15–20 min | Kaldvik's fjord shore, frozen river with one ford (20×14, `fjord`) | Recruit 10 Draugar → train 8 into Deathless → clear the frozen ford (8 Frost Wolves) → break the barrow-guard (14 Draugar, 4 Deathless) → re-cut the rune (300 Gold, 3 Stone, 1 Crystal) | Recruit/train, Berserk Fury, Rune Circle spells, first one-time choice (frozen longship) |
| 2 | **The White Pack** (Hunt) · 20–25 min | Birkaby and the Varg-wood across a river (24×16, `tundra`) | Recruit 8 Frost Wolves → climb the Watch-hill → take the ice bridge (16 Draugar, 6 Deathless) → hunt the White Pack (wandering band: 6 Fenrir, 12 Frost Wolves) → re-cut the Varg-wood rune | Hunting a wandering band, lookouts, creature camp, a buy-or-learn event |
| 3 | **The Valkyrie's Price** (Ally) · 25–30 min | Fjallhof, the fell-wall pass, the aerie and an ice bridge (26×18, `tundra`) | Break the ice-pass → free the Valkyrie aerie (5 Frost Trolls; it becomes a Valkyrie camp) → win the troll-oath (pay the troll-wife **or** beat Troll-Home) → Thor or Tyr → 2 Battle Valkyries → cut the high rune | God choice, covenant by bargain or force, guarded camp |
| 4 | **Ice on the Sound** (Seek) · 25–30 min | Skarvik and the frozen sound with a fog-wall (28×18, `fjord`) | Recruit 3 Lindworms → take the ice-landing (20 Draugar, 8 Deathless) → light both way-cairns → the fog-wall parts → defeat the wyrm brood and read the Norns' Well | Patrol (Bone-Helm), two-relay gate, Norse shooters |
| 5 | **The Jarl of Hvitstrand** (Contest) · 30–40 min | Ravnholt vs. Hvitstrand across the frozen Hvita (30×20, `tundra`) | Cross either ford → second god → take Hvitstrand (a full AI rival empire with a garrison) → break Ulfhild's oath-stone | A living rival empire, sieges, second god |
| 6 | **The Giants' Refuge** (Bind) · 30–35 min | Jokulsby, the glacier wall, Hrimgard and the Glacier Gate (30×20, `tundra`) | Climb onto the glacier (either crossing) → break the ice-wardens → claim the Jotunn covenant → 2 Jotnar in the army → defeat Hrafn the Hollow → sound the giants' horn | Claimed covenant, giants, guard commander, wandering trolls |
| 7 | **Oathbreaker's Hall** (Endure) · 35–45 min | Isafold, the plateau, the barrow-gate and the Jarl's mound (32×20, `tundra`) | Onto the plateau (either stair) → cut both stones → the barrow-gate opens → defeat the Grey Jarl → decide the sword's fate → seal the oath | Final battle, patrol, the last choice |

Optional sites in every mission: one-time choices (frozen longship, hunter's
lodge, troll-wife's hearth, grey wanderer, ship of nails, Andvari's pool, the
ice-bound child), guarded caches and crags, creature camps and wandering bands.

### The last choice and the epilogue

At the barrow-door (M7) Hervor **returns the sword** (the oath is renewed with
her as its keeper) or **breaks it** (the oath ends forever; the barrow-dead are
free). Both give the same reward and complete the campaign; the choice sets a
mission flag that selects one of two epilogue endings
(`CampaignDefinition.epilogueVariants`, played after the shared epilogue lines).

### The artifacts tell the story

| Mission | Artifact | Why |
|---|---|---|
| M1 | Rune-marked Sword (Arms of the Einherjar) | The Grey Jarl's sword, recovered from under the rune-stone. |
| M2 | Boar-crested Helm (optional lair) · Skis of Ullr (buy at the hunter's lodge) | The wolf-mother's hoard; the hunter's own skis. |
| M3 | Shieldmaiden's Round Shield (Arms of the Einherjar) | The Valkyries' thanks for their aerie. |
| M4 | Wanderer's Grey Cloak (optional) · Link of Brísingamen | Odin's cloak, if Hervor gives him her seat; the Norns' gift at the Well. |
| M5 | Valkyrie's Horn (Arms of the Einherjar) · Andvari's Ring (optional, cursed) | Ulfhild's hall horn; the dwarf's ring in the warm pool. |
| M6 | Mail of the Einherjar (Arms of the Einherjar) | Taken from Hrafn, who left the hall of the chosen. |

By M7 Hervor can wear all four pieces of the **Arms of the Einherjar** (the
headless journey reaches M7 with all four worn).

## 5. Data features added for this campaign

All generic vocabulary (no `if (id === …)` branches):

* Objective conditions `hero_defeated` (a hostile commander, wandering band or
  rival hero of a definition) and `town_owned`; `player_has_minor_god` takes an
  optional `count` (second god).
* `MissionTownSetup.garrison` (a town's starting garrison; Hvitstrand's hall-guard).
* `CampaignDefinition.epilogueVariants` + `campaignEpilogueLines()` (ending by flag).
* Presentation biomes `tundra` and `fjord` (frosted terrain colors; `fjord` uses
  water at the map edge). Existing soundscapes are reused (no new audio).
* Five Norse enemy hero definitions (never hireable).

## 6. Verified (commands run)

* `npx vitest run packages/campaign/test/winterOath.test.ts` — data checks, an
  early-completion check, M5 rival set-up, M7 played directly to the
  "sword returned" ending, and one headless journey through all seven missions
  with carryover to the "sword broken" ending (auto-combat on both sides).
* All seven templates generate valid maps on the golden seed (MAP-01..03 and
  every GATE check pass).

Not verified: human playtime, difficulty for a human player, AI rival
behaviour over a long M5 (the headless journey takes Hvitstrand on day 4, while
Ulfhild's army is in the field).

## 7. Open questions for the owner

1. **Difficulty:** the headless journey wins every mission with moderate losses;
   are the guard armies right for a human player?
2. **Expanded content in a campaign:** keep the Norse spells/skills/sets on
   (proposed), or keep the campaign on core content like The Three Beacons?
3. **Campaign order:** playable from the start (as built) or only after The
   Three Beacons?
4. **Portraits and music:** Eydis, Skeggi, Svanhild, the troll-wife, Jökul and
   the five enemy heroes use placeholder portraits; the missions reuse the
   coast / high-pass / storm-plateau soundscapes.
