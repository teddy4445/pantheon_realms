/**
 * The small icons a battle stack carries over its count (and on the screen's
 * stack cards): what affects it right now — defending, waiting, its Shapeshift
 * aspect, and every running status, a miracle's with the miracle's own icon
 * (Brief 13), a spell's or ability's with the icon of its kind of effect. The
 * neutral creatures' statuses (handoff 2026-10-15) use a Brief 13 icon where one
 * fits (Distract: the dazed stars) and the campaign kit's reused badges otherwise
 * (Sheltering Wings: the ward; Reed Guard's pull immunity: the guard); a status
 * that ends at a stack's next turn says so. Read from the state only; never
 * changes a rule.
 */
import { shapeshiftRule, type BattleStackState, type BattleState, type BattleStatusState, type ContentCatalog } from '@pr/rules';
import type { BattleStackMark } from '@pr/presentation';
import { resolveAsset } from '../assets/manifest';

/** The icon of a status by its kind (and sign). */
export function statusKindIcon(kind: string, amount: number): string | null {
  const down = amount < 0;
  switch (kind) {
    case 'attack_bonus':
      return down ? 'icon.status.debuff' : 'icon.status.buff';
    case 'defense_bonus':
      return down ? 'icon.status.weaken' : 'icon.fx.shield';
    case 'speed_bonus':
      return down ? 'icon.status.frozen' : 'icon.stat.speed';
    case 'max_damage_roll':
      return 'icon.fx.divine';
    case 'min_damage_roll':
      return 'icon.fx.shadow';
    case 'melee_mitigation':
      return 'icon.fx.shield';
    case 'ranged_mitigation':
      return 'icon.fx.arrow';
    case 'damage_ward':
      return 'icon.ability.family_ward';
    case 'retaliation_suppressed':
      return 'icon.status.stun';
    case 'pull_immunity':
      return 'icon.ability.charge_guard';
    case 'temporary_flight': return 'icon.stat.speed';
    case 'rooted':
    case 'spell_lock':
    case 'blind':
    case 'fear': return 'icon.status.stun';
    case 'faithful_shadow':
    case 'mind_control_ward':
    case 'element_barrier': return 'icon.fx.shield';
    case 'fire_dot': return 'icon.fx.fire';
    case 'ranged_lock': return 'icon.status.stun';
    case 'retaliation_weaken': return 'icon.status.weaken';
    case 'buff_suppression': return 'icon.status.debuff';
    case 'debuff_ward': return 'icon.ability.family_ward';
    case 'projectile_spell_ward': return 'icon.fx.shield';
    case 'one_hit_thorns': return 'icon.status.buff';
    case 'retaliation_bonus': return 'icon.stat.attack';
    case 'last_creature_guard': return 'icon.fx.shield';
    case 'pierce_borrowed_defense': return 'icon.status.buff';
    default:
      return null;
  }
}

const signed = (n: number) => (n >= 0 ? `+${n}` : `−${Math.abs(n)}`);

/** What a status does, in words. */
export function statusEffectText(s: Pick<BattleStatusState, 'kind' | 'amount' | 'numerator' | 'denominator'>): string {
  switch (s.kind) {
    case 'attack_bonus':
      return `Attack ${signed(s.amount)}`;
    case 'defense_bonus':
      return `Defense ${signed(s.amount)}`;
    case 'speed_bonus':
      return `Speed ${signed(s.amount)}`;
    case 'max_damage_roll':
      return 'always deals its highest damage';
    case 'min_damage_roll':
      return 'always deals its lowest damage';
    case 'melee_mitigation':
      return `takes ${s.numerator}/${s.denominator} of melee damage`;
    case 'ranged_mitigation':
      return `takes ${s.numerator}/${s.denominator} of ranged damage`;
    case 'damage_ward':
      return `the next creature blow it takes is ${s.amount}% lighter`;
    case 'retaliation_suppressed':
      return 'its next retaliation is suppressed';
    case 'pull_immunity':
      return 'immune to one forced pull';
    case 'temporary_flight': return 'flies within normal Speed; must land on legal ground or deck';
    case 'spell_lock': return 'cannot use creature spell abilities; physical attacks, movement and non-spell abilities remain';
    case 'faithful_shadow': return 'the next hostile displacement lets its owner choose one legal adjacent hex; no extra action';
    case 'mind_control_ward': return 'blocks one new blindness or fear application';
    case 'element_barrier': return `${s.amount} HP of fire/water spell protection remain`;
    case 'fire_dot': return `${s.amount} fire damage each round`;
    case 'fear': return 'fear';
    case 'blind': return 'blindness';
    case 'rooted': return 'cannot move or be displaced; may attack in place and use abilities';
    case 'ranged_lock': return 'cannot shoot; may move, fight in melee or use abilities';
    case 'retaliation_weaken': return `next retaliations deal ${s.amount}% less damage`;
    case 'buff_suppression': return `positive Luck suppressed; up to ${s.amount} spell Attack suppressed`;
    case 'debuff_ward': return 'blocks the next dispellable hostile spell debuff';
    case 'projectile_spell_ward': return `the next projectile spell deals ${s.amount}% less damage, up to the ward’s HP cap`;
    case 'one_hit_thorns': return `next enemy melee hit returns ${s.amount} nature damage once`;
    case 'retaliation_bonus': return `next retaliations deal ${s.amount}% more damage`;
    case 'last_creature_guard': return 'the final creature survives one otherwise fatal physical hit at 1 HP';
    case 'pierce_borrowed_defense': return `next melee strike ignores up to ${s.amount} commander and spell Defense; equipment and base Defense remain`;
    default:
      return String(s.kind);
  }
}

/** The icon of one status: the miracle's own icon when a miracle set it, else its kind's. */
export function statusIcon(s: Pick<BattleStatusState, 'sourceId' | 'kind' | 'amount'>): string | null {
  if (s.sourceId.startsWith('intervention:')) {
    const own = `icon.intervention.${s.sourceId.slice('intervention:'.length)}`;
    if (resolveAsset(own).url) return own;
  }
  return statusKindIcon(s.kind, s.amount);
}

/** How long a status lasts: until a stack's next turn (the neutrals' abilities), else the rounds left. */
export function statusDuration(catalog: ContentCatalog, st: Pick<BattleStatusState, 'expiresAtRound' | 'expiresOnActivationOf' | 'expiresAfterActivation'>, round: number, battle?: BattleState): string {
  if (st.expiresAfterActivation) return 'Through its next activation (Wait preserves it)';
  if (st.expiresOnActivationOf) {
    const by = battle?.stacks[st.expiresOnActivationOf];
    const name = by ? catalog.creatures[by.creatureId]?.pluralName : undefined;
    return name ? `until the next turn of the ${name}` : 'until its user’s next turn';
  }
  const left = Math.max(1, st.expiresAtRound - round);
  return `${left} round${left === 1 ? '' : 's'} left`;
}

/**
 * Every mark of a stack, in a fixed order: defending, waited, aspect, then its statuses (miracles first).
 * With `battle`, a status that ends at another stack's next turn names that stack.
 */
export function stackMarks(catalog: ContentCatalog, s: BattleStackState, round: number, battle?: BattleState): BattleStackMark[] {
  if (s.totalHp <= 0) return [];
  const out: BattleStackMark[] = [];
  if (battle?.sides[s.side].armyBarrier) out.push({ icon: 'icon.fx.shield', label: `Army barrier: ${battle.sides[s.side].armyBarrier} HP shared by all allies` });
  if (battle && Object.values(battle.sides).some((side) => side.markedUndeadId === s.id)) out.push({ icon: 'icon.fx.shadow', label: 'Marked undead: takes 10% extra physical damage from the opposing relic bearer’s army' });
  if (s.defending) out.push({ icon: 'icon.action.defend', label: 'Defending: +20% Defense until its next turn' });
  if (s.waited) out.push({ icon: 'icon.action.wait', label: 'Waited: acts later this round' });
  if (s.aspect) out.push({ icon: 'icon.fx.summon', label: `${shapeshiftRule(catalog, s.creatureId)?.aspect ?? 'Alternate'} aspect` });
  const statuses = [...s.statuses].sort((a, b) => Number(b.sourceId.startsWith('intervention:')) - Number(a.sourceId.startsWith('intervention:')));
  const byIcon = new Map<string, BattleStackMark>();
  for (const st of statuses) {
    const icon = statusIcon(st);
    if (!icon) continue;
    const text = `${st.label}: ${statusEffectText(st)} (${statusDuration(catalog, st, round, battle)})`;
    const prev = byIcon.get(icon);
    if (prev) byIcon.set(icon, { icon, label: `${prev.label}; ${text}` });
    else byIcon.set(icon, { icon, label: text });
  }
  return [...out, ...byIcon.values()];
}
