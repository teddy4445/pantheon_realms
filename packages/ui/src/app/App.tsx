/**
 * App shell: screen router with return context, overlay (dialog) stack, toasts,
 * the persistent Babylon canvas host, and context-aware keyboard shortcuts.
 */
import { useEffect, type ComponentType } from 'react';
import { StoreProvider, useStore } from './context';
import type { AppStore, ScreenId } from './store';
import { SceneHostLayer } from '../scene/SceneHost';
import { MainMenuScreen } from '../screens/MainMenu';
import { GameModeScreen, ScenarioSelectScreen, PantheonSelectScreen, DivineSelectScreen } from '../screens/Setup';
import { AdventureScreen } from '../screens/Adventure';
import { HeroScreen } from '../screens/Hero';
import { TownScreen } from '../screens/Town';
import { RecruitmentScreen } from '../screens/Recruitment';
import { PantheonScreen } from '../screens/Pantheon';
import { BattleScreen } from '../screens/Battle';
import { BattleResultScreen } from '../screens/BattleResult';
import { LevelUpScreen } from '../screens/LevelUp';
import { JournalScreen } from '../screens/Journal';
import { OverviewScreen } from '../screens/Overview';
import { EncyclopediaScreen } from '../screens/Encyclopedia';
import { SettingsScreen } from '../screens/Settings';
import { UnitDetailScreen } from '../screens/UnitDetail';
import { OverlayLayer } from '../dialogs/Overlays';

const SCREENS: Record<ScreenId, ComponentType> = {
  'main-menu': MainMenuScreen,
  'game-mode': GameModeScreen,
  'scenario-select': ScenarioSelectScreen,
  'pantheon-select': PantheonSelectScreen,
  'divine-select': DivineSelectScreen,
  adventure: AdventureScreen,
  hero: HeroScreen,
  town: TownScreen,
  recruitment: RecruitmentScreen,
  pantheon: PantheonScreen,
  battle: BattleScreen,
  'battle-result': BattleResultScreen,
  'level-up': LevelUpScreen,
  journal: JournalScreen,
  overview: OverviewScreen,
  encyclopedia: EncyclopediaScreen,
  settings: SettingsScreen,
  'unit-detail': UnitDetailScreen,
};

const IN_GAME_BACKABLE: ScreenId[] = ['hero', 'town', 'recruitment', 'pantheon', 'journal', 'overview', 'encyclopedia', 'settings', 'unit-detail', 'game-mode', 'scenario-select', 'pantheon-select', 'divine-select'];

function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);
}

function useGlobalKeys(store: AppStore) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e.target)) return;
      const top = store.overlays[store.overlays.length - 1];
      const screen = store.screen.id;
      if (e.key === 'Escape') {
        if (top) {
          // Mandatory flow overlays are not dismissed by Escape.
          if (top.kind !== 'mission-failed' && top.kind !== 'debrief' && top.kind !== 'campaign-complete') store.closeOverlay();
          e.preventDefault();
          return;
        }
        if (screen === 'adventure' || screen === 'battle') store.openOverlay({ kind: 'pause' });
        else if (IN_GAME_BACKABLE.includes(screen)) store.back();
        e.preventDefault();
        return;
      }
      if (top || !store.session || screen !== 'adventure' || e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key.toLowerCase();
      const map: Partial<Record<string, ScreenId>> = { h: 'hero', t: 'town', j: 'journal', o: 'overview', b: 'encyclopedia', p: 'pantheon' };
      const target = map[k];
      if (target) {
        e.preventDefault();
        store.goto(target);
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
  const needsSession = !['main-menu', 'game-mode', 'scenario-select', 'pantheon-select', 'divine-select', 'encyclopedia', 'settings', 'unit-detail'].includes(entry.id);
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
      {store.toasts.map((t) => (
        <div key={t.id} className={`toast panel ${t.tone === 'error' ? 'toast--error' : ''}`}>
          {t.text}
        </div>
      ))}
    </div>
  );
}

function Shell({ store }: { store: AppStore }) {
  useGlobalKeys(store);
  return (
    <>
      <SceneHostLayer />
      <Router />
      <OverlayLayer />
      <Toasts />
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
