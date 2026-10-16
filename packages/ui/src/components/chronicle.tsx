/**
 * The campaign chronicle (screen spec `campaign-chronicle`, reused by the
 * mission result): the chapter graph on the chronicle parchment, laid out from
 * its `requiresAll` edges by `chronicleModel` (app/chronicle.ts), and the
 * selected chapter's summary. Nodes are one radio group (arrow keys move,
 * Home/End jump); each node's accessible name carries its number, name and
 * state, and each state shows its own icon and word, not colour alone.
 * Selecting a node only shows its summary: starting, continuing or replaying a
 * chapter is an action the caller passes in (`actions`), dispatched through the
 * session's validated campaign transitions.
 */
import { useRef, type KeyboardEvent, type ReactNode } from 'react';
import type { ContentCatalog } from '@pr/rules';
import { CHAPTER_STATE_TEXT, chapterList, type ChapterState, type ChronicleModel, type ChronicleNode, type SaveRunInfo } from '../app/chronicle';
import { resolveArt, resolveAsset } from '../assets/manifest';
import { Icon, type IconName } from '../assets/icons';
import { ArtIcon } from './frontend';
import { SpeakerPortrait } from './art';
import { ManualBattleNotice } from './missionLedger';

export const CHRONICLE_BACKGROUND = 'campaignv2.background.campaign.chronicle';
export const BRANCH_ICON = 'campaignv2.icon.branch';

const STATE_ICON: Record<ChapterState, IconName> = {
  completed: 'check',
  current: 'flag',
  available: 'play',
  locked: 'lock',
  practice: 'train',
};

/** A state's icon and word (the tag beside a chapter's name). */
export function ChapterStateTag({ state }: { state: ChapterState }) {
  return (
    <span className={`chron-state is-${state}`} data-state={state}>
      <Icon name={STATE_ICON[state]} className="chron-state__icon" />
      <span>{CHAPTER_STATE_TEXT[state]}</span>
    </span>
  );
}

/** Centre of a node in the graph, in percent of the map box. */
function centre(model: ChronicleModel, n: Pick<ChronicleNode, 'col' | 'row'>): { x: number; y: number } {
  return { x: ((n.col + 0.5) / model.cols) * 100, y: ((n.row + 0.5) / model.rows) * 100 };
}

export function ChronicleGraph({ model, selectedId, onSelect, compact = false }: { model: ChronicleModel; selectedId: string | null; onSelect: (missionId: string) => void; compact?: boolean }) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const bg = resolveAsset(CHRONICLE_BACKGROUND).url;
  const byId = new Map(model.nodes.map((n) => [n.missionId, n]));
  const selected = selectedId && byId.has(selectedId) ? selectedId : (model.nodes[0]?.missionId ?? null);
  const onKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const last = model.nodes.length - 1;
    const j = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? Math.min(last, i + 1) : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? Math.max(0, i - 1) : e.key === 'Home' ? 0 : e.key === 'End' ? last : -1;
    if (j < 0) return;
    e.preventDefault();
    onSelect(model.nodes[j]!.missionId);
    refs.current[j]?.focus();
  };
  return (
    <div
      className={`chron-map ${compact ? 'chron-map--compact' : ''}`}
      style={{ ['--cols' as string]: model.cols, ['--rows' as string]: model.rows, ...(bg ? { backgroundImage: `url("${bg}")` } : {}) }}
      data-testid="chronicle-graph"
    >
      <svg className="chron-map__links" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" focusable="false">
        {model.edges.map((e) => {
          const a = byId.get(e.from);
          const b = byId.get(e.to);
          if (!a || !b) return null;
          const p = centre(model, a);
          const q = centre(model, b);
          const mid = (p.x + q.x) / 2;
          return <path key={`${e.from}>${e.to}`} className={`chron-link ${e.done ? 'is-done' : ''}`} d={`M ${p.x} ${p.y} C ${mid} ${p.y}, ${mid} ${q.y}, ${q.x} ${q.y}`} vectorEffect="non-scaling-stroke" />;
        })}
      </svg>
      <div className="chron-map__nodes" role="radiogroup" aria-label={`Chapters of ${model.campaignName}`}>
        {model.nodes.map((n, i) => {
          const c = centre(model, n);
          const isSel = n.missionId === selected;
          return (
            <button
              key={n.missionId}
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="button"
              role="radio"
              aria-checked={isSel}
              aria-label={n.label}
              title={n.lockedReason ?? undefined}
              tabIndex={isSel ? 0 : -1}
              className={`chron-node is-${n.state} ${isSel ? 'is-selected' : ''}`}
              style={{ left: `${c.x}%`, top: `${c.y}%` }}
              onClick={() => onSelect(n.missionId)}
              onKeyDown={(e) => onKey(e, i)}
              data-testid={`chapter-${n.missionId}`}
              data-state={n.state}
            >
              <span className="chron-node__seal" aria-hidden="true">
                {n.chapter}
              </span>
              <span className="chron-node__text" aria-hidden="true">
                <span className="chron-node__name">{n.name}</span>
                <ChapterStateTag state={n.state} />
              </span>
              {n.parallel ? <ArtIcon id={BRANCH_ICON} glyph="swap" className="chron-node__branch" /> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * The selected chapter: its painting, number, name and state; for revealed
 * chapters the situation, the first briefing line and the known task; for a
 * locked one only why it is locked. Always: the legacy chapters it carries and
 * the campaign's manual-battle line.
 */
export function ChapterSummary({ catalog, node, actions, compact = false }: { catalog: ContentCatalog; node: ChronicleNode; actions?: ReactNode; compact?: boolean }) {
  const art = node.coverAssetId ? resolveArt(node.coverAssetId) : null;
  return (
    <article className={`chron-summary is-${node.state} ${compact ? 'chron-summary--compact' : ''}`} aria-label={`Chapter ${node.chapter}: ${node.name}`} data-testid="chronicle-summary" data-chapter={node.missionId}>
      <figure className="chron-summary__art">
        {art ? <img src={art.url} alt={`Chapter ${node.chapter} — ${node.name}: chapter painting`} draggable={false} /> : <span className="chron-summary__noart" aria-hidden="true" />}
      </figure>
      <div className="chron-summary__body" aria-live="polite">
        <div className="chron-summary__kicker">
          <span>Chapter {node.chapter}</span>
          <ChapterStateTag state={node.state} />
          {node.parallel ? (
            <span className="chron-summary__either">
              <ArtIcon id={BRANCH_ICON} glyph="swap" size="1.25em" /> Either order
            </span>
          ) : null}
        </div>
        <h3 className="chron-summary__name">{node.name}</h3>
        {node.lockedReason ? (
          <p className="chron-summary__locked" data-testid="chapter-locked-reason">
            <Icon name="lock" className="inline-icon" /> {node.lockedReason}. Its story opens when you reach it.
          </p>
        ) : null}
        {node.summary ? <p className="chron-summary__text">{node.summary}</p> : null}
        {node.firstLine ? (
          <blockquote className="chron-summary__line" data-testid="chapter-first-line">
            <SpeakerPortrait catalog={catalog} line={node.firstLine} size={compact ? '2.4rem' : '2.8rem'} />
            <span>
              <span className="chron-summary__speaker">{node.firstLine.speaker}</span>
              <span className="chron-summary__quote">“{node.firstLine.text}”</span>
            </span>
          </blockquote>
        ) : null}
        {node.knownTask ? (
          <p className="chron-summary__task" data-testid="chapter-known-task">
            <Icon name="flag" className="inline-icon" /> <strong>Known task:</strong> {node.knownTask}
          </p>
        ) : null}
        <dl className="chron-summary__facts">
          {node.requires.length ? (
            <div>
              <dt>Requires</dt>
              <dd>{chapterList(node.requires).replace(/^c/, 'C')} — every one of them</dd>
            </div>
          ) : null}
          <div>
            <dt>Carries the story of</dt>
            <dd data-testid="chapter-legacy">{node.legacy.join('; ')}</dd>
          </div>
        </dl>
        <ManualBattleNotice className="chron-summary__manual" />
        {actions ? <div className="chron-summary__actions">{actions}</div> : null}
      </div>
    </article>
  );
}

/** The graph, the either-order note and the selected chapter's summary. */
export function Chronicle({
  catalog,
  model,
  selectedId,
  onSelect,
  actions,
  compact = false,
  testId = 'chronicle',
}: {
  catalog: ContentCatalog;
  model: ChronicleModel;
  selectedId: string | null;
  onSelect: (missionId: string) => void;
  /** Actions for the selected chapter (begin, continue, practice replay). */
  actions?: (node: ChronicleNode) => ReactNode;
  compact?: boolean;
  testId?: string;
}) {
  const node = model.nodes.find((n) => n.missionId === selectedId) ?? model.nodes[0];
  return (
    <section className={`chronicle ${compact ? 'chronicle--compact' : ''}`} aria-label={`${model.campaignName}: chapter chronicle`} data-testid={testId}>
      <ChronicleGraph model={model} selectedId={node?.missionId ?? null} onSelect={onSelect} compact={compact} />
      {model.hasParallel ? (
        <p className="chronicle__legend">
          <ArtIcon id={BRANCH_ICON} glyph="swap" size="1.5em" label="Branch" />
          <span>Chapters side by side are played one at a time, in either order; both are required before the story goes on.</span>
        </p>
      ) : null}
      {node ? <ChapterSummary catalog={catalog} node={node} actions={actions?.(node)} compact={compact} /> : null}
    </section>
  );
}

/** A save's campaign tags: content version, current chapter, practice branch and completion (save list, Continue). */
export function SaveRunTags({ info, testId, showProgress = true }: { info: SaveRunInfo; testId?: string; showProgress?: boolean }) {
  if (!info.version) return null;
  return (
    <span className="save-run" data-testid={testId} data-version={info.version} data-branch={info.branch}>
      <span className={`save-run__tag is-v${info.version}`}>{info.versionLabel}</span>
      {info.branchLabel ? (
        <span className="save-run__tag is-practice">
          <Icon name="train" className="inline-icon" /> {info.branchLabel}
        </span>
      ) : null}
      {info.completed ? (
        <span className="save-run__tag is-complete">
          <Icon name="check" className="inline-icon" /> Campaign complete
        </span>
      ) : null}
      {showProgress && info.progress ? <span className="save-run__progress">{info.progress}</span> : null}
    </span>
  );
}
