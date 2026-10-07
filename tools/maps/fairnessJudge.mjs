/**
 * Seat-fairness verdict for an authored skirmish map (development tool; never
 * packaged). The matches come from tools/maps/fairness.ts (all-AI mirror
 * matches: every seat the same pantheon, the pantheon changing per match).
 *
 * A seat scores 1 for a win (or a day-cap finish at least 25% ahead in
 * armies); a draw is split between the empires still standing. A fair map
 * gives every seat about 1/N. The verdict is sequential: a first batch; if a
 * seat looks weak, a second, larger batch; a map is refused only when a seat
 * scores under 60% of its fair share AND the shortfall is too large to be
 * chance (one-sided z ≤ −2.58: about 1 in 200 for a fair map). Proposed
 * thresholds, 2026-10-07.
 */

export const FIRST_BATCH = 12;
export const SECOND_BATCH = 24;
/** A seat under this share of 1/N, with the shortfall beyond chance, makes the map unfair. */
export const WEAK_SHARE = 0.6;
export const Z_REFUSE = -2.58;
/** The first batch asks for more matches when a seat is under this share of 1/N, or at z ≤ −1.64. */
export const SUSPECT_SHARE = 0.75;
export const Z_SUSPECT = -1.64;

/** Seat score sums: a win (or a points win) is 1; a draw is split between the empires still standing. */
export function seatScores(results, n) {
  const score = Array.from({ length: n }, () => 0);
  for (const x of results) {
    const winner = x.winnerSeat ?? x.pointsSeat;
    if (winner !== null && winner !== undefined) {
      score[winner] += 1;
      continue;
    }
    const out = new Set((x.knockedOut ?? []).map((k) => k.seat));
    const standing = Array.from({ length: n }, (_, i) => i).filter((i) => !out.has(i));
    const share = standing.length ? standing : Array.from({ length: n }, (_, i) => i);
    for (const i of share) score[i] += 1 / share.length;
  }
  return score;
}

/** { matches, shares, weakest: { seat, ofFair, z }, status: 'fair' | 'suspect' | 'unfair' } */
export function judge(results, n) {
  const m = results.length;
  const fair = 1 / n;
  const shares = seatScores(results, n).map((s) => s / Math.max(1, m));
  const se = Math.sqrt((fair * (1 - fair)) / Math.max(1, m));
  let seat = 0;
  shares.forEach((s, i) => {
    if (s < shares[seat]) seat = i;
  });
  const ofFair = shares[seat] / fair;
  const z = (shares[seat] - fair) / se;
  const status = ofFair < WEAK_SHARE && z <= Z_REFUSE ? 'unfair' : ofFair < SUSPECT_SHARE || z <= Z_SUSPECT ? 'suspect' : 'fair';
  return { matches: m, shares, weakest: { seat, ofFair, z }, status };
}
