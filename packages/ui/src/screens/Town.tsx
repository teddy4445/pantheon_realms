/**
 * S08 Town Management. A composed town scene with the archetype's 18 fixed
 * locations (11 support + 7 dwellings). Every build state, cost and missing
 * prerequisite comes from quoteConstruction; building is a BuildStructure
 * command after a confirmation. Market, Tavern and Sanctum services are here.
 */
import { useMemo, useState } from 'react';
import {
  ARTIFACT_SLOT_LABEL,
  RESOURCE_KEYS,
  RESOURCE_LABELS,
  activeBuildingInSlot,
  hireOptions,
  specialtiesEnabled,
  HIRE_STARTING_TROOPS,
  townTierOneBase,
  quoteConstruction,
  quoteHireHero,
  quoteSpellbook,
  quoteTrade,
  marketRates,
  playerMarketCount,
  townDailyIncome,
  townGrowthMultiplier,
  townHasEffect,
  townSpellLibraryTier,
  weeklyGrowthFor,
  familyForSlot,
  quoteOffering,
  quoteTraining,
  quoteArtifactPurchase,
  townTraining,
  townVisionRadius,
  townMerchantStockSize,
  worldWeek,
  type ArmyRef,
  type OfferingLine,
  type BuildingSlotDefinition,
  type ResourceKey,
  type TownState,
} from '@pr/rules';
import { resources } from '@pr/rules';
import { useStore } from '../app/context';
import type { AppStore } from '../app/store';
import { Button, Chip, Modal, Panel, QuantitySelector, SectionTitle } from '../components/kit';
import { ArtifactIcon, BuildingArt, HeroPortrait, SpecialtyLine } from '../components/art';
import { ArmyStrip, CostList, ScreenHeader, StatusChip } from '../components/game';
import { resolveAsset } from '../assets/manifest';
import { Icon } from '../assets/icons';
import { heroesInTown, humanPlayer } from '../app/view';

const STATE_LABEL: Record<string, { text: string; tone: 'ok' | 'warn' | 'bad' | 'info' | 'muted' }> = {
  built: { text: 'Built', tone: 'ok' },
  available: { text: 'Can build', tone: 'ok' },
  unaffordable: { text: 'Not enough resources', tone: 'bad' },
  locked: { text: 'Requirements missing', tone: 'warn' },
  not_in_scope: { text: 'Not in this mission', tone: 'muted' },
  planned: { text: 'Planned', tone: 'muted' },
  used_today: { text: 'Built today', tone: 'info' },
};

function slotArtId(catalog: AppStore['catalog'], town: TownState, slot: BuildingSlotDefinition): { id: string; built: boolean } {
  const active = activeBuildingInSlot(catalog, town, slot.id);
  if (active) return { id: active.artAssetId, built: true };
  const first = catalog.buildings[slot.chain[0] ?? ''];
  return { id: first?.artAssetId ?? '', built: false };
}

function MarketModal({ town, onClose }: { town: TownState; onClose: () => void }) {
  const store = useStore();
  const catalog = store.catalog;
  const state = store.session!.state;
  const playerId = store.session!.humanPlayerId;
  const wallet = state.players[playerId]!.wallet;
  const [mode, setMode] = useState<'sell' | 'buy'>('sell');
  const [res, setRes] = useState<ResourceKey>('wood');
  const [amount, setAmount] = useState(1);
  const sell = mode === 'sell' ? res : 'gold';
  const buy = mode === 'sell' ? 'gold' : res;
  const q = quoteTrade(catalog, state, playerId, town.id, sell, buy, amount);
  const tier = marketRates(catalog, playerMarketCount(catalog, state, playerId));
  const unit = mode === 'sell' ? (res === 'crystal' ? tier.sellCrystal : tier.sellCommon) : res === 'crystal' ? tier.buyCrystal : tier.buyCommon;
  const max = mode === 'sell' ? wallet[res] : Math.floor(wallet.gold / Math.max(1, unit));
  return (
    <Modal title={`Marketplace — ${town.name}`} onClose={onClose} width="34rem" testId="market">
      <p className="dim small">Resources trade through Gold only. Favor cannot be traded. Rates improve with more Marketplaces ({playerMarketCount(catalog, state, playerId)} owned).</p>
      <div className="tabs">
        <button type="button" role="tab" className="tab" aria-selected={mode === 'sell'} onClick={() => setMode('sell')}>
          Sell for Gold
        </button>
        <button type="button" role="tab" className="tab" aria-selected={mode === 'buy'} onClick={() => setMode('buy')}>
          Buy with Gold
        </button>
      </div>
      <div className="row gap wrap" style={{ margin: '0.8rem 0' }}>
        {(['wood', 'stone', 'crystal'] as const).map((k) => (
          <Button key={k} variant={res === k ? 'primary' : undefined} icon={k} onClick={() => setRes(k)}>
            {RESOURCE_LABELS[k]}
          </Button>
        ))}
      </div>
      <div className="small">
        Rate: 1 {RESOURCE_LABELS[res]} {mode === 'sell' ? '→' : '←'} {unit} Gold
      </div>
      <QuantitySelector label="Amount" value={Math.min(amount, Math.max(1, max))} min={1} max={Math.max(1, max)} onChange={setAmount} />
      <div className="row gap" style={{ marginTop: '0.6rem' }}>
        <span>Pay</span> <CostList cost={q.pay} wallet={wallet} empty="—" /> <span>Receive</span> <CostList cost={q.receive} empty="—" />
      </div>
      <div className="modal__actions">
        <Button onClick={onClose}>Close</Button>
        <Button
          variant="primary"
          disabled={!q.legal || max < 1}
          disabledReason={max < 1 ? `You have no ${mode === 'sell' ? RESOURCE_LABELS[res] : 'Gold'} to trade` : q.reason}
          onClick={() => {
            if (!store.dispatch({ kind: 'TradeResources', townId: town.id, sell, buy, amount })) store.toast('Trade completed', 'success');
          }}
        >
          Trade
        </Button>
      </div>
    </Modal>
  );
}

function TavernModal({ town, onClose }: { town: TownState; onClose: () => void }) {
  const store = useStore();
  const catalog = store.catalog;
  const state = store.session!.state;
  const playerId = store.session!.humanPlayerId;
  const candidates = hireOptions(catalog, state, playerId, town.id);
  const escort = townTierOneBase(catalog, town);
  const escortName = escort ? catalog.creatures[escort]?.pluralName : 'troops';
  return (
    <Modal title={`Heroes' Lodge — ${town.name}`} onClose={onClose} width="44rem" testId="tavern">
      {!state.scenario.heroHiringEnabled ? <p className="note">{state.scenario.heroHiringDisabledReason ?? 'Hero hiring is not available in this scenario.'}</p> : null}
      {candidates.length === 0 ? <p className="dim">No heroes are available for hire.</p> : null}
      <div className="hire-list">
        {candidates.map(({ definitionId: id, returningHeroId }) => {
          const def = catalog.heroes[id]!;
          const returning = returningHeroId ? state.heroes[returningHeroId] : undefined;
          const q = quoteHireHero(catalog, state, playerId, town.id, id);
          const cls = catalog.heroClasses[def.classId];
          return (
            <div key={returningHeroId ?? id} className="hire-card panel" data-testid={`hire-${id}`}>
              <HeroPortrait catalog={catalog} definitionId={id} size="5rem" />
              <div>
                <div className="hire-card__name">
                  {def.name} <span className="dim">· {def.title}</span> {returning ? <Chip tone="info">Returning · level {returning.level}</Chip> : null}
                </div>
                <div className="small">{cls?.name} — {cls?.summary}</div>
                <SpecialtyLine catalog={catalog} definitionId={id} active={specialtiesEnabled(state)} />
                <p className="faint small">{def.biography}</p>
                <div className="row gap">
                  <CostList cost={q.cost} wallet={state.players[playerId]!.wallet} />
                  <Button
                    variant="primary"
                    size="small"
                    disabled={!q.legal}
                    disabledReason={q.reason}
                    onClick={() =>
                      store.confirm(
                        `Hire ${def.name}?`,
                        returning
                          ? `${def.name} returns with ${returning.army.slots.some((x) => x && x.count > 0) ? 'the troops that survived the surrender' : `one of the ${escortName}`} and no movement left today.`
                          : `${def.name} joins with ${HIRE_STARTING_TROOPS} ${escortName} and full movement.`,
                        'Hire',
                        () => {
                        if (!store.dispatch({ kind: 'HireHero', townId: town.id, heroDefinitionId: id })) {
                          store.toast(`${def.name} has joined you`, 'success');
                          onClose();
                        }
                      },
                      )
                    }
                  >
                    Hire
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Modal>
  );
}

/** Temple offering (a signature rite): choose creatures from the garrison or the visiting hero. */
function OfferingModal({ town, onClose }: { town: TownState; onClose: () => void }) {
  const store = useStore();
  const catalog = store.catalog;
  const state = store.session!.state;
  const playerId = store.session!.humanPlayerId;
  const visitor = heroesInTown(state, town).find((h) => h.ownerId === playerId);
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
    <Modal title={`Offering — ${town.name}`} onClose={onClose} width="40rem" testId="offering">
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
      <div className="modal__actions">
        <Button onClick={onClose}>Close</Button>
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
      </div>
    </Modal>
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
  const visitor = heroesInTown(state, town).find((h) => h.ownerId === playerId);
  const stock = town.merchant?.week === worldWeek(state, catalog.rulesProfile.daysPerWeek) ? town.merchant.stock : [];
  return (
    <Modal title={`Artifact Merchant — ${town.name}`} onClose={onClose} width="42rem" testId="merchant">
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
                      <CostList cost={q?.cost ?? resources(art.merchantPrice ?? {})} wallet={state.players[playerId]!.wallet} />
                      <Button
                        variant="primary"
                        size="small"
                        disabled={!q?.legal}
                        disabledReason={q?.reason ?? 'A hero must be in the town'}
                        onClick={() => {
                          if (visitor && !store.dispatch({ kind: 'BuyArtifact', townId: town.id, heroId: visitor.id, index })) store.toast(`${visitor.name} bought ${art.name}`, 'success');
                        }}
                        data-testid={`merchant-buy-${index}`}
                      >
                        Buy
                      </Button>
                    </div>
                  </>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
      <div className="modal__actions">
        <Button onClick={onClose}>Close</Button>
      </div>
    </Modal>
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
  const [selected, setSelected] = useState<string | null>((store.screen.params.slot as string | undefined) ?? null);
  const [modal, setModal] = useState<'market' | 'tavern' | 'offering' | 'merchant' | null>(null);
  const archetype = town ? catalog.townArchetypes[town.archetypeId] : undefined;
  const slots = useMemo(() => [...(archetype?.slots ?? [])].sort((a, b) => a.placement.layer - b.placement.layer || a.placement.y - b.placement.y), [archetype]);
  if (!town || !archetype) {
    return (
      <div className="screen">
        <ScreenHeader title="Town" />
        <p className="pad dim">You do not own a town.</p>
      </div>
    );
  }
  const bg = resolveAsset(archetype.backgroundAssetId);
  const mine = town.ownerId === player.id;
  const visiting = heroesInTown(state, town).filter((h) => h.ownerId === player.id);
  const slot = selected ? archetype.slots.find((s) => s.id === selected) : undefined;
  const level = slot ? (town.buildings[slot.id] ?? 0) : 0;
  const current = slot ? activeBuildingInSlot(catalog, town, slot.id) : null;
  const nextId = slot ? slot.chain[level] : undefined;
  const next = nextId ? catalog.buildings[nextId] : undefined;
  const quote = next ? quoteConstruction(catalog, state, player.id, town.id, next.id) : null;
  const income = townDailyIncome(catalog, town);
  const growth = townGrowthMultiplier(catalog, town);
  const usedToday = town.buildUsedDay === state.day;
  const setSlot = (id: string) => {
    setSelected(id);
    store.setParams({ slot: id });
  };
  const build = () => {
    if (!next || !quote?.legal) return;
    store.confirm(`Build ${next.name}?`, next.summary, 'Build', () => {
      if (!store.dispatch({ kind: 'BuildStructure', townId: town.id, buildingId: next.id })) store.toast(`${next.name} built`, 'success');
    }, { detail: [`Cost: ${RESOURCE_KEYS.filter((k) => quote.cost[k] > 0).map((k) => `${quote.cost[k]} ${RESOURCE_LABELS[k]}`).join(', ') || 'free'}`, 'Only one building per town per day.'] });
  };
  const family = slot ? familyForSlot(catalog, slot) : null;
  const spellbookHero = visiting.find((h) => !h.spellbook);
  const offering = quoteOffering(catalog, state, player.id, town.id, []);
  const training = townTraining(catalog, town);
  const sbQuote = spellbookHero ? quoteSpellbook(catalog, state, spellbookHero.id, town.id) : null;

  return (
    <div className="screen town-screen">
      <ScreenHeader
        title={town.name}
        subtitle={`${catalog.pantheons[town.pantheonId]?.name} town · ${usedToday ? 'Built today — next build tomorrow' : 'One building can be built today'}`}
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
      <div className="town-layout">
        <div className="town-stage">
          <div className="town-scene" style={bg.url ? { backgroundImage: `url(${bg.url})` } : undefined} data-testid="town-scene">
            {slots.map((s) => {
              const art = slotArtId(catalog, town, s);
              const lvl = town.buildings[s.id] ?? 0;
              const nb = catalog.buildings[s.chain[lvl] ?? ''];
              const q = nb ? quoteConstruction(catalog, state, player.id, town.id, nb.id) : null;
              const planned = catalog.buildings[s.chain[0] ?? '']?.implementationStatus === 'planned';
              const p = s.placement;
              // Empty plots are small UI markers: keep them above built art so every location stays clickable.
              const style = { left: `${p.x - p.width / 2}%`, bottom: `${100 - p.y}%`, width: `${p.width}%`, zIndex: art.built ? p.layer : 20 + p.layer };
              return (
                <button
                  key={s.id}
                  type="button"
                  className={`town-slot ${art.built ? 'is-built' : 'is-empty'} ${selected === s.id ? 'is-selected' : ''} ${planned ? 'is-planned' : ''}`}
                  style={style}
                  onClick={() => setSlot(s.id)}
                  aria-label={`${s.label}: ${art.built ? (activeBuildingInSlot(catalog, town, s.id)?.name ?? '') : planned ? 'planned' : 'empty'}`}
                  data-testid={`slot-${s.id}`}
                >
                  {art.built ? (
                    <BuildingArt artAssetId={art.id} alt={activeBuildingInSlot(catalog, town, s.id)?.name ?? s.label} className="town-slot__art" />
                  ) : (
                    <span className="town-slot__plot">
                      <span className="town-slot__plot-mark">{planned ? <Icon name="lock" /> : q?.legal ? <span className="plus">+</span> : <Icon name="hourglass" />}</span>
                    </span>
                  )}
                  <span className="town-slot__label">
                    {art.built ? activeBuildingInSlot(catalog, town, s.id)?.name : s.label}
                    {q?.legal ? <span className="town-slot__can" title="Can build now"> ●</span> : null}
                  </span>
                </button>
              );
            })}
            <span className="placeholder-tag town-scene__tag">Placeholder town art · owner concept reference</span>
          </div>
        </div>

        <aside className="town-side">
          <Panel title={slot ? slot.label : 'Select a location'} className="town-detail" bodyClassName="scroll">
            {!slot ? (
              <p className="dim">Click any of the 18 locations in the town to see what is built there and what can be built next.</p>
            ) : (
              <>
                {current ? (
                  <div className="bld-current">
                    <BuildingArt artAssetId={current.artAssetId} alt={current.name} className="bld-current__art" />
                    <div>
                      <div className="bld-name">{current.name}</div>
                      <div className="small">{current.summary}</div>
                      <div className="faint small">
                        Level {level} of {slot.chain.length}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="dim small">Nothing built here yet.</p>
                )}
                {next && quote ? (
                  <div className="bld-next">
                    <SectionTitle>{current ? 'Next level' : 'Can be built here'}</SectionTitle>
                    <div className="bld-name">
                      {next.name} <StatusChip status={next.implementationStatus} />
                    </div>
                    <p className="small">{next.summary}</p>
                    {next.implementationStatus !== 'planned' ? (
                      <>
                        <div className="row gap">
                          <span className="small">Cost</span> <CostList cost={quote.cost} wallet={player.wallet} />
                        </div>
                        <div style={{ margin: '0.5rem 0' }}>
                          <Chip tone={STATE_LABEL[quote.state]?.tone}>{STATE_LABEL[quote.state]?.text}</Chip>
                        </div>
                        {quote.missing.length ? (
                          <ul className="bullets small danger-list">
                            {quote.missing.map((m) => (
                              <li key={m}>{m}</li>
                            ))}
                          </ul>
                        ) : quote.reason && !quote.legal ? (
                          <p className="small warn">{quote.reason}</p>
                        ) : null}
                        <Button variant="primary" block disabled={!quote.legal || !mine} disabledReason={quote.reason} onClick={build} data-testid="build">
                          Build {next.name}
                        </Button>
                      </>
                    ) : (
                      <p className="note small">This location exists in the town layout, but its mechanics are not designed yet, so it cannot be built.</p>
                    )}
                  </div>
                ) : slot && level >= slot.chain.length ? (
                  <p className="success small">Fully built.</p>
                ) : null}
                {family ? (
                  <div className="bld-services">
                    <SectionTitle>Creatures</SectionTitle>
                    <div className="small">
                      {catalog.families[family]?.name} pool: <strong className="num">{town.population[family] ?? 0}</strong> available · +{weeklyGrowthFor(catalog, town, family, state)} per week
                    </div>
                    <Button icon="hero" onClick={() => store.goto('recruitment', { townId: town.id, familyId: family })} disabled={!current} disabledReason="Build the dwelling first">
                      Recruit
                    </Button>
                  </div>
                ) : null}
                {slot.role === 'marketplace' && current ? (
                  <Button icon="gold" onClick={() => setModal('market')}>
                    Trade resources
                  </Button>
                ) : null}
                {slot.role === 'tavern' && current ? (
                  <Button icon="hero" onClick={() => setModal('tavern')}>
                    Hire heroes
                  </Button>
                ) : null}
                {slot.role === 'pantheon_temple' ? (
                  <div className="row gap wrap">
                    <Button icon="pantheon" onClick={() => store.goto('pantheon', { townId: town.id })}>
                      Pantheon &amp; gods
                    </Button>
                    {offering.available && current ? (
                      <Button icon="favor" onClick={() => setModal('offering')} disabled={offering.code === 'already_done'} disabledReason={offering.reason} data-testid="offering-open">
                        Make an offering
                      </Button>
                    ) : null}
                  </div>
                ) : null}
                {slot.role === 'training_academy' && current && training ? (
                  <div className="bld-services">
                    <SectionTitle>Training</SectionTitle>
                    <div className="small">Once per week per hero: {training.gold} Gold for {training.xp} experience.</div>
                    {visiting.length === 0 ? <div className="faint small">No hero is visiting.</div> : null}
                    {visiting.map((h) => {
                      const tq = quoteTraining(catalog, state, player.id, town.id, h.id);
                      return (
                        <Button key={h.id} disabled={!tq.legal} disabledReason={tq.reason} onClick={() => { if (!store.dispatch({ kind: 'TrainHero', townId: town.id, heroId: h.id })) store.toast(`${h.name} trained (+${tq.xp} XP)`, 'success'); }} data-testid={`train-${h.id}`}>
                          Train {h.name} ({tq.cost.gold} Gold)
                        </Button>
                      );
                    })}
                  </div>
                ) : null}
                {slot.role === 'watchtower' ? <div className="small">Town vision: {townVisionRadius(catalog, town)} hexes.</div> : null}
                {slot.role === 'artifact_merchant' && current ? (
                  <Button icon="gold" onClick={() => setModal('merchant')} data-testid="merchant-open">
                    Browse artifacts ({town.merchant?.stock.filter(Boolean).length ?? 0} for sale)
                  </Button>
                ) : null}
                {slot.role === 'mage_guild' && current ? (
                  <div className="bld-services">
                    <SectionTitle>Sanctum</SectionTitle>
                    <div className="small">Spell library: tier {townSpellLibraryTier(catalog, town)}. Visiting heroes with a spellbook learn eligible spells here.</div>
                    {spellbookHero && sbQuote ? (
                      <Button disabled={!sbQuote.legal} disabledReason={sbQuote.reason} onClick={() => store.dispatch({ kind: 'BuySpellbook', heroId: spellbookHero.id, townId: town.id })}>
                        Buy spellbook for {spellbookHero.name} ({sbQuote.cost.gold} Gold)
                      </Button>
                    ) : visiting.length ? (
                      <div className="faint small">Visiting heroes already carry spellbooks.</div>
                    ) : (
                      <div className="faint small">No hero is visiting.</div>
                    )}
                  </div>
                ) : null}
                {slot.role === 'fortifications' ? <div className="small">Weekly growth multiplier: ×{growth.numerator / growth.denominator}. The fortifications defend the town in a siege.</div> : null}
              </>
            )}
          </Panel>
          <Panel title="Town economy" className="town-economy">
            <div className="row gap wrap small">
              <span>Income per day:</span> <CostList cost={income} empty="none" />
            </div>
            <div className="small">
              Growth multiplier ×{growth.numerator / growth.denominator} · Covenants: {town.covenants.length ? town.covenants.map((f) => catalog.families[f]?.name).join(', ') : 'none'}
            </div>
            <div className="row gap wrap" style={{ marginTop: '0.5rem' }}>
              <Button icon="hero" onClick={() => store.goto('recruitment', { townId: town.id })}>
                Recruit
              </Button>
              <Button icon="gold" onClick={() => setModal('market')} disabled={!townHasEffect(catalog, town, 'enables_market')} disabledReason="Requires a Marketplace">
                Market
              </Button>
              <Button icon="hero" onClick={() => setModal('tavern')} disabled={!townHasEffect(catalog, town, 'enables_hero_hiring')} disabledReason="Requires a Tavern">
                Tavern
              </Button>
              <Button icon="pantheon" onClick={() => store.goto('pantheon', { townId: town.id })}>
                Gods
              </Button>
              {townMerchantStockSize(catalog, town) > 0 ? (
                <Button icon="gold" onClick={() => setModal('merchant')}>
                  Merchant
                </Button>
              ) : null}
            </div>
          </Panel>
        </aside>
      </div>
      <footer className="town-armies panel">
        <div className="town-army">
          <div className="section-title">Garrison</div>
          <ArmyStrip catalog={catalog} army={town.garrison} label={`${town.name} garrison`} onInfo={(id) => store.openOverlay({ kind: 'stack-info', creatureId: id })} />
        </div>
        <div className="town-army">
          <div className="section-title">{visiting[0] ? `Visiting: ${visiting[0].name}` : 'No visiting hero'}</div>
          {visiting[0] ? <ArmyStrip catalog={catalog} army={visiting[0].army} label={`${visiting[0].name}'s army`} onInfo={(id) => store.openOverlay({ kind: 'stack-info', creatureId: id })} /> : <div className="army army--empty dim small">Move a hero into the town to exchange troops.</div>}
        </div>
        <Button icon="swap" disabled={!visiting[0]} disabledReason="A hero must be in the town" onClick={() => visiting[0] && store.openOverlay({ kind: 'transfer', townId: town.id, heroId: visiting[0].id })} data-testid="exchange">
          Exchange troops
        </Button>
      </footer>
      {modal === 'market' ? <MarketModal town={town} onClose={() => setModal(null)} /> : null}
      {modal === 'tavern' ? <TavernModal town={town} onClose={() => setModal(null)} /> : null}
      {modal === 'offering' ? <OfferingModal town={town} onClose={() => setModal(null)} /> : null}
      {modal === 'merchant' ? <MerchantModal town={town} onClose={() => setModal(null)} /> : null}
    </div>
  );
}
