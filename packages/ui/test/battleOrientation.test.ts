/**
 * Owner request 2026-10-14: the human player's army stands on the left in blue, also when a
 * computer hero attacks the player (the board is then drawn mirrored; the rules are unchanged).
 */
import { describe, expect, it } from 'vitest';
import { battleOrientation, sideTone } from '../src/app/battleOrientation';

const sides = (attacker: 'human' | 'ai', defender: 'human' | 'ai') => ({
  sides: { attacker: { controller: attacker }, defender: { controller: defender } },
}) as unknown as Parameters<typeof battleOrientation>[0];

describe('battle orientation', () => {
  it('a human attacker: as before (attacker left, blue)', () => {
    const o = battleOrientation(sides('human', 'ai'));
    expect(o).toEqual({ mirrored: false, blueSide: 'attacker', leftSide: 'attacker', rightSide: 'defender' });
    expect(sideTone(o, 'attacker')).toBe('blue');
    expect(sideTone(o, 'defender')).toBe('red');
  });
  it('a human defender against the computer: mirrored, the defender left and blue', () => {
    const o = battleOrientation(sides('ai', 'human'));
    expect(o).toEqual({ mirrored: true, blueSide: 'defender', leftSide: 'defender', rightSide: 'attacker' });
    expect(sideTone(o, 'defender')).toBe('blue');
    expect(sideTone(o, 'attacker')).toBe('red');
  });
  it('two humans (hot seat) or none: the attacker stays left in blue', () => {
    for (const o of [battleOrientation(sides('human', 'human')), battleOrientation(sides('ai', 'ai'))]) {
      expect(o.mirrored).toBe(false);
      expect(o.blueSide).toBe('attacker');
    }
  });
});
