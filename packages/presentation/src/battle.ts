import { segmentProgress } from './animationTiming';
import { dragonAbilityRecipe } from './neutralDragonArt';
import { playPaintedMagic } from './paintedMagic';
/**
 * BattleSceneController (S11): the tactical battle in 2D —
 *
 *   painted battlefield background
 *   + logical hex overlay (cells, deployment zone, moat, town side, grid)
 *   + highlights (moves, targets, route, attack side, hover, active stack)
 *   + obstacle and siege sprites, creature stacks (depth-sorted)
 *   + projectiles and spell/combat effects, floating numbers
 *   (+ the React battle HUD around the canvas).
 *
 * All outcomes (damage, kills, destruction) are already committed by the rules
 * before playback starts; this controller only visualises GameEvents. Instant
 * playback (speed 0) completes synchronously and cannot change any result.
 * Creature sprites face right; the defending side is mirrored.
 */
import { Container, Graphics, Sprite, Text, Texture, Rectangle } from 'pixi.js';
import type { BattleCell, GameEvent } from '@pr/rules';
import type { EngineHost, FramePace, SceneController } from './engineHost';
import { BATTLE_SQUASH, SQRT3, cellPoint, cellPointOn, hexPolygon, layoutBoardProjection, pickCellOn, pickTableCell, plainBoardProjection, tableCellPoint, tableCellPolygon, tableProjection, type BoardProjection, type NormalizedBoardProjection, type NormalizedCell, type TableProjection } from './hexmath';
import { ActionTokens, hoverPx, overOpenWater, travelLiftPx, waterDeathSettle } from './seaBattle';
import { tileNoise } from './palette';
import { TweenPlayer, easeInOut, easeOut, linear } from './tween';
import { BATTLEFIELD_LAYOUT, SIEGE_GROUND_SHIFT, battlefieldArt } from './environmentArt';
import { graphicsProfile } from './graphics';
import { SpriteFigure } from './figure';
import { creatureSprites, spriteManifest, spriteUrl, stripFrameCount, type EffectDefinition, type ProfileSound, type ProjectileProfile, type StaticSpriteDefinition } from './sprites';
import { loadStrip, loadTexture, stripFrames } from './textures';
import {
  LEGACY_RELEASE_MS,
  REDUCED_IMPACT_MS,
  SIEGE_PROFILE_IDS,
  arcHeight,
  contactPoint,
  fitArc,
  effectFrameTransform,
  flightMs,
  impactAlpha,
  impactDurationMs,
  impactFrame,
  legacyFlightMs,
  missileFor,
  missileTransform,
  profileForCreature,
  releasePoint,
  regionReleaseSocket,
  releaseSocket,
  samplePath,
  travelRotation,
  travelFrame,
  travelStrip,
  type MissileChoice,
  type ReleaseSocket,
} from './projectiles';
import { colorOf, groundShadow, stillHeight, stillSprite, stillTexture } from './staticSprites';
import { FxPainter, StatusAura, type FxTarget } from './fx';
import { battleObstacleId } from './nature';
import { SIEGE_ROW, siegeKeepPoint, siegePaintingRect, siegeWallPoint } from './siegeLayout';
import { connectedWall, paintedWall, siegeGroundLayer } from './siegeScenery';
import { GATE_FIT, gateJambs, isWallGate, wallGateParts, wallGateShift, type GateNeighbour } from './siegeGate';
import type { FxLook, FxSound, StatusOverlay } from './fxLooks';
import { KILL_FLASH, hitStopMs, killFlashShown, nextBadge, type BadgeShown } from './impactTiming';
import { CATAPULT_INTACT_VISIBLE, ENGINE_ART_FACING, catapultArc, engineDrawnBox, engineStageDraw, engineStageOf, type EngineStage, type EngineStageArt } from './siegeEngine';

/** Hex radius in board pixels before the fit-to-view scale. */
const RB = 40;
const S = BATTLE_SQUASH;
const HEX_W = SQRT3 * RB;
/** The status icon beside a damage spell's number, by its look's school (Brief 13 art; others show none). */
const SPELL_HURT_ICON: Partial<Record<FxLook['school'], string>> = {
  fire: 'icon.status.burning',
  hearth: 'icon.status.burning',
  obsidian: 'icon.status.burning',
  frost: 'icon.status.frozen',
  strike: 'icon.fx.lightning',
  storm: 'icon.fx.lightning',
  shadow: 'icon.fx.shadow',
  curse: 'icon.fx.shadow',
  blight: 'icon.status.poison',
  swarm: 'icon.status.poison',
};
/** Icons beside the words of creature abilities and the statuses they leave (the campaign kit's reused badges). */
const ABILITY_ICONS = ['icon.ability.family_ward', 'icon.ability.charge_guard', 'icon.action.ability'];
const FLOAT_ICONS = ['icon.stat.luck', 'icon.fx.shield', 'icon.action.defend', 'icon.action.wait', 'icon.stat.morale', 'icon.status.stun', 'icon.status.heal', ...new Set(Object.values(SPELL_HURT_ICON)), ...ABILITY_ICONS];
/** Stack marks: at most this many icons over a count badge, each a disc of this radius (board px). */
const MAX_MARKS = 5;
const MARK_R = 12;
/** Drawn size of a projectile against its art's scale: arrows a third (owner request 2026-10-05; the art spans 1.4 hexes). Generic fallback stills only. */
const PROJECTILE_SIZE: Readonly<Record<string, number>> = { arrow: 1 / 3 };
/** The shoot strip runs at least this long (`strike`); a wall breaker's throw at least `THROW_MIN_MS`. */
const SHOOT_MIN_MS = 560;
const THROW_MIN_MS = 400;
/** Missiles kept in the read-only shot log (`projectileDebug`). */
const SHOT_LOG = 30;

type Pt = { x: number; y: number };

/**
 * One missile as the battle view played it (read-only diagnostics, `projectileDebug()`; reachable
 * under `?e2e` through `__prSiege().projectiles`): which profile flew or which generic still stood
 * in, where it left and met (canvas CSS pixels), its path and flight time, and the controller-clock
 * times of launch, arrival, the impact's first frame and the target's reaction.
 */
export interface ShotRecord {
  readonly seq: number;
  readonly event: string;
  readonly source: 'creature' | 'turret' | 'catapult';
  readonly creatureId: string | null;
  readonly profile: string | null;
  fallback: string | null;
  readonly path: string;
  readonly playback: string;
  readonly from: Pt;
  readonly to: Pt;
  /** Board points (before the view's fit and zoom). */
  readonly boardFrom: Pt;
  readonly boardTo: Pt;
  readonly facing: 1 | -1;
  readonly socket: (ReleaseSocket & { readonly calibrated: boolean }) | null;
  readonly mirroredBoard: boolean;
  /** The tween clock's speed factor at launch (1 normal, 0.5 at 2×, 2 at 0.5×). */
  readonly speed: number;
  /** Size of one full travel cell in hexes (profile `sizeHex`), as drawn. */
  drawnHex: number | null;
  flightMs: number;
  arc: number;
  launchAngle: number;
  arrivalAngle: number;
  /** The travel art's painted-direction correction (degrees; 180 for Deepwater Blast, 0 for the rest); impacts never get it. */
  travelOffsetDeg: number;
  readonly launchedAt: number;
  arrivedAt: number | null;
  impact: string | null;
  /** How many impacts this missile started (one, or none when the art is missing over a creature). */
  impacts: number;
  impactAt: number | null;
  impactFrames: number[];
  /** When the impact's last frame went (it never loops). */
  impactEndAt: number | null;
  impactScale: number | null;
  reactAt: number | null;
  /**
   * The target stack's shown count (its badge text) when the missile left and right after it
   * struck, and the controller time it changed at the blow (null: it did not change then). Held
   * for playback, a target's count changes at the impact, never before (null for a wall).
   */
  labelAtLaunch: string | null;
  labelAtImpact: string | null;
  badgeAt: number | null;
  /** The hit-stop the blow started (nominal ms, × `speed`; 0: it killed none) and whether it flashed. */
  hitStopMs: number;
  killFlash: boolean;
  /** The presentation cues of this missile in order (launch, impact) with the sound each carried. */
  cues: ShotCue[];
}

/** One cue of a missile as sent to the cue listener (read-only diagnostics). */
export interface ShotCue {
  readonly kind: BattleCueKind;
  /** The profile's sound the cue carried (null: the listener plays the kind's own sound). */
  readonly sound: string | null;
  readonly maxMs: number | null;
  /** Controller clock (ms). */
  readonly at: number;
}

/** The read-only missile readout: how many are in the air now and the last ones flown. */
export interface ProjectileDebug {
  /** The controller clock now (ms; the shot times are on it). */
  readonly time: number;
  readonly inFlight: number;
  /** Pictures on the effect layer now (missiles, impacts, spell effects): none once playback is over. */
  readonly effects: number;
  readonly shots: readonly ShotRecord[];
}

interface EffectOptions {
  /** Flash colour on Low or when the strip is missing (not for impacts). */
  readonly flash?: number;
  readonly scale?: number;
  /** A missile's impact: played once at its own rate, upright, faded at the end; reduced effects show its first frame only. */
  readonly impact?: boolean;
  readonly fps?: number;
  readonly fadeLastMs?: number;
  /** Blend override (impacts follow their profile: normal alpha for physical dust). */
  readonly additive?: boolean;
  /** Called when the first frame is on screen (diagnostics), and on each frame change. */
  readonly onFrame?: (frame: number, scale: number) => void;
  /** Called when the strip is over (diagnostics). */
  readonly onEnd?: () => void;
  /** Draw the strip mirrored (art that faces the other way, e.g. the siege engine's throw). */
  readonly flipX?: boolean;
}
/** The drawn catapult's arm: lying back at rest, upright against the crossbar when it throws. */
const CATAPULT_REST = Math.PI * 1.04;
const CATAPULT_FIRE = Math.PI * 1.55;
/** The painted catapult (Brief 15) is drawn at this size; its still and throw strip share one frame, anchor and scale. */
const CATAPULT_SPRITE_SCALE = 1.2;
/**
 * The delivered throw strip lets the stone go in frame 5 (index 4, 1/3 s at 12 fps);
 * there the empty cup stands at this point of the frame (fractions of its width
 * and height, measured on the strip). The game's stone starts there.
 */
const CATAPULT_RELEASE = { frame: 4, x: 0.584, y: 0.215 } as const;

export interface BattleStackView {
  readonly id: string;
  /** Creature ID: selects the creature's sprite set. */
  readonly creatureId?: string;
  readonly side: 'attacker' | 'defender';
  readonly illusion?: boolean;
  readonly upgraded: boolean;
  readonly accent: string;
  readonly anchor: BattleCell;
  readonly facing: 1 | -1;
  readonly footprint: 1 | 2;
  readonly count: number;
  readonly alive: boolean;
  readonly active: boolean;
  readonly label: string;
  readonly labelColor: string;
  /** Status overlays to show on the stack (fxLooks.statusOverlays of its statuses). */
  readonly statuses?: readonly StatusOverlay[];
  /** Small icons over the count badge: what affects the stack right now (defending, waiting, aspect, statuses). */
  readonly marks?: readonly BattleStackMark[];
  /** Defending now (a set with delivered event metadata holds its defend pose while it lasts). */
  readonly defending?: boolean;
}

/** One icon over a stack's count (the Brief 13 status, action and miracle icons). Presentation only. */
export interface BattleStackMark {
  /** Interface icon asset ID, resolved by `BattleCallbacks.iconUrl`; a mark without a delivered icon is left out. */
  readonly icon: string;
  /** What it means (the screen shows the same marks with this text). */
  readonly label: string;
}

export interface SiegeStructureView {
  readonly id: string;
  readonly kind: 'wall' | 'gate' | 'tower' | 'keep';
  readonly cells: readonly BattleCell[];
  readonly hp: number;
  readonly maxHp: number;
}

export interface SiegeView {
  readonly structures: readonly SiegeStructureView[];
  readonly moat: readonly BattleCell[];
  readonly wallCol: number;
  /** The defending town's pantheon: its own fortification art and siege battlefield when delivered (Brief 15). */
  readonly pantheonId?: string | null;
  /**
   * The attacker's stationary catapult on the board (`targetableCatapultV1`): drawn on its fixed cells
   * by HP stage, facing the walls. Absent: a legacy siege's catapult west of the field.
   */
  readonly engine?: SiegeEngineView | null;
}

export interface SiegeEngineView {
  readonly id: string;
  readonly side: 'attacker' | 'defender';
  readonly cells: readonly BattleCell[];
  readonly hp: number;
  readonly maxHp: number;
}

/** The catapult's aim while its side chooses a target (presentation only): that structure outlined, a restrained arc from the engine. */
export interface CatapultAimView {
  readonly structureId: string | null;
}

export interface BattleView {
  readonly spellFields?: readonly { kind: 'frost' | 'sanctuary' | 'eclipse' | 'glass'; cells: readonly BattleCell[]; label: string }[];
  readonly battleId: string;
  readonly cols: number;
  readonly rows: number;
  readonly obstacles: readonly BattleCell[];
  readonly archetype: string;
  /** Map climate (picks a battlefield painting variant when one exists; presentation only). */
  readonly climate?: string;
  readonly stacks: readonly BattleStackView[];
  /** Reachable anchors for the active human stack. */
  readonly moves: readonly BattleCell[];
  /** Cells of enemy stacks that can be attacked now (melee or shot). */
  readonly targets: readonly BattleCell[];
  readonly path: readonly BattleCell[] | null;
  readonly attackFrom: BattleCell | null;
  readonly highlightKey: string;
  readonly grid: boolean;
  /** Town fortifications (sieges only). */
  readonly siege: SiegeView | null;
  /** Deployment zone cells to shade while a side arranges its army. */
  readonly zone: readonly BattleCell[];
  /**
   * Creature inspection (expedition kit 2026-10-17; presentation only): the inspected stack's cells,
   * outlined white over a dark rim (high contrast on any ground), and the cells of the stack that applied
   * the effect being read, outlined gold. Absent: nothing outlined (included in `highlightKey`).
   */
  readonly inspected?: readonly BattleCell[];
  readonly inspectedSource?: readonly BattleCell[];
  /** The hovered move's whole footprint (a two-hex creature: both cells), outlined (presentation only). */
  readonly footprint?: readonly BattleCell[];
  /** Reduced motion: status overlays hold still. */
  readonly calm?: boolean;
  /**
   * Presentation only (owner request 2026-10-14): draw the board mirrored, so the defending side
   * stands on the left — used when a human defends against a computer. The rules' cells, facings and
   * hover offsets keep their west-to-east sense; only the picture and the pointer mapping turn round.
   */
  readonly mirrored?: boolean;
  /** The side drawn in blue (the human's); the other side is red. Default: the attacker. */
  readonly blueSide?: 'attacker' | 'defender';
  /** The catapult's target while it is being aimed (`targetableCatapultV1`); null/absent: no aiming marks. */
  readonly catapultAim?: CatapultAimView | null;
  /**
   * A board with a legal-cell mask drawn on its own painting (naval boarding `boarding_two_ships_v1`;
   * absent on land battles and sieges): only its legal cells are drawn, highlighted, hovered or clicked.
   */
  readonly board?: BattleBoardView | null;
}

/** A masked battlefield on a measured painting (expedition kit `boarding-layout.json`). Presentation only. */
export interface BattleBoardView {
  /** Row-major zone letters as the battle stores them (rules `BOARD_ZONE_CODES`; '.' = water). */
  readonly cells: string;
  /** The painting (contain-fitted: letterboxed, never stretched or cropped) and its native size. */
  readonly art: { readonly url: string | null; readonly width: number; readonly height: number };
  /** The measured cell projection in art-normalised units (drawn through `hexmath.layoutBoardProjection`). */
  readonly projection: NormalizedBoardProjection;
  /** The two decks' live owner flags (the painting is shared by every pantheon); absent: no flags (the sea encounter). */
  readonly flags?: { readonly attacker: string; readonly defender: string };
  /**
   * A piecewise board's per-cell projection (sea encounter `single_ship_sea_encounter_v2`): every cell placed and
   * hit-tested by its own entry (`hexmath.tableProjection`), authoritative over `projection`. Absent: the affine projection.
   */
  readonly cellTable?: readonly NormalizedCell[];
  /** Zone letters some creature may stand on (sea encounter: 'k.' — deck and water). Absent: every letter but '.' (boarding). */
  readonly legalCodes?: string;
}

/** Read-only state of a masked board (tests and diagnostics). */
export interface BoardDebug {
  readonly masked: boolean;
  /** A piecewise board (per-cell table: the sea encounter). */
  readonly table?: boolean;
  readonly projection: BoardProjection;
  readonly cell: { readonly radius: number; readonly squash: number };
  /** The painting's rectangle on the page (CSS pixels within the canvas). */
  readonly art: { readonly x: number; readonly y: number; readonly width: number; readonly height: number } | null;
  readonly legalCells: number;
  readonly drawnCells: number;
  readonly flags: readonly { readonly side: 'attacker' | 'defender'; readonly color: string; readonly x: number; readonly y: number }[];
  readonly mirrored: boolean;
}

/** Where the decks' flags stand on the boarding painting (art-normalised: the two bow posts). */
const DECK_FLAG_POSTS = { attacker: { x: 0.254, y: 0.135 }, defender: { x: 0.745, y: 0.135 } } as const;
/** The sea around a letterboxed boarding painting (its own deep-water tone, never a black matte). */
const BOARD_SEA = 0x0b3346;

/**
 * Presentation cues: moments in battle playback that a sound (or any other
 * cosmetic layer) can follow, timed with the animation. Cosmetic only; they
 * carry no rules information that is not already shown.
 */
export type BattleCueKind =
  | 'march'
  | 'flight'
  | 'swing'
  | 'impact'
  | 'shot'
  | 'arrow-hit'
  | 'death'
  | 'cast'
  | 'spell'
  | 'heal'
  | 'bless'
  | 'ward'
  | 'defend'
  | 'morale-up'
  | 'morale-down'
  | 'shapeshift'
  | 'recovery'
  | 'catapult'
  | 'stone-hit'
  | 'breach'
  | 'turret'
  | 'moat';

export interface BattleCue {
  readonly kind: BattleCueKind;
  /** The blow killed creatures (a heavier sound). */
  readonly heavy?: boolean;
  /** Spells and miracles: the sound family of their look (`magic.<sound>`). */
  readonly magic?: FxSound;
  /**
   * A missile's own sound (its profile's release sound with `shot`, `turret` and `catapult`, its
   * impact sound with `arrow-hit` and `stone-hit`), cut at `maxMs` when given. Absent (no profile,
   * an unknown shooter): the kind's own sound.
   */
  readonly sound?: ProfileSound;
}

/** How a battle spell looks (fxLooks.spellLook), with the word shown when it neither hurts nor heals. */
export interface BattleSpellFx extends FxLook {
  readonly label?: string;
  /** Aimed at the enemy (its word is shown in the curse colour). */
  readonly hostile?: boolean;
}

/** How a battle miracle looks, which side invoked it and what it did. */
export interface BattleMiracleFx {
  readonly look: FxLook;
  readonly side: 'attacker' | 'defender';
  /** A smite's damage. */
  readonly damage?: number;
  /** The word shown over the army (status miracles). */
  readonly label?: string;
}

/**
 * How a creature ability's use looks (the interface derives it from the ability's
 * definition): its name over the user, what it did over the target, and where it lands.
 */
export interface BattleAbilityFx {
  /** The ability's name (shown over the user). */
  readonly name: string;
  /** What it did, in a few words (shown over the target). */
  readonly effect: string;
  /** Aimed at the enemy (a feint or a pull: the user lunges; the words take the curse colour). */
  readonly hostile: boolean;
  /** Interface icon asset ID before the name. */
  readonly icon?: string;
  /** Where it lands (code-drawn by the effect painter); null: a flash only. */
  readonly look?: FxLook | null;
}

export interface BattleCallbacks {
  /** `offset`: pointer position inside the cell, in hex radii (x right, y down, foreshortened like the board). */
  onCellClick(c: BattleCell, button: number, offset: { x: number; y: number }): void;
  onCellHover(c: BattleCell | null, offset: { x: number; y: number }): void;
  /** Optional: presentation cues timed with playback (sound). */
  onCue?(cue: BattleCue): void;
  /** Optional: how a spell looks (default: from its damage/heal numbers). */
  spellFx?(spellId: string): BattleSpellFx | null;
  /** Optional: the runtime URL of an interface icon (stack marks and the icons beside floating words); null when not delivered. */
  iconUrl?(assetId: string): string | null;
  iconRegion?(assetId: string): readonly [number, number, number, number] | null;
  /** Optional: how a divine intervention looks in this battle (null: not shown). */
  miracleFx?(interventionId: string, playerId: string): BattleMiracleFx | null;
  /** Optional: how a creature ability's use looks (null: the plain ward look). */
  abilityFx?(ev: { abilityId: string; stackId: string; targetId: string; removedStatus?: string }): BattleAbilityFx | null;
  /**
   * Optional (1.1.4, GUI audit): the board's essential pictures — its battlefield painting and the
   * standing frame of every stack on it — are drawn (or have failed and been replaced by
   * silhouettes): `true`; a new board is loading: `false`. Waits for nothing else.
   */
  onBoardReady?(ready: boolean): void;
  /**
   * Optional (`targetableCatapultV1`): the siege engine's damaged and destroyed pictures (the
   * expedition kit's `expedition.catapult-damaged` / `-destroyed`, with their visible boxes); null
   * when not delivered (the intact still then stands in, tinted).
   */
  engineArt?(stage: 'damaged' | 'destroyed'): EngineStageArt | null;
  /**
   * Optional: a click on a structure that has no board cells (the keep beyond the east edge); cells
   * of walls, gates and towers arrive as ordinary cell clicks.
   */
  onStructureClick?(structureId: string, button: number): void;
}

interface SiegeDrawn {
  gate: { file: string; frame: number[]; hp: number; row: number; passage: { x: number; y: number }; depths: number[]; north: GateNeighbour; south: GateNeighbour } | null;
  wallRows: number[];
}

/** A new board is shown as ready after this long even if its pictures never answer (a hung request). */
const BOARD_READY_CAP_MS = 15_000;

interface StackEntry {
  root: Container;
  figure: SpriteFigure;
  base: Graphics;
  /** Count badge: drawn on its own layer above every figure (large final sprites would cover it), following `root`. */
  badge: Container;
  badgeText: Text;
  badgeBg: Graphics;
  /** The count and colour the badge was last drawn with. */
  badgeKey: string;
  /** The badge as shown now (`nextBadge`), and the controller time its text last changed. */
  badgeShown: BadgeShown;
  badgeAt: number;
  badgeOffset: { x: number; y: number };
  /** Status, action and miracle icons in a row over the count badge (follow the statuses' timing). */
  marks: Container;
  shownMarks: string;
  view: BattleStackView;
  shownAnchor: BattleCell;
  prevAnchor: BattleCell;
  locked: number;
  snapIn: number;
  key: string;
  seed: number;
  /** The fallen lie where they died (owner request 2026-10-03). */
  down: boolean;
  /** Status overlays: drawn, and the set currently shown (it follows the view after spell playback). */
  aura: StatusAura;
  shownStatuses: readonly StatusOverlay[];
  /** Frames until a status change from a newer view is shown (lets playback claim it first). */
  auraDelay: number;
  /** Times the death and hit playback ran (read-only diagnostics). */
  deathPlays: number;
  hitPlays: number;
}

const ARCHETYPE_GROUND: Record<string, string> = {
  coast_road: '#8a8b5c',
  ridge_pass: '#7c7564',
  grove: '#5c7a45',
  plateau: '#6f7270',
  beacon_clearing: '#86844f',
  open_field: '#7e8a4f',
};

/**
 * Generic obstacle stills per battlefield (manifest `obstacles` IDs): kept for the
 * authored columns and standing stones, and on a battlefield without a known
 * climate. Elsewhere the climate's own rock, deadwood or tree stands on the cell
 * (`battleObstacleId`, nature delivery 2026-10-06). A missing still is replaced
 * by a neutral boulder or rock, else a drawn stone — never an unrelated picture.
 */
/** Generic kinds kept on every battlefield (authored pieces, not natural rocks). */
const AUTHORED_OBSTACLES = new Set(['column', 'stone_circle']);
/**
 * Width in battle hexes a climate obstacle is drawn at (its visible picture: the
 * importer trims the stills to their painted pixels), about the generic
 * obstacles' 0.9 hex.
 */
const NATURE_OBSTACLE_WIDTH: Readonly<Record<string, number>> = { canopy: 0.9, rock: 0.88, deadwood: 0.93 };

const OBSTACLE_KINDS: Record<string, readonly string[]> = {
  coast_road: ['rock', 'boulder', 'log'],
  ridge_pass: ['boulder', 'rock', 'rock'],
  grove: ['tree', 'stump', 'tree'],
  plateau: ['column', 'boulder', 'rock'],
  beacon_clearing: ['stone_circle', 'rock', 'log'],
  open_field: ['rock', 'tree', 'log'],
};

/** Two 0xrrggbb colours multiplied channel by channel (a tint). */
function multiplyRgb(a: number, b: number): number {
  const ch = (s: number) => Math.round((((a >> s) & 255) * ((b >> s) & 255)) / 255) << s;
  return ch(16) | ch(8) | ch(0);
}

/**
 * The order to show a batch of battle events in. The rules report a stack's destruction while
 * applying the damage, before the strike, shot, spell or miracle that dealt it; shown in that order
 * the stack would lie down first and its hit and death strips never play. Each
 * `BattleStackDestroyed` is shown right after the blow that felled it instead (presentation only:
 * the same events, the same final picture).
 */
export function battlePlaybackOrder(events: readonly GameEvent[]): GameEvent[] {
  const harms = (e: GameEvent, id: string) =>
    (e.kind === 'BattleAttack' && e.targetId === id) ||
    (e.kind === 'SiegeTurretShot' && e.targetId === id) ||
    (e.kind === 'SiegeMoatDamage' && e.stackId === id) ||
    e.kind === 'BattleSpellCast' ||
    e.kind === 'InterventionInvoked';
  const out = [...events];
  // A spell's share on the siege engine (and its fall) plays after the spell's own magic.
  for (let i = 0; i < out.length; i++) {
    const ev = out[i]!;
    const spellShare = (ev.kind === 'EngineDamaged' && ev.source === 'spell') || (ev.kind === 'EngineDestroyed' && !ev.attackerId);
    if (!spellShare) continue;
    const j = out.findIndex((e, k) => k > i && e.kind === 'BattleSpellCast');
    if (j < 0) continue;
    out.splice(i, 1);
    out.splice(j, 0, ev);
    i -= 1;
  }
  for (let i = 0; i < out.length; i++) {
    const ev = out[i]!;
    if (ev.kind !== 'BattleStackDestroyed') continue;
    const j = out.findIndex((e, k) => k > i && harms(e, ev.stackId));
    if (j < 0) continue;
    out.splice(i, 1);
    out.splice(j, 0, ev);
    i -= 1;
  }
  return out;
}

export class BattleSceneController implements SceneController {
  readonly root = new Container();
  readonly tweens = new TweenPlayer();
  private readonly canvas: HTMLCanvasElement;
  private readonly cb: BattleCallbacks;
  private readonly board = new Container();
  /** The battlefield (painting, cells, grid): redrawn only when the board changes. */
  private readonly field = new Container();
  /** Highlights, hover and the active stack's ring. */
  private readonly marks = new Container();
  private readonly backdrop = new Container();
  private readonly siegeFloor = new Container();
  /** The width (hexes) the active ring was drawn for; its pulse is a scale. */
  private ringWidth = 0;
  /** The ground colour around the painted field (behind everything). */
  background = 0x7e8a4f;
  private readonly cells = new Graphics();
  private readonly grid = new Graphics();
  private readonly highlight = new Graphics();
  private readonly hover = new Graphics();
  private readonly activeRing = new Graphics();
  private readonly objects = new Container();
  /** Count badges, above every figure so a tall creature in the row in front never hides another stack's count. */
  private readonly badges = new Container();
  private readonly fx = new Container();
  private readonly floats = new Container();
  /** Whole-field moments (screen pixels, over the board). */
  private readonly screenLayer = new Container();
  private readonly painter: FxPainter;
  private calm = false;
  /** A battle heal's total, shown by the miracle that follows it in the same batch. */
  private pendingHeal: { side: string; healed: number } | null = null;
  /** Ward reductions announced before the blow they soften (`BattleStatusConsumed` comes before its `BattleAttack`). */
  private pendingWard = new Map<string, number>();
  /** The last magic effects played (asset ID prefixes; read-only diagnostics). */
  private fxLog: string[] = [];
  private boardKey = '';
  /** The board whose essential pictures were awaited, and whether they are in. */
  private readyFor = '';
  private boardIsReady = false;
  /** The battlefield painting's load (settles on success or failure). */
  private backdropLoad: Promise<unknown> = Promise.resolve();
  private highlightKey = '';
  private stacks = new Map<string, StackEntry>();
  private obstacleSprites: Container[] = [];
  private obstacleLog: { col: number; row: number; id: string; source: 'nature' | 'generic' | 'marker' }[] = [];
  private lastHover = '';
  private time = 0;
  private cols = 15;
  private rows = 11;
  private siegeView: SiegeView | null = null;
  /** The board is drawn mirrored (the defender on the left; see `BattleView.mirrored`). */
  private mirrored = false;
  /** Cell centres (`hexmath.cellPointOn`): the plain board, or a masked board's measured projection. */
  private proj: BoardProjection = plainBoardProjection(RB, S);
  /** The drawn cell's hex radius and squash (a masked board draws its measured cell size). */
  private cellShape = { radius: RB, squash: S };
  /** A masked board's legal-cell letters and its painting rectangle in board pixels (null: plain board). */
  private boardMask: { cells: string; cols: number; legalCodes?: string } | null = null;
  /** A piecewise board's per-cell projection (sea encounter): placement and hit-testing by its own table. */
  private table: TableProjection | null = null;
  /** Cosmetic events already played, by action token (event ID): never replayed. */
  private readonly tokens = new ActionTokens();
  private boardArt: { x: number; y: number; width: number; height: number } | null = null;
  private deckFlags: { side: 'attacker' | 'defender'; color: string; x: number; y: number }[] = [];
  private drawnCells = 0;
  /** The side whose markers and badges are blue. */
  private blueSide: 'attacker' | 'defender' = 'attacker';
  /** Structure HP as currently drawn (playback advances it event by event). */
  private shownHp = new Map<string, number>();
  private structureKey = '';
  private structureSnapIn = 0;
  private structuresLocked = 0;
  private view = { width: 1, height: 1 };
  private fitScale = 1;
  private zoomK = 1;
  private readonly listeners: [string, EventListener][] = [];
  private disposed = false;
  private activeStack: StackEntry | null = null;
  /** Winners cheering after the battle was won (until the screen closes). */
  private celebrating = new Set<StackEntry>();
  private extraTweens: TweenPlayer[] = [];
  /** Interface icons loaded for stack marks and floating words, by URL; a newly loaded one redraws the marks. */
  private readonly iconTextures = new Map<string, Texture>();
  private readonly croppedIconTextures = new Set<Texture>();
  private readonly iconLoading = new Set<string>();
  private marksDirty = false;
  /** Missiles in the air (their travel sprites), and the last ones flown (read-only diagnostics). */
  private readonly missiles = new Set<Container>();
  private shotLog: ShotRecord[] = [];
  private shotSeq = 0;

  /** Wakes the renderer to the full frame rate (frame pacing) after a change it cannot see coming. */
  private readonly wake: () => void;

  constructor(engine: EngineHost, canvas: HTMLCanvasElement, cb: BattleCallbacks) {
    this.canvas = canvas;
    this.cb = cb;
    this.wake = () => engine.wake?.();
    this.objects.sortableChildren = true;
    this.badges.sortableChildren = true;
    this.field.addChild(this.backdrop, this.cells, this.siegeFloor, this.grid);
    this.marks.addChild(this.highlight, this.hover, this.activeRing);
    this.board.addChild(this.field, this.marks, this.objects, this.badges, this.fx, this.floats);
    this.floats.addChild(this.aimMarks);
    this.root.addChild(this.board, this.screenLayer);
    // Render groups (2026-10-06 frame-rate work): the animated stacks, their
    // count badges and the effects re-send only their own layer each frame, never
    // the battlefield; zooming changes one transform on the GPU.
    this.board.enableRenderGroup();
    for (const layer of [this.field, this.marks, this.highlight, this.objects, this.badges, this.fx, this.floats]) layer.enableRenderGroup();
    this.hover.visible = false;
    this.hover.poly(hexPolygon(0, 0, RB * 0.95, S)).stroke({ width: 2, color: 0xf5e4b7, alpha: 0.95 });
    this.activeRing.visible = false;
    this.view = { width: engine.width, height: engine.height };
    this.painter = new FxPainter(this.fx, this.tweens, RB, S, { layer: this.screenLayer, size: () => this.view });
    const on = (type: string, fn: (e: Event) => void) => {
      canvas.addEventListener(type, fn, { passive: type !== 'wheel' && type !== 'contextmenu' });
      this.listeners.push([type, fn]);
    };
    on('pointermove', (e) => this.onMove(e as PointerEvent));
    on('pointerup', (e) => this.onUp(e as PointerEvent));
    on('pointerleave', () => this.onLeave());
    on('wheel', (e) => this.onWheel(e as WheelEvent));
    on('contextmenu', (e) => e.preventDefault());
  }

  // ------------------------------------------------------------------ layout

  resize(width: number, height: number): void {
    this.view = { width, height };
    this.layout();
  }

  /** Board extent in board pixels: the cells plus headroom above the top row for tall creatures. */
  private boardRect(): { x0: number; y0: number; x1: number; y1: number } {
    // A masked board on its painting: the painting itself is the frame (contain: letterboxed, never cropped).
    const art = this.boardArt;
    if (art) return { x0: art.x, y0: art.y, x1: art.x + art.width, y1: art.y + art.height };
    const last = cellPoint({ col: this.cols - 1, row: 1 }, RB, S);
    const bottom = cellPoint({ col: 0, row: this.rows - 1 }, RB, S);
    // A siege also shows the attackers' catapult west of the field and the keep east of it.
    const west = this.siegeLayout ? HEX_W * 1.5 : 0;
    const east = this.siegeLayout ? HEX_W * 3.2 : 0;
    return { x0: -HEX_W / 2 - west, y0: -RB * S - RB * 1.6, x1: last.x + HEX_W / 2 + east, y1: bottom.y + RB * S + RB * 0.35 };
  }

  /** A siege board (fortifications present): the frame makes room for the catapult and the keep. */
  private siegeLayout = false;

  /** Screen margins kept clear for the battle HUD (top bar and turn order, bottom action bar). */
  private insets = { top: 112, bottom: 82, left: 16, right: 16 };

  /** The interface tells the view how much of the canvas its HUD covers (CSS pixels). */
  setInsets(i: { top: number; bottom: number; left: number; right: number }): void {
    this.insets = i;
    this.layout();
  }

  private layout(): void {
    const b = this.boardRect();
    const { width, height } = this.view;
    const ins = this.insets;
    const w = Math.max(100, width - ins.left - ins.right);
    const h = Math.max(100, height - ins.top - ins.bottom);
    const k = Math.min(w / (b.x1 - b.x0), h / (b.y1 - b.y0));
    this.fitScale = Math.max(0.2, k);
    const z = this.fitScale * this.zoomK;
    // A mirrored board is the same board seen from the other side: x turns round about the frame's centre.
    const zx = this.mirrored ? -z : z;
    this.board.scale.set(zx, z);
    const cx = (b.x0 + b.x1) / 2;
    const cy = (b.y0 + b.y1) / 2;
    this.board.position.set(Math.round(ins.left + w / 2 - cx * zx), Math.round(ins.top + h / 2 - cy * z));
  }

  /** Board point → canvas CSS pixels (the board's own transform, mirrored or not). */
  private toPage(p: { x: number; y: number }): { x: number; y: number } {
    return { x: p.x * this.board.scale.x + this.board.x, y: p.y * this.board.scale.y + this.board.y };
  }

  /** Text and icons stay readable on a mirrored board: their container is turned back. */
  private upright(o: Container): void {
    o.scale.x = Math.abs(o.scale.x) * (this.mirrored ? -1 : 1);
  }

  // ------------------------------------------------------------------ board

  private cellXY(c: BattleCell): { x: number; y: number } {
    return this.table ? tableCellPoint(c, this.table) : cellPointOn(c, this.proj);
  }

  /** A cell a stack may stand on: on the board and, on a masked board, not water (the rules' `battleCellLegal`). */
  private cellLegal(c: BattleCell): boolean {
    if (c.col < 0 || c.row < 0 || c.col >= this.cols || c.row >= this.rows) return false;
    const m = this.boardMask;
    if (!m) return true;
    const code = m.cells[c.row * m.cols + c.col];
    if (code === undefined) return false;
    return m.legalCodes ? m.legalCodes.includes(code) : code !== '.';
  }

  /** The polygon of a drawn cell (`k` of its radius) in the board's own cell shape. */
  private cellPoly(x: number, y: number, k: number): number[] {
    return hexPolygon(x, y, this.cellShape.radius * k, this.cellShape.squash);
  }

  /** The hover outline, drawn once per board in its cell shape and moved to the cell under the pointer. */
  private redrawHover(): void {
    this.hover.clear();
    this.hover.poly(this.cellPoly(0, 0, 0.95)).stroke({ width: 2, color: 0xf5e4b7, alpha: 0.95 });
  }

  /**
   * A masked board (naval boarding): its measured painting at native proportions, the cells placed by
   * the kit's projection through hexmath, and the two decks' live owner flags on the bow posts.
   */
  private buildBoardingBackdrop(view: BattleView, b: BattleBoardView): void {
    const art = this.boardArt!;
    this.background = BOARD_SEA;
    const flagsOf = b.flags;
    this.deckFlags = flagsOf ? (['attacker', 'defender'] as const).map((side) => ({ side, color: flagsOf[side], x: art.x + DECK_FLAG_POSTS[side].x * art.width, y: art.y + DECK_FLAG_POSTS[side].y * art.height })) : [];
    const battleId = view.battleId;
    const flags = new Container();
    for (const f of this.deckFlags) {
      const g = new Graphics();
      const h = RB * 1.9;
      g.moveTo(0, 0).lineTo(0, -h).stroke({ width: 3, color: 0x3a2c1c });
      // The owner's square banner (the land banner's shape and colour source), with a dark rim for any colour.
      const cloth = new Graphics();
      cloth.rect(0, 0, RB * 0.95, RB * 0.66).fill({ color: colorOf(f.color) }).stroke({ width: 1.6, color: 0x1a1208, alpha: 0.8 });
      cloth.position.set(1.5, -h);
      const root = new Container();
      root.addChild(g, cloth);
      root.position.set(f.x, f.y);
      flags.addChild(root);
    }
    this.backdrop.addChild(flags);
    this.backdropLoad = b.art.url
      ? loadTexture(b.art.url).then(
          (tex) => {
            if (this.disposed || !this.boardKey.startsWith(battleId)) return;
            const s = new Sprite(tex);
            s.width = art.width;
            s.height = art.height;
            s.position.set(art.x, art.y);
            this.backdrop.addChildAt(s, 0);
          },
          () => undefined,
        )
      : Promise.resolve();
  }

  /** Read-only: how a masked board is drawn (projection, painting rectangle on the page, cells, flags). */
  boardDebug(): BoardDebug {
    const art = this.boardArt;
    const page = (p: { x: number; y: number }) => this.toPage(p);
    let rect: BoardDebug['art'] = null;
    if (art) {
      const a = page({ x: art.x, y: art.y });
      const b = page({ x: art.x + art.width, y: art.y + art.height });
      rect = { x: Math.round(Math.min(a.x, b.x) * 10) / 10, y: Math.round(a.y * 10) / 10, width: Math.round(Math.abs(b.x - a.x) * 10) / 10, height: Math.round((b.y - a.y) * 10) / 10 };
    }
    let legal = 0;
    for (let row = 0; row < this.rows; row++) for (let col = 0; col < this.cols; col++) if (this.cellLegal({ col, row })) legal++;
    return {
      masked: !!this.boardMask,
      table: !!this.table,
      projection: this.proj,
      cell: { ...this.cellShape },
      art: rect,
      legalCells: legal,
      drawnCells: this.drawnCells,
      flags: this.deckFlags.map((f) => ({ side: f.side, color: f.color, ...page({ x: f.x, y: f.y }) })),
      mirrored: this.mirrored,
    };
  }

  /**
   * The painted battlefield (Brief 2, §6.0): one painting, foreshortened like the
   * board, with the 15 × 11 board fitted inside its quiet centre (about
   * 1500 × 1000 of 4096 × 3200 px). Image top = the far side of the field.
   */
  private buildBackdrop(view: BattleView): void {
    for (const c of this.backdrop.removeChildren()) c.destroy({ children: true });
    this.deckFlags = [];
    if (view.board && this.boardArt) {
      this.buildBoardingBackdrop(view, view.board);
      return;
    }
    // The plain ground around the painting is the renderer's background colour (no full-screen rectangle to fill).
    this.background = colorOf(ARCHETYPE_GROUND[view.archetype] ?? '#7e8a4f');
    const siegeArt = graphicsProfile().paintedGround ? this.siegeGround(view) : null;
    const art = siegeArt ?? (graphicsProfile().paintedGround ? battlefieldArt(view.archetype, view.climate) : null);
    this.backdropLoad = Promise.resolve();
    if (!art) return;
    const [shiftX, shiftY] = (siegeArt && SIEGE_GROUND_SHIFT[view.siege?.pantheonId ?? '']) || [0, 0];
    const first = this.cellXY({ col: 0, row: 0 });
    const last = this.cellXY({ col: view.cols - 1, row: view.rows - 1 });
    const minX = first.x - RB;
    const maxX = this.cellXY({ col: view.cols - 1, row: 1 }).x + RB;
    const minY = first.y - RB * S;
    const maxY = last.y + RB * S;
    const L = BATTLEFIELD_LAYOUT;
    // Board pixels per layout pixel: the board fits the quiet centre in both directions (rows foreshortened).
    const unit = Math.max((maxX - minX) / L.centreWidth, (maxY - minY) / S / L.centreHeight);
    const w = L.width * unit;
    const h = L.height * unit * S;
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const battleId = view.battleId;
    if (art.edge) this.background = multiplyRgb(this.background, colorOf(art.edge));
    this.backdropLoad = loadTexture(art.url).then(
      (tex) => {
        if (this.disposed || !this.boardKey.startsWith(battleId)) return;
        const s = new Sprite(tex);
        if (siegeArt?.layout === 'siege-v2') {
          const rect = siegePaintingRect(view.cols, view.rows);
          s.width = rect.width; s.height = rect.height; s.position.set(rect.x, rect.y);
        } else {
          s.width = w;
          s.height = h;
          s.position.set(cx - w / 2 + shiftX * w, cy - h / 2 + shiftY * h);
        }
        this.backdrop.addChild(s);
      },
      () => undefined,
    );
  }

  private buildBoard(view: BattleView): void {
    // The icons that stand before floating words load with the board, so the first one shows.
    for (const id of FLOAT_ICONS) this.iconTexture(id);
    this.cols = view.cols;
    this.rows = view.rows;
    this.siegeLayout = !!view.siege && view.siege.structures.length > 0;
    this.mirrored = !!view.mirrored;
    this.blueSide = view.blueSide ?? 'attacker';
    // A masked board on its painting: the kit's projection is an affine case of the hex grid (hexmath),
    // used for drawing, sprites and hit-testing alike; plain boards keep the standard grid.
    this.table = null;
    if (view.board?.cellTable) {
      // A piecewise board (the sea encounter): every cell by its own table entry, drawing and hit-testing alike.
      const tbl = tableProjection(view.board.cellTable, view.cols, view.rows, view.board.art, RB);
      this.table = tbl;
      this.proj = { radius: tbl.radius, squash: tbl.squash, originX: 0, originY: 0 };
      // The drawn cell's shape (the delivered cells share one width and height): the table's own polygon.
      const hw = tbl.hw[0] ?? RB * 0.8;
      const hh = tbl.hh[0] ?? RB * 0.6;
      const r = hw / Math.cos(Math.PI / 6);
      this.cellShape = { radius: r, squash: hh / r };
      this.boardArt = tbl.art;
      this.boardMask = { cells: view.board.cells, cols: view.cols, ...(view.board.legalCodes ? { legalCodes: view.board.legalCodes } : {}) };
      this.zoomK = 1;
    } else if (view.board) {
      const lay = layoutBoardProjection(view.board.projection, view.board.art, RB);
      this.proj = lay.projection;
      this.cellShape = lay.cell;
      this.boardArt = lay.art;
      this.boardMask = { cells: view.board.cells, cols: view.cols, ...(view.board.legalCodes ? { legalCodes: view.board.legalCodes } : {}) };
      this.zoomK = 1;
    } else {
      this.proj = plainBoardProjection(RB, S);
      this.cellShape = { radius: RB, squash: S };
      this.boardArt = null;
      this.boardMask = null;
    }
    this.redrawHover();
    this.layout();
    this.buildBackdrop(view);
    for (const c of this.siegeFloor.removeChildren()) c.destroy({ children: true });
    if (view.siege?.structures.length) {
      const gateRow = view.siege.structures.find(s => s.kind === 'gate')?.cells[0]?.row ?? Math.floor(view.rows / 2);
      this.siegeFloor.addChild(siegeGroundLayer(view.siege.pantheonId, view.siege.wallCol, view.rows, view.cols, view.siege.moat, gateRow));
    }
    const moat = new Set((view.siege?.moat ?? []).map((c) => `${c.col}:${c.row}`));
    const siegeArt = graphicsProfile().paintedGround && !!this.siegeGround(view);
    const painted = graphicsProfile().paintedGround && (siegeArt || !!battlefieldArt(view.archetype, view.climate));
    const base = colorOf(ARCHETYPE_GROUND[view.archetype] ?? '#7e8a4f');
    const g = this.cells;
    g.clear();
    this.grid.clear();
    this.drawnCells = 0;
    if (this.boardMask) {
      // Only the legal cells exist on a masked board: deck and bridge hexes drawn in the measured cell size, water never.
      const bridge: number[][] = [];
      const water: number[][] = [];
      for (let row = 0; row < view.rows; row++) {
        for (let col = 0; col < view.cols; col++) {
          if (!this.cellLegal({ col, row })) continue;
          const { x, y } = this.cellXY({ col, row });
          // A piecewise board draws each cell's own polygon (the same one the pointer is tested against).
          const poly = this.table ? tableCellPolygon({ col, row }, this.table) : this.cellPoly(x, y, 1);
          const code = this.boardMask.cells[row * this.boardMask.cols + col];
          if (code === '.') water.push(poly);
          else this.grid.poly(poly);
          if (code === 'b') bridge.push(poly);
          this.drawnCells++;
        }
      }
      this.grid.fill({ color: 0x87c8ce, alpha: 0.08 }).stroke({ width: 1.3, color: 0xc4ddd5, alpha: 0.42 });
      for (const poly of bridge) this.cells.poly(poly);
      if (bridge.length) this.cells.fill({ color: 0xdca738, alpha: 0.1 }).stroke({ width: 1.3, color: 0xf4d58c, alpha: 0.5 });
      // Open water a creature may hold (sea encounter): a cool outline, so deck and sea read as two zones.
      for (const poly of water) this.cells.poly(poly);
      if (water.length) this.cells.fill({ color: 0x7fd3ea, alpha: 0.07 }).stroke({ width: 1.2, color: 0x9fe1f2, alpha: 0.4 });
    }
    for (let row = 0; row < view.rows && !this.boardMask; row++) {
      for (let col = 0; col < view.cols; col++) {
        const { x, y } = this.cellXY({ col, row });
        const poly = hexPolygon(x, y, RB * 0.975, S);
        const inMoat = moat.has(`${col}:${row}`);
        // A painted siege battlefield shows the town's streets itself; otherwise the town is drawn as paving.
        const inTown = !!view.siege && view.siege.structures.length > 0 && col > view.siege.wallCol && !siegeArt;
        const deploy = col < 2 || col >= view.cols - 2;
        if (inMoat) { /* The continuous ditch layer shows this cell; highlights still identify legal targets. */ }
        else if (inTown) g.poly(poly).fill({ color: 0x8c8474, alpha: painted ? 0.55 : 1 });
        else if (!painted) {
          const n = tileNoise(col * 3 + 1, row * 5 + 2) * 0.045 - (deploy ? 0.03 : 0);
          const r = ((base >> 16) & 255) / 255 + n;
          const gg = ((base >> 8) & 255) / 255 + n;
          const bb = (base & 255) / 255 + n;
          g.poly(poly).fill({ color: (Math.round(Math.max(0, Math.min(1, r)) * 255) << 16) | (Math.round(Math.max(0, Math.min(1, gg)) * 255) << 8) | Math.round(Math.max(0, Math.min(1, bb)) * 255) });
        } else if (deploy) g.poly(poly).fill({ color: 0x000000, alpha: 0.1 });
        this.grid.poly(hexPolygon(x, y, RB * 0.975, S));
        this.drawnCells++;
      }
    }
    if (!this.boardMask) this.grid.stroke({ width: 1, color: 0x282a23, alpha: this.siegeLayout ? 0.24 : 0.5 });
    // Obstacles: rocks, trees, logs, columns — drawn where the rules placed them.
    for (const o of this.obstacleSprites) o.destroy({ children: true });
    this.obstacleSprites = [];
    const kinds = OBSTACLE_KINDS[view.archetype] ?? OBSTACLE_KINDS['open_field']!;
    const all = spriteManifest().obstacles;
    const decor = spriteManifest().decor;
    const neutral: StaticSpriteDefinition | null = all['boulder'] ?? all['rock'] ?? null;
    this.obstacleLog = [];
    const chosen: { c: BattleCell; id: string }[] = [];
    view.obstacles.forEach((c, i) => {
      const kind = kinds[(c.col * 7 + c.row * 3 + i) % kinds.length]!;
      const used = chosen.filter((o) => Math.abs(o.c.col - c.col) + Math.abs(o.c.row - c.row) <= 2).map((o) => o.id);
      const natureId = AUTHORED_OBSTACLES.has(kind) ? null : battleObstacleId(view.climate, view.archetype, c, null, view.battleId, (id) => !!decor[id], used);
      const natureDef = natureId ? (decor[natureId] ?? null) : null;
      const def: StaticSpriteDefinition | null = natureDef ?? all[kind] ?? neutral;
      const { x, y } = this.cellXY(c);
      const root = new Container();
      root.position.set(x, y + RB * S * 0.12);
      root.zIndex = root.y;
      if (def) {
        let size = 1;
        if (natureDef) {
          const role = natureId!.split('.')[2] ?? 'rock';
          size = (NATURE_OBSTACLE_WIDTH[role] ?? 1) / Math.max(0.05, natureDef.width / natureDef.pixelsPerHex);
          size *= 0.94 + 0.12 * ((tileNoise(c.col, c.row) + 1) / 2);
        }
        // Keep the painted footprint within its blocking cell and register the
        // bottom of the trimmed art to the same point as its contact shadow.
        size = Math.min(size, .82 * def.pixelsPerHex / def.width);
        const width = def.width * HEX_W / def.pixelsPerHex * size;
        if (graphicsProfile().shadows) root.addChild(groundShadow(width * .44, Math.min(HEX_W * .09, width * .14), .4));
        root.addChild(new Graphics().ellipse(0, 0, width * .28, Math.min(3, width * .055)).fill({color:0x332b20,alpha:.24}));
        const s = stillSprite({...def, anchor:[.5,.98]}, HEX_W, size);
        // Generic stills alternate sides; the climate's paintings stay as painted (their light).
        if (!natureDef && (c.col + c.row) % 2 === 1) s.scale.x *= -1;
        root.addChild(s);
      } else root.addChild(this.drawnStone());
      chosen.push({ c, id: natureId ?? kind });
      this.obstacleLog.push({ col: c.col, row: c.row, id: natureDef ? natureId! : def ? (all[kind] ? kind : 'neutral') : 'marker', source: natureDef ? 'nature' : def ? 'generic' : 'marker' });
      this.objects.addChild(root);
      this.obstacleSprites.push(root);
    });
    this.catapult?.root.destroy({ children: true });
    this.engineFig?.root.destroy({ children: true });
    this.engineFig?.label.destroy();
    this.engineFig = null;
    this.aimKey = '';
    this.aimMarks.clear();
    // targetableCatapultV1: the attacker's engine on its fixed cells; a legacy siege keeps its catapult west of the field.
    this.engineView = view.siege?.engine ?? null;
    this.engineShownHp = this.engineView?.hp ?? null;
    this.catapult = this.siegeLayout && !this.engineView ? this.buildCatapult() : null;
    if (this.siegeLayout && this.engineView) this.buildEngine();
    // The tower arrow and the Catapult's stone (their travel poses and impacts) load with a siege board.
    if (this.siegeLayout) for (const id of SIEGE_PROFILE_IDS) this.preloadMissile(spriteManifest().projectileProfiles?.[id]);
  }

  // ------------------------------------------------------------------ the attackers' catapult (sieges)

  /**
   * The siege catapult west of the field (owner request 2026-10-05: a catapult that
   * visibly throws). A delivered still `siege.catapult.intact` (and its throw strip
   * `fx.siege.catapult.throw`) replace the drawn onager without a code change.
   */
  private catapult: { root: Container; arm: Container | null; stone: Graphics | null; still: Sprite | null } | null = null;

  private catapultPos(): { x: number; y: number } {
    const c = this.cellXY({ col: -1, row: Math.floor(this.rows / 2) });
    return { x: c.x - HEX_W * 0.25, y: c.y + RB * S * 0.35 };
  }

  private buildCatapult(): { root: Container; arm: Container | null; stone: Graphics | null; still: Sprite | null } {
    const at = this.catapultPos();
    const root = new Container();
    root.position.set(at.x, at.y);
    root.zIndex = root.y;
    if (graphicsProfile().shadows) root.addChild(groundShadow(HEX_W * 0.6, HEX_W * 0.18, 0.34));
    this.objects.addChild(root);
    const def = spriteManifest().siege['catapult.intact'];
    if (def) {
      const still = stillSprite(def, HEX_W, CATAPULT_SPRITE_SCALE);
      root.addChild(still);
      // Load the throw strip now, so the first shot does not wait for it.
      const throwFx = spriteManifest().effects['fx.siege.catapult.throw'];
      if (throwFx && graphicsProfile().effects !== 'simple') void loadStrip(throwFx).catch(() => null);
      return { root, arm: null, stone: null, still };
    }
    const u = RB;
    const wood = 0x7a5230;
    const dark = 0x3b2614;
    const iron = 0x4a4a50;
    const frame = new Graphics();
    // Base beams and the two uprights with the padded crossbar the arm strikes.
    frame.rect(-0.85 * u, -0.5 * u, 1.7 * u, 0.18 * u).fill({ color: wood }).stroke({ width: 2, color: dark });
    frame.poly([0.05 * u, -0.5 * u, 0.3 * u, -1.3 * u, 0.42 * u, -1.3 * u, 0.55 * u, -0.5 * u]).fill({ color: wood }).stroke({ width: 2, color: dark });
    frame.rect(0.12 * u, -1.42 * u, 0.5 * u, 0.14 * u).fill({ color: 0x9a6b3c }).stroke({ width: 2, color: dark });
    frame.rect(-0.85 * u, -0.5 * u, 0.12 * u, 0.18 * u).fill({ color: iron });
    frame.rect(0.73 * u, -0.5 * u, 0.12 * u, 0.18 * u).fill({ color: iron });
    for (const wx of [-0.55, 0.55]) {
      frame.circle(wx * u, -0.2 * u, 0.22 * u).fill({ color: 0x5c3d22 }).stroke({ width: 2, color: dark });
      frame.circle(wx * u, -0.2 * u, 0.06 * u).fill({ color: iron });
    }
    // The throwing arm turns on its axle; at rest it lies back over the frame.
    const arm = new Container();
    arm.position.set(0.2 * u, -0.62 * u);
    const beam = new Graphics();
    beam.rect(0, -0.06 * u, 1.25 * u, 0.12 * u).fill({ color: 0x8a5d33 }).stroke({ width: 2, color: dark });
    beam.ellipse(1.28 * u, 0, 0.16 * u, 0.1 * u).fill({ color: 0x5c3d22 }).stroke({ width: 2, color: dark });
    beam.circle(0, 0, 0.09 * u).fill({ color: iron });
    const stone = new Graphics();
    stone.circle(1.28 * u, -0.08 * u, 0.12 * u).fill({ color: 0x8d8678 }).stroke({ width: 1.5, color: 0x3b3833 });
    arm.addChild(beam, stone);
    arm.rotation = CATAPULT_REST;
    const machine = new Container();
    machine.scale.set(1.3);
    machine.addChild(frame, arm);
    root.addChild(machine);
    return { root, arm, stone, still: null };
  }

  /** The catapult throws: the arm swings up against the crossbar and lets the stone go. Returns where it left the cup. */
  private async throwCatapult(): Promise<{ x: number; y: number }> {
    if (this.engineFig) return this.throwEngine();
    const c = this.catapult;
    const top = this.catapultPos();
    if (!c) return { x: top.x, y: top.y - RB * 1.6 };
    if (c.still) {
      // The painted catapult: the still hides while the throw strip plays once in its place
      // (same frame, anchor and scale); the stone leaves the cup at the strip's release frame
      // and flies on as the game's projectile while the arm settles; then the still returns.
      const fx = spriteManifest().effects['fx.siege.catapult.throw'];
      const still = c.still;
      const frameW = fx?.frameWidth ?? still.texture.width;
      const frameH = fx?.frameHeight ?? still.texture.height;
      const k = (HEX_W / (fx?.pixelsPerHex ?? 120)) * CATAPULT_SPRITE_SCALE;
      const [ax, ay] = fx?.anchor ?? [0.5, 0.95];
      const release = { x: top.x + (CATAPULT_RELEASE.x - ax) * frameW * k, y: top.y + (CATAPULT_RELEASE.y - ay) * frameH * k };
      if (fx && graphicsProfile().effects !== 'simple' && (await loadStrip(fx).catch(() => null))) {
        still.alpha = 0;
        void this.effect('fx.siege.catapult.throw', { x: top.x, y: top.y }, { scale: CATAPULT_SPRITE_SCALE }).then(() => {
          if (!still.destroyed) still.alpha = 1;
        });
        await this.tweens.wait((CATAPULT_RELEASE.frame / Math.max(1, fx.fps)) * 1000);
      }
      return release;
    }
    const arm = c.arm!;
    const u = RB;
    await this.tweens.tween(240, (t) => (arm.rotation = CATAPULT_REST - 0.12 * t), easeOut);
    const from = arm.rotation;
    await this.tweens.tween(170, (t) => (arm.rotation = from + (CATAPULT_FIRE - from) * t * t), linear);
    const k = 1.3; // the drawn machine's scale
    const cup = { x: c.root.x + (arm.x + Math.cos(arm.rotation) * 1.28 * u) * k, y: c.root.y + (arm.y + Math.sin(arm.rotation) * 1.28 * u) * k };
    if (c.stone) c.stone.visible = false;
    // The arm settles back while the stone flies; a new stone is loaded.
    void this.tweens
      .tween(700, (t) => (arm.rotation = CATAPULT_FIRE + (CATAPULT_REST - CATAPULT_FIRE) * t), easeInOut)
      .then(() => {
        if (c.stone && !c.stone.destroyed) c.stone.visible = true;
      });
    return cup;
  }

  // ------------------------------------------------------------------ the targetable siege engine (targetableCatapultV1)

  private engineView: SiegeEngineView | null = null;
  /** Engine HP as drawn now (playback moves it at each blow). */
  private engineShownHp: number | null = null;
  private engineLocked = 0;
  private engineFig: {
    root: Container;
    still: Sprite | null;
    stage: EngineStage | null;
    token: number;
    label: Text;
    ready: Promise<unknown>;
    drawn: { stage: EngineStage; url: string; scaleX: number; scaleY: number; anchor: [number, number]; tinted: boolean; box: { x0: number; y0: number; x1: number; y1: number } } | null;
  } | null = null;
  private aimKey = '';
  private readonly aimMarks = new Graphics();
  private aimDrawn: { structureId: string; from: Pt; to: Pt } | null = null;

  /** The engine's ground point: between its cells, where its wheels stand. */
  private enginePoint(): Pt {
    const cells = this.engineView?.cells ?? [];
    if (cells.length === 0) return this.catapultPos();
    let x = 0;
    let y = 0;
    for (const c of cells) {
      const p = this.cellXY(c);
      x += p.x;
      y += p.y;
    }
    return { x: x / cells.length, y: y / cells.length + RB * S * 0.35 };
  }

  /** Painted width of the intact engine as drawn (the reference every stage is sized to). */
  private engineVisibleWidth(): number {
    const def = spriteManifest().siege['catapult.intact'];
    return (CATAPULT_INTACT_VISIBLE[2] - CATAPULT_INTACT_VISIBLE[0]) * (def?.width ?? 256) * (HEX_W / (def?.pixelsPerHex ?? 120)) * CATAPULT_SPRITE_SCALE;
  }

  /** +1 when the engine faces east (the attacker's, toward the walls). */
  private engineFacing(): 1 | -1 {
    return (this.engineView?.side ?? 'attacker') === 'attacker' ? 1 : -1;
  }

  private engineArtOf(stage: 'damaged' | 'destroyed'): EngineStageArt | null {
    try {
      return this.cb.engineArt?.(stage) ?? null;
    } catch {
      return null;
    }
  }

  /** The picture of a stage and how it is drawn: the intact still at the throw strip's frame and scale; the kit's stages by their visible boxes. */
  private stageArt(stage: EngineStage): { art: EngineStageArt; scaleX: number; scaleY: number; anchor: [number, number]; tint: number } | null {
    const def = spriteManifest().siege['catapult.intact'];
    const facing = this.engineFacing();
    const flip = facing === ENGINE_ART_FACING ? 1 : -1;
    const intact = () => {
      if (!def) return null;
      const k = (HEX_W / def.pixelsPerHex) * CATAPULT_SPRITE_SCALE;
      return { art: { url: spriteUrl(def.file), width: def.width, height: def.height, visibleBounds: CATAPULT_INTACT_VISIBLE }, scaleX: k * flip, scaleY: k, anchor: [def.anchor[0], def.anchor[1]] as [number, number], tint: 0xffffff };
    };
    if (stage === 'intact') return intact();
    const own = this.engineArtOf(stage);
    if (own) {
      const d = engineStageDraw(own, this.engineVisibleWidth(), facing, stage === 'destroyed' ? this.engineArtOf('damaged') : null);
      return { art: own, scaleX: d.scaleX, scaleY: d.scaleY, anchor: [d.anchorX, d.anchorY], tint: 0xffffff };
    }
    // Not delivered: the intact still stands in, darkened (never a hidden engine).
    const stand = intact();
    return stand ? { ...stand, tint: stage === 'damaged' ? 0xc9a27e : 0x5f5040 } : null;
  }

  private buildEngine(): void {
    const at = this.enginePoint();
    const root = new Container();
    root.position.set(at.x, at.y);
    root.zIndex = root.y;
    if (graphicsProfile().shadows) root.addChild(groundShadow(HEX_W * 0.8, HEX_W * 0.2, 0.34));
    this.objects.addChild(root);
    const label = new Text({ text: '', style: { fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: '700', fill: '#f5e4b7', stroke: { color: '#1a1208', width: 3 } } });
    label.anchor.set(0.5, 1);
    this.floats.addChild(label);
    this.engineFig = { root, still: null, stage: null, token: 0, label, ready: Promise.resolve(), drawn: null };
    const throwFx = spriteManifest().effects['fx.siege.catapult.throw'];
    if (throwFx && graphicsProfile().effects !== 'simple') void loadStrip(throwFx).catch(() => null);
    // The other stages load with the board, so a blow never waits for its picture.
    for (const stage of ['damaged', 'destroyed'] as const) {
      const art = this.engineArtOf(stage);
      if (art) void loadTexture(art.url, { mipmaps: true }).catch(() => null);
    }
    this.setEngineHp(this.engineShownHp ?? this.engineView?.hp ?? 0);
  }

  /** Draw the engine at `hp`: its stage picture (swapped once loaded) and its label. */
  private setEngineHp(hp: number): void {
    this.engineShownHp = hp;
    const v = this.engineView;
    const fig = this.engineFig;
    if (!v || !fig) return;
    const stage = engineStageOf(hp, v.maxHp);
    const at = this.enginePoint();
    fig.label.text = hp > 0 ? `Catapult ${hp}/${v.maxHp}` : '';
    fig.label.visible = hp > 0;
    fig.label.position.set(at.x, at.y - this.engineVisibleWidth() * 0.62);
    this.upright(fig.label);
    if (fig.stage === stage) return;
    fig.stage = stage;
    const pick = this.stageArt(stage);
    const token = ++fig.token;
    if (!pick) return;
    fig.ready = loadTexture(pick.art.url, { mipmaps: pick.art.width > 512 }).then(
      (tex) => {
        if (this.disposed || fig.root.destroyed || fig.token !== token) return;
        const s = fig.still ?? new Sprite(tex);
        s.texture = tex;
        s.anchor.set(pick.anchor[0], pick.anchor[1]);
        s.scale.set(pick.scaleX, pick.scaleY);
        s.tint = pick.tint;
        if (!fig.still) {
          fig.root.addChild(s);
          fig.still = s;
        }
        const box = engineDrawnBox(pick.art, { scaleX: pick.scaleX, scaleY: pick.scaleY, anchorX: pick.anchor[0], anchorY: pick.anchor[1] }, { x: 0, y: 0 });
        fig.drawn = { stage, url: pick.art.url, scaleX: pick.scaleX, scaleY: pick.scaleY, anchor: pick.anchor, tinted: pick.tint !== 0xffffff, box };
        this.wake();
      },
      () => undefined,
    );
  }

  /** A blow lands on the engine: its picture and label change now, it shakes, the damage rises over it. */
  private async engineBlow(damage: number, hp: number, speed: number, luck: boolean): Promise<void> {
    const fig = this.engineFig;
    if (!fig) return;
    this.setEngineHp(hp);
    const at = this.enginePoint();
    void this.floatText({ x: at.x, y: at.y - this.engineVisibleWidth() * 0.55 }, luck ? `Lucky! −${damage}` : `−${damage}`, luck ? '#f5e4b7' : '#ff8a70', speed, luck ? 'icon.stat.luck' : undefined);
    const still = fig.still;
    if (!still || this.calm) return;
    await this.tweens.tween(
      300,
      (t) => {
        if (still.destroyed) return;
        still.x = Math.sin(t * Math.PI * 3) * (1 - t) * HEX_W * 0.05;
        still.alpha = t < 0.5 ? (Math.floor(t * 12) % 2 === 0 ? 0.55 : 1) : 1;
      },
      linear,
    );
    if (!still.destroyed) {
      still.x = 0;
      still.alpha = 1;
    }
  }

  /** Where a missile meets the engine: the middle of its painted body, on the side facing the shooter. */
  private engineContact(fromX: number): Pt {
    const at = this.enginePoint();
    const w = this.engineVisibleWidth();
    return { x: at.x + Math.sign(fromX - at.x) * w * 0.18, y: at.y - w * 0.22 };
  }

  /** The engine throws (engine mode): intact, the throw strip facing the walls; damaged, a recoil of its own picture. */
  private async throwEngine(): Promise<Pt> {
    const fig = this.engineFig!;
    const at = this.enginePoint();
    const facing = this.engineFacing();
    const flip = facing === ENGINE_ART_FACING ? 1 : -1;
    const fx = spriteManifest().effects['fx.siege.catapult.throw'];
    const still = fig.still;
    if (fig.stage === 'intact' && still && fx) {
      const k = (HEX_W / (fx.pixelsPerHex ?? 120)) * CATAPULT_SPRITE_SCALE;
      const [ax, ay] = fx.anchor ?? [0.5, 0.95];
      const release = { x: at.x + flip * (CATAPULT_RELEASE.x - ax) * fx.frameWidth * k, y: at.y + (CATAPULT_RELEASE.y - ay) * fx.frameHeight * k };
      if (graphicsProfile().effects !== 'simple' && (await loadStrip(fx).catch(() => null))) {
        still.alpha = 0;
        void this.effect('fx.siege.catapult.throw', at, { scale: CATAPULT_SPRITE_SCALE, flipX: flip === -1 }).then(() => {
          if (!still.destroyed) still.alpha = 1;
        });
        await this.tweens.wait((CATAPULT_RELEASE.frame / Math.max(1, fx.fps)) * 1000);
      }
      return release;
    }
    // Damaged: the throw strip would show the whole engine again, so its own picture recoils and the stone leaves the cup.
    const w = this.engineVisibleWidth();
    const cup = { x: at.x + facing * w * 0.42, y: at.y - w * 0.36 };
    if (still && !this.calm) {
      await this.tweens.tween(
        260,
        (t) => {
          if (!still.destroyed) still.rotation = -facing * Math.sin(t * Math.PI) * 0.06;
        },
        easeOut,
      );
      if (!still.destroyed) still.rotation = 0;
    }
    return cup;
  }

  /** The aim marks (outline of the aimed structure, restrained arc from the engine), redrawn only when they change. */
  private drawAim(aim: CatapultAimView | null): void {
    const fig = this.engineFig;
    const id = aim?.structureId ?? null;
    const st = id ? this.structureById(id) : undefined;
    const alive = !!fig && (this.engineShownHp ?? 0) > 0;
    const key = st && alive ? `${st.id}|${this.boardKey}|${this.shownHp.get(st.id) ?? st.hp}` : '';
    if (key === this.aimKey) return;
    this.aimKey = key;
    const g = this.aimMarks;
    g.clear();
    this.aimDrawn = null;
    if (!st || !alive) return;
    // Outline: the structure's cells; the keep (no cells) a ring where it stands beyond the east edge.
    if (st.cells.length > 0) {
      for (const c of st.cells) {
        const p = this.cellXY(c);
        g.poly(hexPolygon(p.x, p.y, RB * 0.97, S));
      }
      g.stroke({ width: 3, color: 0xf5ca72, alpha: 0.95 });
    } else {
      const k = this.structurePos(st);
      g.ellipse(k.x, k.y - RB * 0.9, RB * 1.5, RB * 1.5).stroke({ width: 3, color: 0xf5ca72, alpha: 0.95 });
    }
    const at = this.enginePoint();
    const w = this.engineVisibleWidth();
    const from = { x: at.x + this.engineFacing() * w * 0.42, y: at.y - w * 0.36 };
    const top = this.structureTop(st);
    const to = { x: top.x, y: top.y + RB * 0.4 };
    // A low arc (it stays on the board under the top row's headroom), dots every other sample over a dark rim.
    const pts = catapultArc(from, to, 30, 0.12, RB * 1.4);
    for (let i = 1; i < pts.length - 1; i += 2) g.circle(pts[i]!.x, pts[i]!.y, 4.4);
    g.fill({ color: 0x1a1208, alpha: 0.5 });
    for (let i = 1; i < pts.length - 1; i += 2) g.circle(pts[i]!.x, pts[i]!.y, 3);
    g.fill({ color: 0xf2d490, alpha: 0.95 });
    g.circle(to.x, to.y, 6).stroke({ width: 2, color: 0xf5ca72, alpha: 0.9 });
    this.aimDrawn = { structureId: st.id, from, to };
    this.wake();
  }

  /** The engine side's standing stacks beside the engine (an area spell at the engine reaches them). */
  private besideEngine(): StackEntry[] {
    const cells = (this.engineView?.cells ?? []).map((c) => cellPoint(c, RB, 1));
    return [...this.stacks.values()].filter((e) => !e.down && e.view.side === this.engineView?.side && this.flatCells(e).some((p) => cells.some((q) => Math.hypot(p.x - q.x, p.y - q.y) < HEX_W * 1.1)));
  }

  /** The keep under a board point (it has no cells: its picture beyond the east edge), else null. */
  private keepAt(local: Pt): string | null {
    const keep = this.siegeView?.structures.find((s) => s.kind === 'keep' && s.hp > 0);
    if (!keep) return null;
    const p = this.structurePos(keep);
    return Math.abs(local.x - p.x) < 60 && local.y < p.y + 15 && local.y > p.y - 120 ? keep.id : null;
  }

  private buildHighlights(view: BattleView): void {
    const g = this.highlight;
    g.clear();
    const fill = (all: readonly BattleCell[], k: number, color: number, alpha: number) => {
      // A masked board highlights its legal cells only (water never takes a move, target or zone mark).
      const cells = this.boardMask ? all.filter((c) => this.cellLegal(c)) : all;
      if (!cells.length) return;
      for (const c of cells) {
        const { x, y } = this.cellXY(c);
        g.poly(this.cellPoly(x, y, k));
      }
      g.fill({ color, alpha });
    };
    for (const field of view.spellFields ?? []) {
      const color = field.kind === 'frost' ? 0x9ddfff : field.kind === 'sanctuary' ? 0x73c89b : field.kind === 'eclipse' ? 0xad83d9 : 0xdbc6ff;
      fill(field.cells, 0.88, color, field.kind === 'glass' ? 0.42 : 0.24);
      for (const c of field.cells) {
        const { x, y } = this.cellXY(c);
        if (field.kind === 'glass') g.poly([x, y - RB * 0.75, x + RB * 0.3, y, x, y + RB * 0.25, x - RB * 0.3, y]).fill({ color, alpha: 0.8 }).stroke({ width: 2, color: 0xffffff, alpha: 0.7 });
        else g.circle(x, y, RB * 0.3).stroke({ width: 2, color, alpha: 0.9 });
      }
    }
    fill(view.zone, 0.93, 0xf1d48a, 0.24);
    fill(view.moves, 0.86, 0x4fc3d6, 0.24);
    fill(view.targets, 0.9, 0xe0573f, 0.32);
    if (view.path) {
      for (const c of view.path) {
        const { x, y } = this.cellXY(c);
        g.ellipse(x, y, RB * 0.16, RB * 0.16 * S);
      }
      g.fill({ color: 0x8fe07a, alpha: 0.95 });
    }
    if (view.attackFrom) {
      const { x, y } = this.cellXY(view.attackFrom);
      g.poly(this.cellPoly(x, y, 0.7)).fill({ color: 0xf1d48a, alpha: 0.45 });
      g.poly(this.cellPoly(x, y, 0.52)).fill({ color: 0x33332a, alpha: 0.3 });
    }
    // Inspection outlines: a dark rim under a bright line, so the shape reads on light and dark ground.
    const outline = (cells: readonly BattleCell[] | undefined, color: number) => {
      if (!cells?.length) return;
      for (const c of cells) {
        const { x, y } = this.cellXY(c);
        g.poly(this.cellPoly(x, y, 0.9));
      }
      g.stroke({ width: 5, color: 0x05090f, alpha: 0.85 });
      for (const c of cells) {
        const { x, y } = this.cellXY(c);
        g.poly(this.cellPoly(x, y, 0.9));
      }
      g.stroke({ width: 2.2, color, alpha: 1 });
    };
    outline(view.inspectedSource, 0xf1d48a);
    outline(view.inspected, 0xffffff);
    // Where a two-hex creature would stand: both cells (the rules' footprint), in the move colour.
    if (view.footprint && view.footprint.length > 1) {
      for (const c of view.footprint) {
        const { x, y } = this.cellXY(c);
        g.poly(this.cellPoly(x, y, 0.86));
      }
      g.stroke({ width: 2.4, color: 0x9fe8f5, alpha: 0.95 });
    }
  }

  // ------------------------------------------------------------------ stacks

  private groupPosition(anchor: BattleCell, footprint: 1 | 2, facing: 1 | -1): { x: number; y: number } {
    const a = this.cellXY(anchor);
    if (footprint === 1) return { x: a.x, y: a.y + RB * S * 0.3 };
    const b = this.cellXY({ col: anchor.col - facing, row: anchor.row });
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 + RB * S * 0.3 };
  }

  private place(e: StackEntry, anchor: BattleCell): void {
    const p = this.groupPosition(anchor, e.view.footprint, e.view.facing);
    e.root.position.set(p.x, p.y);
    e.root.zIndex = p.y;
    e.badge.position.set(p.x + e.badgeOffset.x, p.y + e.badgeOffset.y);
    this.applyHover(e, anchor);
  }

  /** The footprint cells of a stack standing at `anchor` (presentation copy of the rules' footprint). */
  private cellsAt(e: StackEntry, anchor: BattleCell): BattleCell[] {
    return e.view.footprint === 2 ? [anchor, { col: anchor.col - e.view.facing, row: anchor.row }] : [anchor];
  }

  /** The stack stands over open water of a sea board (a flyer hovers there; a body settles there). */
  private overWater(e: StackEntry, anchor: BattleCell = e.shownAnchor): boolean {
    return overOpenWater(this.cellsAt(e, anchor), this.boardMask);
  }

  /** An intrinsic flyer over the water hovers (`events.hover.idleHex`); elsewhere the figure stands on its ground point. */
  private applyHover(e: StackEntry, anchor: BattleCell = e.shownAnchor): void {
    if (e.down) return;
    e.figure.view.y = -hoverPx(e.figure.set, this.overWater(e, anchor), HEX_W);
  }

  /**
   * A body over the water settles after its held death pose (the set's `events.death`: sink and fade over
   * its time; reduced motion and a reload show the end at once). Cosmetic only: the rules keep its cells.
   */
  private async settleOverWater(e: StackEntry, animate: boolean): Promise<void> {
    const s = waterDeathSettle(e.figure.set, this.overWater(e), HEX_W);
    if (!s) return;
    const y0 = e.figure.view.y;
    const end = (k: number) => {
      e.figure.view.y = y0 + s.sinkPx * k;
      e.figure.view.alpha = 1 - (1 - s.alpha) * k;
    };
    if (!animate || this.calm || this.tweens.speed === 0) return end(1);
    await this.tweens.tween(s.fadeMs, (k) => !e.root.destroyed && end(k), linear);
  }

  /** A set with delivered event metadata holds its defend pose while the stack defends. */
  private holdsDefend(e: StackEntry): boolean {
    const d = e.figure.set?.animations['defend'];
    return !!e.view.defending && !!e.figure.set?.events && !!d && !d.loop;
  }

  private createStack(v: BattleStackView): StackEntry {
    const root = new Container();
    const w = v.footprint === 2 ? 1.7 : 1;
    if (graphicsProfile().shadows) root.addChild(groundShadow(HEX_W * 0.36 * w, HEX_W * 0.13, 0.36));
    // Side marker under the figure: blue disc (the human's side, else the attacker) or red disc with a
    // dark centre (the other side) — shape, not only colour.
    const base = new Graphics();
    const blue = v.side === this.blueSide;
    const sideCol = blue ? 0x3b73d9 : 0xb8453a;
    base.ellipse(0, 0, HEX_W * 0.4 * w, HEX_W * 0.4 * S * 0.62).fill({ color: sideCol, alpha: 0.5 }).stroke({ width: 2, color: sideCol, alpha: 0.95 });
    if (!blue) base.ellipse(0, 0, HEX_W * 0.22 * w, HEX_W * 0.22 * S * 0.62).fill({ color: 0x14141a, alpha: 0.5 });
    root.addChild(base);
    const aura = new StatusAura(RB, S);
    root.addChild(aura.back);
    const figure = new SpriteFigure({ set: creatureSprites(v.creatureId), phaseKey: v.id, hexWidth: HEX_W, accent: colorOf(v.accent) });
    figure.mirror = v.facing === -1;
    // A shooter's missile and impact load with the stack, so its first shot never waits for them.
    this.preloadMissile(profileForCreature(spriteManifest().projectileProfiles, v.creatureId)?.profile);
    root.addChild(figure.view);
    // A stack whose picture cannot be drawn (missing or failed to load) stands as a plain silhouette,
    // never as an empty, clickable disc (GUI audit 1.1.2).
    void figure.loaded.then(() => {
      if (figure.status !== 'missing' || root.destroyed) return;
      root.addChildAt(stackSilhouette(w), root.getChildIndex(figure.view));
      this.wake();
    });
    root.addChild(aura.front);
    // Count badge at the front foot.
    const badge = new Container();
    const badgeBg = new Graphics();
    const badgeText = new Text({ text: v.label, style: { fontFamily: 'Inter, sans-serif', fontSize: 15, fontWeight: '700', fill: v.labelColor } });
    badgeText.anchor.set(0.5);
    const marks = new Container();
    badge.addChild(badgeBg, badgeText, marks);
    this.upright(badge);
    const badgeOffset = { x: v.facing * HEX_W * 0.34 * w, y: RB * S * 0.28 };
    this.badges.addChild(badge);
    const e: StackEntry = {
      root,
      figure,
      base,
      badge,
      badgeText,
      badgeBg,
      badgeKey: '',
      badgeShown: { label: v.label, color: v.labelColor, visible: true },
      badgeAt: this.time,
      badgeOffset,
      marks,
      shownMarks: '',
      view: v,
      shownAnchor: v.anchor,
      prevAnchor: v.anchor,
      locked: 0,
      snapIn: 0,
      key: `${v.creatureId ?? ''}|${v.side}|${v.footprint}`,
      seed: v.id.length * 1.7 + v.anchor.row,
      down: false,
      aura,
      shownStatuses: [],
      auraDelay: 0,
      deathPlays: 0,
      hitPlays: 0,
    };
    this.setBadge(e, v.label, v.labelColor);
    this.place(e, v.anchor);
    this.objects.addChild(root);
    figure.setLoop('idle');
    // A stack already dead (a battle loaded from a save) lies where it fell.
    if (!v.alive) this.layDown(e);
    else this.applyAura(e);
    return e;
  }

  /**
   * Draw the badge `nextBadge` decided (its count, colour and whether it shows); remembers when the
   * count's text changed (read-only diagnostics: `stackDebug().labelAt`, the shot log's `badgeAt`).
   */
  private applyBadge(e: StackEntry, b: BadgeShown): void {
    if (b.label !== e.badgeShown.label) e.badgeAt = this.time;
    e.badgeShown = b;
    this.setBadge(e, b.label, b.color);
    e.badge.visible = b.visible;
  }

  /**
   * A stack held for playback shows the newest view's count now: the moment it takes its blow
   * (`sufferBlow`: melee, shots, tower arrows, the moat, damaging spells and miracles) or a heal or
   * status lands on it (its words are shown). Never earlier: see `syncStacks`.
   */
  private revealBadge(e: StackEntry): void {
    this.applyBadge(e, nextBadge(e.badgeShown, e.view, 'blow', e.locked > 0));
  }

  private setBadge(e: StackEntry, label: string, color: string): void {
    // Redrawn only when the count or its colour changes (each redraw renders the number again and re-sends it to the GPU).
    const key = `${label}|${color}|${e.view.side}|${this.blueSide}`;
    if (key === e.badgeKey) return;
    e.badgeKey = key;
    if (e.badgeText.text !== label) e.badgeText.text = label;
    if (e.badgeText.style.fill !== color) e.badgeText.style.fill = color;
    const w = Math.max(22, e.badgeText.width + 10);
    e.badgeBg.clear();
    e.badgeBg.roundRect(-w / 2, -10, w, 20, 5).fill({ color: e.view.side === this.blueSide ? 0x16284a : 0x4a1a16, alpha: 0.92 }).stroke({ width: 1.2, color: 0xc29a52, alpha: 0.9 });
  }

  /**
   * The fallen stay on the battlefield (owner request 2026-10-03): lying down
   * (their death strip's last frame, or the figure laid on its side), without
   * their side's marker or count; the rules keep their cells taken.
   */
  private layDown(e: StackEntry): void {
    e.down = true;
    e.root.visible = true;
    e.base.visible = false;
    this.applyBadge(e, nextBadge(e.badgeShown, e.view, 'death', false));
    e.figure.rest();
    if (e.figure.has('death')) e.figure.holdLast('death');
    else this.fallenPose(e, 1);
    e.root.zIndex = e.root.y - 2;
    // A body that fell over the water earlier (a reloaded battle) shows its settled end state at once.
    if (e.deathPlays === 0) void this.settleOverWater(e, false);
    e.shownStatuses = [];
    e.aura.clear();
    this.refreshMarks(e);
  }

  /** Show the stack's current statuses (after any spell that set them has played). */
  private applyAura(e: StackEntry): void {
    e.auraDelay = 0;
    e.shownStatuses = e.down || !e.view.alive ? [] : (e.view.statuses ?? []);
    e.shownMarks = '';
    this.refreshAura(e);
    this.refreshMarks(e);
  }

  /** An interface icon's texture, or null while it loads (or when it is not delivered). */
  private iconTexture(assetId: string): Texture | null {
    const url = this.cb.iconUrl?.(assetId) ?? null;
    if (!url) return null;
    const rect = this.cb.iconRegion?.(assetId);
    const key = rect ? `${url}#${rect.join(",")}` : url;
    const tex = this.iconTextures.get(key);
    if (tex) return tex;
    if (!this.iconLoading.has(key)) {
      this.iconLoading.add(key);
      loadTexture(url).then(
        (t) => {
          const texture=rect ? new Texture({source:t.source,frame:new Rectangle(...rect)}) : t;
          if(rect)this.croppedIconTextures.add(texture);
          this.iconTextures.set(key,texture);
          this.marksDirty = true;
        },
        () => undefined,
      );
    }
    return null;
  }

  /**
   * The row of small icons over the count badge (statuses, defending, waiting,
   * aspect; Brief 13 art): up to five, centred above the badge, each on a dark
   * disc with a gold rim. Icons still loading are added when they arrive.
   */
  private refreshMarks(e: StackEntry): void {
    const list = e.down || !e.view.alive ? [] : (e.view.marks ?? []);
    const ready: { icon: string; tex: Texture }[] = [];
    let pending = false;
    for (const m of list) {
      if (ready.length >= MAX_MARKS) break;
      const tex = this.iconTexture(m.icon);
      if (tex) ready.push({ icon: m.icon, tex });
      else if (this.cb.iconUrl?.(m.icon)) pending = true;
    }
    const key = ready.map((r) => r.icon).join(',') + (pending ? '…' : '');
    if (key === e.shownMarks) return;
    e.shownMarks = key;
    for (const c of e.marks.removeChildren()) c.destroy({ children: true });
    const step = MARK_R * 2 + 3;
    ready.forEach((r, i) => {
      const m = new Container();
      const disc = new Graphics();
      disc.circle(0, 0, MARK_R).fill({ color: 0x10131a, alpha: 0.88 }).stroke({ width: 1.2, color: 0xc29a52, alpha: 0.95 });
      const sp = new Sprite(r.tex);
      sp.anchor.set(0.5);
      sp.scale.set((MARK_R * 1.9) / Math.max(1, r.tex.width));
      m.addChild(disc, sp);
      m.position.set((i - (ready.length - 1) / 2) * step, -10 - 3 - MARK_R);
      e.marks.addChild(m);
    });
  }

  private refreshAura(e: StackEntry): void {
    e.aura.set(e.shownStatuses, Math.max(RB * 0.9, e.figure.height * 0.85), e.view.footprint === 2 ? 1.7 : 1, e.view.facing);
  }

  /** Fallback death pose (no death strip): tipped over backwards and a little dimmed. */
  private fallenPose(e: StackEntry, t: number): void {
    const back = e.view.facing === 1 ? -1 : 1;
    e.figure.pose.rotation = back * t * (Math.PI / 2.2);
    e.figure.pose.y = -t * e.figure.height * 0.12;
    e.figure.pose.alpha = 1 - t * 0.15;
  }

  private disposeStack(e: StackEntry): void {
    e.figure.destroy();
    e.badge.destroy({ children: true });
    e.root.destroy({ children: true });
  }

  private syncStacks(views: readonly BattleStackView[]): void {
    const seen = new Set<string>();
    let active: StackEntry | null = null;
    for (const v of views) {
      seen.add(v.id);
      let e = this.stacks.get(v.id);
      const key = `${v.creatureId ?? ''}|${v.side}|${v.footprint}`;
      if (e && e.key !== key && e.locked === 0 && v.alive) {
        this.disposeStack(e);
        e = undefined;
      }
      if (!e) {
        e = this.createStack(v);
        this.stacks.set(v.id, e);
      }
      const moved = e.view.anchor.col !== v.anchor.col || e.view.anchor.row !== v.anchor.row;
      if (moved) {
        e.prevAnchor = e.view.anchor;
        if (e.locked === 0) e.snapIn = 3;
      }
      const died = !v.alive && e.view.alive;
      // A held defend pose ends when the stack no longer defends (its next activation began).
      if (e.locked === 0 && v.alive && !v.defending && e.view.defending && e.figure.current?.requested === 'defend') e.figure.setLoop('idle');
      const marksOf = (x: BattleStackView) => (x.marks ?? []).map((m) => m.icon).join(',');
      const statusesChanged = (v.statuses ?? []).join(',') !== e.shownStatuses.join(',') || marksOf(v) !== marksOf(e.view);
      e.view = v;
      e.figure.view.alpha = v.illusion ? .55 : 1;
      e.figure.view.tint = v.illusion ? 0x94d9ec : 0xffffff;
      if (statusesChanged && e.locked === 0 && e.auraDelay === 0) e.auraDelay = 3;
      // A stack held for playback keeps the count (and the badge of a stack it kills) it shows:
      // the new count appears when its blow lands (`revealBadge`) or when it is released (`snap`),
      // never before the missile arrives. Unheld stacks (and instant playback, at release) follow the view.
      this.applyBadge(e, nextBadge(e.badgeShown, v, 'view', e.locked > 0));
      if (v.alive && e.down && e.locked === 0) {
        // Raised again (resurrection-type recovery): stand up.
        e.down = false;
        e.base.visible = true;
        e.figure.rest();
        e.figure.setLoop('idle');
        this.applyAura(e);
      }
      // Died without playback (instant speed): lie down now; otherwise the death playback does it.
      if (died && e.locked === 0) this.layDown(e);
      if (v.active && v.alive) active = e;
    }
    for (const [id, e] of this.stacks) {
      if (!seen.has(id)) {
        this.disposeStack(e);
        this.stacks.delete(id);
      }
    }
    this.activeStack = active;
  }

  update(view: BattleView): void {
    this.wake();
    const bk = `${view.battleId}|${view.climate ?? ''}|${view.obstacles.length}|${view.siege?.moat.length ?? -1}|${view.siege?.structures.length ?? -1}`;
    if (bk !== this.boardKey) {
      for (const e of this.stacks.values()) this.disposeStack(e);
      this.stacks.clear();
      this.boardKey = bk;
      this.buildBoard(view);
      this.shownHp.clear();
      this.structureKey = '';
    }
    this.siegeView = view.siege;
    const sk = view.siege ? view.siege.structures.map((x) => `${x.id}:${x.hp}`).join('|') : '';
    if (sk !== this.structureKey) {
      const first = this.structureKey === '';
      this.structureKey = sk;
      if (first) this.syncStructures();
      else if (this.structuresLocked === 0) this.structureSnapIn = 3;
    }
    // The engine's HP (and picture) follow the view except while a blow at it waits for playback.
    const ev = view.siege?.engine ?? null;
    if (ev && this.engineFig) {
      this.engineView = ev;
      if (this.engineLocked === 0 && ev.hp !== this.engineShownHp) this.setEngineHp(ev.hp);
    }
    this.drawAim(view.catapultAim ?? null);
    this.grid.visible = view.grid;
    this.calm = !!view.calm;
    if (view.highlightKey !== this.highlightKey) {
      this.buildHighlights(view);
      this.highlightKey = view.highlightKey;
    }
    this.syncStacks(view.stacks);
    this.watchReadiness();
  }

  /**
   * A new board reports ready once its painting and the standing frame of each stack on it are in
   * (failures count as in: a stack without its picture gets a silhouette). Stacks that join later
   * (a summons) never make a readable board "loading" again.
   */
  private watchReadiness(): void {
    if (this.readyFor === this.boardKey) return;
    const board = (this.readyFor = this.boardKey);
    this.boardIsReady = false;
    this.cb.onBoardReady?.(false);
    const waits: Promise<unknown>[] = [this.backdropLoad];
    for (const e of this.stacks.values()) waits.push(e.figure.firstFrame);
    if (this.engineFig) waits.push(this.engineFig.ready);
    // A siege's walls, gate, towers, keep, moat and bridge belong to the readable board too.
    const siege = this.siegeView;
    if (siege && siege.structures.length) {
      const defs = new Set<StaticSpriteDefinition>();
      for (const st of siege.structures) {
        const d = this.siegeDef(st, this.shownHp.get(st.id) ?? st.hp);
        if (d) defs.add(d);
      }
      for (const id of ['ground.ditch', 'ground.ditch.top', 'ground.ditch.bottom', 'ground.bridge']) {
        const d = spriteManifest().siege[id];
        if (d) defs.add(d);
      }
      for (const d of defs) waits.push(stillTexture({ ...d, frame: undefined }).catch(() => null));
    }
    const cap = new Promise<void>((done) => setTimeout(done, BOARD_READY_CAP_MS));
    void Promise.race([Promise.all(waits), cap]).then(() => {
      if (this.disposed || this.readyFor !== board) return;
      this.boardIsReady = true;
      this.wake();
      this.cb.onBoardReady?.(true);
    });
  }

  /** Whether the current board's essential pictures are drawn (read-only, for the screen and tests). */
  get boardReady(): boolean {
    return this.boardIsReady;
  }

  // ------------------------------------------------------------------ siege structures

  /** Where a structure stands (the keep sits beyond the east edge). */
  private structurePos(st: SiegeStructureView): { x: number; y: number } {
    if (st.cells.length === 0) {
      return siegeKeepPoint(this.cols, this.rows);
    }
    let x = 0;
    let y = 0;
    for (const c of st.cells) {
      const w = this.wallPoint(c.col, c.row);
      x += w.x;
      y += w.y;
    }
    return { x: x / st.cells.length, y: y / st.cells.length };
  }

  private structureTop(st: SiegeStructureView): { x: number; y: number } {
    const p = this.structurePos(st);
    const def = this.siegeDef(st, this.shownHp.get(st.id) ?? st.hp);
    if (st.kind === 'wall') return { x: p.x - 20, y: p.y - 42 };
    // A gate painted into the wall: the label stands over its lintel block.
    if (isWallGate(def)) return { x: p.x - 6, y: p.y + gateJambs(this.siegeView?.pantheonId).north * SIEGE_ROW * GATE_FIT - 2 };
    return { x: p.x, y: p.y + RB * S * 0.3 - Math.max(RB, stillHeight(def, HEX_W)) };
  }

  private siegeDef(st: SiegeStructureView, hp: number): StaticSpriteDefinition | null {
    const all = spriteManifest().siege;
    const state = hp <= 0 ? 'rubble' : hp < st.maxHp ? 'damaged' : 'intact';
    const p = this.siegeView?.pantheonId;
    // The defending pantheon's own fortification (Brief 15) when delivered, else the shared one.
    return (p ? all[`${st.kind}.${state}.${p}`] : undefined) ?? all[`${st.kind}.${state}`] ?? all[`${st.kind}.intact`] ?? null;
  }

  /** A siege battlefield painting of the defending pantheon (`battlefield.siege.ground.<pantheon>`, Brief 15), if delivered. */
  private siegeGround(view: BattleView): ReturnType<typeof battlefieldArt> {
    if (!view.siege || view.siege.structures.length === 0) return null;
    return battlefieldArt('siege', view.siege.pantheonId ?? null);
  }

  /**
   * Where a wall, gate or tower piece of row `row` stands: the wall column zig-zags
   * between rows, so pieces stand on one straight line halfway between its cells
   * and join into a continuous wall (owner report 2026-10-05).
   */
  private wallPoint(col: number, row: number): { x: number; y: number } {
    return siegeWallPoint(col, row);
  }

  /** Draw every structure at its shown HP (intact, damaged or rubble). */
  private syncStructures(): void {
    const view = this.siegeView;
    for (const st of view?.structures ?? []) if (this.structuresLocked === 0 || !this.shownHp.has(st.id)) this.shownHp.set(st.id, st.hp);
    this.drawStructures();
  }

  private drawStructures(): void {
    this.clearStructurePieces();
    const view = this.siegeView;
    if (!view || view.structures.length === 0) return;
    const shown = (s: SiegeStructureView) => this.shownHp.get(s.id) ?? s.hp;
    // A gate painted as an opening in the wall (siege-gates-v3) draws the wall cells either side of
    // it while their sections stand, and is cut back to its own jambs when one falls (siegeGate.ts).
    const gate = view.structures.find((s) => s.kind === 'gate' && s.cells.length === 1);
    const gateDef = gate ? this.siegeDef(gate, shown(gate)) : null;
    const gateRow = gate && isWallGate(gateDef) ? gate.cells[0]!.row : null;
    const neighbour = (row: number): GateNeighbour => {
      const s = view.structures.find((x) => x.kind === 'wall' && x.cells.some((c) => c.row === row));
      return s && shown(s) > 0 ? 'standing' : 'fallen';
    };
    const drawnByGate = (row: number) => gateRow !== null && Math.abs(row - gateRow) === 1 && neighbour(row) === 'standing';
    const drawn: SiegeDrawn = { gate: null, wallRows: [] };
    this.siegeDrawn = drawn;
    for (const st of view.structures) {
      const hp = shown(st);
      const def = this.siegeDef(st, hp);
      if (st === gate && gateRow !== null && isWallGate(def)) {
        const at = this.wallPoint(st.cells[0]!.col, gateRow);
        const north = neighbour(gateRow - 1);
        const south = neighbour(gateRow + 1);
        const parts = wallGateParts(def, view.pantheonId, north, south, hp <= 0, graphicsProfile().shadows);
        for (const part of parts) {
          part.root.position.set(at.x + wallGateShift(view.pantheonId), at.y);
          part.root.zIndex = at.y + part.depth;
          this.objects.addChild(part.root);
          this.structurePieces.push(part.root);
        }
        drawn.gate = { file: def.file, frame: [...def.frame], hp, row: gateRow, passage: { x: at.x + wallGateShift(view.pantheonId), y: at.y }, depths: parts.map((x) => at.y + x.depth), north, south };
        this.structureLabel(st, hp);
        continue;
      }
      const spots = st.kind === 'keep' || st.cells.length === 0 ? [this.structurePos(st)] : st.cells.map((c) => this.wallPoint(c.col, c.row));
      for (const [index, p] of spots.entries()) {
        if (st.kind === 'wall' && drawnByGate(st.cells[index]!.row)) continue;
        if (st.kind === 'wall') drawn.wallRows.push(st.cells[index]!.row);
        // Pieces join the depth-sorted objects so creatures pass in front and behind correctly.
        const piece = new Container();
        piece.position.set(p.x, p.y);
        piece.zIndex = piece.y;
        // The shared keep was cut small; a pantheon's own keep (Brief 15) is painted at the board's scale.
        const own = !!def && Object.entries(spriteManifest().siege).some(([k, v]) => v === def && k.split('.').length === 3);
        if (st.kind === 'wall') {
          const row=st.cells[index]!.row;
          const northTower=view.structures.find(s=>s.kind==='tower' && s.cells.some(c=>c.row===row-1));
          const joinNorth=!!northTower && (this.shownHp.get(northTower.id) ?? northTower.hp)>0;
          piece.addChild(def?.layout === 'wall-strip' && def.frame
            ? paintedWall(def,row,graphicsProfile().shadows,joinNorth)
            : connectedWall(view.pantheonId, hp, st.maxHp, row, graphicsProfile().shadows));
        } else {
          if (graphicsProfile().shadows) piece.addChild(groundShadow(st.kind === 'keep' ? 56 : 35, st.kind === 'keep' ? 20 : 13, 0.3));
          piece.addChild(stillSprite(def, HEX_W, st.kind === 'keep' && !own ? 1.6 : 1));
        }
        this.objects.addChild(piece);
        this.structurePieces.push(piece);
      }
      this.structureLabel(st, hp);
    }
  }

  /** The "Wall 1/2" label over a damaged structure (hidden while it is whole). */
  private structureLabel(st: SiegeStructureView, hp: number): void {
    if (hp <= 0) return;
    const top = this.structureTop(st);
    const t = new Text({ text: `${st.kind[0]!.toUpperCase()}${st.kind.slice(1)} `, style: { fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: '700', fill: '#f5e4b7', stroke: { color: '#1a1208', width: 3 } } });
    t.visible = hp < st.maxHp;
    t.anchor.set(0.5, 1);
    t.position.set(top.x, top.y - 4);
    this.upright(t);
    this.floats.addChild(t);
    this.structureLabels.push(t);
    this.structureLabelInfo.push({ label: t, structure: st, damaged: hp < st.maxHp });
  }

  /** What the last structure drawing put on the board (read-only diagnostics, `siegeDebug`). */
  private siegeDrawn: SiegeDrawn = { gate: null, wallRows: [] };
  private structurePieces: Container[] = [];
  private structureLabels: Text[] = [];
  private structureLabelInfo: { label: Text; structure: SiegeStructureView; damaged: boolean }[] = [];

  private clearStructurePieces(): void {
    for (const p of this.structurePieces) p.destroy({ children: true });
    for (const l of this.structureLabels) l.destroy();
    this.structurePieces = [];
    this.structureLabels = [];
    this.structureLabelInfo = [];
  }

  private structureById(id: string): SiegeStructureView | undefined {
    return this.siegeView?.structures.find((s) => s.id === id);
  }

  // ------------------------------------------------------------------ playback helpers

  /** A word rising over a stack; `icon` (an interface icon asset ID) stands before it when delivered and loaded. */
  private floatText(at: { x: number; y: number }, text: string, color: string, speed: number, icon?: string): Promise<void> {
    const t = new Container();
    const word = new Text({ text, style: { fontFamily: 'Inter, sans-serif', fontSize: 22, fontWeight: '700', fill: color, stroke: { color: '#10131a', width: 4 } } });
    word.anchor.set(0.5, 1);
    t.addChild(word);
    const tex = icon ? this.iconTexture(icon) : null;
    if (tex) {
      const size = 26;
      const sp = new Sprite(tex);
      sp.anchor.set(0.5, 1);
      sp.scale.set(size / Math.max(1, tex.width));
      word.x = (size + 4) / 2;
      sp.x = word.x - word.width / 2 - 4 - size / 2;
      sp.y = 1;
      t.addChildAt(sp, 0);
    }
    t.position.set(at.x, at.y);
    this.upright(t);
    this.floats.addChild(t);
    const tw = new TweenPlayer();
    tw.speed = speed;
    this.extraTweens.push(tw);
    return tw
      .tween(
        900,
        (k) => {
          t.y = at.y - k * RB * 0.9;
          t.alpha = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3;
        },
        linear,
      )
      .then(() => {
        t.destroy({ children: true });
        this.extraTweens = this.extraTweens.filter((x) => x !== tw);
      });
  }

  private headOf(e: StackEntry): { x: number; y: number } {
    return { x: e.root.x, y: e.root.y - Math.max(RB * 0.9, e.figure.height * 0.85) };
  }

  private chestOf(e: StackEntry): { x: number; y: number } {
    return { x: e.root.x, y: e.root.y - Math.max(RB * 0.5, e.figure.height * 0.5) };
  }

  // ------------------------------------------------------------------ missiles (battle FX delivery 2026-10-15)

  /** Start loading a profile's travel poses and impact strip (cached; one decode per sheet). Presentation only. */
  private preloadMissile(p: ProjectileProfile | null | undefined): void {
    if (!p) return;
    void loadStrip(travelStrip(p)).catch(() => null);
    const hit = spriteManifest().effects[p.impactEffectId];
    if (hit) void loadStrip(hit).catch(() => null);
  }

  /** The profiles of this session's sprite manifest (absent: every shot flies the generic still). */
  private missileOf(ev: GameEvent, fallback: 'arrow' | 'stone'): MissileChoice {
    return missileFor(ev, (id) => this.stacks.get(id)?.view.creatureId, spriteManifest().projectileProfiles) ?? { kind: 'fallback', still: fallback };
  }

  /**
   * When and where a stack lets its missile go, for the animation `anim` it plays (with at least
   * `minMs`): the release frame of its own shoot strip and its calibrated socket
   * (`RELEASE_SOCKETS`), else a third of the way into whatever strip stands in, from the profile's
   * logical source point on the figure's size.
   */
  private releaseOf(a: StackEntry, choice: MissileChoice, anim: 'shoot' | 'attack', minMs: number): { delay: number; socket: ReleaseSocket & { calibrated: boolean } } {
    const f = a.figure;
    const strip = f.resolve(anim)?.def ?? null;
    // A delivered frame-region shot carries its own socket (sea creatures: `events.shoot`, measured in its release frame).
    const delivered = anim === 'shoot' && f.has('shoot') && strip?.regions ? regionReleaseSocket(strip, strip.pixelsPerHex ?? f.set?.pixelsPerHex ?? 100, f.set?.events?.shoot) : null;
    const own = anim === 'shoot' && f.has('shoot') && (!strip?.regions || !!delivered);
    const frames = strip ? stripFrameCount(strip) : 6;
    const socket = releaseSocket(a.view.creatureId, {
      ...(choice.kind === 'profile' ? { sourcePoint: choice.profile.sourcePoint } : {}),
      heightHex: f.height / HEX_W,
      footprint: a.view.footprint,
      ownShootStrip: own,
      frames,
      delivered,
    });
    const delay = strip && f.status === 'ready' ? f.frameDelay(anim, socket.frame, minMs) : LEGACY_RELEASE_MS;
    return { delay, socket };
  }

  /** The socket's board point now: the stack's anchor, its pose offset (the throw's recoil) and the way the figure faces. */
  private socketPoint(a: StackEntry, socket: ReleaseSocket): Pt {
    return releasePoint({ x: a.root.x, y: a.root.y + a.figure.view.y }, socket, a.figure.mirror ? -1 : 1, HEX_W, { x: a.figure.pose.x, y: a.figure.pose.y });
  }

  /** Where a missile meets a stack: the middle of its painted body, on the side facing the shooter. */
  private contactOf(t: StackEntry, fromX: number): Pt {
    const tight = !!t.figure.set?.animations['idle']?.regions;
    return contactPoint({ x: t.root.x, y: t.root.y }, { heightPx: t.figure.height, tight, footprint: t.view.footprint, fromX, hexW: HEX_W });
  }

  private logShot(event: string, source: ShotRecord['source'], creatureId: string | null, choice: MissileChoice, from: Pt, to: Pt, socket: ShotRecord['socket'], facing: 1 | -1): ShotRecord {
    const page = (p: Pt): Pt => {
      const q = this.toPage(p);
      return { x: Math.round(q.x * 10) / 10, y: Math.round(q.y * 10) / 10 };
    };
    const round = (p: Pt): Pt => ({ x: Math.round(p.x * 10) / 10, y: Math.round(p.y * 10) / 10 });
    const rec: ShotRecord = {
      seq: ++this.shotSeq,
      event,
      source,
      creatureId,
      profile: choice.kind === 'profile' ? choice.profileId : null,
      fallback: choice.kind === 'fallback' ? choice.still : null,
      path: choice.kind === 'profile' ? choice.profile.path : 'legacy',
      playback: choice.kind === 'profile' ? choice.profile.travelPlayback : 'static',
      from: page(from),
      to: page(to),
      boardFrom: round(from),
      boardTo: round(to),
      facing,
      socket,
      mirroredBoard: this.mirrored,
      speed: this.tweens.speed,
      drawnHex: null,
      flightMs: 0,
      arc: 0,
      launchAngle: 0,
      arrivalAngle: 0,
      travelOffsetDeg: 0,
      launchedAt: this.time,
      arrivedAt: null,
      impact: null,
      impacts: 0,
      impactAt: null,
      impactFrames: [],
      impactEndAt: null,
      impactScale: null,
      reactAt: null,
      labelAtLaunch: null,
      labelAtImpact: null,
      badgeAt: null,
      hitStopMs: 0,
      killFlash: false,
      cues: [],
    };
    this.shotLog = [...this.shotLog.slice(-(SHOT_LOG - 1)), rec];
    return rec;
  }

  /**
   * One missile from `from` to `to` (board points) on the tween clock, so battle speed, skip and
   * instant playback apply to it: a profile's path (high arc for heavy stones, shallow for
   * javelins, darts, arrows and sling stones, straight for magic, breath, wails and fire), flight
   * time from the distance within its range, its art turned along the tangent (it faces +X; drawn
   * at its full source cell = `sizeHex` hexes), the first pose moved through the world for
   * physical missiles or the four poses looping for magic. Unknown shooters and missing art fly
   * the old generic still. Resolves on arrival, with the travel sprite already removed.
   */
  private async flyMissile(choice: MissileChoice, from: Pt, to: Pt, rec: ShotRecord): Promise<void> {
    if (this.disposed) return;
    const dist = Math.hypot(to.x - from.x, to.y - from.y);
    const holder = new Container();
    this.fx.addChild(holder);
    this.missiles.add(holder);
    let ms: number;
    let arc: number;
    let onFrame: ((elapsedMs: number) => void) | null = null;
    const fallbackStill = (still: 'arrow' | 'stone') => {
      const def = spriteManifest().projectiles[still] ?? null;
      holder.addChild(stillSprite(def, HEX_W, PROJECTILE_SIZE[still] ?? 1));
      if (!def) holder.addChild(new Graphics().rect(-RB * 0.3, -1.5, RB * 0.6, 3).fill({ color: 0xd8c08a }));
    };
    if (choice.kind === 'profile') {
      const p = choice.profile;
      ms = flightMs(p.durationMsRange, dist, HEX_W);
      arc = arcHeight(p.path, dist, HEX_W);
      const strip = travelStrip(p);
      const sprite = new Sprite(Texture.EMPTY);
      holder.addChild(sprite);
      let frames = stripFrames(strip);
      let shown = -1;
      let want = 0;
      const show = (i: number) => {
        want = i;
        if (!frames || frames.length === 0 || sprite.destroyed) return;
        const k = Math.min(frames.length - 1, i);
        if (k === shown) return;
        shown = k;
        sprite.texture = frames[k]!;
        const tr = effectFrameTransform(strip, k, HEX_W);
        sprite.anchor.set(tr.anchor[0], tr.anchor[1]);
        sprite.scale.set(tr.scale);
        rec.drawnHex = Math.round(((tr.scale * (p.travel[k]?.rect[2] ?? 0)) / HEX_W) * 1000) / 1000;
      };
      if (!frames) {
        // Still loading (it normally loaded with the stack): shown as soon as it is in; failing, the old still.
        sprite.visible = false;
        loadStrip(strip).then(
          (f) => {
            if (sprite.destroyed) return;
            frames = f;
            sprite.visible = true;
            show(want);
          },
          () => {
            if (holder.destroyed) return;
            rec.fallback = 'missing-art';
            fallbackStill(p.path === 'high-ballistic' ? 'stone' : 'arrow');
          },
        );
      }
      onFrame = (elapsed) => show(travelFrame(p.travelPlayback, elapsed, p.travelFps, frames?.length ?? p.travel.length));
    } else {
      ms = legacyFlightMs(dist, HEX_W);
      arc = arcHeight('legacy', dist, HEX_W);
      fallbackStill(choice.still);
    }
    // A high lob never rises under the HUD: its apex stays inside the board's frame.
    arc = fitArc(from, to, arc, this.boardRect().y0);
    rec.flightMs = ms;
    rec.arc = Math.round(arc * 10) / 10;
    rec.travelOffsetDeg = Math.round(((choice.kind === 'profile' ? (choice.profile.travelRotationOffsetRad ?? 0) : 0) * 180) / Math.PI);
    const place = (t: number) => {
      const pt = samplePath(from, to, t, arc);
      holder.position.set(pt.x, pt.y);
      const m = missileTransform(pt.angle, this.mirrored);
      // Art painted facing another way turns by its profile's offset (Deepwater Blast: π); impacts never do.
      holder.rotation = travelRotation(m.rotation, choice.kind === 'profile' ? choice.profile : null);
      holder.scale.y = m.scaleYSign;
      onFrame?.(t * ms);
      return pt.angle;
    };
    rec.launchAngle = Math.round((place(0) * 180) / Math.PI);
    await this.tweens.tween(ms, (t) => !holder.destroyed && place(t), linear);
    rec.arrivalAngle = Math.round((samplePath(from, to, 1, arc).angle * 180) / Math.PI);
    this.missiles.delete(holder);
    if (!holder.destroyed) holder.destroy({ children: true });
    rec.arrivedAt = this.time;
  }

  /**
   * A missile's impact at its contact point, once, as it arrives: the profile's four frames at its
   * own rate, upright, normal alpha, fading over its last milliseconds. Missing art keeps the old
   * look: the dust flash on a wall, nothing over a creature (its hit strip shows the blow).
   */
  private impactFx(choice: MissileChoice, at: Pt, onStructure: boolean, rec: ShotRecord | null): Promise<void> {
    if (this.disposed) return Promise.resolve();
    const p = choice.kind === 'profile' ? choice.profile : null;
    if (p && spriteManifest().effects[p.impactEffectId]) {
      if (rec) rec.impact = p.impactEffectId;
      return this.effect(p.impactEffectId, at, {
        impact: true,
        fps: p.impactFps,
        fadeLastMs: p.impactFadeLastMs,
        additive: p.blend === 'additive',
        onFrame: (frame, scale) => {
          if (!rec) return;
          if (rec.impactFrames.length === 0) {
            rec.impacts += 1;
            rec.impactAt = this.time;
            rec.impactScale = Math.round(scale * 10000) / 10000;
          }
          if (rec.impactFrames[rec.impactFrames.length - 1] !== frame) rec.impactFrames.push(frame);
        },
        onEnd: () => {
          if (rec) rec.impactEndAt = this.time;
        },
      });
    }
    if (!onStructure) return Promise.resolve();
    if (rec) {
      rec.impact = 'impact';
      rec.impacts += 1;
      rec.impactAt = this.time;
    }
    return this.effect('impact', at, { flash: 0xc8b89a });
  }

  /**
   * A one-shot effect strip at a point (a short flash in `flash` colour on Low or when the strip
   * is missing). A frame-region strip places every frame by its own region: anchor = the region's
   * pixel anchor over its rectangle, scale = (hex width / pixelsPerHex) × sourceScale × `scale`;
   * a strip without regions keeps its one anchor and scale.
   */
  private async effect(id: string, at: Pt, opts: EffectOptions = {}): Promise<void> {
    const def: EffectDefinition | undefined = spriteManifest().effects[id];
    const scale = opts.scale ?? 1;
    const simple = graphicsProfile().effects === 'simple';
    if (!def || (simple && !opts.impact)) {
      if (opts.impact) return;
      const g = new Graphics();
      g.ellipse(0, 0, RB * 0.9 * scale, RB * 0.9 * S * scale).fill({ color: opts.flash ?? 0xffffff, alpha: 0.5 });
      g.position.set(at.x, at.y);
      g.blendMode = 'add';
      this.fx.addChild(g);
      await this.tweens.tween(320, (t) => {
        g.alpha = 1 - t;
        g.scale.set(0.6 + t * 0.6);
      });
      g.destroy();
      return;
    }
    // Already cut (preloaded with the stack): the first frame shows in this very moment.
    const frames = stripFrames(def) ?? (await loadStrip(def).catch(() => null));
    if (!frames || frames.length === 0 || this.disposed) return;
    const s = new Sprite(frames[0]!);
    // An impact stays upright as painted, also on a board drawn mirrored.
    const flip = opts.impact && this.mirrored ? -1 : 1;
    const place = (i: number) => {
      const tr = effectFrameTransform(def, i, HEX_W, scale);
      s.texture = frames[i]!;
      s.anchor.set(tr.anchor[0], tr.anchor[1]);
      s.scale.set(tr.scale * flip * (opts.flipX ? -1 : 1), tr.scale);
      opts.onFrame?.(i, tr.scale);
    };
    place(0);
    if (opts.additive ?? def.additive) s.blendMode = 'add';
    s.position.set(at.x, at.y);
    this.fx.addChild(s);
    if (opts.impact && (simple || this.calm)) {
      // Reduced effects: the first frame only, briefly faded out.
      await this.tweens.tween(REDUCED_IMPACT_MS, (t) => !s.destroyed && (s.alpha = 1 - t), linear);
    } else {
      const fps = opts.fps ?? def.fps;
      const total = impactDurationMs(frames.length, fps);
      let shown = 0;
      await this.tweens.tween(
        total,
        (t) => {
          if (s.destroyed) return;
          const elapsed = t * total;
          const i = impactFrame(elapsed, frames.length, fps);
          if (i !== shown) {
            shown = i;
            place(i);
          }
          if (opts.fadeLastMs) s.alpha = impactAlpha(elapsed, total, opts.fadeLastMs);
        },
        linear,
      );
    }
    opts.onEnd?.();
    if (!s.destroyed) s.destroy();
  }

  private lock(e: StackEntry | undefined): void {
    if (!e) return;
    e.locked += 1;
    e.snapIn = 0;
  }

  private unlock(e: StackEntry | undefined): void {
    if (!e) return;
    e.locked = Math.max(0, e.locked - 1);
    if (e.locked === 0) this.snap(e);
  }

  private snap(e: StackEntry): void {
    this.place(e, e.view.anchor);
    e.figure.mirror = e.view.facing === -1;
    e.shownAnchor = e.view.anchor;
    // Released: the badge says what the view says (the same end at every speed, and after a skip).
    this.applyBadge(e, nextBadge(e.badgeShown, e.view, 'release', false));
    if (!e.view.alive) {
      if (!e.down) this.layDown(e);
      else e.root.zIndex = e.root.y - 2;
      return;
    }
    e.root.visible = true;
    e.base.visible = true;
    e.figure.rest();
    if (this.holdsDefend(e)) e.figure.holdLast('defend');
    else if (!this.celebrating.has(e)) e.figure.setLoop('idle');
    this.applyAura(e);
  }

  /**
   * Keep the stacks (and fortifications) these events touch as they are drawn
   * now, so a newer view does not show the outcome before its playback. Returns
   * the release. Used by `play`, and by the interface to hold a battle miracle's
   * targets while its painted card is up.
   */
  hold(events: readonly GameEvent[]): () => void {
    const touched = new Set<StackEntry>();
    const lockOnce = (e: StackEntry | undefined) => {
      if (e && !touched.has(e)) {
        touched.add(e);
        this.lock(e);
      }
    };
    let structures = false;
    let engine = false;
    for (const ev of events) {
      if (ev.kind === 'BattleStackMoved' || ev.kind === 'BattleAttack' || ev.kind === 'BattleStackDestroyed') {
        lockOnce(this.stacks.get(ev.kind === 'BattleAttack' ? ev.attackerId : ev.stackId));
        if (ev.kind === 'BattleAttack') lockOnce(this.stacks.get(ev.targetId));
      } else if (ev.kind === 'SiegeTurretShot' || ev.kind === 'SiegeMoatDamage') {
        lockOnce(this.stacks.get(ev.kind === 'SiegeTurretShot' ? ev.targetId : ev.stackId));
      } else if (ev.kind === 'SiegeStructureDamaged') {
        structures = true;
        if (ev.attackerId) lockOnce(this.stacks.get(ev.attackerId));
      } else if (ev.kind === 'EngineDamaged' || ev.kind === 'EngineDestroyed') {
        engine = true;
        if (ev.attackerId) lockOnce(this.stacks.get(ev.attackerId));
      } else if (ev.kind === 'BattleSpellCast') {
        // The spell's targets keep their old look (and their old statuses) until it lands.
        if (ev.targetEngineId) {
          engine = true;
          if (this.spellLookOf(ev).scope !== 'single') for (const v of this.besideEngine()) lockOnce(v);
        } else for (const v of this.victims(this.stacks.get(ev.targetId), this.spellLookOf(ev).scope)) lockOnce(v);
      } else if (ev.kind === 'InterventionInvoked') {
        const m = this.miracleOf(ev.interventionId, ev.playerId);
        if (m) for (const v of this.miracleVictims(m, ev.targetStackId)) lockOnce(v);
      } else if (ev.kind === 'BattleAbilityUsed') {
        // The user and its target keep their old look (marks, auras) until the ability lands.
        lockOnce(this.stacks.get(ev.stackId));
        for(const id of ev.targetIds??[ev.targetId]) lockOnce(this.stacks.get(id));
      }
    }
    if (structures) {
      this.structuresLocked += 1;
      this.structureSnapIn = 0;
    }
    if (engine) this.engineLocked += 1;
    let released = false;
    return () => {
      if (released) return;
      released = true;
      for (const e of touched) this.unlock(e);
      if (structures) {
        this.structuresLocked = Math.max(0, this.structuresLocked - 1);
        if (this.structuresLocked === 0) this.syncStructures();
      }
      if (engine) {
        this.engineLocked = Math.max(0, this.engineLocked - 1);
        if (this.engineLocked === 0 && this.engineView && this.engineView.hp !== this.engineShownHp) this.setEngineHp(this.engineView.hp);
      }
    };
  }

  /** Visualise one batch of committed events. Resolves when playback is finished. */
  async play(batch: readonly GameEvent[], speed: number): Promise<void> {
    this.tweens.speed = speed;
    const release = this.hold(batch);
    const events = battlePlaybackOrder(batch);
    try {
      for (let i = 0; i < events.length; i++) {
        if (this.tweens.speed === 0) break;
        const ev = events[i]!;
        const next = events[i + 1];
        // A committed event plays once (its ID is the action token): a batch delivered again never replays it.
        if (!this.tokens.take((ev as { eventId?: string }).eventId)) continue;
        // An ability that braces its user (Reed Guard) shows the brace in its own animation: no second Defend pose.
        if (ev.kind === 'BattleStackDefended' && next?.kind === 'BattleAbilityUsed' && next.stackId === ev.stackId) continue;
        await this.playEvent(ev, this.tweens.speed);
      }
    } finally {
      this.pendingWard.clear();
      release();
    }
  }

  /** Send a presentation cue (with a missile's own `sound` when its profile has one); returns it as the shot log keeps it. */
  private cue(kind: BattleCueKind, heavy?: boolean, magic?: FxSound, sound?: ProfileSound): ShotCue {
    try {
      this.cb.onCue?.({ kind, ...(heavy === undefined ? {} : { heavy }), ...(magic ? { magic } : {}), ...(sound ? { sound } : {}) });
    } catch {
      // A cosmetic listener must never break playback.
    }
    return { kind, sound: sound?.id ?? null, maxMs: sound?.maxMs ?? null, at: this.time };
  }

  /** A missile's release and impact sounds (its profile's; none for the generic stills). */
  private soundsOf(choice: MissileChoice): NonNullable<ProjectileProfile['sounds']> {
    return (choice.kind === 'profile' ? choice.profile.sounds : undefined) ?? {};
  }

  /**
   * A blow that kills creatures has landed (melee, a shot, a tower arrow): a brief light flash at
   * the contact point (the effect painter's soft flash; not on Low graphics or with reduced
   * motion) and a hit-stop — the whole playback holds for a beat, longer when the stack is
   * destroyed. Called once the target's `sufferBlow` has started, so the first frame of its hit
   * strip (and the impact's) is what holds. Cosmetic only: no random draw, no camera move, the same
   * outcome at every speed (nothing at instant speed). Returns the hit-stop (nominal ms) and the flash.
   */
  private killMoment(at: Pt, killed: number, targetRemaining: number): { hitStopMs: number; killFlash: boolean } {
    const ms = hitStopMs(killed, targetRemaining);
    if (ms <= 0 || this.disposed) return { hitStopMs: 0, killFlash: false };
    const flash = this.tweens.speed > 0 && killFlashShown(killed, graphicsProfile().quality, this.calm);
    if (flash) void this.painter.flash(at, KILL_FLASH.color, targetRemaining <= 0 ? KILL_FLASH.destroyedSize : KILL_FLASH.size, KILL_FLASH.ms);
    this.tweens.freeze(ms);
    return { hitStopMs: ms, killFlash: flash };
  }

  /** Attack choreography: the strip plays while the figure lunges toward the target (further when only a still exists). */
  private async strike(a: StackEntry, toward: StackEntry | number, name: 'attack' | 'shoot', k = 1): Promise<void> {
    const f = a.figure;
    const own = f.has(name);
    const dir = Math.sign((typeof toward === 'number' ? toward : toward.root.x) - a.root.x) || a.view.facing;
    const reach = (own ? 0.16 : 0.34) * HEX_W;
    const lunge = name === 'attack' ? reach : -0.06 * HEX_W;
    const strip = f.playOnce(name, this.tweens, { minMs: 560 * k });
    if (name === 'attack' && own) {
      const contact = f.frameDelay('attack', f.contactFrame(), 560*k);
      const duration = f.duration('attack', 560*k);
      await this.tweens.tween(contact*.45, t => f.pose.x = -dir*lunge*.18*t);
      await this.tweens.tween(contact*.55, t => f.pose.x = dir*lunge*(-.18+1.18*t), easeOut);
      await this.tweens.wait(45*k);
      await this.tweens.tween(Math.max(0,duration-contact-45*k), t => f.pose.x = dir*lunge*(1-t));
    } else {
      await this.tweens.tween(200 * k, (t) => (f.pose.x = dir * lunge * t));
      await this.tweens.tween(140 * k, () => undefined, easeOut);
      await this.tweens.tween(220 * k, (t) => (f.pose.x = dir * lunge * (1 - t)));
    }
    await strip;
    f.pose.x = 0;
  }

  /** Being hit: the strip, or a flinch and flash when only a still exists. */
  private async flinch(e: StackEntry, killed = false): Promise<void> {
    e.hitPlays += 1;
    const f = e.figure;
    // A killing blow shows the whole hit strip before the fall (owner request 2026-10-05).
    const strip = f.playOnce('hit', this.tweens, { minMs: killed ? 420 : 320 });
    // Recoil away from where the figure faces (it may have turned toward its attacker).
    const back = f.mirror ? 1 : -1;
    const own = f.has('hit');
    await this.tweens.tween(
      320,
      (t) => {
        const kick = Math.sin(t * Math.PI);
        f.pose.x = back * kick * (own ? 0.04 : 0.1) * HEX_W;
        if (!own) {
          f.pose.rotation = back * kick * 0.12;
          f.sprite.alpha = t < 0.5 ? (Math.floor(t * 12) % 2 === 0 ? 0.45 : 1) : 1;
        }
      },
      linear,
    );
    await strip;
    f.rest();
  }

  /**
   * Taking a blow: the hit strip always plays first; only when the stack is
   * destroyed does its death strip follow, once (owner request 2026-10-04).
   */
  private async sufferBlow(e: StackEntry, killed: boolean): Promise<void> {
    if (e.down) return;
    // The count changes as the blow lands (a stack hit twice in one batch shows the batch's final
    // count at its first blow: the view is the batch's end).
    this.revealBadge(e);
    await this.flinch(e, killed);
    if (killed) {
      await this.tweens.wait(90);
      this.cue('death');
      await this.die(e);
    }
  }

  /**
   * A melee blow, shot or tower arrow lands on `t`: its hit reaction starts (and its count changes)
   * first, in this very moment, then a blow that killed creatures flashes and holds the playback
   * (`killMoment`). The shot log (`rec`) keeps the count before and after and when it changed.
   */
  private async blowLands(t: StackEntry, killed: number, targetRemaining: number, at: Pt, rec: ShotRecord | null): Promise<void> {
    const shown = t.badgeText.text;
    const blow = this.sufferBlow(t, targetRemaining <= 0);
    const moment = this.killMoment(at, killed, targetRemaining);
    if (rec) {
      rec.labelAtImpact = t.badgeText.text;
      rec.badgeAt = rec.labelAtImpact !== shown ? this.time : null;
      rec.hitStopMs = moment.hitStopMs;
      rec.killFlash = moment.killFlash;
    }
    await blow;
  }

  /** Dying on the killing blow: the death strip held on its last frame, or the fallback fall (never twice). */
  private async die(e: StackEntry): Promise<void> {
    if (e.down) return;
    e.deathPlays += 1;
    const f = e.figure;
    this.applyBadge(e, nextBadge(e.badgeShown, e.view, 'death', e.locked > 0));
    if (f.has('death')) {
      await f.playOnce('death', this.tweens, { hold: true });
    } else {
      await this.tweens.tween(620, (t) => this.fallenPose(e, t));
    }
    e.view = { ...e.view, alive: false };
    this.layDown(e);
    // Over the water, a delivered body sinks a little and fades after its held pose (cosmetic; the cells stay taken).
    await this.settleOverWater(e, true);
  }

  private async cheer(e: StackEntry): Promise<void> {
    const f = e.figure;
    if (f.has('victory')) {
      // A victory strip that plays once (the delivered sea sets) holds its final pose until the screen closes.
      if (f.set?.animations['victory']?.loop === false) {
        await f.playOnce('victory', this.tweens, { hold: true });
        return;
      }
      await f.playOnce('victory', this.tweens);
      f.setLoop('victory');
      return;
    }
    await this.tweens.tween(700, (t) => (f.pose.y = -Math.abs(Math.sin(t * Math.PI * 2)) * RB * 0.35), linear);
    f.pose.y = 0;
  }

  private async playEvent(ev: GameEvent, speed: number): Promise<void> {
    switch (ev.kind) {
      case 'BattleStackMoved': {
        const e = this.stacks.get(ev.stackId);
        if (!e || ev.path.length === 0) return;
        // A forced move (Tail Snare's pull) slides the stack; it never walks or flies there.
        if (ev.forced) return this.slide(e, ev.path[ev.path.length - 1]!);
        this.cue(ev.flying ? 'flight' : 'march');
        const v = e.view;
        const f = e.figure;
        const start = e.shownAnchor;
        let from = this.groupPosition(e.shownAnchor, v.footprint, v.facing);
        const last = ev.path[ev.path.length - 1]!;
        const dest = this.groupPosition(last, v.footprint, v.facing);
        f.mirror = dest.x < from.x - 1 ? true : dest.x > from.x + 1 ? false : v.facing === -1;
        if (ev.flying) {
          if (f.has('takeoff')) await f.playOnce('takeoff', this.tweens);
          f.setLoop(f.has('fly') ? 'fly' : 'move');
          const f0 = { ...from };
          const dist = Math.hypot(dest.x - f0.x, dest.y - f0.y);
          // A delivered flyer travels at its own height (0.4 hex for the Hippocampi), from and to its hover over water.
          const travel = travelLiftPx(f.set, HEX_W);
          const lift = travel ?? Math.min(RB * 2.6, RB * 0.8 + dist * 0.15);
          const h0 = -f.view.y;
          const h1 = hoverPx(f.set, this.overWater(e, last), HEX_W);
          await this.tweens.tween(
            Math.max(380, (dist / RB) * 90),
            (t) => {
              e.root.position.set(f0.x + (dest.x - f0.x) * t, f0.y + (dest.y - f0.y) * t);
              e.root.zIndex = e.root.y;
              if (travel !== null) {
                // Up to the travel height quickly, held, then down to the landing's hover (never through the sea).
                const up = Math.min(1, t * 4, (1 - t) * 4);
                f.view.y = -(h0 + (h1 - h0) * t);
                f.pose.y = -up * Math.max(0, lift - (h0 + (h1 - h0) * t));
              } else f.pose.y = -Math.sin(t * Math.PI) * lift;
            },
            easeInOut,
          );
          f.pose.y = 0;
          f.view.y = -h1;
          if (f.has('landing')) await f.playOnce('landing', this.tweens);
        } else {
          f.setLoop('move');
          f.beginTravel();
          let travelled = 0;
          const bob = !f.has('move');
          for (const [stepIndex, c] of ev.path.entries()) {
            const to = this.groupPosition(c, v.footprint, v.facing);
            const f0 = { ...from };
            await this.tweens.tween(
              170,
              (t) => {
                const progress = segmentProgress(t, stepIndex, ev.path.length);
                e.root.position.set(f0.x + (to.x - f0.x) * progress, f0.y + (to.y - f0.y) * progress);
                f.travelTo(travelled + Math.hypot(to.x-f0.x,to.y-f0.y)*progress);
                e.root.zIndex = e.root.y;
                if (bob) f.pose.y = -Math.abs(Math.sin(t * Math.PI)) * RB * 0.12;
              },
              linear,
            );
            travelled += Math.hypot(to.x-f0.x,to.y-f0.y);
            from = to;
          }
          f.endTravel();
          f.pose.y = 0;
        }
        e.shownAnchor = last;
        // Remember the move even if no newer view arrives (the battle's final blow: the
        // board keeps the last view), so unlocking the stack does not snap it back to
        // where it stood before (owner report 2026-10-05).
        if (e.view.anchor.col === start.col && e.view.anchor.row === start.row) e.view = { ...e.view, anchor: last };
        f.setLoop('idle');
        return;
      }
      case 'BattleAttack': {
        const a = this.stacks.get(ev.attackerId);
        const t = this.stacks.get(ev.targetId);
        if (!a || !t) return;
        const retaliation = ev.mode === 'retaliation';
        const heavy = ev.killed > 0;
        // Both turn to face each other for the exchange (owner request 2026-10-04), then turn back.
        const dx = t.root.x - a.root.x;
        if (Math.abs(dx) > 1) {
          a.figure.mirror = dx < 0;
          if (!t.down) t.figure.mirror = dx > 0;
        }
        // The damage words over the target (and a ward's share above them), shown as the blow lands.
        const words = () => {
          const dealt = ev.killed > 0 ? `−${ev.damage} · ${ev.killed} slain` : `−${ev.damage}`;
          const text = ev.mode === 'harpoon' ? `Harpoon ${dealt}` : dealt;
          const head = this.headOf(t);
          void this.floatText(head, ev.luck ? `Lucky! ${text}` : text, ev.luck ? '#f5e4b7' : '#ff8a70', speed, ev.luck ? 'icon.stat.luck' : undefined);
          // A ward (Sheltering Wings) took its share of this blow: say how much, above the damage.
          const warded = this.pendingWard.get(ev.targetId);
          if (warded !== undefined) {
            this.pendingWard.delete(ev.targetId);
            void this.floatText({ x: head.x, y: head.y - RB * 0.62 }, `Ward saved ${warded}`, '#9fe8ff', speed, 'icon.ability.family_ward');
          }
        };
        if (ev.mode === 'shot' || ev.mode === 'harpoon') {
          // One missile per shot event (never one per creature in the stack): the shooter's own
          // profile, released at its shoot strip's release frame from its hand, staff or mouth.
          // On arrival, together and at once: the impact at the contact point, the hit sound, the
          // damage words and the target's hit reaction — while the shooter finishes its strip.
          // Its own sounds too: the profile's release sound with the launch, its impact sound on arrival.
          // The target keeps the count it shows until the missile strikes; a killing blow holds for a beat.
          const choice = this.missileOf(ev, 'arrow');
          const sounds = this.soundsOf(choice);
          const { delay, socket } = this.releaseOf(a, choice, 'shoot', SHOOT_MIN_MS);
          const shot = (async () => {
            await this.tweens.wait(delay);
            if (this.disposed) return;
            const release = this.cue('shot', undefined, undefined, sounds.release);
            const from = this.socketPoint(a, socket);
            const to = this.contactOf(t, from.x);
            const rec = this.logShot(ev.kind, 'creature', a.view.creatureId ?? null, choice, from, to, socket, a.figure.mirror ? -1 : 1);
            rec.cues.push(release);
            rec.labelAtLaunch = t.badgeText.text;
            await this.flyMissile(choice, from, to, rec);
            if (this.disposed) return;
            rec.cues.push(this.cue('arrow-hit', heavy, undefined, sounds.impact));
            void this.impactFx(choice, to, false, rec);
            rec.reactAt = this.time;
            words();
            await this.blowLands(t, ev.killed, ev.targetRemaining, to, rec);
          })();
          await Promise.all([this.strike(a, t, 'shoot'), shot]);
        } else {
          // A melee blow (a shooter's too) flies nothing.
          this.cue('swing');
          const k = retaliation ? 0.85 : 1;
          const contact = a.figure.contactFrame();
          const attackStrip = a.figure.set?.animations['attack'];
          if (contact !== undefined && attackStrip && a.figure.status === 'ready') {
            // A delivered set lands its blow at its contact frame, once, while the strike plays on (cross-rail lunges included).
            const delay = a.figure.frameDelay('attack', contact, 560 * k);
            const landing = (async () => {
              await this.tweens.wait(delay);
              if (this.disposed) return;
              this.cue('impact', heavy);
              words();
              await this.blowLands(t, ev.killed, ev.targetRemaining, this.contactOf(t, a.root.x), null);
            })();
            await Promise.all([this.strike(a, t, 'attack', k), landing]);
          } else {
            await this.strike(a, t, 'attack', k);
            // No burst over the target (owner request 2026-10-05): its hit strip shows the blow.
            this.cue('impact', heavy);
            words();
            await this.blowLands(t, ev.killed, ev.targetRemaining, this.contactOf(t, a.root.x), null);
          }
        }
        if (this.disposed) return;
        a.figure.mirror = a.view.facing === -1;
        if (!t.down) t.figure.mirror = t.view.facing === -1;
        return;
      }
      case 'BattleArtifactActivated': {
        const target=this.stacks.get(ev.targetId); if(!target)return;
        this.cue('bless');
        await this.painter.material(`fx.artifact.${ev.artifactId}.impact`,this.chestOf(target));
        this.applyAura(target);
        await this.floatText(this.headOf(target),'Relic invoked','#edcf86',speed,`icon.artifact.${ev.artifactId}`);
        return;
      }
      case 'BattleSpellCast':
        return this.playSpell(ev, speed);
      case 'BattleStacksHealed':
        this.pendingHeal = { side: ev.side, healed: ev.healed };
        return;
      case 'InterventionInvoked':
        return this.playMiracle(ev, speed);
      case 'BattleAbilityUsed':
        return this.playAbility(ev, speed);
      case 'BattleStatusConsumed': {
        const e = this.stacks.get(ev.stackId);
        if (!e) return;
        // A ward's share is shown with the blow it softens (it is announced just before it).
        if (ev.status === 'damage_ward') {
          this.pendingWard.set(ev.stackId, ev.amount ?? 0);
          return;
        }
        const distracted = ev.status === 'retaliation_suppressed';
        this.applyAura(e);
        await this.floatText(this.headOf(e), distracted ? 'No retaliation' : 'Pull resisted', distracted ? '#d7b0ff' : '#9fe8ff', speed * 0.7, distracted ? 'icon.status.stun' : 'icon.ability.charge_guard');
        return;
      }
      case 'BattleStackDefended': {
        const e = this.stacks.get(ev.stackId);
        if (!e) return;
        this.cue('defend');
        void this.floatText(this.headOf(e), 'Defend', '#cfe3ff', speed, 'icon.action.defend');
        await this.defendPose(e, 0.8);
        return;
      }
      case 'BattleStackWaited': {
        const e = this.stacks.get(ev.stackId);
        if (!e) return;
        await this.floatText(this.headOf(e), 'Wait', '#e6d7b0', speed * 0.6, 'icon.action.wait');
        return;
      }
      case 'BattleMorale': {
        const e = this.stacks.get(ev.stackId);
        if (!e) return;
        this.cue(ev.positive ? 'morale-up' : 'morale-down');
        void this.effect(ev.positive ? 'morale.up' : 'morale.down', { x: e.root.x, y: e.root.y }, { flash: ev.positive ? 0xf5e4b7 : 0xff9d8a });
        await this.floatText(this.headOf(e), ev.positive ? 'Morale! Acts again' : 'Falters — skips turn', ev.positive ? '#f5e4b7' : '#ff9d8a', speed * 0.8, ev.positive ? 'icon.stat.morale' : 'icon.status.stun');
        return;
      }
      case 'BattleStackDestroyed': {
        const e = this.stacks.get(ev.stackId);
        if (!e) return;
        // The dying animation played on the killing blow; the body stays where it fell.
        await this.tweens.wait(120);
        // Remember the death even if no newer view arrives (the battle's final
        // blow: the rules have already cleared the battle), so unlocking the
        // stack after playback keeps it lying down.
        e.view = { ...e.view, alive: false };
        if (!e.down) this.layDown(e);
        return;
      }
      case 'SiegeStructureDamaged': {
        const st = this.structureById(ev.structureId);
        if (!st) return;
        const top = this.structureTop(st);
        const to = { x: top.x, y: top.y + RB * 0.4 };
        // The Catapult throws its own siege stone; a wall breaker (Cyclops, Colossus) its OWN missile — never the Catapult's.
        const choice = this.missileOf(ev, 'stone');
        const sounds = this.soundsOf(choice);
        let rec: ShotRecord | null = null;
        // The stone lands: its impact on the wall, the sound, the damaged picture and the words, at once.
        const land = () => {
          if (this.disposed) return;
          const hit = this.cue('stone-hit', undefined, undefined, sounds.impact);
          rec?.cues.push(hit);
          void this.impactFx(choice, to, true, rec);
          if (rec) rec.reactAt = this.time;
          this.shownHp.set(st.id, ev.hp);
          this.drawStructures();
          void this.floatText({ x: to.x, y: to.y - RB * 0.6 }, ev.source === 'catapult' ? 'Catapult −1' : '−1', '#f0c27a', speed);
        };
        if (ev.source === 'catapult') {
          const thrown = this.cue('catapult', undefined, undefined, sounds.release);
          const cup = await this.throwCatapult();
          if (this.disposed) return;
          rec = this.logShot(ev.kind, 'catapult', null, choice, cup, to, null, 1);
          rec.cues.push(thrown);
          await this.flyMissile(choice, cup, to, rec);
          land();
          return;
        }
        const a = ev.attackerId ? this.stacks.get(ev.attackerId) : undefined;
        if (!a) {
          land();
          return;
        }
        const anim = a.figure.has('shoot') ? 'shoot' : 'attack';
        const dx = to.x - a.root.x;
        if (Math.abs(dx) > 1) a.figure.mirror = dx < 0;
        const { delay, socket } = this.releaseOf(a, choice, anim, THROW_MIN_MS);
        await Promise.all([
          a.figure.playOnce(anim, this.tweens, { minMs: THROW_MIN_MS }),
          this.tweens.wait(delay).then(async () => {
            if (this.disposed) return;
            const release = this.cue('shot', undefined, undefined, sounds.release);
            const from = this.socketPoint(a, socket);
            rec = this.logShot(ev.kind, 'creature', a.view.creatureId ?? null, choice, from, to, socket, a.figure.mirror ? -1 : 1);
            rec.cues.push(release);
            await this.flyMissile(choice, from, to, rec);
            land();
          }),
        ]);
        if (!this.disposed) a.figure.mirror = a.view.facing === -1;
        return;
      }
      case 'EngineDamaged': {
        // A blow at the siege engine (targetableCatapultV1): the striker's normal attack or shot and
        // impact; the engine's picture and label change as it lands (committed before playback).
        const target = this.engineFig ? this.enginePoint() : null;
        if (!target) return;
        const a = ev.attackerId ? this.stacks.get(ev.attackerId) : undefined;
        const heavy = ev.hp <= 0;
        if (ev.source === 'shot' && a) {
          const choice = this.missileOf(ev, 'arrow');
          const sounds = this.soundsOf(choice);
          const dx = target.x - a.root.x;
          if (Math.abs(dx) > 1) a.figure.mirror = dx < 0;
          const { delay, socket } = this.releaseOf(a, choice, 'shoot', SHOOT_MIN_MS);
          const shot = (async () => {
            await this.tweens.wait(delay);
            if (this.disposed) return;
            const release = this.cue('shot', undefined, undefined, sounds.release);
            const from = this.socketPoint(a, socket);
            const to = this.engineContact(from.x);
            const rec = this.logShot(ev.kind, 'creature', a.view.creatureId ?? null, choice, from, to, socket, a.figure.mirror ? -1 : 1);
            rec.cues.push(release);
            await this.flyMissile(choice, from, to, rec);
            if (this.disposed) return;
            rec.cues.push(this.cue('arrow-hit', heavy, undefined, sounds.impact));
            void this.impactFx(choice, to, true, rec);
            rec.reactAt = this.time;
            await this.engineBlow(ev.damage, ev.hp, speed, ev.luck);
          })();
          await Promise.all([this.strike(a, target.x, 'shoot'), shot]);
        } else if (ev.source === 'melee' && a) {
          const dx = target.x - a.root.x;
          if (Math.abs(dx) > 1) a.figure.mirror = dx < 0;
          this.cue('swing');
          await this.strike(a, target.x, 'attack');
          this.cue('impact', heavy);
          await this.engineBlow(ev.damage, ev.hp, speed, ev.luck);
        } else {
          // A spell's share (its own playback showed the magic).
          await this.engineBlow(ev.damage, ev.hp, speed, false);
        }
        if (a && !this.disposed) a.figure.mirror = a.view.facing === -1;
        return;
      }
      case 'EngineDestroyed': {
        if (!this.engineFig) return;
        this.setEngineHp(0);
        this.cue('breach');
        const at = this.enginePoint();
        await this.floatText({ x: at.x, y: at.y - this.engineVisibleWidth() * 0.5 }, 'Catapult destroyed', '#ffcf8a', speed * 0.8, 'icon.status.stun');
        return;
      }
      case 'CatapultSkipped': {
        if (!this.engineFig) return;
        const at = this.enginePoint();
        await this.floatText({ x: at.x, y: at.y - this.engineVisibleWidth() * 0.5 }, ev.reason === 'no_targets' ? 'No target left' : 'Holds fire', '#e6d7b0', speed * 0.6);
        return;
      }
      case 'SiegeStructureDestroyed': {
        const st = this.structureById(ev.structureId);
        if (!st) return;
        this.cue('breach');
        await this.floatText(this.structureTop(st), st.kind === 'wall' || st.kind === 'gate' ? 'Breach!' : 'Destroyed', '#ffcf8a', speed * 0.8);
        return;
      }
      case 'SiegeTurretShot': {
        const st = this.structureById(ev.structureId);
        const t = this.stacks.get(ev.targetId);
        if (!st || !t) return;
        // The tower arrow (`siege_turret`), from the top of the tower or keep, with its profile's sounds.
        const choice = this.missileOf(ev, 'arrow');
        const sounds = this.soundsOf(choice);
        const loosed = this.cue('turret', undefined, undefined, sounds.release);
        const from = this.structureTop(st);
        const to = this.contactOf(t, from.x);
        const rec = this.logShot(ev.kind, 'turret', null, choice, from, to, null, from.x <= t.root.x ? 1 : -1);
        rec.cues.push(loosed);
        rec.labelAtLaunch = t.badgeText.text;
        await this.flyMissile(choice, from, to, rec);
        if (this.disposed) return;
        rec.cues.push(this.cue('arrow-hit', ev.killed > 0, undefined, sounds.impact));
        void this.impactFx(choice, to, false, rec);
        rec.reactAt = this.time;
        void this.floatText(this.headOf(t), ev.killed > 0 ? `−${ev.damage} · ${ev.killed} slain` : `−${ev.damage}`, '#ff8a70', speed);
        await this.blowLands(t, ev.killed, ev.targetRemaining, to, rec);
        return;
      }
      case 'SiegeMoatDamage': {
        const t = this.stacks.get(ev.stackId);
        if (!t) return;
        this.cue('moat');
        void this.floatText(this.headOf(t), `Moat −${ev.damage}`, '#9cc4ff', speed);
        await this.sufferBlow(t, ev.targetRemaining <= 0);
        return;
      }
      case 'BattleStackShapeshifted': {
        this.cue('shapeshift');
        return;
      }
      case 'BattleCasualtiesRecovered': {
        this.cue('recovery');
        return;
      }
      case 'BattleEnded': {
        // Every surviving creature of the winning side celebrates — once in full, then it
        // keeps cheering until the result screen opens (owner request 2026-10-03).
        const winners = [...this.stacks.values()].filter((e) => e.view.side === ev.winner && e.view.alive);
        for (const e of winners) {
          e.root.visible = true;
          this.place(e, e.view.anchor);
          e.figure.rest();
        }
        await Promise.all(winners.map((e) => this.cheer(e)));
        for (const e of winners) this.celebrating.add(e);
        return;
      }
      default:
        return;
    }
  }

  // ------------------------------------------------------------------ magic

  private spellLookOf(ev: { spellId: string; damage: number; healed: number }): BattleSpellFx {
    let look: BattleSpellFx | null = null;
    try {
      look = this.cb.spellFx?.(ev.spellId) ?? null;
    } catch {
      look = null;
    }
    if (look) return look;
    const heal = ev.healed > 0;
    const hurt = ev.damage > 0;
    return { school: heal ? 'heal' : hurt ? 'strike' : 'bless', travel: hurt ? 'bolt' : 'none', impact: heal ? 'heal' : hurt ? 'sparks' : 'glyph', screen: 'none', scope: 'single', sound: heal ? 'heal' : hurt ? 'strike' : 'bless' };
  }

  private miracleOf(interventionId: string, playerId: string): BattleMiracleFx | null {
    try {
      return this.cb.miracleFx?.(interventionId, playerId) ?? null;
    } catch {
      return null;
    }
  }

  /** The cells a stack stands on, in unsquashed board pixels (neighbours are exactly one hex width apart). */
  private flatCells(e: StackEntry): { x: number; y: number }[] {
    const a = e.view.anchor;
    const cells = e.view.footprint === 2 ? [a, { col: a.col - e.view.facing, row: a.row }] : [a];
    return cells.map((c) => cellPoint(c, RB, 1));
  }

  /** Who a spell lands on: the target; the target and the stacks of its side beside it; or that whole side. */
  private victims(target: StackEntry | undefined, scope: FxLook['scope']): StackEntry[] {
    if (!target) return [];
    if (scope === 'single') return [target];
    const side = [...this.stacks.values()].filter((e) => e !== target && e.view.side === target.view.side && !e.down);
    if (scope === 'army') return [target, ...side.sort((a, b) => a.root.x - b.root.x)];
    const mine = this.flatCells(target);
    return [target, ...side.filter((e) => this.flatCells(e).some((p) => mine.some((q) => Math.hypot(p.x - q.x, p.y - q.y) < HEX_W * 1.1)))];
  }

  private miracleVictims(m: BattleMiracleFx, targetId: string | null): StackEntry[] {
    const t = targetId ? this.stacks.get(targetId) : undefined;
    if (t) return this.victims(t, m.look.scope === 'army' ? 'army' : 'single');
    return [...this.stacks.values()].filter((e) => e.view.side === m.side && !e.down).sort((a, b) => a.root.x - b.root.x);
  }

  /** Where a side's commander casts from: its banner corner above the far end of its deployment edge. */
  private casterPoint(side: 'attacker' | 'defender'): { x: number; y: number } {
    const c = this.cellXY({ col: side === 'attacker' ? 0 : this.cols - 1, row: 0 });
    return { x: c.x + (side === 'attacker' ? -RB * 0.4 : RB * 0.4), y: c.y - RB * 1.25 };
  }

  private targetOf(e: StackEntry): FxTarget {
    return { x: e.root.x, y: e.root.y, height: Math.max(RB * 0.9, e.figure.height * 0.85), width: e.view.footprint === 2 ? 1.7 : 1, facing: e.view.facing };
  }

  private logFx(id: string): void {
    this.fxLog = [...this.fxLog.slice(-19), id];
  }

  private abilityFxOf(ev: Extract<GameEvent, { kind: 'BattleAbilityUsed' }>): BattleAbilityFx | null {
    try {
      return this.cb.abilityFx?.({ abilityId: ev.abilityId, stackId: ev.stackId, targetId: ev.targetId, ...(ev.removedStatus ? { removedStatus: ev.removedStatus } : {}) }) ?? null;
    } catch {
      return null;
    }
  }

  /**
   * A creature ability: the user turns to its target and plays its `ability`
   * animation (the manifest's alias — defend or attack for the neutrals), lunging a
   * little at an enemy; part-way through it lands on the target (the look, the
   * words of what it did) and the target's new marks appear. The rules applied it
   * before playback; a forced move that follows is its own event (`slide`).
   */
  private async playAbility(ev: Extract<GameEvent, { kind: 'BattleAbilityUsed' }>, speed: number): Promise<void> {
    const u = this.stacks.get(ev.stackId);
    if (!u) return;
    const t = this.stacks.get(ev.targetId) ?? u;
    this.logFx(`ability.${ev.abilityId}`);
    const fx = this.abilityFxOf(ev);
    const f = u.figure;
    if (!fx) {
      // The plain ward look.
      this.cue('ward');
      void this.floatText(this.headOf(u), 'Ward!', '#9fe8ff', speed, 'icon.fx.shield');
      void this.effect('ward', { x: u.root.x, y: u.root.y }, { flash: 0x9fe8ff });
      if (f.has('ability')) await f.playOnce('ability', this.tweens);
      else await this.defendPose(u, 0.7);
      return;
    }
    const other = t !== u;
    const dx = t.root.x - u.root.x;
    if (other && Math.abs(dx) > 1) f.mirror = dx < 0;
    this.cue(fx.hostile ? 'swing' : 'ward');
    void this.floatText(this.headOf(u), fx.name, fx.hostile ? '#e9c8ff' : '#f5e4b7', speed, fx.icon);
    const pose = (async () => {
      // A friendly ability on a creature without any ability, cast or attack strip: a brace.
      if (!fx.hostile && !f.has('ability') && !f.has('cast') && !f.has('attack')) return this.defendPose(u, 0.7);
      await f.playOnce('ability', this.tweens, { minMs: 600 });
    })();
    const dir = Math.sign(dx) || u.view.facing;
    const lunge = fx.hostile && other ? 0.12 * HEX_W : 0;
    const step = lunge
      ? (async () => {
          await this.tweens.tween(200, (k) => (f.pose.x = dir * lunge * k));
          await this.tweens.wait(160);
          await this.tweens.tween(220, (k) => (f.pose.x = dir * lunge * (1 - k)));
          f.pose.x = 0;
        })()
      : Promise.resolve();
    const land = (async () => {
      await this.tweens.wait(300);
      const recipe=dragonAbilityRecipe(ev.abilityId);
      await Promise.all((ev.targetIds??[ev.targetId]).map(async id=>{
        const victim=this.stacks.get(id)??t;
      if(recipe) {
        await playPaintedMagic(recipe,this.targetOf(victim),this.fx,this.tweens,RB);
      } else if (fx.look) {
        void this.painter.impact(fx.look, this.targetOf(victim));
        if (!fx.hostile) this.cue('bless', undefined, fx.look.sound);
      } else if (fx.hostile) void this.painter.flash(this.chestOf(victim), 0xb48cff, 0.8);
      else void this.effect('ward', { x: victim.root.x, y: victim.root.y }, { flash: 0x9fe8ff });
      const head = this.headOf(victim);
      void this.floatText(other ? head : { x: head.x, y: head.y - RB * 0.62 }, fx.effect, fx.hostile ? '#d7b0ff' : '#9fe8ff', speed);
      // Its marks (and aura) show once it lands.
      this.applyAura(victim);
      }));
    })();
    await Promise.all([pose, step, land]);
    f.mirror = u.view.facing === -1;
    this.applyAura(u);
  }

  /**
   * A forced move (Tail Snare's pull): the stack slides to its new cell in its
   * standing pose, leaning toward the pull — presentation only; the rules already
   * moved it. Instant playback skips straight to the cell (the same final picture).
   */
  private async slide(e: StackEntry, to: BattleCell): Promise<void> {
    const v = e.view;
    const start = e.shownAnchor;
    const from = { x: e.root.x, y: e.root.y };
    const dest = this.groupPosition(to, v.footprint, v.facing);
    const f = e.figure;
    const lean = (Math.sign(dest.x - from.x) || 0) * (f.mirror ? -1 : 1) * 0.12;
    this.logFx(`pull.${v.id}`);
    this.cue('march');
    await this.tweens.tween(
      380,
      (k) => {
        e.root.position.set(from.x + (dest.x - from.x) * k, from.y + (dest.y - from.y) * k);
        e.root.zIndex = e.root.y;
        f.pose.rotation = lean * Math.sin(Math.min(1, k * 1.4) * Math.PI);
      },
      easeOut,
    );
    f.pose.rotation = 0;
    e.shownAnchor = to;
    if (e.view.anchor.col === start.col && e.view.anchor.row === start.row) e.view = { ...e.view, anchor: to };
  }

  /** A battle spell: the sigil at the commander's corner, its flight, where it lands on each stack it touches, then the numbers. */
  private async playSpell(ev: Extract<GameEvent, { kind: 'BattleSpellCast' }>, speed: number): Promise<void> {
    if (ev.targetEngineId) return this.playEngineSpell(ev, speed);
    const t = this.stacks.get(ev.targetId);
    if (!t) return;
    const look = this.spellLookOf(ev);
    const id = `fx.spell.${ev.spellId}`;
    this.logFx(id);
    this.painter.preload(id);
    await this.painter.ready(look);
    if (ev.cells?.length) {
      const from = this.casterPoint(ev.side);
      await this.painter.cast(look, from, `${id}.cast`);
      await Promise.all(ev.cells.map((cell) => {
        const p = this.cellXY(cell);
        return this.painter.impact(look, { ...p, height: RB * .7, width: 1, facing: ev.side === 'attacker' ? 1 : -1 }, `${id}.impact`);
      }));
      for (const stack of this.stacks.values()) if (this.cellsAt(stack, stack.shownAnchor).some((c) => ev.cells!.some((p) => p.col === c.col && p.row === c.row))) this.unlock(stack);
      return;
    }
    const victims = this.victims(t, look.scope);
    const dir = ev.side === 'attacker' ? 1 : -1;
    const from = this.casterPoint(ev.side);
    this.cue('cast');
    await this.painter.cast(look, from, `${id}.cast`);
    const screen = this.painter.screenFx(look.screen, look.school, this.screenDir(dir), `${id}.screen`);
    if (look.travel !== 'none' && look.travel !== 'sky' && look.scope !== 'army') await this.painter.travel(look, from, this.chestOf(t), `${id}.travel`, dir === -1);
    this.cue(ev.healed > 0 ? 'heal' : ev.damage > 0 ? 'spell' : 'bless', undefined, look.sound);
    const per = victims.length > 1 && ev.damage > 0 && ev.damage % victims.length === 0 ? ev.damage / victims.length : null;
    const gap = look.scope === 'army' ? 110 : 70;
    const react = async (v: StackEntry, i: number) => {
      await this.tweens.wait(i * gap);
      if (look.travel === 'sky') await this.painter.travel(look, from, this.chestOf(v), `${id}.travel`);
      const hit = this.painter.impact(look, this.targetOf(v), `${id}.impact`);
      await this.tweens.wait(this.painter.impactContactMs(look, 200));
      let text: string | null = null;
      let color = '#f5e4b7';
      let icon: string | undefined;
      if (ev.healed > 0) {
        if (i === 0) text = `+${ev.healed} HP`;
        color = '#9be58a';
        icon = 'icon.status.heal';
      } else if (ev.damage > 0) {
        text = per !== null ? `−${per}` : i === 0 ? `−${ev.damage}` : null;
        color = '#9cc4ff';
        icon = SPELL_HURT_ICON[look.school];
      } else if (i === 0) {
        text = look.label ?? (look.hostile ? 'Cursed' : 'Blessed');
        color = look.hostile ? '#d7b0ff' : '#f5e4b7';
      }
      // Its count changes as the spell lands on it (with its words), never before.
      this.revealBadge(v);
      if (text) void this.floatText(this.headOf(v), text, color, speed, icon);
      if (ev.damage > 0) await this.sufferBlow(v, !v.view.alive);
      await hit;
    };
    await Promise.all([...victims.map(react), screen]);
  }

  /** A spell cast at the siege engine: the sigil, its flight and its impact on the engine (and the stacks beside it for an area spell). */
  private async playEngineSpell(ev: Extract<GameEvent, { kind: 'BattleSpellCast' }>, speed: number): Promise<void> {
    if (!this.engineFig) return;
    const look = this.spellLookOf(ev);
    const id = `fx.spell.${ev.spellId}`;
    this.logFx(id);
    this.painter.preload(id);
    await this.painter.ready(look);
    const at = this.enginePoint();
    const w = this.engineVisibleWidth();
    const engineTarget: FxTarget = { x: at.x, y: at.y, height: w * 0.5, width: 2, facing: this.engineFacing() };
    const dir = ev.side === 'attacker' ? 1 : -1;
    const from = this.casterPoint(ev.side);
    this.cue('cast');
    await this.painter.cast(look, from, `${id}.cast`);
    const screen = this.painter.screenFx(look.screen, look.school, this.screenDir(dir), `${id}.screen`);
    const chest = { x: at.x, y: at.y - w * 0.25 };
    if (look.travel !== 'none' && look.travel !== 'sky' && look.scope !== 'army') await this.painter.travel(look, from, chest, `${id}.travel`, dir === -1);
    this.cue('spell', undefined, look.sound);
    const beside = look.scope === 'single' ? [] : this.besideEngine();
    const per = beside.length > 0 && ev.damage > 0 ? ev.damage / beside.length : null;
    const hits: Promise<void>[] = [this.painter.impact(look, engineTarget, `${id}.impact`)];
    beside.forEach((v, i) => {
      hits.push(
        (async () => {
          await this.tweens.wait((i + 1) * 70);
          const hit = this.painter.impact(look, this.targetOf(v), `${id}.impact`);
          await this.tweens.wait(this.painter.impactContactMs(look, 200));
          this.revealBadge(v);
          if (per !== null) void this.floatText(this.headOf(v), `−${per}`, '#9cc4ff', speed, SPELL_HURT_ICON[look.school]);
          await this.sufferBlow(v, !v.view.alive);
          await hit;
        })(),
      );
    });
    await Promise.all([...hits, screen]);
  }

  /** A battle miracle: the moment over the field, then light (or a smite) on each stack it touches. */
  private async playMiracle(ev: Extract<GameEvent, { kind: 'InterventionInvoked' }>, speed: number): Promise<void> {
    const m = this.miracleOf(ev.interventionId, ev.playerId);
    const heal = this.pendingHeal;
    this.pendingHeal = null;
    if (!m) return;
    const look = m.look;
    const damage = ev.damage ?? m.damage;
    const id = `fx.miracle.${ev.interventionId}`;
    this.logFx(id);
    this.painter.preload(id);
    await this.painter.ready(look);
    const victims = this.miracleVictims(m, ev.targetStackId);
    const dir = m.side === 'attacker' ? 1 : -1;
    const healed = heal && heal.side === m.side ? heal.healed : 0;
    const screen = this.painter.screenFx(look.screen, look.school, this.screenDir(dir), `${id}.screen`);
    await this.tweens.wait(look.screen === 'none' ? 0 : 280);
    this.cue(healed > 0 ? 'heal' : damage ? 'spell' : 'bless', undefined, look.sound);
    const react = async (v: StackEntry, i: number) => {
      await this.tweens.wait(i * 110);
      if (look.travel === 'sky') await this.painter.travel(look, { x: v.root.x, y: v.root.y - RB * 8 }, this.chestOf(v), `${id}.travel`);
      const hit = this.painter.impact(look, this.targetOf(v), `${id}.impact`);
      await this.tweens.wait(this.painter.impactContactMs(look, 220));
      // The miracle's own icon (Brief 13) stands before its word; the count changes as it lands.
      const icon = `icon.intervention.${ev.interventionId}`;
      this.revealBadge(v);
      if (damage) {
        void this.floatText(this.headOf(v), `−${damage}`, '#ff8a70', speed, icon);
        await this.sufferBlow(v, !v.view.alive);
      } else if (i === 0) {
        const text = healed > 0 ? `+${healed} HP` : m.label;
        if (text) void this.floatText(this.headOf(v), text, healed > 0 ? '#9be58a' : '#f5e4b7', speed, icon);
      }
      await hit;
    };
    await Promise.all([...victims.map(react), screen]);
  }

  /** Start loading an effect's delivered strips (e.g. a miracle's, while its painted card is up). Presentation only. */
  preloadFx(id: string): void {
    this.painter.preload(id);
    // A miracle's icon stands before its word over the stacks.
    if (id.startsWith('fx.miracle.')) this.iconTexture(`icon.intervention.${id.slice('fx.miracle.'.length)}`);
  }

  /** The magic effects played most recently (read-only diagnostics for tests). */
  fxDebug(): readonly string[] {
    return this.fxLog;
  }

  /** Defending: the strip, or a crouch behind the shield when only a still exists. */
  private async defendPose(e: StackEntry, k: number): Promise<void> {
    const f = e.figure;
    if (f.has('defend')) {
      // A delivered set (sea creatures) holds its final defend pose while the stack defends.
      const hold = !!f.set?.events && f.set.animations['defend']?.loop === false;
      await f.playOnce('defend', this.tweens, { minMs: 600 * k, hold });
      return;
    }
    const back = e.view.facing === 1 ? -1 : 1;
    await this.tweens.tween(260 * k, (t) => {
      f.pose.scale.y = 1 - t * 0.08;
      f.pose.x = back * t * 0.05 * HEX_W;
    });
    await this.tweens.wait(360 * k);
    await this.tweens.tween(220 * k, (t) => {
      f.pose.scale.y = 0.92 + t * 0.08;
      f.pose.x = back * 0.05 * HEX_W * (1 - t);
    });
    f.rest();
  }

  // ------------------------------------------------------------------ input

  /** Canvas pointer → board point (the inverse of `toPage`; a mirrored board turns x round). */
  private local(e: { clientX: number; clientY: number }): { x: number; y: number } {
    const r = this.canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left - this.board.x) / this.board.scale.x, y: (e.clientY - r.top - this.board.y) / this.board.scale.y };
  }

  private cellAt(p: { x: number; y: number }): { cell: BattleCell; offset: { x: number; y: number } } | null {
    // The inverse of the same projection that places every cell and sprite (hexmath): sprite size never matters.
    // A masked board: water takes no hover, move or target (a click there does nothing).
    // A piecewise board: only a point inside a cell's own polygon selects it (the rail, gaps and margins select nothing).
    const legal = this.boardMask ? (x: BattleCell) => this.cellLegal(x) : undefined;
    const c = this.table ? pickTableCell(p.x, p.y, this.table, legal) : pickCellOn(p.x, p.y, this.proj, this.cols, this.rows, legal);
    if (!c) return null;
    const w = this.cellXY(c);
    // The offset is reported in the standard board's foreshortening (hex radii), whatever this board's squash.
    return { cell: c, offset: { x: (p.x - w.x) / this.proj.radius, y: ((p.y - w.y) / this.proj.radius) * (S / this.proj.squash) } };
  }

  private onMove(e: PointerEvent): void {
    const local = this.local(e);
    const hit = this.cellAt(local);
    for (const { label, structure, damaged } of this.structureLabelInfo) {
      const p = this.structurePos(structure);
      const onCell = structure.cells.some(c => c.col === hit?.cell.col && c.row === hit.cell.row);
      const onKeep = structure.kind === 'keep' && Math.abs(local.x-p.x)<60 && local.y<p.y+15 && local.y>p.y-120;
      label.visible = damaged || onCell || onKeep;
    }
    const key = hit ? `${hit.cell.col}:${hit.cell.row}:${Math.sign(hit.offset.x)}:${Math.sign(hit.offset.y)}:${Math.round(Math.atan2(hit.offset.y, hit.offset.x) / (Math.PI / 3))}` : '';
    if (key === this.lastHover) return;
    this.lastHover = key;
    // One hex outline drawn once, moved to the cell under the pointer.
    const g = this.hover;
    if (hit) {
      const w = this.cellXY(hit.cell);
      g.position.set(w.x, w.y);
      g.visible = true;
    } else g.visible = false;
    this.cb.onCellHover(hit?.cell ?? null, hit?.offset ?? { x: 0, y: 0 });
  }

  private onUp(e: PointerEvent): void {
    const local = this.local(e);
    const hit = this.cellAt(local);
    if (hit) this.cb.onCellClick(hit.cell, e.button, hit.offset);
    else {
      // The keep has no cells: its picture beyond the east edge answers for it (the catapult's target).
      const keep = this.keepAt(local);
      if (keep) this.cb.onStructureClick?.(keep, e.button);
    }
  }

  private onLeave(): void {
    for (const info of this.structureLabelInfo) info.label.visible = info.damaged;
    if (this.lastHover === '') return;
    this.lastHover = '';
    this.hover.visible = false;
    this.cb.onCellHover(null, { x: 0, y: 0 });
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    // The boarding painting keeps its fixed, contain-fitted camera.
    if (this.boardArt) return;
    this.zoomK = Math.max(0.85, Math.min(1.6, this.zoomK * Math.exp(-Math.max(-120, Math.min(120, e.deltaY)) * 0.0012)));
    this.layout();
  }

  /** Read-only state of every stack figure (tests and diagnostics): where it is drawn and how. */
  /** The still drawn on each obstacle cell (read-only diagnostics for tests). */
  obstacleDebug(): { col: number; row: number; id: string; source: 'nature' | 'generic' | 'marker' }[] {
    return this.obstacleLog.map((o) => ({ ...o }));
  }

  /** A plain grey stone for a blocked cell whose still is missing (never hidden). */
  private drawnStone(): Graphics {
    const g = new Graphics();
    g.ellipse(0, -HEX_W * 0.16, HEX_W * 0.32, HEX_W * 0.2).fill({ color: 0x77736b });
    g.ellipse(-HEX_W * 0.06, -HEX_W * 0.22, HEX_W * 0.16, HEX_W * 0.09).fill({ color: 0x938e84 });
    return g;
  }

  /**
   * Read-only: how the siege is drawn — the gate picture (file, frame, the passage centre in page
   * pixels, the depth of its north and south parts, its neighbours' shown state), the wall rows drawn
   * as painted strips, the stacks' depths — and whether the board's essential pictures are in.
   */
  siegeDebug(): unknown {
    const page = (p: { x: number; y: number }) => {
      const q = this.toPage(p);
      return { x: Math.round(q.x * 10) / 10, y: Math.round(q.y * 10) / 10 };
    };
    const g = this.siegeDrawn.gate;
    const stacks: Record<string, { depth: number; x: number; y: number; col: number; row: number }> = {};
    for (const [id, e] of this.stacks) stacks[id] = { depth: e.root.zIndex, x: e.root.x, y: e.root.y, col: e.shownAnchor.col, row: e.shownAnchor.row };
    // `projectiles`: the missile readout (projectileDebug), reachable under ?e2e through __prSiege.
    const fig = this.engineFig;
    const ground = fig ? this.enginePoint() : null;
    const engine = fig && ground
      ? {
          hp: this.engineShownHp,
          stage: fig.stage,
          drawn: fig.drawn ? { ...fig.drawn, box: { x0: page({ x: ground.x + fig.drawn.box.x0, y: ground.y + fig.drawn.box.y0 }), x1: page({ x: ground.x + fig.drawn.box.x1, y: ground.y + fig.drawn.box.y1 }) } } : null,
          // On the board (west to east): the art, painted facing left, is mirrored so the attacker's engine faces the walls.
          facesWalls: !!fig.drawn && (fig.drawn.scaleX < 0) === (ENGINE_ART_FACING === -1) === (this.engineFacing() === 1),
          ground: page(ground),
          label: fig.label.visible ? fig.label.text : null,
          visible: !!fig.still?.visible && (fig.still?.alpha ?? 0) > 0,
        }
      : null;
    const aim = this.aimDrawn ? { structureId: this.aimDrawn.structureId, from: page(this.aimDrawn.from), to: page(this.aimDrawn.to) } : null;
    const legacyCatapult = this.catapult ? page({ x: this.catapult.root.x, y: this.catapult.root.y }) : null;
    // Where each standing structure is drawn (page pixels; the keep has no cells, so tests click its picture here).
    const structures: Record<string, { x: number; y: number; hp: number }> = {};
    for (const st of this.siegeView?.structures ?? []) {
      const at = this.structurePos(st);
      structures[st.id] = { ...page(st.kind === 'keep' ? { x: at.x, y: at.y - 40 } : at), hp: this.shownHp.get(st.id) ?? st.hp };
    }
    return { ready: this.boardIsReady, mirrored: this.mirrored, gate: g ? { ...g, passagePage: page(g.passage) } : null, wallRows: [...this.siegeDrawn.wallRows].sort((a, b) => a - b), stacks, projectiles: this.projectileDebug(), engine, aim, legacyCatapult, structures };
  }

  /** Read-only: missiles in the air and the last ones flown (profile, release and contact points, timing, impacts). */
  projectileDebug(): ProjectileDebug {
    return { time: this.time, inFlight: this.missiles.size, effects: this.fx.destroyed ? 0 : this.fx.children.length, shots: this.shotLog.map((r) => ({ ...r, impactFrames: [...r.impactFrames], cues: [...r.cues] })) };
  }

  stackDebug(): Record<string, { anchor: BattleCell; x: number; y: number; mirrored: boolean; drawn: string | null; status: string | null; sprite: string; down: boolean; visible: boolean; overlays: string[]; marks: string[]; deaths: number; hits: number; label: string; labelAt: number; scale: number; lift: number; hover: number; motion: ReturnType<SpriteFigure['motionDebug']> }> {
    const out: Record<string, { anchor: BattleCell; x: number; y: number; mirrored: boolean; drawn: string | null; status: string | null; sprite: string; down: boolean; visible: boolean; overlays: string[]; marks: string[]; deaths: number; hits: number; label: string; labelAt: number; scale: number; lift: number; hover: number; motion: ReturnType<SpriteFigure['motionDebug']> }> = {};
    for (const [id, e] of this.stacks) {
      const at = this.toPage(e.root.position);
      out[id] = {
        anchor: e.shownAnchor,
        x: Math.round(at.x * 10) / 10,
        y: Math.round(at.y * 10) / 10,
        // As seen on screen (facing left), also on a mirrored board.
        mirrored: e.figure.pose.scale.x < 0 !== this.mirrored,
        drawn: e.figure.current?.drawn ?? null,
        motion: e.figure.motionDebug(),
        status: e.figure.set?.status ?? null,
        sprite: e.figure.status,
        down: e.down,
        visible: e.root.visible,
        overlays: e.aura.kinds,
        marks: e.shownMarks ? e.shownMarks.replace('…', '').split(',').filter(Boolean) : [],
        label: e.badgeText.text,
        // The controller time the shown count last changed (the shot log's clock).
        labelAt: e.badgeAt,
        deaths: e.deathPlays,
        hits: e.hitPlays,
        // The drawn frame's scale on the board (set × frame-region sourceScale) and how far the pose is lifted (flight).
        scale: Math.round(Math.abs(e.figure.sprite.scale.x) * 10000) / 10000,
        lift: Math.round(-e.figure.pose.y * 10) / 10 || 0,
        // The visual hover over open water (a flyer standing over the sea; sea creatures 2026-10-17).
        hover: Math.round(-e.figure.view.y * 10) / 10 || 0,
      };
    }
    return out;
  }

  /** Screen position (CSS pixels within the canvas) of a battle cell centre — read-only. */
  projectCell(c: BattleCell): { x: number; y: number } | null {
    return this.toPage(this.cellXY(c));
  }

  /** A board direction (1 = west to east) as seen on screen (a mirrored board turns it round). */
  private screenDir(dir: 1 | -1): 1 | -1 {
    return this.mirrored ? (-dir as 1 | -1) : dir;
  }

  /** Whether the board is drawn mirrored (read-only, for tests). */
  get boardMirrored(): boolean {
    return this.mirrored;
  }

  // ------------------------------------------------------------------ frame

  tick(dt: number): void {
    this.time += dt;
    this.tweens.tick(dt);
    if (this.structureSnapIn > 0 && --this.structureSnapIn === 0 && this.structuresLocked === 0) this.syncStructures();
    for (const tw of this.extraTweens) tw.tick(dt);
    const motion = graphicsProfile().ambientMotion;
    if (this.marksDirty) {
      this.marksDirty = false;
      for (const e of this.stacks.values()) if (e.locked === 0 && e.auraDelay === 0) this.refreshMarks(e);
    }
    for (const e of this.stacks.values()) {
      if (e.locked === 0 && e.snapIn > 0 && --e.snapIn === 0) this.snap(e);
      e.badge.position.set(e.root.x + e.badgeOffset.x, e.root.y + e.badgeOffset.y);
      e.badge.zIndex = e.root.y;
      e.badge.renderable = e.root.visible;
      if (e.down) continue;
      e.figure.tick(dt, this.tweens.frozen ? 0 : e.locked > 0 ? (this.tweens.speed > 0 ? 1 / this.tweens.speed : 0) : motion && !this.calm ? 1 : 0, motion && !this.calm && !this.tweens.frozen);
      if (e.locked === 0 && e.auraDelay > 0 && --e.auraDelay === 0) this.applyAura(e);
      if (e.shownStatuses.length > 0) {
        this.refreshAura(e);
        if (motion && !this.calm) e.aura.update(this.time + e.seed * 1000);
      }
      if (e.locked === 0 && this.celebrating.has(e) && !e.figure.has('victory')) {
        // Winners keep cheering (a little hop) until the result opens.
        const t = this.time / 1000 + e.seed * 0.37;
        e.figure.pose.y = -Math.abs(Math.sin(t * Math.PI * 1.6)) * RB * 0.28;
      }
    }
    const a = this.activeStack;
    const ring = this.activeRing;
    if (a && a.locked === 0 && a.view.alive) {
      const w = a.view.footprint === 2 ? 1.7 : 1;
      // Drawn once per width; the pulse is a scale (redrawing it every frame re-sent the whole layer).
      if (w !== this.ringWidth) {
        this.ringWidth = w;
        ring.clear();
        ring.ellipse(0, 0, HEX_W * 0.48 * w, HEX_W * 0.48 * S * 0.62).stroke({ width: 3, color: 0xf1d48a, alpha: 0.95 });
      }
      ring.scale.set(1 + Math.sin(this.time / 220) * 0.05);
      ring.position.set(a.root.x, a.root.y);
      ring.visible = true;
    } else ring.visible = false;
  }

  get busy(): boolean {
    return this.tweens.busy;
  }

  /**
   * Frame pacing (engineHost `FramePace`): full while a playback, an effect, a
   * snap or the victory cheer runs, ambient while only idle loops, status auras
   * and the active ring's pulse play, still without ambient motion.
   */
  pace(): FramePace {
    if (this.tweens.busy || this.structureSnapIn > 0 || this.marksDirty || this.celebrating.size > 0 || this.extraTweens.some((t) => t.busy)) return 'full';
    for (const e of this.stacks.values()) if (e.locked > 0 || e.snapIn > 0) return 'full';
    return graphicsProfile().ambientMotion && !this.calm ? 'ambient' : 'still';
  }

  /** Finish any running playback immediately (skip). */
  skip(): void {
    this.tweens.speed = 0;
    this.tweens.flush();
    for (const tw of this.extraTweens) tw.flush();
  }

  dispose(): void {
    this.disposed = true;
    this.skip();
    for (const [type, fn] of this.listeners) this.canvas.removeEventListener(type, fn);
    for (const texture of this.croppedIconTextures) texture.destroy(false);
    this.croppedIconTextures.clear(); this.iconTextures.clear();
    for (const e of this.stacks.values()) e.figure.destroy();
    this.stacks.clear();
    // Missiles still in the air when the battle closes go with the effect layer (their tweens were finished above).
    for (const m of this.missiles) if (!m.destroyed) m.destroy({ children: true });
    this.missiles.clear();
    this.root.destroy({ children: true });
  }
}

/** A neutral standing silhouette (head, shoulders, body) for a stack drawn without its picture. */
function stackSilhouette(width: number): Graphics {
  const g = new Graphics();
  const k = width > 1 ? 1.25 : 1;
  const h = RB * 1.35 * k;
  const body = RB * 0.42 * k;
  g.roundRect(-body, -h * 0.72, body * 2, h * 0.72, body * 0.8).fill({ color: 0x1d2430, alpha: 0.82 }).stroke({ width: 1.5, color: 0xd9c38a, alpha: 0.75 });
  g.circle(0, -h * 0.84, RB * 0.22 * k).fill({ color: 0x1d2430, alpha: 0.82 }).stroke({ width: 1.5, color: 0xd9c38a, alpha: 0.75 });
  return g;
}
