/**
 * S17 Settings. Edits a draft and applies/persists it explicitly. Volume changes
 * are heard live while editing; Cancel/leaving without applying restores them.
 * Controls for features this build does not have (voice lines, graphics tiers,
 * tutorials, camera shake, key rebinding) are shown disabled with the honest reason.
 */
import { useEffect, useState, type ReactNode } from 'react';
import { useStore } from '../app/context';
import { DEFAULT_PREFERENCES, type Preferences } from '../app/preferences';
import { Button, Chip, Panel, Tabs, Toggle } from '../components/kit';
import { ScreenHeader } from '../components/game';
import { soundsArePlaceholders } from '../audio/gameAudio';

type Tab = 'gameplay' | 'interface' | 'display' | 'audio' | 'accessibility' | 'controls' | 'storage';

function Field({ label, hint, children, disabledReason }: { label: string; hint?: string; children: ReactNode; disabledReason?: string }) {
  return (
    <div className={`field ${disabledReason ? 'is-disabled' : ''}`}>
      <div>
        <div className="field__label">{label}</div>
        {hint ? <div className="field__hint">{hint}</div> : null}
        {disabledReason ? <div className="field__hint warn">{disabledReason}</div> : null}
      </div>
      <div>{children}</div>
    </div>
  );
}

function Select<T extends string>({ value, options, onChange, disabled, label }: { value: T; options: readonly { id: T; label: string }[]; onChange: (v: T) => void; disabled?: boolean; label: string }) {
  return (
    <select className="select" value={value} onChange={(e) => onChange(e.target.value as T)} disabled={disabled} aria-label={label}>
      {options.map((o) => (
        <option key={o.id} value={o.id}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function Slider({ value, min, max, step, onChange, disabled, label, format }: { value: number; min: number; max: number; step: number; onChange: (n: number) => void; disabled?: boolean; label: string; format?: (n: number) => string }) {
  return (
    <span className="row gap">
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} disabled={disabled} aria-label={label} />
      <span className="num small" style={{ minWidth: '3rem' }}>
        {format ? format(value) : value}
      </span>
    </span>
  );
}

const SPEEDS = [
  { id: 'instant', label: 'Instant' },
  { id: 'fast', label: 'Fast' },
  { id: 'normal', label: 'Normal' },
] as const;

const KEYS: [string, string][] = [
  ['Esc', 'Back / pause menu / close dialog'],
  ['Click tile', 'Preview route; click again to move'],
  ['Space', 'Continue along route (map) · skip animation (battle)'],
  ['Enter', 'End day'],
  ['Tab', 'Next hero'],
  ['Arrows / WASD', 'Pan the map camera'],
  ['+ / −, mouse wheel', 'Zoom'],
  ['H, T, J, O, P, B', 'Hero, Town, Journal, Overview, Pantheon, Encyclopedia'],
  ['W / D / S (battle)', 'Wait, Defend, Spell'],
  ['Right-click', 'Details (tile or stack)'],
];

export function SettingsScreen() {
  const store = useStore();
  const platform = store.platform;
  const [tab, setTab] = useState<Tab>((store.screen.params.tab as Tab | undefined) ?? 'gameplay');
  const [draft, setDraft] = useState<Preferences>(store.prefs);
  const [saveInfo, setSaveInfo] = useState<string>('Checking…');
  const dirty = JSON.stringify(draft) !== JSON.stringify(store.prefs);
  const set = <K extends keyof Preferences>(k: K, v: Preferences[K]) => setDraft({ ...draft, [k]: v });

  // Hear volume changes while editing; leaving restores the committed levels.
  useEffect(() => {
    store.audio?.preview(draft);
  }, [draft, store]);
  useEffect(() => () => store.audio?.apply(store.prefs), [store]);
  const audio = store.audio?.status() ?? null;

  useEffect(() => {
    void (async () => {
      try {
        const av = await store.saves.availability();
        if (!av.ok) return setSaveInfo(`Unavailable: ${av.reason}`);
        const list = await store.saves.list();
        setSaveInfo(`${list.length} save${list.length === 1 ? '' : 's'} stored (${store.saves.kind === 'desktop' ? 'local files on this computer' : store.saves.kind === 'browser' ? 'this browser’s storage' : 'memory only'})`);
      } catch (e) {
        setSaveInfo(e instanceof Error ? e.message : 'Unavailable');
      }
    })();
  }, [store]);

  const apply = async () => {
    const err = await store.setPrefs(draft, true);
    if (platform.supportsWindowMode && draft.windowMode !== store.prefs.windowMode) {
      try {
        await platform.setWindowMode(draft.windowMode);
      } catch {
        store.toast('Could not change the window mode', 'error');
      }
    } else if (platform.supportsWindowMode) {
      void platform.setWindowMode(draft.windowMode).catch(() => undefined);
    }
    store.toast(err ? `Applied, but not saved: ${err}` : 'Settings saved', err ? 'error' : 'success');
  };

  const leave = () => {
    if (dirty) store.confirm('Discard changes?', 'Your unsaved settings will be lost.', 'Discard', () => store.back());
    else store.back();
  };

  return (
    <div className="screen settings-screen">
      <ScreenHeader title="Settings" subtitle="Presentation and input preferences — never game rules" onBack={leave} />
      <div className="settings-layout">
        <Tabs<Tab>
          label="Settings sections"
          value={tab}
          onChange={setTab}
          tabs={[
            { id: 'gameplay', label: 'Gameplay' },
            { id: 'interface', label: 'Interface' },
            { id: 'display', label: 'Display' },
            { id: 'audio', label: 'Audio' },
            { id: 'accessibility', label: 'Accessibility' },
            { id: 'controls', label: 'Controls' },
            { id: 'storage', label: 'Saves' },
          ]}
        />
        <Panel className="settings-panel" bodyClassName="scroll">
          {tab === 'gameplay' ? (
            <>
              <Field label="Adventure animation" hint="Hero movement playback on the map">
                <Select label="Adventure animation" value={draft.adventureAnimation} options={SPEEDS} onChange={(v) => set('adventureAnimation', v)} />
              </Field>
              <Field label="Enemy movement" hint="Playback of AI heroes you can see">
                <Select label="Enemy movement" value={draft.enemyMovement} options={SPEEDS} onChange={(v) => set('enemyMovement', v)} />
              </Field>
              <Field label="Battle speed" hint="Instant playback gives exactly the same results">
                <Select
                  label="Battle speed"
                  value={draft.battleSpeed}
                  options={[
                    { id: '0.5', label: '0.5×' },
                    { id: '1', label: '1×' },
                    { id: '1.5', label: '1.5×' },
                    { id: '2', label: '2×' },
                    { id: 'instant', label: 'Instant' },
                  ]}
                  onChange={(v) => set('battleSpeed', v)}
                />
              </Field>
              <Field label="Confirm End Day while heroes can move">
                <Toggle label="Confirm End Day" checked={draft.confirmEndDayWithMovement} onChange={(v) => set('confirmEndDayWithMovement', v)} />
              </Field>
              <Field label="Confirm large recruitments" hint={`At or above ${draft.largePurchaseThreshold} Gold. Buildings always ask.`}>
                <Toggle label="Confirm large purchases" checked={draft.confirmLargePurchases} onChange={(v) => set('confirmLargePurchases', v)} />
              </Field>
              <Field label="Large purchase threshold">
                <Slider label="Large purchase threshold" value={draft.largePurchaseThreshold} min={500} max={10000} step={500} onChange={(n) => set('largePurchaseThreshold', n)} />
              </Field>
              <Field label="Combat log detail">
                <Select label="Combat log detail" value={draft.combatLogDetail} options={[{ id: 'compact', label: 'Compact' }, { id: 'standard', label: 'Standard' }, { id: 'detailed', label: 'Detailed' }]} onChange={(v) => set('combatLogDetail', v)} />
              </Field>
              <Field label="Tutorial hints" disabledReason="No tutorial hints exist in this build.">
                <Toggle label="Tutorial hints" checked={draft.tutorialHints} onChange={(v) => set('tutorialHints', v)} disabled />
              </Field>
            </>
          ) : null}
          {tab === 'interface' ? (
            <>
              <Field label="Interface scale" hint="Scales every panel and text">
                <Slider label="Interface scale" value={draft.uiScale} min={0.8} max={1.6} step={0.05} onChange={(n) => set('uiScale', n)} format={(n) => `${Math.round(n * 100)}%`} />
              </Field>
              <Field label="Text size">
                <Select label="Text size" value={draft.textSize} options={[{ id: 'standard', label: 'Standard' }, { id: 'large', label: 'Large' }, { id: 'xlarge', label: 'Extra large' }]} onChange={(v) => set('textSize', v)} />
              </Field>
              <Field label="Hex grid overlay">
                <Select label="Hex grid" value={draft.hexOverlay} options={[{ id: 'always', label: 'Always' }, { id: 'hover', label: 'Hovered hex only' }, { id: 'off', label: 'Off' }]} onChange={(v) => set('hexOverlay', v)} />
              </Field>
              <Field label="Minimap">
                <Toggle label="Minimap" checked={draft.minimap} onChange={(v) => set('minimap', v)} />
              </Field>
              <Field label="Battle stack labels">
                <Select label="Stack labels" value={draft.unitLabels} options={[{ id: 'count', label: 'Count' }, { id: 'health', label: 'Front health' }, { id: 'both', label: 'Count and health' }]} onChange={(v) => set('unitLabels', v)} />
              </Field>
              <Field label="Bestiary auto-rotate">
                <Toggle label="Bestiary auto-rotate" checked={draft.codexAutoplay} onChange={(v) => set('codexAutoplay', v)} />
              </Field>
              <Field label="Map name labels" disabledReason="Floating map labels are not implemented yet; hover or right-click a tile for its name.">
                <Toggle label="Map labels" checked={draft.mapLabels} onChange={(v) => set('mapLabels', v)} disabled />
              </Field>
              <Field label="Tooltips" disabledReason="Tooltips are always shown in this build.">
                <Toggle label="Tooltips" checked={draft.tooltips} onChange={(v) => set('tooltips', v)} disabled />
              </Field>
            </>
          ) : null}
          {tab === 'display' ? (
            <>
              <Field label="Window mode" disabledReason={platform.supportsWindowMode ? undefined : 'Browser build: use your browser’s own fullscreen (F11).'}>
                <Select label="Window mode" value={draft.windowMode} options={[{ id: 'windowed', label: 'Windowed' }, { id: 'fullscreen', label: 'Fullscreen' }]} onChange={(v) => set('windowMode', v)} disabled={!platform.supportsWindowMode} />
              </Field>
              <Field label="Graphics quality" disabledReason="This build has a single placeholder quality level.">
                <Select label="Graphics quality" value={draft.graphicsQuality} options={[{ id: 'low', label: 'Low' }, { id: 'medium', label: 'Medium' }, { id: 'high', label: 'High' }]} onChange={(v) => set('graphicsQuality', v)} disabled />
              </Field>
            </>
          ) : null}
          {tab === 'audio' ? (
            <>
              {soundsArePlaceholders() ? <p className="note">The music and sounds in this build are temporary placeholders generated for testing. Final recordings will replace them without changing these settings.</p> : null}
              {audio && !audio.available ? <p className="note warn">Audio is unavailable here ({audio.reason ?? 'no audio device'}). The game plays silently.</p> : null}
              {(
                [
                  ['masterVolume', 'Master', undefined],
                  ['musicVolume', 'Music', 'Menu, map and battle themes, and the victory, defeat, level-up and beacon fanfares'],
                  ['ambienceVolume', 'Ambience', 'Sea, wind and storm on the map; the air of the battlefield'],
                  ['interfaceVolume', 'Interface', 'Buttons, dialogs, building, recruiting, the new day'],
                  ['combatVolume', 'Combat', 'Blows, shots, spells and sieges'],
                ] as const
              ).map(([k, label, hint]) => (
                <Field key={k} label={label} hint={hint}>
                  <Slider label={`${label} volume`} value={draft[k]} min={0} max={100} step={5} onChange={(n) => set(k, n)} format={(n) => `${n}%`} />
                </Field>
              ))}
              <Field label="Voice" disabledReason="This build has no voice lines.">
                <Slider label="Voice volume" value={draft.voiceVolume} min={0} max={100} step={5} onChange={(n) => set('voiceVolume', n)} format={(n) => `${n}%`} disabled />
              </Field>
              <Field label="Mute all" hint="Silences everything; your volumes are kept">
                <Toggle label="Mute all" checked={draft.muteAll} onChange={(v) => set('muteAll', v)} />
              </Field>
              <Field label="Mute in the background" hint="Fade out while the game window is not focused">
                <Toggle label="Mute in the background" checked={draft.muteOnFocusLoss} onChange={(v) => set('muteOnFocusLoss', v)} />
              </Field>
              <Field label="Calmer sound" hint="Softer thunder, crashes and fanfares, quieter combat, fewer overlapping sounds">
                <Toggle label="Calmer sound" checked={draft.calmerSound} onChange={(v) => set('calmerSound', v)} />
              </Field>
              <Field label="Test" hint="Plays one interface and one combat sound at the levels above">
                <Button data-testid="audio-test" onClick={() => store.audio?.sample()} disabled={!audio?.available} disabledReason="Audio is unavailable here">
                  Play a test sound
                </Button>
              </Field>
            </>
          ) : null}
          {tab === 'accessibility' ? (
            <>
              <Field label="Motion" hint="Reduced motion makes map and battle playback instant and removes UI transitions">
                <Select label="Motion" value={draft.motion} options={[{ id: 'system', label: 'Follow system' }, { id: 'reduced', label: 'Reduced' }, { id: 'full', label: 'Full' }]} onChange={(v) => set('motion', v)} />
              </Field>
              <Field label="High contrast">
                <Toggle label="High contrast" checked={draft.highContrast} onChange={(v) => set('highContrast', v)} />
              </Field>
              <Field label="Color-independent ownership" disabledReason="Always on: ownership also uses banner shape (square = yours, pennant = others) and text.">
                <Toggle label="Color-independent ownership" checked disabled onChange={() => undefined} />
              </Field>
              <Field label="Camera shake" disabledReason="This build uses no camera shake.">
                <Toggle label="Camera shake" checked={draft.cameraShake} onChange={(v) => set('cameraShake', v)} disabled />
              </Field>
              <Field label="Screen flashes" disabledReason="This build uses no full-screen flashes.">
                <Select label="Screen flashes" value={draft.screenFlashes} options={[{ id: 'reduced', label: 'Reduced' }, { id: 'standard', label: 'Standard' }]} onChange={(v) => set('screenFlashes', v)} disabled />
              </Field>
            </>
          ) : null}
          {tab === 'controls' ? (
            <>
              <p className="dim small">Key rebinding is not available yet. Current bindings:</p>
              <table className="table">
                <tbody>
                  {KEYS.map(([k, v]) => (
                    <tr key={k}>
                      <th>
                        <kbd>{k}</kbd>
                      </th>
                      <td>{v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          ) : null}
          {tab === 'storage' ? (
            <>
              <Field label="Save storage" hint={saveInfo}>
                <Chip>{platform.kind === 'desktop' ? 'Desktop' : 'Browser'}</Chip>
              </Field>
              <Field label="Manage saves" hint="Load, delete, export or import save files">
                <Button onClick={() => store.openOverlay({ kind: 'save-load', mode: 'load' })}>Open saves</Button>
              </Field>
              <Field label="Versions">
                <span className="small faint">
                  App {platform.appVersion} · rules {store.catalog.versions.rulesVersion} · content {store.catalog.versions.contentVersion} · save schema {store.catalog.versions.saveSchemaVersion}
                </span>
              </Field>
            </>
          ) : null}
        </Panel>
        <footer className="settings-footer">
          <Button onClick={() => setDraft(DEFAULT_PREFERENCES)}>Restore defaults</Button>
          <Button onClick={() => setDraft(store.prefs)} disabled={!dirty}>
            Revert
          </Button>
          <Button variant="primary" onClick={() => void apply()} disabled={!dirty} data-testid="settings-apply">
            Apply
          </Button>
        </footer>
      </div>
    </div>
  );
}
