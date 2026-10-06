/**
 * S17 Settings. Edits a draft and applies/persists it explicitly. Volume changes
 * are heard live while editing; Cancel/leaving without applying restores them.
 * Only options that work are shown (2D migration directive §19); a few fixed
 * behaviours are stated as such (ownership is never colour alone).
 */
import { useEffect, useState, type ReactNode } from 'react';
import { CONTEXT_LABEL, FIXED_KEYS, KEY_ACTIONS, bindingMap, isReservedKey, keyLabel, normalizeKey, rebind, type KeyContext } from '../app/keys';
import { useStore } from '../app/context';
import { DEFAULT_PREFERENCES, type Preferences } from '../app/preferences';
import { Button, Chip, Panel, Tabs, Toggle } from '../components/kit';
import { ScreenHeader } from '../components/game';
import { someSoundsArePlaceholders, soundsArePlaceholders } from '../audio/gameAudio';
import { classifyGraphics } from '@pr/presentation/core';
import { probeGraphics } from '../app/graphicsProbe';

/** What each preset changes (values in `@pr/presentation/core` graphics.ts). */
const GRAPHICS_HINT: Record<Preferences['graphicsQuality'], string> = {
  high: 'Full resolution on sharp screens, soft ground shadows, all map decoration, painted ground and sky, full spell effects, idle animations, 60 frames per second at most.',
  medium: 'Standard resolution, soft ground shadows, no grass tufts, painted ground and sky, full spell effects, 60 frames per second at most.',
  low: 'Reduced resolution, no shadows or anti-aliasing, sparse map decoration, plain ground colours, simple effect flashes, still figures between actions, 30 frames per second at most.',
};

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


export function SettingsScreen() {
  const store = useStore();
  const platform = store.platform;
  const [tab, setTab] = useState<Tab>((store.screen.params.tab as Tab | undefined) ?? 'gameplay');
  const [draft, setDraft] = useState<Preferences>(store.prefs);
  const [saveInfo, setSaveInfo] = useState<string>('Checking…');
  const [probe, setProbe] = useState<string | null>(null);
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
      <ScreenHeader title="Settings" onBack={leave} />
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
              <Field label="Combat log detail">
                <Select label="Combat log detail" value={draft.combatLogDetail} options={[{ id: 'compact', label: 'Compact' }, { id: 'standard', label: 'Standard' }, { id: 'detailed', label: 'Detailed' }]} onChange={(v) => set('combatLogDetail', v)} />
              </Field>
              <Field label="Tutorial hints" hint="Short tips the first time you plan a route, meet a guard, train troops, lose troops in battle and more">
                <Toggle label="Tutorial hints" checked={draft.tutorialHints} onChange={(v) => set('tutorialHints', v)} />
              </Field>
              <Field label="Show all tips again" hint={draft.dismissedHints.length ? `${draft.dismissedHints.length} tip(s) dismissed` : 'No tips dismissed yet'}>
                <Button
                  size="small"
                  disabled={draft.dismissedHints.length === 0}
                  onClick={() => {
                    setDraft({ ...draft, dismissedHints: [], tutorialHints: true });
                    store.resetHints();
                  }}
                  data-testid="reset-hints"
                >
                  Reset tips
                </Button>
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
              <Field label="Bestiary animation" hint="Creatures in the bestiary play their idle animation by themselves">
                <Toggle label="Bestiary animation" checked={draft.codexAutoplay} onChange={(v) => set('codexAutoplay', v)} />
              </Field>
            </>
          ) : null}
          {tab === 'display' ? (
            <>
              <Field label="Window mode" disabledReason={platform.supportsWindowMode ? undefined : 'Browser build: use your browser’s own fullscreen (F11).'}>
                <Select label="Window mode" value={draft.windowMode} options={[{ id: 'windowed', label: 'Windowed' }, { id: 'fullscreen', label: 'Fullscreen' }]} onChange={(v) => set('windowMode', v)} disabled={!platform.supportsWindowMode} />
              </Field>
              <Field label="Game cursors">
                <Toggle label="Game cursors" checked={draft.gameCursors} onChange={(v) => set('gameCursors', v)} />
              </Field>
              <Field label="Graphics quality" hint={GRAPHICS_HINT[draft.graphicsQuality]}>
                <div className="row" style={{ gap: '0.5rem' }}>
                  <Select label="Graphics quality" value={draft.graphicsQuality} options={[{ id: 'low', label: 'Low' }, { id: 'medium', label: 'Medium' }, { id: 'high', label: 'High' }]} onChange={(v) => set('graphicsQuality', v)} />
                  <Button
                    data-testid="graphics-test"
                    onClick={() => {
                      const r = probeGraphics();
                      const q = classifyGraphics(r);
                      setProbe(`Quick test: ${q === 'high' ? 'High' : q === 'medium' ? 'Medium' : 'Low'}${Number.isFinite(r.msPerPass) ? ` (${r.msPerPass.toFixed(1)} ms per test pass)` : r.webgl2 ? ' (software renderer)' : ' (no WebGL 2)'}`);
                      set('graphicsQuality', q);
                    }}
                  >
                    Test again
                  </Button>
                </div>
              </Field>
              <Field label="Adaptive resolution" hint="Keeps the map and battle moving smoothly on a slower graphics chip: while frames run slower than about 34 per second the view draws fewer pixels (down to 60 %), and returns to full resolution when they are fast again">
                <Toggle label="Adaptive resolution" checked={draft.adaptiveResolution} onChange={(v) => set('adaptiveResolution', v)} />
              </Field>
              <Field label="Frame rate" hint="A small readout over the map and battle: frames per second, the slowest recent frame, and the frames slower than 1/30 s since the view opened">
                <Toggle label="Frame rate" checked={draft.showFrameRate} onChange={(v) => set('showFrameRate', v)} />
              </Field>
              <p className="note" data-testid="graphics-note">
                {probe ? `${probe}. ` : ''}Resolution and frame rate change at once; shadows, detail and painted ground from the next map or battle view; anti-aliasing at the next start.
              </p>
            </>
          ) : null}
          {tab === 'audio' ? (
            <>
              {soundsArePlaceholders() ? <p className="note">The music and sounds in this build are temporary placeholders generated for testing. Final recordings will replace them without changing these settings.</p> : null}
              {someSoundsArePlaceholders() ? (
                <p className="note" data-testid="audio-status-note">
                  Some sounds in this build are temporary placeholders generated for testing; final recordings will replace them without changing these settings.
                </p>
              ) : null}
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
            </>
          ) : null}
          {tab === 'controls' ? (
            <KeyBindings draft={draft} onChange={(keyBindings) => setDraft({ ...draft, keyBindings })} />
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

/** Controls tab: click a key, press the new one (Esc cancels). Conflicting actions in the same context lose the key. */
function KeyBindings({ draft, onChange }: { draft: Preferences; onChange: (bindings: readonly string[]) => void }) {
  const [capturing, setCapturing] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const map = bindingMap(draft);
  useEffect(() => {
    if (!capturing) return;
    const onKey = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.key === 'Escape') {
        setCapturing(null);
        return;
      }
      if (isReservedKey(e.key)) {
        setNote(`${e.key} is reserved (Esc, F1 and the arrow keys are fixed). Choose another key.`);
        return;
      }
      const key = normalizeKey(e.key);
      const res = rebind(draft, capturing, key);
      onChange(res.bindings);
      setNote(res.displaced ? `${keyLabel(key)} was used for “${res.displaced.label}”, which is now unbound.` : null);
      setCapturing(null);
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [capturing, draft, onChange]);
  const contexts: KeyContext[] = ['map', 'adventure', 'battle'];
  return (
    <div data-testid="key-bindings">
      <p className="dim small">Click a key to change it, then press the new key (Esc cancels). Apply to save. Keys only trigger the same buttons you can click.</p>
      {note ? <p className="warn small" role="status">{note}</p> : null}
      {contexts.map((ctx) => (
        <div key={ctx}>
          <SectionTitleLite>{CONTEXT_LABEL[ctx]}</SectionTitleLite>
          <table className="table shortcut-table">
            <tbody>
              {KEY_ACTIONS.filter((a) => a.context === ctx).map((a) => (
                <tr key={a.id}>
                  <th>{a.label}</th>
                  <td>
                    <button
                      type="button"
                      className={`kbd ${capturing === a.id ? 'is-capturing' : ''}`}
                      onClick={() => {
                        setNote(null);
                        setCapturing(capturing === a.id ? null : a.id);
                      }}
                      aria-label={`${a.label}: ${keyLabel(map[a.id])}. Click to change.`}
                      data-testid={`bind-${a.id}`}
                    >
                      {capturing === a.id ? 'Press a key…' : keyLabel(map[a.id])}
                    </button>
                    {map[a.id] !== a.defaultKey ? <span className="faint small"> (default {keyLabel(a.defaultKey)})</span> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
      <SectionTitleLite>Fixed keys</SectionTitleLite>
      <table className="table shortcut-table">
        <tbody>
          {FIXED_KEYS.map((k) => (
            <tr key={k.keys}>
              <th>{k.label}</th>
              <td>
                <span className="kbd">{k.keys}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <Button size="small" onClick={() => onChange([])} disabled={(draft.keyBindings ?? []).length === 0} data-testid="reset-keys">
        Reset all keys to defaults
      </Button>
    </div>
  );
}

function SectionTitleLite({ children }: { children: ReactNode }) {
  return <div className="section-title">{children}</div>;
}
