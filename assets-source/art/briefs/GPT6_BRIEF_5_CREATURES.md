# Pantheon Realms — Art Brief 5 for GPT-6: CREATURES (model reference views and portraits)

**What this file is.** A complete production brief for the game's **102
creature forms** — 51 creature families, each with a base form and an
upgraded form: 42 pantheon families (seven per pantheon) and 9 neutral
families. For every form it asks for **five images**:

* **four model-reference views** — three-quarter, front, side and top — that a
  later 3D step (an image-to-3D tool and a modeller) will turn into the
  creature's 3D model and animations. **No 3D models or animations are made
  now.**
* **one painted portrait** — the 2D picture the game shows in its panels
  (army slots, recruitment, the battle turn order, the creature details and
  the Encyclopedia).

That is **510 images**. Every image has its exact size and its **exact file
name** below.

**Who reads it.** GPT-6 (the image generator) and the person running it.
Sections 1–6 apply to every image. Read them first, then work through
section 7 creature by creature, in the order listed.

---

## 0. The game in one paragraph

*Pantheon Realms* is a turn-based fantasy strategy game in the tradition of
classic hero-and-army strategy games. Six mythological pantheons — **Greek,
Norse, Egyptian, Japanese, Celtic and Mesoamerican** — build towns, raise
creatures, lead heroes across an adventure map and fight hex-grid battles for
the favour of their gods. Each pantheon recruits seven creature families (tier
1 = the humblest, tier 7 = the mightiest); every family has a base form and an
upgraded form. Neutral creatures guard treasure and roam the map. The game
already has a finished visual identity (the references below); **every
creature must look as if it came from the same studio**.

---

## 1. How to work (rules for every image)

1. **One image per request**, at the exact size given (1024 × 1024). PNG, sRGB.
2. **Name the file exactly** as written (lowercase, dots and underscores,
   ending in `.png`). The game and the 3D step find every image by this name.
   No extra numbers, dates or words.
3. **Work one creature form at a time, in this order:**
   1. the **three-quarter view** — this is the design master;
   2. the **front**, **side** and **top** views, each generated with the
      three-quarter view attached as the reference, so all four show the
      same creature;
   3. the **portrait**, with the three-quarter view attached.
   Then the family's **upgraded form** the same way, with the base form's
   three-quarter view attached as well (section 5.6).
4. **No text of any kind** in any image: no names, numbers, letters, runes,
   hieroglyphs, kanji or glyphs that read as writing, no logos, signatures,
   watermarks, frames, borders or UI. Markings that suggest writing are
   abstract decorative marks.
5. **Adults and creatures only, dignified and respectful.** No nudity; no gore
   (no blood, open wounds or severed parts — undead may look gaunt and
   weathered, not rotting). Cultures shown with respect, never as caricature.
6. **Original designs only**: no characters, creatures or symbols from other
   games, films or brands.
7. **The pantheon boards (R1) are the design authority.** Where a creature
   has a card on its pantheon's board, keep that design — silhouette, colours,
   materials, armour. The written description adds details; if the two
   disagree, follow the board. Where the board has no card, design from the
   description in the board's style.

---

## 2. Reference images to attach

| # | File in the project folder | What it shows | Use it for |
|---|---|---|---|
| R1-G | `support images/ChatGPT Image Sep 29, 2026, 03_35_30 PM-1.png` | Greek pantheon board (gods, heroes, creature cards) | Greek creature designs (only some match the game's roster — see 7.1) |
| R1-N | `support images/ChatGPT Image Sep 29, 2026, 03_35_32 PM-2.png` | Norse pantheon board | every Norse creature |
| R1-E | `support images/ChatGPT Image Sep 29, 2026, 03_35_35 PM-3.png` | Egyptian pantheon board | every Egyptian creature |
| R1-J | `support images/ChatGPT Image Sep 29, 2026, 03_35_37 PM-4.png` | Japanese pantheon board | every Japanese creature |
| R1-C | `support images/ChatGPT Image Sep 29, 2026, 03_35_41 PM-5.png` | Celtic pantheon board | every Celtic creature |
| R1-M | `support images/ChatGPT Image Sep 29, 2026, 03_35_45 PM-6.png` | Mesoamerican pantheon board | every Mesoamerican creature |
| R2 | `assets-source/ui/backgrounds/opening-<pantheon>-landscape.png` (six files) | The game's opening paintings | light, colour and painterly finish for the **portraits** |
| R3 | `support images/heros_full_view/ChatGPT Image Oct 1, 2026, 01_27_31 PM-1.png` … `01_27_48 PM-6.png` | Mounted hero costume sheets per pantheon | costume materials, armour and colours per pantheon |
| R4 | `assets-source/art/final/hero.greek.alexios.bust.png` (or any delivered `hero.*.bust.png`) | A finished dialogue portrait | the finish expected of the **portraits** |

The **board of the creature's pantheon (R1)** must be attached for every
image of that pantheon. Attach R2 and R4 for portraits, R3 when designing
armour.

---

## 3. Style bible

**Medium.** High-detail digital painting, "epic painterly fantasy" — the
style of the creature cards on the pantheon boards. Not a photograph, not a
3D render, not anime, not comic ink lines, not flat vector. The reference
views (section 5) use this style but with neutral studio light and no
background, like a clean model sheet; the portraits (section 6) use the full
dramatic lighting of the boards.

**Pantheon palettes.**

| Pantheon | Main colours | Accents | Motifs |
|---|---|---|---|
| Greek | royal blue `#1F3F8F`, white marble `#ECE6DA` | gold `#C29A52`, bronze, olive green | laurel, owl, meander border, lightning |
| Norse | night navy `#1B2A44`, steel silver `#C9D1DA` | fur browns, ember orange, aurora teal `#3FD6B0` | knotwork, ravens, wolves, rune-like marks, frost and ice |
| Egyptian | sand gold `#D6A842`, white linen `#F1EBDD` | lapis blue `#1F4FA0`, carnelian red `#A3262A`, turquoise | sun disc, spread wings, lotus, papyrus |
| Japanese | vermilion `#C0262D`, black lacquer `#1A1414`, white `#F2EDE4` | cherry-blossom pink `#F2A7C3`, gold | clouds, waves, lanterns, cherry blossom |
| Celtic | forest green `#2F5D34`, gold `#C9A24A` | grey stone, woad blue, heather purple | spirals, triskeles, knotwork, antlers, mist |
| Mesoamerican | turquoise `#1AA39A`, crimson `#B3262B` | jade green, gold `#D2A440`, quetzal-green feathers | feathered serpents, step-fret patterns, sun stones |
| Neutral | earth browns, stone greys | weathered bronze, old gold, dull iron | none — no pantheon symbols |

**Base and upgraded forms.** The upgrade is the same creature after years of
service or a god's favour: richer armour and ornament, brighter accents, a
little more presence. It is recognisably the same family at a glance.

**Readability.** Each creature needs one strong silhouette that tells it
apart from the other six of its pantheon at small size.

---

## 4. Files in this brief

| Group | Per form | Total | Size | Background | Name | Folder |
|---|---|---|---|---|---|---|
| A. Reference views | 4 (three-quarter, front, side, top) | 408 | 1024 × 1024 | **transparent** | `<creature>.ref.<view>.png` | `assets-source/creatures/reference/` |
| B. Portraits | 1 | 102 | 1024 × 1024 | full painting | `<creature>.portrait.png` | `assets-source/icons/final/` |

`<creature>` is the creature's asset name from section 7, for example
`creature.greek.tier1.base` (the Greek tier-1 base form, the Hoplite) or
`creature.neutral.wyvern.upgraded` (the Wyvern Matriarch). The four views are
`threequarter`, `front`, `side` and `top`.

How they are used:

* **A** is not shown in the game. A later step gives the four views of each
  form to an image-to-3D tool and a modeller, who build, rig and animate the
  creature's model from them. They must therefore describe the creature's
  **shape** precisely and consistently — more like a sculptor's turnaround
  than an illustration.
* **B** is shown in the game's panels: army slots, recruitment, the battle
  turn order, creature details and the Encyclopedia, at 32 to 128 pixels on
  screen (the game reduces the 1024 × 1024 picture to 256 × 256). It replaces
  today's generated placeholder of the same name.

---

## 5. Group A — Model reference views (408)

### 5.1 The four views

All four views show **the same creature in the same pose at the same
moment**, as if four cameras photographed one statue.

| View | File suffix | Camera |
|---|---|---|
| Three-quarter | `.ref.threequarter.png` | The creature turned **45° toward the right edge of the image** (we see its face and its left side); camera slightly above eye level, looking down about 20°. Draw this one first. |
| Front | `.ref.front.png` | Straight from the front, camera at the height of the creature's chest; the creature looks straight at us. |
| Side | `.ref.side.png` | Straight from the side: the creature **faces the right edge of the image** (we see its left side); camera at chest height. |
| Top | `.ref.top.png` | Straight down from directly above; the creature's **head toward the top edge of the image**. |

Use a long lens: almost no perspective distortion, so that the front, side
and top views read like orthographic projections and their proportions
match.

### 5.2 Pose

A neutral, symmetrical **"model pose"** — not an action pose — so the 3D
step can see every limb and later animate it:

* **Two-legged creatures and humanoids:** standing upright in a relaxed
  A-pose — feet about shoulder-width apart, arms held away from the body
  (about 40° below horizontal), nothing crossing in front of the body or
  face. Weapon in the right hand pointing down and outward; a shield on the
  left forearm turned outward so it does not cover the body.
* **Four-legged creatures:** standing square on all four legs, legs straight
  and slightly apart, head level and looking forward, tail straight out
  behind.
* **Winged creatures:** feet on the ground, wings **half-spread** to the
  sides and slightly back, fully visible, not touching the body.
* **Serpents:** body laid flat on the ground in a wide, shallow S-curve that
  never crosses itself, head and neck raised, looking forward.
* **No action:** no attacking, breathing fire, spell casting, flying, rearing
  or roaring. Mouths closed or slightly open. Effects that belong to a battle
  (fox-fire, webs, sand, spray, lightning, a held sun-disc of light) are left
  out unless they are a solid part of the body (a flaming tail drawn as
  sculpted flame shapes is part of the body).

Section 7 gives the exact pose for every creature.

### 5.3 Light, colour and background

* **Even, soft, neutral-white studio light** from the front and above. No
  coloured lights, no hard cast shadows, no rim light, no fog, no god-rays.
  Surfaces show their **true colours** (they become the model's textures).
* Glowing parts (eyes, runes, fire manes, sun discs) may glow softly but must
  not light the surroundings or hide the shape under them.
* **Fully transparent background** (PNG alpha). No ground, no floor shadow,
  no scenery, no props. If transparency is impossible, a perfectly flat
  light-grey background `#D0D0D0`, nothing else.
* Crisp edges; no motion blur, no depth-of-field blur, no smoke, sparks or
  particles.

### 5.4 Framing

* 1024 × 1024. The **whole creature** inside the frame — wings, tails,
  horns, weapons included — with about **5 % empty margin** on every side.
  Nothing cropped.
* The creature as large as the frame allows: tall creatures fill the height,
  long creatures fill the width.
* In each form's four views the creature keeps **the same size and
  proportions** (the top view of a tall humanoid is naturally small).

### 5.5 Consistency checklist (before moving on)

Before the next creature, compare the four views: same colours, armour,
markings, number of horns, tails, heads, legs, fingers and claws; the weapon
and shield on the same sides; the same pose. If one view drifts, redo that
view with the three-quarter view attached again.

### 5.6 Upgraded forms

The upgraded form keeps **the same anatomy, proportions, silhouette and pose**
as its base form, so that one skeleton can animate both. It may be up to 10 %
bigger. What changes is armour, ornament, colour, markings and glow — and
extra parts only where its description names them (for example the Great
Sphinx's wings, the Nine-Tailed Kitsune's tails). Attach the base form's
three-quarter view when you draw the upgraded form's three-quarter view.

---

## 6. Group B — Portraits (102)

* **Size** 1024 × 1024, a full painting (no transparency).
* **Subject:** the creature's head and upper body — or the whole creature
  when it is small or long (a scarab, a serpent's raised head and coils) —
  in a three-quarter view, looking slightly toward the viewer, in a calm but
  alert pose that shows its character. The same design as its reference
  views.
* **Light:** the dramatic painterly light of the pantheon boards — warm key
  light, cool shadows, a bright rim light that separates the creature from
  the background.
* **Background:** simple and atmospheric in the pantheon's colours (sky,
  mist, a hint of its home ground), darker toward the edges. No detailed
  scenery that competes with the creature.
* **Composition for the game's frames:** keep the head and the most
  important features inside the **central circle** (the game sometimes shows
  portraits round), and keep the **bottom-right quarter** free of important
  detail (a stack-count badge sits there). The creature must be recognisable
  at **48 × 48 pixels**: one strong silhouette, clear value contrast.
* Base and upgraded portraits use the same camera and framing, so the
  difference between them reads at a glance.
* No text, no frame, no border, no vignette shape — the game draws its own
  gold frames.

---

## 7. The creatures (102 forms)

Every entry gives the creature's asset name, design source, look, role, a
line of lore for character, its reference pose, and its five file names.
"Occupies 1 hex / 2 hexes" tells its size on the battlefield.

### 7.1 Greek — 7 families, 14 forms

Design source: the Greek pantheon board (**R1-G**) shows an older roster; only the cards named below match a game creature. Creatures without a board card are designed from the description, in the board’s style.

**001 · Hoplite** — Greek, tier 1, base form · `creature.greek.tier1.base`

* Design: the Greek board’s **Militia** card (Level 1, left), with a pale linen tunic.
* Looks: A spear-and-shield soldier in a bronze helmet and pale linen tunic.
* What it is: Line infantry — Shield-forward spear infantry that holds narrow ground and blunts cavalry charges. Occupies 1 hex (person-sized or smaller); braces against charges.
* Lore: _The road to Asterion is lined with shields bearing names rather than royal crests. Each belongs to a household that promised someone would stand when the warning bells rang._
* Pose for the reference views: Standing upright, facing straight ahead, in a relaxed **A-pose**: feet about shoulder-width apart, legs straight, arms held away from the body (about 40° below horizontal), nothing crossing in front of the torso or face. If it carries a weapon, it is held in the right hand, pointing down and outward; if it has a shield, it is strapped on the left forearm, turned outward so it does not cover the body. Head level, eyes forward, mouth closed.
* Files: `creature.greek.tier1.base.ref.threequarter.png`, `creature.greek.tier1.base.ref.front.png`, `creature.greek.tier1.base.ref.side.png`, `creature.greek.tier1.base.ref.top.png` → `assets-source/creatures/reference/`; `creature.greek.tier1.base.portrait.png` → `assets-source/icons/final/`

**002 · Veteran Hoplite** — Greek, tier 1, upgraded form · `creature.greek.tier1.upgraded`

* Design: the Greek board’s **Hoplite** card (Level 1, right): crested helmet, blue round shield.
* Looks: A crested-helmet spear soldier with reinforced shoulder armor and a command sash.
* What it is: Line infantry — Seasoned shield-bearers with crested helmets and practiced steadiness. Occupies 1 hex (person-sized or smaller); braces against charges.
* Lore: _Veteran Hoplites teach the pause before a charge reaches the line._
* Upgrade of **Hoplite**: same anatomy, proportions, silhouette and pose as Hoplite (so one skeleton fits both); it may be up to 10 % bigger. Change armour, ornament, colour, markings and glow as described, and add parts (wings, more tails or heads) only where the description names them — keep the body plan.
* Pose for the reference views: Standing upright, facing straight ahead, in a relaxed **A-pose**: feet about shoulder-width apart, legs straight, arms held away from the body (about 40° below horizontal), nothing crossing in front of the torso or face. If it carries a weapon, it is held in the right hand, pointing down and outward; if it has a shield, it is strapped on the left forearm, turned outward so it does not cover the body. Head level, eyes forward, mouth closed.
* Files: `creature.greek.tier1.upgraded.ref.threequarter.png`, `creature.greek.tier1.upgraded.ref.front.png`, `creature.greek.tier1.upgraded.ref.side.png`, `creature.greek.tier1.upgraded.ref.top.png` → `assets-source/creatures/reference/`; `creature.greek.tier1.upgraded.portrait.png` → `assets-source/icons/final/`

**003 · Peltast** — Greek, tier 2, base form · `creature.greek.tier2.base`

* Design: no board card — design it from the description, in the board’s style.
* Looks: A lightly armored skirmisher with a crescent shield and a bundle of javelins.
* What it is: Javelin skirmisher — Light javelin throwers who strike from range and need protection up close. Occupies 1 hex (person-sized or smaller); shoots.
* Lore: _Peltasts learn the hills before they learn the parade ground. They carry only what lets them cross a dry riverbed, find a gap between shields, and return before a heavier enemy can close._
* Pose for the reference views: Relaxed **A-pose**; one javelin held in the right hand pointing down and outward, the rest in a bundle or quiver on the back; crescent shield on the left forearm, turned outward.
* Files: `creature.greek.tier2.base.ref.threequarter.png`, `creature.greek.tier2.base.ref.front.png`, `creature.greek.tier2.base.ref.side.png`, `creature.greek.tier2.base.ref.top.png` → `assets-source/creatures/reference/`; `creature.greek.tier2.base.portrait.png` → `assets-source/icons/final/`

**004 · Veteran Peltast** — Greek, tier 2, upgraded form · `creature.greek.tier2.upgraded`

* Design: no board card — design it from the description, in the board’s style.
* Looks: A skirmisher with a reinforced helmet, braced throwing arm and a tidy javelin harness.
* What it is: Javelin skirmisher — Experienced skirmishers who choose their own firing ground and carry more javelins. Occupies 1 hex (person-sized or smaller); shoots.
* Upgrade of **Peltast**: same anatomy, proportions, silhouette and pose as Peltast (so one skeleton fits both); it may be up to 10 % bigger. Change armour, ornament, colour, markings and glow as described, and add parts (wings, more tails or heads) only where the description names them — keep the body plan.
* Pose for the reference views: Relaxed **A-pose**; one javelin held in the right hand pointing down and outward, the rest in the harness on the back; shield on the left forearm, turned outward.
* Files: `creature.greek.tier2.upgraded.ref.threequarter.png`, `creature.greek.tier2.upgraded.ref.front.png`, `creature.greek.tier2.upgraded.ref.side.png`, `creature.greek.tier2.upgraded.ref.top.png` → `assets-source/creatures/reference/`; `creature.greek.tier2.upgraded.portrait.png` → `assets-source/icons/final/`

**005 · Griffin** — Greek, tier 3, base form · `creature.greek.tier3.base`

* Design: the Greek board’s **Griffin** card (Level 7, left).
* Looks: An eagle-headed, winged lion-bodied creature with tawny fur and pale head feathers.
* What it is: Flying interceptor — Winged guardians that bypass the front line and answer two attacks each round. Occupies 2 hexes (large — horse-sized or bigger); flies, answers two attacks a round.
* Lore: _Above Griffin Pass, the nests face the first light. The first envoys brought gold and were driven from the cliffs; the next brought food and waited._
* Pose for the reference views: Standing **on its legs** (not flying), legs straight and apart, head level and looking forward, **wings half-spread** to the sides and slightly back so the body and legs stay visible, tail straight out behind.
* Files: `creature.greek.tier3.base.ref.threequarter.png`, `creature.greek.tier3.base.ref.front.png`, `creature.greek.tier3.base.ref.side.png`, `creature.greek.tier3.base.ref.top.png` → `assets-source/creatures/reference/`; `creature.greek.tier3.base.portrait.png` → `assets-source/icons/final/`

**006 · Windcrest Griffin** — Greek, tier 3, upgraded form · `creature.greek.tier3.upgraded`

* Design: the Greek board’s **Royal Griffin** card (Level 7, right).
* Looks: A griffin with a swept feather crest, long primary feathers and pale-blue accents.
* What it is: Flying interceptor — Guardians of the highest nests whose retaliation has no count limit. Occupies 2 hexes (large — horse-sized or bigger); flies, answers every attack.
* Lore: _Windcrest Griffins are experienced guardians of the highest nests._
* Upgrade of **Griffin**: same anatomy, proportions, silhouette and pose as Griffin (so one skeleton fits both); it may be up to 10 % bigger. Change armour, ornament, colour, markings and glow as described, and add parts (wings, more tails or heads) only where the description names them — keep the body plan.
* Pose for the reference views: Standing **on its legs** (not flying), legs straight and apart, head level and looking forward, **wings half-spread** to the sides and slightly back so the body and legs stay visible, tail straight out behind.
* Files: `creature.greek.tier3.upgraded.ref.threequarter.png`, `creature.greek.tier3.upgraded.ref.front.png`, `creature.greek.tier3.upgraded.ref.side.png`, `creature.greek.tier3.upgraded.ref.top.png` → `assets-source/creatures/reference/`; `creature.greek.tier3.upgraded.portrait.png` → `assets-source/icons/final/`

**007 · Cavalry** — Greek, tier 4, base form · `creature.greek.tier4.base`

* Design: no board card — design it from the description, in the board’s style.
* Looks: A lance-bearing rider with a shield on a compact warhorse with a saddle blanket.
* What it is: Mounted shock troops — Lance riders whose charge grows stronger over open ground. Occupies 2 hexes (large — horse-sized or bigger); charges.
* Lore: _The court measures a rider by the condition of the horse at the journey’s end._
* Pose for the reference views: Horse standing **square on all four legs**, head level; the rider seated upright, lance held **vertically** in the right hand, shield on the left arm turned outward. Rider and horse are one figure.
* Files: `creature.greek.tier4.base.ref.threequarter.png`, `creature.greek.tier4.base.ref.front.png`, `creature.greek.tier4.base.ref.side.png`, `creature.greek.tier4.base.ref.top.png` → `assets-source/creatures/reference/`; `creature.greek.tier4.base.portrait.png` → `assets-source/icons/final/`

**008 · Companion Cavalry** — Greek, tier 4, upgraded form · `creature.greek.tier4.upgraded`

* Design: no board card — design it from the description, in the board’s style.
* Looks: A crested rider on a horse with layered neck and chest protection.
* What it is: Mounted shock troops — Trusted riders in layered armor who train together until signals are almost unnecessary. Occupies 2 hexes (large — horse-sized or bigger); charges.
* Lore: _Companion riders train together until the commander’s signal is almost unnecessary._
* Upgrade of **Cavalry**: same anatomy, proportions, silhouette and pose as Cavalry (so one skeleton fits both); it may be up to 10 % bigger. Change armour, ornament, colour, markings and glow as described, and add parts (wings, more tails or heads) only where the description names them — keep the body plan.
* Pose for the reference views: Horse standing **square on all four legs**, head level; the rider seated upright, lance held **vertically** in the right hand, shield on the left arm turned outward. Rider and horse are one figure.
* Files: `creature.greek.tier4.upgraded.ref.threequarter.png`, `creature.greek.tier4.upgraded.ref.front.png`, `creature.greek.tier4.upgraded.ref.side.png`, `creature.greek.tier4.upgraded.ref.top.png` → `assets-source/creatures/reference/`; `creature.greek.tier4.upgraded.portrait.png` → `assets-source/icons/final/`

**009 · Temple Adept** — Greek, tier 5, base form · `creature.greek.tier5.base`

* Design: no board card — design it from the description, in the board’s style.
* Looks: A robed scholar with a staff topped by a geometric bronze focus.
* What it is: Ranged support — Ritual scholars who hurl focused energy bolts from the back line. Occupies 1 hex (person-sized or smaller); shoots.
* Lore: _Temple Adepts keep the records that armies would rather forget: every promise made before a march and every name missing afterward. The light they carry into battle belongs to this world’s living gods._
* Pose for the reference views: Relaxed **A-pose**; the staff held upright in the right hand, away from the body; robes hanging straight.
* Files: `creature.greek.tier5.base.ref.threequarter.png`, `creature.greek.tier5.base.ref.front.png`, `creature.greek.tier5.base.ref.side.png`, `creature.greek.tier5.base.ref.top.png` → `assets-source/creatures/reference/`; `creature.greek.tier5.base.portrait.png` → `assets-source/icons/final/`

**010 · Temple Seer** — Greek, tier 5, upgraded form · `creature.greek.tier5.upgraded`

* Design: no board card — design it from the description, in the board’s style.
* Looks: A robed seer with a sculpted headpiece, layered mantle and a larger staff focus.
* What it is: Ranged support — Seers who can place one shared protective ward per battle. Occupies 1 hex (person-sized or smaller); shoots, can ward an ally.
* Lore: _Seers learn to place a brief ward over their companions. The rite is shared by the whole company — one family-wide charge._
* Upgrade of **Temple Adept**: same anatomy, proportions, silhouette and pose as Temple Adept (so one skeleton fits both); it may be up to 10 % bigger. Change armour, ornament, colour, markings and glow as described, and add parts (wings, more tails or heads) only where the description names them — keep the body plan.
* Pose for the reference views: Relaxed **A-pose**; the staff held upright in the right hand, away from the body; mantle hanging straight.
* Files: `creature.greek.tier5.upgraded.ref.threequarter.png`, `creature.greek.tier5.upgraded.ref.front.png`, `creature.greek.tier5.upgraded.ref.side.png`, `creature.greek.tier5.upgraded.ref.top.png` → `assets-source/creatures/reference/`; `creature.greek.tier5.upgraded.portrait.png` → `assets-source/icons/final/`

**011 · Minotaur** — Greek, tier 6, base form · `creature.greek.tier6.base`

* Design: the Greek board’s **Minotaur** card (Level 4, left).
* Looks: A bull-headed biped with powerful shoulders, chest straps and a heavy axe.
* What it is: Heavy melee — Bull-headed axe fighters with reliable morale. Occupies 2 hexes (large — horse-sized or bigger); never loses heart.
* Lore: _The wardens of the lower labyrinth remember a time when every corridor ended in a locked gate. They now carve their own signs into the stone, choosing who may enter and what may leave._
* Pose for the reference views: Standing upright, facing straight ahead, in a relaxed **A-pose**: feet about shoulder-width apart, legs straight, arms held away from the body (about 40° below horizontal), nothing crossing in front of the torso or face. If it carries a weapon, it is held in the right hand, pointing down and outward; if it has a shield, it is strapped on the left forearm, turned outward so it does not cover the body. Head level, eyes forward, mouth closed.
* Files: `creature.greek.tier6.base.ref.threequarter.png`, `creature.greek.tier6.base.ref.front.png`, `creature.greek.tier6.base.ref.side.png`, `creature.greek.tier6.base.ref.top.png` → `assets-source/creatures/reference/`; `creature.greek.tier6.base.portrait.png` → `assets-source/icons/final/`

**012 · Labyrinth Warden** — Greek, tier 6, upgraded form · `creature.greek.tier6.upgraded`

* Design: the Greek board’s **Labyrinth Minotaur** card (Level 4, right).
* Looks: A minotaur in patterned chest armor with horn fittings and a heavier axe.
* What it is: Heavy melee — Wardens entrusted with the passages others must not lose. Occupies 2 hexes (large — horse-sized or bigger); never loses heart.
* Lore: _A Labyrinth Warden is entrusted with the passages others must not lose._
* Upgrade of **Minotaur**: same anatomy, proportions, silhouette and pose as Minotaur (so one skeleton fits both); it may be up to 10 % bigger. Change armour, ornament, colour, markings and glow as described, and add parts (wings, more tails or heads) only where the description names them — keep the body plan.
* Pose for the reference views: Standing upright, facing straight ahead, in a relaxed **A-pose**: feet about shoulder-width apart, legs straight, arms held away from the body (about 40° below horizontal), nothing crossing in front of the torso or face. If it carries a weapon, it is held in the right hand, pointing down and outward; if it has a shield, it is strapped on the left forearm, turned outward so it does not cover the body. Head level, eyes forward, mouth closed.
* Files: `creature.greek.tier6.upgraded.ref.threequarter.png`, `creature.greek.tier6.upgraded.ref.front.png`, `creature.greek.tier6.upgraded.ref.side.png`, `creature.greek.tier6.upgraded.ref.top.png` → `assets-source/creatures/reference/`; `creature.greek.tier6.upgraded.portrait.png` → `assets-source/icons/final/`

**013 · Cyclops** — Greek, tier 7, base form · `creature.greek.tier7.base`

* Design: the Greek board’s **Cyclops** card (Level 6, left).
* Looks: A one-eyed giant with a stone satchel and simple bracers.
* What it is: Apex ranged giant — One-eyed giants who hurl shaped boulders and strike hard up close. Occupies 2 hexes (large — horse-sized or bigger); shoots, breaks walls, fights well up close too.
* Lore: _Thunder Quarry is less a mine than a negotiation with the mountain. A Cyclops may spend a day shaping a single stone until it sits correctly in one vast hand._
* Pose for the reference views: Standing upright in a relaxed A-pose, arms away from the body; a boulder held low in the right hand at the side; the stone satchel on its hip.
* Files: `creature.greek.tier7.base.ref.threequarter.png`, `creature.greek.tier7.base.ref.front.png`, `creature.greek.tier7.base.ref.side.png`, `creature.greek.tier7.base.ref.top.png` → `assets-source/creatures/reference/`; `creature.greek.tier7.base.portrait.png` → `assets-source/icons/final/`

**014 · Stormforged Cyclops** — Greek, tier 7, upgraded form · `creature.greek.tier7.upgraded`

* Design: the Greek board’s **Elder Cyclops** card (Level 6, right).
* Looks: A cyclops with forged bronze bracers, engraved seams and a faintly luminous boulder.
* What it is: Apex ranged giant — Cyclopes bearing forge-marked stones; the name adds no lightning damage. Occupies 2 hexes (large — horse-sized or bigger); shoots, breaks walls, fights well up close too.
* Lore: _Stormforged Cyclopes carry stones marked by the forge’s rites._
* Upgrade of **Cyclops**: same anatomy, proportions, silhouette and pose as Cyclops (so one skeleton fits both); it may be up to 10 % bigger. Change armour, ornament, colour, markings and glow as described, and add parts (wings, more tails or heads) only where the description names them — keep the body plan.
* Pose for the reference views: Standing upright in a relaxed A-pose, arms away from the body; the boulder held low in the right hand at the side.
* Files: `creature.greek.tier7.upgraded.ref.threequarter.png`, `creature.greek.tier7.upgraded.ref.front.png`, `creature.greek.tier7.upgraded.ref.side.png`, `creature.greek.tier7.upgraded.ref.top.png` → `assets-source/creatures/reference/`; `creature.greek.tier7.upgraded.portrait.png` → `assets-source/icons/final/`


### 7.2 Norse — 7 families, 14 forms

Design source: the Norse pantheon board (**R1-N**), row “7 Creature Levels & Upgrades”: each card below is on it (base on the left of the arrow, upgrade on the right). Keep those designs.

**015 · Draugr** — Norse, tier 1, base form · `creature.norse.tier1.base`

* Design: the **Draugr** card on R1-N (Level 1, left).
* Looks: A gaunt warrior in corroded mail and a frost-rimed helmet, holding an axe and round shield.
* What it is: Line infantry — Barrow-risen warriors in rusted mail who hold the front line without complaint. Occupies 1 hex (person-sized or smaller).
* Lore: _The barrows above Frosthold were raised for warriors who died owing a debt. Some of them still stand guard over it._
* Pose for the reference views: Standing upright, facing straight ahead, in a relaxed **A-pose**: feet about shoulder-width apart, legs straight, arms held away from the body (about 40° below horizontal), nothing crossing in front of the torso or face. If it carries a weapon, it is held in the right hand, pointing down and outward; if it has a shield, it is strapped on the left forearm, turned outward so it does not cover the body. Head level, eyes forward, mouth closed.
* Files: `creature.norse.tier1.base.ref.threequarter.png`, `creature.norse.tier1.base.ref.front.png`, `creature.norse.tier1.base.ref.side.png`, `creature.norse.tier1.base.ref.top.png` → `assets-source/creatures/reference/`; `creature.norse.tier1.base.portrait.png` → `assets-source/icons/final/`

**016 · Deathless Draugr** — Norse, tier 1, upgraded form · `creature.norse.tier1.upgraded`

* Design: the **Deathless Draugr** card on R1-N (Level 1, right).
* Looks: A draugr with rune-etched armor plates, glowing blue eyes and a notched longaxe.
* What it is: Line infantry — Older dead bound by a sworn oath; their resolve never wavers. Occupies 1 hex (person-sized or smaller); never loses heart.
* Lore: _The Deathless keep an oath older than the hold itself; nothing on a battlefield is frightening enough to break it._
* Upgrade of **Draugr**: same anatomy, proportions, silhouette and pose as Draugr (so one skeleton fits both); it may be up to 10 % bigger. Change armour, ornament, colour, markings and glow as described, and add parts (wings, more tails or heads) only where the description names them — keep the body plan.
* Pose for the reference views: Standing upright, facing straight ahead, in a relaxed **A-pose**: feet about shoulder-width apart, legs straight, arms held away from the body (about 40° below horizontal), nothing crossing in front of the torso or face. If it carries a weapon, it is held in the right hand, pointing down and outward; if it has a shield, it is strapped on the left forearm, turned outward so it does not cover the body. Head level, eyes forward, mouth closed.
* Files: `creature.norse.tier1.upgraded.ref.threequarter.png`, `creature.norse.tier1.upgraded.ref.front.png`, `creature.norse.tier1.upgraded.ref.side.png`, `creature.norse.tier1.upgraded.ref.top.png` → `assets-source/creatures/reference/`; `creature.norse.tier1.upgraded.portrait.png` → `assets-source/icons/final/`

**017 · Frost Wolf** — Norse, tier 2, base form · `creature.norse.tier2.base`

* Design: the **Frost Wolf** card on R1-N (Level 2, left).
* Looks: A large white-grey wolf with frost on its muzzle and pale blue eyes.
* What it is: Fast flanker — Pale wolves that cross open snow fast and strike harder the farther they run. Occupies 1 hex (person-sized or smaller); charges.
* Lore: _The wolves of the white valleys run beside the hold’s riders rather than under them. They are paid in the first share of every hunt, and they remember who pays._
* Pose for the reference views: Standing **square on all four legs**, legs straight and slightly apart so every leg is visible from the side, head level and looking forward, mouth closed or slightly open, tail straight out behind (not curled over the back).
* Files: `creature.norse.tier2.base.ref.threequarter.png`, `creature.norse.tier2.base.ref.front.png`, `creature.norse.tier2.base.ref.side.png`, `creature.norse.tier2.base.ref.top.png` → `assets-source/creatures/reference/`; `creature.norse.tier2.base.portrait.png` → `assets-source/icons/final/`

**018 · Fenrir Wolf** — Norse, tier 2, upgraded form · `creature.norse.tier2.upgraded`

* Design: the **Fenrir Wolf** card on R1-N (Level 2, right).
* Looks: A massive dark-grey wolf with a broken chain collar and a scarred muzzle.
* What it is: Fast flanker — Named for the bound wolf of legend; bigger, faster and harder to turn aside. Occupies 1 hex (person-sized or smaller); charges.
* Lore: _Fenrir Wolves wear a broken link of chain as a collar. Nobody in the hold remembers who first put it there._
* Upgrade of **Frost Wolf**: same anatomy, proportions, silhouette and pose as Frost Wolf (so one skeleton fits both); it may be up to 10 % bigger. Change armour, ornament, colour, markings and glow as described, and add parts (wings, more tails or heads) only where the description names them — keep the body plan.
* Pose for the reference views: Standing **square on all four legs**, legs straight and slightly apart so every leg is visible from the side, head level and looking forward, mouth closed or slightly open, tail straight out behind (not curled over the back).
* Files: `creature.norse.tier2.upgraded.ref.threequarter.png`, `creature.norse.tier2.upgraded.ref.front.png`, `creature.norse.tier2.upgraded.ref.side.png`, `creature.norse.tier2.upgraded.ref.top.png` → `assets-source/creatures/reference/`; `creature.norse.tier2.upgraded.portrait.png` → `assets-source/icons/final/`

**019 · Frost Troll** — Norse, tier 3, base form · `creature.norse.tier3.base`

* Design: the **Frost Troll** card on R1-N (Level 3, left).
* Looks: A hulking blue-grey troll with icicles in its beard and a stone club.
* What it is: Bruiser — Slow, thick-hided brutes that shrug off charges and soak up punishment. Occupies 2 hexes (large — horse-sized or bigger); braces against charges.
* Lore: _Frost trolls sleep through summer in caves that never thaw. The hold wakes them in autumn with drums and fresh meat, and sends them home before the thaw._
* Pose for the reference views: Standing upright, facing straight ahead, in a relaxed **A-pose**: feet about shoulder-width apart, legs straight, arms held away from the body (about 40° below horizontal), nothing crossing in front of the torso or face. If it carries a weapon, it is held in the right hand, pointing down and outward; if it has a shield, it is strapped on the left forearm, turned outward so it does not cover the body. Head level, eyes forward, mouth closed.
* Files: `creature.norse.tier3.base.ref.threequarter.png`, `creature.norse.tier3.base.ref.front.png`, `creature.norse.tier3.base.ref.side.png`, `creature.norse.tier3.base.ref.top.png` → `assets-source/creatures/reference/`; `creature.norse.tier3.base.portrait.png` → `assets-source/icons/final/`

**020 · Ancient Frost Troll** — Norse, tier 3, upgraded form · `creature.norse.tier3.upgraded`

* Design: the **Ancient Frost Troll** card on R1-N (Level 3, right).
* Looks: A towering troll with a crust of blue ice across its back and a boulder-headed club.
* What it is: Bruiser — Trolls old enough to have moss turned to ice on their shoulders. Occupies 2 hexes (large — horse-sized or bigger); braces against charges.
* Lore: _The ancient trolls have ice grown into their skin like armor, and they are slower to anger and far slower to stop._
* Upgrade of **Frost Troll**: same anatomy, proportions, silhouette and pose as Frost Troll (so one skeleton fits both); it may be up to 10 % bigger. Change armour, ornament, colour, markings and glow as described, and add parts (wings, more tails or heads) only where the description names them — keep the body plan.
* Pose for the reference views: Standing upright, facing straight ahead, in a relaxed **A-pose**: feet about shoulder-width apart, legs straight, arms held away from the body (about 40° below horizontal), nothing crossing in front of the torso or face. If it carries a weapon, it is held in the right hand, pointing down and outward; if it has a shield, it is strapped on the left forearm, turned outward so it does not cover the body. Head level, eyes forward, mouth closed.
* Files: `creature.norse.tier3.upgraded.ref.threequarter.png`, `creature.norse.tier3.upgraded.ref.front.png`, `creature.norse.tier3.upgraded.ref.side.png`, `creature.norse.tier3.upgraded.ref.top.png` → `assets-source/creatures/reference/`; `creature.norse.tier3.upgraded.portrait.png` → `assets-source/icons/final/`

**021 · Valkyrie** — Norse, tier 4, base form · `creature.norse.tier4.base`

* Design: the **Valkyrie** card on R1-N (the second “Level 3” column — the board mislabels it, left).
* Looks: A winged warrior woman in a silver helm with a spear and round shield.
* What it is: Flying lancer — Winged shieldmaidens who choose where the battle breaks and land there. Occupies 1 hex (person-sized or smaller); flies.
* Lore: _The hold’s valkyries are not goddesses; they are the women who survived the choosing and came back with wings. They fight where the line is about to break._
* Pose for the reference views: Standing upright in a relaxed **A-pose** (feet shoulder-width apart, arms about 40° below horizontal; any weapon in the right hand pointing down and outward, any shield on the left forearm turned outward). **Wings half-spread** out to the sides and slightly back, fully visible, not touching the body or each other. Feet on the ground — not flying.
* Files: `creature.norse.tier4.base.ref.threequarter.png`, `creature.norse.tier4.base.ref.front.png`, `creature.norse.tier4.base.ref.side.png`, `creature.norse.tier4.base.ref.top.png` → `assets-source/creatures/reference/`; `creature.norse.tier4.base.portrait.png` → `assets-source/icons/final/`

**022 · Battle Valkyrie** — Norse, tier 4, upgraded form · `creature.norse.tier4.upgraded`

* Design: the **Battle Valkyrie** card on R1-N (the second “Level 3” column — the board mislabels it, right).
* Looks: A valkyrie in blue-enamelled scale armor with broad white wings and a long spear.
* What it is: Flying lancer — Veteran choosers of the slain who answer two attacks each round. Occupies 1 hex (person-sized or smaller); flies, answers two attacks a round.
* Lore: _Battle Valkyries have chosen before. They turn to meet a second attacker without looking._
* Upgrade of **Valkyrie**: same anatomy, proportions, silhouette and pose as Valkyrie (so one skeleton fits both); it may be up to 10 % bigger. Change armour, ornament, colour, markings and glow as described, and add parts (wings, more tails or heads) only where the description names them — keep the body plan.
* Pose for the reference views: Standing upright in a relaxed **A-pose** (feet shoulder-width apart, arms about 40° below horizontal; any weapon in the right hand pointing down and outward, any shield on the left forearm turned outward). **Wings half-spread** out to the sides and slightly back, fully visible, not touching the body or each other. Feet on the ground — not flying.
* Files: `creature.norse.tier4.upgraded.ref.threequarter.png`, `creature.norse.tier4.upgraded.ref.front.png`, `creature.norse.tier4.upgraded.ref.side.png`, `creature.norse.tier4.upgraded.ref.top.png` → `assets-source/creatures/reference/`; `creature.norse.tier4.upgraded.portrait.png` → `assets-source/icons/final/`

**023 · Lindworm** — Norse, tier 5, base form · `creature.norse.tier5.base`

* Design: the **Lindworm** card on R1-N (Level 5, left).
* Looks: A long wingless serpent-dragon with two clawed forelegs and frost on its scales.
* What it is: Ranged breath — Two-legged wyrms that spit freezing breath from the back line. Occupies 2 hexes (large — horse-sized or bigger); shoots.
* Lore: _Lindworms nest on the sea-cliffs where the spray freezes. A lindworm that has been fed from a hand will breathe frost for that hand, and for no one else._
* Pose for the reference views: Long body laid in a wide, shallow S-curve that never crosses itself, the **two forelegs planted**, head and neck raised and looking forward.
* Files: `creature.norse.tier5.base.ref.threequarter.png`, `creature.norse.tier5.base.ref.front.png`, `creature.norse.tier5.base.ref.side.png`, `creature.norse.tier5.base.ref.top.png` → `assets-source/creatures/reference/`; `creature.norse.tier5.base.portrait.png` → `assets-source/icons/final/`

**024 · Storm Lindworm** — Norse, tier 5, upgraded form · `creature.norse.tier5.upgraded`

* Design: the **Storm Lindworm** card on R1-N (Level 5, right).
* Looks: A slate-blue lindworm with crackling pale markings and a raised crest.
* What it is: Ranged breath — Storm-coloured lindworms that bite as hard as they breathe. Occupies 2 hexes (large — horse-sized or bigger); shoots, fights well up close too.
* Lore: _Storm Lindworms are the ones that survived lightning; they bite as readily as they breathe._
* Upgrade of **Lindworm**: same anatomy, proportions, silhouette and pose as Lindworm (so one skeleton fits both); it may be up to 10 % bigger. Change armour, ornament, colour, markings and glow as described, and add parts (wings, more tails or heads) only where the description names them — keep the body plan.
* Pose for the reference views: Long body laid in a wide, shallow S-curve that never crosses itself, the **two forelegs planted**, crest raised, head looking forward.
* Files: `creature.norse.tier5.upgraded.ref.threequarter.png`, `creature.norse.tier5.upgraded.ref.front.png`, `creature.norse.tier5.upgraded.ref.side.png`, `creature.norse.tier5.upgraded.ref.top.png` → `assets-source/creatures/reference/`; `creature.norse.tier5.upgraded.portrait.png` → `assets-source/icons/final/`

**025 · Jotunn** — Norse, tier 6, base form · `creature.norse.tier6.base`

* Design: the **Jotunn** card on R1-N (Level 6, left).
* Looks: A towering giant in furs and iron bands with a frost-covered greataxe.
* What it is: Giant warrior — Frost giants whose reach lets them answer two attackers every round. Occupies 2 hexes (large — horse-sized or bigger); answers two attacks a round.
* Lore: _A jotunn does not serve the hold. It keeps an agreement with it, renewed each winter by a gift the giants choose._
* Pose for the reference views: Standing upright, facing straight ahead, in a relaxed **A-pose**: feet about shoulder-width apart, legs straight, arms held away from the body (about 40° below horizontal), nothing crossing in front of the torso or face. If it carries a weapon, it is held in the right hand, pointing down and outward; if it has a shield, it is strapped on the left forearm, turned outward so it does not cover the body. Head level, eyes forward, mouth closed.
* Files: `creature.norse.tier6.base.ref.threequarter.png`, `creature.norse.tier6.base.ref.front.png`, `creature.norse.tier6.base.ref.side.png`, `creature.norse.tier6.base.ref.top.png` → `assets-source/creatures/reference/`; `creature.norse.tier6.base.portrait.png` → `assets-source/icons/final/`

**026 · Runic Jotunn** — Norse, tier 6, upgraded form · `creature.norse.tier6.upgraded`

* Design: the **Runic Jotunn** card on R1-N (Level 6, right).
* Looks: A giant with glowing blue runes cut into stone bracers and a rune-marked hammer.
* What it is: Giant warrior — Giants carved with protective runes who can ward one ally per battle. Occupies 2 hexes (large — horse-sized or bigger); answers two attacks a round, can ward an ally.
* Lore: _Runic Jotnar cut protections into their own stone bracers and will lend one to an ally who asks politely._
* Upgrade of **Jotunn**: same anatomy, proportions, silhouette and pose as Jotunn (so one skeleton fits both); it may be up to 10 % bigger. Change armour, ornament, colour, markings and glow as described, and add parts (wings, more tails or heads) only where the description names them — keep the body plan.
* Pose for the reference views: Standing upright, facing straight ahead, in a relaxed **A-pose**: feet about shoulder-width apart, legs straight, arms held away from the body (about 40° below horizontal), nothing crossing in front of the torso or face. If it carries a weapon, it is held in the right hand, pointing down and outward; if it has a shield, it is strapped on the left forearm, turned outward so it does not cover the body. Head level, eyes forward, mouth closed.
* Files: `creature.norse.tier6.upgraded.ref.threequarter.png`, `creature.norse.tier6.upgraded.ref.front.png`, `creature.norse.tier6.upgraded.ref.side.png`, `creature.norse.tier6.upgraded.ref.top.png` → `assets-source/creatures/reference/`; `creature.norse.tier6.upgraded.portrait.png` → `assets-source/icons/final/`

**027 · Nidhogg Wyrm** — Norse, tier 7, base form · `creature.norse.tier7.base`

* Design: the **Nidhogg Wyrm** card on R1-N (Level 7, left).
* Looks: A huge dark serpent-dragon coiled around ice-covered roots, jaws open.
* What it is: Apex wyrm — Root-gnawing wyrms that answer every blow and never lose their nerve. Occupies 2 hexes (large — horse-sized or bigger); never loses heart, answers every attack.
* Lore: _Beneath the hold the roots of an old tree go down into warm dark water, and something down there gnaws. The priests call it a blessing that it has not yet finished._
* Pose for the reference views: Body laid in a wide, shallow S-curve that never crosses itself — **no roots or ground** (those belong to the battlefield), head raised, jaws closed or slightly open.
* Files: `creature.norse.tier7.base.ref.threequarter.png`, `creature.norse.tier7.base.ref.front.png`, `creature.norse.tier7.base.ref.side.png`, `creature.norse.tier7.base.ref.top.png` → `assets-source/creatures/reference/`; `creature.norse.tier7.base.portrait.png` → `assets-source/icons/final/`

**028 · World-Serpent Wyrm** — Norse, tier 7, upgraded form · `creature.norse.tier7.upgraded`

* Design: the **World-Serpent Wyrm** card on R1-N (Level 7, right).
* Looks: A vast sea-green serpent with barnacled scales and glowing rune-like markings.
* What it is: Apex wyrm — Sea-green wyrms of the world-coil; no charge moves them. Occupies 2 hexes (large — horse-sized or bigger); never loses heart, answers every attack, braces against charges.
* Lore: _World-Serpent Wyrms are sea-green and barnacled. Nothing moves them that they do not wish to be moved by._
* Upgrade of **Nidhogg Wyrm**: same anatomy, proportions, silhouette and pose as Nidhogg Wyrm (so one skeleton fits both); it may be up to 10 % bigger. Change armour, ornament, colour, markings and glow as described, and add parts (wings, more tails or heads) only where the description names them — keep the body plan.
* Pose for the reference views: Body laid in a wide, shallow S-curve that never crosses itself, head raised and looking forward, jaws closed or slightly open.
* Files: `creature.norse.tier7.upgraded.ref.threequarter.png`, `creature.norse.tier7.upgraded.ref.front.png`, `creature.norse.tier7.upgraded.ref.side.png`, `creature.norse.tier7.upgraded.ref.top.png` → `assets-source/creatures/reference/`; `creature.norse.tier7.upgraded.portrait.png` → `assets-source/icons/final/`


### 7.3 Egyptian — 7 families, 14 forms

Design source: the Egyptian pantheon board (**R1-E**), row “7 Creature Levels & Upgrades”: each card below is on it (base on the left of the arrow, upgrade on the right). Keep those designs.

**029 · Sacred Scarab** — Egyptian, tier 1, base form · `creature.egyptian.tier1.base`

* Design: the **Sacred Scarab** card on R1-E (Level 1, left).
* Looks: A large dark-green scarab beetle with a gleaming carapace and forelegs raised.
* What it is: Armored swarm — Dog-sized beetles with shells like bronze; slow, stubborn and hard to break through. Occupies 1 hex (person-sized or smaller); braces against charges.
* Lore: _Every morning the temple keepers count the scarabs that come up out of the sand. Every evening there are more of them than there were._
* Pose for the reference views: Standing on **all six legs**, legs spread evenly, forelegs lowered (not raised), head forward, wing cases closed.
* Files: `creature.egyptian.tier1.base.ref.threequarter.png`, `creature.egyptian.tier1.base.ref.front.png`, `creature.egyptian.tier1.base.ref.side.png`, `creature.egyptian.tier1.base.ref.top.png` → `assets-source/creatures/reference/`; `creature.egyptian.tier1.base.portrait.png` → `assets-source/icons/final/`

**030 · Solar Scarab** — Egyptian, tier 1, upgraded form · `creature.egyptian.tier1.upgraded`

* Design: the **Solar Scarab** card on R1-E (Level 1, right).
* Looks: A golden scarab holding a glowing sun-disc between its forelegs.
* What it is: Armored swarm — Scarabs that have carried the sun-disc; their gilded shells turn charges aside. Occupies 1 hex (person-sized or smaller); braces against charges.
* Lore: _Solar Scarabs have rolled the sun-disc once. The keepers say its warmth never quite leaves their shells._
* Upgrade of **Sacred Scarab**: same anatomy, proportions, silhouette and pose as Sacred Scarab (so one skeleton fits both); it may be up to 10 % bigger. Change armour, ornament, colour, markings and glow as described, and add parts (wings, more tails or heads) only where the description names them — keep the body plan.
* Pose for the reference views: Standing on **all six legs**, legs spread evenly, wing cases closed; the sun-disc held low between the forelegs (or on its back) so it does not hide the head.
* Files: `creature.egyptian.tier1.upgraded.ref.threequarter.png`, `creature.egyptian.tier1.upgraded.ref.front.png`, `creature.egyptian.tier1.upgraded.ref.side.png`, `creature.egyptian.tier1.upgraded.ref.top.png` → `assets-source/creatures/reference/`; `creature.egyptian.tier1.upgraded.portrait.png` → `assets-source/icons/final/`

**031 · Jackal Guardian** — Egyptian, tier 2, base form · `creature.egyptian.tier2.base`

* Design: the **Jackal Guardian** card on R1-E (Level 2, left).
* Looks: A jackal-headed warrior in a striped headdress with a bundle of javelins.
* What it is: Javelin guard — Jackal-headed guards of the necropolis who hurl javelins at intruders. Occupies 1 hex (person-sized or smaller); shoots.
* Lore: _The Guardians were given jackal faces so the dead would know them at a glance. The living find the faces less reassuring._
* Pose for the reference views: Relaxed **A-pose**; one javelin in the right hand pointing down and outward, the bundle on the back.
* Files: `creature.egyptian.tier2.base.ref.threequarter.png`, `creature.egyptian.tier2.base.ref.front.png`, `creature.egyptian.tier2.base.ref.side.png`, `creature.egyptian.tier2.base.ref.top.png` → `assets-source/creatures/reference/`; `creature.egyptian.tier2.base.portrait.png` → `assets-source/icons/final/`

**032 · Anubian Warden** — Egyptian, tier 2, upgraded form · `creature.egyptian.tier2.upgraded`

* Design: the **Anubian Warden** card on R1-E (Level 2, right).
* Looks: A black-furred jackal warrior in gold-banded armor with a javelin raised to throw.
* What it is: Javelin guard — Senior wardens of the tomb gates, as dangerous with a spear in hand as with a thrown one. Occupies 1 hex (person-sized or smaller); shoots, fights well up close too.
* Lore: _An Anubian Warden has guarded a king’s door for a lifetime. It no longer matters to him how close the thief gets._
* Upgrade of **Jackal Guardian**: same anatomy, proportions, silhouette and pose as Jackal Guardian (so one skeleton fits both); it may be up to 10 % bigger. Change armour, ornament, colour, markings and glow as described, and add parts (wings, more tails or heads) only where the description names them — keep the body plan.
* Pose for the reference views: Relaxed **A-pose** — not mid-throw; one javelin in the right hand pointing down and outward, the rest on the back.
* Files: `creature.egyptian.tier2.upgraded.ref.threequarter.png`, `creature.egyptian.tier2.upgraded.ref.front.png`, `creature.egyptian.tier2.upgraded.ref.side.png`, `creature.egyptian.tier2.upgraded.ref.top.png` → `assets-source/creatures/reference/`; `creature.egyptian.tier2.upgraded.portrait.png` → `assets-source/icons/final/`

**033 · Ushabti** — Egyptian, tier 3, base form · `creature.egyptian.tier3.base`

* Design: the **Ushabti** card on R1-E (Level 3, left).
* Looks: A mummiform blue-glazed figure holding a hoe and a basket, eyes painted wide.
* What it is: Tireless construct — Faience servant-figures brought to life; they never tire and never falter. Occupies 1 hex (person-sized or smaller); never loses heart.
* Lore: _Somebody has to answer when the call comes for labour in the next world. The ushabti answer in this one too, if the right words are painted on them._
* Pose for the reference views: Standing upright and stiff like a statue, arms held a little away from the body, the hoe in the right hand and the basket in the left, both held low at the sides.
* Files: `creature.egyptian.tier3.base.ref.threequarter.png`, `creature.egyptian.tier3.base.ref.front.png`, `creature.egyptian.tier3.base.ref.side.png`, `creature.egyptian.tier3.base.ref.top.png` → `assets-source/creatures/reference/`; `creature.egyptian.tier3.base.portrait.png` → `assets-source/icons/final/`

**034 · Royal Ushabti** — Egyptian, tier 3, upgraded form · `creature.egyptian.tier3.upgraded`

* Design: the **Royal Ushabti** card on R1-E (Level 3, right).
* Looks: A tall gilded ushabti with a royal headdress and rows of hieroglyphs on its body.
* What it is: Tireless construct — Figures made for a pharaoh’s tomb, carved larger and inscribed with stronger spells. Occupies 1 hex (person-sized or smaller); never loses heart, braces against charges.
* Lore: _Royal Ushabti were made by the hundred for a single king. They have never been told he is gone._
* Upgrade of **Ushabti**: same anatomy, proportions, silhouette and pose as Ushabti (so one skeleton fits both); it may be up to 10 % bigger. Change armour, ornament, colour, markings and glow as described, and add parts (wings, more tails or heads) only where the description names them — keep the body plan.
* Pose for the reference views: Standing upright and stiff like a statue, arms held a little away from the body, hands holding its tools low at the sides.
* Files: `creature.egyptian.tier3.upgraded.ref.threequarter.png`, `creature.egyptian.tier3.upgraded.ref.front.png`, `creature.egyptian.tier3.upgraded.ref.side.png`, `creature.egyptian.tier3.upgraded.ref.top.png` → `assets-source/creatures/reference/`; `creature.egyptian.tier3.upgraded.portrait.png` → `assets-source/icons/final/`

**035 · Sphinx** — Egyptian, tier 4, base form · `creature.egyptian.tier4.base`

* Design: the **Sphinx** card on R1-E (Level 4, left).
* Looks: A lion with a human face and a striped royal headdress, crouched to spring.
* What it is: Guardian beast — Lion-bodied guardians with human faces that turn on every attacker. Occupies 2 hexes (large — horse-sized or bigger); answers two attacks a round.
* Lore: _The sphinxes on the terrace were stone once. Nobody in the city is old enough to say when that stopped being true._
* Pose for the reference views: Standing **square on all four legs** (not crouched to spring), head level and looking forward, tail straight out behind.
* Files: `creature.egyptian.tier4.base.ref.threequarter.png`, `creature.egyptian.tier4.base.ref.front.png`, `creature.egyptian.tier4.base.ref.side.png`, `creature.egyptian.tier4.base.ref.top.png` → `assets-source/creatures/reference/`; `creature.egyptian.tier4.base.portrait.png` → `assets-source/icons/final/`

**036 · Great Sphinx** — Egyptian, tier 4, upgraded form · `creature.egyptian.tier4.upgraded`

* Design: the **Great Sphinx** card on R1-E (Level 4, right).
* Looks: A great sphinx with falcon wings spread, sandstone-coloured fur and a golden beard.
* What it is: Guardian beast — Winged sphinxes of the royal terraces who strike from above and still answer twice. Occupies 2 hexes (large — horse-sized or bigger); answers two attacks a round, flies.
* Lore: _The Great Sphinxes are the ones that grew wings. They still prefer to wait, but they no longer have to._
* Upgrade of **Sphinx**: same anatomy, proportions, silhouette and pose as Sphinx (so one skeleton fits both); it may be up to 10 % bigger. Change armour, ornament, colour, markings and glow as described, and add parts (wings, more tails or heads) only where the description names them — keep the body plan.
* Pose for the reference views: Standing **square on all four legs** (not crouched), head level, **falcon wings half-spread** to the sides and slightly back.
* Files: `creature.egyptian.tier4.upgraded.ref.threequarter.png`, `creature.egyptian.tier4.upgraded.ref.front.png`, `creature.egyptian.tier4.upgraded.ref.side.png`, `creature.egyptian.tier4.upgraded.ref.top.png` → `assets-source/creatures/reference/`; `creature.egyptian.tier4.upgraded.portrait.png` → `assets-source/icons/final/`

**037 · Crocodile Beast** — Egyptian, tier 5, base form · `creature.egyptian.tier5.base`

* Design: the **Crocodile Beast** card on R1-E (Level 5, left).
* Looks: A huge Nile crocodile with bronze rings on its forelegs, jaws half open.
* What it is: River shock beast — Temple-raised river crocodiles that hit harder the farther they lunge. Occupies 2 hexes (large — horse-sized or bigger); charges.
* Lore: _The river gives and the river takes. The pens are where the city keeps the part of the river that takes._
* Pose for the reference views: Standing **square on all four legs**, legs straight and slightly apart so every leg is visible from the side, head level and looking forward, mouth closed or slightly open, tail straight out behind (not curled over the back).
* Files: `creature.egyptian.tier5.base.ref.threequarter.png`, `creature.egyptian.tier5.base.ref.front.png`, `creature.egyptian.tier5.base.ref.side.png`, `creature.egyptian.tier5.base.ref.top.png` → `assets-source/creatures/reference/`; `creature.egyptian.tier5.base.portrait.png` → `assets-source/icons/final/`

**038 · Sobek Warbeast** — Egyptian, tier 5, upgraded form · `creature.egyptian.tier5.upgraded`

* Design: the **Sobek Warbeast** card on R1-E (Level 5, right).
* Looks: A crocodile in a bronze-scale harness with a sun-disc crest between its eyes.
* What it is: River shock beast — Crocodiles consecrated to Sobek, armored in bronze scales and quick to turn. Occupies 2 hexes (large — horse-sized or bigger); charges, answers two attacks a round.
* Lore: _A Sobek Warbeast wears its god’s sun-disc. The priests say that is why it never has to look where it is going._
* Upgrade of **Crocodile Beast**: same anatomy, proportions, silhouette and pose as Crocodile Beast (so one skeleton fits both); it may be up to 10 % bigger. Change armour, ornament, colour, markings and glow as described, and add parts (wings, more tails or heads) only where the description names them — keep the body plan.
* Pose for the reference views: Standing **square on all four legs**, legs straight and slightly apart so every leg is visible from the side, head level and looking forward, mouth closed or slightly open, tail straight out behind (not curled over the back).
* Files: `creature.egyptian.tier5.upgraded.ref.threequarter.png`, `creature.egyptian.tier5.upgraded.ref.front.png`, `creature.egyptian.tier5.upgraded.ref.side.png`, `creature.egyptian.tier5.upgraded.ref.top.png` → `assets-source/creatures/reference/`; `creature.egyptian.tier5.upgraded.portrait.png` → `assets-source/icons/final/`

**039 · Bennu** — Egyptian, tier 6, base form · `creature.egyptian.tier6.base`

* Design: the **Bennu** card on R1-E (Level 6, left).
* Looks: A huge grey-gold heron-like bird with a two-feathered crest and ember-lit wings.
* What it is: Flying striker — Great heron-winged firebirds that strike anywhere on the field. Occupies 2 hexes (large — horse-sized or bigger); flies.
* Lore: _The Bennu nests on the highest pillar in the city and leaves at dawn. The watchers on the walls have learned to follow where it flies._
* Pose for the reference views: A great heron-like bird standing on its two legs, neck raised, **wings half-spread** to the sides, tail feathers out behind.
* Files: `creature.egyptian.tier6.base.ref.threequarter.png`, `creature.egyptian.tier6.base.ref.front.png`, `creature.egyptian.tier6.base.ref.side.png`, `creature.egyptian.tier6.base.ref.top.png` → `assets-source/creatures/reference/`; `creature.egyptian.tier6.base.portrait.png` → `assets-source/icons/final/`

**040 · Radiant Bennu** — Egyptian, tier 6, upgraded form · `creature.egyptian.tier6.upgraded`

* Design: the **Radiant Bennu** card on R1-E (Level 6, right).
* Looks: A blazing golden bird with sun-rays in its crest and wings trailing light.
* What it is: Flying striker — Bennu that have burned and risen again; nothing on the field shakes them. Occupies 2 hexes (large — horse-sized or bigger); flies, never loses heart.
* Lore: _A Radiant Bennu has already died once in fire. It sees no reason to be afraid of anything smaller._
* Upgrade of **Bennu**: same anatomy, proportions, silhouette and pose as Bennu (so one skeleton fits both); it may be up to 10 % bigger. Change armour, ornament, colour, markings and glow as described, and add parts (wings, more tails or heads) only where the description names them — keep the body plan.
* Pose for the reference views: Standing on its two legs, neck raised, **wings half-spread** to the sides; the light along the wings drawn as solid glowing feather shapes, not loose rays.
* Files: `creature.egyptian.tier6.upgraded.ref.threequarter.png`, `creature.egyptian.tier6.upgraded.ref.front.png`, `creature.egyptian.tier6.upgraded.ref.side.png`, `creature.egyptian.tier6.upgraded.ref.top.png` → `assets-source/creatures/reference/`; `creature.egyptian.tier6.upgraded.portrait.png` → `assets-source/icons/final/`

**041 · Desert Colossus** — Egyptian, tier 7, base form · `creature.egyptian.tier7.base`

* Design: the **Desert Colossus** card on R1-E (Level 7, left).
* Looks: A towering seated-king statue of red granite, now standing, with sand pouring from its joints.
* What it is: Apex siege construct — Walking statues of red granite that hurl stone blocks and batter walls. Occupies 2 hexes (large — horse-sized or bigger); shoots, breaks walls, fights well up close too.
* Lore: _The quarrymen cut the statue first and the prayers second. When both are finished, the statue stands up by itself._
* Pose for the reference views: Standing upright in a relaxed A-pose, arms away from the body, hands open or holding one stone block low at the side; no sand pouring (a battle effect).
* Files: `creature.egyptian.tier7.base.ref.threequarter.png`, `creature.egyptian.tier7.base.ref.front.png`, `creature.egyptian.tier7.base.ref.side.png`, `creature.egyptian.tier7.base.ref.top.png` → `assets-source/creatures/reference/`; `creature.egyptian.tier7.base.portrait.png` → `assets-source/icons/final/`

**042 · Divine Colossus** — Egyptian, tier 7, upgraded form · `creature.egyptian.tier7.upgraded`

* Design: the **Divine Colossus** card on R1-E (Level 7, right).
* Looks: A colossal statue with a gold-inlaid headdress and eyes of lapis, a stone block in each hand.
* What it is: Apex siege construct — Colossi inlaid with gold and faience, carrying more stones and striking harder. Occupies 2 hexes (large — horse-sized or bigger); shoots, breaks walls, fights well up close too.
* Lore: _The Divine Colossi carry gold in their joints. It is said to be what lets them lift a whole doorway and throw it._
* Upgrade of **Desert Colossus**: same anatomy, proportions, silhouette and pose as Desert Colossus (so one skeleton fits both); it may be up to 10 % bigger. Change armour, ornament, colour, markings and glow as described, and add parts (wings, more tails or heads) only where the description names them — keep the body plan.
* Pose for the reference views: Standing upright in a relaxed A-pose, arms away from the body, a stone block held low in each hand, away from the body.
* Files: `creature.egyptian.tier7.upgraded.ref.threequarter.png`, `creature.egyptian.tier7.upgraded.ref.front.png`, `creature.egyptian.tier7.upgraded.ref.side.png`, `creature.egyptian.tier7.upgraded.ref.top.png` → `assets-source/creatures/reference/`; `creature.egyptian.tier7.upgraded.portrait.png` → `assets-source/icons/final/`


### 7.4 Japanese — 7 families, 14 forms

Design source: the Japanese pantheon board (**R1-J**), row “7 Creature Levels & Upgrades”: each card below is on it (base on the left of the arrow, upgrade on the right). Keep those designs.

**043 · Kitsune** — Japanese, tier 1, base form · `creature.japanese.tier1.base`

* Design: the **Kitsune** card on R1-J (Level 1, left).
* Looks: A russet fox with two tails and a faint blue flame floating beside it.
* What it is: Fox skirmisher — Quick fox spirits that dart into gaps in the enemy line. Occupies 1 hex (person-sized or smaller).
* Lore: _The foxes of the grove bring rice to the shrine steps in good years. In bad years they bring the soldiers instead._
* Pose for the reference views: Standing **square on all four legs**, head level, both tails straight out behind and slightly apart; the fox-fire is not drawn (it is a battle effect).
* Files: `creature.japanese.tier1.base.ref.threequarter.png`, `creature.japanese.tier1.base.ref.front.png`, `creature.japanese.tier1.base.ref.side.png`, `creature.japanese.tier1.base.ref.top.png` → `assets-source/creatures/reference/`; `creature.japanese.tier1.base.portrait.png` → `assets-source/icons/final/`

**044 · Nine-Tailed Kitsune** — Japanese, tier 1, upgraded form · `creature.japanese.tier1.upgraded`

* Design: the **Nine-Tailed Kitsune** card on R1-J (Level 1, right).
* Looks: A white fox with nine fanned tails and a ring of pale fox-fire.
* What it is: Fox skirmisher — Old white foxes that can ward one ally per battle with fox-fire. Occupies 1 hex (person-sized or smaller); can ward an ally.
* Lore: _A fox that has grown nine tails remembers every favour it has ever owed, and pays them at the worst moment for its enemies._
* Upgrade of **Kitsune**: same anatomy, proportions, silhouette and pose as Kitsune (so one skeleton fits both); it may be up to 10 % bigger. Change armour, ornament, colour, markings and glow as described, and add parts (wings, more tails or heads) only where the description names them — keep the body plan.
* Pose for the reference views: Standing **square on all four legs**, head level, the **nine tails fanned out** behind and above, none hiding the body; no fox-fire ring.
* Files: `creature.japanese.tier1.upgraded.ref.threequarter.png`, `creature.japanese.tier1.upgraded.ref.front.png`, `creature.japanese.tier1.upgraded.ref.side.png`, `creature.japanese.tier1.upgraded.ref.top.png` → `assets-source/creatures/reference/`; `creature.japanese.tier1.upgraded.portrait.png` → `assets-source/icons/final/`

**045 · Kappa** — Japanese, tier 2, base form · `creature.japanese.tier2.base`

* Design: the **Kappa** card on R1-J (Level 2, left).
* Looks: A green turtle-shelled creature with a water-filled dish on its head and webbed hands.
* What it is: River guard — Shell-backed river imps who brace against charges and refuse to give ground. Occupies 1 hex (person-sized or smaller); braces against charges.
* Lore: _The kappa agreed to guard the town’s river crossings in return for cucumbers and courtesy. Travellers still bow to the water before they wade in._
* Pose for the reference views: Standing upright on two legs (a squat, turtle-shelled biped), arms held away from the body, webbed hands open, head level.
* Files: `creature.japanese.tier2.base.ref.threequarter.png`, `creature.japanese.tier2.base.ref.front.png`, `creature.japanese.tier2.base.ref.side.png`, `creature.japanese.tier2.base.ref.top.png` → `assets-source/creatures/reference/`; `creature.japanese.tier2.base.portrait.png` → `assets-source/icons/final/`

**046 · River Elder Kappa** — Japanese, tier 2, upgraded form · `creature.japanese.tier2.upgraded`

* Design: the **River Elder Kappa** card on R1-J (Level 2, right).
* Looks: A large mossy-shelled kappa with a white beard and a bamboo staff.
* What it is: River guard — Moss-shelled elders of the deep pools who answer two attackers each round. Occupies 1 hex (person-sized or smaller); braces against charges, answers two attacks a round.
* Lore: _The River Elders made that agreement themselves. They are very strict about the bowing._
* Upgrade of **Kappa**: same anatomy, proportions, silhouette and pose as Kappa (so one skeleton fits both); it may be up to 10 % bigger. Change armour, ornament, colour, markings and glow as described, and add parts (wings, more tails or heads) only where the description names them — keep the body plan.
* Pose for the reference views: Standing upright on two legs, arms held away from the body, the bamboo staff in the right hand pointing down and outward, head level.
* Files: `creature.japanese.tier2.upgraded.ref.threequarter.png`, `creature.japanese.tier2.upgraded.ref.front.png`, `creature.japanese.tier2.upgraded.ref.side.png`, `creature.japanese.tier2.upgraded.ref.top.png` → `assets-source/creatures/reference/`; `creature.japanese.tier2.upgraded.portrait.png` → `assets-source/icons/final/`

**047 · Tengu** — Japanese, tier 3, base form · `creature.japanese.tier3.base`

* Design: the **Tengu** card on R1-J (Level 3, left).
* Looks: A crow-winged warrior with a red long-nosed mask and a short sword.
* What it is: Mountain flyer — Winged mountain warriors who drop on the enemy’s rear line. Occupies 1 hex (person-sized or smaller); flies.
* Lore: _The tengu train anyone who can climb to their nest. Few can._
* Pose for the reference views: Standing upright in a relaxed **A-pose** (feet shoulder-width apart, arms about 40° below horizontal; any weapon in the right hand pointing down and outward, any shield on the left forearm turned outward). **Wings half-spread** out to the sides and slightly back, fully visible, not touching the body or each other. Feet on the ground — not flying.
* Files: `creature.japanese.tier3.base.ref.threequarter.png`, `creature.japanese.tier3.base.ref.front.png`, `creature.japanese.tier3.base.ref.side.png`, `creature.japanese.tier3.base.ref.top.png` → `assets-source/creatures/reference/`; `creature.japanese.tier3.base.portrait.png` → `assets-source/icons/final/`

**048 · Great Tengu** — Japanese, tier 3, upgraded form · `creature.japanese.tier3.upgraded`

* Design: the **Great Tengu** card on R1-J (Level 3, right).
* Looks: A tengu in monk’s robes with great black wings and a feather fan.
* What it is: Mountain flyer — Masters of the mountain schools, quick enough to answer two attackers. Occupies 1 hex (person-sized or smaller); flies, answers two attacks a round.
* Lore: _Great Tengu taught the teachers. They still correct the stance of anyone who fights near them._
* Upgrade of **Tengu**: same anatomy, proportions, silhouette and pose as Tengu (so one skeleton fits both); it may be up to 10 % bigger. Change armour, ornament, colour, markings and glow as described, and add parts (wings, more tails or heads) only where the description names them — keep the body plan.
* Pose for the reference views: Standing upright in a relaxed A-pose, the feather fan in the right hand held low and away from the body; **wings half-spread**.
* Files: `creature.japanese.tier3.upgraded.ref.threequarter.png`, `creature.japanese.tier3.upgraded.ref.front.png`, `creature.japanese.tier3.upgraded.ref.side.png`, `creature.japanese.tier3.upgraded.ref.top.png` → `assets-source/creatures/reference/`; `creature.japanese.tier3.upgraded.portrait.png` → `assets-source/icons/final/`

**049 · Oni** — Japanese, tier 4, base form · `creature.japanese.tier4.base`

* Design: the **Oni** card on R1-J (Level 4, left).
* Looks: A red-skinned horned ogre in a tiger-skin wrap carrying a studded iron club.
* What it is: Brute — Horned ogres with iron clubs who fear nothing on the field. Occupies 2 hexes (large — horse-sized or bigger); never loses heart.
* Lore: _The oni of the quarry were defeated long ago, and they have never forgotten that the victor fed them afterwards. They work for rice and a good fight._
* Pose for the reference views: Standing upright, facing straight ahead, in a relaxed **A-pose**: feet about shoulder-width apart, legs straight, arms held away from the body (about 40° below horizontal), nothing crossing in front of the torso or face. If it carries a weapon, it is held in the right hand, pointing down and outward; if it has a shield, it is strapped on the left forearm, turned outward so it does not cover the body. Head level, eyes forward, mouth closed.
* Files: `creature.japanese.tier4.base.ref.threequarter.png`, `creature.japanese.tier4.base.ref.front.png`, `creature.japanese.tier4.base.ref.side.png`, `creature.japanese.tier4.base.ref.top.png` → `assets-source/creatures/reference/`; `creature.japanese.tier4.base.portrait.png` → `assets-source/icons/final/`

**050 · Oni Warlord** — Japanese, tier 4, upgraded form · `creature.japanese.tier4.upgraded`

* Design: the **Oni Warlord** card on R1-J (Level 4, right).
* Looks: A blue-skinned oni in lacquered samurai armor with a huge kanabō.
* What it is: Brute — Armored oni chieftains that stop a charge dead. Occupies 2 hexes (large — horse-sized or bigger); never loses heart, braces against charges.
* Lore: _An Oni Warlord wears the armor of the general who beat him. He considers it a compliment to them both._
* Upgrade of **Oni**: same anatomy, proportions, silhouette and pose as Oni (so one skeleton fits both); it may be up to 10 % bigger. Change armour, ornament, colour, markings and glow as described, and add parts (wings, more tails or heads) only where the description names them — keep the body plan.
* Pose for the reference views: Standing upright, facing straight ahead, in a relaxed **A-pose**: feet about shoulder-width apart, legs straight, arms held away from the body (about 40° below horizontal), nothing crossing in front of the torso or face. If it carries a weapon, it is held in the right hand, pointing down and outward; if it has a shield, it is strapped on the left forearm, turned outward so it does not cover the body. Head level, eyes forward, mouth closed.
* Files: `creature.japanese.tier4.upgraded.ref.threequarter.png`, `creature.japanese.tier4.upgraded.ref.front.png`, `creature.japanese.tier4.upgraded.ref.side.png`, `creature.japanese.tier4.upgraded.ref.top.png` → `assets-source/creatures/reference/`; `creature.japanese.tier4.upgraded.portrait.png` → `assets-source/icons/final/`

**051 · Jorogumo** — Japanese, tier 5, base form · `creature.japanese.tier5.base`

* Design: the **Jorogumo** card on R1-J (Level 5, left).
* Looks: A pale woman in a web-patterned kimono whose shadow has eight spider legs.
* What it is: Spider spirit — Spider spirits that catch attackers in silk and bite back twice. Occupies 1 hex (person-sized or smaller); answers two attacks a round.
* Lore: _The hollow behind the castle is thick with silk. The castle pays its rent there in lantern oil and does not send anyone to collect._
* Pose for the reference views: Upright woman’s upper body rising from a **spider body on eight legs** spread evenly around it, legs bent but not crossing; arms in a relaxed A-pose; head level, eyes forward.
* Files: `creature.japanese.tier5.base.ref.threequarter.png`, `creature.japanese.tier5.base.ref.front.png`, `creature.japanese.tier5.base.ref.side.png`, `creature.japanese.tier5.base.ref.top.png` → `assets-source/creatures/reference/`; `creature.japanese.tier5.base.portrait.png` → `assets-source/icons/final/`

**052 · Queen Jorogumo** — Japanese, tier 5, upgraded form · `creature.japanese.tier5.upgraded`

* Design: the **Queen Jorogumo** card on R1-J (Level 5, right).
* Looks: A spider-bodied woman in a gold-threaded kimono, webs glittering behind her.
* What it is: Spider spirit — Ancient spider queens who shield one ally per battle in a cocoon of silk. Occupies 1 hex (person-sized or smaller); answers two attacks a round, can ward an ally.
* Lore: _The Queen has spun for four hundred years. Her silk can hold a falling wall._
* Upgrade of **Jorogumo**: same anatomy, proportions, silhouette and pose as Jorogumo (so one skeleton fits both); it may be up to 10 % bigger. Change armour, ornament, colour, markings and glow as described, and add parts (wings, more tails or heads) only where the description names them — keep the body plan.
* Pose for the reference views: Upright woman’s upper body rising from a **spider body on eight legs** spread evenly around it, legs bent but not crossing; arms in a relaxed A-pose; no web drawn behind her (the web is a battle effect).
* Files: `creature.japanese.tier5.upgraded.ref.threequarter.png`, `creature.japanese.tier5.upgraded.ref.front.png`, `creature.japanese.tier5.upgraded.ref.side.png`, `creature.japanese.tier5.upgraded.ref.top.png` → `assets-source/creatures/reference/`; `creature.japanese.tier5.upgraded.portrait.png` → `assets-source/icons/final/`

**053 · Kirin** — Japanese, tier 6, base form · `creature.japanese.tier6.base`

* Design: the **Kirin** card on R1-J (Level 6, left).
* Looks: A deer-like beast with dragon scales, a single antler and flames at its hooves.
* What it is: Holy beast (ranged) — Scaled, antlered holy beasts that cast holy fire and strike just as hard up close. Occupies 2 hexes (large — horse-sized or bigger); shoots, fights well up close too.
* Lore: _A kirin never steps on a living blade of grass. The castle built it a pavilion of stone so it would have somewhere to stand._
* Pose for the reference views: Standing **square on all four legs**, head level; the hoof flames as small solid flame shapes at the hooves.
* Files: `creature.japanese.tier6.base.ref.threequarter.png`, `creature.japanese.tier6.base.ref.front.png`, `creature.japanese.tier6.base.ref.side.png`, `creature.japanese.tier6.base.ref.top.png` → `assets-source/creatures/reference/`; `creature.japanese.tier6.base.portrait.png` → `assets-source/icons/final/`

**054 · Celestial Kirin** — Japanese, tier 6, upgraded form · `creature.japanese.tier6.upgraded`

* Design: the **Celestial Kirin** card on R1-J (Level 6, right).
* Looks: A golden-scaled kirin walking on clouds, mane of white fire streaming.
* What it is: Holy beast (ranged) — Kirin that walk on clouds; more fire and more reach. Occupies 2 hexes (large — horse-sized or bigger); shoots, fights well up close too.
* Lore: _The Celestial Kirin came down from the clouds when a fair lord took the castle. It has not decided yet whether to stay._
* Upgrade of **Kirin**: same anatomy, proportions, silhouette and pose as Kirin (so one skeleton fits both); it may be up to 10 % bigger. Change armour, ornament, colour, markings and glow as described, and add parts (wings, more tails or heads) only where the description names them — keep the body plan.
* Pose for the reference views: Standing **square on all four legs** on flat ground (no clouds under it), head level; the white-fire mane as solid flame shapes close to the neck.
* Files: `creature.japanese.tier6.upgraded.ref.threequarter.png`, `creature.japanese.tier6.upgraded.ref.front.png`, `creature.japanese.tier6.upgraded.ref.side.png`, `creature.japanese.tier6.upgraded.ref.top.png` → `assets-source/creatures/reference/`; `creature.japanese.tier6.upgraded.portrait.png` → `assets-source/icons/final/`

**055 · Orochi** — Japanese, tier 7, base form · `creature.japanese.tier7.base`

* Design: the **Orochi** card on R1-J (Level 7, left).
* Looks: A vast serpent with many heads rising from one coiled body, eyes red as lanterns.
* What it is: Apex serpent — Many-headed serpents with a head for every attacker. Occupies 2 hexes (large — horse-sized or bigger); answers every attack.
* Lore: _The sanctuary keeps eight vats of rice wine filled. Nobody asks what happens if one of them runs dry._
* Pose for the reference views: One body laid in a wide, shallow S-curve; **the heads fanned out side by side** on raised necks, none crossing another, all looking forward.
* Files: `creature.japanese.tier7.base.ref.threequarter.png`, `creature.japanese.tier7.base.ref.front.png`, `creature.japanese.tier7.base.ref.side.png`, `creature.japanese.tier7.base.ref.top.png` → `assets-source/creatures/reference/`; `creature.japanese.tier7.base.portrait.png` → `assets-source/icons/final/`

**056 · Imperial Orochi** — Japanese, tier 7, upgraded form · `creature.japanese.tier7.upgraded`

* Design: the **Imperial Orochi** card on R1-J (Level 7, right).
* Looks: An eight-headed serpent with gold scales and a golden crest on every head.
* What it is: Apex serpent — Orochi crowned with gold who never lose their nerve. Occupies 2 hexes (large — horse-sized or bigger); answers every attack, never loses heart.
* Lore: _The Imperial Orochi are older than the story. They consider it slander._
* Upgrade of **Orochi**: same anatomy, proportions, silhouette and pose as Orochi (so one skeleton fits both); it may be up to 10 % bigger. Change armour, ornament, colour, markings and glow as described, and add parts (wings, more tails or heads) only where the description names them — keep the body plan.
* Pose for the reference views: One body laid in a wide, shallow S-curve; **all eight heads fanned out side by side** on raised necks, none crossing another, all looking forward.
* Files: `creature.japanese.tier7.upgraded.ref.threequarter.png`, `creature.japanese.tier7.upgraded.ref.front.png`, `creature.japanese.tier7.upgraded.ref.side.png`, `creature.japanese.tier7.upgraded.ref.top.png` → `assets-source/creatures/reference/`; `creature.japanese.tier7.upgraded.portrait.png` → `assets-source/icons/final/`


### 7.5 Celtic — 7 families, 14 forms

Design source: the Celtic pantheon board (**R1-C**), row “7 Creature Levels & Upgrades”: each card below is on it (base on the left of the arrow, upgrade on the right). Keep those designs.

**057 · Pooka** — Celtic, tier 1, base form · `creature.celtic.tier1.base`

* Design: the **Pooka** card on R1-C (Level 1, left).
* Looks: A black long-eared creature, half hare and half goat, with golden eyes.
* What it is: Shape-shifter — Mischievous shape-shifters, usually a black goat or hare, quick across open ground. Occupies 1 hex (person-sized or smaller).
* Lore: _Nobody invites the pooka to the muster. They arrive anyway, in whatever shape suits the weather, and nobody has ever dared send them home._
* Pose for the reference views: Follow the board card. Standing on its hind legs if the board shows it upright (otherwise on all fours), forelimbs away from the body, ears up, head level.
* Files: `creature.celtic.tier1.base.ref.threequarter.png`, `creature.celtic.tier1.base.ref.front.png`, `creature.celtic.tier1.base.ref.side.png`, `creature.celtic.tier1.base.ref.top.png` → `assets-source/creatures/reference/`; `creature.celtic.tier1.base.portrait.png` → `assets-source/icons/final/`

**058 · Elder Pooka** — Celtic, tier 1, upgraded form · `creature.celtic.tier1.upgraded`

* Design: the **Elder Pooka** card on R1-C (Level 1, right).
* Looks: A great dark horse-goat with curling horns and a shaggy mane.
* What it is: Shape-shifter — Old pooka that turn into something too big to charge through at the last moment. Occupies 1 hex (person-sized or smaller); braces against charges.
* Lore: _An Elder Pooka has been a horse, a goat, an eagle and once, briefly, a cart. It knows which shape a spear hates most._
* Upgrade of **Pooka**: same anatomy, proportions, silhouette and pose as Pooka (so one skeleton fits both); it may be up to 10 % bigger. Change armour, ornament, colour, markings and glow as described, and add parts (wings, more tails or heads) only where the description names them — keep the body plan.
* Pose for the reference views: Follow the board card. Same stance as the Pooka, forelimbs away from the body, antlers/horns fully visible.
* Files: `creature.celtic.tier1.upgraded.ref.threequarter.png`, `creature.celtic.tier1.upgraded.ref.front.png`, `creature.celtic.tier1.upgraded.ref.side.png`, `creature.celtic.tier1.upgraded.ref.top.png` → `assets-source/creatures/reference/`; `creature.celtic.tier1.upgraded.portrait.png` → `assets-source/icons/final/`

**059 · Cu Sith** — Celtic, tier 2, base form · `creature.celtic.tier2.base`

* Design: the **Cu Sith** card on R1-C (Level 2, left).
* Looks: A shaggy dark-green hound the size of a calf with a braided tail.
* What it is: Otherworld hound — Huge green-furred hounds of the otherworld that strike harder after a long run. Occupies 1 hex (person-sized or smaller); charges.
* Lore: _The hounds hunt the hill paths at night. Travellers who hear them bay three times are advised to be inside by the third._
* Pose for the reference views: Standing **square on all four legs**, legs straight and slightly apart so every leg is visible from the side, head level and looking forward, mouth closed or slightly open, tail straight out behind (not curled over the back).
* Files: `creature.celtic.tier2.base.ref.threequarter.png`, `creature.celtic.tier2.base.ref.front.png`, `creature.celtic.tier2.base.ref.side.png`, `creature.celtic.tier2.base.ref.top.png` → `assets-source/creatures/reference/`; `creature.celtic.tier2.base.portrait.png` → `assets-source/icons/final/`

**060 · Great Cu Sith** — Celtic, tier 2, upgraded form · `creature.celtic.tier2.upgraded`

* Design: the **Great Cu Sith** card on R1-C (Level 2, right).
* Looks: A massive green hound with glowing eyes and a silver torc collar.
* What it is: Otherworld hound — Pack leaders whose bay carries across three hills. Occupies 1 hex (person-sized or smaller); charges.
* Lore: _The Great Hounds answer only to whoever holds the hall. They have outlived eleven chieftains so far._
* Upgrade of **Cu Sith**: same anatomy, proportions, silhouette and pose as Cu Sith (so one skeleton fits both); it may be up to 10 % bigger. Change armour, ornament, colour, markings and glow as described, and add parts (wings, more tails or heads) only where the description names them — keep the body plan.
* Pose for the reference views: Standing **square on all four legs**, legs straight and slightly apart so every leg is visible from the side, head level and looking forward, mouth closed or slightly open, tail straight out behind (not curled over the back).
* Files: `creature.celtic.tier2.upgraded.ref.threequarter.png`, `creature.celtic.tier2.upgraded.ref.front.png`, `creature.celtic.tier2.upgraded.ref.side.png`, `creature.celtic.tier2.upgraded.ref.top.png` → `assets-source/creatures/reference/`; `creature.celtic.tier2.upgraded.portrait.png` → `assets-source/icons/final/`

**061 · Kelpie** — Celtic, tier 3, base form · `creature.celtic.tier3.base`

* Design: the **Kelpie** card on R1-C (Level 3, left).
* Looks: A grey horse with a dripping weed-tangled mane and hooves turned backwards.
* What it is: Water horse — Water-horses from the lochs that crash into the line at full gallop. Occupies 2 hexes (large — horse-sized or bigger); charges.
* Lore: _Nobody rides a kelpie. The fort’s warriors run alongside them into battle, and let go of the mane before the water._
* Pose for the reference views: Standing **square on all four legs**, legs straight and slightly apart so every leg is visible from the side, head level and looking forward, mouth closed or slightly open, tail straight out behind (not curled over the back).
* Files: `creature.celtic.tier3.base.ref.threequarter.png`, `creature.celtic.tier3.base.ref.front.png`, `creature.celtic.tier3.base.ref.side.png`, `creature.celtic.tier3.base.ref.top.png` → `assets-source/creatures/reference/`; `creature.celtic.tier3.base.portrait.png` → `assets-source/icons/final/`

**062 · Dread Kelpie** — Celtic, tier 3, upgraded form · `creature.celtic.tier3.upgraded`

* Design: the **Dread Kelpie** card on R1-C (Level 3, right).
* Looks: A black water-horse with sea-green eyes and a mane like streaming kelp.
* What it is: Water horse — Black loch-horses that no charge can knock aside. Occupies 2 hexes (large — horse-sized or bigger); charges, braces against charges.
* Lore: _Dread Kelpies come from the loch that has no bottom. They do not stop for anything, including walls._
* Upgrade of **Kelpie**: same anatomy, proportions, silhouette and pose as Kelpie (so one skeleton fits both); it may be up to 10 % bigger. Change armour, ornament, colour, markings and glow as described, and add parts (wings, more tails or heads) only where the description names them — keep the body plan.
* Pose for the reference views: Standing **square on all four legs**, legs straight and slightly apart so every leg is visible from the side, head level and looking forward, mouth closed or slightly open, tail straight out behind (not curled over the back).
* Files: `creature.celtic.tier3.upgraded.ref.threequarter.png`, `creature.celtic.tier3.upgraded.ref.front.png`, `creature.celtic.tier3.upgraded.ref.side.png`, `creature.celtic.tier3.upgraded.ref.top.png` → `assets-source/creatures/reference/`; `creature.celtic.tier3.upgraded.portrait.png` → `assets-source/icons/final/`

**063 · Banshee** — Celtic, tier 4, base form · `creature.celtic.tier4.base`

* Design: the **Banshee** card on R1-C (Level 4, left).
* Looks: A pale grey-cloaked woman with long silver hair, mouth open in a cry.
* What it is: Keening spirit (ranged) — Keening spirits whose wail strikes from across the field. Occupies 1 hex (person-sized or smaller); shoots, fights well up close too.
* Lore: _The cairn women keen for the fort’s dead. In war they keen for the enemy’s, a little early._
* Pose for the reference views: Hovering a hand’s width above the ground, upright, arms in a relaxed A-pose, robes hanging straight down, hair framing — not covering — the face. Mouth closed (the keening is an animation).
* Files: `creature.celtic.tier4.base.ref.threequarter.png`, `creature.celtic.tier4.base.ref.front.png`, `creature.celtic.tier4.base.ref.side.png`, `creature.celtic.tier4.base.ref.top.png` → `assets-source/creatures/reference/`; `creature.celtic.tier4.base.portrait.png` → `assets-source/icons/final/`

**064 · Battle Banshee** — Celtic, tier 4, upgraded form · `creature.celtic.tier4.upgraded`

* Design: the **Battle Banshee** card on R1-C (Level 4, right).
* Looks: A banshee in torn battle-red wrappings, hair streaming like smoke.
* What it is: Keening spirit (ranged) — Banshees who follow the war-bands and keen for the enemy instead. Occupies 1 hex (person-sized or smaller); shoots, fights well up close too.
* Lore: _A Battle Banshee has cried for so many warriors that she knows exactly where the next one will fall._
* Upgrade of **Banshee**: same anatomy, proportions, silhouette and pose as Banshee (so one skeleton fits both); it may be up to 10 % bigger. Change armour, ornament, colour, markings and glow as described, and add parts (wings, more tails or heads) only where the description names them — keep the body plan.
* Pose for the reference views: Hovering a hand’s width above the ground, upright, arms in a relaxed A-pose, wrappings hanging straight down, hair behind the shoulders. Mouth closed.
* Files: `creature.celtic.tier4.upgraded.ref.threequarter.png`, `creature.celtic.tier4.upgraded.ref.front.png`, `creature.celtic.tier4.upgraded.ref.side.png`, `creature.celtic.tier4.upgraded.ref.top.png` → `assets-source/creatures/reference/`; `creature.celtic.tier4.upgraded.portrait.png` → `assets-source/icons/final/`

**065 · Selkie** — Celtic, tier 5, base form · `creature.celtic.tier5.base`

* Design: the **Selkie** card on R1-C (Level 5, left).
* Looks: A great grey seal with a human gaze, rising from surf onto rocks.
* What it is: Sea guardian — Seal-folk warriors who come ashore in grey sealskin and fight like the tide. Occupies 2 hexes (large — horse-sized or bigger); answers two attacks a round.
* Lore: _The cove folk keep their skins hidden under the stones. The fort keeps the stones guarded, and the selkies keep the coast._
* Pose for the reference views: Lying on its belly on flat ground, body straight (not curled), head raised and looking forward, front flippers planted, hind flippers together behind.
* Files: `creature.celtic.tier5.base.ref.threequarter.png`, `creature.celtic.tier5.base.ref.front.png`, `creature.celtic.tier5.base.ref.side.png`, `creature.celtic.tier5.base.ref.top.png` → `assets-source/creatures/reference/`; `creature.celtic.tier5.base.portrait.png` → `assets-source/icons/final/`

**066 · Storm Selkie** — Celtic, tier 5, upgraded form · `creature.celtic.tier5.upgraded`

* Design: the **Storm Selkie** card on R1-C (Level 5, right).
* Looks: A dark storm-grey selkie with a mantle of spray and sea-glass eyes.
* What it is: Sea guardian — Selkies of the winter sea who can wrap one ally in sea-mist once per battle. Occupies 2 hexes (large — horse-sized or bigger); answers two attacks a round, can ward an ally.
* Lore: _Storm Selkies come in only when the winter sea is at its worst. They bring a little of it with them._
* Upgrade of **Selkie**: same anatomy, proportions, silhouette and pose as Selkie (so one skeleton fits both); it may be up to 10 % bigger. Change armour, ornament, colour, markings and glow as described, and add parts (wings, more tails or heads) only where the description names them — keep the body plan.
* Pose for the reference views: Same stance as the Selkie: on its belly, body straight, head raised, flippers planted. The spray mantle stays close to the body as solid shapes, not mist.
* Files: `creature.celtic.tier5.upgraded.ref.threequarter.png`, `creature.celtic.tier5.upgraded.ref.front.png`, `creature.celtic.tier5.upgraded.ref.side.png`, `creature.celtic.tier5.upgraded.ref.top.png` → `assets-source/creatures/reference/`; `creature.celtic.tier5.upgraded.portrait.png` → `assets-source/icons/final/`

**067 · Horned Stag Spirit** — Celtic, tier 6, base form · `creature.celtic.tier6.base`

* Design: the **Horned Stag Spirit** card on R1-C (Level 6, left).
* Looks: A huge white stag with moss-hung antlers and a faint green glow.
* What it is: Forest charger — White forest stags with antlers like oak crowns that break lines with their charge. Occupies 2 hexes (large — horse-sized or bigger); charges.
* Lore: _The stags of the grove choose which hunters may enter the wood. The chosen ones come back with antler-shaped scars and very few words._
* Pose for the reference views: Standing **square on all four legs**, legs straight and slightly apart so every leg is visible from the side, head level and looking forward, mouth closed or slightly open, tail straight out behind (not curled over the back).
* Files: `creature.celtic.tier6.base.ref.threequarter.png`, `creature.celtic.tier6.base.ref.front.png`, `creature.celtic.tier6.base.ref.side.png`, `creature.celtic.tier6.base.ref.top.png` → `assets-source/creatures/reference/`; `creature.celtic.tier6.base.portrait.png` → `assets-source/icons/final/`

**068 · Great Stag Spirit** — Celtic, tier 6, upgraded form · `creature.celtic.tier6.upgraded`

* Design: the **Great Stag Spirit** card on R1-C (Level 6, right).
* Looks: A stag of pale gold with an antler crown hung with leaves and stars.
* What it is: Forest charger — The lord of the grove; its courage never breaks. Occupies 2 hexes (large — horse-sized or bigger); charges, never loses heart.
* Lore: _The Great Stag has never been hunted. It has, however, hunted._
* Upgrade of **Horned Stag Spirit**: same anatomy, proportions, silhouette and pose as Horned Stag Spirit (so one skeleton fits both); it may be up to 10 % bigger. Change armour, ornament, colour, markings and glow as described, and add parts (wings, more tails or heads) only where the description names them — keep the body plan.
* Pose for the reference views: Standing **square on all four legs**, legs straight and slightly apart so every leg is visible from the side, head level and looking forward, mouth closed or slightly open, tail straight out behind (not curled over the back).
* Files: `creature.celtic.tier6.upgraded.ref.threequarter.png`, `creature.celtic.tier6.upgraded.ref.front.png`, `creature.celtic.tier6.upgraded.ref.side.png`, `creature.celtic.tier6.upgraded.ref.top.png` → `assets-source/creatures/reference/`; `creature.celtic.tier6.upgraded.portrait.png` → `assets-source/icons/final/`

**069 · Fomorian Giant** — Celtic, tier 7, base form · `creature.celtic.tier7.base`

* Design: the **Fomorian Giant** card on R1-C (Level 7, left).
* Looks: A towering giant with barnacled skin, a single great eye and a driftwood club.
* What it is: Apex giant — Sea-giants of the old enemy race; nothing frightens them and no charge moves them. Occupies 2 hexes (large — horse-sized or bigger); never loses heart, braces against charges.
* Lore: _The Fomorians lost their war with the gods and went back to the sea. Some of them came back out when the fort offered them a hill of their own._
* Pose for the reference views: Standing upright, facing straight ahead, in a relaxed **A-pose**: feet about shoulder-width apart, legs straight, arms held away from the body (about 40° below horizontal), nothing crossing in front of the torso or face. If it carries a weapon, it is held in the right hand, pointing down and outward; if it has a shield, it is strapped on the left forearm, turned outward so it does not cover the body. Head level, eyes forward, mouth closed.
* Files: `creature.celtic.tier7.base.ref.threequarter.png`, `creature.celtic.tier7.base.ref.front.png`, `creature.celtic.tier7.base.ref.side.png`, `creature.celtic.tier7.base.ref.top.png` → `assets-source/creatures/reference/`; `creature.celtic.tier7.base.portrait.png` → `assets-source/icons/final/`

**070 · Ancient Fomorian** — Celtic, tier 7, upgraded form · `creature.celtic.tier7.upgraded`

* Design: the **Ancient Fomorian** card on R1-C (Level 7, right).
* Looks: An ancient sea-giant crowned with coral, a whale-jaw club over one shoulder.
* What it is: Apex giant — The oldest Fomorians, who swat two attackers in a round. Occupies 2 hexes (large — horse-sized or bigger); never loses heart, braces against charges, answers two attacks a round.
* Lore: _The Ancient Fomorians remember the war. They fight as if it never ended._
* Upgrade of **Fomorian Giant**: same anatomy, proportions, silhouette and pose as Fomorian Giant (so one skeleton fits both); it may be up to 10 % bigger. Change armour, ornament, colour, markings and glow as described, and add parts (wings, more tails or heads) only where the description names them — keep the body plan.
* Pose for the reference views: Standing upright in a relaxed A-pose, the whale-jaw club held low in the right hand, away from the body (not over the shoulder).
* Files: `creature.celtic.tier7.upgraded.ref.threequarter.png`, `creature.celtic.tier7.upgraded.ref.front.png`, `creature.celtic.tier7.upgraded.ref.side.png`, `creature.celtic.tier7.upgraded.ref.top.png` → `assets-source/creatures/reference/`; `creature.celtic.tier7.upgraded.portrait.png` → `assets-source/icons/final/`


### 7.6 Mesoamerican — 7 families, 14 forms

Design source: the Mesoamerican pantheon board (**R1-M**), row “7 Creature Levels & Upgrades”: each card below is on it (base on the left of the arrow, upgrade on the right). Keep those designs.

**071 · Feathered Serpent** — Mesoamerican, tier 1, base form · `creature.mesoamerican.tier1.base`

* Design: the **Feathered Serpent** card on R1-M (Level 1, left).
* Looks: A green serpent with a ruff of quetzal feathers around its head.
* What it is: Serpent swarm — Small plumed serpents that coil around the temple steps and strike quickly. Occupies 1 hex (person-sized or smaller).
* Lore: _The serpents nest in the temple eaves. The priests count them at each new moon and plan the year by the number._
* Pose for the reference views: Body laid on the ground in a wide, shallow S-curve that never crosses itself, head raised with the feather ruff fully open.
* Files: `creature.mesoamerican.tier1.base.ref.threequarter.png`, `creature.mesoamerican.tier1.base.ref.front.png`, `creature.mesoamerican.tier1.base.ref.side.png`, `creature.mesoamerican.tier1.base.ref.top.png` → `assets-source/creatures/reference/`; `creature.mesoamerican.tier1.base.portrait.png` → `assets-source/icons/final/`

**072 · Celestial Feathered Serpent** — Mesoamerican, tier 1, upgraded form · `creature.mesoamerican.tier1.upgraded`

* Design: the **Celestial Feathered Serpent** card on R1-M (Level 1, right).
* Looks: A turquoise serpent with long feathered wings spread against a gold sky.
* What it is: Serpent swarm — Serpents whose plumes have grown into wings; they cross the field in a single glide. Occupies 1 hex (person-sized or smaller); flies.
* Lore: _Celestial serpents are the ones that learned to fly. The priests say they are practising to become something larger._
* Upgrade of **Feathered Serpent**: same anatomy, proportions, silhouette and pose as Feathered Serpent (so one skeleton fits both); it may be up to 10 % bigger. Change armour, ornament, colour, markings and glow as described, and add parts (wings, more tails or heads) only where the description names them — keep the body plan.
* Pose for the reference views: Body laid on the ground in a wide, shallow S-curve that never crosses itself, head raised; **feathered wings half-spread** to the sides.
* Files: `creature.mesoamerican.tier1.upgraded.ref.threequarter.png`, `creature.mesoamerican.tier1.upgraded.ref.front.png`, `creature.mesoamerican.tier1.upgraded.ref.side.png`, `creature.mesoamerican.tier1.upgraded.ref.top.png` → `assets-source/creatures/reference/`; `creature.mesoamerican.tier1.upgraded.portrait.png` → `assets-source/icons/final/`

**073 · Jaguar Spirit** — Mesoamerican, tier 2, base form · `creature.mesoamerican.tier2.base`

* Design: the **Jaguar Spirit** card on R1-M (Level 2, left).
* Looks: A black-spotted golden jaguar with jade eyes, crouched to spring.
* What it is: Pouncing predator — Spotted spirit-cats that pounce from a distance and hit hard. Occupies 1 hex (person-sized or smaller); charges.
* Lore: _The jaguars of the prowl choose their own warriors. The warriors wear the spotted skin afterwards, and the jaguars seem to find that funny._
* Pose for the reference views: Standing **square on all four legs** (not crouched), head level, tail straight out behind.
* Files: `creature.mesoamerican.tier2.base.ref.threequarter.png`, `creature.mesoamerican.tier2.base.ref.front.png`, `creature.mesoamerican.tier2.base.ref.side.png`, `creature.mesoamerican.tier2.base.ref.top.png` → `assets-source/creatures/reference/`; `creature.mesoamerican.tier2.base.portrait.png` → `assets-source/icons/final/`

**074 · Sun Jaguar** — Mesoamerican, tier 2, upgraded form · `creature.mesoamerican.tier2.upgraded`

* Design: the **Sun Jaguar** card on R1-M (Level 2, right).
* Looks: A bright-gold jaguar with a sun-disc pattern across its shoulders.
* What it is: Pouncing predator — Jaguars that hunt by day, gold-furred and quick to turn on two attackers. Occupies 1 hex (person-sized or smaller); charges, answers two attacks a round.
* Lore: _Sun Jaguars hunt when the others sleep. They do not need the dark to be unseen._
* Upgrade of **Jaguar Spirit**: same anatomy, proportions, silhouette and pose as Jaguar Spirit (so one skeleton fits both); it may be up to 10 % bigger. Change armour, ornament, colour, markings and glow as described, and add parts (wings, more tails or heads) only where the description names them — keep the body plan.
* Pose for the reference views: Standing **square on all four legs**, legs straight and slightly apart so every leg is visible from the side, head level and looking forward, mouth closed or slightly open, tail straight out behind (not curled over the back).
* Files: `creature.mesoamerican.tier2.upgraded.ref.threequarter.png`, `creature.mesoamerican.tier2.upgraded.ref.front.png`, `creature.mesoamerican.tier2.upgraded.ref.side.png`, `creature.mesoamerican.tier2.upgraded.ref.top.png` → `assets-source/creatures/reference/`; `creature.mesoamerican.tier2.upgraded.portrait.png` → `assets-source/icons/final/`

**075 · Eagle Warrior Spirit** — Mesoamerican, tier 3, base form · `creature.mesoamerican.tier3.base`

* Design: the **Eagle Warrior Spirit** card on R1-M (Level 3, left).
* Looks: A warrior in a feathered eagle-head helmet holding an atlatl and darts.
* What it is: Dart thrower — Spirit warriors in eagle helms who hurl atlatl darts from the back line. Occupies 1 hex (person-sized or smaller); shoots.
* Lore: _An eagle warrior who dies facing the sun is said to fly with it for four years. The spirits in the aerie are the ones who came back early to help._
* Pose for the reference views: Relaxed **A-pose**; the atlatl in the right hand pointing down and outward, darts in a quiver on the back.
* Files: `creature.mesoamerican.tier3.base.ref.threequarter.png`, `creature.mesoamerican.tier3.base.ref.front.png`, `creature.mesoamerican.tier3.base.ref.side.png`, `creature.mesoamerican.tier3.base.ref.top.png` → `assets-source/creatures/reference/`; `creature.mesoamerican.tier3.base.portrait.png` → `assets-source/icons/final/`

**076 · Solar Eagle Warrior** — Mesoamerican, tier 3, upgraded form · `creature.mesoamerican.tier3.upgraded`

* Design: the **Solar Eagle Warrior** card on R1-M (Level 3, right).
* Looks: An eagle warrior in golden feathers with a sun-ray shield and a bundle of darts.
* What it is: Dart thrower — Eagle warriors of the sun’s house, with more darts and longer arms. Occupies 1 hex (person-sized or smaller); shoots.
* Lore: _Solar Eagle Warriors finished their four years and chose to return anyway._
* Upgrade of **Eagle Warrior Spirit**: same anatomy, proportions, silhouette and pose as Eagle Warrior Spirit (so one skeleton fits both); it may be up to 10 % bigger. Change armour, ornament, colour, markings and glow as described, and add parts (wings, more tails or heads) only where the description names them — keep the body plan.
* Pose for the reference views: Relaxed **A-pose**; the atlatl in the right hand pointing down and outward, darts on the back, the sun-ray shield on the left forearm turned outward.
* Files: `creature.mesoamerican.tier3.upgraded.ref.threequarter.png`, `creature.mesoamerican.tier3.upgraded.ref.front.png`, `creature.mesoamerican.tier3.upgraded.ref.side.png`, `creature.mesoamerican.tier3.upgraded.ref.top.png` → `assets-source/creatures/reference/`; `creature.mesoamerican.tier3.upgraded.portrait.png` → `assets-source/icons/final/`

**077 · Cenote Crocodile** — Mesoamerican, tier 4, base form · `creature.mesoamerican.tier4.base`

* Design: the **Cenote Crocodile** card on R1-M (Level 4, left).
* Looks: A dark crocodile with jade-green scutes emerging from still blue water.
* What it is: Temple guardian — Armored crocodiles from the sacred sinkholes that brace against any charge. Occupies 2 hexes (large — horse-sized or bigger); braces against charges.
* Lore: _The cenote under the city goes down to the underworld, and something down there keeps the water clean. The priests feed it so it will keep doing so._
* Pose for the reference views: Standing **square on all four legs**, legs straight and slightly apart so every leg is visible from the side, head level and looking forward, mouth closed or slightly open, tail straight out behind (not curled over the back).
* Files: `creature.mesoamerican.tier4.base.ref.threequarter.png`, `creature.mesoamerican.tier4.base.ref.front.png`, `creature.mesoamerican.tier4.base.ref.side.png`, `creature.mesoamerican.tier4.base.ref.top.png` → `assets-source/creatures/reference/`; `creature.mesoamerican.tier4.base.portrait.png` → `assets-source/icons/final/`

**078 · Temple Crocodile** — Mesoamerican, tier 4, upgraded form · `creature.mesoamerican.tier4.upgraded`

* Design: the **Temple Crocodile** card on R1-M (Level 4, right).
* Looks: A great crocodile with carved jade plates bound to its back.
* What it is: Temple guardian — Crocodiles raised in the temple cenote, answering two attackers each round. Occupies 2 hexes (large — horse-sized or bigger); braces against charges, answers two attacks a round.
* Lore: _A Temple Crocodile has lived in the temple pool since before the temple. It thinks of the priests as its keepers, not the other way round._
* Upgrade of **Cenote Crocodile**: same anatomy, proportions, silhouette and pose as Cenote Crocodile (so one skeleton fits both); it may be up to 10 % bigger. Change armour, ornament, colour, markings and glow as described, and add parts (wings, more tails or heads) only where the description names them — keep the body plan.
* Pose for the reference views: Standing **square on all four legs**, legs straight and slightly apart so every leg is visible from the side, head level and looking forward, mouth closed or slightly open, tail straight out behind (not curled over the back).
* Files: `creature.mesoamerican.tier4.upgraded.ref.threequarter.png`, `creature.mesoamerican.tier4.upgraded.ref.front.png`, `creature.mesoamerican.tier4.upgraded.ref.side.png`, `creature.mesoamerican.tier4.upgraded.ref.top.png` → `assets-source/creatures/reference/`; `creature.mesoamerican.tier4.upgraded.portrait.png` → `assets-source/icons/final/`

**079 · Camazotz** — Mesoamerican, tier 5, base form · `creature.mesoamerican.tier5.base`

* Design: the **Camazotz** card on R1-M (Level 5, left).
* Looks: A tall bat-headed figure with leathery wings and an obsidian blade.
* What it is: Bat raider — Bat-winged cave spirits that dive on the enemy from anywhere on the field. Occupies 1 hex (person-sized or smaller); flies.
* Lore: _The bat cave is the one place in the city where no lamp is ever lit. The Camazotz like it that way, and they guard the city at night in return._
* Pose for the reference views: Standing upright in a relaxed A-pose, the obsidian blade in the right hand pointing down; **wings half-spread** to the sides, fully visible.
* Files: `creature.mesoamerican.tier5.base.ref.threequarter.png`, `creature.mesoamerican.tier5.base.ref.front.png`, `creature.mesoamerican.tier5.base.ref.side.png`, `creature.mesoamerican.tier5.base.ref.top.png` → `assets-source/creatures/reference/`; `creature.mesoamerican.tier5.base.portrait.png` → `assets-source/icons/final/`

**080 · Blood Moon Camazotz** — Mesoamerican, tier 5, upgraded form · `creature.mesoamerican.tier5.upgraded`

* Design: the **Blood Moon Camazotz** card on R1-M (Level 5, right).
* Looks: A crimson-winged bat spirit silhouetted against a red moon.
* What it is: Bat raider — Camazotz of the blood moon, who strike back at two attackers each round. Occupies 1 hex (person-sized or smaller); flies, answers two attacks a round.
* Lore: _On a blood moon the Camazotz fly higher and come back later. The city stays indoors._
* Upgrade of **Camazotz**: same anatomy, proportions, silhouette and pose as Camazotz (so one skeleton fits both); it may be up to 10 % bigger. Change armour, ornament, colour, markings and glow as described, and add parts (wings, more tails or heads) only where the description names them — keep the body plan.
* Pose for the reference views: Standing upright in a relaxed A-pose, blade in the right hand pointing down; **wings half-spread** to the sides; no moon behind it.
* Files: `creature.mesoamerican.tier5.upgraded.ref.threequarter.png`, `creature.mesoamerican.tier5.upgraded.ref.front.png`, `creature.mesoamerican.tier5.upgraded.ref.side.png`, `creature.mesoamerican.tier5.upgraded.ref.top.png` → `assets-source/creatures/reference/`; `creature.mesoamerican.tier5.upgraded.portrait.png` → `assets-source/icons/final/`

**081 · Xiuhcoatl** — Mesoamerican, tier 6, base form · `creature.mesoamerican.tier6.base`

* Design: the **Xiuhcoatl** card on R1-M (Level 6, left).
* Looks: A turquoise serpent with a flaming, segmented tail and a snout curling upward.
* What it is: Fire serpent (ranged) — Turquoise fire serpents that spit flame across the field and bite just as hard. Occupies 2 hexes (large — horse-sized or bigger); shoots, fights well up close too.
* Lore: _The fire serpents sleep coiled around the new-fire altar. When the city lights its fires every fifty-two years, the serpents are the first to wake._
* Pose for the reference views: Body laid in a wide, shallow S-curve that never crosses itself, head raised; the flaming tail drawn as **solid, sculpted flame shapes** fixed to the tail, not smoke.
* Files: `creature.mesoamerican.tier6.base.ref.threequarter.png`, `creature.mesoamerican.tier6.base.ref.front.png`, `creature.mesoamerican.tier6.base.ref.side.png`, `creature.mesoamerican.tier6.base.ref.top.png` → `assets-source/creatures/reference/`; `creature.mesoamerican.tier6.base.portrait.png` → `assets-source/icons/final/`

**082 · Divine Xiuhcoatl** — Mesoamerican, tier 6, upgraded form · `creature.mesoamerican.tier6.upgraded`

* Design: the **Divine Xiuhcoatl** card on R1-M (Level 6, right).
* Looks: A blazing blue-and-gold serpent wreathed in a corona of fire.
* What it is: Fire serpent (ranged) — Fire serpents of the sun’s own weapon; more flame and a hotter bite. Occupies 2 hexes (large — horse-sized or bigger); shoots, fights well up close too.
* Lore: _A Divine Xiuhcoatl has been thrown by a god. It remembers the arc, and it still enjoys it._
* Upgrade of **Xiuhcoatl**: same anatomy, proportions, silhouette and pose as Xiuhcoatl (so one skeleton fits both); it may be up to 10 % bigger. Change armour, ornament, colour, markings and glow as described, and add parts (wings, more tails or heads) only where the description names them — keep the body plan.
* Pose for the reference views: Body laid in a wide, shallow S-curve that never crosses itself, head raised; the fire corona drawn as **solid, sculpted flame shapes** close to the body, not smoke or loose sparks.
* Files: `creature.mesoamerican.tier6.upgraded.ref.threequarter.png`, `creature.mesoamerican.tier6.upgraded.ref.front.png`, `creature.mesoamerican.tier6.upgraded.ref.side.png`, `creature.mesoamerican.tier6.upgraded.ref.top.png` → `assets-source/creatures/reference/`; `creature.mesoamerican.tier6.upgraded.portrait.png` → `assets-source/icons/final/`

**083 · Stone Colossus** — Mesoamerican, tier 7, base form · `creature.mesoamerican.tier7.base`

* Design: the **Stone Colossus** card on R1-M (Level 7, left).
* Looks: A towering basalt warrior statue with a feathered headdress and a stone shield.
* What it is: Apex guardian — Temple-guardian statues of basalt that nothing frightens and nothing moves. Occupies 2 hexes (large — horse-sized or bigger); never loses heart, braces against charges.
* Lore: _The colossi stood on the pyramid roof holding it up. When the city needed them, the priests built new columns first._
* Pose for the reference views: Standing upright, facing straight ahead, in a relaxed **A-pose**: feet about shoulder-width apart, legs straight, arms held away from the body (about 40° below horizontal), nothing crossing in front of the torso or face. If it carries a weapon, it is held in the right hand, pointing down and outward; if it has a shield, it is strapped on the left forearm, turned outward so it does not cover the body. Head level, eyes forward, mouth closed.
* Files: `creature.mesoamerican.tier7.base.ref.threequarter.png`, `creature.mesoamerican.tier7.base.ref.front.png`, `creature.mesoamerican.tier7.base.ref.side.png`, `creature.mesoamerican.tier7.base.ref.top.png` → `assets-source/creatures/reference/`; `creature.mesoamerican.tier7.base.portrait.png` → `assets-source/icons/final/`

**084 · Sun Colossus** — Mesoamerican, tier 7, upgraded form · `creature.mesoamerican.tier7.upgraded`

* Design: the **Sun Colossus** card on R1-M (Level 7, right).
* Looks: A colossal statue with glowing gold glyphs and a sun-disc on its chest.
* What it is: Apex guardian — Colossi lit from within by the sun; they answer every blow. Occupies 2 hexes (large — horse-sized or bigger); never loses heart, braces against charges, answers every attack.
* Lore: _A Sun Colossus has the day’s light sealed inside it. It is warm to the touch, even at midnight._
* Upgrade of **Stone Colossus**: same anatomy, proportions, silhouette and pose as Stone Colossus (so one skeleton fits both); it may be up to 10 % bigger. Change armour, ornament, colour, markings and glow as described, and add parts (wings, more tails or heads) only where the description names them — keep the body plan.
* Pose for the reference views: Standing upright, facing straight ahead, in a relaxed **A-pose**: feet about shoulder-width apart, legs straight, arms held away from the body (about 40° below horizontal), nothing crossing in front of the torso or face. If it carries a weapon, it is held in the right hand, pointing down and outward; if it has a shield, it is strapped on the left forearm, turned outward so it does not cover the body. Head level, eyes forward, mouth closed.
* Files: `creature.mesoamerican.tier7.upgraded.ref.threequarter.png`, `creature.mesoamerican.tier7.upgraded.ref.front.png`, `creature.mesoamerican.tier7.upgraded.ref.side.png`, `creature.mesoamerican.tier7.upgraded.ref.top.png` → `assets-source/creatures/reference/`; `creature.mesoamerican.tier7.upgraded.portrait.png` → `assets-source/icons/final/`


### 7.7 Neutral — 9 families, 18 forms

Neutral creatures belong to no pantheon (guards, camps and wandering monsters). Use earthy, natural colours — browns, greys, weathered bronze, old gold — with no pantheon symbols. Only the Centaur has a board card (on the Greek board).

**085 · Brigand** — Neutral, tier 1, base form · `creature.neutral.brigand.base`

* Design: no board card — design it from the description, in the board’s style.
* Looks: A ragged fighter with a hooded cloak, a short spear and a mismatched shield.
* What it is: Line infantry (neutral) — Road robbers with boar-spears and stolen shields. Quick to hire, quick to run. Occupies 1 hex (person-sized or smaller).
* Lore: _Where kingdoms quarrel, roads go unwatched. Brigands are deserters, debtors and the hungry, holding a ford or a pass until someone pays._
* Pose for the reference views: Standing upright, facing straight ahead, in a relaxed **A-pose**: feet about shoulder-width apart, legs straight, arms held away from the body (about 40° below horizontal), nothing crossing in front of the torso or face. If it carries a weapon, it is held in the right hand, pointing down and outward; if it has a shield, it is strapped on the left forearm, turned outward so it does not cover the body. Head level, eyes forward, mouth closed.
* Files: `creature.neutral.brigand.base.ref.threequarter.png`, `creature.neutral.brigand.base.ref.front.png`, `creature.neutral.brigand.base.ref.side.png`, `creature.neutral.brigand.base.ref.top.png` → `assets-source/creatures/reference/`; `creature.neutral.brigand.base.portrait.png` → `assets-source/icons/final/`

**086 · Brigand Cutthroat** — Neutral, tier 1, upgraded form · `creature.neutral.brigand.upgraded`

* Design: no board card — design it from the description, in the board’s style.
* Looks: A lean outlaw in a dark scarf with a notched spear and a dented round shield.
* What it is: Line infantry (neutral) — Seasoned outlaws who have learned which caravans fight back. Occupies 1 hex (person-sized or smaller).
* Lore: _Cutthroats are the brigands who lived long enough to choose their ambushes._
* Upgrade of **Brigand**: same anatomy, proportions, silhouette and pose as Brigand (so one skeleton fits both); it may be up to 10 % bigger. Change armour, ornament, colour, markings and glow as described, and add parts (wings, more tails or heads) only where the description names them — keep the body plan.
* Pose for the reference views: Standing upright, facing straight ahead, in a relaxed **A-pose**: feet about shoulder-width apart, legs straight, arms held away from the body (about 40° below horizontal), nothing crossing in front of the torso or face. If it carries a weapon, it is held in the right hand, pointing down and outward; if it has a shield, it is strapped on the left forearm, turned outward so it does not cover the body. Head level, eyes forward, mouth closed.
* Files: `creature.neutral.brigand.upgraded.ref.threequarter.png`, `creature.neutral.brigand.upgraded.ref.front.png`, `creature.neutral.brigand.upgraded.ref.side.png`, `creature.neutral.brigand.upgraded.ref.top.png` → `assets-source/creatures/reference/`; `creature.neutral.brigand.upgraded.portrait.png` → `assets-source/icons/final/`

**087 · Hill Slinger** — Neutral, tier 2, base form · `creature.neutral.hill_slinger.base`

* Design: no board card — design it from the description, in the board’s style.
* Looks: A shepherd in a wool cloak whirling a leather sling, a pouch of stones at the belt.
* What it is: Short-range shooters (neutral) — Shepherds who drive off wolves with a sling. Short range, steady aim. Occupies 1 hex (person-sized or smaller); shoots.
* Lore: _In the hill country every child learns the sling before the plough: wolves do not wait for a soldier. The flocks are thin in winter, and a war band pays in silver._
* Pose for the reference views: Relaxed **A-pose**; the sling hanging loose from the right hand (not whirling), the stone pouch at the belt.
* Files: `creature.neutral.hill_slinger.base.ref.threequarter.png`, `creature.neutral.hill_slinger.base.ref.front.png`, `creature.neutral.hill_slinger.base.ref.side.png`, `creature.neutral.hill_slinger.base.ref.top.png` → `assets-source/creatures/reference/`; `creature.neutral.hill_slinger.base.portrait.png` → `assets-source/icons/final/`

**088 · Sling Master** — Neutral, tier 2, upgraded form · `creature.neutral.hill_slinger.upgraded`

* Design: no board card — design it from the description, in the board’s style.
* Looks: A slinger with a braided double sling and a bag of lead shot.
* What it is: Short-range shooters (neutral) — Hill folk who cast shaped lead bullets farther and harder than any stone. Occupies 1 hex (person-sized or smaller); shoots.
* Lore: _Sling Masters cast shaped lead bullets that fly farther than stones and land harder._
* Upgrade of **Hill Slinger**: same anatomy, proportions, silhouette and pose as Hill Slinger (so one skeleton fits both); it may be up to 10 % bigger. Change armour, ornament, colour, markings and glow as described, and add parts (wings, more tails or heads) only where the description names them — keep the body plan.
* Pose for the reference views: Relaxed **A-pose**; the double sling hanging loose from the right hand (not whirling), the shot bag at the belt.
* Files: `creature.neutral.hill_slinger.upgraded.ref.threequarter.png`, `creature.neutral.hill_slinger.upgraded.ref.front.png`, `creature.neutral.hill_slinger.upgraded.ref.side.png`, `creature.neutral.hill_slinger.upgraded.ref.top.png` → `assets-source/creatures/reference/`; `creature.neutral.hill_slinger.upgraded.portrait.png` → `assets-source/icons/final/`

**089 · Wild Boar** — Neutral, tier 2, base form · `creature.neutral.wild_boar.base`

* Design: no board card — design it from the description, in the board’s style.
* Looks: A bristling dark boar with curved tusks, head lowered to charge.
* What it is: Charging beasts (neutral) — Forest boars that answer any intruder with a running charge. Occupies 1 hex (person-sized or smaller); charges.
* Lore: _The oak woods belong to the boars. A herd defends its ground with a running charge, and a sounder can scatter a column of spearmen._
* Pose for the reference views: Standing **square on all four legs**, legs straight and slightly apart so every leg is visible from the side, head level and looking forward, mouth closed or slightly open, tail straight out behind (not curled over the back).
* Files: `creature.neutral.wild_boar.base.ref.threequarter.png`, `creature.neutral.wild_boar.base.ref.front.png`, `creature.neutral.wild_boar.base.ref.side.png`, `creature.neutral.wild_boar.base.ref.top.png` → `assets-source/creatures/reference/`; `creature.neutral.wild_boar.base.portrait.png` → `assets-source/icons/final/`

**090 · Great Tusked Boar** — Neutral, tier 2, upgraded form · `creature.neutral.wild_boar.upgraded`

* Design: no board card — design it from the description, in the board’s style.
* Looks: A huge scarred boar with long ivory tusks and a ridge of grey bristles.
* What it is: Charging beasts (neutral) — Old boars as heavy as a pony, scarred by every hunt that failed. Occupies 1 hex (person-sized or smaller); charges.
* Lore: _The great tuskers are old boars that have outlived every hunt sent for them._
* Upgrade of **Wild Boar**: same anatomy, proportions, silhouette and pose as Wild Boar (so one skeleton fits both); it may be up to 10 % bigger. Change armour, ornament, colour, markings and glow as described, and add parts (wings, more tails or heads) only where the description names them — keep the body plan.
* Pose for the reference views: Standing **square on all four legs**, legs straight and slightly apart so every leg is visible from the side, head level and looking forward, mouth closed or slightly open, tail straight out behind (not curled over the back).
* Files: `creature.neutral.wild_boar.upgraded.ref.threequarter.png`, `creature.neutral.wild_boar.upgraded.ref.front.png`, `creature.neutral.wild_boar.upgraded.ref.side.png`, `creature.neutral.wild_boar.upgraded.ref.top.png` → `assets-source/creatures/reference/`; `creature.neutral.wild_boar.upgraded.portrait.png` → `assets-source/icons/final/`

**091 · Centaur** — Neutral, tier 3, base form · `creature.neutral.centaur.base`

* Design: the Greek board’s **Centaur** card (Level 3, left) — but holding a spear, never a bow.
* Looks: A centaur with a chestnut coat, simple chest protection and a melee spear.
* What it is: Fast ground melee (neutral) — Grove-dwelling spear fighters bound by old boundary agreements. Not archers. Occupies 2 hexes (large — horse-sized or bigger).
* Lore: _The grove's covenant is written on neither parchment nor stone. Its terms are paths left open, springs left clean, and warnings answered before smoke reaches the canopy._
* Pose for the reference views: Horse body standing **square on all four legs**; the human torso upright, arms in a relaxed A-pose (about 40° below horizontal), spear in the right hand pointing down and outward. Head level, eyes forward.
* Files: `creature.neutral.centaur.base.ref.threequarter.png`, `creature.neutral.centaur.base.ref.front.png`, `creature.neutral.centaur.base.ref.side.png`, `creature.neutral.centaur.base.ref.top.png` → `assets-source/creatures/reference/`; `creature.neutral.centaur.base.portrait.png` → `assets-source/icons/final/`

**092 · Centaur Sentinel** — Neutral, tier 3, upgraded form · `creature.neutral.centaur.upgraded`

* Design: the Greek board’s **Noble Centaur** card (Level 3, right) — but holding a spear, never a bow.
* Looks: A centaur with foreleg protection, a tied crest and a reinforced spearhead.
* What it is: Fast ground melee (neutral) — Seasoned grove guardians who lead the first response on old boundary routes. Occupies 2 hexes (large — horse-sized or bigger).
* Lore: _Sentinels know the old boundary routes and lead the first response when a covenant’s roads are threatened._
* Upgrade of **Centaur**: same anatomy, proportions, silhouette and pose as Centaur (so one skeleton fits both); it may be up to 10 % bigger. Change armour, ornament, colour, markings and glow as described, and add parts (wings, more tails or heads) only where the description names them — keep the body plan.
* Pose for the reference views: Horse body standing **square on all four legs**; the human torso upright, arms in a relaxed A-pose (about 40° below horizontal), spear in the right hand pointing down and outward. Head level, eyes forward.
* Files: `creature.neutral.centaur.upgraded.ref.threequarter.png`, `creature.neutral.centaur.upgraded.ref.front.png`, `creature.neutral.centaur.upgraded.ref.side.png`, `creature.neutral.centaur.upgraded.ref.top.png` → `assets-source/creatures/reference/`; `creature.neutral.centaur.upgraded.portrait.png` → `assets-source/icons/final/`

**093 · Clay Golem** — Neutral, tier 3, base form · `creature.neutral.clay_golem.base`

* Design: no board card — design it from the description, in the board’s style.
* Looks: A heavy figure of red fired clay with a blank face and a sigil pressed into its chest.
* What it is: Slow guardians (neutral) — Fired-clay guardians that keep the last order they were given. Slow, tireless, fearless. Occupies 1 hex (person-sized or smaller); never loses heart.
* Lore: _Some forgotten workshop pressed a sigil into wet clay and fired it in a kiln. The figures still keep the last order they were given — guard the door — long after the door has fallen._
* Pose for the reference views: Standing upright, facing straight ahead, in a relaxed **A-pose**: feet about shoulder-width apart, legs straight, arms held away from the body (about 40° below horizontal), nothing crossing in front of the torso or face. If it carries a weapon, it is held in the right hand, pointing down and outward; if it has a shield, it is strapped on the left forearm, turned outward so it does not cover the body. Head level, eyes forward, mouth closed.
* Files: `creature.neutral.clay_golem.base.ref.threequarter.png`, `creature.neutral.clay_golem.base.ref.front.png`, `creature.neutral.clay_golem.base.ref.side.png`, `creature.neutral.clay_golem.base.ref.top.png` → `assets-source/creatures/reference/`; `creature.neutral.clay_golem.base.portrait.png` → `assets-source/icons/final/`

**094 · Bronze Golem** — Neutral, tier 3, upgraded form · `creature.neutral.clay_golem.upgraded`

* Design: no board card — design it from the description, in the board’s style.
* Looks: A clay golem plated in green-patinated bronze, with riveted shoulders.
* What it is: Slow guardians (neutral) — Golems sheathed in bronze plates; a charge breaks against them. Occupies 1 hex (person-sized or smaller); never loses heart, braces against charges.
* Lore: _Bronze Golems were sheathed by a later smith who wanted his treasury safe from charges._
* Upgrade of **Clay Golem**: same anatomy, proportions, silhouette and pose as Clay Golem (so one skeleton fits both); it may be up to 10 % bigger. Change armour, ornament, colour, markings and glow as described, and add parts (wings, more tails or heads) only where the description names them — keep the body plan.
* Pose for the reference views: Standing upright, facing straight ahead, in a relaxed **A-pose**: feet about shoulder-width apart, legs straight, arms held away from the body (about 40° below horizontal), nothing crossing in front of the torso or face. If it carries a weapon, it is held in the right hand, pointing down and outward; if it has a shield, it is strapped on the left forearm, turned outward so it does not cover the body. Head level, eyes forward, mouth closed.
* Files: `creature.neutral.clay_golem.upgraded.ref.threequarter.png`, `creature.neutral.clay_golem.upgraded.ref.front.png`, `creature.neutral.clay_golem.upgraded.ref.side.png`, `creature.neutral.clay_golem.upgraded.ref.top.png` → `assets-source/creatures/reference/`; `creature.neutral.clay_golem.upgraded.portrait.png` → `assets-source/icons/final/`

**095 · Wyvern** — Neutral, tier 4, base form · `creature.neutral.wyvern.base`

* Design: no board card — design it from the description, in the board’s style.
* Looks: A lean two-legged winged dragon with leathery wings and a barbed tail.
* What it is: Flying hunters (neutral) — Two-legged winged drakes of the cliffs; they drop on prey from above. Occupies 2 hexes (large — horse-sized or bigger); flies.
* Lore: _Wyverns nest on sea cliffs and quarry walls. They hunt goats, sheep and the occasional shepherd, and they do not share a sky with griffins._
* Pose for the reference views: Standing on its **two legs**, body level, **wings half-spread** to the sides and slightly back, tail straight out behind, head forward.
* Files: `creature.neutral.wyvern.base.ref.threequarter.png`, `creature.neutral.wyvern.base.ref.front.png`, `creature.neutral.wyvern.base.ref.side.png`, `creature.neutral.wyvern.base.ref.top.png` → `assets-source/creatures/reference/`; `creature.neutral.wyvern.base.portrait.png` → `assets-source/icons/final/`

**096 · Wyvern Matriarch** — Neutral, tier 4, upgraded form · `creature.neutral.wyvern.upgraded`

* Design: no board card — design it from the description, in the board’s style.
* Looks: A larger wyvern with a frilled crest and torn, battle-scarred wings.
* What it is: Flying hunters (neutral) — Nest-mothers that turn on every attacker, twice if they must. Occupies 2 hexes (large — horse-sized or bigger); flies, answers two attacks a round.
* Lore: _Matriarchs guard the egg ledges and answer every attack on the nest._
* Upgrade of **Wyvern**: same anatomy, proportions, silhouette and pose as Wyvern (so one skeleton fits both); it may be up to 10 % bigger. Change armour, ornament, colour, markings and glow as described, and add parts (wings, more tails or heads) only where the description names them — keep the body plan.
* Pose for the reference views: Standing on its **two legs**, body level, **wings half-spread** to the sides and slightly back, tail straight out behind, head forward.
* Files: `creature.neutral.wyvern.upgraded.ref.threequarter.png`, `creature.neutral.wyvern.upgraded.ref.front.png`, `creature.neutral.wyvern.upgraded.ref.side.png`, `creature.neutral.wyvern.upgraded.ref.top.png` → `assets-source/creatures/reference/`; `creature.neutral.wyvern.upgraded.portrait.png` → `assets-source/icons/final/`

**097 · Ogre** — Neutral, tier 5, base form · `creature.neutral.ogre.base`

* Design: no board card — design it from the description, in the board’s style.
* Looks: A towering brute in hides with a knotted club over one shoulder.
* What it is: Brutes (neutral) — Hulking hill brutes with tree-trunk clubs. They fight for food and for gold. Occupies 2 hexes (large — horse-sized or bigger).
* Lore: _Ogres keep to the high valleys and come down when the herds fail. They fight for whoever feeds them and walk away when the meat runs out._
* Pose for the reference views: Standing upright in a relaxed A-pose, the club held low in the right hand, away from the body (not over the shoulder).
* Files: `creature.neutral.ogre.base.ref.threequarter.png`, `creature.neutral.ogre.base.ref.front.png`, `creature.neutral.ogre.base.ref.side.png`, `creature.neutral.ogre.base.ref.top.png` → `assets-source/creatures/reference/`; `creature.neutral.ogre.base.portrait.png` → `assets-source/icons/final/`

**098 · Ogre Chieftain** — Neutral, tier 5, upgraded form · `creature.neutral.ogre.upgraded`

* Design: no board card — design it from the description, in the board’s style.
* Looks: A scarred ogre wearing a crown of bent iron and a cloak of bear fur.
* What it is: Brutes (neutral) — Ogres who rule a valley by beating every challenger; they hit back twice. Occupies 2 hexes (large — horse-sized or bigger); answers two attacks a round.
* Upgrade of **Ogre**: same anatomy, proportions, silhouette and pose as Ogre (so one skeleton fits both); it may be up to 10 % bigger. Change armour, ornament, colour, markings and glow as described, and add parts (wings, more tails or heads) only where the description names them — keep the body plan.
* Pose for the reference views: Standing upright, facing straight ahead, in a relaxed **A-pose**: feet about shoulder-width apart, legs straight, arms held away from the body (about 40° below horizontal), nothing crossing in front of the torso or face. If it carries a weapon, it is held in the right hand, pointing down and outward; if it has a shield, it is strapped on the left forearm, turned outward so it does not cover the body. Head level, eyes forward, mouth closed.
* Files: `creature.neutral.ogre.upgraded.ref.threequarter.png`, `creature.neutral.ogre.upgraded.ref.front.png`, `creature.neutral.ogre.upgraded.ref.side.png`, `creature.neutral.ogre.upgraded.ref.top.png` → `assets-source/creatures/reference/`; `creature.neutral.ogre.upgraded.portrait.png` → `assets-source/icons/final/`

**099 · Basilisk** — Neutral, tier 6, base form · `creature.neutral.basilisk.base`

* Design: no board card — design it from the description, in the board’s style.
* Looks: A great scaled serpent with a crest like a crown and pale, staring eyes.
* What it is: Armoured serpents (neutral) — Crowned desert serpents with plated hides. Their stare is legend; their bite is real. Occupies 2 hexes (large — horse-sized or bigger); answers two attacks a round.
* Lore: _The stories say a basilisk kills with a look. The truth is plainer: its hide turns blades and its bite is enough._
* Pose for the reference views: Long scaled body laid in a wide, shallow S-curve that never crosses itself; if it has legs, all planted; head raised and looking forward.
* Files: `creature.neutral.basilisk.base.ref.threequarter.png`, `creature.neutral.basilisk.base.ref.front.png`, `creature.neutral.basilisk.base.ref.side.png`, `creature.neutral.basilisk.base.ref.top.png` → `assets-source/creatures/reference/`; `creature.neutral.basilisk.base.portrait.png` → `assets-source/icons/final/`

**100 · Greater Basilisk** — Neutral, tier 6, upgraded form · `creature.neutral.basilisk.upgraded`

* Design: no board card — design it from the description, in the board’s style.
* Looks: A larger basilisk with stone-grey scales and a ring of horns around its crown.
* What it is: Armoured serpents (neutral) — Ancient basilisks whose hides turn spears; charges stall in front of them. Occupies 2 hexes (large — horse-sized or bigger); answers two attacks a round, braces against charges.
* Lore: _The greater basilisks are old enough that spears break on them and charges stall._
* Upgrade of **Basilisk**: same anatomy, proportions, silhouette and pose as Basilisk (so one skeleton fits both); it may be up to 10 % bigger. Change armour, ornament, colour, markings and glow as described, and add parts (wings, more tails or heads) only where the description names them — keep the body plan.
* Pose for the reference views: Long scaled body laid in a wide, shallow S-curve that never crosses itself; if it has legs, all planted; head raised, horn ring fully visible.
* Files: `creature.neutral.basilisk.upgraded.ref.threequarter.png`, `creature.neutral.basilisk.upgraded.ref.front.png`, `creature.neutral.basilisk.upgraded.ref.side.png`, `creature.neutral.basilisk.upgraded.ref.top.png` → `assets-source/creatures/reference/`; `creature.neutral.basilisk.upgraded.portrait.png` → `assets-source/icons/final/`

**101 · Elder Drake** — Neutral, tier 7, base form · `creature.neutral.elder_drake.base`

* Design: no board card — design it from the description, in the board’s style.
* Looks: A massive four-legged dragon with bronze scales and folded wings over a heap of coins.
* What it is: Ancient dragons (neutral) — Old dragons that sleep on hoards older than any kingdom. Few heroes wake one twice. Occupies 2 hexes (large — horse-sized or bigger); flies, answers two attacks a round.
* Lore: _Elder Drakes sleep on gold that was minted by kingdoms nobody remembers. A drake that wakes takes a season to sleep again, and the country around it burns in the meantime._
* Pose for the reference views: Standing **square on all four legs** on flat ground (no coins or hoard), head level, **wings half-spread** to the sides, tail straight out behind.
* Files: `creature.neutral.elder_drake.base.ref.threequarter.png`, `creature.neutral.elder_drake.base.ref.front.png`, `creature.neutral.elder_drake.base.ref.side.png`, `creature.neutral.elder_drake.base.ref.top.png` → `assets-source/creatures/reference/`; `creature.neutral.elder_drake.base.portrait.png` → `assets-source/icons/final/`

**102 · Ancient Drake** — Neutral, tier 7, upgraded form · `creature.neutral.elder_drake.upgraded`

* Design: no board card — design it from the description, in the board’s style.
* Looks: An immense dragon with horn-crowned head and scales dulled to dark gold by age.
* What it is: Ancient dragons (neutral) — The oldest drakes; every blow against them is answered. Occupies 2 hexes (large — horse-sized or bigger); flies, answers every attack.
* Lore: _The ancient ones answer every blow; no hero has struck one twice unanswered._
* Upgrade of **Elder Drake**: same anatomy, proportions, silhouette and pose as Elder Drake (so one skeleton fits both); it may be up to 10 % bigger. Change armour, ornament, colour, markings and glow as described, and add parts (wings, more tails or heads) only where the description names them — keep the body plan.
* Pose for the reference views: Standing **square on all four legs** on flat ground, head level, **wings half-spread** to the sides, tail straight out behind.
* Files: `creature.neutral.elder_drake.upgraded.ref.threequarter.png`, `creature.neutral.elder_drake.upgraded.ref.front.png`, `creature.neutral.elder_drake.upgraded.ref.side.png`, `creature.neutral.elder_drake.upgraded.ref.top.png` → `assets-source/creatures/reference/`; `creature.neutral.elder_drake.upgraded.portrait.png` → `assets-source/icons/final/`

---

## 8. Delivery checklist (510 files)

Reference views go into **`assets-source/creatures/reference/`**; portraits
(the lines ending in `.portrait.png`) go into **`assets-source/icons/final/`**.
After delivery the game's own tool (`npm run icons:import`) imports the
portraits; the reference views wait for the 3D step.

```
creature.greek.tier1.base.ref.threequarter.png
creature.greek.tier1.base.ref.front.png
creature.greek.tier1.base.ref.side.png
creature.greek.tier1.base.ref.top.png
creature.greek.tier1.base.portrait.png
creature.greek.tier1.upgraded.ref.threequarter.png
creature.greek.tier1.upgraded.ref.front.png
creature.greek.tier1.upgraded.ref.side.png
creature.greek.tier1.upgraded.ref.top.png
creature.greek.tier1.upgraded.portrait.png
creature.greek.tier2.base.ref.threequarter.png
creature.greek.tier2.base.ref.front.png
creature.greek.tier2.base.ref.side.png
creature.greek.tier2.base.ref.top.png
creature.greek.tier2.base.portrait.png
creature.greek.tier2.upgraded.ref.threequarter.png
creature.greek.tier2.upgraded.ref.front.png
creature.greek.tier2.upgraded.ref.side.png
creature.greek.tier2.upgraded.ref.top.png
creature.greek.tier2.upgraded.portrait.png
creature.greek.tier3.base.ref.threequarter.png
creature.greek.tier3.base.ref.front.png
creature.greek.tier3.base.ref.side.png
creature.greek.tier3.base.ref.top.png
creature.greek.tier3.base.portrait.png
creature.greek.tier3.upgraded.ref.threequarter.png
creature.greek.tier3.upgraded.ref.front.png
creature.greek.tier3.upgraded.ref.side.png
creature.greek.tier3.upgraded.ref.top.png
creature.greek.tier3.upgraded.portrait.png
creature.greek.tier4.base.ref.threequarter.png
creature.greek.tier4.base.ref.front.png
creature.greek.tier4.base.ref.side.png
creature.greek.tier4.base.ref.top.png
creature.greek.tier4.base.portrait.png
creature.greek.tier4.upgraded.ref.threequarter.png
creature.greek.tier4.upgraded.ref.front.png
creature.greek.tier4.upgraded.ref.side.png
creature.greek.tier4.upgraded.ref.top.png
creature.greek.tier4.upgraded.portrait.png
creature.greek.tier5.base.ref.threequarter.png
creature.greek.tier5.base.ref.front.png
creature.greek.tier5.base.ref.side.png
creature.greek.tier5.base.ref.top.png
creature.greek.tier5.base.portrait.png
creature.greek.tier5.upgraded.ref.threequarter.png
creature.greek.tier5.upgraded.ref.front.png
creature.greek.tier5.upgraded.ref.side.png
creature.greek.tier5.upgraded.ref.top.png
creature.greek.tier5.upgraded.portrait.png
creature.greek.tier6.base.ref.threequarter.png
creature.greek.tier6.base.ref.front.png
creature.greek.tier6.base.ref.side.png
creature.greek.tier6.base.ref.top.png
creature.greek.tier6.base.portrait.png
creature.greek.tier6.upgraded.ref.threequarter.png
creature.greek.tier6.upgraded.ref.front.png
creature.greek.tier6.upgraded.ref.side.png
creature.greek.tier6.upgraded.ref.top.png
creature.greek.tier6.upgraded.portrait.png
creature.greek.tier7.base.ref.threequarter.png
creature.greek.tier7.base.ref.front.png
creature.greek.tier7.base.ref.side.png
creature.greek.tier7.base.ref.top.png
creature.greek.tier7.base.portrait.png
creature.greek.tier7.upgraded.ref.threequarter.png
creature.greek.tier7.upgraded.ref.front.png
creature.greek.tier7.upgraded.ref.side.png
creature.greek.tier7.upgraded.ref.top.png
creature.greek.tier7.upgraded.portrait.png
creature.norse.tier1.base.ref.threequarter.png
creature.norse.tier1.base.ref.front.png
creature.norse.tier1.base.ref.side.png
creature.norse.tier1.base.ref.top.png
creature.norse.tier1.base.portrait.png
creature.norse.tier1.upgraded.ref.threequarter.png
creature.norse.tier1.upgraded.ref.front.png
creature.norse.tier1.upgraded.ref.side.png
creature.norse.tier1.upgraded.ref.top.png
creature.norse.tier1.upgraded.portrait.png
creature.norse.tier2.base.ref.threequarter.png
creature.norse.tier2.base.ref.front.png
creature.norse.tier2.base.ref.side.png
creature.norse.tier2.base.ref.top.png
creature.norse.tier2.base.portrait.png
creature.norse.tier2.upgraded.ref.threequarter.png
creature.norse.tier2.upgraded.ref.front.png
creature.norse.tier2.upgraded.ref.side.png
creature.norse.tier2.upgraded.ref.top.png
creature.norse.tier2.upgraded.portrait.png
creature.norse.tier3.base.ref.threequarter.png
creature.norse.tier3.base.ref.front.png
creature.norse.tier3.base.ref.side.png
creature.norse.tier3.base.ref.top.png
creature.norse.tier3.base.portrait.png
creature.norse.tier3.upgraded.ref.threequarter.png
creature.norse.tier3.upgraded.ref.front.png
creature.norse.tier3.upgraded.ref.side.png
creature.norse.tier3.upgraded.ref.top.png
creature.norse.tier3.upgraded.portrait.png
creature.norse.tier4.base.ref.threequarter.png
creature.norse.tier4.base.ref.front.png
creature.norse.tier4.base.ref.side.png
creature.norse.tier4.base.ref.top.png
creature.norse.tier4.base.portrait.png
creature.norse.tier4.upgraded.ref.threequarter.png
creature.norse.tier4.upgraded.ref.front.png
creature.norse.tier4.upgraded.ref.side.png
creature.norse.tier4.upgraded.ref.top.png
creature.norse.tier4.upgraded.portrait.png
creature.norse.tier5.base.ref.threequarter.png
creature.norse.tier5.base.ref.front.png
creature.norse.tier5.base.ref.side.png
creature.norse.tier5.base.ref.top.png
creature.norse.tier5.base.portrait.png
creature.norse.tier5.upgraded.ref.threequarter.png
creature.norse.tier5.upgraded.ref.front.png
creature.norse.tier5.upgraded.ref.side.png
creature.norse.tier5.upgraded.ref.top.png
creature.norse.tier5.upgraded.portrait.png
creature.norse.tier6.base.ref.threequarter.png
creature.norse.tier6.base.ref.front.png
creature.norse.tier6.base.ref.side.png
creature.norse.tier6.base.ref.top.png
creature.norse.tier6.base.portrait.png
creature.norse.tier6.upgraded.ref.threequarter.png
creature.norse.tier6.upgraded.ref.front.png
creature.norse.tier6.upgraded.ref.side.png
creature.norse.tier6.upgraded.ref.top.png
creature.norse.tier6.upgraded.portrait.png
creature.norse.tier7.base.ref.threequarter.png
creature.norse.tier7.base.ref.front.png
creature.norse.tier7.base.ref.side.png
creature.norse.tier7.base.ref.top.png
creature.norse.tier7.base.portrait.png
creature.norse.tier7.upgraded.ref.threequarter.png
creature.norse.tier7.upgraded.ref.front.png
creature.norse.tier7.upgraded.ref.side.png
creature.norse.tier7.upgraded.ref.top.png
creature.norse.tier7.upgraded.portrait.png
creature.egyptian.tier1.base.ref.threequarter.png
creature.egyptian.tier1.base.ref.front.png
creature.egyptian.tier1.base.ref.side.png
creature.egyptian.tier1.base.ref.top.png
creature.egyptian.tier1.base.portrait.png
creature.egyptian.tier1.upgraded.ref.threequarter.png
creature.egyptian.tier1.upgraded.ref.front.png
creature.egyptian.tier1.upgraded.ref.side.png
creature.egyptian.tier1.upgraded.ref.top.png
creature.egyptian.tier1.upgraded.portrait.png
creature.egyptian.tier2.base.ref.threequarter.png
creature.egyptian.tier2.base.ref.front.png
creature.egyptian.tier2.base.ref.side.png
creature.egyptian.tier2.base.ref.top.png
creature.egyptian.tier2.base.portrait.png
creature.egyptian.tier2.upgraded.ref.threequarter.png
creature.egyptian.tier2.upgraded.ref.front.png
creature.egyptian.tier2.upgraded.ref.side.png
creature.egyptian.tier2.upgraded.ref.top.png
creature.egyptian.tier2.upgraded.portrait.png
creature.egyptian.tier3.base.ref.threequarter.png
creature.egyptian.tier3.base.ref.front.png
creature.egyptian.tier3.base.ref.side.png
creature.egyptian.tier3.base.ref.top.png
creature.egyptian.tier3.base.portrait.png
creature.egyptian.tier3.upgraded.ref.threequarter.png
creature.egyptian.tier3.upgraded.ref.front.png
creature.egyptian.tier3.upgraded.ref.side.png
creature.egyptian.tier3.upgraded.ref.top.png
creature.egyptian.tier3.upgraded.portrait.png
creature.egyptian.tier4.base.ref.threequarter.png
creature.egyptian.tier4.base.ref.front.png
creature.egyptian.tier4.base.ref.side.png
creature.egyptian.tier4.base.ref.top.png
creature.egyptian.tier4.base.portrait.png
creature.egyptian.tier4.upgraded.ref.threequarter.png
creature.egyptian.tier4.upgraded.ref.front.png
creature.egyptian.tier4.upgraded.ref.side.png
creature.egyptian.tier4.upgraded.ref.top.png
creature.egyptian.tier4.upgraded.portrait.png
creature.egyptian.tier5.base.ref.threequarter.png
creature.egyptian.tier5.base.ref.front.png
creature.egyptian.tier5.base.ref.side.png
creature.egyptian.tier5.base.ref.top.png
creature.egyptian.tier5.base.portrait.png
creature.egyptian.tier5.upgraded.ref.threequarter.png
creature.egyptian.tier5.upgraded.ref.front.png
creature.egyptian.tier5.upgraded.ref.side.png
creature.egyptian.tier5.upgraded.ref.top.png
creature.egyptian.tier5.upgraded.portrait.png
creature.egyptian.tier6.base.ref.threequarter.png
creature.egyptian.tier6.base.ref.front.png
creature.egyptian.tier6.base.ref.side.png
creature.egyptian.tier6.base.ref.top.png
creature.egyptian.tier6.base.portrait.png
creature.egyptian.tier6.upgraded.ref.threequarter.png
creature.egyptian.tier6.upgraded.ref.front.png
creature.egyptian.tier6.upgraded.ref.side.png
creature.egyptian.tier6.upgraded.ref.top.png
creature.egyptian.tier6.upgraded.portrait.png
creature.egyptian.tier7.base.ref.threequarter.png
creature.egyptian.tier7.base.ref.front.png
creature.egyptian.tier7.base.ref.side.png
creature.egyptian.tier7.base.ref.top.png
creature.egyptian.tier7.base.portrait.png
creature.egyptian.tier7.upgraded.ref.threequarter.png
creature.egyptian.tier7.upgraded.ref.front.png
creature.egyptian.tier7.upgraded.ref.side.png
creature.egyptian.tier7.upgraded.ref.top.png
creature.egyptian.tier7.upgraded.portrait.png
creature.japanese.tier1.base.ref.threequarter.png
creature.japanese.tier1.base.ref.front.png
creature.japanese.tier1.base.ref.side.png
creature.japanese.tier1.base.ref.top.png
creature.japanese.tier1.base.portrait.png
creature.japanese.tier1.upgraded.ref.threequarter.png
creature.japanese.tier1.upgraded.ref.front.png
creature.japanese.tier1.upgraded.ref.side.png
creature.japanese.tier1.upgraded.ref.top.png
creature.japanese.tier1.upgraded.portrait.png
creature.japanese.tier2.base.ref.threequarter.png
creature.japanese.tier2.base.ref.front.png
creature.japanese.tier2.base.ref.side.png
creature.japanese.tier2.base.ref.top.png
creature.japanese.tier2.base.portrait.png
creature.japanese.tier2.upgraded.ref.threequarter.png
creature.japanese.tier2.upgraded.ref.front.png
creature.japanese.tier2.upgraded.ref.side.png
creature.japanese.tier2.upgraded.ref.top.png
creature.japanese.tier2.upgraded.portrait.png
creature.japanese.tier3.base.ref.threequarter.png
creature.japanese.tier3.base.ref.front.png
creature.japanese.tier3.base.ref.side.png
creature.japanese.tier3.base.ref.top.png
creature.japanese.tier3.base.portrait.png
creature.japanese.tier3.upgraded.ref.threequarter.png
creature.japanese.tier3.upgraded.ref.front.png
creature.japanese.tier3.upgraded.ref.side.png
creature.japanese.tier3.upgraded.ref.top.png
creature.japanese.tier3.upgraded.portrait.png
creature.japanese.tier4.base.ref.threequarter.png
creature.japanese.tier4.base.ref.front.png
creature.japanese.tier4.base.ref.side.png
creature.japanese.tier4.base.ref.top.png
creature.japanese.tier4.base.portrait.png
creature.japanese.tier4.upgraded.ref.threequarter.png
creature.japanese.tier4.upgraded.ref.front.png
creature.japanese.tier4.upgraded.ref.side.png
creature.japanese.tier4.upgraded.ref.top.png
creature.japanese.tier4.upgraded.portrait.png
creature.japanese.tier5.base.ref.threequarter.png
creature.japanese.tier5.base.ref.front.png
creature.japanese.tier5.base.ref.side.png
creature.japanese.tier5.base.ref.top.png
creature.japanese.tier5.base.portrait.png
creature.japanese.tier5.upgraded.ref.threequarter.png
creature.japanese.tier5.upgraded.ref.front.png
creature.japanese.tier5.upgraded.ref.side.png
creature.japanese.tier5.upgraded.ref.top.png
creature.japanese.tier5.upgraded.portrait.png
creature.japanese.tier6.base.ref.threequarter.png
creature.japanese.tier6.base.ref.front.png
creature.japanese.tier6.base.ref.side.png
creature.japanese.tier6.base.ref.top.png
creature.japanese.tier6.base.portrait.png
creature.japanese.tier6.upgraded.ref.threequarter.png
creature.japanese.tier6.upgraded.ref.front.png
creature.japanese.tier6.upgraded.ref.side.png
creature.japanese.tier6.upgraded.ref.top.png
creature.japanese.tier6.upgraded.portrait.png
creature.japanese.tier7.base.ref.threequarter.png
creature.japanese.tier7.base.ref.front.png
creature.japanese.tier7.base.ref.side.png
creature.japanese.tier7.base.ref.top.png
creature.japanese.tier7.base.portrait.png
creature.japanese.tier7.upgraded.ref.threequarter.png
creature.japanese.tier7.upgraded.ref.front.png
creature.japanese.tier7.upgraded.ref.side.png
creature.japanese.tier7.upgraded.ref.top.png
creature.japanese.tier7.upgraded.portrait.png
creature.celtic.tier1.base.ref.threequarter.png
creature.celtic.tier1.base.ref.front.png
creature.celtic.tier1.base.ref.side.png
creature.celtic.tier1.base.ref.top.png
creature.celtic.tier1.base.portrait.png
creature.celtic.tier1.upgraded.ref.threequarter.png
creature.celtic.tier1.upgraded.ref.front.png
creature.celtic.tier1.upgraded.ref.side.png
creature.celtic.tier1.upgraded.ref.top.png
creature.celtic.tier1.upgraded.portrait.png
creature.celtic.tier2.base.ref.threequarter.png
creature.celtic.tier2.base.ref.front.png
creature.celtic.tier2.base.ref.side.png
creature.celtic.tier2.base.ref.top.png
creature.celtic.tier2.base.portrait.png
creature.celtic.tier2.upgraded.ref.threequarter.png
creature.celtic.tier2.upgraded.ref.front.png
creature.celtic.tier2.upgraded.ref.side.png
creature.celtic.tier2.upgraded.ref.top.png
creature.celtic.tier2.upgraded.portrait.png
creature.celtic.tier3.base.ref.threequarter.png
creature.celtic.tier3.base.ref.front.png
creature.celtic.tier3.base.ref.side.png
creature.celtic.tier3.base.ref.top.png
creature.celtic.tier3.base.portrait.png
creature.celtic.tier3.upgraded.ref.threequarter.png
creature.celtic.tier3.upgraded.ref.front.png
creature.celtic.tier3.upgraded.ref.side.png
creature.celtic.tier3.upgraded.ref.top.png
creature.celtic.tier3.upgraded.portrait.png
creature.celtic.tier4.base.ref.threequarter.png
creature.celtic.tier4.base.ref.front.png
creature.celtic.tier4.base.ref.side.png
creature.celtic.tier4.base.ref.top.png
creature.celtic.tier4.base.portrait.png
creature.celtic.tier4.upgraded.ref.threequarter.png
creature.celtic.tier4.upgraded.ref.front.png
creature.celtic.tier4.upgraded.ref.side.png
creature.celtic.tier4.upgraded.ref.top.png
creature.celtic.tier4.upgraded.portrait.png
creature.celtic.tier5.base.ref.threequarter.png
creature.celtic.tier5.base.ref.front.png
creature.celtic.tier5.base.ref.side.png
creature.celtic.tier5.base.ref.top.png
creature.celtic.tier5.base.portrait.png
creature.celtic.tier5.upgraded.ref.threequarter.png
creature.celtic.tier5.upgraded.ref.front.png
creature.celtic.tier5.upgraded.ref.side.png
creature.celtic.tier5.upgraded.ref.top.png
creature.celtic.tier5.upgraded.portrait.png
creature.celtic.tier6.base.ref.threequarter.png
creature.celtic.tier6.base.ref.front.png
creature.celtic.tier6.base.ref.side.png
creature.celtic.tier6.base.ref.top.png
creature.celtic.tier6.base.portrait.png
creature.celtic.tier6.upgraded.ref.threequarter.png
creature.celtic.tier6.upgraded.ref.front.png
creature.celtic.tier6.upgraded.ref.side.png
creature.celtic.tier6.upgraded.ref.top.png
creature.celtic.tier6.upgraded.portrait.png
creature.celtic.tier7.base.ref.threequarter.png
creature.celtic.tier7.base.ref.front.png
creature.celtic.tier7.base.ref.side.png
creature.celtic.tier7.base.ref.top.png
creature.celtic.tier7.base.portrait.png
creature.celtic.tier7.upgraded.ref.threequarter.png
creature.celtic.tier7.upgraded.ref.front.png
creature.celtic.tier7.upgraded.ref.side.png
creature.celtic.tier7.upgraded.ref.top.png
creature.celtic.tier7.upgraded.portrait.png
creature.mesoamerican.tier1.base.ref.threequarter.png
creature.mesoamerican.tier1.base.ref.front.png
creature.mesoamerican.tier1.base.ref.side.png
creature.mesoamerican.tier1.base.ref.top.png
creature.mesoamerican.tier1.base.portrait.png
creature.mesoamerican.tier1.upgraded.ref.threequarter.png
creature.mesoamerican.tier1.upgraded.ref.front.png
creature.mesoamerican.tier1.upgraded.ref.side.png
creature.mesoamerican.tier1.upgraded.ref.top.png
creature.mesoamerican.tier1.upgraded.portrait.png
creature.mesoamerican.tier2.base.ref.threequarter.png
creature.mesoamerican.tier2.base.ref.front.png
creature.mesoamerican.tier2.base.ref.side.png
creature.mesoamerican.tier2.base.ref.top.png
creature.mesoamerican.tier2.base.portrait.png
creature.mesoamerican.tier2.upgraded.ref.threequarter.png
creature.mesoamerican.tier2.upgraded.ref.front.png
creature.mesoamerican.tier2.upgraded.ref.side.png
creature.mesoamerican.tier2.upgraded.ref.top.png
creature.mesoamerican.tier2.upgraded.portrait.png
creature.mesoamerican.tier3.base.ref.threequarter.png
creature.mesoamerican.tier3.base.ref.front.png
creature.mesoamerican.tier3.base.ref.side.png
creature.mesoamerican.tier3.base.ref.top.png
creature.mesoamerican.tier3.base.portrait.png
creature.mesoamerican.tier3.upgraded.ref.threequarter.png
creature.mesoamerican.tier3.upgraded.ref.front.png
creature.mesoamerican.tier3.upgraded.ref.side.png
creature.mesoamerican.tier3.upgraded.ref.top.png
creature.mesoamerican.tier3.upgraded.portrait.png
creature.mesoamerican.tier4.base.ref.threequarter.png
creature.mesoamerican.tier4.base.ref.front.png
creature.mesoamerican.tier4.base.ref.side.png
creature.mesoamerican.tier4.base.ref.top.png
creature.mesoamerican.tier4.base.portrait.png
creature.mesoamerican.tier4.upgraded.ref.threequarter.png
creature.mesoamerican.tier4.upgraded.ref.front.png
creature.mesoamerican.tier4.upgraded.ref.side.png
creature.mesoamerican.tier4.upgraded.ref.top.png
creature.mesoamerican.tier4.upgraded.portrait.png
creature.mesoamerican.tier5.base.ref.threequarter.png
creature.mesoamerican.tier5.base.ref.front.png
creature.mesoamerican.tier5.base.ref.side.png
creature.mesoamerican.tier5.base.ref.top.png
creature.mesoamerican.tier5.base.portrait.png
creature.mesoamerican.tier5.upgraded.ref.threequarter.png
creature.mesoamerican.tier5.upgraded.ref.front.png
creature.mesoamerican.tier5.upgraded.ref.side.png
creature.mesoamerican.tier5.upgraded.ref.top.png
creature.mesoamerican.tier5.upgraded.portrait.png
creature.mesoamerican.tier6.base.ref.threequarter.png
creature.mesoamerican.tier6.base.ref.front.png
creature.mesoamerican.tier6.base.ref.side.png
creature.mesoamerican.tier6.base.ref.top.png
creature.mesoamerican.tier6.base.portrait.png
creature.mesoamerican.tier6.upgraded.ref.threequarter.png
creature.mesoamerican.tier6.upgraded.ref.front.png
creature.mesoamerican.tier6.upgraded.ref.side.png
creature.mesoamerican.tier6.upgraded.ref.top.png
creature.mesoamerican.tier6.upgraded.portrait.png
creature.mesoamerican.tier7.base.ref.threequarter.png
creature.mesoamerican.tier7.base.ref.front.png
creature.mesoamerican.tier7.base.ref.side.png
creature.mesoamerican.tier7.base.ref.top.png
creature.mesoamerican.tier7.base.portrait.png
creature.mesoamerican.tier7.upgraded.ref.threequarter.png
creature.mesoamerican.tier7.upgraded.ref.front.png
creature.mesoamerican.tier7.upgraded.ref.side.png
creature.mesoamerican.tier7.upgraded.ref.top.png
creature.mesoamerican.tier7.upgraded.portrait.png
creature.neutral.brigand.base.ref.threequarter.png
creature.neutral.brigand.base.ref.front.png
creature.neutral.brigand.base.ref.side.png
creature.neutral.brigand.base.ref.top.png
creature.neutral.brigand.base.portrait.png
creature.neutral.brigand.upgraded.ref.threequarter.png
creature.neutral.brigand.upgraded.ref.front.png
creature.neutral.brigand.upgraded.ref.side.png
creature.neutral.brigand.upgraded.ref.top.png
creature.neutral.brigand.upgraded.portrait.png
creature.neutral.hill_slinger.base.ref.threequarter.png
creature.neutral.hill_slinger.base.ref.front.png
creature.neutral.hill_slinger.base.ref.side.png
creature.neutral.hill_slinger.base.ref.top.png
creature.neutral.hill_slinger.base.portrait.png
creature.neutral.hill_slinger.upgraded.ref.threequarter.png
creature.neutral.hill_slinger.upgraded.ref.front.png
creature.neutral.hill_slinger.upgraded.ref.side.png
creature.neutral.hill_slinger.upgraded.ref.top.png
creature.neutral.hill_slinger.upgraded.portrait.png
creature.neutral.wild_boar.base.ref.threequarter.png
creature.neutral.wild_boar.base.ref.front.png
creature.neutral.wild_boar.base.ref.side.png
creature.neutral.wild_boar.base.ref.top.png
creature.neutral.wild_boar.base.portrait.png
creature.neutral.wild_boar.upgraded.ref.threequarter.png
creature.neutral.wild_boar.upgraded.ref.front.png
creature.neutral.wild_boar.upgraded.ref.side.png
creature.neutral.wild_boar.upgraded.ref.top.png
creature.neutral.wild_boar.upgraded.portrait.png
creature.neutral.centaur.base.ref.threequarter.png
creature.neutral.centaur.base.ref.front.png
creature.neutral.centaur.base.ref.side.png
creature.neutral.centaur.base.ref.top.png
creature.neutral.centaur.base.portrait.png
creature.neutral.centaur.upgraded.ref.threequarter.png
creature.neutral.centaur.upgraded.ref.front.png
creature.neutral.centaur.upgraded.ref.side.png
creature.neutral.centaur.upgraded.ref.top.png
creature.neutral.centaur.upgraded.portrait.png
creature.neutral.clay_golem.base.ref.threequarter.png
creature.neutral.clay_golem.base.ref.front.png
creature.neutral.clay_golem.base.ref.side.png
creature.neutral.clay_golem.base.ref.top.png
creature.neutral.clay_golem.base.portrait.png
creature.neutral.clay_golem.upgraded.ref.threequarter.png
creature.neutral.clay_golem.upgraded.ref.front.png
creature.neutral.clay_golem.upgraded.ref.side.png
creature.neutral.clay_golem.upgraded.ref.top.png
creature.neutral.clay_golem.upgraded.portrait.png
creature.neutral.wyvern.base.ref.threequarter.png
creature.neutral.wyvern.base.ref.front.png
creature.neutral.wyvern.base.ref.side.png
creature.neutral.wyvern.base.ref.top.png
creature.neutral.wyvern.base.portrait.png
creature.neutral.wyvern.upgraded.ref.threequarter.png
creature.neutral.wyvern.upgraded.ref.front.png
creature.neutral.wyvern.upgraded.ref.side.png
creature.neutral.wyvern.upgraded.ref.top.png
creature.neutral.wyvern.upgraded.portrait.png
creature.neutral.ogre.base.ref.threequarter.png
creature.neutral.ogre.base.ref.front.png
creature.neutral.ogre.base.ref.side.png
creature.neutral.ogre.base.ref.top.png
creature.neutral.ogre.base.portrait.png
creature.neutral.ogre.upgraded.ref.threequarter.png
creature.neutral.ogre.upgraded.ref.front.png
creature.neutral.ogre.upgraded.ref.side.png
creature.neutral.ogre.upgraded.ref.top.png
creature.neutral.ogre.upgraded.portrait.png
creature.neutral.basilisk.base.ref.threequarter.png
creature.neutral.basilisk.base.ref.front.png
creature.neutral.basilisk.base.ref.side.png
creature.neutral.basilisk.base.ref.top.png
creature.neutral.basilisk.base.portrait.png
creature.neutral.basilisk.upgraded.ref.threequarter.png
creature.neutral.basilisk.upgraded.ref.front.png
creature.neutral.basilisk.upgraded.ref.side.png
creature.neutral.basilisk.upgraded.ref.top.png
creature.neutral.basilisk.upgraded.portrait.png
creature.neutral.elder_drake.base.ref.threequarter.png
creature.neutral.elder_drake.base.ref.front.png
creature.neutral.elder_drake.base.ref.side.png
creature.neutral.elder_drake.base.ref.top.png
creature.neutral.elder_drake.base.portrait.png
creature.neutral.elder_drake.upgraded.ref.threequarter.png
creature.neutral.elder_drake.upgraded.ref.front.png
creature.neutral.elder_drake.upgraded.ref.side.png
creature.neutral.elder_drake.upgraded.ref.top.png
creature.neutral.elder_drake.upgraded.portrait.png
```

Suggested order: pantheon by pantheon as in section 7, tier 1 to 7, each
family's base form before its upgraded form. Neutral creatures last.
