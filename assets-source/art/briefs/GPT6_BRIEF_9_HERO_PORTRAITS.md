# Pantheon Realms — Art Brief 9 for GPT-6: HERO PORTRAITS

Generated 2026-10-04 by `npm run art:briefs` (owner request: "a list for the heroes' portraits"). **74 heroes** — the hireable heroes of every pantheon (with the twelve proposed on 2026-10-04), the campaign heroes and the campaign opponents — on **6 sheets**, one per pantheon. Today every hero shows a generated stand-in bust.

**Where they appear:** the hero list on the map, the Tavern, the hero screen, battle headers, the Encyclopedia and the encounter panel, in a square gold frame from 40 to 160 px.

## 1. Rules for every sheet

1. **One sheet per request**, at the size given (about 1.6 megapixels, the size GPT-6 has delivered so far) **or larger with the same proportions**. Save it under its exact file name in **`assets-source/sprites/sheets/`**.
2. **Invisible grid** of equal cells, filled left to right, rows top to bottom, exactly as listed. Every picture stays inside its own cell; nothing touches or crosses a cell edge. A cell marked *empty* stays empty.
3. **No text** of any kind: no letters, numbers, runes or glyphs that read as writing, no logos, signatures, watermarks, frames, grid lines or labels.
4. **Then:** `npm run sprites:cut -- --only <sheet name>` cuts that sheet (and only that one: the sheets already delivered keep their reviewed cuts) into its single files (a preview of each cut goes to `assets-source/sprites/sheets/_preview/` — check it), then the importer named in the sheet’s *Then* line. Nothing else changes: the game picks the files up by name.
5. **Too much for one image?** A sheet may come as two images split between rows, `<sheet>.part1.png` (upper rows) and `<sheet>.part2.png` (the rest), each with the same columns and cell shape.
6. **Style:** modern high-resolution painterly fantasy strategy art — the look of the pantheon boards and the game’s opening paintings. Not pixel art, not a photograph, not a 3D-render look, not anime, no ink outlines, no flat vector.
7. **Respect.** Gods and heroes of living and historical traditions are painted dignified and powerful — never comic, never horror; adults only, no gore, no nudity.

Each sheet: **1536 px wide**, 4 columns of square paintings (384 × 384) and as many rows as the pantheon needs, separated by thin straight black gutters; each painting with its own opaque background in the pantheon’s colours. Each portrait: head and shoulders of the hero in their gear, three-quarter view facing slightly right, eyes about 40 % from the top, readable at 40 px. Where a dialogue bust of the same character exists (story art), attach it and keep that face, hair and costume. Cut into `assets-source/icons/final/<asset ID>.png`; then `npm run icons:import`.

### Greek heroes · `sheet.heroportrait.greek.png`

| Field | Value |
|---|---|
| Contains | row 1, cell 1: Achilles — Swift Champion (Champion; hireable)<br>row 1, cell 2: Atalanta — Huntress of Arcadia (Strategos; hireable)<br>row 1, cell 3: Heracles — Hero of Labors (Champion; hireable)<br>row 1, cell 4: Odysseus — Cunning Voyager (Strategos; hireable)<br>row 2, cell 1: Perseus — Slayer of the Gorgon (Oracle; hireable)<br>row 2, cell 2: Alexios — Strategos of Asterion (Strategos; campaign)<br>row 2, cell 3: Melas — Former Coastal Commander (Champion; enemy)<br>row 2, cell 4: Scout Captain — Plateau Patrol (Champion; enemy) |
| Image | 1536 × 768 px (or larger, same proportions) — 4 columns × 2 rows, cells 384 × 384, thin black gutters |
| Attach | `support images/ChatGPT Image Sep 29, 2026, 03_35_30 PM-1.png` (pantheon board); `support images/heros_full_view/ChatGPT Image Oct 1, 2026, 01_27_31 PM-1.png` (the pantheon’s mounted hero — armour and colours); `assets-source/art/final/hero.greek.alexios.bust.png` (dialogue bust of the same character); `assets-source/art/final/hero.greek.melas.bust.png` (dialogue bust of the same character) |
| Cuts into | `hero.greek.achilles.portrait.png`, `hero.greek.atalanta.portrait.png`, `hero.greek.heracles.portrait.png`, `hero.greek.odysseus.portrait.png`, `hero.greek.perseus.portrait.png`, `hero.greek.alexios.portrait.png`, `hero.greek.melas.portrait.png`, `hero.greek.scout_captain.portrait.png` |
| Then | `npm run sprites:cut -- --only sheet.heroportrait.greek`, then `npm run icons:import` |

```text
Paint one sheet of square hero portraits for the fantasy strategy game Pantheon Realms (Greek heroes), in the style of the attached pantheon board.
Image 1536 × 768 px: 4 columns × 2 rows of equal square paintings separated by thin straight black gutters. No labels, no numbers, no text.
Row 1, cell 1: Achilles, Swift Champion — a Champion: a front-line commander who sharpens the army’s strikes. The fastest spear of his generation, whose charge breaks a line before it has finished forming.
Row 1, cell 2: Atalanta, Huntress of Arcadia — a Strategos: a disciplined general whose steadiness keeps a line together. Raised by the bears of Arcadia, she outruns every hunter and never misses the first shot.
Row 1, cell 3: Heracles, Hero of Labors — a Champion: a front-line commander who sharpens the army’s strikes. A son of Zeus who finished twelve impossible labours and still walks the roads looking for a thirteenth.
Row 1, cell 4: Odysseus, Cunning Voyager — a Strategos: a disciplined general whose steadiness keeps a line together. A king of a small rocky island who took ten years to sail home and outwitted everyone who tried to stop him.
Row 2, cell 1: Perseus, Slayer of the Gorgon — a Oracle: a seer-commander who leads through divine insight and spellcraft. He cut off the Gorgon’s head with a borrowed sword and a polished shield, and keeps both close.
Row 2, cell 2: Alexios, Strategos of Asterion — a Strategos: a disciplined general whose steadiness keeps a line together. The expedition commander sent to relight the three beacons of the Asterion coast. His command portrait, skills and artifacts persist through The Three Beacons.
Row 2, cell 3: Melas, Former Coastal Commander — a Champion: a front-line commander who sharpens the army’s strikes. A former coastal commander who carried the great beacon’s lens to the storm plateau, believing one light should command the whole coast.
Row 2, cell 4: Scout Captain, Plateau Patrol — a Champion: a front-line commander who sharpens the army’s strikes. Leader of the patrol that sweeps the middle plateau between the first crossings and the ward gate.
Each portrait: head and shoulders in the hero's armour or robes, three-quarter view facing slightly right, eyes about 40 % from the top, warm key light from the upper left and a cool rim light; a soft painted background in the greek palette (royal blue, white marble and gold; laurel, meander borders, bronze). Historical and legendary figures are painted dignified, in the dress of their culture and era, never as caricatures. Adults only. No frame, no border, no text.
```

### Norse heroes · `sheet.heroportrait.norse.png`

| Field | Value |
|---|---|
| Contains | row 1, cell 1: Brynhild — Valkyrie & Devotion (Huscarl; hireable)<br>row 1, cell 2: Hervor — Ancestral Power & Vengeance (Völva; hireable)<br>row 1, cell 3: Lagertha — Leadership & Resilience (Jarl; hireable)<br>row 1, cell 4: Ragnar — Conquest & Glory (Jarl; hireable)<br>row 2, cell 1: Sigurd — Dragonslayer & Destiny (Huscarl; hireable)<br>row 2, cell 2: Barrow Captain — Warden of the Glacier Plateau (Huscarl; enemy)<br>row 2, cell 3: Bone-Helm — Captain of the Nail-ship (Huscarl; enemy)<br>row 2, cell 4: Hrafn the Hollow — Oathless Einherjar (Huscarl; enemy)<br>row 3, cell 1: The Grey Jarl — Barrow-king of the Long Winter (Huscarl; enemy)<br>row 3, cell 2: Ulfhild — Jarl of Hvitstrand (Jarl; enemy)<br>remaining cells: *empty* (flat black) |
| Image | 1536 × 1152 px (or larger, same proportions) — 4 columns × 3 rows, cells 384 × 384, thin black gutters |
| Attach | `support images/ChatGPT Image Sep 29, 2026, 03_35_32 PM-2.png` (pantheon board); `support images/heros_full_view/ChatGPT Image Oct 1, 2026, 01_27_33 PM-2.png` (the pantheon’s mounted hero — armour and colours); `assets-source/art/final/hero.norse.hervor.bust.png` (dialogue bust of the same character); `assets-source/art/final/hero.norse.barrow_captain.bust.png` (dialogue bust of the same character); `assets-source/art/final/hero.norse.bone_helm.bust.png` (dialogue bust of the same character); `assets-source/art/final/hero.norse.hrafn.bust.png` (dialogue bust of the same character); `assets-source/art/final/hero.norse.grey_jarl.bust.png` (dialogue bust of the same character); `assets-source/art/final/hero.norse.ulfhild.bust.png` (dialogue bust of the same character) |
| Cuts into | `hero.norse.brynhild.portrait.png`, `hero.norse.hervor.portrait.png`, `hero.norse.lagertha.portrait.png`, `hero.norse.ragnar.portrait.png`, `hero.norse.sigurd.portrait.png`, `hero.norse.barrow_captain.portrait.png`, `hero.norse.bone_helm.portrait.png`, `hero.norse.hrafn.portrait.png`, `hero.norse.grey_jarl.portrait.png`, `hero.norse.ulfhild.portrait.png` |
| Then | `npm run sprites:cut -- --only sheet.heroportrait.norse`, then `npm run icons:import` |

```text
Paint one sheet of square hero portraits for the fantasy strategy game Pantheon Realms (Norse heroes), in the style of the attached pantheon board.
Image 1536 × 1152 px: 4 columns × 3 rows of equal square paintings separated by thin straight black gutters. No labels, no numbers, no text.
Row 1, cell 1: Brynhild, Valkyrie & Devotion — a Huscarl: a sworn household warrior who leads from the shield wall. A shieldmaiden bound by an oath she chose herself.
Row 1, cell 2: Hervor, Ancestral Power & Vengeance — a Völva: a seeress who reads the runes and casts them in battle. She woke a grave to claim a sword; the runes have answered her since.
Row 1, cell 3: Lagertha, Leadership & Resilience — a Jarl: a war-leader whose word keeps the host together. A war-leader who has never lost a retreat she ordered.
Row 1, cell 4: Ragnar, Conquest & Glory — a Jarl: a war-leader whose word keeps the host together. A raider-king who measures a season by the harbors that answer to him.
Row 2, cell 1: Sigurd, Dragonslayer & Destiny — a Huscarl: a sworn household warrior who leads from the shield wall. A wanderer who once stood against a wyrm and now leads others against worse.
Row 2, cell 2: Barrow Captain, Warden of the Glacier Plateau — a Huscarl: a sworn household warrior who leads from the shield wall. The Grey Jarl’s oldest captain, who sweeps the plateau before the barrow-gate.
Row 2, cell 3: Bone-Helm, Captain of the Nail-ship — a Huscarl: a sworn household warrior who leads from the shield wall. Draugr captain of the ship of nails, who walks the frozen sound with his crew.
Row 2, cell 4: Hrafn the Hollow, Oathless Einherjar — a Huscarl: a sworn household warrior who leads from the shield wall. Chosen by the Valkyries once, he walked out of their hall for the Grey Jarl’s promise of a war that never ends.
Row 3, cell 1: The Grey Jarl, Barrow-king of the Long Winter — a Huscarl: a sworn household warrior who leads from the shield wall. Hrolf, a king of a thousand winters ago, swore to hold the winter under his mound in exchange for a kingdom when it ended. The winter never ended. Final opponent of The Winter Oath.
Row 3, cell 2: Ulfhild, Jarl of Hvitstrand — a Jarl: a war-leader whose word keeps the host together. A living jarl who swore to keep the Grey Jarl’s winter for a frozen sea that keeps her rivals’ ships in harbour.
Row 3, cell 3: empty (flat black).
Row 3, cell 4: empty (flat black).
Each portrait: head and shoulders in the hero's armour or robes, three-quarter view facing slightly right, eyes about 40 % from the top, warm key light from the upper left and a cool rim light; a soft painted background in the norse palette (night navy, steel silver, fur browns and ember orange; knotwork, ravens, snow). Historical and legendary figures are painted dignified, in the dress of their culture and era, never as caricatures. Adults only. No frame, no border, no text.
```

### Egyptian heroes · `sheet.heroportrait.egyptian.png`

| Field | Value |
|---|---|
| Contains | row 1, cell 1: Ahmose — Liberator of the Two Lands (Medjay; hireable)<br>row 1, cell 2: Cleopatra — Diplomat & Strategist (Vizier; hireable)<br>row 1, cell 3: Hatshepsut — Visionary Pharaoh (Vizier; hireable)<br>row 1, cell 4: Imhotep — Master Architect (Lector Priest; hireable)<br>row 2, cell 1: Nefertiti — Culture & Unity (Lector Priest; hireable)<br>row 2, cell 2: Peseshet — Overseer of Physicians (Lector Priest; hireable)<br>row 2, cell 3: Ramses — Conquering King (Medjay; hireable)<br>row 2, cell 4: Tiye — Great Royal Wife (Vizier; hireable)<br>row 3, cell 1: Seshet — Lector of the House of Life (Lector Priest; campaign)<br>row 3, cell 2: Ankhwen — Captain of the Drowned Barge (Medjay; enemy)<br>row 3, cell 3: Djedkhonsu — The Hollow Lector (Lector Priest; enemy)<br>row 3, cell 4: Hekaib — Sword of the Hollow Lector (Medjay; enemy)<br>row 4, cell 1: Iti — Warden of the Horizon (Medjay; enemy)<br>row 4, cell 2: Paser — The Red Vizier (Vizier; enemy)<br>remaining cells: *empty* (flat black) |
| Image | 1536 × 1536 px (or larger, same proportions) — 4 columns × 4 rows, cells 384 × 384, thin black gutters; may come in two parts (rows 1–2 and 3–4) |
| Attach | `support images/ChatGPT Image Sep 29, 2026, 03_35_35 PM-3.png` (pantheon board); `support images/heros_full_view/ChatGPT Image Oct 1, 2026, 01_27_35 PM-3.png` (the pantheon’s mounted hero — armour and colours); `assets-source/art/final/hero.egyptian.seshet.bust.png` (dialogue bust of the same character); `assets-source/art/final/hero.egyptian.djedkhonsu.bust.png` (dialogue bust of the same character); `assets-source/art/final/hero.egyptian.paser.bust.png` (dialogue bust of the same character) |
| Cuts into | `hero.egyptian.ahmose.portrait.png`, `hero.egyptian.cleopatra.portrait.png`, `hero.egyptian.hatshepsut.portrait.png`, `hero.egyptian.imhotep.portrait.png`, `hero.egyptian.nefertiti.portrait.png`, `hero.egyptian.peseshet.portrait.png`, `hero.egyptian.ramses.portrait.png`, `hero.egyptian.tiye.portrait.png`, `hero.egyptian.seshet.portrait.png`, `hero.egyptian.ankhwen.portrait.png`, `hero.egyptian.djedkhonsu.portrait.png`, `hero.egyptian.hekaib.portrait.png`, `hero.egyptian.iti.portrait.png`, `hero.egyptian.paser.portrait.png` |
| Then | `npm run sprites:cut -- --only sheet.heroportrait.egyptian`, then `npm run icons:import` |

```text
Paint one sheet of square hero portraits for the fantasy strategy game Pantheon Realms (Egyptian heroes), in the style of the attached pantheon board.
Image 1536 × 1536 px: 4 columns × 4 rows of equal square paintings separated by thin straight black gutters. No labels, no numbers, no text.
Row 1, cell 1: Ahmose, Liberator of the Two Lands — a Medjay: a desert scout-warrior of the royal guard who leads from the front. A young prince who took up his fallen father’s war and drove the foreign kings out of the delta. His jackal-masked guard marched at his side.
Row 1, cell 2: Cleopatra, Diplomat & Strategist — a Vizier: a royal administrator who keeps armies supplied and steady. Speaks every language at her court and wins most battles before they begin.
Row 1, cell 3: Hatshepsut, Visionary Pharaoh — a Vizier: a royal administrator who keeps armies supplied and steady. She rules by planning, trade and patience, and her expeditions come home rich.
Row 1, cell 4: Imhotep, Master Architect — a Lector Priest: a reader of sacred texts whose words work as spells. Builder, physician and scholar; the city was raised on his measurements.
Row 2, cell 1: Nefertiti, Culture & Unity — a Lector Priest: a reader of sacred texts whose words work as spells. A queen of the sun-cult whose hymns steady armies and open sealed doors.
Row 2, cell 2: Peseshet, Overseer of Physicians — a Lector Priest: a reader of sacred texts whose words work as spells. She led the women physicians of the old kingdom and taught the midwives of Sais. Her words close wounds as surely as her needle.
Row 2, cell 3: Ramses, Conquering King — a Medjay: a desert scout-warrior of the royal guard who leads from the front. A warrior-king who carves his victories in stone before the dust has settled.
Row 2, cell 4: Tiye, Great Royal Wife — a Vizier: a royal administrator who keeps armies supplied and steady. A commoner’s daughter who became the most trusted voice at court; foreign kings wrote their letters to her. Cedar from distant ports arrives where she sends for it.
Row 3, cell 1: Seshet, Lector of the House of Life — a Lector Priest: a reader of sacred texts whose words work as spells. A lector priestess of Abedju who reads the hymns that send the sun through the night.
Row 3, cell 2: Ankhwen, Captain of the Drowned Barge — a Medjay: a desert scout-warrior of the royal guard who leads from the front. A river captain who drowned in the first dark morning and came back hungry for orders.
Row 3, cell 3: Djedkhonsu, The Hollow Lector — a Lector Priest: a reader of sacred texts whose words work as spells. Once the highest reader of the House of Life, he learned the name of the coiled dark and bargained with it for an endless dusk to rule. Final opponent of The Twelfth Hour.
Row 3, cell 4: Hekaib, Sword of the Hollow Lector — a Medjay: a desert scout-warrior of the royal guard who leads from the front. Djedkhonsu’s champion, who holds the rookery gate.
Row 4, cell 1: Iti, Warden of the Horizon — a Medjay: a desert scout-warrior of the royal guard who leads from the front. Keeper of the road between the two horizon-stones.
Row 4, cell 2: Paser, The Red Vizier — a Vizier: a royal administrator who keeps armies supplied and steady. A vizier who crowned himself in the dusk and calls Djedkhonsu his priest.
Row 4, cell 3: empty (flat black).
Row 4, cell 4: empty (flat black).
Each portrait: head and shoulders in the hero's armour or robes, three-quarter view facing slightly right, eyes about 40 % from the top, warm key light from the upper left and a cool rim light; a soft painted background in the egyptian palette (sand gold, white linen, lapis blue and carnelian; sun discs, spread wings, broad collars). Historical and legendary figures are painted dignified, in the dress of their culture and era, never as caricatures. Adults only. No frame, no border, no text.
```

### Japanese heroes · `sheet.heroportrait.japanese.png`

| Field | Value |
|---|---|
| Contains | row 1, cell 1: Abe no Seimei — Master of Onmyō (Onmyōji; hireable)<br>row 1, cell 2: Benkei — Devoted Guardian (Daimyo; hireable)<br>row 1, cell 3: Hangaku Gozen — Archer of Torisaka (Samurai; hireable)<br>row 1, cell 4: Kusunoki Masashige — Loyal Defender (Daimyo; hireable)<br>row 2, cell 1: Momotaro — People's Hero (Onmyōji; hireable)<br>row 2, cell 2: Tomoe Gozen — Legendary Archer (Samurai; hireable)<br>row 2, cell 3: Yamato Takeru — Imperial Explorer (Samurai; hireable)<br>row 2, cell 4: Yoshitsune — Brilliant Strategist (Daimyo; hireable)<br>row 3, cell 1: Akane — Diviner of the Western Shrine (Onmyōji; campaign)<br>row 3, cell 2: Gonryō — Captain of the Fog Fleet (Samurai; enemy)<br>row 3, cell 3: Kagerō — Warden of the Last Torii (Samurai; enemy)<br>row 3, cell 4: Kurogane — The Iron Daimyo (Daimyo; enemy)<br>row 4, cell 1: Oboro — General of the Hazy Moon (Samurai; enemy)<br>row 4, cell 2: Yamikage — The Lantern-Eater (Onmyōji; enemy)<br>remaining cells: *empty* (flat black) |
| Image | 1536 × 1536 px (or larger, same proportions) — 4 columns × 4 rows, cells 384 × 384, thin black gutters; may come in two parts (rows 1–2 and 3–4) |
| Attach | `support images/ChatGPT Image Sep 29, 2026, 03_35_37 PM-4.png` (pantheon board); `support images/heros_full_view/ChatGPT Image Oct 1, 2026, 01_27_37 PM-4.png` (the pantheon’s mounted hero — armour and colours); `assets-source/art/final/hero.japanese.akane.bust.png` (dialogue bust of the same character); `assets-source/art/final/hero.japanese.kurogane.bust.png` (dialogue bust of the same character); `assets-source/art/final/hero.japanese.yamikage.bust.png` (dialogue bust of the same character) |
| Cuts into | `hero.japanese.abe_no_seimei.portrait.png`, `hero.japanese.benkei.portrait.png`, `hero.japanese.hangaku_gozen.portrait.png`, `hero.japanese.kusunoki_masashige.portrait.png`, `hero.japanese.momotaro.portrait.png`, `hero.japanese.tomoe_gozen.portrait.png`, `hero.japanese.yamato_takeru.portrait.png`, `hero.japanese.yoshitsune.portrait.png`, `hero.japanese.akane.portrait.png`, `hero.japanese.gonryo.portrait.png`, `hero.japanese.kagero.portrait.png`, `hero.japanese.kurogane.portrait.png`, `hero.japanese.oboro.portrait.png`, `hero.japanese.yamikage.portrait.png` |
| Then | `npm run sprites:cut -- --only sheet.heroportrait.japanese`, then `npm run icons:import` |

```text
Paint one sheet of square hero portraits for the fantasy strategy game Pantheon Realms (Japanese heroes), in the style of the attached pantheon board.
Image 1536 × 1536 px: 4 columns × 4 rows of equal square paintings separated by thin straight black gutters. No labels, no numbers, no text.
Row 1, cell 1: Abe no Seimei, Master of Onmyō — a Onmyōji: a diviner of yin and yang who casts spells in battle. The court’s greatest diviner, said to be the son of a fox-woman. Fox-fire answers him before he finishes the charm.
Row 1, cell 2: Benkei, Devoted Guardian — a Daimyo: a domain lord who keeps a disciplined army together. A warrior-monk who once held a bridge alone and now holds armies together.
Row 1, cell 3: Hangaku Gozen, Archer of Torisaka — a Samurai: a sworn swordsman who leads from the front rank. She held the walls of Torisaka from the gate-tower with her bow until an arrow found her. The river-folk of her northern home fight beside her.
Row 1, cell 4: Kusunoki Masashige, Loyal Defender — a Daimyo: a domain lord who keeps a disciplined army together. He held a mountain fortress with a few hundred men against an army, rolling logs and stones down on every assault. Walls rise wherever he camps.
Row 2, cell 1: Momotaro, People's Hero — a Onmyōji: a diviner of yin and yang who casts spells in battle. Born from a peach, raised by farmers, and followed by a dog, a monkey and a pheasant who all give advice.
Row 2, cell 2: Tomoe Gozen, Legendary Archer — a Samurai: a sworn swordsman who leads from the front rank. A mounted warrior famed with bow and blade, first into every breach.
Row 2, cell 3: Yamato Takeru, Imperial Explorer — a Samurai: a sworn swordsman who leads from the front rank. A prince sent to every edge of the map, who keeps coming back from it.
Row 2, cell 4: Yoshitsune, Brilliant Strategist — a Daimyo: a domain lord who keeps a disciplined army together. Trained by mountain tengu; his marches arrive where no one expects them.
Row 3, cell 1: Akane, Diviner of the Western Shrine — a Onmyōji: a diviner of yin and yang who casts spells in battle. A shrine diviner who reads the lantern-smoke at the festival of the dead.
Row 3, cell 2: Gonryō, Captain of the Fog Fleet — a Samurai: a sworn swordsman who leads from the front rank. A sea captain whose ships sail out of the fog and never into port.
Row 3, cell 3: Kagerō, Warden of the Last Torii — a Samurai: a sworn swordsman who leads from the front rank. A warden who walks the road between the sun stone and the moon stone.
Row 3, cell 4: Kurogane, The Iron Daimyo — a Daimyo: a domain lord who keeps a disciplined army together. A lord who fences the wandering dead into his army and calls them loyal.
Row 4, cell 1: Oboro, General of the Hazy Moon — a Samurai: a sworn swordsman who leads from the front rank. Yamikage’s general, who holds the kirin meadow’s gate.
Row 4, cell 2: Yamikage, The Lantern-Eater — a Onmyōji: a diviner of yin and yang who casts spells in battle. A spirit of the borderlands who learned to swallow light, and swallowed the lanterns of seven provinces. Final opponent of The Lantern Road.
Row 4, cell 3: empty (flat black).
Row 4, cell 4: empty (flat black).
Each portrait: head and shoulders in the hero's armour or robes, three-quarter view facing slightly right, eyes about 40 % from the top, warm key light from the upper left and a cool rim light; a soft painted background in the japanese palette (vermilion, black lacquer and white with cherry pink and gold; clouds, waves, lacquered armour). Historical and legendary figures are painted dignified, in the dress of their culture and era, never as caricatures. Adults only. No frame, no border, no text.
```

### Celtic heroes · `sheet.heroportrait.celtic.png`

| Field | Value |
|---|---|
| Contains | row 1, cell 1: Amergin — Poet of the Landing (Druid; hireable)<br>row 1, cell 2: Boudicca — Rebel Queen (Chieftain; hireable)<br>row 1, cell 3: Cu Chulainn — Hound of Ulster (Fian; hireable)<br>row 1, cell 4: Deirdre — Sorrow & Resolve (Druid; hireable)<br>row 2, cell 1: Fergus mac Roich — Exiled King of Ulster (Fian; hireable)<br>row 2, cell 2: Fionn mac Cumhaill — Leader of the Fianna (Chieftain; hireable)<br>row 2, cell 3: Medb — Queen of Connacht (Chieftain; hireable)<br>row 2, cell 4: Scathach — Warrior Teacher (Fian; hireable)<br>row 3, cell 1: Orla — Druid of the Hazel Grove (Druid; campaign)<br>row 3, cell 2: Ciar — Warden of the Mound (Fian; enemy)<br>row 3, cell 3: Corc — Raider of the Grey Sea (Fian; enemy)<br>row 3, cell 4: Dubhghall — The Withered King (Chieftain; enemy)<br>row 4, cell 1: Fiachra — The Usurper of the Ford (Chieftain; enemy)<br>row 4, cell 2: Tadhg the Grey — Champion of the Withered King (Fian; enemy)<br>remaining cells: *empty* (flat black) |
| Image | 1536 × 1536 px (or larger, same proportions) — 4 columns × 4 rows, cells 384 × 384, thin black gutters; may come in two parts (rows 1–2 and 3–4) |
| Attach | `support images/ChatGPT Image Sep 29, 2026, 03_35_41 PM-5.png` (pantheon board); `support images/heros_full_view/ChatGPT Image Oct 1, 2026, 01_27_39 PM-5.png` (the pantheon’s mounted hero — armour and colours); `assets-source/art/final/hero.celtic.orla.bust.png` (dialogue bust of the same character); `assets-source/art/final/hero.celtic.dubhghall.bust.png` (dialogue bust of the same character); `assets-source/art/final/hero.celtic.fiachra.bust.png` (dialogue bust of the same character) |
| Cuts into | `hero.celtic.amergin.portrait.png`, `hero.celtic.boudicca.portrait.png`, `hero.celtic.cu_chulainn.portrait.png`, `hero.celtic.deirdre.portrait.png`, `hero.celtic.fergus_mac_roich.portrait.png`, `hero.celtic.fionn_mac_cumhaill.portrait.png`, `hero.celtic.medb.portrait.png`, `hero.celtic.scathach.portrait.png`, `hero.celtic.orla.portrait.png`, `hero.celtic.ciar.portrait.png`, `hero.celtic.corc.portrait.png`, `hero.celtic.dubhghall.portrait.png`, `hero.celtic.fiachra.portrait.png`, `hero.celtic.tadhg.portrait.png` |
| Then | `npm run sprites:cut -- --only sheet.heroportrait.celtic`, then `npm run icons:import` |

```text
Paint one sheet of square hero portraits for the fantasy strategy game Pantheon Realms (Celtic heroes), in the style of the attached pantheon board.
Image 1536 × 1536 px: 4 columns × 4 rows of equal square paintings separated by thin straight black gutters. No labels, no numbers, no text.
Row 1, cell 1: Amergin, Poet of the Landing — a Druid: a keeper of lore and the old words that work as spells. The bard who sang the land into accepting his people as they stepped ashore. When he chants, the hunt of the Otherworld rides.
Row 1, cell 2: Boudicca, Rebel Queen — a Chieftain: a clan leader whose presence holds the war-band together. A queen who raised a whole country behind her chariot.
Row 1, cell 3: Cu Chulainn, Hound of Ulster — a Fian: a warrior of the wandering war-bands who leads the charge. A young champion whose battle-fury is legendary and whose speed is worse.
Row 1, cell 4: Deirdre, Sorrow & Resolve — a Druid: a keeper of lore and the old words that work as spells. Foretold at her birth to bring sorrow, she learned the old words to answer the prophecy.
Row 2, cell 1: Fergus mac Roich, Exiled King of Ulster — a Fian: a warrior of the wandering war-bands who leads the charge. A giant of a man who lost his throne by a trick and fought the war that followed on the other side. The keening women follow his host.
Row 2, cell 2: Fionn mac Cumhaill, Leader of the Fianna — a Chieftain: a clan leader whose presence holds the war-band together. He tasted the salmon of knowledge once and has been hard to surprise ever since.
Row 2, cell 3: Medb, Queen of Connacht — a Chieftain: a clan leader whose presence holds the war-band together. She went to war over a bull so that her wealth would equal her husband’s, and her treasury has never stopped growing.
Row 2, cell 4: Scathach, Warrior Teacher — a Fian: a warrior of the wandering war-bands who leads the charge. She trained the best warriors of her age on an island of shadow and still takes students.
Row 3, cell 1: Orla, Druid of the Hazel Grove — a Druid: a keeper of lore and the old words that work as spells. A druid of the hazel grove who keeps the calendar of fires.
Row 3, cell 2: Ciar, Warden of the Mound — a Fian: a warrior of the wandering war-bands who leads the charge. Keeper of the road between the summer stone and the winter stone.
Row 3, cell 3: Corc, Raider of the Grey Sea — a Fian: a warrior of the wandering war-bands who leads the charge. A sea-raider who came with the mist and stayed for the plunder.
Row 3, cell 4: Dubhghall, The Withered King — a Chieftain: a clan leader whose presence holds the war-band together. A king who swore himself to the dark half of the year and broke the silver branch so it would never end. Final opponent of The Silver Branch.
Row 4, cell 1: Fiachra, The Usurper of the Ford — a Chieftain: a clan leader whose presence holds the war-band together. A chieftain who took the high seat in the long winter and keeps it with the Withered King’s help.
Row 4, cell 2: Tadhg the Grey, Champion of the Withered King — a Fian: a warrior of the wandering war-bands who leads the charge. The Withered King’s champion, who holds the stags’ wood.
Row 4, cell 3: empty (flat black).
Row 4, cell 4: empty (flat black).
Each portrait: head and shoulders in the hero's armour or robes, three-quarter view facing slightly right, eyes about 40 % from the top, warm key light from the upper left and a cool rim light; a soft painted background in the celtic palette (forest green and gold with grey stone, woad blue and heather; spirals, torcs, mist). Historical and legendary figures are painted dignified, in the dress of their culture and era, never as caricatures. Adults only. No frame, no border, no text.
```

### Mesoamerican heroes · `sheet.heroportrait.mesoamerican.png`

| Field | Value |
|---|---|
| Contains | row 1, cell 1: Chilam Balam — Jaguar Prophet (Day Keeper; hireable)<br>row 1, cell 2: Eight Deer Jaguar Claw — Tactics & Divine Right (Tlatoani; hireable)<br>row 1, cell 3: Hunahpu — Trickster & Resilience (Jaguar Knight; hireable)<br>row 1, cell 4: Lady Six Sky — Warrior Queen of Naranjo (Jaguar Knight; hireable)<br>row 2, cell 1: Moctezuma Ilhuicamina — Archer of the Sky (Tlatoani; hireable)<br>row 2, cell 2: Nezahualcoyotl — Poet King & Harmony (Tlatoani; hireable)<br>row 2, cell 3: Topiltzin Quetzalcoatl — Reform & Enlightenment (Day Keeper; hireable)<br>row 2, cell 4: Xbalanque — Skill & Opportunity (Jaguar Knight; hireable)<br>row 3, cell 1: Itzel — Day-Keeper of Xochitla (Day Keeper; campaign)<br>row 3, cell 2: Acatl — Captain of the Lake Canoes (Jaguar Knight; enemy)<br>row 3, cell 3: Itztli — The Night-Knife (Day Keeper; enemy)<br>row 3, cell 4: Mazatl — Keeper of the Fire Mountain (Jaguar Knight; enemy)<br>row 4, cell 1: Tecuani — Lord of Itzcalli (Tlatoani; enemy)<br>row 4, cell 2: Tlacatl — Warden of the Smoking Gate (Jaguar Knight; enemy)<br>remaining cells: *empty* (flat black) |
| Image | 1536 × 1536 px (or larger, same proportions) — 4 columns × 4 rows, cells 384 × 384, thin black gutters; may come in two parts (rows 1–2 and 3–4) |
| Attach | `support images/ChatGPT Image Sep 29, 2026, 03_35_45 PM-6.png` (pantheon board); `support images/heros_full_view/ChatGPT Image Oct 1, 2026, 01_27_48 PM-6.png` (the pantheon’s mounted hero — armour and colours); `assets-source/art/final/hero.mesoamerican.itzel.bust.png` (dialogue bust of the same character); `assets-source/art/final/hero.mesoamerican.itztli.bust.png` (dialogue bust of the same character); `assets-source/art/final/hero.mesoamerican.tecuani.bust.png` (dialogue bust of the same character) |
| Cuts into | `hero.mesoamerican.chilam_balam.portrait.png`, `hero.mesoamerican.eight_deer_jaguar_claw.portrait.png`, `hero.mesoamerican.hunahpu.portrait.png`, `hero.mesoamerican.lady_six_sky.portrait.png`, `hero.mesoamerican.moctezuma_ilhuicamina.portrait.png`, `hero.mesoamerican.nezahualcoyotl.portrait.png`, `hero.mesoamerican.topiltzin_quetzalcoatl.portrait.png`, `hero.mesoamerican.xbalanque.portrait.png`, `hero.mesoamerican.itzel.portrait.png`, `hero.mesoamerican.acatl.portrait.png`, `hero.mesoamerican.itztli.portrait.png`, `hero.mesoamerican.mazatl.portrait.png`, `hero.mesoamerican.tecuani.portrait.png`, `hero.mesoamerican.tlacatl.portrait.png` |
| Then | `npm run sprites:cut -- --only sheet.heroportrait.mesoamerican`, then `npm run icons:import` |

```text
Paint one sheet of square hero portraits for the fantasy strategy game Pantheon Realms (Mesoamerican heroes), in the style of the attached pantheon board.
Image 1536 × 1536 px: 4 columns × 4 rows of equal square paintings separated by thin straight black gutters. No labels, no numbers, no text.
Row 1, cell 1: Chilam Balam, Jaguar Prophet — a Day Keeper: a calendar priest who reads the days and casts spells in battle. The jaguar-priest whose prophecies were copied for centuries. He reads the count of days and calls down black glass from the sky.
Row 1, cell 2: Eight Deer Jaguar Claw, Tactics & Divine Right — a Tlatoani: a city ruler — "the one who speaks" — who keeps the host in order. A Mixtec lord whose campaigns fill whole painted books.
Row 1, cell 3: Hunahpu, Trickster & Resilience — a Jaguar Knight: an elite warrior of the jaguar order who leads from the front. One of the Hero Twins who outplayed the lords of the underworld at their own game.
Row 1, cell 4: Lady Six Sky, Warrior Queen of Naranjo — a Jaguar Knight: an elite warrior of the jaguar order who leads from the front. She came to a broken city as a bride and ruled it as a conqueror, carved on its monuments standing on a captive. The beasts of the cenotes answer her.
Row 2, cell 1: Moctezuma Ilhuicamina, Archer of the Sky — a Tlatoani: a city ruler — "the one who speaks" — who keeps the host in order. A ruler who built dikes across the lake and stone causeways into his city. Quarries work day and night under his stewards.
Row 2, cell 2: Nezahualcoyotl, Poet King & Harmony — a Tlatoani: a city ruler — "the one who speaks" — who keeps the host in order. A ruler, engineer and poet whose aqueducts and verses both outlived him.
Row 2, cell 3: Topiltzin Quetzalcoatl, Reform & Enlightenment — a Day Keeper: a calendar priest who reads the days and casts spells in battle. A priest-king who took the feathered serpent’s name and its teachings with it.
Row 2, cell 4: Xbalanque, Skill & Opportunity — a Jaguar Knight: an elite warrior of the jaguar order who leads from the front. The other Hero Twin, patient and exact, who finishes what his brother starts.
Row 3, cell 1: Itzel, Day-Keeper of Xochitla — a Day Keeper: a calendar priest who reads the days and casts spells in battle. A day-keeper who counts the calendar and knows which fire belongs to which day.
Row 3, cell 2: Acatl, Captain of the Lake Canoes — a Jaguar Knight: an elite warrior of the jaguar order who leads from the front. A canoe captain who raids the lake towns in the Night-Knife’s name.
Row 3, cell 3: Itztli, The Night-Knife — a Day Keeper: a calendar priest who reads the days and casts spells in battle. An obsidian priest who wants the age to end in darkness so that the next one will be his. Final opponent of The New Fire.
Row 3, cell 4: Mazatl, Keeper of the Fire Mountain — a Jaguar Knight: an elite warrior of the jaguar order who leads from the front. The Night-Knife’s champion, who holds the fire mountain.
Row 4, cell 1: Tecuani, Lord of Itzcalli — a Tlatoani: a city ruler — "the one who speaks" — who keeps the host in order. A city lord who swore to the Night-Knife in exchange for the next age’s throne.
Row 4, cell 2: Tlacatl, Warden of the Smoking Gate — a Jaguar Knight: an elite warrior of the jaguar order who leads from the front. Keeper of the road between the morning-star stone and the evening-star stone.
Row 4, cell 3: empty (flat black).
Row 4, cell 4: empty (flat black).
Each portrait: head and shoulders in the hero's armour or robes, three-quarter view facing slightly right, eyes about 40 % from the top, warm key light from the upper left and a cool rim light; a soft painted background in the mesoamerican palette (turquoise and crimson with jade and gold; quetzal feathers, step-fret patterns, jade). Historical and legendary figures are painted dignified, in the dress of their culture and era, never as caricatures. Adults only. No frame, no border, no text.
```

## Checklist

* 6 hero sheets named exactly as above, in `assets-source/sprites/sheets/`; opaque cells, thin black gutters.
* Characters with a dialogue bust keep its face and costume.
* `npm run sprites:cut -- --only <sheet name>` for each new sheet (check the previews), then `npm run icons:import`.
