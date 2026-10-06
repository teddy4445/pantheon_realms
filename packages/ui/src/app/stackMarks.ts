/**
 * The small icons a battle stack carries over its count (and on the screen's
 * stack cards): what affects it right now — defending, waiting, its Shapeshift
 * aspect, and every running status, a miracle's with the miracle's own icon
 * (Brief 13), a spell's or ability's with the icon of its kind of effect. Read
 * from the state only; never changes a rule.
 */
import { shapeshiftRule, type BattleStackState, type BattleStatusState, type ContentCatalog } from '@pr/rules';
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

/** Every mark of a stack, in a fixed order: defending, waited, aspect, then its statuses (miracles first). */
export function stackMarks(catalog: ContentCatalog, s: BattleStackState, round: number): BattleStackMark[] {
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
    const left = Math.max(1, st.expiresAtRound - round);
    const text = `${st.label}: ${statusEffectText(st)} (${left} round${left === 1 ? '' : 's'} left)`;
    const prev = byIcon.get(icon);
    if (prev) byIcon.set(icon, { icon, label: `${prev.label}; ${text}` });
    else byIcon.set(icon, { icon, label: text });
  }
  return [...out, ...byIcon.values()];
}
