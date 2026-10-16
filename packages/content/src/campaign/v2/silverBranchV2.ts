/**
 * The Silver Branch, content v2 (campaign expansion handoff 2026-10-15; review
 * cards 27–32): six chapters carrying the seven legacy chapters of Orla's
 * campaign.
 *
 *   1  The Cold Hearth (legacy m01) — a woodland basin: Dún Caill in a clearing
 *      inside a river horseshoe; two fords and the outer road make the outer
 *      circuit through three forest communities, a footbridge laid by the
 *      woodcutters adds a shortcut north to the hazel grove.
 *   2  The Iron-Bristled Boar and the Water-Horse Bargain (legacy m02 + m03) —
 *      Loch Eala in the middle, Dún Bera on the eastern plain; two shore roads,
 *      the hill bridge and the marsh causeway make a circuit; reopening the old
 *      water route (a sluice) floods the farm ford and opens the kelpies' boat
 *      landing.
 *   3  The Hall Beneath the Waves (legacy m04) — an expedition from Inis Rón: two
 *      headlands, a long inland road between them, ferries across the bay and two
 *      reef landings at the drowned hall; opening either landing unbars the
 *      Kings' Road back to the harbour.
 *   4  The High Seat (legacy m05) — three valleys meet under Fiachra's fort; a
 *      ring road joins the market, pasture and forest districts, two valley roads
 *      climb to the fort and a remote ridge path flanks it.
 *   5  The Stags' Wood (legacy m06) — a permanent outer road round an ancient
 *      thicket with three seasonal glades; Tadhg's host holds the crossing of the
 *      two cross-paths, each released spirit changes one inner shortcut.
 *   6  The Door of the Mound (legacy m07) — an open plain round the great mound:
 *      four regions on an outer ring and two diagonals, two barrow-roads to the
 *      mound's doors.
 *
 * Order: 1 → 2 → {3, 4 in either order} → 5 → 6. Chapters 3 and 4 read each
 * other's facts (`fact:<flag>`): played after the High Seat, the charters test
 * the settlement already made; played before, they inform the succession. The
 * existing cast only (Orla, Cathal, Sadb, Fiachra, Corc, Tadhg the Grey, Ciar,
 * Dubhghall). Values are proposed and unplaytested; economies come from the
 * legacy chapter each one carries first.
 */
import type { CommanderSpec } from '@pr/rules';
import { speaker } from '../arc';
import { C, O, S, armyText, chapter, type Army, type V2Campaign } from './kit';
import type { V2Built } from './index';

const P = 'celtic';
const ORLA = speaker(P, 'Orla');
const CATHAL = speaker(P, 'Cathal');
const SADB = speaker(P, 'Sadb');
const DUBHGHALL = speaker(P, 'Dubhghall');
const FIACHRA = speaker(P, 'Fiachra');
const CORC = speaker(P, 'Corc');
const TADHG = speaker(P, 'Tadhg the Grey', 'tadhg');
const CIAR = speaker(P, 'Ciar');

/** A band without a commander (reavers, collectors, a surviving binder): its portrait is a creature's. */
function band(id: string, name: string, portrait: string): CommanderSpec {
  return { heroDefinitionId: id, name, classId: 'champion', level: 1, attributes: { attack: 0, defense: 0, power: 0, knowledge: 0 }, skills: [], spellbook: false, spellIds: [], mana: 0, portraitAssetId: portrait };
}
const REAVER_PORTRAIT = 'creature.neutral.brigand.upgraded.portrait';

export function buildSilverBranchV2(camp: V2Campaign): V2Built {
  // =========================================================================
  // Chapter 1 — The Cold Hearth (card 27; legacy m01)
  // =========================================================================
  const fordBoars: Army = [['wild_boar', 8]];
  const eastPickets: Army = [['brigand', 6], ['brigand_cutthroat', 2]];
  const booleyGuard: Army = [['brigand', 8], ['brigand_cutthroat', 3]];
  const oghamGuard: Army = [['brigand', 12], ['brigand_cutthroat', 4]];
  const reaverCampGuard: Army = [['brigand', 9], ['brigand_cutthroat', 3]];
  const m1 = chapter({
    campaign: camp,
    chapter: 1,
    card: 27,
    name: 'The Cold Hearth',
    summary:
      'Beltane’s fire will not catch at Dún Caill, and the old agreements between the hillfort and the woodland have been claimed as royal property. Renew the woodcutters’ timber agreement, rescue the herders from the booley, read the first branch inscription in the hazel grove — and light the communal hearth at home.',
    playtime: '45–65 minutes, 3–4 battles',
    legacy: ['silver_branch_m01'],
    economyFrom: 'silver_branch_m01',
    principal: 'sb1_inscription',
    soundscape: 'glen',
    hostileName: 'The Ridge Reavers',
    town: { siteId: 'sb1_town', townId: 'dun_caill', name: 'Dún Caill' },
    map: {
      cols: 32,
      rows: 22,
      biome: 'moor',
      base: 'plains',
      seed: 960001,
      texture: { forest: 110, rough: 40 },
      paint: [
        // The river horseshoe round Dún Caill's clearing: west arm, northern bend, east arm.
        { t: 'water', line: [[9, 20], [9, 15], [9, 10]], width: 0 },
        { t: 'water', line: [[9, 10], [10, 8], [12, 6], [16, 5], [20, 6], [22, 8], [23, 10]], width: 0 },
        { t: 'water', line: [[23, 10], [23, 15], [23, 20]], width: 0 },
        // The fairy knoll between the town and the hearth: the inner circuit runs round it.
        { t: 'mountain', disc: [16, 12, 1] },
        // The deep wood in the north-west, the hazel grove in the north, heather on the eastern hills.
        { t: 'forest', blob: [5, 5, 2] },
        { t: 'forest', cells: [[14, 2], [18, 2], [15, 1], [17, 1]] },
        { t: 'rough', blob: [27, 17, 1] },
        { t: 'rough', cells: [[29, 6], [30, 7], [26, 3]] },
        { t: 'marsh', cells: [[10, 19], [22, 19], [11, 20]] },
      ],
      roads: [
        // The inner circuit round the knoll: town — hearth both ways.
        { via: ['sb1_town', [13, 13], 'sb1_hearth'] },
        { via: ['sb1_town', [19, 13], 'sb1_hearth'] },
        // The outer circuit: west ford — woodcutters — grove — booley — east ford.
        { via: ['sb1_town', [12, 15], 'sb1_west_ford', [6, 12], 'sb1_woodcutters'] },
        { via: ['sb1_woodcutters', [8, 3], [12, 3], 'sb1_ogham'] },
        { via: ['sb1_ogham', [21, 3], [26, 5], 'sb1_booley'] },
        { via: ['sb1_booley', [27, 11], 'sb1_east_ford', [20, 14], 'sb1_town'] },
        // The woodcutters' footbridge, the short way north from the hearth.
        { via: ['sb1_hearth', 'sb1_footbridge', 'sb1_ogham'] },
        // Spurs.
        { via: [[27, 11], 'sb1_store'] },
        { via: ['sb1_store', 'sb1_reaver_camp'] },
        { via: ['sb1_town', 'sb1_sawmill'] },
        { via: ['sb1_town', 'sb1_quarry'] },
        { via: [[8, 3], 'sb1_centaurs'] },
        { via: [[13, 13], 'sb1_well'] },
        { via: [[19, 13], 'sb1_green'] },
        { via: [[6, 12], 'sb1_den'] },
      ],
    },
    sites: [
      S.town('sb1_town', 'dun_caill', [16, 15], 'Dún Caill', 'Orla’s hillfort in the clearing inside the river horseshoe.', [16, 14]),
      S.resource('sb1_sawmill', [12, 18], 'sawmill'),
      S.resource('sb1_quarry', [20, 18], 'quarry'),
      S.activation(
        'sb1_hearth',
        [16, 10],
        'The Beltane Hearth',
        'Dún Caill’s communal hearth beyond the fairy knoll. Its fire is lit from the timber of the woodcutters, the fat of the herders and a word from the grove — none of which came this year.',
        {
          cost: { gold: 300, wood: 3 },
          reward: { questXp: 800, flags: ['sb1_hearth_lit'] },
          requirements: [
            { type: 'objective_completed', objectiveId: 'sb1_agreement' },
            { type: 'objective_completed', objectiveId: 'sb1_rescue' },
            { type: 'objective_completed', objectiveId: 'sb1_inscription' },
          ],
          completesMission: true,
          confirm: 'Light the Beltane fire on the communal hearth (300 Gold, 3 Wood)? This completes The Cold Hearth.',
        },
        null,
        { objectiveIds: ['sb1_hearth'] },
      ),
      S.crossing('sb1_west_ford', [9, 13], 'Ford of the Alders', 'The ford over the river’s west arm, toward the woodcutters. Boars, wild with the cold, wallow in it.', {
        label: 'Ford boars',
        army: fordBoars,
        reward: { resources: { gold: 300, wood: 3, stone: 3 } },
        battlefield: 'coast_road',
      }),
      S.crossing('sb1_east_ford', [23, 13], 'Herders’ Stepping-Stones', 'Stepping-stones over the river’s east arm, toward the booley. A picket of reavers squats on the far bank.', {
        label: 'Reaver picket',
        army: eastPickets,
        reward: { resources: { gold: 300 } },
        battlefield: 'coast_road',
      }),
      S.shortcut('sb1_footbridge', [16, 5], 'Hazel Footbridge', 'The woodcutters’ footbridge over the river’s northern bend, between the hearth and the grove. Its planks were taken up when the agreement lapsed.', ['sb1_agreement']),
      S.activation(
        'sb1_woodcutters',
        [4, 8],
        'Woodcutters’ Hall of Coill Iarthar',
        'The woodcutters of the western wood. They have cut the hearth-timber for Dún Caill for as long as anyone remembers — in exchange for stone for their kilns and a share of the summer.',
        { cost: { gold: 400, stone: 4 }, reward: { flags: ['sb1_agreement'], resources: { wood: 6 }, questXp: 300 }, confirm: 'Renew the timber agreement: pay Dún Caill’s share (400 Gold, 4 Stone)? The woodcutters send hearth-timber and lay their footbridge north of the hearth again.', label: 'relay' },
        null,
        { objectiveIds: ['sb1_agreement'], marker: 'pact' },
      ),
      S.landmark('sb1_booley', [28, 8], 'Herders’ Booley', 'The summer huts in the eastern hills. Reavers hold the herders there and eat their stores, “by right of the High King”.', 'refuge', {
        label: 'Booley reavers',
        army: booleyGuard,
        reward: { flags: ['sb1_rescued'], resources: { gold: 400, crystal: 1 }, questXp: 400 },
        battlefield: 'grove',
        required: true,
      }, { objectiveIds: ['sb1_rescue'], marker: 'evacuation' }),
      S.landmark('sb1_ogham', [16, 2], 'Ogham Stone of the Hazel Grove', 'The standing stone in the hazel grove, older than the hillfort, cut with the first verse of the silver branch. Reavers camp round it.', 'grove', {
        label: 'Grove reavers',
        army: oghamGuard,
        reward: { flags: ['sb1_inscription'], resources: { gold: 500 }, artifactIds: ['mistletoe_crown'], questXp: 500 },
        battlefield: 'beacon_clearing',
        required: true,
      }, { objectiveIds: ['sb1_inscription'], marker: 'evidence' }),
      S.choice(
        'sb1_green',
        [20, 11],
        'The Hill Green',
        'The green beside the hearth where Dún Caill holds its feasts.',
        'The first supplies',
        'The herders brought down what the reavers had not eaten: salt beef, butter, a cask of mead and the booley’s summer rents. Cathal wants it on the long tables — a feast for everyone who keeps the hearth. Sadb points at the outer road, rutted to the axles. “Feed them once,” she says, “or let the carts run all year.”',
        [
          { label: 'A public feast', summary: 'The booley’s stores feed Dún Caill tonight: 6 Cú Sith of the herders’ kin join Orla, and the folk remember it (local support in the next chapter).', reward: { flags: ['sb1_feast'], creatures: [{ creatureId: 'celtic_cu_sith', count: 6 }] }, requiresFlags: ['sb1_rescued'] },
          { label: 'Repair the outer road', summary: 'Costs 3 Wood and 3 Stone with the stores. +1,200 Gold of summer rents now, and the carts run (an economic bonus in the next chapter).', cost: { wood: 3, stone: 3 }, reward: { flags: ['sb1_road'], resources: { gold: 1200 } }, requiresFlags: ['sb1_rescued'] },
        ],
        { marker: 'supply', objectiveIds: ['sb1_supplies'] },
      ),
      S.choice(
        'sb1_well',
        [12, 9],
        'The Hawthorn Well',
        'A holy well under a lone hawthorn, its rags faded.',
        'The Hawthorn Well',
        'The well is choked with offerings — coins, pins, a silver brooch — left by people who wanted the summer back. In the hawthorn above it four hares watch you without blinking, the way no hare should.',
        [
          { label: 'Take the offerings', summary: '+600 Gold and +4 Wood.', reward: { resources: { gold: 600, wood: 4 } } },
          { label: 'Speak to the hares', summary: '4 Pooka join Orla’s war-band.', reward: { creatures: [{ creatureId: 'celtic_pooka', count: 4 }] } },
        ],
      ),
      S.depot('sb1_store', [29, 14], 'Drovers’ Store', 'Salt, meal and coin the drovers left at the eastern road. The full store is here only until the reavers come for it.', { resources: { gold: 300, wood: 2 } }),
      S.landmark('sb1_reaver_camp', [28, 19], 'Reavers’ Camp', 'The hollow in the south-eastern heather where the ridge reavers sleep. Take it and their band has nowhere to come back to.', 'refuge', {
        label: 'Reavers’ camp',
        army: reaverCampGuard,
        reward: { flags: ['sb1_road_safe'], resources: { gold: 500, wood: 2 } },
        battlefield: 'grove',
      }),
      S.camp('sb1_centaurs', [2, 3], 'Meadow beyond the Deep Wood', 'Centaurs graze the meadow outside the deep wood; they sell their spears to anyone who comes to them openly.', 'centaur', 2, 3),
      S.camp('sb1_den', [4, 16], 'Cú Sith Den', 'Great green hounds of the hills that will run with a druid.', 'celtic_cu_sith', 2, 4),
    ],
    patrols: [
      {
        commander: band('sb1_reaver_band', 'Ridge Reavers', REAVER_PORTRAIT),
        monster: true,
        bounty: { gold: 300 },
        start: [28, 17],
        waypoints: [[28, 15], [27, 11], [26, 6], [28, 15]],
        army: [['brigand', 6], ['brigand_cutthroat', 2]],
        home: 'sb1_reaver_camp',
        threshold: [3, 2],
        purpose: 'Rides the eastern road between the booley and the Drovers’ Store, which it has announced it will strip. Taking the Reavers’ Camp ends the raids for good.',
      },
    ],
    objectives: [
      O.primary(
        'sb1_cross',
        'Cross the river',
        `Open a way over the horseshoe: clear the boars from the Ford of the Alders (${armyText(fordBoars)}) toward the woodcutters, or the reaver picket from the stepping-stones (${armyText(eastPickets)}) toward the booley. The outer road joins both sides.`,
        C.any(C.cleared('sb1_west_ford'), C.cleared('sb1_east_ford')),
      ),
      O.primary('sb1_agreement', 'Renew the timber agreement', 'At the Woodcutters’ Hall of Coill Iarthar, beyond the Ford of the Alders, pay Dún Caill’s share (400 Gold, 4 Stone). The woodcutters send hearth-timber and lay their footbridge north of the hearth.', C.activated('sb1_woodcutters'), { markerSiteId: 'sb1_woodcutters' }),
      O.primary('sb1_rescue', 'Rescue the herders', `Drive the reavers (${armyText(booleyGuard)}) from the Herders’ Booley in the eastern hills and bring the herders home.`, C.cleared('sb1_booley'), { markerSiteId: 'sb1_booley' }),
      O.primary(
        'sb1_inscription',
        'Read the first branch inscription',
        `Reach the hazel grove north of the river — over the Ford of the Alders (${armyText(fordBoars)}), over the stepping-stones (${armyText(eastPickets)}), or over the footbridge once the woodcutters lay it — drive off the reavers round the ogham stone (${armyText(oghamGuard)}) and read it.`,
        C.cleared('sb1_ogham'),
        { markerSiteId: 'sb1_ogham' },
      ),
      O.primary('sb1_hearth', 'Light the communal hearth', 'With the timber agreed, the herders home and the inscription read, light the Beltane fire on the hearth beside Dún Caill (300 Gold, 3 Wood).', C.activated('sb1_hearth'), { markerSiteId: 'sb1_hearth', requires: ['sb1_agreement', 'sb1_rescue', 'sb1_inscription'], completesMission: true }),
      O.optional('sb1_supplies', 'The first supplies', 'At the Hill Green, decide what the herders’ recovered stores are for: a public feast or the outer road.', C.any(C.flag('sb1_feast'), C.flag('sb1_road')), { markerSiteId: 'sb1_green' }),
      O.optional('sb1_camp', 'End the raids', `Take the Reavers’ Camp (${armyText(reaverCampGuard)}) in the south-eastern heather: the band withdraws and the eastern road is safe.`, C.cleared('sb1_reaver_camp'), { markerSiteId: 'sb1_reaver_camp' }),
      O.optional('sb1_full_store', 'The drovers’ full store', 'Collect the Drovers’ Store before the reavers strip it: +500 Gold and +2 Stone more.', C.visited('sb1_store'), { markerSiteId: 'sb1_store', reward: { resources: { gold: 500, stone: 2 } } }),
      O.optional('sb1_well_visit', 'The hawthorn well', 'Visit the hawthorn well inside the horseshoe.', C.visited('sb1_well'), { markerSiteId: 'sb1_well' }),
    ],
    timers: [
      {
        id: 'sb1_raid',
        label: 'The reavers’ raid on the Drovers’ Store',
        startWhen: C.all(),
        days: 6,
        metWhen: C.any(C.visited('sb1_store'), C.cleared('sb1_reaver_camp')),
        consequence: 'The reavers strip the Drovers’ Store: it keeps only its base share (the 500 Gold and 2 Stone bonus is lost). Nothing else is touched.',
        announce: 'The ridge reavers have nailed a notice to the stepping-stones: the drovers’ store is “forfeit to the High King” in six days.',
        onExpire: { flags: ['sb1_store_raided'], failObjectives: ['sb1_full_store'] },
      },
    ],
    evidence: [
      { id: 'sb1_ev_inscription', flag: 'sb1_inscription', title: 'The first branch inscription', text: '“The fire is lent, not owned. Who takes the hearth owes the wood its due.” A neighbours’ promise on the ogham stone — it names no king.', icon: 'evidence' },
      { id: 'sb1_ev_agreement', flag: 'sb1_agreement', title: 'The timber agreement', text: 'Dún Caill paid its share of stone; the woodcutters cut the hearth-timber and laid their footbridge again.', icon: 'pact' },
      { id: 'sb1_ev_rescued', flag: 'sb1_rescued', title: 'The herders’ writ', text: 'The booley reavers carried a writ: the summer grazing “belongs to the High King”. There has been no High King since the winter came.', icon: 'evacuation' },
      { id: 'sb1_ev_feast', flag: 'sb1_feast', title: 'A public feast', text: 'The herders’ stores fed everyone who keeps the hearth. Dún Caill will remember it.', icon: 'supply' },
      { id: 'sb1_ev_road', flag: 'sb1_road', title: 'The outer road repaired', text: 'The herders’ stores paid for the outer road: the carts run all year.', icon: 'branch' },
    ],
    carried: ['sb1_inscription', 'sb1_rescued', 'sb1_feast', 'sb1_road'],
    briefing: [
      SADB('Beltane, and the cattle still in the byres. We built the fire on the old hearth twice and it would not take.'),
      ORLA('The hearth of Dún Caill was never ours alone. The woodcutters gave the timber, the herders the fat, the grove the first word — and none of them has come this year.'),
      CATHAL('Because reavers sit on the booley and boars hold the alder ford. A ruler would have cleared both by midsummer. Dún Caill needs one again.'),
      SADB('And did anyone ask the wood whether it wanted a ruler? Those agreements were made between neighbours. Somebody has started calling them the king’s.'),
      ORLA('Then we keep them ourselves: the woodcutters’ timber, the herders’ rescue, and the ogham in the hazel grove, which is older than any king. Then the hearth.'),
    ],
    victory: [
      ORLA('The fire caught at the first spark. Every hand that feeds it was at the hearth tonight.'),
      SADB('“The fire is lent, not owned.” Someone has been treating the old agreements as royal property — the booley, the timber, the fords.'),
      CATHAL('Then the next of them is at Dún Bera, where a boar ploughs the fields and the water-horses have stopped coming to the shore.'),
    ],
    scenes: [
      { id: 'sb1_ford', trigger: { type: 'site_cleared', siteId: 'sb1_west_ford' }, lines: [CATHAL('Someone threw grain into that ford every night. You do not keep boars by accident.'), ORLA('Then someone wanted the woodcutters cut off from the hearth.')] },
      { id: 'sb1_writ', trigger: { type: 'site_cleared', siteId: 'sb1_booley' }, lines: [SADB('The herders say the reavers came with a writ: the summer grazing “belongs to the High King”, and the booley’s rents with it.'), ORLA('There has been no High King since the winter came. Someone is collecting in an empty name.')] },
      { id: 'sb1_stone_battle', trigger: { type: 'battle_started', siteId: 'sb1_ogham' }, lines: [DUBHGHALL('Little druid. The summer is over. I have seen to it. Go home and sleep until spring — there will not be one.'), ORLA('I have never been good at sleeping.')] },
      {
        id: 'sb1_read',
        trigger: { type: 'site_cleared', siteId: 'sb1_ogham' },
        lines: [
          SADB('It is the first verse of the branch, Orla — the words the bards sing over the silver bough: “The fire is lent, not owned. Who takes the hearth owes the wood its due.”'),
          CATHAL('A king’s law, then.'),
          SADB('A neighbours’ promise, older than any king. It names no king at all. And their chief wore a mistletoe crown from the grove at Dún Bera.'),
        ],
      },
      { id: 'sb1_bridge', trigger: { type: 'flag', flag: 'sb1_agreement' }, lines: [ORLA('The woodcutters are laying their hazel footbridge north of the hearth again. The grove is half a morning away now.')] },
      { id: 'sb1_raided', trigger: { type: 'flag', flag: 'sb1_store_raided' }, lines: [CATHAL('The reavers stripped the drovers’ store before we got there. The drovers hid a little — not much.')] },
      { id: 'sb1_camp', trigger: { type: 'site_cleared', siteId: 'sb1_reaver_camp' }, lines: [CATHAL('Their camp is ash. The eastern road is safe for the carts.')] },
      { id: 'sb1_losses', trigger: { type: 'casualties', minLost: 4 }, lines: [SADB('We buried some of ours under the alders today, Orla.'), ORLA('I know. We will not leave more there than we have to.')] },
    ],
    loss: ['Orla must survive (defeat, retreat or surrender ends the chapter).', 'Losing Dún Caill is recoverable while Orla has a war-band.', 'A stripped store costs only its bonus; the obligations and the inscription cannot be lost.'],
    help: [
      { id: 'sb1_circuits', title: 'Two circuits', text: 'Inside the river horseshoe a short circuit runs round the fairy knoll between Dún Caill and the hearth. Outside it, the outer road joins the woodcutters, the hazel grove and the booley; the Ford of the Alders and the stepping-stones cross the river. The woodcutters’ footbridge north of the hearth reopens with the timber agreement.' },
      { id: 'sb1_reavers', title: 'The ridge reavers', text: 'One band rides the eastern road toward the Drovers’ Store on the day it announced (see the journal). Taking its camp in the south-eastern heather ends it for good.' },
      { id: 'shapeshift', title: 'Shapeshifting', text: 'The Celtic signature: creatures with Shapeshift change aspect at the start of their activation for free.' },
    ],
  });

  // =========================================================================
  // Chapter 2 — The Iron-Bristled Boar and the Water-Horse Bargain (card 28; legacy m02 + m03)
  // =========================================================================
  const v1m02 = camp.v1('silver_branch_m02');
  const ironBoar = v1m02.hostileHeroes[0]?.commander;
  if (!ironBoar) throw new Error('Silver Branch v2: the Iron-Bristled Boar is missing from the legacy content');
  const boarArmy: Army = [['tusked_boar', 6], ['wild_boar', 12]];
  const keeningGuard: Army = [['clay_golem', 5]];
  const hillBridgeGuard: Army = [['brigand', 16], ['brigand_cutthroat', 6]];
  const causewayGuard: Army = [['brigand_cutthroat', 12], ['tusked_boar', 4]];
  const weirGuard: Army = [['brigand', 8], ['brigand_cutthroat', 3]];
  const collectorsGuard: Army = [['brigand', 10], ['brigand_cutthroat', 4]];
  const bedGuard: Army = [['tusked_boar', 4], ['wild_boar', 6]];
  // The old water route: the dry channel bed from the loch to the south (the causeway cell stays dry).
  const channel: readonly (readonly [number, number])[] = [[15, 15], [15, 16], [15, 17], [15, 18], [15, 20]];
  const m2 = chapter({
    campaign: camp,
    chapter: 2,
    card: 28,
    name: 'The Iron-Bristled Boar and the Water-Horse Bargain',
    summary:
      'Dún Bera’s farms stand in the old water route of Loch Eala: a boar with iron bristles ploughs them up, the kelpies want their road back, and the one witness who remembers the old agreement is bound on Keening Hill. Free the witness, end the boar’s raids, settle the water dispute and cut the agreement into the ogham stone of the ford.',
    playtime: '65–85 minutes, 4–5 battles',
    legacy: ['silver_branch_m02', 'silver_branch_m03'],
    economyFrom: 'silver_branch_m02',
    principal: 'sb2_witness',
    soundscape: 'glen',
    hostileName: 'The Withered King’s Host',
    town: { siteId: 'sb2_town', townId: 'dun_bera', name: 'Dún Bera' },
    map: {
      cols: 34,
      rows: 22,
      biome: 'moor',
      base: 'plains',
      seed: 960002,
      texture: { forest: 60, rough: 50 },
      paint: [
        // Loch Eala in the middle, and its outflow river running west to the hills.
        { t: 'water', blob: [15, 9, 5] },
        { t: 'water', disc: [15, 9, 3] },
        { t: 'water', cells: [[14, 14], [15, 14], [16, 14]] },
        { t: 'water', line: [[10, 9], [6, 10], [1, 11]], width: 0 },
        // The old water route: a dry channel bed from the loch to the southern bog (farmed now).
        { t: 'marsh', cells: channel },
        { t: 'marsh', cells: [[15, 19]] },
        // Keening Hill in the north-west.
        { t: 'rough', blob: [4, 4, 2] },
        { t: 'mountain', cells: [[2, 2], [7, 2], [1, 5]] },
        // The farmers' dike between Dún Bera's plain and the south-eastern fields.
        { t: 'mountain', line: [[19, 11], [20, 13], [21, 15], [22, 16], [23, 18]], width: 0 },
        // A reedy pool off the loch's eastern shore.
        { t: 'water', disc: [24, 7, 1] },
        // Fields and bog in the south.
        { t: 'marsh', cells: [[11, 20], [12, 20], [18, 20], [19, 20], [6, 19]] },
        { t: 'forest', blob: [30, 18, 1] },
      ],
      roads: [
        // The north shore road: Dún Bera — Keening Hill.
        { via: ['sb2_town', [25, 4], [17, 2], [10, 3], [6, 6], 'sb2_keening'] },
        // The hill bridge over the outflow river.
        { via: [[6, 6], 'sb2_hill_bridge', [6, 14]] },
        // The south shore road: the farm ford over the dry channel, round the dike's end to Dún Bera.
        { via: [[6, 14], [11, 16], [14, 16], [17, 17], [20, 18], [24, 20], [28, 15], 'sb2_town'] },
        // The marsh causeway: the long shore path that stays when the channel runs.
        { via: [[11, 16], [12, 19], 'sb2_causeway', [18, 19], [20, 18]] },
        // The farmers' dike gate.
        { via: [[24, 12], 'sb2_dike_gate', [20, 18]] },
        { via: ['sb2_town', [24, 12]] },
        // Spurs.
        { via: [[14, 16], 'sb2_moot'] },
        { via: [[17, 17], 'sb2_weir'] },
        { via: [[17, 17], 'sb2_ogham'] },
        { via: [[20, 18], 'sb2_east_field'] },
        { via: [[11, 16], 'sb2_west_field'] },
        { via: [[6, 14], 'sb2_bed'] },
        { via: [[12, 19], 'sb2_stones'] },
        { via: [[18, 19], 'sb2_collectors_house'] },
        { via: [[24, 12], 'sb2_keeper'] },
        { via: [[24, 12], 'sb2_lookout'] },
        { via: [[17, 17], 'sb2_kelpie_slip'] },
        { via: [[10, 3], 'sb2_hill_slip'] },
        { via: [[25, 4], 'sb2_afanc'] },
        { via: [[17, 2], 'sb2_weaver'] },
        { via: ['sb2_town', 'sb2_sawmill'] },
        { via: ['sb2_town', 'sb2_quarry'] },
        { via: ['sb2_town', 'sb2_hounds'] },
        { via: [[6, 14], 'sb2_crystal'] },
        { via: [[6, 6], 'sb2_hoard'] },
      ],
    },
    sites: [
      S.town('sb2_town', 'dun_bera', [29, 10], 'Dún Bera', 'A farming fort on the eastern plain above Loch Eala.', [28, 10]),
      S.resource('sb2_sawmill', [31, 5], 'sawmill'),
      S.resource('sb2_quarry', [27, 17], 'quarry'),
      S.resource('sb2_crystal', [3, 16], 'crystal_deposit'),
      // The witness.
      S.landmark('sb2_keening', [4, 4], 'Keening Hill', 'The banshees’ hill above the outflow river. Cairn-men — stones that walk — stand round the one who remembers the old agreement, and she has gone silent.', 'nest', {
        label: 'Cairn-men',
        army: keeningGuard,
        reward: { flags: ['sb2_witness'], resources: { favor: 5 }, artifactIds: ['torc_of_the_high_king'], questXp: 600 },
        battlefield: 'ridge_pass',
        required: true,
      }, { objectiveIds: ['sb2_witness'], marker: 'evidence' }),
      // The circuit's crossings.
      S.crossing('sb2_hill_bridge', [4, 10], 'Hill Bridge', 'The stone bridge where the hill road crosses the outflow river under Keening Hill, held by reavers.', {
        label: 'Hill reavers',
        army: hillBridgeGuard,
        reward: { resources: { gold: 750, favor: 5 } },
        battlefield: 'ridge_pass',
      }),
      S.crossing('sb2_causeway', [15, 19], 'Marsh Causeway', 'The raised causeway over the southern end of the old channel — the long shore path, dry whatever the water does. Reavers and their boars hold it.', {
        label: 'Causeway reavers',
        army: causewayGuard,
        reward: { resources: { gold: 800 } },
        battlefield: 'ridge_pass',
      }),
      S.shortcut('sb2_dike_gate', [22, 16], 'Farmers’ Dike Gate', 'A gate in the dike between Dún Bera’s plain and the south-eastern fields, barred since the boar came. The farmers open it again once the boar is down.', ['sb2_boar_down']),
      // The water route.
      S.choice(
        'sb2_moot',
        [13, 15],
        'The Boundary Moot',
        'The mound at the head of the old channel where farmers, the keeper of the loch and the boundary collectors argue every quarter-day.',
        'The water dispute',
        'The farmers hold up their deeds; the keeper of the loch holds up nothing and says the water was here first. With the banshee’s testimony both are right by half: the channel was water in the dark half of the year and fields in the bright half, until both sides forgot the other half. Somebody has to pay for the forgetting. Move the farms to the high ground and compensate their owners, and the kelpies have their whole road back; or dig a separate lined channel beside the fields, and both keep what they have — at a price in timber and stone.',
        [
          { label: 'Move the farms and compensate the owners', summary: 'Costs 2,000 Gold. The collectors at the weir and at their house stand down; the old channel is free for the water. The kelpies will remember it (later support from the loch).', cost: { gold: 2000 }, reward: { flags: ['sb2_settled', 'sb2_farms_moved'], questXp: 400 }, requiresFlags: ['sb2_witness'], clearsSiteIds: ['sb2_weir', 'sb2_collectors_house'] },
          { label: 'Build a separate water channel', summary: 'Costs 600 Gold, 8 Wood and 8 Stone. The collectors stand down; the farms stay beside a new lined channel. Dún Bera’s farmers will remember it (later support from the harvest).', cost: { gold: 600, wood: 8, stone: 8 }, reward: { flags: ['sb2_settled', 'sb2_channel'], questXp: 400 }, requiresFlags: ['sb2_witness'], clearsSiteIds: ['sb2_weir', 'sb2_collectors_house'] },
        ],
        { marker: 'pact', objectiveIds: ['sb2_settle'] },
      ),
      S.sluice('sb2_weir', [16, 15], 'Old Weir of Loch Eala', 'The weir at the head of the old channel, shut for a generation. The boundary collectors guard it for the farms’ owners.', {
        channel,
        open: 'water',
        closed: 'marsh',
        startsOpen: false,
        openText: 'Open the old weir: the water route runs again down the old channel. The farm ford across the channel floods and closes; the marsh causeway stays dry, and the kelpies’ boat landing on the loch opens.',
        closeText: 'Shut the weir: the channel drains to marsh again (the farm ford reopens) and the kelpies’ boat stops running.',
        openFlag: 'sb2_water_route',
      }, { guard: { label: 'Boundary collectors at the weir', army: weirGuard.map(([creatureId, count]) => ({ creatureId, count })), reward: { resources: { gold: 300 } }, battlefield: 'coast_road' }, marker: 'supply' }),
      S.ferry('sb2_kelpie_slip', [18, 14], 'Kelpies’ Landing', 'A stone slip on the loch’s south-eastern shore where the water-horses come for travellers who keep the bargain.', 'sb2_hill_slip', { flag: 'sb2_water_route', reason: 'The kelpies carry no one until the water route runs again: open the old weir.' }),
      S.ferry('sb2_hill_slip', [10, 6], 'Keening Shore Landing', 'The landing below Keening Hill on the loch’s north-western shore.', 'sb2_kelpie_slip', { flag: 'sb2_water_route', reason: 'The kelpies carry no one until the water route runs again: open the old weir.' }),
      S.choice(
        'sb2_keeper',
        [22, 11],
        'The Keeper of the Loch',
        'An old woman on the eastern shore, combing a horse’s mane that is not there.',
        'The water-horse bargain',
        '“Reopen the water route,” the keeper says, combing, “and the horses will carry anyone who keeps the bargain across Loch Eala, quick as a thought.” She does not say what the farmers lose. When Orla asks who closed the weir, she combs a little faster. “A grey king, for a ring. My own son sold it him.”',
        [
          { label: 'Accept the bargain', summary: 'The kelpies will carry Orla across the loch once the weir is open. Remembered as the kelpie pact.', reward: { flags: ['sb2_kelpie_pact'], questXp: 300 } },
          { label: 'Accept, and name the other half', summary: 'Only with the banshee’s testimony: Orla reminds her the route was the farmers’ fields in the bright half. The keeper laughs and agrees to both halves (+5 Favor). Remembered as the kelpie pact.', reward: { flags: ['sb2_kelpie_pact', 'sb2_both_halves'], resources: { favor: 5 }, questXp: 500 }, requiresFlags: ['sb2_witness'] },
        ],
        { marker: 'pact' },
      ),
      S.activation(
        'sb2_ogham',
        [17, 16],
        'Ogham Stone of the Ford',
        'The standing stone by the old weir that carries the summer’s name — and, cut below it, room for an agreement.',
        {
          cost: { gold: 400, crystal: 1 },
          reward: { questXp: 1200, flags: ['sb2_agreement'] },
          requirements: [
            { type: 'objective_completed', objectiveId: 'sb2_witness' },
            { type: 'objective_completed', objectiveId: 'sb2_boar' },
            { type: 'objective_completed', objectiveId: 'sb2_route' },
          ],
          completesMission: true,
          confirm: 'Cut the water agreement into the ogham stone of the ford (400 Gold, 1 Crystal)? This completes the chapter.',
        },
        null,
        { objectiveIds: ['sb2_agreement'], marker: 'evidence' },
      ),
      // The boar's country.
      S.watchtower('sb2_lookout', [25, 14], 'Hill of the Watchers', 'From the top, the fields on both banks of the old channel lie open — and the boar’s bed beyond them.', ['sb2_west_field', 'sb2_east_field', 'sb2_bed']),
      S.depot('sb2_west_field', [9, 17], 'West Field Stores', 'Sheaves stacked in the fields west of the old channel. The full harvest is here until the boar’s raid on the west fields.', { resources: { gold: 300, wood: 2 } }, { markerHiddenUntilRevealed: true }),
      S.depot('sb2_east_field', [20, 19], 'East Field Stores', 'Sheaves stacked in the fields between the channel and the dike. The full harvest is here until the boar’s raid on the east fields.', { resources: { gold: 300, stone: 2 } }, { markerHiddenUntilRevealed: true }),
      S.landmark('sb2_bed', [3, 19], 'Boar’s Bed', 'A hollow under an oak in the south-west, where a shield lies half-buried.', 'nest', { label: 'Bed boars', army: bedGuard, reward: { resources: { gold: 500 }, artifactIds: ['fianna_targe'] }, battlefield: 'grove' }, { markerHiddenUntilRevealed: true }),
      S.pickup('sb2_stones', [12, 18], 'The Old Boundary Stones', 'A line of boundary stones across the channel bed, each cut with a half-moon.', { flags: ['sb2_stones_read'], resources: { gold: 200 } }, { marker: 'evidence' }),
      S.landmark('sb2_collectors_house', [19, 20], 'Collectors’ House', 'Where the boundary collectors keep their tallies and their wages.', 'refuge', { label: 'Collectors’ house', army: collectorsGuard, reward: { resources: { gold: 600 } }, battlefield: 'grove' }),
      // Optional places.
      S.neutral('sb2_afanc', [25, 5], 'Afanc Pool', 'A reedy pool off the loch’s eastern shore where afancs wallow; they will not leave the reeds while the water dispute festers.', 'afanc', 5, { flag: 'sb2_settled', reason: 'The afancs stay in the reeds until the water dispute is settled at the Boundary Moot.' }),
      S.choice(
        'sb2_weaver',
        [18, 1],
        'A Feather-cloak Weaver',
        'An old woman weaving a cloak of raven feathers above the north shore.',
        'The Feather-cloak Weaver',
        '“The ravens bring me their feathers,” the old woman says, “because I tell them the news.” She holds up a finished cloak, black and shining. “It makes the road shorter. Or sit with me, and I will tell you what the ravens told me about that boar.”',
        [
          { label: 'Buy the raven cloak', summary: 'Pay 2,000 Gold for the Raven-feather Cloak.', cost: { gold: 2000 }, reward: { artifactIds: ['raven_feather_cloak'] } },
          { label: 'Sit and listen', summary: 'Orla gains +1 Knowledge.', reward: { attributes: { knowledge: 1 } } },
        ],
      ),
      S.camp('sb2_hounds', [31, 14], 'Hound Hollow', 'Cú sith that have not fled the boar.', 'celtic_cu_sith', 2, 4),
      S.pickup('sb2_hoard', [1, 8], 'Bards’ Hoard', 'A bard’s chest hidden in a rock cleft under Keening Hill.', { resources: { gold: 700, wood: 5 }, artifactIds: ['ogham_staves'] }),
    ],
    patrols: [
      {
        commander: ironBoar,
        monster: true,
        bounty: { gold: 800 },
        start: [12, 17],
        waypoints: [[9, 17], [13, 19], [19, 18], [21, 19], [13, 19]],
        army: boarArmy,
        radius: 8,
        threshold: [3, 2],
        purpose: 'Ploughs the fields on both banks of the old channel and raids them on the declared days. It charges only a war-band it is sure to beat.',
      },
      {
        commander: band('sb2_collectors', 'Boundary Collectors', REAVER_PORTRAIT),
        monster: true,
        bounty: { gold: 300 },
        start: [18, 19],
        waypoints: [[13, 19], [11, 17], [18, 19]],
        army: [['brigand', 8], ['brigand_cutthroat', 2]],
        home: 'sb2_collectors_house',
        radius: 5,
        threshold: [3, 2],
        purpose: 'Walks the old boundary stones collecting the disputed rents. Taking the Collectors’ House — or settling the dispute at the moot — ends it.',
      },
    ],
    objectives: [
      O.primary('sb2_witness', 'Free the bound witness', `Break the cairn-men (${armyText(keeningGuard)}) round the banshee on Keening Hill — by the north shore road, or round the south by the hill bridge (${armyText(hillBridgeGuard)}) — and hear what she remembers.`, C.cleared('sb2_keening'), { markerSiteId: 'sb2_keening' }),
      O.primary('sb2_boar', 'End the boar raids', `Find the Iron-Bristled Boar and its herd (${armyText(boarArmy)}) in the fields on either bank of the old channel and break it. The Hill of the Watchers shows its fields.`, C.defeated('celtic_iron_boar'), { reward: { flags: ['sb2_boar_down'] }, hint: 'The boar moves between the fields; it only charges a war-band it is sure to beat.' }),
      O.primary('sb2_settle', 'Settle the water dispute', 'At the Boundary Moot at the head of the old channel, with the banshee’s testimony: move the farms and compensate their owners, or build a separate water channel.', C.any(C.flag('sb2_farms_moved'), C.flag('sb2_channel')), { markerSiteId: 'sb2_moot', requires: ['sb2_witness'] }),
      O.primary('sb2_route', 'Reopen the water route', `Open the Old Weir of Loch Eala (its collectors, ${armyText(weirGuard)}, stand down once the dispute is settled). The farm ford floods; the marsh causeway stays; the kelpies’ boat landing opens.`, C.flag('sb2_water_route'), { markerSiteId: 'sb2_weir', requires: ['sb2_settle'] }),
      O.primary('sb2_agreement', 'Cut the agreement', 'With the witness free, the boar’s raids ended and the water running, cut the agreement into the Ogham Stone of the Ford (400 Gold, 1 Crystal).', C.activated('sb2_ogham'), { markerSiteId: 'sb2_ogham', requires: ['sb2_witness', 'sb2_boar', 'sb2_route'], completesMission: true }),
      O.optional('sb2_west', 'Defend the west fields', 'Bring in the West Field Stores before the boar’s raid on the west fields: +500 Gold and +2 Wood more.', C.visited('sb2_west_field'), { markerSiteId: 'sb2_west_field', reward: { resources: { gold: 500, wood: 2 } } }),
      O.optional('sb2_east', 'Defend the east fields', 'Bring in the East Field Stores before the boar’s raid on the east fields: +500 Gold and +2 Stone more.', C.visited('sb2_east_field'), { markerSiteId: 'sb2_east_field', reward: { resources: { gold: 500, stone: 2 } } }),
      O.optional('sb2_kelpies', 'The water-horse bargain', 'Hear the keeper of the loch on the eastern shore.', C.flag('sb2_kelpie_pact'), { markerSiteId: 'sb2_keeper' }),
      O.optional('sb2_boundary', 'The old boundary stones', 'Read the boundary stones in the channel bed.', C.flag('sb2_stones_read'), { markerSiteId: 'sb2_stones' }),
      O.optional('sb2_collect', 'The boundary collectors', `Take the Collectors’ House (${armyText(collectorsGuard)}) or settle the dispute: the collectors stop walking the stones.`, C.cleared('sb2_collectors_house'), { markerSiteId: 'sb2_collectors_house' }),
      O.optional('sb2_bed_visit', 'The boar’s bed', `Drive the boars (${armyText(bedGuard)}) from the hollow under the oak.`, C.cleared('sb2_bed'), { markerSiteId: 'sb2_bed' }),
    ],
    timers: [
      { id: 'sb2_raid_west', label: 'The boar’s raid on the west fields', startWhen: C.all(), days: 6, metWhen: C.any(C.visited('sb2_west_field'), C.defeated('celtic_iron_boar')), consequence: 'The west fields are ploughed under: their stores keep only the base share (the 500 Gold and 2 Wood bonus is lost). The chapter continues.', announce: 'Dún Bera’s herders have seen the boar’s handlers driving it toward the west fields.', onExpire: { flags: ['sb2_west_ploughed'], failObjectives: ['sb2_west'] } },
      { id: 'sb2_raid_east', label: 'The boar’s raid on the east fields', startWhen: C.all(), days: 10, metWhen: C.any(C.visited('sb2_east_field'), C.defeated('celtic_iron_boar')), consequence: 'The east fields are ploughed under: their stores keep only the base share (the 500 Gold and 2 Stone bonus is lost). The chapter continues.', announce: 'After the west fields, the handlers mean to drive the boar east of the channel.', onExpire: { flags: ['sb2_east_ploughed'], failObjectives: ['sb2_east'] } },
    ],
    evidence: [
      { id: 'sb2_ev_witness', flag: 'sb2_witness', title: 'The banshee’s testimony', text: 'The old agreement shared the channel: water in the dark half of the year, fields in the bright half. The farmers forgot one half, the kelpies the other.', icon: 'evidence' },
      { id: 'sb2_ev_stones', flag: 'sb2_stones_read', title: 'The half-moon stones', text: 'Every boundary stone in the channel bed is cut with the same half-moon: one half for the field, one for the water.', icon: 'evidence' },
      { id: 'sb2_ev_pact', flag: 'sb2_kelpie_pact', title: 'The kelpie pact', text: 'The water-horses carry Orla across Loch Eala while the water route runs.', icon: 'pact' },
      { id: 'sb2_ev_moved', flag: 'sb2_farms_moved', title: 'The farms moved', text: 'The farms moved to the high ground and their owners were paid; the kelpies have their whole road back.', icon: 'branch' },
      { id: 'sb2_ev_channel', flag: 'sb2_channel', title: 'A separate channel', text: 'A lined channel runs beside the fields: the farms and the water route both stay.', icon: 'branch' },
      { id: 'sb2_ev_boar', flag: 'sb2_boar_down', title: 'The boar is broken', text: 'The Iron-Bristled Boar lies in the furrows; its herd ran for the woods.', icon: 'evidence' },
    ],
    carried: ['sb2_witness', 'sb2_kelpie_pact', 'sb2_farms_moved', 'sb2_channel', 'sb2_boar_down'],
    entryBonuses: [
      { fact: 'sb1_feast', label: 'Dún Caill’s herders after the feast: 8 Cú Sith in Dún Bera', garrison: [{ creatureId: 'celtic_cu_sith', count: 8 }] },
      { fact: 'sb1_road', label: 'The repaired outer road: Dún Caill’s summer rents (1,500 Gold, 5 Wood)', wallet: { gold: 1500, wood: 5 } },
    ],
    briefing: [
      CATHAL('Dún Bera’s fields are ploughed up — not by ploughs. A boar the size of a bull, bristles like nails, and a herd behind it.'),
      SADB('And every one of those fields stands in the old water route of Loch Eala. The kelpies say the farmers stole their road; the farmers say the kelpies want to drown their barley. Neither of them will say more than that.'),
      ORLA('Then we need someone who remembers before either of them. The banshees on Keening Hill have gone silent — a silent banshee is a witness someone has bound. Her first, then the boar, then the water.'),
    ],
    briefingVariants: [
      { ifFlags: ['fact:sb1_feast'], lines: [SADB('Dún Caill’s herders walked here behind us after the feast. Eight of their hounds are on Dún Bera’s walls.')] },
      { ifFlags: ['fact:sb1_road'], lines: [CATHAL('The outer road carried Dún Caill’s summer rents ahead of us. The treasury is fuller than it was.')] },
      { ifFlags: ['fact:sb1_inscription'], lines: [ORLA('The ogham in the hazel grove said the fire is lent, not owned. I want to know what the water was promised.')] },
    ],
    victory: [
      ORLA('The water runs in the old route, the fields have their own, and nobody had to drown or starve to be right.'),
      SADB('The banshee’s agreement was older than both their claims. The kings who should have kept it let both sides forget their halves.'),
      CATHAL('Two roads lead on from here: west to the sea, where the sea-folk keep a hall of the kings’ old promises — and east to the High Seat, where Fiachra calls himself king. Either can come first.'),
    ],
    scenes: [
      { id: 'sb2_lookout', trigger: { type: 'site_visited', siteId: 'sb2_lookout' }, lines: [ORLA('There — the fields are ploughed in rings on both banks of the old channel. The boar is not grazing. It is being driven.'), CATHAL('Then it has a master.')] },
      { id: 'sb2_keening', trigger: { type: 'site_cleared', siteId: 'sb2_keening' }, lines: [SADB('She is keening again — and she remembers. The channel was water in the dark half of the year and fields in the bright half. The farmers forgot one half, the kelpies the other.'), ORLA('Neither side lied, then. Each told the half it liked.')] },
      { id: 'sb2_boar_battle', trigger: { type: 'battle_started', heroDefinitionId: 'celtic_iron_boar' }, lines: [DUBHGHALL('Gore her, iron-back. Plough her under with the summer.')] },
      { id: 'sb2_boar_down', trigger: { type: 'objective_completed', objectiveId: 'sb2_boar' }, lines: [SADB('The boar is down. The herd is running for the woods — and the farmers are unbarring their dike gate.'), ORLA('Let the herd run. A boar without a master is only a boar.')] },
      { id: 'sb2_moved', trigger: { type: 'flag', flag: 'sb2_farms_moved' }, lines: [CATHAL('The owners took the silver and the high ground. They grumbled, and they took it.'), SADB('The keeper is singing on the shore. I have never heard a kelpie song before.')] },
      { id: 'sb2_channel', trigger: { type: 'flag', flag: 'sb2_channel' }, lines: [CATHAL('Timber and stone for a channel beside the fields. Dear — but the farmers are cheering.'), SADB('And the keeper says a lined channel is still a road. She will take it.')] },
      { id: 'sb2_open', trigger: { type: 'flag', flag: 'sb2_water_route' }, lines: [ORLA('The weir is open. The farm ford is under water — and on the loch the kelpies are bringing their boat to the landing.')] },
      { id: 'sb2_stones', trigger: { type: 'site_visited', siteId: 'sb2_stones' }, lines: [SADB('Every stone has the same half-moon cut in it: one half for the field, one for the water. The agreement was here all along, under the barley.')] },
      { id: 'sb2_keeper_half', trigger: { type: 'flag', flag: 'sb2_both_halves' }, lines: [SADB('She laughed when Orla named the bright half. “So the dead still talk on Keening Hill,” she said. Then she agreed to it.')] },
      { id: 'sb2_west_ploughed', trigger: { type: 'flag', flag: 'sb2_west_ploughed' }, lines: [CATHAL('The boar went through the west fields last night. The sheaves already stacked are still there; the rest is mud.')] },
      { id: 'sb2_east_ploughed', trigger: { type: 'flag', flag: 'sb2_east_ploughed' }, lines: [CATHAL('The east fields too. That was the last raid its handlers declared.')] },
    ],
    loss: ['Orla must survive.', 'Losing Dún Bera is recoverable while Orla has a war-band.', 'A ploughed field costs only its harvest bonus; the lake’s creatures need not be fought.'],
    help: [
      { id: 'sb2_circuit', title: 'Round Loch Eala', text: 'The north shore road runs from Dún Bera to Keening Hill; the hill bridge crosses the outflow river under the hill; the south shore road crosses the old channel by the farm ford, or further south by the marsh causeway. Opening the old weir floods the farm ford, keeps the causeway and opens the kelpies’ boat landing across the loch. The farmers’ dike gate opens once the boar is down.' },
      { id: 'sb2_boar_help', title: 'The boar', text: 'The boar moves between the fields on both banks and raids them on the declared days (see the journal). Climb the Hill of the Watchers to see its fields; it only charges a war-band it is sure to beat.' },
    ],
  });

  // =========================================================================
  // Chapter 3 — The Hall Beneath the Waves (card 29; legacy m04)
  // =========================================================================
  const v1m04 = camp.v1('silver_branch_m04');
  const corc = v1m04.hostileHeroes[0]?.commander;
  if (!corc) throw new Error('Silver Branch v2: Corc’s profile is missing from the legacy content');
  const corcLanding: Army = [['celtic_elder_pooka', 16], ['celtic_great_cu_sith', 6], ['brigand', 12]];
  const southLanding: Army = [['brigand', 24], ['brigand_cutthroat', 10]];
  const hallGuard: Army = [['celtic_selkie', 4], ['celtic_storm_selkie', 2]];
  const vaultGuard: Army = [['clay_golem', 8]];
  const storeGuard: Army = [['brigand', 12], ['brigand_cutthroat', 4]];
  const longship: Army = [['brigand', 10], ['brigand_cutthroat', 4]];
  const m3 = chapter({
    campaign: camp,
    chapter: 3,
    card: 29,
    name: 'The Hall Beneath the Waves',
    summary:
      'Every ruler of the coast once set down their promises in the sea-folk’s hall — and many broke them. Corc’s grey raiders hold the way. Cross from Inis Rón with a fixed war-band, land at the drowned hall, recover two of its three charters and bring them home safely.',
    playtime: '60–80 minutes, 3–4 battles',
    legacy: ['silver_branch_m04'],
    economyFrom: 'silver_branch_m04',
    principal: 'sb3_charters',
    soundscape: 'coast',
    hostileName: 'Corc’s Grey Raiders',
    town: { siteId: 'sb3_town', townId: 'inis_ron', name: 'Inis Rón' },
    // An expedition: Inis Rón lends its harbour and stores — no dwellings, nothing to build.
    player: {
      army: [['celtic_elder_pooka', 36], ['celtic_great_cu_sith', 12], ['celtic_kelpie', 4], ['celtic_battle_banshee', 3]],
      buildings: ['celtic_civic_hall_l1', 'celtic_tavern_l1', 'celtic_marketplace_l1'],
      population: {},
    },
    purchasable: [],
    map: {
      cols: 34,
      rows: 22,
      biome: 'coast',
      base: 'plains',
      seed: 960003,
      texture: { forest: 30, rough: 60 },
      paint: [
        // The open sea in the west and the bay between the two headlands.
        { t: 'water', rect: [1, 1, 4, 20] },
        { t: 'water', rect: [5, 8, 24, 14] },
        // The drowned hall's reef island at the bay mouth; a reef cell to each headland (the landings).
        { t: 'plains', disc: [7, 11, 2] },
        { t: 'marsh', cells: [[7, 8], [7, 14]] },
        // The Kings' Road: a drowned causeway from the hall's sea-door to Inis Rón, walkable at low water.
        { t: 'marsh', line: [[10, 11], [24, 11]], width: 0 },
        // Headland country: heather, a freshwater lagoon inland, an outer inlet on the south headland.
        { t: 'rough', blob: [13, 3, 2] },
        { t: 'rough', blob: [13, 18, 2] },
        { t: 'water', disc: [31, 3, 1] },
        { t: 'water', cells: [[5, 20], [6, 20], [5, 19]] },
        { t: 'forest', cells: [[22, 2], [23, 3], [21, 19], [22, 20], [30, 16], [31, 17]] },
      ],
      roads: [
        // The long inland road between the headlands, behind the harbour.
        { via: ['sb3_corc_mooring', [14, 5], [22, 4], [28, 5], [31, 9], [31, 13], [28, 17], [22, 18], [14, 17], 'sb3_inlet'] },
        { via: ['sb3_town', [29, 11], [31, 11]] },
        // The reefs from the headland tips to the landings, and across the island.
        { via: ['sb3_corc_mooring', 'sb3_north_landing'] },
        { via: [[14, 17], [8, 16], 'sb3_south_landing'] },
        { via: ['sb3_north_landing', 'sb3_fords_vault'] },
        { via: ['sb3_south_landing', 'sb3_seal_chamber'] },
        // The Kings' Road from the sea-door to the harbour.
        { via: ['sb3_seadoor', [24, 11], 'sb3_town'] },
        // Ferry quays and slips.
        { via: ['sb3_town', 'sb3_quay_n'] },
        { via: ['sb3_town', 'sb3_quay_s'] },
        { via: [[14, 5], 'sb3_slip_n'] },
        { via: [[14, 17], 'sb3_slip_s'] },
        // Spurs.
        { via: [[22, 4], 'sb3_store_n'] },
        { via: [[22, 18], 'sb3_store_s'] },
        { via: [[22, 4], 'sb3_cache_n'] },
        { via: [[22, 18], 'sb3_cache_s'] },
        { via: ['sb3_town', 'sb3_moot'] },
        { via: [[28, 5], 'sb3_afanc'] },
        { via: [[28, 17], 'sb3_bard'] },
        { via: [[28, 17], 'sb3_ogres'] },
        { via: [[14, 17], 'sb3_longboat'] },
        { via: [[14, 5], 'sb3_wreck'] },
      ],
    },
    sites: [
      S.town('sb3_town', 'inis_ron', [27, 11], 'Inis Rón', 'A seal-island fort at the head of the bay — the expedition’s friendly harbour.', [26, 11]),
      // The drowned hall and its charters.
      S.landmark('sb3_hall', [6, 11], 'Hall Beneath the Waves', 'The sea-folk’s hall on the reef, where every ruler of the coast set down a promise. Its doors are kept by selkies who no longer remember their own skins.', 'refuge', {
        label: 'Hall selkies',
        army: hallGuard,
        reward: { flags: ['sb3_ch_kings'], resources: { gold: 1000 }, artifactIds: ['cauldron_of_plenty'], questXp: 1200 },
        battlefield: 'coast_road',
        required: true,
      }, { objectiveIds: ['sb3_charters'], marker: 'evidence' }),
      S.landmark('sb3_fords_vault', [7, 9], 'Tidewrack Vault', 'A drowned chamber behind the north landing, where the charter of the fords lies under the wrack. Barnacled cairn-men stand in the water.', 'quarry_cache', {
        label: 'Barnacled cairn-men',
        army: vaultGuard,
        reward: { flags: ['sb3_ch_fords'], resources: { gold: 600, crystal: 2 } },
        battlefield: 'coast_road',
      }, { marker: 'evidence' }),
      S.choice(
        'sb3_seal_chamber',
        [7, 13],
        'Seal-folk’s Chamber',
        'A chamber behind the south landing where the seal-folk keep the charter of the hearths.',
        'The charter of the hearths',
        'The seal-folk sit along the walls in their human shapes, very still. “The hearth charter is ours to keep,” their eldest says. “Corc’s men took our skins and sold them on the coast. Bring the skins back and we will give you the charter; or pay what the coast paid Corc for them.”',
        [
          { label: 'Return the sealskins', summary: 'Only with the skins from Corc’s south storehouse. The seal-folk give up the charter of the hearths.', reward: { flags: ['sb3_ch_hearths'], questXp: 600 }, requiresFlags: ['sb3_sealskins'] },
          { label: 'Pay the seal-folk’s price', summary: 'Costs 1,500 Gold. The seal-folk give up the charter of the hearths.', cost: { gold: 1500 }, reward: { flags: ['sb3_ch_hearths'] } },
        ],
        { marker: 'evidence' },
      ),
      // The two landings.
      S.crossing('sb3_north_landing', [7, 8], 'North Landing', 'The richest landing of the drowned hall, on the reef below the north headland. Corc’s fleet holds it.', {
        label: 'Corc and his grey raiders',
        army: corcLanding,
        commander: corc,
        reward: { flags: ['sb3_landing_open', 'sb3_corc_beaten'], resources: { gold: 1200 }, questXp: 800 },
        battlefield: 'coast_road',
      }),
      S.crossing('sb3_south_landing', [7, 14], 'South Landing', 'The landing on the reef below the south headland, held by Corc’s grey raiders.', {
        label: 'Grey raiders',
        army: southLanding,
        reward: { flags: ['sb3_landing_open'], resources: { gold: 800, favor: 3 } },
        battlefield: 'coast_road',
      }),
      S.choice(
        'sb3_corc_mooring',
        [8, 6],
        'Corc’s Mooring',
        'The grey longships’ mooring on the north headland’s tip, above the north landing. Corc comes ashore here to bargain.',
        'Corc’s price',
        'Corc leans on a mooring post as if he owned it. “Passage at the north landing? It is the richest on the coast. My price is my cargo — the stores my men took from the coast and your war-band took from my storehouse. Put them back in my holds and the landing is yours for a tide.”',
        [
          { label: 'Return the seized stores', summary: 'Only once one of Corc’s storehouses is taken. Costs 1,000 Gold and 4 Wood (what the stores are worth). Corc’s crew at the north landing stands down: passage without a battle there.', cost: { gold: 1000, wood: 4 }, reward: { flags: ['sb3_corc_paid', 'sb3_landing_open'] }, requiresFlags: ['sb3_stores_taken'], clearsSiteIds: ['sb3_north_landing'] },
        ],
        { marker: 'pact' },
      ),
      // The return shortcut: the Kings' Road under the bay.
      S.shortcut('sb3_seadoor', [9, 11], 'Sea-door of the Kings’ Road', 'The hall’s eastern sea-door. Behind it the Kings’ Road runs under the bay to Inis Rón at low water. It is barred from the hall side until a landing is opened.', ['sb3_landing_open']),
      // Ferries across the bay.
      S.ferry('sb3_quay_n', [25, 9], 'Harbour North Quay', 'Inis Rón’s north quay: a currach crossing to the north headland, quicker than the inland road — if Corc’s longship lets it be.', 'sb3_slip_n'),
      S.ferry('sb3_slip_n', [12, 7], 'North Headland Slip', 'A slip on the north headland’s bay shore.', 'sb3_quay_n'),
      S.ferry('sb3_quay_s', [25, 13], 'Harbour South Quay', 'Inis Rón’s south quay: a currach crossing to the south headland.', 'sb3_slip_s'),
      S.ferry('sb3_slip_s', [12, 15], 'South Headland Slip', 'A slip on the south headland’s bay shore.', 'sb3_quay_s'),
      // Corc's storehouses: homes of his longships.
      S.landmark('sb3_store_n', [20, 2], 'North Storehouse', 'Corc’s storehouse on the north headland, full of the coast’s seized stores. His north longship puts in here.', 'quarry_cache', {
        label: 'Storehouse crew',
        army: storeGuard,
        reward: { flags: ['sb3_stores_taken'], resources: { gold: 600, wood: 3 } },
        battlefield: 'coast_road',
      }),
      S.landmark('sb3_store_s', [20, 20], 'South Storehouse', 'Corc’s storehouse on the south headland. Sealskins hang from its rafters. His south longship puts in here.', 'quarry_cache', {
        label: 'Storehouse crew',
        army: storeGuard,
        reward: { flags: ['sb3_stores_taken', 'sb3_sealskins'], resources: { gold: 600, stone: 3 } },
        battlefield: 'coast_road',
      }),
      // Two guaranteed resupply caches.
      S.depot('sb3_cache_n', [24, 6], 'North Headland Cache', 'The north-headland folk hid spears and coin from Corc for whoever came to fight him.', { resources: { gold: 500 }, creatures: [{ creatureId: 'celtic_elder_pooka', count: 12 }] }),
      S.depot('sb3_cache_s', [24, 16], 'South Headland Cache', 'The south-headland folk kept their best hounds out of Corc’s pens.', { resources: { gold: 500, crystal: 1 }, creatures: [{ creatureId: 'celtic_great_cu_sith', count: 4 }] }),
      // The return: Inis Rón's moot-stone.
      S.choice(
        'sb3_moot',
        [28, 13],
        'Moot-Stone of Inis Rón',
        'The stone by the harbour where the coast’s settlements meet.',
        'What the charters are for',
        'The charters lie on the moot-stone, with copies already being made by the harbour scribes. Sadb wants them read aloud and sent to every hall at once — let everyone know what the kings promised. Cathal points at the headland folk, whose stores Corc took: “Make peace with them first. The coast will feed whoever does.” The copies keep both roads open; the question is which comes first.',
        [
          { label: 'Publish the charters', summary: 'Costs 300 Gold for the criers. Every hall hears the charters now: public legitimacy in a later chapter.', cost: { gold: 300 }, reward: { flags: ['sb3_published'], questXp: 600 }, requiresFlags: ['sb3_charters'] },
          { label: 'First reconcile the coastal settlements', summary: 'Costs 1,200 Gold and 4 Wood to make good the headlands’ losses. The coast will supply Orla later (a maritime supply bonus); the copies are published afterwards.', cost: { gold: 1200, wood: 4 }, reward: { flags: ['sb3_reconciled'], questXp: 600 }, requiresFlags: ['sb3_charters'] },
        ],
        { marker: 'pact', objectiveIds: ['sb3_return'] },
      ),
      // Neutral hiring and optional places.
      S.neutral('sb3_afanc', [29, 2], 'Freshwater Lagoon', 'A reedy freshwater lagoon behind the harbour. Afancs live in it and hire out to anyone who leaves the reeds alone.', 'afanc', 5),
      S.camp('sb3_inlet', [6, 18], 'Outer Inlet', 'A brigand crew beached at the south headland’s outer inlet, between masters.', 'brigand', 6, 8),
      S.choice(
        'sb3_bard',
        [27, 18],
        'A Bard by the Shore',
        'A bard sitting on an upturned boat, tuning a harp.',
        'The Bard',
        '“You are going to the sea-hall,” the bard says, not looking up from the harp. “Ask your question as a verse — the sea-folk answer verses.” He tosses you a small ring of white stone. “A fairy ring. Or sit, and I will teach you the verse.”',
        [
          { label: 'Take the fairy ring', summary: 'The Fairy-ring Band joins Orla’s backpack.', reward: { artifactIds: ['fairy_ring_band'] } },
          { label: 'Learn the verse', summary: 'Orla gains +1 Spell Power and +1 Knowledge.', reward: { attributes: { power: 1, knowledge: 1 } } },
        ],
      ),
      S.pickup('sb3_wreck', [16, 7], 'Wrecked Currach', 'A leather boat thrown up by the storm; its cargo is dry.', { resources: { gold: 900, wood: 4 } }),
      S.choice(
        'sb3_longboat',
        [15, 15],
        'The Raiders’ Longboat',
        'A raider boat beached and empty on the south headland.',
        'The Raiders’ Longboat',
        'The longboat is full of plunder from every coast — and a pen of great green hounds the raiders stole and never dared to let out.',
        [
          { label: 'Take the plunder', summary: '+800 Gold and +2 Crystal.', reward: { resources: { gold: 800, crystal: 2 } } },
          { label: 'Let the hounds out', summary: '6 Great Cú Sith join Orla’s war-band.', reward: { creatures: [{ creatureId: 'celtic_great_cu_sith', count: 6 }] } },
        ],
      ),
      S.landmark('sb3_ogres', [31, 19], 'Ogres’ Sea-cave', 'Two ogres living on wreck-pickings.', 'nest', { label: 'Sea-cave ogres', army: [['ogre', 2]], reward: { resources: { crystal: 5 } }, battlefield: 'grove' }),
    ],
    patrols: [
      {
        commander: band('sb3_north_longship', 'Corc’s North Longship', REAVER_PORTRAIT),
        monster: true,
        bounty: { gold: 300 },
        start: [14, 6],
        waypoints: [[12, 6], [19, 5], [12, 6]],
        army: longship,
        home: 'sb3_store_n',
        radius: 5,
        threshold: [3, 2],
        purpose: 'Corc’s north longship watches the north headland slip and its ferry. It puts in at the North Storehouse: taking the storehouse sends it away for good.',
      },
      {
        commander: band('sb3_south_longship', 'Corc’s South Longship', REAVER_PORTRAIT),
        monster: true,
        bounty: { gold: 300 },
        start: [14, 16],
        waypoints: [[12, 16], [19, 17], [12, 16]],
        army: longship,
        home: 'sb3_store_s',
        radius: 5,
        threshold: [3, 2],
        purpose: 'Corc’s south longship watches the south headland slip and its ferry. It puts in at the South Storehouse: taking the storehouse sends it away for good.',
      },
    ],
    objectives: [
      O.primary(
        'sb3_reach',
        'Land at the drowned hall',
        `Open a landing at the hall’s reef: buy Corc’s passage at his mooring by returning the seized stores (once one of his storehouses is taken), take the south landing from the grey raiders (${armyText(southLanding)}), or defeat Corc at the north landing (${armyText(corcLanding)}).`,
        C.any(C.flag('sb3_corc_paid'), C.cleared('sb3_south_landing'), C.cleared('sb3_north_landing')),
        { hint: 'Corc holds the richest landing and stays there; his longships only watch the ferries, and each leaves for good when its storehouse falls.' },
      ),
      O.primary(
        'sb3_charters',
        'Two of the three charters',
        `Recover two of the three charters: the charter of the kings in the Hall Beneath the Waves (${armyText(hallGuard)}), the charter of the fords in the Tidewrack Vault (${armyText(vaultGuard)}), and the charter of the hearths from the seal-folk in their chamber.`,
        C.atLeast(2, C.flag('sb3_ch_kings'), C.flag('sb3_ch_fords'), C.flag('sb3_ch_hearths')),
        { markerSiteId: 'sb3_hall', reward: { flags: ['sb3_charters'] } },
      ),
      O.primary(
        'sb3_return',
        'Home with the charters',
        'Bring the charters safely back to the Moot-Stone of Inis Rón — over the Kings’ Road once a landing is open, by ferry, or by the long inland road — and decide what comes first: publishing them or reconciling the coast.',
        C.any(C.flag('sb3_published'), C.flag('sb3_reconciled')),
        { markerSiteId: 'sb3_moot', requires: ['sb3_charters'], completesMission: true },
      ),
      O.optional('sb3_storehouses', 'Corc’s storehouses', `Take both of Corc’s storehouses (${armyText(storeGuard)} each): his longships leave the ferries alone for good.`, C.all(C.cleared('sb3_store_n'), C.cleared('sb3_store_s')), { markerSiteId: 'sb3_store_s' }),
      O.optional('sb3_corc_fight', 'Defeat Corc', `Beat Corc at the north landing (${armyText(corcLanding)}) instead of paying him.`, C.flag('sb3_corc_beaten'), { markerSiteId: 'sb3_north_landing' }),
      O.optional('sb3_all_charters', 'All three charters', 'Recover the third charter too.', C.all(C.flag('sb3_ch_kings'), C.flag('sb3_ch_fords'), C.flag('sb3_ch_hearths'))),
      O.optional('sb3_ogre_cave', 'The ogres’ sea-cave', `Drive the ogres (${armyText([['ogre', 2]])}) from their sea-cave.`, C.cleared('sb3_ogres'), { markerSiteId: 'sb3_ogres' }),
    ],
    evidence: [
      { id: 'sb3_ev_charters', flag: 'sb3_charters', title: 'Two charters recovered', text: 'Two of the drowned hall’s charters are in Orla’s hands, with copies made at Inis Rón: whatever comes first, both stories can still be told.', icon: 'evidence' },
      { id: 'sb3_ev_kings', flag: 'sb3_ch_kings', title: 'The charter of the kings', text: '“The High Seat holds the fords, the herds and the hearths in trust. A king who keeps them for himself has broken the branch.”', icon: 'evidence' },
      { id: 'sb3_ev_fords', flag: 'sb3_ch_fords', title: 'The charter of the fords', text: '“The fords belong to those who cross them. The toll is the ford-keeper’s duty to mend them, not a king’s rent.”', icon: 'evidence' },
      { id: 'sb3_ev_hearths', flag: 'sb3_ch_hearths', title: 'The charter of the hearths', text: '“In the dark half of the year every hearth answers for its neighbour’s.”', icon: 'evidence' },
      { id: 'sb3_ev_paid', flag: 'sb3_corc_paid', title: 'Corc’s passage', text: 'The coast’s seized stores went back into Corc’s holds in exchange for passage at the north landing.', icon: 'pact' },
      { id: 'sb3_ev_beaten', flag: 'sb3_corc_beaten', title: 'Corc beaten', text: 'Corc was beaten at the north landing; his grey sails ran for the open sea.', icon: 'evidence' },
      { id: 'sb3_ev_published', flag: 'sb3_published', title: 'The charters published', text: 'Every hall on the coast heard the charters read aloud. Copies are on their way inland.', icon: 'branch' },
      { id: 'sb3_ev_reconciled', flag: 'sb3_reconciled', title: 'The coast reconciled', text: 'Orla made good the headlands’ losses before publishing the copies. The coast will supply her.', icon: 'supply' },
    ],
    carried: ['sb3_charters', 'sb3_ch_kings', 'sb3_ch_fords', 'sb3_ch_hearths', 'sb3_published', 'sb3_reconciled', 'sb3_corc_paid', 'sb3_corc_beaten'],
    entryBonuses: [
      { fact: 'sb2_kelpie_pact', label: 'The kelpies of Loch Eala carried word to the sea-folk (+5 Favor)', wallet: { favor: 5 } },
    ],
    briefing: [
      ORLA('The sea-folk keep a hall under the waves where every ruler of this coast set down what they promised in return for the High Seat. Many of them broke it.'),
      SADB('If the silver branch was cut to witness those promises, the charters will say so. Two of them will be enough to prove it.'),
      CATHAL('Corc’s grey raiders hold the way, and there is no fort to raise troops in this time. Inis Rón lends us its harbour and two caches on the headlands — what we take across is what we have.'),
      ORLA('Two headlands, a long road behind the harbour, ferries across the bay — quicker, if Corc’s longships let them be. The hall has two landings; open either and its sea-door opens the Kings’ Road home.'),
    ],
    briefingVariants: [
      { ifFlags: ['fact:sb4_governor'], lines: [SADB('Fiachra still governs at the High Seat, under the duties we wrote for him. If the old charters say otherwise, we will learn whether we wrote them well.')] },
      { ifFlags: ['fact:sb4_removed'], lines: [CATHAL('We took the High Seat from Fiachra and wrote its duties ourselves. Let us see whether the old kings would have signed them.')] },
      { unlessFlags: ['fact:sb4_settled'], lines: [CATHAL('Fiachra still sits on the High Seat as if it were his. Whatever these charters say, the districts should hear it before anyone decides who sits there next.')] },
      { ifFlags: ['fact:sb2_kelpie_pact'], lines: [SADB('The kelpies of Loch Eala swam our news down to the sea. The seal-folk know we are coming — and why.')] },
    ],
    victory: [
      ORLA('Two charters, home on the moot-stone of Inis Rón. The silver branch was never a crown. It was the witness of a promise.'),
      SADB('Every ruler who held it swore duties in return. The ones who broke them stopped calling it a promise and started calling it a right.'),
    ],
    scenes: [
      { id: 'sb3_corc_battle', trigger: { type: 'battle_started', siteId: 'sb3_north_landing' }, lines: [CORC('Every king who drowned a promise down there paid me to keep it drowned, druid. I am not giving up the best-paid landing on the coast.'), ORLA('Then you have been well paid for a lie.')] },
      { id: 'sb3_corc_down', trigger: { type: 'site_cleared', siteId: 'sb3_north_landing' }, unlessFlags: ['sb3_corc_paid'], lines: [CATHAL('Corc is down. His grey sails are running for the open sea.')] },
      { id: 'sb3_corc_paid', trigger: { type: 'flag', flag: 'sb3_corc_paid' }, lines: [CORC('Stores for passage. A fair trade — the first anybody on this coast has offered me.'), SADB('He will be back for more, Orla. But the landing is ours for the tide.')] },
      { id: 'sb3_stores', trigger: { type: 'flag', flag: 'sb3_stores_taken' }, lines: [CATHAL('Corc’s storehouse: salt, wool, the coast’s winter stores, each with a tally of where it was taken. His longship will not stay without it.')] },
      { id: 'sb3_skins', trigger: { type: 'flag', flag: 'sb3_sealskins' }, lines: [SADB('Sealskins — dozens of them, hung to dry. The seal-folk in the hall will want these back.')] },
      { id: 'sb3_hall_battle', trigger: { type: 'battle_started', siteId: 'sb3_hall' }, lines: [DUBHGHALL('Ask the sea, druid. The sea keeps what it is given — and so do I.')] },
      { id: 'sb3_kings_settled', trigger: { type: 'site_cleared', siteId: 'sb3_hall' }, ifFlags: ['fact:sb4_settled'], lines: [SADB('The charter of the kings: the High Seat holds the fords, the herds and the hearths in trust. Those are the duties we wrote at the High Seat — the settlement holds up against it, line by line.')] },
      { id: 'sb3_kings_open', trigger: { type: 'site_cleared', siteId: 'sb3_hall' }, unlessFlags: ['fact:sb4_settled'], lines: [SADB('The charter of the kings: the High Seat holds the fords, the herds and the hearths in trust. Whoever sits there after Fiachra will have to swear to this, in front of the districts.')] },
      { id: 'sb3_fords', trigger: { type: 'site_cleared', siteId: 'sb3_fords_vault' }, lines: [ORLA('The charter of the fords: the toll is the ford-keeper’s duty to mend the ford, not a king’s rent. Somebody forgot that at every ford from here to Dún Caill.')] },
      { id: 'sb3_hearths', trigger: { type: 'flag', flag: 'sb3_ch_hearths' }, lines: [SADB('The charter of the hearths: in the dark half of the year every hearth answers for its neighbour’s. The same promise as the ogham in the hazel grove.')] },
      { id: 'sb3_duties', trigger: { type: 'objective_completed', objectiveId: 'sb3_charters' }, lines: [SADB('Look at who signed them, Orla. A cattle-lord’s son, a smith’s widow, a man from over the sea. The branch never passed by blood — it passed with the duties. Every charter names what the holder owed, not whose child they were.'), ORLA('Then it was never a crown. It was a witness.')] },
      { id: 'sb3_seadoor', trigger: { type: 'flag', flag: 'sb3_landing_open' }, lines: [CATHAL('The hall’s sea-door is unbarred. At low water the Kings’ Road runs under the bay straight to Inis Rón — we can walk home.')] },
      { id: 'sb3_published_settled', trigger: { type: 'flag', flag: 'sb3_published' }, ifFlags: ['fact:sb4_settled'], lines: [SADB('Read aloud on the moot-stone — and the duties we wrote at the High Seat stand next to them without shame. That is the test, and the settlement passed it.')] },
      { id: 'sb3_published_open', trigger: { type: 'flag', flag: 'sb3_published' }, unlessFlags: ['fact:sb4_settled'], lines: [ORLA('Read aloud on the moot-stone. When the districts decide who sits the High Seat, they will decide with these in their hands.')] },
      { id: 'sb3_reconciled_settled', trigger: { type: 'flag', flag: 'sb3_reconciled' }, ifFlags: ['fact:sb4_settled'], lines: [CATHAL('The headlands are paid back. The copies go inland next, to be held against the duties we wrote at the High Seat.')] },
      { id: 'sb3_reconciled_open', trigger: { type: 'flag', flag: 'sb3_reconciled' }, unlessFlags: ['fact:sb4_settled'], lines: [CATHAL('The headlands are paid back first. The copies go inland after us — the districts can weigh them when they choose who sits the High Seat.')] },
    ],
    loss: ['Orla must survive.', 'There is no town to recruit in: the expedition is the war-band that crossed, with two guaranteed resupply caches on the headlands.', 'Corc stays at his landing; his longships watch only the ferries.'],
    help: [
      { id: 'sb3_routes', title: 'Four ways round the bay', text: 'The long inland road joins the two headlands behind Inis Rón; currach ferries cross the bay from the harbour quays to each headland — quicker, but watched by Corc’s longships. A reef from each headland tip reaches the drowned hall’s landings. Opening either landing unbars the hall’s sea-door: the Kings’ Road runs back to the harbour.' },
      { id: 'sb3_expedition', title: 'A fixed war-band', text: 'Inis Rón is a friendly harbour: no dwellings and nothing to build. Two caches on the headlands give troops once each; afancs and a brigand crew can be hired.' },
    ],
  });

  // =========================================================================
  // Chapter 4 — The High Seat (card 30; legacy m05)
  // =========================================================================
  const v1m05 = camp.v1('silver_branch_m05');
  const fiachraSetup = v1m05.rivals?.[0];
  if (!fiachraSetup) throw new Error('Silver Branch v2: Fiachra’s profile is missing from the legacy content');
  const fiachra: CommanderSpec = {
    heroDefinitionId: fiachraSetup.hero.definitionId,
    name: 'Fiachra',
    classId: fiachraSetup.hero.classId,
    level: fiachraSetup.hero.defaults.level,
    attributes: fiachraSetup.hero.defaults.attributes,
    skills: fiachraSetup.hero.defaults.skills,
    spellbook: false,
    spellIds: [],
    mana: 10,
    portraitAssetId: 'hero.celtic.fiachra.portrait',
  };
  const seatGuard: Army = [['celtic_elder_pooka', 26], ['celtic_great_cu_sith', 10], ['celtic_banshee', 3]];
  const levyGuard: Army = [['brigand', 18], ['brigand_cutthroat', 8]];
  const stockadeGuard: Army = [['clay_golem', 8], ['tusked_boar', 4]];
  const reserveArmy: Army = [['celtic_elder_pooka', 14], ['celtic_great_cu_sith', 6]];
  const reserveCampGuard: Army = [['celtic_elder_pooka', 12], ['celtic_banshee', 2]];
  const m4 = chapter({
    campaign: camp,
    chapter: 4,
    card: 30,
    name: 'The High Seat',
    summary:
      'Fiachra has kept the roads of the three valleys safe while claiming powers no king before him could justify. Earn the support of two of the three districts through their own needs, then win the assembly or defeat Fiachra’s household at the High Seat — and write the duties that bind whoever holds it.',
    playtime: '65–90 minutes, 4–6 battles',
    legacy: ['silver_branch_m05'],
    economyFrom: 'silver_branch_m05',
    principal: 'sb4_seat',
    soundscape: 'glen',
    hostileName: 'Fiachra’s High Seat',
    town: { siteId: 'sb4_town', townId: 'dun_ard', name: 'Dún Ard' },
    map: {
      cols: 34,
      rows: 22,
      biome: 'temperate',
      base: 'plains',
      seed: 960004,
      texture: { forest: 60, rough: 40 },
      paint: [
        // The High Seat's hill where the three valleys meet.
        { t: 'mountain', disc: [17, 9, 2] },
        // The north ridge: a double crest with the remote ridge path between (the expensive flank).
        { t: 'mountain', cells: [[16, 3], [16, 4], [16, 5], [16, 6], [16, 7], [18, 3], [18, 4], [18, 5], [18, 6], [18, 7]] },
        { t: 'rough', cells: [[17, 3], [17, 4], [17, 5], [17, 6], [17, 7], [17, 8]] },
        // The south-west and south-east ridges between the valleys.
        { t: 'mountain', line: [[15, 11], [10, 17]], width: 0 },
        { t: 'mountain', line: [[19, 11], [22, 14]], width: 0 },
        // The two valley roads up to the Seat: the west (market) and east (pasture) approaches.
        { t: 'rough', line: [[14, 9], [16, 9]], width: 0 },
        { t: 'rough', line: [[18, 9], [20, 9]], width: 0 },
        // The afanc pool under the south-west ridge.
        { t: 'water', cells: [[11, 14], [12, 13], [11, 13]] },
        // District country: woods in the south valley, pasture hills in the east, the market's orchards in the west.
        { t: 'forest', blob: [20, 16, 1] },
        { t: 'forest', blob: [14, 17, 1] },
        { t: 'rough', blob: [29, 3, 1] },
        { t: 'forest', cells: [[4, 7], [5, 12], [8, 4]] },
      ],
      roads: [
        // The ring road: Dún Ard — the market — round the north ridge — the pasture — back.
        { via: ['sb4_town', [10, 19], [5, 15], [6, 9], [7, 3], [13, 2], [17, 2], [22, 2], [28, 5], [29, 11], [28, 16], [24, 19], 'sb4_town'] },
        // The two valley roads to the Seat, and the remote ridge path from the north.
        { via: [[6, 9], [11, 9], 'sb4_seat'] },
        { via: [[29, 11], [23, 9], 'sb4_seat'] },
        { via: [[17, 2], 'sb4_ridge_path', 'sb4_seat'] },
        // The afanc pool ford through the south-west ridge.
        { via: [[14, 16], 'sb4_pool_ford', [10, 12], [11, 9]] },
        { via: ['sb4_town', [14, 16]] },
        // Districts and spurs.
        { via: [[6, 9], 'sb4_levy_house'] },
        { via: [[28, 5], 'sb4_drovers'] },
        { via: ['sb4_town', 'sb4_stockade'] },
        { via: ['sb4_town', 'sb4_assembly'] },
        { via: [[23, 9], 'sb4_stone'] },
        { via: [[22, 2], 'sb4_reserve_camp'] },
        { via: [[29, 11], 'sb4_ricks'] },
        { via: [[7, 3], 'sb4_crystal'] },
        { via: [[28, 5], 'sb4_hounds'] },
        { via: [[17, 2], 'sb4_slingers'] },
        { via: [[10, 12], 'sb4_pool'] },
        { via: [[5, 15], 'sb4_salmon'] },
        { via: [[29, 11], 'sb4_quarry'] },
      ],
    },
    sites: [
      S.town('sb4_town', 'dun_ard', [17, 19], 'Dún Ard', 'A hillfort in the south valley, loyal to the old fires.', [17, 18]),
      S.resource('sb4_quarry', [31, 12], 'quarry'),
      S.resource('sb4_crystal', [3, 3], 'crystal_deposit', { guard: { label: 'Outcrop boars', army: [{ creatureId: 'tusked_boar', count: 10 }], reward: { resources: { gold: 500 } }, battlefield: 'open_field' } }),
      // The High Seat.
      S.landmark('sb4_seat', [17, 9], 'The High Seat', 'Fiachra’s fort on the hill where the three valleys meet. He sits the old seat of the kings with his household round him.', 'refuge', {
        label: 'Fiachra and his household',
        army: seatGuard,
        commander: fiachra,
        reward: { flags: ['sb4_fiachra_beaten', 'sb4_seat_won'], resources: { gold: 1500 }, artifactIds: ['stone_of_fal'], questXp: 1500 },
        battlefield: 'beacon_clearing',
        required: true,
      }, { objectiveIds: ['sb4_seat'] }),
      S.crossing('sb4_ridge_path', [17, 5], 'Ridge Path', 'A goat path along the crest of the north ridge, from the ring road to the back of the High Seat — long, steep and costly, but unwatched.', null),
      S.choice(
        'sb4_assembly',
        [17, 13],
        'Assembly Mound of the Three Valleys',
        'The old assembly mound under the Seat’s southern cliff, where the districts once met to raise and to judge their kings.',
        'The assembly',
        'The districts that stand with Orla send their people up the mound: market-wives with their weights, drovers with their crooks, woodwards with their axes. They do not shout for a new king. They list what the Seat owes them — and what Fiachra took. If the assembly speaks with one voice, his household will not fight against it.',
        [
          { label: 'Call the assembly', summary: 'Needs the support of two districts. Costs 1,000 Gold to feed the assembly. The High Seat accepts the settlement: Fiachra’s household and his reserve camp stand down (no battle).', cost: { gold: 1000 }, reward: { flags: ['sb4_assembly', 'sb4_seat_won'], questXp: 1200 }, requiresFlags: ['sb4_two_districts'], clearsSiteIds: ['sb4_seat', 'sb4_reserve_camp'] },
          { label: 'Read the drowned charters to the assembly', summary: 'Needs the support of two districts and the charters from the drowned hall. Costs 500 Gold. The charter of the kings is read first; the High Seat accepts the settlement and Fiachra’s household and reserve camp stand down.', cost: { gold: 500 }, reward: { flags: ['sb4_assembly', 'sb4_seat_won', 'sb4_charters_read'], questXp: 1500 }, requiresFlags: ['sb4_two_districts', 'fact:sb3_charters'], clearsSiteIds: ['sb4_seat', 'sb4_reserve_camp'] },
        ],
        { marker: 'pact' },
      ),
      S.choice(
        'sb4_stone',
        [22, 11],
        'Inauguration Stone',
        'The stone below the Seat’s eastern road where kings were named. Fiachra had his own name cut on it.',
        'The written duties',
        'The stone has room under Fiachra’s name. The districts that stood with Orla dictate their duties to the stone-cutter: what the Seat owes the market, the herds and the woods, and what it may never take. The last line is who holds the Seat under them.',
        [
          { label: 'Fiachra governs, bound by the duties', summary: 'Fiachra stays at the High Seat as a local governor under the written duties (no new hero joins anyone). The districts’ duties are remembered for the finale.', reward: { flags: ['sb4_governor', 'sb4_settled'], questXp: 500 }, requiresFlags: ['sb4_seat_won'] },
          { label: 'Remove Fiachra', summary: 'Only after he was beaten in battle. Fiachra leaves the High Seat; the districts keep its duties between them. Remembered for the finale.', reward: { flags: ['sb4_removed', 'sb4_settled'], questXp: 500 }, requiresFlags: ['sb4_fiachra_beaten'] },
        ],
        { marker: 'pact', objectiveIds: ['sb4_settle'] },
      ),
      // The three districts.
      S.resource('sb4_levy_house', [4, 9], 'gold_mine', {
        name: 'Levy-House of the Market',
        description: 'Fiachra’s levy-men hold the market’s weights, measures and mint; nothing is sold in the west valley without his cut. Freed, the market’s mint keeps paying whoever holds it (+1,000 Gold per day).',
        guard: { label: 'Levy-men', army: levyGuard.map(([creatureId, count]) => ({ creatureId, count })), reward: { flags: ['sb4_market', 'sb4_first_support'], resources: { gold: 900 }, questXp: 600 }, battlefield: 'open_field' },
        marker: 'supply',
      }),
      S.activation(
        'sb4_drovers',
        [30, 7],
        'Drovers’ Hall',
        'The drovers of the east valley. Fiachra’s levy took their winter fodder; their herds will not last to spring without it.',
        { cost: { gold: 1000, wood: 6 }, reward: { flags: ['sb4_pasture', 'sb4_first_support'], questXp: 600 }, confirm: 'Bring the drovers winter fodder (1,000 Gold, 6 Wood)? Their herds will last to spring, and the pasture district will speak for Orla.', label: 'relay' },
        null,
        { marker: 'supply' },
      ),
      S.resource('sb4_stockade', [19, 15], 'sawmill', {
        name: 'Woodwards’ Stockade',
        description: 'Fiachra’s stockade in the south wood, where the woodwards who refused his levy are held. Cairn-men and boars keep the gate. Freed, the woodwards keep cutting for whoever holds it (+2 Wood per day).',
        guard: { label: 'Stockade cairn-men', army: stockadeGuard.map(([creatureId, count]) => ({ creatureId, count })), reward: { flags: ['sb4_forest', 'sb4_first_support'], resources: { gold: 700, wood: 4 }, questXp: 600 }, battlefield: 'grove' },
        marker: 'evacuation',
      }),
      // Fiachra's visible reserve.
      S.landmark('sb4_reserve_camp', [22, 4], 'Reserve Camp', 'Fiachra’s reserve, camped under the north ridge where everyone can see it. He sends it out when a district turns from him.', 'refuge', {
        label: 'The reserve’s rearguard',
        army: reserveCampGuard,
        reward: { resources: { gold: 800 } },
        battlefield: 'ridge_pass',
      }),
      S.depot('sb4_ricks', [28, 13], 'Drovers’ Fodder Ricks', 'The last fodder ricks of the east valley. The full store is here until Fiachra’s reserve reaches it.', { resources: { gold: 300, wood: 3 } }),
      // Supplies the districts keep producing.
      S.camp('sb4_hounds', [31, 5], 'Drovers’ Kennels', 'The drovers breed cú sith for the herds — and sell them to whoever fed the herds through the winter.', 'celtic_cu_sith', 3, 4, {
        kind: { type: 'creature_camp', creatureId: 'celtic_cu_sith', weeklyGrowth: 3, initialStock: 4, requiresFlag: 'sb4_pasture', lockedReason: 'The drovers sell hounds only once their herds have winter fodder (the Drovers’ Hall).' },
      }),
      S.camp('sb4_slingers', [19, 1], 'Ridge Quarry', 'Hill slingers quarry slate at the head of the ridge path and sell their slings by the week.', 'hill_slinger', 3, 6),
      // The afanc pool and its ford.
      S.shortcut('sb4_pool_ford', [13, 14], 'Pool Ford', 'A ford through the south-west ridge where the afanc pool spills over. The afancs let no one wade it until they have had their offering.', ['sb4_afanc_pact']),
      S.choice(
        'sb4_pool',
        [10, 13],
        'Afanc Pool',
        'A deep pool under the south-west ridge. Something large moves in the reeds.',
        'The afanc pool',
        'The afancs surface one by one, watching. The woodwards say they guard the ford for whoever leaves an offering of silver in the reeds — and that a few of them will follow such a person, for a fee.',
        [{ label: 'Leave an offering', summary: 'Costs 300 Gold. The afancs let Orla wade the Pool Ford (a short way between the south valley and the market valley) and will hire out at the pool.', cost: { gold: 300 }, reward: { flags: ['sb4_afanc_pact'] } }],
        { art: 'neutral_dwelling.afanc', marker: 'pact' },
      ),
      S.neutral('sb4_afanc', [9, 14], 'Afanc Reeds', 'The reeds of the afanc pool, where the afancs hire out.', 'afanc', 5, { flag: 'sb4_afanc_pact', reason: 'Leave an offering at the Afanc Pool first.' }),
      S.choice(
        'sb4_salmon',
        [3, 16],
        'The Salmon Pool',
        'A pool under hazel trees, where a salmon rises.',
        'The Salmon Pool',
        'Hazelnuts fall into the pool and a speckled salmon rises to eat them. On the bank lies a purse someone left in thanks — or you could sit and watch the salmon, which is said to be the wisest thing in the river.',
        [
          { label: 'Take the purse', summary: '+1,500 Gold.', reward: { resources: { gold: 1500 } } },
          { label: 'Watch the salmon', summary: 'Orla gains +1 Defense and +1 Knowledge.', reward: { attributes: { defense: 1, knowledge: 1 } } },
        ],
      ),
    ],
    patrols: [
      {
        commander: band('sb4_reserve', 'Fiachra’s Reserve', 'creature.celtic.tier2.upgraded.portrait'),
        monster: true,
        bounty: { gold: 500 },
        start: [23, 5],
        waypoints: [[27, 6], [29, 10], [28, 13], [29, 10]],
        army: reserveArmy,
        home: 'sb4_reserve_camp',
        dormantUntil: 'sb4_first_support',
        threshold: [3, 2],
        purpose: 'Fiachra’s visible reserve. It waits under the north ridge until the first district turns, then marches on the drovers’ fodder ricks in the east valley. Beat it on the road or take its camp; support already earned is never undone.',
      },
    ],
    objectives: [
      O.primary(
        'sb4_districts',
        'Two districts stand with Orla',
        `Earn the support of two of the three districts through their own needs: free the woodwards from the stockade in the south wood (${armyText(stockadeGuard)}); bring the drovers winter fodder at their hall in the east valley (1,000 Gold, 6 Wood); or break the levy at the market’s Levy-House in the west valley (${armyText(levyGuard)}).`,
        C.atLeast(2, C.flag('sb4_forest'), C.flag('sb4_pasture'), C.flag('sb4_market')),
        { reward: { flags: ['sb4_two_districts'] }, hint: 'Each district keeps producing after its quest: the market’s mint in the west, the drovers’ kennels in the east, the woodwards’ timber in the south.' },
      ),
      O.primary(
        'sb4_seat',
        'The High Seat accepts the settlement',
        `With two districts behind her, win the assembly at the Assembly Mound — or defeat Fiachra and his household (${armyText(seatGuard)}) at the High Seat, by the west road, the east road or the long ridge path.`,
        C.any(C.flag('sb4_assembly'), C.flag('sb4_fiachra_beaten')),
        { markerSiteId: 'sb4_seat', requires: ['sb4_districts'] },
      ),
      O.primary(
        'sb4_settle',
        'Write the duties',
        'At the Inauguration Stone, write the Seat’s duties to the districts — and decide whether Fiachra governs under them or is removed (only after a battle with him).',
        C.any(C.flag('sb4_governor'), C.flag('sb4_removed')),
        { markerSiteId: 'sb4_stone', requires: ['sb4_seat'], completesMission: true },
      ),
      O.optional('sb4_all', 'All three districts', 'Earn the support of the third district too.', C.all(C.flag('sb4_market'), C.flag('sb4_pasture'), C.flag('sb4_forest'))),
      O.optional('sb4_intercept', 'Intercept the reserve', `Beat Fiachra’s reserve (${armyText(reserveArmy)}) on the road or take its camp under the north ridge.`, C.any(C.defeated('sb4_reserve'), C.cleared('sb4_reserve_camp')), { markerSiteId: 'sb4_reserve_camp' }),
      O.optional('sb4_full_ricks', 'The drovers’ full ricks', 'Collect the Drovers’ Fodder Ricks before Fiachra’s reserve reaches them: +500 Gold and +3 Wood more.', C.visited('sb4_ricks'), { markerSiteId: 'sb4_ricks', reward: { resources: { gold: 500, wood: 3 } } }),
      O.optional('sb4_afancs', 'The afanc pool', 'Leave an offering at the Afanc Pool: its ford opens and its afancs hire out.', C.flag('sb4_afanc_pact'), { markerSiteId: 'sb4_pool' }),
    ],
    timers: [
      {
        id: 'sb4_reserve_march',
        label: 'Fiachra’s reserve marches on the fodder ricks',
        startWhen: C.flag('sb4_first_support'),
        days: 5,
        metWhen: C.any(C.visited('sb4_ricks'), C.defeated('sb4_reserve'), C.cleared('sb4_reserve_camp')),
        consequence: 'The reserve burns the drovers’ fodder ricks: they keep only their base share (the 500 Gold and 3 Wood bonus is lost). District support already earned is never touched.',
        announce: 'When a district turns, Fiachra will send his reserve against the drovers’ fodder ricks.',
        onExpire: { flags: ['sb4_ricks_burned'], failObjectives: ['sb4_full_ricks'] },
      },
    ],
    evidence: [
      { id: 'sb4_ev_market', flag: 'sb4_market', title: 'The market’s weights', text: 'The levy is broken; the market of the west valley has its weights back and speaks for Orla.', icon: 'pact' },
      { id: 'sb4_ev_pasture', flag: 'sb4_pasture', title: 'The drovers’ fodder', text: 'The drovers’ herds will last to spring; the pasture district speaks for Orla.', icon: 'pact' },
      { id: 'sb4_ev_forest', flag: 'sb4_forest', title: 'The woodwards freed', text: 'The woodwards are out of Fiachra’s stockade; the forest district speaks for Orla.', icon: 'pact' },
      { id: 'sb4_ev_assembly', flag: 'sb4_assembly', title: 'The assembly', text: 'The districts met on the old mound and the High Seat accepted their settlement without a battle.', icon: 'branch' },
      { id: 'sb4_ev_charters', flag: 'sb4_charters_read', title: 'The charters read', text: 'The charter of the kings from the drowned hall was read to the assembly before anyone spoke.', icon: 'evidence' },
      { id: 'sb4_ev_beaten', flag: 'sb4_fiachra_beaten', title: 'Fiachra beaten', text: 'Fiachra and his household were beaten at the High Seat.', icon: 'evidence' },
      { id: 'sb4_ev_governor', flag: 'sb4_governor', title: 'A governor under duties', text: 'Fiachra governs the High Seat under the duties the districts wrote on the inauguration stone.', icon: 'branch' },
      { id: 'sb4_ev_removed', flag: 'sb4_removed', title: 'Fiachra removed', text: 'Fiachra left the High Seat; the districts keep its duties between them.', icon: 'branch' },
    ],
    carried: ['sb4_market', 'sb4_pasture', 'sb4_forest', 'sb4_assembly', 'sb4_charters_read', 'sb4_fiachra_beaten', 'sb4_governor', 'sb4_removed', 'sb4_settled'],
    entryBonuses: [
      { fact: 'sb2_channel', label: 'Dún Bera’s harvest beside the new channel (2,000 Gold, 6 Wood)', wallet: { gold: 2000, wood: 6 } },
    ],
    briefing: [
      SADB('Fiachra was a cattle-lord on the eastern ford. When the summer failed he sat on the High Seat and said the winter was his to keep.'),
      CATHAL('And give him this: no reaver has crossed the three valleys since. The roads are safe. People remember that.'),
      FIACHRA('Go back to your groves, druid. A winter king is still a king, and I keep my people fed.'),
      ORLA('Then let the people say what the Seat owes them. The market, the drovers and the woodwards each have their own grievance. Two of them behind us, and the assembly can do what an army would.'),
    ],
    briefingVariants: [
      { ifFlags: ['fact:sb3_charters'], lines: [SADB('We carry the drowned charters. When the districts gather on the mound they can hear what the kings once promised them — before anyone decides what Fiachra owes.')] },
      { ifFlags: ['fact:sb3_published'], lines: [CATHAL('The charters were read on every coast. The market-wives here have heard them already, and they are angry.')] },
      { ifFlags: ['fact:sb2_channel'], lines: [CATHAL('Dún Bera’s farmers sent their harvest after us — grateful their fields stayed beside the new channel.')] },
    ],
    victory: [
      ORLA('The duties are cut into the stone under Fiachra’s name. The Seat answers to the valleys now, not the other way round.'),
      CATHAL('And the districts that stood with us will remember which duties were theirs. When we go east to the mound, they will know what they owe — and what is owed them.'),
    ],
    scenes: [
      { id: 'sb4_first', trigger: { type: 'flag', flag: 'sb4_first_support' }, lines: [CATHAL('A district has turned — and Fiachra’s reserve is leaving its camp under the north ridge, toward the drovers’ fodder ricks.'), SADB('Let it march. What the district gave us, it gave. Burned hay will not take it back.')] },
      { id: 'sb4_market', trigger: { type: 'site_cleared', siteId: 'sb4_levy_house' }, lines: [SADB('The market-wives have their weights again. The first thing they weighed was Fiachra’s levy — short by a third.')] },
      { id: 'sb4_forest', trigger: { type: 'site_cleared', siteId: 'sb4_stockade' }, lines: [ORLA('The woodwards are out. They refused his levy because the old law says the wood is held in trust — not owned.')] },
      { id: 'sb4_seat_battle', trigger: { type: 'battle_started', siteId: 'sb4_seat' }, lines: [FIACHRA('My people ate this winter. Will they eat in your summer?'), ORLA('They ate in every summer before you.')] },
      { id: 'sb4_seat_won', trigger: { type: 'site_cleared', siteId: 'sb4_seat' }, unlessFlags: ['sb4_assembly'], lines: [CATHAL('His household is broken and Fiachra is on his knees — alive. The stone is below the eastern road.')] },
      { id: 'sb4_assembly_charters', trigger: { type: 'flag', flag: 'sb4_assembly' }, ifFlags: ['fact:sb3_charters'], lines: [SADB('They read the charter of the kings first — “the High Seat holds the fords, the herds and the hearths in trust” — and then every district added its own line.'), FIACHRA('So the dead kings and the drovers agree. I kept the roads; let them write that down too.')] },
      { id: 'sb4_assembly_plain', trigger: { type: 'flag', flag: 'sb4_assembly' }, unlessFlags: ['fact:sb3_charters'], lines: [SADB('No old parchment, no king’s word — only the districts, one after the other, saying what the Seat owes them.'), FIACHRA('So the districts speak and the Seat listens. I kept the roads; let them write that down too.')] },
      { id: 'sb4_governor', trigger: { type: 'flag', flag: 'sb4_governor' }, lines: [FIACHRA('A governor under written duties. My father would have laughed.'), ORLA('Your father never had to answer to a drover. You will.')] },
      { id: 'sb4_removed', trigger: { type: 'flag', flag: 'sb4_removed' }, lines: [FIACHRA('Then keep the roads yourselves. You will find out what it costs.'), CATHAL('We will. That is what the duties are for.')] },
      { id: 'sb4_ricks', trigger: { type: 'flag', flag: 'sb4_ricks_burned' }, lines: [CATHAL('The reserve burned the drovers’ ricks. The drovers are angry — at Fiachra.')] },
      { id: 'sb4_pool', trigger: { type: 'flag', flag: 'sb4_afanc_pact' }, lines: [SADB('The afancs took the silver and sank. The Pool Ford is open — the south valley to the market in half a day.')] },
    ],
    loss: ['Orla must survive.', 'Losing Dún Ard is recoverable while Orla has a war-band.', 'District support once earned is never lost; Fiachra survives in every outcome.'],
    help: [
      { id: 'sb4_valleys', title: 'Three valleys', text: 'A ring road joins the market (west), the pasture (east) and the south valley with Dún Ard. Two valley roads climb to the High Seat from the west and the east; a long ridge path flanks it from the north. The Pool Ford through the south-west ridge opens once the afancs have had their offering. Each district keeps producing after its quest: the market’s mint, the drovers’ kennels, the woodwards’ timber.' },
      { id: 'sb4_reserve_help', title: 'Fiachra’s reserve', text: 'His reserve camps in plain sight under the north ridge. When the first district turns it marches on the drovers’ fodder ricks; beat it or take its camp. Nothing it does undoes support already earned.' },
    ],
  });

  // =========================================================================
  // Chapter 5 — The Stags' Wood (card 31; legacy m06)
  // =========================================================================
  const v1m06 = camp.v1('silver_branch_m06');
  const tadhg = v1m06.sites.find((s) => s.id === 'm06_gate')?.guard?.commander;
  if (!tadhg) throw new Error('Silver Branch v2: Tadhg’s profile is missing from the legacy content');
  const tadhgHost: Army = [['celtic_elder_pooka', 30], ['celtic_great_cu_sith', 10], ['celtic_dread_kelpie', 4], ['celtic_battle_banshee', 3]];
  const binderArmy: Army = [['bronze_golem', 6]];
  const holtGuard: Army = [['ogre_chieftain', 2]];
  // Each glade's inner shortcut (the sluice channel of its binding stone).
  const springBed: readonly (readonly [number, number])[] = [[13, 5], [14, 5], [15, 5]];
  const hollowPath: readonly (readonly [number, number])[] = [[5, 14], [6, 14], [7, 14], [8, 14]];
  const blackMere: readonly (readonly [number, number])[] = [[26, 14], [27, 14], [28, 14]];
  const row = (y: number, x0: number, x1: number) => Array.from({ length: x1 - x0 + 1 }, (_, i) => [x0 + i, y] as const);
  const col = (x: number, y0: number, y1: number) => Array.from({ length: y1 - y0 + 1 }, (_, i) => [x, y0 + i] as const);
  const m5 = chapter({
    campaign: camp,
    chapter: 5,
    card: 31,
    name: 'The Stags’ Wood',
    summary:
      'Tadhg the Grey has bound the stag spirits to hold the deep wood in one perfect remembered summer — beautiful, and slowly dying. Break his binding host at the heart of the wood, release the three seasonal glades while the woodfolk leave by the outer road, hold the opened clearings against the last binder and sound the belling stone at home.',
    playtime: '60–80 minutes, 4–5 battles',
    legacy: ['silver_branch_m06'],
    economyFrom: 'silver_branch_m06',
    principal: 'sb5_tadhg',
    soundscape: 'glen',
    hostileName: 'Tadhg’s Binding Host',
    town: { siteId: 'sb5_town', townId: 'coill_dubh', name: 'Coill Dubh' },
    map: {
      cols: 34,
      rows: 22,
      biome: 'moor',
      base: 'plains',
      seed: 960005,
      texture: { forest: 140, rough: 20 },
      paint: [
        // The ancient thicket inside the permanent outer road.
        { t: 'mountain', rect: [5, 5, 28, 16] },
        // The two cross-paths: west–east (row 10) and north–south (meeting at the heart of the wood).
        { t: 'plains', cells: row(10, 5, 28) },
        { t: 'plains', cells: col(17, 5, 9) },
        { t: 'plains', cells: col(16, 11, 16) },
        // The three seasonal glades and their spurs to the cross-paths and the outer road.
        { t: 'plains', disc: [17, 6, 1] },
        { t: 'plains', disc: [10, 14, 1] },
        { t: 'plains', disc: [24, 14, 1] },
        { t: 'plains', cells: [...col(10, 11, 13), ...col(10, 15, 16), ...col(24, 11, 13), ...col(24, 15, 16)] },
        // The binding stones' niches beside each glade.
        { t: 'plains', cells: [[18, 6], [19, 6], [11, 14], [12, 14], [23, 14], [22, 14]] },
        // The spring glade's dry stream-bed (a shortcut to the north road until the thaw), the Black Mere by the winter glade.
        { t: 'plains', cells: springBed },
        { t: 'water', cells: blackMere },
        { t: 'water', disc: [27, 12, 1] },
        // The thorn hollow where the last binder waits.
        { t: 'plains', cells: [[22, 9], [22, 8]] },
        // Outer country.
        { t: 'forest', blob: [21, 2, 1] },
        { t: 'forest', blob: [7, 19, 1] },
        { t: 'rough', cells: [[31, 19], [30, 20], [32, 18]] },
      ],
      roads: [
        // The permanent outer road round the thicket.
        { via: ['sb5_town', [3, 3], [17, 3], [30, 3], [30, 18], [16, 18], [3, 18], 'sb5_town'] },
        // The cross-paths through the heart of the wood.
        { via: ['sb5_town', [15, 10], 'sb5_heart', [28, 10], [30, 10]] },
        { via: [[17, 3], [17, 8], 'sb5_heart'] },
        { via: ['sb5_heart', [16, 12], [16, 18]] },
        // Spurs to the glades and the outer road.
        { via: [[10, 10], [10, 13], [10, 16], [10, 18]] },
        { via: [[24, 10], [24, 13], [24, 16], [24, 18]] },
        // The binding stones behind their thorn gates.
        { via: [[17, 6], 'sb5_spring_gate', 'sb5_spring_stone'] },
        { via: [[10, 14], 'sb5_autumn_gate', 'sb5_autumn_stone'] },
        { via: [[24, 14], 'sb5_winter_gate', 'sb5_winter_stone'] },
        // Spurs.
        { via: [[3, 3], 'sb5_bell'] },
        { via: [[10, 18], 'sb5_lodge'] },
        { via: [[10, 14], 'sb5_orchard'] },
        { via: [[24, 10], 'sb5_hollow'] },
        { via: [[17, 3], 'sb5_root_runners'] },
        { via: [[30, 10], 'sb5_afanc'] },
        { via: [[16, 18], 'sb5_stags'] },
        { via: [[30, 18], 'sb5_holt'] },
        { via: [[30, 3], 'sb5_fawn'] },
        { via: ['sb5_town', 'sb5_sawmill'] },
        { via: [[3, 18], 'sb5_quarry'] },
        { via: [[30, 3], 'sb5_gold'] },
      ],
    },
    sites: [
      S.town('sb5_town', 'coill_dubh', [2, 10], 'Coill Dubh', 'A fort on the western edge of the deep wood, where the outer road and the west–east cross-path meet.', [3, 10]),
      S.resource('sb5_sawmill', [2, 6], 'sawmill'),
      S.resource('sb5_quarry', [2, 16], 'quarry'),
      S.resource('sb5_gold', [32, 2], 'gold_mine'),
      // Tadhg's binding host at the heart of the wood.
      S.crossing('sb5_heart', [17, 10], 'Heart of the Wood', 'Where the two cross-paths meet under the great oak. Tadhg the Grey holds it with his binding host; from here the stag spirits are held in one remembered summer.', {
        label: 'Tadhg and the binding host',
        army: tadhgHost,
        commander: tadhg,
        reward: { flags: ['sb5_tadhg_down'], resources: { gold: 1500 }, artifactIds: ['spear_of_lugh'], questXp: 1500 },
        battlefield: 'grove',
        required: true,
      }, { objectiveIds: ['sb5_tadhg'] }),
      // The three seasonal glades: binding stones behind thorn gates that wither when Tadhg falls.
      S.shortcut('sb5_spring_gate', [18, 6], 'Thorn Gate of the Spring Glade', 'Grave-iron thorns round the spring stag’s binding stone. They wither when Tadhg’s binding host is broken.', ['sb5_tadhg_down']),
      S.sluice('sb5_spring_stone', [19, 6], 'Binding Stone of the Spring Glade', 'The stone that holds the spring stag in Tadhg’s summer. Release it and the glade’s season moves on.', {
        channel: springBed,
        open: 'water',
        closed: 'plains',
        startsOpen: false,
        openText: 'Release the spring stag: the thaw-streams run and fill the dry stream-bed west of the glade — the short way from the spring glade to the north road closes. The cross-path north stays open, and the outer road is never touched.',
        closeText: 'Dam the thaw-streams at the stone: the stream-bed dries and the short way to the north road opens again. The stag stays free.',
        openFlag: 'sb5_spring_open',
      }, { marker: 'evidence' }),
      S.shortcut('sb5_autumn_gate', [11, 14], 'Thorn Gate of the Orchard Glade', 'Grave-iron thorns round the autumn stag’s binding stone in the old orchard glade.', ['sb5_tadhg_down']),
      S.sluice('sb5_autumn_stone', [12, 14], 'Binding Stone of the Orchard Glade', 'The stone that holds the autumn stag. Under Tadhg’s summer the thicket west of the orchard never sheds a leaf.', {
        channel: hollowPath,
        open: 'forest',
        closed: 'mountain',
        startsOpen: false,
        openText: 'Release the autumn stag: the leaves fall and the thicket west of the orchard thins into the Hollow Path — a short way from the orchard glade to the outer road by Coill Dubh opens. The cross-paths and the outer road are not touched.',
        closeText: 'Let the thicket close over the Hollow Path again. The stag stays free.',
        openFlag: 'sb5_autumn_open',
      }, { marker: 'evidence' }),
      S.shortcut('sb5_winter_gate', [23, 14], 'Thorn Gate of the Winter Glade', 'Grave-iron thorns round the winter stag’s binding stone by the Black Mere.', ['sb5_tadhg_down']),
      S.sluice('sb5_winter_stone', [22, 14], 'Binding Stone of the Winter Glade', 'The stone that holds the winter stag. In Tadhg’s summer the Black Mere never freezes.', {
        channel: blackMere,
        open: 'marsh',
        closed: 'water',
        startsOpen: false,
        openText: 'Release the winter stag: the Black Mere freezes — its ice opens a short way from the winter glade east to the outer road. The cross-paths and the outer road are not touched.',
        closeText: 'Break the ice on the Black Mere: the short way east closes again. The stag stays free.',
        openFlag: 'sb5_winter_open',
      }, { marker: 'evidence' }),
      // The evacuation circuit and the return.
      S.choice(
        'sb5_lodge',
        [9, 19],
        'Woodwards’ Lodge',
        'The lodge on the outer road where the woodwards keep the waystations round the deep wood.',
        'The evacuation circuit',
        'The woodfolk of the glades will have to move when their seasons come back — through the outer road, round the wood, to Coill Dubh. The woodwards can keep the waystations lit and stocked day and night, if someone pays for the oil, the bread and the carts.',
        [{ label: 'Stock the waystations', summary: 'Costs 800 Gold and 4 Wood. The outer road is kept as an evacuation circuit: the woodfolk leave each glade as it is released.', cost: { gold: 800, wood: 4 }, reward: { flags: ['sb5_evacuation'], questXp: 400 } }],
        { marker: 'evacuation', objectiveIds: ['sb5_evacuation'] },
      ),
      S.activation(
        'sb5_bell',
        [4, 4],
        'Belling Stone',
        'The stone above Coill Dubh where the stags bell the turning of the year.',
        {
          cost: { gold: 500, favor: 5 },
          reward: { questXp: 1500 },
          requirements: [
            { type: 'objective_completed', objectiveId: 'sb5_tadhg' },
            { type: 'objective_completed', objectiveId: 'sb5_glades' },
            { type: 'objective_completed', objectiveId: 'sb5_evacuation' },
            { type: 'objective_completed', objectiveId: 'sb5_hold' },
          ],
          completesMission: true,
          confirm: 'Sound the belling stone (500 Gold, 5 Favor)? This completes The Stags’ Wood.',
        },
        null,
        { objectiveIds: ['sb5_bell'] },
      ),
      S.choice(
        'sb5_orchard',
        [9, 15],
        'The Old Orchard',
        'Apple trees older than Coill Dubh in the autumn glade, kept trimmed for a hundred years by Tadhg’s binding.',
        'The old orchard',
        'With Tadhg gone, the orchard will go the way of the wood: wild, and then gone under oak and briar. The woodfolk could keep it — fence it, prune it, make a refuge of it for the families who left the glades. Or let it go, all of it, and the wood that comes back will remember who let it.',
        [
          { label: 'Keep the orchard as a managed refuge', summary: 'Costs 600 Gold and 4 Wood. The woodfolk keep the orchard as a refuge — a civilian benefit at the campaign’s end.', cost: { gold: 600, wood: 4 }, reward: { flags: ['sb5_orchard_refuge'], questXp: 400 }, requiresFlags: ['sb5_tadhg_down'] },
          { label: 'Allow full regrowth', summary: 'The wood takes the orchard back. 2 Horned Stag Spirits follow Orla now, and the wood will stand with her in the finale (stronger woodland support).', reward: { flags: ['sb5_regrowth'], creatures: [{ creatureId: 'celtic_horned_stag_spirit', count: 2 }] }, requiresFlags: ['sb5_tadhg_down'] },
        ],
        { marker: 'pact', objectiveIds: ['sb5_orchard_choice'] },
      ),
      S.landmark('sb5_hollow', [22, 8], 'Thorn Hollow', 'A hollow off the west–east cross-path where the last of Tadhg’s binders waits.', 'nest', null),
      // Neutral hiring and optional places.
      S.neutral('sb5_root_runners', [20, 1], 'Root-Runner Hollows', 'Knotted root hollows under the north road where a band of root-runners from another land has stopped on its migration. They will not settle in a wood held in one season.', 'root_runner', 8, { flag: 'sb5_spring_free', reason: 'The root-runners move on unless the wood changes: release the spring glade first.' }),
      S.neutral('sb5_afanc', [29, 12], 'Edge of the Black Mere', 'The reedy edge of the Black Mere where the afancs of the deep wood live, whatever the season.', 'afanc', 5),
      S.camp('sb5_stags', [15, 19], 'The Stags’ Rutting Ground', 'Where the freed autumn stags gather to bell. They will run with whoever freed them.', 'celtic_horned_stag_spirit', 1, 2, {
        kind: { type: 'creature_camp', creatureId: 'celtic_horned_stag_spirit', weeklyGrowth: 1, initialStock: 2, requiresFlag: 'sb5_autumn_free', lockedReason: 'The stags gather here only once the autumn glade is released.' },
      }),
      S.landmark('sb5_holt', [31, 20], 'Ogre Holt', 'Two ogre chieftains in a holt of stolen cattle.', 'nest', { label: 'Ogre chieftains', army: holtGuard, reward: { resources: { crystal: 6 } }, battlefield: 'grove' }),
      S.choice(
        'sb5_fawn',
        [27, 2],
        'A Fawn in Iron',
        'A white fawn with a grave-iron band on one leg.',
        'The White Fawn',
        'The band is grave-iron, cold enough to burn. Cut it, and the fawn will run to its mother. Or melt it in a druid fire and read the king’s secrets in the smoke.',
        [
          { label: 'Cut the band', summary: '+2 Crystal and +10 Favor.', reward: { resources: { crystal: 2, favor: 10 } } },
          { label: 'Read the smoke', summary: 'Orla gains 1,000 experience.', reward: { questXp: 1000 } },
        ],
      ),
    ],
    patrols: [
      {
        commander: band('sb5_last_binder', 'The Last Binder', 'creature.neutral.clay_golem.upgraded.portrait'),
        monster: true,
        bounty: { gold: 800 },
        start: [22, 9],
        waypoints: [[24, 14], [17, 6], [10, 14], [24, 14]],
        army: binderArmy,
        dormantUntil: 'sb5_glades_free',
        threshold: [11, 10],
        purpose: 'The last of Tadhg’s binders, bronze cairn-men left in the Thorn Hollow. When the last glade is released it comes out against the opened clearings, one after another. It is the only one left: beat it and the wood is free.',
      },
    ],
    objectives: [
      O.primary('sb5_tadhg', 'Break Tadhg’s binding host', `Defeat Tadhg the Grey and his binding host (${armyText(tadhgHost)}) at the Heart of the Wood — along the west–east cross-path from Coill Dubh, or round the outer road and down the north cross-path.`, C.cleared('sb5_heart'), { markerSiteId: 'sb5_heart' }),
      O.primary('sb5_evacuation', 'Keep the evacuation circuit', 'At the Woodwards’ Lodge on the outer road, stock the waystations (800 Gold, 4 Wood) so the woodfolk can leave each glade as it changes.', C.flag('sb5_evacuation'), { markerSiteId: 'sb5_lodge' }),
      O.primary('sb5_spring', 'Release the spring glade', 'With Tadhg broken, release the spring stag at its binding stone in the north glade. Its preview: the dry stream-bed to the north road floods; the cross-path stays.', C.flag('sb5_spring_open'), { markerSiteId: 'sb5_spring_stone', requires: ['sb5_tadhg'], reward: { flags: ['sb5_spring_free'], resources: { wood: 6 }, questXp: 500 } }),
      O.primary('sb5_autumn', 'Release the orchard glade', 'With Tadhg broken, release the autumn stag at its binding stone in the orchard glade. Its preview: the Hollow Path to the outer road by Coill Dubh opens.', C.flag('sb5_autumn_open'), { markerSiteId: 'sb5_autumn_stone', requires: ['sb5_tadhg'], reward: { flags: ['sb5_autumn_free'], resources: { gold: 1000 }, questXp: 500 } }),
      O.primary('sb5_winter', 'Release the winter glade', 'With Tadhg broken, release the winter stag at its binding stone by the Black Mere. Its preview: the mere freezes — a short way east to the outer road.', C.flag('sb5_winter_open'), { markerSiteId: 'sb5_winter_stone', requires: ['sb5_tadhg'], reward: { flags: ['sb5_winter_free'], resources: { crystal: 3 }, questXp: 500 } }),
      O.primary('sb5_glades', 'Three glades free', 'All three seasonal glades released.', C.all(C.flag('sb5_spring_free'), C.flag('sb5_autumn_free'), C.flag('sb5_winter_free')), { reward: { flags: ['sb5_glades_free'] } }),
      O.primary('sb5_hold', 'Hold the opened clearings', `When the last glade opens, the last binder (${armyText(binderArmy)}) comes out of the Thorn Hollow against the clearings. Beat it.`, C.defeated('sb5_last_binder'), { requires: ['sb5_glades'], hint: 'It is announced and the only one left; the woodfolk on the outer road are never in its way.' }),
      O.primary('sb5_bell', 'Sound the belling stone', 'With Tadhg broken, the glades free, the woodfolk safe and the clearings held, sound the Belling Stone above Coill Dubh (500 Gold, 5 Favor).', C.activated('sb5_bell'), { markerSiteId: 'sb5_bell', requires: ['sb5_tadhg', 'sb5_glades', 'sb5_evacuation', 'sb5_hold'], completesMission: true }),
      O.optional('sb5_orchard_choice', 'The old orchard', 'After Tadhg falls, decide the old orchard’s future: a managed refuge or full regrowth. Both free the spirits.', C.any(C.flag('sb5_orchard_refuge'), C.flag('sb5_regrowth')), { markerSiteId: 'sb5_orchard' }),
      O.optional('sb5_ogres', 'The ogre holt', `Drive the ogre chieftains (${armyText(holtGuard)}) from their holt.`, C.cleared('sb5_holt'), { markerSiteId: 'sb5_holt' }),
      O.optional('sb5_fawn_visit', 'The white fawn', 'Visit the white fawn in grave-iron by the north road.', C.visited('sb5_fawn'), { markerSiteId: 'sb5_fawn' }),
    ],
    evidence: [
      { id: 'sb5_ev_tadhg', flag: 'sb5_tadhg_down', title: 'Tadhg released', text: 'Tadhg the Grey is beaten at the heart of the wood. He thanked Sadb at the end.', icon: 'evidence' },
      { id: 'sb5_ev_evac', flag: 'sb5_evacuation', title: 'The evacuation circuit', text: 'The woodwards keep the waystations of the outer road lit and stocked for the woodfolk.', icon: 'evacuation' },
      { id: 'sb5_ev_spring', flag: 'sb5_spring_free', title: 'The spring stag', text: 'The spring glade thawed; the root-runners on the north road stayed.', icon: 'branch' },
      { id: 'sb5_ev_autumn', flag: 'sb5_autumn_free', title: 'The autumn stag', text: 'The orchard glade shed its leaves; the Hollow Path opened.', icon: 'branch' },
      { id: 'sb5_ev_winter', flag: 'sb5_winter_free', title: 'The winter stag', text: 'The winter glade froze; the Black Mere bears weight.', icon: 'branch' },
      { id: 'sb5_ev_refuge', flag: 'sb5_orchard_refuge', title: 'The orchard refuge', text: 'The old orchard is kept as a managed refuge for the families of the glades.', icon: 'supply' },
      { id: 'sb5_ev_regrowth', flag: 'sb5_regrowth', title: 'Full regrowth', text: 'The wood took the orchard back. It will remember who let it.', icon: 'pact' },
    ],
    carried: ['sb5_tadhg_down', 'sb5_orchard_refuge', 'sb5_regrowth'],
    entryBonuses: [
      { fact: 'sb4_forest', label: 'The woodwards of the High Seat’s south wood know Tadhg’s paths (+8 Wood)', wallet: { wood: 8 } },
      { fact: 'sb3_reconciled', label: 'The reconciled coast sends its stores inland (2,000 Gold, 3 Crystal)', wallet: { gold: 2000, crystal: 3 } },
      { fact: 'sb3_published', label: 'The published charters bring pilgrims to the belling stone (+10 Favor)', wallet: { favor: 10 } },
    ],
    briefing: [
      CATHAL('The horned stags lead the year from the dark half to the bright. No one has heard them bell since Samhain.'),
      SADB('Because Tadhg the Grey holds the deep wood in one summer — the best one, he says, the one he remembers. Nothing falls, nothing freezes, nothing grows. It is beautiful, and it is dying.'),
      ORLA('Then we let it change, without leaving the woodfolk inside it to be changed with it. Tadhg’s host first, at the heart of the wood. Then each glade in turn — and the outer road kept open for everyone who has to leave.'),
    ],
    briefingVariants: [
      { ifFlags: ['fact:sb4_forest'], lines: [CATHAL('The woodwards we freed from Fiachra’s stockade sent word: they know every one of Tadhg’s paths.')] },
      { ifFlags: ['fact:sb4_governor'], lines: [SADB('Fiachra kept the roads to Coill Dubh open for us, as the duties on the stone require. He did it without being asked twice.')] },
      { ifFlags: ['fact:sb4_removed'], lines: [SADB('The districts kept the roads to Coill Dubh themselves, as the duties require. Slower than Fiachra’s riders — but they came.')] },
      { ifFlags: ['fact:sb3_ch_hearths'], lines: [ORLA('“In the dark half of the year every hearth answers for its neighbour’s.” The woodfolk will need ours.')] },
      { ifFlags: ['fact:sb3_reconciled'], lines: [CATHAL('The coast we reconciled sent its stores inland behind us.')] },
    ],
    victory: [
      ORLA('The stags are belling. Tonight, from the edge of the wood, I saw the mound in the east — and the plain round it, waiting for its own seasons.'),
      SADB('Tadhg is free too. He thanked me at the end.'),
    ],
    scenes: [
      { id: 'sb5_tadhg_battle', trigger: { type: 'battle_started', siteId: 'sb5_heart' }, lines: [TADHG('I was the greatest of the fian once. I have kept this wood in its best summer for a hundred years. Would you let it rot into autumn?'), ORLA('I would let it live, Tadhg.')] },
      { id: 'sb5_tadhg_down', trigger: { type: 'site_cleared', siteId: 'sb5_heart' }, lines: [SADB('Tadhg is down. He thanked me, Orla, at the end.'), ORLA('Then he is free too. Look — the grave-iron thorns round the binding stones are withering.')] },
      { id: 'sb5_spring', trigger: { type: 'objective_completed', objectiveId: 'sb5_spring' }, lines: [SADB('The thaw is running into the old stream-bed — the short way north is under water. The spring glade’s folk are already on the outer road.'), CATHAL('And the root-runners on the north road have stopped packing.')] },
      { id: 'sb5_autumn', trigger: { type: 'objective_completed', objectiveId: 'sb5_autumn' }, lines: [ORLA('The leaves are falling in the orchard glade. The thicket to the west has thinned to a path — home in half a day.'), SADB('The stags are gathering at the rutting ground by the south road.')] },
      { id: 'sb5_winter', trigger: { type: 'objective_completed', objectiveId: 'sb5_winter' }, lines: [CATHAL('The Black Mere has frozen hard. The winter glade’s folk are crossing the ice to the east road.')] },
      { id: 'sb5_binder', trigger: { type: 'flag', flag: 'sb5_glades_free' }, lines: [SADB('The last glade is open — and something is coming out of the Thorn Hollow. Bronze cairn-men, the last of Tadhg’s binders.'), ORLA('Then we hold the clearings. It is the only one left.')] },
      { id: 'sb5_held', trigger: { type: 'objective_completed', objectiveId: 'sb5_hold' }, lines: [CATHAL('The last binder is broken. Nothing in the wood is bound now.'), ORLA('Then home, to the belling stone.')] },
      { id: 'sb5_refuge', trigger: { type: 'flag', flag: 'sb5_orchard_refuge' }, lines: [SADB('The woodfolk are fencing the orchard. The children will grow up eating those apples.')] },
      { id: 'sb5_regrowth', trigger: { type: 'flag', flag: 'sb5_regrowth' }, lines: [CATHAL('Briar over the orchard wall already. Two of the stags have come to stand behind Orla.')] },
    ],
    loss: ['Orla must survive.', 'Losing Coill Dubh is recoverable while Orla has a war-band.', 'A released glade stays free; no change can close the outer road.'],
    help: [
      { id: 'sb5_wood', title: 'The deep wood', text: 'The permanent outer road circles the thicket. Two cross-paths meet at the Heart of the Wood, where Tadhg holds them; three glades hang off them. Each binding stone shows exactly which inner shortcut its release changes before you commit; nothing changes the cross-paths or the outer road.' },
      { id: 'sb5_binder_help', title: 'The last binder', text: 'Tadhg’s host is finite. One binder survives in the Thorn Hollow and comes out once, when the last glade is released.' },
    ],
  });

  // =========================================================================
  // Chapter 6 — The Door of the Mound (card 32; legacy m07)
  // =========================================================================
  const v1m07 = camp.v1('silver_branch_m07');
  const dubhghall = v1m07.sites.find((s) => s.id === 'm07_hall')?.guard?.commander;
  const ciar = v1m07.hostileHeroes[0]?.commander;
  if (!dubhghall || !ciar) throw new Error('Silver Branch v2: Dubhghall’s or Ciar’s profile is missing from the legacy content');
  const hallHost: Army = [['celtic_dread_kelpie', 2], ['celtic_elder_pooka', 20], ['celtic_elder_pooka', 20], ['celtic_great_cu_sith', 12], ['celtic_great_stag_spirit', 2], ['celtic_storm_selkie', 2]];
  const northRoadGuard: Army = [['celtic_elder_pooka', 30], ['celtic_great_cu_sith', 6]];
  const southRoadGuard: Army = [['celtic_horned_stag_spirit', 2], ['celtic_elder_pooka', 12]];
  const granaryGuard: Army = [['celtic_elder_pooka', 16], ['celtic_great_cu_sith', 4]];
  const glenGuard: Army = [['celtic_great_cu_sith', 8], ['celtic_banshee', 3]];
  const cairnGuard: Army = [['celtic_elder_pooka', 18], ['celtic_banshee', 3]];
  const houndBarrowGuard: Army = [['celtic_great_cu_sith', 10], ['celtic_elder_pooka', 12]];
  const tributePostGuard: Army = [['celtic_elder_pooka', 14], ['celtic_great_cu_sith', 4]];
  const ciarArmy: Army = [['celtic_elder_pooka', 24], ['celtic_great_cu_sith', 8], ['celtic_dread_kelpie', 2]];
  const wightArmy: Army = [['celtic_elder_pooka', 12], ['celtic_banshee', 2]];
  const sortieArmy: Army = [['celtic_great_cu_sith', 8], ['celtic_elder_pooka', 14]];
  const torGuard: Army = [['wyvern_matriarch', 3]];
  const m6 = chapter({
    campaign: camp,
    chapter: 6,
    card: 32,
    name: 'The Door of the Mound',
    summary:
      'Dubhghall offers Orla the homeland as it was before the worlds collided — if no one is ever allowed to change it. The recovered promises offer another way: renew three of the four regional obligations of the plain, reach the great mound by either barrow-road, defeat the Withered King and decide what the silver branch witnesses.',
    playtime: '85–110 minutes, 5–7 battles',
    legacy: ['silver_branch_m07'],
    economyFrom: 'silver_branch_m07',
    principal: 'sb6_dubhghall',
    soundscape: 'storm_plateau',
    hostileName: 'The Withered King’s Host',
    town: { siteId: 'sb6_town', townId: 'dun_brugh', name: 'Dún Brugh' },
    map: {
      cols: 40,
      rows: 24,
      biome: 'moor',
      base: 'plains',
      seed: 960006,
      texture: { forest: 50, rough: 50 },
      paint: [
        // The River Brugh, north to south across the west of the plain.
        { t: 'water', cells: col(13, 1, 22) },
        // The great mound: a ring of barrows round the hall, two barrow-road doors (north and south).
        { t: 'mountain', disc: [20, 12, 3] },
        { t: 'plains', disc: [20, 12, 1] },
        { t: 'plains', cells: [[20, 9], [20, 10], [20, 14], [20, 15]] },
        // Region country: heather in the north-west, the granary fields in the north-east, the tor beyond,
        // the woodland refuge in the south-east.
        { t: 'rough', blob: [7, 9, 1] },
        { t: 'rough', blob: [36, 3, 1] },
        { t: 'mountain', cells: [[37, 2], [38, 3]] },
        { t: 'forest', blob: [33, 19, 2] },
        { t: 'forest', cells: [[26, 21], [27, 21], [24, 3], [25, 4]] },
        { t: 'marsh', cells: [[12, 15], [12, 17], [14, 15], [14, 17]] },
      ],
      roads: [
        // The outer ring through the four regions.
        { via: ['sb6_town', [6, 13], [5, 6], [10, 3], 'sb6_north_bridge', [20, 3], [30, 3], [36, 8], [36, 16], [30, 21], [20, 21], 'sb6_south_bridge', [8, 20], 'sb6_town'] },
        // The two diagonals, past the mound's two barrow-road doors.
        { via: [[5, 6], [9, 7], 'sb6_west_ford', [20, 7], [27, 9], [27, 15], [32, 17]] },
        { via: [[33, 6], [28, 8], [26, 13], [22, 17], 'sb6_brugh_ford', [8, 17], 'sb6_town'] },
        // The barrow-roads into the mound.
        { via: [[20, 7], 'sb6_north_road', 'sb6_hall'] },
        { via: [[22, 17], 'sb6_south_road', [20, 13]] },
        { via: [[20, 11], 'sb6_branch'] },
        // The four obligations.
        { via: [[5, 6], 'sb6_wardens'] },
        { via: [[33, 6], 'sb6_granaries'] },
        { via: [[32, 17], 'sb6_glen'] },
        { via: [[8, 17], 'sb6_weir'] },
        // Strongholds, Ciar's tribute post and spurs.
        { via: [[9, 7], 'sb6_cairn'] },
        { via: [[27, 15], 'sb6_hound_barrow'] },
        { via: [[28, 8], 'sb6_tribute_post'] },
        { via: [[36, 16], 'sb6_refuge_band'] },
        { via: [[22, 17], 'sb6_stags'] },
        { via: [[30, 3], 'sb6_tor'] },
        { via: [[27, 9], 'sb6_grave_goods'] },
        { via: ['sb6_town', 'sb6_sawmill'] },
        { via: [[6, 13], 'sb6_quarry'] },
        { via: [[36, 8], 'sb6_crystal'] },
      ],
    },
    sites: [
      S.town('sb6_town', 'dun_brugh', [5, 19], 'Dún Brugh', 'The last fort before the barrow-plain, on the west bank of the Brugh.', [6, 18]),
      S.resource('sb6_sawmill', [3, 21], 'sawmill'),
      S.resource('sb6_quarry', [3, 13], 'quarry'),
      S.resource('sb6_crystal', [38, 9], 'crystal_deposit'),
      // The river's crossings.
      S.crossing('sb6_north_bridge', [13, 3], 'North Bridge of the Brugh', 'The ring road’s bridge over the Brugh in the north.', null),
      S.crossing('sb6_south_bridge', [13, 20], 'South Bridge of the Brugh', 'The ring road’s bridge over the Brugh in the south.', null),
      S.crossing('sb6_west_ford', [13, 8], 'Wights’ Ford', 'Where the north-west diagonal fords the Brugh toward the mound’s north door.', null),
      S.shortcut('sb6_brugh_ford', [13, 16], 'Brugh Ford', 'The old ford of the south-west diagonal, straight from Dún Brugh toward the mound’s south door. The river runs too deep for it until the weir-keepers lower the water.', ['sb6_water']),
      // The mound.
      S.crossing('sb6_north_road', [20, 9], 'Northern Barrow-road', 'The northern door into the great mound.', {
        label: 'Barrow guard',
        army: northRoadGuard,
        reward: { resources: { gold: 1000 } },
        battlefield: 'ridge_pass',
      }),
      S.crossing('sb6_south_road', [20, 15], 'Southern Barrow-road', 'The southern door, where two bound stags stand guard against their will.', {
        label: 'Bound stags',
        army: southRoadGuard,
        reward: { resources: { gold: 1000 } },
        battlefield: 'ridge_pass',
      }),
      S.landmark('sb6_hall', [20, 12], 'Hall of the Withered King', 'Dubhghall’s hall inside the great mound, where the homeland is kept as it was — and nothing is allowed to change.', 'refuge', {
        label: 'Dubhghall and the barrow court',
        army: hallHost,
        commander: dubhghall,
        reward: { flags: ['sb6_dubhghall_down'], resources: { gold: 2000 }, questXp: 2500 },
        battlefield: 'beacon_clearing',
        required: true,
      }, { objectiveIds: ['sb6_dubhghall'] }),
      S.choice(
        'sb6_branch',
        [21, 12],
        'The Silver Branch',
        'The broken silver bough in the heart of the mound, its bells silent.',
        'What the branch witnesses',
        'With the Withered King gone, the two halves of the branch lie on the stone. Every promise Orla has carried here is a promise between neighbours — the hearth, the water, the fords, the herds, the woods — and the branch only ever witnessed them. Cathal wants a High Seat again: one keeper of the duties, limited by them, answerable to the districts. Sadb wants no seat at all: a compact of local keepers, each answering for the next, with the branch passed between them.',
        [
          { label: 'A limited High Seat', summary: 'One seat, bound by the written duties and answerable to the districts; the branch is its witness. Orla gains 500 experience.', reward: { flags: ['sb_limited_seat'], questXp: 500 }, requiresFlags: ['sb6_dubhghall_down', 'sb6_three_renewed'] },
          { label: 'A compact of local keepers', summary: 'No seat: the regions keep their own obligations and answer to each other; the branch passes between them. Orla gains 500 experience.', reward: { flags: ['sb_keepers_compact'], questXp: 500 }, requiresFlags: ['sb6_dubhghall_down', 'sb6_three_renewed'] },
        ],
        { marker: 'pact', objectiveIds: ['sb6_choice'] },
      ),
      S.choice(
        'sb6_stags',
        [23, 18],
        'The Bound Stags',
        'Two horned stags in grave-iron at the southern barrow-road, guarding a door they hate.',
        'The bound stags',
        'The stags’ eyes follow Orla. They know the smell of the deep wood on her cloak — the wood she let grow back.',
        [{ label: 'Call them by the names the wood gave them', summary: 'Only if the Stags’ Wood was allowed its full regrowth. The bound stags and their pooka stand down: the southern barrow-road is open without a battle.', reward: { flags: ['sb6_stags_freed'], questXp: 500 }, requiresFlags: ['fact:sb5_regrowth'], clearsSiteIds: ['sb6_south_road'] }],
        { marker: 'pact' },
      ),
      // The four regional obligations: each changes a practical service.
      S.choice(
        'sb6_wardens',
        [4, 5],
        'Road-Wardens’ Hall',
        'The hall of the road-wardens of the north-west, whose duty was to keep the ring road safe for everyone.',
        'The road-wardens’ duty',
        'The wardens have not ridden since the Withered King’s barrow-wights came up out of the cairn by the ford. “Give us waymarks and lanterns,” their captain says, “and we will keep the road again — the cairn’s wights will not walk it while we do.”',
        [{ label: 'Renew the road-wardens’ duty', summary: 'Costs 800 Gold and 4 Stone. Safe roads: the wardens ride the ring road and the Wights’ Cairn stands down — its wights withdraw for good.', cost: { gold: 800, stone: 4 }, reward: { flags: ['sb6_roads'], questXp: 600 }, clearsSiteIds: ['sb6_cairn'] }],
        { marker: 'pact', objectiveIds: ['sb6_obligations'] },
      ),
      S.choice(
        'sb6_granaries',
        [34, 6],
        'Granaries of the North-East',
        'The plain’s granaries, where Ciar’s tribute-takers count every sack for the Withered King.',
        'The grain-share',
        'With the tribute-takers gone, the granary-keepers open the doors. “The grain-share was always the plain’s: the granaries feed whoever keeps the roads to them. Seed for the spring, and we will feed your war-band now.”',
        [{ label: 'Renew the grain-share', summary: 'Costs 600 Gold and 6 Wood for the seed. Grain: +2,500 Gold of stores now and 12 Elder Pooka of the granary levy join Orla.', cost: { gold: 600, wood: 6 }, reward: { flags: ['sb6_grain'], resources: { gold: 2500 }, creatures: [{ creatureId: 'celtic_elder_pooka', count: 12 }], questXp: 600 } }],
        { guard: { label: 'Ciar’s tribute-takers', army: granaryGuard.map(([creatureId, count]) => ({ creatureId, count })), reward: { resources: { gold: 600 } }, battlefield: 'open_field' }, marker: 'supply' },
      ),
      S.choice(
        'sb6_glen',
        [32, 18],
        'Refuge Glen',
        'The woodland refuge of the south-east, where the plain’s folk shelter in the dark half of the year. Barrow-hounds lie at its mouth.',
        'The refuge',
        'With the barrow-hounds driven off, the refuge-keepers count the families who are left. “The refuge was promised to every hearth on the plain. Mend the shelters and it will take them all — and the woodland folk who live with us will lend you one band.”',
        [
          { label: 'Renew the refuge', summary: 'Costs 500 Gold and 4 Wood. Refuge: the plain’s families shelter in the glen, and its mixed woodland band can be hired once (beside the glen).', cost: { gold: 500, wood: 4 }, reward: { flags: ['sb6_refuge'], questXp: 600 } },
          { label: 'Renew it with the orchard-folk', summary: 'Only if the old orchard of the Stags’ Wood was kept as a refuge: its keepers show the glen how. No cost. Refuge: the families shelter and the woodland band can be hired once.', reward: { flags: ['sb6_refuge'], questXp: 800 }, requiresFlags: ['fact:sb5_orchard_refuge'] },
        ],
        { guard: { label: 'Barrow-hounds at the glen', army: glenGuard.map(([creatureId, count]) => ({ creatureId, count })), reward: { resources: { gold: 600 } }, battlefield: 'grove' }, marker: 'evacuation' },
      ),
      S.choice(
        'sb6_weir',
        [10, 16],
        'Weir of the Brugh',
        'The weir-keepers’ house above the Brugh, by the old ford of the south-west diagonal.',
        'The weir-keepers’ duty',
        'The weir-keepers kept the Brugh low enough to ford in every season — until the Withered King’s winter. “Mend the sluices and we will keep the water as we always did: low at the ford, full at the mill.”',
        [{ label: 'Renew the weir-keepers’ duty', summary: 'Costs 500 Gold and 5 Stone. Water: the Brugh drops at the old ford — the straight way from Dún Brugh toward the mound’s south door opens.', cost: { gold: 500, stone: 5 }, reward: { flags: ['sb6_water'], questXp: 600 } }],
        { marker: 'supply' },
      ),
      S.choice(
        'sb6_refuge_band',
        [37, 18],
        'The Woodland Refuge’s Band',
        'The mixed woodland folk of the refuge glen: afancs from its pools, root-runners from its roots, centaurs from its meadows.',
        'One band from the refuge',
        'The refuge can spare one band and no more; the rest stay to guard the families. Whoever goes with Orla is drawn from the same few.',
        [
          { label: '5 Afancs', summary: 'Costs 1,150 Gold. 5 Afancs join Orla.', cost: { gold: 1150 }, reward: { creatures: [{ creatureId: 'afanc', count: 5 }] }, requiresFlags: ['sb6_refuge'] },
          { label: '8 Root-Runners', summary: 'Costs 880 Gold. 8 Root-Runners join Orla.', cost: { gold: 880 }, reward: { creatures: [{ creatureId: 'root_runner', count: 8 }] }, requiresFlags: ['sb6_refuge'] },
          { label: '6 Centaur Sentinels', summary: 'Costs 1,500 Gold. 6 Centaur Sentinels join Orla.', cost: { gold: 1500 }, reward: { creatures: [{ creatureId: 'centaur_sentinel', count: 6 }] }, requiresFlags: ['sb6_refuge'] },
        ],
        { art: 'neutral_dwelling.root_runner', marker: 'pact' },
      ),
      // Dubhghall's strongholds and Ciar's tribute post.
      S.landmark('sb6_cairn', [8, 10], 'Wights’ Cairn', 'A stronghold of the Withered King by the Wights’ Ford. Its barrow-wights walk the north-western ring road.', 'refuge', {
        label: 'Cairn wights',
        army: cairnGuard,
        reward: { resources: { gold: 1000 } },
        battlefield: 'ridge_pass',
      }),
      S.landmark('sb6_hound_barrow', [28, 17], 'Hound Barrow', 'A stronghold of the Withered King in the south-east. Its barrow-hounds wait for the order to ride.', 'refuge', {
        label: 'Barrow-hound pack',
        army: houndBarrowGuard,
        reward: { resources: { gold: 1000 } },
        battlefield: 'ridge_pass',
      }),
      S.landmark('sb6_tribute_post', [29, 7], 'Tribute Post', 'Where Ciar counts the plain’s tribute on its way into the mound. Cut it and his warband has nothing to collect.', 'refuge', {
        label: 'Tribute guard',
        army: tributePostGuard,
        reward: { flags: ['sb6_tribute_cut'], resources: { gold: 1000 } },
        battlefield: 'open_field',
      }),
      S.landmark('sb6_tor', [32, 2], 'Wyvern Tor', 'Wyverns roost on a tor above the north-eastern road.', 'nest', { label: 'Tor wyverns', army: torGuard, reward: { resources: { crystal: 6 } }, battlefield: 'grove' }),
      S.pickup('sb6_grave_goods', [27, 11], 'Grave-goods of the Old Kings', 'Goods left with the old kings of the barrow-plain.', { resources: { gold: 1500, crystal: 3 } }),
    ],
    patrols: [
      {
        commander: ciar,
        start: [28, 6],
        waypoints: [[33, 7], [27, 9], [21, 7], [27, 9]],
        army: ciarArmy,
        home: 'sb6_tribute_post',
        radius: 8,
        purpose: 'Ciar rides the tribute route between the granaries and the mound’s north door, and has announced the day he collects the granaries’ tribute. Cutting the route at the Tribute Post sends his warband back under the mound for good.',
      },
      {
        commander: band('sb6_wights', 'Barrow-Wights', 'creature.celtic.tier4.base.portrait'),
        monster: true,
        bounty: { gold: 500 },
        start: [9, 9],
        waypoints: [[6, 6], [10, 3], [9, 9]],
        army: wightArmy,
        home: 'sb6_cairn',
        radius: 6,
        threshold: [3, 2],
        purpose: 'Walk the north-western ring road from the Wights’ Cairn. Renewing the road-wardens’ duty — or taking the cairn — ends them.',
      },
      {
        commander: band('sb6_sortie', 'The Withered King’s Sortie', 'creature.celtic.tier2.upgraded.portrait'),
        monster: true,
        bounty: { gold: 600 },
        start: [27, 18],
        waypoints: [[20, 20], [13, 20], [8, 19], [20, 20]],
        army: sortieArmy,
        home: 'sb6_hound_barrow',
        dormantUntil: 'sb6_first_renewal',
        threshold: [3, 2],
        purpose: 'When the first obligation is renewed, Dubhghall sends this pack from the Hound Barrow along the southern ring road toward Dún Brugh — once. Taking the Hound Barrow first means it never rides.',
      },
    ],
    objectives: [
      O.primary(
        'sb6_obligations',
        'Renew three of four obligations',
        `Renew three of the plain’s four regional obligations, each a practical service: safe roads at the Road-Wardens’ Hall; water at the Weir of the Brugh; grain at the Granaries (held by Ciar’s tribute-takers, ${armyText(granaryGuard)}); refuge at the Refuge Glen (held by barrow-hounds, ${armyText(glenGuard)}).`,
        C.atLeast(3, C.flag('sb6_water'), C.flag('sb6_roads'), C.flag('sb6_grain'), C.flag('sb6_refuge')),
        { reward: { flags: ['sb6_three_renewed'] }, hint: 'Each renewal changes the plain: the wardens end the wights’ walks, the weir-keepers open the Brugh Ford, the granaries feed the war-band, the refuge shelters the families and lends a band.' },
      ),
      O.primary(
        'sb6_door',
        'Reach the mound',
        `Open a door into the great mound: the Northern Barrow-road (${armyText(northRoadGuard)}) past the Wights’ Ford, or the Southern Barrow-road with its bound stags (${armyText(southRoadGuard)}) by the south bridge or the Brugh Ford.`,
        C.any(C.flag('sb6_stags_freed'), C.cleared('sb6_south_road'), C.cleared('sb6_north_road')),
      ),
      O.primary('sb6_dubhghall', 'The Withered King', `Defeat Dubhghall and the barrow court (${armyText(hallHost)}) in his hall inside the mound.`, C.cleared('sb6_hall'), { markerSiteId: 'sb6_hall' }),
      O.primary(
        'sb6_choice',
        'What the branch witnesses',
        'With three obligations renewed and the Withered King defeated, decide at the silver branch: a limited High Seat or a compact of local keepers.',
        C.any(C.flag('sb_limited_seat'), C.flag('sb_keepers_compact')),
        { markerSiteId: 'sb6_branch', requires: ['sb6_obligations', 'sb6_dubhghall'], completesMission: true },
      ),
      O.optional('sb6_first', 'The first renewal', 'Renew a first obligation (Dubhghall answers with his sortie from the Hound Barrow).', C.atLeast(1, C.flag('sb6_water'), C.flag('sb6_roads'), C.flag('sb6_grain'), C.flag('sb6_refuge')), { reward: { flags: ['sb6_first_renewal'] } }),
      O.optional('sb6_all_four', 'All four obligations', 'Renew the fourth obligation as well.', C.all(C.flag('sb6_water'), C.flag('sb6_roads'), C.flag('sb6_grain'), C.flag('sb6_refuge'))),
      O.optional('sb6_tribute', 'Cut the tribute route', `Take the Tribute Post (${armyText(tributePostGuard)}) or beat Ciar (${armyText(ciarArmy)}): his warband stops collecting for the mound.`, C.any(C.cleared('sb6_tribute_post'), C.defeated('celtic_ciar')), { markerSiteId: 'sb6_tribute_post' }),
      O.optional('sb6_grain_full', 'The granaries’ full share', 'Renew the grain-share before Ciar’s announced tribute day: +1,500 Gold more.', C.flag('sb6_grain'), { markerSiteId: 'sb6_granaries', reward: { resources: { gold: 1500 } } }),
      O.optional('sb6_strongholds', 'Dubhghall’s strongholds', `Take the Wights’ Cairn (${armyText(cairnGuard)}) and the Hound Barrow (${armyText(houndBarrowGuard)}): no more forces leave them.`, C.all(C.cleared('sb6_cairn'), C.cleared('sb6_hound_barrow')), { markerSiteId: 'sb6_hound_barrow' }),
      O.optional('sb6_wyverns', 'Wyvern Tor', `Drive the wyverns (${armyText(torGuard)}) from the tor.`, C.cleared('sb6_tor'), { markerSiteId: 'sb6_tor' }),
    ],
    timers: [
      {
        id: 'sb6_tribute_day',
        label: 'Ciar’s tribute day at the granaries',
        startWhen: C.all(),
        days: 8,
        metWhen: C.any(C.flag('sb6_grain'), C.cleared('sb6_tribute_post'), C.defeated('celtic_ciar')),
        consequence: 'Ciar carries the granaries’ tribute into the mound: renewing the grain-share later gives only its base share (the 1,500 Gold bonus is lost). The obligation itself can still be renewed.',
        announce: 'Ciar has sent word to the granaries: the barrow tribute is collected in eight days.',
        onExpire: { flags: ['sb6_tribute_taken'], failObjectives: ['sb6_grain_full'] },
      },
    ],
    evidence: [
      { id: 'sb6_ev_roads', flag: 'sb6_roads', title: 'Safe roads', text: 'The road-wardens ride the ring road again; the Wights’ Cairn stood down.', icon: 'pact' },
      { id: 'sb6_ev_water', flag: 'sb6_water', title: 'Water', text: 'The weir-keepers keep the Brugh low at the old ford and full at the mill.', icon: 'pact' },
      { id: 'sb6_ev_grain', flag: 'sb6_grain', title: 'Grain', text: 'The granaries feed whoever keeps the roads to them — the plain’s grain-share is renewed.', icon: 'supply' },
      { id: 'sb6_ev_refuge', flag: 'sb6_refuge', title: 'Refuge', text: 'The refuge glen shelters every hearth of the plain in the dark half of the year.', icon: 'evacuation' },
      { id: 'sb6_ev_dubhghall', flag: 'sb6_dubhghall_down', title: 'The Withered King', text: 'Dubhghall is defeated in his hall; the homeland he kept unchanged can change again.', icon: 'evidence' },
      { id: 'sb6_ev_seat', flag: 'sb_limited_seat', title: 'A limited High Seat', text: 'One seat, bound by written duties and answerable to the districts. The silver branch witnesses it.', icon: 'branch' },
      { id: 'sb6_ev_compact', flag: 'sb_keepers_compact', title: 'A compact of keepers', text: 'No seat: the regions keep their own obligations and answer to one another. The branch passes between them.', icon: 'branch' },
    ],
    carried: ['sb_limited_seat', 'sb_keepers_compact'],
    entryBonuses: [
      { fact: 'sb4_market', label: 'The market district’s written duty: its levy of coin (2,500 Gold)', wallet: { gold: 2500 } },
      { fact: 'sb4_pasture', label: 'The pasture district’s written duty: drovers’ hounds hold Dún Brugh (10 Great Cú Sith)', garrison: [{ creatureId: 'celtic_great_cu_sith', count: 10 }] },
      { fact: 'sb4_forest', label: 'The forest district’s written duty: woodwards hold Dún Brugh (16 Elder Pooka)', garrison: [{ creatureId: 'celtic_elder_pooka', count: 16 }] },
      { fact: 'sb2_farms_moved', label: 'The kelpies of Loch Eala keep their bargain (3 Dread Kelpies join Orla)', heroArmy: [{ creatureId: 'celtic_dread_kelpie', count: 3 }] },
      { fact: 'sb3_reconciled', label: 'The reconciled coast’s maritime supply (4 Storm Selkies join Orla)', heroArmy: [{ creatureId: 'celtic_storm_selkie', count: 4 }] },
      { fact: 'sb5_regrowth', label: 'The regrown wood stands with Orla (2 Great Stag Spirits)', heroArmy: [{ creatureId: 'celtic_great_stag_spirit', count: 2 }] },
    ],
    briefing: [
      ORLA('The great mound. Every door to the Otherworld opened from here once — at Samhain and at Beltane. Dubhghall has made it his hall, and the broken branch is inside.'),
      DUBHGHALL('Come in, druid. I offer you the homeland as it was before the worlds collided — every hearth, every ford, every wood exactly as you remember it. Only promise me that no one will ever change it.'),
      SADB('A homeland nobody may change is a homeland nobody may keep. The plain had four obligations — roads, water, grain, refuge — and the old promises say they were kept by its own people.'),
      CATHAL('Renew three, and the plain will stand behind us. Ciar rides the tribute route to the granaries; the Withered King’s strongholds will answer anything we mend. Two barrow-roads reach the mound — north and south.'),
    ],
    briefingVariants: [
      { ifFlags: ['fact:sb4_market'], lines: [CATHAL('The market district sent its levy of coin, as the duties on the inauguration stone require.')] },
      { ifFlags: ['fact:sb4_pasture'], lines: [CATHAL('The drovers’ hounds are on Dún Brugh’s walls — the pasture district’s written duty.')] },
      { ifFlags: ['fact:sb4_forest'], lines: [CATHAL('The woodwards came out of the three valleys to hold Dún Brugh for us — the forest district’s written duty.')] },
      { ifFlags: ['fact:sb4_governor'], lines: [SADB('Fiachra sent riders to say the roads behind us are kept. He did not have to be asked. The duties hold him.')] },
      { ifFlags: ['fact:sb2_farms_moved'], lines: [SADB('The kelpies of Loch Eala swam up the Brugh to join us. They remember who gave them their road back.')] },
      { ifFlags: ['fact:sb3_reconciled'], lines: [CATHAL('And the storm selkies of the coast came inland — the coast we reconciled keeps its word.')] },
      { ifFlags: ['fact:sb5_regrowth'], lines: [ORLA('The stags of the deep wood followed us out of the trees. The wood remembers who let it grow.')] },
      { ifFlags: ['fact:sb5_orchard_refuge'], lines: [SADB('The orchard-folk of the Stags’ Wood came too. They know how a refuge is kept.')] },
    ],
    victory: [
      ORLA('The year has turned. I felt it — like a door swinging open in a warm wind. And it was not the branch that turned it; it was everyone who kept a promise to get us here.'),
      SADB('The branch is a witness again. Not a key, not a crown.'),
    ],
    scenes: [
      { id: 'sb6_first', trigger: { type: 'flag', flag: 'sb6_first_renewal' }, lines: [CATHAL('The first obligation is renewed — and the Withered King has noticed. A pack is riding out of the Hound Barrow toward the southern ring road.'), ORLA('Then Dún Brugh’s walls had better be manned.')] },
      { id: 'sb6_tribute_cut', trigger: { type: 'flag', flag: 'sb6_tribute_cut' }, lines: [CIAR('No tribute, no warband. I keep the road between the summer stone and the winter stone, druid; I do not die for an empty cart.'), SADB('Ciar is riding back under the mound.')] },
      { id: 'sb6_tribute_taken', trigger: { type: 'flag', flag: 'sb6_tribute_taken' }, lines: [CATHAL('Ciar took the granaries’ tribute into the mound. The grain-share can still be renewed — only thinner.')] },
      { id: 'sb6_ciar_battle', trigger: { type: 'battle_started', heroDefinitionId: 'celtic_ciar' }, lines: [CIAR('The tribute keeps the door, druid. Without it the mound is only a hill.'), ORLA('Then let it be a hill.')] },
      { id: 'sb6_ford', trigger: { type: 'flag', flag: 'sb6_water' }, lines: [SADB('The weir-keepers have lowered the Brugh. The old ford is knee-deep — straight to the mound’s south door.')] },
      { id: 'sb6_roads', trigger: { type: 'flag', flag: 'sb6_roads' }, lines: [CATHAL('The wardens are lighting the waymarks. The wights are going back into their cairn.')] },
      { id: 'sb6_stags', trigger: { type: 'flag', flag: 'sb6_stags_freed' }, lines: [ORLA('They heard their names. The iron is off, and the southern door is open.')] },
      { id: 'sb6_dubhghall_battle', trigger: { type: 'battle_started', siteId: 'sb6_hall' }, lines: [DUBHGHALL('Every summer ends, druid. I only made sure nothing else would.'), ORLA('And every winter ends. I am here to make sure of that.')] },
      { id: 'sb6_fallen', trigger: { type: 'site_cleared', siteId: 'sb6_hall' }, lines: [ORLA('He is gone. The branch is here, in two halves. One last thing to decide, and it is not mine alone.')] },
      // Who accepts the arrangement, and which place is shown recovering, follow the earlier choices.
      { id: 'sb6_seat_governor', trigger: { type: 'flag', flag: 'sb_limited_seat' }, ifFlags: ['fact:sb4_governor'], lines: [FIACHRA('(at the mound, under the districts’ banners) A seat bound by duties. I have governed under such a stone; whoever sits it next will learn what I learned.')] },
      { id: 'sb6_seat_removed', trigger: { type: 'flag', flag: 'sb_limited_seat' }, ifFlags: ['fact:sb4_removed'], lines: [CATHAL('The districts that took the Seat from Fiachra will choose who sits it now — and they will hold the stone up to whoever it is.')] },
      { id: 'sb6_compact_governor', trigger: { type: 'flag', flag: 'sb_keepers_compact' }, ifFlags: ['fact:sb4_governor'], lines: [FIACHRA('No seat at all. Then I keep the roads of the three valleys, and answer to the drovers like everyone else. I have done worse.')] },
      { id: 'sb6_compact_removed', trigger: { type: 'flag', flag: 'sb_keepers_compact' }, ifFlags: ['fact:sb4_removed'], lines: [SADB('The districts that removed Fiachra already keep the Seat’s duties between them. The compact only says out loud what they are doing.')] },
      { id: 'sb6_coast_published', trigger: { type: 'flag', flag: 'sb6_dubhghall_down' }, ifFlags: ['fact:sb3_published'], lines: [SADB('The coast has had the charters for a season. Whatever we choose here, they will read it against the charter of the kings.')] },
      { id: 'sb6_coast_reconciled', trigger: { type: 'flag', flag: 'sb6_dubhghall_down' }, ifFlags: ['fact:sb3_reconciled'], lines: [CATHAL('The headland folk sent a currach up the Brugh to hear what we decide. Their stores are already on the way.')] },
      { id: 'sb6_recover_hearth', trigger: { type: 'objective_completed', objectiveId: 'sb6_choice' }, ifFlags: ['fact:sb1_feast'], lines: [SADB('Word from Dún Caill: the hearth has not gone out once since the feast, and the herders are back at the booley.')] },
      { id: 'sb6_recover_road', trigger: { type: 'objective_completed', objectiveId: 'sb6_choice' }, ifFlags: ['fact:sb1_road'], lines: [CATHAL('Word from Dún Caill: the carts run on the outer road all year now, and the market at the green is twice the size.')] },
      { id: 'sb6_recover_loch', trigger: { type: 'objective_completed', objectiveId: 'sb6_choice' }, ifFlags: ['fact:sb2_channel'], lines: [ORLA('And at Loch Eala the barley stands beside the new channel, with the kelpies swimming past it.')] },
      { id: 'sb6_recover_loch_moved', trigger: { type: 'objective_completed', objectiveId: 'sb6_choice' }, ifFlags: ['fact:sb2_farms_moved'], lines: [ORLA('And at Loch Eala the old channel runs full; the farms on the high ground had their first harvest.')] },
      { id: 'sb6_recover_orchard', trigger: { type: 'objective_completed', objectiveId: 'sb6_choice' }, ifFlags: ['fact:sb5_orchard_refuge'], lines: [SADB('The orchard refuge in the Stags’ Wood is full of children and apples.')] },
      { id: 'sb6_recover_wood', trigger: { type: 'objective_completed', objectiveId: 'sb6_choice' }, ifFlags: ['fact:sb5_regrowth'], lines: [CATHAL('The deep wood has swallowed the old orchard wall already. The stags bell every evening.')] },
    ],
    loss: ['Orla must survive.', 'Losing Dún Brugh is recoverable while Orla has a war-band.', 'A renewed obligation is never undone; Dubhghall’s sorties are finite.'],
    help: [
      { id: 'sb6_plain', title: 'The barrow-plain', text: 'An outer ring and two diagonals join the four regions round the great mound; the River Brugh crosses the west of the plain at two bridges and the Wights’ Ford. Two barrow-roads lead into the mound: the northern from the Wights’ Ford diagonal, the southern from the south bridge — or straight from Dún Brugh over the Brugh Ford once the weir-keepers lower the water.' },
      { id: 'sb6_pressure', title: 'Ciar and the strongholds', text: 'Ciar rides the tribute route to the granaries and collects on the announced day; cutting the route at the Tribute Post ends his rides. The Wights’ Cairn sends its wights along the north-western ring road; the Hound Barrow sends one sortie when the first obligation is renewed. Taking a stronghold ends what it sends.' },
    ],
  });

  return {
    missions: [m1, m2, m3, m4, m5, m6],
    chapters: [
      { missionId: m1.id, chapter: 1, requiresAll: [], legacyMissionIds: ['silver_branch_m01'], briefingArt: m1.briefingArt! },
      { missionId: m2.id, chapter: 2, requiresAll: [m1.id], legacyMissionIds: ['silver_branch_m02', 'silver_branch_m03'], briefingArt: m2.briefingArt! },
      { missionId: m3.id, chapter: 3, requiresAll: [m2.id], legacyMissionIds: ['silver_branch_m04'], briefingArt: m3.briefingArt! },
      { missionId: m4.id, chapter: 4, requiresAll: [m2.id], legacyMissionIds: ['silver_branch_m05'], briefingArt: m4.briefingArt! },
      { missionId: m5.id, chapter: 5, requiresAll: [m3.id, m4.id], legacyMissionIds: ['silver_branch_m06'], briefingArt: m5.briefingArt! },
      { missionId: m6.id, chapter: 6, requiresAll: [m5.id], legacyMissionIds: ['silver_branch_m07'], briefingArt: m6.briefingArt! },
    ],
    epilogue: {
      // The campaign cover, not a v1 ending picture: the v1 endings show a mended or a planted branch,
      // and neither scene matches a limited High Seat or a compact of keepers.
      art: 'campaign.silver_branch.cover',
      lines: [
        SADB('The cattle went out to the summer grazing this morning. Late — but they went, and the booley’s rents stayed with the herders.'),
        CATHAL('A cold hearth, an iron boar, a loch of water-horses, a hall under the sea, a High Seat, a wood full of stags and a king who wanted nothing to change. The bards will be at it for a hundred years.'),
      ],
      variants: [
        { flag: 'sb_limited_seat', lines: [CATHAL('There is a High Seat again — one seat, with the duties cut under its name and the districts watching who sits it.'), ORLA('And the branch hangs above it as a witness. If the Seat breaks the promises, anyone can point at the branch and say so.')] },
        { flag: 'sb_keepers_compact', lines: [SADB('No seat at all: the woodcutters keep the timber, the weir-keepers the water, the drovers the herds, and each answers to the next.'), ORLA('The branch goes round the keepers from Samhain to Beltane, hall to hall. Slower than a king. Nobody owns it.')] },
      ],
    },
  };
}
