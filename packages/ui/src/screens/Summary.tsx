/**
 * S20 End-of-game summary and S21 High Scores (proposed this build).
 *
 * The summary charts the day-by-day records the rules keep in MatchState
 * (army value, income, towns, gold), lists each empire's totals and shows the
 * score breakdown. High scores are read from the platform's records store.
 * Display only.
 */
import { useEffect, useMemo, useState } from 'react';
import { contenderIds, ensureStats, matchScore, scenarioMission, type MatchState, type PlayerDayStats } from '@pr/rules';
import { campaignScore } from '@pr/session';
import { useStore } from '../app/context';
import { clearHighScores, loadHighScores, sortTable, type HighScoreEntry, type ScoreTable } from '../app/records';
import { Button, Chip, Panel, SectionTitle, Tabs, EmptyState } from '../components/kit';
import { Emblem } from '../components/art';
import { ScreenHeader } from '../components/game';
import { formatNumber, relativeTime } from '../app/view';
import { viewerWon } from '../app/moments';
import { resultSplashArt } from '../assets/momentArt';
import { ResultSplash } from '../components/moments';

type Metric = 'armyValue' | 'income' | 'towns' | 'gold';

const METRICS: readonly { id: Metric; label: string; unit: string }[] = [
  { id: 'armyValue', label: 'Army size', unit: 'Recruitment value of all creatures (Gold)' },
  { id: 'income', label: 'Income', unit: 'Daily income, in Gold equivalent' },
  { id: 'towns', label: 'Towns', unit: 'Towns held' },
  { id: 'gold', label: 'Treasury', unit: 'Gold in the treasury at dawn' },
];

const DASHES = ['', '6 4', '2 3', '8 3 2 3'];

function niceMax(v: number): number {
  if (v <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  for (const m of [1, 2, 2.5, 5, 10]) if (m * p >= v) return m * p;
  return 10 * p;
}

function compact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
  if (n >= 10_000) return `${Math.round(n / 1000)}k`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

/** Axis maximum and evenly spaced ticks; counts (towns) get whole-number ticks. */
function axis(maxValue: number, whole: boolean): { max: number; ticks: number[] } {
  if (whole && maxValue <= 8) {
    const max = Math.max(1, Math.ceil(maxValue));
    return { max, ticks: Array.from({ length: max + 1 }, (_, i) => i) };
  }
  const max = niceMax(Math.max(1, maxValue));
  return { max, ticks: [0, 0.25, 0.5, 0.75, 1].map((f) => f * max) };
}

/** A small accessible line chart (one line per empire, distinct dash patterns as well as colours). */
function LineChart({ state, metric, ids }: { state: MatchState; metric: Metric; ids: string[] }) {
  const timeline = ensureStats(state).timeline;
  const W = 640;
  const H = 270;
  const pad = { l: 52, r: 16, t: 14, b: 40 };
  const days = timeline.map((r) => r.day);
  const minDay = days[0] ?? 1;
  const maxDay = Math.max(minDay + 1, days[days.length - 1] ?? 1);
  const values = timeline.flatMap((r) => ids.map((id) => r.players[id]?.[metric as keyof PlayerDayStats] ?? 0));
  const { max: yMax, ticks: yTicks } = axis(Math.max(0, ...values), metric === 'towns');
  const x = (d: number) => pad.l + ((d - minDay) / (maxDay - minDay)) * (W - pad.l - pad.r);
  const y = (v: number) => pad.t + (1 - v / yMax) * (H - pad.t - pad.b);
  const xStep = Math.max(1, Math.ceil((maxDay - minDay) / 8));
  const xTicks: number[] = [];
  for (let d = minDay; d <= maxDay; d += xStep) xTicks.push(d);
  const label = METRICS.find((m) => m.id === metric)?.unit ?? '';
  return (
    <figure className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${label} by day`} className="chart__svg">
        {yTicks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} className="chart__grid" />
            <text x={pad.l - 6} y={y(t) + 4} textAnchor="end" className="chart__tick">
              {compact(t)}
            </text>
          </g>
        ))}
        {xTicks.map((d) => (
          <text key={d} x={x(d)} y={H - pad.b + 16} textAnchor="middle" className="chart__tick">
            {d}
          </text>
        ))}
        <text x={pad.l + (W - pad.l - pad.r) / 2} y={H - 4} textAnchor="middle" className="chart__tick chart__axis-label">
          day
        </text>
        {ids.map((id, i) => {
          const p = state.players[id];
          const pts = timeline.map((r) => `${x(r.day).toFixed(1)},${y(r.players[id]?.[metric as keyof PlayerDayStats] ?? 0).toFixed(1)}`);
          if (pts.length === 0) return null;
          return (
            <g key={id}>
              <polyline points={pts.join(' ')} fill="none" stroke={p?.color ?? '#ccc'} strokeWidth={2.4} strokeDasharray={DASHES[i % DASHES.length]} strokeLinejoin="round" />
              {timeline.length === 1 ? <circle cx={x(timeline[0]!.day)} cy={y(timeline[0]!.players[id]?.[metric as keyof PlayerDayStats] ?? 0)} r={3.5} fill={p?.color ?? '#ccc'} /> : null}
            </g>
          );
        })}
      </svg>
      <figcaption className="chart__legend">
        {ids.map((id, i) => {
          const p = state.players[id];
          return (
            <span key={id} className="chart__key">
              <svg width="28" height="10" aria-hidden="true">
                <line x1="1" x2="27" y1="5" y2="5" stroke={p?.color ?? '#ccc'} strokeWidth="2.4" strokeDasharray={DASHES[i % DASHES.length]} />
              </svg>
              {p?.name ?? id}
              {p?.eliminated ? <span className="faint"> (eliminated)</span> : null}
            </span>
          );
        })}
        <span className="faint small">{label}</span>
      </figcaption>
    </figure>
  );
}

export function SummaryScreen() {
  const store = useStore();
  const catalog = store.catalog;
  const session = store.session!;
  const state = session.state;
  const mission = scenarioMission(catalog, state);
  const ids = contenderIds(state);
  const humans = session.humanSeats;
  const [metric, setMetric] = useState<Metric>('armyValue');
  const [scoreFor, setScoreFor] = useState(session.humanPlayerId);
  const score = matchScore(catalog, state, scoreFor);
  const totals = ensureStats(state).totals;
  const campaign = session.campaign;
  // The finished match's painting for the viewer's pantheon, behind the summary.
  const won = viewerWon(state, session.humanPlayerId);
  const splash = won === null ? null : resultSplashArt(state.players[session.humanPlayerId]?.pantheonId, won);
  const returnTo = (store.screen.params.returnTo as 'debrief' | 'campaign-complete' | 'game-over' | undefined) ?? (campaign ? undefined : 'game-over');
  const toMenu = () => {
    store.endSession();
    store.resetTo('main-menu');
    void store.refreshContinue();
  };
  const rows: { label: string; key: keyof (typeof totals)[string] }[] = [
    { label: 'Battles won', key: 'battlesWon' },
    { label: 'Battles lost', key: 'battlesLost' },
    { label: 'Creatures defeated', key: 'creaturesKilled' },
    { label: 'Creatures lost', key: 'creaturesLost' },
    { label: 'Creatures recruited', key: 'creaturesRecruited' },
    { label: 'Buildings built', key: 'buildingsBuilt' },
    { label: 'Sites captured', key: 'sitesCaptured' },
    { label: 'Towns captured', key: 'townsCaptured' },
  ];
  return (
    <div className={`screen summary-screen ${splash ? 'summary-screen--splash' : ''}`} data-testid="summary">
      {splash ? <ResultSplash art={splash} /> : null}
      <ScreenHeader
        title={`Summary — ${mission?.name ?? state.scenario.name}`}
        back={false}
        right={
          <div className="row gap">
            {returnTo ? (
              <Button
                icon="back"
                onClick={() => {
                  store.back();
                  store.openOverlay({ kind: returnTo });
                }}
                data-testid="summary-back"
              >
                {returnTo === 'debrief' ? 'Back to debrief' : 'Back'}
              </Button>
            ) : null}
            <Button onClick={() => store.goto('high-scores')} icon="star" data-testid="summary-highscores">
              High scores
            </Button>
            <Button variant="primary" onClick={toMenu} data-testid="summary-menu">
              Main Menu
            </Button>
          </div>
        }
      />
      <div className="summary-grid">
        <Panel title="Over time" className="summary-chart" bodyClassName="scroll">
          <Tabs label="Statistic" tabs={METRICS.map((m) => ({ id: m.id, label: m.label }))} value={metric} onChange={setMetric} />
          <LineChart state={state} metric={metric} ids={ids} />
        </Panel>
        <Panel title="Score" className="summary-score" bodyClassName="scroll">
          {humans.length > 1 ? (
            <Tabs label="Player" tabs={humans.map((id) => ({ id, label: state.players[id]?.name ?? id }))} value={scoreFor} onChange={setScoreFor} />
          ) : null}
          <table className="table small" data-testid="score-table">
            <tbody>
              {score.lines.map((l) => (
                <tr key={l.label}>
                  <th>{l.label}</th>
                  <td className="num">{formatNumber(l.points)}</td>
                </tr>
              ))}
              <tr>
                <th>Subtotal</th>
                <td className="num">{formatNumber(score.subtotal)}</td>
              </tr>
              {score.difficultyPercent !== 100 ? (
                <tr>
                  <th>Difficulty ×{(score.difficultyPercent / 100).toFixed(1)}</th>
                  <td />
                </tr>
              ) : null}
              <tr className="table__total">
                <th>Score</th>
                <td className="num">{formatNumber(score.total)}</td>
              </tr>
            </tbody>
          </table>
          {store.lastRecord?.rank && store.lastRecord.table === 'skirmish' && scoreFor === session.humanPlayerId ? <Chip tone="ok">High score — rank {store.lastRecord.rank}</Chip> : null}
          <p className="faint small">Score formula (proposed this build): victory 2,000; up to 1,500 for a fast win (−25 per day); army value ÷ 100; 300 per town; 100 per site; 100 per battle won; 2 per creature defeated; times the difficulty multiplier.</p>
          {campaign ? (
            <>
              <SectionTitle>Campaign</SectionTitle>
              <table className="table small" data-testid="campaign-scores">
                <tbody>
                  {campaign.completions.map((c) => (
                    <tr key={c.missionId}>
                      <th>{c.summary.missionName}</th>
                      <td className="num">{c.summary.days} days</td>
                      <td className="num">{c.summary.score !== undefined ? formatNumber(c.summary.score) : '—'}</td>
                    </tr>
                  ))}
                  <tr className="table__total">
                    <th>Campaign score</th>
                    <td />
                    <td className="num">{formatNumber(campaignScore(campaign))}</td>
                  </tr>
                </tbody>
              </table>
              {store.lastRecord?.rank && store.lastRecord.table === 'campaign' ? <Chip tone="ok">High score — rank {store.lastRecord.rank}</Chip> : null}
            </>
          ) : null}
        </Panel>
        <Panel title="Empires" className="summary-totals" bodyClassName="scroll">
          <table className="table small" data-testid="totals-table">
            <thead>
              <tr>
                <th />
                {ids.map((id) => (
                  <th key={id} className="num" style={{ textAlign: 'right' }}>
                    <span className="row gap" style={{ justifyContent: 'flex-end' }}>
                      <Emblem catalog={catalog} pantheonId={state.players[id]!.pantheonId} size="1.3rem" />
                      {state.players[id]?.name}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.key}>
                  <th>{r.label}</th>
                  {ids.map((id) => (
                    <td key={id} className="num" style={{ textAlign: 'right' }}>
                      {formatNumber(totals[id]?.[r.key] ?? 0)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      </div>
    </div>
  );
}

export function HighScoresScreen() {
  const store = useStore();
  const catalog = store.catalog;
  const [table, setTable] = useState<ScoreTable>(store.lastRecord?.table ?? 'skirmish');
  const [entries, setEntries] = useState<HighScoreEntry[] | null>(null);
  useEffect(() => {
    let live = true;
    void loadHighScores(store.platform.records).then((e) => live && setEntries(e));
    return () => {
      live = false;
    };
  }, [store]);
  const list = useMemo(() => (entries ? sortTable(entries, table) : []), [entries, table]);
  return (
    <div className="screen highscores-screen" data-testid="high-scores">
      <ScreenHeader
        title="High Scores"
        subtitle="The best finished games on this computer"
        right={<Tabs label="Table" tabs={[{ id: 'skirmish' as const, label: 'Skirmish' }, { id: 'campaign' as const, label: 'Campaign' }]} value={table} onChange={setTable} />}
      />
      <Panel className="highscores-panel" bodyClassName="scroll">
        {entries === null ? (
          <EmptyState>Loading…</EmptyState>
        ) : list.length === 0 ? (
          <EmptyState>{table === 'campaign' ? 'Finish a campaign to set the first score.' : 'Finish a skirmish to set the first score.'}</EmptyState>
        ) : (
          <table className="table" data-testid="highscore-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Player</th>
                <th>{table === 'campaign' ? 'Campaign' : 'Map'}</th>
                <th>Result</th>
                <th className="num">Days</th>
                <th>Difficulty</th>
                <th className="num">Score</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {list.map((e, i) => (
                <tr key={e.key}>
                  <td className="num">{i + 1}</td>
                  <td>
                    <span className="row gap">
                      {catalog.pantheons[e.pantheonId] ? <Emblem catalog={catalog} pantheonId={e.pantheonId} size="1.4rem" /> : null}
                      {e.playerName}
                    </span>
                  </td>
                  <td>{e.title}</td>
                  <td>{e.outcome === 'victory' ? <Chip tone="ok">Victory</Chip> : <Chip tone="muted">Defeat</Chip>}</td>
                  <td className="num">{e.days}</td>
                  <td>{e.difficultyId ? (catalog.difficulties?.[e.difficultyId]?.name ?? e.difficultyId) : '—'}</td>
                  <td className="num">{formatNumber(e.score)}</td>
                  <td className="small dim">{relativeTime(e.recordedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
      <footer className="setup-footer">
        <Button onClick={() => store.back()} icon="back">
          Back
        </Button>
        <Button
          variant="ghost"
          disabled={!entries?.length}
          onClick={() =>
            store.confirm('Clear all high scores?', 'Both tables on this computer are emptied. Saves are not affected.', 'Clear', () => {
              void clearHighScores(store.platform.records).then(() => setEntries([]));
            }, { danger: true })
          }
        >
          Clear tables
        </Button>
      </footer>
    </div>
  );
}
