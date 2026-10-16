/**
 * The Silent Oracle — the second Greek campaign (seven missions), built on the
 * Winter Oath arc (arc.ts). Owner request 2026-10-14: "a new campaign for the
 * Greeks to be second, as the first is just to teach the player how to play
 * the game — seven levels; it can use the same heroes."
 *
 * Original fiction in a Greek-inspired setting, a year after The Three
 * Beacons: the Oracle of Kalliste has fallen silent, and a hierophant who calls
 * himself her Voice turns the cities of the coast against one another. Alexios
 * leads again; Thaleia and Ione speak beside him; Melas, beaten on the storm
 * plateau, returns as the rival of mission 5 and his Scout Captain patrols the
 * islands in mission 4. Not a retelling of any myth. Every number is proposed
 * and unplaytested (the arc's values, which passed its headless journeys).
 *
 * The Greek polis keeps its own building names (Barracks, Griffin Aerie, …), so
 * the arc reads them from the town's slot chains (`buildingOf`); Alexios is a
 * strategos, so his starting profiles are a might hero's (`heroDefaults`).
 */
import type { CampaignDefinition, EntitlementDefinition, HeroDefinition, MapTemplateDefinition, MissionDefinition } from '@pr/rules';
import { GREEK_HEROES } from '../greek/pantheon';
import { GREEK_TOWN } from '../greek/town';
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

const P = 'greek';
const ALEXIOS = speaker(P, 'Alexios');
const THALEIA = speaker(P, 'Thaleia');
const IONE = speaker(P, 'Ione');
const MELAS = speaker(P, 'Melas');
const THERON = speaker(P, 'Theron');
const MYRRINE = speaker(P, 'Myrrine');
const DOROS = speaker(P, 'Doros');

export const SILENT_ORACLE_HEROES: readonly HeroDefinition[] = [
  arcHero(P, 'greek_theron', 'Theron', 'Hierophant of Kalliste', 'oracle', 'The high priest of Kalliste, who sealed the Oracle’s spring so that only his voice would be heard, and promised every city on the coast what it most wanted to hear. Final opponent of The Silent Oracle.', 'enemy'),
  arcHero(P, 'greek_doros', 'Doros', 'Polemarch of the Hushed', 'champion', 'A disgraced general who sold his spear to the Hierophant and holds the labyrinth gate. The Silent Oracle, mission 6.', 'enemy'),
  arcHero(P, 'greek_phaidon', 'Phaidon', 'Warden of the Sacred Way', 'champion', 'Keeper of the road between the altars of dawn and dusk below the Oracle’s spring. Patrol in The Silent Oracle, mission 7.', 'enemy'),
];
const H: Record<string, HeroDefinition> = Object.fromEntries([...SILENT_ORACLE_HEROES, ...GREEK_HEROES].map((h) => [h.id, h]));

/** The polis' own building of a town location's level (its slot chain, level 1 first). */
function greekBuilding(slot: string, level: number): string {
  const id = GREEK_TOWN.slots.find((s) => s.id === slot)?.chain[level - 1];
  if (!id) throw new Error(`The Greek polis has no level ${level} at ${slot}`);
  return id;
}

export function buildSilentOracle(names: ArcCampaignContext['names'], familyOf: ArcCampaignContext['familyOf']): {
  templates: MapTemplateDefinition[];
  missions: MissionDefinition[];
  campaign: CampaignDefinition;
  entitlements: EntitlementDefinition[];
} {
  const ctx: ArcCampaignContext = {
    id: 'silent_oracle',
    pantheonId: P,
    archetypeId: GREEK_TOWN.id,
    hero: { heroId: 'alexios', definitionId: 'alexios', classId: 'strategos', name: 'Alexios' },
    gods: { patron: 'zeus', first: ['athena', 'ares', 'apollo', 'artemis'], second: ['hermes', 'demeter', 'hades', 'poseidon', 'hera'] },
    t: [
      { base: '', up: '' },
      { base: 'hoplite', up: 'veteran_hoplite' },
      { base: 'peltast', up: 'veteran_peltast' },
      { base: 'griffin', up: 'windcrest_griffin' },
      { base: 'cavalry', up: 'companion_cavalry' },
      { base: 'temple_adept', up: 'temple_seer' },
      { base: 'minotaur', up: 'labyrinth_warden' },
      { base: 'cyclops', up: 'stormforged_cyclops' },
    ],
    covenantT3: 'griffin',
    covenantT6: 'minotaur',
    covenantT7: 'cyclops',
    hostName: 'The Hushed',
    hiringReason: 'Alexios rides with his own companions. Hero hiring is disabled in The Silent Oracle.',
    debriefPolicy: [
      'Alexios keeps his level, experience (up to the displayed cap), skills, spellbook, spells and equipment.',
      'Zeus and every god he has committed to carry into the next mission.',
      'Troops, resources, towns, mines and recruitment pools stay behind to hold the road.',
      'The next mission begins with its declared companions and treasury.',
    ],
    seed: 450000,
    names,
    familyOf,
    buildingOf: greekBuilding,
    // Alexios is a strategos (a might hero): the same points and skill ranks as the arc's profiles, in attack and defence.
    heroDefaults: {
      1: { level: 1, xp: 0, attributes: { attack: 2, defense: 2, power: 1, knowledge: 1 }, skills: [{ skillId: 'leadership', rank: 1 }], spellbook: false },
      2: { level: 2, xp: 1100, attributes: { attack: 3, defense: 2, power: 1, knowledge: 1 }, skills: [{ skillId: 'leadership', rank: 1 }, { skillId: 'offense', rank: 1 }], spellbook: false },
      3: { level: 3, xp: 2500, attributes: { attack: 3, defense: 3, power: 1, knowledge: 2 }, skills: [{ skillId: 'leadership', rank: 1 }, { skillId: 'offense', rank: 1 }, { skillId: 'armorer', rank: 1 }], spellbook: false },
      4: { level: 4, xp: 4000, attributes: { attack: 4, defense: 3, power: 2, knowledge: 2 }, skills: [{ skillId: 'leadership', rank: 2 }, { skillId: 'offense', rank: 1 }, { skillId: 'armorer', rank: 1 }], spellbook: false },
      5: { level: 5, xp: 6200, attributes: { attack: 4, defense: 4, power: 2, knowledge: 3 }, skills: [{ skillId: 'leadership', rank: 2 }, { skillId: 'offense', rank: 1 }, { skillId: 'armorer', rank: 1 }, { skillId: 'tactics', rank: 1 }], spellbook: false },
      6: { level: 6, xp: 8500, attributes: { attack: 5, defense: 4, power: 2, knowledge: 3 }, skills: [{ skillId: 'leadership', rank: 2 }, { skillId: 'offense', rank: 2 }, { skillId: 'armorer', rank: 1 }, { skillId: 'tactics', rank: 1 }], spellbook: false },
      7: { level: 7, xp: 11000, attributes: { attack: 5, defense: 5, power: 3, knowledge: 3 }, skills: [{ skillId: 'leadership', rank: 2 }, { skillId: 'offense', rank: 2 }, { skillId: 'armorer', rank: 2 }, { skillId: 'tactics', rank: 1 }], spellbook: false },
    },
  };

  const m1 = restoreMission(ctx, {
    name: 'The Pilgrims’ Road',
    summary: 'Pilgrims come down from Kalliste with empty hands: the Oracle has not spoken since the spring festival, and grey-hooded men have put out the waystone on the pilgrims’ road. Raise and train a road guard in Elaia, open the ford and rekindle the waystone.',
    newDecisions: ['Recruit and train', 'Glory: battle experience', 'A one-time choice'],
    briefing: [
      THALEIA('Three months without a word from Kalliste. The pilgrims come home frightened, and every city on the coast is guessing what the silence means.'),
      ALEXIOS('Guessing is how cities start to fear each other. Where does the road go dark?'),
      IONE('At the waystone above the river. Men in grey hoods put out its flame and turn the pilgrims back. They call themselves the Hushed.'),
    ],
    victory: [IONE('The waystone burns again. But a pilgrim came down tonight with a prophecy — not from the Oracle. From a man who calls himself her Voice.')],
    town: { townId: 'elaia', name: 'Elaia', description: 'An olive town at the foot of the pilgrims’ road.' },
    biome: 'coast',
    soundscape: 'coast',
    barrier: 'water',
    event: {
      name: 'Abandoned Olive Press',
      description: 'An olive press whose owners fled when the Hushed came down the road.',
      title: 'The Olive Press',
      text: 'The jars are full and sealed, ready for market. In the yard, the presser’s four grown sons sit on the wall with their fathers’ old shields across their knees. “Take the oil to market,” one says, “or take us to the road. We are tired of watching it.”',
      options: [
        { label: 'Sell the oil', summary: '+600 Gold and +4 Wood.', reward: { resources: { gold: 600, wood: 4 } } },
        { label: 'Take the sons to the road', summary: '4 Hoplites join Alexios.', reward: { creatures: [{ creatureId: 'hoplite', count: 4 }] } },
      ],
    },
    camp: { name: 'Shepherds’ Fold', description: 'Hill shepherds who throw a javelin as well as they whistle.', creatureId: 'peltast' },
    crossing: {
      name: 'Ford of the Two Plane Trees',
      description: 'The pilgrims’ ford. Wild boars, penned there on purpose, hold it.',
      guard: { label: 'Ford boars', army: [['wild_boar', 8]], reward: { resources: { gold: 300, wood: 3, stone: 3 } }, battlefield: 'coast_road' },
    },
    cache: { name: 'Pilgrims’ Rest', description: 'A shelter where pilgrims leave offerings for the road.', reward: { resources: { gold: 400, crystal: 1 } } },
    monument: {
      name: 'Waystone of Kalliste',
      description: 'The first waystone of the pilgrims’ road, its flame put out. Grey-hooded men stand around it.',
      guard: {
        label: 'The Hushed',
        army: [
          ['brigand', 14],
          ['brigand_cutthroat', 4],
        ],
        reward: { resources: { gold: 500 }, artifactIds: ['boar_crest_helm'] },
        battlefield: 'beacon_clearing',
      },
      confirm: 'Rekindle the Waystone of Kalliste? This completes The Pilgrims’ Road.',
    },
    objectives: { recruit: 'Raise the road guard', train: 'Veterans for the road', crossing: 'Open the ford', guard: 'Drive off the Hushed', activate: 'Rekindle the waystone', event: 'The olive press (optional)' },
    scenes: (ids) => [
      { id: 'm01_ford', trigger: { type: 'site_cleared', siteId: ids.crossing }, lines: [IONE('Those boars were penned on the ford. Someone wanted the road closed, not robbed.'), ALEXIOS('Then someone is afraid of what the pilgrims might hear.')] },
      { id: 'm01_waystone_battle', trigger: { type: 'battle_started', siteId: ids.monument }, lines: [THERON('Turn back, strategos. The Oracle has nothing more to say to soldiers.'), ALEXIOS('Then she can tell me so herself.')] },
      { id: 'm01_hushed', trigger: { type: 'site_cleared', siteId: ids.monument }, lines: [THALEIA('Their leader carried a temple seal — the hierophant’s own, from Kalliste.'), ALEXIOS('The Oracle’s own priests closing the Oracle’s road. I want to know why.')] },
      { id: 'm01_losses', trigger: { type: 'casualties', minLost: 4 }, lines: [THALEIA('Elaia buried four of its sons today, Alexios. Be as careful with these as you were on the coast.'), ALEXIOS('I will.')] },
    ],
    help: [{ id: 'glory', title: 'Glory', text: 'The Greek signature: your heroes gain 25% more experience from battles they win. A careful victory is worth more than a costly one — and Glory makes every one count.' }],
  });

  const m2 = huntMission(ctx, {
    name: 'The Bronze Bull',
    summary: 'A bull of living bronze and its herd of clay men trample the barley of Thymbra and keep the pilgrims from the shrine of the twin springs. Raise peltasts of your own, cross the river, hunt the Bronze Bull and relight the shrine.',
    newDecisions: ['Hunt a wandering band', 'Use a lookout', 'Buy or bargain on the road'],
    briefing: [
      THALEIA('Thymbra’s barley is flattened from the river to the hills. The farmers say a bull did it — a bull that rings like a bell when it runs.'),
      IONE('A bronze bull, then, made by someone’s hands and sent. The shrine of the twin springs is beyond the fields, and it is dark.'),
      ALEXIOS('Javelins, then. Bronze does not like to be hit from a distance.'),
    ],
    victory: [THALEIA('Two lights on the pilgrims’ road. Now word comes from the high country: the griffins of Aetos have left their eyrie, and nobody knows who called them.')],
    town: { townId: 'thymbra', name: 'Thymbra', description: 'A barley town on the river, below the twin springs.' },
    biome: 'temperate',
    soundscape: 'coast',
    barrier: 'water',
    lookout: { name: 'Old Signal Tower', description: 'One of the coast’s old signal towers. From its top, the land beyond the river lies open.' },
    event: {
      name: 'Bronze-smith’s Forge',
      description: 'A bronze-smith who once worked for the temple of Kalliste.',
      title: 'The Bronze-smith',
      text: '“I cast the bull’s hooves,” the old smith says, and will not look up. “The hierophant’s men paid in temple silver. Here — a herald’s ring I made for the Oracle’s messengers. Roads agree with whoever wears it. Or sit, and I will show you where the bull is weakest.”',
      options: [
        { label: 'Buy the herald’s ring', summary: 'Pay 2,000 Gold for the Signet of Hermes.', cost: { gold: 2000 }, reward: { artifactIds: ['signet_of_hermes'] } },
        { label: 'Learn the bull’s weakness', summary: 'Alexios gains +1 Attack.', reward: { attributes: { attack: 1 } } },
      ],
    },
    camp: { name: 'Boundary Grove', description: 'Centaurs who keep the old boundary stones and sell their spears to travellers they trust.', creatureId: 'centaur' },
    bridge: {
      name: 'Stone Bridge',
      description: 'The bridge over the river, held by the Hushed.',
      guard: {
        label: 'Bridge Hushed',
        army: [
          ['brigand', 16],
          ['brigand_cutthroat', 6],
        ],
        reward: { resources: { gold: 600, favor: 3 } },
        battlefield: 'coast_road',
      },
    },
    lair: {
      name: 'The Abandoned Foundry',
      description: 'A foundry in the hills where the bull was cast. Clay men still guard its moulds.',
      guard: {
        label: 'Foundry clay men',
        army: [
          ['bronze_golem', 1],
          ['clay_golem', 5],
        ],
        reward: { resources: { gold: 500 }, artifactIds: ['polished_bronze_shield'] },
        battlefield: 'grove',
      },
    },
    stone: { name: 'Shrine of the Twin Springs', description: 'The pilgrims’ second shrine, where two springs meet under a plane tree.', confirm: 'Relight the Shrine of the Twin Springs? This completes The Bronze Bull.' },
    prey: {
      id: 'greek_bronze_bull',
      name: 'The Bronze Bull',
      portraitAssetId: 'creature.neutral.clay_golem.upgraded.portrait',
      army: [
        ['bronze_golem', 3],
        ['clay_golem', 8],
      ],
      bounty: { gold: 800 },
    },
    objectives: {
      recruit: 'Javelins for Thymbra',
      lookout: 'Climb the signal tower',
      bridge: 'Take the stone bridge',
      prey: 'Hunt the Bronze Bull',
      preyHint: 'The bull and its clay herd roam the fields beyond the river and only charge an army they are sure they can beat. Move onto them to fight.',
      activate: 'Relight the shrine of the twin springs',
      lair: 'The abandoned foundry (optional)',
      event: 'The bronze-smith (optional)',
    },
    scenes: (ids) => [
      { id: 'm02_tower', trigger: { type: 'site_visited', siteId: ids.lookout }, lines: [ALEXIOS('There — the fields are trampled in a ring around the shrine. It is not grazing. It is standing guard.'), IONE('Then the shrine still matters to whoever made it.')] },
      { id: 'm02_bull_battle', trigger: { type: 'battle_started', heroDefinitionId: ids.prey }, lines: [THERON('My bull does not tire, strategos, and it does not fear spears. Go home.')] },
      { id: 'm02_bull_broken', trigger: { type: 'objective_completed', objectiveId: ids.preyObjective }, lines: [THALEIA('The bull is down, and the clay men are falling apart in the furrows.'), ALEXIOS('Leave the bronze for Thymbra’s smiths. They can make ploughs of it.')] },
    ],
  });

  const m3 = covenantMission(ctx, {
    name: 'The Eyrie of Aetos',
    summary: 'The griffins of Aetos have left their eyrie: their covenant was bought by the Hushed. Break the Hushed on the mountain road, free the horse pastures, win the griffin covenant back — by the keeper’s price or by force — and take a god’s favour for the road ahead.',
    newDecisions: ['A covenant: pay or fight', 'Your first minor god', 'Elite troops in the army'],
    briefing: [
      IONE('Griffins keep an oath, not a master. The keeper of Aetos writes to me that the eyrie’s oath was sold — sold, Alexios — for temple silver.'),
      ALEXIOS('Then we buy it back, or we earn it. Which would the griffins respect?'),
      THALEIA('And the horse-breeders of the high pastures have not come down to market. Clay men stand at their gates.'),
    ],
    victory: [IONE('The griffins answer us again, and a god walks with us. From the eyrie I saw the islands — and a hall of echoes where the Oracle’s words were kept.')],
    town: { townId: 'aetos', name: 'Aetos', description: 'A mountain town below the griffins’ eyrie.' },
    biome: 'high_pass',
    soundscape: 'high_pass',
    cache: { name: 'Shepherds’ Storehouse', description: 'Cheese, silver and a votive amulet left by shepherds who turned back.', reward: { resources: { gold: 700, wood: 5 }, artifactIds: ['clay_votive_amulet'] } },
    pass: {
      name: 'Mountain Road',
      description: 'The only road up the mountain, held by the Hushed.',
      guard: {
        label: 'Road Hushed',
        army: [
          ['brigand', 16],
          ['brigand_cutthroat', 6],
        ],
        reward: { resources: { gold: 750, favor: 5 } },
        battlefield: 'ridge_pass',
      },
    },
    roost: {
      name: 'High Horse Pastures',
      description: 'The pastures where Aetos breeds its cavalry horses. Clay men stand at the gates like jailers.',
      guard: { label: 'Pasture clay men', army: [['clay_golem', 5]], reward: { resources: { favor: 5 }, artifactIds: ['bronze_buckler'] }, battlefield: 'ridge_pass' },
    },
    hearth: {
      name: 'The Keeper’s House',
      description: 'The old keeper of the eyrie sits at her door, feeding a griffin chick.',
      title: 'The Keeper of Aetos',
      text: '“Our oath was bought,” the keeper says, “by a priest with a sealed mouth painted on his mask. Bought, not won — so it can be bought back. Pay what he paid, and the eyrie is yours. Or climb to the high nests and take it from the griffins who took his silver. They will respect you more for it.”',
      price: { gold: 1500, wood: 10 },
      payLabel: 'Pay the keeper’s price',
      refuseLabel: 'Refuse — win it at the high nests',
    },
    home: {
      name: 'The High Nests',
      description: 'The griffins’ nests on the crags, where the bought covenant is kept.',
      guard: {
        label: 'Eyrie griffins',
        army: [
          ['griffin', 4],
          ['windcrest_griffin', 1],
        ],
        reward: { resources: { gold: 1000 } },
        battlefield: 'plateau',
      },
    },
    bridge: {
      name: 'Gorge Bridge',
      description: 'A rope-and-timber bridge over the gorge, held by the Hushed and their boars.',
      guard: {
        label: 'Gorge Hushed',
        army: [
          ['brigand_cutthroat', 12],
          ['tusked_boar', 4],
        ],
        reward: { resources: { gold: 800 } },
        battlefield: 'ridge_pass',
      },
    },
    stone: { name: 'Altar of the Winds', description: 'The pilgrims’ mountain altar, where the wind carries prayers to Kalliste.', confirm: 'Relight the Altar of the Winds? This completes The Eyrie of Aetos.' },
    band: { id: 'greek_hill_boars', name: 'Hill Boars', army: [['wild_boar', 6]] },
    objectives: {
      pass: 'Take the mountain road',
      roost: 'Free the horse pastures',
      covenant: 'The griffin covenant',
      covenantDescription: 'Win the griffin covenant back: pay the keeper’s price at her house, or beat the griffins at the high nests.',
      god: 'A god for the road',
      elite: 'Companion Cavalry in the army',
      activate: 'Relight the altar of the winds',
      cache: 'The shepherds’ storehouse (optional)',
    },
    scenes: (ids) => [
      { id: 'm03_pastures', trigger: { type: 'site_cleared', siteId: ids.roost }, lines: [THALEIA('The breeders are out of their houses for the first time in a month. They say the best horses are yours, if you can feed them.'), ALEXIOS('Tell them Aetos will.')] },
      { id: 'm03_nests', trigger: { type: 'site_cleared', siteId: ids.home }, lines: [IONE('The covenant tablet was wedged in the nest — sealed with wax and a mouth painted shut.'), ALEXIOS('The hierophant’s mark again. Whoever he is, he wants the whole coast quiet.')] },
      { id: 'm03_god', trigger: { type: 'objective_completed', objectiveId: ids.god }, lines: [IONE('A god walks with us. Whatever Kalliste has become, we will not climb to it alone.')] },
    ],
  });

  const m4 = seekMission(ctx, {
    name: 'The Hall of Echoes',
    summary: 'On an island off Halia stands the Hall of Echoes, where every word the Oracle ever spoke is kept. Raise temple adepts, take the landing, light both fire-bowls to lower the sea chain and hear what the Oracle last said.',
    newDecisions: ['Light two fires to open a way', 'A commanded patrol', 'Temple adepts'],
    briefing: [
      IONE('The Hall of Echoes keeps every word the Oracle has spoken. If she said anything before she fell silent, it is there.'),
      THALEIA('A bronze chain closes the strait to the island. It is lowered only when both fire-bowls burn, one on each headland.'),
      ALEXIOS('And Melas’s old Scout Captain sails between them now, for whoever pays best. We met him on the plateau. He is careful, and he is good.'),
    ],
    victory: [IONE('Her last words, Alexios: “Hold the spring. The Voice is not mine.” Theron sealed her spring and speaks in her name — and Melas has sworn to his false Voice.')],
    town: { townId: 'halia', name: 'Halia', description: 'A salt-makers’ harbour facing the islands.' },
    biome: 'coast',
    soundscape: 'coast',
    wanderer: {
      name: 'A Blind Singer',
      description: 'A blind singer on the shore, tuning a lyre with salt-stiff strings.',
      title: 'The Blind Singer',
      text: 'He stops singing when you come near. “You are going to the echoes,” he says. “Listen twice — the first time you hear what you hoped for.” He holds out a horse’s bronze breastplate. “A rider left it in payment for a song. Or sit, and I will teach you the old marching song of the coast.”',
      options: [
        { label: 'Take the breastplate', summary: 'The Barding of the Hippeis joins Alexios’s pack.', reward: { artifactIds: ['hippeis_barding'] } },
        { label: 'Learn the marching song', summary: 'Alexios gains +1 Attack and +1 Defense.', reward: { attributes: { attack: 1, defense: 1 } } },
      ],
    },
    wreck: { name: 'Beached Grain Ship', description: 'A grain ship driven ashore by the raiders; its strongbox is dry.', reward: { resources: { gold: 900, wood: 4 } } },
    landing: {
      name: 'Island Landing',
      description: 'The landing on the near island, held by sea raiders in the Hushed’s pay.',
      guard: {
        label: 'Sea raiders',
        army: [
          ['brigand', 36],
          ['brigand_cutthroat', 14],
        ],
        reward: { resources: { gold: 800, favor: 3 } },
        battlefield: 'coast_road',
      },
    },
    omen: {
      name: 'The Silent Ship',
      description: 'A temple ship of Kalliste, aground and empty.',
      title: 'The Silent Ship',
      text: 'Every bell on the ship has had its tongue cut out. In the captain’s cabin: a chest of temple silver, and a rack of new javelins with the Oracle’s spring painted on the shafts.',
      options: [
        { label: 'Take the silver', summary: '+800 Gold and +2 Crystal.', reward: { resources: { gold: 800, crystal: 2 } } },
        { label: 'Arm the harbour’s javelin men', summary: '6 Veteran Peltasts join Alexios.', reward: { creatures: [{ creatureId: 'veteran_peltast', count: 6 }] } },
      ],
    },
    relays: { north: { name: 'North Fire-Bowl', description: 'A great bronze fire-bowl on the northern headland.' }, south: { name: 'South Fire-Bowl', description: 'A great bronze fire-bowl on the southern headland.' }, cost: { gold: 250, stone: 3 } },
    nest: { name: 'Sea-cave of the Ogres', description: 'Two ogres sleep in a sea cave full of stolen nets.', guard: { label: 'Sea-cave ogres', army: [['ogre', 2]], reward: { resources: { crystal: 5 } }, battlefield: 'grove' } },
    gate: { name: 'The Sea Chain', description: 'A bronze chain across the strait. It is lowered only when both fire-bowls burn.' },
    goal: {
      name: 'Hall of Echoes',
      description: 'A hall of polished bronze and marble on the far island. The hierophant’s adepts guard its doors.',
      guard: {
        label: 'Hierophant’s adepts',
        army: [
          ['temple_adept', 4],
          ['temple_seer', 2],
        ],
        reward: { resources: { gold: 1000 } },
        battlefield: 'coast_road',
      },
      reward: { questXp: 2200, artifactIds: ['harpe_of_perseus'] },
      confirm: 'Listen to the echoes? This completes The Hall of Echoes.',
    },
    patrol: {
      commander: arcCommander(H['scout_captain']!, 'patrol4'),
      army: [
        ['veteran_hoplite', 16],
        ['veteran_peltast', 6],
      ],
    },
    objectives: { recruit: 'Temple adepts of our own', landing: 'Take the island landing', north: 'The north fire-bowl', south: 'The south fire-bowl', gate: 'Lower the sea chain', goal: 'Listen to the echoes', nest: 'The ogres’ sea-cave (optional)', wanderer: 'The blind singer (optional)' },
    scenes: (ids) => [
      { id: 'm04_landing', trigger: { type: 'site_cleared', siteId: ids.landing }, lines: [THALEIA('Their sails carry no city’s sign at all — only a mouth painted shut.'), ALEXIOS('Then the Scout Captain is close. Keep the army together.')] },
      { id: 'm04_chain', trigger: { type: 'objective_completed', objectiveId: ids.gate }, lines: [IONE('Listen — the chain is going down, link by link. The strait is open.')] },
      { id: 'm04_echoes', trigger: { type: 'battle_started', siteId: ids.goal }, lines: [THERON('The echoes are mine now, strategos, like every other word on this coast.')] },
    ],
  });

  const m5 = rivalMission(ctx, {
    name: 'The Return of Melas',
    summary: 'Melas, beaten on the storm plateau, holds the walled city of Pyrgos and has made the coast’s cities swear to the hierophant’s false Voice on an oath stele. Cross the river, take a second god, besiege his city and break the stele.',
    newDecisions: ['A rival empire', 'A second minor god', 'A siege'],
    briefing: [
      THALEIA('Melas has a city now — Pyrgos, on the far side of the river — and a stele in its square where four cities have sworn to obey the Voice of Kalliste.'),
      IONE('An oath sworn on a lie still binds the ones who swore it. Break the stele, and the oath breaks with it.'),
      MELAS('You took my lens, strategos. Now I have a god’s own voice behind me. Come and take that.'),
    ],
    victory: [ALEXIOS('The stele is broken and the cities that swore on it are free. Melas has nothing left but Theron’s promises.')],
    town: { townId: 'akte', name: 'Akte', description: 'A river town on the road north, loyal to the old oaths.' },
    biome: 'temperate',
    soundscape: 'coast',
    gold: { name: 'Gold Mine', description: 'An unowned mine.', guard: { label: 'Mine boars', army: [['tusked_boar', 10]], reward: { resources: { gold: 500 } }, battlefield: 'open_field' } },
    event: {
      name: 'Healing Spring',
      description: 'A warm spring with a small shrine of the healer above it.',
      title: 'The Healing Spring',
      text: 'A goat drinks from the spring and watches you over the steam. On the shrine shelf lie a purse of offerings — and a clay cup, for whoever will drink from the spring instead.',
      options: [
        { label: 'Take the offerings', summary: '+1,500 Gold.', reward: { resources: { gold: 1500 } } },
        { label: 'Drink from the spring', summary: 'Alexios gains +1 Attack and +1 Defense.', reward: { attributes: { attack: 1, defense: 1 } } },
      ],
    },
    north: { name: 'Clay Ford', description: 'The northern ford, held by clay men on Melas’s orders.', guard: { label: 'Ford clay men', army: [['clay_golem', 8]], reward: { resources: { gold: 800 } }, battlefield: 'coast_road' } },
    south: {
      name: 'Hushed Ford',
      description: 'The southern ford, held by the Hushed.',
      guard: {
        label: 'Ford Hushed',
        army: [
          ['brigand', 24],
          ['brigand_cutthroat', 10],
        ],
        reward: { resources: { gold: 800 } },
        battlefield: 'coast_road',
      },
    },
    stele: { name: 'Oath Stele of Pyrgos', description: 'The stele on which four cities swore to obey the Voice of Kalliste.', confirm: 'Break the Oath Stele of Pyrgos? This completes The Return of Melas.' },
    rival: {
      playerId: 'pyrgos',
      townId: 'pyrgos',
      townName: 'Pyrgos',
      townDescription: 'Melas’s walled hill-city, hung with storm-grey banners.',
      color: '#5d6470',
      hero: { heroId: 'melas', definitionId: 'melas', classId: 'champion', name: 'Melas' },
      army: [
        ['veteran_hoplite', 26],
        ['veteran_peltast', 10],
        ['cavalry', 3],
      ],
      garrison: [
        ['veteran_hoplite', 24],
        ['veteran_peltast', 8],
        ['cavalry', 2],
      ],
      reward: { artifactIds: ['lamp_of_prometheus'] },
    },
    objectives: { crossing: 'Cross the river', god: 'A second god', town: 'Take Pyrgos', stele: 'Break the oath stele', rival: 'Defeat Melas (optional)', event: 'The healing spring (optional)' },
    scenes: (ids) => [
      { id: 'm05_crossed', trigger: { type: 'objective_completed', objectiveId: ids.crossing }, lines: [THALEIA('We are over. His riders will be in Pyrgos by nightfall.'), ALEXIOS('Good. I want him to know who is coming.')] },
      { id: 'm05_melas', trigger: { type: 'battle_started', heroDefinitionId: ids.rival }, lines: [MELAS('One light, one voice, one coast. I was right on the plateau, and I am right now.'), ALEXIOS('You were wrong then too, Melas.')] },
      { id: 'm05_taken', trigger: { type: 'objective_completed', objectiveId: ids.town }, lines: [ALEXIOS('Pyrgos is ours. Now the stele.')] },
    ],
  });

  const m6 = refugeMission(ctx, {
    name: 'The Labyrinth of Kerata',
    summary: 'The minotaurs of Kerata, who guard the lower road to Kalliste, are penned in their own labyrinth by the Hushed. Break their jailers, accept the minotaurs’ covenant, raise minotaurs of your own and defeat the polemarch Doros at the labyrinth gate.',
    newDecisions: ['Claim a covenant from the journal', 'Minotaurs in the army', 'A gate general'],
    briefing: [
      IONE('The minotaurs of Kerata have guarded the lower road to Kalliste since before there was a temple. The Hushed have penned them in their own labyrinth.'),
      ALEXIOS('Free them, and the road to the mountain opens. Who holds the gate?'),
      THALEIA('Doros. A polemarch who lost his command for selling his soldiers’ grain. Now he sells his spear to Theron.'),
    ],
    victory: [IONE('The minotaurs walk their road again. From the labyrinth’s top I could see Kalliste — the sacred way, the two altars, and the spring under the temple, sealed.')],
    town: { townId: 'kerata', name: 'Kerata', description: 'A high town at the mouth of the labyrinth valley.' },
    biome: 'high_pass',
    soundscape: 'high_pass',
    north: {
      name: 'Clay Stair',
      description: 'The northern stair to the labyrinth, held by clay men.',
      guard: {
        label: 'Stair clay men',
        army: [
          ['clay_golem', 8],
          ['bronze_golem', 2],
        ],
        reward: { resources: { gold: 1000 } },
        battlefield: 'ridge_pass',
      },
    },
    south: {
      name: 'Hushed Stair',
      description: 'The southern stair, held by the Hushed and their boars.',
      guard: {
        label: 'Stair Hushed',
        army: [
          ['brigand_cutthroat', 24],
          ['tusked_boar', 6],
        ],
        reward: { resources: { gold: 1000 } },
        battlefield: 'ridge_pass',
      },
    },
    event: {
      name: 'A Minotaur Calf',
      description: 'A minotaur calf caught in a hunter’s net.',
      title: 'The Minotaur Calf',
      text: 'The calf’s horns are only nubs, but it already glares like its mother. Cut free, it will remember you. Or the hunter will sell you the old bronze horn-tip he found in the net — it hums when you hold it to your ear.',
      options: [
        { label: 'Cut the calf free', summary: '+2 Crystal and +10 Favor.', reward: { resources: { crystal: 2, favor: 10 } } },
        { label: 'Listen to the horn-tip', summary: 'Alexios gains 1,000 experience.', reward: { questXp: 1000 } },
      ],
    },
    refuge: {
      name: 'The Labyrinth Pens',
      description: 'The heart of the labyrinth, where the minotaurs are penned by the Hushed.',
      guard: {
        label: 'Labyrinth jailers',
        army: [
          ['veteran_hoplite', 30],
          ['bronze_golem', 3],
          ['temple_seer', 2],
        ],
        reward: { resources: { gold: 1500 } },
        battlefield: 'grove',
      },
    },
    nest: { name: 'Ogre Shelter', description: 'Two ogre chieftains in a shelter of stolen shields.', guard: { label: 'Ogre chieftains', army: [['ogre_chieftain', 2]], reward: { resources: { crystal: 6 } }, battlefield: 'grove' } },
    gate: {
      name: 'Labyrinth Gate',
      description: 'The gate to the lower road to Kalliste, held by the polemarch Doros.',
      guard: {
        label: 'Doros and the gate guard',
        army: [
          ['veteran_hoplite', 30],
          ['veteran_peltast', 10],
          ['windcrest_griffin', 4],
          ['companion_cavalry', 3],
        ],
        commander: arcCommander(H['greek_doros']!, 'gate6'),
        reward: { resources: { gold: 1500 }, artifactIds: ['cap_of_darkness'] },
        battlefield: 'ridge_pass',
      },
    },
    horn: { name: 'Bull-Horn of Kerata', description: 'The great bronze horn the minotaurs sound when the road is open.', confirm: 'Sound the Bull-Horn of Kerata? This completes The Labyrinth of Kerata.' },
    band: { id: 'greek_bronze_sentinels', name: 'Bronze Sentinels', army: [['bronze_golem', 6]] },
    objectives: {
      approach: 'Climb to the labyrinth',
      refuge: 'Break the labyrinth jailers',
      claim: 'Accept the minotaur covenant',
      claimDescription: 'Accept the minotaurs’ covenant in the journal. It can then be assigned to Kerata.',
      elite: 'Minotaurs in the army',
      gate: 'Doros at the gate',
      horn: 'Sound the bull-horn',
      event: 'The minotaur calf (optional)',
    },
    scenes: (ids) => [
      { id: 'm06_freed', trigger: { type: 'site_cleared', siteId: ids.refuge }, lines: [IONE('The pens are open. The minotaurs will not follow us for being freed — they follow a covenant, or nothing.'), ALEXIOS('Then we offer them one.')] },
      { id: 'm06_doros', trigger: { type: 'battle_started', siteId: ids.gate }, lines: [DOROS('The Hierophant pays better than any city ever paid me, strategos. Turn back while you still have an army to pay.'), ALEXIOS('Mine are not for sale, Doros.')] },
      { id: 'm06_gate', trigger: { type: 'objective_completed', objectiveId: ids.gateObjective }, lines: [THALEIA('Doros is beaten and his mercenaries are scattering. The lower road is ours.'), IONE('And above it, Kalliste.')] },
    ],
  });

  const m7 = finaleMission(ctx, {
    name: 'The Spring of Kalliste',
    summary: 'Theron the Hierophant holds the temple of Kalliste and the sealed spring beneath it. Cross the hills, kindle the altars of dawn and dusk, open the sacred way, defeat Theron and decide whether the Oracle speaks again.',
    newDecisions: ['Two altars, one gate', 'The Hierophant', 'The last choice'],
    briefing: [
      IONE('The sacred way climbs between two altars, dawn and dusk. Kindle both and the great gate of the temple opens.'),
      THALEIA('Phaidon, the warden of the way, walks between the altars with the temple guard. And Theron waits in the inner hall, over the spring.'),
      THERON('Come up, strategos. The Oracle has been silent a long time. Let her hear what a soldier sounds like when he loses.'),
    ],
    victory: [ALEXIOS('The spring runs again. Whatever she says next, she will say it herself.')],
    town: { townId: 'kalliste', name: 'Kalliste', description: 'The pilgrims’ town at the foot of the Oracle’s mountain.' },
    biome: 'storm_plateau',
    soundscape: 'storm_plateau',
    north: {
      name: 'Northern Way',
      description: 'The northern path up into the temple hills.',
      guard: {
        label: 'Temple guard',
        army: [
          ['veteran_hoplite', 30],
          ['veteran_peltast', 6],
        ],
        reward: { resources: { gold: 1000 } },
        battlefield: 'ridge_pass',
      },
    },
    south: {
      name: 'Southern Way',
      description: 'The southern path, where two captive minotaurs are made to stand guard.',
      guard: {
        label: 'Captive minotaurs',
        army: [
          ['minotaur', 2],
          ['veteran_hoplite', 12],
        ],
        reward: { resources: { gold: 1000 } },
        battlefield: 'ridge_pass',
      },
    },
    stones: { north: { name: 'Altar of Dawn', description: 'The altar of the morning, where the first light is offered.' }, south: { name: 'Altar of Dusk', description: 'The altar of the evening, where the last light is offered.' }, cost: { gold: 300, stone: 3 } },
    nest: { name: 'Wyvern Crags', description: 'Wyverns roost above the sacred way.', guard: { label: 'Crag wyverns', army: [['wyvern_matriarch', 3]], reward: { resources: { crystal: 6 } }, battlefield: 'grove' } },
    gate: { name: 'Great Gate of Kalliste', description: 'The bronze gate of the temple precinct. Both altars must burn to open it.' },
    cache: { name: 'Votive Treasury', description: 'A treasury filled by generations of pilgrims.', reward: { resources: { gold: 1500, crystal: 3 } } },
    hall: {
      name: 'The Inner Hall',
      description: 'The temple’s inner hall, built over the Oracle’s spring and sealed with bronze.',
      guard: {
        label: 'Theron and the temple host',
        army: [
          ['windcrest_griffin', 2],
          ['veteran_hoplite', 20],
          ['veteran_hoplite', 20],
          ['veteran_peltast', 12],
          ['labyrinth_warden', 2],
          ['temple_seer', 2],
        ],
        commander: arcCommander(H['greek_theron']!, 'boss7', ['apollos_arrow']),
        reward: { resources: { gold: 2000 } },
        battlefield: 'beacon_clearing',
      },
    },
    choice: {
      name: 'The Oracle’s Spring',
      description: 'The sealed spring beneath the temple, where the Oracle Myrrine waits.',
      title: 'The Oracle’s Spring',
      text: 'Under the bronze seal the spring still runs, and Myrrine, the Oracle, sits beside it — thin, silent, unafraid. “Unseal it, and I will speak again,” she says, “and the cities will come up the road to ask what to do, as they always have. Or leave it sealed, and let them decide for themselves. I have heard enough of what people do with a voice they did not earn.”',
      a: { flag: 'oracle_speaks', label: 'Unseal the spring', summary: 'The Oracle speaks again, as she always has. Alexios gains 500 experience.' },
      b: { flag: 'cities_decide', label: 'Leave the spring sealed', summary: 'The cities choose their own way without prophecy. Alexios gains 500 experience.' },
    },
    seal: { name: 'First Offering', description: 'The bowl at the top of the sacred way, where every pilgrimage ends.', confirm: 'Pour the first offering at Kalliste? This completes The Silent Oracle.' },
    patrol: {
      commander: arcCommander(H['greek_phaidon']!, 'patrol7'),
      army: [
        ['veteran_hoplite', 24],
        ['veteran_peltast', 8],
        ['windcrest_griffin', 2],
      ],
    },
    objectives: { approach: 'Into the temple hills', north: 'Kindle the altar of dawn', south: 'Kindle the altar of dusk', gate: 'Open the great gate', boss: 'The Hierophant', choice: 'The Oracle’s spring', seal: 'Pour the first offering' },
    scenes: (ids) => [
      { id: 'm07_gate', trigger: { type: 'objective_completed', objectiveId: ids.gate }, lines: [IONE('The great gate is open. My mother climbed this way every spring, and I never did.'), ALEXIOS('Then climb it now.')] },
      { id: 'm07_theron', trigger: { type: 'battle_started', siteId: ids.hall }, lines: [THERON('The cities did not want the truth, strategos. They wanted to be told. I told them.'), ALEXIOS('Then let them hear the truth for once.')] },
      { id: 'm07_fallen', trigger: { type: 'objective_completed', objectiveId: ids.boss }, lines: [MYRRINE('So the Voice is quiet at last. Come down to the spring, strategos. There is one more thing to decide, and it is not mine to decide alone.')] },
    ],
  });

  const built = [m1, m2, m3, m4, m5, m6, m7];
  const missions = built.map((b) => b.mission);
  return {
    templates: built.map((b) => b.template),
    missions,
    entitlements: arcEntitlements(ctx, { t3: 'Griffin Covenant of Aetos', t6: 'Minotaur Covenant of Kerata' }, { t3: 'The griffins of Aetos allow a Griffin Aerie to be built in one town.', t6: 'The freed minotaurs of Kerata allow a Labyrinth to be built in one town.' }),
    campaign: arcCampaign(
      ctx,
      {
        name: 'The Silent Oracle',
        tagline: 'Listen. Climb. Answer.',
        summary: 'A year after the beacons were relit, the Oracle of Kalliste has fallen silent, and a hierophant who calls himself her Voice is turning the cities of the coast against one another. Lead Alexios through seven linked missions — from the pilgrims’ road to the sealed spring under the mountain — to give the Oracle back her voice. Play The Three Beacons first: it teaches the game.',
        startingGodNote: 'Zeus is the fixed patron of this campaign. Athena, Ares, Apollo or Artemis comes in Mission 3; a second god (Hermes, Demeter, Hades, Poseidon or Hera) in Mission 5.',
        epilogue: [
          THALEIA('The pilgrims are on the road again, Alexios — all the way from Elaia to the mountain. I counted them going up, and I will count them coming down.'),
          IONE('A bronze bull, a sold oath, a hall of echoes, a city of oaths and a labyrinth. The griffins will be telling it for a generation.'),
        ],
        endings: [
          { flag: 'oracle_speaks', lines: [MYRRINE('The spring runs and I speak again — only what I hear, and nothing I am paid to say.'), ALEXIOS('That is all anyone ever needed from you.')] },
          { flag: 'cities_decide', lines: [MYRRINE('The spring stays quiet. The cities will have to talk to each other now, instead of to me.'), THALEIA('They are already arguing in Asterion’s council. It is the best sound I have heard all year.')] },
        ],
      },
      missions,
    ),
  };
}
