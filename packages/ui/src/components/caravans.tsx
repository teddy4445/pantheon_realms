/**
 * Recruitment caravans (expedition kit §06/§11, `recruitmentCaravansV1`): the dispatch dialog,
 * the tracker, the arrival receipt, the held-shipment notice, the actor picker and the command
 * sidebar's list. Semantic live controls over the kit's text-free paintings
 * (`expedition.caravan-dispatch-art`, `-arrival-art`) and its controls (Icon `caravan`,
 * `dispatch`, `arrival`, `cargo`, `route`, `blocked`, `garrison`).
 *
 * Every price, pool, route, ETA, risk and legality comes from the rules (quoteCaravan — itself
 * the recruitment quote of the source town plus the flat fee —, quoteRecruitment for a form's
 * unit price, quoteCaravanReroute, caravanEta); every change is a command (DispatchCaravan,
 * RerouteCaravan). The arrival receipt is read from the committed CaravanDelivered event: it
 * applies nothing (no Claim button, no second charge).
 */
import { useMemo, useState } from 'react';
import {
  CARAVAN_ON_MAP,
  caravanBlockMessage,
  caravanEta,
  caravansAt,
  quoteCaravan,
  quoteCaravanReroute,
  quoteRecruitment,
  recruitableCreatureIds,
  familyForSlot,
  type CaravanState,
  type ContentCatalog,
  type HexCoord,
  type MatchState,
} from '@pr/rules';
import { useStore } from '../app/context';
import type { CaravanReceipt } from '../app/store';
import { Button, Chip, Modal } from './kit';
import { CreaturePortrait, HeroPortrait } from './art';
import { ArmyPreview, ArmyStrip, CostList } from './game';
import { ArmyIntelPanel } from './armyIntel';
import { SavingLine } from './dedication';
import { Icon } from '../assets/icons';
import { resolveAsset } from '../assets/manifest';
import { formatNumber, humanPlayer } from '../app/view';
import { CARAVAN_STATUS_LABEL, caravanFullCargo, caravanIntelView, caravanStateLine, cargoText, dateLabel, etaText, myCaravans, townName } from '../app/caravans';

// ---------------------------------------------------------------------------
// Pieces
// ---------------------------------------------------------------------------

function CaravanArt({ id, alt }: { id: 'expedition.caravan-dispatch-art' | 'expedition.caravan-arrival-art'; alt: string }) {
  const url = resolveAsset(id).url;
  if (!url) return null;
  return (
    <div className="cv-art">
      <img src={url} alt={alt} draggable={false} />
    </div>
  );
}

/** One cargo stack: portrait, name and count (the owner's own, exact). */
function CargoCards({ catalog, cargo, testId }: { catalog: ContentCatalog; cargo: readonly { creatureId: string; count: number }[]; testId: string }) {
  return (
    <ul className="cv-cargo" data-testid={testId}>
      {cargo.map((s) => {
        const def = catalog.creatures[s.creatureId];
        const name = s.count === 1 ? def?.name : def?.pluralName;
        return (
          <li key={s.creatureId} className="cv-cargo__card" title={`${formatNumber(s.count)} ${name}`} data-creature={s.creatureId}>
            <CreaturePortrait catalog={catalog} creatureId={s.creatureId} size="3.4rem" />
            <span className="cv-cargo__name">{def?.pluralName ?? s.creatureId}</span>
            <span className="cv-cargo__count num">{formatNumber(s.count)}</span>
          </li>
        );
      })}
    </ul>
  );
}

/** A compact quantity stepper: −, the number (typed), +, Max. Keyboard and screen-reader friendly. */
function Stepper({ value, max, onChange, label, testId }: { value: number; max: number; onChange: (n: number) => void; label: string; testId: string }) {
  const clamp = (n: number) => Math.max(0, Math.min(max, Number.isFinite(n) ? Math.floor(n) : 0));
  return (
    <span className="cv-step" data-testid={testId}>
      <Button size="small" className="gui-no-lock" onClick={() => onChange(clamp(value - 1))} disabled={value <= 0} aria-label={`Fewer ${label}`} title={`Fewer ${label}`}>
        −
      </Button>
      <input className="cv-step__input num" type="number" inputMode="numeric" min={0} max={max} value={value} aria-label={`${label} to send`} onChange={(e) => onChange(clamp(Number(e.target.value)))} data-testid={`${testId}-input`} />
      <Button size="small" className="gui-no-lock" onClick={() => onChange(clamp(value + 1))} disabled={value >= max} aria-label={`More ${label}`} title={`More ${label}`}>
        +
      </Button>
      <Button size="small" className="gui-no-lock" onClick={() => onChange(max)} disabled={max <= 0 || value === max} aria-label={`All available ${label}`} title={`All available ${label}`}>
        Max
      </Button>
    </span>
  );
}

/** Reroute: the owner's other towns with their free route and arrival (or why not), and a Send button. */
function RerouteControl({ caravan, onDone }: { caravan: CaravanState; onDone?: () => void }) {
  const store = useStore();
  const catalog = store.catalog;
  const state = store.session!.state;
  const playerId = store.session!.humanPlayerId;
  const held = caravan.status === 'blocked' || caravan.status === 'awaiting_garrison';
  const options = Object.values(state.towns)
    .filter((t) => t.ownerId === playerId && (held || t.id !== caravan.destinationTownId))
    .sort((a, b) => (a.id < b.id ? -1 : 1))
    .map((t) => ({ town: t, q: quoteCaravanReroute(catalog, state, playerId, caravan.id, t.id) }));
  const firstLegal = options.find((o) => o.q.legal)?.town.id ?? options[0]?.town.id ?? '';
  const [pick, setPick] = useState(firstLegal);
  const chosen = options.find((o) => o.town.id === pick) ?? options.find((o) => o.town.id === firstLegal);
  const myTurn = state.activePlayerId === playerId && !state.battle;
  const reason = !myTurn ? 'Wait for your turn' : !chosen ? 'You hold no other town' : chosen.q.legal ? null : chosen.q.reason;
  const send = () => {
    if (!chosen || reason) return;
    const same = chosen.town.id === caravan.destinationTownId;
    if (!store.dispatch({ kind: 'RerouteCaravan', caravanId: caravan.id, destinationTownId: chosen.town.id })) {
      store.toast(same ? `The caravan tries ${chosen.town.name} again` : `Caravan rerouted to ${chosen.town.name} — ${etaText(store.session!.state, chosen.q.etaDay)} (no charge)`, 'success');
      onDone?.();
    }
  };
  if (options.length === 0) return <p className="small dim" data-testid="caravan-reroute-none">You hold no other town to send it to.</p>;
  return (
    <div className="cv-reroute" data-testid="caravan-reroute">
      <label className="cv-reroute__label" htmlFor={`reroute-${caravan.id}`}>
        <Icon name="route" className="inline-icon" /> Send to
      </label>
      <select id={`reroute-${caravan.id}`} className="cv-select" value={chosen?.town.id ?? ''} onChange={(e) => setPick(e.target.value)} data-testid="caravan-reroute-select">
        {options.map((o) => (
          <option key={o.town.id} value={o.town.id}>
            {o.town.name}
            {o.town.id === caravan.destinationTownId ? ' (try again)' : ''} — {o.q.legal ? `arrives ${etaText(state, o.q.etaDay)}` : o.q.reason}
          </option>
        ))}
      </select>
      <Button variant="primary" icon="route" onClick={send} disabled={!!reason} disabledReason={reason ?? undefined} data-testid="caravan-reroute-send">
        {chosen && chosen.town.id === caravan.destinationTownId ? 'Try again' : 'Reroute (free)'}
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dispatch
// ---------------------------------------------------------------------------

interface FormRow {
  creatureId: string;
  familyId: string;
  pool: number;
}

/** The forms a town can send now: every recruitable form of each family with a built dwelling, in tier order. */
function formRows(catalog: ContentCatalog, state: MatchState, townId: string): { familyId: string; name: string; pool: number; forms: FormRow[] }[] {
  const town = state.towns[townId];
  if (!town) return [];
  const recruitable = new Set(recruitableCreatureIds(catalog, town));
  const archetype = catalog.townArchetypes[town.archetypeId];
  return (archetype?.slots ?? [])
    .filter((s) => s.kind === 'dwelling')
    .sort((a, b) => (a.tier ?? 0) - (b.tier ?? 0))
    .flatMap((slot) => {
      const famId = familyForSlot(catalog, slot);
      const fam = famId ? catalog.families[famId] : undefined;
      if (!fam) return [];
      const forms = [fam.baseCreatureId, fam.upgradedCreatureId].filter((id): id is string => !!id && recruitable.has(id));
      if (forms.length === 0) return [];
      const pool = town.population[fam.id] ?? 0;
      return [{ familyId: fam.id, name: fam.name, pool, forms: forms.map((creatureId) => ({ creatureId, familyId: fam.id, pool })) }];
    });
}

export function CaravanDispatchDialog({ townId, creatureId }: { townId: string; creatureId?: string }) {
  const store = useStore();
  const catalog = store.catalog;
  const state = store.session!.state;
  const player = humanPlayer(state);
  const playerId = player.id;
  const source = state.towns[townId];
  const others = Object.values(state.towns)
    .filter((t) => t.ownerId === playerId && t.id !== townId)
    .sort((a, b) => (a.id < b.id ? -1 : 1));
  // Each destination's route and arrival (the quote's route part, the same for any cargo).
  const routes = useMemo(() => new Map(others.map((t) => [t.id, quoteCaravan(catalog, state, playerId, townId, t.id, [])])), [catalog, state, playerId, townId]); // eslint-disable-line react-hooks/exhaustive-deps
  const firstReachable = others.find((t) => routes.get(t.id)?.etaDay != null)?.id ?? others[0]?.id ?? '';
  const [dest, setDest] = useState(firstReachable);
  const rows = formRows(catalog, state, townId);
  const [counts, setCounts] = useState<Record<string, number>>(() => (creatureId ? { [creatureId]: 0 } : {}));
  const items = Object.entries(counts)
    .filter(([, n]) => n > 0)
    .map(([id, count]) => ({ creatureId: id, count }));
  const q = source && dest ? quoteCaravan(catalog, state, playerId, townId, dest, items) : null;
  const policy = catalog.caravanPolicy;
  const maxStacks = policy?.maxDistinctStacks ?? 7;
  const destTown = state.towns[dest];
  const myTurn = state.activePlayerId === playerId && !state.battle;
  const close = () => store.closeOverlay();
  if (!source) return null;
  const used = (familyId: string, except: string) => rows.find((r) => r.familyId === familyId)?.forms.reduce((n, f) => n + (f.creatureId === except ? 0 : (counts[f.creatureId] ?? 0)), 0) ?? 0;
  const stacksChosen = items.length;
  const reason = !myTurn ? 'Wait for your turn' : !destTown ? 'You hold no other town' : !q ? 'Choose a destination' : q.legal ? null : q.reason;
  const dispatch = () => {
    if (!q || !q.legal || reason) return;
    const etaDay = q.etaDay;
    if (!store.dispatch({ kind: 'DispatchCaravan', sourceTownId: townId, destinationTownId: dest, items, expectedQuoteHash: q.hash })) {
      store.closeOverlay();
      store.toast(`Caravan dispatched to ${destTown?.name}: ${cargoText(catalog, q.lines)} — arrives ${etaText(store.session!.state, etaDay)}`, 'success');
    }
  };
  const fit = q?.destinationFit;
  return (
    <Modal
      title="Send reinforcements"
      onClose={close}
      width="62rem"
      testId="caravan-dispatch"
      footer={
        <>
          <span className="small cv-note" data-testid="caravan-dispatch-note">
            <Icon name="blocked" className="inline-icon" /> Paid on dispatch. Troops travel on the map by land and can be intercepted. No refund.
          </span>
          <span className="grow" />
          <Button onClick={close} data-testid="caravan-dispatch-cancel">
            Cancel
          </Button>
          <Button variant="primary" size="large" icon="caravan" onClick={dispatch} disabled={!!reason} disabledReason={reason ?? undefined} data-testid="caravan-dispatch-confirm">
            <span>Dispatch caravan</span>
            {q && q.lines.length > 0 ? <CostList cost={q.totalCost} wallet={player.wallet} /> : null}
          </Button>
        </>
      }
    >
      <CaravanArt id="expedition.caravan-dispatch-art" alt="" />
      <p className="cv-route-line" data-testid="caravan-dispatch-route-line">
        Recruit at <strong>{source.name}</strong> · Deliver to{' '}
        <label className="sr-only" htmlFor="caravan-dest">
          Destination town
        </label>
        <select id="caravan-dest" className="cv-select" value={dest} onChange={(e) => setDest(e.target.value)} disabled={others.length === 0} data-testid="caravan-destination">
          {others.map((t) => {
            const r = routes.get(t.id);
            return (
              <option key={t.id} value={t.id}>
                {t.name} garrison — {r?.etaDay != null ? `arrives day ${r.etaDay}` : (r?.routeReason ?? 'no known land route')}
              </option>
            );
          })}
        </select>
      </p>
      <div className="cv-dispatch">
        <section className="cv-forms" aria-label={`Creatures available at ${source.name}`}>
          {rows.length === 0 ? <p className="small dim">Build a dwelling to recruit creatures here.</p> : null}
          {rows.map((r) => (
            <div key={r.familyId} className="cv-family" data-testid={`caravan-family-${r.familyId}`}>
              <div className="cv-family__head small">
                <strong>{r.name}</strong>
                <span className="dim" data-testid={`caravan-pool-${r.familyId}`}>
                  {' '}
                  · {formatNumber(Math.max(0, r.pool - used(r.familyId, '')))} of {formatNumber(r.pool)} available (one pool for both forms)
                </span>
              </div>
              {r.forms.map((f) => {
                const def = catalog.creatures[f.creatureId]!;
                const unit = quoteRecruitment(catalog, state, playerId, townId, f.creatureId, 1, { kind: 'garrison' });
                const n = counts[f.creatureId] ?? 0;
                const room = n > 0 || stacksChosen < maxStacks;
                const max = room ? Math.max(0, r.pool - used(r.familyId, f.creatureId)) : 0;
                const line = q?.lines.find((l) => l.creatureId === f.creatureId);
                return (
                  <div key={f.creatureId} className={`cv-form ${n > 0 ? 'is-chosen' : ''}`} data-testid={`caravan-form-${f.creatureId}`}>
                    <CreaturePortrait catalog={catalog} creatureId={f.creatureId} size="3rem" />
                    <div className="cv-form__text">
                      <div className="cv-form__name">
                        {def.pluralName} <span className="dim small">{def.form === 'upgraded' ? 'upgraded' : 'base'}</span>
                      </div>
                      <div className="small cv-form__price" data-testid={`caravan-price-${f.creatureId}`}>
                        <CostList cost={unit.unitCost} /> each
                        {unit.dedication ? <span className="dim"> · normally {formatNumber(unit.dedication.normalGold)} Gold</span> : null}
                      </div>
                      {line?.dedication ? <SavingLine catalog={catalog} saving={line.dedication} testId={`caravan-saving-${f.creatureId}`} per={`for ${line.count}`} /> : null}
                    </div>
                    <Stepper value={n} max={max} onChange={(v) => setCounts((c) => ({ ...c, [f.creatureId]: v }))} label={def.pluralName} testId={`caravan-qty-${f.creatureId}`} />
                  </div>
                );
              })}
            </div>
          ))}
          <p className="small dim">
            At most {maxStacks} stacks per caravan ({stacksChosen} chosen); identical creatures travel as one stack.
          </p>
        </section>

        <section className="cv-summary" aria-label="Route and cost">
          <div className="cv-facts">
            <div className="cv-fact" data-testid="caravan-travel">
              <Icon name="hourglass" />
              <span>
                <span className="cv-fact__label">Travel time</span>
                <strong>{q?.etaDay != null ? `${q.etaDay - state.day} ${q.etaDay - state.day === 1 ? 'day' : 'days'}` : '—'}</strong>
              </span>
            </div>
            <div className="cv-fact" data-testid="caravan-eta">
              <Icon name="journal" />
              <span>
                <span className="cv-fact__label">Arrival</span>
                <strong>{q?.etaDay != null ? `Day ${q.etaDay}` : 'No route'}</strong>
              </span>
            </div>
            <div className="cv-fact" data-testid="caravan-risk">
              <Icon name="route" />
              <span>
                <span className="cv-fact__label">Known route</span>
                <strong className={q && q.risks.length > 0 ? 'warn' : 'success'}>{!q || q.etaDay == null ? 'none' : q.risks.length > 0 ? `${q.risks.length} risk${q.risks.length === 1 ? '' : 's'}` : 'clear'}</strong>
              </span>
            </div>
          </div>
          <p className="small dim" data-testid="caravan-route-detail">
            {q && q.etaDay != null
              ? `${q.route.length} tiles over land, ${formatNumber(q.pathCost)} movement (${formatNumber(policy?.dailyMovement ?? 600)} a day; roads ${catalog.rulesProfile.roadCost}). First movement at your next turn.`
              : (q?.routeReason ?? 'No known land route.')}
          </p>
          {q && q.risks.length > 0 ? (
            <ul className="cv-risks small warn" data-testid="caravan-risks">
              {q.risks.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          ) : null}
          <p className="faint small">A clear known route is no guarantee: hidden armies can still lie in wait.</p>
          <table className="cv-total" data-testid="caravan-total">
            <tbody>
              <tr>
                <th scope="row">
                  <Icon name="recruit" className="inline-icon" /> Recruits ({formatNumber(q?.totalCount ?? 0)} {q?.totalCount === 1 ? 'unit' : 'units'})
                </th>
                <td data-testid="caravan-total-recruits">
                  <CostList cost={q?.recruitCost ?? {}} empty="—" />
                </td>
              </tr>
              <tr>
                <th scope="row">
                  <Icon name="caravan" className="inline-icon" /> Transport (1 wagon)
                </th>
                <td data-testid="caravan-total-fee">
                  <CostList cost={q?.fee ?? policy?.transportFee ?? {}} />
                </td>
              </tr>
              <tr className="cv-total__sum">
                <th scope="row">Total</th>
                <td data-testid="caravan-total-sum">{q && q.lines.length > 0 ? <CostList cost={q.totalCost} wallet={player.wallet} /> : '—'}</td>
              </tr>
            </tbody>
          </table>
          <SavingLine catalog={catalog} saving={q?.dedication} testId="caravan-dedication-saving" per="on this shipment" />
          <div className="cv-fit small" data-testid="caravan-fit">
            <Icon name="garrison" className="inline-icon" />{' '}
            {!fit || items.length === 0
              ? `${destTown?.name ?? 'The destination'} garrison: choose the creatures to send.`
              : fit.slotsShort === 0
                ? `${destTown?.name} garrison has room${fit.merges > 0 ? ` · ${fit.merges} ${fit.merges === 1 ? 'stack merges' : 'stacks merge'}` : ''}${fit.newStacks > 0 ? ` · ${fit.newStacks} new` : ''}.`
                : `${destTown?.name} garrison needs ${fit.slotsShort} more free stack ${fit.slotsShort === 1 ? 'slot' : 'slots'}: the caravan waits at the gate until there is room (nothing is lost).`}
          </div>
          {reason && myTurn && items.length > 0 ? (
            <p className="small warn" data-testid="caravan-dispatch-reason">
              {reason}
            </p>
          ) : null}
        </section>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Tracker, held notice, arrival receipt
// ---------------------------------------------------------------------------

function routeStatus(catalog: ContentCatalog, state: MatchState, c: CaravanState): { tone: 'ok' | 'warn' | 'bad'; text: string } {
  if (c.status === 'blocked' || c.status === 'awaiting_garrison') return { tone: 'warn', text: caravanBlockMessage(c.blockedReason) };
  if (c.status === 'intercepted') return { tone: 'bad', text: 'Under attack: its cargo is fighting' };
  return { tone: 'ok', text: 'Known route: clear' };
}

export function CaravanTrackerDialog({ caravanId, message }: { caravanId: string; message?: string }) {
  const store = useStore();
  const catalog = store.catalog;
  const state = store.session!.state;
  const playerId = store.session!.humanPlayerId;
  const c = state.caravans?.[caravanId];
  const close = () => store.closeOverlay();
  if (!c || c.ownerId !== playerId) {
    return (
      <Modal title="Caravan" onClose={close} width="30rem" testId="caravan-tracker">
        <p>This caravan is no longer on the road.</p>
      </Modal>
    );
  }
  const held = c.status === 'blocked' || c.status === 'awaiting_garrison';
  const eta = caravanEta(catalog, state, c);
  const rs = routeStatus(catalog, state, c);
  const to = townName(state, c.destinationTownId);
  const onMap = CARAVAN_ON_MAP.has(c.status);
  const focus = (at: HexCoord) => {
    store.focusOn(at);
    store.closeOverlay();
    if (store.screen.id !== 'adventure') store.toAdventure();
  };
  return (
    <Modal
      title={held ? 'Caravan held' : `Caravan to ${to}`}
      onClose={close}
      width="40rem"
      testId={held ? 'caravan-blocked' : 'caravan-tracker'}
      footer={
        <>
          {onMap ? (
            <Button icon="eye" onClick={() => focus(c.coord)} data-testid="caravan-show">
              Show on map
            </Button>
          ) : null}
          {state.towns[c.destinationTownId] ? (
            <Button icon="town" onClick={() => focus(state.towns[c.destinationTownId]!.coord)} data-testid="caravan-view-destination">
              View destination
            </Button>
          ) : null}
          <span className="grow" />
          <Button variant="primary" onClick={close} data-testid="caravan-tracker-close">
            Continue
          </Button>
        </>
      }
    >
      <CaravanArt id="expedition.caravan-dispatch-art" alt="" />
      <div className="cv-track-head">
        <Chip tone={c.status === 'travelling' || c.status === 'queued' ? 'info' : held ? 'warn' : c.status === 'intercepted' || c.status === 'destroyed' ? 'bad' : 'ok'}>
          <span data-testid="caravan-status">{CARAVAN_STATUS_LABEL[c.status]}</span>
        </Chip>
        <span className="cv-track-head__from small">
          <Icon name="town" className="inline-icon" /> From <strong>{townName(state, c.sourceTownId)}</strong>
          <Icon name="dispatch" className="inline-icon" /> <Icon name="garrison" className="inline-icon" /> {to}
        </span>
        <span className="cv-track-head__eta small" data-testid="caravan-tracker-eta">
          {eta !== null ? <>Arrives {etaText(state, eta)}</> : held ? 'Holding' : caravanStateLine(catalog, state, c)}
        </span>
      </div>
      <h3 className="cv-subtitle">
        <Icon name="cargo" className="inline-icon" /> Cargo
      </h3>
      <CargoCards catalog={catalog} cargo={c.cargo} testId="caravan-cargo" />
      <h3 className="cv-subtitle">
        <Icon name="route" className="inline-icon" /> Route status
      </h3>
      <p className={`cv-route-status ${rs.tone}`} data-testid="caravan-route-status">
        {held && message ? message : rs.text}
      </p>
      {held ? (
        <>
          <p className="small success" data-testid="caravan-safe">
            Your troops are safe: nothing is lost while the caravan holds. Choose another of your towns (no charge), or wait — it tries again at your next turn.
          </p>
          <RerouteControl caravan={c} />
        </>
      ) : (
        <ul className="small dim cv-notes">
          <li>Movement continues at the start of each of your turns ({formatNumber(catalog.caravanPolicy?.dailyMovement ?? 600)} movement a day).</li>
          <li>Troops join the destination garrison on arrival. The wagon sees only the next tile.</li>
        </ul>
      )}
      {!held && onMap && c.status !== 'intercepted' ? (
        <details className="cv-details">
          <summary className="small">Send it elsewhere…</summary>
          <RerouteControl caravan={c} />
        </details>
      ) : null}
    </Modal>
  );
}

export function CaravanArrivalDialog({ receipt }: { receipt: CaravanReceipt }) {
  const store = useStore();
  const catalog = store.catalog;
  const state = store.session!.state;
  const town = state.towns[receipt.townId];
  const close = () => store.closeOverlay();
  const days = Math.max(0, receipt.day - receipt.dispatchedDay);
  return (
    <Modal
      title="Reinforcements arrived"
      onClose={close}
      width="44rem"
      testId="caravan-arrival"
      footer={
        <>
          <Button
            icon="garrison"
            onClick={() => {
              store.closeOverlay();
              store.goto('town', { townId: receipt.townId });
            }}
            disabled={!town || town.ownerId !== store.session!.humanPlayerId}
            disabledReason="The town is no longer yours"
            data-testid="caravan-view-garrison"
          >
            View garrison
          </Button>
          <span className="grow" />
          <Button variant="primary" onClick={close} autoFocus data-testid="caravan-arrival-continue">
            Continue
          </Button>
        </>
      }
    >
      <CaravanArt id="expedition.caravan-arrival-art" alt="" />
      <p className="cv-route-line">
        {townName(state, receipt.sourceTownId)} <Icon name="dispatch" className="inline-icon" /> {townName(state, receipt.townId)}
      </p>
      <CargoCards catalog={catalog} cargo={receipt.cargo} testId="caravan-arrival-cargo" />
      <p className="cv-added success" data-testid="caravan-added">
        <Icon name="arrival" className="inline-icon" /> Added to {townName(state, receipt.townId)} garrison.
      </p>
      <p className="small dim" data-testid="caravan-journey">
        <Icon name="hourglass" className="inline-icon" /> Journey complete · {days} {days === 1 ? 'day' : 'days'} ({dateLabel(receipt.day)})
      </p>
      {town ? (
        <div className="cv-garrison">
          <ArmyStrip catalog={catalog} army={town.garrison} label={`${town.name} garrison`} testId="caravan-arrival-garrison" />
        </div>
      ) : null}
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Actor picker (a tile holding the viewer's hero and caravan)
// ---------------------------------------------------------------------------

export function ActorPickerDialog({ coord, onPlan }: { coord: HexCoord; onPlan?: (() => void) | null }) {
  const store = useStore();
  const catalog = store.catalog;
  const state = store.session!.state;
  const playerId = store.session!.humanPlayerId;
  const heroes = Object.values(state.heroes).filter((h) => h.status === 'active' && h.ownerId === playerId && h.position.q === coord.q && h.position.r === coord.r);
  const caravans = caravansAt(state, coord).filter((c) => c.ownerId === playerId);
  return (
    <Modal title="Who do you mean?" onClose={() => store.closeOverlay()} width="26rem" testId="actor-picker">
      <ul className="cv-picker">
        {heroes.map((h) => (
          <li key={h.id}>
            <Button
              block
              onClick={() => {
                store.closeOverlay();
                store.selectedHeroId = h.id;
                store.notify();
              }}
              data-testid={`actor-hero-${h.id}`}
            >
              <HeroPortrait catalog={catalog} definitionId={h.definitionId} name={h.name} size="1.6rem" />
              <span>Select {h.name}</span>
            </Button>
          </li>
        ))}
        {caravans.map((c) => (
          <li key={c.id}>
            <Button
              block
              icon="caravan"
              onClick={() => {
                store.closeOverlay();
                store.openOverlay({ kind: 'caravan-tracker', caravanId: c.id });
              }}
              data-testid={`actor-caravan-${c.id}`}
            >
              Caravan to {townName(state, c.destinationTownId)} · {CARAVAN_STATUS_LABEL[c.status]}
            </Button>
          </li>
        ))}
        {onPlan ? (
          <li>
            <Button
              block
              icon="journey"
              onClick={() => {
                store.closeOverlay();
                onPlan();
              }}
              data-testid="actor-plan-route"
            >
              Plan the selected hero’s route here
            </Button>
          </li>
        ) : null}
      </ul>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Command sidebar list
// ---------------------------------------------------------------------------

export function CaravanSidebar({ onFocus }: { onFocus: (c: HexCoord) => void }) {
  const store = useStore();
  const catalog = store.catalog;
  const state = store.session!.state;
  const list = myCaravans(state, store.session!.humanPlayerId);
  if (list.length === 0) return null;
  return (
    <section className="adv-command__group" aria-label="Caravans" data-testid="caravan-list">
      <div className="adv-command__label">Caravans</div>
      <div className="adv-list adv-command__caravans">
        {list.map((c) => {
          const eta = caravanEta(catalog, state, c);
          const held = c.status === 'blocked' || c.status === 'awaiting_garrison';
          const label = `Caravan to ${townName(state, c.destinationTownId)}: ${CARAVAN_STATUS_LABEL[c.status]}${eta !== null ? `, arrives day ${eta}` : ''}`;
          return (
            <button
              key={c.id}
              type="button"
              className={`caravan-tab ${held ? 'is-held' : ''}`}
              onClick={() => store.openOverlay({ kind: 'caravan-tracker', caravanId: c.id })}
              onContextMenu={(e) => {
                e.preventDefault();
                onFocus(c.coord);
              }}
              title={`${label} (right-click: show on the map)`}
              aria-label={label}
              data-testid={`caravan-tab-${c.id}`}
              data-status={c.status}
            >
              <Icon name={held ? 'blocked' : 'caravan'} />
              <span className="caravan-tab__to">{townName(state, c.destinationTownId)}</span>
              <span className="caravan-tab__eta num">{eta !== null ? `D${eta}` : held ? '!' : '…'}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

/** The tile panel's caravan lines: the viewer's own (exact) or another's in sight, through the scouting projection only. */
export function CaravanTileLines({ coord }: { coord: HexCoord }) {
  const store = useStore();
  const catalog = store.catalog;
  const state = store.session!.state;
  const playerId = store.session!.humanPlayerId;
  const here = caravansAt(state, coord);
  if (here.length === 0) return null;
  return (
    <>
      {here.map((c) => {
        if (c.ownerId === playerId) {
          return (
            <div key={c.id} className="small" data-testid={`tile-caravan-${c.id}`}>
              <Icon name="caravan" className="inline-icon" /> Your caravan · {caravanStateLine(catalog, state, c)} · {cargoText(catalog, c.cargo)}
            </div>
          );
        }
        const view = caravanIntelView(catalog, state, playerId, c);
        const full = view ? null : caravanFullCargo(catalog, state, playerId, c);
        if (!view && !full) return null;
        const owner = state.players[c.ownerId]?.name ?? 'A rival';
        return (
          <div key={c.id} className="small" data-testid="tile-foe-caravan">
            <Icon name="caravan" className="inline-icon" /> {owner}’s supply caravan
            {view ? <ArmyIntelPanel catalog={catalog} view={view} compact testId="foe-caravan-intel" /> : <ArmyPreview catalog={catalog} stacks={full!} testId="foe-caravan-cargo" />}
          </div>
        );
      })}
    </>
  );
}
