/**
 * S07 Hero screen, laid out after Heroes of Might and Magic III (owner request
 * 2026-10-01): portrait, name, level and class; the four primary skills as large
 * tiles; experience, mana, morale and luck; eight secondary-skill slots; a paper
 * doll with every equipment slot around the hero's mounted figure; the backpack
 * strip; the hero list on the right; and the seven army slots along the bottom.
 * Equipping, unequipping, reordering, splitting and merging are commands the
 * rules validate (EquipArtifact with a chosen position, UnequipArtifact,
 * TransferStack). The 3D figure is presentation only.
 *
 * 2026-10-02 (owner request): items can also be dragged — backpack to a slot,
 * slot to slot of the same kind, slot back to the backpack; a picked backpack
 * item is compared with what the hero wears (attribute and set changes); set
 * pieces carry a set badge (final icon once delivered).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ARTIFACT_SLOT_LABEL,
  specialtiesEnabled,
  EQUIP_SLOTS,
  EQUIP_SLOT_KIND,
  EQUIP_SLOT_LABEL,
  HERO_ATTRIBUTES,
  armyStacks,
  artifactEffects,
  artifactSetStatus,
  equipSlotsFor,
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
  type EffectDefinition,
  type EquipSlot,
  type HeroState,
} from '@pr/rules';
import { SetBadge } from '../components/badges';
import type { HeroFigureController } from '@pr/presentation';
import { useStore } from '../app/context';
import { reducedMotion } from '../app/preferences';
import { Bar, Button, Chip, QuantitySelector } from '../components/kit';
import { ArtifactIcon, Emblem, HeroPortrait, SpecialtyLine } from '../components/art';
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

// ---------------------------------------------------------------------------
// Item comparison (what changes if the picked item is worn in a slot)
// ---------------------------------------------------------------------------

const TIERS = (e: { minTier?: number; maxTier?: number }) =>
  e.minTier !== undefined && e.maxTier !== undefined ? `Tier ${e.minTier}–${e.maxTier}` : e.maxTier !== undefined ? `Tier 1–${e.maxTier}` : e.minTier !== undefined ? `Tier ${e.minTier}+` : 'All';

/** Numeric totals of a list of effects, keyed by a readable label (unit in the label). */
function effectTotals(effects: readonly EffectDefinition[]): Map<string, number> {
  const out = new Map<string, number>();
  const add = (k: string, v: number) => out.set(k, (out.get(k) ?? 0) + v);
  for (const e of effects) {
    switch (e.type) {
      case 'commander_attribute':
        add(ATTR[e.attribute]?.label ?? e.attribute, e.amount);
        break;
      case 'morale':
        add('Morale', e.amount);
        break;
      case 'luck':
        add('Luck', e.amount);
        break;
      case 'movement_percent':
        add('Movement %', e.percent);
        break;
      case 'vision_radius':
        add('Vision (hexes)', e.amount);
        break;
      case 'mana_regen':
        add('Mana at dawn', e.amount);
        break;
      case 'spell_damage_percent':
        add('Spell damage %', e.percent);
        break;
      case 'battle_xp_percent':
        add('Battle experience %', e.percent);
        break;
      case 'casualty_recovery':
        add('Losses regained %', e.percent);
        break;
      case 'daily_income':
        add(`${e.resource[0]!.toUpperCase()}${e.resource.slice(1)} per day`, e.amount);
        break;
      case 'creature_stat':
        add(`${TIERS(e)}${e.ability ? ` ${e.ability === 'flight' ? 'flying' : e.ability}` : ''} creatures ${e.stat}`, e.amount);
        break;
      default:
        break;
    }
  }
  return out;
}

interface Comparison {
  readonly slot: EquipSlot;
  readonly worn: ArtifactDefinition | null;
  readonly rows: readonly { label: string; delta: number }[];
  readonly sets: readonly string[];
}

/** What changes for the hero if `inst` is worn in each slot it fits (attributes, set bonuses). */
function compareInSlots(catalog: ReturnType<typeof useStore>['catalog'], hero: HeroState, inst: ArtifactInstanceState): Comparison[] {
  const def = catalog.artifacts[inst.artifactId];
  if (!def) return [];
  const now = effectTotals(artifactEffects(catalog, hero));
  const setsNow = new Map(artifactSetStatus(catalog, hero).map((s) => [s.setId, s]));
  const slots = equipSlotsFor(def.slot);
  const empty = slots.find((s) => !hero.equipment[s]);
  return (empty ? [empty] : slots).map((slot) => {
    const equipment = { ...hero.equipment, [slot]: inst };
    const next = effectTotals(artifactEffects(catalog, { equipment }));
    const labels = [...new Set([...now.keys(), ...next.keys()])];
    const rows = labels.map((label) => ({ label, delta: (next.get(label) ?? 0) - (now.get(label) ?? 0) })).filter((r) => r.delta !== 0);
    const sets: string[] = [];
    const setsNext = new Map(artifactSetStatus(catalog, { equipment }).map((s) => [s.setId, s]));
    for (const id of new Set([...setsNow.keys(), ...setsNext.keys()])) {
      const a = setsNow.get(id);
      const b = setsNext.get(id);
      const before = a?.equipped ?? 0;
      const after = b?.equipped ?? 0;
      if (before === after) continue;
      const name = b?.name ?? a?.name ?? id;
      const total = b?.total ?? a?.total ?? 0;
      const gained = (b?.active ?? []).filter((x) => !(a?.active ?? []).some((y) => y.pieces === x.pieces)).map((x) => x.summary);
      const lost = (a?.active ?? []).filter((x) => !(b?.active ?? []).some((y) => y.pieces === x.pieces)).map((x) => x.summary);
      sets.push(`${name}: ${before}/${total} → ${after}/${total}${gained.length ? ` — gains ${gained.join('; ')}` : ''}${lost.length ? ` — loses ${lost.join('; ')}` : ''}`);
    }
    const wornInst = hero.equipment[slot];
    return { slot, worn: wornInst ? (catalog.artifacts[wornInst.artifactId] ?? null) : null, rows, sets };
  });
}

function ArtifactCompare({ hero, inst }: { hero: HeroState; inst: ArtifactInstanceState }) {
  const catalog = useStore().catalog;
  const list = compareInSlots(catalog, hero, inst);
  if (list.length === 0) return null;
  return (
    <div className="h3-compare" data-testid="artifact-compare">
      <div className="h3-compare__title">Compared with what {hero.name} wears</div>
      {list.map((c) => (
        <div key={c.slot} className="h3-compare__slot" data-testid={`compare-${c.slot}`}>
          <div className="small">
            <strong>{EQUIP_SLOT_LABEL[c.slot]}:</strong> {c.worn ? `replaces ${c.worn.name}` : 'empty slot'}
          </div>
          {c.rows.length === 0 && c.sets.length === 0 ? <div className="faint small">No change to attributes or sets.</div> : null}
          {c.rows.length ? (
            <div className="row gap wrap">
              {c.rows.map((r) => (
                <Chip key={r.label} tone={r.delta > 0 ? 'ok' : 'bad'}>
                  {r.label} {r.delta > 0 ? '+' : ''}
                  {r.delta}
                </Chip>
              ))}
            </div>
          ) : null}
          {c.sets.map((s) => (
            <div key={s} className="small">
              {s}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

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
          {set ? (
            <Chip tone="ok">
              <SetBadge catalog={catalog} setId={set.id} size="0.9rem" /> {set.name}
            </Chip>
          ) : null}
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
  const [dragging, setDragging] = useState<Picked>(null);
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
  const morale = heroMoraleBonus(catalog, state, hero);
  const luck = heroLuckBonus(catalog, state, hero);
  const mana = maxMana(catalog, state, hero);
  const signed = (n: number) => `${n >= 0 ? '+' : ''}${n}`;

  // --- paper doll interaction ---
  const pickedInst: ArtifactInstanceState | undefined =
    picked?.from === 'doll' ? hero.equipment[picked.slot] : picked?.from === 'pack' ? hero.backpack.find((b) => b.instanceId === picked.instanceId) : undefined;
  const pickedDef = pickedInst ? catalog.artifacts[pickedInst.artifactId] : undefined;
  const fits = (slot: EquipSlot) => picked?.from === 'pack' && !!pickedDef && EQUIP_SLOT_KIND[slot] === pickedDef.slot;
  // Drag and drop: backpack → slot, slot → slot of the same kind, slot → backpack.
  const dragInst: ArtifactInstanceState | undefined =
    dragging?.from === 'doll' ? hero.equipment[dragging.slot] : dragging?.from === 'pack' ? hero.backpack.find((b) => b.instanceId === dragging.instanceId) : undefined;
  const dragDef = dragInst ? catalog.artifacts[dragInst.artifactId] : undefined;
  const dropsOn = (slot: EquipSlot) => !!dragDef && EQUIP_SLOT_KIND[slot] === dragDef.slot && !(dragging?.from === 'doll' && dragging.slot === slot);
  const dropOnSlot = (slot: EquipSlot) => {
    const d = dragging;
    setDragging(null);
    if (!mine || !d || !dragInst || !dropsOn(slot)) return;
    if (d.from === 'pack') {
      store.dispatch({ kind: 'EquipArtifact', heroId: hero.id, instanceId: dragInst.instanceId, slot });
    } else {
      // Slot to slot (rings, misc): take it off, wear it in the new slot; what was there goes to the old slot.
      const displaced = hero.equipment[slot];
      if (store.dispatch({ kind: 'UnequipArtifact', heroId: hero.id, slot: d.slot })) return;
      if (store.dispatch({ kind: 'EquipArtifact', heroId: hero.id, instanceId: dragInst.instanceId, slot })) return;
      if (displaced) store.dispatch({ kind: 'EquipArtifact', heroId: hero.id, instanceId: displaced.instanceId, slot: d.slot });
    }
    setPicked(null);
  };
  const dropOnPack = () => {
    const d = dragging;
    setDragging(null);
    if (mine && d?.from === 'doll' && hero.equipment[d.slot]) unequip(d.slot);
  };
  const startDrag = (e: React.DragEvent, what: NonNullable<Picked>) => {
    if (!mine) return e.preventDefault();
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', what.from === 'pack' ? what.instanceId : what.slot);
    // Only the drop targets light up: changing the picked item here would resize the
    // panel under the pointer in the middle of the drag.
    setDragging(what);
  };
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
  const activeSets = new Set(sets.filter((s) => s.active.length > 0).map((s) => s.setId));

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
          {specialtiesEnabled(state) ? <SpecialtyLine catalog={catalog} definitionId={hero.definitionId} size="1.9rem" /> : null}
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
                  className={`h3-slot ${art ? 'is-filled' : ''} ${isPicked ? 'is-picked' : ''} ${fits(slot) || dropsOn(slot) ? 'is-target' : ''}`}
                  style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                  draggable={mine && !!art}
                  onDragStart={(e) => startDrag(e, { from: 'doll', slot })}
                  onDragEnd={() => setDragging(null)}
                  onDragOver={(e) => {
                    if (dropsOn(slot)) {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'move';
                    }
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    dropOnSlot(slot);
                  }}
                  onClick={() => clickSlot(slot)}
                  onDoubleClick={() => mine && art && unequip(slot)}
                  title={art ? `${art.name} — ${art.summary}` : `${EQUIP_SLOT_LABEL[slot]} (empty)`}
                  aria-label={art ? `${EQUIP_SLOT_LABEL[slot]}: ${art.name}` : `${EQUIP_SLOT_LABEL[slot]}: empty`}
                  data-testid={`slot-${slot}`}
                >
                  {art ? <ArtifactIcon iconAssetId={art.iconAssetId} kind={art.slot} rarity={art.rarity} /> : <span className="h3-slot__empty">{EQUIP_SLOT_LABEL[slot]}</span>}
                  {art?.setId ? <SetBadge catalog={catalog} setId={art.setId} active={activeSets.has(art.setId)} size="0.95rem" /> : null}
                </button>
              );
            })}
          </div>
          <div className="h3-doll__info">
            {pickedDef && picked ? (
              <>
              <ArtifactCard
                def={pickedDef}
                where={picked.from === 'doll' ? `Worn: ${EQUIP_SLOT_LABEL[picked.slot]}` : 'In the backpack — click a glowing slot to wear it'}
                onRemove={mine && picked.from === 'doll' ? () => unequip(picked.slot) : undefined}
                onEquip={mine && picked.from === 'pack' && pickedInst ? () => { store.dispatch({ kind: 'EquipArtifact', heroId: hero.id, instanceId: pickedInst.instanceId }); setPicked(null); } : undefined}
              />
              {picked.from === 'pack' && pickedInst ? <ArtifactCompare hero={hero} inst={pickedInst} /> : null}
              </>
            ) : (
              <p className="faint small">Click an item to see it and compare it with what the hero wears. Drag an item onto a glowing slot (or pick it, then click the slot) to wear it; drag a worn item to the backpack, or double-click it, to take it off.</p>
            )}
          </div>
          <div
            className={`h3-backpack ${dragging?.from === 'doll' ? 'is-droptarget' : ''}`}
            aria-label="Backpack"
            data-testid="hero-backpack"
            onDragOver={(e) => {
              if (dragging?.from === 'doll') {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
              }
            }}
            onDrop={(e) => {
              e.preventDefault();
              dropOnPack();
            }}
          >
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
                    draggable={mine && !!inst}
                    onDragStart={(e) => inst && startDrag(e, { from: 'pack', instanceId: inst.instanceId })}
                    onDragEnd={() => setDragging(null)}
                    onClick={() => inst && setPicked(isPicked ? null : { from: 'pack', instanceId: inst.instanceId })}
                    onDoubleClick={() => mine && inst && store.dispatch({ kind: 'EquipArtifact', heroId: hero.id, instanceId: inst.instanceId })}
                    title={art ? `${art.name} — ${art.summary}` : 'Empty'}
                    data-testid={inst ? `pack-${inst.artifactId}` : undefined}
                  >
                    {art ? <ArtifactIcon iconAssetId={art.iconAssetId} kind={art.slot} rarity={art.rarity} /> : null}
                    {art?.setId ? <SetBadge catalog={catalog} setId={art.setId} size="0.95rem" /> : null}
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
                    <SetBadge catalog={catalog} setId={st.setId} active={st.active.length > 0} size="1.2rem" /> <strong>{st.name}</strong>{' '}
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
