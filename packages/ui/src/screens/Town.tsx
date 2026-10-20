/**
 * S08 Town Management. A composed town scene with the archetype's 18 fixed
 * locations (11 support + 7 dwellings). Every build state, cost and missing
 * prerequisite comes from quoteConstruction; building is a BuildStructure
 * command after a confirmation. Market, Tavern and Sanctum services are here.
 *
 * Layout (owner request 2026-10-03): the painting fills the screen; the town
 * economy is a slim bar on the painting's top edge (where each archetype's sky
 * is free: TownArchetypeDefinition.hudAnchor); clicking a location opens a
 * pop-up beside that building with icon actions; the garrison and the visiting
 * hero's army are centred below with a divider between them.
 */
import { TownHallTransition } from '../components/TownHallTransition';
import { caravansOn } from '../app/caravans';
import { useEffect, useMemo, useRef, useState, type CSSProperties, type DragEvent, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import {
  ARTIFACT_SLOT_LABEL,
  RESOURCE_LABELS,
  activeBuildingInSlot,
  hireOptions,
  specialtiesEnabled,
  heroStartingArmy,
  townTierOneBase,
  quoteConstruction,
  quoteHireHero,
  heroHiredThisWeek,
  quoteSpellbook,
  quoteTrade,
  townMarketRates,
  playerMarketCount,
  townDailyIncome,
  townGrowthMultiplier,
  townHasEffect,
  townSpellLibraryTier,
  weeklyGrowthFor,
  familyForSlot,
  quoteOffering,
  divineGifts,
  giftNeedsHero,
  quoteDivineGift,
  quoteTraining,
  quoteArtifactPurchase,
  townShopPrice,
  townTrainingTerms,
  townVisionRadius,
  townMerchantStockSize,
  worldWeek,
  quoteTransfer,
  townDedicationView,
  cityDedicationProfile,
  dedicationGrowthPreview,
  type ArmyRef,
  type ArmyState,
  type HeroState,
  type MatchState,
  type OfferingLine,
  type BuildingSlotDefinition,
  type ResourceKey,
  type TownState,
} from '@pr/rules';
import { giftFxKind, type TownFxKind } from '@pr/presentation/core';
import { useStore } from '../app/context';
import { reducedMotion } from '../app/preferences';
import { Burst } from '../components/burst';
import type { AppStore } from '../app/store';
import { Button, Chip, Modal, QuantitySelector, SectionTitle } from '../components/kit';
import { ArtifactIcon, BuildingArt, CreaturePortrait, Emblem, HeroPortrait, SpecialtyLine } from '../components/art';
import { AdventureStage, HeroFigure, KitOrnament, adventureScene } from '../components/adventure';
import { ArmyStrip, CostList, ScreenHeader } from '../components/game';
import { resolveAsset, townBackground } from '../assets/manifest';
import { Icon, type IconName } from '../assets/icons';
import { formatNumber, heroStory, heroesInTown, humanPlayer } from '../app/view';
import { guiThemeFor, themeAsset } from '../assets/guiArt';
import { GuiArtHeader, LockGlyph, useOnce } from '../components/gui';
import { dedicationsOn, giftResource, giftTitle, godName } from '../app/dedication';
import { DedicationMedallion, DedicationPane, SavingLine } from '../components/dedication';
import { CoastalLaunchModal } from '../components/naval';
import { launchView } from '../app/naval';

function slotArtId(catalog: AppStore['catalog'], town: TownState, slot: BuildingSlotDefinition): { id: string; built: boolean } {
  const active = activeBuildingInSlot(catalog, town, slot.id);
  if (active) return { id: active.artAssetId, built: true };
  const first = catalog.buildings[slot.chain[0] ?? ''];
  return { id: first?.artAssetId ?? '', built: false };
}

const TRADE_GOODS = ['wood', 'stone', 'crystal'] as const;
type TradeGood = (typeof TRADE_GOODS)[number];

/**
 * The Marketplace (concept 10): the merchant's counter in the town's colours.
 * Resources trade through Gold only (sell for Gold or buy with Gold); what is
 * paid and what is received sit apart with their icons, then the rate, the
 * quantity and the holdings after the trade. Prices and legality come from
 * quoteTrade; Trade runs the TradeResources command once per press.
 */
type SlotStatus = 'ready' | 'blocked' | 'planned' | 'done';

/** One location's construction state: current and next level, the next building's quote and why it cannot be built. */
function slotPlan(catalog: AppStore['catalog'], state: MatchState, playerId: string, town: TownState, slot: BuildingSlotDefinition) {
  const level = town.buildings[slot.id] ?? 0;
  const current = activeBuildingInSlot(catalog, town, slot.id);
  const nextId = slot.chain[level];
  const next = nextId ? catalog.buildings[nextId] : undefined;
  const quote = next ? quoteConstruction(catalog, state, playerId, town.id, next.id) : null;
  const planned = !!next && next.implementationStatus === 'planned';
  const status: SlotStatus = !next ? 'done' : planned ? 'planned' : quote?.legal ? 'ready' : 'blocked';
  return { slot, level, total: slot.chain.length, current, next, quote, planned, status };
}

/** A building's short tooltip line (shown on hover after a delay and at once on keyboard focus). */
function slotHint(catalog: AppStore['catalog'], state: MatchState, town: TownState, plan: ReturnType<typeof slotPlan>, favored?: FavoredGrowth | null): string {
  const family = familyForSlot(catalog, plan.slot);
  if (family && plan.current) {
    const fam = catalog.families[family];
    const creature = fam ? catalog.creatures[fam.baseCreatureId] : undefined;
    const name = creature?.pluralName ?? fam?.name ?? '';
    return `${town.population[family] ?? 0} ${name} available · +${weeklyGrowthFor(catalog, town, family, state)} each week${favored && favored.familyId === family ? ` · ${favoredText(favored)}` : ''}`;
  }
  if (plan.status === 'done') return plan.total > 1 ? `Level ${plan.level} of ${plan.total} · fully built` : 'Built';
  if (plan.status === 'planned') return 'Planned: not designed yet';
  if (plan.status === 'ready') return plan.current ? `Can upgrade today: ${plan.next!.name}` : `Can build today: ${plan.next!.name}`;
  const why = plan.quote?.missing[0] ?? plan.quote?.reason ?? '';
  return plan.current ? `Next: ${plan.next!.name}${why ? ` — ${why}` : ''}` : `Not built${why ? ` — ${why}` : ''}`;
}

/** City dedications: the honored god's favored family here and its increment at the next week (`dedicationGrowthPreview`). */
interface FavoredGrowth {
  readonly familyId: string;
  readonly god: string;
  readonly added: number;
}

function favoredText(f: FavoredGrowth): string {
  return f.added > 0 ? `+${f.added} more from ${f.god} next week` : `favored by ${f.god}`;
}

const STATUS_ORDER: readonly SlotStatus[] = ['ready', 'blocked', 'planned', 'done'];
const STATUS_TITLE: Record<SlotStatus, string> = { ready: 'Ready to build', blocked: 'Not yet available', planned: 'Planned', done: 'Fully built' };

/**
 * The construction list (concept 07): every location of the town, unbuilt and
 * upgradable ones first, with the current and next level, the price, missing
 * prerequisites and why a building cannot be started. Opened from the town
 * hall and from the Build control on the economy bar; Build runs the existing
 * BuildStructure command once.
 */
function ConstructionModal({ town, onClose, onShow, onBuilt }: { town: TownState; onClose: () => void; onShow: (slotId: string) => void; onBuilt: (slotId: string) => void }) {
  const store = useStore();
  const catalog = store.catalog;
  const state = store.session!.state;
  const playerId = store.session!.humanPlayerId;
  const wallet = state.players[playerId]!.wallet;
  const archetype = catalog.townArchetypes[town.archetypeId];
  const mine = town.ownerId === playerId;
  const usedToday = town.buildUsedDay === state.day;
  const [pending, once] = useOnce();
  const plans = (archetype?.slots ?? []).map((sl) => slotPlan(catalog, state, playerId, town, sl));
  const build = (plan: ReturnType<typeof slotPlan>) =>
    once(() => {
      if (!plan.next || !plan.quote?.legal || !mine) return false;
      if (store.dispatch({ kind: 'BuildStructure', townId: town.id, buildingId: plan.next.id })) return false;
      store.toast(`${plan.next.name} built`, 'success');
      onBuilt(plan.slot.id);
      return true;
    });
  return (
    <Modal title={`Construction — ${town.name}`} onClose={onClose} width="52rem" testId="construction" surface="parchment" theme={guiThemeFor(town.pantheonId)} footer={<Button onClick={onClose}>Close</Button>}>
      <p className="small construction__day" data-testid="construction-day">
        <Icon name="build" className="inline-icon" /> {usedToday ? 'A building was raised here today; the next one can start tomorrow.' : 'One building can be raised in this town today.'}
      </p>
      {STATUS_ORDER.map((st) => {
        const group = plans.filter((x) => x.status === st);
        if (!group.length) return null;
        return (
          <section key={st} className={`construction__group is-${st}`} aria-label={STATUS_TITLE[st]}>
            <SectionTitle>
              {STATUS_TITLE[st]} ({group.length})
            </SectionTitle>
            <ul className="construction__list">
              {group.map((plan) => {
                const shown = plan.next ?? plan.current;
                const reason = !mine ? 'You do not own this town' : plan.quote?.reason ?? null;
                return (
                  <li key={plan.slot.id} className={`build-row is-${plan.status}`} data-testid={`construction-${plan.slot.id}`}>
                    <span className="build-row__art">{shown ? <BuildingArt artAssetId={shown.artAssetId} alt="" /> : null}</span>
                    <div className="build-row__text">
                      <div className="build-row__name">{shown?.name ?? plan.slot.label}</div>
                      <div className="build-row__meta">
                        {plan.slot.label} · {plan.level === 0 ? 'not built' : `level ${plan.level} of ${plan.total}`}
                        {plan.next ? ` → level ${plan.level + 1}` : ''}
                      </div>
                      {plan.next ? <p className="build-row__summary">{plan.next.summary}</p> : plan.current ? <p className="build-row__summary">{plan.current.summary}</p> : null}
                      {plan.next && !plan.planned && plan.quote ? <CostList cost={plan.quote.cost} wallet={wallet} /> : null}
                      {plan.next && !plan.planned ? <SavingLine catalog={catalog} saving={plan.quote?.dedication} testId={`construction-saving-${plan.slot.id}`} /> : null}
                      {plan.status === 'blocked' ? (
                        plan.quote?.missing.length ? (
                          <ul className="build-row__missing">
                            {plan.quote.missing.map((m) => (
                              <li key={m}>
                                <LockGlyph />
                                {m}
                              </li>
                            ))}
                          </ul>
                        ) : reason ? (
                          <p className="build-row__reason">
                            <LockGlyph />
                            {reason}
                          </p>
                        ) : null
                      ) : null}
                      {plan.status === 'planned' ? <p className="build-row__reason">Its mechanics are not designed yet, so it cannot be built.</p> : null}
                    </div>
                    <div className="build-row__actions">
                      <Button size="small" onClick={() => onShow(plan.slot.id)} aria-label={`Show ${plan.slot.label} in the town`} data-testid={`construction-show-${plan.slot.id}`}>
                        Show
                      </Button>
                      {plan.next && !plan.planned ? (
                        <Button
                          variant="primary"
                          size="small"
                          disabled={!plan.quote?.legal || !mine || pending}
                          disabledReason={reason}
                          onClick={() => build(plan)}
                          aria-label={`Build ${plan.next.name}`}
                          data-testid={`construction-build-${plan.slot.id}`}
                        >
                          Build
                        </Button>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </Modal>
  );
}

function MarketModal({ town, onClose }: { town: TownState; onClose: () => void }) {
  const store = useStore();
  const catalog = store.catalog;
  const state = store.session!.state;
  const playerId = store.session!.humanPlayerId;
  const wallet = state.players[playerId]!.wallet;
  const theme = guiThemeFor(town.pantheonId);
  const [mode, setMode] = useState<'sell' | 'buy'>('sell');
  const [res, setRes] = useState<TradeGood>('wood');
  const [amount, setAmount] = useState(1);
  const [pending, once] = useOnce(600);
  const goodRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const markets = playerMarketCount(catalog, state, playerId);
  // This town's rates from the rules (a city dedication may lower its Gold buy rates; sell rates never change).
  const tier = townMarketRates(catalog, state, playerId, town.id);
  const unitOf = (k: TradeGood) => (mode === 'sell' ? (k === 'crystal' ? tier.sellCrystal : tier.sellCommon) : k === 'crystal' ? tier.buyCrystal : tier.buyCommon);
  const unit = unitOf(res);
  // The ordinary buy rate (shown beside a city dedication's lower rate; sell rates never change).
  const normalUnit = mode === 'buy' ? (res === 'crystal' ? tier.normalBuyCrystal : tier.normalBuyCommon) : unit;
  const sell: ResourceKey = mode === 'sell' ? res : 'gold';
  const buy: ResourceKey = mode === 'sell' ? 'gold' : res;
  const max = mode === 'sell' ? wallet[res] : Math.floor(wallet.gold / Math.max(1, unit));
  const n = Math.max(1, Math.min(amount, Math.max(1, max)));
  const q = quoteTrade(catalog, state, playerId, town.id, sell, buy, n);
  const pay = q.rate > 0 ? (q.pay[sell] ?? 0) : mode === 'sell' ? n : n * unit;
  const get = q.rate > 0 ? (q.receive[buy] ?? 0) : mode === 'sell' ? n * unit : n;
  const reason =
    max < 1
      ? mode === 'sell'
        ? `You have no ${RESOURCE_LABELS[res]} to sell.`
        : `Not enough Gold: one ${RESOURCE_LABELS[res]} costs ${formatNumber(unit)} Gold and you have ${formatNumber(wallet.gold)}.`
      : q.legal
        ? null
        : q.reason;
  const trade = () =>
    once(() => {
      if (!q.legal || max < 1) return false;
      if (store.dispatch({ kind: 'TradeResources', townId: town.id, sell, buy, amount: n })) return false;
      store.toast(`Traded ${formatNumber(pay)} ${RESOURCE_LABELS[sell]} for ${formatNumber(get)} ${RESOURCE_LABELS[buy]}`, 'success');
      return true;
    });
  const pick = (k: TradeGood) => {
    setRes(k);
    setAmount(1);
  };
  const onGoodKey = (e: ReactKeyboardEvent<HTMLButtonElement>, i: number) => {
    const step = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const j = (i + step + TRADE_GOODS.length) % TRADE_GOODS.length;
    pick(TRADE_GOODS[j]!);
    goodRefs.current[j]?.focus();
  };
  return (
    <AdventureStage
      theme={theme}
      scene={themeAsset(theme, 'merchant').url}
      shade="top"
      title="The Marketplace"
      subtitle={`${town.name} · trade through Gold`}
      pantheonId={town.pantheonId}
      catalog={catalog}
      testId="market"
      onClose={onClose}
      className="ak-market-stage"
      footer={
        <>
          <span className="ak-wallet" aria-label="Your holdings">
            {(['gold', ...TRADE_GOODS] as const).map((k) => (
              <span key={k} className="ak-wallet__item" data-testid={`market-have-${k}`} title={RESOURCE_LABELS[k]}>
                <Icon name={k} className="inline-icon" /> <span className="num">{formatNumber(wallet[k])}</span>
              </span>
            ))}
          </span>
          <span className="grow" />
          <Button onClick={onClose}>Close</Button>
          <Button variant="primary" disabled={!!reason || pending} disabledReason={reason ?? undefined} onClick={trade} data-testid="market-trade">
            Confirm trade
          </Button>
        </>
      }
    >
      <div className="ak-market">
        {/* The merchant's painting stays in view above the counter (decorative; prices and controls are live). */}
        <div className="ak-market__gap" aria-hidden="true" />
        <div className="ak-market__tools">
          <div className="ak-seg" role="tablist" aria-label="Trade direction">
            <button type="button" role="tab" className="ak-seg__btn" aria-selected={mode === 'sell'} onClick={() => (setMode('sell'), setAmount(1))} data-testid="market-sell">
              Sell for Gold
            </button>
            <button type="button" role="tab" className="ak-seg__btn" aria-selected={mode === 'buy'} onClick={() => (setMode('buy'), setAmount(1))} data-testid="market-buy">
              Buy with Gold
            </button>
          </div>
          <div className="ak-seg" role="radiogroup" aria-label={mode === 'sell' ? 'Resource to sell' : 'Resource to buy'}>
            {TRADE_GOODS.map((k, i) => (
              <button
                key={k}
                ref={(el) => {
                  goodRefs.current[i] = el;
                }}
                type="button"
                role="radio"
                aria-checked={res === k}
                tabIndex={res === k ? 0 : -1}
                className="ak-seg__btn"
                onClick={() => pick(k)}
                onKeyDown={(e) => onGoodKey(e, i)}
                title={mode === 'sell' ? `You have ${formatNumber(wallet[k])} · ${formatNumber(unitOf(k))} Gold each` : `${formatNumber(unitOf(k))} Gold each`}
                data-testid={`market-res-${k}`}
              >
                <Icon name={k} className="inline-icon" /> {RESOURCE_LABELS[k]}
              </button>
            ))}
          </div>
        </div>
        <div className="ak-market__trade">
          <section className="ak-pane ak-market__side" data-testid="market-pay" aria-label="You give">
            <h3 className="ak-pane__title">You give</h3>
            <Icon name={sell} className="ak-market__icon" />
            <span className="ak-market__amount num">
              {formatNumber(pay)} {RESOURCE_LABELS[sell]}
            </span>
          </section>
          <div className="ak-market__middle">
            <KitOrnament id="adventurekit.chrome.balance" className="ak-market__balance" />
            <div className="ak-market__rate" data-testid="market-rate">
              1 {RESOURCE_LABELS[res]} = {formatNumber(unit)} Gold
              {normalUnit !== unit ? <span className="ak-muted small"> (normally {formatNumber(normalUnit)})</span> : null}
            </div>
            <div className="ak-muted small">Trade through Gold · {markets} Marketplace{markets === 1 ? '' : 's'} owned</div>
          </div>
          <section className="ak-pane ak-market__side" data-testid="market-receive" aria-label="You receive">
            <h3 className="ak-pane__title">You receive</h3>
            <Icon name={buy} className="ak-market__icon" />
            <span className="ak-market__amount num">
              {formatNumber(get)} {RESOURCE_LABELS[buy]}
            </span>
          </section>
        </div>
        <div className="ak-market__amountbar">
          <QuantitySelector label={mode === 'sell' ? `${RESOURCE_LABELS[res]} to sell` : `${RESOURCE_LABELS[res]} to buy`} value={n} min={1} max={Math.max(1, max)} onChange={setAmount} />
          <div className="ak-market__after" data-testid="market-after">
            <span className="ak-muted">After the trade:</span>
            {[sell, buy].map((k) => {
              const now = wallet[k];
              const then = k === sell ? now - pay : now + get;
              return (
                <span key={k} className="ak-market__after-item">
                  <Icon name={k} className="inline-icon" /> {RESOURCE_LABELS[k]} <span className="num">{formatNumber(now)}</span> → <strong className={`num ${then < 0 ? 'danger' : ''}`}>{formatNumber(then)}</strong>
                </span>
              );
            })}
          </div>
        </div>
        {mode === 'buy' ? <SavingLine catalog={catalog} saving={q.dedication} testId="market-saving" /> : null}
        {reason ? (
          <p className="ak-market__reason" data-testid="market-reason">
            <LockGlyph />
            {reason}
          </p>
        ) : null}
        <p className="ak-muted small ak-market__note">Resources trade through Gold only; Favor cannot be traded. Rates improve with more Marketplaces.</p>
      </div>
    </AdventureStage>
  );
}

/**
 * The Heroes' Lodge (1.1.0 adventure screen): the town's own room
 * (`adventurekit.tavern.<town pantheon>` — the town's architecture, never the
 * owner's), each candidate standing as themselves (their bust, else their own
 * portrait), the inspected candidate's details at the right. Picking a figure
 * only inspects; Hire asks to confirm and sends one HireHero. Every price,
 * limit and reason comes from quoteHireHero; any number of candidates, none
 * included.
 */
function TavernModal({ town, onClose }: { town: TownState; onClose: () => void }) {
  const store = useStore();
  const catalog = store.catalog;
  const state = store.session!.state;
  const playerId = store.session!.humanPlayerId;
  const wallet = state.players[playerId]!.wallet;
  const candidates = hireOptions(catalog, state, playerId, town.id);
  const escort = townTierOneBase(catalog, town);
  const escortName = escort ? catalog.creatures[escort]?.pluralName : 'troops';
  const hiredThisWeek = heroHiredThisWeek(catalog, state, playerId);
  const [picked, setPicked] = useState<string | null>(null);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const keyOf = (c: (typeof candidates)[number]) => c.returningHeroId ?? c.definitionId;
  const index = Math.max(0, candidates.findIndex((c) => keyOf(c) === picked));
  const selected = candidates[index];
  const onKey = (e: ReactKeyboardEvent<HTMLButtonElement>, i: number) => {
    const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (!step || candidates.length < 2) return;
    e.preventDefault();
    const j = (i + step + candidates.length) % candidates.length;
    setPicked(keyOf(candidates[j]!));
    refs.current[j]?.focus();
  };
  const detail = (() => {
    if (!selected) return null;
    const id = selected.definitionId;
    const def = catalog.heroes[id]!;
    const returning = selected.returningHeroId ? state.heroes[selected.returningHeroId] : undefined;
    const q = quoteHireHero(catalog, state, playerId, town.id, id);
    const cls = catalog.heroClasses[def.classId];
    const attrs = returning?.attributes ?? cls?.startingAttributes;
    const survivors = returning ? returning.army.slots.filter((x): x is NonNullable<typeof x> => !!x && x.count > 0) : [];
    const party: { creatureId: string; count: number }[] = returning ? (survivors.length ? survivors : escort ? [{ creatureId: escort, count: 1 }] : []) : heroStartingArmy(catalog, id);
    const hire = () =>
      store.confirm(
        `Hire ${def.name}?`,
        returning
          ? `${def.name} returns with ${survivors.length ? 'the troops that survived the surrender' : `one of the ${escortName}`} and no movement left today.`
          : `${def.name} joins with ${party.map(s => `${s.count} ${catalog.creatures[s.creatureId]?.pluralName ?? s.creatureId}`).join(', ')} and full movement.`,
        'Hire',
        () => {
          if (!store.dispatch({ kind: 'HireHero', townId: town.id, heroDefinitionId: id })) {
            store.toast(`${def.name} has joined you`, 'success');
            onClose();
          }
        },
      );
    return (
      <section className="ak-pane ak-tavern__detail" aria-label={`${def.name}, ${def.title}`} data-testid={`hire-${id}`}>
        <div className="ak-tavern__who">
          <HeroPortrait catalog={catalog} definitionId={id} size="4.2rem" />
          <div>
            <h3 className="ak-pane__title ak-tavern__name">{def.name}</h3>
            <div className="ak-muted">
              {def.title} · {cls?.name}
            </div>
            {returning ? <Chip tone="info">Returning · level {returning.level}</Chip> : null}
          </div>
        </div>
        <p className="ak-tavern__class small">{cls?.summary}</p>
        <SpecialtyLine catalog={catalog} definitionId={id} active={specialtiesEnabled(state)} />
        {attrs ? (
          <div className="ak-stats" role="list" aria-label={returning ? 'Attributes' : 'Starting attributes'}>
            {(['attack', 'defense', 'power', 'knowledge'] as const).map((a) => (
              <span key={a} className="ak-stat" role="listitem">
                <Icon name={a} className="ak-stat__icon" />
                <span className="ak-stat__label">{a[0]!.toUpperCase() + a.slice(1)}</span>
                <strong className="ak-stat__value num">{attrs[a]}</strong>
              </span>
            ))}
          </div>
        ) : null}
        <details className="ak-tavern__story">
          <summary>Story</summary>
          <p className="small">{heroStory(def.biography)}</p>
        </details>
        <div className="ak-tavern__escort">
          <span className="ak-tavern__escort-title">{returning ? 'Returns with' : 'Starting escort'}</span>
          <span className="ak-tavern__escort-army">
            {party.map((p) => (
              <span key={p.creatureId} className="row gap">
                <CreaturePortrait catalog={catalog} creatureId={p.creatureId} size="3.2rem" count={p.count} />
                <span>
                  {p.count} {p.count === 1 ? catalog.creatures[p.creatureId]?.name : catalog.creatures[p.creatureId]?.pluralName}
                </span>
              </span>
            ))}
          </span>
        </div>
        <div className="ak-tavern__buy">
          <span className="ak-big">
            <CostList cost={q.cost} wallet={wallet} />
          </span>
          <Button variant="primary" size="large" disabled={!q.legal} disabledReason={q.reason} onClick={hire} data-testid={`hire-button-${id}`}>
            Hire {def.name}
          </Button>
          {!q.legal && q.reason ? (
            <span className="shop-reason" data-testid={`hire-reason-${id}`}>
              <LockGlyph />
              {q.reason}
            </span>
          ) : null}
        </div>
      </section>
    );
  })();
  return (
    <AdventureStage
      theme={guiThemeFor(town.pantheonId)}
      scene={adventureScene('tavern', town.pantheonId)}
      title="Heroes’ Lodge"
      subtitle={town.name}
      pantheonId={town.pantheonId}
      catalog={catalog}
      testId="tavern"
      onClose={onClose}
      className="ak-tavern-stage"
      footer={
        <>
          <span className="ak-muted">
            Available Gold: <strong className="num">{formatNumber(wallet.gold)}</strong>
          </span>
          {state.scenario.heroHiringEnabled ? (
            <span className={`small ${hiredThisWeek ? 'warn' : 'ak-muted'}`} data-testid="tavern-weekly">
              {hiredThisWeek ? 'A hero was hired this week — one hero per week.' : 'One hero per week, at any of your Lodges.'}
            </span>
          ) : null}
          <span className="grow" />
          <Button onClick={onClose} data-testid="tavern-leave">
            Leave
          </Button>
        </>
      }
    >
      {!state.scenario.heroHiringEnabled ? <p className="ak-pane ak-note">{state.scenario.heroHiringDisabledReason ?? 'Hero hiring is not available in this scenario.'}</p> : null}
      <div className={`ak-tavern ${candidates.length === 0 ? 'is-empty' : ''}`}>
        {candidates.length === 0 ? (
          <p className="ak-pane ak-tavern__none">No heroes are available for hire.</p>
        ) : (
          <div className="ak-tavern__candidates" role="radiogroup" aria-label="Heroes for hire" style={{ ['--n' as string]: Math.max(1, candidates.length) } as CSSProperties}>
            {candidates.map((c, i) => {
              const def = catalog.heroes[c.definitionId]!;
              const on = i === index;
              return (
                <button
                  key={keyOf(c)}
                  ref={(el) => {
                    refs.current[i] = el;
                  }}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  tabIndex={on ? 0 : -1}
                  className={`ak-candidate ${on ? 'is-selected' : ''}`}
                  style={{ ['--len' as string]: plateLine(def.name) } as CSSProperties}
                  onClick={() => setPicked(keyOf(c))}
                  onKeyDown={(e) => onKey(e, i)}
                  data-testid={`hire-candidate-${c.definitionId}`}
                >
                  <span className="ak-candidate__figure">
                    <HeroFigure catalog={catalog} definitionId={c.definitionId} name={def.name} />
                  </span>
                  <span className="ak-candidate__name">
                    {def.name}
                    {c.returningHeroId ? <span className="ak-candidate__tag">Returning</span> : null}
                  </span>
                </button>
              );
            })}
          </div>
        )}
        {detail}
      </div>
    </AdventureStage>
  );
}

/**
 * The longest line, in characters, of a name set on at most two lines broken at a space (the most even
 * split). The Lodge's name plates size their lettering from it, so every name fits its plate.
 */
function plateLine(name: string): number {
  const words = name.split(/\s+/).filter(Boolean);
  if (words.length < 2) return Math.max(1, name.length);
  let best = name.length;
  for (let k = 1; k < words.length; k++) best = Math.min(best, Math.max(words.slice(0, k).join(' ').length, words.slice(k).join(' ').length));
  return Math.max(1, best);
}

/** Temple offering (a signature rite): choose creatures from the garrison or the visiting hero. */
function OfferingModal({ town, onClose }: { town: TownState; onClose: () => void }) {
  const store = useStore();
  const catalog = store.catalog;
  const state = store.session!.state;
  const playerId = store.session!.humanPlayerId;
  const visitor = heroesInTown(catalog, state, town).find((h) => h.ownerId === playerId);
  const sources: { ref: ArmyRef; label: string; slots: TownState['garrison']['slots'] }[] = [
    { ref: { kind: 'garrison', townId: town.id }, label: 'Garrison', slots: town.garrison.slots },
    ...(visitor ? [{ ref: { kind: 'hero' as const, heroId: visitor.id }, label: visitor.name, slots: visitor.army.slots }] : []),
  ];
  const [qty, setQty] = useState<Record<string, number>>({});
  const key = (ref: ArmyRef, slot: number) => `${ref.kind === 'hero' ? ref.heroId : 'garrison'}:${slot}`;
  const lines: OfferingLine[] = [];
  for (const src of sources) src.slots.forEach((s2, i) => (s2 && (qty[key(src.ref, i)] ?? 0) > 0 ? lines.push({ army: src.ref, slot: i, quantity: qty[key(src.ref, i)]! }) : null));
  const q = quoteOffering(catalog, state, playerId, town.id, lines);
  const rawFavor = q.goldPerFavor > 0 ? Math.floor(q.goldValue / q.goldPerFavor) : 0;
  return (
    <Modal
      title={`Offering — ${town.name}`}
      onClose={onClose}
      width="40rem"
      testId="offering"
      theme={guiThemeFor(town.pantheonId)}
      footer={
        <>
          <Button onClick={onClose}>Close</Button>
          <span className="grow" />
          <Button
            variant="primary"
            disabled={!q.legal}
            disabledReason={q.reason}
            data-testid="offering-confirm"
            onClick={() =>
              store.confirm(`Offer ${q.creatures} creatures?`, `They are sacrificed at the Temple for ${q.favor} Favor. This cannot be undone.`, 'Make the offering', () => {
                if (!store.dispatch({ kind: 'MakeOffering', townId: town.id, offerings: lines })) {
                  store.toast(`+${q.favor} Favor`, 'success');
                  onClose();
                }
              })
            }
          >
            Offer for {q.legal ? q.favor : 0} Favor
          </Button>
        </>
      }
    >
      <p className="dim small">
        Once per week in each town with a Temple. 1 Favor per {q.goldPerFavor} Gold of recruitment price, at most {q.maxFavor} Favor per offering. Offered creatures are gone for good; a hero keeps at least one creature.
      </p>
      {sources.map((src) => (
        <div key={src.label}>
          <div className="section-title">{src.label}</div>
          {src.slots.every((x) => !x) ? <div className="faint small">No troops.</div> : null}
          {src.slots.map((st, i) =>
            st ? (
              <div key={i} className="row gap" style={{ margin: '0.25rem 0' }}>
                <CreatureCount catalog={catalog} creatureId={st.creatureId} count={st.count} />
                <QuantitySelector label={`Offer ${catalog.creatures[st.creatureId]?.pluralName}`} value={qty[key(src.ref, i)] ?? 0} min={0} max={st.count} onChange={(v) => setQty({ ...qty, [key(src.ref, i)]: v })} />
              </div>
            ) : null,
          )}
        </div>
      ))}
      <div className="row gap" style={{ marginTop: '0.6rem' }}>
        <span className="small">
          Value {q.goldValue} Gold → <strong data-testid="offering-favor">{q.legal ? q.favor : 0}</strong> Favor
          {rawFavor > q.maxFavor ? <span className="warn"> (capped; {rawFavor - q.maxFavor} Favor of value wasted)</span> : null}
        </span>
      </div>
      {!q.legal && q.reason && lines.length > 0 ? (
        <p className="shop-reason">
          <LockGlyph />
          {q.reason}
        </p>
      ) : null}
    </Modal>
  );
}

/** Divine gifts (proposed 2026-10-03): one gift per Temple per week, paid in Favor. */
function GiftsModal({ town, onClose }: { town: TownState; onClose: () => void }) {
  const store = useStore();
  const catalog = store.catalog;
  const state = store.session!.state;
  const playerId = store.session!.humanPlayerId;
  const favor = state.players[playerId]?.wallet.favor ?? 0;
  const visitors = heroesInTown(catalog, state, town).filter((h) => h.ownerId === playerId);
  const [heroId, setHeroId] = useState<string | null>(visitors[0]?.id ?? null);
  const gifts = divineGifts(catalog, state);
  const receive = (giftId: string, needsHero: boolean) => {
    const def = catalog.divineGifts?.[giftId];
    const q = quoteDivineGift(catalog, state, playerId, town.id, giftId, needsHero ? heroId : null);
    if (!def || !q.legal) return;
    const extra = q.artifactId ? ` (${catalog.artifacts[q.artifactId]?.name})` : '';
    store.confirm(`${def.name}?`, `${def.summary}${extra} Costs ${def.favorCost} Favor; this Temple then rests until next week.`, `Receive for ${def.favorCost} Favor`, () => {
      if (!store.dispatch({ kind: 'ReceiveDivineGift', townId: town.id, giftId, ...(needsHero && heroId ? { heroId } : {}) })) {
        store.toast(`${def.name}: the gods give${extra}`, 'success');
        onClose();
      }
    });
  };
  return (
    <Modal title={`Divine gifts — ${town.name}`} onClose={onClose} width="46rem" testId="gifts" theme={guiThemeFor(town.pantheonId)} footer={<Button onClick={onClose}>Close</Button>}>
      <p className="dim small">
        The Temple grants one gift a week for Favor. You have <strong>{favor}</strong> Favor.
      </p>
      {visitors.length > 1 ? (
        <div className="row gap" style={{ marginBottom: '0.5rem' }}>
          <span className="small">Gifts for a hero go to</span>
          <select className="select" value={heroId ?? ''} onChange={(e) => setHeroId(e.target.value || null)} aria-label="Hero who receives the gift">
            {visitors.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      <div className="gift-list">
        {gifts.map((g) => {
          const needsHero = giftNeedsHero(g);
          const q = quoteDivineGift(catalog, state, playerId, town.id, g.id, needsHero ? heroId : null);
          const recruits = Object.entries(q.recruits);
          return (
            <div key={g.id} className="gift-row" data-testid={`gift-${g.id}`}>
              <div className="gift-row__text">
                <div className="gift-row__name">{g.name}</div>
                <div className="small dim">{g.summary}</div>
                {recruits.length ? <div className="small">{recruits.map(([f, n]) => `+${n} ${catalog.families[f]?.name ?? f}`).join(', ')}</div> : null}
                {needsHero && !visitors.length ? <div className="faint small">A hero must be visiting the town.</div> : !q.legal && q.reason ? (
                  <div className="shop-reason">
                    <LockGlyph />
                    {q.reason}
                  </div>
                ) : null}
              </div>
              <Button variant="primary" icon="favor" disabled={!q.legal} disabledReason={q.reason} onClick={() => receive(g.id, needsHero)} data-testid={`gift-${g.id}-receive`}>
                {g.favorCost} Favor
              </Button>
            </div>
          );
        })}
      </div>
    </Modal>
  );
}

/**
 * Garrison and visiting hero (owner request 2026-10-03): drag a stack onto any slot
 * of either army — matching stacks merge, different stacks swap. Hold Shift (or Ctrl)
 * while dropping to split: you choose how many move. Without dragging: click a stack,
 * choose how many below, then click the destination slot.
 */
function TownArmies({ town, visitor }: { town: TownState; visitor: HeroState | null }) {
  const store = useStore();
  const catalog = store.catalog;
  const state = store.session!.state;
  const playerId = store.session!.humanPlayerId;
  const mine = town.ownerId === playerId;
  type Side = 'g' | 'h';
  const refs: Record<Side, ArmyRef | null> = {
    g: { kind: 'garrison', townId: town.id },
    h: visitor && visitor.ownerId === playerId ? { kind: 'hero', heroId: visitor.id } : null,
  };
  const armies: Record<Side, ArmyState | null> = { g: town.garrison, h: visitor?.army ?? null };
  const [sel, setSel] = useState<{ side: Side; slot: number } | null>(null);
  const [qty, setQty] = useState<number | null>(null);
  const [split, setSplit] = useState<{ from: Side; fromSlot: number; to: Side; toSlot: number; n: number } | null>(null);
  const dragging = useRef<{ side: Side; slot: number } | null>(null);
  const move = (from: Side, fromSlot: number, to: Side, toSlot: number, n: number | null) => {
    const a = refs[from];
    const b = refs[to];
    const stack = armies[from]?.slots[fromSlot];
    if (!a || !b || !stack || (from === to && fromSlot === toSlot)) return false;
    const count = n ?? stack.count;
    const q = quoteTransfer(catalog, state, playerId, a, fromSlot, b, toSlot, count);
    if (!q.legal) {
      store.toast(q.reason ?? 'Cannot move these troops', 'error');
      return false;
    }
    store.dispatch({ kind: 'TransferStack', from: a, fromSlot, to: b, toSlot, quantity: count });
    return true;
  };
  const drag = (side: Side) =>
    mine && refs[side]
      ? {
          onStart: (slot: number, e: DragEvent<HTMLElement>) => {
            dragging.current = { side, slot };
            setSel(null);
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', `${side}:${slot}`);
          },
          onDrop: (slot: number, e: DragEvent<HTMLElement>) => {
            const from = dragging.current;
            dragging.current = null;
            if (!from) return;
            const stack = armies[from.side]?.slots[from.slot];
            if (!stack || (from.side === side && from.slot === slot)) return;
            const target = armies[side]?.slots[slot];
            // Shift or Ctrl splits — into an empty slot or onto the same creature.
            if ((e.shiftKey || e.ctrlKey) && stack.count > 1 && (!target || target.creatureId === stack.creatureId)) {
              setSplit({ from: from.side, fromSlot: from.slot, to: side, toSlot: slot, n: Math.ceil(stack.count / 2) });
              return;
            }
            move(from.side, from.slot, side, slot, null);
          },
          onEnd: () => {
            dragging.current = null;
          },
        }
      : undefined;
  const click = (side: Side, slot: number) => {
    if (!mine || !refs[side]) return;
    if (!sel) {
      if (armies[side]?.slots[slot]) {
        setSel({ side, slot });
        setQty(null);
      }
      return;
    }
    if (sel.side === side && sel.slot === slot) {
      setSel(null);
      return;
    }
    if (move(sel.side, sel.slot, side, slot, qty)) {
      setSel(null);
      setQty(null);
    }
  };
  const selStack = sel ? armies[sel.side]?.slots[sel.slot] : null;
  const targets = (side: Side) => (sel && armies[side] ? armies[side]!.slots.map((_, i) => i).filter((i) => !(sel.side === side && sel.slot === i)) : []);
  const splitStack = split ? armies[split.from]?.slots[split.fromSlot] : null;
  return (
    <footer className="town-armies panel" data-testid="town-armies">
      <div className="town-armies__row">
        <section className="town-army town-army--garrison" aria-label="Garrison">
          <div className="town-army__label">
            <Icon name="town" /> Garrison
          </div>
          <ArmyStrip
            catalog={catalog}
            army={town.garrison}
            label={`${town.name} garrison`}
            testId="town-garrison"
            selected={sel?.side === 'g' ? sel.slot : null}
            dropTargets={targets('g')}
            onSlot={mine ? (i) => click('g', i) : undefined}
            onInfo={(id) => store.openOverlay({ kind: 'stack-info', creatureId: id })}
            drag={drag('g')}
          />
        </section>
        <div className="town-armies__divider" aria-hidden="true">
          <span className="town-armies__gem">
            <Icon name="swap" />
          </span>
        </div>
        <section className="town-army town-army--visitor" aria-label={visitor ? `Visiting hero: ${visitor.name}` : 'No visiting hero'}>
          <div className="town-army__label">
            {visitor ? (
              <>
                <HeroPortrait catalog={catalog} definitionId={visitor.definitionId} name={visitor.name} size="1.5rem" /> {visitor.name}
              </>
            ) : (
              <span className="faint">No visiting hero</span>
            )}
          </div>
          {visitor ? (
            <ArmyStrip
              catalog={catalog}
              army={visitor.army}
              label={`${visitor.name}'s army`}
              testId="town-visitor"
              selected={sel?.side === 'h' ? sel.slot : null}
              dropTargets={targets('h')}
              onSlot={refs.h ? (i) => click('h', i) : undefined}
              onInfo={(id) => store.openOverlay({ kind: 'stack-info', creatureId: id })}
              drag={drag('h')}
            />
          ) : (
            <div className="army army--vacant" title="A hero standing at the town gate can exchange troops here">
              {Array.from({ length: 7 }, (_, i) => (
                <span key={i} className="slot slot--empty" />
              ))}
            </div>
          )}
        </section>
      </div>
      {selStack && sel ? (
        <div className="town-armies__bar small" data-testid="town-armies-bar">
          <span>
            Moving {qty ?? selStack.count} of {selStack.count} {catalog.creatures[selStack.creatureId]?.pluralName} — click a slot.
          </span>
          {selStack.count > 1 ? <QuantitySelector label="How many to move" value={qty ?? selStack.count} min={1} max={selStack.count} onChange={setQty} /> : null}
          <Button size="small" variant="ghost" onClick={() => setSel(null)}>
            Cancel
          </Button>
        </div>
      ) : null}
      {split && splitStack ? (
        <Modal
          title={`Split ${catalog.creatures[splitStack.creatureId]?.pluralName ?? 'stack'}`}
          onClose={() => setSplit(null)}
          width="26rem"
          testId="split"
          footer={
            <>
              <Button onClick={() => setSplit(null)}>Cancel</Button>
              <span className="grow" />
              <Button
                variant="primary"
                data-testid="split-ok"
                onClick={() => {
                  move(split.from, split.fromSlot, split.to, split.toSlot, split.n);
                  setSplit(null);
                }}
              >
                Move {split.n}
              </Button>
            </>
          }
        >
          <p className="small">
            {split.n} move, {splitStack.count - split.n} stay.
          </p>
          <QuantitySelector label="How many to move" value={split.n} min={1} max={splitStack.count - (split.from === split.to ? 1 : 0) || 1} onChange={(n) => setSplit({ ...split, n })} />
        </Modal>
      ) : null}
    </footer>
  );
}

function CreatureCount({ catalog, creatureId, count }: { catalog: AppStore['catalog']; creatureId: string; count: number }) {
  const c = catalog.creatures[creatureId];
  return (
    <span className="small" style={{ minWidth: '11rem' }}>
      {count} {count === 1 ? c?.name : c?.pluralName} <span className="faint">({c?.cost?.gold ?? 0} Gold each, tier {c?.tier})</span>
    </span>
  );
}

/** Artifact Merchant: this week's stock, sold to a visiting hero. */
function MerchantModal({ town, onClose }: { town: TownState; onClose: () => void }) {
  const store = useStore();
  const catalog = store.catalog;
  const state = store.session!.state;
  const playerId = store.session!.humanPlayerId;
  const visitor = heroesInTown(catalog, state, town).find((h) => h.ownerId === playerId);
  const stock = town.merchant?.week === worldWeek(state, catalog.rulesProfile.daysPerWeek) ? town.merchant.stock : [];
  const theme = guiThemeFor(town.pantheonId);
  // One press buys one piece: a double click never buys the next one too.
  const [pending, once] = useOnce(600);
  return (
    <Modal
      title={`Artifact Merchant — ${town.name}`}
      onClose={onClose}
      width="42rem"
      testId="merchant"
      theme={theme}
      art={<GuiArtHeader art={themeAsset(theme, 'merchant')} alt="" wide />}
      footer={<Button onClick={onClose}>Close</Button>}
    >
      <p className="dim small">New stock every week. Purchases go to the visiting hero: equipped into a free slot, otherwise into the backpack.{visitor ? '' : ' No hero is visiting, so nothing can be bought now.'}</p>
      <div className="hire-list">
        {stock.map((id, index) => {
          const art = id ? catalog.artifacts[id] : undefined;
          const q = visitor ? quoteArtifactPurchase(catalog, state, playerId, town.id, visitor.id, index) : null;
          return (
            <div key={index} className="hire-card panel" data-testid={`merchant-item-${index}`}>
              {art ? <ArtifactIcon iconAssetId={art.iconAssetId} kind={art.slot} size="3rem" rarity={art.rarity} /> : null}
              <div>
                <div className="hire-card__name">{art ? art.name : <span className="faint">Sold</span>}</div>
                {art ? (
                  <>
                    <div className="small">
                      {ARTIFACT_SLOT_LABEL[art.slot]} · {art.summary}
                    </div>
                    <div className="row gap">
                      <CostList cost={q?.cost ?? townShopPrice(catalog, state, playerId, town.id, art.id).cost} wallet={state.players[playerId]!.wallet} />
                      <Button
                        variant="primary"
                        size="small"
                        disabled={!q?.legal || pending}
                        disabledReason={q?.reason ?? 'A hero must be in the town'}
                        onClick={() =>
                          once(() => {
                            if (!visitor || !q?.legal || store.dispatch({ kind: 'BuyArtifact', townId: town.id, heroId: visitor.id, index })) return false;
                            store.toast(`${visitor.name} bought ${art.name}`, 'success');
                            return true;
                          })
                        }
                        data-testid={`merchant-buy-${index}`}
                      >
                        Buy
                      </Button>
                    </div>
                    <SavingLine catalog={catalog} saving={q?.dedication ?? townShopPrice(catalog, state, playerId, town.id, art.id).dedication} testId={`merchant-saving-${index}`} />
                    {visitor && q && !q.legal && q.reason ? (
                      <div className="shop-reason">
                        <LockGlyph />
                        {q.reason}
                      </div>
                    ) : null}
                  </>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </Modal>
  );
}

/**
 * The Workshop (owner request 2026-10-04): this week's four tier-1 wares laid
 * out on a counter. Each can be bought once; a sold piece shows its "back next
 * week" tag until the stock changes. Purchases go to the visiting hero.
 */
function WorkshopModal({ town, onClose }: { town: TownState; onClose: () => void }) {
  const store = useStore();
  const catalog = store.catalog;
  const state = store.session!.state;
  const playerId = store.session!.humanPlayerId;
  const visitor = heroesInTown(catalog, state, town).find((h) => h.ownerId === playerId);
  const week = worldWeek(state, catalog.rulesProfile.daysPerWeek);
  const dpw = catalog.rulesProfile.daysPerWeek;
  const daysLeft = dpw - ((state.day - 1) % dpw);
  const stock = town.workshop?.week === week ? town.workshop.stock : [];
  const wallet = state.players[playerId]!.wallet;
  const theme = guiThemeFor(town.pantheonId);
  const [pending, once] = useOnce(600);
  return (
    <Modal
      title={`Workshop — ${town.name}`}
      onClose={onClose}
      width="62rem"
      testId="workshop"
      theme={theme}
      art={<GuiArtHeader art={themeAsset(theme, 'merchant')} alt="" wide />}
      footer={
        <Button onClick={onClose} data-testid="workshop-close">
          Close
        </Button>
      }
    >
      <div className="workshop">
        <div className="workshop__head">
          <div className="workshop__who">
            {visitor ? (
              <>
                <HeroPortrait catalog={catalog} definitionId={visitor.definitionId} name={visitor.name} size="2.8rem" />
                <span>
                  <span className="workshop__hero">{visitor.name}</span>
                  <span className="small dim"> receives the purchase · backpack {visitor.backpack.length}/{catalog.rulesProfile.backpackCapacity}</span>
                </span>
              </>
            ) : (
              <span className="warn small">No hero is visiting: wares can be bought only for a hero in the town.</span>
            )}
          </div>
          <div className="workshop__week" title="The wares change at the start of every week">
            <Icon name="hourglass" className="inline-icon" /> Week {week} wares · new in {daysLeft} {daysLeft === 1 ? 'day' : 'days'}
          </div>
        </div>
        {stock.length === 0 ? (
          <p className="dim">The craftsmen have nothing to sell in this land.</p>
        ) : (
          <div className="workshop__counter">
            {stock.map((id, index) => {
              const art = id ? catalog.artifacts[id] : undefined;
              const q = visitor ? quoteArtifactPurchase(catalog, state, playerId, town.id, visitor.id, index, 'workshop') : null;
              const sold = !art;
              return (
                <div key={index} className={`ware ${sold ? 'is-sold' : ''}`} data-testid={`workshop-item-${index}`}>
                  {art ? (
                    <>
                      <div className="ware__shelf">
                        <ArtifactIcon iconAssetId={art.iconAssetId} kind={art.slot} size="5rem" rarity={art.rarity} />
                      </div>
                      <div className="ware__name">{art.name}</div>
                      <div className="ware__slot">{ARTIFACT_SLOT_LABEL[art.slot]}</div>
                      <div className="ware__fx">{art.summary}</div>
                      <div className="ware__price">
                        <CostList cost={q?.cost ?? townShopPrice(catalog, state, playerId, town.id, art.id, 'workshop').cost} wallet={wallet} />
                      </div>
                      <SavingLine catalog={catalog} saving={q?.dedication ?? townShopPrice(catalog, state, playerId, town.id, art.id, 'workshop').dedication} testId={`workshop-saving-${index}`} />
                      <Button
                        variant="primary"
                        size="small"
                        block
                        disabled={!q?.legal || pending}
                        disabledReason={q?.reason ?? 'A hero must be in the town'}
                        onClick={() =>
                          once(() => {
                            if (!visitor || !q?.legal || store.dispatch({ kind: 'BuyArtifact', townId: town.id, heroId: visitor.id, index, shop: 'workshop' })) return false;
                            store.toast(`${visitor.name} bought ${art.name}`, 'success');
                            return true;
                          })
                        }
                        data-testid={`workshop-buy-${index}`}
                      >
                        Buy
                      </Button>
                      {visitor && q && !q.legal && q.reason ? (
                        <div className="shop-reason">
                          <LockGlyph />
                          {q.reason}
                        </div>
                      ) : null}
                    </>
                  ) : (
                    <div className="ware__sold">
                      <span className="ware__stamp">Sold</span>
                      <span className="small dim">Back in stock next week</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        <p className="small faint">Tier-1 wares: plain crafted gear. Each piece can be bought once a week; the same four wares stand in every Workshop this week.</p>
      </div>
    </Modal>
  );
}

/** An icon-only action in the town's pop-up and economy bar (label as tooltip and accessible name). */
function IconAction({ icon, label, onClick, disabled, reason, testId, primary }: { icon: IconName; label: string; onClick: () => void; disabled?: boolean; reason?: string | null; testId?: string; primary?: boolean }) {
  return (
    <Button
      icon={icon}
      variant={primary ? 'primary' : undefined}
      className="town-action"
      onClick={onClick}
      disabled={disabled}
      disabledReason={reason ?? undefined}
      title={label}
      aria-label={label}
      data-testid={testId}
    />
  );
}

export function TownScreen() {
  const store = useStore();
  const catalog = store.catalog;
  const state = store.session!.state;
  const player = humanPlayer(state);
  const owned = Object.values(state.towns).filter((t) => t.ownerId === player.id);
  const townId = (store.screen.params.townId as string | undefined) ?? owned[0]?.id;
  const town = townId ? state.towns[townId] : undefined;
  // The building pop-up is not restored on return (from recruitment, say): the town opens clean.
  const [selected, setSelected] = useState<string | null>(null);
  type TownModal = 'market' | 'tavern' | 'offering' | 'merchant' | 'workshop' | 'gifts' | 'construction' | 'dedication' | 'launch';
  // The Pantheon screen's "Open" on a city goes straight to that town's dedication pane.
  const [modal, setModalState] = useState<TownModal | null>(store.screen.params.dedication ? 'dedication' : null);
  // The medallion's short seal pulse after a dedication is confirmed (none under reduced motion).
  const [sealPulse, setSealPulse] = useState(0);
  /** Town actions (market, tavern, temple, merchant, workshop, construction list) open with their own sound. */
  const setModal = (m: TownModal | null) => {
    if (m) store.audio?.effect('ui.town_action');
    setModalState(m);
  };
  const archetype = town ? catalog.townArchetypes[town.archetypeId] : undefined;
  // Favor at the Temple: gifts and offerings rise from it (the VFX list's gift and offering strips).
  const [bursts, setBursts] = useState<{ key: number; kind: TownFxKind; slotId: string; stripId?: string }[]>([]);
  // The same effect, smaller, where the gift lands: the resource counters, the Favor counter, the visiting hero.
  const [pins, setPins] = useState<{ key: number; kind: TownFxKind; stripId: string; x: number; y: number }[]>([]);
  const burstSeq = useRef(0);
  useEffect(
    () =>
      store.registerPresenter(async (events) => {
        const st = store.session?.state;
        const me = store.session?.humanPlayerId;
        const t = townId ? st?.towns[townId] : undefined;
        const arch = t ? catalog.townArchetypes[t.archetypeId] : undefined;
        if (!t || !arch || reducedMotion(store.prefs)) return;
        const temple = arch.slots.find((x) => x.role === 'pantheon_temple');
        const add: { kind: TownFxKind; slotId: string; stripId?: string }[] = [];
        const pin: { kind: TownFxKind; stripId: string; x: number; y: number }[] = [];
        const at = (selector: string, kind: TownFxKind, stripId: string) => {
          const r = document.querySelector(selector)?.getBoundingClientRect();
          if (r && r.width > 0) pin.push({ kind, stripId, x: r.left + r.width / 2, y: r.top + r.height / 2 });
        };
        for (const e of events) {
          if ((e.kind !== 'DivineGiftReceived' && e.kind !== 'OfferingMade') || e.playerId !== me || e.townId !== t.id) continue;
          const grant = e.kind === 'DivineGiftReceived' ? catalog.divineGifts?.[e.giftId]?.grant : undefined;
          const kind: TownFxKind = e.kind === 'OfferingMade' ? 'offering' : grant ? giftFxKind(grant) : 'coins';
          if (temple) add.push({ kind, slotId: temple.id, stripId: e.kind === 'OfferingMade' ? 'fx.offering.rise' : `fx.gift.${e.giftId}` });
          if (e.kind === 'OfferingMade') at('[data-testid="res-favor"]', 'offering', 'fx.offering.favor');
          else if (grant?.type === 'resources') {
            for (const [res, n] of Object.entries(grant.resources)) if ((n ?? 0) > 0) at(`[data-testid="res-${res}"]`, res === 'gold' ? 'coins' : res === 'crystal' ? 'crystal' : 'timber', `fx.gift.${e.giftId}`);
          } else if (grant?.type === 'experience' || grant?.type === 'artifact') at('.town-army--visitor .town-army__label', kind, `fx.gift.${e.giftId}`);
          if (grant?.type === 'recruits') {
            // Light runs to each dwelling whose pool grew.
            for (const x of arch.slots) {
              const fam = familyForSlot(catalog, x);
              const tier = fam ? catalog.families[fam]?.tier : undefined;
              if (tier !== undefined && tier <= grant.maxTier && (t.buildings[x.id] ?? 0) > 0) add.push({ kind: 'brood', slotId: x.id });
            }
          }
        }
        if (add.length || pin.length) {
          // The gift and offering dialogs (and their confirmation) close first, so the burst is not under their fading backdrop.
          for (let i = 0; i < 30 && store.overlays.length > 0; i++) await new Promise((r) => setTimeout(r, 50));
          await new Promise((r) => setTimeout(r, 220));
        }
        if (add.length) setBursts((b) => [...b, ...add.map((a) => ({ ...a, key: ++burstSeq.current }))]);
        if (pin.length) setPins((b) => [...b, ...pin.map((a) => ({ ...a, key: ++burstSeq.current }))]);
      }),
    [store, catalog, townId],
  );
  const slots = useMemo(() => [...(archetype?.slots ?? [])].sort((a, b) => a.placement.layer - b.placement.layer || a.placement.y - b.placement.y), [archetype]);
  // The building that was just raised or upgraded glows briefly (only that one, only after a real change of level).
  const [fresh, setFresh] = useState<readonly string[]>([]);
  const lastLevels = useRef<{ townId: string; levels: Readonly<Record<string, number>> } | null>(null);
  const levels = town?.buildings;
  useEffect(() => {
    if (!town || !levels) return;
    const prev = lastLevels.current;
    lastLevels.current = { townId: town.id, levels };
    if (!prev || prev.townId !== town.id || prev.levels === levels) return;
    const raised = Object.keys(levels).filter((k) => (levels[k] ?? 0) > (prev.levels[k] ?? 0));
    if (!raised.length) return;
    setFresh(raised);
    const t = window.setTimeout(() => setFresh([]), 2400);
    return () => window.clearTimeout(t);
  }, [town, levels]);
  // Esc closes the building pop-up before it leaves the town.
  const selectedRef = useRef(selected);
  selectedRef.current = selected;
  const modalRef = useRef(modal);
  modalRef.current = modal;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || !selectedRef.current || modalRef.current || store.overlays.length || store.story.length) return;
      e.preventDefault();
      e.stopPropagation();
      setSelected(null);
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [store]);
  if (!town || !archetype) {
    return (
      <div className="screen">
        <ScreenHeader title="Town" />
        <p className="pad dim">You do not own a town.</p>
      </div>
    );
  }
  // The town's painting follows its town hall (Brief 17: four stages per pantheon; `townBackground`).
  const bg = town.warDamaged && (town.buildings['civic_hall'] ?? 0) < 2 ? resolveAsset(`twin.town-${town.pantheonId}`) : townBackground(archetype.backgroundAssetId, town.buildings['civic_hall']);
  const mine = town.ownerId === player.id;
  const visiting = heroesInTown(catalog, state, town).filter((h) => h.ownerId === player.id);
  const slot = selected ? archetype.slots.find((s) => s.id === selected) : undefined;
  const level = slot ? (town.buildings[slot.id] ?? 0) : 0;
  const current = slot ? activeBuildingInSlot(catalog, town, slot.id) : null;
  const nextId = slot ? slot.chain[level] : undefined;
  const next = nextId ? catalog.buildings[nextId] : undefined;
  const quote = next ? quoteConstruction(catalog, state, player.id, town.id, next.id) : null;
  const income = townDailyIncome(catalog, town);
  const growth = townGrowthMultiplier(catalog, town);
  const usedToday = town.buildUsedDay === state.day;
  const setSlot = (id: string | null) => {
    if (id && id !== selected) store.audio?.effect('ui.popup');
    setSelected(id);
  };
  // Building happens at once — no confirmation (owner request 2026-10-04); the button shows the cost.
  const build = () => {
    if (!next || !quote?.legal) return;
    if (!store.dispatch({ kind: 'BuildStructure', townId: town.id, buildingId: next.id })) store.toast(`${next.name} built`, 'success');
  };
  const family = slot ? familyForSlot(catalog, slot) : null;
  const spellbookHero = visiting.find((h) => !h.spellbook);
  const offering = quoteOffering(catalog, state, player.id, town.id, []);
  // The academy's terms from the rules (a city dedication may lower the Gold).
  const training = townTrainingTerms(catalog, state, player.id, town.id);
  const sbQuote = spellbookHero ? quoteSpellbook(catalog, state, spellbookHero.id, town.id) : null;
  const anchor = archetype.hudAnchor ?? 'center';
  const covenants = town.covenants.map((f) => catalog.families[f]?.name ?? f);
  const hasMarket = townHasEffect(catalog, town, 'enables_market');
  const theme = guiThemeFor(town.pantheonId);
  const plans = new Map(archetype.slots.map((x) => [x.id, slotPlan(catalog, state, player.id, town, x)]));
  const readyCount = mine ? [...plans.values()].filter((x) => x.status === 'ready').length : 0;
  const hasTavern = townHasEffect(catalog, town, 'enables_hero_hiring');
  // City dedications (scenario feature; hidden in legacy games): the temple's medallion, pane and weekly gift.
  const dedView = dedicationsOn(state) ? townDedicationView(catalog, state, town.id, player.id) : null;
  const templeSlot = archetype.slots.find((x) => x.kind === 'support' && x.role === 'pantheon_temple');
  const dedGod = dedView?.active ? godName(catalog, dedView.active.godId) : null;
  const dedGift = dedView?.benefits && dedView.benefits.resource.status.ok ? dedView.benefits.resource : null;
  const dedGiftRes = dedGift ? giftResource(dedGift.amount) : null;
  const favoredFamily = dedView?.active?.state === 'active' ? cityDedicationProfile(catalog, dedView.active.godId)?.favoredFamilyId : null;
  const favored: FavoredGrowth | null = favoredFamily && dedGod ? { familyId: favoredFamily, god: dedGod, added: dedicationGrowthPreview(catalog, state, town.id, favoredFamily) } : null;
  const dedLine = !dedView
    ? null
    : dedView.active
      ? `City dedication: ${dedGod} — ${dedView.active.state === 'dormant' ? `dormant (${dedView.active.dormantReason})` : 'active'}${dedView.pending ? `; ${godName(catalog, dedView.pending.godId)} from day ${dedView.pending.activationDay}` : ''}`
      : dedView.town.ok
        ? 'City dedication: no god yet (the first is free)'
        : `City dedication: ${dedView.town.reason}`;

  // Pop-up beside the selected building: right of it in the left half of the town, left of it in the right half;
  // its top level with the building's top (never under the economy bar), or its bottom level with the building's foot low in the scene.
  const popStyle = (() => {
    if (!slot) return undefined;
    const p = slot.placement;
    const x0 = p.x - p.width / 2;
    const x1 = p.x + p.width / 2;
    const top = Math.max(9, p.y - p.width * 1.2);
    const side = p.x < 50 ? { left: `min(${x1 + 1}%, calc(99% - var(--bld-pop-w)))` } : { right: `min(${100 - x0 + 1}%, calc(99% - var(--bld-pop-w)))` };
    const vert = p.y > 70 ? { bottom: `${Math.max(1.5, 100 - p.y)}%` } : { top: `${top}%` };
    return { ...side, ...vert };
  })();

  return (
    <div className="screen town-screen" data-gui-theme={theme}>
      <ScreenHeader
        title={
          <span className="title-with-emblem">
            <Emblem catalog={catalog} pantheonId={town.pantheonId} size="1.9rem" /> {town.name}
          </span>
        }
        right={
          owned.length > 1 ? (
            <div className="row gap">
              {owned.map((t) => (
                <Button key={t.id} size="small" variant={t.id === town.id ? 'primary' : undefined} onClick={() => store.replace('town', { townId: t.id })}>
                  {t.name}
                </Button>
              ))}
            </div>
          ) : undefined
        }
      />
      <div className="town-stage">
        <div
          className="town-scene"
          style={bg.url ? { backgroundImage: `url(${bg.url})` } : undefined}
          data-testid="town-scene"
          onClick={(e) => {
            // A click on the painting itself (not a building or the pop-up) closes the pop-up.
            if (e.target === e.currentTarget) setSlot(null);
          }}
        >
          <TownHallTransition key={town.id} url={bg.url ?? ''} level={town.buildings['civic_hall'] ?? 0} calm={reducedMotion(store.prefs)} />
          {slots.map((s) => {
            const art = slotArtId(catalog, town, s);
            const plan = plans.get(s.id)!;
            const q = plan.quote;
            const planned = catalog.buildings[s.chain[0] ?? '']?.implementationStatus === 'planned';
            const p = s.placement;
            const name = art.built ? (plan.current?.name ?? s.label) : s.label;
            const hint = slotHint(catalog, state, town, plan, favored);
            // Empty plots are small UI markers: keep them above built art so every location stays clickable.
            const style = { left: `${p.x - p.width / 2}%`, bottom: `${100 - p.y}%`, width: `${p.width}%`, zIndex: art.built ? p.layer : 20 + p.layer };
            return (
              <button
                key={s.id}
                type="button"
                className={`town-slot ${art.built ? 'is-built' : 'is-empty'} ${selected === s.id ? 'is-selected' : ''} ${planned ? 'is-planned' : ''} ${fresh.includes(s.id) ? 'is-new' : ''}`}
                style={style}
                onClick={() => setSlot(selected === s.id ? null : s.id)}
                aria-label={`${s.label}: ${art.built ? name : planned ? 'planned' : 'empty'}. ${hint}`}
                aria-expanded={selected === s.id}
                data-testid={`slot-${s.id}`}
              >
                {art.built ? (
                  <BuildingArt artAssetId={art.id} alt={activeBuildingInSlot(catalog, town, s.id)?.name ?? s.label} className="town-slot__art" />
                ) : (
                  <span className="town-slot__plot">
                    <span className="town-slot__plot-mark">{planned ? <Icon name="lock" /> : q?.legal ? <span className="plus">+</span> : <Icon name="hourglass" />}</span>
                  </span>
                )}
                {/* The building's tooltip: its name and one line (shown after a short hover, at once on keyboard focus). */}
                <span className="town-slot__label" aria-hidden="true">
                  <span className="town-slot__name">
                    {name}
                    {q?.legal && mine ? <span className="town-slot__can"> ●</span> : null}
                  </span>
                  <span className="town-slot__hint">{hint}</span>
                </span>
              </button>
            );
          })}

          {bursts.map((b) => {
            const at = archetype.slots.find((x) => x.id === b.slotId)?.placement;
            if (!at) return null;
            return <Burst key={b.key} kind={b.kind} {...(b.stripId ? { stripId: b.stripId } : {})} className="town-burst" scale={b.kind === 'brood' ? 0.6 : 1} style={{ left: `${at.x}%`, top: `${Math.max(8, at.y - at.width * 0.6)}%` }} onDone={() => setBursts((list) => list.filter((x) => x.key !== b.key))} />;
          })}

          {dedView && templeSlot ? <DedicationMedallion key={sealPulse} catalog={catalog} view={dedView} slot={templeSlot} pulseKey={sealPulse} onOpen={() => setModal('dedication')} /> : null}

          {/* Town economy: a compact panel on the painting's top edge, over open sky. */}
          <div
            className={`town-hud town-hud--${typeof anchor === 'number' ? 'at' : anchor}`}
            style={typeof anchor === 'number' ? { left: `${anchor}%` } : undefined}
            data-testid="town-economy"
            aria-label="Town economy"
          >
            <div className="town-hud__row">
              <span className="town-hud__item" title="Income per day">
                <CostList cost={income} empty="none" />
                <span className="town-hud__unit">/day</span>
              </span>
              {dedGift && dedGiftRes ? (
                <span className="town-hud__item town-hud__gift" title={`${dedGod}: ${giftTitle(dedGift.amount)}, next on day ${dedGift.nextPayoutDay}`} data-testid="town-weekly-gift">
                  <Icon name={dedGiftRes} className="town-hud__icon" />
                  <span className="num">+{formatNumber(dedGift.amount[dedGiftRes])}</span>
                  <span className="town-hud__unit">each week</span>
                </span>
              ) : null}
              <span className="town-hud__sep" aria-hidden="true" />
              <Button
                size="small"
                icon="build"
                className="town-hud__construct"
                onClick={() => setModal('construction')}
                title="Every building of this town: prices, prerequisites and what can be built today"
                data-testid="town-construction"
              >
                Build{readyCount ? <span className="town-hud__badge num" aria-label={`${readyCount} can be built now`}>{readyCount}</span> : null}
              </Button>
            </div>
            <div className="town-hud__row">
              <span className="town-hud__item" title={`Weekly growth multiplier ×${growth.numerator / growth.denominator}`}>
                <Icon name="growth" className="town-hud__icon" />×{growth.numerator / growth.denominator}
              </span>
              {covenants.length ? (
                <span className="town-hud__item" title={`Covenants: ${covenants.join(', ')}`} aria-label={`Covenants: ${covenants.join(', ')}`}>
                  <Icon name="pantheon" className="town-hud__icon" />
                  {covenants.length}
                </span>
              ) : null}
              <span className={`town-hud__item town-hud__build ${usedToday ? 'is-used' : 'is-ready'}`} title={usedToday ? 'Built today — the next building tomorrow' : 'One building can be built today'} data-testid="town-build-today">
                <Icon name="build" className="town-hud__icon" />
              </span>
              <span className="town-hud__sep" aria-hidden="true" />
              <IconAction icon="recruit" label="Recruit" onClick={() => store.goto('recruitment', { townId: town.id })} testId="town-recruit" />
              {caravansOn(catalog, state) && owned.length > 1 ? (
                <IconAction
                  icon="caravan"
                  label="Send reinforcements by caravan"
                  onClick={() => store.openOverlay({ kind: 'caravan-dispatch', townId: town.id })}
                  disabled={state.activePlayerId !== player.id || !!state.battle}
                  reason="Wait for your turn"
                  testId="town-caravan"
                />
              ) : null}
              {(() => {
                // Hero ships: the coastal launch service (not a building), offered where the town touches water.
                const lv = launchView(catalog, state, player.id, town.id, null);
                if (!lv.offered) return null;
                const why = !mine ? 'You do not own this town' : state.activePlayerId !== player.id || state.battle ? 'Wait for your turn' : null;
                const price = Object.entries(lv.cost)
                  .filter(([, n]) => (n ?? 0) > 0)
                  .map(([k, n]) => `${formatNumber(n ?? 0)} ${k[0]!.toUpperCase()}${k.slice(1)}`)
                  .join(' + ');
                return <IconAction icon="ship" label={`Launch a ship (${price})`} onClick={() => setModal('launch')} disabled={!!why} reason={why} testId="town-launch" />;
              })()}
              <IconAction icon="market" label="Market" onClick={() => setModal('market')} disabled={!hasMarket} reason="Requires a Marketplace" testId="town-market" />
              <IconAction icon="tavern" label="Tavern" onClick={() => setModal('tavern')} disabled={!hasTavern} reason="Requires a Tavern" testId="town-tavern" />
              <IconAction icon="pantheon" label="Pantheon & gods" onClick={() => store.goto('pantheon', { townId: town.id })} testId="town-gods" />
              {townMerchantStockSize(catalog, town) > 0 ? <IconAction icon="merchant" label="Artifact Merchant" onClick={() => setModal('merchant')} testId="town-merchant" /> : null}
              {town.workshop ? <IconAction icon="build" label="Workshop wares" onClick={() => setModal('workshop')} testId="town-workshop" /> : null}
            </div>
          </div>

          {slot && popStyle ? (
            <div className="bld-pop panel gui-window gui-window--compact gui-window--parchment gui-surface--parchment" style={popStyle} role="dialog" aria-label={slot.label} data-testid="building-popup" onClick={(e) => e.stopPropagation()}>
              <header className="bld-pop__head">
                <span className="bld-pop__title">{current?.name ?? slot.label}</span>
                <button type="button" className="bld-pop__close" onClick={() => setSlot(null)} aria-label="Close" title="Close (Esc)">
                  <Icon name="close" />
                </button>
              </header>
              <div className="bld-pop__body">
                {current ? (
                  <>
                    <p className="bld-pop__text">{current.summary}</p>
                    <div className="bld-pop__level">
                      <span className="bld-pop__level-text">
                        Level {level} of {slot.chain.length}
                      </span>
                      {Array.from({ length: slot.chain.length }, (_, i) => (
                        <span key={i} className={`bld-pop__pip ${i < level ? 'is-on' : ''}`} aria-hidden="true" />
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="bld-pop__text dim">Nothing built here yet.</p>
                )}
                {next && quote ? (
                  <div className="bld-pop__next">
                    <div className="bld-pop__sub">
                      <Icon name={current ? 'upgrade' : 'build'} className="inline-icon" /> {current ? `Upgrade to level ${level + 1}: ` : 'Build: '}
                      {next.name}
                    </div>
                    {/* Construction preview: the next level's own art. */}
                    <BuildingArt artAssetId={next.artAssetId} alt="" className="bld-pop__preview" />
                    <p className="bld-pop__text">{next.summary}</p>
                    {next.implementationStatus !== 'planned' ? (
                      <>
                        <CostList cost={quote.cost} wallet={player.wallet} />
                        <SavingLine catalog={catalog} saving={quote.dedication} testId="build-saving" />
                        {quote.missing.length ? (
                          <ul className="bld-pop__missing" data-testid="build-missing">
                            {quote.missing.map((m) => (
                              <li key={m}>
                                <LockGlyph />
                                {m}
                              </li>
                            ))}
                          </ul>
                        ) : (!mine || (quote.reason && !quote.legal)) ? (
                          <p className="bld-pop__reason" data-testid="build-reason">
                            <LockGlyph />
                            {!mine ? 'You do not own this town' : quote.reason}
                          </p>
                        ) : null}
                        <Button variant="primary" block icon={current ? 'upgrade' : 'build'} onClick={build} disabled={!quote.legal || !mine} disabledReason={!mine ? 'You do not own this town' : quote.reason} data-testid="build">
                          {current ? 'Upgrade' : 'Build'}
                        </Button>
                      </>
                    ) : (
                      <p className="small faint">Its mechanics are not designed yet, so it cannot be built.</p>
                    )}
                  </div>
                ) : level >= slot.chain.length ? (
                  <p className="small success">Fully built.</p>
                ) : null}
                {family ? (
                  <div className="bld-pop__line">
                    <Icon name="growth" className="inline-icon" /> {catalog.families[family]?.name}: <strong className="num">{town.population[family] ?? 0}</strong> available · +{weeklyGrowthFor(catalog, town, family, state)} per week
                    {favored && favored.familyId === family ? <span data-testid="dwelling-favored"> · {favoredText(favored)}</span> : null}
                  </div>
                ) : null}
                {slot.role === 'training_academy' && current && training ? <div className="bld-pop__line">Once per week per hero: {training.gold} Gold for {training.xp} experience.</div> : null}
                {slot.role === 'training_academy' && current && training ? <SavingLine catalog={catalog} saving={training.dedication} testId="training-saving" per="per training" /> : null}
                {slot.role === 'mage_guild' && current && spellbookHero && sbQuote ? (
                  <div className="bld-pop__line" data-testid="spellbook-price">
                    Spellbook for {spellbookHero.name}: {formatNumber(sbQuote.cost.gold)} Gold{sbQuote.legal ? '' : ` — ${sbQuote.reason}`}
                  </div>
                ) : null}
                {slot.role === 'mage_guild' && current && spellbookHero && sbQuote ? <SavingLine catalog={catalog} saving={sbQuote.dedication} testId="spellbook-saving" /> : null}
                {slot.role === 'pantheon_temple' && dedLine ? (
                  <div className="bld-pop__line" data-testid="temple-dedication-line">
                    <Icon name="star" className="inline-icon" /> {dedLine}
                  </div>
                ) : null}
                {slot.role === 'watchtower' ? <div className="bld-pop__line">Town vision: {townVisionRadius(catalog, state, town)} hexes.</div> : null}
                {slot.role === 'mage_guild' && current ? <div className="bld-pop__line">Spell library: tier {townSpellLibraryTier(catalog, town, state)}. Visiting heroes need a spellbook and sufficient Wisdom.</div> : null}
                {slot.role === 'fortifications' ? <div className="bld-pop__line">Weekly growth ×{growth.numerator / growth.denominator}. The fortifications defend the town in a siege.</div> : null}
              </div>
              <div className="bld-pop__actions">
                {slot.role === 'civic_hall' ? <IconAction icon="build" label="Construction list" onClick={() => setModal('construction')} testId="popup-construction" /> : null}
                {family ? <IconAction icon="recruit" label="Recruit" onClick={() => store.goto('recruitment', { townId: town.id, familyId: family })} disabled={!current} reason="Build the dwelling first" testId="popup-recruit" /> : null}
                {slot.role === 'marketplace' && current ? <IconAction icon="market" label="Trade resources" onClick={() => setModal('market')} /> : null}
                {slot.role === 'tavern' && current ? <IconAction icon="tavern" label="Hire heroes" onClick={() => setModal('tavern')} /> : null}
                {slot.role === 'pantheon_temple' ? (
                  <>
                    <IconAction icon="pantheon" label="Pantheon & gods" onClick={() => store.goto('pantheon', { townId: town.id })} />
                    {dedView ? <IconAction icon="star" label="City dedication" onClick={() => setModal('dedication')} testId="popup-dedication" /> : null}
                    {offering.available && current ? <IconAction icon="favor" label="Make an offering" onClick={() => setModal('offering')} disabled={offering.code === 'already_done'} reason={offering.reason} testId="offering-open" /> : null}
                    {current && divineGifts(catalog, state).length > 0 ? <IconAction icon="gift" label="Divine gifts" onClick={() => setModal('gifts')} testId="gifts-open" /> : null}
                  </>
                ) : null}
                {slot.role === 'training_academy' && current && training
                  ? visiting.map((h) => {
                      const tq = quoteTraining(catalog, state, player.id, town.id, h.id);
                      return (
                        <IconAction
                          key={h.id}
                          icon="xp"
                          label={`Train ${h.name} (${tq.cost.gold} Gold)`}
                          disabled={!tq.legal}
                          reason={tq.reason}
                          onClick={() => {
                            if (!store.dispatch({ kind: 'TrainHero', townId: town.id, heroId: h.id })) store.toast(`${h.name} trained (+${tq.xp} XP)`, 'success');
                          }}
                          testId={`train-${h.id}`}
                        />
                      );
                    })
                  : null}
                {slot.role === 'workshop' && current && town.workshop ? <IconAction icon="build" label={`Workshop wares (${town.workshop.stock.filter(Boolean).length} for sale this week)`} onClick={() => setModal('workshop')} testId="workshop-open" /> : null}
                {slot.role === 'artifact_merchant' && current ? <IconAction icon="merchant" label={`Browse artifacts (${town.merchant?.stock.filter(Boolean).length ?? 0} for sale)`} onClick={() => setModal('merchant')} testId="merchant-open" /> : null}
                {slot.role === 'mage_guild' && current && spellbookHero && sbQuote ? (
                  <IconAction icon="spell" label={`Buy a spellbook for ${spellbookHero.name} (${sbQuote.cost.gold} Gold)`} disabled={!sbQuote.legal} reason={sbQuote.reason} onClick={() => store.dispatch({ kind: 'BuySpellbook', heroId: spellbookHero.id, townId: town.id })} testId="buy-spellbook" />
                ) : null}
              </div>
            </div>
          ) : null}
          {/* Only while the town's painting really is a stand-in (never over the delivered town art). */}
          {bg.status !== 'final' ? <span className="placeholder-tag town-scene__tag">Placeholder town art</span> : null}
        </div>
      </div>
      <TownArmies town={town} visitor={visiting[0] ?? null} />
      {modal === 'construction' ? (
        <ConstructionModal
          town={town}
          onClose={() => setModal(null)}
          onShow={(id) => {
            setModal(null);
            setSlot(id);
          }}
          onBuilt={() => setModal(null)}
        />
      ) : null}
      {modal === 'market' ? <MarketModal town={town} onClose={() => setModal(null)} /> : null}
      {modal === 'tavern' ? <TavernModal town={town} onClose={() => setModal(null)} /> : null}
      {modal === 'offering' ? <OfferingModal town={town} onClose={() => setModal(null)} /> : null}
      {modal === 'merchant' ? <MerchantModal town={town} onClose={() => setModal(null)} /> : null}
      {modal === 'workshop' ? <WorkshopModal town={town} onClose={() => setModal(null)} /> : null}
      {modal === 'gifts' ? <GiftsModal town={town} onClose={() => setModal(null)} /> : null}
      {modal === 'launch' ? <CoastalLaunchModal townId={town.id} onClose={() => setModal(null)} /> : null}
      {modal === 'dedication' && dedView ? (
        <DedicationPane
          town={town}
          onClose={() => {
            setModal(null);
            if (store.screen.params.dedication) store.setParams({ dedication: false });
          }}
          onSealed={() => !reducedMotion(store.prefs) && setSealPulse((k) => k + 1)}
        />
      ) : null}
      {/* Outside the painting: its size containment and clipping would hold a fixed burst inside it. */}
      {pins.map((b) => (
        <Burst key={b.key} kind={b.kind} stripId={b.stripId} className="burst--resbar" scale={0.42} centered style={{ left: b.x, top: b.y }} onDone={() => setPins((list) => list.filter((x) => x.key !== b.key))} />
      ))}
    </div>
  );
}
