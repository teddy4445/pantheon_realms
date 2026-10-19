import { useState } from 'react';
import { heroEffects, heroInTown, libraryReportPlan, quoteAdventureSpell, seedTownOptions } from '@pr/rules';
import { useStore } from '../app/context';
import { Button, Modal } from './kit';

/** Inventory-driven travel aids and an explicit weekly growth destination. */
export function LibraryTravelNotes() {
  const store = useStore(), session = store.session!, { state } = session;
  const heroes = Object.values(state.heroes).filter((h) => h.ownerId === session.humanPlayerId && h.status === 'active');
  const chosen = state.players[session.humanPlayerId]?.libraryEconomy?.seedTown;
  const canAct = state.activePlayerId === session.humanPlayerId && !state.battle;
  const economy = state.players[session.humanPlayerId]?.libraryEconomy;
  return <>
    {economy?.parcel ? <article className="journal-entry"><h3>Courier parcel</h3><p>{store.catalog.artifacts[economy.parcel.artifact.artifactId]?.name} · {economy.parcel.status === 'in_transit' ? `Expected at dawn on day ${economy.parcel.arrivesDay}` : `Held at ${state.towns[economy.parcel.stashTownId ?? '']?.name ?? 'empire escrow'}`}</p>
      {economy.parcel.status === 'stash' && economy.parcel.stashTownId ? heroes.filter((h) => heroInTown(store.catalog, state, h, economy.parcel!.stashTownId!)).map((h) => <Button key={h.id} disabled={!canAct || h.backpack.length >= store.catalog.rulesProfile.backpackCapacity} onClick={() => store.dispatch({ kind: 'ClaimCourierParcel', heroId: h.id })}>Collect with {h.name}</Button>) : null}
    </article> : null}
    {economy?.courierHistory?.length ? <details><summary>Courier ledger</summary>{[...economy.courierHistory].reverse().map((h,i) => <p key={i}>Day {h.day}: {store.catalog.artifacts[h.artifactId]?.name} — {h.message}</p>)}</details> : null}
    {heroes.map((hero) => {
      const effects = heroEffects(store.catalog, hero, state);
      const coast = Math.max(0, ...effects.map((e) => e.type === 'adventure_coast_survey' ? e.radius : 0));
      const seed = effects.some((e) => e.type === 'adventure_seed_growth');
      const towns = seed ? seedTownOptions(store.catalog, state, hero.id) : [];
      const report = coast ? libraryReportPlan(store.catalog, state, hero, { type: 'adventure_report', kind: 'sounding', range: coast, days: 1 }, null) : null;
      return <div key={hero.id}>
        {seed ? <article className="journal-entry" data-testid="seed-ring-selection">
          <h3>Quetzal Seed Ring · {hero.name}</h3>
          <p>Choose one visited town for 2 extra tier-one recruits at the next week’s dawn. Keep the ring equipped and its dwelling intact. One gift per empire.</p>
          {chosen ? <p>Selected: {state.towns[chosen.townId]?.name} · {state.heroes[chosen.heroId]?.name}</p> : <p>No town selected.</p>}
          {!towns.length ? <p>Visit an owned town with a tier-one dwelling this week.</p> : towns.map((t) => <Button key={t.id} disabled={!canAct} onClick={() => { if (!store.dispatch({ kind: 'SelectSeedTown', heroId: hero.id, townId: t.id })) store.toast(`${t.name} will receive the ring’s next weekly gift if it remains eligible.`); }}>{t.name}</Button>)}
        </article> : null}
        {report ? <article className="journal-entry" data-testid="guide-mask-coast">
          <h3>Xolotl’s Guide Mask · {hero.name}</h3>
          <p>Known coast within {coast} hexes. These marks grant no vision or movement.</p>
          {report.problem ? <p>{report.problem}</p> : report.entries.length ? report.entries.map((e, i) => <p key={i}><Button onClick={() => { store.focusRequest = e.coord; store.goto('adventure'); }}>{e.label} ({e.coord.q}, {e.coord.r})</Button> {e.detail}</p>) : <p>No known landing shore nearby.</p>}
        </article> : null}
      </div>;
    })}
  </>;
}

export function CourierDialog({ heroId, onClose }: { heroId: string; onClose: () => void }) {
  const store = useStore(), session = store.session!, { state } = session, hero = state.heroes[heroId];
  const items = hero?.backpack.filter((a) => !a.questBound) ?? [];
  const recipients = Object.values(state.heroes).filter((h) => h.id !== heroId && h.ownerId === session.humanPlayerId && h.status === 'active' && Object.values(state.towns).some((t) => t.ownerId === h.ownerId && heroInTown(store.catalog, state, h, t.id)));
  const [itemChoice, chooseItem] = useState(''), [recipientChoice, chooseRecipient] = useState('');
  const artifactInstanceId = items.some((i) => i.instanceId === itemChoice) ? itemChoice : items[0]?.instanceId;
  const recipientHeroId = recipients.some((h) => h.id === recipientChoice) ? recipientChoice : recipients[0]?.id;
  const q = quoteAdventureSpell(store.catalog, state, session.humanPlayerId, heroId, 'spell2_courier_sigil', hero?.position ?? null, { artifactInstanceId, recipientHeroId });
  const legal = !!hero && !!artifactInstanceId && !!recipientHeroId && q.legal && state.activePlayerId === session.humanPlayerId;
  return <Modal title="Courier Sigil" onClose={onClose} width="34rem" testId="courier-parcel" footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" disabled={!legal} disabledReason={q.reason ?? 'Choose an item and recipient'} onClick={() => {
    if (hero && !store.dispatch({ kind: 'CastAdventureSpell', heroId, spellId: 'spell2_courier_sigil', target: hero.position, artifactInstanceId, recipientHeroId })) { onClose(); store.toast('Parcel dispatched. Track delivery in Journal → Scout notes.'); }
  }}>Send · {q.manaCost} mana</Button></>}>
    <p>One backpack artifact travels until the next dawn. Both heroes must stand in owned towns connected through explored terrain. Delivery failure returns the item to the sender, or holds it safely for collection.</p>
    <label className="row">Artifact <select className="select" aria-label="Courier artifact" value={artifactInstanceId ?? ''} onChange={(e) => chooseItem(e.target.value)}><option value="" disabled>Choose artifact</option>{items.map((i) => <option key={i.instanceId} value={i.instanceId}>{store.catalog.artifacts[i.artifactId]?.name}</option>)}</select></label>
    <label className="row">Recipient <select className="select" aria-label="Courier recipient" value={recipientHeroId ?? ''} onChange={(e) => chooseRecipient(e.target.value)}><option value="" disabled>Choose hero</option>{recipients.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}</select></label>
    {!legal ? <p className="warn">{q.reason ?? 'Choose an artifact and recipient.'}</p> : null}
  </Modal>;
}
