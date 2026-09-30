/**
 * Low-level geometry helpers shared by scene controllers: merged vertex-colored
 * meshes (one draw call for a whole map), hex/world conversions, ground-plane
 * picking and billboard text labels.
 *
 * Coordinate convention (presentation only): pointy-top hexes, +X to the right,
 * rows advance toward the camera, so row 0 is the far edge. The adventure map
 * is a left-handed scene (rows toward world −Z). The battle board is a
 * right-handed scene (production/02 §5: GLB models load natively), so its rows
 * advance toward world +Z and its camera looks down −Z.
 */
import {
  Color4,
  DynamicTexture,
  Matrix,
  Mesh,
  MeshBuilder,
  Plane,
  Scene,
  StandardMaterial,
  Vector3,
  VertexData,
  type Camera,
} from '@babylonjs/core';
import type { BattleCell, HexCoord } from '@pr/rules';

export const SQRT3 = Math.sqrt(3);

// ---------------------------------------------------------------------------
// Hex <-> world
// ---------------------------------------------------------------------------

export function axialWorld(c: HexCoord, radius: number): { x: number; z: number } {
  return { x: SQRT3 * radius * (c.q + c.r / 2), z: -1.5 * radius * c.r };
}

function cubeRound(qf: number, rf: number): HexCoord {
  const sf = -qf - rf;
  let q = Math.round(qf);
  let r = Math.round(rf);
  const s = Math.round(sf);
  const dq = Math.abs(q - qf);
  const dr = Math.abs(r - rf);
  const ds = Math.abs(s - sf);
  if (dq > dr && dq > ds) q = -r - s;
  else if (dr > ds) r = -q - s;
  return { q, r };
}

export function worldAxial(x: number, z: number, radius: number): HexCoord {
  const rf = -z / (1.5 * radius);
  const qf = x / (SQRT3 * radius) - rf / 2;
  return cubeRound(qf, rf);
}

/** Battle board (right-handed scene): odd-r offset cells; rows advance toward +Z. */
export function cellWorld(c: BattleCell, radius: number): { x: number; z: number } {
  return { x: SQRT3 * radius * (c.col + 0.5 * (c.row & 1)), z: 1.5 * radius * c.row };
}

export function worldCell(x: number, z: number, radius: number): BattleCell {
  const a = worldAxial(x, -z, radius);
  return { col: a.q + (a.r - (a.r & 1)) / 2, row: a.r };
}

export function hexCorner(i: number, radius: number): { x: number; z: number } {
  const ang = (Math.PI / 180) * (60 * i - 30);
  return { x: radius * Math.cos(ang), z: radius * Math.sin(ang) };
}

// ---------------------------------------------------------------------------
// Merged vertex-colored mesh builder
// ---------------------------------------------------------------------------

export class MeshAccumulator {
  positions: number[] = [];
  indices: number[] = [];
  colors: number[] = [];
  normals: number[] = [];

  get vertexCount(): number {
    return this.positions.length / 3;
  }

  vertex(x: number, y: number, z: number, rgb: readonly number[], alpha = 1, n: readonly number[] = [0, 1, 0]): number {
    this.positions.push(x, y, z);
    this.colors.push(rgb[0]!, rgb[1]!, rgb[2]!, alpha);
    this.normals.push(n[0]!, n[1]!, n[2]!);
    return this.vertexCount - 1;
  }

  /** Flat hexagon top (7 vertices). Returns the first vertex index. */
  hexTop(cx: number, cz: number, radius: number, y: number, rgb: readonly number[], alpha = 1): number {
    const first = this.vertex(cx, y, cz, rgb, alpha);
    for (let i = 0; i < 6; i++) {
      const c = hexCorner(i, radius);
      this.vertex(cx + c.x, y, cz + c.z, rgb, alpha);
    }
    for (let i = 0; i < 6; i++) this.indices.push(first, first + 1 + ((i + 1) % 6), first + 1 + i);
    return first;
  }

  /** Vertical skirt below a hex top (gives relief depth). */
  hexSides(cx: number, cz: number, radius: number, top: number, bottom: number, rgb: readonly number[]): number {
    const first = this.vertexCount;
    for (let i = 0; i < 6; i++) {
      const a = hexCorner(i, radius);
      const b = hexCorner((i + 1) % 6, radius);
      const nx = (a.x + b.x) / 2;
      const nz = (a.z + b.z) / 2;
      const len = Math.hypot(nx, nz) || 1;
      const n = [nx / len, 0, nz / len];
      const v0 = this.vertex(cx + a.x, top, cz + a.z, rgb, 1, n);
      const v1 = this.vertex(cx + b.x, top, cz + b.z, rgb, 1, n);
      const v2 = this.vertex(cx + b.x, bottom, cz + b.z, rgb, 1, n);
      const v3 = this.vertex(cx + a.x, bottom, cz + a.z, rgb, 1, n);
      this.indices.push(v0, v2, v1, v0, v3, v2);
    }
    return first;
  }

  /** Flat ribbon from a to b (roads, paths). */
  ribbon(ax: number, az: number, bx: number, bz: number, y: number, width: number, rgb: readonly number[], alpha = 1): void {
    const dx = bx - ax;
    const dz = bz - az;
    const len = Math.hypot(dx, dz) || 1;
    const px = (-dz / len) * (width / 2);
    const pz = (dx / len) * (width / 2);
    const v0 = this.vertex(ax + px, y, az + pz, rgb, alpha);
    const v1 = this.vertex(bx + px, y, bz + pz, rgb, alpha);
    const v2 = this.vertex(bx - px, y, bz - pz, rgb, alpha);
    const v3 = this.vertex(ax - px, y, az - pz, rgb, alpha);
    this.indices.push(v0, v1, v2, v0, v2, v3);
  }

  build(name: string, scene: Scene, opts: { alpha?: boolean; updatableColors?: boolean } = {}): Mesh {
    const mesh = new Mesh(name, scene);
    const vd = new VertexData();
    vd.positions = this.positions;
    vd.indices = this.indices;
    vd.colors = this.colors;
    vd.normals = this.normals;
    vd.applyToMesh(mesh, opts.updatableColors === true);
    const mat = new StandardMaterial(`${name}-mat`, scene);
    mat.specularColor.set(0.05, 0.05, 0.05);
    mat.backFaceCulling = false;
    if (opts.alpha) {
      mesh.hasVertexAlpha = true;
      mat.alpha = 0.999;
    }
    mesh.material = mat;
    mesh.isPickable = false;
    mesh.useVertexColors = true;
    return mesh;
  }
}

// ---------------------------------------------------------------------------
// Picking
// ---------------------------------------------------------------------------

const GROUND = Plane.FromPositionAndNormal(Vector3.Zero(), Vector3.Up());

/** Intersect the pointer ray with the y = height plane. */
export function pickGround(scene: Scene, camera: Camera, x: number, y: number, height = 0): Vector3 | null {
  const ray = scene.createPickingRay(x, y, Matrix.Identity(), camera);
  const plane = height === 0 ? GROUND : Plane.FromPositionAndNormal(new Vector3(0, height, 0), Vector3.Up());
  const d = ray.intersectsPlane(plane);
  if (d === null || d < 0) return null;
  return ray.origin.add(ray.direction.scale(d));
}

/** Project a world point to canvas CSS pixels (null when behind the camera). */
export function projectPoint(scene: Scene, camera: Camera, p: Vector3): { x: number; y: number } | null {
  const engine = scene.getEngine();
  const w = engine.getRenderWidth();
  const h = engine.getRenderHeight();
  const vp = camera.getViewMatrix(true).multiply(camera.getProjectionMatrix(true));
  const v = Vector3.Project(p, Matrix.Identity(), vp, camera.viewport.toGlobal(w, h));
  if (!Number.isFinite(v.x) || !Number.isFinite(v.y) || v.z < 0 || v.z > 1 || w === 0) return null;
  const scale = engine.getHardwareScalingLevel();
  return { x: v.x * scale, y: v.y * scale };
}

// ---------------------------------------------------------------------------
// Text billboards
// ---------------------------------------------------------------------------

export interface LabelOptions {
  readonly width?: number;
  readonly height?: number;
  readonly font?: string;
  readonly color?: string;
  readonly background?: string | null;
  readonly border?: string | null;
  readonly worldWidth?: number;
}

export interface Label {
  readonly mesh: Mesh;
  set(text: string, color?: string): void;
  dispose(): void;
}

/** A camera-facing text plane backed by a small dynamic texture. */
export function createLabel(scene: Scene, name: string, text: string, opts: LabelOptions = {}): Label {
  const w = opts.width ?? 256;
  const h = opts.height ?? 96;
  const tex = new DynamicTexture(`${name}-tex`, { width: w, height: h }, scene, true);
  tex.hasAlpha = true;
  const mat = new StandardMaterial(`${name}-mat`, scene);
  mat.diffuseTexture = tex;
  mat.emissiveColor.set(1, 1, 1);
  mat.disableLighting = true;
  mat.useAlphaFromDiffuseTexture = true;
  mat.backFaceCulling = false;
  const worldW = opts.worldWidth ?? 0.9;
  const plane = MeshBuilder.CreatePlane(name, { width: worldW, height: (worldW * h) / w }, scene);
  plane.material = mat;
  plane.billboardMode = Mesh.BILLBOARDMODE_ALL;
  plane.isPickable = false;
  plane.renderingGroupId = 1;
  let last = '';
  const draw = (t: string, color = opts.color ?? '#f4e8c9') => {
    const key = `${t}|${color}`;
    if (key === last) return;
    last = key;
    const ctx = tex.getContext() as CanvasRenderingContext2D;
    ctx.clearRect(0, 0, w, h);
    if (opts.background !== null) {
      ctx.fillStyle = opts.background ?? 'rgba(7,14,26,0.86)';
      const r = h * 0.28;
      ctx.beginPath();
      ctx.moveTo(r, 4);
      ctx.lineTo(w - r, 4);
      ctx.quadraticCurveTo(w - 4, 4, w - 4, r);
      ctx.lineTo(w - 4, h - r);
      ctx.quadraticCurveTo(w - 4, h - 4, w - r, h - 4);
      ctx.lineTo(r, h - 4);
      ctx.quadraticCurveTo(4, h - 4, 4, h - r);
      ctx.lineTo(4, r);
      ctx.quadraticCurveTo(4, 4, r, 4);
      ctx.closePath();
      ctx.fill();
      if (opts.border !== null) {
        ctx.strokeStyle = opts.border ?? '#c29a52';
        ctx.lineWidth = 4;
        ctx.stroke();
      }
    }
    ctx.font = opts.font ?? '600 54px Inter, "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 8;
    ctx.strokeStyle = 'rgba(0,0,0,0.75)';
    ctx.strokeText(t, w / 2, h / 2 + 2);
    ctx.fillStyle = color;
    ctx.fillText(t, w / 2, h / 2 + 2);
    tex.update();
  };
  draw(text);
  return {
    mesh: plane,
    set: draw,
    dispose: () => {
      plane.dispose();
      mat.dispose();
      tex.dispose();
    },
  };
}

export function clearColor(hex: string): Color4 {
  const h = hex.replace('#', '');
  const n = parseInt(h, 16);
  return new Color4(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255, 1);
}
