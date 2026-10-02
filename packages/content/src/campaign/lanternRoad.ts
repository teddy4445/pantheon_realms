/**
 * The Lantern Road — the Japanese campaign (seven missions), built on the
 * Winter Oath arc (arc.ts). Owner request 2026-10-02.
 *
 * Original fiction in a Japanese-inspired setting: the lanterns that guide the
 * spirits home have gone dark, the road between this world and the next is
 * closing, and a shrine diviner relights it province by province. Not a
 * retelling of any tale. Every number is proposed and unplaytested.
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

const P = 'japanese';
const AKANE = speaker(P, 'Akane');
const SHIRO = speaker(P, 'Shiro');
const GENZO = speaker(P, 'Genzo');
const YAMIKAGE = speaker(P, 'Yamikage');
const KUROGANE = speaker(P, 'Kurogane');

export const LANTERN_ROAD_HEROES: readonly HeroDefinition[] = [
  arcHero(P, 'japanese_akane', 'Akane', 'Diviner of the Western Shrine', 'onmyoji', 'A shrine diviner who reads the lantern-smoke at the festival of the dead. The hero of The Lantern Road.', 'campaign'),
  arcHero(P, 'japanese_yamikage', 'Yamikage', 'The Lantern-Eater', 'onmyoji', 'A spirit of the borderlands who learned to swallow light, and swallowed the lanterns of seven provinces. Final opponent of The Lantern Road.', 'enemy'),
  arcHero(P, 'japanese_kurogane', 'Kurogane', 'The Iron Daimyo', 'daimyo', 'A lord who fences the wandering dead into his army and calls them loyal. Rival empire in The Lantern Road, mission 5.', 'enemy'),
  arcHero(P, 'japanese_gonryo', 'Gonryō', 'Captain of the Fog Fleet', 'samurai', 'A sea captain whose ships sail out of the fog and never into port. Patrol in The Lantern Road, mission 4.', 'enemy'),
  arcHero(P, 'japanese_oboro', 'Oboro', 'General of the Hazy Moon', 'samurai', 'Yamikage’s general, who holds the kirin meadow’s gate. The Lantern Road, mission 6.', 'enemy'),
  arcHero(P, 'japanese_kagero', 'Kagerō', 'Warden of the Last Torii', 'samurai', 'A warden who walks the road between the sun stone and the moon stone. Patrol in The Lantern Road, mission 7.', 'enemy'),
];
const H = Object.fromEntries(LANTERN_ROAD_HEROES.map((h) => [h.id, h]));

export function buildLanternRoad(names: ArcCampaignContext['names'], familyOf: ArcCampaignContext['familyOf']): {
  templates: MapTemplateDefinition[];
  missions: MissionDefinition[];
  campaign: CampaignDefinition;
  entitlements: EntitlementDefinition[];
} {
  const ctx: ArcCampaignContext = {
    id: 'lantern_road',
    pantheonId: P,
    archetypeId: 'japanese_castle_town',
    hero: { heroId: 'akane', definitionId: 'japanese_akane', classId: 'onmyoji', name: 'Akane' },
    gods: { patron: 'japanese_amaterasu', first: ['japanese_hachiman', 'japanese_susanoo'], second: ['japanese_inari', 'japanese_fujin', 'japanese_raijin'] },
    t: [
      { base: '', up: '' },
      { base: 'japanese_kitsune', up: 'japanese_nine_tailed_kitsune' },
      { base: 'japanese_kappa', up: 'japanese_river_elder_kappa' },
      { base: 'japanese_tengu', up: 'japanese_great_tengu' },
      { base: 'japanese_oni', up: 'japanese_oni_warlord' },
      { base: 'japanese_jorogumo', up: 'japanese_queen_jorogumo' },
      { base: 'japanese_kirin', up: 'japanese_celestial_kirin' },
      { base: 'japanese_orochi', up: 'japanese_imperial_orochi' },
    ],
    covenantT3: 'japanese_tengu',
    covenantT6: 'japanese_kirin',
    covenantT7: 'japanese_orochi',
    hostName: 'The Lantern-Eater’s Procession',
    hiringReason: 'Akane walks the lantern road with her own retinue. Hero hiring is disabled in The Lantern Road.',
    debriefPolicy: [
      'Akane keeps her level, experience (up to the displayed cap), skills, spellbook, spells and equipment.',
      'Amaterasu and every kami she has committed to carry into the next mission.',
      'Troops, resources, towns, mines and recruitment pools stay behind to guard the road.',
      'The next mission begins with its declared retinue and treasury.',
    ],
    seed: 420000,
    names,
    familyOf,
  };

  const m1 = restoreMission(ctx, {
    name: 'The Unlit Lantern',
    summary: 'On the night of the festival of the dead, not one lantern in Kagaribi would light. Raise a fox retinue, clear the bamboo bridge and relight the great stone lantern on the pass.',
    newDecisions: ['Recruit and train', 'Harmony', 'Learn spells at the Mage Guild', 'A one-time choice'],
    briefing: [
      SHIRO('Every lantern, priestess. The paper ones, the stone ones, the ones in the river. The dead came down the mountain to find their way home and found nothing but dark.'),
      AKANE('Then they are still out there, wandering. The great lantern on the pass lights all the others. If it is dark, someone put it out.'),
      GENZO('Men with straw hats and long blades have been seen on the pass road. And the boars have taken the bamboo bridge. I would not go alone.'),
    ],
    victory: [AKANE('The great lantern burns, and one by one the little ones are catching. But only here. Beyond the mountains the road is still dark.')],
    town: { townId: 'kagaribi', name: 'Kagaribi', description: 'Akane’s shrine-town, famous for its festival lanterns.' },
    biome: 'autumn',
    soundscape: 'high_pass',
    barrier: 'water',
    event: {
      name: 'Abandoned Tea House',
      description: 'A roadside tea house whose keeper fled in the night.',
      title: 'The Abandoned Tea House',
      text: 'The kettle is still warm. The keeper left in such a hurry that the till is full — and four small foxes sit in a row on the veranda, as if waiting for someone to tell them where to go.',
      options: [
        { label: 'Take the till', summary: '+600 Gold and +4 Wood.', reward: { resources: { gold: 600, wood: 4 } } },
        { label: 'Ask the foxes to follow you', summary: '4 Kitsune join Akane’s retinue.', reward: { creatures: [{ creatureId: 'japanese_kitsune', count: 4 }] } },
      ],
    },
    camp: { name: 'Kappa Pool', description: 'River kappa who will serve anyone polite enough to bow first.', creatureId: 'japanese_kappa' },
    crossing: {
      name: 'Bamboo Bridge',
      description: 'The bridge to the pass road. Wild boars, maddened by the dark nights, hold it.',
      guard: { label: 'Bridge boars', army: [['wild_boar', 8]], reward: { resources: { gold: 300, wood: 3, stone: 3 } }, battlefield: 'coast_road' },
    },
    cache: { name: 'Pilgrim’s Shelter', description: 'A shelter where pilgrims left offerings for the road.', reward: { resources: { gold: 400, crystal: 1 } } },
    monument: {
      name: 'Great Lantern of the Pass',
      description: 'The stone lantern that lights the spirits’ road. Ronin in straw hats stand around it.',
      guard: {
        label: 'Straw-hat ronin',
        army: [
          ['brigand', 14],
          ['brigand_cutthroat', 4],
        ],
        reward: { resources: { gold: 500 }, artifactIds: ['dragon_kabuto'] },
        battlefield: 'beacon_clearing',
      },
      confirm: 'Relight the Great Lantern of the Pass? This completes The Unlit Lantern.',
    },
    objectives: { recruit: 'Gather the fox retinue', train: 'Teach the foxes their tails', crossing: 'Clear the bamboo bridge', guard: 'Drive off the ronin', activate: 'Relight the great lantern', event: 'The abandoned tea house (optional)' },
    scenes: (ids) => [
      { id: 'm01_bridge', trigger: { type: 'site_cleared', siteId: ids.crossing }, lines: [GENZO('Those boars were tied to the bridge posts. Someone wanted the road closed.'), AKANE('Then someone is afraid of what the lantern shows.')] },
      { id: 'm01_lantern_battle', trigger: { type: 'battle_started', siteId: ids.monument }, lines: [YAMIKAGE('Little diviner. Light is a meal, and I am very hungry. Leave the lantern to me.'), AKANE('Go hungry, then.')] },
      { id: 'm01_kabuto', trigger: { type: 'site_cleared', siteId: ids.monument }, lines: [SHIRO('Their leader wore this — a dragon helm from the Kumoyama shrine treasury.'), AKANE('Stolen from a shrine and worn by a bandit. Whoever pays these men has been inside our shrines.')] },
      { id: 'm01_losses', trigger: { type: 'casualties', minLost: 4 }, lines: [SHIRO('We lost foxes today, priestess. Foxes remember.'), AKANE('So do I. We will be more careful.')] },
    ],
    help: [{ id: 'harmony', title: 'Harmony', text: 'The Japanese signature: with creatures of three or more different families in the army, every stack gains +1 Defense when a battle starts.' }],
  });

  const m2 = huntMission(ctx, {
    name: 'The Boar Lord',
    summary: 'A giant boar and its herd run the rice terraces of Mizuhara and keep the spirits from the river lantern. Raise kappa of your own, cross the river, hunt the Boar Lord and relight the lantern of the mountain road.',
    newDecisions: ['Hunt a wandering herd', 'Use a lookout', 'Buy or bargain on the road'],
    briefing: [
      GENZO('Mizuhara’s terraces are ruined. A boar as big as an ox runs there with a herd at its back, and it does not eat the rice. It tramples it.'),
      AKANE('A beast that wastes food is a beast someone has sent. The river lantern is beyond the terraces — and it is dark.'),
      SHIRO('Kappa, priestess. Kappa know the river, and boars do not swim.'),
    ],
    victory: [GENZO('Two lanterns lit. Now the old monks say the Crow Monastery on the high pass has stopped ringing its bell. That is where the road climbs next.')],
    town: { townId: 'mizuhara', name: 'Mizuhara', description: 'A village of rice terraces on the river.' },
    biome: 'autumn',
    soundscape: 'coast',
    barrier: 'water',
    lookout: { name: 'Pagoda of Five Roofs', description: 'From its top roof, the land beyond the river lies open.' },
    event: {
      name: 'Clog-maker’s Workshop',
      description: 'A clog-maker who once made shoes for a tengu.',
      title: 'The Clog-maker',
      text: '“A tengu came to me once for shoes,” the old man says. “He paid in feathers. I kept one pair for myself — one tooth, very tall. Walk in them and the road is shorter.” He sets them on the bench. “Or sit, and I will tell you what the tengu told me about boars.”',
      options: [
        { label: 'Buy the tengu clogs', summary: 'Pay 2,000 Gold for the Tengu Geta.', cost: { gold: 2000 }, reward: { artifactIds: ['tengu_geta'] } },
        { label: 'Sit and listen', summary: 'Akane gains +1 Knowledge.', reward: { attributes: { knowledge: 1 } } },
      ],
    },
    camp: { name: 'Reed Pool', description: 'Kappa who have not fled the boars.', creatureId: 'japanese_kappa' },
    bridge: {
      name: 'Plank Bridge',
      description: 'The bridge over the river, held by ronin.',
      guard: {
        label: 'Bridge ronin',
        army: [
          ['brigand', 16],
          ['brigand_cutthroat', 6],
        ],
        reward: { resources: { gold: 600, favor: 3 } },
        battlefield: 'coast_road',
      },
    },
    lair: {
      name: 'Boar Wallow',
      description: 'A muddy hollow under the cedars, where something bright lies trampled into the mud.',
      guard: {
        label: 'Wallow boars',
        army: [
          ['tusked_boar', 4],
          ['wild_boar', 6],
        ],
        reward: { resources: { gold: 500 }, artifactIds: ['magatama_string'] },
        battlefield: 'grove',
      },
    },
    stone: { name: 'River Lantern', description: 'The lantern of the mountain road, standing in the river shallows.', confirm: 'Relight the River Lantern? This completes The Boar Lord.' },
    prey: {
      id: 'japanese_boar_lord',
      name: 'The Boar Lord',
      portraitAssetId: 'creature.neutral.wild_boar.upgraded.portrait',
      army: [
        ['tusked_boar', 6],
        ['wild_boar', 12],
      ],
      bounty: { gold: 800 },
    },
    objectives: {
      recruit: 'Kappa of our own',
      lookout: 'Climb the pagoda',
      bridge: 'Take the plank bridge',
      prey: 'Hunt the Boar Lord',
      preyHint: 'The herd roams the terraces beyond the river and only charges a retinue it is sure it can beat. Move onto it to fight.',
      activate: 'Relight the river lantern',
      lair: 'The boar wallow (optional)',
      event: 'The clog-maker (optional)',
    },
    scenes: (ids) => [
      { id: 'm02_pagoda', trigger: { type: 'site_visited', siteId: ids.lookout }, lines: [AKANE('There — the terraces are trampled in a ring around the river lantern. They are not feeding. They are guarding it.'), SHIRO('Then it still matters to somebody.')] },
      { id: 'm02_boar_battle', trigger: { type: 'battle_started', heroDefinitionId: ids.prey }, lines: [YAMIKAGE('Trample her, great one. Trample her into the mud with the rice.')] },
      { id: 'm02_boar_broken', trigger: { type: 'objective_completed', objectiveId: ids.preyObjective }, lines: [GENZO('The Boar Lord is down. The herd is scattering into the cedars.'), AKANE('Let them go. Without their lord they are only pigs.')] },
    ],
  });

  const m3 = covenantMission(ctx, {
    name: 'The Crow Monastery',
    summary: 'The bell of the Crow Monastery on Kumoyama has stopped. Break the ronin on the mountain road, free the oni of the red hall from their clay jailers, win the tengu covenant — by the abbot’s price or by force — and take a kami for the road ahead.',
    newDecisions: ['A covenant: pay or fight', 'Your first minor god', 'Elite troops in the army'],
    briefing: [
      GENZO('The tengu of Kumoyama keep the bell that wakes the mountain road. The bell has been silent for a month.'),
      AKANE('Tengu ring for whoever holds their covenant. If the bell is silent, someone else holds it.'),
      SHIRO('And the red oni in the old hall have stopped coming down to drink. Oni always come down to drink.'),
    ],
    victory: [AKANE('The bell rings, a kami walks with us and the mountain road is lit. From here the road goes down to the sea.')],
    town: { townId: 'kumoyama', name: 'Kumoyama', description: 'A mountain town below the Crow Monastery.' },
    biome: 'high_pass',
    soundscape: 'high_pass',
    cache: { name: 'Pilgrims’ Storehouse', description: 'Rice and silver left by pilgrims who turned back.', reward: { resources: { gold: 700, wood: 5 }, artifactIds: ['omamori_charm'] } },
    pass: {
      name: 'Mountain Road',
      description: 'The only road up the mountain, held by ronin.',
      guard: {
        label: 'Mountain ronin',
        army: [
          ['brigand', 16],
          ['brigand_cutthroat', 6],
        ],
        reward: { resources: { gold: 750, favor: 5 } },
        battlefield: 'ridge_pass',
      },
    },
    roost: {
      name: 'Hall of the Red Oni',
      description: 'An old hall where oni drink and sleep. Haniwa — clay tomb-figures — stand at its doors like jailers.',
      guard: { label: 'Haniwa jailers', army: [['clay_golem', 5]], reward: { resources: { favor: 5 }, artifactIds: ['bronze_buckler'] }, battlefield: 'ridge_pass' },
    },
    hearth: {
      name: 'The Abbot’s Gate',
      description: 'The tengu abbot sits on the monastery gate, long-nosed and patient.',
      title: 'The Tengu Abbot',
      text: '“Our covenant was bought,” the abbot says, “by a man with a lantern for a face. Bought, not won — so it can be bought back. Pay what he paid, and the bell is yours. Or climb to the Crow Hall and take it from my monks. They have been bored since the bell stopped.”',
      price: { gold: 1500, wood: 10 },
      payLabel: 'Pay the abbot’s price',
      refuseLabel: 'Refuse — take it at the Crow Hall',
    },
    home: {
      name: 'Crow Hall',
      description: 'The tengu monks’ hall, where the bought covenant hangs on the wall.',
      guard: {
        label: 'Tengu monks',
        army: [
          ['japanese_tengu', 4],
          ['japanese_great_tengu', 1],
        ],
        reward: { resources: { gold: 1000 } },
        battlefield: 'grove',
      },
    },
    bridge: {
      name: 'Rope Bridge',
      description: 'A rope bridge over the gorge, held by ronin and their boars.',
      guard: {
        label: 'Gorge ronin',
        army: [
          ['brigand_cutthroat', 12],
          ['tusked_boar', 4],
        ],
        reward: { resources: { gold: 800 } },
        battlefield: 'ridge_pass',
      },
    },
    stone: { name: 'Mountain Lantern', description: 'The lantern where the spirits’ road crosses the summit.', confirm: 'Relight the Mountain Lantern? This completes The Crow Monastery.' },
    band: { id: 'japanese_cedar_boars', name: 'Cedar Boars', army: [['wild_boar', 6]] },
    objectives: {
      pass: 'Take the mountain road',
      roost: 'Free the red oni',
      covenant: 'The tengu covenant',
      covenantDescription: 'Win the tengu covenant: pay the abbot’s price at the gate, or beat his monks at the Crow Hall.',
      god: 'A kami for the road',
      elite: 'Oni warlords in the retinue',
      activate: 'Relight the mountain lantern',
      cache: 'The pilgrims’ storehouse (optional)',
    },
    scenes: (ids) => [
      { id: 'm03_oni', trigger: { type: 'site_cleared', siteId: ids.roost }, lines: [SHIRO('The oni are awake and very thirsty. They say they will remember who broke the clay.'), AKANE('Good. I want them to remember.')] },
      { id: 'm03_crow_hall', trigger: { type: 'site_cleared', siteId: ids.home }, lines: [GENZO('The paper on the wall — the covenant. It is signed with a lantern, burned through the middle.'), AKANE('A lantern with its light eaten out. I know that mark now.')] },
      { id: 'm03_god', trigger: { type: 'objective_completed', objectiveId: ids.god }, lines: [AKANE('A kami walks with us. Whatever eats the light, it will not find us alone in the dark.')] },
    ],
  });

  const m4 = seekMission(ctx, {
    name: 'The Spirit Sea',
    summary: 'The Hall of Mirrors stands on an island in the Spirit Sea, behind a fog that eats boats. Raise spider-women of your own, take the landing, ring both shrine bells to clear the fog and look into the mirrors for the Lantern-Eater’s home.',
    newDecisions: ['Ring two bells to open a way', 'A commanded patrol', 'Spider-women'],
    briefing: [
      AKANE('The Hall of Mirrors shows what has been hidden. If anything knows where the Lantern-Eater sleeps, the mirrors do.'),
      GENZO('The fog came in when the lanterns went out, and a fleet sails in it — ships with no lights. Their captain walks the islands.'),
      SHIRO('Two shrine bells, one on each island. Ring them both and the fog has to listen.'),
    ],
    victory: [AKANE('The mirrors showed me: a palace at the end of the road, where the last torii stands. And a lord of iron between here and there, who fences the wandering dead into his army.')],
    town: { townId: 'shiogama', name: 'Shiogama', description: 'A salt-makers’ harbour on the Spirit Sea.' },
    biome: 'coast',
    soundscape: 'coast',
    wanderer: {
      name: 'A Wandering Monk',
      description: 'A monk in a basket hat, playing a flute on the shore.',
      title: 'The Flute-playing Monk',
      text: 'He stops playing when you come near. “You are going to the mirrors,” he says. “Look twice — the first look shows you what you want to see.” He holds out a travelling cloak, salt-stiff. “The sea wind is cold. Or sit, and I will teach you a tune that fog does not like.”',
      options: [
        { label: 'Take the cloak', summary: 'The Wayfarer’s Cloak joins Akane’s backpack.', reward: { artifactIds: ['wayfarer_cloak'] } },
        { label: 'Learn the tune', summary: 'Akane gains +1 Spell Power and +1 Knowledge.', reward: { attributes: { power: 1, knowledge: 1 } } },
      ],
    },
    wreck: { name: 'Beached Salt Boat', description: 'A salt boat driven ashore by the fog; its strongbox is dry.', reward: { resources: { gold: 900, wood: 4 } } },
    landing: {
      name: 'Island Landing',
      description: 'The landing on the near island, held by the fog fleet’s raiders.',
      guard: {
        label: 'Fog-fleet raiders',
        army: [
          ['brigand', 20],
          ['brigand_cutthroat', 8],
        ],
        reward: { resources: { gold: 800, favor: 3 } },
        battlefield: 'coast_road',
      },
    },
    omen: {
      name: 'The Lightless Ship',
      description: 'A ship of the fog fleet, aground and empty.',
      title: 'The Lightless Ship',
      text: 'Every lamp on the ship has been emptied — the oil drunk, not spilled. In the captain’s cabin, a chest of silver and a rack of kappa-skin raincoats.',
      options: [
        { label: 'Take the silver', summary: '+800 Gold and +2 Crystal.', reward: { resources: { gold: 800, crystal: 2 } } },
        { label: 'Give the raincoats to the kappa', summary: '6 River Elder Kappa join Akane’s retinue.', reward: { creatures: [{ creatureId: 'japanese_river_elder_kappa', count: 6 }] } },
      ],
    },
    relays: { north: { name: 'North Shrine Bell', description: 'A shrine bell on the northern island.' }, south: { name: 'South Shrine Bell', description: 'A shrine bell on the southern island.' }, cost: { gold: 250, stone: 3 } },
    nest: { name: 'Ogre Grotto', description: 'Two ogres sleep in a sea cave full of stolen nets.', guard: { label: 'Grotto ogres', army: [['ogre', 2]], reward: { resources: { crystal: 5 } }, battlefield: 'grove' } },
    gate: { name: 'Wall of Fog', description: 'A wall of fog that eats boats. Both shrine bells must ring to clear it.' },
    goal: {
      name: 'Hall of Mirrors',
      description: 'A hall of bronze mirrors on the far island. Spider-women weave over its doors.',
      guard: {
        label: 'Mirror-weavers',
        army: [
          ['japanese_jorogumo', 3],
          ['japanese_queen_jorogumo', 1],
        ],
        reward: { resources: { gold: 1000 } },
        battlefield: 'coast_road',
      },
      reward: { questXp: 2200, artifactIds: ['storm_gods_tachi'] },
      confirm: 'Look into the mirrors? This completes The Spirit Sea.',
    },
    patrol: {
      commander: arcCommander(H['japanese_gonryo']!, 'patrol4'),
      army: [
        ['japanese_nine_tailed_kitsune', 16],
        ['japanese_river_elder_kappa', 6],
      ],
    },
    objectives: { recruit: 'Spider-women of our own', landing: 'Take the island landing', north: 'The north bell', south: 'The south bell', gate: 'Clear the fog', goal: 'Look into the mirrors', nest: 'The ogre grotto (optional)', wanderer: 'The flute-playing monk (optional)' },
    scenes: (ids) => [
      { id: 'm04_landing', trigger: { type: 'site_cleared', siteId: ids.landing }, lines: [GENZO('No lamps on any of their boats. They sail by smell.'), AKANE('Then their captain is close. Keep the retinue together.')] },
      { id: 'm04_fog', trigger: { type: 'objective_completed', objectiveId: ids.gate }, lines: [SHIRO('Listen — the fog is leaving like a guest who was told the party is over.')] },
      { id: 'm04_mirrors', trigger: { type: 'battle_started', siteId: ids.goal }, lines: [YAMIKAGE('Look into my mirrors, diviner. You will see the dark — and the dark will see you.')] },
    ],
  });

  const m5 = rivalMission(ctx, {
    name: 'The Iron Daimyo',
    summary: 'Lord Kurogane fences the wandering dead into his army and holds the Iron Castle and the Lantern of Oaths. Cross the river, take a second kami, besiege his castle and break the lantern that binds the dead to him.',
    newDecisions: ['A rival empire', 'A second minor god', 'A siege'],
    briefing: [
      SHIRO('Kurogane rounds up the wandering dead like stray horses and puts them in his army. He says they are loyal. They are only lost.'),
      AKANE('The Lantern of Oaths in his castle binds them to him. While it burns, every spirit he catches is his.'),
      KUROGANE('Turn back, diviner. The dead need a lord as much as the living do. I am a good one.'),
    ],
    victory: [AKANE('The Lantern of Oaths is out and the dead he bound are walking home. Kurogane has nothing left but the Lantern-Eater’s promises.')],
    town: { townId: 'akashi', name: 'Akashi', description: 'A river town on the road north, loyal to the shrines.' },
    biome: 'temperate',
    soundscape: 'coast',
    gold: { name: 'Gold Mine', description: 'An unowned mine.', guard: { label: 'Mine boars', army: [['tusked_boar', 10]], reward: { resources: { gold: 500 } }, battlefield: 'open_field' } },
    event: {
      name: 'Hot Spring',
      description: 'A hot spring with a little shrine above it.',
      title: 'The Hot Spring',
      text: 'A monkey sits in the spring and watches you over the steam. On the shrine shelf lie a purse of offerings — and a cup, for whoever will drink from the spring instead.',
      options: [
        { label: 'Take the offerings', summary: '+1,500 Gold.', reward: { resources: { gold: 1500 } } },
        { label: 'Drink from the spring', summary: 'Akane gains +1 Defense and +1 Knowledge.', reward: { attributes: { defense: 1, knowledge: 1 } } },
      ],
    },
    north: { name: 'Haniwa Ford', description: 'The northern ford, held by clay figures on Kurogane’s orders.', guard: { label: 'Ford haniwa', army: [['clay_golem', 8]], reward: { resources: { gold: 800 } }, battlefield: 'coast_road' } },
    south: {
      name: 'Ronin Ford',
      description: 'The southern ford, held by Kurogane’s ronin.',
      guard: {
        label: 'Ford ronin',
        army: [
          ['brigand', 24],
          ['brigand_cutthroat', 10],
        ],
        reward: { resources: { gold: 800 } },
        battlefield: 'coast_road',
      },
    },
    stele: { name: 'Lantern of Oaths', description: 'The lantern that binds the wandering dead to Kurogane.', confirm: 'Put out the Lantern of Oaths? This completes The Iron Daimyo.' },
    rival: {
      playerId: 'iron_castle',
      townId: 'iron_castle',
      townName: 'Iron Castle',
      townDescription: 'Kurogane’s castle, roofed in black iron.',
      color: '#5d6470',
      hero: { heroId: 'kurogane', definitionId: 'japanese_kurogane', classId: 'daimyo', name: 'Kurogane' },
      army: [
        ['japanese_nine_tailed_kitsune', 26],
        ['japanese_river_elder_kappa', 10],
        ['japanese_oni', 3],
      ],
      garrison: [
        ['japanese_nine_tailed_kitsune', 24],
        ['japanese_river_elder_kappa', 8],
        ['japanese_oni', 2],
      ],
      reward: { artifactIds: ['band_of_insight'] },
    },
    objectives: { crossing: 'Cross the river', god: 'A second kami', town: 'Take the Iron Castle', stele: 'Put out the Lantern of Oaths', rival: 'Defeat Kurogane (optional)', event: 'The hot spring (optional)' },
    scenes: (ids) => [
      { id: 'm05_crossed', trigger: { type: 'objective_completed', objectiveId: ids.crossing }, lines: [GENZO('We are over. His scouts will be riding back already.'), AKANE('Let them ride. I want him to know who is coming.')] },
      { id: 'm05_kurogane', trigger: { type: 'battle_started', heroDefinitionId: ids.rival }, lines: [KUROGANE('Every spirit you send home is a soldier I lose. Is that fair?'), AKANE('They were never yours to lose.')] },
      { id: 'm05_taken', trigger: { type: 'objective_completed', objectiveId: ids.town }, lines: [AKANE('The Iron Castle is ours. Now the lantern.')] },
    ],
  });

  const m6 = refugeMission(ctx, {
    name: 'The Kirin Meadow',
    summary: 'The kirin, whose coming marks a just age, are penned in their high meadow by the Lantern-Eater’s jailers. Break the jailers, accept the kirin covenant, raise kirin of your own and defeat General Oboro at the meadow gate.',
    newDecisions: ['Claim a covenant from the journal', 'Kirin in the retinue', 'A gate general'],
    briefing: [
      GENZO('The kirin only walk where a just ruler reigns. For a year no one has seen one. The herders say they are penned in the high meadow, like cattle.'),
      AKANE('Free them, and the land remembers what justice looks like. Then the last road opens.'),
      SHIRO('The meadow gate is held by Oboro, the general of the hazy moon. Nobody has seen his face. Nobody has seen him lose.'),
    ],
    victory: [AKANE('The kirin walk again. Tonight I saw the last part of the road from the meadow — the sun stone, the moon stone and the last torii between them.')],
    town: { townId: 'takamori', name: 'Takamori', description: 'A high town on the edge of the kirin meadows.' },
    biome: 'high_pass',
    soundscape: 'high_pass',
    north: {
      name: 'Haniwa Steps',
      description: 'The northern steps to the meadow, held by clay figures.',
      guard: {
        label: 'Step haniwa',
        army: [
          ['clay_golem', 8],
          ['bronze_golem', 2],
        ],
        reward: { resources: { gold: 1000 } },
        battlefield: 'ridge_pass',
      },
    },
    south: {
      name: 'Ronin Stair',
      description: 'The southern stair, held by ronin and their boars.',
      guard: {
        label: 'Stair ronin',
        army: [
          ['brigand_cutthroat', 24],
          ['tusked_boar', 6],
        ],
        reward: { resources: { gold: 1000 } },
        battlefield: 'ridge_pass',
      },
    },
    event: {
      name: 'A Kirin Foal',
      description: 'A kirin foal caught in a herder’s fence.',
      title: 'The Kirin Foal',
      text: 'The foal’s scales are the colour of new bronze. Cut free, it will remember you. Or the herder will trade you its shed horn-tip, which glows a little in the dark — he found it in the fence this morning.',
      options: [
        { label: 'Cut the foal free', summary: '+2 Crystal and +10 Favor.', reward: { resources: { crystal: 2, favor: 10 } } },
        { label: 'Read the horn-tip’s light', summary: 'Akane gains 1,000 experience.', reward: { questXp: 1000 } },
      ],
    },
    refuge: {
      name: 'Kirin Pens',
      description: 'The pens where the kirin are held, under the Lantern-Eater’s jailers.',
      guard: {
        label: 'Pen jailers',
        army: [
          ['japanese_nine_tailed_kitsune', 30],
          ['bronze_golem', 3],
          ['japanese_queen_jorogumo', 2],
        ],
        reward: { resources: { gold: 1500 } },
        battlefield: 'grove',
      },
    },
    nest: { name: 'Ogre Shelter', description: 'Two ogre chieftains in a shelter of stolen saddles.', guard: { label: 'Ogre chieftains', army: [['ogre_chieftain', 2]], reward: { resources: { crystal: 6 } }, battlefield: 'grove' } },
    gate: {
      name: 'Meadow Gate',
      description: 'The gate to the last road, held by General Oboro.',
      guard: {
        label: 'Oboro and the gate guard',
        army: [
          ['japanese_nine_tailed_kitsune', 30],
          ['japanese_river_elder_kappa', 10],
          ['japanese_great_tengu', 4],
          ['japanese_oni_warlord', 3],
        ],
        commander: arcCommander(H['japanese_oboro']!, 'gate6'),
        reward: { resources: { gold: 1500 }, artifactIds: ['lacquered_oyoroi'] },
        battlefield: 'ridge_pass',
      },
    },
    horn: { name: 'Drum of the Just Age', description: 'The great drum the herders beat when the kirin come.', confirm: 'Beat the Drum of the Just Age? This completes The Kirin Meadow.' },
    band: { id: 'japanese_iron_haniwa', name: 'Iron Haniwa', army: [['bronze_golem', 6]] },
    objectives: {
      approach: 'Climb to the meadow',
      refuge: 'Break the pen jailers',
      claim: 'Accept the kirin covenant',
      claimDescription: 'Accept the kirin’s covenant in the journal. It can then be assigned to Takamori.',
      elite: 'Kirin in the retinue',
      gate: 'General Oboro at the gate',
      horn: 'Beat the drum of the just age',
      event: 'The kirin foal (optional)',
    },
    scenes: (ids) => [
      { id: 'm06_freed', trigger: { type: 'site_cleared', siteId: ids.refuge }, lines: [AKANE('The pens are open. The kirin will not follow us for being freed — they follow a covenant, or nothing.'), GENZO('Then offer them one, priestess. They are listening.')] },
      { id: 'm06_oboro', trigger: { type: 'battle_started', siteId: ids.gate }, lines: [YAMIKAGE('Oboro, my general, has never shown his face. Shall I tell you why? There is no face. Only my hunger, wearing armour.')] },
      { id: 'm06_gate', trigger: { type: 'objective_completed', objectiveId: ids.gateObjective }, lines: [SHIRO('The armour is empty. There really was no one inside.'), AKANE('Then there is one less thing to bury.')] },
    ],
  });

  const m7 = finaleMission(ctx, {
    name: 'The Last Torii',
    summary: 'The Lantern-Eater’s palace stands across the last stretch of the spirits’ road, behind the last torii. Cross the hills, light the sun stone and the moon stone, defeat Yamikage and decide what becomes of the road between the worlds.',
    newDecisions: ['Two stones, one gate', 'The Lantern-Eater', 'The last choice'],
    briefing: [
      AKANE('The last torii. Every spirit that ever went home went through it. Yamikage has built his palace across the road beyond it, and eats every light that comes near.'),
      GENZO('The sun stone and the moon stone open the torii, one on each side of the valley. A warden walks between them — Kagerō.'),
      YAMIKAGE('Come and be eaten, little light. You have been delicious so far.'),
    ],
    victory: [AKANE('The road is open. I can see them — thousands of little lights, walking home.')],
    town: { townId: 'hikari', name: 'Hikari', description: 'The last town before the spirits’ road, where the lantern-makers live.' },
    biome: 'storm_plateau',
    soundscape: 'storm_plateau',
    north: {
      name: 'Northern Torii Path',
      description: 'The northern path up into the hills.',
      guard: {
        label: 'Path guard',
        army: [
          ['japanese_nine_tailed_kitsune', 30],
          ['japanese_river_elder_kappa', 6],
        ],
        reward: { resources: { gold: 1000 } },
        battlefield: 'ridge_pass',
      },
    },
    south: {
      name: 'Southern Torii Path',
      description: 'The southern path, where two penned kirin stand guard against their will.',
      guard: {
        label: 'Captive kirin',
        army: [
          ['japanese_kirin', 2],
          ['japanese_nine_tailed_kitsune', 12],
        ],
        reward: { resources: { gold: 1000 } },
        battlefield: 'ridge_pass',
      },
    },
    stones: { north: { name: 'Sun Stone', description: 'The stone of the day.' }, south: { name: 'Moon Stone', description: 'The stone of the night.' }, cost: { gold: 300, stone: 3 } },
    nest: { name: 'Wyvern Crags', description: 'Wyverns roost above the torii path.', guard: { label: 'Crag wyverns', army: [['wyvern_matriarch', 3]], reward: { resources: { crystal: 6 } }, battlefield: 'grove' } },
    gate: { name: 'The Last Torii', description: 'The last gate of the spirits’ road. Both stones must be lit to open it.' },
    cache: { name: 'Lantern-makers’ Offerings', description: 'Offerings left at the torii by generations of lantern-makers.', reward: { resources: { gold: 1500, crystal: 3 } } },
    hall: {
      name: 'Palace of the Lantern-Eater',
      description: 'A palace built across the spirits’ road, dark as an empty lantern.',
      guard: {
        label: 'Yamikage and the dark court',
        army: [
          ['japanese_great_tengu', 2],
          ['japanese_nine_tailed_kitsune', 20],
          ['japanese_nine_tailed_kitsune', 20],
          ['japanese_river_elder_kappa', 12],
          ['japanese_celestial_kirin', 2],
          ['japanese_queen_jorogumo', 2],
        ],
        commander: arcCommander(H['japanese_yamikage']!, 'boss7', ['kitsune_fire']),
        reward: { resources: { gold: 2000 } },
        battlefield: 'beacon_clearing',
      },
    },
    choice: {
      name: 'The Road Between Worlds',
      description: 'The spirits’ road, where it passes the fallen palace.',
      title: 'The Road Between Worlds',
      text: 'With Yamikage gone, the road is yours to set. Lit with lanterns again, it will be what it always was: one night a year for the dead to come home and go back. Left open, with no lanterns at all, the spirits will choose their own times and ways — a stranger world, and a less lonely one.',
      a: { flag: 'lanterns_lit', label: 'Light the lanterns', summary: 'The road is lit the old way, one night a year. Akane gains 500 experience.' },
      b: { flag: 'road_open', label: 'Leave the road open', summary: 'The spirits choose their own ways. Akane gains 500 experience.' },
    },
    seal: { name: 'First Lantern', description: 'The first lantern of the road, where every festival begins.', confirm: 'Light the first lantern of the road? This completes The Lantern Road.' },
    patrol: {
      commander: arcCommander(H['japanese_kagero']!, 'patrol7'),
      army: [
        ['japanese_nine_tailed_kitsune', 24],
        ['japanese_river_elder_kappa', 8],
        ['japanese_great_tengu', 2],
      ],
    },
    objectives: { approach: 'Into the hills', north: 'Light the sun stone', south: 'Light the moon stone', gate: 'Open the last torii', boss: 'The Lantern-Eater', choice: 'The road between worlds', seal: 'Light the first lantern' },
    scenes: (ids) => [
      { id: 'm07_gate', trigger: { type: 'objective_completed', objectiveId: ids.gate }, lines: [GENZO('The torii is open. My grandfather carved lanterns for sixty years and never saw it with his own eyes.')] },
      { id: 'm07_yamikage', trigger: { type: 'battle_started', siteId: ids.hall }, lines: [YAMIKAGE('Every light ends, diviner. I only end them sooner.'), AKANE('And every dark ends at morning. I am here to make it sooner.')] },
      { id: 'm07_fallen', trigger: { type: 'objective_completed', objectiveId: ids.boss }, lines: [AKANE('He is gone. The road is still here. Now — how should it be lit?')] },
    ],
  });

  const built = [m1, m2, m3, m4, m5, m6, m7];
  const missions = built.map((b) => b.mission);
  return {
    templates: built.map((b) => b.template),
    missions,
    entitlements: arcEntitlements(ctx, { t3: 'Tengu Covenant', t6: 'Kirin Covenant' }, { t3: 'The tengu abbot’s covenant allows a Tengu monastery to be built in one town.', t6: 'The freed kirin allow a Kirin meadow to be kept in one town.' }),
    campaign: arcCampaign(
      ctx,
      {
        name: 'The Lantern Road',
        tagline: 'Light. Climb. Bring them home.',
        summary: 'The lanterns that guide the dead home have gone dark. Lead the shrine diviner Akane through seven linked missions — from the unlit festival of Kagaribi to the last torii — to relight the spirits’ road and face the Lantern-Eater.',
        startingGodNote: 'Amaterasu is the fixed patron of this campaign. Hachiman or Susanoo comes in Mission 3; a second kami (Inari, Fujin or Raijin) in Mission 5.',
        epilogue: [
          SHIRO('Every lantern in Kagaribi lit by itself last night. The children ran from one to the next, counting.'),
          GENZO('A boar lord, a bell, a sea of fog, an iron castle and a herd of kirin. I will need a bigger lantern to paint it all on.'),
        ],
        endings: [
          { flag: 'lanterns_lit', lines: [AKANE('One night a year, as it always was. The dead come home, and then they go back. It is enough.'), SHIRO('It was always enough, priestess. We only forgot.')] },
          { flag: 'road_open', lines: [AKANE('No lanterns now. The spirits come and go when they choose — grandmothers at the breakfast table, foxes that talk at noon.'), GENZO('A stranger world. I think I like it.')] },
        ],
      },
      missions,
    ),
  };
}
