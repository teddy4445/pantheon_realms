#!/usr/bin/env node
/**
 * Build the axis/scale calibration GLB (QA-32) and its unit manifest.
 *
 *   node tools/assets/make-calibration-glb.mjs
 *
 * The model is authored directly in glTF space: meters, Y-up, right-handed,
 * front = +Z. It contains
 *   - a 1.0 m diameter footprint disc at the origin (ground anchor),
 *   - a 1.8 m reference post (human height),
 *   - a red arrow on the ground pointing to +Z (the front),
 *   - a blue marker on +X (the model's LEFT when it faces +Z; catches mirroring),
 *   - the eight semantic clips as node animations with the exact names the
 *     game expects (idle_a, move_walk, attack_melee_a, attack_shoot, guard,
 *     hit_a, defeat, victory).
 * It is a development fixture, never bound to a creature.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Document, NodeIO } from '@gltf-transform/core';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT_DIR = join(ROOT, 'assets-runtime', 'units', '_calibration', 'forward_arrow');

const doc = new Document();
doc.createBuffer('buffer');
const buffer = doc.getRoot().listBuffers()[0];
const scene = doc.createScene('calibration');

function material(name, rgb) {
  return doc.createMaterial(name).setBaseColorFactor([...rgb, 1]).setRoughnessFactor(0.8).setMetallicFactor(0);
}

/** Axis-aligned box mesh from min/max corners (24 vertices, outward normals, CCW front faces). */
function boxMesh(name, min, max, mat) {
  const [x0, y0, z0] = min;
  const [x1, y1, z1] = max;
  const faces = [
    { n: [1, 0, 0], v: [[x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1]] },
    { n: [-1, 0, 0], v: [[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]] },
    { n: [0, 1, 0], v: [[x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0]] },
    { n: [0, -1, 0], v: [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]] },
    { n: [0, 0, 1], v: [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]] },
    { n: [0, 0, -1], v: [[x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0]] },
  ];
  const pos = [];
  const nor = [];
  const idx = [];
  faces.forEach((f, i) => {
    for (const p of f.v) {
      pos.push(...p);
      nor.push(...f.n);
    }
    const b = i * 4;
    idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
  });
  return meshFrom(name, pos, nor, idx, mat);
}

/** Flat triangular prism (arrow head) pointing +Z. */
function arrowHead(name, z0, z1, halfWidth, y1, mat) {
  const pos = [
    // top
    -halfWidth, y1, z0, halfWidth, y1, z0, 0, y1, z1,
    // bottom
    halfWidth, 0, z0, -halfWidth, 0, z0, 0, 0, z1,
  ];
  const nor = [0, 1, 0, 0, 1, 0, 0, 1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0];
  // top face CCW seen from +Y: (-w,z0) -> (0,z1) -> (w,z0)
  const idx = [0, 2, 1, 3, 5, 4];
  return meshFrom(name, pos, nor, idx, mat);
}

/** Disc in the XZ plane (fan), normal +Y. */
function disc(name, radius, y, mat, segments = 32) {
  const pos = [0, y, 0];
  const nor = [0, 1, 0];
  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    pos.push(Math.cos(a) * radius, y, Math.sin(a) * radius);
    nor.push(0, 1, 0);
  }
  const idx = [];
  // CCW seen from +Y in a right-handed frame: center, next, current.
  for (let i = 1; i <= segments; i++) idx.push(0, i + 1, i);
  return meshFrom(name, pos, nor, idx, mat);
}

function meshFrom(name, pos, nor, idx, mat) {
  const position = doc.createAccessor(`${name}-pos`).setType('VEC3').setArray(new Float32Array(pos)).setBuffer(buffer);
  const normal = doc.createAccessor(`${name}-nor`).setType('VEC3').setArray(new Float32Array(nor)).setBuffer(buffer);
  const indices = doc.createAccessor(`${name}-idx`).setType('SCALAR').setArray(new Uint16Array(idx)).setBuffer(buffer);
  const prim = doc.createPrimitive().setAttribute('POSITION', position).setAttribute('NORMAL', normal).setIndices(indices).setMaterial(mat);
  return doc.createMesh(name).addPrimitive(prim);
}

const grey = material('footprint', [0.45, 0.45, 0.48]);
const white = material('reference', [0.92, 0.9, 0.85]);
const red = material('front', [0.85, 0.12, 0.1]);
const blue = material('left_marker', [0.15, 0.35, 0.9]);

const root = doc.createNode('calibration_root');
scene.addChild(root);
const footprint = doc.createNode('footprint').setMesh(disc('footprint', 0.5, 0.005, grey));
root.addChild(footprint);
// Animated rig node: everything that moves hangs under it.
const rig = doc.createNode('rig');
root.addChild(rig);
rig.addChild(doc.createNode('post').setMesh(boxMesh('post', [-0.1, 0, -0.1], [0.1, 1.8, 0.1], white)));
rig.addChild(doc.createNode('arrow_shaft').setMesh(boxMesh('arrow_shaft', [-0.05, 0.01, 0.1], [0.05, 0.06, 0.75], red)));
rig.addChild(doc.createNode('arrow_head').setMesh(arrowHead('arrow_head', 0.75, 1.05, 0.16, 0.06, red)));
rig.addChild(doc.createNode('left_marker').setMesh(boxMesh('left_marker', [0.3, 0, -0.08], [0.46, 0.16, 0.08], blue)));
// Projectile origin socket (sockets are named nodes).
const socket = doc.createNode('socket_projectile').setTranslation([0, 1.5, 0.2]);
rig.addChild(socket);

const q = (axis, angle) => {
  const s = Math.sin(angle / 2);
  return [axis[0] * s, axis[1] * s, axis[2] * s, Math.cos(angle / 2)];
};

/** One clip animating the rig node. */
function clip(name, times, path, values) {
  const anim = doc.createAnimation(name);
  const input = doc.createAccessor(`${name}-t`).setType('SCALAR').setArray(new Float32Array(times)).setBuffer(buffer);
  const type = path === 'rotation' ? 'VEC4' : 'VEC3';
  const output = doc.createAccessor(`${name}-v`).setType(type).setArray(new Float32Array(values.flat())).setBuffer(buffer);
  const sampler = doc.createAnimationSampler().setInput(input).setOutput(output).setInterpolation('LINEAR');
  const channel = doc.createAnimationChannel().setTargetNode(rig).setTargetPath(path).setSampler(sampler);
  anim.addSampler(sampler).addChannel(channel);
  return anim;
}

// Timings follow production/02 §4 art targets (seconds).
clip('idle_a', [0, 1.5, 3], 'translation', [[0, 0, 0], [0, 0.03, 0], [0, 0, 0]]);
clip('move_walk', [0, 0.25, 0.5, 0.75, 1], 'translation', [[0, 0, 0], [0, 0.08, 0], [0, 0, 0], [0, 0.08, 0], [0, 0, 0]]);
clip('attack_melee_a', [0, 0.35, 0.55, 1.0], 'translation', [[0, 0, 0], [0, 0, -0.1], [0, 0, 0.35], [0, 0, 0]]);
clip('attack_shoot', [0, 0.4, 0.55, 1.0], 'rotation', [q([1, 0, 0], 0), q([1, 0, 0], -0.25), q([1, 0, 0], 0.15), q([1, 0, 0], 0)]);
clip('guard', [0, 0.3, 1.2], 'scale', [[1, 1, 1], [1.05, 0.9, 1.05], [1.05, 0.9, 1.05]]);
clip('hit_a', [0, 0.12, 0.35], 'translation', [[0, 0, 0], [0, 0, -0.15], [0, 0, 0]]);
clip('defeat', [0, 0.4, 1.4], 'rotation', [q([1, 0, 0], 0), q([1, 0, 0], -0.4), q([1, 0, 0], -Math.PI / 2)]);
clip('victory', [0, 0.4, 0.8, 1.2, 2.0], 'translation', [[0, 0, 0], [0, 0.35, 0], [0, 0, 0], [0, 0.25, 0], [0, 0, 0]]);

doc.getRoot().setDefaultScene(scene);
doc.getRoot().getAsset().generator = 'pantheon-realms tools/assets/make-calibration-glb.mjs';

mkdirSync(OUT_DIR, { recursive: true });
const glb = await new NodeIO().writeBinary(doc);
writeFileSync(join(OUT_DIR, 'model.glb'), glb);

const clips = {
  idle: { name: 'idle_a', loop: true },
  move: { name: 'move_walk', loop: true },
  melee: { name: 'attack_melee_a', loop: false, impactAt: 0.55 },
  ranged: { name: 'attack_shoot', loop: false, releaseAt: 0.55 },
  defend: { name: 'guard', loop: true },
  hit: { name: 'hit_a', loop: false },
  defeat: { name: 'defeat', loop: false },
  victory: { name: 'victory', loop: false },
};
const manifest = {
  schema: 'pantheon-realms-unit-family',
  schemaVersion: 1,
  familyId: '_calibration',
  pantheonId: null,
  note: 'Axis/scale calibration fixture (QA-32). Not bound to any creature.',
  forms: {
    base: {
      assetId: 'unit._calibration.forward_arrow',
      creatureId: '__calibration__',
      form: 'base',
      status: 'exported',
      model: 'model.glb',
      portrait: null,
      rigId: 'rig.calibration.v1',
      scale: 1,
      visualOffset: [0, 0, 0],
      sockets: { projectile: 'socket_projectile' },
      clips,
      provenanceId: 'provenance.calibration.generated',
    },
  },
};
writeFileSync(join(OUT_DIR, 'family.manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Wrote ${join(OUT_DIR, 'model.glb')} (${glb.byteLength} bytes) and family.manifest.json`);
