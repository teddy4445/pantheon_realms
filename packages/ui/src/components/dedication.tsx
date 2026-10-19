/**
 * City dedications (CITY DEDICATIONS handoff §09, 2026-10-17; app 1.5.0) — the shared
 * pieces of every screen: the temple medallion, the dedication pane with its three
 * illustrated benefit rows and the god selection, the service-saving line of the quote
 * panels, a god's city profile, the empire blessing for the rules mode and the grouped
 * "City blessings" section of the weekly summary.
 *
 * Existing art only (god portraits, resource icons, favored-creature portraits, the town's
 * own building pictures, the delivered god-card icons) and live text. Every number comes
 * from the rules' view, quotes and events (`app/dedication.ts` chooses the words); the two
 * commands go through the store's dispatch after a confirmation that shows the quoted terms.
 * State never rests on colour alone: each row and chip carries an icon and words.
 */
import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import {
  RESOURCE_KEYS,
  RESOURCE_LABELS,
  nextWorldWeekBoundary,
  quoteDedicateTown,
  quoteScheduleTownRededication,
  townDedicationView,
  type BuildingSlotDefinition,
  type ContentCatalog,
  type DedicationSaving,
  type GodDefinition,
  type TownDedicationView,
  type TownState,
} from '@pr/rules';
import { useStore } from '../app/context';
import { reducedMotion } from '../app/preferences';
import {
  blessingOnlyThroughCities,
  empireBlessing,
  godCityProfile,
  godName,
  possessive,
  savingPriceText,
  savingText,
  townBenefitRows,
  type BenefitArt,
  type BenefitRow,
  type BlessingMode,
  type CityBlessingsSummary,
  type GodCityOption,
  cityBlessingText,
} from '../app/dedication';
import { Button, Modal } from './kit';
import { BuildingArt, CreaturePortrait, Emblem, GodPortrait } from './art';
import { CostList } from './game';
import { GodBenefits, GodCardIcon } from './godIcons';
import { Icon } from '../assets/icons';
import { townBackground } from '../assets/manifest';
import { guiThemeFor } from '../assets/guiArt';

const fmt = (n: number) => n.toLocaleString('en-US');

/** Long god names (Huitzilopochtli, Mictlantecuhtli) are set smaller so they fit their plate without breaking mid-word. */
export function nameSize(name: string): string {
  return name.length > 13 ? 'is-very-long' : name.length > 9 ? 'is-long' : '';
}

// ---------------------------------------------------------------------------
// Small pieces
// ---------------------------------------------------------------------------

/** A benefit's picture: the resource icon, the favored creature's portrait or the town building. */
export function BenefitPicture({ catalog, art, size = '2.8rem' }: { catalog: ContentCatalog; art: BenefitArt | null; size?: string }) {
  if (!art) return <span className="ded-pic" style={{ width: size, height: size }} aria-hidden="true" />;
  if (art.type === 'resource') {
    return (
      <span className="ded-pic ded-pic--res" style={{ width: size, height: size }} aria-hidden="true">
        <Icon name={art.resource} />
      </span>
    );
  }
  if (art.type === 'creature') {
    return (
      <span className="ded-pic ded-pic--creature" style={{ width: size, height: size }} aria-hidden="true">
        <CreaturePortrait catalog={catalog} creatureId={art.creatureId} size="100%" />
      </span>
    );
  }
  return (
    <span className="ded-pic ded-pic--building" style={{ width: size, height: size }} aria-hidden="true">
      <BuildingArt artAssetId={art.artAssetId} alt="" />
    </span>
  );
}

/** Works now (check) or what is missing (lock) — the shape and the words carry it, not the colour. */
export function StatusLine({ ok, children, testId }: { ok: boolean; children: ReactNode; testId?: string }) {
  return (
    <span className={`ded-status ${ok ? 'is-ok' : 'is-missing'}`} data-testid={testId}>
      <Icon name={ok ? 'check' : 'lock'} glyph className="ded-status__icon" />
      <span className="sr-only">{ok ? 'Works now: ' : 'Not yet: '}</span>
      <span>{children}</span>
    </span>
  );
}

/** One of the three illustrated rows of the temple pane. */
export function BenefitRowView({ catalog, row }: { catalog: ContentCatalog; row: BenefitRow }) {
  return (
    <li className={`ded-row ded-row--${row.kind} ${row.ok ? 'is-ok' : 'is-missing'}`} data-testid={`ded-row-${row.kind}`}>
      <BenefitPicture catalog={catalog} art={row.art} />
      <span className="ded-row__text">
        <span className="ded-row__title">{row.title}</span>
        <span className="ded-row__detail">{row.detail}</span>
        <StatusLine ok={row.ok}>{row.status}</StatusLine>
      </span>
    </li>
  );
}

export type DedicationState = 'active' | 'dormant' | 'pending' | 'none';

export function dedicationState(view: TownDedicationView): DedicationState {
  if (view.pending) return 'pending';
  return view.active?.state ?? 'none';
}

const STATE_TEXT: Record<DedicationState, string> = { active: 'Active', dormant: 'Dormant', pending: 'Change scheduled', none: 'No god yet' };
const STATE_ICON: Record<DedicationState, 'check' | 'lock' | 'hourglass' | 'star'> = { active: 'check', dormant: 'lock', pending: 'hourglass', none: 'star' };

export function DedicationStateChip({ state }: { state: DedicationState }) {
  return (
    <span className={`chip ded-chip is-${state}`} data-testid="ded-state">
      <Icon name={STATE_ICON[state]} glyph className="ded-chip__icon" />
      {STATE_TEXT[state]}
    </span>
  );
}

/**
 * "Athena’s patronage — saves 200 Gold (normally 1,000 Gold, now 800)": the saving a quote
 * reports (`dedication`), with the god's portrait. Shown only when Gold was saved.
 */
export function SavingLine({ catalog, saving, testId, per }: { catalog: ContentCatalog; saving: DedicationSaving | undefined | null; testId?: string; per?: string }) {
  if (!saving || saving.savedGold <= 0) return null;
  return (
    <p className="ded-saving" data-testid={testId ?? 'dedication-saving'} title={`${saving.percent}% less Gold from this city’s dedication`}>
      <GodPortrait catalog={catalog} godId={saving.godId} size="1.5rem" />
      <span className="ded-saving__text">
        <strong>{savingText(catalog, saving)}</strong>
        <span className="ded-saving__price">
          {' '}
          ({savingPriceText(saving)}
          {per ? ` ${per}` : ''})
        </span>
      </span>
    </p>
  );
}

// ---------------------------------------------------------------------------
// A god's profile and empire blessing (cards, encyclopedia, confirmations)
// ---------------------------------------------------------------------------

/** The god's three city benefits as compact illustrated lines (the authored amounts). */
export function GodCityLines({ catalog, godId, town, testId }: { catalog: ContentCatalog; godId: string; town?: TownState | null; testId?: string }) {
  const p = godCityProfile(catalog, godId, town ?? null);
  if (!p) return null;
  return (
    <ul className="ded-mini" aria-label={`${possessive(godName(catalog, godId))} city dedication`} data-testid={testId ?? `ded-profile-${godId}`}>
      <li className="ded-mini__item" title={`${p.giftTitle}: paid to the owner at each new week while a city honors ${godName(catalog, godId)}`}>
        <BenefitPicture catalog={catalog} art={p.giftResource ? { type: 'resource', resource: p.giftResource } : null} size="1.7rem" />
        <span>{p.giftTitle}</span>
      </li>
      <li className="ded-mini__item" title={`Extra stock for the shared pool of the ${p.familyName}; no new access, recruited at the usual price`}>
        <BenefitPicture catalog={catalog} art={p.creatureId ? { type: 'creature', creatureId: p.creatureId } : null} size="1.7rem" />
        <span>{p.growthText}</span>
      </li>
      <li className="ded-mini__item" title={p.rule.summary} tabIndex={0}>
        <BenefitPicture catalog={catalog} art={p.serviceArt ? { type: 'building', ...p.serviceArt } : null} size="1.7rem" />
        <span>
          {p.rule.name}
          <span className="sr-only">: {p.rule.summary}</span>
        </span>
      </li>
    </ul>
  );
}

/**
 * The god's empire blessing for the rules mode: in a city-dedication game without the
 * replaced daily income and weekly growth; a god left without one says so plainly. Legacy
 * games and the encyclopedia outside a game keep the authored text.
 */
export function EmpireBlessing({ catalog, god, mode }: { catalog: ContentCatalog; god: GodDefinition; mode: BlessingMode }) {
  const b = empireBlessing(catalog, god.id, mode);
  if (!blessingOnlyThroughCities(b) && b.summary.length === 0 && b.retained.length === 0) return <p className="small dim">No blessing designed yet.</p>;
  return <GodBenefits catalog={catalog} god={god} blessing={b} />;
}

/** "Empire blessing" and "Available city dedication", side by side in meaning (god cards and the commit dialog). */
export function GodDedicationSections({ catalog, god, mode, children }: { catalog: ContentCatalog; god: GodDefinition; mode: BlessingMode; children?: ReactNode }) {
  return (
    <div className="ded-god" data-testid={`god-split-${god.id}`}>
      <section className="ded-god__part" aria-label="Empire blessing">
        <h4 className="ded-god__title">Empire blessing</h4>
        <EmpireBlessing catalog={catalog} god={god} mode={mode} />
      </section>
      <section className="ded-god__part" aria-label="Available city dedication">
        <h4 className="ded-god__title">Available city dedication</h4>
        <GodCityLines catalog={catalog} godId={god.id} />
        <p className="ded-god__note small">Needs Temple II · chosen per city</p>
        {children}
      </section>
    </div>
  );
}

const OPTION_ICON: Record<GodCityOption['kind'], 'check' | 'hourglass' | 'star' | 'swap' | 'lock'> = { honors: 'check', pending: 'hourglass', free: 'star', switch: 'swap', later: 'lock', blocked: 'lock' };

/** The player's cities for a god card: honored, scheduled, could switch (with what works now and after building). */
export function GodCityOptionsList({ options, onOpen, testId }: { options: readonly GodCityOption[]; onOpen?: (townId: string) => void; testId?: string }) {
  if (options.length === 0) return null;
  return (
    <ul className="ded-cities" aria-label="Your cities" data-testid={testId}>
      {options.map((o) => {
        const after = [o.growthMissing, o.serviceMissing].filter((x): x is string => !!x);
        return (
          <li key={o.townId} className={`ded-cities__item is-${o.kind}`} data-testid={`${testId ?? 'ded-cities'}-${o.townId}`}>
            <Icon name={OPTION_ICON[o.kind]} glyph className="ded-cities__icon" />
            <span className="ded-cities__text">
              <strong>{o.townName}</strong>: {o.text}
              {o.kind !== 'blocked' && after.length ? <span className="ded-cities__after"> · after building: {after.join('; ')}</span> : o.kind !== 'blocked' && o.kind !== 'later' ? <span className="ded-cities__after"> · all three work at once</span> : null}
            </span>
            {onOpen && o.kind !== 'blocked' && o.kind !== 'later' ? (
              <Button size="small" variant="ghost" onClick={() => onOpen(o.townId)} aria-label={`Open the dedication of ${o.townName}`}>
                Open
              </Button>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

// ---------------------------------------------------------------------------
// Town: the medallion beside the temple and the dedication pane
// ---------------------------------------------------------------------------

/**
 * The small medallion beside the temple (on the painted plinth at its lower right, where
 * the temple's own label appears): the honored god's portrait, or the commitment seal when
 * none, with a state badge. Opens the dedication pane. Kept clear of the temple's entrance.
 */
export function DedicationMedallion({ catalog, view, slot, onOpen, pulseKey }: { catalog: ContentCatalog; view: TownDedicationView; slot: BuildingSlotDefinition; onOpen: () => void; pulseKey: number }) {
  const p = slot.placement;
  const state = dedicationState(view);
  const godId = view.active?.godId ?? null;
  const name = godName(catalog, godId);
  const pendingName = view.pending ? godName(catalog, view.pending.godId) : '';
  const label = godId
    ? `City dedication: ${name} — ${STATE_TEXT[view.active!.state]}${view.active?.dormantReason ? ` (${view.active.dormantReason})` : ''}${view.pending ? `; ${pendingName} takes over on day ${view.pending.activationDay}` : ''}`
    : view.town.ok
      ? 'City dedication: choose a god for this city'
      : `City dedication: ${view.town.reason ?? 'not available'}`;
  // The temple picture is square: its painted plinth ends about 15 % above the slot's foot and 8 % inside its right edge.
  const left = p.x + p.width * 0.4;
  const top = p.y - p.width * 0.32;
  // Never under the town's economy bar (at a large interface scale the bar reaches down over the temple):
  // measured on layout and resize only, the medallion then steps down just below the bar.
  const ref = useRef<HTMLButtonElement>(null);
  const [shift, setShift] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    const scene = el?.parentElement;
    if (!el || !scene) return;
    const measure = () => {
      const hud = scene.querySelector('[data-testid="town-economy"]');
      if (!hud) return setShift(0);
      const sr = scene.getBoundingClientRect();
      const hr = hud.getBoundingClientRect();
      const size = el.offsetWidth || 0;
      const cx = sr.left + (sr.width * left) / 100;
      const cy = sr.top + (sr.height * top) / 100;
      const overlapX = cx - size / 2 < hr.right + 4 && cx + size / 2 > hr.left - 4;
      const overlapY = cy - size / 2 < hr.bottom + 4 && cy + size / 2 > hr.top;
      const next = overlapX && overlapY ? Math.ceil(hr.bottom + 6 - (cy - size / 2)) : 0;
      setShift((old) => (old === next ? old : next));
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(scene);
    const hud = scene.querySelector('[data-testid="town-economy"]');
    if (hud) ro.observe(hud);
    return () => ro.disconnect();
  }, [left, top]);
  const style: CSSProperties = { left: `${left}%`, top: `${top}%`, ...(shift ? { marginTop: `${shift}px` } : {}) };
  return (
    <button ref={ref} type="button" className={`ded-medal is-${state} ${pulseKey ? 'is-sealed' : ''}`} style={style} onClick={onOpen} aria-label={label} title={label} data-testid="ded-medallion" data-state={state}>
      <span className="ded-medal__face">{godId ? <GodPortrait catalog={catalog} godId={godId} size="100%" /> : <GodCardIcon id="icon.god.committed" fallback="star" />}</span>
      <span className="ded-medal__badge" aria-hidden="true">
        <Icon name={STATE_ICON[state]} glyph />
      </span>
    </button>
  );
}

/** One actionable god card of the selection (patron or committed minor). */
function ChoiceCard({ catalog, town, view, option, onChoose }: { catalog: ContentCatalog; town: TownState; view: TownDedicationView; option: TownDedicationView['options'][number]; onChoose: (godId: string) => void }) {
  const god = catalog.gods[option.godId];
  if (!god) return null;
  const verb = view.action === 'dedicate' ? 'Dedicate to' : 'Switch to';
  return (
    <article className={`ded-card ${option.isActive ? 'is-active' : ''} ${option.isPending ? 'is-pending' : ''}`} data-testid={`ded-choice-${option.godId}`}>
      <header className="ded-card__head">
        <GodPortrait catalog={catalog} godId={option.godId} size="3.6rem" />
        <div className="ded-card__who">
          <div className={`ded-card__name ${nameSize(god.name)}`}>{god.name}</div>
          <div className="ded-card__role small">{god.role === 'patron' ? 'Your patron' : 'Committed god'}</div>
          {option.isActive ? (
            <span className="chip ded-chip is-active">
              <Icon name="check" glyph className="ded-chip__icon" />
              Honored here
            </span>
          ) : option.isPending ? (
            <span className="chip ded-chip is-pending">
              <Icon name="hourglass" glyph className="ded-chip__icon" />
              From day {view.pending?.activationDay}
            </span>
          ) : null}
        </div>
      </header>
      <GodCityLines catalog={catalog} godId={option.godId} town={town} testId={`ded-choice-profile-${option.godId}`} />
      <Button variant="primary" block className="ded-card__go" disabled={!option.selectable} disabledReason={option.reason} onClick={() => onChoose(option.godId)} data-testid={`ded-choose-${option.godId}`}>
        {verb} {god.name}
      </Button>
      {!option.selectable && option.reason ? (
        <p className="ded-card__reason small">
          <Icon name="lock" glyph className="ded-status__icon" /> {option.reason}
        </p>
      ) : null}
    </article>
  );
}

/** The terms of a confirmation: one god's three benefits under a heading. */
function TermsBlock({ catalog, godId, heading, town }: { catalog: ContentCatalog; godId: string; heading: string; town: TownState }) {
  return (
    <section className="ded-terms__block" aria-label={heading}>
      <div className="ded-terms__head">
        <GodPortrait catalog={catalog} godId={godId} size="2rem" />
        <span>{heading}</span>
      </div>
      <GodCityLines catalog={catalog} godId={godId} town={town} testId={`ded-terms-${godId}`} />
    </section>
  );
}

/**
 * The dedication pane of a town (from the temple medallion or the temple's pop-up): the
 * honored god with its state and three benefit rows; a scheduled change; why the town
 * cannot be dedicated (Temple II, a foreign pantheon). "Choose" shows the actionable gods
 * (patron and committed minors) apart from the locked "Future choices"; choosing confirms
 * the quoted terms, then sends DedicateTown or ScheduleTownRededication once.
 */
export function DedicationPane({ town, onClose, onSealed, startChoosing }: { town: TownState; onClose: () => void; onSealed?: () => void; startChoosing?: boolean }) {
  const store = useStore();
  const catalog = store.catalog;
  const state = store.session!.state;
  const playerId = store.session!.humanPlayerId;
  const view = townDedicationView(catalog, state, town.id, playerId);
  const [mode, setMode] = useState<'view' | 'choose'>(() => (startChoosing || (!view.active && !view.pending && view.action === 'dedicate') ? 'choose' : 'view'));
  const [seal, setSeal] = useState(0);
  const archetype = catalog.townArchetypes[town.archetypeId];
  const bg = archetype ? townBackground(archetype.backgroundAssetId, town.buildings['civic_hall']).url : null;
  const theme = guiThemeFor(town.pantheonId);
  const godId = view.active?.godId ?? null;
  const god = godId ? catalog.gods[godId] : undefined;
  const st = dedicationState(view);
  const rows = townBenefitRows(catalog, state, town, view);
  const actionable = view.options.filter((o) => o.committed);
  const future = view.options.filter((o) => !o.committed);
  const pendingName = view.pending ? godName(catalog, view.pending.godId) : '';
  const changeReason = !view.action ? (view.town.reason ?? 'Not available') : view.pending ? `${pendingName} is already scheduled for day ${view.pending.activationDay}; it cannot be cancelled in this version` : null;

  const done = (text: string) => {
    store.toast(text, 'success');
    setMode('view');
    if (!reducedMotion(store.prefs)) setSeal((k) => k + 1);
    onSealed?.();
  };
  const choose = (chosen: string) => {
    const s = store.session!.state;
    const name = godName(catalog, chosen);
    const profile = godCityProfile(catalog, chosen, town);
    if (view.action === 'dedicate') {
      const q = quoteDedicateTown(catalog, s, playerId, town.id, chosen);
      if (!q.legal) return store.toast(q.reason ?? 'Cannot dedicate this town', 'error');
      store.confirm(
        `Dedicate ${town.name} to ${name}?`,
        `Free. ${profile?.rule.name ?? 'Its service'} works in ${town.name} at once; the first weekly gift and extra ${profile?.familyName ?? 'creatures'} come on day ${q.activationDay}. Nothing is granted today.`,
        `Dedicate to ${name}`,
        () => {
          if (!store.dispatch({ kind: 'DedicateTown', townId: town.id, godId: chosen })) done(`${town.name} now honors ${name}`);
        },
        { content: <div className="ded-terms" data-testid="ded-confirm-terms"><TermsBlock catalog={catalog} godId={chosen} town={town} heading={`${name} in ${town.name}`} /></div> },
      );
      return;
    }
    const q = quoteScheduleTownRededication(catalog, s, playerId, town.id, chosen);
    if (!q.legal) return store.toast(q.reason ?? 'Cannot schedule this change', 'error');
    const current = q.currentGodId ? godName(catalog, q.currentGodId) : 'the current god';
    store.confirm(
      `Change ${possessive(town.name)} god to ${name}?`,
      `Costs ${fmt(q.cost.gold)} Gold now. ${name} takes over on day ${q.activationDay} (week ${q.activationWeek}); until then ${current} keeps blessing ${town.name}.`,
      `Pay ${fmt(q.cost.gold)} Gold and schedule`,
      () => {
        if (!store.dispatch({ kind: 'ScheduleTownRededication', townId: town.id, godId: chosen })) done(`${name} will take over ${town.name} on day ${q.activationDay}`);
      },
      {
        content: (
          <div className="ded-terms" data-testid="ded-confirm-terms">
            <div className="ded-terms__cost">
              <span>Price</span> <CostList cost={q.cost} wallet={s.players[playerId]?.wallet} />
            </div>
            {q.currentGodId ? <TermsBlock catalog={catalog} godId={q.currentGodId} town={town} heading={`Now, until day ${q.activationDay}: ${current}`} /> : null}
            <TermsBlock catalog={catalog} godId={chosen} town={town} heading={`From day ${q.activationDay}: ${name}`} />
          </div>
        ),
        detail: [`This change cannot be cancelled in this version.`, `If ${town.name} is captured before day ${q.activationDay}, the ${fmt(q.cost.gold)} Gold is not refunded.`],
      },
    );
  };

  const footer = (
    <>
      {mode === 'choose' && (view.active || view.pending) ? (
        <Button icon="back" onClick={() => setMode('view')} data-testid="ded-back">
          Back
        </Button>
      ) : null}
      <span className="grow" />
      <Button onClick={onClose} data-testid="ded-close">
        Close
      </Button>
      {mode === 'view' ? (
        <Button variant="primary" icon="star" disabled={!!changeReason} disabledReason={changeReason} onClick={() => setMode('choose')} data-testid="ded-open-choices">
          {view.active ? `Change god… (${fmt(view.switchCost.gold)} Gold)` : 'Choose a god…'}
        </Button>
      ) : null}
    </>
  );

  return (
    <Modal title={`City dedication — ${town.name}`} onClose={onClose} width={mode === 'choose' ? '54rem' : '46rem'} testId="dedication" theme={theme} footer={footer}>
      {mode === 'view' ? (
        <div className="ded-pane" data-testid="ded-pane">
          <aside className="ded-pane__god" style={bg ? { ['--ded-bg' as string]: `url("${bg}")` } : undefined}>
            <span className={`ded-seal ${seal ? 'is-sealed' : ''}`} key={seal}>
              {godId ? <GodPortrait catalog={catalog} godId={godId} size="6.6rem" locked={st === 'dormant'} /> : <span className="ded-seal__empty"><GodCardIcon id="icon.req.grand_temple" fallback="pantheon" /></span>}
              {seal ? (
                <span className="ded-seal__stamp" aria-hidden="true">
                  <GodCardIcon id="icon.god.committed" fallback="check" />
                </span>
              ) : null}
            </span>
            <h3 className={`ded-pane__name ${nameSize(god?.name ?? '')}`} data-testid="ded-god-name">{god?.name ?? 'No god yet'}</h3>
            {god ? <div className="ded-pane__domain">{god.domain}</div> : null}
            <DedicationStateChip state={st} />
          </aside>
          <section className="ded-pane__main">
            <div className="ded-eyebrow">This city’s dedication</div>
            {!view.town.ok && !godId ? (
              <div className="ded-blocked" data-testid="ded-blocked">
                {town.pantheonId !== state.players[playerId]?.pantheonId ? <Emblem catalog={catalog} pantheonId={town.pantheonId} size="2.6rem" /> : <GodCardIcon id="icon.req.grand_temple" fallback="lock" />}
                <div>
                  <StatusLine ok={false}>{view.town.reason}</StatusLine>
                  <p className="small dim">
                    {town.pantheonId !== state.players[playerId]?.pantheonId
                      ? 'Only a city of your own pantheon can honor your gods. Conquered cities of other pantheons keep their buildings, income and recruits.'
                      : 'A city with Temple II may honor your patron or a god you have committed to: a weekly gift, extra stock of one creature family and one town service.'}
                  </p>
                </div>
              </div>
            ) : null}
            {st === 'dormant' && view.active?.dormantReason ? (
              <p className="ded-note" data-testid="ded-dormant">
                <Icon name="lock" glyph className="ded-status__icon" /> Dormant: {view.active.dormantReason}. No gift, growth or service until it is met again; nothing is saved up meanwhile.
              </p>
            ) : null}
            {rows.length ? (
              <ul className="ded-rows" data-testid="ded-rows">
                {rows.map((r) => (
                  <BenefitRowView key={r.kind} catalog={catalog} row={r} />
                ))}
              </ul>
            ) : view.town.ok && !godId ? (
              <p className="dim">No god honors this city yet. The first dedication is free.</p>
            ) : null}
            {view.pending ? (
              <div className="ded-pending" data-testid="ded-pending">
                <GodPortrait catalog={catalog} godId={view.pending.godId} size="2.4rem" />
                <div>
                  <strong>
                    {pendingName} takes over on day {view.pending.activationDay}
                  </strong>{' '}
                  <span className="dim small">(week {view.pending.activationWeek})</span>
                  <div className="small">
                    {view.pending.waitingReason ? (
                      <StatusLine ok={false}>Waiting: {view.pending.waitingReason}. It is tried again at each new week.</StatusLine>
                    ) : (
                      `${god?.name ?? 'The current god'} keeps blessing this city until then. This change cannot be cancelled.`
                    )}
                  </div>
                </div>
              </div>
            ) : null}
          </section>
        </div>
      ) : (
        <div className="ded-choose" data-testid="ded-choose">
          <p className="ded-choose__lead">
            {view.action === 'dedicate'
              ? `The first dedication is free: its service works at once; its weekly gift and extra creatures start on day ${nextWorldWeekBoundary(catalog, state).day}.`
              : `Changing the city’s god costs ${fmt(view.switchCost.gold)} Gold and takes effect at the next new week; ${god?.name ?? 'the current god'} keeps blessing ${town.name} until then.`}
          </p>
          {!view.action && view.town.reason ? <StatusLine ok={false}>{view.town.reason}</StatusLine> : null}
          <div className="ded-cards" data-testid="ded-cards">
            {actionable.map((o) => (
              <ChoiceCard key={o.godId} catalog={catalog} town={town} view={view} option={o} onChoose={choose} />
            ))}
          </div>
          {future.length ? (
            <section className="ded-future" aria-label="Future choices" data-testid="ded-future">
              <h4 className="ded-future__title">
                <Icon name="lock" glyph className="ded-status__icon" /> Future choices
              </h4>
              <p className="small dim">Gods of your pantheon you have not committed to. Commit on the Pantheon screen first; a commitment never changes a city’s god.</p>
              <ul className="ded-future__list">
                {future.map((o) => (
                  <li key={o.godId} className="ded-future__item" data-testid={`ded-future-${o.godId}`} tabIndex={0} title={`${godName(catalog, o.godId)}: ${o.reason ?? 'Locked'}`}>
                    <GodPortrait catalog={catalog} godId={o.godId} size="2.2rem" locked />
                    <span className="ded-future__text">
                      <span className="ded-future__name">{godName(catalog, o.godId)}</span>
                      <span className="ded-future__reason">{o.reason}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      )}
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Weekly summary: the grouped "City blessings" section
// ---------------------------------------------------------------------------

/** "+3 Stone" with the resource icon (always words beside the icon). */
function GiftWords({ gift }: { gift: Readonly<Record<string, number>> }) {
  return (
    <>
      {RESOURCE_KEYS.filter((k) => (gift[k] ?? 0) > 0).map((k) => (
        <span key={k} className="ded-week__part ded-week__gift">
          <Icon name={k} className="ded-week__res" /> +{fmt(gift[k] ?? 0)} {RESOURCE_LABELS[k]}
        </span>
      ))}
    </>
  );
}

/** One grouped section for every city's weekly gift, new stock, rare-growth progress and switches (no popup per city). */
export function CityBlessingsSection({ catalog, summary }: { catalog: ContentCatalog; summary: CityBlessingsSummary }) {
  const anyGift = Object.values(summary.total).some((n) => n > 0);
  return (
    <section className="ded-week" aria-label="City blessings" data-testid="city-blessings">
      <h3 className="ded-week__title">
        <GodCardIcon id="icon.god.committed" fallback="star" /> City blessings{summary.week ? ` · week ${summary.week}` : ''}
      </h3>
      <ul className="ded-week__list">
        {summary.lines.map((l) => (
          <li key={l.townId} className="ded-week__item" data-testid={`city-blessing-${l.townId}`} aria-label={cityBlessingText(catalog, l)}>
            {l.godId ? <GodPortrait catalog={catalog} godId={l.godId} size="1.9rem" /> : <Icon name="town" className="ded-week__town" />}
            <span className="ded-week__text" aria-hidden="true">
              <strong>{l.townName}</strong>
              {l.activated ? (
                <span className="ded-week__part">
                  <Icon name="swap" glyph className="ded-status__icon" /> now honors {godName(catalog, l.activated.godId)}
                </span>
              ) : null}
              {l.gift ? <GiftWords gift={l.gift} /> : null}
              {l.growth ? (
                <span className="ded-week__part">
                  {l.growth.creatureId ? <CreaturePortrait catalog={catalog} creatureId={l.growth.creatureId} size="1.4rem" /> : null} {l.growth.text}
                </span>
              ) : null}
              {l.delayed ? (
                <span className="ded-week__part is-missing">
                  <Icon name="hourglass" glyph className="ded-status__icon" /> change to {godName(catalog, l.delayed.godId)} waits: {l.delayed.reason}
                </span>
              ) : null}
              {l.cleared ? (
                <span className="ded-week__part is-missing">
                  <Icon name="lock" glyph className="ded-status__icon" /> dedication ended (town lost)
                </span>
              ) : null}
            </span>
          </li>
        ))}
      </ul>
      {anyGift && summary.lines.filter((l) => l.gift).length > 1 ? (
        <p className="ded-week__total small" data-testid="city-blessings-total">
          In all: <CostList cost={summary.total} />
        </p>
      ) : null}
    </section>
  );
}
