/**
 * The Three Beacons — campaign/01 and campaign/02 as data.
 *
 * Status: P (proposed, unplaytested). Coordinates, seeds, barriers, encounters,
 * rewards, wallets and allowlists follow the documents exactly. Additions made in
 * this build are marked "proposed-this-build" in comments.
 */
import type {
  CampaignDefinition,
  EntitlementDefinition,
  MapTemplateDefinition,
  MissionDefinition,
  ObjectiveDefinition,
  SiteDefinition,
} from '@pr/rules';

// ---------------------------------------------------------------------------
// Map templates (campaign/02 §3)
// ---------------------------------------------------------------------------

export const TEMPLATES: readonly MapTemplateDefinition[] = [
  {
    id: 'three_beacons_m01_v1',
    version: 1,
    width: 20,
    height: 14,
    goldenSeed: 170101,
    barriers: [{ q: 10, terrain: 'water', openings: [{ q: 10, r: 7 }] }],
    anchors: [
      { id: 'm01_town', coord: { q: 3, r: 7 } },
      { id: 'm01_sawmill', coord: { q: 3, r: 3 } },
      { id: 'm01_quarry', coord: { q: 6, r: 10 } },
      { id: 'm01_cache', coord: { q: 7, r: 5 } },
      { id: 'm01_centaur_cache', coord: { q: 6, r: 2 } },
      { id: 'm01_ford', coord: { q: 10, r: 7 } },
      { id: 'm01_beacon', coord: { q: 16, r: 7 } },
    ],
    roadEdges: [
      ['m01_town', 'm01_ford'],
      ['m01_ford', 'm01_beacon'],
      ['m01_town', 'm01_sawmill'],
      ['m01_town', 'm01_quarry'],
      ['m01_sawmill', 'm01_centaur_cache'],
      ['m01_town', 'm01_cache'],
    ],
    biome: 'coast',
  },
  {
    id: 'three_beacons_m02_v1',
    version: 1,
    width: 26,
    height: 18,
    goldenSeed: 170202,
    barriers: [{ q: 13, terrain: 'mountain', openings: [{ q: 13, r: 8 }] }],
    anchors: [
      { id: 'm02_town', coord: { q: 3, r: 8 } },
      { id: 'm02_sawmill', coord: { q: 5, r: 4 } },
      { id: 'm02_quarry', coord: { q: 6, r: 12 } },
      { id: 'm02_cache', coord: { q: 8, r: 11 } },
      { id: 'm02_watchtower', coord: { q: 8, r: 5 } },
      { id: 'm02_sentinel_cache', coord: { q: 7, r: 3 } },
      { id: 'm02_pass_guard', coord: { q: 13, r: 8 } },
      { id: 'm02_nest_guard', coord: { q: 20, r: 6 } },
      { id: 'm02_beacon', coord: { q: 22, r: 10 } },
      { id: 'm02_crystal', coord: { q: 19, r: 13 } },
    ],
    roadEdges: [
      ['m02_town', 'm02_pass_guard'],
      ['m02_pass_guard', 'm02_nest_guard'],
      ['m02_pass_guard', 'm02_beacon'],
      ['m02_town', 'm02_sawmill'],
      ['m02_town', 'm02_quarry'],
      ['m02_town', 'm02_cache'],
      ['m02_town', 'm02_watchtower'],
      ['m02_watchtower', 'm02_sentinel_cache'],
      ['m02_beacon', 'm02_crystal'],
    ],
    biome: 'high_pass',
  },
  {
    id: 'three_beacons_m03_v1',
    version: 1,
    width: 30,
    height: 20,
    goldenSeed: 170303,
    barriers: [
      { q: 12, terrain: 'mountain', openings: [{ q: 12, r: 6 }, { q: 12, r: 13 }] },
      { q: 21, terrain: 'mountain', openings: [{ q: 21, r: 10 }] },
    ],
    anchors: [
      { id: 'm03_town', coord: { q: 3, r: 10 } },
      { id: 'm03_sawmill', coord: { q: 5, r: 6 } },
      { id: 'm03_quarry', coord: { q: 6, r: 15 } },
      { id: 'm03_gold_mine', coord: { q: 7, r: 15 } },
      { id: 'm03_watchtower', coord: { q: 9, r: 4 } },
      { id: 'm03_north_guard', coord: { q: 12, r: 6 } },
      { id: 'm03_south_guard', coord: { q: 12, r: 13 } },
      { id: 'm03_relay_north', coord: { q: 16, r: 5 } },
      { id: 'm03_relay_south', coord: { q: 16, r: 14 } },
      { id: 'm03_scout_spawn', coord: { q: 17, r: 10 } },
      { id: 'm03_labyrinth', coord: { q: 17, r: 2 } },
      { id: 'm03_cyclops_cache', coord: { q: 18, r: 17 } },
      { id: 'm03_ward_gate', coord: { q: 21, r: 10 } },
      { id: 'm03_beacon', coord: { q: 26, r: 10 } },
    ],
    roadEdges: [
      ['m03_town', 'm03_north_guard'],
      ['m03_town', 'm03_south_guard'],
      ['m03_north_guard', 'm03_relay_north'],
      ['m03_south_guard', 'm03_relay_south'],
      ['m03_relay_north', 'm03_relay_south'],
      ['m03_relay_north', 'm03_ward_gate'],
      ['m03_relay_south', 'm03_ward_gate'],
      ['m03_ward_gate', 'm03_beacon'],
      ['m03_town', 'm03_sawmill'],
      ['m03_town', 'm03_quarry'],
      ['m03_quarry', 'm03_gold_mine'],
      ['m03_town', 'm03_watchtower'],
      ['m03_relay_north', 'm03_labyrinth'],
      ['m03_relay_south', 'm03_cyclops_cache'],
    ],
    patrolLoop: [
      { q: 15, r: 8 },
      { q: 18, r: 10 },
      { q: 15, r: 12 },
      { q: 17, r: 10 },
    ],
    biome: 'storm_plateau',
  },
];

// ---------------------------------------------------------------------------
// Entitlements
// ---------------------------------------------------------------------------

export const ENTITLEMENTS: readonly EntitlementDefinition[] = [
  { id: 'covenant.griffin.m02', name: 'Griffin Covenant', kind: 'covenant', familyId: 'griffin', summary: 'The freed nesting ground allows a Griffin Aerie to be built in one town.' },
  { id: 'covenant.minotaur.m03', name: 'Minotaur Covenant', kind: 'covenant', familyId: 'minotaur', summary: 'The labyrinth refuge allows a Labyrinth to be built in one town.' },
];

// ---------------------------------------------------------------------------
// Shared bits
// ---------------------------------------------------------------------------

const P = (speaker: string, text: string) => ({
  speaker,
  portraitAssetId: `hero.greek.${speaker.toLowerCase()}.portrait`,
  text,
});

const resSite = (id: string, anchorId: string, q: number, r: number, siteType: 'sawmill' | 'quarry' | 'gold_mine' | 'crystal_deposit'): SiteDefinition => {
  const table = {
    sawmill: { name: 'Sawmill', resource: 'wood' as const, dailyYield: 2, description: 'Unowned timber works. Capture for +2 Wood per day.' },
    quarry: { name: 'Quarry', resource: 'stone' as const, dailyYield: 2, description: 'Unowned quarry. Capture for +2 Stone per day.' },
    gold_mine: { name: 'Gold Mine', resource: 'gold' as const, dailyYield: 1000, description: 'Unowned mine. Capture for +1,000 Gold per day.' },
    crystal_deposit: { name: 'Crystal Deposit', resource: 'crystal' as const, dailyYield: 1, description: 'Unowned crystal outcrop. Capture for +1 Crystal per day.' },
  }[siteType];
  return {
    id,
    anchorId,
    coord: { q, r },
    name: table.name,
    description: table.description,
    kind: { type: 'resource_site', siteType, resource: table.resource, dailyYield: table.dailyYield },
  };
};

const DEBRIEF_POLICY = [
  'Alexios keeps his level, experience (up to the displayed cap), skills, spellbook, spells and equipment.',
  'Zeus and any Athena/Ares commitment carry into the next mission.',
  'Troops, resources, towns, mines and recruitment pools stay behind to defend the restored region.',
  'The next mission begins with its declared expedition force and wallet.',
];

// ---------------------------------------------------------------------------
// M01 — The Silent Shore
// ---------------------------------------------------------------------------

const M01_OBJECTIVES: ObjectiveDefinition[] = [
  { id: 'm01_recruit', title: 'Raise the watch', description: 'Recruit at least 8 Hoplite-family creatures during this mission. Starting troops and transfers do not count.', category: 'primary', initialStatus: 'active', condition: { type: 'counter_at_least', counter: 'recruited:hoplite', value: 8 }, hint: 'Visit Asterion and open Recruitment at the Barracks.' },
  { id: 'm01_upgrade', title: 'Train a trusted guard', description: 'Train at least 10 Hoplites into Veteran Hoplites through paid local upgrades.', category: 'primary', initialStatus: 'active', condition: { type: 'counter_at_least', counter: 'trained:hoplite', value: 10 }, hint: 'Build the Veteran Barracks, then train Hoplites in Asterion. Training costs the price difference and uses no population.' },
  { id: 'm01_ford', title: 'Open the bridge', description: 'Defeat the {army:hoplite=6} guarding the bridge at the river.', category: 'primary', initialStatus: 'active', condition: { type: 'site_cleared', siteId: 'm01_ford' }, markerSiteId: 'm01_ford' },
  { id: 'm01_beacon_guard', title: 'Clear the lighthouse', description: 'Defeat the beacon garrison of {army:hoplite=8,peltast=4}.', category: 'primary', initialStatus: 'active', condition: { type: 'site_cleared', siteId: 'm01_beacon' }, markerSiteId: 'm01_beacon' },
  { id: 'm01_restore', title: 'Relight the lighthouse', description: 'At the beacon, with its guards defeated and both training objectives met, pay 250 Gold, 3 Wood and 3 Stone to light it.', category: 'primary', initialStatus: 'active', condition: { type: 'site_activated', siteId: 'm01_beacon' }, markerSiteId: 'm01_beacon' },
  { id: 'm01_centaur_cache', title: 'The grove cache (optional)', description: 'Defeat the {army:centaur=3} at the grove cache for a Warding Token (+1 commander Defense).', category: 'optional', initialStatus: 'active', condition: { type: 'site_cleared', siteId: 'm01_centaur_cache' }, markerSiteId: 'm01_centaur_cache' },
];

const M01_SITES: SiteDefinition[] = [
  { id: 'm01_town', anchorId: 'm01_town', coord: { q: 3, r: 7 }, name: 'Asterion', description: 'Your coastal town.', kind: { type: 'town', townId: 'asterion' } },
  resSite('m01_sawmill', 'm01_sawmill', 3, 3, 'sawmill'),
  resSite('m01_quarry', 'm01_quarry', 6, 10, 'quarry'),
  { id: 'm01_cache', anchorId: 'm01_cache', coord: { q: 7, r: 5 }, name: 'Wreck Cache', description: 'Storm wreckage with salvageable coin.', kind: { type: 'pickup', reward: { resources: { gold: 300 } } } },
  {
    id: 'm01_centaur_cache',
    anchorId: 'm01_centaur_cache',
    coord: { q: 6, r: 2 },
    name: 'Grove Cache',
    description: 'A grove where wary centaurs guard an old warding token.',
    kind: { type: 'landmark', landmark: 'grove' },
    guard: { label: 'Grove centaurs', army: [{ creatureId: 'centaur', count: 3 }], reward: { artifactIds: ['warding_token'] }, battlefield: 'grove' },
    objectiveIds: ['m01_centaur_cache'],
  },
  {
    id: 'm01_ford',
    anchorId: 'm01_ford',
    coord: { q: 10, r: 7 },
    name: 'Tidal Bridge',
    description: 'The only crossing of the tidal river.',
    kind: { type: 'crossing' },
    guard: { label: 'Bridge garrison', army: [{ creatureId: 'hoplite', count: 6 }], reward: { resources: { gold: 250, wood: 3, stone: 3 } }, battlefield: 'coast_road' },
    objectiveIds: ['m01_ford'],
  },
  {
    id: 'm01_beacon',
    anchorId: 'm01_beacon',
    coord: { q: 16, r: 7 },
    name: 'Outer Lighthouse',
    description: 'The damaged first beacon of the coast.',
    kind: {
      type: 'activation',
      label: 'beacon',
      cost: { gold: 250, wood: 3, stone: 3 },
      requirements: [
        { type: 'objective_completed', objectiveId: 'm01_recruit' },
        { type: 'objective_completed', objectiveId: 'm01_upgrade' },
      ],
      reward: { questXp: 900 },
      completesMission: true,
      confirmText: 'Relight the Outer Lighthouse? This completes The Silent Shore.',
    },
    guard: {
      label: 'Lighthouse garrison',
      army: [
        { creatureId: 'hoplite', count: 8 },
        { creatureId: 'peltast', count: 4 },
      ],
      reward: { resources: { gold: 500 } },
      battlefield: 'beacon_clearing',
    },
    objectiveIds: ['m01_beacon_guard', 'm01_restore'],
  },
];

const M01: MissionDefinition = {
  id: 'three_beacons_m01',
  scenarioId: 'three_beacons_m01',
  campaignId: 'three_beacons',
  order: 1,
  name: 'The Silent Shore',
  subtitle: 'Mission 1 — Restore',
  summary: 'The storm has passed, but the Outer Lighthouse is dark. Open the tidal bridge, raise and train a trusted guard, and relight the first beacon.',
  mapTemplateId: 'three_beacons_m01_v1',
  soundscape: 'coast',
  targetPlaytime: '10–15 minutes (target, unmeasured)',
  newDecisions: ['Explore', 'Recruit', 'Train the first upgrade', 'Resolve losses'],
  xpCap: 3199,
  xpCapLevel: 3,
  briefing: [
    P('Thaleia', 'The storm has passed. Our lighthouse is still dark. Open the road, train a guard we can trust, and bring its signal back.'),
    P('Alexios', 'First we reach the shore. Then we make sure the road stays open.'),
  ],
  victory: [P('Thaleia', 'One light is enough to tell the coast we have not abandoned it. The next signal lies above the pass.')],
  storyScenes: [
    {
      id: 'm01_bridge_open',
      trigger: { type: 'site_cleared', siteId: 'm01_ford' },
      lines: [
        P('Alexios', 'The bridge is ours. Whoever held it wanted the shore cut off, not plundered.'),
        P('Thaleia', 'Then they will be back. Keep the road watched when you march on.'),
      ],
    },
    {
      id: 'm01_lighthouse_battle',
      trigger: { type: 'battle_started', siteId: 'm01_beacon' },
      lines: [P('Alexios', 'They are holding the lighthouse itself. Whoever sent them knew what its light means to this coast.')],
    },
    {
      id: 'm01_losses',
      trigger: { type: 'casualties', minLost: 4 },
      lines: [
        P('Thaleia', 'Every shield that falls is a family in Asterion waiting at the door. Win if you must — but bring them home when you can.'),
        P('Alexios', 'I hear you. We fight smarter, or we wait until we are stronger.'),
      ],
    },
  ],
  debriefPolicy: DEBRIEF_POLICY,
  player: {
    playerId: 'player',
    name: 'Asterion',
    pantheonId: 'greek',
    wallet: { gold: 5000, wood: 12, stone: 18, crystal: 2, favor: 0 },
    town: {
      townId: 'asterion',
      siteId: 'm01_town',
      name: 'Asterion',
      archetypeId: 'greek_polis',
      buildings: ['village_hall', 'tavern', 'fort', 'barracks'],
      population: { hoplite: 14 },
      covenants: [],
    },
    hero: {
      heroId: 'alexios',
      definitionId: 'alexios',
      classId: 'strategos',
      defaults: {
        level: 1,
        xp: 0,
        attributes: { attack: 1, defense: 2, power: 1, knowledge: 2 },
        skills: [{ skillId: 'leadership', rank: 1 }],
        spellbook: false,
      },
      army: [
        { creatureId: 'hoplite', count: 20 },
        { creatureId: 'peltast', count: 8 },
      ],
      startTownId: 'asterion',
    },
  },
  purchasableBuildingIds: ['town_hall', 'market', 'barracks_up', 'peltast_range', 'peltast_range_up'],
  // Documented campaign rules: no pantheon signatures, first minor choice only (Athena OR Ares).
  signatureMechanics: false,
  // The tutorial keeps the old god economics: city dedications are explicitly off (app 1.5.0).
  features: { cityDedicationsV1: false, scoutingIntelV1: false, targetableCatapultV1: false },
  committableGodIds: ['athena', 'ares'],
  heroHiringEnabled: false,
  heroHiringDisabledReason: 'Alexios leads this expedition alone. Hero hiring is disabled in The Three Beacons.',
  sites: M01_SITES,
  objectives: M01_OBJECTIVES,
  hostileHeroes: [],
  helpTopics: [
    { id: 'route_preview', title: 'Route preview', text: 'Select a destination to preview the route. Solid markers are reachable today; faded markers need future days. Click again to march.' },
    { id: 'guarded_route', title: 'Guarded routes', text: 'A guarded site blocks its tile. Moving onto it asks for confirmation and starts a battle; you pay the final step as combat begins.' },
    { id: 'family_population', title: 'Family population', text: 'Base and upgraded forms share one weekly population pool. Building the upgraded dwelling adds no extra recruits.' },
    { id: 'upgrade_vs_training', title: 'Dwelling upgrade vs. troop training', text: 'Upgrading a dwelling unlocks the upgraded form. Training converts existing troops in town for the price difference and uses no population.' },
    { id: 'stack_hp', title: 'Creature HP vs. stack HP', text: 'HP is per creature. A stack stores total HP; the front creature may be wounded. Survivors heal after battle; the dead stay dead.' },
    { id: 'casualties', title: 'Battle casualties', text: 'Losses are permanent. Recruit replacements in town or recover resources from mines.' },
  ],
  protectedHeroFailure: true,
  thumbnailAssetId: 'mission.three_beacons.m01.thumbnail',
};

// ---------------------------------------------------------------------------
// M02 — Wings over the Pass
// ---------------------------------------------------------------------------

/**
 * Owner change 2026-10-14: the mission is played in Passhaven alone. Its one
 * objective is to train two Griffins into Windcrest Griffins; the Griffin riders
 * then carry the fire to the pass beacon, and the mission is won. Passhaven
 * already holds the Griffin covenant, so nothing outside the town is needed.
 * The ridge, its guards, the nesting ground, the watchtower and the mines stay
 * on the map as optional ground with no objective (the template and its golden
 * map are unchanged). Earlier steps (pass → nest → covenant claim → god →
 * Windcrest Griffins in the army → beacon, owner decision 2026-10-01) were
 * removed; the Athena/Ares choice stays open here and in Mission 3.
 */
const M02_OBJECTIVES: ObjectiveDefinition[] = [
  {
    id: 'm02_train_griffins',
    title: 'Train 2 Griffins',
    description: 'In Passhaven, build the Griffin Aerie and then the Windcrest Aerie, recruit Griffins, and train at least 2 of them into Windcrest Griffins.',
    category: 'primary',
    initialStatus: 'active',
    condition: { type: 'counter_at_least', counter: 'trained:griffin', value: 2 },
    reward: { questXp: 2000 },
    completesMission: true,
    hint: 'One building a day: the Griffin Aerie first, the Windcrest Aerie the next day. Recruit Griffins, then open Train in the town. Troops in Alexios’s army can be trained only while he stands in Passhaven.',
  },
];

const M02_SITES: SiteDefinition[] = [
  { id: 'm02_town', anchorId: 'm02_town', coord: { q: 3, r: 8 }, name: 'Passhaven', description: 'A mountain town below the ridge.', kind: { type: 'town', townId: 'passhaven' } },
  resSite('m02_sawmill', 'm02_sawmill', 5, 4, 'sawmill'),
  resSite('m02_quarry', 'm02_quarry', 6, 12, 'quarry'),
  resSite('m02_crystal', 'm02_crystal', 19, 13, 'crystal_deposit'),
  { id: 'm02_cache', anchorId: 'm02_cache', coord: { q: 8, r: 11 }, name: 'Traveler’s Cache', description: 'An abandoned supply cache.', kind: { type: 'pickup', reward: { resources: { gold: 500 } } } },
  { id: 'm02_watchtower', anchorId: 'm02_watchtower', coord: { q: 8, r: 5 }, name: 'Old Watchtower', description: 'From its top, the nesting ground can be marked on the map.', kind: { type: 'watchtower', revealSiteIds: ['m02_nest_guard'] } },
  {
    id: 'm02_sentinel_cache',
    anchorId: 'm02_sentinel_cache',
    coord: { q: 7, r: 3 },
    name: 'Sentinel Grove',
    description: 'Centaur Sentinels guard a forgotten store.',
    kind: { type: 'landmark', landmark: 'grove' },
    guard: { label: 'Centaur Sentinels', army: [{ creatureId: 'centaur_sentinel', count: 3 }], reward: { resources: { gold: 750, wood: 5 } }, battlefield: 'grove' },
  },
  {
    id: 'm02_pass_guard',
    anchorId: 'm02_pass_guard',
    coord: { q: 13, r: 8 },
    name: 'Ridge Pass',
    description: 'The only way over the ridge.',
    kind: { type: 'crossing' },
    guard: {
      label: 'Pass raiders',
      army: [
        { creatureId: 'hoplite', count: 10 },
        { creatureId: 'peltast', count: 6 },
      ],
      reward: { resources: { gold: 750, favor: 5 } },
      battlefield: 'ridge_pass',
    },
  },
  {
    id: 'm02_nest_guard',
    anchorId: 'm02_nest_guard',
    coord: { q: 20, r: 6 },
    name: 'Griffin Nesting Ground',
    description: 'Raiders have occupied the cliff ledges where the wild Griffins nest.',
    kind: { type: 'landmark', landmark: 'nest' },
    guard: {
      label: 'Nest raiders',
      army: [
        { creatureId: 'peltast', count: 4 },
        { creatureId: 'cavalry', count: 2 },
      ],
      reward: { resources: { favor: 10 } },
      battlefield: 'plateau',
    },
    markerHiddenUntilRevealed: true,
  },
];

const M02: MissionDefinition = {
  id: 'three_beacons_m02',
  scenarioId: 'three_beacons_m02',
  campaignId: 'three_beacons',
  order: 2,
  name: 'Wings over the Pass',
  subtitle: 'Mission 2 — Ally',
  summary: 'The Griffins have returned to the cliffs above Passhaven. Build their aerie, train two Windcrest Griffins, and their riders will carry the fire to the pass beacon.',
  mapTemplateId: 'three_beacons_m02_v1',
  soundscape: 'high_pass',
  targetPlaytime: '5–10 minutes (target, unmeasured)',
  newDecisions: ['Build prerequisites', 'Upgrade a dwelling', 'Train a new creature'],
  xpCap: 6199,
  xpCapLevel: 5,
  briefing: [
    P('Ione', 'The Griffins have come back to the cliffs above Passhaven. They remember the oath this town kept with them — the covenant is already ours.'),
    P('Ione', 'Raise an aerie, then train two of their young as Windcrest Griffins. They can carry the fire to the pass beacon faster than any column could march.'),
    P('Alexios', 'Then we build first and march later. Show me what they need.'),
  ],
  victory: [
    P('Ione', 'Two Windcrest Griffins carried the fire over the ridge. The pass beacon burns again.'),
    P('Ione', 'But the great beacon has no lens. Melas carried it to the storm plateau.'),
  ],
  storyScenes: [
    {
      id: 'm02_griffin_shrine',
      trigger: { type: 'site_cleared', siteId: 'm02_nest_guard' },
      lines: [
        P('Ione', 'This is the Griffins’ shrine — older than Passhaven, older than the road. The raiders camped on it as if it were only stone.'),
        P('Alexios', 'Then the Griffins will know who cleared it.'),
      ],
    },
    {
      id: 'm02_athena',
      trigger: { type: 'god_committed', godId: 'athena' },
      lines: [P('Ione', 'Athena, then. She favours those who plan before they strike. The Griffins will understand that.')],
    },
    {
      id: 'm02_ares',
      trigger: { type: 'god_committed', godId: 'ares' },
      lines: [P('Ione', 'Ares answers. Be careful — his gifts are paid for in courage, and courage can run out.')],
    },
    {
      id: 'm02_losses',
      trigger: { type: 'casualties', minLost: 6 },
      lines: [
        P('Thaleia', 'A courier from Asterion, Alexios: the names of the fallen reached us before your report did. We count every soldier who does not come back.'),
        P('Alexios', 'Tell her I count them too.'),
      ],
    },
  ],
  debriefPolicy: DEBRIEF_POLICY,
  player: {
    playerId: 'player',
    name: 'Passhaven',
    pantheonId: 'greek',
    wallet: { gold: 9500, wood: 25, stone: 30, crystal: 8, favor: 15 },
    town: {
      townId: 'passhaven',
      siteId: 'm02_town',
      name: 'Passhaven',
      archetypeId: 'greek_polis',
      buildings: ['village_hall', 'town_hall', 'tavern', 'fort', 'barracks', 'peltast_range', 'market', 'workshop', 'temple_1', 'sanctum_1'],
      population: { hoplite: 14, peltast: 9 },
      covenants: ['griffin'],
    },
    hero: {
      heroId: 'alexios',
      definitionId: 'alexios',
      classId: 'strategos',
      defaults: { level: 2, xp: 1080, attributes: { attack: 1, defense: 3, power: 1, knowledge: 2 }, skills: [{ skillId: 'leadership', rank: 1 }, { skillId: 'offense', rank: 1 }], spellbook: false },
      army: [
        { creatureId: 'hoplite', count: 32 },
        { creatureId: 'peltast', count: 12 },
        { creatureId: 'cavalry', count: 4 },
      ],
      startTownId: 'passhaven',
    },
  },
  purchasableBuildingIds: ['barracks_up', 'peltast_range_up', 'training_court', 'training_court_up', 'temple_2', 'griffin_aerie', 'griffin_aerie_up', 'sanctum_2', 'citadel'],
  // Documented campaign rules: no pantheon signatures, first minor choice only (Athena OR Ares).
  signatureMechanics: false,
  // The tutorial keeps the old god economics: city dedications are explicitly off (app 1.5.0).
  features: { cityDedicationsV1: false, scoutingIntelV1: false, targetableCatapultV1: false },
  committableGodIds: ['athena', 'ares'],
  heroHiringEnabled: false,
  heroHiringDisabledReason: 'Alexios leads this expedition alone. Hero hiring is disabled in The Three Beacons.',
  sites: M02_SITES,
  objectives: M02_OBJECTIVES,
  hostileHeroes: [],
  helpTopics: [
    { id: 'covenants', title: 'Covenants', text: 'Passhaven already holds the Griffin covenant, so its Griffin Aerie can be built. Elsewhere a covenant is a one-time entitlement: assign it permanently to a town, then build and pay for the dwelling it unlocks.' },
    { id: 'dwelling_upgrade', title: 'Upgraded dwellings', text: 'The Windcrest Aerie unlocks Windcrest Griffins. Griffins you already have can then be trained for the price difference; training uses no population.' },
    { id: 'gods', title: 'Divine commitments', text: 'Committing to a god is player-wide and irreversible. Athena and Ares exclude each other. The choice is optional in this mission.' },
    { id: 'local_recruitment', title: 'Local recruitment', text: 'Recruits and training reach a hero only when the hero stands in the town.' },
  ],
  protectedHeroFailure: true,
  thumbnailAssetId: 'mission.three_beacons.m02.thumbnail',
};

// ---------------------------------------------------------------------------
// M03 — The Storm Beacon
// ---------------------------------------------------------------------------

const M03_OBJECTIVES: ObjectiveDefinition[] = [
  // proposed-this-build: "either crossing" primary wrapper around the two stable guard IDs.
  { id: 'm03_approach', title: 'Open an approach', description: 'Clear either the northern or the southern crossing. One is enough to reach both relays.', category: 'primary', initialStatus: 'active', condition: { type: 'any', conditions: [{ type: 'site_cleared', siteId: 'm03_north_guard' }, { type: 'site_cleared', siteId: 'm03_south_guard' }] } },
  { id: 'm03_north_guard', title: 'Northern crossing', description: 'Defeat {army:peltast=6,cavalry=4} at the northern crossing (500 Gold).', category: 'optional', initialStatus: 'active', condition: { type: 'site_cleared', siteId: 'm03_north_guard' }, markerSiteId: 'm03_north_guard' },
  { id: 'm03_south_guard', title: 'Southern crossing', description: 'Defeat {army:minotaur=1,hoplite=6} at the southern crossing (500 Gold).', category: 'optional', initialStatus: 'active', condition: { type: 'site_cleared', siteId: 'm03_south_guard' }, markerSiteId: 'm03_south_guard' },
  { id: 'm03_relay_north', title: 'Northern relay', description: 'Activate the northern relay (250 Gold, 3 Stone).', category: 'primary', initialStatus: 'active', condition: { type: 'site_activated', siteId: 'm03_relay_north' }, markerSiteId: 'm03_relay_north' },
  { id: 'm03_relay_south', title: 'Southern relay', description: 'Activate the southern relay (250 Gold, 3 Stone).', category: 'primary', initialStatus: 'active', condition: { type: 'site_activated', siteId: 'm03_relay_south' }, markerSiteId: 'm03_relay_south' },
  { id: 'm03_ward_gate', title: 'Unseal the ward gate', description: 'With both relays active, the ward gate opens.', category: 'primary', initialStatus: 'active', condition: { type: 'all', conditions: [{ type: 'flag', flag: 'relay_north' }, { type: 'flag', flag: 'relay_south' }] }, markerSiteId: 'm03_ward_gate' },
  { id: 'm03_melas', title: 'Defeat Melas', description: 'Defeat Melas and his guard ({army:stormforged_cyclops=1,labyrinth_warden=2,veteran_peltast=6}) to recover the lens.', category: 'primary', initialStatus: 'active', condition: { type: 'site_cleared', siteId: 'm03_beacon' }, markerSiteId: 'm03_beacon' },
  { id: 'm03_restore', title: 'Light the Storm Beacon', description: 'With both relays active, Melas defeated and the lens recovered, pay 500 Gold, 3 Crystal and 5 Favor.', category: 'primary', initialStatus: 'active', condition: { type: 'site_activated', siteId: 'm03_beacon' }, markerSiteId: 'm03_beacon' },
  { id: 'm03_labyrinth', title: 'Labyrinth refuge (optional)', description: 'Defeat {army:minotaur=2,labyrinth_warden=1} for 1,500 Gold and a Minotaur covenant.', category: 'optional', initialStatus: 'active', condition: { type: 'site_cleared', siteId: 'm03_labyrinth' }, markerSiteId: 'm03_labyrinth' },
  { id: 'm03_cyclops_cache', title: 'Cyclops quarry (optional)', description: 'Defeat the Cyclops at the quarry cache for 4 Crystal.', category: 'optional', initialStatus: 'active', condition: { type: 'site_cleared', siteId: 'm03_cyclops_cache' }, markerSiteId: 'm03_cyclops_cache' },
];

const relay = (id: string, q: number, r: number, flag: string, name: string): SiteDefinition => ({
  id,
  anchorId: id,
  coord: { q, r },
  name,
  description: 'A signal relay that feeds the ward gate.',
  kind: {
    type: 'activation',
    label: 'relay',
    cost: { gold: 250, stone: 3 },
    requirements: [],
    reward: { flags: [flag] },
    completesMission: false,
    confirmText: `Activate the ${name}? Both relays open the ward gate.`,
  },
  markerHiddenUntilRevealed: true,
  objectiveIds: [id],
});

const M03_SITES: SiteDefinition[] = [
  { id: 'm03_town', anchorId: 'm03_town', coord: { q: 3, r: 10 }, name: 'Highwatch', description: 'The last town below the storm plateau.', kind: { type: 'town', townId: 'highwatch' } },
  resSite('m03_sawmill', 'm03_sawmill', 5, 6, 'sawmill'),
  resSite('m03_quarry', 'm03_quarry', 6, 15, 'quarry'),
  resSite('m03_gold_mine', 'm03_gold_mine', 7, 15, 'gold_mine'),
  { id: 'm03_watchtower', anchorId: 'm03_watchtower', coord: { q: 9, r: 4 }, name: 'Old Watchtower', description: 'Marks both relay coordinates as remembered sites.', kind: { type: 'watchtower', revealSiteIds: ['m03_relay_north', 'm03_relay_south'] } },
  {
    id: 'm03_north_guard',
    anchorId: 'm03_north_guard',
    coord: { q: 12, r: 6 },
    name: 'Northern Crossing',
    description: 'A guarded gap in the western ridge.',
    kind: { type: 'crossing' },
    guard: { label: 'Northern crossing guard', army: [{ creatureId: 'peltast', count: 6 }, { creatureId: 'cavalry', count: 4 }], reward: { resources: { gold: 500 } }, battlefield: 'ridge_pass' },
    objectiveIds: ['m03_north_guard'],
  },
  {
    id: 'm03_south_guard',
    anchorId: 'm03_south_guard',
    coord: { q: 12, r: 13 },
    name: 'Southern Crossing',
    description: 'A guarded gap in the western ridge.',
    kind: { type: 'crossing' },
    guard: { label: 'Southern crossing guard', army: [{ creatureId: 'minotaur', count: 1 }, { creatureId: 'hoplite', count: 6 }], reward: { resources: { gold: 500 } }, battlefield: 'ridge_pass' },
    objectiveIds: ['m03_south_guard'],
  },
  relay('m03_relay_north', 16, 5, 'relay_north', 'Northern Relay'),
  relay('m03_relay_south', 16, 14, 'relay_south', 'Southern Relay'),
  {
    id: 'm03_labyrinth',
    anchorId: 'm03_labyrinth',
    coord: { q: 17, r: 2 },
    name: 'Labyrinth Refuge',
    description: 'A maze-marked doorway where Minotaur wardens shelter.',
    kind: { type: 'landmark', landmark: 'refuge' },
    guard: { label: 'Refuge wardens', army: [{ creatureId: 'minotaur', count: 2 }, { creatureId: 'labyrinth_warden', count: 1 }], reward: { resources: { gold: 1500 }, entitlementIds: ['covenant.minotaur.m03'] }, battlefield: 'plateau' },
    objectiveIds: ['m03_labyrinth'],
  },
  {
    id: 'm03_cyclops_cache',
    anchorId: 'm03_cyclops_cache',
    coord: { q: 18, r: 17 },
    name: 'Cyclops Quarry',
    description: 'A boulder-strewn quarry held by a lone Cyclops.',
    kind: { type: 'landmark', landmark: 'quarry_cache' },
    guard: { label: 'Quarry Cyclops', army: [{ creatureId: 'cyclops', count: 1 }], reward: { resources: { crystal: 4 } }, battlefield: 'plateau' },
    objectiveIds: ['m03_cyclops_cache'],
  },
  { id: 'm03_ward_gate', anchorId: 'm03_ward_gate', coord: { q: 21, r: 10 }, name: 'Ward Gate', description: 'A sealed rock arch. Both relays must be active to open it.', kind: { type: 'gate', openWhenFlags: ['relay_north', 'relay_south'] }, objectiveIds: ['m03_ward_gate'] },
  {
    id: 'm03_beacon',
    anchorId: 'm03_beacon',
    coord: { q: 26, r: 10 },
    name: 'Storm Beacon',
    description: 'The great beacon in an open ceremonial clearing. Its lens is missing.',
    kind: {
      type: 'activation',
      label: 'beacon',
      cost: { gold: 500, crystal: 3, favor: 5 },
      requirements: [
        { type: 'mission_flag', flag: 'relay_north' },
        { type: 'mission_flag', flag: 'relay_south' },
        { type: 'mission_flag', flag: 'lens_recovered' },
      ],
      reward: { questXp: 2500 },
      completesMission: true,
      confirmText: 'Light the Storm Beacon? This completes The Three Beacons.',
    },
    guard: {
      label: 'Melas and the storm guard',
      army: [
        { creatureId: 'stormforged_cyclops', count: 1 },
        { creatureId: 'labyrinth_warden', count: 2 },
        { creatureId: 'veteran_peltast', count: 6 },
      ],
      commander: {
        heroDefinitionId: 'melas',
        name: 'Melas',
        classId: 'champion',
        level: 4,
        attributes: { attack: 4, defense: 3, power: 1, knowledge: 1 },
        skills: [
          { skillId: 'offense', rank: 2 },
          { skillId: 'tactics', rank: 1 },
          { skillId: 'fortune', rank: 1 },
        ],
        spellbook: true,
        spellIds: ['spark'],
        mana: 10,
        portraitAssetId: 'hero.greek.melas.portrait',
      },
      reward: { flags: ['lens_recovered'] },
      battlefield: 'beacon_clearing',
    },
    objectiveIds: ['m03_melas', 'm03_restore'],
  },
];

const M03: MissionDefinition = {
  id: 'three_beacons_m03',
  scenarioId: 'three_beacons_m03',
  campaignId: 'three_beacons',
  order: 3,
  name: 'The Storm Beacon',
  subtitle: 'Mission 3 — Reclaim',
  summary: 'Melas holds the great beacon’s lens on the storm plateau. Choose a crossing, activate both relays to unseal the ward gate, defeat Melas and light the last beacon.',
  mapTemplateId: 'three_beacons_m03_v1',
  soundscape: 'storm_plateau',
  targetPlaytime: '20–30 minutes (target, unmeasured)',
  newDecisions: ['Navigate a hostile patrol', 'Activate two relays', 'Combine unit roles'],
  xpCap: 9999,
  xpCapLevel: 7,
  briefing: [
    P('Melas', 'A single beacon can command an entire coast. Why should I give that power back?'),
    P('Alexios', 'Because it was built to guide people home, not make them kneel.'),
  ],
  victory: [P('Thaleia', 'Three lights. One coast. We can build the rest together.')],
  storyScenes: [
    {
      id: 'm03_approach_open',
      trigger: { type: 'objective_completed', objectiveId: 'm03_approach' },
      lines: [
        P('Alexios', 'The crossing is open. Both relays are within reach now.'),
        P('Ione', 'Light them both. The ward gate answers only to the whole signal.'),
      ],
    },
    {
      id: 'm03_gate_open',
      trigger: { type: 'objective_completed', objectiveId: 'm03_ward_gate' },
      lines: [P('Melas', 'So the gate opens for you. Come up, then. The storm has been waiting.')],
    },
    {
      id: 'm03_melas_threat',
      trigger: { type: 'battle_started', siteId: 'm03_beacon' },
      lines: [
        P('Melas', 'You lit two little fires and think the coast is yours. I kept this beacon when the council fled.'),
        P('Melas', 'Turn back now and you keep your soldiers. Take one more step and the storm takes them.'),
        P('Alexios', 'The light was never yours to keep, Melas.'),
      ],
    },
    {
      id: 'm03_lens',
      trigger: { type: 'site_cleared', siteId: 'm03_beacon' },
      lines: [
        P('Melas', 'Take the lens, then. See how long the coast remembers who lit it.'),
        P('Alexios', 'Long enough to build something better.'),
      ],
    },
    {
      id: 'm03_losses',
      trigger: { type: 'casualties', minLost: 8 },
      lines: [P('Thaleia', 'Highwatch’s healers are full, Alexios. The beacon matters — but so do the people carrying it there.')],
    },
  ],
  debriefPolicy: ['The Three Beacons is complete. Replays run in a separate practice branch and cannot change this campaign record.'],
  player: {
    playerId: 'player',
    name: 'Highwatch',
    pantheonId: 'greek',
    wallet: { gold: 15000, wood: 30, stone: 35, crystal: 12, favor: 10 },
    town: {
      townId: 'highwatch',
      siteId: 'm03_town',
      name: 'Highwatch',
      archetypeId: 'greek_polis',
      buildings: [
        'village_hall', 'town_hall', 'tavern', 'fort', 'citadel', 'barracks', 'barracks_up', 'peltast_range', 'peltast_range_up',
        'market', 'workshop', 'training_court', 'temple_1', 'temple_2', 'sanctum_1', 'sanctum_2', 'griffin_aerie', 'griffin_aerie_up', 'adept_house',
      ],
      population: { hoplite: 14, peltast: 9, cavalry: 4, griffin: 7, temple_adept: 3 },
      covenants: ['griffin'],
    },
    hero: {
      heroId: 'alexios',
      definitionId: 'alexios',
      classId: 'strategos',
      defaults: { level: 4, xp: 3400, attributes: { attack: 2, defense: 3, power: 1, knowledge: 3 }, skills: [{ skillId: 'leadership', rank: 1 }, { skillId: 'offense', rank: 1 }, { skillId: 'armorer', rank: 1 }], spellbook: false },
      army: [
        { creatureId: 'veteran_hoplite', count: 40 },
        { creatureId: 'veteran_peltast', count: 16 },
        { creatureId: 'cavalry', count: 4 },
        { creatureId: 'windcrest_griffin', count: 2 },
        { creatureId: 'temple_adept', count: 2 },
      ],
      startTownId: 'highwatch',
    },
  },
  hostilePlayer: { playerId: 'melas_raiders', name: 'Melas’s Raiders' },
  purchasableBuildingIds: ['training_court_up', 'adept_house_up', 'labyrinth', 'labyrinth_up', 'sanctum_3'],
  // Documented campaign rules: no pantheon signatures, first minor choice only (Athena OR Ares).
  signatureMechanics: false,
  // The tutorial keeps the old god economics: city dedications are explicitly off (app 1.5.0).
  features: { cityDedicationsV1: false, scoutingIntelV1: false, targetableCatapultV1: false },
  committableGodIds: ['athena', 'ares'],
  heroHiringEnabled: false,
  heroHiringDisabledReason: 'Alexios leads this expedition alone. Hero hiring is disabled in The Three Beacons.',
  sites: M03_SITES,
  objectives: M03_OBJECTIVES,
  hostileHeroes: [
    {
      commander: {
        heroDefinitionId: 'scout_captain',
        name: 'Scout Captain',
        classId: 'champion',
        level: 2,
        attributes: { attack: 3, defense: 2, power: 1, knowledge: 1 },
        skills: [
          { skillId: 'offense', rank: 1 },
          { skillId: 'tactics', rank: 1 },
        ],
        spellbook: false,
        spellIds: [],
        mana: 10,
        portraitAssetId: 'hero.greek.scout_captain.portrait',
      },
      startCoord: { q: 17, r: 10 },
      army: [
        { creatureId: 'hoplite', count: 12 },
        { creatureId: 'peltast', count: 6 },
        { creatureId: 'cavalry', count: 2 },
      ],
      ai: {
        profile: 'patrol',
        waypoints: [
          { q: 15, r: 8 },
          { q: 18, r: 10 },
          { q: 15, r: 12 },
          { q: 17, r: 10 },
        ],
        regionMinQ: 13,
        regionMaxQ: 20,
        attackThreshold: { numerator: 11, denominator: 10 },
      },
    },
  ],
  helpTopics: [
    { id: 'patrol', title: 'The plateau patrol', text: 'The Scout Captain takes one ordinary turn after yours each day, cannot see through fog and never leaves the middle plateau.' },
    { id: 'relays', title: 'Relays and the ward gate', text: 'Either crossing reaches both relays. Only both relays together open the ward gate.' },
  ],
  protectedHeroFailure: true,
  thumbnailAssetId: 'mission.three_beacons.m03.thumbnail',
};

export const THREE_BEACONS_MISSIONS: readonly MissionDefinition[] = [M01, M02, M03];

export const THREE_BEACONS: CampaignDefinition = {
  id: 'three_beacons',
  name: 'The Three Beacons',
  tagline: 'Restore. Ally. Reclaim.',
  summary:
    'A storm has extinguished the three signal beacons protecting the coast of Asterion. Lead Alexios through three short linked missions to reconnect the coast before its settlements abandon one another.',
  pantheonId: 'greek',
  startingGodOptions: ['zeus'],
  startingGodNote: 'Zeus is the fixed patron of this campaign. Your first minor-god choice — Athena or Ares — opens in Mission 2, once Temple II stands; it is never required.',
  missionIds: [M01.id, M02.id, M03.id],
  heroDefinitionId: 'alexios',
  carryoverPolicy: [
    { category: 'Hero identity, XP, skills, primary growth', policy: 'Preserved (after the mission’s displayed XP cap)' },
    { category: 'Spellbook, spells, equipment, backpack', policy: 'Preserved' },
    { category: 'Zeus and Athena/Ares commitment', policy: 'Preserved' },
    { category: 'Hero mana and movement', policy: 'Refilled to the new mission’s full budget' },
    { category: 'Army, wallet, towns, pools, mines', policy: 'Replaced by the next expedition manifest' },
    { category: 'Fog, local quest flags, enemies, day', policy: 'Reset to the mission’s initial state' },
  ],
  status: 'playable',
  thumbnailAssetId: 'campaign.three_beacons.thumbnail',
  epilogue: [
    P('Thaleia', 'From the Outer Lighthouse to the storm plateau, the coast can see itself again. Tonight the first ships since the storm came into Asterion.'),
    P('Ione', 'The Griffins circled the pass beacon at dusk. They have not done that in a generation.'),
    P('Alexios', 'Then the work begins. A light only shows the way — people still have to walk it.'),
    P('Thaleia', 'Then we walk it together.'),
  ],
};

/** No unbuilt campaign is listed in this build (The Winter Oath is playable). */
export const COMING_SOON_CAMPAIGNS: readonly CampaignDefinition[] = [];
