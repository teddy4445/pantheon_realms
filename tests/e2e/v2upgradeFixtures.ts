/**
 * Fixtures for the neutral-upgrade UI tests (battle FX & neutral upgrades,
 * 2026-10-15; v2upgrades.spec.ts). Ordinary save files built headlessly with the
 * same rules as the game and brought in through Load → Import (no privileged
 * hooks): a hiring site with the player's hero on it (v2neutralFixtures.ts), and
 * battles in which each of the six base neutrals faces its upgraded form across
 * one hex edge (v2battleFixtures.ts), so both forms stand side by side at the
 * normal battlefield zoom.
 */
import type { Placement } from './v2battleFixtures';

export { siteFixture, type SiteFixture } from './v2neutralFixtures';

/** The six families: base form, upgraded form. */
export const NEUTRAL_PAIRS: readonly (readonly [string, string])[] = [
  ['pegasus', 'dawncrest_pegasus'],
  ['root_runner', 'crownroot_runner'],
  ['serpopard', 'crested_serpopard'],
  ['baku', 'dreamtusk_baku'],
  ['afanc', 'ridgeback_afanc'],
  ['ahuitzotl', 'crownfin_ahuitzotl'],
];

/**
 * The comparison line-up: the player's six forms (left, facing right) in rows 1–10 at column 6,
 * their twins (right, mirrored) across one hex edge at column 7, so each pair stands nose to nose.
 * `upgradedLeft`: the upgrades are the player's (left) and the base forms the guards' — or the
 * other way round. `single`: the guards are single creatures (one blow fells each: hit, then death).
 */
export function pairLineUp(upgradedLeft: boolean, single = false): { player: Placement[]; enemy: Placement[]; order: string[]; counts: Record<string, number> } {
  const rows = [1, 3, 5, 7, 9, 10];
  // Enough base creatures that one blow fells a single upgraded twin (its lowest damage roll included).
  const player: Placement[] = NEUTRAL_PAIRS.map(([b, u], i) => ({ key: `p${i}`, side: 'attacker', creatureId: upgradedLeft ? u : b, count: upgradedLeft ? 14 : 40, at: [6, rows[i]!] }));
  const enemy: Placement[] = NEUTRAL_PAIRS.map(([b, u], i) => ({ key: `e${i}`, side: 'defender', creatureId: upgradedLeft ? b : u, count: 12, at: [7, rows[i]!] }));
  player.push({ key: 'hop', side: 'attacker', creatureId: 'hoplite', count: 20, at: [1, 5] });
  const mine = player.map((p) => p.key).filter((k) => k !== 'hop');
  const theirs = enemy.map((p) => p.key);
  return { player, enemy, order: [...mine, 'hop', ...theirs], counts: single ? Object.fromEntries(theirs.map((k) => [k, 1])) : {} };
}
