/**
 * Modal flows: pause, save/load, confirmation, mission briefing/debrief,
 * mission failed, campaign complete, help, army exchange, pre-battle
 * encounter, beacon activation and stack details.
 *
 * Dialogs submit commands or session transitions; they never edit state.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  abilityRules,
  quoteNeutralReaction,
  armyStacks,
  campaignEpilogueLines,
  hexEquals,
  missionObjectiveDefs,
  missionSite,
  quoteActivation,
  quoteMovement,
  quoteTransfer,
  siegeTownAt,
  siteAt,
  townFortificationLevel,
  type ArmyRef,
  type ArmyState,
  type HexCoord, requireScenarioMission, scenarioMission,
} from '@pr/rules';
import { useStore } from '../app/context';
import { endOfGameSplash } from '../components/moments';
import type { AppStore, Overlay } from '../app/store';
import { AUTO_SLOTS, CHECKPOINT_SLOT, MANUAL_SLOTS, type SlotInfo } from '../app/saves';
import { Button, Chip, MenuButton, Modal, QuantitySelector, SectionTitle } from '../components/kit';
import { ArtifactIcon, CreaturePortrait, HeroPortrait, MissionThumb, SceneArt, briefingArt, speakerSides } from '../components/art';
import { DialogueStage, useProtagonist } from './Story';
import { ArmyStrip, CostList, CreatureStats } from '../components/game';
import { Icon } from '../assets/icons';
import { DialogueLines } from '../screens/Journal';
import { resolveAsset } from '../assets/manifest';
import { relativeTime } from '../app/view';
import { CampDialog, ChestDialog, GameOverDialog, HandoffDialog, InterventionsDialog, MapEventDialog, QuestHutDialog, ShortcutsDialog } from './WorldDialogs';
import { SpellBook } from '../components/spellbook';
import { AbilityBadge } from '../components/badges';

// ---------------------------------------------------------------------------

function toMainMenu(store: AppStore) {
  store.endSession();
  store.resetTo('main-menu');
  void store.refreshContinue();
}

function PauseMenu() {
  const store = useStore();
  const session = store.session;
  const inBattle = !!session?.state.battle;
  return (
    // No close button: Resume (or Esc) returns to the game; quitting goes through the main menu.
    <Modal title="Paused" width="26rem" testId="pause">
      <nav className="pause-menu">
        <MenuButton icon="play" label="Resume" autoFocus onClick={() => store.closeOverlay()} />
        <MenuButton icon="save" label="Save Game" onClick={() => store.openOverlay({ kind: 'save-load', mode: 'save' })} disabled={!session} />
        <MenuButton icon="load" label="Load Game" onClick={() => store.openOverlay({ kind: 'save-load', mode: 'load' })} />
        <MenuButton icon="settings" label="Settings" onClick={() => { store.closeOverlay(); store.goto('settings'); }} />
        <MenuButton icon="journal" label="Journal" onClick={() => { store.closeOverlay(); store.goto('journal'); }} disabled={!session || inBattle} disabledReason={inBattle ? 'Not during battle' : undefined} />
        <MenuButton
          icon="newgame"
          label="Restart Mission"
          disabled={!session}
          onClick={() =>
            store.confirm('Restart this mission?', 'The mission restarts from its recorded starting state. Progress in this attempt is lost unless saved.', 'Restart', () => {
              store.closeAllOverlays();
              session!.restartMission();
              store.resetTo('adventure');
              store.openOverlay({ kind: 'briefing' });
            }, { danger: true })
          }
        />
        <MenuButton icon="back" label="Main Menu" onClick={() => store.confirm('Return to the main menu?', 'Unsaved progress since the last save or autosave will be lost.', 'Main Menu', () => toMainMenu(store), { danger: true })} />
      </nav>
    </Modal>
  );
}

// ---------------------------------------------------------------------------

function SaveLoadDialog({ mode: initialMode }: { mode: 'save' | 'load' }) {
  const store = useStore();
  const [mode, setMode] = useState(initialMode);
  const [slots, setSlots] = useState<SlotInfo[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [name, setName] = useState('');
  const refresh = async () => {
    try {
      const av = await store.saves.availability();
      if (!av.ok) {
        setError(av.reason);
        setSlots([]);
        return;
      }
      setSlots(await store.saves.list());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Storage unavailable');
      setSlots([]);
    }
  };
  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const session = store.session;
  const canSave = !!session && mode === 'save';
  const byId = new Map((slots ?? []).map((s) => [s.id, s]));
  const defaultName = session ? `${scenarioMission(store.catalog, session.state)?.name ?? 'Game'} — Day ${session.state.day}` : '';
  const doSave = async (id: string) => {
    if (!session) return;
    const label = name.trim() || defaultName;
    try {
      await store.saves.write(id, 'manual', label, session.snapshot());
      store.toast(`Saved “${label}”`, 'success');
      store.continueChecked = false;
      await refresh();
    } catch (e) {
      store.toast(`Save failed: ${e instanceof Error ? e.message : String(e)}`, 'error');
    }
  };
  const doLoad = async (id: string) => {
    const { envelope, compatibility } = await store.saves.read(id);
    if (!envelope || compatibility.status !== 'ok') {
      store.toast(`Cannot load: ${compatibility.status === 'ok' ? 'missing' : compatibility.reason}`, 'error');
      return;
    }
    store.closeAllOverlays();
    store.loadSnapshot(envelope.snapshot);
    store.toast(`Loaded “${envelope.name}”`, 'success');
  };
  const sel = selected ? byId.get(selected) : undefined;
  const order = mode === 'save' ? [...MANUAL_SLOTS] : [...MANUAL_SLOTS, ...AUTO_SLOTS, CHECKPOINT_SLOT];
  return (
    <Modal
      title={mode === 'save' ? 'Save Game' : 'Load Game'}
      onClose={() => store.closeOverlay()}
      width="52rem"
      testId="save-load"
      footer={
        <>
          <div className="tabs">
            <button type="button" role="tab" className="tab" aria-selected={mode === 'save'} onClick={() => setMode('save')} disabled={!session}>
              Save
            </button>
            <button type="button" role="tab" className="tab" aria-selected={mode === 'load'} onClick={() => setMode('load')}>
              Load
            </button>
          </div>
          <span className="grow" />
          <Button
            icon="load"
            onClick={async () => {
              const r = await store.saves.importSave();
              store.toast(r.message, r.ok ? 'success' : 'error');
              void refresh();
            }}
          >
            Import…
          </Button>
          <Button onClick={() => store.closeOverlay()}>Close</Button>
        </>
      }
    >
      {error ? <p className="note danger">Saves are unavailable: {error}</p> : null}
      {slots === null ? <p className="dim">Reading saves…</p> : null}
      <div className="save-layout">
        <ul className="save-list" role="listbox" aria-label="Save slots">
          {order.map((id) => {
            const s = byId.get(id);
            const kindLabel = id.startsWith('auto') ? 'Autosave' : id === CHECKPOINT_SLOT ? 'Checkpoint' : `Slot ${id.split('-')[1]}`;
            return (
              <li key={id}>
                <button type="button" role="option" aria-selected={selected === id} className={`save-row ${selected === id ? 'is-selected' : ''} ${s ? '' : 'is-empty'}`} onClick={() => setSelected(id)} data-testid={`save-${id}`}>
                  <span className="save-row__kind">{kindLabel}</span>
                  <span className="save-row__name">{s ? s.name : 'Empty'}</span>
                  <span className="save-row__meta faint small">
                    {s?.metadata ? `${s.metadata.missionName} · Day ${s.metadata.day} · ${s.metadata.heroName} Lv ${s.metadata.heroLevel}` : ''}
                  </span>
                  {s ? (
                    s.compatibility.status === 'ok' ? (
                      <span className="faint small">{relativeTime(s.savedAt)}</span>
                    ) : (
                      <Chip tone="bad" title={s.compatibility.reason}>
                        {s.compatibility.status}
                      </Chip>
                    )
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
        <div className="save-detail">
          {selected ? (
            <>
              {sel?.envelope ? <MissionThumb catalog={store.catalog} missionId={sel.envelope.snapshot.match.mission.missionId} style={{ width: '100%', height: '8rem' }} /> : null}
              {sel ? (
                <>
                  <div className="save-detail__name">{sel.name}</div>
                  {sel.metadata ? (
                    <div className="small">
                      {sel.metadata.campaignName ?? sel.metadata.scenarioName} — {sel.metadata.missionName}
                      <br />
                      Week {sel.metadata.week}, day {sel.metadata.dayOfWeek} · {sel.metadata.heroName} level {sel.metadata.heroLevel} · {sel.metadata.pantheonName}
                      <br />
                      <span className="faint">
                        {sel.metadata.branch} · rules {sel.metadata.rulesVersion} · {Math.round(sel.bytes / 1024)} KB
                      </span>
                    </div>
                  ) : null}
                  {sel.compatibility.status !== 'ok' ? <p className="danger small">{sel.compatibility.reason}. The file is kept unchanged.</p> : null}
                </>
              ) : (
                <p className="dim">Empty slot.</p>
              )}
              {canSave && MANUAL_SLOTS.includes(selected as (typeof MANUAL_SLOTS)[number]) ? (
                <>
                  <label className="field__label" htmlFor="save-name">
                    Name
                  </label>
                  <input id="save-name" className="input" value={name} placeholder={defaultName} maxLength={60} onChange={(e) => setName(e.target.value)} />
                  <Button
                    variant="primary"
                    block
                    onClick={() => (sel ? store.confirm('Overwrite this save?', `“${sel.name}” will be replaced.`, 'Overwrite', () => void doSave(selected)) : void doSave(selected))}
                    data-testid="save-confirm"
                  >
                    {sel ? 'Overwrite' : 'Save here'}
                  </Button>
                </>
              ) : null}
              {mode === 'load' && sel ? (
                <Button
                  variant="primary"
                  block
                  disabled={sel.compatibility.status !== 'ok'}
                  disabledReason={sel.compatibility.status === 'ok' ? null : sel.compatibility.reason}
                  onClick={() => (session ? store.confirm('Load this save?', 'Unsaved progress in the current game will be lost.', 'Load', () => void doLoad(selected)) : void doLoad(selected))}
                  data-testid="load-confirm"
                >
                  Load
                </Button>
              ) : null}
              {sel ? (
                <div className="row gap">
                  <Button size="small" onClick={() => void store.saves.exportSave(sel.id, sel.name).then((ok) => store.toast(ok ? 'Exported' : 'Export cancelled'))}>
                    Export…
                  </Button>
                  <Button
                    size="small"
                    variant="danger"
                    onClick={() =>
                      store.confirm('Delete this save?', `“${sel.name}” will be permanently deleted.`, 'Delete', async () => {
                        await store.saves.remove(sel.id);
                        store.continueChecked = false;
                        setSelected(null);
                        void refresh();
                      }, { danger: true })
                    }
                  >
                    Delete
                  </Button>
                </div>
              ) : null}
            </>
          ) : (
            <p className="dim">{mode === 'save' ? 'Choose a manual slot. Autosaves rotate automatically at dawn; a checkpoint is written before every battle.' : 'Choose a save to see its details.'}</p>
          )}
        </div>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------

function ConfirmDialog({ o }: { o: Extract<Overlay, { kind: 'confirm' }> }) {
  const store = useStore();
  return (
    <Modal
      title={o.title}
      onClose={() => store.closeOverlay()}
      width="30rem"
      testId="confirm"
      footer={
        <>
          <span className="grow" />
          <Button onClick={() => store.closeOverlay()}>Cancel</Button>
          <Button
            variant={o.danger ? 'danger' : 'primary'}
            onClick={() => {
              store.closeOverlay();
              o.onConfirm();
            }}
            data-testid="confirm-ok"
          >
            {o.confirmLabel}
          </Button>
        </>
      }
    >
      <p>{o.body}</p>
      {o.detail?.length ? (
        <ul className="bullets small">
          {o.detail.map((d) => (
            <li key={d}>{d}</li>
          ))}
        </ul>
      ) : null}
    </Modal>
  );
}

// ---------------------------------------------------------------------------

/**
 * Mission briefing as a full-screen scene: the mission's painted briefing art
 * behind (its bottom 30 % is kept for the dialogue), the title at the top left,
 * the objectives at the right and the briefing lines in the dialogue box with the
 * speaker's bust. Begin is always available.
 */
function BriefingDialog() {
  const store = useStore();
  const state = store.session!.state;
  const catalog = store.catalog;
  const mission = requireScenarioMission(catalog, state);
  const objectives = missionObjectiveDefs(catalog, state).filter((o) => state.mission.objectives[o.id]?.status !== 'locked');
  const campaign = mission.campaignId ? catalog.campaigns[mission.campaignId] : undefined;
  const protagonist = useProtagonist();
  const lines = mission.briefing;
  const [index, setIndex] = useState(0);
  const line = lines[Math.min(index, Math.max(0, lines.length - 1))];
  const sides = useMemo(() => speakerSides(lines, protagonist), [lines, protagonist]);
  const art = briefingArt(mission.thumbnailAssetId);
  const template = catalog.mapTemplates[mission.mapTemplateId];
  const kicker = campaign ? `${campaign.name} · Mission ${mission.order}` : state.customMission ? 'Random map' : 'Skirmish';
  const last = index >= lines.length - 1;
  return (
    <div className="briefing-scene" role="dialog" aria-modal="true" aria-label={`${kicker}: ${mission.name}`} data-testid="briefing">
      <SceneArt
        art={art}
        scrim="bottom"
        fallback={<MissionThumb catalog={catalog} missionId={mission.id} assetId={mission.thumbnailAssetId} style={{ width: '100%', height: '100%', border: 0, borderRadius: 0 }} />}
      />
      <header className="briefing-scene__head">
        <div className="briefing-scene__kicker">{kicker}</div>
        <h1 className="briefing-scene__title">{mission.name}</h1>
        <div className="briefing-scene__subtitle">{mission.subtitle}</div>
      </header>
      <aside className="briefing-scene__side panel" aria-label="Mission objectives">
        <div className="briefing-scene__side-body scroll">
          <p className="briefing-scene__summary">{mission.summary}</p>
          <SectionTitle>Objectives</SectionTitle>
          <ul className="bullets">
            {objectives.map((o) => (
              <li key={o.id}>
                <strong>{o.title}</strong> {o.category === 'optional' ? <Chip>optional</Chip> : null} <span className="dim small">— {o.description}</span>
              </li>
            ))}
          </ul>
          {mission.newDecisions.length ? (
            <>
              <SectionTitle>New in this mission</SectionTitle>
              <div className="row gap wrap">
                {mission.newDecisions.map((d) => (
                  <Chip key={d} tone="info">
                    {d}
                  </Chip>
                ))}
              </div>
            </>
          ) : null}
          <p className="faint small">
            {mission.targetPlaytime}
            {template ? ` · ${template.width}×${template.height} map` : ''}
          </p>
        </div>
      </aside>
      {line ? (
        <DialogueStage
          line={line}
          side={sides.get(line.speaker) ?? 'left'}
          footer={
            <>
              <span className="faint small">
                {index + 1} / {lines.length}
              </span>
              <span className="grow" />
              {index > 0 ? (
                <Button size="small" variant="ghost" onClick={() => setIndex((i) => i - 1)} data-testid="briefing-prev">
                  Back
                </Button>
              ) : null}
              {!last ? (
                <Button size="small" onClick={() => setIndex((i) => i + 1)} data-testid="briefing-next">
                  Next
                </Button>
              ) : null}
              <Button variant="primary" size="large" onClick={() => store.closeOverlay()} autoFocus data-testid="briefing-begin">
                Begin
              </Button>
            </>
          }
        />
      ) : (
        <div className="story-stage">
          <div className="story-box panel">
            <div className="story-box__footer">
              <span className="grow" />
              <Button variant="primary" size="large" onClick={() => store.closeOverlay()} autoFocus data-testid="briefing-begin">
                Begin
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DebriefDialog({ final }: { final: boolean }) {
  const store = useStore();
  const session = store.session!;
  const catalog = store.catalog;
  const state = session.state;
  const mission = requireScenarioMission(catalog, state);
  const campaign = session.campaign;
  const record = campaign?.completions.find((c) => c.missionId === mission.id);
  const next = session.hasNextMission();
  const nextMission = next && campaign ? catalog.missions[catalog.campaigns[campaign.campaignId]!.missionIds[mission.order] ?? ''] : undefined;
  const campDef = campaign ? catalog.campaigns[campaign.campaignId] : undefined;
  const epilogue = campDef ? campaignEpilogueLines(campDef, state.mission.flags) : [];
  return (
    <Modal
      title={final ? 'Campaign complete' : state.outcome.status === 'victory' ? `Victory — ${mission.name}` : mission.name}
      width="52rem"
      testId={final ? 'campaign-complete' : 'debrief'}
      splash={endOfGameSplash(state, session.humanPlayerId, final ? 'Campaign complete' : state.outcome.status === 'victory' ? 'Victory' : 'Mission complete', final ? (campDef?.name ?? mission.name) : mission.name)}
      footer={
        <>
          <Button onClick={() => toMainMenu(store)}>Main Menu</Button>
          <Button
            onClick={() => {
              store.closeAllOverlays();
              store.goto('summary', { returnTo: final ? 'campaign-complete' : 'debrief' });
            }}
            data-testid="debrief-summary"
          >
            {final ? 'Campaign summary' : 'Mission summary'}
          </Button>
          <span className="grow" />
          {next ? (
            <Button
              variant="primary"
              size="large"
              data-testid="debrief-continue"
              onClick={() => {
                store.closeAllOverlays();
                session.continueToNextMission();
                store.resetTo('adventure');
                store.openOverlay({ kind: 'briefing' });
              }}
            >
              Continue to {nextMission ? `Mission ${nextMission.order}: ${nextMission.name}` : 'next mission'}
            </Button>
          ) : null}
        </>
      }
    >
      <DialogueLines lines={mission.victory} />
      {state.outcome.status === 'victory' ? <p className="success">{state.outcome.reason}</p> : null}
      {record ? (
        <>
          <SectionTitle>Mission summary</SectionTitle>
          <table className="table">
            <tbody>
              <tr>
                <th>Days</th>
                <td className="num">{record.summary.days}</td>
              </tr>
              <tr>
                <th>Battles won</th>
                <td className="num">{record.summary.battlesWon}</td>
              </tr>
              <tr>
                <th>Objectives</th>
                <td className="num">
                  {record.summary.objectivesCompleted} / {record.summary.objectivesTotal}
                </td>
              </tr>
              <tr>
                <th>Troops trained</th>
                <td className="num">{record.summary.upgradesTrained}</td>
              </tr>
              <tr>
                <th>Hero</th>
                <td>
                  Level {record.summary.heroLevel} · {record.summary.heroXp} XP {record.summary.xpCapped ? <Chip tone="warn">XP capped for this mission</Chip> : null}
                </td>
              </tr>
              <tr>
                <th>Gods</th>
                <td>{record.summary.chosenGodIds.map((g) => catalog.gods[g]?.name).join(', ') || '—'}</td>
              </tr>
            </tbody>
          </table>
          <SectionTitle>What carries forward</SectionTitle>
          <ul className="bullets small">
            {mission.debriefPolicy.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
        </>
      ) : null}
      {final && epilogue.length ? (
        <>
          <SectionTitle>Epilogue</SectionTitle>
          <DialogueLines lines={epilogue} />
        </>
      ) : null}
      {final ? (
        <p className="note">
          You have completed {catalog.campaigns[campaign?.campaignId ?? '']?.name ?? 'the campaign'}. Thank you for playing this development build — much of the art and animation is still a temporary placeholder.
        </p>
      ) : null}
    </Modal>
  );
}

function MissionFailedDialog() {
  const store = useStore();
  const session = store.session!;
  const state = session.state;
  const [hasCheckpoint, setHasCheckpoint] = useState(false);
  useEffect(() => {
    void store.saves.read(CHECKPOINT_SLOT).then((r) => setHasCheckpoint(!!r.envelope && r.compatibility.status === 'ok'));
  }, [store]);
  return (
    <Modal
      title="Mission failed"
      width="34rem"
      testId="mission-failed"
      splash={endOfGameSplash(state, session.humanPlayerId, 'Defeat', requireScenarioMission(store.catalog, state).name)}
      footer={
        <>
          <Button onClick={() => toMainMenu(store)}>Main Menu</Button>
          <span className="grow" />
          <Button
            disabled={!hasCheckpoint}
            disabledReason="No checkpoint available"
            onClick={async () => {
              const r = await store.saves.read(CHECKPOINT_SLOT);
              if (r.envelope && r.compatibility.status === 'ok') {
                store.closeAllOverlays();
                store.loadSnapshot(r.envelope.snapshot);
              }
            }}
          >
            Load pre-battle checkpoint
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              store.closeAllOverlays();
              session.restartMission();
              store.resetTo('adventure');
              store.openOverlay({ kind: 'briefing' });
            }}
            data-testid="failed-restart"
          >
            Restart mission
          </Button>
        </>
      }
    >
      <p>{state.outcome.status === 'defeat' ? state.outcome.reason : 'The mission cannot be completed.'}</p>
      <p className="dim small">Restarting uses the mission’s recorded starting state, including the hero carried over from the previous mission.</p>
    </Modal>
  );
}

function HelpDialog({ topicId }: { topicId: string }) {
  const store = useStore();
  const mission = store.session ? scenarioMission(store.catalog, store.session.state) : undefined;
  const topic = mission?.helpTopics.find((t) => t.id === topicId);
  return (
    <Modal title={topic?.title ?? 'Help'} onClose={() => store.closeOverlay()} width="32rem">
      <p>{topic?.text ?? 'No help is available for this topic.'}</p>
    </Modal>
  );
}

// ---------------------------------------------------------------------------

function TransferDialog({ o }: { o: Extract<Overlay, { kind: 'transfer' }> }) {
  const store = useStore();
  const catalog = store.catalog;
  const state = store.session!.state;
  const playerId = store.session!.humanPlayerId;
  const hero = state.heroes[o.heroId];
  const left: { ref: ArmyRef; label: string; army: ArmyState } | null = hero ? { ref: { kind: 'hero', heroId: hero.id }, label: hero.name, army: hero.army } : null;
  const other = o.otherHeroId ? state.heroes[o.otherHeroId] : undefined;
  const town = o.townId ? state.towns[o.townId] : undefined;
  const right: { ref: ArmyRef; label: string; army: ArmyState } | null = other ? { ref: { kind: 'hero', heroId: other.id }, label: other.name, army: other.army } : town ? { ref: { kind: 'garrison', townId: town.id }, label: `${town.name} garrison`, army: town.garrison } : null;
  const [sel, setSel] = useState<{ side: 'l' | 'r'; slot: number } | null>(null);
  const [qty, setQty] = useState<number | null>(null);
  if (!left || !right) return null;
  const sides = { l: left, r: right };
  const selStack = sel ? sides[sel.side].army.slots[sel.slot] : null;
  const click = (side: 'l' | 'r', slot: number) => {
    if (!sel) {
      if (sides[side].army.slots[slot]) {
        setSel({ side, slot });
        setQty(null);
      }
      return;
    }
    if (sel.side === side && sel.slot === slot) {
      setSel(null);
      return;
    }
    const from = sides[sel.side];
    const to = sides[side];
    const stack = from.army.slots[sel.slot];
    if (!stack) return setSel(null);
    const n = qty ?? stack.count;
    const q = quoteTransfer(catalog, state, playerId, from.ref, sel.slot, to.ref, slot, n);
    if (!q.legal) {
      store.toast(q.reason ?? 'Cannot transfer', 'error');
      return;
    }
    store.dispatch({ kind: 'TransferStack', from: from.ref, fromSlot: sel.slot, to: to.ref, toSlot: slot, quantity: n });
    setSel(null);
    setQty(null);
  };
  const targets = (side: 'l' | 'r') => (sel ? sides[side].army.slots.map((_, i) => i).filter((i) => !(sel.side === side && sel.slot === i)) : []);
  return (
    <Modal title="Exchange troops" onClose={() => store.closeOverlay()} width="54rem" testId="transfer" footer={<><span className="grow" /><Button variant="primary" onClick={() => store.closeOverlay()}>Done</Button></>}>
      <div className="transfer">
        {(['l', 'r'] as const).map((side) => (
          <div key={side} className="transfer__side">
            <div className="section-title">{sides[side].label}</div>
            <ArmyStrip catalog={catalog} army={sides[side].army} selected={sel?.side === side ? sel.slot : null} onSlot={(i) => click(side, i)} dropTargets={targets(side)} label={sides[side].label} testId={`transfer-${side}`} />
            <div className="faint small">{armyStacks(sides[side].army).reduce((n, s) => n + s.count, 0)} creatures</div>
          </div>
        ))}
      </div>
      <div className="transfer__bar">
        {selStack && sel ? (
          <>
            <span className="small">
              Moving {qty ?? selStack.count} of {selStack.count} {catalog.creatures[selStack.creatureId]?.pluralName}. Click a slot on either side.
            </span>
            {selStack.count > 1 ? <QuantitySelector label="Quantity to move" value={qty ?? selStack.count} min={1} max={selStack.count} onChange={setQty} /> : null}
            <Button size="small" variant="ghost" onClick={() => setSel(null)}>
              Cancel
            </Button>
          </>
        ) : (
          <span className="dim small">Select a stack, optionally choose a quantity to split, then click the destination slot. Matching stacks merge; different stacks swap. A hero must keep at least one creature.</span>
        )}
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------

const FORT_TEXT: Record<number, string> = {
  0: 'The town has no walls: its defenders meet you in the open.',
  1: 'Fort: walls and a gate (2 structure points each).',
  2: 'Citadel: walls and gate, a keep that fires every round, and a moat that stops and wounds ground troops.',
  3: 'Castle: three-point walls, keep, moat and two towers that fire every round.',
};

function EncounterDialog({ heroId, dest }: { heroId: string; dest: HexCoord }) {
  const store = useStore();
  const catalog = store.catalog;
  useEffect(() => store.showHint('guarded_path'), [store]);
  const state = store.session!.state;
  const hero = state.heroes[heroId];
  const q = hero ? quoteMovement(catalog, state, heroId, dest) : null;
  const site = (scenarioMission(catalog, state)?.sites ?? []).find((s) => hexEquals(s.coord, dest));
  const enemyHero = Object.values(state.heroes).find((h) => h.status === 'active' && h.id !== heroId && hexEquals(h.position, dest));
  const at = siteAt(catalog, state, dest);
  const town = at && hero ? siegeTownAt(catalog, state, at, hero.ownerId) : null;
  const level = town ? townFortificationLevel(catalog, town) : 0;
  const army = town
    ? [...(enemyHero ? armyStacks(enemyHero.army) : []), ...armyStacks(town.garrison)].map((s) => ({ creatureId: s.creatureId, count: s.count }))
    : enemyHero
      ? armyStacks(enemyHero.army).map((s) => ({ creatureId: s.creatureId, count: s.count }))
      : site
        ? (state.world.sites[site.id]?.guard ?? site.guard?.army ?? [])
        : [];
  const label = q?.encounterLabel ?? site?.guard?.label ?? 'Encounter';
  const reward = site?.guard?.reward;
  // Much weaker neutrals join for free or flee (scenario feature; proposed 2026-10-02).
  const reaction = hero ? quoteNeutralReaction(catalog, state, heroId, dest) : null;
  const attack = () => {
    store.closeOverlay();
    store.dispatch({ kind: 'MoveHero', heroId, destination: dest, confirmEncounter: true });
  };
  const react = (choice: 'join' | 'release') => {
    store.closeOverlay();
    const names = (reaction?.stacks ?? []).map((s) => `${s.count} ${s.count === 1 ? catalog.creatures[s.creatureId]?.name : catalog.creatures[s.creatureId]?.pluralName}`).join(', ');
    if (!store.dispatch({ kind: 'MoveHero', heroId, destination: dest, confirmEncounter: true, encounterChoice: choice })) {
      store.toast(choice === 'join' ? `${names} joined ${hero?.name}.` : `The ${label.toLowerCase()} fled from ${hero?.name}. The way is clear.`, 'success');
    }
  };
  return (
    <Modal
      title={reaction?.kind === 'join' ? `${label} — they offer to join you` : reaction?.kind === 'flee' ? `${label} — they flee from you` : town ? `Besiege ${town.name}?` : `Attack ${label}?`}
      onClose={() => store.closeOverlay()}
      width={reaction?.kind ? '62rem' : '54rem'}
      testId="encounter"
      footer={
        <>
          <Button icon="retreat" onClick={() => store.closeOverlay()} data-testid="encounter-withdraw">
            Withdraw
          </Button>
          <span className="grow" />
          {reaction?.kind === 'join' ? (
            <Button variant="primary" size="large" icon="check" onClick={() => react('join')} autoFocus data-testid="encounter-join">
              Accept them
            </Button>
          ) : null}
          {reaction?.kind ? (
            <Button size="large" onClick={() => react('release')} autoFocus={reaction.kind === 'flee'} data-testid="encounter-release">
              Let them go
            </Button>
          ) : null}
          <Button variant="danger" size="large" icon="attack" onClick={attack} autoFocus={!reaction?.kind} data-testid="encounter-attack">
            {reaction?.kind ? 'Fight anyway' : 'Attack'}
          </Button>
        </>
      }
    >
      {reaction?.kind ? (
        <p className="success" data-testid="neutral-offer">
          {reaction.kind === 'join'
            ? `Your army is far stronger. These creatures would rather join ${hero?.name} — for free — than fight. Accepting adds them to the army; letting them go leaves the way clear. Either way you keep the reward, but no experience is gained.`
            : `Your army is far stronger. These creatures will flee rather than fight. Letting them go leaves the way clear and keeps the reward, but gains no experience.`}
        </p>
      ) : null}
      <p className="encounter-lead">
        {reaction?.kind ? 'If you fight anyway, ' : ''}
        {hero?.name} will engage {enemyHero ? `${enemyHero.name}’s army` : `the ${label.toLowerCase()}`}
        {site ? ` at ${site.name}` : ''}. A checkpoint is saved before the battle begins.
      </p>
      <div className="encounter-versus">
        <section className="encounter-side encounter-side--mine" aria-label="Your army">
          <header className="encounter-side__head">
            {hero ? <HeroPortrait catalog={catalog} definitionId={hero.definitionId} name={hero.name} size="3.4rem" /> : null}
            <div>
              <div className="encounter-side__label">Your army</div>
              <div className="encounter-side__name">{hero?.name}</div>
            </div>
          </header>
          <div className="encounter-army">
            {(hero ? armyStacks(hero.army) : []).map((s, i) => (
              <div key={i} className="encounter-army__stack">
                <CreaturePortrait catalog={catalog} creatureId={s.creatureId} size="3.6rem" count={s.count} />
                <div className="encounter-army__name">{catalog.creatures[s.creatureId]?.pluralName}</div>
              </div>
            ))}
          </div>
        </section>
        <div className="encounter-vs" aria-hidden="true">
          <Icon name="attack" className="encounter-vs__icon" />
          <span>VS</span>
        </div>
        <section className="encounter-side encounter-side--foe" aria-label={town ? 'Defenders' : 'Opponent'}>
          <header className="encounter-side__head">
            {enemyHero ? (
              <HeroPortrait catalog={catalog} definitionId={enemyHero.definitionId} name={enemyHero.name} size="3.4rem" />
            ) : (
              <span className="encounter-side__glyph">
                <Icon name={town ? 'town' : 'bestiary'} />
              </span>
            )}
            <div>
              <div className="encounter-side__label">{town ? 'Defenders' : enemyHero ? 'Enemy hero' : 'Guards'}</div>
              <div className="encounter-side__name">{town ? town.name : (enemyHero?.name ?? site?.guard?.commander?.name ?? label)}</div>
            </div>
          </header>
          <div className="encounter-army">
            {army.map((s, i) => (
              <div key={i} className="encounter-army__stack">
                <CreaturePortrait catalog={catalog} creatureId={s.creatureId} size="3.6rem" count={s.count} />
                <div className="encounter-army__name">{catalog.creatures[s.creatureId]?.pluralName}</div>
              </div>
            ))}
          </div>
          {town && enemyHero ? <div className="encounter-side__note">Led by {enemyHero.name}</div> : !enemyHero && site?.guard?.commander ? <div className="encounter-side__note">Commander: {site.guard.commander.name}</div> : null}
        </section>
      </div>
      {town ? (
        <div className="encounter-note siege-brief" data-testid="siege-brief">
          <p>
            <strong>Siege.</strong> {FORT_TEXT[level] ?? FORT_TEXT[0]} Your Catapult removes one structure point at the start of every round; Cyclopes can batter the walls instead of shooting. Shots into the town across an intact wall deal half damage.
          </p>
          <p className="faint">The defender fights with at most seven stacks and cannot retreat or surrender. Winning captures {town.name}. Temporary siege model; values are proposed.</p>
        </div>
      ) : null}
      {reward?.resources || reward?.artifactIds?.length ? (
        <div className="encounter-reward">
          <span className="encounter-reward__label">Reward on victory</span>
          <CostList cost={reward.resources ?? {}} empty="" />
          {(reward.artifactIds ?? []).map((a) => (
            <span key={a} className="encounter-reward__artifact">
              {catalog.artifacts[a] ? <ArtifactIcon iconAssetId={catalog.artifacts[a]!.iconAssetId} kind={catalog.artifacts[a]!.slot} size="1.6rem" rarity={catalog.artifacts[a]!.rarity} /> : null}
              {catalog.artifacts[a]?.name}
            </span>
          ))}
        </div>
      ) : null}
    </Modal>
  );
}

function ActivateDialog({ heroId, siteId }: { heroId: string; siteId: string }) {
  const store = useStore();
  const catalog = store.catalog;
  const state = store.session!.state;
  const q = quoteActivation(catalog, state, heroId, siteId);
  const def = missionSite(catalog, state, siteId);
  const kind = def?.kind.type === 'activation' ? def.kind : null;
  return (
    <Modal
      title={def?.name ?? 'Activate'}
      onClose={() => store.closeOverlay()}
      width="34rem"
      testId="activate"
      footer={
        <>
          <Button onClick={() => store.closeOverlay()}>Not now</Button>
          <span className="grow" />
          <Button
            variant="primary"
            icon="beacon"
            disabled={!q.legal}
            disabledReason={q.reason}
            onClick={() => {
              store.closeOverlay();
              store.dispatch({ kind: 'ActivateSite', heroId, siteId });
            }}
            data-testid="activate-confirm"
          >
            {kind?.label === 'relay' ? 'Restore relay' : 'Light the beacon'}
          </Button>
        </>
      }
    >
      <p>{kind?.confirmText ?? def?.description}</p>
      <div className="row gap">
        Cost: <CostList cost={q.cost} wallet={state.players[store.session!.humanPlayerId]?.wallet} />
      </div>
      {!q.legal ? <p className="warn">{q.reason}</p> : null}
      {kind?.completesMission ? <p className="note small">This completes the mission once every required objective is met.</p> : null}
    </Modal>
  );
}

function StackInfoDialog({ creatureId, count }: { creatureId: string; count?: number }) {
  const store = useStore();
  const catalog = store.catalog;
  const def = catalog.creatures[creatureId];
  if (!def) return null;
  return (
    <Modal
      title={`${count !== undefined ? `${count} ` : ''}${count === 1 || count === undefined ? def.name : def.pluralName}`}
      onClose={() => store.closeOverlay()}
      width="34rem"
      testId="stack-info"
      footer={
        <>
          <span className="grow" />
          <Button
            icon="bestiary"
            onClick={() => {
              store.closeOverlay();
              store.goto('unit-detail', { creatureId });
            }}
          >
            Bestiary
          </Button>
        </>
      }
    >
      <div className="row gap">
        <CreaturePortrait catalog={catalog} creatureId={creatureId} size="6rem" showPlaceholderTag />
        <div className="grow">
          <div className="dim">
            Tier {def.tier} · {def.roleLabel}
          </div>
          <CreatureStats def={def} />
        </div>
      </div>
      {def.abilityIds.length ? (
        <>
          <SectionTitle>Abilities</SectionTitle>
          {def.abilityIds.map((a) => (
            <div key={a} className="small">
              <AbilityBadge catalog={catalog} abilityId={a} size="1.1rem" /> <strong>{catalog.abilities[a]?.name}:</strong> {catalog.abilities[a]?.exactRule}
            </div>
          ))}
        </>
      ) : null}
      {abilityRules(catalog, creatureId).length === 0 && def.abilityIds.length === 0 ? <p className="dim small">No special abilities.</p> : null}
    </Modal>
  );
}

// ---------------------------------------------------------------------------

export function OverlayLayer() {
  const store = useStore();
  const top = store.overlays[store.overlays.length - 1];
  if (!top) return null;
  switch (top.kind) {
    case 'pause':
      return <PauseMenu />;
    case 'save-load':
      return <SaveLoadDialog key={top.mode} mode={top.mode} />;
    case 'confirm':
      return <ConfirmDialog o={top} />;
    case 'briefing':
      return store.session ? <BriefingDialog /> : null;
    case 'debrief':
      return store.session ? <DebriefDialog final={false} /> : null;
    case 'campaign-complete':
      return store.session ? <DebriefDialog final /> : null;
    case 'mission-failed':
      return store.session ? <MissionFailedDialog /> : null;
    case 'help':
      return <HelpDialog topicId={top.topicId} />;
    case 'transfer':
      return store.session ? <TransferDialog o={top} /> : null;
    case 'encounter':
      return store.session ? <EncounterDialog heroId={top.heroId} dest={top.dest} /> : null;
    case 'activate':
      return store.session ? <ActivateDialog heroId={top.heroId} siteId={top.siteId} /> : null;
    case 'stack-info':
      return <StackInfoDialog creatureId={top.creatureId} count={top.count} />;
    case 'spellbook': {
      const caster = top.caster ?? store.session?.state.heroes[top.heroId];
      const cast = top.cast;
      return store.session && caster ? (
        <SpellBook
          catalog={store.catalog}
          hero={caster}
          onClose={() => store.closeOverlay()}
          cast={
            cast
              ? {
                  ...cast,
                  onCast: (spellId) => {
                    store.closeOverlay();
                    cast.onCast(spellId);
                  },
                }
              : undefined
          }
        />
      ) : null;
    }
    case 'handoff':
      return store.session ? <HandoffDialog playerId={top.playerId} /> : null;
    case 'camp':
      return store.session ? <CampDialog key={top.siteId} heroId={top.heroId} siteId={top.siteId} /> : null;
    case 'map-event':
      return store.session ? <MapEventDialog heroId={top.heroId} siteId={top.siteId} /> : null;
    case 'chest':
      return store.session ? <ChestDialog heroId={top.heroId} siteId={top.siteId} /> : null;
    case 'quest-hut':
      return store.session ? <QuestHutDialog heroId={top.heroId} siteId={top.siteId} /> : null;
    case 'interventions':
      return store.session ? <InterventionsDialog /> : null;
    case 'game-over':
      return store.session ? <GameOverDialog /> : null;
    case 'shortcuts':
      return <ShortcutsDialog />;
  }
}
