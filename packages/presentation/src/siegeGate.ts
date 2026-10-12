/**
 * The six-pantheon siege gate (assets-runtime/siege-gates-v3, delivered 2026-10-11): each state is
 * one 512 × 1024 picture of an opening in the north–south wall, facing the attackers (screen left),
 * with plain wall connectors running north and south. Presentation only — the gate cell, its HP and
 * who may pass come from the rules; the picture is fitted to them, never the other way round.
 *
 * Registration: the manifest's anchor is the painted passage centre on the wall axis, and
 * `startingPassagePitchPixels` painted pixels make one board row, so the doorway covers exactly the
 * gate cell. The picture is drawn in two parts so creatures sort correctly against it:
 *   - north part (connector, lintel block, door): just behind anything standing in the gate cell;
 *   - south part (south jamb cap and connector): in front of it.
 * While a neighbouring wall section stands, the gate's connector draws that section's cell next to
 * the gate (the painted strip is not drawn there, so the wall is never doubled). When it falls, the
 * connector is cut back to the gate's own jamb and the section's rubble shows: a gate picture can
 * never put a fallen wall back.
 */
import { Container, Rectangle, Sprite, Texture } from 'pixi.js';
import { groundShadow, stillTexture } from './staticSprites';
import type { SiegeGateRegistration, StaticSpriteDefinition } from './sprites';
import { SIEGE_ROW } from './siegeLayout';

export type WallGateDefinition = StaticSpriteDefinition & { readonly frame: readonly [number, number, number, number]; readonly registration: SiegeGateRegistration };

/** A gate painted as an opening in the wall (rather than a free-standing gatehouse still). */
export function isWallGate(def: StaticSpriteDefinition | null | undefined): def is WallGateDefinition {
  return !!def?.registration && !!def.frame && def.registration.startingPassagePitchPixels > 0;
}

/** Rows either side of the passage that a standing connector covers; the painted wall strips start beyond. */
export const GATE_REACH = 1.5;

/** Where the picture splits between its north and south parts (screen rows south of the passage centre). */
const SPLIT = 0.45;

/**
 * Measured on the delivered pictures, in rows from the passage centre (the same in all three states
 * of a pantheon): the top of the lintel block and the bottom of the south jamb cap. Beyond them a
 * connector is plain wall, cut away when that wall section has fallen.
 */
const JAMBS: Record<string, { readonly north: number; readonly south: number }> = {
  greek: { north: -1.12, south: 0.66 },
  norse: { north: -1.12, south: 0.66 },
  egyptian: { north: -1.06, south: 0.66 },
  japanese: { north: -1.02, south: 0.62 },
  celtic: { north: -0.98, south: 0.64 },
  mesoamerican: { north: -1.02, south: 0.62 },
};
const DEFAULT_JAMBS = { north: -1.1, south: 0.66 };

export function gateJambs(pantheon: string | null | undefined): { readonly north: number; readonly south: number } {
  return JAMBS[pantheon ?? ''] ?? DEFAULT_JAMBS;
}

/** How the wall section on one side of the gate is shown: standing (intact or damaged) or fallen. */
export type GateNeighbour = 'standing' | 'fallen';

export interface WallGatePart {
  /** Positioned at the passage centre (the gate cell's wall point); add it to the depth-sorted layer. */
  readonly root: Container;
  /** Depth relative to the passage centre's y (view units). */
  readonly depth: number;
}

/**
 * Presentation fit over the supplied scale (one painted passage pitch = one board row): the siege-v2
 * wall strips are painted with a taller west face and larger masonry than the gate pictures, so at
 * exactly one row per pitch the gate reads as a low insert in a high wall. Enlarging it about the
 * passage centre matches the masonry and face height; the passage centre stays on the gate cell.
 */
export const GATE_FIT = 1.33;

/**
 * Presentation offset (view units, east +) of the passage centre from the gate cell's wall point,
 * lining the gate's wall axis up with the siege-v2 strips' walkway. Rows never move.
 */
const GATE_SHIFT: Record<string, number> = {};
const DEFAULT_SHIFT = -3;
export function wallGateShift(pantheon: string | null | undefined): number {
  return GATE_SHIFT[pantheon ?? ''] ?? DEFAULT_SHIFT;
}

/** Screen scale of the picture. */
export function wallGateScale(def: WallGateDefinition): number {
  return (SIEGE_ROW / def.registration.startingPassagePitchPixels) * GATE_FIT;
}

/** The two depth-sorted parts of a gate state, cut for its neighbours. */
export function wallGateParts(def: WallGateDefinition, pantheon: string | null | undefined, north: GateNeighbour, south: GateNeighbour, breached: boolean, shadows: boolean): WallGatePart[] {
  const jambs = gateJambs(pantheon);
  // Picture rows (painted pitches) from the passage centre; screen rows = picture rows × GATE_FIT.
  const top = north === 'standing' ? -GATE_REACH / GATE_FIT : jambs.north;
  const bottom = south === 'standing' ? GATE_REACH / GATE_FIT : jambs.south;
  const split = SPLIT / GATE_FIT;
  const northPart = new Container();
  const southPart = new Container();
  if (shadows) {
    // The wall's shade falls east (away from the light); a breach lets the light through.
    const spans: [number, number][] = breached ? [[top, -0.3], [0.2, bottom]] : [[top, bottom]];
    for (const [a, b] of spans) {
      const shade = groundShadow(15, SIEGE_ROW * GATE_FIT * ((b - a) / 2 + 0.08), 0.2);
      shade.position.set(9, ((a + b) / 2) * SIEGE_ROW * GATE_FIT);
      (b <= split ? northPart : southPart).addChildAt(shade, 0);
    }
  }
  northPart.addChild(band(def, top, split));
  southPart.addChild(band(def, split, bottom));
  return [
    { root: northPart, depth: -0.5 },
    { root: southPart, depth: SPLIT * SIEGE_ROW },
  ];
}

const bandFrames = new Map<string, Texture>();

/** The rows `from`..`to` (from the passage centre) of the state's frame, placed so the passage centre is (0, 0). */
function band(def: WallGateDefinition, from: number, to: number): Sprite {
  const [fx, fy, fw, fh] = def.frame;
  const { passageCenter: [cx, cy], startingPassagePitchPixels: pitch } = def.registration;
  const y0 = Math.max(0, Math.round(cy + from * pitch));
  const y1 = Math.min(fh, Math.round(cy + to * pitch));
  const scale = wallGateScale(def);
  const s = new Sprite(Texture.EMPTY);
  s.scale.set(scale);
  s.position.set(-cx * scale, (y0 - cy) * scale);
  s.visible = false;
  if (y1 <= y0) return s;
  void stillTexture({ ...def, frame: undefined }).then(
    (whole) => {
      if (s.destroyed) return;
      const key = `${def.file}:${fx},${fy + y0},${fw},${y1 - y0}`;
      let t = bandFrames.get(key);
      if (!t) {
        t = new Texture({ source: whole.source, frame: new Rectangle(fx, fy + y0, fw, y1 - y0) });
        bandFrames.set(key, t);
      }
      s.texture = t;
      s.visible = true;
    },
    () => undefined,
  );
  return s;
}
