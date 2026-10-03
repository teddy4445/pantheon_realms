/**
 * Which cursor the mouse shows on the adventure map and the battlefield. Pure
 * functions of what the screens already compute for their hover previews (the
 * route quote, the legal battle actions, the melee side under the mouse), so
 * the cursor never disagrees with what a click does. Presentation only.
 */
import {
  heroInTown,
  cellEquals,
  hasFlight,
  hexEquals,
  previewShot,
  quoteAdventureSpell,
  quoteMovement,
  siegeTownAt,
  siteAt,
  stackCells,
  type BattleCell,
  type BattleLegalActions,
  type ContentCatalog,
  type HeroState,
  type HexCoord,
  type MatchState,
  axialDistance,
} from '@pr/rules';
import { meleeAngle, type CursorId } from '../assets/cursors';

export interface CursorChoice {
  readonly id: CursorId;
  /** Melee only: the sword's angle on screen. */
  readonly angle?: number;
}

/** Adventure map: what a left click on the hovered tile would do. */
export function adventureCursor(
  catalog: ContentCatalog,
  state: MatchState,
  viewerId: string,
  selected: HeroState | null,
  hover: HexCoord | null,
  ctx: { humanTurn: boolean; casting: string | null; dragging: boolean },
): CursorChoice {
  if (ctx.dragging) return { id: 'cursor.ui.grabbing' };
  if (!ctx.humanTurn) return { id: 'cursor.ui.busy' };
  if (!hover) return { id: 'cursor.ui.default' };
  if (ctx.casting) {
    if (!selected) return { id: 'cursor.blocked' };
    return { id: quoteAdventureSpell(catalog, state, viewerId, selected.id, ctx.casting, hover).legal ? 'cursor.spell' : 'cursor.blocked' };
  }
  const own = Object.values(state.heroes).find((h) => h.status === 'active' && h.ownerId === viewerId && hexEquals(h.position, hover));
  const site = siteAt(catalog, state, hover);
  const ownTown = site?.def.kind.type === 'town' ? state.towns[site.def.kind.townId] : undefined;
  // Another own hero next to the selected one: meet and trade troops; farther away: select it.
  if (own && selected && own.id !== selected.id && axialDistance(own.position, selected.position) === 1) return { id: 'cursor.map.meet' };
  if (own && (!selected || own.id !== selected.id)) return { id: 'cursor.map.hero' };
  if (!selected) return { id: ownTown?.ownerId === viewerId ? 'cursor.map.town' : 'cursor.ui.default' };
  if (hexEquals(selected.position, hover)) return { id: ownTown?.ownerId === viewerId ? 'cursor.map.town' : 'cursor.map.hero' };
  // The town itself while the hero stands at its gate: a click opens the town.
  if (ownTown && heroInTown(catalog, state, selected, ownTown.id)) return { id: ownTown.ownerId === viewerId ? 'cursor.map.town' : 'cursor.map.hero' };
  const q = quoteMovement(catalog, state, selected.id, hover);
  if (!q.reachable) return { id: 'cursor.blocked' };
  if (q.endsInEncounter) return { id: site && siegeTownAt(catalog, state, site, viewerId) ? 'cursor.map.siege' : 'cursor.map.attack' };
  if (ownTown?.ownerId === viewerId) return { id: 'cursor.map.town' };
  // An undefended enemy or neutral town is taken by walking in.
  if (ownTown) return { id: 'cursor.map.siege' };
  if (site && site.def.kind.type === 'portal') return { id: 'cursor.map.portal' };
  if (site && site.def.kind.type !== 'town') return { id: 'cursor.map.visit' };
  return { id: q.reachesDestinationToday ? 'cursor.map.move' : 'cursor.map.move_later' };
}

export type BattleMode =
  | { kind: 'normal' }
  | { kind: 'spell'; spellId: string }
  | { kind: 'ability'; abilityId: string }
  | { kind: 'structure' }
  | { kind: 'miracles' }
  | { kind: 'intervention'; interventionId: string };

/** On-screen direction of a cell (x right, y down), the battle board's own layout (pointy-top, odd rows shifted). */
function cellScreen(c: BattleCell): { x: number; y: number } {
  return { x: Math.sqrt(3) * (c.col + 0.5 * (c.row & 1)), y: 1.5 * c.row };
}

/** Battlefield: what a left click on the hovered cell would do for the active stack. */
export function battleCursor(
  catalog: ContentCatalog,
  state: MatchState,
  la: BattleLegalActions | null,
  mode: BattleMode,
  hover: BattleCell | null,
  attackFrom: BattleCell | null,
  ctx: { battleActive: boolean; deploying: boolean },
): CursorChoice {
  const battle = state.battle;
  if (!battle || !ctx.battleActive) return { id: 'cursor.ui.default' };
  if (ctx.deploying) return { id: 'cursor.ui.pointer' };
  if (!la) return { id: 'cursor.ui.busy' };
  if (!hover) return { id: 'cursor.ui.default' };
  const occ = Object.values(battle.stacks).find((s) => s.totalHp > 0 && stackCells(catalog, s).some((c) => cellEquals(c, hover)));
  if (mode.kind === 'structure') {
    const st = battle.siege?.structures.find((x) => x.cells.some((c) => cellEquals(c, hover)));
    return { id: st && la.structureTargets.includes(st.id) ? 'cursor.battle.structure' : 'cursor.blocked' };
  }
  if (mode.kind === 'spell') {
    const sp = la.spells.find((x) => x.spellId === mode.spellId);
    return { id: occ && sp?.targets.includes(occ.id) ? 'cursor.spell' : 'cursor.blocked' };
  }
  if (mode.kind === 'intervention') return { id: occ && occ.side !== la.side ? 'cursor.spell' : 'cursor.blocked' };
  if (mode.kind === 'ability') {
    const ab = la.abilities.find((x) => x.abilityId === mode.abilityId);
    return { id: occ && ab?.targets.includes(occ.id) ? 'cursor.battle.ability' : 'cursor.blocked' };
  }
  if (mode.kind === 'miracles') return { id: 'cursor.ui.default' };
  if (occ && occ.side !== la.side) {
    if (la.shootTargets.includes(occ.id)) {
      const p = previewShot(catalog, state, la.stackId, occ.id);
      const weak = !!p?.notes.some((n) => n.startsWith('Far half of range') || n.startsWith('Behind the walls'));
      return { id: weak ? 'cursor.battle.shoot_weak' : 'cursor.battle.shoot' };
    }
    if (attackFrom) {
      const from = cellScreen(attackFrom);
      const to = cellScreen(hover);
      return { id: 'cursor.battle.melee', angle: meleeAngle(to.x - from.x, to.y - from.y) };
    }
    return { id: 'cursor.blocked' };
  }
  if (occ) return { id: 'cursor.battle.info' };
  if (la.moves.some((c) => cellEquals(c, hover))) {
    const active = battle.stacks[la.stackId];
    return { id: active && hasFlight(catalog, active.creatureId) ? 'cursor.battle.fly' : 'cursor.battle.move' };
  }
  return { id: 'cursor.blocked' };
}
