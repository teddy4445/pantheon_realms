# Campaigns 3–6 — The Twelfth Hour, The Lantern Road, The Silver Branch, The New Fire

_Owner request 2026-10-02: campaigns for Egyptian, Japanese, Celtic and
Mesoamerican, **seven missions each**, reusing the set-up of The Winter Oath.
Built and playable from New Game; every value is **proposed and unplaytested**.
The stories are original fiction in mythology-inspired settings, not retellings._

## How they are built

The Winter Oath's seven mission shapes became a reusable builder
(`packages/content/src/campaign/arc.ts`). Every campaign follows the same arc:

| # | Shape | Steps (in order; work done early counts) | New for the player |
|---|---|---|---|
| 1 | Restore | recruit 10 tier-1 → train 8 → clear the crossing → break the guard → activate the monument | recruit and train, the pantheon signature, a one-time choice |
| 2 | Hunt | build the tier-2 dwelling and recruit 8 → lookout → bridge → hunt a wandering band → activate | wandering bands, lookouts, camps |
| 3 | Covenant | pass → free the tier-4 camp → tier-3 covenant (pay or fight) → first minor god → 2 upgraded tier-4 in the army → activate | covenants, the first god, elite troops |
| 4 | Seek | recruit 3 tier-5 → landing → two lights → the gate opens → guarded goal | two lights open a gate, a commanded patrol |
| 5 | Rival | cross (either ford) → second minor god → take the rival AI empire's town → activate | a rival empire, the second god, a siege |
| 6 | Refuge | approach (either crossing) → free the refuge → claim the tier-6 covenant → 2 tier-6 in the army → defeat the gate commander → activate | claiming from the journal, tier 6 |
| 7 | Finale | approach → two stones → the gate → the final opponent → the last choice → seal | the final battle, two endings |

The writing (names, briefings, story scenes, map events, endings), the guards'
creatures, the rewards (each campaign collects its pantheon's artifact set),
the biome and the soundscape belong to each campaign. War-bands, wallets,
guards' sizes and costs follow the Winter Oath (its journey passed); the
enemies mix the new **neutral creatures** (brigands, boars, golems, ogres,
wyverns, basilisks) with renegade troops of the campaign's own pantheon.

## The Twelfth Hour (Egyptian)

The sun has stopped below the horizon. **Seshet**, a lector priestess of
Abedju, follows the barque of the sun down through the hours of the night.
Patron **Ra** (fixed); Set or Isis in M3; Osiris, Thoth or Horus in M5.
Opponents: **Djedkhonsu the Hollow Lector** (final), **Paser the Red Vizier**
(rival empire), Ankhwen (patrol), Hekaib (gate), Iti (patrol). Covenants:
Ushabti (M3), Bennu (M6). Set: Regalia of the Two Lands (khopesh M1, nemes M2,
corselet M6).

| # | Mission | Town | Highlights |
|---|---|---|---|
| 1 | The Ember Dawn | Abedju | marsh boars at the canal lock; masked hirelings at the Obelisk of the East |
| 2 | The Black Boar | Nekheb | the black boar of the west bank; the Shrine of the Western Gate |
| 3 | The Sculptor’s Price | Edfu | sphinxes freed from clay golems; the ushabti covenant bought or taken |
| 4 | The Drowned Library | Per-Djehuty | two pylon-fires burn away the mist; river beasts at the House of Records |
| 5 | The Red Vizier | Tjebu vs Per-Wadjet | Paser’s empire; the Throne Stela |
| 6 | The Phoenix Rookery | Iunu | the caged bennu; Hekaib at the rookery gate |
| 7 | The Twelfth Hour | Abu | the two horizon-stones; Djedkhonsu in the Hall of the Coil; **bind** or **cut** the coil |

## The Lantern Road (Japanese)

The lanterns that guide the dead home went dark. **Akane**, a shrine diviner,
relights the spirits' road province by province. Patron **Amaterasu**;
Hachiman or Susanoo in M3; Inari, Fujin or Raijin in M5. Opponents:
**Yamikage the Lantern-Eater** (final), **Kurogane the Iron Daimyo** (rival),
Gonryō (patrol), Oboro (gate), Kagerō (patrol). Covenants: Tengu (M3), Kirin
(M6). Set: Treasures of Takamagahara (kabuto M1, magatama M2, ō-yoroi M6);
the Storm God's Tachi at the Hall of Mirrors.

| # | Mission | Town | Highlights |
|---|---|---|---|
| 1 | The Unlit Lantern | Kagaribi | boars on the bamboo bridge; ronin at the great lantern |
| 2 | The Boar Lord | Mizuhara | the giant boar of the terraces; the river lantern |
| 3 | The Crow Monastery | Kumoyama | red oni freed from haniwa; the tengu abbot's price |
| 4 | The Spirit Sea | Shiogama | two shrine bells clear the fog; spider-women at the Hall of Mirrors |
| 5 | The Iron Daimyo | Akashi vs Iron Castle | Kurogane's empire; the Lantern of Oaths |
| 6 | The Kirin Meadow | Takamori | the penned kirin; General Oboro (an empty armour) |
| 7 | The Last Torii | Hikari | sun stone and moon stone; Yamikage's palace; **light the lanterns** or **leave the road open** |

## The Silver Branch (Celtic)

The silver bough that opens the mounds was broken and the year stuck in its
dark half. **Orla**, a druid of the hazel grove, goes to turn the year.
Patron **the Dagda**; the Morrígan or Brigid in M3; Cernunnos, Epona or Lugh
in M5. Opponents: **Dubhghall the Withered King** (final), **Fiachra the
Usurper** (rival), Corc (patrol), Tadhg the Grey (gate), Ciar (patrol).
Covenants: Kelpie (M3), Horned Stag (M6). Set: Treasures of the Tuatha Dé
(cauldron M4, stone M5, spear M6 — all three by the finale).

| # | Mission | Town | Highlights |
|---|---|---|---|
| 1 | The Cold Hearth | Dún Caill | boars at the alder ford; reavers at the Beltane Stone |
| 2 | The Iron-Bristled Boar | Dún Bera | the boar with bristles like nails; the ogham stone |
| 3 | The Water-Horse Bargain | Ráth Eala | banshees freed from cairn-men; the keeper of the loch |
| 4 | The Hall Beneath the Waves | Inis Rón | two headland fires burn the mist; selkies at the sea-hall |
| 5 | The High Seat | Dún Ard vs Dún Fiachra | Fiachra's empire; the inauguration stone |
| 6 | The Stags’ Wood | Coill Dubh | stags in grave-iron; Tadhg the Grey at the wood gate |
| 7 | The Door of the Mound | Dún Brugh | summer stone and winter stone; the Withered King; **mend** or **plant** the branch |

## The New Fire (Mesoamerican)

The fire that binds the years was put out before it could be renewed, and
the sun is fading. **Itzel**, a day-keeper, relights the altars. Patron
**Quetzalcoatl**; Huitzilopochtli or Coatlicue in M3; Tlaloc, Tezcatlipoca or
Xiuhtecuhtli in M5. Opponents: **Itztli the Night-Knife** (final), **Tecuani
of Itzcalli** (rival), Acatl (patrol), Mazatl (gate), Tlacatl (patrol).
Covenants: Eagle Warriors (M3), Xiuhcoatl (M6). Set: Gifts of the Feathered
Serpent (crown M1, pectoral M2, chimalli M6).

| # | Mission | Town | Highlights |
|---|---|---|---|
| 1 | The Cold Altar | Xochitla | starved wild pigs at the canoe ford; cultists at the hill altar |
| 2 | The Black Jaguars | Tepeyolo | the black jaguar pack; the altar of the morning star |
| 3 | The House of Eagles | Ocelotepec | crocodiles freed at the sacred cenote; the eagle elders' price |
| 4 | The House of Bats | Acalco | two lake altars clear the smoke; bat-spirits at their house |
| 5 | The Lord of Itzcalli | Tonalco vs Itzcalli | Tecuani's empire; the oath stela |
| 6 | The Fire Mountain | Quetzaltepec | the chained fire serpents; Mazatl at the crater gate |
| 7 | The Smoking Gate | Tlapallan | morning-star and evening-star stones; the obsidian palace; **rekindle the old fire** or **drill a new one** |

## Tests

`packages/campaign/test/arcCampaigns.test.ts`: per campaign, data checks
(seven missions in order, fixed patron, steps in order, troop names in every
objective), every map generates and validates, both endings, and a headless
journey through all seven missions with carryover (battles by the tactical AI
on both sides). `tests/e2e/round3.spec.ts` starts each campaign from New Game.

## Open questions for the owner

1. The four campaigns share the Winter Oath's mission shapes. Keep that, or
   give later passes each campaign its own mechanics (for example portals in
   the Japanese islands or the Celtic mounds)?
2. Campaign heroes: Seshet, Akane, Orla and Itzel are new characters (the
   board heroes stay hireable in skirmish). Would you rather use board heroes?
3. Difficulty, portraits and music as for the Winter Oath (all placeholders;
   the missions reuse the three existing soundscapes).
4. Order on the campaign screen: Three Beacons, Winter Oath, then these four —
   or should they unlock in sequence?
