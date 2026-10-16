/**
 * A planned journey's route as the player saw it, against the route quoted again later
 * (handoff 2026-10-14): walking part of the way, or an equally long way to the same place,
 * is the same journey; a new length, a battle at the end or a hero carried elsewhere is a
 * changed route the map shows before continuing.
 */
import { describe, expect, it } from 'vitest';
import type { HexCoord } from '@pr/rules';
import { routeChanged, routeSignature } from '../src/app/journeyRoute';

const c = (q: number, r: number): HexCoord => ({ q, r });
const sig = (from: HexCoord, path: HexCoord[], costs: number[], battle = false) => routeSignature(from, { path, stepCosts: costs, endsInEncounter: battle });

describe('routeChanged', () => {
  const seen = sig(c(0, 0), [c(1, 0), c(2, 0), c(3, 0), c(4, 0)], [100, 200, 300, 400]);

  it('the same route, or what is left of it after walking part of the way, is unchanged', () => {
    expect(routeChanged(seen, seen)).toBe(false);
    expect(routeChanged(seen, sig(c(2, 0), [c(3, 0), c(4, 0)], [100, 200]))).toBe(false);
  });

  it('another way of the same length to the same place is not a change worth stopping for', () => {
    expect(routeChanged(seen, sig(c(0, 0), [c(1, 0), c(2, -1), c(3, 0), c(4, 0)], [100, 200, 300, 400]))).toBe(false);
  });

  it('a longer way (a blocker came into view, the costs changed) is a change', () => {
    expect(routeChanged(seen, sig(c(0, 0), [c(1, 0), c(2, -1), c(3, -1), c(3, 0), c(4, 0)], [100, 200, 300, 400, 500]))).toBe(true);
  });

  it('the same tiles at a new cost are the same way (only the day of arrival is quoted again)', () => {
    expect(routeChanged(seen, sig(c(2, 0), [c(3, 0), c(4, 0)], [150, 300]))).toBe(false);
  });

  it('a battle that was not on the route, or a hero carried off the route, is a change', () => {
    expect(routeChanged(seen, sig(c(0, 0), [c(1, 0), c(2, 0), c(3, 0), c(4, 0)], [100, 200, 300, 400], true))).toBe(true);
    expect(routeChanged(seen, sig(c(9, 9), [c(8, 9), c(4, 0)], [100, 200]))).toBe(true);
  });

  it('an unreadable record never blocks the journey', () => {
    expect(routeChanged('not json', seen)).toBe(false);
  });
});
