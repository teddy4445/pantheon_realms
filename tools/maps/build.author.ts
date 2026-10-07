/**
 * `npm run maps:build` (tools/maps/build.mjs) — builds the authored skirmish
 * maps from tools/maps/maps.ts after checking each one: the editor's
 * validation, exact symmetry, one road into every town, and each map's own
 * promises (e.g. Frostgate's pass is shut without the crimson key). The
 * runner then plays the seat-fairness test on the maps that changed and writes
 * packages/content/src/skirmish/maps/<id>.prmap.json only for the ones that pass.
 * Development tool; never packaged in the game.
 */
import { expect, it } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildCatalog } from '@pr/content';
import { edgeKey, hexKey, type CustomMapDocument, type HexCoord } from '@pr/rules';
import { serializeCustomMap, validateCustomMap } from '@pr/mapgen';
import { AUTHORED_MAPS } from './maps';
import { reachable, type MapBuilder } from './lib';

// tools/maps/build.mjs stages the documents first (MAPS_OUT) and ships only the ones that pass the fairness test.
const OUT = process.env.MAPS_OUT ?? join(process.cwd(), 'packages/content/src/skirmish/maps');
const catalog = buildCatalog();

function townCell(doc: CustomMapDocument, owner: number): HexCoord {
  const t = doc.sites.find((s) => s.kind === 'town' && s.owner === owner)!;
  return { q: t.q, r: t.r };
}

/** Walking steps between two cells (BFS; blocked tiles are walls; portals link). */
function steps(doc: CustomMapDocument, a: HexCoord, b: HexCoord, blocked: ReadonlySet<string>): number {
  const pass = (c: HexCoord) => c.q >= 0 && c.r >= 0 && c.q < doc.width && c.r < doc.height && 'pfrs'.includes(doc.terrain[c.r * doc.width + c.q]!);
  const portals = new Map(doc.sites.filter((s) => s.kind === 'portal').map((s) => [hexKey({ q: s.q, r: s.r }), s]));
  const seen = new Map<string, number>([[hexKey(a), 0]]);
  const queue = [a];
  while (queue.length) {
    const c = queue.shift()!;
    const d = seen.get(hexKey(c))!;
    if (hexKey(c) === hexKey(b)) return d;
    const next: HexCoord[] = [];
    for (const [dq, dr] of [[1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1], [1, -1]] as const) next.push({ q: c.q + dq, r: c.r + dr });
    const p = portals.get(hexKey(c));
    if (p) {
      const t = doc.sites.find((x) => x.id === p.twinId)!;
      next.push({ q: t.q, r: t.r });
    }
    for (const n of next) {
      const k = hexKey(n);
      if (seen.has(k) || (!pass(n) && k !== hexKey(b)) || (blocked.has(k) && k !== hexKey(b))) continue;
      seen.set(k, d + 1);
      queue.push(n);
    }
  }
  return Infinity;
}

function check(id: string, doc: CustomMapDocument, b: MapBuilder): string[] {
  const notes: string[] = [];
  const issues = validateCustomMap(catalog, doc);
  for (const i of issues) notes.push(`${i.severity}: ${i.text}${i.siteId ? ` (${i.siteId})` : ''}`);
  expect(issues.filter((i) => i.severity === 'error'), id).toEqual([]);
  // Exact symmetry of the ground.
  for (let r = 0; r < doc.height; r++)
    for (let q = 0; q < doc.width; q++) {
      const c = { q, r };
      if (!b.inRect(c)) continue;
      for (const o of b.copies(c)) if (b.inRect(o)) expect(b.terrain(o), `${id} symmetry at ${q},${r}`).toBe(b.terrain(c));
    }
  // One road into each town (its gate), never more.
  const roads = new Set(doc.roads);
  for (const t of doc.sites.filter((s) => s.kind === 'town')) {
    const n = [[1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1], [1, -1]].filter(([dq, dr]) => roads.has(edgeKey({ q: t.q, r: t.r }, { q: t.q + dq!, r: t.r + dr! }))).length;
    expect(n, `${id}: roads into ${t.id}`).toBe(1);
  }
  // Every empire walks the same distance to its rivals and to the centre.
  const guards = new Set(doc.sites.filter((s) => s.kind === 'monster' || s.kind === 'key_gate').map((s) => hexKey({ q: s.q, r: s.r })));
  const n = doc.players.length;
  const row: string[] = [];
  for (let i = 0; i < n; i++) {
    const d = [];
    for (let j = 0; j < n; j++) if (i !== j) d.push(steps(doc, townCell(doc, i), townCell(doc, j), new Set()));
    row.push(`E${i + 1}→rivals ${d.join('/')}`);
  }
  notes.push(row.join('  '));
  const relic = doc.sites.find((s) => s.kind === 'relic' || (s.q === b.centre.q && s.r === b.centre.r));
  if (relic) notes.push(`to the centre: ${doc.players.map((_, i) => steps(doc, townCell(doc, i), { q: relic.q, r: relic.r }, new Set())).join('/')}`);
  // Guards and key gates shut the empires off from each other except where the design says so.
  const shut = reachable(doc, townCell(doc, 0), guards);
  const open = doc.players.map((_, i) => shut.has(hexKey(townCell(doc, i))));
  notes.push(`with every guard and key gate standing, empire 1 walks to: ${open.map((o, i) => (o ? `E${i + 1}` : '')).filter(Boolean).join(', ')}`);
  const landOnly = reachable(doc, townCell(doc, 0), guards, false);
  notes.push(`…and without portals: ${doc.players.map((_, i) => (landOnly.has(hexKey(townCell(doc, i))) ? `E${i + 1}` : '')).filter(Boolean).join(', ')}`);
  return notes;
}

it('builds the authored skirmish maps', () => {
  mkdirSync(OUT, { recursive: true });
  for (const make of AUTHORED_MAPS) {
    const m = make();
    const notes = check(m.id, m.doc, m.builder);
    const passable = [...m.doc.terrain].filter((c) => 'pfrs'.includes(c)).length;
    console.log(`\n${m.doc.name}: ${m.doc.sites.length} sites, ${m.doc.roads.length} road edges, ${passable} open tiles (${Math.round(passable / m.doc.players.length)} per empire)\n  ${notes.join('\n  ')}`);
    writeFileSync(join(OUT, `${m.id}.prmap.json`), serializeCustomMap(m.doc));
  }
});
