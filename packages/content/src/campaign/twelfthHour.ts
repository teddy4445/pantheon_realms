/**
 * The Twelfth Hour — the Egyptian campaign (seven missions), built on the
 * Winter Oath arc (arc.ts). Owner request 2026-10-02: campaigns for Egyptian,
 * Japanese, Celtic and Mesoamerican, seven missions each.
 *
 * Original fiction in an Egyptian-inspired setting: the sun has stopped below
 * the horizon, and a lector priestess follows its barque through the twelve
 * hours of the night. Not a retelling of any text. Every number is proposed and
 * unplaytested.
 */
import type { CampaignDefinition, EntitlementDefinition, HeroDefinition, MapTemplateDefinition, MissionDefinition } from '@pr/rules';
import {
  arcCampaign,
  arcCommander,
  arcEntitlements,
  arcHero,
  covenantMission,
  finaleMission,
  huntMission,
  refugeMission,
  restoreMission,
  rivalMission,
  seekMission,
  speaker,
  type ArcCampaignContext,
} from './arc';

const P = 'egyptian';
const SESHET = speaker(P, 'Seshet');
const NEBET = speaker(P, 'Nebet');
const PAWAH = speaker(P, 'Pawah');
const DJED = speaker(P, 'Djedkhonsu');
const PASER = speaker(P, 'Paser');

export const TWELFTH_HOUR_HEROES: readonly HeroDefinition[] = [
  arcHero(P, 'egyptian_seshet', 'Seshet', 'Lector of the House of Life', 'lector_priest', 'A lector priestess of Abedju who reads the hymns that send the sun through the night. The hero of The Twelfth Hour.', 'campaign'),
  arcHero(P, 'egyptian_djedkhonsu', 'Djedkhonsu', 'The Hollow Lector', 'lector_priest', 'Once the highest reader of the House of Life, he learned the name of the coiled dark and bargained with it for an endless dusk to rule. Final opponent of The Twelfth Hour.', 'enemy'),
  arcHero(P, 'egyptian_paser', 'Paser', 'The Red Vizier', 'vizier', 'A vizier who crowned himself in the dusk and calls Djedkhonsu his priest. Rival empire in The Twelfth Hour, mission 5.', 'enemy'),
  arcHero(P, 'egyptian_ankhwen', 'Ankhwen', 'Captain of the Drowned Barge', 'medjay', 'A river captain who drowned in the first dark morning and came back hungry for orders. Patrol in The Twelfth Hour, mission 4.', 'enemy'),
  arcHero(P, 'egyptian_hekaib', 'Hekaib', 'Sword of the Hollow Lector', 'medjay', 'Djedkhonsu’s champion, who holds the rookery gate. The Twelfth Hour, mission 6.', 'enemy'),
  arcHero(P, 'egyptian_iti', 'Iti', 'Warden of the Horizon', 'medjay', 'Keeper of the road between the two horizon-stones. Patrol in The Twelfth Hour, mission 7.', 'enemy'),
];
const H = Object.fromEntries(TWELFTH_HOUR_HEROES.map((h) => [h.id, h]));

export function buildTwelfthHour(names: ArcCampaignContext['names'], familyOf: ArcCampaignContext['familyOf']): {
  templates: MapTemplateDefinition[];
  missions: MissionDefinition[];
  campaign: CampaignDefinition;
  entitlements: EntitlementDefinition[];
} {
  const ctx: ArcCampaignContext = {
    id: 'twelfth_hour',
    pantheonId: P,
    archetypeId: 'egyptian_city',
    hero: { heroId: 'seshet', definitionId: 'egyptian_seshet', classId: 'lector_priest', name: 'Seshet' },
    gods: { patron: 'egyptian_ra', first: ['egyptian_set', 'egyptian_isis'], second: ['egyptian_osiris', 'egyptian_thoth', 'egyptian_horus'] },
    t: [
      { base: '', up: '' },
      { base: 'egyptian_sacred_scarab', up: 'egyptian_solar_scarab' },
      { base: 'egyptian_jackal_guardian', up: 'egyptian_anubian_warden' },
      { base: 'egyptian_ushabti', up: 'egyptian_royal_ushabti' },
      { base: 'egyptian_sphinx', up: 'egyptian_great_sphinx' },
      { base: 'egyptian_crocodile_beast', up: 'egyptian_sobek_warbeast' },
      { base: 'egyptian_bennu', up: 'egyptian_radiant_bennu' },
      { base: 'egyptian_desert_colossus', up: 'egyptian_divine_colossus' },
    ],
    covenantT3: 'egyptian_ushabti',
    covenantT6: 'egyptian_bennu',
    covenantT7: 'egyptian_desert_colossus',
    hostName: 'The Hollow Lector’s Host',
    hiringReason: 'Seshet walks the night road with her own escort. Hero hiring is disabled in The Twelfth Hour.',
    debriefPolicy: [
      'Seshet keeps her level, experience (up to the displayed cap), skills, spellbook, spells and equipment.',
      'Ra and every god she has committed to carry into the next mission.',
      'Troops, resources, towns, mines and recruitment pools stay behind to hold the river.',
      'The next mission begins with its declared escort and treasury.',
    ],
    seed: 410000,
    names,
    familyOf,
  };

  const m1 = restoreMission(ctx, {
    name: 'The Ember Dawn',
    summary: 'For nine mornings the sun has risen red and low and gone down again within the hour. Raise a temple guard in Abedju, clear the canal lock and sing the morning hymn at the Obelisk of the East.',
    newDecisions: ['Recruit and train', 'Afterlife', 'Learn spells at the Mage Guild', 'A one-time choice'],
    briefing: [
      NEBET('Nine mornings, priestess. The sun climbs a hand’s breadth over the eastern hills, red as a coal, and sinks again. The fields are cold. The children have stopped asking why.'),
      SESHET('The morning hymn is sung at the Obelisk of the East. If the hymn is not being sung, someone has stopped the singers. Raise a guard from the temple, captain — the scarab-keepers will answer.'),
      PAWAH('Mind the canal lock on the way. Men with hidden faces have taken it. They do not rob the barges. They turn them back.'),
    ],
    victory: [SESHET('The hymn is sung. The sun stood a little higher today — not enough. Somewhere in the night, the barque that carries it has run aground.')],
    town: { townId: 'abedju', name: 'Abedju', description: 'Seshet’s temple-town, where the House of Life keeps the hymns of the hours.' },
    biome: 'desert',
    soundscape: 'desert',
    barrier: 'water',
    event: {
      name: 'Broken Shrine of Ra',
      description: 'A wayside shrine whose offering table has been overturned.',
      title: 'The Broken Shrine',
      text: 'Someone has smashed the little shrine on the canal road: the offering table lies in pieces, the bread is trodden into the sand. Under the table, four bronze scarabs the size of a fist still turn slowly toward the east, waiting for a sun that does not come.',
      options: [
        { label: 'Take the shrine’s silver', summary: '+600 Gold and +4 Wood.', reward: { resources: { gold: 600, wood: 4 } } },
        { label: 'Read the morning verse over the scarabs', summary: '4 Sacred Scarabs join Seshet’s escort.', reward: { creatures: [{ creatureId: 'egyptian_sacred_scarab', count: 4 }] } },
      ],
    },
    camp: { name: 'Jackal Kennels', description: 'Temple jackals that follow whoever feeds them and keeps the old words.', creatureId: 'egyptian_jackal_guardian' },
    crossing: {
      name: 'Canal Lock',
      description: 'The lock that lets the barges into Abedju. Boars of the marsh, driven mad by the cold, have made it their wallow.',
      guard: { label: 'Marsh boars', army: [['wild_boar', 8]], reward: { resources: { gold: 300, wood: 3, stone: 3 } }, battlefield: 'coast_road' },
    },
    cache: { name: 'Abandoned Barge', description: 'A grain barge left at the bank when its crew fled the dark mornings.', reward: { resources: { gold: 400, crystal: 1 } } },
    monument: {
      name: 'Obelisk of the East',
      description: 'The needle of stone where the morning hymn greets the sun. Masked men stand around it.',
      guard: {
        label: 'Masked hirelings',
        army: [
          ['brigand', 20],
          ['brigand_cutthroat', 6],
        ],
        reward: { resources: { gold: 500 }, artifactIds: ['khopesh_of_set'] },
        battlefield: 'beacon_clearing',
      },
      confirm: 'Sing the morning hymn at the Obelisk of the East? This completes The Ember Dawn.',
    },
    objectives: { recruit: 'Raise the temple guard', train: 'Gild the scarabs', crossing: 'Open the canal lock', guard: 'Drive off the masked men', activate: 'Sing the morning hymn', event: 'The broken shrine (optional)' },
    scenes: (ids) => [
      { id: 'm01_lock_open', trigger: { type: 'site_cleared', siteId: ids.crossing }, lines: [PAWAH('Those boars were penned there. Somebody fed them at the lock and left the gate open behind them.'), SESHET('Then somebody wanted the barges kept away from the obelisk. That tells us where to go.')] },
      { id: 'm01_obelisk_battle', trigger: { type: 'battle_started', siteId: ids.monument }, lines: [DJED('Little reader. The hymn you came to sing is an old habit. Night has better songs.'), SESHET('Then let it sing them to someone who is listening.')] },
      { id: 'm01_khopesh', trigger: { type: 'site_cleared', siteId: ids.monument }, lines: [NEBET('Their leader carried this — a temple khopesh, the sacred kind. It was stolen from the treasury at Iunu.'), SESHET('Keep it close. Whoever gives temple blades to hirelings has been inside the temples.')] },
      { id: 'm01_losses', trigger: { type: 'casualties', minLost: 4 }, lines: [NEBET('We buried six on the canal bank today, priestess. The scarab-keepers will rise for us — but not forever.'), SESHET('I know. We will spend them like silver, not like sand.')] },
    ],
    help: [{ id: 'afterlife', title: 'Afterlife', text: 'The Egyptian signature: after a battle you win, each of your stacks regains a fifth of the creatures it lost in that battle.' }],
  });

  const m2 = huntMission(ctx, {
    name: 'The Black Boar',
    summary: 'A herd of black boars, fed and driven by the Hollow Lector’s men, roots up the west-bank fields of Nekheb. Raise jackals of your own, cross the river, hunt the herd down and reopen the Shrine of the Western Gate.',
    newDecisions: ['Hunt a wandering herd', 'Use a lookout', 'Buy or bargain on the road'],
    briefing: [
      PAWAH('The west bank of Nekheb is the land of the dead — tombs, shrines, the gate the sun goes through at evening. Now a black boar runs there with its herd, and the shrine of the gate is dark.'),
      SESHET('The black boar is an old sign. It is the shape the enemy of the sun likes best. Somebody is making signs for us to read.'),
      NEBET('Then we read them with jackals. Build the kennels, priestess. Jackals hunt pigs better than priests do.'),
    ],
    victory: [PAWAH('The western gate is lit again. But listen — the sun did not come back through it tonight. It has gone further in than any gate we can light from this side.')],
    town: { townId: 'nekheb', name: 'Nekheb', description: 'A river town whose west bank is all tombs and shrines.' },
    biome: 'desert',
    soundscape: 'desert',
    barrier: 'water',
    lookout: { name: 'Vulture Crag', description: 'From the top, the west bank lies open from the river to the cliffs.' },
    event: {
      name: 'Amulet-maker’s Stall',
      description: 'An old amulet-maker who has not closed her stall in forty years.',
      title: 'The Amulet-maker',
      text: '“Forty years I have sold hearts of stone to people who were afraid of the scales,” the old woman says. “This year they buy them for the living.” She holds out a green stone scarab, warm as a hand. “Or sit, and I will tell you what the boar is, and why it wants the gate.”',
      options: [
        { label: 'Buy the heart scarab', summary: 'Pay 2,000 Gold for the Heart Scarab (+2 mana at dawn).', cost: { gold: 2000 }, reward: { artifactIds: ['heart_scarab'] } },
        { label: 'Sit and listen', summary: 'Seshet gains +1 Knowledge.', reward: { attributes: { knowledge: 1 } } },
      ],
    },
    camp: { name: 'Desert Kennels', description: 'Jackals that have not joined the black herd’s masters.', creatureId: 'egyptian_jackal_guardian' },
    bridge: {
      name: 'Ferry Landing',
      description: 'The ferry to the west bank. The Lector’s hirelings hold the landing.',
      guard: {
        label: 'Landing hirelings',
        army: [
          ['brigand', 16],
          ['brigand_cutthroat', 6],
        ],
        reward: { resources: { gold: 600, favor: 3 } },
        battlefield: 'coast_road',
      },
    },
    lair: {
      name: 'Tomb of the Forgotten King',
      description: 'An opened tomb used as a sty. Something gold glints in the dirt.',
      guard: {
        label: 'Sty boars',
        army: [
          ['tusked_boar', 4],
          ['wild_boar', 6],
        ],
        reward: { resources: { gold: 500 }, artifactIds: ['nemes_of_ra'] },
        battlefield: 'grove',
      },
    },
    stone: { name: 'Shrine of the Western Gate', description: 'The shrine where the evening sun is sung into the west.', confirm: 'Relight the Shrine of the Western Gate? This completes The Black Boar.' },
    prey: {
      id: 'egyptian_black_boar',
      name: 'The Black Boar',
      portraitAssetId: 'creature.neutral.wild_boar.upgraded.portrait',
      army: [
        ['tusked_boar', 6],
        ['wild_boar', 12],
      ],
      bounty: { gold: 800 },
    },
    objectives: {
      recruit: 'Jackals of our own',
      lookout: 'Read the land from the crag',
      bridge: 'Take the ferry landing',
      prey: 'Hunt the Black Boar',
      preyHint: 'The herd roams near the middle of the west bank and only charges an escort it is sure it can beat. Move onto it to fight.',
      activate: 'Relight the western gate',
      lair: 'The forgotten king’s tomb (optional)',
      event: 'The amulet-maker (optional)',
    },
    scenes: (ids) => [
      { id: 'm02_crag', trigger: { type: 'site_visited', siteId: ids.lookout }, lines: [SESHET('There, below the cliffs — the fields are rooted up in a ring around the shrine. They are not eating. They are guarding.'), NEBET('Then the shrine still matters to someone. Good.')] },
      { id: 'm02_boar_battle', trigger: { type: 'battle_started', heroDefinitionId: ids.prey }, lines: [DJED('Run, black one. Run her into the sand. The night is long and she is only one reader.')] },
      { id: 'm02_boar_broken', trigger: { type: 'objective_completed', objectiveId: ids.preyObjective }, lines: [NEBET('The herd is broken. The survivors ran for the cliffs.'), SESHET('Let them. A sign that has been read is only a pig.')] },
    ],
  });

  const m3 = covenantMission(ctx, {
    name: 'The Sculptor’s Price',
    summary: 'In the quarries above Edfu the tomb-servants have stopped working. Break the hired guard on the cliff road, free the sphinxes’ terrace, win the ushabti covenant — by the sculptor’s price or by force — and take a god for the long night ahead.',
    newDecisions: ['A covenant: pay or fight', 'Your first minor god', 'Elite troops in the army'],
    briefing: [
      PAWAH('The sun’s road goes under the cliffs at Edfu. The old sculptor there still makes ushabti — the little servants who work for the dead. He says they have stopped answering.'),
      SESHET('Ushabti answer the one who holds the covenant. If they have stopped, someone else holds it now.'),
      NEBET('And the sphinxes on the terrace have gone quiet too. Things are quiet all along the road, priestess. I do not like it.'),
    ],
    victory: [SESHET('The covenant holds, a god walks with us and the cliff stone is sung. The road goes down from here — into the hours where the sun is.')],
    town: { townId: 'edfu', name: 'Edfu', description: 'A quarry town under the great cliffs.' },
    biome: 'desert',
    soundscape: 'desert',
    cache: { name: 'Quarrymen’s Cache', description: 'Tools and silver left when the quarrymen fled.', reward: { resources: { gold: 700, wood: 5 }, artifactIds: ['scribes_papyrus_sandals'] } },
    pass: {
      name: 'Cliff Road',
      description: 'The only road up the cliffs, held by the Lector’s hirelings.',
      guard: {
        label: 'Cliff-road hirelings',
        army: [
          ['brigand', 24],
          ['brigand_cutthroat', 10],
        ],
        reward: { resources: { gold: 750, favor: 5 } },
        battlefield: 'ridge_pass',
      },
    },
    roost: {
      name: 'Terrace of the Sphinxes',
      description: 'A terrace of resting sphinxes. Clay golems stand among them like jailers.',
      guard: { label: 'Terrace golems', army: [['clay_golem', 5]], reward: { resources: { favor: 5 }, artifactIds: ['shield_of_the_medjay'] }, battlefield: 'ridge_pass' },
    },
    hearth: {
      name: 'The Sculptor’s Workshop',
      description: 'An old sculptor at his bench, surrounded by unfinished servants.',
      title: 'The Sculptor’s Workshop',
      text: '“The covenant was sold,” the old sculptor says, carving. “Not by me — by the man who paid my masters more than I could. Pay me what he paid, and I will carve your name into every servant on this bench. Or go to the Sealed Workshop and take it back from his servants. They are clay; they will not mind.”',
      price: { gold: 1500, wood: 10 },
      payLabel: 'Pay the sculptor’s price',
      refuseLabel: 'Refuse — take it at the Sealed Workshop',
    },
    home: {
      name: 'Sealed Workshop',
      description: 'A workshop sealed with the Lector’s mark. Inside, the ushabti stand guard.',
      guard: {
        label: 'Sealed servants',
        army: [
          ['egyptian_ushabti', 4],
          ['egyptian_royal_ushabti', 1],
        ],
        reward: { resources: { gold: 1000 } },
        battlefield: 'grove',
      },
    },
    bridge: {
      name: 'Stone Causeway',
      description: 'A causeway over the flooded quarry, held by the Lector’s cutthroats and their boars.',
      guard: {
        label: 'Causeway guard',
        army: [
          ['brigand_cutthroat', 12],
          ['tusked_boar', 4],
        ],
        reward: { resources: { gold: 800 } },
        battlefield: 'ridge_pass',
      },
    },
    stone: { name: 'Cliff Stela', description: 'The stela where the sun’s road enters the cliff.', confirm: 'Sing the hymn at the Cliff Stela? This completes The Sculptor’s Price.' },
    band: { id: 'egyptian_quarry_boars', name: 'Quarry Boars', army: [['wild_boar', 6]] },
    objectives: {
      pass: 'Take the cliff road',
      roost: 'Free the sphinxes’ terrace',
      covenant: 'The ushabti covenant',
      covenantDescription: 'Win the ushabti covenant: pay the sculptor’s price at his workshop, or break the servants at the Sealed Workshop.',
      god: 'A god for the night road',
      elite: 'Great Sphinxes in the escort',
      activate: 'Sing the cliff stela',
      cache: 'The quarrymen’s cache (optional)',
    },
    scenes: (ids) => [
      { id: 'm03_terrace', trigger: { type: 'site_cleared', siteId: ids.roost }, lines: [NEBET('The sphinxes are waking. They watched the golems the whole time — they could not move while the clay stood among them.'), SESHET('Then they will remember who moved the clay.')] },
      { id: 'm03_workshop', trigger: { type: 'site_cleared', siteId: ids.home }, lines: [PAWAH('The seal on the door — it is the Lector’s own. Djedkhonsu, the old High Lector. He taught me my letters.'), SESHET('He taught me mine too. Whatever he teaches now, I will not learn it.')] },
      { id: 'm03_god', trigger: { type: 'objective_completed', objectiveId: ids.god }, lines: [SESHET('A god walks with us now. Whatever waits in the hours below, we do not meet it alone.')] },
    ],
  });

  const m4 = seekMission(ctx, {
    name: 'The Drowned Library',
    summary: 'The House of Records at Per-Djehuty lies beyond the flooded marsh, behind a veil of grey mist. Raise river beasts, take the landing, light both pylon-fires to burn away the mist and read what the records say about the sun.',
    newDecisions: ['Light two fires to open a way', 'A commanded patrol', 'River beasts'],
    briefing: [
      SESHET('Every barque the sun has ever ridden is written down at Per-Djehuty — its crew, its road, its enemies. If anyone knows where the barque ran aground, the records do.'),
      PAWAH('The marsh has flooded over the road and a mist has come up that does not lift. The boatmen say a drowned captain walks the islands with a drowned crew.'),
      NEBET('Then we go by the pylons. Light their fires and the mist burns away — the old priests built them for that.'),
    ],
    victory: [SESHET('The records are clear: the barque is held at the eleventh hour, in a hall the Lector has built inside the night. And he has a king — a vizier who crowned himself in the dusk.')],
    town: { townId: 'per_djehuty', name: 'Per-Djehuty', description: 'A marsh town of scribes on the edge of the flood.' },
    biome: 'jungle',
    soundscape: 'desert',
    wanderer: {
      name: 'A Scribe on a Reed Boat',
      description: 'A scribe with an ibis-headed staff poles a reed boat along the bank.',
      title: 'The Ibis Scribe',
      text: 'He writes as he poles, and he does not look up. “You are going to the House of Records,” he says. “Good. Read the eleventh page twice. And take this — the night is long, and a priestess should not walk it with nothing but hymns.”',
      options: [
        { label: 'Take the Djed amulet', summary: 'The Djed Amulet joins Seshet’s backpack.', reward: { artifactIds: ['djed_amulet'] } },
        { label: 'Ask him to teach you', summary: 'Seshet gains +1 Spell Power and +1 Knowledge.', reward: { attributes: { power: 1, knowledge: 1 } } },
      ],
    },
    wreck: { name: 'Sunken Grain Barge', description: 'A grain barge sunk in the shallows; its strongbox is still above water.', reward: { resources: { gold: 900, wood: 4 } } },
    landing: {
      name: 'Reed Landing',
      description: 'The landing on the marsh islands, held by the drowned captain’s crew.',
      guard: {
        label: 'Drowned crew',
        army: [
          ['brigand', 36],
          ['brigand_cutthroat', 14],
        ],
        reward: { resources: { gold: 800, favor: 3 } },
        battlefield: 'coast_road',
      },
    },
    omen: {
      name: 'The Drowned Barge',
      description: 'The drowned captain’s barge, beached and empty.',
      title: 'The Drowned Barge',
      text: 'The barge is dry inside, though it lies in the water. On the captain’s chair is a ledger: every barge he turned back, every crew he took. The last page has your name on it. Under the chair, a chest — and a crate of temple arrows the crew never used.',
      options: [
        { label: 'Take the chest', summary: '+800 Gold and +2 Crystal.', reward: { resources: { gold: 800, crystal: 2 } } },
        { label: 'Arm the jackals', summary: '6 Anubian Wardens join Seshet’s escort.', reward: { creatures: [{ creatureId: 'egyptian_anubian_warden', count: 6 }] } },
      ],
    },
    relays: { north: { name: 'North Pylon', description: 'A pylon-fire on the northern island.' }, south: { name: 'South Pylon', description: 'A pylon-fire on the southern island.' }, cost: { gold: 250, stone: 3 } },
    nest: { name: 'Ogres’ Reed-hall', description: 'Two ogres have built a hall of reeds and stolen grain.', guard: { label: 'Reed-hall ogres', army: [['ogre', 2]], reward: { resources: { crystal: 5 } }, battlefield: 'grove' } },
    gate: { name: 'Veil of Grey Mist', description: 'A wall of mist that does not move with the wind. Both pylon-fires must burn to part it.' },
    goal: {
      name: 'House of Records',
      description: 'The archive of every voyage of the sun, half under water. River beasts guard its steps.',
      guard: {
        label: 'Turned river beasts',
        army: [
          ['egyptian_crocodile_beast', 4],
          ['egyptian_sobek_warbeast', 2],
        ],
        reward: { resources: { gold: 1000 } },
        battlefield: 'coast_road',
      },
      reward: { questXp: 2200, artifactIds: ['solar_chariot_harness'] },
      confirm: 'Read the records of the barque? This completes The Drowned Library.',
    },
    patrol: {
      commander: arcCommander(H['egyptian_ankhwen']!, 'patrol4'),
      army: [
        ['egyptian_solar_scarab', 16],
        ['egyptian_anubian_warden', 6],
      ],
    },
    objectives: { recruit: 'River beasts of our own', landing: 'Take the reed landing', north: 'The north pylon', south: 'The south pylon', gate: 'Burn away the mist', goal: 'Read the records', nest: 'The ogres’ reed-hall (optional)', wanderer: 'The ibis scribe (optional)' },
    scenes: (ids) => [
      { id: 'm04_landing', trigger: { type: 'site_cleared', siteId: ids.landing }, lines: [NEBET('They did not bleed, priestess. They poured out water.'), SESHET('Then their captain is close. Keep the escort together.')] },
      { id: 'm04_mist', trigger: { type: 'objective_completed', objectiveId: ids.gate }, lines: [PAWAH('Look — the mist is burning off like morning fog. The old priests knew what they were doing.'), SESHET('They always did. That is why he wants their hymns forgotten.')] },
      { id: 'm04_records', trigger: { type: 'battle_started', siteId: ids.goal }, lines: [DJED('You read well, little lector. Read this: no one comes back from the eleventh hour.')] },
    ],
  });

  const m5 = rivalMission(ctx, {
    name: 'The Red Vizier',
    summary: 'Paser, a vizier who crowned himself in the dusk, holds Per-Wadjet and the stela of the throne. Cross the river, take a second god, besiege his town and break the stela that names him king.',
    newDecisions: ['A rival empire', 'A second minor god', 'A siege'],
    briefing: [
      NEBET('Paser was the vizier of the north. When the sun stopped, he told the people he had stopped it — that the dusk was his, and the dark lector his priest. Half the north believed him.'),
      SESHET('The throne-stela in Per-Wadjet names him king. As long as it stands, every hymn we sing is sung to his sun.'),
      PASER('Turn back, priestess. A kingdom of dusk is still a kingdom. I will rule it well.'),
    ],
    victory: [SESHET('The stela is broken and the north is free of his crown. Paser has nothing left but the Lector’s promises. Neither do we — except that we know where the barque is.')],
    town: { townId: 'tjebu', name: 'Tjebu', description: 'A town on the river road north, loyal to the old hymns.' },
    biome: 'desert',
    soundscape: 'desert',
    gold: { name: 'Gold Mine', description: 'An unowned mine.', guard: { label: 'Mine boars', army: [['tusked_boar', 10]], reward: { resources: { gold: 500 } }, battlefield: 'open_field' } },
    event: {
      name: 'Oasis of the Old Well',
      description: 'An oasis whose well never runs dry.',
      title: 'The Old Well',
      text: 'At the bottom of the well something gleams — a coin, a ring, a cup — and a voice from the water says: “Take one, or leave them all and drink.”',
      options: [
        { label: 'Take the gleam', summary: '+1,500 Gold.', reward: { resources: { gold: 1500 } } },
        { label: 'Leave it and drink', summary: 'Seshet gains +1 Defense and +1 Knowledge.', reward: { attributes: { defense: 1, knowledge: 1 } } },
      ],
    },
    north: { name: 'Golem Ford', description: 'The northern ford, held by clay golems on Paser’s orders.', guard: { label: 'Ford golems', army: [['clay_golem', 8]], reward: { resources: { gold: 800 } }, battlefield: 'coast_road' } },
    south: {
      name: 'Hireling Ford',
      description: 'The southern ford, held by Paser’s hired swords.',
      guard: {
        label: 'Ford hirelings',
        army: [
          ['brigand', 24],
          ['brigand_cutthroat', 10],
        ],
        reward: { resources: { gold: 800 } },
        battlefield: 'coast_road',
      },
    },
    stele: { name: 'Throne Stela', description: 'The stela that names Paser king of the dusk.', confirm: 'Break the Throne Stela? This completes The Red Vizier.' },
    rival: {
      playerId: 'per_wadjet',
      townId: 'per_wadjet',
      townName: 'Per-Wadjet',
      townDescription: 'Paser’s capital, its walls painted red.',
      color: '#b8433a',
      hero: { heroId: 'paser', definitionId: 'egyptian_paser', classId: 'vizier', name: 'Paser' },
      army: [
        ['egyptian_solar_scarab', 26],
        ['egyptian_anubian_warden', 10],
        ['egyptian_sphinx', 3],
      ],
      garrison: [
        ['egyptian_solar_scarab', 24],
        ['egyptian_anubian_warden', 8],
        ['egyptian_sphinx', 2],
      ],
      reward: { artifactIds: ['boots_of_the_long_road'] },
    },
    objectives: { crossing: 'Cross the river', god: 'A second god', town: 'Take Per-Wadjet', stele: 'Break the throne stela', rival: 'Defeat Paser (optional)', event: 'The old well (optional)' },
    scenes: (ids) => [
      { id: 'm05_crossed', trigger: { type: 'objective_completed', objectiveId: ids.crossing }, lines: [NEBET('We are over. Paser will know by tonight.'), SESHET('Let him. A king who has to be told he is king is already afraid.')] },
      { id: 'm05_paser', trigger: { type: 'battle_started', heroDefinitionId: ids.rival }, lines: [PASER('You fight for a sun that has left you. I fight for the people who are still here.'), SESHET('Then you should have asked them.')] },
      { id: 'm05_taken', trigger: { type: 'objective_completed', objectiveId: ids.town }, lines: [SESHET('Per-Wadjet is ours. Break the stela, and the north sings our hymn again.')] },
    ],
  });

  const m6 = refugeMission(ctx, {
    name: 'The Phoenix Rookery',
    summary: 'The bennu birds, whose rising is the sun’s own, are caged in their rookery under the cliffs of Iunu. Break the jailers, accept the bennu covenant, raise firebirds of your own and defeat Hekaib at the rookery gate.',
    newDecisions: ['Claim a covenant from the journal', 'Firebirds in the escort', 'A gate captain'],
    briefing: [
      PAWAH('Every dawn the bennu bird rises from the fire at Iunu, and the sun follows it. Every dawn — until the Lector caged the birds.'),
      SESHET('Free them, and the sun has wings again. Then we can follow it down.'),
      NEBET('His sword holds the rookery gate. Hekaib. I trained with him, priestess. He does not lose.'),
    ],
    victory: [SESHET('The bennu fly. Tonight the sun went down in a blaze, and I saw the road it takes — down, through the hours, to the hall where the barque is held.')],
    town: { townId: 'iunu', name: 'Iunu', description: 'The sun’s own city, dark for the first time in its history.' },
    biome: 'desert',
    soundscape: 'desert',
    north: {
      name: 'Golem Steps',
      description: 'The northern steps up to the rookery, held by golems.',
      guard: {
        label: 'Step golems',
        army: [
          ['clay_golem', 8],
          ['bronze_golem', 2],
        ],
        reward: { resources: { gold: 1000 } },
        battlefield: 'ridge_pass',
      },
    },
    south: {
      name: 'Cutthroat Stair',
      description: 'The southern stair, held by cutthroats and their boars.',
      guard: {
        label: 'Stair cutthroats',
        army: [
          ['brigand_cutthroat', 24],
          ['tusked_boar', 6],
        ],
        reward: { resources: { gold: 1000 } },
        battlefield: 'ridge_pass',
      },
    },
    event: {
      name: 'An Egg in the Ashes',
      description: 'An egg of myrrh, warm in a bed of cold ash.',
      title: 'The Egg of Myrrh',
      text: 'The egg is myrrh, the shape of the bennu’s own, and it is warm. Carried, it will keep warm for a month. Burned, its smoke will tell you the names of the hours.',
      options: [
        { label: 'Carry it', summary: '+2 Crystal and +10 Favor.', reward: { resources: { crystal: 2, favor: 10 } } },
        { label: 'Burn it and learn the hours', summary: 'Seshet gains 1,000 experience.', reward: { questXp: 1000 } },
      ],
    },
    refuge: {
      name: 'The Rookery',
      description: 'The bennu cages, under the Lector’s jailers.',
      guard: {
        label: 'Rookery jailers',
        army: [
          ['egyptian_solar_scarab', 30],
          ['bronze_golem', 3],
          ['egyptian_sobek_warbeast', 2],
        ],
        reward: { resources: { gold: 1500 } },
        battlefield: 'grove',
      },
    },
    nest: { name: 'Ogre Den', description: 'Two ogre chieftains in a cave of stolen offerings.', guard: { label: 'Ogre chieftains', army: [['ogre_chieftain', 2]], reward: { resources: { crystal: 6 } }, battlefield: 'grove' } },
    gate: {
      name: 'Rookery Gate',
      description: 'The gate to the sun’s road, held by Hekaib.',
      guard: {
        label: 'Hekaib and the gate guard',
        army: [
          ['egyptian_solar_scarab', 30],
          ['egyptian_anubian_warden', 10],
          ['egyptian_royal_ushabti', 4],
          ['egyptian_great_sphinx', 3],
        ],
        commander: arcCommander(H['egyptian_hekaib']!, 'gate6'),
        reward: { resources: { gold: 1500 }, artifactIds: ['scarab_scale_corselet'] },
        battlefield: 'ridge_pass',
      },
    },
    horn: { name: 'Altar of the Rising', description: 'The altar where the bennu’s fire is lit.', confirm: 'Light the fire of the rising? This completes The Phoenix Rookery.' },
    band: { id: 'egyptian_bronze_guardians', name: 'Bronze Guardians', army: [['bronze_golem', 6]] },
    objectives: {
      approach: 'Climb to the rookery',
      refuge: 'Break the jailers',
      claim: 'Accept the bennu covenant',
      claimDescription: 'Accept the bennu’s covenant in the journal. It can then be assigned to Iunu.',
      elite: 'Firebirds in the escort',
      gate: 'Hekaib at the gate',
      horn: 'Light the fire of the rising',
      event: 'The egg of myrrh (optional)',
    },
    scenes: (ids) => [
      { id: 'm06_freed', trigger: { type: 'site_cleared', siteId: ids.refuge }, lines: [SESHET('The cages are open. They will not come out until they choose to — the bennu answer covenants, not keys.'), PAWAH('Then ask them, priestess. Politely.')] },
      { id: 'm06_hekaib', trigger: { type: 'battle_started', siteId: ids.gate }, lines: [NEBET('Hekaib! We stood on the same wall at Abu. Stand aside.'), DJED('He stands where I put him, captain. As you will, soon.')] },
      { id: 'm06_gate', trigger: { type: 'objective_completed', objectiveId: ids.gateObjective }, lines: [NEBET('He fought well. He always did. I will bury him at Abu, when this is over.')] },
    ],
  });

  const m7 = finaleMission(ctx, {
    name: 'The Twelfth Hour',
    summary: 'The barque of the sun is held in the Hall of the Coil, at the bottom of the night. Cross into the hours, open the gate with both horizon-stones, defeat Djedkhonsu and decide what becomes of the coiled dark.',
    newDecisions: ['Two stones, one gate', 'The Hollow Lector', 'The last choice'],
    briefing: [
      SESHET('The twelfth hour. Every night the sun passes it, and every night the old priests sang it through. Djedkhonsu has built a hall across the road — and in it, something coiled, holding the barque.'),
      PAWAH('Two horizon-stones open the last gate, one on each side of the road. Iti the warden walks between them.'),
      DJED('Come down, then, reader. I have saved you a place in the dark.'),
    ],
    victory: [SESHET('The barque moves. I felt it — like a held breath let go.')],
    town: { townId: 'abu', name: 'Abu', description: 'The southernmost town of the river, at the edge of the night road.' },
    biome: 'desert',
    soundscape: 'storm_plateau',
    north: {
      name: 'Western Descent',
      description: 'The northern way down into the hours.',
      guard: {
        label: 'Descent guard',
        army: [
          ['egyptian_solar_scarab', 30],
          ['egyptian_anubian_warden', 6],
        ],
        reward: { resources: { gold: 1000 } },
        battlefield: 'ridge_pass',
      },
    },
    south: {
      name: 'Serpent Stair',
      description: 'The southern way down, where the coil’s children sleep.',
      guard: {
        label: 'Coil’s children',
        army: [
          ['basilisk', 2],
          ['egyptian_solar_scarab', 12],
        ],
        reward: { resources: { gold: 1000 } },
        battlefield: 'ridge_pass',
      },
    },
    stones: { north: { name: 'Stone of the Western Horizon', description: 'The horizon where the sun sets.' }, south: { name: 'Stone of the Eastern Horizon', description: 'The horizon where the sun rises.' }, cost: { gold: 300, stone: 3 } },
    nest: { name: 'Wyvern Ledge', description: 'Wyverns roost on a ledge of the night.', guard: { label: 'Night wyverns', army: [['wyvern_matriarch', 3]], reward: { resources: { crystal: 6 } }, battlefield: 'grove' } },
    gate: { name: 'Gate of the Twelfth Hour', description: 'The last gate of the night. Both horizon-stones must be sung to open it.' },
    cache: { name: 'Offerings of the Hours', description: 'Offerings left by the old priests at each hour.', reward: { resources: { gold: 1500, crystal: 3 } } },
    hall: {
      name: 'Hall of the Coil',
      description: 'Djedkhonsu’s hall, built across the sun’s road. Something vast is coiled in its dark.',
      guard: {
        label: 'Djedkhonsu and the coil’s court',
        army: [
          ['bronze_golem', 2],
          ['egyptian_solar_scarab', 20],
          ['egyptian_solar_scarab', 20],
          ['egyptian_anubian_warden', 12],
          ['greater_basilisk', 2],
          ['egyptian_sobek_warbeast', 2],
        ],
        commander: arcCommander(H['egyptian_djedkhonsu']!, 'boss7', ['wrath_of_sekhmet']),
        reward: { resources: { gold: 2000 } },
        battlefield: 'beacon_clearing',
      },
    },
    choice: {
      name: 'The Barque of the Sun',
      description: 'The sun’s barque, aground on a coil of the dark.',
      title: 'The Coil and the Barque',
      text: 'With the Lector fallen, only the coil holds the barque: a loop of the dark as thick as a temple column. Sung down, it can be bound under the hall again — the old way, with a priestess to renew the binding every year. Cut, it will never hold anything again; but the night will be a little wilder ever after, without its old enemy to fight.',
      a: { flag: 'coil_bound', label: 'Bind the coil', summary: 'The coil is bound under the hall, with Seshet as its keeper. Seshet gains 500 experience.' },
      b: { flag: 'coil_cut', label: 'Cut the coil', summary: 'The coil is cut and gone forever; the night grows wilder. Seshet gains 500 experience.' },
    },
    seal: { name: 'The Twelfth Gate', description: 'The doorway of the dawn.', confirm: 'Sing the barque through the twelfth gate? This completes The Twelfth Hour.' },
    patrol: {
      commander: arcCommander(H['egyptian_iti']!, 'patrol7'),
      army: [
        ['egyptian_solar_scarab', 24],
        ['egyptian_anubian_warden', 8],
        ['egyptian_royal_ushabti', 2],
      ],
    },
    objectives: { approach: 'Down into the hours', north: 'The western horizon', south: 'The eastern horizon', gate: 'Open the twelfth gate', boss: 'The Hollow Lector', choice: 'The coil', seal: 'Sing the barque home' },
    scenes: (ids) => [
      { id: 'm07_gate', trigger: { type: 'objective_completed', objectiveId: ids.gate }, lines: [PAWAH('Both horizons. I have ferried the dead for fifty years, priestess, and I never thought to see both at once.')] },
      { id: 'm07_djed', trigger: { type: 'battle_started', siteId: ids.hall }, lines: [DJED('I gave them a dusk that never ends. No scales, no judgement, no morning to fear. They should thank me.'), SESHET('They wanted a morning. You never asked.')] },
      { id: 'm07_fallen', trigger: { type: 'objective_completed', objectiveId: ids.boss }, lines: [SESHET('He is gone. But the coil still holds the barque. One last thing to decide.')] },
    ],
  });

  const built = [m1, m2, m3, m4, m5, m6, m7];
  const missions = built.map((b) => b.mission);
  return {
    templates: built.map((b) => b.template),
    missions,
    entitlements: arcEntitlements(ctx, { t3: 'Ushabti Covenant', t6: 'Bennu Covenant' }, { t3: 'The sculptor’s covenant allows an Ushabti workshop to be built in one town.', t6: 'The freed bennu allow a Bennu rookery to be built in one town.' }),
    campaign: arcCampaign(
      ctx,
      {
        name: 'The Twelfth Hour',
        tagline: 'Sing. Descend. Rise.',
        summary: 'The sun has stopped below the horizon. Lead the lector priestess Seshet through seven linked missions — from the red dawns of Abedju down through the hours of the night — to free the barque of the sun from the Hollow Lector and the coiled dark.',
        startingGodNote: 'Ra is the fixed patron of this campaign. Set or Isis comes in Mission 3; a second god (Osiris, Thoth or Horus) in Mission 5.',
        epilogue: [
          NEBET('The sun came up white this morning. Not red — white, the way it should. The fields are steaming.'),
          PAWAH('Twelve hours, a black boar, a red vizier, a library under water and a flock of firebirds. The children will want the story every night.'),
        ],
        endings: [
          { flag: 'coil_bound', lines: [SESHET('The coil sleeps under the hall, and I hold the binding. Every year I will go down and sing it again.'), NEBET('Then every year I will go with you, priestess.')] },
          { flag: 'coil_cut', lines: [SESHET('The coil is gone. The night will be wilder now — storms, strange stars, a darker dark between the hours.'), PAWAH('Wilder nights, but every one of them ends. I will take that bargain.')] },
        ],
      },
      missions,
    ),
  };
}
