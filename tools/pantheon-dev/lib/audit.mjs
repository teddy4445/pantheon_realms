/** Project-specific, read-only checks. No network, shell, writes, or code evaluation. */
import fs from 'node:fs/promises';
import path from 'node:path';

export const READ_ROOTS = ['packages/content', 'assets-runtime', 'tools/pantheon-dev/fixtures'];
const MAX_JSON = 4 * 1024 * 1024;
const MAX_ASSET = 64 * 1024 * 1024;
const idOK = x => typeof x === 'string' && /^[a-z][a-z0-9_.-]{0,95}$/.test(x);
const object = x => x !== null && typeof x === 'object' && !Array.isArray(x);
const inDir = (child, parent) => child === parent || child.startsWith(parent + path.sep);

export async function projectFile(root, relative, extensions, maxBytes = MAX_JSON) {
  if (typeof relative !== 'string' || !relative || relative.length > 500 ||
      /[\\\x00-\x1f]/.test(relative) || path.isAbsolute(relative) || relative.includes(':') ||
      relative.split('/').some(p => !p || p === '.' || p === '..' || p.startsWith('.'))) {
    throw new Error('Use a non-hidden project-relative POSIX path without traversal or a URL.');
  }
  if (!READ_ROOTS.some(p => relative.startsWith(p + '/'))) throw new Error('Path is outside the approved content/asset/fixture roots.');
  if (!extensions.includes(path.extname(relative).toLowerCase())) throw new Error('Unsupported file extension.');
  const base = await fs.realpath(root);
  let current = base;
  for (const part of relative.split('/')) {
    current = path.join(current, part);
    const stat = await fs.lstat(current);
    if (stat.isSymbolicLink()) throw new Error('Symbolic links are not read by this audit tool.');
  }
  const real = await fs.realpath(current);
  if (!inDir(real, base)) throw new Error('Resolved path escapes the project.');
  const stat = await fs.stat(real);
  if (!stat.isFile() || stat.size > maxBytes) throw new Error('Not a regular file or file exceeds the audit size limit.');
  return real;
}

export function validateCreaturePairs(data) {
  const errors = [];
  if (!object(data) || !Array.isArray(data.families) || !Array.isArray(data.creatures)) {
    return {valid:false, errors:['Expected {families: [...], creatures: [...]}.'], scope:'Pair topology, not balance or runtime readiness.'};
  }
  if (data.families.length === 0 || data.families.length > 1000 || data.creatures.length > 2000) {
    return {valid:false, errors:['Catalog must contain 1-1000 families and at most 2000 forms.']};
  }
  const creatures = new Map(), families = new Map(), claimed = new Map();
  for (const c of data.creatures) {
    if (!object(c) || !idOK(c.id)) { errors.push('Invalid creature record or ID.'); continue; }
    if (creatures.has(c.id)) errors.push(`Duplicate creature ID: ${c.id}`);
    creatures.set(c.id,c);
  }
  for (const f of data.families) {
    if (!object(f) || !idOK(f.familyId)) {errors.push('Invalid family record or ID.');continue;}
    if (families.has(f.familyId)) errors.push(`Duplicate family ID: ${f.familyId}`);
    families.set(f.familyId,f);
    if (!idOK(f.baseId) || !idOK(f.upgradeId) || f.baseId === f.upgradeId) {
      errors.push(`${f.familyId}: distinct baseId and upgradeId are required.`);continue;
    }
    if (!Number.isInteger(f.growthPerWeek) || f.growthPerWeek < 0) errors.push(`${f.familyId}: invalid family growth.`);
    for (const id of [f.baseId,f.upgradeId]) {
      if (claimed.has(id)) errors.push(`${id}: claimed by multiple families.`);
      claimed.set(id,f.familyId);
    }
    const base = creatures.get(f.baseId), up = creatures.get(f.upgradeId);
    if (!base || !up) {errors.push(`${f.familyId}: missing base or upgraded record.`);continue;}
    if (base.form !== 'base' || up.form !== 'upgraded') errors.push(`${f.familyId}: incorrect form tags.`);
    if (base.upgradeId !== up.id || up.baseId !== base.id) errors.push(`${f.familyId}: pair links must be reciprocal.`);
    if (up.upgradeId !== undefined && up.upgradeId !== null) errors.push(`${f.familyId}: upgrade has an outgoing promotion.`);
    if (base.baseId !== undefined && base.baseId !== null) errors.push(`${f.familyId}: base has an incoming baseId.`);
    for (const c of [base,up]) {
      if (c.familyId !== f.familyId) errors.push(`${c.id}: incorrect familyId.`);
      if (!idOK(c.factionId) || !Number.isInteger(c.tier) || c.tier < 1 || c.tier > 99) errors.push(`${c.id}: invalid faction/tier.`);
      if (c.baseGrowth !== f.growthPerWeek) errors.push(`${c.id}: growth must match its single shared family pool.`);
      if (![1,2].includes(c.stats?.footprintHexes)) errors.push(`${c.id}: expected a one- or two-hex footprint.`);
    }
    for (const key of ['factionId','tier','baseGrowth']) if (base[key] !== up[key]) errors.push(`${f.familyId}: ${key} differs across the pair.`);
    if (base.stats?.footprintHexes !== up.stats?.footprintHexes) errors.push(`${f.familyId}: footprint differs across the pair.`);
    const members=data.creatures.filter(c=>c?.familyId===f.familyId);
    if (members.length !== 2 || members.some(c=>c.id!==f.baseId && c.id!==f.upgradeId)) errors.push(`${f.familyId}: exactly two gameplay forms are required.`);
  }
  for (const c of creatures.values()) if (!families.has(c.familyId) || !claimed.has(c.id)) errors.push(`${c.id}: unpaired creature.`);
  return {valid:errors.length===0, familyCount:data.families.length, creatureCount:data.creatures.length,
    errors:errors.slice(0,100), errorsTruncated:errors.length>100,
    scope:'Pair topology and shared identity only; not balance, animation quality, or complete game-schema validation.'};
}

export async function auditCatalog(root,relative) {
  const file=await projectFile(root,relative,['.json']);
  const data=JSON.parse(await fs.readFile(file,'utf8'));
  return {file:relative,...validateCreaturePairs(data)};
}

const SPRITE_SCHEMA = 'pantheon-realms-sprites-1';
const SPRITE_SECTIONS = ['creatures', 'heroes', 'sites', 'decor', 'obstacles', 'siege', 'projectiles', 'effects'];
const SPRITE_STATUSES = ['placeholder', 'final'];
export const DEFAULT_SPRITE_MANIFEST = 'assets-runtime/sprites/manifest.json';

/** Collect every `file` reference in a manifest entry (bounded depth). */
function spriteFiles(value, out, errors, where, depth = 0) {
  if (depth > 6 || value === null || typeof value !== 'object') return;
  if (Array.isArray(value)) { for (const x of value) spriteFiles(x, out, errors, where, depth + 1); return; }
  for (const [key, x] of Object.entries(value)) {
    if (key === 'file') { if (typeof x === 'string' && x) out.add(x); else errors.push(`${where}: file must be a non-empty string.`); }
    else spriteFiles(x, out, errors, where, depth + 1);
  }
}

/** Read-only bookkeeping check of the 2D sprite manifest: counts by section/status and referenced files missing locally. */
export async function inspectSpriteManifest(root, relative = DEFAULT_SPRITE_MANIFEST) {
  const file = await projectFile(root, relative, ['.json']);
  const doc = JSON.parse(await fs.readFile(file, 'utf8'));
  if (!object(doc) || doc.schema !== SPRITE_SCHEMA) throw new Error(`Expected a ${SPRITE_SCHEMA} sprite manifest.`);
  const sections = {}, byStatus = {}, errors = [], files = new Set();
  let entryCount = 0;
  for (const name of SPRITE_SECTIONS) {
    const section = doc[name] ?? {};
    if (!object(section)) { errors.push(`${name}: section must be an object keyed by sprite ID.`); continue; }
    const counts = {};
    for (const [id, entry] of Object.entries(section)) {
      if (++entryCount > 5000) throw new Error('Sprite manifest exceeds 5000 entries.');
      const status = object(entry) && SPRITE_STATUSES.includes(entry.status) ? entry.status : 'invalid';
      if (status === 'invalid') errors.push(`${name}.${id}: status must be placeholder or final.`);
      counts[status] = (counts[status] ?? 0) + 1;
      byStatus[status] = (byStatus[status] ?? 0) + 1;
      spriteFiles(entry, files, errors, `${name}.${id}`);
      if (files.size > 20000) throw new Error('Sprite manifest references more than 20000 files.');
    }
    sections[name] = counts;
  }
  const missingFiles = [];
  for (const ref of [...files].sort()) {
    // Runtime paths are relative to the application root, which maps to assets-runtime/.
    try { await projectFile(root, 'assets-runtime/' + ref, ['.webp', '.png'], MAX_ASSET); } catch { missingFiles.push(ref); }
  }
  return {file:relative, schema:doc.schema, entryCount, sections, byStatus, referencedFiles:files.size,
    missingFileCount:missingFiles.length, missingFiles:missingFiles.slice(0,100),
    errors:errors.slice(0,100), errorsTruncated:errors.length>100,
    valid:errors.length===0 && missingFiles.length===0,
    scope:'Manifest bookkeeping only: entry status and local file presence (missing, unsafe or unsupported references are listed as missing). Does not check frame grids, anchors, transparency or how an animation reads; use npm run sprites:import and review in the viewer/battle.'};
}

export async function auditManifest(root,relative) {
  const file=await projectFile(root,relative,['.json']);
  const doc=JSON.parse(await fs.readFile(file,'utf8'));
  if (!object(doc) || !Array.isArray(doc.assets) || !doc.assets.length || doc.assets.length>2000) throw new Error('Expected 1-2000 records in {assets:[{id,path}]} .');
  const errors=[], seen=new Set();
  const extensions=['.png','.jpg','.jpeg','.webp','.ogg','.mp3','.wav','.woff2','.js','.mjs','.json'];
  for (const a of doc.assets) {
    if (!object(a) || !idOK(a.id) || seen.has(a.id)) {errors.push('Invalid or duplicate asset ID.');continue;}
    seen.add(a.id);
    if (typeof a.path!=='string' || !a.path.startsWith('assets-runtime/')) {errors.push(`${a.id}: asset must have a project-local assets-runtime path.`);continue;}
    try {await projectFile(root,a.path,extensions,MAX_ASSET);} catch {errors.push(`${a.id}: missing, unsafe, oversized, or unsupported asset path.`);}
  }
  return {valid:errors.length===0,assetCount:doc.assets.length,errors:errors.slice(0,100),errorsTruncated:errors.length>100,
    scope:'Declared local references only; not proof of offline launch. Audit dynamic loader URLs and test a clean installed game with networking disabled.'};
}

export async function projectHealth(root) {
  const checks={};
  for (const rel of ['CLAUDE.md','CLAUDE_TOOLING.md','ARCHITECTURE.md','ASSET_PIPELINE.md','apps/client','apps/desktop','packages/rules','packages/ai','packages/presentation','assets-runtime','assets-runtime/sprites/manifest.json']) {
    try {const s=await fs.lstat(path.join(root,rel));checks[rel]=s.isSymbolicLink()?'symlink-not-inspected':s.isDirectory()?'directory':'file';}
    catch {checks[rel]='absent';}
  }
  return {node:process.version,checks,scope:'Presence report only. Missing game folders are expected before implementation; this is not a build or security audit.'};
}
