/**
 * Procedural placeholder models (clearly temporary) built from primitives:
 * creature proxies by body profile (base vs upgraded silhouettes differ in shape,
 * not only color), hero riders, and adventure-site archetypes.
 *
 * Final GLB assets replace these per asset ID; controllers only need a root
 * TransformNode with the same logical anchor and facing conventions (+X forward).
 */
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { Scene } from '@babylonjs/core/scene';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
import type { BodyProfile } from '@pr/rules';

export class MaterialCache {
  private map = new Map<string, StandardMaterial>();
  constructor(private readonly scene: Scene) {}

  get(hex: string, opts: { emissive?: number; alpha?: number; specular?: number } = {}): StandardMaterial {
    const key = `${hex}|${opts.emissive ?? 0}|${opts.alpha ?? 1}|${opts.specular ?? 0.12}`;
    let m = this.map.get(key);
    if (!m) {
      m = new StandardMaterial(`m-${key}`, this.scene);
      const c = Color3.FromHexString(hex);
      m.diffuseColor = c;
      m.specularColor = new Color3(opts.specular ?? 0.12, opts.specular ?? 0.12, opts.specular ?? 0.12);
      if (opts.emissive) m.emissiveColor = c.scale(opts.emissive);
      if (opts.alpha !== undefined && opts.alpha < 1) {
        m.alpha = opts.alpha;
      }
      m.freeze();
      this.map.set(key, m);
    }
    return m;
  }

  dispose(): void {
    for (const m of this.map.values()) m.dispose();
    this.map.clear();
  }
}

export interface ProxyColors {
  readonly skin: string;
  readonly cloth: string;
  readonly metal: string;
  readonly trim: string;
}

const SKIN = '#c9936a';
const HIDE = '#8a6a44';
const MARBLE = '#d8d2c2';
const BRONZE = '#b58a45';
const GOLD = '#e4c06b';

export interface CreatureProxy {
  readonly root: TransformNode;
  readonly meshes: AbstractMesh[];
  /** Node that swings for attacks (weapon arm / head). */
  readonly strike: TransformNode;
  readonly shield: TransformNode | null;
  readonly height: number;
}

interface Builder {
  scene: Scene;
  mats: MaterialCache;
  root: TransformNode;
  meshes: AbstractMesh[];
}

function add(b: Builder, mesh: Mesh, parent: TransformNode, hex: string, pos: [number, number, number], opts: { emissive?: number; rot?: [number, number, number] } = {}): Mesh {
  mesh.parent = parent;
  mesh.position.set(pos[0], pos[1], pos[2]);
  if (opts.rot) mesh.rotation.set(opts.rot[0], opts.rot[1], opts.rot[2]);
  mesh.material = b.mats.get(hex, { emissive: opts.emissive });
  mesh.isPickable = false;
  b.meshes.push(mesh);
  return mesh;
}

const box = (b: Builder, name: string, w: number, h: number, d: number) => MeshBuilder.CreateBox(name, { width: w, height: h, depth: d }, b.scene);
const cyl = (b: Builder, name: string, h: number, top: number, bottom: number, tess = 10) =>
  MeshBuilder.CreateCylinder(name, { height: h, diameterTop: top, diameterBottom: bottom, tessellation: tess }, b.scene);
const sph = (b: Builder, name: string, d: number, seg = 8) => MeshBuilder.CreateSphere(name, { diameter: d, segments: seg }, b.scene);

function humanoid(b: Builder, up: boolean, c: ProxyColors, kind: 'spear' | 'thrower' | 'caster') {
  const body = new TransformNode('body', b.scene);
  body.parent = b.root;
  if (kind === 'caster') {
    add(b, cyl(b, 'robe', 0.62, 0.22, 0.42), body, c.cloth, [0, 0.31, 0]);
    if (up) add(b, cyl(b, 'mantle', 0.2, 0.34, 0.4), body, GOLD, [0, 0.56, 0]);
  } else {
    add(b, box(b, 'legL', 0.08, 0.3, 0.08), body, c.skin, [0, 0.15, -0.06]);
    add(b, box(b, 'legR', 0.08, 0.3, 0.08), body, c.skin, [0, 0.15, 0.06]);
    add(b, box(b, 'tunic', 0.2, 0.14, 0.26), body, c.cloth, [0, 0.33, 0]);
    add(b, box(b, 'torso', 0.18, 0.24, 0.24), body, up ? c.metal : c.cloth, [0, 0.5, 0]);
  }
  add(b, sph(b, 'head', 0.16), body, c.skin, [0, 0.72, 0]);
  if (kind !== 'caster') {
    add(b, cyl(b, 'helm', 0.1, 0.12, 0.18), body, c.metal, [0, 0.79, 0]);
    if (up) add(b, box(b, 'crest', 0.2, 0.1, 0.03), body, '#b3322b', [0, 0.9, 0]);
  } else if (up) {
    add(b, cyl(b, 'headpiece', 0.12, 0.02, 0.16, 6), body, GOLD, [0, 0.86, 0]);
  }
  const arm = new TransformNode('arm', b.scene);
  arm.parent = body;
  arm.position.set(0, 0.6, 0.16);
  let shield: TransformNode | null = null;
  if (kind === 'spear') {
    add(b, cyl(b, 'spear', 1.1, 0.025, 0.025, 6), arm, '#6b4a2a', [0.12, 0.05, 0], { rot: [0, 0, -Math.PI / 2.6] });
    add(b, cyl(b, 'tip', 0.12, 0, 0.05, 6), arm, BRONZE, [0.55, 0.27, 0], { rot: [0, 0, -Math.PI / 2.6] });
    shield = new TransformNode('shieldNode', b.scene);
    shield.parent = body;
    shield.position.set(0.12, 0.45, -0.16);
    add(b, cyl(b, 'shield', 0.04, up ? 0.36 : 0.32, up ? 0.36 : 0.32, 16), shield, up ? GOLD : BRONZE, [0, 0, 0], { rot: [0, 0, Math.PI / 2] });
    add(b, cyl(b, 'boss', 0.05, 0.1, 0.1, 10), shield, c.cloth, [0.02, 0, 0], { rot: [0, 0, Math.PI / 2] });
  } else if (kind === 'thrower') {
    add(b, cyl(b, 'javelin', 0.7, 0.02, 0.02, 6), arm, '#7a5a34', [0, 0.25, 0], { rot: [0, 0, -0.3] });
    for (let i = 0; i < (up ? 4 : 3); i++) add(b, cyl(b, `quiver${i}`, 0.5, 0.015, 0.015, 5), body, '#7a5a34', [-0.1, 0.55, -0.05 + i * 0.03], { rot: [0.25, 0, 0.2] });
    shield = new TransformNode('shieldNode', b.scene);
    shield.parent = body;
    shield.position.set(0.1, 0.45, -0.15);
    add(b, cyl(b, 'pelta', 0.03, 0.22, 0.22, 3), shield, BRONZE, [0, 0, 0], { rot: [0, 0, Math.PI / 2] });
  } else {
    add(b, cyl(b, 'staff', 0.95, 0.03, 0.03, 6), arm, '#5a3e22', [0.05, 0, 0]);
    add(b, sph(b, 'focus', up ? 0.16 : 0.11), arm, '#6fe0f0', [0.05, 0.5, 0], { emissive: up ? 0.9 : 0.6 });
    if (up) {
      const ring = MeshBuilder.CreateTorus('ring', { diameter: 0.24, thickness: 0.02, tessellation: 16 }, b.scene);
      add(b, ring, arm, GOLD, [0.05, 0.5, 0], { rot: [Math.PI / 2, 0, 0] });
    }
  }
  return { body, arm, shield, height: 0.95 };
}

function quadruped(b: Builder, opts: { bodyHex: string; len: number; high: number; legHex: string }) {
  const body = new TransformNode('quad', b.scene);
  body.parent = b.root;
  add(b, box(b, 'barrel', opts.len, opts.high * 0.45, opts.high * 0.5), body, opts.bodyHex, [0, opts.high, 0]);
  const lx = opts.len * 0.38;
  const lz = opts.high * 0.18;
  for (const [x, z] of [
    [lx, lz],
    [lx, -lz],
    [-lx, lz],
    [-lx, -lz],
  ] as const) {
    add(b, box(b, 'leg', 0.08, opts.high, 0.08), body, opts.legHex, [x, opts.high / 2, z]);
  }
  return body;
}

export function buildCreatureProxy(scene: Scene, mats: MaterialCache, body: BodyProfile, upgraded: boolean, accent: string, name = 'creature'): CreatureProxy {
  const root = new TransformNode(name, scene);
  const b: Builder = { scene, mats, root, meshes: [] };
  const colors: ProxyColors = { skin: SKIN, cloth: accent, metal: upgraded ? GOLD : BRONZE, trim: GOLD };
  let strike: TransformNode = root;
  let shield: TransformNode | null = null;
  let height = 1;
  switch (body) {
    case 'humanoid_spear': {
      const h = humanoid(b, upgraded, colors, 'spear');
      strike = h.arm;
      shield = h.shield;
      height = h.height;
      break;
    }
    case 'humanoid_thrower': {
      const h = humanoid(b, upgraded, colors, 'thrower');
      strike = h.arm;
      shield = h.shield;
      height = h.height;
      break;
    }
    case 'humanoid_caster': {
      const h = humanoid(b, upgraded, colors, 'caster');
      strike = h.arm;
      height = h.height;
      break;
    }
    case 'centaur': {
      quadruped(b, { bodyHex: '#8a5a33', len: 0.9, high: 0.55, legHex: '#6e4527' });
      const torso = new TransformNode('torso', scene);
      torso.parent = root;
      torso.position.set(0.42, 0.62, 0);
      add(b, box(b, 'chest', 0.2, 0.36, 0.26), torso, upgraded ? GOLD : accent, [0, 0.18, 0]);
      add(b, sph(b, 'head', 0.16), torso, SKIN, [0, 0.46, 0]);
      if (upgraded) add(b, box(b, 'crest', 0.18, 0.08, 0.03), torso, '#b3322b', [0, 0.58, 0]);
      const arm = new TransformNode('arm', scene);
      arm.parent = torso;
      arm.position.set(0, 0.3, 0.16);
      add(b, cyl(b, 'spear', 1.1, 0.025, 0.025, 6), arm, '#6b4a2a', [0.15, 0.05, 0], { rot: [0, 0, -Math.PI / 2.4] });
      add(b, cyl(b, 'tip', 0.14, 0, 0.05, 6), arm, upgraded ? GOLD : BRONZE, [0.64, 0.25, 0], { rot: [0, 0, -Math.PI / 2.4] });
      strike = arm;
      height = 1.2;
      break;
    }
    case 'rider': {
      quadruped(b, { bodyHex: '#5a3a24', len: 1.0, high: 0.55, legHex: '#3e2818' });
      add(b, box(b, 'neck', 0.22, 0.4, 0.16), root, '#5a3a24', [0.52, 0.72, 0], { rot: [0, 0, -0.6] });
      add(b, box(b, 'hhead', 0.28, 0.14, 0.14), root, '#5a3a24', [0.7, 0.9, 0]);
      if (upgraded) add(b, box(b, 'barding', 0.5, 0.2, 0.34), root, GOLD, [0.3, 0.6, 0]);
      add(b, box(b, 'blanket', 0.4, 0.06, 0.34), root, accent, [0, 0.82, 0]);
      const rider = new TransformNode('rider', scene);
      rider.parent = root;
      rider.position.set(0, 0.85, 0);
      add(b, box(b, 'rtorso', 0.18, 0.3, 0.22), rider, upgraded ? GOLD : accent, [0, 0.16, 0]);
      add(b, sph(b, 'rhead', 0.15), rider, SKIN, [0, 0.4, 0]);
      add(b, cyl(b, 'rhelm', 0.09, 0.1, 0.16), rider, upgraded ? GOLD : BRONZE, [0, 0.46, 0]);
      if (upgraded) add(b, box(b, 'rcrest', 0.18, 0.08, 0.03), rider, '#b3322b', [0, 0.54, 0]);
      const arm = new TransformNode('arm', scene);
      arm.parent = rider;
      arm.position.set(0, 0.22, 0.14);
      add(b, cyl(b, 'lance', 1.5, 0.03, 0.03, 6), arm, '#6b4a2a', [0.5, 0, 0], { rot: [0, 0, -Math.PI / 2 + 0.15] });
      strike = arm;
      height = 1.4;
      break;
    }
    case 'griffin': {
      const q = quadruped(b, { bodyHex: '#b8873e', len: 0.9, high: 0.45, legHex: '#8f6428' });
      add(b, sph(b, 'ghead', 0.3), q, '#efe6cf', [0.52, 0.72, 0]);
      add(b, cyl(b, 'beak', 0.18, 0, 0.1, 6), q, '#e0b030', [0.7, 0.7, 0], { rot: [0, 0, -Math.PI / 2] });
      if (upgraded) add(b, box(b, 'gcrest', 0.24, 0.16, 0.04), q, '#8fc8ff', [0.44, 0.9, 0], { rot: [0, 0, 0.4] });
      const wings = new TransformNode('wings', scene);
      wings.parent = root;
      wings.position.set(0, 0.62, 0);
      add(b, box(b, 'wingL', 0.5, 0.05, upgraded ? 0.9 : 0.72), wings, upgraded ? '#f2ecdc' : '#d8c8a2', [-0.05, 0.25, 0.38], { rot: [0.9, 0, 0] });
      add(b, box(b, 'wingR', 0.5, 0.05, upgraded ? 0.9 : 0.72), wings, upgraded ? '#f2ecdc' : '#d8c8a2', [-0.05, 0.25, -0.38], { rot: [-0.9, 0, 0] });
      strike = wings;
      height = 1.2;
      break;
    }
    case 'bull_biped': {
      add(b, box(b, 'legL', 0.16, 0.5, 0.16), root, HIDE, [0, 0.25, -0.13]);
      add(b, box(b, 'legR', 0.16, 0.5, 0.16), root, HIDE, [0, 0.25, 0.13]);
      add(b, box(b, 'torso', 0.36, 0.5, 0.52), root, upgraded ? '#8a6a44' : HIDE, [0, 0.76, 0]);
      if (upgraded) add(b, box(b, 'plate', 0.38, 0.3, 0.54), root, GOLD, [0.01, 0.8, 0]);
      add(b, box(b, 'bhead', 0.3, 0.26, 0.26), root, '#5a3e22', [0.1, 1.14, 0]);
      add(b, cyl(b, 'hornL', 0.3, 0, 0.06, 6), root, '#efe3c4', [0.12, 1.3, 0.18], { rot: [-0.9, 0, 0] });
      add(b, cyl(b, 'hornR', 0.3, 0, 0.06, 6), root, '#efe3c4', [0.12, 1.3, -0.18], { rot: [0.9, 0, 0] });
      const arm = new TransformNode('arm', scene);
      arm.parent = root;
      arm.position.set(0.05, 0.95, 0.32);
      add(b, cyl(b, 'haft', 0.9, 0.04, 0.04, 6), arm, '#4a321c', [0.1, 0.1, 0], { rot: [0, 0, -0.5] });
      add(b, box(b, 'axe', 0.1, upgraded ? 0.36 : 0.28, 0.06), arm, '#9aa2ad', [0.32, 0.48, 0]);
      strike = arm;
      height = 1.45;
      break;
    }
    case 'giant': {
      add(b, box(b, 'legL', 0.2, 0.6, 0.2), root, SKIN, [0, 0.3, -0.16]);
      add(b, box(b, 'legR', 0.2, 0.6, 0.2), root, SKIN, [0, 0.3, 0.16]);
      add(b, box(b, 'loin', 0.3, 0.2, 0.5), root, '#6e4a2a', [0, 0.66, 0]);
      add(b, box(b, 'torso', 0.4, 0.6, 0.62), root, SKIN, [0, 1.02, 0]);
      if (upgraded) {
        add(b, box(b, 'bracerL', 0.14, 0.14, 0.14), root, GOLD, [0.05, 1.0, 0.4]);
        add(b, box(b, 'belt', 0.42, 0.1, 0.64), root, GOLD, [0, 0.76, 0]);
      }
      add(b, sph(b, 'head', 0.4), root, SKIN, [0.02, 1.52, 0]);
      add(b, sph(b, 'eye', 0.14), root, '#fff4d3', [0.2, 1.56, 0], { emissive: 0.5 });
      const arm = new TransformNode('arm', scene);
      arm.parent = root;
      arm.position.set(0, 1.2, 0.42);
      add(b, sph(b, 'boulder', upgraded ? 0.4 : 0.34), arm, upgraded ? '#9ab0c8' : '#8d8a82', [0.1, 0.3, 0], { emissive: upgraded ? 0.25 : 0 });
      strike = arm;
      height = 1.8;
      break;
    }
    case 'beast': {
      const q = quadruped(b, { bodyHex: '#8d8a82', len: 0.8, high: 0.4, legHex: '#6b6f76' });
      add(b, box(b, 'bhead', 0.3, 0.2, 0.2), q, '#8d8a82', [0.5, 0.55, 0]);
      strike = q;
      height = 0.8;
      break;
    }
    case 'serpent': {
      for (let i = 0; i < 6; i++) add(b, sph(b, `seg${i}`, 0.34 - i * 0.03), root, i % 2 ? '#3f6f4f' : '#4f8f5c', [0.3 - i * 0.18, 0.2 + Math.sin(i) * 0.08, Math.cos(i * 1.4) * 0.12]);
      strike = root;
      height = 0.6;
      break;
    }
    case 'winged_humanoid': {
      const h = humanoid(b, upgraded, colors, 'spear');
      add(b, box(b, 'wingL', 0.4, 0.04, 0.6), h.body, '#efe6cf', [-0.12, 0.7, 0.3], { rot: [0.8, 0, 0] });
      add(b, box(b, 'wingR', 0.4, 0.04, 0.6), h.body, '#efe6cf', [-0.12, 0.7, -0.3], { rot: [-0.8, 0, 0] });
      strike = h.arm;
      shield = h.shield;
      height = 1.1;
      break;
    }
    case 'spirit': {
      add(b, cyl(b, 'wisp', 0.8, 0.3, 0.02, 12), root, '#9fe8ff', [0, 0.5, 0], { emissive: 0.5 });
      add(b, sph(b, 'shead', 0.28), root, '#c8f4ff', [0, 0.95, 0], { emissive: 0.6 });
      height = 1.1;
      break;
    }
    case 'construct': {
      add(b, box(b, 'cbody', 0.5, 0.8, 0.6), root, '#b8a888', [0, 0.6, 0]);
      add(b, box(b, 'chead', 0.3, 0.3, 0.3), root, '#c8b898', [0, 1.15, 0]);
      height = 1.3;
      break;
    }
  }
  for (const m of b.meshes) m.receiveShadows = false;
  return { root, meshes: b.meshes, strike, shield, height };
}

export function disposeProxy(p: { root: TransformNode }): void {
  p.root.dispose(false, false);
}

// ---------------------------------------------------------------------------
// Adventure-map site proxies
// ---------------------------------------------------------------------------

export type SiteArchetype =
  | 'town'
  | 'sawmill'
  | 'quarry'
  | 'gold_mine'
  | 'crystal_deposit'
  | 'pickup'
  | 'watchtower'
  | 'crossing_bridge'
  | 'crossing_pass'
  | 'nest'
  | 'refuge'
  | 'quarry_cache'
  | 'grove'
  | 'beacon'
  | 'relay'
  | 'gate'
  /** Neutral creature camp (recruit from its weekly stock). */
  | 'camp'
  /** One-time map event (a wayside shrine / standing stones). */
  | 'event_site'
  /** Relic shrine (hold-the-relic victory). */
  | 'relic';

export interface SiteProxy {
  readonly root: TransformNode;
  /** Emissive flame/brazier (beacon/relay) toggled by state. */
  readonly flame: Mesh | null;
  /** Barrier plane shown while a gate is sealed. */
  readonly seal: Mesh | null;
  readonly flagPole: TransformNode;
}

export function buildSiteProxy(scene: Scene, mats: MaterialCache, kind: SiteArchetype, name: string): SiteProxy {
  const root = new TransformNode(name, scene);
  const b: Builder = { scene, mats, root, meshes: [] };
  let flame: Mesh | null = null;
  let seal: Mesh | null = null;
  const plinth = (d = 1.5) => add(b, cyl(b, 'plinth', 0.12, d, d * 1.05, 6), root, '#8f8676', [0, 0.06, 0]);
  switch (kind) {
    case 'town': {
      plinth(1.9);
      add(b, box(b, 'wall', 1.3, 0.28, 1.3), root, MARBLE, [0, 0.26, 0]);
      add(b, box(b, 'hall', 0.7, 0.5, 0.5), root, '#e8e2d2', [0.05, 0.62, 0]);
      add(b, cyl(b, 'roof', 0.28, 0.02, 0.9, 4), root, '#c89a52', [0.05, 1.0, 0], { rot: [0, Math.PI / 4, 0] });
      for (const [x, z] of [
        [-0.55, -0.55],
        [0.55, -0.55],
        [-0.55, 0.55],
        [0.55, 0.55],
      ] as const)
        add(b, cyl(b, 'tower', 0.7, 0.22, 0.26, 8), root, MARBLE, [x, 0.4, z]);
      break;
    }
    case 'sawmill':
      plinth();
      add(b, box(b, 'shed', 0.7, 0.4, 0.5), root, '#8a5a33', [0, 0.32, 0]);
      add(b, cyl(b, 'roof', 0.25, 0.02, 0.8, 4), root, '#5a3a24', [0, 0.64, 0], { rot: [0, Math.PI / 4, 0] });
      for (let i = 0; i < 3; i++) add(b, cyl(b, 'log', 0.6, 0.12, 0.12, 8), root, '#a06a3c', [0.1, 0.18 + i * 0.1, 0.45], { rot: [0, 0, Math.PI / 2] });
      break;
    case 'quarry':
      plinth();
      for (let i = 0; i < 4; i++) add(b, box(b, 'block', 0.28, 0.24, 0.28), root, '#a8a9ad', [-0.3 + (i % 2) * 0.4, 0.24 + Math.floor(i / 2) * 0.24, -0.1 + (i % 3) * 0.12]);
      add(b, box(b, 'face', 0.9, 0.7, 0.2), root, '#7a7c80', [0, 0.4, -0.5]);
      break;
    case 'gold_mine':
      plinth();
      add(b, box(b, 'mouth', 0.8, 0.6, 0.4), root, '#5a4a38', [0, 0.36, -0.2]);
      add(b, box(b, 'cart', 0.36, 0.2, 0.26), root, '#6b4a2a', [0.2, 0.22, 0.35]);
      add(b, sph(b, 'ore', 0.26), root, '#e8c46f', [0.2, 0.36, 0.35], { emissive: 0.3 });
      break;
    case 'crystal_deposit':
      plinth();
      for (let i = 0; i < 5; i++) add(b, cyl(b, 'shard', 0.5 + i * 0.1, 0, 0.18, 5), root, '#4aa8ff', [-0.3 + i * 0.15, 0.35, (i % 2) * 0.2 - 0.1], { emissive: 0.35, rot: [0.2 * (i - 2), 0, 0.15 * (i - 2)] });
      break;
    case 'pickup':
      add(b, box(b, 'chest', 0.46, 0.3, 0.32), root, '#8a5a33', [0, 0.16, 0]);
      add(b, box(b, 'band', 0.48, 0.06, 0.34), root, GOLD, [0, 0.24, 0]);
      break;
    case 'watchtower':
      plinth(1.2);
      add(b, cyl(b, 'tower', 1.6, 0.34, 0.5, 8), root, MARBLE, [0, 0.9, 0]);
      add(b, cyl(b, 'top', 0.2, 0.62, 0.5, 8), root, '#c89a52', [0, 1.8, 0]);
      break;
    case 'crossing_bridge':
      add(b, box(b, 'deck', 1.8, 0.12, 0.7), root, '#8f7a5a', [0, 0.18, 0]);
      add(b, box(b, 'railL', 1.8, 0.14, 0.06), root, '#6b5a3e', [0, 0.3, 0.32]);
      add(b, box(b, 'railR', 1.8, 0.14, 0.06), root, '#6b5a3e', [0, 0.3, -0.32]);
      break;
    case 'crossing_pass':
      add(b, box(b, 'arch', 0.3, 1.1, 1.3), root, '#6b6f76', [0.6, 0.55, 0]);
      add(b, box(b, 'arch2', 0.3, 1.1, 1.3), root, '#6b6f76', [-0.6, 0.55, 0]);
      break;
    case 'nest':
      add(b, cyl(b, 'rock', 0.8, 0.9, 1.4, 7), root, '#7a7c80', [0, 0.4, 0]);
      add(b, cyl(b, 'bowl', 0.2, 0.9, 0.6, 12), root, '#8a6a44', [0, 0.9, 0]);
      break;
    case 'refuge':
      add(b, box(b, 'rockdoor', 1.2, 1.0, 0.5), root, '#6b6f76', [0, 0.5, 0]);
      add(b, box(b, 'door', 0.4, 0.6, 0.52), root, '#2a2a2e', [0, 0.35, 0]);
      break;
    case 'quarry_cache':
      for (let i = 0; i < 5; i++) add(b, sph(b, 'boulder', 0.4 + (i % 3) * 0.12), root, '#8d8a82', [-0.5 + i * 0.25, 0.2, (i % 2) * 0.3 - 0.15]);
      break;
    case 'grove':
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        add(b, cyl(b, 'trunk', 0.4, 0.06, 0.08, 6), root, '#5a3e22', [Math.cos(a) * 0.55, 0.2, Math.sin(a) * 0.55]);
        add(b, cyl(b, 'crown', 0.8, 0, 0.4, 7), root, '#3f6f3a', [Math.cos(a) * 0.55, 0.75, Math.sin(a) * 0.55]);
      }
      break;
    case 'beacon':
    case 'relay': {
      const tall = kind === 'beacon' ? 2.1 : 1.1;
      plinth(kind === 'beacon' ? 1.4 : 1.0);
      add(b, cyl(b, 'tower', tall, kind === 'beacon' ? 0.42 : 0.3, kind === 'beacon' ? 0.62 : 0.42, 8), root, MARBLE, [0, tall / 2 + 0.1, 0]);
      add(b, cyl(b, 'brazier', 0.18, 0.62, 0.36, 10), root, BRONZE, [0, tall + 0.18, 0]);
      flame = add(b, cyl(b, 'flame', 0.5, 0, 0.4, 8), root, '#ffb347', [0, tall + 0.5, 0], { emissive: 1 });
      break;
    }
    case 'gate':
      add(b, box(b, 'pillarL', 0.4, 1.6, 0.6), root, '#6b6f76', [0, 0.8, 0.7]);
      add(b, box(b, 'pillarR', 0.4, 1.6, 0.6), root, '#6b6f76', [0, 0.8, -0.7]);
      add(b, box(b, 'lintel', 0.5, 0.3, 2.0), root, '#7a7c80', [0, 1.7, 0]);
      seal = add(b, box(b, 'seal', 0.12, 1.4, 0.9), root, '#7fd0ff', [0, 0.7, 0], { emissive: 0.8 });
      break;
    case 'camp': {
      plinth(1.4);
      for (const [x, z, r] of [
        [-0.35, -0.2, 0.3],
        [0.35, -0.15, 0.6],
        [0, 0.35, -0.4],
      ] as const)
        add(b, cyl(b, 'tent', 0.6, 0, 0.6, 4), root, '#a0784a', [x, 0.42, z], { rot: [0, r, 0] });
      add(b, cyl(b, 'fire', 0.18, 0.02, 0.22, 6), root, '#ff8a3a', [0.05, 0.2, 0], { emissive: 0.9 });
      break;
    }
    case 'event_site':
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2 + 0.4;
        add(b, box(b, 'stone', 0.22, 0.8 - i * 0.1, 0.16), root, '#8d8a82', [Math.cos(a) * 0.45, 0.4 - i * 0.05, Math.sin(a) * 0.45], { rot: [0, a, 0] });
      }
      flame = add(b, sph(b, 'glow', 0.22), root, '#9fe3ff', [0, 0.45, 0], { emissive: 1 });
      break;
    case 'relic':
      plinth(1.6);
      add(b, cyl(b, 'dais', 0.3, 0.9, 1.1, 8), root, MARBLE, [0, 0.27, 0]);
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
        add(b, cyl(b, 'column', 1.1, 0.12, 0.14, 8), root, MARBLE, [Math.cos(a) * 0.55, 0.95, Math.sin(a) * 0.55]);
      }
      flame = add(b, sph(b, 'relic', 0.3), root, '#ffd36a', [0, 0.85, 0], { emissive: 1 });
      break;
  }
  const flagPole = new TransformNode('flagPole', scene);
  flagPole.parent = root;
  flagPole.position.set(-0.6, 0, 0.6);
  return { root, flame, seal, flagPole };
}

/** A small ownership banner: square flag + colored cloth (shape and color). */
export function buildBanner(scene: Scene, mats: MaterialCache, parent: TransformNode, hex: string, shape: 'square' | 'pennant'): TransformNode {
  const node = new TransformNode('banner', scene);
  node.parent = parent;
  const pole = MeshBuilder.CreateCylinder('pole', { height: 1.2, diameter: 0.04, tessellation: 5 }, scene);
  pole.parent = node;
  pole.position.y = 0.6;
  pole.material = mats.get('#4a321c');
  pole.isPickable = false;
  const cloth =
    shape === 'square'
      ? MeshBuilder.CreatePlane('cloth', { width: 0.4, height: 0.28, sideOrientation: Mesh.DOUBLESIDE }, scene)
      : MeshBuilder.CreateDisc('cloth', { radius: 0.22, tessellation: 3, sideOrientation: Mesh.DOUBLESIDE }, scene);
  cloth.parent = node;
  cloth.position.set(0.21, 1.02, 0);
  cloth.material = mats.get(hex, { emissive: 0.25 });
  cloth.isPickable = false;
  return node;
}

export function buildHeroProxy(scene: Scene, mats: MaterialCache, accent: string, name: string): CreatureProxy {
  const p = buildCreatureProxy(scene, mats, 'rider', true, accent, name);
  buildBanner(scene, mats, p.root, accent, 'square').position.set(-0.3, 0.9, 0.2);
  p.root.scaling = new Vector3(0.9, 0.9, 0.9);
  return p;
}
