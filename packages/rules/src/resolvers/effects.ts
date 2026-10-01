/**
 * PlayerEffectResolver: player-wide effects from the shared vocabulary.
 *
 * Two sources, both plain data: the player's pantheon signature (when the
 * scenario enables signature mechanics) and every committed god's benefits.
 * Rules consume effect TYPES only — no code path names a pantheon or god.
 */
import type { PlayerId } from '../ids';
import { getGod, type ContentCatalog } from '../definitions/catalog';
import type { EffectDefinition } from '../definitions/logic';
import type { BattleSideEffects, MatchState } from '../state/match';

export function signatureEffects(catalog: ContentCatalog, state: MatchState, playerId: PlayerId | null): EffectDefinition[] {
  if (!playerId || !state.scenario.signatureMechanics) return [];
  const player = state.players[playerId];
  if (!player) return [];
  return [...(catalog.pantheons[player.pantheonId]?.signature?.effects ?? [])];
}

export function godEffects(catalog: ContentCatalog, state: MatchState, playerId: PlayerId | null): EffectDefinition[] {
  const player = playerId ? state.players[playerId] : undefined;
  if (!player) return [];
  const gods = [player.pantheon.patronGodId, ...player.pantheon.minorGodIds].filter((g): g is string => !!g);
  return gods.flatMap((g) => getGod(catalog, g).benefits);
}

/** Effects of the current weekly event, which reach every empire (not scripted forces or monsters). */
export function weeklyEventEffects(catalog: ContentCatalog, state: MatchState, playerId: PlayerId | null): EffectDefinition[] {
  const id = state.world.weeklyEventId;
  if (!id || !playerId || !state.scenario.features?.weeklyEvents) return [];
  const player = state.players[playerId];
  if (!player || player.role === 'scripted_hostile') return [];
  return [...(catalog.weeklyEvents?.[id]?.effects ?? [])];
}

/** Signature + god + weekly-event effects of a player (empty for ownerless forces). */
export function playerEffects(catalog: ContentCatalog, state: MatchState, playerId: PlayerId | null): EffectDefinition[] {
  return [...signatureEffects(catalog, state, playerId), ...godEffects(catalog, state, playerId), ...weeklyEventEffects(catalog, state, playerId)];
}

export function sumEffect<T extends EffectDefinition['type']>(
  effects: readonly EffectDefinition[],
  type: T,
  value: (e: Extract<EffectDefinition, { type: T }>) => number,
): number {
  let n = 0;
  for (const e of effects) if (e.type === type) n += value(e as Extract<EffectDefinition, { type: T }>);
  return n;
}

/** The best offering rule a player has: lowest Gold per Favor, highest weekly cap. */
export function offeringRule(catalog: ContentCatalog, state: MatchState, playerId: PlayerId): { goldPerFavor: number; maxFavorPerWeek: number } | null {
  let best: { goldPerFavor: number; maxFavorPerWeek: number } | null = null;
  for (const e of playerEffects(catalog, state, playerId)) {
    if (e.type !== 'offering') continue;
    best = best
      ? { goldPerFavor: Math.min(best.goldPerFavor, e.goldPerFavor), maxFavorPerWeek: Math.max(best.maxFavorPerWeek, e.maxFavorPerWeek) }
      : { goldPerFavor: e.goldPerFavor, maxFavorPerWeek: e.maxFavorPerWeek };
  }
  return best;
}

/**
 * Freeze the battle-relevant effects of a side at battle start: its player's
 * effects plus `heroFx`, the commanding hero's own effects (skills, artifacts,
 * set bonuses).
 */
export function battleSideEffects(
  catalog: ContentCatalog,
  state: MatchState,
  playerId: PlayerId | null,
  heroFx: readonly EffectDefinition[] = [],
): BattleSideEffects | null {
  if (!playerId || !state.players[playerId]) return null;
  const fx = [...playerEffects(catalog, state, playerId), ...heroFx];
  let fury: BattleSideEffects['fury'] = null;
  for (const e of fx) {
    if (e.type !== 'wounded_fury') continue;
    if (!fury || e.attack > fury.attack) fury = { attack: e.attack, numerator: e.numerator, denominator: e.denominator };
  }
  return {
    recoveryPercent: Math.min(100, sumEffect(fx, 'casualty_recovery', (e) => e.percent)),
    xpPercent: sumEffect(fx, 'battle_xp_percent', (e) => e.percent),
    fury,
    freeShapeshift: fx.some((e) => e.type === 'free_shapeshift'),
    harmony: null,
    spellDamagePercent: sumEffect(fx, 'spell_damage_percent', (e) => e.percent),
    creatureStats: fx.flatMap((e) =>
      e.type === 'creature_stat'
        ? [
            {
              stat: e.stat,
              amount: e.amount,
              ...(e.minTier !== undefined ? { minTier: e.minTier } : {}),
              ...(e.maxTier !== undefined ? { maxTier: e.maxTier } : {}),
              ...(e.ability !== undefined ? { ability: e.ability } : {}),
            },
          ]
        : [],
    ),
  };
}

/** Harmony thresholds a side's player has (for display and for the battle snapshot). */
export function harmonyThresholds(catalog: ContentCatalog, state: MatchState, playerId: PlayerId | null) {
  return playerEffects(catalog, state, playerId)
    .flatMap((e) => (e.type === 'army_harmony' ? [{ families: e.families, attack: e.attack, defense: e.defense }] : []))
    .sort((a, b) => a.families - b.families);
}

/** Highest met harmony threshold for `familyCount` distinct families (null when none). */
export function harmonyFor(
  thresholds: readonly { families: number; attack: number; defense: number }[],
  familyCount: number,
): { families: number; attack: number; defense: number } | null {
  let best: { families: number; attack: number; defense: number } | null = null;
  for (const t of thresholds) if (familyCount >= t.families && (!best || t.families > best.families)) best = t;
  return best;
}
