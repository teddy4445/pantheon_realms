/**
 * The Lantern Road, content v2 (campaign expansion handoff 2026-10-15; review
 * cards 21–26): six chapters carrying the seven legacy chapters.
 *
 *   1  The Unlit Lantern (legacy m01) — Kagaribi at a five-way forest junction:
 *      the shrine ridge (long path round the cliff, or the Shrine Stair once
 *      reset), the Bamboo Bridge to the far bank, the collector's ford (the short
 *      crossing) and the paddy/dike loop to hidden Yomogi.
 *   2  The Boar Lord and the Crow Monastery (legacy m02 + m03) — a figure eight:
 *      the two stairs and the Kumoyama ridge road above the terrace bench; the
 *      drowned dike (a sluice: the low shortcut) and the long forest contour
 *      round the spur through Mizuhara's basin. The Red Hall sits off it.
 *   3  The Spirit Sea (legacy m04) — four islands round a misty channel: quay and
 *      mist ferries, the northern causeway at the announced low tide, the eastern
 *      shoal and the long outer route; the Hall of Mirrors has two landings.
 *   4  The Iron Daimyo (legacy m05) — a withdrawal from the refuge valley to one
 *      of two safe camps (unowned towns); the castle ridge with a lower ring of
 *      foundry, barracks and rice store, a front gate, a steep postern road and
 *      the foundry's ore tunnel.
 *   5  The Kirin Meadow (legacy m06) — the meadow at the heart of a cedar forest,
 *      ridge and riverside circuits crossing at three clearings, two corridors
 *      into the sanctuary glen, the Sanctuary Stair back to Takamori.
 *   6  The Last Torii (legacy m07) — the living circuit and the spirit circuit on
 *      either bank of the River of Names, four fixed crossings (two bridges, two
 *      torii paths over the central island), the palace on the island.
 *
 * Order: 1 → 2 → {3, 4 in either order} → 5 → 6. The Spirit Sea and the Iron
 * Daimyo read each other's facts (`fact:<flag>`), so neither order names what has
 * not happened. The existing cast only (Akane, Shiro, Genzo, Yamikage, Kurogane,
 * Gonryō, Oboro, Kagerō); unnamed bands use creature portraits. Values are
 * proposed and unplaytested; economies come from each chapter's first legacy
 * mission, guards from the legacy chapters of the same position.
 */
import type { CommanderSpec, MissionDefinition, MissionTownSetup } from '@pr/rules';
import { speaker } from '../arc';
import { C, O, S, armyText, chapter, type Army, type V2Campaign } from './kit';
import type { V2Built } from './index';

const P = 'japanese';
const AKANE = speaker(P, 'Akane');
const SHIRO = speaker(P, 'Shiro');
const GENZO = speaker(P, 'Genzo');
const YAMIKAGE = speaker(P, 'Yamikage');

/** A band without a named commander (collectors, raiders, bound dead): its portrait is a creature's. */
function band(id: string, name: string, portrait: string): CommanderSpec {
  return { heroDefinitionId: id, name, classId: 'champion', level: 1, attributes: { attack: 0, defense: 0, power: 0, knowledge: 0 }, skills: [], spellbook: false, spellIds: [], mana: 0, portraitAssetId: portrait };
}
const RONIN_PORTRAIT = 'creature.neutral.brigand.upgraded.portrait';

export function buildLanternRoadV2(camp: V2Campaign): V2Built {
  // =========================================================================
  // Chapter 1 — The Unlit Lantern (card 21; legacy m01)
  // =========================================================================
  const fordGuard: Army = [['brigand', 14], ['brigand_cutthroat', 4]];
  const bridgeGuard: Army = [['wild_boar', 8]];
  const wagonGuard: Army = [['brigand', 8], ['brigand_cutthroat', 3]];
  const m1 = chapter({
    campaign: camp,
    chapter: 1,
    card: 21,
    name: 'The Unlit Lantern',
    summary:
      'On the festival night three lanterns around Kagaribi stayed dark — and not every one was put out by an enemy. Find out why each went dark, make two roads to the outer hamlets safe, and drive Kurogane’s collector from the ford he tolls.',
    playtime: '45–60 minutes, 3–4 battles',
    legacy: ['lantern_road_m01'],
    economyFrom: 'lantern_road_m01',
    principal: 'lr1_collector',
    soundscape: 'shrine',
    hostileName: 'Kurogane’s collectors',
    town: { siteId: 'lr1_town', townId: 'kagaribi', name: 'Kagaribi' },
    map: {
      cols: 30,
      rows: 18,
      biome: 'autumn',
      base: 'plains',
      seed: 950001,
      texture: { forest: 110, rough: 30 },
      paint: [
        // The shrine ridge above Kagaribi: a plateau behind a cliff; the long path climbs round its west end.
        { t: 'rough', rect: [1, 1, 11, 4] },
        { t: 'mountain', line: [[4, 5], [11, 5]], width: 0 },
        { t: 'mountain', line: [[11, 5], [12, 1]], width: 0 },
        { t: 'forest', cells: [[2, 2], [3, 1], [10, 2], [9, 1]] },
        // The river east of town, from the hills to the southern marshes.
        { t: 'water', line: [[21, 0], [20, 5], [21, 10], [20, 17]], width: 0 },
        // Bamboo woods on both banks in the north-east.
        { t: 'forest', blob: [16, 3, 2] },
        { t: 'forest', blob: [26, 3, 1] },
        // The rice paddies of Yomogi in the south.
        { t: 'marsh', cells: [[10, 13], [11, 14], [12, 13], [13, 13], [14, 14], [9, 14], [15, 12], [16, 15]] },
        // Woods west of town; hills on the far bank.
        { t: 'forest', blob: [5, 12, 2] },
        { t: 'rough', blob: [26, 13, 2] },
      ],
      roads: [
        // The long ridge path round the cliff's west end, and the Shrine Stair (the shortcut).
        { via: ['lr1_town', [8, 8], [3, 7], [2, 5], [4, 3], 'lr1_ridge_lantern'] },
        { via: ['lr1_town', 'lr1_carpenters'] },
        { via: ['lr1_carpenters', 'lr1_stair', 'lr1_ridge_lantern'] },
        // The woodland road over the Bamboo Bridge, and the far bank down to the ford.
        { via: ['lr1_town', [15, 6], 'lr1_bridge', 'lr1_takebayashi'] },
        { via: [[15, 6], 'lr1_workcamp'] },
        { via: ['lr1_takebayashi', [24, 6], [23, 9], [24, 12]] },
        { via: [[23, 9], 'lr1_great_lantern'] },
        // The short way: straight across the collector's ford.
        { via: ['lr1_town', 'lr1_ford', [23, 9]] },
        // The rice-road loop: the paddy road and the dike road through the wagon camp.
        { via: ['lr1_town', [11, 12], 'lr1_yomogi'] },
        { via: ['lr1_town', [15, 10], 'lr1_wagons', [15, 15], 'lr1_yomogi'] },
        { via: [[11, 12], 'lr1_yomogi_lantern'] },
        { via: ['lr1_yomogi', 'lr1_rice_store'] },
        // Spurs.
        { via: [[8, 8], 'lr1_teahouse'] },
        { via: [[3, 7], 'lr1_sawmill'] },
        { via: [[15, 10], 'lr1_kappa'] },
        { via: [[24, 12], 'lr1_quarry'] },
        { via: ['lr1_rice_store', 'lr1_shelter'] },
      ],
    },
    sites: [
      S.town('lr1_town', 'kagaribi', [11, 9], 'Kagaribi', 'Akane’s shrine-town at the five-way junction of the forest roads, famous for its festival lanterns.', [12, 9]),
      S.resource('lr1_sawmill', [3, 9], 'sawmill'),
      S.resource('lr1_quarry', [27, 15], 'quarry'),
      S.pickup('lr1_ridge_lantern', [7, 2], 'Ridge Shrine Lantern', 'The stone lantern of the shrine on the ridge above Kagaribi, dark since the festival night.', { flags: ['lr1_cause_eaten'], resources: { gold: 200 } }, { marker: 'evidence', objectiveIds: ['lr1_causes'] }),
      S.activation('lr1_carpenters', [9, 7], 'Shrine Carpenters’ Yard', 'Timber and stone for the broken Shrine Stair up the ridge.', { cost: { wood: 4, stone: 3 }, reward: { flags: ['lr1_stair_open'] }, confirm: 'Pay 4 Wood and 3 Stone to reset the Shrine Stair? It opens a short, safe climb from Kagaribi to the ridge shrine.', label: 'relay' }, null),
      S.shortcut('lr1_stair', [8, 5], 'Shrine Stair', 'The old stone stair straight up the cliff to the ridge shrine — its steps fallen since the spring rains.', ['lr1_stair_open']),
      S.crossing('lr1_bridge', [21, 4], 'Bamboo Bridge', 'The bridge to Takebayashi, on the far bank. Wild boars, maddened by the dark nights, hold it.', { label: 'Bridge boars', army: bridgeGuard, reward: { resources: { gold: 300, wood: 3, stone: 3 }, flags: ['lr1_cause_tied'] }, battlefield: 'coast_road' }, { marker: 'evidence', objectiveIds: ['lr1_causes'] }),
      S.pickup('lr1_takebayashi', [25, 4], 'Takebayashi', 'A bamboo-cutters’ hamlet on the far bank, cut off since the bridge was closed. Its headwoman keeps a list.', { flags: ['lr1_testimony'], questXp: 300 }, { marker: 'evidence' }),
      S.camp('lr1_workcamp', [16, 2], 'Woodland Work Camp', 'Hill slingers cut bamboo here for the river boats; they sell their slings to whoever keeps the road open.', 'hill_slinger', 3, 6),
      S.crossing('lr1_ford', [20, 9], 'Collector’s Ford', 'The shortest crossing east of Kagaribi, where Kurogane’s collector tolls rice and people with his straw-hat ronin.', { label: 'The collector and his straw-hat ronin', army: fordGuard, reward: { resources: { gold: 500 }, artifactIds: ['dragon_kabuto'], flags: ['lr1_collector_down'], questXp: 500 }, battlefield: 'coast_road', required: true }, { objectiveIds: ['lr1_collector'] }),
      S.activation('lr1_great_lantern', [27, 8], 'Great Lantern of the Pass', 'The stone lantern that lights the spirits’ road east over the pass, on the far bank — dark since the collector’s men drained its oil for their own lamps.', { cost: { gold: 300, wood: 2 }, reward: { questXp: 600, resources: { favor: 5 } }, confirm: 'Relight the Great Lantern of the Pass (300 Gold, 2 Wood)?' }, null),
      S.pickup('lr1_yomogi_lantern', [12, 14], 'Yomogi’s Dark Lantern', 'The village lantern of Yomogi at the head of its paddies — cold, its wick taken in, its paper folded neatly away.', { flags: ['lr1_cause_hidden'] }, { marker: 'evidence', objectiveIds: ['lr1_causes'] }),
      S.choice(
        'lr1_yomogi',
        [13, 16],
        'Yomogi Headman’s House',
        'The rice village of Yomogi, hidden in its paddies. Its lantern has been dark since before the festival.',
        'Yomogi’s lantern',
        'The headman pours tea with steady hands. “We put it out ourselves, priestess. A dark village is a village the collectors walk past.” He looks at the folded paper. “Light it for everyone, and the pilgrims and the rice buyers come back to our road — and so may the collectors. Or leave it dark, and let us mark a hidden path through the paddies for anyone who has to run. Your road, or our hiding place. We will live with either.”',
        [
          { label: 'Light Yomogi’s lantern for all to see', summary: 'Yomogi’s road is open to travellers again: +600 Gold now, and the lit road’s travel income (1,500 Gold) follows Akane to Mizuhara.', reward: { flags: ['lr1_lit_public'], resources: { gold: 600 } }, requiresFlags: ['lr1_cause_hidden'] },
          { label: 'Leave it dark; mark a hidden safe route', summary: 'Yomogi stays dark and marks a hidden path for refugees. Remembered: the villagers who use it will help Akane when the Iron Daimyo comes for her own refuge.', reward: { flags: ['lr1_hidden_route'], questXp: 300 }, requiresFlags: ['lr1_cause_hidden'] },
        ],
        { marker: 'pact', objectiveIds: ['lr1_choice'] },
      ),
      S.depot('lr1_rice_store', [10, 16], 'Yomogi Rice Store', 'Yomogi’s rice store at the edge of the paddies — the full harvest share is here only until the collectors reach it.', { resources: { gold: 300, wood: 2 } }),
      S.crossing('lr1_wagons', [17, 13], 'Collectors’ Wagon Camp', 'The collectors’ wagons drawn across the dike road to Yomogi. Their collection party sleeps here between rounds.', { label: 'Wagon camp ronin', army: wagonGuard, reward: { resources: { gold: 400 }, flags: ['lr1_rice_road_safe'] }, battlefield: 'open_field' }),
      S.choice(
        'lr1_teahouse',
        [6, 9],
        'Abandoned Tea House',
        'A roadside tea house whose keeper fled in the night.',
        'The Abandoned Tea House',
        'The kettle is still warm. The keeper left in such a hurry that the till is full — and four small foxes sit in a row on the veranda, as if waiting for someone to tell them where to go.',
        [
          { label: 'Take the till', summary: '+600 Gold and +4 Wood.', reward: { resources: { gold: 600, wood: 4 } } },
          { label: 'Ask the foxes to follow you', summary: '4 Kitsune join Akane’s retinue.', reward: { creatures: [{ creatureId: 'japanese_kitsune', count: 4 }] } },
        ],
      ),
      S.camp('lr1_kappa', [18, 7], 'Kappa Pool', 'River kappa who will serve anyone polite enough to bow first.', 'japanese_kappa', 2, 4),
      S.depot('lr1_shelter', [6, 15], 'Pilgrim’s Shelter', 'A shelter where pilgrims left offerings for the road.', { resources: { gold: 400, crystal: 1 } }),
    ],
    patrols: [
      {
        commander: band('lr1_collection', 'Collection Party', RONIN_PORTRAIT),
        monster: true,
        bounty: { gold: 300 },
        start: [16, 12],
        waypoints: [[15, 14], [12, 15], [15, 11], [16, 12]],
        army: [['brigand', 6], ['brigand_cutthroat', 2]],
        home: 'lr1_wagons',
        threshold: [3, 2],
        purpose: 'Makes the collectors’ announced round along the rice road toward Yomogi’s rice store. Taking the Collectors’ Wagon Camp on the dike road ends it.',
      },
    ],
    objectives: [
      O.primary(
        'lr1_links',
        'Two safe village links',
        `Make two of the three roads to the outer hamlets safe: the Bamboo Bridge to Takebayashi (${armyText(bridgeGuard)}), the Shrine Stair to the ridge (reset at the Shrine Carpenters’ Yard), or the dike road to Yomogi (the Collectors’ Wagon Camp, ${armyText(wagonGuard)}).`,
        C.atLeast(2, C.cleared('lr1_bridge'), C.flag('lr1_stair_open'), C.cleared('lr1_wagons')),
      ),
      O.primary(
        'lr1_causes',
        'Why the lanterns went dark',
        `Find the cause of each dark lantern: the Ridge Shrine lantern above Kagaribi, the Bamboo Bridge lantern (the bridge is held by ${armyText(bridgeGuard)}), and Yomogi’s lantern at the head of its paddies.`,
        C.all(C.flag('lr1_cause_eaten'), C.flag('lr1_cause_tied'), C.flag('lr1_cause_hidden')),
        { hint: 'Each cause is written in the journal as soon as it is found. Yomogi’s lantern may stay dark: finding out why is enough.' },
      ),
      O.primary(
        'lr1_collector',
        'The collector at the ford',
        `With the causes known and two roads safe, drive Kurogane’s collector and his straw-hat ronin (${armyText(fordGuard)}) from the ford — straight across from Kagaribi, or the long woodland way over the Bamboo Bridge and down the far bank.`,
        C.cleared('lr1_ford'),
        { markerSiteId: 'lr1_ford', requires: ['lr1_causes', 'lr1_links'], completesMission: true, hint: 'The woodland way passes Takebayashi, whose headwoman keeps the collectors’ list.' },
      ),
      O.optional('lr1_choice', 'Yomogi’s lantern', 'At the headman’s house in Yomogi, light the village lantern for all to see, or leave it dark and mark a hidden safe route.', C.any(C.flag('lr1_lit_public'), C.flag('lr1_hidden_route')), { markerSiteId: 'lr1_yomogi' }),
      O.optional('lr1_full_rice', 'Yomogi’s rice before the collectors', 'Reach Yomogi Rice Store before the collectors’ announced round: +400 Gold and +2 Wood more.', C.visited('lr1_rice_store'), { markerSiteId: 'lr1_rice_store', reward: { resources: { gold: 400, wood: 2 } } }),
      O.optional('lr1_listen', 'Takebayashi’s list', 'Cross the Bamboo Bridge and hear the headwoman of Takebayashi.', C.flag('lr1_testimony'), { markerSiteId: 'lr1_takebayashi' }),
      O.optional('lr1_retinue', 'Gather the fox retinue', 'Recruit at least 6 Kitsune in Kagaribi and teach at least 4 of them their tails (Nine-Tailed Kitsune).', C.all(C.counter('recruited:japanese_kitsune', 6), C.counter('trained:japanese_kitsune', 4))),
      O.optional('lr1_pass', 'The Great Lantern of the Pass', 'Cross to the far bank — over the Bamboo Bridge or the ford — and relight the great stone lantern on the pass road.', C.activated('lr1_great_lantern'), { markerSiteId: 'lr1_great_lantern' }),
      O.optional('lr1_tea', 'The abandoned tea house', 'Look in at the tea house on the west road.', C.visited('lr1_teahouse'), { markerSiteId: 'lr1_teahouse' }),
    ],
    timers: [
      {
        id: 'lr1_round',
        label: 'The collectors’ round to Yomogi',
        startWhen: C.all(),
        days: 6,
        metWhen: C.any(C.visited('lr1_rice_store'), C.defeated('lr1_collection'), C.cleared('lr1_wagons')),
        consequence: 'The collection party empties Yomogi’s rice store: it keeps only its base share (the 400 Gold and 2 Wood bonus is lost). Yomogi, its lantern and its choice are not touched.',
        announce: 'The collectors have nailed their round to Kagaribi’s gate: Yomogi’s rice store, six days from now.',
        onExpire: { flags: ['lr1_rice_taken'], failObjectives: ['lr1_full_rice'] },
      },
    ],
    evidence: [
      { id: 'lr1_ev_eaten', flag: 'lr1_cause_eaten', title: 'An eaten light', text: 'The Ridge Shrine lantern was not blown out: its oil was drunk and its wick chewed away. Something on the road eats light.', icon: 'evidence' },
      { id: 'lr1_ev_tied', flag: 'lr1_cause_tied', title: 'Boars on a rope', text: 'The Bamboo Bridge boars had been tied to the posts. The collectors closed the bridge so that Takebayashi could not run.', icon: 'evidence' },
      { id: 'lr1_ev_hidden', flag: 'lr1_cause_hidden', title: 'Put out on purpose', text: 'Yomogi put out its own lantern so that the collectors would pass it by in the dark.', icon: 'evidence' },
      { id: 'lr1_ev_list', flag: 'lr1_testimony', title: 'Takebayashi’s list', text: 'The headwoman of Takebayashi kept every name the collectors took, and the seal on their warrant: the iron mon of Kurogane, the Iron Daimyo.', icon: 'evidence' },
      { id: 'lr1_ev_public', flag: 'lr1_lit_public', title: 'Yomogi lit for all', text: 'Yomogi’s lantern burns for every traveller: the rice road pays again, and anyone can find it.', icon: 'branch' },
      { id: 'lr1_ev_route', flag: 'lr1_hidden_route', title: 'A hidden road', text: 'Yomogi stays dark and keeps a hidden path through its paddies for anyone who has to run.', icon: 'evacuation' },
      { id: 'lr1_ev_collector', flag: 'lr1_collector_down', title: 'The collector’s warrant', text: 'The collector carried a warrant under an iron mon — and a dragon helm stolen from the Kumoyama shrine.', icon: 'evidence' },
    ],
    carried: ['lr1_cause_eaten', 'lr1_testimony', 'lr1_lit_public', 'lr1_hidden_route', 'lr1_collector_down'],
    briefing: [
      SHIRO('Three lanterns stayed dark on the festival night, priestess: the ridge shrine’s, the one by the Bamboo Bridge, and Yomogi’s on the rice road. The dead came down the mountain and found nothing to follow.'),
      AKANE('Then someone put them out. I want to know who, and why, before I light anything.'),
      GENZO('Ask carefully. A collector with a warrant from the Iron Daimyo tolls the ford east of town and takes rice and young men for his master. A lit road guides the dead home, priestess. It guides an army just as well.'),
      SHIRO('And the dead are to wander because of one collector?'),
      AKANE('Neither. The three causes and two safe roads to the hamlets — then the ford. The straight way across is his; the woodland way over the Bamboo Bridge is longer, and the hamlets on it will talk.'),
    ],
    victory: [
      AKANE('The ford is open and the collector is running east with an empty warrant. Two of the lanterns burn again; Yomogi’s will burn when Yomogi says so.'),
      GENZO('His warrant names the Iron Daimyo. And the boars on the Bamboo Bridge came down from Mizuhara — they say its rice terraces are drowning.'),
    ],
    scenes: [
      { id: 'lr1_eaten', trigger: { type: 'site_visited', siteId: 'lr1_ridge_lantern' }, lines: [AKANE('The oil is gone — drunk, not spilled. The wick is chewed to nothing.'), YAMIKAGE('Little diviner. Light is a meal, and I am very hungry. Leave the lanterns to me.'), AKANE('Go hungry, then.')] },
      { id: 'lr1_tied', trigger: { type: 'site_cleared', siteId: 'lr1_bridge' }, lines: [GENZO('Those boars were tied to the bridge posts. Someone wanted Takebayashi shut in, not robbed.'), AKANE('Someone with a list of names.')] },
      { id: 'lr1_hidden', trigger: { type: 'site_visited', siteId: 'lr1_yomogi_lantern' }, lines: [SHIRO('They put it out themselves, priestess. The headman says a dark village is a village the collectors walk past.'), AKANE('Then whether it is lit again is theirs to say, not mine.')] },
      { id: 'lr1_list', trigger: { type: 'site_visited', siteId: 'lr1_takebayashi' }, lines: [GENZO('The headwoman kept every name the collectors took — and the seal on their warrant. An iron mon: Kurogane’s.'), SHIRO('Some of those names are dead already. They will be looking for their way home.')] },
      { id: 'lr1_stair', trigger: { type: 'flag', flag: 'lr1_stair_open' }, lines: [SHIRO('The carpenters have reset the Shrine Stair. The ridge is a short climb from town again.')] },
      { id: 'lr1_public', trigger: { type: 'flag', flag: 'lr1_lit_public' }, lines: [AKANE('Yomogi’s lantern is lit. Pilgrims and rice buyers will find the road again.'), GENZO('And so will anyone else. Let us make sure the collectors are gone before they do.')] },
      { id: 'lr1_route', trigger: { type: 'flag', flag: 'lr1_hidden_route' }, lines: [SHIRO('Yomogi stays dark. The headman’s sons are marking a path through the paddies that only a villager would see.'), AKANE('Remember it, Shiro. One day we may need a road nobody can find.')] },
      { id: 'lr1_rice_taken', trigger: { type: 'flag', flag: 'lr1_rice_taken' }, lines: [SHIRO('The collectors reached Yomogi’s rice store before us. It is thinner — but the village is still hidden, and still ours to ask.')] },
      { id: 'lr1_wagons', trigger: { type: 'site_cleared', siteId: 'lr1_wagons' }, lines: [GENZO('The wagon camp is ash. No more collections on the rice road.')] },
      { id: 'lr1_ford_battle', trigger: { type: 'battle_started', siteId: 'lr1_ford' }, lines: [GENZO('Straw hats across the ford. The collector is standing his ground.'), AKANE('Then his warrant ends at this river.')] },
      { id: 'lr1_kabuto', trigger: { type: 'site_cleared', siteId: 'lr1_ford' }, lines: [SHIRO('Their leader wore this — a dragon helm from the Kumoyama shrine treasury.'), AKANE('Stolen from a shrine and worn by a tax-taker. Whoever pays these men has been inside our shrines.')] },
      { id: 'lr1_losses', trigger: { type: 'casualties', minLost: 4 }, lines: [SHIRO('We lost foxes today, priestess. Foxes remember.'), AKANE('So do I. We will be more careful.')] },
    ],
    loss: ['Akane must survive (defeat, retreat or surrender ends the chapter).', 'Losing Kagaribi is recoverable while Akane has an army.', 'Yomogi’s lantern may stay dark: that never blocks the chapter.', 'A late arrival at Yomogi’s rice store costs only its bonus share.'],
    help: [
      { id: 'lr1_roads', title: 'Five roads from Kagaribi', text: 'The ridge path climbs round the cliff to the shrine (the Shrine Stair is the short way once reset); the woodland road crosses the Bamboo Bridge to Takebayashi and the far bank; the ford road is the short way east; the paddy road and the dike road make a loop to Yomogi.' },
      { id: 'lr1_round_help', title: 'The collectors’ round', text: 'One collection party walks the rice road toward Yomogi’s rice store on the announced day. Its arrival costs the store’s bonus share only. Taking the Collectors’ Wagon Camp ends it.' },
    ],
  });

  // =========================================================================
  // Chapter 2 — The Boar Lord and the Crow Monastery (card 22; legacy m02 + m03)
  // =========================================================================
  const boarLord = camp.v1('lantern_road_m02').hostileHeroes[0]?.commander;
  if (!boarLord) throw new Error('Lantern Road v2: the Boar Lord’s profile is missing from the legacy content');
  const gateGuard: Army = [['brigand', 16], ['brigand_cutthroat', 6]];
  const westStairGuard: Army = [['brigand', 16], ['brigand_cutthroat', 6]];
  const eastStairGuard: Army = [['brigand_cutthroat', 12], ['tusked_boar', 4]];
  const hallGuard: Army = [['japanese_tengu', 4], ['japanese_great_tengu', 1]];
  const wallowGuard: Army = [['tusked_boar', 4], ['wild_boar', 6]];
  const boarArmy: Army = [['tusked_boar', 6], ['wild_boar', 12]];
  const redHallGuard: Army = [['clay_golem', 6], ['bronze_golem', 1]];
  const m2 = chapter({
    campaign: camp,
    chapter: 2,
    card: 22,
    name: 'The Boar Lord and the Crow Monastery',
    summary:
      'Mizuhara’s rice terraces are drowning, the flood drives the Boar Lord into the villages, and the Crow Monastery on the Kumoyama ridge keeps silent the bell that guides lost spirits. Restore safe water, end the Boar Lord’s threat and earn or seize access to the bell.',
    playtime: '65–85 minutes, 4–5 battles',
    legacy: ['lantern_road_m02', 'lantern_road_m03'],
    economyFrom: 'lantern_road_m02',
    principal: 'lr2_bell',
    soundscape: 'shrine',
    hostileName: 'Kurogane’s ronin',
    town: { siteId: 'lr2_town', townId: 'mizuhara', name: 'Mizuhara' },
    map: {
      cols: 34,
      rows: 21,
      biome: 'autumn',
      base: 'plains',
      seed: 950002,
      texture: { forest: 60, rough: 40 },
      paint: [
        // The Kumoyama ridge in the north-west, behind a cliff with two stair gaps.
        { t: 'rough', rect: [1, 1, 15, 6] },
        { t: 'mountain', line: [[1, 7], [16, 7]], width: 0 },
        { t: 'mountain', line: [[16, 7], [17, 1]], width: 0 },
        // The flooded lower terraces in the south-west; the old dike across them is the low shortcut.
        { t: 'water', rect: [1, 11, 13, 16] },
        { t: 'water', blob: [8, 14, 3] },
        // A long spur parts the terrace bench from Mizuhara's basin (the forest contour goes round its east end).
        { t: 'mountain', line: [[14, 11], [18, 9], [22, 10], [30, 10]], width: 0 },
        { t: 'mountain', cells: [[14, 12], [14, 10]] },
        { t: 'marsh', line: [[4, 11], [14, 16]], width: 0 },
        // The mist forest in the north-east, with a clearing.
        { t: 'forest', rect: [18, 1, 32, 6] },
        { t: 'forest', rect: [22, 7, 32, 9] },
        { t: 'rough', cells: [[31, 10], [32, 10], [31, 11]] },
        { t: 'plains', blob: [22, 3, 1] },
        // The red hills of the Red Hall in the south-west; stepped terraces on the bench.
        { t: 'rough', blob: [4, 18, 2] },
        { t: 'marsh', cells: [[3, 9], [6, 9], [9, 10], [12, 9]] },
      ],
      roads: [
        // The low shortcut: Mizuhara — the Water Gate — the dike — the bench under the West Stair.
        { via: ['lr2_town', 'lr2_gate'] },
        { via: ['lr2_gate', [14, 16], [4, 11], [4, 9]] },
        // The upper circuit: the two stair roads and the Kumoyama ridge road.
        { via: [[4, 9], 'lr2_west_stair'] },
        { via: [[4, 9], [10, 9], 'lr2_east_stair'] },
        { via: ['lr2_west_stair', [6, 5], [11, 5], 'lr2_east_stair'] },
        { via: [[6, 5], 'lr2_crow_hall'] },
        { via: [[11, 5], 'lr2_abbot'] },
        { via: [[11, 5], [9, 4], 'lr2_bell_site'] },
        { via: [[6, 5], 'lr2_storehouse'] },
        { via: [[10, 9], 'lr2_abbot_stair', [9, 5]] },
        // The long forest contour: round the spur's east end and back west through the mist forest.
        { via: ['lr2_town', [28, 14], [31, 10], [29, 6], [22, 7], [17, 8], [10, 9]] },
        { via: [[29, 6], 'lr2_wallow'] },
        { via: [[22, 7], 'lr2_baku'] },
        // The basin.
        { via: ['lr2_town', 'lr2_pagoda'] },
        { via: ['lr2_pagoda', 'lr2_river_lantern'] },
        { via: ['lr2_town', 'lr2_kappa'] },
        { via: ['lr2_gate', [12, 18], 'lr2_red_hall'] },
        { via: [[12, 18], 'lr2_quarry'] },
        { via: [[28, 14], 'lr2_clogmaker'] },
        { via: ['lr2_town', 'lr2_sawmill'] },
      ],
    },
    sites: [
      S.town('lr2_town', 'mizuhara', [21, 16], 'Mizuhara', 'A village of rice terraces in the low basin, its upper fields under water.', [21, 15]),
      S.resource('lr2_sawmill', [27, 17], 'sawmill'),
      S.resource('lr2_quarry', [10, 18], 'quarry'),
      S.resource('lr2_crystal', [30, 17], 'crystal_deposit'),
      S.sluice(
        'lr2_gate',
        [15, 17],
        'Terrace Water Gate',
        'The water gate at the foot of the terraces. Kurogane’s ronin jammed it shut, and the river backed up over the lower fields and the old dike.',
        {
          channel: [[4, 11], [5, 11], [6, 12], [7, 12], [7, 13], [8, 13], [9, 13], [10, 14], [11, 14], [11, 15], [12, 15], [13, 16], [14, 16]],
          open: 'marsh',
          closed: 'water',
          startsOpen: false,
          openText: 'Open the water gate: the river runs back into its old channel, the lower terraces drain and the dike across them can be walked again (the low shortcut to the West Stair). The forest contour and the upper circuit stay open either way.',
          closeText: 'Close the water gate: the river backs up over the lower terraces and the dike goes under water. The forest contour and the upper circuit stay open.',
          openFlag: 'lr2_water_flowing',
        },
        { guard: { label: 'Water-gate ronin', army: gateGuard.map(([creatureId, count]) => ({ creatureId, count })), reward: { resources: { gold: 600, favor: 3 } }, battlefield: 'coast_road' }, objectiveIds: ['lr2_water'], marker: 'supply' },
      ),
      S.watchtower('lr2_pagoda', [18, 14], 'Pagoda of Five Roofs', 'From its top roof the whole basin lies open — the trampled rings in the fields, the mist forest, and the red hills beyond the flood.', ['lr2_wallow', 'lr2_red_hall', 'lr2_crow_hall']),
      S.camp('lr2_kappa', [16, 13], 'Reed Pool', 'Kappa who have not fled the boars. They serve anyone polite enough to bow first.', 'japanese_kappa', 2, 4),
      S.activation('lr2_river_lantern', [14, 14], 'River Lantern', 'The lantern of the mountain road, standing in the shallows where the flood meets the basin.', { cost: { gold: 200 }, reward: { questXp: 400, resources: { favor: 5 } }, requirements: [{ type: 'mission_flag', flag: 'lr2_water_restored' }], confirm: 'Relight the River Lantern (200 Gold)?' }, null),
      S.choice(
        'lr2_clogmaker',
        [26, 12],
        'Clog-maker’s Workshop',
        'A clog-maker who once made shoes for a tengu.',
        'The Clog-maker',
        '“A tengu came to me once for shoes,” the old man says. “He paid in feathers. I kept one pair for myself — one tooth, very tall. Walk in them and the road is shorter.” He sets them on the bench. “Or sit, and I will tell you what the tengu told me about boars.”',
        [
          { label: 'Buy the tengu clogs', summary: 'Pay 2,000 Gold for the Tengu Geta.', cost: { gold: 2000 }, reward: { artifactIds: ['tengu_geta'] } },
          { label: 'Sit and listen', summary: 'Akane gains +1 Knowledge.', reward: { attributes: { knowledge: 1 } } },
        ],
      ),
      // The Kumoyama ridge and the Crow Monastery.
      S.crossing('lr2_west_stair', [3, 7], 'West Stair (the Mountain Road)', 'The pilgrims’ stair up the west end of the cliff, held by ronin.', { label: 'Mountain-road ronin', army: westStairGuard, reward: { resources: { gold: 750, favor: 5 }, flags: ['lr2_on_ridge'] }, battlefield: 'ridge_pass' }),
      S.crossing('lr2_east_stair', [13, 7], 'East Stair (the Rope Bridge)', 'A rope bridge over the gorge where the east stair climbs the cliff, held by ronin and their boars.', { label: 'Gorge ronin', army: eastStairGuard, reward: { resources: { gold: 800 }, flags: ['lr2_on_ridge'] }, battlefield: 'ridge_pass' }),
      S.shortcut('lr2_abbot_stair', [9, 7], 'Abbot’s Stair', 'The monks’ own stair straight down the cliff to the terrace bench. Barred from above while the bell is silent.', ['lr2_bell_access']),
      S.landmark('lr2_crow_hall', [7, 3], 'Crow Hall', 'The tengu monks’ hall, where the bell’s covenant hangs on the wall. The monks fight only those who walk into their grounds.', 'refuge', { label: 'Crow Hall monks', army: hallGuard, reward: { resources: { gold: 1000 }, flags: ['lr2_bell_access', 'lr2_bell_seized', 'lr2_contract'], entitlementIds: ['covenant.japanese_tengu.lantern_road3'] }, battlefield: 'grove', required: true }, { objectiveIds: ['lr2_bell'] }),
      S.choice(
        'lr2_abbot',
        [10, 4],
        'The Abbot’s Gate',
        'The tengu abbot sits on the monastery gate, long-nosed and patient.',
        'The Tengu Abbot',
        '“Our bell guides the lost,” the abbot says, “and the road below us drowned. Why ring for spirits who would only find a flood?” His monks argue behind him: some want the road reopened, some want it closed for good. “Bring the water back to Mizuhara’s terraces and lay an offering at this gate, and the bell is yours — and so are we. Or climb to the Crow Hall and take it from my monks. They have been bored since the bell stopped.”',
        [
          {
            label: 'Offer restored water and gifts',
            summary: 'Only once the Terrace Water Gate is open. Costs 1,000 Gold and 5 Wood. The monks of the Crow Hall stand down; the abbot hands Genzo his copy of Kurogane’s contract with the Red Hall; the tengu covenant is Akane’s (a Tengu monastery may be built), and tengu fly with her in a later chapter (4 Great Tengu in the Kirin Meadow).',
            cost: { gold: 1000, wood: 5 },
            reward: { flags: ['lr2_bell_access', 'lr2_tengu_pact', 'lr2_contract'], entitlementIds: ['covenant.japanese_tengu.lantern_road3'], questXp: 500 },
            requiresFlags: ['lr2_water_restored'],
            clearsSiteIds: ['lr2_crow_hall'],
          },
        ],
        { marker: 'pact' },
      ),
      S.activation('lr2_bell_site', [9, 2], 'The Crow Bell', 'The monastery bell that wakes the mountain road and guides the lost spirits home.', { cost: { gold: 300 }, reward: { questXp: 1200 }, requirements: [{ type: 'objective_completed', objectiveId: 'lr2_water' }, { type: 'objective_completed', objectiveId: 'lr2_boar' }, { type: 'objective_completed', objectiveId: 'lr2_bell' }], completesMission: true, confirm: 'Ring the Crow Bell (300 Gold)? This completes The Boar Lord and the Crow Monastery.' }, null, { objectiveIds: ['lr2_ring'] }),
      S.depot('lr2_storehouse', [2, 2], 'Pilgrims’ Storehouse', 'Rice and silver left by pilgrims who turned back at the ridge.', { resources: { gold: 700, wood: 5 }, artifactIds: ['omamori_charm'] }),
      // The mist forest and the basin's edges.
      S.landmark('lr2_wallow', [28, 4], 'Boar Wallow', 'A muddy hollow under the cedars where the Boar Lord’s herd sleeps — and something bright lies trampled in the mud.', 'grove', { label: 'Wallow boars', army: wallowGuard, reward: { resources: { gold: 500 }, artifactIds: ['magatama_string'] }, battlefield: 'grove' }, { markerHiddenUntilRevealed: true }),
      S.neutral('lr2_baku', [22, 3], 'Baku Shrine in the Mist', 'A moss-grown shrine in a misty clearing. Baku come at dusk to eat the nightmares villagers leave there on paper slips.', 'baku', 5),
      S.camp('lr2_red_hall', [4, 18], 'The Red Hall', 'An old hall in the red hills where oni drink and sleep. Haniwa — clay tomb-figures — stand at its doors like jailers, an iron mon stamped on each.', 'japanese_oni', 1, 2, { guard: { label: 'Haniwa jailers', army: redHallGuard.map(([creatureId, count]) => ({ creatureId, count })), reward: { resources: { gold: 800, favor: 5 }, artifactIds: ['bronze_buckler'], flags: ['lr2_oni_freed'] }, battlefield: 'ridge_pass' }, markerHiddenUntilRevealed: true }),
    ],
    patrols: [
      {
        commander: boarLord,
        monster: true,
        bounty: { gold: 800 },
        start: [26, 16],
        waypoints: [[18, 17], [24, 18], [29, 13], [31, 11], [27, 15]],
        army: boarArmy,
        home: 'lr2_wallow',
        threshold: [3, 2],
        purpose: 'Driven out of the drowned terraces, it runs the same circuit round Mizuhara’s basin every few days (the Pagoda of Five Roofs shows it). It charges only an army it is sure to beat. Taking its wallow in the mist forest drives it off for good.',
      },
      {
        commander: band('lr2_crow_monks', 'Crow Monks', 'creature.japanese.tier3.base.portrait'),
        monster: true,
        bounty: { gold: 300 },
        start: [8, 4],
        waypoints: [[6, 4], [10, 5], [8, 4]],
        army: [['japanese_tengu', 3]],
        home: 'lr2_crow_hall',
        radius: 3,
        dormantUntil: 'lr2_on_ridge',
        threshold: [11, 10],
        purpose: 'The monastery’s wardens stay inside their grounds on the ridge and stir only once intruders climb a stair; they never go down to the villages. If the abbot is satisfied, or the Crow Hall is taken, they withdraw.',
      },
    ],
    objectives: [
      O.primary(
        'lr2_water',
        'Safe water through the terraces',
        `Take the Terrace Water Gate from Kurogane’s ronin (${armyText(gateGuard)}) and open it: the river returns to its old channel and the drowned dike across the lower terraces becomes the low shortcut to the West Stair.`,
        C.flag('lr2_water_flowing'),
        { markerSiteId: 'lr2_gate', reward: { flags: ['lr2_water_restored'] }, hint: 'The gate can be closed again; the terraces stay restored once it has been opened. Neither position ever cuts off the forest contour or the stair roads.' },
      ),
      O.primary(
        'lr2_boar',
        'The Boar Lord',
        `End the Boar Lord’s threat: beat it and its herd (${armyText(boarArmy)}) on its circuit round the basin, or take its wallow in the mist forest (${armyText(wallowGuard)}) and drive it off for good.`,
        C.any(C.defeated('japanese_boar_lord'), C.cleared('lr2_wallow')),
        { reward: { flags: ['lr2_boar_resolved'] }, hint: 'Climb the Pagoda of Five Roofs to see its circuit. It charges only an army it is sure to beat.' },
      ),
      O.primary(
        'lr2_bell',
        'Access to the monastery bell',
        `Climb to Kumoyama by the West Stair (${armyText(westStairGuard)}) or the East Stair (${armyText(eastStairGuard)}), then earn the bell from the tengu abbot — restored water and offerings — or seize it from the monks of the Crow Hall (${armyText(hallGuard)}).`,
        C.all(C.any(C.cleared('lr2_west_stair'), C.cleared('lr2_east_stair')), C.flag('lr2_bell_access')),
        { markerSiteId: 'lr2_crow_hall', hint: 'Seizing the hall is faster and exposes Kurogane’s contract at once; the abbot’s way needs the water back first, and the tengu remember it.' },
      ),
      O.primary('lr2_ring', 'Ring the Crow Bell', 'With the water restored, the Boar Lord’s threat ended and the bell in reach, ring the Crow Bell above the monastery.', C.activated('lr2_bell_site'), { markerSiteId: 'lr2_bell_site', requires: ['lr2_water', 'lr2_boar', 'lr2_bell'] }),
      O.optional('lr2_red', 'The Red Hall', `Break the haniwa jailers (${armyText(redHallGuard)}) at the Red Hall in the hills beyond the flood: the red oni there are freed, and will serve whoever freed them.`, C.cleared('lr2_red_hall'), { markerSiteId: 'lr2_red_hall' }),
      O.optional('lr2_lantern', 'The River Lantern', 'Once the water is back in its channel, relight the River Lantern in the shallows.', C.activated('lr2_river_lantern'), { markerSiteId: 'lr2_river_lantern' }),
      O.optional('lr2_lookout', 'Climb the pagoda', 'Climb the Pagoda of Five Roofs beside Mizuhara.', C.visited('lr2_pagoda'), { markerSiteId: 'lr2_pagoda' }),
      O.optional('lr2_clogs', 'The clog-maker', 'Visit the clog-maker’s workshop on the contour road.', C.visited('lr2_clogmaker'), { markerSiteId: 'lr2_clogmaker' }),
    ],
    evidence: [
      { id: 'lr2_ev_water', flag: 'lr2_water_restored', title: 'Water in the old channel', text: 'The Terrace Water Gate is open again. Mizuhara’s lower fields are draining; the dike can be walked.', icon: 'supply' },
      { id: 'lr2_ev_contract', flag: 'lr2_contract', title: 'Kurogane’s contract with the Red Hall', text: 'Kurogane bought the oni of the Red Hall for his foundries and paid by jamming Mizuhara’s water gate: drowned terraces send farmers to his labour camps. It is witnessed with a lantern burned through the middle.', icon: 'evidence' },
      { id: 'lr2_ev_pact', flag: 'lr2_tengu_pact', title: 'The tengu’s word', text: 'The abbot accepted the restored water and Akane’s offering. The tengu of Kumoyama will fly with her when she asks.', icon: 'pact' },
      { id: 'lr2_ev_seized', flag: 'lr2_bell_seized', title: 'The bell taken', text: 'Akane took the bell from the monks of the Crow Hall by force. The contract was on the wall, and the tengu will not forget the fight.', icon: 'branch' },
      { id: 'lr2_ev_oni', flag: 'lr2_oni_freed', title: 'The red oni freed', text: 'The haniwa of the Red Hall are broken. The oni Kurogane bought are free — and they remember who broke the clay.', icon: 'evacuation' },
      { id: 'lr2_ev_boar', flag: 'lr2_boar_resolved', title: 'The Boar Lord’s circuit ended', text: 'The Boar Lord no longer runs Mizuhara’s basin.', icon: 'evidence' },
    ],
    carried: ['lr2_contract', 'lr2_tengu_pact', 'lr2_bell_seized', 'lr2_oni_freed', 'lr2_water_restored'],
    entryBonuses: [{ fact: 'lr1_lit_public', label: 'Yomogi’s lit road: travel income (1,500 Gold)', wallet: { gold: 1500 } }],
    briefing: [
      GENZO('Mizuhara’s terraces are under water from the dike to the hills. The boars came down out of the flood, and the biggest of them — a boar as big as an ox — runs the basin with a herd at its back.'),
      SHIRO('And above us the Crow Monastery has stopped ringing. That bell guided the lost on this road long before there were lanterns.'),
      AKANE('A flood that nobody drains, a bell that nobody rings. Someone is closing this road on purpose. Water first, then the boar, then the bell — the monks will want a reason to ring it again.'),
      GENZO('Two stairs climb the ridge, and the old forest contour goes round the long way. The flooded dike was the short one.'),
    ],
    briefingVariants: [
      { ifFlags: ['fact:lr1_testimony'], lines: [GENZO('Takebayashi’s list had Mizuhara names on it too — whole families the collectors took after the flood. Under the same iron mon.')] },
      { ifFlags: ['fact:lr1_lit_public'], lines: [SHIRO('Yomogi’s lantern brought the rice buyers back to the road. Some of their silver came up with us.')] },
      { ifFlags: ['fact:lr1_hidden_route'], lines: [SHIRO('Yomogi sent a boy with us who knows the paddy paths. He says Mizuhara’s farmers hide the same way.')] },
    ],
    victory: [
      AKANE('The bell rings, the terraces drain, and the road down the mountain is lit again.'),
      GENZO('And Kurogane’s contract is in my box. He drowned these fields for labourers and bought oni for his foundries. The Iron Castle is two valleys north.'),
      SHIRO('The bell carried to the sea as well. The fishers say a fleet sails in the fog off Shiogama with no lamps lit — and its passengers are the dead.'),
    ],
    scenes: [
      { id: 'lr2_pagoda', trigger: { type: 'site_visited', siteId: 'lr2_pagoda' }, lines: [AKANE('There — the fields are trampled in a ring round the basin, the same path again and again. It is not feeding. It is running a circuit.'), SHIRO('And its wallow is in the mist forest. Boars always go home to sleep.')] },
      { id: 'lr2_gate_taken', trigger: { type: 'site_cleared', siteId: 'lr2_gate' }, lines: [GENZO('The gate was jammed with iron wedges, priestess — someone wanted these terraces drowned.'), AKANE('Then open it.')] },
      { id: 'lr2_water', trigger: { type: 'flag', flag: 'lr2_water_restored' }, lines: [SHIRO('The water is going back into the old channel. The dike is coming up out of the flood — we can walk it to the West Stair.')] },
      { id: 'lr2_abbot_dry', trigger: { type: 'site_visited', siteId: 'lr2_abbot' }, unlessFlags: ['lr2_water_restored'], lines: [AKANE('He will not ring for a drowned road. Open the water gate, and he will hear an offering.'), GENZO('Or the monks can be beaten. Quicker — and the tengu will remember it.')] },
      { id: 'lr2_contract', trigger: { type: 'flag', flag: 'lr2_contract' }, lines: [GENZO('A contract, priestess. Kurogane buys the oni of the Red Hall for his foundries — and pays for them by jamming Mizuhara’s water gate. Drowned farmers go to his labour camps.'), AKANE('And the witness’s mark is a lantern burned through the middle. The same mouth that ate the ridge lantern.')] },
      { id: 'lr2_pact', trigger: { type: 'flag', flag: 'lr2_tengu_pact' }, lines: [SHIRO('The abbot accepted. The monks who wanted the road closed are grumbling — but they are stringing the bell rope.')] },
      { id: 'lr2_seized', trigger: { type: 'site_cleared', siteId: 'lr2_crow_hall' }, ifFlags: ['lr2_bell_seized'], lines: [GENZO('The paper on the wall — the bell covenant, and under it Kurogane’s contract with the Red Hall.'), AKANE('We have the bell and the proof. The tengu will not thank us for how.')] },
      { id: 'lr2_ridge', trigger: { type: 'flag', flag: 'lr2_on_ridge' }, lines: [SHIRO('We are on the ridge. The monks are watching from the hall — they come out only for those who walk into their grounds.')] },
      { id: 'lr2_boar_battle', trigger: { type: 'battle_started', heroDefinitionId: 'japanese_boar_lord' }, lines: [YAMIKAGE('Trample her, great one. Trample her into the mud with the rice.')] },
      { id: 'lr2_boar_done', trigger: { type: 'objective_completed', objectiveId: 'lr2_boar' }, lines: [GENZO('The Boar Lord is gone from the basin. The herd is scattering into the cedars.'), AKANE('Let them go. Without their lord they are only pigs.')] },
      { id: 'lr2_oni', trigger: { type: 'site_cleared', siteId: 'lr2_red_hall' }, lines: [SHIRO('The oni are awake and very thirsty. They say they will remember who broke the clay.'), GENZO('Every haniwa carries Kurogane’s iron mon. He meant to march these oni into his foundries in chains.')] },
      { id: 'lr2_rung', trigger: { type: 'objective_completed', objectiveId: 'lr2_ring' }, lines: [AKANE('Listen — the lost ones on the ridge road are turning toward it.')] },
    ],
    loss: ['Akane must survive.', 'Losing Mizuhara is recoverable while Akane has an army.', 'The water gate never strands an army: it cannot be closed on anyone standing on the dike.'],
    help: [
      { id: 'lr2_eight', title: 'A figure eight', text: 'The West and East Stairs and the Kumoyama ridge road make the upper circuit above the terrace bench. The dike across the flooded terraces (the low shortcut, under water until the Water Gate is opened) and the long forest contour round the spur make the lower one through Mizuhara.' },
      { id: 'lr2_bell_help', title: 'Earn or seize the bell', text: 'The abbot gives the bell for restored water and an offering (the tengu stand by Akane later). Seizing it at the Crow Hall is faster and exposes Kurogane’s contract at once. Either way Genzo gets the contract.' },
    ],
  });

  // =========================================================================
  // Chapter 3 — The Spirit Sea (card 23; legacy m04)
  // =========================================================================
  const gonryo = camp.v1('lantern_road_m04').hostileHeroes[0]?.commander;
  if (!gonryo) throw new Error('Lantern Road v2: Gonryō’s profile is missing from the legacy content');
  const quayGuard: Army = [['brigand', 28], ['brigand_cutthroat', 10]];
  const shoalGuard: Army = [['brigand_cutthroat', 14], ['japanese_kappa', 8]];
  const anchorageGuard: Army = [['brigand', 20], ['brigand_cutthroat', 8]];
  const depotGuard: Army = [['brigand', 22], ['brigand_cutthroat', 10]];
  const weaverGuard: Army = [['japanese_jorogumo', 4], ['japanese_queen_jorogumo', 2]];
  const flagshipGuard: Army = [['japanese_nine_tailed_kitsune', 24], ['japanese_river_elder_kappa', 8], ['japanese_jorogumo', 2]];
  const raiderArmy: Army = [['brigand', 14], ['brigand_cutthroat', 6]];
  const m3 = chapter({
    campaign: camp,
    chapter: 3,
    card: 23,
    name: 'The Spirit Sea',
    summary:
      'Gonryō’s fog fleet ferries the dead in circles off Shiogama, stripping their memories to pay for the passage. Recover two passenger registers, free a ferry route, bring the freed fleet to the Hall of Mirrors — and meet Gonryō when he comes ashore.',
    playtime: '65–85 minutes, 4–6 battles',
    legacy: ['lantern_road_m04'],
    economyFrom: 'lantern_road_m04',
    principal: 'lr3_mirrors',
    soundscape: 'shrine',
    hostileName: 'The Fog Fleet',
    town: { siteId: 'lr3_town', townId: 'shiogama', name: 'Shiogama' },
    map: {
      cols: 34,
      rows: 22,
      biome: 'coast',
      base: 'water',
      seed: 950003,
      texture: { forest: 50, rough: 40 },
      paint: [
        // The mainland: Shiogama's shore in the south and the long western strand.
        { t: 'plains', rect: [1, 17, 32, 20] },
        { t: 'plains', rect: [1, 1, 4, 20] },
        // Four islands round the misty central channel.
        { t: 'plains', blob: [9, 9, 2] },
        { t: 'forest', disc: [9, 9, 1] },
        { t: 'plains', rect: [14, 2, 20, 4] },
        { t: 'plains', blob: [17, 3, 2] },
        { t: 'plains', rect: [24, 4, 31, 11] },
        { t: 'plains', blob: [27, 7, 4] },
        { t: 'plains', blob: [16, 13, 2] },
        // The northern causeway (mainland — Anchorage Isle — Mirror Isle) and the eastern shoal.
        { t: 'marsh', line: [[4, 2], [14, 3]], width: 0 },
        { t: 'marsh', line: [[20, 3], [24, 4]], width: 0 },
        { t: 'marsh', line: [[28, 17], [28, 12]], width: 0 },
        // The West Landing's spit, where a flagship can put a guard ashore.
        { t: 'water', cells: [[24, 10], [23, 11], [22, 7], [23, 7], [22, 9], [23, 9]] },
        { t: 'plains', cells: [[22, 8], [23, 8]] },
        { t: 'rough', cells: [[29, 5], [30, 5], [31, 6]] },
      ],
      roads: [
        // Shiogama's shore road, west to the Outer Dock and the strand, east to the shoal.
        { via: ['lr3_town', 'lr3_quay'] },
        { via: ['lr3_quay', 'lr3_quay_slip'] },
        { via: ['lr3_town', 'lr3_registry'] },
        { via: ['lr3_town', [5, 18], 'lr3_dockmaster'] },
        { via: [[5, 18], 'lr3_outer_slip'] },
        { via: [[5, 18], 'lr3_dock'] },
        { via: [[5, 18], 'lr3_crews'] },
        { via: ['lr3_quay', [24, 18], [28, 17], 'lr3_shoal', [28, 11], 'lr3_hall'] },
        { via: [[24, 18], 'lr3_salt_boat'] },
        { via: [[28, 17], 'lr3_grotto'] },
        // The western strand north to the causeway, with the cedar-isle slip.
        { via: [[5, 18], [3, 12], [3, 5], 'lr3_causeway', [12, 3], 'lr3_anchorage'] },
        { via: [[3, 12], 'lr3_west_slip'] },
        { via: [[3, 12], 'lr3_monk'] },
        { via: [[3, 5], 'lr3_sawmill'] },
        // Anchorage Isle and the causeway's second leg to the Mirror Isle.
        { via: ['lr3_anchorage', [18, 3], 'lr3_north_bell'] },
        { via: [[18, 3], [25, 4], [27, 5], 'lr3_hall'] },
        { via: [[27, 5], 'lr3_depot'] },
        { via: ['lr3_hall', 'lr3_far_slip'] },
        { via: ['lr3_hall', [25, 8], 'lr3_hall_slip'] },
        { via: [[25, 8], 'lr3_mist_bank', 'lr3_flagship'] },
        // The Wreck Isle.
        { via: ['lr3_wreck_south', 'lr3_ship'] },
        { via: ['lr3_ship', 'lr3_south_bell'] },
        { via: ['lr3_south_bell', 'lr3_wreck_north'] },
        // The Cedar Isle.
        { via: ['lr3_cedar_slip', 'lr3_baku'] },
      ],
    },
    sites: [
      S.town('lr3_town', 'shiogama', [9, 18], 'Shiogama', 'A salt-makers’ harbour on the Spirit Sea, its boats drawn up on the beach since the fog came.', [9, 17]),
      S.resource('lr3_sawmill', [2, 5], 'sawmill'),
      S.resource('lr3_quarry', [21, 19], 'quarry'),
      // The ferry routes.
      S.landmark('lr3_quay', [13, 18], 'Shiogama Quay', 'The ferry quay of Shiogama, held by fog-fleet raiders who sell passage to the dead.', 'refuge', { label: 'Fog-fleet raiders', army: quayGuard, reward: { resources: { gold: 800, favor: 3 }, flags: ['lr3_ferry_free'] }, battlefield: 'coast_road' }, { marker: 'supply' }),
      S.ferry('lr3_quay_slip', [14, 17], 'Quay Ferry', 'The short ferry hop from Shiogama to the Wreck Isle.', 'lr3_wreck_south', { flag: 'lr3_ferry_free', reason: 'The fog-fleet raiders hold Shiogama Quay: take the quay first' }),
      S.ferry('lr3_wreck_south', [15, 15], 'Wreck Isle Slip', 'The Wreck Isle’s slip facing Shiogama.', 'lr3_quay_slip', { flag: 'lr3_ferry_free', reason: 'The fog-fleet raiders hold Shiogama Quay: take the quay first' }),
      S.choice('lr3_dockmaster', [2, 17], 'Outer Dock', 'The outer dock west of town, where the long-haul boat crews wait out the fog.', 'The boat crews', 'The crews have boats, oars and no wish to sail into the fog for nothing. “Pay us for a season,” says their master, “and we will take you the long way — round the outside of all four islands to the far side of the Mirror Isle, where Gonryō never looks.”', [
        { label: 'Hire the crews for the long outer route', summary: 'Costs 1,200 Gold. The crews’ toughs on the dock stand aside, and the outer sailing route runs from the Outer Dock Slip to the far side of the Mirror Isle for the rest of the chapter.', cost: { gold: 1200 }, reward: { flags: ['lr3_crews_hired'] }, clearsSiteIds: ['lr3_dock'] },
      ], { marker: 'supply' }),
      S.landmark('lr3_dock', [1, 19], 'Outer Dock Boathouse', 'The boathouse of the long-haul crews. Their toughs let nobody near the boats without the crews’ say — or a beating.', 'refuge', { label: 'Boathouse toughs', army: [['brigand', 16], ['brigand_cutthroat', 6]], reward: { resources: { gold: 300 }, flags: ['lr3_crews_hired'] }, battlefield: 'coast_road' }),
      S.ferry('lr3_outer_slip', [3, 20], 'Outer Dock Slip', 'The long outer sailing route round the islands.', 'lr3_far_slip', { flag: 'lr3_crews_hired', reason: 'Settle with the Outer Dock’s boat crews first' }),
      S.ferry('lr3_far_slip', [31, 9], 'Far Shore Slip', 'A quiet slip on the far side of the Mirror Isle, where the outer route lands.', 'lr3_outer_slip', { flag: 'lr3_crews_hired', reason: 'Settle with the Outer Dock’s boat crews first' }),
      S.camp('lr3_crews', [4, 16], 'Boat Crews’ Quarters', 'Brigand boat crews between hauls — hard men who will row and fight for pay.', 'brigand', 4, 6),
      // The Wreck Isle and the Cedar Isle.
      S.choice('lr3_ship', [15, 13], 'The Lightless Ship', 'A ship of the fog fleet, aground and empty, its passenger register still in the captain’s cabin.', 'The Lightless Ship', 'Every lamp on the ship has been emptied — the oil drunk, not spilled. In the captain’s cabin lies the passenger register, every name crossed through twice. Beside it, a chest of silver and a rack of kappa-skin raincoats.', [
        { label: 'Take the register and the silver', summary: 'The passenger register (evidence), +800 Gold and +2 Crystal.', reward: { flags: ['lr3_reg_ship'], resources: { gold: 800, crystal: 2 } } },
        { label: 'Take the register; give the raincoats to the kappa', summary: 'The passenger register (evidence); 6 River Elder Kappa join Akane’s retinue.', reward: { flags: ['lr3_reg_ship'], creatures: [{ creatureId: 'japanese_river_elder_kappa', count: 6 }] } },
      ], { marker: 'evidence' }),
      S.activation('lr3_south_bell', [17, 12], 'South Shrine Bell', 'A shrine bell on the Wreck Isle, green with salt.', { cost: { gold: 250, stone: 3 }, reward: { flags: ['lr3_fog_clear', 'lr3_bell_south'], questXp: 300 }, confirm: 'Ring the South Shrine Bell (250 Gold, 3 Stone)? The fog over the central channel lifts: the mist ferry runs to the Hall’s West Landing.' }, null),
      S.ferry('lr3_wreck_north', [17, 11], 'Mist Ferry (Wreck Isle)', 'A ferry across the central channel to the Hall’s West Landing — it runs only when the fog lifts.', 'lr3_hall_slip', { flag: 'lr3_fog_clear', reason: 'The fog over the channel eats boats: ring a shrine bell to lift it' }),
      S.ferry('lr3_west_slip', [4, 9], 'Strand Slip', 'A punt from the western strand to the Cedar Isle.', 'lr3_cedar_slip'),
      S.ferry('lr3_cedar_slip', [10, 10], 'Cedar Isle Slip', 'The Cedar Isle’s landing.', 'lr3_west_slip'),
      S.neutral('lr3_baku', [9, 8], 'Baku of the Cedar Isle', 'A quiet island of old cedars and moss-covered stones where the fog never settles. Baku graze here on the bad dreams the fleet’s passengers leave behind.', 'baku', 5),
      // Anchorage Isle and the northern causeway.
      S.shortcut('lr3_causeway', [7, 2], 'Northern Causeway', 'A causeway of stepping stones from the strand to the Anchorage Isle — under the sea until the spring tide ebbs.', ['lr3_low_tide']),
      S.landmark('lr3_anchorage', [16, 3], 'North Anchorage', 'The fleet’s northern anchorage, where its register of passengers is kept ashore.', 'refuge', { label: 'Anchorage raiders', army: anchorageGuard, reward: { resources: { gold: 600 }, flags: ['lr3_reg_anchorage'] }, battlefield: 'coast_road' }, { marker: 'evidence' }),
      S.activation('lr3_north_bell', [19, 2], 'North Shrine Bell', 'A shrine bell on the Anchorage Isle.', { cost: { gold: 250, stone: 3 }, reward: { flags: ['lr3_fog_clear', 'lr3_bell_north'], questXp: 300 }, confirm: 'Ring the North Shrine Bell (250 Gold, 3 Stone)? The fog over the central channel lifts: the mist ferry runs to the Hall’s West Landing.' }, null),
      // The Mirror Isle.
      S.crossing('lr3_shoal', [28, 15], 'South Landing (the Eastern Shoal)', 'The shoal path from the shore to the Hall’s south landing, held by the fleet’s pickets.', { label: 'Shoal pickets', army: shoalGuard, reward: { resources: { gold: 500 }, flags: ['lr3_landing_south'] }, battlefield: 'coast_road' }),
      S.ferry('lr3_hall_slip', [24, 9], 'West Landing', 'The Hall of Mirrors’ west landing on the central channel.', 'lr3_wreck_north', { flag: 'lr3_fog_clear', reason: 'The fog over the channel eats boats: ring a shrine bell to lift it' }),
      S.activation(
        'lr3_hall',
        [28, 7],
        'Hall of Mirrors',
        'A hall of bronze mirrors on the Mirror Isle. Spider-women weave over its doors.',
        { cost: { gold: 300 }, reward: { questXp: 2200, artifactIds: ['storm_gods_tachi'], flags: ['lr3_mirrors_seen'] }, requirements: [{ type: 'objective_completed', objectiveId: 'lr3_ferry' }, { type: 'objective_completed', objectiveId: 'lr3_landing' }, { type: 'objective_completed', objectiveId: 'lr3_registers' }], confirm: 'Bring the freed fleet in and look into the mirrors (300 Gold for the mirror-keepers)?' },
        { label: 'Mirror-weavers', army: weaverGuard, reward: { resources: { gold: 1000 } }, battlefield: 'coast_road', required: true },
        { objectiveIds: ['lr3_mirrors'], marker: 'evidence' },
      ),
      S.landmark('lr3_depot', [30, 4], 'Fleet Depot', 'Gonryō’s depot cove: oars, sails, rope — and the register of the dead who could not pay.', 'quarry_cache', { label: 'Depot raiders', army: depotGuard, reward: { resources: { gold: 900, wood: 5 }, flags: ['lr3_reg_depot', 'lr3_depot_taken'] }, battlefield: 'coast_road' }, { marker: 'evidence' }),
      S.shortcut('lr3_mist_bank', [24, 8], 'Mist Bank', 'A bank of fog over the spit at the West Landing. Gonryō’s flagship lies somewhere inside it.', ['lr3_mirrors_seen']),
      S.landmark('lr3_flagship', [22, 8], 'Gonryō’s Landing', 'The spit by the West Landing where Gonryō puts his flagship guard ashore.', 'refuge', { label: 'Gonryō and the flagship guard', army: flagshipGuard, commander: gonryo, reward: { resources: { gold: 1500 }, flags: ['lr3_gonryo_down'], questXp: 1500 }, battlefield: 'coast_road', required: true }, { objectiveIds: ['lr3_flagship'] }),
      // The shore.
      S.choice('lr3_registry', [7, 19], 'Shrine of the Drowned', 'Shiogama’s shrine to the drowned, where the families of the lost leave names on wooden tablets.', 'The registers', 'The two registers lie on the offering table. Shiro has copied every name into his own book — the copies stay with Akane whatever happens to these. The families want the originals: their dead, in their own houses. Genzo wants them nailed to the gate of the Iron Castle, where everyone who serves Kurogane will have to read whom they serve.', [
        { label: 'Return the registers to the families', summary: 'The families keep their dead. Remembered as civilian aid at the Last Torii (10 River Elder Kappa from the shore families guard Hikari).', reward: { flags: ['lr3_registers_returned'], questXp: 300 }, requiresFlags: ['lr3_two_registers'] },
        { label: 'Publish the names at the Iron Castle', summary: 'The names go up on the Iron Castle’s gate. If Kurogane still holds the castle, his authority over the bound dead is weakened (one labour bond’s overseers can be talked down in The Iron Daimyo); and at the Last Torii the names read on every road bring 10 Favor.', reward: { flags: ['lr3_names_published'], questXp: 300 }, requiresFlags: ['lr3_two_registers'] },
      ], { marker: 'pact', objectiveIds: ['lr3_choice'] }),
      S.choice('lr3_monk', [3, 12], 'A Wandering Monk', 'A monk in a basket hat, playing a flute on the strand.', 'The Flute-playing Monk', 'He stops playing when you come near. “You are going to the mirrors,” he says. “Look twice — the first look shows you what you want to see.” He holds out a travelling cloak, salt-stiff. “The sea wind is cold. Or sit, and I will teach you a tune that fog does not like.”', [
        { label: 'Take the cloak', summary: 'The Wayfarer’s Cloak joins Akane’s backpack.', reward: { artifactIds: ['wayfarer_cloak'] } },
        { label: 'Learn the tune', summary: 'Akane gains +1 Spell Power and +1 Knowledge.', reward: { attributes: { power: 1, knowledge: 1 } } },
      ]),
      S.depot('lr3_salt_boat', [23, 19], 'Beached Salt Boat', 'A salt boat driven ashore by the fog; its strongbox is dry.', { resources: { gold: 900, wood: 4 } }),
      S.landmark('lr3_grotto', [31, 18], 'Ogre Grotto', 'Ogres sleep in a sea cave full of stolen nets.', 'nest', { label: 'Grotto ogres', army: [['ogre', 2]], reward: { resources: { crystal: 5 } }, battlefield: 'grove' }),
    ],
    patrols: [
      {
        commander: band('lr3_raiders', 'Fog-Fleet Raiders', RONIN_PORTRAIT),
        monster: true,
        bounty: { gold: 400 },
        start: [26, 10],
        waypoints: [[18, 4], [29, 6], [27, 11]],
        army: raiderArmy,
        home: 'lr3_depot',
        threshold: [3, 2],
        purpose: 'Rows between the fleet’s three visible anchorages — the North Anchorage, the depot cove and the Hall’s south shore — and falls on any landing left unprotected. The Fleet Depot replenishes it: take the depot and it withdraws for good.',
      },
    ],
    objectives: [
      O.primary(
        'lr3_ferry',
        'A ferry route of our own',
        `Free a usable crossing to the islands: take Shiogama Quay from the fog-fleet raiders (${armyText(quayGuard)}) for the short hop to the Wreck Isle, or settle with the Outer Dock’s boat crews — hire them, or beat their toughs (${armyText([['brigand', 16], ['brigand_cutthroat', 6]])}) — for the long outer route to the far side of the Mirror Isle.`,
        C.any(C.cleared('lr3_quay'), C.cleared('lr3_dock')),
      ),
      O.primary(
        'lr3_landing',
        'A landing at the Hall',
        `Secure one of the Hall of Mirrors’ two landings for the freed fleet: ring a shrine bell (Anchorage Isle or Wreck Isle) to lift the fog, so the mist ferry runs to the West Landing — or take the South Landing on the eastern shoal (${armyText(shoalGuard)}).`,
        C.any(C.flag('lr3_fog_clear'), C.cleared('lr3_shoal')),
        { hint: 'The northern causeway also reaches the Mirror Isle once the spring tide ebbs (the day is in the journal).' },
      ),
      O.primary(
        'lr3_registers',
        'Two passenger registers',
        `Recover two of the fleet’s three passenger registers: aboard the Lightless Ship on the Wreck Isle, at the North Anchorage (${armyText(anchorageGuard)}), or in the Fleet Depot on the Mirror Isle (${armyText(depotGuard)}).`,
        C.atLeast(2, C.flag('lr3_reg_ship'), C.flag('lr3_reg_depot'), C.flag('lr3_reg_anchorage')),
        { reward: { flags: ['lr3_two_registers'] }, hint: 'A register once found stays in Shiro’s book whatever else happens.' },
      ),
      O.primary(
        'lr3_mirrors',
        'The freed fleet at the Hall of Mirrors',
        `With a ferry route free, a landing secured and two registers in hand, bring the freed fleet in to the Hall of Mirrors: drive off the mirror-weavers (${armyText(weaverGuard)}) and look into the mirrors.`,
        C.activated('lr3_hall'),
        { markerSiteId: 'lr3_hall', requires: ['lr3_ferry', 'lr3_landing', 'lr3_registers'], hint: 'The Mirror Isle is reached over the eastern shoal, by the northern causeway at low tide, by the mist ferry once the fog lifts, or by the long outer route.' },
      ),
      O.primary(
        'lr3_flagship',
        'Gonryō comes ashore',
        `When the freed fleet reaches the Hall, Gonryō brings his flagship guard ashore at the West Landing — the one landing without a wall. Meet Gonryō and the flagship guard (${armyText(flagshipGuard)}) on the spit.`,
        C.cleared('lr3_flagship'),
        { markerSiteId: 'lr3_flagship', requires: ['lr3_mirrors'], completesMission: true },
      ),
      O.optional('lr3_choice', 'The registers’ fate', 'At the Shrine of the Drowned in Shiogama, return the registers to the families or publish the names at the Iron Castle.', C.any(C.flag('lr3_registers_returned'), C.flag('lr3_names_published')), { markerSiteId: 'lr3_registry' }),
      O.optional('lr3_resupply', 'Cut the fleet’s supply', `Take the Fleet Depot (${armyText(depotGuard)}): the raiders that row between the anchorages are no longer replenished, and withdraw.`, C.cleared('lr3_depot'), { markerSiteId: 'lr3_depot' }),
      O.optional('lr3_bells', 'Both shrine bells', 'Ring both shrine bells: the fishers of Shiogama put to sea again (+1,000 Gold).', C.all(C.flag('lr3_bell_north'), C.flag('lr3_bell_south')), { reward: { resources: { gold: 1000 } } }),
      O.optional('lr3_spiders', 'Spider-women of our own', 'Recruit at least 2 Jorogumo in Shiogama.', C.counter('recruited:japanese_jorogumo', 2)),
      O.optional('lr3_ogres', 'The ogre grotto', 'Drive the ogres from their sea cave at the east end of the shore.', C.cleared('lr3_grotto'), { markerSiteId: 'lr3_grotto' }),
    ],
    timers: [
      {
        id: 'lr3_tide',
        label: 'The spring tide ebbs',
        startWhen: C.all(),
        days: 5,
        metWhen: C.flag('lr3_never'),
        consequence: 'When the spring tide ebbs, the northern causeway stands out of the sea and stays open for the rest of the chapter. Nothing is lost and nobody is cut off.',
        announce: 'Shiogama’s tide-readers say the spring tide ebbs in five days: the northern causeway will open then.',
        onExpire: { flags: ['lr3_low_tide'] },
      },
    ],
    evidence: [
      { id: 'lr3_ev_ship', flag: 'lr3_reg_ship', title: 'The Lightless Ship’s register', text: 'Every passenger crossed through twice: once when they paid, once when they forgot.', icon: 'evidence' },
      { id: 'lr3_ev_anchorage', flag: 'lr3_reg_anchorage', title: 'The anchorage register', text: 'The north anchorage kept the fares: a memory for each crossing, and the crossings never end.', icon: 'evidence' },
      { id: 'lr3_ev_depot', flag: 'lr3_reg_depot', title: 'The depot register', text: 'The dead who could not pay were kept aboard until they had nothing left to pay with.', icon: 'evidence' },
      { id: 'lr3_ev_mirrors', flag: 'lr3_mirrors_seen', title: 'What the mirrors showed', text: 'Every memory the fleet strips away goes to one mouth: Yamikage, the Lantern-Eater, feeds on what the dead forget.', icon: 'evidence' },
      { id: 'lr3_ev_returned', flag: 'lr3_registers_returned', title: 'Registers returned', text: 'The families of the Spirit Sea keep their dead’s names. Shiro keeps the copies.', icon: 'supply' },
      { id: 'lr3_ev_published', flag: 'lr3_names_published', title: 'Names on the Iron Castle gate', text: 'The names of the dead the fleet stripped are nailed to the Iron Castle’s gate for every soldier of Kurogane’s to read. Shiro keeps the copies.', icon: 'branch' },
      { id: 'lr3_ev_gonryo', flag: 'lr3_gonryo_down', title: 'Gonryō beaten', text: 'Gonryō was beaten on the spit at the West Landing. The fleet’s boats are free.', icon: 'evidence' },
      { id: 'lr3_ev_depot_taken', flag: 'lr3_depot_taken', title: 'The depot taken', text: 'The fleet’s depot cove is Akane’s: no more replenishment for its raiders.', icon: 'supply' },
    ],
    carried: ['lr3_two_registers', 'lr3_reg_ship', 'lr3_reg_anchorage', 'lr3_reg_depot', 'lr3_mirrors_seen', 'lr3_registers_returned', 'lr3_names_published', 'lr3_gonryo_down'],
    entryBonuses: [{ fact: 'lr4_workshops_kept', label: 'Akashi’s workshops fitted out Shiogama’s boats (10 Wood, 10 Stone)', wallet: { wood: 10, stone: 10 } }],
    briefing: [
      GENZO('The fishers of Shiogama will not sail. A fleet comes out of the fog with no lamps lit, takes the dead off the shore, and never makes port.'),
      SHIRO('They are ferried round and round, priestess, until they forget their names. Then they are put ashore wherever the fog likes.'),
      AKANE('The Hall of Mirrors shows what has been hidden. If the dead are being emptied out, the mirrors will show who drinks what is poured off.'),
      GENZO('Gonryō captains the fleet. His registers list every passenger and every fare — two of them are proof enough. And we need one ferry that is ours.'),
      AKANE('Registers, a free ferry, a landing at the Hall. Whatever Gonryō does then, we will be standing on dry ground when he does it.'),
    ],
    briefingVariants: [
      { ifFlags: ['fact:lr4_kurogane_down'], lines: [SHIRO('Since the Lantern of Oaths went out, Kurogane’s bound dead walk home along this shore — and the fog takes them off the beach before they get there.')] },
      { unlessFlags: ['fact:lr4_kurogane_down'], lines: [GENZO('Kurogane’s contract named a buyer for oni and labourers. Someone else is buying memories. I would like to know whether it is the same purse.')] },
      { ifFlags: ['fact:lr2_tengu_pact'], lines: [SHIRO('The tengu of Kumoyama say fog thins where a shrine bell rings. They should know — they kept one silent long enough.')] },
      { ifFlags: ['fact:lr4_workshops_kept'], lines: [GENZO('Akashi’s workshops sent planks and pitch down the river. Shiogama’s boats will be seaworthy, at least.')] },
    ],
    victory: [
      AKANE('Gonryō is beaten and his boats are free. The mirrors showed me where the memories go: to Yamikage, the Lantern-Eater. Every name the fleet stripped was a meal.'),
      SHIRO('And some of those names I knew, priestess. My grandmother’s brother. The official rolls erased him the year he drowned — and here he is, crossed through twice.'),
    ],
    scenes: [
      { id: 'lr3_quay', trigger: { type: 'site_cleared', siteId: 'lr3_quay' }, lines: [GENZO('The quay is ours. The boats they held are tied up empty — the freed fleet will sail with us now, landing by landing.'), AKANE('Then every landing we secure brings them closer to the Hall.')] },
      { id: 'lr3_crews', trigger: { type: 'flag', flag: 'lr3_crews_hired' }, lines: [SHIRO('The crews are rowing out. The long way round — but Gonryō never watches the far side of his own island.')] },
      { id: 'lr3_tide', trigger: { type: 'flag', flag: 'lr3_low_tide' }, lines: [SHIRO('The spring tide is out. The northern causeway stands clear of the sea, all the way to the Anchorage Isle.')] },
      { id: 'lr3_fog', trigger: { type: 'flag', flag: 'lr3_fog_clear' }, lines: [AKANE('Listen — the fog is leaving the channel like a guest who was told the party is over.'), GENZO('And there is the mist ferry, tied up at the Wreck Isle. It runs straight to the Hall’s West Landing.')] },
      { id: 'lr3_south', trigger: { type: 'flag', flag: 'lr3_landing_south' }, lines: [GENZO('The South Landing is ours. The freed boats are tying up under the Hall.')] },
      { id: 'lr3_names', trigger: { type: 'flag', flag: 'lr3_two_registers' }, lines: [SHIRO('Two registers. I know some of these names — the official rolls say they never lived. Here they are, with what they paid to forget.'), AKANE('Copy every one, Shiro. Whatever happens to the books.')] },
      { id: 'lr3_depot', trigger: { type: 'site_cleared', siteId: 'lr3_depot' }, lines: [GENZO('The depot is ours. No more oars, no more rope — his raiders are pulling back to the flagship.')] },
      { id: 'lr3_mirrors_battle', trigger: { type: 'battle_started', siteId: 'lr3_hall' }, lines: [YAMIKAGE('Look into my mirrors, diviner. You will see the dark — and the dark will see you.')] },
      { id: 'lr3_seen_after4', trigger: { type: 'flag', flag: 'lr3_mirrors_seen' }, ifFlags: ['fact:lr4_kurogane_down'], lines: [AKANE('Every memory the fleet strips goes to one mouth — Yamikage’s. Kurogane’s bound dead were only another dish.'), GENZO('Gonryō’s flagship is coming in to the West Landing!')] },
      { id: 'lr3_seen_before4', trigger: { type: 'flag', flag: 'lr3_mirrors_seen' }, unlessFlags: ['fact:lr4_kurogane_down'], lines: [AKANE('Every memory the fleet strips goes to one mouth — Yamikage’s. And beside him in the glass, a lord in black iron who buys whatever is left.'), GENZO('Gonryō’s flagship is coming in to the West Landing!')] },
      { id: 'lr3_gonryo_battle', trigger: { type: 'battle_started', siteId: 'lr3_flagship' }, lines: [speaker(P, 'Gonryō', 'gonryo')('Every passenger pays, priestess. Memories are light cargo.'), AKANE('Then let them keep it.')] },
      { id: 'lr3_returned', trigger: { type: 'flag', flag: 'lr3_registers_returned' }, lines: [SHIRO('The families are taking the registers home. Shiogama will light a lantern in every house that gets a name back.')] },
      { id: 'lr3_published', trigger: { type: 'flag', flag: 'lr3_names_published' }, lines: [GENZO('The names go north on the next cart, to be nailed to the Iron Castle’s gate. Let his soldiers read whom they serve.')] },
    ],
    loss: ['Akane must survive.', 'Losing Shiogama is recoverable while Akane has an army.', 'The tide only ever opens the causeway; no army is stranded by it.', 'A register once found is never lost.'],
    help: [
      { id: 'lr3_sea', title: 'Four islands, many crossings', text: 'Short ferry hops (Shiogama Quay to the Wreck Isle; the strand to the Cedar Isle; the mist ferry across the channel once a shrine bell lifts the fog), the northern causeway (open from the announced low tide), the eastern shoal and the long outer route from the Outer Dock. None is the only way.' },
      { id: 'lr3_fleet', title: 'The fleet', text: 'Raiders row between three visible anchorages and fall on unprotected landings; the Fleet Depot replenishes them, and taking it ends them. Gonryō himself comes ashore only once, when the freed fleet reaches the Hall.' },
    ],
  });

  // =========================================================================
  // Chapter 4 — The Iron Daimyo (card 24; legacy m05)
  // =========================================================================
  const kuroSetup = camp.v1('lantern_road_m05').rivals?.[0];
  if (!kuroSetup) throw new Error('Lantern Road v2: Kurogane’s profile is missing from the legacy content');
  const kurogane: CommanderSpec = {
    heroDefinitionId: kuroSetup.hero.definitionId,
    name: 'Kurogane',
    classId: kuroSetup.hero.classId,
    level: kuroSetup.hero.defaults.level,
    attributes: kuroSetup.hero.defaults.attributes,
    skills: kuroSetup.hero.defaults.skills,
    spellbook: false,
    spellIds: [],
    mana: 10,
    portraitAssetId: 'hero.japanese.kurogane.portrait',
  };
  const BOUND_PORTRAIT = 'creature.japanese.tier1.upgraded.portrait';
  const foundryGuard: Army = [['clay_golem', 8], ['bronze_golem', 1]];
  const barracksGuard: Army = [['japanese_nine_tailed_kitsune', 24], ['japanese_river_elder_kappa', 8]];
  const riceGuard: Army = [['brigand', 24], ['brigand_cutthroat', 10]];
  const frontGateGuard: Army = [['japanese_nine_tailed_kitsune', 20], ['japanese_river_elder_kappa', 8], ['japanese_oni', 2]];
  const keepGuard: Army = [['japanese_nine_tailed_kitsune', 30], ['japanese_river_elder_kappa', 12], ['japanese_oni', 4]];
  const columnArmy: Army = [['japanese_nine_tailed_kitsune', 44], ['japanese_river_elder_kappa', 14], ['japanese_oni', 3]];
  const recaptureArmy: Army = [['japanese_nine_tailed_kitsune', 22], ['japanese_river_elder_kappa', 8], ['japanese_oni', 2]];
  const depotGuard4: Army = [['brigand', 14], ['brigand_cutthroat', 6]];
  const levyArmy: Army = [['japanese_nine_tailed_kitsune', 14], ['brigand_cutthroat', 8]];
  const m4base = chapter({
    campaign: camp,
    chapter: 4,
    card: 24,
    name: 'The Iron Daimyo',
    summary:
      'Kurogane’s army of bound dead is marching on Akashi, Akane’s roadside refuge. Lead the refugees out to one of two safe camps, break two of the labour bonds that feed the Iron Castle — foundry, barracks or rice store — hold against his recapture, and defeat the Iron Daimyo in his keep.',
    playtime: '70–90 minutes, 4–6 battles',
    legacy: ['lantern_road_m05'],
    economyFrom: 'lantern_road_m05',
    principal: 'lr4_kurogane',
    soundscape: 'shrine',
    hostileName: 'The Iron Castle',
    town: { siteId: 'lr4_town', townId: 'akashi', name: 'Akashi Refuge' },
    // A roadside refuge: a hall, a tavern and a market, no dwellings. The safe camps are where Akane recruits.
    player: { buildings: ['japanese_civic_hall_l1', 'japanese_tavern_l1', 'japanese_marketplace_l1', 'japanese_fortifications_l1'], population: {} },
    map: {
      cols: 34,
      rows: 21,
      biome: 'temperate',
      base: 'plains',
      seed: 950004,
      texture: { forest: 50, rough: 40 },
      paint: [
        // The Iron Castle on its central ridge: a ring of crags, a front gate south, a postern north.
        { t: 'mountain', disc: [21, 9, 3] },
        { t: 'plains', disc: [21, 9, 1] },
        { t: 'rough', cells: [[21, 7], [20, 7]] },
        { t: 'plains', cells: [[21, 12], [18, 9]] },
        // The pilgrims' slope north of the castle: steep and wet, a costly climb to the postern.
        { t: 'rough', rect: [16, 1, 26, 5] },
        { t: 'marsh', cells: [[20, 4], [21, 4], [22, 3], [19, 3], [21, 2], [20, 5], [22, 5], [18, 4], [23, 4]] },
        // The refuge valley in the south-west, with a north pass and an east pass.
        { t: 'mountain', line: [[1, 12], [8, 12]], width: 0 },
        { t: 'mountain', line: [[8, 12], [9, 19]], width: 0 },
        { t: 'plains', cells: [[3, 12], [4, 12], [9, 16], [9, 17]] },
        // Woods and hills of the hinterland.
        { t: 'forest', blob: [8, 8, 2] },
        { t: 'forest', blob: [13, 15, 1] },
        { t: 'rough', blob: [3, 3, 1] },
        { t: 'forest', blob: [30, 4, 2] },
        { t: 'rough', blob: [31, 14, 1] },
      ],
      roads: [
        // The two evacuation roads out of the refuge valley, and Yomogi's hidden path.
        { via: ['lr4_town', [4, 12], [4, 8], 'lr4_hill_camp'] },
        { via: ['lr4_town', [9, 17], [16, 18], 'lr4_river_camp'] },
        { via: ['lr4_town', 'lr4_hidden_path', [12, 12]] },
        // The lower ring round the castle ridge: foundry (west), barracks (east), rice store (south).
        { via: [[4, 8], [12, 9], 'lr4_foundry'] },
        { via: ['lr4_foundry', [16, 13], [21, 14], 'lr4_rice'] },
        { via: [[21, 14], [27, 13], 'lr4_barracks'] },
        { via: ['lr4_barracks', [27, 6], [24, 5]] },
        { via: [[16, 18], [21, 17], 'lr4_rice'] },
        // The broad front road and the steep pilgrims' road to the postern.
        { via: [[21, 14], 'lr4_front_gate', 'lr4_keep'] },
        { via: ['lr4_hill_camp', [10, 3], [16, 3], [21, 3], 'lr4_postern', 'lr4_keep'] },
        { via: [[24, 5], [21, 3]] },
        // The foundry's ore tunnel into the courtyard (opened by the freed founders).
        { via: ['lr4_foundry', [17, 9], 'lr4_tunnel', 'lr4_keep'] },
        // Spurs.
        { via: ['lr4_foundry', 'lr4_foundry_yard'] },
        { via: [[16, 3], 'lr4_depot_n'] },
        { via: [[12, 9], 'lr4_depot_w'] },
        { via: [[12, 9], 'lr4_kiln'] },
        { via: ['lr4_kiln', 'lr4_workshop'] },
        { via: [[12, 9], 'lr4_baku'] },
        { via: [[21, 17], 'lr4_rice_gate'] },
        { via: [[27, 13], 'lr4_spring'] },
        { via: [[27, 6], 'lr4_mine'] },
        { via: ['lr4_river_camp', 'lr4_quarry'] },
        { via: ['lr4_town', 'lr4_sawmill'] },
      ],
    },
    sites: [
      S.town('lr4_town', 'akashi', [3, 17], 'Akashi Refuge', 'Akane’s roadside refuge in a sheltered valley: a hall, a tavern and a market for travellers — and no walls worth the name.', [4, 17]),
      S.town('lr4_hill_camp', 'tsurugi', [4, 5], 'Tsurugi Hill Camp', 'A walled hill camp of shrine folk north of the refuge — safe ground, if someone takes charge of it.'),
      S.town('lr4_river_camp', 'kawabe', [25, 18], 'Kawabe River Camp', 'A river camp of boatmen and smiths south of the castle ridge — safe ground, if someone takes charge of it.'),
      S.resource('lr4_sawmill', [2, 15], 'sawmill'),
      S.resource('lr4_quarry', [28, 17], 'quarry'),
      S.resource('lr4_mine', [31, 7], 'gold_mine', { guard: { label: 'Mine boars', army: [{ creatureId: 'tusked_boar', count: 10 }], reward: { resources: { gold: 500 } }, battlefield: 'open_field' } }),
      S.shortcut('lr4_hidden_path', [8, 14], 'Yomogi’s Hidden Path', 'A path through the valley’s east wall that only Yomogi’s people know — and only if they came.', ['lr4_hidden_path']),
      // The labour bonds.
      S.landmark('lr4_foundry', [15, 9], 'Iron Foundry', 'Kurogane’s foundry on the west of the lower ring. Bound dead feed its furnaces; haniwa overseers keep them at it.', 'quarry_cache', { label: 'Foundry overseers', army: foundryGuard, reward: { resources: { gold: 800, stone: 5 }, flags: ['lr4_foundry_free', 'lr4_first_bond'] }, battlefield: 'ridge_pass', required: true }, { marker: 'evacuation' }),
      S.landmark('lr4_barracks', [28, 9], 'Bound-Dead Barracks', 'The barracks on the east of the lower ring, where the bound dead are drilled. Kurogane’s column against the refuge was mustered here.', 'refuge', { label: 'Barracks drillmasters', army: barracksGuard, reward: { resources: { gold: 800 }, flags: ['lr4_barracks_free', 'lr4_first_bond'] }, battlefield: 'open_field', required: true }, { marker: 'evacuation' }),
      S.landmark('lr4_rice', [21, 16], 'Castle Rice Store', 'The rice store south of the castle, worked by bound dead under Kurogane’s ronin.', 'quarry_cache', { label: 'Rice-store ronin', army: riceGuard, reward: { resources: { gold: 800, wood: 5 }, flags: ['lr4_rice_free', 'lr4_first_bond'] }, battlefield: 'open_field', required: true }, { marker: 'evacuation' }),
      S.choice('lr4_rice_gate', [19, 17], 'Rice-Store Gate', 'The gate of the rice store, where the ronin read the notices from the castle.', 'The names on the gate', 'Genzo nails a copy of the Spirit Sea registers beside Kurogane’s notices and reads the names aloud. One ronin stops him at a name, then another. “My sister,” the first one says. “He told us the fog took her.”', [
        { label: 'Read them the names', summary: 'Only with the registers published at the Iron Castle. The rice-store ronin lay down their spears: the rice store’s bond is broken without a battle.', reward: { flags: ['lr4_rice_free', 'lr4_first_bond'], questXp: 400 }, requiresFlags: ['lr4_names_read'], clearsSiteIds: ['lr4_rice'] },
      ], { marker: 'pact' }),
      S.choice('lr4_foundry_yard', [14, 7], 'Foundry Yard', 'The yard of the freed foundry: furnaces, ordinary workshops, and the chain-forge where the binding irons were made.', 'What becomes of the foundry', 'The founders stand in the yard with soot to the elbows. Shiro wants the whole foundry broken: “Every chain that bound a spirit came out of that forge. Pull it down and the spirit road is safer for good.” The founders’ headman points at the workshops beside it. “Those make ploughs and hinges and pots, priestess. Pull down the chain-forge if you like — but let us keep the rest, under our own hands.”', [
        { label: 'Dismantle the foundry', summary: 'The chain-forge and the workshops come down together. Remembered: a safer spirit road at the Last Torii (a guarded shrine path opens there for Akane).', reward: { flags: ['lr4_foundry_dismantled'], questXp: 300 }, requiresFlags: ['lr4_foundry_free'] },
        { label: 'Keep the ordinary workshops under local control', summary: 'Only the chain-forge is broken; the founders keep the rest. Remembered: equipment support later (the workshops fit out Shiogama’s boats if the Spirit Sea is still ahead, and send armour to the Last Torii).', reward: { flags: ['lr4_workshops_kept'], questXp: 300 }, requiresFlags: ['lr4_foundry_free'] },
      ], { marker: 'pact', objectiveIds: ['lr4_choice'] }),
      // The Iron Castle.
      S.crossing('lr4_front_gate', [21, 11], 'Iron Castle Front Gate', 'The broad front road ends at the castle’s front gate — the fastest way in, and the best defended. Kurogane’s recapture force musters behind it.', { label: 'Front-gate guard', army: frontGateGuard, reward: { resources: { gold: 1000 }, flags: ['lr4_front_taken'] }, battlefield: 'beacon_clearing' }),
      S.crossing('lr4_postern', [21, 6], 'Pilgrims’ Postern', 'A small gate at the head of the steep pilgrims’ road behind the castle. Nobody guards it: the climb does that.', null),
      S.shortcut('lr4_tunnel', [19, 9], 'Ore Tunnel', 'The tunnel the foundry’s ore carts used into the castle courtyard. The freed founders know how to open it.', ['lr4_foundry_free']),
      S.landmark('lr4_keep', [21, 9], 'Keep of the Iron Castle', 'Kurogane’s keep, roofed in black iron. The Lantern of Oaths burns in its hall, binding every spirit he has caught.', 'refuge', { label: 'Kurogane and the castle guard', army: keepGuard, commander: kurogane, reward: { resources: { gold: 2000 }, artifactIds: ['band_of_insight'], flags: ['lr4_kurogane_down'], questXp: 2000 }, battlefield: 'beacon_clearing', required: true }, { objectiveIds: ['lr4_kurogane'] }),
      // Kurogane's depots.
      S.landmark('lr4_depot_n', [17, 2], 'North Iron Depot', 'A depot on the pilgrims’ slope: irons, rations and pay for a levy.', 'quarry_cache', { label: 'Depot guard', army: depotGuard4, reward: { resources: { gold: 600, crystal: 2 } }, battlefield: 'ridge_pass' }),
      S.landmark('lr4_depot_w', [11, 11], 'West Iron Depot', 'A depot in the woods west of the foundry: irons, rations and pay for a levy.', 'quarry_cache', { label: 'Depot guard', army: depotGuard4, reward: { resources: { gold: 600, wood: 4 } }, battlefield: 'grove' }),
      // Neutrals and the hinterland.
      S.activation('lr4_kiln', [9, 10], 'Abandoned Workshop Kiln', 'The cold kiln of a haniwa workshop Kurogane abandoned when he built his foundry.', { cost: { wood: 3, stone: 3 }, reward: { flags: ['lr4_kiln_fired'] }, confirm: 'Pay 3 Wood and 3 Stone to fire the kiln and reclaim the workshop?', label: 'relay' }, null),
      S.camp('lr4_workshop', [10, 8], 'Reclaimed Haniwa Workshop', 'Clay figures from the old workshop, for hire once its kiln burns again — made to guard, not to bind.', 'clay_golem', 2, 3, { kind: { type: 'creature_camp', creatureId: 'clay_golem', weeklyGrowth: 2, initialStock: 3, requiresFlag: 'lr4_kiln_fired', lockedReason: 'Reclaim the workshop first: fire the kiln beside it (3 Wood, 3 Stone).' } }),
      S.neutral('lr4_baku', [7, 7], 'Baku Grove', 'A small misty grove of cedars west of the foundry. A few baku shelter here from the furnace smoke.', 'baku', 5),
      S.choice('lr4_spring', [29, 12], 'Hot Spring', 'A hot spring with a little shrine above it.', 'The Hot Spring', 'A monkey sits in the spring and watches you over the steam. On the shrine shelf lie a purse of offerings — and a cup, for whoever will drink from the spring instead.', [
        { label: 'Take the offerings', summary: '+1,500 Gold.', reward: { resources: { gold: 1500 } } },
        { label: 'Drink from the spring', summary: 'Akane gains +1 Defense and +1 Knowledge.', reward: { attributes: { defense: 1, knowledge: 1 } } },
      ]),
    ],
    patrols: [
      {
        commander: band('lr4_column', 'Bound-Dead Column', BOUND_PORTRAIT),
        monster: true,
        bounty: { gold: 800 },
        start: [11, 14],
        waypoints: [[6, 15], [4, 13], [7, 18], [6, 15]],
        army: columnArmy,
        home: 'lr4_barracks',
        radius: 8,
        dormantUntil: 'lr4_column_marches',
        threshold: [3, 2],
        purpose: 'Kurogane’s column of bound dead. On the announced day it marches into the refuge valley and holds it; it attacks only an army it is sure to beat. Freeing the Bound-Dead Barracks, where it was mustered, sends it home for good.',
      },
      {
        commander: band('lr4_recapture', 'Recapture Force', BOUND_PORTRAIT),
        monster: true,
        bounty: { gold: 600 },
        start: [25, 14],
        waypoints: [[16, 12], [14, 5], [27, 6], [27, 14], [21, 14]],
        army: recaptureArmy,
        home: 'lr4_front_gate',
        dormantUntil: 'lr4_first_bond',
        threshold: [11, 10],
        purpose: 'When the first labour bond breaks, Kurogane sends this force out of the front gate round the lower ring to retake the freed districts — once. Beating it, or taking the front gate it musters behind, ends it.',
      },
      {
        commander: band('lr4_levy_n', 'North Depot Levy', RONIN_PORTRAIT),
        monster: true,
        bounty: { gold: 300 },
        start: [18, 1],
        waypoints: [[14, 5], [16, 12], [18, 1]],
        army: levyArmy,
        home: 'lr4_depot_n',
        dormantUntil: 'lr4_second_bond',
        threshold: [3, 2],
        purpose: 'A levy the North Iron Depot can still pay. It marches on the freed districts only after a second bond breaks, and only while its depot stands.',
      },
      {
        commander: band('lr4_levy_w', 'West Depot Levy', RONIN_PORTRAIT),
        monster: true,
        bounty: { gold: 300 },
        start: [12, 11],
        waypoints: [[16, 12], [21, 14], [12, 11]],
        army: levyArmy,
        home: 'lr4_depot_w',
        dormantUntil: 'lr4_second_bond',
        threshold: [3, 2],
        purpose: 'A levy the West Iron Depot can still pay. It marches on the freed districts only after a second bond breaks, and only while its depot stands.',
      },
    ],
    objectives: [
      O.primary(
        'lr4_evacuate',
        'Evacuate the refuge',
        'Kurogane’s bound dead will reach Akashi Refuge on the announced day. Lead the refugees out — by the north road to Tsurugi Hill Camp or by the east road to Kawabe River Camp — and take charge of the camp. The refuge’s fighters and everything already learned go with Akane.',
        C.any(C.owned('tsurugi'), C.owned('kawabe')),
        { reward: { flags: ['lr4_camp_set'], creatures: [{ creatureId: 'japanese_nine_tailed_kitsune', count: 12 }, { creatureId: 'japanese_river_elder_kappa', count: 6 }] }, hint: 'No battle is needed to leave: the column only arrives on the announced day, and it is not waiting on either road.' },
      ),
      O.primary(
        'lr4_bonds',
        'Break two labour bonds',
        `Free two of the three districts that feed the Iron Castle: the Iron Foundry (${armyText(foundryGuard)}), the Bound-Dead Barracks (${armyText(barracksGuard)}) or the Castle Rice Store (${armyText(riceGuard)}).`,
        C.atLeast(2, C.cleared('lr4_foundry'), C.cleared('lr4_barracks'), C.cleared('lr4_rice')),
        { reward: { flags: ['lr4_second_bond'] }, hint: 'Freed districts become safe staging points. Freeing the barracks sends the column at the refuge home; freeing the foundry opens its ore tunnel into the castle.' },
      ),
      O.primary(
        'lr4_defend',
        'Hold against the recapture',
        `When the first bond breaks Kurogane sends one recapture force round the lower ring (${armyText(recaptureArmy)}). Beat it, or take the front gate it musters behind (${armyText(frontGateGuard)}).`,
        C.any(C.defeated('lr4_recapture'), C.cleared('lr4_front_gate')),
        { requires: ['lr4_evacuate'] },
      ),
      O.primary(
        'lr4_kurogane',
        'The Iron Daimyo',
        `Defeat Kurogane and his castle guard (${armyText(keepGuard)}) in the keep — by the broad front road through the front gate, the steep pilgrims’ road to the postern, or the foundry’s ore tunnel once it is open — and put out the Lantern of Oaths.`,
        C.cleared('lr4_keep'),
        { markerSiteId: 'lr4_keep', requires: ['lr4_evacuate', 'lr4_bonds', 'lr4_defend'], completesMission: true },
      ),
      O.optional('lr4_store', 'The refuge’s stores', 'Establish a safe camp before the bound dead reach the refuge: its stores go with the refugees (+1,500 Gold, +5 Wood, +5 Stone).', C.flag('lr4_camp_set'), { reward: { resources: { gold: 1500, wood: 5, stone: 5 } } }),
      O.optional('lr4_choice', 'The foundry’s future', 'At the Foundry Yard, once the foundry is free, decide whether it is dismantled or its ordinary workshops stay under local control.', C.any(C.flag('lr4_foundry_dismantled'), C.flag('lr4_workshops_kept')), { markerSiteId: 'lr4_foundry_yard' }),
      O.optional('lr4_depots', 'Empty the iron depots', `Take the North and West Iron Depots (${armyText(depotGuard4)} each): no levy marches after the second bond breaks.`, C.all(C.cleared('lr4_depot_n'), C.cleared('lr4_depot_w'))),
      O.optional('lr4_reclaim', 'The haniwa workshop', 'Fire the kiln of the abandoned workshop west of the foundry: clay figures can be hired there.', C.flag('lr4_kiln_fired'), { markerSiteId: 'lr4_kiln' }),
      O.optional('lr4_kami', 'A second kami', 'Commit to a second minor kami.', { type: 'player_has_minor_god', count: 2 }),
      O.optional('lr4_hot_spring', 'The hot spring', 'Visit the hot spring east of the castle.', C.visited('lr4_spring'), { markerSiteId: 'lr4_spring' }),
    ],
    timers: [
      {
        id: 'lr4_evac',
        label: 'The refuge’s stores',
        startWhen: C.all(),
        days: 3,
        metWhen: C.flag('lr4_camp_set'),
        consequence: 'If no safe camp is established by then, the refuge’s stores fall to the bound dead (the optional 1,500 Gold, 5 Wood and 5 Stone). The evacuation still counts whenever a camp is taken, and nothing else is lost.',
        announce: 'An evacuation warning from the road: Kurogane’s bound dead will reach the refuge at dusk on day 4.',
        onExpire: { flags: ['lr4_stores_lost'], failObjectives: ['lr4_store'] },
      },
      {
        id: 'lr4_march',
        label: 'The bound dead reach the refuge',
        startWhen: C.all(),
        days: 3,
        metWhen: C.flag('lr4_never'),
        consequence: 'The bound-dead column marches into the refuge valley and holds it. It attacks only an army it is sure to beat; freeing the Bound-Dead Barracks sends it home.',
        onExpire: { flags: ['lr4_column_marches'] },
      },
    ],
    evidence: [
      { id: 'lr4_ev_camp', flag: 'lr4_camp_set', title: 'A safe camp', text: 'The refugees of Akashi are behind walls, and the refuge’s fighters marched out with Akane.', icon: 'evacuation' },
      { id: 'lr4_ev_foundry', flag: 'lr4_foundry_free', title: 'The foundry freed', text: 'The bound dead at the furnaces are loose of their irons. The founders know the ore tunnel into the castle.', icon: 'evacuation' },
      { id: 'lr4_ev_barracks', flag: 'lr4_barracks_free', title: 'The barracks freed', text: 'The bound dead stop drilling. The column at the refuge has nowhere to report.', icon: 'evacuation' },
      { id: 'lr4_ev_rice', flag: 'lr4_rice_free', title: 'The rice store freed', text: 'The castle’s rice is the valley’s again.', icon: 'supply' },
      { id: 'lr4_ev_dismantled', flag: 'lr4_foundry_dismantled', title: 'The foundry pulled down', text: 'The chain-forge and the workshops came down together. The spirit road will be safer for it.', icon: 'branch' },
      { id: 'lr4_ev_workshops', flag: 'lr4_workshops_kept', title: 'Workshops under local hands', text: 'The chain-forge is broken; the founders keep the ordinary workshops and will send their work where Akane needs it.', icon: 'branch' },
      { id: 'lr4_ev_kurogane', flag: 'lr4_kurogane_down', title: 'The Lantern of Oaths is out', text: 'Kurogane is beaten in his keep, and the spirits he bound are walking home.', icon: 'evidence' },
    ],
    carried: ['lr4_kurogane_down', 'lr4_foundry_dismantled', 'lr4_workshops_kept', 'lr4_camp_set'],
    entryBonuses: [
      { fact: 'lr1_hidden_route', label: 'Yomogi’s people know a hidden path out of the refuge valley', flags: ['lr4_hidden_path'] },
      { fact: 'lr2_oni_freed', label: 'The red oni of the Red Hall march with Akane (3 Oni)', heroArmy: [{ creatureId: 'japanese_oni', count: 3 }] },
      { fact: 'lr3_names_published', label: 'The names on the Iron Castle’s gate: the rice-store ronin can be talked down', flags: ['lr4_names_read'] },
    ],
    briefing: [
      SHIRO('An evacuation warning came down the road at dawn, priestess: Kurogane’s bound dead are marching on the refuge. Three days, perhaps four.'),
      AKANE('Then we do not fight for Akashi. We take the people out — north to the hill camp at Tsurugi, or east to the river camp at Kawabe — and we come back for the castle.'),
      speaker(P, 'Kurogane')('Run, diviner. The dead need a lord as much as the living do, and I am a good one. Every soldier I have was found wandering.'),
      GENZO('His castle eats from three districts: the foundry, the barracks and the rice store. The dead are bound to work them. Break two of the bonds and the castle starves — then the broad front road, or the pilgrims’ climb to the back gate.'),
    ],
    briefingVariants: [
      { ifFlags: ['fact:lr3_mirrors_seen'], lines: [AKANE('The Hall of Mirrors showed me a lord in black iron beside the Lantern-Eater. What Kurogane binds, Yamikage eats.')] },
      { unlessFlags: ['fact:lr3_mirrors_seen'], lines: [GENZO('What Kurogane does with the dead once they are worked out, nobody has seen. Somebody must be buying.')] },
      { ifFlags: ['fact:lr3_names_published'], lines: [GENZO('The names from Gonryō’s registers are nailed to his gate. Some of his ronin at the rice store have found their own families on it.')] },
      { ifFlags: ['fact:lr1_hidden_route'], lines: [SHIRO('Yomogi’s people came with the warning. They know a path out of this valley that the bound dead will never find.')] },
      { ifFlags: ['fact:lr2_oni_freed'], lines: [SHIRO('And the red oni from the Red Hall are here. They want to meet the man who bought them.')] },
    ],
    victory: [
      AKANE('The Lantern of Oaths is out, and the dead he bound are walking home.'),
      speaker(P, 'Kurogane')('Every spirit you send home is a soldier I lose. Who will guard this road now?'),
      AKANE('People who are not bound to. The kirin meadow is next — they say the herd is penned there, to keep the border shut.'),
    ],
    scenes: [
      { id: 'lr4_camp', trigger: { type: 'objective_completed', objectiveId: 'lr4_evacuate' }, lines: [SHIRO('The camp is ours and the refugees are inside. The refuge’s fighters caught up with us on the road — nobody was left behind.'), AKANE('Then the castle.')] },
      { id: 'lr4_column', trigger: { type: 'flag', flag: 'lr4_column_marches' }, lines: [GENZO('The column is in the refuge valley. Rows of them, priestess, and not one looking at us.'), AKANE('They were sent to hold an empty valley. Let them hold it. The barracks that sent them is ours to take.')] },
      { id: 'lr4_stores', trigger: { type: 'flag', flag: 'lr4_stores_lost' }, lines: [SHIRO('The refuge’s stores are gone — the bound dead are carrying them up the valley. Only the stores.')] },
      { id: 'lr4_first', trigger: { type: 'flag', flag: 'lr4_first_bond' }, lines: [GENZO('The first bond is broken. Kurogane has seen it — a recapture force is coming out of the front gate onto the lower ring.'), AKANE('One force, one chance. Then the district stays free.')] },
      { id: 'lr4_second', trigger: { type: 'flag', flag: 'lr4_second_bond' }, lines: [GENZO('A second bond. Any depot he still holds will pay a levy to march on us.')] },
      { id: 'lr4_barracks_names', trigger: { type: 'site_cleared', siteId: 'lr4_barracks' }, ifFlags: ['fact:lr3_two_registers'], lines: [SHIRO('Priestess — these names are in Gonryō’s registers. The fleet stripped them, and Kurogane bound what was left.'), AKANE('Then read them their names, Shiro. All of them.')] },
      { id: 'lr4_barracks_plain', trigger: { type: 'site_cleared', siteId: 'lr4_barracks' }, unlessFlags: ['fact:lr3_two_registers'], lines: [SHIRO('They do not remember their own names. Kurogane took those too, or someone did before him.'), AKANE('Then we will find out who.')] },
      { id: 'lr4_foundry', trigger: { type: 'site_cleared', siteId: 'lr4_foundry' }, lines: [GENZO('The foundry is free. The founders say the ore tunnel runs straight into the castle courtyard — they can open it for us.')] },
      { id: 'lr4_kuro_battle', trigger: { type: 'battle_started', siteId: 'lr4_keep' }, lines: [speaker(P, 'Kurogane')('Every spirit you send home is a soldier I lose. Is that fair?'), AKANE('They were never yours to lose.')] },
      { id: 'lr4_lantern_out', trigger: { type: 'site_cleared', siteId: 'lr4_keep' }, lines: [AKANE('The Lantern of Oaths is out. Listen — the bound dead are dropping their tools.')] },
    ],
    loss: ['Akane must survive.', 'Leaving the refuge is the plan: Akashi has no dwellings to lose, and losing it is recoverable while Akane has an army.', 'A late departure costs only the refuge’s stores.'],
    help: [
      { id: 'lr4_withdraw', title: 'A planned withdrawal', text: 'The column arrives on the announced day and is not waiting on either road. Take either safe camp (Tsurugi in the north, Kawabe in the south-east): it has dwellings, and the refuge’s fighters join Akane there.' },
      { id: 'lr4_castle', title: 'The castle and its lower ring', text: 'The foundry, the barracks and the rice store sit on a ring road round the castle ridge. The front gate is the fast, defended way in; the pilgrims’ road climbs the north slope to an unguarded postern at a high cost; the freed foundry opens its ore tunnel. Kurogane sends one recapture force after the first bond breaks; each iron depot still standing sends a levy after the second.' },
    ],
  });
  const campBuildings = (extra: readonly string[]) => ['japanese_civic_hall_l1', 'japanese_tavern_l1', 'japanese_fortifications_l1', 'japanese_dwelling_t1_l1', 'japanese_dwelling_t1_l2', 'japanese_dwelling_t2_l1', 'japanese_dwelling_t2_l2', ...extra];
  const safeCamps: MissionTownSetup[] = [
      { townId: 'tsurugi', siteId: 'lr4_hill_camp', name: 'Tsurugi Hill Camp', archetypeId: 'japanese_castle_town', buildings: campBuildings(['japanese_pantheon_temple_l1', 'japanese_pantheon_temple_l2', 'japanese_dwelling_t3_l1', 'japanese_dwelling_t3_l2', 'japanese_mage_guild_l1']), population: { japanese_kitsune: 14, japanese_kappa: 9, japanese_tengu: 6 }, covenants: ['japanese_tengu'] },
      { townId: 'kawabe', siteId: 'lr4_river_camp', name: 'Kawabe River Camp', archetypeId: 'japanese_castle_town', buildings: campBuildings(['japanese_marketplace_l1', 'japanese_workshop_l1', 'japanese_dwelling_t4_l1', 'japanese_dwelling_t4_l2', 'japanese_mage_guild_l1', 'japanese_dwelling_t5_l1']), population: { japanese_kitsune: 14, japanese_kappa: 9, japanese_oni: 4, japanese_jorogumo: 3 }, covenants: [] },
  ];
  // The two safe camps are unowned towns: walking in takes charge of one (no garrison holds them).
  const m4: MissionDefinition = { ...m4base, neutralTowns: safeCamps };

  // =========================================================================
  // Chapter 5 — The Kirin Meadow (card 25; legacy m06)
  // =========================================================================
  const oboro = camp.v1('lantern_road_m06').sites.find((s) => s.id === 'm06_gate')?.guard?.commander;
  if (!oboro) throw new Error('Lantern Road v2: Oboro’s profile is missing from the legacy content');
  const OBORO = speaker(P, 'Oboro');
  const stepsGuard: Army = [['clay_golem', 8], ['bronze_golem', 2]];
  const stairGuard: Army = [['brigand_cutthroat', 24], ['tusked_boar', 6]];
  const vanguardGuard: Army = [['japanese_nine_tailed_kitsune', 30], ['bronze_golem', 3], ['japanese_queen_jorogumo', 2]];
  const ridersGuard: Army = [['brigand_cutthroat', 14], ['tusked_boar', 6]];
  const hostGuard: Army = [['japanese_nine_tailed_kitsune', 26], ['japanese_river_elder_kappa', 10], ['japanese_oni_warlord', 2]];
  const bindersGuard: Army = [['bronze_golem', 6]];
  const towerGuard: Army = [['japanese_nine_tailed_kitsune', 30], ['japanese_river_elder_kappa', 10], ['japanese_great_tengu', 4], ['japanese_oni_warlord', 3]];
  const outpostGuard: Army = [['brigand', 16], ['brigand_cutthroat', 6]];
  const m5 = chapter({
    campaign: camp,
    chapter: 5,
    card: 25,
    name: 'The Kirin Meadow',
    summary:
      'Oboro pens the kirin in the meadow at the heart of the cedar forest, claiming every passage invites the Lantern-Eater. Make a safe sanctuary, secure one of two migration corridors, then begin the migration and win the two interception battles his binding rite sends after the herd.',
    playtime: '55–75 minutes, 3–5 battles',
    legacy: ['lantern_road_m06'],
    economyFrom: 'lantern_road_m06',
    principal: 'lr5_migration',
    soundscape: 'shrine',
    hostileName: 'Oboro’s binders',
    town: { siteId: 'lr5_town', townId: 'takamori', name: 'Takamori' },
    map: {
      cols: 34,
      rows: 21,
      biome: 'autumn',
      base: 'plains',
      seed: 950005,
      texture: { forest: 260, rough: 30 },
      paint: [
        // The sanctuary glen in the north-west, walled off from Takamori's dell by a cliff; two corridor gaps east.
        { t: 'mountain', line: [[1, 9], [10, 9]], width: 0 },
        { t: 'mountain', cells: [[10, 1], [10, 2], [10, 3], [10, 4], [10, 5], [10, 6], [10, 7], [10, 8]] },
        { t: 'plains', disc: [5, 5, 2] },
        { t: 'mountain', cells: [[7, 1], [9, 2]] },
        // The ridge circuit's crags in the north, Oboro's tower on one of them.
        { t: 'rough', rect: [11, 1, 24, 5] },
        { t: 'mountain', cells: [[12, 1], [14, 2], [16, 1], [18, 2], [20, 1], [22, 2]] },
        // The meadow at the heart of the forest, and the three clearings.
        { t: 'plains', disc: [19, 10, 3] },
        { t: 'plains', disc: [12, 12, 1] },
        { t: 'plains', disc: [28, 10, 1] },
        // The binding grove off the meadow's east side, where Oboro's vanguard waits.
        { t: 'mountain', cells: [[22, 9], [23, 9], [24, 9], [22, 11], [23, 11], [24, 11], [25, 10]] },
        { t: 'plains', cells: [[23, 10], [24, 10]] },
        // The river in the south and its banks.
        { t: 'water', line: [[11, 20], [18, 18], [26, 17], [33, 15]], width: 0 },
        { t: 'marsh', cells: [[17, 17], [19, 17], [25, 16], [27, 16], [21, 17]] },
        // Takamori's dell.
        { t: 'plains', disc: [5, 15, 2] },
      ],
      roads: [
        // Out of Takamori to the West Clearing; the Sanctuary Stair (the short return).
        { via: ['lr5_town', [9, 13], [12, 12]] },
        { via: ['lr5_town', 'lr5_stair', 'lr5_sanctuary'] },
        // The two migration corridors into the glen.
        { via: [[12, 12], [11, 9], 'lr5_river_stair', [7, 6], 'lr5_sanctuary'] },
        { via: [[12, 12], [12, 7], 'lr5_ridge_steps', [7, 4]] },
        { via: [[7, 4], 'lr5_sanctuary'] },
        { via: [[7, 4], 'lr5_drum'] },
        { via: [[7, 4], 'lr5_host_gate', 'lr5_binders', 'lr5_host'] },
        { via: ['lr5_sanctuary', 'lr5_council'] },
        { via: ['lr5_sanctuary', 'lr5_baku'] },
        // The ridge circuit (north) and the riverside circuit (south), crossing at the three clearings.
        { via: [[12, 7], [16, 5], [24, 6], [28, 9]] },
        { via: [[12, 12], [15, 15], [22, 16], [28, 13], [28, 9]] },
        { via: [[12, 12], 'lr5_pens', [28, 11]] },
        { via: ['lr5_pens', 'lr5_vanguard_gate', 'lr5_riders', 'lr5_vanguard'] },
        // Spurs.
        { via: [[16, 5], 'lr5_tower'] },
        { via: [[22, 16], 'lr5_outpost'] },
        { via: [[15, 15], 'lr5_slingers'] },
        { via: [[24, 6], 'lr5_foal'] },
        { via: [[28, 13], 'lr5_ogres'] },
        { via: [[28, 9], 'lr5_quarry'] },
        { via: ['lr5_town', 'lr5_sawmill'] },
      ],
    },
    sites: [
      S.town('lr5_town', 'takamori', [4, 16], 'Takamori', 'The shrine-town at the edge of the cedar forest, where the herders keep the kirin festivals.', [5, 16]),
      S.resource('lr5_sawmill', [2, 13], 'sawmill'),
      S.resource('lr5_quarry', [31, 8], 'quarry'),
      // The sanctuary glen.
      S.activation('lr5_sanctuary', [5, 5], 'Old Kirin Sanctuary', 'A walled glen under the north crags where the kirin wintered before the pens. Its walls are down and its springs choked.', { cost: { gold: 1500, wood: 8, stone: 8 }, reward: { flags: ['lr5_sanctuary'], entitlementIds: ['covenant.japanese_kirin.lantern_road6'], questXp: 800 }, confirm: 'Rebuild the sanctuary’s walls and clear its springs (1,500 Gold, 8 Wood, 8 Stone)? The herders will unbar the Sanctuary Stair down to Takamori, and the kirin will accept a covenant (a Kirin meadow may be kept in one town).' }, null, { objectiveIds: ['lr5_sanctuary_obj'], marker: 'evacuation' }),
      S.shortcut('lr5_stair', [5, 9], 'Sanctuary Stair', 'The herders’ stair down the cliff from the sanctuary to Takamori — barred while the glen lay empty.', ['lr5_sanctuary']),
      S.activation('lr5_drum', [7, 3], 'Drum of the Just Age', 'The great drum the herders beat when the kirin come home.', { cost: { gold: 500 }, reward: { questXp: 1500, creatures: [{ creatureId: 'japanese_kirin', count: 2 }] }, requirements: [{ type: 'objective_completed', objectiveId: 'lr5_first' }, { type: 'objective_completed', objectiveId: 'lr5_second' }], completesMission: true, confirm: 'Beat the Drum of the Just Age (500 Gold)? The migration is complete; this ends The Kirin Meadow.' }, null, { objectiveIds: ['lr5_migration'] }),
      S.neutral('lr5_baku', [3, 6], 'Sanctuary Baku', 'Baku come down to the sanctuary’s springs to eat the nightmares of the penned herd. They will walk with Akane once the sanctuary is safe.', 'baku', 5, { flag: 'lr5_sanctuary', reason: 'The baku will not come to a ruined sanctuary: rebuild it first.' }),
      S.choice('lr5_council', [3, 3], 'Herders’ Council', 'The herders of Takamori gather at the sanctuary gate to decide how the border will be kept.', 'How the border is kept', 'The kirin are home, and the herders argue about what comes next. “One crossing,” says the eldest, “narrow, supervised, shut at night — we can hold that against anything, even at the last gate.” The young ones want the old paths back: “Every village had its own way through the forest once. Open them, and every village will stand with you.”', [
        { label: 'Preserve one narrow, supervised crossing', summary: 'A stronger defensive finale: at the Last Torii, Takamori’s herders hold Hikari (2 Celestial Kirin and 10 Great Tengu in its garrison).', reward: { flags: ['lr5_narrow_crossing'], questXp: 300 }, requiresFlags: ['lr5_sanctuary'] },
        { label: 'Reopen several local paths', summary: 'Broader settlement support: at the Last Torii, the forest villages send supplies (3,000 Gold, 10 Wood, 10 Stone, 4 Crystal).', reward: { flags: ['lr5_local_paths'], questXp: 300 }, requiresFlags: ['lr5_sanctuary'] },
      ], { marker: 'pact', objectiveIds: ['lr5_choice'] }),
      // The two migration corridors.
      S.crossing('lr5_ridge_steps', [10, 4], 'Haniwa Steps (the ridge corridor)', 'The steps where the ridge circuit drops into the sanctuary glen, held by clay figures. Oboro’s tower looks down on them.', { label: 'Step haniwa', army: stepsGuard, reward: { resources: { gold: 1000 } }, battlefield: 'ridge_pass' }),
      S.crossing('lr5_river_stair', [10, 8], 'Ronin Stair (the riverside corridor)', 'The stair beside the waterfall where the riverside path climbs into the glen, held by ronin and their boars.', { label: 'Stair ronin', army: stairGuard, reward: { resources: { gold: 1000 } }, battlefield: 'ridge_pass' }),
      // The meadow, the pens and the interceptions.
      S.choice('lr5_pens', [19, 10], 'Kirin Pens', 'The pens in the middle of the meadow where Oboro keeps the kirin herd. Their jailers have withdrawn into the binding grove beside them.', 'Begin the migration', 'The herders have the pen gates on their shoulders, waiting for the word. Once the gates are open there is no closing them: Oboro’s binders will come out of the grove at once, and his rite will send the rest of his host to the sanctuary three days later.', [
        { label: 'Open the pens and begin the migration', summary: 'Only with the sanctuary rebuilt and a corridor secured. Oboro’s rite begins: his vanguard comes out of the binding grove now, and his host reaches the sanctuary in three days (the deadline is shown in the journal). Nothing is lost if a battle goes badly; the kirin wait in the glen.', reward: { flags: ['lr5_rite_begun'], questXp: 300 }, requiresFlags: ['lr5_sanctuary', 'lr5_corridor'] },
      ], { marker: 'evacuation' }),
      S.shortcut('lr5_vanguard_gate', [22, 10], 'Binding Grove', 'The grove beside the pens, wrapped in Oboro’s haze. Nothing goes in; his vanguard comes out when the pens open.', ['lr5_rite_begun']),
      S.crossing('lr5_riders', [23, 10], 'Outpost Riders', 'Riders from the Binders’ Outpost, waiting in the grove to join the vanguard — unless their outpost has been taken and they have been turned home.', { label: 'Outpost riders', army: ridersGuard, reward: { resources: { gold: 400 } }, battlefield: 'grove' }),
      S.landmark('lr5_vanguard', [24, 10], 'Binders’ Vanguard', 'The jailers of the pens, come out of the grove to drive the herd back.', 'grove', { label: 'Binders’ vanguard', army: vanguardGuard, reward: { resources: { gold: 1500 }, flags: ['lr5_first_won'] }, battlefield: 'grove', required: true }, { objectiveIds: ['lr5_first'] }),
      S.shortcut('lr5_host_gate', [8, 2], 'Haze over the North Crags', 'Oboro’s haze over the gully above the sanctuary. His host will come down through it when his rite is complete.', ['lr5_host_arrives']),
      S.crossing('lr5_binders', [8, 1], 'Tower-bound Haniwa', 'Bronze figures bound by the tower’s stones, marching with the host — unless the binding stones are broken.', { label: 'Tower-bound haniwa', army: bindersGuard, reward: { resources: { gold: 500 } }, battlefield: 'ridge_pass' }),
      S.landmark('lr5_host', [9, 1], 'Oboro’s Binding Host', 'The rest of Oboro’s host, come down from the crags to bind the herd again at the sanctuary.', 'refuge', { label: 'The binding host', army: hostGuard, reward: { resources: { gold: 1500 }, flags: ['lr5_second_won'] }, battlefield: 'ridge_pass', required: true }, { objectiveIds: ['lr5_second'] }),
      S.choice('lr5_tower', [14, 3], 'Oboro’s Binding Tower', 'Oboro’s ritual tower on the crags, overlooking the ridge corridor. Its binding stones hold the bronze haniwa to his host.', 'The binding stones', 'Oboro’s guard is broken and the binding stones stand open in the tower’s top room, humming. Shiro puts his hand on one and snatches it away. “Break them, priestess, and the bronze ones go back to being statues.”', [
        { label: 'Break the binding stones', summary: 'The tower-bound haniwa never join the second interception (their crossing above the sanctuary stands empty).', reward: { flags: ['lr5_tower_broken'], questXp: 500 }, clearsSiteIds: ['lr5_binders'] },
      ], { guard: { label: 'Oboro and the tower guard', army: towerGuard.map(([creatureId, count]) => ({ creatureId, count })), commander: oboro, reward: { resources: { gold: 1500 }, artifactIds: ['lacquered_oyoroi'], flags: ['lr5_oboro_beaten'] }, battlefield: 'ridge_pass', required: true } }),
      S.choice('lr5_outpost', [22, 18], 'Binders’ Outpost', 'Oboro’s outpost by the river ford. Its riders are waiting in the binding grove to join his vanguard.', 'The outpost’s riders', 'The outpost is taken. Its quartermaster still has the riders’ pay chest and their orders: join the vanguard when the pens open.', [
        { label: 'Send word to the riders: their outpost has fallen', summary: 'The outpost riders in the binding grove go home: the first interception is the vanguard alone.', reward: { questXp: 300 }, clearsSiteIds: ['lr5_riders'] },
      ], { guard: { label: 'Outpost guard', army: outpostGuard.map(([creatureId, count]) => ({ creatureId, count })), reward: { resources: { gold: 600 } }, battlefield: 'open_field' } }),
      S.camp('lr5_slingers', [14, 15], 'Woodcutters’ Slinger Camp', 'Hill slingers who cut cedar on the riverside. Cheaper than baku, and better at range.', 'hill_slinger', 4, 8),
      S.choice('lr5_foal', [25, 4], 'A Kirin Foal', 'A kirin foal caught in a herder’s fence.', 'The Kirin Foal', 'The foal’s scales are the colour of new bronze. Cut free, it will remember you. Or the herder will trade you its shed horn-tip, which glows a little in the dark — he found it in the fence this morning.', [
        { label: 'Cut the foal free', summary: '+2 Crystal and +10 Favor.', reward: { resources: { crystal: 2, favor: 10 } } },
        { label: 'Read the horn-tip’s light', summary: 'Akane gains 1,000 experience.', reward: { questXp: 1000 } },
      ]),
      S.landmark('lr5_ogres', [31, 12], 'Ogre Shelter', 'Ogre chieftains asleep in a shelter of stolen saddles.', 'nest', { label: 'Ogre chieftains', army: [['ogre_chieftain', 2]], reward: { resources: { crystal: 6 } }, battlefield: 'grove' }),
    ],
    objectives: [
      O.primary(
        'lr5_corridor_obj',
        'A migration corridor',
        `Secure one of the two corridors the herd can take into the sanctuary glen: the Ronin Stair on the riverside path (${armyText(stairGuard)}) or the Haniwa Steps on the ridge, under Oboro’s tower (${armyText(stepsGuard)}).`,
        C.any(C.cleared('lr5_river_stair'), C.cleared('lr5_ridge_steps')),
        { reward: { flags: ['lr5_corridor'] }, hint: 'The tower overlooks only the ridge corridor; it cannot close both.' },
      ),
      O.primary('lr5_sanctuary_obj', 'A safe sanctuary', 'Rebuild the Old Kirin Sanctuary in the glen: walls up, springs cleared.', C.activated('lr5_sanctuary'), { markerSiteId: 'lr5_sanctuary', hint: 'Once rebuilt, the herders unbar the Sanctuary Stair: a short, safe way back to Takamori.' }),
      O.primary('lr5_begin', 'Begin the migration', 'When the sanctuary and a corridor are ready — and not before you choose — open the kirin pens in the meadow. Oboro’s rite starts only then.', C.flag('lr5_rite_begun'), { markerSiteId: 'lr5_pens', requires: ['lr5_corridor_obj', 'lr5_sanctuary_obj'] }),
      O.primary('lr5_first', 'The first interception', `Oboro’s vanguard (${armyText(vanguardGuard)}) comes out of the binding grove beside the pens. Beat it there — with the outpost riders (${armyText(ridersGuard)}) too, unless their outpost by the river was taken and they were sent home.`, C.all(C.cleared('lr5_riders'), C.cleared('lr5_vanguard')), { markerSiteId: 'lr5_vanguard', requires: ['lr5_begin'] }),
      O.primary('lr5_second', 'The second interception', `When the rite is complete, Oboro’s binding host (${armyText(hostGuard)}) comes down through the haze above the sanctuary. Beat it before it reaches the herd — with the tower-bound haniwa (${armyText(bindersGuard)}) too, unless the binding stones in Oboro’s tower were broken first.`, C.all(C.cleared('lr5_binders'), C.cleared('lr5_host')), { markerSiteId: 'lr5_host', requires: ['lr5_begin'] }),
      O.primary('lr5_migration', 'The migration completes', 'With both interceptions won and the sanctuary safe, beat the Drum of the Just Age in the glen.', C.activated('lr5_drum'), { markerSiteId: 'lr5_drum', requires: ['lr5_first', 'lr5_second'] }),
      O.optional('lr5_strike', 'Strike the binding tower', `Take Oboro’s binding tower above the ridge corridor (Oboro, ${armyText(towerGuard)}) and break its stones: the second interception is weaker.`, C.flag('lr5_tower_broken'), { markerSiteId: 'lr5_tower' }),
      O.optional('lr5_outpost_obj', 'The Binders’ Outpost', `Take the outpost by the river (${armyText(outpostGuard)}) and send its riders home: the first interception is weaker.`, C.cleared('lr5_riders'), { markerSiteId: 'lr5_outpost' }),
      O.optional('lr5_choice', 'How the border is kept', 'At the Herders’ Council by the sanctuary, choose one narrow supervised crossing or several reopened local paths.', C.any(C.flag('lr5_narrow_crossing'), C.flag('lr5_local_paths')), { markerSiteId: 'lr5_council' }),
      O.optional('lr5_foal_obj', 'The kirin foal', 'Visit the foal caught in the herder’s fence on the ridge.', C.visited('lr5_foal'), { markerSiteId: 'lr5_foal' }),
    ],
    timers: [
      {
        id: 'lr5_rite',
        label: 'Oboro’s binding rite',
        startWhen: C.flag('lr5_rite_begun'),
        days: 3,
        metWhen: C.flag('lr5_never'),
        consequence: 'When the rite is complete, Oboro’s binding host comes down through the haze above the sanctuary: the second interception battle. Nothing is lost while it waits, and no deadline ends the chapter.',
        announce: 'Oboro’s binding rite begins the moment the pens are opened; his host reaches the sanctuary three days later.',
        onExpire: { flags: ['lr5_host_arrives'] },
      },
    ],
    evidence: [
      { id: 'lr5_ev_sanctuary', flag: 'lr5_sanctuary', title: 'The sanctuary rebuilt', text: 'The Old Kirin Sanctuary has walls and springs again; the kirin accept Akane’s covenant.', icon: 'evacuation' },
      { id: 'lr5_ev_corridor', flag: 'lr5_corridor', title: 'A corridor secured', text: 'The herd has a way into the sanctuary glen.', icon: 'supply' },
      { id: 'lr5_ev_begun', flag: 'lr5_rite_begun', title: 'The pens are open', text: 'The kirin are moving. Oboro’s binding rite has begun.', icon: 'branch' },
      { id: 'lr5_ev_tower', flag: 'lr5_tower_broken', title: 'The binding stones broken', text: 'Oboro’s tower no longer binds the bronze haniwa to his host.', icon: 'evidence' },
      { id: 'lr5_ev_narrow', flag: 'lr5_narrow_crossing', title: 'One narrow crossing', text: 'The herders keep one supervised crossing through the forest and will hold Hikari at the end of the road.', icon: 'pact' },
      { id: 'lr5_ev_paths', flag: 'lr5_local_paths', title: 'The old paths reopened', text: 'Every forest village has its own path again, and every village will send what it can.', icon: 'pact' },
    ],
    carried: ['lr5_narrow_crossing', 'lr5_local_paths', 'lr5_tower_broken', 'lr5_oboro_beaten'],
    entryBonuses: [
      { fact: 'lr2_tengu_pact', label: 'The tengu of Kumoyama keep their word (4 Great Tengu join Akane)', heroArmy: [{ creatureId: 'japanese_great_tengu', count: 4 }] },
      { fact: 'lr3_registers_returned', label: 'The shore families send their thanks inland (1,500 Gold)', wallet: { gold: 1500 } },
    ],
    briefing: [
      GENZO('The kirin only walk where a just ruler reigns, the herders say. For a year no one has seen one. Oboro keeps them penned in the meadow at the heart of the forest.'),
      speaker(P, 'Oboro')('Every road you open is a road the Lantern-Eater walks, diviner. I pen the herd to keep the border shut. What have your lanterns brought but hunger?'),
      AKANE('Then I will prove a road can be opened safely. A sanctuary first, and a corridor for the herd — and only then do we open the pens.'),
      SHIRO('The moment the pens open his rite begins. His vanguard is in the grove beside them; the rest of his host comes three days later. His tower watches the ridge corridor. It cannot watch the river too.'),
    ],
    briefingVariants: [
      { ifFlags: ['fact:lr2_tengu_pact'], lines: [SHIRO('The tengu of Kumoyama have come down the mountain. The abbot said they would, if we ever asked.')] },
      { ifFlags: ['fact:lr2_bell_seized'], lines: [GENZO('No tengu, though. Kumoyama has not forgotten the Crow Hall.')] },
      { ifFlags: ['fact:lr3_registers_returned'], lines: [GENZO('Shiogama’s families sent silver up the river road — for the woman who brought their dead home by name.')] },
      { ifFlags: ['fact:lr4_foundry_dismantled'], lines: [AKANE('Oboro says every open road invites the Lantern-Eater. Akashi pulled down its chain-forge to keep the spirit road safe. Roads can be kept, not only closed.')] },
    ],
    victory: [
      AKANE('The kirin walk again, and the sanctuary holds. From the glen I could see the last stretch of the road — the last torii, and the dark palace across it.'),
      GENZO('Oboro said every open road invites the Lantern-Eater. We opened one, and it held.'),
    ],
    scenes: [
      { id: 'lr5_corridor', trigger: { type: 'objective_completed', objectiveId: 'lr5_corridor_obj' }, lines: [SHIRO('The way into the glen is clear. The herders are already counting the kirin.')] },
      { id: 'lr5_sanct', trigger: { type: 'flag', flag: 'lr5_sanctuary' }, lines: [GENZO('The walls are up and the springs run. The herders have unbarred the Sanctuary Stair — Takamori is a short climb down.'), AKANE('And the baku have come to the springs. A good sign.')] },
      { id: 'lr5_begun', trigger: { type: 'flag', flag: 'lr5_rite_begun' }, lines: [SHIRO('The pens are open! The herd is moving — and the grove beside the pens is boiling with Oboro’s binders.'), AKANE('Meet them at the grove. The rest of his host will come down on the sanctuary in three days.')] },
      { id: 'lr5_host_due', trigger: { type: 'flag', flag: 'lr5_host_arrives' }, lines: [GENZO('The haze is pouring down the crags above the sanctuary. His host is coming.')] },
      { id: 'lr5_tower_battle', trigger: { type: 'battle_started', siteId: 'lr5_tower' }, lines: [YAMIKAGE('Oboro, my general, has never shown his face. Shall I tell you why? There is no face. Only my hunger, wearing armour.')] },
      { id: 'lr5_tower_down', trigger: { type: 'site_cleared', siteId: 'lr5_tower' }, lines: [SHIRO('The armour is empty. There really was no one inside.'), AKANE('Then there is one less thing to bury. Now the stones.')] },
      { id: 'lr5_withdraw', trigger: { type: 'site_cleared', siteId: 'lr5_host' }, unlessFlags: ['lr5_oboro_beaten'], lines: [GENZO('His host is broken. Up on the tower, Oboro’s armour turns away into the haze.'), OBORO('Keep your road, diviner. You will see what walks down it.')] },
      { id: 'lr5_host_beaten', trigger: { type: 'site_cleared', siteId: 'lr5_host' }, ifFlags: ['lr5_oboro_beaten'], lines: [GENZO('The host is broken, and there is no general left to call it back.')] },
    ],
    loss: ['Akane must survive.', 'Losing Takamori is recoverable while Akane has an army.', 'Oboro’s rite schedules battles; it never ends the chapter.'],
    help: [
      { id: 'lr5_rings', title: 'Two circuits, three clearings', text: 'The ridge circuit (north) and the riverside circuit (south) cross at the West Clearing, the meadow and the East Clearing. The ridge corridor (Haniwa Steps) and the riverside corridor (Ronin Stair) lead into the sanctuary glen; the Sanctuary Stair down to Takamori opens once the sanctuary is rebuilt.' },
      { id: 'lr5_rite_help', title: 'The binding rite', text: 'Nothing happens until Akane opens the pens. Then Oboro’s vanguard comes out of the grove beside them at once, and his host comes down above the sanctuary three days later. Taking the riverside outpost first sends its riders home; breaking the tower’s binding stones keeps the bronze haniwa out of the second battle.' },
    ],
  });

  // =========================================================================
  // Chapter 6 — The Last Torii (card 26; legacy m07)
  // =========================================================================
  const v1m07 = camp.v1('lantern_road_m07');
  const yamikage = v1m07.sites.find((s) => s.id === 'm07_hall')?.guard?.commander;
  const kagero = v1m07.hostileHeroes[0]?.commander;
  if (!yamikage || !kagero) throw new Error('Lantern Road v2: Yamikage’s or Kagerō’s profile is missing from the legacy content');
  const KAGERO = speaker(P, 'Kagerō', 'kagero');
  const SHADE_PORTRAIT = 'creature.japanese.tier1.upgraded.portrait';
  const westPathGuard: Army = [['japanese_nine_tailed_kitsune', 30], ['japanese_river_elder_kappa', 6]];
  const eastPathGuard: Army = [['japanese_kirin', 2], ['japanese_nine_tailed_kitsune', 12]];
  const palaceGuard: Army = [['japanese_great_tengu', 2], ['japanese_nine_tailed_kitsune', 20], ['japanese_nine_tailed_kitsune', 20], ['japanese_river_elder_kappa', 12], ['japanese_celestial_kirin', 2], ['japanese_queen_jorogumo', 2]];
  const nexusGuard: Army = [['japanese_nine_tailed_kitsune', 24], ['japanese_river_elder_kappa', 8], ['japanese_great_tengu', 2]];
  const hollowGuard: Army = [['japanese_nine_tailed_kitsune', 16], ['japanese_jorogumo', 2]];
  const shadeArmy: Army = [['japanese_nine_tailed_kitsune', 14], ['japanese_river_elder_kappa', 4]];
  const districts = [
    { key: 'fox', id: 'lr6_fox', at: [33, 4] as const, name: 'Fox Shrine of the Thousand Gates', desc: 'A spirit shrine on the far bank, its red gates running up the hill — dark since the foxes forgot whom they served.', reinf: [['japanese_nine_tailed_kitsune', 12]] as Army, reinfText: '12 Nine-Tailed Kitsune' },
    { key: 'minori', id: 'lr6_minori', at: [10, 20] as const, name: 'Rice Villages of Minori', desc: 'Living villages in the southern paddies, whose festival lanterns hang unlit: nobody there remembers whom to light them for.', reinf: [['japanese_river_elder_kappa', 8]] as Army, reinfText: '8 River Elder Kappa' },
    { key: 'grave', id: 'lr6_grave', at: [33, 20] as const, name: 'Bon Grave Shrine', desc: 'The spirit shrine of the graves on the far bank, where the dead are welcomed home each summer. Its grave-markers are blank.', reinf: [['japanese_oni_warlord', 2]] as Army, reinfText: '2 Oni Warlords' },
    { key: 'kawa', id: 'lr6_kawa', at: [10, 4] as const, name: 'Kawa Ferry Village', desc: 'A living ferry village on the north road, where the old ferrymen kept the names of everyone they carried across.', reinf: [['japanese_great_tengu', 3]] as Army, reinfText: '3 Great Tengu' },
  ];
  const memFlag = (k: string) => `lr6_mem_${k}`;
  const dimFlag = (k: string) => `lr6_dim_${k}`;
  const m6 = chapter({
    campaign: camp,
    chapter: 6,
    card: 26,
    name: 'The Last Torii',
    summary:
      'Yamikage cannot be starved by lanterns alone: the names he ate must be remembered. Bring the records home to three of the four districts — living villages and spirit shrines — secure a passage to the Last Torii, defeat the Lantern-Eater, and decide how the road between the worlds is kept.',
    playtime: '85–110 minutes, 5–7 battles',
    legacy: ['lantern_road_m07'],
    economyFrom: 'lantern_road_m07',
    principal: 'lr6_yamikage',
    soundscape: 'storm_plateau',
    hostileName: 'The Lantern-Eater’s Procession',
    town: { siteId: 'lr6_town', townId: 'hikari', name: 'Hikari' },
    map: {
      cols: 42,
      rows: 24,
      biome: 'autumn',
      base: 'plains',
      seed: 950006,
      texture: { forest: 90, rough: 50 },
      paint: [
        // The River of Names between the living land (west) and the spirit land (east), split round the Last Torii's island.
        { t: 'water', line: [[21, 0], [21, 8]], width: 0 },
        { t: 'water', line: [[21, 8], [18, 12], [21, 16]], width: 0 },
        { t: 'water', line: [[21, 8], [24, 12], [21, 16]], width: 0 },
        { t: 'water', line: [[21, 16], [21, 23]], width: 0 },
        // The Lantern-Eater's palace on the island's crag, with two doors onto the torii courtyard.
        { t: 'mountain', cells: [[20, 9], [21, 9], [22, 9], [20, 10], [22, 10], [22, 11]] },
        // The ash fields inside the living circuit, the shadow grove inside the spirit circuit.
        { t: 'rough', blob: [12, 13, 3] },
        { t: 'forest', blob: [31, 12, 3] },
        { t: 'forest', blob: [6, 7, 1] },
        { t: 'marsh', cells: [[9, 21], [11, 21], [12, 20], [8, 20]] },
        { t: 'rough', blob: [38, 20, 1] },
      ],
      roads: [
        // The living circuit (west): Hikari — Kawa — the north bridge head — the west bank — the south bridge head — Minori — Hikari.
        { via: ['lr6_town', [6, 9], 'lr6_kawa'] },
        { via: ['lr6_kawa', [16, 5], [19, 6], [17, 10], [17, 15], [19, 19], [14, 20], 'lr6_minori'] },
        { via: ['lr6_town', [6, 16], 'lr6_minori'] },
        // The spirit circuit (east): the bridge heads — the Fox Shrine — the reserve nexus — the Bon Grave Shrine.
        { via: [[23, 6], [27, 4], 'lr6_fox'] },
        { via: ['lr6_fox', [37, 8], 'lr6_nexus'] },
        { via: ['lr6_nexus', [37, 16], 'lr6_grave'] },
        { via: ['lr6_grave', [27, 20], [23, 19], [25, 15], [25, 10], [23, 6]] },
        // The four fixed crossings: the north and south bridges, and the two torii paths through the island.
        { via: [[19, 6], 'lr6_north_bridge', [23, 6]] },
        { via: [[19, 19], 'lr6_south_bridge', [23, 19]] },
        { via: [[17, 12], 'lr6_west_path', [19, 12], [20, 12]] },
        { via: [[25, 12], 'lr6_east_path', [23, 12], [22, 12]] },
        { via: [[17, 10], [17, 12]] },
        { via: [[25, 10], [25, 12]] },
        // The torii courtyard: two palace doors, the Last Torii.
        { via: [[20, 12], 'lr6_west_door', 'lr6_palace'] },
        { via: [[22, 12], 'lr6_east_door', 'lr6_palace'] },
        { via: [[20, 12], [21, 13], 'lr6_torii'] },
        // The short dangerous ways across the ash fields and through the shadow grove; the Lantern Bridge.
        { via: ['lr6_town', [12, 12], [17, 12]] },
        { via: [[25, 12], [31, 11], 'lr6_nexus'] },
        { via: [[16, 5], 'lr6_lantern_bridge', [27, 4]] },
        // Spurs.
        { via: [[12, 12], 'lr6_ash_hollow'] },
        { via: [[6, 9], 'lr6_sanctuary'] },
        { via: ['lr6_town', 'lr6_smiths'] },
        { via: ['lr6_town', 'lr6_lookout'] },
        { via: ['lr6_town', 'lr6_offerings'] },
        { via: [[37, 16], 'lr6_crags'] },
        { via: [[37, 8], 'lr6_crystal'] },
        { via: ['lr6_town', 'lr6_sawmill'] },
        { via: ['lr6_minori', 'lr6_quarry'] },
      ],
    },
    sites: [
      S.town('lr6_town', 'hikari', [3, 12], 'Hikari', 'The last town before the spirits’ road, where the lantern-makers live.', [4, 12]),
      S.resource('lr6_sawmill', [2, 8], 'sawmill'),
      S.resource('lr6_quarry', [6, 21], 'quarry'),
      S.resource('lr6_crystal', [39, 7], 'crystal_deposit'),
      // The four districts.
      ...districts.map((d) =>
        S.activation(d.id, d.at, d.name, d.desc, { cost: { gold: 600, crystal: 1 }, reward: { flags: [memFlag(d.key)], questXp: 800, resources: { favor: 5 } }, confirm: `Read the names back at ${d.name} (600 Gold for lamp oil and paper, 1 Crystal)? Shiro’s book holds them.` }, null, { objectiveIds: ['lr6_memories'], marker: 'evidence' }),
      ),
      // The four fixed crossings, the Lantern Bridge and the island.
      S.crossing('lr6_north_bridge', [21, 6], 'North Bridge', 'A plank bridge over the River of Names on the north road — the long, safe way to the far bank.', null),
      S.crossing('lr6_south_bridge', [21, 19], 'South Bridge', 'A plank bridge over the River of Names on the south road — the long, safe way to the far bank.', null),
      S.shortcut('lr6_lantern_bridge', [21, 3], 'Lantern Bridge', 'The ferrymen’s old bridge of lanterns over the river’s upper reach. Kawa’s ferrymen will light it again once their names are back.', [memFlag('kawa')]),
      S.crossing('lr6_west_path', [18, 12], 'West Torii Path', 'The causeway from the living bank onto the Last Torii’s island, held by Yamikage’s fox guard.', { label: 'Torii path guard', army: westPathGuard, reward: { resources: { gold: 1000 }, flags: ['lr6_passage'] }, battlefield: 'ridge_pass' }),
      S.crossing('lr6_east_path', [24, 12], 'East Torii Path', 'The causeway from the spirit bank onto the island, where penned kirin stand guard against their will.', { label: 'Captive kirin', army: eastPathGuard, reward: { resources: { gold: 1000 }, flags: ['lr6_passage'] }, battlefield: 'ridge_pass' }),
      S.shortcut('lr6_west_door', [20, 11], 'Palace West Door', 'The palace’s west door. It does not open for light — only for remembered names.', ['lr6_three_memories']),
      S.shortcut('lr6_east_door', [21, 11], 'Palace East Door', 'The palace’s east door. It does not open for light — only for remembered names.', ['lr6_three_memories']),
      S.landmark('lr6_palace', [21, 10], 'Palace of the Lantern-Eater', 'A palace built across the spirits’ road on the island’s crag, dark as an empty lantern.', 'refuge', { label: 'Yamikage and the dark court', army: palaceGuard, commander: yamikage, reward: { resources: { gold: 2000 }, flags: ['lr6_yamikage_down'], questXp: 3000 }, battlefield: 'beacon_clearing', required: true }, { objectiveIds: ['lr6_yamikage'] }),
      S.choice(
        'lr6_torii',
        [21, 14],
        'The Last Torii',
        'The last gate of the spirits’ road, on the southern tip of the island. Every spirit that ever went home went through it.',
        'The Road Between Worlds',
        'With Yamikage gone, the road is Akane’s to set, and the villages that got their names back are waiting to hear how. Shiro holds out his book. “Keep the torii open all year,” he says, “and somebody has to stand at it every night. I will, if you want — and wardens after me. The dead can come home any night, and nothing else comes with them.” The headman of Minori shakes his head. “Or open it on the festival nights only, the old way, and let each village keep its own lanterns and its own keeper. Slower. Ours.”',
        [
          { label: 'Permanent passages, supervised', summary: 'The Last Torii stays open all year under wardens, Shiro the first of them. Ends the campaign.', reward: { flags: ['lr_passages_supervised'], questXp: 500 }, requiresFlags: ['lr6_yamikage_down'] },
          { label: 'Seasonal openings, kept by local keepers', summary: 'The torii opens on the festival nights; each village keeps its own lanterns and keeper. Ends the campaign.', reward: { flags: ['lr_openings_seasonal'], questXp: 500 }, requiresFlags: ['lr6_yamikage_down'] },
        ],
        { marker: 'pact', objectiveIds: ['lr6_choice'] },
      ),
      // Kagerō's reserve nexus and the shades' hollow.
      S.landmark('lr6_nexus', [38, 12], 'Reserve Nexus', 'Where the spirit circuit’s roads knot together at the far edge of the shadow grove: Yamikage’s reserve, and the warden who walks between his stones.', 'grove', { label: 'Kagerō and the reserve', army: nexusGuard, commander: kagero, reward: { resources: { gold: 1500, crystal: 3 }, flags: ['lr6_nexus_taken'] }, battlefield: 'ridge_pass', required: true }),
      S.landmark('lr6_ash_hollow', [12, 15], 'Ash Hollow', 'A burnt hollow in the ash fields where Yamikage’s shades gather between raids on the living circuit.', 'grove', { label: 'Shades of the hollow', army: hollowGuard, reward: { resources: { gold: 800 } }, battlefield: 'grove' }),
      // Neutrals, gifts and caches.
      S.choice('lr6_sanctuary', [6, 6], 'Mixed Sanctuary', 'A misty cedar sanctuary above Hikari where baku, slingers and wyverns all shelter from the dark. It can spare one band.', 'One band from the sanctuary', 'The keeper of the sanctuary bows. “One band can go with you to the torii. The rest stay to guard the children.”', [
        { label: '5 Baku', summary: 'Costs 1,200 Gold. 5 Baku join Akane.', cost: { gold: 1200 }, reward: { creatures: [{ creatureId: 'baku', count: 5 }] } },
        { label: '10 Sling Masters', summary: 'Costs 1,300 Gold. 10 Sling Masters join Akane.', cost: { gold: 1300 }, reward: { creatures: [{ creatureId: 'sling_master', count: 10 }] } },
        { label: '4 Wyverns', summary: 'Costs 1,440 Gold. 4 Wyverns join Akane.', cost: { gold: 1440 }, reward: { creatures: [{ creatureId: 'wyvern', count: 4 }] } },
      ], { art: 'neutral_dwelling.baku', marker: 'pact' }),
      S.choice('lr6_smiths', [5, 14], 'Akashi Smiths’ Cart', 'A cart up from Akashi with the founders’ mark on its side.', 'The founders’ cart', 'The founders of Akashi have sent what their workshops could make. If the workshops still stand, there is armour in the cart; if not, only lamp oil for the road.', [
        { label: 'Take the founders’ armour', summary: 'Only if Akashi kept its workshops: the Lacquered Ō-yoroi joins Akane’s pack.', reward: { artifactIds: ['lacquered_oyoroi'] }, requiresFlags: ['lr6_smiths'] },
        { label: 'Take the lamp oil', summary: '+5 Favor.', reward: { resources: { favor: 5 } } },
      ]),
      S.watchtower('lr6_lookout', [6, 11], 'Lantern-makers’ Tower', 'The lantern-makers’ drying tower above Hikari. From its top the whole road is in sight: the island and its torii in the middle of the river, and the four districts that have gone quiet.', ['lr6_palace', 'lr6_torii', 'lr6_kawa', 'lr6_minori', 'lr6_fox', 'lr6_grave', 'lr6_nexus']),
      S.depot('lr6_offerings', [3, 15], 'Lantern-makers’ Offerings', 'Offerings left by generations of lantern-makers for the road.', { resources: { gold: 1500, crystal: 3 } }),
      S.landmark('lr6_crags', [38, 18], 'Wyvern Crags', 'Wyverns roost above the grave road.', 'nest', { label: 'Crag wyverns', army: [['wyvern_matriarch', 3]], reward: { resources: { crystal: 6 } }, battlefield: 'grove' }),
    ],
    patrols: [
      {
        commander: band('lr6_west_shades', 'Shades of the Ash Fields', SHADE_PORTRAIT),
        monster: true,
        bounty: { gold: 500 },
        start: [13, 11],
        waypoints: [[8, 14], [16, 9], [16, 16], [13, 11]],
        army: shadeArmy,
        home: 'lr6_ash_hollow',
        threshold: [3, 2],
        purpose: 'Raids the short way across the ash fields inside the living circuit. Taking Ash Hollow ends it.',
      },
      {
        commander: band('lr6_east_shades', 'Shades of the Grove', SHADE_PORTRAIT),
        monster: true,
        bounty: { gold: 500 },
        start: [30, 12],
        waypoints: [[27, 10], [33, 9], [33, 15], [27, 14]],
        army: shadeArmy,
        home: 'lr6_nexus',
        threshold: [3, 2],
        purpose: 'Raids the short way through the shadow grove inside the spirit circuit. Kagerō’s reserve nexus replenishes it: taking the nexus ends it.',
      },
    ],
    objectives: [
      O.primary(
        'lr6_passage',
        'A passage to the Last Torii',
        `Secure one of the two torii paths onto the island: the West Torii Path from the living bank (${armyText(westPathGuard)}) or the East Torii Path from the spirit bank (${armyText(eastPathGuard)}).`,
        C.any(C.cleared('lr6_west_path'), C.cleared('lr6_east_path')),
      ),
      O.primary(
        'lr6_memories',
        'Three memories restored',
        'Bring the names home to three of the four districts and read them aloud: Kawa Ferry Village and the Rice Villages of Minori on the living circuit, the Fox Shrine and the Bon Grave Shrine on the spirit circuit. Each can be reached by the long, safe circuit road or the short way where the shades raid.',
        C.atLeast(3, C.flag(memFlag('kawa')), C.flag(memFlag('minori')), C.flag(memFlag('fox')), C.flag(memFlag('grave'))),
        { reward: { flags: ['lr6_three_memories'] }, hint: 'A restored memory stays restored. A dimmed district loses only its reinforcements; its names can still be read.' },
      ),
      O.primary(
        'lr6_yamikage',
        'The Lantern-Eater',
        `With three memories restored the palace doors open. Defeat Yamikage and the dark court (${armyText(palaceGuard)}) in the palace on the island — by its west or east door.`,
        C.cleared('lr6_palace'),
        { markerSiteId: 'lr6_palace', requires: ['lr6_passage', 'lr6_memories'] },
      ),
      O.primary('lr6_choice', 'The road between worlds', 'At the Last Torii, decide how the road is kept: permanent supervised passages, or seasonal openings kept by local keepers.', C.any(C.flag('lr_passages_supervised'), C.flag('lr_openings_seasonal')), { markerSiteId: 'lr6_torii', requires: ['lr6_yamikage'], completesMission: true }),
      ...districts.map((d) => O.optional(`lr6_reinf_${d.key}`, `${d.name}: before the dimming`, `Restore the memory at ${d.name} before Yamikage dims it: the district sends ${d.reinfText} to Akane.`, C.flag(memFlag(d.key)), { markerSiteId: d.id, reward: { creatures: d.reinf.map(([creatureId, count]) => ({ creatureId, count })) } })),
      O.optional('lr6_reserve', 'Kagerō’s reserve nexus', `Take the reserve nexus at the far edge of the shadow grove from Kagerō (${armyText(nexusGuard)}): the shades of the grove are no longer replenished.`, C.cleared('lr6_nexus'), { markerSiteId: 'lr6_nexus' }),
      O.optional('lr6_hollow', 'Ash Hollow', `Clear Ash Hollow (${armyText(hollowGuard)}): the shades of the ash fields stop raiding.`, C.cleared('lr6_ash_hollow'), { markerSiteId: 'lr6_ash_hollow' }),
      O.optional('lr6_band', 'The mixed sanctuary', 'Visit the mixed sanctuary above Hikari: one band can go with Akane.', C.visited('lr6_sanctuary'), { markerSiteId: 'lr6_sanctuary' }),
    ],
    timers: districts.map((d, i) => {
      const prev = districts[i - 1];
      const startWhen = i === 0 ? C.all() : C.any(C.flag(dimFlag(prev!.key)), C.flag(memFlag(prev!.key)), ...(i === 1 ? [C.flag('lr6_safe_road')] : []));
      const metWhen = i === 0 ? C.any(C.flag(memFlag(d.key)), C.flag('lr6_safe_road')) : C.flag(memFlag(d.key));
      return {
        id: `lr6_dimming_${d.key}`,
        label: `Yamikage dims ${d.name}`,
        startWhen,
        days: 6,
        metWhen,
        consequence: `${d.name} goes dark: its reinforcements (${d.reinfText}) are lost. Its names can still be read there afterwards, and every memory already restored stays restored.`,
        announce: i === 0 ? `Yamikage has named the first district he will dim: ${d.name}, in six days. The next is named when it is dimmed or restored.` : `Yamikage names the next district he will dim: ${d.name}, in six days.`,
        onExpire: { flags: [dimFlag(d.key)], failObjectives: [`lr6_reinf_${d.key}`] },
      };
    }),
    evidence: [
      ...districts.map((d) => ({ id: `lr6_ev_${d.key}`, flag: memFlag(d.key), title: `${d.name} remembers`, text: `The names were read aloud at ${d.name}. They stay remembered whatever Yamikage does now.`, icon: 'evidence' as const })),
      ...districts.map((d) => ({ id: `lr6_ev_dim_${d.key}`, flag: dimFlag(d.key), title: `${d.name} dimmed`, text: `Yamikage dimmed ${d.name}; its reinforcements were lost, not its names.`, icon: 'branch' as const })),
      { id: 'lr6_ev_yamikage', flag: 'lr6_yamikage_down', title: 'The Lantern-Eater falls', text: 'Yamikage is defeated in his palace across the road.', icon: 'evidence' },
      { id: 'lr6_ev_supervised', flag: 'lr_passages_supervised', title: 'Permanent passages', text: 'The Last Torii stays open all year, kept by wardens — Shiro the first.', icon: 'pact' },
      { id: 'lr6_ev_seasonal', flag: 'lr_openings_seasonal', title: 'Seasonal openings', text: 'The torii opens on the festival nights; each village keeps its own lanterns and keeper.', icon: 'pact' },
    ],
    carried: ['lr_passages_supervised', 'lr_openings_seasonal'],
    entryBonuses: [
      { fact: 'lr3_registers_returned', label: 'The shore families keep watch at Hikari (10 River Elder Kappa)', garrison: [{ creatureId: 'japanese_river_elder_kappa', count: 10 }] },
      { fact: 'lr3_names_published', label: 'The published names are read on every road (10 Favor)', wallet: { favor: 10 } },
      { fact: 'lr4_foundry_dismantled', label: 'A safer spirit road: with the chain-forge gone, Yamikage cannot dim the first district', flags: ['lr6_safe_road'] },
      { fact: 'lr4_workshops_kept', label: 'Akashi’s workshops send armour (at the founders’ cart in Hikari)', flags: ['lr6_smiths'] },
      { fact: 'lr5_narrow_crossing', label: 'Takamori’s herders hold Hikari (2 Celestial Kirin, 10 Great Tengu)', garrison: [{ creatureId: 'japanese_celestial_kirin', count: 2 }, { creatureId: 'japanese_great_tengu', count: 10 }] },
      { fact: 'lr5_local_paths', label: 'The forest villages send supplies (3,000 Gold, 10 Wood, 10 Stone, 4 Crystal)', wallet: { gold: 3000, wood: 10, stone: 10, crystal: 4 } },
    ],
    briefing: [
      AKANE('The last torii. Every spirit that ever went home went through it, and Yamikage has built his palace across the road beyond it.'),
      SHIRO('Lighting lanterns will not starve him, priestess. He has eaten names — whole villages’ worth. Light shows the road; it does not tell the dead who they are.'),
      GENZO('Then we bring the names back. Shiro’s book, the registers, the lists — read them at the villages and the shrines that kept them. Three districts should be enough to open his doors.'),
      YAMIKAGE('Come and be eaten, little light. Every name you read, I will dim another village.'),
      AKANE('Two circuits, priestess and scribe: the living villages on this bank, the spirit shrines on the far one. Four crossings, and the torii in the middle.'),
    ],
    briefingVariants: [
      { ifFlags: ['fact:lr3_registers_returned'], lines: [SHIRO('The shore families of Shiogama came up the road with their registers. They are keeping watch on Hikari’s walls.')] },
      { ifFlags: ['fact:lr3_names_published'], lines: [GENZO('The names we nailed to the Iron Castle’s gate have been copied onto every shrine board from here to the sea.')] },
      { ifFlags: ['fact:lr4_foundry_dismantled'], lines: [GENZO('Akashi pulled down its chain-forge. Yamikage has no iron left to dim the Fox Shrine with — the road there is safe.')] },
      { ifFlags: ['fact:lr4_workshops_kept'], lines: [GENZO('The founders of Akashi sent a cart up the road. It is waiting in Hikari.')] },
      { ifFlags: ['fact:lr5_narrow_crossing'], lines: [SHIRO('Takamori’s herders came through their one narrow crossing — kirin and tengu both. They will hold Hikari.')] },
      { ifFlags: ['fact:lr5_local_paths'], lines: [SHIRO('And every forest village sent a cart down its own path. We will not run short.')] },
      { ifFlags: ['fact:lr1_hidden_route'], lines: [SHIRO('Yomogi sent word as well. Their lantern is still dark — by choice. They want to know how the road will be kept.')] },
      { ifFlags: ['fact:lr1_lit_public'], lines: [SHIRO('Yomogi’s lantern has burned every night since the festival. They want to know how the road will be kept.')] },
    ],
    victory: [
      AKANE('The road is open. I can see them — thousands of little lights, and every one of them knows its own name.'),
      SHIRO('I read the last of them myself, priestess. My grandmother’s brother went through just now.'),
    ],
    scenes: [
      { id: 'lr6_lookout_seen', trigger: { type: 'site_visited', siteId: 'lr6_lookout' }, lines: [GENZO('There it is — the last torii, on its island in the river, and the palace across the road behind it. Every lantern-maker in Hikari has looked at it from this tower all his life.'), AKANE('Then let them watch us cross.')] },
      { id: 'lr6_passage_won', trigger: { type: 'flag', flag: 'lr6_passage' }, lines: [GENZO('The torii path is ours. The palace doors are shut — they do not open for light.'), SHIRO('Only for names. Three districts, priestess.')] },
      { id: 'lr6_east_kirin', trigger: { type: 'site_cleared', siteId: 'lr6_east_path' }, lines: [AKANE('The penned kirin are free. They will not fight for him again.')] },
      ...districts.map((d) => ({ id: `lr6_read_${d.key}`, trigger: { type: 'flag' as const, flag: memFlag(d.key) }, lines: [SHIRO(`I read the names at ${d.name}. People came out of every house — some of them were weeping, and some of them were laughing at a name they had forgotten they knew.`)] })),
      ...districts.map((d) => ({ id: `lr6_dimmed_${d.key}`, trigger: { type: 'flag' as const, flag: dimFlag(d.key) }, lines: [GENZO(`${d.name} has gone dark. Its fighters will not come — but the names can still be read there.`)] })),
      { id: 'lr6_doors', trigger: { type: 'flag', flag: 'lr6_three_memories' }, lines: [AKANE('Three districts remember. Listen — the palace doors are opening.')] },
      { id: 'lr6_kagero_battle', trigger: { type: 'battle_started', siteId: 'lr6_nexus' }, lines: [KAGERO('I walk between the sun stone and the moon stone, diviner. I have walked there since before your shrine was built.'), AKANE('Then rest.')] },
      { id: 'lr6_yamikage_battle', trigger: { type: 'battle_started', siteId: 'lr6_palace' }, lines: [YAMIKAGE('Every light ends, diviner. I only end them sooner.'), AKANE('And every name you ate is being read aloud. Starve.')] },
      { id: 'lr6_fallen', trigger: { type: 'site_cleared', siteId: 'lr6_palace' }, lines: [AKANE('He is gone. The road is still here. Now — how should it be kept?')] },
    ],
    loss: ['Akane must survive.', 'Losing Hikari is recoverable while Akane has an army.', 'A dimmed district loses only its reinforcements; restored memories are never lost.'],
    help: [
      { id: 'lr6_circuits', title: 'Two circuits, four crossings', text: 'The living circuit runs through Hikari, Kawa and Minori on this bank; the spirit circuit through the Fox Shrine, the reserve nexus and the Bon Grave Shrine on the far bank. The north and south bridges are the long, safe crossings; the two torii paths over the island are short and defended. Inside each circuit the short way crosses ground the shades raid.' },
      { id: 'lr6_dimming', title: 'The dimming', text: 'Yamikage names one district at a time and dims it six days later unless its names are read first. A dimmed district loses its reinforcements, never its progress.' },
    ],
  });

  return {
    missions: [m1, m2, m3, m4, m5, m6],
    chapters: [
      { missionId: m1.id, chapter: 1, requiresAll: [], legacyMissionIds: ['lantern_road_m01'], briefingArt: m1.briefingArt! },
      { missionId: m2.id, chapter: 2, requiresAll: [m1.id], legacyMissionIds: ['lantern_road_m02', 'lantern_road_m03'], briefingArt: m2.briefingArt! },
      { missionId: m3.id, chapter: 3, requiresAll: [m2.id], legacyMissionIds: ['lantern_road_m04'], briefingArt: m3.briefingArt! },
      { missionId: m4.id, chapter: 4, requiresAll: [m2.id], legacyMissionIds: ['lantern_road_m05'], briefingArt: m4.briefingArt! },
      { missionId: m5.id, chapter: 5, requiresAll: [m3.id, m4.id], legacyMissionIds: ['lantern_road_m06'], briefingArt: m5.briefingArt! },
      { missionId: m6.id, chapter: 6, requiresAll: [m5.id], legacyMissionIds: ['lantern_road_m07'], briefingArt: m6.briefingArt! },
    ],
    epilogue: {
      // The campaign cover: the v1 ending pictures show lanterns lit for one night a year and a road left
      // open with no lanterns, neither of which is a v2 outcome (supervised passages or kept seasonal openings).
      art: 'campaign.lantern_road.cover',
      lines: [
        SHIRO('Every lantern in Kagaribi lit by itself last night, and the children ran from one to the next reading the names on them.'),
        GENZO('A collector, a boar lord, a bell, a fog fleet, an iron castle and a herd of kirin. I will need a bigger lantern to paint it all on.'),
      ],
      variants: [
        {
          flag: 'lr_passages_supervised',
          lines: [
            AKANE('The Last Torii stays open, every night of the year. The dead come home when they need to, and somebody is always there to see that nothing else comes with them.'),
            SHIRO('I take the first watch, priestess. It costs a warden every night, forever — and Minori grumbles that it was never asked. But nobody waits a year to come home again.'),
          ],
        },
        {
          flag: 'lr_openings_seasonal',
          lines: [
            AKANE('The torii opens on the festival nights, the old way. Each village lights its own lanterns, and each has its own keeper.'),
            SHIRO('It costs the dead a year’s wait, and some villages will keep the road better than others. But Yomogi decides for Yomogi, and Minori for Minori — and I go home to my own lantern.'),
          ],
        },
      ],
    },
  };
}
