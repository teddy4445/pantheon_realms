/**
 * Scouting intel snapshots (scenario feature `scoutingIntelV1`): each player's last
 * observation of every enemy hero and wandering monster it has seen, kept in
 * `MatchState.intel` with only the fields its stage permitted (resolvers/intel.ts).
 *
 * Updated by the rules after every committed command that leaves no battle running
 * (processor.ts), and once when a match is created — never by the interface or the AI.
 * Deterministic and cheap: one vision per player, one projection per army in view.
 *
 *  - An army in current vision: its snapshot is rewritten at today's observation stage
 *    (position, day, banner, band, and the types/ranges that stage permits). When the new
 *    stage is less detailed than the previous report, that report is kept apart as
 *    `earlier` (dated) — it never stands in for a current estimate.
 *  - An army out of vision: its snapshot stays exactly as it was (LAST KNOWN, its date);
 *    nothing is updated remotely (counts, composition, owner, position or fate).
 *  - A snapshot is removed only when its tile is in view again with nothing there (the
 *    army is not in sight anywhere), or when an event the player took part in settled the
 *    army's fate: a battle it fought against it, neutrals that joined or fled from its hero.
 *  - Friendly armies (own) never have snapshots: they keep their full information.
 *
 * With the feature off nothing is written (and `state.intel` stays absent).
 */
import type { ContentCatalog } from '../definitions/catalog';
import type { GameEventPayload } from '../events/events';
import type { HeroId, PlayerId } from '../ids';
import type { IntelEarlierReport, IntelSnapshot, MatchState } from '../state/match';
import { cellIndex } from '../resolvers/world';
import { INTEL_STAGE_RANK, activeIntelPolicy, intelFriendly, intelVision, observationStage, projectArmy, snapshotOf } from '../resolvers/intel';

/** Heroes whose fate each player learned from this command's events (hero ID → players). */
function fatesRevealed(state: MatchState, events: readonly GameEventPayload[]): Map<HeroId, Set<PlayerId>> {
  const out = new Map<HeroId, Set<PlayerId>>();
  const add = (heroId: HeroId, playerId: PlayerId | null | undefined) => {
    if (!playerId) return;
    const set = out.get(heroId) ?? new Set<PlayerId>();
    set.add(playerId);
    out.set(heroId, set);
  };
  const battleEnded = events.some((e) => e.kind === 'BattleEnded');
  const result = battleEnded ? state.lastBattleResult : null;
  for (const e of events) {
    if ((e.kind === 'HeroDefeated' || e.kind === 'HeroRetreated') && result) {
      // Both sides of the battle saw how it ended.
      add(e.heroId, result.attacker.playerId);
      add(e.heroId, result.defender.playerId);
    } else if ((e.kind === 'NeutralsJoined' || e.kind === 'NeutralsFled') && e.monsterHeroId) {
      add(e.monsterHeroId, state.heroes[e.heroId]?.ownerId);
    }
  }
  return out;
}

/** The earlier, more detailed report to keep beside a new observation (if any). */
function earlierReport(prev: IntelSnapshot | undefined, next: IntelSnapshot): IntelEarlierReport | undefined {
  if (!prev) return undefined;
  const rank = INTEL_STAGE_RANK[next.stage];
  if (INTEL_STAGE_RANK[prev.stage] > rank && prev.permittedCreatureTypes && prev.stage !== 'sighting') {
    const r: IntelEarlierReport = {
      lastSeenCoord: { ...prev.lastSeenCoord },
      observedDay: prev.observedDay,
      stage: prev.stage,
      knownOwner: prev.knownOwner,
      strengthBand: prev.strengthBand,
      permittedCreatureTypes: [...prev.permittedCreatureTypes],
    };
    if (prev.permittedCountRanges) r.permittedCountRanges = prev.permittedCountRanges.map((x) => ({ ...x }));
    return r;
  }
  if (prev.earlier && INTEL_STAGE_RANK[prev.earlier.stage] > rank) return prev.earlier;
  return undefined;
}

/**
 * Bring every player's snapshots up to date with what it sees now. `events` are the
 * command's events so far (a battle's end tells both sides the loser's fate).
 * Mutates `state` (a command's draft, or a match being created).
 */
export function refreshIntelSnapshots(catalog: ContentCatalog, state: MatchState, events: readonly GameEventPayload[] = []): void {
  const policy = activeIntelPolicy(catalog, state);
  if (!policy) return;
  const fates = fatesRevealed(state, events);
  const map = state.world.map;
  const heroes = Object.values(state.heroes);
  const intel = (state.intel ??= {});
  for (const viewerId of state.playerOrder) {
    const player = state.players[viewerId];
    if (!player || player.eliminated || !state.fog[viewerId]) continue;
    const vision = intelVision(catalog, state, viewerId);
    const book: Record<HeroId, IntelSnapshot> = intel[viewerId] ?? {};
    const current = new Set<HeroId>();
    for (const hero of heroes) {
      if (hero.status !== 'active') continue;
      if (intelFriendly(state, viewerId, hero.ownerId)) {
        delete book[hero.id];
        continue;
      }
      const stage = observationStage(policy, map, vision, hero.position);
      if (!stage) continue;
      const next = snapshotOf(projectArmy(catalog, policy, hero, stage), state.day);
      if (!next) continue;
      const earlier = earlierReport(book[hero.id], next);
      if (earlier) next.earlier = earlier;
      book[hero.id] = next;
      current.add(hero.id);
    }
    for (const id of Object.keys(book)) {
      if (current.has(id)) continue;
      const hero = state.heroes[id];
      const snap = book[id]!;
      const fateKnown = !hero || (hero.status !== 'active' && (fates.get(id)?.has(viewerId) ?? false));
      // Its tile is in view and it is not in sight anywhere: the place was inspected, nothing there.
      const inspected = vision.visible.has(cellIndex(map, snap.lastSeenCoord));
      if (fateKnown || inspected || (hero && intelFriendly(state, viewerId, hero.ownerId))) delete book[id];
    }
    if (Object.keys(book).length > 0) intel[viewerId] = book;
    else delete intel[viewerId];
  }
}
