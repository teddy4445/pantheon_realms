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
import { useEffect, useMemo, useRef, useState, type DragEvent } from 'react';
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
  divineGifts,
  giftNeedsHero,
  quoteDivineGift,
  quoteTraining,
  quoteArtifactPurchase,
  townTraining,
  townVisionRadius,
  townMerchantStockSize,
  worldWeek,
  quoteTransfer,
  type ArmyRef,
  type ArmyState,
  type HeroState,
  type OfferingLine,
  type BuildingSlotDefinition,
  type ResourceKey,
  type TownState,
} from '@pr/rules';
import { resources } from '@pr/rules';
import { useStore } from '../app/context';
import type { AppStore } from '../app/store';
import { Button, Chip, Modal, QuantitySelector } from '../components/kit';
import { ArtifactIcon, BuildingArt, Emblem, HeroPortrait, SpecialtyLine } from '../components/art';
import { ArmyStrip, CostList, ScreenHeader } from '../components/game';
import { resolveAsset } from '../assets/manifest';
import { Icon, type IconName } from '../assets/icons';
import { heroStory, heroesInTown, humanPlayer } from '../app/view';

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
                <p className="faint small">{heroStory(def.biography)}</p>
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
    <Modal title={`Divine gifts — ${town.name}`} onClose={onClose} width="46rem" testId="gifts">
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
                {needsHero && !visitors.length ? <div className="faint small">A hero must be visiting the town.</div> : null}
              </div>
              <Button variant="primary" icon="favor" disabled={!q.legal} disabledReason={q.reason} onClick={() => receive(g.id, needsHero)} data-testid={`gift-${g.id}-receive`}>
                {g.favorCost} Favor
              </Button>
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
  const [modal, setModal] = useState<'market' | 'tavern' | 'offering' | 'merchant' | 'gifts' | null>(null);
  const archetype = town ? catalog.townArchetypes[town.archetypeId] : undefined;
  const slots = useMemo(() => [...(archetype?.slots ?? [])].sort((a, b) => a.placement.layer - b.placement.layer || a.placement.y - b.placement.y), [archetype]);
  // Esc closes the building pop-up before it leaves the town.
  const selectedRef = useRef(selected);
  selectedRef.current = selected;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || !selectedRef.current || store.overlays.length || store.story.length) return;
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
  const bg = resolveAsset(archetype.backgroundAssetId);
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
  const setSlot = (id: string | null) => setSelected(id);
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
  const anchor = archetype.hudAnchor ?? 'center';
  const covenants = town.covenants.map((f) => catalog.families[f]?.name ?? f);
  const hasMarket = townHasEffect(catalog, town, 'enables_market');
  const hasTavern = townHasEffect(catalog, town, 'enables_hero_hiring');

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
    <div className="screen town-screen">
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
                onClick={() => setSlot(selected === s.id ? null : s.id)}
                aria-label={`${s.label}: ${art.built ? (activeBuildingInSlot(catalog, town, s.id)?.name ?? '') : planned ? 'planned' : 'empty'}`}
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
                <span className="town-slot__label">
                  {art.built ? activeBuildingInSlot(catalog, town, s.id)?.name : s.label}
                  {q?.legal ? <span className="town-slot__can" title="Can build now"> ●</span> : null}
                </span>
              </button>
            );
          })}

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
              <IconAction icon="market" label="Market" onClick={() => setModal('market')} disabled={!hasMarket} reason="Requires a Marketplace" testId="town-market" />
              <IconAction icon="tavern" label="Tavern" onClick={() => setModal('tavern')} disabled={!hasTavern} reason="Requires a Tavern" testId="town-tavern" />
              <IconAction icon="pantheon" label="Pantheon & gods" onClick={() => store.goto('pantheon', { townId: town.id })} testId="town-gods" />
              {townMerchantStockSize(catalog, town) > 0 ? <IconAction icon="merchant" label="Artifact Merchant" onClick={() => setModal('merchant')} testId="town-merchant" /> : null}
            </div>
          </div>

          {slot && popStyle ? (
            <div className="bld-pop panel" style={popStyle} role="dialog" aria-label={slot.label} data-testid="building-popup" onClick={(e) => e.stopPropagation()}>
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
                      {Array.from({ length: slot.chain.length }, (_, i) => (
                        <span key={i} className={`bld-pop__pip ${i < level ? 'is-on' : ''}`} />
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="bld-pop__text dim">Nothing built here yet.</p>
                )}
                {next && quote ? (
                  <div className="bld-pop__next">
                    <div className="bld-pop__sub">
                      <Icon name={current ? 'upgrade' : 'build'} className="inline-icon" /> {next.name}
                    </div>
                    <p className="bld-pop__text">{next.summary}</p>
                    {next.implementationStatus !== 'planned' ? (
                      <>
                        <CostList cost={quote.cost} wallet={player.wallet} />
                        {quote.missing.length ? (
                          <ul className="bullets small danger-list">
                            {quote.missing.map((m) => (
                              <li key={m}>{m}</li>
                            ))}
                          </ul>
                        ) : quote.reason && !quote.legal ? (
                          <p className="small warn">{quote.reason}</p>
                        ) : null}
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
                  </div>
                ) : null}
                {slot.role === 'training_academy' && current && training ? <div className="bld-pop__line">Once per week per hero: {training.gold} Gold for {training.xp} experience.</div> : null}
                {slot.role === 'watchtower' ? <div className="bld-pop__line">Town vision: {townVisionRadius(catalog, town)} hexes.</div> : null}
                {slot.role === 'mage_guild' && current ? <div className="bld-pop__line">Spell library: tier {townSpellLibraryTier(catalog, town)}. Visiting heroes with a spellbook learn its spells.</div> : null}
                {slot.role === 'fortifications' ? <div className="bld-pop__line">Weekly growth ×{growth.numerator / growth.denominator}. The fortifications defend the town in a siege.</div> : null}
              </div>
              <div className="bld-pop__actions">
                {next && quote && next.implementationStatus !== 'planned' ? (
                  <IconAction icon="build" primary label={`Build ${next.name}`} onClick={build} disabled={!quote.legal || !mine} reason={quote.reason} testId="build" />
                ) : null}
                {family ? <IconAction icon="recruit" label="Recruit" onClick={() => store.goto('recruitment', { townId: town.id, familyId: family })} disabled={!current} reason="Build the dwelling first" testId="popup-recruit" /> : null}
                {slot.role === 'marketplace' && current ? <IconAction icon="market" label="Trade resources" onClick={() => setModal('market')} /> : null}
                {slot.role === 'tavern' && current ? <IconAction icon="tavern" label="Hire heroes" onClick={() => setModal('tavern')} /> : null}
                {slot.role === 'pantheon_temple' ? (
                  <>
                    <IconAction icon="pantheon" label="Pantheon & gods" onClick={() => store.goto('pantheon', { townId: town.id })} />
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
                {slot.role === 'artifact_merchant' && current ? <IconAction icon="merchant" label={`Browse artifacts (${town.merchant?.stock.filter(Boolean).length ?? 0} for sale)`} onClick={() => setModal('merchant')} testId="merchant-open" /> : null}
                {slot.role === 'mage_guild' && current && spellbookHero && sbQuote ? (
                  <IconAction icon="spell" label={`Buy a spellbook for ${spellbookHero.name} (${sbQuote.cost.gold} Gold)`} disabled={!sbQuote.legal} reason={sbQuote.reason} onClick={() => store.dispatch({ kind: 'BuySpellbook', heroId: spellbookHero.id, townId: town.id })} testId="buy-spellbook" />
                ) : null}
              </div>
            </div>
          ) : null}
          <span className="placeholder-tag town-scene__tag">Placeholder town art · owner concept reference</span>
        </div>
      </div>
      <TownArmies town={town} visitor={visiting[0] ?? null} />
      {modal === 'market' ? <MarketModal town={town} onClose={() => setModal(null)} /> : null}
      {modal === 'tavern' ? <TavernModal town={town} onClose={() => setModal(null)} /> : null}
      {modal === 'offering' ? <OfferingModal town={town} onClose={() => setModal(null)} /> : null}
      {modal === 'merchant' ? <MerchantModal town={town} onClose={() => setModal(null)} /> : null}
      {modal === 'gifts' ? <GiftsModal town={town} onClose={() => setModal(null)} /> : null}
    </div>
  );
}
