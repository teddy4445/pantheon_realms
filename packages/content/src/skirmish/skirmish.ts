/**
 * Skirmish scenario "Twin Harbors" (proposed-this-build).
 *
 * A small two-town map that exercises the full strategic AI (build, recruit,
 * collect, attack) with the same rules as the campaign. One mission per
 * pantheon pairing (6 × 6), selected in setup as scenario variants. Victory: every
 * rival hero defeated and every rival town taken. A garrisoned or defended town
 * is taken by siege (design/04 §8, temporary deterministic model).
 */
import type { MapTemplateDefinition, MissionDefinition, SiteDefinition, SkirmishScenarioDefinition } from '@pr/rules';
import { GREEK_FAMILY_SPECS } from '../greek/creatures';
import { NORSE_FAMILY_SPECS } from '../norse/creatures';
import { kitBuildingId, slug, type PantheonKitSpec } from '../pantheonKit';
import { EGYPTIAN_SPEC } from '../egyptian/pantheon';
import { JAPANESE_SPEC } from '../japanese/pantheon';
import { CELTIC_SPEC } from '../celtic/pantheon';
import { MESOAMERICAN_SPEC } from '../mesoamerican/pantheon';

/*
 * Twin Harbors v2 is POINT-SYMMETRIC: every site, road and terrain cell on the
 * west half has a partner at (34 - q, 16 - r), which preserves hex distance, so
 * both towns are exactly as far from everything (v1 was not: the east town was
 * closer to the gold mine and the crystal, the west town to the grove).
 * The central gold mine is the only self-symmetric site. v2 is also wider: on
 * v1 a hero could reach the other town in one day (1,200 movement against a
 * 1,500-2,000 budget), so a single misstep lost the game on day 1; the towns are
 * now two days apart and the gold mine one day from each.
 */
const W = 35;
const H = 17;
const mirror = (q: number, r: number) => ({ q: W - 1 - q, r: H - 1 - r });

const HALF: readonly { id: string; q: number; r: number }[] = [
  { id: 'town', q: 3, r: 8 },
  { id: 'sawmill', q: 3, r: 3 },
  { id: 'quarry', q: 2, r: 12 },
  { id: 'crystal', q: 6, r: 11 },
  { id: 'cache', q: 7, r: 5 },
];

const anchor = (id: string, c: { q: number; r: number }) => ({ id, coord: { q: c.q, r: c.r } });

export const SKIRMISH_TEMPLATES: readonly MapTemplateDefinition[] = [
  {
    id: 'skirmish_twin_harbors_v2',
    version: 2,
    width: W,
    height: H,
    goldenSeed: 240102,
    symmetry: 'point',
    barriers: [],
    anchors: [
      // The first anchor is the reachability origin for map validation.
      ...HALF.flatMap((a) => [anchor(`sk_${a.id}_w`, a), anchor(`sk_${a.id}_e`, mirror(a.q, a.r))]),
      anchor('sk_gold', { q: 17, r: 8 }),
      anchor('sk_grove_n', { q: 17, r: 3 }),
      anchor('sk_grove_s', mirror(17, 3)),
    ],
    // One half is declared; the generator mirrors every carved road.
    roadEdges: [
      ['sk_town_w', 'sk_gold'],
      ['sk_town_w', 'sk_sawmill_w'],
      ['sk_town_w', 'sk_quarry_w'],
      ['sk_town_w', 'sk_crystal_w'],
      ['sk_gold', 'sk_grove_n'],
    ],
    biome: 'temperate',
  },
];

const coordOf = (id: string) => SKIRMISH_TEMPLATES[0]!.anchors.find((a) => a.id === id)!.coord;

const res = (id: string, t: 'sawmill' | 'quarry' | 'gold_mine' | 'crystal_deposit'): SiteDefinition => {
  const info = {
    sawmill: ['Sawmill', 'wood', 2],
    quarry: ['Quarry', 'stone', 2],
    gold_mine: ['Gold Mine', 'gold', 1000],
    crystal_deposit: ['Crystal Deposit', 'crystal', 1],
  } as const;
  const [name, resource, dailyYield] = info[t];
  return { id, anchorId: id, coord: coordOf(id), name, description: `Capture for +${dailyYield} ${resource} per day.`, kind: { type: 'resource_site', siteType: t, resource, dailyYield } };
};

const grove = (id: string, name: string): SiteDefinition => ({
  id,
  anchorId: id,
  coord: coordOf(id),
  name,
  description: 'Centaurs guard a store of crystal.',
  kind: { type: 'landmark', landmark: 'grove' },
  guard: { label: 'Grove centaurs', army: [{ creatureId: 'centaur', count: 5 }], reward: { resources: { crystal: 3, gold: 600 } }, battlefield: 'grove' },
});

const cache = (id: string): SiteDefinition => ({
  id,
  anchorId: id,
  coord: coordOf(id),
  name: 'Supply Cache',
  description: 'Abandoned supplies.',
  kind: { type: 'pickup', reward: { resources: { gold: 400, wood: 2, stone: 2 } } },
});

const SITES: SiteDefinition[] = [
  { id: 'sk_town_w', anchorId: 'sk_town_w', coord: coordOf('sk_town_w'), name: 'Westharbor', description: 'The western harbor town.', kind: { type: 'town', townId: 'westharbor' } },
  { id: 'sk_town_e', anchorId: 'sk_town_e', coord: coordOf('sk_town_e'), name: 'Eastharbor', description: 'The eastern harbor town.', kind: { type: 'town', townId: 'eastharbor' } },
  res('sk_sawmill_w', 'sawmill'),
  res('sk_sawmill_e', 'sawmill'),
  res('sk_quarry_w', 'quarry'),
  res('sk_quarry_e', 'quarry'),
  res('sk_crystal_w', 'crystal_deposit'),
  res('sk_crystal_e', 'crystal_deposit'),
  {
    ...res('sk_gold', 'gold_mine'),
    guard: { label: 'Mine guards', army: [{ creatureId: 'hoplite', count: 12 }, { creatureId: 'peltast', count: 4 }], reward: { resources: { gold: 500 } }, battlefield: 'open_field' },
  },
  cache('sk_cache_w'),
  cache('sk_cache_e'),
  grove('sk_grove_n', 'North Grove'),
  grove('sk_grove_s', 'South Grove'),
];

/** Starting package per pantheon: town buildings, first dwelling population, a leader and an escort. */
interface SideKit {
  readonly pantheonId: string;
  readonly adjective: string;
  readonly archetypeId: string;
  readonly buildings: readonly string[];
  readonly population: Readonly<Record<string, number>>;
  readonly army: readonly { creatureId: string; count: number }[];
  /**
   * Skirmish grants the covenants that gate the tier-3, -6 and -7 dwellings, so
   * every pantheon's full roster can be built (proposed; the campaign still
   * earns covenants through play).
   */
  readonly covenants: readonly string[];
}

const familyAtTier = (specs: readonly { familyId: string; tier: number }[], tier: number) => specs.find((f) => f.tier === tier)!.familyId;
const COVENANT_TIERS = [3, 6, 7];

function kitSide(spec: PantheonKitSpec, archetypeId: string, start: [number, number]): SideKit {
  const t1 = spec.families.find((f) => f.tier === 1)!;
  const t2 = spec.families.find((f) => f.tier === 2)!;
  return {
    pantheonId: spec.id,
    adjective: spec.name,
    archetypeId,
    buildings: [kitBuildingId(spec.id, 'civic_hall', 1), kitBuildingId(spec.id, 'tavern', 1), kitBuildingId(spec.id, 'fortifications', 1), kitBuildingId(spec.id, 'dwelling_t1', 1)],
    population: { [t1.familyId]: 14 },
    army: [
      { creatureId: t1.base.id, count: start[0] },
      { creatureId: t2.base.id, count: start[1] },
    ],
    covenants: COVENANT_TIERS.map((tier) => familyAtTier(spec.families, tier)),
  };
}

/*
 * Starting escorts (proposed). Chosen with head-to-head auto-battles against the
 * Greek start (20 Hoplites + 8 Peltasts) and the Norse start; see
 * DEVELOPMENT_STATUS.md for the measured win rates. Not a balance verdict.
 */
const KITS: Record<string, SideKit> = {
  greek: {
    pantheonId: 'greek',
    adjective: 'Greek',
    archetypeId: 'greek_polis',
    buildings: ['village_hall', 'tavern', 'fort', 'barracks'],
    population: { hoplite: 14 },
    army: [
      { creatureId: 'hoplite', count: 20 },
      { creatureId: 'peltast', count: 8 },
    ],
    covenants: COVENANT_TIERS.map((tier) => familyAtTier(GREEK_FAMILY_SPECS.filter((f) => f.pantheonId === 'greek'), tier)),
  },
  norse: {
    pantheonId: 'norse',
    adjective: 'Norse',
    archetypeId: 'norse_hold',
    buildings: ['norse_longhouse', 'norse_mead_hall', 'norse_palisade', 'norse_barrow'],
    population: { norse_draugr: 14 },
    // Proposed: chosen by head-to-head auto-battle parity with the Greek start
    // (11 of 20 measured duels won; 2,100 vs 2,000 Gold of troops).
    army: [
      { creatureId: 'norse_draugr', count: 24 },
      { creatureId: 'norse_frost_wolf', count: 6 },
    ],
    covenants: COVENANT_TIERS.map((tier) => familyAtTier(NORSE_FAMILY_SPECS, tier)),
  },
  egyptian: kitSide(EGYPTIAN_SPEC, 'egyptian_city', [20, 8]),
  japanese: kitSide(JAPANESE_SPEC, 'japanese_castle_town', [21, 8]),
  celtic: kitSide(CELTIC_SPEC, 'celtic_hillfort', [22, 7]),
  mesoamerican: kitSide(MESOAMERICAN_SPEC, 'mesoamerican_city', [24, 6]),
};

/** Pantheons offered in skirmish, in catalog order. */
export const SKIRMISH_PANTHEONS = ['greek', 'norse', 'egyptian', 'japanese', 'celtic', 'mesoamerican'] as const;

interface Leader {
  readonly heroId: string;
  readonly definitionId: string;
  readonly classId: string;
  readonly attributes: { attack: number; defense: number; power: number; knowledge: number };
  readonly skills: readonly { skillId: string; rank: number }[];
  readonly portrait: string;
}

const STRATEGOS = { attributes: { attack: 1, defense: 2, power: 1, knowledge: 2 }, skills: [{ skillId: 'leadership', rank: 1 }] } as const;

/** A kit hero as a skirmish leader. */
const kitLeader = (pantheonId: string, name: string, classId: string, heroId: string, kind: typeof STRATEGOS): Leader => ({
  heroId,
  definitionId: `${pantheonId}_${slug(name)}`,
  classId,
  attributes: kind.attributes,
  skills: kind.skills,
  portrait: `hero.${pantheonId}.${slug(name)}.portrait`,
});

/*
 * Both sides of every pairing start with a leader of the same archetype
 * (Strategos-like: Attack 1, Defense 2, Power 1, Knowledge 2, Leadership I), so
 * no pairing hands one side a stronger commander. (Earlier builds gave the
 * rival a Champion — or the player one, depending on the pantheon — which
 * decided most AI-vs-AI mirror matches.)
 */
const LEADERS: Record<string, { player: Leader; rival: Leader }> = {
  greek: {
    player: { heroId: 'alexios', definitionId: 'alexios', classId: 'strategos', ...STRATEGOS, portrait: 'hero.greek.alexios.portrait' },
    rival: { heroId: 'rival_odysseus', definitionId: 'odysseus', classId: 'strategos', ...STRATEGOS, portrait: 'hero.greek.odysseus.portrait' },
  },
  norse: {
    player: { heroId: 'ragnar', definitionId: 'norse_ragnar', classId: 'jarl', ...STRATEGOS, portrait: 'hero.norse.ragnar.portrait' },
    rival: { heroId: 'rival_lagertha', definitionId: 'norse_lagertha', classId: 'jarl', ...STRATEGOS, portrait: 'hero.norse.lagertha.portrait' },
  },
  egyptian: {
    player: kitLeader('egyptian', 'Hatshepsut', 'vizier', 'hatshepsut', STRATEGOS),
    rival: kitLeader('egyptian', 'Cleopatra', 'vizier', 'rival_cleopatra', STRATEGOS),
  },
  japanese: {
    player: kitLeader('japanese', 'Yoshitsune', 'daimyo', 'yoshitsune', STRATEGOS),
    rival: kitLeader('japanese', 'Benkei', 'daimyo', 'rival_benkei', STRATEGOS),
  },
  celtic: {
    player: kitLeader('celtic', 'Fionn mac Cumhaill', 'chieftain', 'fionn', STRATEGOS),
    rival: kitLeader('celtic', 'Boudicca', 'chieftain', 'rival_boudicca', STRATEGOS),
  },
  mesoamerican: {
    player: kitLeader('mesoamerican', 'Nezahualcoyotl', 'tlatoani', 'nezahualcoyotl', STRATEGOS),
    rival: kitLeader('mesoamerican', 'Eight Deer Jaguar Claw', 'tlatoani', 'rival_eight_deer', STRATEGOS),
  },
};

const hero = (l: Leader, kit: SideKit, startTownId: string) => ({
  heroId: l.heroId,
  definitionId: l.definitionId,
  classId: l.classId,
  defaults: { level: 1, xp: 0, attributes: l.attributes, skills: l.skills, spellbook: false },
  army: kit.army,
  startTownId,
});

function twinHarbors(id: string, playerPantheon: string, rivalPantheon: string): MissionDefinition {
  const pk = KITS[playerPantheon]!;
  const rk = KITS[rivalPantheon]!;
  const pl = LEADERS[playerPantheon]!.player;
  const rl = LEADERS[rivalPantheon]!.rival;
  const mixed = playerPantheon !== rivalPantheon;
  const proposed = [...new Set([pk, rk].filter((k) => k.pantheonId !== 'greek').map((k) => k.adjective))];
  return {
    id,
    scenarioId: id,
    campaignId: null,
    order: 1,
    name: 'Twin Harbors',
    subtitle: `Skirmish — ${pk.adjective} vs. ${rk.adjective}`,
    summary: `Two harbor towns contest the gold mine between them. Defeat the rival’s heroes and take Eastharbor. Proposed test scenario; unbalanced${proposed.length ? `; ${proposed.join(' and ')} values are proposed and unplaytested` : ''}.`,
    mapTemplateId: 'skirmish_twin_harbors_v2',
    soundscape: 'coast',
    targetPlaytime: '20–40 minutes (unmeasured)',
    newDecisions: ['Economy race', 'Local AI opponent', ...(mixed ? ['Mixed pantheons'] : [])],
    xpCap: null,
    xpCapLevel: null,
    briefing: [{ speaker: 'Herald', portraitAssetId: pl.portrait, text: 'Eastharbor’s war-leader marches for the gold mine. Hold the coast.' }],
    victory: [{ speaker: 'Herald', portraitAssetId: pl.portrait, text: 'Both harbors now answer to you.' }],
    debriefPolicy: [],
    player: {
      playerId: 'player',
      name: 'Westharbor',
      pantheonId: pk.pantheonId,
      wallet: { gold: 10000, wood: 20, stone: 20, crystal: 10, favor: 10 },
      town: { townId: 'westharbor', siteId: 'sk_town_w', name: 'Westharbor', archetypeId: pk.archetypeId, buildings: pk.buildings, population: pk.population, covenants: pk.covenants },
      hero: hero(pl, pk, 'westharbor'),
    },
    rivals: [
      {
        playerId: 'rival',
        name: 'Eastharbor',
        pantheonId: rk.pantheonId,
        color: '#c0392b',
        wallet: { gold: 10000, wood: 20, stone: 20, crystal: 10, favor: 10 },
        town: { townId: 'eastharbor', siteId: 'sk_town_e', name: 'Eastharbor', archetypeId: rk.archetypeId, buildings: rk.buildings, population: rk.population, covenants: rk.covenants },
        hero: hero(rl, rk, 'eastharbor'),
      },
    ],
    initialFlags: ['skirmish'],
    purchasableBuildingIds: null,
    heroHiringEnabled: true,
    sites: SITES,
    objectives: [
      { id: 'sk_gold', title: 'Take the gold mine', description: 'Defeat the mine guards and hold the central gold mine.', category: 'optional', initialStatus: 'active', condition: { type: 'site_cleared', siteId: 'sk_gold' }, markerSiteId: 'sk_gold' },
      { id: 'sk_victory', title: 'Defeat Eastharbor', description: 'Defeat every rival hero and take every rival town.', category: 'primary', initialStatus: 'active', condition: { type: 'flag', flag: 'rivals_eliminated' } },
    ],
    hostileHeroes: [],
    helpTopics: [{ id: 'sieges', title: 'Sieges', text: 'Entering an enemy town that has a garrison or a visiting hero starts a siege. The Fort gives walls and a gate, the Citadel adds a keep and a moat, the Castle stronger walls and two towers. Your Catapult removes one structure point at the start of every round; Cyclopes can batter the walls instead of shooting. The defender chooses at most seven stacks; the rest wait in reserve and are lost if the town falls. A town defender cannot retreat or surrender. Temporary siege model; values are proposed.' }],
    protectedHeroFailure: false,
    thumbnailAssetId: 'mission.skirmish.twin_harbors.thumbnail',
  };
}

/** Mission ID for a pantheon pairing (Greek vs. Greek keeps the original ID). */
export function skirmishMissionId(playerPantheon: string, rivalPantheon: string): string {
  return playerPantheon === 'greek' && rivalPantheon === 'greek' ? 'skirmish_twin_harbors' : `skirmish_twin_harbors_${playerPantheon}_vs_${rivalPantheon}`;
}

const PAIRS = SKIRMISH_PANTHEONS.flatMap((p) => SKIRMISH_PANTHEONS.map((r) => [p, r] as const));

export const SKIRMISH_MISSIONS: readonly MissionDefinition[] = PAIRS.map(([p, r]) => twinHarbors(skirmishMissionId(p, r), p, r));

export const SKIRMISH_SCENARIOS: readonly SkirmishScenarioDefinition[] = [
  {
    id: 'skirmish_twin_harbors',
    name: 'Twin Harbors',
    summary: 'Two harbor towns on a small coastal map. Choose your pantheon and the rival’s; local AI opponent. Values outside the Greek roster are proposed and unplaytested.',
    missionId: 'skirmish_twin_harbors',
    status: 'playable',
    variants: PAIRS.map(([p, r]) => ({ playerPantheonId: p, rivalPantheonId: r, missionId: skirmishMissionId(p, r) })),
  },
];
