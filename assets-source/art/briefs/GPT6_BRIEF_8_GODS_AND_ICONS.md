# Pantheon Realms — Art Brief 8 for GPT-6: GODS (portrait sheets and god-card icons)

Generated 2026-10-04 by `npm run art:briefs` from the game's content (owner request: "a document for GPT-6 with all the gods' portraits and the icons needed to make the text less, with more icons indicating the price and advantage of each god").

**Part A — 60 god portraits** on **6 sheets** (one per pantheon, ten portraits each). Every god keeps the look written for it in Brief 4 (`GPT6_BRIEF_4_GOD_PORTRAITS.md`, attach it); this brief packs them into sheets so GPT-6 paints a whole pantheon at once.

**Part B — 21 god-card icons** on **one sheet**: what a god gives (the advantage), what it costs or needs (the price) and where it stands (patron, first or second choice, committed, excluded). With them the god cards can show a row of icons with short numbers, the full sentence moving into the tooltip. (The icon row on the cards is built once these icons are delivered; until then the cards keep their sentences.)

## 1. Rules for every sheet

1. **One sheet per request**, at the size given (about 1.6 megapixels, the size GPT-6 has delivered so far) **or larger with the same proportions**. Save it under its exact file name in **`assets-source/sprites/sheets/`**.
2. **Invisible grid** of equal cells, filled left to right, rows top to bottom, exactly as listed. Every picture stays inside its own cell; nothing touches or crosses a cell edge. A cell marked *empty* stays empty.
3. **No text** of any kind: no letters, numbers, runes or glyphs that read as writing, no logos, signatures, watermarks, frames, grid lines or labels.
4. **Then:** `npm run sprites:cut -- --only <sheet name>` cuts that sheet (and only that one: the sheets already delivered keep their reviewed cuts) into its single files (a preview of each cut goes to `assets-source/sprites/sheets/_preview/` — check it), then the importer named in the sheet’s *Then* line. Nothing else changes: the game picks the files up by name.
5. **Too much for one image?** A sheet may come as two images split between rows, `<sheet>.part1.png` (upper rows) and `<sheet>.part2.png` (the rest), each with the same columns and cell shape.
6. **Style:** modern high-resolution painterly fantasy strategy art — the look of the pantheon boards and the game’s opening paintings. Not pixel art, not a photograph, not a 3D-render look, not anime, no ink outlines, no flat vector.
7. **Respect.** Gods and heroes of living and historical traditions are painted dignified and powerful — never comic, never horror; adults only, no gore, no nudity.

## Part A — God portrait sheets

Each sheet: **1536 × 1152 px**, 4 columns × 3 rows of square paintings (384 × 384), separated by thin straight black gutters (about 1 % of the width); the last two cells empty. Every painting has its own opaque background. Each portrait: head and upper chest, front or slight three-quarter view, eyes about 40 % from the top; the face, crown and attribute inside the central circle (88 % of the cell) — the game shows it in a round gold frame from 48 to 150 px. Cut into `assets-source/icons/final/<asset ID>.png`; then `npm run icons:import`.

### Greek gods · `sheet.god.greek.png`

| Field | Value |
|---|---|
| Contains | row 1, cell 1: Zeus (patron)<br>row 1, cell 2: Athena (first choice)<br>row 1, cell 3: Ares (first choice)<br>row 1, cell 4: Apollo (first choice)<br>row 2, cell 1: Artemis (first choice)<br>row 2, cell 2: Hermes (second choice)<br>row 2, cell 3: Demeter (second choice)<br>row 2, cell 4: Hades (second choice)<br>row 3, cell 1: Poseidon (second choice)<br>row 3, cell 2: Hera (second choice)<br>remaining cells: *empty* (flat black) |
| Image | 1536 × 1152 px (or larger, same proportions) — 4 columns × 3 rows, cells 384 × 384, thin black gutters |
| Attach | `support images/ChatGPT Image Sep 29, 2026, 03_35_30 PM-1.png` (pantheon board — the target look); `assets-source/art/briefs/GPT6_BRIEF_4_GOD_PORTRAITS.md`; `assets-source/ui/backgrounds/opening-greek-landscape.png` if present |
| Cuts into | `god.greek.zeus.portrait.png`, `god.greek.athena.portrait.png`, `god.greek.ares.portrait.png`, `god.greek.apollo.portrait.png`, `god.greek.artemis.portrait.png`, `god.greek.hermes.portrait.png`, `god.greek.demeter.portrait.png`, `god.greek.hades.portrait.png`, `god.greek.poseidon.portrait.png`, `god.greek.hera.portrait.png` |
| Then | `npm run sprites:cut -- --only sheet.god.greek`, then `npm run icons:import` |

```text
Paint one sheet of square god portraits for the fantasy strategy game Pantheon Realms (Greek pantheon), in the style of the attached pantheon board.
Image 1536 × 1152 px: 4 columns × 3 rows of equal square paintings separated by thin straight black gutters. No labels, no numbers, no text.
Row 1, cell 1: Zeus, Lightning & Power — mature king of the gods, about 55 in appearance, broad and powerful; thick silver-streaked dark beard and hair, a golden oak-leaf crown; white himation over one shoulder with a royal-blue meander border; a crackling gold thunderbolt held at the right shoulder; an eagle's wing edge behind. Background: storm clouds split by sunlight, lightning behind the head. Must read as: white beard + gold thunderbolt on storm blue.
Row 1, cell 2: Athena, Knowledge & Strategy — woman about 30, calm grey eyes, dark hair under a bronze Corinthian helmet pushed back with a tall blue crest; gold-scaled aegis over the shoulders with a small round boss; a spear upright beside her; a small owl on her shoulder. Background: olive branches and a marble colonnade in soft morning light. Must read as: crested helmet + owl.
Row 1, cell 3: Ares, War & Conquest — man about 35, hard jaw, short dark beard, intense eyes; bronze helmet with a red horsehair crest; bronze cuirass, a crimson cloak; a spear point and the rim of a round bronze shield at the shoulder. Background: dust and torch-lit smoke of a battlefield at dusk. Must read as: red crest + bronze on red smoke.
Row 1, cell 4: Apollo, Sun & Inspiration — young man about 25, beardless, golden curls, a laurel wreath; white chiton with a gold border, a gold sun-ray diadem behind the wreath; a golden lyre raised at his left shoulder. Background: a blazing sun disc directly behind the head (a natural halo), warm gold sky. Must read as: golden curls + sun halo + lyre.
Row 2, cell 1: Artemis, Hunt & Wilderness — young woman about 22, athletic, auburn hair tied up, a silver crescent moon on her brow; short green hunting chiton, a quiver of arrows over the shoulder; a silver bow held upright; a stag's antlers just behind her. Background: moonlit pine forest, silver mist. Must read as: silver crescent + bow on forest green.
Row 2, cell 2: Hermes, Trade & Movement — lean man about 28, short curly hair, quick smile; a winged traveller's hat (petasos), a short travelling cloak; the caduceus (staff with two intertwined snakes and small wings) at his shoulder. Background: a road winding over sunny hills, a breeze in the cloak. Must read as: winged hat + caduceus.
Row 2, cell 3: Demeter, Harvest & Abundance — woman about 45, warm brown skin, honey-brown hair under a crown of wheat ears and poppies; a saffron-and-white peplos; a golden sheaf of wheat in her arms and a small torch flame. Background: golden wheat fields under late-summer light. Must read as: wheat crown on gold.
Row 2, cell 4: Hades, Underworld & Control — man about 50, pale olive skin, black beard and hair, a dark iron crown with small gems; deep purple-black robes with a silver meander border; a two-pronged staff (bident); faint shapes of cypress trees behind. Background: a dim cavern lit by cold blue fire, the faint glint of a river. Must read as: dark crown + bident in cold blue.
Row 3, cell 1: Poseidon, Sea & Dominion — powerful man about 50, wild sea-grey beard and hair with strands of seaweed and pearls, a coral-and-gold crown; bare shoulders, a sea-green mantle; a golden trident at his shoulder. Background: a towering wave curling behind him, spray catching sunlight. Must read as: trident + wave on teal.
Row 3, cell 2: Hera, Authority & Family — regal woman about 45, dark hair under a tall gold crown (polos) and a fine white veil; royal-blue robe with gold; a fan of peacock feathers behind one shoulder; a pomegranate held in one hand. Background: a marble throne room with blue drapery. Must read as: tall gold crown + peacock eyes.
Row 3, cell 3: empty (flat black).
Row 3, cell 4: empty (flat black).
Each portrait: head and upper chest, front or slight three-quarter view, eyes about 40 % from the top; face, crown and the god's attribute inside the central circle (88 % of the cell); warm key light from the upper left, a cool rim light, a soft divine glow behind the head; the background darker toward the corners. Palette: royal blue, white marble and gold; laurel, meander borders, bronze. Dignified and powerful, never comic or frightening. No frame, no border, no text.
```

### Norse gods · `sheet.god.norse.png`

| Field | Value |
|---|---|
| Contains | row 1, cell 1: Odin (patron)<br>row 1, cell 2: Thor (first choice)<br>row 1, cell 3: Tyr (first choice)<br>row 1, cell 4: Frigg (first choice)<br>row 2, cell 1: Baldr (first choice)<br>row 2, cell 2: Freyja (second choice)<br>row 2, cell 3: Heimdall (second choice)<br>row 2, cell 4: Hel (second choice)<br>row 3, cell 1: Loki (second choice)<br>row 3, cell 2: Njord (second choice)<br>remaining cells: *empty* (flat black) |
| Image | 1536 × 1152 px (or larger, same proportions) — 4 columns × 3 rows, cells 384 × 384, thin black gutters |
| Attach | `support images/ChatGPT Image Sep 29, 2026, 03_35_32 PM-2.png` (pantheon board — the target look); `assets-source/art/briefs/GPT6_BRIEF_4_GOD_PORTRAITS.md`; `assets-source/ui/backgrounds/opening-norse-landscape.png` if present |
| Cuts into | `god.norse.odin.portrait.png`, `god.norse.thor.portrait.png`, `god.norse.tyr.portrait.png`, `god.norse.frigg.portrait.png`, `god.norse.baldr.portrait.png`, `god.norse.freyja.portrait.png`, `god.norse.heimdall.portrait.png`, `god.norse.hel.portrait.png`, `god.norse.loki.portrait.png`, `god.norse.njord.portrait.png` |
| Then | `npm run sprites:cut -- --only sheet.god.norse`, then `npm run icons:import` |

```text
Paint one sheet of square god portraits for the fantasy strategy game Pantheon Realms (Norse pantheon), in the style of the attached pantheon board.
Image 1536 × 1152 px: 4 columns × 3 rows of equal square paintings separated by thin straight black gutters. No labels, no numbers, no text.
Row 1, cell 1: Odin, Wisdom & Knowledge — old king about 65, long grey beard braided with silver rings, one eye closed by an old scar (left side of the image), the other keen and blue; a broad-brimmed dark hood or wide hat, a grey-blue cloak with fur collar; the spear Gungnir with rune-like marks; two ravens, one on each shoulder. Background: night sky with aurora over a dark forest. Must read as: one eye + ravens + grey beard.
Row 1, cell 2: Thor, Strength & Storms — massive man about 40, thick red beard braided, red hair; iron helm or bare head with a leather band; mail and fur over broad shoulders; the short hammer raised at his shoulder, lightning crawling over its head. Background: black storm clouds, a lightning fork. Must read as: red beard + hammer + lightning.
Row 1, cell 3: Tyr, Law & Honor — lean, scarred warrior about 45, short dark-blond beard, steady eyes; steel helm with a nasal guard; a sword held upright before him in his left hand; his right arm ends in a leather-bound stump at the wrist (the hand he gave for an oath), shown with dignity. Background: a stone assembly ring with banners, cold dawn light. Must read as: upright sword + steel helm.
Row 1, cell 4: Frigg, Foresight & Protection — queenly woman about 50, silver-blonde braids under a white linen veil and a slim gold circlet; a deep-blue mantle with white fur trim; a ring of household keys at her belt; she holds a distaff with spun cloud-white thread. Background: soft clouds lit from within, like a spun-silver sky. Must read as: blue mantle + spindle of cloud thread.
Row 2, cell 1: Baldr, Light & Purity — radiant young man about 25, golden hair and short golden beard, a face that seems to glow; white tunic with gold knotwork; a small sprig of mistletoe pinned at the collar; warm light falls from him rather than on him. Background: a winter sunrise breaking through snow-covered pines. Must read as: golden glow on winter white.
Row 2, cell 2: Freyja, Love & Fertility — beautiful woman about 30, long golden-red hair with braids, a necklace of gold and amber at the throat; a cloak of falcon feathers over her shoulders; a grey forest cat at her shoulder. Background: a spring meadow at the edge of snow, golden light. Must read as: amber necklace + falcon-feather cloak.
Row 2, cell 3: Heimdall, Vigilance & Alertness — tall man about 35, clean-shaven, keen eyes, fair hair tied back; a white-and-silver helm, a white cloak; a long curved gold-rimmed horn at his shoulder. Background: a shimmering rainbow bridge arching behind him into cloud. Must read as: horn + rainbow arc.
Row 2, cell 4: Hel, Death & Transition — tall woman of no clear age; her face divided softly down the middle — one half warm living skin, the other pale blue-grey like frost — shown as a graceful gradient, never decay; long black hair, a crown of black iron and frost; dark grey robes. Background: misty grey halls, faint pale-green light. Must read as: half-warm, half-frost face.
Row 3, cell 1: Loki, Trickery & Change — slender man about 30, sharp handsome features, a knowing half-smile, copper-red hair swept back, thin lips; a dark-green and black tunic with gold serpent knotwork; flickering green-gold flame dancing in one raised palm; a small snake coiled at his collar. Background: shifting firelight and shadow, half the scene green-lit. Must read as: green flame + red hair + sly smile.
Row 3, cell 2: Njord, Sea & Prosperity — weathered man about 55, salt-grey beard, kind sea-blue eyes; a sailor's wool cloak with a silver brooch, a coiled rope over one shoulder; a string of silver coins and a fish net draped on the other. Background: a calm northern harbour at golden hour, a longship's prow. Must read as: net + coins + sea-blue.
Row 3, cell 3: empty (flat black).
Row 3, cell 4: empty (flat black).
Each portrait: head and upper chest, front or slight three-quarter view, eyes about 40 % from the top; face, crown and the god's attribute inside the central circle (88 % of the cell); warm key light from the upper left, a cool rim light, a soft divine glow behind the head; the background darker toward the corners. Palette: night navy, steel silver, fur browns and ember orange; knotwork, ravens, snow. Dignified and powerful, never comic or frightening. No frame, no border, no text.
```

### Egyptian gods · `sheet.god.egyptian.png`

| Field | Value |
|---|---|
| Contains | row 1, cell 1: Ra (patron)<br>row 1, cell 2: Set (first choice)<br>row 1, cell 3: Isis (first choice)<br>row 1, cell 4: Anubis (first choice)<br>row 2, cell 1: Bastet (first choice)<br>row 2, cell 2: Osiris (second choice)<br>row 2, cell 3: Thoth (second choice)<br>row 2, cell 4: Horus (second choice)<br>row 3, cell 1: Hathor (second choice)<br>row 3, cell 2: Sobek (second choice)<br>remaining cells: *empty* (flat black) |
| Image | 1536 × 1152 px (or larger, same proportions) — 4 columns × 3 rows, cells 384 × 384, thin black gutters |
| Attach | `support images/ChatGPT Image Sep 29, 2026, 03_35_35 PM-3.png` (pantheon board — the target look); `assets-source/art/briefs/GPT6_BRIEF_4_GOD_PORTRAITS.md`; `assets-source/ui/backgrounds/opening-egyptian-landscape.png` if present |
| Cuts into | `god.egyptian.ra.portrait.png`, `god.egyptian.set.portrait.png`, `god.egyptian.isis.portrait.png`, `god.egyptian.anubis.portrait.png`, `god.egyptian.bastet.portrait.png`, `god.egyptian.osiris.portrait.png`, `god.egyptian.thoth.portrait.png`, `god.egyptian.horus.portrait.png`, `god.egyptian.hathor.portrait.png`, `god.egyptian.sobek.portrait.png` |
| Then | `npm run sprites:cut -- --only sheet.god.egyptian`, then `npm run icons:import` |

```text
Paint one sheet of square god portraits for the fantasy strategy game Pantheon Realms (Egyptian pantheon), in the style of the attached pantheon board.
Image 1536 × 1152 px: 4 columns × 3 rows of equal square paintings separated by thin straight black gutters. No labels, no numbers, no text.
Row 1, cell 1: Ra, Sun & Vitality — falcon-headed god with keen gold eyes; a blazing sun disc encircled by a rearing cobra (uraeus) above his head; a broad gold-and-lapis collar; a was-sceptre at his shoulder. Background: the desert horizon at sunrise, rays fanning out. Must read as: falcon head + sun disc.
Row 1, cell 2: Set, Chaos & Strength — god with the head of the Set animal (long curved snout, tall square-tipped ears), red-brown fur; a red and gold collar; a was-sceptre. Background: a red desert sandstorm. Must read as: square-tipped ears on red storm.
Row 1, cell 3: Isis, Magic & Healing — woman about 30, deep-brown skin, kohl-lined eyes, black braided wig under a vulture headdress topped with cow horns and a sun disc; great feathered wings of turquoise and lapis spread behind her shoulders; an ankh. Background: the Nile at dusk, a faint star field. Must read as: spread blue wings + horns and sun disc.
Row 1, cell 4: Anubis, Funerary Protection — jackal-headed god with glossy black fur and gold-rimmed ears; a gold broad collar with lapis inlay, a white linen kilt edge; he holds a small set of golden balance scales with a feather on one pan. Background: torch-lit tomb hall, gold and deep blue. Must read as: black jackal head + gold scales.
Row 2, cell 1: Bastet, Grace & Protection — cat-headed goddess with sleek golden-tawny fur and green eyes, small gold hoop earrings; a turquoise-and-gold collar; she holds a sistrum (a ceremonial rattle); a lotus blossom behind her ear. Background: a warm home courtyard at evening with lamps. Must read as: cat head + turquoise collar.
Row 2, cell 2: Osiris, Rebirth & Eternity — king with green-tinted skin, a braided false beard, the tall white atef crown with two ostrich plumes; wrapped in white linen up to the chest; the crook and flail crossed over his chest. Background: lush green papyrus and a starry indigo sky. Must read as: green skin + white plumed crown + crook and flail.
Row 2, cell 3: Thoth, Knowledge & Wisdom — ibis-headed god with a long curved beak, a crescent-and-full-moon disc above the head; a blue-and-gold collar; he holds a scribe's palette and reed pen (marks are abstract, not real hieroglyphs). Background: a library of scroll niches lit by moonlight. Must read as: ibis beak + moon disc.
Row 2, cell 4: Horus, Kingship & Dominion — falcon-headed god (distinct from Ra: darker plumage, the falcon eye marking strongly drawn) wearing the red-and-white double crown; a gold-feathered corselet; falcon wings half-open behind. Background: high blue sky over the river valley. Must read as: double crown + falcon eye marking.
Row 3, cell 1: Hathor, Joy & Prosperity — smiling woman about 30, warm brown skin, a heavy black wig, cow horns cradling a red-gold sun disc; a broad collar with a menat necklace counterweight; a golden sistrum in her hand; small turquoise flowers. Background: a festival hall glowing with lamps, gold and turquoise. Must read as: cow horns + sun disc + warm smile.
Row 3, cell 2: Sobek, River Power & Fertility — crocodile-headed god with dark-green scales and amber eyes, a sun disc with two tall plumes on his head; a gold and malachite collar; a was-sceptre; water drops on his scales. Background: the flooding Nile, reeds and green water. Must read as: crocodile head + green water.
Row 3, cell 3: empty (flat black).
Row 3, cell 4: empty (flat black).
Each portrait: head and upper chest, front or slight three-quarter view, eyes about 40 % from the top; face, crown and the god's attribute inside the central circle (88 % of the cell); warm key light from the upper left, a cool rim light, a soft divine glow behind the head; the background darker toward the corners. Palette: sand gold, white linen, lapis blue and carnelian; sun discs, spread wings, broad collars. Dignified and powerful, never comic or frightening. No frame, no border, no text.
```

### Japanese gods · `sheet.god.japanese.png`

| Field | Value |
|---|---|
| Contains | row 1, cell 1: Amaterasu (patron)<br>row 1, cell 2: Hachiman (first choice)<br>row 1, cell 3: Susanoo (first choice)<br>row 1, cell 4: Tsukuyomi (first choice)<br>row 2, cell 1: Benzaiten (first choice)<br>row 2, cell 2: Inari (second choice)<br>row 2, cell 3: Fujin (second choice)<br>row 2, cell 4: Raijin (second choice)<br>row 3, cell 1: Izanagi (second choice)<br>row 3, cell 2: Izanami (second choice)<br>remaining cells: *empty* (flat black) |
| Image | 1536 × 1152 px (or larger, same proportions) — 4 columns × 3 rows, cells 384 × 384, thin black gutters |
| Attach | `support images/ChatGPT Image Sep 29, 2026, 03_35_37 PM-4.png` (pantheon board — the target look); `assets-source/art/briefs/GPT6_BRIEF_4_GOD_PORTRAITS.md`; `assets-source/ui/backgrounds/opening-japanese-landscape.png` if present |
| Cuts into | `god.japanese.amaterasu.portrait.png`, `god.japanese.hachiman.portrait.png`, `god.japanese.susanoo.portrait.png`, `god.japanese.tsukuyomi.portrait.png`, `god.japanese.benzaiten.portrait.png`, `god.japanese.inari.portrait.png`, `god.japanese.fujin.portrait.png`, `god.japanese.raijin.portrait.png`, `god.japanese.izanagi.portrait.png`, `god.japanese.izanami.portrait.png` |
| Then | `npm run sprites:cut -- --only sheet.god.japanese`, then `npm run icons:import` |

```text
Paint one sheet of square god portraits for the fantasy strategy game Pantheon Realms (Japanese pantheon), in the style of the attached pantheon board.
Image 1536 × 1152 px: 4 columns × 3 rows of equal square paintings separated by thin straight black gutters. No labels, no numbers, no text.
Row 1, cell 1: Amaterasu, Light & Prosperity — radiant woman about 30, long black hair tied low, a delicate gold crown with sun rays; layered white and vermilion court robes with gold; a round bronze mirror held at her chest reflecting light. Background: sunrise bursting from a cave mouth, clouds turning gold. Must read as: sun-ray crown + bright mirror.
Row 1, cell 2: Hachiman, War & Guardianship — noble warrior about 40, short moustache, calm eyes; a horned kabuto helmet with a gold crest, lacquered red-and-black armour; a long bow held upright; white doves in flight behind. Background: a shrine gate (torii) in morning mist. Must read as: gold-crested helmet + bow + doves.
Row 1, cell 3: Susanoo, Storms & Protection — fierce man about 35, wild black hair and beard blown by wind, bare muscular shoulders with a dark-blue storm-patterned robe; a long straight sword raised at his shoulder. Background: a raging sea under lightning. Must read as: wild hair + sword + storm sea.
Row 1, cell 4: Tsukuyomi, Night & Insight — pale, composed young man about 28, long silver-black hair tied with a white cord; layered indigo and silver court robes; a thin silver crescent moon ornament in his hair. Background: a full moon behind his head over dark clouds, silver light. Must read as: full moon halo + indigo.
Row 2, cell 1: Benzaiten, Arts & Inspiration — graceful woman about 28, black hair in a high court style with gold ornaments; flowing pink and white robes; she holds a biwa (a pear-shaped lute); a small white snake coils gently at her wrist. Background: a lake island shrine, lotus and ripples, soft pink dawn. Must read as: biwa lute + pink and water.
Row 2, cell 2: Inari, Prosperity & Bounty — kindly figure of no fixed gender, about 40, white and vermilion robes; sheaves of golden rice over one shoulder; a white fox with a red bib beside them, a jewel in its mouth. Background: rows of vermilion shrine gates receding into green hills. Must read as: white fox + rice + vermilion gates.
Row 2, cell 3: Fujin, Wind & Movement — powerful wind god with green-tinted skin, wild hair, broad grin; a great billowing cloth bag of wind held over his shoulders in an arc behind his head; a leopard-print loincloth edge. Background: swirling clouds and streaming wind. Must read as: arched wind bag over the head.
Row 2, cell 4: Raijin, Thunder & Power — thunder god with red-tinted skin, wild hair, small horns, a fierce grin; a ring of small taiko drums arcing behind his head like a halo; drum beaters in his hands; lightning sparks. Background: black thunderclouds lit by lightning. Must read as: ring of drums behind the head.
Row 3, cell 1: Izanagi, Creation & Renewal — dignified man about 45, long black hair tied in loops at the ears (ancient style), short beard; white ancient robes with a bead necklace (magatama); he holds a tall jewelled spear dripping seawater. Background: a primordial sea with new islands rising from mist at dawn. Must read as: jewelled spear + sea + dawn islands.
Row 3, cell 2: Izanami, Death & Rebirth — beautiful, sorrowful woman about 40, long black hair falling loose, ancient white and deep-purple robes, a magatama bead necklace; one side of her face lit warmly, the other in cool shadow (dignified, never decayed); she holds a single camellia blossom. Background: dark mist with faint glowing lanterns along a path. Must read as: camellia + half-shadowed face + purple.
Row 3, cell 3: empty (flat black).
Row 3, cell 4: empty (flat black).
Each portrait: head and upper chest, front or slight three-quarter view, eyes about 40 % from the top; face, crown and the god's attribute inside the central circle (88 % of the cell); warm key light from the upper left, a cool rim light, a soft divine glow behind the head; the background darker toward the corners. Palette: vermilion, black lacquer and white with cherry pink and gold; clouds, waves, lacquered armour. Dignified and powerful, never comic or frightening. No frame, no border, no text.
```

### Celtic gods · `sheet.god.celtic.png`

| Field | Value |
|---|---|
| Contains | row 1, cell 1: Dagda (patron)<br>row 1, cell 2: Morrigan (first choice)<br>row 1, cell 3: Brigid (first choice)<br>row 1, cell 4: Nuada (first choice)<br>row 2, cell 1: Danu (first choice)<br>row 2, cell 2: Cernunnos (second choice)<br>row 2, cell 3: Epona (second choice)<br>row 2, cell 4: Lugh (second choice)<br>row 3, cell 1: Arawn (second choice)<br>row 3, cell 2: Manannan (second choice)<br>remaining cells: *empty* (flat black) |
| Image | 1536 × 1152 px (or larger, same proportions) — 4 columns × 3 rows, cells 384 × 384, thin black gutters |
| Attach | `support images/ChatGPT Image Sep 29, 2026, 03_35_41 PM-5.png` (pantheon board — the target look); `assets-source/art/briefs/GPT6_BRIEF_4_GOD_PORTRAITS.md`; `assets-source/ui/backgrounds/opening-celtic-landscape.png` if present |
| Cuts into | `god.celtic.dagda.portrait.png`, `god.celtic.morrigan.portrait.png`, `god.celtic.brigid.portrait.png`, `god.celtic.nuada.portrait.png`, `god.celtic.danu.portrait.png`, `god.celtic.cernunnos.portrait.png`, `god.celtic.epona.portrait.png`, `god.celtic.lugh.portrait.png`, `god.celtic.arawn.portrait.png`, `god.celtic.manannan.portrait.png` |
| Then | `npm run sprites:cut -- --only sheet.god.celtic`, then `npm run icons:import` |

```text
Paint one sheet of square god portraits for the fantasy strategy game Pantheon Realms (Celtic pantheon), in the style of the attached pantheon board.
Image 1536 × 1152 px: 4 columns × 3 rows of equal square paintings separated by thin straight black gutters. No labels, no numbers, no text.
Row 1, cell 1: Dagda, Abundance & Prosperity — huge, genial man about 55, full brown-grey beard, ruddy face, a gold torc; a heavy green wool cloak; a great club over one shoulder and the rim of a bronze cauldron steaming beside him; a small harp at his side. Background: a feasting hall with firelight and green banners. Must read as: big beard + cauldron + club.
Row 1, cell 2: Morrigan, War & Prophecy — tall woman about 35, black hair wild with raven feathers, piercing dark eyes, woad-blue spirals on her cheekbones; a black feathered cloak; a raven on her shoulder; a spear. Background: a misty battlefield at dawn, crows circling. Must read as: raven feathers + black cloak.
Row 1, cell 3: Brigid, Hearth & Healing — woman about 30, bright flame-red hair, freckles, a green and gold dress, a smith's leather apron edge; a flame burning in her open palm; a small woven rush cross pinned at her shoulder. Background: a forge glow on one side, a clear spring well on the other. Must read as: flame-red hair + flame in hand.
Row 1, cell 4: Nuada, Kingship & Justice — kingly man about 45, long fair hair and beard, a gold band crown and torc; a royal green cloak; his right arm is a finely made silver arm with knotwork engraving, raised holding a bright sword of light. Background: standing stones on a hill, sunlight through clouds. Must read as: silver arm + shining sword.
Row 2, cell 1: Danu, Ancestry & the Land — ageless mother goddess about 50, long silver-brown hair woven with ivy and river reeds, kind deep-green eyes; a moss-green and blue mantle with spiral embroidery; her hands cupped around flowing water. Background: a river winding through green hills in mist, ancient oaks. Must read as: ivy-woven silver hair + flowing water.
Row 2, cell 2: Cernunnos, Wilds & Transformation — man about 40 with great stag antlers rising from his head, long brown hair, a gold torc at the throat and another held in his hand; earth-green and brown furs; a ram-horned serpent coiled at his arm. Background: deep forest with a shaft of green-gold light. Must read as: antlers + torc.
Row 2, cell 3: Epona, Horses & Journeys — woman about 35, auburn hair braided for riding, a travelling cloak in heather purple; she rests a hand on the neck of a white mare beside her; a small basket of fruit or grain at her side. Background: an open road over moorland at sunrise. Must read as: white mare's head beside her.
Row 2, cell 4: Lugh, Light & Skill — bright young man about 25, golden hair, sun-gold eyes, a fine gold torc and arm rings; a short multicoloured cloak; a shining spear head at his shoulder with sparks of light. Background: sunburst through clouds over a green valley. Must read as: gold hair + shining spear.
Row 3, cell 1: Arawn, Underworld & the Otherworld — stern king about 50, dark hair and beard touched with grey, a silver circlet; a grey hunter's cloak with a fur mantle; a curved hunting horn at his belt; a white hound with red ears at his side. Background: a twilight Otherworld forest, silvery mist, pale moon. Must read as: white hound with red ears + grey cloak.
Row 3, cell 2: Manannan, Seas & Mists — tall man about 45, sea-grey beard, wise eyes; a cloak that shifts colour like the sea and dissolves into mist at its edges; a silver branch with small apples in one hand. Background: sea mist with a white horse galloping over the waves far behind. Must read as: mist cloak + silver branch.
Row 3, cell 3: empty (flat black).
Row 3, cell 4: empty (flat black).
Each portrait: head and upper chest, front or slight three-quarter view, eyes about 40 % from the top; face, crown and the god's attribute inside the central circle (88 % of the cell); warm key light from the upper left, a cool rim light, a soft divine glow behind the head; the background darker toward the corners. Palette: forest green and gold with grey stone, woad blue and heather; spirals, torcs, mist. Dignified and powerful, never comic or frightening. No frame, no border, no text.
```

### Mesoamerican gods · `sheet.god.mesoamerican.png`

| Field | Value |
|---|---|
| Contains | row 1, cell 1: Quetzalcoatl (patron)<br>row 1, cell 2: Huitzilopochtli (first choice)<br>row 1, cell 3: Coatlicue (first choice)<br>row 1, cell 4: Mixcoatl (first choice)<br>row 2, cell 1: Xolotl (first choice)<br>row 2, cell 2: Tlaloc (second choice)<br>row 2, cell 3: Tezcatlipoca (second choice)<br>row 2, cell 4: Xiuhtecuhtli (second choice)<br>row 3, cell 1: Chalchiuhtlicue (second choice)<br>row 3, cell 2: Mictlantecuhtli (second choice)<br>remaining cells: *empty* (flat black) |
| Image | 1536 × 1152 px (or larger, same proportions) — 4 columns × 3 rows, cells 384 × 384, thin black gutters |
| Attach | `support images/ChatGPT Image Sep 29, 2026, 03_35_45 PM-6.png` (pantheon board — the target look); `assets-source/art/briefs/GPT6_BRIEF_4_GOD_PORTRAITS.md`; `assets-source/ui/backgrounds/opening-mesoamerican-landscape.png` if present |
| Cuts into | `god.mesoamerican.quetzalcoatl.portrait.png`, `god.mesoamerican.huitzilopochtli.portrait.png`, `god.mesoamerican.coatlicue.portrait.png`, `god.mesoamerican.mixcoatl.portrait.png`, `god.mesoamerican.xolotl.portrait.png`, `god.mesoamerican.tlaloc.portrait.png`, `god.mesoamerican.tezcatlipoca.portrait.png`, `god.mesoamerican.xiuhtecuhtli.portrait.png`, `god.mesoamerican.chalchiuhtlicue.portrait.png`, `god.mesoamerican.mictlantecuhtli.portrait.png` |
| Then | `npm run sprites:cut -- --only sheet.god.mesoamerican`, then `npm run icons:import` |

```text
Paint one sheet of square god portraits for the fantasy strategy game Pantheon Realms (Mesoamerican pantheon), in the style of the attached pantheon board.
Image 1536 × 1152 px: 4 columns × 3 rows of equal square paintings separated by thin straight black gutters. No labels, no numbers, no text.
Row 1, cell 1: Quetzalcoatl, Wind & Wisdom — wise man about 45, warm brown skin, a grand headdress of long quetzal-green feathers; a cut-shell "wind jewel" pectoral; jade ear spools; a feathered serpent coils behind his shoulders, its feathered head beside his. Background: temple-city at dawn, wind streaming through feathers. Must read as: quetzal feathers + feathered serpent.
Row 1, cell 2: Huitzilopochtli, War & Power — warrior god about 30, face painted with blue and gold bands, a hummingbird-shaped helmet with iridescent green feathers; a round shield with feather tufts; a fire-serpent (xiuhcoatl) staff glowing at his shoulder. Background: a blazing sun rising over a stepped pyramid. Must read as: hummingbird helmet + blue face bands.
Row 1, cell 3: Coatlicue, Earth & Creation — majestic earth mother of no fixed age, dark skin, calm deep eyes, a headdress of maize and earth-brown feathers; a mantle woven with a pattern of intertwined serpents (pattern only, not real snakes); jade necklaces; young maize growing at her shoulders. Background: volcanic mountains and fertile fields, warm earth tones. Must read as: serpent-pattern mantle + maize.
Row 1, cell 4: Mixcoatl, Hunt & Survival — lean hunter about 35, face painted with red and white stripes, a black mask band across the eyes; a deer-hide cape and a headdress of white eagle down; a bow and a quiver of arrows; a mist of stars like the Milky Way behind him (he is the cloud serpent). Background: night forest under a bright starry band. Must read as: red-white striped face + bow + star band.
Row 2, cell 1: Xolotl, Journey & Underworld Guidance — dog-headed god in the shape of a hairless dog (xoloitzcuintle), dark grey skin, large ears with gold ear spools, wise eyes; a short mantle with step-fret pattern; a torch held aloft; the bright evening star above. Background: a dusk road descending into misty hills. Must read as: dog head + torch + evening star.
Row 2, cell 2: Tlaloc, Rain & Fertility — rain god with a blue-painted face and his traditional mask: rings around the eyes like goggles and a curled upper lip with fang-like ornaments; a headdress of white heron feathers; a jade-and-shell collar; a lightning staff; rain falls around him. Background: green mountains under heavy rain clouds. Must read as: blue face + goggle rings + rain.
Row 2, cell 3: Tezcatlipoca, Shadow & Fate — striking god about 30, face painted with black and yellow horizontal bands; a jaguar-pelt mantle; a polished black obsidian mirror at his temple that trails thin smoke; dark feathers. Background: a night sky with smoke and starlight. Must read as: black-yellow face bands + smoking mirror.
Row 2, cell 4: Xiuhtecuhtli, Fire & Renewal — old fire lord, about 60, deep-lined face, a turquoise diadem and turquoise mosaic ear ornaments; red and yellow face paint; a fire serpent curling around his shoulders; a brazier flame before him. Background: a ring of new-fire torches against night. Must read as: turquoise diadem + flame.
Row 3, cell 1: Chalchiuhtlicue, Waters & Healing — serene woman about 30, warm brown skin, a headdress of blue-green cotton bands and white tassels, jade ear spools; a jade-green skirt and cape that flows into running water; a jade necklace; water lilies. Background: a waterfall into a turquoise pool, mist and green light. Must read as: jade green + flowing water.
Row 3, cell 2: Mictlantecuhtli, Death & Transformation — the lord of the underworld, shown with a solemn skull-like face of pale bone (a sacred mask, dignified and still — no blood, no gore); a headdress of owl feathers and paper banners; dark obsidian and bone ear ornaments; a deep red and black mantle. Background: the dim halls of the underworld lit by blue and amber torches. Must read as: pale skull mask + owl-feather crown.
Row 3, cell 3: empty (flat black).
Row 3, cell 4: empty (flat black).
Each portrait: head and upper chest, front or slight three-quarter view, eyes about 40 % from the top; face, crown and the god's attribute inside the central circle (88 % of the cell); warm key light from the upper left, a cool rim light, a soft divine glow behind the head; the background darker toward the corners. Palette: turquoise and crimson with jade and gold; quetzal feathers, step-fret patterns, jade. Dignified and powerful, never comic or frightening. No frame, no border, no text.
```

## Part B — God-card icons (one sheet)

The god cards today repeat sentences such as “+1 Attack for your commanders” or “Needs the Grand Temple and City Hall, 25 Favor”. With these icons a card reads as a row of symbols: the **price** (Favor coin + number, then the buildings it needs), the **advantages** (the icon of what improves — attack, defense, spell power, knowledge, morale, luck, movement, vision, mana, a resource — combined with *who* gets it, and a number), and the **state** (patron, first or second choice, committed, excluded). The attribute, morale, luck, movement, vision, mana and resource icons already exist in the game; this sheet adds the rest.

| Icon | Asset ID | Group | What it tells the player | Draw |
|---|---|---|---|---|
| Your heroes | `icon.bless.commanders` | advantage | the blessing applies to your heroes (commanders) | a crested hero’s helmet seen from the front, gold rim, a small laurel at the brow |
| Your armies | `icon.bless.armies` | advantage | the blessing applies to all your armies (morale, luck) | a tall war banner on a pole with a forked swallow-tail flag streaming in the wind |
| Your creatures | `icon.bless.creatures` | advantage | the blessing applies to your creatures (with a tier range beside it) | a single large clawed paw print pressed into gold |
| Your shooters | `icon.bless.shooters` | advantage | the blessing applies to your shooters | a recurved bow fully drawn with an arrow on the string, aimed up and right |
| Your flyers | `icon.bless.flyers` | advantage | the blessing applies to your flying creatures | one great spread feathered wing, pale gold with blue tips |
| Weekly growth | `icon.bless.growth` | advantage | more creatures appear in your dwellings each week | an arched dwelling doorway with a green shoot springing from its threshold and three small upward chevrons above it |
| Recovery after victory | `icon.bless.recovery` | advantage | after a battle you win, stacks regain part of their losses | a small rising spirit flame inside a curved arrow that circles back on itself |
| Spell to learn | `icon.bless.spell_unlock` | advantage | a spell becomes learnable at your library | an open book with a glowing golden key lying across its pages |
| Daily income | `icon.bless.daily_income` | advantage | an income every day (shown with the resource icon) | three stacked coins under the rim of a rising sun with short rays |
| Richer offerings | `icon.bless.offering` | advantage | offerings at the Temple yield more Favor | a bronze altar bowl holding coins, a bright golden spark rising from it |
| Fury of the wounded | `icon.bless.fury` | advantage | stacks at half strength or less attack harder | a cracked round shield with a red-orange flame bursting through the crack |
| Temple needed | `icon.req.temple` | price | needs a Temple (level 1) in one town | a small classical temple front: four columns under a triangular roof, gold on stone |
| Grand Temple needed | `icon.req.grand_temple` | price | needs the Temple’s second level | the same temple front grown taller: a second storey of columns and a sun disc on the roof |
| City Hall needed | `icon.req.city_hall` | price | needs the third level of the civic hall | a domed civic hall with a short bell tower and a flag on top |
| After the first choice | `icon.req.after_first` | price | available only after your first choice | one golden gem on the left joined by a short glowing line to a second, unlit gem on the right |
| Patron | `icon.god.patron` | choice | your patron god (from the start) | a golden laurel crown with a small sun at its front |
| First choice | `icon.god.first_choice` | choice | one of the gods of your first choice | a single faceted golden star-gem with a soft glow |
| Second choice | `icon.god.second_choice` | choice | one of the gods of your second choice | two faceted golden star-gems side by side with a soft glow |
| Committed | `icon.god.committed` | choice | you have committed to this god | a round golden seal with a ribbon tied in a bow below it, glowing warmly |
| Excluded | `icon.god.excluded` | choice | another god of this choice was chosen | a grey chain broken in the middle, its two links falling apart |
| Permanent | `icon.god.permanent` | choice | the choice cannot be undone | a closed bronze padlock wrapped by a laurel sprig |

| Field | Value |
|---|---|
| Sheet file | `sheet.icons.gods.png` |
| Contains | 1.1 Your heroes · 1.2 Your armies · 1.3 Your creatures · 1.4 Your shooters · 1.5 Your flyers · 2.1 Weekly growth · 2.2 Recovery after victory · 2.3 Spell to learn · 2.4 Daily income · 2.5 Richer offerings · 3.1 Fury of the wounded · 3.2 Temple needed · 3.3 Grand Temple needed · 3.4 City Hall needed · 3.5 After the first choice · 4.1 Patron · 4.2 First choice · 4.3 Second choice · 4.4 Committed · 4.5 Excluded · 5.1 Permanent · the last 4 cells *empty* |
| Image | 1280 × 1280 px (or larger, same proportions) — 5 columns × 5 rows, cells 256 × 256 |
| Background | Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else). |
| Attach | `assets-runtime/ui/icons/final/attr.attack.png`, `assets-runtime/ui/icons/final/res.favor.png` (the existing icon style to match) |
| Cuts into | `icon.bless.commanders.png`, `icon.bless.armies.png`, `icon.bless.creatures.png`, `icon.bless.shooters.png`, `icon.bless.flyers.png`, `icon.bless.growth.png`, `icon.bless.recovery.png`, `icon.bless.spell_unlock.png`, `icon.bless.daily_income.png`, `icon.bless.offering.png`, `icon.bless.fury.png`, `icon.req.temple.png`, `icon.req.grand_temple.png`, `icon.req.city_hall.png`, `icon.req.after_first.png`, `icon.god.patron.png`, `icon.god.first_choice.png`, `icon.god.second_choice.png`, `icon.god.committed.png`, `icon.god.excluded.png`, `icon.god.permanent.png` |
| Then | `npm run sprites:cut -- --only sheet.icons.gods`, then `npm run icons:import` |

```text
Paint one sheet of game interface icons for the fantasy strategy game Pantheon Realms, in the style of the attached icons: a single object per icon, painted in rich gold, bronze and jewel colours with a soft rim light, slightly three-quarter view, crisp silhouette readable at 24 px.
Image 1280 × 1280 px: an invisible grid of 5 columns × 5 rows of equal cells. Each icon centred in its cell, filling about 75 % of it. No grid lines, no labels, no numbers, no letters, no text. Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else).
Row 1, cell 1: a crested hero’s helmet seen from the front, gold rim, a small laurel at the brow.
Row 1, cell 2: a tall war banner on a pole with a forked swallow-tail flag streaming in the wind.
Row 1, cell 3: a single large clawed paw print pressed into gold.
Row 1, cell 4: a recurved bow fully drawn with an arrow on the string, aimed up and right.
Row 1, cell 5: one great spread feathered wing, pale gold with blue tips.
Row 2, cell 1: an arched dwelling doorway with a green shoot springing from its threshold and three small upward chevrons above it.
Row 2, cell 2: a small rising spirit flame inside a curved arrow that circles back on itself.
Row 2, cell 3: an open book with a glowing golden key lying across its pages.
Row 2, cell 4: three stacked coins under the rim of a rising sun with short rays.
Row 2, cell 5: a bronze altar bowl holding coins, a bright golden spark rising from it.
Row 3, cell 1: a cracked round shield with a red-orange flame bursting through the crack.
Row 3, cell 2: a small classical temple front: four columns under a triangular roof, gold on stone.
Row 3, cell 3: the same temple front grown taller: a second storey of columns and a sun disc on the roof.
Row 3, cell 4: a domed civic hall with a short bell tower and a flag on top.
Row 3, cell 5: one golden gem on the left joined by a short glowing line to a second, unlit gem on the right.
Row 4, cell 1: a golden laurel crown with a small sun at its front.
Row 4, cell 2: a single faceted golden star-gem with a soft glow.
Row 4, cell 3: two faceted golden star-gems side by side with a soft glow.
Row 4, cell 4: a round golden seal with a ribbon tied in a bow below it, glowing warmly.
Row 4, cell 5: a grey chain broken in the middle, its two links falling apart.
Row 5, cell 1: a closed bronze padlock wrapped by a laurel sprig.
Row 5, cell 2: empty.
Row 5, cell 3: empty.
Row 5, cell 4: empty.
Row 5, cell 5: empty.
```

## Checklist

* 6 god sheets and 1 icon sheet, named exactly as above, in `assets-source/sprites/sheets/`.
* Portraits: opaque, black gutters, nothing important outside the central circle; icons: transparent, one object per cell, no text.
* `npm run sprites:cut -- --only <sheet name>` for each new sheet (check the previews), then `npm run icons:import`.
