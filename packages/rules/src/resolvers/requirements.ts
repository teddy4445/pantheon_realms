/**
 * RequirementResolver: evaluates data-defined requirements in a scope.
 *
 * Returns a human-readable reason for the FIRST missing requirement so that
 * locked cards explain the dependency (design/03 "What the Town screen must communicate").
 */
import type { HeroId, PlayerId, TownId } from '../ids';
import { getBuilding, getGod, getSkill, type ContentCatalog } from '../definitions/catalog';
import type { RequirementDefinition } from '../definitions/logic';
import type { MatchState } from '../state/match';
import { playerTowns, townHasBuilding } from './town';

export interface RequirementScope {
  readonly playerId: PlayerId;
  readonly townId?: TownId;
  readonly heroId?: HeroId;
}

export interface RequirementResult {
  readonly ok: boolean;
  /** First missing requirement, phrased for players. */
  readonly reason: string | null;
}

const OK: RequirementResult = { ok: true, reason: null };

export function evaluateRequirement(
  catalog: ContentCatalog,
  state: MatchState,
  req: RequirementDefinition,
  scope: RequirementScope,
): RequirementResult {
  const player = state.players[scope.playerId];
  if (!player) return { ok: false, reason: 'Unknown player' };
  switch (req.type) {
    case 'has_building': {
      const town = scope.townId ? state.towns[scope.townId] : undefined;
      if (!town) return { ok: false, reason: 'Requires a town' };
      return townHasBuilding(catalog, town, req.buildingId)
        ? OK
        : { ok: false, reason: `Requires ${getBuilding(catalog, req.buildingId).name}` };
    }
    case 'has_god':
      return player.pantheon.patronGodId === req.godId || player.pantheon.minorGodIds.includes(req.godId)
        ? OK
        : { ok: false, reason: `Requires commitment to ${getGod(catalog, req.godId).name}` };
    case 'has_god_in_group': {
      const chosen = player.pantheon.minorGodIds.some((g) => catalog.gods[g]?.exclusivityGroup === req.group);
      return chosen ? OK : { ok: false, reason: groupReason(req.group) };
    }
    case 'no_god_in_group': {
      const chosen = player.pantheon.minorGodIds.find((g) => catalog.gods[g]?.exclusivityGroup === req.group);
      return chosen ? { ok: false, reason: `Already committed to ${getGod(catalog, chosen).name}` } : OK;
    }
    case 'town_has_covenant': {
      const town = scope.townId ? state.towns[scope.townId] : undefined;
      if (!town) return { ok: false, reason: 'Requires a town' };
      const fam = catalog.families[req.familyId];
      return town.covenants.includes(req.familyId)
        ? OK
        : { ok: false, reason: `Requires an assigned ${fam?.name ?? req.familyId} covenant in this town` };
    }
    case 'hero_level_at_least': {
      const hero = scope.heroId ? state.heroes[scope.heroId] : undefined;
      return hero && hero.level >= req.level ? OK : { ok: false, reason: `Requires hero level ${req.level}` };
    }
    case 'hero_skill_at_least': {
      const hero = scope.heroId ? state.heroes[scope.heroId] : undefined;
      const rank = hero?.skills.find((s) => s.skillId === req.skillId)?.rank ?? 0;
      return rank >= req.rank
        ? OK
        : { ok: false, reason: `Requires ${getSkill(catalog, req.skillId).name} ${'I'.repeat(req.rank)}` };
    }
    case 'hero_has_spellbook': {
      const hero = scope.heroId ? state.heroes[scope.heroId] : undefined;
      return hero?.spellbook ? OK : { ok: false, reason: 'Requires a spellbook' };
    }
    case 'mission_flag':
      return state.mission.flags[req.flag] ? OK : { ok: false, reason: flagReason(req.flag) };
    case 'objective_completed': {
      const o = state.mission.objectives[req.objectiveId];
      const def = catalog.missions[state.mission.missionId]?.objectives.find((x) => x.id === req.objectiveId);
      return o?.status === 'completed'
        ? OK
        : { ok: false, reason: `Requires objective: ${def?.title ?? req.objectiveId}` };
    }
    case 'unique_per_player': {
      const others = playerTowns(state, scope.playerId).filter(
        (t) => t.id !== scope.townId && townHasBuilding(catalog, t, req.buildingId),
      );
      return others.length === 0
        ? OK
        : { ok: false, reason: `Only one ${getBuilding(catalog, req.buildingId).name} per player` };
    }
    case 'all_of': {
      for (const r of req.requirements) {
        const res = evaluateRequirement(catalog, state, r, scope);
        if (!res.ok) return res;
      }
      return OK;
    }
    case 'any_of': {
      let first: RequirementResult | null = null;
      for (const r of req.requirements) {
        const res = evaluateRequirement(catalog, state, r, scope);
        if (res.ok) return OK;
        first ??= res;
      }
      return first ?? OK;
    }
  }
}

export function evaluateAll(
  catalog: ContentCatalog,
  state: MatchState,
  reqs: readonly RequirementDefinition[],
  scope: RequirementScope,
): RequirementResult {
  for (const r of reqs) {
    const res = evaluateRequirement(catalog, state, r, scope);
    if (!res.ok) return res;
  }
  return OK;
}

/** Every missing requirement (for an expanded dependency chain). */
export function missingRequirements(
  catalog: ContentCatalog,
  state: MatchState,
  reqs: readonly RequirementDefinition[],
  scope: RequirementScope,
): string[] {
  const out: string[] = [];
  for (const r of reqs) {
    const res = evaluateRequirement(catalog, state, r, scope);
    if (!res.ok && res.reason) out.push(res.reason);
  }
  return out;
}

function groupReason(group: string): string {
  return group === 'first_minor' ? 'Requires your first minor-god commitment' : `Requires a commitment in ${group.replace(/_/g, ' ')}`;
}

function flagReason(flag: string): string {
  return `Requires story progress (${flag.replace(/_/g, ' ')})`;
}
