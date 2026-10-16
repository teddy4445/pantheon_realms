/**
 * The Silent Oracle, content v2 (campaign expansion handoff 2026-10-15; review
 * cards 3–8): six chapters carrying the seven legacy chapters.
 *
 *   1  The Pilgrims' Road (legacy m01) — a branching river basin; three crossings
 *      form a loop, a repaired mill weir adds a shortcut to the western hill.
 *   2  The Bronze Bull and the Eyrie (legacy m02 + m03) — a basin around a
 *      mountain: three routes (outer meadow, quarry pass, orchard road) make two
 *      loops between Thymbra and the eastern shrine.
 *   3  The Hall of Echoes (legacy m04) — a lagoon expedition from Halia: a
 *      western causeway, an eastern marsh landing, a northern ferry chain and the
 *      fort-held strait reach the archive island.
 *   4  The Return of Melas (legacy m05) — a broad valley with Pyrgos in the middle,
 *      three district roads around it and a costly hill road to its postern.
 *   5  The Labyrinth of Kerata (legacy m06) — a sunken quarry: rim road, two
 *      ramps, a lower ring and three prison yards joined by cross-passages.
 *   6  The Spring of Kalliste (legacy m07) — a circular sanctuary basin: inner and
 *      outer rings, three passes, three sectors around the spring.
 *
 * Order: 1 → {2, 3 in either order} → {4, 5 in either order} → 6. Chapters of a
 * pair read the other's facts (`fact:<flag>`) so nobody names an investigation
 * that has not happened. The existing cast only (Alexios, Thaleia, Ione, Myrrine,
 * Melas, Theron, Doros, Phaidon, the Scout Captain). Values are proposed and
 * unplaytested; economies come from the legacy chapter each one carries first.
 */
import type { CommanderSpec } from '@pr/rules';
import { speaker } from '../arc';
import { C, O, S, armyText, chapter, type Army, type V2Campaign } from './kit';
import type { V2Built } from './index';

const P = 'greek';
const ALEXIOS = speaker(P, 'Alexios');
const THALEIA = speaker(P, 'Thaleia');
const IONE = speaker(P, 'Ione');
const MELAS = speaker(P, 'Melas');
const THERON = speaker(P, 'Theron');
const MYRRINE = speaker(P, 'Myrrine');
const DOROS = speaker(P, 'Doros');
const PHAIDON = speaker(P, 'Phaidon');
const SCOUT = speaker(P, 'Scout Captain');

/** A band without a commander (Hushed toll riders, recapture parties, the bronze bull): its portrait is a creature's. */
function band(id: string, name: string, portrait: string): CommanderSpec {
  return { heroDefinitionId: id, name, classId: 'champion', level: 1, attributes: { attack: 0, defense: 0, power: 0, knowledge: 0 }, skills: [], spellbook: false, spellIds: [], mana: 0, portraitAssetId: portrait };
}
const HUSHED_PORTRAIT = 'creature.neutral.brigand.upgraded.portrait';

export function buildSilentOracleV2(camp: V2Campaign): V2Built {
  // =========================================================================
  // Chapter 1 — The Pilgrims' Road (card 3; legacy m01)
  // =========================================================================
  const postGuard: Army = [['brigand', 14], ['brigand_cutthroat', 4]];
  const reserveGuard: Army = [['brigand', 8], ['brigand_cutthroat', 3]];
  const fordGuard: Army = [['wild_boar', 8]];
  const oliveBridgeGuard: Army = [['brigand', 10], ['brigand_cutthroat', 3]];
  const saltBridgeGuard: Army = [['brigand', 9], ['hill_slinger', 4]];
  const m1 = chapter({
    campaign: camp,
    chapter: 1,
    card: 3,
    name: 'The Pilgrims’ Road',
    summary:
      'Elaia blames its neighbours for the Oracle’s silence, and the Hushed toll the pilgrims’ roads. Reopen the roads to the two pilgrim shelters, gather two independent testimonies and expose the Hushed road captain at the eastern confluence.',
    playtime: '45–65 minutes, 3–4 required battles',
    legacy: ['silent_oracle_m01'],
    economyFrom: 'silent_oracle_m01',
    principal: 'so1_captain',
    soundscape: 'coast',
    hostileName: 'The Hushed',
    town: { siteId: 'so1_town', townId: 'elaia', name: 'Elaia' },
    map: {
      cols: 32,
      rows: 20,
      biome: 'coast',
      base: 'plains',
      seed: 930001,
      texture: { forest: 60, rough: 40 },
      paint: [
        // Hills closing the basin to the north and west.
        { t: 'mountain', line: [[2, 1], [11, 1]], width: 0 },
        { t: 'mountain', line: [[24, 1], [30, 1]], width: 0 },
        { t: 'rough', line: [[1, 2], [1, 7]], width: 0 },
        // The branching river: the West River and the North River meet at the eastern confluence
        // and run to the sea in the south-east.
        { t: 'water', line: [[0, 8], [5, 9], [10, 10], [15, 10], [20, 10]], width: 0 },
        { t: 'water', line: [[21, 0], [21, 5], [20, 10]], width: 0 },
        { t: 'water', line: [[20, 10], [23, 13], [26, 16], [29, 19]], width: 0 },
        { t: 'water', blob: [29, 17, 3] },
        // The Hill Brook: a branch of the West River cutting the western hill off from Elaia;
        // the long hill path goes round its head in the south-west.
        { t: 'water', line: [[7, 9], [7, 12], [6, 15]], width: 0 },
        { t: 'rough', blob: [3, 13, 2] },
        // The olive valley north of the ford, and the dry meadow beyond its groves.
        { t: 'forest', blob: [7, 5, 2] },
        { t: 'forest', blob: [15, 4, 2] },
        { t: 'plains', disc: [4, 3, 1] },
        // Quarry hills above the confluence.
        { t: 'rough', blob: [27, 5, 2] },
        // Salt pans on the sea shore.
        { t: 'marsh', cells: [[24, 17], [25, 18], [23, 18]] },
      ],
      roads: [
        // The south road: Elaia — salt pans — Salt Bridge — the customs post.
        { via: ['so1_town', 'so1_salt_stores'] },
        { via: ['so1_town', 'so1_salt_bridge', 'so1_post'] },
        // The ford road into the olive valley, the market and the Olive Bridge.
        { via: ['so1_town', 'so1_ford', 'so1_market'] },
        { via: ['so1_ford', 'so1_north_shelter'] },
        { via: ['so1_market', 'so1_olive_bridge', 'so1_post'] },
        { via: ['so1_market', 'so1_stall'] },
        { via: ['so1_north_shelter', 'so1_olive_stores'] },
        { via: ['so1_north_shelter', 'so1_centaurs'] },
        // The long hill path round the brook head, and the mill-weir shortcut.
        { via: ['so1_town', [8, 17], [4, 17], 'so1_west_shelter'] },
        { via: ['so1_town', 'so1_millyard'] },
        { via: ['so1_millyard', 'so1_weir', 'so1_west_shelter'] },
        { via: ['so1_west_shelter', 'so1_hill_stores'] },
        // The captain's yard and reserve.
        { via: ['so1_post', 'so1_yard'] },
        { via: ['so1_post', 'so1_reserve'] },
        { via: ['so1_town', 'so1_sawmill'] },
        { via: ['so1_olive_bridge', 'so1_quarry'] },
      ],
    },
    sites: [
      S.town('so1_town', 'elaia', [14, 16], 'Elaia', 'An olive town in the south of the basin, at the foot of the pilgrims’ road.', [14, 15]),
      S.resource('so1_sawmill', [18, 17], 'sawmill'),
      S.resource('so1_quarry', [27, 4], 'quarry'),
      S.crossing('so1_ford', [10, 10], 'Ford of the Two Plane Trees', 'The pilgrims’ ford into the olive valley. Wild boars are penned on it — on purpose.', {
        label: 'Ford boars',
        army: fordGuard,
        reward: { resources: { gold: 300, wood: 3, stone: 3 } },
        battlefield: 'coast_road',
        required: true,
      }),
      S.crossing('so1_olive_bridge', [21, 4], 'Olive Bridge', 'A stone bridge over the North River where the captain’s men toll the olive carts. The north toll riders sleep in its tollhouse.', {
        label: 'Olive Bridge tollmen',
        army: oliveBridgeGuard,
        reward: { resources: { gold: 400 } },
        battlefield: 'coast_road',
      }),
      S.crossing('so1_salt_bridge', [23, 13], 'Salt Bridge', 'The bridge of the salt road below the confluence. The south toll riders’ tollhouse, and their clerk’s tally-room.', {
        label: 'Salt Bridge tollmen',
        army: saltBridgeGuard,
        reward: { resources: { gold: 400 }, flags: ['so1_t_clerk'] },
        battlefield: 'coast_road',
      }),
      S.landmark('so1_north_shelter', [11, 4], 'Olive-Valley Shelter', 'The pilgrims’ shelter in the olive valley. Its pilgrims came down from Kalliste carrying prophecies for Elaia.', 'refuge', null, {
        objectiveIds: ['so1_shelter_north'],
        marker: 'evacuation',
      }),
      S.pickup('so1_pilgrims', [12, 3], 'Pilgrims’ Tablets', 'The tablets the olive-valley pilgrims were given at Kalliste, and the pilgrims who will swear to them.', { flags: ['so1_t_pilgrims'], resources: { gold: 200 } }, { marker: 'evidence' }),
      S.landmark('so1_west_shelter', [3, 12], 'Western Hill Shelter', 'The pilgrims’ shelter on the western hill, cut off since the mill weir broke and the Hushed began tolling the hill path.', 'refuge', null, {
        objectiveIds: ['so1_shelter_west'],
        marker: 'evacuation',
      }),
      S.choice(
        'so1_market',
        [15, 7],
        'Riverside Market',
        'A neutral market where the outer roads meet. Elaia’s carters, the captain’s bookkeeper and the hungry pilgrims all come here.',
        'The market’s one deal',
        'The market has enough in it for one deal before the toll riders come back. A pilgrim family sits by the well with nothing; the captain’s bookkeeper, drunk and frightened, offers his master’s ledger for coin. “Every name that paid the Hushed is in it,” he whispers. “Every name that was paid.”',
        [
          { label: 'Shelter the pilgrims', summary: 'Costs 800 Gold and 5 Wood. Elaia houses the pilgrims for the season — remembered as local support in a later chapter.', cost: { gold: 800, wood: 5 }, reward: { flags: ['so1_sheltered'] } },
          { label: 'Buy the captain’s ledger', summary: 'Costs 1,200 Gold. The ledger names his paymasters at once: the reserve camp at the customs post stands down (no battle there).', cost: { gold: 1200 }, reward: { flags: ['so1_ledger'] }, clearsSiteIds: ['so1_reserve'] },
        ],
        { marker: 'pact', objectiveIds: ['so1_choice'] },
      ),
      S.pickup('so1_stall', [17, 7], 'Seal-Cutter’s Stall', 'An old seal-cutter who carved a temple seal for “a grey-hooded customer” — twice.', { flags: ['so1_t_seal'] }, { marker: 'evidence' }),
      S.activation(
        'so1_millyard',
        [9, 14],
        'Millwright’s Yard',
        'Timber and stone for the broken mill weir across the Hill Brook.',
        { cost: { wood: 4, stone: 4 }, reward: { flags: ['so1_weir_repaired'] }, confirm: 'Pay 4 Wood and 4 Stone to repair the mill weir? It opens a short way to the western hill (it does not open the rest of the basin).', label: 'relay' },
        null,
      ),
      S.shortcut('so1_weir', [7, 12], 'Mill Weir', 'A broken weir across the Hill Brook. Once repaired it carries a cart — the short way to the western hill.', ['so1_weir_repaired']),
      S.landmark('so1_post', [24, 9], 'Customs Post at the Confluence', 'The Hushed road captain’s customs post where the two rivers meet. Prophecies for every city pass through his hands.', 'refuge', {
        label: 'The road captain and his Hushed',
        army: postGuard,
        reward: { flags: ['so1_seal'], resources: { gold: 600 }, artifactIds: ['boar_crest_helm'], questXp: 500 },
        battlefield: 'beacon_clearing',
        required: true,
      }, { objectiveIds: ['so1_captain'], marker: 'evidence' }),
      S.landmark('so1_reserve', [26, 8], 'Customs Reserve Camp', 'The captain’s paid reserve. They fight for his coin — and for the toll riders who bring it in.', 'refuge', {
        label: 'The captain’s reserve',
        army: reserveGuard,
        reward: { resources: { gold: 300 } },
        battlefield: 'beacon_clearing',
      }),
      S.choice(
        'so1_yard',
        [25, 11],
        'Customs Yard',
        'The yard where the toll riders hand in their takings to the reserve’s paymaster.',
        'An empty pay chest',
        'The reserve’s paymaster stands over an empty chest. No riders have come in from the bridges.',
        [{ label: 'Tell the reserve their riders are gone', summary: 'Only once both toll patrols are broken: the reserve camp stands down (no battle there).', reward: { questXp: 200 }, requiresFlags: ['so1_patrols_broken'], clearsSiteIds: ['so1_reserve'] }],
      ),
      S.depot('so1_olive_stores', [8, 3], 'Olive-Press Stores', 'Oil and coin the olive-road carters hid from the toll riders. The full share is here only until the captain tolls the olive road.', { resources: { gold: 300, wood: 2 } }),
      S.depot('so1_hill_stores', [2, 15], 'Hill Shepherds’ Stores', 'Cheese, wool and coin the hill shepherds kept back. The full share is here only until the captain tolls the hill path.', { resources: { gold: 300, stone: 2 } }),
      S.depot('so1_salt_stores', [21, 16], 'Salt-Pan Stores', 'Salt-workers’ stores beside the pans. The full share is here only until the captain tolls the salt road.', { resources: { gold: 300, crystal: 1 } }),
      S.camp('so1_centaurs', [4, 2], 'Dry Meadow', 'Centaurs graze the dry meadow beyond the olive groves; they sell spears to travellers who come in peace.', 'centaur', 2, 3),
      S.choice(
        'so1_press',
        [6, 7],
        'Abandoned Olive Press',
        'An olive press whose owners fled when the Hushed came down the road.',
        'The Olive Press',
        'The jars are full and sealed, ready for market. In the yard, the presser’s four grown sons sit on the wall with their father’s old shields across their knees. “Take the oil to market,” one says, “or take us to the road. We are tired of watching it.”',
        [
          { label: 'Sell the oil', summary: '+600 Gold and +4 Wood.', reward: { resources: { gold: 600, wood: 4 } } },
          { label: 'Take the sons to the road', summary: '4 Hoplites join Alexios.', reward: { creatures: [{ creatureId: 'hoplite', count: 4 }] } },
        ],
      ),
    ],
    patrols: [
      {
        commander: band('so1_north_tolls', 'North Toll Riders', HUSHED_PORTRAIT),
        monster: true,
        bounty: { gold: 300 },
        start: [19, 6],
        waypoints: [[16, 9], [12, 8], [12, 6], [19, 6]],
        army: [['brigand', 6], ['brigand_cutthroat', 2]],
        home: 'so1_olive_bridge',
        purpose: 'Tolls the olive road between the ford, the market and the Olive Bridge. Taking the Olive Bridge tollhouse ends it.',
        threshold: [3, 2],
      },
      {
        commander: band('so1_south_tolls', 'South Toll Riders', HUSHED_PORTRAIT),
        monster: true,
        bounty: { gold: 300 },
        start: [21, 14],
        waypoints: [[18, 15], [10, 17], [5, 17], [21, 14]],
        army: [['brigand', 6], ['wild_boar', 2]],
        home: 'so1_salt_bridge',
        purpose: 'Tolls the salt road and the long hill path. Taking the Salt Bridge tollhouse ends it.',
        threshold: [3, 2],
      },
    ],
    objectives: [
      O.primary('so1_shelter_west', 'Reopen the western hill shelter', 'Reach the Western Hill Shelter: by the long hill path round the brook head, or over the mill weir once the Millwright’s Yard has repaired it.', C.visited('so1_west_shelter'), { markerSiteId: 'so1_west_shelter' }),
      O.primary('so1_shelter_north', 'Reopen the olive-valley shelter', `Reopen the road to the Olive-Valley Shelter — clear the Ford of the Two Plane Trees (${armyText(fordGuard)}), or come the long way over the Olive Bridge (${armyText(oliveBridgeGuard)}) — and reach the shelter.`, C.all(C.any(C.cleared('so1_ford'), C.cleared('so1_olive_bridge')), C.visited('so1_north_shelter')), { markerSiteId: 'so1_north_shelter' }),
      O.primary(
        'so1_testimony',
        'Two independent testimonies',
        'Gather two of the three testimonies: the olive-valley pilgrims’ tablets, the market seal-cutter, or the toll clerk at the Salt Bridge. Each is recorded in the journal as soon as it is found.',
        C.atLeast(2, C.flag('so1_t_pilgrims'), C.flag('so1_t_seal'), C.flag('so1_t_clerk')),
        { hint: 'Any two will do; a testimony found stays in the ledger whatever the toll riders do.' },
      ),
      O.primary(
        'so1_captain',
        'Expose the road captain',
        `With both shelters reached and two testimonies in hand, cross to the confluence by the Salt Bridge (${armyText(saltBridgeGuard)}) or the Olive Bridge, take the customs post (${armyText(postGuard)}) and deal with his reserve camp (${armyText(reserveGuard)}).`,
        C.all(C.any(C.cleared('so1_salt_bridge'), C.cleared('so1_olive_bridge')), C.cleared('so1_post'), C.cleared('so1_reserve')),
        { markerSiteId: 'so1_post', requires: ['so1_shelter_north', 'so1_shelter_west', 'so1_testimony'], completesMission: true, hint: 'The reserve stands down without a battle if you buy the captain’s ledger at the market, or once both toll patrols are broken (tell them at the Customs Yard).' },
      ),
      O.optional('so1_choice', 'The market’s one deal', 'At the Riverside Market, shelter the pilgrims or buy the captain’s ledger.', C.any(C.flag('so1_sheltered'), C.flag('so1_ledger')), { markerSiteId: 'so1_market' }),
      O.optional('so1_patrols', 'Break the toll patrols', `Defeat both toll patrols (${armyText([['brigand', 6], ['brigand_cutthroat', 2]])}; ${armyText([['brigand', 6], ['wild_boar', 2]])}), or take their tollhouses at the Olive Bridge and the Salt Bridge. The captain’s reserve loses its pay.`, C.all(C.defeated('so1_north_tolls'), C.defeated('so1_south_tolls')), { reward: { flags: ['so1_patrols_broken'] } }),
      O.optional('so1_full_olive', 'The olive road’s full share', 'Collect the Olive-Press Stores before the captain tolls the olive road: +400 Gold and +2 Wood more.', C.visited('so1_olive_stores'), { markerSiteId: 'so1_olive_stores', reward: { resources: { gold: 400, wood: 2 } } }),
      O.optional('so1_full_hill', 'The hill path’s full share', 'Collect the Hill Shepherds’ Stores before the captain tolls the hill path: +400 Gold and +2 Stone more.', C.visited('so1_hill_stores'), { markerSiteId: 'so1_hill_stores', reward: { resources: { gold: 400, stone: 2 } } }),
      O.optional('so1_full_salt', 'The salt road’s full share', 'Collect the Salt-Pan Stores before the captain tolls the salt road: +400 Gold and +1 Crystal more.', C.visited('so1_salt_stores'), { markerSiteId: 'so1_salt_stores', reward: { resources: { gold: 400, crystal: 1 } } }),
      O.optional('so1_press', 'The olive press', 'Visit the abandoned olive press in the olive valley.', C.visited('so1_press'), { markerSiteId: 'so1_press' }),
    ],
    timers: [
      { id: 'so1_toll_olive', label: 'Toll on the olive road', startWhen: C.all(), days: 5, metWhen: C.any(C.visited('so1_olive_stores'), C.defeated('so1_north_tolls')), consequence: 'The olive road’s stores keep only the base share (the 400 Gold and 2 Wood bonus is lost). Pilgrims and witnesses are not touched.', announce: 'The captain has posted his toll calendar: the olive road first.', onExpire: { flags: ['so1_olive_tolled'], failObjectives: ['so1_full_olive'] } },
      { id: 'so1_toll_hill', label: 'Toll on the hill path', startWhen: C.all(), days: 8, metWhen: C.any(C.visited('so1_hill_stores'), C.defeated('so1_south_tolls')), consequence: 'The hill shepherds’ stores keep only the base share (the 400 Gold and 2 Stone bonus is lost). Pilgrims and witnesses are not touched.', announce: 'The toll calendar names the hill path next.', onExpire: { flags: ['so1_hill_tolled'], failObjectives: ['so1_full_hill'] } },
      { id: 'so1_toll_salt', label: 'Toll on the salt road', startWhen: C.all(), days: 11, metWhen: C.any(C.visited('so1_salt_stores'), C.defeated('so1_south_tolls')), consequence: 'The salt-pan stores keep only the base share (the 400 Gold and 1 Crystal bonus is lost). Pilgrims and witnesses are not touched.', announce: 'The salt road is the last on the toll calendar.', onExpire: { flags: ['so1_salt_tolled'], failObjectives: ['so1_full_salt'] } },
    ],
    evidence: [
      { id: 'so1_ev_pilgrims', flag: 'so1_t_pilgrims', title: 'The pilgrims’ tablets', text: 'The olive-valley pilgrims carried a prophecy for Elaia: “your neighbours closed the spring.” They will swear to who gave it to them.', icon: 'evidence' },
      { id: 'so1_ev_seal', flag: 'so1_t_seal', title: 'The seal-cutter', text: 'An old seal-cutter carved the hierophant’s seal for a grey-hooded customer — twice. One seal, two contradictory prophecies.', icon: 'evidence' },
      { id: 'so1_ev_clerk', flag: 'so1_t_clerk', title: 'The toll clerk', text: 'The Salt Bridge clerk kept a tally of prophecies sold to each city — Elaia’s and Thymbra’s side by side, each blaming the other.', icon: 'evidence' },
      { id: 'so1_ev_captain', flag: 'so1_seal', title: 'The captain’s seal', text: 'The road captain carried the hierophant’s own seal from Kalliste, and prophecies for every city on the coast.', icon: 'evidence' },
      { id: 'so1_ev_sheltered', flag: 'so1_sheltered', title: 'Pilgrims sheltered', text: 'Elaia housed the pilgrims for the season. They will remember it.', icon: 'supply' },
      { id: 'so1_ev_ledger', flag: 'so1_ledger', title: 'The captain’s ledger', text: 'Bought from his bookkeeper: every payment to the Hushed came from the temple treasury of Kalliste.', icon: 'evidence' },
    ],
    carried: ['so1_t_pilgrims', 'so1_t_seal', 'so1_t_clerk', 'so1_seal', 'so1_sheltered', 'so1_ledger'],
    briefing: [
      THALEIA('Three months without a word from Kalliste, and Elaia has decided whose fault it is: Thymbra’s, Aetos’s, anyone’s but its own.'),
      ALEXIOS('Then look at what the pilgrims carry. Two prophecies — one tells Elaia its neighbours closed the spring, the other tells Thymbra the same of Elaia. Both carry the same seal.'),
      THALEIA('A seal is not a witness. Find me people who will say, in front of the council, who handed them these.'),
      IONE('And find the pilgrims a road they can actually use. The Hushed toll every path out of this basin, and the shelters are cut off.'),
    ],
    victory: [
      IONE('The shelters are open and the captain’s seal is in Thaleia’s box. A pilgrim came down tonight with another prophecy — not from the Oracle. From a man who calls himself her Voice.'),
      THALEIA('Two roads lead on from here: Thymbra’s fields and the eyrie of Aetos, where the seal’s silver went — or the Hall of Echoes at Halia, where the Oracle’s own words are kept. Either can come first.'),
    ],
    scenes: [
      { id: 'so1_ford', trigger: { type: 'site_cleared', siteId: 'so1_ford' }, lines: [IONE('Those boars were penned on the ford. Someone wanted the road closed, not robbed.'), ALEXIOS('Then someone is afraid of what the pilgrims might hear.')] },
      { id: 'so1_pilgrims_heard', trigger: { type: 'site_visited', siteId: 'so1_pilgrims' }, lines: [THALEIA('They will swear to it: a grey hood at the shelter door, a sealed tablet for Elaia — and a warning not to show it to anyone from Thymbra.')] },
      { id: 'so1_seal_cutter', trigger: { type: 'site_visited', siteId: 'so1_stall' }, lines: [IONE('He carved the same temple seal twice, for the same grey hood. One seal, two cities, two opposite prophecies.')] },
      { id: 'so1_clerk', trigger: { type: 'site_cleared', siteId: 'so1_salt_bridge' }, lines: [THALEIA('The clerk’s tally: so many prophecies for Elaia, so many for Thymbra, each blaming the other. He was paid by the piece.')] },
      { id: 'so1_weir', trigger: { type: 'flag', flag: 'so1_weir_repaired' }, lines: [IONE('The weir holds. Carts can cross the Hill Brook again — half a day to the western shelter instead of two.')] },
      { id: 'so1_olive_tolled', trigger: { type: 'flag', flag: 'so1_olive_tolled' }, lines: [THALEIA('The toll riders reached the olive press before us. The stores are thinner — but the pilgrims are still there, and so are their tablets.')] },
      { id: 'so1_reserve_down', trigger: { type: 'flag', flag: 'so1_ledger' }, lines: [THALEIA('The ledger names the temple treasury of Kalliste on every page. When the reserve hears that, they will not die for the captain.')] },
      { id: 'so1_captain_falls', trigger: { type: 'site_cleared', siteId: 'so1_post' }, lines: [THALEIA('He carried prophecies for Elaia and for Thymbra — opposite promises, the same seal. The hierophant’s own, from Kalliste.'), ALEXIOS('The Oracle’s own priests closing the Oracle’s road. I want to know why.')] },
      { id: 'so1_losses', trigger: { type: 'casualties', minLost: 6 }, lines: [THALEIA('Elaia buried its sons today, Alexios. Be as careful with these as you were on the coast.'), ALEXIOS('I will.')] },
    ],
    loss: ['Alexios must survive (defeat, retreat or surrender ends the chapter).', 'Losing Elaia is recoverable while Alexios has an army.', 'A tolled road costs only its bonus supplies; testimonies once found are never lost.'],
    help: [
      { id: 'so1_routes', title: 'Three crossings and a weir', text: 'The Ford of the Two Plane Trees, the Olive Bridge and the Salt Bridge make a loop through the basin. Repairing the mill weir adds a short way to the western hill only.' },
      { id: 'so1_tolls', title: 'The toll calendar', text: 'The captain tolls one road after another (the deadlines are in the journal). A tolled road keeps its base stores but loses the bonus. Two toll patrols ride the roads; taking their tollhouses on the bridges ends them, and a reserve without pay will not fight.' },
    ],
  });

  // =========================================================================
  // Chapter 2 — The Bronze Bull and the Eyrie (card 4; legacy m02 + m03)
  // =========================================================================
  const bullArmy: Army = [['bronze_golem', 3], ['clay_golem', 8]];
  const granaryGuard: Army = [['brigand', 16], ['brigand_cutthroat', 6]];
  const nestGuard: Army = [['griffin', 4], ['windcrest_griffin', 1], ['hill_slinger', 6]];
  const passGuard: Army = [['brigand', 12], ['brigand_cutthroat', 6]];
  const m2 = chapter({
    campaign: camp,
    chapter: 2,
    card: 4,
    name: 'The Bronze Bull and the Eyrie',
    summary:
      'A bull of living bronze tramples Thymbra’s barley while the keeper of the Aetos eyrie profits from the closed mountain road. Stop the bull, secure Thymbra’s grain and win the eyrie’s cooperation — by contract or at the high nests — then decide what the scarce reconstruction funds rebuild.',
    playtime: '60–80 minutes, 4–5 battles',
    legacy: ['silent_oracle_m02', 'silent_oracle_m03'],
    economyFrom: 'silent_oracle_m02',
    principal: 'so2_aerie',
    soundscape: 'high_pass',
    hostileName: 'The Hushed',
    town: { siteId: 'so2_town', townId: 'thymbra', name: 'Thymbra' },
    map: {
      cols: 34,
      rows: 21,
      biome: 'temperate',
      base: 'plains',
      seed: 930002,
      texture: { forest: 50, rough: 50 },
      paint: [
        // The mountain in the middle, and the quarry pass straight through it.
        { t: 'mountain', blob: [17, 10, 4] },
        { t: 'mountain', rect: [13, 7, 21, 12] },
        { t: 'rough', line: [[12, 10], [22, 10]], width: 0 },
        { t: 'rough', cells: [[18, 9]] },
        // The northern nesting shelf under the crags.
        { t: 'rough', rect: [12, 2, 22, 4] },
        { t: 'mountain', cells: [[12, 1], [13, 1], [21, 1], [22, 1], [16, 1], [17, 1]] },
        // The outer meadow in the north-west, and limestone heights with a meadow in the north-east.
        { t: 'forest', blob: [7, 4, 1] },
        { t: 'rough', blob: [28, 3, 2] },
        { t: 'plains', disc: [28, 2, 0] },
        // The southern barley plain; orchards on its edge.
        { t: 'forest', cells: [[14, 15], [15, 15], [20, 15], [21, 14]] },
        { t: 'rough', blob: [3, 16, 1] },
        // The eastern foothills round the shrine and the horse pastures.
        { t: 'rough', cells: [[31, 9], [31, 10], [30, 11]] },
      ],
      roads: [
        // The orchard road across the plain.
        { via: ['so2_town', [10, 14], [18, 16], [25, 14], 'so2_shrine'] },
        // The quarry pass, through the mountain.
        { via: ['so2_town', 'so2_pass_chain', [25, 10], 'so2_shrine'] },
        // The outer meadow road round the north, past the keeper's house and the nests.
        { via: ['so2_town', [7, 6], 'so2_keeper'] },
        { via: ['so2_keeper', [17, 4], 'so2_nests'] },
        { via: [[17, 4], [24, 5], [26, 8], 'so2_shrine'] },
        { via: [[25, 14], 'so2_granary'] },
        { via: [[18, 16], 'so2_orchard'] },
        { via: [[10, 14], 'so2_tower'] },
        { via: [[25, 14], 'so2_pasture'] },
        { via: ['so2_town', 'so2_sawmill'] },
        { via: [[24, 5], 'so2_pegasus'] },
        { via: [[17, 4], 'so2_altar'] },
      ],
    },
    sites: [
      S.town('so2_town', 'thymbra', [6, 10], 'Thymbra', 'A barley town on the western foot of the mountain.', [7, 10]),
      S.resource('so2_sawmill', [3, 7], 'sawmill'),
      S.resource('so2_quarry', [15, 9], 'quarry'),
      S.resource('so2_crystal', [31, 4], 'crystal_deposit'),
      S.watchtower('so2_tower', [9, 16], 'Old Signal Tower', 'One of the coast’s old signal towers. From the top, both feeding grounds of the bull lie open.', ['so2_west_harvest', 'so2_east_harvest', 'so2_foundry']),
      S.shortcut('so2_pass_chain', [17, 10], 'Quarry Pass Chain', 'The keeper has chained the quarry pass, the short road through the mountain: closed travel pays her. It opens when her toll post is taken or when the eyrie cooperates.', ['so2_pass_open']),
      S.landmark('so2_post', [18, 9], 'Quarry Pass Post', 'The keeper’s toll post above the chained pass. Her trade guards ride out from here.', 'refuge', {
        label: 'Pass toll guards',
        army: passGuard,
        reward: { flags: ['so2_pass_open'], resources: { gold: 600, stone: 3 } },
        battlefield: 'ridge_pass',
      }),
      S.landmark('so2_granary', [26, 15], 'Barley Granary', 'Thymbra’s granary on the eastern plain. The Hushed hold it, and Thymbra’s carts cannot reach the grain.', 'quarry_cache', {
        label: 'Granary Hushed',
        army: granaryGuard,
        reward: { flags: ['so2_grain'], resources: { gold: 600, wood: 4 }, questXp: 400 },
        battlefield: 'open_field',
        required: true,
      }, { objectiveIds: ['so2_grain'], marker: 'supply' }),
      S.depot('so2_west_harvest', [12, 17], 'West Barley Stores', 'Sheaves stacked at the western feeding ground. The full harvest bonus is here until the bull’s raid on the west fields.', { resources: { gold: 300, wood: 2 } }, { markerHiddenUntilRevealed: true }),
      S.depot('so2_east_harvest', [22, 18], 'East Barley Stores', 'Sheaves stacked at the eastern feeding ground. The full harvest bonus is here until the bull’s raid on the east fields.', { resources: { gold: 300, stone: 2 } }, { markerHiddenUntilRevealed: true }),
      S.depot('so2_orchard', [18, 17], 'Orchard Terraces', 'Fruit and wine from the terraces under the mountain. The bull never comes this close to the slope.', { resources: { gold: 500, wood: 2 } }),
      S.landmark('so2_foundry', [29, 18], 'The Abandoned Foundry', 'A foundry in the hills where the bull was cast. Clay men still guard its moulds.', 'quarry_cache', {
        label: 'Foundry clay men',
        army: [['bronze_golem', 1], ['clay_golem', 5]],
        reward: { resources: { gold: 500 }, artifactIds: ['polished_bronze_shield'], flags: ['so2_moulds'] },
        battlefield: 'grove',
      }, { markerHiddenUntilRevealed: true }),
      S.choice(
        'so2_smith',
        [3, 14],
        'Bronze-smith’s Forge',
        'A bronze-smith who once worked for the temple of Kalliste.',
        'The Bronze-smith',
        '“I cast the bull’s hooves,” the old smith says, and will not look up. “The hierophant’s men paid in temple silver. Here — a herald’s ring I made for the Oracle’s messengers. Roads agree with whoever wears it. Or sit, and I will show you where the bull is weakest.”',
        [
          { label: 'Buy the herald’s ring', summary: 'Pay 2,000 Gold for the Signet of Hermes.', cost: { gold: 2000 }, reward: { artifactIds: ['signet_of_hermes'] } },
          { label: 'Learn the bull’s weakness', summary: 'Alexios gains +1 Attack.', reward: { attributes: { attack: 1 } } },
        ],
      ),
      S.choice(
        'so2_keeper',
        [13, 3],
        'The Keeper’s House',
        'The old keeper of the eyrie sits at her door, feeding a griffin chick. Her trade guards hold the quarry pass.',
        'The Keeper of Aetos',
        '“The mountain road is closed because closed roads pay,” the keeper says. “A priest with a sealed mouth on his mask bought the eyrie’s oath, and my guards’ wages with it. Sign a contract with Aetos — real coin, real timber for the nests — and the griffins fly for the coast again. Or climb to the high nests and take the oath from the griffins who took his silver.”',
        [
          { label: 'Sign the eyrie’s contract', summary: 'Costs 2,500 Gold and 10 Wood. The griffins at the high nests stand down: the eyrie cooperates without a battle.', cost: { gold: 2500, wood: 10 }, reward: { flags: ['so2_aerie_paid'] }, clearsSiteIds: ['so2_nests'] },
          { label: 'Sign, with the archive’s evidence', summary: 'Only with the Hall of Echoes records in hand: Ione shows her who sold the oath. Costs 1,500 Gold and 6 Wood (one negotiation discount). The griffins stand down.', cost: { gold: 1500, wood: 6 }, reward: { flags: ['so2_aerie_paid', 'so2_keeper_shown'] }, clearsSiteIds: ['so2_nests'], requiresFlags: ['fact:so3_records'] },
        ],
        { marker: 'pact' },
      ),
      S.landmark('so2_nests', [18, 3], 'The High Nests', 'The griffins’ nests on the crags, where the bought oath is kept — guarded by griffins and the keeper’s slingers.', 'nest', {
        label: 'Eyrie griffins and slingers',
        army: nestGuard,
        reward: { flags: ['so2_aerie_won'], resources: { gold: 1000 } },
        battlefield: 'plateau',
        required: true,
      }, { objectiveIds: ['so2_aerie'] }),
      S.activation('so2_altar', [21, 2], 'Altar of the Winds', 'The pilgrims’ mountain altar above the nests, where the wind carries prayers to Kalliste.', { cost: { gold: 500, crystal: 2 }, reward: { questXp: 600, resources: { favor: 5 } }, confirm: 'Pay 500 Gold and 2 Crystal to relight the Altar of the Winds?' }, null),
      S.pickup('so2_storehouse', [9, 2], 'Shepherds’ Storehouse', 'Cheese, silver and a votive amulet left by shepherds who turned back.', { resources: { gold: 700, wood: 5 }, artifactIds: ['clay_votive_amulet'] }),
      S.camp('so2_pasture', [30, 13], 'High Horse Pastures', 'The pastures where the horse-breeders raise cavalry horses. Clay men stand at the gates like jailers.', 'cavalry', 2, 3, {
        guard: { label: 'Pasture clay men', army: [{ creatureId: 'clay_golem', count: 5 }], reward: { resources: { favor: 5 } }, battlefield: 'ridge_pass' },
      }),
      S.neutral('so2_pegasus', [28, 2], 'Pegasus Meadow', 'A high limestone meadow with a spring where pegasi graze.', 'pegasus', 5, { flag: 'so2_bull_down', reason: 'The pegasi will not come down to the meadow while the bronze bull ranges the plain.' }),
      S.choice(
        'so2_shrine',
        [29, 9],
        'Shrine of the Twin Springs',
        'The pilgrims’ shrine where two springs meet under a plane tree. Thymbra’s elders and the eyrie’s keeper meet here to divide the reconstruction funds.',
        'The reconstruction funds',
        'The shrine is lit again, and both crises are over — but the funds are scarce. Thymbra’s elders want the trampled fields restored before winter; the keeper wants the mountain trade road rebuilt so the griffins have a reason to stay. There is coin for one.',
        [
          { label: 'Restore the fields', summary: 'Costs 1,500 Gold and 6 Wood. Thymbra’s granaries refill: provisions for a later siege (the Pyrgos chapter starts with 2,500 Gold and 10 Wood more).', cost: { gold: 1500, wood: 6 }, reward: { flags: ['so2_fields'] }, requiresFlags: ['so2_bull_down', 'so2_aerie_done'] },
          { label: 'Repair the mountain trade road', summary: 'Costs 1,500 Gold and 6 Stone. The griffins keep the road: griffin support later (the Pyrgos chapter starts with 4 Windcrest Griffins in Alexios’s army).', cost: { gold: 1500, stone: 6 }, reward: { flags: ['so2_trade'] }, requiresFlags: ['so2_bull_down', 'so2_aerie_done'] },
        ],
        { marker: 'pact', objectiveIds: ['so2_rebuild'] },
      ),
    ],
    patrols: [
      {
        commander: band('greek_bronze_bull', 'The Bronze Bull', 'creature.neutral.clay_golem.upgraded.portrait'),
        monster: true,
        bounty: { gold: 800 },
        start: [17, 17],
        waypoints: [[13, 16], [17, 18], [22, 17], [17, 18]],
        army: bullArmy,
        radius: 6,
        threshold: [3, 2],
        purpose: 'Grazes between the west and east barley fields and charges only an army it is sure to beat. It raids one field after the other on the announced days.',
      },
      {
        commander: band('so2_trade_guards', 'Eyrie Trade Guards', HUSHED_PORTRAIT),
        monster: true,
        bounty: { gold: 300 },
        start: [24, 6],
        waypoints: [[24, 6], [25, 10], [27, 7]],
        army: [['brigand', 10], ['brigand_cutthroat', 4]],
        radius: 5,
        home: 'so2_post',
        threshold: [3, 2],
        purpose: 'Guards the keeper’s mountain trade between the quarry pass and the shrine road — not every route. Taking the Quarry Pass Post ends it.',
      },
    ],
    objectives: [
      O.primary('so2_bull', 'Stop the bronze bull', `Find the bull and its clay herd (${armyText(bullArmy)}) between the two feeding grounds of the barley plain and break it. The Old Signal Tower shows where it grazes.`, C.defeated('greek_bronze_bull'), { reward: { flags: ['so2_bull_down'] }, hint: 'The bull moves; it is scouted, not waiting at a gate. Javelins and flyers do well against bronze.' }),
      O.primary('so2_grain', 'Secure Thymbra’s grain', `Retake the Barley Granary on the eastern plain from the Hushed (${armyText(granaryGuard)}).`, C.cleared('so2_granary'), { markerSiteId: 'so2_granary' }),
      O.primary(
        'so2_aerie',
        'The eyrie’s cooperation',
        `Win the eyrie: sign the keeper’s contract at her house, or take the high nests (${armyText(nestGuard)}) — by the outer meadow road or round by the quarry pass.`,
        C.cleared('so2_nests'),
        { markerSiteId: 'so2_nests', reward: { flags: ['so2_aerie_done', 'so2_pass_open'] } },
      ),
      O.primary(
        'so2_rebuild',
        'The reconstruction funds',
        'With the bull stopped and the eyrie won, decide at the Shrine of the Twin Springs what the scarce funds rebuild: Thymbra’s fields or the mountain trade road.',
        C.any(C.flag('so2_fields'), C.flag('so2_trade')),
        { markerSiteId: 'so2_shrine', requires: ['so2_bull', 'so2_grain', 'so2_aerie'], completesMission: true },
      ),
      O.optional('so2_west', 'The west barley harvest', 'Bring in the West Barley Stores before the bull’s raid on the west fields: +500 Gold and +3 Wood more.', C.visited('so2_west_harvest'), { markerSiteId: 'so2_west_harvest', reward: { resources: { gold: 500, wood: 3 } } }),
      O.optional('so2_east', 'The east barley harvest', 'Bring in the East Barley Stores before the bull’s raid on the east fields: +500 Gold and +3 Stone more.', C.visited('so2_east_harvest'), { markerSiteId: 'so2_east_harvest', reward: { resources: { gold: 500, stone: 3 } } }),
      O.optional('so2_trade_route', 'Open the quarry pass', `Take the Quarry Pass Post (${armyText(passGuard)}): the chain comes down and the keeper’s trade guards withdraw. Winning the eyrie opens the chain too.`, C.flag('so2_pass_open'), { markerSiteId: 'so2_post' }),
      O.optional('so2_foundry_moulds', 'The abandoned foundry', `Break the clay men (${armyText([['bronze_golem', 1], ['clay_golem', 5]])}) at the foundry where the bull was cast.`, C.cleared('so2_foundry'), { markerSiteId: 'so2_foundry' }),
      O.optional('so2_smith_visit', 'The bronze-smith', 'Visit the bronze-smith’s forge.', C.visited('so2_smith'), { markerSiteId: 'so2_smith' }),
    ],
    timers: [
      { id: 'so2_raid_west', label: 'The bull’s raid on the west fields', startWhen: C.all(), days: 6, metWhen: C.any(C.visited('so2_west_harvest'), C.defeated('greek_bronze_bull')), consequence: 'The west barley is trampled: its stores keep only the base share (the 500 Gold and 3 Wood bonus is lost). The chapter continues.', announce: 'Thymbra’s herders have seen the bull’s handlers turning it toward the west fields.', onExpire: { flags: ['so2_west_trampled'], failObjectives: ['so2_west'] } },
      { id: 'so2_raid_east', label: 'The bull’s raid on the east fields', startWhen: C.all(), days: 11, metWhen: C.any(C.visited('so2_east_harvest'), C.defeated('greek_bronze_bull')), consequence: 'The east barley is trampled: its stores keep only the base share (the 500 Gold and 3 Stone bonus is lost). The orchard terraces are never raided.', announce: 'After the west fields, the handlers mean to drive the bull east.', onExpire: { flags: ['so2_east_trampled'], failObjectives: ['so2_east'] } },
    ],
    evidence: [
      { id: 'so2_ev_bull', flag: 'so2_bull_down', title: 'The bull is broken', text: 'The bronze bull lies in the furrows. Its hooves were cast for temple silver.', icon: 'evidence' },
      { id: 'so2_ev_grain', flag: 'so2_grain', title: 'Thymbra’s grain', text: 'The Barley Granary is Thymbra’s again; the carts reach the town.', icon: 'supply' },
      { id: 'so2_ev_won', flag: 'so2_aerie_won', title: 'The oath taken back', text: 'The eyrie’s oath tablet was taken from the high nests — sealed with a mouth painted shut.', icon: 'evidence' },
      { id: 'so2_ev_paid', flag: 'so2_aerie_paid', title: 'The eyrie’s contract', text: 'Aetos signed a contract with the coast. The griffins fly the mountain road again.', icon: 'pact' },
      { id: 'so2_ev_shown', flag: 'so2_keeper_shown', title: 'The keeper saw the records', text: 'The keeper read Theron’s order from the Hall of Echoes and lowered her price.', icon: 'evidence' },
      { id: 'so2_ev_fields', flag: 'so2_fields', title: 'The fields restored', text: 'The reconstruction funds restored Thymbra’s fields: provisions for a later siege.', icon: 'supply' },
      { id: 'so2_ev_trade', flag: 'so2_trade', title: 'The trade road rebuilt', text: 'The reconstruction funds rebuilt the mountain trade road: the griffins will support the coast later.', icon: 'branch' },
    ],
    carried: ['so2_bull_down', 'so2_grain', 'so2_aerie_won', 'so2_aerie_paid', 'so2_keeper_shown', 'so2_fields', 'so2_trade'],
    briefing: [
      THALEIA('Thymbra’s barley is flattened from the river to the hills. The farmers say a bull did it — a bull that rings like a bell when it runs.'),
      IONE('And above the plain the keeper of Aetos has closed the mountain road. Her griffins sit on their nests while her guards toll the pass — closed roads pay her well.'),
      MYRRINE('(a tablet smuggled down from Kalliste, in the Oracle’s own hand) The bull and the eyrie were bought with the same silver. Look for one patron — but do not treat the farmers and the griffins alike.'),
      ALEXIOS('Then both, in whichever order the road gives us. Javelins for the bronze; coin or courage for the eyrie.'),
    ],
    briefingVariants: [
      { ifFlags: ['fact:so3_records'], lines: [IONE('This time we carry the Hall of Echoes records. When the keeper sees whose order sold her oath, she may lower her price.')] },
      { ifFlags: ['fact:so1_t_clerk'], lines: [THALEIA('The Salt Bridge clerk’s tally listed Thymbra’s prophecies beside Elaia’s. Thymbra was told the same lie, the other way round.')] },
      { ifFlags: ['fact:so1_sheltered'], lines: [THALEIA('Some of the pilgrims Elaia sheltered are Thymbra’s own. They will tell the farmers who fed them.')] },
    ],
    victory: [
      THALEIA('Thymbra eats this winter, and the griffins fly the mountain road again.'),
      ALEXIOS('One patron paid for the bull and for the oath. Whatever else his silver bought, we will find it.'),
    ],
    scenes: [
      { id: 'so2_tower', trigger: { type: 'site_visited', siteId: 'so2_tower' }, lines: [ALEXIOS('There — two trampled rings, one on each side of the plain. It is not grazing. It is being herded between them.'), IONE('Then its handlers mean to raid one field after the other.')] },
      { id: 'so2_keeper_records', trigger: { type: 'site_visited', siteId: 'so2_keeper' }, ifFlags: ['fact:so3_records'], lines: [IONE('I showed her the order from the Hall of Echoes. Theron sold her oath and bought her guards in the same week.'), ALEXIOS('Then she knows the price was never hers to set. Ask her again what a contract with the coast costs.')] },
      { id: 'so2_keeper_plain', trigger: { type: 'site_visited', siteId: 'so2_keeper' }, unlessFlags: ['fact:so3_records'], lines: [IONE('She thinks we are one more buyer. Without proof of who sold the oath, she will not lower her price.'), ALEXIOS('Then we pay what is fair, or we climb.')] },
      { id: 'so2_bull_broken', trigger: { type: 'objective_completed', objectiveId: 'so2_bull' }, lines: [THALEIA('The bull is down, and the clay men are falling apart in the furrows.'), ALEXIOS('Leave the bronze for Thymbra’s smiths. They can make ploughs of it.'), IONE('Look — pegasi on the limestone meadow in the north-east. They stayed away while the bull ran.')] },
      { id: 'so2_nests', trigger: { type: 'site_cleared', siteId: 'so2_nests' }, lines: [IONE('The oath tablet was wedged in the nest — sealed with wax and a mouth painted shut.'), ALEXIOS('The hierophant’s mark again.')] },
      { id: 'so2_paid', trigger: { type: 'flag', flag: 'so2_aerie_paid' }, lines: [IONE('The keeper has signed. The griffins are coming down from the high nests — not as captives, as partners.')] },
      { id: 'so2_pass', trigger: { type: 'flag', flag: 'so2_pass_open' }, lines: [THALEIA('The chain is off the quarry pass. Thymbra to the shrine in a day, straight through the mountain.')] },
      { id: 'so2_west_trampled', trigger: { type: 'flag', flag: 'so2_west_trampled' }, lines: [THALEIA('The bull went through the west fields last night. The sheaves that were stacked are still there — what was standing is gone.')] },
      { id: 'so2_east_trampled', trigger: { type: 'flag', flag: 'so2_east_trampled' }, lines: [THALEIA('The east fields too. That is the last raid the handlers announced — the orchard terraces are too steep for it.')] },
      { id: 'so2_grain', trigger: { type: 'site_cleared', siteId: 'so2_granary' }, lines: [THALEIA('The granary is open. Thymbra’s carts are already on the orchard road.')] },
    ],
    loss: ['Alexios must survive.', 'Losing Thymbra is recoverable while Alexios has an army.', 'A trampled field costs only its harvest bonus (at most two of the three).'],
    help: [
      { id: 'so2_loops', title: 'Three roads round the mountain', text: 'The outer meadow road (north, past the nests), the quarry pass (through the mountain, chained by the keeper until her toll post falls or the eyrie cooperates) and the orchard road (south, across the barley plain) make two loops between Thymbra and the shrine.' },
      { id: 'so2_bull_help', title: 'The bull', text: 'The bull grazes between two feeding grounds and raids the fields on announced days. Climb the Old Signal Tower to see where it grazes; it only charges an army it is sure to beat.' },
    ],
  });

  // =========================================================================
  // Chapter 3 — The Hall of Echoes (card 5; legacy m04)
  // =========================================================================
  const scoutCaptain = camp.v1('silent_oracle_m04').hostileHeroes[0]?.commander;
  if (!scoutCaptain) throw new Error('Silent Oracle v2: the Scout Captain’s profile is missing from the legacy content');
  const causewayGuard: Army = [['brigand', 22], ['brigand_cutthroat', 8]];
  const marshGuard: Army = [['brigand', 18], ['hill_slinger', 8]];
  const hallGuard: Army = [['temple_adept', 4], ['temple_seer', 2], ['veteran_hoplite', 12]];
  const scriptoriumGuard: Army = [['brigand_cutthroat', 10], ['temple_adept', 2]];
  const fortGuard: Army = [['veteran_hoplite', 16], ['veteran_peltast', 6]];
  const m3 = chapter({
    campaign: camp,
    chapter: 3,
    card: 5,
    name: 'The Hall of Echoes',
    summary:
      'The Hall of Echoes keeps the Oracle’s genuine warnings — and the edits that turned them into commands. Cross the lagoon with a capped expedition, secure two of the three surviving records before the Scout Captain’s announced seizure, and bring them out to Halia.',
    playtime: '60–75 minutes, 3–5 battles',
    legacy: ['silent_oracle_m04'],
    economyFrom: 'silent_oracle_m04',
    principal: 'so3_records',
    soundscape: 'coast',
    hostileName: 'The Hushed',
    town: { siteId: 'so3_town', townId: 'halia', name: 'Halia' },
    // An expedition: Halia is only a friendly resupply landing (no dwellings, nothing to build).
    player: {
      army: [['veteran_hoplite', 36], ['veteran_peltast', 12], ['griffin', 4], ['companion_cavalry', 3]],
      buildings: ['village_hall', 'tavern', 'market'],
      population: {},
    },
    purchasable: [],
    map: {
      cols: 34,
      rows: 22,
      biome: 'coast',
      base: 'plains',
      seed: 930003,
      texture: { forest: 40, rough: 40 },
      paint: [
        // The lagoon, with the archive island in the middle.
        { t: 'water', rect: [10, 3, 24, 17] },
        { t: 'water', blob: [17, 10, 8] },
        { t: 'plains', disc: [17, 10, 3] },
        // The western raised causeway and the eastern marsh landing.
        { t: 'marsh', line: [[9, 10], [13, 10]], width: 0 },
        { t: 'marsh', line: [[21, 11], [24, 11]], width: 0 },
        // The archivists' service jetty to Halia's salt quay (barred from inside the archive).
        { t: 'marsh', line: [[18, 14], [19, 17]], width: 0 },
        // Inland shore: hills to the west, woods to the north-east, salt pans to the south.
        { t: 'rough', blob: [3, 5, 2] },
        { t: 'forest', blob: [29, 5, 2] },
        { t: 'marsh', cells: [[11, 19], [12, 19], [22, 20], [23, 20]] },
        { t: 'rough', cells: [[26, 19], [27, 19], [26, 18]] },
      ],
      roads: [
        { via: ['so3_town', 'so3_steps'] },
        { via: ['so3_town', 'so3_vault'] },
        { via: ['so3_town', 'so3_chain_quay'] },
        { via: ['so3_town', [19, 18], 'so3_service_landing', [18, 13]] },
        // West shore: the raised causeway to the archive island.
        { via: ['so3_vault', [6, 14], [6, 10], 'so3_causeway', 'so3_west_door'] },
        // East shore: the marsh landing.
        { via: ['so3_town', [25, 18], [27, 14], 'so3_marsh', 'so3_east_door'] },
        // North shore: the ferry chain.
        { via: [[6, 10], [8, 4], 'so3_north_ferry'] },
        { via: ['so3_north_ferry', [24, 2], [28, 8], [27, 14]] },
        { via: ['so3_fort', [25, 18]] },
        { via: [[6, 10], 'so3_workshop'] },
        { via: [[6, 14], 'so3_salt_cache'] },
        { via: [[28, 8], 'so3_fisher_cache'] },
      ],
    },
    sites: [
      S.town('so3_town', 'halia', [17, 19], 'Halia', 'A salt-makers’ harbour on the lagoon’s southern shore — the expedition’s friendly resupply landing.', [17, 18]),
      // The archive island.
      S.landmark('so3_hall', [17, 10], 'Hall of Echoes', 'The central hall of the archive, where the Oracle’s words are kept in bronze. The hierophant’s adepts guard its doors.', 'refuge', {
        label: 'Hierophant’s adepts',
        army: hallGuard,
        reward: { flags: ['so3_rec_warning', 'so3_service_open'], questXp: 1200, resources: { gold: 800 } },
        battlefield: 'coast_road',
        required: true,
      }, { objectiveIds: ['so3_records', 'so3_hall'], marker: 'evidence' }),
      S.landmark('so3_scriptorium', [16, 8], 'North Scriptorium', 'Where the edits were made: copyists’ desks, scraped tablets and the ledger of every change.', 'quarry_cache', {
        label: 'Scriptorium guard',
        army: scriptoriumGuard,
        reward: { flags: ['so3_rec_ledger'], resources: { gold: 400 } },
        battlefield: 'coast_road',
      }, { marker: 'evidence' }),
      S.pickup('so3_east_wing', [19, 9], 'East Wing Shelves', 'The sealing order is kept here — until the Scout Captain’s announced seizure; after it, the shelves are bare and the order is in his fort.', { flags: ['so3_east_wing_taken'] }, { marker: 'evidence' }),
      S.choice(
        'so3_desk',
        [15, 12],
        'Archive Keeper’s Desk',
        'The old archivist’s desk, with cases enough for the whole archive.',
        'What leaves the archive',
        'The archivist has packed what survived. “Take two records and run, and all Halia will hear them by tomorrow,” he says. “Or take everything — sealed, catalogued, the true warnings beside the forgeries — and go the long way round to the salt-vault, where Myrrine’s people can study it. The records say the same thing either way.”',
        [
          { label: 'Expose the records at Halia at once', summary: 'The records go to Halia’s assembly steps (next to the town): stronger public backing in a later chapter.', reward: { flags: ['so3_expose'] }, requiresFlags: ['so3_records'] },
          { label: 'Preserve the whole archive', summary: 'The sealed archive goes the long way round, to the salt-vault at the western end of Halia’s shore: Myrrine can study it before the final chapter.', reward: { flags: ['so3_preserve'] }, requiresFlags: ['so3_records'] },
        ],
        { marker: 'pact' },
      ),
      // Access to the island.
      S.crossing('so3_causeway', [11, 10], 'Western Raised Causeway', 'A raised causeway across the shallows to the archive’s west door, held by sea raiders.', {
        label: 'Causeway raiders',
        army: causewayGuard,
        reward: { resources: { gold: 600 }, flags: ['so3_causeway_open'] },
        battlefield: 'coast_road',
      }),
      S.crossing('so3_west_door', [14, 10], 'Archive West Door', 'The causeway’s end at the archive.', null),
      S.crossing('so3_marsh', [23, 11], 'Eastern Marsh Landing', 'Reed beds and a plank landing to the archive’s east side, watched by the Hushed.', {
        label: 'Marsh watch',
        army: marshGuard,
        reward: { resources: { gold: 500 }, flags: ['so3_marsh_open'] },
        battlefield: 'coast_road',
      }),
      S.crossing('so3_east_door', [20, 11], 'Archive East Door', 'The marsh path’s end at the archive.', null),
      S.ferry('so3_north_ferry', [17, 2], 'North Ferry Chain', 'A chain ferry from the northern shore to the archive’s north landing.', 'so3_north_landing'),
      S.ferry('so3_north_landing', [17, 7], 'Archive North Landing', 'The north landing of the archive island.', 'so3_north_ferry'),
      S.ferry('so3_chain_quay', [16, 18], 'Chain Quay', 'Halia’s quay under the sea chain: the fastest crossing to the archive — while the fort keeps the chain up, nothing sails.', 'so3_chain_landing', { flag: 'so3_chain_down', reason: 'The sea chain is up: take the Sea-Chain Fort to lower it' }),
      S.ferry('so3_chain_landing', [16, 13], 'Archive South Landing', 'The archive’s landing under the sea chain.', 'so3_chain_quay', { flag: 'so3_chain_down', reason: 'The sea chain is up: take the Sea-Chain Fort to lower it' }),
      S.shortcut('so3_service_landing', [19, 17], 'Service Landing Gate', 'The archivists’ low service jetty from the island to Halia’s salt quay; its quay gate is barred by the archivists inside the archive until the Hall of Echoes is taken.', ['so3_service_open']),
      S.landmark('so3_fort', [22, 18], 'Sea-Chain Fort', 'The Scout Captain’s fort on the strait. Its winch holds the sea chain across the fastest crossing.', 'refuge', {
        label: 'The Scout Captain and the fort',
        army: fortGuard,
        commander: scoutCaptain,
        reward: { flags: ['so3_chain_down'], resources: { gold: 800 } },
        battlefield: 'coast_road',
      }, { marker: 'evidence' }),
      // Extraction to Halia.
      S.activation('so3_steps', [15, 20], 'Halia Assembly Steps', 'The steps where Halia’s assembly meets — next to the town.', { cost: { gold: 200 }, reward: { questXp: 800 }, requirements: [{ type: 'mission_flag', flag: 'so3_expose' }], confirm: 'Read the records out on the assembly steps (200 Gold for the criers)?' }, null, { marker: 'evidence' }),
      S.activation('so3_vault', [4, 18], 'Salt-Vault of Halia', 'A dry vault in the salt cliffs at the western end of Halia’s shore — the long way round.', { cost: { gold: 200 }, reward: { questXp: 800 }, requirements: [{ type: 'mission_flag', flag: 'so3_preserve' }], confirm: 'Seal the archive into the salt-vault (200 Gold for the masons)?' }, null, { marker: 'evidence' }),
      // Two guaranteed one-use resupply caches.
      S.depot('so3_salt_cache', [3, 15], 'Salt-Workers’ Cache', 'Halia’s salt-workers left weapons and pay for the expedition here.', { resources: { gold: 500 }, creatures: [{ creatureId: 'veteran_hoplite', count: 10 }] }),
      S.depot('so3_fisher_cache', [30, 9], 'Fishers’ Cache', 'The lagoon fishers’ hidden stores: javelins and coin.', { resources: { gold: 500, crystal: 1 }, creatures: [{ creatureId: 'veteran_peltast', count: 6 }] }),
      // The restored workshop on the inland shore (clay golems).
      S.activation('so3_kiln', [3, 9], 'Potters’ Kiln', 'The cold kiln of an old workshop that made clay men for the archive.', { cost: { wood: 3, stone: 3 }, reward: { flags: ['so3_workshop_restored'] }, confirm: 'Pay 3 Wood and 3 Stone to fire the kiln and restore the workshop?', label: 'relay' }, null),
      S.camp('so3_workshop', [4, 7], 'Restored Workshop', 'Clay men from the archive’s old workshop, for hire once its kiln burns again.', 'clay_golem', 2, 3, {
        kind: { type: 'creature_camp', creatureId: 'clay_golem', weeklyGrowth: 2, initialStock: 3, requiresFlag: 'so3_workshop_restored', lockedReason: 'Restore the workshop first: fire the Potters’ Kiln beside it (3 Wood, 3 Stone).' },
      }),
      S.landmark('so3_ogres', [31, 18], 'Sea-cave of the Ogres', 'Two ogres sleep in a sea cave full of stolen nets.', 'nest', { label: 'Sea-cave ogres', army: [['ogre', 2]], reward: { resources: { crystal: 4, gold: 400 } }, battlefield: 'grove' }),
      S.choice(
        'so3_singer',
        [9, 3],
        'A Blind Singer',
        'A blind singer on the north shore, tuning a lyre with salt-stiff strings.',
        'The Blind Singer',
        'He stops singing when you come near. “You are going to the echoes,” he says. “Listen twice — the first time you hear what you hoped for.” He holds out a horse’s bronze breastplate. “A rider left it in payment for a song. Or sit, and I will teach you the old marching song of the coast.”',
        [
          { label: 'Take the breastplate', summary: 'The Barding of the Hippeis joins Alexios’s pack.', reward: { artifactIds: ['hippeis_barding'] } },
          { label: 'Learn the marching song', summary: 'Alexios gains +1 Attack and +1 Defense.', reward: { attributes: { attack: 1, defense: 1 } } },
        ],
      ),
    ],
    objectives: [
      O.primary(
        'so3_island',
        'Cross to the archive island',
        `Reach the archive island: over the western causeway (${armyText(causewayGuard)}), through the eastern marsh landing (${armyText(marshGuard)}), by the north ferry chain, or across the strait once the sea chain is down.`,
        C.any(C.flag('so3_causeway_open'), C.flag('so3_marsh_open'), C.visited('so3_north_landing'), C.flag('so3_chain_down')),
      ),
      O.primary(
        'so3_records',
        'Two of the three records',
        `Secure two of the three surviving records: the true warning in the Hall of Echoes (${armyText(hallGuard)}), the edit ledger in the North Scriptorium (${armyText(scriptoriumGuard)}), and the sealing order in the East Wing — or, after the announced seizure, in the Sea-Chain Fort.`,
        C.atLeast(2, C.flag('so3_rec_warning'), C.flag('so3_rec_ledger'), C.flag('so3_rec_seal')),
        { markerSiteId: 'so3_hall', reward: { flags: ['so3_records'] } },
      ),
      O.optional('so3_hall', 'The Hall of Echoes', `Take the Hall of Echoes (${armyText(hallGuard)}): the Oracle’s true warning, and the archivists unbar the service landing — a short way back to Halia.`, C.cleared('so3_hall'), { markerSiteId: 'so3_hall' }),
      O.primary('so3_decide', 'What leaves the archive', 'At the archive keeper’s desk, decide: expose the records at Halia at once, or preserve the whole archive by the long way round.', C.any(C.flag('so3_expose'), C.flag('so3_preserve')), { markerSiteId: 'so3_desk', requires: ['so3_records'] }),
      O.primary(
        'so3_extract',
        'Extract to Halia',
        'Bring the records out: to the Halia Assembly Steps (exposed), or the long way to the Salt-Vault (preserved). The fort’s strait and the archive’s service landing are the fast ways back; the causeway and the marsh always remain.',
        C.any(C.activated('so3_steps'), C.activated('so3_vault')),
        { requires: ['so3_decide'], completesMission: true },
      ),
      O.optional('so3_seal_early', 'Before the seizure', 'Take the sealing order from the East Wing before the Scout Captain’s announced seizure.', C.flag('so3_east_wing_taken'), { markerSiteId: 'so3_east_wing', reward: { flags: ['so3_rec_seal'] } }),
      O.optional('so3_seal_fort', 'The order in the fort', 'Only after the seizure: take the Sea-Chain Fort and the sealing order with it.', C.all(C.flag('so3_seal_moved'), C.cleared('so3_fort')), { markerSiteId: 'so3_fort', reward: { flags: ['so3_rec_seal'] } }),
      O.optional('so3_chain', 'Lower the sea chain', `Take the Sea-Chain Fort (the Scout Captain, ${armyText(fortGuard)}): the fastest crossing opens. Not needed if another way back is secured.`, C.cleared('so3_fort'), { markerSiteId: 'so3_fort' }),
      O.optional('so3_workshop_hire', 'The restored workshop', 'Fire the Potters’ Kiln on the inland shore: clay men can be hired there.', C.flag('so3_workshop_restored'), { markerSiteId: 'so3_kiln' }),
      O.optional('so3_ogre_cave', 'The ogres’ sea-cave', `Drive the ogres (${armyText([['ogre', 2]])}) from their sea-cave.`, C.cleared('so3_ogres'), { markerSiteId: 'so3_ogres' }),
    ],
    timers: [
      {
        id: 'so3_seizure',
        label: 'The Scout Captain’s archive seizure',
        startWhen: C.all(),
        days: 10,
        metWhen: C.flag('so3_east_wing_taken'),
        consequence: 'The Scout Captain’s men carry the sealing order from the East Wing to the Sea-Chain Fort: take the fort to recover it. No other record is touched and nothing is destroyed.',
        announce: 'The Scout Captain has proclaimed it on Halia’s quay: in ten days he takes the archive’s east wing “into safe keeping”.',
        onExpire: { flags: ['so3_seal_moved'], failObjectives: ['so3_seal_early'] },
      },
    ],
    evidence: [
      { id: 'so3_ev_warning', flag: 'so3_rec_warning', title: 'The true warning', text: 'The Oracle’s own words: “The spring is cracked; hold it, and do not let anyone speak for me.” Theron sealed the spring after a real fracture.', icon: 'evidence' },
      { id: 'so3_ev_ledger', flag: 'so3_rec_ledger', title: 'The edit ledger', text: 'Every change made to her words, line by line: warnings turned into commands, each paid from the temple treasury.', icon: 'evidence' },
      { id: 'so3_ev_seal', flag: 'so3_rec_seal', title: 'The sealing order', text: 'Theron’s order to seal the spring “until the Voice is heard” — dated after the fracture, signed before the first forged prophecy.', icon: 'evidence' },
      { id: 'so3_ev_moved', flag: 'so3_seal_moved', title: 'The seizure', text: 'The Scout Captain took the sealing order to the Sea-Chain Fort. It can still be recovered there.', icon: 'branch' },
      { id: 'so3_ev_expose', flag: 'so3_expose', title: 'Exposed at Halia', text: 'The records were read out on Halia’s assembly steps: stronger public backing later.', icon: 'branch' },
      { id: 'so3_ev_preserve', flag: 'so3_preserve', title: 'The archive preserved', text: 'The whole archive went sealed to the salt-vault, for Myrrine’s later research.', icon: 'branch' },
    ],
    carried: ['so3_records', 'so3_rec_warning', 'so3_rec_ledger', 'so3_rec_seal', 'so3_expose', 'so3_preserve'],
    briefing: [
      IONE('The Hall of Echoes keeps every word the Oracle has spoken, and every word anyone changed. If the prophecies were edited, the edits are there too.'),
      THALEIA('No town to raise troops in this time — Halia lends us its quay and its stores, nothing more. What we take across the lagoon is what we have.'),
      ALEXIOS('And Melas’s old Scout Captain sits in the sea-chain fort. He has announced to the whole quay that he will seize the archive’s east wing in ten days.'),
      IONE('The western causeway and the eastern marsh both reach the island; the chain ferry runs from the north shore. Two records are enough to prove it. The fort’s strait is the fastest crossing — not the only one.'),
    ],
    briefingVariants: [
      { ifFlags: ['fact:so2_bull_down'], lines: [THALEIA('The bronze-smith of Thymbra and the keeper of Aetos were paid in the same temple silver. If the archive keeps accounts, we will see whose.')] },
      { ifFlags: ['fact:so1_ledger'], lines: [ALEXIOS('The road captain’s ledger already names the temple treasury. Now we find out what it paid for.')] },
    ],
    victory: [
      IONE('Her last true words, Alexios: “The spring is cracked; hold it, and do not let anyone speak for me.” Theron sealed it after a real fracture — and everything he has said since was made in that scriptorium.'),
      ALEXIOS('Then the danger is real and the Voice is false. We will have to prove both.'),
    ],
    scenes: [
      { id: 'so3_landed', trigger: { type: 'site_cleared', siteId: 'so3_causeway' }, lines: [THALEIA('Their sails carry no city’s sign at all — only a mouth painted shut.'), ALEXIOS('Then the Scout Captain is close. Keep the expedition together; there are no reinforcements.')] },
      { id: 'so3_hall_battle', trigger: { type: 'battle_started', siteId: 'so3_hall' }, lines: [THERON('(his voice from the bronze walls, recorded) The echoes are mine, strategos, like every other word on this coast.')] },
      { id: 'so3_hall_taken', trigger: { type: 'site_cleared', siteId: 'so3_hall' }, lines: [IONE('The true warning — and the archivists say the service landing can be unbarred from in here. A short way back to Halia’s salt quay.')] },
      { id: 'so3_ledger_bull', trigger: { type: 'site_cleared', siteId: 'so3_scriptorium' }, ifFlags: ['fact:so2_bull_down'], lines: [THALEIA('The ledger lists the bull’s bronze and the eyrie’s oath on the same page as the forged prophecies. One treasury paid for all of it.')] },
      { id: 'so3_ledger_plain', trigger: { type: 'site_cleared', siteId: 'so3_scriptorium' }, unlessFlags: ['fact:so2_bull_down'], lines: [THALEIA('The edit ledger — and two entries we did not expect: bronze for a smith in Thymbra, and silver for the keeper of the Aetos eyrie.'), ALEXIOS('Then the countryside is next, whatever else we find here.')] },
      { id: 'so3_seized', trigger: { type: 'flag', flag: 'so3_seal_moved' }, lines: [IONE('The Scout Captain kept his word: the east wing is empty, and the sealing order is in his fort. It is not lost — only moved.')] },
      { id: 'so3_fort_battle', trigger: { type: 'battle_started', siteId: 'so3_fort' }, lines: [SCOUT('We met on the storm plateau, strategos. I am still careful, and I am still good.'), ALEXIOS('And still selling to whoever pays best.')] },
      { id: 'so3_service', trigger: { type: 'flag', flag: 'so3_service_open' }, lines: [THALEIA('The service landing is unbarred. The jetty runs straight to Halia’s salt quay — half a day instead of the whole shore.')] },
    ],
    loss: ['Alexios must survive.', 'There is no town to recruit in: the expedition is what crossed the lagoon, with two guaranteed resupply caches.', 'Missing the seizure only moves the sealing order to the fort; no record is destroyed.'],
    help: [
      { id: 'so3_routes', title: 'Four ways to the island', text: 'The western raised causeway and the eastern marsh landing are always there; the chain ferry runs from the north shore. The Sea-Chain Fort’s strait is the fastest crossing once its chain is down. Taking the Hall unbars the archive’s service landing: its jetty is a short way back to Halia.' },
      { id: 'so3_expedition', title: 'A capped expedition', text: 'Halia is a resupply landing: no dwellings and nothing to build. Two caches on the shores give troops once each; the restored workshop on the inland shore hires clay men.' },
    ],
  });

  // =========================================================================
  // Chapter 4 — The Return of Melas (card 6; legacy m05)
  // =========================================================================
  const v1m05 = camp.v1('silent_oracle_m05');
  const melasSetup = v1m05.rivals?.[0];
  if (!melasSetup) throw new Error('Silent Oracle v2: Melas’s profile is missing from the legacy content');
  const melas: CommanderSpec = {
    heroDefinitionId: melasSetup.hero.definitionId,
    name: 'Melas',
    classId: melasSetup.hero.classId,
    level: melasSetup.hero.defaults.level,
    attributes: melasSetup.hero.defaults.attributes,
    skills: melasSetup.hero.defaults.skills,
    spellbook: false,
    spellIds: [],
    mana: 10,
    portraitAssetId: 'hero.greek.melas.portrait',
  };
  const farmsGuard: Army = [['veteran_hoplite', 16], ['veteran_peltast', 6]];
  const quarryGuard: Army = [['clay_golem', 8]];
  const tollsGuard: Army = [['brigand', 24], ['brigand_cutthroat', 10]];
  const barbicanGuard: Army = [['veteran_hoplite', 16], ['veteran_peltast', 8], ['cavalry', 2]];
  const pyrgosGarrison: Army = [['veteran_hoplite', 22], ['veteran_peltast', 8], ['cavalry', 2]];
  const melasArmy: Army = [['veteran_hoplite', 20], ['veteran_peltast', 8], ['cavalry', 3]];
  const m4base = chapter({
    campaign: camp,
    chapter: 4,
    card: 6,
    name: 'The Return of Melas',
    summary:
      'Melas protects Pyrgos from raiders and uses that real achievement to justify permanent military rule. Break his hold on two of the three supply districts, keep one road open for the townsfolk, then take Pyrgos — or compel his surrender with the forged prophecies.',
    playtime: '65–85 minutes, 4–6 battles',
    legacy: ['silent_oracle_m05'],
    economyFrom: 'silent_oracle_m05',
    principal: 'so4_pyrgos',
    soundscape: 'coast',
    hostileName: 'Melas’s Pyrgos',
    town: { siteId: 'so4_town', townId: 'akte', name: 'Akte' },
    map: {
      cols: 34,
      rows: 21,
      biome: 'temperate',
      base: 'plains',
      seed: 930004,
      texture: { forest: 50, rough: 40 },
      paint: [
        // Pyrgos's walls in the middle of the valley; the hill north of the city with the postern road.
        { t: 'mountain', disc: [17, 9, 2] },
        { t: 'rough', blob: [17, 5, 2] },
        { t: 'forest', cells: [[15, 5], [19, 5], [16, 4], [18, 6]] },
        { t: 'rough', line: [[17, 2], [17, 7]], width: 0 },
        // The river on the east, crossed by the toll bridge; the remote ridge beyond it.
        { t: 'water', line: [[27, 0], [26, 5], [26, 11], [27, 15], [28, 20]], width: 0 },
        { t: 'rough', blob: [31, 3, 2] },
        { t: 'mountain', cells: [[29, 1], [30, 1], [32, 5], [32, 6]] },
        // The farm district in the west, the quarry district in the north-west.
        { t: 'forest', cells: [[6, 8], [6, 12], [5, 10]] },
        { t: 'rough', blob: [10, 3, 2] },
        // The southern foothills around Akte.
        { t: 'rough', cells: [[13, 19], [14, 19], [21, 19], [22, 19], [12, 18]] },
        { t: 'forest', blob: [5, 16, 1] },
      ],
      roads: [
        // The main road: Akte to the barbican and the main gate.
        { via: ['so4_town', [17, 14], 'so4_barbican', 'so4_pyrgos'] },
        // The three district roads round the city, reconnecting north of it.
        { via: [[17, 14], [11, 14], [8, 12], 'so4_farms'] },
        { via: [[8, 12], [7, 7], 'so4_quarry'] },
        { via: [[7, 7], [12, 5], [17, 2]] },
        { via: [[17, 2], [23, 4], [24, 8], 'so4_tolls'] },
        { via: [[24, 8], [23, 14], [17, 14]] },
        // The hill road over the hill to the north postern.
        { via: [[17, 2], 'so4_postern', 'so4_pyrgos'] },
        // Spurs.
        { via: [[11, 14], 'so4_market_road'] },
        { via: [[17, 14], 'so4_parley'] },
        { via: [[12, 5], 'so4_guild'] },
        { via: ['so4_tolls', [29, 9], 'so4_deserters'] },
        { via: [[29, 9], 'so4_pegasus'] },
        { via: [[7, 7], 'so4_mine'] },
        { via: ['so4_town', 'so4_sawmill'] },
      ],
    },
    sites: [
      S.town('so4_town', 'akte', [17, 18], 'Akte', 'A foothill town at the southern end of the valley: Alexios’s camp for the campaign against Pyrgos.', [17, 17]),
      S.town('so4_pyrgos', 'pyrgos', [17, 9], 'Pyrgos', 'Melas’s walled city in the middle of the valley, hung with storm-grey banners. Its garrison is his last reserve.', [17, 10]),
      S.resource('so4_sawmill', [21, 17], 'sawmill'),
      S.resource('so4_stoneyard', [11, 18], 'quarry'),
      S.crossing('so4_barbican', [17, 11], 'Pyrgos Main Gate', 'The barbican before the main gate. Stone from the quarry district keeps its towers manned.', {
        label: 'Gate towers',
        army: barbicanGuard,
        reward: { resources: { gold: 800 } },
        battlefield: 'beacon_clearing',
      }),
      S.shortcut('so4_postern', [17, 8], 'North Postern', 'A small gate in the north wall at the end of the hill road — a long, costly climb that bypasses the main gate. The townsfolk unbar it for whoever keeps a road open for them.', ['so4_postern_open']),
      S.landmark('so4_farms', [8, 10], 'Sitos Farms', 'The farm district west of the city. Its granaries feed Melas’s field column.', 'refuge', {
        label: 'Melas’s farm wardens',
        army: farmsGuard,
        reward: { flags: ['so4_farms_free', 'so4_district_broken'], resources: { gold: 800, wood: 4 } },
        battlefield: 'open_field',
        required: true,
      }, { marker: 'supply' }),
      S.landmark('so4_quarry', [9, 4], 'Lithos Quarry', 'The quarry district north-west of the city. Its stone carts keep the gate towers supplied.', 'quarry_cache', {
        label: 'Quarry clay men',
        army: quarryGuard,
        reward: { flags: ['so4_quarry_free', 'so4_district_broken'], resources: { gold: 600, stone: 5 } },
        battlefield: 'ridge_pass',
        required: true,
      }, { marker: 'supply' }),
      S.crossing('so4_tolls', [27, 8], 'Toll Bridge', 'The bridge-toll district on the eastern river. Its tolls pay the Hushed who serve Melas — and its paymaster carries Theron’s dispatches.', {
        label: 'Toll-bridge Hushed',
        army: tollsGuard,
        reward: { flags: ['so4_tolls_free', 'so4_district_broken', 'so4_forgeries'], resources: { gold: 900 } },
        battlefield: 'coast_road',
        required: true,
      }, { marker: 'supply' }),
      S.choice(
        'so4_guild',
        [12, 3],
        'Quarry-masters’ Guild',
        'The guild house of the quarry district.',
        'The stone carts',
        'With the clay men broken, the quarry-masters come out of their guild house. “Every cart of stone goes to the gate towers,” the eldest says. “Tell us to stop, and the towers go hungry by tomorrow.”',
        [{ label: 'Stop the stone carts', summary: 'Only once the quarry district is free: the gate towers at the main gate stand down (no battle there).', reward: { questXp: 300 }, requiresFlags: ['so4_quarry_free'], clearsSiteIds: ['so4_barbican'] }],
        { marker: 'pact' },
      ),
      S.choice(
        'so4_market_road',
        [10, 15],
        'Pyrgos Market Road',
        'Where the district roads meet the townsfolk’s carts. Whatever road is free, someone has to keep it open for the people inside the walls — and they will unbar the north postern for whoever does.',
        'A road for the townsfolk',
        'The carters of Pyrgos wait with empty wagons. “Melas fed us, give him that,” one says. “If you mean to starve him out, you starve us first. Give us one road we can use, and we will tell the city who kept it open.”',
        [
          { label: 'Keep the farm road open', summary: 'Only with the Sitos Farms free. Costs 300 Gold for escorts. The townsfolk keep a working supply road.', cost: { gold: 300 }, reward: { flags: ['so4_civil_supply', 'so4_postern_open', 'so4_road_farms'], questXp: 300 }, requiresFlags: ['so4_farms_free'] },
          { label: 'Keep the quarry road open', summary: 'Only with the Lithos Quarry free. Costs 300 Gold for escorts. The townsfolk keep a working supply road.', cost: { gold: 300 }, reward: { flags: ['so4_civil_supply', 'so4_postern_open', 'so4_road_quarry'], questXp: 300 }, requiresFlags: ['so4_quarry_free'] },
          { label: 'Keep the bridge road open', summary: 'Only with the Toll Bridge free. Costs 300 Gold for escorts. The townsfolk keep a working supply road.', cost: { gold: 300 }, reward: { flags: ['so4_civil_supply', 'so4_postern_open', 'so4_road_bridge'], questXp: 300 }, requiresFlags: ['so4_tolls_free'] },
        ],
        { marker: 'supply', objectiveIds: ['so4_supply'] },
      ),
      S.choice(
        'so4_parley',
        [20, 13],
        'Melas’s Parley Tent',
        'A plain tent under a storm-grey banner, pitched where Melas meets envoys.',
        'Parley with Melas',
        'Melas reads the forged prophecies twice. Then he reads the carters’ letter about the open road. “I kept raiders off these farms when no city would,” he says at last. “And I swore to a voice that was bought.” He does not look up. “Pyrgos opens its gates to the cities. Let me keep a guard here, under their council, and I will tell anyone who asks what I swore to and why.”',
        [{ label: 'Accept his surrender', summary: 'Needs the forged prophecies and a road kept open for the townsfolk. Pyrgos changes allegiance without a siege; Melas keeps a limited local garrison (his detachment helps in a later chapter).', reward: { flags: ['so4_surrender'], questXp: 1500 }, requiresFlags: ['so4_forgeries', 'so4_civil_supply'], clearsSiteIds: ['so4_barbican'] }],
        { marker: 'pact' },
      ),
      S.resource('so4_mine', [4, 4], 'gold_mine', { guard: { label: 'Mine boars', army: [{ creatureId: 'tusked_boar', count: 10 }], reward: { resources: { gold: 500 } }, battlefield: 'open_field' } }),
      S.choice(
        'so4_spring',
        [4, 15],
        'Healing Spring',
        'A warm spring with a small shrine of the healer above it.',
        'The Healing Spring',
        'A goat drinks from the spring and watches you over the steam. On the shrine shelf lie a purse of offerings — and a clay cup, for whoever will drink from the spring instead.',
        [
          { label: 'Take the offerings', summary: '+1,500 Gold.', reward: { resources: { gold: 1500 } } },
          { label: 'Drink from the spring', summary: 'Alexios gains +1 Attack and +1 Defense.', reward: { attributes: { attack: 1, defense: 1 } } },
        ],
      ),
      S.choice(
        'so4_fire',
        [30, 14],
        'Deserters’ Fire',
        'Hushed deserters camp by the river, armed and afraid of both sides.',
        'The deserters',
        'Their spokesman lays his sword on the ground but keeps his hand near it. “We left when the tolls started going to Kalliste instead of to the men who collected them. Pay what we are owed and we will put our spears in your stores — and sell them back to you, one at a time.”',
        [{ label: 'Pay their debts and disarm the camp', summary: 'Costs 600 Gold. The deserters’ camp beside the fire opens for hiring (brigands).', cost: { gold: 600 }, reward: { flags: ['so4_deserters_disarmed'] } }],
      ),
      S.camp('so4_deserters', [31, 15], 'Deserters’ Camp', 'Brigand deserters for hire, once their camp is disarmed.', 'brigand', 6, 8, {
        kind: { type: 'creature_camp', creatureId: 'brigand', weeklyGrowth: 6, initialStock: 8, requiresFlag: 'so4_deserters_disarmed', lockedReason: 'Disarm the camp first: settle with the deserters at their fire.' },
      }),
      S.neutral('so4_pegasus', [31, 3], 'Remote Ridge', 'A limestone ridge above the river where pegasi graze in the high meadow.', 'pegasus', 5),
    ],
    patrols: [
      {
        commander: melas,
        start: [11, 12],
        waypoints: [[11, 13], [7, 7], [14, 3], [23, 5], [23, 13], [14, 15]],
        army: melasArmy,
        home: 'so4_farms',
        purpose: 'Melas’s field column rides the district roads to protect his income. The Sitos Farms feed it: break the farms and he falls back inside the walls for good.',
      },
      {
        commander: band('so4_sally', 'Hushed Sally', HUSHED_PORTRAIT),
        monster: true,
        bounty: { gold: 500 },
        start: [23, 7],
        waypoints: [[22, 14], [17, 15], [13, 16], [22, 14]],
        army: [['brigand', 16], ['brigand_cutthroat', 8]],
        home: 'so4_tolls',
        dormantUntil: 'so4_district_broken',
        threshold: [3, 2],
        purpose: 'Waits by the toll bridge. When any district falls, Melas sends it down the Akte road to threaten Alexios’s base. The tolls pay it: taking the Toll Bridge ends it.',
      },
    ],
    objectives: [
      O.primary(
        'so4_districts',
        'Break two supply districts',
        `Break Melas’s control over two of the three districts: the Sitos Farms (${armyText(farmsGuard)}), the Lithos Quarry (${armyText(quarryGuard)}) or the Toll Bridge (${armyText(tollsGuard)}).`,
        C.atLeast(2, C.cleared('so4_farms'), C.cleared('so4_quarry'), C.cleared('so4_tolls')),
        { hint: 'Each district supports a different part of his army: the farms feed his field column, the quarry supplies the gate towers, the tolls pay the Hushed sally.' },
      ),
      O.primary('so4_supply', 'A road for the townsfolk', 'At the Pyrgos Market Road, keep one freed district’s road open for the people of Pyrgos.', C.flag('so4_civil_supply'), { markerSiteId: 'so4_market_road' }),
      O.optional('so4_council', 'Pyrgos under the council', 'Take Pyrgos by siege: the city goes to a civilian council of the coast (a legitimacy bonus in a later chapter).', C.owned('pyrgos'), { markerSiteId: 'so4_pyrgos', reward: { flags: ['so4_council'] } }),
      O.primary(
        'so4_pyrgos',
        'Pyrgos changes allegiance',
        `With two districts broken and a road kept open, compel Melas’s surrender at his parley tent with the forged prophecies — or take Pyrgos (its garrison: ${armyText(pyrgosGarrison)}) through the main gate or by the hill road to the north postern. A siege is fought by hand.`,
        C.any(C.flag('so4_surrender'), C.owned('pyrgos')),
        { markerSiteId: 'so4_pyrgos', requires: ['so4_districts', 'so4_supply'], completesMission: true },
      ),
      O.optional('so4_melas_field', 'Melas’s field column', `Beat Melas’s column (${armyText(melasArmy)}) in the field, or break the farms that feed it.`, C.defeated('melas')),
      O.optional('so4_gate_towers', 'Stop the stone carts', `Free the quarry district, then ask the quarry-masters to stop supplying the gate towers (${armyText(barbicanGuard)}).`, C.cleared('so4_barbican'), { markerSiteId: 'so4_guild' }),
      O.optional('so4_deserter_camp', 'The deserters', 'Settle with the Hushed deserters by the river.', C.flag('so4_deserters_disarmed'), { markerSiteId: 'so4_fire' }),
    ],
    evidence: [
      { id: 'so4_ev_forgeries', flag: 'so4_forgeries', title: 'The forged prophecies', text: 'Theron’s forged prophecies — the ones Melas swore on — in Alexios’s hands.', icon: 'evidence' },
      { id: 'so4_ev_supply', flag: 'so4_civil_supply', title: 'A road for the townsfolk', text: 'One district road stays open for the people of Pyrgos.', icon: 'supply' },
      { id: 'so4_ev_surrender', flag: 'so4_surrender', title: 'Melas surrendered', text: 'Melas opened Pyrgos to the cities and keeps a limited local garrison under their council.', icon: 'pact' },
      { id: 'so4_ev_council', flag: 'so4_council', title: 'Pyrgos under the council', text: 'Pyrgos was taken; the city is governed by a civilian council of the coast.', icon: 'branch' },
    ],
    carried: ['so4_surrender', 'so4_council', 'so4_civil_supply'],
    entryBonuses: [
      { fact: 'so2_fields', label: 'Thymbra’s restored fields: siege provisions (2,500 Gold, 10 Wood)', wallet: { gold: 2500, wood: 10 } },
      { fact: 'so2_trade', label: 'The mountain trade road: 4 Windcrest Griffins join Alexios', heroArmy: [{ creatureId: 'windcrest_griffin', count: 4 }] },
      { fact: 'so3_records', label: 'The Hall of Echoes records: the forged prophecies are in hand', flags: ['so4_forgeries'] },
      { fact: 'so3_expose', label: 'Halia’s assembly backs Alexios: 8 Veteran Peltasts in Akte', garrison: [{ creatureId: 'veteran_peltast', count: 8 }] },
    ],
    briefing: [
      THALEIA('Melas holds Pyrgos — and give him this: no raider has burned a farm in this valley since he came. The townsfolk know it.'),
      MELAS('I kept the valley safe when no city would. One command, one voice. The Voice of Kalliste only confirmed what I had already proved.'),
      IONE('The voice he swore to was bought. Show him the forgeries — but that alone will not open his gates. His soldiers eat from the farms, his towers from the quarry, his Hushed from the bridge tolls.'),
      ALEXIOS('Then we take two of the three, keep one road open for the people inside, and give him the choice to stop.'),
    ],
    briefingVariants: [
      { ifFlags: ['fact:so2_fields'], lines: [THALEIA('Thymbra’s restored fields sent wagons: provisions enough for a siege, if it comes to that.')] },
      { ifFlags: ['fact:so2_trade'], lines: [IONE('And the griffins of Aetos came down the trade road to fly with us.')] },
      { ifFlags: ['fact:so3_expose'], lines: [THALEIA('Halia’s assembly heard the records read aloud. Their volunteers are already in Akte.')] },
      { ifFlags: ['fact:so5_freed'], lines: [IONE('Word of the freed minotaurs of Kerata has reached his barracks. His men know now that Theron’s “monsters” were prisoners.')] },
    ],
    victory: [
      ALEXIOS('Pyrgos belongs to its people again, and its market road never closed.'),
      THALEIA('Melas is alive and talking. The cities will want to hear what he swore to — and why.'),
    ],
    scenes: [
      { id: 'so4_district', trigger: { type: 'flag', flag: 'so4_district_broken' }, lines: [MELAS('One district. You think a city falls for want of one cart road?'), IONE('His Hushed are moving at the toll bridge — toward Akte, unless the bridge is already ours.')] },
      { id: 'so4_farms', trigger: { type: 'site_cleared', siteId: 'so4_farms' }, lines: [THALEIA('The farms are free. Melas’s column has nothing to eat in the field — he is pulling it back inside the walls.')] },
      { id: 'so4_forgeries', trigger: { type: 'site_cleared', siteId: 'so4_tolls' }, unlessFlags: ['fact:so3_records'], lines: [IONE('The toll paymaster carried Theron’s dispatches — the forged prophecies themselves. Now we can show Melas what he swore to.')] },
      { id: 'so4_melas_battle', trigger: { type: 'battle_started', heroDefinitionId: 'melas' }, lines: [MELAS('One light, one voice, one coast. I was right on the plateau, and I am right now.'), ALEXIOS('You were wrong then too, Melas.')] },
      { id: 'so4_siege', trigger: { type: 'battle_started', siteId: 'so4_pyrgos' }, lines: [ALEXIOS('No looting. When the gate opens, the council walks in first.')] },
      { id: 'so4_surrendered', trigger: { type: 'flag', flag: 'so4_surrender' }, lines: [MELAS('Tell the cities I will testify. Tell them I believed it.'), ALEXIOS('I will tell them you stopped.')] },
      { id: 'so4_taken', trigger: { type: 'objective_completed', objectiveId: 'so4_council' }, lines: [THALEIA('The council of the coast holds Pyrgos. Melas is in the citadel under guard — alive, and very quiet.')] },
    ],
    loss: ['Alexios must survive.', 'Losing Akte is recoverable while Alexios has an army.', 'Melas survives in every outcome.'],
    help: [
      { id: 'so4_valley', title: 'The valley of Pyrgos', text: 'Three district roads circle the city and meet north of it. The main gate is held by the gate towers; the hill road over the northern hill reaches the north postern — a long, costly way round, unbarred by the townsfolk once a road is kept open for them.' },
      { id: 'so4_deploy', title: 'Melas’s deployment', text: 'His field column (fed by the farms) protects his income; the Hushed sally (paid by the tolls) marches on Akte once a district falls; the gate towers live on quarry stone. His city garrison is a capped reserve: nothing new arrives.' },
    ],
  });
  // Pyrgos is an unowned city held by Melas's garrison (taken by siege, or opened by his surrender).
  const v1Pyrgos = melasSetup.town;
  const m4 = {
    ...m4base,
    neutralTowns: [
      {
        townId: 'pyrgos',
        siteId: 'so4_pyrgos',
        name: 'Pyrgos',
        archetypeId: v1Pyrgos.archetypeId,
        buildings: v1Pyrgos.buildings.filter((b) => b !== 'citadel'),
        population: {},
        covenants: [],
        garrison: pyrgosGarrison.map(([creatureId, count]) => ({ creatureId, count })),
      },
    ],
  };

  // =========================================================================
  // Chapter 5 — The Labyrinth of Kerata (card 7; legacy m06)
  // =========================================================================
  const v1m06 = camp.v1('silent_oracle_m06');
  const doros = v1m06.sites.find((s) => s.id === 'm06_gate')?.guard?.commander;
  if (!doros) throw new Error('Silent Oracle v2: Doros’s profile is missing from the legacy content');
  const yardNwGuard: Army = [['clay_golem', 8], ['bronze_golem', 2]];
  const yardEGuard: Army = [['brigand_cutthroat', 22], ['tusked_boar', 6]];
  const yardSwGuard: Army = [['veteran_hoplite', 20], ['bronze_golem', 2], ['temple_seer', 2]];
  const dorosGuard: Army = [['veteran_hoplite', 28], ['veteran_peltast', 10], ['windcrest_griffin', 4], ['companion_cavalry', 3]];
  const westPostGuard: Army = [['veteran_hoplite', 14], ['veteran_peltast', 6]];
  const eastPostGuard: Army = [['brigand_cutthroat', 16], ['tusked_boar', 4]];
  const m5 = chapter({
    campaign: camp,
    chapter: 5,
    card: 7,
    name: 'The Labyrinth of Kerata',
    summary:
      'Doros has penned the minotaurs of Kerata in their own quarry as labour — and as proof that Theron’s enemies are monsters. Release the three captive groups in any order, secure the refuge by the old entrance, and break Doros or the guard posts that let him retake the prison.',
    playtime: '55–75 minutes, 4–5 battles',
    legacy: ['silent_oracle_m06'],
    economyFrom: 'silent_oracle_m06',
    principal: 'so5_yards',
    soundscape: 'high_pass',
    hostileName: 'The Hushed',
    town: { siteId: 'so5_town', townId: 'kerata', name: 'Kerata' },
    map: {
      cols: 34,
      rows: 22,
      biome: 'high_pass',
      base: 'plains',
      seed: 930005,
      texture: { rough: 70, forest: 30 },
      paint: [
        // The sunken quarry: crater walls, the lower ring of galleries, the rock core of the prison.
        { t: 'mountain', disc: [17, 11, 7] },
        { t: 'rough', disc: [17, 11, 5] },
        { t: 'mountain', disc: [17, 11, 3] },
        // The prison hub and its three spokes (north-west, east, south-west) with cross-passages through the hub.
        { t: 'plains', disc: [17, 11, 1] },
        { t: 'plains', cells: [[16, 9], [16, 8], [19, 11], [20, 11], [16, 13], [16, 14]] },
        // The two ramps from the rim road, and the two winch shafts.
        { t: 'plains', cells: [[11, 11], [23, 11], [17, 4], [17, 18]] },
        // Rim country: scree and pines.
        { t: 'rough', blob: [4, 5, 2] },
        { t: 'forest', blob: [29, 18, 1] },
        { t: 'rough', blob: [30, 4, 1] },
      ],
      roads: [
        // The rim road round the quarry.
        { via: ['so5_town', [8, 13], 'so5_west_post'] },
        { via: ['so5_town', [10, 19], [17, 20], [26, 18], [27, 12], 'so5_east_post'] },
        { via: [[8, 13], [7, 5], [17, 2], [26, 4], [27, 12]] },
        // The lower ring of galleries.
        { via: ['so5_west_post', [13, 11], [15, 7], [20, 7], [21, 11], [20, 15], [15, 15], [13, 11]] },
        { via: ['so5_east_post', [21, 11]] },
        // Spurs.
        { via: [[8, 13], 'so5_refuge'] },
        { via: ['so5_town', 'so5_horn'] },
        { via: [[17, 2], 'so5_winch_house'] },
        { via: [[26, 18], 'so5_ogres'] },
        { via: [[26, 4], 'so5_calf'] },
        { via: [[27, 12], 'so5_mine'] },
        { via: ['so5_town', 'so5_sawmill'] },
      ],
    },
    sites: [
      S.town('so5_town', 'kerata', [5, 17], 'Kerata', 'A high town on the quarry rim, by the original entrance to the labyrinth.', [6, 16]),
      S.resource('so5_sawmill', [2, 13], 'sawmill'),
      S.resource('so5_mine', [30, 11], 'gold_mine'),
      // The ramps and their guard posts.
      S.crossing('so5_west_post', [10, 11], 'West Ramp Post', 'Doros’s guard post at the head of the west ramp. A recapture party is quartered here.', {
        label: 'West ramp guard',
        army: westPostGuard,
        reward: { resources: { gold: 800 }, flags: ['so5_post_west'] },
        battlefield: 'ridge_pass',
      }),
      S.crossing('so5_east_post', [24, 11], 'East Ramp Post', 'Doros’s guard post at the head of the east ramp. A recapture party is quartered here.', {
        label: 'East ramp guard',
        army: eastPostGuard,
        reward: { resources: { gold: 800 }, flags: ['so5_post_east'] },
        battlefield: 'ridge_pass',
      }),
      // The winches: new connections between the rim and the lower ring.
      S.activation('so5_winch_house', [16, 2], 'North Winch House', 'The quarry’s great winch above the north wall, its ropes cut.', { cost: { wood: 5, stone: 2 }, reward: { flags: ['so5_winch_north'] }, confirm: 'Pay 5 Wood and 2 Stone to rig the north winch? It opens a lift between the rim and the lower ring.', label: 'relay' }, null),
      S.shortcut('so5_north_winch', [17, 5], 'North Winch Lift', 'A lift basket down the north wall — rigged from the winch house on the rim.', ['so5_winch_north']),
      S.shortcut('so5_south_winch', [17, 17], 'South Winch Lift', 'The south wall’s lift. The prisoners of the south-west yard know how to work it.', ['so5_y_sw']),
      // The prison yards: three spokes off the hub, each open to the ring and to the hub.
      S.landmark('so5_yard_nw', [17, 8], 'North-west Yard', 'Minotaur elders penned beside the north-west spoke, made to cut stone. Clay men guard them.', 'refuge', {
        label: 'North-west yard jailers',
        army: yardNwGuard,
        reward: { flags: ['so5_y_nw', 'so5_first_release'], resources: { gold: 800 }, questXp: 600 },
        battlefield: 'grove',
        required: true,
      }, { objectiveIds: ['so5_yards'], marker: 'evacuation' }),
      S.landmark('so5_yard_e', [20, 10], 'East Yard', 'Young minotaurs chained beside the east spoke, guarded by the Hushed and their boars.', 'refuge', {
        label: 'East yard jailers',
        army: yardEGuard,
        reward: { flags: ['so5_y_e', 'so5_first_release'], resources: { gold: 800 }, questXp: 600 },
        battlefield: 'grove',
        required: true,
      }, { marker: 'evacuation' }),
      S.landmark('so5_yard_sw', [15, 13], 'South-west Yard', 'The largest pen, beside the south-west spoke: families held by Doros’s hoplites and seers.', 'refuge', {
        label: 'South-west yard jailers',
        army: yardSwGuard,
        reward: { flags: ['so5_y_sw', 'so5_first_release'], resources: { gold: 1000 }, questXp: 600 },
        battlefield: 'grove',
        required: true,
      }, { marker: 'evacuation' }),
      S.landmark('so5_doros', [21, 8], 'Doros’s Command Gallery', 'Doros’s headquarters on the lower ring, from which he sends recapture parties.', 'refuge', {
        label: 'Doros and the gallery guard',
        army: dorosGuard,
        commander: doros,
        reward: { flags: ['so5_doros_beaten'], resources: { gold: 1500 }, artifactIds: ['cap_of_darkness'], questXp: 1000 },
        battlefield: 'ridge_pass',
        required: true,
      }),
      S.choice(
        'so5_witness',
        [13, 9],
        'Breakers’ Wing',
        'An old gallery of the lower ring where freed prisoners shelter before the climb out.',
        'Witnesses',
        'Back in the gallery, the freed minotaurs have found their voices. An elder lowers her horns to Ione. “The priest in the gold mask came to see us,” she says. “He told the guards to show us to the pilgrims — chained, shouting. ‘Let them see what the cities’ friends look like.’”',
        [
          { label: 'Hear the north-west yard’s elders', summary: 'Only once the north-west yard is free: their testimony is recorded.', reward: { flags: ['so5_testimony'], questXp: 300 }, requiresFlags: ['so5_y_nw'] },
          { label: 'Hear the east yard’s young bulls', summary: 'Only once the east yard is free: their testimony is recorded.', reward: { flags: ['so5_testimony'], questXp: 300 }, requiresFlags: ['so5_y_e'] },
          { label: 'Hear the south-west yard’s families', summary: 'Only once the south-west yard is free: their testimony is recorded.', reward: { flags: ['so5_testimony'], questXp: 300 }, requiresFlags: ['so5_y_sw'] },
        ],
        { marker: 'evidence' },
      ),
      S.choice(
        'so5_muster',
        [13, 13],
        'Freedmen’s Muster',
        'Where the first freed group gathers on the lower ring.',
        'The first group',
        'The first freed group waits on the lower ring, rubbing the marks of their chains. Ione asks them what they want. Some want to walk straight to the refuge and tell the pilgrims what was done to them. Others look at Doros’s weapon racks.',
        [
          { label: 'Escort them to safety first', summary: 'They go to the refuge now and tell the pilgrims: stronger public testimony at the final ceremony (no troops; the final chapter starts with 10 Favor more).', reward: { flags: ['so5_escorted'], questXp: 300 }, requiresFlags: ['so5_first_release'] },
          { label: 'Arm them from Doros’s stores', summary: '2 Minotaurs join Alexios now to secure the other yards; in the final chapter they march with him again (a small military reward).', reward: { flags: ['so5_armed'], creatures: [{ creatureId: 'minotaur', count: 2 }] }, requiresFlags: ['so5_first_release'] },
        ],
        { marker: 'pact' },
      ),
      S.choice(
        'so5_refuge',
        [8, 15],
        'Old Quarry Refuge',
        'The quarrymen’s old shelter by the original entrance: walls, a well and a roof, if someone pays to make it safe.',
        'Secure the refuge',
        'The quarrymen’s shelter could hold every freed family — once the roof is mended, the well cleaned and the door barred against Doros’s recapture parties.',
        [{ label: 'Secure the refuge', summary: 'Costs 5 Wood and 500 Gold. The freed groups have a safe place by the entrance.', cost: { wood: 5, gold: 500 }, reward: { flags: ['so5_refuge'], questXp: 300 } }],
        { marker: 'evacuation', objectiveIds: ['so5_refuge'] },
      ),
      S.activation(
        'so5_horn',
        [7, 18],
        'Bull-Horn of Kerata',
        'The great bronze horn the minotaurs sound when the road is open.',
        {
          cost: { gold: 500, favor: 5 },
          reward: { questXp: 1500 },
          requirements: [
            { type: 'objective_completed', objectiveId: 'so5_yards' },
            { type: 'objective_completed', objectiveId: 'so5_refuge' },
            { type: 'objective_completed', objectiveId: 'so5_doros' },
          ],
          completesMission: true,
          confirm: 'Sound the Bull-Horn of Kerata (500 Gold, 5 Favor)? This completes The Labyrinth of Kerata.',
        },
        null,
        { objectiveIds: ['so5_horn'] },
      ),
      S.camp('so5_ogres', [27, 17], 'Abandoned Work Camp', 'Ogre labourers Doros stopped paying. They will work for whoever does.', 'ogre', 1, 2),
      S.choice(
        'so5_calf',
        [26, 3],
        'A Minotaur Calf',
        'A minotaur calf caught in a hunter’s net.',
        'The Minotaur Calf',
        'The calf’s horns are only nubs, but it already glares like its mother. Cut free, it will remember you. Or the hunter will sell you the old bronze horn-tip he found in the net — it hums when you hold it to your ear.',
        [
          { label: 'Cut the calf free', summary: '+2 Crystal and +10 Favor.', reward: { resources: { crystal: 2, favor: 10 } } },
          { label: 'Listen to the horn-tip', summary: 'Alexios gains 1,000 experience.', reward: { questXp: 1000 } },
        ],
      ),
    ],
    patrols: [
      {
        commander: band('so5_recapture_west', 'West Recapture Party', 'creature.greek.tier1.upgraded.portrait'),
        monster: true,
        bounty: { gold: 500 },
        start: [14, 10],
        waypoints: [[15, 7], [20, 7], [21, 11], [15, 15], [14, 10]],
        army: [['veteran_hoplite', 12], ['veteran_peltast', 4]],
        home: 'so5_west_post',
        dormantUntil: 'so5_first_release',
        threshold: [3, 2],
        purpose: 'Sent by Doros toward the occupied yards once the first group is freed. It is quartered at the West Ramp Post: taking that post ends it.',
      },
      {
        commander: band('so5_recapture_east', 'East Recapture Party', 'creature.greek.tier1.upgraded.portrait'),
        monster: true,
        bounty: { gold: 500 },
        start: [21, 14],
        waypoints: [[20, 15], [15, 15], [13, 11], [15, 7], [21, 14]],
        army: [['veteran_hoplite', 12], ['veteran_peltast', 4]],
        home: 'so5_east_post',
        dormantUntil: 'so5_second_release',
        threshold: [3, 2],
        purpose: 'Sent by Doros toward the occupied yards once a second group is freed. It is quartered at the East Ramp Post: taking that post ends it.',
      },
    ],
    objectives: [
      O.primary(
        'so5_entry',
        'Into the quarry',
        `Get down to the lower ring: take a ramp post (west: ${armyText(westPostGuard)}; east: ${armyText(eastPostGuard)}) or rig the North Winch House on the rim for a lift through the north wall.`,
        C.any(C.cleared('so5_west_post'), C.cleared('so5_east_post'), C.flag('so5_winch_north')),
      ),
      O.primary(
        'so5_yards',
        'Release the three captive groups',
        `Free the north-west yard (${armyText(yardNwGuard)}), the east yard (${armyText(yardEGuard)}) and the south-west yard (${armyText(yardSwGuard)}), in any order. Each yard opens on the lower ring and on the prison hub.`,
        C.all(C.cleared('so5_yard_nw'), C.cleared('so5_yard_e'), C.cleared('so5_yard_sw')),
        { markerSiteId: 'so5_yard_nw', reward: { flags: ['so5_freed'] }, hint: 'Freed groups make their own way to the refuge along the routes you hold: no escort to babysit.' },
      ),
      O.primary('so5_refuge', 'Secure the refuge', 'Make the Old Quarry Refuge by the original entrance safe for the freed families.', C.flag('so5_refuge'), { markerSiteId: 'so5_refuge' }),
      O.primary(
        'so5_doros',
        'Break Doros’s hold',
        `Defeat Doros at his command gallery (${armyText(dorosGuard)}) — or destroy his capacity to retake the prison by capturing both ramp posts (${armyText(westPostGuard)}; ${armyText(eastPostGuard)}).`,
        C.any(C.cleared('so5_doros'), C.all(C.cleared('so5_west_post'), C.cleared('so5_east_post'))),
        { markerSiteId: 'so5_doros' },
      ),
      O.primary('so5_horn', 'Sound the bull-horn', 'With the yards empty, the refuge secured and Doros’s hold broken, sound the Bull-Horn of Kerata by the entrance.', C.activated('so5_horn'), { markerSiteId: 'so5_horn', requires: ['so5_yards', 'so5_refuge', 'so5_doros'] }),
      O.optional('so5_second', 'A second group free', 'Free a second yard (Doros sends his second recapture party).', C.atLeast(2, C.flag('so5_y_nw'), C.flag('so5_y_e'), C.flag('so5_y_sw')), { reward: { flags: ['so5_second_release'] } }),
      O.optional('so5_witnesses', 'The witnesses', 'Return to the Breakers’ Wing after freeing a yard: the freed prisoners will testify.', C.flag('so5_testimony'), { markerSiteId: 'so5_witness' }),
      O.optional('so5_first_group', 'The first group', 'At the Freedmen’s Muster, escort the first freed group to safety or arm it.', C.any(C.flag('so5_escorted'), C.flag('so5_armed')), { markerSiteId: 'so5_muster' }),
      O.optional('so5_winch', 'Rig the north winch', 'Rig the North Winch House: a lift between the rim and the lower ring.', C.flag('so5_winch_north'), { markerSiteId: 'so5_winch_house' }),
      O.optional('so5_calf_net', 'The minotaur calf', 'Visit the calf caught in the hunter’s net.', C.visited('so5_calf'), { markerSiteId: 'so5_calf' }),
    ],
    evidence: [
      { id: 'so5_ev_freed', flag: 'so5_freed', title: 'The captives freed', text: 'All three captive groups of Kerata are free and on their way to the refuge.', icon: 'evacuation' },
      { id: 'so5_ev_testimony', flag: 'so5_testimony', title: 'The prisoners’ testimony', text: 'Theron ordered the minotaurs shown to pilgrims in chains, as proof that the cities’ friends were monsters.', icon: 'evidence' },
      { id: 'so5_ev_escorted', flag: 'so5_escorted', title: 'Escorted first', text: 'The first freed group went straight to the refuge and told the pilgrims what was done to them.', icon: 'evacuation' },
      { id: 'so5_ev_armed', flag: 'so5_armed', title: 'Armed first', text: 'The first freed group took up Doros’s weapons and helped free the others.', icon: 'branch' },
      { id: 'so5_ev_doros', flag: 'so5_doros_beaten', title: 'Doros beaten', text: 'The polemarch Doros was beaten at his own command gallery.', icon: 'evidence' },
    ],
    carried: ['so5_freed', 'so5_testimony', 'so5_escorted', 'so5_armed', 'so5_doros_beaten'],
    briefing: [
      IONE('The minotaurs of Kerata guarded the lower road to Kalliste before there was a temple. Doros has penned them in their own quarry — as labour, and as proof.'),
      THALEIA('Proof that Theron’s enemies are monsters. He shows them to pilgrims in chains.'),
      ALEXIOS('Then every group we free is a witness against him. Three yards, any order. And Doros either falls or loses the posts he would use to take them back.'),
    ],
    briefingVariants: [
      { ifFlags: ['fact:so4_surrender'], lines: [THALEIA('Melas sent word from Pyrgos: half of Doros’s hoplites were his own men once. He wrote their names down for us.')] },
      { ifFlags: ['fact:so4_council'], lines: [THALEIA('Pyrgos’s new council sends its greetings — and the names of the men Doros recruited from its barracks.')] },
    ],
    victory: [
      IONE('The minotaurs walk their road again. From the rim I could see Kalliste — the sanctuary, the two altars, and the spring under the temple, sealed.'),
      ALEXIOS('Theron’s monsters were prisoners, and now they are witnesses.'),
    ],
    scenes: [
      { id: 'so5_first', trigger: { type: 'flag', flag: 'so5_first_release' }, lines: [IONE('The first yard is open. Doros has seen it — a recapture party is leaving the west ramp post.'), ALEXIOS('Then the freed go to the refuge by the roads we hold. Nobody walks them by the hand; we keep the roads.')] },
      { id: 'so5_second', trigger: { type: 'flag', flag: 'so5_second_release' }, lines: [THALEIA('A second group is out. Doros is sending the east post’s party now.')] },
      { id: 'so5_doros_battle', trigger: { type: 'battle_started', siteId: 'so5_doros' }, lines: [DOROS('The Hierophant pays better than any city ever paid me, strategos. Turn back while you still have an army to pay.'), ALEXIOS('Mine are not for sale, Doros.')] },
      { id: 'so5_doros_down', trigger: { type: 'site_cleared', siteId: 'so5_doros' }, lines: [THALEIA('Doros is beaten and his mercenaries are scattering. No one is coming to take the yards back.')] },
      { id: 'so5_posts', trigger: { type: 'objective_completed', objectiveId: 'so5_doros' }, unlessFlags: ['so5_doros_beaten'], lines: [IONE('Both ramp posts are ours. Doros still sits in his gallery — but he has no way to send anyone after the prisoners.')] },
      { id: 'so5_winch', trigger: { type: 'flag', flag: 'so5_winch_north' }, lines: [THALEIA('The north winch runs. The lower ring is a basket ride from the rim now.')] },
      { id: 'so5_south_winch', trigger: { type: 'flag', flag: 'so5_y_sw' }, lines: [IONE('The south-west families know the south winch — they have unchained the lift. Another way up the wall.')] },
    ],
    loss: ['Alexios must survive.', 'Losing Kerata is recoverable while Alexios has an army.', 'Freed groups are never recaptured: they travel to the refuge as progress, not as units to escort.'],
    help: [
      { id: 'so5_quarry', title: 'The sunken quarry', text: 'A rim road circles the quarry; two ramps (each with a guard post) lead down to the lower ring. The three yards sit beside three spokes joined at the prison hub. Winches add lifts through the walls.' },
      { id: 'so5_parties', title: 'Recapture parties', text: 'Doros sends one party after the first release and one after the second. Each is quartered at a ramp post: taking the post ends that party.' },
    ],
  });

  // =========================================================================
  // Chapter 6 — The Spring of Kalliste (card 8; legacy m07)
  // =========================================================================
  const v1m07 = camp.v1('silent_oracle_m07');
  const theron = v1m07.sites.find((s) => s.id === 'm07_hall')?.guard?.commander;
  const phaidon = v1m07.hostileHeroes[0]?.commander;
  if (!theron || !phaidon) throw new Error('Silent Oracle v2: Theron’s or Phaidon’s profile is missing from the legacy content');
  const theronHost: Army = [['windcrest_griffin', 2], ['veteran_hoplite', 22], ['veteran_hoplite', 18], ['veteran_peltast', 12], ['labyrinth_warden', 2], ['temple_seer', 2]];
  const westPassGuard: Army = [['veteran_hoplite', 24], ['veteran_peltast', 6]];
  const cliffPassGuard: Army = [['veteran_hoplite', 18], ['windcrest_griffin', 3]];
  const prisonPassGuard: Army = [['bronze_golem', 4], ['veteran_hoplite', 12]];
  const phaidonArmy: Army = [['veteran_hoplite', 24], ['veteran_peltast', 8], ['windcrest_griffin', 2]];
  const cliffWatchGuard: Army = [['veteran_hoplite', 14], ['veteran_peltast', 6]];
  const prisonPostGuard: Army = [['brigand_cutthroat', 20], ['tusked_boar', 6]];
  const m6 = chapter({
    campaign: camp,
    chapter: 6,
    card: 8,
    name: 'The Spring of Kalliste',
    summary:
      'Theron offers a bargain: accept his single voice and he will contain the dangerous spring. Secure an approach to the sanctuary, protect Myrrine’s stabilisation of the spring at both altars, defeat Theron’s final host — and decide who keeps the Oracle afterwards.',
    playtime: '80–110 minutes, 5–7 battles',
    legacy: ['silent_oracle_m07'],
    economyFrom: 'silent_oracle_m07',
    principal: 'so6_theron',
    soundscape: 'storm_plateau',
    hostileName: 'The Hierophant’s Temple',
    town: { siteId: 'so6_town', townId: 'kalliste', name: 'Kalliste' },
    map: {
      cols: 42,
      rows: 24,
      biome: 'storm_plateau',
      base: 'plains',
      seed: 930006,
      texture: { rough: 70, forest: 30 },
      paint: [
        // The circular basin: a mountain ring round the sanctuary plateau, three passes through it.
        { t: 'mountain', disc: [21, 12, 7] },
        { t: 'plains', disc: [21, 12, 5] },
        { t: 'plains', cells: [[15, 12], [24, 6], [24, 18], [17, 19], [17, 20]] },
        { t: 'rough', cells: [[20, 11], [22, 11], [20, 13], [22, 13]] },
        // Outer country: the cliff settlement's crags in the north-east, the prison road's scree in the south-east.
        { t: 'mountain', blob: [34, 3, 2] },
        { t: 'rough', blob: [32, 20, 2] },
        { t: 'mountain', blob: [4, 21, 1] },
        { t: 'forest', blob: [8, 4, 2] },
        { t: 'rough', blob: [12, 20, 1] },
      ],
      roads: [
        // The outer ring through the three sectors.
        { via: ['so6_town', [9, 6], [16, 2], [26, 2], [31, 7], [36, 12], [31, 18], [24, 21], [12, 18], 'so6_town'] },
        // The three passes into the inner ring.
        { via: ['so6_town', 'so6_west_pass', [16, 12]] },
        { via: [[26, 2], 'so6_cliff_pass', [23, 7]] },
        { via: [[31, 18], 'so6_prison_pass', [23, 17]] },
        { via: [[16, 21], 'so6_sacred_way', [18, 16]] },
        // The inner ring round the sanctuary.
        { via: [[16, 12], [18, 8], [23, 7], [26, 12], [23, 17], [18, 16], [16, 12]] },
        { via: [[18, 8], 'so6_dawn'] },
        { via: [[26, 12], 'so6_dusk'] },
        { via: [[23, 7], 'so6_sanctuary'] },
        { via: [[18, 16], 'so6_sanctuary'] },
        { via: [[26, 12], 'so6_spring'] },
        // Sectors and spurs.
        { via: [[31, 7], 'so6_cliff_watch'] },
        { via: [[36, 12], 'so6_prison_post'] },
        { via: [[16, 2], 'so6_depot'] },
        { via: [[9, 6], 'so6_refuge'] },
        { via: [[9, 6], 'so6_treasury'] },
        { via: [[31, 18], 'so6_crags'] },
        { via: ['so6_town', 'so6_sawmill'] },
        { via: [[36, 12], 'so6_crystal'] },
      ],
    },
    sites: [
      S.town('so6_town', 'kalliste', [6, 12], 'Kalliste', 'The pilgrims’ town in the western sector of the sanctuary basin.', [7, 12]),
      S.resource('so6_sawmill', [4, 16], 'sawmill'),
      S.resource('so6_crystal', [38, 10], 'crystal_deposit'),
      S.resource('so6_quarry', [11, 21], 'quarry'),
      // The three passes.
      S.crossing('so6_west_pass', [14, 12], 'Pilgrims’ Pass', 'The pass from the pilgrim town into the sanctuary plateau, held by the temple guard.', {
        label: 'Temple guard',
        army: westPassGuard,
        reward: { resources: { gold: 1000 } },
        battlefield: 'ridge_pass',
        required: true,
      }),
      S.crossing('so6_cliff_pass', [24, 5], 'Cliff Pass', 'The pass from the cliff settlement, watched by griffin riders.', {
        label: 'Cliff-pass guard',
        army: cliffPassGuard,
        reward: { resources: { gold: 1000 } },
        battlefield: 'ridge_pass',
        required: true,
      }),
      S.crossing('so6_prison_pass', [24, 19], 'Prison-Road Pass', 'The pass where the prison road from Kerata climbs into the basin, held by bronze sentinels.', {
        label: 'Bronze sentinels',
        army: prisonPassGuard,
        reward: { resources: { gold: 1000 } },
        battlefield: 'ridge_pass',
        required: true,
      }),
      S.shortcut('so6_sacred_way', [18, 18], 'The Sacred Way', 'The old pilgrims’ stair straight up from the southern road to the sanctuary plateau, choked with the cracked spring’s vapour. It clears once Myrrine has stabilised either vein.', ['so6_vapours_calmed']),
      // Myrrine's two stabilisations.
      S.activation('so6_dawn', [19, 8], 'Altar of Dawn', 'The altar of the morning on the inner ring, where the spring’s north vein runs close under the stone.', { cost: { gold: 400, stone: 3, crystal: 2 }, reward: { flags: ['so6_dawn_done', 'so6_vapours_calmed'], questXp: 1000 }, confirm: 'Hold the Altar of Dawn while Myrrine stabilises the north vein (400 Gold, 3 Stone, 2 Crystal)? Theron will send one counterattack — the stabilisation holds whatever happens.' }, null, { objectiveIds: ['so6_dawn'], marker: 'evidence' }),
      S.activation('so6_dusk', [26, 12], 'Altar of Dusk', 'The altar of the evening on the inner ring, over the spring’s east vein.', { cost: { gold: 400, stone: 3, crystal: 2 }, reward: { flags: ['so6_dusk_done', 'so6_vapours_calmed'], questXp: 1000 }, confirm: 'Hold the Altar of Dusk while Myrrine stabilises the east vein (400 Gold, 3 Stone, 2 Crystal)? Theron will send one counterattack — the stabilisation holds whatever happens.' }, null, { objectiveIds: ['so6_dusk'], marker: 'evidence' }),
      // The sanctuary and the spring.
      S.landmark('so6_sanctuary', [21, 12], 'The Spring Sanctuary', 'The inner hall over the Oracle’s spring, where Theron waits with his final host.', 'refuge', {
        label: 'Theron and the temple host',
        army: theronHost,
        commander: theron,
        reward: { flags: ['so6_theron_down'], resources: { gold: 2000 }, questXp: 2500 },
        battlefield: 'beacon_clearing',
        required: true,
      }, { objectiveIds: ['so6_theron'] }),
      S.choice(
        'so6_spring',
        [23, 12],
        'The Oracle’s Spring',
        'The cracked spring under the sanctuary, held steady by Myrrine’s two stabilisations.',
        'Who keeps the spring',
        'The bronze seal lies broken, and the spring runs — steady now, held at both altars. Myrrine kneels beside it. “I will not be anyone’s Voice again,” she says. “I can stay here as the spring’s adviser, answering whoever climbs the road, bound to no city. Or the cities can keep the spring together, as a council, and ask me when they choose. Either way, no one speaks for me.”',
        [
          { label: 'The Oracle stays an independent adviser', summary: 'Myrrine keeps the spring and answers any city that asks; no city commands her.', reward: { flags: ['so_oracle_adviser'], questXp: 500 }, requiresFlags: ['so6_theron_down'] },
          { label: 'A council of cities keeps the spring', summary: 'The cities guard the spring together and consult the Oracle as one council.', reward: { flags: ['so_spring_council'], questXp: 500 }, requiresFlags: ['so6_theron_down'] },
        ],
        { marker: 'pact', objectiveIds: ['so6_choice'] },
      ),
      // The sectors: their garrisons are the homes of Theron's counterattacks.
      S.landmark('so6_cliff_watch', [32, 5], 'Cliff Settlement Watch', 'The temple’s barracks in the cliff settlement. Theron’s dawn reserve is drawn from here.', 'refuge', {
        label: 'Cliff watch',
        army: cliffWatchGuard,
        reward: { flags: ['so6_cliff_secured'], resources: { gold: 800 } },
        battlefield: 'ridge_pass',
      }),
      S.landmark('so6_prison_post', [37, 14], 'Prison-Road Post', 'The temple’s post on the prison road from Kerata. Theron’s dusk reserve is drawn from here.', 'refuge', {
        label: 'Prison-road guard',
        army: prisonPostGuard,
        reward: { flags: ['so6_prison_secured'], resources: { gold: 800 } },
        battlefield: 'ridge_pass',
      }),
      S.landmark('so6_depot', [15, 3], 'Reserve Depot', 'Phaidon’s depot on the outer ring: arms and grain for the temple host. It can be bypassed, or neutralised.', 'quarry_cache', {
        label: 'Depot guard',
        army: [['veteran_hoplite', 12], ['veteran_peltast', 6], ['bronze_golem', 2]],
        reward: { flags: ['so6_depot_taken'], resources: { gold: 1500, crystal: 3 } },
        battlefield: 'ridge_pass',
      }),
      // Optional places.
      S.choice(
        'so6_refuge',
        [4, 4],
        'Mountain Refuge',
        'A mixed refuge of neutral folk high above the pilgrims’ town: centaurs, slingers and a few pegasi share its one meadow.',
        'One band from the refuge',
        'The refuge has only so many to spare — one band leaves, and the rest stay to guard the meadow. Who goes with you is your choice.',
        [
          { label: '5 Pegasi', summary: 'Costs 1,250 Gold. 5 Pegasi join Alexios.', cost: { gold: 1250 }, reward: { creatures: [{ creatureId: 'pegasus', count: 5 }] } },
          { label: '6 Centaur Sentinels', summary: 'Costs 1,500 Gold. 6 Centaur Sentinels join Alexios.', cost: { gold: 1500 }, reward: { creatures: [{ creatureId: 'centaur_sentinel', count: 6 }] } },
          { label: '10 Hill Slingers', summary: 'Costs 900 Gold. 10 Hill Slingers join Alexios.', cost: { gold: 900 }, reward: { creatures: [{ creatureId: 'hill_slinger', count: 10 }] } },
        ],
        { art: 'neutral_dwelling.pegasus', marker: 'pact' },
      ),
      S.pickup('so6_treasury', [11, 5], 'Votive Treasury', 'A treasury filled by generations of pilgrims.', { resources: { gold: 1500, crystal: 3 } }),
      S.landmark('so6_crags', [35, 20], 'Wyvern Crags', 'Wyverns roost above the prison road.', 'nest', { label: 'Crag wyverns', army: [['wyvern_matriarch', 3]], reward: { resources: { crystal: 6 } }, battlefield: 'grove' }),
    ],
    patrols: [
      {
        commander: phaidon,
        start: [17, 3],
        waypoints: [[17, 3], [26, 2]],
        army: phaidonArmy,
        home: 'so6_depot',
        radius: 9,
        purpose: 'Phaidon moves the temple’s reserves between his depot and the exposed outer supply roads. Take the Reserve Depot and he withdraws; or go round him.',
      },
      {
        commander: band('so6_dawn_reserve', 'Sanctuary Reserve (Dawn)', 'creature.greek.tier1.upgraded.portrait'),
        monster: true,
        bounty: { gold: 600 },
        start: [22, 9],
        waypoints: [[20, 8], [18, 9], [22, 9]],
        army: [['veteran_hoplite', 18], ['veteran_peltast', 6]],
        home: 'so6_cliff_watch',
        dormantUntil: 'so6_dawn_done',
        threshold: [3, 2],
        purpose: 'Waits by the sanctuary. When the Altar of Dawn is stabilised, Theron sends it against the altar — once. It is drawn from the Cliff Settlement Watch: securing that sector cancels it.',
      },
      {
        commander: band('so6_dusk_reserve', 'Sanctuary Reserve (Dusk)', 'creature.greek.tier1.upgraded.portrait'),
        monster: true,
        bounty: { gold: 600 },
        start: [21, 15],
        waypoints: [[24, 14], [25, 13], [21, 15]],
        army: [['veteran_hoplite', 18], ['labyrinth_warden', 1]],
        home: 'so6_prison_post',
        dormantUntil: 'so6_dusk_done',
        threshold: [3, 2],
        purpose: 'Waits by the sanctuary. When the Altar of Dusk is stabilised, Theron sends it against the altar — once. It is drawn from the Prison-Road Post: securing that sector cancels it.',
      },
    ],
    objectives: [
      O.primary(
        'so6_approach',
        'Secure a spring approach',
        `Take one of the three passes into the sanctuary plateau: the Pilgrims’ Pass (${armyText(westPassGuard)}), the Cliff Pass (${armyText(cliffPassGuard)}) or the Prison-Road Pass (${armyText(prisonPassGuard)}).`,
        C.any(C.cleared('so6_west_pass'), C.cleared('so6_cliff_pass'), C.cleared('so6_prison_pass')),
      ),
      O.primary('so6_dawn', 'Stabilise at the Altar of Dawn', 'Hold the Altar of Dawn while Myrrine stabilises the spring’s north vein. Either altar may come first.', C.activated('so6_dawn'), { markerSiteId: 'so6_dawn' }),
      O.primary('so6_dusk', 'Stabilise at the Altar of Dusk', 'Hold the Altar of Dusk while Myrrine stabilises the spring’s east vein. Either altar may come first.', C.activated('so6_dusk'), { markerSiteId: 'so6_dusk' }),
      O.primary(
        'so6_theron',
        'Theron’s final host',
        `Defeat Theron and the temple host (${armyText(theronHost)}) at the Spring Sanctuary — from whichever pass you hold.`,
        C.cleared('so6_sanctuary'),
        { markerSiteId: 'so6_sanctuary', hint: 'Securing the cliff settlement and the prison road cancels Theron’s counterattacks; taking the Reserve Depot sends Phaidon away.' },
      ),
      O.primary(
        'so6_choice',
        'Who keeps the spring',
        'With Theron beaten and both stabilisations complete, decide at the spring: the Oracle as an independent adviser, or a council of cities.',
        C.any(C.flag('so_oracle_adviser'), C.flag('so_spring_council')),
        { markerSiteId: 'so6_spring', requires: ['so6_theron', 'so6_dawn', 'so6_dusk'], completesMission: true },
      ),
      O.optional('so6_sectors', 'Secure the sectors', `Take the Cliff Settlement Watch (${armyText(cliffWatchGuard)}) and the Prison-Road Post (${armyText(prisonPostGuard)}): Theron’s reserves have nowhere to come from.`, C.all(C.cleared('so6_cliff_watch'), C.cleared('so6_prison_post')), { markerSiteId: 'so6_cliff_watch' }),
      O.optional('so6_phaidon', 'Phaidon’s reserves', `Beat Phaidon (${armyText(phaidonArmy)}) or take his Reserve Depot.`, C.defeated('greek_phaidon'), { markerSiteId: 'so6_depot' }),
      O.optional('so6_mixed_refuge', 'The mountain refuge', 'Visit the mountain refuge above the pilgrims’ town.', C.visited('so6_refuge'), { markerSiteId: 'so6_refuge' }),
    ],
    evidence: [
      { id: 'so6_ev_dawn', flag: 'so6_dawn_done', title: 'The north vein held', text: 'Myrrine stabilised the spring’s north vein at the Altar of Dawn. It holds.', icon: 'evidence' },
      { id: 'so6_ev_dusk', flag: 'so6_dusk_done', title: 'The east vein held', text: 'Myrrine stabilised the spring’s east vein at the Altar of Dusk. It holds.', icon: 'evidence' },
      { id: 'so6_ev_theron', flag: 'so6_theron_down', title: 'The Voice is silent', text: 'Theron’s final host is broken at the sanctuary.', icon: 'evidence' },
      { id: 'so6_ev_adviser', flag: 'so_oracle_adviser', title: 'An independent adviser', text: 'The Oracle keeps the spring and answers any city that asks; no city commands her.', icon: 'pact' },
      { id: 'so6_ev_council', flag: 'so_spring_council', title: 'A council of cities', text: 'The cities keep the spring together and consult the Oracle as one council.', icon: 'pact' },
    ],
    carried: ['so_oracle_adviser', 'so_spring_council'],
    entryBonuses: [
      { fact: 'so1_sheltered', label: 'The pilgrims Elaia sheltered keep Kalliste’s walls (12 Veteran Hoplites)', garrison: [{ creatureId: 'veteran_hoplite', count: 12 }] },
      { fact: 'so3_preserve', label: 'Myrrine’s research in the preserved archive: the stabilisations are prepared (4 Crystal)', wallet: { crystal: 4 } },
      { fact: 'so4_surrender', label: 'Melas’s detachment from Pyrgos (10 Veteran Hoplites, 3 Cavalry in Kalliste)', garrison: [{ creatureId: 'veteran_hoplite', count: 10 }, { creatureId: 'cavalry', count: 3 }] },
      { fact: 'so4_council', label: 'The council of Pyrgos lends its legitimacy (2,000 Gold, 10 Favor)', wallet: { gold: 2000, favor: 10 } },
      { fact: 'so5_armed', label: 'The armed minotaurs of Kerata march with Alexios (2 Minotaurs)', heroArmy: [{ creatureId: 'minotaur', count: 2 }] },
      { fact: 'so5_escorted', label: 'The freed prisoners’ testimony moves the pilgrims (10 Favor)', wallet: { favor: 10 } },
    ],
    briefing: [
      THERON('Come up, strategos, and listen. The spring is cracked — your archive told you so. Accept one voice, mine, and I will contain it. Refuse, and let the cities argue while it tears the world open.'),
      IONE('Myrrine came down the prison road the night the minotaurs of Kerata broke their pens — every guard on the mountain had run to the labyrinth.'),
      MYRRINE('He is right about the crack and wrong about the cure. Uncontrolled, the spring would tear the merged world. Stabilised at both altars, it holds without anyone’s voice. I can do it, if someone holds the ground while I work.'),
      THALEIA('Three passes into the basin: the pilgrims’ pass from Kalliste, the cliff pass, the prison road. Any of them reaches the sanctuary.'),
      ALEXIOS('Then we prove the cities can protect it without surrendering their judgement. One pass, both altars, then Theron.'),
    ],
    briefingVariants: [
      { ifFlags: ['fact:so1_sheltered'], lines: [THALEIA('The pilgrims Elaia sheltered came up the road ahead of us. They hold Kalliste’s walls.')] },
      { ifFlags: ['fact:so3_preserve'], lines: [MYRRINE('I read the preserved archive night after night. I know where the veins run; the stabilisations will go faster for it.')] },
      { ifFlags: ['fact:so4_surrender'], lines: [MELAS('(a dispatch from Pyrgos) My detachment is at Kalliste. I swore to the wrong voice once; I will not do it again.')] },
      { ifFlags: ['fact:so4_council'], lines: [THALEIA('Pyrgos’s council has written to every city on the coast in our name. That is worth more than another regiment.')] },
      { ifFlags: ['fact:so5_armed'], lines: [IONE('The minotaurs who took up Doros’s weapons have come to finish what they started.')] },
      { ifFlags: ['fact:so5_escorted'], lines: [IONE('The freed families’ story has reached every pilgrim on the road. They know what Theron showed them, and why.')] },
    ],
    victory: [
      MYRRINE('The spring runs, steady at both veins. No one speaks for me now — not Theron, not the cities, not you, strategos.'),
      ALEXIOS('That was the whole point.'),
    ],
    scenes: [
      { id: 'so6_sacred_way', trigger: { type: 'flag', flag: 'so6_vapours_calmed' }, lines: [IONE('The vapour has cleared from the Sacred Way. The old stair runs straight up from the southern road — the way my mother climbed.')] },
      { id: 'so6_dawn_counter', trigger: { type: 'flag', flag: 'so6_dawn_done' }, lines: [MYRRINE('The north vein holds. It will hold whatever comes now.'), THALEIA('Theron is sending his dawn reserve against the altar — unless the cliff settlement is already ours.')] },
      { id: 'so6_dusk_counter', trigger: { type: 'flag', flag: 'so6_dusk_done' }, lines: [MYRRINE('The east vein holds.'), THALEIA('The dusk reserve is moving from the sanctuary — unless the prison road is already ours.')] },
      { id: 'so6_phaidon', trigger: { type: 'battle_started', heroDefinitionId: 'greek_phaidon' }, lines: [PHAIDON('I keep the way between dawn and dusk. I have kept it for the Voice for nine years.'), ALEXIOS('Then keep it for the spring.')] },
      { id: 'so6_theron_battle', trigger: { type: 'battle_started', siteId: 'so6_sanctuary' }, lines: [THERON('The cities did not want the truth, strategos. They wanted to be told. I told them.'), ALEXIOS('Then let them hear the truth for once.')] },
      { id: 'so6_theron_down', trigger: { type: 'site_cleared', siteId: 'so6_sanctuary' }, lines: [MYRRINE('So the Voice is quiet at last. Come down to the spring, strategos. There is one more thing to decide, and it is not mine to decide alone.')] },
      { id: 'so6_melas_surrendered', trigger: { type: 'flag', flag: 'so6_theron_down' }, ifFlags: ['fact:so4_surrender'], lines: [MELAS('(at the spring, before the cities’ envoys) I swore to Theron’s voice and I kept Pyrgos for him. I surrendered when I saw the forgeries. Write that down — both halves.')] },
      { id: 'so6_melas_council', trigger: { type: 'flag', flag: 'so6_theron_down' }, ifFlags: ['fact:so4_council'], lines: [MELAS('(brought up from Pyrgos under the council’s guard) I held the city until it was taken from me. I was wrong about the voice. I was not wrong that the valley needed defending.')] },
      { id: 'so6_witnesses', trigger: { type: 'flag', flag: 'so6_theron_down' }, ifFlags: ['fact:so5_testimony'], lines: [IONE('The elders of Kerata are here to speak before the envoys — the “monsters” Theron showed the pilgrims in chains.')] },
      { id: 'so6_pilgrims', trigger: { type: 'flag', flag: 'so6_theron_down' }, ifFlags: ['fact:so1_t_pilgrims'], lines: [THALEIA('And the olive-valley pilgrims brought their tablets all the way up the road. Elaia’s and Thymbra’s prophecies, side by side, the same seal.')] },
    ],
    loss: ['Alexios must survive.', 'Losing Kalliste is recoverable while Alexios has an army.', 'A completed stabilisation is never undone by a counterattack.'],
    help: [
      { id: 'so6_basin', title: 'The sanctuary basin', text: 'An outer ring joins the pilgrim town, the cliff settlement and the prison road; three passes lead to the inner ring round the sanctuary. Any pass reaches it — securing more sectors changes Theron’s reserves, it does not unlock a gate. The Sacred Way, a stair from the southern road, clears after the first stabilisation.' },
      { id: 'so6_counter', title: 'Counterattacks', text: 'Each stabilisation triggers one announced counterattack from the sanctuary. Its troops come from a sector garrison: take the garrison first and that counterattack never comes. Stabilisations hold once complete.' },
    ],
  });

  return {
    missions: [m1, m2, m3, m4, m5, m6],
    chapters: [
      { missionId: m1.id, chapter: 1, requiresAll: [], legacyMissionIds: ['silent_oracle_m01'], briefingArt: m1.briefingArt! },
      { missionId: m2.id, chapter: 2, requiresAll: [m1.id], legacyMissionIds: ['silent_oracle_m02', 'silent_oracle_m03'], briefingArt: m2.briefingArt! },
      { missionId: m3.id, chapter: 3, requiresAll: [m1.id], legacyMissionIds: ['silent_oracle_m04'], briefingArt: m3.briefingArt! },
      { missionId: m4.id, chapter: 4, requiresAll: [m2.id, m3.id], legacyMissionIds: ['silent_oracle_m05'], briefingArt: m4.briefingArt! },
      { missionId: m5.id, chapter: 5, requiresAll: [m2.id, m3.id], legacyMissionIds: ['silent_oracle_m06'], briefingArt: m5.briefingArt! },
      { missionId: m6.id, chapter: 6, requiresAll: [m4.id, m5.id], legacyMissionIds: ['silent_oracle_m07'], briefingArt: m6.briefingArt! },
    ],
    epilogue: {
      // The campaign cover, not a v1 ending picture: the v2 outcomes (adviser or council, the spring
      // preserved either way) do not match the v1 endings' unsealed-spring / sealed-spring scenes.
      art: 'campaign.silent_oracle.cover',
      lines: [
        THALEIA('The pilgrims are on the road again, Alexios — all the way from Elaia to the spring. I counted them going up, and I will count them coming down.'),
        IONE('A bronze bull, a sold oath, a hall of echoes, a city of oaths and a labyrinth. The griffins will be telling it for a generation.'),
      ],
      variants: [
        { flag: 'so_oracle_adviser', lines: [MYRRINE('I answer whoever climbs the road — only what I hear, and nothing I am paid to say. No city owns the question, and no one owns the answer.'), ALEXIOS('That is all anyone ever needed from you.')] },
        { flag: 'so_spring_council', lines: [MYRRINE('The cities keep the spring together now, and ask me when they agree to ask. They argue first. It is slower than a Voice.'), THALEIA('They are already arguing in Asterion’s council chamber. It is the best sound I have heard all year.')] },
      ],
    },
  };
}
