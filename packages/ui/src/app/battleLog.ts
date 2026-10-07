/**
 * The combat log, kept per battle (presentation only). The store records every
 * committed update here as it arrives — including the events published before
 * the battle screen opens (the battle's start, the first round's Catapult shot,
 * an opening morale roll) — so the log on the battle screen is complete.
 */
import { aliveCount, structureLabel, type BattleState, type ContentCatalog, type GameEvent, type MatchState } from '@pr/rules';

const LOGS = new Map<string, string[]>();
/** The last state of each battle (for the events that end it, when the battle is gone from the state). */
const LAST = new Map<string, BattleState>();
const KEEP = 6;


function stackName(catalog: ContentCatalog, battle: BattleState, id: string, count?: number): string {
  const s = battle.stacks[id];
  const def = s ? catalog.creatures[s.creatureId] : undefined;
  if (!def) return id;
  const n = count ?? (s ? aliveCount(catalog, s) : 0);
  return n === 1 ? def.name : def.pluralName;
}

function describe(catalog: ContentCatalog, battle: BattleState, e: GameEvent, detail: string): string | null {
  switch (e.kind) {
    case 'BattleRoundStarted':
      return `— Round ${e.round} —`;
    case 'BattleStackMoved':
      return detail === 'compact' ? null : `${stackName(catalog, battle, e.stackId)} ${e.flying ? 'fly' : 'move'} ${e.path.length} hex${e.path.length === 1 ? '' : 'es'}.`;
    case 'BattleAttack': {
      const verb = e.mode === 'shot' ? 'shoot' : e.mode === 'retaliation' ? 'retaliate against' : 'attack';
      return `${stackName(catalog, battle, e.attackerId)} ${verb} ${stackName(catalog, battle, e.targetId)}: ${e.damage} damage, ${e.killed} slain${e.luck ? ' (lucky strike)' : ''}.`;
    }
    case 'BattleSpellCast':
      return `${catalog.spells[e.spellId]?.name ?? e.spellId} on ${stackName(catalog, battle, e.targetId)}${e.damage ? `: ${e.damage} damage` : ''}${e.healed ? `: ${e.healed} healed` : ''}.`;
    case 'BattleAbilityUsed':
      return `${stackName(catalog, battle, e.stackId)} use ${catalog.abilities[e.abilityId]?.name ?? e.abilityId} on ${stackName(catalog, battle, e.targetId)}.`;
    case 'BattleStackShapeshifted':
      return `${stackName(catalog, battle, e.stackId)} ${e.aspect ? `take the ${e.aspect} aspect` : 'return to their normal aspect'}${e.free ? ' (free)' : ''}.`;
    case 'BattleCasualtiesRecovered':
      return `${e.count} ${e.count === 1 ? catalog.creatures[e.creatureId]?.name : catalog.creatures[e.creatureId]?.pluralName} return after the battle.`;
    case 'BattleStackDefended':
      return `${stackName(catalog, battle, e.stackId)} defend.`;
    case 'BattleStackWaited':
      return `${stackName(catalog, battle, e.stackId)} wait.`;
    case 'BattleMorale':
      return `${stackName(catalog, battle, e.stackId)}: ${e.positive ? 'high morale — act again!' : 'low morale — they falter.'}`;
    case 'BattleStackDestroyed':
      return `${catalog.creatures[battle.stacks[e.stackId]?.creatureId ?? '']?.pluralName ?? 'A stack'} destroyed.`;
    case 'BattleEnded':
      return `Battle over: ${e.outcome} (${e.winner} wins).`;
    case 'BattleDefendersSelected':
      return `${e.count} stack${e.count === 1 ? '' : 's'} defend the town${e.reserves ? `; ${e.reserves} in reserve` : ''}.`;
    case 'BattleDeploymentStarted':
      return 'Deployment: arrange your army (Tactics).';
    case 'BattleDeploymentConfirmed':
      return `${e.side === 'attacker' ? 'Attacker' : 'Defender'} deployment confirmed.`;
    case 'SiegeStructureDamaged':
      return `${e.source === 'catapult' ? 'Catapult' : stackName(catalog, battle, e.attackerId ?? '')} strikes the ${structureLabel(e.structureId).toLowerCase()} (${e.hp} left).`;
    case 'SiegeStructureDestroyed':
      return `${structureLabel(e.structureId)} destroyed${e.structureId.startsWith('wall') || e.structureId === 'gate' ? ' — breach!' : '.'}`;
    case 'SiegeTurretShot':
      return `${structureLabel(e.structureId)} fires on ${stackName(catalog, battle, e.targetId)}: ${e.damage} damage, ${e.killed} slain.`;
    case 'SiegeMoatDamage':
      return `${stackName(catalog, battle, e.stackId)} wade into the moat: ${e.damage} damage, ${e.killed} slain.`;
    case 'SiegeCatapultAimed':
      return `The Catapult takes aim at the ${structureLabel(e.structureId).toLowerCase()}.`;
    case 'BattleDefendersMerged':
      return `${e.stacks} stacks of ${catalog.creatures[e.creatureId]?.pluralName ?? e.creatureId} combine into one of ${e.count}.`;
    default:
      return null;
  }
}


/** Record one committed update's battle events. */
export function recordBattleEvents(catalog: ContentCatalog, state: MatchState, events: readonly GameEvent[], detail: string): void {
  const live = state.battle ?? null;
  if (live) LAST.set(live.battleId, live);
  const ended = events.find((e) => e.kind === 'BattleEnded') as { battleId?: string } | undefined;
  const id = live?.battleId ?? ended?.battleId ?? null;
  if (!id) return;
  const snapshot = live ?? LAST.get(id);
  if (!snapshot) return;
  const lines = LOGS.get(id) ?? [];
  let added = false;
  for (const e of events) {
    const text = describe(catalog, snapshot, e, detail);
    if (text) {
      lines.push(text);
      added = true;
    }
  }
  if (!added && LOGS.has(id)) return;
  LOGS.delete(id);
  LOGS.set(id, lines.slice(-200));
  // Only the most recent battles are kept.
  while (LOGS.size > KEEP) {
    const oldest = LOGS.keys().next().value as string;
    LOGS.delete(oldest);
    LAST.delete(oldest);
  }
}

/** The log of one battle, oldest line first. */
export function battleLogLines(battleId: string): readonly string[] {
  return LOGS.get(battleId) ?? [];
}

/** Forget every log (a different game was loaded or started). */
export function clearBattleLogs(): void {
  LOGS.clear();
  LAST.clear();
}
