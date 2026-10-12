/**
 * S09 Recruitment. Seven tiers, each one family with a base and an upgraded
 * form sharing one weekly population pool. Quantities, costs, destination
 * capacity and every disabled reason come from quoteRecruitment/quoteUpgrade.
 */
import { useEffect, useState } from 'react';
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
import { Button, QuantitySelector } from '../components/kit';
import { CreaturePortrait, HeroPortrait } from '../components/art';
import { ArmyStrip, CostList, CreatureStats, ScreenHeader } from '../components/game';
import { heroesInTown, humanPlayer } from '../app/view';
import { Icon } from '../assets/icons';
import { guiThemeFor } from '../assets/guiArt';
import { LockGlyph } from '../components/gui';
import { AdventureStage, CreatureStage, adventureScene } from '../components/adventure';

function TrainingHint() {
  const store = useStore();
  useEffect(() => store.showHint('troop_training'), [store]);
  return null;
}

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
  const visiting = town ? heroesInTown(catalog, state, town).filter((h) => h.ownerId === player.id) : [];
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
  // Recruiting and upgrading never ask for approval (owner request 2026-10-03).
  const recruit = () => {
    if (!def || !quote?.legal) return;
    if (!store.dispatch({ kind: 'RecruitUnits', townId: town.id, creatureId: def.id, quantity: q, destination: dest })) {
      store.toast(`Recruited ${q} ${q === 1 ? def.name : def.pluralName} → ${quote.destinationLabel}`, 'success');
      setQty(1);
    }
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
  const destArmy = dest.kind === 'hero' ? state.heroes[dest.heroId]?.army : town.garrison;
  const destLabel = dest.kind === 'hero' ? (state.heroes[dest.heroId]?.name ?? '') : `${town.name} garrison`;
  // The seven dwellings in tier order, each with its family, built level and shared weekly pool.
  const tiers = dwellings
    .map((slot) => {
      const famId = catalog.buildings[slot.chain[0] ?? '']?.dwelling?.familyId;
      const fam = famId ? catalog.families[famId] : undefined;
      return fam ? { slot, fam, level: town.buildings[slot.id] ?? 0, pool: town.population[fam.id] ?? 0 } : null;
    })
    .filter((t): t is NonNullable<typeof t> => !!t);
  const current = def ? tiers.find((t) => t.fam.id === def.familyId) : undefined;
  const pickTier = (t: (typeof tiers)[number]) => {
    const up = t.fam.upgradedCreatureId;
    pick(def && def.familyId === t.fam.id ? def.id : recruitable.includes(t.fam.baseCreatureId) || !recruitable.includes(up) ? t.fam.baseCreatureId : up);
  };
  const back = () => (store.stack.length > 1 ? store.back() : store.toAdventure());
  return (
    <AdventureStage
      mode="screen"
      theme={guiThemeFor(town.pantheonId)}
      scene={adventureScene('recruit', town.pantheonId)}
      title="Gather your forces"
      subtitle={`Recruit — ${town.name}`}
      pantheonId={town.pantheonId}
      catalog={catalog}
      testId="recruit-screen"
      className="ak-recruit-stage recruit-screen"
      footer={
        <Button onClick={back} data-testid="recruit-back">
          Back
        </Button>
      }
    >
      <div className="ak-recruit">
        <nav className="ak-recruit__tiers" aria-label="Dwellings">
          {tiers.map((t) => {
            const on = current?.fam.id === t.fam.id;
            return (
              <button
                key={t.slot.id}
                type="button"
                className={`ak-tier ${on ? 'is-selected' : ''} ${t.level === 0 ? 'is-locked' : ''}`}
                aria-pressed={on}
                onClick={() => pickTier(t)}
                title={t.level === 0 ? `${t.fam.name}: no dwelling` : `${t.fam.name}: ${t.pool} available, +${weeklyGrowthFor(catalog, town, t.fam.id, state)}/week`}
                data-testid={`recruit-tier-${t.slot.tier}`}
              >
                <CreaturePortrait catalog={catalog} creatureId={t.fam.baseCreatureId} size="3rem" />
                <span className="ak-tier__name">
                  Tier {t.slot.tier}
                  <span className="ak-tier__fam">{t.fam.name}</span>
                </span>
                <span className="ak-tier__pool">
                  {t.level === 0 ? (
                    <>
                      <LockGlyph /> No dwelling
                    </>
                  ) : (
                    <>
                      <strong className="num">{t.pool}</strong> available
                    </>
                  )}
                </span>
              </button>
            );
          })}
        </nav>

        <div className="ak-recruit__main">
          <section className="ak-recruit__show" aria-label="Recruitment stage">
            {current ? (
              <div className="ak-seg ak-recruit__forms" role="group" aria-label={`${current.fam.name}: form`}>
                {[current.fam.baseCreatureId, current.fam.upgradedCreatureId].map((cid) => {
                  const c = catalog.creatures[cid]!;
                  const can = recruitable.includes(cid);
                  return (
                    <button key={cid} type="button" className={`ak-seg__btn ${creatureId === cid ? 'is-selected' : ''} ${can ? '' : 'is-locked'}`} aria-pressed={creatureId === cid} onClick={() => pick(cid)} title={can ? c.name : `${c.name}: requires ${catalog.buildings[current.slot.chain[c.form === 'base' ? 0 : 1] ?? '']?.name ?? 'its dwelling'}`} data-testid={`recruit-${cid}`}>
                      {can ? null : <LockGlyph />}
                      {c.form === 'upgraded' ? 'Upgraded' : 'Base'}
                    </button>
                  );
                })}
              </div>
            ) : null}
            {def ? <CreatureStage creatureId={def.id} name={def.name} /> : <div className="recruit-stage" />}
            {def ? (
              <div className="ak-recruit__plate">
                <span className="ak-recruit__socket">
                  <CreaturePortrait catalog={catalog} creatureId={def.id} size="3.4rem" showPlaceholderTag />
                </span>
                <span>
                  <span className="ak-recruit__plate-name">{def.name}</span>
                  <span className="ak-recruit__plate-role">
                    {def.form === 'upgraded' ? 'Upgraded' : 'Base'} · {def.roleLabel}
                  </span>
                </span>
              </div>
            ) : null}
          </section>

          <section className="ak-pane ak-recruit__detail recruit-detail" aria-label={def ? `Recruit ${def.pluralName}` : 'Recruitment'}>
            {def ? (
              <>
                <h3 className="ak-pane__title title-with-icon">
                  <button type="button" className="icon-link" onClick={() => store.goto('unit-detail', { creatureId: def.id })} aria-label={`Bestiary entry: ${def.name}`} title="Bestiary entry" data-testid="recruit-bestiary">
                    <Icon name="bestiary" />
                  </button>
                  {def.name}
                </h3>
                <p className="ak-recruit__summary small">{def.summary}</p>
                <CreatureStats def={def} />
                {def.abilityIds.length || abilityRules(catalog, def.id).length ? (
                  <ul className="ak-recruit__abilities">
                    {def.abilityIds.map((a) => (
                      <li key={a}>
                        <strong>{catalog.abilities[a]?.name}</strong> <span className="ak-muted">{catalog.abilities[a]?.exactRule}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
                <div className="recruit-facts">
                  <span>
                    <Icon name="town" className="inline-icon" /> <strong className="num">{quote?.available ?? 0}</strong> available this week
                    {current && current.level > 0 ? <span className="ak-muted"> · +{weeklyGrowthFor(catalog, town, current.fam.id, state)}/week</span> : null}
                  </span>
                  <span>
                    <CostList cost={quote?.unitCost ?? {}} /> each
                  </span>
                </div>
                <div className="field">
                  <span className="field__label" id="recruit-dest-label">
                    Recruit into
                  </span>
                  <div className="recruit-dest" role="radiogroup" aria-labelledby="recruit-dest-label">
                    {visiting.map((h) => {
                      const on = dest.kind === 'hero' && dest.heroId === h.id;
                      return (
                        <button key={h.id} type="button" role="radio" aria-checked={on} className={`recruit-dest__opt ${on ? 'is-selected' : ''}`} onClick={() => setDest({ kind: 'hero', heroId: h.id })} data-testid={`recruit-dest-${h.id}`}>
                          <HeroPortrait catalog={catalog} definitionId={h.definitionId} name={h.name} size="2.4rem" />
                          <span>{h.name}’s army</span>
                        </button>
                      );
                    })}
                    <button type="button" role="radio" aria-checked={dest.kind === 'garrison'} className={`recruit-dest__opt ${dest.kind === 'garrison' ? 'is-selected' : ''}`} onClick={() => setDest({ kind: 'garrison' })} data-testid="recruit-dest-garrison">
                      <span className="recruit-dest__town">
                        <Icon name="town" />
                      </span>
                      <span>Garrison</span>
                    </button>
                  </div>
                </div>
                <QuantitySelector label="Quantity" value={q} min={1} max={Math.max(1, max)} onChange={setQty} />
                <div className="recruit-summary">
                  <div className="row between">
                    <span>Total</span> <span className="ak-big"><CostList cost={quote?.totalCost ?? {}} wallet={player.wallet} /></span>
                  </div>
                  <div className="row between ak-muted small">
                    <span>Placement</span> <span>{quote?.destinationSlot !== null && quote?.destinationSlot !== undefined ? `${quote.destinationLabel}, slot ${quote.destinationSlot + 1}` : '—'}</span>
                  </div>
                </div>
                {quote && !quote.legal ? (
                  <p className="warn small row gap" data-testid="recruit-reason">
                    <LockGlyph /> {quote.reason}
                  </p>
                ) : null}
                <Button variant="primary" size="large" block disabled={!quote?.legal || max < 1} disabledReason={quote?.reason ?? (max < 1 ? 'None available or not affordable' : null)} onClick={recruit} data-testid="recruit-confirm">
                  Recruit {q} {q === 1 ? def.name : def.pluralName}
                </Button>
              </>
            ) : (
              <p className="ak-muted">Build a dwelling to recruit creatures.</p>
            )}
          </section>
        </div>

        <div className="ak-recruit__bottom">
          {destArmy ? (
            <section className="ak-pane ak-recruit__army" aria-label={`${destLabel}: army after recruiting`}>
              <h3 className="ak-pane__title">{dest.kind === 'hero' ? `${destLabel}’s army` : destLabel}</h3>
              <ArmyStrip catalog={catalog} army={destArmy} label={`${destLabel} army`} selected={quote?.legal ? quote.destinationSlot : null} />
            </section>
          ) : null}
          <section className="ak-pane ak-recruit__upgrades" aria-label="Upgrade troops">
            <h3 className="ak-pane__title">Train existing troops</h3>
            <p className="ak-muted small">Upgrading pays the price difference and uses no population. It requires the upgraded dwelling in this town.</p>
            {upgradeRows.length === 0 ? <p className="ak-muted small">No base-form stacks here to upgrade.</p> : <TrainingHint />}
            <div className="ak-recruit__upgrade-list">
              {upgradeRows.map((row) => (
                <UpgradeRow key={`${row.army.label}-${row.slot}`} townId={town.id} armyRef={row.army.ref} armyLabel={row.army.label} slot={row.slot} />
              ))}
            </div>
          </section>
        </div>
      </div>
    </AdventureStage>
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
      <QuantitySelector label={`Upgrade ${from.pluralName}`} value={q} min={1} max={max} onChange={setQty} />
      <div className="row between">
        <CostList cost={quote.totalCost} wallet={state.players[playerId]?.wallet} />
        <Button
          variant="primary"
          size="small"
          disabled={!quote.legal}
          disabledReason={quote.reason}
          onClick={() => {
            if (!store.dispatch({ kind: 'UpgradeStack', townId, army: armyRef, slot, quantity: q })) store.toast(`Upgraded ${q} ${to.pluralName}`, 'success');
          }}
          data-testid={`train-${from.id}`}
        >
          Upgrade {q}
        </Button>
      </div>
      {!quote.legal ? <div className="warn small">{quote.reason}</div> : null}
    </div>
  );
}
