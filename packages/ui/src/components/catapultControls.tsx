/**
 * CatapultControls (expedition kit 2026-10-17, handoff §10–11): the siege attacker's stationary
 * catapult (`targetableCatapultV1`).
 *
 *  - `CatapultStatus` — one line in the engine side's header box, for both sides (the engine stands in
 *    plain sight): HP, its explicit target (or that it must choose again), fired / destroyed, and a
 *    details card (Defense, what hurts it) that the engine's right-click on the board opens too.
 *  - `CatapultPhasePanel` — in its own phase, for its human commander: a labelled list of the
 *    structures it can hit (name and current structure HP) with Fire and Skip, above the battle bar
 *    while no creature acts.
 *
 * Choosing a target in the list or on the battlefield sends the same validated order
 * (`BattleAimCatapult`); Fire and Skip are `BattleFireCatapult` / `BattleSkipCatapult` for the current
 * round, so a double press can never fire twice. Keyboard: the list is one tab stop (↑/↓ move, Enter
 * aims), then Tab to Fire and Skip. Live data only; no rule lives here.
 */
import { useEffect, useRef, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { catapultStatus, previewCatapultTarget, structureLabel, type CommandPayload, type ContentCatalog, type MatchState } from '@pr/rules';
import { Bar, Button } from './kit';
import { Icon } from '../assets/icons';

const KIND_LABEL: Record<string, string> = { wall: 'Wall', gate: 'Gate', tower: 'Tower', keep: 'Keep' };

export interface CatapultStatusProps {
  readonly catalog: ContentCatalog;
  readonly state: MatchState;
  /** Which side the viewer plays (null: watching computer sides). */
  readonly viewerSide: 'attacker' | 'defender' | null;
  readonly cardOpen: boolean;
  readonly onToggleCard: () => void;
}

/** The engine's one-line status in its side's header box, with its details card. */
export function CatapultStatus({ catalog, state, viewerSide, cardOpen, onToggleCard }: CatapultStatusProps) {
  const battle = state.battle;
  const st = battle ? catapultStatus(battle) : null;
  if (!battle || !st) return null;
  const destroyed = st.stage === 'destroyed';
  const mine = viewerSide === st.side;
  const aimed = st.aimedStructureId;
  const text = destroyed
    ? 'Destroyed: no more shots this siege.'
    : st.phaseActive
      ? mine
        ? 'Catapult phase: choose a target, then Fire or Skip.'
        : 'The enemy catapult takes aim…'
      : `${st.firedThisRound ? 'Fired this round' : 'Fires after every creature has acted'} · target: ${aimed ? structureLabel(aimed) : st.aimLost ? 'fallen, choose again' : 'not chosen'}.`;
  return (
    <div className={`catapult-status${destroyed ? ' is-destroyed' : ''}`} data-testid="catapult-controls" data-stage={st.stage} data-phase={st.phaseActive ? 'engine' : 'creatures'} data-aim={aimed ?? ''} aria-label="Siege catapult">
      <div className="catapult-status__line small">
        <Icon name={destroyed ? 'wreck' : 'catapult'} className="inline-icon" />
        <span className="catapult-status__name">Catapult</span>
        <span className="catapult-status__hp num" data-testid="catapult-hp" title={`Engine HP ${st.hp} of ${st.maxHp} (creature damage; structure HP is separate)`}>
          {st.hp}/{st.maxHp}
        </span>
        <span className="catapult-status__bar">
          <Bar value={st.hp} max={st.maxHp} kind="hp" label="Catapult health" />
        </span>
        <Button size="small" variant="ghost" icon="inspect" onClick={onToggleCard} aria-expanded={cardOpen} aria-label="Catapult details" data-testid="catapult-inspect" />
      </div>
      <div className="catapult-status__state small faint" role="status" aria-live="polite" data-testid="catapult-state">
        {text}
      </div>
      {cardOpen ? (
        <div className="catapult-card panel small" data-testid="catapult-card">
          <div className="catapult-card__stats">
            <Icon name="defense" className="inline-icon" /> Defense {st.defense} · <Icon name="hp" className="inline-icon" /> {st.hp}/{st.maxHp} HP · {st.stage}
          </div>
          <div className="faint">
            A stationary siege engine of the besiegers, not a creature: it never moves or retaliates and has no morale or luck. Creature blows, shots and damage spells hurt it (area damage once); spells of the mind, life and healing do not. It hits {catalog.rulesProfile.combat.siege.catapultDamage} structure HP per shot, once per round, after every creature has acted.
          </div>
          <Button size="small" icon="close" onClick={onToggleCard} data-testid="catapult-card-close">
            Close
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export interface CatapultPhasePanelProps {
  readonly catalog: ContentCatalog;
  readonly state: MatchState;
  readonly onCommand: (payload: CommandPayload) => void;
  /** The target under the pointer or keyboard focus in the list (the board shows its outline and arc). */
  readonly onPreview: (structureId: string | null) => void;
}

/** The engine phase for its human commander: targets with their structure HP, Fire and Skip. */
export function CatapultPhasePanel({ catalog, state, onCommand, onPreview }: CatapultPhasePanelProps) {
  const battle = state.battle;
  const st = battle ? catapultStatus(battle) : null;
  const listRef = useRef<HTMLDivElement | null>(null);
  const focusedRound = useRef(0);
  // The phase opens: keyboard focus moves into the list (the aimed target, else the first).
  useEffect(() => {
    if (!st || focusedRound.current === st.round) return;
    focusedRound.current = st.round;
    const want = st.aimedStructureId ? `[data-target="${st.aimedStructureId}"]` : '[data-target]';
    listRef.current?.querySelector<HTMLButtonElement>(want)?.focus({ preventScroll: true });
  }, [st]);
  if (!battle || !st || !st.phaseActive) return null;
  const aimed = st.aimedStructureId;
  const aimedName = aimed ? structureLabel(aimed) : null;
  const fireReason = !aimed ? (st.aimLost ? 'The target fell: choose a new one' : 'Choose a target first') : null;
  const onListKey = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp' && e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    const items = [...(listRef.current?.querySelectorAll<HTMLButtonElement>('[data-target]') ?? [])];
    const i = items.indexOf(document.activeElement as HTMLButtonElement);
    const step = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : -1;
    const next = items[(i + step + items.length) % items.length];
    if (next) {
      e.preventDefault();
      next.focus();
    }
  };
  return (
    <section className="catapult-phase panel" aria-label="Catapult phase: choose a target" data-testid="catapult-phase">
      <header className="catapult-phase__head">
        <Icon name="aim" className="inline-icon" />
        <span className="catapult-phase__title">Catapult phase</span>
        <span className="faint small">
          {st.hp}/{st.maxHp} HP · {catalog.rulesProfile.combat.siege.catapultDamage} structure HP per shot
        </span>
      </header>
      <div className="catapult-phase__targets" role="group" aria-label="Catapult targets" ref={listRef} onKeyDown={onListKey} data-testid="catapult-targets">
        {st.targets.map((t, i) => {
          const q = previewCatapultTarget(catalog, battle, t.id);
          const on = aimed === t.id;
          // One tab stop for the list (the aimed target, else the first); the arrows move inside it.
          const stop = aimed ? on : i === 0;
          return (
            <button
              key={t.id}
              type="button"
              className={`catapult-target${on ? ' is-aimed' : ''}`}
              aria-pressed={on}
              tabIndex={stop ? 0 : -1}
              data-target={t.id}
              data-testid={`catapult-target-${t.id}`}
              title={`${structureLabel(t.id)}: ${t.hp}/${t.maxHp} structure HP${q.hpAfter !== null ? ` → ${q.hpAfter} after a shot` : ''}`}
              onClick={() => onCommand({ kind: 'BattleAimCatapult', structureId: t.id })}
              onMouseEnter={() => onPreview(t.id)}
              onMouseLeave={() => onPreview(null)}
              onFocus={() => onPreview(t.id)}
              onBlur={() => onPreview(null)}
            >
              {on ? <Icon name="aim" className="inline-icon" /> : <span className="catapult-target__kind">{KIND_LABEL[t.kind] ?? t.kind}</span>}
              <span className="catapult-target__name">{structureLabel(t.id).replace('Wall section', 'Wall')}</span>
              <span className="catapult-target__hp num">
                {t.hp}/{t.maxHp}
              </span>
            </button>
          );
        })}
      </div>
      {st.aimLost ? (
        <p className="small catapult-phase__lost" role="alert" data-testid="catapult-aim-lost">
          The aimed structure fell. Choose a new target.
        </p>
      ) : null}
      <div className="catapult-phase__actions">
        <Button variant="primary" icon="fire" disabled={!aimed} disabledReason={fireReason} onClick={() => aimed && onCommand({ kind: 'BattleFireCatapult', structureId: aimed, expectedRound: st.round })} data-testid="catapult-fire">
          {aimedName ? `Fire at ${aimedName}` : 'Fire'}
        </Button>
        <Button icon="skip" onClick={() => onCommand({ kind: 'BattleSkipCatapult', expectedRound: st.round })} data-testid="catapult-skip">
          Skip
        </Button>
        <span className="faint small">Click a wall, the gate, a tower or the keep, or ↑/↓ and Enter.</span>
      </div>
    </section>
  );
}
