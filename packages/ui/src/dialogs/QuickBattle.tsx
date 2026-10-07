/**
 * Quick battle in the encounter panel (owner request 2026-10-07). The panel
 * fights the battle on a copy of the current state with the tactical AI on both
 * sides — the same function the session runs when the player confirms — so the
 * losses shown are the losses the player gets.
 */
import { useEffect, useState } from 'react';
import type { HexCoord } from '@pr/rules';
import { runQuickBattle, summarizeQuickBattle, type QuickBattleRun, type QuickBattleSummary } from '@pr/ai';
import { useStore } from '../app/context';
import { CreaturePortrait } from '../components/art';
import { Icon } from '../assets/icons';

export interface QuickBattlePreview {
  readonly run: QuickBattleRun;
  readonly summary: QuickBattleSummary | null;
  readonly ms: number;
}

/** The preview for an encounter move, computed once per state revision just after the panel paints. */
export function useQuickBattlePreview(heroId: string, dest: HexCoord): QuickBattlePreview | null {
  const store = useStore();
  const session = store.session!;
  const revision = session.state.revision;
  const [preview, setPreview] = useState<(QuickBattlePreview & { key: string }) | null>(null);
  const key = `${session.sessionId}:${revision}:${heroId}:${dest.q},${dest.r}`;
  useEffect(() => {
    let alive = true;
    const t = window.setTimeout(() => {
      const state = session.state;
      const actor = session.humanPlayerId;
      const t0 = performance.now();
      let run: QuickBattleRun;
      try {
        run = runQuickBattle(store.catalog, state, actor, { kind: 'MoveHero', heroId, destination: dest, confirmEncounter: true });
      } catch {
        run = { ok: false, reason: 'This battle cannot be resolved quickly' };
      }
      const summary = run.ok ? summarizeQuickBattle(run.result, actor, run.state) : null;
      if (alive) setPreview({ key, run, summary, ms: performance.now() - t0 });
    }, 40);
    return () => {
      alive = false;
      window.clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return preview && preview.key === key ? preview : null;
}

/** The expected result: outcome, the player's losses per creature, experience. */
export function QuickBattlePanel({ preview }: { preview: QuickBattlePreview | null }) {
  const store = useStore();
  const catalog = store.catalog;
  if (!preview) {
    return (
      <div className="quick-battle is-pending" data-testid="quick-battle" data-status="pending" aria-live="polite">
        <Icon name="auto" className="quick-battle__icon" />
        <span className="dim small">Working out the quick battle…</span>
      </div>
    );
  }
  if (!preview.run.ok || !preview.summary) {
    return (
      <div className="quick-battle is-off" data-testid="quick-battle" data-status="unavailable">
        <Icon name="auto" className="quick-battle__icon" />
        <span className="dim small">{preview.run.ok ? '' : preview.run.reason}</span>
      </div>
    );
  }
  const s = preview.summary;
  const name = (id: string, n: number) => (n === 1 ? catalog.creatures[id]?.name : catalog.creatures[id]?.pluralName) ?? id;
  return (
    <div className={`quick-battle ${s.won ? 'is-win' : 'is-loss'}`} data-testid="quick-battle" data-status={s.won ? 'victory' : 'defeat'} aria-live="polite">
      <Icon name="auto" className="quick-battle__icon" />
      <div className="quick-battle__body">
        <div className="quick-battle__head">
          <span className="quick-battle__label">Quick battle</span>
          <strong className={s.won ? 'success' : 'warn'} data-testid="quick-battle-outcome">
            {s.won ? 'Victory' : 'Defeat'}
          </strong>
          <span className="faint small">
            in {s.rounds} round{s.rounds === 1 ? '' : 's'}
            {s.won && s.xp > 0 ? ` · +${s.xp.toLocaleString('en-US')} experience` : ''}
          </span>
        </div>
        {s.won ? (
          s.losses.length === 0 ? (
            <div className="small" data-testid="quick-battle-losses">
              No losses.
            </div>
          ) : (
            <div className="quick-battle__losses" data-testid="quick-battle-losses" aria-label="Expected losses">
              <span className="small">You lose</span>
              {s.losses.map((l) => (
                <span key={l.creatureId} className="quick-battle__loss" title={`${l.lost} of ${l.before} ${name(l.creatureId, l.before)}`} data-testid={`quick-loss-${l.creatureId}`}>
                  <CreaturePortrait catalog={catalog} creatureId={l.creatureId} size="2.2rem" />
                  <span className="num">−{l.lost}</span>
                  <span className="faint small">of {l.before}</span>
                </span>
              ))}
            </div>
          )
        ) : (
          <div className="small warn" data-testid="quick-battle-losses">
            Your army would be lost{s.foeWiped ? '' : `; the enemy keeps ${s.foeLosses.length === 0 ? 'every creature' : 'part of its army'}`}. Fight it on the battlefield, or withdraw.
          </div>
        )}
        <div className="faint small">Both armies fought by the battle AI, as with Auto in battle. This is the result you get.</div>
      </div>
    </div>
  );
}
