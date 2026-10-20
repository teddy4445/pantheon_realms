import { AssetPicture } from '../components/assetPicture';
/**
 * S11 Tactical Battle. Legal moves, targets, spell/ability options and damage
 * previews come from the rules (legalActions / preview*). Every action is a
 * battle command; the result is committed before the 2D playback starts,
 * so playback speed (including instant) never changes the outcome.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  aliveCount,
  cellEquals,
  cellKey,
  frontHp,
  legalActions,
  previewMelee,
  previewRetaliation,
  previewShot,
  shootingRange,
  stackDistance,
  reachableAnchors,
  routeTo,
  stackCells,
  statsOf,
  turnOrderPreview,
  commanderMana,
  deploymentAnchors,
  deploymentZone,
  structureLabel,
  catapultTarget,
  attackBreakdown,
  defenseBreakdown,
  effectiveSpeed,
  furyActive,
  shapeshiftRule,
  type BattleSideEffects,
  type BattleCell,
  type BattleLegalActions,
  type ContentCatalog,
  type DamagePreview,
  type GameEvent,
  type MatchState,
  type SpellEffect,
  interventionsFor,
  interventionUsedThisWeek,
  quoteIntervention,
  interventionOf,
  manualBattlesRequired,
  catapultStatus,
  previewEngineAttack,
  battleCellLegal,
  footprintCells,
  dispellableStatuses,
  activeRelics,
  quoteActiveRelic,
  relicDispelChoices,
  spatialSpellOptions,
  fieldSpellProblem,
  fieldCells,
  fieldVictims,
  formationSwapOptions,
} from '@pr/rules';
import { boardingBoardView } from '../app/naval';
import { harpoonButton, harpoonPreview, seaBoardLegend, seaRetreatText, seaRoundLimit } from '../app/seaBattle';
import type { BattleMiracleFx, BattleSceneController, BattleSpellFx, BattleStackMark, BattleView } from '@pr/presentation';
import { useStore } from '../app/context';
import { battleCursor } from '../app/cursorContext';
import { battleOrientation, sideTone } from '../app/battleOrientation';
import { battleLogLines } from '../app/battleLog';
import { cursorCss } from '../assets/cursors';
import { battlePlaybackFactor, reducedMotion } from '../app/preferences';
import { keyFor, keyLabel, matches } from '../app/keys';
import { BattleInspection, useBattleInspection } from '../components/battleInspection';
import { SceneViewport, inspectors, projectors, toPage, type SceneFactory } from '../scene/SceneHost';
import { battleInsets } from '../scene/battleInsets';
import { cellPoint, miracleLook, spellLook, statusOverlays } from '@pr/presentation/core';
import { Button, Chip, Panel, Bar, Modal } from '../components/kit';
import { ArtifactIcon, CreaturePortrait, HeroPortrait } from '../components/art';
import { ClimateChip } from '../components/climate';
import { Icon } from '../assets/icons';
import { MiracleBook, type MiracleOption } from '../components/miraclebook';
import { stackMarks } from '../app/stackMarks';
import { abilityActions, abilityFxOf, usesText, type AbilityAction } from '../app/battleAbilities';
import { expeditionArt, resolveAsset } from '../assets/manifest';
import { CatapultStatus } from '../components/catapultControls';
import { catapultBoardClick, engineAt, engineAttackFrom, engineCommandable, engineSiegeView, engineTargetCells, keepClick, type BoardClick } from '../app/catapultView';
import { MiniBanner, contextTheme } from '../components/gui';

type Mode =
  | { kind: 'normal' }
  | { kind: 'spell'; spellId: string }
  | { kind: 'formation'; interventionId: string; targetId: string }
  | { kind: 'field'; spellId: string; cells: BattleCell[] }
  | { kind: 'spatial'; spellId: string; targetId: string }
  | { kind: 'ability'; abilityId: string }
  | { kind: 'structure' }
  /** Choosing a divine intervention (battle miracles, paid in Favor). */
  | { kind: 'miracles' }
  /** A miracle that needs an enemy stack as its target. */
  | { kind: 'intervention'; interventionId: string }
  /** Deck Harpoon (sea encounter): choosing an enemy in the water. */
  | { kind: 'harpoon' };

const NEUTRAL_ACCENT = '#8a3b32';

/** A stack's marks as small icons with their meaning (the same icons as over its count on the board). */
function MarkRow({ marks, testId }: { marks: readonly BattleStackMark[]; testId?: string }) {
  if (marks.length === 0) return null;
  return (
    <span className="stack-marks" aria-label="Effects" data-testid={testId}>
      {marks.map((m) => {
        const url = resolveAsset(m.icon).url;
        return url ? <span key={m.icon} title={m.label} className="stack-marks__icon"><AssetPicture asset={resolveAsset(m.icon)} alt={m.label} /></span> : null;
      })}
    </span>
  );
}

function breakdownTitle(label: string, b: { base: number; commander: number; statuses: number; aspect: number; effects: number; fury?: number; total: number }): string {
  const parts = [`base ${b.base}`];
  if (b.commander) parts.push(`commander ${b.commander > 0 ? '+' : ''}${b.commander}`);
  if (b.statuses) parts.push(`spells/abilities ${b.statuses > 0 ? '+' : ''}${b.statuses}`);
  if (b.aspect) parts.push(`aspect ${b.aspect > 0 ? '+' : ''}${b.aspect}`);
  if (b.effects) parts.push(`signature/gods ${b.effects > 0 ? '+' : ''}${b.effects}`);
  if (b.fury) parts.push(`fury +${b.fury}`);
  return `${label} ${b.total} (${parts.join(', ')})`;
}

/** Short chips for a side's frozen signature/god battle effects (read-only). */
function effectChips(fx: BattleSideEffects | null): { key: string; text: string; title: string }[] {
  if (!fx) return [];
  const out: { key: string; text: string; title: string }[] = [];
  if (fx.harmony) out.push({ key: 'harmony', text: `Harmony +${fx.harmony.attack}/+${fx.harmony.defense}`, title: `${fx.harmony.families}+ creature families: +${fx.harmony.attack} Attack, +${fx.harmony.defense} Defense for every stack` });
  if (fx.fury) out.push({ key: 'fury', text: `Fury +${fx.fury.attack}`, title: `A stack with at most ${fx.fury.numerator}/${fx.fury.denominator} of its creatures alive gains +${fx.fury.attack} Attack` });
  if (fx.freeShapeshift) out.push({ key: 'shift', text: 'Free shapeshift', title: 'Shapeshift does not spend the activation (once per activation)' });
  if (fx.recoveryPercent > 0) out.push({ key: 'recovery', text: `Recovery ${fx.recoveryPercent}%`, title: `If this side wins, each stack regains ${fx.recoveryPercent}% of its losses (rounded down)` });
  if (fx.xpPercent > 0) out.push({ key: 'xp', text: `+${fx.xpPercent}% XP`, title: `A winning hero gains ${fx.xpPercent}% more experience` });
  if (fx.creatureStats.length > 0) out.push({ key: 'blessings', text: 'Blessed', title: 'Divine blessings change some creature stats in this battle' });
  return out;
}

/** The word a spell that neither hurts nor heals leaves over its target (presentation only; from its effect data). */
function spellWord(name: string, effect: SpellEffect): string {
  switch (effect.type) {
    case 'attack_bonus':
      return `Attack ${effect.amount > 0 ? '+' : '−'}${Math.abs(effect.amount)}`;
    case 'defense_bonus':
      return `Defense ${effect.amount > 0 ? '+' : '−'}${Math.abs(effect.amount)}`;
    case 'speed_bonus':
      return `Speed ${effect.amount > 0 ? '+' : '−'}${Math.abs(effect.amount)}`;
    case 'mass_bonus':
      return `${name}: ${effect.stat[0]!.toUpperCase()}${effect.stat.slice(1)} ${effect.amount > 0 ? '+' : '−'}${Math.abs(effect.amount)}`;
    case 'max_damage_roll':
      return 'Blessed';
    case 'min_damage_roll':
      return 'Cursed';
    default:
      return name;
  }
}

/** How a battle spell looks on the battlefield (presentation only; fxLooks + the spell's data). */
function spellFxOf(catalog: ContentCatalog, spellId: string): BattleSpellFx | null {
  const spell = catalog.spells[spellId];
  if (!spell) return null;
  return { ...spellLook(spell), label: spellWord(spell.name, spell.effect), hostile: spell.target === 'enemy_stack' || spell.target === 'enemy_army' };
}

/** How a divine intervention looks in this battle, and whose side called it (null: a map miracle). */
function miracleFxOf(catalog: ContentCatalog, state: MatchState | undefined, interventionId: string, playerId: string): BattleMiracleFx | null {
  const def = state ? interventionOf(catalog, state, playerId, interventionId) : null;
  const battle = state?.battle;
  if (!def || def.context !== 'battle' || !battle) return null;
  const side = battle.sides.attacker.playerId === playerId ? 'attacker' : battle.sides.defender.playerId === playerId ? 'defender' : null;
  if (!side) return null;
  const e = def.effect;
  const label = e.type === 'battle_status' ? `${def.name}: ${e.stat[0]!.toUpperCase()}${e.stat.slice(1)} +${e.amount}` : def.name;
  return { look: miracleLook(def), side, label, ...(e.type === 'battle_smite' ? { damage: e.damage } : {}) };
}

function buildView(
  catalog: ContentCatalog,
  state: MatchState,
  la: BattleLegalActions | null,
  mode: Mode,
  hover: { cell: BattleCell; offset: { x: number; y: number } } | null,
  unitLabels: string,
  grid: boolean,
  deploySel: string | null = null,
  deploySide: 'attacker' | 'defender' | null = null,
  catapultAimId: string | null = null,
): { view: BattleView; attackFrom: BattleCell | null; hoverTarget: string | null } {
  const battle = state.battle!;
  const orient = battleOrientation(battle);
  const occ = new Map<string, string>();
  for (const s of Object.values(battle.stacks)) if (s.totalHp > 0) for (const c of stackCells(catalog, s)) occ.set(cellKey(c), s.id);
  // "Count" labels (1.1.0 default): health is revealed on the stack under the pointer and on the acting stack.
  const inspected = hover ? (occ.get(cellKey(hover.cell)) ?? null) : null;
  const stacks = Object.values(battle.stacks).map((s) => {
    const def = catalog.creatures[s.creatureId]!;
    const count = aliveCount(catalog, s);
    const side = battle.sides[s.side];
    const accent = side.playerId ? (state.players[side.playerId]?.color ?? NEUTRAL_ACCENT) : NEUTRAL_ACCENT;
    const hpTxt = `${frontHp(catalog, s)}hp`;
    const shown = s.id === inspected || (!deploySide && battle.activeStackId === s.id);
    const label = unitLabels === 'count' ? (shown && s.totalHp > 0 ? `${count} · ${hpTxt}` : String(count)) : unitLabels === 'health' ? hpTxt : `${count} · ${hpTxt}`;
    return {
      id: s.id,
      creatureId: s.creatureId,
      side: s.side,
      illusion: s.summoned?.kind === 'illusion',
      upgraded: def.form === 'upgraded',
      accent,
      anchor: s.anchor,
      facing: s.facing,
      footprint: statsOf(catalog, s.creatureId).footprint,
      count,
      alive: s.totalHp > 0,
      active: battle.shadowChoice ? battle.shadowChoice.stackId === s.id : deploySide ? deploySel === s.id : battle.activeStackId === s.id,
      label: s.summoned?.kind === 'illusion' ? `ILLUSION · ${label}` : label,
      labelColor: sideTone(orient, s.side) === 'blue' ? '#dbe8ff' : '#ffd9d2',
      statuses: statusOverlays(s.statuses),
      marks: stackMarks(catalog, s, battle.round, battle),
      defending: s.defending,
    };
  });
  let moves: BattleCell[] = battle.shadowChoice?.options ?? [];
  let targets: BattleCell[] = [];
  let path: BattleCell[] | null = null;
  let attackFrom: BattleCell | null = null;
  let hoverTarget: string | null = null;
  if (la) {
    const cellsOf = (id: string) => {
      const s = battle.stacks[id];
      return s ? stackCells(catalog, s) : [];
    };
    if (mode.kind === 'normal') {
      moves = la.moves;
      const ids = new Set([...la.melee.map((m) => m.targetId), ...la.shootTargets]);
      targets = [...ids].flatMap(cellsOf);
    } else if (mode.kind === 'spell') {
      const sp = la.spells.find((x) => x.spellId === mode.spellId);
      targets = (sp?.targets ?? []).flatMap(cellsOf);
    } else if (mode.kind === 'formation') {
      const t = battle.stacks[mode.targetId];
      targets = t ? formationSwapOptions(catalog, battle, t).flatMap((o) => cellsOf(o.secondTargetId!)) : [];
    } else if (mode.kind === 'field') {
      const e = catalog.spells[mode.spellId]?.effect;
      moves = e?.type === 'battle_field' ? fieldCells(battle, e, mode.cells) : [];
      targets = e?.type === 'battle_field' ? fieldVictims(catalog, battle, moves).flatMap((s) => stackCells(catalog, s)) : [];
    } else if (mode.kind === 'spatial') {
      const t = battle.stacks[mode.targetId], e = catalog.spells[mode.spellId]?.effect;
      moves = t && e ? spatialSpellOptions(catalog, battle, t, e).map((o) => o.destination) : [];
    } else if (mode.kind === 'ability') {
      const ab = la.abilities.find((x) => x.abilityId === mode.abilityId);
      targets = (ab?.targets ?? []).flatMap(cellsOf);
    } else if (mode.kind === 'intervention') {
      targets = Object.values(battle.stacks)
        .filter((x) => x.totalHp > 0 && quoteIntervention(catalog, state, battle.sides[la.side].playerId!, mode.interventionId, { stackId: x.id }).legal)
        .flatMap((x) => cellsOf(x.id));
    } else if (mode.kind === 'miracles') {
      targets = [];
    } else if (mode.kind === 'harpoon') {
      targets = (la.harpoon?.targets ?? []).flatMap(cellsOf);
    } else {
      targets = (battle.siege?.structures ?? []).filter((x) => la.structureTargets.includes(x.id)).flatMap((x) => x.cells);
    }
    // The enemy siege engine (targetableCatapultV1), when the active stack or the chosen spell can hit it.
    targets = [...targets, ...engineTargetCells(battle, la, mode)];
    if (hover) {
      const occId = occ.get(cellKey(hover.cell)) ?? null;
      hoverTarget = occId;
      const active = battle.stacks[la.stackId]!;
      if (mode.kind === 'normal' && occId && battle.stacks[occId]?.side !== la.side && !la.shootTargets.includes(occId)) {
        const m = la.melee.find((x) => x.targetId === occId);
        // The attack side under the pointer: the option whose cell is nearest, on the board's own transform.
        if (m) {
          const w = cellPoint(hover.cell, 1);
          const px = w.x + hover.offset.x;
          const py = w.y + hover.offset.y;
          let best = m.options[0]!;
          let bd = Infinity;
          for (const o of m.options) {
            const ow = cellPoint(o.from, 1);
            const d = (ow.x - px) ** 2 + (ow.y - py) ** 2 + o.distance * 0.001;
            if (d < bd) {
              bd = d;
              best = o;
            }
          }
          attackFrom = best.from;
          if (!cellEquals(best.from, active.anchor)) path = routeTo(active, reachableAnchors(catalog, battle, active), best.from);
        }
      } else if (mode.kind === 'normal' && !occId && engineAt(battle, hover.cell)) {
        // Striking the siege engine: the landing nearest the pointer, as for a stack.
        const opt = engineAttackFrom(la, hover);
        if (opt) {
          attackFrom = opt.from;
          if (!cellEquals(opt.from, active.anchor)) path = routeTo(active, reachableAnchors(catalog, battle, active), opt.from);
        }
      } else if (mode.kind === 'normal' && !occId && la.moves.some((c) => cellEquals(c, hover.cell))) {
        path = routeTo(active, reachableAnchors(catalog, battle, active), hover.cell);
      }
    }
  }
  // A two-hex creature's landing shows both cells (the rules' footprint behind its facing), on any board.
  let footprint: BattleCell[] | undefined;
  if (la && hover) {
    const active = battle.stacks[la.stackId];
    const dest = attackFrom ?? (mode.kind === 'normal' && la.moves.some((c) => cellEquals(c, hover.cell)) ? hover.cell : null);
    if (active && dest && statsOf(catalog, active.creatureId).footprint === 2) footprint = footprintCells(dest, 2, active.facing);
  }
  let zone: BattleCell[] = [];
  if (deploySide && battle.phase === 'deployment') {
    const z = deploymentZone(catalog, battle, deploySide);
    // A masked board (boarding): the zone is the deck's legal cells only, never the water beside it.
    for (let col = z.minCol; col <= z.maxCol; col++) for (let row = 0; row < battle.rows; row++) if (battleCellLegal(battle, { col, row })) zone.push({ col, row });
    const sel = deploySel ? battle.stacks[deploySel] : undefined;
    if (sel) moves = deploymentAnchors(catalog, battle, sel);
  }
  const siege = battle.siege && battle.siege.level > 0 ? { structures: battle.siege.structures, moat: battle.siege.moat, wallCol: battle.siege.wallCol, pantheonId: state.standalone?.spec.defender.pantheonId ?? state.towns[battle.siege.townId]?.pantheonId ?? null, engine: engineSiegeView(battle) } : null;
  const highlightKey = `${deploySel ?? ''}|${zone.length}|${state.revision}|${mode.kind}|${mode.kind === 'field' ? mode.cells.map(cellKey).join(';') : ''}|${'spellId' in mode ? mode.spellId : 'abilityId' in mode ? mode.abilityId : ''}|${path?.map(cellKey).join(';') ?? ''}|${attackFrom ? cellKey(attackFrom) : ''}|${la?.stackId ?? ''}|${footprint?.map(cellKey).join(';') ?? ''}`;
  return {
    view: { battleId: battle.battleId, cols: battle.cols, rows: battle.rows, obstacles: battle.obstacles, spellFields: battle.spellFields?.map((f) => ({ kind: f.kind, cells: f.cells.filter((c) => !f.spent?.includes(cellKey(c))), label: catalog.spells[f.spellId]?.name ?? f.spellId })), archetype: battle.archetype, climate: state.world.map.biome, stacks, moves, targets, path, attackFrom, highlightKey, grid, siege, zone, mirrored: orient.mirrored, blueSide: orient.blueSide, catapultAim: catapultAimId ? { structureId: catapultAimId } : null, board: boardingBoardView(state), ...(footprint ? { footprint } : {}) },
    attackFrom,
    hoverTarget,
  };
}

function PreviewLine({ label, p }: { label: string; p: DamagePreview | null }) {
  if (!p) return null;
  return (
    <div className="preview-line">
      <span className="dim">{label}</span>{' '}
      <strong className="num">
        {p.min === p.max ? p.min : `${p.min}–${p.max}`}
      </strong>{' '}
      damage ·{' '}
      <strong className="num">
        {p.killsMin === p.killsMax ? p.killsMin : `${p.killsMin}–${p.killsMax}`}
      </strong>{' '}
      slain
      {p.luckMax !== null ? <span className="faint"> (lucky: up to {p.luckMax})</span> : null}
      {p.notes.length ? <div className="faint small">{p.notes.join(' · ')}</div> : null}
    </div>
  );
}

export function BattleScreen() {
  const store = useStore();
  const catalog = store.catalog;
  const session = store.session!;
  const live = session.state;
  // When the final action ends the battle, the rules clear \`state.battle\`. Keep
  // showing the last battlefield until the result screen replaces this one, so
  // the final blow plays on the board instead of an empty screen.
  const lastLive = useRef<typeof live | null>(null);
  if (live.battle) lastLive.current = live;
  const ended = !live.battle;
  const state = live.battle ? live : (lastLive.current ?? live);
  const battle = state.battle;
  const ctrl = useRef<BattleSceneController | null>(null);
  const battlefieldElement = useRef<HTMLDivElement>(null);
  const measureHud = useRef<() => void>(() => {});
  const [mode, setMode] = useState<Mode>({ kind: 'normal' });
  const [hover, setHover] = useState<{ cell: BattleCell; offset: { x: number; y: number } } | null>(null);
  const [auto, setAuto] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const [relicOpen, setRelicOpen] = useState(false);
  const [dispelChoice, setDispelChoice] = useState<{ spellId: string; targetId: string } | null>(null);
  const [deploySel, setDeploySel] = useState<string | null>(null);
  const [, force] = useState(0);
  const battleId = battle?.battleId ?? '';
  useEffect(() => {
    const root = battlefieldElement.current;
    if (!root) return;
    const canvas = root.querySelector<HTMLElement>('.battle__scene');
    const header = root.querySelector<HTMLElement>('.battle-top');
    const order = root.querySelector<HTMLElement>('.turn-order');
    const footer = root.querySelector<HTMLElement>('.battle-bottom');
    if (!canvas || !header || !order || !footer) return;
    const measure = () => {
      const bounds = canvas.getBoundingClientRect();
      const head = header.getBoundingClientRect();
      // Put the queue below the actual header, including wrapped text and UI scale.
      const scale = root.getBoundingClientRect().height / (root.offsetHeight || 1);
      order.style.top = `${(head.bottom - root.getBoundingClientRect().top + 6) / (scale || 1)}px`;
      ctrl.current?.setInsets(battleInsets(bounds, [head.bottom, order.getBoundingClientRect().bottom], footer.getBoundingClientRect().top, bounds.height / (canvas.clientHeight || 1)));
    };
    measureHud.current = measure;
    const observer = new ResizeObserver(measure);
    [canvas, header, order, footer].forEach((element) => observer.observe(element));
    window.addEventListener('resize', measure);
    measure();
    return () => { observer.disconnect(); window.removeEventListener('resize', measure); measureHud.current = () => {}; };
  }, [battleId]);
  const log = battleLogLines(battleId);

  // 1.1.4 (GUI audit): until the board's painting and every stack's standing frame are drawn (or the
  // view cannot be shown at all), the field shows a loading notice and takes no orders; the menu stays.
  const [boardReady, setBoardReady] = useState(false);
  const [sceneFailed, setSceneFailed] = useState(false);
  const boardLoading = !ended && !boardReady && !sceneFailed;
  const boardLoadingRef = useRef(boardLoading);
  boardLoadingRef.current = boardLoading;
  useEffect(() => store.setBoardLoading(boardLoading), [boardLoading, store]);
  useEffect(() => () => store.setBoardLoading(false), [store]);
  const humanTurn = !ended && !!battle && battle.status === 'active' && session.isHumanTurn();
  const humanSide = battle ? Object.values(battle.sides).find((s) => s.controller === 'human') : undefined;
  // Campaign battles are fought by hand (handoff 2026-10-15): no Auto button or Q
  // shortcut. The rules refuse automated orders for a human side as well.
  const manualOnly = manualBattlesRequired(state);
  const autoOn = auto && !manualOnly;
  const la = humanTurn && !store.presentationBusy && !boardLoading ? legalActions(catalog, state) : null;
  // The Catapult is aimed by the siege attacker on one of its own stacks' turns (2026-10-07; legacy sieges).
  const canAimCatapult = !!la && la.side === 'attacker' && !!battle?.siege && battle.siege.level > 0 && !battle.siege.engine;
  // The targetable catapult (targetableCatapultV1): its phase for a human commander, its aim preview, its card.
  const engineSt = battle ? catapultStatus(battle) : null;
  const commandEngine = !!battle && engineCommandable(state, humanTurn, store.presentationBusy || boardLoading);
  const [aimPreview, setAimPreview] = useState<string | null>(null);
  const [engineCard, setEngineCard] = useState(false);
  const aimId = commandEngine ? (aimPreview ?? engineSt?.aimedStructureId ?? null) : null;
  /** The human side still arranging its deployment zone (Tactics), if any. */
  const deploySide = battle?.phase === 'deployment' && humanTurn && !boardLoading ? (battle.deployment?.pending.find((x) => battle.sides[x].controller === 'human') ?? null) : null;
  const selecting = battle?.phase === 'selection' && humanTurn && !!battle.selection;
  const built = useMemo(
    () => (battle ? buildView(catalog, state, la, mode, hover, store.prefs.unitLabels, store.prefs.hexOverlay !== 'off', deploySel, deploySide, aimId) : null),
    [catalog, state, la, mode, hover, store.prefs.unitLabels, store.prefs.hexOverlay, battle, deploySel, deploySide, aimId],
  );

  // Creature inspection (expedition kit 2026-10-17): read-only; outlines the inspected stack on the board.
  const inspection = useBattleInspection(catalog, state, hover?.cell ?? null);
  const calm = reducedMotion(store.prefs);
  useEffect(() => {
    // After the battle ended the board keeps what the final playback showed.
    if (built && !ended) ctrl.current?.update({ ...inspection.decorate(built.view), calm });
  }, [built, ended, calm, inspection.decorate]);
  // The controller can arrive after the first render (the 2D layer loads on demand).
  const builtRef = useRef(built);
  builtRef.current = built;

  useEffect(() => {
    if (humanTurn) store.showHint('first_battle');
  }, [humanTurn, store]);

  // The catapult's aim preview belongs to one engine phase.
  useEffect(() => setAimPreview(null), [battle?.round, battle?.phase]);
  // Reset mode whenever the active stack changes.
  useEffect(() => {
    setMode({ kind: 'normal' });
  }, [battle?.activeStackId, battle?.round]);
  // Choosing an ability's target (keyboard): focus moves to its first legal target in the
  // ability card, and back to the ability's button when the choice is cancelled.
  const abilityReturn = useRef<string | null>(null);
  const abilityCard = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (mode.kind === 'ability') {
      abilityCard.current?.querySelector<HTMLButtonElement>('[data-ability-target]')?.focus({ preventScroll: true });
      return;
    }
    const back = abilityReturn.current;
    abilityReturn.current = null;
    if (back) document.querySelector<HTMLButtonElement>(`[data-testid="battle-ability-${back}"]`)?.focus({ preventScroll: true });
  }, [mode]);
  useEffect(() => {
    if (battle?.phase !== 'deployment') setDeploySel(null);
  }, [battle?.phase]);

  // Playback + combat log from committed events.
  // Each published batch is held at once (before the screen re-renders with the new
  // state), so the stacks it touches keep their old look until it plays: a stack
  // killed by it is not laid down first and then shown dying again.
  const pending = useRef<{ events: readonly GameEvent[]; release: () => void }[]>([]);
  useEffect(() => {
    const unprepare = store.registerPreparer((events) => {
      const c = ctrl.current;
      const touches = events.some((e) => e.kind.startsWith('Battle') || e.kind.startsWith('Siege') || e.kind.startsWith('Engine') || e.kind.startsWith('Catapult') || e.kind === 'InterventionInvoked');
      pending.current.push({ events, release: c && touches ? c.hold(events) : () => undefined });
    });
    const unpresent = store.registerPresenter(async (events) => {
      const i = pending.current.findIndex((p) => p.events === events);
      const held = i >= 0 ? pending.current.splice(i, 1)[0]!.release : () => undefined;
      try {
        // The combat log itself is recorded by the store for every update (app/battleLog.ts),
        // so events published before this screen opened (the first round) are in it too.
        force((n) => n + 1);
        const c = ctrl.current;
        const factor = battlePlaybackFactor(store.prefs);
        // A miracle's light falls once its painted card has been seen; its targets keep their look meanwhile.
        if (c && factor > 0 && events.some((e) => e.kind === 'InterventionInvoked')) {
          for (const e of events) if (e.kind === 'InterventionInvoked') c.preloadFx(`fx.miracle.${e.interventionId}`);
          await store.whenMiracleCardsClosed();
          await c.play(events, battlePlaybackFactor(store.prefs));
          return;
        }
        if (c && events.some((e) => e.kind.startsWith('Battle') || e.kind.startsWith('Engine') || e.kind.startsWith('Catapult') || e.kind === 'InterventionInvoked')) await c.play(events, factor);
      } finally {
        held();
      }
    });
    return () => {
      unprepare();
      unpresent();
      for (const p of pending.current.splice(0)) p.release();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store, catalog, battleId]);

  // Auto-combat for the human side (the tactical AI chooses; the processor validates).
  useEffect(() => {
    if (!autoOn || !humanTurn || store.presentationBusy) return;
    const t = setTimeout(() => {
      if (store.session === session && session.isHumanTurn() && !store.presentationBusy) session.autoBattleStep();
    }, 90);
    return () => clearTimeout(t);
  }, [autoOn, humanTurn, store.presentationBusy, state.revision, session, store]);

  const act = (payload: Parameters<typeof store.dispatch>[0]) => {
    setDispelChoice(null);
    setMode({ kind: 'normal' });
    store.dispatch(payload);
  };

  const onCellClick = (cell: BattleCell, button: number, offset: { x: number; y: number }) => {
    const s = store.session?.state;
    const b = s?.battle;
    if (!s || !b) return;
    const occ = Object.values(b.stacks).find((st) => st.totalHp > 0 && stackCells(catalog, st).some((c) => cellEquals(c, cell)));
    if (button === 2) {
      // Right-click inspects (read-only; the full creature card is one click away in the panel).
      if (occ) inspection.open(occ.id);
      else if (engineAt(b, cell)) setEngineCard(true); // the siege engine's card (catapult panel)
      return;
    }
    if (b.shadowChoice) {
      if (!store.session!.isHumanTurn() || store.presentationBusy) return;
      if (b.shadowChoice.options.some((c) => cellEquals(c, cell))) act({ kind: 'BattleResolveShadow', to: cell });
      else store.toast('Choose a highlighted adjacent hex for Xolotl’s shadow step.');
      return;
    }
    if (b.phase === 'deployment') {
      const side = b.deployment?.pending.find((x) => b.sides[x].controller === 'human');
      if (!side || !store.session!.isHumanTurn() || store.presentationBusy) return;
      if (occ && occ.side === side) {
        if (deploySel && deploySel !== occ.id) {
          store.dispatch({ kind: 'BattleDeploy', stackId: deploySel, to: occ.anchor });
          setDeploySel(null);
        } else setDeploySel(deploySel === occ.id ? null : occ.id);
        return;
      }
      if (occ) return;
      if (!deploySel) {
        store.toast('Choose one of your stacks first', 'error');
        return;
      }
      if (!store.dispatch({ kind: 'BattleDeploy', stackId: deploySel, to: cell })) setDeploySel(null);
      return;
    }
    const legal = store.session!.isHumanTurn() && !store.presentationBusy ? legalActions(catalog, s) : null;
    // The targetable catapult: aiming in its phase, or a blow, shot or spell at the engine (same commands as its panel).
    const engineClick = catapultBoardClick(catalog, s, legal, mode, cell, { cell, offset }, engineCommandable(s, store.session!.isHumanTurn(), store.presentationBusy));
    if (engineClick) return boardOrder(engineClick);
    if (!legal) return;
    if (mode.kind === 'structure') {
      const st = b.siege?.structures.find((x) => x.cells.some((c) => cellEquals(c, cell)));
      if (st && legal.structureTargets.includes(st.id)) act({ kind: 'BattleAttackStructure', stackId: legal.stackId, structureId: st.id });
      else store.toast('Choose a highlighted wall section', 'error');
      return;
    }
    if (mode.kind === 'field') {
      const e = catalog.spells[mode.spellId]?.effect;
      if (e?.type !== 'battle_field') return;
      const cells = mode.cells.some((c) => cellEquals(c, cell)) ? mode.cells.filter((c) => !cellEquals(c, cell)) : [...mode.cells, cell];
      const reason = cells.length ? fieldSpellProblem(catalog, b, e, cells, true) : null;
      if (reason) store.toast(reason, 'error'); else setMode({ ...mode, cells });
      return;
    }
    if (mode.kind === 'spatial') {
      const t = b.stacks[mode.targetId], e = catalog.spells[mode.spellId]?.effect;
      const choice = t && e ? spatialSpellOptions(catalog, b, t, e).find((o) => cellEquals(o.destination, cell)) : null;
      if (choice) act({ kind: 'BattleCastSpell', spellId: mode.spellId, targetId: mode.targetId, ...choice });
      else store.toast('Choose a highlighted destination. Escape cancels without spending mana.', 'error');
      return;
    }
    if (mode.kind === 'spell') {
      const sp = legal.spells.find((x) => x.spellId === mode.spellId);
      const chosen = occ ?? Object.values(b.stacks).find((x) => sp?.targets.includes(x.id) && stackCells(catalog, x).some((c) => cellEquals(c, cell)));
      if (chosen && sp?.targets.includes(chosen.id)) {
        const effect = catalog.spells[mode.spellId]?.effect;
        if ((effect?.type === 'spatial_move' || effect?.type === 'illusion_copy')) setMode({ kind: 'spatial', spellId: mode.spellId, targetId: chosen.id });
        else if (effect?.type === 'dispel_status') setDispelChoice({ spellId: mode.spellId, targetId: chosen.id });
        else act({ kind: 'BattleCastSpell', spellId: mode.spellId, targetId: chosen.id });
      }
      else store.toast('Choose a highlighted target', 'error');
      return;
    }
    if (mode.kind === 'formation') {
      const t = b.stacks[mode.targetId];
      if (t && occ && formationSwapOptions(catalog, b, t).some((o) => o.secondTargetId === occ.id)) act({ kind: 'BattleInvokeIntervention', interventionId: mode.interventionId, targetId: t.id, secondTargetId: occ.id });
      else store.toast('Choose a highlighted allied stack to swap', 'error');
      return;
    }
    if (mode.kind === 'intervention') {
      if (battle && occ && quoteIntervention(catalog, state, battle.sides[legal.side].playerId!, mode.interventionId, { stackId: occ.id }).legal) {
        if (catalog.interventions[mode.interventionId]?.effect.type === 'library_formation_swap') setMode({ kind: 'formation', interventionId: mode.interventionId, targetId: occ.id });
        else act({ kind: 'BattleInvokeIntervention', interventionId: mode.interventionId, targetId: occ.id });
      }
      else store.toast('Choose a highlighted stack', 'error');
      return;
    }
    if (mode.kind === 'ability') {
      const ab = legal.abilities.find((x) => x.abilityId === mode.abilityId);
      if (occ && ab?.targets.includes(occ.id)) act({ kind: 'BattleUseAbility', stackId: legal.stackId, abilityId: mode.abilityId, targetId: occ.id });
      else store.toast('Choose a highlighted target', 'error');
      return;
    }
    if (mode.kind === 'harpoon') {
      if (occ && legal.harpoon?.targets.includes(occ.id)) act({ kind: 'BattleHarpoon', stackId: legal.stackId, targetId: occ.id });
      else store.toast(legal.harpoon?.reason ?? 'Choose a highlighted enemy in the water', 'error');
      return;
    }
    if (occ && occ.side !== legal.side) {
      if (legal.shootTargets.includes(occ.id)) {
        act({ kind: 'BattleShoot', stackId: legal.stackId, targetId: occ.id });
        return;
      }
      const hb = buildView(catalog, s, legal, mode, { cell, offset }, 'count', true);
      if (hb.attackFrom) act({ kind: 'BattleMelee', stackId: legal.stackId, targetId: occ.id, from: hb.attackFrom });
      else {
        const me = b?.stacks[legal.stackId];
        const range = me ? shootingRange(catalog, me.creatureId, b ?? undefined) : 0;
        const outOfRange = !!me && range > 0 && me.shotsRemaining > 0 && legal.shootBlockedReason === null;
        store.toast(outOfRange ? `Out of range: ${stackDistance(catalog, me!, occ)} hexes away (range ${range})` : (legal.shootBlockedReason ?? 'That enemy cannot be reached this turn'), 'error');
      }
      return;
    }
    if (occ) {
      store.openOverlay({ kind: 'stack-info', creatureId: occ.creatureId, count: aliveCount(catalog, occ) });
      return;
    }
    if (legal.moves.some((c) => cellEquals(c, cell))) act({ kind: 'BattleMove', stackId: legal.stackId, to: cell });
  };
  const clickRef = useRef(onCellClick);
  clickRef.current = onCellClick;
  /** Carry out what a board click means for the catapult or the engine. */
  const boardOrder = (o: NonNullable<BoardClick>) => {
    if (o.kind === 'command') {
      if (o.payload.kind === 'BattleAimCatapult' && commandEngine) act({ kind: 'BattleFireCatapult', structureId: o.payload.structureId, expectedRound: battle.round });
      else if (o.payload.kind === 'BattleAimCatapult') store.dispatch(o.payload);
      else act(o.payload);
    } else if (o.kind === 'toast') store.toast(o.message, 'error');
    else setEngineCard(true);
  };
  /** A click on the keep's picture (it has no cells): the catapult's target in its phase. */
  const structureClickRef = useRef<(id: string, button: number) => void>(() => {});
  structureClickRef.current = (id, button) => {
    const s = store.session?.state;
    if (!s || button !== 0) return;
    const o = keepClick(s, id, engineCommandable(s, store.session!.isHumanTurn(), store.presentationBusy));
    if (o) boardOrder(o);
  };
  /** The Spell button's action, for the S key (set once the battle is known, below). */
  const openSpellsRef = useRef<() => void>(() => {});

  const factory = useCallback<SceneFactory<BattleSceneController>>(
    (lib, engine, canvas) =>
      new lib.BattleSceneController(engine, canvas, {
        onCellClick: (c, b, o) => clickRef.current(c, b, o),
        onCellHover: (c, o) => setHover(c ? { cell: c, offset: o } : null),
        onCue: (cue) => store.audio?.battleCue(cue),
        spellFx: (spellId) => spellFxOf(catalog, spellId),
        iconUrl: (assetId) => resolveAsset(assetId).url,
        iconRegion: (assetId) => resolveAsset(assetId).atlas?.rect ?? null,
        miracleFx: (interventionId, playerId) => miracleFxOf(catalog, store.session?.state.battle ? store.session.state : (lastLive.current ?? undefined), interventionId, playerId),
        abilityFx: (ev) => abilityFxOf(catalog, ev),
        onBoardReady: (ready) => setBoardReady(ready),
        // The siege engine's damaged / destroyed pictures (expedition kit), sized by their visible boxes.
        engineArt: (stage) => {
          const a = expeditionArt(`expedition.catapult-${stage}`);
          return a ? { url: a.url, width: a.width, height: a.height, visibleBounds: a.visibleBounds } : null;
        },
        onStructureClick: (id, b) => structureClickRef.current(id, b),
      }),
    [],
  );
  const onController = useCallback((c: BattleSceneController | null) => {
    ctrl.current = c;
    projectors.battle = c ? (col, row) => toPage(c.projectCell({ col, row })) : undefined;
    inspectors.battle = c ? { stacks: () => c.stackDebug(), fx: () => c.fxDebug(), obstacles: () => c.obstacleDebug(), siege: () => c.siegeDebug(), board: () => c.boardDebug() } : undefined;
    if (c && builtRef.current) c.update({ ...builtRef.current.view, calm: reducedMotion(store.prefs) });
    measureHud.current();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keyboard shortcuts.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (store.overlays.length || store.story.length || e.ctrlKey || e.metaKey) return;
      if (boardLoadingRef.current) return;
      const t = e.target as HTMLElement;
      if (t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA') return;
      const k = e.key.toLowerCase();
      const is = (action: string) => matches(store.prefs, action, e.key);
      if (is('battle_skip')) {
        e.preventDefault();
        ctrl.current?.skip();
        return;
      }
      if (is('battle_log')) {
        setShowLog((v) => !v);
        return;
      }
      if (is('battle_auto') && humanSide && !manualOnly) {
        setAuto((a) => !a);
        return;
      }
      // Inspect (any turn) and Escape on an unpinned inspection card.
      if (inspection.handleKey(e, is('battle_inspect'), battle?.activeStackId ?? null)) return;
      if (!la) return;
      if (is('battle_wait') && la.canWait) act({ kind: 'BattleWait', stackId: la.stackId });
      else if (is('battle_defend')) act({ kind: 'BattleDefend', stackId: la.stackId });
      else if (is('battle_spell') && la.castAvailable && la.spells.some((x) => x.castable)) openSpellsRef.current();
      else if (k === 'escape' && mode.kind !== 'normal') {
        e.stopPropagation();
        setMode({ kind: 'normal' });
      } else return;
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  });

  if (!battle) {
    return (
      <div className="screen battle-screen">
        <div className="pad dim">The battle has ended.</div>
      </div>
    );
  }

  const active = battle.activeStackId ? battle.stacks[battle.activeStackId] : undefined;
  const activeDef = active ? catalog.creatures[active.creatureId] : undefined;
  const order = turnOrderPreview(catalog, battle);
  const sideInfo = (sideId: 'attacker' | 'defender') => {
    const side = battle.sides[sideId];
    const pl = side.playerId ? state.players[side.playerId] : undefined;
    const stacks = Object.values(battle.stacks).filter((s) => s.side === sideId && s.totalHp > 0);
    return { side, name: side.commander?.name ?? (sideId === 'defender' ? (state.standalone ? 'Defender' : battle.encounter.label) : 'Attacker'), owner: pl?.name ?? 'Neutral', total: stacks.reduce((n, s) => n + aliveCount(catalog, s), 0), color: pl?.color ?? NEUTRAL_ACCENT, mana: commanderMana(state, side), pantheonId: pl?.pantheonId ?? null };
  };
  // The commander's portrait (Brief 9) beside the side's name: a hero's, or a named guard commander's own
  // (Doros, Theron, Melas — the battle snapshot keeps its portrait ID); guards without a commander have none.
  const commanderPortrait = (side: (typeof battle.sides)['attacker']) => {
    const c = side.commander;
    if (!c) return null;
    const h = c.heroId ? state.heroes[c.heroId] : undefined;
    return <HeroPortrait catalog={catalog} definitionId={h?.definitionId ?? ''} portraitAssetId={c.portraitAssetId} name={c.name} size="2.7rem" style={{ flex: 'none' }} />;
  };
  const att = sideInfo('attacker');
  const def = sideInfo('defender');
  // The human's side stands on the left and is blue, also when a computer hero attacks (owner request 2026-10-14).
  const orient = battleOrientation(battle);
  const hoverStack = built?.hoverTarget ? battle.stacks[built.hoverTarget] : undefined;
  let preview: { main: DamagePreview | null; ret: DamagePreview | null; label: string } | null = null;
  if (la && hoverStack && hoverStack.side !== la.side && mode.kind === 'normal') {
    if (la.shootTargets.includes(hoverStack.id)) preview = { main: previewShot(catalog, state, la.stackId, hoverStack.id), ret: null, label: 'Shot' };
    else if (built?.attackFrom) preview = { main: previewMelee(catalog, state, la.stackId, hoverStack.id, built.attackFrom), ret: previewRetaliation(catalog, state, la.stackId, hoverStack.id), label: 'Melee' };
  }
  // Deck Harpoon: the rules' preview (the exact range the commit rolls in); it never draws retaliation.
  const harpoon = harpoonButton(battle, la);
  if (la && harpoon && hoverStack && mode.kind === 'harpoon' && harpoon.targets.includes(hoverStack.id)) preview = { main: harpoonPreview(catalog, state, la.stackId, hoverStack.id), ret: null, label: harpoon.name };
  const roundLimit = seaRoundLimit(catalog, battle);
  // A blow at the siege engine: the same preview as the commit (its Defense and HP; it never retaliates).
  const enginePreview =
    la?.engine && hover && mode.kind === 'normal' && engineAt(battle, hover.cell)
      ? la.engine.canShoot
        ? { main: previewEngineAttack(catalog, state, la.stackId, 'shot'), label: 'Shot at the catapult' }
        : built?.attackFrom
          ? { main: previewEngineAttack(catalog, state, la.stackId, 'melee', built.attackFrom), label: 'Melee at the catapult' }
          : null
      : null;
  const cursorChoice = battleCursor(catalog, state, la, mode, hover?.cell ?? null, built?.attackFrom ?? null, { battleActive: !ended && battle.status === 'active', deploying: !!deploySide || !!selecting, mirrored: orient.mirrored, aimingCatapult: commandEngine });
  const sceneCursor = cursorCss(cursorChoice.id, { angle: cursorChoice.angle, enabled: store.prefs.gameCursors });
  const castable = la ? la.spells.filter((s) => s.castable) : [];
  // The active stack's abilities: the exact rule, uses left and why one is unavailable, from its
  // definition and the rules' legal actions (app/battleAbilities.ts); the targets come from the rules.
  const abilities: AbilityAction[] = la ? abilityActions(catalog, battle, la) : [];
  const aiming = mode.kind === 'ability' ? (abilities.find((a) => a.abilityId === mode.abilityId) ?? null) : null;
  const pickAbility = (a: AbilityAction) => {
    if (!la) return;
    if (!a.available) {
      store.toast(`${a.name}: ${a.reason ?? 'not available now'}`, 'error');
      return;
    }
    if (a.selfLabel) {
      act({ kind: 'BattleUseAbility', stackId: la.stackId, abilityId: a.abilityId, targetId: la.stackId });
      return;
    }
    abilityReturn.current = a.abilityId;
    setMode({ kind: 'ability', abilityId: a.abilityId });
  };
  /** The Spell button: the commander's book opened to cast; picking a spell asks for its target next. */
  const openSpells = () => {
    if (!la) return;
    const side = battle.sides[la.side];
    const heroId = side.commander?.heroId ?? null;
    const hero = heroId ? state.heroes[heroId] : undefined;
    const options: Record<string, { castable: boolean; reason: string | null; manaCost: number }> = {};
    for (const sp of la.spells) options[sp.spellId] = { manaCost: sp.manaCost, castable: la.castAvailable && sp.castable, reason: !la.castAvailable ? 'One spell per round' : sp.castable ? null : (sp.reason ?? 'Not enough mana') };
    store.openOverlay({
      kind: 'spellbook',
      heroId: heroId ?? '',
      caster: hero ? undefined : { name: side.commander?.name ?? 'Commander', mana: commanderMana(state, side), knownSpellIds: la.spells.map((x) => x.spellId), spellbook: true },
      cast: { context: 'battle', options, onCast: (spellId) => setMode(catalog.spells[spellId]?.effect.type === 'battle_field' ? { kind: 'field', spellId, cells: [] } : { kind: 'spell', spellId }) },
    });
  };
  openSpellsRef.current = openSpells;
  const actingPlayer = la ? battle.sides[la.side].playerId : null;
  const miracles = actingPlayer ? interventionsFor(catalog, state, actingPlayer).filter((d) => d.context === 'battle') : [];
  // The book of Favor (same design as the spellbook; owner request 2026-10-04): every miracle of the
  // acting side, battle ones invokable; an enemy-stack miracle then asks for its target.
  // Stays open while a playback briefly withholds the legal actions (the acting side does not change).
  const bookSide = la?.side ?? humanSide?.sideId ?? null;
  const bookPlayer = actingPlayer ?? humanSide?.playerId ?? null;
  const miracleBook =
    mode.kind === 'miracles' && battle && bookSide && bookPlayer
      ? (() => {
          const actingPlayer = bookPlayer;
          const all = interventionsFor(catalog, state, actingPlayer);
          const enemy = Object.values(battle.stacks).find((x) => x.totalHp > 0 && x.side !== bookSide)?.id ?? null;
          const options: Record<string, MiracleOption> = {};
          for (const d of all) {
            const ally = d.target === 'ally_stack' ? Object.values(battle.stacks).find((s) => s.side === bookSide && quoteIntervention(catalog, state, actingPlayer, d.id, { stackId: s.id }).legal)?.id ?? null : null;
            const q = quoteIntervention(catalog, state, actingPlayer, d.id, { stackId: d.target === 'enemy_stack' ? enemy : ally });
            options[d.id] = { legal: q.legal, reason: q.reason };
          }
          return (
            <MiracleBook
              catalog={catalog}
              title="Divine interventions"
              miracles={all}
              favor={state.players[actingPlayer]?.wallet.favor ?? 0}
              context="battle"
              usedThisWeek={interventionUsedThisWeek(catalog, state, actingPlayer)}
              options={options}
              testId="battle-miracle-book"
              idPrefix="battle-miracle-"
              onClose={() => setMode({ kind: 'normal' })}
              onInvoke={(id) => {
                const d = catalog.interventions?.[id];
                if (!d) return;
                if (d.target === 'enemy_stack' || d.target === 'ally_stack') setMode({ kind: 'intervention', interventionId: id });
                else {
                  setMode({ kind: 'normal' });
                  act({ kind: 'BattleInvokeIntervention', interventionId: id });
                }
              }}
            />
          );
        })()
      : null;

  const attSide = (
    <div className={`battle-side ${orient.leftSide === 'attacker' ? 'battle-side--att' : 'battle-side--def'} tone-${sideTone(orient, 'attacker')}`} style={{ ['--side' as string]: att.color }} data-side="attacker">
      <MiniBanner pantheonId={att.pantheonId} />
      {commanderPortrait(att.side)}
      <div className="battle-side__text">
      <div className="battle-side__name">{att.name}</div>
      <div className="small dim">
        {att.owner} · {att.total} creatures{att.side.commander?.spellbook ? ` · ${att.mana} mana` : ''}
      </div>
      <div className="row gap wrap small" style={{ justifyContent: orient.leftSide === 'attacker' ? undefined : 'flex-end' }} data-testid="effects-attacker">
        {effectChips(att.side.effects).map((c) => (
          <Chip key={c.key} tone="info" title={c.title}>
            {c.text}
          </Chip>
        ))}
      </div>
      {engineSt?.side === 'attacker' ? <CatapultStatus catalog={catalog} state={state} viewerSide={humanSide?.sideId ?? null} cardOpen={engineCard} onToggleCard={() => setEngineCard((c) => !c)} /> : null}
      </div>
    </div>
  );
  const defSide = (
    <div className={`battle-side ${orient.leftSide === 'defender' ? 'battle-side--att' : 'battle-side--def'} tone-${sideTone(orient, 'defender')}`} style={{ ['--side' as string]: def.color }} data-side="defender">
      <MiniBanner pantheonId={def.pantheonId} />
      {commanderPortrait(def.side)}
      <div className="battle-side__text">
      <div className="battle-side__name">{def.name}</div>
      <div className="small dim">
        {def.owner} · {def.total} creatures{def.side.commander?.spellbook ? ` · ${def.mana} mana` : ''}
      </div>
      <div className="row gap wrap small" style={{ justifyContent: orient.leftSide === 'defender' ? undefined : 'flex-end' }} data-testid="effects-defender">
        {effectChips(def.side.effects).map((c) => (
          <Chip key={c.key} tone="info" title={c.title}>
            {c.text}
          </Chip>
        ))}
      </div>
      {battle.siege && battle.siege.level > 0 ? (
        <div className="siege-status small" data-testid="siege-status" aria-label="Fortifications">
          {battle.siege.structures.map((x) => {
            // A targetable catapult has its explicit aim (no fallback); a legacy one its round-start target.
            const aimed = engineSt ? engineSt.aimedStructureId === x.id : catapultTarget(battle)?.id === x.id;
            // The human attacker aims the Catapult by clicking a standing structure (on its own turn).
            const canAim = (commandEngine || canAimCatapult) && x.hp > 0 && (commandEngine || !aimed);
            const label = structureLabel(x.id).replace('Wall section ', 'W');
            const title = `${structureLabel(x.id)}: ${x.hp <= 0 ? 'destroyed' : x.hp < x.maxHp ? 'damaged' : 'intact'}${aimed ? ' — the Catapult’s next target' : canAim ? (commandEngine ? ' — click to fire' : ' — click to aim the Catapult here') : ''}`;
            const cls = `siege-status__item${x.hp <= 0 ? ' is-down' : ''}${aimed ? ' is-aim' : ''}${canAim ? ' is-aimable' : ''}`;
            return canAim ? (
              <button key={x.id} type="button" className={cls} title={title} onClick={() => boardOrder({ kind: 'command', payload: { kind: 'BattleAimCatapult', structureId: x.id } })} data-testid={`catapult-aim-${x.id}`}>
                {label}
              </button>
            ) : (
              <span key={x.id} className={cls} title={title} data-testid={aimed ? 'catapult-target' : undefined} data-structure={x.id}>
                {aimed ? <Icon name="spell" className="siege-status__aim" aria-hidden="true" /> : null}
                {label}
              </span>
            );
          })}
        </div>
      ) : null}
      </div>
    </div>
  );

  return (
    <div ref={battlefieldElement} className="battle" data-gui-theme={contextTheme(store)}>
      <SceneViewport factory={factory} onController={onController} onError={() => setSceneFailed(true)} className="battle__scene" label="Tactical battlefield" cursor={sceneCursor} />
      {boardLoading ? (
        <div className="battle-loading" role="status" aria-live="polite" data-testid="battle-loading">
          <span className="battle-loading__note panel">
            <span className="spinner" /> Preparing the battlefield…
          </span>
        </div>
      ) : null}
      {miracleBook}
      <header className="battle-top">
        {orient.leftSide === 'attacker' ? attSide : defSide}
        <div className="battle-round">
          <div className="battle-round__label">{battle.phase === 'deployment' ? 'Deployment' : battle.phase === 'selection' ? 'Defenders' : battle.phase === 'engine' ? 'Catapult' : 'Round'}</div>
          <div className="battle-round__n num">{battle.round || '—'}</div>
          {roundLimit ? (
            <div className="faint small" title={roundLimit.title} data-testid="battle-round-limit">
              {roundLimit.text}
            </div>
          ) : null}
          <div className="faint small">{battle.phase === 'waiting' ? 'Waiting phase' : battle.encounter.label}</div>
          {battle.climate ? <ClimateChip climate={battle.climate} /> : null}
        </div>
        {orient.leftSide === 'attacker' ? defSide : attSide}
      </header>
      <div className="turn-order" aria-label="Turn order">
        {order.current.slice(0, 11).map((id, i) => {
          const s = battle.stacks[id]!;
          return (
            <div key={`c-${id}`} className={`turn-order__item side-${s.side} tone-${sideTone(orient, s.side)} ${i === 0 ? 'is-active' : ''}`} title={`${catalog.creatures[s.creatureId]?.name} (${s.side})`}>
              <CreaturePortrait catalog={catalog} creatureId={s.creatureId} size="2.6rem" count={aliveCount(catalog, s)} />
            </div>
          );
        })}
        {/* The siege engine acts after every creature of the round (targetableCatapultV1). */}
        {engineSt && engineSt.stage !== 'destroyed' && (battle.siege?.engine?.phaseRound ?? 0) < battle.round ? (
          <div className={`turn-order__item turn-order__engine side-${engineSt.side} tone-${sideTone(orient, engineSt.side)}${battle.phase === 'engine' ? ' is-active' : ''}`} title="The catapult fires or skips after every creature has acted" data-testid="turn-order-catapult">
            <Icon name="catapult" />
          </div>
        ) : null}
        <div className="turn-order__sep" title="Next round">
          R{battle.round + 1}
        </div>
        {order.next.slice(0, 5).map((id) => {
          const s = battle.stacks[id]!;
          return (
            <div key={`n-${id}`} className={`turn-order__item side-${s.side} tone-${sideTone(orient, s.side)} is-next`}>
              <CreaturePortrait catalog={catalog} creatureId={s.creatureId} size="2.1rem" />
            </div>
          );
        })}
      </div>

      {preview && hoverStack ? (
        <div className="battle-preview panel" role="status">
          <div className="battle-preview__title">
            {preview.label}: {activeDef?.pluralName} → {catalog.creatures[hoverStack.creatureId]?.pluralName} ({aliveCount(catalog, hoverStack)})
            <MarkRow marks={stackMarks(catalog, hoverStack, battle.round, battle)} testId="target-marks" />
          </div>
          <PreviewLine label="Expected" p={preview.main} />
          {preview.ret ? <PreviewLine label="Retaliation (if they survive)" p={preview.ret} /> : preview.label === 'Melee' || mode.kind === 'harpoon' ? <div className="faint small">No retaliation expected.</div> : null}
        </div>
      ) : null}

      {!preview && hoverStack && hoverStack.totalHp > 0 ? (
        (() => {
          const d = catalog.creatures[hoverStack.creatureId];
          const n = aliveCount(catalog, hoverStack);
          return (
            <div className="battle-preview battle-inspect panel" role="status" data-testid="battle-inspect">
              <div className="battle-preview__title">
                {n} {n === 1 ? d?.name : d?.pluralName} <span className="faint small">({hoverStack.side})</span>
                <MarkRow marks={stackMarks(catalog, hoverStack, battle.round, battle)} testId="inspect-marks" />
              </div>
              <div className="battle-inspect__stats small">
                <span title={breakdownTitle('Attack', attackBreakdown(catalog, battle, hoverStack))}>
                  <Icon name="attack" className="inline-icon" /> {attackBreakdown(catalog, battle, hoverStack).total}
                </span>
                <span title={breakdownTitle('Defense', defenseBreakdown(catalog, battle, hoverStack))}>
                  <Icon name="defense" className="inline-icon" /> {defenseBreakdown(catalog, battle, hoverStack).total}
                </span>
                <span title="Damage">
                  <Icon name="damage" className="inline-icon" /> {d?.stats?.damageMin}–{d?.stats?.damageMax}
                </span>
                <span title="Speed">
                  <Icon name="speed" className="inline-icon" /> {effectiveSpeed(catalog, hoverStack, battle)}
                </span>
                {d?.stats?.shots ? (
                  <span title="Shots">
                    <Icon name="shots" className="inline-icon" /> {hoverStack.shotsRemaining}
                  </span>
                ) : null}
              </div>
              <div className="battle-inspect__hp small" data-testid="inspect-hp">
                <Icon name="hp" className="inline-icon" /> Front creature {frontHp(catalog, hoverStack)}/{d?.stats?.hp ?? '?'} hp · whole stack {hoverStack.totalHp} hp
              </div>
              <Bar value={frontHp(catalog, hoverStack)} max={d?.stats?.hp ?? 1} kind="hp" label="Front creature health" />
              <div className="faint small">Right-click or press {keyLabel(keyFor(store.prefs, 'battle_inspect'))} to inspect.</div>
            </div>
          );
        })()
      ) : null}

      <BattleInspection
        catalog={catalog}
        state={state}
        api={inspection}
        viewerSide={humanSide?.sideId ?? null}
        order={order}
        logOpen={showLog}
        inspectKey={keyLabel(keyFor(store.prefs, 'battle_inspect'))}
        onCreatureCard={(creatureId, count) => store.openOverlay({ kind: 'stack-info', creatureId, count })}
      />

      {enginePreview ? (
        <div className="battle-preview panel" role="status" data-testid="engine-preview">
          <div className="battle-preview__title">
            {enginePreview.label}: {activeDef?.pluralName} → catapult ({engineSt?.hp}/{engineSt?.maxHp} HP, Defense {engineSt?.defense})
          </div>
          <PreviewLine label="Expected" p={enginePreview.main} />
          <div className="faint small">A siege engine never retaliates.</div>
        </div>
      ) : null}


      {aiming && la ? (
        <AbilityCard
          catalog={catalog}
          battle={battle}
          action={aiming}
          cardRef={abilityCard}
          // Away from its targets: an ally-only ability's card stands on the enemy's side of the screen.
          dock={aiming.targets.every((t) => battle.stacks[t]?.side === la.side) === (orient.leftSide === la.side) ? 'right' : 'left'}
          onHover={(cell) => setHover(cell ? { cell, offset: { x: 0, y: 0 } } : null)}
          onChoose={(targetId) => {
            setHover(null);
            act({ kind: 'BattleUseAbility', stackId: la.stackId, abilityId: aiming.abilityId, targetId });
          }}
        />
      ) : null}

      {seaBoardLegend(battle) ? (
        <div className="battle-sea-legend small" data-testid="battle-sea-legend">
          {seaBoardLegend(battle)}
        </div>
      ) : null}

      {showLog ? (
        <Panel title="Combat log" className="battle-log" bodyClassName="scroll" actions={<Button size="small" variant="ghost" icon="close" onClick={() => setShowLog(false)} aria-label="Hide log" />}>
          <ol className="log-list">
            {log.slice(-60).map((l, i) => (
              <li key={i}>{l}</li>
            ))}
          </ol>
        </Panel>
      ) : (
        <Button className="battle-log-toggle" size="small" icon="journal" onClick={() => setShowLog(true)}>
          Log
        </Button>
      )}

      {selecting && battle.selection ? <DefenderSelection key={battle.battleId} /> : null}
      {relicOpen && la ? <Modal title="Awaken a relic" width="42rem" onClose={() => setRelicOpen(false)} testId="battle-relics-dialog">
        <p>One use per relic power in this battle. Uses the commander’s casting action; no spellbook or mana required.</p>
        {activeRelics(catalog, state, la.side).map(({ item, action }) => {
          const targets = Object.values(battle.stacks).filter((s) => quoteActiveRelic(catalog, state, item.id, s.id).legal);
          const reason = quoteActiveRelic(catalog, state, item.id, null).reason;
          return <Panel key={item.id}>
            <div className="row"><ArtifactIcon iconAssetId={item.iconAssetId} kind={item.slot} rarity={item.rarity} /><strong>{item.name}</strong></div>
            <p className="small">{item.summary}</p>
            {targets.length ? targets.map((target) => {
              const choices = relicDispelChoices(target, action);
              const invoke = (statusSourceId?: string) => { setRelicOpen(false); act({ kind: 'BattleActivateArtifact', artifactId: item.id, targetId: target.id, ...(statusSourceId ? { statusSourceId } : {}) }); };
              const name = catalog.creatures[target.creatureId]?.name ?? target.creatureId;
              return <div key={target.id} className="row wrap">
                <CreaturePortrait catalog={catalog} creatureId={target.creatureId} size="2.5rem" />
                {action === 'bind' ? <Button onClick={() => invoke()}>Bind {name}</Button> : choices.map((s) => <Button key={s.sourceId} onClick={() => invoke(s.sourceId)}>{name}: remove {s.label}</Button>)}
              </div>;
            }) : <p className="dim small">{reason?.startsWith('Choose') ? 'No eligible enchantment or target in range.' : reason}</p>}
          </Panel>;
        })}
        <Button variant="ghost" onClick={() => setRelicOpen(false)}>Cancel</Button>
      </Modal> : null}
      {dispelChoice && (() => {
        const spell = catalog.spells[dispelChoice.spellId];
        const target = battle.stacks[dispelChoice.targetId];
        if (!spell || spell.effect.type !== 'dispel_status' || !target) return null;
        return <Modal title={`${spell.name}: choose an enchantment`} width="30rem" onClose={() => setDispelChoice(null)} testId="dispel-choice">
          <p>Remove one spell effect. Cancelling spends no mana.</p>
          {dispellableStatuses(target, spell.effect.polarity).map((status) => <Button key={status.sourceId}
            data-testid={`dispel-${status.sourceId}`} onClick={() => act({ kind: 'BattleCastSpell', ...dispelChoice, statusSourceId: status.sourceId })}>{status.label}</Button>)}
          <Button variant="ghost" onClick={() => setDispelChoice(null)}>Cancel</Button>
        </Modal>;
      })()}

      {mode.kind === 'field' && la && (() => {
        const spell = catalog.spells[mode.spellId]!;
        if (spell.effect.type !== 'battle_field') return null;
        const reason = fieldSpellProblem(catalog, battle, spell.effect, mode.cells);
        const victims = fieldVictims(catalog, battle, fieldCells(battle, spell.effect, mode.cells));
        return <div className="battle-mode-hint" role="status" data-testid="battle-field-choice">
          <strong>{spell.name}</strong> · Click hexes to select/deselect. {reason ?? 'Ready to cast.'}
          {spell.effect.kind === 'wind_line' ? <span> Hits: {victims.map((v) => `${catalog.creatures[v.creatureId]?.pluralName} (${v.side === la.side ? 'ALLY' : 'enemy'})`).join(', ') || 'no creatures'}. Friendly fire applies.</span> : null}
          <Button disabled={!!reason} onClick={() => act({ kind: 'BattleCastSpell', spellId: spell.id, targetId: la.stackId, cells: mode.cells })}>Cast</Button>
          <Button onClick={() => setMode({ kind: 'normal' })}>Cancel</Button>
        </div>;
      })()}
      {battle.shadowChoice ? <div className="battle-mode-hint" role="status" data-testid="shadow-choice">Xolotl’s Faithful Shadow: {humanTurn ? 'choose a highlighted adjacent hex. This does not spend the creature’s action.' : 'the other army is choosing its shadow step.'}</div> : null}
      {mode.kind === 'formation' ? <div className="battle-mode-hint" role="status">Athena's Ordered Ranks: choose the second highlighted stack. <Button onClick={() => setMode({ kind: 'normal' })}>Cancel</Button></div> : null}
      {mode.kind === 'spatial' ? <div className="battle-mode-hint" role="status">{catalog.spells[mode.spellId]?.name}: choose a highlighted destination. <Button size="small" onClick={() => setMode({ kind: 'normal' })}>Cancel</Button></div> : null}
      <footer className="battle-bottom panel gui-command">
        {active && activeDef ? (
          <div className="active-card">
            <CreaturePortrait catalog={catalog} creatureId={active.creatureId} size="4rem" count={aliveCount(catalog, active)} />
            <div>
              <div className="active-card__name">
                {activeDef.pluralName} <span className="faint small">({active.side}{battle.activeIsBonus ? ', morale bonus' : ''})</span>
                <Button size="small" variant="ghost" icon="inspect" className="active-card__inspect" aria-label={`Inspect the ${activeDef.pluralName} (${keyLabel(keyFor(store.prefs, 'battle_inspect'))})`} title={`Inspect (${keyLabel(keyFor(store.prefs, 'battle_inspect'))}): current values, health and effects`} onClick={() => inspection.open(active.id, { focus: true })} data-testid="battle-inspect-active" />
              </div>
              <div className="row gap small">
                <span title={breakdownTitle('Attack', attackBreakdown(catalog, battle, active))} data-testid="active-attack"><Icon name="attack" className="inline-icon" /> {attackBreakdown(catalog, battle, active).total}</span>
                <span title={breakdownTitle('Defense', defenseBreakdown(catalog, battle, active))} data-testid="active-defense"><Icon name="defense" className="inline-icon" /> {defenseBreakdown(catalog, battle, active).total}</span>
                <span title="Damage"><Icon name="damage" className="inline-icon" /> {activeDef.stats?.damageMin}–{activeDef.stats?.damageMax}</span>
                <span title={`Speed (base ${activeDef.stats?.speed})`} data-testid="active-speed"><Icon name="speed" className="inline-icon" /> {effectiveSpeed(catalog, active, battle)}</span>
                {active.aspect ? <Chip tone="info">{shapeshiftRule(catalog, active.creatureId)?.aspect} aspect</Chip> : null}
                {furyActive(catalog, battle, active) ? <Chip tone="warn">Fury</Chip> : null}
                {activeDef.stats?.shots ? <span title="Shots"><Icon name="shots" className="inline-icon" /> {active.shotsRemaining}</span> : null}
                {activeDef.stats?.shots && activeDef.stats.range ? (
                  <span title={`Range ${activeDef.stats.range} hexes: full damage up to ${Math.floor(activeDef.stats.range / 2)}, half damage beyond`} data-testid="active-range">
                    <Icon name="range" className="inline-icon" /> {activeDef.stats.range}
                  </span>
                ) : null}
              </div>
              <MarkRow marks={stackMarks(catalog, active, battle.round, battle)} testId="active-marks" />
              <Bar value={frontHp(catalog, active)} max={activeDef.stats?.hp ?? 1} kind="hp" label="Front creature health" />
            </div>
          </div>
        ) : (
          <div className="active-card dim">{battle.phase === 'engine' ? 'Catapult phase' : 'No active stack'}</div>
        )}
        <div className="battle-actions">
          {boardLoading ? (
            <span className="dim small">
              <span className="spinner" /> Preparing the battlefield…
            </span>
          ) : !humanTurn ? (
            <span className="dim small">
              <span className="spinner" /> {store.presentationBusy ? 'Resolving…' : session.isReplay ? 'Replay…' : state.standalone && !session.humanSeats.length ? 'Watching battle…' : 'Enemy turn…'}
            </span>
          ) : deploySide ? (
            <>
              <span className="small" data-testid="deploy-hint">
                Deploy your army inside the shaded {battle.deployment?.columns[deploySide] ?? 2} columns{state.standalone ? '' : ' (Tactics)'}. {deploySel ? 'Click a highlighted hex, or another stack to swap.' : 'Click one of your stacks to move it.'}
              </span>
              <Button variant="primary" icon="play" onClick={() => store.dispatch({ kind: 'BattleConfirmDeployment' })} data-testid="deploy-confirm">
                Start battle
              </Button>
            </>
          ) : selecting ? (
            <span className="small dim">Choose the town’s defenders.</span>
          ) : commandEngine ? (
            <span className="small" data-testid="catapult-phase-hint">
              Catapult phase: click a standing wall, gate or keep to fire.
            </span>
          ) : mode.kind === 'structure' && la ? (
            <>
              <span className="small">Batter the walls: choose a highlighted section{la.structureTargets.includes('keep') ? ' or the keep' : ''}.</span>
              {la.structureTargets.map((id) => (
                <Button key={id} size="small" onClick={() => act({ kind: 'BattleAttackStructure', stackId: la.stackId, structureId: id })} data-testid={`structure-${id}`}>
                  {structureLabel(id)}
                </Button>
              ))}
              <Button size="small" onClick={() => setMode({ kind: 'normal' })}>
                Cancel
              </Button>
            </>
          ) : mode.kind === 'miracles' && la && actingPlayer ? (
            <>
              <span className="small">Choose a miracle in the book of Favor…</span>
              <Button size="small" onClick={() => setMode({ kind: 'normal' })}>
                Cancel
              </Button>
            </>
          ) : mode.kind === 'intervention' ? (
            <>
              <span className="small">{(actingPlayer ? interventionOf(catalog, state, actingPlayer, mode.interventionId) : catalog.interventions?.[mode.interventionId])?.name}: choose a highlighted stack.</span>
              <Button size="small" onClick={() => setMode({ kind: 'normal' })}>
                Cancel
              </Button>
            </>
          ) : mode.kind === 'ability' && la ? (
            <>
              <span className="small" data-testid="battle-ability-prompt">
                {aiming ? aiming.prompt : 'Choose a highlighted target.'}
              </span>
              <Button size="small" onClick={() => setMode({ kind: 'normal' })} title="Cancel (Esc)" data-testid="battle-ability-cancel">
                Cancel
              </Button>
            </>
          ) : mode.kind === 'harpoon' && la && harpoon ? (
            <>
              <span className="small" data-testid="battle-harpoon-prompt">
                {harpoon.name}: choose a highlighted enemy in the water.
              </span>
              <Button size="small" onClick={() => setMode({ kind: 'normal' })} title="Cancel (Esc)" data-testid="battle-harpoon-cancel">
                Cancel
              </Button>
            </>
          ) : mode.kind !== 'normal' ? (
            <>
              <span className="small">
                {mode.kind === 'spell'
                  ? catalog.spells[mode.spellId]?.target === 'friendly_army'
                    ? `Cast ${catalog.spells[mode.spellId]?.name}: click any of your stacks — it affects your whole army.`
                    : catalog.spells[mode.spellId]?.target === 'enemy_army'
                      ? `Cast ${catalog.spells[mode.spellId]?.name}: click any enemy stack — it affects their whole army.`
                    : catalog.spells[mode.spellId]?.effect.type === 'area_damage'
                      ? `Cast ${catalog.spells[mode.spellId]?.name}: choose an enemy — the stacks beside it are hit too.`
                      : `Cast ${catalog.spells[mode.spellId]?.name}: choose a highlighted target.`
                  : 'Choose a highlighted ally.'}
              </span>
              {mode.kind === 'spell' && castable.length > 1 ? (
                <Button size="small" icon="spell" onClick={openSpells} data-testid="battle-spell-other">
                  Another spell
                </Button>
              ) : null}
              <Button size="small" onClick={() => setMode({ kind: 'normal' })}>
                Cancel
              </Button>
            </>
          ) : la ? (
            <>
              <Button icon="wait" onClick={() => act({ kind: 'BattleWait', stackId: la.stackId })} disabled={!la.canWait} disabledReason={la.canWait ? null : 'Cannot wait again this round'} title="Wait (W)" data-testid="battle-wait">
                Wait
              </Button>
              <Button icon="defend" onClick={() => act({ kind: 'BattleDefend', stackId: la.stackId })} title="Defend (D)" data-testid="battle-defend">
                Defend
              </Button>
              {!state.standalone ? <Button
                icon="spell"
                onClick={openSpells}
                data-testid="battle-spell"
                disabled={!la.castAvailable || castable.length === 0}
                disabledReason={!la.spells.length ? 'Your commander knows no battle spells' : !la.castAvailable ? 'One spell per round' : (la.spells[0]?.reason ?? 'Not enough mana')}
                title="Cast spell (S)"
              >
                Spell
              </Button> : null}
              {miracles.length > 0 ? (
                <Button icon="favor" onClick={() => setMode({ kind: 'miracles' })} title="Divine interventions (Favor, once per week)" data-testid="battle-miracles">
                  Miracle
                </Button>
              ) : null}
              {activeRelics(catalog, state, la.side).length ? <Button icon="spell" onClick={() => setRelicOpen(true)} data-testid="battle-relics">Relics</Button> : null}
              {la.structureTargets.length > 0 || la.structureBlockedReason ? (
                <Button icon="sword2" onClick={() => setMode({ kind: 'structure' })} disabled={la.structureTargets.length === 0} disabledReason={la.structureBlockedReason} title="Spend this activation and one shot to remove 1 structure point" data-testid="battle-structure">
                  Batter walls
                </Button>
              ) : null}
              {harpoon ? (
                <Button
                  icon="range"
                  onClick={() => setMode({ kind: 'harpoon' })}
                  disabled={!harpoon.available}
                  disabledReason={harpoon.reason}
                  title={harpoon.tooltip}
                  aria-description={harpoon.tooltip}
                  data-testid="battle-harpoon"
                >
                  {harpoon.name}
                </Button>
              ) : null}
              {abilities.map((a) => (
                // Self-only abilities (Shapeshift) act at once; the others ask for a target. An unavailable one
                // stays focusable (aria-disabled), so its rule and reason can be read from the keyboard too.
                <Button
                  key={a.abilityId}
                  className={`bv2-ability${a.available ? '' : ' is-unavailable'}${a.uses?.left === 0 ? ' is-used' : ''}`}
                  icon="ability"
                  artUrl={resolveAsset(a.icon).url}
                  aria-disabled={a.available ? undefined : true}
                  title={a.tooltip}
                  aria-description={a.tooltip}
                  onClick={() => pickAbility(a)}
                  data-testid={`battle-ability-${a.abilityId}`}
                  data-uses-left={a.uses ? a.uses.left : undefined}
                >
                  {a.available ? null : <Icon name="lock" glyph className="btn__lock bv2-lock" />}
                  {a.selfLabel ?? a.name}
                  {a.free ? ' (free)' : ''}
                  {a.uses ? (
                    <span className="bv2-uses" aria-hidden="true">
                      {a.uses.left === 0 ? 'Used' : `${a.uses.left}/${a.uses.total}`}
                    </span>
                  ) : null}
                </Button>
              ))}
              <Button
                icon="retreat"
                variant="ghost"
                disabled={!la.canRetreat}
                // Boarding battles: the ship needs open water to withdraw to (the rules' reason); never a land teleport.
                disabledReason={la.withdrawalBlockedReason ?? (battle.encounter.kind === 'town_siege' && la.side === 'defender' ? 'A town defender cannot retreat' : 'Only a hero commander can retreat')}
                onClick={() => store.confirm('Retreat?', state.standalone ? 'Withdraw this army and end the battle.' : seaRetreatText(battle, la.side) ?? (battle.encounter.kind === 'naval_boarding' ? 'Your hero’s ship withdraws to open water with no army. The surviving troops are lost.' : 'Your hero escapes with no army. The surviving troops are lost.'), 'Retreat', () => act({ kind: 'BattleRetreat' }), { danger: true })}
                data-testid="battle-retreat"
              >
                Retreat
              </Button>
              {la.canSurrender || la.withdrawalBlockedReason ? (
                <Button
                  icon="surrender"
                  variant="ghost"
                  disabled={!la.canSurrender}
                  disabledReason={la.withdrawalBlockedReason ?? null}
                  onClick={() => store.confirm('Surrender?', state.standalone ? 'Concede this battle to the opposing army.' : `Pay ${la.surrenderCost} Gold to keep your surviving army and leave the field${battle.encounter.kind === 'naval_boarding' ? ' (your ship withdraws to open water)' : ''}.`, 'Surrender', () => act({ kind: 'BattleSurrender' }))}
                  data-testid="battle-surrender"
                >
                  Surrender{state.standalone ? '' : ` (${la.surrenderCost})`}
                </Button>
              ) : null}
            </>
          ) : null}
        </div>
        <div className="battle-tools">
          {manualOnly ? null : (
            <Button icon="auto" variant={autoOn ? 'primary' : undefined} onClick={() => setAuto((a) => !a)} disabled={!humanSide || boardLoading} title="Auto-combat: the tactical AI plays your stacks (Q)" data-testid="battle-auto">
              {autoOn ? 'Auto: on' : 'Auto'}
            </Button>
          )}
          <Button icon="play" size="small" onClick={() => ctrl.current?.skip()} title="Skip animation (Space)">
            Skip
          </Button>
          <Chip tone="muted" title="Battle playback speed (Settings → Gameplay)">
            Speed: {store.prefs.battleSpeed === 'instant' ? 'instant' : `${store.prefs.battleSpeed}×`}
          </Chip>
          <Button icon="pause" size="small" onClick={() => store.openOverlay({ kind: 'pause' })} aria-label="Menu" />
        </div>
      </footer>
    </div>
  );
}

/**
 * The ability being aimed (campaign expansion, 2026-10-15): its exact rule and restriction from the
 * definition, the uses left, and one button per legal target from the rules (the keyboard way to choose
 * what the highlighted stacks on the battlefield offer to the pointer). Focusing a target inspects it.
 */
function AbilityCard({
  catalog,
  battle,
  action,
  cardRef,
  dock,
  onHover,
  onChoose,
}: {
  catalog: ContentCatalog;
  battle: NonNullable<MatchState['battle']>;
  action: AbilityAction;
  cardRef: { current: HTMLElement | null };
  /** The side of the screen it stands on: away from the targets it asks for, so they stay in view. */
  dock: 'left' | 'right';
  onHover: (cell: BattleCell | null) => void;
  onChoose: (targetId: string) => void;
}) {
  const badge = resolveAsset(action.icon).url;
  const seen = new Map<string, number>();
  const dupes = new Set(action.targets.map((id) => battle.stacks[id]?.creatureId).filter((c, i, all) => c && all.indexOf(c) !== i));
  return (
    <section
      className={`bv2-ability-card bv2-ability-card--${dock} panel`}
      ref={(el) => {
        cardRef.current = el;
      }}
      aria-label={`${action.name}: rule and targets`}
      data-testid="battle-ability-card"
    >
      <header className="bv2-ability-card__head">
        {badge ? <img className="bv2-ability-card__badge" src={badge} alt="" draggable={false} /> : null}
        <span className="bv2-ability-card__name">{action.name}</span>
        {action.uses ? <span className="bv2-uses bv2-uses--inline">{action.uses.left === 0 ? 'Used' : `${action.uses.left}/${action.uses.total}`}</span> : null}
      </header>
      {action.exactRule ? (
        <p className="bv2-ability-card__rule" data-testid="battle-ability-rule">
          {action.exactRule}
        </p>
      ) : null}
      {action.restriction ? <p className="bv2-ability-card__restriction small">{action.restriction}</p> : null}
      {action.uses ? <p className="bv2-ability-card__uses small">Uses: {usesText(action.uses)}.</p> : null}
      <div className="bv2-ability-card__targets" role="group" aria-label={`${action.name}: legal targets`}>
        {action.targets.map((id) => {
          const t = battle.stacks[id];
          if (!t) return null;
          const d = catalog.creatures[t.creatureId];
          const n = aliveCount(catalog, t);
          const k = (seen.get(t.creatureId) ?? 0) + 1;
          seen.set(t.creatureId, k);
          const self = id === battle.activeStackId;
          const label = `${n} ${n === 1 ? d?.name : d?.pluralName}${dupes.has(t.creatureId) ? ` (${k})` : ''}${self ? ' — this stack' : ''}`;
          return (
            <Button
              key={id}
              size="small"
              className="bv2-target"
              data-ability-target={id}
              data-testid={`battle-ability-target-${id}`}
              aria-label={`${action.name} on ${label}`}
              onMouseEnter={() => onHover(t.anchor)}
              onMouseLeave={() => onHover(null)}
              onFocus={() => onHover(t.anchor)}
              onBlur={() => onHover(null)}
              onClick={() => onChoose(id)}
            >
              <CreaturePortrait catalog={catalog} creatureId={t.creatureId} size="1.5rem" />
              {label}
            </Button>
          );
        })}
      </div>
      <p className="bv2-ability-card__hint faint small">Click a highlighted stack on the battlefield or choose one here · Esc cancels.</p>
    </section>
  );
}

/** BAT-14: the human town defender picks at most seven stacks; the rest wait in reserve. */
function DefenderSelection() {
  const store = useStore();
  const catalog = store.catalog;
  const state = store.session!.state;
  const battle = state.battle!;
  const sel = battle.selection!;
  const visitorName = battle.sides.defender.commander?.name ?? 'Visiting hero';
  const [picked, setPicked] = useState<number[]>(() => sel.candidates.map((_, i) => i).slice(0, sel.max));
  // Combining identical stacks changes the list: start the choice again.
  const listKey = sel.candidates.map((c) => `${c.source}${c.slot}:${c.count}`).join(',');
  useEffect(() => setPicked(sel.candidates.map((_, i) => i).slice(0, sel.max)), [listKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const ids = sel.candidates.map((c) => c.creatureId);
  const canMerge = new Set(ids).size < ids.length;
  const toggle = (i: number) => setPicked((p) => (p.includes(i) ? p.filter((x) => x !== i) : p.length >= sel.max ? p : [...p, i].sort((a, b) => a - b)));
  const reserves = sel.candidates.length - picked.length;
  return (
    <Modal
      title={`Defend ${battle.encounter.label.replace(/^Siege of /, '')}`}
      width="40rem"
      testId="defender-selection"
      footer={
        <>
          <span className="small dim">
            {picked.length}/{sel.max} chosen · {reserves} in reserve
          </span>
          <Button variant="primary" icon="defend" disabled={picked.length === 0} disabledReason="Choose at least one stack" onClick={() => store.dispatch({ kind: 'BattleSelectDefenders', picks: picked })} data-testid="defenders-confirm">
            Defend with {picked.length}
          </Button>
        </>
      }
    >
      <p className="small">
        The garrison and the visiting hero together have {sel.candidates.length} stacks; at most {sel.max} can fight.{' '}
        <strong>Stacks left out wait in reserve: they survive if the town holds and are lost if it falls.</strong> A town defender cannot retreat or surrender.
      </p>
      <ul className="defender-list">
        {sel.candidates.map((c, i) => {
          const def = catalog.creatures[c.creatureId];
          const on = picked.includes(i);
          return (
            <li key={`${c.source}-${c.slot}`}>
              <label className={`defender-row ${on ? 'is-on' : ''}`}>
                <input type="checkbox" checked={on} disabled={!on && picked.length >= sel.max} onChange={() => toggle(i)} data-testid={`defender-${i}`} />
                <CreaturePortrait catalog={catalog} creatureId={c.creatureId} size="2.4rem" count={c.count} />
                <span className="defender-row__text">
                  {c.count} {c.count === 1 ? def?.name : def?.pluralName}
                  <span className="faint small"> · {c.source === 'garrison' ? 'Garrison' : visitorName}</span>
                </span>
                {!on ? <Chip tone="warn">Reserve</Chip> : null}
              </label>
            </li>
          );
        })}
      </ul>
      {canMerge ? (
        <div className="row gap defender-merge">
          <Button icon="swap" onClick={() => store.dispatch({ kind: 'BattleMergeDefenders' })} data-testid="defenders-merge">
            Combine identical stacks
          </Button>
          <span className="faint small">Stacks of the same creature become one (in {visitorName}’s army when it has them). If seven or fewer remain, all of them defend.</span>
        </div>
      ) : (
        <p className="faint small">No identical stacks to combine.</p>
      )}
    </Modal>
  );
}
