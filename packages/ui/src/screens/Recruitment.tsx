/**
 * S09 Recruitment. Seven tiers, each one family with a base and an upgraded
 * form sharing one weekly population pool. Quantities, costs, destination
 * capacity and every disabled reason come from quoteRecruitment/quoteUpgrade.
 */
import { useState } from 'react';
import {
  abilityRules,
  quoteRecruitment,
  quoteUpgrade,
  recruitableCreatureIds,
  weeklyGrowthFor,
  type ArmyRef,
  type RecruitDestination,
} from '@pr/rules';
import { useStore } from '../app/context';
import { Button, Chip, Panel, QuantitySelector, SectionTitle } from '../components/kit';
import { CreaturePortrait } from '../components/art';
import { CostList, CreatureStats, ScreenHeader } from '../components/game';
import { heroesInTown, humanPlayer } from '../app/view';

export function RecruitmentScreen() {
  const store = useStore();
  const catalog = store.catalog;
  const state = store.session!.state;
  const player = humanPlayer(state);
  const townId = (store.screen.params.townId as string | undefined) ?? Object.values(state.towns).find((t) => t.ownerId === player.id)?.id;
  const town = townId ? state.towns[townId] : undefined;
  const archetype = town ? catalog.townArchetypes[town.archetypeId] : undefined;
  const dwellings = (archetype?.slots ?? []).filter((s) => s.kind === 'dwelling').sort((a, b) => (a.tier ?? 0) - (b.tier ?? 0));
  const recruitable = town ? recruitableCreatureIds(catalog, town) : [];
  const initialFamily = store.screen.params.familyId as string | undefined;
  const firstId = (() => {
    if (initialFamily) {
      const fam = catalog.families[initialFamily];
      if (fam) return recruitable.includes(fam.upgradedCreatureId) ? fam.upgradedCreatureId : fam.baseCreatureId;
    }
    return recruitable[0] ?? null;
  })();
  const [creatureId, setCreatureId] = useState<string | null>((store.screen.params.creatureId as string | undefined) ?? firstId);
  const visiting = town ? heroesInTown(state, town).filter((h) => h.ownerId === player.id) : [];
  const [dest, setDest] = useState<RecruitDestination>(visiting[0] ? { kind: 'hero', heroId: visiting[0].id } : { kind: 'garrison' });
  const [qty, setQty] = useState(1);
  if (!town || !archetype) {
    return (
      <div className="screen">
        <ScreenHeader title="Recruitment" />
        <p className="pad dim">No town.</p>
      </div>
    );
  }
  const def = creatureId ? catalog.creatures[creatureId] : undefined;
  const probe = def ? quoteRecruitment(catalog, state, player.id, town.id, def.id, 1, dest) : null;
  const max = probe ? probe.maxQuantity : 0;
  const q = Math.min(Math.max(1, qty), Math.max(1, max));
  const quote = def ? quoteRecruitment(catalog, state, player.id, town.id, def.id, q, dest) : null;
  const pick = (id: string) => {
    setCreatureId(id);
    setQty(1);
    store.setParams({ creatureId: id });
  };
  const recruit = () => {
    if (!def || !quote?.legal) return;
    const go = () => {
      if (!store.dispatch({ kind: 'RecruitUnits', townId: town.id, creatureId: def.id, quantity: q, destination: dest })) {
        store.toast(`Recruited ${q} ${q === 1 ? def.name : def.pluralName} → ${quote.destinationLabel}`, 'success');
        setQty(1);
      }
    };
    if (store.prefs.confirmLargePurchases && quote.totalCost.gold >= store.prefs.largePurchaseThreshold) {
      store.confirm(`Recruit ${q} ${def.pluralName}?`, `They will join ${quote.destinationLabel}.`, 'Recruit', go, { detail: [`Total: ${quote.totalCost.gold} Gold`] });
    } else go();
  };
  // Upgrade candidates in this town (garrison + visiting heroes).
  const armies: { ref: ArmyRef; label: string; slots: typeof town.garrison.slots }[] = [
    { ref: { kind: 'garrison', townId: town.id }, label: `${town.name} garrison`, slots: town.garrison.slots },
    ...visiting.map((h) => ({ ref: { kind: 'hero', heroId: h.id } as ArmyRef, label: h.name, slots: h.army.slots })),
  ];
  const upgradeRows = armies.flatMap((a) =>
    a.slots
      .map((s, i) => ({ s, i }))
      .filter(({ s }) => s && catalog.creatures[s.creatureId]?.upgradeId)
      .map(({ s, i }) => ({ army: a, slot: i, stack: s! })),
  );
  return (
    <div className="screen recruit-screen">
      <ScreenHeader title={`Recruit — ${town.name}`} subtitle="Base and upgraded forms of a family share one weekly pool" />
      <div className="recruit-layout">
        <Panel title="Dwellings" className="recruit-tiers" bodyClassName="scroll">
          {dwellings.map((slot) => {
            const famId = catalog.buildings[slot.chain[0] ?? '']?.dwelling?.familyId;
            const fam = famId ? catalog.families[famId] : undefined;
            if (!fam) return null;
            const level = town.buildings[slot.id] ?? 0;
            const pool = town.population[fam.id] ?? 0;
            return (
              <div key={slot.id} className={`tier-row ${level === 0 ? 'is-locked' : ''}`}>
                <div className="tier-row__head">
                  <span className="tier-badge">T{slot.tier}</span>
                  <span className="tier-row__name">{fam.name}</span>
                  <span className="tier-row__pool" title="Shared population available this week">
                    <strong className="num">{pool}</strong> available · +{weeklyGrowthFor(catalog, town, fam.id, state)}/week
                  </span>
                </div>
                <div className="tier-row__forms">
                  {[fam.baseCreatureId, fam.upgradedCreatureId].map((cid) => {
                    const c = catalog.creatures[cid]!;
                    const can = recruitable.includes(cid);
                    const b = catalog.buildings[slot.chain[c.form === 'base' ? 0 : 1] ?? ''];
                    return (
                      <button key={cid} type="button" className={`form-card ${creatureId === cid ? 'is-selected' : ''} ${can ? '' : 'is-locked'}`} onClick={() => pick(cid)} data-testid={`recruit-${cid}`}>
                        <CreaturePortrait catalog={catalog} creatureId={cid} size="3.6rem" />
                        <span className="form-card__text">
                          <span className="form-card__name">{c.name}</span>
                          <span className="faint small">{c.form === 'upgraded' ? 'Upgraded' : 'Base'} · {c.roleLabel}</span>
                          {can ? <CostList cost={c.cost ?? {}} wallet={player.wallet} /> : <span className="small warn">Requires {b?.name ?? 'its dwelling'}</span>}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </Panel>

        <Panel title={def ? def.name : 'Choose a creature'} className="recruit-detail" bodyClassName="scroll">
          {def ? (
            <>
              <div className="recruit-detail__top">
                <CreaturePortrait catalog={catalog} creatureId={def.id} size="8rem" showPlaceholderTag />
                <div>
                  <div className="dim">{def.roleLabel}</div>
                  <CreatureStats def={def} />
                  <Button size="small" variant="ghost" icon="bestiary" onClick={() => store.goto('unit-detail', { creatureId: def.id })}>
                    Bestiary entry
                  </Button>
                </div>
              </div>
              {abilityRules(catalog, def.id).length || def.abilityIds.length ? (
                <div className="row gap wrap">
                  {def.abilityIds.map((a) => (
                    <Chip key={a} tone="info" title={catalog.abilities[a]?.exactRule}>
                      {catalog.abilities[a]?.name}
                    </Chip>
                  ))}
                </div>
              ) : null}
              <SectionTitle>Recruit</SectionTitle>
              <div className="field">
                <span className="field__label">Destination</span>
                <select
                  className="select"
                  value={dest.kind === 'hero' ? dest.heroId : 'garrison'}
                  onChange={(e) => setDest(e.target.value === 'garrison' ? { kind: 'garrison' } : { kind: 'hero', heroId: e.target.value })}
                  aria-label="Destination army"
                >
                  <option value="garrison">{town.name} garrison</option>
                  {visiting.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name} (visiting)
                    </option>
                  ))}
                </select>
              </div>
              <QuantitySelector label="Quantity" value={q} min={1} max={Math.max(1, max)} onChange={setQty} />
              <div className="recruit-summary">
                <div className="row between">
                  <span>Unit cost</span> <CostList cost={quote?.unitCost ?? {}} />
                </div>
                <div className="row between">
                  <span>Total</span> <CostList cost={quote?.totalCost ?? {}} wallet={player.wallet} />
                </div>
                <div className="row between faint small">
                  <span>Available this week</span> <span className="num">{quote?.available ?? 0}</span>
                </div>
                <div className="row between faint small">
                  <span>Placement</span> <span>{quote?.destinationSlot !== null && quote?.destinationSlot !== undefined ? `${quote.destinationLabel}, slot ${quote.destinationSlot + 1}` : '—'}</span>
                </div>
              </div>
              {quote && !quote.legal ? <p className="warn small">{quote.reason}</p> : null}
              <Button variant="primary" size="large" block disabled={!quote?.legal || max < 1} disabledReason={quote?.reason ?? (max < 1 ? 'None available or not affordable' : null)} onClick={recruit} data-testid="recruit-confirm">
                Recruit {q} {q === 1 ? def.name : def.pluralName}
              </Button>
            </>
          ) : (
            <p className="dim">Build a dwelling to recruit creatures.</p>
          )}
        </Panel>

        <Panel title="Train (upgrade) troops" className="recruit-upgrades" bodyClassName="scroll">
          <p className="dim small">Training pays the price difference and uses no population. It requires the upgraded dwelling in this town.</p>
          {upgradeRows.length === 0 ? <p className="dim small">No base-form stacks here to train.</p> : null}
          {upgradeRows.map((row) => (
            <UpgradeRow key={`${row.army.label}-${row.slot}`} townId={town.id} armyRef={row.army.ref} armyLabel={row.army.label} slot={row.slot} />
          ))}
        </Panel>
      </div>
    </div>
  );
}

function UpgradeRow({ townId, armyRef, armyLabel, slot }: { townId: string; armyRef: ArmyRef; armyLabel: string; slot: number }) {
  const store = useStore();
  const catalog = store.catalog;
  const state = store.session!.state;
  const playerId = store.session!.humanPlayerId;
  const probe = quoteUpgrade(catalog, state, playerId, townId, armyRef, slot, 1);
  const [qty, setQty] = useState(1);
  const stackCount = (armyRef.kind === 'hero' ? state.heroes[armyRef.heroId]?.army : state.towns[armyRef.townId]?.garrison)?.slots[slot]?.count ?? 0;
  const max = Math.max(1, probe.maxQuantity);
  const q = Math.min(qty, max);
  const quote = quoteUpgrade(catalog, state, playerId, townId, armyRef, slot, q);
  const from = probe.fromId ? catalog.creatures[probe.fromId] : undefined;
  const to = probe.toId ? catalog.creatures[probe.toId] : undefined;
  if (!from || !to) return null;
  return (
    <div className="upgrade-row">
      <div className="row gap">
        <CreaturePortrait catalog={catalog} creatureId={from.id} size="2.6rem" count={stackCount} />
        <span>→</span>
        <CreaturePortrait catalog={catalog} creatureId={to.id} size="2.6rem" />
        <div>
          <div className="small">
            {from.pluralName} → {to.pluralName}
          </div>
          <div className="faint small">{armyLabel}</div>
        </div>
      </div>
      <QuantitySelector label={`Train ${from.pluralName}`} value={q} min={1} max={max} onChange={setQty} />
      <div className="row between">
        <CostList cost={quote.totalCost} wallet={state.players[playerId]?.wallet} />
        <Button
          variant="primary"
          size="small"
          disabled={!quote.legal}
          disabledReason={quote.reason}
          onClick={() => {
            if (!store.dispatch({ kind: 'UpgradeStack', townId, army: armyRef, slot, quantity: q })) store.toast(`Trained ${q} ${to.pluralName}`, 'success');
          }}
          data-testid={`train-${from.id}`}
        >
          Train {q}
        </Button>
      </div>
      {!quote.legal ? <div className="warn small">{quote.reason}</div> : null}
    </div>
  );
}
