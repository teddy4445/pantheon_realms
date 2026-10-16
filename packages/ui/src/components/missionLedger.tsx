/**
 * Campaign content v2 in the interface (expansion of 2026-10-15): the Journal's
 * ledger sections (deadlines, evidence & decisions, known threats, what was
 * carried from earlier chapters), the mission introduction's chapter facts and
 * the adventure HUD's running deadline. Presentation only: every entry comes
 * from the view models in `app/missionLedger.ts`; the locate actions only move
 * the camera to a site the player already knows.
 */
import { missionSite, type EvidenceDefinition } from '@pr/rules';
import { useStore } from '../app/context';
import {
  EVIDENCE_ICON,
  MANUAL_BATTLE_ICON,
  MANUAL_BATTLE_NOTICE,
  THREAT_STATUS_TEXT,
  daysLeftText,
  runningDeadlines,
  siteKnown,
  type CarriedLedger,
  type DeadlineEntry,
  type MissionIntro,
  type ThreatEntry,
} from '../app/missionLedger';
import { Icon } from '../assets/icons';
import { resolveArt, type StoryArtRecord } from '../assets/manifest';
import { briefingArt } from '../assets/storyArt';
import { ArtIcon } from './frontend';
import { Button } from './kit';

const DEADLINE_STATUS: Record<DeadlineEntry['status'], string> = {
  announced: 'Announced',
  running: 'Running',
  met: 'Met',
  expired: 'Expired',
};

/** The introduction's painting: a v2 chapter's cover (`briefingArt[0]`), else the mission's briefing art. */
export function introCoverArt(intro: Pick<MissionIntro, 'coverAssetId'>, thumbnailAssetId: string): StoryArtRecord | null {
  return (intro.coverAssetId ? resolveArt(intro.coverAssetId) : null) ?? briefingArt(thumbnailAssetId);
}

/** A ledger entry's painted icon with its accessible name (glyph when the art is missing). */
export function LedgerIcon({ icon, size = '2rem' }: { icon: EvidenceDefinition['icon']; size?: string }) {
  const def = EVIDENCE_ICON[icon];
  return <ArtIcon id={def.id} label={def.label} glyph="journal" size={size} className="ledger-item__icon" />;
}

/** One line: the manual-battle icon and its sentence (the introduction; not a persistent warning). */
export function ManualBattleNotice({ className = '' }: { className?: string }) {
  return (
    <p className={`manual-battle-notice ${className}`} data-testid="manual-battle-notice">
      <ArtIcon id={MANUAL_BATTLE_ICON} glyph="sword2" size="1.5rem" className="manual-battle-notice__icon" />
      <span>{MANUAL_BATTLE_NOTICE}.</span>
    </p>
  );
}

export function DeadlineList({ entries, testId = 'journal-deadlines' }: { entries: readonly DeadlineEntry[]; testId?: string }) {
  return (
    <ul className="ledger-list" data-testid={testId}>
      {entries.map((d) => (
        <li key={d.id} className={`ledger-item ledger-deadline is-${d.status}`} data-testid={`deadline-${d.id}`} data-status={d.status}>
          <Icon name={d.status === 'met' ? 'check' : 'hourglass'} className="ledger-item__glyph" />
          <div className="ledger-item__body">
            <div className="ledger-item__title">
              <span>{d.label}</span>
              <span className={`ledger-tag is-${d.status}`}>{DEADLINE_STATUS[d.status]}</span>
            </div>
            <div className="ledger-item__line" data-testid={`deadline-${d.id}-text`}>
              {d.text}
            </div>
            {d.consequence && (d.status === 'running' || d.status === 'expired') ? <div className="ledger-item__note">{d.consequence}</div> : null}
          </div>
        </li>
      ))}
    </ul>
  );
}

export function EvidenceList({ entries }: { entries: readonly EvidenceDefinition[] }) {
  if (entries.length === 0) {
    return (
      <p className="ledger-empty" data-testid="journal-evidence-empty">
        Nothing recorded yet. Evidence you find and the decisions you make are written here.
      </p>
    );
  }
  return (
    <ul className="ledger-list" data-testid="journal-evidence">
      {entries.map((e) => (
        <li key={e.id} className={`ledger-item ledger-evidence is-${e.icon}`} data-testid={`evidence-${e.id}`}>
          <LedgerIcon icon={e.icon} />
          <div className="ledger-item__body">
            <div className="ledger-item__title">{e.title}</div>
            <div className="ledger-item__line">{e.text}</div>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function ThreatList({ threats }: { threats: readonly ThreatEntry[] }) {
  const store = useStore();
  const session = store.session!;
  const state = session.state;
  if (threats.length === 0) return <p className="ledger-empty">No hostile patrols are reported in this region.</p>;
  return (
    <ul className="ledger-list" data-testid="journal-threats">
      {threats.map((t) => {
        const home = t.homeSiteId ? missionSite(store.catalog, state, t.homeSiteId) : undefined;
        const known = !!t.homeSiteId && siteKnown(store.catalog, state, session.humanPlayerId, t.homeSiteId);
        return (
          <li key={t.id} className={`ledger-item ledger-threat is-${t.status}`} data-testid={`threat-${t.id}`} data-status={t.status}>
            <Icon name={t.status === 'withdrawn' || t.status === 'defeated' ? 'check' : 'sword2'} className="ledger-item__glyph" />
            <div className="ledger-item__body">
              <div className="ledger-item__title">
                <span>{t.name}</span>
                <span className={`ledger-tag is-${t.status}`}>{THREAT_STATUS_TEXT[t.status]}</span>
              </div>
              <div className="ledger-item__line">{t.purpose}</div>
              {t.status === 'withdrawn' && t.homeFallen && t.homeName ? <div className="ledger-item__note">{t.homeName} has fallen: the patrol has withdrawn for good.</div> : null}
              {home && known ? (
                <Button
                  size="small"
                  variant="ghost"
                  icon="eye"
                  className="ledger-item__locate"
                  onClick={() => {
                    store.focusOn(home.coord);
                    store.toAdventure();
                  }}
                  data-testid={`threat-${t.id}-locate`}
                >
                  Show {home.name} on map
                </Button>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function CarriedList({ carried, firstChapter }: { carried: CarriedLedger; firstChapter: boolean }) {
  if (carried.bonuses.length === 0 && carried.facts.length === 0) {
    return <p className="ledger-empty">{firstChapter ? 'This is the first chapter: nothing is carried yet.' : 'Nothing was carried from earlier chapters.'}</p>;
  }
  return (
    <div className="ledger-carried" data-testid="journal-carried">
      {carried.bonuses.length ? (
        <>
          <div className="ledger-subhead">Granted at the start of this chapter</div>
          <ul className="ledger-list" data-testid="journal-bonuses">
            {carried.bonuses.map((b) => (
              <li key={b.fact} className="ledger-item ledger-bonus" data-testid={`bonus-${b.fact}`}>
                <Icon name="gift" className="ledger-item__glyph" />
                <div className="ledger-item__body">
                  <div className="ledger-item__line">{b.label}</div>
                </div>
              </li>
            ))}
          </ul>
        </>
      ) : null}
      {carried.facts.length ? (
        <>
          <div className="ledger-subhead">Known from earlier chapters</div>
          <ul className="ledger-list" data-testid="journal-facts">
            {carried.facts.map((f) => (
              <li key={f.flag} className="ledger-item ledger-fact" data-testid={`fact-${f.flag}`}>
                {f.icon ? <LedgerIcon icon={f.icon} size="1.7rem" /> : <Icon name="journal" className="ledger-item__glyph" />}
                <div className="ledger-item__body">
                  <div className="ledger-item__title">{f.title}</div>
                  {f.text ? <div className="ledger-item__line">{f.text}</div> : null}
                </div>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  );
}

/** The adventure HUD: each running deadline (label and days left) under the objectives. */
export function DeadlineTracker() {
  const store = useStore();
  const state = store.session?.state;
  if (!state) return null;
  const list = runningDeadlines(store.catalog, state);
  if (list.length === 0) return null;
  return (
    <ul className="deadline-mini" aria-label="Deadlines" data-testid="hud-deadlines">
      {list.map((d) => (
        <li
          key={d.id}
          className={`deadline-mini__item ${d.daysLeft !== null && d.daysLeft <= 1 ? 'is-urgent' : ''}`}
          title={`${d.text}.${d.consequence ? ` ${d.consequence}` : ''}`}
          data-testid={`hud-deadline-${d.id}`}
        >
          <Icon name="hourglass" className="inline-icon" />
          <span className="deadline-mini__label">{d.label}</span>
          <span className="deadline-mini__days num">{d.daysLeft !== null ? daysLeftText(d.daysLeft) : ''}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * The chapter facts in the mission introduction (content v2): the required
 * tasks open now, any announced or running deadline, the entry bonuses carried
 * in and the loss conditions.
 */
export function IntroChapterFacts({ intro, optionalCount }: { intro: MissionIntro; optionalCount: number }) {
  return (
    <div className="brief__v2" data-testid="briefing-v2">
      <h2 className="brief__obj-title">Required tasks</h2>
      <ul className="brief__tasks" data-testid="briefing-tasks">
        {intro.requiredTasks.map((t) => (
          <li key={t.id} className={`brief__task is-${t.status}`}>
            <Icon name={t.status === 'completed' ? 'check' : 'flag'} className="brief__task-icon" />
            <span>{t.title}</span>
          </li>
        ))}
      </ul>
      {intro.laterTasks > 0 || optionalCount > 0 ? (
        <p className="brief__note">
          {intro.laterTasks > 0 ? `${intro.laterTasks} more required ${intro.laterTasks === 1 ? 'task opens' : 'tasks open'} as the chapter unfolds. ` : ''}
          {optionalCount > 0 ? `${optionalCount} optional ${optionalCount === 1 ? 'opportunity is' : 'opportunities are'} in the Journal.` : ''}
        </p>
      ) : null}
      {intro.deadlines.length ? (
        <>
          <h3 className="brief__sub">{intro.deadlines.length === 1 ? 'Deadline' : 'Deadlines'}</h3>
          <ul className="brief__facts-list" data-testid="briefing-deadlines">
            {intro.deadlines.map((d) => (
              <li key={d.id}>
                <Icon name="hourglass" className="brief__task-icon" />
                <span>
                  <strong>{d.label}.</strong> {d.status === 'running' ? `${d.text}.` : d.text}
                  {d.status === 'running' && d.consequence ? <span className="brief__fine"> {d.consequence}</span> : null}
                </span>
              </li>
            ))}
          </ul>
        </>
      ) : null}
      {intro.entryBonuses.length ? (
        <>
          <h3 className="brief__sub">Carried from earlier chapters</h3>
          <ul className="brief__facts-list" data-testid="briefing-bonuses">
            {intro.entryBonuses.map((b) => (
              <li key={b}>
                <Icon name="gift" className="brief__task-icon" />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </>
      ) : null}
      {intro.lossConditions.length ? (
        <>
          <h3 className="brief__sub">Loss conditions</h3>
          <ul className="brief__facts-list" data-testid="briefing-loss">
            {intro.lossConditions.map((l) => (
              <li key={l}>
                <Icon name="info" className="brief__task-icon" />
                <span>{l}</span>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  );
}
