# Pantheon Realms — Art Brief 18 for GPT-6: THE SILENT ORACLE

_Status: **delivered on 2026-10-14** (all 18 files) and imported the same day (ASSET_PIPELINE.md §18). This document stays as the record of what was asked._

_Written 2026-10-14 from the game itself. **The Silent Oracle** is a new seven-mission Greek campaign that follows The Three Beacons (the tutorial). Its missions, maps, troops, sites and music already exist in the game; what it does not have yet is its **story art**. This brief lists every picture the campaign needs — nothing more. The game already looks for each file by the exact name given here: a delivery is a copy plus two import commands, never a code change. Until then the game shows stand-ins (a drawn card, a generated square portrait, no bust beside the dialogue box)._

## At a glance

| Part | What | Files | Size | Save in |
|---|---|---|---|---|
| A | **Dialogue busts** — four new characters, half-body, shown beside the dialogue box | 4 | 1024 × 1536, **transparent** | `assets-source/art/final/` |
| B | **Square portraits** of the same four (journal, dialogue box, battle header) | 4 | 1024 × 1024 (≥ 256), opaque | `assets-source/icons/final/` |
| C | **Campaign cover** (a reduced copy becomes the campaign's card) | 1 | 2560 × 1440 | `assets-source/art/final/` |
| D | **Mission pictures** (briefing background; a reduced copy becomes the mission card) | 7 | 1920 × 1080 | `assets-source/art/final/` |
| E | **Ending pictures** — one for each of the campaign's two endings | 2 | 2560 × 1440 | `assets-source/art/final/` |

**18 files in all.** Order of work: **A first** (the four faces — check them against the existing Greek busts), then B from the approved busts, then C, D and E.

Nothing else is needed: the map sites, creatures, map heroes, battlefields, siege art, town buildings, music and sounds of this campaign are all already final (see §9).

---

## 1. The story in one page

*Pantheon Realms* is a turn-based fantasy strategy game: heroes lead armies across an adventure map and fight hex battles for the favour of the gods. Its stories are **original fiction in mythology-inspired settings**, not retellings of myths.

**The Three Beacons** (already painted): a storm put out the three signal beacons of the Asterion coast; the strategos **Alexios** relit them and took the great beacon's lens back from **Melas**, a commander who believed one light should rule the whole coast.

**The Silent Oracle** (this brief), a year later: the **Oracle of Kalliste** — a sanctuary on a sacred mountain above the coast, where a spring speaks through its priestess — has fallen silent. Pilgrims come home with empty hands. A high priest, **Theron the Hierophant**, has **sealed the spring with bronze**, locked the Oracle **Myrrine** beside it, and speaks in her name as "the Voice of Kalliste", telling each city what it wants to hear and turning them against one another. His followers wear grey hoods and call themselves **the Hushed**; their sign is **a mouth painted shut**. Melas, beaten on the storm plateau, has taken a walled city (Pyrgos) and sworn to Theron's false Voice.

Alexios climbs the pilgrims' road mission by mission, with **Thaleia** (Asterion's elder councillor) and **Ione** (priestess of the griffins) beside him:

| # | Mission | Where | What happens |
|---|---|---|---|
| 1 | The Pilgrims' Road | Elaia, an olive town on the coast | boars penned on the pilgrims' ford; the Hushed have put out the first waystone |
| 2 | The Bronze Bull | Thymbra, a barley town on a river | a bull of living bronze and its clay men trample the fields around a dark shrine |
| 3 | The Eyrie of Aetos | a mountain town under a griffin eyrie | the griffins' oath was sold for temple silver; win it back |
| 4 | The Hall of Echoes | Halia, a harbour facing islands | two fire-bowls lower a bronze chain across a strait to the hall where the Oracle's words are kept |
| 5 | The Return of Melas | Akte, facing Melas's city of Pyrgos | besiege Pyrgos and break the oath stele the cities swore on |
| 6 | The Labyrinth of Kerata | a high valley | minotaurs penned in their own labyrinth; the mercenary general Doros holds its gate |
| 7 | The Spring of Kalliste | the sacred mountain | two altars open the sacred way; Theron waits over the sealed spring; the last choice |

**The last choice** (two endings): **unseal the spring** — the Oracle speaks again, as she always has — or **leave it sealed** — the cities must decide for themselves, without prophecy.

---

## 2. Rules for every image

1. **One image per file**, named **exactly** as listed (lowercase, dots and underscores, `.png`), PNG, sRGB.
2. **No text of any kind** inside an image: no letters, numbers, readable inscriptions, logos, signatures or watermarks. Where the story has writing (the oath stele, an inscription), paint **abstract decorative marks** that suggest writing without forming letters.
3. **Never enlarge** an image to reach a size: paint at the size or larger and scale down. If the tool's largest image is smaller than a size asked for, deliver its largest native size **in the same proportions** and say so (as for Briefs 14, 15 and 17).
4. **Characters stay the same everywhere.** The four new characters (§4) and the four existing ones (§3) must look the same in every picture they appear in.
5. **Adults only, dignified.** Realistic adult proportions; no nudity; battles without gore.
6. **No real people, no film or game characters, no real religious emblems used as logos.** The Hushed's "mouth painted shut" is an invented sign: a simple, calm mask-mouth with a single horizontal line across closed lips.
7. When the words and the reference images seem to disagree on style, **follow the references.**

### Style (as in every story picture already in the game)

High-detail digital painting, "epic painterly fantasy": visible, controlled brushwork; crisp detail where the eye should go, soft atmosphere elsewhere. **Not** a photograph, 3D render, anime, comic ink or flat vector. Cinematic warm-against-cool light: golden key light, cool blue shadows, god-rays, haze for depth, a rim light that separates figures from the background.

**Greek palette:** royal blue `#1F3F8F`, white marble `#ECE6DA`, gold `#C29A52`, bronze, olive green. Motifs: laurel, olive, the meander (key) border, lightning, the sea, griffins. **The Hushed and Theron** take the Greek palette and **bruise it**: off-white, tarnished gold, ash grey and a cold blue-violet.

---

## 3. References to attach

| # | File (project folder) | Use it for |
|---|---|---|
| R1 | `assets-runtime/art/busts/hero.greek.alexios.bust.webp` | Alexios's exact look; **the format, framing and light of every Part A bust** |
| R2 | `assets-runtime/art/busts/hero.greek.thaleia.bust.webp` | Thaleia's look (she appears in Part D/E pictures) |
| R3 | `assets-runtime/art/busts/hero.greek.ione.bust.webp` | Ione's look |
| R4 | `assets-runtime/art/busts/hero.greek.melas.bust.webp` | Melas's look (mission 5) — a year older, now a city's lord |
| R5 | `assets-runtime/ui/icons/final/hero.greek.alexios.portrait.webp` | **the format of every Part B square portrait** |
| R6 | `assets-runtime/art/covers/campaign.three_beacons.cover.webp` | the composition and finish of the Part C cover |
| R7 | `assets-runtime/art/missions/mission.three_beacons.m01.briefing.webp`, `…m02…`, `…m03…` | the finish of the Part D mission pictures; the Greek coast and towns |
| R8 | `assets-runtime/art/endings/ending.three_beacons.epilogue.webp` | the finish of the Part E endings |
| R9 | `assets-source/ui/backgrounds/opening-greek-landscape.png` | Greek light, colour and marble architecture |
| R10 | `assets-runtime/art/town/town.greek.background.l3.webp` (or any Greek town background) | the architecture of the player's Greek towns |

If only a few can be attached: **R1, R6 and R9**, plus R2–R4 when that character appears.

### Characters who already exist (paint them as in their busts; no new portrait needed)

* **Alexios** (R1) — the hero: about 35, olive skin, short dark curly hair, close-trimmed beard, grey eyes, small scar through the left eyebrow; bronze cuirass with a blue meander border, royal-blue cloak with a flame-shaped gold brooch, Corinthian helmet with a blue crest.
* **Thaleia** (R2) — about 55, silver-streaked braided hair, white chiton with a blue key border, a wax tablet and stylus.
* **Ione** (R3) — about 25, auburn hair with a gold circlet, griffin-feather mantle, olive-wood staff with a bronze griffin head.
* **Melas** (R4) — about 55, gaunt, salt-and-pepper beard, scorched old bronze armour, storm-grey cloak. **No lens now** (Alexios took it); instead he wears a lord's gold-edged grey mantle over the old armour.

---

## 4. Part A — Dialogue busts (4)

**Size:** 1024 × 1536 px, PNG with a **transparent background** (if impossible: a perfectly flat mid-grey `#7F7F7F`, no gradient, no floor, so it can be cut out). **Framing as R1:** waist-up; the top of the head 6–10 % below the top edge; the eyes 22–26 % from the top; cut at the hips by the bottom edge; shoulders about 70 % of the width. **Pose:** body three-quarters toward the **right side of the image**, head a little more toward the viewer. **Light (same as every bust in the game):** warm key light from the upper left, a cool rim light on the right edge, soft fill. Nothing that must read correctly when mirrored (the game may flip a bust to the other side of the dialogue box). Readable silhouette at 160 px tall.

**A1 · `hero.greek.theron.bust.png` — Theron, Hierophant of Kalliste (final opponent)**
* *Who:* the high priest of Kalliste, who sealed the Oracle's spring so that only his voice would be heard. Persuasive, patient, certain he gives people what they need.
* *Look:* man about 60, tall and lean, olive skin, shaven head, a long grey beard trimmed square, pale piercing grey eyes. Layered robes of **off-white and tarnished gold**, a heavy mantle of **cold blue-violet** over one shoulder, a broad collar of gold laurel leaves. A **gold mask** of a calm face with the **mouth painted shut** (one line across closed lips) is pushed up onto his brow like a visor. On a chain at his chest hangs a large **bronze key** (the key to the spring's seal). His right hand is raised, palm out, as if blessing — or silencing.
* *Expression:* a serene, almost kindly smile that does not reach the eyes.
* *Colour:* off-white, tarnished gold, blue-violet.

**A2 · `hero.greek.myrrine.bust.png` — Myrrine, the Oracle of Kalliste**
* *Who:* the priestess through whom the spring speaks; held silent beside it by Theron. She speaks only after he falls, and she decides with Alexios what happens next.
* *Look:* woman about 40, olive skin, long loose black hair with threads of silver, large dark eyes, a little gaunt from captivity but composed. A plain silver diadem holding a long **translucent pale-blue veil** that falls behind her shoulders; a simple white peplos; a sprig of laurel held loosely in one hand. Faint mist and a few drops of water catch the light around her (the spring).
* *Expression:* calm, sorrowful, unafraid; lips closed.
* *Colour:* white, pale blue, silver.

**A3 · `hero.greek.doros.bust.png` — Doros, Polemarch of the Hushed (mission 6)**
* *Who:* a general who lost his command for selling his soldiers' grain, and now sells his spear to the Hierophant; he holds the labyrinth gate.
* *Look:* man about 50, heavy-set, sunburnt olive skin, a nose broken more than once, close-cropped grey hair and short beard. An expensive bronze cuirass whose blue enamel border has been **scratched off**, a dark-grey cloak, a heavy coin purse at his belt; a bronze helmet with a plain black crest under one arm; a long spear upright beside him.
* *Expression:* cynical, contemptuous half-smile.
* *Colour:* bronze, charcoal grey, a little tarnished gold.

**A4 · `hero.greek.phaidon.bust.png` — Phaidon, Warden of the Sacred Way (mission 7)**
* *Who:* the keeper of the road between the altars of dawn and dusk below the Oracle's spring; devoted to the temple, wrong about its master.
* *Look:* man about 35, tall, ascetic, olive skin, shoulder-length black hair tied back, clean-shaven. Temple-guard armour: a white linen corselet with gilded edges and bronze shoulder plates, a white cloak. A tall spear whose head is a small bronze lantern-cage holding a flame. **His left side is lit warm gold, his right side cool silver** (dawn and dusk — keep the usual key light, and add these two coloured accents).
* *Expression:* stern, devout, unsmiling.
* *Colour:* white, bronze, gold and silver accents.

---

## 5. Part B — Square portraits (4)

Paint **the same person as the approved Part A bust**, head and shoulders, in the square format and style of R5: an opaque painted background in the character's colours, warm key light, looking slightly to the side. Square, 1024 × 1024 (at least 256). Attach the bust and R5.

| File | Attach | Who |
|---|---|---|
| `hero.greek.theron.portrait.png` | `hero.greek.theron.bust.png` | Theron |
| `hero.greek.myrrine.portrait.png` | `hero.greek.myrrine.bust.png` | Myrrine |
| `hero.greek.doros.portrait.png` | `hero.greek.doros.bust.png` | Doros |
| `hero.greek.phaidon.portrait.png` | `hero.greek.phaidon.bust.png` | Phaidon |

---

## 6. Part C — Campaign cover (1)

**C1 · `campaign.silent_oracle.cover.png`** — 2560 × 1440 (16:9), full painting.

* **Composition (as R6):** a deep central vista with one strong light, framed left and right by large shapes. **Alexios** (R1) in the **lower-left third**, about 40–50 % of the image height, seen three-quarters from behind, climbing a stone pilgrims' road with his cloak blowing, helmet under his arm. **Leave the top-left quarter calm** (sky, soft cloud) — the game may place the title there. Still reads at 640 × 360: one clear figure, one clear light.
* **Scene:** dusk. The pilgrims' road winds up through olive terraces toward the **sacred mountain of Kalliste**: a white-marble temple precinct on its upper slope, reached by a long **stair (the sacred way) between two altars** — a warm gold flame on the left, a cool silver flame on the right. Under the temple, a cave mouth where a **spring** should flow — **sealed with a great round bronze plate**, a thin cold blue-violet glow at its rim. A few pilgrims with small lamps on the road, waiting. In the clouds above the mountain, **the ghostly, partly transparent half-figure of Theron** (A1) with his sealed-mouth gold mask lowered over his face, one hand raised — the way the god figures loom in the opening paintings. Griffins circle the peak. On the cliff at the **left edge**, a colossal weathered marble statue of a bearded sky-god holding a thunderbolt (the patron, Zeus — a statue, never a living person). Royal-blue banners on a waystone by the road.
* **Mood:** hush and mystery; a road worth climbing.

---

## 7. Part D — Mission pictures (7)

**Size:** 1920 × 1080 (16:9), full painting. **One clear focal point** — the mission's goal — in the **central 60 % of the width and the upper 70 % of the height** (the briefing's dialogue box covers the bottom 30 %; the 640 × 360 card must read at a glance). **Landscape-led**: places, not portraits; named characters appear small, from behind or in profile, matching their busts. Each picture shows **the problem the mission solves** with a hint of hope (a ray of light, an open path). The player's towns follow the Greek town art (R10).

**D1 · `mission.silent_oracle.m01.thumbnail.png` — The Pilgrims' Road** · *coast, early morning*
On the left, the white olive-terraced town of **Elaia** with royal-blue banners, the sea beyond. A pilgrims' road climbs through silver-green olive groves to a **river ford between two huge plane trees**, where wild boars are penned with rough fences. On a rise beyond the ford, a tall stone **waystone** pillar with a bronze fire-bowl on top — **cold, unlit** — with grey-hooded figures standing around it. Far away, under clouds, a white temple high on a mountain (Kalliste). A first ray of sun touches the cold fire-bowl.

**D2 · `mission.silent_oracle.m02.thumbnail.png` — The Bronze Bull** · *river plain, late afternoon*
Golden barley fields **trampled flat** in long furrows. Mid-distance, a **bull of living bronze** — larger than a real bull, its bronze plates glinting, a faint inner glow at the joints — with a few clay men (crude, man-shaped clay figures) walking behind it. On a hill, an old round stone signal tower (as in R7). A stone bridge over the river. Beyond the fields, a small marble **shrine where two springs meet under a plane tree** — dark, unlit. The village of Thymbra small on the near bank.

**D3 · `mission.silent_oracle.m03.thumbnail.png` — The Eyrie of Aetos** · *high mountains, cold clear morning*
Sheer crags crowned with great griffin nests of branches; a few griffins (eagle-headed, lion-bodied, tawny and gold, as in the game) restless on the ledges, others **flying away**. Lower down, the keeper's small stone house with a griffin chick at the door. High pastures with fine horses behind fences, watched by clay men. A rope-and-timber bridge over a deep gorge. On a summit, the **Altar of the Winds** — a stone altar hung with faded ribbons, **unlit**.

**D4 · `mission.silent_oracle.m04.thumbnail.png` — The Hall of Echoes** · *sea and islands, bright haze*
A strait between two rocky headlands, each topped by a great **bronze fire-bowl, cold**. A heavy **bronze chain** stretches across the strait at water level. On the far island, the **Hall of Echoes**: a hall of marble columns and polished bronze walls gleaming in the haze. Raider ships with plain grey sails painted with **the mouth painted shut**; one larger ship patrols between the islands. The harbour of Halia with salt pans in the near foreground.

**D5 · `mission.silent_oracle.m05.thumbnail.png` — The Return of Melas** · *river plain, grey morning*
**Pyrgos**: a walled hill-city of grey stone with **storm-grey banners**, a strong gate and towers. In its square, a tall **oath stele** carved with abstract marks, a cold blue-violet light on it. A river crosses the foreground with **two fords**: clay men hold one, grey-hooded men the other. On the near bank, the player's town of Akte with royal-blue banners. On the walls of Pyrgos, very small, Melas (R4) watching.

**D6 · `mission.silent_oracle.m06.thumbnail.png` — The Labyrinth of Kerata** · *high valley, dusk*
A vast **stone labyrinth** carved into a mountain valley, its walls seen from above at an angle. In its heart, **minotaurs penned behind bronze bars** (as the game's minotaurs: bull-headed giants with heavy axes). On a stone platform, a great **bronze horn** shaped like a bull's horn. At the labyrinth gate, a disciplined host of hoplites under a black-crested general (Doros, small). In the foreground, a minotaur **calf** caught in a hunter's net.

**D7 · `mission.silent_oracle.m07.thumbnail.png` — The Spring of Kalliste** · *the sacred mountain, storm-lit night*
The temple precinct of Kalliste high on the mountain under storm clouds. A long stair — the **sacred way** — climbs between the **Altar of Dawn** (warm gold, left) and the **Altar of Dusk** (silver, right), both **unlit**, to a great **bronze gate**. Above, the temple, its inner hall glowing a cold blue-violet; under it, the **sealed spring** (a round bronze plate in a cave mouth). Wyverns on the crags. A tiny procession of soldiers with royal-blue banners at the foot of the stair.

---

## 8. Part E — Ending pictures (2)

**Size:** 2560 × 1440 (16:9), full painting. Shown during the closing scene; **the dialogue box covers the bottom 25 %**, so keep faces and the key action in the upper 70 %. The two must look **clearly different** (time of day, what happened to the world). Warm, earned, a little bittersweet.

**E1 · `ending.silent_oracle.oracle_speaks.png` — The Oracle speaks again**
* *Ending:* the spring runs and Myrrine speaks again — "only what I hear, and nothing I am paid to say".
* *Scene:* **dawn** inside the cave under the temple: the **bronze seal lies broken** on the floor; clear water runs bright from the spring into a marble basin, sparkling in the first light. **Myrrine** (A2) sits beside it, veil lifted, speaking softly. Behind, through the cave mouth, pilgrims climb the sacred way with lamps, the altars of dawn and dusk both lit. **Alexios and Ione** stand at the side, listening. Golden light, mist from the water.

**E2 · `ending.silent_oracle.cities_decide.png` — The cities decide**
* *Ending:* the spring stays sealed; the cities must talk to each other now — "they are already arguing in Asterion's council; it is the best sound I have heard all year".
* *Scene:* **bright midday** on an open-air assembly terrace on a hillside above Asterion's harbour: citizens from several cities (different coloured cloaks) arguing with raised hands, some laughing; **Thaleia** (R2) presides with her wax tablet; **Alexios** leans on a column at the side, smiling. Far away on the horizon, the mountain of Kalliste lies quiet under a clear sky; the spring's bronze seal still closed, a single laurel wreath laid on it (seen small).

---

## 9. Already final — nothing to paint

Everything else The Silent Oracle shows already exists in the game: Alexios's, Thaleia's, Ione's and Melas's busts and portraits, the Scout Captain's portrait (he patrols mission 4); the Greek map hero, every Greek creature and its animations; the neutral creatures it fights (brigands, boars, clay and bronze golems, ogres, wyverns); every map site (towns, mines, camps, crossings, refuges, nests, lookouts, the beacon and relay sites, gates, events, pickups); the battlefields of every climate, the Greek siege art and the catapult; Greek town buildings at every level and the town backgrounds; music and sounds.

---

## 10. How a delivery enters the game

| Part | Save in | Then run |
|---|---|---|
| A, C, D, E | `assets-source/art/final/` | `npm run art:import` — busts keep their transparency (stored up to 768 × 1152); the cover becomes `art/covers/` plus the 640 × 360 campaign card; each mission picture becomes its briefing background plus its 640 × 360 card; endings `art/endings/`. Never enlarged. |
| B | `assets-source/icons/final/` | `npm run icons:import -- --new` (it may warn that the four IDs are not in the icon catalog yet — expected; they are imported anyway) |

Then empty `AWAITING_BRIEF_18` in `packages/ui/test/awaitingArt.ts` (the story-art and portrait tests then require every file), run `npm run check`, and look: the campaign screen (cover, card, the seven mission cards), each mission briefing, a dialogue with each new speaker (bust and square), Doros's and Theron's battles (portrait in the battle header), and both endings.

### Delivery checklist (18 files)

```
assets-source/art/final/hero.greek.theron.bust.png
assets-source/art/final/hero.greek.myrrine.bust.png
assets-source/art/final/hero.greek.doros.bust.png
assets-source/art/final/hero.greek.phaidon.bust.png
assets-source/icons/final/hero.greek.theron.portrait.png
assets-source/icons/final/hero.greek.myrrine.portrait.png
assets-source/icons/final/hero.greek.doros.portrait.png
assets-source/icons/final/hero.greek.phaidon.portrait.png
assets-source/art/final/campaign.silent_oracle.cover.png
assets-source/art/final/mission.silent_oracle.m01.thumbnail.png
assets-source/art/final/mission.silent_oracle.m02.thumbnail.png
assets-source/art/final/mission.silent_oracle.m03.thumbnail.png
assets-source/art/final/mission.silent_oracle.m04.thumbnail.png
assets-source/art/final/mission.silent_oracle.m05.thumbnail.png
assets-source/art/final/mission.silent_oracle.m06.thumbnail.png
assets-source/art/final/mission.silent_oracle.m07.thumbnail.png
assets-source/art/final/ending.silent_oracle.oracle_speaks.png
assets-source/art/final/ending.silent_oracle.cities_decide.png
```

### Prompt templates

Bust (Part A):

```text
Epic painterly fantasy character portrait for a strategy game, half-body (waist up), 1024 × 1536, transparent background. [CHARACTER DESCRIPTION FROM §4]. Body turned three-quarters toward the right of the image, head a little toward the viewer. Warm key light from the upper left, cool rim light on the right edge. Same framing, light and finish as the attached Alexios bust. Greek palette: royal blue, white marble, gold, bronze. No text, no frame, no background.
```

Landscape (Parts C–E):

```text
Epic painterly fantasy landscape for a strategy game, [SIZE], 16:9, full painting in the style of the attached Greek references: golden key light, cool blue shadows, haze for depth, crisp detail at the focal point. [SCENE FROM §6–8]. Keep the focal point in the central 60 % of the width and the upper 70 % of the height. No text, letters, logos or frames.
```
