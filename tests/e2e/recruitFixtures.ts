/**
 * Recruitment fixtures (handoff 2026-10-14): a two-empire Golden Fords skirmish for any
 * pantheon, its town's seven dwellings set to chosen levels (0 none, 1 base, 2 upgraded),
 * pools and treasury set, the human hero visiting the town. An ordinary save envelope,
 * brought in through Load → Import (no privileged hooks).
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { loadCatalog } from '@pr/content';
import { compileSkirmishMap, createGeneratedMatch } from '@pr/campaign';
import { createEnvelope, serializeEnvelope } from '@pr/session';
import { townGate, type ContentCatalog, type CreatureStackState, type MatchState } from '@pr/rules';

export const PANTHEONS = ['greek', 'norse', 'egyptian', 'japanese', 'celtic', 'mesoamerican'] as const;

export interface RecruitSetup {
  /** Per tier 1–7: 0 no dwelling, 1 base dwelling, 2 upgraded dwelling. */
  levels?: number[];
  /** Per tier 1–7: the family's weekly pool. */
  pools?: number[];
  wallet?: Partial<Record<'gold' | 'wood' | 'stone' | 'crystal' | 'favor', number>>;
  /** Fill the hero's army (creature ID per slot, null empty); default keeps the starting army. */
  heroArmy?: (CreatureStackState | null)[];
  garrison?: (CreatureStackState | null)[];
  /** A second visiting hero (a copy of the first, named Ione). */
  secondHero?: boolean;
  /** The hero away from the town (no visiting hero). */
  noHero?: boolean;
}

export interface RecruitFixture {
  catalog: ContentCatalog;
  match: MatchState;
  townId: string;
  heroId: string;
  /** Family and both creature IDs per tier (1–7). */
  tiers: { tier: number; familyId: string; base: string; upgraded: string; slotId: string }[];
}

export function recruitFixture(pantheonId: string, setup: RecruitSetup = {}): RecruitFixture {
  const catalog = loadCatalog();
  const rival = pantheonId === 'greek' ? 'norse' : 'greek';
  const gen = compileSkirmishMap(catalog, 'golden_fords', [
    { pantheonId, controller: 'human' },
    { pantheonId: rival, controller: 'ai' },
  ]);
  const { match } = createGeneratedMatch(catalog, gen, { matchId: `e2e-rr-${pantheonId}` });
  for (const fog of Object.values(match.fog)) fog.explored = fog.explored.map(() => 1);
  const me = Object.values(match.players).find((p) => p.controller === 'human')!.id;
  const town = Object.values(match.towns).find((t) => t.ownerId === me)!;
  const archetype = catalog.townArchetypes[town.archetypeId]!;
  const dwellings = archetype.slots.filter((s) => s.kind === 'dwelling').sort((a, b) => (a.tier ?? 0) - (b.tier ?? 0));
  const tiers = dwellings.map((slot) => {
    const fam = catalog.families[catalog.buildings[slot.chain[0]!]!.dwelling!.familyId]!;
    return { tier: slot.tier ?? 0, familyId: fam.id, base: fam.baseCreatureId, upgraded: fam.upgradedCreatureId, slotId: slot.id };
  });
  const levels = setup.levels ?? [2, 1, 2, 0, 1, 0, 0];
  const pools = setup.pools ?? [14, 9, 6, 4, 3, 2, 1];
  tiers.forEach((t, i) => {
    const lv = levels[i] ?? 0;
    if (lv > 0) (town.buildings as Record<string, number>)[t.slotId] = lv;
    else delete (town.buildings as Record<string, number>)[t.slotId];
    (town.population as Record<string, number>)[t.familyId] = pools[i] ?? 0;
  });
  const wallet = match.players[me]!.wallet as Record<string, number>;
  Object.assign(wallet, { gold: 20_000, wood: 40, stone: 40, crystal: 30, favor: 20 }, setup.wallet ?? {});
  const hero = Object.values(match.heroes).find((h) => h.ownerId === me && h.status === 'active')!;
  if (setup.noHero) hero.position = { q: hero.position.q + 6, r: hero.position.r };
  else hero.position = { ...townGate(catalog, match, town.id) };
  if (setup.heroArmy) (hero.army as { slots: (CreatureStackState | null)[] }).slots = setup.heroArmy;
  if (setup.garrison) (town.garrison as { slots: (CreatureStackState | null)[] }).slots = setup.garrison;
  if (setup.secondHero) {
    const copy = JSON.parse(JSON.stringify(hero)) as typeof hero;
    (match.heroes as Record<string, typeof hero>)['ione'] = { ...copy, id: 'ione', name: 'Ione' };
  }
  return { catalog, match, townId: town.id, heroId: hero.id, tiers };
}

export function writeFixture(f: RecruitFixture, name: string): string {
  const env = createEnvelope(f.catalog, { match: f.match, campaign: null }, { id: 'manual-1', kind: 'manual', name, savedAt: new Date(0).toISOString() });
  const file = join(tmpdir(), `${name.replace(/\W+/g, '-')}.prsave.json`);
  writeFileSync(file, serializeEnvelope(env));
  return file;
}
