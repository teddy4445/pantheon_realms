# Pantheon Realms — Art Brief 4 for GPT-6: GOD PORTRAITS (all 60 gods)

**What this file is.** A complete production brief for **60 painted god
portraits**: the patron and the nine minor gods of each of the six pantheons.
Every image has its own description, the exact size and the **exact file name**
the game looks for. Written 2026-10-02, when the last 24 gods received their
blessings (owner request: "include also a list for GPT to generate the images
needed for the game for all of them").

**Who reads it.** GPT-6 (the image generator) and the person running it. Read
sections 1–3 first; they apply to every image. Then paint the portraits one by
one in the order listed.

**Where they appear in the game.** The Pantheon screen (the patron large, every
other god on a card), the god-choice confirmation, and the Encyclopedia. The
game shows each portrait **inside a round gold frame**, from about 48 px up to
about 150 px across. Today a generated placeholder bust stands in for all 60.

---

## 0. The game in one paragraph

*Pantheon Realms* is a turn-based fantasy strategy game in the tradition of
classic hero-and-army strategy games. Six mythological pantheons — **Greek,
Norse, Egyptian, Japanese, Celtic and Mesoamerican** — build towns, raise
creatures, lead heroes across an adventure map and fight hex-grid battles for
the favour of their gods. In every pantheon one **patron** god watches over the
empire from the start; during play the player commits to one god of a **first
choice** (four gods) and later one god of a **second choice** (five gods). The
portrait must make each god instantly recognisable on a small round card.

---

## 1. How to work (rules for every image)

1. **One image per request**, **1024 × 1024 px**, PNG, sRGB, full painted
   background (no transparency).
2. **Name the file exactly** as written (lowercase, dots and underscores,
   ending in `.png`). Do not add numbers, dates or words.
3. **No text of any kind**: no names, letters, numbers, readable runes,
   hieroglyphs, kanji or glyphs, no logos, signatures, watermarks, frames or
   borders. Where a god carries writing (Thoth's palette, a scroll), paint
   abstract marks that suggest writing without forming real characters.
4. **Round crop.** The game cuts a circle out of the square. Keep the face, the
   headdress and the god's key attribute **inside the central circle whose
   diameter is 88 % of the image width**. The corners will not be seen; fill
   them with background only.
5. **Framing:** head and upper chest (a bust), seen from the front or a slight
   three-quarter turn. Eyes about **40 % from the top**. Tall crowns, horns,
   antlers, plumes and sun discs may rise to about 6 % below the top edge but
   must stay inside the circle. The god's attribute (spear, lyre, hammer,
   mirror…) appears at the shoulder or in a raised hand, partly visible is
   fine.
6. **Respect.** These are gods still honoured by living communities (Shinto,
   Heathen, Celtic, Mexica/Nahua and others) and figures of ancient religions.
   Paint them dignified, powerful and beautiful — never comic, never horror,
   never caricature. Adults only, no nudity (bare shoulders and chests of male
   gods are fine where traditional), no gore. Death gods are solemn and
   majestic, not frightening monsters.
7. **Original designs.** Follow the traditional attributes listed for each
   god, but do not copy any film, comic, game or museum reconstruction.
8. When the words and the reference images seem to disagree on style, **follow
   the reference images.**

---

## 2. Reference images to attach

Attach these files from the project folder together with this brief. They are
the style authority (the same references as Briefs 1–3).

| # | File in the project folder | Use it for |
|---|---|---|
| R1–R6 | `assets-source/ui/backgrounds/opening-<pantheon>-landscape.png` (Greek, Norse battle, Egyptian, Japanese, Celtic, Mesoamerican) | light, colour and the pantheon's palette |
| R7 | `support images/ChatGPT Image Sep 29, 2026, 03_35_30 PM-1.png` … `03_35_45 PM-6.png` (Greek, Norse, Egyptian, Japanese, Celtic, Mesoamerican) | **the target look**: the painted god cards on the pantheon boards |
| R10 | `support images/ChatGPT Image Sep 29, 2026, 02_38_36 PM-1.png` | the overall visual direction |

If you can attach only a few, attach **R7 (the board of the pantheon you are
painting) and its landscape R1–R6**. Where a god already appears on a pantheon
board, keep that board's look for the god (face, costume, colours) and simply
re-frame it as a bust for the circle.

---

## 3. Style bible

**Medium.** High-detail digital painting — "epic painterly fantasy" — the look
of the god cards on the pantheon boards (R7). Visible, controlled brushwork;
crisp detail on the face and attribute, softer atmosphere behind. Not a
photograph, not a 3D render, not anime, not comic ink, not flat vector.

**Light (identical for all 60).** Warm key light from the upper left, a cool
rim light on the right edge, a soft divine glow behind the head (halo, sun
disc, aurora, moon or mist — given per god). The background is the god's own
element (storm sky, sea, desert sun, moonlit cloud, forest mist, jungle
smoke…), darker toward the corners so the round gold frame stands out.

**Colour.** Each pantheon's palette:

| Pantheon | Main colours | Accents | Motifs |
|---|---|---|---|
| Greek | royal blue `#1F3F8F`, white marble `#ECE6DA` | gold `#C29A52`, bronze, olive green | laurel, meander border, lightning, the sea |
| Norse | night navy `#1B2A44`, steel silver `#C9D1DA` | fur browns, ember orange, aurora teal `#3FD6B0` | knotwork, ravens, wolves, rune-like marks, snow and ice |
| Egyptian | sand gold `#D6A842`, white linen `#F1EBDD` | lapis blue `#1F4FA0`, carnelian red `#A3262A`, turquoise | sun disc, spread wings, lotus, papyrus, broad collars |
| Japanese | vermilion `#C0262D`, black lacquer `#1A1414`, white `#F2EDE4` | cherry-blossom pink `#F2A7C3`, gold | clouds, waves, cherry blossom, sacred ropes, lanterns |
| Celtic | forest green `#2F5D34`, gold `#C9A24A` | grey stone, woad blue, heather purple | spirals, knotwork, torcs, standing stones, mist |
| Mesoamerican | turquoise `#1AA39A`, crimson `#B3262B` | jade green, gold `#D2A440`, quetzal-green feathers | feathered serpents, step-fret patterns, sun stones, jade |

**Readability.** At 48 px the god must still read by silhouette and one
colour: each description ends with the **"reads as"** cue to protect.

---

## 4. Files in this brief

Deliver all 60 files into the project folder **`assets-source/icons/final/`**
(the same folder as the delivered icons), then run `npm run icons:import`. The
import step checks each name against the icon catalog, scales the image to the
game's portrait size (256 × 256 today; it never upscales) and registers it, so
the game shows it in place of the placeholder by name.

| Pantheon | Patron | First choice (4) | Second choice (5) |
|---|---|---|---|
| Greek | Zeus | Athena, Ares, Apollo, Artemis | Hermes, Demeter, Hades, Poseidon, Hera |
| Norse | Odin | Thor, Tyr, Frigg, Baldr | Freyja, Heimdall, Hel, Loki, Njord |
| Egyptian | Ra | Set, Isis, Anubis, Bastet | Osiris, Thoth, Horus, Hathor, Sobek |
| Japanese | Amaterasu | Hachiman, Susanoo, Tsukuyomi, Benzaiten | Inari, Fujin, Raijin, Izanagi, Izanami |
| Celtic | Dagda | Morrigan, Brigid, Nuada, Danu | Cernunnos, Epona, Lugh, Arawn, Manannan |
| Mesoamerican | Quetzalcoatl | Huitzilopochtli, Coatlicue, Mixcoatl, Xolotl | Tlaloc, Tezcatlipoca, Xiuhtecuhtli, Chalchiuhtlicue, Mictlantecuhtli |

Gods marked **(new)** received their blessings on 2026-10-02 and have never
had any art; paint those first if time is short.

---

## 5. Greek (10)

**G01 · `god.greek.zeus.portrait.png` — Zeus, Lightning & Power (patron)**
* *Look:* mature king of the gods, about 55 in appearance, broad and powerful;
  thick silver-streaked dark beard and hair, a golden oak-leaf crown; white
  himation over one shoulder with a royal-blue meander border; a crackling gold
  thunderbolt held at the right shoulder; an eagle's wing edge behind.
* *Background:* storm clouds split by sunlight, lightning behind the head.
* *Mood:* "The storm answers to the one who keeps the lights." Stern, generous.
* *Reads as:* white beard + gold thunderbolt on storm blue.

**G02 · `god.greek.athena.portrait.png` — Athena, Knowledge & Strategy (first choice)**
* *Look:* woman about 30, calm grey eyes, dark hair under a bronze Corinthian
  helmet pushed back with a tall blue crest; gold-scaled aegis over the
  shoulders with a small round boss; a spear upright beside her; a small owl
  on her shoulder.
* *Background:* olive branches and a marble colonnade in soft morning light.
* *Mood:* "Hold the road together." Thoughtful, unshakeable.
* *Reads as:* crested helmet + owl.

**G03 · `god.greek.ares.portrait.png` — Ares, War & Conquest (first choice)**
* *Look:* man about 35, hard jaw, short dark beard, intense eyes; bronze
  helmet with a red horsehair crest; bronze cuirass, a crimson cloak; a spear
  point and the rim of a round bronze shield at the shoulder.
* *Background:* dust and torch-lit smoke of a battlefield at dusk.
* *Mood:* "Break the force that bars the road." Fierce, eager.
* *Reads as:* red crest + bronze on red smoke.

**G04 · `god.greek.apollo.portrait.png` — Apollo, Sun & Inspiration (first choice, new)**
* *Look:* young man about 25, beardless, golden curls, a laurel wreath; white
  chiton with a gold border, a gold sun-ray diadem behind the wreath; a golden
  lyre raised at his left shoulder.
* *Background:* a blazing sun disc directly behind the head (a natural halo),
  warm gold sky.
* *Mood:* "Sing before the battle, and the battle sings back." Radiant, serene.
* *Reads as:* golden curls + sun halo + lyre.

**G05 · `god.greek.artemis.portrait.png` — Artemis, Hunt & Wilderness (first choice, new)**
* *Look:* young woman about 22, athletic, auburn hair tied up, a silver crescent
  moon on her brow; short green hunting chiton, a quiver of arrows over the
  shoulder; a silver bow held upright; a stag's antlers just behind her.
* *Background:* moonlit pine forest, silver mist.
* *Mood:* "Wait for the wind. Then loose." Alert, focused.
* *Reads as:* silver crescent + bow on forest green.

**G06 · `god.greek.hermes.portrait.png` — Hermes, Trade & Movement (second choice)**
* *Look:* lean man about 28, short curly hair, quick smile; a winged traveller's
  hat (petasos), a short travelling cloak; the caduceus (staff with two
  intertwined snakes and small wings) at his shoulder.
* *Background:* a road winding over sunny hills, a breeze in the cloak.
* *Mood:* "A road walked quickly is a road walked twice." Witty, restless.
* *Reads as:* winged hat + caduceus.

**G07 · `god.greek.demeter.portrait.png` — Demeter, Harvest & Abundance (second choice)**
* *Look:* woman about 45, warm brown skin, honey-brown hair under a crown of
  wheat ears and poppies; a saffron-and-white peplos; a golden sheaf of wheat
  in her arms and a small torch flame.
* *Background:* golden wheat fields under late-summer light.
* *Mood:* "Feed the valley and the valley will march for you." Motherly, firm.
* *Reads as:* wheat crown on gold.

**G08 · `god.greek.hades.portrait.png` — Hades, Underworld & Control (second choice)**
* *Look:* man about 50, pale olive skin, black beard and hair, a dark iron crown
  with small gems; deep purple-black robes with a silver meander border; a
  two-pronged staff (bident); faint shapes of cypress trees behind.
* *Background:* a dim cavern lit by cold blue fire, the faint glint of a river.
* *Mood:* "Not every shade has to stay below." Quiet, just, not cruel.
* *Reads as:* dark crown + bident in cold blue.

**G09 · `god.greek.poseidon.portrait.png` — Poseidon, Sea & Dominion (second choice, new)**
* *Look:* powerful man about 50, wild sea-grey beard and hair with strands of
  seaweed and pearls, a coral-and-gold crown; bare shoulders, a sea-green
  mantle; a golden trident at his shoulder.
* *Background:* a towering wave curling behind him, spray catching sunlight.
* *Mood:* "The tide does not ask the shore." Commanding, restless as the sea.
* *Reads as:* trident + wave on teal.

**G10 · `god.greek.hera.portrait.png` — Hera, Authority & Family (second choice, new)**
* *Look:* regal woman about 45, dark hair under a tall gold crown (polos) and a
  fine white veil; royal-blue robe with gold; a fan of peacock feathers behind
  one shoulder; a pomegranate held in one hand.
* *Background:* a marble throne room with blue drapery.
* *Mood:* "A city is a household. Keep it full." Majestic, protective.
* *Reads as:* tall gold crown + peacock eyes.

---

## 6. Norse (10)

**N01 · `god.norse.odin.portrait.png` — Odin, Wisdom & Knowledge (patron)**
* *Look:* old king about 65, long grey beard braided with silver rings, one eye
  closed by an old scar (left side of the image), the other keen and blue; a
  broad-brimmed dark hood or wide hat, a grey-blue cloak with fur collar; the
  spear Gungnir with rune-like marks; two ravens, one on each shoulder.
* *Background:* night sky with aurora over a dark forest.
* *Mood:* "Every road north is paid for in wisdom." Grave, knowing.
* *Reads as:* one eye + ravens + grey beard.

**N02 · `god.norse.thor.portrait.png` — Thor, Strength & Storms (first choice)**
* *Look:* massive man about 40, thick red beard braided, red hair; iron helm or
  bare head with a leather band; mail and fur over broad shoulders; the short
  hammer raised at his shoulder, lightning crawling over its head.
* *Background:* black storm clouds, a lightning fork.
* *Mood:* "Swing first, and swing true." Fierce, cheerful.
* *Reads as:* red beard + hammer + lightning.

**N03 · `god.norse.tyr.portrait.png` — Tyr, Law & Honor (first choice)**
* *Look:* lean, scarred warrior about 45, short dark-blond beard, steady eyes;
  steel helm with a nasal guard; a sword held upright before him in his left
  hand; his right arm ends in a leather-bound stump at the wrist (the hand he
  gave for an oath), shown with dignity.
* *Background:* a stone assembly ring with banners, cold dawn light.
* *Mood:* "An oath holds the line longer than a shield." Solemn, steady.
* *Reads as:* upright sword + steel helm.

**N04 · `god.norse.frigg.portrait.png` — Frigg, Foresight & Protection (first choice, new)**
* *Look:* queenly woman about 50, silver-blonde braids under a white linen veil
  and a slim gold circlet; a deep-blue mantle with white fur trim; a ring of
  household keys at her belt; she holds a distaff with spun cloud-white thread.
* *Background:* soft clouds lit from within, like a spun-silver sky.
* *Mood:* "I know how this ends. Walk where I point." Wise, quietly certain.
* *Reads as:* blue mantle + spindle of cloud thread.

**N05 · `god.norse.baldr.portrait.png` — Baldr, Light & Purity (first choice, new)**
* *Look:* radiant young man about 25, golden hair and short golden beard, a face
  that seems to glow; white tunic with gold knotwork; a small sprig of
  mistletoe pinned at the collar; warm light falls from him rather than on him.
* *Background:* a winter sunrise breaking through snow-covered pines.
* *Mood:* "Even the long night has a morning in it." Gentle, luminous.
* *Reads as:* golden glow on winter white.

**N06 · `god.norse.freyja.portrait.png` — Freyja, Love & Fertility (second choice)**
* *Look:* beautiful woman about 30, long golden-red hair with braids, a necklace
  of gold and amber at the throat; a cloak of falcon feathers over her
  shoulders; a grey forest cat at her shoulder.
* *Background:* a spring meadow at the edge of snow, golden light.
* *Mood:* "Every hall fills again by spring." Warm, proud.
* *Reads as:* amber necklace + falcon-feather cloak.

**N07 · `god.norse.heimdall.portrait.png` — Heimdall, Vigilance & Alertness (second choice)**
* *Look:* tall man about 35, clean-shaven, keen eyes, fair hair tied back; a
  white-and-silver helm, a white cloak; a long curved gold-rimmed horn at his
  shoulder.
* *Background:* a shimmering rainbow bridge arching behind him into cloud.
* *Mood:* "I hear the grass grow. I heard you coming." Watchful.
* *Reads as:* horn + rainbow arc.

**N08 · `god.norse.hel.portrait.png` — Hel, Death & Transition (second choice)**
* *Look:* tall woman of no clear age; her face divided softly down the middle —
  one half warm living skin, the other pale blue-grey like frost — shown as a
  graceful gradient, never decay; long black hair, a crown of black iron and
  frost; dark grey robes.
* *Background:* misty grey halls, faint pale-green light.
* *Mood:* "Half of what falls is mine. I may lend it back." Calm, impartial.
* *Reads as:* half-warm, half-frost face.

**N09 · `god.norse.loki.portrait.png` — Loki, Trickery & Change (second choice, new)**
* *Look:* slender man about 30, sharp handsome features, a knowing half-smile,
  copper-red hair swept back, thin lips; a dark-green and black tunic with gold
  serpent knotwork; flickering green-gold flame dancing in one raised palm; a
  small snake coiled at his collar.
* *Background:* shifting firelight and shadow, half the scene green-lit.
* *Mood:* "Rules are for people who lose." Charming, dangerous.
* *Reads as:* green flame + red hair + sly smile.

**N10 · `god.norse.njord.portrait.png` — Njord, Sea & Prosperity (second choice, new)**
* *Look:* weathered man about 55, salt-grey beard, kind sea-blue eyes; a
  sailor's wool cloak with a silver brooch, a coiled rope over one shoulder; a
  string of silver coins and a fish net draped on the other.
* *Background:* a calm northern harbour at golden hour, a longship's prow.
* *Mood:* "Fair wind, full nets, heavy purses." Easy-going, generous.
* *Reads as:* net + coins + sea-blue.

---

## 7. Egyptian (10)

Animal-headed gods follow the traditional temple iconography: a human body and
shoulders with the animal head shown nobly and naturally, wearing a striped
nemes or tripartite wig, a broad collar of gold, lapis and carnelian.

**E01 · `god.egyptian.ra.portrait.png` — Ra, Sun & Vitality (patron)**
* *Look:* falcon-headed god with keen gold eyes; a blazing sun disc encircled by
  a rearing cobra (uraeus) above his head; a broad gold-and-lapis collar; a
  was-sceptre at his shoulder.
* *Background:* the desert horizon at sunrise, rays fanning out.
* *Mood:* "Each dawn I cross the sky; each dawn the city rises with me."
* *Reads as:* falcon head + sun disc.

**E02 · `god.egyptian.set.portrait.png` — Set, Chaos & Strength (first choice)**
* *Look:* god with the head of the Set animal (long curved snout, tall
  square-tipped ears), red-brown fur; a red and gold collar; a was-sceptre.
* *Background:* a red desert sandstorm.
* *Mood:* "Storms clear the ground for the strong." Wild, formidable.
* *Reads as:* square-tipped ears on red storm.

**E03 · `god.egyptian.isis.portrait.png` — Isis, Magic & Healing (first choice)**
* *Look:* woman about 30, deep-brown skin, kohl-lined eyes, black braided wig
  under a vulture headdress topped with cow horns and a sun disc; great
  feathered wings of turquoise and lapis spread behind her shoulders; an ankh.
* *Background:* the Nile at dusk, a faint star field.
* *Mood:* "What is loved is put back together." Tender, powerful.
* *Reads as:* spread blue wings + horns and sun disc.

**E04 · `god.egyptian.anubis.portrait.png` — Anubis, Funerary Protection (first choice, new)**
* *Look:* jackal-headed god with glossy black fur and gold-rimmed ears; a gold
  broad collar with lapis inlay, a white linen kilt edge; he holds a small set
  of golden balance scales with a feather on one pan.
* *Background:* torch-lit tomb hall, gold and deep blue.
* *Mood:* "I weigh every heart. Yours may stay a while." Calm, protective.
* *Reads as:* black jackal head + gold scales.

**E05 · `god.egyptian.bastet.portrait.png` — Bastet, Grace & Protection (first choice, new)**
* *Look:* cat-headed goddess with sleek golden-tawny fur and green eyes, small
  gold hoop earrings; a turquoise-and-gold collar; she holds a sistrum (a
  ceremonial rattle); a lotus blossom behind her ear.
* *Background:* a warm home courtyard at evening with lamps.
* *Mood:* "Soft paws, sharp claws, a home well kept." Graceful, watchful.
* *Reads as:* cat head + turquoise collar.

**E06 · `god.egyptian.osiris.portrait.png` — Osiris, Rebirth & Eternity (second choice)**
* *Look:* king with green-tinted skin, a braided false beard, the tall white
  atef crown with two ostrich plumes; wrapped in white linen up to the chest;
  the crook and flail crossed over his chest.
* *Background:* lush green papyrus and a starry indigo sky.
* *Mood:* "I was scattered once. I know the way back." Serene.
* *Reads as:* green skin + white plumed crown + crook and flail.

**E07 · `god.egyptian.thoth.portrait.png` — Thoth, Knowledge & Wisdom (second choice)**
* *Look:* ibis-headed god with a long curved beak, a crescent-and-full-moon disc
  above the head; a blue-and-gold collar; he holds a scribe's palette and reed
  pen (marks are abstract, not real hieroglyphs).
* *Background:* a library of scroll niches lit by moonlight.
* *Mood:* "Write it down, and it is yours forever." Precise, wise.
* *Reads as:* ibis beak + moon disc.

**E08 · `god.egyptian.horus.portrait.png` — Horus, Kingship & Dominion (second choice)**
* *Look:* falcon-headed god (distinct from Ra: darker plumage, the falcon eye
  marking strongly drawn) wearing the red-and-white double crown; a
  gold-feathered corselet; falcon wings half-open behind.
* *Background:* high blue sky over the river valley.
* *Mood:* "Whatever flies, flies for the throne." Royal, sharp.
* *Reads as:* double crown + falcon eye marking.

**E09 · `god.egyptian.hathor.portrait.png` — Hathor, Joy & Prosperity (second choice, new)**
* *Look:* smiling woman about 30, warm brown skin, a heavy black wig, cow horns
  cradling a red-gold sun disc; a broad collar with a menat necklace
  counterweight; a golden sistrum in her hand; small turquoise flowers.
* *Background:* a festival hall glowing with lamps, gold and turquoise.
* *Mood:* "Music in the hall, gold in the treasury." Joyful, generous.
* *Reads as:* cow horns + sun disc + warm smile.

**E10 · `god.egyptian.sobek.portrait.png` — Sobek, River Power & Fertility (second choice, new)**
* *Look:* crocodile-headed god with dark-green scales and amber eyes, a sun disc
  with two tall plumes on his head; a gold and malachite collar; a was-sceptre;
  water drops on his scales.
* *Background:* the flooding Nile, reeds and green water.
* *Mood:* "The flood takes, and the flood gives more." Powerful, patient.
* *Reads as:* crocodile head + green water.

---

## 8. Japanese (10)

Shinto deities are painted in Heian/classical court and warrior dress, with
respect for their shrines; no anime styling.

**J01 · `god.japanese.amaterasu.portrait.png` — Amaterasu, Light & Prosperity (patron)**
* *Look:* radiant woman about 30, long black hair tied low, a delicate gold
  crown with sun rays; layered white and vermilion court robes with gold; a
  round bronze mirror held at her chest reflecting light.
* *Background:* sunrise bursting from a cave mouth, clouds turning gold.
* *Mood:* "Open the cave door, and the world is bright again." Serene.
* *Reads as:* sun-ray crown + bright mirror.

**J02 · `god.japanese.hachiman.portrait.png` — Hachiman, War & Guardianship (first choice)**
* *Look:* noble warrior about 40, short moustache, calm eyes; a horned kabuto
  helmet with a gold crest, lacquered red-and-black armour; a long bow held
  upright; white doves in flight behind.
* *Background:* a shrine gate (torii) in morning mist.
* *Mood:* "Draw the bow to its full length." Dignified, protective.
* *Reads as:* gold-crested helmet + bow + doves.

**J03 · `god.japanese.susanoo.portrait.png` — Susanoo, Storms & Protection (first choice)**
* *Look:* fierce man about 35, wild black hair and beard blown by wind, bare
  muscular shoulders with a dark-blue storm-patterned robe; a long straight
  sword raised at his shoulder.
* *Background:* a raging sea under lightning.
* *Mood:* "The storm that breaks the wave also shelters the bay." Untamed.
* *Reads as:* wild hair + sword + storm sea.

**J04 · `god.japanese.tsukuyomi.portrait.png` — Tsukuyomi, Night & Insight (first choice, new)**
* *Look:* pale, composed young man about 28, long silver-black hair tied with a
  white cord; layered indigo and silver court robes; a thin silver crescent
  moon ornament in his hair.
* *Background:* a full moon behind his head over dark clouds, silver light.
* *Mood:* "What the sun hides, the moon shows." Cool, quiet.
* *Reads as:* full moon halo + indigo.

**J05 · `god.japanese.benzaiten.portrait.png` — Benzaiten, Arts & Inspiration (first choice, new)**
* *Look:* graceful woman about 28, black hair in a high court style with gold
  ornaments; flowing pink and white robes; she holds a biwa (a pear-shaped
  lute); a small white snake coils gently at her wrist.
* *Background:* a lake island shrine, lotus and ripples, soft pink dawn.
* *Mood:* "Play one true note and the river answers." Gentle, inspired.
* *Reads as:* biwa lute + pink and water.

**J06 · `god.japanese.inari.portrait.png` — Inari, Prosperity & Bounty (second choice)**
* *Look:* kindly figure of no fixed gender, about 40, white and vermilion robes;
  sheaves of golden rice over one shoulder; a white fox with a red bib beside
  them, a jewel in its mouth.
* *Background:* rows of vermilion shrine gates receding into green hills.
* *Mood:* "Leave rice at the shrine; find more in the storehouse." Warm.
* *Reads as:* white fox + rice + vermilion gates.

**J07 · `god.japanese.fujin.portrait.png` — Fujin, Wind & Movement (second choice)**
* *Look:* powerful wind god with green-tinted skin, wild hair, broad grin; a
  great billowing cloth bag of wind held over his shoulders in an arc behind
  his head; a leopard-print loincloth edge.
* *Background:* swirling clouds and streaming wind.
* *Mood:* "Open the bag. Let the road come to you." Boisterous.
* *Reads as:* arched wind bag over the head.

**J08 · `god.japanese.raijin.portrait.png` — Raijin, Thunder & Power (second choice)**
* *Look:* thunder god with red-tinted skin, wild hair, small horns, a fierce
  grin; a ring of small taiko drums arcing behind his head like a halo; drum
  beaters in his hands; lightning sparks.
* *Background:* black thunderclouds lit by lightning.
* *Mood:* "Every arrow carries a little of the storm." Exuberant, loud.
* *Reads as:* ring of drums behind the head.

**J09 · `god.japanese.izanagi.portrait.png` — Izanagi, Creation & Renewal (second choice, new)**
* *Look:* dignified man about 45, long black hair tied in loops at the ears
  (ancient style), short beard; white ancient robes with a bead necklace
  (magatama); he holds a tall jewelled spear dripping seawater.
* *Background:* a primordial sea with new islands rising from mist at dawn.
* *Mood:* "Stir the sea again; new islands will rise." Steady, creative.
* *Reads as:* jewelled spear + sea + dawn islands.

**J10 · `god.japanese.izanami.portrait.png` — Izanami, Death & Rebirth (second choice, new)**
* *Look:* beautiful, sorrowful woman about 40, long black hair falling loose,
  ancient white and deep-purple robes, a magatama bead necklace; one side of
  her face lit warmly, the other in cool shadow (dignified, never decayed);
  she holds a single camellia blossom.
* *Background:* dark mist with faint glowing lanterns along a path.
* *Mood:* "Do not look back at me. Just come home." Grave, loving.
* *Reads as:* camellia + half-shadowed face + purple.

---

## 9. Celtic (10)

**C01 · `god.celtic.dagda.portrait.png` — Dagda, Abundance & Prosperity (patron)**
* *Look:* huge, genial man about 55, full brown-grey beard, ruddy face, a gold
  torc; a heavy green wool cloak; a great club over one shoulder and the rim of
  a bronze cauldron steaming beside him; a small harp at his side.
* *Background:* a feasting hall with firelight and green banners.
* *Mood:* "The cauldron is never empty for those who share it." Hearty.
* *Reads as:* big beard + cauldron + club.

**C02 · `god.celtic.morrigan.portrait.png` — Morrigan, War & Prophecy (first choice)**
* *Look:* tall woman about 35, black hair wild with raven feathers, piercing
  dark eyes, woad-blue spirals on her cheekbones; a black feathered cloak; a
  raven on her shoulder; a spear.
* *Background:* a misty battlefield at dawn, crows circling.
* *Mood:* "I have seen how this battle ends. Hurry." Fierce, foreseeing.
* *Reads as:* raven feathers + black cloak.

**C03 · `god.celtic.brigid.portrait.png` — Brigid, Hearth & Healing (first choice)**
* *Look:* woman about 30, bright flame-red hair, freckles, a green and gold
  dress, a smith's leather apron edge; a flame burning in her open palm; a
  small woven rush cross pinned at her shoulder.
* *Background:* a forge glow on one side, a clear spring well on the other.
* *Mood:* "Keep the fire lit and the door will hold." Warm, resolute.
* *Reads as:* flame-red hair + flame in hand.

**C04 · `god.celtic.nuada.portrait.png` — Nuada, Kingship & Justice (first choice, new)**
* *Look:* kingly man about 45, long fair hair and beard, a gold band crown and
  torc; a royal green cloak; his right arm is a finely made silver arm with
  knotwork engraving, raised holding a bright sword of light.
* *Background:* standing stones on a hill, sunlight through clouds.
* *Mood:* "A king stands in front. Stand with me." Noble, resolute.
* *Reads as:* silver arm + shining sword.

**C05 · `god.celtic.danu.portrait.png` — Danu, Ancestry & the Land (first choice, new)**
* *Look:* ageless mother goddess about 50, long silver-brown hair woven with ivy
  and river reeds, kind deep-green eyes; a moss-green and blue mantle with
  spiral embroidery; her hands cupped around flowing water.
* *Background:* a river winding through green hills in mist, ancient oaks.
* *Mood:* "The land remembers every child it fed." Nurturing, ancient.
* *Reads as:* ivy-woven silver hair + flowing water.

**C06 · `god.celtic.cernunnos.portrait.png` — Cernunnos, Wilds & Transformation (second choice)**
* *Look:* man about 40 with great stag antlers rising from his head, long brown
  hair, a gold torc at the throat and another held in his hand; earth-green and
  brown furs; a ram-horned serpent coiled at his arm.
* *Background:* deep forest with a shaft of green-gold light.
* *Mood:* "The small ones of the wood are fiercer than they look." Wild, calm.
* *Reads as:* antlers + torc.

**C07 · `god.celtic.epona.portrait.png` — Epona, Horses & Journeys (second choice)**
* *Look:* woman about 35, auburn hair braided for riding, a travelling cloak in
  heather purple; she rests a hand on the neck of a white mare beside her; a
  small basket of fruit or grain at her side.
* *Background:* an open road over moorland at sunrise.
* *Mood:* "Saddle up. The long road is shorter with me." Steady, kind.
* *Reads as:* white mare's head beside her.

**C08 · `god.celtic.lugh.portrait.png` — Lugh, Light & Skill (second choice)**
* *Look:* bright young man about 25, golden hair, sun-gold eyes, a fine gold
  torc and arm rings; a short multicoloured cloak; a shining spear head at his
  shoulder with sparks of light.
* *Background:* sunburst through clouds over a green valley.
* *Mood:* "Master one craft and I will teach you the rest." Confident.
* *Reads as:* gold hair + shining spear.

**C09 · `god.celtic.arawn.portrait.png` — Arawn, Underworld & the Otherworld (second choice, new)**
* *Look:* stern king about 50, dark hair and beard touched with grey, a silver
  circlet; a grey hunter's cloak with a fur mantle; a curved hunting horn at his
  belt; a white hound with red ears at his side.
* *Background:* a twilight Otherworld forest, silvery mist, pale moon.
* *Mood:* "My hounds bring back what the field takes." Severe, honourable.
* *Reads as:* white hound with red ears + grey cloak.

**C10 · `god.celtic.manannan.portrait.png` — Manannan, Seas & Mists (second choice, new)**
* *Look:* tall man about 45, sea-grey beard, wise eyes; a cloak that shifts
  colour like the sea and dissolves into mist at its edges; a silver branch
  with small apples in one hand.
* *Background:* sea mist with a white horse galloping over the waves far behind.
* *Mood:* "Step into the mist; step out where you meant to be." Mysterious.
* *Reads as:* mist cloak + silver branch.

---

## 10. Mesoamerican (10)

Paint costume and ornament in the classic Mexica (Aztec) and Maya traditions,
with care and accuracy of spirit; no sacrifice imagery, no gore.

**M01 · `god.mesoamerican.quetzalcoatl.portrait.png` — Quetzalcoatl, Wind & Wisdom (patron)**
* *Look:* wise man about 45, warm brown skin, a grand headdress of long
  quetzal-green feathers; a cut-shell "wind jewel" pectoral; jade ear spools;
  a feathered serpent coils behind his shoulders, its feathered head beside his.
* *Background:* temple-city at dawn, wind streaming through feathers.
* *Mood:* "The wind goes before the rain; wisdom goes before the harvest."
* *Reads as:* quetzal feathers + feathered serpent.

**M02 · `god.mesoamerican.huitzilopochtli.portrait.png` — Huitzilopochtli, War & Power (first choice)**
* *Look:* warrior god about 30, face painted with blue and gold bands, a
  hummingbird-shaped helmet with iridescent green feathers; a round shield with
  feather tufts; a fire-serpent (xiuhcoatl) staff glowing at his shoulder.
* *Background:* a blazing sun rising over a stepped pyramid.
* *Mood:* "The sun must fight to rise. So must you." Fiery, unstoppable.
* *Reads as:* hummingbird helmet + blue face bands.

**M03 · `god.mesoamerican.coatlicue.portrait.png` — Coatlicue, Earth & Creation (first choice)**
* *Look:* majestic earth mother of no fixed age, dark skin, calm deep eyes, a
  headdress of maize and earth-brown feathers; a mantle woven with a pattern of
  intertwined serpents (pattern only, not real snakes); jade necklaces; young
  maize growing at her shoulders.
* *Background:* volcanic mountains and fertile fields, warm earth tones.
* *Mood:* "The earth holds everything, and lets nothing fall." Immovable.
* *Reads as:* serpent-pattern mantle + maize.

**M04 · `god.mesoamerican.mixcoatl.portrait.png` — Mixcoatl, Hunt & Survival (first choice, new)**
* *Look:* lean hunter about 35, face painted with red and white stripes, a black
  mask band across the eyes; a deer-hide cape and a headdress of white eagle
  down; a bow and a quiver of arrows; a mist of stars like the Milky Way behind
  him (he is the cloud serpent).
* *Background:* night forest under a bright starry band.
* *Mood:* "Follow the deer; the deer knows the way." Patient, sharp-eyed.
* *Reads as:* red-white striped face + bow + star band.

**M05 · `god.mesoamerican.xolotl.portrait.png` — Xolotl, Journey & Underworld Guidance (first choice, new)**
* *Look:* dog-headed god in the shape of a hairless dog (xoloitzcuintle), dark
  grey skin, large ears with gold ear spools, wise eyes; a short mantle with
  step-fret pattern; a torch held aloft; the bright evening star above.
* *Background:* a dusk road descending into misty hills.
* *Mood:* "I have walked every road below. This one is short." Loyal, kind.
* *Reads as:* dog head + torch + evening star.

**M06 · `god.mesoamerican.tlaloc.portrait.png` — Tlaloc, Rain & Fertility (second choice)**
* *Look:* rain god with a blue-painted face and his traditional mask: rings
  around the eyes like goggles and a curled upper lip with fang-like ornaments;
  a headdress of white heron feathers; a jade-and-shell collar; a lightning
  staff; rain falls around him.
* *Background:* green mountains under heavy rain clouds.
* *Mood:* "The rain comes to those who remember it." Generous, awe-inspiring.
* *Reads as:* blue face + goggle rings + rain.

**M07 · `god.mesoamerican.tezcatlipoca.portrait.png` — Tezcatlipoca, Shadow & Fate (second choice)**
* *Look:* striking god about 30, face painted with black and yellow horizontal
  bands; a jaguar-pelt mantle; a polished black obsidian mirror at his temple
  that trails thin smoke; dark feathers.
* *Background:* a night sky with smoke and starlight.
* *Mood:* "Look in the smoking mirror. See who wins." Enigmatic.
* *Reads as:* black-yellow face bands + smoking mirror.

**M08 · `god.mesoamerican.xiuhtecuhtli.portrait.png` — Xiuhtecuhtli, Fire & Renewal (second choice)**
* *Look:* old fire lord, about 60, deep-lined face, a turquoise diadem and
  turquoise mosaic ear ornaments; red and yellow face paint; a fire serpent
  curling around his shoulders; a brazier flame before him.
* *Background:* a ring of new-fire torches against night.
* *Mood:* "Feed the new fire, and it gives back more." Ancient, warm.
* *Reads as:* turquoise diadem + flame.

**M09 · `god.mesoamerican.chalchiuhtlicue.portrait.png` — Chalchiuhtlicue, Waters & Healing (second choice, new)**
* *Look:* serene woman about 30, warm brown skin, a headdress of blue-green
  cotton bands and white tassels, jade ear spools; a jade-green skirt and cape
  that flows into running water; a jade necklace; water lilies.
* *Background:* a waterfall into a turquoise pool, mist and green light.
* *Mood:* "The river washes the wound and fills the field." Gentle, flowing.
* *Reads as:* jade green + flowing water.

**M10 · `god.mesoamerican.mictlantecuhtli.portrait.png` — Mictlantecuhtli, Death & Transformation (second choice, new)**
* *Look:* the lord of the underworld, shown with a solemn skull-like face of
  pale bone (a sacred mask, dignified and still — no blood, no gore); a
  headdress of owl feathers and paper banners; dark obsidian and bone ear
  ornaments; a deep red and black mantle.
* *Background:* the dim halls of the underworld lit by blue and amber torches.
* *Mood:* "The nearer to me, the harder they fight." Majestic, solemn.
* *Reads as:* pale skull mask + owl-feather crown.

---

## 11. Checklist before delivery

* 60 files, each 1024 × 1024 PNG, named exactly as above (all start with
  `god.` and end in `.portrait.png`).
* Face, crown and attribute inside the central 88 % circle; nothing important
  in the corners.
* No text, frames, borders, signatures or watermarks.
* Each god reads by its **"reads as"** cue at 48 px.
* Gods that already appear on a pantheon board (R7) keep that board's look.

Drop the files into `assets-source/icons/final/` and run `npm run icons:import`;
`ICON_CATALOG.md` (portraits section) lists the same 60 asset IDs.
