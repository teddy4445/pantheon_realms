# Reference Scope, Sources, and Verification Limits

**Status:** R - research record. **Access date:** 29 September 2026.

## Baseline

Use the classic Heroes of Might and Magic III family, with the Complete/Shadow of Death-era core rules as the intended comparison. The original 1999 manual is an original publisher source but can contain obsolete statements. Ubisoft's HD manual corroborates shared interface/core rules; it does not establish that HD contains the Complete expansion rules. VCMI is an independently developed recreation, useful for inspecting explicit behavior, not the original executable.

No original-game executable was run. These documents are a researched design reference, not a binary-exact compatibility specification. No unofficial expansion, fan balance patch, or optional VCMI feature is assumed. The live VCMI `develop` URLs are retrieval-dated, not pinned to a verified commit; pin and archive an appropriate revision before using them for conformance work.

## Source registry

Links in the other documents point here using stable source IDs. Numeric gameplay facts are paraphrased or tabulated; no manual, artwork, or long passages are reproduced.

### M01 - Original publisher manual

New World Computing / 3DO, *Heroes of Might and Magic III: Player Manual* (1999). Primary source. Useful sections: main menu; heroes; combat (especially printed pp. 40-48); towns (49-54); common and faction building tables.

- [Official-hosted scan](https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/297000/manuals/BONUS_Heroes_of_Might_and_Magic_III_HDEdition_OldManual1999_EN.pdf).
- [Readable mirror of the same manual](https://manualmachine.com/gamespc/heroesofmightandmagiciii/1119554-user-manual/).

The full official scan could not be fetched successfully in this research environment; the readable mirror supplied the detailed text/tables. Do not describe this as local extraction of the full official scan.

### M02 - Ubisoft HD manual

Ubisoft, *Heroes of Might and Magic III HD Edition: Online Manual*. Primary publisher source for shared core/interface behavior.

- [Manual](https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/297000/manuals/Heroes_of_Might_and_Magic_III_HDEdition_OnlineManual_EN.pdf?t=1699009789).

Relevant PDF pages: 9 combat types, 10 daily/weekly economy, 13 town screen, 15 hero skills, 16 magic, 17 combat interface (PDF page numbering, not necessarily printed page labels). Town, hero-skill, and combat pages were visually inspected through PDF screenshots.

### V01 - VCMI global game configuration

Primary source for VCMI's implementation defaults; corroboration rather than proof of every original-game edge case.

- [gameConfig.json](https://raw.githubusercontent.com/vcmi/vcmi/develop/config/gameConfig.json).

Relevant keys: `buildingsPerTurnCap`, `movementPointsLand`, `skillPerHero`, `levelupTotalSkillsAmount`, morale/luck probabilities, attack/defense multipliers and caps. Ignore explicitly optional/mod-specific settings.

### V02 - VCMI common building definitions

- [buildingsLibrary.json](https://raw.githubusercontent.com/vcmi/vcmi/develop/config/buildingsLibrary.json).

Hall income replacement, common dependencies, fortification structures. Some costs are loaded from game data rather than present in these JSON definitions; absence of a numeric field is not zero cost.

### V03 - VCMI Castle definitions

- [Faction/building dependencies](https://raw.githubusercontent.com/vcmi/vcmi/develop/config/factions/castle.json).
- [Creature ability definitions](https://raw.githubusercontent.com/vcmi/vcmi/develop/config/creatures/castle.json).

Supports nonlinear dwelling prerequisites and distinguishing unit abilities. Base numeric creature stats are partly loaded from game data, so these files alone do not verify the entire roster table.

### V04 - VCMI damage-calculator documentation

- [Damage Calculator Script](https://vcmi.eu/modders/Lua/Damage_Calculator_Script/).

Supports the separation of additive bonuses and multiplicative reductions, stack damage, and use of the same calculator for damage prediction and execution. Describes VCMI, not a promise of exact original RNG behavior.

### V05 - VCMI secondary skills

- [skills.json](https://raw.githubusercontent.com/vcmi/vcmi/develop/config/skills.json).

Useful implementation cross-check for secondary-skill effects. Pantheon Realms' final eligible skill pool is specified independently.

### C01 - Community-maintained common building data

Secondary gameplay reference, not a publisher source.

- [Common building costs and income](https://www.heroesofmightandmagic.com/heroes3/buildingscommon1.shtml).
- [Town construction and recruitment overview](https://www.heroesofmightandmagic.com/heroes3/buildingscommon0.shtml).

Cross-checked where possible against M01 and V02. No strategic rankings or flavor descriptions are reused.

### C02 - Community Castle unit/building data

- [Castle creatures](https://www.heroesofmightandmagic.com/heroes3/creaturescastle.shtml).
- [Castle dwellings](https://www.heroesofmightandmagic.com/heroes3/buildingscastle2.shtml).
- [Creature list cross-check](https://homm.miraheze.org/wiki/List_of_creatures).

The broad creature list also includes unofficial content: only the classic Castle entries are relevant here. The Monastery Ore discrepancy is resolved using the original manual, not copied from the secondary table.

### C03 - Community resource, growth, and fortification references

- [Resources](https://homm.miraheze.org/wiki/Resource).
- [Creature dwellings](https://homm.miraheze.org/wiki/Creature_dwelling).
- [Fortifications](https://homm.miraheze.org/wiki/Fortifications).
- [Marketplace exchange table](https://h3.heroes.net.pl/mechanika/targowisko).

Some wiki content was available through search excerpts rather than a successful full-page fetch. These are useful corroborating records, not a complete audit. Market values and dwelling edge cases should be checked in the chosen classic executable before claiming exact compatibility.

### L01 - Historical Greek warfare

The Metropolitan Museum of Art, [Warfare in Ancient Greece](https://www.metmuseum.org/essays/warfare-in-ancient-greece). Museum scholarship, useful for hoplite armor, shields, spears, and formation context.

### L02 - Ancient Minotaur account

Apollodorus, *Library*, book 3, especially 3.1.4 and 3.15.8, [translation hosted by Theoi](https://www.theoi.com/Text/Apollodorus3.html). Primary literary text in translation, not a historical report.

### L03 - Ancient Centaur accounts

Apollodorus, *Library*, book 2, including 2.5.4, [translation hosted by Theoi](https://www.theoi.com/Text/Apollodorus2.html). Different named centaurs should not be flattened into one uniform moral character.

### L04 - Cyclopes: distinct traditions

- Hesiod, *Theogony*, approximately lines 139-146, [translation](https://www.ellopos.net/elpenor/greek-texts/ancient-greece/hesiod/theogony.asp?pg=4).
- Homer, *Odyssey*, book 9, [MIT-hosted translation](https://classics.mit.edu/Homer/odyssey.9.ix.html).

The smiths associated with Zeus and the Polyphemus episode are different literary contexts. Our unit biography must identify which one inspires a detail.

### L05 - Griffin literary references

Herodotus, *Histories* 4.13 and 4.27, excerpts collected in [Theoi's Grypes entry](https://www.theoi.com/Thaumasios/Grypes.html). Cite the ancient account as a story about griffins; do not imply griffins are exclusive to Greek culture or real animals.

### L06 - Peltasts in Xenophon

Xenophon, *Hellenica* 4.5, [University of Chicago / Perseus-hosted translation](https://anastrophe.uchicago.edu/cgi-bin/perseus/citequery3.pl?dbname=GreekNov21&getid=1&query=Xen.+Hell.+4.5.6). The inspected passage mentions Iphicrates and peltasts in the campaign context. The draft uses this narrow claim, not a complete equipment reconstruction.

### L07 - Cavalry training and command

Xenophon, *Cavalry Commander*, [translation hosted by ToposText](https://topostext.org/work/784), particularly 1.18 and 6.3-6.5; also [Loeb's text of chapter 8](https://www.loebclassics.com/view/xenophon_athens-cavalry_commander/1925/pb_LCL183.281.xml). Ancient literary guidance supports a training/logistics note, not the game's exact charge mechanics.

## Conflicts to retain explicitly

| Issue | Treatment |
| --- | --- |
| Original manual's printed defensive difference formula says 2% per point | Do not inherit the outdated figure. The classic-style reference here uses 2.5%, corroborated by V01; exact executable parity was not tested. |
| Attack advantage maximum described as 400% | Interpret as 400% of base from that factor: +300% bonus, not +400% bonus. Other bonuses need their own combination rule. |
| Castle Monastery Ore cost differs in a community table | Use M01's 5 Ore for the benchmark. |
| Angel/Archangel rare-resource costs differ across older references | Label the table's Gem costs as the later classic/Complete-style benchmark, not a verbatim 1999-manual value. |
| Classic external dwelling pools versus later fan changes | Do not copy an accumulating external pool into the reference without version qualification. Our own town-covenant rule is independent. |
| Damage randomization and subtle tie/rounding rules | State our own deterministic contract instead of claiming untested byte-for-byte equivalence. |

## Evidence categories

Original manuals establish intended core mechanics. Source code establishes what that recreation implements. Community tables supply cross-checked numeric references. Our proposed formulas, Greek roster, faction fiction, UX decisions, and tests are original design work. These categories must remain visible in any later rewrite.
