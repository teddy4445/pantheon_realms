/**
 * S01 Main Menu (opening screen). One of the opening backgrounds is chosen at
 * random each time the game starts, under a 20 % black layer; the title
 * lettering sits above the ornate frame that holds the menu. Campaigns,
 * skirmish and random maps are reached through New Game, high scores through
 * the end-of-game summary. Continue shows the most recent compatible save with its
 * metadata and is disabled (with the reason) when none exists. Quit appears
 * only on desktop; the browser build never pretends to close its tab.
 *
 * All art is resolved by asset ID (assets-runtime/ui/manifest.json); without
 * the files the screen still works with a text title and a plain panel.
 *
 * 1.1.0: the title hall (frontend.backdrop.title-hall) joins the opening
 * paintings; a small Hall of Records entry opens the existing high-score
 * tables (optional navigation from the pre-game handoff); the footer keeps the
 * live release only — rules, content and save versions are in Settings → Saves.
 *
 * 1.1.3 (owner): the title always shows the frontend kit's title painting
 * (`menuBackground`), with the menu as the kit's slim panel between the hall's
 * pillars; the older paintings and the ornate frame are only the fallback.
 */
import { useEffect, useState, type CSSProperties } from 'react';
import { useStore } from '../app/context';
import { MenuButton } from '../components/kit';
import { menuBackground, menuFrameInterior, resolveAsset } from '../assets/manifest';
import { relativeTime } from '../app/view';

export function MainMenuScreen() {
  const store = useStore();
  const { continueSlot, continueChecked, storageError, platform, catalog } = store;
  useEffect(() => {
    if (!store.continueChecked) void store.refreshContinue();
  }, [store, store.continueChecked]);
  const [preview, setPreview] = useState<string | null>(null);
  const bg = menuBackground();
  // 1.1.0 frontend kit: the title logo is its own transparent layer (plaque, lettering and crest), over any
  // background; the earlier lettering stays as the fallback.
  const kitLogo = resolveAsset('frontendkit.brand.logo');
  const logo = kitLogo.url ? kitLogo : resolveAsset('brand.logo.text');
  // 1.1.3: over the kit's title painting (a hall with its own pillars and arch) the menu is the kit's slim
  // panel between the pillars, as the frontend kit composes it; the older ornate frame stays for the
  // older paintings (the fallback when the kit's painting is missing).
  const kitTitle = bg.id === 'frontendkit.backdrop.title';
  const frame = kitTitle ? { url: '' } : resolveAsset('menu.frame');
  const win = menuFrameInterior();
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

  const describe = (text: string) => (on: boolean) => setPreview(on ? text : null);

  const frameStyle = {
    '--win-left': `${win.left * 100}%`,
    '--win-right': `${win.right * 100}%`,
    '--win-top': `${win.top * 100}%`,
    '--win-bottom': `${win.bottom * 100}%`,
  } as CSSProperties;

  return (
    <div className={`main-menu ${frame.url ? 'has-frame' : ''} ${kitTitle ? 'main-menu--kit' : ''}`}>
      <div className="main-menu__bg" style={bg.url ? { backgroundImage: `url(${bg.url})` } : undefined} data-background={bg.id} aria-hidden="true" />
      <div className="main-menu__shade" aria-hidden="true" />
      <header className="main-menu__brand">
        <h1 className="main-menu__title">
          {logo.url ? <img className={`main-menu__logo ${kitLogo.url ? 'main-menu__logo--kit' : ''}`} src={logo.url} alt="Pantheon Realms" draggable={false} /> : 'Pantheon Realms'}
        </h1>
      </header>
      <div className="main-menu__stage">
        <div className="menu-frame" style={frameStyle}>
          {frame.url ? <img className="menu-frame__art" src={frame.url} alt="" draggable={false} /> : null}
          <nav className="menu-frame__window" aria-label="Main menu">
            <div className="menu-frame__list">
              <MenuButton
                variant="framed"
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
                variant="framed"
                icon="newgame"
                label="New Game"
                testId="menu-new"
                autoFocus={!continueSlot}
                onPreview={describe('Campaign, skirmish or a random map')}
                onClick={() => {
                  store.resetSetup(null);
                  store.goto('game-mode');
                }}
              />
              <MenuButton variant="framed" icon="load" label="Load Game" testId="menu-load" onPreview={describe('Saves, autosaves and imported save files')} onClick={() => store.openOverlay({ kind: 'save-load', mode: 'load' })} />
              <MenuButton variant="framed" icon="bestiary" label="Encyclopedia" testId="menu-encyclopedia" onPreview={describe('Pantheons, gods, creatures, buildings and rules')} onClick={() => store.goto('encyclopedia')} />
              <MenuButton variant="framed" icon="settings" label="Settings" testId="menu-settings" onPreview={describe('Display, audio, gameplay, controls and accessibility')} onClick={() => store.goto('settings')} />
              {platform.canQuit ? (
                <MenuButton
                  variant="framed"
                  icon="quit"
                  label="Quit"
                  testId="menu-quit"
                  onClick={() => store.confirm('Quit Pantheon Realms?', 'Unsaved progress since the last save or autosave will be lost.', 'Quit', () => void platform.quit(), { danger: true })}
                />
              ) : null}
            </div>
            <div className="menu-frame__records">
              <MenuButton variant="compact" icon="star" artUrl={resolveAsset('frontendkit.icon.records').url || null} label="Hall of Records" testId="menu-records" onPreview={describe('The best finished games on this computer')} onClick={() => store.goto('high-scores')} />
            </div>
          </nav>
        </div>
        <div className="main-menu__caption" aria-live="polite">
          {preview ?? ' '}
        </div>
      </div>
      <footer className="main-menu__footer">
        <span title={`Rules ${catalog.versions.rulesVersion} · content ${catalog.versions.contentVersion} (Settings → Saves)`}>
          v{platform.appVersion} · {platform.kind === 'desktop' ? 'Desktop' : 'Browser'} build
        </span>
        {platform.kind === 'browser' ? <span className="dim">Saves are stored in this browser. Close the tab to quit.</span> : null}
      </footer>
    </div>
  );
}
