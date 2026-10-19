/**
 * The Twelfth Hour, content v2 (campaign expansion handoff 2026-10-15; review
 * cards 15–20): six chapters carrying the seven legacy chapters of the Egyptian
 * campaign. Control of water, grain and the calendar during a failing dawn.
 *
 *   1  The Ember Dawn (legacy m01) — a river bend: Abedju between the boat channel
 *      and the dry lower-farms branch; a dike ring with three crossings (north
 *      bridge, shrine causeway, lower ford) joins fields, floodplain and the desert
 *      ridge of the obelisk. A guarded canal lock (sluice) refills the branch and
 *      floods the ford; the boat channel's footbridge is the shortcut.
 *   2  The Black Boar (legacy m02) — a delta: three islands round a central
 *      wetland, Nekheb on the southern distributary, the collectors' causeway in
 *      the north-west; short wetland dikes against the long dry eastern rim.
 *   3  The Drowned Library and the Sculptor's Price (legacy m03 + m04) — Edfu's
 *      quarry shelf and Per-Djehuty's flooded library across a wide river (north
 *      bridge, central shallows, southern ferry); the Weir of Thoth (sluice) drains
 *      the library and floods the tail-race over the scribes' causeway.
 *   4  The Red Vizier (legacy m05) — Per-Wadjet on a raised island in a ring of
 *      water: two bridges and the grain ferry from the crescent of districts, the
 *      long desert road to the rear landing, the temple pontoon as the shortcut.
 *   5  The Phoenix Rookery (legacy m06) — a circular oasis: three causeways meet
 *      below the rookery island, the dune perimeter links Iunu, both outposts and
 *      the north hamlet; two service paths open after the supply deliveries.
 *   6  The Twelfth Hour (legacy m07) — a five-armed river basin round the island
 *      of the Coil: unguarded outer dikes over every arm, two inner descents and the
 *      barque channel inward; the declared rite starts only at the launch.
 *
 * Order: 1 → {2, 3 in either order} → 4 → 5 → 6. Chapters 2 and 3 read each
 * other's facts (`fact:<flag>`) so nobody names an inquiry that has not happened.
 * The existing cast only (Seshet, Nebet, Pawah, Paser, Ankhwen, Hekaib, Iti,
 * Djedkhonsu). Values are proposed and unplaytested; economies come from the
 * legacy chapter each one carries first.
 */
import { AXIAL_DIRECTIONS, type CommanderSpec } from '@pr/rules';
import { speaker } from '../arc';
import { C, O, S, armyText, chapter, guard, type Army, type V2Campaign } from './kit';
import type { V2Built } from './index';
import { toAxial, toXY, type XY } from './regionMap';

const P = 'egyptian';
const SESHET = speaker(P, 'Seshet');
const NEBET = speaker(P, 'Nebet');
const PAWAH = speaker(P, 'Pawah');
const DJED = speaker(P, 'Djedkhonsu');
const PASER = speaker(P, 'Paser');
const ANKHWEN = speaker(P, 'Ankhwen');
const HEKAIB = speaker(P, 'Hekaib');
const ITI = speaker(P, 'Iti');

/** A band without a hero (raiders, collectors, convoys, the black herd): its portrait is a creature's. */
function band(id: string, name: string, portrait: string): CommanderSpec {
  return { heroDefinitionId: id, name, classId: 'champion', level: 1, attributes: { attack: 0, defense: 0, power: 0, knowledge: 0 }, skills: [], spellbook: false, spellIds: [], mana: 0, portraitAssetId: portrait };
}
const HIRELING_PORTRAIT = 'creature.neutral.brigand.upgraded.portrait';

/**
 * Cells `from`..`to` steps from `centre` along one hex direction (0 east, 1 north-east,
 * 2 north-west, 3 west, 4 south-west, 5 south-east), as authoring positions: exact
 * causeways across a ring of water (one cell per ring, no diagonal leak).
 */
function ray(rows: number, centre: XY, dir: number, from: number, to: number): XY[] {
  const c = toAxial(rows, centre);
  const d = AXIAL_DIRECTIONS[dir]!;
  const out: XY[] = [];
  for (let k = from; k <= to; k++) out.push(toXY(rows, { q: c.q + d.q * k, r: c.r + d.r * k }));
  return out;
}
/** The cell at an axial offset (dq, dr) from `centre`, as an authoring position. */
function at(rows: number, centre: XY, dq: number, dr: number): XY {
  const c = toAxial(rows, centre);
  return toXY(rows, { q: c.q + dq, r: c.r + dr });
}

export function buildTwelfthHourV2(camp: V2Campaign): V2Built {
  // =========================================================================
  // Chapter 1 — The Ember Dawn (card 15; legacy m01)
  // =========================================================================
  const lockGuard: Army = [['wild_boar', 8]];
  const northBridgeGuard: Army = [['brigand', 10], ['brigand_cutthroat', 2]];
  const causewayGuard: Army = [['hill_slinger', 6], ['brigand', 6]];
  const obeliskGuard: Army = [['brigand', 18], ['brigand_cutthroat', 5]];
  const raiderCampGuard: Army = [['brigand', 10], ['brigand_cutthroat', 3]];
  // The dry lower-farms branch: the canal lock's channel (one contiguous chain, so it bars the way when it runs).
  const branchBed: XY[] = [[18, 12], [17, 12], [16, 12], [15, 13], [14, 13], [13, 13], [12, 13], [11, 13], [10, 13], [9, 13], [9, 14], [8, 14], [7, 14]];
  const m1 = chapter({
    campaign: camp,
    chapter: 1,
    card: 15,
    name: 'The Ember Dawn',
    summary:
      'A red dawn gives Abedju too little light to sustain its fields. Seshet expects a broken rite; Nebet shows her blocked canals and unequal rationing. Restore two canal branches, deliver a grain allotment to the field-workers, and read the Obelisk of the East.',
    playtime: '45–65 minutes, 3–4 battles',
    legacy: ['twelfth_hour_m01'],
    economyFrom: 'twelfth_hour_m01',
    principal: 'th1_obelisk',
    soundscape: 'desert',
    hostileName: 'The Masked Hirelings',
    town: { siteId: 'th1_town', townId: 'abedju', name: 'Abedju' },
    map: {
      cols: 32,
      rows: 20,
      biome: 'desert', desertGround: true,
      base: 'plains',
      seed: 950001,
      texture: { rough: 50, forest: 12 },
      paint: [
        // The river, bending west past Abedju.
        { t: 'water', line: [[22, 0], [22, 3], [20, 7], [20, 12], [22, 16], [23, 19]], width: 1 },
        // The desert ridge on the east bank, and the obelisk's rock shelf (two approaches: north and south).
        { t: 'rough', rect: [25, 1, 30, 18] },
        { t: 'mountain', line: [[30, 3], [29, 7], [30, 12], [29, 17]], width: 0 },
        { t: 'mountain', cells: [[26, 9], [28, 9], [27, 8], [28, 10], [26, 7], [26, 11]] },
        // The north dike and the shrine causeway across the river.
        { t: 'plains', line: [[18, 3], [25, 3]], width: 0 },
        { t: 'plains', line: [[18, 15], [25, 15]], width: 0 },
        // The boat channel: from the river to the fields, north of Abedju.
        { t: 'water', line: [[19, 6], [14, 6], [8, 6]], width: 0 },
        // The dry lower-farms branch (the lock's channel): marsh until the lock is opened.
        { t: 'marsh', cells: branchBed },
        // Fields and palm groves in the north-west; the floodplain in the south.
        { t: 'forest', blob: [5, 3, 1] },
        { t: 'forest', cells: [[12, 2], [13, 2], [16, 4]] },
        { t: 'marsh', cells: [[16, 18], [17, 18], [13, 18], [18, 17]] },
        // The desert edge beyond the farms.
        { t: 'rough', blob: [3, 16, 2] },
      ],
      roads: [
        // The dike ring: Abedju – the fields – the north bridge – the ridge – the shrine causeway – the farms – the lower ford.
        { via: ['th1_town', [7, 8], [8, 4], [16, 3], 'th1_north_bridge', [26, 4], [27, 6], 'th1_obelisk'] },
        { via: ['th1_obelisk', [27, 12], [25, 14], 'th1_shrine_causeway', [17, 16], 'th1_village'] },
        { via: ['th1_village', 'th1_ford', 'th1_town'] },
        // The boat-channel footbridge: the shortcut north once the channel is restored.
        { via: ['th1_town', 'th1_footbridge', [15, 4]] },
        // Spurs.
        { via: ['th1_town', 'th1_granary'] },
        { via: ['th1_town', 'th1_tally'] },
        { via: ['th1_town', [17, 9], 'th1_headgate'] },
        { via: [[17, 9], 'th1_lock'] },
        { via: [[17, 9], 'th1_barge'] },
        { via: [[7, 8], 'th1_workshop'] },
        { via: [[8, 4], 'th1_sawmill'] },
        { via: [[17, 16], 'th1_shrine'] },
        { via: ['th1_village', 'th1_raiders'] },
        { via: [[27, 12], 'th1_quarry'] },
        { via: [[26, 4], 'th1_kennels'] },
      ],
    },
    sites: [
      S.town('th1_town', 'abedju', [13, 9], 'Abedju', 'Seshet’s temple-town in the river bend, where the House of Life keeps the hymns of the hours.', [13, 10]),
      S.resource('th1_sawmill', [4, 2], 'sawmill', { name: 'Palm Grove', description: 'An unowned grove of date palms and timber. Capture for +2 Wood per day.' }),
      S.resource('th1_quarry', [27, 14], 'quarry'),
      // The canal lock (water control): guarded, local, no timer.
      S.sluice(
        'th1_lock',
        [18, 11],
        'Canal Lock',
        'The lock at the head of the lower-farms branch. Marsh boars, driven mad by the cold, wallow in its basin — someone penned them there.',
        {
          channel: branchBed,
          open: 'water',
          closed: 'marsh',
          startsOpen: false,
          openText: 'Open the lock: the river runs down the lower-farms branch again and the farms drink. The Lower Ford floods while the lock stays open — the dike road round the branch’s western tail always remains.',
          closeText: 'Close the lock: the lower-farms branch drains to mud and the Lower Ford can be waded again.',
          openFlag: 'th1_lock_open',
        },
        { guard: guard({ label: 'Marsh boars at the lock', army: lockGuard, reward: { resources: { gold: 300, wood: 3, stone: 3 } }, battlefield: 'coast_road' }), objectiveIds: ['th1_lock'] },
      ),
      S.crossing('th1_ford', [11, 13], 'Lower Ford', 'Where the dike road wades the dry bed of the lower-farms branch. Under water whenever the lock is open.', null),
      S.activation(
        'th1_headgate',
        [18, 7],
        'Boat-Channel Head-gate',
        'The silted head-gate of the boat channel. The barges have not reached Abedju’s quay since the dark mornings began.',
        { cost: { gold: 400, wood: 3, stone: 2 }, reward: { flags: ['th1_branch_channel', 'th1_bank_rich'], questXp: 300 }, confirm: 'Pay 400 Gold, 3 Wood and 2 Stone to dig out the head-gate? The boat channel runs again, and the canal workers lower the footbridge north of Abedju.', label: 'relay' },
        null,
        { objectiveIds: ['th1_channel'], marker: 'supply' },
      ),
      S.shortcut('th1_footbridge', [14, 6], 'Canal Footbridge', 'A lifting footbridge over the boat channel, the short way from Abedju to the north dike. The canal workers keep it raised until their channel runs again.', ['th1_branch_channel']),
      S.pickup('th1_granary', [10, 9], 'Temple Granary', 'The temple’s granary, full to the rafters while the field-workers’ rations were cut by half. Nebet has the keys.', { flags: ['th1_grain_loaded'] }, { marker: 'supply' }),
      S.activation(
        'th1_village',
        [9, 16],
        'Field-workers’ Village',
        'The lower farms’ village, below the dry branch. Its people have eaten half rations since the first red dawn.',
        { cost: { gold: 200 }, reward: { flags: ['th1_grain_delivered'], questXp: 400 }, requirements: [{ type: 'mission_flag', flag: 'th1_grain_loaded' }], confirm: 'Hand out the grain allotment from the temple granary (200 Gold for the carters)?', label: 'relay' },
        null,
        { marker: 'supply' },
      ),
      S.choice(
        'th1_tally',
        [15, 10],
        'Overseer’s Tally House',
        'Where Abedju’s canal overseers keep the water and grain tallies. Nebet has spread them open on the table.',
        'The first investment',
        'Nebet taps two columns of the tally. “Both branches will run again before the season is out, priestess — I will see to that. But the silver for the lasting work goes to one first. The lower farms: dikes, sluice-boards, granary bins — grain to spare for whoever needs it next. Or the boat channel: towpaths, quays, a barge crew — cheaper movement and supplies wherever the river goes.”',
        [
          { label: 'Prioritise the lower farms', summary: 'Costs 600 Gold and 3 Wood. Remembered: grain support later (the Nekheb chapter starts with 1,500 Gold more).', cost: { gold: 600, wood: 3 }, reward: { flags: ['th1_farms_first'] } },
          { label: 'Restore the boat channel first', summary: 'Costs 600 Gold and 3 Stone. Remembered: cheaper movement and supplies later (in the library chapter the southern ferry runs from the first day, with 5 Wood and 5 Stone more).', cost: { gold: 600, stone: 3 }, reward: { flags: ['th1_channel_first'] } },
        ],
        { marker: 'pact', objectiveIds: ['th1_choice'] },
      ),
      S.pickup('th1_barge', [18, 9], 'Abandoned Barge', 'A grain barge left at the bank when its crew fled the dark mornings.', { resources: { gold: 400, crystal: 1 } }),
      S.camp('th1_workshop', [4, 9], 'Abandoned Irrigation Workshop', 'The old workshop that built the canal’s water-wheels. Its clay men still stand at the benches, and will work for whoever pays.', 'clay_golem', 2, 3),
      S.camp('th1_kennels', [27, 3], 'Jackal Kennels', 'Temple jackals on the ridge that follow whoever feeds them and keeps the old words.', 'egyptian_jackal_guardian', 3, 4),
      S.choice(
        'th1_shrine',
        [15, 17],
        'Broken Shrine of Ra',
        'A floodplain shrine whose offering table has been overturned.',
        'The Broken Shrine',
        'Someone has smashed the little shrine on the floodplain: the offering table lies in pieces, the bread is trodden into the mud. Under the table, four bronze scarabs the size of a fist still turn slowly toward the east, waiting for a sun that does not come.',
        [
          { label: 'Take the shrine’s silver', summary: '+600 Gold and +4 Wood.', reward: { resources: { gold: 600, wood: 4 } } },
          { label: 'Read the morning verse over the scarabs', summary: '4 Sacred Scarabs join Seshet’s escort.', reward: { creatures: [{ creatureId: 'egyptian_sacred_scarab', count: 4 }] } },
        ],
      ),
      S.crossing('th1_north_bridge', [22, 3], 'North Dike Bridge', 'The dike bridge over the river to the desert ridge, held by masked pickets.', { label: 'Masked pickets', army: northBridgeGuard, reward: { resources: { gold: 300 } }, battlefield: 'coast_road' }),
      S.crossing('th1_shrine_causeway', [21, 15], 'Shrine Causeway', 'The floodplain causeway to the ridge’s southern foot. Slingers hired by the masked men watch it.', { label: 'Causeway slingers', army: causewayGuard, reward: { resources: { gold: 300 } }, battlefield: 'coast_road' }),
      S.activation(
        'th1_obelisk',
        [27, 9],
        'Obelisk of the East',
        'The needle of stone where the morning hymn greets the sun, on a rock shelf of dry channels reached from the north and the south. Masked men stand around it.',
        {
          cost: { gold: 300, crystal: 1 },
          reward: { flags: ['th1_obelisk_read'], questXp: 1200 },
          requirements: [
            { type: 'objective_completed', objectiveId: 'th1_lock' },
            { type: 'objective_completed', objectiveId: 'th1_channel' },
            { type: 'objective_completed', objectiveId: 'th1_grain' },
          ],
          completesMission: true,
          confirm: 'Read the dawn-marks of the Obelisk of the East and sing the morning hymn (300 Gold, 1 Crystal)? This completes The Ember Dawn.',
        },
        { label: 'Masked hirelings', army: obeliskGuard, reward: { resources: { gold: 500 }, artifactIds: ['khopesh_of_set'] }, battlefield: 'ridge_pass', required: true },
        { objectiveIds: ['th1_obelisk_clear', 'th1_obelisk'], marker: 'evidence' },
      ),
      S.landmark('th1_raiders', [3, 17], 'Raiders’ Camp', 'Where the masked men’s raiders sleep between raids, at the desert edge beyond the farms.', 'refuge', { label: 'Raiders’ camp', army: raiderCampGuard, reward: { resources: { gold: 500, wood: 2 } }, battlefield: 'open_field' }),
    ],
    patrols: [
      {
        commander: band('th1_raiders_band', 'Masked Raiders', HIRELING_PORTRAIT),
        monster: true,
        bounty: { gold: 300 },
        start: [5, 16],
        waypoints: [[9, 15], [6, 12], [6, 8], [7, 4], [4, 6], [3, 9], [3, 13], [5, 16]],
        army: [['brigand', 6], ['brigand_cutthroat', 2]],
        home: 'th1_raiders',
        dormantUntil: 'th1_bank_rich',
        threshold: [3, 2],
        purpose: 'Waits at its camp until the first canal branch runs again, then raids the fields and farms the water has made rich. Taking the Raiders’ Camp ends the raids for good.',
      },
    ],
    objectives: [
      O.primary('th1_lock', 'Open the canal lock', `Drive the marsh boars (${armyText(lockGuard)}) from the Canal Lock and open it: the lower-farms branch runs again and the lower farms flourish. Opening it floods the Lower Ford; the dike road round the branch’s western tail always remains.`, C.flag('th1_lock_open'), { markerSiteId: 'th1_lock', reward: { flags: ['th1_branch_farms', 'th1_bank_rich'], resources: { gold: 400, wood: 2 } } }),
      O.primary('th1_channel', 'Restore the boat channel', 'Dig out the Boat-Channel Head-gate by the river. The canal workers lower the footbridge north of Abedju once their channel runs.', C.activated('th1_headgate'), { markerSiteId: 'th1_headgate' }),
      O.primary('th1_grain', 'Deliver a grain allotment', 'Load the allotment at the Temple Granary in Abedju and hand it out at the Field-workers’ Village below the dry branch.', C.all(C.visited('th1_granary'), C.activated('th1_village')), { markerSiteId: 'th1_village' }),
      O.primary('th1_obelisk_clear', 'Free the obelisk', `Drive the masked hirelings (${armyText(obeliskGuard)}) from the Obelisk of the East — by the north dike bridge (${armyText(northBridgeGuard)}) or the shrine causeway (${armyText(causewayGuard)}).`, C.cleared('th1_obelisk'), { markerSiteId: 'th1_obelisk' }),
      O.primary('th1_obelisk', 'Read the eastern obelisk', 'With both branches running and the grain delivered, read the dawn-marks of the Obelisk of the East and sing the morning hymn.', C.activated('th1_obelisk'), { markerSiteId: 'th1_obelisk', requires: ['th1_lock', 'th1_channel', 'th1_grain', 'th1_obelisk_clear'] }),
      O.optional('th1_choice', 'The first investment', 'At the Overseer’s Tally House, decide which branch receives the lasting work first.', C.any(C.flag('th1_farms_first'), C.flag('th1_channel_first')), { markerSiteId: 'th1_tally' }),
      O.optional('th1_raids', 'End the raids', `Take the Raiders’ Camp at the desert edge (${armyText(raiderCampGuard)}); its band withdraws for good.`, C.cleared('th1_raiders'), { markerSiteId: 'th1_raiders' }),
      O.optional('th1_shrine_visit', 'The broken shrine', 'Visit the broken shrine on the floodplain.', C.visited('th1_shrine'), { markerSiteId: 'th1_shrine' }),
    ],
    evidence: [
      { id: 'th1_ev_ration', flag: 'th1_grain_loaded', title: 'Unequal rations', text: 'The temple granary of Abedju was full while the field-workers’ rations were cut by half.', icon: 'evidence' },
      { id: 'th1_ev_delivered', flag: 'th1_grain_delivered', title: 'The allotment delivered', text: 'The field-workers’ village received its grain from the temple stores.', icon: 'supply' },
      { id: 'th1_ev_obelisk', flag: 'th1_obelisk_read', title: 'The obelisk’s dawn-marks', text: 'The first light reaches the obelisk later every week — and the canals failed in the same weeks. The sky and the water system are failing together.', icon: 'evidence' },
      { id: 'th1_ev_farms', flag: 'th1_farms_first', title: 'The lower farms first', text: 'The lasting work went to the lower farms: grain to spare for the next town in need.', icon: 'supply' },
      { id: 'th1_ev_channel', flag: 'th1_channel_first', title: 'The boat channel first', text: 'The lasting work went to the boat channel: barges, quays and a crew for the river.', icon: 'branch' },
    ],
    carried: ['th1_farms_first', 'th1_channel_first', 'th1_obelisk_read', 'th1_grain_delivered'],
    briefing: [
      SESHET('Nine red dawns. The sun climbs a hand’s breadth over the eastern hills and sinks again. The morning hymn must have been broken — someone has stopped the singers at the Obelisk of the East.'),
      NEBET('Maybe, priestess. But come and look at the canals first. The lock is choked with boars, the boat channel is silted, and the temple granary is full while the field-workers eat half rations.'),
      PAWAH('Masked men hold the obelisk on the ridge. The north dike bridge and the shrine causeway both reach it — mind the lock on the way: whoever penned the boars there wanted the water kept out of the farms.'),
    ],
    victory: [
      SESHET('The hymn is sung — and the dawn-marks on the obelisk say what Nebet’s canals said: the light comes later every week, and the water failed in the same weeks. The sky and the river are failing together.'),
      NEBET('Then we follow both. Nekheb’s fields to the south are starving, and the drowned library at Per-Djehuty keeps every flood since the first king. Either can come first.'),
    ],
    scenes: [
      { id: 'th1_lock_cleared', trigger: { type: 'site_cleared', siteId: 'th1_lock' }, lines: [PAWAH('Those boars were penned in the lock. Somebody fed them there and left the gate open behind them.'), SESHET('Then somebody wanted the water kept out of the lower farms. Open the lock — the ford will flood, but the dike road round the branch’s tail still holds.')] },
      { id: 'th1_lock_opened', trigger: { type: 'flag', flag: 'th1_branch_farms' }, lines: [NEBET('Listen — the branch is running. By next week the lower farms will be green again.')] },
      { id: 'th1_channel_open', trigger: { type: 'flag', flag: 'th1_branch_channel' }, lines: [PAWAH('The barges can reach the quay again, and the canal workers have lowered the footbridge. The north dike is half a morning from Abedju now.')] },
      { id: 'th1_granary', trigger: { type: 'site_visited', siteId: 'th1_granary' }, lines: [NEBET('Full. Every bin. And the field-workers below the branch have eaten half rations since the first red dawn.'), SESHET('I sang the hymns for this temple for twelve years and never asked what was in its granary. Load the carts.')] },
      { id: 'th1_delivered', trigger: { type: 'flag', flag: 'th1_grain_delivered' }, lines: [NEBET('That is the first full ration this village has seen in nine days.'), SESHET('A hymn cannot do that, captain. I am learning.')] },
      { id: 'th1_raiders_wake', trigger: { type: 'flag', flag: 'th1_bank_rich' }, lines: [PAWAH('Water brings raiders like it brings ducks. The masked men’s band is leaving its camp at the desert edge — for whichever bank has something worth stealing.')] },
      { id: 'th1_obelisk_battle', trigger: { type: 'battle_started', siteId: 'th1_obelisk' }, lines: [DJED('Little reader. The hymn you came to sing is an old habit. Night has better songs.'), SESHET('Then let it sing them to someone who is listening.')] },
      { id: 'th1_khopesh', trigger: { type: 'site_cleared', siteId: 'th1_obelisk' }, lines: [NEBET('Their leader carried this — a temple khopesh, the sacred kind, from the treasury at Iunu.'), SESHET('Whoever gives temple blades to hirelings has been inside the temples.')] },
      { id: 'th1_short_dawn', trigger: { type: 'day_at_least', day: 5 }, lines: [PAWAH('The sun stood lower again this morning. Shorter by a finger’s width. The farmers measure it with their shadows.')] },
      { id: 'th1_losses', trigger: { type: 'casualties', minLost: 6 }, lines: [NEBET('We buried six on the canal bank today, priestess.'), SESHET('I know. We will spend them like silver, not like sand.')] },
    ],
    loss: ['Seshet must survive (defeat, retreat or surrender ends the chapter).', 'Losing Abedju is recoverable while Seshet has an army.', 'The shortening dawn is the story’s pressure, not a hidden countdown: there is no deadline in this chapter.'],
    help: [
      { id: 'th1_ring', title: 'The dike ring', text: 'The dike road joins Abedju, the fields, the north dike bridge, the desert ridge, the shrine causeway and the lower farms. The Lower Ford wades the dry lower-farms branch; it floods while the canal lock is open, and the road round the branch’s western tail always remains.' },
      { id: 'th1_lock_help', title: 'The canal lock', text: 'A hero standing at the cleared Canal Lock can open or close it at any time. Open, the branch waters the lower farms and floods the Lower Ford; closed, the bed dries and the ford can be waded. It refuses while anyone stands in the branch bed.' },
    ],
  });

  // =========================================================================
  // Chapter 2 — The Black Boar (card 16; legacy m02)
  // =========================================================================
  const herdArmy: Army = [['tusked_boar', 6], ['wild_boar', 12]];
  const westGranaryGuard: Army = [['brigand', 12], ['brigand_cutthroat', 4]];
  const northGranaryGuard: Army = [['brigand', 14], ['hill_slinger', 6]];
  const eastGranaryGuard: Army = [['brigand', 12], ['tusked_boar', 3]];
  const collectorArmy: Army = [['brigand', 14], ['brigand_cutthroat', 6]];
  const upperDepotGuard: Army = [['brigand', 12], ['brigand_cutthroat', 5]];
  const penGuard: Army = [['brigand', 10], ['tusked_boar', 4]];
  const landingGuard: Army = [['brigand', 16], ['brigand_cutthroat', 6]];
  const m2 = chapter({
    campaign: camp,
    chapter: 2,
    card: 16,
    name: 'The Black Boar',
    summary:
      'Boars driven out of the dried western marsh are rooting up Nekheb’s last crops — and Pawah finds that Paser’s collectors diverted the marsh’s water. Secure two of the three granaries, end the herd crisis by breaking its drovers or restoring a safe marsh route, and capture the collector’s account book.',
    playtime: '50–70 minutes, 3–5 battles',
    legacy: ['twelfth_hour_m02'],
    economyFrom: 'twelfth_hour_m02',
    principal: 'th2_granaries',
    soundscape: 'desert',
    hostileName: 'The Vizier’s Collectors',
    town: { siteId: 'th2_town', townId: 'nekheb', name: 'Nekheb' },
    map: {
      cols: 34,
      rows: 21,
      biome: 'desert', desertGround: true,
      base: 'plains',
      seed: 950002,
      texture: { rough: 40, forest: 25 },
      paint: [
        // The central wetland where the river spreads out, with open pools.
        { t: 'marsh', blob: [17, 9, 4] },
        { t: 'water', blob: [15, 7, 1] },
        { t: 'water', cells: [[20, 11], [19, 12], [14, 11]] },
        // The river from the north, and the three distributaries that make the islands.
        { t: 'water', line: [[17, 0], [17, 5]], width: 1 },
        { t: 'marsh', line: [[15, 3], [19, 3]], width: 0 },
        { t: 'water', line: [[13, 9], [8, 9], [1, 8]], width: 0 },
        { t: 'water', line: [[17, 13], [16, 17], [17, 20]], width: 0 },
        // The eastern arm ends in a salt lake: the dry eastern rim goes round it.
        { t: 'water', line: [[21, 9], [26, 8], [28, 9]], width: 0 },
        { t: 'water', blob: [29, 9, 1] },
        { t: 'rough', rect: [31, 1, 32, 19] },
        { t: 'rough', cells: [[30, 2], [30, 5], [30, 14], [30, 17]] },
        // The north-western reed meadows and the collectors' causeway through them.
        { t: 'marsh', blob: [7, 4, 2] },
        { t: 'plains', line: [[13, 7], [9, 5], [4, 2]], width: 0 },
        // The western marsh, dried out since the collectors' diversion.
        { t: 'rough', blob: [4, 13, 2] },
        { t: 'rough', cells: [[1, 17], [2, 18], [1, 18]] },
        // Palm groves and fields on the islands.
        { t: 'forest', cells: [[22, 2], [23, 2], [24, 16], [25, 17], [10, 2], [27, 3]] },
      ],
      roads: [
        // The short dike across the wetland: Nekheb to the north island.
        { via: ['th2_town', [15, 13], [17, 10], [20, 6], 'th2_g_north'] },
        // The breached dike and the dry eastern rim: the long, reliable route.
        { via: ['th2_town', 'th2_breach', [21, 15], [27, 16], [31, 12], [31, 6], 'th2_g_north'] },
        { via: [[21, 15], 'th2_g_east'] },
        // The landing over the western arm and the collectors' causeway.
        { via: ['th2_town', [10, 12], 'th2_landing', [11, 7], 'th2_depot1'] },
        { via: ['th2_depot1', [7, 4], 'th2_depot2'] },
        { via: [[11, 7], 'th2_g_west'] },
        { via: ['th2_g_west', 'th2_north_ford', [20, 3]] },
        // The western marsh: the dam, the drovers' pen, the Shrine of the Western Gate.
        { via: [[10, 12], [6, 11], 'th2_gate_shrine'] },
        { via: [[6, 11], 'th2_dam'] },
        { via: [[6, 11], 'th2_pen'] },
        // Spurs.
        { via: ['th2_town', 'th2_court'] },
        { via: ['th2_town', 'th2_crag'] },
        { via: ['th2_town', 'th2_amulet'] },
        { via: [[7, 4], 'th2_west_field'] },
        { via: [[20, 3], 'th2_north_field'] },
        { via: [[27, 16], 'th2_east_field'] },
        { via: [[27, 16], 'th2_tomb'] },
        { via: [[31, 12], 'th2_kennels'] },
        { via: [[6, 11], 'th2_den'] },
        { via: ['th2_town', 'th2_sawmill'] },
        { via: [[20, 6], 'th2_quarry'] },
      ],
    },
    sites: [
      S.town('th2_town', 'nekheb', [13, 16], 'Nekheb', 'A river town on the southern distributary, its fields rooted up to the walls.', [13, 15]),
      S.resource('th2_sawmill', [10, 19], 'sawmill', { name: 'Palm Grove', description: 'An unowned grove of date palms and timber. Capture for +2 Wood per day.' }),
      S.resource('th2_quarry', [21, 6], 'quarry'),
      S.watchtower('th2_crag', [9, 17], 'Vulture Crag', 'From the top, the whole delta lies open — the three islands, the wetland and the herd’s rooted rings.', ['th2_west_field', 'th2_north_field', 'th2_east_field', 'th2_pen']),
      S.shortcut('th2_breach', [16, 17], 'Breached Dike', 'Nekheb’s dike over the southern distributary, breached by the collectors’ men. Nekheb’s diggers will close it once a granary feeds them again — a short way to the east island.', ['th2_dike_repaired']),
      S.choice(
        'th2_court',
        [11, 15],
        'Nekheb Ration Court',
        'The court where Nekheb’s grain was weighed and taken. The confiscated sacks are stacked to the roof.',
        'The confiscated grain',
        'The collectors’ grain is Nekheb’s again — but Pawah has done the sums. “We can give the sacks back to the families they were taken from, and Nekheb will remember who did it. Or we can sell them south and buy seed and ploughshares for the next season — and for the capital, when we get there.”',
        [
          { label: 'Return the confiscated grain', summary: 'The families get their grain back: civilian support later (in the capital chapter the granary district already trusts Seshet and commits without a fight).', reward: { flags: ['th2_grain_returned'] }, requiresFlags: ['th2_granaries_secured'] },
          { label: 'Buy seed and tools', summary: 'The grain buys seed, tools and draught oxen: a stronger starting economy in the capital chapter (2,000 Gold, 8 Wood and 8 Stone more).', reward: { flags: ['th2_seed_tools'] }, requiresFlags: ['th2_granaries_secured'] },
        ],
        { marker: 'pact', objectiveIds: ['th2_choice'] },
      ),
      S.choice(
        'th2_amulet',
        [14, 19],
        'Amulet-maker’s Stall',
        'An old amulet-maker who has not closed her stall in forty years.',
        'The Amulet-maker',
        '“Forty years I have sold hearts of stone to people who were afraid of the scales,” the old woman says. “This year they buy them for the living.” She holds out a green stone scarab, warm as a hand. “Or sit, and I will tell you who drove the boar out of the reeds.”',
        [
          { label: 'Buy the heart scarab', summary: 'Pay 2,000 Gold for the Heart Scarab (+2 mana at dawn).', cost: { gold: 2000 }, reward: { artifactIds: ['heart_scarab'] } },
          { label: 'Sit and listen', summary: 'Seshet gains +1 Knowledge.', reward: { attributes: { knowledge: 1 } } },
        ],
      ),
      // The three granaries.
      S.landmark('th2_g_west', [12, 4], 'Reed-Island Granary', 'The granary of the north-western island, beside the collectors’ causeway. Paser’s collectors sealed it with the vizier’s mark.', 'quarry_cache', { label: 'Collectors at the reed-island granary', army: westGranaryGuard, reward: { flags: ['th2_g_west', 'th2_dike_repaired'], resources: { gold: 500, wood: 3 } }, battlefield: 'open_field' }, { marker: 'supply' }),
      S.landmark('th2_g_north', [25, 4], 'North-Island Granary', 'The largest granary of the delta, on the north island. The collectors keep their best men here.', 'quarry_cache', { label: 'Collectors at the north-island granary', army: northGranaryGuard, reward: { flags: ['th2_g_north', 'th2_dike_repaired'], resources: { gold: 700 } }, battlefield: 'open_field' }, { objectiveIds: ['th2_granaries'], marker: 'supply' }),
      S.landmark('th2_g_east', [27, 12], 'East-Island Granary', 'The granary of the east island, on the edge of the dry rim.', 'quarry_cache', { label: 'Collectors at the east-island granary', army: eastGranaryGuard, reward: { flags: ['th2_g_east', 'th2_dike_repaired'], resources: { gold: 500, stone: 3 } }, battlefield: 'open_field' }, { marker: 'supply' }),
      // The herd's feeding grounds (signposted by the drovers' tally sticks).
      S.depot('th2_west_field', [6, 6], 'Reed-Island Fields', 'Sheaves stacked at the reed-island feeding ground. The full harvest is here until the herd’s raid on the reed island.', { resources: { gold: 300, wood: 2 } }),
      S.depot('th2_north_field', [21, 2], 'North-Island Fields', 'Sheaves stacked at the north-island feeding ground. The full harvest is here until the herd’s raid on the north island.', { resources: { gold: 300, crystal: 1 } }),
      S.depot('th2_east_field', [25, 17], 'East-Island Fields', 'Sheaves stacked at the east-island feeding ground. The full harvest is here until the herd’s raid on the east island.', { resources: { gold: 300, stone: 2 } }),
      // The collectors' causeway.
      S.crossing('th2_landing', [9, 9], 'Ferry Landing', 'The landing over the western distributary, held by the collectors’ hirelings.', { label: 'Landing hirelings', army: landingGuard, reward: { resources: { gold: 600, favor: 3 } }, battlefield: 'coast_road' }),
      S.pickup('th2_depot1', [11, 6], 'Causeway Depot', 'The collectors’ first depot on the causeway: seized tools and grain. Paser’s collector keeps his account book here — for now.', { resources: { gold: 400, wood: 3 } }, { marker: 'evidence' }),
      S.landmark('th2_depot2', [4, 2], 'Upper Causeway Depot', 'The collectors’ second depot at the far end of the causeway, behind the reeds. The collector has said he will carry his books here.', 'quarry_cache', { label: 'Upper depot guard', army: upperDepotGuard, reward: { resources: { gold: 600, crystal: 1 } }, battlefield: 'coast_road' }, { marker: 'evidence' }),
      S.crossing('th2_north_ford', [17, 3], 'North Ford', 'A ford of the river where it enters the wetland, between the reed island and the north island.', null),
      // The western marsh.
      S.landmark('th2_pen', [4, 14], 'Drovers’ Pen', 'A pen in the dried-out western marsh where the collectors’ drovers keep and goad the herd.', 'refuge', { label: 'The drovers', army: penGuard, reward: { resources: { gold: 400 } }, battlefield: 'grove' }),
      S.choice(
        'th2_dam',
        [6, 10],
        'Collectors’ Diversion Dam',
        'An earth dam across the western distributary that sends the marsh’s water to the collectors’ fields upstream. The western marsh behind it has dried to cracked mud.',
        'The diversion dam',
        'The dam crew are farmers from upstream, paid in water. “Break it and the marsh fills by morning,” their foreman says. “The boars will go back into the reeds — they never wanted Nekheb’s barley, they wanted somewhere wet. But you will pay us for the work we lose.”',
        [
          { label: 'Pay to break the dam', summary: 'Costs 800 Gold, 4 Wood and 4 Stone. The western marsh fills again: the herd goes back into the reeds and the drovers abandon their pen (the herd crisis ends without a battle). The serpopards’ den opens.', cost: { gold: 800, wood: 4, stone: 4 }, reward: { flags: ['th2_water_restored'], questXp: 400 }, clearsSiteIds: ['th2_pen'] },
          { label: 'Read them the flood register', summary: 'Only with the Per-Djehuty flood records in hand: the register shows the marsh’s allotment was sold. The crew breaks the dam for 300 Gold. The herd goes home and the drovers abandon their pen; the serpopards’ den opens.', cost: { gold: 300 }, reward: { flags: ['th2_water_restored', 'th2_register_read'], questXp: 400 }, clearsSiteIds: ['th2_pen'], requiresFlags: ['fact:th3_records'] },
        ],
        { marker: 'pact' },
      ),
      S.neutral('th2_den', [2, 15], 'Serpopard Den', 'A shaded sandstone den where the desert meets the western marsh.', 'serpopard', 5, { flag: 'th2_water_restored', reason: 'The serpopards keep to their dry ravine until water returns to the western marsh.' }),
      S.activation(
        'th2_gate_shrine',
        [3, 11],
        'Shrine of the Western Gate',
        'The shrine where the evening sun is sung into the west, at the edge of the dried marsh. Dark since the herd came.',
        {
          cost: { gold: 300, favor: 3 },
          reward: { questXp: 1200 },
          requirements: [
            { type: 'objective_completed', objectiveId: 'th2_granaries' },
            { type: 'objective_completed', objectiveId: 'th2_herd' },
            { type: 'objective_completed', objectiveId: 'th2_book' },
          ],
          completesMission: true,
          confirm: 'Relight the Shrine of the Western Gate (300 Gold, 3 Favor)? This completes The Black Boar.',
        },
        null,
        { objectiveIds: ['th2_shrine'] },
      ),
      S.landmark('th2_tomb', [30, 18], 'Tomb of the Forgotten King', 'An opened tomb on the dry rim, used as a sty. Something gold glints in the dirt.', 'nest', { label: 'Sty boars', army: [['tusked_boar', 4], ['wild_boar', 6]], reward: { resources: { gold: 500 }, artifactIds: ['nemes_of_ra'] }, battlefield: 'grove' }),
      S.camp('th2_kennels', [31, 10], 'Desert Kennels', 'Jackals of the dry rim that have not joined the herd’s masters.', 'egyptian_jackal_guardian', 3, 4),
    ],
    patrols: [
      {
        commander: band('egyptian_black_boar', 'The Black Boar', 'creature.neutral.wild_boar.upgraded.portrait'),
        monster: true,
        bounty: { gold: 800 },
        start: [16, 10],
        // A loop through the three feeding grounds over the wetland dikes (short hops: the herd only walks ground it can see).
        waypoints: [[7, 6], [11, 7], [15, 8], [19, 6], [20, 3], [21, 7], [19, 11], [21, 14], [24, 15], [20, 12], [16, 11], [13, 8], [10, 7]],
        army: herdArmy,
        home: 'th2_pen',
        threshold: [3, 2],
        purpose: 'Driven between the three islands’ feeding grounds across the wetland dikes by the collectors’ drovers. Breaking the drovers’ pen — or restoring the western marsh so the boars go home — ends it for good.',
      },
      {
        commander: band('th2_collector', 'Paser’s Collector', HIRELING_PORTRAIT),
        monster: true,
        bounty: { gold: 500 },
        start: [10, 6],
        waypoints: [[5, 3]],
        army: collectorArmy,
        dormantUntil: 'th2_book_moving',
        threshold: [3, 1],
        purpose: 'Keeps his account book at the causeway depot. On the announced day he carries it up the causeway to the Upper Causeway Depot and stays there: the book can be taken from him wherever he is.',
      },
    ],
    objectives: [
      O.primary(
        'th2_granaries',
        'Secure two granaries',
        `Take two of the three granaries from the collectors: the reed island (${armyText(westGranaryGuard)}), the north island (${armyText(northGranaryGuard)}) or the east island (${armyText(eastGranaryGuard)}). The short dike across the wetland and the dry eastern rim both reach the north island.`,
        C.atLeast(2, C.cleared('th2_g_west'), C.cleared('th2_g_north'), C.cleared('th2_g_east')),
        { markerSiteId: 'th2_g_north', reward: { flags: ['th2_granaries_secured'] } },
      ),
      O.primary(
        'th2_herd',
        'End the herd crisis',
        `Stop the Black Boar’s herd (${armyText(herdArmy)}): defeat it on the dikes, break its drovers at their pen in the western marsh (${armyText(penGuard)}), or restore the safe marsh route at the Collectors’ Diversion Dam so the boars go home.`,
        C.defeated('egyptian_black_boar'),
        { reward: { flags: ['th2_herd_ended'] }, hint: 'The herd moves along the dikes between three signposted feeding grounds; Vulture Crag shows them all. It only charges an escort it is sure to beat.' },
      ),
      O.primary(
        'th2_book',
        'Capture the account book',
        `Take the collector’s account book from Paser’s collector (${armyText(collectorArmy)}) — at the Causeway Depot, or at the Upper Causeway Depot after he moves it.`,
        C.defeated('th2_collector'),
        { markerSiteId: 'th2_depot1', reward: { flags: ['th2_book'] } },
      ),
      O.primary('th2_shrine', 'Relight the western gate', 'With two granaries safe, the herd crisis over and the account book in hand, relight the Shrine of the Western Gate.', C.activated('th2_gate_shrine'), { markerSiteId: 'th2_gate_shrine', requires: ['th2_granaries', 'th2_herd', 'th2_book'] }),
      O.optional('th2_west_harvest', 'The reed-island harvest', 'Bring in the Reed-Island Fields before the herd’s raid there: +400 Gold more.', C.visited('th2_west_field'), { markerSiteId: 'th2_west_field', reward: { resources: { gold: 400 } } }),
      O.optional('th2_north_harvest', 'The north-island harvest', 'Bring in the North-Island Fields before the herd’s raid there: +400 Gold more.', C.visited('th2_north_field'), { markerSiteId: 'th2_north_field', reward: { resources: { gold: 400 } } }),
      O.optional('th2_east_harvest', 'The east-island harvest', 'Bring in the East-Island Fields before the herd’s raid there: +400 Gold more.', C.visited('th2_east_field'), { markerSiteId: 'th2_east_field', reward: { resources: { gold: 400 } } }),
      O.optional('th2_book_early', 'Before the removal', 'Take the account book at the Causeway Depot before the collector moves it: his clerk’s copy comes with it (+300 Gold, 600 experience).', C.defeated('th2_collector'), { markerSiteId: 'th2_depot1', reward: { resources: { gold: 300 }, questXp: 600 } }),
      O.optional('th2_choice', 'The confiscated grain', 'At the Nekheb Ration Court, once two granaries are safe, decide what happens to the confiscated grain.', C.any(C.flag('th2_grain_returned'), C.flag('th2_seed_tools')), { markerSiteId: 'th2_court' }),
      O.optional('th2_marsh', 'A safe marsh route', 'Break the Collectors’ Diversion Dam: water returns to the western marsh and the serpopards’ den opens.', C.flag('th2_water_restored'), { markerSiteId: 'th2_dam' }),
      O.optional('th2_tomb_sty', 'The forgotten king’s tomb', `Drive the boars (${armyText([['tusked_boar', 4], ['wild_boar', 6]])}) out of the opened tomb on the dry rim.`, C.cleared('th2_tomb'), { markerSiteId: 'th2_tomb' }),
    ],
    timers: [
      { id: 'th2_raid_west', label: 'The herd’s raid on the reed island', startWhen: C.all(), days: 5, metWhen: C.any(C.visited('th2_west_field'), C.defeated('egyptian_black_boar')), consequence: 'The reed-island crop is rooted up: its stores keep only the base share (the 400 Gold bonus is lost). The chapter continues.', announce: 'Pawah has read the drovers’ tally sticks: the reed island first.', onExpire: { flags: ['th2_west_raided'], failObjectives: ['th2_west_harvest'] } },
      { id: 'th2_raid_north', label: 'The herd’s raid on the north island', startWhen: C.all(), days: 9, metWhen: C.any(C.visited('th2_north_field'), C.defeated('egyptian_black_boar')), consequence: 'The north-island crop is rooted up: its stores keep only the base share (the 400 Gold bonus is lost). The chapter continues.', announce: 'The tally sticks name the north island next.', onExpire: { flags: ['th2_north_raided'], failObjectives: ['th2_north_harvest'] } },
      { id: 'th2_raid_east', label: 'The herd’s raid on the east island', startWhen: C.all(), days: 13, metWhen: C.any(C.visited('th2_east_field'), C.defeated('egyptian_black_boar')), consequence: 'The east-island crop is rooted up: its stores keep only the base share (the 400 Gold bonus is lost). That is the last raid on the sticks.', announce: 'The east island is the last raid on the drovers’ tally.', onExpire: { flags: ['th2_east_raided'], failObjectives: ['th2_east_harvest'] } },
      { id: 'th2_removal', label: 'The collector’s removal', startWhen: C.all(), days: 8, metWhen: C.defeated('th2_collector'), consequence: 'The collector carries his account book up the causeway to the Upper Causeway Depot and stays there. The book can still be taken from him; only the bonus for taking it early is lost.', announce: 'The collector has told his clerks to pack: in eight days his books go up the causeway.', onExpire: { flags: ['th2_book_moving'], failObjectives: ['th2_book_early'] } },
    ],
    evidence: [
      { id: 'th2_ev_book', flag: 'th2_book', title: 'The collector’s account book', text: 'Every sack taken from Nekheb, every measure of water sold upstream — and the vizier Paser’s seal on every page.', icon: 'evidence' },
      { id: 'th2_ev_granaries', flag: 'th2_granaries_secured', title: 'The granaries are Nekheb’s', text: 'Two of the delta’s granaries are back in Nekheb’s hands.', icon: 'supply' },
      { id: 'th2_ev_water', flag: 'th2_water_restored', title: 'The marsh refilled', text: 'The collectors’ diversion dam is broken; water is back in the western marsh and the boars went home.', icon: 'evacuation' },
      { id: 'th2_ev_returned', flag: 'th2_grain_returned', title: 'The grain returned', text: 'The confiscated grain went back to the families it was taken from.', icon: 'pact' },
      { id: 'th2_ev_seed', flag: 'th2_seed_tools', title: 'Seed and tools', text: 'The confiscated grain bought seed, tools and oxen for the next season.', icon: 'supply' },
      { id: 'th2_ev_herd', flag: 'th2_herd_ended', title: 'The herd crisis is over', text: 'The Black Boar’s herd no longer roots up Nekheb’s fields.', icon: 'evidence' },
    ],
    carried: ['th2_book', 'th2_granaries_secured', 'th2_water_restored', 'th2_grain_returned', 'th2_seed_tools', 'th2_herd_ended'],
    entryBonuses: [{ fact: 'th1_farms_first', label: 'Grain barges from Abedju’s lower farms (1,500 Gold)', wallet: { gold: 1500 } }],
    briefing: [
      PAWAH('The west bank of Nekheb is all tombs and shrines — and now a black boar runs its fields with a herd at its heels. They come out of the western marsh, priestess. Only the marsh is dry.'),
      SESHET('The black boar is an old sign. The shape the enemy of the sun likes best.'),
      PAWAH('Maybe. But I asked the dam crews upstream. Paser’s collectors bought the marsh’s water and sent it to their own fields. The boars were driven out by thirst before anyone drove them with sticks.'),
      NEBET('Then it is a fight over food, not an omen. The collectors hold the granaries on all three islands. Take two back, end the herd — and get me that collector’s account book.'),
    ],
    briefingVariants: [
      { ifFlags: ['fact:th3_records'], lines: [SESHET('The flood registers we carried out of Per-Djehuty list Nekheb’s water allotment by the season. If the collectors sold it, the register will show where it went.')] },
      { ifFlags: ['fact:th3_fraud_exposed'], lines: [NEBET('The forged quarry contracts at Edfu carried a collector’s seal of the vizier. I would like to know if Nekheb’s collectors use the same one.')] },
      { ifFlags: ['fact:th1_farms_first'], lines: [NEBET('Abedju’s lower farms sent their surplus downriver ahead of us. Nekheb will not starve while we work.')] },
    ],
    victory: [
      PAWAH('The western gate is lit again, and the marsh birds are back. Nekheb will eat this season.'),
      SESHET('And the account book has Paser’s seal on every page. The water, the grain, the boars — all of it bought. I came south looking for a broken rite.'),
    ],
    scenes: [
      { id: 'th2_crag', trigger: { type: 'site_visited', siteId: 'th2_crag' }, lines: [SESHET('There — three rooted rings, one on each island, and dike paths worn smooth between them. They are not grazing. They are being driven.'), NEBET('And the drovers’ pen is in the dry marsh, where the water used to be.')] },
      { id: 'th2_dam_broken', trigger: { type: 'flag', flag: 'th2_water_restored' }, lines: [PAWAH('Listen — water in the western marsh. The boars are already turning back into the reeds; the drovers are running.'), SESHET('They never wanted the barley. They wanted somewhere wet.')] },
      { id: 'th2_herd_battle', trigger: { type: 'battle_started', heroDefinitionId: 'egyptian_black_boar' }, lines: [DJED('Run, black one. Run her into the sand. The night is long and she is only one reader.')] },
      { id: 'th2_herd_over', trigger: { type: 'objective_completed', objectiveId: 'th2_herd' }, lines: [NEBET('The herd is broken. The survivors ran for the reeds.'), SESHET('Let them. A sign that has been read is only a pig.')] },
      { id: 'th2_dike', trigger: { type: 'flag', flag: 'th2_dike_repaired' }, lines: [PAWAH('Nekheb’s diggers have been paid in grain. They are closing the breached dike — the short way to the east island.')] },
      { id: 'th2_moving', trigger: { type: 'flag', flag: 'th2_book_moving' }, lines: [NEBET('The collector is on the causeway with his clerks and a mule-load of books, heading for the upper depot. It is not lost — he only moved it further from Nekheb.')] },
      { id: 'th2_book_register', trigger: { type: 'objective_completed', objectiveId: 'th2_book' }, ifFlags: ['fact:th3_records'], lines: [SESHET('Line for line, it matches the flood register from Per-Djehuty: every measure the register says Nekheb was owed, this book says was sold — under Paser’s seal.')] },
      { id: 'th2_book_plain', trigger: { type: 'objective_completed', objectiveId: 'th2_book' }, unlessFlags: ['fact:th3_records'], lines: [SESHET('Paser’s seal on every page — and on the last, a payment to a river captain for “keeping the old contracts under water” at Per-Djehuty.'), PAWAH('The drowned library. Someone wants its flood records kept wet.')] },
      { id: 'th2_raided', trigger: { type: 'flag', flag: 'th2_west_raided' }, lines: [PAWAH('The herd went through the reed island’s barley last night. What was stacked is still there; what was standing is gone.')] },
    ],
    loss: ['Seshet must survive.', 'Losing Nekheb is recoverable while Seshet has an army.', 'A raided field costs only its harvest bonus; the account book can always be recovered.'],
    help: [
      { id: 'th2_delta', title: 'The delta', text: 'Three islands surround the central wetland. The short dikes across the wetland are quick and easy to intercept; the dry eastern rim goes round the salt lake — longer, but always open. Nekheb’s breached dike opens once a granary is secured.' },
      { id: 'th2_raids', title: 'Announced raids', text: 'The drovers’ tally sticks give the herd’s raid days (they are in the journal). A raided field keeps its base stores and loses its bonus. The collector moves his account book on an announced day; it can be taken from him at either depot.' },
    ],
  });

  // =========================================================================
  // Chapter 3 — The Drowned Library and the Sculptor's Price (card 17; legacy m03 + m04)
  // =========================================================================
  const ankhwen = camp.v1('twelfth_hour_m04').hostileHeroes[0]?.commander;
  if (!ankhwen) throw new Error('Twelfth Hour v2: Ankhwen’s profile is missing from the legacy content');
  const bridgeGuard3: Army = [['brigand', 18], ['brigand_cutthroat', 6]];
  const terraceGuard: Army = [['brigand', 22], ['brigand_cutthroat', 8]];
  const hallGuard: Army = [['egyptian_crocodile_beast', 4], ['egyptian_sobek_warbeast', 2]];
  const depotGuard: Army = [['brigand', 24], ['brigand_cutthroat', 10], ['egyptian_crocodile_beast', 2]];
  const ankhwenArmy: Army = [['egyptian_solar_scarab', 16], ['egyptian_anubian_warden', 6]];
  const sealedGuard: Army = [['egyptian_ushabti', 4], ['egyptian_royal_ushabti', 1]];
  // The tail-race below the Weir of Thoth: dry while the weir is shut, a torrent while the library is drained.
  const tailRace: XY[] = [[26, 11], [25, 11], [24, 11], [23, 11], [22, 11], [21, 11], [20, 11]];
  const m3 = chapter({
    campaign: camp,
    chapter: 3,
    card: 17,
    name: 'The Drowned Library and the Sculptor’s Price',
    summary:
      'The flood records at Per-Djehuty could explain the missing hour, but the workers who could recover them serve a quarry debt at Edfu, and the river captain Ankhwen keeps the old contracts under water. Settle the sculptor’s labour contract, secure the raised weir terrace, choose a water level and extract two library records.',
    playtime: '70–90 minutes, 4–6 battles',
    legacy: ['twelfth_hour_m03', 'twelfth_hour_m04'],
    economyFrom: 'twelfth_hour_m03',
    principal: 'th3_records',
    soundscape: 'desert',
    hostileName: 'The Drowned Barge',
    town: { siteId: 'th3_town', townId: 'edfu', name: 'Edfu' },
    map: {
      cols: 38,
      rows: 22,
      biome: 'desert', desertGround: true,
      base: 'plains',
      seed: 950003,
      texture: { rough: 45, forest: 15 },
      paint: [
        // The wide river between Edfu's plain and Per-Djehuty.
        { t: 'water', line: [[19, 0], [18, 6], [19, 12], [18, 17], [19, 21]], width: 1 },
        // The north bridge's causeway, and the central shallow-water chain.
        { t: 'plains', line: [[15, 3], [22, 3]], width: 0 },
        { t: 'marsh', line: [[15, 13], [22, 13]], width: 0 },
        // The cliff ridge between Edfu's plain and the quarry shelf: the cliff road (north),
        // the quarry ramp (south) and the service cut behind Edfu.
        { t: 'mountain', line: [[7, 1], [6, 8], [6, 15], [7, 20]], width: 0 },
        { t: 'rough', rect: [1, 1, 5, 20] },
        { t: 'plains', cells: [[7, 3], [7, 18]] },
        // Per-Djehuty: the library precinct inside its flooded court, entered from the north, the
        // east and (over the tail-race) the west.
        { t: 'water', disc: [29, 9, 3] },
        { t: 'plains', disc: [29, 9, 2] },
        { t: 'plains', line: [[29, 9], [29, 5]], width: 0 },
        { t: 'plains', line: [[29, 9], [33, 9]], width: 0 },
        { t: 'plains', line: [[29, 9], [25, 9]], width: 0 },
        // Water from the court to the river: the tail-race (the weir's channel) cuts the scribes' causeway.
        { t: 'water', cells: [[27, 11], [27, 12]] },
        { t: 'marsh', cells: tailRace },
        // Reed marshes round the library; the dry sandstone edge in the south-east.
        { t: 'marsh', blob: [34, 5, 1] },
        { t: 'marsh', cells: [[24, 7], [25, 6], [33, 12], [34, 13], [26, 15]] },
        { t: 'rough', blob: [31, 18, 2] },
      ],
      roads: [
        // West bank: Edfu, the north road to the bridge, the south road to the ferry.
        { via: ['th3_town', [14, 8], [14, 4], 'th3_bridge', [24, 4], [29, 4], 'th3_rec_hours'] },
        { via: ['th3_town', [14, 15], 'th3_ferry_w'] },
        // The central shallows and the scribes' causeway over the tail-race to the library's west door.
        { via: ['th3_town', 'th3_shallows', [23, 13], [24, 10], [26, 9], 'th3_hall'] },
        // The east marsh path round the flooded court.
        { via: [[23, 13], [27, 14], [33, 11], [32, 9], 'th3_hall'] },
        { via: [[33, 11], [34, 7], [29, 4]] },
        { via: [[27, 14], 'th3_weir'] },
        { via: ['th3_ferry_e', [27, 17], 'th3_depot'] },
        { via: [[27, 17], [27, 14]] },
        // The quarry shelf: the cliff road, the quarry ramp and the service cut behind Edfu.
        { via: [[14, 4], [8, 3], 'th3_sculptor'] },
        { via: [[3, 6], 'th3_service', 'th3_town'] },
        { via: [[3, 6], [3, 16], [8, 18], [14, 15]] },
        // Spurs.
        { via: ['th3_sculptor', 'th3_sealed'] },
        { via: [[3, 16], 'th3_golems'] },
        { via: [[3, 16], 'th3_quarry'] },
        { via: ['th3_town', 'th3_house'] },
        { via: ['th3_town', 'th3_tower'] },
        { via: [[14, 8], 'th3_barge'] },
        { via: [[14, 4], 'th3_sawmill'] },
        { via: [[24, 4], 'th3_scribe'] },
        { via: [[34, 7], 'th3_ogres'] },
        { via: [[27, 17], 'th3_omen'] },
        { via: ['th3_ferry_e', 'th3_den'] },
      ],
    },
    sites: [
      S.town('th3_town', 'edfu', [11, 11], 'Edfu', 'A quarry town on the river plain under the cliffs.', [12, 11]),
      S.resource('th3_sawmill', [12, 2], 'sawmill', { name: 'Palm Grove', description: 'An unowned grove of date palms and timber. Capture for +2 Wood per day.' }),
      S.resource('th3_quarry', [2, 15], 'quarry'),
      S.watchtower('th3_tower', [13, 13], 'Pylon of Edfu', 'From the top of Edfu’s pylon the whole far bank lies open: the drowned library, the weir terrace and the drowned captain’s depot.', ['th3_weir', 'th3_hall', 'th3_depot']),
      S.pickup('th3_barge', [15, 7], 'Sunken Grain Barge', 'A grain barge sunk in the shallows; its strongbox is still above water.', { resources: { gold: 900, wood: 4 } }),
      // The quarry shelf.
      S.choice(
        'th3_sculptor',
        [3, 4],
        'The Sculptor’s Workshop',
        'An old sculptor at his bench on the quarry shelf, surrounded by unfinished servants and idle workers who owe the quarry more than they earn.',
        'The sculptor’s price',
        '“My workers could pull every tablet out of that library,” the old sculptor says, carving. “But they belong to the quarry until their debt is paid — a debt on a contract I never wrote. Pay it, and they go with you tomorrow. Or prove the contract false: the drowned captain keeps the originals at his barge depot across the river. Bring them here and I will read them to the whole quarry.”',
        [
          { label: 'Pay the workers’ debt', summary: 'Costs 1,500 Gold and 10 Wood. The workers cooperate at once: 4 Ushabti join Seshet and the quarry service road behind Edfu opens.', cost: { gold: 1500, wood: 10 }, reward: { flags: ['th3_debt_paid', 'th3_workers_free'], creatures: [{ creatureId: 'egyptian_ushabti', count: 4 }] } },
          { label: 'Expose the contract fraud', summary: 'Only with the forged contracts from Ankhwen’s barge depot. The debt is void and the quarry opens its books: the service road opens, and Edfu’s workers support Seshet later (the capital chapter starts with 10 Wood, 10 Stone and 6 Ushabti in its town).', reward: { flags: ['th3_fraud_exposed', 'th3_workers_free'], questXp: 600 }, requiresFlags: ['th3_contracts'] },
          { label: 'Pay what the account book allows', summary: 'Only with the collector’s account book from Nekheb: it shows what was skimmed from the debt. Costs 900 Gold and 6 Wood; 4 Ushabti join Seshet and the service road opens.', cost: { gold: 900, wood: 6 }, reward: { flags: ['th3_debt_paid', 'th3_workers_free', 'th3_book_shown'], creatures: [{ creatureId: 'egyptian_ushabti', count: 4 }] }, requiresFlags: ['fact:th2_book'] },
        ],
        { marker: 'pact', objectiveIds: ['th3_contract'] },
      ),
      S.shortcut('th3_service', [6, 11], 'Quarry Service Road', 'The workers’ cut through the cliff, straight down from the quarry shelf to the back of Edfu. Chained while the workers are held to their debt.', ['th3_workers_free']),
      S.landmark('th3_sealed', [2, 8], 'Sealed Workshop', 'A workshop sealed with the Hollow Lector’s mark. Inside, the ushabti stand guard.', 'refuge', { label: 'Sealed servants', army: sealedGuard, reward: { resources: { gold: 1000 }, artifactIds: ['scribes_papyrus_sandals'] }, battlefield: 'grove' }),
      S.camp('th3_golems', [3, 18], 'Quarry Workshop', 'Clay men from the quarry’s workshop, hired out by the day. The stock is shared with whoever else comes asking.', 'clay_golem', 2, 3),
      // The crossings.
      S.crossing('th3_bridge', [18, 3], 'North Bridge', 'The stone bridge to Per-Djehuty’s northern quarter, held by the drowned captain’s hirelings.', { label: 'Bridge hirelings', army: bridgeGuard3, reward: { resources: { gold: 600 } }, battlefield: 'coast_road' }),
      S.crossing('th3_shallows', [19, 13], 'Shallows of Thoth', 'A chain of sandbanks across the river, waded by pilgrims since the first kings. The way straight to the library — and to the weir terrace.', null),
      S.ferry('th3_ferry_w', [15, 18], 'Edfu Ferry Slip', 'The southern ferry’s slip on Edfu’s bank. The ferrymen are kept on the far bank by the drowned crew on the weir terrace.', 'th3_ferry_e', { flag: 'th3_ferry_running', reason: 'The ferrymen are held on the far bank: secure the weir terrace first' }),
      S.ferry('th3_ferry_e', [22, 18], 'Per-Djehuty Ferry Slip', 'The southern ferry’s slip on the library bank.', 'th3_ferry_w', { flag: 'th3_ferry_running', reason: 'The ferrymen are held on the far bank: secure the weir terrace first' }),
      // Per-Djehuty: the weir, the library and the drowned captain's depot.
      S.sluice(
        'th3_weir',
        [28, 14],
        'Weir of Thoth',
        'The weir that holds the river in the library’s flooded court, on a raised terrace above the tail-race. The drowned crew have made the terrace their staging ground.',
        {
          channel: tailRace,
          open: 'water',
          closed: 'marsh',
          startsOpen: false,
          openText: 'Open the weir: the flooded court drains through the tail-race and the library’s lower chambers come up out of the water — the records can be lifted. The tail-race floods the scribes’ causeway (the short way to the library’s west door); the north bridge, the east marsh path, the shallows and the ferry all remain.',
          closeText: 'Close the weir: the court floods again and the lower chambers go back under water. The tail-race dries and the scribes’ causeway can be walked.',
          openFlag: 'th3_drained',
        },
        { guard: guard({ label: 'The drowned crew on the weir terrace', army: terraceGuard, reward: { flags: ['th3_ferry_running'], resources: { gold: 800, favor: 3 } }, battlefield: 'coast_road' }), objectiveIds: ['th3_staging', 'th3_water'] },
      ),
      S.activation(
        'th3_hall',
        [29, 9],
        'House of Records',
        'The archive of every flood and every voyage of the sun, half under water. Turned river beasts guard its steps; the flood register lies in its lower hall.',
        { cost: { gold: 200 }, reward: { flags: ['th3_rec_register'], questXp: 800 }, requirements: [{ type: 'mission_flag', flag: 'th3_drained' }], confirm: 'Lift the flood register from the drained lower hall (200 Gold for jars and porters)?', label: 'relay' },
        { label: 'Turned river beasts', army: hallGuard, reward: { resources: { gold: 1000 } }, battlefield: 'coast_road', required: true },
        { objectiveIds: ['th3_records'], marker: 'evidence' },
      ),
      S.activation('th3_rec_hours', [29, 7], 'Lower Archive', 'The archive’s lowest room, where the hour-tables of the night are kept — under water while the court is full.', { cost: { gold: 200 }, reward: { flags: ['th3_rec_hours'], questXp: 600 }, requirements: [{ type: 'mission_flag', flag: 'th3_drained' }], confirm: 'Lift the hour-tables from the drained lower archive (200 Gold)?', label: 'relay' }, null, { marker: 'evidence' }),
      S.activation('th3_rec_log', [31, 10], 'Barque Chapel', 'The chapel of the sun’s barque, its log-rolls sealed in jars on the flooded floor.', { cost: { gold: 200 }, reward: { flags: ['th3_rec_log'], questXp: 600 }, requirements: [{ type: 'mission_flag', flag: 'th3_drained' }], confirm: 'Lift the barque log from the drained chapel (200 Gold)?', label: 'relay' }, null, { marker: 'evidence' }),
      S.landmark('th3_depot', [30, 17], 'Drowned Captain’s Barge Depot', 'Ankhwen’s depot of beached barges on the sandstone edge. His reinforcements and the quarry’s original contracts are kept here.', 'quarry_cache', { label: 'Barge depot crew', army: depotGuard, reward: { flags: ['th3_contracts'], resources: { gold: 1200 } }, battlefield: 'coast_road' }, { marker: 'evidence' }),
      S.choice(
        'th3_omen',
        [26, 19],
        'The Drowned Barge',
        'Ankhwen’s own barge, beached and empty below the depot.',
        'The Drowned Barge',
        'The barge is dry inside, though it lies in the water. On the captain’s chair is a ledger: every barge he turned back, every crew he took. The last page has your name on it. Under the chair, a chest — and a crate of temple arrows the crew never used.',
        [
          { label: 'Take the chest', summary: '+800 Gold and +2 Crystal.', reward: { resources: { gold: 800, crystal: 2 } } },
          { label: 'Arm the jackals', summary: '6 Anubian Wardens join Seshet’s escort.', reward: { creatures: [{ creatureId: 'egyptian_anubian_warden', count: 6 }] } },
        ],
      ),
      S.choice(
        'th3_scribe',
        [25, 3],
        'A Scribe on a Reed Boat',
        'A scribe with an ibis-headed staff poles a reed boat along the northern bank.',
        'The Ibis Scribe',
        'He writes as he poles, and he does not look up. “You are going to the House of Records,” he says. “Good. Read the eleventh page twice. And take this — the night is long, and a priestess should not walk it with nothing but hymns.”',
        [
          { label: 'Take the Djed amulet', summary: 'The Djed Amulet joins Seshet’s backpack.', reward: { artifactIds: ['djed_amulet'] } },
          { label: 'Ask him to teach you', summary: 'Seshet gains +1 Spell Power and +1 Knowledge.', reward: { attributes: { power: 1, knowledge: 1 } } },
        ],
      ),
      S.landmark('th3_ogres', [35, 3], 'Ogres’ Reed-hall', 'Two ogres have built a hall of reeds and stolen grain in the northern marsh.', 'nest', { label: 'Reed-hall ogres', army: [['ogre', 2]], reward: { resources: { crystal: 5 } }, battlefield: 'grove' }),
      S.neutral('th3_den', [23, 20], 'Serpopard Den', 'A shaded sandstone den on the river edge below Per-Djehuty.', 'serpopard', 5),
      S.activation(
        'th3_house',
        [10, 13],
        'House of Life of Edfu',
        'Edfu’s scriptorium, where the recovered records can be copied and read in the dry.',
        {
          cost: { gold: 300 },
          reward: { questXp: 1500, flags: ['th3_records_read'] },
          requirements: [
            { type: 'objective_completed', objectiveId: 'th3_records' },
            { type: 'objective_completed', objectiveId: 'th3_contract' },
          ],
          completesMission: true,
          confirm: 'Lay the recovered records out in the House of Life and read them (300 Gold for the copyists)? This completes the chapter.',
        },
        null,
        { objectiveIds: ['th3_extract'], marker: 'evidence' },
      ),
    ],
    patrols: [
      {
        commander: ankhwen,
        start: [32, 15],
        waypoints: [[28, 16], [25, 15], [27, 13], [31, 13], [33, 10], [34, 7], [31, 4], [27, 4], [30, 5], [35, 6], [35, 10], [34, 13], [31, 15]],
        army: ankhwenArmy,
        home: 'th3_depot',
        purpose: 'The drowned captain’s barge circuit along the far bank, from his depot round the flooded court to the northern quarter and back. His reinforcements come from the barge depot: taking it ends the circuit for good.',
      },
    ],
    objectives: [
      O.primary(
        'th3_contract',
        'Settle the sculptor’s contract',
        `At the Sculptor’s Workshop on the quarry shelf, pay the workers’ debt — or expose the fraud with the forged contracts from Ankhwen’s barge depot (${armyText(depotGuard)}), a harder battle with a better later reward.`,
        C.any(C.flag('th3_debt_paid'), C.flag('th3_fraud_exposed')),
        { markerSiteId: 'th3_sculptor' },
      ),
      O.primary('th3_staging', 'Secure the weir terrace', `Drive the drowned crew (${armyText(terraceGuard)}) from the raised terrace of the Weir of Thoth before draining anything. The ferrymen they hold are freed.`, C.cleared('th3_weir'), { markerSiteId: 'th3_weir' }),
      O.primary(
        'th3_water',
        'Choose the water level',
        'Standing on the terrace, open the Weir of Thoth: the library’s lower chambers come out of the water, and the tail-race floods the scribes’ causeway. The preview says exactly what changes; the weir can be closed again at any time.',
        C.flag('th3_drained'),
        { markerSiteId: 'th3_weir', requires: ['th3_staging'], reward: { flags: ['th3_drained_once'] } },
      ),
      O.primary(
        'th3_records',
        'Two library records',
        `While the court is drained, lift two of the three records: the flood register in the House of Records (its river beasts: ${armyText(hallGuard)}), the hour-tables in the Lower Archive, or the barque log in the Barque Chapel. The north bridge (${armyText(bridgeGuard3)}), the east marsh path and the shallows all reach the library.`,
        C.atLeast(2, C.activated('th3_hall'), C.activated('th3_rec_hours'), C.activated('th3_rec_log')),
        { markerSiteId: 'th3_hall', requires: ['th3_water'], reward: { flags: ['th3_records'] } },
      ),
      O.primary('th3_extract', 'Extract the records', 'Carry the records back over the river — by the shallows, the north bridge or the southern ferry — and read them in Edfu’s House of Life.', C.activated('th3_house'), { markerSiteId: 'th3_house', requires: ['th3_records', 'th3_contract'] }),
      O.optional('th3_ankhwen', 'Intercept Ankhwen', `Catch the drowned captain (${armyText(ankhwenArmy)}) on his circuit — or take his barge depot and he withdraws.`, C.defeated('egyptian_ankhwen')),
      O.optional('th3_depot_taken', 'The barge depot', `Take Ankhwen’s barge depot (${armyText(depotGuard)}): the original contracts, and no more reinforcements for his circuit.`, C.cleared('th3_depot'), { markerSiteId: 'th3_depot' }),
      O.optional('th3_all_records', 'All three records', 'Lift all three records while the court is drained (+1,000 Gold for the copyists’ guild).', C.all(C.activated('th3_hall'), C.activated('th3_rec_hours'), C.activated('th3_rec_log')), { reward: { resources: { gold: 1000 } } }),
      O.optional('th3_sealed_ws', 'The sealed workshop', `Break the sealed servants (${armyText(sealedGuard)}) in the workshop on the quarry shelf.`, C.cleared('th3_sealed'), { markerSiteId: 'th3_sealed' }),
      O.optional('th3_scribe_visit', 'The ibis scribe', 'Meet the scribe on the reed boat on the northern bank.', C.visited('th3_scribe'), { markerSiteId: 'th3_scribe' }),
    ],
    evidence: [
      { id: 'th3_ev_register', flag: 'th3_rec_register', title: 'The flood register', text: 'Every flood since the first king — and in the last three years, the water allotments of the river towns sold by the vizier’s collectors.', icon: 'evidence' },
      { id: 'th3_ev_hours', flag: 'th3_rec_hours', title: 'The hour-tables', text: 'The tables of the twelve hours of the night. The twelfth has been struck through in a living hand — Djedkhonsu’s, the High Lector’s.', icon: 'evidence' },
      { id: 'th3_ev_log', flag: 'th3_rec_log', title: 'The barque log', text: 'The log of the sun’s barque: it entered the twelfth hour and has not left it. Someone is holding the last hour closed.', icon: 'evidence' },
      { id: 'th3_ev_records', flag: 'th3_records', title: 'Records recovered', text: 'Two records lifted from the drowned library: Djedkhonsu is holding the last hour closed.', icon: 'evidence' },
      { id: 'th3_ev_contracts', flag: 'th3_contracts', title: 'The forged contracts', text: 'The quarry’s labour contracts, kept wet at Ankhwen’s depot: forged, and sealed by a collector of the vizier Paser.', icon: 'evidence' },
      { id: 'th3_ev_paid', flag: 'th3_debt_paid', title: 'The debt paid', text: 'Seshet paid the workers’ debt; they came at once.', icon: 'pact' },
      { id: 'th3_ev_exposed', flag: 'th3_fraud_exposed', title: 'The fraud exposed', text: 'The forged contracts were read out at the quarry: the debt is void, and Edfu’s workers will remember it.', icon: 'pact' },
    ],
    carried: ['th3_records', 'th3_rec_register', 'th3_rec_hours', 'th3_rec_log', 'th3_contracts', 'th3_debt_paid', 'th3_fraud_exposed', 'th3_book_shown'],
    entryBonuses: [{ fact: 'th1_channel_first', label: 'Abedju’s boat crews: the southern ferry runs from the first day (and 5 Wood, 5 Stone)', wallet: { wood: 5, stone: 5 }, flags: ['th3_ferry_running'] }],
    briefing: [
      SESHET('Every flood the river has made since the first king is written down at Per-Djehuty. If the hours and the water failed together, the library will say how.'),
      PAWAH('The library is under water, priestess, and so is everything in its lower rooms. Someone would have to hold the weir on the far bank and lift the records while the court is drained.'),
      NEBET('And the only people who know those rooms are Edfu’s quarry workers — who belong to the quarry until a debt is paid. The old sculptor on the shelf holds their contract.'),
      ANKHWEN('(across the water, from a barge with no crew you can see) Turn back, reader. What is under the water stays under the water.'),
    ],
    briefingVariants: [
      { ifFlags: ['fact:th2_book'], lines: [NEBET('The collector’s account book from Nekheb paid a river captain to keep “the old contracts under water” at Per-Djehuty. Now we know which captain — and which water.')] },
      { ifFlags: ['fact:th2_water_restored'], lines: [PAWAH('Nekheb’s marsh is full again. Water goes where it is let go, priestess — remember that at the weir.')] },
      { ifFlags: ['fact:th1_channel_first'], lines: [PAWAH('Abedju’s boat crews came downriver with us. The southern ferry is theirs to run from today.')] },
    ],
    victory: [
      SESHET('The hour-tables, the barque log, the flood register — they all say the same thing. The barque entered the twelfth hour and has not left it. Djedkhonsu is holding the last hour closed.'),
      PAWAH('And the vizier’s collectors kept the waters that would have told us. Paser sits in Per-Wadjet with the grain of three provinces.'),
    ],
    scenes: [
      { id: 'th3_sculptor_book', trigger: { type: 'site_visited', siteId: 'th3_sculptor' }, ifFlags: ['fact:th2_book'], lines: [NEBET('Show him the collector’s book from Nekheb. Half this debt went to the same seal.'), SESHET('Then we pay what is owed, and not a ring more.')] },
      { id: 'th3_sculptor_plain', trigger: { type: 'site_visited', siteId: 'th3_sculptor' }, unlessFlags: ['fact:th2_book'], lines: [NEBET('A debt on a contract nobody wrote. Either we pay it, or we find the originals.'), SESHET('Then we find out who keeps them.')] },
      { id: 'th3_contracts_book', trigger: { type: 'site_cleared', siteId: 'th3_depot' }, ifFlags: ['fact:th2_book'], lines: [PAWAH('The quarry’s original contracts, soaked and re-sealed — with the same collector’s seal as the account book from Nekheb.'), SESHET('The vizier’s collectors again. Take them to the sculptor.')] },
      { id: 'th3_contracts_plain', trigger: { type: 'site_cleared', siteId: 'th3_depot' }, unlessFlags: ['fact:th2_book'], lines: [PAWAH('The quarry’s original contracts — and the debt clause written over in another hand, sealed by a collector of the vizier Paser.'), SESHET('A vizier’s collector, forging quarry debts. Take them to the sculptor.')] },
      { id: 'th3_terrace', trigger: { type: 'site_cleared', siteId: 'th3_weir' }, lines: [NEBET('The terrace is ours, and the ferrymen are free — the southern ferry runs again.'), PAWAH('Open the weir when you are ready, priestess. It will tell you what it does before it does it.')] },
      { id: 'th3_drained', trigger: { type: 'flag', flag: 'th3_drained' }, lines: [PAWAH('The court is going down — there, the lower steps! And the tail-race is roaring over the scribes’ causeway. We go round by the marsh path, or by the north.')] },
      { id: 'th3_hall_battle', trigger: { type: 'battle_started', siteId: 'th3_hall' }, lines: [DJED('You read well, little lector. Read this: no one comes back from the eleventh hour.')] },
      { id: 'th3_ankhwen_battle', trigger: { type: 'battle_started', heroDefinitionId: 'egyptian_ankhwen' }, lines: [ANKHWEN('Every barge I turned back, I wrote down. Your name is on the last page.'), SESHET('Then let me read it to you.')] },
      { id: 'th3_records_found', trigger: { type: 'objective_completed', objectiveId: 'th3_records' }, lines: [SESHET('Two records, dry in their jars. Back over the river — the shallows, the bridge or the ferry; Edfu’s House of Life can read them.')] },
      { id: 'th3_service_open', trigger: { type: 'flag', flag: 'th3_workers_free' }, lines: [NEBET('The workers have taken the chain off the service road. The quarry shelf is a short walk from Edfu’s back gate now.')] },
    ],
    loss: ['Seshet must survive.', 'Losing Edfu is recoverable while Seshet has an army.', 'The weir changes the water only when Seshet operates it; there is no flood cycle and no deadline. The shallows, the north bridge and the ferry never all close.'],
    help: [
      { id: 'th3_crossings', title: 'Three crossings', text: 'The north bridge, the Shallows of Thoth and the southern ferry (running once the weir terrace is secured) join Edfu to Per-Djehuty. The quarry service road behind Edfu opens when the workers’ contract is settled.' },
      { id: 'th3_weir_help', title: 'The Weir of Thoth', text: 'Open, the weir drains the library’s court (its records can be lifted) and floods the tail-race over the scribes’ causeway; closed, the court floods again and the causeway is dry. The north door and the east marsh path always reach the library. It refuses while anyone stands in the tail-race.' },
    ],
  });

  // =========================================================================
  // Chapter 4 — The Red Vizier (card 18; legacy m05)
  // =========================================================================
  const v1m05 = camp.v1('twelfth_hour_m05');
  const paserSetup = v1m05.rivals?.[0];
  if (!paserSetup) throw new Error('Twelfth Hour v2: Paser’s profile is missing from the legacy content');
  const capitalGarrison: Army = [['egyptian_solar_scarab', 30], ['egyptian_anubian_warden', 12], ['egyptian_sphinx', 4]];
  const quayGuard: Army = [['brigand', 20], ['brigand_cutthroat', 8], ['egyptian_crocodile_beast', 2]];
  const storehouseGuard: Army = [['egyptian_solar_scarab', 16], ['egyptian_anubian_warden', 6]];
  const templeBridgeGuard: Army = [['clay_golem', 8]];
  const merchantBridgeGuard: Army = [['brigand', 24], ['brigand_cutthroat', 10]];
  const rearGuard: Army = [['brigand', 12], ['hill_slinger', 6]];
  const levyColumnArmy: Army = [['egyptian_solar_scarab', 16], ['egyptian_anubian_warden', 6], ['egyptian_sphinx', 1]];
  const convoyArmy: Army = [['brigand', 10], ['clay_golem', 4]];
  const m4base = chapter({
    campaign: camp,
    chapter: 4,
    card: 18,
    name: 'The Red Vizier',
    summary:
      'Paser presents rationing as sacred order and rewards the districts that stay loyal. Take Per-Wadjet without inheriting a starving city: secure its food connection and two of the three district commitments, then besiege the capital by hand — or obtain Paser’s abdication with the published accounts and the districts’ backing.',
    playtime: '70–90 minutes, 4–6 battles',
    legacy: ['twelfth_hour_m05'],
    economyFrom: 'twelfth_hour_m05',
    principal: 'th4_allegiance',
    soundscape: 'desert',
    hostileName: 'The Red Vizier',
    town: { siteId: 'th4_town', townId: 'tjebu', name: 'Tjebu' },
    map: {
      cols: 36,
      rows: 22,
      biome: 'desert', desertGround: true,
      base: 'plains',
      seed: 950004,
      texture: { rough: 45, forest: 15 },
      paint: [
        // Per-Wadjet's raised island in the river, with the water all round it.
        { t: 'water', disc: [20, 11, 5] },
        { t: 'rough', disc: [20, 11, 3] },
        { t: 'plains', disc: [20, 11, 1] },
        // The temple bridge (north-west), the merchant bridge (south-west) and the rear landing (east):
        // each spans the two water rings with one causeway cell and the guarded crossing.
        { t: 'plains', cells: [[18, 7], [18, 15], [24, 11]] },
        // The river comes down from the north into the lake round the island.
        { t: 'water', line: [[22, 0], [21, 6]], width: 0 },
        // The outer crescent: temple, granary and merchant districts on the western bank.
        { t: 'forest', cells: [[10, 3], [11, 3], [7, 9], [7, 13], [12, 20], [13, 20]] },
        // The quarry district by Tjebu, and the long desert east of the river.
        { t: 'rough', blob: [3, 17, 2] },
        { t: 'rough', rect: [27, 1, 34, 20] },
        { t: 'mountain', line: [[30, 3], [33, 7]], width: 0 },
        { t: 'mountain', line: [[32, 13], [29, 15]], width: 0 },
        { t: 'plains', disc: [29, 17, 1] },
      ],
      roads: [
        // The crescent road from Tjebu through the three districts.
        { via: ['th4_town', [8, 7], 'th4_temple'] },
        { via: ['th4_town', [9, 11], 'th4_ferry_w'] },
        { via: ['th4_town', [9, 15], 'th4_guild'] },
        { via: [[8, 7], [9, 11], [9, 15]] },
        // The bridges and the ferry onto the island.
        { via: ['th4_temple', 'th4_temple_bridge', [19, 8], 'th4_capital'] },
        { via: ['th4_guild', 'th4_merchant_bridge', [19, 14], 'th4_capital'] },
        // The long desert road round the south to the rear landing.
        { via: ['th4_town', [6, 20], [20, 20], [26, 18], 'th4_well', [31, 11], 'th4_rear', 'th4_capital'] },
        // Spurs.
        { via: [[9, 11], 'th4_quay'] },
        { via: [[9, 11], 'th4_storehouse'] },
        { via: [[9, 11], 'th4_elders'] },
        { via: [[8, 7], 'th4_granary_store'] },
        { via: [[9, 15], 'th4_scribe'] },
        { via: [[19, 8], 'th4_levy_steps'] },
        { via: [[19, 14], 'th4_audience'] },
        { via: ['th4_town', 'th4_quarry'] },
        { via: ['th4_town', 'th4_slingers'] },
        { via: ['th4_town', 'th4_sawmill'] },
        { via: ['th4_well', 'th4_den'] },
        { via: [[31, 11], 'th4_oasis'] },
        // The temple pontoon: once the temple district commits, a short way over the northern arm to the desert road.
        { via: ['th4_temple', 'th4_pontoon', [28, 6], [31, 11]] },
      ],
    },
    sites: [
      S.town('th4_town', 'tjebu', [4, 11], 'Tjebu', 'A town on the river road north, loyal to the old hymns — Seshet’s camp for the march on the capital.', [5, 11]),
      S.town('th4_capital', 'per_wadjet', [20, 11], 'Per-Wadjet', 'Paser’s capital on its raised island, its walls painted red. Its garrison is his household guard.', [19, 11]),
      S.resource('th4_quarry', [2, 16], 'quarry'),
      S.resource('th4_sawmill', [6, 3], 'sawmill', { name: 'Palm Grove', description: 'An unowned grove of date palms and timber. Capture for +2 Wood per day.' }),
      S.resource('th4_granary_store', [8, 5], 'gold_mine', { name: 'Royal Granary Storehouse', description: 'The granary district’s great storehouse, whose sales paid Paser’s levy. Capture for +1,000 Gold per day — Paser’s levy column will try to take it back.' }),
      S.camp('th4_slingers', [4, 19], 'Quarry-District Slingers', 'Hill slingers who work the quarries south of Tjebu and fight for pay.', 'hill_slinger', 3, 6),
      // The temple district.
      S.choice(
        'th4_temple',
        [12, 4],
        'Temple of Wadjet',
        'The temple district’s great temple, whose priests bless Paser’s rationing as sacred order.',
        'The temple district',
        'The high priestess of Wadjet receives Seshet on the temple steps, a lector to a lector. “The vizier feeds this district first because we bless his rations. Give us a reason to bless something else.” Nebet, at the door, says quietly: “Do not promise them his privileges, priestess. That is how he bought them.”',
        [
          { label: 'Publish the vizier’s accounts on the steps', summary: 'Only with Paser’s accounts in hand. The accounts are read aloud to the district: the temple commits to Seshet, and the accounts are published.', reward: { flags: ['th4_temple', 'th4_published', 'th4_convoy_out'], questXp: 400 }, requiresFlags: ['th4_accounts'] },
          { label: 'Restore the temple’s open dole', summary: 'Costs 1,500 Gold. The temple feeds every district’s poor, not only the loyal ones: the temple commits to Seshet.', cost: { gold: 1500 }, reward: { flags: ['th4_temple', 'th4_convoy_out'] } },
        ],
        { marker: 'pact' },
      ),
      // The granary district.
      S.landmark('th4_storehouse', [10, 9], 'Levy Storehouse', 'Where Paser’s levy is weighed and stored, and his levy column is quartered. His strongest remaining income.', 'quarry_cache', { label: 'Levy guards', army: storehouseGuard, reward: { flags: ['th4_granary', 'th4_convoy_out', 'th4_income_broken'], resources: { gold: 800 } }, battlefield: 'open_field' }, { marker: 'supply' }),
      S.choice(
        'th4_elders',
        [7, 10],
        'Granary Elders',
        'The elders of the granary district, sitting by the empty levy scales.',
        'The granary elders',
        'The eldest weighs a handful of barley and lets it run through her fingers. “Nekheb’s people came up the river road with their own grain on their backs, grain the collectors took and you gave back. If that is how you rule, we will not fight for the vizier’s scales.”',
        [{ label: 'Accept the elders’ word', summary: 'Only if Nekheb’s confiscated grain was returned. The granary district commits to Seshet and the levy guards stand down (no battle at the storehouse): Paser’s strongest income is gone.', reward: { flags: ['th4_granary', 'th4_convoy_out', 'th4_income_broken'], questXp: 400 }, requiresFlags: ['th4_nekheb_word'], clearsSiteIds: ['th4_storehouse'] }],
        { marker: 'pact' },
      ),
      S.activation(
        'th4_quay',
        [13, 12],
        'Grain Quay',
        'The quay where the granary barges load for the capital. Paser’s levy boatmen hold it, and only his barges sail.',
        { cost: { gold: 500, wood: 4 }, reward: { flags: ['th4_food_route'], questXp: 500 }, confirm: 'Pay 500 Gold and 4 Wood to put the grain barges back in service? The barges sail for the city’s people, not for the vizier’s household.', label: 'relay' },
        { label: 'Levy boatmen', army: quayGuard, reward: { resources: { gold: 600 } }, battlefield: 'coast_road' },
        { objectiveIds: ['th4_food'], marker: 'supply' },
      ),
      S.ferry('th4_ferry_w', [14, 11], 'Grain Ferry (district quay)', 'The grain barges’ crossing from the granary district to the island.', 'th4_ferry_e', { flag: 'th4_food_route', reason: 'Only Paser’s barges sail: put the Grain Quay back in service first' }),
      S.ferry('th4_ferry_e', [17, 11], 'Grain Ferry (island landing)', 'The island’s grain landing below the walls of Per-Wadjet.', 'th4_ferry_w', { flag: 'th4_food_route', reason: 'Only Paser’s barges sail: put the Grain Quay back in service first' }),
      // The merchant district.
      S.choice(
        'th4_guild',
        [12, 17],
        'Merchants’ Guild',
        'The guild house of the merchant district, whose caravans pay the vizier’s customs.',
        'The merchant district',
        'The guild master counts on his fingers. “The vizier taxes every caravan twice — once at the well, once at the bridge. Guarantee our caravans for a season and the guild will stand with whoever gives that guarantee.”',
        [{ label: 'Guarantee the caravans', summary: 'Costs 1,200 Gold and 4 Wood. The merchant district commits to Seshet.', cost: { gold: 1200, wood: 4 }, reward: { flags: ['th4_merchant', 'th4_convoy_out'], questXp: 300 } }],
        { marker: 'pact' },
      ),
      S.shortcut('th4_pontoon', [22, 2], 'Temple Pontoon', 'The temple’s pontoon bridge over the river’s northern arm, drawn in by Wadjet’s priests. They lower it for whoever wins the temple district: a short way from the temple to the desert road and the rear landing.', ['th4_temple']),
      S.pickup('th4_scribe', [10, 19], 'Customs Scribe’s House', 'A customs scribe of the vizier’s who kept a second copy of every account — and is ready to hand it over.', { flags: ['th4_accounts'], resources: { gold: 300 } }, { marker: 'evidence' }),
      // The crossings to the island.
      S.crossing('th4_temple_bridge', [18, 6], 'Temple Bridge', 'The bridge from the temple district to the island, held by clay men on Paser’s orders.', { label: 'Bridge golems', army: templeBridgeGuard, reward: { resources: { gold: 800 } }, battlefield: 'coast_road' }),
      S.crossing('th4_merchant_bridge', [18, 16], 'Merchant Bridge', 'The bridge from the merchant district to the island, held by the vizier’s hired swords.', { label: 'Bridge hirelings', army: merchantBridgeGuard, reward: { resources: { gold: 800 } }, battlefield: 'coast_road' }),
      S.crossing('th4_rear', [25, 11], 'Rear Landing', 'The island’s back landing at the end of the long desert road, watched by slingers.', { label: 'Landing watch', army: rearGuard, reward: { resources: { gold: 500 } }, battlefield: 'coast_road' }),
      // On the island.
      S.choice(
        'th4_audience',
        [21, 14],
        'Vizier’s Audience Steps',
        'The steps below the palace where the vizier receives petitioners — and where he could step down.',
        'The vizier’s abdication',
        'Paser comes down the steps alone. He reads the accounts — his own collectors’ hands — and the seals of the districts that have left him. “I kept three provinces fed while the sun failed,” he says. “Fed them in order, by loyalty, as the gods order the hours.” Seshet answers: “You fed them by who blessed you.” A long silence. “Then let the districts keep their own scales. I step down.”',
        [{ label: 'Accept Paser’s abdication', summary: 'Needs his accounts published on the temple steps, two districts’ backing and his strongest income — the Levy Storehouse — taken from him. Per-Wadjet changes allegiance without a siege; Paser leaves the palace under the districts’ guard.', reward: { flags: ['th4_abdication'], questXp: 1500 }, requiresFlags: ['th4_published', 'th4_backing', 'th4_income_broken'] }],
        { marker: 'pact' },
      ),
      S.choice(
        'th4_levy_steps',
        [21, 8],
        'Granary Steps of Per-Wadjet',
        'The great granary of the capital on the island’s north side, with the vizier’s emergency levy-rolls still nailed to its door.',
        'The emergency grain levy',
        'Nebet tears the levy-rolls off the door and hands them to Seshet. “Abolish it, and every district knows the new order is not the old one with a different seal. Or keep a small levy, written up where anyone can read it, and use it for the rookery at Iunu — the bennu will not be freed with hymns. Only do not keep it the way he kept it.”',
        [
          { label: 'Abolish the emergency levy', summary: 'The districts keep their grain: legitimacy (in the final chapter, the river towns send volunteers to Abu — 12 Anubian Wardens and 10 Favor). Remembered as Seshet’s argument for open rule.', reward: { flags: ['th4_levy_abolished'], questXp: 500 }, requiresFlags: ['th4_allegiance_won'] },
          { label: 'Keep a limited, publicly accounted levy', summary: 'A small levy, posted on the granary door: it funds the rookery rescue (the Iunu chapter starts with 2,500 Gold and 3 Crystal more). Remembered as Seshet’s argument for a public office.', reward: { flags: ['th4_levy_accounted'], questXp: 500 }, requiresFlags: ['th4_allegiance_won'] },
        ],
        { marker: 'pact', objectiveIds: ['th4_levy'] },
      ),
      // The long desert road.
      S.neutral('th4_den', [29, 18], 'Serpopards of the Caravan Well', 'A shaded sandstone den beside the outer caravan well, where the desert road meets the river.', 'serpopard', 5),
      S.pickup('th4_well', [27, 16], 'Outer Caravan Well', 'A caravan well on the long desert road, its cistern still full.', { resources: { gold: 400, crystal: 1 } }),
      S.choice(
        'th4_oasis',
        [32, 9],
        'Oasis of the Old Well',
        'An oasis whose well never runs dry.',
        'The Old Well',
        'At the bottom of the well something gleams — a coin, a ring, a cup — and a voice from the water says: “Take one, or leave them all and drink.”',
        [
          { label: 'Take the gleam', summary: '+1,500 Gold.', reward: { resources: { gold: 1500 } } },
          { label: 'Leave it and drink', summary: 'Seshet gains +1 Defense and +1 Knowledge.', reward: { attributes: { defense: 1, knowledge: 1 } } },
        ],
      ),
    ],
    patrols: [
      {
        commander: band('th4_levy_column', 'The Vizier’s Levy Column', 'creature.egyptian.tier2.upgraded.portrait'),
        monster: true,
        bounty: { gold: 600 },
        start: [9, 8],
        waypoints: [[8, 5], [12, 6], [9, 13], [12, 15], [9, 13], [9, 8]],
        army: levyColumnArmy,
        home: 'th4_storehouse',
        threshold: [3, 2],
        purpose: 'Paser concentrates his field troops on his strongest remaining income, the granary district, and rides the crescent road to take back the Royal Granary Storehouse whenever it is lost. It is quartered at the Levy Storehouse: taking it ends the column for good.',
      },
      {
        commander: band('th4_convoy', 'Paser’s Ration Convoy', 'creature.neutral.clay_golem.base.portrait'),
        monster: true,
        bounty: { gold: 600 },
        start: [30, 13],
        waypoints: [[27, 10]],
        army: convoyArmy,
        dormantUntil: 'th4_convoy_out',
        threshold: [3, 1],
        purpose: 'One ration convoy waiting at the vizier’s desert stores, sent up the desert road to unload at the rear landing once the first district turns to Seshet. Intercept it for its supplies, or let it through to feed the city.',
      },
    ],
    objectives: [
      O.primary('th4_food', 'Secure the food connection', `Drive the levy boatmen (${armyText(quayGuard)}) from the Grain Quay and put the grain barges back in service: the Grain Ferry carries food to the city — and to Seshet.`, C.activated('th4_quay'), { markerSiteId: 'th4_quay' }),
      O.primary(
        'th4_districts',
        'Two district commitments',
        `Win two of the three districts: the temple district (publish the vizier’s accounts, or restore the open dole), the granary district (take the Levy Storehouse: ${armyText(storehouseGuard)}) or the merchant district (guarantee the caravans).`,
        C.atLeast(2, C.flag('th4_temple'), C.flag('th4_granary'), C.flag('th4_merchant')),
        { reward: { flags: ['th4_backing'] }, hint: 'Paser’s accounts can be had from the customs scribe in the merchant district, if they are not already in hand.' },
      ),
      O.primary(
        'th4_allegiance',
        'Per-Wadjet changes allegiance',
        `With the food connection secured and two districts behind Seshet, obtain Paser’s abdication at the Vizier’s Audience Steps — with his accounts published and the Levy Storehouse, his strongest income, taken from him — or besiege Per-Wadjet (his household: ${armyText(capitalGarrison)}) over the temple bridge (${armyText(templeBridgeGuard)}), the merchant bridge (${armyText(merchantBridgeGuard)}) or the rear landing (${armyText(rearGuard)}). A siege is fought by hand.`,
        C.any(C.flag('th4_abdication'), C.owned('per_wadjet')),
        { markerSiteId: 'th4_capital', requires: ['th4_food', 'th4_districts'], reward: { flags: ['th4_allegiance_won'] } },
      ),
      O.primary('th4_levy', 'The emergency grain levy', 'At the Granary Steps of Per-Wadjet, decide what becomes of Paser’s emergency levy: abolish it, or keep a small levy in public accounts for the rookery rescue.', C.any(C.flag('th4_levy_abolished'), C.flag('th4_levy_accounted')), { markerSiteId: 'th4_levy_steps', requires: ['th4_allegiance'], completesMission: true }),
      O.optional('th4_intercept', 'Intercept the ration convoy', `Catch Paser’s ration convoy (${armyText(convoyArmy)}) on the desert road before it reaches the city: its stores are Seshet’s. Let it pass and the city eats.`, C.defeated('th4_convoy')),
      O.optional('th4_column', 'Break the levy column', `Beat Paser’s levy column (${armyText(levyColumnArmy)}) or take the Levy Storehouse it is quartered in.`, C.defeated('th4_levy_column')),
      O.optional('th4_siege', 'Per-Wadjet by siege', 'Take the capital by siege rather than abdication.', C.owned('per_wadjet'), { markerSiteId: 'th4_capital' }),
    ],
    timers: [
      {
        id: 'th4_convoy_run',
        label: 'Paser’s ration convoy',
        startWhen: C.flag('th4_convoy_out'),
        days: 5,
        metWhen: C.defeated('th4_convoy'),
        consequence: 'The convoy reaches the rear landing and its rations go to the city’s people. Only the chance to intercept its stores is lost; the chapter continues.',
        announce: 'Paser has sent a ration convoy from his desert stores along the long road to the rear landing.',
        onExpire: { flags: ['th4_convoy_fed'], failObjectives: ['th4_intercept'] },
      },
    ],
    evidence: [
      { id: 'th4_ev_accounts', flag: 'th4_accounts', title: 'Paser’s accounts', text: 'The vizier’s accounts: rations by loyalty, district by district, sealed by his own collectors.', icon: 'evidence' },
      { id: 'th4_ev_published', flag: 'th4_published', title: 'The accounts published', text: 'Paser’s accounts were read aloud on the steps of the Temple of Wadjet.', icon: 'evidence' },
      { id: 'th4_ev_food', flag: 'th4_food_route', title: 'The food connection', text: 'The grain barges sail from the district quay to the island for the city’s people.', icon: 'supply' },
      { id: 'th4_ev_income', flag: 'th4_income_broken', title: 'His strongest income broken', text: 'The Levy Storehouse is no longer Paser’s: his levy column has nothing left to defend.', icon: 'evidence' },
      { id: 'th4_ev_abdication', flag: 'th4_abdication', title: 'Paser abdicated', text: 'Paser stepped down before the districts’ seals and his own accounts.', icon: 'pact' },
      { id: 'th4_ev_fed', flag: 'th4_convoy_fed', title: 'The convoy let through', text: 'Paser’s ration convoy reached the city, and its people ate.', icon: 'evacuation' },
      { id: 'th4_ev_abolished', flag: 'th4_levy_abolished', title: 'The levy abolished', text: 'The emergency grain levy is gone: the districts keep their grain.', icon: 'branch' },
      { id: 'th4_ev_accounted', flag: 'th4_levy_accounted', title: 'A public levy', text: 'A small levy remains, posted on the granary door, to fund the rookery rescue at Iunu.', icon: 'branch' },
    ],
    carried: ['th4_abdication', 'th4_levy_abolished', 'th4_levy_accounted', 'th4_convoy_fed', 'th4_published', 'th4_allegiance_won'],
    entryBonuses: [
      { fact: 'th2_book', label: 'The collector’s account book: Paser’s accounts are already in hand', flags: ['th4_accounts'] },
      { fact: 'th2_seed_tools', label: 'Nekheb’s seed and tools: a stronger economy (2,000 Gold, 8 Wood, 8 Stone)', wallet: { gold: 2000, wood: 8, stone: 8 } },
      { fact: 'th2_grain_returned', label: 'Nekheb’s returned grain: the granary district trusts Seshet', flags: ['th4_nekheb_word'] },
      { fact: 'th3_fraud_exposed', label: 'Edfu’s freed workers: 10 Wood, 10 Stone and 6 Ushabti in Tjebu', wallet: { wood: 10, stone: 10 }, garrison: [{ creatureId: 'egyptian_ushabti', count: 6 }] },
    ],
    briefing: [
      NEBET('Paser holds Per-Wadjet and the grain of three provinces. He feeds the districts that bless him first, and calls it the order of the hours.'),
      PASER('Turn back, priestess. A kingdom of dusk is still a kingdom, and I have kept it fed.'),
      SESHET('We take the city — but not a starving one. The grain quay first, so food reaches the people whatever happens to the palace. Then the districts: two of them are enough to make him listen.'),
      NEBET('And when he listens, priestess, do not use his system on him. A levy by loyalty is a levy by loyalty, whoever holds the scales.'),
    ],
    briefingVariants: [
      { ifFlags: ['fact:th2_book'], lines: [PAWAH('We carry the collector’s account book from Nekheb — Paser’s seal on every page. Read it on the temple steps and the priests will have to answer.')] },
      { ifFlags: ['fact:th3_records'], lines: [SESHET('The flood registers from Per-Djehuty show where the water went. The vizier’s accounts will show where the grain went.')] },
      { ifFlags: ['fact:th2_grain_returned'], lines: [NEBET('Nekheb’s families came up the river road with the grain we gave back. The granary district has heard.')] },
      { ifFlags: ['fact:th3_fraud_exposed'], lines: [PAWAH('Edfu’s quarry workers followed us north — free of their debt, with timber, stone and their ushabti.')] },
    ],
    victory: [
      SESHET('Per-Wadjet has changed hands and the grain barges still sail. Nobody starved for it.'),
      NEBET('And the levy-rolls are off the granary door. Now Iunu: Hekaib has caged the bennu, and every dawn they burn for Djedkhonsu.'),
    ],
    scenes: [
      { id: 'th4_quay_open', trigger: { type: 'flag', flag: 'th4_food_route' }, lines: [NEBET('The barges are loading for the island — for the city’s people, not the palace. Whatever happens now, Per-Wadjet eats.')] },
      { id: 'th4_convoy_sent', trigger: { type: 'flag', flag: 'th4_convoy_out' }, lines: [PAWAH('A district has turned, and Paser has answered: a ration convoy from his desert stores, coming up the long road to the rear landing.'), NEBET('We can take its grain for ourselves. Or we can let the city eat it. Choose with your eyes open, priestess.')] },
      { id: 'th4_convoy_fed', trigger: { type: 'flag', flag: 'th4_convoy_fed' }, lines: [NEBET('The convoy reached the rear landing. The city ate tonight — and they know who let it pass.')] },
      { id: 'th4_convoy_taken', trigger: { type: 'objective_completed', objectiveId: 'th4_intercept' }, lines: [PAWAH('The convoy’s stores are ours.'), NEBET('And Paser will tell the city we took their bread. Make sure the barges at the quay prove him wrong.')] },
      { id: 'th4_published', trigger: { type: 'flag', flag: 'th4_published' }, lines: [SESHET('Every ration, every district, every blessing he paid for — read aloud on Wadjet’s steps.'), NEBET('And not one name of a man who disagreed with us. Good.')] },
      { id: 'th4_siege', trigger: { type: 'battle_started', siteId: 'th4_capital' }, lines: [PASER('You fight for a sun that has left you. I fight for the people who are still here.'), SESHET('Then you should have fed them all.')] },
      { id: 'th4_abdicated', trigger: { type: 'flag', flag: 'th4_abdication' }, lines: [PASER('The districts can keep their own scales. Let us see how long the hours hold without anyone to order them.'), NEBET('Longer than you think, vizier.')] },
      { id: 'th4_pontoon', trigger: { type: 'flag', flag: 'th4_temple' }, lines: [PAWAH('The priests of Wadjet have lowered their pontoon over the northern arm. The desert road and the rear landing are a day nearer from the temple district.')] },
      { id: 'th4_storehouse_retaken', trigger: { type: 'site_cleared', siteId: 'th4_storehouse' }, lines: [PAWAH('The levy storehouse is ours, and the vizier’s column has nowhere to sleep. It is pulling back inside the walls.')] },
    ],
    loss: ['Seshet must survive.', 'Losing Tjebu is recoverable while Seshet has an army.', 'There is no need to take every district or to fight every neutral.'],
    help: [
      { id: 'th4_island', title: 'The capital on its island', text: 'Per-Wadjet stands on a raised island. The temple bridge and the merchant bridge join it to the crescent of districts; the Grain Ferry runs from the district quay once the barges are back in service; the long desert road reaches the rear landing. The temple’s pontoon over the northern arm opens once the temple district commits. A siege of the city is fought by hand.' },
      { id: 'th4_paser', title: 'Paser’s answers', text: 'His levy column rides the crescent from the Levy Storehouse and retakes the Royal Granary Storehouse when it can; taking the storehouse ends it. When a district turns, he sends one ration convoy along the desert road: intercept it, or let it feed the city.' },
    ],
  });
  // Per-Wadjet is an unowned city held by Paser's household (taken by siege, or handed over by his abdication).
  const v1Capital = paserSetup.town;
  const m4 = {
    ...m4base,
    neutralTowns: [
      {
        townId: 'per_wadjet',
        siteId: 'th4_capital',
        name: 'Per-Wadjet',
        archetypeId: v1Capital.archetypeId,
        buildings: v1Capital.buildings,
        population: {},
        covenants: [],
        garrison: capitalGarrison.map(([creatureId, count]) => ({ creatureId, count })),
      },
    ],
  };

  // =========================================================================
  // Chapter 5 — The Phoenix Rookery (card 19; legacy m06)
  // =========================================================================
  const v1m06 = camp.v1('twelfth_hour_m06');
  const hekaib = v1m06.sites.find((x) => x.id === 'm06_gate')?.guard?.commander;
  if (!hekaib) throw new Error('Twelfth Hour v2: Hekaib’s profile is missing from the legacy content');
  const R5 = 22;
  const OASIS: XY = [17, 9];
  const outpostGuard: Army = [['brigand', 16], ['brigand_cutthroat', 6]];
  const westStairGuard: Army = [['brigand_cutthroat', 24], ['tusked_boar', 6]];
  const eastStepsGuard: Army = [['clay_golem', 8], ['bronze_golem', 2]];
  const jailerGuard: Army = [['egyptian_solar_scarab', 30], ['bronze_golem', 3], ['egyptian_sobek_warbeast', 2]];
  const hekaibArmy: Army = [['egyptian_solar_scarab', 30], ['egyptian_anubian_warden', 10], ['egyptian_royal_ushabti', 4], ['egyptian_great_sphinx', 3]];
  const reserveArmy: Army = [['egyptian_solar_scarab', 18], ['egyptian_anubian_warden', 6]];
  const barracksGuard: Army = [['egyptian_solar_scarab', 14], ['egyptian_anubian_warden', 4], ['bronze_golem', 1]];
  const [w3, w4, w5] = ray(R5, OASIS, 3, 3, 5) as [XY, XY, XY];
  const [e3, e4, e5] = ray(R5, OASIS, 0, 3, 5) as [XY, XY, XY];
  const [s3, s4, s5] = ray(R5, OASIS, 5, 3, 5) as [XY, XY, XY];
  const m5 = chapter({
    campaign: camp,
    chapter: 5,
    card: 19,
    name: 'The Phoenix Rookery',
    summary:
      'Hekaib has caged the bennu in the rookery on the oasis island to feed Djedkhonsu’s arrested dawn — and the oasis settlements burn the same failing fire. Supply a safe chain of two outposts first, then free the rookery, deal with Hekaib at the prison or on the way back, and return the rescued fire to Iunu.',
    playtime: '60–80 minutes, 4–5 battles',
    legacy: ['twelfth_hour_m06'],
    economyFrom: 'twelfth_hour_m06',
    principal: 'th5_rookery_clear',
    soundscape: 'desert',
    hostileName: 'The Hollow Lector’s Host',
    town: { siteId: 'th5_town', townId: 'iunu', name: 'Iunu' },
    map: {
      cols: 34,
      rows: R5,
      biome: 'desert', desertGround: true,
      base: 'plains',
      seed: 950005,
      texture: { rough: 60, forest: 20 },
      paint: [
        // The circular oasis lake with the rookery island in the middle.
        { t: 'water', disc: [OASIS[0], OASIS[1], 5] },
        { t: 'plains', disc: [OASIS[0], OASIS[1], 2] },
        // The rookery prison on the island's north side: two assault approaches, the west stair
        // (broken rock, cover) and the east steps (open ground).
        { t: 'mountain', cells: [at(R5, OASIS, 0, -2), at(R5, OASIS, 2, -2)] },
        { t: 'rough', cells: [at(R5, OASIS, -1, -1)] },
        // Three causeways converge on the island: west, east and Iunu's (south).
        { t: 'plains', cells: [w3, w5, e3, e5, s3, s5] },
        // Palms round the oasis shore.
        { t: 'forest', cells: [[11, 5], [12, 4], [22, 4], [23, 5], [10, 12], [24, 13]] },
        // Dune ridges between Iunu and the two outposts: the dune perimeter goes round their ends,
        // the ruined service paths cut through them.
        { t: 'mountain', line: [[14, 15], [10, 17], [6, 19]], width: 0 },
        { t: 'mountain', line: [[21, 14], [25, 17], [29, 19]], width: 0 },
        { t: 'rough', blob: [3, 15, 2] },
        { t: 'rough', blob: [30, 14, 2] },
        // The remote escarpment of the wyverns in the north-east.
        { t: 'mountain', line: [[28, 1], [28, 3], [31, 4]], width: 0 },
        { t: 'rough', cells: [[30, 2], [31, 2], [29, 2]] },
      ],
      roads: [
        // Iunu's causeway to the island hub.
        { via: ['th5_town', 'th5_iunu_causeway', OASIS] },
        // The dune perimeter: Iunu – west outpost – north hamlet – east outpost – Iunu.
        { via: ['th5_town', [4, 19], [3, 12], 'th5_west_outpost'] },
        { via: ['th5_west_outpost', [8, 4], 'th5_hamlet'] },
        { via: ['th5_hamlet', [26, 5], 'th5_east_outpost'] },
        { via: ['th5_east_outpost', [31, 11], [31, 19], 'th5_town'] },
        // The west and east causeways.
        { via: ['th5_west_outpost', 'th5_west_causeway', OASIS] },
        { via: ['th5_east_outpost', 'th5_east_causeway', OASIS] },
        // The two assault approaches to the rookery.
        { via: [OASIS, 'th5_west_stair', 'th5_rookery'] },
        { via: [OASIS, 'th5_east_steps', 'th5_rookery'] },
        // The ruined service paths.
        { via: ['th5_town', 'th5_west_path', 'th5_west_outpost'] },
        { via: ['th5_town', 'th5_east_path', 'th5_east_outpost'] },
        // Spurs.
        { via: ['th5_town', 'th5_altar'] },
        { via: [[26, 5], 'th5_barracks'] },
        { via: [[26, 5], 'th5_wyverns'] },
        { via: [[8, 4], 'th5_ogres'] },
        { via: ['th5_hamlet', 'th5_egg'] },
        { via: [[3, 12], 'th5_sawmill'] },
        { via: [[31, 11], 'th5_quarry'] },
        { via: [[4, 19], 'th5_mine'] },
      ],
    },
    sites: [
      S.town('th5_town', 'iunu', [17, 18], 'Iunu', 'The sun’s own city on the south edge of the oasis, dark for the first time in its history.', [17, 17]),
      S.resource('th5_sawmill', [2, 10], 'sawmill', { name: 'Palm Grove', description: 'An unowned grove of date palms and timber. Capture for +2 Wood per day.' }),
      S.resource('th5_quarry', [32, 9], 'quarry'),
      S.resource('th5_mine', [2, 18], 'gold_mine'),
      // The causeways and the rookery.
      S.crossing('th5_iunu_causeway', s4, 'Causeway of Iunu', 'The pilgrims’ causeway from Iunu to the island, where the three causeways meet below the rookery.', null),
      S.crossing('th5_west_causeway', w4, 'West Causeway', 'The causeway from the west outpost to the island.', null),
      S.crossing('th5_east_causeway', e4, 'East Causeway', 'The causeway from the east outpost to the island.', null),
      S.crossing('th5_west_stair', at(R5, OASIS, 0, -1), 'Cutthroat Stair', 'The western stair up to the rookery: broken rock and cover all the way, held by cutthroats and their boars.', { label: 'Stair cutthroats', army: westStairGuard, reward: { resources: { gold: 1000 } }, battlefield: 'ridge_pass' }),
      S.crossing('th5_east_steps', at(R5, OASIS, 1, -1), 'Golem Steps', 'The eastern steps up to the rookery: wide and open, held by golems.', { label: 'Step golems', army: eastStepsGuard, reward: { resources: { gold: 1000 } }, battlefield: 'open_field' }),
      S.activation(
        'th5_rookery',
        at(R5, OASIS, 1, -2),
        'The Rookery',
        'The bennu cages on the island crown, under the Hollow Lector’s jailers. The birds burn low and red; every dawn their fire is drawn off for Djedkhonsu.',
        {
          cost: { gold: 500, crystal: 2 },
          reward: { flags: ['th5_freed'], questXp: 1500, entitlementIds: ['covenant.egyptian_bennu.twelfth_hour6'] },
          requirements: [{ type: 'objective_completed', objectiveId: 'th5_outposts' }],
          confirm: 'Open the cages (500 Gold, 2 Crystal for the fire-keepers)? The bennu fire stops feeding Djedkhonsu’s dawn — and the outposts’ supplies keep the settlements alive.',
        },
        { label: 'Rookery jailers', army: jailerGuard, reward: { resources: { gold: 1500 } }, battlefield: 'grove', required: true },
        { objectiveIds: ['th5_rookery_clear', 'th5_free'], marker: 'evacuation' },
      ),
      // The outposts and the ruined service paths.
      S.activation(
        'th5_west_outpost',
        [9, 9],
        'West Well Outpost',
        'An outpost at the oasis’s western well, whose lamps and kilns burn bennu fire. Sand raiders squat in it.',
        { cost: { gold: 600, wood: 5 }, reward: { flags: ['th5_supply_first', 'th5_west_supplied'], questXp: 500 }, confirm: 'Deliver oil, charcoal and lamp-wicks to the west outpost (600 Gold, 5 Wood)? Its people can keep their kilns and lamps without the bennu fire.', label: 'relay' },
        { label: 'Sand raiders at the west well', army: outpostGuard, reward: { resources: { gold: 400 } }, battlefield: 'open_field' },
        { marker: 'supply' },
      ),
      S.activation(
        'th5_east_outpost',
        [25, 9],
        'East Palm Outpost',
        'An outpost in the eastern palm groves, whose ovens and lamps burn bennu fire. Sand raiders squat in it.',
        { cost: { gold: 600, stone: 5 }, reward: { flags: ['th5_supply_first', 'th5_east_supplied'], questXp: 500 }, confirm: 'Deliver oil, charcoal and lamp-wicks to the east outpost (600 Gold, 5 Stone)? Its people can keep their ovens and lamps without the bennu fire.', label: 'relay' },
        { label: 'Sand raiders at the palm groves', army: outpostGuard, reward: { resources: { gold: 400 } }, battlefield: 'open_field' },
        { marker: 'supply' },
      ),
      S.shortcut('th5_west_path', [10, 17], 'West Service Path', 'A ruined service path through the dunes from Iunu to the west well. The outpost’s carters will clear it once they are supplied.', ['th5_west_supplied']),
      S.shortcut('th5_east_path', [25, 17], 'East Service Path', 'A ruined service path through the dunes from Iunu to the palm groves. The outpost’s carters will clear it once they are supplied.', ['th5_east_supplied']),
      S.landmark('th5_hamlet', [17, 2], 'North Hamlet', 'A hamlet on the oasis’s north shore that cooks, lights and warms itself with bennu fire. Its people will move to the outposts once those are supplied.', 'refuge', null, { marker: 'evacuation' }),
      // Hekaib's reserve.
      S.landmark('th5_barracks', [27, 2], 'Reserve Barracks', 'Hekaib’s reserve barracks under the escarpment. When an outpost is supplied, he sends the reserve to the rookery.', 'refuge', { label: 'Barracks guard', army: barracksGuard, reward: { resources: { gold: 800 } }, battlefield: 'ridge_pass' }),
      // Optional places.
      S.camp('th5_wyverns', [30, 3], 'Wyvern Escarpment', 'Wyverns roost on the remote escarpment. They will fly for whoever can afford them — an expensive sidegrade, never a need.', 'wyvern', 1, 2),
      S.landmark('th5_ogres', [3, 3], 'Ogre Den', 'Two ogre chieftains in a cave of stolen offerings.', 'nest', { label: 'Ogre chieftains', army: [['ogre_chieftain', 2]], reward: { resources: { crystal: 6 } }, battlefield: 'grove' }),
      S.choice(
        'th5_egg',
        [14, 2],
        'An Egg in the Ashes',
        'An egg of myrrh, warm in a bed of cold ash by the hamlet’s shrine.',
        'The Egg of Myrrh',
        'The egg is myrrh, the shape of the bennu’s own, and it is warm. Carried, it will keep warm for a month. Burned, its smoke will tell you the names of the hours.',
        [
          { label: 'Carry it', summary: '+2 Crystal and +10 Favor.', reward: { resources: { crystal: 2, favor: 10 } } },
          { label: 'Burn it and learn the hours', summary: 'Seshet gains 1,000 experience.', reward: { questXp: 1000 } },
        ],
      ),
      S.choice(
        'th5_altar',
        [19, 19],
        'Altar of the Rising',
        'The altar of Iunu where the bennu’s fire is lit at dawn.',
        'The rescued fire',
        'The fire-keepers bring the freed bennu’s first embers down the causeway in a bronze bowl. Pawah weighs it in both hands. “Enough for one use, priestess. Light Iunu’s homes with it, and the city stands behind you when the Lector comes. Or seal it in the bowl and carry it to the last hour — fire like this will break one of his formations.”',
        [
          { label: 'Light Iunu’s homes', summary: 'Iunu earns a defensive reserve: in the final chapter, 6 Royal Ushabti and 1 Radiant Bennu hold Abu.', reward: { flags: ['th5_fire_homes'], questXp: 500 }, requiresFlags: ['th5_freed', 'th5_hekaib_down', 'th5_evacuated'] },
          { label: 'Preserve the fire for the final rite', summary: 'The sealed bowl goes with Seshet: in the final chapter it breaks one of Djedkhonsu’s formations (the Serpent Stair’s guard scatters without a battle).', reward: { flags: ['th5_fire_rite'], questXp: 500 }, requiresFlags: ['th5_freed', 'th5_hekaib_down', 'th5_evacuated'] },
        ],
        { marker: 'pact', objectiveIds: ['th5_return'] },
      ),
    ],
    patrols: [
      {
        commander: hekaib,
        start: at(R5, OASIS, 2, -1),
        waypoints: [s3, s5, [18, 16]],
        army: hekaibArmy,
        dormantUntil: 'th5_freed',
        purpose: 'Hekaib holds the rookery beside the east steps. When the cages open he comes down Iunu’s causeway after the rescued fire: fight him at the prison, or intercept him on the way back.',
      },
      {
        commander: band('th5_reserve', 'Hekaib’s Reserve', 'creature.egyptian.tier1.upgraded.portrait'),
        monster: true,
        bounty: { gold: 600 },
        start: [26, 4],
        waypoints: [[23, 9], e3, OASIS],
        army: reserveArmy,
        home: 'th5_barracks',
        dormantUntil: 'th5_supply_first',
        threshold: [3, 2],
        purpose: 'Waits at the Reserve Barracks until the first outpost is supplied, then moves once to the causeway hub below the rookery. Taking the barracks first cancels it.',
      },
    ],
    objectives: [
      O.primary(
        'th5_outposts',
        'A safe chain of two outposts',
        `Clear the sand raiders (${armyText(outpostGuard)}) from the West Well Outpost and the East Palm Outpost and deliver their supplies. With both supplied, the dependent settlements move onto the new supply by themselves.`,
        C.all(C.activated('th5_west_outpost'), C.activated('th5_east_outpost')),
        { reward: { flags: ['th5_evacuated'] }, hint: 'The dune perimeter reaches both outposts; each delivery clears a service path back to Iunu.' },
      ),
      O.primary(
        'th5_rookery_clear',
        'Break the rookery jailers',
        `Break the jailers (${armyText(jailerGuard)}) at the rookery — up the Cutthroat Stair (${armyText(westStairGuard)}, broken rock and cover) or the Golem Steps (${armyText(eastStepsGuard)}, open ground).`,
        C.cleared('th5_rookery'),
        { markerSiteId: 'th5_rookery' },
      ),
      O.primary('th5_free', 'Free the bennu', 'With both outposts supplied, open the cages at the rookery. Freeing them before the supply chain stands would leave the settlements without fire.', C.activated('th5_rookery'), { markerSiteId: 'th5_rookery', requires: ['th5_outposts', 'th5_rookery_clear'] }),
      O.primary('th5_hekaib', 'Defeat Hekaib', `Defeat Hekaib (${armyText(hekaibArmy)}) — at the prison beside the east steps, or when he comes down the causeway after the freed fire.`, C.defeated('egyptian_hekaib'), { reward: { flags: ['th5_hekaib_down'] } }),
      O.primary('th5_return', 'Return the fire to Iunu', 'Carry the rescued fire to the Altar of the Rising in Iunu and decide how it is used.', C.any(C.flag('th5_fire_homes'), C.flag('th5_fire_rite')), { markerSiteId: 'th5_altar', requires: ['th5_outposts', 'th5_free', 'th5_hekaib'], completesMission: true }),
      O.optional('th5_bright', 'Before the fire dims', 'Free the bennu before their visible depletion passes the fire-keepers’ mark: 2 Bennu fly with Seshet.', C.flag('th5_freed'), { markerSiteId: 'th5_rookery', reward: { creatures: [{ creatureId: 'egyptian_bennu', count: 2 }] } }),
      O.optional('th5_reserve_barracks', 'The reserve barracks', `Take the Reserve Barracks (${armyText(barracksGuard)}) before Hekaib can move his reserve.`, C.cleared('th5_barracks'), { markerSiteId: 'th5_barracks' }),
      O.optional('th5_hamlet_visit', 'The north hamlet', 'Visit the north hamlet that lives on the bennu fire.', C.visited('th5_hamlet'), { markerSiteId: 'th5_hamlet' }),
    ],
    timers: [
      {
        id: 'th5_dimming',
        label: 'The bennu’s dimming fire',
        startWhen: C.all(),
        days: 18,
        metWhen: C.flag('th5_freed'),
        consequence: 'The caged birds’ fire passes the fire-keepers’ mark: freed later, they are too weak to fly with Seshet (the 2 Bennu bonus is lost). They live; the rescue and the chapter go on.',
        announce: 'The fire-keepers have marked the rookery wall: when the birds’ glow sinks below the mark, they will be too weak to fly for weeks.',
        onExpire: { flags: ['th5_fire_dim'], failObjectives: ['th5_bright'] },
      },
    ],
    evidence: [
      { id: 'th5_ev_evacuated', flag: 'th5_evacuated', title: 'The settlements resupplied', text: 'Both outposts are supplied; the oasis settlements moved onto their oil and charcoal and no longer need the bennu fire.', icon: 'evacuation' },
      { id: 'th5_ev_freed', flag: 'th5_freed', title: 'The bennu freed', text: 'The rookery cages are open and the bennu fly. Djedkhonsu’s dawn has lost its fire.', icon: 'evidence' },
      { id: 'th5_ev_hekaib', flag: 'th5_hekaib_down', title: 'Hekaib defeated', text: 'The Sword of the Hollow Lector has fallen.', icon: 'evidence' },
      { id: 'th5_ev_homes', flag: 'th5_fire_homes', title: 'Iunu’s homes lit', text: 'The rescued fire lit Iunu’s homes; the city will hold a reserve for Seshet.', icon: 'supply' },
      { id: 'th5_ev_rite', flag: 'th5_fire_rite', title: 'The fire preserved', text: 'The rescued fire is sealed in a bronze bowl for the final rite.', icon: 'branch' },
      { id: 'th5_ev_dim', flag: 'th5_fire_dim', title: 'The fire dimmed', text: 'The bennu were freed late; they live, but will not fly for weeks.', icon: 'branch' },
    ],
    carried: ['th5_freed', 'th5_hekaib_down', 'th5_fire_homes', 'th5_fire_rite', 'th5_evacuated'],
    entryBonuses: [{ fact: 'th4_levy_accounted', label: 'The public levy of Per-Wadjet funds the rescue (2,500 Gold, 3 Crystal)', wallet: { gold: 2500, crystal: 3 } }],
    briefing: [
      PAWAH('Every dawn the bennu rises from the fire at Iunu, and the sun follows it. Hekaib has caged them on the oasis island, and their fire goes to Djedkhonsu’s dusk.'),
      SESHET('Then we open the cages.'),
      PAWAH('Not first, priestess. The north hamlet and both outposts cook and light their lamps with that same fire. Shut it off before they have oil and charcoal, and we freeze them in the dark to save the birds. Supply the outposts, then free the rookery.'),
      NEBET('Hekaib holds the prison himself. I trained with him at Abu. He does not lose — so choose where we meet him.'),
    ],
    briefingVariants: [
      { ifFlags: ['fact:th4_levy_accounted'], lines: [NEBET('The levy of Per-Wadjet, posted on the granary door to the last ring, paid for the oil and charcoal on these carts.')] },
      { ifFlags: ['fact:th4_levy_abolished'], lines: [NEBET('No levy pays for this rescue. The carts are what Iunu and Tjebu could spare — the river towns gave freely, now that nobody takes it from them.')] },
      { ifFlags: ['fact:th3_rec_hours'], lines: [SESHET('The hour-tables from Per-Djehuty name the bennu’s hour: the eleventh. That is the fire Djedkhonsu is burning to keep the twelfth shut.')] },
      { ifFlags: ['fact:th4_abdication'], lines: [PAWAH('Paser sent word from his house arrest: Hekaib takes his orders from the Lector, not the palace. Nobody will call him off.')] },
    ],
    victory: [
      SESHET('The bennu fly, the hamlets keep their lamps, and Hekaib is beaten. Tonight the sun went down in a blaze — and I saw the road it takes, down through the hours to the hall where the barque is held.'),
      PAWAH('Abu, then. The last town on the river, at the edge of the night road.'),
    ],
    scenes: [
      { id: 'th5_supply_first', trigger: { type: 'flag', flag: 'th5_supply_first' }, lines: [PAWAH('The first outpost has its oil. And Hekaib has seen it — his reserve is leaving the barracks for the causeway hub below the rookery.')] },
      { id: 'th5_evacuated', trigger: { type: 'objective_completed', objectiveId: 'th5_outposts' }, lines: [NEBET('Both outposts are supplied. The north hamlet is already packing its carts for the west well.'), PAWAH('Now the cages, priestess. Nobody freezes for the birds.')] },
      { id: 'th5_freed', trigger: { type: 'flag', flag: 'th5_freed' }, lines: [SESHET('The cages are open. They will not come out until they choose to — the bennu answer covenants, not keys.'), NEBET('And Hekaib is coming down the causeway after the fire.')] },
      { id: 'th5_hekaib_battle', trigger: { type: 'battle_started', heroDefinitionId: 'egyptian_hekaib' }, lines: [NEBET('Hekaib! We stood on the same wall at Abu. Stand aside.'), HEKAIB('I stand where the Lector put me, captain. As you will, soon.')] },
      { id: 'th5_hekaib_down', trigger: { type: 'objective_completed', objectiveId: 'th5_hekaib' }, lines: [NEBET('He fought well. He always did. I will bury him at Abu, when this is over.')] },
      { id: 'th5_dim', trigger: { type: 'flag', flag: 'th5_fire_dim' }, lines: [PAWAH('The glow has sunk below the keepers’ mark. The birds live — but they will not fly with us for weeks.')] },
    ],
    loss: ['Seshet must survive.', 'Losing Iunu is recoverable while Seshet has an army.', 'The bennu are never killed off-screen: a late rescue costs only the optional bonus.'],
    help: [
      { id: 'th5_oasis', title: 'The oasis ring', text: 'Three causeways — from Iunu, the west well and the palm groves — meet below the rookery on the island; the dune perimeter links Iunu, both outposts and the north hamlet. Each supplied outpost clears a ruined service path back to Iunu.' },
      { id: 'th5_prison', title: 'Two ways up', text: 'The rookery is reached by the Cutthroat Stair (broken rock: cover against shooters) or the Golem Steps (open ground). Hekaib waits beside the steps until the cages open, then follows the fire down Iunu’s causeway.' },
    ],
  });

  // =========================================================================
  // Chapter 6 — The Twelfth Hour (card 20; legacy m07)
  // =========================================================================
  const v1m07 = camp.v1('twelfth_hour_m07');
  const djed = v1m07.sites.find((x) => x.id === 'm07_hall')?.guard?.commander;
  const iti = v1m07.hostileHeroes[0]?.commander;
  if (!djed || !iti) throw new Error('Twelfth Hour v2: Djedkhonsu’s or Iti’s profile is missing from the legacy content');
  const R6 = 24;
  const COIL: XY = [21, 12];
  const hallArmy: Army = [['bronze_golem', 2], ['egyptian_solar_scarab', 20], ['egyptian_solar_scarab', 20], ['egyptian_anubian_warden', 12], ['greater_basilisk', 2], ['egyptian_sobek_warbeast', 2]];
  const serpentGuard: Army = [['basilisk', 2], ['egyptian_solar_scarab', 12]];
  const coilChildren: Army = [['basilisk', 2], ['egyptian_solar_scarab', 16], ['egyptian_anubian_warden', 4]];
  const itiArmy: Army = [['egyptian_solar_scarab', 24], ['egyptian_anubian_warden', 8], ['egyptian_royal_ushabti', 2]];
  const watchGuard: Army = [['egyptian_solar_scarab', 18], ['egyptian_anubian_warden', 6]];
  const westTempleGuard: Army = [['egyptian_anubian_warden', 10], ['egyptian_solar_scarab', 16]];
  const eastTempleGuard: Army = [['egyptian_royal_ushabti', 4], ['egyptian_solar_scarab', 14]];
  const hoursGuard: Army = [['greater_basilisk', 1], ['basilisk', 2]];
  const sortieArmy: Army = [['egyptian_solar_scarab', 16], ['egyptian_anubian_warden', 5]];
  const fortGuard: Army = [['egyptian_solar_scarab', 16], ['egyptian_anubian_warden', 6], ['bronze_golem', 1]];
  // The five arms run out along exact hex rays from a one-cell ring of water round the island, so every
  // dike over an arm and both inner descents are true crossings (one cell, no diagonal leak).
  const arms: XY[] = [1, 2, 3, 4, 5].flatMap((dir) => ray(R6, COIL, dir, 3, 24));
  const westDescent = at(R6, COIL, -2, -1);
  const eastDescent = at(R6, COIL, 3, 0);
  const m6 = chapter({
    campaign: camp,
    chapter: 6,
    card: 20,
    name: 'The Twelfth Hour',
    summary:
      'The barque of the sun is held in the Hall of the Coil, where five river arms meet at the bottom of the night. Prepare the solar barque at two of the three sacred sites, launch it when ready, protect its final landing through the declared rite, defeat Djedkhonsu — and decide who keeps the calendar afterwards.',
    playtime: '85–115 minutes, 5–7 battles',
    legacy: ['twelfth_hour_m07'],
    economyFrom: 'twelfth_hour_m07',
    principal: 'th6_landing',
    soundscape: 'storm_plateau',
    hostileName: 'The Hollow Lector’s Host',
    town: { siteId: 'th6_town', townId: 'abu', name: 'Abu' },
    map: {
      cols: 42,
      rows: R6,
      biome: 'desert', desertGround: true,
      base: 'plains',
      seed: 950006,
      texture: { rough: 55, forest: 12 },
      paint: [
        // The pool round the island of the Coil and the five arms of the river (the east has none).
        { t: 'water', disc: [COIL[0], COIL[1], 3] },
        { t: 'plains', disc: [COIL[0], COIL[1], 2] },
        { t: 'water', cells: arms },
        // The hall on the island's north side, behind the Doors of the Coil.
        { t: 'mountain', cells: [at(R6, COIL, 0, -1), at(R6, COIL, 0, -2), at(R6, COIL, 2, -2)] },
        // Sector country: the horizon ridges, the desert of the south, reed beds by the arms.
        { t: 'rough', blob: [7, 4, 2] },
        { t: 'rough', blob: [34, 3, 2] },
        { t: 'rough', blob: [5, 18, 2] },
        { t: 'rough', blob: [37, 16, 2] },
        { t: 'mountain', cells: [[3, 9], [4, 9], [38, 9], [39, 8], [2, 21], [39, 21]] },
        { t: 'marsh', cells: [[14, 11], [16, 8], [26, 9], [27, 14], [18, 16], [24, 16]] },
      ],
      roads: [
        // The outer dikes: a ring through all five sectors, crossing every arm.
        { via: ['th6_town', 'th6_dike_sw', [9, 15], 'th6_dike_w', [11, 7], 'th6_dike_nw', [21, 5], 'th6_dike_ne', [31, 8], [33, 14], 'th6_dike_se', 'th6_town'] },
        // The two inner descents to the island and the final landing.
        { via: [[11, 7], [16, 10], 'th6_west_dike', 'th6_landing'] },
        // The pilgrims' dike: once a horizon temple is sung, a short way over the western arm near the island.
        { via: [[9, 15], 'th6_pilgrims_dike', [16, 10]] },
        { via: [[31, 8], [27, 12], 'th6_east_dike', 'th6_landing'] },
        // The barque slip and its channel.
        { via: ['th6_town', 'th6_slip'] },
        { via: ['th6_slip', 'th6_barque_ferry'] },
        { via: ['th6_barque_island', 'th6_landing'] },
        { via: ['th6_landing', 'th6_doors', 'th6_hall'] },
        { via: ['th6_landing', 'th6_calendar'] },
        // The sacred sites, the forts and the watch.
        { via: [[11, 7], 'th6_west_temple'] },
        { via: [[31, 8], 'th6_east_temple'] },
        { via: [[9, 15], 'th6_hours'] },
        { via: [[16, 10], 'th6_serpent'] },
        { via: [[33, 14], 'th6_watch'] },
        { via: [[21, 5], 'th6_fort'] },
        { via: [[21, 5], 'th6_cache'] },
        { via: ['th6_town', 'th6_caravan'] },
        { via: ['th6_town', 'th6_bennu_bowl'] },
        { via: [[9, 15], 'th6_sawmill'] },
        { via: [[33, 14], 'th6_quarry'] },
        { via: [[31, 8], 'th6_wyverns'] },
      ],
    },
    sites: [
      S.town('th6_town', 'abu', [21, 21], 'Abu', 'The southernmost town of the river, at the edge of the night road.', [21, 20]),
      S.resource('th6_sawmill', [7, 20], 'sawmill', { name: 'Palm Grove', description: 'An unowned grove of date palms and timber. Capture for +2 Wood per day.' }),
      S.resource('th6_quarry', [37, 12], 'quarry'),
      // The outer dikes over the five arms.
      S.crossing('th6_dike_sw', ray(R6, COIL, 4, 7, 7)[0]!, 'South-west Dike', 'The outer dike over the south-western arm, between Abu and the western bank.', null),
      S.crossing('th6_dike_se', ray(R6, COIL, 5, 7, 7)[0]!, 'South-east Dike', 'The outer dike over the south-eastern arm, between Abu and the eastern bank.', null),
      S.crossing('th6_dike_w', ray(R6, COIL, 3, 9, 9)[0]!, 'West Dike', 'The outer dike over the western arm.', null),
      S.crossing('th6_dike_nw', ray(R6, COIL, 2, 8, 8)[0]!, 'North-west Dike', 'The outer dike over the north-western arm, under the horizon ridges.', null),
      S.crossing('th6_dike_ne', ray(R6, COIL, 1, 8, 8)[0]!, 'North-east Dike', 'The outer dike over the north-eastern arm.', null),
      // The three navigable approaches: the west and east inner dikes, and the barque channel.
      S.shortcut('th6_pilgrims_dike', ray(R6, COIL, 3, 4, 4)[0]!, 'Pilgrims’ Dike', 'An old pilgrims’ dike over the western arm beside the island, its planks pulled up by the Lector’s men. The priests of any freed horizon temple know where the planks are hidden: a short way between the south-western and north-western banks.', ['th6_priests_freed']),
      S.crossing('th6_west_dike', westDescent, 'Western Descent', 'The inner dike from the north-western bank to the island of the Coil — the coil’s children’s road to the landing.', null),
      S.crossing('th6_east_dike', eastDescent, 'Eastern Descent', 'The inner dike from the eastern bank to the island of the Coil — Iti’s road to the landing.', null),
      S.ferry('th6_barque_ferry', [22, 18], 'Barque Channel (Abu)', 'The barque’s own channel from Abu’s slip to the island. Only the launched barque’s tow-boats can work it.', 'th6_barque_island', { flag: 'th6_launched', reason: 'The barque has not been launched: the channel is the rite’s road' }),
      S.ferry('th6_barque_island', at(R6, COIL, -1, 1), 'Barque Channel (island)', 'Where the barque’s channel reaches the island of the Coil.', 'th6_barque_ferry', { flag: 'th6_launched', reason: 'The barque has not been launched: the channel is the rite’s road' }),
      // The sacred sites (two of three prepare the barque).
      S.activation('th6_west_temple', [7, 3], 'Temple of the Western Horizon', 'The temple where the evening sun is received. Its hymn-rolls tell the barque the road down.', { cost: { gold: 400, stone: 3, crystal: 1 }, reward: { flags: ['th6_prep_west', 'th6_priests_freed'], questXp: 800 }, confirm: 'Sing the western horizon and take its hymn-rolls for the barque (400 Gold, 3 Stone, 1 Crystal)?' }, { label: 'Western horizon wardens', army: westTempleGuard, reward: { resources: { gold: 800 } }, battlefield: 'ridge_pass' }, { marker: 'evidence' }),
      S.activation('th6_east_temple', [34, 4], 'Temple of the Eastern Horizon', 'The temple where the morning sun is greeted. Its oars and ropes belong to the barque.', { cost: { gold: 400, stone: 3, crystal: 1 }, reward: { flags: ['th6_prep_east', 'th6_priests_freed'], questXp: 800 }, confirm: 'Sing the eastern horizon and take its oars and ropes for the barque (400 Gold, 3 Stone, 1 Crystal)?' }, { label: 'Eastern horizon wardens', army: eastTempleGuard, reward: { resources: { gold: 800 } }, battlefield: 'ridge_pass' }, { marker: 'evidence' }),
      S.activation('th6_hours', [7, 16], 'Shrine of the Twelve Hours', 'A shrine of the hours on the south-western bank, where the hour-tables are carved in the walls. Basilisks of the coil sleep in it.', { cost: { gold: 400, stone: 3, crystal: 1 }, reward: { flags: ['th6_prep_hours', 'th6_priests_freed'], questXp: 800 }, confirm: 'Copy the true hour-tables for the barque’s pilot (400 Gold, 3 Stone, 1 Crystal)?' }, { label: 'Sleeping basilisks', army: hoursGuard, reward: { resources: { crystal: 3 } }, battlefield: 'grove' }, { marker: 'evidence' }),
      // The barque slip at Abu: the launch begins the declared rite.
      S.activation(
        'th6_slip',
        [21, 17],
        'Barque Slip of Abu',
        'Where the solar barque waits, half-rigged, for its hymns, oars and pilot.',
        { cost: { gold: 500 }, reward: { flags: ['th6_launched'], questXp: 1000 }, requirements: [{ type: 'objective_completed', objectiveId: 'th6_prepare' }], confirm: 'Launch the barque (500 Gold)? The final rite begins: it runs for seven days, the Lector answers with two announced attacks on the final landing, and the barque channel opens.' },
        null,
        { objectiveIds: ['th6_launch'], marker: 'supply' },
      ),
      S.choice(
        'th6_bennu_bowl',
        [19, 19],
        'The Sealed Fire',
        'Where the bronze bowl of bennu fire from Iunu waits beside the slip, if it was preserved.',
        'The bennu fire',
        'Pawah lifts the lid of the bronze bowl. The fire inside has not dimmed since Iunu. “On the barque’s prow it will burn straight into the coil’s children,” he says. “Their stair on the western bank will not hold against it.”',
        [{ label: 'Set the preserved fire on the prow', summary: 'Only if the rescued fire was preserved at Iunu. The Serpent Stair’s formation scatters (no battle there), and the coil’s children never come against the landing.', reward: { flags: ['th6_fire_kindled'], questXp: 500 }, requiresFlags: ['fact:th5_fire_rite'], clearsSiteIds: ['th6_serpent'] }],
        { marker: 'pact' },
      ),
      // The island of the Coil.
      S.activation(
        'th6_landing',
        at(R6, COIL, -2, 0),
        'Landing of the Dawn',
        'The barque’s final landing on the island of the Coil, reachable from the western and eastern inner dikes.',
        { cost: { gold: 300 }, reward: { flags: ['th6_landed'], questXp: 1500 }, requirements: [{ type: 'mission_flag', flag: 'th6_launched' }], confirm: 'Bring the barque in to the Landing of the Dawn (300 Gold for the tow-crews)? Its light opens the Doors of the Coil.' },
        null,
        { objectiveIds: ['th6_landing'], marker: 'evidence' },
      ),
      S.shortcut('th6_doors', at(R6, COIL, 1, -1), 'Doors of the Coil', 'The doors of the Hall of the Coil. Only the barque’s own light opens them.', ['th6_landed']),
      S.landmark('th6_hall', at(R6, COIL, 1, -2), 'Hall of the Coil', 'Djedkhonsu’s hall across the sun’s road. Something vast is coiled in its dark, around the barque’s mooring.', 'refuge', { label: 'Djedkhonsu and the coil’s court', army: hallArmy, commander: djed, reward: { flags: ['th6_djed_down'], resources: { gold: 2000 }, questXp: 3000 }, battlefield: 'beacon_clearing', required: true }, { objectiveIds: ['th6_djed'] }),
      S.choice(
        'th6_calendar',
        at(R6, COIL, 2, -1),
        'The Calendar of the Hours',
        'The hour-tables of the night, recovered from the hall: whoever keeps them keeps the dawn.',
        'Who keeps the calendar',
        'The barque has gone through the twelfth gate and the light is coming up white over the river. The hour-tables lie on the landing in their jars. Nebet says: “Someone has to keep them, priestess — or the next Djedkhonsu will.” Pawah answers: “Then let everyone keep them. A copy in every river town, read aloud at every dawn.” Nebet shakes her head. “Or one office, open to anyone who asks, with its tables nailed to the temple door at Per-Wadjet — and someone answerable when they are wrong.”',
        [
          { label: 'A council of keepers', summary: 'Every river town keeps a copy of the hour-tables, and a council of their keepers — led by Pawah — reads the dawn together. Slow to agree, impossible to seize.', reward: { flags: ['th_calendar_council'], questXp: 500 }, requiresFlags: ['th6_djed_down'] },
          { label: 'A public royal office', summary: 'One public Office of the Hours at Per-Wadjet, its tables posted on the temple door, led by Nebet and answerable to anyone who asks. Fast and clear — and one office to guard.', reward: { flags: ['th_calendar_office'], questXp: 500 }, requiresFlags: ['th6_djed_down'] },
        ],
        { marker: 'pact', objectiveIds: ['th6_calendar'] },
      ),
      // The Lector's camps: their fall changes reinforcement, not doors.
      S.landmark('th6_serpent', [13, 9], 'Serpent Stair', 'The coil’s nest on the north-western bank, which feeds the band sleeping under the hall. Take it, and that band leaves the island for good.', 'nest', { label: 'Coil’s children', army: serpentGuard, reward: { resources: { gold: 1000 } }, battlefield: 'ridge_pass' }),
      S.landmark('th6_watch', [35, 17], 'Iti’s Watch', 'The Warden of the Horizon’s tower on the eastern bank. Iti’s reserve answers its horn.', 'refuge', { label: 'Watch guard', army: watchGuard, reward: { resources: { gold: 800 }, flags: ['th6_watch_down'] }, battlefield: 'ridge_pass' }),
      S.landmark('th6_fort', [21, 2], 'Sortie Fort', 'The Lector’s fort on the northern bank. Its sorties ride the outer dikes for supplies until it falls.', 'refuge', { label: 'Fort garrison', army: fortGuard, reward: { resources: { gold: 800, wood: 3 } }, battlefield: 'ridge_pass' }),
      // Supplies and the caravan.
      S.depot('th6_cache', [19, 7], 'Offerings of the Hours', 'Offerings left by the old priests at each hour, on the northern bank.', { resources: { gold: 1500, crystal: 3 } }),
      S.choice(
        'th6_caravan',
        [23, 21],
        'The Last Caravan',
        'A caravan from the south has camped outside Abu, with fighters for hire — enough for one band.',
        'The last caravan',
        'The caravan master has one band to spare before the night road closes. “Serpopards from the sandstone dens,” she says, “or slingers from the quarries, or clay men. Choose — the rest go home with me.”',
        [
          { label: '5 Serpopards', summary: 'Costs 1,150 Gold. 5 Serpopards join Seshet.', cost: { gold: 1150 }, reward: { creatures: [{ creatureId: 'serpopard', count: 5 }] } },
          { label: '12 Hill Slingers', summary: 'Costs 1,080 Gold. 12 Hill Slingers join Seshet.', cost: { gold: 1080 }, reward: { creatures: [{ creatureId: 'hill_slinger', count: 12 }] } },
          { label: '4 Clay Golems', summary: 'Costs 920 Gold. 4 Clay Golems join Seshet.', cost: { gold: 920 }, reward: { creatures: [{ creatureId: 'clay_golem', count: 4 }] } },
        ],
        { art: 'neutral_dwelling.serpopard', marker: 'pact' },
      ),
      S.landmark('th6_wyverns', [38, 3], 'Wyvern Ledge', 'Wyverns roost on a ledge of the night above the eastern horizon.', 'nest', { label: 'Night wyverns', army: [['wyvern_matriarch', 3]], reward: { resources: { crystal: 6 } }, battlefield: 'grove' }),
    ],
    patrols: [
      {
        commander: band('th6_sortie', 'The Lector’s Sortie', 'creature.egyptian.tier1.upgraded.portrait'),
        monster: true,
        bounty: { gold: 500 },
        start: [20, 4],
        waypoints: [[18, 5], [14, 5], [11, 7], [15, 7], [20, 6], [23, 6], [26, 5], [22, 3]],
        army: sortieArmy,
        home: 'th6_fort',
        threshold: [3, 2],
        purpose: 'Rides the northern outer dikes from the Sortie Fort to contest the offerings and supplies before the barque launches. Taking the fort ends the sorties for good.',
      },
      {
        commander: band('th6_coil_children', 'The Coil’s Children', 'creature.neutral.basilisk.upgraded.portrait'),
        monster: true,
        bounty: { gold: 800 },
        // They sleep under the hall on the island; at the launch they come out onto the landing itself and hold it.
        start: at(R6, COIL, 0, 0),
        waypoints: [at(R6, COIL, -2, 0)],
        army: coilChildren,
        home: 'th6_serpent',
        dormantUntil: 'th6_launched',
        threshold: [3, 2],
        purpose: 'The first announced attack of the rite: the coil’s children sleep under the hall, and when the barque launches they come out onto the final landing itself and hold it until they are beaten. They are fed from the Serpent Stair on the north-western bank: taking it first — or burning it with preserved bennu fire — sends them away for good.',
      },
      {
        commander: iti,
        start: at(R6, COIL, 5, 0),
        waypoints: [at(R6, COIL, -1, 0)],
        army: itiArmy,
        home: 'th6_watch',
        dormantUntil: 'th6_midnight',
        purpose: 'The second announced attack: Iti’s horizon reserve camps at the head of the eastern descent, and at the rite’s midnight, two days after the launch, it crosses to the landing’s edge, ahead of the final confrontation. It answers Iti’s Watch: neutralising the watch first removes this reserve from the final battle.',
      },
    ],
    objectives: [
      O.primary(
        'th6_prepare',
        'Prepare the solar barque',
        `Prepare the barque at two of the three sacred sites: the Temple of the Western Horizon (${armyText(westTempleGuard)}), the Temple of the Eastern Horizon (${armyText(eastTempleGuard)}) or the Shrine of the Twelve Hours (${armyText(hoursGuard)}).`,
        C.atLeast(2, C.activated('th6_west_temple'), C.activated('th6_east_temple'), C.activated('th6_hours')),
        { hint: 'Taking the forts and the watch changes who reinforces the Lector; it never opens a door.' },
      ),
      O.primary('th6_launch', 'Launch the barque', 'At the Barque Slip of Abu, launch the prepared barque when you are ready. The final rite starts only then; its deadline and its two attacks are announced.', C.activated('th6_slip'), { markerSiteId: 'th6_slip', requires: ['th6_prepare'] }),
      O.primary(
        'th6_landing',
        'Protect the final landing',
        `Bring the barque in at the Landing of the Dawn on the island of the Coil — reached from the north-western bank by the Western Descent, from the eastern bank by the Eastern Descent, or by the barque channel — and hold it against the rite’s two attacks: the coil’s children (${armyText(coilChildren)}), who make for the landing itself, and Iti’s reserve (${armyText(itiArmy)}). Taking the Serpent Stair or Iti’s Watch first secures that bank.`,
        C.activated('th6_landing'),
        { markerSiteId: 'th6_landing', requires: ['th6_launch'] },
      ),
      O.primary('th6_djed', 'The Hollow Lector', `With the barque landed, the Doors of the Coil open: defeat Djedkhonsu and the coil’s court (${armyText(hallArmy)}).`, C.cleared('th6_hall'), { markerSiteId: 'th6_hall', requires: ['th6_landing'] }),
      O.primary('th6_calendar', 'Who keeps the calendar', 'With the Lector fallen and the dawn released, decide at the landing who keeps the hour-tables: a council of keepers, or a public royal office.', C.any(C.flag('th_calendar_council'), C.flag('th_calendar_office')), { markerSiteId: 'th6_calendar', requires: ['th6_djed'], completesMission: true }),
      O.optional('th6_iti_watch', 'Neutralise Iti’s Watch', `Take Iti’s Watch on the eastern bank (${armyText(watchGuard)}): the horizon reserve never reaches the final battle.`, C.cleared('th6_watch'), { markerSiteId: 'th6_watch' }),
      O.optional('th6_serpents', 'The Serpent Stair', `Take the Serpent Stair (${armyText(serpentGuard)}) before the launch, and the coil’s children never attack.`, C.cleared('th6_serpent'), { markerSiteId: 'th6_serpent' }),
      O.optional('th6_sorties', 'End the sorties', `Take the Sortie Fort (${armyText(fortGuard)}); its sorties stop contesting the supplies.`, C.cleared('th6_fort'), { markerSiteId: 'th6_fort' }),
      O.optional('th6_in_time', 'Dawn within the rite', 'Defeat Djedkhonsu before the rite’s last hour: the river towns see a full dawn (+2,000 Gold, 20 Favor).', C.cleared('th6_hall'), { reward: { resources: { gold: 2000, favor: 20 } } }),
      O.optional('th6_caravan_hire', 'The last caravan', 'Hire one band from the caravan outside Abu.', C.visited('th6_caravan'), { markerSiteId: 'th6_caravan' }),
    ],
    timers: [
      {
        id: 'th6_rite',
        label: 'The final rite',
        startWhen: C.flag('th6_launched'),
        days: 7,
        metWhen: C.cleared('th6_hall'),
        consequence: 'The rite’s last hour passes before the Lector falls: the dawn comes late and grey, and the bonus for a full dawn is lost. The barque and the chapter go on.',
        announce: 'The barque is launched. The rite runs seven days, to the end of the twelfth hour.',
        onExpire: { flags: ['th6_rite_late'], failObjectives: ['th6_in_time'] },
      },
      {
        id: 'th6_midnight',
        label: 'Midnight of the rite',
        startWhen: C.flag('th6_launched'),
        days: 2,
        metWhen: C.flag('th6_midnight_never'),
        consequence: 'At the rite’s midnight Iti brings the horizon reserve from his watch against the final landing — unless the watch has already fallen.',
        announce: 'At midnight of the rite, two days from now, Iti will sound his horn.',
        onExpire: { flags: ['th6_midnight'] },
      },
    ],
    evidence: [
      { id: 'th6_ev_launched', flag: 'th6_launched', title: 'The barque launched', text: 'The solar barque left Abu’s slip for the bottom of the night.', icon: 'branch' },
      { id: 'th6_ev_landed', flag: 'th6_landed', title: 'The final landing', text: 'The barque came in at the Landing of the Dawn; its light opened the Doors of the Coil.', icon: 'evidence' },
      { id: 'th6_ev_djed', flag: 'th6_djed_down', title: 'The Hollow Lector fallen', text: 'Djedkhonsu fell in the Hall of the Coil, and the barque went through the twelfth gate.', icon: 'evidence' },
      { id: 'th6_ev_council', flag: 'th_calendar_council', title: 'A council of keepers', text: 'Every river town keeps the hour-tables; a council of keepers led by Pawah reads the dawn together.', icon: 'pact' },
      { id: 'th6_ev_office', flag: 'th_calendar_office', title: 'A public royal office', text: 'The Office of the Hours at Per-Wadjet keeps the tables in public, led by Nebet.', icon: 'pact' },
    ],
    carried: ['th_calendar_council', 'th_calendar_office'],
    entryBonuses: [
      { fact: 'th5_fire_homes', label: 'Iunu’s defensive reserve holds Abu (6 Royal Ushabti, 1 Radiant Bennu)', garrison: [{ creatureId: 'egyptian_royal_ushabti', count: 6 }, { creatureId: 'egyptian_radiant_bennu', count: 1 }] },
      { fact: 'th4_levy_abolished', label: 'The river towns’ volunteers (12 Anubian Wardens, 10 Favor)', garrison: [{ creatureId: 'egyptian_anubian_warden', count: 12 }], wallet: { favor: 10 } },
    ],
    briefing: [
      SESHET('The twelfth hour. Every night the sun passes it, and every night the old priests sang it through. Djedkhonsu has built a hall across the road where five river arms meet — and in it, something coiled, holding the barque.'),
      PAWAH('The barque waits half-rigged at Abu’s slip. Two of the three sacred sites will give it what it needs — hymns, oars, the true hours. Then we launch it, when we are ready and not before.'),
      NEBET('Once it sails, the Lector will throw what he has at the landing: the coil’s children from under his hall, and Iti’s reserve from the head of the eastern descent. They are fed from the Serpent Stair and answer Iti’s Watch — take those first and they never come.'),
      DJED('Come down, then, reader. The next dawn will tear the joined heavens open. I am the only one holding them shut.'),
    ],
    briefingVariants: [
      { ifFlags: ['fact:th3_rec_hours'], lines: [SESHET('The hour-tables from Per-Djehuty show a safer rite than his — the old pilots sang the barque through in seven days, not in one terrible night.')] },
      { ifFlags: ['fact:th5_fire_rite'], lines: [PAWAH('And the bennu fire from Iunu is still sealed in its bowl. Set it on the prow and the coil’s children will not hold their stair.')] },
      { ifFlags: ['fact:th5_fire_homes'], lines: [NEBET('Iunu sent its reserve down the river: royal ushabti and a radiant bennu stand on Abu’s walls.')] },
      { ifFlags: ['fact:th4_levy_abolished'], lines: [NEBET('Volunteers from the river towns are in Abu — nobody levied them. They came.')] },
      { ifFlags: ['fact:th4_abdication'], lines: [PAWAH('Paser sent a letter from his house at Per-Wadjet. Three lines: the hours he kept were the Lector’s hours, and he is sorry he ever ordered anyone by them.')] },
    ],
    victory: [
      SESHET('The barque moves. I felt it — like a held breath let go. The sun came up white over Abu, the way it should.'),
      NEBET('And the hour-tables have a keeper who is not a priest in a hollow mask. That was the whole point, priestess.'),
    ],
    scenes: [
      { id: 'th6_launched', trigger: { type: 'flag', flag: 'th6_launched' }, lines: [PAWAH('She is away! The rite has begun — seven days to the end of the twelfth hour.'), NEBET('And something is stirring under the hall. The first attack comes for the landing — unless the Serpent Stair is already ours.')] },
      { id: 'th6_midnight', trigger: { type: 'flag', flag: 'th6_midnight' }, lines: [ITI('(a horn from the eastern bank) The horizon reserve marches. No barque lands while I keep the road.'), NEBET('The second attack — Iti, by the eastern descent.')] },
      { id: 'th6_pilgrims_dike', trigger: { type: 'flag', flag: 'th6_priests_freed' }, lines: [PAWAH('The freed priests have put the planks back on the Pilgrims’ Dike. The western banks are half a day apart now, right under the island.')] },
      { id: 'th6_watch_down', trigger: { type: 'site_cleared', siteId: 'th6_watch' }, lines: [NEBET('Iti’s watch is ours. His horn will not sound tonight — his reserve has nowhere to answer from.')] },
      { id: 'th6_fire', trigger: { type: 'flag', flag: 'th6_fire_kindled' }, lines: [PAWAH('Look at the Serpent Stair — the bennu fire went through them like dawn through mist. They are scattering into the reeds.')] },
      { id: 'th6_landed', trigger: { type: 'flag', flag: 'th6_landed' }, lines: [SESHET('The barque is in. Its light is on the Doors of the Coil — they are opening.')] },
      { id: 'th6_djed_battle', trigger: { type: 'battle_started', siteId: 'th6_hall' }, lines: [DJED('I gave them a dusk that never ends. No scales, no judgement, no morning to fear. They should thank me.'), SESHET('They wanted a morning. You never asked.')] },
      { id: 'th6_djed_down', trigger: { type: 'site_cleared', siteId: 'th6_hall' }, lines: [SESHET('He is gone, and the coil has let go of the barque. One last thing to decide — and it is not mine alone.')] },
      // The levy decision at Per-Wadjet comes back as an argument about who keeps the hours.
      { id: 'th6_argument_open', trigger: { type: 'flag', flag: 'th6_djed_down' }, ifFlags: ['fact:th4_levy_abolished'], lines: [PAWAH('We abolished Paser’s levy, priestess, and the towns gave freely anyway. Let them keep the hours the same way — every town its own copy.')] },
      { id: 'th6_argument_office', trigger: { type: 'flag', flag: 'th6_djed_down' }, ifFlags: ['fact:th4_levy_accounted'], lines: [NEBET('We kept a levy at Per-Wadjet and posted every ring of it on the granary door. An office can be honest, if its accounts hang where everyone can read them.')] },
      { id: 'th6_iti_battle', trigger: { type: 'battle_started', heroDefinitionId: 'egyptian_iti' }, lines: [ITI('I keep the road between the two horizons. I have kept it for him for twenty years.'), SESHET('Then keep it for the morning.')] },
    ],
    loss: ['Seshet must survive.', 'Losing Abu is recoverable while Seshet has an army.', 'The rite’s deadline starts only when Seshet launches the barque, and missing it costs only the optional dawn bonus.'],
    help: [
      { id: 'th6_basin', title: 'The five-armed basin', text: 'The outer dikes cross all five arms of the river and join every bank — no dike is guarded. Three approaches lead inward: the Western Descent, the Eastern Descent and — once the barque is launched — its own channel from Abu. The Landing of the Dawn is reachable from both descents. The Pilgrims’ Dike over the western arm reopens once any horizon temple is sung.' },
      { id: 'th6_rite', title: 'The final rite', text: 'Launching the barque starts the declared rite (seven days, shown in the journal). The coil’s children come out onto the landing at once; Iti’s reserve crosses to its edge two days later. Each answers a camp on the banks: take the Serpent Stair or Iti’s Watch first and that attack never comes.' },
    ],
  });

  return {
    missions: [m1, m2, m3, m4, m5, m6],
    chapters: [
      { missionId: m1.id, chapter: 1, requiresAll: [], legacyMissionIds: ['twelfth_hour_m01'], briefingArt: m1.briefingArt! },
      { missionId: m2.id, chapter: 2, requiresAll: [m1.id], legacyMissionIds: ['twelfth_hour_m02'], briefingArt: m2.briefingArt! },
      { missionId: m3.id, chapter: 3, requiresAll: [m1.id], legacyMissionIds: ['twelfth_hour_m03', 'twelfth_hour_m04'], briefingArt: m3.briefingArt! },
      { missionId: m4.id, chapter: 4, requiresAll: [m2.id, m3.id], legacyMissionIds: ['twelfth_hour_m05'], briefingArt: m4.briefingArt! },
      { missionId: m5.id, chapter: 5, requiresAll: [m4.id], legacyMissionIds: ['twelfth_hour_m06'], briefingArt: m5.briefingArt! },
      { missionId: m6.id, chapter: 6, requiresAll: [m5.id], legacyMissionIds: ['twelfth_hour_m07'], briefingArt: m6.briefingArt! },
    ],
    epilogue: {
      // The campaign cover: the v1 endings show the coil bound or cut, not who keeps the calendar.
      art: 'campaign.twelfth_hour.cover',
      lines: [
        NEBET('The sun came up white this morning. Not red — white, the way it should. The fields are steaming from Abedju to Per-Wadjet.'),
        PAWAH('A red dawn, a black boar, a drowned library, a red vizier and a flock of firebirds. The children will want the story every night — and the hour it ends in.'),
      ],
      variants: [
        {
          flag: 'th_calendar_council',
          lines: [
            PAWAH('Every river town has its copy of the hour-tables now, and its keeper reads them at dawn. When the keepers disagree, they meet at Abedju and argue until they do not. It takes three days to agree on a festival.'),
            SESHET('And no one man can ever hold the twelfth hour shut again. Three days is cheap.'),
          ],
        },
        {
          flag: 'th_calendar_office',
          lines: [
            NEBET('The Office of the Hours opened at Per-Wadjet this morning. The tables are nailed to the temple door, and anyone may ask why a dawn was read the way it was — I answer them myself.'),
            SESHET('One office is quick, and one office can be taken. Keep the door open, captain, and the tables where everyone can see them.'),
          ],
        },
      ],
    },
  };
}

