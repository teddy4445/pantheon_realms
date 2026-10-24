/**
 * Hero-ship controls (expedition kit §11, scenario feature `navalMovementV1`): the ship inspector
 * (ShipInspect), the town's coastal launch service (CoastalLaunch), the command sidebar's ship list
 * and the tile panel's ship lines. Shared components bound to live data (`app/naval.ts`): every
 * action dispatches the validated command its quote describes and shows the quote's reason when it
 * cannot; combat is always confirmed by the player first. Keyboard operable; Escape closes.
 */
import { useEffect, useRef, useState } from 'react';
import { hexEquals, visibleCells, type HexCoord } from '@pr/rules';
import { useStore } from '../app/context';
import { Button, Modal, Panel } from './kit';
import { HeroPortrait } from './art';
import { CostList } from './game';
import { Icon } from '../assets/icons';
import { humanPlayer } from '../app/view';
import { launchView, myShips, shipInspectView, shipListLabel, visibleShipAt, type ShipAction } from '../app/naval';

/** The owner's square flag (the land banner's shape and colour) or the neutral pennant; never the pantheon. */
export function OwnerFlag({ color, label, size = '1.4rem' }: { color: string | null; label: string; size?: string }) {
  return (
    <span className={`owner-flag ${color ? '' : 'owner-flag--neutral'}`} style={{ width: size, height: size }} role="img" aria-label={label} title={label} data-testid="owner-flag" data-color={color ?? 'neutral'}>
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M5 22V3" stroke="#3a2c1c" strokeWidth="2.2" fill="none" />
        {color ? <rect x="6" y="3.5" width="14" height="10" fill={color} stroke="#1a1208" strokeWidth="1" /> : <path d="M6 3.5L19 8.5 6 13.5Z" fill="#e9dfc4" stroke="#1a1208" strokeWidth="1" />}
      </svg>
    </span>
  );
}

/**
 * ShipInspect: who owns the ship, who is aboard (portrait and name, or "Empty ship"), its state, the
 * movement left (the viewer's own hero only) and the legal actions with their reasons.
 */
export function ShipInspectPanel({
  shipId,
  selectedHeroId,
  picking,
  onDisembark,
  onAttack,
  onRoute,
  onPickLanding,
  onClose,
}: {
  shipId: string;
  selectedHeroId: string | null;
  /** The map is waiting for a shore pick (Disembark pressed). */
  picking: boolean;
  onDisembark: (land: HexCoord) => void;
  onAttack: (action: ShipAction) => void;
  onRoute: (to: HexCoord) => void;
  /** Toggle the map's shore pick (landing cells highlighted). */
  onPickLanding: (on: boolean) => void;
  onClose: () => void;
}) {
  const store = useStore();
  const catalog = store.catalog;
  const state = store.session!.state;
  const viewer = store.session!.humanPlayerId;
  const visible = visibleCells(catalog, state, viewer);
  const view = shipInspectView(catalog, state, viewer, shipId, selectedHeroId, visible);
  const ref = useRef<HTMLDivElement>(null);
  const humanTurn = state.activePlayerId === viewer && !state.battle && state.outcome.status === 'running';
  // Keyboard: focus moves into the panel when it opens (its first control).
  useEffect(() => {
    const el = ref.current?.querySelector<HTMLButtonElement>('button:not([disabled])');
    el?.focus({ preventScroll: true });
  }, [shipId]);
  if (!view) return null;
  const notTurn = humanTurn ? null : 'Wait for your turn';
  const act = (a: ShipAction) => {
    if (a.id === 'disembark') onPickLanding(!picking);
    else if (a.id === 'attack') onAttack(a);
    else if (a.id === 'route') onRoute(view.coord);
    else if (a.command && !store.dispatch(a.command)) {
      if (a.id === 'embark') store.toast('Embarked: the voyage begins next turn.', 'success');
    }
  };
  return (
    <div ref={ref} className="ship-inspect" role="dialog" aria-label={`Ship: ${view.hero ? `${view.hero.name}'s ship` : 'Empty ship'}`} data-testid="ship-inspect" data-ship={view.shipId}>
      <Panel
        className="ship-inspect__panel"
        title={
          <span className="ship-inspect__title">
            <Icon name="ship" className="inline-icon" /> {view.hero ? `${view.hero.name}'s ship` : 'Empty ship'}
          </span>
        }
        actions={<Button size="small" variant="ghost" icon="close" onClick={onClose} aria-label="Close the ship panel (Esc)" title="Close (Esc)" data-testid="ship-inspect-close" />}
      >
        <div className="ship-inspect__head">
          {view.hero ? (
            <span className="ship-inspect__portrait" data-testid="ship-inspect-hero">
              <HeroPortrait catalog={catalog} definitionId={view.hero.definitionId} name={view.hero.name} size="3.4rem" />
            </span>
          ) : (
            <span className="ship-inspect__portrait ship-inspect__portrait--empty" aria-hidden="true">
              <Icon name="anchor" />
            </span>
          )}
          <div className="ship-inspect__facts">
            <div className="ship-inspect__owner">
              <OwnerFlag color={view.ownerColor} label={`Owner: ${view.ownerName}`} />
              <span data-testid="ship-inspect-owner">{view.ownerName}</span>
            </div>
            <div className="small" data-testid="ship-inspect-state">
              {view.hero ? <strong>{view.hero.name}</strong> : <strong>Empty ship</strong>} · {view.stateLabel}
            </div>
            {view.movement ? (
              <div className="small" data-testid="ship-inspect-movement">
                <Icon name="movement" className="inline-icon" /> <span className="num">{view.movement.left}</span>/<span className="num">{view.movement.max}</span> movement left
              </div>
            ) : null}
          </div>
        </div>
        {view.actions.length ? (
          <ul className="ship-inspect__actions">
            {view.actions.map((a) => {
              const reason = notTurn ?? a.reason;
              return (
                <li key={a.id}>
                  <Button
                    size="small"
                    variant={a.id === 'attack' ? 'danger' : a.id === 'route' ? undefined : 'primary'}
                    icon={a.id === 'embark' ? 'embark' : a.id === 'disembark' ? 'disembark' : a.id === 'attack' ? 'boarding' : 'route'}
                    disabled={!a.enabled || !!notTurn}
                    disabledReason={reason}
                    aria-pressed={a.id === 'disembark' ? picking : undefined}
                    onClick={() => act(a)}
                    data-testid={`ship-action-${a.id}`}
                  >
                    {a.id === 'disembark' && picking ? 'Cancel landing' : a.label}
                  </Button>
                  {!a.enabled || notTurn ? (
                    <span className="small warn ship-inspect__reason" data-testid={`ship-action-${a.id}-reason`}>
                      {reason}
                    </span>
                  ) : a.detail ? (
                    <span className="small dim ship-inspect__reason">{a.detail}</span>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="small dim" data-testid="ship-inspect-none">
            {view.mine ? 'Select a hero on the shore beside it to embark.' : 'Nothing to do with this ship now.'}
          </p>
        )}
        {picking && view.landing.length ? (
          <div className="ship-inspect__landing" role="group" aria-label="Choose a shore to land on" data-testid="ship-landing">
            <div className="small">Pick a highlighted shore on the map, or one here (costs one movement step):</div>
            {view.landing.map((l) => (
              <Button key={`${l.coord.q},${l.coord.r}`} size="small" icon="disembark" onClick={() => onDisembark(l.coord)} data-testid={`ship-land-${l.coord.q}-${l.coord.r}`}>
                {l.label}
              </Button>
            ))}
          </div>
        ) : null}
      </Panel>
    </div>
  );
}

/** The command sidebar's ship list (keyboard: Tab to a ship, Enter opens its panel). */
export function ShipSidebar({ onInspect }: { onInspect: (shipId: string, at: HexCoord) => void }) {
  const store = useStore();
  const state = store.session!.state;
  const list = myShips(state, store.session!.humanPlayerId);
  if (list.length === 0) return null;
  return (
    <section className="adv-command__group" aria-label="Ships" data-testid="ship-list">
      <div className="adv-command__label">Ships</div>
      <div className="adv-list adv-command__ships">
        {list.map((s) => {
          const label = shipListLabel(state, s);
          return (
            <button key={s.shipId} type="button" className={`ship-tab ${s.heroId ? 'is-crewed' : ''}`} onClick={() => onInspect(s.shipId, s.coord)} title={`${label} — inspect`} aria-label={`${label}: inspect`} data-testid={`ship-tab-${s.shipId}`}>
              <Icon name={s.heroId ? 'ship' : 'anchor'} />
              <span className="ship-tab__name">{label}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

/** The tile panel's ship line: owner, and the hero aboard (portrait and name) or an empty hull. */
export function ShipTileLines({ coord }: { coord: HexCoord }) {
  const store = useStore();
  const catalog = store.catalog;
  const state = store.session!.state;
  const viewer = store.session!.humanPlayerId;
  const visible = visibleCells(catalog, state, viewer);
  const ship = visibleShipAt(state, viewer, coord, visible);
  if (!ship) return null;
  const hero = ship.heroId ? state.heroes[ship.heroId] : undefined;
  const owner = ship.ownerId ? state.players[ship.ownerId] : undefined;
  return (
    <div className="small ship-tile" data-testid="tile-ship">
      <OwnerFlag color={owner?.color ?? null} label={`Owner: ${owner ? owner.name : 'Neutral'}`} size="1.1rem" />
      {hero ? (
        <>
          <HeroPortrait catalog={catalog} definitionId={hero.definitionId} name={hero.name} size="1.6rem" />
          <span>
            {hero.name}&rsquo;s ship ({owner?.id === viewer ? 'yours' : (owner?.name ?? 'hostile')})
          </span>
        </>
      ) : (
        <span>Empty ship · {owner ? (owner.id === viewer ? 'yours' : owner.name) : 'neutral — any hero may claim it by embarking'}</span>
      )}
    </div>
  );
}

/**
 * CoastalLaunch (a town service, not a building): the price from `quoteLaunchShip` (data: the rules
 * profile's ship cost), why it cannot be bought now, the free launch cells by direction (the first by
 * default) and the LaunchShip command.
 */
export function CoastalLaunchModal({ townId, onClose }: { townId: string; onClose: () => void }) {
  const store = useStore();
  const catalog = store.catalog;
  const state = store.session!.state;
  const player = humanPlayer(state);
  const [cell, setCell] = useState<HexCoord | null>(null);
  const v = launchView(catalog, state, player.id, townId, cell);
  const chosen = cell && v.cells.some((c) => hexEquals(c.coord, cell)) ? cell : (v.cells[0]?.coord ?? null);
  const town = state.towns[townId];
  const humanTurn = state.activePlayerId === player.id && !state.battle;
  const launch = () => {
    if (!v.command) return;
    // The launch notice comes from the committed ShipLaunched event (app/naval.ts).
    if (!store.dispatch(v.command)) onClose();
  };
  return (
    <Modal
      title="Launch a ship"
      onClose={onClose}
      testId="coastal-launch"
      surface="parchment"
      compact
      width="30rem"
      footer={
        <>
          <span className="grow" />
          <Button onClick={onClose} data-testid="launch-cancel">
            Cancel
          </Button>
          <Button variant="primary" icon="ship" onClick={launch} disabled={!v.legal || !humanTurn} disabledReason={!humanTurn ? 'Wait for your turn' : v.reason} data-testid="launch-confirm">
            Launch ship
          </Button>
        </>
      }
    >
      <p className="small">An empty ship of your empire is set on the water beside {town?.name ?? 'the town'}. Any of your heroes can embark from the shore beside it. This is a harbour service, not a building.</p>
      <div className="launch__price" data-testid="launch-price">
        <span className="dim small">Price</span> <CostList cost={v.cost} wallet={player.wallet} />
      </div>
      {v.cells.length ? (
        <fieldset className="launch__cells">
          <legend className="small">Launch onto</legend>
          {v.cells.map((c, i) => {
            const on = !!chosen && hexEquals(c.coord, chosen);
            return (
              <label key={`${c.coord.q},${c.coord.r}`} className={`launch__cell ${on ? 'is-on' : ''}`}>
                <input type="radio" name="launch-cell" checked={on} onChange={() => setCell(c.coord)} data-testid={`launch-cell-${i}`} />
                <Icon name="water" className="inline-icon" /> {c.label}
              </label>
            );
          })}
        </fieldset>
      ) : null}
      {!v.legal && v.reason ? (
        <p className="small warn" role="status" data-testid="launch-reason">
          <Icon name="blocked" className="inline-icon" /> {v.reason}
        </p>
      ) : null}
    </Modal>
  );
}
