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
export function statusDuration(catalog: ContentCatalog, st: Pick<BattleStatusState, 'expiresAtRound' | 'expiresOnActivationOf'>, round: number, battle?: BattleState): string {
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
