/**
 * S11 Tactical Battle. Legal moves, targets, spell/ability options and damage
 * previews come from the rules (legalActions / preview*). Every action is a
 * battle command; the result is committed before the Babylon playback starts,
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
  attackBreakdown,
  defenseBreakdown,
  effectiveSpeed,
  furyActive,
  shapeshiftRule,
  type BattleSideEffects,
  type BattleCell,
  type BattleLegalActions,
  type BattleState,
  type ContentCatalog,
  type DamagePreview,
  type GameEvent,
  type MatchState,
  interventionsFor,
  quoteIntervention,
} from '@pr/rules';
import type { BattleSceneController, BattleView } from '@pr/presentation';
import { useStore } from '../app/context';
import { battlePlaybackFactor } from '../app/preferences';
import { matches } from '../app/keys';
import { SceneViewport, presentation, projectors, toPage, type SceneFactory } from '../scene/SceneHost';
import { Button, Chip, Panel, Bar, Modal } from '../components/kit';
import { CreaturePortrait } from '../components/art';
import { Icon } from '../assets/icons';

type Mode =
  | { kind: 'normal' }
  | { kind: 'spell'; spellId: string }
  | { kind: 'ability'; abilityId: string }
  | { kind: 'structure' }
  /** Choosing a divine intervention (battle miracles, paid in Favor). */
  | { kind: 'miracles' }
  /** A miracle that needs an enemy stack as its target. */
  | { kind: 'intervention'; interventionId: string };

const NEUTRAL_ACCENT = '#8a3b32';

/** Combat log kept per battle (presentation only). */
const LOGS = new Map<string, string[]>();

function stackName(catalog: ContentCatalog, battle: BattleState, id: string, count?: number): string {
  const s = battle.stacks[id];
  const def = s ? catalog.creatures[s.creatureId] : undefined;
  if (!def) return id;
  const n = count ?? (s ? aliveCount(catalog, s) : 0);
  return n === 1 ? def.name : def.pluralName;
}

function describe(catalog: ContentCatalog, battle: BattleState, e: GameEvent, detail: string): string | null {
  switch (e.kind) {
    case 'BattleRoundStarted':
      return `— Round ${e.round} —`;
    case 'BattleStackMoved':
      return detail === 'compact' ? null : `${stackName(catalog, battle, e.stackId)} ${e.flying ? 'fly' : 'move'} ${e.path.length} hex${e.path.length === 1 ? '' : 'es'}.`;
    case 'BattleAttack': {
      const verb = e.mode === 'shot' ? 'shoot' : e.mode === 'retaliation' ? 'retaliate against' : 'attack';
      return `${stackName(catalog, battle, e.attackerId)} ${verb} ${stackName(catalog, battle, e.targetId)}: ${e.damage} damage, ${e.killed} slain${e.luck ? ' (lucky strike)' : ''}.`;
    }
    case 'BattleSpellCast':
      return `${catalog.spells[e.spellId]?.name ?? e.spellId} on ${stackName(catalog, battle, e.targetId)}${e.damage ? `: ${e.damage} damage` : ''}${e.healed ? `: ${e.healed} healed` : ''}.`;
    case 'BattleAbilityUsed':
      return `${stackName(catalog, battle, e.stackId)} use ${catalog.abilities[e.abilityId]?.name ?? e.abilityId} on ${stackName(catalog, battle, e.targetId)}.`;
    case 'BattleStackShapeshifted':
      return `${stackName(catalog, battle, e.stackId)} ${e.aspect ? `take the ${e.aspect} aspect` : 'return to their normal aspect'}${e.free ? ' (free)' : ''}.`;
    case 'BattleCasualtiesRecovered':
      return `${e.count} ${e.count === 1 ? catalog.creatures[e.creatureId]?.name : catalog.creatures[e.creatureId]?.pluralName} return after the battle.`;
    case 'BattleStackDefended':
      return `${stackName(catalog, battle, e.stackId)} defend.`;
    case 'BattleStackWaited':
      return `${stackName(catalog, battle, e.stackId)} wait.`;
    case 'BattleMorale':
      return `${stackName(catalog, battle, e.stackId)}: ${e.positive ? 'high morale — act again!' : 'low morale — they falter.'}`;
    case 'BattleStackDestroyed':
      return `${catalog.creatures[battle.stacks[e.stackId]?.creatureId ?? '']?.pluralName ?? 'A stack'} destroyed.`;
    case 'BattleEnded':
      return `Battle over: ${e.outcome} (${e.winner} wins).`;
    case 'BattleDefendersSelected':
      return `${e.count} stack${e.count === 1 ? '' : 's'} defend the town${e.reserves ? `; ${e.reserves} in reserve` : ''}.`;
    case 'BattleDeploymentStarted':
      return 'Deployment: arrange your army (Tactics).';
    case 'BattleDeploymentConfirmed':
      return `${e.side === 'attacker' ? 'Attacker' : 'Defender'} deployment confirmed.`;
    case 'SiegeStructureDamaged':
      return `${e.source === 'catapult' ? 'Catapult' : stackName(catalog, battle, e.attackerId ?? '')} strikes the ${structureLabel(e.structureId).toLowerCase()} (${e.hp} left).`;
    case 'SiegeStructureDestroyed':
      return `${structureLabel(e.structureId)} destroyed${e.structureId.startsWith('wall') || e.structureId === 'gate' ? ' — breach!' : '.'}`;
    case 'SiegeTurretShot':
      return `${structureLabel(e.structureId)} fires on ${stackName(catalog, battle, e.targetId)}: ${e.damage} damage, ${e.killed} slain.`;
    case 'SiegeMoatDamage':
      return `${stackName(catalog, battle, e.stackId)} wade into the moat: ${e.damage} damage, ${e.killed} slain.`;
    default:
      return null;
  }
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

function buildView(
  catalog: ContentCatalog,
  state: MatchState,
  la: BattleLegalActions | null,
  mode: Mode,
  hover: { cell: BattleCell; offset: { x: number; z: number } } | null,
  unitLabels: string,
  grid: boolean,
  deploySel: string | null = null,
  deploySide: 'attacker' | 'defender' | null = null,
): { view: BattleView; attackFrom: BattleCell | null; hoverTarget: string | null } {
  const battle = state.battle!;
  const occ = new Map<string, string>();
  for (const s of Object.values(battle.stacks)) if (s.totalHp > 0) for (const c of stackCells(catalog, s)) occ.set(cellKey(c), s.id);
  const stacks = Object.values(battle.stacks).map((s) => {
    const def = catalog.creatures[s.creatureId]!;
    const count = aliveCount(catalog, s);
    const side = battle.sides[s.side];
    const accent = side.playerId ? (state.players[side.playerId]?.color ?? NEUTRAL_ACCENT) : NEUTRAL_ACCENT;
    const hpTxt = `${frontHp(catalog, s)}hp`;
    const label = unitLabels === 'count' ? String(count) : unitLabels === 'health' ? hpTxt : `${count} · ${hpTxt}`;
    return {
      id: s.id,
      creatureId: s.creatureId,
      side: s.side,
      body: def.presentation.bodyProfile,
      upgraded: def.form === 'upgraded',
      accent,
      anchor: s.anchor,
      facing: s.facing,
      footprint: statsOf(catalog, s.creatureId).footprint,
      count,
      alive: s.totalHp > 0,
      active: deploySide ? deploySel === s.id : battle.activeStackId === s.id,
      label,
      labelColor: s.side === 'attacker' ? '#dbe8ff' : '#ffd9d2',
    };
  });
  let moves: BattleCell[] = [];
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
    } else if (mode.kind === 'ability') {
      const ab = la.abilities.find((x) => x.abilityId === mode.abilityId);
      targets = (ab?.targets ?? []).flatMap(cellsOf);
    } else if (mode.kind === 'intervention') {
      targets = Object.values(battle.stacks)
        .filter((x) => x.totalHp > 0 && x.side !== la.side)
        .flatMap((x) => cellsOf(x.id));
    } else if (mode.kind === 'miracles') {
      targets = [];
    } else {
      targets = (battle.siege?.structures ?? []).filter((x) => la.structureTargets.includes(x.id)).flatMap((x) => x.cells);
    }
    if (hover) {
      const occId = occ.get(cellKey(hover.cell)) ?? null;
      hoverTarget = occId;
      const active = battle.stacks[la.stackId]!;
      if (mode.kind === 'normal' && occId && battle.stacks[occId]?.side !== la.side && !la.shootTargets.includes(occId)) {
        const m = la.melee.find((x) => x.targetId === occId);
        // Hover comes from the 3D scene, so the 3D layer (and its board transform) is loaded here.
        const cellWorld = presentation()?.cellWorld;
        if (m && cellWorld) {
          const w = cellWorld(hover.cell, 1);
          const px = w.x + hover.offset.x;
          const pz = w.z + hover.offset.z;
          let best = m.options[0]!;
          let bd = Infinity;
          for (const o of m.options) {
            const ow = cellWorld(o.from, 1);
            const d = (ow.x - px) ** 2 + (ow.z - pz) ** 2 + o.distance * 0.001;
            if (d < bd) {
              bd = d;
              best = o;
            }
          }
          attackFrom = best.from;
          if (!cellEquals(best.from, active.anchor)) path = routeTo(active, reachableAnchors(catalog, battle, active), best.from);
        }
      } else if (mode.kind === 'normal' && !occId && la.moves.some((c) => cellEquals(c, hover.cell))) {
        path = routeTo(active, reachableAnchors(catalog, battle, active), hover.cell);
      }
    }
  }
  let zone: BattleCell[] = [];
  if (deploySide && battle.phase === 'deployment') {
    const z = deploymentZone(catalog, battle, deploySide);
    for (let col = z.minCol; col <= z.maxCol; col++) for (let row = 0; row < battle.rows; row++) zone.push({ col, row });
    const sel = deploySel ? battle.stacks[deploySel] : undefined;
    if (sel) moves = deploymentAnchors(catalog, battle, sel);
  }
  const siege = battle.siege && battle.siege.level > 0 ? { structures: battle.siege.structures, moat: battle.siege.moat, wallCol: battle.siege.wallCol } : null;
  const highlightKey = `${deploySel ?? ''}|${zone.length}|${state.revision}|${mode.kind}|${'spellId' in mode ? mode.spellId : 'abilityId' in mode ? mode.abilityId : ''}|${path?.map(cellKey).join(';') ?? ''}|${attackFrom ? cellKey(attackFrom) : ''}|${la?.stackId ?? ''}`;
  return {
    view: { battleId: battle.battleId, cols: battle.cols, rows: battle.rows, obstacles: battle.obstacles, archetype: battle.archetype, stacks, moves, targets, path, attackFrom, highlightKey, grid, siege, zone },
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
  const [mode, setMode] = useState<Mode>({ kind: 'normal' });
  const [hover, setHover] = useState<{ cell: BattleCell; offset: { x: number; z: number } } | null>(null);
  const [auto, setAuto] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const [deploySel, setDeploySel] = useState<string | null>(null);
  const [, force] = useState(0);
  const battleId = battle?.battleId ?? '';
  const log = LOGS.get(battleId) ?? [];

  const humanTurn = !ended && !!battle && battle.status === 'active' && session.isHumanTurn();
  const humanSide = battle ? Object.values(battle.sides).find((s) => s.controller === 'human') : undefined;
  const la = humanTurn && !store.presentationBusy ? legalActions(catalog, state) : null;
  /** The human side still arranging its deployment zone (Tactics), if any. */
  const deploySide = battle?.phase === 'deployment' && humanTurn ? (battle.deployment?.pending.find((x) => battle.sides[x].controller === 'human') ?? null) : null;
  const selecting = battle?.phase === 'selection' && humanTurn && !!battle.selection;
  const built = useMemo(
    () => (battle ? buildView(catalog, state, la, mode, hover, store.prefs.unitLabels, store.prefs.hexOverlay !== 'off', deploySel, deploySide) : null),
    [catalog, state, la, mode, hover, store.prefs.unitLabels, store.prefs.hexOverlay, battle, deploySel, deploySide],
  );

  useEffect(() => {
    // After the battle ended the board keeps what the final playback showed.
    if (built && !ended) ctrl.current?.update(built.view);
  }, [built, ended]);
  // The controller can arrive after the first render (the 3D layer loads on demand).
  const builtRef = useRef(built);
  builtRef.current = built;

  useEffect(() => {
    if (humanTurn) store.showHint('first_battle');
  }, [humanTurn, store]);

  // Reset mode whenever the active stack changes.
  useEffect(() => {
    setMode({ kind: 'normal' });
  }, [battle?.activeStackId, battle?.round]);
  useEffect(() => {
    if (battle?.phase !== 'deployment') setDeploySel(null);
  }, [battle?.phase]);

  // Playback + combat log from committed events.
  useEffect(() => {
    return store.registerPresenter(async (events) => {
      const s = store.session?.state;
      const b = s?.battle ?? null;
      const ref = b ?? null;
      const id = ref?.battleId ?? battleId;
      const lines = LOGS.get(id) ?? [];
      for (const e of events) {
        const snapshotBattle = ref ?? state.battle;
        if (!snapshotBattle) continue;
        const text = describe(catalog, snapshotBattle, e, store.prefs.combatLogDetail);
        if (text) lines.push(text);
      }
      LOGS.set(id, lines.slice(-200));
      force((n) => n + 1);
      const c = ctrl.current;
      if (c && events.some((e) => e.kind.startsWith('Battle'))) await c.play(events, battlePlaybackFactor(store.prefs));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store, catalog, battleId]);

  // Auto-combat for the human side (the tactical AI chooses; the processor validates).
  useEffect(() => {
    if (!auto || !humanTurn || store.presentationBusy) return;
    const t = setTimeout(() => {
      if (store.session === session && session.isHumanTurn() && !store.presentationBusy) session.autoBattleStep();
    }, 90);
    return () => clearTimeout(t);
  }, [auto, humanTurn, store.presentationBusy, state.revision, session, store]);

  const act = (payload: Parameters<typeof store.dispatch>[0]) => {
    setMode({ kind: 'normal' });
    store.dispatch(payload);
  };

  const onCellClick = (cell: BattleCell, button: number, offset: { x: number; z: number }) => {
    const s = store.session?.state;
    const b = s?.battle;
    if (!s || !b) return;
    const occ = Object.values(b.stacks).find((st) => st.totalHp > 0 && stackCells(catalog, st).some((c) => cellEquals(c, cell)));
    if (button === 2) {
      if (occ) store.openOverlay({ kind: 'stack-info', creatureId: occ.creatureId, count: aliveCount(catalog, occ) });
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
    if (!legal) return;
    if (mode.kind === 'structure') {
      const st = b.siege?.structures.find((x) => x.cells.some((c) => cellEquals(c, cell)));
      if (st && legal.structureTargets.includes(st.id)) act({ kind: 'BattleAttackStructure', stackId: legal.stackId, structureId: st.id });
      else store.toast('Choose a highlighted wall section', 'error');
      return;
    }
    if (mode.kind === 'spell') {
      const sp = legal.spells.find((x) => x.spellId === mode.spellId);
      if (occ && sp?.targets.includes(occ.id)) act({ kind: 'BattleCastSpell', spellId: mode.spellId, targetId: occ.id });
      else store.toast('Choose a highlighted target', 'error');
      return;
    }
    if (mode.kind === 'intervention') {
      if (occ && occ.side !== legal.side) act({ kind: 'BattleInvokeIntervention', interventionId: mode.interventionId, targetId: occ.id });
      else store.toast('Choose an enemy stack', 'error');
      return;
    }
    if (mode.kind === 'ability') {
      const ab = legal.abilities.find((x) => x.abilityId === mode.abilityId);
      if (occ && ab?.targets.includes(occ.id)) act({ kind: 'BattleUseAbility', stackId: legal.stackId, abilityId: mode.abilityId, targetId: occ.id });
      else store.toast('Choose a highlighted target', 'error');
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
        const range = me ? shootingRange(catalog, me.creatureId) : 0;
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

  const factory = useCallback<SceneFactory<BattleSceneController>>(
    (lib, engine, canvas) =>
      new lib.BattleSceneController(engine, canvas, {
        onCellClick: (c, b, o) => clickRef.current(c, b, o),
        onCellHover: (c, o) => setHover(c ? { cell: c, offset: o } : null),
        onCue: (cue) => store.audio?.battleCue(cue),
      }),
    [],
  );
  const onController = useCallback((c: BattleSceneController | null) => {
    ctrl.current = c;
    projectors.battle = c ? (col, row) => toPage(c.projectCell({ col, row })) : undefined;
    if (c && builtRef.current) c.update(builtRef.current.view);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keyboard shortcuts.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (store.overlays.length || store.story.length || e.ctrlKey || e.metaKey) return;
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
      if (is('battle_auto') && humanSide) {
        setAuto((a) => !a);
        return;
      }
      if (!la) return;
      if (is('battle_wait') && la.canWait) act({ kind: 'BattleWait', stackId: la.stackId });
      else if (is('battle_defend')) act({ kind: 'BattleDefend', stackId: la.stackId });
      else if (is('battle_spell') && la.castAvailable && la.spells.some((x) => x.castable)) setMode({ kind: 'spell', spellId: la.spells.find((x) => x.castable)!.spellId });
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
    return { side, name: side.commander?.name ?? (sideId === 'defender' ? battle.encounter.label : 'Attacker'), owner: pl?.name ?? 'Neutral', total: stacks.reduce((n, s) => n + aliveCount(catalog, s), 0), color: pl?.color ?? NEUTRAL_ACCENT, mana: commanderMana(state, side) };
  };
  const att = sideInfo('attacker');
  const def = sideInfo('defender');
  const hoverStack = built?.hoverTarget ? battle.stacks[built.hoverTarget] : undefined;
  let preview: { main: DamagePreview | null; ret: DamagePreview | null; label: string } | null = null;
  if (la && hoverStack && hoverStack.side !== la.side && mode.kind === 'normal') {
    if (la.shootTargets.includes(hoverStack.id)) preview = { main: previewShot(catalog, state, la.stackId, hoverStack.id), ret: null, label: 'Shot' };
    else if (built?.attackFrom) preview = { main: previewMelee(catalog, state, la.stackId, hoverStack.id, built.attackFrom), ret: previewRetaliation(catalog, state, la.stackId, hoverStack.id), label: 'Melee' };
  }
  const castable = la ? la.spells.filter((s) => s.castable) : [];
  const actingPlayer = la ? battle.sides[la.side].playerId : null;
  const miracles = actingPlayer ? interventionsFor(catalog, state, actingPlayer).filter((d) => d.context === 'battle') : [];

  return (
    <div className="battle">
      <SceneViewport factory={factory} onController={onController} className="battle__scene" label="Tactical battlefield" />
      <header className="battle-top">
        <div className="battle-side battle-side--att" style={{ ['--side' as string]: att.color }}>
          <div className="battle-side__name">{att.name}</div>
          <div className="small dim">
            {att.owner} · {att.total} creatures{att.side.commander?.spellbook ? ` · ${att.mana} mana` : ''}
          </div>
          <div className="row gap wrap small" data-testid="effects-attacker">
            {effectChips(att.side.effects).map((c) => (
              <Chip key={c.key} tone="info" title={c.title}>
                {c.text}
              </Chip>
            ))}
          </div>
        </div>
        <div className="battle-round">
          <div className="battle-round__label">{battle.phase === 'deployment' ? 'Deployment' : battle.phase === 'selection' ? 'Defenders' : 'Round'}</div>
          <div className="battle-round__n num">{battle.round || '—'}</div>
          <div className="faint small">{battle.phase === 'waiting' ? 'Waiting phase' : battle.encounter.label}</div>
        </div>
        <div className="battle-side battle-side--def" style={{ ['--side' as string]: def.color }}>
          <div className="battle-side__name">{def.name}</div>
          <div className="small dim">
            {def.owner} · {def.total} creatures{def.side.commander?.spellbook ? ` · ${def.mana} mana` : ''}
          </div>
          <div className="row gap wrap small" style={{ justifyContent: 'flex-end' }} data-testid="effects-defender">
            {effectChips(def.side.effects).map((c) => (
              <Chip key={c.key} tone="info" title={c.title}>
                {c.text}
              </Chip>
            ))}
          </div>
          {battle.siege && battle.siege.level > 0 ? (
            <div className="siege-status small" data-testid="siege-status" aria-label="Fortifications">
              {battle.siege.structures.map((x) => (
                <span key={x.id} className={x.hp <= 0 ? 'siege-status__item is-down' : 'siege-status__item'} title={`${structureLabel(x.id)}: ${x.hp}/${x.maxHp} structure points`}>
                  {structureLabel(x.id).replace('Wall section ', 'W')} {x.hp}/{x.maxHp}
                </span>
              ))}
            </div>
          ) : null}

        </div>
      </header>
      <div className="turn-order" aria-label="Turn order">
        {order.current.slice(0, 11).map((id, i) => {
          const s = battle.stacks[id]!;
          return (
            <div key={`c-${id}`} className={`turn-order__item side-${s.side} ${i === 0 ? 'is-active' : ''}`} title={`${catalog.creatures[s.creatureId]?.name} (${s.side})`}>
              <CreaturePortrait catalog={catalog} creatureId={s.creatureId} size="2.6rem" count={aliveCount(catalog, s)} />
            </div>
          );
        })}
        <div className="turn-order__sep" title="Next round">
          R{battle.round + 1}
        </div>
        {order.next.slice(0, 5).map((id) => {
          const s = battle.stacks[id]!;
          return (
            <div key={`n-${id}`} className={`turn-order__item side-${s.side} is-next`}>
              <CreaturePortrait catalog={catalog} creatureId={s.creatureId} size="2.1rem" />
            </div>
          );
        })}
      </div>

      {preview && hoverStack ? (
        <div className="battle-preview panel" role="status">
          <div className="battle-preview__title">
            {preview.label}: {activeDef?.pluralName} → {catalog.creatures[hoverStack.creatureId]?.pluralName} ({aliveCount(catalog, hoverStack)})
          </div>
          <PreviewLine label="Expected" p={preview.main} />
          {preview.ret ? <PreviewLine label="Retaliation (if they survive)" p={preview.ret} /> : preview.label === 'Melee' ? <div className="faint small">No retaliation expected.</div> : null}
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

      <footer className="battle-bottom panel">
        {active && activeDef ? (
          <div className="active-card">
            <CreaturePortrait catalog={catalog} creatureId={active.creatureId} size="4rem" count={aliveCount(catalog, active)} />
            <div>
              <div className="active-card__name">
                {activeDef.pluralName} <span className="faint small">({active.side}{battle.activeIsBonus ? ', morale bonus' : ''})</span>
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
              <Bar value={frontHp(catalog, active)} max={activeDef.stats?.hp ?? 1} kind="hp" label="Front creature health" />
            </div>
          </div>
        ) : (
          <div className="active-card dim">No active stack</div>
        )}
        <div className="battle-actions">
          {!humanTurn ? (
            <span className="dim small">
              <span className="spinner" /> {store.presentationBusy ? 'Resolving…' : 'Enemy turn…'}
            </span>
          ) : deploySide ? (
            <>
              <span className="small" data-testid="deploy-hint">
                Deploy your army inside the shaded {battle.deployment?.columns[deploySide] ?? 2} columns (Tactics). {deploySel ? 'Click a highlighted hex, or another stack to swap.' : 'Click one of your stacks to move it.'}
              </span>
              <Button variant="primary" icon="play" onClick={() => store.dispatch({ kind: 'BattleConfirmDeployment' })} data-testid="deploy-confirm">
                Start battle
              </Button>
            </>
          ) : selecting ? (
            <span className="small dim">Choose the town’s defenders.</span>
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
              <span className="small">Divine intervention ({state.players[actingPlayer]?.wallet.favor ?? 0} Favor):</span>
              {miracles.map((d) => {
                const q = quoteIntervention(catalog, state, actingPlayer, d.id, { stackId: d.target === 'enemy_stack' ? (Object.values(battle.stacks).find((x) => x.totalHp > 0 && x.side !== la.side)?.id ?? null) : null });
                return (
                  <Button
                    key={d.id}
                    size="small"
                    icon="favor"
                    disabled={!q.legal}
                    disabledReason={q.reason}
                    title={d.summary}
                    onClick={() => {
                      if (d.target === 'enemy_stack') setMode({ kind: 'intervention', interventionId: d.id });
                      else store.confirm(`Invoke ${d.name}?`, `${d.summary} Costs ${d.favorCost} Favor; the gods answer once per week.`, 'Invoke', () => act({ kind: 'BattleInvokeIntervention', interventionId: d.id }));
                    }}
                    data-testid={`battle-miracle-${d.id}`}
                  >
                    {d.name} ({d.favorCost})
                  </Button>
                );
              })}
              <Button size="small" onClick={() => setMode({ kind: 'normal' })}>
                Cancel
              </Button>
            </>
          ) : mode.kind === 'intervention' ? (
            <>
              <span className="small">{catalog.interventions?.[mode.interventionId]?.name}: choose an enemy stack.</span>
              <Button size="small" onClick={() => setMode({ kind: 'normal' })}>
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
              {mode.kind === 'spell' && castable.length > 1
                ? castable.map((sp) => (
                    <Button key={sp.spellId} size="small" variant={mode.spellId === sp.spellId ? 'primary' : undefined} onClick={() => setMode({ kind: 'spell', spellId: sp.spellId })}>
                      {sp.name} ({sp.manaCost})
                    </Button>
                  ))
                : null}
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
              <Button
                icon="spell"
                onClick={() => castable[0] && setMode({ kind: 'spell', spellId: castable[0].spellId })}
                disabled={!la.castAvailable || castable.length === 0}
                disabledReason={!la.spells.length ? 'Your commander knows no battle spells' : !la.castAvailable ? 'One spell per round' : (la.spells[0]?.reason ?? 'Not enough mana')}
                title="Cast spell (S)"
              >
                Spell
              </Button>
              {miracles.length > 0 ? (
                <Button icon="favor" onClick={() => setMode({ kind: 'miracles' })} title="Divine interventions (Favor, once per week)" data-testid="battle-miracles">
                  Miracle
                </Button>
              ) : null}
              {la.structureTargets.length > 0 || la.structureBlockedReason ? (
                <Button icon="sword2" onClick={() => setMode({ kind: 'structure' })} disabled={la.structureTargets.length === 0} disabledReason={la.structureBlockedReason} title="Spend this activation and one shot to remove 1 structure point" data-testid="battle-structure">
                  Batter walls
                </Button>
              ) : null}
              {la.abilities.map((a) =>
                a.label ? (
                  // Self-only abilities (Shapeshift) act at once; free ones keep the activation.
                  <Button
                    key={a.abilityId}
                    icon="ability"
                    onClick={() => act({ kind: 'BattleUseAbility', stackId: la.stackId, abilityId: a.abilityId, targetId: la.stackId })}
                    disabled={!!a.reason}
                    disabledReason={a.reason}
                    title={a.free ? 'Free: this stack still acts afterwards' : 'Spends this activation'}
                    data-testid={`battle-ability-${a.abilityId}`}
                  >
                    {a.label}
                    {a.free ? ' (free)' : ''}
                  </Button>
                ) : (
                  <Button key={a.abilityId} icon="ability" onClick={() => setMode({ kind: 'ability', abilityId: a.abilityId })} disabled={!!a.reason || a.targets.length === 0} disabledReason={a.reason} data-testid={`battle-ability-${a.abilityId}`}>
                    {a.name}
                  </Button>
                ),
              )}
              <Button icon="retreat" variant="ghost" disabled={!la.canRetreat} disabledReason={battle.encounter.kind === 'town_siege' && la.side === 'defender' ? 'A town defender cannot retreat' : 'Only a hero commander can retreat'} onClick={() => store.confirm('Retreat?', 'Your hero escapes with no army. The surviving troops are lost.', 'Retreat', () => act({ kind: 'BattleRetreat' }), { danger: true })}>
                Retreat
              </Button>
              {la.canSurrender ? (
                <Button icon="surrender" variant="ghost" onClick={() => store.confirm('Surrender?', `Pay ${la.surrenderCost} Gold to keep your surviving army and leave the field.`, 'Surrender', () => act({ kind: 'BattleSurrender' }))}>
                  Surrender ({la.surrenderCost})
                </Button>
              ) : null}
            </>
          ) : null}
        </div>
        <div className="battle-tools">
          <Button icon="auto" variant={auto ? 'primary' : undefined} onClick={() => setAuto((a) => !a)} disabled={!humanSide} title="Auto-combat: the tactical AI plays your stacks (Q)" data-testid="battle-auto">
            {auto ? 'Auto: on' : 'Auto'}
          </Button>
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

/** BAT-14: the human town defender picks at most seven stacks; the rest wait in reserve. */
function DefenderSelection() {
  const store = useStore();
  const catalog = store.catalog;
  const state = store.session!.state;
  const battle = state.battle!;
  const sel = battle.selection!;
  const visitorName = battle.sides.defender.commander?.name ?? 'Visiting hero';
  const [picked, setPicked] = useState<number[]>(() => sel.candidates.map((_, i) => i).slice(0, sel.max));
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
      <p className="faint small">Merging identical stacks before a siege is not available in this build.</p>
    </Modal>
  );
}
