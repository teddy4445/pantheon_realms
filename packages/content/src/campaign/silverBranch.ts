/**
 * The Silver Branch — the Celtic campaign (seven missions), built on the
 * Winter Oath arc (arc.ts). Owner request 2026-10-02.
 *
 * Original fiction in a Celtic-inspired setting: the silver bough that opens
 * the mounds of the Otherworld has been broken, the year has stuck at the dark
 * half, and a druid of the hazel grove goes to mend it. Not a retelling of any
 * tale. Every number is proposed and unplaytested.
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

const P = 'celtic';
const ORLA = speaker(P, 'Orla');
const CATHAL = speaker(P, 'Cathal');
const SADB = speaker(P, 'Sadb');
const DUBHGHALL = speaker(P, 'Dubhghall');
const FIACHRA = speaker(P, 'Fiachra');

export const SILVER_BRANCH_HEROES: readonly HeroDefinition[] = [
  arcHero(P, 'celtic_orla', 'Orla', 'Druid of the Hazel Grove', 'druid', 'A druid of the hazel grove who keeps the calendar of fires. The hero of The Silver Branch.', 'campaign'),
  arcHero(P, 'celtic_dubhghall', 'Dubhghall', 'The Withered King', 'chieftain', 'A king who swore himself to the dark half of the year and broke the silver branch so it would never end. Final opponent of The Silver Branch.', 'enemy'),
  arcHero(P, 'celtic_fiachra', 'Fiachra', 'The Usurper of the Ford', 'chieftain', 'A chieftain who took the high seat in the long winter and keeps it with the Withered King’s help. Rival empire in The Silver Branch, mission 5.', 'enemy'),
  arcHero(P, 'celtic_corc', 'Corc', 'Raider of the Grey Sea', 'fian', 'A sea-raider who came with the mist and stayed for the plunder. Patrol in The Silver Branch, mission 4.', 'enemy'),
  arcHero(P, 'celtic_tadhg', 'Tadhg the Grey', 'Champion of the Withered King', 'fian', 'The Withered King’s champion, who holds the stags’ wood. The Silver Branch, mission 6.', 'enemy'),
  arcHero(P, 'celtic_ciar', 'Ciar', 'Warden of the Mound', 'fian', 'Keeper of the road between the summer stone and the winter stone. Patrol in The Silver Branch, mission 7.', 'enemy'),
];
const H = Object.fromEntries(SILVER_BRANCH_HEROES.map((h) => [h.id, h]));

export function buildSilverBranch(names: ArcCampaignContext['names'], familyOf: ArcCampaignContext['familyOf']): {
  templates: MapTemplateDefinition[];
  missions: MissionDefinition[];
  campaign: CampaignDefinition;
  entitlements: EntitlementDefinition[];
} {
  const ctx: ArcCampaignContext = {
    id: 'silver_branch',
    pantheonId: P,
    archetypeId: 'celtic_hillfort',
    hero: { heroId: 'orla', definitionId: 'celtic_orla', classId: 'druid', name: 'Orla' },
    gods: { patron: 'celtic_dagda', first: ['celtic_morrigan', 'celtic_brigid'], second: ['celtic_cernunnos', 'celtic_epona', 'celtic_lugh'] },
    t: [
      { base: '', up: '' },
      { base: 'celtic_pooka', up: 'celtic_elder_pooka' },
      { base: 'celtic_cu_sith', up: 'celtic_great_cu_sith' },
      { base: 'celtic_kelpie', up: 'celtic_dread_kelpie' },
      { base: 'celtic_banshee', up: 'celtic_battle_banshee' },
      { base: 'celtic_selkie', up: 'celtic_storm_selkie' },
      { base: 'celtic_horned_stag_spirit', up: 'celtic_great_stag_spirit' },
      { base: 'celtic_fomorian_giant', up: 'celtic_ancient_fomorian' },
    ],
    covenantT3: 'celtic_kelpie',
    covenantT6: 'celtic_horned_stag_spirit',
    covenantT7: 'celtic_fomorian_giant',
    hostName: 'The Withered King’s Host',
    hiringReason: 'Orla rides with her own war-band. Hero hiring is disabled in The Silver Branch.',
    debriefPolicy: [
      'Orla keeps her level, experience (up to the displayed cap), skills, spellbook, spells and equipment.',
      'The Dagda and every god she has committed to carry into the next mission.',
      'Troops, resources, forts, mines and recruitment pools stay behind to hold the land.',
      'The next mission begins with its declared war-band and treasury.',
    ],
    seed: 430000,
    names,
    familyOf,
  };

  const m1 = restoreMission(ctx, {
    name: 'The Cold Hearth',
    summary: 'Beltane came and no fire would catch. Raise a war-band of pooka in Dún Caill, clear the ford of the alders and light the Beltane fire on the old stone.',
    newDecisions: ['Recruit and train', 'Shapeshifting', 'Learn spells at the Mage Guild', 'A one-time choice'],
    briefing: [
      SADB('Beltane, and the cattle still in the byres. We built the fire twice and it would not take. The kindling was dry as bone.'),
      ORLA('Then the fire is not refusing the kindling. Something is refusing the summer. The Beltane stone on the ridge is where the year turns — I need to see it.'),
      CATHAL('Reavers have been seen on the ridge. And the boars have taken the alder ford. Bring the pooka — they are quicker than men.'),
    ],
    victory: [ORLA('The fire caught. The cattle went out between the flames this morning. But only here — over the hills the dark half holds.')],
    town: { townId: 'dun_caill', name: 'Dún Caill', description: 'Orla’s hillfort by the hazel grove.' },
    biome: 'moor',
    soundscape: 'glen',
    barrier: 'water',
    event: {
      name: 'The Hawthorn Well',
      description: 'A holy well under a lone hawthorn, its rags faded.',
      title: 'The Hawthorn Well',
      text: 'The well is choked with offerings — coins, pins, a silver brooch — left by people who wanted the summer back. In the hawthorn above it four hares watch you without blinking, the way no hare should.',
      options: [
        { label: 'Take the offerings', summary: '+600 Gold and +4 Wood.', reward: { resources: { gold: 600, wood: 4 } } },
        { label: 'Speak to the hares', summary: '4 Pooka join Orla’s war-band.', reward: { creatures: [{ creatureId: 'celtic_pooka', count: 4 }] } },
      ],
    },
    camp: { name: 'Cú Sith Den', description: 'Great green hounds of the hills that will run with a druid.', creatureId: 'celtic_cu_sith' },
    crossing: {
      name: 'Ford of the Alders',
      description: 'The ford to the ridge road. Boars, wild with the cold, wallow in it.',
      guard: { label: 'Ford boars', army: [['wild_boar', 8]], reward: { resources: { gold: 300, wood: 3, stone: 3 } }, battlefield: 'coast_road' },
    },
    cache: { name: 'Herders’ Booley', description: 'A summer hut the herders never reached this year.', reward: { resources: { gold: 400, crystal: 1 } } },
    monument: {
      name: 'Beltane Stone',
      description: 'The stone on the ridge where the year turns. Reavers camp around it.',
      guard: {
        label: 'Ridge reavers',
        army: [
          ['brigand', 14],
          ['brigand_cutthroat', 4],
        ],
        reward: { resources: { gold: 500 }, artifactIds: ['mistletoe_crown'] },
        battlefield: 'beacon_clearing',
      },
      confirm: 'Light the Beltane fire on the stone? This completes The Cold Hearth.',
    },
    objectives: { recruit: 'Gather the pooka', train: 'Teach the old shapes', crossing: 'Clear the alder ford', guard: 'Drive off the reavers', activate: 'Light the Beltane fire', event: 'The hawthorn well (optional)' },
    scenes: (ids) => [
      { id: 'm01_ford', trigger: { type: 'site_cleared', siteId: ids.crossing }, lines: [CATHAL('Someone threw grain into that ford every night. You do not keep boars by accident.'), ORLA('Then someone wanted the ridge kept quiet. The stone, then.')] },
      { id: 'm01_stone_battle', trigger: { type: 'battle_started', siteId: ids.monument }, lines: [DUBHGHALL('Little druid. The summer is over. I have seen to it. Go home and sleep until spring — there will not be one.'), ORLA('I have never been good at sleeping.')] },
      { id: 'm01_crown', trigger: { type: 'site_cleared', siteId: ids.monument }, lines: [SADB('Their chief wore this — a mistletoe crown from the grove at Dún Bera.'), ORLA('A grove-crown on a reaver. Whoever pays them has walked in the groves.')] },
      { id: 'm01_losses', trigger: { type: 'casualties', minLost: 4 }, lines: [SADB('We buried some of ours under the alders today, Orla.'), ORLA('I know. We will not leave more there than we have to.')] },
    ],
    help: [{ id: 'shapeshift', title: 'Shapeshifting', text: 'The Celtic signature: creatures with Shapeshift change aspect at the start of their activation for free.' }],
  });

  const m2 = huntMission(ctx, {
    name: 'The Iron-Bristled Boar',
    summary: 'A boar with bristles like iron nails leads a herd through the fields of Dún Bera and keeps the folk from the ogham stone at the ford. Raise hounds of your own, cross the river, hunt the boar and cut the summer ogham again.',
    newDecisions: ['Hunt a wandering herd', 'Use a lookout', 'Buy or bargain on the road'],
    briefing: [
      CATHAL('Dún Bera’s fields are ploughed up — not by ploughs. A boar the size of a bull, bristles like nails, and a herd behind it.'),
      ORLA('The ogham stone at the ford still holds the summer’s name. Someone wants it unreadable.'),
      SADB('Hounds, then. Build the den, Orla. The cú sith have hunted bigger pigs than this one.'),
    ],
    victory: [SADB('Two fires lit. The bards say the next is at the loch of the water-horses, and the water-horses have stopped coming to the shore.')],
    town: { townId: 'dun_bera', name: 'Dún Bera', description: 'A farming fort on the river.' },
    biome: 'moor',
    soundscape: 'glen',
    barrier: 'water',
    lookout: { name: 'Hill of the Watchers', description: 'From the top, the land beyond the river lies open.' },
    event: {
      name: 'A Feather-cloak Weaver',
      description: 'An old woman weaving a cloak of raven feathers.',
      title: 'The Feather-cloak Weaver',
      text: '“The ravens bring me their feathers,” the old woman says, “because I tell them the news.” She holds up a finished cloak, black and shining. “It makes the road shorter. Or sit with me, and I will tell you what the ravens told me about that boar.”',
      options: [
        { label: 'Buy the raven cloak', summary: 'Pay 2,000 Gold for the Raven-feather Cloak.', cost: { gold: 2000 }, reward: { artifactIds: ['raven_feather_cloak'] } },
        { label: 'Sit and listen', summary: 'Orla gains +1 Knowledge.', reward: { attributes: { knowledge: 1 } } },
      ],
    },
    camp: { name: 'Hound Hollow', description: 'Cú sith that have not fled the boar.', creatureId: 'celtic_cu_sith' },
    bridge: {
      name: 'Stepping Stones',
      description: 'The stepping stones over the river, held by reavers.',
      guard: {
        label: 'Ford reavers',
        army: [
          ['brigand', 16],
          ['brigand_cutthroat', 6],
        ],
        reward: { resources: { gold: 600, favor: 3 } },
        battlefield: 'coast_road',
      },
    },
    lair: {
      name: 'Boar’s Bed',
      description: 'A hollow under an oak, where a shield lies half-buried.',
      guard: {
        label: 'Bed boars',
        army: [
          ['tusked_boar', 4],
          ['wild_boar', 6],
        ],
        reward: { resources: { gold: 500 }, artifactIds: ['fianna_targe'] },
        battlefield: 'grove',
      },
    },
    stone: { name: 'Ogham Stone of the Ford', description: 'The standing stone that carries the summer’s name in ogham.', confirm: 'Cut the summer ogham again? This completes The Iron-Bristled Boar.' },
    prey: {
      id: 'celtic_iron_boar',
      name: 'The Iron-Bristled Boar',
      portraitAssetId: 'creature.neutral.wild_boar.upgraded.portrait',
      army: [
        ['tusked_boar', 6],
        ['wild_boar', 12],
      ],
      bounty: { gold: 800 },
    },
    objectives: {
      recruit: 'Hounds of our own',
      lookout: 'Climb the watchers’ hill',
      bridge: 'Take the stepping stones',
      prey: 'Hunt the iron-bristled boar',
      preyHint: 'The herd roams the fields beyond the river and only charges a war-band it is sure it can beat. Move onto it to fight.',
      activate: 'Cut the summer ogham',
      lair: 'The boar’s bed (optional)',
      event: 'The feather-cloak weaver (optional)',
    },
    scenes: (ids) => [
      { id: 'm02_hill', trigger: { type: 'site_visited', siteId: ids.lookout }, lines: [ORLA('There — the fields are ploughed in a ring around the ogham stone. They are guarding it.'), CATHAL('Then it still matters to them. Good.')] },
      { id: 'm02_boar_battle', trigger: { type: 'battle_started', heroDefinitionId: ids.prey }, lines: [DUBHGHALL('Gore her, iron-back. Plough her under with the summer.')] },
      { id: 'm02_boar_broken', trigger: { type: 'objective_completed', objectiveId: ids.preyObjective }, lines: [SADB('The boar is down. The herd is running for the woods.'), ORLA('Let them run. A boar without a master is only a boar.')] },
    ],
  });

  const m3 = covenantMission(ctx, {
    name: 'The Water-Horse Bargain',
    summary: 'The kelpies of Loch Eala have stopped coming to shore. Break the reavers on the hill road, free the banshees’ hill from the cairn-men, win the kelpie covenant — by the keeper’s bargain or by force — and take a god for the dark road ahead.',
    newDecisions: ['A covenant: pay or fight', 'Your first minor god', 'Elite troops in the army'],
    briefing: [
      CATHAL('The water-horses of Loch Eala carry anyone who keeps the old covenant with them. Nobody has seen one since Samhain.'),
      ORLA('A covenant can be broken, bought or stolen. If they have stopped coming, someone holds it who should not.'),
      SADB('And the banshees on Keening Hill have gone silent. A silent banshee is worse than a wailing one.'),
    ],
    victory: [ORLA('The covenant holds, a god rides with us and the hill fire is lit. The road goes west from here — to the sea.')],
    town: { townId: 'rath_eala', name: 'Ráth Eala', description: 'A ringfort above the loch.' },
    biome: 'high_pass',
    soundscape: 'glen',
    cache: { name: 'Bards’ Hoard', description: 'A bard’s chest hidden in a rock cleft.', reward: { resources: { gold: 700, wood: 5 }, artifactIds: ['ogham_staves'] } },
    pass: {
      name: 'Hill Road',
      description: 'The only road over the hill, held by reavers.',
      guard: {
        label: 'Hill reavers',
        army: [
          ['brigand', 16],
          ['brigand_cutthroat', 6],
        ],
        reward: { resources: { gold: 750, favor: 5 } },
        battlefield: 'ridge_pass',
      },
    },
    roost: {
      name: 'Keening Hill',
      description: 'The banshees’ hill. Cairn-men — stones that walk — stand around it like jailers.',
      guard: { label: 'Cairn-men', army: [['clay_golem', 5]], reward: { resources: { favor: 5 }, artifactIds: ['torc_of_the_high_king'] }, battlefield: 'ridge_pass' },
    },
    hearth: {
      name: 'The Keeper of the Loch',
      description: 'An old woman sits on the shore, combing a horse’s mane that is not there.',
      title: 'The Keeper of the Loch',
      text: '“The covenant was sold,” the keeper says, combing. “By my own son, to a grey king for a ring. Buy it back from me at the price he got, and the horses will come to your hand. Or go down to the Kelpies’ Shore and take it from them — they will enjoy the struggle.”',
      price: { gold: 1500, wood: 10 },
      payLabel: 'Pay the keeper’s price',
      refuseLabel: 'Refuse — take it at the shore',
    },
    home: {
      name: 'Kelpies’ Shore',
      description: 'The shore where the water-horses come out of the loch.',
      guard: {
        label: 'Kelpies of the loch',
        army: [
          ['celtic_kelpie', 4],
          ['celtic_dread_kelpie', 1],
        ],
        reward: { resources: { gold: 1000 } },
        battlefield: 'grove',
      },
    },
    bridge: {
      name: 'Causeway of Stones',
      description: 'A causeway over the bog, held by reavers and their boars.',
      guard: {
        label: 'Causeway reavers',
        army: [
          ['brigand_cutthroat', 12],
          ['tusked_boar', 4],
        ],
        reward: { resources: { gold: 800 } },
        battlefield: 'ridge_pass',
      },
    },
    stone: { name: 'Hill Fire', description: 'The beacon where the year’s fires are passed from hill to hill.', confirm: 'Light the hill fire? This completes The Water-Horse Bargain.' },
    band: { id: 'celtic_bog_boars', name: 'Bog Boars', army: [['wild_boar', 6]] },
    objectives: {
      pass: 'Take the hill road',
      roost: 'Free Keening Hill',
      covenant: 'The kelpie covenant',
      covenantDescription: 'Win the kelpie covenant: pay the keeper’s price on the shore of the loch, or beat the kelpies at their shore.',
      god: 'A god for the dark road',
      elite: 'Battle banshees in the war-band',
      activate: 'Light the hill fire',
      cache: 'The bards’ hoard (optional)',
    },
    scenes: (ids) => [
      { id: 'm03_hill', trigger: { type: 'site_cleared', siteId: ids.roost }, lines: [SADB('The banshees are keening again. I never thought I would be glad of that sound.'), ORLA('They are keening for the year. Let them.')] },
      { id: 'm03_shore', trigger: { type: 'site_cleared', siteId: ids.home }, lines: [CATHAL('The ring the keeper’s son got — it is here, on the shore. Grey iron, cold as a grave.'), ORLA('The Withered King pays in grave-iron. I will remember.')] },
      { id: 'm03_god', trigger: { type: 'objective_completed', objectiveId: ids.god }, lines: [ORLA('A god rides with us now. Whatever holds the dark half of the year, it will not meet us alone.')] },
    ],
  });

  const m4 = seekMission(ctx, {
    name: 'The Hall Beneath the Waves',
    summary: 'The hall of the sea-folk lies beyond the islands, behind a mist that came with the raiders. Raise selkies of your own, take the landing, light both headland fires to burn away the mist and ask the sea-folk where the Withered King keeps the broken branch.',
    newDecisions: ['Light two fires to open a way', 'A commanded patrol', 'Selkies'],
    briefing: [
      ORLA('The sea-folk see everything that goes into the sea. If the silver branch was thrown into the water, they know where it went.'),
      CATHAL('A mist came in with the grey raiders and it has not lifted since. Their captain, Corc, walks the islands.'),
      SADB('The old headland fires burn through any mist. Light both and the sea has to clear.'),
    ],
    victory: [ORLA('The sea-folk saw it: the branch, broken, carried into a mound in the east by the Withered King himself. And a usurper on the high seat at the ford keeps the road to it.')],
    town: { townId: 'inis_ron', name: 'Inis Rón', description: 'A seal-island fort at the edge of the western sea.' },
    biome: 'coast',
    soundscape: 'glen',
    wanderer: {
      name: 'A Bard by the Shore',
      description: 'A bard sitting on an upturned boat, tuning a harp.',
      title: 'The Bard',
      text: '“You are going to the sea-hall,” the bard says, not looking up from the harp. “Ask your question as a verse — the sea-folk answer verses.” He tosses you a small ring of white stone. “A fairy ring. Or sit, and I will teach you the verse.”',
      options: [
        { label: 'Take the fairy ring', summary: 'The Fairy-ring Band joins Orla’s backpack.', reward: { artifactIds: ['fairy_ring_band'] } },
        { label: 'Learn the verse', summary: 'Orla gains +1 Spell Power and +1 Knowledge.', reward: { attributes: { power: 1, knowledge: 1 } } },
      ],
    },
    wreck: { name: 'Wrecked Currach', description: 'A leather boat thrown up by the storm; its cargo is dry.', reward: { resources: { gold: 900, wood: 4 } } },
    landing: {
      name: 'Island Landing',
      description: 'The landing on the near island, held by grey raiders.',
      guard: {
        label: 'Grey raiders',
        army: [
          ['brigand', 36],
          ['brigand_cutthroat', 14],
        ],
        reward: { resources: { gold: 800, favor: 3 } },
        battlefield: 'coast_road',
      },
    },
    omen: {
      name: 'The Raiders’ Longboat',
      description: 'A raider boat beached and empty.',
      title: 'The Raiders’ Longboat',
      text: 'The longboat is full of plunder from every coast — and a pen of great green hounds the raiders stole and never dared to let out.',
      options: [
        { label: 'Take the plunder', summary: '+800 Gold and +2 Crystal.', reward: { resources: { gold: 800, crystal: 2 } } },
        { label: 'Let the hounds out', summary: '6 Great Cú Sith join Orla’s war-band.', reward: { creatures: [{ creatureId: 'celtic_great_cu_sith', count: 6 }] } },
      ],
    },
    relays: { north: { name: 'North Headland Fire', description: 'An old fire-pit on the northern headland.' }, south: { name: 'South Headland Fire', description: 'An old fire-pit on the southern headland.' }, cost: { gold: 250, stone: 3 } },
    nest: { name: 'Ogres’ Sea-cave', description: 'Two ogres living on wreck-pickings.', guard: { label: 'Sea-cave ogres', army: [['ogre', 2]], reward: { resources: { crystal: 5 } }, battlefield: 'grove' } },
    gate: { name: 'The Grey Mist', description: 'A wall of mist over the western sea. Both headland fires must burn to clear it.' },
    goal: {
      name: 'Hall Beneath the Waves',
      description: 'The sea-folk’s hall, its doors kept by selkies who no longer remember their own skins.',
      guard: {
        label: 'Hall selkies',
        army: [
          ['celtic_selkie', 4],
          ['celtic_storm_selkie', 2],
        ],
        reward: { resources: { gold: 1000 } },
        battlefield: 'coast_road',
      },
      reward: { questXp: 2200, artifactIds: ['cauldron_of_plenty'] },
      confirm: 'Ask the sea-folk in verse? This completes The Hall Beneath the Waves.',
    },
    patrol: {
      commander: arcCommander(H['celtic_corc']!, 'patrol4'),
      army: [
        ['celtic_elder_pooka', 16],
        ['celtic_great_cu_sith', 6],
      ],
    },
    objectives: { recruit: 'Selkies of our own', landing: 'Take the island landing', north: 'The north headland fire', south: 'The south headland fire', gate: 'Burn away the mist', goal: 'Ask the sea-folk', nest: 'The ogres’ sea-cave (optional)', wanderer: 'The bard by the shore (optional)' },
    scenes: (ids) => [
      { id: 'm04_landing', trigger: { type: 'site_cleared', siteId: ids.landing }, lines: [CATHAL('Grey raiders, grey sails, grey mist. Even their blood looks grey.'), ORLA('Then Corc is close. Keep the war-band together.')] },
      { id: 'm04_mist', trigger: { type: 'objective_completed', objectiveId: ids.gate }, lines: [SADB('The mist is lifting off the water like breath off a cow.')] },
      { id: 'm04_hall', trigger: { type: 'battle_started', siteId: ids.goal }, lines: [DUBHGHALL('Ask the sea, druid. The sea keeps what it is given — and so do I.')] },
    ],
  });

  const m5 = rivalMission(ctx, {
    name: 'The High Seat',
    summary: 'Fiachra took the high seat at the ford in the long winter and holds it with the Withered King’s help. Cross the river, take a second god, besiege his fort and overturn the inauguration stone that names him king.',
    newDecisions: ['A rival empire', 'A second minor god', 'A siege'],
    briefing: [
      SADB('Fiachra was a cattle-lord on the eastern ford. When the summer failed he sat on the high seat and said the winter was his to keep.'),
      ORLA('His inauguration stone names him king. While it stands, the land answers to him — and he answers to the Withered King.'),
      FIACHRA('Go back to your groves, druid. A winter king is still a king, and I keep my people fed.'),
    ],
    victory: [ORLA('The stone is overturned and the land is free of his kingship. The road east to the mound is open.')],
    town: { townId: 'dun_ard', name: 'Dún Ard', description: 'A hillfort on the river road, loyal to the old fires.' },
    biome: 'temperate',
    soundscape: 'glen',
    gold: { name: 'Gold Mine', description: 'An unowned mine.', guard: { label: 'Mine boars', army: [['tusked_boar', 10]], reward: { resources: { gold: 500 } }, battlefield: 'open_field' } },
    event: {
      name: 'The Salmon Pool',
      description: 'A pool under hazel trees, where a salmon rises.',
      title: 'The Salmon Pool',
      text: 'Hazelnuts fall into the pool and a speckled salmon rises to eat them. On the bank lies a purse someone left in thanks — or you could sit and watch the salmon, which is said to be the wisest thing in the river.',
      options: [
        { label: 'Take the purse', summary: '+1,500 Gold.', reward: { resources: { gold: 1500 } } },
        { label: 'Watch the salmon', summary: 'Orla gains +1 Defense and +1 Knowledge.', reward: { attributes: { defense: 1, knowledge: 1 } } },
      ],
    },
    north: { name: 'Cairn Ford', description: 'The northern ford, held by cairn-men on Fiachra’s orders.', guard: { label: 'Ford cairn-men', army: [['clay_golem', 8]], reward: { resources: { gold: 800 } }, battlefield: 'coast_road' } },
    south: {
      name: 'Reaver Ford',
      description: 'The southern ford, held by Fiachra’s reavers.',
      guard: {
        label: 'Ford reavers',
        army: [
          ['brigand', 24],
          ['brigand_cutthroat', 10],
        ],
        reward: { resources: { gold: 800 } },
        battlefield: 'coast_road',
      },
    },
    stele: { name: 'Inauguration Stone', description: 'The stone that names Fiachra king.', confirm: 'Overturn the Inauguration Stone? This completes The High Seat.' },
    rival: {
      playerId: 'dun_fiachra',
      townId: 'dun_fiachra',
      townName: 'Dún Fiachra',
      townDescription: 'Fiachra’s fort on the eastern ford.',
      color: '#7a8f3a',
      hero: { heroId: 'fiachra', definitionId: 'celtic_fiachra', classId: 'chieftain', name: 'Fiachra' },
      army: [
        ['celtic_elder_pooka', 26],
        ['celtic_great_cu_sith', 10],
        ['celtic_banshee', 3],
      ],
      garrison: [
        ['celtic_elder_pooka', 24],
        ['celtic_great_cu_sith', 8],
        ['celtic_banshee', 2],
      ],
      reward: { artifactIds: ['stone_of_fal'] },
    },
    objectives: { crossing: 'Cross the river', god: 'A second god', town: 'Take Dún Fiachra', stele: 'Overturn the stone', rival: 'Defeat Fiachra (optional)', event: 'The salmon pool (optional)' },
    scenes: (ids) => [
      { id: 'm05_crossed', trigger: { type: 'objective_completed', objectiveId: ids.crossing }, lines: [CATHAL('We are over. His cattle-scouts will be running home.'), ORLA('Let them run. I want him to hear it from his own people.')] },
      { id: 'm05_fiachra', trigger: { type: 'battle_started', heroDefinitionId: ids.rival }, lines: [FIACHRA('My people eat this winter. Will they eat in your summer?'), ORLA('They ate in every summer before you.')] },
      { id: 'm05_taken', trigger: { type: 'objective_completed', objectiveId: ids.town }, lines: [ORLA('Dún Fiachra is ours. And look — the stone of the kings was in his treasury. Now the inauguration stone.')] },
    ],
  });

  const m6 = refugeMission(ctx, {
    name: 'The Stags’ Wood',
    summary: 'The great horned stags of the deep wood are bound in iron by the Withered King’s jailers. Break the jailers, accept the stags’ covenant, raise stag spirits of your own and defeat Tadhg the Grey at the wood’s gate.',
    newDecisions: ['Claim a covenant from the journal', 'Stag spirits in the war-band', 'A gate champion'],
    briefing: [
      CATHAL('The horned stags lead the year from the dark half to the bright. No one has heard them bell since Samhain.'),
      ORLA('The Withered King has bound them in grave-iron in their own wood. Free them, and the year can turn.'),
      SADB('His champion holds the wood’s gate. Tadhg the Grey. He was a hero once.'),
    ],
    victory: [ORLA('The stags are belling. Tonight, from the edge of the wood, I saw the mound in the east — and the summer stone and the winter stone on either side of the road to it.')],
    town: { townId: 'coill_dubh', name: 'Coill Dubh', description: 'A fort on the edge of the deep wood.' },
    biome: 'moor',
    soundscape: 'glen',
    north: {
      name: 'Cairn Steps',
      description: 'The northern way into the wood, held by cairn-men.',
      guard: {
        label: 'Step cairn-men',
        army: [
          ['clay_golem', 8],
          ['bronze_golem', 2],
        ],
        reward: { resources: { gold: 1000 } },
        battlefield: 'ridge_pass',
      },
    },
    south: {
      name: 'Reaver Path',
      description: 'The southern path, held by reavers and their boars.',
      guard: {
        label: 'Path reavers',
        army: [
          ['brigand_cutthroat', 24],
          ['tusked_boar', 6],
        ],
        reward: { resources: { gold: 1000 } },
        battlefield: 'ridge_pass',
      },
    },
    event: {
      name: 'A Fawn in Iron',
      description: 'A white fawn with a grave-iron band on one leg.',
      title: 'The White Fawn',
      text: 'The band is grave-iron, cold enough to burn. Cut it, and the fawn will run to its mother. Or melt it in a druid fire and read the king’s secrets in the smoke.',
      options: [
        { label: 'Cut the band', summary: '+2 Crystal and +10 Favor.', reward: { resources: { crystal: 2, favor: 10 } } },
        { label: 'Read the smoke', summary: 'Orla gains 1,000 experience.', reward: { questXp: 1000 } },
      ],
    },
    refuge: {
      name: 'The Iron Grove',
      description: 'Where the stags are bound, under the Withered King’s jailers.',
      guard: {
        label: 'Grove jailers',
        army: [
          ['celtic_elder_pooka', 30],
          ['bronze_golem', 3],
          ['celtic_storm_selkie', 2],
        ],
        reward: { resources: { gold: 1500 } },
        battlefield: 'grove',
      },
    },
    nest: { name: 'Ogre Holt', description: 'Two ogre chieftains in a holt of stolen cattle.', guard: { label: 'Ogre chieftains', army: [['ogre_chieftain', 2]], reward: { resources: { crystal: 6 } }, battlefield: 'grove' } },
    gate: {
      name: 'Wood Gate',
      description: 'The gate out of the deep wood, held by Tadhg the Grey.',
      guard: {
        label: 'Tadhg and the gate guard',
        army: [
          ['celtic_elder_pooka', 30],
          ['celtic_great_cu_sith', 10],
          ['celtic_dread_kelpie', 4],
          ['celtic_battle_banshee', 3],
        ],
        commander: arcCommander(H['celtic_tadhg']!, 'gate6'),
        reward: { resources: { gold: 1500 }, artifactIds: ['spear_of_lugh'] },
        battlefield: 'ridge_pass',
      },
    },
    horn: { name: 'Belling Stone', description: 'The stone where the stags bell the turning of the year.', confirm: 'Sound the belling stone? This completes The Stags’ Wood.' },
    band: { id: 'celtic_bronze_cairns', name: 'Bronze Cairn-men', army: [['bronze_golem', 6]] },
    objectives: {
      approach: 'Into the deep wood',
      refuge: 'Break the grove jailers',
      claim: 'Accept the stags’ covenant',
      claimDescription: 'Accept the stags’ covenant in the journal. It can then be assigned to Coill Dubh.',
      elite: 'Stag spirits in the war-band',
      gate: 'Tadhg the Grey at the gate',
      horn: 'Sound the belling stone',
      event: 'The white fawn (optional)',
    },
    scenes: (ids) => [
      { id: 'm06_freed', trigger: { type: 'site_cleared', siteId: ids.refuge }, lines: [ORLA('The iron is off. They will not follow us for that — stags follow covenants, not favours.'), CATHAL('Then make them one, Orla. They are waiting.')] },
      { id: 'm06_tadhg', trigger: { type: 'battle_started', siteId: ids.gate }, lines: [DUBHGHALL('Tadhg was the greatest of the fian once. Now he is mine. So is everything that grows old enough.')] },
      { id: 'm06_gate', trigger: { type: 'objective_completed', objectiveId: ids.gateObjective }, lines: [SADB('Tadhg is down. He thanked me, Orla, at the end.'), ORLA('Then he is free too.')] },
    ],
  });

  const m7 = finaleMission(ctx, {
    name: 'The Door of the Mound',
    summary: 'The Withered King holds the broken silver branch in his hall inside the great mound. Cross the barrow-hills, use the summer stone and the winter stone to open the door, defeat Dubhghall and decide what becomes of the silver branch.',
    newDecisions: ['Two stones, one door', 'The Withered King', 'The last choice'],
    briefing: [
      ORLA('The great mound. Every door to the Otherworld opened from here once — at Samhain and at Beltane. The Withered King has made it his hall, and he keeps the broken branch inside.'),
      CATHAL('The summer stone and the winter stone open the door, one on each side of the barrow-road. Ciar the warden walks between them.'),
      DUBHGHALL('Come in, druid. The dark half is long, and I have room for you in it.'),
    ],
    victory: [ORLA('The year has turned. I felt it — like a door swinging open in a warm wind.')],
    town: { townId: 'dun_brugh', name: 'Dún Brugh', description: 'The last fort before the barrow-hills.' },
    biome: 'storm_plateau',
    soundscape: 'storm_plateau',
    north: {
      name: 'Northern Barrow-road',
      description: 'The northern way into the barrow-hills.',
      guard: {
        label: 'Barrow guard',
        army: [
          ['celtic_elder_pooka', 30],
          ['celtic_great_cu_sith', 6],
        ],
        reward: { resources: { gold: 1000 } },
        battlefield: 'ridge_pass',
      },
    },
    south: {
      name: 'Southern Barrow-road',
      description: 'The southern way, where two bound stags stand guard against their will.',
      guard: {
        label: 'Bound stags',
        army: [
          ['celtic_horned_stag_spirit', 2],
          ['celtic_elder_pooka', 12],
        ],
        reward: { resources: { gold: 1000 } },
        battlefield: 'ridge_pass',
      },
    },
    stones: { north: { name: 'Summer Stone', description: 'The stone of the bright half of the year.' }, south: { name: 'Winter Stone', description: 'The stone of the dark half of the year.' }, cost: { gold: 300, stone: 3 } },
    nest: { name: 'Wyvern Tor', description: 'Wyverns roost on a tor above the barrow-road.', guard: { label: 'Tor wyverns', army: [['wyvern_matriarch', 3]], reward: { resources: { crystal: 6 } }, battlefield: 'grove' } },
    gate: { name: 'Door of the Mound', description: 'The great mound’s door. Both stones must be used to open it.' },
    cache: { name: 'Grave-goods of the Old Kings', description: 'Goods left with the old kings of the barrow-hills.', reward: { resources: { gold: 1500, crystal: 3 } } },
    hall: {
      name: 'Hall of the Withered King',
      description: 'Dubhghall’s hall inside the great mound, where the dark half of the year is kept.',
      guard: {
        label: 'Dubhghall and the barrow court',
        army: [
          ['celtic_dread_kelpie', 2],
          ['celtic_elder_pooka', 20],
          ['celtic_elder_pooka', 20],
          ['celtic_great_cu_sith', 12],
          ['celtic_great_stag_spirit', 2],
          ['celtic_storm_selkie', 2],
        ],
        commander: arcCommander(H['celtic_dubhghall']!, 'boss7', ['bramble_snare']),
        reward: { resources: { gold: 2000 } },
        battlefield: 'beacon_clearing',
      },
    },
    choice: {
      name: 'The Silver Branch',
      description: 'The broken silver bough, its bells silent.',
      title: 'The Silver Branch',
      text: 'With the Withered King gone, the two halves of the branch lie before you. Mended, it will open the mounds as it always did — the Otherworld close, the old folk walking the roads at Samhain and Beltane. Planted, the halves will grow into a new tree; its branches will open the mounds only for those who seek them, and the old folk will grow rarer every year.',
      a: { flag: 'branch_mended', label: 'Mend the branch', summary: 'The mounds open as they always did. Orla gains 500 experience.' },
      b: { flag: 'branch_planted', label: 'Plant the branch', summary: 'A new tree, and a quieter Otherworld. Orla gains 500 experience.' },
    },
    seal: { name: 'Fire of the Year', description: 'The fire-pit where the year’s turning is kindled.', confirm: 'Kindle the fire of the year? This completes The Silver Branch.' },
    patrol: {
      commander: arcCommander(H['celtic_ciar']!, 'patrol7'),
      army: [
        ['celtic_elder_pooka', 24],
        ['celtic_great_cu_sith', 8],
        ['celtic_dread_kelpie', 2],
      ],
    },
    objectives: { approach: 'Into the barrow-hills', north: 'The summer stone', south: 'The winter stone', gate: 'Open the door of the mound', boss: 'The Withered King', choice: 'The silver branch', seal: 'Kindle the fire of the year' },
    scenes: (ids) => [
      { id: 'm07_gate', trigger: { type: 'objective_completed', objectiveId: ids.gate }, lines: [SADB('The door is open. I can smell apple blossom from inside — in this cold.')] },
      { id: 'm07_dubhghall', trigger: { type: 'battle_started', siteId: ids.hall }, lines: [DUBHGHALL('Every summer ends, druid. I only made sure of it.'), ORLA('And every winter ends. I am here to make sure of that.')] },
      { id: 'm07_fallen', trigger: { type: 'objective_completed', objectiveId: ids.boss }, lines: [ORLA('He is gone. The branch is here, in two halves. One last thing to decide.')] },
    ],
  });

  const built = [m1, m2, m3, m4, m5, m6, m7];
  const missions = built.map((b) => b.mission);
  return {
    templates: built.map((b) => b.template),
    missions,
    entitlements: arcEntitlements(ctx, { t3: 'Kelpie Covenant', t6: 'Stag Covenant' }, { t3: 'The keeper’s covenant allows a Kelpie loch to be kept in one fort.', t6: 'The freed stags allow a Stag grove to be kept in one fort.' }),
    campaign: arcCampaign(
      ctx,
      {
        name: 'The Silver Branch',
        tagline: 'Kindle. Ride. Turn the year.',
        summary: 'The silver branch that opens the mounds has been broken, and the year has stuck in its dark half. Lead the druid Orla through seven linked missions — from the cold Beltane of Dún Caill to the door of the great mound — to turn the year and face the Withered King.',
        startingGodNote: 'The Dagda is the fixed patron of this campaign. The Morrígan or Brigid comes in Mission 3; a second god (Cernunnos, Epona or Lugh) in Mission 5.',
        epilogue: [
          SADB('The cattle went out to the summer grazing this morning. Late — but they went.'),
          CATHAL('A boar with iron bristles, a loch of water-horses, a hall under the sea, a usurper and a wood full of stags. The bards will be at it for a hundred years.'),
        ],
        endings: [
          { flag: 'branch_mended', lines: [ORLA('The mounds are open. Last night three of the old folk came to the fort gate and asked for milk. We gave it to them.'), SADB('We always did, before. It is good to have them back.')] },
          { flag: 'branch_planted', lines: [ORLA('The new tree is already taller than me. Its branches open the mounds for those who look for them — fewer every year.'), CATHAL('A quieter world. Maybe the old folk wanted the rest.')] },
        ],
      },
      missions,
    ),
  };
}
