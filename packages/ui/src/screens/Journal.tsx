/**
 * S14 Quest / Journal: objectives with live progress (from the rules'
 * conditionProgress), claimable rewards, story dialogue, mission help and
 * campaign progress. Markers focus the adventure camera only on known sites.
 */
import { useState } from 'react';
import { cellIndex, conditionProgress, missionObjectiveDefs, missionSite, objectiveDoneEarly, objectivePrerequisites, type ObjectiveDefinition, requireScenarioMission } from '@pr/rules';
import { useStore } from '../app/context';
import { HINTS } from '../app/hints';
import { Button, Chip, Panel, Tabs } from '../components/kit';
import { MarkerIcon, SpeakerPortrait, HeroPortrait } from '../components/art';
import { resolveAsset } from '../assets/manifest';
import { ScreenHeader } from '../components/game';
import { Icon } from '../assets/icons';

/** Quest-marker art per objective status (shape carries the status, not color alone). */
const OBJECTIVE_MARKER: Record<string, string> = {
  active: 'icon.marker.quest',
  available: 'icon.marker.quest',
  completed: 'icon.marker.check',
  failed: 'icon.marker.encounter',
  locked: 'icon.marker.locked',
};

const STATUS: Record<string, { text: string; tone: 'ok' | 'warn' | 'bad' | 'info' | 'muted' }> = {
  locked: { text: 'Locked', tone: 'muted' },
  available: { text: 'Ready to claim', tone: 'info' },
  active: { text: 'Active', tone: 'warn' },
  completed: { text: 'Completed', tone: 'ok' },
  failed: { text: 'Failed', tone: 'bad' },
};

type Tab = 'objectives' | 'story' | 'help' | 'campaign';

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
  const [tab, setTab] = useState<Tab>((store.screen.params.tab as Tab | undefined) ?? 'objectives');
  const defs = missionObjectiveDefs(catalog, state);
  const playerId = session.humanPlayerId;
  const explored = state.fog[playerId]?.explored ?? [];
  const campaign = session.campaign ? catalog.campaigns[session.campaign.campaignId] : undefined;

  const titleOf = (id: string) => defs.find((d) => d.id === id)?.title ?? id;
  const lockedText = (o: ObjectiveDefinition) => {
    const pre = objectivePrerequisites(o).filter((id) => state.mission.objectives[id]?.status !== 'completed');
    return pre.length ? `Opens after: ${pre.map(titleOf).join(', ')}.` : 'Complete earlier objectives to reveal this one.';
  };

  const row = (o: ObjectiveDefinition) => {
    const st = state.mission.objectives[o.id];
    const status = st?.status ?? 'locked';
    const prog = status === 'completed' ? null : conditionProgress(catalog, state, o.condition);
    const site = o.markerSiteId ? missionSite(catalog, state, o.markerSiteId) : undefined;
    const known = site ? explored[cellIndex(state.world.map, site.coord)] === 1 || state.mission.revealedSiteIds.includes(site.id) : false;
    return (
      <div key={o.id} className={`objective is-${status}`} data-testid={`objective-${o.id}`}>
        {resolveAsset(OBJECTIVE_MARKER[status] ?? '').url ? (
          <MarkerIcon assetId={OBJECTIVE_MARKER[status]!} size="1.9rem" />
        ) : (
          <Icon name={status === 'completed' ? 'check' : status === 'failed' ? 'close' : status === 'locked' ? 'lock' : 'flag'} className="objective__icon" />
        )}
        <div className="objective__body">
          <div className="objective__title">
            {o.title} <Chip tone={STATUS[status]!.tone}>{STATUS[status]!.text}</Chip> {prog ? <Chip>{prog}</Chip> : null}
            {st?.completedOnDay ? <span className="faint small"> · day {st.completedOnDay}</span> : null}
          </div>
          <div className="small">{status === 'locked' ? lockedText(o) : o.description}</div>
          {objectiveDoneEarly(catalog, state, o) ? (
            <div className="small">
              <Chip tone="ok">Done early</Chip> <span className="faint">Already achieved — it counts as soon as this step opens.</span>
            </div>
          ) : null}
          {o.hint && status !== 'completed' && status !== 'locked' ? <div className="faint small">Hint: {o.hint}</div> : null}
          <div className="row gap">
            {site && status !== 'locked' ? (
              <Button
                size="small"
                icon="eye"
                disabled={!known}
                disabledReason="Location not yet discovered"
                onClick={() => {
                  store.focusOn(site.coord);
                  store.toAdventure();
                }}
              >
                Show on map
              </Button>
            ) : null}
            {o.condition.type === 'claim' && status === 'available' ? (
              <Button size="small" variant="primary" onClick={() => store.dispatch({ kind: 'ClaimObjective', objectiveId: o.id })} data-testid={`claim-${o.id}`}>
                Claim
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="screen journal-screen">
      <ScreenHeader title="Journal" subtitle={`${mission.name} — ${mission.subtitle}`} />
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
            { id: 'story', label: 'Story' },
            { id: 'help', label: 'Mission help' },
            ...(campaign ? [{ id: 'campaign' as const, label: 'Campaign' }] : []),
          ]}
        />
      </div>
      <div className="journal-body">
        {tab === 'objectives' ? (
          <>
            <Panel title="Primary objectives" bodyClassName="scroll">
              {defs.filter((o) => o.category === 'primary').map(row)}
            </Panel>
            <Panel title="Optional objectives" bodyClassName="scroll">
              {defs.filter((o) => o.category === 'optional').length === 0 ? <p className="dim">None.</p> : defs.filter((o) => o.category === 'optional').map(row)}
            </Panel>
          </>
        ) : null}
        {tab === 'story' ? (
          <Panel title="Story so far" bodyClassName="scroll" className="journal-wide" >
            <p className="dim">{mission.summary}</p>
            <DialogueLines lines={mission.briefing} />
            {(state.mission.scenesPlayed ?? []).map((id) => {
              const scene = mission.storyScenes?.find((x) => x.id === id);
              return scene ? (
                <div key={id} data-testid={`journal-scene-${id}`}>
                  <div className="ornament-rule" />
                  <DialogueLines lines={scene.lines} />
                  <Button size="small" variant="ghost" onClick={() => store.playStory({ key: `replay:${id}:${Date.now()}`, title: 'Replay', lines: scene.lines })}>
                    Replay scene
                  </Button>
                </div>
              ) : null;
            })}
            {(mission.storyScenes?.length ?? 0) > (state.mission.scenesPlayed?.length ?? 0) ? <p className="faint small">More of the story unfolds as you play.</p> : null}
          </Panel>
        ) : null}
        {tab === 'help' ? (
          <Panel title="Mission help" bodyClassName="scroll" className="journal-wide">
            {mission.helpTopics.length === 0 ? <p className="dim">No special rules for this mission.</p> : null}
            {mission.helpTopics.map((h) => (
              <div key={h.id} className="help-topic">
                <h3>{h.title}</h3>
                <p>{h.text}</p>
              </div>
            ))}
            <details className="help-topic" data-testid="journal-tips">
              <summary>
                <h3 style={{ display: 'inline' }}>All tips</h3>
              </summary>
              {Object.values(HINTS).map((h) => (
                <p key={h.id}>
                  <strong>{h.title}.</strong> {h.text}
                </p>
              ))}
            </details>
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
          </Panel>
        ) : null}
        {tab === 'campaign' && campaign && session.campaign ? (
          <Panel title={campaign.name} bodyClassName="scroll" className="journal-wide">
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
                {campaign.missionIds.map((mid) => {
                  const m = catalog.missions[mid];
                  const rec = session.campaign!.completions.find((c) => c.missionId === mid);
                  const current = session.campaign!.currentMissionId === mid;
                  return (
                    <tr key={mid}>
                      <td>
                        {m?.order}. {m?.name}
                      </td>
                      <td>{rec ? <Chip tone="ok">Completed</Chip> : current ? <Chip tone="warn">In progress</Chip> : <Chip tone="muted">Locked</Chip>}</td>
                      <td className="num">{rec?.summary.days ?? '—'}</td>
                      <td>{rec ? `Lv ${rec.summary.heroLevel} · ${rec.summary.heroXp} XP${rec.summary.xpCapped ? ' (capped)' : ''}` : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <h3>Carryover</h3>
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
          </Panel>
        ) : null}
      </div>
    </div>
  );
}
