import { scenarioMission } from '@pr/rules';
/**
 * Which sound plays when. Pure mapping from screens, committed events and
 * battle presentation cues to sound IDs in the sound manifest
 * (assets-runtime/audio/manifest.json). Replacing a sound means changing the
 * manifest file entry, not this table.
 */
import type { ContentCatalog, GameEvent, MatchState } from '@pr/rules';
import type { BattleCue, BattleCueKind } from '@pr/presentation';
import type { ScreenId } from '../app/store';

export const MUSIC = {
  menu: 'music.menu',
  battle: 'music.battle',
  resolution: 'music.resolution',
  explore: (soundscape: string) => `music.explore.${soundscape}`,
} as const;

export const AMBIENCE = {
  battlefield: 'amb.battlefield',
  of: (soundscape: string) => `amb.${soundscape}`,
} as const;

export const STINGERS = { victory: 'stinger.victory', defeat: 'stinger.defeat', levelUp: 'stinger.levelup', beacon: 'stinger.beacon' } as const;

/** Every soundscape a mission may name; each needs music.explore.* and amb.* entries. */
export const SOUNDSCAPES = ['coast', 'high_pass', 'storm_plateau'] as const;
export const DEFAULT_SOUNDSCAPE = 'coast';

export const UI_SOUNDS = ['ui.click', 'ui.open', 'ui.close', 'ui.confirm', 'ui.error', 'ui.coins', 'ui.build', 'ui.recruit', 'ui.endday', 'ui.newday', 'ui.newweek', 'ui.pickup', 'ui.capture', 'ui.divine', 'ui.objective', 'sfx.steps'] as const;

const CUE_SOUND: Record<BattleCueKind, string> = {
  march: 'combat.march',
  flight: 'combat.flight',
  swing: 'combat.swing',
  impact: 'combat.hit',
  shot: 'combat.shot',
  'arrow-hit': 'combat.arrow_hit',
  death: 'combat.death',
  spell: 'combat.spell',
  heal: 'combat.heal',
  bless: 'combat.heal',
  ward: 'combat.ward',
  defend: 'combat.defend',
  'morale-up': 'combat.morale_up',
  'morale-down': 'combat.morale_down',
  shapeshift: 'combat.shapeshift',
  recovery: 'combat.recovery',
  catapult: 'combat.catapult',
  'stone-hit': 'combat.stone_hit',
  breach: 'combat.breach',
  turret: 'combat.turret',
  moat: 'combat.moat',
};

export const COMBAT_SOUNDS = [...new Set([...Object.values(CUE_SOUND), 'combat.hit_heavy', 'combat.start'])];

/** All IDs the game plays; the manifest must provide each (unit-tested). */
export const REQUIRED_SOUND_IDS: readonly string[] = [
  MUSIC.menu,
  MUSIC.battle,
  MUSIC.resolution,
  ...SOUNDSCAPES.map(MUSIC.explore),
  ...SOUNDSCAPES.map(AMBIENCE.of),
  AMBIENCE.battlefield,
  ...Object.values(STINGERS),
  ...UI_SOUNDS,
  ...COMBAT_SOUNDS,
];

export function soundForCue(cue: BattleCue): string {
  if (cue.kind === 'impact' && cue.heavy) return 'combat.hit_heavy';
  return CUE_SOUND[cue.kind];
}

/** One sound for a whole batch of battle events when playback is instant (or motion is reduced). */
export function summaryCue(events: readonly GameEvent[]): string | null {
  let best: string | null = null;
  let rank = 0;
  const offer = (id: string, r: number) => {
    if (r > rank) {
      rank = r;
      best = id;
    }
  };
  for (const e of events) {
    if (e.kind === 'BattleStackDestroyed') offer('combat.death', 9);
    else if (e.kind === 'SiegeStructureDestroyed') offer('combat.breach', 8);
    else if (e.kind === 'BattleAttack') offer(e.mode === 'shot' ? 'combat.arrow_hit' : e.killed > 0 ? 'combat.hit_heavy' : 'combat.hit', e.killed > 0 ? 7 : 6);
    else if (e.kind === 'SiegeStructureDamaged') offer('combat.stone_hit', 5);
    else if (e.kind === 'BattleSpellCast') offer(e.healed > 0 ? 'combat.heal' : 'combat.spell', 5);
    else if (e.kind === 'SiegeTurretShot') offer('combat.turret', 4);
    else if (e.kind === 'BattleStackShapeshifted') offer('combat.shapeshift', 4);
    else if (e.kind === 'BattleAbilityUsed') offer('combat.ward', 3);
    else if (e.kind === 'BattleStackDefended') offer('combat.defend', 3);
    else if (e.kind === 'BattleMorale') offer(e.positive ? 'combat.morale_up' : 'combat.morale_down', 3);
    else if (e.kind === 'BattleStackMoved') offer(e.flying ? 'combat.flight' : 'combat.march', 1);
  }
  return best;
}

// ---------------------------------------------------------------------------
// Music and ambience by context
// ---------------------------------------------------------------------------

export interface SoundContext {
  readonly screen: ScreenId;
  readonly overlays: readonly string[];
  readonly inSession: boolean;
  readonly soundscape: string | null;
}

const MENU_SCREENS: ReadonlySet<ScreenId> = new Set(['main-menu', 'game-mode', 'scenario-select', 'pantheon-select', 'divine-select']);

export function soundscapeFor(ctx: SoundContext): { music: string | null; ambience: string | null } {
  const scape = ctx.soundscape ?? DEFAULT_SOUNDSCAPE;
  if (ctx.overlays.includes('debrief') || ctx.overlays.includes('campaign-complete')) return { music: MUSIC.resolution, ambience: null };
  if (ctx.overlays.includes('mission-failed')) return { music: null, ambience: null };
  if (!ctx.inSession || MENU_SCREENS.has(ctx.screen)) return { music: MUSIC.menu, ambience: null };
  if (ctx.screen === 'battle') return { music: MUSIC.battle, ambience: AMBIENCE.battlefield };
  // The result screen lets the victory or defeat stinger speak over the battlefield air.
  if (ctx.screen === 'battle-result') return { music: null, ambience: AMBIENCE.battlefield };
  return { music: MUSIC.explore(scape), ambience: AMBIENCE.of(scape) };
}

// ---------------------------------------------------------------------------
// Committed events -> interface sounds (the human player's own actions only)
// ---------------------------------------------------------------------------

function ownsTown(state: MatchState, townId: string, me: string): boolean {
  return state.towns[townId]?.ownerId === me;
}

function ownsHero(state: MatchState, heroId: string, me: string): boolean {
  return state.heroes[heroId]?.ownerId === me;
}

/**
 * Interface sounds and stingers for one batch of committed events. AI actions
 * the player cannot see make no sound; only a new day/week is always heard.
 */
export function soundsForEvents(catalog: ContentCatalog, state: MatchState, me: string, events: readonly GameEvent[]): string[] {
  const out: string[] = [];
  const add = (id: string) => {
    if (!out.includes(id)) out.push(id);
  };
  const mission = scenarioMission(catalog, state);
  for (const e of events) {
    switch (e.kind) {
      case 'DayStarted':
        add(e.dayOfWeek === 1 && state.day > 1 ? 'ui.newweek' : 'ui.newday');
        break;
      case 'TurnEnded':
        if (e.playerId === me) add('ui.endday');
        break;
      case 'BuildingConstructed':
      case 'DwellingUpgraded':
        if (ownsTown(state, e.townId, me)) add('ui.build');
        break;
      case 'UnitsRecruited':
      case 'StackUpgraded':
        if (ownsTown(state, e.townId, me)) add('ui.recruit');
        break;
      case 'HeroHired':
        if (ownsTown(state, e.townId, me)) add('ui.recruit');
        break;
      case 'ResourcesTraded':
        if (ownsTown(state, e.townId, me)) add('ui.coins');
        break;
      case 'ArtifactPurchased':
      case 'SpellbookPurchased':
      case 'HeroTrained':
        if (ownsHero(state, e.heroId, me)) add('ui.coins');
        break;
      case 'PickupCollected':
      case 'ArtifactGranted':
        if (ownsHero(state, e.heroId, me)) add('ui.pickup');
        break;
      case 'SiteCaptured':
        if (e.playerId === me) add('ui.capture');
        break;
      case 'TownCaptured':
        if (e.playerId === me) add('ui.capture');
        break;
      case 'GateOpened':
        add('ui.capture');
        break;
      case 'SiteActivated': {
        if (!ownsHero(state, e.heroId, me)) break;
        const site = mission?.sites.find((s) => s.id === e.siteId);
        const label = site?.kind.type === 'activation' ? site.kind.label : null;
        add(label === 'beacon' ? STINGERS.beacon : 'ui.divine');
        break;
      }
      case 'GodSelected':
      case 'OfferingMade':
        if (e.playerId === me) add('ui.divine');
        break;
      case 'HeroTeleported':
        if (e.viaSiteId && ownsHero(state, e.heroId, me)) add('ui.divine');
        break;
      case 'SpellsLearned':
      case 'AdventureSpellCast':
        if (ownsHero(state, e.heroId, me)) add('ui.divine');
        break;
      case 'LevelUpPending':
        if (ownsHero(state, e.heroId, me)) add(STINGERS.levelUp);
        break;
      case 'ObjectiveChanged':
        if (e.status === 'completed') add('ui.objective');
        break;
      case 'MissionCompleted':
        add(STINGERS.victory);
        break;
      case 'MissionFailed':
        add(STINGERS.defeat);
        break;
      default:
        break;
    }
  }
  // Relighting a beacon that also completes the mission gets the beacon stinger alone.
  if (out.includes(STINGERS.beacon)) return out.filter((id) => id !== STINGERS.victory);
  return out;
}
