/**
 * City-dedication fixtures (handoff §09, app 1.5.0): a two-empire Golden Fords skirmish for
 * any pantheon (city dedications on, as in every new skirmish), its town at Temple II with
 * chosen buildings, the patron and committed minor gods (SelectGod through the processor),
 * an optional first dedication or paid switch (DedicateTown / ScheduleTownRededication through
 * the processor), the day and the treasury. Written as an ordinary save envelope and brought
 * in through Load → Import — no privileged hooks.
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { loadCatalog } from '@pr/content';
import { compileSkirmishMap, createGeneratedMatch } from '@pr/campaign';
import { createEnvelope, serializeEnvelope } from '@pr/session';
import { GameDriver } from '@pr/testing';
import { townGate, type ContentCatalog, type CreatureStackState, type MatchState } from '@pr/rules';

export const PANTHEONS = ['greek', 'norse', 'egyptian', 'japanese', 'celtic', 'mesoamerican'] as const;
export const PATRON: Record<string, string> = {
  greek: 'zeus',
  norse: 'norse_odin',
  egyptian: 'egyptian_ra',
  japanese: 'japanese_amaterasu',
  celtic: 'celtic_dagda',
  mesoamerican: 'mesoamerican_quetzalcoatl',
};
/** One first-choice god per pantheon for the per-pantheon pane (Huitzilopochtli: the longest name). */
export const FIRST_MINOR: Record<string, string> = {
  greek: 'athena',
  norse: 'norse_tyr',
  egyptian: 'egyptian_isis',
  japanese: 'japanese_hachiman',
  celtic: 'celtic_morrigan',
  mesoamerican: 'mesoamerican_huitzilopochtli',
};

export interface DedicationSetup {
  pantheon: string;
  /** Minor gods committed in order (SelectGod). */
  minors?: string[];
  /** Built level per town location (slot id or the support role), applied before the gods are chosen. */
  buildings?: Record<string, number>;
  /** The free first dedication (DedicateTown). */
  dedicate?: string;
  /** A paid switch after it (ScheduleTownRededication). */
  schedule?: string;
  /** Temple level after the dedication (1: the dedication becomes dormant). */
  templeAfter?: number;
  /** World day (7: End Day brings the next week). */
  day?: number;
  wallet?: Partial<Record<'gold' | 'wood' | 'stone' | 'crystal' | 'favor', number>>;
  /** Weekly pools per family. */
  population?: Record<string, number>;
  /** Quarter credits saved per family (a rare family's progress). */
  credits?: Record<string, number>;
  heroArmy?: (CreatureStackState | null)[];
  /** The hero away from the town. */
  noHero?: boolean;
  /** No spellbook for the hero (spellbook purchase). */
  noSpellbook?: boolean;
  /** The rival's town (another pantheon) is the player's too, at Temple II. */
  foreignTown?: boolean;
  /** An old save: the scenario has no city-dedication flag. */
  legacy?: boolean;
}

export interface DedicationFixture {
  file: string;
  catalog: ContentCatalog;
  state: MatchState;
  townId: string;
  heroId: string;
  foreignTownId: string | null;
}

let catalogCache: ContentCatalog | null = null;

export function dedicationFixture(name: string, setup: DedicationSetup): DedicationFixture {
  const catalog = (catalogCache ??= loadCatalog());
  const rival = setup.pantheon === 'norse' ? 'greek' : 'norse';
  const gen = compileSkirmishMap(catalog, 'golden_fords', [
    { pantheonId: setup.pantheon, controller: 'human' },
    { pantheonId: rival, controller: 'ai' },
  ]);
  const { match } = createGeneratedMatch(catalog, gen, { matchId: `e2e-ded-${name.replace(/\W+/g, '-')}`, startingGodId: PATRON[setup.pantheon]! });
  for (const fog of Object.values(match.fog)) fog.explored = fog.explored.map(() => 1);
  if (setup.legacy) delete (match.scenario.features as Record<string, unknown>).cityDedicationsV1;
  const me = 'player';
  const town = Object.values(match.towns).find((t) => t.ownerId === me)!;
  const arch = catalog.townArchetypes[town.archetypeId]!;
  const levels = town.buildings as Record<string, number>;
  levels['pantheon_temple'] = 2;
  levels['civic_hall'] = Math.max(levels['civic_hall'] ?? 0, 3);
  for (const [k, v] of Object.entries(setup.buildings ?? {})) {
    const slot = arch.slots.find((s) => s.id === k || s.role === k);
    levels[slot?.id ?? k] = v;
  }
  Object.assign(match.players[me]!.wallet as Record<string, number>, { gold: 20_000, wood: 40, stone: 40, crystal: 30, favor: 100 }, setup.wallet ?? {});
  const hero = Object.values(match.heroes).find((h) => h.ownerId === me && h.status === 'active')!;
  if (setup.noHero) hero.position = { q: hero.position.q + 6, r: hero.position.r };
  else hero.position = { ...townGate(catalog, match, town.id) };
  if (setup.heroArmy) (hero.army as { slots: (CreatureStackState | null)[] }).slots = setup.heroArmy;
  if (setup.noSpellbook) (hero as { spellbook: boolean }).spellbook = false;
  if (setup.day) (match as { day: number }).day = setup.day;
  let foreignTownId: string | null = null;
  if (setup.foreignTown) {
    const other = Object.values(match.towns).find((t) => t.id !== town.id)!;
    (other as { ownerId: string | null }).ownerId = me;
    (other.buildings as Record<string, number>)['pantheon_temple'] = 2;
    foreignTownId = other.id;
  }
  const d = new GameDriver(match, catalog);
  for (const g of setup.minors ?? []) d.do({ kind: 'SelectGod', godId: g });
  if (setup.dedicate) d.do({ kind: 'DedicateTown', townId: town.id, godId: setup.dedicate });
  if (setup.schedule) d.do({ kind: 'ScheduleTownRededication', townId: town.id, godId: setup.schedule });
  const t = d.state.towns[town.id]!;
  if (setup.templeAfter !== undefined) (t.buildings as Record<string, number>)['pantheon_temple'] = setup.templeAfter;
  for (const [f, n] of Object.entries(setup.population ?? {})) (t.population as Record<string, number>)[f] = n;
  for (const [f, n] of Object.entries(setup.credits ?? {})) t.dedication!.growthCredits[f] = n;
  const env = createEnvelope(catalog, { match: d.state, campaign: null }, { id: 'manual-1', kind: 'manual', name, savedAt: new Date(0).toISOString() });
  const file = join(tmpdir(), `ded-${name.replace(/\W+/g, '-')}.prsave.json`);
  writeFileSync(file, serializeEnvelope(env));
  return { file, catalog, state: d.state, townId: town.id, heroId: hero.id, foreignTownId };
}

/** The slot id of a family's dwelling in the fixture's town. */
export function dwellingSlot(f: DedicationFixture, familyId: string): string {
  const town = f.state.towns[f.townId]!;
  const arch = f.catalog.townArchetypes[town.archetypeId]!;
  return arch.slots.find((s) => s.kind === 'dwelling' && s.chain.some((b) => f.catalog.buildings[b]?.dwelling?.familyId === familyId))!.id;
}
