/**
 * S09 Recruitment (recruitment & route handoff, 2026-10-14; all six pantheons).
 *
 * Seven dwellings in one row; the chosen creature large on its stage (its native idle
 * strip fitted by the visible pixels of the whole clip) with its two forms as medallions
 * over the stage's left edge; the details, destination, quantity and Recruit beside it;
 * a dock with the destination's seven slots, training for the selected family and
 * Recruit all. Below desktop width the same content splits into Creature / Recruit /
 * Train views over a persistent action dock.
 *
 * Every number, reason and disabled state comes from the rules' quotes
 * (quoteRecruitment, quoteUpgrade, quoteRecruitBatch); the screen owns no prices.
 * Base and upgraded forms share ONE weekly pool. Recruiting, upgrading and Recruit all
 * never ask for approval (owner request 2026-10-03): one click, one atomic command.
 */
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import {
  abilityRules,
  quoteRecruitBatch,
  quoteRecruitment,
  quoteUpgrade,
  recruitAllItems,
  familyForms,
  recruitableCreatureIds,
  weeklyGrowthFor,
  cityDedicationProfile,
  townDedicationView,
  type ArmyRef,
  type ContentCatalog,
  type CreatureDefinition,
  type RecruitDestination,
  type ResourceBundle,
} from '@pr/rules';
import { useStore } from '../app/context';
import { reducedMotion } from '../app/preferences';
import { Button, QuantitySelector } from '../components/kit';
import { CreaturePortrait, GodPortrait, HeroPortrait } from '../components/art';
import { ArmyStrip, CostList, ScreenHeader } from '../components/game';
import { heroesInTown, humanPlayer } from '../app/view';
import { Icon, RESOURCE_ICON } from '../assets/icons';
import { creatureStageStrip, resolveAsset } from '../assets/manifest';
import { guiThemeFor } from '../assets/guiArt';
import { LockGlyph } from '../components/gui';
import { AdventureStage, adventureScene } from '../components/adventure';
import { creaturePicture, type CreaturePicture } from '../app/neutralRecruit';
import { dedicationsOn, familyNames, godName, growthBreakdown, growthBreakdownText, growthProgressText, growthRateText, possessive, savingPriceText, savingText } from '../app/dedication';
import { SavingLine } from '../components/dedication';
import { caravansOn } from '../app/caravans';

const RES_ORDER = ['gold', 'wood', 'stone', 'crystal', 'favor'] as const;
const RES_LABEL: Record<string, string> = { gold: 'gold', wood: 'wood', stone: 'stone', crystal: 'crystal', favor: 'favor' };

/** "Short 300 gold, 2 crystal" — what the wallet lacks for `cost`. */
function shortText(cost: Partial<ResourceBundle>, wallet: Partial<ResourceBundle>): string | null {
  const parts = RES_ORDER.filter((k) => (cost[k] ?? 0) > (wallet[k] ?? 0)).map((k) => `${((cost[k] ?? 0) - (wallet[k] ?? 0)).toLocaleString('en-US')} ${RES_LABEL[k]}`);
  return parts.length ? `Short ${parts.join(', ')}` : null;
}

function TrainingHint() {
  const store = useStore();
  useEffect(() => store.showHint('troop_training'), [store]);
  return null;
}

type View = 'creature' | 'recruit' | 'train';

export function RecruitmentScreen() {
  const store = useStore();
  const catalog = store.catalog;
  const state = store.session!.state;
  const player = humanPlayer(state);
  const townId = (store.screen.params.townId as string | undefined) ?? Object.values(state.towns).find((t) => t.ownerId === player.id)?.id;
  const town = townId ? state.towns[townId] : undefined;
  const archetype = town ? catalog.townArchetypes[town.archetypeId] : undefined;
  const recruitable = town ? recruitableCreatureIds(catalog, town) : [];
  // The seven dwellings in tier order, each with its family, built level and shared weekly pool.
  const tiers = (archetype?.slots ?? [])
    .filter((s) => s.kind === 'dwelling')
    .sort((a, b) => (a.tier ?? 0) - (b.tier ?? 0))
    .map((slot) => {
      const famId = catalog.buildings[slot.chain[0] ?? '']?.dwelling?.familyId;
      const fam = famId ? catalog.families[famId] : undefined;
      return fam && town ? { slot, fam, level: town.buildings[slot.id] ?? 0, pool: town.population[fam.id] ?? 0 } : null;
    })
    .filter((t): t is NonNullable<typeof t> => !!t);
  type Tier = (typeof tiers)[number];

  // An explicit form choice per family (the player clicked a medallion); kept in the screen's params.
  const paramForms = (store.screen.params.forms as Record<string, string> | undefined) ?? {};
  const paramCreature = store.screen.params.creatureId as string | undefined;
  const initialForms = { ...paramForms };
  if (paramCreature && catalog.creatures[paramCreature]) initialForms[catalog.creatures[paramCreature]!.familyId] = paramCreature;
  const [forms, setForms] = useState<Record<string, string>>(initialForms);
  const initialFamily = (() => {
    const asked = (store.screen.params.familyId as string | undefined) ?? (paramCreature ? catalog.creatures[paramCreature]?.familyId : undefined);
    if (asked && tiers.some((t) => t.fam.id === asked)) return asked;
    return (tiers.find((t) => t.level > 0) ?? tiers[0])?.fam.id ?? null;
  })();
  const [familyId, setFamilyId] = useState<string | null>(initialFamily);
  const visiting = town ? heroesInTown(catalog, state, town).filter((h) => h.ownerId === player.id) : [];
  const [dest, setDest] = useState<RecruitDestination>(visiting[0] ? { kind: 'hero', heroId: visiting[0].id } : { kind: 'garrison' });
  const [qty, setQty] = useState(1);
  const [view, setView] = useState<View>('creature');
  if (!town || !archetype) {
    return (
      <div className="screen">
        <ScreenHeader title="Recruitment" />
        <p className="pad dim">No town.</p>
      </div>
    );
  }
  // A destination hero who has left (or a stale choice): the garrison.
  const destValid = dest.kind === 'garrison' || visiting.some((h) => h.id === dest.heroId);
  const destination: RecruitDestination = destValid ? dest : visiting[0] ? { kind: 'hero', heroId: visiting[0].id } : { kind: 'garrison' };

  const tier = tiers.find((t) => t.fam.id === familyId) ?? null;
  /** The form shown for a family: the explicit choice when it can be recruited, else upgraded when its dwelling stands, else base. */
  const formOf = (t: Tier): string => {
    const chosen = forms[t.fam.id];
    if (chosen && recruitable.includes(chosen)) return chosen;
    if (t.fam.upgradedCreatureId && recruitable.includes(t.fam.upgradedCreatureId)) return t.fam.upgradedCreatureId;
    return t.fam.baseCreatureId;
  };
  const creatureId = tier ? formOf(tier) : null;
  const def = creatureId ? catalog.creatures[creatureId] : undefined;
  const canRecruit = !!def && recruitable.includes(def.id);
  const probe = def ? quoteRecruitment(catalog, state, player.id, town.id, def.id, 1, destination) : null;
  const max = probe && canRecruit ? probe.maxQuantity : 0;
  const q = max < 1 ? 0 : Math.min(Math.max(1, qty), max);
  const quote = def && q > 0 ? quoteRecruitment(catalog, state, player.id, town.id, def.id, q, destination) : null;
  const pool = tier?.pool ?? 0;
  const unitCost = probe?.unitCost ?? ({} as ResourceBundle);
  const recruitReason: string | null = !def
    ? 'No creature'
    : !tier || tier.level === 0
      ? `Build the ${catalog.buildings[tier?.slot.chain[0] ?? '']?.name ?? 'dwelling'} first`
      : !canRecruit
        ? `Requires the ${catalog.buildings[tier.slot.chain[1] ?? '']?.name ?? 'upgraded dwelling'}`
        : max < 1
          ? pool < 1
            ? 'None available this week'
            : (shortText(unitCost, player.wallet) ?? probe?.reason ?? 'Cannot recruit now')
          : quote && !quote.legal
            ? quote.reason
            : null;

  const selectFamily = (t: Tier) => {
    setFamilyId(t.fam.id);
    setQty(1);
    store.setParams({ familyId: t.fam.id });
  };
  const chooseForm = (t: Tier, id: string) => {
    if (!recruitable.includes(id)) return;
    const next = { ...forms, [t.fam.id]: id };
    setForms(next);
    setQty(1);
    store.setParams({ forms: next, creatureId: id, familyId: t.fam.id });
  };
  // Recruiting never asks for approval (owner request 2026-10-03).
  const recruit = () => {
    if (!def || !quote?.legal) return;
    if (!store.dispatch({ kind: 'RecruitUnits', townId: town.id, creatureId: def.id, quantity: q, destination })) {
      store.toast(`Recruited ${q} ${q === 1 ? def.name : def.pluralName} → ${quote.destinationLabel}`, 'success');
      setQty(1);
    }
  };

  // Recruit all: every family with a dwelling and a pool, in its chosen form, as ONE batch.
  const chosenForms: Record<string, string> = {};
  for (const t of tiers) chosenForms[t.fam.id] = formOf(t);
  const batchItems = recruitAllItems(catalog, state, town.id, chosenForms);
  const batch = quoteRecruitBatch(catalog, state, player.id, town.id, batchItems, destination);
  const recruitAll = () => {
    if (!batch.legal) return;
    if (!store.dispatch({ kind: 'RecruitBatch', townId: town.id, items: batchItems.map((i) => ({ ...i })), destination })) {
      store.toast(`Recruited ${batch.totalCount.toLocaleString('en-US')} troops (${batch.lines.length} ${batch.lines.length === 1 ? 'kind' : 'kinds'}) → ${batch.destinationLabel}`, 'success');
      setQty(1);
    }
  };

  // City dedications: the town's honored god favors one family (extra stock for its shared pool; no combat badge).
  const dedView = dedicationsOn(state) ? townDedicationView(catalog, state, town.id, player.id) : null;
  const favored = dedView?.active ? { godId: dedView.active.godId, familyId: cityDedicationProfile(catalog, dedView.active.godId)?.favoredFamilyId ?? null, dormant: dedView.active.state === 'dormant', reason: dedView.active.dormantReason } : null;
  const favorOf = (famId: string) => {
    if (!favored || favored.familyId !== famId) return null;
    const g = growthBreakdown(catalog, state, town, famId);
    const name = godName(catalog, favored.godId);
    const n = familyNames(catalog, famId);
    const rate = g.god ? (g.god.quartersPerWeek >= 4 ? growthRateText(g.god.quartersPerWeek) : growthProgressText(n.one, g.god.quartersPerWeek, g.god.blocked ? null : g.god.storedQuarters)) : '';
    const text = favored.dormant ? `${possessive(name)} favor is dormant here: ${favored.reason}` : g.god?.blocked ? `${name} favors the ${n.family}: ${g.god.blocked}` : `${name} favors the ${n.family} here: ${rate}`;
    return { godId: favored.godId, dormant: favored.dormant, text };
  };
  const breakdown = tier ? growthBreakdown(catalog, state, town, tier.fam.id) : null;
  const breakdownText = breakdown ? growthBreakdownText(catalog, breakdown) : '';
  const favor = tier ? favorOf(tier.fam.id) : null;
  // One compact line for the favored family: the growth breakdown with the god's increment, the saving per unit.
  const favorLine = (() => {
    if (!favor || !breakdown) return null;
    if (favor.dormant || !breakdown.god || breakdown.god.blocked) return favor.text;
    const rare = breakdown.god.quartersPerWeek < 4 && breakdown.god.added === 0 ? ` · ${growthProgressText(familyNames(catalog, tier!.fam.id).one, breakdown.god.quartersPerWeek, breakdown.god.storedQuarters).replace(/^One extra .* — /, 'next extra in ')}` : '';
    const saved = probe?.dedication ? ` · saves ${probe.dedication.savedGold.toLocaleString('en-US')} Gold each` : '';
    return `${breakdownText}${rare}${saved}`;
  })();

  const destArmy = destination.kind === 'hero' ? state.heroes[destination.heroId]?.army : town.garrison;
  const destName = destination.kind === 'hero' ? (state.heroes[destination.heroId]?.name ?? '') : `${town.name} garrison`;
  const back = () => (store.stack.length > 1 ? store.back() : store.toAdventure());
  const calm = reducedMotion(store.prefs);

  return (
    <AdventureStage
      mode="screen"
      compact
      theme={guiThemeFor(town.pantheonId)}
      scene={adventureScene('recruit', town.pantheonId)}
      title="Gather your forces"
      subtitle={town.name}
      pantheonId={town.pantheonId}
      catalog={catalog}
      testId="recruit-screen"
      className="ak-recruit-stage recruit-screen"
      onClose={back}
      aside={<Treasury wallet={player.wallet} />}
    >
      <div className="rr" data-view={view} data-testid="recruit-layout">
        <nav className="rr-tiers" aria-label="Dwellings">
          {tiers.map((t) => (
            <TierCard key={t.slot.id} catalog={catalog} tier={t} shownId={formOf(t)} selected={t.fam.id === familyId} growth={weeklyGrowthFor(catalog, town, t.fam.id, state)} favor={favorOf(t.fam.id)} onSelect={() => selectFamily(t)} />
          ))}
        </nav>

        <div className="rr-views" role="tablist" aria-label="Recruitment views">
          {(['creature', 'recruit', 'train'] as const).map((v) => (
            <button key={v} type="button" role="tab" aria-selected={view === v} className={`ak-seg__btn ${view === v ? 'is-selected' : ''}`} onClick={() => setView(v)} data-testid={`recruit-view-${v}`}>
              {v === 'creature' ? 'Creature' : v === 'recruit' ? 'Recruit' : 'Train'}
            </button>
          ))}
        </div>

        <div className="rr-main">
          <section className="rr-show" data-pane="creature" aria-label="Recruitment stage">
            {tier ? (
              <div className="rr-forms" role="radiogroup" aria-label={`${tier.fam.name}: form`}>
                {familyForms(tier.fam).map((cid) => {
                  const c = catalog.creatures[cid]!;
                  const open = recruitable.includes(cid);
                  const on = creatureId === cid;
                  const needs = catalog.buildings[tier.slot.chain[c.form === 'base' ? 0 : 1] ?? '']?.name ?? 'its dwelling';
                  return (
                    <button
                      key={cid}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      aria-disabled={!open}
                      className={`rr-medal ${on ? 'is-selected' : ''} ${open ? '' : 'is-locked'}`}
                      onClick={() => chooseForm(tier, cid)}
                      title={open ? `${c.name} (${c.form === 'upgraded' ? 'upgraded' : 'base'} form)` : `${c.name}: requires the ${needs}`}
                      aria-label={open ? c.name : `${c.name}, locked: requires the ${needs}`}
                      data-testid={`recruit-${cid}`}
                    >
                      <span className="rr-medal__face">
                        <CreaturePortrait catalog={catalog} creatureId={cid} size="100%" round />
                        {on ? (
                          <span className="rr-medal__mark rr-medal__mark--check" aria-hidden="true">
                            <Icon name="check" glyph />
                          </span>
                        ) : !open ? (
                          <span className="rr-medal__mark rr-medal__mark--lock" aria-hidden="true">
                            <LockGlyph />
                          </span>
                        ) : null}
                      </span>
                      <span className="rr-medal__name">{c.form === 'upgraded' ? 'Upgraded' : 'Base'}</span>
                      {!open ? <span className="rr-medal__need">{c.form === 'upgraded' ? 'Upgrade dwelling' : 'Build dwelling'}</span> : null}
                    </button>
                  );
                })}
              </div>
            ) : null}
            {def ? <RecruitFigure creatureId={def.id} name={def.name} calm={calm} portrait={creaturePicture(catalog, def.id)} /> : <div className="rr-stage recruit-stage" />}
            {def ? (
              <div className="rr-plate" aria-hidden="true">
                <span className="rr-plate__name">{def.name}</span>
              </div>
            ) : null}
          </section>

          <section className="rr-detail recruit-detail ak-pane" data-pane="recruit" aria-label={def ? `Recruit ${def.pluralName}` : 'Recruitment'}>
            {def ? (
              <>
                <header className="rr-detail__head">
                  <div>
                    <h3 className="rr-detail__name">{def.name}</h3>
                    <p className="rr-detail__role">
                      {def.form === 'upgraded' ? 'Upgraded' : 'Base'} · {def.roleLabel}
                    </p>
                  </div>
                  <button type="button" className="icon-link rr-info" onClick={() => store.goto('unit-detail', { creatureId: def.id })} aria-label={`Bestiary entry: ${def.name}`} title={`${def.summary} — open the bestiary entry`} data-testid="recruit-bestiary">
                    <Icon name="info" />
                  </button>
                </header>
                <p className="rr-detail__summary">{def.summary}</p>
                <StatGrid def={def} />
                <Abilities catalog={catalog} def={def} />
                <div className="rr-facts">
                  <span data-testid="recruit-available">
                    <strong className="num">{pool.toLocaleString('en-US')}</strong> available
                    {tier && tier.level > 0 ? (
                      <span className="ak-muted rr-growth" tabIndex={0} title={`Growth: ${breakdownText} (one pool for both forms)`} aria-label={`Growth: ${breakdownText}`} data-testid="recruit-growth">
                        {' '}
                        · +{weeklyGrowthFor(catalog, town, tier.fam.id, state)} / week
                      </span>
                    ) : null}
                  </span>
                  <span className="rr-facts__cost">
                    <CostList cost={unitCost} /> each
                  </span>
                  {probe?.dedication ? (
                    <span className="ak-muted rr-normal" data-testid="recruit-normal-price">
                      normally {(probe.dedication.normalGold).toLocaleString('en-US')} Gold
                    </span>
                  ) : null}
                </div>
                {favor ? (
                  <p className={`rr-favor small ${favor.dormant ? 'is-dormant' : ''}`} tabIndex={0} title={favor.text} data-testid="recruit-favor">
                    <GodPortrait catalog={catalog} godId={favor.godId} size="1.5rem" locked={favor.dormant} />
                    <span>{favorLine}</span>
                    <span className="sr-only">. {favor.text}</span>
                  </p>
                ) : (
                  <SavingLine catalog={catalog} saving={quote?.dedication ?? probe?.dedication} testId="recruit-saving" per={quote ? `for ${q}` : 'each'} />
                )}
                  {quote && quote.unitCost.gold * q > quote.totalCost.gold ? <p className="small">Rice Key: saves {quote.unitCost.gold * q - quote.totalCost.gold} Gold on this order. First eligible purchase today; 150 Gold maximum per empire.</p> : null}
                <DestinationPicker catalog={catalog} visiting={visiting} townName={town.name} dest={destination} onChange={setDest} />
                <QuantitySelector label="Quantity" value={q} min={max < 1 ? 0 : 1} max={Math.max(0, max)} onChange={setQty} />
                {recruitReason ? (
                  <p className="rr-reason small" data-testid="recruit-reason">
                    <LockGlyph /> {recruitReason}
                  </p>
                ) : null}
                <Button
                  variant="primary"
                  size="large"
                  block
                  className="rr-recruit"
                  disabled={!quote?.legal}
                  disabledReason={recruitReason ?? 'Cannot recruit now'}
                  onClick={recruit}
                  title={quote?.dedication ? `${savingText(catalog, quote.dedication)} (${savingPriceText(quote.dedication)})` : undefined}
                  data-testid="recruit-confirm"
                >
                  <span>Recruit {q}</span>
                  <CostList cost={quote?.totalCost ?? unitCost} wallet={player.wallet} />
                </Button>
              </>
            ) : (
              <p className="ak-muted">Build a dwelling to recruit creatures.</p>
            )}
          </section>
        </div>

        <div className="rr-dock">
          <Button className="rr-back" icon="back" onClick={back} data-testid="recruit-back">
            Back
          </Button>
          {destArmy ? (
            <section className="rr-army ak-pane" data-pane="train" aria-label={`${destName}: army`}>
              <h3 className="rr-dock__title">{destination.kind === 'hero' ? `${destName}’s army` : destName}</h3>
              <ArmyStrip catalog={catalog} army={destArmy} label={`${destName} army`} selected={quote?.legal ? quote.destinationSlot : null} />
            </section>
          ) : null}
          {tier ? <Training key={`${tier.fam.id}|${destination.kind === 'hero' ? destination.heroId : 'g'}`} townId={town.id} tier={tier} destination={destination} visiting={visiting.map((h) => ({ id: h.id, name: h.name }))} /> : <section className="rr-train ak-pane" data-pane="train" />}
          <RecruitAll batch={batch} wallet={player.wallet} catalog={catalog} onRecruit={recruitAll} />
          {caravansOn(catalog, state) && Object.values(state.towns).filter((t) => t.ownerId === player.id).length > 1 ? (
            <Button
              icon="caravan"
              className="rr-caravan"
              onClick={() => store.openOverlay({ kind: 'caravan-dispatch', townId: town.id, ...(def ? { creatureId: def.id } : {}) })}
              disabled={state.activePlayerId !== player.id || !!state.battle}
              disabledReason="Wait for your turn"
              title="Buy recruits here and send them over land to another of your towns (transport fee once)"
              data-testid="recruit-caravan"
            >
              Send by caravan
            </Button>
          ) : null}
          <Button variant="primary" className="rr-dock__recruit" disabled={!quote?.legal} disabledReason={recruitReason ?? 'Cannot recruit now'} onClick={recruit} data-testid="recruit-confirm-dock">
            Recruit {q}
          </Button>
        </div>
      </div>
    </AdventureStage>
  );
}

// ---------------------------------------------------------------------------
// Pieces
// ---------------------------------------------------------------------------

function Treasury({ wallet }: { wallet: Partial<ResourceBundle> }) {
  return (
    <div className="rr-treasury" aria-label="Treasury">
      {RES_ORDER.map((k) => (
        <span key={k} className="rr-treasury__item" title={`${RES_LABEL[k]![0]!.toUpperCase()}${RES_LABEL[k]!.slice(1)}: ${(wallet[k] ?? 0).toLocaleString('en-US')}`} data-testid={`recruit-res-${k}`}>
          <Icon name={RESOURCE_ICON[k]!} />
          <span className="num">{(wallet[k] ?? 0).toLocaleString('en-US')}</span>
        </span>
      ))}
    </div>
  );
}

function TierCard({ catalog, tier, shownId, selected, growth, favor, onSelect }: { catalog: ContentCatalog; tier: { slot: { id: string; tier?: number; chain: readonly string[] }; fam: { id: string; name: string; baseCreatureId: string }; level: number; pool: number }; shownId: string; selected: boolean; growth: number; favor?: { godId: string; dormant: boolean; text: string } | null; onSelect: () => void }) {
  const c = catalog.creatures[shownId] ?? catalog.creatures[tier.fam.baseCreatureId];
  const url = c ? resolveAsset(c.presentation.portraitAssetId).url : null;
  const locked = tier.level === 0;
  const need = catalog.buildings[tier.slot.chain[0] ?? '']?.name ?? 'its dwelling';
  const tip = `${locked ? `${tier.fam.name}: build the ${need} to recruit them` : `${tier.fam.name}: ${tier.pool} available, +${growth} / week (one pool for both forms)`}${favor ? `. ${favor.text}` : ''}`;
  return (
    <button type="button" className={`rr-tier ${selected ? 'is-selected' : ''} ${locked ? 'is-locked' : ''}`} aria-pressed={selected} onClick={onSelect} title={tip} aria-description={tip} data-testid={`recruit-tier-${tier.slot.tier}`}>
      <span className="rr-tier__art">{url ? <img src={url} alt="" draggable={false} /> : c ? <CreaturePortrait catalog={catalog} creatureId={c.id} size="100%" /> : null}</span>
      {favor ? (
        <span className={`rr-tier__god ${favor.dormant ? 'is-dormant' : ''}`} data-testid={`recruit-tier-god-${tier.slot.tier}`} aria-hidden="true">
          <GodPortrait catalog={catalog} godId={favor.godId} size="100%" locked={favor.dormant} />
        </span>
      ) : null}
      <span className="rr-tier__name">{tier.fam.name}</span>
      <span className="rr-tier__pool">
        {locked ? (
          <>
            <LockGlyph /> Build dwelling
          </>
        ) : (
          <>
            <strong className="num">{tier.pool}</strong> available
          </>
        )}
      </span>
    </button>
  );
}

/**
 * The creature on its stage: the native idle strip (recruitment copy), scaled ONCE for the
 * whole clip so the union of its visible pixels over every frame fills about 82 % of the
 * stage's height (90 % of the width beside the medallions), its feet on the shared ground
 * line. Frames play as a CSS strip (held on the first frame under reduced motion). A creature
 * without any idle strip (the campaign kit's neutrals) stands as its portrait, fitted and never
 * shown larger than its native size.
 */
function RecruitFigure({ creatureId, name, calm, portrait }: { creatureId: string; name: string; calm: boolean; portrait?: CreaturePicture | null }) {
  const strip = creatureStageStrip(creatureId);
  const ref = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<{ w: number; h: number } | null>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setBox((b) => (b && b.w === el.clientWidth && b.h === el.clientHeight ? b : { w: el.clientWidth, h: el.clientHeight }));
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  let style: CSSProperties | undefined;
  let shadow: CSSProperties | undefined;
  if (strip && box && box.w > 0 && box.h > 0) {
    const [x0, y0, x1, y1] = strip.visible;
    const vw = Math.max(1, x1 - x0);
    const vh = Math.max(1, y1 - y0);
    // The medallions stand over the stage's left edge: the figure keeps clear of them.
    const medal = Math.min(box.w * 0.2, 150);
    const region = box.w - medal;
    const s = Math.min((region * 0.9) / vw, (box.h * 0.82) / vh);
    const feet = strip.anchor[1] * strip.frameHeight;
    const ground = box.h * 0.92;
    let top = ground - feet * s;
    const visTop = top + y0 * s;
    if (visTop < box.h * 0.03) top += box.h * 0.03 - visTop;
    const visBottom = top + y1 * s;
    if (visBottom > box.h * 0.995) top -= visBottom - box.h * 0.995;
    const left = medal + (region - vw * s) / 2 - x0 * s;
    style = {
      ['--s' as string]: `${s}px`,
      ['--fw' as string]: strip.frameWidth,
      ['--fh' as string]: strip.frameHeight,
      ['--frames' as string]: strip.frames,
      ['--dur' as string]: `${(strip.frames / Math.max(1, strip.fps)).toFixed(2)}s`,
      backgroundImage: `url("${strip.url}")`,
      left: `${left}px`,
      top: `${top}px`,
      ...(calm ? { animation: 'none' } : {}),
    };
    const footX = left + strip.anchor[0] * strip.frameWidth * s;
    shadow = { left: `${footX - vw * s * 0.32}px`, top: `${top + feet * s - box.h * 0.025}px`, width: `${vw * s * 0.64}px`, height: `${box.h * 0.05}px` };
  }
  if (!strip && portrait) {
    return (
      <div ref={ref} className="rr-stage recruit-stage ak-creature-stage ak-creature-stage--portrait" data-testid="recruit-stage" data-native="false" data-fallback="portrait">
        <img className="ak-creature-stage__portrait" src={portrait.url} alt={portrait.alt || name} width={portrait.width ?? undefined} height={portrait.height ?? undefined} draggable={false} decoding="async" data-asset={portrait.assetId} />
      </div>
    );
  }
  return (
    <div ref={ref} className="rr-stage recruit-stage ak-creature-stage" role="img" aria-label={`${name}, standing ready`} data-testid="recruit-stage" data-native={strip?.native ? 'true' : 'false'}>
      {shadow ? <span className="rr-stage__shadow" style={shadow} aria-hidden="true" /> : null}
      {style ? <div className="recruit-stage__unit rr-stage__unit" style={style} data-testid="recruit-figure" /> : null}
    </div>
  );
}

function StatGrid({ def }: { def: CreatureDefinition }) {
  const s = def.stats;
  if (!s) return <p className="dim small">Statistics are not designed for this creature yet.</p>;
  const cell = (icon: Parameters<typeof Icon>[0]['name'], label: string, value: string | number) => (
    <div className="rr-stat" key={label}>
      <span className="rr-stat__icon">
        <Icon name={icon} />
      </span>
      <span className="rr-stat__label">{label}</span>
      <span className="rr-stat__value num">{value}</span>
    </div>
  );
  return (
    <div className="rr-stats-wrap">
      <div className="rr-stats" data-testid="recruit-stats">
        {cell('attack', 'Attack', s.attack)}
        {cell('defense', 'Defense', s.defense)}
        {cell('damage', 'Damage', `${s.damageMin}–${s.damageMax}`)}
        {cell('hp', 'Health', s.hp)}
        {cell('speed', 'Speed', s.speed)}
        {cell('army', 'Size', s.footprint === 2 ? '2 hexes' : '1 hex')}
      </div>
      {s.shots > 0 ? (
        <div className="rr-badges">
          <span className="rr-badge" title={`Ranged: ${s.shots} shots per battle`}>
            <Icon name="shots" /> {s.shots} shots
          </span>
          {s.range ? (
            <span className="rr-badge" title={`Range ${s.range} hexes; full damage up to ${Math.floor(s.range / 2)} hexes`}>
              <Icon name="range" /> Range {s.range}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function Abilities({ catalog, def }: { catalog: ContentCatalog; def: CreatureDefinition }) {
  const ids = def.abilityIds.filter((a) => catalog.abilities[a]);
  if (ids.length === 0 && abilityRules(catalog, def.id).length === 0) return null;
  return (
    <ul className="rr-abilities" aria-label="Abilities">
      {ids.map((a) => {
        const ab = catalog.abilities[a]!;
        return (
          <li key={a}>
            <span className="rr-chip" tabIndex={0} title={ab.exactRule} aria-description={ab.exactRule}>
              <Icon name="ability" />
              {ab.name}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function DestinationPicker({ catalog, visiting, townName, dest, onChange }: { catalog: ContentCatalog; visiting: readonly { id: string; name: string; definitionId: string }[]; townName: string; dest: RecruitDestination; onChange: (d: RecruitDestination) => void }) {
  const options: { key: string; d: RecruitDestination; label: string }[] = [...visiting.map((h) => ({ key: h.id, d: { kind: 'hero', heroId: h.id } as RecruitDestination, label: `${h.name}’s army` })), { key: 'garrison', d: { kind: 'garrison' }, label: `${townName} garrison` }];
  const index = Math.max(0, options.findIndex((o) => (o.d.kind === 'garrison' ? dest.kind === 'garrison' : dest.kind === 'hero' && dest.heroId === (o.d as { heroId: string }).heroId)));
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const onKey = (e: KeyboardEvent) => {
    const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const n = (index + step + options.length) % options.length;
    onChange(options[n]!.d);
    refs.current[n]?.focus();
  };
  return (
    <div className="rr-dest">
      <span className="rr-dest__label" id="recruit-dest-label">
        To:
      </span>
      <div className="rr-dest__opts" role="radiogroup" aria-labelledby="recruit-dest-label" onKeyDown={onKey}>
        {options.map((o, i) => {
          const on = i === index;
          const hero = visiting.find((h) => h.id === o.key);
          return (
            <button
              key={o.key}
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="button"
              role="radio"
              aria-checked={on}
              tabIndex={on ? 0 : -1}
              className={`rr-dest__opt ${on ? 'is-selected' : ''}`}
              onClick={() => onChange(o.d)}
              title={o.label}
              aria-label={o.label}
              data-testid={o.key === 'garrison' ? 'recruit-dest-garrison' : `recruit-dest-${o.key}`}
            >
              {hero ? <HeroPortrait catalog={catalog} definitionId={hero.definitionId} name={hero.name} size="100%" /> : <Icon name="town" />}
              {on ? (
                <span className="rr-dest__check" aria-hidden="true">
                  <Icon name="check" glyph />
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
      <span className="rr-dest__name" data-testid="recruit-dest-name">
        {options[index]?.label}
      </span>
    </div>
  );
}

/**
 * Training for the selected family: its base-form stacks in the destination first, then in the
 * town's other armies. One stack at a time (a compact selector when there are several); the
 * quantity is per stack; upgrading pays the difference and uses no population.
 */
function Training({ townId, tier, destination, visiting }: { townId: string; tier: { slot: { chain: readonly string[] }; fam: { id: string; baseCreatureId: string; upgradedCreatureId?: string } }; destination: RecruitDestination; visiting: readonly { id: string; name: string }[] }) {
  const store = useStore();
  const catalog = store.catalog;
  const state = store.session!.state;
  const playerId = store.session!.humanPlayerId;
  const town = state.towns[townId]!;
  const base = catalog.creatures[tier.fam.baseCreatureId]!;
  // A single-form family has nothing to train into (no fabricated upgrade; handoff 2026-10-15).
  const up = tier.fam.upgradedCreatureId ? catalog.creatures[tier.fam.upgradedCreatureId] : undefined;
  const upBuilt = !!up && recruitableCreatureIds(catalog, town).includes(up.id);
  const armies: { ref: ArmyRef; label: string; short: string; slots: typeof town.garrison.slots; mine: boolean }[] = [
    ...visiting.map((h) => ({ ref: { kind: 'hero', heroId: h.id } as ArmyRef, label: `${h.name}’s army`, short: h.name, slots: state.heroes[h.id]!.army.slots, mine: destination.kind === 'hero' && destination.heroId === h.id })),
    { ref: { kind: 'garrison', townId } as ArmyRef, label: `${town.name} garrison`, short: 'Garrison', slots: town.garrison.slots, mine: destination.kind === 'garrison' },
  ].sort((a, b) => Number(b.mine) - Number(a.mine));
  const candidates = armies.flatMap((a) => a.slots.map((s, i) => ({ a, i, s })).filter(({ s }) => s?.creatureId === base.id).map(({ a, i, s }) => ({ ref: a.ref, label: a.label, short: a.short, slot: i, count: s!.count })));
  const [pickIndex, setPick] = useState(0);
  const [qty, setQty] = useState(1);
  const cand = candidates[Math.min(pickIndex, Math.max(0, candidates.length - 1))];
  const needs = catalog.buildings[tier.slot.chain[1] ?? '']?.name ?? 'the upgraded dwelling';
  if (!up) {
    return (
      <section className="rr-train ak-pane is-locked" data-pane="train" aria-label="Train existing troops" data-testid="train-panel">
        <h3 className="rr-dock__title">
          <Icon name="train" /> <span className="rr-dock__label">Train existing troops</span>
        </h3>
        <p className="rr-train__locked" data-testid="train-single-form">
          <span>{base.pluralName} have a single form: there is nothing to train them into.</span>
        </p>
      </section>
    );
  }
  if (!upBuilt) {
    return (
      <section className="rr-train ak-pane is-locked" data-pane="train" aria-label="Train existing troops" data-testid="train-panel">
        <h3 className="rr-dock__title">
          <Icon name="train" /> <span className="rr-dock__label">Train existing troops</span>
        </h3>
        <p className="rr-train__locked" data-testid="train-locked">
          <LockGlyph /> <span>Training locked · Requires the {needs}</span>
        </p>
      </section>
    );
  }
  if (!cand) {
    return (
      <section className="rr-train ak-pane" data-pane="train" aria-label="Train existing troops" data-testid="train-panel">
        <h3 className="rr-dock__title">
          <Icon name="train" /> <span className="rr-dock__label">Train existing troops</span>
        </h3>
        <p className="ak-muted small">No {base.pluralName} here to train into {up.pluralName}.</p>
      </section>
    );
  }
  const probe = quoteUpgrade(catalog, state, playerId, townId, cand.ref, cand.slot, 1);
  const max = Math.max(0, probe.maxQuantity);
  const q = max < 1 ? 0 : Math.min(Math.max(1, qty), max);
  const quote = quoteUpgrade(catalog, state, playerId, townId, cand.ref, cand.slot, Math.max(1, q));
  const wallet = state.players[playerId]?.wallet;
  const reason = max < 1 ? (shortText(probe.unitCost, wallet ?? {}) ?? probe.reason ?? 'Cannot train now') : quote.legal ? null : quote.reason;
  return (
    <section className="rr-train ak-pane" data-pane="train" aria-label="Train existing troops" data-testid="train-panel">
      <TrainingHint />
      <div className="rr-train__head">
        <h3 className="rr-dock__title">
          <Icon name="train" /> <span className="rr-dock__label">Train existing troops</span>
        </h3>
        {candidates.length > 1 ? (
          <div className="rr-train__pick" role="radiogroup" aria-label="Stack to train">
            {candidates.map((c, i) => (
              <button key={`${c.label}-${c.slot}`} type="button" role="radio" aria-checked={c === cand} className={`rr-train__opt ${c === cand ? 'is-selected' : ''}`} onClick={() => setPick(i)} title={`${c.label}, slot ${c.slot + 1}: ${c.count} ${base.pluralName}`} data-testid={`train-pick-${i}`}>
                {c.short}
              </button>
            ))}
          </div>
        ) : null}
      </div>
      <div className="rr-train__row">
        <CreaturePortrait catalog={catalog} creatureId={base.id} size="2.9rem" count={cand.count} />
        <Icon name="back" className="rr-train__arrow" />
        <CreaturePortrait catalog={catalog} creatureId={up.id} size="2.9rem" />
        <div className="rr-train__qty">
          <Button size="small" className="gui-no-lock" onClick={() => setQty(Math.max(1, q - 1))} disabled={q <= 1} aria-label={`Train fewer ${base.pluralName}`}>
            −
          </Button>
          <span className="num" aria-live="polite" data-testid="train-qty">
            {q}
          </span>
          <Button size="small" className="gui-no-lock" onClick={() => setQty(Math.min(max, q + 1))} disabled={q >= max} aria-label={`Train more ${base.pluralName}`}>
            +
          </Button>
          <Button size="small" className="gui-no-lock" onClick={() => setQty(max)} disabled={q >= max} aria-label={`Train as many ${base.pluralName} as possible`} data-testid="train-max">
            Max
          </Button>
        </div>
        <CostList cost={quote.totalCost} wallet={wallet} />
        <Button
          variant="primary"
          size="small"
          icon="train"
          className="rr-train__go"
          disabled={!quote.legal || q < 1}
          disabledReason={reason}
          title={`Train ${q} ${base.pluralName} (${cand.label}) into ${up.pluralName}`}
          aria-label={`Train ${q} ${base.pluralName} into ${up.pluralName}`}
          onClick={() => {
            if (!store.dispatch({ kind: 'UpgradeStack', townId, army: cand.ref, slot: cand.slot, quantity: q })) {
              store.toast(`Trained ${q} ${q === 1 ? up.name : up.pluralName}`, 'success');
              setQty(1);
            }
          }}
          data-testid={`train-${base.id}`}
        >
          Train {q}
        </Button>
      </div>
      {reason ? <p className="rr-reason small">{reason}</p> : null}
      <SavingLine catalog={catalog} saving={quote.dedication} testId="train-saving" per={`for ${Math.max(1, q)}`} />
    </section>
  );
}

function RecruitAll({ batch, wallet, catalog, onRecruit }: { batch: ReturnType<typeof quoteRecruitBatch>; wallet: ResourceBundle; catalog: ContentCatalog; onRecruit: () => void }) {
  const art = resolveAsset('recruitroute.icon-recruit-all').url;
  const empty = batch.lines.length === 0;
  const reason = empty ? 'No creatures available in this town' : batch.legal ? null : batch.reason;
  const breakdown = batch.lines.map((l) => {
    const c = catalog.creatures[l.creatureId];
    return `${l.quantity} ${l.quantity === 1 ? c?.name : c?.pluralName}`;
  });
  return (
    <section className={`rr-all ak-pane ${batch.legal ? '' : 'is-disabled'}`} data-pane="dock" aria-label="Recruit all">
      <button type="button" className="rr-all__btn" onClick={onRecruit} disabled={!batch.legal} aria-describedby="rr-all-breakdown" title={reason ?? undefined} data-testid="recruit-all">
        <span className="rr-all__art" aria-hidden="true">
          {art ? <img src={art} alt="" draggable={false} /> : <Icon name="recruitall" />}
        </span>
        <span className="rr-all__text">
          <span className="rr-all__title">Recruit all</span>
          <span className="rr-all__sub">All available town creatures</span>
          <span className="rr-all__sum" data-testid="recruit-all-summary">
            {empty ? (
              'Nothing to recruit'
            ) : (
              <>
                <span className="num">{batch.totalCount.toLocaleString('en-US')}</span> troops · <CostList cost={batch.totalCost} wallet={wallet} />
                {batch.dedication ? (
                  <span className="rr-all__save" data-testid="recruit-all-saving">
                    · saves {batch.dedication.savedGold.toLocaleString('en-US')} Gold
                  </span>
                ) : null}
              </>
            )}
          </span>
        </span>
      </button>
      {reason ? (
        <p className="rr-all__reason" data-testid="recruit-all-reason">
          <LockGlyph /> {reason}
        </p>
      ) : null}
      <div className="rr-all__breakdown" id="rr-all-breakdown" role="tooltip">
        {breakdown.length ? (
          <ul>
            {batch.lines.map((l, i) => (
              <li key={l.creatureId}>
                <span>{breakdown[i]}</span> <CostList cost={l.totalCost} />
              </li>
            ))}
          </ul>
        ) : (
          <span>No dwelling has creatures this week.</span>
        )}
        {batch.dedication ? <SavingLine catalog={catalog} saving={batch.dedication} testId="recruit-all-saving-line" per="for the whole batch" /> : null}
      </div>
    </section>
  );
}
