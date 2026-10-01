/**
 * Unit model manifests, the creature-ID registry and file validation.
 *
 * Babylon-free on purpose: the interface registers bundled manifests at start-up
 * and tools validate files without loading the 3D engine. Loading and playback
 * live in models.ts.
 */
/** The eight semantic states every creature presents (plus optional flight/ability clips). */
export const SEMANTIC_STATES = ['idle', 'move', 'melee', 'ranged', 'defend', 'hit', 'defeat', 'victory'] as const;
export type SemanticState = (typeof SEMANTIC_STATES)[number];
export type ClipKey = SemanticState | 'takeoff' | 'fly' | 'land' | `ability_${string}`;

/** Default source clip names (CREATURE_ANIMATION_REQUIREMENTS §2-3). */
export const DEFAULT_CLIP_NAMES: Readonly<Record<SemanticState, string>> = {
  idle: 'idle_a',
  move: 'move_walk',
  melee: 'attack_melee_a',
  ranged: 'attack_shoot',
  defend: 'guard',
  hit: 'hit_a',
  defeat: 'defeat',
  victory: 'victory',
};

export interface ClipBinding {
  readonly name: string;
  readonly loop: boolean;
  /** Normalized cue points (0..1) for presentation sync; never rules. */
  readonly impactAt?: number;
  readonly releaseAt?: number;
}

export type AssetState = 'briefed' | 'concept_approved' | 'modeled' | 'rigged' | 'animated' | 'exported' | 'integrated' | 'verified';

export interface UnitFormManifest {
  readonly assetId: string;
  readonly creatureId: string;
  readonly form: 'base' | 'upgraded';
  readonly status: AssetState;
  /** Path relative to the family manifest. */
  readonly model: string;
  readonly portrait: string | null;
  readonly rigId: string;
  /** Uniform scale applied after import (1 = authored meters). */
  readonly scale: number;
  /** Presentation-only offset in meters (centers a two-cell model); never moves the hit area. */
  readonly visualOffset: readonly [number, number, number];
  readonly sockets?: Readonly<Record<string, string>>;
  readonly clips: Readonly<Partial<Record<ClipKey, ClipBinding>>>;
  readonly provenanceId: string;
}

export interface UnitFamilyManifest {
  readonly schema: 'pantheon-realms-unit-family';
  readonly schemaVersion: 1;
  readonly familyId: string;
  readonly pantheonId: string | null;
  readonly note?: string;
  readonly forms: { readonly base?: UnitFormManifest; readonly upgraded?: UnitFormManifest };
}

export interface UnitModelEntry {
  readonly manifest: UnitFormManifest;
  /** Resolved runtime URL of the GLB (bundled; never a CDN). */
  readonly url: string;
}

// ---------------------------------------------------------------------------
// Registry (filled by the application from bundled manifests)
// ---------------------------------------------------------------------------

const registry = new Map<string, UnitModelEntry>();

export function registerUnitModels(entries: readonly UnitModelEntry[]): void {
  for (const e of entries) registry.set(e.manifest.creatureId, e);
}

export function unitModelFor(creatureId: string): UnitModelEntry | undefined {
  return registry.get(creatureId);
}

export function registeredUnitModels(): UnitModelEntry[] {
  return [...registry.values()];
}

// ---------------------------------------------------------------------------
// Validation (pure; shared by tests, tools and the runtime loader)
// ---------------------------------------------------------------------------

/** Extensions whose decoders Babylon would fetch from a CDN. The game must work offline. */
export const FORBIDDEN_EXTENSIONS = ['KHR_draco_mesh_compression', 'EXT_meshopt_compression', 'KHR_meshopt_compression', 'KHR_texture_basisu'] as const;

export interface GltfJson {
  readonly asset?: { readonly version?: string; readonly generator?: string };
  readonly extensionsUsed?: readonly string[];
  readonly extensionsRequired?: readonly string[];
  readonly animations?: readonly { readonly name?: string }[];
  readonly nodes?: readonly { readonly name?: string }[];
  readonly scenes?: readonly unknown[];
}

/** Parse the JSON chunk of a binary glTF (throws on a malformed container). */
export function readGlbJson(bytes: Uint8Array): GltfJson {
  if (bytes.byteLength < 20) throw new Error('File is too small to be a GLB');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (view.getUint32(0, true) !== 0x46546c67) throw new Error('Not a GLB (missing glTF magic)');
  if (view.getUint32(4, true) !== 2) throw new Error('Only glTF 2.0 GLB is supported');
  const chunkLength = view.getUint32(12, true);
  if (view.getUint32(16, true) !== 0x4e4f534a) throw new Error('First GLB chunk is not JSON');
  const text = new TextDecoder().decode(bytes.subarray(20, 20 + chunkLength));
  return JSON.parse(text) as GltfJson;
}

export interface ManifestRequirements {
  /** The creature can shoot (needs a ranged clip). */
  readonly ranged: boolean;
  /** The creature flies (takeoff/fly/land recommended; move remains the short ground move). */
  readonly flying: boolean;
}

/** Manifest-level checks: required semantic states, loop policies and cue ranges. */
export function validateFormManifest(m: UnitFormManifest, req: ManifestRequirements): string[] {
  const issues: string[] = [];
  const need: SemanticState[] = ['idle', 'move', 'melee', 'defend', 'hit', 'defeat', 'victory'];
  if (req.ranged) need.push('ranged');
  for (const s of need) if (!m.clips[s]) issues.push(`${m.assetId}: missing required "${s}" clip binding`);
  if (req.flying) for (const k of ['takeoff', 'fly', 'land'] as const) if (!m.clips[k]) issues.push(`${m.assetId}: flying creature should bind "${k}"`);
  if (m.clips.defeat?.loop) issues.push(`${m.assetId}: defeat must not loop`);
  for (const k of ['melee', 'ranged', 'hit', 'victory'] as const) if (m.clips[k]?.loop) issues.push(`${m.assetId}: ${k} plays once (loop must be false)`);
  if (m.clips.idle && !m.clips.idle.loop) issues.push(`${m.assetId}: idle must loop`);
  for (const [k, b] of Object.entries(m.clips)) {
    for (const cue of [b?.impactAt, b?.releaseAt]) if (cue !== undefined && (cue < 0 || cue > 1)) issues.push(`${m.assetId}: ${k} cue ${cue} outside 0..1`);
  }
  if (!(m.scale > 0)) issues.push(`${m.assetId}: scale must be positive`);
  if (!/\.glb$/i.test(m.model)) issues.push(`${m.assetId}: runtime model must be a .glb`);
  return issues;
}

/** File-level checks against the manifest: clip names, sockets, offline-safe extensions. */
export function validateGlbAgainstManifest(json: GltfJson, m: UnitFormManifest): string[] {
  const issues: string[] = [];
  if (json.asset?.version !== '2.0') issues.push(`${m.assetId}: glTF asset.version must be "2.0"`);
  const used = new Set([...(json.extensionsUsed ?? []), ...(json.extensionsRequired ?? [])]);
  for (const x of FORBIDDEN_EXTENSIONS) if (used.has(x)) issues.push(`${m.assetId}: uses ${x}, whose decoder would be fetched from a CDN — export without it (or vendor the decoder first)`);
  const clipNames = new Set((json.animations ?? []).map((a) => a.name ?? ''));
  for (const [k, b] of Object.entries(m.clips)) if (b && !clipNames.has(b.name)) issues.push(`${m.assetId}: clip "${b.name}" (${k}) is not in the GLB`);
  const nodeNames = new Set((json.nodes ?? []).map((n) => n.name ?? ''));
  for (const [k, n] of Object.entries(m.sockets ?? {})) if (!nodeNames.has(n)) issues.push(`${m.assetId}: socket "${k}" node "${n}" is not in the GLB`);
  if ((json.scenes ?? []).length === 0) issues.push(`${m.assetId}: GLB has no scene`);
  return issues;
}
