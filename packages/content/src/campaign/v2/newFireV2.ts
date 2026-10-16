/**
 * The New Fire, content v2 (campaign expansion handoff 2026-10-15; review cards
 * 33–37): five chapters carrying the seven legacy chapters.
 *
 *   1  The Cold Altar and the Black Jaguars (legacy m01 + m02) — Xochitla and
 *      Tepeyolo face each other across a crescent lake; the short causeway, the
 *      long jungle ridge and the canoe crossing make a triangle round the altar
 *      peninsula, which the causeway and the reed shallows both reach.
 *   2  The House of Eagles and the House of Bats (legacy m03 + m04) — Ocelotepec on
 *      the western ridge, the House of Bats on the lake's central island; the
 *      northern stairs, the southern shore road and two canoe routes make
 *      overlapping circuits; the eagle terrace is reached before or after the lake.
 *   3  The Lord of Itzcalli (legacy m05) — Itzcalli on its central lake platform;
 *      the cacao, stone and reed districts make a triangular shore network (shore
 *      roads, reed boats and the canal lock); two principal causeways reach the
 *      platform; the far ridge is a slow protected way round.
 *   4  The Fire Mountain (legacy m06) — a volcanic ring: a safe outer road, three
 *      radial approaches (quarry road, forest saddle, ash ravine) and two mid-slope
 *      cross-links; the release the player starts closes the lava tube shortcut and
 *      opens the cooled flow.
 *   5  The Smoking Gate (legacy m07) — four city basins round the obsidian ridge,
 *      an outer caravan circuit and two inner passes; the Smoking Gate has a direct
 *      fortified approach and a long one through the evening-star basin.
 *
 * Order: 1 → 2 → {3, 4 in either order} → 5. Chapters 3 and 4 read each other's
 * facts (`fact:<flag>`) only in dialogue, so neither names what has not happened
 * and neither needs the other's reward. The existing cast only (Itzel, Chimal,
 * Grandmother Xoco, Tecuani, Acatl, Mazatl, Tlacatl, Itztli). Values are proposed
 * and unplaytested; each chapter's economy comes from the legacy chapter it carries
 * first.
 */
import type { CommanderSpec, MissionDefinition, ObjectiveCondition } from '@pr/rules';
import { speaker } from '../arc';
import { C, O, S, armyText, chapter, type Army, type V2Campaign } from './kit';
import type { V2Built } from './index';

const P = 'mesoamerican';
const ITZEL = speaker(P, 'Itzel');
const CHIMAL = speaker(P, 'Chimal');
const XOCO = speaker(P, 'Grandmother Xoco', 'xoco');
const ITZTLI = speaker(P, 'Itztli');
const TECUANI = speaker(P, 'Tecuani');
const ACATL = speaker(P, 'Acatl');
const MAZATL = speaker(P, 'Mazatl');
const TLACATL = speaker(P, 'Tlacatl');

/** A band without a commander (raiders, levies, reserves): its portrait is a creature's. */
function band(id: string, name: string, portrait: string): CommanderSpec {
  return { heroDefinitionId: id, name, classId: 'champion', level: 1, attributes: { attack: 0, defense: 0, power: 0, knowledge: 0 }, skills: [], spellbook: false, spellIds: [], mana: 0, portraitAssetId: portrait };
}
const CULTIST_PORTRAIT = 'creature.neutral.brigand.upgraded.portrait';
const SERPENT_PORTRAIT = 'creature.mesoamerican.tier1.upgraded.portrait';
const MINOR_GOD: ObjectiveCondition = { type: 'player_has_minor_god' };

export function buildNewFireV2(camp: V2Campaign): V2Built {
  // =========================================================================
  // Chapter 1 — The Cold Altar and the Black Jaguars (card 33; legacy m01 + m02)
  // =========================================================================
  const v1m02 = camp.v1('new_fire_m02');
  const pack = v1m02.hostileHeroes[0]?.commander;
  if (!pack) throw new Error('New Fire v2: the black jaguars’ profile is missing from the legacy content');
  const causewayGuard: Army = [['wild_boar', 8]];
  const canoeHouseGuard: Army = [['brigand', 10], ['brigand_cutthroat', 3]];
  const ridgeCampGuard: Army = [['brigand', 10], ['brigand_cutthroat', 4]];
  const altarGuard: Army = [['brigand', 14], ['brigand_cutthroat', 4]];
  const denGuard: Army = [['mesoamerican_sun_jaguar', 3], ['mesoamerican_jaguar_spirit', 6]];
  const packArmy: Army = [['mesoamerican_sun_jaguar', 5], ['mesoamerican_jaguar_spirit', 9]];
  const raiderArmy: Army = [['brigand', 8], ['brigand_cutthroat', 3]];
  const m1base = chapter({
    campaign: camp,
    chapter: 1,
    card: 33,
    name: 'The Cold Altar and the Black Jaguars',
    summary:
      'Xochitla’s fire died before the appointed night, the road to Tepeyolo is cut and black jaguars driven from the old altar raid the cacao groves. Restore a safe route between the two lake towns, end the jaguar attacks and recover the altar’s ember record.',
    playtime: '60–80 minutes, 4–5 battles',
    legacy: ['new_fire_m01', 'new_fire_m02'],
    economyFrom: 'new_fire_m01',
    principal: 'nf1_record',
    soundscape: 'jungle',
    hostileName: 'The Night-Knife’s Host',
    town: { siteId: 'nf1_town', townId: 'xochitla', name: 'Xochitla' },
    map: {
      cols: 34,
      rows: 20,
      biome: 'jungle',
      base: 'plains',
      seed: 970001,
      texture: { forest: 110, rough: 30 },
      paint: [
        // The long jungle ridge along the north, with its crags.
        { t: 'forest', rect: [1, 1, 32, 3] },
        { t: 'mountain', cells: [[3, 1], [4, 1], [11, 1], [12, 1], [20, 1], [21, 1], [29, 1], [30, 1], [12, 2], [21, 2]] },
        { t: 'rough', cells: [[8, 2], [9, 2], [24, 2], [25, 2], [16, 3], [18, 3]] },
        // The crescent lake round the altar peninsula, open to the jungle hills in the south.
        { t: 'water', blob: [17, 11, 6] },
        { t: 'water', rect: [12, 6, 22, 18] },
        { t: 'water', rect: [11, 8, 23, 16] },
        { t: 'mountain', blob: [14, 17, 2] },
        // The altar peninsula; the short causeway joins it to the west shore, the reed shallows to the east.
        { t: 'plains', disc: [17, 11, 2] },
        { t: 'marsh', line: [[10, 11], [15, 11]], width: 0 },
        { t: 'marsh', line: [[19, 12], [25, 14]], width: 0 },
        { t: 'marsh', cells: [[22, 14], [23, 14], [24, 15], [21, 12]] },
        // The priests’ old processional stair from the ridge down to the peninsula’s north tip.
        { t: 'marsh', line: [[17, 5], [17, 8]], width: 0 },
        // Cacao groves on both shores; jungle hills closing the south.
        { t: 'forest', blob: [4, 16, 2] },
        { t: 'forest', blob: [29, 16, 2] },
        { t: 'mountain', cells: [[1, 18], [2, 18], [31, 18], [32, 18], [10, 18], [24, 18]] },
        { t: 'marsh', cells: [[9, 14], [10, 15], [26, 12]] },
      ],
      roads: [
        // The long jungle ridge: Xochitla – ridge – Tepeyolo.
        { via: ['nf1_town', [7, 5], [10, 3], [17, 4], [24, 4], [27, 6], 'nf1_tepeyolo'] },
        // The short causeway to the altar peninsula.
        { via: ['nf1_town', [9, 11], 'nf1_causeway', 'nf1_altar'] },
        // The reed shallows from the peninsula to the east shore.
        { via: ['nf1_altar', [20, 12], [24, 14], [27, 12], 'nf1_tepeyolo'] },
        // The canoe crossing: Tepeyolo's landing – the peninsula landing.
        { via: ['nf1_tepeyolo', 'nf1_canoe_east'] },
        { via: ['nf1_canoe_west', 'nf1_altar'] },
        // The processional stair (opened once the altar is retaken).
        { via: [[17, 4], 'nf1_stair', 'nf1_altar'] },
        // Spurs.
        { via: [[10, 3], 'nf1_quarry'] },
        { via: [[17, 4], 'nf1_raider_camp'] },
        { via: [[24, 4], 'nf1_shipment'] },
        { via: [[24, 4], 'nf1_pyramid'] },
        { via: ['nf1_tepeyolo', 'nf1_canoe_house'] },
        { via: [[27, 12], 'nf1_provisions'] },
        { via: [[27, 12], 'nf1_east_grove'] },
        { via: ['nf1_town', 'nf1_hearth'] },
        { via: ['nf1_town', 'nf1_sawmill'] },
        { via: ['nf1_town', 'nf1_west_grove'] },
        { via: [[9, 11], 'nf1_spring_ward'] },
        { via: [[7, 5], 'nf1_shrine'] },
      ],
    },
    sites: [
      S.town('nf1_town', 'xochitla', [5, 10], 'Xochitla', 'Itzel’s city of flower terraces on the west shore of the crescent lake. Its hearths went cold before the appointed night.', [6, 10]),
      S.town('nf1_tepeyolo', 'tepeyolo', [29, 10], 'Tepeyolo', 'A cacao town on the east shore, facing Xochitla across the lake. Cut off since the canoes stopped running.', [28, 10]),
      S.resource('nf1_sawmill', [2, 13], 'sawmill'),
      S.resource('nf1_quarry', [9, 1], 'quarry'),
      S.resource('nf1_crystal', [31, 3], 'crystal_deposit'),
      // The triangle: the short causeway, the canoe crossing, the long ridge.
      S.crossing('nf1_causeway', [12, 11], 'Lake Causeway', 'The short causeway from Xochitla to the altar peninsula. A herd of peccaries, starved and penned on it, holds it.', {
        label: 'Causeway peccaries',
        army: causewayGuard,
        reward: { resources: { gold: 300, wood: 3, stone: 3 } },
        battlefield: 'coast_road',
      }),
      S.landmark('nf1_canoe_house', [27, 8], 'Canoe House', 'Tepeyolo’s canoe house. Black-painted cultists sit on the paddles and let nothing cross.', 'refuge', {
        label: 'Canoe-house cultists',
        army: canoeHouseGuard,
        reward: { flags: ['nf1_canoes_free'], resources: { gold: 600, favor: 3 } },
        battlefield: 'coast_road',
      }, { marker: 'supply' }),
      S.ferry('nf1_canoe_east', [25, 9], 'Tepeyolo Canoe Landing', 'Tepeyolo’s canoes cross the east arm of the lake to the altar peninsula.', 'nf1_canoe_west', { flag: 'nf1_canoes_free', reason: 'The cultists hold the paddles: drive them from the Canoe House first' }),
      S.ferry('nf1_canoe_west', [19, 10], 'Peninsula Landing', 'The canoe landing under the altar.', 'nf1_canoe_east', { flag: 'nf1_canoes_free', reason: 'The cultists hold the paddles: drive them from the Canoe House first' }),
      S.landmark('nf1_raider_camp', [16, 2], 'Raiders’ Ridge Camp', 'The camp of the Night-Knife’s raiders on the jungle ridge. Take it and their band has nowhere to sleep.', 'refuge', {
        label: 'Ridge-camp raiders',
        army: ridgeCampGuard,
        reward: { flags: ['nf1_ridge_safe'], resources: { gold: 500, wood: 2 } },
        battlefield: 'grove',
      }),
      S.depot('nf1_shipment', [23, 2], 'Ember Shipment', 'Tepeyolo’s porters left their ember baskets and cacao at the ridge waystation when the raiders came. The raiders mean to seize the cargo.', { resources: { gold: 300, wood: 2 } }),
      S.watchtower('nf1_pyramid', [25, 5], 'Watcher’s Pyramid', 'From its top the east shore lies open: the groves, the reed shallows and the den under the ceiba.', ['nf1_den', 'nf1_east_grove']),
      // The altar peninsula.
      S.landmark('nf1_altar', [17, 11], 'Altar of the Lake', 'The old altar on the inner peninsula, where the new fire is drilled. Men in black paint hold it — and the altar’s ember record.', 'grove', {
        label: 'Black-painted cultists',
        army: altarGuard,
        reward: { flags: ['nf1_record'], resources: { gold: 500 }, artifactIds: ['quetzal_war_crown'], questXp: 500 },
        battlefield: 'beacon_clearing',
        required: true,
      }, { objectiveIds: ['nf1_record'], marker: 'evidence' }),
      S.shortcut('nf1_stair', [17, 7], 'Processional Stair', 'The priests’ old stair from the ridge down to the peninsula’s north tip, barred from the altar side. Whoever holds the altar can unbar it.', ['nf1_record']),
      // The east shore: the pack's hunting grounds.
      S.landmark('nf1_den', [31, 16], 'Jaguar Den', 'A den under a ceiba tree where the black pack drags its kills. Something green glints among the bones.', 'nest', {
        label: 'Den jaguars',
        army: denGuard,
        reward: { flags: ['nf1_den_taken'], resources: { gold: 500 }, artifactIds: ['jade_pectoral'] },
        battlefield: 'grove',
      }, { markerHiddenUntilRevealed: true }),
      S.depot('nf1_east_grove', [28, 15], 'East Cacao Grove', 'Tepeyolo’s cacao trees, trampled where the pack hunts. The pickers left their baskets.', { resources: { gold: 400, wood: 2 } }, { markerHiddenUntilRevealed: true }),
      S.depot('nf1_west_grove', [4, 15], 'West Cacao Grove', 'Xochitla’s cacao terraces. The pickers will not stay overnight.', { resources: { gold: 400, wood: 2 } }),
      S.choice(
        'nf1_provisions',
        [26, 13],
        'Growers’ Landing',
        'Where Tepeyolo’s cacao growers meet the first provisions coming over from Xochitla.',
        'The first provisions',
        'The first carts from Xochitla are unloaded on the landing. The growers of both shores watch them: their seed stores went to feed the war-band, and their pickers died in the groves. “Give it back to the trees,” an old grower says. A watch captain shakes her head. “Give it to watch posts on both shores. Then the next pack does not reach the trees at all.” There is enough for one.',
        [
          { label: 'Return the provisions to the growers', summary: 'Costs 600 Gold and 4 Wood. The growers replant: local support in the next chapter (1,500 Gold and 6 Wood).', cost: { gold: 600, wood: 4 }, reward: { flags: ['nf1_growers'], questXp: 200 } },
          { label: 'Fund shared watch posts', summary: 'Costs 800 Gold and 4 Stone. Both shores keep a watch: a defensive bonus in the next chapter (10 Jaguar Spirits in the town garrison).', cost: { gold: 800, stone: 4 }, reward: { flags: ['nf1_watchposts'], questXp: 200 } },
        ],
        { marker: 'pact', objectiveIds: ['nf1_provisions'] },
      ),
      // The warm cenote on the west shore and the cheaper boars on the ridge.
      S.activation('nf1_spring_ward', [9, 13], 'Cenote Wards', 'Stone wards round a warm cenote on the jungle bank, broken by the raiders who water their boars in it.', { cost: { stone: 4, wood: 2 }, reward: { flags: ['nf1_spring_warded'] }, confirm: 'Pay 4 Stone and 2 Wood to rebuild the wards and protect the cenote’s water? The ahuitzotl that live in it will deal with whoever does.', label: 'relay' }, null),
      S.neutral('nf1_cenote', [8, 14], 'Warm Cenote', 'A warm cenote under the ferns. The ahuitzotl that live in it pull down the careless — and keep a pact with whoever protects their water. Dangerous allies.', 'ahuitzotl', 5, { flag: 'nf1_spring_warded', reason: 'The ahuitzotl make no pact while their water is fouled: rebuild the Cenote Wards beside it first.' }),
      S.camp('nf1_wallow', [7, 2], 'Peccary Wallow', 'Wild boars in a ridge wallow. Farmers sell them cheaply to anyone who will take them away.', 'wild_boar', 3, 4),
      S.camp('nf1_thicket', [30, 13], 'Spotted Thicket', 'Spotted jaguar spirits that have not joined the black pack. They hunt for whoever keeps the right day.', 'mesoamerican_jaguar_spirit', 2, 3),
      // Legacy beats.
      S.choice(
        'nf1_shrine',
        [8, 6],
        'Broken Fire-shrine',
        'A small fire-shrine whose brazier has been kicked over.',
        'The Broken Fire-shrine',
        'The brazier lies in the mud and the copal has burned to nothing. Around it, four small feathered serpents coil in the ashes, as if waiting to be told where the fire went.',
        [
          { label: 'Take the shrine’s jade and cacao', summary: '+600 Gold and +4 Wood.', reward: { resources: { gold: 600, wood: 4 } } },
          { label: 'Call the serpents with the fire-song', summary: '4 Feathered Serpents join Itzel’s war-band.', reward: { creatures: [{ creatureId: 'mesoamerican_feathered_serpent', count: 4 }] } },
        ],
      ),
      S.choice(
        'nf1_jade',
        [31, 7],
        'A Jade-cutter’s Workshop',
        'A jade-cutter who has worked the same stone for a year.',
        'The Jade-cutter',
        '“A ring for the rain god’s favour,” the jade-cutter says, holding it up to the light. “A year of my life. You may buy it. Or sit with me while I work, and I will tell you what the jaguars are for.”',
        [
          { label: 'Buy the jade ring', summary: 'Pay 2,000 Gold for the Jade Ring of Tlaloc.', cost: { gold: 2000 }, reward: { artifactIds: ['jade_ring_of_tlaloc'] } },
          { label: 'Sit and listen', summary: 'Itzel gains +1 Knowledge.', reward: { attributes: { knowledge: 1 } } },
        ],
      ),
      S.pickup('nf1_stall', [6, 12], 'Abandoned Market Stall', 'A stall abandoned when the fires went out.', { resources: { gold: 400, crystal: 1 } }),
      // The finish: back to Grandmother Xoco's hearth-house in Xochitla.
      S.activation(
        'nf1_hearth',
        [3, 8],
        'Hearth-House of Xochitla',
        'Grandmother Xoco’s hearth-house above the flower terraces, where the city’s fire is counted.',
        {
          cost: { gold: 300, stone: 3, crystal: 1 },
          reward: { questXp: 800 },
          requirements: [
            { type: 'objective_completed', objectiveId: 'nf1_route' },
            { type: 'objective_completed', objectiveId: 'nf1_tepeyolo' },
            { type: 'objective_completed', objectiveId: 'nf1_jaguars' },
            { type: 'objective_completed', objectiveId: 'nf1_record' },
          ],
          completesMission: true,
          confirm: 'Bring the ember record to Grandmother Xoco and drill a fire for the hearths (300 Gold, 3 Stone, 1 Crystal)? This completes the chapter.',
        },
        null,
        { objectiveIds: ['nf1_kindle'], marker: 'evidence' },
      ),
    ],
    patrols: [
      {
        commander: pack,
        monster: true,
        bounty: { gold: 800 },
        start: [27, 15],
        waypoints: [[28, 14], [24, 14], [30, 12], [27, 17]],
        army: packArmy,
        home: 'nf1_den',
        radius: 5,
        threshold: [2, 1],
        purpose: 'The black pack moves between its hunting grounds on the east shore — the cacao grove, the reed shallows and the thicket — and charges only a war-band it is sure to beat. Taking its den under the ceiba ends the attacks.',
      },
      {
        commander: band('nf1_raiders', 'Night-Knife Raiders', CULTIST_PORTRAIT),
        monster: true,
        bounty: { gold: 300 },
        start: [19, 3],
        waypoints: [[22, 4], [14, 4], [19, 3]],
        army: raiderArmy,
        home: 'nf1_raider_camp',
        radius: 6,
        threshold: [3, 2],
        purpose: 'One raider band works the ridge road, waiting to seize the ember shipment at the waystation. Taking their ridge camp ends it for good.',
      },
    ],
    objectives: [
      O.primary(
        'nf1_route',
        'A safe route',
        `Restore a safe route between Xochitla and Tepeyolo: the short way — clear the Lake Causeway (${armyText(causewayGuard)}) and drive the cultists from Tepeyolo’s Canoe House (${armyText(canoeHouseGuard)}) — or the long jungle ridge, made safe by taking the raiders’ ridge camp (${armyText(ridgeCampGuard)}).`,
        C.any(C.all(C.cleared('nf1_causeway'), C.cleared('nf1_canoe_house')), C.cleared('nf1_raider_camp')),
        { reward: { flags: ['nf1_route_open'] }, hint: 'The canoes run again once the Canoe House is free; the reed shallows are a slow way across without them.' },
      ),
      O.primary('nf1_tepeyolo', 'Tepeyolo rejoins the count', 'With a safe road open, enter Tepeyolo. It has no garrison: whoever comes by a safe road is welcome, and its thicket keepers will raise jaguars of your own.', C.owned('tepeyolo'), { markerSiteId: 'nf1_tepeyolo', requires: ['nf1_route'] }),
      O.primary(
        'nf1_jaguars',
        'End the jaguar attacks',
        `Break the black jaguar pack (${armyText(packArmy)}) where it hunts on the east shore, or take its den under the ceiba (${armyText(denGuard)}) so it has nowhere to drag its kills. The Watcher’s Pyramid shows its hunting grounds.`,
        C.any(C.defeated(pack.heroDefinitionId), C.cleared('nf1_den')),
        { reward: { flags: ['nf1_pack_broken'] }, hint: 'The pack only charges a war-band it is sure to beat. Taking the den makes it withdraw for good.' },
      ),
      O.primary('nf1_record', 'Recover the ember record', `Take the Altar of the Lake on the inner peninsula from the cultists (${armyText(altarGuard)}) — over the short causeway from Xochitla, or through the reed shallows from the east shore — and recover its ember record.`, C.cleared('nf1_altar'), { markerSiteId: 'nf1_altar' }),
      O.primary('nf1_kindle', 'Bring the record home', 'With the route safe, the attacks ended and the record in hand, bring it to Grandmother Xoco’s hearth-house in Xochitla.', C.activated('nf1_hearth'), { markerSiteId: 'nf1_hearth', requires: ['nf1_route', 'nf1_tepeyolo', 'nf1_jaguars', 'nf1_record'] }),
      O.optional('nf1_cargo', 'Save the ember shipment', 'Reach the Ember Shipment at the ridge waystation before the raiders seize its cargo (the deadline is in the journal): +2 Crystal and +5 Favor more, and the embers reach Ocelotepec later.', C.visited('nf1_shipment'), { markerSiteId: 'nf1_shipment', reward: { flags: ['nf1_cargo_saved'], resources: { crystal: 2, favor: 5 } } }),
      O.optional('nf1_raids', 'End the ridge raids', `Break the raider band (${armyText(raiderArmy)}) or take its ridge camp.`, C.any(C.defeated('nf1_raiders'), C.cleared('nf1_raider_camp')), { markerSiteId: 'nf1_raider_camp' }),
      O.optional('nf1_provisions', 'The first provisions', 'At the Growers’ Landing, return the first provisions to the growers or fund shared watch posts.', C.any(C.flag('nf1_growers'), C.flag('nf1_watchposts')), { markerSiteId: 'nf1_provisions' }),
      O.optional('nf1_pact', 'The warm cenote', 'Rebuild the Cenote Wards on the west shore: the ahuitzotl of the warm cenote will make a hiring pact (dangerous, optional allies). The Peccary Wallow on the ridge sells wild boars more cheaply.', C.flag('nf1_spring_warded'), { markerSiteId: 'nf1_spring_ward' }),
      O.optional('nf1_train', 'Sky-feathers', 'Give at least 6 Feathered Serpents their sky-feathers (train them into Celestial Feathered Serpents in Xochitla).', C.counter('trained:mesoamerican_feathered_serpent', 6)),
      O.optional('nf1_own_jaguars', 'Jaguars of our own', 'Recruit at least 6 Jaguar Spirits (the Spotted Thicket by Tepeyolo, or a dwelling of your own).', C.counter('recruited:mesoamerican_jaguar_spirit', 6)),
    ],
    timers: [
      {
        id: 'nf1_seizure',
        label: 'The raiders’ strike on the ember shipment',
        startWhen: C.all(),
        days: 7,
        metWhen: C.any(C.visited('nf1_shipment'), C.defeated('nf1_raiders'), C.cleared('nf1_raider_camp')),
        consequence: 'The raiders seize the shipment’s cargo: the waystation keeps only its base stores (the 2 Crystal and 5 Favor bonus and the embers for Ocelotepec are lost). The route, the altar and the record are not touched.',
        announce: 'Tepeyolo’s porters report it: the ridge raiders mean to seize the ember shipment at the waystation within seven days.',
        onExpire: { flags: ['nf1_cargo_seized'], failObjectives: ['nf1_cargo'] },
      },
    ],
    evidence: [
      { id: 'nf1_ev_record', flag: 'nf1_record', title: 'The altar’s ember record', text: 'The knotted cords of the altar keepers: the fire did not go out. It was drawn away, night after night, through a crack in the merged world — and the same cords name the eagle keepers’ calendar and custodians of the lake who disappeared.', icon: 'evidence' },
      { id: 'nf1_ev_pack', flag: 'nf1_pack_broken', title: 'The black pack', text: 'The black jaguars no longer hunt the cacao groves. They were driven from the old altar, not sent.', icon: 'evidence' },
      { id: 'nf1_ev_saved', flag: 'nf1_cargo_saved', title: 'The ember shipment', text: 'Tepeyolo’s ember baskets were saved from the raiders; the embers will reach Ocelotepec.', icon: 'supply' },
      { id: 'nf1_ev_seized', flag: 'nf1_cargo_seized', title: 'The cargo seized', text: 'The raiders took the shipment’s cargo. The route and the record were never theirs to take.', icon: 'branch' },
      { id: 'nf1_ev_growers', flag: 'nf1_growers', title: 'Provisions to the growers', text: 'The first provisions went back to the cacao growers of both shores.', icon: 'supply' },
      { id: 'nf1_ev_watch', flag: 'nf1_watchposts', title: 'Shared watch posts', text: 'The first provisions paid for watch posts on both shores of the lake.', icon: 'pact' },
      { id: 'nf1_ev_cenote', flag: 'nf1_spring_warded', title: 'The cenote pact', text: 'The warm cenote’s wards are rebuilt; its ahuitzotl will deal with Xochitla.', icon: 'pact' },
    ],
    carried: ['nf1_record', 'nf1_pack_broken', 'nf1_cargo_saved', 'nf1_growers', 'nf1_watchposts'],
    briefing: [
      XOCO('The appointed night has not even come, and Xochitla’s hearths are already cold. Fire does not die early, child. Not by itself.'),
      CHIMAL('First things first. No canoe has crossed to Tepeyolo in a week, the ridge road has raiders on it, and the cacao pickers say black jaguars came down from the old altar and will not leave the groves.'),
      ITZEL('Then the road first, and the groves. And whatever men in black paint are doing on our altar, the altar keepers wrote it down — they always write it down.'),
    ],
    victory: [
      XOCO('(reading the knotted cords by the new flame) Night after night the ember record says the same thing: the fire was drawn away, out through the cracks between the worlds, toward somebody else’s hearth.'),
      XOCO('The world is joined badly where the sources of power meet, child. Our fire is not the only one bleeding out.'),
      ITZEL('The cords name two more keepers: the eagle keepers of Ocelotepec, who hold the calendar, and the custodians of the great lake — who have disappeared.'),
    ],
    scenes: [
      { id: 'nf1_causeway', trigger: { type: 'site_cleared', siteId: 'nf1_causeway' }, lines: [CHIMAL('Someone penned those pigs on the causeway and starved them. Cruel, and on purpose.'), ITZEL('Then someone wanted the peninsula kept clear. The altar, then.')] },
      { id: 'nf1_pyramid', trigger: { type: 'site_visited', siteId: 'nf1_pyramid' }, lines: [ITZEL('There — the groves are trampled in a ring round the east shore: the grove, the reed shallows, the thicket. They hunt the same grounds every night.'), CHIMAL('And they sleep under the big ceiba. Take the den and they have nowhere to drag their kills.')] },
      { id: 'nf1_altar_battle', trigger: { type: 'battle_started', siteId: 'nf1_altar' }, lines: [ITZTLI('Little day-keeper. The count is finished. No new fire, no new years. Let the sun go out like a tired hearth.'), ITZEL('I have not finished counting.')] },
      { id: 'nf1_altar_taken', trigger: { type: 'site_cleared', siteId: 'nf1_altar' }, lines: [XOCO('(sent across by runner) Their leader wore the quetzal crown from the temple of Xochitla — stolen at the binding. And the keepers’ cords are here, every knot of them.'), ITZEL('The processional stair can be unbarred from this side. The ridge is a short climb now.')] },
      { id: 'nf1_canoes', trigger: { type: 'site_cleared', siteId: 'nf1_canoe_house' }, lines: [CHIMAL('Their paddles were obsidian. Every one of them.'), ITZEL('The canoes run again: Tepeyolo to the peninsula in an hour.')] },
      { id: 'nf1_tepeyolo', trigger: { type: 'objective_completed', objectiveId: 'nf1_tepeyolo' }, lines: [CHIMAL('Tepeyolo opens its gate. Their thicket keepers say the spotted jaguars will hunt for us — if we build them a house.')] },
      { id: 'nf1_pack', trigger: { type: 'objective_completed', objectiveId: 'nf1_jaguars' }, lines: [CHIMAL('The pack is broken. The last of them ran for the hills.'), ITZEL('Let them. They were driven off the altar, not sent. Without the cultists on it they are only cats.')] },
      { id: 'nf1_seized', trigger: { type: 'flag', flag: 'nf1_cargo_seized' }, lines: [CHIMAL('The raiders reached the waystation first. The baskets are empty — but the porters are alive, and the ridge is still a road.')] },
      { id: 'nf1_ward', trigger: { type: 'flag', flag: 'nf1_spring_warded' }, lines: [XOCO('The ahuitzotl have seen the wards. They will deal with us now — but count your fingers after you shake hands with one.')] },
      { id: 'nf1_losses', trigger: { type: 'casualties', minLost: 6 }, lines: [XOCO('We counted our dead today, Itzel. The count is longer than I like.'), ITZEL('Then I will count more carefully.')] },
    ],
    loss: ['Itzel must survive (defeat, retreat or surrender ends the chapter).', 'Losing Xochitla is recoverable while Itzel has a war-band.', 'A seized ember shipment costs only its bonus cargo, never the route or the record.'],
    help: [
      { id: 'nf1_triangle', title: 'A triangle round the lake', text: 'The short causeway joins Xochitla to the altar peninsula, the canoes join the peninsula to Tepeyolo, and the long jungle ridge joins the two towns. The reed shallows are a slow second way onto the peninsula from the east shore. The priests’ processional stair down from the ridge opens once the altar is retaken.' },
      { id: 'nf1_pressure', title: 'The pack and the raiders', text: 'The black jaguars hunt the east shore from their den; the raiders work the ridge road from their camp. Taking the den or the camp ends that pressure for good. The raiders’ strike on the ember shipment has a posted deadline; missing it costs only the bonus cargo.' },
    ],
  });
  const m1: MissionDefinition = {
    ...m1base,
    // Tepeyolo is an allied town without a garrison: reaching it by a safe road brings it into the count.
    neutralTowns: [
      {
        townId: 'tepeyolo',
        siteId: 'nf1_tepeyolo',
        name: 'Tepeyolo',
        archetypeId: 'mesoamerican_city',
        buildings: ['mesoamerican_civic_hall_l1', 'mesoamerican_tavern_l1', 'mesoamerican_marketplace_l1', 'mesoamerican_dwelling_t1_l1', 'mesoamerican_dwelling_t2_l1'],
        population: {},
        covenants: [],
      },
    ],
  };

  // =========================================================================
  // Chapter 2 — The House of Eagles and the House of Bats (card 34; legacy m03 + m04)
  // =========================================================================
  const acatl = camp.v1('new_fire_m04').hostileHeroes[0]?.commander;
  if (!acatl) throw new Error('New Fire v2: Acatl’s profile is missing from the legacy content');
  const roadGuard: Army = [['brigand', 16], ['brigand_cutthroat', 6]];
  const bridgeGuard: Army = [['brigand_cutthroat', 12], ['tusked_boar', 4]];
  const eagleGuard: Army = [['mesoamerican_eagle_warrior_spirit', 4], ['mesoamerican_solar_eagle_warrior', 1]];
  const cenoteGuard: Army = [['clay_golem', 6]];
  const northDockGuard: Army = [['brigand', 14], ['brigand_cutthroat', 6]];
  const southDockGuard: Army = [['brigand', 12], ['tusked_boar', 4]];
  const batsGuard: Army = [['mesoamerican_camazotz', 4], ['mesoamerican_blood_moon_camazotz', 2]];
  const reserveGuard: Army = [['brigand', 24], ['brigand_cutthroat', 10]];
  const acatlArmy: Army = [['mesoamerican_celestial_feathered_serpent', 16], ['mesoamerican_sun_jaguar', 6]];
  const m2 = chapter({
    campaign: camp,
    chapter: 2,
    card: 34,
    name: 'The House of Eagles and the House of Bats',
    summary:
      'The eagle keepers of Ocelotepec hold the calendar; Acatl’s lake network holds the testimony of the custodians who disappeared. Earn the calendar, free the cenote sanctuary and recover two witness records from Acatl’s lake holdings, in whichever order the lake allows.',
    playtime: '75–95 minutes, 4–6 battles',
    legacy: ['new_fire_m03', 'new_fire_m04'],
    economyFrom: 'new_fire_m03',
    principal: 'nf2_sanctuary',
    soundscape: 'jungle',
    hostileName: 'The Night-Knife’s Host',
    town: { siteId: 'nf2_town', townId: 'ocelotepec', name: 'Ocelotepec' },
    map: {
      cols: 38,
      rows: 22,
      biome: 'jungle',
      base: 'plains',
      seed: 970002,
      texture: { forest: 100, rough: 40 },
      paint: [
        // The western ridge under Ocelotepec.
        { t: 'rough', rect: [1, 1, 6, 20] },
        { t: 'mountain', line: [[1, 2], [1, 19]], width: 0 },
        { t: 'plains', disc: [5, 11, 1] },
        // The northern heights: the eagle terrace under the crags.
        { t: 'rough', rect: [8, 1, 22, 3] },
        { t: 'mountain', cells: [[9, 1], [10, 1], [17, 1], [18, 1], [19, 1], [20, 2], [21, 2], [22, 1]] },
        // The highland lake and the central island of the House of Bats.
        { t: 'water', rect: [11, 6, 29, 16] },
        { t: 'water', blob: [20, 11, 5] },
        { t: 'plains', disc: [20, 11, 2] },
        // The cliff between the western ridge and the north shore (the northern stairs cross it) …
        { t: 'mountain', cells: [[7, 1], [8, 2], [8, 3], [9, 4], [9, 5], [10, 6], [8, 1], [9, 3], [10, 5]] },
        // … and the gorge on the south shore road (the hanging bridge crosses it).
        { t: 'mountain', cells: [[10, 16], [10, 17], [10, 18], [10, 19], [10, 20], [11, 19], [11, 20]] },
        // The smoke causeway from the north shore to the island (hidden under the lake smoke).
        { t: 'marsh', line: [[20, 5], [20, 8]], width: 0 },
        // East shore woods, the wyvern ridge and the giants' rocks.
        { t: 'forest', blob: [34, 15, 2] },
        { t: 'rough', blob: [34, 3, 2] },
        { t: 'mountain', cells: [[36, 1], [36, 5], [32, 1]] },
        { t: 'rough', cells: [[35, 19], [36, 18], [33, 20]] },
        { t: 'marsh', cells: [[12, 18], [13, 19], [27, 18]] },
      ],
      roads: [
        // The northern stairs: Ocelotepec – the Mountain Road – the north shore – the east shore.
        { via: ['nf2_town', [7, 7], 'nf2_mountain_road', [11, 4], [20, 4], [28, 4], [32, 7], 'nf2_cenote'] },
        // The southern shore road: Ocelotepec – the Hanging Bridge – the south shore – the east shore.
        { via: ['nf2_town', [7, 15], 'nf2_bridge', [16, 19], [24, 19], [31, 17], 'nf2_cenote'] },
        // The eagle terrace above the stairs.
        { via: [[11, 4], 'nf2_elders'] },
        { via: ['nf2_elders', 'nf2_house_eagles'] },
        { via: ['nf2_elders', 'nf2_calendar_stone'] },
        // Acatl's docks and the two canoe routes.
        { via: [[20, 4], 'nf2_north_dock'] },
        { via: [[24, 19], 'nf2_south_dock'] },
        { via: ['nf2_town', 'nf2_west_landing'] },
        { via: ['nf2_island_west', 'nf2_bats'] },
        { via: ['nf2_island_east', 'nf2_bats'] },
        { via: [[32, 7], 'nf2_east_landing', [31, 17]] },
        // The smoke causeway (opened by the two lake altars).
        { via: [[20, 4], 'nf2_smoke', 'nf2_bats'] },
        { via: [[28, 4], 'nf2_altar_north'] },
        { via: [[16, 19], 'nf2_altar_south'] },
        // Acatl's reserve on the east shore.
        { via: [[32, 7], 'nf2_paymaster'] },
        { via: ['nf2_paymaster', 'nf2_reserve'] },
        // Spurs.
        { via: ['nf2_town', 'nf2_fire_altar'] },
        { via: ['nf2_town', 'nf2_sawmill'] },
        { via: ['nf2_town', 'nf2_spring'] },
        { via: [[28, 4], 'nf2_wyverns'] },
        { via: [[31, 17], 'nf2_giants'] },
        { via: [[16, 19], 'nf2_merchant'] },
        { via: [[11, 4], 'nf2_cache'] },
      ],
    },
    sites: [
      S.town('nf2_town', 'ocelotepec', [5, 11], 'Ocelotepec', 'A mountain city on the western ridge above the highland lake, under the House of Eagles.', [6, 11]),
      S.resource('nf2_sawmill', [3, 15], 'sawmill'),
      S.resource('nf2_quarry', [3, 6], 'quarry'),
      S.resource('nf2_crystal', [36, 9], 'crystal_deposit'),
      // The two ways off the ridge.
      S.crossing('nf2_mountain_road', [9, 4], 'Mountain Road', 'The northern stairs off the ridge, held by cultists in black paint.', {
        label: 'Mountain cultists',
        army: roadGuard,
        reward: { resources: { gold: 750, favor: 5 } },
        battlefield: 'ridge_pass',
      }),
      S.crossing('nf2_bridge', [10, 18], 'Hanging Bridge', 'The rope bridge of the southern shore road over the gorge, held by cultists and wild pigs.', {
        label: 'Gorge cultists',
        army: bridgeGuard,
        reward: { resources: { gold: 800 } },
        battlefield: 'ridge_pass',
      }),
      // The eagle terrace (before or after the lake: neither is a key for the other).
      S.choice(
        'nf2_elders',
        [12, 3],
        'The Eagle Elders',
        'Three old eagle knights sit on the terrace below the House of Eagles, beside the calendar stone.',
        'The Eagle Elders',
        '“Our covenant was traded,” the eldest says, “by a young captain, for an obsidian knife that sings. The calendar went with it — the count of every fire this mountain has passed on. Buy the covenant back at the price it fetched, and the calendar is yours to read. Or climb to the House and take it from the warriors there. They miss the sky.”',
        [
          { label: 'Pay the elders’ price', summary: 'Costs 1,500 Gold and 10 Wood. The perched warriors stand down: the calendar and the eagle covenant without a battle.', cost: { gold: 1500, wood: 10 }, reward: { flags: ['nf2_calendar'], entitlementIds: ['covenant.mesoamerican_eagle_warrior_spirit.new_fire3'] }, clearsSiteIds: ['nf2_house_eagles'] },
          { label: 'Refuse — take it at the House of Eagles', summary: 'No cost. The calendar must be won from the perched warriors at the House of Eagles.', reward: {} },
        ],
        { marker: 'pact' },
      ),
      S.landmark('nf2_house_eagles', [15, 1], 'House of Eagles', 'The eagle knights’ house above the terrace, where the traded covenant and the calendar hang.', 'nest', {
        label: 'Perched eagle warriors',
        army: eagleGuard,
        reward: { flags: ['nf2_calendar'], entitlementIds: ['covenant.mesoamerican_eagle_warrior_spirit.new_fire3'], resources: { gold: 1000 } },
        battlefield: 'grove',
        required: true,
      }),
      S.choice(
        'nf2_calendar_stone',
        [14, 3],
        'The Calendar Stone',
        'The great stone of the eagle keepers’ count, where the calendar is read aloud.',
        'What the calendar is for',
        'The calendar is unrolled on the stone: every fire this mountain has passed on, and the nights the count went wrong. Chimal wants it carried straight to war. Xoco wants it read. The eldest keeper only asks who it will serve.',
        [
          { label: 'Publish the calendar', summary: 'Copies go to every lake town: wider cooperation. In the Itzcalli chapter the shore districts send 2,000 Gold and 5 Stone.', reward: { flags: ['nf2_published'], questXp: 300 }, requiresFlags: ['nf2_calendar'] },
          { label: 'Secure a military agreement with the keepers', summary: 'The keepers keep the calendar and fly for Itzel: in the Itzcalli chapter 4 Solar Eagle Warriors join her war-band.', reward: { flags: ['nf2_keepers_pact'], questXp: 300 }, requiresFlags: ['nf2_calendar'] },
        ],
        { marker: 'pact', objectiveIds: ['nf2_choice'] },
      ),
      // The cenote sanctuary on the east shore (two ways: the northern stairs and the southern shore road).
      S.camp('nf2_cenote', [34, 11], 'Cenote Sanctuary', 'The crocodiles’ sacred cenote. Stone serpent-heads that walk stand round it like jailers; the crocodiles have sunk to the bottom.', 'mesoamerican_cenote_crocodile', 1, 2, {
        guard: { label: 'Stone jailers', army: [{ creatureId: 'clay_golem', count: 6 }], reward: { resources: { favor: 5 }, artifactIds: ['jaguar_pelt_cape'], flags: ['nf2_sanctuary_free'] }, battlefield: 'ridge_pass', required: true },
        objectiveIds: ['nf2_sanctuary'],
        marker: 'evacuation',
      }),
      // Acatl's lake holdings: two depots and the House of Bats.
      S.landmark('nf2_north_dock', [23, 5], 'North Dock Depot', 'Acatl’s north depot: paddles for the west canoes, and the bundled testimony of the lake custodians he took.', 'quarry_cache', {
        label: 'North dock canoe-men',
        army: northDockGuard,
        reward: { flags: ['nf2_rec_north', 'nf2_canoes_west', 'nf2_depot_north'], resources: { gold: 600, wood: 3 } },
        battlefield: 'coast_road',
      }, { marker: 'evidence' }),
      S.landmark('nf2_south_dock', [22, 18], 'South Dock Depot', 'Acatl’s south depot: paddles for the east canoes, and a second bundle of the custodians’ testimony.', 'quarry_cache', {
        label: 'South dock canoe-men',
        army: southDockGuard,
        reward: { flags: ['nf2_rec_south', 'nf2_canoes_east', 'nf2_depot_south'], resources: { gold: 600, stone: 3 } },
        battlefield: 'coast_road',
      }, { marker: 'evidence' }),
      S.ferry('nf2_west_landing', [10, 11], 'West Canoe Landing', 'Ocelotepec’s landing below the ridge. Its canoes cross to the island — with paddles from Acatl’s north depot.', 'nf2_island_west', { flag: 'nf2_canoes_west', reason: 'Acatl’s men hold the paddles at the North Dock Depot' }),
      S.ferry('nf2_island_west', [18, 11], 'Island West Landing', 'The House of Bats’ west landing.', 'nf2_west_landing', { flag: 'nf2_canoes_west', reason: 'Acatl’s men hold the paddles at the North Dock Depot' }),
      S.ferry('nf2_island_east', [22, 11], 'Island East Landing', 'The House of Bats’ east landing.', 'nf2_east_landing', { flag: 'nf2_canoes_east', reason: 'Acatl’s men hold the paddles at the South Dock Depot' }),
      S.ferry('nf2_east_landing', [31, 11], 'East Canoe Landing', 'The east shore’s landing. Its canoes cross to the island — with paddles from Acatl’s south depot.', 'nf2_island_east', { flag: 'nf2_canoes_east', reason: 'Acatl’s men hold the paddles at the South Dock Depot' }),
      S.landmark('nf2_bats', [20, 11], 'House of Bats', 'A dark house on the island where the bat-spirits hang. They saw every canoe that carried a custodian away.', 'nest', {
        label: 'House bats',
        army: batsGuard,
        reward: { flags: ['nf2_rec_bats'], resources: { gold: 1000 }, artifactIds: ['obsidian_macuahuitl'], questXp: 800 },
        battlefield: 'coast_road',
      }, { marker: 'evidence' }),
      S.shortcut('nf2_smoke', [20, 7], 'The Lake Smoke', 'An old stone causeway from the north shore to the island, lost under a smoke that came with the raiders’ canoes. The two lake altars burn through any smoke.', ['nf2_altar_north_lit', 'nf2_altar_south_lit']),
      S.activation('nf2_altar_north', [27, 3], 'North Lake Altar', 'A fire altar above the north shore, built by the old priests to burn through the lake smoke.', { cost: { gold: 250, stone: 3 }, reward: { flags: ['nf2_altar_north_lit'], questXp: 200 }, confirm: 'Pay 250 Gold and 3 Stone to light the north lake altar?', label: 'relay' }, null),
      S.activation('nf2_altar_south', [15, 20], 'South Lake Altar', 'The south shore’s fire altar, twin of the northern one.', { cost: { gold: 250, stone: 3 }, reward: { flags: ['nf2_altar_south_lit'], questXp: 200 }, confirm: 'Pay 250 Gold and 3 Stone to light the south lake altar?', label: 'relay' }, null),
      S.landmark('nf2_reserve', [34, 6], 'Acatl’s Reserve Camp', 'Canoe raiders waiting on the east shore as Acatl’s reserve. They are paid from his two depots.', 'refuge', {
        label: 'Acatl’s reserve',
        army: reserveGuard,
        reward: { resources: { gold: 800, favor: 3 } },
        battlefield: 'coast_road',
      }),
      S.choice(
        'nf2_paymaster',
        [32, 5],
        'Reserve Paymaster',
        'The tent where Acatl’s reserve is paid in paddles, maize and obsidian.',
        'An empty pay-tent',
        'The paymaster sits among empty baskets. Nothing has come from either depot for days.',
        [{ label: 'Tell the reserve both depots have fallen', summary: 'Only with both of Acatl’s depots taken: the reserve camp goes home (no battle there), and Acatl, with no reserve left, withdraws from the lake.', reward: { questXp: 300, flags: ['nf2_reserve_gone'] }, requiresFlags: ['nf2_depot_north', 'nf2_depot_south'], clearsSiteIds: ['nf2_reserve'] }],
        { marker: 'pact' },
      ),
      // Neutrals: the restored spring (ahuitzotl) and the wyvern ridge.
      S.activation('nf2_spring', [7, 17], 'Overgrown Spring', 'A warm spring below the ridge, choked with fallen stone since the smoke came.', { cost: { stone: 3, wood: 3 }, reward: { flags: ['nf2_spring_restored'] }, confirm: 'Pay 3 Stone and 3 Wood to clear and restore the spring? Ahuitzotl come back to clean water.', label: 'relay' }, null),
      S.neutral('nf2_ahuitzotl', [8, 16], 'Ahuitzotl Pool', 'The pool below the restored spring, on the jungle bank of the lake.', 'ahuitzotl', 5, { flag: 'nf2_spring_restored', reason: 'The pool is choked: restore the Overgrown Spring above it first.' }),
      S.landmark('nf2_wyverns', [35, 2], 'Wyvern Ridge', 'Wyverns roost on the ridge above the east shore. They take nothing from the lake and give nothing back.', 'nest', { label: 'Ridge wyverns', army: [['wyvern', 3]], reward: { resources: { crystal: 4, gold: 600 } }, battlefield: 'grove' }),
      S.landmark('nf2_giants', [35, 19], 'Giants’ Cave', 'Two giants of the old age, who never died with it, live in a lake cave.', 'nest', { label: 'Old-age giants', army: [['ogre', 2]], reward: { resources: { crystal: 5 } }, battlefield: 'grove' }),
      // Legacy beats.
      S.pickup('nf2_cache', [10, 2], 'Merchants’ Cache', 'Goods hidden by merchants who fled the mountain road.', { resources: { gold: 700, wood: 5 }, artifactIds: ['quilted_cotton_armor'] }),
      S.choice(
        'nf2_merchant',
        [17, 20],
        'A Travelling Merchant',
        'A long-distance merchant resting on the south shore with his bearers.',
        'The Long-road Merchant',
        '“I carry news as well as feathers,” the merchant says. “You are going to the bats. Go at noon — they sleep then.” He unrolls a painted book. “A codex of the sun’s count. Take it. Or sit, and I will tell you what the bats told me.”',
        [
          { label: 'Take the codex', summary: 'The Sun-stone Codex joins Itzel’s backpack.', reward: { artifactIds: ['sun_stone_codex'] } },
          { label: 'Sit and listen', summary: 'Itzel gains +1 Spell Power and +1 Knowledge.', reward: { attributes: { power: 1, knowledge: 1 } } },
        ],
      ),
      S.choice(
        'nf2_war_canoe',
        [21, 12],
        'The Raiders’ War-canoe',
        'A war-canoe of the raiders, pulled up on the island.',
        'The War-canoe',
        'The canoe is loaded with plunder from every lake town — and a cage of golden jaguars the raiders took from a temple and never dared to open.',
        [
          { label: 'Take the plunder', summary: '+800 Gold and +2 Crystal.', reward: { resources: { gold: 800, crystal: 2 } } },
          { label: 'Open the cage', summary: '6 Sun Jaguars join Itzel’s war-band.', reward: { creatures: [{ creatureId: 'mesoamerican_sun_jaguar', count: 6 }] } },
        ],
      ),
      S.pickup('nf2_wreck', [29, 18], 'Overturned Canoe', 'A cargo canoe overturned in the reeds; its bundles are dry.', { resources: { gold: 900, wood: 4 } }),
      // The finish: kindle the mountain fire above Ocelotepec.
      S.activation(
        'nf2_fire_altar',
        [3, 9],
        'Mountain Fire Altar',
        'The altar on the ridge where the fire is passed from mountain to mountain.',
        {
          cost: { gold: 500, crystal: 2 },
          reward: { questXp: 1000 },
          requirements: [
            { type: 'objective_completed', objectiveId: 'nf2_calendar' },
            { type: 'objective_completed', objectiveId: 'nf2_sanctuary' },
            { type: 'objective_completed', objectiveId: 'nf2_records' },
          ],
          completesMission: true,
          confirm: 'Kindle the mountain fire and read the calendar beside the custodians’ testimony (500 Gold, 2 Crystal)? This completes the chapter.',
        },
        null,
        { objectiveIds: ['nf2_fire'], marker: 'evidence' },
      ),
    ],
    patrols: [
      {
        commander: acatl,
        start: [30, 13],
        waypoints: [[24, 4], [30, 13], [24, 19], [30, 13]],
        army: acatlArmy,
        home: 'nf2_reserve',
        purpose: 'Acatl moves between his docks with a finite escort, keeping the canoe trade in his hands. His reserve on the east shore is paid from both depots: take both and the reserve goes home, and he withdraws with it.',
      },
    ],
    objectives: [
      O.primary(
        'nf2_descent',
        'Down from the ridge',
        `Open a way off Ocelotepec’s ridge: the northern stairs by the Mountain Road (${armyText(roadGuard)}), or the southern shore road by the Hanging Bridge (${armyText(bridgeGuard)}). Either reaches the whole lake.`,
        C.any(C.cleared('nf2_mountain_road'), C.cleared('nf2_bridge')),
        { hint: 'Once Acatl’s north depot is taken, the west canoes also cross from the landing below the town.' },
      ),
      O.primary(
        'nf2_calendar',
        'The eagle calendar',
        `Earn access to the eagle keepers’ calendar on the terrace above the northern stairs: pay the elders’ price, or take it from the perched warriors at the House of Eagles (${armyText(eagleGuard)}). The terrace can wait until after the lake.`,
        C.flag('nf2_calendar'),
        { markerSiteId: 'nf2_elders', hint: 'The Mountain Road off the ridge is held by cultists; the terrace is a short climb from it.' },
      ),
      O.primary(
        'nf2_sanctuary',
        'Free the cenote sanctuary',
        `Break the stone jailers (${armyText(cenoteGuard)}) at the Cenote Sanctuary on the east shore — by the northern stairs or the southern shore road — so the crocodiles rise again.`,
        C.cleared('nf2_cenote'),
        { markerSiteId: 'nf2_cenote' },
      ),
      O.primary(
        'nf2_records',
        'Two witness records',
        `Recover two of the three witness records from Acatl’s lake holdings: the North Dock Depot (${armyText(northDockGuard)}), the South Dock Depot (${armyText(southDockGuard)}) or the House of Bats on the island (${armyText(batsGuard)}). Each depot holds the paddles of one canoe route to the island.`,
        C.atLeast(2, C.flag('nf2_rec_north'), C.flag('nf2_rec_south'), C.flag('nf2_rec_bats')),
        { reward: { flags: ['nf2_records'] }, hint: 'A record stays in the ledger once found. Taking both depots also sends Acatl’s reserve home — but the depots are far apart.' },
      ),
      O.primary('nf2_fire', 'Kindle the mountain fire', 'With the calendar, the sanctuary and two records, kindle the mountain fire above Ocelotepec and read the calendar beside the testimony.', C.activated('nf2_fire_altar'), { markerSiteId: 'nf2_fire_altar', requires: ['nf2_calendar', 'nf2_sanctuary', 'nf2_records'] }),
      O.optional('nf2_choice', 'What the calendar is for', 'At the Calendar Stone, publish the calendar for wider cooperation or use it first for a military agreement with the keepers. Each gives one limited help against Tecuani.', C.any(C.flag('nf2_published'), C.flag('nf2_keepers_pact')), { markerSiteId: 'nf2_calendar_stone' }),
      O.optional('nf2_acatl', 'Acatl', `Defeat Acatl and his escort (${armyText(acatlArmy)}), or leave him without a reserve. Not needed once the records and the routes are secured.`, C.defeated(acatl.heroDefinitionId)),
      O.optional('nf2_reserve_down', 'Acatl’s reserve', `Send Acatl’s reserve home (both depots taken, then the paymaster) or break it (${armyText(reserveGuard)}).`, C.cleared('nf2_reserve'), { markerSiteId: 'nf2_reserve' }),
      O.optional('nf2_smoke_lifted', 'Clear the lake smoke', 'Light both lake altars: the old causeway from the north shore to the island comes out of the smoke.', C.all(C.activated('nf2_altar_north'), C.activated('nf2_altar_south')), { markerSiteId: 'nf2_smoke' }),
      O.optional('nf2_spring_hire', 'The restored spring', 'Restore the Overgrown Spring below the ridge: ahuitzotl come back to its pool and can be hired (optional allies).', C.flag('nf2_spring_restored'), { markerSiteId: 'nf2_spring' }),
      O.optional('nf2_god', 'A god for the dark road', 'Commit to a first minor god (Huitzilopochtli or Coatlicue) in the temple.', MINOR_GOD),
      O.optional('nf2_wyvern_ridge', 'The wyvern ridge', `Drive the wyverns (${armyText([['wyvern', 3]])}) from the ridge above the east shore.`, C.cleared('nf2_wyverns'), { markerSiteId: 'nf2_wyverns' }),
    ],
    evidence: [
      { id: 'nf2_ev_calendar', flag: 'nf2_calendar', title: 'The eagle calendar', text: 'The keepers’ count of every fire the mountain passed on: the nights the new fire failed were not random. They follow the cracks between the merged worlds.', icon: 'evidence' },
      { id: 'nf2_ev_north', flag: 'nf2_rec_north', title: 'The north dock testimony', text: 'Custodians of the lake, taken by Acatl’s canoes: they saw the old fire carried off the altars before the appointed night.', icon: 'evidence' },
      { id: 'nf2_ev_south', flag: 'nf2_rec_south', title: 'The south dock testimony', text: 'Custodians who refused to put out their hearths early. Acatl took them to the islands — on the Night-Knife’s orders.', icon: 'evidence' },
      { id: 'nf2_ev_bats', flag: 'nf2_rec_bats', title: 'What the bats saw', text: 'The bats saw a man in obsidian carry the old fire across the lake toward the smoking mountain in the east, and a city lord at Itzcalli hold the road for him.', icon: 'evidence' },
      { id: 'nf2_ev_published', flag: 'nf2_published', title: 'The calendar published', text: 'Copies of the eagle calendar went to every lake town: wider cooperation against Tecuani.', icon: 'branch' },
      { id: 'nf2_ev_pact', flag: 'nf2_keepers_pact', title: 'The keepers’ agreement', text: 'The eagle keepers kept their calendar and swore their warriors to Itzel against Tecuani.', icon: 'pact' },
      { id: 'nf2_ev_reserve', flag: 'nf2_reserve_gone', title: 'Acatl’s reserve gone', text: 'With both depots taken, Acatl’s reserve went home and Acatl left the lake.', icon: 'branch' },
      { id: 'nf2_ev_spring', flag: 'nf2_spring_restored', title: 'The spring restored', text: 'The spring below Ocelotepec runs clean again; the ahuitzotl came back to its pool.', icon: 'pact' },
    ],
    carried: ['nf2_calendar', 'nf2_records', 'nf2_rec_bats', 'nf2_published', 'nf2_keepers_pact', 'nf2_reserve_gone'],
    entryBonuses: [
      { fact: 'nf1_growers', label: 'The growers’ support: 1,500 Gold and 6 Wood', wallet: { gold: 1500, wood: 6 } },
      { fact: 'nf1_watchposts', label: 'The shared watch posts: 10 Jaguar Spirits in Ocelotepec', garrison: [{ creatureId: 'mesoamerican_jaguar_spirit', count: 10 }] },
      { fact: 'nf1_cargo_saved', label: 'Tepeyolo’s embers: 3 Crystal and 5 Favor', wallet: { crystal: 3, favor: 5 } },
    ],
    briefing: [
      ITZEL('Two keepers, the cords said. The eagle keepers of Ocelotepec hold the calendar — every fire the mountain has passed on. And the custodians of the great lake, who vanished one by one into Acatl’s canoes.'),
      CHIMAL('Then we split the difference and go fast: take Acatl’s docks, pull the witnesses out, buy or beat the calendar from the eagles. Every day we stand here the sun is paler.'),
      XOCO('And every day you run, you understand less. A failed ritual and a theft look the same from far away, child. The calendar tells us which nights failed; the witnesses tell us who was there. We need both, and we need to read them.'),
      ITZEL('The northern stairs and the shore road both go round the lake; the canoes cross it once we have Acatl’s paddles. The terrace can come before the lake or after.'),
    ],
    briefingVariants: [
      { ifFlags: ['fact:nf1_growers'], lines: [CHIMAL('The cacao growers of both shores sent carts after us — seed money and timber. They remember who gave the provisions back.')] },
      { ifFlags: ['fact:nf1_watchposts'], lines: [CHIMAL('The watch posts we paid for sent ten of their spotted jaguars to Ocelotepec’s walls.')] },
      { ifFlags: ['fact:nf1_cargo_saved'], lines: [XOCO('Tepeyolo’s embers came up the mountain in their baskets. Small fires — but they are ours.')] },
    ],
    victory: [
      XOCO('(by the mountain fire, the calendar open beside the witnesses’ cords) Here, and here, and here — every night the new fire failed, someone was standing at the altar with a jar of embers. The ritual did not fail. It was robbed.'),
      ITZEL('The bats saw where it went: across the lake toward the smoking mountain in the east. And Tecuani of Itzcalli holds the road — while Mazatl chains the fire serpents on the fire mountain to make more of what was stolen.'),
      CHIMAL('Two roads, then. Itzcalli or the mountain. Either can be first.'),
    ],
    scenes: [
      { id: 'nf2_road', trigger: { type: 'site_cleared', siteId: 'nf2_mountain_road' }, lines: [CHIMAL('The stairs are open. The terrace is right above us.'), XOCO('And the lake below. Choose, child — but choose because you know why, not because it is closer.')] },
      { id: 'nf2_calendar', trigger: { type: 'flag', flag: 'nf2_calendar' }, lines: [ITZEL('The calendar. Every fire the mountain passed on — and the nights it went wrong are marked in red.'), XOCO('Then read the red nights before you decide what to do with it.')] },
      { id: 'nf2_house', trigger: { type: 'site_cleared', siteId: 'nf2_house_eagles' }, lines: [CHIMAL('The knife the young captain got — it is here, on the wall. Obsidian, and it hums.'), ITZEL('The Night-Knife pays in his own glass. I will remember the sound.')] },
      { id: 'nf2_cenote', trigger: { type: 'site_cleared', siteId: 'nf2_cenote' }, lines: [XOCO('The crocodiles are rising. They will remember the hands that broke the stone.'), ITZEL('Good. I want them to.')] },
      { id: 'nf2_dock', trigger: { type: 'flag', flag: 'nf2_canoes_west' }, lines: [CHIMAL('Paddles! The west canoes run again — Ocelotepec’s landing to the island.')] },
      { id: 'nf2_dock_east', trigger: { type: 'flag', flag: 'nf2_canoes_east' }, lines: [CHIMAL('The east canoes are ours. The island is a short paddle from the east shore now.')] },
      { id: 'nf2_bats_battle', trigger: { type: 'battle_started', siteId: 'nf2_bats' }, lines: [ITZTLI('Ask the bats, day-keeper. They will tell you the night is longer than the day. It always was.')] },
      { id: 'nf2_acatl_battle', trigger: { type: 'battle_started', heroDefinitionId: 'mesoamerican_acatl' }, lines: [ACATL('The lake is mine, day-keeper. Every canoe on it, every voice that crosses it.'), ITZEL('Then you should have let the voices cross.')] },
      { id: 'nf2_reserve', trigger: { type: 'flag', flag: 'nf2_reserve_gone' }, lines: [CHIMAL('No pay, no paddles. The reserve is going home — and Acatl is going with them, by the look of it.'), ITZEL('Let him go. We have what he was hiding.')] },
      { id: 'nf2_smoke', trigger: { type: 'objective_completed', objectiveId: 'nf2_smoke_lifted' }, lines: [XOCO('The smoke is lifting off the water like mist at sunrise. The old priests knew their work — there is the causeway.')] },
    ],
    loss: ['Itzel must survive.', 'Losing Ocelotepec is recoverable while Itzel has a war-band.', 'Acatl’s personal defeat is optional once the records and routes are secured.'],
    help: [
      { id: 'nf2_circuits', title: 'Round the lake and across it', text: 'The northern stairs and the southern shore road both run from Ocelotepec round the lake to the cenote sanctuary. Two canoe routes cross through the island of the House of Bats: each runs once its paddles are taken from one of Acatl’s depots. The lake altars bring the old smoke causeway back.' },
      { id: 'nf2_acatl_help', title: 'Acatl', text: 'Acatl moves between his docks with a finite escort. His reserve on the east shore is paid by both depots: take both, tell the paymaster, and the reserve goes home with Acatl behind it.' },
    ],
  });

  // =========================================================================
  // Chapter 3 — The Lord of Itzcalli (card 35; legacy m05)
  // =========================================================================
  const v1m05 = camp.v1('new_fire_m05');
  const tecuaniSetup = v1m05.rivals?.[0];
  if (!tecuaniSetup) throw new Error('New Fire v2: Tecuani’s profile is missing from the legacy content');
  const tecuani: CommanderSpec = {
    heroDefinitionId: tecuaniSetup.hero.definitionId,
    name: 'Tecuani',
    classId: tecuaniSetup.hero.classId,
    level: tecuaniSetup.hero.defaults.level,
    attributes: tecuaniSetup.hero.defaults.attributes,
    skills: tecuaniSetup.hero.defaults.skills,
    spellbook: false,
    spellIds: [],
    mana: 10,
    portraitAssetId: 'hero.mesoamerican.tecuani.portrait',
  };
  const northCausewayGuard: Army = [['clay_golem', 8]];
  const southCausewayGuard: Army = [['brigand', 24], ['brigand_cutthroat', 10]];
  const stoneDepotGuard: Army = [['mesoamerican_celestial_feathered_serpent', 14], ['mesoamerican_sun_jaguar', 5]];
  const reedDepotGuard: Army = [['mesoamerican_celestial_feathered_serpent', 14], ['mesoamerican_cenote_crocodile', 2]];
  const fieldArmy: Army = [['mesoamerican_celestial_feathered_serpent', 26], ['mesoamerican_sun_jaguar', 10], ['mesoamerican_cenote_crocodile', 3]];
  const cityGarrison: Army = [['mesoamerican_celestial_feathered_serpent', 24], ['mesoamerican_sun_jaguar', 8], ['mesoamerican_cenote_crocodile', 2]];
  const levyArmy: Army = [['mesoamerican_celestial_feathered_serpent', 10], ['mesoamerican_sun_jaguar', 4]];
  const raidArmy: Army = [['mesoamerican_celestial_feathered_serpent', 12], ['mesoamerican_sun_jaguar', 5]];
  const depotTaken = C.any(C.cleared('nf3_stone_depot'), C.cleared('nf3_reed_depot'));
  const bothDepots = C.all(C.cleared('nf3_stone_depot'), C.cleared('nf3_reed_depot'));
  const m3base = chapter({
    campaign: camp,
    chapter: 3,
    card: 35,
    name: 'The Lord of Itzcalli',
    summary:
      'Tecuani offers to save the next age by owning its only fire, and his lake city is genuinely organised and well supplied. Deliver reconstruction contracts to two independent shore settlements, keep him from holding both principal causeways, then end his monopoly — in the field, by a surrender forced with completed contracts and exposed hoarding, or by siege.',
    playtime: '70–90 minutes, 4–6 battles',
    legacy: ['new_fire_m05'],
    economyFrom: 'new_fire_m05',
    principal: 'nf3_monopoly',
    soundscape: 'jungle',
    hostileName: 'Tecuani’s Itzcalli',
    town: { siteId: 'nf3_town', townId: 'tonalco', name: 'Tonalco' },
    map: {
      cols: 36,
      rows: 22,
      biome: 'jungle',
      base: 'plains',
      seed: 970003,
      texture: { forest: 90, rough: 30 },
      paint: [
        // The far ridge along the north, behind a line of crags (open only at its two ends).
        { t: 'forest', rect: [1, 1, 34, 2] },
        { t: 'mountain', line: [[6, 3], [29, 3]], width: 0 },
        { t: 'rough', cells: [[10, 1], [11, 1], [20, 1], [21, 1], [26, 2]] },
        // The lake, with Itzcalli's platform in the middle.
        { t: 'water', rect: [11, 6, 25, 16] },
        { t: 'water', blob: [18, 11, 5] },
        { t: 'plains', disc: [18, 11, 2] },
        // The two principal causeways.
        { t: 'marsh', line: [[18, 5], [18, 8]], width: 0 },
        { t: 'marsh', line: [[18, 14], [18, 17]], width: 0 },
        // The canal between the stone and reed districts, crossed by the old lock.
        { t: 'water', line: [[25, 11], [34, 11]], width: 1 },
        { t: 'marsh', line: [[30, 10], [30, 12]], width: 0 },
        // The reed channels in the south-east; cacao terraces in the west; the abandoned quarry in the north-east.
        { t: 'marsh', blob: [29, 18, 2] },
        { t: 'forest', blob: [6, 16, 2] },
        { t: 'rough', blob: [32, 5, 1] },
        { t: 'mountain', cells: [[34, 3], [1, 20], [2, 20], [34, 20]] },
      ],
      roads: [
        // The north shore road: Tonalco – the north causeway head – the stone district.
        { via: ['nf3_town', [8, 6], [18, 5], [24, 5], [30, 7], 'nf3_stone_village'] },
        // The south shore road: Tonalco – the south causeway head – the reed district.
        { via: ['nf3_town', [8, 16], [18, 17], [24, 17], [30, 15], 'nf3_reed_village'] },
        // The far ridge: slow and out of the raiders' reach.
        { via: [[8, 6], [5, 3], [8, 2], [28, 2], [31, 4], [30, 7]] },
        // The principal causeways onto the platform.
        { via: [[18, 5], 'nf3_north_causeway', 'nf3_field_army'] },
        { via: [[18, 17], 'nf3_south_causeway', 'nf3_field_army'] },
        { via: [[18, 5], 'nf3_north_causeway', 'nf3_city'] },
        { via: [[18, 17], 'nf3_south_causeway', 'nf3_audience'] },
        // The canal lock between the stone and reed districts, and the reed boats.
        { via: [[30, 7], 'nf3_lock', [30, 15]] },
        { via: ['nf3_town', 'nf3_boats_west'] },
        { via: ['nf3_boats_east', [30, 15]] },
        // Depots, contracts and spurs.
        { via: [[24, 5], 'nf3_stone_depot'] },
        { via: [[24, 17], 'nf3_reed_depot'] },
        { via: [[8, 16], 'nf3_cacao_village'] },
        { via: ['nf3_town', 'nf3_stores'] },
        { via: [[30, 7], 'nf3_ogres'] },
        { via: [[30, 15], 'nf3_ahuitzotl'] },
        { via: [[8, 16], 'nf3_mine'] },
        { via: ['nf3_town', 'nf3_sawmill'] },
        { via: [[8, 6], 'nf3_rain_pool'] },
      ],
    },
    sites: [
      S.town('nf3_town', 'tonalco', [4, 11], 'Tonalco', 'A river city on the west shore of Itzcalli’s lake, loyal to the old count.', [5, 11]),
      S.town('nf3_city', 'itzcalli', [18, 11], 'Itzcalli', 'Tecuani’s city on its lake platform, its walls inlaid with obsidian and its granaries full. Its garrison is a fixed reserve.', [18, 10]),
      S.resource('nf3_sawmill', [2, 14], 'sawmill'),
      S.resource('nf3_quarry', [32, 9], 'quarry'),
      S.resource('nf3_crystal', [33, 18], 'crystal_deposit'),
      // The principal causeways.
      S.crossing('nf3_north_causeway', [18, 7], 'North Causeway', 'The principal causeway from the north shore to the platform. Stone jailers stand on it on Tecuani’s orders.', {
        label: 'Causeway stones',
        army: northCausewayGuard,
        reward: { resources: { gold: 800 }, flags: ['nf3_causeway_held'] },
        battlefield: 'coast_road',
      }),
      S.crossing('nf3_south_causeway', [18, 15], 'South Causeway', 'The principal causeway from the south shore, held by black-painted cultists in Tecuani’s pay.', {
        label: 'Causeway cultists',
        army: southCausewayGuard,
        reward: { resources: { gold: 800 }, flags: ['nf3_causeway_held'] },
        battlefield: 'coast_road',
      }),
      // The platform: Tecuani's field army, the audience steps and the oath stela.
      S.landmark('nf3_field_army', [16, 11], 'Tecuani’s Field Army', 'Tecuani’s field army, drawn up on the platform before the city. Each delivery that reaches the platform adds a levy to it.', 'refuge', {
        label: 'Tecuani and the field army',
        army: fieldArmy,
        commander: tecuani,
        reward: { flags: ['nf3_field_broken'], resources: { gold: 1500 }, artifactIds: ['boots_of_the_long_road'], questXp: 1500 },
        battlefield: 'open_field',
        required: true,
      }, { objectiveIds: ['nf3_monopoly'] }),
      S.choice(
        'nf3_audience',
        [20, 11],
        'Tecuani’s Audience Steps',
        'The steps where the lord of Itzcalli hears petitions from the shore.',
        'The lord of Itzcalli',
        'Tecuani hears the contracts read — terraces rebuilt, a quarry reopened, reed boats paid for — and then the inventory of his own depots: maize and fire-wood stacked to the roof while the shore went hungry. For a long time he says nothing. “I wanted one hearth the next age could not starve,” he says at last. “Mine. It seems the shore can feed itself without me.”',
        [{ label: 'Accept his surrender', summary: 'Needs two delivered contracts and his hoarding exposed (a depot taken). His field army stands down without a battle; Itzcalli opens its granaries to the shore.', reward: { flags: ['nf3_surrender'], questXp: 1500 }, requiresFlags: ['nf3_contracts', 'nf3_hoarding'], clearsSiteIds: ['nf3_field_army'] }],
        { marker: 'pact' },
      ),
      S.activation('nf3_stela', [17, 9], 'Oath Stela', 'The stela of Tecuani’s oath to the Night-Knife: the throne of the next age, for the road east.', { cost: { gold: 500, crystal: 2 }, reward: { flags: ['nf3_stela_broken'], questXp: 600 }, confirm: 'Break the Oath Stela (500 Gold, 2 Crystal for the masons)?' }, null, { marker: 'evidence' }),
      // Tecuani's competing supply operation.
      S.landmark('nf3_stone_depot', [24, 4], 'Stone Depot', 'Tecuani’s depot on the north shore: his convoys load here for the north causeway. Its granary is stacked to the roof.', 'quarry_cache', {
        label: 'Stone-depot convoy guard',
        army: stoneDepotGuard,
        reward: { flags: ['nf3_hoarding'], resources: { gold: 900, stone: 5 } },
        battlefield: 'coast_road',
      }, { marker: 'supply' }),
      S.landmark('nf3_reed_depot', [24, 18], 'Reed Depot', 'Tecuani’s depot in the reed district: his convoys load here for the south causeway, over granaries full of maize.', 'quarry_cache', {
        label: 'Reed-depot convoy guard',
        army: reedDepotGuard,
        reward: { flags: ['nf3_hoarding'], resources: { gold: 900, wood: 5 } },
        battlefield: 'coast_road',
      }, { marker: 'supply' }),
      // The three shore settlements and their declared contracts.
      S.activation('nf3_cacao_village', [8, 18], 'Cacao Terraces', 'The cacao growers’ terraces south of Tonalco, washed out in the last rains.', { cost: { gold: 800, wood: 5 }, reward: { flags: ['nf3_contract_cacao'], questXp: 400 }, confirm: 'Deliver the declared contract to the cacao growers: 800 Gold and 5 Wood to rebuild the terraces?', label: 'relay' }, null, { marker: 'supply' }),
      S.activation('nf3_stone_village', [31, 6], 'Stone-cutters’ Village', 'The stone district’s village by the old quarry, idle since Tecuani bought all its stone.', { cost: { gold: 800, stone: 5 }, reward: { flags: ['nf3_contract_stone'], questXp: 400 }, confirm: 'Deliver the declared contract to the stone-cutters: 800 Gold and 5 Stone to reopen their quarry? Their masons will also rebuild the canal lock.', label: 'relay' }, null, { marker: 'supply' }),
      S.activation('nf3_reed_village', [31, 16], 'Reed-weavers’ Village', 'The reed district’s village on the channels, whose boats Tecuani confiscated.', { cost: { gold: 800, wood: 3, stone: 2 }, reward: { flags: ['nf3_contract_reed'], questXp: 400 }, confirm: 'Deliver the declared contract to the reed-weavers: 800 Gold, 3 Wood and 2 Stone to rebuild their boats?', label: 'relay' }, null, { marker: 'supply' }),
      S.shortcut('nf3_lock', [30, 11], 'Canal Lock', 'The old lock across the canal between the stone and reed districts, its gates rotted. The stone-cutters’ masons can rebuild it.', ['nf3_contract_stone']),
      S.ferry('nf3_boats_west', [10, 11], 'Tonalco Boat Landing', 'Tonalco’s landing: reed boats cross the lake to the reed district.', 'nf3_boats_east'),
      S.ferry('nf3_boats_east', [26, 14], 'Reed-district Landing', 'The reed district’s landing across the lake from Tonalco.', 'nf3_boats_west'),
      // The choice of what to do with the hoarded stores.
      S.choice(
        'nf3_stores',
        [6, 9],
        'The Hoarded Stores',
        'Tonalco’s market square, where the stores taken from Tecuani’s depots are counted.',
        'What to do with the stores',
        'The maize and fire-wood from Tecuani’s depots fill Tonalco’s square. The shore’s elders argue over them: keep them in one store under public oversight, so nobody goes hungry this month — or share them out among the districts, so no single store can ever be bought again. Either way the next fight is fed.',
        [
          { label: 'Retain a central store under public oversight', summary: 'Immediate stability: +2,500 Gold, +5 Wood and +5 Stone now. In the last chapter the central store sends 2,000 Gold and 3 Crystal.', reward: { flags: ['nf3_central_store'], resources: { gold: 2500, wood: 5, stone: 5 } }, requiresFlags: ['nf3_hoarding'] },
          { label: 'Distribute the reserves among the districts', summary: 'Resilience: +1,000 Gold now. In the last chapter the districts’ own militias garrison the home city (12 Celestial Feathered Serpents, 6 Sun Jaguars).', reward: { flags: ['nf3_distributed'], resources: { gold: 1000 } }, requiresFlags: ['nf3_hoarding'] },
        ],
        { marker: 'pact', objectiveIds: ['nf3_stores_choice'] },
      ),
      // Neutrals: ahuitzotl in the reed channels, ogres at the abandoned quarry.
      S.neutral('nf3_ahuitzotl', [29, 19], 'Reed Channels', 'Warm reed channels where ahuitzotl hunt; the reed-weavers leave them fish and keep their fingers.', 'ahuitzotl', 5),
      S.camp('nf3_ogres', [33, 3], 'Abandoned Quarry', 'Old-age giants squat in the quarry Tecuani shut. They will haul stone — or clubs — for pay.', 'ogre', 1, 2),
      // Legacy beats.
      S.resource('nf3_mine', [4, 18], 'gold_mine', { guard: { label: 'Mine pigs', army: [{ creatureId: 'tusked_boar', count: 10 }], reward: { resources: { gold: 500 } }, battlefield: 'open_field' } }),
      S.choice(
        'nf3_rain_pool',
        [10, 4],
        'The Rain Pool',
        'A pool where frogs sing the rain in.',
        'The Rain Pool',
        'The frogs sing for the rain god here. On a stone at the edge lie jade beads someone left in thanks — or you could sit and learn the song yourself.',
        [
          { label: 'Take the jade', summary: '+1,500 Gold.', reward: { resources: { gold: 1500 } } },
          { label: 'Learn the rain song', summary: 'Itzel gains +1 Defense and +1 Knowledge.', reward: { attributes: { defense: 1, knowledge: 1 } } },
        ],
      ),
    ],
    patrols: [
      {
        commander: band('nf3_raiders', 'Itzcalli Raiders', SERPENT_PORTRAIT),
        monster: true,
        bounty: { gold: 500 },
        start: [17, 4],
        waypoints: [[12, 5], [22, 5]],
        army: raidArmy,
        home: 'nf3_stone_depot',
        radius: 7,
        threshold: [3, 2],
        purpose: 'Tecuani’s raiders work the north shore road between Tonalco and the stone district; the far ridge above the crags is out of their reach. They are fed from the Stone Depot: taking it ends the raids.',
      },
      {
        commander: band('nf3_levy_first', 'Itzcalli Levy (first delivery)', SERPENT_PORTRAIT),
        monster: true,
        bounty: { gold: 400 },
        start: [23, 5],
        waypoints: [[16, 10], [16, 12]],
        army: levyArmy,
        home: 'nf3_stone_depot',
        dormantUntil: 'nf3_delivery_1',
        threshold: [3, 2],
        purpose: 'Loads at the Stone Depot. When Tecuani’s first delivery arrives it marches to the platform and joins his final force. Taking the Stone Depot disperses it.',
      },
      {
        commander: band('nf3_levy_second', 'Itzcalli Levy (second delivery)', SERPENT_PORTRAIT),
        monster: true,
        bounty: { gold: 400 },
        start: [23, 17],
        waypoints: [[16, 12], [16, 10]],
        army: levyArmy,
        home: 'nf3_reed_depot',
        dormantUntil: 'nf3_delivery_2',
        threshold: [3, 2],
        purpose: 'Loads at the Reed Depot. When Tecuani’s second delivery arrives it marches to the platform and joins his final force — the last he can add. Taking the Reed Depot disperses it.',
      },
    ],
    objectives: [
      O.primary(
        'nf3_causeway',
        'Hold a principal causeway',
        `Keep Tecuani from controlling both principal causeways: take the North Causeway (${armyText(northCausewayGuard)}) or the South Causeway (${armyText(southCausewayGuard)}).`,
        C.any(C.cleared('nf3_north_causeway'), C.cleared('nf3_south_causeway')),
        { hint: 'Either causeway reaches the platform: they are the city’s two assault landings.' },
      ),
      O.primary(
        'nf3_contracts',
        'Two reconstruction contracts',
        'Deliver the declared reconstruction contract to two of the three independent shore settlements: the Cacao Terraces (800 Gold, 5 Wood), the Reed-weavers’ Village (800 Gold, 3 Wood, 2 Stone) or the Stone-cutters’ Village (800 Gold, 5 Stone).',
        C.atLeast(2, C.activated('nf3_cacao_village'), C.activated('nf3_reed_village'), C.activated('nf3_stone_village')),
        { reward: { flags: ['nf3_contracts'] } },
      ),
      O.primary(
        'nf3_monopoly',
        'End the monopoly',
        `With two contracts delivered and a causeway held, end Tecuani’s monopoly: force his surrender at the Audience Steps with the completed contracts and his hoarding exposed (take one of his depots), confront his field army on the platform (${armyText(fieldArmy)}, plus any delivered levies), or take Itzcalli by siege (its garrison: ${armyText(cityGarrison)}). Every battle is fought by hand.`,
        C.any(C.flag('nf3_surrender'), C.flag('nf3_field_broken'), C.owned('itzcalli')),
        { markerSiteId: 'nf3_field_army', requires: ['nf3_causeway', 'nf3_contracts'], completesMission: true },
      ),
      O.optional('nf3_expose', 'Expose the hoarding', `Take one of Tecuani’s depots — the Stone Depot (${armyText(stoneDepotGuard)}) or the Reed Depot (${armyText(reedDepotGuard)}) — and show the shore what he kept back.`, C.flag('nf3_hoarding'), { markerSiteId: 'nf3_stone_depot' }),
      O.optional('nf3_supply_cut', 'Cut his supply operation', 'Take both depots: no delivery reaches the platform again, and the raiders and levies loading there disperse.', bothDepots, { markerSiteId: 'nf3_reed_depot' }),
      O.optional('nf3_stores_choice', 'The hoarded stores', 'At Tonalco’s market square, keep the recovered stores in one public store or share them among the districts.', C.any(C.flag('nf3_central_store'), C.flag('nf3_distributed')), { markerSiteId: 'nf3_stores' }),
      O.optional('nf3_city', 'Itzcalli opened by siege', `Take Itzcalli itself (its garrison: ${armyText(cityGarrison)}): the city’s granaries go to the shore by force.`, C.owned('itzcalli'), { markerSiteId: 'nf3_city', reward: { flags: ['nf3_city_taken'] } }),
      O.optional('nf3_oath', 'Break the oath stela', 'Break the stela of Tecuani’s oath to the Night-Knife on the platform.', C.activated('nf3_stela'), { markerSiteId: 'nf3_stela' }),
      O.optional('nf3_god', 'A second god', 'Commit to a second minor god (Tlaloc, Tezcatlipoca or Xiuhtecuhtli).', { type: 'player_has_minor_god', count: 2 }),
    ],
    timers: [
      {
        id: 'nf3_d1',
        label: 'Tecuani’s first delivery',
        startWhen: C.all(),
        days: 7,
        metWhen: depotTaken,
        consequence: `His first convoy reaches the platform: the levy loading at the Stone Depot (${armyText(levyArmy)}) joins his final force. At most two deliveries ever arrive; none ends the chapter. Taking a depot first holds the delivery up: it is re-formed and leaves eight days after the capture.`,
        announce: 'Tecuani has posted his delivery schedule on the causeways: the first convoy in seven days, the second six days after it — two convoys, no more.',
        onExpire: { flags: ['nf3_delivery_1'] },
      },
      {
        id: 'nf3_d1_held',
        label: 'Tecuani’s first delivery (held up)',
        startWhen: depotTaken,
        days: 8,
        metWhen: C.any(C.flag('nf3_delivery_1'), bothDepots),
        consequence: 'The re-formed convoy reaches the platform: the first levy joins his final force, if its depot still stands. Taking both depots stops it.',
        onExpire: { flags: ['nf3_delivery_1'] },
      },
      {
        id: 'nf3_d2',
        label: 'Tecuani’s second delivery',
        startWhen: C.flag('nf3_delivery_1'),
        days: 6,
        metWhen: depotTaken,
        consequence: `His second and last convoy reaches the platform: the levy loading at the Reed Depot (${armyText(levyArmy)}) joins his final force. Taking a depot first holds it up: it is re-formed and leaves seven days after the capture.`,
        onExpire: { flags: ['nf3_delivery_2'] },
      },
      {
        id: 'nf3_d2_held',
        label: 'Tecuani’s second delivery (held up)',
        startWhen: C.all(C.flag('nf3_delivery_1'), depotTaken),
        days: 7,
        metWhen: C.any(C.flag('nf3_delivery_2'), bothDepots),
        consequence: 'The re-formed second convoy reaches the platform: the second levy joins his final force, if its depot still stands. Taking both depots stops it.',
        onExpire: { flags: ['nf3_delivery_2'] },
      },
    ],
    evidence: [
      { id: 'nf3_ev_hoarding', flag: 'nf3_hoarding', title: 'The hoarding exposed', text: 'Tecuani’s depots were stacked with maize and fire-wood while the shore went hungry. The inventory is read in every district.', icon: 'evidence' },
      { id: 'nf3_ev_contracts', flag: 'nf3_contracts', title: 'Two contracts delivered', text: 'Two shore settlements rebuilt with Itzel’s contracts, not Tecuani’s rations.', icon: 'supply' },
      { id: 'nf3_ev_surrender', flag: 'nf3_surrender', title: 'Tecuani’s surrender', text: 'Tecuani surrendered on his audience steps; Itzcalli opened its granaries to the shore.', icon: 'pact' },
      { id: 'nf3_ev_field', flag: 'nf3_field_broken', title: 'The field army broken', text: 'Tecuani’s field army was beaten on the platform in a pitched battle.', icon: 'branch' },
      { id: 'nf3_ev_central', flag: 'nf3_central_store', title: 'A central store', text: 'The recovered stores are kept in one public store under the shore’s oversight.', icon: 'supply' },
      { id: 'nf3_ev_distributed', flag: 'nf3_distributed', title: 'Reserves distributed', text: 'The recovered stores were shared among the districts, so no single store can be bought again.', icon: 'supply' },
      { id: 'nf3_ev_d1', flag: 'nf3_delivery_1', title: 'A delivery arrived', text: 'One of Tecuani’s convoys reached the platform.', icon: 'branch' },
      { id: 'nf3_ev_stela', flag: 'nf3_stela_broken', title: 'The oath stela broken', text: 'The stela of Tecuani’s oath to the Night-Knife lies in pieces on the platform.', icon: 'evidence' },
    ],
    carried: ['nf3_surrender', 'nf3_field_broken', 'nf3_city_taken', 'nf3_contracts', 'nf3_central_store', 'nf3_distributed', 'nf3_contract_cacao', 'nf3_contract_stone', 'nf3_contract_reed'],
    entryBonuses: [
      { fact: 'nf2_published', label: 'The published calendar: the shore districts send 2,000 Gold and 5 Stone', wallet: { gold: 2000, stone: 5 } },
      { fact: 'nf2_keepers_pact', label: 'The eagle keepers’ agreement: 4 Solar Eagle Warriors fly with Itzel', heroArmy: [{ creatureId: 'mesoamerican_solar_eagle_warrior', count: 4 }] },
    ],
    briefing: [
      TECUANI('Go back to your counting, day-keeper. Every age ends. Somebody has to own the fire that starts the next one, or it starves in the dark — and my granaries are full.'),
      XOCO('He is not lying about the granaries. Itzcalli is fed and ordered while the shore goes hungry. That is how he means to win: not with spears, with bread.'),
      ITZEL('Then the shore has to see it can feed itself without him. Contracts the settlements can hold us to — two of them — and his hands off at least one causeway.'),
      CHIMAL('And his convoys keep running to the platform. Two deliveries, he says, posted on the causeways — each one another levy on that platform, and never more than two. Take a depot and the next convoy comes late; take both and none comes at all.'),
    ],
    briefingVariants: [
      { ifFlags: ['fact:nf2_published'], lines: [XOCO('The shore districts have read the eagle calendar. They know which nights the fire was robbed — they sent stone and coin before we asked.')] },
      { ifFlags: ['fact:nf2_keepers_pact'], lines: [CHIMAL('The eagle keepers kept their word: four of their warriors are circling over Tonalco.')] },
      { ifFlags: ['fact:nf4_mazatl_down'], lines: [ITZEL('The fire serpents fly over the lake now. Tecuani’s people have seen them come from the mountain — free, and nobody’s.')] },
      { ifFlags: ['fact:nf4_workshops_saved'], lines: [CHIMAL('The fire mountain’s workshops still stand. Tecuani is telling the shore they will be his before the year is out.')] },
      { ifFlags: ['fact:nf4_dismantled'], lines: [XOCO('The mountain’s extraction works are rubble. Whatever Tecuani hoped to buy from Mazatl, there is nothing left to sell him.')] },
      { unlessFlags: ['fact:nf4_mazatl_down'], lines: [XOCO('And Mazatl still holds the fire mountain. Whatever we do here, he is making more of what was stolen.')] },
    ],
    victory: [
      ITZEL('The shore feeds itself, and Itzcalli’s granaries are open. Tecuani wanted to be the only hearth of the next age; the next age has several.'),
      XOCO('The bats said the Night-Knife carried the old fire to the smoking mountain. Tecuani was only holding the road for him.'),
    ],
    scenes: [
      { id: 'nf3_causeway', trigger: { type: 'objective_completed', objectiveId: 'nf3_causeway' }, lines: [CHIMAL('One causeway is ours. He cannot close the lake now.'), ITZEL('His convoys still run on the other one. Watch the posted days.')] },
      { id: 'nf3_hoarding', trigger: { type: 'flag', flag: 'nf3_hoarding' }, lines: [XOCO('Look at it. Maize to the roof, fire-wood in dry stacks — while his neighbours burned their doors to cook.'), ITZEL('Read the inventory aloud in every district. Then let him explain it on his own steps.')] },
      { id: 'nf3_delivery_1', trigger: { type: 'flag', flag: 'nf3_delivery_1' }, lines: [CHIMAL('A convoy reached the platform. Another levy on his steps — he can add one more, no more.')] },
      { id: 'nf3_delivery_2', trigger: { type: 'flag', flag: 'nf3_delivery_2' }, lines: [CHIMAL('His last convoy is in. That is everything he can add to the platform; from now on he only loses.')] },
      { id: 'nf3_lock', trigger: { type: 'flag', flag: 'nf3_contract_stone' }, lines: [XOCO('The stone-cutters are rebuilding the canal lock for nothing. A contract kept is worth more than a ration given.')] },
      { id: 'nf3_field_battle', trigger: { type: 'battle_started', siteId: 'nf3_field_army' }, lines: [TECUANI('Every age ends in fire or flood. Why not end this one with a bargain?'), ITZEL('Because it is not yours to end.')] },
      { id: 'nf3_surrendered', trigger: { type: 'flag', flag: 'nf3_surrender' }, lines: [TECUANI('Take the granaries. Take the causeways. When the Night-Knife comes for his fire, tell him I was the one who let go of it.'), ITZEL('I will tell him you stopped.')] },
      { id: 'nf3_siege', trigger: { type: 'battle_started', siteId: 'nf3_city' }, lines: [ITZEL('No looting. When the gate opens, the granaries open with it.')] },
      { id: 'nf3_stela', trigger: { type: 'flag', flag: 'nf3_stela_broken' }, lines: [XOCO('The oath is broken stone now. The throne of the next age was never the Night-Knife’s to promise.')] },
    ],
    loss: ['Itzel must survive.', 'Losing Tonalco is recoverable while Itzel has a war-band.', 'Tecuani’s deliveries only add levies to his final force, at most two; they never end the chapter.'],
    help: [
      { id: 'nf3_lake', title: 'The lake and the platform', text: 'The north and south shore roads join Tonalco to the stone and reed districts; reed boats cross from Tonalco to the reed district, and the canal lock joins the two districts once the stone-cutters rebuild it. Two principal causeways reach Itzcalli’s platform. The far ridge behind the northern crags is slower but out of the raiders’ reach.' },
      { id: 'nf3_supply', title: 'Tecuani’s deliveries', text: 'His convoys load at the Stone and Reed Depots on a posted schedule (day 7, then six days later): two deliveries at most, each adding one levy to his final force on the platform. Taking a depot disperses the levy loading there and holds up his next delivery — it is re-formed and leaves a week or more after the capture; both depots stop them. Deliveries never end the chapter.' },
    ],
  });
  // Itzcalli is an unowned city held by Tecuani's garrison (the siege alternative).
  const v1Itzcalli = tecuaniSetup.town;
  const m3: MissionDefinition = {
    ...m3base,
    neutralTowns: [
      {
        townId: 'itzcalli',
        siteId: 'nf3_city',
        name: 'Itzcalli',
        archetypeId: v1Itzcalli.archetypeId,
        buildings: v1Itzcalli.buildings,
        population: {},
        covenants: [],
        garrison: cityGarrison.map(([creatureId, count]) => ({ creatureId, count })),
      },
    ],
  };

  // =========================================================================
  // Chapter 4 — The Fire Mountain (card 36; legacy m06)
  // =========================================================================
  const v1m06 = camp.v1('new_fire_m06');
  const mazatl = v1m06.sites.find((x) => x.id === 'm06_gate')?.guard?.commander;
  if (!mazatl) throw new Error('New Fire v2: Mazatl’s profile is missing from the legacy content');
  const quarryWorksGuard: Army = [['clay_golem', 8], ['bronze_golem', 2]];
  const saddleWorksGuard: Army = [['brigand_cutthroat', 24], ['tusked_boar', 6]];
  const ravineWorksGuard: Army = [['bronze_golem', 6]];
  const mazatlGuard: Army = [['mesoamerican_celestial_feathered_serpent', 30], ['mesoamerican_sun_jaguar', 10], ['mesoamerican_solar_eagle_warrior', 4], ['mesoamerican_temple_crocodile', 3]];
  const chainsGuard: Army = [['mesoamerican_celestial_feathered_serpent', 24], ['bronze_golem', 3], ['mesoamerican_blood_moon_camazotz', 2]];
  const reserveArmy: Army = [['mesoamerican_celestial_feathered_serpent', 14], ['mesoamerican_sun_jaguar', 4], ['bronze_golem', 1]];
  const ashArmy: Army = [['mesoamerican_celestial_feathered_serpent', 16], ['mesoamerican_sun_jaguar', 6], ['bronze_golem', 2]];
  const m4 = chapter({
    campaign: camp,
    chapter: 4,
    card: 36,
    name: 'The Fire Mountain',
    summary:
      'Mazatl chains the fire serpents in the crater to extract enough fire for one dominant city, and the mountain is growing unstable. Prepare a safe containment basin, break two of the three extraction works, defeat Mazatl at the crater and choose when to start the release that frees the serpents and brings out a usable ember.',
    playtime: '65–85 minutes, 4–6 battles',
    legacy: ['new_fire_m06'],
    economyFrom: 'new_fire_m06',
    principal: 'nf4_mazatl',
    soundscape: 'jungle',
    hostileName: 'Mazatl’s Fire Works',
    town: { siteId: 'nf4_town', townId: 'quetzaltepec', name: 'Quetzaltepec' },
    map: {
      cols: 32,
      rows: 22,
      biome: 'jungle',
      base: 'plains',
      seed: 970004,
      texture: { forest: 80, rough: 40 },
      paint: [
        // The volcano: steep flanks, the upper ring under the crater wall, the crater floor.
        { t: 'mountain', disc: [16, 11, 6] },
        { t: 'rough', disc: [16, 11, 3] },
        { t: 'mountain', disc: [16, 11, 2] },
        { t: 'plains', disc: [16, 11, 1] },
        // The upper ring is broken on the south side, where the cooled flow will run.
        { t: 'mountain', cells: [[13, 13], [14, 14], [15, 14], [16, 14], [17, 14], [15, 13], [17, 13]] },
        // The three radial approaches: the quarry road (west), the forest saddle (north-east), the ash ravine (south-east).
        { t: 'rough', line: [[9, 10], [13, 10]], width: 0 },
        { t: 'forest', line: [[18, 8], [21, 5]], width: 0 },
        { t: 'rough', line: [[18, 13], [21, 17]], width: 0 },
        // The cooled flow: from the crater wall's south gate straight down the south flank to the outer road.
        { t: 'rough', cells: [[16, 14], [16, 15], [16, 16], [16, 17]] },
        { t: 'mountain', cells: [[17, 14], [17, 15], [17, 16], [15, 15], [15, 16], [15, 17], [17, 17]] },
        // The south-west lava tube: an optional shortcut from the outer road to the upper ring (lava once the release begins).
        { t: 'rough', cells: [[10, 15], [11, 14], [12, 13], [13, 12]] },
        // Lowlands: the quarry country in the west, the forest in the north-east, the ash fields in the south-east.
        { t: 'rough', blob: [3, 6, 2] },
        { t: 'forest', blob: [27, 4, 2] },
        { t: 'rough', blob: [27, 18, 2] },
        { t: 'forest', blob: [5, 18, 1] },
      ],
      roads: [
        // The stable outer road round the volcano.
        { via: ['nf4_town', [8, 15], [9, 7], [16, 3], [24, 5], [25, 11], [24, 17], [16, 19], [8, 15]] },
        // The three radial approaches, each through its extraction works.
        { via: [[9, 7], [9, 10], 'nf4_quarry_works', [13, 10]] },
        { via: [[24, 5], [21, 5], 'nf4_saddle_works', [18, 8]] },
        { via: [[24, 17], [21, 17], 'nf4_ravine_works', [18, 13]] },
        // The upper ring (west arc and east arc) and the crater gate.
        { via: [[13, 10], [15, 8], 'nf4_crater_gate'] },
        { via: [[18, 8], [17, 8], 'nf4_crater_gate'] },
        { via: [[18, 8], [19, 11], [18, 13]] },
        { via: ['nf4_crater_gate', 'nf4_chains'] },
        // The cooled flow (opens with the release) down to the containment basin.
        { via: ['nf4_chains', 'nf4_cooled_flow', [16, 17], 'nf4_basin'] },
        { via: ['nf4_basin', 'nf4_conch'] },
        // Spurs.
        { via: [[13, 10], 'nf4_workshops'] },
        { via: [[16, 3], 'nf4_hatchling'] },
        { via: [[9, 7], 'nf4_golems'] },
        { via: [[24, 17], 'nf4_giants'] },
        { via: ['nf4_town', 'nf4_sawmill'] },
        { via: [[25, 11], 'nf4_mine'] },
      ],
    },
    sites: [
      S.town('nf4_town', 'quetzaltepec', [4, 15], 'Quetzaltepec', 'A city on the lower slopes of the fire mountain, below the outer road.', [5, 15]),
      S.resource('nf4_sawmill', [2, 18], 'sawmill'),
      S.resource('nf4_quarry', [2, 9], 'quarry'),
      S.resource('nf4_mine', [28, 11], 'gold_mine'),
      S.resource('nf4_crystal', [29, 2], 'crystal_deposit'),
      // The containment basin and the conch on the outer road below the volcano.
      S.activation('nf4_basin', [15, 19], 'Cooling Basin', 'An old cenote-fed basin below the south flank where a captured fire can be held without burning the valley.', { cost: { gold: 600, stone: 5, crystal: 2 }, reward: { flags: ['nf4_containment'], questXp: 500 }, confirm: 'Line the Cooling Basin with stone and water so it can hold a living ember (600 Gold, 5 Stone, 2 Crystal)?', label: 'relay' }, null, { objectiveIds: ['nf4_containment'], marker: 'supply' }),
      S.activation(
        'nf4_conch',
        [17, 19],
        'Conch of the Sky',
        'The great conch blown when the fire serpents rise. When it sounds over the basin, the ember is sealed.',
        {
          cost: { gold: 500, favor: 10 },
          reward: { questXp: 1500, flags: ['nf4_ember'] },
          requirements: [
            { type: 'objective_completed', objectiveId: 'nf4_containment' },
            { type: 'objective_completed', objectiveId: 'nf4_works' },
            { type: 'objective_completed', objectiveId: 'nf4_mazatl' },
            { type: 'objective_completed', objectiveId: 'nf4_release' },
          ],
          completesMission: true,
          confirm: 'Blow the Conch of the Sky and seal the ember in the basin (500 Gold, 10 Favor)? This completes the chapter.',
        },
        null,
        { objectiveIds: ['nf4_ember'], marker: 'evidence' },
      ),
      // The three extraction works, astride the three approaches.
      S.crossing('nf4_quarry_works', [12, 10], 'Quarry Works', 'Mazatl’s obsidian works across the quarry road. Its stone feeds the obsidian reserve on the upper ring.', {
        label: 'Quarry-works jailers',
        army: quarryWorksGuard,
        reward: { flags: ['nf4_work_quarry'], resources: { gold: 1000, stone: 4 } },
        battlefield: 'ridge_pass',
      }),
      S.crossing('nf4_saddle_works', [19, 7], 'Saddle Works', 'The charcoal works in the forest saddle. Its charcoal feeds the saddle reserve on the upper ring.', {
        label: 'Saddle-works cultists',
        army: saddleWorksGuard,
        reward: { flags: ['nf4_work_saddle'], resources: { gold: 1000, wood: 4 } },
        battlefield: 'ridge_pass',
      }),
      S.crossing('nf4_ravine_works', [19, 15], 'Ravine Works', 'The ash-ravine fire pits, where lava guardians stoke Mazatl’s furnaces. They feed the ash reserve he keeps for a counterattack.', {
        label: 'Lava guardians',
        army: ravineWorksGuard,
        reward: { flags: ['nf4_work_ravine'], resources: { gold: 1000, crystal: 2 } },
        battlefield: 'ridge_pass',
      }),
      // The crater: Mazatl's gate, the chains (the release is started here), the cooled flow.
      S.landmark('nf4_crater_gate', [16, 9], 'Crater Gate', 'The one gate through the crater wall, held by Mazatl — a temple guard of Xochitla once.', 'refuge', {
        label: 'Mazatl and the gate guard',
        army: mazatlGuard,
        commander: mazatl,
        reward: { flags: ['nf4_mazatl_down'], resources: { gold: 1500 }, artifactIds: ['eagle_chimalli'], questXp: 1500 },
        battlefield: 'ridge_pass',
        required: true,
      }, { objectiveIds: ['nf4_mazatl'] }),
      {
        ...S.sluice('nf4_chains', [16, 11], 'Crater Chains', 'Where the fire serpents are chained over the vents, under the Night-Knife’s jailers. Striking the chains starts the release.', {
          channel: [[10, 15], [11, 14], [12, 13], [13, 12]],
          open: 'mountain',
          closed: 'rough',
          startsOpen: false,
          openText: 'Strike the chains and start the release: the fire serpents rise and the eruption phase begins (its schedule is in the journal). Lava fills the south-west lava tube — an optional shortcut — and the cooled flow opens from the crater down to the Cooling Basin. The outer road stays safe, and nothing on the map is burned.',
          closeText: 'Bank the vents again: the lava drains out of the south-west lava tube. The release, once begun, goes on.',
          openFlag: 'nf4_release_open',
        }),
        guard: { label: 'Crater jailers', army: chainsGuard.map(([creatureId, count]) => ({ creatureId, count })), reward: { resources: { gold: 1500 } }, battlefield: 'grove', required: true },
        objectiveIds: ['nf4_release'],
        marker: 'evacuation' as const,
      },
      S.shortcut('nf4_cooled_flow', [16, 13], 'The Cooled Flow', 'A lava channel from the crater floor down the south flank. When the serpents rise, the flow under them cools into a walkable road to the Cooling Basin.', ['nf4_release_open']),
      // The choice of what becomes of the workshops.
      S.choice(
        'nf4_workshops',
        [13, 9],
        'Mazatl’s Workshops',
        'Furnaces, moulds and fire-jars on the upper ring, where the serpents’ fire was bottled for one city.',
        'The workshops',
        'With two works broken, the mountain’s workshops stand silent: furnaces that could fire bricks and glaze for every city that rebuilds — and every one of them built to bottle a chained serpent’s breath. The freed serpents circle overhead, watching what you do with them.',
        [
          { label: 'Save the workshops', summary: 'The furnaces are kept for building: a material reserve in the last chapter (6 Stone, 4 Crystal, 1,500 Gold). The serpents are released either way.', reward: { flags: ['nf4_workshops_saved'], resources: { stone: 4 } }, requiresFlags: ['nf4_works_broken'] },
          { label: 'Dismantle all extraction', summary: 'Costs 500 Gold. Every furnace and fire-jar is broken: the serpents trust Itzel — in the last chapter 2 Xiuhcoatl join her war-band. The serpents are released either way.', cost: { gold: 500 }, reward: { flags: ['nf4_dismantled'], resources: { favor: 10 } }, requiresFlags: ['nf4_works_broken'] },
        ],
        { marker: 'pact', objectiveIds: ['nf4_choice'] },
      ),
      // The cooled quarry (clay golems); the ahuitzotl stay down at their lowland spring.
      S.camp('nf4_golems', [5, 4], 'Cooled Quarry', 'A quarry where the lava cooled long ago. Clay men left behind by the works will dig — or fight — for pay.', 'clay_golem', 2, 3),
      // Legacy beats.
      S.choice(
        'nf4_hatchling',
        [16, 2],
        'A Turquoise Hatchling',
        'A fire-serpent hatchling caught in an obsidian snare.',
        'The Hatchling',
        'The hatchling glows like a coal. Freed, it will fly to its mother. Or the snare itself — singing obsidian — can be melted in a fire and its song read.',
        [
          { label: 'Free the hatchling', summary: '+2 Crystal and +10 Favor.', reward: { resources: { crystal: 2, favor: 10 } } },
          { label: 'Read the snare’s song', summary: 'Itzel gains 1,000 experience.', reward: { questXp: 1000 } },
        ],
      ),
      S.landmark('nf4_giants', [26, 19], 'Giants’ Hall', 'Two chieftains of the old-age giants in a hall of lava stone.', 'nest', { label: 'Giant chieftains', army: [['ogre_chieftain', 2]], reward: { resources: { crystal: 6 } }, battlefield: 'grove' }),
    ],
    patrols: [
      {
        commander: band('nf4_obsidian_reserve', 'Obsidian Reserve', 'creature.neutral.clay_golem.upgraded.portrait'),
        monster: true,
        bounty: { gold: 500 },
        start: [15, 8],
        waypoints: [[13, 11], [15, 8]],
        army: reserveArmy,
        home: 'nf4_quarry_works',
        radius: 2,
        threshold: [3, 2],
        purpose: 'Guards the western arc of the upper ring. It is fed by the Quarry Works: break them and it withdraws.',
      },
      {
        commander: band('nf4_saddle_reserve', 'Saddle Reserve', SERPENT_PORTRAIT),
        monster: true,
        bounty: { gold: 500 },
        start: [18, 9],
        waypoints: [[18, 8], [19, 11]],
        army: reserveArmy,
        home: 'nf4_saddle_works',
        radius: 2,
        threshold: [3, 2],
        purpose: 'Guards the eastern arc of the upper ring. It is fed by the Saddle Works: break them and it withdraws.',
      },
      {
        commander: band('nf4_ash_reserve', 'Ash Reserve', 'creature.neutral.clay_golem.upgraded.portrait'),
        monster: true,
        bounty: { gold: 600 },
        start: [23, 16],
        waypoints: [[19, 18], [16, 17], [19, 18]],
        army: ashArmy,
        home: 'nf4_ravine_works',
        dormantUntil: 'nf4_counterattack',
        threshold: [3, 2],
        purpose: 'Mazatl’s ash reserve waits below the Ravine Works. It counterattacks the basin road once, on the announced day after the release begins. Breaking the Ravine Works disbands it.',
      },
    ],
    objectives: [
      O.primary('nf4_containment', 'A safe containment site', 'Prepare the Cooling Basin below the south flank to hold a living ember (600 Gold, 5 Stone, 2 Crystal).', C.activated('nf4_basin'), { markerSiteId: 'nf4_basin' }),
      O.primary(
        'nf4_works',
        'Break two extraction works',
        `Break two of Mazatl’s three extraction works, each astride one approach: the Quarry Works (${armyText(quarryWorksGuard)}), the Saddle Works (${armyText(saddleWorksGuard)}) or the Ravine Works (${armyText(ravineWorksGuard)}). Each feeds a different reserve.`,
        C.atLeast(2, C.cleared('nf4_quarry_works'), C.cleared('nf4_saddle_works'), C.cleared('nf4_ravine_works')),
        { reward: { flags: ['nf4_works_broken'] }, hint: 'The Quarry and Saddle Works feed the reserves on the upper ring; the Ravine Works feed the counterattack that follows the release.' },
      ),
      O.primary('nf4_mazatl', 'Mazatl at the crater', `Defeat Mazatl and the gate guard (${armyText(mazatlGuard)}) at the Crater Gate — from the western or the eastern arc of the upper ring.`, C.cleared('nf4_crater_gate'), { markerSiteId: 'nf4_crater_gate' }),
      O.primary(
        'nf4_release',
        'Start the release',
        `When you choose, break the crater jailers (${armyText(chainsGuard)}) and strike the chains: the release begins. Its eruption phase (shown in the journal) closes only the optional lava tube, opens the cooled flow to the basin and brings one announced counterattack.`,
        C.flag('nf4_release_open'),
        { markerSiteId: 'nf4_chains', requires: ['nf4_mazatl'], reward: { flags: ['nf4_released'], entitlementIds: ['covenant.mesoamerican_xiuhcoatl.new_fire6'] } },
      ),
      O.primary('nf4_ember', 'Secure the ember', 'With the basin ready, two works broken, Mazatl beaten and the release begun, blow the Conch of the Sky at the Cooling Basin and seal the ember.', C.activated('nf4_conch'), { markerSiteId: 'nf4_conch', requires: ['nf4_containment', 'nf4_works', 'nf4_mazatl', 'nf4_release'] }),
      O.optional('nf4_choice', 'The workshops', 'At Mazatl’s Workshops on the upper ring, save the furnaces for a later material reserve, or dismantle all extraction for the serpents’ trust.', C.any(C.flag('nf4_workshops_saved'), C.flag('nf4_dismantled')), { markerSiteId: 'nf4_workshops' }),
      O.optional('nf4_all_works', 'Every works silent', 'Break all three extraction works: no reserve and no counterattack is left.', C.all(C.cleared('nf4_quarry_works'), C.cleared('nf4_saddle_works'), C.cleared('nf4_ravine_works')), { markerSiteId: 'nf4_ravine_works' }),
      O.optional('nf4_hatch', 'The hatchling', 'Visit the fire-serpent hatchling caught in a snare on the outer road.', C.visited('nf4_hatchling'), { markerSiteId: 'nf4_hatchling' }),
      O.optional('nf4_hall', 'The giants’ hall', `Drive the giant chieftains (${armyText([['ogre_chieftain', 2]])}) from their hall.`, C.cleared('nf4_giants'), { markerSiteId: 'nf4_giants' }),
    ],
    timers: [
      {
        id: 'nf4_eruption',
        label: 'The eruption phase',
        startWhen: C.flag('nf4_release_open'),
        days: 6,
        metWhen: C.activated('nf4_conch'),
        consequence: 'When the phase ends the mountain settles. Nothing is destroyed and no army is harmed on the map; the lava tube stays filled while the vents are open.',
        announce: 'The release has not begun. Once the chains are struck, an eruption phase of six days follows: the lava tube fills, the cooled flow opens and Mazatl’s ash reserve counterattacks once, two days in.',
        onExpire: { flags: ['nf4_eruption_settled'] },
      },
      {
        id: 'nf4_counter',
        label: 'The ash reserve’s counterattack',
        startWhen: C.flag('nf4_release_open'),
        days: 2,
        metWhen: C.cleared('nf4_ravine_works'),
        consequence: `Mazatl’s ash reserve (${armyText(ashArmy)}) marches on the basin road — once. Breaking the Ravine Works first disbands it.`,
        onExpire: { flags: ['nf4_counterattack'] },
      },
    ],
    evidence: [
      { id: 'nf4_ev_mazatl', flag: 'nf4_mazatl_down', title: 'Mazatl beaten', text: 'Mazatl fell at the Crater Gate. He chained the serpents to bottle enough fire for one city — the Night-Knife’s.', icon: 'evidence' },
      { id: 'nf4_ev_released', flag: 'nf4_released', title: 'The serpents released', text: 'The chains were struck; the fire serpents rose over the crater and the release began.', icon: 'evacuation' },
      { id: 'nf4_ev_ember', flag: 'nf4_ember', title: 'The ember secured', text: 'A living ember, freely given by the serpents, sealed in the Cooling Basin.', icon: 'supply' },
      { id: 'nf4_ev_saved', flag: 'nf4_workshops_saved', title: 'The workshops saved', text: 'The mountain’s furnaces were kept for building: a material reserve for the end.', icon: 'supply' },
      { id: 'nf4_ev_dismantled', flag: 'nf4_dismantled', title: 'Extraction dismantled', text: 'Every furnace and fire-jar was broken. The serpents will remember who did it.', icon: 'pact' },
      { id: 'nf4_ev_counter', flag: 'nf4_counterattack', title: 'The ash reserve marched', text: 'Mazatl’s ash reserve counterattacked the basin road after the release began.', icon: 'branch' },
    ],
    carried: ['nf4_mazatl_down', 'nf4_released', 'nf4_ember', 'nf4_workshops_saved', 'nf4_dismantled'],
    briefing: [
      CHIMAL('The turquoise fire serpents carry the flame across the sky. Mazatl has them chained over the vents in the crater, bleeding their fire into jars — enough to light one city for a hundred years.'),
      XOCO('And the mountain does not like it. It is shaking, child. Free the serpents carelessly and the fire goes everywhere at once.'),
      ITZEL('Then we prepare first. A basin to hold an ember, two of his three works broken so his reserves cannot feed, and Mazatl out of the crater gate. We start the release when we are ready — not when he makes us run.'),
      XOCO('Mazatl was a temple guard of Xochitla. I knew his mother.'),
    ],
    briefingVariants: [
      { ifFlags: ['fact:nf3_surrender'], lines: [CHIMAL('Word from the lake: Tecuani surrendered on his own steps and opened Itzcalli’s granaries. Mazatl has lost his best customer.')] },
      { ifFlags: ['fact:nf3_field_broken'], lines: [CHIMAL('Tecuani’s field army is broken on his platform. Mazatl knows nobody is coming to buy his fire jars now.')] },
      { ifFlags: ['fact:nf3_city_taken'], lines: [XOCO('Itzcalli fell to a siege. The shore has its granaries — and Mazatl has one buyer fewer.')] },
      { ifFlags: ['fact:nf3_distributed'], lines: [XOCO('The shore districts keep their own reserves now. Whatever ember we bring down, there will be more than one hearth to take it.')] },
      { ifFlags: ['fact:nf3_central_store'], lines: [XOCO('The shore keeps one public store now, under watch. A hearth for the ember may be built the same way, if the cities agree to it.')] },
      { unlessFlags: ['fact:nf3_contracts'], lines: [ITZEL('Tecuani still holds Itzcalli and the lake road. If he gets these fire jars, he owns the next age outright.')] },
    ],
    victory: [
      ITZEL('The serpents fly, and the ember sleeps in the basin — given, not taken.'),
      XOCO('I will tell Mazatl’s mother he fought well at the end, and that he was sorry.'),
      ITZEL('From the crater rim I could see the smoking mountain in the east — and the morning-star stone and the evening-star stone on either side of its gate.'),
    ],
    scenes: [
      { id: 'nf4_works', trigger: { type: 'objective_completed', objectiveId: 'nf4_works' }, lines: [CHIMAL('Two works are cold. Their reserves will starve on the upper ring.'), XOCO('And the workshops are standing silent on the ring. Decide what becomes of them before you strike the chains.')] },
      { id: 'nf4_mazatl_battle', trigger: { type: 'battle_started', siteId: 'nf4_crater_gate' }, lines: [MAZATL('One city will have this fire, day-keeper — one strong city. Better that than a hundred cold ones.'), ITZEL('A hundred warm ones. That is the whole point.')] },
      { id: 'nf4_mazatl_down', trigger: { type: 'site_cleared', siteId: 'nf4_crater_gate' }, lines: [ITZTLI('(from the smoke above the crater) Mazatl guarded your temple once, day-keeper. Now he guards nothing. Everything comes to me in the end.'), ITZEL('The chains are behind the gate. We strike them when the basin is ready.')] },
      { id: 'nf4_release', trigger: { type: 'flag', flag: 'nf4_release_open' }, lines: [ITZEL('The chains are broken. They are rising — look at them!'), CHIMAL('And the mountain is answering. Lava in the south-west tube; the old flow below us is cooling into a road.'), XOCO('Two days before Mazatl’s ash reserve comes, if the ravine works still feed it. Carry the ember down the cooled flow.')] },
      { id: 'nf4_counter', trigger: { type: 'flag', flag: 'nf4_counterattack' }, lines: [CHIMAL('The ash reserve is coming down the ravine toward the basin road!')] },
      { id: 'nf4_saved', trigger: { type: 'flag', flag: 'nf4_workshops_saved' }, lines: [XOCO('Good furnaces. They will fire bricks for the hearths, not jars for one throne.')] },
      { id: 'nf4_dismantled', trigger: { type: 'flag', flag: 'nf4_dismantled' }, lines: [ITZEL('Break every jar. Nobody bottles a serpent’s breath on this mountain again.'), CHIMAL('They saw it. Two of them are circling lower than the rest.')] },
    ],
    loss: ['Itzel must survive.', 'Losing Quetzaltepec is recoverable while Itzel has a war-band.', 'The eruption never harms an army on the map, never closes the outer road and never ends the chapter.'],
    help: [
      { id: 'nf4_ring', title: 'The volcanic ring', text: 'A stable outer road circles the volcano. The quarry road, the forest saddle and the ash ravine climb inward, each through one extraction works; the upper ring joins them on the mid-slope (west to north-east, north-east to south-east). The crater wall has one gate. The lava tube in the south-west is an optional shortcut until the release.' },
      { id: 'nf4_release_help', title: 'The release', text: 'You choose when to strike the chains. The eruption phase that follows is shown in the journal: it closes only the optional lava tube, opens the cooled flow from the crater to the Cooling Basin and brings one counterattack, two days in, from the ash reserve — unless the Ravine Works are already broken. Nothing on the map is burned.' },
      { id: 'nf4_neutrals', title: 'Hiring on the mountain', text: 'Clay men hire at the cooled quarry in the west. The ahuitzotl keep to their lowland spring and do not come up the mountain.' },
    ],
  });

  // =========================================================================
  // Chapter 5 — The Smoking Gate (card 37; legacy m07)
  // =========================================================================
  const v1m07 = camp.v1('new_fire_m07');
  const itztli = v1m07.sites.find((x) => x.id === 'm07_hall')?.guard?.commander;
  const tlacatl = v1m07.hostileHeroes[0]?.commander;
  if (!itztli || !tlacatl) throw new Error('New Fire v2: Itztli’s or Tlacatl’s profile is missing from the legacy content');
  const palaceGuard: Army = [['mesoamerican_solar_eagle_warrior', 2], ['mesoamerican_celestial_feathered_serpent', 20], ['mesoamerican_celestial_feathered_serpent', 20], ['mesoamerican_sun_jaguar', 12], ['mesoamerican_divine_xiuhcoatl', 2], ['mesoamerican_blood_moon_camazotz', 2]];
  const barbicanGuard: Army = [['mesoamerican_celestial_feathered_serpent', 28], ['mesoamerican_sun_jaguar', 8], ['mesoamerican_solar_eagle_warrior', 2]];
  const morningGuard: Army = [['mesoamerican_celestial_feathered_serpent', 30], ['mesoamerican_sun_jaguar', 6]];
  const eveningGuard: Army = [['mesoamerican_xiuhcoatl', 2], ['mesoamerican_celestial_feathered_serpent', 12]];
  const supplyGuard: Army = [['mesoamerican_celestial_feathered_serpent', 20], ['mesoamerican_sun_jaguar', 6]];
  const tlacatlArmy: Army = [['mesoamerican_celestial_feathered_serpent', 24], ['mesoamerican_sun_jaguar', 8], ['mesoamerican_solar_eagle_warrior', 2]];
  const huntersArmy: Army = [['mesoamerican_celestial_feathered_serpent', 16], ['mesoamerican_sun_jaguar', 6], ['mesoamerican_blood_moon_camazotz', 1]];
  const m5 = chapter({
    campaign: camp,
    chapter: 5,
    card: 37,
    name: 'The Smoking Gate',
    summary:
      'Itztli means to make every surviving city depend on one stolen flame. Xoco’s records show how several hearths can share the renewal safely. Prepare three of the four basin hearths, cut Tlacatl’s main supply route, defeat Itztli at the Smoking Gate — and choose the terms of the next age before you launch the renewal.',
    playtime: '90–115 minutes, 5–8 battles',
    legacy: ['new_fire_m07'],
    economyFrom: 'new_fire_m07',
    principal: 'nf5_itztli',
    soundscape: 'storm_plateau',
    hostileName: 'The Night-Knife’s Host',
    town: { siteId: 'nf5_town', townId: 'tlapallan', name: 'Tlapallan' },
    map: {
      cols: 42,
      rows: 24,
      biome: 'jungle',
      base: 'plains',
      seed: 970005,
      texture: { forest: 80, rough: 50 },
      paint: [
        // The central obsidian ridge, with the hollow of the Smoking Gate inside it.
        { t: 'mountain', blob: [21, 12, 7] },
        { t: 'mountain', rect: [15, 6, 27, 18] },
        { t: 'plains', disc: [21, 12, 2] },
        // The two inner passes: the fortified obsidian stair from the west, the long evening pass from the south-east basin.
        { t: 'rough', line: [[11, 12], [18, 12]], width: 0 },
        { t: 'rough', line: [[23, 14], [29, 19]], width: 0 },
        // The barbican's supply postern: a side door round the barbican, used by Tlacatl's carriers.
        { t: 'rough', cells: [[16, 13]] },
        // Low ridges dividing the four basins along the outer circuit.
        { t: 'rough', blob: [4, 12, 2] },
        { t: 'mountain', cells: [[1, 11], [2, 11], [2, 12], [2, 13]] },
        { t: 'rough', blob: [21, 2, 1] },
        { t: 'rough', blob: [37, 12, 2] },
        { t: 'mountain', cells: [[40, 11], [39, 12], [40, 12], [40, 13]] },
        { t: 'rough', blob: [21, 21, 1] },
        // Basin country: maize, orchards, ash.
        { t: 'forest', blob: [7, 20, 2] },
        { t: 'forest', blob: [8, 3, 2] },
        { t: 'forest', blob: [34, 3, 2] },
        { t: 'rough', blob: [35, 20, 2] },
      ],
      roads: [
        // The outer caravan circuit through the four basins.
        { via: ['nf5_town', [9, 14], [6, 9], [10, 4], [21, 4], [32, 4], [36, 9], [35, 15], [31, 20], [21, 21], [11, 20], 'nf5_town'] },
        // The direct fortified approach: the obsidian stair through Tlacatl's barbican.
        { via: [[9, 14], [11, 12], 'nf5_barbican', [19, 12]] },
        { via: [[13, 13], 'nf5_postern', [17, 12]] },
        // The long approach: the evening pass from the south-east basin.
        { via: [[31, 20], [29, 19], 'nf5_evening_pass', [23, 14]] },
        // The hollow of the Smoking Gate.
        { via: [[19, 12], 'nf5_palace'] },
        { via: [[23, 14], 'nf5_palace'] },
        { via: [[19, 12], 'nf5_old_fire'] },
        { via: [[23, 14], 'nf5_altar'] },
        // The four hearths.
        { via: ['nf5_town', 'nf5_hearth_home'] },
        { via: [[6, 9], 'nf5_hearth_morning'] },
        { via: [[36, 9], 'nf5_hearth_market'] },
        { via: [[35, 15], 'nf5_hearth_evening'] },
        // Tlacatl's supply post and spurs.
        { via: [[32, 4], 'nf5_supply_post'] },
        { via: [[21, 4], 'nf5_caravan'] },
        { via: [[36, 9], 'nf5_wyverns'] },
        { via: [[10, 4], 'nf5_offerings'] },
        { via: ['nf5_town', 'nf5_sawmill'] },
        { via: [[21, 21], 'nf5_quarry'] },
      ],
    },
    sites: [
      S.town('nf5_town', 'tlapallan', [6, 18], 'Tlapallan', 'The last city before the ash-hills, in the south-west basin, where the sun is said to be born.', [7, 18]),
      S.resource('nf5_sawmill', [3, 21], 'sawmill'),
      S.resource('nf5_quarry', [21, 22], 'quarry'),
      S.resource('nf5_crystal', [38, 2], 'crystal_deposit'),
      // The four basin hearths: different final support, no hearth a key to another.
      S.activation('nf5_hearth_home', [10, 19], 'Tlapallan Hearth', 'The great hearth of Tlapallan’s basin. Its people will march with whoever lights it for the renewal.', { cost: { gold: 400, stone: 3, crystal: 1 }, reward: { flags: ['nf5_hearth_home_lit'], creatures: [{ creatureId: 'mesoamerican_celestial_feathered_serpent', count: 12 }], questXp: 500 }, confirm: 'Prepare Tlapallan’s hearth for the renewal (400 Gold, 3 Stone, 1 Crystal)? Its basin militia (12 Celestial Feathered Serpents) joins Itzel.', label: 'beacon' }, null, { marker: 'supply' }),
      S.activation('nf5_hearth_morning', [6, 5], 'Morning-star Stone', 'The hearth of the north-west basin, under the stone of the herald of the sun. Ash-road guards hold it for the Night-Knife.', { cost: { gold: 400, stone: 3, crystal: 1 }, reward: { flags: ['nf5_hearth_morning_lit'], resources: { favor: 15 }, questXp: 800 }, confirm: 'Prepare the morning-star hearth for the renewal (400 Gold, 3 Stone, 1 Crystal)? Its blessing gives 15 Favor.', label: 'beacon' }, { label: 'Ash-road guard', army: morningGuard, reward: { resources: { gold: 1000 } }, battlefield: 'ridge_pass' }, { marker: 'supply' }),
      S.activation('nf5_hearth_market', [37, 7], 'Market Hearth', 'The hearth of the north-east market basin — the richest of the four, and the one the Night-Knife covets most.', { cost: { gold: 400, stone: 3, crystal: 1 }, reward: { flags: ['nf5_hearth_market_lit'], resources: { gold: 3000, crystal: 4 }, questXp: 500 }, confirm: 'Prepare the market hearth for the renewal (400 Gold, 3 Stone, 1 Crystal)? The market pays 3,000 Gold and 4 Crystal — and Itztli will send his hunters against the richest hearth.', label: 'beacon' }, null, { marker: 'supply' }),
      S.activation('nf5_hearth_evening', [37, 17], 'Evening-star Stone', 'The hearth of the south-east basin, under the stone of the sun’s last light. Two chained fire serpents guard it against their will.', { cost: { gold: 400, stone: 3, crystal: 1 }, reward: { flags: ['nf5_hearth_evening_lit'], creatures: [{ creatureId: 'mesoamerican_solar_eagle_warrior', count: 4 }], questXp: 800 }, confirm: 'Prepare the evening-star hearth for the renewal (400 Gold, 3 Stone, 1 Crystal)? Its eagle watch (4 Solar Eagle Warriors) joins Itzel.', label: 'beacon' }, { label: 'Chained serpents', army: eveningGuard, reward: { resources: { gold: 1000 } }, battlefield: 'ridge_pass' }, { marker: 'supply' }),
      // Tlacatl's supply post on the caravan circuit.
      S.landmark('nf5_supply_post', [33, 2], 'Tlacatl’s Supply Post', 'The warden’s depot on the northern caravan road: obsidian, maize and slaves’ rations for the Smoking Gate.', 'quarry_cache', {
        label: 'Supply-post guard',
        army: supplyGuard,
        reward: { flags: ['nf5_supply_cut'], resources: { gold: 1500, crystal: 3 } },
        battlefield: 'ridge_pass',
      }, { objectiveIds: ['nf5_supply'], marker: 'supply' }),
      // The Smoking Gate: the direct fortified approach and the hollow.
      S.crossing('nf5_barbican', [15, 12], 'Obsidian Barbican', 'The fortified stair of the direct approach to the Smoking Gate. Itztli’s hunters are quartered here.', {
        label: 'Barbican guard',
        army: barbicanGuard,
        reward: { resources: { gold: 1500 } },
        battlefield: 'ridge_pass',
      }),
      S.shortcut('nf5_postern', [15, 13], 'Supply Postern', 'The carriers’ side door round the Obsidian Barbican. While Tlacatl’s supply post stands, it is barred and watched; once the post falls, nobody guards an empty door.', ['nf5_supply_cut']),
      S.crossing('nf5_evening_pass', [26, 17], 'Evening Pass', 'The long pass from the evening-star basin up through the obsidian ridge to the hollow of the Smoking Gate. Nobody holds it: the Night-Knife trusts its length.', null),
      S.landmark('nf5_palace', [21, 9], 'The Smoking Gate', 'Itztli’s obsidian palace at the heart of the ridge, where the old fire burns black.', 'refuge', {
        label: 'Itztli and the obsidian court',
        army: palaceGuard,
        commander: itztli,
        reward: { flags: ['nf5_itztli_down'], resources: { gold: 2000 }, questXp: 2500 },
        battlefield: 'beacon_clearing',
        required: true,
      }, { objectiveIds: ['nf5_itztli'] }),
      S.choice(
        'nf5_old_fire',
        [20, 11],
        'The Old Fire',
        'The old fire of the last binding, burning black in a brazier in the hollow.',
        'The terms of the next age',
        'With the Night-Knife gone, the old fire is free — and Xoco’s records say it can be shared: several hearths, lit together, each holding the others steady. The envoys of the four basins wait. “Light every hearth from it and let each city keep its own,” says one. “Light one great hearth, with a law that every city may draw from it,” says another. “Someone must be able to enforce that law.” No god is asked to choose.',
        [
          { label: 'Distribute the fire among protected local hearths', summary: 'Every basin keeps its own hearth, each protected by its own people; no single fire can be taken again. Remembered for the epilogue.', reward: { flags: ['nf_fire_local'], questXp: 500 }, requiresFlags: ['nf5_itztli_down'] },
          { label: 'A common central hearth with enforceable access', summary: 'One great hearth at the gate, with a sworn law of access the four basins can enforce together. Remembered for the epilogue.', reward: { flags: ['nf_fire_central'], questXp: 500 }, requiresFlags: ['nf5_itztli_down'] },
        ],
        { marker: 'pact', objectiveIds: ['nf5_plan'] },
      ),
      S.activation(
        'nf5_altar',
        [22, 13],
        'Altar of the Binding',
        'The altar in the hollow where the years are bound.',
        {
          cost: { gold: 1000, crystal: 3, favor: 10 },
          reward: { flags: ['nf5_renewal_launched'], questXp: 1000 },
          requirements: [
            { type: 'objective_completed', objectiveId: 'nf5_hearths' },
            { type: 'objective_completed', objectiveId: 'nf5_supply' },
            { type: 'objective_completed', objectiveId: 'nf5_itztli' },
            { type: 'objective_completed', objectiveId: 'nf5_plan' },
          ],
          confirm: 'Launch the renewal at the Altar of the Binding (1,000 Gold, 3 Crystal, 10 Favor)? The ritual runs for two days, then the years are bound and the chapter ends.',
        },
        null,
        { objectiveIds: ['nf5_launch'], marker: 'evidence' },
      ),
      // The final mixed caravan: one limited neutral purchase.
      S.choice(
        'nf5_caravan',
        [21, 3],
        'The Last Caravan',
        'A mixed caravan resting on the northern circuit: beast-handlers, slingers and a cage of ahuitzotl from the lowland springs.',
        'One band from the caravan',
        'The caravan master has room to sell one band before the ash closes the road. “Ahuitzotl from the warm springs — mind your fingers. Wyverns from the crags, hooded. Old-age giants who work for maize. Or slingers, cheap and steady.” One band only; the rest go on to the coast.',
        [
          { label: '5 Ahuitzotl', summary: 'Costs 1,250 Gold. 5 Ahuitzotl join Itzel.', cost: { gold: 1250 }, reward: { creatures: [{ creatureId: 'ahuitzotl', count: 5 }] } },
          { label: '3 Wyverns', summary: 'Costs 1,100 Gold. 3 Wyverns join Itzel.', cost: { gold: 1100 }, reward: { creatures: [{ creatureId: 'wyvern', count: 3 }] } },
          { label: '2 Ogres', summary: 'Costs 800 Gold. 2 Ogres join Itzel.', cost: { gold: 800 }, reward: { creatures: [{ creatureId: 'ogre', count: 2 }] } },
          { label: '10 Hill Slingers', summary: 'Costs 900 Gold. 10 Hill Slingers join Itzel.', cost: { gold: 900 }, reward: { creatures: [{ creatureId: 'hill_slinger', count: 10 }] } },
        ],
        { art: 'neutral_dwelling.ahuitzotl', marker: 'pact' },
      ),
      // Legacy beats.
      S.landmark('nf5_wyverns', [39, 10], 'Wyvern Crag', 'Wyverns roost on a crag above the eastern circuit.', 'nest', { label: 'Crag wyverns', army: [['wyvern_matriarch', 3]], reward: { resources: { crystal: 6 } }, battlefield: 'grove' }),
      S.pickup('nf5_offerings', [12, 6], 'Offerings of the Ages', 'Offerings left at the ash-hills at every binding of the years.', { resources: { gold: 1500, crystal: 3 } }),
    ],
    patrols: [
      {
        commander: tlacatl,
        start: [30, 4],
        waypoints: [[30, 4], [12, 4], [8, 9]],
        army: tlacatlArmy,
        home: 'nf5_supply_post',
        purpose: 'Tlacatl, warden of the Smoking Gate, runs the main supply route along the northern caravan road from his supply post toward the barbican. Taking the supply post cuts the route and he withdraws.',
      },
      {
        commander: band('nf5_hunters', 'Night-Knife Hunters', 'creature.mesoamerican.tier5.upgraded.portrait'),
        monster: true,
        bounty: { gold: 800 },
        start: [31, 9],
        waypoints: [[35, 8], [33, 10], [36, 6]],
        army: huntersArmy,
        home: 'nf5_barbican',
        dormantUntil: 'nf5_hearth_market_lit',
        threshold: [3, 2],
        purpose: 'Itztli’s hunters wait in the ash below the market basin. They strike the richest prepared hearth — the market hearth — once it is lit. They are quartered at the Obsidian Barbican: taking it recalls them.',
      },
    ],
    objectives: [
      O.primary(
        'nf5_hearths',
        'Prepare three hearths',
        `Prepare three of the four basin hearths for the renewal: Tlapallan’s own, the Morning-star Stone (${armyText(morningGuard)}), the Evening-star Stone (${armyText(eveningGuard)}) or the Market Hearth. Each gives a different support; none opens another.`,
        C.atLeast(3, C.activated('nf5_hearth_home'), C.activated('nf5_hearth_morning'), C.activated('nf5_hearth_evening'), C.activated('nf5_hearth_market')),
        { reward: { flags: ['nf5_hearths_ready'] }, hint: 'Itztli concentrates his attack on the richest prepared hearth: the market hearth pays most and draws his hunters.' },
      ),
      O.primary('nf5_supply', 'Cut Tlacatl’s supply route', `Take Tlacatl’s Supply Post on the northern caravan road (${armyText(supplyGuard)}), or defeat Tlacatl himself (${armyText(tlacatlArmy)}).`, C.any(C.cleared('nf5_supply_post'), C.defeated(tlacatl.heroDefinitionId)), { markerSiteId: 'nf5_supply_post' }),
      O.primary(
        'nf5_approach',
        'An approach to the gate',
        `Open a way into the hollow of the Smoking Gate: the direct fortified stair through the Obsidian Barbican (${armyText(barbicanGuard)}), or the long, unguarded Evening Pass up from the evening-star basin.`,
        C.any(C.visited('nf5_evening_pass'), C.cleared('nf5_barbican')),
        { hint: 'The barbican is short and hard; the evening pass is long and runs through a basin whose hearth you can prepare on the way.' },
      ),
      O.primary(
        'nf5_itztli',
        'The Night-Knife',
        `Defeat Itztli and the obsidian court (${armyText(palaceGuard)}) at the Smoking Gate — by the direct fortified stair through the Obsidian Barbican (${armyText(barbicanGuard)}), or the long evening pass from the south-east basin.`,
        C.cleared('nf5_palace'),
        { markerSiteId: 'nf5_palace' },
      ),
      O.primary('nf5_plan', 'The terms of the next age', 'At the Old Fire in the hollow, with Itztli gone, choose how the new fire is shared: protected local hearths, or a common central hearth with enforceable access.', C.any(C.flag('nf_fire_local'), C.flag('nf_fire_central')), { markerSiteId: 'nf5_old_fire', requires: ['nf5_itztli'] }),
      O.primary('nf5_launch', 'Launch the renewal', 'With three hearths prepared, the supply route cut, Itztli defeated and the plan chosen, launch the renewal at the Altar of the Binding. Its schedule is posted: two days of ritual, then the years are bound.', C.activated('nf5_altar'), { markerSiteId: 'nf5_altar', requires: ['nf5_hearths', 'nf5_supply', 'nf5_itztli', 'nf5_plan'] }),
      O.primary('nf5_renewal', 'The years are bound', 'Hold on while the renewal runs its posted course.', C.flag('nf5_renewal_complete'), { markerSiteId: 'nf5_altar', requires: ['nf5_launch'], completesMission: true }),
      O.optional('nf5_market_held', 'Hold the market hearth', `Break Itztli’s hunters (${armyText(huntersArmy)}) before they spoil the market hearth, or take the Obsidian Barbican where they are quartered: the market pays 1,500 Gold more.`, C.any(C.defeated('nf5_hunters'), C.cleared('nf5_barbican')), { markerSiteId: 'nf5_hearth_market', reward: { resources: { gold: 1500 } } }),
      O.optional('nf5_all_hearths', 'Every hearth ready', 'Prepare all four hearths.', C.all(C.activated('nf5_hearth_home'), C.activated('nf5_hearth_morning'), C.activated('nf5_hearth_evening'), C.activated('nf5_hearth_market'))),
      O.optional('nf5_caravan_buy', 'The last caravan', 'Buy one band from the mixed caravan on the northern circuit.', C.visited('nf5_caravan'), { markerSiteId: 'nf5_caravan' }),
      O.optional('nf5_crag', 'The wyvern crag', `Drive the wyvern matriarchs (${armyText([['wyvern_matriarch', 3]])}) from their crag.`, C.cleared('nf5_wyverns'), { markerSiteId: 'nf5_wyverns' }),
    ],
    timers: [
      {
        id: 'nf5_raid',
        label: 'Itztli’s hunters on the market hearth',
        startWhen: C.flag('nf5_hearth_market_lit'),
        days: 4,
        metWhen: C.any(C.defeated('nf5_hunters'), C.cleared('nf5_barbican')),
        consequence: 'The hunters spoil the market’s stores: the market hearth keeps its place in the renewal, but its extra 1,500 Gold is lost.',
        announce: 'Itztli will send his hunters against the richest hearth the moment it is lit: the market hearth.',
        onExpire: { flags: ['nf5_market_raided'], failObjectives: ['nf5_market_held'] },
      },
      {
        id: 'nf5_ritual',
        label: 'The renewal ritual',
        startWhen: C.flag('nf5_renewal_launched'),
        days: 2,
        metWhen: C.flag('nf5_ritual_interrupted_never'),
        consequence: 'When the two days are over, the years are bound and the chapter ends. Nothing can fail it once launched.',
        announce: 'The renewal’s schedule: once launched at the Altar of the Binding, the ritual runs for two days and two nights, then the years are bound.',
        onExpire: { flags: ['nf5_renewal_complete'] },
      },
    ],
    evidence: [
      { id: 'nf5_ev_home', flag: 'nf5_hearth_home_lit', title: 'Tlapallan’s hearth', text: 'Tlapallan’s hearth is ready for the renewal; its basin militia marches with Itzel.', icon: 'supply' },
      { id: 'nf5_ev_morning', flag: 'nf5_hearth_morning_lit', title: 'The morning-star hearth', text: 'The north-west basin’s hearth is ready under the morning-star stone.', icon: 'supply' },
      { id: 'nf5_ev_evening', flag: 'nf5_hearth_evening_lit', title: 'The evening-star hearth', text: 'The south-east basin’s hearth is ready under the evening-star stone; its eagle watch flies with Itzel.', icon: 'supply' },
      { id: 'nf5_ev_market', flag: 'nf5_hearth_market_lit', title: 'The market hearth', text: 'The richest basin’s hearth is ready — and Itztli knows it.', icon: 'supply' },
      { id: 'nf5_ev_raided', flag: 'nf5_market_raided', title: 'The market raided', text: 'Itztli’s hunters spoiled the market’s stores. Its hearth still holds its place in the renewal.', icon: 'branch' },
      { id: 'nf5_ev_supply', flag: 'nf5_supply_cut', title: 'The supply route cut', text: 'Tlacatl’s supply post fell; nothing more reaches the Smoking Gate.', icon: 'evidence' },
      { id: 'nf5_ev_itztli', flag: 'nf5_itztli_down', title: 'The Night-Knife', text: 'Itztli is beaten at the Smoking Gate. The old fire is free.', icon: 'evidence' },
      { id: 'nf5_ev_local', flag: 'nf_fire_local', title: 'Protected local hearths', text: 'The new fire was shared among the basins’ own hearths, each protected by its own people.', icon: 'pact' },
      { id: 'nf5_ev_central', flag: 'nf_fire_central', title: 'A common central hearth', text: 'One great hearth at the gate, with a law of access the four basins can enforce together.', icon: 'pact' },
    ],
    carried: ['nf_fire_local', 'nf_fire_central', 'nf5_market_raided'],
    entryBonuses: [
      { fact: 'nf3_central_store', label: 'The shore’s public store sends 2,000 Gold and 3 Crystal', wallet: { gold: 2000, crystal: 3 } },
      { fact: 'nf3_distributed', label: 'The districts’ militias hold Tlapallan (12 Celestial Feathered Serpents, 6 Sun Jaguars)', garrison: [{ creatureId: 'mesoamerican_celestial_feathered_serpent', count: 12 }, { creatureId: 'mesoamerican_sun_jaguar', count: 6 }] },
      { fact: 'nf4_workshops_saved', label: 'The mountain workshops’ material reserve (1,500 Gold, 6 Stone, 4 Crystal)', wallet: { gold: 1500, stone: 6, crystal: 4 } },
      { fact: 'nf4_dismantled', label: 'The fire serpents’ trust: 2 Xiuhcoatl join Itzel', heroArmy: [{ creatureId: 'mesoamerican_xiuhcoatl', count: 2 }] },
      { fact: 'nf3_surrender', label: 'Itzcalli’s surrendered guard keeps Tlapallan’s walls (10 Celestial Feathered Serpents)', garrison: [{ creatureId: 'mesoamerican_celestial_feathered_serpent', count: 10 }] },
    ],
    briefing: [
      ITZEL('The smoking mountain. The old fire of the last binding is inside, in the Night-Knife’s palace. He means every city to come to him for its fire — one flame, one master.'),
      XOCO('And my records say he is wrong about the one thing he is sure of. The cracks drained us because every city pulled on the same source. Several hearths, lit together, hold each other steady. Four basins, four hearths — three will do.'),
      CHIMAL('Tlacatl the warden runs his supplies along the northern caravan road. Cut that, and the gate starves. The barbican stair is the short way in; the evening pass is long, but it runs through a basin we can make ours.'),
      ITZTLI('Come in, day-keeper. Count your last day with me.'),
    ],
    briefingVariants: [
      { ifFlags: ['fact:nf3_central_store'], lines: [XOCO('The shore’s public store sent its share under seal — counted twice, by two districts. That is how you keep a central store honest.')] },
      { ifFlags: ['fact:nf3_distributed'], lines: [CHIMAL('The shore districts sent their own militias, from their own reserves. Nobody told them to.')] },
      { ifFlags: ['fact:nf4_workshops_saved'], lines: [CHIMAL('The furnaces of the fire mountain sent stone and crystal: hearth-bricks, Xoco calls them.')] },
      { ifFlags: ['fact:nf4_dismantled'], lines: [ITZEL('Two fire serpents followed us from the mountain. Nobody bottled them, so they came of their own accord.')] },
      { ifFlags: ['fact:nf3_surrender'], lines: [TECUANI('(a message from Itzcalli) My guard holds your walls, day-keeper. I wanted to own the next age’s fire. Let it at least see me keep someone else’s.')] },
      { ifFlags: ['fact:nf3_field_broken'], lines: [CHIMAL('Tecuani is a prisoner in his own palace. His city sends nothing — and asks for nothing.')] },
    ],
    victory: [
      ITZEL('The years are bound. The count begins again — and this time it was counted out loud, in front of everyone.'),
      XOCO('Fifty-two years. I have broken the pots twice, child. I would like to see the third time.'),
    ],
    scenes: [
      { id: 'nf5_supply', trigger: { type: 'flag', flag: 'nf5_supply_cut' }, lines: [CHIMAL('The supply post is ours. Nothing comes down the northern road to the gate any more — and the carriers’ postern beside the barbican stands empty.'), ITZEL('Then Tlacatl will be the hungry one tonight. And the short way in no longer needs a battle at the barbican.')] },
      { id: 'nf5_tlacatl', trigger: { type: 'battle_started', heroDefinitionId: tlacatl.heroDefinitionId }, lines: [TLACATL('I keep the road between the morning star and the evening star, day-keeper. Nothing passes it that the Night-Knife does not allow.'), ITZEL('The stars do not ask his permission. Neither do I.')] },
      { id: 'nf5_market', trigger: { type: 'flag', flag: 'nf5_hearth_market_lit' }, lines: [CHIMAL('The market hearth is lit — and there go Itztli’s hunters out of the ash, straight for it.'), XOCO('He always goes for the richest pot. Answer him, child; the other hearths have their own watch.')] },
      { id: 'nf5_raided', trigger: { type: 'flag', flag: 'nf5_market_raided' }, lines: [CHIMAL('The hunters spoiled the market stores. The hearth itself holds — the merchants are counting their losses, not their dead.')] },
      { id: 'nf5_itztli_battle', trigger: { type: 'battle_started', siteId: 'nf5_palace' }, lines: [ITZTLI('Every age ends, day-keeper. I only chose the day.'), ITZEL('The days are not yours to choose. They are only yours to count.')] },
      { id: 'nf5_itztli_down', trigger: { type: 'site_cleared', siteId: 'nf5_palace' }, lines: [ITZEL('He is gone. The old fire is still burning. One last thing to decide — and not by me alone.')] },
      { id: 'nf5_local_trust', trigger: { type: 'flag', flag: 'nf_fire_local' }, ifFlags: ['fact:nf3_distributed'], lines: [XOCO('The shore districts already keep their own reserves — they kept that promise, and they will keep their hearths.')] },
      { id: 'nf5_local_doubt', trigger: { type: 'flag', flag: 'nf_fire_local' }, ifFlags: ['fact:nf3_central_store'], lines: [CHIMAL('Tonalco’s elders kept one store on the shore and it worked. They will want to know who watches the small hearths when a lord like Tecuani comes again.')] },
      { id: 'nf5_central_trust', trigger: { type: 'flag', flag: 'nf_fire_central' }, ifFlags: ['fact:nf3_central_store'], lines: [XOCO('The shore already keeps one store under watch, and it has not been bought. They will believe a central hearth with a law around it.')] },
      { id: 'nf5_central_doubt', trigger: { type: 'flag', flag: 'nf_fire_central' }, ifFlags: ['fact:nf3_distributed'], lines: [CHIMAL('The shore districts gave Tecuani’s hoard out to every village so no one could hold it again. A central hearth will have to earn them back.')] },
      { id: 'nf5_growers', trigger: { type: 'flag', flag: 'nf5_renewal_launched' }, ifFlags: ['fact:nf1_growers'], lines: [ITZEL('The cacao growers of Xochitla and Tepeyolo came all the way to the ash-hills. We gave their first provisions back; they came to see the fire with their own eyes.')] },
      { id: 'nf5_watch', trigger: { type: 'flag', flag: 'nf5_renewal_launched' }, ifFlags: ['fact:nf1_watchposts'], lines: [CHIMAL('The lake watch posts we paid for sent runners. Every shore will have a coal by morning.')] },
      { id: 'nf5_contracts', trigger: { type: 'flag', flag: 'nf5_renewal_launched' }, ifFlags: ['fact:nf3_contracts'], lines: [XOCO('The settlements we gave contracts to are here as witnesses. A promise kept on the lake is worth a hearth at the gate.')] },
      { id: 'nf5_launched', trigger: { type: 'flag', flag: 'nf5_renewal_launched' }, lines: [XOCO('The fire-drill turns. Two days and two nights, child — then the years are bound. Keep the hearths.')] },
    ],
    loss: ['Itzel must survive.', 'Losing Tlapallan is recoverable while Itzel has a war-band.', 'There is no hidden deadline: the ritual’s two-day schedule starts only when you launch it.'],
    help: [
      { id: 'nf5_basins', title: 'Four basins round the obsidian ridge', text: 'An outer caravan circuit joins the four basins; two inner passes cross the ridge into the hollow of the Smoking Gate — the fortified obsidian stair from the west and the long evening pass from the south-east basin. Once Tlacatl’s supply post falls, the carriers’ postern lets you round the barbican. Each hearth gives a different support; none is a key to another.' },
      { id: 'nf5_pressure', title: 'Itztli and Tlacatl', text: 'Tlacatl runs the main supply route on the northern caravan road from his supply post. Itztli sends his hunters against the richest prepared hearth, the market hearth, as soon as it is lit; they are quartered at the Obsidian Barbican. The renewal’s two-day schedule is posted before you launch it.' },
    ],
  });
  return {
    missions: [m1, m2, m3, m4, m5],
    chapters: [
      { missionId: m1.id, chapter: 1, requiresAll: [], legacyMissionIds: ['new_fire_m01', 'new_fire_m02'], briefingArt: m1.briefingArt! },
      { missionId: m2.id, chapter: 2, requiresAll: [m1.id], legacyMissionIds: ['new_fire_m03', 'new_fire_m04'], briefingArt: m2.briefingArt! },
      { missionId: m3.id, chapter: 3, requiresAll: [m2.id], legacyMissionIds: ['new_fire_m05'], briefingArt: m3.briefingArt! },
      { missionId: m4.id, chapter: 4, requiresAll: [m2.id], legacyMissionIds: ['new_fire_m06'], briefingArt: m4.briefingArt! },
      { missionId: m5.id, chapter: 5, requiresAll: [m3.id, m4.id], legacyMissionIds: ['new_fire_m07'], briefingArt: m5.briefingArt! },
    ],
    epilogue: {
      // The campaign cover, not a v1 ending picture: the epilogue art is shown for both outcomes, and the
      // v1 endings picture the old-sun / new-sun choice, which the v2 finale no longer makes.
      art: 'campaign.new_fire.cover',
      lines: [
        XOCO('Every hearth was lit from the gate this morning. The children ran the coals from basin to basin, and nobody had to ask a lord for one.'),
        CHIMAL('A cold altar, a pack of black jaguars, a house of eagles, a lake of bats, a lord of glass and a mountain of fire serpents. I carried the shield the whole way.'),
        ITZEL('The long-road merchants bring stories from beyond the mountains — other lands where the cracks opened too. Some say their troubles are over; some say they have only begun. Merchants always bring stories. Whatever those lands choose, it is theirs to choose.'),
      ],
      variants: [
        { flag: 'nf_fire_local', lines: [ITZEL('Every basin keeps its own fire now, guarded by its own people. If one goes out, the others lend a coal — and nobody can carry all of them away again.'), XOCO('Slower than one great fire, and harder to steal. I can live with slow.')] },
        { flag: 'nf_fire_central', lines: [ITZEL('One great hearth burns at the gate, and the law of access is cut into its steps: any city may draw from it, and the four basins answer together for anyone who bars the way.'), XOCO('A strong fire with a strong law. Watch the law more closely than the fire, child.')] },
      ],
    },
  };
}
