/**
 * StoryDirector (proposed this build): mission story scenes as data.
 *
 * After every committed command the rules check each scene of the mission that
 * has not played yet; when its trigger holds, the scene is recorded in
 * MatchState (so a loaded game never replays it) and a StoryScene event tells
 * the presentation to show its lines. Scenes never change play.
 */
import type { StoryTriggerDefinition } from '../definitions/campaign';
import type { Tx } from '../engine/tx';
import { scenarioMission } from '../resolvers/scenario';
import { missionSite } from '../resolvers/world';
import { missionPlayerId } from './quests';

function triggered(tx: Tx, trigger: StoryTriggerDefinition): boolean {
  const state = tx.state;
  const playerId = missionPlayerId(tx.catalog, state);
  switch (trigger.type) {
    case 'objective_completed':
      return state.mission.objectives[trigger.objectiveId]?.status === 'completed';
    case 'site_visited':
      return state.world.sites[trigger.siteId]?.visitedBy.includes(playerId) === true;
    case 'site_cleared':
      // Only guarded sites start uncleared, so this fires when their guard falls.
      return state.world.sites[trigger.siteId]?.cleared === true && !!missionSite(tx.catalog, state, trigger.siteId)?.guard;
    case 'battle_started': {
      if (!tx.events.some((e) => e.kind === 'BattleStarted')) return false;
      const enc = state.battle?.encounter;
      if (!enc) return false;
      if (trigger.siteId && enc.siteId !== trigger.siteId) return false;
      if (trigger.heroDefinitionId) {
        const defender = enc.defenderHeroId ? state.heroes[enc.defenderHeroId] : undefined;
        if (defender?.definitionId !== trigger.heroDefinitionId) return false;
      }
      return true;
    }
    case 'casualties': {
      if (!tx.events.some((e) => e.kind === 'BattleEnded')) return false;
      const r = state.lastBattleResult;
      if (!r || !r.playerSide) return false;
      const mine = r.playerSide === 'attacker' ? r.attacker : r.defender;
      if (mine.playerId !== playerId) return false;
      const lost = mine.lines.reduce((n, l) => n + Math.max(0, l.before - l.after), 0);
      return lost >= trigger.minLost;
    }
    case 'god_committed': {
      const pan = state.players[playerId]?.pantheon;
      return !!pan && (pan.patronGodId === trigger.godId || pan.minorGodIds.includes(trigger.godId));
    }
    case 'flag':
      return state.mission.flags[trigger.flag] === true;
    case 'day_at_least':
      return state.day >= trigger.day;
  }
}

export function evaluateStory(tx: Tx): void {
  const mission = scenarioMission(tx.catalog, tx.state);
  const scenes = mission?.storyScenes;
  if (!scenes || scenes.length === 0) return;
  const played = (tx.state.mission.scenesPlayed ??= []);
  for (const scene of scenes) {
    if (played.includes(scene.id)) continue;
    // Order-aware lines (campaign v2): a scene can wait on, or exclude, known facts.
    const flags = tx.state.mission.flags;
    if (scene.ifFlags && !scene.ifFlags.every((f) => flags[f])) continue;
    if (scene.unlessFlags && scene.unlessFlags.some((f) => flags[f])) continue;
    if (!triggered(tx, scene.trigger)) continue;
    played.push(scene.id);
    tx.emit({ kind: 'StoryScene', sceneId: scene.id });
  }
}
