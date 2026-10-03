/**
 * Hand-written looks for the magic and Favor VFX list (development tool; never
 * packaged). One short line per spell, miracle and divine gift: what the
 * effect should look like, drawn from its name and lore. The mechanics, target
 * and phases come from the content data (vfx-list.measure.ts).
 */

/** Spells (battle and adventure), by spell ID. */
export const SPELL_LOOKS: Readonly<Record<string, string>> = {
  // Shared battle spells
  spark: 'A crack of white-blue light snaps from the commander’s hand to the target; small sparks scatter on impact.',
  blessing: 'A gold glyph of the patron god descends onto the stack’s weapons; blades glint with a slow gold shimmer while it lasts.',
  ward: 'A thin silver circle is drawn in the air around the stack and settles as a faint ring on the ground.',
  warcry: 'A red-gold shockwave ripples out from the stack with rising embers; weapons briefly raise.',
  swiftness: 'Wind streaks curl around the stack’s feet; a light trail follows it while the effect lasts.',
  ill_omen: 'A black crow’s silhouette circles once above the stack and fades into a grey haze hanging over it.',
  shield_of_faith: 'A translucent shield-shape of light forms in front of the stack, facing its melee enemies.',
  hearthlight: 'A warm amber glow rises from the ground like a hearth fire; motes drift up into the front creature.',
  lightning: 'A forked bolt strikes from the sky onto the target with a white flash and a ground scorch.',
  mend: 'Green-white threads stitch across the front creature; a soft pulse as wounds close.',
  veil: 'A heat-shimmer dome over the stack; incoming arrows visibly bend inside it.',
  weariness: 'A heavy grey-violet dusk falls on the stack; its outline sags and slows.',
  ember_burst: 'Coals arc from the commander and burst into fire on the target, splashing embers onto the stacks beside it.',
  sapping_touch: 'A sickly green tendril reaches the stack; colour drains from its weapons.',
  steadfast: 'Stone-grey runes slam into the ground at the stack’s feet; the stack seems rooted.',
  starfall: 'Night darkens the field for a beat; a rain of falling stars streaks onto every enemy stack.',
  rallying_hymn: 'Gold musical light-ribbons sweep across the whole army; each stack glows once.',
  leaden_air: 'A heavy amber haze rolls over the enemy side; dust hangs low and movement trails stretch.',
  renewal: 'Spring green light blooms over the army; petals and leaves drift onto every front creature.',
  // Celtic
  bramble_snare: 'Hawthorn vines burst from the ground and coil around the stack’s legs.',
  glamour: 'A fairy-light shimmer distorts the stack; its weapons waver like reflections in water.',
  cauldron_of_dagda: 'A ghostly bronze cauldron appears above the stack and tips a ladle of glowing broth onto it.',
  wild_hunt: 'Spectral hounds and riders gallop through the target and its neighbours on a storm wind, with a horn call.',
  mist_of_manannan: 'Sea mist rolls across the enemy side in slow waves, thick around their feet.',
  // Egyptian
  ankh_of_renewal: 'A golden ankh rises above the stack and pours turquoise light into the front creature.',
  wrath_of_sekhmet: 'A roaring lioness head of red flame lunges onto the target.',
  scarab_swarm: 'A gold-black tide of scarabs pours over the target and the stacks beside it, then scatters.',
  balance_of_maat: 'A great scale with a feather appears over the field, tips to level, and soft gold light falls on the army.',
  // Greek
  hoplon_wall: 'Bronze round shields of light lock in a row in front of the stack.',
  apollos_arrow: 'A blazing golden arrow streaks from the sky onto the target with a sun-flare.',
  aegis: 'The shadow of a great goatskin shield with a Gorgon face passes over the army; a blue-silver sheen remains.',
  thunderclap: 'A shockwave ring of white-blue thunder bursts at the target and knocks dust off its neighbours.',
  // Japanese
  kitsune_fire: 'Blue-white fox-fire wisps drift from the commander and swirl into the target.',
  blossom_veil: 'Cherry blossoms swirl down around the stack and keep falling slowly while it lasts.',
  yata_mirror: 'A bright bronze mirror flashes in front of the stack, casting a sun-reflection that deflects arrows.',
  divine_wind: 'A great gust with streaks of white cloud sweeps the army forward; banners snap.',
  raijin_drums: 'A ring of thunder drums appears in the sky; each beat drops a lightning strike on an enemy stack.',
  // Mesoamerican
  jaguar_spirit: 'A spotted jaguar spirit leaps into the stack; amber eyes glow on the warriors for the round.',
  smoking_mirror: 'An obsidian mirror swirls with smoke in front of the stack; a dark reflection seeps into it.',
  rain_of_tlaloc: 'A turquoise rain cloud forms over the army and soft rain falls on every stack.',
  obsidian_rain: 'Shards of black volcanic glass hail onto the target and its neighbours from a smoke-coloured sky.',
  fifth_sun: 'A blazing sun disc rises behind the army; every warrior is outlined in gold-orange light.',
  // Norse
  rune_of_tyr: 'Tyr’s arrow-rune burns blue onto the stack’s blades.',
  frost_breath: 'An icy breath of white frost rolls over the stack; frost crystals form on its feet.',
  norns_thread: 'Three glowing threads wind around the stack and one is drawn taut and short.',
  berserkergang: 'A red bear-shadow roars through the army; warriors are wreathed in a red heat haze.',
  gjallarhorn: 'A deep horn blast sends a visible sound-wave across the enemy side; their banners droop.',
  // Adventure (map)
  far_sight: 'A shepherd’s-eye ripple spreads from the chosen tile, lifting the fog in a soft ring.',
  fleet_foot: 'Wind streaks curl around the mounted hero; the horse’s hooves leave a short light trail.',
  clear_skies: 'Clouds part over the chosen tile and a sunbeam sweeps the fog away in a wide ring.',
  divine_sight: 'A great eye of light opens above the chosen tile and the fog dissolves outward from it.',
  homecoming: 'A column of hearth-coloured light lifts the hero away and sets it down at the town’s gate.',
  eye_of_horus: 'The Eye of Horus glyph opens in gold over the tile; turquoise light sweeps the fog away.',
  wings_of_hermes: 'Small golden wings flutter at the hero’s heels; a gold trail follows the next steps.',
};

/** Divine interventions (Favor miracles), by intervention ID. */
export const MIRACLE_LOOKS: Readonly<Record<string, string>> = {
  favorable_winds: 'A warm wind sweeps across the map from the player’s capital; every hero’s banner flutters and a short gust trail runs behind it.',
  bountiful_harvest: 'Golden wheat and light rain over the chosen town; its dwellings glow one after another.',
  tithe_of_the_faithful: 'Gold coins rain into the treasury: a coin shower over the resource bar’s Gold counter.',
  inspiration: 'A blue spark rises from each of the player’s heroes; mana bars fill with a shimmer.',
  rally_the_faithful: 'A divine banner unfurls in the sky over the army; red-gold light pulses through every stack.',
  shield_of_the_gods: 'A colossal translucent shield descends over the whole army and settles as a blue sheen.',
  mending_light: 'A shaft of white-gold light falls from the clouds onto every friendly front creature.',
  wrath_from_above: 'The sky darkens over one enemy stack; a pillar of divine fire slams down onto it.',
  thunderbolt_of_zeus: 'The heavens split; a colossal white-blue thunderbolt strikes the stack with a screen flash and rolling thunder.',
  ride_of_the_valkyries: 'Winged riders sweep low across the field behind the army; every stack surges forward.',
  blessing_of_the_nile: 'The river rises in silver light around the chosen town; lotus flowers open at its dwellings.',
  ward_of_the_kami: 'Paper shrine streamers (shide) and a sacred rope ring form around the army; a pale light holds.',
  mists_of_the_sidhe: 'Silver fairy mist rolls over the map along every hero’s road.',
  gift_of_the_feathered_serpent: 'A feathered serpent of jade and gold coils over the capital and leaves gold and crystals behind.',
};

/** Divine gifts (bought with Favor at the Temple), by gift ID. */
export const GIFT_LOOKS: Readonly<Record<string, string>> = {
  temple_treasury: 'The temple doors open and a stream of gold coins pours out toward the resource bar.',
  timber_and_stone: 'Carts of timber and cut stone roll out of the temple with a dust puff.',
  tears_of_the_gods: 'Glowing tears fall over the temple and harden into crystals.',
  anointing: 'A soft gold oil-glow anoints the visiting hero’s portrait; an experience burst rises.',
  blessed_brood: 'Light runs from the temple to the dwellings of tiers 1–4; each one glows as its pool grows.',
  temple_relic: 'A relic floats out of the temple vault on a beam of light into the hero’s inventory.',
};
