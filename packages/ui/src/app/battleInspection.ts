/**
 * Battle creature inspection (expedition kit 2026-10-17, handoff §04): the read-only model of one
 * stack's card. Every number comes from the rules' own resolvers — the ones the battle bar, the
 * damage preview, the AI and the commit read (`attackBreakdown`, `defenseBreakdown`,
 * `effectiveSpeed`, `strikeFactors`, `frontHp`, `aliveCount`, `retaliationAllowance`,
 * `canRetaliate`, `isShooter`) — never a copy of a formula. Statuses show their existing icons, what
 * they do, how long they last and who applied them, as recorded when they were applied
 * (`sourceHeroId`, `sourceStackId`, `sourceSide`): a source that was not recorded is "unknown",
 * never guessed from a name. Building the model changes nothing and draws no random number.
 */
import {
  aliveCount,
  attackBreakdown,
  canRetaliate,
  defenseBreakdown,
  effectiveSpeed,
  frontHp,
  isShooter,
  renewableShotCapacity,
  retaliationAllowance,
  shapeshiftRule,
  statsOf,
  strikeFactors,
  type BattleSideId,
  type BattleStackState,
  type BattleState,
  type BattleStatusState,
  type ContentCatalog,
  type MatchState,
} from '@pr/rules';
import { statusEffectText, statusIcon } from './stackMarks';

export type InspectionStatKey = 'attack' | 'defense' | 'damage' | 'speed' | 'ammo' | 'retaliation';

export interface InspectionStat {
  readonly key: InspectionStatKey;
  readonly label: string;
  /** The current (effective) value as shown. */
  readonly value: string;
  /** The creature's base value as shown (absent when the stat has none). */
  readonly base: string | null;
  /** Higher or lower than the base right now (a shape and a word on screen, not colour alone). */
  readonly change: 'up' | 'down' | null;
  /** The short line under the label ("base 6", "per creature", "next suppressed"); null for none. */
  readonly note: string | null;
  /** Base versus effective, part by part (the hover/focus explanation). */
  readonly breakdown: string;
}

export type SourceKind = 'hero' | 'commander' | 'stack' | 'miracle' | 'side' | 'unknown';

export interface InspectionSource {
  readonly kind: SourceKind;
  /** "Source: …" text. */
  readonly text: string;
  /** A living stack on the board that applied it (highlighted on hover/focus), else null. */
  readonly stackId: string | null;
}

export interface InspectionEffect {
  readonly key: string;
  readonly icon: string | null;
  readonly label: string;
  /** What it does now ("Attack +3", "takes 1/2 of ranged damage"). */
  readonly effect: string;
  readonly expiry: 'rounds' | 'activation' | 'battle';
  /** How long it lasts ("2 rounds left", "until its next activation"). */
  readonly remaining: string;
  /** When exactly it ends. */
  readonly ends: string;
  /** Applied by the other side (a curse) — said in words. */
  readonly hostile: boolean;
  readonly source: InspectionSource;
}

export interface InspectionModel {
  readonly stackId: string;
  readonly creatureId: string;
  /** Singular or plural name by the living count. */
  readonly name: string;
  readonly form: 'base' | 'upgraded' | null;
  readonly formLabel: string | null;
  readonly side: BattleSideId;
  readonly sideLabel: string;
  /** The viewer's side or the other one (null: no human side in this battle). */
  readonly allegiance: 'own' | 'enemy' | null;
  readonly ownerName: string;
  readonly alive: boolean;
  readonly count: number;
  readonly startingCount: number;
  /** Health of the front creature: ((totalHp − 1) mod H) + 1, 0 when destroyed (the rules' `frontHp`). */
  readonly frontHp: number;
  /** One creature's maximum HP (H). */
  readonly maxHp: number;
  readonly totalHp: number;
  readonly stats: readonly InspectionStat[];
  readonly effects: readonly InspectionEffect[];
  /** Defending, waited, aspect, fury: short states with their meaning. */
  readonly states: readonly string[];
  readonly active: boolean;
}

const signed = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : '0');

/** Retaliations left this round, as the rules count them (allowance 1, 2 or unlimited; Distract suppresses the next one). */
export interface RetaliationView {
  readonly allowance: number | 'unlimited';
  readonly used: number;
  readonly left: number | 'unlimited';
  /** The next retaliation that would happen is suppressed (and counts as used). */
  readonly suppressed: boolean;
  readonly suppressedBy: string | null;
  readonly canRetaliate: boolean;
  readonly text: string;
}

export function retaliationView(catalog: ContentCatalog, stack: BattleStackState): RetaliationView {
  const allowance = retaliationAllowance(catalog, stack.creatureId);
  const used = stack.retaliationsUsed;
  const left = allowance === 'unlimited' ? 'unlimited' : Math.max(0, allowance - used);
  const sup = stack.statuses.find((s) => s.kind === 'retaliation_suppressed') ?? null;
  const can = canRetaliate(catalog, stack);
  let text = allowance === 'unlimited' ? 'Unlimited' : `${left}/${allowance}`;
  if (stack.totalHp <= 0) text = '—';
  else if (sup && can) text += ' (next suppressed)';
  return { allowance, used, left, suppressed: !!sup, suppressedBy: sup?.label ?? null, canRetaliate: can, text };
}

/** Ammunition left of its maximum, or "not a shooter". */
export interface AmmunitionView {
  readonly shooter: boolean;
  readonly left: number;
  readonly max: number;
  readonly text: string;
  /** Renewable shots: the capacity the counter refills to at every round's start; null for ordinary ammunition. */
  readonly renews: number | null;
}

export function ammunitionView(catalog: ContentCatalog, stack: BattleStackState): AmmunitionView {
  const max = statsOf(catalog, stack.creatureId).shots;
  if (!isShooter(catalog, stack.creatureId)) return { shooter: false, left: 0, max: 0, text: 'Not a shooter', renews: null };
  // Renewable shots (sea creatures): the counter shows this round's shots out of the capacity it refills to.
  const renews = renewableShotCapacity(catalog, stack.creatureId);
  return { shooter: true, left: stack.shotsRemaining, max: renews ?? max, text: `${stack.shotsRemaining}/${renews ?? max}`, renews };
}

/** How long a status lasts, in the inspection's words. */
export function effectExpiry(
  catalog: ContentCatalog,
  battle: BattleState,
  stack: BattleStackState,
  st: Pick<BattleStatusState, 'expiresAtRound' | 'expiresOnActivationOf' | 'expiresAfterActivation'>,
): { expiry: InspectionEffect['expiry']; remaining: string; ends: string } {
  if (st.expiresAfterActivation) return { expiry: 'activation', remaining: 'Through its next activation', ends: 'Ends after this stack acts or loses its turn. Wait does not consume it.' };
  if (st.expiresOnActivationOf) {
    if (st.expiresOnActivationOf === stack.id) return { expiry: 'activation', remaining: 'Until its next activation', ends: 'Ends when this stack’s next scheduled turn begins.' };
    const by = battle.stacks[st.expiresOnActivationOf];
    const def = by ? catalog.creatures[by.creatureId] : undefined;
    if (by && def && by.totalHp > 0) return { expiry: 'activation', remaining: `Until the ${def.pluralName}’ next activation`, ends: `Ends when the ${def.pluralName} (${sideWord(by.side)}) begin their next scheduled turn.` };
    if (def) return { expiry: 'battle', remaining: 'Until the battle ends', ends: `It would end at the ${def.pluralName}’ next activation, but they have fallen.` };
    return { expiry: 'activation', remaining: 'Until its user’s next activation', ends: 'Ends when the stack that applied it begins its next scheduled turn.' };
  }
  if (st.expiresAtRound >= Number.MAX_SAFE_INTEGER) return { expiry: 'battle', remaining: 'Until the battle ends', ends: 'Lasts for the rest of the battle.' };
  const left = Math.max(1, st.expiresAtRound - battle.round);
  return { expiry: 'rounds', remaining: `${left} round${left === 1 ? '' : 's'} left`, ends: `Ends at the start of round ${st.expiresAtRound}.` };
}

function sideWord(side: BattleSideId): string {
  return side === 'attacker' ? 'attacker' : 'defender';
}

/**
 * Who applied a status, from what was recorded when it was applied. A stack of either side is
 * visible on the battlefield, as are both commanders; a status without a recorded source (an older
 * save, a battle set up with it) is unknown.
 */
export function effectSource(catalog: ContentCatalog, state: MatchState, battle: BattleState, st: BattleStatusState): InspectionSource {
  if (st.sourceStackId) {
    const s = battle.stacks[st.sourceStackId];
    const def = s ? catalog.creatures[s.creatureId] : undefined;
    if (s && def) {
      const n = aliveCount(catalog, s);
      if (n > 0) return { kind: 'stack', text: `${n} ${n === 1 ? def.name : def.pluralName} (${sideWord(s.side)})`, stackId: s.id };
      return { kind: 'stack', text: `${def.pluralName} (${sideWord(s.side)}, fallen)`, stackId: null };
    }
  }
  const side = st.sourceSide ?? null;
  if (st.sourceHeroId) {
    // Only a hero commanding one of the two sides of this battle is named (both are shown at the top).
    const cmdSide = (['attacker', 'defender'] as const).find((x) => battle.sides[x].commander?.heroId === st.sourceHeroId);
    const c = cmdSide ? battle.sides[cmdSide].commander : null;
    if (c && cmdSide) return { kind: 'hero', text: `${c.name} (${sideWord(cmdSide)} commander)`, stackId: null };
  }
  if (side && st.sourceId.startsWith('spell:')) {
    const c = battle.sides[side].commander;
    if (c) return { kind: 'commander', text: `${c.name} (${sideWord(side)} commander)`, stackId: null };
  }
  if (side && st.sourceId.startsWith('intervention:')) {
    const pid = battle.sides[side].playerId;
    const who = pid ? state.players[pid]?.name : null;
    return { kind: 'miracle', text: who ? `Divine intervention of ${who} (${sideWord(side)})` : `Divine intervention (${sideWord(side)})`, stackId: null };
  }
  if (side) return { kind: 'side', text: `The ${sideWord(side)}`, stackId: null };
  return { kind: 'unknown', text: 'Unknown', stackId: null };
}

function breakdown(label: string, b: { base: number; commander: number; statuses: number; aspect: number; effects: number; fury?: number; total: number }): string {
  const parts = [`base ${b.base}`];
  if (b.commander) parts.push(`commander ${signed(b.commander)}`);
  if (b.statuses) parts.push(`spells/abilities ${signed(b.statuses)}`);
  if (b.aspect) parts.push(`aspect ${signed(b.aspect)}`);
  if (b.effects) parts.push(`signature/gods/climate ${signed(b.effects)}`);
  if (b.fury) parts.push(`fury ${signed(b.fury)}`);
  return `${label} ${b.total}: ${parts.join(', ')}`;
}

const change = (value: number, base: number): 'up' | 'down' | null => (value > base ? 'up' : value < base ? 'down' : null);
const range = (a: number, b: number) => (a === b ? String(a) : `${a}–${b}`);

/** The inspection card's model for one stack (null when the stack is not in this battle). */
export function inspectionModel(catalog: ContentCatalog, state: MatchState, stackId: string, viewerSide: BattleSideId | null): InspectionModel | null {
  const battle = state.battle;
  const stack = battle?.stacks[stackId];
  const def = stack ? catalog.creatures[stack.creatureId] : undefined;
  if (!battle || !stack || !def) return null;
  const stats = statsOf(catalog, stack.creatureId);
  const count = aliveCount(catalog, stack);
  const alive = stack.totalHp > 0;
  const side = battle.sides[stack.side];
  const owner = side.playerId ? state.players[side.playerId] : undefined;

  const atk = attackBreakdown(catalog, battle, stack);
  const dfn = defenseBreakdown(catalog, battle, stack);
  // The damage pipeline's own view of this stack: its per-creature roll (blessing/curse included) and
  // the Defense its blows meet while it defends (the stack as its own target; nothing is rolled).
  const f = alive ? strikeFactors(catalog, battle, stack, stack, { mode: 'melee', chargeHexes: 0 }) : null;
  const perMin = f && f.attackerCount > 0 ? f.bMin / f.attackerCount : stats.damageMin;
  const perMax = f && f.attackerCount > 0 ? f.bMax / f.attackerCount : stats.damageMax;
  const rollStatuses = stack.statuses.filter((s) => s.kind === 'max_damage_roll' || s.kind === 'min_damage_roll');
  const speed = effectiveSpeed(catalog, stack, battle);
  const speedParts = [`base ${stats.speed}`];
  const aspect = stack.aspect ? (shapeshiftRule(catalog, stack.creatureId)?.speed ?? 0) : 0;
  if (aspect) speedParts.push(`aspect ${signed(aspect)}`);
  for (const s of stack.statuses) if (s.kind === 'speed_bonus' && s.amount) speedParts.push(`${s.label} ${signed(s.amount)}`);
  const known = stats.speed + aspect + stack.statuses.filter((s) => s.kind === 'speed_bonus').reduce((n, s) => n + s.amount, 0);
  if (speed !== known && speed > 1) speedParts.push(`signature/gods/climate ${signed(speed - known)}`);
  if (speed === 1 && known < 1) speedParts.push('never below 1');
  const ammo = ammunitionView(catalog, stack);
  const ret = retaliationView(catalog, stack);
  const defendedDefense = f && stack.defending ? f.effectiveDefense : null;

  const statsOut: InspectionStat[] = [
    { key: 'attack', label: 'Attack', value: String(atk.total), base: String(atk.base), change: change(atk.total, atk.base), note: atk.total !== atk.base ? `base ${atk.base}` : null, breakdown: breakdown('Attack', atk) },
    {
      key: 'defense',
      label: 'Defense',
      value: String(dfn.total),
      base: String(dfn.base),
      change: change(dfn.total, dfn.base),
      note: defendedDefense !== null ? `defending ${defendedDefense}` : dfn.total !== dfn.base ? `base ${dfn.base}` : null,
      breakdown: breakdown('Defense', dfn) + (defendedDefense !== null ? `; defending: blows meet Defense ${defendedDefense} (+20%)` : ''),
    },
    {
      key: 'damage',
      label: 'Damage',
      value: range(perMin, perMax),
      base: range(stats.damageMin, stats.damageMax),
      change: perMin + perMax > stats.damageMin + stats.damageMax ? 'up' : perMin + perMax < stats.damageMin + stats.damageMax ? 'down' : null,
      note: 'per creature',
      breakdown:
        `Damage per creature ${range(perMin, perMax)} (base ${range(stats.damageMin, stats.damageMax)})` +
        (rollStatuses.length ? `; ${rollStatuses.map((s) => `${s.label}: ${statusEffectText(s)}`).join('; ')}` : '') +
        `. The whole stack rolls ${range(perMin * Math.max(count, 0), perMax * Math.max(count, 0))} before Attack, Defense and other modifiers.`,
    },
    { key: 'speed', label: 'Speed', value: String(speed), base: String(stats.speed), change: change(speed, stats.speed), note: speed !== stats.speed ? `base ${stats.speed}` : null, breakdown: `Speed ${speed}: ${speedParts.join(', ')}` },
    {
      key: 'ammo',
      label: 'Ammunition',
      value: ammo.shooter ? ammo.text : '—',
      base: ammo.shooter ? String(ammo.max) : null,
      change: null,
      note: ammo.shooter ? (ammo.renews !== null ? 'shots this round' : 'shots left') : 'not a shooter',
      breakdown: ammo.shooter
        ? ammo.renews !== null
          ? `${ammo.left} of ${ammo.renews} shots left this round. Renewable shots: back to ${ammo.renews} at the start of every round (round 1 too), without spending an action.`
          : `${ammo.left} of ${ammo.max} shots left in this battle`
        : 'This creature does not shoot: ammunition does not apply.',
    },
    {
      key: 'retaliation',
      label: 'Retaliation',
      value: !alive ? '—' : ret.allowance === 'unlimited' ? '∞' : `${ret.left}/${ret.allowance}`,
      base: ret.allowance === 'unlimited' ? 'Unlimited' : String(ret.allowance),
      change: null,
      note: !alive ? null : ret.suppressed && ret.canRetaliate ? 'next suppressed' : ret.allowance === 'unlimited' ? 'unlimited' : 'this round',
      breakdown:
        (ret.allowance === 'unlimited'
          ? 'Retaliates against every melee attack this round'
          : `${ret.left === 'unlimited' ? 'Unlimited' : ret.left} of ${ret.allowance} retaliation${ret.allowance === 1 ? '' : 's'} left this round (${ret.used} used)`) +
        (ret.suppressed && ret.canRetaliate ? `; ${ret.suppressedBy ?? 'a status'}: the next retaliation is suppressed (and counts as used)` : '') +
        (!alive ? '; destroyed' : ''),
    },
  ];

  const sorted = [...stack.statuses].sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0) || (a.sourceId < b.sourceId ? -1 : a.sourceId > b.sourceId ? 1 : a.kind < b.kind ? -1 : 1));
  const effects: InspectionEffect[] = sorted.map((st, i) => ({
    key: `${st.sourceId}|${st.kind}|${i}`,
    icon: statusIcon(st),
    label: st.label,
    effect: statusEffectText(st),
    ...effectExpiry(catalog, battle, stack, st),
    hostile: st.hostile ?? (st.sourceSide ? st.sourceSide !== stack.side : false),
    source: effectSource(catalog, state, battle, st),
  }));

  const armyBarrier = battle.sides[stack.side].armyBarrier ?? 0;
  if (armyBarrier > 0) effects.push({ key: 'army-barrier', icon: 'icon.fx.shield', label: 'Golden Fleece', effect: `${armyBarrier} HP shared by the entire army`, expiry: 'battle', remaining: 'Until consumed', ends: 'Discarded when the battle ends', hostile: false, source: { kind: 'side', text: 'Source: commander equipment', stackId: null } });
  if (battle.sides[stack.side === 'attacker' ? 'defender' : 'attacker'].markedUndeadId === stack.id) effects.push({ key: 'undead-mark', icon: 'icon.fx.shadow', label: 'Mictlan Lantern', effect: 'The opposing army deals 10% more physical damage to this marked undead stack, within the shared bonus cap', expiry: 'battle', remaining: 'This battle', ends: 'The mark does not move to a different stack', hostile: true, source: { kind: 'side', text: 'Source: enemy commander equipment', stackId: null } });
  if (stack.temporaryLife) effects.push({ key: 'temporary-life', icon: 'icon.fx.divine', label: 'Door of the Duat', effect: `${stack.temporaryLife.hp} temporary HP; consumed before permanent HP, never kept after battle`, expiry: 'rounds', remaining: `${stack.temporaryLife.expiresAtRound - battle.round} rounds left`, ends: `Start of round ${stack.temporaryLife.expiresAtRound}`, hostile: false, source: { kind: 'hero', text: 'Source: temporary return spell', stackId: null } });
  if (stack.summoned?.kind === 'illusion') effects.push({ key: 'illusion', icon: 'icon.fx.shadow', label: 'Illusory twin', effect: `Copy of ${stack.summoned.sourceCount} creatures: 1 HP, 25% physical damage, no retaliation or abilities`, expiry: 'rounds', remaining: `${stack.summoned.expiresAtRound - battle.round} rounds left`, ends: 'Vanishes without XP or permanent survivors', hostile: false, source: { kind: 'stack', text: 'Source: original allied stack', stackId: stack.summoned.sourceId } });

  const states: string[] = [];
  if (alive && stack.defending) states.push(`Defending: blows meet Defense ${defendedDefense ?? dfn.total} (+20%) until its next activation`);
  if (alive && stack.waited) states.push('Waited: acts later this round');
  if (alive && stack.aspect) states.push(`${shapeshiftRule(catalog, stack.creatureId)?.aspect ?? 'Alternate'} aspect`);
  if (alive && atk.fury) states.push(`Fury: Attack ${signed(atk.fury)} while few of its creatures remain`);

  return {
    stackId: stack.id,
    creatureId: stack.creatureId,
    name: count === 1 ? def.name : def.pluralName,
    form: def.form === 'upgraded' ? 'upgraded' : def.form === 'base' ? 'base' : null,
    formLabel: def.form === 'upgraded' ? 'Upgraded form' : def.form === 'base' ? 'Base form' : null,
    side: stack.side,
    sideLabel: stack.side === 'attacker' ? 'Attacker' : 'Defender',
    allegiance: viewerSide ? (viewerSide === stack.side ? 'own' : 'enemy') : null,
    ownerName: owner?.name ?? (side.commander?.name ?? 'Neutral'),
    alive,
    count,
    startingCount: stack.startingCount,
    frontHp: frontHp(catalog, stack),
    maxHp: stats.hp,
    totalHp: Math.max(0, stack.totalHp),
    stats: statsOut,
    effects,
    states,
    active: battle.activeStackId === stack.id,
  };
}

/** The stacks the inspection can step through, in the turn order shown at the top (living ones). */
export function inspectableOrder(order: { current: readonly string[]; next: readonly string[] }, battle: BattleState): string[] {
  const out: string[] = [];
  for (const id of [...order.current, ...order.next]) if (!out.includes(id) && (battle.stacks[id]?.totalHp ?? 0) > 0) out.push(id);
  for (const s of Object.values(battle.stacks).sort((a, b) => (a.id < b.id ? -1 : 1))) if (s.totalHp > 0 && !out.includes(s.id)) out.push(s.id);
  return out;
}
