/**
 * The Winter Oath, content v2 (campaign expansion handoff 2026-10-15; review
 * cards 9–14): six chapters carrying the seven legacy chapters.
 *
 *   1  Barrow Light (legacy m01) — a fjord-head hub: Kaldvik at the junction of
 *      the north, west and east valleys; the barrow above the north valley, the
 *      farms in the west and east branches joined by a forest trail over the Old
 *      Bridge; a repaired ford beside Kaldvik shortens the circuit through town.
 *   2  The White Pack and the Valkyrie’s Price (legacy m02 + m03) — a forked
 *      mountain above Birkaby: the western forest loop and the eastern scree loop
 *      meet at the high saddle (a figure eight); the troll pass is the short bar
 *      up the middle.
 *   3  Ice on the Sound (legacy m04) — an expedition from Skarvik Holm: three
 *      islands round a frozen sound, short ferries, the long sheltered skerry
 *      route in the south and a central ice road that bears on an announced day.
 *   4  The Jarl of Hvitstrand (legacy m05) — Hvitstrand at the head of an inlet in
 *      the middle of the map; the forest, upland and fishery roads ring it, the
 *      dock road is short and defended, the outer winter road reaches the rear gate.
 *   5  The Giants’ Refuge (legacy m06) — a glacial bowl above Jokulsby: two passes
 *      round the glacier, the quarry road along the upper terraces, three captive
 *      groups at three heights and a thaw gully that opens on an announced day.
 *   6  Oathbreaker’s Hall (legacy m07) — the Isafold highland: an inner plateau
 *      with three passes, an outer ring of settlements and three oath strongholds,
 *      and the old burial road linking two sectors.
 *
 * Order: 1 → 2 → {3, 4 in either order} → 5 → 6. Chapters 3 and 4 read each
 * other's facts (`fact:<flag>`): Hvitstrand's merchants supply an extra landing
 * on the sound only once Hvitstrand is opened, and Bone-Helm's ledger strengthens
 * the argument with Ulfhild only once it has been recovered. The existing cast
 * only (Hervor, Eydis, Skeggi, Ulfhild, Bone-Helm, Hrafn the Hollow, the Barrow
 * Captain, the Grey Jarl, Svanhild, the Troll-wife, Jökul). Values are proposed
 * and unplaytested; economies come from the legacy chapter each one carries first.
 */
import type { CommanderSpec } from '@pr/rules';
import { speaker } from '../arc';
import { C, O, S, armyText, chapter, guard, type Army, type V2Campaign } from './kit';
import type { V2Built } from './index';

const P = 'norse';
const HERVOR = speaker(P, 'Hervor');
const EYDIS = speaker(P, 'Eydis');
const SKEGGI = speaker(P, 'Skeggi');
const ULFHILD = speaker(P, 'Ulfhild');
const BONE_HELM = speaker(P, 'Bone-Helm');
const HRAFN = speaker(P, 'Hrafn the Hollow', 'hrafn');
const CAPTAIN = speaker(P, 'Barrow Captain');
const JARL = speaker(P, 'The Grey Jarl');
const SVANHILD = speaker(P, 'Svanhild');
const TROLL_WIFE = speaker(P, 'The Troll-wife');
const JOKUL = speaker(P, 'Jökul', 'jokul');

/** A band without a commander (raiders, packs, columns): its portrait is a creature's. */
function band(id: string, name: string, portrait: string): CommanderSpec {
  return { heroDefinitionId: id, name, classId: 'huscarl', level: 1, attributes: { attack: 0, defense: 0, power: 0, knowledge: 0 }, skills: [], spellbook: false, spellIds: [], mana: 0, portraitAssetId: portrait };
}
const DEAD_PORTRAIT = 'creature.norse.tier1.upgraded.portrait';
const WOLF_PORTRAIT = 'creature.norse.tier2.upgraded.portrait';

export function buildWinterOathV2(camp: V2Campaign): V2Built {
  // =========================================================================
  // Chapter 1 — Barrow Light (card 9; legacy m01)
  // =========================================================================
  const barrowGuard: Army = [['norse_draugr', 14], ['norse_deathless_draugr', 4]];
  const barrowHost: Army = [['norse_draugr', 8], ['norse_deathless_draugr', 5]];
  const stockadeGuard: Army = [['norse_draugr', 10], ['norse_frost_wolf', 3]];
  const graveCampGuard: Army = [['norse_draugr', 12], ['norse_deathless_draugr', 4], ['norse_frost_wolf', 4]];
  const raidArmy: Army = [['norse_draugr', 8], ['norse_frost_wolf', 3]];
  const m1 = chapter({
    campaign: camp,
    chapter: 1,
    card: 9,
    name: 'Barrow Light',
    summary:
      'The barrow above Kaldvik opened when Hervor drew her sword, and the dead are walking the valleys at night. Relight the barrow watch and hold it, secure the evacuation routes from the west and east farms before the announced night raids, and recover the oath’s first inscription.',
    playtime: '45–60 minutes, 3–4 battles',
    legacy: ['winter_oath_m01'],
    economyFrom: 'winter_oath_m01',
    principal: 'wo1_watch',
    soundscape: 'fjord',
    hostileName: 'The Winter Host',
    town: { siteId: 'wo1_town', townId: 'kaldvik', name: 'Kaldvik' },
    map: {
      cols: 32,
      rows: 20,
      biome: 'fjord',
      base: 'plains',
      seed: 970001,
      texture: { forest: 50, rough: 50 },
      paint: [
        // The fjord head south of Kaldvik, open to the sea.
        { t: 'water', blob: [16, 18, 2] },
        { t: 'water', rect: [11, 17, 21, 19] },
        // The river from the northern fells to the fjord, east of Kaldvik.
        { t: 'water', line: [[20, 0], [20, 4], [19, 8], [18, 12], [19, 16]], width: 0 },
        // The north-west massif between the north valley and the west valley.
        { t: 'mountain', blob: [10, 8, 3] },
        { t: 'mountain', line: [[12, 10], [13, 12]], width: 0 },
        { t: 'rough', cells: [[12, 11], [11, 12]] },
        // The fells east of the river between the east valley and the grave-road.
        { t: 'mountain', blob: [25, 7, 2] },
        { t: 'mountain', cells: [[23, 6], [22, 7]] },
        // The barrow mound on the northern fell, with its sealed passage.
        { t: 'mountain', rect: [16, 1, 19, 3] },
        { t: 'rough', blob: [14, 3, 1] },
        // The north woods along the forest trail, and the logging camp.
        { t: 'forest', blob: [6, 4, 2] },
        { t: 'forest', cells: [[12, 2], [13, 1], [23, 2], [24, 3]] },
        // Farm fields in the west and east branches.
        { t: 'plains', disc: [4, 10, 1] },
        { t: 'plains', disc: [28, 11, 1] },
        // The coast: skerries and shore marsh.
        { t: 'marsh', cells: [[8, 17], [9, 17], [24, 17], [25, 17]] },
      ],
      roads: [
        // The north valley: Kaldvik to the barrow watch.
        { via: ['wo1_town', [15, 10], [15, 6], 'wo1_watch'] },
        // The west valley: Kaldvik — the stockade — the west farms.
        { via: ['wo1_town', 'wo1_west_post', [7, 12], 'wo1_west_farm'] },
        // The forest trail from the west farms over the Old Bridge to the east farms.
        { via: ['wo1_west_farm', [6, 7], [10, 4], [15, 6]] },
        { via: [[15, 6], 'wo1_bridge', [23, 4], [28, 6], 'wo1_east_farm'] },
        // The east valley: the ford beside Kaldvik — the east watch-post — the east farms.
        { via: ['wo1_town', 'wo1_ford', 'wo1_east_post', 'wo1_east_farm'] },
        // Spurs.
        { via: ['wo1_town', 'wo1_sledges'] },
        { via: ['wo1_town', 'wo1_fordwright'] },
        { via: [[7, 12], 'wo1_ridge'] },
        { via: ['wo1_west_farm', 'wo1_west_stores'] },
        { via: ['wo1_east_farm', 'wo1_east_stores'] },
        { via: [[10, 4], 'wo1_logging'] },
        { via: [[23, 4], 'wo1_grave_camp'] },
        { via: ['wo1_watch', 'wo1_mouth', 'wo1_host', 'wo1_inscription'] },
        { via: ['wo1_town', 'wo1_sawmill'] },
        { via: ['wo1_east_post', 'wo1_quarry'] },
        { via: ['wo1_east_post', 'wo1_longship'] },
      ],
    },
    sites: [
      S.town('wo1_town', 'kaldvik', [15, 15], 'Kaldvik', 'Hervor’s fjord-hold at the head of the fjord, where the north, west and east valleys meet.', [15, 14]),
      S.resource('wo1_sawmill', [11, 15], 'sawmill'),
      S.resource('wo1_quarry', [25, 14], 'quarry'),
      // The barrow above the north valley.
      S.activation(
        'wo1_watch',
        [15, 3],
        'Barrow Watch',
        'The watch-fire on the barrow’s shoulder that kept Kaldvik’s dead asleep. It went out the night Hervor drew her sword; the barrow’s guard stands around the cold hearth.',
        {
          cost: { gold: 300, stone: 3, crystal: 1 },
          reward: { flags: ['wo1_watch_lit'], questXp: 600 },
          confirm: 'Pay 300 Gold, 3 Stone and 1 Crystal to relight the barrow watch? The dead inside the barrow will come out against the light — be ready to hold the watch.',
        },
        { label: 'Barrow-guard', army: barrowGuard, reward: { resources: { gold: 500 }, artifactIds: ['rune_marked_sword'] }, battlefield: 'beacon_clearing', required: true },
        { objectiveIds: ['wo1_watch_clear', 'wo1_watch'] },
      ),
      S.shortcut('wo1_mouth', [17, 3], 'Barrow Mouth', 'The stone door of the barrow. It stands sealed while the watch is dark; once the fire burns again, the dead push it open from inside.', ['wo1_watch_lit']),
      S.crossing('wo1_host', [18, 2], 'Barrow Passage', 'The barrow’s passage, crowded with its dead pushing toward the watch-fire. Beyond them lies the innermost stone.', {
        label: 'The barrow host',
        army: barrowHost,
        reward: { flags: ['wo1_held'], resources: { gold: 400 }, questXp: 600 },
        battlefield: 'beacon_clearing',
        required: true,
      }, { objectiveIds: ['wo1_hold'] }),
      S.pickup('wo1_inscription', [18, 1], 'The First Inscription', 'The innermost stone of the barrow, where the oath was first cut: protection for the settlements “until the winter ends” — and no end agreed.', { flags: ['wo1_inscription'], questXp: 500 }, { marker: 'evidence', objectiveIds: ['wo1_inscription'] }),
      // The west branch.
      S.landmark('wo1_west_post', [9, 14], 'West Stockade', 'The farmers’ stockade on the west valley road. The dead took it in the first raid; whoever holds it holds the road.', 'refuge', {
        label: 'Stockade dead',
        army: stockadeGuard,
        reward: { flags: ['wo1_west_secured'], resources: { gold: 300, wood: 2 } },
        battlefield: 'open_field',
        required: true,
      }, { marker: 'evacuation' }),
      S.landmark('wo1_west_farm', [4, 10], 'West Farms', 'Sheep-farms at the head of the west valley. The families are packed and waiting for a safe road.', 'refuge', null, { marker: 'evacuation' }),
      S.depot('wo1_west_stores', [3, 13], 'West Farm Stores', 'Smoked mutton, wool and coin the west farms put by for winter. The full share is here until the first night raid.', { resources: { gold: 300, wood: 2 } }),
      // The east branch.
      S.activation(
        'wo1_east_post',
        [23, 13],
        'East Watch-post',
        'An empty watch-post on the east valley road. Kaldvik can man it from the hold’s own stores — no battle, just spears, a fire and someone awake.',
        { cost: { gold: 300, wood: 2 }, reward: { flags: ['wo1_east_secured'], questXp: 300 }, confirm: 'Pay 300 Gold and 2 Wood to man the East Watch-post from Kaldvik? It guards the east evacuation route.', label: 'relay' },
        null,
        { marker: 'evacuation' },
      ),
      S.landmark('wo1_east_farm', [28, 11], 'East Farms', 'Cattle-farms at the head of the east valley, below the grave-road fells.', 'refuge', null, { marker: 'evacuation' }),
      S.depot('wo1_east_stores', [29, 14], 'East Farm Stores', 'Cheese, hides and coin the east farms put by for winter. The full share is here until the second night raid.', { resources: { gold: 300, stone: 2 } }),
      // The river crossings.
      S.crossing('wo1_bridge', [20, 4], 'Old Bridge', 'A timber bridge where the forest trail crosses the river under the fells — the long way between the valleys.', null),
      S.shortcut('wo1_ford', [18, 13], 'Kaldvik Ford', 'The cattle-ford beside Kaldvik, its stepping-stones washed out in the autumn floods. Repaired, it puts the east valley half a day from the hold.', ['wo1_ford_repaired']),
      S.activation('wo1_fordwright', [17, 15], 'Fordwright’s Yard', 'Timber, stone and the old fordwright who knows where the stepping-stones went.', { cost: { wood: 4, stone: 4 }, reward: { flags: ['wo1_ford_repaired'] }, confirm: 'Pay 4 Wood and 4 Stone to repair Kaldvik Ford? It opens a short way into the east valley.', label: 'relay' }, null),
      // The raid origin, seen from the ridge.
      S.landmark('wo1_grave_camp', [27, 3], 'Grave-road Camp', 'Where the grave-road comes down from the fells. The night raiders gather here before they go out; take it and no raid leaves again.', 'refuge', {
        label: 'Grave-road raiders',
        army: graveCampGuard,
        reward: { flags: ['wo1_grave_taken'], resources: { gold: 600, crystal: 1 } },
        battlefield: 'ridge_pass',
      }, { markerHiddenUntilRevealed: true }),
      S.watchtower('wo1_ridge', [11, 11], 'Skeggi’s Ridge', 'A shepherds’ lookout on the spur of the north-west massif. From the top, the grave-road and the fells beyond the river lie open.', ['wo1_grave_camp', 'wo1_east_farm', 'wo1_west_farm']),
      // Choices and neutral hiring.
      S.choice(
        'wo1_sledges',
        [13, 14],
        'Sledge-yard',
        'Skeggi’s sledges and the families’ carts, waiting by Kaldvik’s gate for the roads to open.',
        'Where the families go',
        'Skeggi has a list of every family in the west and east branches, and sledges for most of them. “Inside our walls they are safe this winter, and the hold has hands for its watch when the next war comes,” he says. “Or we take them down to the coast, where the harbours still trade. They would send back what they can.”',
        [
          { label: 'Shelter them inside Kaldvik', summary: 'Costs 600 Gold and 6 Wood for beds and firewood. Kaldvik keeps a defensive reserve: in the final chapter 16 Deathless Draugr of Kaldvik’s barrow-watch hold Isafold.', cost: { gold: 600, wood: 6 }, reward: { flags: ['wo1_sheltered'] } },
          { label: 'Help them reach the coast', summary: 'Costs 400 Gold for sledges and a guide. The families settle by the harbours: in the Hvitstrand chapter they send supplies (1,500 Gold, 6 Wood).', cost: { gold: 400 }, reward: { flags: ['wo1_to_coast'] } },
        ],
        { marker: 'pact', objectiveIds: ['wo1_choice'] },
      ),
      S.camp('wo1_logging', [8, 3], 'Logging Camp', 'Hill slingers working the north woods for Kaldvik’s timber merchants. They will sell their slings to the hold.', 'hill_slinger', 3, 6),
      S.camp('wo1_wolf_camp', [24, 10], 'Birchwood Wolf Camp', 'Half-tame frost wolves that follow a hold which feeds them.', 'norse_frost_wolf', 3, 4),
      S.choice(
        'wo1_longship',
        [21, 16],
        'Frozen Longship',
        'A longship caught in the fjord ice since autumn. Its crew never came ashore.',
        'The Frozen Longship',
        'The ice has the ship to the rails. In the hold: barrels of salt fish, a chest of trade silver — and four drowned oarsmen still at their benches, eyes open, waiting for a word.',
        [
          { label: 'Salvage the cargo', summary: '+600 Gold and +4 Wood.', reward: { resources: { gold: 600, wood: 4 } } },
          { label: 'Speak the rune-word to the crew', summary: '4 Draugar join Hervor’s army.', reward: { creatures: [{ creatureId: 'norse_draugr', count: 4 }] } },
        ],
      ),
      S.pickup('wo1_cairn', [26, 16], 'Snowed-in Cairn', 'A hunter’s cairn with a cache under the stones.', { resources: { gold: 400, crystal: 1 } }),
    ],
    patrols: [
      {
        commander: band('wo1_west_raid', 'First Night Raid', DEAD_PORTRAIT),
        monster: true,
        bounty: { gold: 300 },
        start: [26, 4],
        waypoints: [[23, 4], [15, 6], [10, 4], [6, 7], [5, 11], [7, 12]],
        army: raidArmy,
        home: 'wo1_grave_camp',
        dormantUntil: 'wo1_west_raid',
        threshold: [3, 2],
        purpose: 'Waits at the grave-road camp until its announced night, then raids the west farms by the forest trail. A west road held from the stockade turns it back before it leaves; taking the grave-road camp ends it.',
      },
      {
        commander: band('wo1_east_raid', 'Second Night Raid', DEAD_PORTRAIT),
        monster: true,
        bounty: { gold: 300 },
        start: [27, 5],
        waypoints: [[27, 8], [28, 10], [26, 12], [22, 13]],
        army: raidArmy,
        home: 'wo1_grave_camp',
        dormantUntil: 'wo1_east_raid',
        threshold: [3, 2],
        purpose: 'Waits at the grave-road camp until its announced night, then raids the east farms and the east valley road. A manned East Watch-post turns it back before it leaves; taking the grave-road camp ends it.',
      },
    ],
    objectives: [
      O.primary('wo1_watch_clear', 'Break the barrow-guard', `Drive the barrow-guard (${armyText(barrowGuard)}) from the cold watch-fire on the barrow’s shoulder — up the north valley, or round by the west valley and the forest trail.`, C.cleared('wo1_watch'), { markerSiteId: 'wo1_watch' }),
      O.primary('wo1_watch', 'Relight the barrow watch', 'With the guard broken, pay 300 Gold, 3 Stone and 1 Crystal to relight the watch-fire.', C.activated('wo1_watch'), { markerSiteId: 'wo1_watch', requires: ['wo1_watch_clear'] }),
      O.primary('wo1_hold', 'Hold the watch', `The light wakes the barrow: hold the watch against the barrow host (${armyText(barrowHost)}) when it pushes up the Barrow Passage.`, C.cleared('wo1_host'), { markerSiteId: 'wo1_host', requires: ['wo1_watch'] }),
      O.primary('wo1_west_route', 'Secure the west evacuation route', `Reach the West Farms and retake the West Stockade on their road (${armyText(stockadeGuard)}). A stockade held by Kaldvik guards the road — Hervor need not stand on it.`, C.all(C.visited('wo1_west_farm'), C.cleared('wo1_west_post')), { markerSiteId: 'wo1_west_post' }),
      O.primary(
        'wo1_east_route',
        'Secure the east evacuation route',
        'Cross into the east valley — repair Kaldvik Ford at the Fordwright’s Yard (4 Wood, 4 Stone), or go the long way over the Old Bridge — then reach the East Farms and man the East Watch-post from Kaldvik’s stores (300 Gold, 2 Wood).',
        C.all(C.any(C.flag('wo1_ford_repaired'), C.visited('wo1_bridge')), C.visited('wo1_east_farm'), C.activated('wo1_east_post')),
        { markerSiteId: 'wo1_east_post' },
      ),
      O.primary('wo1_inscription', 'Recover the first inscription', 'With the watch held and both evacuation routes secured, bring Eydis to the innermost stone of the barrow and read the oath’s first inscription.', C.visited('wo1_inscription'), { markerSiteId: 'wo1_inscription', requires: ['wo1_hold', 'wo1_west_route', 'wo1_east_route'], completesMission: true }),
      O.optional('wo1_west_provisions', 'The west farms’ provisions', 'Bring in the West Farm Stores before the first night raid: +400 Gold and +2 Wood more.', C.visited('wo1_west_stores'), { markerSiteId: 'wo1_west_stores', reward: { resources: { gold: 400, wood: 2 } } }),
      O.optional('wo1_east_provisions', 'The east farms’ provisions', 'Bring in the East Farm Stores before the second night raid: +400 Gold and +2 Stone more.', C.visited('wo1_east_stores'), { markerSiteId: 'wo1_east_stores', reward: { resources: { gold: 400, stone: 2 } } }),
      O.optional('wo1_ford_works', 'Repair Kaldvik Ford', 'Pay the fordwright 4 Wood and 4 Stone: the east valley is half a day from the hold.', C.flag('wo1_ford_repaired'), { markerSiteId: 'wo1_fordwright' }),
      O.optional('wo1_grave', 'The grave-road camp', `Take the camp the night raiders gather in (${armyText(graveCampGuard)}): no raid leaves it again. Skeggi’s Ridge shows where it is.`, C.cleared('wo1_grave_camp'), { markerSiteId: 'wo1_grave_camp' }),
      O.optional('wo1_choice', 'Where the families go', 'At the Sledge-yard, decide whether the farm families winter inside Kaldvik or go down to the coast.', C.any(C.flag('wo1_sheltered'), C.flag('wo1_to_coast')), { markerSiteId: 'wo1_sledges' }),
      O.optional('wo1_raise', 'Raise the barrow-watch', 'Recruit at least 10 Draugar in Kaldvik.', C.counter('recruited:norse_draugr', 10), { hint: 'The Draugr Barrow is in Kaldvik; training into Deathless Draugar costs only the price difference.' }),
    ],
    timers: [
      {
        id: 'wo1_raid_west',
        label: 'The first night raid (west farms)',
        startWhen: C.all(),
        days: 6,
        metWhen: C.any(C.cleared('wo1_west_post'), C.cleared('wo1_grave_camp')),
        consequence: 'The raid reaches the west farms: their stores keep only the base share (the 400 Gold and 2 Wood bonus is lost), and the raiders walk the west valley until their camp is taken. The families, the stockade and the route are not lost.',
        announce: 'Skeggi’s scouts saw the dead gathering on the grave-road: the first night raid goes for the west farms after the sixth day. A stockade held by Kaldvik turns it back.',
        onExpire: { flags: ['wo1_west_raid'], failObjectives: ['wo1_west_provisions'] },
      },
      {
        id: 'wo1_raid_east',
        label: 'The second night raid (east farms)',
        startWhen: C.all(),
        days: 10,
        metWhen: C.any(C.activated('wo1_east_post'), C.cleared('wo1_grave_camp')),
        consequence: 'The raid reaches the east farms: their stores keep only the base share (the 400 Gold and 2 Stone bonus is lost), and the raiders walk the east valley until their camp is taken. The families, the watch-post and the route are not lost.',
        announce: 'The second night raid is set for the east farms after the tenth day. A manned East Watch-post turns it back.',
        onExpire: { flags: ['wo1_east_raid'], failObjectives: ['wo1_east_provisions'] },
      },
    ],
    evidence: [
      { id: 'wo1_ev_inscription', flag: 'wo1_inscription', title: 'The first inscription', text: 'The oath promised the settlements protection “until the winter ends”. No one agreed when that would be.', icon: 'evidence' },
      { id: 'wo1_ev_held', flag: 'wo1_held', title: 'The watch held', text: 'The barrow watch burns again, and its host was broken at the barrow mouth.', icon: 'evidence' },
      { id: 'wo1_ev_sheltered', flag: 'wo1_sheltered', title: 'Sheltered in Kaldvik', text: 'The farm families winter inside Kaldvik: the hold keeps a defensive reserve.', icon: 'evacuation' },
      { id: 'wo1_ev_coast', flag: 'wo1_to_coast', title: 'Down to the coast', text: 'The farm families went down to the harbours on the coast; they will send supplies back.', icon: 'supply' },
      { id: 'wo1_ev_grave', flag: 'wo1_grave_taken', title: 'The grave-road camp', text: 'The night raiders’ camp on the grave-road is taken. They came down from the north, along the oath’s old road.', icon: 'branch' },
    ],
    carried: ['wo1_inscription', 'wo1_sheltered', 'wo1_to_coast'],
    briefing: [
      EYDIS('Spring is two months late, and last night the barrow above the hold cracked open. The watch-fire went out the moment you drew that sword, Hervor.'),
      HERVOR('Then we light it again and stand beside it. Whatever comes out of that barrow comes out into the light.'),
      SKEGGI('And the farms? The dead walked the west valley twice this month. My scouts say they gather on the grave-road and come down on a schedule, like reapers. The next raid takes the west farms, then the east.'),
      EYDIS('There is writing in the barrow, older than the hold. If it is the oath your sword woke, I want to read it before it wakes anything else.'),
    ],
    victory: [
      EYDIS('“Protection for the settlements, until the winter ends.” That is all it says. No end, no keeper, no price.'),
      HERVOR('An oath with no end is a winter that never stops. And I am the one carrying its sword.'),
      SKEGGI('Birkaby’s grain-road has gone quiet too. Wolves, they say — wolves that do not hunt like wolves.'),
    ],
    scenes: [
      { id: 'wo1_guard_battle', trigger: { type: 'battle_started', siteId: 'wo1_watch' }, lines: [JARL('Little seeress. What you buried under that barrow is mine. My dead will carry it home.'), HERVOR('Your dead can try. Mine are standing in front of them.')] },
      { id: 'wo1_sword', trigger: { type: 'site_cleared', siteId: 'wo1_watch' }, lines: [HERVOR('Nine winters ago I took this sword from a mound in the north and laid it here, under the watch, so it would sleep. It is awake.'), SKEGGI('Then light the fire, Hervor — and keep the blade close.')] },
      { id: 'wo1_lit', trigger: { type: 'flag', flag: 'wo1_watch_lit' }, lines: [EYDIS('The fire is lit — and the barrow mouth is moving. They are coming out toward the light.'), HERVOR('Good. This is a watch, not a lamp. We hold it.')] },
      { id: 'wo1_held', trigger: { type: 'site_cleared', siteId: 'wo1_host' }, lines: [SKEGGI('The host is broken at the door. The passage is open — Eydis, your writing is at the bottom of it.')] },
      { id: 'wo1_ridge', trigger: { type: 'site_visited', siteId: 'wo1_ridge' }, lines: [SKEGGI('There — where the grave-road comes off the fells beyond the river. Fires, and tracks going two ways: west by the forest trail, east down the valley.'), HERVOR('Then that is where the raids are born. Take the camp and they die there.')] },
      { id: 'wo1_ford', trigger: { type: 'flag', flag: 'wo1_ford_repaired' }, lines: [SKEGGI('The ford holds a sledge again. The east valley is a morning from the gate.')] },
      { id: 'wo1_west_raided', trigger: { type: 'flag', flag: 'wo1_west_raid' }, lines: [SKEGGI('The first raid came down the forest trail last night. The west stores are thinner — but the families are still waiting, and the road can still be held.')] },
      { id: 'wo1_east_raided', trigger: { type: 'flag', flag: 'wo1_east_raid' }, lines: [SKEGGI('The second raid is in the east valley. The farms lost their stores, not their people. Man the watch-post and the road is ours again.')] },
      { id: 'wo1_read', trigger: { type: 'site_visited', siteId: 'wo1_inscription' }, lines: [EYDIS('Here. Cut deeper than the rest: “The dead will keep the settlements until the winter ends.” Nothing else. Nobody wrote when it ends.')] },
      { id: 'wo1_losses', trigger: { type: 'casualties', minLost: 4 }, lines: [EYDIS('I count the living and I count the dead, Hervor. Tonight the second list grew. Bring more of them home.'), HERVOR('I hear you, Eydis.')] },
    ],
    loss: ['Hervor must survive (defeat, retreat or surrender ends the chapter).', 'Losing Kaldvik is recoverable while Hervor has an army.', 'A night raid costs only a farm’s bonus provisions: the families and the routes can always still be secured.'],
    help: [
      { id: 'wo1_valleys', title: 'Three valleys and a ford', text: 'The north valley climbs from Kaldvik to the barrow. The west valley runs to the west farms; the forest trail joins them to the barrow and, over the Old Bridge, to the east farms. Repairing Kaldvik Ford shortens the circuit through the hold.' },
      { id: 'wo1_raids', title: 'Announced night raids', text: 'Each raid leaves the grave-road camp on its announced night (the journal shows the deadline). A road guarded by a stockade or watch-post held by Kaldvik turns its raid back before it leaves; a missed raid costs only that farm’s bonus provisions. Skeggi’s Ridge shows where the raids gather.' },
      { id: 'wo1_watch_help', title: 'The barrow watch', text: 'The watch is a position, not a switch: once it burns, the Barrow Mouth opens and the barrow host comes up the passage toward the fire. The chapter needs it broken; the first inscription lies behind it.' },
    ],
  });

  // =========================================================================
  // Chapter 2 — The White Pack and the Valkyrie's Price (card 10; legacy m02 + m03)
  // =========================================================================
  const v1m02 = camp.v1('winter_oath_m02');
  const whitePack = v1m02.hostileHeroes[0]?.commander;
  if (!whitePack) throw new Error('Winter Oath v2: the White Pack’s profile is missing from the legacy content');
  const packArmy: Army = [['norse_fenrir_wolf', 6], ['norse_frost_wolf', 12]];
  const lairGuard: Army = [['norse_fenrir_wolf', 4], ['norse_frost_wolf', 6]];
  const trollGuard: Army = [['norse_frost_troll', 4], ['norse_ancient_frost_troll', 1]];
  const jailerGuard: Army = [['norse_deathless_draugr', 14], ['norse_draugr', 12], ['norse_frost_troll', 3]];
  const graveRoadGuard: Army = [['norse_draugr', 16], ['norse_deathless_draugr', 6]];
  const reinforcement: Army = [['norse_deathless_draugr', 10], ['norse_draugr', 8], ['norse_frost_wolf', 4]];
  const m2 = chapter({
    campaign: camp,
    chapter: 2,
    card: 10,
    name: 'The White Pack and the Valkyrie’s Price',
    summary:
      'A white wolf-pack harries Birkaby’s herds, and the barrow dead it hunts hold the valkyries’ refuge on the saddle above the forked mountain. End the pack’s attacks — by battle or by a costly food-and-territory agreement — free the refuge from its barrow jailer, and settle the troll pass by toll or by force.',
    playtime: '60–80 minutes, 4–5 battles',
    legacy: ['winter_oath_m02', 'winter_oath_m03'],
    economyFrom: 'winter_oath_m02',
    principal: 'wo2_refuge',
    soundscape: 'fjord',
    hostileName: 'The Winter Host',
    town: { siteId: 'wo2_town', townId: 'birkaby', name: 'Birkaby' },
    map: {
      cols: 34,
      rows: 22,
      biome: 'tundra',
      base: 'plains',
      seed: 970002,
      texture: { forest: 40, rough: 60 },
      paint: [
        // The forked mountain: two peaks with the narrow troll pass between them.
        { t: 'mountain', blob: [11, 9, 3] },
        { t: 'mountain', blob: [23, 9, 3] },
        { t: 'mountain', rect: [14, 7, 16, 13] },
        { t: 'mountain', rect: [18, 7, 20, 13] },
        { t: 'rough', line: [[17, 6], [17, 14]], width: 0 },
        // The high saddle joining the two forks under the refuge crag.
        { t: 'rough', rect: [8, 3, 26, 5] },
        { t: 'mountain', cells: [[14, 1], [15, 1], [20, 1], [21, 1], [13, 2], [21, 2]] },
        // The western forest (the lower forest loop) and the eastern scree.
        { t: 'forest', blob: [5, 10, 3] },
        { t: 'forest', blob: [4, 15, 1] },
        { t: 'rough', blob: [29, 11, 3] },
        { t: 'rough', blob: [29, 16, 1] },
        // Birkaby's grain fields in the south.
        { t: 'plains', rect: [12, 16, 22, 19] },
      ],
      roads: [
        // The troll pass, straight up the middle.
        { via: ['wo2_town', [17, 15], 'wo2_troll_pass', 'wo2_barricade', [17, 5], 'wo2_refuge'] },
        // The western loop through the forest to the saddle.
        { via: ['wo2_town', [11, 18], [6, 15], [4, 11], [6, 6], [10, 4], [17, 5]] },
        // The eastern loop over the scree to the saddle.
        { via: ['wo2_town', [23, 18], [28, 15], [30, 11], [28, 6], [24, 4], [17, 5]] },
        // Spurs.
        { via: [[17, 15], 'wo2_hearth'] },
        { via: ['wo2_town', 'wo2_granary'] },
        { via: [[11, 18], 'wo2_watch_hill'] },
        { via: [[11, 18], 'wo2_ring'] },
        { via: [[6, 15], 'wo2_west_herds'] },
        { via: [[28, 15], 'wo2_east_herds'] },
        { via: [[6, 6], 'wo2_lair'] },
        { via: [[4, 11], 'wo2_root_runners'] },
        { via: [[10, 4], 'wo2_lodge'] },
        { via: [[28, 6], 'wo2_grave_road'] },
        { via: ['wo2_refuge', 'wo2_aerie'] },
        { via: ['wo2_town', 'wo2_sawmill'] },
        { via: [[23, 18], 'wo2_quarry'] },
        { via: [[30, 11], 'wo2_crystal'] },
        { via: [[23, 18], 'wo2_herders'] },
      ],
    },
    sites: [
      S.town('wo2_town', 'birkaby', [17, 19], 'Birkaby', 'A grain-hold below the forked mountain. Its jarl died in the first frost; its granary feeds half the north.', [17, 18]),
      S.resource('wo2_sawmill', [8, 19], 'sawmill'),
      S.resource('wo2_quarry', [25, 19], 'quarry'),
      S.resource('wo2_crystal', [32, 9], 'crystal_deposit'),
      // The troll pass.
      S.crossing('wo2_troll_pass', [17, 10], 'Troll Pass', 'The short cleft between the two forks, where the troll-wife’s sons take a toll from anyone who climbs to the saddle.', {
        label: 'The troll-wife’s sons',
        army: trollGuard,
        reward: { resources: { gold: 800 }, flags: ['wo2_pass_settled'] },
        battlefield: 'ridge_pass',
      }),
      S.shortcut('wo2_barricade', [17, 7], 'Troll Barricade', 'A wall of boulders the trolls rolled across the top of the pass. They roll it aside once the pass is settled — by toll or by battle — and the saddle is half a day from Birkaby.', ['wo2_pass_settled']),
      S.choice(
        'wo2_hearth',
        [15, 15],
        'The Troll-wife’s Hearth',
        'A fire in a ring of boulders at the foot of the pass. An old troll-wife tends it and watches the road.',
        'The Troll-wife’s Toll',
        '“My sons keep the pass because the dead took their fells,” the troll-wife says, without getting up. “Pay their toll — gold, and wood for my fire — and they will stand aside and keep an oath with your hold. Or go up and take the pass from them. They would like that better.”',
        [{ label: 'Pay the toll', summary: 'Costs 1,200 Gold and 6 Wood. The troll-wife’s sons stand aside: the troll pass is open without a battle.', cost: { gold: 1200, wood: 6 }, reward: { flags: ['wo2_toll_paid', 'wo2_pass_settled'] }, clearsSiteIds: ['wo2_troll_pass'] }],
        { marker: 'pact' },
      ),
      // The refuge on the saddle.
      S.landmark('wo2_refuge', [17, 2], 'Valkyrie Refuge', 'The cliff-hall of the valkyries above the saddle. The barrow jailer’s dead hold its doors; the valkyries are chained inside.', 'refuge', {
        label: 'The barrow jailer',
        army: jailerGuard,
        reward: { flags: ['wo2_refuge_free'], resources: { gold: 800, favor: 5 }, artifactIds: ['shieldmaiden_round_shield'], questXp: 1200 },
        battlefield: 'plateau',
        required: true,
      }, { objectiveIds: ['wo2_refuge'] }),
      S.camp('wo2_aerie', [19, 2], 'Valkyrie Aerie', 'The refuge’s own hall. Freed, its valkyries will fly for Birkaby.', 'norse_valkyrie', 1, 2, {
        kind: { type: 'creature_camp', creatureId: 'norse_valkyrie', weeklyGrowth: 1, initialStock: 2, requiresFlag: 'wo2_refuge_free', lockedReason: 'The valkyries are chained in the refuge: free it from the barrow jailer first.' },
      }),
      S.landmark('wo2_grave_road', [30, 3], 'Grave-road Supply Camp', 'Where the jailer’s grave-road supply comes over the fells: barrow-draugar and the corpse-sledges that feed his reinforcement.', 'quarry_cache', {
        label: 'Grave-road dead',
        army: graveRoadGuard,
        reward: { flags: ['wo2_supply_cut'], resources: { gold: 600, favor: 3 } },
        battlefield: 'ridge_pass',
      }),
      // The pack.
      S.landmark('wo2_lair', [5, 4], 'Wolf-mother’s Lair', 'A den under a fallen spruce at the top of the western forest. The White Pack sleeps here between hunts.', 'nest', {
        label: 'Lair wolves',
        army: lairGuard,
        reward: { flags: ['wo2_lair_taken'], resources: { gold: 500 }, artifactIds: ['boar_crest_helm'] },
        battlefield: 'grove',
      }, { markerHiddenUntilRevealed: true }),
      S.choice(
        'wo2_ring',
        [10, 17],
        'Wolf-Ring',
        'An old ring of standing stones where Birkaby’s elders once made peace with the wolves of the forest.',
        'The food-and-territory agreement',
        'Skeggi crouches by the ring and reads the tracks. “The pack is not hungry for us,” he says. “It is hunting the dead, and our herds are in the way. Give the wolf-mother meat for the winter and the western forest above the ring, and the pack will keep to its own ground.” It will not be cheap.',
        [{ label: 'Make the agreement', summary: 'Costs 1,800 Gold and 6 Wood (meat and the cleared western forest). The wolf-mother accepts: her lair stands down and the White Pack withdraws — no battle.', cost: { gold: 1800, wood: 6 }, reward: { flags: ['wo2_pack_pact'] }, clearsSiteIds: ['wo2_lair'] }],
        { marker: 'pact' },
      ),
      S.watchtower('wo2_watch_hill', [13, 17], 'Watch-hill', 'From the top, the pack’s tracks lie open — two trodden rings, one in the western forest and one on the eastern scree, and a den above them.', ['wo2_lair', 'wo2_west_herds', 'wo2_east_herds']),
      S.depot('wo2_west_herds', [4, 16], 'West Forest Herds', 'Birkaby’s reindeer herd in the western forest, with the herders’ winter stores. The full share is here until the pack’s hunt in the west.', { resources: { gold: 300, wood: 2 } }, { markerHiddenUntilRevealed: true }),
      S.depot('wo2_east_herds', [29, 16], 'East Scree Herds', 'Goat-herds on the eastern scree, with the herders’ winter stores. The full share is here until the pack’s hunt in the east.', { resources: { gold: 300, stone: 2 } }, { markerHiddenUntilRevealed: true }),
      S.neutral('wo2_root_runners', [3, 9], 'Root-Runner Grove', 'A great-root grove on the lower forest loop where Root-Runners nest among the mossy boulders — quick scouts for anyone the forest trusts.', 'root_runner', 8),
      // Choices and the old places of the fells.
      S.choice(
        'wo2_granary',
        [19, 18],
        'Birkaby Granary',
        'The granary that Ulfhild’s grain filled in exchange for Birkaby’s silence. What is left is scarce.',
        'The scarce grain',
        'The refuge is free and the pack has stopped hunting the herds — and the granary is half empty. “Ulfhild bought our silence with this grain while the lower villages starved,” the reeve says. “There is enough for one more gift. The villages below the coast road, who will remember it when the harbours open — or the valkyries’ refuge, whose daughters will fly once for whoever feeds them.” Both rescues are done either way.',
        [
          { label: 'Grain to the lower villages', summary: 'Costs 4 Wood for the sledges. The villages remember: in the Hvitstrand chapter they back the harbour (2,000 Gold, 6 Wood).', cost: { wood: 4 }, reward: { flags: ['wo2_grain_villages'] }, requiresFlags: ['wo2_refuge_free'] },
          { label: 'Grain to the refuge', summary: 'Costs 4 Wood for the sledges. The valkyries remember: on the sound they fly once with Hervor (3 Battle Valkyries join her in Ice on the Sound).', cost: { wood: 4 }, reward: { flags: ['wo2_grain_refuge'] }, requiresFlags: ['wo2_refuge_free'] },
        ],
        { marker: 'pact', objectiveIds: ['wo2_grain'] },
      ),
      S.choice(
        'wo2_lodge',
        [9, 3],
        'Hunter’s Lodge',
        'An old hunter who has outlived three jarls lives here with his dogs.',
        'The Hunter’s Lodge',
        'The old man has hunted the forest for fifty winters. “That pack is not hungry,” he says. “It is following the dead. Wherever the draugar walk, the wolf-mother sends her sons.” On the wall hang a pair of birch skis, oiled and sound.',
        [
          { label: 'Buy the hunter’s skis', summary: 'Pay 2,000 Gold for the Skis of Ullr (+15% daily land movement).', cost: { gold: 2000 }, reward: { artifactIds: ['skis_of_ullr'] } },
          { label: 'Share his fire and his hunt-lore', summary: 'Hervor gains +1 Knowledge.', reward: { attributes: { knowledge: 1 } } },
        ],
      ),
      S.camp('wo2_wolf_camp', [24, 16], 'Southmoor Wolf Camp', 'Frost wolves that never joined the White Pack.', 'norse_frost_wolf', 3, 4),
      S.pickup('wo2_herders', [21, 16], 'Herders’ Cache', 'Supplies left behind by herders who fled the pass.', { resources: { gold: 700, wood: 5 } }),
    ],
    patrols: [
      {
        commander: whitePack,
        monster: true,
        bounty: { gold: 800 },
        start: [6, 12],
        waypoints: [[5, 13], [7, 9], [8, 15], [13, 15], [21, 15], [28, 14], [30, 9], [27, 16], [21, 15], [13, 15]],
        army: packArmy,
        home: 'wo2_lair',
        threshold: [3, 2],
        purpose: 'Hunts the barrow dead between its two grounds — the western forest, then the eastern scree — and Birkaby’s herds are in its way. It charges only an army it is sure to beat. Taking the Wolf-mother’s Lair, or making the agreement at the Wolf-Ring, sends it home for good.',
      },
      {
        commander: band('wo2_reinforcement', 'The Jailer’s Reinforcement', DEAD_PORTRAIT),
        monster: true,
        bounty: { gold: 500 },
        start: [29, 4],
        waypoints: [[25, 4], [20, 4], [14, 4], [20, 4]],
        army: reinforcement,
        home: 'wo2_refuge',
        dormantUntil: 'wo2_reinforce',
        threshold: [3, 2],
        purpose: 'Waits at the grave-road until its announced day, then marches onto the saddle to guard the refuge. Cutting the grave-road supply delays it; freeing the refuge ends it.',
      },
    ],
    objectives: [
      O.primary(
        'wo2_pass',
        'Settle the troll pass',
        `Pay the troll-wife’s toll at her hearth, or take the troll pass from her sons (${armyText(trollGuard)}).`,
        C.any(C.flag('wo2_toll_paid'), C.cleared('wo2_troll_pass')),
        { markerSiteId: 'wo2_troll_pass' },
      ),
      O.primary(
        'wo2_pack',
        'End the pack’s attacks',
        `Stop the White Pack (${armyText(packArmy)}): make the food-and-territory agreement at the Wolf-Ring, beat the pack in the field, or take the Wolf-mother’s Lair (${armyText(lairGuard)}). The Watch-hill shows its grounds and its den.`,
        C.any(C.flag('wo2_pack_pact'), C.defeated('norse_white_pack'), C.cleared('wo2_lair')),
        { markerSiteId: 'wo2_ring', hint: 'The pack moves between its grounds and charges only an army it is sure to beat. The agreement costs, the battles do not.' },
      ),
      O.primary(
        'wo2_refuge',
        'Free the valkyrie refuge',
        `Break the barrow jailer (${armyText(jailerGuard)}) at the Valkyrie Refuge on the saddle — up the troll pass, or round by the western forest or the eastern scree.`,
        C.cleared('wo2_refuge'),
        { markerSiteId: 'wo2_refuge', hint: 'The jailer’s reinforcement marches on its announced day; taking the grave-road supply camp delays it.' },
      ),
      O.primary(
        'wo2_grain',
        'The scarce grain',
        'With the pack’s attacks ended, the refuge free and the pass settled, decide at Birkaby Granary who gets the last of Ulfhild’s grain: the lower villages or the refuge.',
        C.any(C.flag('wo2_grain_villages'), C.flag('wo2_grain_refuge')),
        { markerSiteId: 'wo2_granary', requires: ['wo2_pack', 'wo2_refuge', 'wo2_pass'], completesMission: true },
      ),
      O.optional('wo2_west_herds_obj', 'The western herds', 'Bring in the West Forest Herds before the pack’s hunt in the west: +400 Gold and +2 Wood more.', C.visited('wo2_west_herds'), { markerSiteId: 'wo2_west_herds', reward: { resources: { gold: 400, wood: 2 } } }),
      O.optional('wo2_east_herds_obj', 'The eastern herds', 'Bring in the East Scree Herds before the pack’s hunt in the east: +400 Gold and +2 Stone more.', C.visited('wo2_east_herds'), { markerSiteId: 'wo2_east_herds', reward: { resources: { gold: 400, stone: 2 } } }),
      O.optional('wo2_supply', 'Cut the grave-road supply', `Take the Grave-road Supply Camp (${armyText(graveRoadGuard)}): the jailer’s reinforcement is delayed.`, C.cleared('wo2_grave_road'), { markerSiteId: 'wo2_grave_road' }),
      O.optional('wo2_swift', 'Before the reinforcement', 'Free the refuge before the jailer’s reinforcement marches: the valkyries add 2 Valkyries to Hervor’s army.', C.cleared('wo2_refuge'), { reward: { creatures: [{ creatureId: 'norse_valkyrie', count: 2 }] } }),
      O.optional('wo2_lodge_visit', 'The hunter’s lodge', 'Visit the old hunter on the saddle.', C.visited('wo2_lodge'), { markerSiteId: 'wo2_lodge' }),
      O.optional('wo2_own_wolves', 'Wolves of our own', 'Recruit at least 8 Frost Wolves in Birkaby (build the Wolf Den first).', C.counter('recruited:norse_frost_wolf', 8)),
    ],
    timers: [
      { id: 'wo2_hunt_west', label: 'The pack’s hunt in the western forest', startWhen: C.all(), days: 5, metWhen: C.any(C.visited('wo2_west_herds'), C.flag('wo2_pack_pact'), C.defeated('norse_white_pack')), consequence: 'The pack hunts through the western herd: its stores keep only the base share (the 400 Gold and 2 Wood bonus is lost). The pack then turns toward the eastern scree.', announce: 'Skeggi has read the tracks: the White Pack hunts the western forest after the fifth day, then moves east.', onExpire: { flags: ['wo2_west_hunted'], failObjectives: ['wo2_west_herds_obj'] } },
      { id: 'wo2_hunt_east', label: 'The pack’s hunt on the eastern scree', startWhen: C.all(), days: 10, metWhen: C.any(C.visited('wo2_east_herds'), C.flag('wo2_pack_pact'), C.defeated('norse_white_pack')), consequence: 'The pack hunts through the eastern herd: its stores keep only the base share (the 400 Gold and 2 Stone bonus is lost). That is the last hunt Skeggi can read in the tracks.', announce: 'After the western forest, the pack’s tracks point at the eastern scree: its second hunt comes after the tenth day.', onExpire: { flags: ['wo2_east_hunted'], failObjectives: ['wo2_east_herds_obj'] } },
      { id: 'wo2_reinforce_due', label: 'The jailer’s reinforcement', startWhen: C.all(), days: 7, metWhen: C.any(C.cleared('wo2_refuge'), C.cleared('wo2_grave_road')), consequence: 'The jailer’s reinforcement marches from the grave-road onto the saddle in front of the refuge (the bonus for freeing the refuge before it is lost). It stays there until the refuge is free.', announce: 'The jailer has sent for a reinforcement along the grave-road: it marches after the seventh day. Cutting the grave-road supply delays it.', onExpire: { flags: ['wo2_reinforce'], failObjectives: ['wo2_swift'] } },
      { id: 'wo2_reinforce_late', label: 'The jailer’s reinforcement (delayed)', startWhen: C.cleared('wo2_grave_road'), days: 8, metWhen: C.cleared('wo2_refuge'), consequence: 'Without its grave-road supply the reinforcement is late, but it still marches onto the saddle (the bonus for freeing the refuge before it is lost).', announce: 'The grave-road is cut: the jailer’s reinforcement has to scrape together what is left. It marches eight days from now.', onExpire: { flags: ['wo2_reinforce'], failObjectives: ['wo2_swift'] } },
    ],
    evidence: [
      { id: 'wo2_ev_pact', flag: 'wo2_pack_pact', title: 'The wolf-mother’s agreement', text: 'Birkaby gave the White Pack meat for the winter and the western forest above the Wolf-Ring. The pack keeps to its own ground.', icon: 'pact' },
      { id: 'wo2_ev_refuge', flag: 'wo2_refuge_free', title: 'The refuge freed', text: 'The valkyries’ refuge is free. Its jailer was the Grey Jarl’s: the same restless dead the wolves were hunting.', icon: 'evacuation' },
      { id: 'wo2_ev_toll', flag: 'wo2_toll_paid', title: 'The troll toll', text: 'The troll-wife’s sons were paid and stood aside. Trolls keep oaths longer than men do.', icon: 'pact' },
      { id: 'wo2_ev_supply', flag: 'wo2_supply_cut', title: 'The grave-road cut', text: 'The jailer’s grave-road supply camp is taken.', icon: 'branch' },
      { id: 'wo2_ev_villages', flag: 'wo2_grain_villages', title: 'Grain for the villages', text: 'Ulfhild’s last grain went to the lower villages. They will back the harbour when it opens.', icon: 'supply' },
      { id: 'wo2_ev_refuge_grain', flag: 'wo2_grain_refuge', title: 'Grain for the refuge', text: 'Ulfhild’s last grain went up to the refuge. Its valkyries will fly once for Hervor.', icon: 'supply' },
    ],
    carried: ['wo2_pack_pact', 'wo2_refuge_free', 'wo2_grain_villages', 'wo2_grain_refuge'],
    briefing: [
      EYDIS('Birkaby’s grain is the only grain between here and the mountains, and its herders say white wolves are taking the herds — in two places, a week apart, as if on a calendar.'),
      SKEGGI('Wolves do not keep calendars. These are following something. The dead come down the grave-road from the north every night, and the pack runs after them.'),
      HERVOR('And the valkyries? Nobody has seen one land on the saddle since the first frost.'),
      SKEGGI('Their refuge has a jailer — one of the Grey Jarl’s. And Ulfhild of Hvitstrand filled Birkaby’s granary so that nobody would ask why. The trolls hold the short way up; the forest and the scree are the long ways, and they are always open.'),
    ],
    briefingVariants: [
      { ifFlags: ['fact:wo1_sheltered'], lines: [EYDIS('Kaldvik’s farm families are safe behind its walls. The barrow-watch stays home with them; we go with what Birkaby can give.')] },
      { ifFlags: ['fact:wo1_to_coast'], lines: [EYDIS('The families we sent to the coast came through Birkaby on their sledges. They say Ulfhild’s grain carts come up the coast road and nothing goes back down.')] },
    ],
    victory: [
      SVANHILD('You freed our hall from the same dead the wolves were chasing, seeress. Strange company you keep — but the valkyries remember gifts.'),
      HERVOR('Then remember this one: the dead in that jailer’s ranks were sworn to the same oath as the sword I carry.'),
      SKEGGI('Two roads lead on from here: Skarvik and the ice on the sound, where Bone-Helm’s ship lies frozen — or Hvitstrand, where Ulfhild keeps the harbours shut. Either can come first.'),
    ],
    scenes: [
      { id: 'wo2_watch', trigger: { type: 'site_visited', siteId: 'wo2_watch_hill' }, lines: [HERVOR('There — two rings trodden flat, one in the western forest and one on the scree. And a den above the forest, under the fallen spruce.'), SKEGGI('The pack hunts one ground, then the other. The herds are standing in both.')] },
      { id: 'wo2_pact', trigger: { type: 'flag', flag: 'wo2_pack_pact' }, lines: [SKEGGI('The wolf-mother took the meat. The pack is going back up to its own forest — and it is still hunting the dead, just not through our herds.')] },
      { id: 'wo2_pack_battle', trigger: { type: 'battle_started', heroDefinitionId: 'norse_white_pack' }, lines: [HERVOR('They are not our enemy. Break them, do not slaughter them — the dead are the ones they want.')] },
      { id: 'wo2_pack_gone', trigger: { type: 'objective_completed', objectiveId: 'wo2_pack' }, lines: [EYDIS('The herders say the pack has gone quiet. I will send word to the granary tonight.')] },
      { id: 'wo2_toll', trigger: { type: 'flag', flag: 'wo2_toll_paid' }, lines: [TROLL_WIFE('Paid in full. My sons will grumble, and then they will keep the oath. That is how trolls are.')] },
      { id: 'wo2_barricade', trigger: { type: 'flag', flag: 'wo2_pass_settled' }, lines: [SKEGGI('The trolls are rolling their boulders off the top of the pass. Birkaby to the saddle in half a day.')] },
      { id: 'wo2_refuge_battle', trigger: { type: 'battle_started', siteId: 'wo2_refuge' }, lines: [JARL('The choosers of the slain chose my warriors once. Now my warriors keep the choosers. Turn back, seeress.'), HERVOR('Your warriors are keeping the wrong door.')] },
      { id: 'wo2_refuge_free', trigger: { type: 'site_cleared', siteId: 'wo2_refuge' }, lines: [SVANHILD('Our hall is open again. Take this shield — a shieldmaiden carried it until she was chosen. And our aerie will sell you wings while the fells stay free.')] },
      { id: 'wo2_reinforce', trigger: { type: 'flag', flag: 'wo2_reinforce' }, lines: [SKEGGI('The jailer’s reinforcement is on the saddle. They will stand in front of the refuge until it falls.')] },
      { id: 'wo2_supply', trigger: { type: 'site_cleared', siteId: 'wo2_grave_road' }, lines: [HERVOR('The corpse-sledges are burning. Whatever the jailer was waiting for will come late, or not at all.')] },
      { id: 'wo2_west_hunt', trigger: { type: 'flag', flag: 'wo2_west_hunted' }, lines: [SKEGGI('The pack went through the western herd last night. The tracks turn east now, toward the scree.')] },
      { id: 'wo2_thor', trigger: { type: 'god_committed', godId: 'norse_thor' }, lines: [SKEGGI('Thor, then. He likes a fight in the open and a loud one. The trolls will respect that.')] },
      { id: 'wo2_tyr', trigger: { type: 'god_committed', godId: 'norse_tyr' }, lines: [SKEGGI('Tyr. The god who put his hand in the wolf’s mouth to keep an oath. Fitting, for a woman chasing one.')] },
      { id: 'wo2_losses', trigger: { type: 'casualties', minLost: 6 }, lines: [EYDIS('The wolves took more than grain from us this time, Hervor. Count them with me when you are home.')] },
    ],
    loss: ['Hervor must survive.', 'Losing Birkaby is recoverable while Hervor has an army.', 'A missed hunt costs only that herd’s bonus stores; the reinforcement makes the refuge harder, never impossible.'],
    help: [
      { id: 'wo2_eight', title: 'A figure eight', text: 'The western forest loop and the eastern scree loop both climb from Birkaby to the high saddle under the refuge. The troll pass is the short way up the middle; it is settled by the troll-wife’s toll or by battle. The forest and the scree are always open.' },
      { id: 'wo2_pack_help', title: 'The White Pack', text: 'The pack hunts its two grounds in turn on the days Skeggi reads from its tracks. It can be beaten in the field or at its lair — or left alive by the costly agreement at the Wolf-Ring.' },
      { id: 'wo2_jailer', title: 'The jailer’s reinforcement', text: 'One reinforcement marches from the grave-road on its announced day and guards the saddle until the refuge falls. Taking the grave-road supply camp delays it.' },
    ],
  });

  // =========================================================================
  // Chapter 3 — Ice on the Sound (card 11; legacy m04)
  // =========================================================================
  const boneHelm = camp.v1('winter_oath_m04').hostileHeroes[0]?.commander;
  if (!boneHelm) throw new Error('Winter Oath v2: Bone-Helm’s profile is missing from the legacy content');
  const shipGuard: Army = [['norse_deathless_draugr', 22], ['norse_fenrir_wolf', 8], ['norse_ancient_frost_troll', 2]];
  const anchorageGuard: Army = [['norse_draugr', 24], ['norse_deathless_draugr', 8]];
  const beachGuard: Army = [['norse_deathless_draugr', 12], ['norse_fenrir_wolf', 4]];
  const raiderArmy: Army = [['norse_deathless_draugr', 10], ['norse_fenrir_wolf', 4]];
  const broodGuard: Army = [['norse_lindworm', 4], ['norse_storm_lindworm', 2]];
  const m3 = chapter({
    campaign: camp,
    chapter: 3,
    card: 11,
    name: 'Ice on the Sound',
    summary:
      'Bone-Helm’s Ship of Nails lies frozen in the sound, and the ledger of everyone bound to the old oath is kept at his anchorage. Cross from Skarvik Holm with a capped expedition, establish two safe landings, recover the ledger — burn the ship without it and those families stay bound — and defeat Bone-Helm aboard his ship.',
    playtime: '65–85 minutes, 4–6 battles',
    legacy: ['winter_oath_m04'],
    economyFrom: 'winter_oath_m04',
    principal: 'wo3_bonehelm',
    soundscape: 'fjord',
    hostileName: 'The Winter Host',
    town: { siteId: 'wo3_town', townId: 'skarvik', name: 'Skarvik' },
    // An expedition: Skarvik Holm is a friendly resupply island (no dwellings, nothing to build).
    player: {
      army: [['norse_deathless_draugr', 36], ['norse_fenrir_wolf', 12], ['norse_frost_troll', 4], ['norse_battle_valkyrie', 3], ['norse_lindworm', 3]],
      buildings: ['norse_longhouse', 'norse_mead_hall', 'norse_trading_post'],
      population: {},
    },
    purchasable: [],
    map: {
      cols: 36,
      rows: 22,
      biome: 'fjord',
      base: 'water',
      seed: 970003,
      texture: { forest: 40, rough: 50 },
      paint: [
        // Skarvik Holm, the friendly resupply island in the west.
        { t: 'plains', rect: [1, 3, 7, 18] },
        { t: 'rough', blob: [3, 6, 1] },
        // Naglholm, Bone-Helm's island along the north.
        { t: 'plains', rect: [12, 1, 26, 4] },
        { t: 'rough', cells: [[15, 1], [16, 1], [20, 4], [21, 4]] },
        // Hvitey, the merchants' island in the east, with the Norns' Well on its northern fell.
        { t: 'plains', rect: [28, 2, 34, 19] },
        { t: 'rough', blob: [32, 5, 1] },
        { t: 'marsh', cells: [[28, 10], [28, 17]] },
        // The wooded inner island in the middle of the sound.
        { t: 'forest', blob: [18, 11, 3] },
        { t: 'plains', cells: [[18, 13], [18, 14], [18, 8], [15, 11]] },
        // The east shoal from the inner island to Hvitey: Bone-Helm's ship is frozen on it.
        { t: 'marsh', line: [[21, 12], [27, 12]], width: 0 },
        // The central ice road from Skarvik Holm to the inner island (bears on an announced day).
        { t: 'marsh', line: [[8, 11], [14, 11]], width: 0 },
        // The sheltered skerry route along the south, from Skarvik Holm to Hvitey.
        { t: 'rough', line: [[6, 19], [30, 19]], width: 1 },
        { t: 'water', cells: [[10, 18], [11, 18], [14, 18], [22, 18], [23, 18], [26, 18]] },
        { t: 'marsh', cells: [[13, 19], [24, 19], [15, 20], [25, 20]] },
      ],
      roads: [
        // Skarvik Holm: the hold, its slips and quays.
        { via: ['wo3_town', 'wo3_north_slip'] },
        { via: ['wo3_town', 'wo3_skarvik_quay'] },
        { via: ['wo3_town', 'wo3_ice_road', [14, 11], [17, 11], 'wo3_ship'] },
        { via: ['wo3_town', 'wo3_council'] },
        // The sheltered skerry route to Hvitey.
        { via: ['wo3_town', [6, 17], [9, 19], [17, 20], [27, 19], [30, 17], 'wo3_reeve'] },
        { via: [[30, 17], 'wo3_merchant_quay'] },
        { via: [[30, 17], [30, 12], 'wo3_east_shoal', 'wo3_ship'] },
        { via: [[30, 12], [30, 6], 'wo3_north_quay'] },
        { via: [[30, 6], 'wo3_well'] },
        // Naglholm: the west beach, the anchorage, the east strand.
        { via: ['wo3_beach_landing', 'wo3_north_beach', [18, 2], 'wo3_anchorage'] },
        { via: [[18, 2], 'wo3_boat_slip'] },
        { via: ['wo3_anchorage', 'wo3_east_strand'] },
        // The cove on the skerries and the inner island's landings.
        { via: [[17, 20], 'wo3_cove_stage', 'wo3_cove_slip'] },
        { via: [[17, 20], 'wo3_slingers'] },
        { via: [[9, 19], 'wo3_knarr'] },
        { via: ['wo3_isle_south', [17, 11]] },
        { via: ['wo3_isle_north', [17, 11]] },
        { via: [[17, 11], 'wo3_root_runners'] },
      ],
    },
    sites: [
      S.town('wo3_town', 'skarvik', [4, 11], 'Skarvik', 'A harbour-hold on Skarvik Holm whose harbour is ice — the expedition’s friendly resupply island.', [5, 11]),
      // The ship and the anchorage.
      S.landmark('wo3_ship', [22, 12], 'Ship of Nails', 'Bone-Helm’s ship, built from the uncut nails of the dead and frozen on the east shoal. He holds it with his crew.', 'refuge', {
        label: 'Bone-Helm and the nail-ship crew',
        army: shipGuard,
        commander: boneHelm,
        reward: { flags: ['wo3_bonehelm_down'], resources: { gold: 1500 }, questXp: 1500 },
        battlefield: 'coast_road',
        required: true,
      }, { objectiveIds: ['wo3_bonehelm'] }),
      S.landmark('wo3_anchorage', [23, 2], 'Bone-Helm’s Anchorage', 'The camp on Naglholm where Bone-Helm’s boats are drawn up — in plain sight of the whole sound. His tally-keepers keep the ledger of names in the boat-house.', 'refuge', {
        label: 'Anchorage crews',
        army: anchorageGuard,
        reward: { flags: ['wo3_ledger'], resources: { gold: 800, favor: 3 } },
        battlefield: 'coast_road',
        required: true,
      }, { objectiveIds: ['wo3_ledger'], marker: 'evidence' }),
      // The landings.
      S.ferry('wo3_north_slip', [6, 4], 'North Slip', 'Skarvik’s boat slip on the north shore of the Holm: a short crossing to Naglholm’s west beach.', 'wo3_beach_landing'),
      S.ferry('wo3_beach_landing', [11, 2], 'Naglholm West Beach', 'A shingle beach at the western tip of Naglholm.', 'wo3_north_slip'),
      S.crossing('wo3_north_beach', [12, 2], 'North Landing', 'The only way up from the west beach. Bone-Helm’s shore watch holds it; cleared, it is a safe landing on Naglholm.', {
        label: 'Shore watch',
        army: beachGuard,
        reward: { flags: ['wo3_landing_north'], resources: { gold: 500 } },
        battlefield: 'coast_road',
      }, { marker: 'evidence' }),
      S.ferry('wo3_east_strand', [26, 3], 'Naglholm East Strand', 'A strand at Naglholm’s eastern tip, a short row from Hvitey.', 'wo3_north_quay'),
      S.ferry('wo3_north_quay', [29, 3], 'Hvitey North Quay', 'A fishing quay on Hvitey’s north shore.', 'wo3_east_strand'),
      S.ferry('wo3_skarvik_quay', [7, 15], 'Skarvik Merchant Quay', 'Skarvik’s quay for the merchants’ knarrs: a straight run to Hvitey once the merchant landing is established.', 'wo3_merchant_quay', { flag: 'wo3_merchant_landing', reason: 'The merchant landing on Hvitey is not established: pay the harbour reeve on Hvitey (by the skerry route), or open Hvitstrand first.' }),
      S.ferry('wo3_merchant_quay', [28, 15], 'Hvitey Merchant Quay', 'The merchant harbour of Hvitey.', 'wo3_skarvik_quay', { flag: 'wo3_merchant_landing', reason: 'The merchant landing is not established yet.' }),
      S.choice(
        'wo3_reeve',
        [30, 14],
        'Harbour Reeve of Hvitey',
        'The reeve who keeps Hvitey’s merchant harbour for Ulfhild and taxes every keel on the sound.',
        'The merchant landing',
        'The reeve counts the expedition’s keels twice. “The sound is closed, seeress — by my jarl’s word, not by the ice. Pay the harbour dues for a season and your boats may use my quay; I will even send a knarr to Skarvik. Otherwise land where the fish do.”',
        [{ label: 'Pay the harbour dues', summary: 'Costs 1,200 Gold. The merchant landing is established: the knarr ferry runs between Skarvik and Hvitey. (Not needed when Hvitstrand’s merchants already hold the quay.)', cost: { gold: 1200 }, reward: { flags: ['wo3_merchant_landing'] } }],
        { marker: 'pact' },
      ),
      S.activation('wo3_cove_stage', [17, 19], 'Slinger Cove', 'A sheltered cove on the skerries where hill slingers fish. Timber and stone would make it a landing stage, with a short row to the inner island.', { cost: { wood: 4, stone: 2 }, reward: { flags: ['wo3_cove_landing'] }, confirm: 'Pay 4 Wood and 2 Stone to build a landing stage at Slinger Cove? It is a safe landing with a short row to the inner island.', label: 'relay' }, null, { marker: 'evidence' }),
      S.ferry('wo3_cove_slip', [18, 18], 'Cove Slip', 'The cove’s boats, rowing to the inner island’s south shore.', 'wo3_isle_south', { flag: 'wo3_cove_landing', reason: 'Build the landing stage at Slinger Cove first.' }),
      S.ferry('wo3_isle_south', [18, 14], 'Inner Island South Shore', 'The inner island’s south shore.', 'wo3_cove_slip', { flag: 'wo3_cove_landing', reason: 'The cove’s landing stage is not built yet.' }),
      S.ferry('wo3_boat_slip', [18, 4], 'Anchorage Boat-slip', 'Bone-Helm’s boat-slip on Naglholm’s south shore: his crews row to the inner island from here.', 'wo3_isle_north', { flag: 'wo3_ledger', reason: 'Bone-Helm’s crews hold the anchorage and its boats: take the anchorage first.' }),
      S.ferry('wo3_isle_north', [18, 8], 'Inner Island North Shore', 'The inner island’s north shore, where the anchorage boats put in.', 'wo3_boat_slip', { flag: 'wo3_ledger', reason: 'The anchorage boats are Bone-Helm’s until the anchorage is taken.' }),
      // The ice road and the east shoal.
      S.shortcut('wo3_ice_road', [8, 11], 'Central Ice Road', 'The straight way across the sound’s frozen middle to the inner island. It bears an army only from the announced day — and then it stays.', ['wo3_ice_bears']),
      S.crossing('wo3_east_shoal', [26, 12], 'East Shoal', 'A shoal of rotten ice and gravel from Hvitey to Bone-Helm’s ship: the long way round, always open.', null),
      // Interpretation, choice and the islands' places.
      S.activation(
        'wo3_well',
        [32, 5],
        'The Norns’ Well',
        'A spring that never freezes on Hvitey’s northern fell. Every oath is a thread at the Norns’ well — and every name in the ledger.',
        { cost: { gold: 500, crystal: 3 }, reward: { flags: ['wo3_well_read'], questXp: 1200 }, requirements: [{ type: 'mission_flag', flag: 'wo3_ledger' }], confirm: 'Read the ledger’s names into the Norns’ Well (500 Gold, 3 Crystal)? It tells what the oath was meant to be — it is not needed to finish the chapter.' },
        { label: 'Wyrm brood', army: broodGuard, reward: { resources: { gold: 1000 } }, battlefield: 'beacon_clearing' },
        { marker: 'evidence' },
      ),
      S.choice(
        'wo3_council',
        [3, 13],
        'Expedition Council',
        'The fire on Skarvik Holm where Eydis reads the ledger out to the expedition’s captains.',
        'The names in the ledger',
        'Eydis turns the ledger’s pages slowly. “Thirty families, bound to the oath by name. Twelve of them are chained in the hold of the Ship of Nails — if we strike the ship as it stands, they go down with it.” The merchants’ captain clears his throat: Hvitey’s quays will pay well for whoever opens the sound first. There is time for one before the strike.',
        [
          { label: 'Free the named prisoners first', summary: 'Costs 500 Gold and 4 Wood for boats and ropes. The prisoners are brought out before the strike: in the final chapter their names break one oath-stronghold without a battle.', cost: { gold: 500, wood: 4 }, reward: { flags: ['wo3_prisoners'] }, requiresFlags: ['wo3_ledger'] },
          { label: 'Secure the merchant trade first', summary: 'The merchant captains pay for the open sound: +1,000 Gold and +2 Crystal now, and a bounded trade bonus in the Giants’ Refuge chapter (2,000 Gold, 2 Crystal).', reward: { flags: ['wo3_trade_first'], resources: { gold: 1000, crystal: 2 } }, requiresFlags: ['wo3_ledger'] },
        ],
        { marker: 'pact', objectiveIds: ['wo3_choice'] },
      ),
      S.camp('wo3_slingers', [20, 20], 'Cove Slingers', 'Hill slingers who fish the cove and guard its stage. They sell their slings to whoever keeps the skerries open.', 'hill_slinger', 3, 6),
      S.neutral('wo3_root_runners', [17, 10], 'Root-Runner Hollows', 'Great roots on the wooded inner island where Root-Runners nest — quick scouts for the island’s friends.', 'root_runner', 8),
      // Two guaranteed one-use resupply caches.
      S.depot('wo3_smokehouse', [33, 12], 'Hvitey Smokehouse', 'The fishers of Hvitey left smoked fish, coin and spears for whoever came against Bone-Helm.', { resources: { gold: 500 }, creatures: [{ creatureId: 'norse_deathless_draugr', count: 10 }] }),
      S.depot('wo3_knarr', [11, 20], 'Frozen Knarr', 'A merchant ship caught by the ice in the skerries with its cargo — and a wolf-pack it was carrying to Hvitstrand.', { resources: { gold: 1000, wood: 5 }, creatures: [{ creatureId: 'norse_fenrir_wolf', count: 4 }] }),
      S.choice(
        'wo3_wanderer',
        [3, 4],
        'A Fire on the Shore',
        'A traveller in a broad hat and a grey cloak sits by a small fire on the Holm’s north shore.',
        'The Grey Wanderer',
        'He has one eye and two ravens, and he knows your name before you say it. “You are going after a book of names,” he says. “Good. Read it before you burn anything. And it is cold out on the ice — I have a spare cloak, if you have a spare seat by my fire.”',
        [
          { label: 'Give him your seat by the fire', summary: 'Hervor receives the Wanderer’s Grey Cloak (+2 vision, +5% daily land movement).', reward: { artifactIds: ['wanderers_grey_cloak'] } },
          { label: 'Trade him mead for a rune', summary: 'Hervor gains +1 Spell Power.', reward: { attributes: { power: 1 } } },
        ],
      ),
      S.landmark('wo3_crags', [33, 18], 'Lindworm Crags', 'Wingless dragons sun themselves on black crags at Hvitey’s southern tip, on beds of crystal.', 'quarry_cache', { label: 'Crag lindworms', army: [['norse_lindworm', 2]], reward: { resources: { crystal: 5 } }, battlefield: 'plateau' }),
    ],
    patrols: [
      {
        commander: band('wo3_raiders', 'Nail-ship Raiders', DEAD_PORTRAIT),
        monster: true,
        bounty: { gold: 500 },
        start: [19, 10],
        waypoints: [[17, 13], [15, 11], [17, 9], [20, 11]],
        army: raiderArmy,
        home: 'wo3_anchorage',
        dormantUntil: 'wo3_raid',
        threshold: [3, 2],
        purpose: 'Bone-Helm’s boat crews wait on the inner island until the announced raid, then raid the island’s landings — the nearest to every crossing. Their boats come from the anchorage: taking it stops them for good.',
      },
    ],
    objectives: [
      O.primary(
        'wo3_landings',
        'Two safe landings',
        `Establish two of the three landings: clear the North Landing on Naglholm (${armyText(beachGuard)}), establish the merchant landing on Hvitey, or build the stage at Slinger Cove on the skerries.`,
        C.atLeast(2, C.flag('wo3_landing_north'), C.flag('wo3_merchant_landing'), C.flag('wo3_cove_landing')),
        { markerSiteId: 'wo3_north_beach', hint: 'Each landing has a second way out: Naglholm has two ferries, Hvitey has the skerry route, the cove has the skerries both ways.' },
      ),
      O.primary(
        'wo3_ledger',
        'Recover the ledger',
        `Take Bone-Helm’s anchorage on Naglholm (${armyText(anchorageGuard)}) and the ledger of names kept in its boat-house.`,
        C.cleared('wo3_anchorage'),
        { markerSiteId: 'wo3_anchorage', hint: 'Naglholm is a short row from Skarvik’s North Slip or from Hvitey’s North Quay.' },
      ),
      O.primary(
        'wo3_bonehelm',
        'Defeat Bone-Helm',
        `With the ledger safe and two landings established, board the Ship of Nails and defeat Bone-Helm (${armyText(shipGuard)}) — over the central ice road once it bears, or along the skerries and the east shoal.`,
        C.cleared('wo3_ship'),
        { markerSiteId: 'wo3_ship', requires: ['wo3_landings', 'wo3_ledger'], completesMission: true },
      ),
      O.optional('wo3_intercept', 'Before the raid', 'Take the anchorage before Bone-Helm’s announced raid: his boats never leave (+600 Gold).', C.cleared('wo3_anchorage'), { markerSiteId: 'wo3_anchorage', reward: { resources: { gold: 600 } } }),
      O.optional('wo3_well_reading', 'The Norns’ Well', `Drive off the wyrm brood (${armyText(broodGuard)}) and read the ledger’s names into the Norns’ Well: what the oath was meant to be.`, C.activated('wo3_well'), { markerSiteId: 'wo3_well' }),
      O.optional('wo3_choice', 'The names in the ledger', 'At the Expedition Council, after the ledger is recovered: free the named prisoners before striking the ship, or secure the merchant trade first.', C.any(C.flag('wo3_prisoners'), C.flag('wo3_trade_first')), { markerSiteId: 'wo3_council' }),
      O.optional('wo3_wanderer_visit', 'A fire on the shore', 'Someone has made a fire on the north shore of Skarvik Holm.', C.visited('wo3_wanderer'), { markerSiteId: 'wo3_wanderer' }),
      O.optional('wo3_crag_wyrms', 'Lindworm crags', `Defeat the lindworms (${armyText([['norse_lindworm', 2]])}) on Hvitey’s southern crags for 5 Crystal.`, C.cleared('wo3_crags'), { markerSiteId: 'wo3_crags' }),
    ],
    timers: [
      {
        id: 'wo3_ice',
        label: 'The central ice bears',
        startWhen: C.all(),
        days: 6,
        metWhen: C.flag('wo3_never'),
        consequence: 'After the sixth day the sound’s middle bears an army: the Central Ice Road from Skarvik Holm to the inner island opens and stays open. Until then the ferries and the skerry route are the ways across.',
        announce: 'Eydis has read the cold: the ice in the middle of the sound will bear an army after the sixth day.',
        onExpire: { flags: ['wo3_ice_bears'] },
      },
      {
        id: 'wo3_raid',
        label: 'Bone-Helm’s raid on the landings',
        startWhen: C.all(),
        days: 7,
        metWhen: C.cleared('wo3_anchorage'),
        consequence: 'Bone-Helm’s boat crews raid the inner island’s landings (the bonus for taking the anchorage first is lost). They keep raiding until the anchorage that supplies them is taken; no landing already established is lost.',
        announce: 'From Skarvik you can see the anchorage on Naglholm: Bone-Helm’s crews are readying boats to raid the landings after the seventh day.',
        onExpire: { flags: ['wo3_raid'], failObjectives: ['wo3_intercept'] },
      },
    ],
    evidence: [
      { id: 'wo3_ev_ledger', flag: 'wo3_ledger', title: 'The ledger of names', text: 'Bone-Helm’s ledger: every family bound to the old oath, by name — and who paid to keep them bound.', icon: 'evidence' },
      { id: 'wo3_ev_well', flag: 'wo3_well_read', title: 'The Norns’ reading', text: 'Read into the Norns’ Well, the names said what the oath was for: a winter’s shelter for the weak, never a king’s claim on them.', icon: 'evidence' },
      { id: 'wo3_ev_prisoners', flag: 'wo3_prisoners', title: 'The named prisoners', text: 'Twelve named prisoners were brought out of the Ship of Nails before the strike. Their names can unbind others.', icon: 'evacuation' },
      { id: 'wo3_ev_trade', flag: 'wo3_trade_first', title: 'The merchant trade', text: 'The merchant harbour was secured first: Hvitey’s captains pay for the open sound.', icon: 'supply' },
      { id: 'wo3_ev_bonehelm', flag: 'wo3_bonehelm_down', title: 'Bone-Helm defeated', text: 'Bone-Helm fell aboard his own ship, with the ledger already safe.', icon: 'evidence' },
      { id: 'wo3_ev_north', flag: 'wo3_landing_north', title: 'North landing', text: 'A safe landing on Naglholm’s west beach.', icon: 'branch' },
      { id: 'wo3_ev_merchant', flag: 'wo3_merchant_landing', title: 'Merchant landing', text: 'A safe landing at Hvitey’s merchant quay, with a knarr ferry to Skarvik.', icon: 'branch' },
      { id: 'wo3_ev_cove', flag: 'wo3_cove_landing', title: 'Cove landing', text: 'A landing stage at Slinger Cove on the skerries, with a short row to the inner island.', icon: 'branch' },
    ],
    carried: ['wo3_ledger', 'wo3_well_read', 'wo3_prisoners', 'wo3_trade_first', 'wo3_bonehelm_down'],
    entryBonuses: [
      { fact: 'wo4_harbour_open', label: 'Hvitstrand’s merchants: the merchant landing on Hvitey is established and its knarr ferry runs', flags: ['wo3_merchant_landing'] },
      { fact: 'wo2_grain_refuge', label: 'The refuge’s gratitude: 3 Battle Valkyries fly with Hervor', heroArmy: [{ creatureId: 'norse_battle_valkyrie', count: 3 }] },
    ],
    briefing: [
      SKEGGI('Every oath ever sworn is a thread somewhere. Bone-Helm keeps this one’s threads in a book — the ledger of everyone bound to it, by name.'),
      EYDIS('And his Ship of Nails is frozen in the middle of the sound. If we burn it before the ledger is in our hands, his tally-keepers drown the book and those families stay bound forever. The ledger is at his anchorage on Naglholm.'),
      HERVOR('Skarvik gives us its Holm and its stores, nothing more. What crosses the ice is what we have. We need two landings we can trust before we go anywhere near that ship.'),
      SKEGGI('Naglholm’s west beach, the merchant quay on Hvitey, or the slingers’ cove on the skerries. The ice in the middle will bear in a few days — it is never the only way across.'),
    ],
    briefingVariants: [
      { ifFlags: ['fact:wo4_harbour_open'], lines: [SKEGGI('Hvitstrand’s merchants sent a knarr ahead of us. Their quay on Hvitey is ours already, and the knarr runs from Skarvik — that is one landing we do not have to fight for.')] },
      { unlessFlags: ['fact:wo4_harbour_open'], lines: [SKEGGI('Ulfhild’s reeve still sits on Hvitey’s merchant quay and taxes every keel. We pay his dues, or we make our own landings.')] },
      { ifFlags: ['fact:wo2_grain_refuge'], lines: [SVANHILD('Three of us fly with you over the ice, seeress. One flight, for the grain you sent up to our hall.')] },
    ],
    victory: [
      EYDIS('Thirty names, Hervor, and every one of them sworn to “protection until the winter ends”. Bone-Helm kept them like cattle in a book.'),
      HERVOR('Then the book comes with us. Whatever I do with the oath at the end, these people get a say in it.'),
    ],
    scenes: [
      { id: 'wo3_reeve_open', trigger: { type: 'site_visited', siteId: 'wo3_reeve' }, ifFlags: ['fact:wo4_harbour_open'], lines: [SKEGGI('The reeve has Ulfhild’s seal on the open-harbour writ. He bows us onto his quay like old friends.')] },
      { id: 'wo3_reeve_closed', trigger: { type: 'site_visited', siteId: 'wo3_reeve' }, unlessFlags: ['fact:wo4_harbour_open'], lines: [SKEGGI('He wants a season’s dues for a quay. Ulfhild taxes the frozen sea itself.'), HERVOR('Then we pay, or we land where the fish do.')] },
      { id: 'wo3_ice', trigger: { type: 'flag', flag: 'wo3_ice_bears' }, lines: [EYDIS('The ice in the middle bears. The road from the Holm to the inner island is open — and it will stay open.')] },
      { id: 'wo3_raid', trigger: { type: 'flag', flag: 'wo3_raid' }, lines: [SKEGGI('Bone-Helm’s boats are out on the inner island. They will hit whatever landing is nearest, until the anchorage that feeds them falls.')] },
      { id: 'wo3_ledger', trigger: { type: 'site_cleared', siteId: 'wo3_anchorage' }, lines: [EYDIS('The ledger. Thirty families by name — and there is Hvitstrand’s grain-mark on the payments. Ulfhild has been feeding this.'), HERVOR('Now the ship can burn.')] },
      { id: 'wo3_well', trigger: { type: 'flag', flag: 'wo3_well_read' }, lines: [EYDIS('The water took the names and gave back one sentence: “a shelter for the weak through one hard winter.” One winter, Hervor. Not a thousand.')] },
      { id: 'wo3_ship_battle', trigger: { type: 'battle_started', siteId: 'wo3_ship' }, lines: [BONE_HELM('The sound is ours until the thaw, seeress. And there will be no thaw.'), HERVOR('Your ledger is in my pack, Bone-Helm. The thaw has already started.')] },
      { id: 'wo3_prisoners', trigger: { type: 'flag', flag: 'wo3_prisoners' }, lines: [EYDIS('Twelve of them, out of the hold and into our boats. They know each other’s names. They know what they were promised.')] },
      { id: 'wo3_cloak', trigger: { type: 'site_visited', siteId: 'wo3_wanderer' }, lines: [SKEGGI('One eye, two ravens and a grey cloak. You know who that was, Hervor. Do not tell me you do not.')] },
      { id: 'wo3_losses', trigger: { type: 'casualties', minLost: 10 }, lines: [EYDIS('The ice took some of them before the enemy did. I am writing them down anyway.')] },
    ],
    loss: ['Hervor must survive.', 'There is no town to recruit in: the expedition is what crossed the ice, with two guaranteed resupply caches and two neutral camps.', 'A missed raid or ice window changes travel, never the outcome: no landing is ever lost and the ice never closes under an army.'],
    help: [
      { id: 'wo3_sound', title: 'Three islands and a sound', text: 'Skarvik Holm, Naglholm and Hvitey surround the frozen sound. Short ferries join them; the skerry route along the south is the long, sheltered way to Hvitey and the east shoal. The central ice road opens on its announced day and never closes.' },
      { id: 'wo3_expedition', title: 'A capped expedition', text: 'Skarvik is a resupply island: no dwellings and nothing to build. Two caches give troops once each; the cove slingers and the Root-Runners of the inner island can be hired.' },
      { id: 'wo3_order', title: 'Ledger before ship', text: 'Bone-Helm’s ship can only be struck once the ledger is recovered and two landings are safe. The Norns’ Well explains the oath; it is not needed to finish.' },
    ],
  });

  // =========================================================================
  // Chapter 4 — The Jarl of Hvitstrand (card 12; legacy m05)
  // =========================================================================
  const v1m05 = camp.v1('winter_oath_m05');
  const ulfhildSetup = v1m05.rivals?.[0];
  if (!ulfhildSetup) throw new Error('Winter Oath v2: Ulfhild’s profile is missing from the legacy content');
  const ulfhild: CommanderSpec = {
    heroDefinitionId: ulfhildSetup.hero.definitionId,
    name: 'Ulfhild',
    classId: ulfhildSetup.hero.classId,
    level: ulfhildSetup.hero.defaults.level,
    attributes: ulfhildSetup.hero.defaults.attributes,
    skills: ulfhildSetup.hero.defaults.skills,
    spellbook: false,
    spellIds: [],
    mana: 10,
    portraitAssetId: 'hero.norse.ulfhild.portrait',
  };
  const boomGuard: Army = [['norse_deathless_draugr', 20], ['norse_fenrir_wolf', 6], ['norse_valkyrie', 2]];
  const dockGuard: Army = [['norse_deathless_draugr', 22], ['norse_fenrir_wolf', 8], ['norse_valkyrie', 2]];
  const rearGuard: Army = [['norse_deathless_draugr', 10], ['norse_fenrir_wolf', 4]];
  const hallGarrison: Army = [['norse_deathless_draugr', 24], ['norse_fenrir_wolf', 8], ['norse_valkyrie', 2]];
  const storehouseGuard: Army = [['norse_deathless_draugr', 14], ['norse_fenrir_wolf', 4]];
  const granaryGuard: Army = [['norse_deathless_draugr', 16], ['norse_fenrir_wolf', 6], ['norse_valkyrie', 1]];
  const smokehouseGuard: Army = [['brigand', 16], ['brigand_cutthroat', 6]];
  const huscarlHallGuard: Army = [['norse_deathless_draugr', 18], ['norse_fenrir_wolf', 6]];
  const counterArmy: Army = [['norse_deathless_draugr', 16], ['norse_fenrir_wolf', 6], ['norse_valkyrie', 2]];
  const ulfhildArmy: Army = [['norse_deathless_draugr', 20], ['norse_fenrir_wolf', 8], ['norse_valkyrie', 2]];
  const m4base = chapter({
    campaign: camp,
    chapter: 4,
    card: 12,
    name: 'The Jarl of Hvitstrand',
    summary:
      'Ulfhild keeps the sound closed because open trade would end her leverage — and Hvitstrand is a harbour full of her dependants. Break the boom and reopen a shipping route, stock the common harbour with the declared provisions, and end her blockade by a food settlement backed by her own toll accounts, or by a siege fought by hand.',
    playtime: '65–90 minutes, 4–6 battles',
    legacy: ['winter_oath_m05'],
    economyFrom: 'winter_oath_m05',
    principal: 'wo4_blockade',
    soundscape: 'storm_plateau',
    hostileName: 'Ulfhild’s Hvitstrand',
    town: { siteId: 'wo4_town', townId: 'ravnholt', name: 'Ravnholt' },
    map: {
      cols: 36,
      rows: 22,
      biome: 'fjord',
      base: 'plains',
      seed: 970004,
      texture: { forest: 40, rough: 50 },
      paint: [
        // The inlet, from the open sea up to Hvitstrand's crag in the middle of the map.
        { t: 'water', rect: [16, 10, 20, 21] },
        { t: 'water', cells: [[18, 9], [19, 9]] },
        // Hvitstrand on its crag: one gate court, reached by the dock gate or the rear gate.
        { t: 'mountain', disc: [18, 6, 1] },
        { t: 'mountain', cells: [[19, 7], [17, 8]] },
        { t: 'plains', cells: [[18, 8]] },
        // The ridge north of the town, between the harbour hinterland and the upland road.
        { t: 'mountain', line: [[11, 5], [25, 5]], width: 0 },
        { t: 'rough', rect: [12, 1, 26, 3] },
        // The forest spur between Ravnholt and the north woods; the forest road goes round its eastern end.
        { t: 'mountain', line: [[1, 7], [10, 7]], width: 0 },
        { t: 'forest', blob: [7, 4, 2] },
        { t: 'forest', cells: [[10, 2], [11, 3], [3, 5]] },
        // The fishery coast in the east.
        { t: 'marsh', cells: [[33, 10], [33, 11], [32, 15], [33, 16], [27, 19], [28, 19]] },
        { t: 'rough', blob: [30, 7, 1] },
        // The west coast: the sheltered cove.
        { t: 'marsh', cells: [[1, 17], [1, 18], [2, 19]] },
      ],
      roads: [
        // The short dock road: Ravnholt — the Dock Market — the dock gate.
        { via: ['wo4_town', [10, 10], 'wo4_parley', 'wo4_dock_gate', 'wo4_hvitstrand'] },
        // The ring: forest road round the spur, the upland road behind the ridge, the fishery road.
        { via: ['wo4_town', [9, 9], [11, 6], [10, 3], 'wo4_storehouse'] },
        { via: [[10, 3], [19, 3], [26, 4], [28, 8], 'wo4_smokehouse'] },
        { via: [[19, 3], 'wo4_granary'] },
        { via: [[26, 4], 'wo4_huscarl_hall'] },
        // The outer winter road down the east side to the rear gate.
        { via: [[28, 8], [21, 8], 'wo4_rear_gate', 'wo4_hvitstrand'] },
        // The harbour side and the reopened shipping route across the inlet.
        { via: ['wo4_town', [10, 14], 'wo4_customs', 'wo4_west_quay'] },
        { via: [[10, 14], 'wo4_harbour'] },
        { via: ['wo4_harbour', 'wo4_boom'] },
        { via: ['wo4_east_quay', [25, 15], 'wo4_smokehouse'] },
        // The forest track (opened by the foresters) straight north from Ravnholt.
        { via: ['wo4_town', 'wo4_forest_track', [5, 5], 'wo4_storehouse'] },
        // Spurs.
        { via: [[10, 14], 'wo4_captain'] },
        { via: ['wo4_captain', 'wo4_cove'] },
        { via: [[5, 5], 'wo4_andvari'] },
        { via: ['wo4_town', 'wo4_sawmill'] },
        { via: [[10, 14], 'wo4_quarry'] },
        { via: [[25, 15], 'wo4_mine'] },
      ],
    },
    sites: [
      S.town('wo4_town', 'ravnholt', [4, 11], 'Ravnholt', 'A hold on the west shore of the harbour hinterland that refused Ulfhild’s oath.', [5, 11]),
      S.town('wo4_hvitstrand', 'hvitstrand', [18, 7], 'Hvitstrand', 'Ulfhild’s white hall on its crag at the head of the inlet, with a harbour full of her dependants. One gate court, reached from the dock gate or the rear gate.', [18, 8]),
      S.resource('wo4_sawmill', [7, 13], 'sawmill'),
      S.resource('wo4_quarry', [8, 17], 'quarry'),
      S.resource('wo4_mine', [30, 18], 'gold_mine', { guard: { label: 'Mine squatters', army: [{ creatureId: 'norse_fenrir_wolf', count: 10 }], reward: { resources: { gold: 500 } }, battlefield: 'open_field' } }),
      // Hvitstrand's two gates.
      S.crossing('wo4_dock_gate', [17, 9], 'Dock Gate', 'The short way into Hvitstrand from the dock road — the gate Ulfhild defends most heavily.', {
        label: 'Dock-gate huscarls',
        army: dockGuard,
        reward: { resources: { gold: 800 } },
        battlefield: 'beacon_clearing',
      }),
      S.crossing('wo4_rear_gate', [19, 8], 'Rear Gate', 'The back gate of Hvitstrand, at the end of the outer winter road. Lightly held: nobody comes that way in winter.', {
        label: 'Rear-gate watch',
        army: rearGuard,
        reward: { resources: { gold: 400 } },
        battlefield: 'beacon_clearing',
      }),
      // The shipping route and the common harbour.
      S.landmark('wo4_boom', [15, 20], 'Boom-tower', 'The tower at the inlet mouth that holds Ulfhild’s boom across the sea lane — and her toll-house, with every account of what the closed sound earned her.', 'quarry_cache', {
        label: 'Boom-men',
        army: boomGuard,
        reward: { flags: ['wo4_shipping', 'wo4_toll_accounts'], resources: { gold: 800 } },
        battlefield: 'coast_road',
        required: true,
      }, { objectiveIds: ['wo4_shipping'], marker: 'evidence' }),
      S.ferry('wo4_west_quay', [15, 16], 'West Quay', 'The common quay on the inlet’s west shore. Boats cross to the fishery side once the boom is down.', 'wo4_east_quay', { flag: 'wo4_shipping', reason: 'Ulfhild’s boom closes the inlet: take the Boom-tower first.' }),
      S.ferry('wo4_east_quay', [21, 16], 'East Quay', 'The fishery quay on the inlet’s east shore.', 'wo4_west_quay', { flag: 'wo4_shipping', reason: 'Ulfhild’s boom closes the inlet.' }),
      S.activation(
        'wo4_harbour',
        [12, 17],
        'Common Harbour',
        'The harbour store all of Hvitstrand’s dependants draw on. Ulfhild let it run empty to make the town need her.',
        { cost: { gold: 4000, wood: 16, stone: 12 }, reward: { flags: ['wo4_provisioned'], questXp: 1200 }, confirm: 'Stock the common harbour with the declared provisions: 4,000 Gold, 16 Wood and 12 Stone (one time)?' },
        null,
        { objectiveIds: ['wo4_provision'], marker: 'supply' },
      ),
      // The ring's warehouses: return stops on the long roads.
      S.camp('wo4_storehouse', [8, 4], 'Forest Storehouse', 'Ulfhild’s timber and salt store in the north woods — a return stop on the forest road. The foresters she pressed into service would open their own track to Ravnholt if they were free, and their hunting wolves can be hired here.', 'norse_frost_wolf', 3, 4, {
        guard: guard({ label: 'Storehouse guard', army: storehouseGuard, reward: { flags: ['wo4_foresters'], resources: { gold: 600, wood: 8 } }, battlefield: 'grove' }),
        marker: 'supply',
      }),
      S.camp('wo4_granary', [19, 2], 'Upland Granary', 'The granary behind the ridge whose grain Ulfhild trades for silence — a return stop on the upland road, where the granary’s barrow-dead can be hired once it is taken. Her own riders guard her income here.', 'norse_draugr', 6, 8, {
        guard: guard({ label: 'Granary guard', army: granaryGuard, reward: { flags: ['wo4_granary_taken'], resources: { gold: 1000, stone: 6 } }, battlefield: 'open_field' }),
        marker: 'supply',
      }),
      S.camp('wo4_smokehouse', [28, 11], 'Fishery Smokehouse', 'The fishery’s smokehouse on the east coast — a return stop on the fishery road, kept by Ulfhild’s hired sailors. Freed, the fishers’ slingers sell their slings here.', 'hill_slinger', 3, 5, {
        guard: guard({ label: 'Hired sailors', army: smokehouseGuard, reward: { flags: ['wo4_smokehouse_taken'], resources: { gold: 800, wood: 4, stone: 4 } }, battlefield: 'coast_road' }),
        marker: 'supply',
      }),
      S.shortcut('wo4_forest_track', [5, 7], 'Foresters’ Track', 'A hunters’ track through the spur, straight north from Ravnholt to the storehouse. The pressed foresters keep it barred until they are free.', ['wo4_foresters']),
      S.landmark('wo4_huscarl_hall', [27, 6], 'Huscarl Hall', 'The upland hall where Ulfhild’s huscarls wait for her word.', 'refuge', {
        label: 'Hall huscarls',
        army: huscarlHallGuard,
        reward: { flags: ['wo4_counter_broken'], resources: { gold: 800 } },
        battlefield: 'beacon_clearing',
      }),
      // Settlement, dues and the cove.
      S.choice(
        'wo4_parley',
        [13, 10],
        'Dock Market',
        'The market on the dock road where Ulfhild’s steward meets anyone who comes to talk instead of fight.',
        'A food settlement',
        'Ulfhild comes down to the market herself, with her steward and the toll accounts in a sealed chest. “You broke my boom and fed my harbour,” she says. “My people will not starve to spite you. But a jarl who yields to a seeress with nothing in her hand is no jarl.” The accounts lie open between you: every keel she turned away, every grain-cart she sent north instead.',
        [
          { label: 'Agree a food settlement', summary: 'Only with the toll accounts exposed and the common harbour stocked. Costs 1,500 Gold for the first season’s grain. Ulfhild ends the blockade and her gates stand down — no siege.', cost: { gold: 1500 }, reward: { flags: ['wo4_settlement'], questXp: 1000 }, requiresFlags: ['wo4_toll_accounts', 'wo4_provisioned'], clearsSiteIds: ['wo4_dock_gate', 'wo4_rear_gate'] },
          { label: 'Settle, with Bone-Helm’s ledger on the table', summary: 'Only with the toll accounts exposed, the harbour stocked and Bone-Helm’s ledger recovered: her own grain paid the oath’s keepers. Costs 500 Gold. Ulfhild ends the blockade and her gates stand down.', cost: { gold: 500 }, reward: { flags: ['wo4_settlement', 'wo4_ledger_shown'], questXp: 1200 }, requiresFlags: ['wo4_toll_accounts', 'wo4_provisioned', 'fact:wo3_ledger'], clearsSiteIds: ['wo4_dock_gate', 'wo4_rear_gate'] },
        ],
        { marker: 'pact' },
      ),
      S.choice(
        'wo4_customs',
        [12, 15],
        'Customs House',
        'The harbour’s customs house, where a winter of shipping dues waits to be spent.',
        'The shipping dues',
        'The customs chests are full — a winter of dues Ulfhild took from the closed sound. Eydis counts them. “The independent settlements paid most of this, Hervor. Give it back and they will stand with us when the Jarl comes. Or keep it here and pay for a common harbour guard — men who answer to the harbour, not to a jarl — and send them north with us at the end.”',
        [
          { label: 'Return the dues to the independent settlements', summary: 'The settlements become allies: in the final chapter they guard one of Isafold’s outer settlements and send 8 Fenrir Wolves.', reward: { flags: ['wo4_dues_returned'] }, requiresFlags: ['wo4_harbour_open'] },
          { label: 'Fund a common harbour guard', summary: 'Costs 1,000 Gold. The harbour guard marches north: the final chapter starts with 4 Ancient Frost Trolls and 10 Fenrir Wolves in Isafold’s garrison.', cost: { gold: 1000 }, reward: { flags: ['wo4_harbour_guard'] }, requiresFlags: ['wo4_harbour_open'] },
        ],
        { marker: 'pact', objectiveIds: ['wo4_dues'] },
      ),
      S.choice(
        'wo4_captain',
        [3, 15],
        'Sailors’ Captain',
        'A sailing captain whose crew is stuck ashore since Ulfhild closed the sound.',
        'The captain’s contract',
        '“I owe a cargo to a hold up the coast and I cannot sail it while the boom is up,” the captain says. “See my ship out of the inlet and pay the harbour fee, and my sailors are yours to hire from the cove.”',
        [{ label: 'Fulfil the contract', summary: 'Only once the boom is down. Costs 300 Gold. The captain sails; the brigand sailors in the cove can be hired.', cost: { gold: 300 }, reward: { flags: ['wo4_contract'] }, requiresFlags: ['wo4_shipping'] }],
      ),
      S.camp('wo4_cove', [2, 17], 'Sheltered Cove', 'The captain’s sailors, idle on the shingle.', 'brigand', 6, 8, {
        kind: { type: 'creature_camp', creatureId: 'brigand', weeklyGrowth: 6, initialStock: 8, requiresFlag: 'wo4_contract', lockedReason: 'The sailors are bound to their captain’s contract: fulfil it first (once the boom is down).' },
      }),
      S.choice(
        'wo4_andvari',
        [3, 3],
        'Andvari’s Pool',
        'A pool under a waterfall in the north woods that has never frozen. A ring lies on the bottom.',
        'Andvari’s Pool',
        'The ring is gold and heavy, and the water around it is warm. Skeggi will not go near it. “A dwarf cursed that ring,” he says. “It brings gold to whoever wears it, and ruin with the gold. Many have decided the gold is worth it.”',
        [
          { label: 'Take the ring', summary: 'Hervor receives Andvari’s Ring (+500 Gold per day, −1 Luck).', reward: { artifactIds: ['andvaris_ring'] } },
          { label: 'Leave it to its curse', summary: '+5 Favor; Hervor gains 300 experience.', reward: { resources: { favor: 5 }, questXp: 300 } },
        ],
      ),
    ],
    patrols: [
      {
        commander: ulfhild,
        start: [20, 3],
        waypoints: [[11, 3], [19, 3], [26, 4], [28, 9], [26, 4], [19, 3]],
        army: ulfhildArmy,
        home: 'wo4_granary',
        purpose: 'Ulfhild rides between her remaining income — the storehouse, the granary and the smokehouse — on the upland road. The granary is her purse: take it and she shuts herself in her hall.',
      },
      {
        commander: band('wo4_huscarls', 'Ulfhild’s Huscarls', DEAD_PORTRAIT),
        monster: true,
        bounty: { gold: 600 },
        start: [26, 6],
        waypoints: [[25, 3], [15, 3], [11, 6], [8, 10], [11, 14]],
        army: counterArmy,
        home: 'wo4_huscarl_hall',
        dormantUntil: 'wo4_counter',
        threshold: [3, 2],
        purpose: 'Ulfhild’s one counteroffensive: it leaves the Huscarl Hall on its announced day after the boom falls and marches on Ravnholt and the common harbour. Taking the hall first cancels it.',
      },
    ],
    objectives: [
      O.primary('wo4_shipping', 'Reopen a shipping route', `Take the Boom-tower at the inlet mouth (${armyText(boomGuard)}): the sea lane opens, the quays cross the inlet — and Ulfhild’s toll accounts are exposed.`, C.cleared('wo4_boom'), { markerSiteId: 'wo4_boom' }),
      O.primary('wo4_provision', 'Stock the common harbour', 'Deliver the declared provisions to the Common Harbour once: 4,000 Gold, 16 Wood and 12 Stone. The warehouses on the ring roads hold much of it.', C.activated('wo4_harbour'), { markerSiteId: 'wo4_harbour', hint: 'The Forest Storehouse, the Upland Granary and the Fishery Smokehouse are return stops with supplies; the market in Ravnholt trades the rest.' }),
      O.primary(
        'wo4_blockade',
        'End Ulfhild’s blockade',
        `With the route open and the harbour stocked, end the blockade: agree a food settlement at the Dock Market backed by her toll accounts — or take Hvitstrand by siege (its hall-guard: ${armyText(hallGarrison)}) through the Dock Gate (${armyText(dockGuard)}) or the Rear Gate at the end of the outer winter road (${armyText(rearGuard)}). A siege is fought by hand.`,
        C.any(C.flag('wo4_settlement'), C.all(C.any(C.cleared('wo4_dock_gate'), C.cleared('wo4_rear_gate')), C.owned('hvitstrand'))),
        { markerSiteId: 'wo4_hvitstrand', requires: ['wo4_shipping', 'wo4_provision'], reward: { flags: ['wo4_harbour_open'] } },
      ),
      O.primary('wo4_dues', 'The shipping dues', 'With the harbour open, decide at the Customs House what a winter of shipping dues pays for.', C.any(C.flag('wo4_dues_returned'), C.flag('wo4_harbour_guard')), { markerSiteId: 'wo4_customs', requires: ['wo4_blockade'], completesMission: true }),
      O.optional('wo4_forestall', 'Forestall the counteroffensive', `Take the Huscarl Hall (${armyText(huscarlHallGuard)}) before Ulfhild’s announced counteroffensive leaves it.`, C.cleared('wo4_huscarl_hall'), { markerSiteId: 'wo4_huscarl_hall', reward: { resources: { gold: 800 } } }),
      O.optional('wo4_income', 'Ulfhild’s income', `Beat Ulfhild in the field (${armyText(ulfhildArmy)}) or take her Upland Granary (${armyText(granaryGuard)}).`, C.defeated('norse_ulfhild'), { markerSiteId: 'wo4_granary' }),
      O.optional('wo4_warehouses', 'Every return stop', 'Take all three warehouses on the ring roads.', C.all(C.cleared('wo4_storehouse'), C.cleared('wo4_granary'), C.cleared('wo4_smokehouse')), { reward: { resources: { crystal: 3 } } }),
      O.optional('wo4_sailors', 'The captain’s contract', 'Once the boom is down, see the stranded captain’s ship out: her sailors hire from the cove.', C.flag('wo4_contract'), { markerSiteId: 'wo4_captain' }),
      O.optional('wo4_pool', 'Andvari’s pool', 'Something glints at the bottom of a pool in the north woods that never freezes.', C.visited('wo4_andvari'), { markerSiteId: 'wo4_andvari' }),
    ],
    timers: [
      {
        id: 'wo4_counter',
        label: 'Ulfhild’s counteroffensive',
        startWhen: C.flag('wo4_shipping'),
        days: 4,
        metWhen: C.cleared('wo4_huscarl_hall'),
        consequence: 'Ulfhild’s huscarls march on Ravnholt and the common harbour (the bonus for taking their hall first is lost). They are one finite war-band; taking the Huscarl Hall recalls them.',
        announce: 'The boom is down, and Ulfhild has sworn to answer it: her huscarls leave their upland hall four days from now.',
        onExpire: { flags: ['wo4_counter'], failObjectives: ['wo4_forestall'] },
      },
    ],
    evidence: [
      { id: 'wo4_ev_accounts', flag: 'wo4_toll_accounts', title: 'The toll accounts', text: 'Ulfhild’s toll-house books: every keel turned away from the sound, every grain-cart sent north instead of to her own harbour.', icon: 'evidence' },
      { id: 'wo4_ev_provisioned', flag: 'wo4_provisioned', title: 'The common harbour stocked', text: 'The declared provisions are in the common harbour: Hvitstrand’s dependants will eat this winter whatever their jarl does.', icon: 'supply' },
      { id: 'wo4_ev_settlement', flag: 'wo4_settlement', title: 'A food settlement', text: 'Ulfhild ended the blockade in a settlement backed by her own accounts. Her hall stands; her monopoly does not.', icon: 'pact' },
      { id: 'wo4_ev_ledger', flag: 'wo4_ledger_shown', title: 'The ledger at the market', text: 'Bone-Helm’s ledger showed Ulfhild’s grain paying the oath’s keepers. She lowered her price.', icon: 'evidence' },
      { id: 'wo4_ev_open', flag: 'wo4_harbour_open', title: 'Hvitstrand opened', text: 'The blockade is over and Hvitstrand’s harbour is open to every keel.', icon: 'branch' },
      { id: 'wo4_ev_returned', flag: 'wo4_dues_returned', title: 'The dues returned', text: 'The winter’s shipping dues went back to the independent settlements. They will stand with Hervor.', icon: 'pact' },
      { id: 'wo4_ev_guard', flag: 'wo4_harbour_guard', title: 'A common harbour guard', text: 'The dues paid for a harbour guard that answers to the harbour. It will march north at the end.', icon: 'supply' },
    ],
    carried: ['wo4_harbour_open', 'wo4_settlement', 'wo4_ledger_shown', 'wo4_toll_accounts', 'wo4_dues_returned', 'wo4_harbour_guard'],
    entryBonuses: [
      { fact: 'wo1_to_coast', label: 'Kaldvik’s families on the coast send supplies (1,500 Gold, 6 Wood)', wallet: { gold: 1500, wood: 6 } },
      { fact: 'wo2_grain_villages', label: 'The lower villages back the harbour (2,000 Gold, 6 Wood)', wallet: { gold: 2000, wood: 6 } },
    ],
    briefing: [
      ULFHILD('Hervor of Kaldvik. Every sea-lane you open lets my rivals’ ships out of harbour — and my harbour feeds four hundred people who do not care whose ships those are.'),
      HERVOR('Then feed them, Ulfhild. You sent your grain north to the oath’s keepers and let your own dependants go hungry to make them need you.'),
      EYDIS('We do not have to burn her hall to end this. Break the boom at the inlet mouth, stock the common harbour — every family in Hvitstrand draws on it — and her toll-house will tell everyone what the closed sound earned her.'),
      SKEGGI('The dock road is short and her best huscarls sit on it. The outer winter road goes all the way round behind the ridge to her rear gate. Her warehouses on the ring roads are good places to stop and resupply.'),
    ],
    briefingVariants: [
      { ifFlags: ['fact:wo3_ledger'], lines: [EYDIS('And we carry Bone-Helm’s ledger. Hvitstrand’s grain-mark is on every payment to the oath’s keepers. When she sees it, she will know the argument is already lost.')] },
      { ifFlags: ['fact:wo1_to_coast'], lines: [SKEGGI('The families we sent down from Kaldvik have settled along this coast. They sent what they could spare.')] },
      { ifFlags: ['fact:wo2_grain_villages'], lines: [EYDIS('The lower villages remember Birkaby’s grain. Their carts are in Ravnholt already.')] },
    ],
    victory: [
      ULFHILD('Open, then. My harbour, my keels, my rivals’ keels. Write down that I fed them.'),
      HERVOR('I will write down that you stopped starving them. That is a start.'),
      SKEGGI('The ice is cracking along the coast. But the oath is still sworn — and the giants of Hrimgard are still frozen in it.'),
    ],
    scenes: [
      { id: 'wo4_boom', trigger: { type: 'site_cleared', siteId: 'wo4_boom' }, lines: [EYDIS('The boom is down — and here is her toll-house: every keel turned away, every grain-cart sent north. Her own clerks wrote it.'), SKEGGI('Boats are already crossing the inlet. The fishery is half a day away now.')] },
      { id: 'wo4_provisioned', trigger: { type: 'flag', flag: 'wo4_provisioned' }, lines: [EYDIS('The common harbour is full. Whatever Ulfhild decides, her people eat this winter.')] },
      { id: 'wo4_parley_ledger', trigger: { type: 'site_visited', siteId: 'wo4_parley' }, ifFlags: ['fact:wo3_ledger'], lines: [EYDIS('I put Bone-Helm’s ledger on the table beside her toll accounts. Her grain-mark is on both.'), ULFHILD('…Then I paid the dead to keep my harbour shut. Name your price, seeress, and let us be done.')] },
      { id: 'wo4_parley_plain', trigger: { type: 'site_visited', siteId: 'wo4_parley' }, unlessFlags: ['fact:wo3_ledger'], lines: [ULFHILD('Show me my own accounts and a full harbour, and I will talk. Until then, this is a market and you are a customer.')] },
      { id: 'wo4_settled', trigger: { type: 'flag', flag: 'wo4_settlement' }, lines: [ULFHILD('The blockade is over. My huscarls will open the gates. Do not mistake this for kneeling.'), HERVOR('I mistake it for feeding your people. That is better.')] },
      { id: 'wo4_counter', trigger: { type: 'flag', flag: 'wo4_counter' }, lines: [SKEGGI('Her huscarls are on the upland road, coming round toward Ravnholt. One war-band — she has no second.')] },
      { id: 'wo4_ulfhild_battle', trigger: { type: 'battle_started', heroDefinitionId: 'norse_ulfhild' }, lines: [ULFHILD('You should have stayed in your fjord, seeress.'), HERVOR('I tried. The winter would not let me.')] },
      { id: 'wo4_siege', trigger: { type: 'battle_started', siteId: 'wo4_hvitstrand' }, lines: [HERVOR('No looting. When the hall falls, the harbour folk eat first.')] },
      { id: 'wo4_taken', trigger: { type: 'objective_completed', objectiveId: 'wo4_blockade' }, unlessFlags: ['wo4_settlement'], lines: [EYDIS('Hvitstrand is ours. Her people are asking what happens to them now.'), HERVOR('The same as ours: they eat, and the ships go out in spring.')] },
      { id: 'wo4_track', trigger: { type: 'flag', flag: 'wo4_foresters' }, lines: [SKEGGI('The foresters have unbarred their track through the spur. Ravnholt to the north woods without going round.')] },
      { id: 'wo4_losses', trigger: { type: 'casualties', minLost: 12 }, lines: [EYDIS('This is the first time we have fought the living, Hervor. Their dead will not stand up again, and neither will ours.')] },
    ],
    loss: ['Hervor must survive.', 'Losing Ravnholt is recoverable while Hervor has an army.', 'Ulfhild has one counteroffensive and no hidden reserves; her hall-guard is all that is left in Hvitstrand.'],
    help: [
      { id: 'wo4_ring', title: 'Round the inlet', text: 'Hvitstrand sits on its crag at the head of the inlet. The forest road, the upland road behind the ridge and the fishery road ring it; the dock road is the short, defended way to its dock gate, and the outer winter road reaches its rear gate. Breaking the boom lets boats cross the inlet; freeing the foresters opens their track north from Ravnholt.' },
      { id: 'wo4_logistics', title: 'Provisions, not districts', text: 'The common harbour needs one declared delivery. The warehouses on the ring roads are return stops: supplies when taken, troops for hire afterwards. A food settlement needs the toll accounts from the Boom-tower and the harbour stocked; a siege needs neither, but the chapter still wants the harbour fed.' },
    ],
  });
  // Hvitstrand is an unowned town held by Ulfhild's hall-guard (taken by siege, or opened by the settlement).
  const v1Hvitstrand = ulfhildSetup.town;
  const m4 = {
    ...m4base,
    neutralTowns: [
      {
        townId: 'hvitstrand',
        siteId: 'wo4_hvitstrand',
        name: 'Hvitstrand',
        archetypeId: v1Hvitstrand.archetypeId,
        buildings: v1Hvitstrand.buildings.filter((b) => b !== 'norse_stronghold'),
        population: {},
        covenants: [],
        garrison: hallGarrison.map(([creatureId, count]) => ({ creatureId, count })),
      },
    ],
  };

  // =========================================================================
  // Chapter 5 — The Giants' Refuge (card 13; legacy m06)
  // =========================================================================
  const v1m06 = camp.v1('winter_oath_m06');
  const hrafn = v1m06.sites.find((s) => s.id === 'm06_glacier_gate')?.guard?.commander;
  if (!hrafn) throw new Error('Winter Oath v2: Hrafn’s profile is missing from the legacy content');
  const lowGuard: Army = [['norse_deathless_draugr', 16], ['norse_frost_troll', 3]];
  const midGuard: Army = [['norse_ancient_frost_troll', 4], ['norse_deathless_draugr', 14]];
  const highGuard: Army = [['norse_deathless_draugr', 18], ['norse_storm_lindworm', 2]];
  const refugeGuard: Army = [['norse_deathless_draugr', 20], ['norse_ancient_frost_troll', 2], ['norse_storm_lindworm', 1]];
  const altarGuard: Army = [['norse_deathless_draugr', 26], ['norse_fenrir_wolf', 8], ['norse_ancient_frost_troll', 3], ['norse_battle_valkyrie', 2]];
  const columnArmy: Army = [['norse_deathless_draugr', 16], ['norse_fenrir_wolf', 6], ['norse_ancient_frost_troll', 2]];
  const musterGuard: Army = [['norse_deathless_draugr', 14], ['norse_fenrir_wolf', 4]];
  const m5 = chapter({
    campaign: camp,
    chapter: 5,
    card: 13,
    name: 'The Giants’ Refuge',
    summary:
      'Hrafn the Hollow has frozen the giants of Hrimgard into the glacier as monuments to the Grey Jarl’s promise, and the first thaw may bring the ice down on the homes below. Secure Hrimgard as a refuge and hold it, free the three giant groups at their three heights, and defeat Hrafn at whichever of his two rime-altars he still holds.',
    playtime: '60–80 minutes, 4–5 battles',
    legacy: ['winter_oath_m06'],
    economyFrom: 'winter_oath_m06',
    principal: 'wo5_groups',
    soundscape: 'storm_plateau',
    hostileName: 'The Winter Host',
    town: { siteId: 'wo5_town', townId: 'jokulsby', name: 'Jokulsby' },
    map: {
      cols: 34,
      rows: 22,
      biome: 'tundra',
      base: 'plains',
      seed: 970005,
      texture: { forest: 40, rough: 60 },
      paint: [
        // The circular glacier above Jokulsby.
        { t: 'mountain', disc: [17, 9, 5] },
        // The outer fells beyond the two broad passes.
        { t: 'mountain', rect: [1, 6, 2, 16] },
        { t: 'mountain', rect: [32, 6, 32, 16] },
        // The upper terraces north of the glacier, linked by the quarry road.
        { t: 'rough', rect: [5, 1, 29, 3] },
        // The thaw gully through the glacier's southern lobe (it opens on the announced day).
        { t: 'rough', line: [[17, 14], [17, 4]], width: 0 },
        // The tree line on the west pass's lower slopes, and the warm quarry in the south-east.
        { t: 'forest', blob: [5, 11, 2] },
        { t: 'forest', cells: [[8, 8], [9, 9], [26, 13], [27, 14]] },
        { t: 'rough', blob: [29, 18, 1] },
        // The low road under the west pass, where the meltwater will run.
        { t: 'marsh', cells: [[10, 17], [11, 17], [12, 18]] },
      ],
      roads: [
        // The two broad passes round the glacier, joined across the upper terraces by the quarry road.
        { via: ['wo5_town', [12, 17], [8, 12], [7, 6], [10, 3], 'wo5_high'] },
        { via: ['wo5_town', [22, 17], [26, 12], [27, 6], [24, 3], 'wo5_high'] },
        // The thaw gully, straight up the glacier's south lobe.
        { via: ['wo5_town', 'wo5_gully', [17, 4]] },
        // The captive groups and the altars.
        { via: [[12, 17], 'wo5_low'] },
        { via: [[26, 12], 'wo5_mid'] },
        { via: [[7, 6], 'wo5_altar_w'] },
        { via: [[27, 6], 'wo5_altar_e'] },
        { via: ['wo5_high', 'wo5_jokul'] },
        // Hrimgard, the horn and the column's muster.
        { via: [[22, 17], 'wo5_refuge'] },
        { via: ['wo5_refuge', 'wo5_horn'] },
        { via: [[27, 6], 'wo5_muster'] },
        // Spurs.
        { via: ['wo5_town', 'wo5_settle'] },
        { via: [[12, 17], 'wo5_low_stores'] },
        { via: [[8, 12], 'wo5_root_runners'] },
        { via: [[22, 17], 'wo5_ogres'] },
        { via: [[10, 3], 'wo5_child'] },
        { via: [[24, 3], 'wo5_crags'] },
        { via: ['wo5_town', 'wo5_sawmill'] },
        { via: [[22, 17], 'wo5_quarry'] },
        { via: [[12, 17], 'wo5_mine'] },
      ],
    },
    sites: [
      S.town('wo5_town', 'jokulsby', [17, 19], 'Jokulsby', 'A shepherds’ hold below the circular glacier. Its lower houses stand where the first thaw will run.', [17, 18]),
      S.resource('wo5_sawmill', [14, 20], 'sawmill'),
      S.resource('wo5_quarry', [24, 20], 'quarry'),
      S.resource('wo5_mine', [6, 18], 'gold_mine'),
      // The three captive groups at three heights.
      S.landmark('wo5_low', [7, 14], 'Low Terrace Giants', 'Giants frozen upright at the foot of the west pass — the lowest of Hrafn’s monuments, guarded by his ice-wardens and their trolls.', 'refuge', {
        label: 'Low-terrace wardens',
        army: lowGuard,
        reward: { flags: ['wo5_free_low', 'wo5_first_free'], resources: { gold: 800 }, questXp: 800 },
        battlefield: 'plateau',
        required: true,
      }, { marker: 'evacuation' }),
      S.landmark('wo5_mid', [28, 10], 'Middle Terrace Giants', 'A giant family frozen on a shelf halfway up the east pass, watched by ancient trolls in Hrafn’s pay.', 'refuge', {
        label: 'Middle-terrace wardens',
        army: midGuard,
        reward: { flags: ['wo5_free_mid', 'wo5_first_free'], resources: { gold: 800 }, questXp: 800 },
        battlefield: 'plateau',
        required: true,
      }, { marker: 'evacuation' }),
      S.landmark('wo5_high', [17, 2], 'High Terrace Giants', 'The oldest giants, frozen on the highest terrace above the glacier, where Hrafn’s storm-wyrms circle.', 'refuge', {
        label: 'High-terrace wardens',
        army: highGuard,
        reward: { flags: ['wo5_free_high', 'wo5_first_free'], resources: { gold: 1000 }, questXp: 1000 },
        battlefield: 'plateau',
        required: true,
      }, { objectiveIds: ['wo5_groups'], marker: 'evacuation' }),
      // Hrafn's two rime-altars.
      S.landmark('wo5_altar_w', [5, 4], 'West Rime-altar', 'One of the two altars from which Hrafn keeps the glacier frozen. He holds it himself while it stands.', 'refuge', {
        label: 'Hrafn and the west altar guard',
        army: altarGuard,
        commander: hrafn,
        reward: { flags: ['wo5_hrafn_beaten'], resources: { gold: 1500 }, questXp: 1500 },
        battlefield: 'ridge_pass',
        required: true,
      }),
      S.landmark('wo5_altar_e', [29, 3], 'East Rime-altar', 'The second of Hrafn’s altars, above the east pass. He holds it himself while it stands.', 'refuge', {
        label: 'Hrafn and the east altar guard',
        army: altarGuard,
        commander: hrafn,
        reward: { flags: ['wo5_hrafn_beaten'], resources: { gold: 1500 }, questXp: 1500 },
        battlefield: 'ridge_pass',
        required: true,
      }),
      S.choice(
        'wo5_jokul',
        [19, 2],
        'Jökul’s Stone',
        'The standing stone on the high terrace where the freed giants gather around Jökul, the eldest.',
        'Which altar falls',
        'Jökul flexes his thawing hands. “Hrafn holds two altars, little seeress, and he cannot stand at both. My kin who are free can break one of them from below while he watches the other. Tell us which. Then go and meet him at the one that still stands.”',
        [
          { label: 'The low-terrace giants break the west altar', summary: 'Only once the low-terrace giants are free. The west altar’s guard stands down: meet Hrafn at the east altar.', reward: { flags: ['wo5_west_broken'] }, requiresFlags: ['wo5_free_low'], clearsSiteIds: ['wo5_altar_w'] },
          { label: 'The middle-terrace giants break the east altar', summary: 'Only once the middle-terrace giants are free. The east altar’s guard stands down: meet Hrafn at the west altar.', reward: { flags: ['wo5_east_broken'] }, requiresFlags: ['wo5_free_mid'], clearsSiteIds: ['wo5_altar_e'] },
        ],
        { marker: 'pact' },
      ),
      // Hrimgard, the refuge — and the column that comes for it.
      S.landmark('wo5_refuge', [24, 16], 'Hrimgard', 'The giants’ old hall at the glacier’s south-east foot, high above the thaw. Hrafn’s ice-wardens hold it; cleared, it can shelter every freed giant and every family from the lower houses.', 'refuge', {
        label: 'Hrimgard ice-wardens',
        army: refugeGuard,
        reward: { flags: ['wo5_refuge_secured'], resources: { gold: 1000 }, questXp: 800 },
        battlefield: 'plateau',
        required: true,
      }, { objectiveIds: ['wo5_refuge'], marker: 'evacuation' }),
      S.landmark('wo5_muster', [30, 7], 'Column Muster', 'Hrafn’s camp on the east pass, where the retaliatory column waits to march on whatever refuge Hervor makes.', 'refuge', {
        label: 'Muster guard',
        army: musterGuard,
        reward: { flags: ['wo5_muster_taken'], resources: { gold: 600 } },
        battlefield: 'ridge_pass',
      }),
      S.shortcut('wo5_gully', [17, 14], 'Thaw Gully', 'A meltwater channel that will open through the glacier’s south lobe at the first thaw — a straight climb from Jokulsby to the high terrace.', ['wo5_thaw']),
      S.activation(
        'wo5_horn',
        [22, 18],
        'Horn of Hrimgard',
        'A horn as long as a longship, hung in an ice-arch below Hrimgard. Its note tells every giant on the glacier that the refuge holds.',
        {
          cost: { gold: 500, crystal: 2 },
          reward: { questXp: 2000, resources: { favor: 5 } },
          requirements: [
            { type: 'objective_completed', objectiveId: 'wo5_groups' },
            { type: 'objective_completed', objectiveId: 'wo5_hold' },
            { type: 'objective_completed', objectiveId: 'wo5_hrafn' },
          ],
          completesMission: true,
          confirm: 'Sound the Horn of Hrimgard (500 Gold, 2 Crystal)? This completes The Giants’ Refuge.',
        },
        null,
        { objectiveIds: ['wo5_horn'] },
      ),
      S.choice(
        'wo5_settle',
        [15, 18],
        'Jokulsby Moot',
        'The moot-stone below the hold, where the shepherds argue about the thaw.',
        'Where the supplies go',
        'Skeggi has done the sums twice. “Everyone is safe — the giants in Hrimgard, the families with them. But there are supplies for one more thing. Stone the lower houses against the next thaw and Jokulsby stays a town when this is over. Or build a high refuge for the giants beside Hrimgard, and some of them will march north with us.”',
        [
          { label: 'Reinforce the downhill settlement', summary: 'Costs 8 Wood and 8 Stone. Jokulsby’s lower houses stand: a stronger community at the end (in the final chapter its folk keep Hrimby guarded).', cost: { wood: 8, stone: 8 }, reward: { flags: ['wo5_downhill'] }, requiresFlags: ['wo5_freed_all'] },
          { label: 'Build the high refuge', summary: 'Costs 1,500 Gold and 6 Stone. The giants have a hall of their own: 2 Jotnar march with Hervor in the final chapter.', cost: { gold: 1500, stone: 6 }, reward: { flags: ['wo5_high_refuge'] }, requiresFlags: ['wo5_freed_all'] },
        ],
        { marker: 'pact', objectiveIds: ['wo5_choice'] },
      ),
      S.depot('wo5_low_stores', [10, 18], 'Low Road Stores', 'The lower houses’ winter stores on the low road under the west pass — the road the meltwater will run down at the first thaw.', { resources: { gold: 400, wood: 3 } }),
      S.neutral('wo5_root_runners', [5, 10], 'Tree-line Roots', 'The last pines below the west pass, where Root-Runners nest in the roots.', 'root_runner', 8),
      S.camp('wo5_ogres', [29, 17], 'Warm Quarry', 'A quarry warmed by a hot spring, where ogres sit out the winter. They work for whoever pays.', 'ogre', 1, 2),
      S.choice(
        'wo5_child',
        [10, 2],
        'The Ice-bound Child',
        'A giant’s child, taller than a horse, frozen in a block of blue ice next to a cairn of offerings.',
        'The Ice-bound Child',
        'Someone has been leaving offerings at the child’s feet — coins, a comb, a carved horse. The ice is old, but it is only ice. With fire and patience, it would come off.',
        [
          { label: 'Thaw the child', summary: '+10 Favor; Hervor gains 600 experience.', reward: { resources: { favor: 10 }, questXp: 600 } },
          { label: 'Take the offerings and go on', summary: '+1,500 Gold.', reward: { resources: { gold: 1500 } } },
        ],
      ),
      S.landmark('wo5_crags', [25, 2], 'Storm Crags', 'Storm Lindworms nest on the crags of the upper terrace.', 'quarry_cache', { label: 'Storm lindworms', army: [['norse_storm_lindworm', 2]], reward: { resources: { crystal: 6 } }, battlefield: 'plateau' }),
    ],
    patrols: [
      {
        commander: band('wo5_column', 'Hrafn’s Retaliatory Column', DEAD_PORTRAIT),
        monster: true,
        bounty: { gold: 800 },
        start: [29, 9],
        waypoints: [[27, 13], [25, 15], [23, 17], [26, 14]],
        army: columnArmy,
        home: 'wo5_muster',
        dormantUntil: 'wo5_refuge_secured',
        threshold: [3, 2],
        purpose: 'Waits at its muster on the east pass until Hrimgard is made a refuge, then marches on it — once. Taking the muster first sends it home for good.',
      },
    ],
    objectives: [
      O.primary(
        'wo5_groups',
        'Free the three giant groups',
        `Free the giants at their three heights, in any order: the low terrace (${armyText(lowGuard)}), the middle terrace (${armyText(midGuard)}) and the high terrace (${armyText(highGuard)}). The west and east passes both climb to the high terrace; the thaw gully is a third way once it opens.`,
        C.all(C.cleared('wo5_low'), C.cleared('wo5_mid'), C.cleared('wo5_high')),
        { markerSiteId: 'wo5_high', reward: { flags: ['wo5_freed_all'] } },
      ),
      O.primary('wo5_refuge', 'Secure a refuge', `Take Hrimgard from Hrafn’s ice-wardens (${armyText(refugeGuard)}): a hall above the thaw for the freed giants and the lower houses.`, C.cleared('wo5_refuge'), { markerSiteId: 'wo5_refuge' }),
      O.primary('wo5_hold', 'Hold the refuge', `Hrafn sends one retaliatory column (${armyText(columnArmy)}) against Hrimgard once it is a refuge: break it, or take its muster on the east pass (${armyText(musterGuard)}) so it never leaves.`, C.defeated('wo5_column'), { markerSiteId: 'wo5_refuge', requires: ['wo5_refuge'] }),
      O.primary(
        'wo5_hrafn',
        'Defeat Hrafn the Hollow',
        `Defeat Hrafn (${armyText(altarGuard)}) at whichever of his two rime-altars he still holds. Freed giants can break one altar for you at Jökul’s Stone.`,
        C.flag('wo5_hrafn_beaten'),
        { markerSiteId: 'wo5_altar_w', reward: { artifactIds: ['einherjar_mail'] } },
      ),
      O.primary('wo5_horn', 'Sound the Horn of Hrimgard', 'With the giants free, Hrimgard held and Hrafn beaten, sound the horn below the refuge (500 Gold, 2 Crystal).', C.activated('wo5_horn'), { markerSiteId: 'wo5_horn', requires: ['wo5_groups', 'wo5_hold', 'wo5_hrafn'] }),
      O.optional('wo5_low_road', 'Before the thaw', 'Bring up the Low Road Stores before the first thaw floods the low road: +600 Gold and +3 Wood more.', C.visited('wo5_low_stores'), { markerSiteId: 'wo5_low_stores', reward: { resources: { gold: 600, wood: 3 } } }),
      O.optional('wo5_choice', 'Where the supplies go', 'With all three groups free, decide at the Jokulsby Moot: reinforce the downhill settlement, or build a high refuge for the giants.', C.any(C.flag('wo5_downhill'), C.flag('wo5_high_refuge')), { markerSiteId: 'wo5_settle' }),
      O.optional('wo5_altar_broken', 'Jökul’s offer', 'Let the freed giants break one of Hrafn’s altars at Jökul’s Stone.', C.any(C.flag('wo5_west_broken'), C.flag('wo5_east_broken')), { markerSiteId: 'wo5_jokul' }),
      O.optional('wo5_oath_claim', 'The giants’ oath', 'With the three groups free, accept the Jotnar’s oath in the journal: the Jotunn covenant, to assign to Jokulsby.', { type: 'claim', after: ['wo5_groups'] }, { reward: { entitlementIds: ['covenant.norse_jotunn.wo6'] } }),
      O.optional('wo5_child_visit', 'The ice-bound child', 'A small shape in the ice on the upper terrace.', C.visited('wo5_child'), { markerSiteId: 'wo5_child' }),
    ],
    timers: [
      {
        id: 'wo5_thaw',
        label: 'The first thaw',
        startWhen: C.all(),
        days: 8,
        metWhen: C.flag('wo5_never'),
        consequence: 'After the eighth day the meltwater opens the Thaw Gully through the glacier (a straight way up to the high terrace, open from then on) and runs down the low road under the west pass, washing out the Low Road Stores’ extra share (the 600 Gold and 3 Wood bonus). The west pass itself stays dry and no road is closed.',
        announce: 'Skeggi has read the ice: the first thaw comes after the eighth day. It will open a gully through the glacier’s south lobe — and the low road under the west pass is the one the meltwater will take.',
        onExpire: { flags: ['wo5_thaw'], failObjectives: ['wo5_low_road'] },
      },
    ],
    evidence: [
      { id: 'wo5_ev_freed', flag: 'wo5_freed_all', title: 'The giants freed', text: 'All three giant groups are free of Hrafn’s ice.', icon: 'evacuation' },
      { id: 'wo5_ev_refuge', flag: 'wo5_refuge_secured', title: 'Hrimgard secured', text: 'Hrimgard, above the thaw, shelters the freed giants and the lower houses.', icon: 'evacuation' },
      { id: 'wo5_ev_hrafn', flag: 'wo5_hrafn_beaten', title: 'Hrafn beaten', text: 'Hrafn the Hollow was beaten at his last rime-altar. He swore to the Jarl for a war that never ends.', icon: 'evidence' },
      { id: 'wo5_ev_downhill', flag: 'wo5_downhill', title: 'The lower houses stand', text: 'Jokulsby’s lower houses were stoned against the thaw: the community stays whole.', icon: 'supply' },
      { id: 'wo5_ev_high', flag: 'wo5_high_refuge', title: 'A high refuge', text: 'The giants have a hall of their own beside Hrimgard; some of them will march north.', icon: 'pact' },
      { id: 'wo5_ev_west_altar', flag: 'wo5_west_broken', title: 'The west altar broken', text: 'The low-terrace giants broke Hrafn’s west rime-altar; he held only the east one.', icon: 'branch' },
      { id: 'wo5_ev_east_altar', flag: 'wo5_east_broken', title: 'The east altar broken', text: 'The middle-terrace giants broke Hrafn’s east rime-altar; he held only the west one.', icon: 'branch' },
    ],
    carried: ['wo5_freed_all', 'wo5_downhill', 'wo5_high_refuge', 'wo5_hrafn_beaten'],
    entryBonuses: [{ fact: 'wo3_trade_first', label: 'Hvitey’s merchant captains pay for the open sound (2,000 Gold, 2 Crystal)', wallet: { gold: 2000, crystal: 2 } }],
    briefing: [
      SKEGGI('Long before the Jarl, the giants of Hrimgard kept the winter on the glacier where it belonged. Hrafn froze them into it — monuments to the Jarl’s promise, he calls them.'),
      HERVOR('And when the thaw comes, the monuments come down on Jokulsby’s lower houses.'),
      SKEGGI('So freeing them and sheltering the people below them is one job, not two. Hrimgard stands above the thaw; make it a refuge, and Hrafn will send what he has left against it.'),
      EYDIS('He holds two rime-altars, one over each pass. He cannot stand at both.'),
    ],
    briefingVariants: [
      { ifFlags: ['fact:wo3_well_read'], lines: [EYDIS('The Norns said it plainly: a shelter for the weak through one hard winter. These giants were the shelter once. They should not be its prisoners.')] },
      { ifFlags: ['fact:wo4_settlement'], lines: [SKEGGI('Ulfhild kept her word, for once: her sledges brought salt and rope up from Hvitstrand.')] },
      { ifFlags: ['fact:wo3_prisoners'], lines: [EYDIS('Two of the prisoners from the Ship of Nails came with us. Their grandmothers were born under this glacier.')] },
    ],
    victory: [
      JOKUL('The horn has not sounded in a thousand winters, small seeress. Now the Jarl knows you are coming. So do we.'),
      HERVOR('Then the road is open. One hall left.'),
    ],
    scenes: [
      { id: 'wo5_first', trigger: { type: 'flag', flag: 'wo5_first_free' }, lines: [JOKUL('Warm hands. I had forgotten. Who are you, to break the Jarl’s ice?'), HERVOR('The one who woke his sword. I am trying to put it back to sleep.')] },
      { id: 'wo5_refuge', trigger: { type: 'site_cleared', siteId: 'wo5_refuge' }, lines: [SKEGGI('Hrimgard is ours — and there, on the east pass: Hrafn’s column is moving. They are coming for the refuge.')] },
      { id: 'wo5_jokul', trigger: { type: 'site_visited', siteId: 'wo5_jokul' }, lines: [JOKUL('Two altars, one Hrafn. My free kin can break one; you meet him at the other.')] },
      { id: 'wo5_altar_battle', trigger: { type: 'battle_started', heroDefinitionId: 'norse_hrafn' }, lines: [HRAFN('The valkyries chose me once. I walked out of their hall because the Jarl promised me a war that never ends. Do you know how rare that is?'), HERVOR('A war that never ends is only a winter with weapons, Hrafn.')] },
      { id: 'wo5_hrafn_down', trigger: { type: 'flag', flag: 'wo5_hrafn_beaten' }, lines: [HERVOR('The mail he wore came from the hall of the chosen. The valkyries are dressing me for something.')] },
      { id: 'wo5_thaw', trigger: { type: 'flag', flag: 'wo5_thaw' }, lines: [SKEGGI('The thaw has started. The gully through the glacier is open — and the low road is under meltwater, as I said it would be. The west pass is dry.')] },
      { id: 'wo5_child', trigger: { type: 'site_visited', siteId: 'wo5_child' }, lines: [SKEGGI('Whatever you chose there, the giants will hear of it. Giants hear everything that happens on the ice.')] },
      { id: 'wo5_losses', trigger: { type: 'casualties', minLost: 14 }, lines: [EYDIS('The glacier keeps our dead better than any barrow. I will come back for their names when it is over.')] },
    ],
    loss: ['Hervor must survive.', 'Losing Jokulsby is recoverable while Hervor has an army.', 'The thaw is announced and never strands an army: it opens a way and washes out only the low road’s bonus stores.'],
    help: [
      { id: 'wo5_bowl', title: 'The glacial bowl', text: 'Two broad passes climb round the glacier from Jokulsby — west and east — and the quarry road joins them across the upper terraces. The thaw gully through the glacier opens on its announced day.' },
      { id: 'wo5_hrafn_help', title: 'Hrafn’s two altars', text: 'Hrafn holds both rime-altars. Freed giants can break one at Jökul’s Stone (the low-terrace giants the west altar, the middle-terrace giants the east); beat him at the one that remains.' },
      { id: 'wo5_column_help', title: 'The retaliatory column', text: 'Once Hrimgard is a refuge, one column marches on it from its muster on the east pass. Break it, or take the muster first and it never marches.' },
    ],
  });

  // =========================================================================
  // Chapter 6 — Oathbreaker's Hall (card 14; legacy m07)
  // =========================================================================
  const v1m07 = camp.v1('winter_oath_m07');
  const greyJarl = v1m07.sites.find((s) => s.id === 'm07_jarl_hall')?.guard?.commander;
  const barrowCaptain = v1m07.hostileHeroes[0]?.commander;
  if (!greyJarl || !barrowCaptain) throw new Error('Winter Oath v2: the Grey Jarl’s or the Barrow Captain’s profile is missing from the legacy content');
  const jarlHost: Army = [['norse_ancient_frost_troll', 2], ['norse_deathless_draugr', 20], ['norse_deathless_draugr', 20], ['norse_fenrir_wolf', 12], ['norse_runic_jotunn', 2], ['norse_storm_lindworm', 2]];
  const westHold: Army = [['norse_deathless_draugr', 24], ['norse_fenrir_wolf', 8]];
  const northHold: Army = [['norse_jotunn', 2], ['norse_deathless_draugr', 14]];
  const eastHold: Army = [['norse_ancient_frost_troll', 4], ['norse_deathless_draugr', 16], ['norse_storm_lindworm', 1]];
  const captainArmy: Army = [['norse_deathless_draugr', 24], ['norse_fenrir_wolf', 8], ['norse_ancient_frost_troll', 2]];
  const ridersArmy: Army = [['norse_fenrir_wolf', 10], ['norse_deathless_draugr', 10]];
  const m6 = chapter({
    campaign: camp,
    chapter: 6,
    card: 14,
    name: 'Oathbreaker’s Hall',
    summary:
      'The Grey Jarl demands the kingdom he was promised “when the winter ends”. Break two of the three strongholds that enforce his oath, reach his hall on the inner plateau of Isafold and win the final battle — then resolve the sword’s bond through Eydis’s rite.',
    playtime: '85–110 minutes, 5–7 battles',
    legacy: ['winter_oath_m07'],
    economyFrom: 'winter_oath_m07',
    principal: 'wo6_jarl',
    soundscape: 'storm_plateau',
    hostileName: 'The Winter Host',
    town: { siteId: 'wo6_town', townId: 'isafold', name: 'Isafold' },
    map: {
      cols: 42,
      rows: 24,
      biome: 'tundra',
      base: 'plains',
      seed: 970006,
      texture: { forest: 30, rough: 70 },
      paint: [
        // The inner plateau inside its mountain ring; the Jarl's hall on a mound in the middle.
        { t: 'mountain', disc: [21, 12, 7] },
        { t: 'plains', disc: [21, 12, 5] },
        { t: 'mountain', disc: [21, 12, 1] },
        { t: 'rough', cells: [[19, 9], [23, 9], [18, 14], [24, 15]] },
        // The three passes through the ring.
        { t: 'rough', line: [[13, 12], [16, 12]], width: 0 },
        { t: 'rough', line: [[21, 3], [21, 7]], width: 0 },
        { t: 'rough', line: [[26, 12], [29, 12]], width: 0 },
        // The barrow fells closing the south, with the old burial road through them.
        { t: 'mountain', rect: [9, 20, 33, 22] },
        { t: 'rough', line: [[8, 21], [34, 21]], width: 0 },
        // Outer country: the western moors, the northern strip, the eastern fells.
        { t: 'forest', blob: [4, 9, 2] },
        { t: 'rough', blob: [36, 9, 2] },
        { t: 'forest', cells: [[30, 2], [31, 1], [12, 2], [13, 1]] },
        { t: 'marsh', cells: [[3, 22], [4, 22]] },
      ],
      roads: [
        // The outer ring: Isafold — Kolby — the northern strip — Snaevik — the eastern fells — Hrimby.
        { via: ['wo6_town', [6, 14], [6, 6], 'wo6_kolby'] },
        { via: [[6, 6], [12, 3], [21, 2], [30, 3], 'wo6_snaevik'] },
        { via: [[30, 3], [35, 7], [34, 12], [36, 17], 'wo6_hrimby'] },
        // The three passes into the inner plateau.
        { via: [[6, 14], 'wo6_west_pass', [18, 12], 'wo6_west_door', 'wo6_hall'] },
        { via: [[21, 2], 'wo6_north_pass', [21, 8], [23, 10], 'wo6_east_door', 'wo6_hall'] },
        { via: [[34, 12], 'wo6_east_pass', [24, 12], 'wo6_east_door'] },
        { via: [[18, 12], [21, 8]] },
        { via: [[24, 12], [21, 15], [18, 12]] },
        { via: [[21, 15], 'wo6_rite'] },
        // The old burial road along the south, from Isafold's sector to Hrimby's.
        { via: ['wo6_town', 'wo6_burial_road', [20, 21], [34, 21], 'wo6_hrimby'] },
        { via: ['wo6_town', 'wo6_sexton'] },
        // The strongholds beside the passes.
        { via: [[6, 14], 'wo6_west_hold'] },
        { via: [[21, 2], 'wo6_north_hold'] },
        { via: [[34, 12], 'wo6_east_hold'] },
        // Spurs.
        { via: [[6, 14], 'wo6_witnesses'] },
        { via: ['wo6_town', 'wo6_refugees'] },
        { via: ['wo6_town', 'wo6_sawmill'] },
        { via: [[6, 14], 'wo6_quarry'] },
        { via: [[35, 7], 'wo6_crystal'] },
        { via: [[21, 15], 'wo6_grave_goods'] },
      ],
    },
    sites: [
      S.town('wo6_town', 'isafold', [5, 19], 'Isafold', 'A hunters’ hold in the south-west of the Isafold highland — the last hold before the Jarl’s mound.', [6, 18]),
      S.resource('wo6_sawmill', [2, 15], 'sawmill'),
      S.resource('wo6_quarry', [10, 15], 'quarry'),
      S.resource('wo6_crystal', [39, 7], 'crystal_deposit'),
      // The outer settlements.
      S.activation('wo6_kolby', [4, 3], 'Kolby', 'A fishing settlement on the north-west moors. Post a guard from Isafold and the Jarl’s riders find it defended.', { cost: { gold: 400, wood: 2 }, reward: { flags: ['wo6_kolby_guarded'] }, confirm: 'Post a guard at Kolby (400 Gold, 2 Wood)?', label: 'relay' }, null, { marker: 'evacuation' }),
      S.activation('wo6_snaevik', [37, 3], 'Snaevik', 'A herders’ settlement in the north-east. Post a guard from Isafold and the Jarl’s riders find it defended.', { cost: { gold: 400, wood: 2 }, reward: { flags: ['wo6_snaevik_guarded'] }, confirm: 'Post a guard at Snaevik (400 Gold, 2 Wood)?', label: 'relay' }, null, { marker: 'evacuation' }),
      S.activation('wo6_hrimby', [37, 19], 'Hrimby', 'A settlement under the eastern fells, at the far end of the old burial road. Post a guard and the Jarl’s riders find it defended.', { cost: { gold: 400, wood: 2 }, reward: { flags: ['wo6_hrimby_guarded'] }, confirm: 'Post a guard at Hrimby (400 Gold, 2 Wood)?', label: 'relay' }, null, { marker: 'evacuation' }),
      // The three oath-enforcement strongholds.
      S.landmark('wo6_west_hold', [10, 9], 'West Oath-hold', 'The stronghold beside the west pass, where the oath’s dead are mustered to keep the moors. Its reserve stands inside the plateau.', 'refuge', {
        label: 'West oath-hold',
        army: westHold,
        reward: { flags: ['wo6_west_broken'], resources: { gold: 1000 } },
        battlefield: 'ridge_pass',
      }, { objectiveIds: ['wo6_strongholds'] }),
      S.landmark('wo6_north_hold', [24, 2], 'North Oath-hold', 'Two giants who never woke, bound by a rune on their brows, hold the north pass for the Jarl. Their reserve stands on the plateau.', 'refuge', {
        label: 'Rune-bound giants',
        army: northHold,
        reward: { flags: ['wo6_north_broken'], resources: { gold: 1000 } },
        battlefield: 'ridge_pass',
      }),
      S.landmark('wo6_east_hold', [32, 14], 'East Oath-hold', 'The stronghold below the eastern fells, where the Jarl’s trolls and wyrms keep his riders. Its reserve stands on the plateau.', 'refuge', {
        label: 'East oath-hold',
        army: eastHold,
        reward: { flags: ['wo6_east_broken'], resources: { gold: 1000, crystal: 2 } },
        battlefield: 'ridge_pass',
      }),
      // The passes and the hall.
      S.crossing('wo6_west_pass', [14, 12], 'West Pass', 'The pass from the western moors onto the inner plateau.', null),
      S.crossing('wo6_north_pass', [21, 5], 'North Pass', 'The pass from the northern strip onto the inner plateau.', null),
      S.crossing('wo6_east_pass', [27, 12], 'East Pass', 'The pass from the eastern fells onto the inner plateau.', null),
      S.shortcut('wo6_west_door', [20, 12], 'West Barrow-door', 'The western door of the Jarl’s mound. The oath holds it shut while two of its three strongholds stand.', ['wo6_hall_open']),
      S.shortcut('wo6_east_door', [22, 12], 'East Barrow-door', 'The eastern door of the Jarl’s mound. The oath holds it shut while two of its three strongholds stand.', ['wo6_hall_open']),
      S.landmark('wo6_hall', [21, 12], 'Oathbreaker’s Hall', 'The Grey Jarl’s hall, built on the mound where he swore his oath a thousand winters ago.', 'refuge', {
        label: 'The Grey Jarl and his hall',
        army: jarlHost,
        commander: greyJarl,
        reward: { flags: ['wo6_jarl_down'], resources: { gold: 2000 }, questXp: 3000 },
        battlefield: 'beacon_clearing',
        required: true,
      }, { objectiveIds: ['wo6_jarl'] }),
      S.choice(
        'wo6_rite',
        [21, 15],
        'The Oath-mound',
        'The mound-stone where the oath was sworn, where Eydis can unmake it — or remake it.',
        'Eydis’s rite',
        'The Jarl is beaten, and the oath is not: it lives in the sword. Eydis kneels at the mound-stone with the ledger, the first inscription and the witnesses around her. “It was a promise to shelter the weak through one hard winter,” she says. “Nobody wrote an end, so a king made it a claim. We can break the claim and let it go — the dead free, the settlements keeping each other. Or we can bind it again, small: to the settlements together, one winter at a time, ended at their moot. The sword is yours, Hervor. The choice is too.”',
        [
          { label: 'Break the sword’s claim and disperse the oath', summary: 'The inherited claim ends: the oath’s dead are released, and the protection it promised goes back to the settlements themselves. Both endings complete the campaign.', reward: { flags: ['wo_oath_dispersed'], questXp: 500 }, requiresFlags: ['wo6_jarl_down'] },
          { label: 'Rebind it to a limited communal duty', summary: 'The oath is bound again — to the settlements together, one winter at a time, renewed or ended at their moot; Hervor keeps the sword as its witness, not its owner. Both endings complete the campaign.', reward: { flags: ['wo_oath_rebound'], questXp: 500 }, requiresFlags: ['wo6_jarl_down'] },
        ],
        { marker: 'pact', objectiveIds: ['wo6_sword'] },
      ),
      // The flanking burial road.
      S.shortcut('wo6_burial_road', [8, 21], 'Old Burial Road', 'The old road the dead were carried along to the barrows, through the fells from Isafold’s sector to Hrimby’s. Its sexton keeps it barred.', ['wo6_burial_open']),
      S.activation('wo6_sexton', [4, 21], 'Sexton’s Hut', 'The burial road’s old sexton, who keeps its bar and its key.', { cost: { gold: 500, stone: 4 }, reward: { flags: ['wo6_burial_open'] }, confirm: 'Pay the sexton 500 Gold and 4 Stone to unbar the Old Burial Road? It is a flanking route along the south to Hrimby and the east.', label: 'relay' }, null),
      // Witnesses and the refugee camp.
      S.choice(
        'wo6_witnesses',
        [8, 11],
        'Witness Fire',
        'A fire below the west oath-hold where the freed prisoners of the Ship of Nails would speak, if they were here.',
        'The named prisoners',
        'The prisoners Hervor brought out of the Ship of Nails walk up to the hold’s palisade and call the names of the dead inside — their own grandfathers, bound by the same ledger. One by one the oath-bound lower their spears.',
        [{ label: 'Let the prisoners call the names', summary: 'Only if the named prisoners were freed before Bone-Helm’s ship was struck. The West Oath-hold lays down its arms: it counts as broken, and its reserve never takes the field.', reward: { flags: ['wo6_names_called'], questXp: 800 }, requiresFlags: ['fact:wo3_prisoners'], clearsSiteIds: ['wo6_west_hold'] }],
        { marker: 'evidence' },
      ),
      S.choice(
        'wo6_refugees',
        [9, 17],
        'Refugee Camp',
        'A mixed camp of folk driven off the moors: slingers, sailors and two ogres who carried the children out.',
        'One band from the camp',
        'The camp can spare one band; the rest stay to guard the children. Who goes with you is your choice.',
        [
          { label: '10 Hill Slingers', summary: 'Costs 900 Gold. 10 Hill Slingers join Hervor.', cost: { gold: 900 }, reward: { creatures: [{ creatureId: 'hill_slinger', count: 10 }] } },
          { label: '8 Brigand Cutthroats', summary: 'Costs 560 Gold. 8 Brigand Cutthroats join Hervor.', cost: { gold: 560 }, reward: { creatures: [{ creatureId: 'brigand_cutthroat', count: 8 }] } },
          { label: '2 Ogres', summary: 'Costs 800 Gold. 2 Ogres join Hervor.', cost: { gold: 800 }, reward: { creatures: [{ creatureId: 'ogre', count: 2 }] } },
        ],
        { marker: 'pact' },
      ),
      S.pickup('wo6_grave_goods', [24, 15], 'Grave-goods', 'Tribute the Jarl’s dead brought to his mound.', { resources: { gold: 1500, crystal: 3 } }),
    ],
    patrols: [
      {
        commander: barrowCaptain,
        start: [13, 3],
        waypoints: [[7, 7], [12, 3], [21, 2], [30, 3], [35, 7], [35, 15], [35, 7], [30, 3], [21, 2], [12, 3]],
        army: captainArmy,
        home: 'wo6_north_hold',
        purpose: 'Patrols the outer ring between the settlements and the passes — not one corridor. He musters at the North Oath-hold: breaking it recalls him.',
      },
      {
        commander: band('wo6_riders', 'The Jarl’s Riders', WOLF_PORTRAIT),
        monster: true,
        bounty: { gold: 600 },
        start: [33, 12],
        waypoints: [[36, 18], [35, 7], [30, 3], [12, 3], [6, 6], [12, 3], [30, 3], [35, 7]],
        army: ridersArmy,
        home: 'wo6_east_hold',
        dormantUntil: 'wo6_raid',
        threshold: [3, 2],
        purpose: 'On the announced day the Jarl sends his riders against every settlement left without a guard. They are quartered at the East Oath-hold: breaking it ends them.',
      },
      {
        commander: band('wo6_west_reserve', 'West Hold Reserve', DEAD_PORTRAIT),
        monster: true,
        bounty: { gold: 500 },
        start: [17, 10],
        waypoints: [[18, 12], [18, 9], [17, 14]],
        army: [['norse_deathless_draugr', 16], ['norse_fenrir_wolf', 6]],
        home: 'wo6_west_hold',
        dormantUntil: 'wo6_hall_open',
        threshold: [3, 2],
        purpose: 'The West Oath-hold’s reserve for the final battle: it stands on the plateau and takes the field round the hall when the barrow-doors open. Breaking its hold first sends it away.',
      },
      {
        commander: band('wo6_north_reserve', 'North Hold Reserve', 'creature.norse.tier3.upgraded.portrait'),
        monster: true,
        bounty: { gold: 500 },
        start: [22, 8],
        waypoints: [[20, 9], [23, 10], [22, 8]],
        army: [['norse_ancient_frost_troll', 3], ['norse_battle_valkyrie', 2]],
        home: 'wo6_north_hold',
        dormantUntil: 'wo6_hall_open',
        threshold: [3, 2],
        purpose: 'The North Oath-hold’s reserve for the final battle: it takes the field round the hall when the barrow-doors open. Breaking its hold first sends it away.',
      },
      {
        commander: band('wo6_east_reserve', 'East Hold Reserve', 'creature.norse.tier5.upgraded.portrait'),
        monster: true,
        bounty: { gold: 500 },
        start: [25, 14],
        waypoints: [[23, 13], [24, 10], [25, 14]],
        army: [['norse_deathless_draugr', 12], ['norse_storm_lindworm', 2]],
        home: 'wo6_east_hold',
        dormantUntil: 'wo6_hall_open',
        threshold: [3, 2],
        purpose: 'The East Oath-hold’s reserve for the final battle: it takes the field round the hall when the barrow-doors open. Breaking its hold first sends it away.',
      },
    ],
    objectives: [
      O.primary(
        'wo6_strongholds',
        'Break two oath-strongholds',
        `Break two of the three strongholds that enforce the oath: the West Oath-hold (${armyText(westHold)}), the North Oath-hold (${armyText(northHold)}) or the East Oath-hold (${armyText(eastHold)}). Each keeps a different reserve for the final battle; the barrow-doors open when two have fallen.`,
        C.atLeast(2, C.cleared('wo6_west_hold'), C.cleared('wo6_north_hold'), C.cleared('wo6_east_hold')),
        { markerSiteId: 'wo6_west_hold', reward: { flags: ['wo6_hall_open'] } },
      ),
      O.primary(
        'wo6_jarl',
        'The Grey Jarl',
        `Reach Oathbreaker’s Hall by any of the three passes and defeat the Grey Jarl (${armyText(jarlHost)}). The reserve of the stronghold still standing takes the field round the hall.`,
        C.cleared('wo6_hall'),
        { markerSiteId: 'wo6_hall', requires: ['wo6_strongholds'] },
      ),
      O.primary('wo6_sword', 'Eydis’s rite', 'With the Jarl beaten, resolve the sword’s bond at the Oath-mound: break its claim and disperse the oath, or rebind it to a limited communal duty.', C.any(C.flag('wo_oath_dispersed'), C.flag('wo_oath_rebound')), { markerSiteId: 'wo6_rite', requires: ['wo6_jarl'], completesMission: true }),
      O.optional('wo6_kolby_support', 'Kolby holds', 'Guard Kolby before the Jarl’s riders ride: its hunters send 400 Gold and 4 Wood.', C.flag('wo6_kolby_guarded'), { markerSiteId: 'wo6_kolby', reward: { resources: { gold: 400, wood: 4 } } }),
      O.optional('wo6_snaevik_support', 'Snaevik holds', 'Guard Snaevik before the Jarl’s riders ride: its herders send 400 Gold and 4 Stone.', C.flag('wo6_snaevik_guarded'), { markerSiteId: 'wo6_snaevik', reward: { resources: { gold: 400, stone: 4 } } }),
      O.optional('wo6_hrimby_support', 'Hrimby holds', 'Guard Hrimby before the Jarl’s riders ride: its smiths send 400 Gold and 2 Crystal.', C.flag('wo6_hrimby_guarded'), { markerSiteId: 'wo6_hrimby', reward: { resources: { gold: 400, crystal: 2 } } }),
      O.optional('wo6_captain_patrol', 'The Barrow Captain', `Beat the Barrow Captain (${armyText(captainArmy)}) on the ring, or break the North Oath-hold he musters at.`, C.defeated('norse_barrow_captain')),
      O.optional('wo6_burial', 'The old burial road', 'Pay the sexton to unbar the Old Burial Road: a flanking route along the south from Isafold to Hrimby.', C.flag('wo6_burial_open'), { markerSiteId: 'wo6_sexton' }),
      O.optional('wo6_refugee_band', 'The refugee camp', 'Visit the refugee camp near Isafold: it can spare one band.', C.visited('wo6_refugees'), { markerSiteId: 'wo6_refugees' }),
    ],
    timers: [
      {
        id: 'wo6_raid',
        label: 'The Jarl’s riders',
        startWhen: C.all(),
        days: 8,
        metWhen: C.all(C.flag('wo6_kolby_guarded'), C.flag('wo6_snaevik_guarded'), C.flag('wo6_hrimby_guarded')),
        consequence: 'The Jarl’s riders strike every settlement still without a guard: those settlements send nothing (their support is lost), and the riders roam the outer ring until the East Oath-hold falls. Guarded settlements are not touched.',
        announce: 'The Jarl has named the day: after the eighth, his riders strike whichever of Kolby, Snaevik and Hrimby is left without a guard.',
        onExpire: { flags: ['wo6_raid'], failObjectives: ['wo6_kolby_support', 'wo6_snaevik_support', 'wo6_hrimby_support'] },
      },
    ],
    evidence: [
      { id: 'wo6_ev_hall', flag: 'wo6_hall_open', title: 'The barrow-doors open', text: 'Two of the oath’s three strongholds are broken; the doors of the Jarl’s mound stand open.', icon: 'branch' },
      { id: 'wo6_ev_names', flag: 'wo6_names_called', title: 'The names called', text: 'The prisoners from the Ship of Nails called the names of the oath-bound at the West Oath-hold, and the dead laid down their spears.', icon: 'evidence' },
      { id: 'wo6_ev_jarl', flag: 'wo6_jarl_down', title: 'The Grey Jarl beaten', text: 'Hrolf, the Grey Jarl, fell in his own hall. His oath did not fall with him.', icon: 'evidence' },
      { id: 'wo6_ev_dispersed', flag: 'wo_oath_dispersed', title: 'The oath dispersed', text: 'The sword’s inherited claim is broken and the oath released. The settlements keep each other now.', icon: 'pact' },
      { id: 'wo6_ev_rebound', flag: 'wo_oath_rebound', title: 'The oath rebound', text: 'The oath is bound again to a small duty: the settlements together, one winter at a time, ended at their moot.', icon: 'pact' },
    ],
    carried: ['wo_oath_dispersed', 'wo_oath_rebound', 'wo6_jarl_down'],
    entryBonuses: [
      { fact: 'wo1_sheltered', label: 'Kaldvik’s barrow-watch, freed by the sheltered families (16 Deathless Draugr in Isafold)', garrison: [{ creatureId: 'norse_deathless_draugr', count: 16 }] },
      { fact: 'wo4_harbour_guard', label: 'Hvitstrand’s common harbour guard (4 Ancient Frost Trolls, 10 Fenrir Wolves in Isafold)', garrison: [{ creatureId: 'norse_ancient_frost_troll', count: 4 }, { creatureId: 'norse_fenrir_wolf', count: 10 }] },
      { fact: 'wo4_dues_returned', label: 'The independent settlements stand with Hervor: Kolby is guarded and 8 Fenrir Wolves join her', flags: ['wo6_kolby_guarded'], heroArmy: [{ creatureId: 'norse_fenrir_wolf', count: 8 }] },
      { fact: 'wo2_pack_pact', label: 'The White Pack hunts the dead round Snaevik: Snaevik is guarded', flags: ['wo6_snaevik_guarded'] },
      { fact: 'wo5_downhill', label: 'Jokulsby’s folk keep Hrimby: Hrimby is guarded', flags: ['wo6_hrimby_guarded'] },
      { fact: 'wo5_high_refuge', label: 'The giants of the high refuge march north (2 Jotnar)', heroArmy: [{ creatureId: 'norse_jotunn', count: 2 }] },
    ],
    briefing: [
      JARL('A thousand winters I have kept my word, seeress. A thousand. I was promised a kingdom when the winter ended. I have come to collect it.'),
      HERVOR('Then you were promised wrong, Hrolf. Nobody wrote when it ends.'),
      SKEGGI('His hall is on the mound in the middle of the plateau, and three passes climb to it. Three strongholds hold his oath over the moors; each keeps a reserve for his last battle. Break two and the barrow-doors open.'),
      EYDIS('And he will strike whatever settlement we leave without a guard. Beating him will not end the oath, Hervor — the sword still carries it. When he falls, I will need the mound-stone, and you.'),
    ],
    briefingVariants: [
      { ifFlags: ['fact:wo1_sheltered'], lines: [EYDIS('Kaldvik’s barrow-watch came north with us. The families we sheltered sent them: “we are safe, take the dead who keep us”.')] },
      { ifFlags: ['fact:wo4_harbour_guard'], lines: [SKEGGI('Hvitstrand’s harbour guard is in Isafold — men who answer to a harbour, not a jarl.')] },
      { ifFlags: ['fact:wo4_dues_returned'], lines: [SKEGGI('The settlements we paid back have kept their word: Kolby is guarded, and their wolves run with us.')] },
      { ifFlags: ['fact:wo2_pack_pact'], lines: [HERVOR('And look — white wolves on the ridge above Snaevik. The pack we did not slaughter is hunting his dead for us.')] },
      { ifFlags: ['fact:wo5_downhill'], lines: [SKEGGI('Jokulsby’s folk came over the fells to keep Hrimby. Their own houses are standing; they could spare the hands.')] },
      { ifFlags: ['fact:wo5_high_refuge'], lines: [JOKUL('Two of my kin walk with you to his door, small seeress, as I promised.')] },
      { ifFlags: ['fact:wo3_prisoners'], lines: [EYDIS('The prisoners from the Ship of Nails are with us. Their grandfathers are among the oath’s dead at the west hold. They want to call their names.')] },
    ],
    victory: [EYDIS('Hervor. The fjord is cracking. All the way to the skerries, I can hear it from the hall.')],
    scenes: [
      { id: 'wo6_captain_battle', trigger: { type: 'battle_started', heroDefinitionId: 'norse_barrow_captain' }, lines: [CAPTAIN('The ring is the Jarl’s. So is everything that dies on it.'), HERVOR('Then stop dying for him.')] },
      { id: 'wo6_names', trigger: { type: 'flag', flag: 'wo6_names_called' }, lines: [EYDIS('They are laying down their spears. Every name the prisoners call, another one kneels.')] },
      { id: 'wo6_doors', trigger: { type: 'flag', flag: 'wo6_hall_open' }, lines: [SKEGGI('The barrow-doors are open. I have sung about those doors for forty years and never thought I would see them.'), HERVOR('Keep your eyes open, skald. And watch the plateau — whatever reserve is left is coming out to meet us.')] },
      { id: 'wo6_raid', trigger: { type: 'flag', flag: 'wo6_raid' }, lines: [SKEGGI('His riders are out on the ring. Wherever we left no guard, they will be there first.')] },
      { id: 'wo6_jarl_battle', trigger: { type: 'battle_started', siteId: 'wo6_hall' }, lines: [JARL('You brought my sword home. That was kind. Now kneel, and carry my winter after me.'), HERVOR('I brought it to end your claim. Draugar — stand with me one more time.')] },
      { id: 'wo6_jarl_falls', trigger: { type: 'site_cleared', siteId: 'wo6_hall' }, lines: [JARL('A kingdom… they promised me a kingdom when the winter ended. And the winter never ended.'), HERVOR('It ends now. I am sorry it was not the kingdom you wanted.')] },
      // The witnesses at the rite: earlier choices decide who speaks, never which ending is possible.
      { id: 'wo6_w_ledger', trigger: { type: 'flag', flag: 'wo6_jarl_down' }, ifFlags: ['fact:wo3_ledger'], lines: [EYDIS('Bone-Helm’s ledger: thirty families, bound by name. I will read every one of them at the mound-stone before we decide anything.')] },
      { id: 'wo6_w_well', trigger: { type: 'flag', flag: 'wo6_jarl_down' }, ifFlags: ['fact:wo3_well_read'], lines: [EYDIS('And the Norns’ answer beside it: a shelter for the weak through one hard winter. That is what protection was supposed to mean.')] },
      { id: 'wo6_w_refuge', trigger: { type: 'flag', flag: 'wo6_jarl_down' }, ifFlags: ['fact:wo2_refuge_free'], lines: [SVANHILD('The valkyries chose the Jarl’s warriors once, seeress. We will witness what you do with their oath.')] },
      { id: 'wo6_w_ulfhild', trigger: { type: 'flag', flag: 'wo6_jarl_down' }, ifFlags: ['fact:wo4_settlement'], lines: [ULFHILD('(by messenger from Hvitstrand) I paid the oath’s keepers to keep my harbour shut. Let that be said at your mound, seeress — and that I stopped.')] },
      { id: 'wo6_w_giants', trigger: { type: 'flag', flag: 'wo6_jarl_down' }, ifFlags: ['fact:wo5_freed_all'], lines: [JOKUL('We kept the winter on the glacier once, where it belonged. Ask us what an oath without an end costs.')] },
      { id: 'wo6_dispersed', trigger: { type: 'flag', flag: 'wo_oath_dispersed' }, lines: [HERVOR('There. No claim, no king, no winter held under a mound. Whatever comes now comes honestly.'), SKEGGI('And the dead? Every draugr in the north just felt that.'), HERVOR('They are free. Let them decide what to do with it.')] },
      { id: 'wo6_rebound', trigger: { type: 'flag', flag: 'wo_oath_rebound' }, lines: [EYDIS('Bound again — to the settlements together, one winter at a time, and ended at their moot whenever they choose.'), HERVOR('And I keep the sword as its witness. Not its owner. Never again its owner.')] },
      { id: 'wo6_losses', trigger: { type: 'casualties', minLost: 16 }, lines: [EYDIS('So many, Hervor. When this is over I will cut every name into a stone of its own. A good rune, this time.')] },
    ],
    loss: ['Hervor must survive.', 'Losing Isafold is recoverable while Hervor has an army.', 'A settlement left without a guard loses only its support; both endings of the rite are always open.'],
    help: [
      { id: 'wo6_plateau', title: 'The Isafold highland', text: 'The inner plateau sits inside a mountain ring with three passes — west, north and east. An outer ring of moors and fells joins the settlements; the Old Burial Road, once unbarred, is a flanking route along the south. The Barrow Captain patrols the outer ring, not one corridor.' },
      { id: 'wo6_holds', title: 'Strongholds and reserves', text: 'Each oath-stronghold keeps a reserve on the plateau. Two broken strongholds open the barrow-doors; the reserve of the one still standing takes the field round the hall. A broken stronghold’s reserve never comes.' },
      { id: 'wo6_settlements', title: 'Exposed settlements', text: 'On the announced day the Jarl’s riders strike every settlement without a guard. A guard posted from Isafold — or allies from earlier chapters — keeps a settlement’s support.' },
    ],
  });

  return {
    missions: [m1, m2, m3, m4, m5, m6],
    chapters: [
      { missionId: m1.id, chapter: 1, requiresAll: [], legacyMissionIds: ['winter_oath_m01'], briefingArt: m1.briefingArt! },
      { missionId: m2.id, chapter: 2, requiresAll: [m1.id], legacyMissionIds: ['winter_oath_m02', 'winter_oath_m03'], briefingArt: m2.briefingArt! },
      { missionId: m3.id, chapter: 3, requiresAll: [m2.id], legacyMissionIds: ['winter_oath_m04'], briefingArt: m3.briefingArt! },
      { missionId: m4.id, chapter: 4, requiresAll: [m2.id], legacyMissionIds: ['winter_oath_m05'], briefingArt: m4.briefingArt! },
      { missionId: m5.id, chapter: 5, requiresAll: [m3.id, m4.id], legacyMissionIds: ['winter_oath_m06'], briefingArt: m5.briefingArt! },
      { missionId: m6.id, chapter: 6, requiresAll: [m5.id], legacyMissionIds: ['winter_oath_m07'], briefingArt: m6.briefingArt! },
    ],
    epilogue: {
      // Kaldvik's painting, where the campaign began (not a v1 ending picture): the v2 outcomes
      // (claim dispersed, or a small communal duty) do not match the v1 broken-sword / returned-sword scenes.
      art: 'mission.winter_oath.m01.briefing',
      lines: [
        EYDIS('The ice on the fjord broke this morning. The sledges are coming back down from the fells — the families from the west farms first, then Birkaby’s herders, then people I have never seen.'),
        SKEGGI('A barrow, a white pack, a ship of nails, a jarl, a glacier full of giants and a king’s oath. I will need a longer song.'),
      ],
      variants: [
        { flag: 'wo_oath_dispersed', lines: [HERVOR('No more oaths under mounds. The dead are free, and the winter will come and go as winters should.'), EYDIS('Some of the draugar came down to the hold last night. They only stood at the edge of the firelight, watching the boats. Then they walked away into the hills.'), HERVOR('Let them go. The settlements will keep each other now.')] },
        { flag: 'wo_oath_rebound', lines: [HERVOR('The oath is small now: the settlements keep each other through a hard winter, and their moot ends it when they choose. I only witness it.'), EYDIS('Then every spring I will count one more name at the moot: yours, coming home without a claim on anyone.')] },
      ],
    },
  };
}
