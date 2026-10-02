/**
 * S07 Hero screen, laid out after Heroes of Might and Magic III (owner request
 * 2026-10-01): portrait, name, level and class; the four primary skills as large
 * tiles; experience, mana, morale and luck; eight secondary-skill slots; a paper
 * doll with every equipment slot around the hero's mounted figure; the backpack
 * strip; the hero list on the right; and the seven army slots along the bottom.
 * Equipping, unequipping, reordering, splitting and merging are commands the
 * rules validate (EquipArtifact with a chosen position, UnequipArtifact,
 * TransferStack). The 3D figure is presentation only.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ARTIFACT_SLOT_LABEL,
  EQUIP_SLOTS,
  EQUIP_SLOT_KIND,
  EQUIP_SLOT_LABEL,
  HERO_ATTRIBUTES,
  armyStacks,
  artifactSetStatus,
  effectiveAttributes,
  heroLuckBonus,
  heroMoraleBonus,
  heroVisionRadius,
  maxMana,
  movementBudget,
  quoteTransfer,
  xpForLevel,
  type ArmyRef,
  type ArtifactDefinition,
  type ArtifactInstanceState,
  type EquipSlot,
  type HeroState,
} from '@pr/rules';
import type { HeroFigureController } from '@pr/presentation';
import { useStore } from '../app/context';
import { reducedMotion } from '../app/preferences';
import { Bar, Button, Chip, QuantitySelector } from '../components/kit';
import { ArtifactIcon, Emblem, HeroPortrait } from '../components/art';
import { ArmyStrip, ScreenHeader } from '../components/game';
import { Icon, type IconName } from '../assets/icons';
import { resolveAsset } from '../assets/manifest';
import { humanPlayer, playerHeroes, townAtHero } from '../app/view';
import { SceneViewport, type SceneFactory } from '../scene/SceneHost';

const ATTR: Record<string, { label: string; icon: IconName; hint: string }> = {
  attack: { label: 'Attack', icon: 'attack', hint: 'Adds to every stack’s Attack in battle.' },
  defense: { label: 'Defense', icon: 'defense', hint: 'Adds to every stack’s Defense in battle.' },
  power: { label: 'Spell Power', icon: 'power', hint: 'Strength and duration of spells.' },
  knowledge: { label: 'Knowledge', icon: 'knowledge', hint: 'Maximum mana (10 per point).' },
};

const RANK = ['', 'Basic', 'Advanced', 'Expert'];

/** Paper-doll positions (percent of the stage), Heroes-3 style: two columns beside the figure, misc along the foot. */
const DOLL: Record<EquipSlot, { x: number; y: number }> = {
  head: { x: 10, y: 9 },
  cape: { x: 10, y: 27 },
  weapon: { x: 10, y: 45 },
  ring_left: { x: 10, y: 63 },
  feet: { x: 10, y: 81 },
  neck: { x: 90, y: 9 },
  armor: { x: 90, y: 27 },
  shield: { x: 90, y: 45 },
  ring_right: { x: 90, y: 63 },
  mount: { x: 90, y: 81 },
  misc_1: { x: 26, y: 95 },
  misc_2: { x: 38, y: 95 },
  misc_3: { x: 50, y: 95 },
  misc_4: { x: 62, y: 95 },
  misc_5: { x: 74, y: 95 },
};

const BACKPACK_VISIBLE = 8;

type Picked = { from: 'doll'; slot: EquipSlot } | { from: 'pack'; instanceId: string } | null;

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

/** The hero's mounted figure in the middle of the paper doll (the portrait while it loads or without a model). */
function HeroFigure({ pantheonId, fallback }: { pantheonId: string | null; fallback: React.ReactNode }) {
  const store = useStore();
  const ctrl = useRef<HeroFigureController | null>(null);
  const [status, setStatus] = useState<string>('loading');
  const factory = useCallback<SceneFactory<HeroFigureController>>((lib, engine, canvas) => new lib.HeroFigureController(engine, canvas), []);
  const onController = useCallback(
    (c: HeroFigureController | null) => {
      ctrl.current = c;
      if (!c) return;
      c.reducedMotion = reducedMotion(store.prefs);
      c.onStatus = (s) => setStatus(s);
      c.setHero(pantheonId);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  useEffect(() => {
    ctrl.current?.setHero(pantheonId);
  }, [pantheonId]);
  return (
    <div className={`h3-figure is-${status}`} data-testid="hero-figure" data-status={status}>
      <SceneViewport factory={factory} onController={onController} className="h3-figure__scene" label="Hero figure (click to salute)" />
      {status !== 'ready' ? <div className="h3-figure__fallback">{fallback}</div> : null}
    </div>
  );
}

function ArtifactCard({ def, onRemove, onEquip, where }: { def: ArtifactDefinition; onRemove?: () => void; onEquip?: () => void; where: string }) {
  const catalog = useStore().catalog;
  const set = def.setId ? catalog.artifactSets?.[def.setId] : undefined;
  return (
    <div className="h3-artifact-card" data-testid="artifact-card">
      <ArtifactIcon iconAssetId={def.iconAssetId} kind={def.slot} size="3.4rem" rarity={def.rarity} />
      <div className="h3-artifact-card__body">
        <div className="h3-artifact-card__name">{def.name}</div>
        <div className="row gap wrap">
          <Chip>{ARTIFACT_SLOT_LABEL[def.slot]}</Chip>
          {def.rarity ? <Chip tone={def.rarity === 'relic' ? 'warn' : def.rarity === 'major' ? 'info' : 'muted'}>{def.rarity[0]!.toUpperCase() + def.rarity.slice(1)}</Chip> : null}
          {set ? <Chip tone="ok">{set.name}</Chip> : null}
          <span className="faint small">{where}</span>
        </div>
        <div className="small">{def.summary}</div>
        {def.lore ? <div className="faint small h3-lore">{def.lore}</div> : null}
        <div className="row gap">
          {onEquip ? (
            <Button size="small" variant="primary" onClick={onEquip}>
              Equip
            </Button>
          ) : null}
          {onRemove ? (
            <Button size="small" onClick={onRemove} data-testid="artifact-unequip">
              To backpack
            </Button>
          ) : null}
        </div>
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
  const [picked, setPicked] = useState<Picked>(null);
  const [packStart, setPackStart] = useState(0);
  useEffect(() => {
    setPicked(null);
    setPackStart(0);
  }, [heroId]);
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
  const pantheonId = def?.pantheonId ?? state.players[hero.ownerId]?.pantheonId ?? null;
  const attrs = effectiveAttributes(catalog, state, hero);
  const budget = movementBudget(catalog, state, hero);
  const nextXp = xpForLevel(catalog.rulesProfile, hero.level + 1);
  const curXp = xpForLevel(catalog.rulesProfile, hero.level);
  const town = townAtHero(state, hero);
  const mine = hero.ownerId === player.id;
  const neighbors = heroes.filter((h) => h.id !== hero.id && Math.max(Math.abs(h.position.q - hero.position.q), Math.abs(h.position.r - hero.position.r), Math.abs(h.position.q + h.position.r - hero.position.q - hero.position.r)) <= 1);
  const totalCreatures = armyStacks(hero.army).reduce((n, s) => n + s.count, 0);
  const pending = state.pendingDecisions.find((d) => d.heroId === hero.id);
  const morale = heroMoraleBonus(catalog, state, hero);
  const luck = heroLuckBonus(catalog, state, hero);
  const mana = maxMana(catalog, state, hero);
  const signed = (n: number) => `${n >= 0 ? '+' : ''}${n}`;

  // --- paper doll interaction ---
  const pickedInst: ArtifactInstanceState | undefined =
    picked?.from === 'doll' ? hero.equipment[picked.slot] : picked?.from === 'pack' ? hero.backpack.find((b) => b.instanceId === picked.instanceId) : undefined;
  const pickedDef = pickedInst ? catalog.artifacts[pickedInst.artifactId] : undefined;
  const fits = (slot: EquipSlot) => picked?.from === 'pack' && !!pickedDef && EQUIP_SLOT_KIND[slot] === pickedDef.slot;
  const clickSlot = (slot: EquipSlot) => {
    if (!mine) {
      setPicked(hero.equipment[slot] ? { from: 'doll', slot } : null);
      return;
    }
    if (picked?.from === 'pack' && pickedInst && fits(slot)) {
      store.dispatch({ kind: 'EquipArtifact', heroId: hero.id, instanceId: pickedInst.instanceId, slot });
      setPicked(null);
      return;
    }
    if (picked?.from === 'doll' && picked.slot === slot) return setPicked(null);
    setPicked(hero.equipment[slot] ? { from: 'doll', slot } : null);
  };
  const unequip = (slot: EquipSlot) => {
    store.dispatch({ kind: 'UnequipArtifact', heroId: hero.id, slot });
    setPicked(null);
  };
  const pack = hero.backpack;
  const visible = pack.slice(packStart, packStart + BACKPACK_VISIBLE);
  const sets = artifactSetStatus(catalog, hero);

  return (
    <div className="screen hero-screen h3">
      <ScreenHeader title={hero.name} subtitle={`${def?.title ?? ''} · Level ${hero.level} ${cls?.name ?? ''}`} />
      <div className="h3-layout">
        {/* ---------------- left: identity, primary skills, statistics, secondary skills ---------------- */}
        <section className="h3-left plate" aria-label="Hero statistics">
          <div className="h3-ident">
            <HeroPortrait catalog={catalog} definitionId={hero.definitionId} name={hero.name} size="6.4rem" />
            <div className="h3-ident__text">
              <div className="h3-ident__name">{hero.name}</div>
              <div className="h3-ident__class">
                Level {hero.level} {cls?.name ?? ''}
              </div>
              <div className="row gap">
                {pantheonId ? <Emblem catalog={catalog} pantheonId={pantheonId} size="1.6rem" /> : null}
                <span className="faint small">{pantheonId ? catalog.pantheons[pantheonId]?.name : ''}</span>
              </div>
              {def?.title ? <div className="faint small">{def.title}</div> : null}
            </div>
          </div>
          <div className="h3-primary" data-testid="hero-primary">
            {HERO_ATTRIBUTES.map((a) => {
              const b = attrs[a];
              const meta = ATTR[a]!;
              const src = [`${b.base} base`, b.artifacts ? `${signed(b.artifacts)} artifacts` : '', b.divine ? `${signed(b.divine)} divine` : '', b.skills ? `${signed(b.skills)} skills` : ''].filter(Boolean).join(' ');
              return (
                <div key={a} className="h3-primary__tile" title={`${meta.hint} (${src})`}>
                  <div className="h3-primary__label">{meta.label}</div>
                  <Icon name={meta.icon} className="h3-primary__icon" />
                  <div className="h3-primary__value num">{b.total}</div>
                </div>
              );
            })}
          </div>
          <div className="h3-stats">
            <div className="h3-stat" title="Experience">
              <Icon name="xp" className="h3-stat__icon" />
              <div>
                <div className="h3-stat__label">Experience</div>
                <div className="num small">
                  {hero.xp} / {nextXp}
                </div>
                <Bar value={hero.xp - curXp} max={Math.max(1, nextXp - curXp)} kind="xp" label="Experience to next level" />
              </div>
            </div>
            <div className="h3-stat" title="Spell points">
              <Icon name="mana" className="h3-stat__icon" />
              <div>
                <div className="h3-stat__label">Spell points</div>
                <div className="num small">
                  {hero.mana} / {mana}
                </div>
                <Bar value={hero.mana} max={Math.max(1, mana)} kind="mana" label="Mana" />
              </div>
            </div>
            <div className="h3-stat" title="Morale bonus from skills, artifacts and gods">
              <Icon name="morale" className="h3-stat__icon" />
              <div>
                <div className="h3-stat__label">Morale</div>
                <div className="num">{signed(morale)}</div>
              </div>
            </div>
            <div className="h3-stat" title="Luck bonus from skills, artifacts and gods">
              <Icon name="luck" className="h3-stat__icon" />
              <div>
                <div className="h3-stat__label">Luck</div>
                <div className="num">{signed(luck)}</div>
              </div>
            </div>
            <div className="h3-stat" title={`Base ${budget.base} by slowest Speed ${budget.slowestSpeed ?? '—'}; +${budget.percentBonus}%`}>
              <Icon name="movement" className="h3-stat__icon" />
              <div>
                <div className="h3-stat__label">Movement</div>
                <div className="num small">
                  {hero.movementPoints} / {budget.total}
                </div>
              </div>
            </div>
            <div className="h3-stat">
              <Icon name="eye" className="h3-stat__icon" />
              <div>
                <div className="h3-stat__label">Vision</div>
                <div className="num small">{heroVisionRadius(catalog, hero, state)} hexes</div>
              </div>
            </div>
          </div>
          {state.scenario.xpCap !== null ? <div className="faint small">Mission experience cap: {state.scenario.xpCap} (applied at mission end)</div> : null}
          {pending ? (
            <Button variant="primary" icon="star" onClick={() => store.goto('level-up')}>
              Choose level-up reward
            </Button>
          ) : null}
          <div className="h3-skills" data-testid="hero-skills">
            {Array.from({ length: catalog.rulesProfile.maxSecondarySkills }, (_, i) => {
              const s = hero.skills[i];
              const sd = s ? catalog.skills[s.skillId] : undefined;
              const art = sd ? resolveAsset(sd.iconAssetId) : null;
              return (
                <div key={i} className={`h3-skill ${sd ? 'is-filled' : ''}`} title={sd ? `${sd.name} (${RANK[s!.rank]}): ${sd.rankSummaries[s!.rank - 1]}` : 'Empty skill slot'}>
                  <span className="h3-skill__icon">{art?.url ? <img src={art.url} alt="" /> : <Icon name={sd ? 'star' : 'lock'} />}</span>
                  {sd ? (
                    <span className="h3-skill__text">
                      <span className="h3-skill__rank">{RANK[s!.rank]}</span>
                      <span className="h3-skill__name">{sd.name}</span>
                    </span>
                  ) : (
                    <span className="h3-skill__text faint small">—</span>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* ---------------- centre: paper doll ---------------- */}
        <section className="h3-doll plate" aria-label="Equipment">
          <div className="h3-doll__stage">
            <HeroFigure pantheonId={pantheonId} fallback={<HeroPortrait catalog={catalog} definitionId={hero.definitionId} name={hero.name} size="12rem" />} />
            <button type="button" className={`h3-book ${hero.spellbook ? '' : 'is-missing'}`} onClick={() => store.openOverlay({ kind: 'spellbook', heroId: hero.id })} title={hero.spellbook ? 'Open the spellbook' : 'No spellbook'} data-testid="hero-spellbook">
              <Icon name="spell" />
              <span>Spellbook</span>
            </button>
            {EQUIP_SLOTS.map((slot) => {
              const inst = hero.equipment[slot];
              const art = inst ? catalog.artifacts[inst.artifactId] : undefined;
              const pos = DOLL[slot];
              const isPicked = picked?.from === 'doll' && picked.slot === slot;
              return (
                <button
                  key={slot}
                  type="button"
                  className={`h3-slot ${art ? 'is-filled' : ''} ${isPicked ? 'is-picked' : ''} ${fits(slot) ? 'is-target' : ''}`}
                  style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                  onClick={() => clickSlot(slot)}
                  onDoubleClick={() => mine && art && unequip(slot)}
                  title={art ? `${art.name} — ${art.summary}` : `${EQUIP_SLOT_LABEL[slot]} (empty)`}
                  aria-label={art ? `${EQUIP_SLOT_LABEL[slot]}: ${art.name}` : `${EQUIP_SLOT_LABEL[slot]}: empty`}
                  data-testid={`slot-${slot}`}
                >
                  {art ? <ArtifactIcon iconAssetId={art.iconAssetId} kind={art.slot} rarity={art.rarity} /> : <span className="h3-slot__empty">{EQUIP_SLOT_LABEL[slot]}</span>}
                </button>
              );
            })}
          </div>
          <div className="h3-doll__info">
            {pickedDef && picked ? (
              <ArtifactCard
                def={pickedDef}
                where={picked.from === 'doll' ? `Worn: ${EQUIP_SLOT_LABEL[picked.slot]}` : 'In the backpack — click a glowing slot to wear it'}
                onRemove={mine && picked.from === 'doll' ? () => unequip(picked.slot) : undefined}
                onEquip={mine && picked.from === 'pack' && pickedInst ? () => { store.dispatch({ kind: 'EquipArtifact', heroId: hero.id, instanceId: pickedInst.instanceId }); setPicked(null); } : undefined}
              />
            ) : (
              <p className="faint small">Click an item to see it. Pick an item from the backpack, then click a glowing slot to wear it; double-click a worn item to take it off.</p>
            )}
          </div>
          <div className="h3-backpack" aria-label="Backpack" data-testid="hero-backpack">
            <Button size="small" icon="back" aria-label="Scroll backpack left" disabled={packStart === 0} onClick={() => setPackStart(Math.max(0, packStart - BACKPACK_VISIBLE))} />
            <div className="h3-backpack__slots">
              {Array.from({ length: BACKPACK_VISIBLE }, (_, i) => {
                const inst = visible[i];
                const art = inst ? catalog.artifacts[inst.artifactId] : undefined;
                const isPicked = !!inst && picked?.from === 'pack' && picked.instanceId === inst.instanceId;
                return (
                  <button
                    key={inst?.instanceId ?? `empty-${i}`}
                    type="button"
                    className={`h3-slot h3-slot--pack ${art ? 'is-filled' : ''} ${isPicked ? 'is-picked' : ''}`}
                    disabled={!inst}
                    onClick={() => inst && setPicked(isPicked ? null : { from: 'pack', instanceId: inst.instanceId })}
                    onDoubleClick={() => mine && inst && store.dispatch({ kind: 'EquipArtifact', heroId: hero.id, instanceId: inst.instanceId })}
                    title={art ? `${art.name} — ${art.summary}` : 'Empty'}
                    data-testid={inst ? `pack-${inst.artifactId}` : undefined}
                  >
                    {art ? <ArtifactIcon iconAssetId={art.iconAssetId} kind={art.slot} rarity={art.rarity} /> : null}
                  </button>
                );
              })}
            </div>
            <Button size="small" icon="continue" aria-label="Scroll backpack right" disabled={packStart + BACKPACK_VISIBLE >= pack.length} onClick={() => setPackStart(packStart + BACKPACK_VISIBLE)} />
            <span className="faint small">
              {pack.length}/{catalog.rulesProfile.backpackCapacity}
            </span>
          </div>
          {sets.length > 0 ? (
            <div className="h3-sets">
              {sets.map((st) => {
                const set = catalog.artifactSets?.[st.setId];
                return (
                  <div key={st.setId} className="set-status" data-testid={`set-${st.setId}`}>
                    <strong>{st.name}</strong>{' '}
                    <Chip tone={st.active.length ? 'ok' : 'muted'}>
                      {st.equipped}/{st.total} pieces
                    </Chip>
                    <ul className="bullets small">
                      {(set?.bonuses ?? []).map((b) => (
                        <li key={b.pieces} className={st.equipped >= b.pieces ? '' : 'faint'}>
                          {b.summary} {st.equipped >= b.pieces ? '(active)' : ''}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          ) : null}
        </section>

        {/* ---------------- right: hero list ---------------- */}
        <aside className="h3-heroes plate" aria-label="Your heroes">
          {heroes.map((h) => (
            <button key={h.id} type="button" className={`h3-heroes__item ${h.id === hero.id ? 'is-selected' : ''}`} onClick={() => store.replace('hero', { heroId: h.id })} aria-label={h.name} title={h.name}>
              <HeroPortrait catalog={catalog} definitionId={h.definitionId} name={h.name} size="3.4rem" />
              <span className="h3-heroes__bars">
                <Bar value={h.movementPoints} max={Math.max(1, movementBudget(catalog, state, h).total)} kind="move" label={`${h.name} movement`} />
                <Bar value={h.mana} max={Math.max(1, maxMana(catalog, state, h))} kind="mana" label={`${h.name} mana`} />
              </span>
            </button>
          ))}
        </aside>
      </div>

      {/* ---------------- bottom: army ---------------- */}
      <section className="h3-army plate" aria-label={`Army, ${totalCreatures} creatures`}>
        <div className="h3-army__head">
          <span className="h3-army__title">Army · {totalCreatures} creatures</span>
          <span className="grow" />
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
          <Button size="small" icon="journal" onClick={() => store.goto('journal')}>
            Quests
          </Button>
        </div>
        {mine ? <ArmyEditor hero={hero} /> : <ArmyStrip catalog={catalog} army={hero.army} label="Army" />}
      </section>
    </div>
  );
}
