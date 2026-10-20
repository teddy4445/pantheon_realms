import { CheatConsole } from './CheatConsole';
/**
 * Modal flows: pause, save/load, confirmation, mission briefing/debrief,
 * mission failed, campaign complete, help, army exchange, pre-battle
 * encounter, beacon activation and stack details.
 *
 * Dialogs submit commands or session transitions; they never edit state.
 */
import { useEffect, useId, useRef, useState } from 'react';
import {
  abilityRules,
  climateRuleFor,
  maxMana,
  quoteNeutralReaction,
  manualBattlesRequired,
  armyStacks,
  hexEquals,
  missionObjectiveDefs,
  missionSite,
  missionText,
  quoteActivation,
  quoteMovement,
  quoteTransfer,
  siegeTownAt,
  siteAt,
  enemyCaravanAt,
  townFortificationLevel,
  type ArmyRef,
  type ArmyState,
  type ContentCatalog,
  type HeroState,
  type HexCoord,
  type ObjectiveCondition,
  requireScenarioMission,
  scenarioMission,
} from '@pr/rules';
import { useStore } from '../app/context';
import { endOfGameSplash } from '../components/moments';
import { SeaEncounterCards } from '../components/seaCreatures';
import type { AppStore, Overlay } from '../app/store';
import { AUTO_SLOTS, CHECKPOINT_SLOT, MANUAL_SLOTS, type SlotInfo } from '../app/saves';
import { Button, Chip, MenuButton, Modal, QuantitySelector, SectionTitle, useModalFocus } from '../components/kit';
import { ArtifactIcon, CreaturePortrait, Emblem, HeroPortrait, MissionThumb, SceneArt, SpeakerPortrait, speakerBust } from '../components/art';
import { encounterKitArt, townBackground } from '../assets/manifest';
import { RewardDialog } from '../components/rewards';
import { AdventureStage, HeroFigure, TownThumbnail, encounterScene, townScene } from '../components/adventure';
import { guiThemeFor } from '../assets/guiArt';
import { useArtState } from '../components/gui';
import { ClimateChip } from '../components/climate';
import { ArmyStrip, CostList, CreatureStats } from '../components/game';
import { Icon } from '../assets/icons';
import { DialogueLines } from '../screens/Journal';
import { relativeTime } from '../app/view';
import { ArtIcon, EmptyArchive, artUrl } from '../components/frontend';
import { CampDialog, ChestDialog, GameOverDialog, HandoffDialog, InterventionsDialog, MapEventDialog, QuestHutDialog, ShortcutsDialog, SluiceDialog } from './WorldDialogs';
import { SpellBook } from '../components/spellbook';
import { AbilityBadge } from '../components/badges';
import { QuickBattlePanel, useQuickBattlePreview } from './QuickBattle';
import { currentIntelView, intelOn } from '../app/intel';
import { ArmyIntelPanel } from '../components/armyIntel';
import { missionIntro } from '../app/missionLedger';
import { IntroChapterFacts, LedgerIcon, ManualBattleNotice, introCoverArt } from '../components/missionLedger';
import { contentVersionOf } from '@pr/session';
import { campaignEpilogue, carryoverLines, chapterFacts, chapterTitle, chronicleModel, defaultSelection, saveRunInfo, type ChronicleNode } from '../app/chronicle';
import { BRANCH_ICON, Chronicle, SaveRunTags } from '../components/chronicle';
import { ActorPickerDialog, CaravanArrivalDialog, CaravanDispatchDialog, CaravanTrackerDialog } from '../components/caravans';
import { caravanFullCargo, caravanIntelView } from '../app/caravans';

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
          label={session?.state.standalone ? "Rematch" : "Restart Mission"}
          disabled={!session}
          onClick={() =>
            session?.state.standalone ? store.confirm('Restart this battle?', 'Restore both armies and the battlefield to their starting state?', 'Rematch', () => store.startSingleBattle(session.state.standalone!.spec)) : store.confirm('Restart this mission?', 'The mission restarts from its recorded starting state. Progress in this attempt is lost unless saved.', 'Restart', () => {
              store.closeAllOverlays();
              session!.restartMission();
              store.resetTo('adventure');
              store.openOverlay({ kind: 'briefing' });
            }, { danger: true })
          }
        />
        {session?.state.standalone ? <MenuButton icon="settings" label="Edit battle setup" onClick={() => store.confirm("Edit setup?", "Leave this battle and return to its original setup. Save first to keep the fight in progress.", "Edit setup", () => store.editSingleBattle())} /> : null}
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
  const defaultName = session ? session.state.standalone ? `${session.state.scenario.name} — Round ${session.state.battle?.round ?? session.state.lastBattleResult?.rounds ?? 0}` : `${scenarioMission(store.catalog, session.state)?.name ?? 'Game'} — Day ${session.state.day}` : '';
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
  // Campaign content version, actual chapter and branch (derived from the snapshot for saves written before those fields).
  const selRun = sel ? saveRunInfo(store.catalog, sel.metadata, sel.envelope?.snapshot) : null;
  // Saved Journeys (1.1.0 handoff screen 10): manual slots, then the rotating autosaves and the pre-battle checkpoint (load only).
  const groups: { id: string; title: string; slots: readonly string[] }[] =
    mode === 'save'
      ? [{ id: 'manual', title: 'Manual saves', slots: MANUAL_SLOTS }]
      : [
          { id: 'manual', title: 'Manual saves', slots: MANUAL_SLOTS },
          { id: 'auto', title: 'Autosaves', slots: AUTO_SLOTS },
          { id: 'checkpoint', title: 'Checkpoint', slots: [CHECKPOINT_SLOT] },
        ];
  // Only a list that was read and holds nothing is "empty"; reading, unavailable and failed storage say so instead.
  const archiveEmpty = mode === 'load' && slots !== null && !error && slots.length === 0;
  const missionOf = (x: SlotInfo | undefined) => x?.envelope?.snapshot.match.mission.missionId ?? null;
  // A generated mission (random map) is not in the catalog: its own card is the thumbnail (naval types: their painting).
  const thumbOf = (x: SlotInfo | undefined) => x?.envelope?.snapshot.match.customMission?.thumbnailAssetId;
  const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString() : '');
  return (
    <Modal
      title="Saved Journeys"
      onClose={() => store.closeOverlay()}
      width="62rem"
      testId="save-load"
      surface="parchment"
      footer={
        <>
          <div className="tabs" role="tablist" aria-label="Save or load">
            <button type="button" role="tab" className="tab" aria-selected={mode === 'save'} onClick={() => setMode('save')} disabled={!session} title={session ? undefined : 'Start or load a game to save it'}>
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
      {error ? (
        <p className="note danger" role="alert">
          Saves are unavailable: {error}
        </p>
      ) : null}
      {slots === null ? (
        <p className="dim" role="status">
          Reading saves…
        </p>
      ) : null}
      {archiveEmpty ? (
        <EmptyArchive title="No saved journeys yet" testId="save-empty">
          Your saves, the three autosaves written at dawn and the checkpoint written before every battle will be kept here. To bring in a save file from elsewhere, use Import… below.
        </EmptyArchive>
      ) : (
        <div className="save-layout fe-saves">
          <div className="save-list fe-saves__list" role="listbox" aria-label="Save slots">
            {groups.map((g) => (
              <div key={g.id} role="group" aria-labelledby={`save-group-${g.id}`} className="fe-saves__group">
                <div className="fe-saves__heading" id={`save-group-${g.id}`}>
                  {g.title}
                </div>
                {g.slots.map((id) => {
                  const s = byId.get(id);
                  const kindLabel = id.startsWith('auto') ? `Autosave ${id.split('-')[1]}` : id === CHECKPOINT_SLOT ? 'Before battle' : `Slot ${id.split('-')[1]}`;
                  const mission = missionOf(s);
                  const run = s ? saveRunInfo(store.catalog, s.metadata, s.envelope?.snapshot) : null;
                  return (
                    <button
                      key={id}
                      type="button"
                      role="option"
                      aria-selected={selected === id}
                      className={`save-row fe-save-row ${selected === id ? 'is-selected' : ''} ${s ? '' : 'is-empty'}`}
                      onClick={() => setSelected(id)}
                      data-testid={`save-${id}`}
                    >
                      <span className="fe-save-row__thumb" aria-hidden="true">
                        {mission ? <MissionThumb catalog={store.catalog} missionId={mission} assetId={thumbOf(s)} style={{ width: '100%', height: '100%' }} /> : <span className="fe-save-row__laurel" />}
                      </span>
                      <span className="fe-save-row__text">
                        <span className="save-row__kind">{kindLabel}</span>
                        <span className="save-row__name">{s ? s.name : 'Empty slot'}</span>
                        {s?.metadata ? (
                          <span className="save-row__meta small">
                            {s.metadata.pantheonName} · Day {s.metadata.day} · {s.metadata.heroName} Lv {s.metadata.heroLevel}
                          </span>
                        ) : null}
                        {run?.version ? <SaveRunTags info={run} testId={`save-${id}-run`} /> : null}
                      </span>
                      {s ? (
                        s.compatibility.status === 'ok' ? (
                          <span className="fe-save-row__when small" title={when(s.savedAt)}>
                            {relativeTime(s.savedAt)}
                          </span>
                        ) : (
                          <span className="fe-save-row__when">
                            <Chip tone="bad" title={s.compatibility.reason}>
                              {s.compatibility.status}
                            </Chip>
                          </span>
                        )
                      ) : null}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
          <div className="save-detail fe-saves__detail" aria-live="polite">
            {selected ? (
              <>
                {missionOf(sel) ? (
                  <figure className="fe-saves__art">
                    <MissionThumb catalog={store.catalog} missionId={missionOf(sel)!} assetId={thumbOf(sel)} style={{ width: '100%', height: '100%' }} />
                    <figcaption>Illustration of the mission — not a picture of the saved game</figcaption>
                  </figure>
                ) : null}
                {sel ? (
                  <>
                    <div className="save-detail__name">{sel.name}</div>
                    {sel.metadata ? (
                      <dl className="fe-saves__facts">
                        <div>
                          <dt>{sel.metadata.campaignName ? 'Campaign' : 'Scenario'}</dt>
                          <dd>{sel.metadata.campaignName ?? sel.metadata.scenarioName}</dd>
                        </div>
                        {selRun?.version ? (
                          <>
                            <div>
                              <dt>Version</dt>
                              <dd data-testid="save-detail-version">{selRun.versionLabel}</dd>
                            </div>
                            <div>
                              <dt>{selRun.version === 2 ? 'Chapter' : 'Mission'}</dt>
                              <dd data-testid="save-detail-progress">
                                {selRun.version === 2 ? (selRun.progress ?? sel.metadata.missionName) : `${selRun.progress ? `${selRun.progress} — ` : ''}${sel.metadata.missionName}`}
                              </dd>
                            </div>
                            <div>
                              <dt>Run</dt>
                              <dd data-testid="save-detail-branch">
                                {selRun.branchLabel ? `${selRun.branchLabel} — kept apart from the campaign's own progress` : 'Primary run'}
                                {selRun.completed ? ' · campaign complete' : ''}
                              </dd>
                            </div>
                          </>
                        ) : (
                          <div>
                            <dt>Mission</dt>
                            <dd>{sel.metadata.missionName}</dd>
                          </div>
                        )}
                        <div>
                          <dt>Day</dt>
                          <dd>
                            Day {sel.metadata.day} — week {sel.metadata.week}, day {sel.metadata.dayOfWeek}
                          </dd>
                        </div>
                        {sel.metadata.heroName ? <div>
                          <dt>Hero</dt>
                          <dd>
                            {sel.metadata.heroName}, level {sel.metadata.heroLevel}
                          </dd>
                        </div> : null}
                        <div>
                          <dt>Pantheon</dt>
                          <dd>{sel.metadata.pantheonName}</dd>
                        </div>
                        <div>
                          <dt>Saved</dt>
                          <dd>{when(sel.savedAt) || '—'}</dd>
                        </div>
                        <div>
                          <dt>File</dt>
                          <dd className="faint">
                            {sel.metadata.branch} · rules {sel.metadata.rulesVersion} · {Math.round(sel.bytes / 1024)} KB
                          </dd>
                        </div>
                      </dl>
                    ) : null}
                    {sel.compatibility.status !== 'ok' ? (
                      <p className="danger small" data-testid="save-incompatible">
                        {sel.compatibility.reason}. The file is kept unchanged.
                      </p>
                    ) : null}
                  </>
                ) : (
                  <p className="dim">Empty slot.</p>
                )}
                {canSave && MANUAL_SLOTS.includes(selected as (typeof MANUAL_SLOTS)[number]) ? (
                  <div className="fe-saves__save">
                    <label className="field__label" htmlFor="save-name">
                      Name
                    </label>
                    <input id="save-name" className="input" value={name} placeholder={defaultName} maxLength={60} onChange={(e) => setName(e.target.value)} />
                    <Button
                      variant="primary"
                      block
                      onClick={() => (sel ? store.confirm('Overwrite this save?', `“${sel.name}” will be replaced by the current game.`, 'Overwrite', () => void doSave(selected), { danger: true }) : void doSave(selected))}
                      data-testid="save-confirm"
                    >
                      {sel ? 'Overwrite' : 'Save here'}
                    </Button>
                  </div>
                ) : null}
                {mode === 'load' && sel ? (
                  <Button
                    variant="primary"
                    block
                    disabled={sel.compatibility.status !== 'ok'}
                    disabledReason={sel.compatibility.status === 'ok' ? null : sel.compatibility.reason}
                    onClick={() => (session ? store.confirm('Load this save?', 'Unsaved progress in the current game will be lost.', 'Load', () => void doLoad(selected), { danger: true }) : void doLoad(selected))}
                    data-testid="load-confirm"
                  >
                    Load
                  </Button>
                ) : null}
                {sel ? (
                  <div className="row gap fe-saves__file">
                    <Button size="small" onClick={() => void store.saves.exportSave(sel.id, sel.name).then((ok) => store.toast(ok ? 'Exported' : 'Export cancelled'))}>
                      Export…
                    </Button>
                    <Button
                      size="small"
                      variant="danger"
                      onClick={() =>
                        store.confirm(
                          'Delete this save?',
                          `“${sel.name}” will be permanently deleted.`,
                          'Delete',
                          async () => {
                            await store.saves.remove(sel.id);
                            store.continueChecked = false;
                            setSelected(null);
                            void refresh();
                          },
                          { danger: true },
                        )
                      }
                    >
                      Delete
                    </Button>
                  </div>
                ) : null}
              </>
            ) : (
              <p className="dim fe-saves__hint">{mode === 'save' ? 'Choose a manual slot. Autosaves rotate automatically at dawn; a checkpoint is written before every battle.' : 'Choose a save to see its details.'}</p>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}

// ---------------------------------------------------------------------------

/**
 * The shared confirmation (1.1.0 handoff screen 14): a small parchment dialog
 * with the consequence in plain words. The safe action (Cancel, or the
 * screen's own wording such as "Keep editing") always takes the first focus,
 * so Enter or Space never confirms a destructive action by accident; Escape
 * cancels.
 */
function ConfirmDialog({ o }: { o: Extract<Overlay, { kind: 'confirm' }> }) {
  const store = useStore();
  return (
    <Modal
      title={o.title}
      onClose={() => store.closeOverlay()}
      width="30rem"
      testId="confirm"
      surface="parchment"
      compact
      footer={
        <>
          <span className="grow" />
          <Button onClick={() => store.closeOverlay()} data-autofocus="" data-testid="confirm-cancel">
            {o.cancelLabel ?? 'Cancel'}
          </Button>
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
      <div className={`confirm__lead ${o.danger ? 'confirm__lead--danger' : ''}`}>
        {/* Destructive choices carry the frontend kit's red wax seal (decorative; the words say what happens). */}
        {o.danger ? <ArtIcon id="frontendkit.icon.warning" className="confirm__seal" /> : null}
        <p className="confirm__body">{o.body}</p>
      </div>
      {o.content ?? null}
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

/** Objective → icon, from the objective's condition (presentation only; never from its wording). */
function objectiveIcon(cond: ObjectiveCondition): string {
  switch (cond.type) {
    case 'counter_at_least':
      return cond.counter.startsWith('recruited:') ? 'icon.ui.recruit' : cond.counter.startsWith('trained:') || cond.counter.startsWith('upgraded:') ? 'icon.ui.upgrade' : 'icon.ui.flag';
    case 'hero_army_contains':
      return 'icon.ui.recruit';
    case 'site_cleared':
    case 'hero_defeated':
      return 'icon.ui.sword2';
    case 'site_activated':
      return 'icon.ui.beacon';
    case 'player_has_minor_god':
      return 'icon.ui.gift';
    case 'all':
    case 'any':
      return cond.conditions[0] ? objectiveIcon(cond.conditions[0]) : 'icon.ui.flag';
    default:
      return 'icon.ui.flag';
  }
}

/**
 * Scenario introduction (1.1.0 encounter scene): the mission's painting dimmed
 * behind an unrolled parchment scroll (a separate, non-interactive picture; the
 * live content stays inside its safe rectangle between the rollers). Header:
 * campaign and mission order (or Skirmish / Random map), the mission's name and
 * subtitle, the player's emblem, and the mission facts. Left: the mission
 * illustration and the protagonist. Right: the summary and every visible
 * objective (locked ones stay hidden) with an icon from its condition, its
 * optional label and its current status; the list scrolls. Bottom: the
 * briefing lines with their real speakers, Back / Next, and Begin — which only
 * closes the briefing (the game was created before it opened). On narrow
 * screens the same content stacks on a plain parchment page.
 */
function BriefingDialog() {
  const store = useStore();
  const state = store.session!.state;
  const catalog = store.catalog;
  const playerId = store.session!.humanPlayerId;
  const mission = requireScenarioMission(catalog, state);
  const objectives = missionObjectiveDefs(catalog, state).filter((o) => state.mission.objectives[o.id]?.status !== 'locked');
  const campaign = mission.campaignId ? catalog.campaigns[mission.campaignId] : undefined;
  // The briefing for the facts in hand (content v2 adds the variants that match earlier chapters).
  const intro = missionIntro(catalog, state, mission);
  const lines = intro.lines;
  const [index, setIndex] = useState(0);
  const line = lines[Math.min(index, Math.max(0, lines.length - 1))];
  const art = introCoverArt(intro, mission.thumbnailAssetId);
  const template = catalog.mapTemplates[mission.mapTemplateId];
  // Content v2 chapters are numbered by the chapter graph ("Chapter 3"), v1 missions by their order.
  const chapterNo = campaign?.chapters?.find((c) => c.missionId === mission.id)?.chapter;
  const kicker = campaign ? `${campaign.name} · ${chapterNo ? `Chapter ${chapterNo}` : `Mission ${mission.order}`}` : state.customMission ? 'Random map' : 'Skirmish';
  const last = index >= lines.length - 1;
  const scroll = encounterKitArt('encounterkit.intro.scroll')?.url ?? null;
  // Until the scroll is decoded (or if it cannot load), the writing area is plain paper (GUI audit 1.1.2).
  const scrollArt = useArtState(scroll);
  const pantheonId = state.players[playerId]?.pantheonId;
  // The protagonist: the campaign's hero when present, else the player's first hero.
  const heroes = Object.values(state.heroes).filter((h) => h.ownerId === playerId && h.status === 'active');
  const lead = (campaign ? heroes.find((h) => h.definitionId === campaign.heroDefinitionId) : undefined) ?? heroes[0];
  const ref = useRef<HTMLDivElement>(null);
  const trap = useModalFocus(ref);
  const titleId = useId();
  const difficulty = state.scenario.difficultyId ? catalog.difficulties?.[state.scenario.difficultyId] : undefined;
  const statusLabel: Record<string, string> = { completed: 'Done', failed: 'Failed' };
  return (
    <div className="briefing-scene brief" role="dialog" aria-modal="true" aria-labelledby={titleId} data-testid="briefing" ref={ref} onKeyDown={trap}>
      <SceneArt art={art} scrim="full" fallback={<MissionThumb catalog={catalog} missionId={mission.id} assetId={mission.thumbnailAssetId} style={{ width: '100%', height: '100%', border: 0, borderRadius: 0 }} />} />
      <div className={`brief__scroll ${scroll ? 'has-art' : ''}`} data-art={scrollArt}>
        {scroll ? <img className="brief__paper" src={scroll} alt="" aria-hidden="true" draggable={false} decoding="async" /> : null}
        <div className="brief__safe">
          <header className="brief__head">
            {pantheonId ? (
              <span className="brief__emblem" aria-hidden="true">
                <Emblem catalog={catalog} pantheonId={pantheonId} size="100%" />
              </span>
            ) : null}
            <div className="brief__titles">
              <div className="brief__kicker briefing-scene__kicker">{kicker}</div>
              <h1 className="brief__title briefing-scene__title" id={titleId}>
                {mission.name}
              </h1>
              <div className="brief__subtitle briefing-scene__subtitle">{mission.subtitle}</div>
            </div>
            <p className="brief__facts" data-testid="briefing-facts">
              {mission.targetPlaytime}
              {template ? ` · ${template.width}×${template.height} map` : ''}
              {difficulty ? ` · ${difficulty.name} difficulty` : ''}
            </p>
          </header>
          <div className="brief__body">
            <div className="brief__left">
              <figure className="brief__art">
                {art ? <img src={art.url} alt={`${mission.name} — mission illustration`} draggable={false} decoding="async" /> : <MissionThumb catalog={catalog} missionId={mission.id} assetId={mission.thumbnailAssetId} style={{ width: '100%', height: '100%' }} />}
              </figure>
              {lead ? (
                <div className="brief__hero">
                  <HeroPortrait catalog={catalog} definitionId={lead.definitionId} portraitAssetId={lead.portraitAssetId} name={lead.name} size="3.2rem" />
                  <span>
                    <span className="brief__label">Your hero</span>
                    <span className="brief__hero-name">{lead.name}</span>
                  </span>
                </div>
              ) : null}
              {intro.v2 && intro.manualBattles ? <ManualBattleNotice className="brief__manual" /> : null}
            </div>
            <section className={`brief__right ${intro.v2 ? 'brief__right--v2' : ''}`} aria-label="Mission objectives" tabIndex={intro.v2 ? 0 : undefined}>
              <p className="brief__summary briefing-scene__summary">{mission.summary}</p>
              {intro.v2 ? <IntroChapterFacts intro={intro} optionalCount={mission.objectives.filter((o) => o.category === 'optional').length} /> : null}
              {intro.v2 ? null : <h2 className="brief__obj-title">Your objectives</h2>}
              {intro.v2 ? null : (
              <ul className="brief__objectives" tabIndex={0} aria-label="Objectives">
                {objectives.map((o) => {
                  const st = state.mission.objectives[o.id]?.status;
                  return (
                    <li key={o.id} className={`brief__objective ${st === 'completed' ? 'is-done' : st === 'failed' ? 'is-failed' : ''}`}>
                      <ArtIcon id={objectiveIcon(o.condition)} glyph="flag" className="brief__obj-icon" />
                      <span className="brief__obj-text">
                        <span className="brief__obj-name">
                          {o.title}
                          {o.category === 'optional' ? <span className="brief__optional">Optional</span> : null}
                          {st && statusLabel[st] ? <span className="brief__state">{statusLabel[st]}</span> : null}
                        </span>
                        <span className="brief__obj-desc">{missionText(catalog, state, o.description)}</span>
                      </span>
                    </li>
                  );
                })}
              </ul>
              )}
              {mission.newDecisions.length ? (
                <details className="brief__details">
                  <summary>New in this mission</summary>
                  <ul className="bullets small">
                    {mission.newDecisions.map((d) => (
                      <li key={d}>{d}</li>
                    ))}
                  </ul>
                </details>
              ) : null}
            </section>
          </div>
          <footer className="brief__foot">
            {line ? (
              <div className="brief__line">
                <SpeakerPortrait catalog={catalog} line={line} size="3rem" />
                <div className="brief__line-text">
                  <div className="brief__speaker">{line.speaker}</div>
                  <p aria-live="polite">{line.text}</p>
                </div>
              </div>
            ) : (
              <span className="grow" />
            )}
            <div className="brief__nav">
              {lines.length > 1 ? (
                <span className="small brief__count">
                  {index + 1} / {lines.length}
                </span>
              ) : null}
              {index > 0 ? (
                <Button size="small" variant="ghost" onClick={() => setIndex((i) => i - 1)} data-testid="briefing-prev">
                  Back
                </Button>
              ) : null}
              {line && !last ? (
                <Button size="small" onClick={() => setIndex((i) => i + 1)} data-testid="briefing-next">
                  Next
                </Button>
              ) : null}
              <Button variant="primary" size="large" onClick={() => store.closeOverlay()} data-autofocus="true" data-testid="briefing-begin">
                Begin
              </Button>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}

/**
 * The mission result (screen spec `result`). Content v2 runs: the chapter's
 * outcome and summary, what it leaves behind (the facts it recorded, named by
 * its evidence entries) and the bounded hero carry-over, then the chronicle
 * with the next choice — one available chapter is a Continue, two (a pair
 * played in either order) are a choice of both, each through the campaign
 * state machine (`continueToNextMission(id)`); completed chapters can be
 * replayed as practice (the primary run is kept and restored exactly). The
 * final chapter completes the campaign with the v2 epilogue. A practice
 * replay's result never continues the campaign: it offers to return to it.
 * Content v1 runs keep their linear Continue.
 */
function DebriefDialog({ final }: { final: boolean }) {
  const store = useStore();
  const session = store.session!;
  const catalog = store.catalog;
  const state = session.state;
  const mission = requireScenarioMission(catalog, state);
  const campaign = session.campaign;
  const record = campaign?.completions.find((c) => c.missionId === mission.id);
  const campDef = campaign ? catalog.campaigns[campaign.campaignId] : undefined;
  const v2 = !!campaign && contentVersionOf(campaign) === 2;
  const practice = campaign?.branch === 'practice';
  const next = !practice && session.hasNextMission();
  // v2: the chapters the state machine offers next; v1: the next mission in order.
  const choices = v2 && next ? session.availableChapters() : [];
  const nextMission = !v2 && next && campaign ? catalog.missions[catalog.campaigns[campaign.campaignId]!.missionIds[mission.order] ?? ''] : undefined;
  // The chronicle shows the primary run: the session's own, or the one kept while a practice replay is played.
  const primary = practice ? (store.practiceReturn?.campaign ?? null) : campaign;
  const model = v2 && campDef && primary ? chronicleModel(catalog, campDef.id, primary, { practiceMissionId: practice ? campaign!.currentMissionId : null, allowPractice: !practice }) : null;
  const [selected, setSelected] = useState<string | null>(() => (model ? (choices[0] ?? defaultSelection(model)) : null));
  const epilogue = final && campDef ? campaignEpilogue(campDef, campaign, state.mission.flags).lines : [];
  const facts = v2 && record ? chapterFacts(catalog, mission, record) : [];
  const carry = v2 && record ? carryoverLines(catalog, record) : [];
  const continueTo = (id?: string) => store.continueCampaign(id);
  const offerPractice = (node: ChronicleNode) =>
    store.confirm(
      `Replay chapter ${node.chapter} as practice?`,
      `You play “${node.name}” again from the start it had in your campaign. Nothing you do there changes your campaign: no progress, facts or rewards carry over. When it ends you come back here with your campaign exactly as it is now.`,
      'Start practice',
      () => void store.startPracticeReplay(node.missionId),
    );
  const title = final ? 'Campaign complete' : practice ? `Practice replay — ${mission.name}` : state.outcome.status === 'victory' ? `Victory — ${mission.name}` : mission.name;
  const unit = v2 ? 'Chapter' : 'Mission';
  return (
    <Modal
      title={title}
      width={next || v2 ? '70rem' : '56rem'}
      testId={final ? 'campaign-complete' : 'debrief'}
      splash={endOfGameSplash(state, session.humanPlayerId, final ? 'Campaign complete' : practice ? 'Practice complete' : state.outcome.status === 'victory' ? 'Victory' : 'Mission complete', final ? (campDef?.name ?? mission.name) : mission.name)}
      footer={
        // Main Menu, the summary and Continue on one line (owner request 2026-10-04); a pair of chapters takes its own row above.
        <div className={`debrief-actions ${choices.length > 1 ? 'debrief-actions--choice' : ''}`} data-testid="debrief-actions">
          {!practice && choices.length > 1 ? (
            <div className="debrief-choice" role="group" aria-labelledby="debrief-choice-label">
              <span className="debrief-actions__label" id="debrief-choice-label">
                Choose the next chapter
              </span>
              {choices.map((id) => (
                <Button key={id} variant="primary" artUrl={artUrl(BRANCH_ICON)} icon="play" onClick={() => continueTo(id)} data-testid={`debrief-choose-${id}`}>
                  {chapterTitle(catalog, id)}
                </Button>
              ))}
            </div>
          ) : null}
          <Button onClick={() => toMainMenu(store)}>Main Menu</Button>
          <Button
            onClick={() => {
              store.closeAllOverlays();
              store.goto('summary', { returnTo: final ? 'campaign-complete' : 'debrief' });
            }}
            data-testid="debrief-summary"
          >
            {final ? 'Campaign summary' : practice ? 'Practice summary' : `${unit} summary`}
          </Button>
          <span className="grow" />
          {practice ? (
            <Button
              variant="primary"
              size="large"
              icon="back"
              disabled={!store.practiceReturn}
              disabledReason="Your campaign is not held in this game: load one of its saves to go on with it"
              onClick={() => store.returnFromPractice()}
              data-testid="debrief-return"
            >
              Return to the campaign
            </Button>
          ) : choices.length > 1 ? null : next ? (
            <Button variant="primary" size="large" data-testid="debrief-continue" onClick={() => continueTo(choices[0])}>
              Continue to {v2 && choices[0] ? chapterTitle(catalog, choices[0]) : nextMission ? `Mission ${nextMission.order}: ${nextMission.name}` : 'next mission'}
            </Button>
          ) : null}
        </div>
      }
    >
      <DialogueLines lines={mission.victory} />
      {state.outcome.status === 'victory' ? <p className="success">{state.outcome.reason}</p> : null}
      {practice ? (
        <p className="note debrief-note" data-testid="debrief-practice">
          <Icon name="train" className="debrief-note__icon" /> Practice replay: nothing here changes your campaign — no progress, facts or rewards carry over.
          {store.practiceReturn ? ' Return to the campaign to go on with it.' : ''}
        </p>
      ) : null}
      {record ? (
        <>
          <SectionTitle>{unit} summary</SectionTitle>
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
                  Level {record.summary.heroLevel} · {record.summary.heroXp} XP {record.summary.xpCapped ? <Chip tone="warn">XP capped for this {unit.toLowerCase()}</Chip> : null}
                </td>
              </tr>
              <tr>
                <th>Gods</th>
                <td>{record.summary.chosenGodIds.map((g) => catalog.gods[g]?.name).join(', ') || '—'}</td>
              </tr>
            </tbody>
          </table>
          {v2 ? (
            <div className="debrief-left" data-testid="debrief-left-behind">
              <div>
                <SectionTitle>What this chapter leaves behind</SectionTitle>
                {facts.length ? (
                  <ul className="ledger-list" data-testid="debrief-facts">
                    {facts.map((f) => (
                      <li key={f.flag} className="ledger-item ledger-fact" data-testid={`debrief-fact-${f.flag}`}>
                        {f.icon ? <LedgerIcon icon={f.icon} size="1.7rem" /> : <Icon name="journal" className="ledger-item__glyph" />}
                        <div className="ledger-item__body">
                          <div className="ledger-item__title">{f.title}</div>
                          {f.text ? <div className="ledger-item__line">{f.text}</div> : null}
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="dim small" data-testid="debrief-facts-none">
                    No evidence or decision of this chapter is carried into the next ones.
                  </p>
                )}
              </div>
              <div>
                <SectionTitle>{final ? 'Your hero at the end' : 'Carried forward'}</SectionTitle>
                <dl className="debrief-carry" data-testid="debrief-carryover">
                  {carry.map((c) => (
                    <div key={c.label}>
                      <dt>{c.label}</dt>
                      <dd>{c.value}</dd>
                    </div>
                  ))}
                </dl>
                <ul className="bullets small">
                  {mission.debriefPolicy.map((d) => (
                    <li key={d}>{d}</li>
                  ))}
                  {final ? null : <li>Your army, towns and treasury stay in this chapter; the next chapter starts from its own.</li>}
                </ul>
              </div>
            </div>
          ) : (
            <>
              <SectionTitle>What carries forward</SectionTitle>
              <ul className="bullets small">
                {mission.debriefPolicy.map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
            </>
          )}
        </>
      ) : null}
      {final && epilogue.length ? (
        <>
          <SectionTitle>Epilogue</SectionTitle>
          <DialogueLines lines={epilogue} />
        </>
      ) : null}
      {model ? (
        <>
          <SectionTitle>{final ? 'The chronicle' : practice ? 'Your campaign' : choices.length > 1 ? 'Next — two chapters open' : 'Next chapter'}</SectionTitle>
          {choices.length > 1 ? (
            <p className="debrief-note" data-testid="debrief-branch-note">
              <ArtIcon id={BRANCH_ICON} glyph="swap" size="1.6rem" label="Branch" /> Both chapters are required; choose which to play first. The other stays open for afterwards.
            </p>
          ) : null}
          <Chronicle
            catalog={catalog}
            model={model}
            selectedId={selected}
            onSelect={setSelected}
            compact
            testId="debrief-chronicle"
            actions={(node) =>
              node.replayable ? (
                <Button size="small" icon="train" onClick={() => offerPractice(node)} data-testid={`practice-${node.missionId}`}>
                  Replay as practice
                </Button>
              ) : null
            }
          />
        </>
      ) : null}
      {final ? (
        <p className="note">
          You have completed {catalog.campaigns[campaign?.campaignId ?? '']?.name ?? 'the campaign'}. Thank you for playing.
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
          {/* A practice replay's defeat never touches the campaign: its kept run is one click away. */}
          {store.practiceReturn && session.campaign?.branch === 'practice' ? (
            <Button icon="back" onClick={() => store.returnFromPractice()} data-testid="failed-return">
              Return to the campaign
            </Button>
          ) : null}
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

/**
 * The hero meeting (1.1.0 encounter scene): the camp of the initiating hero's
 * pantheon (decorative scenery, not the tile), each real hero's painted bust
 * (portrait → bust; the same hero's portrait in a socket when no bust exists)
 * above their own troop strip, the exchange mark by the fire between them. With
 * a town, the right side is that town's garrison under its own painting and
 * name — never an invented castellan. The rules are the existing transfer:
 * select a stack (optionally a quantity), click a destination; the move is
 * quoted (quoteTransfer) and committed at once with one TransferStack. Cancel
 * clears the pending selection only; Done closes the meeting.
 */
function TransferDialog({ o }: { o: Extract<Overlay, { kind: 'transfer' }> }) {
  const store = useStore();
  const catalog = store.catalog;
  const state = store.session!.state;
  const playerId = store.session!.humanPlayerId;
  const hero = state.heroes[o.heroId];
  const other = o.otherHeroId ? state.heroes[o.otherHeroId] : undefined;
  const town = o.townId ? state.towns[o.townId] : undefined;
  const left: { ref: ArmyRef; label: string; army: ArmyState } | null = hero ? { ref: { kind: 'hero', heroId: hero.id }, label: hero.name, army: hero.army } : null;
  const right: { ref: ArmyRef; label: string; army: ArmyState } | null = other ? { ref: { kind: 'hero', heroId: other.id }, label: other.name, army: other.army } : town ? { ref: { kind: 'garrison', townId: town.id }, label: `${town.name} garrison`, army: town.garrison } : null;
  const [sel, setSel] = useState<{ side: 'l' | 'r'; slot: number } | null>(null);
  const [qty, setQty] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const trap = useModalFocus(ref);
  const titleId = useId();
  if (!left || !right || !hero) return null;
  const sides = { l: left, r: right };
  const selStack = sel ? sides[sel.side].army.slots[sel.slot] : null;
  const click = (side: 'l' | 'r', slot: number) => {
    setError(null);
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
    // The rules decide (merge, swap, split, last creature, ownership, adjacency); the screen only asks.
    const q = quoteTransfer(catalog, state, playerId, from.ref, sel.slot, to.ref, slot, n);
    if (!q.legal) {
      setError(q.reason ?? 'Cannot transfer');
      return;
    }
    // One gesture, one command: the selection is cleared with it.
    if (!store.dispatch({ kind: 'TransferStack', from: from.ref, fromSlot: sel.slot, to: to.ref, toSlot: slot, quantity: n })) {
      setSel(null);
      setQty(null);
    }
  };
  const targets = (side: 'l' | 'r') => (sel ? sides[side].army.slots.map((_, i) => i).filter((i) => !(sel.side === side && sel.slot === i)) : []);
  const pantheonOf = (h: HeroState) => catalog.heroes[h.definitionId]?.pantheonId ?? state.players[h.ownerId]?.pantheonId ?? 'greek';
  const camp = encounterKitArt(`encounterkit.meeting.${pantheonOf(hero)}`)?.url ?? null;
  const archetype = town ? catalog.townArchetypes[town.archetypeId] : undefined;
  const townArt = town && archetype ? townBackground(archetype.backgroundAssetId, town.buildings['civic_hall']).url : null;
  const total = (a: ArmyState) => armyStacks(a).reduce((n, st) => n + st.count, 0);
  const roleOf = (side: 'l' | 'r') => (!sel ? null : sel.side === side ? 'Moving from here' : 'Click a slot to move here');
  return (
    <div className="modal-layer meet-layer" role="dialog" aria-modal="true" aria-labelledby={titleId} data-testid="transfer" onKeyDown={trap}>
      <div className="meet" ref={ref}>
        <div className="meet__scene">
          {camp ? <img className="meet__camp" src={camp} alt="" draggable={false} decoding="async" /> : null}
          <div className="meet__shade" aria-hidden="true" />
          <header className="meet__head">
            <div className="meet__kicker">{town ? `Garrison of ${town.name}` : 'A meeting of heroes'}</div>
            <h2 className="meet__title" id={titleId}>
              Exchange troops
            </h2>
            <p className="meet__lead">Select a stack, optionally choose how many, then click the destination slot.</p>
          </header>
          <div className="meet__stage">
            <div className="meet__figure meet__figure--left">
              <MeetingFigure catalog={catalog} hero={hero} side="left" />
            </div>
            <div className="meet__fire" aria-hidden="true">
              <ArtIcon id="icon.ui.swap" glyph="swap" className="meet__swap" />
              <span>Exchange troops</span>
            </div>
            <div className="meet__figure meet__figure--right">
              {other ? (
                <MeetingFigure catalog={catalog} hero={other} side="right" />
              ) : town ? (
                <span className="meet__town">{town ? <TownThumbnail catalog={catalog} town={town} /> : townArt ? <img src={townArt} alt="" draggable={false} decoding="async" /> : null}</span>
              ) : null}
            </div>
          </div>
          <div className="meet__armies">
            {(['l', 'r'] as const).map((side) => {
              const role = roleOf(side);
              const garrison = side === 'r' && !other && !!town;
              return (
                <section key={side} className={`meet__army transfer__side ${sel?.side === side ? 'is-source' : sel ? 'is-target' : ''}`} aria-label={sides[side].label}>
                  <div className="meet__army-head">
                    <span className="meet__name">{garrison ? town!.name : sides[side].label}</span>
                    <span className="meet__role">{garrison ? 'Town garrison' : side === 'l' ? 'Your hero' : 'Meeting hero'}</span>
                  </div>
                  <ArmyStrip catalog={catalog} army={sides[side].army} selected={sel?.side === side ? sel.slot : null} onSlot={(i) => click(side, i)} dropTargets={targets(side)} label={sides[side].label} testId={`transfer-${side}`} />
                  <div className="meet__army-foot">
                    <span>{total(sides[side].army)} creatures</span>
                    {role ? <span className="meet__hint">{role}</span> : null}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
        <footer className="meet__bar transfer__bar">
          {selStack && sel ? (
            <>
              <span className="small meet__status" role="status">
                Moving {qty ?? selStack.count} of {selStack.count} {catalog.creatures[selStack.creatureId]?.pluralName} from {sides[sel.side].label}. Click a slot on either side.
              </span>
              {selStack.count > 1 ? <QuantitySelector label="Quantity to move" value={qty ?? selStack.count} min={1} max={selStack.count} onChange={setQty} /> : null}
              <Button size="small" variant="ghost" onClick={() => setSel(null)} data-testid="transfer-cancel">
                Cancel
              </Button>
            </>
          ) : (
            <span className={`small meet__status ${error ? 'is-error' : ''}`} role="status">
              {error ?? 'Matching stacks merge; different stacks swap. A hero must keep at least one creature.'}
            </span>
          )}
          {selStack && error ? (
            <span className="small meet__status is-error" role="alert">
              {error}
            </span>
          ) : null}
          <span className="grow" />
          <Button variant="primary" onClick={() => store.closeOverlay()} data-testid="transfer-done">
            Done
          </Button>
        </footer>
      </div>
    </div>
  );
}

/** A hero standing in the meeting: the painted bust (busts face right; the right one is mirrored), else that hero's own portrait in a socket. */
function MeetingFigure({ catalog, hero, side }: { catalog: ContentCatalog; hero: HeroState; side: 'left' | 'right' }) {
  const bust = speakerBust({ portraitAssetId: hero.portraitAssetId });
  if (bust) {
    const gap = bust.alphaBox ? Math.max(0, 1 - bust.alphaBox[3]) : 0;
    return (
      <img
        className={`meet__bust meet__bust--${side}`}
        src={bust.url}
        alt=""
        draggable={false}
        data-asset={bust.id}
        style={{ aspectRatio: `${bust.width} / ${bust.height}`, transform: `translateY(${(gap * 100).toFixed(2)}%)${side === 'right' ? ' scaleX(-1)' : ''}` }}
      />
    );
  }
  return (
    <span className="meet__medallion" data-asset={hero.portraitAssetId}>
      <HeroPortrait catalog={catalog} definitionId={hero.definitionId} portraitAssetId={hero.portraitAssetId} name={hero.name} size="100%" />
    </span>
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
  // Scouting intel (`scoutingIntelV1`): an enemy hero or wandering monster is summarized at its observation
  // stage only (the rules' projection); its exact army is never listed. Guards and garrisons keep today's view.
  const intelMode = !!enemyHero && !!hero && enemyHero.ownerId !== hero.ownerId && intelOn(catalog, state);
  // Recruitment caravans: an enemy wagon's cargo is summarized at its scouting stage only (never its destination).
  const caravan = !town && !enemyHero && hero ? enemyCaravanAt(state, dest, hero.ownerId) : undefined;
  const caravanView = caravan && hero ? caravanIntelView(catalog, state, hero.ownerId, caravan) : null;
  const caravanCargo = caravan && hero && !caravanView ? (caravanFullCargo(catalog, state, hero.ownerId, caravan) ?? []) : null;
  const foeIntel = intelMode ? currentIntelView(catalog, state, hero!.ownerId, enemyHero!.id) : caravanView;
  const shownFoe = enemyHero && !intelMode ? enemyHero : null;
  const army = town
    ? [...(shownFoe ? armyStacks(shownFoe.army) : []), ...armyStacks(town.garrison)].map((s) => ({ creatureId: s.creatureId, count: s.count }))
    : shownFoe
      ? armyStacks(shownFoe.army).map((s) => ({ creatureId: s.creatureId, count: s.count }))
      : enemyHero
        ? []
        : caravan
          ? (caravanCargo ?? [])
          : site
            ? (state.world.sites[site.id]?.guard ?? site.guard?.army ?? [])
            : [];
  const label = q?.encounterLabel ?? site?.guard?.label ?? 'Encounter';
  const reward = site?.guard?.reward;
  // Much weaker neutrals join for free or flee (scenario feature; proposed 2026-10-02).
  const reaction = hero ? quoteNeutralReaction(catalog, state, heroId, dest) : null;
  // The battle would take place under the map's climate rule (scenario feature climateRules).
  const climate = climateRuleFor(catalog, state);
  const attack = () => {
    store.closeOverlay();
    store.dispatch({ kind: 'MoveHero', heroId, destination: dest, confirmEncounter: true });
  };
  // Quick battle: the expected result is the actual one (same function, same state).
  // Campaign battles are fought on the battlefield (handoff 2026-10-15): no quick
  // battle and no casualty preview there; the rules refuse it as well.
  const manualOnly = manualBattlesRequired(state);
  // Against an army the player has not seen in full, the quick battle is not previewed (its result would
  // reveal the hidden numbers); the button still fights it, with the battle AI on both sides.
  const hiddenFoe = intelMode || !!caravanView;
  const preview = useQuickBattlePreview(heroId, dest, !manualOnly && !hiddenFoe);
  const quick = () => {
    store.closeOverlay();
    store.quickBattle({ kind: 'MoveHero', heroId, destination: dest, confirmEncounter: true });
  };
  const quickReason = hiddenFoe ? null : !preview ? 'Working out the quick battle…' : preview.run.ok ? null : preview.run.reason;
  const react = (choice: 'join' | 'release') => {
    store.closeOverlay();
    const names = (reaction?.stacks ?? []).map((s) => `${s.count} ${s.count === 1 ? catalog.creatures[s.creatureId]?.name : catalog.creatures[s.creatureId]?.pluralName}`).join(', ');
    if (!store.dispatch({ kind: 'MoveHero', heroId, destination: dest, confirmEncounter: true, encounterChoice: choice })) {
      store.toast(choice === 'join' ? `${names} joined ${hero?.name}.` : `The ${label.toLowerCase()} fled from ${hero?.name}. The way is clear.`, 'success');
    }
  };
  const title = reaction?.kind === 'join' ? `${label} — they offer to join you` : reaction?.kind === 'flee' ? `${label} — they flee from you` : town ? `Besiege ${town.name}?` : `Attack ${label}?`;
  const heroPantheon = hero ? (catalog.heroes[hero.definitionId]?.pantheonId ?? state.players[hero.ownerId]?.pantheonId ?? null) : null;
  // The scene: the besieged town's own painting, else the landscape of the destination's climate and ground — never a pantheon's.
  const scene = town ? townScene(catalog, town) : encounterScene(state, dest);
  // Whom the right side shows standing: the enemy hero, else the leading stacks (the full army is listed below with exact counts).
  const leading = [...army].sort((a, b) => (catalog.creatures[b.creatureId]?.tier ?? 0) - (catalog.creatures[a.creatureId]?.tier ?? 0)).slice(0, 2);
  return (
    <AdventureStage
      theme={guiThemeFor(heroPantheon)}
      scene={scene}
      title={title}
      subtitle={site ? site.name : town ? `${town.name} · siege` : enemyHero ? `${enemyHero.name} blocks your path` : 'An enemy force blocks your path'}
      pantheonId={heroPantheon}
      catalog={catalog}
      testId="encounter"
      onClose={() => store.closeOverlay()}
      className="ak-encounter-stage"
      footer={
        <>
          <span className="grow" />
          <Button icon="retreat" onClick={() => store.closeOverlay()} data-testid="encounter-withdraw">
            Withdraw
          </Button>
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
          {manualOnly ? null : (
            <Button size="large" icon="auto" onClick={quick} disabled={!!quickReason} disabledReason={quickReason} data-testid="encounter-quick">
              Quick battle
            </Button>
          )}
          <Button variant="danger" size="large" icon="attack" onClick={attack} autoFocus={!reaction?.kind} data-testid="encounter-attack">
            {reaction?.kind ? 'Fight anyway' : manualOnly ? 'Fight' : 'Attack'}
          </Button>
        </>
      }
    >
      <div className="ak-encounter">
        <div className="ak-encounter__figures" aria-hidden="true">
          <div className="ak-encounter__figure">{hero ? <HeroFigure catalog={catalog} definitionId={hero.definitionId} portraitAssetId={hero.portraitAssetId} name={hero.name} /> : null}</div>
          <div className="ak-encounter__vs">
            <Icon name="attack" className="ak-encounter__vs-icon" />
          </div>
          <div className="ak-encounter__figure ak-encounter__figure--foe">
            {enemyHero ? (
              <HeroFigure catalog={catalog} definitionId={enemyHero.definitionId} portraitAssetId={enemyHero.portraitAssetId} name={enemyHero.name} mirror />
            ) : (
              <span className="ak-encounter__foes">
                {leading.map((s, i) => (
                  <span key={i} className="ak-encounter__foe">
                    <CreaturePortrait catalog={catalog} creatureId={s.creatureId} size="100%" />
                  </span>
                ))}
              </span>
            )}
          </div>
        </div>
        {reaction?.kind ? (
          <p className="ak-pane ak-encounter__offer success" data-testid="neutral-offer">
            {reaction.kind === 'join'
              ? `Your army is far stronger. These creatures would rather join ${hero?.name} — for free — than fight. Accepting adds them to the army; letting them go leaves the way clear. Either way you keep the reward, but no experience is gained.`
              : `Your army is far stronger. These creatures will flee rather than fight. Letting them go leaves the way clear and keeps the reward, but gains no experience.`}
          </p>
        ) : null}
        <div className="ak-encounter__armies">
          <section className="ak-pane encounter-side encounter-side--mine" aria-label="Your army">
            <h3 className="ak-pane__title">Your army{hero ? ` · ${hero.name}` : ''}</h3>
            <div className="encounter-army">
              {(hero ? armyStacks(hero.army) : []).map((s, i) => (
                <div key={i} className="encounter-army__stack">
                  <CreaturePortrait catalog={catalog} creatureId={s.creatureId} size="3.6rem" count={s.count} />
                  <div className="encounter-army__name">{catalog.creatures[s.creatureId]?.pluralName}</div>
                </div>
              ))}
            </div>
          </section>
          <section className="ak-pane encounter-side encounter-side--foe" aria-label={town ? 'Defenders' : 'Opponent'}>
            <h3 className="ak-pane__title">
              {town ? 'Defenders' : enemyHero ? 'Enemy hero' : caravan ? 'Supply caravan' : 'Guards'}
              <span className="ak-encounter__foe-name"> · {town ? town.name : (enemyHero?.name ?? site?.guard?.commander?.name ?? label)}</span>
            </h3>
            {foeIntel ? <ArmyIntelPanel catalog={catalog} view={foeIntel} compact testId="encounter-intel" /> : intelMode ? <p className="small dim" data-testid="encounter-intel-unseen">Not in sight: its army is unknown.</p> : null}
            <div className="encounter-army">
              {army.map((s, i) => (
                <div key={i} className="encounter-army__stack">
                  <CreaturePortrait catalog={catalog} creatureId={s.creatureId} size="3.6rem" count={s.count} />
                  <div className="encounter-army__name">{catalog.creatures[s.creatureId]?.pluralName}</div>
                </div>
              ))}
            </div>
            {site?.kind.type === 'sea_monster' && !town && !enemyHero ? <SeaEncounterCards catalog={catalog} stacks={army} /> : null}
            {town && enemyHero ? <div className="encounter-side__note">Led by {enemyHero.name}</div> : !enemyHero && site?.guard?.commander ? <div className="encounter-side__note">Commander: {site.guard.commander.name}</div> : null}
          </section>
        </div>
        <p className="encounter-lead ak-encounter__lead">
          {reaction?.kind ? 'If you fight anyway, ' : ''}
          {hero?.name} will engage {enemyHero ? `${enemyHero.name}’s army` : `the ${label.toLowerCase()}`}
          {site ? ` at ${site.name}` : ''}. A checkpoint is saved before the battle begins.
        </p>
        {climate ? (
          <p className="small encounter-climate" data-testid="encounter-climate">
            <ClimateChip climate={climate} testId="encounter-climate-chip" /> {climate.summary.slice(climate.name.length + 2)} Both armies alike.
          </p>
        ) : null}
        {caravan ? (
          <p className="small ak-pane encounter-note" data-testid="caravan-encounter-note">
            Its cargo defends without a commander: no hero, no spells, no retreat. If it falls, nothing it carries joins your army and there is no loot.
          </p>
        ) : null}
        {town ? (
          <div className="ak-pane encounter-note siege-brief" data-testid="siege-brief">
            <p>
              <strong>Siege.</strong> {FORT_TEXT[level] ?? FORT_TEXT[0]} {state.scenario.features?.targetableCatapultV1 ? `Your catapult stands in the upper left of the field: once a round, after every creature has acted, fire it at the wall section, gate, tower or keep you choose (${catalog.rulesProfile.combat.siege.catapultDamage} structure point${catalog.rulesProfile.combat.siege.catapultDamage === 1 ? '' : 's'}), or skip; the defenders can strike and destroy it.` : 'Your Catapult removes one structure point at the start of every round — the gate first, or the section you aim it at on your turn (click it in the fortification list);'} Cyclopes can batter the walls instead of shooting. Shots into the town across an intact wall deal half damage.{level >= 2 ? ' The keep and towers fire at the stack their shot hurts most, shooters first.' : ''}
            </p>
            <p className="faint">The defender fights with at most seven stacks (identical stacks may be combined first) and cannot retreat or surrender. Winning captures {town.name}. Values are proposed.</p>
          </div>
        ) : null}
        {manualOnly ? null : hiddenFoe ? (
          <div className="quick-battle is-off is-hidden-intel" data-testid="quick-battle" data-status="hidden">
            <Icon name="auto" className="quick-battle__icon" />
            <span className="dim small">No preview: your scouts do not know this army's exact numbers. Quick battle still fights it, with the battle AI on both sides.</span>
          </div>
        ) : (
          <QuickBattlePanel preview={preview} />
        )}
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
      </div>
    </AdventureStage>
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
              store.goto('unit-detail', { creatureId }, { setOverlaysAside: true });
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
    case 'cheat': return <CheatConsole />;
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
    case 'reward':
      return <RewardDialog key={top.receipt.id} receipt={top.receipt} />;
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
      // The hero's own pantheon dresses the book; the pool is the rules' maxMana.
      const owner = store.session?.state.heroes[top.heroId];
      const bookPantheon = owner ? (store.catalog.heroes[owner.definitionId]?.pantheonId ?? store.session!.state.players[owner.ownerId]?.pantheonId ?? null) : null;
      return store.session && caster ? (
        <SpellBook
          catalog={store.catalog}
          hero={caster}
          pantheonId={bookPantheon}
          manaMax={owner ? maxMana(store.catalog, store.session.state, owner) : null}
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
    case 'sluice':
      return store.session ? <SluiceDialog key={top.siteId} heroId={top.heroId} siteId={top.siteId} /> : null;
    case 'interventions':
      return store.session ? <InterventionsDialog /> : null;
    case 'game-over':
      return store.session ? <GameOverDialog /> : null;
    case 'shortcuts':
      return <ShortcutsDialog />;
    case 'caravan-dispatch':
      return store.session ? <CaravanDispatchDialog key={top.townId} townId={top.townId} {...(top.creatureId ? { creatureId: top.creatureId } : {})} /> : null;
    case 'caravan-tracker':
      return store.session ? <CaravanTrackerDialog key={top.caravanId} caravanId={top.caravanId} {...(top.message ? { message: top.message } : {})} /> : null;
    case 'caravan-arrival':
      return store.session ? <CaravanArrivalDialog key={top.receipt.caravanId} receipt={top.receipt} /> : null;
    case 'actor-picker':
      return store.session ? <ActorPickerDialog coord={top.coord} onPlan={top.plan ?? null} /> : null;
  }
}
