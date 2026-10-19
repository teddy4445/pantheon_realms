/** Commander relic activations share the normal casting action, but need no spellbook. */
import type { ContentCatalog } from '../../definitions/catalog';
import type { BattleStackState, MatchState } from '../../state/match';
import { footprintDistance } from '../../core/hex';
import { scopeAllowed } from '../../resolvers/scenario';
import { reject, type Tx } from '../../engine/tx';
import { applyStatus, requireControl } from './actions';
import { isAlive, sideStacks, stackCells } from './common';
import { dispellableStatuses } from './libraryUtility';
import { afterLibraryCleanse } from './libraryRelics';

export function activeRelics(catalog: ContentCatalog, state: MatchState, side: 'attacker' | 'defender') {
  const commander = state.battle?.sides[side].commander;
  const hero = commander?.heroId ? state.heroes[commander.heroId] : undefined;
  if (!hero || hero.status !== 'active') return [];
  return [...new Set(Object.values(hero.equipment).flatMap((i) => i ? [i.artifactId] : []))].sort().flatMap((id) => {
    const item = catalog.artifacts[id];
    const effect = item?.effects.find((e) => e.type === 'library_active');
    return item && effect?.type === 'library_active' && scopeAllowed(state, item.scope) ? [{ item, action: effect.action }] : [];
  });
}
export function relicDispelChoices(target: BattleStackState, action: 'bind' | 'cleanse_defense' | 'dispel') {
  return action === 'bind' ? [] : dispellableStatuses(target, action === 'dispel' ? 'positive' : 'negative').filter((s) => action !== 'cleanse_defense' || s.kind === 'attack_bonus' || s.kind === 'defense_bonus');
}
export function quoteActiveRelic(catalog: ContentCatalog, state: MatchState, artifactId: string, targetId: string | null, statusSourceId?: string): { legal: boolean; reason: string | null } {
  const fail = (reason: string) => ({ legal: false, reason });
  const battle = state.battle, stack = battle?.activeStackId ? battle.stacks[battle.activeStackId] : undefined;
  if (!battle || battle.status !== 'active' || (battle.phase !== 'normal' && battle.phase !== 'waiting') || !stack) return fail('Use a relic during a friendly activation');
  const side = battle.sides[stack.side];
  const relic = activeRelics(catalog, state, stack.side).find((r) => r.item.id === artifactId);
  if (!relic) return fail('Requires the equipped relic and a living commander');
  if (side.castThisRound) return fail('The commander has already used this round’s casting action');
  if (side.effectUses?.[`relic:${relic.action}`]) return fail('This relic power was already used in this battle');
  const target = targetId ? battle.stacks[targetId] : undefined;
  if (!target || !isAlive(target) || (target.side === stack.side) !== (relic.action === 'cleanse_defense')) return fail(`Choose a living ${relic.action === 'cleanse_defense' ? 'allied' : 'enemy'} stack`);
  if (relic.action === 'bind') {
    if (target.statuses.some((s) => s.kind === 'rooted') || target.controlGrace?.includes('rooted')) return fail('The stack is bound or has a recovery activation');
    if (!sideStacks(battle, stack.side).some((s) => footprintDistance(stackCells(catalog, s), stackCells(catalog, target)) <= 6)) return fail('Choose an enemy within six hexes of an ally');
  } else {
    const choices = relicDispelChoices(target, relic.action);
    if (!choices.length) return fail('No removable spell enchantment of the required kind');
    if (statusSourceId && !choices.some((s) => s.sourceId === statusSourceId)) return fail('That spell effect cannot be removed');
  }
  return { legal: true, reason: null };
}
export function commitActivateArtifact(tx: Tx, artifactId: string, targetId: string, statusSourceId?: string): void {
  const q = quoteActiveRelic(tx.catalog, tx.state, artifactId, targetId, statusSourceId);
  if (!q.legal) reject('illegal_action', q.reason!);
  const battle = tx.state.battle!, stack = battle.stacks[battle.activeStackId!]!;
  requireControl(tx, battle, stack.side);
  const side = battle.sides[stack.side], relic = activeRelics(tx.catalog, tx.state, stack.side).find((r) => r.item.id === artifactId)!;
  const target = battle.stacks[targetId]!;
  if (relic.action !== 'bind') {
    const choices = relicDispelChoices(target, relic.action);
    if (!statusSourceId && choices.length > 1) reject('illegal_target', 'Choose which spell effect to remove');
    const source = statusSourceId ?? choices[0]!.sourceId;
    target.statuses = target.statuses.filter((s) => s.sourceId !== source);
    if (relic.action === 'cleanse_defense') afterLibraryCleanse(battle, stack.side, target);
  }
  side.castThisRound = true;
  (side.effectUses ??= {})[`relic:${relic.action}`] = 1;
  if (relic.action !== 'dispel') applyStatus(target, {
    sourceId: `${relic.action === 'bind' ? 'spell' : 'artifact'}:${artifactId}`, label: relic.item.name,
    kind: relic.action === 'bind' ? 'rooted' : 'defense_bonus', amount: relic.action === 'bind' ? 1 : 2,
    numerator: 1, denominator: 1, expiresAtRound: Number.MAX_SAFE_INTEGER, expiresAfterActivation: true, nextActivationStarted: false,
    dispellable: relic.action === 'bind',
  }, { battle, casterSide: stack.side, casterHeroId: side.commander!.heroId });
  tx.emit({ kind: 'BattleArtifactActivated', artifactId, heroId: side.commander!.heroId!, targetId });
}
