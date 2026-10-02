/**
 * The Winter Oath — the Norse campaign (seven missions) as data.
 *
 * Owner decision 2026-10-01: build the Norse campaign "The Winter Oath" with
 * seven missions, played in order (each step opens after the previous one, and
 * work done early still counts). Everything here is PROPOSED and unplaytested:
 * maps, guard armies, wallets, costs, rewards and text are first values for the
 * owner to review (CAMPAIGN_2_NORSE_OUTLINE.md). The story is original fiction in
 * a Norse-inspired setting, not a retelling of any saga.
 *
 * Unlike The Three Beacons this campaign uses the Norse signature (Berserk Fury)
 * and the expanded content (pantheon spells and skills, artifact sets, the
 * arcana artifacts); weekly events and divine interventions stay off.
 */
import type {
  CampaignDefinition,
  EntitlementDefinition,
  MapTemplateDefinition,
  MissionDefinition,
  MissionHeroSetup,
  ObjectiveDefinition,
  SiteDefinition,
} from '@pr/rules';

// ---------------------------------------------------------------------------
// Map templates
// ---------------------------------------------------------------------------

const a = (id: string, q: number, r: number) => ({ id, coord: { q, r } });

export const WINTER_OATH_TEMPLATES: readonly MapTemplateDefinition[] = [
  {
    id: 'winter_oath_m01_v1',
    version: 1,
    width: 20,
    height: 14,
    goldenSeed: 270101,
    barriers: [{ q: 10, terrain: 'water', openings: [{ q: 10, r: 8 }] }],
    anchors: [
      a('m01_town', 3, 7),
      a('m01_sawmill', 4, 3),
      a('m01_quarry', 5, 11),
      a('m01_longship', 7, 5),
      a('m01_wolf_camp', 8, 2),
      a('m01_ford', 10, 8),
      a('m01_cairn', 14, 11),
      a('m01_rune_stone', 16, 7),
    ],
    roadEdges: [
      ['m01_town', 'm01_ford'],
      ['m01_ford', 'm01_rune_stone'],
      ['m01_town', 'm01_sawmill'],
      ['m01_town', 'm01_quarry'],
      ['m01_town', 'm01_longship'],
      ['m01_sawmill', 'm01_wolf_camp'],
      ['m01_rune_stone', 'm01_cairn'],
    ],
    biome: 'fjord',
  },
  {
    id: 'winter_oath_m02_v1',
    version: 1,
    width: 24,
    height: 16,
    goldenSeed: 270202,
    barriers: [{ q: 12, terrain: 'water', openings: [{ q: 12, r: 8 }] }],
    anchors: [
      a('m02_town', 3, 8),
      a('m02_sawmill', 4, 4),
      a('m02_quarry', 5, 12),
      a('m02_watch_hill', 8, 5),
      a('m02_lodge', 9, 2),
      a('m02_wolf_camp', 8, 12),
      a('m02_bridge', 12, 8),
      a('m02_lair', 17, 3),
      a('m02_crystal', 16, 13),
      a('m02_rune_stone', 21, 8),
    ],
    roadEdges: [
      ['m02_town', 'm02_bridge'],
      ['m02_bridge', 'm02_rune_stone'],
      ['m02_town', 'm02_sawmill'],
      ['m02_town', 'm02_quarry'],
      ['m02_town', 'm02_watch_hill'],
      ['m02_watch_hill', 'm02_lodge'],
      ['m02_quarry', 'm02_wolf_camp'],
      ['m02_bridge', 'm02_lair'],
      ['m02_rune_stone', 'm02_crystal'],
    ],
    // The White Pack's hunting ground east of the river.
    patrolLoop: [
      { q: 16, r: 7 },
      { q: 18, r: 8 },
      { q: 17, r: 10 },
      { q: 15, r: 9 },
    ],
    biome: 'tundra',
  },
  {
    id: 'winter_oath_m03_v1',
    version: 1,
    width: 26,
    height: 18,
    goldenSeed: 270303,
    barriers: [
      { q: 13, terrain: 'mountain', openings: [{ q: 13, r: 9 }] },
      { q: 20, terrain: 'water', openings: [{ q: 20, r: 9 }] },
    ],
    anchors: [
      a('m03_town', 3, 9),
      a('m03_sawmill', 5, 5),
      a('m03_quarry', 5, 13),
      a('m03_cache', 8, 15),
      a('m03_pass', 13, 9),
      a('m03_aerie', 17, 4),
      a('m03_crystal', 16, 9),
      a('m03_hearth', 15, 13),
      a('m03_troll_home', 17, 15),
      a('m03_bridge', 20, 9),
      a('m03_rune_stone', 23, 9),
    ],
    roadEdges: [
      ['m03_town', 'm03_pass'],
      ['m03_pass', 'm03_crystal'],
      ['m03_crystal', 'm03_bridge'],
      ['m03_bridge', 'm03_rune_stone'],
      ['m03_pass', 'm03_aerie'],
      ['m03_pass', 'm03_hearth'],
      ['m03_hearth', 'm03_troll_home'],
      ['m03_town', 'm03_sawmill'],
      ['m03_town', 'm03_quarry'],
      ['m03_quarry', 'm03_cache'],
    ],
    biome: 'tundra',
  },
  {
    id: 'winter_oath_m04_v1',
    version: 1,
    width: 28,
    height: 18,
    goldenSeed: 270404,
    barriers: [
      { q: 11, terrain: 'water', openings: [{ q: 11, r: 9 }] },
      { q: 19, terrain: 'water', openings: [{ q: 19, r: 9 }] },
    ],
    anchors: [
      a('m04_town', 3, 9),
      a('m04_sawmill', 5, 5),
      a('m04_quarry', 5, 13),
      a('m04_wanderer', 7, 3),
      a('m04_knarr', 8, 15),
      a('m04_landing', 11, 9),
      a('m04_nail_ship', 14, 9),
      a('m04_cairn_north', 15, 4),
      a('m04_cairn_south', 15, 14),
      a('m04_nest', 17, 16),
      a('m04_fog_gate', 19, 9),
      a('m04_well', 24, 9),
    ],
    roadEdges: [
      ['m04_town', 'm04_landing'],
      ['m04_landing', 'm04_nail_ship'],
      ['m04_landing', 'm04_cairn_north'],
      ['m04_landing', 'm04_cairn_south'],
      ['m04_cairn_north', 'm04_fog_gate'],
      ['m04_cairn_south', 'm04_fog_gate'],
      ['m04_fog_gate', 'm04_well'],
      ['m04_cairn_south', 'm04_nest'],
      ['m04_town', 'm04_sawmill'],
      ['m04_town', 'm04_quarry'],
      ['m04_town', 'm04_wanderer'],
      ['m04_quarry', 'm04_knarr'],
    ],
    patrolLoop: [
      { q: 13, r: 6 },
      { q: 17, r: 8 },
      { q: 13, r: 12 },
      { q: 16, r: 10 },
    ],
    biome: 'fjord',
  },
  {
    id: 'winter_oath_m05_v1',
    version: 1,
    width: 30,
    height: 20,
    goldenSeed: 270505,
    barriers: [{ q: 15, terrain: 'water', openings: [{ q: 15, r: 6 }, { q: 15, r: 13 }] }],
    anchors: [
      a('m05_town', 3, 10),
      a('m05_sawmill', 5, 6),
      a('m05_quarry', 5, 14),
      a('m05_gold', 8, 16),
      a('m05_andvari', 9, 3),
      a('m05_north_ford', 15, 6),
      a('m05_south_ford', 15, 13),
      a('m05_crystal', 20, 10),
      a('m05_rival_quarry', 24, 5),
      a('m05_oath_stone', 26, 7),
      a('m05_rival_town', 26, 10),
      a('m05_rival_sawmill', 24, 15),
    ],
    roadEdges: [
      ['m05_town', 'm05_north_ford'],
      ['m05_town', 'm05_south_ford'],
      ['m05_north_ford', 'm05_rival_town'],
      ['m05_south_ford', 'm05_rival_town'],
      ['m05_rival_town', 'm05_oath_stone'],
      ['m05_rival_town', 'm05_rival_quarry'],
      ['m05_rival_town', 'm05_rival_sawmill'],
      ['m05_north_ford', 'm05_crystal'],
      ['m05_town', 'm05_sawmill'],
      ['m05_town', 'm05_quarry'],
      ['m05_quarry', 'm05_gold'],
      ['m05_sawmill', 'm05_andvari'],
    ],
    biome: 'tundra',
  },
  {
    id: 'winter_oath_m06_v1',
    version: 1,
    width: 30,
    height: 20,
    goldenSeed: 270606,
    barriers: [
      { q: 11, terrain: 'mountain', openings: [{ q: 11, r: 6 }, { q: 11, r: 13 }] },
      { q: 22, terrain: 'mountain', openings: [{ q: 22, r: 10 }] },
    ],
    anchors: [
      a('m06_town', 3, 10),
      a('m06_sawmill', 5, 6),
      a('m06_quarry', 5, 14),
      a('m06_gold', 7, 16),
      a('m06_north_crossing', 11, 6),
      a('m06_south_crossing', 11, 13),
      a('m06_frozen_child', 15, 3),
      a('m06_refuge', 16, 10),
      a('m06_nest', 17, 17),
      a('m06_glacier_gate', 22, 10),
      a('m06_horn', 26, 10),
    ],
    roadEdges: [
      ['m06_town', 'm06_north_crossing'],
      ['m06_town', 'm06_south_crossing'],
      ['m06_north_crossing', 'm06_refuge'],
      ['m06_south_crossing', 'm06_refuge'],
      ['m06_refuge', 'm06_glacier_gate'],
      ['m06_glacier_gate', 'm06_horn'],
      ['m06_north_crossing', 'm06_frozen_child'],
      ['m06_south_crossing', 'm06_nest'],
      ['m06_town', 'm06_sawmill'],
      ['m06_town', 'm06_quarry'],
      ['m06_quarry', 'm06_gold'],
    ],
    biome: 'tundra',
  },
  {
    id: 'winter_oath_m07_v1',
    version: 1,
    width: 32,
    height: 20,
    goldenSeed: 270707,
    barriers: [
      { q: 10, terrain: 'mountain', openings: [{ q: 10, r: 6 }, { q: 10, r: 13 }] },
      { q: 22, terrain: 'mountain', openings: [{ q: 22, r: 10 }] },
      { q: 27, terrain: 'mountain', openings: [{ q: 27, r: 10 }] },
    ],
    anchors: [
      a('m07_town', 3, 10),
      a('m07_sawmill', 5, 6),
      a('m07_quarry', 5, 14),
      a('m07_north_crossing', 10, 6),
      a('m07_south_crossing', 10, 13),
      a('m07_stone_north', 15, 4),
      a('m07_stone_south', 15, 15),
      a('m07_nest', 18, 17),
      a('m07_barrow_gate', 22, 10),
      a('m07_cairn', 25, 6),
      a('m07_jarl_hall', 27, 10),
      a('m07_barrow_door', 29, 8),
      a('m07_oath_mound', 29, 12),
    ],
    roadEdges: [
      ['m07_town', 'm07_north_crossing'],
      ['m07_town', 'm07_south_crossing'],
      ['m07_north_crossing', 'm07_stone_north'],
      ['m07_south_crossing', 'm07_stone_south'],
      ['m07_stone_north', 'm07_stone_south'],
      ['m07_stone_north', 'm07_barrow_gate'],
      ['m07_stone_south', 'm07_barrow_gate'],
      ['m07_barrow_gate', 'm07_jarl_hall'],
      ['m07_barrow_gate', 'm07_cairn'],
      ['m07_jarl_hall', 'm07_barrow_door'],
      ['m07_jarl_hall', 'm07_oath_mound'],
      ['m07_stone_south', 'm07_nest'],
      ['m07_town', 'm07_sawmill'],
      ['m07_town', 'm07_quarry'],
    ],
    patrolLoop: [
      { q: 13, r: 8 },
      { q: 18, r: 10 },
      { q: 13, r: 12 },
      { q: 16, r: 10 },
    ],
    biome: 'tundra',
  },
];

// ---------------------------------------------------------------------------
// Entitlements
// ---------------------------------------------------------------------------

export const WINTER_OATH_ENTITLEMENTS: readonly EntitlementDefinition[] = [
  { id: 'covenant.norse_frost_troll.wo3', name: 'Frost Troll Covenant', kind: 'covenant', familyId: 'norse_frost_troll', summary: 'The troll-oath of Troll-Home allows a Troll Cave to be built in one town.' },
  { id: 'covenant.norse_jotunn.wo6', name: 'Jotunn Covenant', kind: 'covenant', familyId: 'norse_jotunn', summary: 'The freed giants of Hrimgard allow a Jotunn Camp to be built in one town.' },
];

// ---------------------------------------------------------------------------
// Shared bits
// ---------------------------------------------------------------------------

/** Dialogue line; the portrait ID is derived from the speaker (placeholders until portraits exist). */
const P = (speaker: string, text: string, slug = speaker.toLowerCase().replace(/^the /, '').replace(/[^a-z]+/g, '_')) => ({
  speaker,
  portraitAssetId: `hero.norse.${slug}.portrait`,
  text,
});
const HERVOR = (t: string) => P('Hervor', t);
const EYDIS = (t: string) => P('Eydis', t);
const SKEGGI = (t: string) => P('Skeggi', t);
const JARL = (t: string) => P('The Grey Jarl', t, 'grey_jarl');

const resSite = (id: string, q: number, r: number, siteType: 'sawmill' | 'quarry' | 'gold_mine' | 'crystal_deposit', name?: string): SiteDefinition => {
  const table = {
    sawmill: { name: 'Sawmill', resource: 'wood' as const, dailyYield: 2, description: 'An unowned timber camp. Capture for +2 Wood per day.' },
    quarry: { name: 'Quarry', resource: 'stone' as const, dailyYield: 2, description: 'An unowned quarry. Capture for +2 Stone per day.' },
    gold_mine: { name: 'Gold Mine', resource: 'gold' as const, dailyYield: 1000, description: 'An unowned mine. Capture for +1,000 Gold per day.' },
    crystal_deposit: { name: 'Crystal Deposit', resource: 'crystal' as const, dailyYield: 1, description: 'An unowned crystal outcrop. Capture for +1 Crystal per day.' },
  }[siteType];
  return { id, anchorId: id, coord: { q, r }, name: name ?? table.name, description: table.description, kind: { type: 'resource_site', siteType, resource: table.resource, dailyYield: table.dailyYield } };
};

const hervor = (defaults: MissionHeroSetup['defaults'], army: MissionHeroSetup['army'], startTownId: string): MissionHeroSetup => ({
  heroId: 'hervor',
  definitionId: 'norse_hervor',
  classId: 'volva',
  defaults,
  army,
  startTownId,
});

const DEBRIEF_POLICY = [
  'Hervor keeps her level, experience (up to the displayed cap), skills, spellbook, spells and equipment.',
  'Odin and every god she has committed to carry into the next mission.',
  'Troops, resources, towns, mines and recruitment pools stay behind to hold the north.',
  'The next mission begins with its declared war-band and wallet.',
];

/** Campaign rules shared by every mission (proposed this build). */
const COMMON = {
  campaignId: 'winter_oath',
  signatureMechanics: true,
  features: { expandedContent: true },
  heroHiringEnabled: false,
  heroHiringDisabledReason: 'Hervor carries the oath alone. Hero hiring is disabled in The Winter Oath.',
  protectedHeroFailure: true,
} as const;

const FIRST_GODS = ['norse_thor', 'norse_tyr'];
const ALL_GODS = ['norse_thor', 'norse_tyr', 'norse_freyja', 'norse_heimdall', 'norse_hel'];

// ---------------------------------------------------------------------------
// M01 — Barrow Light (Restore)
// ---------------------------------------------------------------------------

const M01_OBJECTIVES: ObjectiveDefinition[] = [
  { id: 'm01_recruit', title: 'Raise the barrow-watch', description: 'Recruit at least 10 Draugar during this mission. Starting troops and creatures that join on the map do not count.', category: 'primary', initialStatus: 'active', condition: { type: 'counter_at_least', counter: 'recruited:norse_draugr', value: 10 }, hint: 'Visit Kaldvik and open Recruitment at the Draugr Barrow.' },
  { id: 'm01_train', title: 'Bind a deathless guard', description: 'Train at least 8 Draugar into Deathless Draugar.', category: 'primary', initialStatus: 'locked', requires: ['m01_recruit'], condition: { type: 'counter_at_least', counter: 'trained:norse_draugr', value: 8 }, hint: 'Build the Deathless Barrow, then train Draugar in Kaldvik. Training costs the price difference and uses no population.' },
  { id: 'm01_ford', title: 'Clear the frozen ford', description: 'Drive off the 8 Frost Wolves that hold the only ford over the river.', category: 'primary', initialStatus: 'locked', requires: ['m01_train'], condition: { type: 'site_cleared', siteId: 'm01_ford' }, markerSiteId: 'm01_ford' },
  { id: 'm01_barrow_guard', title: 'Break the barrow-guard', description: 'Defeat the 14 Draugar and 4 Deathless Draugar standing around the Rune Stone.', category: 'primary', initialStatus: 'locked', requires: ['m01_ford'], condition: { type: 'site_cleared', siteId: 'm01_rune_stone' }, markerSiteId: 'm01_rune_stone' },
  { id: 'm01_recut', title: 'Re-cut the rune', description: 'At the Rune Stone, with its guard broken and both muster objectives met, pay 300 Gold, 3 Stone and 1 Crystal to cut the rune again.', category: 'primary', initialStatus: 'locked', requires: ['m01_barrow_guard'], condition: { type: 'site_activated', siteId: 'm01_rune_stone' }, markerSiteId: 'm01_rune_stone' },
  { id: 'm01_longship', title: 'The frozen longship (optional)', description: 'Visit the longship caught in the fjord ice.', category: 'optional', initialStatus: 'active', condition: { type: 'site_visited', siteId: 'm01_longship' }, markerSiteId: 'm01_longship' },
];

const M01_SITES: SiteDefinition[] = [
  { id: 'm01_town', anchorId: 'm01_town', coord: { q: 3, r: 7 }, name: 'Kaldvik', description: 'Hervor’s fjord-hold, below its own barrow.', kind: { type: 'town', townId: 'kaldvik' } },
  resSite('m01_sawmill', 4, 3, 'sawmill'),
  resSite('m01_quarry', 5, 11, 'quarry'),
  {
    id: 'm01_longship',
    anchorId: 'm01_longship',
    coord: { q: 7, r: 5 },
    name: 'Frozen Longship',
    description: 'A longship caught in the fjord ice since autumn. Its crew never came ashore.',
    kind: {
      type: 'map_event',
      title: 'The Frozen Longship',
      text: 'The ice has the ship to the rails. In the hold: barrels of salt fish, a chest of trade silver — and four drowned oarsmen still at their benches, eyes open, waiting for a word.',
      options: [
        { label: 'Salvage the cargo', summary: '+600 Gold and +4 Wood.', reward: { resources: { gold: 600, wood: 4 } } },
        { label: 'Speak the rune-word to the crew', summary: '4 Draugar join Hervor’s army.', reward: { creatures: [{ creatureId: 'norse_draugr', count: 4 }] } },
      ],
    },
    objectiveIds: ['m01_longship'],
  },
  { id: 'm01_wolf_camp', anchorId: 'm01_wolf_camp', coord: { q: 8, r: 2 }, name: 'Birchwood Wolf Camp', description: 'Half-tame frost wolves that follow a hold which feeds them.', kind: { type: 'creature_camp', creatureId: 'norse_frost_wolf', weeklyGrowth: 3, initialStock: 5 } },
  {
    id: 'm01_ford',
    anchorId: 'm01_ford',
    coord: { q: 10, r: 8 },
    name: 'Frozen Ford',
    description: 'The only crossing of the river. Frost wolves have made it their den.',
    kind: { type: 'crossing' },
    guard: { label: 'Ford wolves', army: [{ creatureId: 'norse_frost_wolf', count: 8 }], reward: { resources: { gold: 300, wood: 3, stone: 3 } }, battlefield: 'coast_road' },
    objectiveIds: ['m01_ford'],
  },
  { id: 'm01_cairn', anchorId: 'm01_cairn', coord: { q: 14, r: 11 }, name: 'Snowed-in Cairn', description: 'A hunter’s cairn with a cache under the stones.', kind: { type: 'pickup', reward: { resources: { gold: 400, crystal: 1 } } } },
  {
    id: 'm01_rune_stone',
    anchorId: 'm01_rune_stone',
    coord: { q: 16, r: 7 },
    name: 'Rune Stone of Kaldvik',
    description: 'The headland stone whose rune kept the hold’s dead asleep. The rune has worn smooth.',
    kind: {
      type: 'activation',
      label: 'beacon',
      cost: { gold: 300, stone: 3, crystal: 1 },
      requirements: [
        { type: 'objective_completed', objectiveId: 'm01_recruit' },
        { type: 'objective_completed', objectiveId: 'm01_train' },
      ],
      reward: { questXp: 900 },
      completesMission: true,
      confirmText: 'Cut the rune on the Rune Stone of Kaldvik? This completes Barrow Light.',
    },
    guard: {
      label: 'Barrow-guard',
      army: [
        { creatureId: 'norse_draugr', count: 14 },
        { creatureId: 'norse_deathless_draugr', count: 4 },
      ],
      reward: { resources: { gold: 500 }, artifactIds: ['rune_marked_sword'] },
      battlefield: 'beacon_clearing',
    },
    objectiveIds: ['m01_barrow_guard', 'm01_recut'],
  },
];

const M01: MissionDefinition = {
  ...COMMON,
  id: 'winter_oath_m01',
  scenarioId: 'winter_oath_m01',
  order: 1,
  name: 'Barrow Light',
  subtitle: 'Mission 1 — Restore',
  summary: 'Spring is two months late and Kaldvik’s barrow has cracked open. Raise and bind a watch from the barrow, clear the frozen ford and cut the headland rune again.',
  mapTemplateId: 'winter_oath_m01_v1',
  soundscape: 'coast',
  targetPlaytime: '15–20 minutes (target, unmeasured)',
  newDecisions: ['Recruit and train', 'Berserk Fury', 'Learn runes at the Rune Circle', 'A one-time choice'],
  xpCap: 3199,
  xpCapLevel: 3,
  briefing: [
    EYDIS('Spring is two months late. The fjord is still ice to the skerries, and last night the hold’s own barrow cracked open. The dead in it are standing up.'),
    HERVOR('Then the rune on the headland has failed. The dead answer whoever holds a rune-oath — raise a watch from the barrow, and I will cut the rune again.'),
    SKEGGI('Mind the ford on the way. Something has been crossing it at night, and it does not leave a man’s tracks.'),
  ],
  victory: [EYDIS('The rune holds. For tonight the dead in our hill sleep. The others — the ones walking south from the mountains — do not.')],
  storyScenes: [
    {
      id: 'm01_ford_open',
      trigger: { type: 'site_cleared', siteId: 'm01_ford' },
      lines: [
        SKEGGI('Those wolves were not hunting. They were herding — keeping the hold away from the stone.'),
        HERVOR('Then someone wants the stone left alone. Good. That tells me where to go.'),
      ],
    },
    {
      id: 'm01_barrow_battle',
      trigger: { type: 'battle_started', siteId: 'm01_rune_stone' },
      lines: [
        JARL('Little seeress. What you buried under that stone is mine. My dead will carry it home.'),
        HERVOR('Your dead can try. Mine are standing in front of them.'),
      ],
    },
    {
      id: 'm01_sword',
      trigger: { type: 'site_cleared', siteId: 'm01_rune_stone' },
      lines: [
        HERVOR('Nine winters ago I took this sword from a mound in the north and hid it here, under the rune, so it would sleep. It is awake.'),
        JARL('You carry what is mine. Every step you take with it, my winter follows.'),
        SKEGGI('Cut the rune again, Hervor. Quickly — and keep the blade close.'),
      ],
    },
    {
      id: 'm01_losses',
      trigger: { type: 'casualties', minLost: 4 },
      lines: [
        EYDIS('I count the living and I count the dead, Hervor. Tonight the second list grew. Bring more of them home.'),
        HERVOR('I hear you, Eydis. Even the dead deserve a better captain than a careless one.'),
      ],
    },
  ],
  debriefPolicy: DEBRIEF_POLICY,
  player: {
    playerId: 'player',
    name: 'Kaldvik',
    pantheonId: 'norse',
    wallet: { gold: 5000, wood: 12, stone: 18, crystal: 2, favor: 0 },
    town: {
      townId: 'kaldvik',
      siteId: 'm01_town',
      name: 'Kaldvik',
      archetypeId: 'norse_hold',
      buildings: ['norse_longhouse', 'norse_mead_hall', 'norse_palisade', 'norse_barrow', 'norse_rune_circle_1'],
      population: { norse_draugr: 14 },
      covenants: [],
    },
    hero: hervor(
      { level: 1, xp: 0, attributes: { attack: 1, defense: 1, power: 2, knowledge: 2 }, skills: [{ skillId: 'wisdom', rank: 1 }], spellbook: true },
      [
        { creatureId: 'norse_draugr', count: 18 },
        { creatureId: 'norse_frost_wolf', count: 6 },
      ],
      'kaldvik',
    ),
  },
  purchasableBuildingIds: ['norse_jarls_hall', 'norse_trading_post', 'norse_barrow_up', 'norse_wolf_den', 'norse_smithy', 'norse_hof_1'],
  committableGodIds: FIRST_GODS,
  sites: M01_SITES,
  objectives: M01_OBJECTIVES,
  hostileHeroes: [],
  helpTopics: [
    { id: 'in_order', title: 'Steps in order', text: 'Each primary step opens after the one before it. Work done early still counts: a step whose goal is already met completes the moment it opens.' },
    { id: 'berserk_fury', title: 'Berserk Fury', text: 'The Norse signature: a stack of yours with at most half of its starting creatures alive gains +2 Attack. A battered stack is not a beaten one.' },
    { id: 'rune_circle', title: 'The Rune Circle', text: 'A völva learns every spell of the Rune Circle’s library when she visits the hold. The Rune Circle’s runes change from hold to hold.' },
    { id: 'upgrade_vs_training', title: 'Dwelling upgrade vs. troop training', text: 'Upgrading a dwelling unlocks the upgraded form. Training converts existing troops in town for the price difference and uses no population.' },
    { id: 'map_events', title: 'One-time choices', text: 'Some places offer a choice the first time a hero arrives. The result of each option is shown before you choose, and the choice cannot be taken back.' },
  ],
  thumbnailAssetId: 'mission.winter_oath.m01.thumbnail',
};

// ---------------------------------------------------------------------------
// M02 — The White Pack (Hunt)
// ---------------------------------------------------------------------------

const M02_OBJECTIVES: ObjectiveDefinition[] = [
  { id: 'm02_den', title: 'Wolves of our own', description: 'Recruit at least 8 Frost Wolves in Birkaby (build the Wolf Den first).', category: 'primary', initialStatus: 'active', condition: { type: 'counter_at_least', counter: 'recruited:norse_frost_wolf', value: 8 }, hint: 'Build the Wolf Den in Birkaby, then recruit. Wolves bought at the camp do not count.' },
  { id: 'm02_trail', title: 'Find the pack’s trail', description: 'Climb the Watch-hill to see where the White Pack dens.', category: 'primary', initialStatus: 'locked', requires: ['m02_den'], condition: { type: 'site_visited', siteId: 'm02_watch_hill' }, markerSiteId: 'm02_watch_hill' },
  { id: 'm02_bridge', title: 'Take the ice bridge', description: 'Defeat the 16 Draugar and 6 Deathless Draugar holding the ice bridge over the Varg-river.', category: 'primary', initialStatus: 'locked', requires: ['m02_trail'], condition: { type: 'site_cleared', siteId: 'm02_bridge' }, markerSiteId: 'm02_bridge' },
  { id: 'm02_pack', title: 'Hunt the White Pack', description: 'Catch and defeat the White Pack (6 Fenrir Wolves and 12 Frost Wolves) in the Varg-wood beyond the river.', category: 'primary', initialStatus: 'locked', requires: ['m02_bridge'], condition: { type: 'hero_defeated', heroDefinitionId: 'norse_white_pack' }, hint: 'The pack roams near the wood’s middle and only attacks a war-band it is sure it can beat. Corner it: move onto it to fight.' },
  { id: 'm02_recut', title: 'Re-cut the Varg-wood rune', description: 'With the pack broken, pay 400 Gold, 4 Stone and 1 Crystal at the Varg-wood Rune Stone.', category: 'primary', initialStatus: 'locked', requires: ['m02_pack'], condition: { type: 'site_activated', siteId: 'm02_rune_stone' }, markerSiteId: 'm02_rune_stone' },
  { id: 'm02_lair', title: 'The wolf-mother’s lair (optional)', description: 'Defeat the 4 Fenrir Wolves and 6 Frost Wolves at the lair for 500 Gold and a Boar-crested Helm.', category: 'optional', initialStatus: 'active', condition: { type: 'site_cleared', siteId: 'm02_lair' }, markerSiteId: 'm02_lair' },
  { id: 'm02_lodge', title: 'The hunter’s lodge (optional)', description: 'Visit the old hunter in the north woods.', category: 'optional', initialStatus: 'active', condition: { type: 'site_visited', siteId: 'm02_lodge' }, markerSiteId: 'm02_lodge' },
];

const M02_SITES: SiteDefinition[] = [
  { id: 'm02_town', anchorId: 'm02_town', coord: { q: 3, r: 8 }, name: 'Birkaby', description: 'A grain-hold on the south road. Its jarl died in the first frost.', kind: { type: 'town', townId: 'birkaby' } },
  resSite('m02_sawmill', 4, 4, 'sawmill'),
  resSite('m02_quarry', 5, 12, 'quarry'),
  { id: 'm02_watch_hill', anchorId: 'm02_watch_hill', coord: { q: 8, r: 5 }, name: 'Watch-hill', description: 'From the top, the Varg-wood beyond the river lies open.', kind: { type: 'watchtower', revealSiteIds: ['m02_lair', 'm02_rune_stone'] }, objectiveIds: ['m02_trail'] },
  {
    id: 'm02_lodge',
    anchorId: 'm02_lodge',
    coord: { q: 9, r: 2 },
    name: 'Hunter’s Lodge',
    description: 'An old hunter who has outlived three jarls lives here with his dogs.',
    kind: {
      type: 'map_event',
      title: 'The Hunter’s Lodge',
      text: 'The old man has hunted the Varg-wood for fifty winters. “That pack is not hungry,” he says. “It is obedient. Something tells it where to run.” On the wall hang a pair of birch skis, oiled and sound.',
      options: [
        { label: 'Buy the hunter’s skis', summary: 'Pay 2,000 Gold for the Skis of Ullr (+15% daily land movement).', cost: { gold: 2000 }, reward: { artifactIds: ['skis_of_ullr'] } },
        { label: 'Share his fire and his hunt-lore', summary: 'Hervor gains +1 Knowledge.', reward: { attributes: { knowledge: 1 } } },
      ],
    },
    objectiveIds: ['m02_lodge'],
  },
  { id: 'm02_wolf_camp', anchorId: 'm02_wolf_camp', coord: { q: 8, r: 12 }, name: 'Southmoor Wolf Camp', description: 'Frost wolves that have not joined the White Pack.', kind: { type: 'creature_camp', creatureId: 'norse_frost_wolf', weeklyGrowth: 3, initialStock: 4 } },
  {
    id: 'm02_bridge',
    anchorId: 'm02_bridge',
    coord: { q: 12, r: 8 },
    name: 'Ice Bridge',
    description: 'A bridge of river-ice thick enough for a war-band. The Jarl’s dead keep it.',
    kind: { type: 'crossing' },
    guard: {
      label: 'Bridge-dead',
      army: [
        { creatureId: 'norse_draugr', count: 16 },
        { creatureId: 'norse_deathless_draugr', count: 6 },
      ],
      reward: { resources: { gold: 600, favor: 3 } },
      battlefield: 'ridge_pass',
    },
    objectiveIds: ['m02_bridge'],
  },
  {
    id: 'm02_lair',
    anchorId: 'm02_lair',
    coord: { q: 17, r: 3 },
    name: 'Wolf-mother’s Lair',
    description: 'A den under a fallen spruce, littered with the bones of reindeer — and a helm.',
    kind: { type: 'landmark', landmark: 'refuge' },
    guard: {
      label: 'Lair wolves',
      army: [
        { creatureId: 'norse_fenrir_wolf', count: 4 },
        { creatureId: 'norse_frost_wolf', count: 6 },
      ],
      reward: { resources: { gold: 500 }, artifactIds: ['boar_crest_helm'] },
      battlefield: 'grove',
    },
    markerHiddenUntilRevealed: true,
    objectiveIds: ['m02_lair'],
  },
  resSite('m02_crystal', 16, 13, 'crystal_deposit'),
  {
    id: 'm02_rune_stone',
    anchorId: 'm02_rune_stone',
    coord: { q: 21, r: 8 },
    name: 'Varg-wood Rune Stone',
    description: 'The rune that kept the wolves of the wood from the south road.',
    kind: {
      type: 'activation',
      label: 'beacon',
      cost: { gold: 400, stone: 4, crystal: 1 },
      requirements: [{ type: 'objective_completed', objectiveId: 'm02_pack' }],
      reward: { questXp: 1400 },
      completesMission: true,
      confirmText: 'Cut the rune on the Varg-wood Rune Stone? This completes The White Pack.',
    },
    markerHiddenUntilRevealed: true,
    objectiveIds: ['m02_recut'],
  },
];

const M02: MissionDefinition = {
  ...COMMON,
  id: 'winter_oath_m02',
  scenarioId: 'winter_oath_m02',
  order: 2,
  name: 'The White Pack',
  subtitle: 'Mission 2 — Hunt',
  summary: 'A pack of white wolves cuts the south road to Birkaby, and it runs where the Grey Jarl tells it. Raise wolves of your own, cross the Varg-river, hunt the pack down and cut the wood’s rune.',
  mapTemplateId: 'winter_oath_m02_v1',
  soundscape: 'high_pass',
  targetPlaytime: '20–25 minutes (target, unmeasured)',
  newDecisions: ['Hunt a wandering pack', 'Use a lookout', 'Buy or bargain on the road'],
  xpCap: 4599,
  xpCapLevel: 4,
  briefing: [
    EYDIS('Birkaby’s grain is the only grain between here and the mountains, and no sledge has come up the south road in a month. The drivers say white wolves.'),
    SKEGGI('Wolves do not cut roads. Wolves eat what they catch and move on. These wait for the next sledge.'),
    HERVOR('Then they are someone’s wolves. We will raise our own, find their trail, and teach them whose road it is.'),
  ],
  victory: [SKEGGI('Two runes cut. Now listen, Hervor — the third stone stands high in the fells, where the Valkyries used to nest. Nobody has seen a Valkyrie there since the first frost.')],
  storyScenes: [
    {
      id: 'm02_trail_found',
      trigger: { type: 'site_visited', siteId: 'm02_watch_hill' },
      lines: [
        HERVOR('There — past the river. The snow is trodden flat in a ring around the old stone, the way a pack walks a fold.'),
        SKEGGI('They are guarding it. Which means the stone still matters.'),
      ],
    },
    {
      id: 'm02_pack_battle',
      trigger: { type: 'battle_started', heroDefinitionId: 'norse_white_pack' },
      lines: [JARL('Run, my wolves. Run her ragged. Winter is long and she is only one woman.')],
    },
    {
      id: 'm02_pack_broken',
      trigger: { type: 'objective_completed', objectiveId: 'm02_pack' },
      lines: [
        HERVOR('The pack is broken. The ones that lived are running north — home, wherever that is for them.'),
        EYDIS('Then the sledges can run south. I will send word to Birkaby’s granary tonight.'),
      ],
    },
    {
      id: 'm02_losses',
      trigger: { type: 'casualties', minLost: 6 },
      lines: [EYDIS('The wolves took more than grain from us this time, Hervor. Count them with me when you are home.')],
    },
  ],
  debriefPolicy: DEBRIEF_POLICY,
  player: {
    playerId: 'player',
    name: 'Birkaby',
    pantheonId: 'norse',
    wallet: { gold: 8000, wood: 20, stone: 25, crystal: 5, favor: 5 },
    town: {
      townId: 'birkaby',
      siteId: 'm02_town',
      name: 'Birkaby',
      archetypeId: 'norse_hold',
      buildings: ['norse_longhouse', 'norse_mead_hall', 'norse_trading_post', 'norse_palisade', 'norse_barrow', 'norse_barrow_up', 'norse_smithy', 'norse_rune_circle_1', 'norse_hof_1'],
      population: { norse_draugr: 14 },
      covenants: [],
    },
    hero: hervor(
      { level: 2, xp: 1100, attributes: { attack: 1, defense: 1, power: 3, knowledge: 2 }, skills: [{ skillId: 'wisdom', rank: 1 }, { skillId: 'armorer', rank: 1 }], spellbook: true },
      [
        { creatureId: 'norse_draugr', count: 24 },
        { creatureId: 'norse_deathless_draugr', count: 12 },
        { creatureId: 'norse_frost_wolf', count: 8 },
      ],
      'birkaby',
    ),
  },
  hostilePlayer: { playerId: 'winter_host', name: 'The Winter Host' },
  purchasableBuildingIds: ['norse_wolf_den', 'norse_wolf_den_up', 'norse_jarls_hall', 'norse_storehouse', 'norse_rune_circle_2', 'norse_training_ground'],
  committableGodIds: FIRST_GODS,
  sites: M02_SITES,
  objectives: M02_OBJECTIVES,
  hostileHeroes: [
    {
      commander: {
        heroDefinitionId: 'norse_white_pack',
        name: 'The White Pack',
        classId: 'huscarl',
        level: 1,
        attributes: { attack: 0, defense: 0, power: 0, knowledge: 0 },
        skills: [],
        spellbook: false,
        spellIds: [],
        mana: 0,
        portraitAssetId: 'creature.norse.tier2.upgraded.portrait',
      },
      monster: { bounty: { gold: 800 } },
      startCoord: { q: 17, r: 8 },
      army: [
        { creatureId: 'norse_fenrir_wolf', count: 6 },
        { creatureId: 'norse_frost_wolf', count: 12 },
      ],
      ai: {
        profile: 'patrol',
        waypoints: [
          { q: 16, r: 7 },
          { q: 18, r: 8 },
          { q: 17, r: 10 },
          { q: 15, r: 9 },
        ],
        regionMinQ: 13,
        regionMaxQ: 22,
        regionCenter: { q: 17, r: 8 },
        regionRadius: 3,
        attackThreshold: { numerator: 3, denominator: 2 },
      },
    },
  ],
  helpTopics: [
    { id: 'wandering', title: 'Wandering packs', text: 'A wandering band stays near its hunting ground, moves after your turn and attacks only an army it judges clearly weaker. Move onto it to fight it.' },
    { id: 'lookout', title: 'Lookouts', text: 'Climbing a lookout marks distant sites on your map, so you can plan a route before you can see them.' },
    { id: 'camps', title: 'Creature camps', text: 'A camp sells its creatures to a visiting hero at their normal price. Its stock grows every week.' },
  ],
  thumbnailAssetId: 'mission.winter_oath.m02.thumbnail',
};

// ---------------------------------------------------------------------------
// M03 — The Valkyrie's Price (Ally)
// ---------------------------------------------------------------------------

const M03_OBJECTIVES: ObjectiveDefinition[] = [
  { id: 'm03_pass', title: 'Break the ice-pass', description: 'Defeat the 16 Draugar and 6 Deathless Draugar holding the pass into the high fells.', category: 'primary', initialStatus: 'active', condition: { type: 'site_cleared', siteId: 'm03_pass' }, markerSiteId: 'm03_pass' },
  { id: 'm03_aerie', title: 'Free the Valkyrie aerie', description: 'Drive the 5 Frost Trolls out of the Valkyries’ cliff-hall.', category: 'primary', initialStatus: 'locked', requires: ['m03_pass'], condition: { type: 'site_cleared', siteId: 'm03_aerie' }, markerSiteId: 'm03_aerie' },
  {
    id: 'm03_troll_oath',
    title: 'The troll-oath',
    description: 'Win the Frost Troll covenant: pay the troll-wife’s blood-price at her hearth, or beat her sons at Troll-Home.',
    category: 'primary',
    initialStatus: 'locked',
    requires: ['m03_aerie'],
    condition: { type: 'any', conditions: [{ type: 'flag', flag: 'troll_pact' }, { type: 'site_cleared', siteId: 'm03_troll_home' }] },
    hint: 'Both routes give the same covenant. The fight gives experience; the bargain saves troops. Assign the covenant to Fjallhof to build a Troll Cave.',
  },
  { id: 'm03_pantheon', title: 'A god for the fells', description: 'Build Hof II and commit to Thor or Tyr (20 Favor, irreversible).', category: 'primary', initialStatus: 'locked', requires: ['m03_troll_oath'], condition: { type: 'player_has_minor_god' }, hint: 'Open the Pantheon screen once Hof II stands in Fjallhof. A god chosen earlier counts as soon as this step opens.' },
  { id: 'm03_valkyries', title: 'Choosers on the wing', description: 'Have at least 2 Battle Valkyries in Hervor’s army.', category: 'primary', initialStatus: 'locked', requires: ['m03_pantheon'], condition: { type: 'hero_army_contains', heroId: 'hervor', creatureId: 'norse_battle_valkyrie', count: 2 }, live: true, hint: 'Build the Valkyrie Aerie and the Hall of the Chosen in Fjallhof; recruit or train Battle Valkyries with Hervor in town.' },
  { id: 'm03_recut', title: 'Cut the high rune', description: 'Cross the ice bridge and, with a god chosen and Battle Valkyries in the army, pay 500 Gold and 2 Crystal at the High Rune Stone.', category: 'primary', initialStatus: 'locked', requires: ['m03_valkyries'], condition: { type: 'site_activated', siteId: 'm03_rune_stone' }, markerSiteId: 'm03_rune_stone' },
  { id: 'm03_cache', title: 'Herders’ cache (optional)', description: 'Pick up the cache the herders left when they fled.', category: 'optional', initialStatus: 'active', condition: { type: 'site_visited', siteId: 'm03_cache' }, markerSiteId: 'm03_cache' },
];

const M03_SITES: SiteDefinition[] = [
  { id: 'm03_town', anchorId: 'm03_town', coord: { q: 3, r: 9 }, name: 'Fjallhof', description: 'The last hold below the high fells.', kind: { type: 'town', townId: 'fjallhof' } },
  resSite('m03_sawmill', 5, 5, 'sawmill'),
  resSite('m03_quarry', 5, 13, 'quarry'),
  { id: 'm03_cache', anchorId: 'm03_cache', coord: { q: 8, r: 15 }, name: 'Herders’ Cache', description: 'Supplies left behind by herders who fled the trolls.', kind: { type: 'pickup', reward: { resources: { gold: 700, wood: 5 } } }, objectiveIds: ['m03_cache'] },
  {
    id: 'm03_pass',
    anchorId: 'm03_pass',
    coord: { q: 13, r: 9 },
    name: 'Ice-pass',
    description: 'The only way through the fell-wall. The Jarl’s dead stand in it like a door.',
    kind: { type: 'crossing' },
    guard: {
      label: 'Pass-dead',
      army: [
        { creatureId: 'norse_draugr', count: 16 },
        { creatureId: 'norse_deathless_draugr', count: 6 },
      ],
      reward: { resources: { gold: 750, favor: 5 } },
      battlefield: 'ridge_pass',
    },
    objectiveIds: ['m03_pass'],
  },
  {
    id: 'm03_aerie',
    anchorId: 'm03_aerie',
    coord: { q: 17, r: 4 },
    name: 'Valkyrie Aerie',
    description: 'A cliff-hall of the Valkyries. Frost trolls have taken it; the Valkyries circle above and will not land.',
    kind: { type: 'creature_camp', creatureId: 'norse_valkyrie', weeklyGrowth: 1, initialStock: 2 },
    guard: {
      label: 'Aerie trolls',
      army: [{ creatureId: 'norse_frost_troll', count: 5 }],
      reward: { resources: { favor: 5 }, artifactIds: ['shieldmaiden_round_shield'] },
      battlefield: 'plateau',
    },
    objectiveIds: ['m03_aerie'],
  },
  resSite('m03_crystal', 16, 9, 'crystal_deposit'),
  {
    id: 'm03_hearth',
    anchorId: 'm03_hearth',
    coord: { q: 15, r: 13 },
    name: 'The Troll-wife’s Hearth',
    description: 'A fire in a ring of boulders. An old troll-wife tends it and watches the road.',
    kind: {
      type: 'map_event',
      title: 'The Troll-wife’s Hearth',
      text: '“You threw my sons off the Valkyries’ cliff,” the troll-wife says, without getting up. “They took what was not theirs, so I will not ask for their blood. I will ask for gold, and for wood for my fire. Pay, and my kin will keep an oath with your hold. Or go to Troll-Home and take it from them — they would like that better.”',
      options: [
        { label: 'Pay the blood-price', summary: 'Pay 1,500 Gold and 10 Wood: gain the Frost Troll covenant.', cost: { gold: 1500, wood: 10 }, reward: { entitlementIds: ['covenant.norse_frost_troll.wo3'], flags: ['troll_pact'] } },
        { label: 'Refuse — settle it at Troll-Home', summary: 'Nothing is paid. The covenant must be won at Troll-Home.', reward: {} },
      ],
    },
  },
  {
    id: 'm03_troll_home',
    anchorId: 'm03_troll_home',
    coord: { q: 17, r: 15 },
    name: 'Troll-Home',
    description: 'A cave-mouth hung with antlers. The troll-wife’s sons live here.',
    kind: { type: 'landmark', landmark: 'refuge' },
    guard: {
      label: 'The troll-wife’s sons',
      army: [
        { creatureId: 'norse_frost_troll', count: 4 },
        { creatureId: 'norse_ancient_frost_troll', count: 1 },
      ],
      reward: { resources: { gold: 1000 }, entitlementIds: ['covenant.norse_frost_troll.wo3'] },
      battlefield: 'plateau',
    },
  },
  {
    id: 'm03_bridge',
    anchorId: 'm03_bridge',
    coord: { q: 20, r: 9 },
    name: 'Ice Bridge',
    description: 'A frozen waterfall wide enough to walk. The Jarl’s bridge-watch holds the far end.',
    kind: { type: 'crossing' },
    guard: {
      label: 'Bridge-watch',
      army: [
        { creatureId: 'norse_deathless_draugr', count: 12 },
        { creatureId: 'norse_fenrir_wolf', count: 4 },
      ],
      reward: { resources: { gold: 800 } },
      battlefield: 'ridge_pass',
    },
  },
  {
    id: 'm03_rune_stone',
    anchorId: 'm03_rune_stone',
    coord: { q: 23, r: 9 },
    name: 'High Rune Stone',
    description: 'The third stone of the oath, on the roof of the fells.',
    kind: {
      type: 'activation',
      label: 'beacon',
      cost: { gold: 500, crystal: 2 },
      requirements: [
        { type: 'objective_completed', objectiveId: 'm03_pantheon' },
        { type: 'objective_completed', objectiveId: 'm03_valkyries' },
      ],
      reward: { questXp: 2000 },
      completesMission: true,
      confirmText: 'Cut the rune on the High Rune Stone? This completes The Valkyrie’s Price.',
    },
    objectiveIds: ['m03_recut'],
  },
];

const M03: MissionDefinition = {
  ...COMMON,
  id: 'winter_oath_m03',
  scenarioId: 'winter_oath_m03',
  order: 3,
  name: 'The Valkyrie’s Price',
  subtitle: 'Mission 3 — Ally',
  summary: 'Frost trolls hold the Valkyries’ aerie in the high fells. Break the ice-pass, free the aerie, win the trolls’ oath by gold or by force, choose Thor or Tyr and carry Battle Valkyries to the third rune.',
  mapTemplateId: 'winter_oath_m03_v1',
  soundscape: 'high_pass',
  targetPlaytime: '25–30 minutes (target, unmeasured)',
  newDecisions: ['Choose a god', 'Bargain or fight for a covenant', 'Raise Battle Valkyries'],
  xpCap: 6199,
  xpCapLevel: 5,
  briefing: [
    SKEGGI('The Valkyries choose the slain for the hall of the gods. If they will not land on their own cliff, then the dead of this winter are being chosen by someone else.'),
    HERVOR('By the Grey Jarl. Every one of his draugar was a warrior once.'),
    SKEGGI('Then give the Valkyries their cliff back and ask them to choose for us. And talk to the trolls before you kill them. Trolls keep oaths longer than men do.'),
  ],
  victory: [SKEGGI('Three runes. The winter has stopped spreading — but it has not gone. Something holds it here. Not something: someone. We need his name.')],
  storyScenes: [
    {
      id: 'm03_aerie_freed',
      trigger: { type: 'site_cleared', siteId: 'm03_aerie' },
      lines: [
        P('Svanhild', 'You cleared our hall with draugar at your back, seeress. That is a strange gift — but the Valkyries remember gifts.'),
        P('Svanhild', 'Take this shield. A shieldmaiden carried it until she was chosen. Our hall will sell you wings while the fells stay free.'),
        HERVOR('Then stay free with us.'),
      ],
    },
    {
      id: 'm03_troll_pact',
      trigger: { type: 'flag', flag: 'troll_pact' },
      lines: [P('The Troll-wife', 'Paid in full. My sons will grumble, and then they will keep the oath. That is how trolls are.', 'troll_wife')],
    },
    {
      id: 'm03_thor',
      trigger: { type: 'god_committed', godId: 'norse_thor' },
      lines: [SKEGGI('Thor, then. He likes a fight in the open and a loud one. The trolls will respect that — they have felt his hammer before.')],
    },
    {
      id: 'm03_tyr',
      trigger: { type: 'god_committed', godId: 'norse_tyr' },
      lines: [SKEGGI('Tyr. The god who put his hand in the wolf’s mouth to keep an oath. Fitting, for a woman chasing one.')],
    },
    {
      id: 'm03_losses',
      trigger: { type: 'casualties', minLost: 8 },
      lines: [EYDIS('A sledge from Kaldvik with a list of names, Hervor. I will not read it to you. I will leave it by your door.')],
    },
  ],
  debriefPolicy: DEBRIEF_POLICY,
  player: {
    playerId: 'player',
    name: 'Fjallhof',
    pantheonId: 'norse',
    wallet: { gold: 11000, wood: 25, stone: 30, crystal: 8, favor: 15 },
    town: {
      townId: 'fjallhof',
      siteId: 'm03_town',
      name: 'Fjallhof',
      archetypeId: 'norse_hold',
      buildings: ['norse_longhouse', 'norse_jarls_hall', 'norse_mead_hall', 'norse_trading_post', 'norse_palisade', 'norse_barrow', 'norse_barrow_up', 'norse_wolf_den', 'norse_wolf_den_up', 'norse_smithy', 'norse_rune_circle_1', 'norse_hof_1'],
      population: { norse_draugr: 14, norse_frost_wolf: 9 },
      covenants: [],
    },
    hero: hervor(
      { level: 3, xp: 2400, attributes: { attack: 1, defense: 2, power: 3, knowledge: 3 }, skills: [{ skillId: 'wisdom', rank: 1 }, { skillId: 'armorer', rank: 1 }, { skillId: 'leadership', rank: 1 }], spellbook: true },
      [
        { creatureId: 'norse_draugr', count: 20 },
        { creatureId: 'norse_deathless_draugr', count: 18 },
        { creatureId: 'norse_frost_wolf', count: 8 },
        { creatureId: 'norse_fenrir_wolf', count: 4 },
      ],
      'fjallhof',
    ),
  },
  hostilePlayer: { playerId: 'winter_host', name: 'The Winter Host' },
  purchasableBuildingIds: ['norse_hof_2', 'norse_valkyrie_aerie', 'norse_valkyrie_aerie_up', 'norse_troll_cave', 'norse_troll_cave_up', 'norse_stronghold', 'norse_rune_circle_2', 'norse_storehouse', 'norse_training_ground', 'norse_watchtower'],
  committableGodIds: FIRST_GODS,
  sites: M03_SITES,
  objectives: M03_OBJECTIVES,
  hostileHeroes: [
    {
      commander: {
        heroDefinitionId: 'norse_fell_wolves',
        name: 'Fell Wolves',
        classId: 'huscarl',
        level: 1,
        attributes: { attack: 0, defense: 0, power: 0, knowledge: 0 },
        skills: [],
        spellbook: false,
        spellIds: [],
        mana: 0,
        portraitAssetId: 'creature.norse.tier2.base.portrait',
      },
      monster: { bounty: { gold: 400 } },
      startCoord: { q: 9, r: 3 },
      army: [{ creatureId: 'norse_frost_wolf', count: 6 }],
      ai: {
        profile: 'patrol',
        waypoints: [
          { q: 9, r: 3 },
          { q: 10, r: 5 },
          { q: 8, r: 4 },
        ],
        regionMinQ: 6,
        regionMaxQ: 12,
        regionCenter: { q: 9, r: 3 },
        regionRadius: 2,
        attackThreshold: { numerator: 3, denominator: 2 },
      },
    },
  ],
  helpTopics: [
    { id: 'covenants', title: 'Covenants', text: 'A covenant is a one-time entitlement. Assign it permanently to a town, then build and pay for the dwelling it unlocks.' },
    { id: 'gods', title: 'Divine commitments', text: 'Committing to a god is player-wide and irreversible. Thor and Tyr exclude each other.' },
    { id: 'guarded_camp', title: 'Guarded camps', text: 'A camp with a guard sells nothing until its guard is defeated.' },
  ],
  thumbnailAssetId: 'mission.winter_oath.m03.thumbnail',
};

// ---------------------------------------------------------------------------
// M04 — Ice on the Sound (Seek)
// ---------------------------------------------------------------------------

const cairn = (id: string, q: number, r: number, flag: string, name: string): SiteDefinition => ({
  id,
  anchorId: id,
  coord: { q, r },
  name,
  description: 'A way-cairn on the sea-ice. Lit, it burns through the fog-wall.',
  kind: {
    type: 'activation',
    label: 'relay',
    cost: { gold: 250, stone: 3 },
    requirements: [],
    reward: { flags: [flag] },
    completesMission: false,
    confirmText: `Light the ${name}? Both cairns burn through the fog-wall.`,
  },
  objectiveIds: [id],
});

const M04_OBJECTIVES: ObjectiveDefinition[] = [
  { id: 'm04_roost', title: 'Wings over the ice', description: 'Recruit at least 3 Lindworms in Skarvik (build the Lindworm Roost first).', category: 'primary', initialStatus: 'active', condition: { type: 'counter_at_least', counter: 'recruited:norse_lindworm', value: 3 }, hint: 'The Lindworm Roost needs the Valkyrie Aerie and Rune Circle I. Lindworms are the Norse shooters.' },
  { id: 'm04_landing', title: 'Take the ice-landing', description: 'Defeat the 20 Draugar and 8 Deathless Draugar of the nail-ship’s crew at the landing.', category: 'primary', initialStatus: 'locked', requires: ['m04_roost'], condition: { type: 'site_cleared', siteId: 'm04_landing' }, markerSiteId: 'm04_landing' },
  { id: 'm04_cairn_north', title: 'Northern way-cairn', description: 'Light the northern way-cairn (250 Gold, 3 Stone).', category: 'primary', initialStatus: 'locked', requires: ['m04_landing'], condition: { type: 'site_activated', siteId: 'm04_cairn_north' }, markerSiteId: 'm04_cairn_north' },
  { id: 'm04_cairn_south', title: 'Southern way-cairn', description: 'Light the southern way-cairn (250 Gold, 3 Stone).', category: 'primary', initialStatus: 'locked', requires: ['m04_landing'], condition: { type: 'site_activated', siteId: 'm04_cairn_south' }, markerSiteId: 'm04_cairn_south' },
  { id: 'm04_fog', title: 'Burn through the fog-wall', description: 'With both cairns lit, the fog-wall parts.', category: 'primary', initialStatus: 'locked', requires: ['m04_cairn_north', 'm04_cairn_south'], condition: { type: 'all', conditions: [{ type: 'flag', flag: 'cairn_north' }, { type: 'flag', flag: 'cairn_south' }] }, markerSiteId: 'm04_fog_gate' },
  { id: 'm04_well', title: 'The Norns’ Well', description: 'Defeat the wyrm brood at the Well (3 Lindworms, 1 Storm Lindworm) and pay 500 Gold and 3 Crystal to read the water.', category: 'primary', initialStatus: 'locked', requires: ['m04_fog'], condition: { type: 'site_activated', siteId: 'm04_well' }, markerSiteId: 'm04_well' },
  { id: 'm04_nest', title: 'Lindworm crags (optional)', description: 'Defeat the 2 Lindworms on the crags for 5 Crystal.', category: 'optional', initialStatus: 'active', condition: { type: 'site_cleared', siteId: 'm04_nest' }, markerSiteId: 'm04_nest' },
  { id: 'm04_wanderer', title: 'A grey wanderer (optional)', description: 'Someone has made a fire on the north shore.', category: 'optional', initialStatus: 'active', condition: { type: 'site_visited', siteId: 'm04_wanderer' }, markerSiteId: 'm04_wanderer' },
];

const M04_SITES: SiteDefinition[] = [
  { id: 'm04_town', anchorId: 'm04_town', coord: { q: 3, r: 9 }, name: 'Skarvik', description: 'A harbour-hold whose harbour is ice.', kind: { type: 'town', townId: 'skarvik' } },
  resSite('m04_sawmill', 5, 5, 'sawmill'),
  resSite('m04_quarry', 5, 13, 'quarry'),
  {
    id: 'm04_wanderer',
    anchorId: 'm04_wanderer',
    coord: { q: 7, r: 3 },
    name: 'A Fire on the Shore',
    description: 'A traveller in a broad hat and a grey cloak sits by a small fire.',
    kind: {
      type: 'map_event',
      title: 'The Grey Wanderer',
      text: 'He has one eye and two ravens, and he knows your name before you say it. “You are going to the Well,” he says. “Good. Ask it the right question. And it is cold out on the ice — I have a spare cloak, if you have a spare seat by my fire.”',
      options: [
        { label: 'Give him your seat by the fire', summary: 'Hervor receives the Wanderer’s Grey Cloak (+2 vision, +5% daily land movement).', reward: { artifactIds: ['wanderers_grey_cloak'] } },
        { label: 'Trade him mead for a rune', summary: 'Hervor gains +1 Spell Power.', reward: { attributes: { power: 1 } } },
      ],
    },
    objectiveIds: ['m04_wanderer'],
  },
  { id: 'm04_knarr', anchorId: 'm04_knarr', coord: { q: 8, r: 15 }, name: 'Frozen Knarr', description: 'A merchant ship caught by the ice with its cargo aboard.', kind: { type: 'pickup', reward: { resources: { gold: 1000, wood: 5 } } } },
  {
    id: 'm04_landing',
    anchorId: 'm04_landing',
    coord: { q: 11, r: 9 },
    name: 'Ice-landing',
    description: 'The one place where the shore ice is thick enough to carry an army onto the sound.',
    kind: { type: 'crossing' },
    guard: {
      label: 'Nail-ship crew',
      army: [
        { creatureId: 'norse_draugr', count: 20 },
        { creatureId: 'norse_deathless_draugr', count: 8 },
      ],
      reward: { resources: { gold: 800, favor: 3 } },
      battlefield: 'coast_road',
    },
    objectiveIds: ['m04_landing'],
  },
  {
    id: 'm04_nail_ship',
    anchorId: 'm04_nail_ship',
    coord: { q: 14, r: 9 },
    name: 'Ship of Nails',
    description: 'A ship built from the uncut nails of the dead, frozen into the sound.',
    kind: {
      type: 'map_event',
      title: 'The Ship of Nails',
      text: 'Close up it is worse: every plank is nails, packed and grey. The draugr crew sailed it here and left it to wait for the thaw. Burn it, and it will never carry the dead anywhere. Or strip its iron — the smiths of Skarvik would pay well.',
      options: [
        { label: 'Burn it', summary: '+5 Favor; Hervor gains 500 experience.', reward: { resources: { favor: 5 }, questXp: 500 } },
        { label: 'Strip its iron', summary: '+1,200 Gold and +5 Stone.', reward: { resources: { gold: 1200, stone: 5 } } },
      ],
    },
  },
  cairn('m04_cairn_north', 15, 4, 'cairn_north', 'Northern Way-cairn'),
  cairn('m04_cairn_south', 15, 14, 'cairn_south', 'Southern Way-cairn'),
  {
    id: 'm04_nest',
    anchorId: 'm04_nest',
    coord: { q: 17, r: 16 },
    name: 'Lindworm Crags',
    description: 'Wingless dragons sun themselves on black crags, on beds of crystal.',
    kind: { type: 'landmark', landmark: 'quarry_cache' },
    guard: { label: 'Crag lindworms', army: [{ creatureId: 'norse_lindworm', count: 2 }], reward: { resources: { crystal: 5 } }, battlefield: 'plateau' },
    objectiveIds: ['m04_nest'],
  },
  { id: 'm04_fog_gate', anchorId: 'm04_fog_gate', coord: { q: 19, r: 9 }, name: 'Fog-wall', description: 'A wall of freezing fog across the sound. Both way-cairns must burn to part it.', kind: { type: 'gate', openWhenFlags: ['cairn_north', 'cairn_south'] }, objectiveIds: ['m04_fog'] },
  {
    id: 'm04_well',
    anchorId: 'm04_well',
    coord: { q: 24, r: 9 },
    name: 'The Norns’ Well',
    description: 'A spring that does not freeze, on an island at the end of the sound.',
    kind: {
      type: 'activation',
      label: 'beacon',
      cost: { gold: 500, crystal: 3 },
      requirements: [
        { type: 'mission_flag', flag: 'cairn_north' },
        { type: 'mission_flag', flag: 'cairn_south' },
      ],
      reward: { questXp: 2200, artifactIds: ['brisingamen_link'] },
      completesMission: true,
      confirmText: 'Read the water of the Norns’ Well? This completes Ice on the Sound.',
    },
    guard: {
      label: 'Wyrm brood',
      army: [
        { creatureId: 'norse_lindworm', count: 3 },
        { creatureId: 'norse_storm_lindworm', count: 1 },
      ],
      reward: { resources: { gold: 1000 } },
      battlefield: 'beacon_clearing',
    },
    objectiveIds: ['m04_well'],
  },
];

const M04: MissionDefinition = {
  ...COMMON,
  id: 'winter_oath_m04',
  scenarioId: 'winter_oath_m04',
  order: 4,
  name: 'Ice on the Sound',
  subtitle: 'Mission 4 — Seek',
  summary: 'Only the Norns know the Grey Jarl’s oath. Raise Lindworms, take the ice-landing, light both way-cairns through the fog and read the water of the Norns’ Well — while a draugr crew walks the ice.',
  mapTemplateId: 'winter_oath_m04_v1',
  soundscape: 'coast',
  targetPlaytime: '25–30 minutes (target, unmeasured)',
  newDecisions: ['Avoid or fight a patrol', 'Light two cairns', 'Shooters in a Norse army'],
  xpCap: 7999,
  xpCapLevel: 6,
  briefing: [
    SKEGGI('Every oath ever sworn is a thread at the Norns’ well. If we want the Jarl’s, we go where the threads are.'),
    HERVOR('The well is at the end of the sound. The sound is ice, the ice has a fog on it, and the fog has a ship in it full of his dead.'),
    EYDIS('Then take the Lindworms. They see through fog. And come back before the ice does something unkind.'),
  ],
  victory: [
    HERVOR('His name was Hrolf. He was a king, a thousand winters ago, and he swore to hold the winter under his mound in exchange for a kingdom when it ended.'),
    SKEGGI('And the winter never ended, so the kingdom never came. He has been keeping a bargain nobody else remembers.'),
    HERVOR('Someone remembers. The water showed me a jarl in a white hall who swore to help him. Ulfhild of Hvitstrand.'),
  ],
  storyScenes: [
    {
      id: 'm04_patrol',
      trigger: { type: 'battle_started', heroDefinitionId: 'norse_bone_helm' },
      lines: [P('Bone-Helm', 'The sound is ours until the thaw, seeress. And there will be no thaw.', 'bone_helm')],
    },
    {
      id: 'm04_fog_parts',
      trigger: { type: 'objective_completed', objectiveId: 'm04_fog' },
      lines: [
        SKEGGI('There — the island. And steam on the water. The well is still warm.'),
        HERVOR('Of course it is. The Norns do not care whose winter it is.'),
      ],
    },
    {
      id: 'm04_cloak',
      trigger: { type: 'site_visited', siteId: 'm04_wanderer' },
      lines: [SKEGGI('One eye, two ravens and a grey cloak. You know who that was, Hervor. Do not tell me you do not.')],
    },
    {
      id: 'm04_losses',
      trigger: { type: 'casualties', minLost: 10 },
      lines: [EYDIS('The ice took some of them through the cracks before the enemy did. I am writing them down anyway.')],
    },
  ],
  debriefPolicy: DEBRIEF_POLICY,
  player: {
    playerId: 'player',
    name: 'Skarvik',
    pantheonId: 'norse',
    wallet: { gold: 12000, wood: 25, stone: 30, crystal: 12, favor: 10 },
    town: {
      townId: 'skarvik',
      siteId: 'm04_town',
      name: 'Skarvik',
      archetypeId: 'norse_hold',
      buildings: [
        'norse_longhouse', 'norse_jarls_hall', 'norse_mead_hall', 'norse_trading_post', 'norse_palisade', 'norse_stronghold', 'norse_barrow', 'norse_barrow_up',
        'norse_wolf_den', 'norse_wolf_den_up', 'norse_smithy', 'norse_rune_circle_1', 'norse_hof_1', 'norse_hof_2', 'norse_valkyrie_aerie', 'norse_valkyrie_aerie_up', 'norse_troll_cave',
      ],
      population: { norse_draugr: 14, norse_frost_wolf: 9, norse_frost_troll: 6, norse_valkyrie: 4 },
      covenants: ['norse_frost_troll'],
    },
    hero: hervor(
      { level: 4, xp: 3600, attributes: { attack: 2, defense: 2, power: 4, knowledge: 3 }, skills: [{ skillId: 'wisdom', rank: 2 }, { skillId: 'armorer', rank: 1 }, { skillId: 'leadership', rank: 1 }], spellbook: true },
      [
        { creatureId: 'norse_deathless_draugr', count: 36 },
        { creatureId: 'norse_fenrir_wolf', count: 12 },
        { creatureId: 'norse_frost_troll', count: 4 },
        { creatureId: 'norse_battle_valkyrie', count: 3 },
      ],
      'skarvik',
    ),
  },
  hostilePlayer: { playerId: 'winter_host', name: 'The Winter Host' },
  purchasableBuildingIds: ['norse_lindworm_roost', 'norse_lindworm_roost_up', 'norse_troll_cave_up', 'norse_rune_circle_2', 'norse_rune_circle_3', 'norse_rune_merchant', 'norse_high_hall', 'norse_storehouse', 'norse_watchtower', 'norse_training_ground'],
  committableGodIds: FIRST_GODS,
  sites: M04_SITES,
  objectives: M04_OBJECTIVES,
  hostileHeroes: [
    {
      commander: {
        heroDefinitionId: 'norse_bone_helm',
        name: 'Bone-Helm',
        classId: 'huscarl',
        level: 3,
        attributes: { attack: 3, defense: 3, power: 1, knowledge: 1 },
        skills: [
          { skillId: 'offense', rank: 1 },
          { skillId: 'armorer', rank: 1 },
        ],
        spellbook: false,
        spellIds: [],
        mana: 10,
        portraitAssetId: 'hero.norse.bone_helm.portrait',
      },
      startCoord: { q: 16, r: 10 },
      army: [
        { creatureId: 'norse_deathless_draugr', count: 16 },
        { creatureId: 'norse_fenrir_wolf', count: 6 },
      ],
      ai: {
        profile: 'patrol',
        waypoints: [
          { q: 13, r: 6 },
          { q: 17, r: 8 },
          { q: 13, r: 12 },
          { q: 16, r: 10 },
        ],
        regionMinQ: 12,
        regionMaxQ: 18,
        attackThreshold: { numerator: 11, denominator: 10 },
      },
    },
  ],
  helpTopics: [
    { id: 'patrol', title: 'The ice patrol', text: 'Bone-Helm’s crew takes one ordinary turn after yours each day, cannot see through fog and never leaves the sound between the landing and the fog-wall.' },
    { id: 'cairns', title: 'Cairns and the fog-wall', text: 'The landing reaches both cairns. Only both cairns together part the fog-wall.' },
    { id: 'shooters', title: 'Lindworms', text: 'Lindworms are the only Norse shooters. Keep them behind the draugr line and let the wolves deal with enemy archers.' },
  ],
  thumbnailAssetId: 'mission.winter_oath.m04.thumbnail',
};

// ---------------------------------------------------------------------------
// M05 — The Jarl of Hvitstrand (Contest)
// ---------------------------------------------------------------------------

const M05_OBJECTIVES: ObjectiveDefinition[] = [
  {
    id: 'm05_crossing',
    title: 'Cross the Hvita',
    description: 'Clear either ford over the frozen Hvita: the north ford (8 Frost Trolls) or the south ford (24 Draugar, 10 Deathless Draugar).',
    category: 'primary',
    initialStatus: 'active',
    condition: { type: 'any', conditions: [{ type: 'site_cleared', siteId: 'm05_north_ford' }, { type: 'site_cleared', siteId: 'm05_south_ford' }] },
    hint: 'Either ford is enough. Ulfhild’s war-band can use a cleared ford too.',
  },
  { id: 'm05_second_god', title: 'A second god', description: 'Raise the High Hall and commit to Freyja, Heimdall or Hel (25 Favor, irreversible).', category: 'primary', initialStatus: 'locked', requires: ['m05_crossing'], condition: { type: 'player_has_minor_god', count: 2 }, hint: 'The second god needs Hof II and the High Hall in Ravnholt. A god chosen earlier counts as soon as this step opens.' },
  { id: 'm05_take_town', title: 'Take Hvitstrand', description: 'Besiege and take Jarl Ulfhild’s town of Hvitstrand.', category: 'primary', initialStatus: 'locked', requires: ['m05_second_god'], condition: { type: 'town_owned', townId: 'hvitstrand' }, markerSiteId: 'm05_rival_town', reward: { artifactIds: ['valkyries_horn'] }, hint: 'Ulfhild is a full empire run by the AI: she builds, recruits and may come for Ravnholt. Leave a garrison at home.' },
  { id: 'm05_oath_stone', title: 'Break Ulfhild’s oath', description: 'With Hvitstrand taken, pay 500 Gold and 2 Crystal to cut the counter-rune on her oath-stone.', category: 'primary', initialStatus: 'locked', requires: ['m05_take_town'], condition: { type: 'site_activated', siteId: 'm05_oath_stone' }, markerSiteId: 'm05_oath_stone' },
  { id: 'm05_ulfhild', title: 'Defeat Ulfhild (optional)', description: 'Defeat Jarl Ulfhild’s war-band in the field.', category: 'optional', initialStatus: 'active', condition: { type: 'hero_defeated', heroDefinitionId: 'norse_ulfhild' } },
  { id: 'm05_andvari', title: 'Andvari’s pool (optional)', description: 'Something glints at the bottom of a pool that never freezes.', category: 'optional', initialStatus: 'active', condition: { type: 'site_visited', siteId: 'm05_andvari' }, markerSiteId: 'm05_andvari' },
];

const M05_SITES: SiteDefinition[] = [
  { id: 'm05_town', anchorId: 'm05_town', coord: { q: 3, r: 10 }, name: 'Ravnholt', description: 'A hold on the west bank of the Hvita that refused Ulfhild’s oath.', kind: { type: 'town', townId: 'ravnholt' } },
  resSite('m05_sawmill', 5, 6, 'sawmill'),
  resSite('m05_quarry', 5, 14, 'quarry'),
  { ...resSite('m05_gold', 8, 16, 'gold_mine'), guard: { label: 'Mine squatters', army: [{ creatureId: 'norse_fenrir_wolf', count: 10 }], reward: { resources: { gold: 500 } }, battlefield: 'open_field' } },
  {
    id: 'm05_andvari',
    anchorId: 'm05_andvari',
    coord: { q: 9, r: 3 },
    name: 'Andvari’s Pool',
    description: 'A pool under a waterfall that has never frozen. A ring lies on the bottom.',
    kind: {
      type: 'map_event',
      title: 'Andvari’s Pool',
      text: 'The ring is gold and heavy, and the water around it is warm. Skeggi will not go near it. “A dwarf cursed that ring,” he says. “It brings gold to whoever wears it, and ruin with the gold. Many have decided the gold is worth it.”',
      options: [
        { label: 'Take the ring', summary: 'Hervor receives Andvari’s Ring (+500 Gold per day, −1 Luck).', reward: { artifactIds: ['andvaris_ring'] } },
        { label: 'Leave it to its curse', summary: '+5 Favor; Hervor gains 300 experience.', reward: { resources: { favor: 5 }, questXp: 300 } },
      ],
    },
    objectiveIds: ['m05_andvari'],
  },
  {
    id: 'm05_north_ford',
    anchorId: 'm05_north_ford',
    coord: { q: 15, r: 6 },
    name: 'North Ford',
    description: 'A ford where the Hvita runs shallow under the ice. Trolls take a toll here.',
    kind: { type: 'crossing' },
    guard: { label: 'Ford trolls', army: [{ creatureId: 'norse_frost_troll', count: 8 }], reward: { resources: { gold: 800 } }, battlefield: 'ridge_pass' },
  },
  {
    id: 'm05_south_ford',
    anchorId: 'm05_south_ford',
    coord: { q: 15, r: 13 },
    name: 'South Ford',
    description: 'The sledge-ford. The Grey Jarl’s dead keep it for Ulfhild.',
    kind: { type: 'crossing' },
    guard: {
      label: 'Ford-dead',
      army: [
        { creatureId: 'norse_draugr', count: 24 },
        { creatureId: 'norse_deathless_draugr', count: 10 },
      ],
      reward: { resources: { gold: 800 } },
      battlefield: 'ridge_pass',
    },
  },
  resSite('m05_crystal', 20, 10, 'crystal_deposit'),
  resSite('m05_rival_quarry', 24, 5, 'quarry'),
  resSite('m05_rival_sawmill', 24, 15, 'sawmill'),
  { id: 'm05_rival_town', anchorId: 'm05_rival_town', coord: { q: 26, r: 10 }, name: 'Hvitstrand', description: 'Jarl Ulfhild’s white hall above the frozen river-mouth.', kind: { type: 'town', townId: 'hvitstrand' }, objectiveIds: ['m05_take_town'] },
  {
    id: 'm05_oath_stone',
    anchorId: 'm05_oath_stone',
    coord: { q: 26, r: 7 },
    name: 'Ulfhild’s Oath-stone',
    description: 'The stone on which Ulfhild swore to keep the Grey Jarl’s winter.',
    kind: {
      type: 'activation',
      label: 'beacon',
      cost: { gold: 500, crystal: 2 },
      requirements: [{ type: 'objective_completed', objectiveId: 'm05_take_town' }],
      reward: { questXp: 2500 },
      completesMission: true,
      confirmText: 'Cut the counter-rune on Ulfhild’s oath-stone? This completes The Jarl of Hvitstrand.',
    },
    objectiveIds: ['m05_oath_stone'],
  },
];

const M05: MissionDefinition = {
  ...COMMON,
  id: 'winter_oath_m05',
  scenarioId: 'winter_oath_m05',
  order: 5,
  name: 'The Jarl of Hvitstrand',
  subtitle: 'Mission 5 — Contest',
  summary: 'Jarl Ulfhild swore to keep the Grey Jarl’s winter for a frozen sea that keeps her rivals’ ships in harbour. Cross the Hvita, win a second god, take Hvitstrand from a living rival and break her oath.',
  mapTemplateId: 'winter_oath_m05_v1',
  soundscape: 'storm_plateau',
  targetPlaytime: '30–40 minutes (target, unmeasured)',
  newDecisions: ['A rival empire', 'A second god', 'Defend and besiege'],
  xpCap: 9999,
  xpCapLevel: 7,
  briefing: [
    P('Ulfhild', 'Hervor of Kaldvik. You are cutting runes all over my north. Every sea-lane you open lets my rivals’ ships out of harbour.'),
    HERVOR('It is not your north, Ulfhild. And people are starving behind those frozen harbours.'),
    P('Ulfhild', 'People are always starving somewhere. I keep my hall full. Come and take it, if you think the gods prefer you.'),
  ],
  victory: [
    HERVOR('The oath-stone is cut. Ulfhild’s word holds nothing for the Grey Jarl now.'),
    SKEGGI('Then he has only his own dead left — and the giants he froze into the glacier to guard his road.'),
  ],
  storyScenes: [
    {
      id: 'm05_crossed',
      trigger: { type: 'objective_completed', objectiveId: 'm05_crossing' },
      lines: [EYDIS('The ford is open — both ways. Ulfhild’s riders will know it by nightfall. I am putting every spear we have on the walls.')],
    },
    {
      id: 'm05_freyja',
      trigger: { type: 'god_committed', godId: 'norse_freyja' },
      lines: [SKEGGI('Freyja. Half the slain go to her hall, they say. She will want the living to fill holds again by spring.')],
    },
    {
      id: 'm05_heimdall',
      trigger: { type: 'god_committed', godId: 'norse_heimdall' },
      lines: [SKEGGI('Heimdall, who hears the grass grow. Ulfhild will not move a sledge without our knowing.')],
    },
    {
      id: 'm05_hel',
      trigger: { type: 'god_committed', godId: 'norse_hel' },
      lines: [SKEGGI('Hel. A hard choice, and an honest one. She knows the dead better than the Grey Jarl ever will.')],
    },
    {
      id: 'm05_ulfhild_battle',
      trigger: { type: 'battle_started', heroDefinitionId: 'norse_ulfhild' },
      lines: [
        P('Ulfhild', 'You should have stayed in your fjord, seeress.'),
        HERVOR('I tried. The winter would not let me.'),
      ],
    },
    {
      id: 'm05_town_taken',
      trigger: { type: 'objective_completed', objectiveId: 'm05_take_town' },
      lines: [
        HERVOR('Hvitstrand is ours. Hang her horn in the hall — no, give it to me. A Valkyrie’s horn should not hang on a wall.'),
        EYDIS('Her people are asking what happens to them now.'),
        HERVOR('The same as ours: they eat, and the ships go out in spring.'),
      ],
    },
    {
      id: 'm05_losses',
      trigger: { type: 'casualties', minLost: 12 },
      lines: [EYDIS('This is the first time we have fought the living, Hervor. Their dead will not stand up again, and neither will ours.')],
    },
  ],
  debriefPolicy: DEBRIEF_POLICY,
  player: {
    playerId: 'player',
    name: 'Ravnholt',
    pantheonId: 'norse',
    wallet: { gold: 15000, wood: 30, stone: 35, crystal: 14, favor: 20 },
    town: {
      townId: 'ravnholt',
      siteId: 'm05_town',
      name: 'Ravnholt',
      archetypeId: 'norse_hold',
      buildings: [
        'norse_longhouse', 'norse_jarls_hall', 'norse_mead_hall', 'norse_trading_post', 'norse_palisade', 'norse_stronghold', 'norse_barrow', 'norse_barrow_up',
        'norse_wolf_den', 'norse_wolf_den_up', 'norse_smithy', 'norse_rune_circle_1', 'norse_rune_circle_2', 'norse_hof_1', 'norse_hof_2',
        'norse_valkyrie_aerie', 'norse_valkyrie_aerie_up', 'norse_troll_cave', 'norse_troll_cave_up', 'norse_lindworm_roost',
      ],
      population: { norse_draugr: 14, norse_frost_wolf: 9, norse_frost_troll: 6, norse_valkyrie: 4, norse_lindworm: 3 },
      covenants: ['norse_frost_troll'],
    },
    hero: hervor(
      { level: 5, xp: 5000, attributes: { attack: 2, defense: 3, power: 4, knowledge: 4 }, skills: [{ skillId: 'wisdom', rank: 2 }, { skillId: 'armorer', rank: 1 }, { skillId: 'leadership', rank: 1 }, { skillId: 'offense', rank: 1 }], spellbook: true },
      [
        { creatureId: 'norse_deathless_draugr', count: 40 },
        { creatureId: 'norse_fenrir_wolf', count: 14 },
        { creatureId: 'norse_ancient_frost_troll', count: 5 },
        { creatureId: 'norse_battle_valkyrie', count: 4 },
        { creatureId: 'norse_lindworm', count: 3 },
      ],
      'ravnholt',
    ),
  },
  rivals: [
    {
      playerId: 'hvitstrand',
      name: 'Hvitstrand',
      controller: 'ai',
      pantheonId: 'norse',
      color: '#c9ced6',
      wallet: { gold: 8000, wood: 20, stone: 20, crystal: 6, favor: 10 },
      town: {
        townId: 'hvitstrand',
        siteId: 'm05_rival_town',
        name: 'Hvitstrand',
        archetypeId: 'norse_hold',
        buildings: ['norse_longhouse', 'norse_jarls_hall', 'norse_mead_hall', 'norse_trading_post', 'norse_palisade', 'norse_stronghold', 'norse_barrow', 'norse_barrow_up', 'norse_wolf_den', 'norse_wolf_den_up', 'norse_smithy', 'norse_valkyrie_aerie', 'norse_hof_1'],
        population: { norse_draugr: 14, norse_frost_wolf: 9, norse_valkyrie: 4 },
        covenants: [],
        // Ulfhild's hall-guard: the town is held even when she rides out.
        garrison: [
          { creatureId: 'norse_deathless_draugr', count: 24 },
          { creatureId: 'norse_fenrir_wolf', count: 8 },
          { creatureId: 'norse_valkyrie', count: 2 },
        ],
      },
      hero: {
        heroId: 'ulfhild',
        definitionId: 'norse_ulfhild',
        classId: 'jarl',
        defaults: { level: 5, xp: 5000, attributes: { attack: 3, defense: 4, power: 1, knowledge: 2 }, skills: [{ skillId: 'leadership', rank: 2 }, { skillId: 'armorer', rank: 1 }, { skillId: 'tactics', rank: 1 }], spellbook: false },
        army: [
          { creatureId: 'norse_deathless_draugr', count: 26 },
          { creatureId: 'norse_fenrir_wolf', count: 10 },
          { creatureId: 'norse_valkyrie', count: 3 },
        ],
        startTownId: 'hvitstrand',
      },
    },
  ],
  purchasableBuildingIds: ['norse_high_hall', 'norse_valkyrie_aerie_up', 'norse_lindworm_roost_up', 'norse_rune_circle_3', 'norse_rune_merchant', 'norse_storehouse', 'norse_watchtower', 'norse_training_ground', 'norse_fortress'],
  committableGodIds: ALL_GODS,
  sites: M05_SITES,
  objectives: M05_OBJECTIVES,
  hostileHeroes: [],
  helpTopics: [
    { id: 'rival', title: 'A rival empire', text: 'Hvitstrand is a full empire run by the AI with the same rules as yours: it builds, recruits, takes mines and may besiege Ravnholt. Losing Ravnholt does not end the mission; losing Hervor does.' },
    { id: 'second_god', title: 'The second god', text: 'A second minor god (Freyja, Heimdall or Hel) needs your first god, Hof II and the High Hall, and costs 25 Favor.' },
    { id: 'siege', title: 'Sieges', text: 'Entering an enemy town that has a garrison or a visiting hero starts a siege. Walls and towers favour the defender; Lindworms shoot over them.' },
  ],
  thumbnailAssetId: 'mission.winter_oath.m05.thumbnail',
};

// ---------------------------------------------------------------------------
// M06 — The Giants' Refuge (Bind)
// ---------------------------------------------------------------------------

const M06_OBJECTIVES: ObjectiveDefinition[] = [
  {
    id: 'm06_approach',
    title: 'Climb onto the glacier',
    description: 'Clear either crossing of the glacier wall: north (8 Frost Trolls, 2 Ancient Frost Trolls) or south (24 Deathless Draugar, 6 Fenrir Wolves).',
    category: 'primary',
    initialStatus: 'active',
    condition: { type: 'any', conditions: [{ type: 'site_cleared', siteId: 'm06_north_crossing' }, { type: 'site_cleared', siteId: 'm06_south_crossing' }] },
  },
  { id: 'm06_refuge', title: 'Break the ice-wardens', description: 'Defeat the Jarl’s wardens at Hrimgard (30 Deathless Draugar, 3 Ancient Frost Trolls, 2 Storm Lindworms) and free the frozen giants.', category: 'primary', initialStatus: 'locked', requires: ['m06_approach'], condition: { type: 'site_cleared', siteId: 'm06_refuge' }, markerSiteId: 'm06_refuge' },
  { id: 'm06_claim', title: 'Claim the Jotunn covenant', description: 'Accept the giants’ oath in the journal. It can then be assigned to Jokulsby.', category: 'primary', initialStatus: 'locked', condition: { type: 'claim', after: ['m06_refuge'] }, reward: { entitlementIds: ['covenant.norse_jotunn.wo6'] } },
  { id: 'm06_giants', title: 'Giants in the war-band', description: 'Assign the covenant, build the Jotunn Camp and have at least 2 Jotnar in Hervor’s army.', category: 'primary', initialStatus: 'locked', requires: ['m06_claim'], condition: { type: 'hero_army_contains', heroId: 'hervor', creatureId: 'norse_jotunn', count: 2 }, live: true, hint: 'The Jotunn Camp needs Hof II, the Valkyrie Aerie and the assigned covenant. Recruit with Hervor in town.' },
  { id: 'm06_hrafn', title: 'Hrafn the Hollow', description: 'Defeat Hrafn and the glacier-gate guard (30 Deathless Draugar, 10 Fenrir Wolves, 4 Ancient Frost Trolls, 3 Battle Valkyries).', category: 'primary', initialStatus: 'locked', requires: ['m06_giants'], condition: { type: 'site_cleared', siteId: 'm06_glacier_gate' }, markerSiteId: 'm06_glacier_gate' },
  { id: 'm06_horn', title: 'Sound the giants’ horn', description: 'With the gate open, pay 500 Gold and 10 Favor to sound the horn of Hrimgard and wake the road to the Jarl’s hall.', category: 'primary', initialStatus: 'locked', requires: ['m06_hrafn'], condition: { type: 'site_activated', siteId: 'm06_horn' }, markerSiteId: 'm06_horn' },
  { id: 'm06_child', title: 'The ice-bound child (optional)', description: 'A small shape in the ice near the north crossing.', category: 'optional', initialStatus: 'active', condition: { type: 'site_visited', siteId: 'm06_frozen_child' }, markerSiteId: 'm06_frozen_child' },
  { id: 'm06_nest', title: 'Storm crags (optional)', description: 'Defeat the 2 Storm Lindworms on the crags for 6 Crystal.', category: 'optional', initialStatus: 'active', condition: { type: 'site_cleared', siteId: 'm06_nest' }, markerSiteId: 'm06_nest' },
];

const M06_SITES: SiteDefinition[] = [
  { id: 'm06_town', anchorId: 'm06_town', coord: { q: 3, r: 10 }, name: 'Jokulsby', description: 'A shepherds’ hold under the glacier wall.', kind: { type: 'town', townId: 'jokulsby' } },
  resSite('m06_sawmill', 5, 6, 'sawmill'),
  resSite('m06_quarry', 5, 14, 'quarry'),
  resSite('m06_gold', 7, 16, 'gold_mine'),
  {
    id: 'm06_north_crossing',
    anchorId: 'm06_north_crossing',
    coord: { q: 11, r: 6 },
    name: 'North Crossing',
    description: 'An ice-ramp up the glacier wall, held by trolls in the Jarl’s pay.',
    kind: { type: 'crossing' },
    guard: {
      label: 'Ramp trolls',
      army: [
        { creatureId: 'norse_frost_troll', count: 8 },
        { creatureId: 'norse_ancient_frost_troll', count: 2 },
      ],
      reward: { resources: { gold: 1000 } },
      battlefield: 'ridge_pass',
    },
  },
  {
    id: 'm06_south_crossing',
    anchorId: 'm06_south_crossing',
    coord: { q: 11, r: 13 },
    name: 'South Crossing',
    description: 'A cleft in the glacier wall full of the Jarl’s dead.',
    kind: { type: 'crossing' },
    guard: {
      label: 'Cleft-dead',
      army: [
        { creatureId: 'norse_deathless_draugr', count: 24 },
        { creatureId: 'norse_fenrir_wolf', count: 6 },
      ],
      reward: { resources: { gold: 1000 } },
      battlefield: 'ridge_pass',
    },
  },
  {
    id: 'm06_frozen_child',
    anchorId: 'm06_frozen_child',
    coord: { q: 15, r: 3 },
    name: 'The Ice-bound Child',
    description: 'A giant’s child, taller than a horse, frozen in a block of blue ice next to a cairn of offerings.',
    kind: {
      type: 'map_event',
      title: 'The Ice-bound Child',
      text: 'Someone has been leaving offerings at the child’s feet — coins, a comb, a carved horse. The ice is old, but it is only ice. With fire and patience, it would come off.',
      options: [
        { label: 'Thaw the child', summary: '+10 Favor; Hervor gains 600 experience.', reward: { resources: { favor: 10 }, questXp: 600 } },
        { label: 'Take the offerings and go on', summary: '+1,500 Gold.', reward: { resources: { gold: 1500 } } },
      ],
    },
    objectiveIds: ['m06_child'],
  },
  {
    id: 'm06_refuge',
    anchorId: 'm06_refuge',
    coord: { q: 16, r: 10 },
    name: 'Hrimgard',
    description: 'The giants’ old hall, sealed in glacier ice. The Jarl’s wardens keep the ice whole.',
    kind: { type: 'landmark', landmark: 'refuge' },
    guard: {
      label: 'Ice-wardens',
      army: [
        { creatureId: 'norse_deathless_draugr', count: 30 },
        { creatureId: 'norse_ancient_frost_troll', count: 3 },
        { creatureId: 'norse_storm_lindworm', count: 2 },
      ],
      reward: { resources: { gold: 1500 } },
      battlefield: 'plateau',
    },
    objectiveIds: ['m06_refuge'],
  },
  {
    id: 'm06_nest',
    anchorId: 'm06_nest',
    coord: { q: 17, r: 17 },
    name: 'Storm Crags',
    description: 'Storm Lindworms nest where the glacier calves into the sea.',
    kind: { type: 'landmark', landmark: 'quarry_cache' },
    guard: { label: 'Storm lindworms', army: [{ creatureId: 'norse_storm_lindworm', count: 2 }], reward: { resources: { crystal: 6 } }, battlefield: 'plateau' },
    objectiveIds: ['m06_nest'],
  },
  {
    id: 'm06_glacier_gate',
    anchorId: 'm06_glacier_gate',
    coord: { q: 22, r: 10 },
    name: 'Glacier Gate',
    description: 'An arch of black ice on the road north. Hrafn the Hollow holds it.',
    kind: { type: 'crossing' },
    guard: {
      label: 'Hrafn and the gate-guard',
      army: [
        { creatureId: 'norse_deathless_draugr', count: 30 },
        { creatureId: 'norse_fenrir_wolf', count: 10 },
        { creatureId: 'norse_ancient_frost_troll', count: 4 },
        { creatureId: 'norse_battle_valkyrie', count: 3 },
      ],
      commander: {
        heroDefinitionId: 'norse_hrafn',
        name: 'Hrafn the Hollow',
        classId: 'huscarl',
        level: 6,
        attributes: { attack: 5, defense: 4, power: 1, knowledge: 1 },
        skills: [
          { skillId: 'offense', rank: 2 },
          { skillId: 'armorer', rank: 1 },
          { skillId: 'tactics', rank: 1 },
        ],
        spellbook: false,
        spellIds: [],
        mana: 10,
        portraitAssetId: 'hero.norse.hrafn.portrait',
      },
      reward: { resources: { gold: 1500 }, artifactIds: ['einherjar_mail'] },
      battlefield: 'ridge_pass',
    },
    objectiveIds: ['m06_hrafn'],
  },
  {
    id: 'm06_horn',
    anchorId: 'm06_horn',
    coord: { q: 26, r: 10 },
    name: 'Horn of Hrimgard',
    description: 'A horn as long as a longship, hung in an ice-arch. Its note carries to the end of the world.',
    kind: {
      type: 'activation',
      label: 'beacon',
      cost: { gold: 500, favor: 10 },
      requirements: [{ type: 'objective_completed', objectiveId: 'm06_hrafn' }],
      reward: { questXp: 2800 },
      completesMission: true,
      confirmText: 'Sound the Horn of Hrimgard? This completes The Giants’ Refuge.',
    },
    objectiveIds: ['m06_horn'],
  },
];

const M06: MissionDefinition = {
  ...COMMON,
  id: 'winter_oath_m06',
  scenarioId: 'winter_oath_m06',
  order: 6,
  name: 'The Giants’ Refuge',
  subtitle: 'Mission 6 — Bind',
  summary: 'The Grey Jarl froze the giants of Hrimgard into the glacier to guard his road. Climb the glacier wall, break the ice-wardens, win the Jotnar’s oath and defeat Hrafn the Hollow at the Glacier Gate.',
  mapTemplateId: 'winter_oath_m06_v1',
  soundscape: 'storm_plateau',
  targetPlaytime: '30–35 minutes (target, unmeasured)',
  newDecisions: ['Choose a crossing', 'Raise giants', 'Defeat a commander'],
  xpCap: 12199,
  xpCapLevel: 8,
  briefing: [
    SKEGGI('Long before the Jarl, the giants of Hrimgard kept the winter on the glacier where it belonged. He froze them in their own hall and set his dead to watch the ice.'),
    HERVOR('So the winter’s old keepers are its prisoners now. Then we free them, and ask what they think of the Jarl.'),
    EYDIS('Ask politely. A giant’s handshake has broken better arms than yours.'),
  ],
  victory: [
    P('Jökul', 'The horn has not sounded in a thousand winters, small seeress. Now the Jarl knows you are coming. So do we. We will walk with you to his door.', 'jokul'),
    HERVOR('Then the road is open. One hall left.'),
  ],
  storyScenes: [
    {
      id: 'm06_freed',
      trigger: { type: 'site_cleared', siteId: 'm06_refuge' },
      lines: [
        P('Jökul', 'Warm hands. I had forgotten. Who are you, to break the Jarl’s ice?', 'jokul'),
        HERVOR('The one who woke his sword. I am trying to put it back to sleep.'),
        P('Jökul', 'Then the Jotnar will swear to your hold. Claim our oath, and raise a camp where my kin can stand.', 'jokul'),
      ],
    },
    {
      id: 'm06_child_thawed',
      trigger: { type: 'site_visited', siteId: 'm06_frozen_child' },
      lines: [SKEGGI('Whatever you chose there, the giants will hear of it. Giants hear everything that happens on the ice.')],
    },
    {
      id: 'm06_hrafn_battle',
      trigger: { type: 'battle_started', siteId: 'm06_glacier_gate' },
      lines: [
        P('Hrafn', 'The Valkyries chose me once. I walked out of their hall because the Jarl promised me a war that never ends. Do you know how rare that is?', 'hrafn'),
        HERVOR('A war that never ends is only a winter with weapons, Hrafn.'),
      ],
    },
    {
      id: 'm06_mail',
      trigger: { type: 'site_cleared', siteId: 'm06_glacier_gate' },
      lines: [HERVOR('The mail he wore came from the hall of the chosen. Sword, shield, horn — and now the mail. The Valkyries are dressing me for something.')],
    },
    {
      id: 'm06_losses',
      trigger: { type: 'casualties', minLost: 14 },
      lines: [EYDIS('The glacier keeps our dead better than any barrow. I will come back for their names when it is over.')],
    },
  ],
  debriefPolicy: DEBRIEF_POLICY,
  player: {
    playerId: 'player',
    name: 'Jokulsby',
    pantheonId: 'norse',
    wallet: { gold: 18000, wood: 30, stone: 35, crystal: 16, favor: 25 },
    town: {
      townId: 'jokulsby',
      siteId: 'm06_town',
      name: 'Jokulsby',
      archetypeId: 'norse_hold',
      buildings: [
        'norse_longhouse', 'norse_jarls_hall', 'norse_high_hall', 'norse_mead_hall', 'norse_trading_post', 'norse_palisade', 'norse_stronghold', 'norse_barrow', 'norse_barrow_up',
        'norse_wolf_den', 'norse_wolf_den_up', 'norse_smithy', 'norse_rune_circle_1', 'norse_rune_circle_2', 'norse_hof_1', 'norse_hof_2',
        'norse_valkyrie_aerie', 'norse_valkyrie_aerie_up', 'norse_troll_cave', 'norse_troll_cave_up', 'norse_lindworm_roost', 'norse_lindworm_roost_up',
      ],
      population: { norse_draugr: 14, norse_frost_wolf: 9, norse_frost_troll: 6, norse_valkyrie: 4, norse_lindworm: 3 },
      covenants: ['norse_frost_troll'],
    },
    hero: hervor(
      { level: 6, xp: 6600, attributes: { attack: 2, defense: 3, power: 5, knowledge: 4 }, skills: [{ skillId: 'wisdom', rank: 2 }, { skillId: 'armorer', rank: 2 }, { skillId: 'leadership', rank: 1 }, { skillId: 'offense', rank: 1 }], spellbook: true },
      [
        { creatureId: 'norse_deathless_draugr', count: 44 },
        { creatureId: 'norse_fenrir_wolf', count: 16 },
        { creatureId: 'norse_ancient_frost_troll', count: 6 },
        { creatureId: 'norse_battle_valkyrie', count: 6 },
        { creatureId: 'norse_storm_lindworm', count: 3 },
      ],
      'jokulsby',
    ),
  },
  hostilePlayer: { playerId: 'winter_host', name: 'The Winter Host' },
  purchasableBuildingIds: ['norse_jotunn_camp', 'norse_jotunn_camp_up', 'norse_rune_circle_3', 'norse_rune_merchant', 'norse_fortress', 'norse_storehouse', 'norse_watchtower', 'norse_training_ground', 'norse_hall_of_kings'],
  committableGodIds: ALL_GODS,
  sites: M06_SITES,
  objectives: M06_OBJECTIVES,
  hostileHeroes: [
    {
      commander: {
        heroDefinitionId: 'norse_glacier_trolls',
        name: 'Glacier Trolls',
        classId: 'huscarl',
        level: 1,
        attributes: { attack: 0, defense: 0, power: 0, knowledge: 0 },
        skills: [],
        spellbook: false,
        spellIds: [],
        mana: 0,
        portraitAssetId: 'creature.norse.tier3.upgraded.portrait',
      },
      monster: { bounty: { gold: 900, crystal: 1 } },
      startCoord: { q: 18, r: 6 },
      army: [{ creatureId: 'norse_ancient_frost_troll', count: 6 }],
      ai: {
        profile: 'patrol',
        waypoints: [
          { q: 18, r: 6 },
          { q: 19, r: 8 },
          { q: 17, r: 7 },
        ],
        regionMinQ: 12,
        regionMaxQ: 21,
        regionCenter: { q: 18, r: 6 },
        regionRadius: 3,
        attackThreshold: { numerator: 3, denominator: 2 },
      },
    },
  ],
  helpTopics: [
    { id: 'claim', title: 'Claiming an oath', text: 'Some rewards wait in the journal until you claim them. A claimed covenant is assigned to a town on the Town screen.' },
    { id: 'jotnar', title: 'Jotnar', text: 'Jotnar are slow, enormous and hard to kill. Two of them change a battle; protect them from shooters with Valkyries or wolves.' },
    { id: 'commander', title: 'Guard commanders', text: 'A guard led by a commander fights with that commander’s attack, defense and skills, like a hero.' },
  ],
  thumbnailAssetId: 'mission.winter_oath.m06.thumbnail',
};

// ---------------------------------------------------------------------------
// M07 — Oathbreaker's Hall (Endure)
// ---------------------------------------------------------------------------

const stone = (id: string, q: number, r: number, flag: string, name: string): SiteDefinition => ({
  id,
  anchorId: id,
  coord: { q, r },
  name,
  description: 'One of the two stones that seal the barrow-gate.',
  kind: {
    type: 'activation',
    label: 'relay',
    cost: { gold: 300, stone: 3 },
    requirements: [],
    reward: { flags: [flag] },
    completesMission: false,
    confirmText: `Cut the counter-rune on the ${name}? Both stones open the barrow-gate.`,
  },
  markerHiddenUntilRevealed: false,
  objectiveIds: [id],
});

const M07_OBJECTIVES: ObjectiveDefinition[] = [
  {
    id: 'm07_approach',
    title: 'Onto the plateau',
    description: 'Clear either crossing of the plateau wall. One is enough to reach both rune-stones.',
    category: 'primary',
    initialStatus: 'active',
    condition: { type: 'any', conditions: [{ type: 'site_cleared', siteId: 'm07_north_crossing' }, { type: 'site_cleared', siteId: 'm07_south_crossing' }] },
  },
  { id: 'm07_stone_north', title: 'The north stone', description: 'Cut the counter-rune on the north stone (300 Gold, 3 Stone).', category: 'primary', initialStatus: 'locked', requires: ['m07_approach'], condition: { type: 'site_activated', siteId: 'm07_stone_north' }, markerSiteId: 'm07_stone_north' },
  { id: 'm07_stone_south', title: 'The south stone', description: 'Cut the counter-rune on the south stone (300 Gold, 3 Stone).', category: 'primary', initialStatus: 'locked', requires: ['m07_approach'], condition: { type: 'site_activated', siteId: 'm07_stone_south' }, markerSiteId: 'm07_stone_south' },
  { id: 'm07_gate', title: 'Open the barrow-gate', description: 'With both stones cut, the barrow-gate opens.', category: 'primary', initialStatus: 'locked', requires: ['m07_stone_north', 'm07_stone_south'], condition: { type: 'all', conditions: [{ type: 'flag', flag: 'stone_north' }, { type: 'flag', flag: 'stone_south' }] }, markerSiteId: 'm07_barrow_gate' },
  { id: 'm07_jarl', title: 'The Grey Jarl', description: 'Defeat the Grey Jarl in his hall (2 Ancient Frost Trolls, 40 Deathless Draugar, 12 Fenrir Wolves, 2 Runic Jotnar, 2 Storm Lindworms).', category: 'primary', initialStatus: 'locked', requires: ['m07_gate'], condition: { type: 'site_cleared', siteId: 'm07_jarl_hall' }, markerSiteId: 'm07_jarl_hall' },
  { id: 'm07_choice', title: 'The sword', description: 'At the barrow-door, decide what becomes of the sword.', category: 'primary', initialStatus: 'locked', requires: ['m07_jarl'], condition: { type: 'any', conditions: [{ type: 'flag', flag: 'sword_returned' }, { type: 'flag', flag: 'sword_broken' }] }, markerSiteId: 'm07_barrow_door' },
  { id: 'm07_seal', title: 'Seal the oath', description: 'At the oath-mound, pay 1,000 Gold, 3 Crystal and 10 Favor to seal the oath and end the long winter.', category: 'primary', initialStatus: 'locked', requires: ['m07_choice'], condition: { type: 'site_activated', siteId: 'm07_oath_mound' }, markerSiteId: 'm07_oath_mound' },
  { id: 'm07_nest', title: 'Wyrm crags (optional)', description: 'Defeat the 3 Storm Lindworms on the crags for 6 Crystal.', category: 'optional', initialStatus: 'active', condition: { type: 'site_cleared', siteId: 'm07_nest' }, markerSiteId: 'm07_nest' },
];

const M07_SITES: SiteDefinition[] = [
  { id: 'm07_town', anchorId: 'm07_town', coord: { q: 3, r: 10 }, name: 'Isafold', description: 'A hunters’ hold at the edge of the glacier plateau — the last one before the Jarl’s mound.', kind: { type: 'town', townId: 'isafold' } },
  resSite('m07_sawmill', 5, 6, 'sawmill'),
  resSite('m07_quarry', 5, 14, 'quarry'),
  {
    id: 'm07_north_crossing',
    anchorId: 'm07_north_crossing',
    coord: { q: 10, r: 6 },
    name: 'North Ice-stair',
    description: 'Steps cut in the ice by the Jarl’s dead.',
    kind: { type: 'crossing' },
    guard: {
      label: 'Stair-dead',
      army: [
        { creatureId: 'norse_deathless_draugr', count: 30 },
        { creatureId: 'norse_fenrir_wolf', count: 6 },
      ],
      reward: { resources: { gold: 1000 } },
      battlefield: 'ridge_pass',
    },
  },
  {
    id: 'm07_south_crossing',
    anchorId: 'm07_south_crossing',
    coord: { q: 10, r: 13 },
    name: 'South Ice-stair',
    description: 'Two giants who never woke, bound to the Jarl by a rune on their brows.',
    kind: { type: 'crossing' },
    guard: {
      label: 'Rune-bound giants',
      army: [
        { creatureId: 'norse_jotunn', count: 2 },
        { creatureId: 'norse_deathless_draugr', count: 12 },
      ],
      reward: { resources: { gold: 1000 } },
      battlefield: 'ridge_pass',
    },
  },
  stone('m07_stone_north', 15, 4, 'stone_north', 'North Stone'),
  stone('m07_stone_south', 15, 15, 'stone_south', 'South Stone'),
  {
    id: 'm07_nest',
    anchorId: 'm07_nest',
    coord: { q: 18, r: 17 },
    name: 'Wyrm Crags',
    description: 'Storm Lindworms circle a crag of blue crystal.',
    kind: { type: 'landmark', landmark: 'quarry_cache' },
    guard: { label: 'Crag wyrms', army: [{ creatureId: 'norse_storm_lindworm', count: 3 }], reward: { resources: { crystal: 6 } }, battlefield: 'plateau' },
    objectiveIds: ['m07_nest'],
  },
  { id: 'm07_barrow_gate', anchorId: 'm07_barrow_gate', coord: { q: 22, r: 10 }, name: 'Barrow-gate', description: 'A door of turf and iron in the glacier. Both stones must be cut to open it.', kind: { type: 'gate', openWhenFlags: ['stone_north', 'stone_south'] }, objectiveIds: ['m07_gate'] },
  { id: 'm07_cairn', anchorId: 'm07_cairn', coord: { q: 25, r: 6 }, name: 'Grave-goods', description: 'Tribute the Jarl’s dead brought to his door.', kind: { type: 'pickup', reward: { resources: { gold: 1500, crystal: 3 } } } },
  {
    id: 'm07_jarl_hall',
    anchorId: 'm07_jarl_hall',
    coord: { q: 27, r: 10 },
    name: 'Oathbreaker’s Hall',
    description: 'The Grey Jarl’s hall, built on the mound where he swore his oath.',
    kind: { type: 'crossing' },
    guard: {
      label: 'The Grey Jarl and his hall',
      army: [
        { creatureId: 'norse_ancient_frost_troll', count: 2 },
        { creatureId: 'norse_deathless_draugr', count: 20 },
        { creatureId: 'norse_deathless_draugr', count: 20 },
        { creatureId: 'norse_fenrir_wolf', count: 12 },
        { creatureId: 'norse_runic_jotunn', count: 2 },
        { creatureId: 'norse_storm_lindworm', count: 2 },
      ],
      commander: {
        heroDefinitionId: 'norse_grey_jarl',
        name: 'The Grey Jarl',
        classId: 'huscarl',
        level: 7,
        attributes: { attack: 6, defense: 5, power: 2, knowledge: 2 },
        skills: [
          { skillId: 'offense', rank: 2 },
          { skillId: 'armorer', rank: 2 },
          { skillId: 'tactics', rank: 1 },
        ],
        spellbook: true,
        spellIds: ['frost_breath'],
        mana: 20,
        portraitAssetId: 'hero.norse.grey_jarl.portrait',
      },
      reward: { resources: { gold: 2000 }, flags: ['jarl_defeated'] },
      battlefield: 'beacon_clearing',
    },
    objectiveIds: ['m07_jarl'],
  },
  {
    id: 'm07_barrow_door',
    anchorId: 'm07_barrow_door',
    coord: { q: 29, r: 8 },
    name: 'The Barrow-door',
    description: 'The door of the Jarl’s mound. Inside, his grave-bed is empty, with a sword-shaped hollow in the stone.',
    kind: {
      type: 'map_event',
      title: 'The Sword and the Mound',
      text: 'The Grey Jarl is gone, but his oath is not: it lives in the sword. Laid back in its hollow, it will keep the winter under the mound again — with a new keeper to watch it. Broken on the mound-stone, the oath ends forever, and every dead that ever answered it is free.',
      options: [
        { label: 'Return the sword', summary: 'The oath is renewed with Hervor as its keeper. Hervor gains 500 experience.', reward: { flags: ['sword_returned'], questXp: 500 } },
        { label: 'Break the sword', summary: 'The oath ends forever and the barrow-dead are free. Hervor gains 500 experience.', reward: { flags: ['sword_broken'], questXp: 500 } },
      ],
    },
    objectiveIds: ['m07_choice'],
  },
  {
    id: 'm07_oath_mound',
    anchorId: 'm07_oath_mound',
    coord: { q: 29, r: 12 },
    name: 'The Oath-mound',
    description: 'Where the oath was sworn, a thousand winters ago.',
    kind: {
      type: 'activation',
      label: 'beacon',
      cost: { gold: 1000, crystal: 3, favor: 10 },
      requirements: [
        { type: 'mission_flag', flag: 'jarl_defeated' },
        { type: 'any_of', requirements: [{ type: 'mission_flag', flag: 'sword_returned' }, { type: 'mission_flag', flag: 'sword_broken' }] },
      ],
      reward: { questXp: 3000 },
      completesMission: true,
      confirmText: 'Seal the oath at the mound? This completes The Winter Oath.',
    },
    objectiveIds: ['m07_seal'],
  },
];

const M07: MissionDefinition = {
  ...COMMON,
  id: 'winter_oath_m07',
  scenarioId: 'winter_oath_m07',
  order: 7,
  name: 'Oathbreaker’s Hall',
  subtitle: 'Mission 7 — Endure',
  summary: 'The Grey Jarl waits in his hall on the oath-mound. Climb the plateau, cut both stones to open the barrow-gate, defeat the Jarl, decide the sword’s fate and seal the oath.',
  mapTemplateId: 'winter_oath_m07_v1',
  soundscape: 'storm_plateau',
  targetPlaytime: '35–45 minutes (target, unmeasured)',
  newDecisions: ['Navigate a hostile patrol', 'The final battle', 'The last choice'],
  xpCap: null,
  xpCapLevel: null,
  briefing: [
    JARL('A thousand winters I have kept my word, seeress. A thousand. Do you know what the world was like when I swore it? Do you know what it will be like when I stop?'),
    HERVOR('Warmer, Hrolf.'),
    JARL('Do not use that name. Nobody has used it since my kingdom died. Come to my hall, then, and we will see whose oath is stronger.'),
  ],
  victory: [EYDIS('Hervor. The fjord is cracking. All the way to the skerries, I can hear it from the hall.')],
  storyScenes: [
    {
      id: 'm07_patrol',
      trigger: { type: 'battle_started', heroDefinitionId: 'norse_barrow_captain' },
      lines: [P('Barrow Captain', 'The plateau is the Jarl’s. So is everything that dies on it.', 'barrow_captain')],
    },
    {
      id: 'm07_gate_open',
      trigger: { type: 'objective_completed', objectiveId: 'm07_gate' },
      lines: [
        SKEGGI('The barrow-gate is open. I have sung about this door for forty years, and I never thought I would see it.'),
        HERVOR('Then keep your eyes open, skald. You will have to sing the rest.'),
      ],
    },
    {
      id: 'm07_jarl_battle',
      trigger: { type: 'battle_started', siteId: 'm07_jarl_hall' },
      lines: [
        JARL('You brought my sword home. That was kind. Now kneel, and carry my winter after me.'),
        HERVOR('I brought your sword to end it. Draugar — stand with me one more time.'),
      ],
    },
    {
      id: 'm07_jarl_falls',
      trigger: { type: 'site_cleared', siteId: 'm07_jarl_hall' },
      lines: [
        JARL('A kingdom… they promised me a kingdom when the winter ended. And the winter never ended.'),
        HERVOR('It ends now. I am sorry it was not the kingdom you wanted.'),
      ],
    },
    {
      id: 'm07_returned',
      trigger: { type: 'flag', flag: 'sword_returned' },
      lines: [
        HERVOR('Back in its bed. The oath holds — and I hold it now. Someone has to keep the dead asleep.'),
        SKEGGI('A völva keeping a king’s oath. That will make a song.'),
      ],
    },
    {
      id: 'm07_broken',
      trigger: { type: 'flag', flag: 'sword_broken' },
      lines: [
        HERVOR('There. No oath, no keeper, no winter held under a mound. Whatever comes now comes honestly.'),
        SKEGGI('And the dead? Every draugr in the north just heard that blade break.'),
        HERVOR('They are free. Let them decide what to do with it.'),
      ],
    },
    {
      id: 'm07_losses',
      trigger: { type: 'casualties', minLost: 16 },
      lines: [EYDIS('So many, Hervor. When this is over I will cut every name into a stone of its own. A good rune, this time.')],
    },
  ],
  debriefPolicy: ['The Winter Oath is complete. Replays run in a separate practice branch and cannot change this campaign record.'],
  player: {
    playerId: 'player',
    name: 'Isafold',
    pantheonId: 'norse',
    wallet: { gold: 20000, wood: 30, stone: 35, crystal: 18, favor: 25 },
    town: {
      townId: 'isafold',
      siteId: 'm07_town',
      name: 'Isafold',
      archetypeId: 'norse_hold',
      buildings: [
        'norse_longhouse', 'norse_jarls_hall', 'norse_high_hall', 'norse_mead_hall', 'norse_trading_post', 'norse_palisade', 'norse_stronghold', 'norse_barrow', 'norse_barrow_up',
        'norse_wolf_den', 'norse_wolf_den_up', 'norse_smithy', 'norse_rune_circle_1', 'norse_rune_circle_2', 'norse_rune_circle_3', 'norse_hof_1', 'norse_hof_2',
        'norse_valkyrie_aerie', 'norse_valkyrie_aerie_up', 'norse_troll_cave', 'norse_troll_cave_up', 'norse_lindworm_roost', 'norse_lindworm_roost_up', 'norse_jotunn_camp',
      ],
      population: { norse_draugr: 14, norse_frost_wolf: 9, norse_frost_troll: 6, norse_valkyrie: 4, norse_lindworm: 3, norse_jotunn: 2 },
      covenants: ['norse_frost_troll', 'norse_jotunn'],
    },
    hero: hervor(
      { level: 7, xp: 8400, attributes: { attack: 3, defense: 3, power: 5, knowledge: 5 }, skills: [{ skillId: 'wisdom', rank: 2 }, { skillId: 'armorer', rank: 2 }, { skillId: 'leadership', rank: 2 }, { skillId: 'offense', rank: 1 }], spellbook: true },
      [
        { creatureId: 'norse_deathless_draugr', count: 48 },
        { creatureId: 'norse_fenrir_wolf', count: 18 },
        { creatureId: 'norse_ancient_frost_troll', count: 8 },
        { creatureId: 'norse_battle_valkyrie', count: 8 },
        { creatureId: 'norse_storm_lindworm', count: 4 },
        { creatureId: 'norse_jotunn', count: 2 },
      ],
      'isafold',
    ),
  },
  hostilePlayer: { playerId: 'winter_host', name: 'The Winter Host' },
  purchasableBuildingIds: ['norse_jotunn_camp_up', 'norse_rune_merchant', 'norse_fortress', 'norse_storehouse', 'norse_watchtower', 'norse_training_ground', 'norse_hall_of_kings'],
  committableGodIds: ALL_GODS,
  sites: M07_SITES,
  objectives: M07_OBJECTIVES,
  hostileHeroes: [
    {
      commander: {
        heroDefinitionId: 'norse_barrow_captain',
        name: 'Barrow Captain',
        classId: 'huscarl',
        level: 4,
        attributes: { attack: 4, defense: 3, power: 1, knowledge: 1 },
        skills: [
          { skillId: 'offense', rank: 1 },
          { skillId: 'armorer', rank: 1 },
          { skillId: 'tactics', rank: 1 },
        ],
        spellbook: false,
        spellIds: [],
        mana: 10,
        portraitAssetId: 'hero.norse.barrow_captain.portrait',
      },
      startCoord: { q: 17, r: 10 },
      army: [
        { creatureId: 'norse_deathless_draugr', count: 24 },
        { creatureId: 'norse_fenrir_wolf', count: 8 },
        { creatureId: 'norse_ancient_frost_troll', count: 2 },
      ],
      ai: {
        profile: 'patrol',
        waypoints: [
          { q: 13, r: 8 },
          { q: 18, r: 10 },
          { q: 13, r: 12 },
          { q: 16, r: 10 },
        ],
        regionMinQ: 11,
        regionMaxQ: 21,
        attackThreshold: { numerator: 11, denominator: 10 },
      },
    },
  ],
  helpTopics: [
    { id: 'patrol', title: 'The plateau patrol', text: 'The Barrow Captain takes one ordinary turn after yours each day, cannot see through fog and never leaves the plateau between the ice-stairs and the barrow-gate.' },
    { id: 'stones', title: 'The two stones', text: 'Either ice-stair reaches both stones. Only both stones together open the barrow-gate.' },
    { id: 'last_choice', title: 'The last choice', text: 'The sword’s fate changes the ending you see, not the reward: both choices complete the campaign.' },
  ],
  thumbnailAssetId: 'mission.winter_oath.m07.thumbnail',
};

export const WINTER_OATH_MISSIONS: readonly MissionDefinition[] = [M01, M02, M03, M04, M05, M06, M07];

export const WINTER_OATH: CampaignDefinition = {
  id: 'winter_oath',
  name: 'The Winter Oath',
  tagline: 'Wake. Bind. Endure.',
  summary:
    'The winter did not end. Kaldvik’s barrow has opened, white wolves cut the roads and the Grey Jarl wants back the sword the seeress Hervor took from his mound. Lead Hervor through seven linked missions to bind the long winter — and decide what becomes of the oath.',
  pantheonId: 'norse',
  startingGodOptions: ['norse_odin'],
  startingGodNote: 'Odin is the fixed patron of this campaign. Thor or Tyr comes in Mission 3; a second god (Freyja, Heimdall or Hel) in Mission 5.',
  missionIds: WINTER_OATH_MISSIONS.map((m) => m.id),
  heroDefinitionId: 'norse_hervor',
  carryoverPolicy: [
    { category: 'Hero identity, XP, skills, primary growth', policy: 'Preserved (after the mission’s displayed XP cap)' },
    { category: 'Spellbook, spells, equipment, backpack', policy: 'Preserved' },
    { category: 'Odin and every minor-god commitment', policy: 'Preserved' },
    { category: 'Hero mana and movement', policy: 'Refilled to the new mission’s full budget' },
    { category: 'Army, wallet, towns, pools, mines', policy: 'Replaced by the next war-band manifest' },
    { category: 'Fog, local quest flags, enemies, day', policy: 'Reset to the mission’s initial state' },
  ],
  status: 'playable',
  thumbnailAssetId: 'campaign.winter_oath.thumbnail',
  epilogue: [
    EYDIS('The ice on the fjord broke this morning. The boats are already arguing about who goes first.'),
    SKEGGI('Seven runes, a pack of wolves, a jarl, a giant’s horn and a king’s oath. I will need a longer song.'),
  ],
  epilogueVariants: [
    {
      flag: 'sword_returned',
      lines: [
        HERVOR('The oath is mine now. Every winter, I will walk north to the mound and make sure it stays asleep.'),
        EYDIS('Then I will count one more name every winter: yours, coming home.'),
      ],
    },
    {
      flag: 'sword_broken',
      lines: [
        HERVOR('No more oaths under mounds. The dead are free, and the winter will come and go as winters should.'),
        EYDIS('Some of the draugar came down to the hold last night. They only stood at the edge of the firelight, watching the boats. Then they walked away into the hills.'),
        HERVOR('Let them go. They have kept enough promises.'),
      ],
    },
  ],
};
