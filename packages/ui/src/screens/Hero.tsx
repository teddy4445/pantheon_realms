/**
 * S07 Hero / Army. Attributes with their sources, skills, spellbook,
 * equipment, backpack and the seven army slots. Reordering, splitting and
 * merging are TransferStack commands validated by the rules.
 */
import { useState } from 'react';
import {
  ARTIFACT_SLOTS,
  HERO_ATTRIBUTES,
  armyStacks,
  effectiveAttributes,
  heroLuckBonus,
  heroMoraleBonus,
  heroVisionRadius,
  maxMana,
  movementBudget,
  quoteTransfer,
  xpForLevel,
  type ArmyRef,
  type HeroState,
  artifactSetStatus,
} from '@pr/rules';
import { useStore } from '../app/context';
import { Button, Chip, Panel, QuantitySelector, SectionTitle, Bar } from '../components/kit';
import { HeroPortrait, SpellIcon } from '../components/art';
import { ArmyStrip, ScreenHeader } from '../components/game';
import { Icon, type IconName } from '../assets/icons';
import { humanPlayer, playerHeroes, townAtHero } from '../app/view';

const ATTR_ICON: Record<string, IconName> = { attack: 'attack', defense: 'defense', power: 'power', knowledge: 'knowledge' };
const ATTR_HINT: Record<string, string> = {
  attack: 'Adds to every stack’s Attack in battle.',
  defense: 'Adds to every stack’s Defense in battle.',
  power: 'Strength of spells.',
  knowledge: 'Maximum mana (10 per point).',
};

export function ArmyEditor({ hero }: { hero: HeroState }) {
  const store = useStore();
  const catalog = store.catalog;
  const state = store.session!.state;
  const [sel, setSel] = useState<number | null>(null);
  const [split, setSplit] = useState<{ from: number; qty: number } | null>(null);
  const ref: ArmyRef = { kind: 'hero', heroId: hero.id };
  const playerId = store.session!.humanPlayerId;
  const onSlot = (i: number) => {
    if (sel === null) {
      if (hero.army.slots[i]) setSel(i);
      return;
    }
    if (sel === i) {
      setSel(null);
      return;
    }
    const from = hero.army.slots[sel];
    if (!from) return setSel(null);
    const qty = split && split.from === sel ? split.qty : from.count;
    const q = quoteTransfer(catalog, state, playerId, ref, sel, ref, i, qty);
    if (!q.legal) {
      store.toast(q.reason ?? 'Cannot move stack', 'error');
      return;
    }
    store.dispatch({ kind: 'TransferStack', from: ref, fromSlot: sel, to: ref, toSlot: i, quantity: qty });
    setSel(null);
    setSplit(null);
  };
  const selStack = sel !== null ? hero.army.slots[sel] : null;
  const empties = hero.army.slots.map((s, i) => (s === null ? i : -1)).filter((i) => i >= 0);
  return (
    <div className="army-editor">
      <ArmyStrip catalog={catalog} army={hero.army} selected={sel} onSlot={onSlot} dropTargets={sel !== null ? hero.army.slots.map((_, i) => i).filter((i) => i !== sel) : []} label={`${hero.name}'s army`} testId="hero-army" onInfo={(id) => store.openOverlay({ kind: 'stack-info', creatureId: id })} />
      <div className="army-editor__bar">
        {selStack ? (
          <>
            <span className="small">
              Selected: {selStack.count} {catalog.creatures[selStack.creatureId]?.pluralName}. Click another slot to move, merge or swap.
            </span>
            {selStack.count > 1 && empties.length > 0 ? (
              split ? (
                <QuantitySelector label="Split quantity" value={split.qty} min={1} max={selStack.count - 1} onChange={(n) => setSplit({ from: sel!, qty: n })} />
              ) : (
                <Button size="small" icon="swap" onClick={() => setSplit({ from: sel!, qty: Math.floor(selStack.count / 2) })}>
                  Split…
                </Button>
              )
            ) : null}
            <Button size="small" variant="ghost" onClick={() => { setSel(null); setSplit(null); }}>
              Cancel
            </Button>
            <Button size="small" icon="info" onClick={() => store.openOverlay({ kind: 'stack-info', creatureId: selStack.creatureId, count: selStack.count })}>
              Details
            </Button>
          </>
        ) : (
          <span className="dim small">Select a stack to reorder, split or merge it. Right-click a stack for details.</span>
        )}
      </div>
    </div>
  );
}

export function HeroScreen() {
  const store = useStore();
  const catalog = store.catalog;
  const state = store.session!.state;
  const player = humanPlayer(state);
  const heroes = playerHeroes(state, player.id);
  const heroId = (store.screen.params.heroId as string | undefined) ?? store.selectedHeroId ?? heroes[0]?.id;
  const hero = heroId ? state.heroes[heroId] : undefined;
  if (!hero) {
    return (
      <div className="screen">
        <ScreenHeader title="Hero" />
        <p className="dim pad">No hero selected.</p>
      </div>
    );
  }
  const def = catalog.heroes[hero.definitionId];
  const cls = catalog.heroClasses[hero.classId];
  const attrs = effectiveAttributes(catalog, state, hero);
  const budget = movementBudget(catalog, state, hero);
  const nextXp = xpForLevel(catalog.rulesProfile, hero.level + 1);
  const curXp = xpForLevel(catalog.rulesProfile, hero.level);
  const town = townAtHero(state, hero);
  const mine = hero.ownerId === player.id;
  const neighbors = heroes.filter((h) => h.id !== hero.id && Math.max(Math.abs(h.position.q - hero.position.q), Math.abs(h.position.r - hero.position.r), Math.abs(h.position.q + h.position.r - hero.position.q - hero.position.r)) <= 1);
  const totalCreatures = armyStacks(hero.army).reduce((n, s) => n + s.count, 0);
  const pending = state.pendingDecisions.find((d) => d.heroId === hero.id);
  return (
    <div className="screen hero-screen">
      <ScreenHeader
        title={hero.name}
        subtitle={`${def?.title ?? ''} · Level ${hero.level} ${cls?.name ?? ''}`}
        right={
          heroes.length > 1 ? (
            <div className="row gap">
              {heroes.map((h) => (
                <button key={h.id} type="button" className={`hero-switch ${h.id === hero.id ? 'is-selected' : ''}`} onClick={() => store.replace('hero', { heroId: h.id })} aria-label={h.name}>
                  <HeroPortrait catalog={catalog} definitionId={h.definitionId} name={h.name} size="2.2rem" />
                </button>
              ))}
            </div>
          ) : undefined
        }
      />
      <div className="hero-layout">
        <Panel className="hero-card" title="Commander">
          <HeroPortrait catalog={catalog} definitionId={hero.definitionId} name={hero.name} size="11rem" />
          <p className="small dim">{def?.biography}</p>
          <div className="xp">
            <div className="row between small">
              <span>
                <Icon name="xp" className="inline-icon" /> Experience
              </span>
              <span className="num">
                {hero.xp} / {nextXp}
              </span>
            </div>
            <Bar value={hero.xp - curXp} max={Math.max(1, nextXp - curXp)} kind="xp" label="Experience to next level" />
            {state.scenario.xpCap !== null ? <div className="faint small">Mission experience cap: {state.scenario.xpCap} (applied at mission end)</div> : null}
          </div>
          {pending ? (
            <Button variant="primary" icon="star" onClick={() => store.goto('level-up')}>
              Choose level-up reward
            </Button>
          ) : null}
          <div className="stats">
            <Icon name="movement" className="stats__icon" />
            <span className="stats__label" title={`Base ${budget.base} by slowest Speed ${budget.slowestSpeed ?? '—'}; +${budget.percentBonus}%`}>
              Movement
            </span>
            <span className="stats__value num">
              {hero.movementPoints} / {budget.total}
            </span>
            <Icon name="mana" className="stats__icon" />
            <span className="stats__label">Mana</span>
            <span className="stats__value num">
              {hero.mana} / {maxMana(catalog, state, hero)}
            </span>
            <Icon name="morale" className="stats__icon" />
            <span className="stats__label">Morale bonus</span>
            <span className="stats__value num">{heroMoraleBonus(catalog, state, hero) >= 0 ? '+' : ''}{heroMoraleBonus(catalog, state, hero)}</span>
            <Icon name="luck" className="stats__icon" />
            <span className="stats__label">Luck bonus</span>
            <span className="stats__value num">{heroLuckBonus(catalog, state, hero) >= 0 ? '+' : ''}{heroLuckBonus(catalog, state, hero)}</span>
            <Icon name="eye" className="stats__icon" />
            <span className="stats__label">Vision</span>
            <span className="stats__value num">{heroVisionRadius(catalog, hero, state)} hexes</span>
          </div>
        </Panel>

        <div className="hero-main">
          <Panel title="Attributes" headerIcon="attack">
            <div className="attr-grid">
              {HERO_ATTRIBUTES.map((a) => {
                const b = attrs[a];
                return (
                  <div key={a} className="attr" title={ATTR_HINT[a]}>
                    <Icon name={ATTR_ICON[a]!} className="attr__icon" />
                    <div className="attr__name">{a[0]!.toUpperCase() + a.slice(1)}</div>
                    <div className="attr__value num">{b.total}</div>
                    <div className="attr__src faint small">
                      {b.base} base{b.artifacts ? ` +${b.artifacts} artifacts` : ''}
                      {b.divine ? ` +${b.divine} divine` : ''}
                    </div>
                  </div>
                );
              })}
            </div>
          </Panel>

          <div className="hero-columns">
            <Panel title={`Skills (${hero.skills.length}/${catalog.rulesProfile.maxSecondarySkills})`} headerIcon="star">
              {hero.skills.length === 0 ? <p className="dim">No skills yet.</p> : null}
              <ul className="skill-list">
                {hero.skills.map((s) => {
                  const sd = catalog.skills[s.skillId];
                  return (
                    <li key={s.skillId}>
                      <span className="skill-list__name">{sd?.name}</span>
                      <span className="rank" aria-label={`Rank ${s.rank} of 3`}>
                        {[1, 2, 3].map((r) => (
                          <span key={r} className={r <= s.rank ? 'on' : ''}>◆</span>
                        ))}
                      </span>
                      <span className="dim small">{sd?.rankSummaries[s.rank - 1]}</span>
                      {sd?.pantheonId ? <Chip tone="info">{catalog.pantheons[sd.pantheonId]?.name} skill</Chip> : null}
                    </li>
                  );
                })}
              </ul>
            </Panel>
            <Panel title="Spellbook" headerIcon="spell">
              {!hero.spellbook ? (
                <p className="dim">No spellbook. Buy one at a Sanctum for {catalog.rulesProfile.spellbookCost} Gold.</p>
              ) : hero.knownSpellIds.length === 0 ? (
                <p className="dim">Spellbook carried, no spells known yet. Spells are learned when visiting a town with a Sanctum.</p>
              ) : (
                <ul className="spell-list">
                  {hero.knownSpellIds.map((id) => {
                    const sp = catalog.spells[id];
                    return (
                      <li key={id} className="spell-slot">
                        {sp ? <SpellIcon iconAssetId={sp.iconAssetId} effectType={sp.effect.type} /> : null}
                        <div>
                          <strong>{sp?.name}</strong> <Chip>T{sp?.tier}</Chip> <Chip tone="info">{sp?.manaCost} mana</Chip>
                          <div className="dim small">{sp?.summary}</div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Panel>
          </div>

          <Panel title="Equipment" headerIcon="defense">
            <div className="equip-grid">
              {ARTIFACT_SLOTS.map((slot) => {
                const inst = hero.equipment[slot];
                const art = inst ? catalog.artifacts[inst.artifactId] : undefined;
                return (
                  <div key={slot} className={`equip-slot ${art ? 'is-filled' : ''}`}>
                    <div className="equip-slot__name">{slot}</div>
                    {art ? (
                      <>
                        <div className="equip-slot__item">{art.name}</div>
                        <div className="faint small">{art.summary}</div>
                        {art.setId ? <Chip tone="info">{catalog.artifactSets?.[art.setId]?.name ?? 'Set'}</Chip> : null}
                        {mine ? (
                          <Button size="small" variant="ghost" onClick={() => store.dispatch({ kind: 'UnequipArtifact', heroId: hero.id, slot })}>
                            Unequip
                          </Button>
                        ) : null}
                      </>
                    ) : (
                      <div className="faint small">Empty</div>
                    )}
                  </div>
                );
              })}
            </div>
            {artifactSetStatus(catalog, hero).map((st) => {
              const set = catalog.artifactSets?.[st.setId];
              return (
                <div key={st.setId} className="set-status" data-testid={`set-${st.setId}`}>
                  <div className="row gap">
                    <strong>{st.name}</strong>
                    <Chip tone={st.active.length ? 'ok' : 'muted'}>
                      {st.equipped}/{st.total} pieces
                    </Chip>
                  </div>
                  <ul className="bullets small">
                    {(set?.bonuses ?? []).map((b) => (
                      <li key={b.pieces} className={st.equipped >= b.pieces ? '' : 'faint'}>
                        {b.summary} {st.equipped >= b.pieces ? '(active)' : ''}
                      </li>
                    ))}
                  </ul>
                  {set ? <div className="faint small">Pieces: {set.pieceIds.map((id) => catalog.artifacts[id]?.name ?? id).join(', ')}</div> : null}
                </div>
              );
            })}
            <SectionTitle>
              Backpack ({hero.backpack.length}/{catalog.rulesProfile.backpackCapacity})
            </SectionTitle>
            {hero.backpack.length === 0 ? <p className="dim small">Empty.</p> : null}
            <div className="row gap wrap">
              {hero.backpack.map((inst) => {
                const art = catalog.artifacts[inst.artifactId];
                return (
                  <div key={inst.instanceId} className="backpack-item">
                    <strong>{art?.name}</strong> <span className="faint small">({art?.slot})</span>
                    {art?.setId ? <Chip tone="info">{catalog.artifactSets?.[art.setId]?.name ?? 'Set'}</Chip> : null}
                    <div className="dim small">{art?.summary}</div>
                    {mine ? (
                      <Button size="small" onClick={() => store.dispatch({ kind: 'EquipArtifact', heroId: hero.id, instanceId: inst.instanceId })}>
                        Equip
                      </Button>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </Panel>

          <Panel
            title={`Army · ${totalCreatures} creatures`}
            headerIcon="hero"
            actions={
              <div className="row gap">
                {town && town.ownerId === player.id ? (
                  <Button size="small" icon="swap" onClick={() => store.openOverlay({ kind: 'transfer', townId: town.id, heroId: hero.id })}>
                    Exchange with {town.name}
                  </Button>
                ) : null}
                {neighbors.map((n) => (
                  <Button key={n.id} size="small" icon="swap" onClick={() => store.openOverlay({ kind: 'transfer', townId: null, heroId: hero.id, otherHeroId: n.id })}>
                    Exchange with {n.name}
                  </Button>
                ))}
              </div>
            }
          >
            {mine ? <ArmyEditor hero={hero} /> : <ArmyStrip catalog={catalog} army={hero.army} label="Army" />}
          </Panel>
        </div>
      </div>
    </div>
  );
}
