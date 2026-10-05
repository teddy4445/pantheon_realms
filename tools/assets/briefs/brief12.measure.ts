/**
 * Art Brief 12 for GPT-6: every visual still missing (development tool; never
 * packaged in the game). Owner request 2026-10-04: "give me a file that
 * explains GPT 6 what visuals are still lacking, what we want to have in them
 * and how we need it to add them later to the game."
 *
 * The lists come from the game itself — the content catalog (town chains,
 * dwellings, climates, artifacts, sites, sets, abilities), the placeholder and
 * art manifests (what still shows a crop, a stand-in or a glyph) and the icon
 * inventory written by `npm run icons:catalog` — so the brief stays true when
 * content changes. Writes:
 *   assets-source/art/briefs/GPT6_BRIEF_12_REMAINING_VISUALS.md
 *   assets-source/sprites/sheet-layouts.brief12.json (read by `npm run sprites:cut`)
 *   assets-source/art/briefs/guides/town-placements.json (for the layout guides)
 * Briefs 8–11 and their layouts are not touched.
 *
 * Run: npm run art:brief12 (then python3 tools/assets/briefs/town_guides.py)
 */
import { it } from 'vitest';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildCatalog } from '@pr/content';
import type { ContentCatalog } from '@pr/rules';
import { CLIMATE_ICON_DRAW } from './climateIcons';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const BRIEFS = join(ROOT, 'assets-source', 'art', 'briefs');
const TODAY = '2026-10-04';
const PANTHEONS = ['greek', 'norse', 'egyptian', 'japanese', 'celtic', 'mesoamerican'] as const;
const SERVICES = ['tavern', 'marketplace', 'resource_depot', 'workshop', 'training_academy', 'watchtower', 'artifact_merchant'] as const;

const TOWN_BOARD: Record<string, string> = {
  greek: 'support images/ChatGPT Image Sep 29, 2026, 04_17_21 PM-1.png',
  norse: 'support images/ChatGPT Image Sep 29, 2026, 04_17_23 PM-2.png',
  egyptian: 'support images/ChatGPT Image Sep 29, 2026, 04_17_25 PM-3.png',
  japanese: 'support images/ChatGPT Image Sep 29, 2026, 04_17_27 PM-4.png',
  celtic: 'support images/ChatGPT Image Sep 29, 2026, 04_17_35 PM-5.png',
  mesoamerican: 'support images/ChatGPT Image Sep 29, 2026, 04_17_37 PM-6.png',
};
const PALETTE: Record<string, string> = {
  greek: 'royal blue, white marble and gold; laurel, meander borders, bronze',
  norse: 'night navy, steel silver, fur browns and ember orange; knotwork, ravens, snow',
  egyptian: 'sand gold, white linen, lapis blue and carnelian; sun discs, spread wings, broad collars',
  japanese: 'vermilion, black lacquer and white with cherry pink and gold; clouds, waves, lacquered armour',
  celtic: 'forest green and gold with grey stone, woad blue and heather; spirals, torcs, mist',
  mesoamerican: 'turquoise and crimson with jade and gold; quetzal feathers, step-fret patterns, jade',
};
/** What each town painting shows today (the owner's concept references), kept in a repaint. */
const TOWN_SETTING: Record<string, string> = {
  greek: 'white-marble terraces stepping down a sunlit sea cliff, waterfalls into a blue bay, cypresses, a great statue and temple on the summit, snowy mountains far behind',
  norse: 'stone and timber terraces over frozen waterfalls in a snowy fjord, pines, braziers, a giant warrior statue and a fortress gate at the top, the aurora in the night sky',
  egyptian: 'sandstone terraces and quays over waterfalls into the green Nile, palms, obelisks and sphinxes, a sailing boat, the pyramids and a temple city on the horizon',
  japanese: 'terraces on misty cliffs joined by red arched bridges, waterfalls, cherry trees in blossom, torii gates, pagodas and a snow-capped mountain at sunset',
  celtic: 'mossy terraces among waterfalls in a misty highland valley, standing stones, a giant oak on the left, a stag statue and a stone arch on the far crag',
  mesoamerican: 'stepped stone terraces and causeways over turquoise pools and waterfalls in the rainforest, crimson banners, a great sun temple on the central axis at sunrise',
};

interface Cell {
  row: number;
  col: number;
  name: string;
  kind: 'portrait' | 'figure';
  out: string;
}
interface Layout {
  group: string;
  target: 'portraits' | 'items';
  cols: number;
  rows: number;
  cellHexes: [number, number];
  size: [number, number];
  background: 'opaque' | 'transparent';
  cells: Cell[];
  file: string;
}
interface InvRow {
  assetId: string;
  name: string;
  group: string;
  where: string;
  brief: string;
  details?: string;
  pantheon?: string;
  priority: 'now' | 'later';
  current: { type: string; note?: string; file?: string };
}

const layouts: Record<string, Layout> = {};
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const human = (s: string) => s.replace(/_/g, ' ');
const sheetTable = (rows: [string, string][]) => ['| Field | Value |', '|---|---|', ...rows.map(([a, b]) => `| ${a} | ${b} |`)].join('\n');
const TRANSPARENT = 'Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else).';

const COMMON_RULES = [
  '1. **One sheet per request**, at the size given **or larger with the same proportions**. Save it under its exact file name in **`assets-source/sprites/sheets/`**.',
  '2. **Invisible grid** of equal cells, filled left to right, rows top to bottom, exactly as listed. Every picture stays inside its own cell; nothing touches or crosses a cell edge. A cell marked *empty* stays empty.',
  '3. **No text** of any kind: no letters, numbers, runes or glyphs that read as writing, no logos, signatures, watermarks, frames, grid lines or labels.',
  '4. **Then:** `npm run sprites:cut -- --only <sheet name>` cuts that sheet — and only that one: the sheets already delivered keep their reviewed cuts — into its single files (check the preview of each cut in `assets-source/sprites/sheets/_preview/`), then run the importer named in the sheet’s *Then* line. Nothing else changes: the game picks the files up by name.',
  '5. **Too much for one image?** A sheet may come as two images split between rows, `<sheet>.part1.png` (upper rows) and `<sheet>.part2.png` (the rest), each with the same columns and cell shape.',
  '6. **Style:** modern high-resolution painterly fantasy strategy art — the look of the pantheon boards, the delivered town levels (Brief 10) and the game’s opening paintings. Not pixel art, not a photograph, not a 3D-render look, not anime, no ink outlines, no flat vector.',
  '7. **Respect.** Gods, heroes and cultures of living and historical traditions are shown dignified — never comic, never horror; adults only, no gore, no nudity.',
].join('\n');

function readJson<T>(rel: string): T {
  return JSON.parse(readFileSync(join(ROOT, rel), 'utf8')) as T;
}

function inventory(): Map<string, InvRow> {
  const out = new Map<string, InvRow>();
  const p = join(ROOT, 'assets-source', 'icons', 'icon-inventory.json');
  if (!existsSync(p)) return out;
  const inv = JSON.parse(readFileSync(p, 'utf8')) as { sections: { rows: InvRow[] }[] };
  for (const s of inv.sections) for (const r of s.rows) out.set(r.assetId, r);
  return out;
}

/** Rows of an icon sheet: `n` icons on a grid of `cols` columns of 256 px cells. */
function iconSheet(name: string, group: string, ids: readonly string[], cols: number): Layout {
  const rows = Math.max(1, Math.ceil(ids.length / cols));
  const cells: Cell[] = ids.map((id, i) => ({ row: Math.floor(i / cols), col: i % cols, name: id, kind: 'figure', out: `assets-source/icons/final/${id}.png` }));
  const lay: Layout = { group, target: 'items', cols, rows, cellHexes: [1, 1], size: [256 * cols, 256 * rows], background: 'transparent', cells, file: `${name}.png` };
  layouts[name] = lay;
  return lay;
}

function iconSection(W: (s?: string) => void, o: { name: string; title: string; intro: string; rows: { id: string; name: string; draw: string; note?: string }[]; cols: number; group: string; size: string; attach: string; where: string }) {
  const lay = iconSheet(o.name, o.group, o.rows.map((r) => r.id), o.cols);
  W(`### ${o.title} · \`${o.name}.png\``);
  W();
  W(o.intro);
  W();
  W('| Cell | Asset ID | Name | Draw |');
  W('|---|---|---|---|');
  o.rows.forEach((r, i) => W(`| ${Math.floor(i / o.cols) + 1}.${(i % o.cols) + 1} | \`${r.id}\` | ${r.name}${r.note ? ` <sub>${r.note}</sub>` : ''} | ${r.draw} |`));
  W();
  W(
    sheetTable([
      ['Image', `${lay.size[0]} × ${lay.size[1]} px (or larger, same proportions) — ${lay.cols} columns × ${lay.rows} rows, cells 256 × 256${o.rows.length < lay.cols * lay.rows ? `; the last ${lay.cols * lay.rows - o.rows.length} cell(s) *empty*` : ''}`],
      ['Background', TRANSPARENT],
      ['Attach', o.attach],
      ['Shown', o.where],
      ['Cuts into', `\`assets-source/icons/final/<asset ID>.png\` (${o.rows.length} files); the importer makes them ${o.size}`],
      ['Then', `\`npm run sprites:cut -- --only ${o.name}\`, then \`npm run icons:import\``],
    ]),
  );
  W();
  W('```text');
  W(`Paint one sheet of game icons for the fantasy strategy game Pantheon Realms, in the style of the attached icons: a single object per icon, rich painted colours with a soft rim light, slightly three-quarter view, a crisp silhouette readable at 24 px.`);
  W(`Image ${lay.size[0]} × ${lay.size[1]} px: an invisible grid of ${lay.cols} columns × ${lay.rows} rows of equal square cells. Each icon centred in its cell, filling about 75 % of it. No grid lines, no labels, no numbers, no letters, no text. ${TRANSPARENT}`);
  o.rows.forEach((r, i) => W(`Row ${Math.floor(i / o.cols) + 1}, cell ${(i % o.cols) + 1}: ${r.draw}.`));
  for (let i = o.rows.length; i < lay.cols * lay.rows; i++) W(`Row ${Math.floor(i / o.cols) + 1}, cell ${(i % o.cols) + 1}: empty.`);
  W('```');
  W();
}

/** The draw line of an icon from the catalog brief ("Name: … Draw: …" or "Name — description"). */
function drawOf(r: InvRow | undefined, fallback: string): string {
  if (!r) return fallback;
  const m = /Draw:\s*([^]*?)\.?$/.exec(r.brief);
  if (m) return m[1]!.trim();
  return r.brief.replace(/^[^—:]*[—:]\s*/, '').replace(/\.$/, '').trim() || fallback;
}

function writeBrief12(c: ContentCatalog): { md: string; placements: unknown } {
  const L: string[] = [];
  const W = (s = '') => L.push(s);
  const placeholders = readJson<{ assets: Record<string, { file: string; provenance: string; size?: [number, number] }> }>('assets-runtime/placeholders/manifest.json').assets;
  const art = readJson<{ assets: Record<string, { file: string }> }>('assets-runtime/art/manifest.json').assets;
  const finals = readJson<{ assets: Record<string, { file: string }> }>('assets-runtime/ui/final-manifest.json').assets;
  const sprites = readJson<{ effects: Record<string, unknown> }>('assets-runtime/sprites/manifest.json');
  const inv = inventory();
  const delivered = (id: string) => id in art || id in finals;

  // --- Gather the town items (dwellings, services) per pantheon from the catalog.
  interface TownItem {
    id: string;
    name: string;
    what: string;
    today: string;
    standIn: boolean;
  }
  const towns: { p: string; dwellings: TownItem[]; services: TownItem[]; placements: { id: string; label: string; x: number; y: number; width: number; kind: string }[] }[] = [];
  for (const p of PANTHEONS) {
    const arch = Object.values(c.townArchetypes).find((a) => a.pantheonId === p);
    if (!arch) continue;
    const dwellings: TownItem[] = [];
    const services: TownItem[] = [];
    const dslots = arch.slots.filter((s) => s.kind === 'dwelling').sort((a, b) => (a.tier ?? 0) - (b.tier ?? 0));
    for (const s of dslots) {
      for (const bid of s.chain) {
        const b = c.buildings[bid]!;
        const fam = b.dwelling ? c.families[b.dwelling.familyId] : undefined;
        const creature = fam ? c.creatures[b.dwelling!.form === 'base' ? fam.baseCreatureId : fam.upgradedCreatureId] : undefined;
        const ph = placeholders[b.artAssetId];
        const standIn = !!ph && /stand-in/i.test(ph.provenance);
        const label = ph ? /PM-\d\.png' \((.*?)\)\. Dev/.exec(ph.provenance)?.[1] ?? '' : '';
        dwellings.push({
          id: b.artAssetId,
          name: b.name,
          what: `${b.dwelling!.form === 'base' ? 'the dwelling' : 'the upgraded dwelling'} of the ${creature?.name ?? fam?.name ?? 'creatures'} (tier ${fam?.tier ?? s.tier})`,
          today: delivered(b.artAssetId) ? 'delivered' : standIn ? `stand-in crop (${label})` : ph ? 'concept-board crop' : 'nothing',
          standIn,
        });
      }
    }
    for (const role of SERVICES) {
      const slot = arch.slots.find((s) => s.kind === 'support' && (s.role ?? s.id) === role);
      if (!slot) continue;
      const b = c.buildings[slot.chain[0] ?? '']!;
      const ph = placeholders[`town.${p}.support.${role}`];
      services.push({
        id: b.artAssetId,
        name: b.name,
        what: b.summary,
        today: delivered(b.artAssetId) ? 'delivered' : ph ? (/stand-in/i.test(ph.provenance) ? 'stand-in crop' : 'concept-board crop') : 'nothing',
        standIn: !!ph && /stand-in/i.test(ph.provenance),
      });
    }
    towns.push({ p, dwellings, services, placements: arch.slots.map((s) => ({ id: s.id, label: s.label, x: s.placement.x, y: s.placement.y, width: s.placement.width, kind: s.kind })) });
  }
  const missingDw = towns.flatMap((t) => t.dwellings).filter((d) => d.today !== 'delivered');
  const standIns = missingDw.filter((d) => d.standIn).length;
  const missingSv = towns.flatMap((t) => t.services).filter((d) => d.today !== 'delivered');
  const bgs = PANTHEONS.filter((p) => !delivered(`town.${p}.background`));

  const climates = Object.values(c.climates ?? {}).filter((r) => !delivered(r.iconAssetId));
  const workshop = [...inv.values()].filter((r) => r.assetId.startsWith('icon.artifact.') && r.current.type !== 'art' && !delivered(r.assetId));
  const markers = [...inv.values()].filter((r) => r.assetId.startsWith('icon.marker.') && r.current.type !== 'art' && !delivered(r.assetId));
  const sets = Object.keys(c.artifactSets ?? {}).map((id) => `icon.set.${id}`).filter((id) => !delivered(id));
  const abilities = Object.values(c.abilities).filter((a) => a.implementationStatus === 'implemented').map((a) => `icon.ability.${a.id}`).filter((id) => !delivered(id));
  // Story characters whose dialogue window still has no painted bust (with a bust, the square portrait is only a fallback).
  const story = [...inv.values()].filter((r) => r.group === 'Story portrait' && r.priority === 'now' && r.current.type !== 'art' && !delivered(r.assetId));
  const godFx = !('fx.god.commit' in sprites.effects);
  // Parts with something left to paint get the next letter (A, B, …); delivered parts drop out.
  const counts: [string, number][] = [
    ['dwellings', missingDw.length],
    ['services', missingSv.length],
    ['climate', climates.length],
    ['workshop', workshop.length],
    ['markers', markers.length],
    ['backgrounds', bgs.length],
    ['godfx', godFx ? 1 : 0],
    ['badges', sets.length + abilities.length],
    ['story', story.length],
  ];
  const letter = new Map(counts.filter(([, n]) => n > 0).map(([k], i) => [k, String.fromCharCode(65 + i)]));
  const has = (k: string) => letter.has(k);
  const L_ = (k: string) => letter.get(k) ?? '';

  W('# Pantheon Realms — Art Brief 12 for GPT-6: THE VISUALS STILL MISSING');
  W();
  W(`Generated ${TODAY} by \`npm run art:brief12\` from the game itself (owner request: “give me a file that explains GPT 6 what visuals are still lacking, what we want to have in them and how we need it to add them later to the game”). Everything listed here is shown in the game **today** with a stand-in — a crop of a concept board, a crop of a *different* building, a generated placeholder or an interface glyph — and is replaced by the delivered file **without a code change**: drop the sheet, cut it, run the importer.`);
  W();
  W('Already delivered and **not** in this brief: creatures and their animations, map heroes (idle, walk, prepare, cast), map sites and decorations, battle obstacles and siege pieces, the 177 magic and Favor effects, terrain, battlefields and skies, story busts (the Herald’s too, 2026-10-04), covers, endings and mission art, miracle cards, splashes and banners, god and hero portraits, the god-card icons, the 72 town-building levels of Brief 10, spells, skills, every artifact (the nine Workshop treasures delivered 2026-10-04), the artifact-set emblems and creature-ability badges (2026-10-04), interface icons, cursors, emblems and the twelve quieter opening paintings (2026-10-04).');
  W();
  W('## What is still missing — at a glance');
  W();
  W('| Part | What | Count | Today in the game | Sheets | Importer | Priority |');
  W('|---|---|---|---|---|---|---|');
  if (has('dwellings')) W(`| ${L_('dwellings')} | Creature dwellings (base + upgraded), town cutouts | ${missingDw.length} | crops from the concept boards; **${standIns} of them show a different building** (stand-ins) | ${towns.length} (\`sheet.town.<pantheon>.dwellings\`) | \`art:import\` | **high** |`);
  if (has('services')) W(`| ${L_('services')} | Town services (Tavern, Marketplace, Resource Depot, Workshop, Training Academy, Watchtower, Artifact Merchant) | ${missingSv.length} | crops from the concept boards, with ground and cut edges | ${towns.length} (\`sheet.town.<pantheon>.services\`) | \`art:import\` | **high** |`);
  if (has('climate')) W(`| ${L_('climate')} | Climate icons (new climate rules) | ${climates.length} | an interface glyph in the battle chip | 1 (\`sheet.icons.climate\`) | \`icons:import\` | **high** |`);
  if (has('workshop')) W(`| ${L_('workshop')} | Workshop artifacts (tier-1 treasures) | ${workshop.length} | generated placeholder | 1 (\`sheet.icons.workshop\`) | \`icons:import\` | medium |`);
  if (has('markers')) W(`| ${L_('markers')} | Map markers of the random-map sites | ${markers.length} | the nearest older marker | 1 (\`sheet.icons.sitemarkers\`) | \`icons:import\` | medium |`);
  if (has('backgrounds')) W(`| ${L_('backgrounds')} | Town backgrounds, sharper repaint (optional) | ${bgs.length} | the owner’s concept paintings at 1448 × 1086 | — (single paintings) | \`art:import\` | medium |`);
  if (has('godfx')) W(`| ${L_('godfx')} | God commitment effect (optional) | 1 | the Anointing gift’s burst | — (one strip) | \`sprites:import\` | low |`);
  if (has('badges')) W(`| ${L_('badges')} | Artifact-set emblems and creature-ability badges | ${sets.length + abilities.length} | a coloured gem / an interface glyph | 2 (\`sheet.icons.sets\`, \`sheet.icons.abilities\`) | \`icons:import\` | low |`);
  if (has('story')) W(`| ${L_('story')} | Square portraits of story characters without a bust | ${story.length} | generated stand-in | 1 (\`sheet.storyportrait\`) | \`icons:import\` | low |`);
  W();
  W(`**Suggested order:** ${[has('dwellings') && has('services') ? `${L_('dwellings')} and ${L_('services')} together per pantheon (each town then looks finished)` : '', has('climate') ? `${L_('climate')} (the climate rules are new and still show glyphs)` : '', has('markers') ? `then ${L_('markers')}` : '', has('backgrounds') ? `${L_('backgrounds')} if the towns look soft on large screens` : '', 'and the rest when convenient'].filter(Boolean).join(', ')}.`);
  W();
  W('## 1. Rules for every sheet');
  W();
  W(COMMON_RULES);
  W();
  W('## 2. How a delivery enters the game (the same for every part)');
  W();
  W(`1. Save the image under its exact file name — sheets in \`assets-source/sprites/sheets/\`${has('backgrounds') ? `, single paintings (part ${L_('backgrounds')}) in \`assets-source/art/final/\`` : ''}${has('godfx') ? `, the effect strip (part ${L_('godfx')}) in \`assets-source/sprites/final/\`` : ''}.`);
  W('2. Sheets: `npm run sprites:cut -- --only <sheet name>` writes one file per cell, named by asset ID, into `assets-source/art/final/` (town art) or `assets-source/icons/final/` (icons and portraits). Check `assets-source/sprites/sheets/_preview/<sheet name>.png`.');
  W('3. Run the importer of the part: `npm run art:import` (town art → `assets-runtime/art/town/`, ≤ 512 px with transparency for buildings, ≤ 2048 px for backgrounds), `npm run icons:import -- --new` (new icons and portraits → `assets-runtime/ui/icons/final/`, sized per the icon catalog; without `--new` every icon is re-encoded and re-dated), `npm run sprites:import` (effect strip → the sprite manifest).');
  W('4. The game finds every picture by its asset ID (town buildings by their level’s ID, icons by `icon.*`, the effect by `fx.god.commit`); the stand-in disappears by itself. Then `npm run icons:catalog` updates ICON_CATALOG.md, and `npm run check` must stay green.');
  W('5. Never re-cut all sheets and never edit the delivered files in `assets-source/sprites/final/` by hand: cut a new or corrected sheet alone with `--only`.');
  W();

  // --- Dwellings
  if (has('dwellings')) {
  W(`## Part ${L_('dwellings')} — Creature dwellings (town cutouts)`);
  W();
  W(`Each town has seven dwellings, one per creature tier, each with its base building and its upgraded building (${towns.length * 14} pictures). Today they are cut from the owner’s concept boards: they stand on chunks of rock or ground, many are cut off at the edges, and **${standIns}** show a different building than the dwelling they stand for (marked *stand-in* below — paint the real dwelling of that creature). They should match the **delivered town levels of Brief 10** (\`assets-source/sprites/sheets/sheet.town.<pantheon>.levels.png\`): the building alone, no ground.`);
  W();
  W(`Each sheet: **1536 × 1536 px**, 4 columns × 4 rows of square cells (384 × 384): tier 1 base, tier 1 upgraded, tier 2 base, tier 2 upgraded — and so on, left to right, top to bottom; the last two cells *empty*. ${TRANSPARENT} The building alone — **no ground plane, no rock base, no cast shadow, no sky** — seen from the town view’s camera (slightly above, three-quarter), its base on an invisible ground line at about 85 % of the cell height, centred. **The upgraded building is the base building made grander** (the same silhouette with added storeys, banners, gilding, braziers, statues), so the two read as one building improved. Each dwelling shows who lives there: the creature’s statue, emblem, nest, kennel, stable or forge in its architecture (not the creature itself standing in front).`);
  W();
  for (const t of towns) {
    const name = `sheet.town.${t.p}.dwellings`;
    const cells: Cell[] = t.dwellings.map((d, i) => ({ row: Math.floor(i / 4), col: i % 4, name: d.id, kind: 'figure', out: `assets-source/art/final/${d.id}.png` }));
    layouts[name] = { group: 'G12', target: 'items', cols: 4, rows: 4, cellHexes: [1, 1], size: [1536, 1536], background: 'transparent', cells, file: `${name}.png` };
    W(`### ${cap(t.p)} dwellings · \`${name}.png\``);
    W();
    W('| Cell | Asset ID | Building | For | Today |');
    W('|---|---|---|---|---|');
    t.dwellings.forEach((d, i) => W(`| ${Math.floor(i / 4) + 1}.${(i % 4) + 1} | \`${d.id}\` | ${d.name} | ${d.what} | ${d.standIn ? `**${d.today}** — paint the real one` : d.today} |`));
    W();
    W(
      sheetTable([
        ['Image', '1536 × 1536 px (or larger, same proportions) — 4 columns × 4 rows, cells 384 × 384; cells 4.3 and 4.4 *empty*'],
        ['Background', TRANSPARENT],
        ['Attach', `\`${TOWN_BOARD[t.p]}\` (the town board — architecture and colours); \`assets-source/sprites/sheets/sheet.town.${t.p}.levels.png\` (the delivered levels — match their finish); today’s crops \`assets-runtime/placeholders/town/${t.p}/dwelling.tier<N>.<base|upgraded>.png\` (keep the ones that are not stand-ins)`],
        ['Cuts into', `\`assets-source/art/final/town.${t.p}.dwelling.tier<1–7>.<base|upgraded>.png\` (14 files)`],
        ['Then', `\`npm run sprites:cut -- --only ${name}\`, then \`npm run art:import\``],
      ]),
    );
    W();
    W('```text');
    W(`Paint one sheet of creature dwellings for the town of the fantasy strategy game Pantheon Realms (${cap(t.p)} town), in the style and architecture of the attached town board and the attached sheet of town buildings.`);
    W(`Image 1536 × 1536 px: an invisible grid of 4 columns × 4 rows of equal square cells. No grid lines, no labels, no numbers, no text. ${TRANSPARENT}`);
    t.dwellings.forEach((d, i) => W(`Row ${Math.floor(i / 4) + 1}, cell ${(i % 4) + 1}: ${d.name} — ${d.what}${i % 2 === 1 ? ': the same building as the cell before, made grander' : ''}${d.standIn ? ' (design it fresh; the attached crop shows another building)' : ''}.`));
    W('Row 4, cells 3–4: empty.');
    W(`Each building alone, seen slightly from above in three-quarter view as on the town board, its base on an invisible ground line at 85 % of the cell height, centred; no ground, no rocks under it, no shadow, no sky. Each shows who lives there through its architecture (a statue, emblem, nest, stable or forge of that creature). Palette: ${PALETTE[t.p]}.`);
    W('```');
    W();
  }

  }

  // --- Services
  if (has('services')) {
  W(`## Part ${L_('services')} — Town services (one level each)`);
  W();
  W('Seven locations of every town have a single level and still show a crop of the concept board (on its ground, edges cut). They become cutouts like the Brief 10 levels. The Civic Hall, Temple, Mage Guild and Fortifications are already delivered (Brief 10).');
  W();
  W(`Each sheet: **1536 × 768 px**, 4 columns × 2 rows of square cells (384 × 384), the last cell *empty*. ${TRANSPARENT} Same camera, ground line (85 %) and finish as Part A; no ground, no shadow, no sky.`);
  W();
  for (const t of towns) {
    const name = `sheet.town.${t.p}.services`;
    const cells: Cell[] = t.services.map((d, i) => ({ row: Math.floor(i / 4), col: i % 4, name: d.id, kind: 'figure', out: `assets-source/art/final/${d.id}.png` }));
    layouts[name] = { group: 'G12', target: 'items', cols: 4, rows: 2, cellHexes: [1, 1], size: [1536, 768], background: 'transparent', cells, file: `${name}.png` };
    W(`### ${cap(t.p)} services · \`${name}.png\``);
    W();
    W('| Cell | Asset ID | Building | What it does | Today |');
    W('|---|---|---|---|---|');
    t.services.forEach((d, i) => W(`| ${Math.floor(i / 4) + 1}.${(i % 4) + 1} | \`${d.id}\` | ${d.name} | ${d.what} | ${d.today} |`));
    W();
    W(
      sheetTable([
        ['Image', '1536 × 768 px (or larger, same proportions) — 4 columns × 2 rows, cells 384 × 384; cell 2.4 *empty*'],
        ['Background', TRANSPARENT],
        ['Attach', `\`${TOWN_BOARD[t.p]}\`; \`assets-source/sprites/sheets/sheet.town.${t.p}.levels.png\`; today’s crops \`assets-runtime/placeholders/town/${t.p}/support.<location>.png\` (keep their architecture)`],
        ['Cuts into', t.services.map((d) => `\`${d.id}.png\``).join(', ')],
        ['Then', `\`npm run sprites:cut -- --only ${name}\`, then \`npm run art:import\``],
      ]),
    );
    W();
    W('```text');
    W(`Paint one sheet of town buildings for the fantasy strategy game Pantheon Realms (${cap(t.p)} town), in the style and architecture of the attached town board and the attached sheet of town buildings.`);
    W(`Image 1536 × 768 px: an invisible grid of 4 columns × 2 rows of equal square cells. No grid lines, no labels, no numbers, no text. ${TRANSPARENT}`);
    t.services.forEach((d, i) => W(`Row ${Math.floor(i / 4) + 1}, cell ${(i % 4) + 1}: ${d.name} — ${d.what.replace(/\.$/, '')}; keep the architecture of the attached crop of this building.`));
    W('Row 2, cell 4: empty.');
    W(`Each building alone, seen slightly from above in three-quarter view as on the town board, its base on an invisible ground line at 85 % of the cell height, centred; no ground, no rocks under it, no shadow, no sky. Palette: ${PALETTE[t.p]}.`);
    W('```');
    W();
  }

  }

  // --- Climate icons
  if (has('climate')) {
  W(`## Part ${L_('climate')} — Climate icons`);
  W();
  iconSection(W, {
    name: 'sheet.icons.climate',
    title: 'Climate icons',
    intro: 'The climate rules (skirmish option, new on 2026-10-04) change every battle a little on some map climates — fog shortens shots, sand slows the ground troops, storms keep flyers low. The battle shows a chip with the weather’s name and this icon; the encounter dialog shows it too. One icon per climate rule; each must read as its weather at 20 px.',
    rows: climates.map((r) => ({ id: r.iconAssetId, name: `${r.name} (${human(r.id)})`, draw: CLIMATE_ICON_DRAW[r.id] ?? `the weather “${r.name}”`, note: r.summary.replace(/^[^:]*:\s*/, '') })),
    cols: 3,
    group: 'G12',
    size: '128 × 128 px',
    attach: '`assets-runtime/ui/icons/res.favor.png`, `assets-runtime/ui/icons/attr.attack.png` (the icon style to match)',
    where: 'Battle (round box chip), encounter dialog',
  });

  }

  // --- Workshop artifacts
  if (has('workshop')) {
  W(`## Part ${L_('workshop')} — Workshop artifacts`);
  W();
  iconSection(W, {
    name: 'sheet.icons.workshop',
    title: 'Workshop artifacts (tier-1 treasures)',
    intro: 'The Workshop sells four tier-1 items a week. These seven treasures were added on 2026-10-04 and still show a generated placeholder in the hero screen, the Workshop and the Encyclopedia. Simple, homely objects — they must look cheaper than the delivered relics.',
    rows: workshop.map((r) => ({ id: r.assetId, name: r.name, draw: drawOf(r, r.name), note: (r.details ?? '').split('·')[1]?.trim() })),
    cols: 4,
    group: 'G12',
    size: '128 × 128 px',
    attach: 'three delivered artifact icons from `assets-runtime/ui/icons/final/` (e.g. `icon.artifact.*.png`) — match their framing and finish',
    where: 'Hero screen, Workshop, Artifact Merchant, Encyclopedia',
  });

  }

  // --- Markers
  if (has('markers')) {
  W(`## Part ${L_('markers')} — Map markers of the random-map sites`);
  W();
  iconSection(W, {
    name: 'sheet.icons.sitemarkers',
    title: 'Site markers',
    intro: 'The tile panel of the adventure map and the Journal show a marker for each site. The eight sites added for random maps borrow the nearest older marker (a learning stone shows the story marker, a prison the hero marker). The key tent and key gate are tinted by the key’s colour in the game: paint them in light neutral colours.',
    rows: markers.map((r) => ({ id: r.assetId, name: r.name, draw: drawOf(r, r.name) })),
    cols: 4,
    group: 'G12',
    size: '96 × 96 px',
    attach: '`assets-runtime/ui/icons/marker.mine.png` and two other markers from `assets-runtime/ui/icons/` (the marker style to match)',
    where: 'Adventure map tile panel, Journal',
  });

  }

  // --- Town backgrounds
  if (has('backgrounds')) {
  W(`## Part ${L_('backgrounds')} — Town backgrounds (optional sharper repaint)`);
  W();
  W(`The town screen paints the buildings over a background painting. Today’s six backgrounds are the owner’s concept paintings at **1448 × 1086 px** — they look right but soft on large screens. A repaint at **2048 × 1536 px** (the same 4:3) keeps the composition **exactly**: every plot where a building stands stays where it is, at the same size, empty (the game draws the buildings). Use today’s painting as the base image and the layout guide as a check: \`assets-source/art/briefs/guides/town.<pantheon>.layout.png\` marks every location’s footprint (blue: dwellings, gold: services), written by \`python3 tools/assets/briefs/town_guides.py\`.`);
  W();
  W('| Pantheon | File | Today | Keeps |');
  W('|---|---|---|---|');
  for (const p of bgs) W(`| ${cap(p)} | \`town.${p}.background.png\` → \`assets-source/art/final/\` | \`assets-runtime/placeholders/town/${p}/background.jpg\` | ${TOWN_SETTING[p]} |`);
  W();
  W(
    sheetTable([
      ['Image', '2048 × 1536 px, opaque, 4:3 (the importer warns on any other proportion)'],
      ['Attach', 'today’s background (the base), its layout guide, the town board'],
      ['Then', '`npm run art:import` (the town shows it in place of the concept painting)'],
    ]),
  );
  W();
  W('```text');
  W('Repaint the attached town background for the fantasy strategy game Pantheon Realms at 2048 × 1536 px, keeping its composition exactly: the same terraces, plots, paths, bridges, waterfalls and horizon in the same places and at the same sizes (the second attachment marks every plot that must stay an empty, flat, walkable platform — the game paints the buildings there). Sharpen and enrich the painting: crisper stone, water and foliage, warm sunlight, atmospheric depth. No buildings on the marked plots, no people, no text, no frame.');
  W('```');
  W();

  }

  // --- God commit fx
  if (has('godfx')) {
    W(`## Part ${L_('godfx')} — The god accepts a commitment (optional effect strip)`);
    W();
    W('When a player commits to a minor god, the god’s card on the Pantheon screen shows a short moment: rays, a burst over the portrait and the committed seal pressed onto the card (1.7 s; none under Reduce motion). The burst is today the Anointing gift’s golden strip; a strip of its own replaces it by name.');
    W();
    W(
      sheetTable([
        ['File', '`assets-source/sprites/final/sprite.fx.god.commit.png` + `sprite.fx.god.commit.json` (`{"frames": 10, "fps": 12, "loop": false, "additive": false}`)'],
        ['Strip', '10 frames left to right, each 256 × 256 px (2560 × 256), transparent, centred at 62 % of the frame height like the other interface bursts'],
        ['Look', 'a ring of soft golden light opens behind the portrait, a column of light descends, a laurel-like halo of rays flares and settles into a few drifting motes; no symbols, no text, no pantheon-specific shapes (it serves every pantheon)'],
        ['Then', '`npm run sprites:import` (the card plays `fx.god.commit` instead of the Anointing burst)'],
      ]),
    );
    W();
  }

  // --- Sets and abilities
  if (has('badges')) {
  W(`## Part ${L_('badges')} — Artifact-set emblems and creature-ability badges`);
  W();
  if (sets.length) iconSection(W, {
    name: 'sheet.icons.sets',
    title: 'Artifact-set emblems',
    intro: 'A set’s badge marks its pieces on the hero screen and the item card; today it is a coloured gem. Each emblem combines the set’s pieces into one badge.',
    rows: sets.map((id) => {
      const r = inv.get(id);
      const set = c.artifactSets?.[id.replace(/^icon\.set\./, '')];
      return { id, name: set?.name ?? r?.name ?? id, draw: r ? r.brief.replace(/^Emblem for the [^:]*:\s*/, 'emblem: ').replace(/\.$/, '') : `emblem of ${set?.name ?? id}` };
    }),
    cols: 5,
    group: 'G12',
    size: '96 × 96 px',
    attach: 'the delivered icons of each set’s pieces (`assets-runtime/ui/icons/final/icon.artifact.<piece>.png`)',
    where: 'Hero screen (set badges), item card, Encyclopedia',
  });
  if (abilities.length) iconSection(W, {
    name: 'sheet.icons.abilities',
    title: 'Creature-ability badges',
    intro: 'The ability badge next to an ability’s name on army slots, creature details and the Encyclopedia; today an interface glyph. Small and bold: they are shown at 16–24 px.',
    rows: abilities.map((id) => {
      const ab = c.abilities[id.replace(/^icon\.ability\./, '')];
      const r = inv.get(id);
      return { id, name: ab?.name ?? id, draw: r ? r.brief.replace(/^[^:]*:\s*/, '').replace(/\.$/, '') : (ab?.summary ?? id) };
    }),
    cols: 5,
    group: 'G12',
    size: '64 × 64 px',
    attach: '`assets-runtime/ui/icons/attr.attack.png`, `assets-runtime/ui/icons/attr.defense.png` (the icon style to match)',
    where: 'Army slots, creature detail, battle stack info, Encyclopedia',
  });
  }

  // --- Story portraits
  if (has('story')) {
  W(`## Part ${L_('story')} — Square portraits of story characters`);
  W();
  W('These story characters have no painted bust yet: the dialogue window shows a generated stand-in. Paint a square head-and-shoulders portrait.');
  W();
  const scols = 5;
  const srows = Math.max(1, Math.ceil(story.length / scols));
  const scells: Cell[] = story.map((r, i) => ({ row: Math.floor(i / scols), col: i % scols, name: r.assetId, kind: 'portrait', out: `assets-source/icons/final/${r.assetId}.png` }));
  layouts['sheet.storyportrait'] = { group: 'G12', target: 'portraits', cols: scols, rows: srows, cellHexes: [1, 1], size: [384 * scols, 384 * srows], background: 'opaque', cells: scells, file: 'sheet.storyportrait.png' };
  W('| Cell | Asset ID | Character | Bust to follow |');
  W('|---|---|---|---|');
  story.forEach((r, i) => {
    const bust = r.assetId.replace(/\.portrait$/, '.bust');
    W(`| ${Math.floor(i / scols) + 1}.${(i % scols) + 1} | \`${r.assetId}\` | ${r.name} (${r.pantheon ?? ''}) | ${existsSync(join(ROOT, 'assets-source', 'art', 'final', `${bust}.png`)) ? `\`assets-source/art/final/${bust}.png\`` : 'none — design from the campaign text'} |`);
  });
  W();
  W(
    sheetTable([
      ['Image', `${384 * scols} × ${384 * srows} px (or larger, same proportions) — ${scols} columns × ${srows} rows of square paintings (384 × 384) separated by thin straight black gutters; may come in two parts${story.length < scols * srows ? `; the last ${scols * srows - story.length} cell(s) *empty* (flat black)` : ''}`],
      ['Attach', 'each character’s bust (table above)'],
      ['Cuts into', '`assets-source/icons/final/<asset ID>.png`'],
      ['Then', '`npm run sprites:cut -- --only sheet.storyportrait`, then `npm run icons:import`'],
    ]),
  );
  W();
  W('```text');
  W(`Paint one sheet of square character portraits for the fantasy strategy game Pantheon Realms, each from the attached painted bust of the same character: the same face, hair, costume and colours, head and shoulders, three-quarter view facing slightly right, eyes about 40 % from the top, a soft painted background in the character’s pantheon colours.`);
  W(`Image ${384 * scols} × ${384 * srows} px: ${scols} columns × ${srows} rows of equal square paintings separated by thin straight black gutters. No labels, no numbers, no text.`);
  story.forEach((r, i) => W(`Row ${Math.floor(i / scols) + 1}, cell ${(i % scols) + 1}: ${r.name}${r.pantheon && r.pantheon !== 'herald' ? ` (${r.pantheon})` : ''} — as the attached bust.`));
  for (let i = story.length; i < scols * srows; i++) W(`Row ${Math.floor(i / scols) + 1}, cell ${(i % scols) + 1}: empty (flat black).`);
  W('```');
  W();
  }

  W('## Not needed now');
  W();
  W('* **Square portraits of the story characters who have a painted bust** (all of them since the Herald’s bust of 2026-10-04): the dialogue window shows the bust; the square portrait is only a fallback.');
  W('* **Neutral map hero** (`heroes.neutral` in the sprite manifest): a tinted silhouette for a hero without a pantheon avatar; every hero in the content has its pantheon’s rider, so nothing shows it today.');
  W('* **Opening-screen paintings, logo, app icon:** the owner’s own art (`assets-source/ui/`, `python3 tools/assets/prepare_ui_art.py`); the twelve quieter opening paintings were delivered on 2026-10-04 (the earlier ones are archived, unused, in `assets-source/ui/backgrounds-old/`).');
  W('* **Music and sounds** are not visuals: the map music per pantheon is handled separately (royalty-free tracks, audio manifest).');
  W();
  W('## Checklist');
  W();
  W(`* ${Object.keys(layouts).length} sheets named exactly as above in \`assets-source/sprites/sheets/\`${has('backgrounds') ? `, up to ${bgs.length} background paintings in \`assets-source/art/final/\`` : ''}${has('godfx') ? ', one effect strip in `assets-source/sprites/final/`' : ''}.`);
  W('* `npm run sprites:cut -- --only <sheet name>` for each new sheet (check the previews), then the part’s importer; `npm run icons:catalog`; `npm run check`.');
  W('* In the game: a town of each pantheon at several levels (every dwelling and service its own cutout, in proportion over the background), a battle on a fog, sand and storm map (the climate chip’s icon), the map tile panel on a random map’s new sites, the Pantheon screen when a god is committed.');
  return { md: L.join('\n') + '\n', placements: towns.map((t) => ({ pantheon: t.p, background: placeholders[`town.${t.p}.background`]?.file ?? null, slots: t.placements })) };
}

it('writes art brief 12 and its sheet layouts', () => {
  const c = buildCatalog();
  const { md, placements } = writeBrief12(c);
  writeFileSync(join(BRIEFS, 'GPT6_BRIEF_12_REMAINING_VISUALS.md'), md);
  writeFileSync(
    join(ROOT, 'assets-source', 'sprites', 'sheet-layouts.brief12.json'),
    JSON.stringify({ schema: 'pantheon-realms-sheets-1', generated: TODAY, note: 'Written by npm run art:brief12 (GPT6_BRIEF_12); read by npm run sprites:cut with sheet-layouts.json. Rows and columns count from 0.', sheets: layouts }, null, 1) + '\n',
  );
  mkdirSync(join(BRIEFS, 'guides'), { recursive: true });
  writeFileSync(join(BRIEFS, 'guides', 'town-placements.json'), JSON.stringify({ note: 'Town locations (x = centre, y = foot line, width — percent of the 4:3 scene), from the content catalog; drawn by tools/assets/briefs/town_guides.py.', towns: placements }, null, 1) + '\n');
  console.log(`brief 12: ${Object.keys(layouts).length} sheets, ${Object.values(layouts).reduce((n, l) => n + l.cells.length, 0)} cells`);
});
