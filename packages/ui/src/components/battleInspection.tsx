/**
 * The battle creature inspection panel (expedition kit 2026-10-17, handoff §04).
 *
 * Opened by right-clicking a stack, by the Inspect key (default I: the stack under the pointer, else
 * the acting stack) or by the Inspect button on the acting stack's card. It shows the stack's form and
 * name, living count, portrait, effective Attack and Defense with their base and parts (hover or focus
 * a stat), damage per creature, speed, ammunition, retaliations left, the front creature's health apart
 * from the count and the whole stack's HP, and every active effect with its icon, what it does, how
 * long it lasts and who applied it (hover or focus an effect: a visible source stack is outlined on the
 * battlefield). Unpinned it follows the stack under the pointer and Escape closes it; pinned it stays.
 *
 * Read-only: it never issues an order, never advances the turn and draws no random number; the model is
 * `app/battleInspection.ts`. It stands beside the battlefield, away from the inspected stack, above the
 * battle bar; on a small window (or a large interface scale) it becomes a dismissible drawer.
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { cellKey, stackCells, type BattleCell, type BattleSideId, type ContentCatalog, type MatchState } from '@pr/rules';
import type { BattleView } from '@pr/presentation';
import { Bar, Button } from './kit';
import { CreaturePortrait } from './art';
import { Icon, type IconName } from '../assets/icons';
import { resolveAsset } from '../assets/manifest';
import { projectors } from '../scene/SceneHost';
import { inspectableOrder, inspectionModel, type InspectionEffect, type InspectionModel, type InspectionStat } from '../app/battleInspection';

/** Where the card stands: right or left of the board, at the top (below the turn order) or low (above the battle bar). */
export type InspectionDock = 'right' | 'left' | 'right-low' | 'left-low';

export interface InspectionState {
  readonly stackId: string;
  readonly pinned: boolean;
  readonly dock: InspectionDock;
}

/** Panel width in rem (docked). */
const PANEL_REM = 25;

function remPx(): number {
  if (typeof window === 'undefined') return 16;
  return parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
}

/** A small window or a large interface scale: the card becomes a full-height drawer. */
function drawerNow(): boolean {
  const r = remPx();
  return window.innerHeight / r < 50 || window.innerWidth / r < 96;
}

function panelSpan(dock: InspectionDock, drawer: boolean, r: number): [number, number] {
  const width = drawer ? Math.min(25 * r, window.innerWidth) : Math.min(PANEL_REM * r, window.innerWidth - 2 * r);
  const margin = drawer ? 0 : r;
  const x0 = dock.startsWith('right') ? window.innerWidth - margin - width : margin;
  return [x0, x0 + width];
}

/**
 * The free band for the card on a side, measured on screen: below the top bar (and the turn order where
 * it overlaps), above the battle bar (and, on the right, the Log button or the open log), so a wrapping
 * bar never ends under the card.
 */
function freeBand(dock: InspectionDock, drawer: boolean, r: number): { top: number; bottom: number } {
  const rect = (sel: string) => document.querySelector(`.battle ${sel}`)?.getBoundingClientRect() ?? null;
  const [x0, x1] = panelSpan(dock, drawer, r);
  const overlaps = (q: DOMRect | null) => !!q && q.width > 0 && q.left < x1 && q.right > x0;
  let top = (rect('.battle-top')?.bottom ?? 0) + 0.4 * r;
  const turn = rect('.turn-order');
  if (overlaps(turn)) top = Math.max(top, turn!.bottom + 0.4 * r);
  let bottom = (rect('.battle-bottom')?.top ?? window.innerHeight) - 0.5 * r;
  if (dock.startsWith('right')) {
    const log = rect('.battle-log') ?? rect('.battle-log-toggle');
    if (overlaps(log)) bottom = Math.min(bottom, log!.top - 0.4 * r);
  }
  return { top, bottom: Math.max(top + 8 * r, bottom) };
}

/** The card's rectangle on screen for a dock (its current height, else an estimate). */
function panelRect(dock: InspectionDock, drawer: boolean, height: number): { x0: number; x1: number; y0: number; y1: number } {
  const r = remPx();
  const [x0, x1] = panelSpan(dock, drawer, r);
  const band = freeBand(dock, drawer, r);
  if (drawer) return { x0, x1, y0: band.top, y1: band.bottom };
  const h = Math.min(height, band.bottom - band.top);
  return dock.endsWith('-low') ? { x0, x1, y0: band.bottom - h, y1: band.bottom } : { x0, x1, y0: band.top, y1: band.top + h };
}

/**
 * Where the card stands so the battle stays visible: never over the inspected stack, and over as few other
 * stacks as possible (a stack under the card could not be pointed at). Ties keep the current place, then
 * prefer the top right. Measured on screen through the board's own projection; presentation only.
 */
function dockFor(catalog: ContentCatalog, state: MatchState, stackId: string, current?: InspectionDock): InspectionDock {
  const b = state.battle;
  const project = projectors.battle;
  if (!b || !project || typeof window === 'undefined') return current ?? 'right';
  const drawer = drawerNow();
  const el = document.querySelector<HTMLElement>('[data-testid="battle-inspection"]');
  const height = el?.offsetHeight || 26 * remPx();
  const options: InspectionDock[] = drawer ? ['right', 'left'] : ['right', 'left', 'right-low', 'left-low'];
  const points = Object.values(b.stacks)
    .filter((s) => s.totalHp > 0)
    .map((s) => ({ id: s.id, pts: stackCells(catalog, s).map((c) => project(c.col, c.row)).filter((p): p is { x: number; y: number } => !!p) }));
  const score = (d: InspectionDock) => {
    const q = panelRect(d, drawer, height);
    let n = 0;
    for (const s of points) if (s.pts.some((p) => p.x >= q.x0 - 4 && p.x <= q.x1 + 4 && p.y >= q.y0 - 4 && p.y <= q.y1 + 4)) n += s.id === stackId ? 1000 : 1;
    return n;
  };
  let best = current && options.includes(current) ? current : options[0]!;
  let bestScore = score(best);
  for (const d of options) {
    const sc = score(d);
    if (sc < bestScore) {
      best = d;
      bestScore = sc;
    }
  }
  return best;
}

/** The living stack whose footprint holds a cell. */
function stackAt(catalog: ContentCatalog, state: MatchState, cell: BattleCell | null): string | null {
  const b = state.battle;
  if (!b || !cell) return null;
  const k = cellKey(cell);
  for (const s of Object.values(b.stacks)) if (s.totalHp > 0 && stackCells(catalog, s).some((c) => cellKey(c) === k)) return s.id;
  return null;
}

export interface BattleInspectionApi {
  readonly state: InspectionState | null;
  /** The living stack under the pointer (any turn; independent of the legal actions). */
  readonly hoveredStackId: string | null;
  open(stackId: string, opts?: { focus?: boolean; pinned?: boolean }): void;
  close(): void;
  togglePin(): void;
  /** The source stack outlined while an effect is hovered or focused. */
  readonly sourceHighlight: string | null;
  setSourceHighlight(stackId: string | null): void;
  /** The battle view with the inspected (and source) stack outlined on the board. */
  decorate(view: BattleView): BattleView;
  /**
   * Keyboard: the Inspect key opens the card for the hovered (else the acting) stack; Escape closes an
   * unpinned card. True when the key was handled (the caller stops there).
   */
  handleKey(e: KeyboardEvent, inspectKey: boolean, fallbackStackId: string | null): boolean;
}

/** Inspection state for the battle screen: open/close/pin, pointer-follow while unpinned, board outline. */
export function useBattleInspection(catalog: ContentCatalog, state: MatchState, hoverCell: BattleCell | null): BattleInspectionApi {
  const [insp, setInsp] = useState<InspectionState | null>(null);
  const [sourceHighlight, setSourceHighlight] = useState<string | null>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const battle = state.battle;
  const battleId = battle?.battleId ?? '';
  const hoveredStackId = useMemo(() => stackAt(catalog, state, hoverCell), [catalog, state, hoverCell]);

  const open = useCallback(
    (stackId: string, opts?: { focus?: boolean; pinned?: boolean }) => {
      if (opts?.focus && typeof document !== 'undefined') {
        const a = document.activeElement as HTMLElement | null;
        returnFocus.current = a && !a.closest('[data-testid="battle-inspection"]') ? a : null;
      }
      setInsp((cur) => ({ stackId, pinned: opts?.pinned ?? cur?.pinned ?? false, dock: dockFor(catalog, state, stackId, cur?.dock) }));
      if (opts?.focus) window.setTimeout(() => document.querySelector<HTMLElement>('[data-testid="battle-inspection"]')?.focus({ preventScroll: true }), 0);
    },
    [catalog, state],
  );
  const close = useCallback(() => {
    setInsp(null);
    setSourceHighlight(null);
    const el = returnFocus.current;
    returnFocus.current = null;
    if (typeof document !== 'undefined' && document.activeElement?.closest?.('[data-testid="battle-inspection"]')) {
      if (el && el.isConnected) el.focus({ preventScroll: true });
      else (document.activeElement as HTMLElement).blur();
    }
  }, []);
  const togglePin = useCallback(() => setInsp((cur) => (cur ? { ...cur, pinned: !cur.pinned } : cur)), []);

  // Unpinned, the card follows the stack under the pointer (pinned, it keeps its stack).
  useEffect(() => {
    if (!insp || insp.pinned || !hoveredStackId || hoveredStackId === insp.stackId) return;
    setInsp({ ...insp, stackId: hoveredStackId, dock: dockFor(catalog, state, hoveredStackId, insp.dock) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hoveredStackId]);
  // A new battle closes the card; a stack that left the battle (it cannot) would too.
  useEffect(() => {
    setInsp(null);
    setSourceHighlight(null);
  }, [battleId]);
  useEffect(() => {
    if (insp && !battle?.stacks[insp.stackId]) setInsp(null);
  }, [insp, battle]);
  // Stacks moved (an order played): the card steps aside if it now stands over them.
  const revision = state.revision;
  useEffect(() => {
    if (!insp) return;
    const t = window.setTimeout(() => {
      setInsp((cur) => {
        if (!cur) return cur;
        const d = dockFor(catalog, state, cur.stackId, cur.dock);
        return d === cur.dock ? cur : { ...cur, dock: d };
      });
    }, 0);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revision]);

  const decorate = useCallback(
    (view: BattleView): BattleView => {
      const b = state.battle;
      if (!insp || !b) return view;
      const cellsOf = (id: string | null) => {
        const s = id ? b.stacks[id] : undefined;
        return s && s.totalHp > 0 ? stackCells(catalog, s) : [];
      };
      const inspected = cellsOf(insp.stackId);
      const source = sourceHighlight && sourceHighlight !== insp.stackId ? cellsOf(sourceHighlight) : [];
      if (!inspected.length && !source.length) return view;
      return { ...view, inspected, inspectedSource: source, highlightKey: `${view.highlightKey}|inspect:${inspected.map(cellKey).join(';')}|src:${source.map(cellKey).join(';')}` };
    },
    [catalog, state, insp, sourceHighlight],
  );

  const handleKey = useCallback(
    (e: KeyboardEvent, inspectKey: boolean, fallbackStackId: string | null): boolean => {
      if (inspectKey) {
        const id = hoveredStackId ?? fallbackStackId ?? (insp ? insp.stackId : null);
        if (!id) return false;
        e.preventDefault();
        open(id, { focus: true });
        return true;
      }
      if (e.key === 'Escape' && insp && !insp.pinned) {
        e.preventDefault();
        e.stopPropagation();
        close();
        return true;
      }
      return false;
    },
    [hoveredStackId, insp, open, close],
  );

  return { state: insp, hoveredStackId, open, close, togglePin, sourceHighlight, setSourceHighlight, decorate, handleKey };
}

const STAT_ICON: Record<string, IconName | null> = { attack: 'attack', defense: 'defense', damage: 'damage', speed: 'speed', ammo: 'shots', retaliation: null };

function StatIcon({ stat }: { stat: InspectionStat }) {
  const name = STAT_ICON[stat.key];
  if (name) return <Icon name={name} className="binsp__stat-icon" />;
  // Retaliation: the delivered stat icon (Brief 13), else the crossed-swords glyph.
  const url = resolveAsset('icon.stat.retaliation').url;
  return url ? <img className="binsp__stat-icon" src={url} alt="" draggable={false} /> : <Icon name="sword2" className="binsp__stat-icon" />;
}

function Stat({ stat, onExplain }: { stat: InspectionStat; onExplain: (text: string | null) => void }) {
  const arrow = stat.change === 'up' ? '▲' : stat.change === 'down' ? '▼' : null;
  const changeWord = stat.change === 'up' ? 'raised' : stat.change === 'down' ? 'lowered' : null;
  return (
    <div
      className={`binsp__stat${stat.change ? ` is-${stat.change}` : ''}`}
      tabIndex={0}
      title={stat.breakdown}
      aria-label={`${stat.label} ${stat.value}${stat.note ? ` (${stat.note})` : ''}${changeWord ? `, ${changeWord}` : ''}. ${stat.breakdown}`}
      data-testid={`binsp-stat-${stat.key}`}
      onMouseEnter={() => onExplain(stat.breakdown)}
      onMouseLeave={() => onExplain(null)}
      onFocus={() => onExplain(stat.breakdown)}
      onBlur={() => onExplain(null)}
    >
      <StatIcon stat={stat} />
      <span className="binsp__stat-label">{stat.label}</span>
      <span className="binsp__stat-value num" aria-hidden="true">
        {stat.value}
        {arrow ? <span className="binsp__arrow">{arrow}</span> : null}
      </span>
      {stat.note ? (
        <span className="binsp__stat-base" aria-hidden="true">
          {stat.note}
        </span>
      ) : null}
    </div>
  );
}

function Effect({ e, onSource }: { e: InspectionEffect; onSource: (stackId: string | null, text: string | null) => void }) {
  const url = e.icon ? resolveAsset(e.icon).url : null;
  const tip = `${e.label}: ${e.effect}\n${e.remaining} — ${e.ends}\nSource: ${e.source.text}${e.hostile ? '\nApplied by the opposing side' : ''}`;
  const over = () => onSource(e.source.stackId, `${e.label}: ${e.effect}. Source: ${e.source.text}. ${e.remaining}.`);
  const out = () => onSource(null, null);
  return (
    <li
      className={`binsp__effect${e.hostile ? ' is-hostile' : ' is-friendly'}`}
      tabIndex={0}
      title={tip}
      aria-label={`${e.label}: ${e.effect}. ${e.remaining}. Source: ${e.source.text}.${e.hostile ? ' Applied by the opposing side.' : ''}`}
      data-testid="binsp-effect"
      data-source-kind={e.source.kind}
      data-source-stack={e.source.stackId ?? undefined}
      onMouseEnter={over}
      onMouseLeave={out}
      onFocus={over}
      onBlur={out}
    >
      {url ? <img className="binsp__effect-icon" src={url} alt="" draggable={false} /> : <Icon name="ability" className="binsp__effect-icon" />}
      <span className="binsp__effect-main">
        <span className="binsp__effect-label">
          {e.label}
          <span className="binsp__effect-tag">{e.hostile ? '▼ hostile' : '▲ friendly'}</span>
        </span>
        <span className="binsp__effect-what">{e.effect}</span>
        <span className="binsp__effect-meta">
          <Icon name="remaining" className="inline-icon" /> <span data-testid="binsp-effect-remaining">{e.remaining}</span>
          <span className="binsp__sep" aria-hidden="true">
            ·
          </span>
          <Icon name="source" className="inline-icon" /> <span data-testid="binsp-effect-source">Source: {e.source.text}</span>
        </span>
      </span>
    </li>
  );
}

export interface BattleInspectionProps {
  readonly catalog: ContentCatalog;
  readonly state: MatchState;
  readonly api: BattleInspectionApi;
  /** The human's side (own/enemy wording), if any. */
  readonly viewerSide: BattleSideId | null;
  /** The turn order shown at the top (for stepping through stacks). */
  readonly order: { current: readonly string[]; next: readonly string[] };
  /** The combat log is open at the bottom right: a right-docked card ends above it (re-measured when it toggles). */
  readonly logOpen?: boolean;
  /** Open the full creature card (the read-only stack-info overlay). */
  readonly onCreatureCard: (creatureId: string, count: number) => void;
  /** The Inspect key as bound (Settings → Keyboard), for the hint. */
  readonly inspectKey?: string;
}

/** The panel; renders nothing while closed. */
export function BattleInspection({ catalog, state, api, viewerSide, order, logOpen, onCreatureCard, inspectKey = 'I' }: BattleInspectionProps) {
  void logOpen;
  const insp = api.state;
  const model: InspectionModel | null = insp ? inspectionModel(catalog, state, insp.stackId, viewerSide) : null;
  const [explain, setExplain] = useState<string | null>(null);
  const [drawer, setDrawer] = useState(false);
  const [box, setBox] = useState<{ top: number; height: number; bottom: number } | null>(null);
  const [tick, setTick] = useState(0);
  useLayoutEffect(() => {
    const onResize = () => setTick((n) => n + 1);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  // The room in the chosen place, measured on screen (see `freeBand`).
  useLayoutEffect(() => {
    if (!insp) return;
    const r = remPx();
    const isDrawer = drawerNow();
    if (isDrawer !== drawer) setDrawer(isDrawer);
    const band = freeBand(insp.dock, isDrawer, r);
    const next = { top: Math.round(band.top), height: Math.round(band.bottom - band.top), bottom: Math.round(window.innerHeight - band.bottom) };
    if (!box || box.top !== next.top || box.height !== next.height || box.bottom !== next.bottom) setBox(next);
  });
  void tick;
  useEffect(() => setExplain(null), [insp?.stackId]);
  if (!insp || !model || !state.battle) return null;
  const list = inspectableOrder(order, state.battle);
  const at = list.indexOf(model.stackId);
  const step = (d: number) => {
    if (!list.length) return;
    const next = list[(Math.max(0, at) + d + list.length) % list.length]!;
    api.open(next, { pinned: insp.pinned });
  };
  const sideTag: ReactNode = model.allegiance ? (
    <span className={`binsp__side binsp__side--${model.allegiance}`}>
      <span className="binsp__side-shape" aria-hidden="true">
        {model.allegiance === 'own' ? '●' : '◆'}
      </span>
      {model.allegiance === 'own' ? 'Your army' : 'Enemy'}
    </span>
  ) : null;
  const hpPct = model.maxHp > 0 ? model.frontHp / model.maxHp : 0;
  return (
    <aside
      className={`binsp panel binsp--${insp.dock.startsWith('left') ? 'left' : 'right'}${insp.dock.endsWith('-low') ? ' binsp--low' : ''}${drawer ? ' binsp--drawer' : ''}${insp.pinned ? ' is-pinned' : ''}`}
      style={
        box
          ? drawer
            ? { top: box.top, height: box.height, bottom: 'auto' }
            : insp.dock.endsWith('-low')
              ? { top: 'auto', bottom: box.bottom, maxHeight: box.height }
              : { top: box.top, maxHeight: box.height }
          : undefined
      }
      role="region"
      aria-label={`Inspection: ${model.count} ${model.name}`}
      tabIndex={-1}
      data-testid="battle-inspection"
      data-stack={model.stackId}
      data-pinned={insp.pinned ? 'true' : 'false'}
      data-layout={drawer ? 'drawer' : 'docked'}
      data-dock={insp.dock}
    >
      <header className="binsp__head">
        <div className="binsp__titles">
          <h2 className="binsp__name" data-testid="binsp-name">
            {model.name}
          </h2>
          <div className="binsp__sub small">
            <span data-testid="binsp-count">
              {model.alive ? `${model.count} ${model.count === 1 ? 'creature' : 'creatures'}` : 'Destroyed'}
            </span>
            {model.formLabel ? <span> · {model.formLabel}</span> : null}
            <span>
              {' '}
              · {model.sideLabel} ({model.ownerName})
            </span>
            {model.active ? <span className="binsp__acting"> · acting now</span> : null}
          </div>
        </div>
        <div className="binsp__tools">
          <button type="button" className="btn btn--small btn--icon btn--ghost" aria-label="Inspect the previous stack" title="Previous stack in the turn order" onClick={() => step(-1)} data-testid="binsp-prev">
            <Icon name="back" glyph style={{ width: '1.15em', height: '1.15em' }} />
          </button>
          <button type="button" className="btn btn--small btn--icon btn--ghost" aria-label="Inspect the next stack" title="Next stack in the turn order" onClick={() => step(1)} data-testid="binsp-next">
            <Icon name="back" glyph style={{ width: '1.15em', height: '1.15em', transform: 'scaleX(-1)' }} />
          </button>
          <button
            type="button"
            className={`btn btn--small btn--icon binsp__pin${insp.pinned ? ' is-on' : ''}`}
            aria-pressed={insp.pinned}
            aria-label={insp.pinned ? 'Unpin this card' : 'Pin this card'}
            title={insp.pinned ? 'Pinned: the card stays on this stack (click to unpin)' : 'Pin: keep this stack’s card while the pointer moves'}
            onClick={api.togglePin}
            data-testid="binsp-pin"
          >
            <Icon name="pin" style={{ width: '1.15em', height: '1.15em' }} />
          </button>
          <Button size="small" variant="ghost" icon="close" aria-label="Close the inspection" title={insp.pinned ? 'Close' : 'Close (Esc)'} onClick={api.close} data-testid="binsp-close" />
        </div>
      </header>

      <div className="binsp__top">
        <div className="binsp__portrait">
          <CreaturePortrait catalog={catalog} creatureId={model.creatureId} size="4.6rem" />
          {sideTag}
        </div>
        <div className="binsp__topright">
          <div className="binsp__hp" data-testid="binsp-hp">
            <div className="binsp__hp-line">
              <Icon name="hp" className="inline-icon" />
              <span>
                Front creature <strong className="num" data-testid="binsp-front">{model.frontHp}</strong>/<span className="num">{model.maxHp}</span> HP
              </span>
              {hpPct < 1 && model.alive ? <span className="binsp__wounded">wounded</span> : null}
            </div>
            <Bar value={model.frontHp} max={model.maxHp} kind="hp" label="Front creature health" />
            <div className="binsp__hp-sub small dim">
              <span data-testid="binsp-living">
                {model.count} of {model.startingCount} alive
              </span>{' '}
              · stack <span className="num" data-testid="binsp-total">{model.totalHp}</span> HP
            </div>
          </div>
          <p className="binsp__explain small" aria-live="polite" data-testid="binsp-explain">
            {explain ?? 'Hover or focus a value or an effect for its base, its parts and its source.'}
          </p>
        </div>
      </div>
      <div className="binsp__stats" role="list" aria-label="Combat values (hover or focus for base and parts)">
        {model.stats.map((s) => (
          <div role="listitem" key={s.key}>
            <Stat stat={s} onExplain={setExplain} />
          </div>
        ))}
      </div>

      {model.states.length ? (
        <ul className="binsp__states small" data-testid="binsp-states">
          {model.states.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      ) : null}

      <section className="binsp__effects" aria-label="Active effects">
        <h3 className="binsp__h3">Active effects</h3>
        {model.effects.length ? (
          <ul className="binsp__effect-list">
            {model.effects.map((e) => (
              <Effect
                key={e.key}
                e={e}
                onSource={(stackId, text) => {
                  api.setSourceHighlight(stackId);
                  setExplain(text);
                }}
              />
            ))}
          </ul>
        ) : (
          <p className="small dim binsp__none" data-testid="binsp-no-effects">
            No active effects.
          </p>
        )}
      </section>

      <footer className="binsp__foot">
        <span className="small faint">
          Right-click or {inspectKey} to inspect{insp.pinned ? '' : ' · Esc closes'}
        </span>
        <Button size="small" variant="ghost" icon="bestiary" onClick={() => onCreatureCard(model.creatureId, model.count)} data-testid="binsp-card">
          Creature card
        </Button>
      </footer>
    </aside>
  );
}
