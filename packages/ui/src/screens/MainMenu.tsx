/**
 * S01 Main Menu. Continue shows the most recent compatible save with its
 * metadata and is disabled (with the reason) when none exists. Quit appears
 * only on desktop; the browser build never pretends to close its tab.
 */
import { useEffect } from 'react';
import { useStore } from '../app/context';
import { MenuButton, Chip } from '../components/kit';
import { resolveAsset } from '../assets/manifest';
import { relativeTime } from '../app/view';

export function MainMenuScreen() {
  const store = useStore();
  const { continueSlot, continueChecked, storageError, platform, catalog } = store;
  useEffect(() => {
    if (!store.continueChecked) void store.refreshContinue();
  }, [store, store.continueChecked]);
  const bg = resolveAsset('menu.background');
  const meta = continueSlot?.metadata;
  const continueDisabledReason = !continueChecked
    ? 'Checking saves…'
    : storageError
      ? `Saves unavailable: ${storageError}`
      : 'No compatible save in progress yet';

  const onContinue = async () => {
    if (!continueSlot) return;
    const { envelope, compatibility } = await store.saves.read(continueSlot.id);
    if (!envelope || compatibility.status !== 'ok') {
      store.toast(`Cannot continue: ${compatibility.status === 'ok' ? 'save missing' : compatibility.reason}`, 'error');
      void store.refreshContinue();
      return;
    }
    store.loadSnapshot(envelope.snapshot);
  };

  const three = catalog.campaigns['three_beacons'];
  return (
    <div className="main-menu" style={bg.url ? { backgroundImage: `url(${bg.url})` } : undefined}>
      <div className="main-menu__shade" />
      <div className="main-menu__brand">
        <div className="main-menu__crest" aria-hidden="true">
          <svg viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="54" fill="none" stroke="#d8b56c" strokeWidth="2" />
            <circle cx="60" cy="60" r="46" fill="none" stroke="#9c7534" strokeWidth="1" />
            <path d="M60 18l8 20h-16zM36 44h48l-6 8H42zM44 56h32v34H44zM38 92h44v6H38z" fill="#d8b56c" />
            <path d="M52 60v26M60 60v26M68 60v26" stroke="#0b1626" strokeWidth="2.5" />
          </svg>
        </div>
        <h1 className="main-menu__title">Pantheon Realms</h1>
        <div className="main-menu__tagline">Gods, heroes and the armies of myth</div>
      </div>
      <nav className="main-menu__nav panel panel--glass" aria-label="Main menu">
        <MenuButton
          icon="continue"
          label="Continue"
          testId="menu-continue"
          disabled={!continueSlot}
          disabledReason={continueDisabledReason}
          autoFocus={!!continueSlot}
          meta={
            meta ? (
              <>
                {meta.missionName} · Day {meta.day} · {meta.heroName} (Lv {meta.heroLevel}) · {relativeTime(continueSlot?.savedAt ?? null)}
              </>
            ) : undefined
          }
          onClick={() => void onContinue()}
        />
        <MenuButton
          icon="newgame"
          label="New Game"
          testId="menu-new"
          autoFocus={!continueSlot}
          onClick={() => {
            store.resetSetup(null);
            store.goto('game-mode');
          }}
        />
        <MenuButton icon="load" label="Load Game" testId="menu-load" onClick={() => store.openOverlay({ kind: 'save-load', mode: 'load' })} />
        <MenuButton
          icon="campaign"
          label="Campaign"
          testId="menu-campaign"
          meta={three ? `${three.name} — ${three.tagline}` : undefined}
          onClick={() => {
            store.resetSetup('campaign');
            store.goto('scenario-select');
          }}
        />
        <MenuButton
          icon="skirmish"
          label="Skirmish"
          testId="menu-skirmish"
          meta="Play a scenario against a local AI rival"
          onClick={() => {
            store.resetSetup('skirmish');
            store.goto('scenario-select');
          }}
        />
        <MenuButton icon="bestiary" label="Encyclopedia" testId="menu-encyclopedia" onClick={() => store.goto('encyclopedia')} />
        <MenuButton icon="settings" label="Settings" testId="menu-settings" onClick={() => store.goto('settings')} />
        <MenuButton icon="credits" label="Credits" onClick={() => store.openOverlay({ kind: 'credits' })} />
        {platform.canQuit ? (
          <MenuButton
            icon="quit"
            label="Quit"
            testId="menu-quit"
            onClick={() => store.confirm('Quit Pantheon Realms?', 'Unsaved progress since the last save or autosave will be lost.', 'Quit', () => void platform.quit(), { danger: true })}
          />
        ) : null}
      </nav>
      <footer className="main-menu__footer">
        <span>
          v{platform.appVersion} · {platform.kind === 'desktop' ? 'Desktop' : 'Browser'} build · Rules {catalog.versions.rulesVersion} · Content {catalog.versions.contentVersion}
        </span>
        <Chip tone="warn" title="Art, models and animation are development placeholders">
          Temporary art
        </Chip>
        {platform.kind === 'browser' ? <span className="dim">Saves are stored in this browser. Close the tab to quit.</span> : null}
      </footer>
    </div>
  );
}
