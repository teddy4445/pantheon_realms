import { describe, expect, it } from 'vitest';
import { buildCatalog } from '@pr/content';
import type { BattleStackState, BattleStatusState } from '@pr/rules';
import { resolveAsset } from '../src/assets/manifest';
import { stackMarks, statusIcon, statusKindIcon } from '../src/app/stackMarks';

const catalog = buildCatalog();
const status = (sourceId: string, kind: BattleStatusState['kind'], amount = 0, expiresAtRound = 4): BattleStatusState => ({ sourceId, label: sourceId.split(':')[1] ?? sourceId, kind, amount, numerator: 1, denominator: 2, expiresAtRound });
const stack = (over: Partial<BattleStackState>): BattleStackState => ({ totalHp: 10, defending: false, waited: false, statuses: [], creatureId: Object.keys(catalog.creatures)[0]!, ...over }) as BattleStackState;

describe('battle stack marks (Brief 13 status and miracle icons)', () => {
  it('gives every status kind a delivered icon', () => {
    const kinds: [BattleStatusState['kind'], number][] = [
      ['attack_bonus', 2],
      ['attack_bonus', -2],
      ['defense_bonus', 3],
      ['defense_bonus', -3],
      ['speed_bonus', 1],
      ['speed_bonus', -1],
      ['max_damage_roll', 0],
      ['min_damage_roll', 0],
      ['melee_mitigation', 0],
      ['ranged_mitigation', 0],
    ];
    const icons = kinds.map(([k, a]) => statusKindIcon(k, a));
    for (const id of icons) expect(resolveAsset(id!).status, id!).toBe('final');
    expect(new Set(icons).size).toBeGreaterThanOrEqual(9);
  });

  it('shows a miracle with its own icon, every battle miracle icon is delivered', () => {
    const battleMiracles = Object.values(catalog.interventions ?? {}).filter((d) => d.context === 'battle');
    expect(battleMiracles.length).toBeGreaterThan(0);
    for (const d of battleMiracles) expect(statusIcon({ sourceId: `intervention:${d.id}`, kind: 'attack_bonus', amount: 1 })).toBe(`icon.intervention.${d.id}`);
    // A spell's status shows its kind's icon.
    expect(statusIcon({ sourceId: 'spell:bless', kind: 'max_damage_roll', amount: 0 })).toBe('icon.fx.divine');
  });

  it('lists defending, waited and statuses in order, merging statuses that share an icon', () => {
    const marks = stackMarks(
      catalog,
      stack({ defending: true, waited: true, statuses: [status('spell:a', 'attack_bonus', 2), status('spell:b', 'attack_bonus', 1, 3), status('intervention:shield_of_the_gods', 'defense_bonus', 4)] }),
      2,
    );
    expect(marks.map((m) => m.icon)).toEqual(['icon.action.defend', 'icon.action.wait', 'icon.intervention.shield_of_the_gods', 'icon.status.buff']);
    expect(marks[3]!.label).toBe('a: Attack +2 (2 rounds left); b: Attack +1 (1 round left)');
    expect(marks[0]!.label).toContain('+20% Defense');
  });

  it('shows nothing on a fallen stack', () => {
    expect(stackMarks(catalog, stack({ totalHp: 0, defending: true }), 1)).toEqual([]);
  });
});
