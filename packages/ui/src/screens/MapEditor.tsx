/**
 * S22 Map Editor (owner request 2026-10-05): paint terrain and roads, place
 * towns, mines, treasures, shrines, camps, portals, monsters and the relic,
 * choose the empires and the victory goal, check the map, save it to the map
 * library or to a file, and play it.
 *
 * The map is a plain document (`@pr/mapgen` custom.ts); playing compiles it to
 * an ordinary generated mission, so a custom game saves and loads like a random
 * map. The editor never mutates a match: it only edits its own document.
 * Drawing uses a 2D canvas with the game's own ground textures, site art and
 * hex transform (`@pr/presentation/core` hexmath).
 */
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent, type WheelEvent as ReactWheelEvent } from 'react';
import {
  compileCustomMap,
  customInRect,
  customRowOffset,
  newCustomMap,
  parseCustomMap,
  serializeCustomMap,
  terrainAt,
  validateCustomMap,
  CUSTOM_KEY_COLORS,
  CUSTOM_MAP_SIZES,
  CUSTOM_MAX_EMPIRES,
  CUSTOM_SITE_KINDS,
  CUSTOM_SYMMETRIES,
  SKIRMISH_MAP_TYPES,
  SKIRMISH_PLAYER_COLORS,
  createRandomSkirmish,
  customMapFromGenerated,
  skirmishSizeAllows,
  skirmishTypeAllows,
  symmetricCells,
  symmetricEdges,
  type CustomSymmetry,
  type SkirmishMapSize,
  type SkirmishMapType,
  type CustomMapDocument,
  type CustomReward,
  type CustomMapSize,
  type CustomSite,
  type CustomSiteKind,
} from '@pr/session';
import { KEY_COLOR_LABEL, TERRAIN_CODES, axialNeighbors, hexKey, type ContentCatalog, type HexCoord, type KeyColor, type Terrain } from '@pr/rules';
import { axialPoint, hexCorners, pointAxial, siteSprite, spriteUrl, terrainArt } from '@pr/presentation/core';
import { useStore } from '../app/context';
import { Button, Modal, Panel, SectionTitle, Segmented, Tabs, TextInput, Toggle } from '../components/kit';
import { ScreenHeader } from '../components/game';
import { resolveAsset } from '../assets/manifest';
import { DifficultyPicker } from './Setup';

const R = 22; // hex radius in world pixels at zoom 1
const GROUNDS: readonly Exclude<Terrain, 'void'>[] = ['plains', 'forest', 'rough', 'marsh', 'mountain', 'water'];
const GROUND_LABEL: Record<Exclude<Terrain, 'void'>, string> = { plains: 'Plains', forest: 'Forest', rough: 'Rough', marsh: 'Marsh', mountain: 'Mountain', water: 'Water' };
const FALLBACK_COLOR: Record<Terrain, string> = { plains: '#767b2d', forest: '#564d25', rough: '#8d704b', marsh: '#585934', mountain: '#827462', water: '#116594', void: '#000000' };
const BIOMES = ['temperate', 'autumn', 'coast', 'desert', 'fjord', 'high_pass', 'jungle', 'moor', 'storm_plateau', 'tundra'] as const;
const BIOME_LABEL: Record<(typeof BIOMES)[number], string> = { temperate: 'Temperate', autumn: 'Autumn', coast: 'Coast', desert: 'Desert', fjord: 'Fjord', high_pass: 'High pass', jungle: 'Jungle', moor: 'Moor', storm_plateau: 'Storm plateau', tundra: 'Tundra' };

type Tool = { kind: 'select' } | { kind: 'terrain'; terrain: Exclude<Terrain, 'void'> } | { kind: 'road'; erase: boolean } | { kind: 'erase' } | { kind: 'place'; site: CustomSiteKind };

interface View {
  zoom: number;
  x: number; // world point at the canvas centre
  y: number;
}

const SPRITE_KIND: Partial<Record<CustomSiteKind, string>> = {
  sawmill: 'sawmill',
  quarry: 'quarry',
  gold_mine: 'gold_mine',
  crystal_deposit: 'crystal_deposit',
  treasure_chest: 'treasure_chest',
  learning_stone: 'learning_stone',
  spell_shrine: 'spell_shrine',
  skill_trainer: 'skill_trainer',
  windmill: 'windmill',
  creature_camp: 'camp',
  portal: 'portal',
  relic: 'relic',
  quest_hut: 'quest_hut',
  key_tent: 'key_tent',
  key_gate: 'key_gate',
  prison: 'prison',
  watchtower: 'watchtower',
};

function patronsOf(catalog: ContentCatalog, pantheonId: string): string[] {
  return (catalog.pantheons[pantheonId]?.godIds ?? []).filter((g) => catalog.gods[g]?.role === 'patron' && catalog.gods[g]?.implementationStatus === 'implemented');
}

/** Rectangle column/row ↔ stored axial cell. */
function rectSize(doc: CustomMapDocument): { cols: number; rows: number } {
  return { cols: doc.width - customRowOffset(doc.height), rows: doc.height };
}

function cellsInRect(doc: CustomMapDocument): HexCoord[] {
  const { cols, rows } = rectSize(doc);
  const out: HexCoord[] = [];
  for (let r = 0; r < rows; r++) for (let q = 0; q < doc.width; q++) if (customInRect(cols, rows, { q, r })) out.push({ q, r });
  return out;
}

function brushCells(doc: CustomMapDocument, c: HexCoord, size: number): HexCoord[] {
  const { cols, rows } = rectSize(doc);
  const out: HexCoord[] = [];
  const n = size - 1;
  for (let dq = -n; dq <= n; dq++)
    for (let dr = Math.max(-n, -dq - n); dr <= Math.min(n, -dq + n); dr++) {
      const x = { q: c.q + dq, r: c.r + dr };
      if (customInRect(cols, rows, x)) out.push(x);
    }
  return out;
}

function paintCells(doc: CustomMapDocument, cells: readonly HexCoord[], terrain: Exclude<Terrain, 'void'>): CustomMapDocument {
  const t = doc.terrain.split('');
  let changed = false;
  for (const c of cells) {
    const i = c.r * doc.width + c.q;
    if (t[i] !== TERRAIN_CODES[terrain] && t[i] !== TERRAIN_CODES.void) {
      t[i] = TERRAIN_CODES[terrain];
      changed = true;
    }
  }
  return changed ? { ...doc, terrain: t.join('') } : doc;
}

function newId(doc: CustomMapDocument, kind: string): string {
  let i = doc.sites.length + 1;
  while (doc.sites.some((s) => s.id === `${kind}_${i}`)) i++;
  return `${kind}_${i}`;
}

function slug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'map';
}

/** Images the canvas draws, loaded once (ground textures and site art). */
const imageCache = new Map<string, HTMLImageElement>();
function image(url: string | null | undefined, onLoad: () => void): HTMLImageElement | null {
  if (!url) return null;
  let img = imageCache.get(url);
  if (!img) {
    img = new Image();
    img.src = url;
    img.onload = onLoad;
    imageCache.set(url, img);
  }
  return img.complete && img.naturalWidth > 0 ? img : null;
}

export function MapEditorScreen() {
  const store = useStore();
  const catalog = store.catalog;
  const [doc, setDocState] = useState<CustomMapDocument>(() => newCustomMap(catalog, 'small'));
  const [libraryId, setLibraryId] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [tool, setTool] = useState<Tool>({ kind: 'terrain', terrain: 'forest' });
  const [brush, setBrush] = useState(1);
  // Symmetry brush (2026-10-07): ground and roads are painted in mirrored or turned copies too.
  const [symmetry, setSymmetry] = useState<CustomSymmetry>('none');
  const [townOwner, setTownOwner] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [pendingPortal, setPendingPortal] = useState<string | null>(null);
  const [tab, setTab] = useState<'map' | 'empires' | 'site' | 'check'>('map');
  const [dialog, setDialog] = useState<null | 'new' | 'generate' | 'open' | 'play' | 'leave'>(null);
  const [hover, setHover] = useState<HexCoord | null>(null);
  const undo = useRef<CustomMapDocument[]>([]);
  const redo = useRef<CustomMapDocument[]>([]);

  const setDoc = useCallback((next: CustomMapDocument | ((d: CustomMapDocument) => CustomMapDocument), record = true) => {
    setDocState((prev) => {
      const v = typeof next === 'function' ? next(prev) : next;
      if (v === prev) return prev;
      if (record) {
        undo.current.push(prev);
        if (undo.current.length > 80) undo.current.shift();
        redo.current = [];
      }
      return v;
    });
    setDirty(true);
  }, []);

  const issues = useMemo(() => validateCustomMap(catalog, doc), [catalog, doc]);
  const errors = issues.filter((i) => i.severity === 'error');
  const site = doc.sites.find((s) => s.id === selected) ?? null;

  const doUndo = useCallback(() => {
    const prev = undo.current.pop();
    if (!prev) return;
    setDocState((cur) => {
      redo.current.push(cur);
      return prev;
    });
    setDirty(true);
  }, []);
  const doRedo = useCallback(() => {
    const next = redo.current.pop();
    if (!next) return;
    setDocState((cur) => {
      undo.current.push(cur);
      return next;
    });
    setDirty(true);
  }, []);

  // --- Editing ------------------------------------------------------------------
  const placeAt = useCallback(
    (c: HexCoord, kind: CustomSiteKind) => {
      const t = terrainAt(doc, c);
      if (t === 'water' || t === 'mountain' || t === 'void') {
        store.toast('Sites stand on open ground (not water or mountains)', 'error');
        return;
      }
      const there = doc.sites.find((s) => s.q === c.q && s.r === c.r);
      if (there) {
        setSelected(there.id);
        setTab('site');
        return;
      }
      const id = kind === 'relic' ? 'relic' : newId(doc, kind);
      if (kind === 'relic' && doc.sites.some((s) => s.kind === 'relic')) {
        store.toast('The map already has the Shrine of the First Flame', 'error');
        return;
      }
      let s: CustomSite = { id, kind, q: c.q, r: c.r };
      // -1: an unowned town (2026-10-07), its pantheon the nearest empire's unless set in the site panel.
      const owner = townOwner < 0 ? -1 : Math.min(townOwner, doc.players.length - 1);
      if (kind === 'town' && owner >= 0) s = { ...s, owner };
      if (kind === 'monster') s = { ...s, guard: { creatureId: defaultCreature(catalog, 3), count: 12 } };
      if (kind === 'creature_camp') s = { ...s, creatureId: defaultCreature(catalog, 2) };
      if (kind === 'gold_mine' || kind === 'relic') s = { ...s, guard: { creatureId: defaultCreature(catalog, kind === 'relic' ? 5 : 3), count: kind === 'relic' ? 10 : 8 } };
      if (kind === 'portal' && pendingPortal) s = { ...s, twinId: pendingPortal };
      if (kind === 'key_tent' || kind === 'key_gate') s = { ...s, color: 'azure' };
      if (kind === 'prison') s = { ...s, level: 5 };
      if (kind === 'quest_hut') s = { ...s, quest: { type: 'deliver', wood: 5, stone: 5 }, reward: { gold: 1500 } };
      if (kind === 'artifact') s = { ...s, reward: { artifactRarity: 'minor' } };
      if (kind === 'watchtower') s = { ...s, radius: 9 };
      setDoc((d) => {
        let sites = d.sites;
        if (kind === 'town' && owner >= 0) sites = sites.filter((x) => !(x.kind === 'town' && x.owner === owner)); // one town per empire: moving it
        if (kind === 'portal' && pendingPortal) sites = sites.map((x) => (x.id === pendingPortal ? { ...x, twinId: id } : x));
        return { ...d, sites: [...sites, s] };
      });
      if (kind === 'portal') setPendingPortal(pendingPortal ? null : id);
      setSelected(id);
    },
    [catalog, doc, pendingPortal, setDoc, store, townOwner],
  );

  const removeSite = useCallback(
    (id: string) => {
      setDoc((d) => {
        const s = d.sites.find((x) => x.id === id);
        const twin = s?.kind === 'portal' ? s.twinId : undefined;
        return { ...d, sites: d.sites.filter((x) => x.id !== id && x.id !== twin) };
      });
      if (pendingPortal === id) setPendingPortal(null);
      setSelected(null);
    },
    [pendingPortal, setDoc],
  );

  const updateSite = useCallback((id: string, patch: Partial<CustomSite>) => setDoc((d) => ({ ...d, sites: d.sites.map((s) => (s.id === id ? { ...s, ...patch } : s)) })), [setDoc]);

  // Keyboard: undo/redo, delete; Escape closes a dialog, cancels a half-placed portal pair or asks to leave.
  const leaveRef = useRef<() => void>(() => undefined);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (store.overlays.length > 0) return; // a confirmation over the editor closes first (the app shell does it)
        e.preventDefault();
        e.stopPropagation();
        if (dialog) setDialog(null);
        else if (pendingPortal) setPendingPortal(null);
        else leaveRef.current();
        return;
      }
      const typing = (e.target as HTMLElement | null)?.closest('input, textarea, select');
      if (typing) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) doRedo();
        else doUndo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        doRedo();
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && selected) {
        e.preventDefault();
        removeSite(selected);
      }
    };
    // Capture phase: the editor's own dialogs take Escape before the app shell sees it.
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [dialog, doRedo, doUndo, pendingPortal, removeSite, selected, store]);

  // --- Library and files ------------------------------------------------------------
  const saveToLibrary = async () => {
    const id = libraryId ?? `${slug(doc.name)}-${Date.now().toString(36)}`;
    try {
      await store.platform.maps.write(id, serializeCustomMap(doc));
      setLibraryId(id);
      setDirty(false);
      store.toast(`Saved “${doc.name}”`, 'success');
    } catch (e) {
      store.toast(`Could not save the map: ${e instanceof Error ? e.message : String(e)}`, 'error');
    }
  };
  const exportFile = async () => {
    const ok = await store.platform.maps.exportFile(serializeCustomMap(doc), doc.name);
    store.toast(ok ? 'Map file saved' : 'Export cancelled');
  };
  const load = (text: string | null, id: string | null) => {
    if (text === null) return;
    const r = parseCustomMap(text);
    if (!r.ok) {
      store.toast(r.error, 'error');
      return;
    }
    undo.current = [];
    redo.current = [];
    setDocState(r.doc);
    setLibraryId(id);
    setDirty(false);
    setSelected(null);
    setPendingPortal(null);
    setTownOwner(0);
    setDialog(null);
    store.toast(`Opened “${r.doc.name}”`, 'success');
  };

  const leave = () => {
    if (dirty) setDialog('leave');
    else store.back();
  };
  leaveRef.current = leave;

  return (
    <div className="screen map-editor" data-testid="map-editor">
      <ScreenHeader title="Map Editor" subtitle={`${doc.name}${dirty ? ' · unsaved' : ''}`} onBack={leave} />
      <div className="map-editor__bar">
        <Button size="small" icon="map" onClick={() => setDialog('new')} data-testid="editor-new">
          New
        </Button>
        <Button size="small" icon="auto" onClick={() => setDialog('generate')} data-testid="editor-generate" title="Generate a random map, then edit it">
          Generate
        </Button>
        <Button size="small" icon="load" onClick={() => setDialog('open')} data-testid="editor-open">
          Open
        </Button>
        <Button size="small" icon="save" onClick={() => void saveToLibrary()} data-testid="editor-save">
          Save
        </Button>
        <Button size="small" onClick={() => void exportFile()} data-testid="editor-export">
          Export file
        </Button>
        <span className="map-editor__sep" />
        <Button size="small" onClick={doUndo} disabled={undo.current.length === 0} title="Undo (Ctrl+Z)" data-testid="editor-undo">
          Undo
        </Button>
        <Button size="small" onClick={doRedo} disabled={redo.current.length === 0} title="Redo (Ctrl+Y)" data-testid="editor-redo">
          Redo
        </Button>
        <span className="map-editor__spacer" />
        <span className={`small ${errors.length ? 'map-editor__bad' : 'dim'}`} data-testid="editor-status">
          {errors.length ? `${errors.length} problem${errors.length > 1 ? 's' : ''} to fix before playing` : 'Ready to play'}
        </span>
        <Button variant="primary" size="small" icon="play" disabled={errors.length > 0} disabledReason={errors[0]?.text} onClick={() => setDialog('play')} data-testid="editor-play">
          Play
        </Button>
      </div>
      <div className="map-editor__body">
        <ToolPalette catalog={catalog} doc={doc} tool={tool} setTool={(t) => { setTool(t); if (t.kind !== 'place' || t.site !== 'portal') setPendingPortal(null); }} brush={brush} setBrush={setBrush} symmetry={symmetry} setSymmetry={setSymmetry} townOwner={townOwner} setTownOwner={setTownOwner} pendingPortal={pendingPortal} />
        <EditorCanvas
          catalog={catalog}
          doc={doc}
          tool={tool}
          brush={brush}
          symmetry={symmetry}
          selected={selected}
          hover={hover}
          setHover={setHover}
          onPaint={(painted, first) => {
            if (tool.kind !== 'terrain') return;
            const blocked = new Set(doc.sites.map((s) => hexKey({ q: s.q, r: s.r })));
            const t = tool.terrain;
            const seen = new Set<string>();
            const cells = painted.flatMap((c) => symmetricCells(doc, c, symmetry)).filter((c) => !seen.has(hexKey(c)) && !!seen.add(hexKey(c)));
            const ok = t === 'water' || t === 'mountain' ? cells.filter((c) => !blocked.has(hexKey(c))) : cells;
            setDoc((d) => paintCells(d, ok, t), first);
          }}
          onRoad={(a, b, first) => {
            if (tool.kind !== 'road') return;
            const keys = symmetricEdges(doc, a, b, symmetry);
            setDoc((d) => {
              const has = new Set(d.roads);
              const change = keys.filter((k) => (tool.erase ? has.has(k) : !has.has(k)));
              if (change.length === 0) return d;
              return { ...d, roads: tool.erase ? d.roads.filter((x) => !change.includes(x)) : [...d.roads, ...change] };
            }, first);
          }}
          onClickCell={(c) => {
            const there = doc.sites.find((s) => s.q === c.q && s.r === c.r);
            if (tool.kind === 'place') placeAt(c, tool.site);
            else if (tool.kind === 'erase') {
              if (there) removeSite(there.id);
            } else if (tool.kind === 'select') {
              setSelected(there?.id ?? null);
              if (there) setTab('site');
            }
          }}
          onMoveSite={(id, c, first) => {
            const t = terrainAt(doc, c);
            if (t === 'water' || t === 'mountain' || t === 'void') return;
            if (doc.sites.some((s) => s.id !== id && s.q === c.q && s.r === c.r)) return;
            setDoc((d) => ({ ...d, sites: d.sites.map((s) => (s.id === id ? { ...s, q: c.q, r: c.r } : s)) }), first);
          }}
          onSelect={(id) => {
            setSelected(id);
            if (id) setTab('site');
          }}
        />
        <Panel className="map-editor__side" bodyClassName="map-editor__side-body">
          <Tabs
            label="Editor panels"
            value={tab}
            onChange={setTab}
            tabs={[
              { id: 'map', label: 'Map' },
              { id: 'empires', label: 'Empires' },
              { id: 'site', label: 'Site' },
              { id: 'check', label: 'Check', badge: errors.length ? <span className="map-editor__count">{errors.length}</span> : undefined },
            ]}
          />
          <div className="map-editor__tab scroll">
            {tab === 'map' ? <MapPanel doc={doc} setDoc={setDoc} /> : null}
            {tab === 'empires' ? <EmpiresPanel catalog={catalog} doc={doc} setDoc={setDoc} /> : null}
            {tab === 'site' ? <SitePanel catalog={catalog} doc={doc} site={site} update={updateSite} remove={removeSite} /> : null}
            {tab === 'check' ? (
              <CheckPanel
                issues={issues}
                onPick={(id) => {
                  setSelected(id);
                  setTab('site');
                }}
              />
            ) : null}
          </div>
        </Panel>
      </div>
      {dialog === 'new' ? (
        <NewMapDialog
          onClose={() => setDialog(null)}
          onCreate={(size) => {
            undo.current = [];
            redo.current = [];
            setDocState(newCustomMap(catalog, size));
            setLibraryId(null);
            setDirty(false);
            setSelected(null);
            setPendingPortal(null);
            setDialog(null);
          }}
        />
      ) : null}
      {dialog === 'generate' ? (
        <GenerateMapDialog
          catalog={catalog}
          players={doc.players.map((p) => p.pantheonId)}
          onClose={() => setDialog(null)}
          onGenerate={(next, leftOut) => {
            undo.current = [];
            redo.current = [];
            setDocState(next);
            setLibraryId(null);
            setDirty(true);
            setSelected(null);
            setPendingPortal(null);
            setTownOwner(0);
            setDialog(null);
            store.toast(leftOut.length ? `Generated. Left out (the editor has no such site): ${leftOut.join(', ')}` : 'Generated — edit it as you like', 'success');
          }}
        />
      ) : null}
      {dialog === 'open' ? <OpenMapDialog onClose={() => setDialog(null)} onLoad={load} /> : null}
      {dialog === 'play' ? <PlayDialog catalog={catalog} doc={doc} onClose={() => setDialog(null)} /> : null}
      {dialog === 'leave' ? (
        <Modal
          title="Leave the editor?"
          onClose={() => setDialog(null)}
          testId="editor-leave"
          footer={
            <>
              <Button onClick={() => setDialog(null)}>Keep editing</Button>
              <Button variant="danger" onClick={() => store.back()} data-testid="editor-leave-confirm">
                Leave without saving
              </Button>
            </>
          }
        >
          <p>This map has changes that are not saved to the map library.</p>
        </Modal>
      ) : null}
    </div>
  );
}

/** A neutral creature of the tier (no pantheon) for new guards and camps; any creature of the tier otherwise. */
function defaultCreature(catalog: ContentCatalog, tier: number): string {
  const ofTier = Object.values(catalog.creatures)
    .filter((c) => c.tier === tier)
    .sort((a, b) => (a.id < b.id ? -1 : 1));
  return (ofTier.find((c) => !c.pantheonId) ?? ofTier[0])?.id ?? Object.keys(catalog.creatures)[0]!;
}

// ---------------------------------------------------------------------------
// Tools
// ---------------------------------------------------------------------------

function ToolPalette({
  catalog,
  doc,
  tool,
  setTool,
  brush,
  setBrush,
  symmetry,
  setSymmetry,
  townOwner,
  setTownOwner,
  pendingPortal,
}: {
  catalog: ContentCatalog;
  doc: CustomMapDocument;
  tool: Tool;
  setTool: (t: Tool) => void;
  brush: number;
  setBrush: (n: number) => void;
  symmetry: CustomSymmetry;
  setSymmetry: (s: CustomSymmetry) => void;
  townOwner: number;
  setTownOwner: (n: number) => void;
  pendingPortal: string | null;
}) {
  const is = (t: Tool) => JSON.stringify(t) === JSON.stringify(tool);
  return (
    <Panel className="map-editor__tools" bodyClassName="map-editor__tools-body scroll">
      <SectionTitle>Tools</SectionTitle>
      <div className="map-editor__grid">
        <button type="button" className={`editor-tool ${is({ kind: 'select' }) ? 'is-selected' : ''}`} onClick={() => setTool({ kind: 'select' })} data-testid="tool-select" title="Select and move sites">
          Select
        </button>
        <button type="button" className={`editor-tool ${is({ kind: 'erase' }) ? 'is-selected' : ''}`} onClick={() => setTool({ kind: 'erase' })} data-testid="tool-erase" title="Remove a site">
          Erase site
        </button>
      </div>
      <SectionTitle>Ground</SectionTitle>
      <div className="map-editor__grid">
        {GROUNDS.map((g) => (
          <button
            key={g}
            type="button"
            className={`editor-tool editor-tool--ground ${tool.kind === 'terrain' && tool.terrain === g ? 'is-selected' : ''}`}
            onClick={() => setTool({ kind: 'terrain', terrain: g })}
            data-testid={`tool-ground-${g}`}
          >
            <span className="editor-swatch" style={{ background: terrainArt(doc.biome ?? 'temperate', g)?.average ?? FALLBACK_COLOR[g] }} />
            {GROUND_LABEL[g]}
          </button>
        ))}
      </div>
      <div className="row gap small">
        <span className="dim">Brush</span>
        <Segmented label="Brush size" value={String(brush) as '1' | '2' | '3'} options={(['1', '2', '3'] as const).map((id) => ({ id, label: id }))} onChange={(v) => setBrush(Number(v))} testId="brush" />
      </div>
      <div className="map-editor__symmetry small">
        <span className="dim">Symmetry</span>
        <Segmented label="Symmetry brush" value={symmetry} options={CUSTOM_SYMMETRIES.map((x) => ({ id: x.id, label: x.label }))} onChange={(v) => setSymmetry(v)} testId="symmetry" />
        <span className="faint">{CUSTOM_SYMMETRIES.find((x) => x.id === symmetry)?.summary} Ground and roads.</span>
      </div>
      <SectionTitle>Roads</SectionTitle>
      <div className="map-editor__grid">
        <button type="button" className={`editor-tool ${is({ kind: 'road', erase: false }) ? 'is-selected' : ''}`} onClick={() => setTool({ kind: 'road', erase: false })} data-testid="tool-road" title="Drag across tiles to lay a road">
          Road
        </button>
        <button type="button" className={`editor-tool ${is({ kind: 'road', erase: true }) ? 'is-selected' : ''}`} onClick={() => setTool({ kind: 'road', erase: true })} data-testid="tool-road-erase" title="Drag across tiles to remove a road">
          Remove road
        </button>
      </div>
      <SectionTitle>Place</SectionTitle>
      {tool.kind === 'place' && tool.site === 'town' ? (
        <div className="row gap small map-editor__owner">
          <span className="dim">For</span>
          <Segmented
            label="Town for empire"
            value={String(townOwner)}
            options={[...doc.players.map((p, i) => ({ id: String(i), label: `${i + 1} · ${catalog.pantheons[p.pantheonId]?.name ?? p.pantheonId}` })), { id: '-1', label: 'Unowned' }]}
            onChange={(v) => setTownOwner(Number(v))}
            testId="town-owner"
          />
        </div>
      ) : null}
      {pendingPortal ? <p className="small map-editor__hint">Click a second tile for the twin portal.</p> : null}
      <div className="map-editor__grid">
        {CUSTOM_SITE_KINDS.map((k) => (
          <button key={k.id} type="button" className={`editor-tool ${tool.kind === 'place' && tool.site === k.id ? 'is-selected' : ''}`} onClick={() => setTool({ kind: 'place', site: k.id })} title={k.summary} data-testid={`tool-place-${k.id}`}>
            {k.label}
          </button>
        ))}
      </div>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// Canvas
// ---------------------------------------------------------------------------

function EditorCanvas({
  catalog,
  doc,
  tool,
  brush,
  symmetry,
  selected,
  hover,
  setHover,
  onPaint,
  onRoad,
  onClickCell,
  onMoveSite,
  onSelect,
}: {
  catalog: ContentCatalog;
  doc: CustomMapDocument;
  tool: Tool;
  brush: number;
  symmetry: CustomSymmetry;
  selected: string | null;
  hover: HexCoord | null;
  setHover: (c: HexCoord | null) => void;
  onPaint: (cells: HexCoord[], first: boolean) => void;
  onRoad: (a: HexCoord, b: HexCoord, first: boolean) => void;
  onClickCell: (c: HexCoord) => void;
  onMoveSite: (id: string, c: HexCoord, first: boolean) => void;
  onSelect: (id: string | null) => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<View>(() => {
    const mid = axialPoint({ q: Math.floor(doc.width / 2), r: Math.floor(doc.height / 2) }, R);
    return { zoom: 1, x: mid.x, y: mid.y };
  });
  const [tick, setTick] = useState(0);
  const redraw = useCallback(() => setTick((t) => t + 1), []);
  const drag = useRef<null | { mode: 'pan'; sx: number; sy: number; vx: number; vy: number } | { mode: 'paint'; last: HexCoord | null; first: boolean } | { mode: 'move'; id: string; first: boolean }>(null);
  const cells = useMemo(() => cellsInRect(doc), [doc.width, doc.height]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fit the map on a new document size.
  useEffect(() => {
    const mid = axialPoint({ q: Math.floor(doc.width / 2) - Math.floor(doc.height / 4), r: Math.floor(doc.height / 2) }, R);
    setView((v) => ({ ...v, x: mid.x, y: mid.y }));
  }, [doc.width, doc.height]);

  const toWorld = (cx: number, cy: number) => {
    const el = canvas.current!;
    return { x: (cx - el.clientWidth / 2) / view.zoom + view.x, y: (cy - el.clientHeight / 2) / view.zoom + view.y };
  };
  const cellAt = (e: ReactPointerEvent<HTMLCanvasElement>): HexCoord | null => {
    const rect = canvas.current!.getBoundingClientRect();
    const w = toWorld(e.clientX - rect.left, e.clientY - rect.top);
    const c = pointAxial(w.x, w.y, R);
    const { cols, rows } = rectSize(doc);
    return customInRect(cols, rows, c) ? c : null;
  };

  // Draw.
  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const dpr = window.devicePixelRatio || 1;
    const w = el.clientWidth;
    const h = el.clientHeight;
    if (el.width !== Math.round(w * dpr) || el.height !== Math.round(h * dpr)) {
      el.width = Math.round(w * dpr);
      el.height = Math.round(h * dpr);
    }
    const ctx = el.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#05070b';
    ctx.fillRect(0, 0, w, h);
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.scale(view.zoom, view.zoom);
    ctx.translate(-view.x, -view.y);
    const corners = hexCorners(R + 0.6);
    const path = (cx: number, cy: number) => {
      ctx.beginPath();
      corners.forEach((p, i) => (i === 0 ? ctx.moveTo(cx + p.x, cy + p.y) : ctx.lineTo(cx + p.x, cy + p.y)));
      ctx.closePath();
    };
    const biome = doc.biome ?? 'temperate';
    const patterns = new Map<string, CanvasPattern | string>();
    const fillFor = (t: Terrain): CanvasPattern | string => {
      const hit = patterns.get(t);
      if (hit) return hit;
      const art = t === 'void' ? null : terrainArt(biome, t);
      const img = image(art?.url, redraw);
      let fill: CanvasPattern | string = art?.average ?? FALLBACK_COLOR[t];
      if (img) {
        const p = ctx.createPattern(img, 'repeat');
        if (p) {
          p.setTransform(new DOMMatrix().scale(0.22));
          fill = p;
        }
      }
      patterns.set(t, fill);
      return fill;
    };
    // Visible window (cull).
    const half = { x: w / 2 / view.zoom + R * 2, y: h / 2 / view.zoom + R * 2 };
    for (const c of cells) {
      const p = axialPoint(c, R);
      if (Math.abs(p.x - view.x) > half.x || Math.abs(p.y - view.y) > half.y) continue;
      const t = terrainAt(doc, c);
      path(p.x, p.y);
      ctx.fillStyle = fillFor(t);
      ctx.fill();
    }
    // Grid lines.
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.22)';
    ctx.lineWidth = 1 / view.zoom;
    const thin = hexCorners(R);
    for (const c of cells) {
      const p = axialPoint(c, R);
      if (Math.abs(p.x - view.x) > half.x || Math.abs(p.y - view.y) > half.y) continue;
      ctx.beginPath();
      thin.forEach((q, i) => (i === 0 ? ctx.moveTo(p.x + q.x, p.y + q.y) : ctx.lineTo(p.x + q.x, p.y + q.y)));
      ctx.closePath();
      ctx.stroke();
    }
    // Roads.
    ctx.strokeStyle = 'rgba(214, 186, 128, 0.95)';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    for (const k of doc.roads) {
      const [a, b] = k.split('|').map((x) => {
        const [q, r] = x.split(',').map(Number);
        return axialPoint({ q: q!, r: r! }, R);
      });
      if (!a || !b) continue;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
    // Portal links.
    ctx.setLineDash([6, 6]);
    ctx.strokeStyle = 'rgba(190, 120, 255, 0.8)';
    ctx.lineWidth = 2;
    for (const s of doc.sites) {
      if (s.kind !== 'portal' || !s.twinId || s.id > s.twinId) continue;
      const t = doc.sites.find((x) => x.id === s.twinId);
      if (!t) continue;
      const a = axialPoint(s, R);
      const b = axialPoint(t, R);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    // Sites.
    const sorted = [...doc.sites].sort((a, b) => a.r - b.r);
    for (const s of sorted) {
      const p = axialPoint(s, R);
      const owner = s.kind === 'town' ? (s.owner ?? null) : null;
      if (owner !== null) {
        ctx.fillStyle = SKIRMISH_PLAYER_COLORS[owner % SKIRMISH_PLAYER_COLORS.length]!;
        ctx.globalAlpha = 0.55;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y + R * 0.25, R * 1.05, R * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      let drew = false;
      if (s.kind === 'monster') {
        const cre = s.guard ? catalog.creatures[s.guard.creatureId] : null;
        const img = image(cre ? resolveAsset(cre.presentation.portraitAssetId).url : null, redraw);
        ctx.fillStyle = '#7d1b1b';
        ctx.beginPath();
        ctx.arc(p.x, p.y - R * 0.3, R * 0.75, 0, Math.PI * 2);
        ctx.fill();
        if (img) {
          ctx.save();
          ctx.beginPath();
          ctx.arc(p.x, p.y - R * 0.3, R * 0.68, 0, Math.PI * 2);
          ctx.clip();
          ctx.drawImage(img, p.x - R * 0.68, p.y - R * 0.98, R * 1.36, R * 1.36);
          ctx.restore();
        }
        drew = true;
      } else {
        const townPantheon = s.kind !== 'town' ? null : s.owner !== undefined ? doc.players[s.owner]?.pantheonId : s.pantheon && s.pantheon !== 'nearest' && s.pantheon !== 'other' ? s.pantheon : doc.players[0]?.pantheonId;
        const def = siteSprite(s.kind === 'town' ? 'town' : SPRITE_KIND[s.kind] ?? 'pickup', s.kind === 'town' ? townPantheon : s.kind === 'resource_cache' ? 'gold' : null);
        const img = image(def ? spriteUrl(def.file) : null, redraw);
        if (def && img) {
          const scale = (Math.sqrt(3) * R) / def.pixelsPerHex;
          const dw = def.width * scale;
          const dh = def.height * scale;
          ctx.drawImage(img, p.x - dw * def.anchor[0], p.y + R * 0.35 - dh * def.anchor[1], dw, dh);
          drew = true;
        }
      }
      if (!drew) {
        ctx.fillStyle = '#d9b45c';
        ctx.beginPath();
        ctx.arc(p.x, p.y, R * 0.45, 0, Math.PI * 2);
        ctx.fill();
      }
      if (s.guard && s.kind !== 'monster') {
        ctx.fillStyle = '#b3261e';
        ctx.beginPath();
        ctx.arc(p.x + R * 0.62, p.y - R * 0.55, R * 0.24, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#fff1d0';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
      if (s.id === selected) {
        ctx.strokeStyle = '#ffe08a';
        ctx.lineWidth = 3 / view.zoom;
        path(p.x, p.y);
        ctx.stroke();
      }
    }
    // Hover / brush footprint.
    if (hover) {
      const footprint = tool.kind === 'terrain' ? brushCells(doc, hover, brush) : [hover];
      ctx.strokeStyle = 'rgba(255, 240, 200, 0.85)';
      ctx.lineWidth = 2 / view.zoom;
      for (const c of footprint) {
        const p = axialPoint(c, R);
        path(p.x, p.y);
        ctx.stroke();
      }
      // The symmetric copies the brush paints too (fainter).
      if (symmetry !== 'none' && (tool.kind === 'terrain' || tool.kind === 'road')) {
        ctx.strokeStyle = 'rgba(160, 220, 255, 0.6)';
        for (const c of footprint)
          for (const m of symmetricCells(doc, c, symmetry).slice(1)) {
            const p = axialPoint(m, R);
            path(p.x, p.y);
            ctx.stroke();
          }
      }
    }
    ctx.restore();
  }, [brush, catalog, cells, doc, hover, redraw, selected, symmetry, tick, tool, view]);

  // Resize: redraw.
  useEffect(() => {
    const el = wrap.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => redraw());
    ro.observe(el);
    return () => ro.disconnect();
  }, [redraw]);

  const onDown = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    canvas.current?.setPointerCapture(e.pointerId);
    if (e.button === 1 || e.button === 2) {
      drag.current = { mode: 'pan', sx: e.clientX, sy: e.clientY, vx: view.x, vy: view.y };
      return;
    }
    const c = cellAt(e);
    if (!c) return;
    if (tool.kind === 'terrain') {
      drag.current = { mode: 'paint', last: c, first: true };
      onPaint(brushCells(doc, c, brush), true);
      drag.current.first = false;
    } else if (tool.kind === 'road') {
      drag.current = { mode: 'paint', last: c, first: true };
    } else if (tool.kind === 'select') {
      const there = doc.sites.find((s) => s.q === c.q && s.r === c.r);
      onSelect(there?.id ?? null);
      if (there) drag.current = { mode: 'move', id: there.id, first: true };
    } else onClickCell(c);
  };
  const onMove = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const d = drag.current;
    if (d?.mode === 'pan') {
      setView((v) => ({ ...v, x: d.vx - (e.clientX - d.sx) / v.zoom, y: d.vy - (e.clientY - d.sy) / v.zoom }));
      return;
    }
    const c = cellAt(e);
    if (!c || !hover || c.q !== hover.q || c.r !== hover.r) setHover(c);
    if (!c || !d) return;
    if (d.mode === 'paint' && (!d.last || d.last.q !== c.q || d.last.r !== c.r)) {
      if (tool.kind === 'terrain') onPaint(brushCells(doc, c, brush), false);
      else if (tool.kind === 'road' && d.last && axialNeighbors(d.last).some((n) => n.q === c.q && n.r === c.r)) {
        onRoad(d.last, c, d.first);
        d.first = false;
      }
      d.last = c;
    } else if (d.mode === 'move') {
      onMoveSite(d.id, c, d.first);
      d.first = false;
    }
  };
  const onUp = () => {
    drag.current = null;
  };
  const onWheel = (e: ReactWheelEvent<HTMLCanvasElement>) => {
    const rect = canvas.current!.getBoundingClientRect();
    const before = toWorld(e.clientX - rect.left, e.clientY - rect.top);
    const zoom = Math.min(2.5, Math.max(0.35, view.zoom * (e.deltaY < 0 ? 1.12 : 1 / 1.12)));
    // Keep the point under the cursor in place.
    const cx = e.clientX - rect.left - canvas.current!.clientWidth / 2;
    const cy = e.clientY - rect.top - canvas.current!.clientHeight / 2;
    setView({ zoom, x: before.x - cx / zoom, y: before.y - cy / zoom });
  };
  const onKey = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    const step = 60 / view.zoom;
    const move: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    const m = move[e.key];
    if (m) {
      e.preventDefault();
      setView((v) => ({ ...v, x: v.x + m[0], y: v.y + m[1] }));
    } else if (e.key === '+' || e.key === '=') setView((v) => ({ ...v, zoom: Math.min(2.5, v.zoom * 1.12) }));
    else if (e.key === '-') setView((v) => ({ ...v, zoom: Math.max(0.35, v.zoom / 1.12) }));
  };

  return (
    <div ref={wrap} className="map-editor__canvas" tabIndex={0} onKeyDown={onKey} aria-label="Map canvas: left click to use the tool, right-drag to pan, wheel to zoom, arrow keys to scroll">
      <canvas
        ref={canvas}
        data-testid="editor-canvas"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onPointerLeave={() => setHover(null)}
        onWheel={onWheel}
        onContextMenu={(e) => e.preventDefault()}
      />
      {hover ? (
        <div className="map-editor__coord small" data-testid="editor-hover">
          {GROUND_LABEL[terrainAt(doc, hover) as Exclude<Terrain, 'void'>] ?? ''} · {hover.q},{hover.r}
        </div>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Panels
// ---------------------------------------------------------------------------

type SetDoc = (next: CustomMapDocument | ((d: CustomMapDocument) => CustomMapDocument), record?: boolean) => void;

function MapPanel({ doc, setDoc }: { doc: CustomMapDocument; setDoc: SetDoc }) {
  const v = doc.victory;
  return (
    <div className="editor-form">
      <label className="setting-block__label">Name</label>
      <TextInput value={doc.name} onChange={(name) => setDoc((d) => ({ ...d, name }))} label="Map name" maxLength={60} testId="editor-name" />
      <label className="setting-block__label">Description</label>
      <textarea className="text-input editor-textarea" value={doc.description} maxLength={600} aria-label="Map description" onChange={(e) => setDoc((d) => ({ ...d, description: e.target.value }))} data-testid="editor-description" />
      <label className="setting-block__label">Land</label>
      <select className="text-input" value={doc.biome ?? 'temperate'} aria-label="Land and climate" onChange={(e) => setDoc((d) => ({ ...d, biome: e.target.value as CustomMapDocument['biome'] }))} data-testid="editor-biome">
        {BIOMES.map((b) => (
          <option key={b} value={b}>
            {BIOME_LABEL[b]}
          </option>
        ))}
      </select>
      <label className="setting-block__label">Victory</label>
      <Segmented
        label="Victory goal"
        value={v.type}
        options={[
          { id: 'elimination', label: 'Last empire standing' },
          { id: 'hold_relic', label: 'Hold the shrine' },
        ]}
        onChange={(type) => setDoc((d) => ({ ...d, victory: type === 'hold_relic' ? { type, days: 7 } : { type: 'elimination' } }))}
        testId="editor-victory"
      />
      {v.type === 'hold_relic' ? (
        <div className="row gap small">
          <span className="dim">Days to hold</span>
          <Segmented label="Days to hold the shrine" value={String(v.days) as '3' | '5' | '7' | '10'} options={(['3', '5', '7', '10'] as const).map((id) => ({ id, label: id }))} onChange={(x) => setDoc((d) => ({ ...d, victory: { type: 'hold_relic', days: Number(x) } }))} />
        </div>
      ) : null}
      <p className="small dim">{v.type === 'hold_relic' ? 'Place the Shrine of the First Flame. Owning it at that many dawns in a row wins — or defeating every rival.' : 'Defeat every rival hero and take every rival town.'}</p>
      <label className="setting-block__label">Starting wealth</label>
      <Segmented label="Starting wealth" value={doc.startWealth ?? 'normal'} options={[{ id: 'low', label: 'Low' }, { id: 'normal', label: 'Normal' }, { id: 'high', label: 'High' }]} onChange={(startWealth) => setDoc((d) => ({ ...d, startWealth }))} />
      <Toggle checked={!!doc.revealMap} onChange={(revealMap) => setDoc((d) => ({ ...d, revealMap }))} label="Reveal the whole map at the start" />
      <p className="small dim">
        Size: {rectSize(doc).cols} × {rectSize(doc).rows} tiles. Right-drag or the arrow keys scroll the map; the wheel zooms.
      </p>
    </div>
  );
}

function EmpiresPanel({ catalog, doc, setDoc }: { catalog: ContentCatalog; doc: CustomMapDocument; setDoc: SetDoc }) {
  const pantheons = Object.keys(catalog.skirmishKits);
  return (
    <div className="editor-form" data-testid="editor-empires">
      {doc.players.map((p, i) => (
        <div key={i} className="editor-empire">
          <span className="editor-empire__color" style={{ background: SKIRMISH_PLAYER_COLORS[i % SKIRMISH_PLAYER_COLORS.length] }} aria-hidden="true" />
          <span className="editor-empire__n">{i + 1}</span>
          <select
            className="text-input"
            value={p.pantheonId}
            aria-label={`Empire ${i + 1} pantheon`}
            onChange={(e) => setDoc((d) => ({ ...d, players: d.players.map((x, k) => (k === i ? { ...x, pantheonId: e.target.value } : x)) }))}
            data-testid={`empire-${i}-pantheon`}
          >
            {pantheons.map((id) => (
              <option key={id} value={id}>
                {catalog.pantheons[id]?.name ?? id}
              </option>
            ))}
          </select>
          <span className="small dim">{doc.sites.some((s) => s.kind === 'town' && s.owner === i) ? 'town placed' : 'no town yet'}</span>
          {doc.players.length > 2 ? (
            <Button
              size="small"
              variant="ghost"
              icon="close"
              aria-label={`Remove empire ${i + 1}`}
              onClick={() =>
                setDoc((d) => ({
                  ...d,
                  players: d.players.filter((_, k) => k !== i),
                  // Its town goes; later empires' towns move up one slot.
                  sites: d.sites.filter((s) => !(s.kind === 'town' && s.owner === i)).map((s) => (s.kind === 'town' && s.owner !== undefined && s.owner > i ? { ...s, owner: s.owner - 1 } : s)),
                }))
              }
            />
          ) : null}
        </div>
      ))}
      <Button size="small" icon="star" disabled={doc.players.length >= CUSTOM_MAX_EMPIRES} onClick={() => setDoc((d) => ({ ...d, players: [...d.players, { pantheonId: pantheons[d.players.length % pantheons.length]! }] }))} data-testid="empire-add">
        Add an empire
      </Button>
      <p className="small dim">Each empire starts with one town (Place → Town), a leader and an escort from its pantheon. Who plays each empire — a person or the AI — is chosen when you press Play.</p>
    </div>
  );
}

function SitePanel({ catalog, doc, site, update, remove }: { catalog: ContentCatalog; doc: CustomMapDocument; site: CustomSite | null; update: (id: string, patch: Partial<CustomSite>) => void; remove: (id: string) => void }) {
  const creatures = useMemo(() => Object.values(catalog.creatures).sort((a, b) => a.tier - b.tier || (a.name < b.name ? -1 : 1)), [catalog]);
  const spells = useMemo(() => Object.values(catalog.spells).filter((s) => s.access === 'sanctum' && s.implementationStatus === 'implemented').sort((a, b) => a.tier - b.tier || (a.name < b.name ? -1 : 1)), [catalog]);
  const skills = useMemo(() => Object.values(catalog.skills).filter((s) => !s.pantheonId).sort((a, b) => (a.name < b.name ? -1 : 1)), [catalog]);
  const heroes = useMemo(() => Object.values(catalog.heroes).filter((h) => h.availability === 'hireable').sort((a, b) => (a.name < b.name ? -1 : 1)), [catalog]);
  const artifacts = useMemo(() => Object.values(catalog.artifacts).sort((a, b) => (a.name < b.name ? -1 : 1)), [catalog]);
  if (!site) return <p className="small dim">Pick a site with the Select tool (or place one) to edit it here.</p>;
  const info = CUSTOM_SITE_KINDS.find((k) => k.id === site.kind)!;
  /** Gold and experience (quest huts) and one artifact: named, or of a rarity chosen when the game starts. */
  const rewardFields = (reward: CustomReward | undefined, set: (r: CustomReward) => void, withResources: boolean) => (
    <div className="editor-form">
      {withResources ? (
        <div className="editor-guard">
          {(['gold', 'xp'] as const).map((k) => (
            <label key={k} className="small">
              {k === 'xp' ? 'Experience' : 'Gold'}{' '}
              <input type="number" className="text-input editor-count" min={0} max={99999} value={reward?.[k] ?? 0} aria-label={`Reward ${k}`} onChange={(e) => set({ ...reward, [k]: Math.max(0, Math.round(Number(e.target.value) || 0)) || undefined })} />
            </label>
          ))}
        </div>
      ) : null}
      <select
        className="text-input"
        aria-label="Artifact"
        value={reward?.artifactId ? `id:${reward.artifactId}` : reward?.artifactRarity ? `rarity:${reward.artifactRarity}` : ''}
        onChange={(e) => {
          const v = e.target.value;
          const { artifactId: _a, artifactRarity: _r, ...rest } = reward ?? {};
          void _a;
          void _r;
          set(v.startsWith('id:') ? { ...rest, artifactId: v.slice(3) } : v.startsWith('rarity:') ? { ...rest, artifactRarity: v.slice(7) as 'minor' | 'major' | 'relic' } : rest);
        }}
      >
        {withResources ? <option value="">No artifact</option> : null}
        <option value="rarity:minor">A minor artifact (chosen when the game starts)</option>
        <option value="rarity:major">A major artifact (chosen when the game starts)</option>
        <option value="rarity:relic">A relic (chosen when the game starts)</option>
        {artifacts.map((a) => (
          <option key={a.id} value={`id:${a.id}`}>
            {a.name}
          </option>
        ))}
      </select>
    </div>
  );
  const creatureSelect = (value: string, onChange: (id: string) => void, label: string, testId: string) => (
    <select className="text-input" value={value} aria-label={label} onChange={(e) => onChange(e.target.value)} data-testid={testId}>
      {creatures.map((c) => (
        <option key={c.id} value={c.id}>
          T{c.tier} · {c.name}
        </option>
      ))}
    </select>
  );
  return (
    <div className="editor-form" data-testid="editor-site">
      <div className="editor-site__head">
        <strong>{info.label}</strong>
        <span className="small dim">
          {site.id} · {site.q},{site.r}
        </span>
      </div>
      <p className="small dim">{info.summary}</p>
      <label className="setting-block__label">Name (optional)</label>
      <TextInput value={site.name ?? ''} onChange={(name) => update(site.id, { name: name || undefined })} label="Site name" maxLength={40} testId="site-name" />
      {site.kind === 'town' ? (
        <>
          <label className="setting-block__label">Empire</label>
          <Segmented
            label="Town's empire"
            value={String(site.owner ?? -1)}
            options={[...doc.players.map((p, i) => ({ id: String(i), label: `${i + 1} · ${catalog.pantheons[p.pantheonId]?.name ?? p.pantheonId}` })), { id: '-1', label: 'Unowned' }]}
            onChange={(v) => update(site.id, Number(v) < 0 ? { owner: undefined } : { owner: Number(v), pantheon: undefined })}
            testId="site-town-owner"
          />
          {site.owner === undefined ? (
            <>
              <label className="setting-block__label">Pantheon of the unowned town</label>
              <select className="text-input" value={site.pantheon ?? 'nearest'} aria-label="Unowned town pantheon" onChange={(e) => update(site.id, { pantheon: e.target.value === 'nearest' ? undefined : e.target.value })} data-testid="site-town-pantheon">
                <option value="nearest">The nearest empire’s</option>
                <option value="other">Another pantheon (one no empire plays)</option>
                {Object.keys(catalog.skirmishKits)
                  .sort()
                  .map((p) => (
                    <option key={p} value={p}>
                      {catalog.pantheons[p]?.name ?? p}
                    </option>
                  ))}
              </select>
              <p className="small dim">No owner and no hero at the start; its own militia holds it until an empire takes it.</p>
            </>
          ) : null}
        </>
      ) : null}
      {site.kind === 'creature_camp' ? (
        <>
          <label className="setting-block__label">Creatures for hire</label>
          {creatureSelect(site.creatureId ?? creatures[0]!.id, (creatureId) => update(site.id, { creatureId }), 'Camp creature', 'site-camp-creature')}
        </>
      ) : null}
      {site.kind === 'spell_shrine' ? (
        <>
          <label className="setting-block__label">Spell</label>
          <select className="text-input" value={site.spellId ?? ''} aria-label="Shrine spell" onChange={(e) => update(site.id, { spellId: e.target.value || undefined })}>
            <option value="">Chosen when the game starts</option>
            {spells.map((s) => (
              <option key={s.id} value={s.id}>
                Tier {s.tier} · {s.name}
              </option>
            ))}
          </select>
        </>
      ) : null}
      {site.kind === 'skill_trainer' ? (
        <>
          <label className="setting-block__label">Skill</label>
          <select className="text-input" value={site.skillId ?? ''} aria-label="Trainer skill" onChange={(e) => update(site.id, { skillId: e.target.value || undefined })}>
            <option value="">Chosen when the game starts</option>
            {skills.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </>
      ) : null}
      {site.kind === 'portal' ? <p className="small">{site.twinId ? `Leads to ${site.twinId} (dashed line). Erasing one portal removes its twin.` : 'No twin yet: place the second portal.'}</p> : null}
      {site.kind === 'key_tent' || site.kind === 'key_gate' ? (
        <>
          <label className="setting-block__label">Key colour</label>
          <select className="text-input" value={site.color ?? 'azure'} aria-label="Key colour" onChange={(e) => update(site.id, { color: e.target.value as KeyColor })} data-testid="site-key-color">
            {CUSTOM_KEY_COLORS.map((c) => (
              <option key={c} value={c}>
                {KEY_COLOR_LABEL[c]}
              </option>
            ))}
          </select>
          <p className="small dim">{site.kind === 'key_gate' ? 'Only empires holding this key pass. Place a key tent of the same colour somewhere they can reach.' : 'Visiting heroes take this key for their empire; it opens every gate of its colour.'}</p>
        </>
      ) : null}
      {site.kind === 'prison' ? (
        <>
          <label className="setting-block__label">Captive</label>
          <select className="text-input" value={site.heroId ?? ''} aria-label="Captive hero" onChange={(e) => update(site.id, { heroId: e.target.value || undefined })}>
            <option value="">A hero of the nearest empire’s pantheon</option>
            {heroes.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name} ({catalog.pantheons[h.pantheonId ?? '']?.name ?? '—'})
              </option>
            ))}
          </select>
          <div className="row gap">
            <span className="small">Joins at level</span>
            <input type="number" className="text-input editor-count" min={1} max={20} value={site.level ?? 5} aria-label="Captive level" onChange={(e) => update(site.id, { level: Math.max(1, Math.min(20, Math.round(Number(e.target.value) || 1))) })} />
          </div>
        </>
      ) : null}
      {site.kind === 'quest_hut' ? (
        <>
          <label className="setting-block__label">Quest</label>
          <Segmented
            label="Quest"
            value={site.quest?.type ?? 'deliver'}
            options={[
              { id: 'deliver', label: 'Bring resources' },
              { id: 'defeat', label: 'Defeat a guard' },
            ]}
            onChange={(t) => {
              const target = doc.sites.find((x) => x.guard && x.id !== site.id);
              update(site.id, { quest: t === 'deliver' ? { type: 'deliver', wood: 5, stone: 5 } : { type: 'defeat', siteId: target?.id ?? '' } });
            }}
          />
          {site.quest?.type === 'defeat' ? (
            <select className="text-input" value={site.quest.siteId} aria-label="Guard to defeat" onChange={(e) => update(site.id, { quest: { type: 'defeat', siteId: e.target.value } })}>
              {doc.sites
                .filter((x) => x.guard)
                .map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.name || CUSTOM_SITE_KINDS.find((k) => k.id === x.kind)?.label} ({x.id})
                  </option>
                ))}
            </select>
          ) : (
            <div className="editor-guard">
              {(['gold', 'wood', 'stone', 'crystal'] as const).map((k) => (
                <label key={k} className="small">
                  {k[0]!.toUpperCase() + k.slice(1)}{' '}
                  <input
                    type="number"
                    className="text-input editor-count"
                    min={0}
                    max={99999}
                    value={site.quest?.type === 'deliver' ? (site.quest[k] ?? 0) : 0}
                    aria-label={`Asks for ${k}`}
                    onChange={(e) => update(site.id, { quest: { ...(site.quest?.type === 'deliver' ? site.quest : { type: 'deliver' as const }), [k]: Math.max(0, Math.round(Number(e.target.value) || 0)) } })}
                  />
                </label>
              ))}
            </div>
          )}
          <label className="setting-block__label">Reward</label>
          {rewardFields(site.reward, (reward) => update(site.id, { reward }), true)}
        </>
      ) : null}
      {site.kind === 'artifact' ? (
        <>
          <label className="setting-block__label">Artifact</label>
          {rewardFields(site.reward, (reward) => update(site.id, { reward }), false)}
        </>
      ) : null}
      {site.kind === 'watchtower' ? (
        <div className="row gap">
          <span className="small">Reveals sites within</span>
          <input type="number" className="text-input editor-count" min={1} max={30} value={site.radius ?? 9} aria-label="Watchtower range" onChange={(e) => update(site.id, { radius: Math.max(1, Math.min(30, Math.round(Number(e.target.value) || 1))) })} />
          <span className="small">hexes</span>
        </div>
      ) : null}
      {info.guardable ? (
        <>
          <label className="setting-block__label">Guard</label>
          {site.kind !== 'monster' ? <Toggle checked={!!site.guard} onChange={(on) => update(site.id, { guard: on ? { creatureId: defaultCreature(catalog, 3), count: 8 } : null })} label="Guarded by a neutral army" /> : null}
          {site.guard ? (
            <div className="editor-guard">
              {creatureSelect(site.guard.creatureId, (creatureId) => update(site.id, { guard: { ...site.guard!, creatureId } }), 'Guard creature', 'site-guard-creature')}
              <input
                type="number"
                className="text-input editor-count"
                min={1}
                max={999}
                value={site.guard.count}
                aria-label="Guard count"
                onChange={(e) => update(site.id, { guard: { ...site.guard!, count: Math.max(1, Math.min(999, Math.round(Number(e.target.value) || 1))) } })}
                data-testid="site-guard-count"
              />
            </div>
          ) : null}
        </>
      ) : null}
      <Button size="small" variant="danger" onClick={() => remove(site.id)} data-testid="site-remove">
        Remove this site
      </Button>
    </div>
  );
}

function CheckPanel({ issues, onPick }: { issues: ReturnType<typeof validateCustomMap>; onPick: (id: string) => void }) {
  if (issues.length === 0)
    return (
      <p className="small" data-testid="editor-check-ok">
        Every check passes: the map can be played.
      </p>
    );
  return (
    <ul className="editor-issues" data-testid="editor-issues">
      {issues.map((i, k) => (
        <li key={k} className={`editor-issue editor-issue--${i.severity}`}>
          {i.siteId ? (
            <button type="button" className="link" onClick={() => onPick(i.siteId!)}>
              {i.text}
            </button>
          ) : (
            i.text
          )}
        </li>
      ))}
    </ul>
  );
}

// ---------------------------------------------------------------------------
// Dialogs
// ---------------------------------------------------------------------------

function NewMapDialog({ onClose, onCreate }: { onClose: () => void; onCreate: (size: CustomMapSize) => void }) {
  const [size, setSize] = useState<CustomMapSize>('small');
  return (
    <Modal
      title="New map"
      onClose={onClose}
      testId="editor-new-dialog"
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={() => onCreate(size)} data-testid="editor-new-create">
            Create
          </Button>
        </>
      }
    >
      <p className="small dim">An empty map of plains with two empires. Unsaved changes to the current map are lost.</p>
      <Segmented label="Map size" value={size} options={(Object.keys(CUSTOM_MAP_SIZES) as CustomMapSize[]).map((id) => ({ id, label: `${CUSTOM_MAP_SIZES[id].label} (${CUSTOM_MAP_SIZES[id].cols}×${CUSTOM_MAP_SIZES[id].rows})` }))} onChange={setSize} testId="editor-new-size" />
    </Modal>
  );
}

/** Generate a random map with the random-map generator, then open it in the editor (2026-10-07). */
function GenerateMapDialog({ catalog, players, onClose, onGenerate }: { catalog: ContentCatalog; players: readonly string[]; onClose: () => void; onGenerate: (doc: CustomMapDocument, leftOut: readonly string[]) => void }) {
  const store = useStore();
  const [size, setSize] = useState<SkirmishMapSize>('small');
  const [mapType, setMapType] = useState<SkirmishMapType>('continental');
  const [empires, setEmpires] = useState(2);
  const [unowned, setUnowned] = useState<'none' | 'own'>('none');
  const pantheons = Object.keys(catalog.skirmishKits);
  const seatPantheon = (i: number) => players[i] ?? pantheons[i % pantheons.length]!;
  const sizeOk = skirmishSizeAllows(size, empires);
  const typeOk = skirmishTypeAllows(mapType, empires);
  const reason = !sizeOk ? 'Four or more empires need a large or huge map' : !typeOk ? 'This map type is for fewer empires' : null;
  const generate = () => {
    try {
      const seed = Math.floor(Math.random() * 2 ** 31);
      const g = createRandomSkirmish(catalog, {
        seed,
        size,
        mapType,
        seats: Array.from({ length: empires }, (_, i) => ({ pantheonId: seatPantheon(i), controller: i === 0 ? ('human' as const) : ('ai' as const) })),
        victory: { type: 'elimination' },
        monsters: 'few',
        unownedTowns: unowned,
      });
      const label = SKIRMISH_MAP_TYPES.find((t) => t.id === mapType)?.label ?? mapType;
      const { doc, leftOut } = customMapFromGenerated(catalog, g, `${label} ${seed % 10000}`);
      onGenerate(doc, leftOut);
    } catch (e) {
      store.toast(`Could not generate a map: ${e instanceof Error ? e.message : String(e)}`, 'error');
    }
  };
  return (
    <Modal
      title="Generate a map to edit"
      onClose={onClose}
      width="38rem"
      testId="editor-generate-dialog"
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" icon="auto" disabled={!!reason} disabledReason={reason} onClick={generate} data-testid="editor-generate-confirm">
            Generate and edit
          </Button>
        </>
      }
    >
      <p className="small">The random-map generator lays out ground, roads, towns, mines, guards and treasures; the map then opens here to change anything. It replaces the map you are editing.</p>
      <div className="map-editor__form">
        <label className="small dim">Size</label>
        <Segmented label="Map size" value={size} options={(['small', 'medium', 'large', 'huge'] as const).map((id) => ({ id, label: id[0]!.toUpperCase() + id.slice(1) }))} onChange={setSize} testId="generate-size" />
        <label className="small dim">Empires</label>
        <Segmented label="Empires" value={String(empires) as '2' | '3' | '4'} options={(['2', '3', '4'] as const).map((id) => ({ id, label: id }))} onChange={(v) => setEmpires(Number(v))} testId="generate-empires" />
        <label className="small dim" htmlFor="generate-type">
          Map type
        </label>
        <select id="generate-type" value={mapType} onChange={(e) => setMapType(e.target.value as SkirmishMapType)} data-testid="generate-type">
          {SKIRMISH_MAP_TYPES.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
        <label className="small dim">Unowned towns</label>
        <Segmented label="Unowned towns" value={unowned} options={[{ id: 'none', label: 'None' }, { id: 'own', label: 'One each' }]} onChange={setUnowned} testId="generate-unowned" />
      </div>
      <p className="faint small">Empires: {Array.from({ length: empires }, (_, i) => catalog.pantheons[seatPantheon(i)]?.name ?? seatPantheon(i)).join(', ')} (change them on the Empires tab).</p>
    </Modal>
  );
}

function OpenMapDialog({ onClose, onLoad }: { onClose: () => void; onLoad: (text: string | null, id: string | null) => void }) {
  const store = useStore();
  const [list, setList] = useState<{ id: string; name: string; bytes: number }[] | null>(null);
  const refresh = useCallback(async () => {
    const items = await store.platform.maps.list();
    const out: { id: string; name: string; bytes: number }[] = [];
    for (const it of items) {
      const text = await store.platform.maps.read(it.id);
      const r = text ? parseCustomMap(text) : null;
      out.push({ id: it.id, name: r && r.ok ? r.doc.name : `${it.id} (damaged)`, bytes: it.bytes });
    }
    setList(out);
  }, [store]);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  return (
    <Modal
      title="Open a map"
      onClose={onClose}
      testId="editor-open-dialog"
      footer={
        <>
          <Button onClick={() => void store.platform.maps.importFile().then((t) => onLoad(t, null))} data-testid="editor-import">
            Import a map file…
          </Button>
          <Button onClick={onClose}>Close</Button>
        </>
      }
    >
      {list === null ? <p className="small dim">Reading the map library…</p> : null}
      {list && list.length === 0 ? <p className="small dim">The map library is empty. Save a map with Save, or import a map file.</p> : null}
      <ul className="editor-library">
        {(list ?? []).map((m) => (
          <li key={m.id} className="editor-library__row">
            <span className="editor-library__name">{m.name}</span>
            <span className="small dim">{(m.bytes / 1024).toFixed(1)} KB</span>
            <Button size="small" variant="primary" onClick={() => void store.platform.maps.read(m.id).then((t) => onLoad(t, m.id))} data-testid={`library-open-${m.id}`}>
              Open
            </Button>
            <Button
              size="small"
              variant="ghost"
              onClick={() =>
                store.confirm(`Delete “${m.name}”?`, 'The map leaves the library for good (exported map files stay where you saved them).', 'Delete', () => void store.platform.maps.remove(m.id).then(refresh), { danger: true })
              }
            >
              Delete
            </Button>
          </li>
        ))}
      </ul>
      {Object.keys(store.catalog.skirmishMaps ?? {}).length ? (
        <>
          <SectionTitle>Skirmish maps</SectionTitle>
          <p className="small dim">Open a copy of a map from the Skirmish list to change it; the original stays as it is.</p>
          <ul className="editor-library">
            {Object.values(store.catalog.skirmishMaps ?? {})
              .sort((a, b) => a.order - b.order)
              .map((m) => (
                <li key={m.id} className="editor-library__row">
                  <span className="editor-library__name">{m.name}</span>
                  <span className="small dim">{m.map.players.length} empires</span>
                  <Button size="small" onClick={() => onLoad(serializeCustomMap({ ...m.map, name: `${m.name} (copy)` }), null)} data-testid={`library-copy-${m.id}`}>
                    Open a copy
                  </Button>
                </li>
              ))}
          </ul>
        </>
      ) : null}
    </Modal>
  );
}

function PlayDialog({ catalog, doc, onClose }: { catalog: ContentCatalog; doc: CustomMapDocument; onClose: () => void }) {
  const store = useStore();
  const [seats, setSeats] = useState(() => doc.players.map((p, i) => ({ controller: (i === 0 ? 'human' : 'ai') as 'human' | 'ai', name: '', godId: patronsOf(catalog, p.pantheonId)[0] ?? null })));
  const [difficulty, setDifficulty] = useState('normal');
  const humans = seats.filter((s) => s.controller === 'human').length;
  const reason = humans === 0 ? 'At least one empire must be played by a person' : seats.some((s) => s.controller === 'human' && !s.godId) ? 'Every person needs a patron god' : '';
  const start = () => {
    if (reason) return;
    let compiled;
    try {
      compiled = compileCustomMap(
        catalog,
        doc,
        seats.map((s) => ({ controller: s.controller, ...(s.controller === 'human' && s.name.trim() ? { name: s.name.trim() } : {}) })),
      );
    } catch (e) {
      store.toast(e instanceof Error ? e.message : String(e), 'error');
      return;
    }
    const ids = [compiled.mission.player.playerId, ...(compiled.mission.rivals ?? []).map((r) => r.playerId)];
    const playerNames: Record<string, string> = {};
    const patronGodIds: Record<string, string> = {};
    seats.forEach((s, i) => {
      if (s.controller === 'human') playerNames[ids[i]!] = s.name.trim() || `Player ${i + 1}`;
      if (i > 0 && s.controller === 'human' && s.godId) patronGodIds[ids[i]!] = s.godId;
    });
    store.startGenerated(compiled, seats[0]!.controller === 'human' ? seats[0]!.godId : null, { difficultyId: seats.some((s) => s.controller === 'ai') ? difficulty : 'normal', playerNames, patronGodIds });
  };
  return (
    <Modal
      title={`Play “${doc.name}”`}
      onClose={onClose}
      width="44rem"
      testId="editor-play-dialog"
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" icon="play" disabled={!!reason} disabledReason={reason} onClick={start} data-testid="editor-play-start">
            Start
          </Button>
        </>
      }
    >
      <div className="editor-form">
        {doc.players.map((p, i) => {
          const s = seats[i]!;
          const set = (patch: Partial<typeof s>) => setSeats((list) => list.map((x, k) => (k === i ? { ...x, ...patch } : x)));
          return (
            <div key={i} className="editor-empire" data-testid={`play-seat-${i}`}>
              <span className="editor-empire__color" style={{ background: SKIRMISH_PLAYER_COLORS[i % SKIRMISH_PLAYER_COLORS.length] }} aria-hidden="true" />
              <span className="editor-empire__n">{catalog.pantheons[p.pantheonId]?.name ?? p.pantheonId}</span>
              <Segmented label={`Empire ${i + 1} played by`} value={s.controller} options={[{ id: 'human', label: 'Person' }, { id: 'ai', label: 'AI' }]} onChange={(controller) => set({ controller })} testId={`play-seat-${i}-controller`} />
              {s.controller === 'human' ? (
                <>
                  <TextInput value={s.name} onChange={(name) => set({ name })} label={`Empire ${i + 1} player name`} placeholder={`Player ${i + 1}`} maxLength={20} />
                  <select className="text-input" value={s.godId ?? ''} aria-label={`Empire ${i + 1} patron god`} onChange={(e) => set({ godId: e.target.value || null })}>
                    {patronsOf(catalog, p.pantheonId).map((g) => (
                      <option key={g} value={g}>
                        {catalog.gods[g]?.name ?? g}
                      </option>
                    ))}
                  </select>
                </>
              ) : null}
            </div>
          );
        })}
        {seats.some((s) => s.controller === 'ai') ? <DifficultyPicker catalog={catalog} value={difficulty} onChange={setDifficulty} /> : null}
        {reason ? <p className="small map-editor__bad">{reason}</p> : null}
      </div>
    </Modal>
  );
}
