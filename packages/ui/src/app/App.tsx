import { SingleBattleScreen } from '../screens/SingleBattle';
/**
 * App shell: screen router with return context, overlay (dialog) stack, toasts,
 * the persistent 2D canvas host, and context-aware keyboard shortcuts.
 */
import { useEffect, type ComponentType } from 'react';
import { StoreProvider, useStore } from './context';
import type { AppStore, ScreenId } from './store';
import { SceneHostLayer } from '../scene/SceneHost';
import { MainMenuScreen } from '../screens/MainMenu';
import { GameModeScreen, ScenarioSelectScreen, PantheonSelectScreen } from '../screens/Setup';
import { AdventureScreen } from '../screens/Adventure';
import { HeroScreen } from '../screens/Hero';
import { TownScreen } from '../screens/Town';
import { RecruitmentScreen } from '../screens/Recruitment';
import { PantheonScreen } from '../screens/Pantheon';
import { BattleScreen } from '../screens/Battle';
import { BattleResultScreen } from '../screens/BattleResult';
import { LevelUpScreen } from '../screens/LevelUp';
import { JournalScreen } from '../screens/Journal';
import { EncyclopediaScreen } from '../screens/Encyclopedia';
import { SettingsScreen } from '../screens/Settings';
import { UnitDetailScreen } from '../screens/UnitDetail';
import { OverlayLayer } from '../dialogs/Overlays';
import { HintPanel, StoryLayer } from '../dialogs/Story';
import { MomentLayer } from '../components/moments';
import { MapSetupScreen } from '../screens/MapSetup';
import { RandomSetupScreen } from '../screens/RandomSetup';
import { SummaryScreen, HighScoresScreen } from '../screens/Summary';
import { MapEditorScreen } from '../screens/MapEditor';
import { matches } from './keys';
import { TooltipLayer, contextTheme } from '../components/gui';
import { RewardTray } from '../components/rewards';
import { CostList } from '../components/game';

const SCREENS: Record<ScreenId, ComponentType> = {
  'main-menu': MainMenuScreen,
  'single-battle': SingleBattleScreen,
  'game-mode': GameModeScreen,
  'scenario-select': ScenarioSelectScreen,
  'pantheon-select': PantheonSelectScreen,
  adventure: AdventureScreen,
  hero: HeroScreen,
  town: TownScreen,
  recruitment: RecruitmentScreen,
  pantheon: PantheonScreen,
  battle: BattleScreen,
  'battle-result': BattleResultScreen,
  'level-up': LevelUpScreen,
  journal: JournalScreen,
  encyclopedia: EncyclopediaScreen,
  settings: SettingsScreen,
  'unit-detail': UnitDetailScreen,
  'random-setup': RandomSetupScreen,
  'map-setup': MapSetupScreen,
  summary: SummaryScreen,
  'high-scores': HighScoresScreen,
  'map-editor': MapEditorScreen,
};

const IN_GAME_BACKABLE: ScreenId[] = ['single-battle', 'hero', 'town', 'recruitment', 'pantheon', 'journal', 'encyclopedia', 'settings', 'unit-detail', 'game-mode', 'scenario-select', 'pantheon-select', 'random-setup', 'map-setup', 'high-scores'];

/** Mandatory flow overlays: Escape does not dismiss them. */
const STICKY_OVERLAYS = new Set(['mission-failed', 'debrief', 'campaign-complete', 'game-over', 'handoff']);

function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);
}

function useGlobalKeys(store: AppStore) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e.target)) return;
      // The story window handles its own keys (Enter, Esc).
      if (store.story.length > 0) return;
      const top = store.overlays[store.overlays.length - 1];
      const screen = store.screen.id;
      if ((e.code === 'Backquote' || e.key === '`') && !e.ctrlKey && !e.metaKey && !e.altKey && !top && store.session && ['adventure', 'town', 'hero'].includes(screen)) {
        e.preventDefault();
        store.openOverlay({ kind: 'cheat' });
        return;
      }
      if (e.key === 'F1') {
        e.preventDefault();
        if (top?.kind !== 'shortcuts' && top?.kind !== 'handoff') store.openOverlay({ kind: 'shortcuts' });
        return;
      }
      if (e.key === 'Escape') {
        if (top) {
          if (!STICKY_OVERLAYS.has(top.kind)) store.closeOverlay();
          e.preventDefault();
          return;
        }
        if (screen === 'adventure' || screen === 'battle') store.openOverlay({ kind: 'pause' });
        else if (IN_GAME_BACKABLE.includes(screen)) {
          if (!store.leaveGuard?.()) store.back();
        }
        e.preventDefault();
        return;
      }
      if (top || !store.session || screen !== 'adventure' || e.ctrlKey || e.metaKey || e.altKey) return;
      const prefs = store.prefs;
      if (matches(prefs, 'shortcuts', e.key)) {
        e.preventDefault();
        store.openOverlay({ kind: 'shortcuts' });
        return;
      }
      const map: [string, ScreenId][] = [
        ['open_hero', 'hero'],
        ['open_town', 'town'],
        ['open_journal', 'journal'],
        ['open_encyclopedia', 'encyclopedia'],
        ['open_pantheon', 'pantheon'],
      ];
      const hit = map.find(([action]) => matches(prefs, action, e.key));
      if (hit) {
        e.preventDefault();
        store.goto(hit[1]);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [store]);
}

function Router() {
  const store = useStore();
  const entry = store.screen;
  const Screen = SCREENS[entry.id];
  const needsSession = !['single-battle', 'main-menu', 'game-mode', 'scenario-select', 'pantheon-select', 'encyclopedia', 'settings', 'unit-detail', 'random-setup', 'map-setup', 'high-scores', 'map-editor'].includes(entry.id);
  if (needsSession && !store.session) {
    return <MainMenuScreen />;
  }
  return (
    <main className="screen-root" data-screen={entry.id} key={entry.key}>
      <Screen />
    </main>
  );
}

function Toasts() {
  const store = useStore();
  return (
    <div className="toasts" aria-live="polite">
      {store.toasts.map((t) =>
        t.receipt ? (
          // A small reward from one completed action: the passing tray, read from the committed result.
          <div key={t.id} className="toast panel toast--reward" data-testid="reward-toast">
            <span className="toast__title">{t.text}</span>
            <RewardTray items={t.receipt.items} label={t.text} compact plain />
            {t.receipt.costs ? (
              <span className="toast__costs small">
                Paid <CostList cost={t.receipt.costs} />
              </span>
            ) : null}
          </div>
        ) : (
          <div key={t.id} className={`toast panel ${t.tone === 'error' ? 'toast--error' : ''}`}>
            {t.text}
          </div>
        ),
      )}
    </div>
  );
}

/** The renderer's notices and, when switched on in Settings, the frame-rate readout. */
function SceneLayer() {
  const store = useStore();
  return <SceneHostLayer showFrameRate={store.prefs.showFrameRate} />;
}

/**
 * 1.1.0 materials: the window frames follow the viewing player's pantheon during
 * a match (the pantheon being chosen on setup screens; Greek elsewhere). Screens
 * and dialogs tied to another owner (a town, a battle side) set their own.
 */
function ThemeSync() {
  const store = useStore();
  const theme = contextTheme(store);
  useEffect(() => {
    document.documentElement.dataset.guiTheme = theme;
  }, [theme]);
  return null;
}

/** Themed tooltips (hover after a short delay, keyboard focus at once) unless the player turned tooltips off. */
function Tooltips() {
  const store = useStore();
  return store.prefs.tooltips ? <TooltipLayer delayMs={320} /> : null;
}

function Shell({ store }: { store: AppStore }) {
  useGlobalKeys(store);
  return (
    <>
      <ThemeSync />
      <SceneLayer />
      <Router />
      <OverlayLayer />
      <MomentLayer />
      <HintPanel />
      <StoryLayer />
      <Toasts />
      <Tooltips />
    </>
  );
}

export function App({ store }: { store: AppStore }) {
  return (
    <StoreProvider store={store}>
      <Shell store={store} />
    </StoreProvider>
  );
}
