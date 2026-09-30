/**
 * Factories for runtime aggregates whose construction must respect invariants
 * (seven army slots, 18 town locations, derived movement/mana).
 *
 * Scenario starting state is LOADED here, not replayed: no construction events,
 * no initial-growth grants, no dawn payout (campaign/01 §3).
 */
import type { AssetId, CreatureFamilyId, HeroClassId, HeroDefinitionId, HeroId, PlayerId, SiteId, TownArchetypeId, TownId } from '../ids';
import type { HexCoord } from '../core/hex';
import { getBuilding, getHeroClass, getTownArchetype, type ContentCatalog } from '../definitions/catalog';
import type { HeroAttribute } from '../definitions/logic';
import type { StackSpec } from '../definitions/world';
import type { ArmyState, HeroState, MatchState, TownState } from '../state/match';
import { ARMY_SLOT_COUNT } from '../state/match';

export function armyFromSpecs(specs: readonly StackSpec[], idPrefix: string): ArmyState {
  if (specs.length > ARMY_SLOT_COUNT) throw new Error(`An army has at most ${ARMY_SLOT_COUNT} stacks`);
  const slots: ArmyState['slots'] = Array.from({ length: ARMY_SLOT_COUNT }, () => null);
  specs.forEach((s, i) => {
    slots[i] = { stackId: `${idPrefix}_${i}`, creatureId: s.creatureId, count: s.count };
  });
  return { slots };
}

export interface HeroSetup {
  readonly id: HeroId;
  readonly definitionId: HeroDefinitionId;
  readonly name: string;
  readonly ownerId: PlayerId;
  readonly classId: HeroClassId;
  readonly portraitAssetId: AssetId;
  readonly level: number;
  readonly xp: number;
  readonly attributes: Readonly<Record<HeroAttribute, number>>;
  readonly skills: readonly { skillId: string; rank: number }[];
  readonly spellbook: boolean;
  readonly knownSpellIds?: readonly string[];
  readonly position: HexCoord;
  readonly army: readonly StackSpec[];
}

export function createHeroState(catalog: ContentCatalog, setup: HeroSetup): HeroState {
  getHeroClass(catalog, setup.classId); // validates class exists
  return {
    id: setup.id,
    definitionId: setup.definitionId,
    name: setup.name,
    ownerId: setup.ownerId,
    classId: setup.classId,
    portraitAssetId: setup.portraitAssetId,
    level: setup.level,
    xp: setup.xp,
    attributes: { ...setup.attributes },
    skills: setup.skills.map((s) => ({ ...s })),
    spellbook: setup.spellbook,
    knownSpellIds: [...(setup.knownSpellIds ?? [])],
    mana: 0,
    movementPoints: 0,
    position: setup.position,
    army: armyFromSpecs(setup.army, `${setup.id}_stack`),
    equipment: {},
    backpack: [],
    status: 'active',
    pendingLevels: 0,
    lastTrainedWeek: 0,
  };
}

export interface TownSetup {
  readonly id: TownId;
  readonly name: string;
  readonly ownerId: PlayerId | null;
  readonly archetypeId: TownArchetypeId;
  readonly siteId: SiteId;
  readonly coord: HexCoord;
  readonly buildings: readonly string[];
  readonly population: Readonly<Record<CreatureFamilyId, number>>;
  readonly covenants: readonly CreatureFamilyId[];
}

export function createTownState(catalog: ContentCatalog, setup: TownSetup): TownState {
  const archetype = getTownArchetype(catalog, setup.archetypeId);
  const buildings: Record<string, number> = {};
  for (const slot of archetype.slots) buildings[slot.id] = 0;
  for (const id of setup.buildings) {
    const def = getBuilding(catalog, id);
    if (buildings[def.slotId] === undefined) throw new Error(`${id} does not belong to ${archetype.id}`);
    buildings[def.slotId] = Math.max(buildings[def.slotId] ?? 0, def.level);
  }
  return {
    id: setup.id,
    name: setup.name,
    ownerId: setup.ownerId,
    pantheonId: archetype.pantheonId,
    archetypeId: setup.archetypeId,
    siteId: setup.siteId,
    coord: setup.coord,
    buildings,
    buildUsedDay: 0,
    population: { ...setup.population },
    covenants: [...setup.covenants],
    garrison: armyFromSpecs([], `${setup.id}_garrison`),
    lastOfferingWeek: 0,
    merchant: null,
  };
}

export function emptyFog(state: Pick<MatchState, 'world'>): { explored: number[] } {
  return { explored: new Array(state.world.map.width * state.world.map.height).fill(0) };
}
