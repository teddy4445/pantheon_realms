/**
 * ScenarioResolver: the mission definition a match is played under.
 *
 * Authored scenarios (campaign missions, Twin Harbors) live in the content
 * catalog. Generated skirmishes carry their own definition inside the match
 * (`MatchState.customMission`), produced once by the map generator and saved
 * with the game, so every rule reads sites, objectives and setup from the same
 * place regardless of where the scenario came from.
 */
import type { ContentCatalog } from '../definitions/catalog';
import type { MissionDefinition } from '../definitions/campaign';
import type { ContentScope } from '../definitions/logic';
import type { MatchState } from '../state/match';

export function scenarioMission(catalog: ContentCatalog, state: Pick<MatchState, 'customMission' | 'mission'>): MissionDefinition | undefined {
  return state.customMission ?? catalog.missions[state.mission.missionId];
}

/** Like scenarioMission, but throws a descriptive error when the scenario is unknown. */
export function requireScenarioMission(catalog: ContentCatalog, state: Pick<MatchState, 'customMission' | 'mission'>): MissionDefinition {
  const m = scenarioMission(catalog, state);
  if (!m) throw new Error(`Unknown scenario "${state.mission.missionId}"`);
  return m;
}

/** True when content of this scope may appear in the match ('expanded' needs the scenario feature). */
export function scopeAllowed(state: Pick<MatchState, 'scenario'>, scope: ContentScope | undefined): boolean {
  return (scope ?? 'core') === 'core' || state.scenario.features?.expandedContent === true;
}
