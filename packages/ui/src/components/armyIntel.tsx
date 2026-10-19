/**
 * ArmyIntelPanel (expedition kit §05/§11, `scoutingIntelV1`): the projected report on an
 * enemy army — stage, owner banner, strength band, identified creature types (portraits),
 * quantity ranges, LAST KNOWN with its date, and an earlier detailed report kept apart.
 * It receives only the view model of app/intel.ts (built from the rules' projection), so
 * neither its text nor its labels nor its tooltips can hold a hidden count. The stage track
 * shows the rules' stage; it is not a control (no knowledge is player-selectable).
 */
import { useMemo } from 'react';
import type { ContentCatalog } from '@pr/rules';
import { Icon } from '../assets/icons';
import { resolveAsset } from '../assets/manifest';
import { CreaturePortrait } from './art';
import type { ArmyIntelView, IntelCreatureView, IntelViewStage } from '../app/intel';

const STAGES: readonly { id: IntelViewStage; label: string; icon: 'sighting' | 'identified' | 'scouted' }[] = [
  { id: 'sighting', label: 'Sighting', icon: 'sighting' },
  { id: 'identified', label: 'Identified', icon: 'identified' },
  { id: 'scouted', label: 'Scouted', icon: 'scouted' },
];

function CreatureLines({ catalog, creatures, compact, testId }: { catalog: ContentCatalog; creatures: readonly IntelCreatureView[]; compact: boolean; testId: string }) {
  return (
    <ul className="army-intel__creatures" data-testid={testId}>
      {creatures.map((c) => {
        const label = c.range ? `${c.name}: about ${c.range}` : `${c.name}: number unknown`;
        return (
          <li key={c.creatureId} className="army-intel__creature" aria-label={label} title={label} data-creature={c.creatureId}>
            <span className="army-intel__art">
              <CreaturePortrait catalog={catalog} creatureId={c.creatureId} size="100%" style={{ border: 'none', boxShadow: 'none', width: '100%', height: '100%' }} />
            </span>
            {compact ? null : <span className="army-intel__name">{c.name}</span>}
            <span className={`army-intel__count num ${c.range ? '' : 'is-unknown'}`} aria-hidden="true">
              {c.range ?? '?'}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export function ArmyIntelPanel({ catalog, view, compact = false, testId = 'army-intel' }: { catalog: ContentCatalog; view: ArmyIntelView; compact?: boolean; testId?: string }) {
  const stale = view.mode === 'last_known';
  const rank = STAGES.findIndex((s) => s.id === view.stage);
  const vignette = useMemo(() => resolveAsset('expedition.scout-unknown').url, []);
  return (
    <section
      className={`army-intel army-intel--${view.stage} ${stale ? 'is-stale' : ''} ${compact ? 'army-intel--compact' : ''}`}
      aria-label={view.summary}
      data-testid={testId}
      data-stage={view.stage}
      data-mode={view.mode}
    >
      <header className="army-intel__head">
        <Icon name={stale ? 'staleReport' : STAGES[rank]!.icon} className="army-intel__stage-icon" />
        <div className="army-intel__titles">
          <h4 className="army-intel__title" data-testid={`${testId}-title`}>
            {stale ? `Last known · ${view.title}` : view.title}
          </h4>
          <div className="army-intel__who">
            <span className="army-intel__banner" style={view.ownerColor ? { background: view.ownerColor } : undefined} aria-hidden="true" />
            <span className="army-intel__name-line">{view.name}</span>
            <span className="army-intel__owner dim">· {view.ownerName}</span>
          </div>
        </div>
      </header>
      {view.creatures ? (
        <CreatureLines catalog={catalog} creatures={view.creatures} compact={compact} testId={`${testId}-creatures`} />
      ) : (
        <div className="army-intel__unknown" data-testid={`${testId}-unknown`}>
          {view.figureCreatureId ? (
            <span className="army-intel__figure" title={catalog.creatures[view.figureCreatureId]?.pluralName}>
              <CreaturePortrait catalog={catalog} creatureId={view.figureCreatureId} size="100%" style={{ border: 'none', boxShadow: 'none', width: '100%', height: '100%' }} />
            </span>
          ) : vignette ? (
            <img className="army-intel__vignette" src={vignette} alt="" aria-hidden="true" />
          ) : (
            <span className="army-intel__vignette army-intel__vignette--drawn" aria-hidden="true">?</span>
          )}
          <span className="army-intel__unknown-text">Creatures unknown</span>
        </div>
      )}
      <div className="army-intel__strength" data-testid={`${testId}-strength`}>
        Strength: <strong>{view.strength}</strong>
      </div>
      {compact ? null : <p className="army-intel__note">{view.note}</p>}
      <ol className="army-intel__track" aria-label="Observation stage">
        {STAGES.map((s, i) => (
          <li key={s.id} className={`army-intel__step ${i <= rank ? 'is-reached' : ''} ${i === rank ? 'is-current' : ''}`} aria-current={i === rank ? 'step' : undefined}>
            <Icon name={s.icon} className="army-intel__step-icon" />
            <span>{s.label}</span>
          </li>
        ))}
      </ol>
      <div className={`army-intel__observed ${stale ? 'warn' : ''}`} data-testid={`${testId}-observed`}>
        {view.observed}
      </div>
      {view.earlier ? (
        <div className="army-intel__earlier" data-testid={`${testId}-earlier`}>
          <div className="army-intel__earlier-head">
            <Icon name="staleReport" className="inline-icon" /> {view.earlier.observed} · {view.earlier.title} (not a current estimate)
          </div>
          <CreatureLines catalog={catalog} creatures={view.earlier.creatures} compact testId={`${testId}-earlier-creatures`} />
        </div>
      ) : null}
      {stale || view.stage !== 'scouted' ? null : <div className="army-intel__hint faint small">Last-seen reports do not update through fog.</div>}
    </section>
  );
}
