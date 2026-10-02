/**
 * The New Fire — the Mesoamerican campaign (seven missions), built on the
 * Winter Oath arc (arc.ts). Owner request 2026-10-02.
 *
 * Original fiction in a Mesoamerican-inspired setting: the fire that binds the
 * years was put out before it could be rekindled, the sun is dimming, and a
 * day-keeper relights the altars one by one. Not a retelling of any text. Every
 * number is proposed and unplaytested.
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

const P = 'mesoamerican';
const ITZEL = speaker(P, 'Itzel');
const CHIMAL = speaker(P, 'Chimal');
const XOCO = speaker(P, 'Grandmother Xoco', 'xoco');
const ITZTLI = speaker(P, 'Itztli');
const TECUANI = speaker(P, 'Tecuani');

export const NEW_FIRE_HEROES: readonly HeroDefinition[] = [
  arcHero(P, 'mesoamerican_itzel', 'Itzel', 'Day-Keeper of Xochitla', 'day_keeper', 'A day-keeper who counts the calendar and knows which fire belongs to which day. The hero of The New Fire.', 'campaign'),
  arcHero(P, 'mesoamerican_itztli', 'Itztli', 'The Night-Knife', 'day_keeper', 'An obsidian priest who wants the age to end in darkness so that the next one will be his. Final opponent of The New Fire.', 'enemy'),
  arcHero(P, 'mesoamerican_tecuani', 'Tecuani', 'Lord of Itzcalli', 'tlatoani', 'A city lord who swore to the Night-Knife in exchange for the next age’s throne. Rival empire in The New Fire, mission 5.', 'enemy'),
  arcHero(P, 'mesoamerican_acatl', 'Acatl', 'Captain of the Lake Canoes', 'jaguar_knight', 'A canoe captain who raids the lake towns in the Night-Knife’s name. Patrol in The New Fire, mission 4.', 'enemy'),
  arcHero(P, 'mesoamerican_mazatl', 'Mazatl', 'Keeper of the Fire Mountain', 'jaguar_knight', 'The Night-Knife’s champion, who holds the fire mountain. The New Fire, mission 6.', 'enemy'),
  arcHero(P, 'mesoamerican_tlacatl', 'Tlacatl', 'Warden of the Smoking Gate', 'jaguar_knight', 'Keeper of the road between the morning-star stone and the evening-star stone. Patrol in The New Fire, mission 7.', 'enemy'),
];
const H = Object.fromEntries(NEW_FIRE_HEROES.map((h) => [h.id, h]));

export function buildNewFire(names: ArcCampaignContext['names'], familyOf: ArcCampaignContext['familyOf']): {
  templates: MapTemplateDefinition[];
  missions: MissionDefinition[];
  campaign: CampaignDefinition;
  entitlements: EntitlementDefinition[];
} {
  const ctx: ArcCampaignContext = {
    id: 'new_fire',
    pantheonId: P,
    archetypeId: 'mesoamerican_city',
    hero: { heroId: 'itzel', definitionId: 'mesoamerican_itzel', classId: 'day_keeper', name: 'Itzel' },
    gods: { patron: 'mesoamerican_quetzalcoatl', first: ['mesoamerican_huitzilopochtli', 'mesoamerican_coatlicue'], second: ['mesoamerican_tlaloc', 'mesoamerican_tezcatlipoca', 'mesoamerican_xiuhtecuhtli'] },
    t: [
      { base: '', up: '' },
      { base: 'mesoamerican_feathered_serpent', up: 'mesoamerican_celestial_feathered_serpent' },
      { base: 'mesoamerican_jaguar_spirit', up: 'mesoamerican_sun_jaguar' },
      { base: 'mesoamerican_eagle_warrior_spirit', up: 'mesoamerican_solar_eagle_warrior' },
      { base: 'mesoamerican_cenote_crocodile', up: 'mesoamerican_temple_crocodile' },
      { base: 'mesoamerican_camazotz', up: 'mesoamerican_blood_moon_camazotz' },
      { base: 'mesoamerican_xiuhcoatl', up: 'mesoamerican_divine_xiuhcoatl' },
      { base: 'mesoamerican_stone_colossus', up: 'mesoamerican_sun_colossus' },
    ],
    covenantT3: 'mesoamerican_eagle_warrior_spirit',
    covenantT6: 'mesoamerican_xiuhcoatl',
    covenantT7: 'mesoamerican_stone_colossus',
    hostName: 'The Night-Knife’s Host',
    hiringReason: 'Itzel carries the fire with her own war-band. Hero hiring is disabled in The New Fire.',
    debriefPolicy: [
      'Itzel keeps her level, experience (up to the displayed cap), skills, spellbook, spells and equipment.',
      'Quetzalcoatl and every god she has committed to carry into the next mission.',
      'Troops, resources, cities, mines and recruitment pools stay behind to keep the fires.',
      'The next mission begins with its declared war-band and treasury.',
    ],
    seed: 440000,
    names,
    familyOf,
  };

  const m1 = restoreMission(ctx, {
    name: 'The Cold Altar',
    summary: 'On the night the years are bound, the new fire was never lit — someone put out the old one first. Raise a war-band of feathered serpents in Xochitla, clear the canoe ford and kindle the fire on the hill altar.',
    newDecisions: ['Recruit and train', 'Offering', 'Learn spells at the Mage Guild', 'A one-time choice'],
    briefing: [
      XOCO('Fifty-two years, and the night came to bind them. We broke the old pots, put out every hearth and waited for the fire from the hill. It never came.'),
      ITZEL('Then the fire-drill never turned. Someone stopped the priests before the new fire could be drilled. The hill altar is where it starts.'),
      CHIMAL('Men in black paint hold the hill. And the canoe ford is full of peccaries gone mad with hunger. I will carry the shield, day-keeper.'),
    ],
    victory: [ITZEL('The new fire burns on the hill, and the runners are carrying it to the hearths. But only here. The sun was paler again this morning.')],
    town: { townId: 'xochitla', name: 'Xochitla', description: 'Itzel’s city of flower terraces on the lake shore.' },
    biome: 'jungle',
    soundscape: 'coast',
    barrier: 'water',
    event: {
      name: 'Broken Fire-shrine',
      description: 'A small fire-shrine whose brazier has been kicked over.',
      title: 'The Broken Fire-shrine',
      text: 'The brazier lies in the mud and the copal has burned to nothing. Around it, four small feathered serpents coil in the ashes, as if waiting to be told where the fire went.',
      options: [
        { label: 'Take the shrine’s jade and cacao', summary: '+600 Gold and +4 Wood.', reward: { resources: { gold: 600, wood: 4 } } },
        { label: 'Call the serpents with the fire-song', summary: '4 Feathered Serpents join Itzel’s war-band.', reward: { creatures: [{ creatureId: 'mesoamerican_feathered_serpent', count: 4 }] } },
      ],
    },
    camp: { name: 'Jaguar Thicket', description: 'Jaguar spirits that will hunt for whoever keeps the right day.', creatureId: 'mesoamerican_jaguar_spirit' },
    crossing: {
      name: 'Canoe Ford',
      description: 'The ford to the hill road. A herd of wild pigs, mad with hunger, holds it.',
      guard: { label: 'Ford pigs', army: [['wild_boar', 8]], reward: { resources: { gold: 300, wood: 3, stone: 3 } }, battlefield: 'coast_road' },
    },
    cache: { name: 'Abandoned Market Stall', description: 'A stall abandoned when the fires went out.', reward: { resources: { gold: 400, crystal: 1 } } },
    monument: {
      name: 'Altar of the Hill',
      description: 'The hilltop altar where the new fire is drilled. Men in black paint guard it.',
      guard: {
        label: 'Black-painted cultists',
        army: [
          ['brigand', 14],
          ['brigand_cutthroat', 4],
        ],
        reward: { resources: { gold: 500 }, artifactIds: ['quetzal_war_crown'] },
        battlefield: 'beacon_clearing',
      },
      confirm: 'Drill the new fire on the Altar of the Hill? This completes The Cold Altar.',
    },
    objectives: { recruit: 'Call the feathered serpents', train: 'Give them sky-feathers', crossing: 'Clear the canoe ford', guard: 'Drive off the cultists', activate: 'Drill the new fire', event: 'The broken fire-shrine (optional)' },
    scenes: (ids) => [
      { id: 'm01_ford', trigger: { type: 'site_cleared', siteId: ids.crossing }, lines: [CHIMAL('Someone penned those pigs in the ford and starved them. Cruel, and on purpose.'), ITZEL('Then someone wanted the hill kept clear. The altar, then.')] },
      { id: 'm01_altar_battle', trigger: { type: 'battle_started', siteId: ids.monument }, lines: [ITZTLI('Little day-keeper. The count is finished. No new fire, no new years. Let the sun go out like a tired hearth.'), ITZEL('I have not finished counting.')] },
      { id: 'm01_crown', trigger: { type: 'site_cleared', siteId: ids.monument }, lines: [XOCO('Their leader wore this — the quetzal crown from the temple of Xochitla. It was stolen at the binding.'), ITZEL('A temple crown on a cultist. Whoever pays them has walked in our temples.')] },
      { id: 'm01_losses', trigger: { type: 'casualties', minLost: 4 }, lines: [XOCO('We counted our dead today, Itzel. The count is longer than I like.'), ITZEL('Then I will count more carefully.')] },
    ],
    help: [{ id: 'offering', title: 'Offering', text: 'The Mesoamerican signature: once per week in each city with a Temple, creatures from the garrison or the visiting hero can be offered for Favor.' }],
  });

  const m2 = huntMission(ctx, {
    name: 'The Black Jaguars',
    summary: 'A pack of black jaguar spirits, loosed by the Night-Knife, hunts the cacao groves of Tepeyolo and guards the altar of the morning star. Raise jaguars of your own, cross the river, hunt the pack down and relight the altar.',
    newDecisions: ['Hunt a wandering pack', 'Use a lookout', 'Buy or bargain on the road'],
    briefing: [
      CHIMAL('Tepeyolo’s cacao pickers will not go into the groves. Black jaguars — not the spotted kind — and they do not eat what they kill.'),
      ITZEL('The altar of the morning star is beyond the groves. If the morning star has no fire, the sun has no herald.'),
      XOCO('Jaguars of our own, then. Build them a house, child. Jaguars respect their own kind.'),
    ],
    victory: [XOCO('Two altars lit. The old eagle knights say the next fire belongs to the House of Eagles in the mountains — and that the eagles have stopped flying.')],
    town: { townId: 'tepeyolo', name: 'Tepeyolo', description: 'A cacao town in the river valley.' },
    biome: 'jungle',
    soundscape: 'coast',
    barrier: 'water',
    lookout: { name: 'Watcher’s Pyramid', description: 'From its top, the groves beyond the river lie open.' },
    event: {
      name: 'A Jade-cutter’s Workshop',
      description: 'A jade-cutter who has worked the same stone for a year.',
      title: 'The Jade-cutter',
      text: '“A ring for the rain god’s favour,” the jade-cutter says, holding it up to the light. “A year of my life. You may buy it. Or sit with me while I work, and I will tell you what the jaguars are for.”',
      options: [
        { label: 'Buy the jade ring', summary: 'Pay 2,000 Gold for the Jade Ring of Tlaloc.', cost: { gold: 2000 }, reward: { artifactIds: ['jade_ring_of_tlaloc'] } },
        { label: 'Sit and listen', summary: 'Itzel gains +1 Knowledge.', reward: { attributes: { knowledge: 1 } } },
      ],
    },
    camp: { name: 'Spotted Thicket', description: 'Jaguar spirits that have not joined the black pack.', creatureId: 'mesoamerican_jaguar_spirit' },
    bridge: {
      name: 'Rope Ferry',
      description: 'The rope ferry over the river, held by cultists.',
      guard: {
        label: 'Ferry cultists',
        army: [
          ['brigand', 16],
          ['brigand_cutthroat', 6],
        ],
        reward: { resources: { gold: 600, favor: 3 } },
        battlefield: 'coast_road',
      },
    },
    lair: {
      name: 'Jaguar Den',
      description: 'A den under a ceiba tree, where something green glints among the bones.',
      guard: {
        label: 'Den jaguars',
        army: [
          ['mesoamerican_sun_jaguar', 4],
          ['mesoamerican_jaguar_spirit', 6],
        ],
        reward: { resources: { gold: 500 }, artifactIds: ['jade_pectoral'] },
        battlefield: 'grove',
      },
    },
    stone: { name: 'Altar of the Morning Star', description: 'The altar where the herald of the sun is greeted.', confirm: 'Relight the Altar of the Morning Star? This completes The Black Jaguars.' },
    prey: {
      id: 'mesoamerican_black_jaguars',
      name: 'The Black Jaguars',
      portraitAssetId: 'creature.mesoamerican.tier2.upgraded.portrait',
      army: [
        ['mesoamerican_sun_jaguar', 6],
        ['mesoamerican_jaguar_spirit', 12],
      ],
      bounty: { gold: 800 },
    },
    objectives: {
      recruit: 'Jaguars of our own',
      lookout: 'Climb the watcher’s pyramid',
      bridge: 'Take the rope ferry',
      prey: 'Hunt the black jaguars',
      preyHint: 'The pack roams the groves beyond the river and only attacks a war-band it is sure it can beat. Move onto it to fight.',
      activate: 'Relight the morning star',
      lair: 'The jaguar den (optional)',
      event: 'The jade-cutter (optional)',
    },
    scenes: (ids) => [
      { id: 'm02_pyramid', trigger: { type: 'site_visited', siteId: ids.lookout }, lines: [ITZEL('There — the groves are trampled in a ring around the altar. They are guarding it.'), CHIMAL('Then it still matters to someone. Good.')] },
      { id: 'm02_pack_battle', trigger: { type: 'battle_started', heroDefinitionId: ids.prey }, lines: [ITZTLI('Hunt her, my black ones. Night belongs to jaguars.')] },
      { id: 'm02_pack_broken', trigger: { type: 'objective_completed', objectiveId: ids.preyObjective }, lines: [CHIMAL('The pack is broken. The last of them ran for the hills.'), ITZEL('Let them. Without the Night-Knife’s voice they are only cats.')] },
    ],
  });

  const m3 = covenantMission(ctx, {
    name: 'The House of Eagles',
    summary: 'The eagle warriors of Ocelotepec have stopped flying. Break the cultists on the mountain road, free the crocodiles’ cenote from the stone jailers, win the eagle covenant — by the elders’ price or by force — and take a god for the dark road ahead.',
    newDecisions: ['A covenant: pay or fight', 'Your first minor god', 'Elite troops in the army'],
    briefing: [
      CHIMAL('The eagle warriors fly for whoever keeps the covenant of the House of Eagles. For a month they have only perched.'),
      ITZEL('A covenant can be kept, sold or stolen. If they do not fly for us, someone else holds it.'),
      XOCO('And the crocodiles of the sacred cenote have sunk to the bottom. A cenote without its guardians is only a hole.'),
    ],
    victory: [ITZEL('The covenant holds, a god walks with us and the mountain fire burns. From here the road goes down to the great lake.')],
    town: { townId: 'ocelotepec', name: 'Ocelotepec', description: 'A mountain city under the House of Eagles.' },
    biome: 'high_pass',
    soundscape: 'high_pass',
    cache: { name: 'Merchants’ Cache', description: 'Goods hidden by merchants who fled the mountain road.', reward: { resources: { gold: 700, wood: 5 }, artifactIds: ['quilted_cotton_armor'] } },
    pass: {
      name: 'Mountain Road',
      description: 'The only road up the mountain, held by cultists.',
      guard: {
        label: 'Mountain cultists',
        army: [
          ['brigand', 16],
          ['brigand_cutthroat', 6],
        ],
        reward: { resources: { gold: 750, favor: 5 } },
        battlefield: 'ridge_pass',
      },
    },
    roost: {
      name: 'Sacred Cenote',
      description: 'The crocodiles’ cenote. Stone serpent-heads that walk stand around it like jailers.',
      guard: { label: 'Stone jailers', army: [['clay_golem', 5]], reward: { resources: { favor: 5 }, artifactIds: ['jaguar_pelt_cape'] }, battlefield: 'ridge_pass' },
    },
    hearth: {
      name: 'The Eagle Elders',
      description: 'Three old eagle knights sit at the foot of the House of Eagles.',
      title: 'The Eagle Elders',
      text: '“Our covenant was traded,” the eldest says, “by a young captain, for an obsidian knife that sings. He is gone; the covenant is with the Night-Knife now. Buy it back at the price it fetched, and the eagles will fly for you. Or climb to the House and take it from the warriors there. They miss the sky.”',
      price: { gold: 1500, wood: 10 },
      payLabel: 'Pay the elders’ price',
      refuseLabel: 'Refuse — take it at the House of Eagles',
    },
    home: {
      name: 'House of Eagles',
      description: 'The eagle knights’ house, where the traded covenant hangs.',
      guard: {
        label: 'Perched eagle warriors',
        army: [
          ['mesoamerican_eagle_warrior_spirit', 4],
          ['mesoamerican_solar_eagle_warrior', 1],
        ],
        reward: { resources: { gold: 1000 } },
        battlefield: 'grove',
      },
    },
    bridge: {
      name: 'Hanging Bridge',
      description: 'A hanging bridge over the gorge, held by cultists and wild pigs.',
      guard: {
        label: 'Gorge cultists',
        army: [
          ['brigand_cutthroat', 12],
          ['tusked_boar', 4],
        ],
        reward: { resources: { gold: 800 } },
        battlefield: 'ridge_pass',
      },
    },
    stone: { name: 'Mountain Fire Altar', description: 'The altar where the fire is passed from mountain to mountain.', confirm: 'Kindle the mountain fire? This completes The House of Eagles.' },
    band: { id: 'mesoamerican_gorge_pigs', name: 'Gorge Pigs', army: [['wild_boar', 6]] },
    objectives: {
      pass: 'Take the mountain road',
      roost: 'Free the sacred cenote',
      covenant: 'The eagle covenant',
      covenantDescription: 'Win the eagle covenant: pay the elders’ price, or beat the perched warriors at the House of Eagles.',
      god: 'A god for the dark road',
      elite: 'Temple crocodiles in the war-band',
      activate: 'Kindle the mountain fire',
      cache: 'The merchants’ cache (optional)',
    },
    scenes: (ids) => [
      { id: 'm03_cenote', trigger: { type: 'site_cleared', siteId: ids.roost }, lines: [XOCO('The crocodiles are rising. They will remember the hands that broke the stone.'), ITZEL('Good. I want them to.')] },
      { id: 'm03_house', trigger: { type: 'site_cleared', siteId: ids.home }, lines: [CHIMAL('The knife the young captain got — it is here, on the wall. Obsidian, and it hums.'), ITZEL('The Night-Knife pays in his own glass. I will remember the sound.')] },
      { id: 'm03_god', trigger: { type: 'objective_completed', objectiveId: ids.god }, lines: [ITZEL('A god walks with us. Whatever wants the sun to end, it will not meet us alone.')] },
    ],
  });

  const m4 = seekMission(ctx, {
    name: 'The House of Bats',
    summary: 'The House of Bats stands on an island in the great lake, behind a smoke that came with the raiders’ canoes. Raise camazotz of your own, take the landing, light both lake altars to clear the smoke and ask the bats where the Night-Knife keeps the stolen fire.',
    newDecisions: ['Light two fires to open a way', 'A commanded patrol', 'Bat-spirits'],
    briefing: [
      ITZEL('The bats see everything that moves at night. If the Night-Knife carried the old fire away, the bats watched him go.'),
      CHIMAL('A smoke has lain on the lake since the canoe raiders came. Their captain, Acatl, walks the islands.'),
      XOCO('The two lake altars burn through any smoke — the old priests built them so. Light both and the lake must clear.'),
    ],
    victory: [ITZEL('The bats saw him: the Night-Knife, carrying the old fire into the smoking mountain in the east. And a city lord at Itzcalli holds the road for him.')],
    town: { townId: 'acalco', name: 'Acalco', description: 'A canoe-builders’ town on the great lake.' },
    biome: 'jungle',
    soundscape: 'coast',
    wanderer: {
      name: 'A Travelling Merchant',
      description: 'A long-distance merchant resting on the shore with his bearers.',
      title: 'The Long-road Merchant',
      text: '“I carry news as well as feathers,” the merchant says. “You are going to the bats. Go at noon — they sleep then.” He unrolls a painted book. “A codex of the sun’s count. Take it. Or sit, and I will tell you what the bats told me.”',
      options: [
        { label: 'Take the codex', summary: 'The Sun-stone Codex joins Itzel’s backpack.', reward: { artifactIds: ['sun_stone_codex'] } },
        { label: 'Sit and listen', summary: 'Itzel gains +1 Spell Power and +1 Knowledge.', reward: { attributes: { power: 1, knowledge: 1 } } },
      ],
    },
    wreck: { name: 'Overturned Canoe', description: 'A cargo canoe overturned in the reeds; its bundles are dry.', reward: { resources: { gold: 900, wood: 4 } } },
    landing: {
      name: 'Island Landing',
      description: 'The landing on the near island, held by canoe raiders.',
      guard: {
        label: 'Canoe raiders',
        army: [
          ['brigand', 20],
          ['brigand_cutthroat', 8],
        ],
        reward: { resources: { gold: 800, favor: 3 } },
        battlefield: 'coast_road',
      },
    },
    omen: {
      name: 'The Raiders’ War-canoe',
      description: 'A war-canoe of the raiders, pulled up on the island.',
      title: 'The War-canoe',
      text: 'The canoe is loaded with plunder from every lake town — and a cage of golden jaguars the raiders took from a temple and never dared to open.',
      options: [
        { label: 'Take the plunder', summary: '+800 Gold and +2 Crystal.', reward: { resources: { gold: 800, crystal: 2 } } },
        { label: 'Open the cage', summary: '6 Sun Jaguars join Itzel’s war-band.', reward: { creatures: [{ creatureId: 'mesoamerican_sun_jaguar', count: 6 }] } },
      ],
    },
    relays: { north: { name: 'North Lake Altar', description: 'A fire altar on the northern island.' }, south: { name: 'South Lake Altar', description: 'A fire altar on the southern island.' }, cost: { gold: 250, stone: 3 } },
    nest: { name: 'Giants’ Cave', description: 'Two giants of the old age, who never died with it, live in a lake cave.', guard: { label: 'Old-age giants', army: [['ogre', 2]], reward: { resources: { crystal: 5 } }, battlefield: 'grove' } },
    gate: { name: 'The Lake Smoke', description: 'A wall of smoke over the lake. Both altars must burn to clear it.' },
    goal: {
      name: 'House of Bats',
      description: 'A dark house on the far island, where the bat-spirits hang.',
      guard: {
        label: 'House bats',
        army: [
          ['mesoamerican_camazotz', 3],
          ['mesoamerican_blood_moon_camazotz', 1],
        ],
        reward: { resources: { gold: 1000 } },
        battlefield: 'coast_road',
      },
      reward: { questXp: 2200, artifactIds: ['obsidian_macuahuitl'] },
      confirm: 'Ask the bats what they saw? This completes The House of Bats.',
    },
    patrol: {
      commander: arcCommander(H['mesoamerican_acatl']!, 'patrol4'),
      army: [
        ['mesoamerican_celestial_feathered_serpent', 16],
        ['mesoamerican_sun_jaguar', 6],
      ],
    },
    objectives: { recruit: 'Bat-spirits of our own', landing: 'Take the island landing', north: 'The north lake altar', south: 'The south lake altar', gate: 'Clear the lake smoke', goal: 'Ask the bats', nest: 'The giants’ cave (optional)', wanderer: 'The long-road merchant (optional)' },
    scenes: (ids) => [
      { id: 'm04_landing', trigger: { type: 'site_cleared', siteId: ids.landing }, lines: [CHIMAL('Their paddles were obsidian. Every one of them.'), ITZEL('Then Acatl is close. Keep the war-band together.')] },
      { id: 'm04_smoke', trigger: { type: 'objective_completed', objectiveId: ids.gate }, lines: [XOCO('The smoke is lifting off the water like mist at sunrise. The old priests knew their work.')] },
      { id: 'm04_bats', trigger: { type: 'battle_started', siteId: ids.goal }, lines: [ITZTLI('Ask the bats, day-keeper. They will tell you the night is longer than the day. It always was.')] },
    ],
  });

  const m5 = rivalMission(ctx, {
    name: 'The Lord of Itzcalli',
    summary: 'Tecuani, lord of Itzcalli, swore to the Night-Knife for the throne of the next age, and holds the road east. Cross the river, take a second god, besiege his city and break the stela of his oath.',
    newDecisions: ['A rival empire', 'A second minor god', 'A siege'],
    briefing: [
      XOCO('Tecuani was a good lord once. When the fire went out, the Night-Knife promised him the throne of the next age, and he believed it.'),
      ITZEL('The oath-stela in his city binds him to the Night-Knife — and binds the road east to both of them. It has to fall.'),
      TECUANI('Go back to your counting, day-keeper. Every age ends. I only want to be standing when the next one begins.'),
    ],
    victory: [ITZEL('The stela is broken and the road east is open. Tecuani has nothing left but the Night-Knife’s promise — and so do we, except that we know where the fire is.')],
    town: { townId: 'tonalco', name: 'Tonalco', description: 'A river city on the road east, loyal to the old count.' },
    biome: 'jungle',
    soundscape: 'coast',
    gold: { name: 'Gold Mine', description: 'An unowned mine.', guard: { label: 'Mine pigs', army: [['tusked_boar', 10]], reward: { resources: { gold: 500 } }, battlefield: 'open_field' } },
    event: {
      name: 'The Rain Pool',
      description: 'A pool where frogs sing the rain in.',
      title: 'The Rain Pool',
      text: 'The frogs sing for the rain god here. On a stone at the edge lie jade beads someone left in thanks — or you could sit and learn the song yourself.',
      options: [
        { label: 'Take the jade', summary: '+1,500 Gold.', reward: { resources: { gold: 1500 } } },
        { label: 'Learn the rain song', summary: 'Itzel gains +1 Defense and +1 Knowledge.', reward: { attributes: { defense: 1, knowledge: 1 } } },
      ],
    },
    north: { name: 'Stone Ford', description: 'The northern ford, held by stone jailers on Tecuani’s orders.', guard: { label: 'Ford stones', army: [['clay_golem', 8]], reward: { resources: { gold: 800 } }, battlefield: 'coast_road' } },
    south: {
      name: 'Cultist Ford',
      description: 'The southern ford, held by black-painted cultists.',
      guard: {
        label: 'Ford cultists',
        army: [
          ['brigand', 24],
          ['brigand_cutthroat', 10],
        ],
        reward: { resources: { gold: 800 } },
        battlefield: 'coast_road',
      },
    },
    stele: { name: 'Oath Stela', description: 'The stela of Tecuani’s oath to the Night-Knife.', confirm: 'Break the Oath Stela? This completes The Lord of Itzcalli.' },
    rival: {
      playerId: 'itzcalli',
      townId: 'itzcalli',
      townName: 'Itzcalli',
      townDescription: 'Tecuani’s city, its walls inlaid with obsidian.',
      color: '#3f3550',
      hero: { heroId: 'tecuani', definitionId: 'mesoamerican_tecuani', classId: 'tlatoani', name: 'Tecuani' },
      army: [
        ['mesoamerican_celestial_feathered_serpent', 26],
        ['mesoamerican_sun_jaguar', 10],
        ['mesoamerican_cenote_crocodile', 3],
      ],
      garrison: [
        ['mesoamerican_celestial_feathered_serpent', 24],
        ['mesoamerican_sun_jaguar', 8],
        ['mesoamerican_cenote_crocodile', 2],
      ],
      reward: { artifactIds: ['boots_of_the_long_road'] },
    },
    objectives: { crossing: 'Cross the river', god: 'A second god', town: 'Take Itzcalli', stele: 'Break the oath stela', rival: 'Defeat Tecuani (optional)', event: 'The rain pool (optional)' },
    scenes: (ids) => [
      { id: 'm05_crossed', trigger: { type: 'objective_completed', objectiveId: ids.crossing }, lines: [CHIMAL('We are over. His runners will be in Itzcalli by tonight.'), ITZEL('Let them run. He should hear it from his own people.')] },
      { id: 'm05_tecuani', trigger: { type: 'battle_started', heroDefinitionId: ids.rival }, lines: [TECUANI('Every age ends in fire or flood. Why not end this one with a bargain?'), ITZEL('Because it is not yours to end.')] },
      { id: 'm05_taken', trigger: { type: 'objective_completed', objectiveId: ids.town }, lines: [ITZEL('Itzcalli is ours. Now the stela.')] },
    ],
  });

  const m6 = refugeMission(ctx, {
    name: 'The Fire Mountain',
    summary: 'The fire serpents, whose coils carry flame across the sky, are chained in the crater of the fire mountain. Break the jailers, accept the serpents’ covenant, raise fire serpents of your own and defeat Mazatl at the crater gate.',
    newDecisions: ['Claim a covenant from the journal', 'Fire serpents in the war-band', 'A gate champion'],
    briefing: [
      CHIMAL('The turquoise fire serpents carry the flame across the sky. Since the binding night they have not been seen.'),
      ITZEL('The Night-Knife has chained them in the crater of the fire mountain. Free them, and the sky can carry fire again.'),
      XOCO('His champion holds the crater gate. Mazatl. He was a temple guard of Xochitla, child. I knew his mother.'),
    ],
    victory: [ITZEL('The serpents fly. Tonight, from the crater rim, I saw the smoking mountain in the east — and the morning-star stone and the evening-star stone on either side of its gate.')],
    town: { townId: 'quetzaltepec', name: 'Quetzaltepec', description: 'A city on the slopes of the fire mountain.' },
    biome: 'high_pass',
    soundscape: 'high_pass',
    north: {
      name: 'Stone Steps',
      description: 'The northern steps to the crater, held by stone jailers.',
      guard: {
        label: 'Step jailers',
        army: [
          ['clay_golem', 8],
          ['bronze_golem', 2],
        ],
        reward: { resources: { gold: 1000 } },
        battlefield: 'ridge_pass',
      },
    },
    south: {
      name: 'Cultist Stair',
      description: 'The southern stair, held by cultists and wild pigs.',
      guard: {
        label: 'Stair cultists',
        army: [
          ['brigand_cutthroat', 24],
          ['tusked_boar', 6],
        ],
        reward: { resources: { gold: 1000 } },
        battlefield: 'ridge_pass',
      },
    },
    event: {
      name: 'A Turquoise Hatchling',
      description: 'A fire-serpent hatchling caught in an obsidian snare.',
      title: 'The Hatchling',
      text: 'The hatchling glows like a coal. Freed, it will fly to its mother. Or the snare itself — singing obsidian — can be melted in a fire and its song read.',
      options: [
        { label: 'Free the hatchling', summary: '+2 Crystal and +10 Favor.', reward: { resources: { crystal: 2, favor: 10 } } },
        { label: 'Read the snare’s song', summary: 'Itzel gains 1,000 experience.', reward: { questXp: 1000 } },
      ],
    },
    refuge: {
      name: 'Crater Chains',
      description: 'Where the fire serpents are chained, under the Night-Knife’s jailers.',
      guard: {
        label: 'Crater jailers',
        army: [
          ['mesoamerican_celestial_feathered_serpent', 30],
          ['bronze_golem', 3],
          ['mesoamerican_blood_moon_camazotz', 2],
        ],
        reward: { resources: { gold: 1500 } },
        battlefield: 'grove',
      },
    },
    nest: { name: 'Giants’ Hall', description: 'Two chieftains of the old-age giants in a hall of lava stone.', guard: { label: 'Giant chieftains', army: [['ogre_chieftain', 2]], reward: { resources: { crystal: 6 } }, battlefield: 'grove' } },
    gate: {
      name: 'Crater Gate',
      description: 'The gate out of the crater, held by Mazatl.',
      guard: {
        label: 'Mazatl and the gate guard',
        army: [
          ['mesoamerican_celestial_feathered_serpent', 30],
          ['mesoamerican_sun_jaguar', 10],
          ['mesoamerican_solar_eagle_warrior', 4],
          ['mesoamerican_temple_crocodile', 3],
        ],
        commander: arcCommander(H['mesoamerican_mazatl']!, 'gate6'),
        reward: { resources: { gold: 1500 }, artifactIds: ['eagle_chimalli'] },
        battlefield: 'ridge_pass',
      },
    },
    horn: { name: 'Conch of the Sky', description: 'The great conch blown when the serpents rise.', confirm: 'Blow the Conch of the Sky? This completes The Fire Mountain.' },
    band: { id: 'mesoamerican_lava_guardians', name: 'Lava Guardians', army: [['bronze_golem', 6]] },
    objectives: {
      approach: 'Climb to the crater',
      refuge: 'Break the crater jailers',
      claim: 'Accept the serpents’ covenant',
      claimDescription: 'Accept the fire serpents’ covenant in the journal. It can then be assigned to Quetzaltepec.',
      elite: 'Fire serpents in the war-band',
      gate: 'Mazatl at the gate',
      horn: 'Blow the conch of the sky',
      event: 'The hatchling (optional)',
    },
    scenes: (ids) => [
      { id: 'm06_freed', trigger: { type: 'site_cleared', siteId: ids.refuge }, lines: [ITZEL('The chains are broken. They will not follow us for that — serpents follow covenants.'), CHIMAL('Then make one, day-keeper. They are circling, waiting.')] },
      { id: 'm06_mazatl', trigger: { type: 'battle_started', siteId: ids.gate }, lines: [ITZTLI('Mazatl guarded your temple once, day-keeper. Now he guards mine. Everything comes to me in the end.')] },
      { id: 'm06_gate', trigger: { type: 'objective_completed', objectiveId: ids.gateObjective }, lines: [XOCO('Mazatl is down. I will tell his mother he fought well, at the end, and that he was sorry.')] },
    ],
  });

  const m7 = finaleMission(ctx, {
    name: 'The Smoking Gate',
    summary: 'The Night-Knife keeps the old fire in his obsidian palace inside the smoking mountain. Cross the ash-hills, light the morning-star stone and the evening-star stone to open the gate, defeat Itztli and decide what fire the next years are bound with.',
    newDecisions: ['Two stones, one gate', 'The Night-Knife', 'The last choice'],
    briefing: [
      ITZEL('The smoking mountain. The old fire of the last binding is inside, in the Night-Knife’s palace. Without it, no new fire can be bound to the years.'),
      CHIMAL('The morning-star stone and the evening-star stone open the gate, one on each side of the ash-road. Tlacatl the warden walks between them.'),
      ITZTLI('Come in, day-keeper. Count your last day with me.'),
    ],
    victory: [ITZEL('The fire is ours. The count goes on.')],
    town: { townId: 'tlapallan', name: 'Tlapallan', description: 'The last city before the ash-hills, where the sun is said to be born.' },
    biome: 'storm_plateau',
    soundscape: 'storm_plateau',
    north: {
      name: 'Northern Ash-road',
      description: 'The northern way into the ash-hills.',
      guard: {
        label: 'Ash-road guard',
        army: [
          ['mesoamerican_celestial_feathered_serpent', 30],
          ['mesoamerican_sun_jaguar', 6],
        ],
        reward: { resources: { gold: 1000 } },
        battlefield: 'ridge_pass',
      },
    },
    south: {
      name: 'Southern Ash-road',
      description: 'The southern way, where two chained fire serpents stand guard against their will.',
      guard: {
        label: 'Chained serpents',
        army: [
          ['mesoamerican_xiuhcoatl', 2],
          ['mesoamerican_celestial_feathered_serpent', 12],
        ],
        reward: { resources: { gold: 1000 } },
        battlefield: 'ridge_pass',
      },
    },
    stones: { north: { name: 'Morning-star Stone', description: 'The stone of the herald of the sun.' }, south: { name: 'Evening-star Stone', description: 'The stone of the sun’s last light.' }, cost: { gold: 300, stone: 3 } },
    nest: { name: 'Wyvern Crag', description: 'Wyverns roost on a crag above the ash-road.', guard: { label: 'Crag wyverns', army: [['wyvern_matriarch', 3]], reward: { resources: { crystal: 6 } }, battlefield: 'grove' } },
    gate: { name: 'The Smoking Gate', description: 'The gate of the smoking mountain. Both stones must burn to open it.' },
    cache: { name: 'Offerings of the Ages', description: 'Offerings left at the mountain at every binding of the years.', reward: { resources: { gold: 1500, crystal: 3 } } },
    hall: {
      name: 'Obsidian Palace',
      description: 'Itztli’s palace inside the mountain, where the old fire burns black.',
      guard: {
        label: 'Itztli and the obsidian court',
        army: [
          ['mesoamerican_solar_eagle_warrior', 2],
          ['mesoamerican_celestial_feathered_serpent', 20],
          ['mesoamerican_celestial_feathered_serpent', 20],
          ['mesoamerican_sun_jaguar', 12],
          ['mesoamerican_divine_xiuhcoatl', 2],
          ['mesoamerican_blood_moon_camazotz', 2],
        ],
        commander: arcCommander(H['mesoamerican_itztli']!, 'boss7', ['obsidian_rain']),
        reward: { resources: { gold: 2000 } },
        battlefield: 'beacon_clearing',
      },
    },
    choice: {
      name: 'The Old Fire',
      description: 'The old fire of the last binding, burning black in a brazier.',
      title: 'The Old Fire',
      text: 'With the Night-Knife gone, the old fire is yours. Rekindled, it will bind the years as before: the same sun, the same count, another fifty-two years. Let go, it will burn out, and a new fire drilled from nothing will begin a new age — a younger sun, a new count, and no one knows what else.',
      a: { flag: 'old_sun', label: 'Rekindle the old fire', summary: 'The same sun, the same count. Itzel gains 500 experience.' },
      b: { flag: 'new_sun', label: 'Drill a new fire', summary: 'A new sun and a new count. Itzel gains 500 experience.' },
    },
    seal: { name: 'Altar of the Binding', description: 'The altar where the years are bound.', confirm: 'Bind the years at the altar? This completes The New Fire.' },
    patrol: {
      commander: arcCommander(H['mesoamerican_tlacatl']!, 'patrol7'),
      army: [
        ['mesoamerican_celestial_feathered_serpent', 24],
        ['mesoamerican_sun_jaguar', 8],
        ['mesoamerican_solar_eagle_warrior', 2],
      ],
    },
    objectives: { approach: 'Into the ash-hills', north: 'The morning-star stone', south: 'The evening-star stone', gate: 'Open the smoking gate', boss: 'The Night-Knife', choice: 'The old fire', seal: 'Bind the years' },
    scenes: (ids) => [
      { id: 'm07_gate', trigger: { type: 'objective_completed', objectiveId: ids.gate }, lines: [XOCO('The gate is open. I have counted fifty-two years twice, child, and never stood this close to the beginning.')] },
      { id: 'm07_itztli', trigger: { type: 'battle_started', siteId: ids.hall }, lines: [ITZTLI('Every age ends, day-keeper. I only chose the day.'), ITZEL('The days are not yours to choose. They are only yours to count.')] },
      { id: 'm07_fallen', trigger: { type: 'objective_completed', objectiveId: ids.boss }, lines: [ITZEL('He is gone. The old fire is still burning. One last thing to decide.')] },
    ],
  });

  const built = [m1, m2, m3, m4, m5, m6, m7];
  const missions = built.map((b) => b.mission);
  return {
    templates: built.map((b) => b.template),
    missions,
    entitlements: arcEntitlements(ctx, { t3: 'Eagle Covenant', t6: 'Fire Serpent Covenant' }, { t3: 'The eagle elders’ covenant allows a House of Eagles to be built in one city.', t6: 'The freed fire serpents allow a serpent crater to be kept in one city.' }),
    campaign: arcCampaign(
      ctx,
      {
        name: 'The New Fire',
        tagline: 'Count. Kindle. Bind the years.',
        summary: 'The fire that binds the years was put out before it could be renewed, and the sun is fading. Lead the day-keeper Itzel through seven linked missions — from the cold altar of Xochitla to the smoking gate — to bind the years again and face the Night-Knife.',
        startingGodNote: 'Quetzalcoatl is the fixed patron of this campaign. Huitzilopochtli or Coatlicue comes in Mission 3; a second god (Tlaloc, Tezcatlipoca or Xiuhtecuhtli) in Mission 5.',
        epilogue: [
          XOCO('Every hearth in Xochitla was lit from the hill this morning. The children ran the coals from house to house.'),
          CHIMAL('A pack of black jaguars, a house of eagles, a lake of bats, a lord of glass and a mountain of fire serpents. I carried the shield the whole way.'),
        ],
        endings: [
          { flag: 'old_sun', lines: [ITZEL('The old fire burns again. The same sun, the same count — fifty-two more years before anyone has to worry.'), XOCO('And I will be here to break the pots, child, if I live that long.')] },
          { flag: 'new_sun', lines: [ITZEL('A new fire, a new sun. It rose this morning younger and whiter than the old one. The count begins at one.'), CHIMAL('A new age. I wonder what it will be like.'), ITZEL('So do I. That is the best part.')] },
        ],
      },
      missions,
    ),
  };
}
