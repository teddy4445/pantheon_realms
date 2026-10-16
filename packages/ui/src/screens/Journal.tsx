/**
 * S14 Quest / Journal: objectives with live progress (from the rules'
 * conditionProgress), claimable rewards, story dialogue, mission help and
 * campaign progress. Markers focus the adventure camera only on known sites.
 * Statuses are icons, not tags; a step already achieved before it opens
 * ("done early") reads as completed (owner request 2026-10-03).
 *
 * 1.1.0 (concept 11): every section is an open book — the list on the left
 * page, the chosen entry on the right (one parchment page when the window is
 * narrow). All primary and optional objectives stay in the list.
 */
import { useState } from 'react';
import { cellIndex, conditionProgress, missionBriefingLines, missionObjectiveDefs, missionSite, missionText, objectiveDoneEarly, objectivePrerequisites, type ObjectiveDefinition, requireScenarioMission } from '@pr/rules';
import { useStore } from '../app/context';
import { HINTS } from '../app/hints';
import { Button, Chip, Tabs } from '../components/kit';
import { MarkerIcon, SpeakerPortrait, briefingArt } from '../components/art';
import { Folio, GuiArtHeader } from '../components/gui';
import { resolveAsset } from '../assets/manifest';
import { ScreenHeader } from '../components/game';
import { Icon, type IconName } from '../assets/icons';
import { carriedFromEarlier, deadlineEntries, evidenceLedger, isV2Mission, knownThreats, missedBecause, objectiveStatusText } from '../app/missionLedger';
import { CarriedList, DeadlineList, EvidenceList, ThreatList } from '../components/missionLedger';
import { chronicleModel } from '../app/chronicle';
import { ChapterSummary, ChronicleGraph } from '../components/chronicle';

/** Quest-marker art per objective status (shape carries the status, not color alone). */
const OBJECTIVE_MARKER: Record<string, string> = {
  active: 'icon.marker.quest',
  available: 'icon.marker.quest',
  completed: 'icon.marker.check',
  failed: 'icon.marker.encounter',
  locked: 'icon.marker.locked',
};

const STATUS: Record<string, { text: string; icon: IconName }> = {
  locked: { text: 'Locked', icon: 'lock' },
  available: { text: 'Ready to claim', icon: 'star' },
  active: { text: 'Active', icon: 'flag' },
  completed: { text: 'Completed', icon: 'check' },
  failed: { text: 'Failed', icon: 'close' },
  /** A missed optional opportunity (content v2): never shown as a defeat. */
  missed: { text: 'Missed', icon: 'hourglass' },
  current: { text: 'In progress', icon: 'flag' },
};

/** A status as a small round icon (shape and tooltip carry it, not colour alone). */
export function StatusIcon({ status }: { status: string }) {
  const s = STATUS[status] ?? STATUS.locked!;
  return (
    <span className={`status-icon is-${status}`} role="img" aria-label={s.text} title={s.text} data-status={status}>
      <Icon name={s.icon} glyph />
    </span>
  );
}

type Tab = 'objectives' | 'ledger' | 'story' | 'help' | 'campaign';

export function DialogueLines({ lines }: { lines: readonly { speaker: string; text: string; portraitAssetId: string }[] }) {
  const catalog = useStore().catalog;
  return (
    <div className="dialogue">
      {lines.map((l, i) => {
        return (
          <div key={i} className="dialogue__line">
            <SpeakerPortrait catalog={catalog} line={l} size="3.4rem" />
            <div>
              <div className="dialogue__speaker">{l.speaker}</div>
              <div className="dialogue__text">{l.text}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function JournalScreen() {
  const store = useStore();
  const catalog = store.catalog;
  const session = store.session!;
  const state = session.state;
  const mission = requireScenarioMission(catalog, state);
  const v2 = isV2Mission(mission);
  const [chosenTab, setTab] = useState<Tab>((store.screen.params.tab as Tab | undefined) ?? 'objectives');
  // The ledger exists for content-v2 chapters only.
  const tab: Tab = chosenTab === 'ledger' && !v2 ? 'objectives' : chosenTab;
  const defs = missionObjectiveDefs(catalog, state);
  const playerId = session.humanPlayerId;
  const explored = state.fog[playerId]?.explored ?? [];
  const campaign = session.campaign ? catalog.campaigns[session.campaign.campaignId] : undefined;

  const titleOf = (id: string) => defs.find((d) => d.id === id)?.title ?? id;
  const statusOf = (o: ObjectiveDefinition) => {
    const st = state.mission.objectives[o.id];
    // A locked step whose condition is already met reads as completed: it completes the moment it opens.
    const early = (st?.status ?? 'locked') === 'locked' && objectiveDoneEarly(catalog, state, o);
    return early ? 'completed' : (st?.status ?? 'locked');
  };
  // Content v2: a failed optional objective is a missed opportunity (its own quiet look, never a defeat).
  const shownStatusOf = (o: ObjectiveDefinition) => {
    const s = statusOf(o);
    return v2 && s === 'failed' && o.category === 'optional' ? 'missed' : s;
  };
  // The entry shown on the right page: the one chosen, else the first one still to do.
  const [chosen, setChosen] = useState<string | null>(null);
  // Content v2: the run's chapter chronicle on the Campaign tab (read-only: where the story stands).
  const chronicle = campaign && session.campaign?.contentVersion === 2 ? chronicleModel(catalog, campaign.id, session.campaign) : null;
  const [chronicleChoice, setChronicleChoice] = useState<string | null>(null);
  const chronicleNode = chronicle ? (chronicle.nodes.find((n) => n.missionId === chronicleChoice) ?? chronicle.nodes.find((n) => n.missionId === session.campaign?.currentMissionId) ?? chronicle.nodes[0]) : undefined;
  const shown = defs.find((d) => d.id === chosen) ?? defs.find((d) => ['available', 'active'].includes(statusOf(d))) ?? defs[0];
  const doneCount = defs.filter((d) => d.category === 'primary' && statusOf(d) === 'completed').length;
  const primaryCount = defs.filter((d) => d.category === 'primary').length;
  const painting = !state.customMission ? briefingArt(mission.thumbnailAssetId) : null;
  const deadlines = v2 ? deadlineEntries(catalog, state) : [];
  const running = deadlines.filter((d) => d.status === 'running');
  const lockedText = (o: ObjectiveDefinition) => {
    const pre = objectivePrerequisites(o).filter((id) => state.mission.objectives[id]?.status !== 'completed');
    return pre.length ? `Opens after: ${pre.map(titleOf).join(', ')}.` : 'Complete earlier objectives to reveal this one.';
  };

  const row = (o: ObjectiveDefinition) => {
    const st = state.mission.objectives[o.id];
    const status = shownStatusOf(o);
    const prog = status === 'completed' || status === 'missed' ? null : conditionProgress(catalog, state, o.condition);
    const selected = shown?.id === o.id;
    return (
      <button
        type="button"
        key={o.id}
        className={`objective is-${status} ${selected ? 'is-selected' : ''}`}
        aria-pressed={selected}
        onClick={() => setChosen(o.id)}
        data-testid={`objective-${o.id}`}
      >
        {resolveAsset(OBJECTIVE_MARKER[status] ?? '').url ? (
          <MarkerIcon assetId={OBJECTIVE_MARKER[status]!} size="1.9rem" />
        ) : (
          <Icon name={status === 'completed' ? 'check' : status === 'failed' ? 'close' : status === 'missed' ? 'hourglass' : status === 'locked' ? 'lock' : 'flag'} className="objective__icon" />
        )}
        <span className="objective__body">
          <span className="objective__title">
            {o.title} <StatusIcon status={status} /> {prog ? <span className="objective__progress num">{prog}</span> : null}
            {st?.completedOnDay ? <span className="faint small"> · day {st.completedOnDay}</span> : null}
          </span>
          <span className="small objective__text">{status === 'locked' ? lockedText(o) : missionText(catalog, state, o.description)}</span>
        </span>
      </button>
    );
  };

  /** The chosen objective in full: status, progress, hint, prerequisites, Show on map and Claim. */
  const detail = (o: ObjectiveDefinition) => {
    const st = state.mission.objectives[o.id];
    const status = shownStatusOf(o);
    const missed = status === 'missed' ? missedBecause(catalog, state, o.id) : null;
    const prog = status === 'completed' || status === 'missed' ? null : conditionProgress(catalog, state, o.condition);
    const site = o.markerSiteId ? missionSite(catalog, state, o.markerSiteId) : undefined;
    const known = site ? explored[cellIndex(state.world.map, site.coord)] === 1 || state.mission.revealedSiteIds.includes(site.id) : false;
    return (
      <article className="journal-entry" data-testid="journal-entry" aria-live="polite">
        <div className="journal-entry__kind">{v2 ? (o.category === 'primary' ? 'Required task' : 'Optional opportunity') : o.category === 'primary' ? 'Objective' : 'Optional objective'}</div>
        <h2 className="journal-entry__title">
          {o.title} <StatusIcon status={status} />
        </h2>
        <p className="journal-entry__text">{status === 'locked' ? lockedText(o) : missionText(catalog, state, o.description)}</p>
        <dl className="journal-entry__facts">
          <div>
            <dt>Status</dt>
            <dd>
              {v2 ? objectiveStatusText(o, statusOf(o)) : status === 'completed' ? 'Completed' : status === 'failed' ? 'Failed' : status === 'available' ? 'Ready to claim' : status === 'locked' ? 'Not open yet' : 'In progress'}
              {st?.completedOnDay ? ` on day ${st.completedOnDay}` : ''}
              {missed?.day ? ` on day ${missed.day}` : ''}
            </dd>
          </div>
          {prog ? (
            <div>
              <dt>Progress</dt>
              <dd className="num">{prog}</dd>
            </div>
          ) : null}
        </dl>
        {status === 'missed' ? (
          <p className="journal-entry__missed" data-testid="journal-missed-note">
            {missed ? `The deadline “${missed.label}” passed, so this opportunity is gone.` : 'This opportunity is gone.'} The chapter continues: nothing required depends on it.
          </p>
        ) : null}
        {o.hint && status !== 'completed' && status !== 'locked' && status !== 'missed' ? <p className="journal-entry__hint">Hint: {missionText(catalog, state, o.hint)}</p> : null}
        <div className="row gap wrap journal-entry__actions">
          {site && status !== 'locked' && status !== 'missed' ? (
            <Button
              icon="eye"
              disabled={!known}
              disabledReason="Location not yet discovered"
              onClick={() => {
                store.focusOn(site.coord);
                store.toAdventure();
              }}
              data-testid={`show-${o.id}`}
            >
              Show on map
            </Button>
          ) : null}
          {o.condition.type === 'claim' && status === 'available' ? (
            <Button variant="primary" onClick={() => store.dispatch({ kind: 'ClaimObjective', objectiveId: o.id })} data-testid={`claim-${o.id}`}>
              Claim
            </Button>
          ) : null}
        </div>
        {site && status !== 'locked' && status !== 'missed' && !known ? <p className="faint small">The place is not discovered yet.</p> : null}
      </article>
    );
  };

  return (
    <div className="screen journal-screen">
      <ScreenHeader title="Journal" />
      <div className="journal-tabs">
        <Tabs<Tab>
          label="Journal sections"
          value={tab}
          onChange={(t) => {
            setTab(t);
            store.setParams({ tab: t });
          }}
          tabs={[
            { id: 'objectives', label: 'Objectives' },
            ...(v2 ? [{ id: 'ledger' as const, label: 'Ledger' }] : []),
            { id: 'story', label: 'Story' },
            { id: 'help', label: 'Mission help' },
            ...(campaign ? [{ id: 'campaign' as const, label: 'Campaign' }] : []),
          ]}
        />
      </div>
      <div className="journal-body journal-book">
        {tab === 'objectives' ? (
          <Folio
            label="Objectives"
            left={
              <>
                <header className="journal-page__head">
                  {painting ? <GuiArtHeader url={painting.url} alt="" wide /> : null}
                  <h2 className="journal-page__title">{mission.name}</h2>
                  <p className="journal-page__summary">{mission.summary}</p>
                </header>
                {v2 && running.length ? (
                  <ul className="journal-running" aria-label="Running deadlines" data-testid="journal-running-deadlines">
                    {running.map((d) => (
                      <li key={d.id}>
                        <Icon name="hourglass" className="journal-running__icon" />
                        <span>
                          <strong>{d.label}</strong> · {d.text}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : null}
                <div className="journal-list" role="group" aria-label={v2 ? 'Required tasks' : 'Primary objectives'} data-testid="journal-required">
                  <div className="journal-list__head">{v2 ? 'Required tasks' : 'Primary objectives'}</div>
                  {defs.filter((o) => o.category === 'primary').map(row)}
                </div>
                <div className="journal-list" role="group" aria-label={v2 ? 'Optional opportunities' : 'Optional objectives'} data-testid="journal-optional">
                  <div className="journal-list__head">{v2 ? 'Optional opportunities' : 'Optional objectives'}</div>
                  {defs.filter((o) => o.category === 'optional').length === 0 ? <p className="dim small">None.</p> : defs.filter((o) => o.category === 'optional').map(row)}
                </div>
                <div className="journal-progress" data-testid="journal-progress">
                  <span>
                    {doneCount} of {primaryCount} {v2 ? 'required tasks' : 'objectives'} complete
                  </span>
                  <span className="journal-progress__bar" role="meter" aria-valuemin={0} aria-valuemax={primaryCount} aria-valuenow={doneCount} aria-label={v2 ? 'Required tasks completed' : 'Primary objectives completed'}>
                    <span style={{ width: `${primaryCount ? (100 * doneCount) / primaryCount : 0}%` }} />
                  </span>
                </div>
              </>
            }
            right={shown ? detail(shown) : <p className="dim">No objectives.</p>}
          />
        ) : null}
        {tab === 'ledger' && v2 ? (
          <Folio
            label="Ledger"
            className="journal-ledger"
            left={
              <>
                <section className="ledger-section" aria-labelledby="ledger-deadlines">
                  <h2 className="ledger-section__title" id="ledger-deadlines">
                    Deadlines
                  </h2>
                  {deadlines.length === 0 ? <p className="ledger-empty">No deadline has been announced in this chapter.</p> : <DeadlineList entries={deadlines} />}
                </section>
                <section className="ledger-section" aria-labelledby="ledger-threats">
                  <h2 className="ledger-section__title" id="ledger-threats">
                    Known threats
                  </h2>
                  <ThreatList threats={knownThreats(catalog, state, mission)} />
                </section>
              </>
            }
            right={
              <>
                <section className="ledger-section" aria-labelledby="ledger-evidence">
                  <h2 className="ledger-section__title" id="ledger-evidence">
                    Evidence &amp; decisions
                  </h2>
                  <EvidenceList entries={evidenceLedger(mission, state.mission.flags)} />
                </section>
                <section className="ledger-section" aria-labelledby="ledger-carried">
                  <h2 className="ledger-section__title" id="ledger-carried">
                    Carried from earlier chapters
                  </h2>
                  <CarriedList carried={carriedFromEarlier(catalog, mission, state.mission.flags)} firstChapter={mission.order <= 1} />
                </section>
              </>
            }
          />
        ) : null}
        {tab === 'story' ? (
          <Folio
            label="Story so far"
            left={
              <>
                <h2 className="journal-page__title">Story so far</h2>
                <p className="journal-page__summary">{mission.summary}</p>
                <DialogueLines lines={missionBriefingLines(mission, state.mission.flags)} />
              </>
            }
            right={
              <>
                <h2 className="journal-page__title">Scenes</h2>
                {(state.mission.scenesPlayed ?? []).length === 0 ? <p className="dim small">No scenes yet.</p> : null}
                {(state.mission.scenesPlayed ?? []).map((id) => {
                  const scene = mission.storyScenes?.find((x) => x.id === id);
                  return scene ? (
                    <div key={id} data-testid={`journal-scene-${id}`}>
                      <DialogueLines lines={scene.lines} />
                      <Button size="small" variant="ghost" onClick={() => store.playStory({ key: `replay:${id}:${Date.now()}`, title: 'Replay', lines: scene.lines })}>
                        Replay scene
                      </Button>
                      <div className="ornament-rule" />
                    </div>
                  ) : null;
                })}
                {(mission.storyScenes?.length ?? 0) > (state.mission.scenesPlayed?.length ?? 0) ? <p className="faint small">More of the story unfolds as you play.</p> : null}
              </>
            }
          />
        ) : null}
        {tab === 'help' ? (
          <Folio
            label="Mission help"
            left={
              <>
                <h2 className="journal-page__title">Mission help</h2>
                {mission.helpTopics.length === 0 ? <p className="dim">No special rules for this mission.</p> : null}
                {mission.helpTopics.map((h) => (
                  <div key={h.id} className="help-topic">
                    <h3>{h.title}</h3>
                    <p>{h.text}</p>
                  </div>
                ))}
                {mission.newDecisions.length ? (
                  <>
                    <h3>New in this mission</h3>
                    <ul className="bullets">
                      {mission.newDecisions.map((d) => (
                        <li key={d}>{d}</li>
                      ))}
                    </ul>
                  </>
                ) : null}
              </>
            }
            right={
              <details className="help-topic" data-testid="journal-tips" open>
                <summary>
                  <h3 style={{ display: 'inline' }}>All tips</h3>
                </summary>
                {Object.values(HINTS).map((h) => (
                  <p key={h.id}>
                    <strong>{h.title}.</strong> {h.text}
                  </p>
                ))}
              </details>
            }
          />
        ) : null}
        {tab === 'campaign' && campaign && session.campaign ? (
          <Folio
            label={campaign.name}
            left={
              <>
                <h2 className="journal-page__title">{campaign.name}</h2>
                <div className="row gap">
                  <Chip tone={session.campaign.branch === 'primary' ? 'ok' : 'warn'}>{session.campaign.branch === 'primary' ? 'Primary run' : 'Practice replay'}</Chip>
                  <Chip>{session.campaign.battlesWon} battles won</Chip>
                </div>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Mission</th>
                      <th>Status</th>
                      <th>Days</th>
                      <th>Hero</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(session.campaign.contentVersion === 2 && campaign.chapters ? campaign.chapters.map((c) => c.missionId) : campaign.missionIds).map((mid) => {
                      const m = catalog.missions[mid];
                      const rec = session.campaign!.completions.find((c) => c.missionId === mid);
                      const current = session.campaign!.currentMissionId === mid;
                      return (
                        <tr key={mid}>
                          <td>
                            {m?.order}. {m?.name}
                          </td>
                          <td>
                            <StatusIcon status={rec ? 'completed' : current ? 'current' : 'locked'} />
                          </td>
                          <td className="num">{rec?.summary.days ?? '—'}</td>
                          <td>{rec ? `Lv ${rec.summary.heroLevel} · ${rec.summary.heroXp} XP${rec.summary.xpCapped ? ' (capped)' : ''}` : '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </>
            }
            right={
              <>
                {chronicle && chronicleNode ? (
                  <div className="journal-chronicle" data-testid="journal-chronicle">
                    <h2 className="journal-page__title">Chronicle</h2>
                    <ChronicleGraph model={chronicle} selectedId={chronicleNode.missionId} onSelect={setChronicleChoice} compact />
                    <ChapterSummary catalog={catalog} node={chronicleNode} compact />
                  </div>
                ) : null}
                <h2 className="journal-page__title">Carryover</h2>
                <table className="table">
                  <tbody>
                    {campaign.carryoverPolicy.map((p) => (
                      <tr key={p.category}>
                        <th>{p.category}</th>
                        <td>{p.policy}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            }
          />
        ) : null}
      </div>
    </div>
  );
}
