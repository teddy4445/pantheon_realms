/**
 * The Three Beacons, content v2 (campaign expansion handoff 2026-10-15; review
 * cards 1–2): the tutorial in two chapters that carry the three legacy chapters.
 *
 *   Chapter 1 — The Silent Shore / Wings over the Pass (legacy m01 + m02): a
 *   horseshoe bay with the lighthouse on its western horn and the aerie above the
 *   eastern horn; a guarded tidal causeway and the longer orchard road join the
 *   horns, and a hillside stair (opened by reopening the nesting ground) closes a
 *   triangle back to Asterion.
 *
 *   Chapter 2 — The Storm Beacon (legacy m03): a crescent headland; Melas holds
 *   the central plateau, reached by the defended ridge road or the outer coastal
 *   switchback; the two relays join across the plateau; the beacon stands above
 *   Highwatch, so the last march returns through the home region.
 *
 * Writing reuses the established cast (Alexios, Thaleia, Ione, Melas, the Scout
 * Captain). Values are proposed and unplaytested.
 */
import { C, O, S, armyText, chapter, voice, type V2Campaign } from './kit';
import type { V2Built } from './index';

const P = (name: string) => voice(`hero.greek.${name.toLowerCase().replace(/ /g, '_')}.portrait`, name);
const ALEXIOS = P('Alexios');
const THALEIA = P('Thaleia');
const IONE = P('Ione');
const MELAS = P('Melas');

export function buildThreeBeaconsV2(camp: V2Campaign): V2Built {
  // -------------------------------------------------------------------------
  // Chapter 1 — The Silent Shore: Wings over the Pass
  // -------------------------------------------------------------------------
  const m1 = chapter({
    campaign: camp,
    chapter: 1,
    card: 1,
    name: 'The Silent Shore — Wings over the Pass',
    summary:
      'The lighthouse and the mountain beacon have failed for different reasons: raiders cut the coastal supply road, and frightened griffins abandoned the pass. Train the town watch, relight the Outer Lighthouse, reopen the nesting ground and light the pass beacon.',
    playtime: '35–50 minutes, 3–4 required battles',
    legacy: ['three_beacons_m01', 'three_beacons_m02'],
    economyFrom: 'three_beacons_m01',
    principal: 'tb1_lighthouse',
    soundscape: 'coast',
    town: { siteId: 'tb1_town', townId: 'asterion', name: 'Asterion' },
    map: {
      cols: 26,
      rows: 16,
      biome: 'coast',
      base: 'plains',
      seed: 910001,
      texture: { forest: 70, rough: 40 },
      paint: [
        // The horseshoe bay, open to the southern sea.
        { t: 'water', blob: [13, 13, 4] },
        { t: 'water', rect: [10, 11, 16, 15] },
        // Highlands above the eastern horn: a ridge with the aerie and the pass beyond.
        { t: 'rough', rect: [15, 1, 24, 4] },
        { t: 'mountain', line: [[14, 5], [19, 5], [21, 4]], width: 0 },
        { t: 'mountain', line: [[22, 6], [24, 6]], width: 0 },
        { t: 'mountain', cells: [[24, 1], [23, 1], [15, 1], [14, 2], [14, 3]] },
        // Upland meadow and woods in the north-west.
        { t: 'forest', blob: [5, 4, 2] },
        { t: 'plains', disc: [3, 2, 1] },
        // Orchards on the north shore.
        { t: 'forest', cells: [[9, 7], [10, 6], [16, 7], [17, 6]] },
        // The tidal causeway across the bay mouth: low marsh, walkable at low tide.
        { t: 'marsh', line: [[8, 13], [18, 13]], width: 0 },
        // Rocky western horn.
        { t: 'rough', cells: [[3, 12], [2, 11], [5, 14]] },
      ],
      roads: [
        // The orchard road: lighthouse – Asterion – eastern horn – the climb to the aerie.
        { via: ['tb1_lighthouse', [6, 9], 'tb1_town'] },
        { via: ['tb1_town', [18, 8], [21, 9], [23, 7], [23, 5], 'tb1_aerie'] },
        { via: ['tb1_aerie', 'tb1_beacon'] },
        // The tidal causeway (the short army route).
        { via: ['tb1_lighthouse', 'tb1_causeway', [19, 12]] },
        // The hillside stair, a triangle back to town once it is open.
        { via: ['tb1_town', 'tb1_stair', 'tb1_aerie'] },
        { via: ['tb1_town', 'tb1_hamlet'] },
        { via: ['tb1_hamlet', 'tb1_sawmill'] },
        { via: ['tb1_town', 'tb1_quarry'] },
        { via: [[21, 9], 'tb1_raider_camp'] },
      ],
    },
    sites: [
      S.town('tb1_town', 'asterion', [13, 6], 'Asterion', 'Your coastal town at the head of the bay.', [13, 7]),
      S.resource('tb1_sawmill', [5, 2], 'sawmill'),
      S.resource('tb1_quarry', [7, 10], 'quarry'),
      S.choice(
        'tb1_hamlet',
        [9, 4],
        'Hillside Hamlet',
        'Shepherds’ houses above the orchards, half-empty since the storm.',
        'The works master’s question',
        'Asterion’s works master has carts, timber and a dozen idle hands, and only enough for one task before the next mission. “The causeway, strategos? The army would cross the bay in a morning. Or the hamlet up here — feed it through the winter, and its sons will stand on the walls of the next town that needs them.”',
        [
          { label: 'Repair the causeway first', summary: 'Costs 4 Wood and 4 Stone. The causeway raiders are paid off and leave: the tidal causeway is open now.', cost: { wood: 4, stone: 4 }, reward: { flags: ['tb1_causeway_first'] }, clearsSiteIds: ['tb1_causeway'] },
          { label: 'Provision the hamlet first', summary: 'Costs 600 Gold. The hamlet sends a small garrison to the next chapter’s town (6 Hoplites). The causeway raiders stay — beat them to cross.', cost: { gold: 600 }, reward: { flags: ['tb1_hamlet_first'] } },
        ],
        { marker: 'supply' },
      ),
      S.crossing('tb1_causeway', [13, 13], 'Tidal Causeway', 'A low causeway across the bay mouth, held by raiders who toll it at low tide.', {
        label: 'Causeway raiders',
        army: [['hoplite', 6], ['peltast', 3]],
        reward: { resources: { gold: 250, wood: 2 } },
        battlefield: 'coast_road',
      }),
      S.activation(
        'tb1_lighthouse',
        [4, 13],
        'Outer Lighthouse',
        'The great lamp on the western horn, dark since the storm.',
        {
          cost: { gold: 250, wood: 3, stone: 3 },
          reward: { questXp: 600, flags: ['tb1_lighthouse_lit'] },
          requirements: [{ type: 'objective_completed', objectiveId: 'tb1_watch' }],
          confirm: 'Pay 250 Gold, 3 Wood and 3 Stone to relight the Outer Lighthouse?',
        },
        { label: 'Lighthouse wreckers', army: [['hoplite', 8], ['peltast', 4]], reward: { resources: { gold: 300 } }, battlefield: 'coast_road', required: true },
        { objectiveIds: ['tb1_lighthouse_clear', 'tb1_lighthouse'], marker: 'supply' },
      ),
      S.watchtower('tb1_gallery', [5, 11], 'Lighthouse Gallery', 'From the gallery the whole bay is visible — and the empty nests above the pass.', ['tb1_aerie', 'tb1_beacon']),
      S.landmark(
        'tb1_aerie',
        [20, 3],
        'Griffin Nesting Ground',
        'The cliff shelves the griffins abandoned. Slingers from the raiders’ band hold them now, behind the rocks.',
        'nest',
        { label: 'Slingers on the nesting shelves', army: [['peltast', 8], ['hoplite', 6]], reward: { flags: ['tb1_nest_open'], entitlementIds: ['covenant.griffin.m02'], resources: { gold: 400 } }, battlefield: 'ridge_pass', required: true },
        { objectiveIds: ['tb1_nest'], markerHiddenUntilRevealed: true },
      ),
      S.shortcut('tb1_stair', [16, 5], 'Hillside Stair', 'Shepherds’ steps cut into the ridge — chained shut while raiders held the shelves.', ['tb1_nest_open']),
      S.activation(
        'tb1_beacon',
        [23, 2],
        'Pass Beacon',
        'The signal fire on the mountain pass.',
        {
          cost: { gold: 300, wood: 3, stone: 3, crystal: 1 },
          reward: { questXp: 900 },
          requirements: [
            { type: 'objective_completed', objectiveId: 'tb1_lighthouse' },
            { type: 'objective_completed', objectiveId: 'tb1_nest' },
          ],
          completesMission: true,
          confirm: 'Pay 300 Gold, 3 Wood, 3 Stone and 1 Crystal to light the pass beacon?',
        },
        null,
        { objectiveIds: ['tb1_beacon'], markerHiddenUntilRevealed: true },
      ),
      S.landmark('tb1_raider_camp', [22, 11], 'Raiders’ Camp', 'The camp the supply-road raiders sleep in. Take it and their patrol is finished.', 'refuge', {
        label: 'Raiders’ camp',
        army: [['hoplite', 7], ['peltast', 5]],
        reward: { resources: { gold: 500, wood: 3 } },
        battlefield: 'coast_road',
      }),
      S.pickup('tb1_foal', [19, 9], 'Stolen Foal', 'A centaur foal the raiders penned by the road.', { flags: ['tb1_favour'], resources: { gold: 100 } }),
      S.camp('tb1_centaurs', [3, 3], 'Upland Meadow', 'Centaurs of the boundary grove. They will sell spears to whoever returns their stolen foal.', 'centaur', 1, 3, { kind: { type: 'creature_camp', creatureId: 'centaur', weeklyGrowth: 1, initialStock: 3, requiresFlag: 'tb1_favour', lockedReason: 'Return the stolen foal first (it is penned by the eastern road)' } }),
      S.pickup('tb1_wreck', [11, 9], 'Wreck Cache', 'Storm wreckage with salvageable coin.', { resources: { gold: 300 } }),
    ],
    patrols: [
      {
        commander: { heroDefinitionId: 'tb_raider_chief', name: 'Raider Chief', classId: 'champion', level: 1, attributes: { attack: 1, defense: 1, power: 0, knowledge: 0 }, skills: [], spellbook: false, spellIds: [], mana: 0, portraitAssetId: 'hero.greek.scout_captain.portrait' },
        start: [21, 10],
        waypoints: [[18, 8], [15, 8], [21, 10]],
        army: [['hoplite', 5], ['peltast', 3]],
        home: 'tb1_raider_camp',
        purpose: 'Raids the orchard road between Asterion and the eastern horn. Taking the Raiders’ Camp ends the raids.',
      },
    ],
    objectives: [
      O.primary('tb1_watch', 'Train the town watch', 'Recruit at least 6 Hoplites in Asterion and train at least 4 of them into Veteran Hoplites.', C.all(C.counter('recruited:hoplite', 6), C.counter('trained:hoplite', 4)), { hint: 'Recruitment and the Veteran Barracks are in Asterion; training costs the price difference and uses no population.' }),
      O.primary('tb1_lighthouse_clear', 'Clear the lighthouse', `Defeat the wreckers (${armyText([['hoplite', 8], ['peltast', 4]])}) at the Outer Lighthouse.`, C.cleared('tb1_lighthouse'), { markerSiteId: 'tb1_lighthouse' }),
      O.primary('tb1_lighthouse', 'Relight the Outer Lighthouse', 'With the watch trained and the wreckers gone, pay 250 Gold, 3 Wood and 3 Stone at the lighthouse.', C.activated('tb1_lighthouse'), { markerSiteId: 'tb1_lighthouse', requires: ['tb1_lighthouse_clear'] }),
      O.primary('tb1_nest', 'Reopen the nesting ground', `Drive the slingers (${armyText([['peltast', 8], ['hoplite', 6]])}) from the griffins’ shelves above the eastern horn. Use the rocks against their slings.`, C.cleared('tb1_aerie'), { markerSiteId: 'tb1_aerie', requires: ['tb1_lighthouse'] }),
      O.primary('tb1_beacon', 'Light the pass beacon', 'With the lighthouse lit and the nests free, pay 300 Gold, 3 Wood, 3 Stone and 1 Crystal at the pass beacon.', C.activated('tb1_beacon'), { markerSiteId: 'tb1_beacon', requires: ['tb1_nest'] }),
      O.optional('tb1_raids', 'End the road raids', 'Take the Raiders’ Camp on the eastern horn; its patrol withdraws for good.', C.cleared('tb1_raider_camp'), { markerSiteId: 'tb1_raider_camp' }),
      O.optional('tb1_choice', 'Choose the first work', 'At the Hillside Hamlet, decide what Asterion’s carts repair first.', C.visited('tb1_hamlet'), { markerSiteId: 'tb1_hamlet' }),
    ],
    evidence: [
      { id: 'tb1_ev_causeway', flag: 'tb1_causeway_first', title: 'The causeway first', text: 'The tidal causeway was repaired first: the army crosses the bay in a morning.', icon: 'branch' },
      { id: 'tb1_ev_hamlet', flag: 'tb1_hamlet_first', title: 'The hamlet first', text: 'The hillside hamlet was provisioned first: its sons will garrison the next town.', icon: 'supply' },
      { id: 'tb1_ev_foal', flag: 'tb1_favour', title: 'A favour to the centaurs', text: 'The stolen foal went home: the Upland Meadow centaurs will sell spears.', icon: 'pact' },
    ],
    carried: ['tb1_causeway_first', 'tb1_hamlet_first'],
    briefing: [
      THALEIA('The storm has passed and both our signals are still dark. Raiders cut the coast road the night the lighthouse failed — and the griffins left the pass the same week.'),
      ALEXIOS('Two failures, two causes. Ordinary people need the road before anyone can march an army on it.'),
      IONE('Train a watch we can trust, relight the lighthouse on the western horn. From its gallery you will see what became of the nests.'),
    ],
    victory: [
      THALEIA('The lighthouse answers the pass beacon across the bay. Ships will find Asterion tonight.'),
      IONE('And the griffins circle the pass again. One beacon is still dark — the storm beacon above Highwatch.'),
    ],
    scenes: [
      { id: 'tb1_seen_nests', trigger: { type: 'site_visited', siteId: 'tb1_gallery' }, lines: [IONE('From up here… the shelves above the eastern horn. Not griffins: slingers, sitting in the nests.')] },
      { id: 'tb1_lit', trigger: { type: 'objective_completed', objectiveId: 'tb1_lighthouse' }, lines: [THALEIA('The lighthouse burns. The road is ours again — now the pass.'), ALEXIOS('Up the eastern climb. Once the nests are free, the shepherds’ stair will bring us home the short way.')] },
      { id: 'tb1_stair', trigger: { type: 'objective_completed', objectiveId: 'tb1_nest' }, lines: [IONE('The shepherds have unchained the hillside stair. Asterion is half a day away now.')] },
      { id: 'tb1_raids_end', trigger: { type: 'site_cleared', siteId: 'tb1_raider_camp' }, lines: [THALEIA('Their camp is ashes. No more raids on the orchard road.')] },
    ],
    loss: ['Alexios must survive (defeat, retreat or surrender ends the chapter).', 'Losing Asterion is recoverable while Alexios has an army.'],
    help: [
      { id: 'tb1_routes', title: 'Two ways around the bay', text: 'The orchard road runs through Asterion; the tidal causeway crosses the bay mouth. The hillside stair opens once the nesting ground is free.' },
      { id: 'tb1_patrol', title: 'The raider patrol', text: 'One raider band patrols the orchard road from its camp on the eastern horn. Taking the camp ends it for good.' },
    ],
  });

  // -------------------------------------------------------------------------
  // Chapter 2 — The Storm Beacon
  // -------------------------------------------------------------------------
  const melasGuard = camp.v1('three_beacons_m03').sites.find((s) => s.id === 'm03_beacon')?.guard?.commander;
  if (!melasGuard) throw new Error('Three Beacons v2: Melas’s commander profile is missing from the legacy content');
  const scout = camp.v1('three_beacons_m03').hostileHeroes[0]!.commander;
  const m2 = chapter({
    campaign: camp,
    chapter: 2,
    card: 2,
    name: 'The Storm Beacon',
    summary:
      'Melas has taken the great lens: one commander, he says, should hold the whole lighthouse network. Recover the lens, carry it to the Storm Beacon above Highwatch and hold the approach while the crew installs it.',
    playtime: '45–60 minutes, 3–5 required battles',
    legacy: ['three_beacons_m03'],
    economyFrom: 'three_beacons_m03',
    principal: 'tb2_lens',
    soundscape: 'storm_plateau',
    town: { siteId: 'tb2_town', townId: 'highwatch', name: 'Highwatch' },
    map: {
      cols: 28,
      rows: 18,
      biome: 'storm_plateau',
      base: 'plains',
      edge: 'water',
      seed: 910002,
      texture: { rough: 90, forest: 30 },
      paint: [
        // The crescent headland: open sea in the east bay.
        { t: 'water', blob: [24, 9, 4] },
        { t: 'water', rect: [25, 4, 26, 14] },
        // The central plateau, ringed by cliffs with two ways up.
        { t: 'rough', disc: [15, 9, 4] },
        { t: 'mountain', line: [[11, 5], [13, 4], [17, 4], [19, 6]], width: 0 },
        { t: 'mountain', line: [[11, 13], [13, 14], [17, 14], [19, 12]], width: 0 },
        { t: 'mountain', cells: [[11, 6], [11, 12], [19, 7], [19, 11]] },
        // The beacon crag above Highwatch.
        { t: 'mountain', line: [[3, 4], [6, 2]], width: 0 },
        { t: 'rough', cells: [[4, 2], [5, 3]] },
        // The quarry hollow under the crag where the storm raiders gather: one way in.
        { t: 'mountain', rect: [1, 5, 3, 9] },
        { t: 'forest', blob: [7, 15, 2] },
      ],
      roads: [
        // The defended ridge road straight up to the plateau.
        { via: ['tb2_town', 'tb2_ridge', 'tb2_melas'] },
        // The outer coastal switchback: around the south and up the eastern side.
        { via: ['tb2_town', [8, 15], [16, 16], [21, 14], 'tb2_switchback', 'tb2_melas'] },
        // The relays join across the plateau (a full circuit).
        { via: ['tb2_relay_north', [15, 6], 'tb2_melas', [15, 12], 'tb2_relay_south'] },
        { via: ['tb2_town', [8, 4], 'tb2_relay_north'] },
        { via: [[21, 14], 'tb2_relay_south'] },
        { via: ['tb2_town', 'tb2_beacon'] },
        { via: ['tb2_town', 'tb2_approach', 'tb2_assault'] },
        { via: ['tb2_town', 'tb2_quarry'] },
        { via: [[8, 15], 'tb2_slingers'] },
        { via: ['tb2_relay_north', 'tb2_scout_camp'] },
      ],
    },
    sites: [
      S.town('tb2_town', 'highwatch', [6, 8], 'Highwatch', 'A hill town on the inner edge of the crescent headland.', [7, 8]),
      S.resource('tb2_quarry', [3, 11], 'quarry'),
      S.resource('tb2_sawmill', [7, 13], 'sawmill'),
      S.crossing('tb2_ridge', [10, 9], 'Ridge Road Gate', 'The direct road up to the plateau, held by Melas’s pickets.', {
        label: 'Ridge pickets',
        army: [['veteran_peltast', 6], ['cavalry', 4]],
        reward: { resources: { gold: 500 } },
        battlefield: 'ridge_pass',
      }),
      S.crossing('tb2_switchback', [20, 9], 'Coastal Switchback', 'The long outer path up the plateau’s sea cliff. Only a few sentries watch it.', {
        label: 'Switchback sentries',
        army: [['hoplite', 8], ['peltast', 4]],
        reward: { resources: { gold: 300 } },
        battlefield: 'coast_road',
      }),
      S.landmark(
        'tb2_melas',
        [15, 9],
        'Melas’s Plateau Camp',
        'Melas’s command on the central plateau, with the great lens under guard.',
        'refuge',
        {
          label: 'Melas and the storm guard',
          army: [['stormforged_cyclops', 1], ['labyrinth_warden', 2], ['veteran_peltast', 6]],
          reward: { flags: ['tb2_lens'], questXp: 1200, resources: { gold: 1500 } },
          battlefield: 'plateau',
          commander: melasGuard,
          required: true,
        },
        { objectiveIds: ['tb2_lens'] },
      ),
      S.choice(
        'tb2_tent',
        [16, 8],
        'Melas’s Command Tent',
        'Maps of every lighthouse on the coast, each marked with one commander’s name.',
        'Who keeps the lights',
        'Melas sits among his maps, unhurt and unbowed. “One coast, one signal, one command. When raiders come you will want someone who answers at once.” Ione unrolls a different map: every settlement that went unheard while he held the lens. Highwatch will keep the network either way — but someone must say how.',
        [
          { label: 'Each settlement keeps its own light', summary: 'The network is run by the towns that use it. Remembered for the epilogue.', reward: { flags: ['tb_network_local'] }, requiresFlags: ['tb2_lens'] },
          { label: 'Highwatch commands the network', summary: 'One military command answers every signal, as Melas wanted, but under Highwatch. Remembered for the epilogue.', reward: { flags: ['tb_network_military'] }, requiresFlags: ['tb2_lens'] },
        ],
        { marker: 'pact', objectiveIds: ['tb2_network'] },
      ),
      S.activation('tb2_relay_north', [12, 3], 'North Relay', 'A signal mirror on the plateau’s northern lip.', { cost: { gold: 200, crystal: 1 }, reward: { flags: ['tb2_relay_north', 'tb2_relay_lit'], questXp: 300 }, confirm: 'Pay 200 Gold and 1 Crystal to restore the north relay?', label: 'relay' }, null, { objectiveIds: ['tb2_relay'] }),
      S.activation('tb2_relay_south', [13, 16], 'South Relay', 'A signal mirror above the southern cove.', { cost: { gold: 200, crystal: 1 }, reward: { flags: ['tb2_relay_south', 'tb2_relay_lit'], questXp: 300 }, confirm: 'Pay 200 Gold and 1 Crystal to restore the south relay?', label: 'relay' }, null, { objectiveIds: ['tb2_relay'] }),
      S.landmark('tb2_scout_camp', [12, 1], 'Scout Captain’s Camp', 'Where Melas’s Scout Captain rests his riders between sweeps.', 'refuge', {
        label: 'Scout camp',
        army: [['cavalry', 3], ['peltast', 6]],
        reward: { resources: { gold: 400 } },
        battlefield: 'ridge_pass',
      }),
      S.activation(
        'tb2_beacon',
        [4, 3],
        'Storm Beacon',
        'The great beacon above Highwatch. Without its lens it is only a stone tower.',
        {
          cost: { gold: 500, stone: 5, crystal: 2 },
          reward: { flags: ['tb2_lens_installed'], questXp: 800 },
          requirements: [
            { type: 'mission_flag', flag: 'tb2_lens' },
            { type: 'objective_completed', objectiveId: 'tb2_relay' },
          ],
          confirm: 'Pay 500 Gold, 5 Stone and 2 Crystal to set the great lens? The storm raiders will try to stop the crew.',
        },
        null,
        { objectiveIds: ['tb2_install'] },
      ),
      // The repair defence: once the lens is set, the raiders come out of the quarry hollow; the hollow's
      // mouth is barred by the crew until then, so the battle is fought after the installation.
      S.shortcut('tb2_approach', [3, 7], 'Hollow Mouth', 'The only way into the quarry hollow under the crag. Highwatch’s crew holds it shut until the lens is set — then the raiders break out.', ['tb2_lens_installed']),
      S.landmark(
        'tb2_assault',
        [2, 7],
        'Storm Raiders’ Assault',
        'The last of Melas’s storm raiders, gathered in the quarry hollow to break the lens.',
        'refuge',
        { label: 'Storm raiders', army: [['veteran_hoplite', 14], ['veteran_peltast', 8], ['labyrinth_warden', 1]], reward: { questXp: 1000 }, battlefield: 'beacon_clearing', required: true },
        { objectiveIds: ['tb2_defend'] },
      ),
      S.camp('tb2_slingers', [10, 16], 'Old Coastal Quarry', 'Hill slingers camp in a disused quarry above the cove.', 'hill_slinger', 3, 6),
      S.depot('tb2_depot', [18, 15], 'Lighthouse Stores', 'Oil, rope and coin for the lighthouse crews.', { resources: { gold: 600, wood: 4 } }),
    ],
    patrols: [
      {
        commander: scout,
        start: [13, 2],
        waypoints: [[12, 3], [13, 16], [12, 3]],
        army: [['hoplite', 8], ['peltast', 4], ['cavalry', 2]],
        home: 'tb2_scout_camp',
        dormantUntil: 'tb2_relay_lit',
        purpose: 'Waits at his camp until a relay is lit, then rides between the relays to put them out. Taking his camp ends the sweeps.',
      },
    ],
    objectives: [
      O.primary('tb2_lens', 'Recover the lens', 'Defeat Melas on the central plateau — by the ridge road or the coastal switchback — and take back the great lens.', C.cleared('tb2_melas'), { markerSiteId: 'tb2_melas' }),
      O.primary('tb2_relay', 'Power the beacon', 'Restore at least one relay (north or south). The second is optional support.', C.any(C.activated('tb2_relay_north'), C.activated('tb2_relay_south'))),
      O.primary('tb2_install', 'Set the lens', 'Carry the lens to the Storm Beacon above Highwatch and pay for its setting.', C.activated('tb2_beacon'), { markerSiteId: 'tb2_beacon', requires: ['tb2_lens', 'tb2_relay'] }),
      O.primary('tb2_defend', 'Hold the beacon approach', `Defeat the storm raiders (${armyText([['veteran_hoplite', 14], ['veteran_peltast', 8], ['labyrinth_warden', 1]])}) who come for the lens.`, C.cleared('tb2_assault'), { markerSiteId: 'tb2_assault', requires: ['tb2_install'], completesMission: true }),
      O.optional('tb2_both_relays', 'Both relays', 'Restore both relays: the repair crew gets 6 more Veteran Hoplites for the defence.', C.all(C.activated('tb2_relay_north'), C.activated('tb2_relay_south')), { reward: { creatures: [{ creatureId: 'veteran_hoplite', count: 6 }] } }),
      O.optional('tb2_scouts', 'End the scout sweeps', 'Take the Scout Captain’s camp in the north.', C.cleared('tb2_scout_camp'), { markerSiteId: 'tb2_scout_camp' }),
      O.optional('tb2_network', 'Decide who keeps the lights', 'At Melas’s command tent, after his defeat, decide how the network is run.', C.any(C.flag('tb_network_local'), C.flag('tb_network_military')), { markerSiteId: 'tb2_tent' }),
      O.optional('tb2_strike', 'Strike before the fortification', 'Defeat Melas before his field fortification is finished (the deadline is shown once the march begins).', C.cleared('tb2_melas'), { reward: { resources: { gold: 1000 }, questXp: 400 } }),
    ],
    timers: [
      {
        id: 'tb2_fort',
        label: 'Melas’s field fortification',
        // The march begins on day 1: the clock starts at once (its start day is saved).
        startWhen: C.all(),
        days: 8,
        metWhen: C.cleared('tb2_melas'),
        consequence: 'If Melas is not beaten by then, the bonus for striking early (1,000 Gold and experience) is lost. The chapter continues.',
        announce: 'Melas is entrenching on the plateau.',
        onExpire: { failObjectives: ['tb2_strike'] },
      },
    ],
    evidence: [
      { id: 'tb2_ev_lens', flag: 'tb2_lens', title: 'The great lens', text: 'Recovered from Melas on the plateau. He survives; the lens does not belong to him.', icon: 'evidence' },
      { id: 'tb2_ev_local', flag: 'tb_network_local', title: 'Local lights', text: 'Each settlement keeps its own light in the network.', icon: 'pact' },
      { id: 'tb2_ev_military', flag: 'tb_network_military', title: 'One command', text: 'Highwatch commands the network as one military signal chain.', icon: 'pact' },
    ],
    carried: ['tb_network_local', 'tb_network_military', 'tb2_lens'],
    entryBonuses: [{ fact: 'tb1_hamlet_first', label: 'The hamlet’s garrison: 6 Hoplites in Highwatch', garrison: [{ creatureId: 'hoplite', count: 6 }] }],
    briefing: [
      MELAS('A single beacon can command an entire coast. Why should I give that power back?'),
      ALEXIOS('Because it was built to guide people home, not make them kneel.'),
      IONE('Isolated villages cannot signal for help while he holds the lens. Either road up the plateau will do — the ridge is shorter, the switchback quieter.'),
    ],
    briefingVariants: [
      { ifFlags: ['fact:tb1_hamlet_first'], lines: [THALEIA('The hamlet kept its word: six of its sons stand on Highwatch’s wall.')] },
      { ifFlags: ['fact:tb1_causeway_first'], lines: [THALEIA('The causeway carts have moved on to the plateau roads. They will not be here to help the crew.')] },
    ],
    victory: [THALEIA('Three lights. One coast. We can build the rest together.'), IONE('Melas is alive. When the cities need a soldier again, they will remember who held the lens — and who gave it back.')],
    scenes: [
      { id: 'tb2_melas_falls', trigger: { type: 'site_cleared', siteId: 'tb2_melas' }, lines: [MELAS('Take it, then. When raiders come and no one answers in time, remember I offered you one voice.'), ALEXIOS('One voice for every village. That is the whole point.')] },
      { id: 'tb2_installed', trigger: { type: 'objective_completed', objectiveId: 'tb2_install' }, lines: [IONE('The lens is in its cradle — and the storm raiders are climbing the crag. Hold the approach!')] },
      { id: 'tb2_fort_warn', trigger: { type: 'day_at_least', day: 5 }, unlessFlags: ['tb2_lens'], lines: [THALEIA('Melas’s men are digging in on the plateau. The longer we wait, the harder that hill becomes.')] },
    ],
    loss: ['Alexios must survive.', 'A failed optional relay or a missed early strike never blocks the chapter.'],
    help: [{ id: 'tb2_routes', title: 'Two ways up', text: 'The ridge road is short and defended; the coastal switchback is long and lightly held. The relays join across the plateau.' }],
  });

  return {
    missions: [m1, m2],
    chapters: [
      { missionId: m1.id, chapter: 1, requiresAll: [], legacyMissionIds: ['three_beacons_m01', 'three_beacons_m02'], briefingArt: m1.briefingArt! },
      { missionId: m2.id, chapter: 2, requiresAll: [m1.id], legacyMissionIds: ['three_beacons_m03'], briefingArt: m2.briefingArt! },
    ],
    epilogue: {
      // The storm-beacon painting (not the v1 ending picture): the chosen network is told in the lines.
      art: 'mission.three_beacons.m03.briefing',
      lines: [
        THALEIA('From the Outer Lighthouse to the storm plateau, the coast can see itself again.'),
        IONE('The griffins circled the pass beacon at dusk. They have not done that in a generation.'),
      ],
      variants: [
        { flag: 'tb_network_local', lines: [ALEXIOS('Every village keeps its own light, and answers the next one along. Slower than one command — but no village waits on a single man again.')] },
        { flag: 'tb_network_military', lines: [ALEXIOS('Highwatch answers every signal now. Melas wanted the same thing; the difference is that the villages can see who holds the lens.')] },
      ],
    },
  };
}
