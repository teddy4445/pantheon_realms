# Pantheon Realms — Art Brief 3 of 3 for GPT-6: BIG MOMENTS

**What this file is.** A complete production brief for **41 images** shown at
the game's big moments: 14 "miracle" cards (the gods' interventions), a victory
and a defeat splash for each of the six pantheons (12), six level-up banners
and nine new-week banners. Every image has its own description, exact size and
the **exact file name** the game will look for.

**Who reads it.** GPT-6 (the image generator) and the person running it. The
sections "How to work", "Style bible" and the group rules apply to every image.

---

## 0. The game in one paragraph

*Pantheon Realms* is a turn-based fantasy strategy game in the tradition of
classic hero-and-army strategy games. Six mythological pantheons — **Greek,
Norse, Egyptian, Japanese, Celtic and Mesoamerican** — build towns, raise
creatures and fight for the favour of their gods. Players spend **Favor** to
call a **divine intervention** (a miracle) on the map or in battle; battles end
on a **victory or defeat** screen; heroes **level up**; every seventh day a
**new week** begins, sometimes with a special weekly event. These images make
those moments feel big. The game already has a finished visual identity; the
reference images below define it.

---

## 1. How to work (rules for every image)

1. **One image per request**, at the exact pixel size given in its group. PNG,
   sRGB. Transparent background only where the group says so.
2. **Name the file exactly** as written (lowercase, dots and underscores). The
   game finds every image by this name.
3. **No text of any kind** inside the image — no "VICTORY", no "LEVEL UP", no
   numbers, no readable runes, hieroglyphs, kanji or ogham, no logos,
   signatures, watermarks, UI or frames. The game adds every word, number and
   frame. Where an empty name plate is asked for, leave it **blank**.
4. **Adults only, dignified and respectful.** No gore (defeat scenes show loss
   through mood, broken banners and tired soldiers, never wounds or bodies), no
   nudity. Cultures shown with respect, never as caricature.
5. **Gods appear as colossal, luminous, partly-veiled figures** in the sky or as
   giant statues — the way they appear in the opening paintings (R1–R6) — never
   as small ordinary people.
6. When the words and the reference images seem to disagree on style, **follow
   the reference images.**

---

## 2. Reference images to attach

| # | File in the project folder | What it shows | Use it for |
|---|---|---|---|
| R1–R6 | `assets-source/ui/backgrounds/opening-greek-battle.png`, `opening-norse-battle.png`, `opening-egyptian-battle.png`, `opening-japanese-battle.png`, `opening-celtic-battle.png`, and `opening-mesoamerican-landscape.png` | The game's opening paintings: armies with banners, colossal gods in storm skies | **the target look of victory and defeat splashes and miracle cards** |
| R7 | `support images/ChatGPT Image Sep 29, 2026, 02_38_47 PM-7.png` | Battle-results and level-up screen concepts (a laurel-framed title over battle art; a level-up title over a hero) | where titles sit, mood of victory and level-up |
| R8 | `support images/ChatGPT Image Sep 29, 2026, 03_35_30 PM-1.png` … `03_35_45 PM-6.png` (Greek, Norse, Egyptian, Japanese, Celtic, Mesoamerican) | Pantheon boards: god cards, heroes, creatures | how each pantheon's gods, soldiers and creatures look |
| R9 | `assets-source/ui/frames/intro-frame.png` and `assets-source/ui/branding/full-logo.png` | The game's ornate gold-and-navy frame and logo | **the metalwork style of the banners** |
| R10 | `assets-source/ui/sheets/resource-status-icon-pack.png` | The game's icon pack (gold, navy, enamel) | ornament style, the week/day icons |

If you can attach only a few: **the opening painting and the pantheon board of
the pantheon you are painting, plus R7 and R9.**

---

## 3. Style bible

**Medium.** High-detail digital painting, "epic painterly fantasy", the same as
the opening paintings: visible controlled brushwork, crisp focal detail, deep
atmosphere. Banners and ornaments: polished, sculpted gold metalwork with
enamel inlays like the frame (R9). Not a photo, not a flat render, not anime.

**Light.** Cinematic; god-rays, glowing divine light, warm-against-cool.

**Pantheon palettes and motifs:**

| Pantheon | Main colours | Accents | Motifs |
|---|---|---|---|
| Greek | royal blue `#1F3F8F`, white marble `#ECE6DA` | gold `#C29A52`, bronze | laurel, owl, meander border, lightning, sea |
| Norse | night navy `#1B2A44`, steel silver `#C9D1DA` | fur browns, ember orange, aurora teal `#3FD6B0` | knotwork, ravens, wolves, snow |
| Egyptian | sand gold `#D6A842`, white linen `#F1EBDD` | lapis blue `#1F4FA0`, carnelian red `#A3262A`, turquoise | sun disc, spread wings, lotus, obelisks |
| Japanese | vermilion `#C0262D`, black lacquer `#1A1414`, white `#F2EDE4` | cherry pink `#F2A7C3`, gold | torii, lanterns, cherry blossom, waves, clouds |
| Celtic | forest green `#2F5D34`, gold `#C9A24A` | grey stone, woad blue, heather purple | spirals, triskeles, knotwork, stags, standing stones |
| Mesoamerican | turquoise `#1AA39A`, crimson `#B3262B` | jade green, gold `#D2A440`, quetzal-green feathers | feathered serpents, step-frets, pyramids, sun stones |

**Pantheon-neutral images** (the eight shared miracles and the new-week
banners) are seen by every pantheon: use **gold, white light and deep navy**,
clouds and sky, and avoid any one pantheon's symbols.

---

## 4. Files in this brief

All files go into the project folder **`assets-source/art/final/`**.

| Group | Count | Size (px) | Background | File name pattern |
|---|---|---|---|---|
| A. Miracle cards | 14 | 1024 × 1536 (portrait 2:3) | full painting | `intervention.<miracle>.card.png` |
| B. Victory and defeat splashes | 12 | 1920 × 1080 (16:9) | full painting | `splash.<pantheon>.victory.png`, `splash.<pantheon>.defeat.png` |
| C. Level-up banners | 6 | 1536 × 512 (3:1) | **transparent** | `banner.level_up.<pantheon>.png` |
| D. New-week banners | 9 | 1536 × 512 (3:1) | **transparent** | `banner.new_week.png`, `banner.week.<event>.png` |

---

## 5. Group A — Miracle cards (14)

### 5.0 Rules for all miracle cards

* **Size:** 1024 × 1536 px (portrait), full painting.
* **Use:** when a player calls a miracle, the card rises onto the screen inside a
  gold frame, with the miracle's name on a plate at the bottom. So: keep
  important content **at least 6 % away from every edge** (the frame overlaps),
  and keep the **bottom 18 %** simpler and darker (the name plate sits there).
* **Show the miracle happening** — its effect on the world — not a passport
  portrait of a god. One strong focal point of divine light.
* Eight cards are **shared by every pantheon** (pantheon-neutral, see the style
  bible); six belong to **one pantheon** (use its palette and motifs).
* The game also has a small 96 px icon for each miracle (in the icon list); the
  card is the big painted version of the same idea.

**A01 · `intervention.favorable_winds.card.png` — Favorable Winds** (shared · map)
*Effect:* every hero regains half a day's movement.
A small company of riders with banners on a road across open hills, cloaks and
manes streaming forward; a great luminous wind sweeps in from behind them, made
visible as golden streams of light and swirling leaves, bending the grass ahead
of them like a path being opened. A vast sky with clouds parting in the shape of
a guiding hand.

**A02 · `intervention.bountiful_harvest.card.png` — Bountiful Harvest** (shared · map)
*Effect:* a chosen town gains recruits for its tier 1–3 creatures.
A walled town gate at golden hour, the gates thrown open; a stream of new
recruits and young creatures pours out under a shower of golden light and
falling grain and petals. Overflowing baskets of bread and fruit on carts at the
gate.

**A03 · `intervention.tithe_of_the_faithful.card.png` — Tithe of the Faithful** (shared · map)
*Effect:* 1,500 Gold at once.
The steps of a temple in warm candlelight; townsfolk bring offerings; above the
altar, a beam of light from an opening in the clouds and a cascade of gold coins
falling into a great bronze bowl that overflows. Coins catch the light like sparks.

**A04 · `intervention.inspiration.card.png` — Inspiration** (shared · map)
*Effect:* every hero regains 15 mana.
A hero (seen from behind, cloaked, no specific pantheon) stands on a cliff at
night with arms slightly raised; ribbons of blue-white starlight descend from the
sky and spiral into a glowing open book and a staff he holds; floating motes of
light around him.

**A05 · `intervention.rally_the_faithful.card.png` — Rally the Faithful** (shared · battle)
*Effect:* every friendly stack +2 Attack for two rounds.
A battle line of mixed soldiers raising spears and swords together, mouths open
in a shout; a blaze of golden light bursts from the clouds above and runs along
their raised weapons like fire; banners snap upright.

**A06 · `intervention.shield_of_the_gods.card.png` — Shield of the Gods** (shared · battle)
*Effect:* every friendly stack +3 Defense for two rounds.
A shield wall braced against a storm of arrows; above them, a vast translucent
golden dome of light, decorated with faint ornamental patterns, catches the
arrows, which shatter into sparks.

**A07 · `intervention.mending_light.card.png` — Mending Light** (shared · battle)
*Effect:* the front creature of every friendly stack heals up to 30 HP.
Tired soldiers kneeling on a battlefield at dusk; soft white-gold light falls
like gentle rain, with small motes rising from their armour as cuts close and
their faces ease. A calm, healing glow, no wounds shown.

**A08 · `intervention.wrath_from_above.card.png` — Wrath from Above** (shared · battle)
*Effect:* one enemy stack takes 120 damage.
A single pillar of white-gold fire strikes down from a hole in dark clouds onto a
group of dark enemy soldiers on a hillside (seen at a distance, silhouettes only),
a ring of light and dust blasting outward. Awe rather than gore.

**A09 · `intervention.thunderbolt_of_zeus.card.png` — Thunderbolt of Zeus** (Greek · battle)
*Effect:* one enemy stack takes 200 damage.
Storm clouds over a Greek battlefield; in them the colossal, luminous upper body
of the bearded sky-king, partly veiled by cloud, arm drawn back; a jagged
blue-white thunderbolt strikes a distant enemy formation. Greek hoplites with
royal-blue shields and banners in the foreground looking up. Royal blue, white
marble, gold, electric blue-white.

**A10 · `intervention.ride_of_the_valkyries.card.png` — Ride of the Valkyries** (Norse · battle)
*Effect:* every friendly stack +2 Speed for two rounds.
Under a teal-green aurora, a charge of Valkyries on winged horses descends from
the clouds in a sweeping arc, spears lowered, white wings and silver armour; below,
Norse warriors with round navy-and-silver shields surge forward with them.
Snow swirling, ravens scattering.

**A11 · `intervention.blessing_of_the_nile.card.png` — Blessing of the Nile** (Egyptian · map)
*Effect:* a chosen town gains recruits for its tier 1–5 creatures.
The great river in flood at sunrise; the water glows gold and turquoise and
spills gently over green fields; in the river's mist the colossal translucent
form of a river deity with lotus flowers; from the water rise sacred scarabs and
jackal guardians of light walking toward a golden city with red banners.

**A12 · `intervention.ward_of_the_kami.card.png` — Ward of the Kami** (Japanese · battle)
*Effect:* every friendly stack +4 Defense for three rounds.
Samurai and spirit warriors in vermilion and black stand behind a great circle of
glowing white paper talismans and twisted straw ropes hung with paper streamers,
forming a shimmering shrine-gate barrier of light; a giant torii of light rises
behind them; cherry petals freeze in the air where they touch the barrier.

**A13 · `intervention.mists_of_the_sidhe.card.png` — Mists of the Sídhe** (Celtic · map)
*Effect:* every hero regains a full day's movement.
A silver-green mist rolls across a moor between standing stones; Celtic riders
in green cloaks ride into it and appear far ahead on a hill at the same moment,
as if the mist folded the land; tall, graceful otherworld figures watch from the
mist, only half-visible. Silver light, green and gold.

**A14 · `intervention.gift_of_the_feathered_serpent.card.png` — Gift of the Feathered Serpent** (Mesoamerican · map)
*Effect:* 1,000 Gold and 3 Crystal at once.
A colossal feathered serpent of turquoise and quetzal-green plumes coils down
from the clouds over a stepped pyramid at dawn; from its open jaws a stream of
gold and glittering crystals pours onto the temple platform where priests in
white and crimson raise their arms.

---

## 6. Group B — Victory and defeat splashes (12)

### 6.0 Rules for all splashes

* **Size:** 1920 × 1080 px (16:9), full painting.
* **Use:** the background of the battle-result screen and of the end-of-game
  screen, shown for the **player's pantheon**. The game draws a large
  laurel-framed title ("Victory" / "Defeat") in the **upper centre** (roughly the
  middle 40 % of the width, from 8 % to 30 % of the height) and result panels
  over the **lower half** (see R7). So: keep the upper-centre area calmer (sky,
  light, a distant banner), put the drama in the **left and right thirds and the
  middle distance**, and avoid tiny important details in the lower half.
* **Victory:** triumphant, golden, the army of that pantheon cheering after the
  battle, banners raised, the pantheon's god appearing as a colossal blessing
  figure in the sky. **Defeat:** the same world after a lost battle — dusk, rain or
  ash, torn banners, a tired retreat carrying the wounded (no wounds shown), the
  god veiled in cloud and turned away. Defeat is sad and dignified, not horrific.
* Victory and defeat of one pantheon should feel like **the same place on two
  different days**.

**B01 · `splash.greek.victory.png`** — Greek hoplites in bronze with royal-blue
shields and crests raise spears on a marble-paved terrace above a golden sea; blue
banners with gold borders lifted high; a griffin flies overhead; through parting
clouds the colossal marble-and-light figure of a helmeted wisdom goddess with
spear and owl looks down, bathed in sunlight.

**B02 · `splash.greek.defeat.png`** — The same terrace at dusk under rain; blue
banners torn and lowered, a fallen bronze helmet in a puddle; soldiers helping
each other down the steps toward ships; the goddess figure dim and veiled in grey
cloud; lightning far out to sea.

**B03 · `splash.norse.victory.png`** — Norse warriors with round navy-and-silver
shields bang weapons and roar on a snowy ridge under a bright aurora; a longship
in the fjord below; ravens circle; in the aurora, a colossal one-eyed all-father
with spear and ravens, lit silver; torches and fire glow.

**B04 · `splash.norse.defeat.png`** — The same ridge in a blizzard at night;
shields lie half-buried in snow; warriors trudge back toward the longships
leaning on each other; the god figure lost in the storm clouds, only a pale
single eye of light visible; embers dying.

**B05 · `splash.egyptian.victory.png`** — Egyptian soldiers in white and gold with
red-and-gold banners raise khopesh swords and spears before a golden temple city
at sunrise; chariots and a sphinx creature in the middle distance; a colossal
falcon-headed sun god with a blazing sun disc rises above the obelisks.

**B06 · `splash.egyptian.defeat.png`** — The same place under a red dust-storm
sunset; banners torn and sand-blown; soldiers carrying a wounded comrade on a
stretcher toward reed boats on the river; the sun disc behind the god veiled to a
dull red coin.

**B07 · `splash.japanese.victory.png`** — Samurai and spirit warriors in vermilion
and black raise swords and banners on a castle approach lined with torii and
blossoming cherry trees; lanterns lit; a colossal radiant sun goddess with a halo
of light rises over misty mountains; petals swirl.

**B08 · `splash.japanese.defeat.png`** — The same approach in grey rain; torn
banners, a broken lantern, petals beaten into the mud; warriors retreating across
a red bridge carrying a comrade; the goddess's light hidden behind dark clouds,
only a thin rim glowing.

**B09 · `splash.celtic.victory.png`** — Celtic warriors in green and checked cloaks
raise spears, swords and a great war-horn on a green hill crowned by standing
stones; hounds leap; a colossal mossy father-god with club and cauldron and a
stag-crowned figure appear in the sunlit mist above the valley.

**B10 · `splash.celtic.defeat.png`** — The same hill in cold fog at dusk; spears
stuck in the ground with torn cloaks; warriors helping each other down toward a
dark loch; the god figures fading into the mist; ravens on the standing stones.

**B11 · `splash.mesoamerican.victory.png`** — Eagle and jaguar warriors in
crimson, turquoise and feathers raise shields and obsidian clubs on the plaza of a
stepped pyramid; braziers blaze; a colossal feathered serpent of turquoise and
quetzal-green coils across a golden sky above the jungle.

**B12 · `splash.mesoamerican.defeat.png`** — The same plaza under ash-fall from a
distant volcano at dusk; braziers smoking out; feather banners drooping; warriors
carrying a comrade down the steps; the serpent's form hidden in dark smoke.

---

## 7. Group C — Level-up banners (6)

### 7.0 Rules for all level-up banners

* **Size:** 1536 × 512 px, PNG with a **transparent background**.
* **What it is:** an ornamental title piece shown at the top of the level-up
  screen (R7: the laurel-framed "Level Up" title above the hero). The game writes
  the words ("Level Up", the hero's name and new level) on it, using the hero's
  pantheon's banner.
* **Layout:** a horizontal centred composition. A **blank central plaque** about
  60 % of the width and 45 % of the height (dark navy enamel inside a gold rim,
  no marks on it) — the text goes there. Ornaments on both sides and around the
  edges. Symmetrical. Soft glow behind the ornament, fading to transparent; no
  hard rectangle edge.
* **Metalwork:** polished sculpted gold with the pantheon's enamel colours, in the
  style of the game's frame (R9). Upward light rays behind it suggest rising
  power.

**C1 · `banner.level_up.greek.png`** — two golden laurel branches curving up on
either side of the plaque, a small gold owl at the top centre, a royal-blue enamel
meander band along the plaque's rim, rays of white-gold light fanning upward.

**C2 · `banner.level_up.norse.png`** — silver-and-gold knotwork panels with two
raven wings sweeping out from the sides, a small round shield boss at the top
centre, a faint aurora-teal glow behind.

**C3 · `banner.level_up.egyptian.png`** — a winged sun disc: two great spread
wings of gold with lapis and turquoise feathers reaching out from the plaque, a
red-gold sun disc at the top centre flanked by two small rearing cobras.

**C4 · `banner.level_up.japanese.png`** — vermilion lacquer and gold: stylised gold
cloud scrolls on both sides, a rising sun of rays behind the plaque, a small
cherry blossom crest at the top centre, falling petals.

**C5 · `banner.level_up.celtic.png`** — gold spiral and knotwork with green enamel,
a pair of stag antlers rising from the top corners, a small triskele at the top
centre, soft silver-green glow.

**C6 · `banner.level_up.mesoamerican.png`** — two feathered serpent heads in gold
and turquoise mosaic facing each other across the top of the plaque, step-fret
borders in crimson and gold, quetzal-green feathers fanning out like a sunburst
behind.

---

## 8. Group D — New-week banners (9)

### 8.0 Rules for all new-week banners

* **Size:** 1536 × 512 px, PNG with a **transparent background**.
* **What it is:** the banner that slides in at the dawn of a new week (every
  seventh day). The game writes "Week N" and, if there is one, the week's event
  name and effect on the **blank central plaque**.
* **Layout:** like the level-up banners — a blank navy-and-gold central plaque
  (about 60 % × 45 %), ornament around it, symmetrical, soft glow fading to
  transparent.
* **Pantheon-neutral** (every player sees it): gold, white light, deep navy; no
  pantheon symbols.
* `banner.new_week.png` is the default; the eight `banner.week.<event>.png`
  variants replace it in a week with that event. Keep the same frame shape and
  plaque across all nine so they feel like one family; only the scene or emblem
  around the plaque changes.

**D1 · `banner.new_week.png` — A new week (default)**
A golden sunrise behind the plaque: the upper half of a sun with long rays, a
ring of seven small gold studs along the plaque's top edge (the seven days), an
hourglass emblem at the top centre, soft dawn clouds at the sides.

**D2 · `banner.week.quiet_week.png` — A Quiet Week**
The same frame with a calm pale-gold dawn, still clouds, a single bird gliding,
softer and quieter light.

**D3 · `banner.week.week_of_plenty.png` — Week of Plenty**
Sheaves of golden wheat and overflowing baskets of fruit framing the plaque, a
cornucopia at the top centre, warm harvest light.

**D4 · `banner.week.week_of_merchants.png` — Week of the Merchants**
Caravan banners and silk pennants streaming from both sides, small piles of gold
coins and a merchant's scales at the top centre, warm bazaar light.

**D5 · `banner.week.week_of_storms.png` — Week of Storms**
Dark storm clouds and slanting rain on both sides, lightning forks in the
background, a weather-vane emblem at the top centre; the gold frame wet and
gleaming.

**D6 · `banner.week.week_of_valor.png` — Week of Valor**
Crossed swords and herald's trumpets with hanging pennants on both sides, a
gleaming round shield at the top centre, a bright heroic glow.

**D7 · `banner.week.week_of_omens.png` — Week of Omens**
A night-blue sky with bright constellations and a comet at the sides, birds in
augury flight, an eye-of-stars emblem at the top centre, silver-gold starlight.

**D8 · `banner.week.week_of_the_muse.png` — Week of the Muse**
A lyre and floating glowing scrolls on both sides, ribbons of blue-violet light
(mana) curling around the plaque, a small flame of inspiration at the top centre.

**D9 · `banner.week.week_of_builders.png` — Week of the Builders**
Stacked cut stone and timber beams framing the plaque, a hammer and chisel crossed
at the top centre, a mason's square, scaffolding silhouettes, warm workshop light.

---

## 9. Delivery checklist (41 files)

Put every file in `assets-source/art/final/`. Names must match exactly.

```
intervention.favorable_winds.card.png
intervention.bountiful_harvest.card.png
intervention.tithe_of_the_faithful.card.png
intervention.inspiration.card.png
intervention.rally_the_faithful.card.png
intervention.shield_of_the_gods.card.png
intervention.mending_light.card.png
intervention.wrath_from_above.card.png
intervention.thunderbolt_of_zeus.card.png
intervention.ride_of_the_valkyries.card.png
intervention.blessing_of_the_nile.card.png
intervention.ward_of_the_kami.card.png
intervention.mists_of_the_sidhe.card.png
intervention.gift_of_the_feathered_serpent.card.png
splash.greek.victory.png
splash.greek.defeat.png
splash.norse.victory.png
splash.norse.defeat.png
splash.egyptian.victory.png
splash.egyptian.defeat.png
splash.japanese.victory.png
splash.japanese.defeat.png
splash.celtic.victory.png
splash.celtic.defeat.png
splash.mesoamerican.victory.png
splash.mesoamerican.defeat.png
banner.level_up.greek.png
banner.level_up.norse.png
banner.level_up.egyptian.png
banner.level_up.japanese.png
banner.level_up.celtic.png
banner.level_up.mesoamerican.png
banner.new_week.png
banner.week.quiet_week.png
banner.week.week_of_plenty.png
banner.week.week_of_merchants.png
banner.week.week_of_storms.png
banner.week.week_of_valor.png
banner.week.week_of_omens.png
banner.week.week_of_the_muse.png
banner.week.week_of_builders.png
```

Suggested order: the six victory splashes first (they set the scale and light for
everything else), then their defeats, then the miracle cards, then the banners
(make `banner.new_week.png` first and reuse its frame for the eight variants).
