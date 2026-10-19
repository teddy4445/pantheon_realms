/**
 * Sea encounters, read-only (sea-creature delivery 2026-10-17; scenario feature `seaEncountersV1`,
 * which needs hero ships `navalMovementV1`): which creatures may fight on which side of the
 * single-ship sea board, where the fightable sea monsters are, and which ships a battle holds.
 * Pure and deterministic; the commits live in systems/seaEncounter.ts and systems/battle/seaBoard.ts.
 */
import type { CreatureId, SiteId } from '../ids';
import { hexEquals, hexKey, type HexCoord } from '../core/hex';
import { getAbility, type ContentCatalog } from '../definitions/catalog';
import type { SiteDefinition, StackSpec } from '../definitions/world';
import { BATTLEFIELD_LAYOUTS, navalRules, type BattlefieldLayoutDefinition } from '../definitions/naval';
import { SINGLE_SHIP_SEA_ENCOUNTER_V2, type MovementClass, type SeaEncounterBoardRules } from '../definitions/seaEncounter';
import type { BattleSideId, BattleState, MatchState, ShipState, SiteState } from '../state/match';
import { isWater, navalEnabled } from './naval';
import { scenarioMission } from './scenario';
import { missionSite } from './world';

/** How a creature occupies a battlefield: flying (`flight`), swimming (the `swimmer` trait) or walking. */
export function creatureMovementClass(catalog: ContentCatalog, creatureId: CreatureId): MovementClass {
  const rules = (catalog.creatures[creatureId]?.abilityIds ?? []).map((id) => getAbility(catalog, id).rule.type);
  if (rules.includes('flight')) return 'fly';
  if (rules.includes('swimmer')) return 'swim';
  return 'ground';
}

/** The family of a creature appears only in sea encounters (never recruited, never on land). */
export function seaOnlyCreature(catalog: ContentCatalog, creatureId: CreatureId): boolean {
  const fam = catalog.families[catalog.creatures[creatureId]?.familyId ?? ''];
  return fam?.availability === 'sea_encounters';
}

const CLASS_WORD: Readonly<Record<MovementClass, string>> = { ground: 'walk', swim: 'swim', fly: 'fly' };

/**
 * Why an army may not take this side of a sea encounter (null: it may): every stack's movement class
 * must be allowed there (sea side: swimmers and flyers only; ship side: walkers and flyers).
 */
export function seaArmyProblem(catalog: ContentCatalog, rules: SeaEncounterBoardRules, onShip: boolean, creatures: readonly CreatureId[]): string | null {
  const allowed = onShip ? rules.shipClasses : rules.seaClasses;
  for (const id of creatures) {
    const cls = creatureMovementClass(catalog, id);
    if (!allowed.includes(cls)) {
      const name = catalog.creatures[id]?.pluralName ?? id;
      return onShip ? `${name} cannot fight from a ship's deck: creatures that ${CLASS_WORD[cls]} stay in the water` : `${name} cannot fight at sea: only creatures that swim or fly can`;
    }
  }
  return null;
}

/** Sea encounters are part of this scenario (absent flag = off: older saves, existing campaigns). Needs hero ships. */
export function seaEncountersEnabled(state: Pick<MatchState, 'scenario'>): boolean {
  return state.scenario.features?.seaEncountersV1 === true && navalEnabled(state);
}

/** The sea-encounter layout of this rules profile. */
export function seaLayout(catalog: ContentCatalog): BattlefieldLayoutDefinition {
  return BATTLEFIELD_LAYOUTS[navalRules(catalog.rulesProfile).seaEncounterLayoutId ?? SINGLE_SHIP_SEA_ENCOUNTER_V2.id] ?? SINGLE_SHIP_SEA_ENCOUNTER_V2;
}

/** The guard army a sea-monster site holds now (its saved survivors, else the written army). */
export function seaMonsterArmy(def: SiteDefinition, st: SiteState | undefined): StackSpec[] {
  return [...(st?.guard ?? def.guard?.army ?? [])].filter((s): s is StackSpec => !!s && s.count > 0);
}

/**
 * Why a site cannot be fought as a sea encounter now (null: it can): it must be a live `sea_monster`
 * site on water in a scenario with sea encounters, whose army may take the sea side of the board.
 */
export function seaMonsterProblem(catalog: ContentCatalog, state: MatchState, def: SiteDefinition): string | null {
  if (!seaEncountersEnabled(state)) return 'Sea encounters are not part of this scenario';
  if (def.kind.type !== 'sea_monster' || !def.guard) return 'Not a sea monster';
  const st = state.world.sites[def.id];
  if (!st || st.cleared) return 'The sea is clear here';
  if (!isWater(state, def.coord)) return 'Sea monsters live on water';
  const army = seaMonsterArmy(def, st);
  if (army.length === 0) return 'Nothing is left to fight';
  const rules = seaLayout(catalog).sea;
  return rules ? seaArmyProblem(catalog, rules, false, army.map((s) => s.creatureId)) : 'Unknown sea battlefield';
}

/** The fightable sea-monster site on a tile (null: none). */
export function seaMonsterAt(catalog: ContentCatalog, state: MatchState, c: HexCoord): SiteDefinition | null {
  if (!seaEncountersEnabled(state)) return null;
  for (const def of scenarioMission(catalog, state)?.sites ?? []) {
    if (def.kind.type !== 'sea_monster' || !hexEquals(def.coord, c)) continue;
    return seaMonsterProblem(catalog, state, def) === null ? def : null;
  }
  return null;
}

/**
 * Water tiles a sailing hero meets as an encounter (destination only): every fightable sea-monster
 * site. Empty when the feature is off, so older saves sail exactly as before.
 */
export function seaEncounterTiles(catalog: ContentCatalog, state: MatchState): ReadonlySet<string> {
  const out = new Set<string>();
  if (!seaEncountersEnabled(state)) return out;
  for (const def of scenarioMission(catalog, state)?.sites ?? []) {
    if (def.kind.type === 'sea_monster' && seaMonsterProblem(catalog, state, def) === null) out.add(hexKey(def.coord));
  }
  return out;
}

/** Live (uncleared) sea-monster sites of the scenario (read-only; the map, the AI). */
export function seaMonsterSites(catalog: ContentCatalog, state: MatchState): SiteDefinition[] {
  if (!seaEncountersEnabled(state)) return [];
  return (scenarioMission(catalog, state)?.sites ?? []).filter((d) => d.kind.type === 'sea_monster' && !state.world.sites[d.id]?.cleared);
}

/** The site definition of a sea-monster site by ID (null: unknown or not a sea monster). */
export function seaMonsterSite(catalog: ContentCatalog, state: MatchState, siteId: string): SiteDefinition | null {
  const def = missionSite(catalog, state, siteId as SiteId);
  return def && def.kind.type === 'sea_monster' ? def : null;
}

/** The ship of a sea encounter's side (null: that side has no ship, or not a sea encounter). */
export function seaEncounterShip(state: Pick<MatchState, 'world'>, battle: Pick<BattleState, 'encounter' | 'board'>, side: BattleSideId): ShipState | null {
  const id = battle.encounter.sourceShipId;
  if (!id || battle.board?.shipSide !== side) return null;
  return state.world.ships?.[id] ?? null;
}

/** The ships a battle in progress holds `in_battle` (boarding: both; a sea encounter: its source ship). */
export function shipsInBattle(battle: Pick<BattleState, 'encounter'> | null | undefined): Set<string> {
  const out = new Set<string>();
  if (!battle) return out;
  const enc = battle.encounter;
  if (enc.kind === 'naval_boarding') {
    if (enc.attackerShipId) out.add(enc.attackerShipId);
    if (enc.defenderShipId) out.add(enc.defenderShipId);
  }
  if (enc.sourceShipId) out.add(enc.sourceShipId);
  return out;
}
