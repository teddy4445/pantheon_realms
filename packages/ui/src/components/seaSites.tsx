/**
 * Coastal sites and sea salvage controls (sea-sites kit 2026-10-17): the tile panel's lines for a
 * lookout, salvage or wreck, and the wreck panel — the delivered expedition painting, the wreck's
 * name, what the viewer may know of its danger and reward, Explore (100 movement, the panel's button is
 * the player's confirmation of any fight) and Leave (nothing is spent), "Sail beside it" when the
 * selected hero is elsewhere, and the waiting artifact with the ordinary swap / leave choice. Bound to
 * live data (`app/seaSites.ts`); every action is the quoted, validated command. Keyboard operable.
 */
import { useEffect, useRef } from 'react';
import { missionSite, type HexCoord } from '@pr/rules';
import { useStore } from '../app/context';
import { Button, Panel } from './kit';
import { Icon } from '../assets/icons';
import { seaSitePainting } from '../assets/manifest';
import { OwnerFlag } from './naval';
import { seaSiteTileLines, wreckPanelView } from '../app/seaSites';
import { buildReceipt } from '../app/rewards';

/** The tile panel's lines for a sea site (nothing for any other site). */
export function SeaSiteTileLines({ siteId, heroId }: { siteId: string | null; heroId: string | null }) {
  const store = useStore();
  const state = store.session!.state;
  const viewer = store.session!.humanPlayerId;
  if (!siteId) return null;
  const v = seaSiteTileLines(store.catalog, state, viewer, siteId, heroId);
  if (!v) return null;
  const st = state.world.sites[siteId];
  const def = missionSite(store.catalog, state, siteId);
  const owner = st?.owner ? state.players[st.owner] : undefined;
  return (
    <div className="small sea-site-lines" data-testid="tile-sea-site" data-site={siteId}>
      <div className="sea-site-lines__state" data-testid="tile-sea-site-state">
        {def?.kind.type === 'coastal_watchtower' ? <OwnerFlag color={owner?.color ?? null} label={`Owner: ${owner ? owner.name : 'Neutral'}`} size="1.05rem" /> : <Icon name={def?.kind.type === 'shipwreck' ? 'wreck' : 'water'} className="inline-icon" />} <strong>{v.state}</strong>
      </div>
      {v.lines.map((l, i) => (
        <div key={i}>{l}</div>
      ))}
      {v.warn ? (
        <div className="warn" data-testid="tile-sea-site-warn">
          {v.warn}
        </div>
      ) : null}
    </div>
  );
}

/** The wreck panel (left of the map, like the ship inspector). */
export function WreckPanel({ siteId, selectedHeroId, onRoute, onClose }: { siteId: string; selectedHeroId: string | null; onRoute: (to: HexCoord) => void; onClose: () => void }) {
  const store = useStore();
  const session = store.session!;
  const state = session.state;
  const viewer = session.humanPlayerId;
  const view = wreckPanelView(store.catalog, state, viewer, siteId, selectedHeroId);
  const ref = useRef<HTMLDivElement>(null);
  const humanTurn = state.activePlayerId === viewer && !state.battle && state.outcome.status === 'running';
  useEffect(() => {
    const el = ref.current?.querySelector<HTMLButtonElement>('button:not([disabled])');
    el?.focus({ preventScroll: true });
  }, [siteId]);
  if (!view) return null;
  const art = seaSitePainting();
  const notTurn = humanTurn ? null : 'Wait for your turn';
  /** Explore: a fight opens the battlefield (the store routes there); salvage taken at once shows its receipt. */
  const explore = () => {
    const cmd = view.explore.command;
    if (!cmd) return;
    const before = session.state;
    const res = session.dispatch(cmd);
    if (!res.ok) {
      store.toast(res.rejection.message, 'error');
      return;
    }
    if (res.events.some((e) => e.kind === 'BattleStarted')) {
      onClose();
      return;
    }
    const receipt = buildReceipt(store.catalog, before, session.state, res.events, viewer, selectedHeroId, { title: `Salvage from ${view.name}`, source: 'Shipwreck' });
    if (receipt.items.length > 0) {
      if (receipt.major) store.openOverlay({ kind: 'reward', receipt });
      else store.toast(receipt.title, 'success', { receipt });
    }
    store.notify();
  };
  const claim = (cmd: Parameters<typeof session.dispatch>[0]) => {
    store.claimReward(cmd, { title: `Taken from ${view.name}`, source: 'Shipwreck', heroId: selectedHeroId });
  };
  return (
    <div ref={ref} className="wreck-panel" role="dialog" aria-label={`Shipwreck: ${view.name}`} data-testid="wreck-panel" data-site={view.siteId}>
      <Panel
        className="wreck-panel__panel"
        title={
          <span className="wreck-panel__title">
            <Icon name="wreck" className="inline-icon" /> {view.name}
          </span>
        }
        actions={<Button size="small" variant="ghost" icon="close" onClick={onClose} aria-label="Close the wreck panel (Esc)" title="Close (Esc)" data-testid="wreck-panel-close" />}
      >
        {art ? (
          <div className="wreck-panel__art">
            <img src={art.url} width={art.width} height={art.height} alt={art.alt} draggable={false} data-testid="wreck-panel-art" />
          </div>
        ) : null}
        <div className="small wreck-panel__state" data-testid="wreck-panel-state">
          {view.stateLabel}
        </div>
        <dl className="wreck-panel__facts small">
          <dt>
            <Icon name="attack" className="inline-icon" /> Danger
          </dt>
          <dd data-testid="wreck-panel-danger">{view.danger}</dd>
          <dt>
            <Icon name="cargo" className="inline-icon" /> Salvage
          </dt>
          <dd data-testid="wreck-panel-reward">{view.reward}</dd>
        </dl>
        {view.claim ? (
          <div className="wreck-panel__claim" data-testid="wreck-panel-claim">
            <div className="small">
              <strong>{view.claim.artifactName}</strong> {view.claim.fits ? 'fits your hero’s packs.' : 'does not fit: the packs are full.'}
            </div>
            {view.claim.fits ? (
              <Button size="small" variant="primary" icon="star" disabled={!view.claim.legal || !!notTurn} disabledReason={notTurn ?? view.claim.reason} onClick={() => view.claim?.command && claim(view.claim.command)} data-testid="wreck-claim">
                Take it
              </Button>
            ) : view.claim.swaps.length ? (
              <div className="wreck-panel__swaps" role="group" aria-label="Leave one backpack item here to take it">
                <div className="small dim">Swap: leave one backpack item at the wreck in its place (you can come back for it).</div>
                {view.claim.swaps.slice(0, 8).map((s) => (
                  <Button key={s.instanceId} size="small" icon="swap" disabled={!!notTurn} disabledReason={notTurn} onClick={() => claim(s.command)} data-testid={`wreck-swap-${s.instanceId}`}>
                    Leave {s.name}
                  </Button>
                ))}
              </div>
            ) : (
              <div className="small warn">{view.claim.reason}</div>
            )}
          </div>
        ) : null}
        <div className="wreck-panel__actions">
          {view.approach ? (
            <Button size="small" icon="route" disabled={!!notTurn} disabledReason={notTurn} onClick={() => onRoute(view.approach!)} data-testid="wreck-route">
              Sail beside it
            </Button>
          ) : null}
          <Button
            size="small"
            variant="danger"
            icon="wreck"
            disabled={!view.explore.legal || !!notTurn}
            disabledReason={notTurn ?? view.explore.reason}
            onClick={explore}
            data-testid="wreck-explore"
          >
            Explore ({view.explore.cost} movement)
          </Button>
          <Button size="small" onClick={onClose} data-testid="wreck-leave">
            Leave
          </Button>
        </div>
        {!view.explore.legal && view.explore.reason ? (
          <p className="small warn wreck-panel__reason" role="status" data-testid="wreck-explore-reason">
            {notTurn ?? view.explore.reason}
          </p>
        ) : null}
      </Panel>
    </div>
  );
}
