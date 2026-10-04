/**
 * Art briefs 8–11 for GPT-6 (development tool; never packaged in the game).
 * Owner request 2026-10-04:
 *   8  — the gods' portraits and the icons that let the god cards show their
 *        price and advantages with less text;
 *   9  — the heroes' portraits;
 *   10 — the town buildings whose levels still share one picture, as sheets
 *        cut into one file per level;
 *   11 — the map heroes' remaining animations (readying for battle, casting).
 *
 * Everything is a SHEET (many pictures per image) that `npm run sprites:cut`
 * cuts into the single files the importers take. The rows come from the
 * content catalog (gods, heroes, town chains), so content added later appears
 * on the next run. Writes assets-source/art/briefs/GPT6_BRIEF_8…11*.md and the
 * cutter's layouts in assets-source/sprites/sheet-layouts.briefs.json.
 *
 * Run: npm run art:briefs
 */
import { it } from 'vitest';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildCatalog } from '@pr/content';
import type { ContentCatalog, GodDefinition, HeroDefinition } from '@pr/rules';
import { GOD_ICONS } from './godIcons';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const BRIEFS = join(ROOT, 'assets-source', 'art', 'briefs');
const TODAY = '2026-10-04';
const PANTHEONS = ['greek', 'norse', 'egyptian', 'japanese', 'celtic', 'mesoamerican'] as const;

const BOARD: Record<string, string> = {
  greek: 'support images/ChatGPT Image Sep 29, 2026, 03_35_30 PM-1.png',
  norse: 'support images/ChatGPT Image Sep 29, 2026, 03_35_32 PM-2.png',
  egyptian: 'support images/ChatGPT Image Sep 29, 2026, 03_35_35 PM-3.png',
  japanese: 'support images/ChatGPT Image Sep 29, 2026, 03_35_37 PM-4.png',
  celtic: 'support images/ChatGPT Image Sep 29, 2026, 03_35_41 PM-5.png',
  mesoamerican: 'support images/ChatGPT Image Sep 29, 2026, 03_35_45 PM-6.png',
};
const HERO_BOARD: Record<string, string> = {
  greek: 'support images/heros_full_view/ChatGPT Image Oct 1, 2026, 01_27_31 PM-1.png',
  norse: 'support images/heros_full_view/ChatGPT Image Oct 1, 2026, 01_27_33 PM-2.png',
  egyptian: 'support images/heros_full_view/ChatGPT Image Oct 1, 2026, 01_27_35 PM-3.png',
  japanese: 'support images/heros_full_view/ChatGPT Image Oct 1, 2026, 01_27_37 PM-4.png',
  celtic: 'support images/heros_full_view/ChatGPT Image Oct 1, 2026, 01_27_39 PM-5.png',
  mesoamerican: 'support images/heros_full_view/ChatGPT Image Oct 1, 2026, 01_27_48 PM-6.png',
};
const TOWN_BOARD: Record<string, string> = {
  greek: 'support images/ChatGPT Image Sep 29, 2026, 04_17_21 PM-1.png',
  norse: 'support images/ChatGPT Image Sep 29, 2026, 04_17_23 PM-2.png',
  egyptian: 'support images/ChatGPT Image Sep 29, 2026, 04_17_25 PM-3.png',
  japanese: 'support images/ChatGPT Image Sep 29, 2026, 04_17_27 PM-4.png',
  celtic: 'support images/ChatGPT Image Sep 29, 2026, 04_17_35 PM-5.png',
  mesoamerican: 'support images/ChatGPT Image Sep 29, 2026, 04_17_37 PM-6.png',
};
/** Each pantheon's palette and motifs (Brief 4 §3, shortened). */
const PALETTE: Record<string, string> = {
  greek: 'royal blue, white marble and gold; laurel, meander borders, bronze',
  norse: 'night navy, steel silver, fur browns and ember orange; knotwork, ravens, snow',
  egyptian: 'sand gold, white linen, lapis blue and carnelian; sun discs, spread wings, broad collars',
  japanese: 'vermilion, black lacquer and white with cherry pink and gold; clouds, waves, lacquered armour',
  celtic: 'forest green and gold with grey stone, woad blue and heather; spirals, torcs, mist',
  mesoamerican: 'turquoise and crimson with jade and gold; quetzal feathers, step-fret patterns, jade',
};

interface Cell {
  row: number;
  col: number;
  name: string;
  kind: 'portrait' | 'figure';
  out: string;
}
interface Segment {
  row: number;
  col: number;
  frames: number;
  anim: string;
  name: string;
  fps: number;
  loop: boolean;
  airborne: boolean;
}
interface Layout {
  group: string;
  target: 'portraits' | 'items' | 'hero';
  cols: number;
  rows: number;
  cellHexes: [number, number];
  groundY?: number;
  size: [number, number];
  background: 'opaque' | 'transparent';
  cells?: Cell[];
  segments?: Segment[];
  file: string;
}

const layouts: Record<string, Layout> = {};
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const chunk = <T,>(xs: readonly T[], n: number): T[][] => Array.from({ length: Math.ceil(xs.length / n) }, (_, i) => xs.slice(i * n, i * n + n));
const sheetTable = (rows: [string, string][]) => ['| Field | Value |', '|---|---|', ...rows.map(([a, b]) => `| ${a} | ${b} |`)].join('\n');
const TRANSPARENT = 'Transparent background (if transparency is impossible: a perfectly flat pure magenta #FF00FF, nothing else).';

const COMMON_RULES = [
  '1. **One sheet per request**, at the size given (about 1.6 megapixels, the size GPT-6 has delivered so far) **or larger with the same proportions**. Save it under its exact file name in **`assets-source/sprites/sheets/`**.',
  '2. **Invisible grid** of equal cells, filled left to right, rows top to bottom, exactly as listed. Every picture stays inside its own cell; nothing touches or crosses a cell edge. A cell marked *empty* stays empty.',
  '3. **No text** of any kind: no letters, numbers, runes or glyphs that read as writing, no logos, signatures, watermarks, frames, grid lines or labels.',
  '4. **Then:** `npm run sprites:cut -- --only <sheet name>` cuts that sheet (and only that one: the sheets already delivered keep their reviewed cuts) into its single files (a preview of each cut goes to `assets-source/sprites/sheets/_preview/` — check it), then the importer named in the sheet’s *Then* line. Nothing else changes: the game picks the files up by name.',
  '5. **Too much for one image?** A sheet may come as two images split between rows, `<sheet>.part1.png` (upper rows) and `<sheet>.part2.png` (the rest), each with the same columns and cell shape.',
  '6. **Style:** modern high-resolution painterly fantasy strategy art — the look of the pantheon boards and the game’s opening paintings. Not pixel art, not a photograph, not a 3D-render look, not anime, no ink outlines, no flat vector.',
  '7. **Respect.** Gods and heroes of living and historical traditions are painted dignified and powerful — never comic, never horror; adults only, no gore, no nudity.',
].join('\n');

// ---------------------------------------------------------------------------
// Brief 8 — gods
// ---------------------------------------------------------------------------

interface GodText {
  code: string;
  title: string;
  look: string;
  background: string;
  reads: string;
}

/** The per-god descriptions of Brief 4 (look, background, "reads as"), by portrait asset ID. */
function brief4(): Map<string, GodText> {
  const out = new Map<string, GodText>();
  const p = join(BRIEFS, 'GPT6_BRIEF_4_GOD_PORTRAITS.md');
  if (!existsSync(p)) return out;
  const text = readFileSync(p, 'utf8');
  const rx = /\*\*([A-Z]\d\d) · `([a-z_.]+)\.png` — ([^*]+)\*\*\n([\s\S]*?)(?=\n\*\*[A-Z]\d\d · |\n---|\n## )/g;
  const field = (body: string, label: string) => {
    const m = new RegExp(`\\* \\*${label}:\\*([\\s\\S]*?)(?=\\n\\* \\*|$)`).exec(body);
    return m ? m[1]!.replace(/\s+/g, ' ').trim() : '';
  };
  for (const m of text.matchAll(rx)) out.set(m[2]!, { code: m[1]!, title: m[3]!.trim(), look: field(m[4]!, 'Look'), background: field(m[4]!, 'Background'), reads: field(m[4]!, 'Reads as') });
  return out;
}

function godRole(g: GodDefinition): string {
  return g.role === 'patron' ? 'patron' : g.exclusivityGroup === 'first_minor' ? 'first choice' : g.exclusivityGroup === 'second_minor' ? 'second choice' : 'minor god';
}

function writeBrief8(c: ContentCatalog): string {
  const desc = brief4();
  const L: string[] = [];
  const W = (s = '') => L.push(s);
  W('# Pantheon Realms — Art Brief 8 for GPT-6: GODS (portrait sheets and god-card icons)');
  W();
  W(`Generated ${TODAY} by \`npm run art:briefs\` from the game's content (owner request: "a document for GPT-6 with all the gods' portraits and the icons needed to make the text less, with more icons indicating the price and advantage of each god").`);
  W();
  W('**Part A — 60 god portraits** on **6 sheets** (one per pantheon, ten portraits each). Every god keeps the look written for it in Brief 4 (`GPT6_BRIEF_4_GOD_PORTRAITS.md`, attach it); this brief packs them into sheets so GPT-6 paints a whole pantheon at once.');
  W();
  W('**Part B — 21 god-card icons** on **one sheet**: what a god gives (the advantage), what it costs or needs (the price) and where it stands (patron, first or second choice, committed, excluded). With them the god cards can show a row of icons with short numbers, the full sentence moving into the tooltip. (The icon row on the cards is built once these icons are delivered; until then the cards keep their sentences.)');
  W();
  W('## 1. Rules for every sheet');
  W();
  W(COMMON_RULES);
  W();
  W('## Part A — God portrait sheets');
  W();
  W('Each sheet: **1536 × 1152 px**, 4 columns × 3 rows of square paintings (384 × 384), separated by thin straight black gutters (about 1 % of the width); the last two cells empty. Every painting has its own opaque background. Each portrait: head and upper chest, front or slight three-quarter view, eyes about 40 % from the top; the face, crown and attribute inside the central circle (88 % of the cell) — the game shows it in a round gold frame from 48 to 150 px. Cut into `assets-source/icons/final/<asset ID>.png`; then `npm run icons:import`.');
  W();
  for (const p of PANTHEONS) {
    const gods = (c.pantheons[p]?.godIds ?? []).map((id) => c.gods[id]).filter((g): g is GodDefinition => !!g);
    for (const [si, group] of chunk(gods, 12).entries()) {
      const name = `sheet.god.${p}${si ? `.${si + 1}` : ''}`;
      const rowsN = Math.ceil(group.length / 4);
      const cells: Cell[] = group.map((g, i) => ({ row: Math.floor(i / 4), col: i % 4, name: g.portraitAssetId, kind: 'portrait', out: `assets-source/icons/final/${g.portraitAssetId}.png` }));
      layouts[name] = { group: 'G8', target: 'portraits', cols: 4, rows: rowsN, cellHexes: [1, 1], size: [1536, 384 * rowsN], background: 'opaque', cells, file: `${name}.png` };
      W(`### ${cap(p)} gods · \`${name}.png\``);
      W();
      W(
        sheetTable([
          ['Contains', group.map((g, i) => `row ${Math.floor(i / 4) + 1}, cell ${(i % 4) + 1}: ${g.name} (${godRole(g)})`).join('<br>') + (group.length < rowsN * 4 ? `<br>remaining cells: *empty* (flat black)` : '')],
          ['Image', `1536 × ${384 * rowsN} px (or larger, same proportions) — 4 columns × ${rowsN} rows, cells 384 × 384, thin black gutters`],
          ['Attach', `\`${BOARD[p]}\` (pantheon board — the target look); \`assets-source/art/briefs/GPT6_BRIEF_4_GOD_PORTRAITS.md\`; \`assets-source/ui/backgrounds/opening-${p}-landscape.png\` if present`],
          ['Cuts into', group.map((g) => `\`${g.portraitAssetId}.png\``).join(', ')],
          ['Then', `\`npm run sprites:cut -- --only ${name}\`, then \`npm run icons:import\``],
        ]),
      );
      W();
      W('```text');
      W(`Paint one sheet of square god portraits for the fantasy strategy game Pantheon Realms (${cap(p)} pantheon), in the style of the attached pantheon board.`);
      W(`Image 1536 × ${384 * rowsN} px: 4 columns × ${rowsN} rows of equal square paintings separated by thin straight black gutters. No labels, no numbers, no text.`);
      group.forEach((g, i) => {
        const d = desc.get(g.portraitAssetId);
        const pos = `Row ${Math.floor(i / 4) + 1}, cell ${(i % 4) + 1}`;
        W(d ? `${pos}: ${g.name}, ${g.domain} — ${d.look} Background: ${d.background} Must read as: ${d.reads.replace(/\.$/, "")}.` : `${pos}: ${g.name}, ${g.domain} — the ${p} god as the attached board and Brief 4 show; quote: “${g.quote ?? ''}”.`);
      });
      for (let i = group.length; i < rowsN * 4; i++) W(`Row ${Math.floor(i / 4) + 1}, cell ${(i % 4) + 1}: empty (flat black).`);
      W(`Each portrait: head and upper chest, front or slight three-quarter view, eyes about 40 % from the top; face, crown and the god's attribute inside the central circle (88 % of the cell); warm key light from the upper left, a cool rim light, a soft divine glow behind the head; the background darker toward the corners. Palette: ${PALETTE[p]}. Dignified and powerful, never comic or frightening. No frame, no border, no text.`);
      W('```');
      W();
    }
  }
  W('## Part B — God-card icons (one sheet)');
  W();
  const name = 'sheet.icons.gods';
  const cells: Cell[] = GOD_ICONS.map((ic, i) => ({ row: Math.floor(i / 5), col: i % 5, name: ic.id, kind: 'figure', out: `assets-source/icons/final/${ic.id}.png` }));
  layouts[name] = { group: 'G8', target: 'items', cols: 5, rows: 5, cellHexes: [1, 1], size: [1280, 1280], background: 'transparent', cells, file: `${name}.png` };
  W('The god cards today repeat sentences such as “+1 Attack for your commanders” or “Needs the Grand Temple and City Hall, 25 Favor”. With these icons a card reads as a row of symbols: the **price** (Favor coin + number, then the buildings it needs), the **advantages** (the icon of what improves — attack, defense, spell power, knowledge, morale, luck, movement, vision, mana, a resource — combined with *who* gets it, and a number), and the **state** (patron, first or second choice, committed, excluded). The attribute, morale, luck, movement, vision, mana and resource icons already exist in the game; this sheet adds the rest.');
  W();
  W('| Icon | Asset ID | Group | What it tells the player | Draw |');
  W('|---|---|---|---|---|');
  for (const ic of GOD_ICONS) W(`| ${ic.name} | \`${ic.id}\` | ${ic.group} | ${ic.meaning} | ${ic.draw} |`);
  W();
  W(
    sheetTable([
      ['Sheet file', `\`${name}.png\``],
      ['Contains', GOD_ICONS.map((ic, i) => `${Math.floor(i / 5) + 1}.${(i % 5) + 1} ${ic.name}`).join(' · ') + ` · the last ${25 - GOD_ICONS.length} cells *empty*`],
      ['Image', '1280 × 1280 px (or larger, same proportions) — 5 columns × 5 rows, cells 256 × 256'],
      ['Background', TRANSPARENT],
      ['Attach', '`assets-runtime/ui/icons/final/attr.attack.png`, `assets-runtime/ui/icons/final/res.favor.png` (the existing icon style to match)'],
      ['Cuts into', GOD_ICONS.map((ic) => `\`${ic.id}.png\``).join(', ')],
      ['Then', `\`npm run sprites:cut -- --only ${name}\`, then \`npm run icons:import\``],
    ]),
  );
  W();
  W('```text');
  W('Paint one sheet of game interface icons for the fantasy strategy game Pantheon Realms, in the style of the attached icons: a single object per icon, painted in rich gold, bronze and jewel colours with a soft rim light, slightly three-quarter view, crisp silhouette readable at 24 px.');
  W(`Image 1280 × 1280 px: an invisible grid of 5 columns × 5 rows of equal cells. Each icon centred in its cell, filling about 75 % of it. No grid lines, no labels, no numbers, no letters, no text. ${TRANSPARENT}`);
  GOD_ICONS.forEach((ic, i) => W(`Row ${Math.floor(i / 5) + 1}, cell ${(i % 5) + 1}: ${ic.draw}.`));
  for (let i = GOD_ICONS.length; i < 25; i++) W(`Row ${Math.floor(i / 5) + 1}, cell ${(i % 5) + 1}: empty.`);
  W('```');
  W();
  W('## Checklist');
  W();
  W('* 6 god sheets and 1 icon sheet, named exactly as above, in `assets-source/sprites/sheets/`.');
  W('* Portraits: opaque, black gutters, nothing important outside the central circle; icons: transparent, one object per cell, no text.');
  W('* `npm run sprites:cut -- --only <sheet name>` for each new sheet (check the previews), then `npm run icons:import`.');
  return L.join('\n') + '\n';
}

// ---------------------------------------------------------------------------
// Brief 9 — hero portraits
// ---------------------------------------------------------------------------

function heroStory(bio: string): string {
  return bio
    .replace(/;\s*hireable in skirmish[^.]*\./gi, '.')
    .split(/(?<=\.)\s+/)
    .filter((x) => !/^(Concept-board hero|Proposed hero|Class assignment is provisional|Hireable in skirmish|The hero of )/i.test(x) && !/mission \d|Rival empire in|Patrol in|Garrison of|campaign hero|skirmish/i.test(x))
    .join(' ')
    .trim();
}

function writeBrief9(c: ContentCatalog): string {
  const L: string[] = [];
  const W = (s = '') => L.push(s);
  const art = JSON.parse(readFileSync(join(ROOT, 'assets-runtime', 'art', 'manifest.json'), 'utf8')) as { assets: Record<string, unknown> };
  const order = { hireable: 0, campaign: 1, enemy: 2, preview: 3 } as const;
  const all = Object.values(c.heroes);
  W('# Pantheon Realms — Art Brief 9 for GPT-6: HERO PORTRAITS');
  W();
  W(`Generated ${TODAY} by \`npm run art:briefs\` (owner request: "a list for the heroes' portraits"). **${all.length} heroes** — the hireable heroes of every pantheon (with the twelve proposed on ${TODAY}), the campaign heroes and the campaign opponents — on **${PANTHEONS.reduce((n, p) => n + Math.ceil(all.filter((h) => h.pantheonId === p).length / 16), 0)} sheets**, one per pantheon. Today every hero shows a generated stand-in bust.`);
  W();
  W('**Where they appear:** the hero list on the map, the Tavern, the hero screen, battle headers, the Encyclopedia and the encounter panel, in a square gold frame from 40 to 160 px.');
  W();
  W('## 1. Rules for every sheet');
  W();
  W(COMMON_RULES);
  W();
  W('Each sheet: **1536 px wide**, 4 columns of square paintings (384 × 384) and as many rows as the pantheon needs, separated by thin straight black gutters; each painting with its own opaque background in the pantheon’s colours. Each portrait: head and shoulders of the hero in their gear, three-quarter view facing slightly right, eyes about 40 % from the top, readable at 40 px. Where a dialogue bust of the same character exists (story art), attach it and keep that face, hair and costume. Cut into `assets-source/icons/final/<asset ID>.png`; then `npm run icons:import`.');
  W();
  for (const p of PANTHEONS) {
    const heroes = all.filter((h) => h.pantheonId === p).sort((a, b) => order[a.availability] - order[b.availability] || (a.name < b.name ? -1 : 1));
    for (const [si, group] of chunk(heroes, 16).entries()) {
      const name = `sheet.heroportrait.${p}${si ? `.${si + 1}` : ''}`;
      const rowsN = Math.ceil(group.length / 4);
      const cells: Cell[] = group.map((h, i) => ({ row: Math.floor(i / 4), col: i % 4, name: h.portraitAssetId, kind: 'portrait', out: `assets-source/icons/final/${h.portraitAssetId}.png` }));
      layouts[name] = { group: 'G9', target: 'portraits', cols: 4, rows: rowsN, cellHexes: [1, 1], size: [1536, 384 * rowsN], background: 'opaque', cells, file: `${name}.png` };
      const busts = group.map((h) => h.portraitAssetId.replace(/\.portrait$/, '.bust')).filter((b) => b in art.assets);
      W(`### ${cap(p)} heroes · \`${name}.png\``);
      W();
      W(
        sheetTable([
          ['Contains', group.map((h, i) => `row ${Math.floor(i / 4) + 1}, cell ${(i % 4) + 1}: ${h.name} — ${h.title} (${c.heroClasses[h.classId]?.name ?? h.classId}; ${h.availability})`).join('<br>') + (group.length < rowsN * 4 ? '<br>remaining cells: *empty* (flat black)' : '')],
          ['Image', `1536 × ${384 * rowsN} px (or larger, same proportions) — 4 columns × ${rowsN} rows, cells 384 × 384, thin black gutters${rowsN > 3 ? '; may come in two parts (rows 1–2 and 3–4)' : ''}`],
          ['Attach', `\`${BOARD[p]}\` (pantheon board); \`${HERO_BOARD[p]}\` (the pantheon’s mounted hero — armour and colours)${busts.map((b) => `; \`assets-source/art/final/${b}.png\` (dialogue bust of the same character)`).join('')}`],
          ['Cuts into', group.map((h) => `\`${h.portraitAssetId}.png\``).join(', ')],
          ['Then', `\`npm run sprites:cut -- --only ${name}\`, then \`npm run icons:import\``],
        ]),
      );
      W();
      W('```text');
      W(`Paint one sheet of square hero portraits for the fantasy strategy game Pantheon Realms (${cap(p)} heroes), in the style of the attached pantheon board.`);
      W(`Image 1536 × ${384 * rowsN} px: 4 columns × ${rowsN} rows of equal square paintings separated by thin straight black gutters. No labels, no numbers, no text.`);
      group.forEach((h: HeroDefinition, i) => {
        const cls = c.heroClasses[h.classId];
        const role = (cls?.summary ?? '').replace(/\s*\(mirrors[^)]*\)\.?/i, '').replace(/\.$/, '');
        W(`Row ${Math.floor(i / 4) + 1}, cell ${(i % 4) + 1}: ${h.name}, ${h.title} — a ${cls?.name ?? h.classId}: ${role.charAt(0).toLowerCase()}${role.slice(1)}. ${heroStory(h.biography)}`.trim());
      });
      for (let i = group.length; i < rowsN * 4; i++) W(`Row ${Math.floor(i / 4) + 1}, cell ${(i % 4) + 1}: empty (flat black).`);
      W(`Each portrait: head and shoulders in the hero's armour or robes, three-quarter view facing slightly right, eyes about 40 % from the top, warm key light from the upper left and a cool rim light; a soft painted background in the ${p} palette (${PALETTE[p]}). Historical and legendary figures are painted dignified, in the dress of their culture and era, never as caricatures. Adults only. No frame, no border, no text.`);
      W('```');
      W();
    }
  }
  W('## Checklist');
  W();
  W(`* ${Object.keys(layouts).filter((k) => k.startsWith('sheet.heroportrait.')).length} hero sheets named exactly as above, in \`assets-source/sprites/sheets/\`; opaque cells, thin black gutters.`);
  W('* Characters with a dialogue bust keep its face and costume.');
  W('* `npm run sprites:cut -- --only <sheet name>` for each new sheet (check the previews), then `npm run icons:import`.');
  return L.join('\n') + '\n';
}

// ---------------------------------------------------------------------------
// Brief 10 — town building levels
// ---------------------------------------------------------------------------

function writeBrief10(c: ContentCatalog): string {
  const L: string[] = [];
  const W = (s = '') => L.push(s);
  W('# Pantheon Realms — Art Brief 10 for GPT-6: TOWN BUILDING LEVELS');
  W();
  W(`Generated ${TODAY} by \`npm run art:briefs\` (owner request: "a list of the town buildings that have upgrades but use the same visual, for GPT to generate the versions — as a sheet cut into the versions, to reduce the number of images").`);
  W();
  const rows: string[] = [];
  let total = 0;
  const perPantheon: { p: string; chains: { label: string; levels: { name: string; art: string; summary: string }[]; current: string }[] }[] = [];
  for (const p of PANTHEONS) {
    const arch = Object.values(c.townArchetypes).find((a) => a.pantheonId === p);
    if (!arch) continue;
    const chains = arch.slots
      .filter((s) => s.kind === 'support' && s.chain.length > 1)
      .map((s) => ({
        label: s.label,
        levels: s.chain.map((b) => c.buildings[b]!).map((b) => ({ name: b.name, art: b.artAssetId, summary: b.summary })),
        current: `assets-runtime/placeholders/town/${p}/support.${s.role ?? s.id}.png`,
      }));
    perPantheon.push({ p, chains });
    for (const ch of chains) {
      total += ch.levels.length;
      rows.push(`| ${cap(p)} | ${ch.label} | ${ch.levels.map((l, i) => `${i + 1}. ${l.name}`).join(' · ')} | \`${ch.levels[0]!.art.replace(/\.l1$/, '')}\` (one picture for every level) |`);
    }
  }
  W(`**What shares a picture today.** In every town the locations below have several levels, but every level shows the same painting (the location’s one picture). The creature dwellings already have one picture for the base and one for the upgraded building, and the other locations have one level. **${total} level pictures** on **${perPantheon.length} sheets** (one per pantheon) replace them.`);
  W();
  W('| Pantheon | Location | Levels | Today |');
  W('|---|---|---|---|');
  for (const r of rows) W(r);
  W();
  W('## 1. Rules for every sheet');
  W();
  W(COMMON_RULES);
  W();
  W(`Each sheet: **1536 × 1536 px**, 4 columns × 4 rows of square cells (384 × 384): **one row per location, its levels left to right**, unused cells *empty*. ${TRANSPARENT} The building alone — no ground plane, no cast shadow, no sky — seen from the town view’s camera (slightly above, three-quarter, as on the town board), its base resting on an invisible ground line at about 85 % of the cell height and centred. **The same building growing:** level 1 is the smallest and plainest; every level keeps the materials, colours and silhouette of the one before and adds to it (a storey, a wing, a dome or tower, columns, gilding, banners, braziers); the last level is the grandest. Keep the scale step between levels moderate so they sit in the same spot in the town. Cut into \`assets-source/art/final/<asset ID>.png\`; then \`npm run art:import\`.`);
  W();
  for (const { p, chains } of perPantheon) {
    const name = `sheet.town.${p}.levels`;
    const cells: Cell[] = [];
    chains.forEach((ch, r) => ch.levels.forEach((l, col) => cells.push({ row: r, col, name: l.art, kind: 'figure', out: `assets-source/art/final/${l.art}.png` })));
    layouts[name] = { group: 'G10', target: 'items', cols: 4, rows: Math.max(1, chains.length), cellHexes: [1, 1], size: [1536, 384 * Math.max(1, chains.length)], background: 'transparent', cells, file: `${name}.png` };
    W(`### ${cap(p)} town · \`${name}.png\``);
    W();
    W(
      sheetTable([
        ['Rows', chains.map((ch, r) => `${r + 1}. ${ch.label}: ${ch.levels.map((l, i) => `cell ${i + 1} ${l.name}`).join(' · ')}${ch.levels.length < 4 ? ` · cell${ch.levels.length === 3 ? '' : 's'} ${ch.levels.length + 1}${ch.levels.length < 3 ? '–4' : ''} *empty*` : ''}`).join('<br>')],
        ['Image', `1536 × ${384 * chains.length} px (or larger, same proportions) — 4 columns × ${chains.length} rows, cells 384 × 384`],
        ['Background', TRANSPARENT],
        ['Attach', `\`${TOWN_BOARD[p]}\` (the town board — architecture and colours); ${chains.map((ch) => `\`${ch.current}\` (today’s ${ch.label})`).join('; ')}`],
        ['Cuts into', cells.map((x) => `\`${x.name}.png\``).join(', ')],
        ['Then', `\`npm run sprites:cut -- --only ${name}\`, then \`npm run art:import\``],
      ]),
    );
    W();
    W('```text');
    W(`Paint one sheet of town buildings for the fantasy strategy game Pantheon Realms (${cap(p)} town), in the style and architecture of the attached town board.`);
    W(`Image 1536 × ${384 * chains.length} px: an invisible grid of 4 columns × ${chains.length} rows of equal square cells. No grid lines, no labels, no numbers, no text. ${TRANSPARENT}`);
    W('Each row is ONE building growing level by level from left to right: the same materials, colours and silhouette, each level larger and richer than the one before; the attached picture of that building is its current look — keep its architecture.');
    chains.forEach((ch, r) => {
      W(`Row ${r + 1} — ${ch.label}: ${ch.levels.map((l, i) => `cell ${i + 1}: ${l.name} (level ${i + 1}${i === 0 ? ', the smallest' : i === ch.levels.length - 1 ? ', the grandest' : ''}) — ${l.summary}`).join('; ')}${ch.levels.length < 4 ? `; cells ${ch.levels.length + 1}–4: empty` : ''}.`);
    });
    W(`Each building alone, seen slightly from above in three-quarter view as on the town board, its base on an invisible ground line at 85 % of the cell height, centred; no ground, no shadow, no sky. Palette: ${PALETTE[p]}.`);
    W('```');
    W();
  }
  W('## Checklist');
  W();
  W('* One sheet per pantheon, named exactly as above, transparent, one building per cell, each row the same building growing.');
  W('* `npm run sprites:cut -- --only <sheet name>` for each new sheet (check the previews), then `npm run art:import`. The town then shows each level’s own picture.');
  return L.join('\n') + '\n';
}

// ---------------------------------------------------------------------------
// Brief 11 — map hero animations
// ---------------------------------------------------------------------------

const DIRS = [
  ['e', 'east — facing right, side-on'],
  ['ne', 'north-east — facing right and away from the viewer'],
  ['n', 'north — away from the viewer (we see the back)'],
  ['s', 'south — toward the viewer (we see the front)'],
  ['se', 'south-east — facing right and toward the viewer'],
] as const;

function writeBrief11(c: ContentCatalog): string {
  const L: string[] = [];
  const W = (s = '') => L.push(s);
  const sprites = JSON.parse(readFileSync(join(ROOT, 'assets-runtime', 'sprites', 'manifest.json'), 'utf8')) as { heroes: Record<string, { status: string; animations: Record<string, { directions?: Record<string, unknown> }> }> };
  W('# Pantheon Realms — Art Brief 11 for GPT-6: MAP HERO ANIMATIONS');
  W();
  W(`Generated ${TODAY} by \`npm run art:briefs\` (owner request: "a file for GPT-6 to make the map animations — moving, starting a battle, anything else needed — for all six hero types").`);
  W();
  W('## What the map heroes have and what they still need');
  W();
  W('| Pantheon | Delivered | Still needed |');
  W('|---|---|---|');
  for (const p of PANTHEONS) {
    const h = sprites.heroes[p];
    const have = h ? Object.entries(h.animations).map(([a, d]) => `${a} (${Object.keys(d.directions ?? {}).length || 1} directions)`).join(', ') : 'nothing';
    W(`| ${cap(p)} | ${have} | prepare, cast |`);
  }
  W();
  W('**Moving** (`walk`) and standing (`idle`) are delivered in all eight directions (the 2026-10-03 delivery) — nothing to paint. Two moments still use code-drawn motion only:');
  W();
  W('* **prepare — starting a battle.** When a hero attacks, it stops beside the enemy, turns toward it and readies itself before the battle screen opens (about 1.2 s). Today the rider only rises a little. The strip: the horse rears or stamps and tosses its head, the rider raises the weapon (or banner) high, then levels it toward the enemy and holds — 6 frames, played once, the last frame held until the battle opens.');
  W('* **cast — casting a map spell.** When a hero casts Far Sight, Fleet Foot, Homecoming or another map spell, a sigil glows at the hero. The strip: the rider lifts the free hand (or staff) and a soft light gathers in it and lifts away upward; the horse stands — 6 frames, played once. Paint only the gesture and a faint glow at the hand: the game draws each spell’s own effect.');
  W();
  W('The game plays a delivered `prepare` or `cast` strip automatically (no code change); until then it keeps the code-drawn motion.');
  W();
  W('## 1. Rules for every sheet');
  W();
  W(COMMON_RULES);
  W();
  W(`Each sheet (one per pantheon): **1920 × 800 px**, 12 columns × 5 rows of square cells (160 × 160). **Rows = directions** (east, north-east, north, south, south-east; the game mirrors east, north-east and south-east for west, north-west and south-west). **Cells 1–6: prepare; cells 7–12: cast.** A cell spans 2.13 map-hex widths, the same as the walk sheets: the ground point between the horse's feet at **88 % of the cell height**, centred; rider and horse about 60 % of the cell height, the same size in every cell. ${TRANSPARENT} Elevated strategy-map camera about 35° above the horizon. Exactly the same rider, horse, armour, weapon and colours as the pantheon's delivered walk sheet. Cut into \`sprite.hero.<pantheon>.<prepare|cast>.<direction>.png\`; then \`npm run sprites:import\`.`);
  W();
  for (const p of PANTHEONS) {
    const name = `sheet.heroanim.${p}`;
    const segments: Segment[] = [];
    DIRS.forEach(([d], r) => {
      segments.push({ row: r, col: 0, frames: 6, anim: 'prepare', name: `sprite.hero.${p}.prepare.${d}`, fps: 6, loop: false, airborne: false });
      segments.push({ row: r, col: 6, frames: 6, anim: 'cast', name: `sprite.hero.${p}.cast.${d}`, fps: 6, loop: false, airborne: false });
    });
    layouts[name] = { group: 'G11', target: 'hero', cols: 12, rows: 5, cellHexes: [2.133, 2.133], groundY: 0.88, size: [1920, 800], background: 'transparent', segments, file: `${name}.png` };
    W(`### ${cap(p)} mounted hero · \`${name}.png\``);
    W();
    W(
      sheetTable([
        ['Rows', DIRS.map(([, t], r) => `${r + 1}. ${t}: prepare (6) + cast (6)`).join('<br>')],
        ['Image', '1920 × 800 px (or larger, same proportions) — 12 columns × 5 rows, cells 160 × 160'],
        ['Attach', `\`${HERO_BOARD[p]}\` (top / front / side views — the design authority); \`assets-source/sprites/sheets/sheet.hero.${p}.png\` (the delivered idle and walk sheet — match it exactly)`],
        ['Cuts into', `10 strips: \`sprite.hero.${p}.prepare.<e|ne|n|s|se>.png\`, \`sprite.hero.${p}.cast.<e|ne|n|s|se>.png\``],
        ['Then', `\`npm run sprites:cut -- --only ${name}\`, then \`npm run sprites:import\``],
      ]),
    );
    W();
    W('```text');
    W(`Using the attached ${cap(p)} mounted-hero sheets, create one animation sheet of the same mounted hero for the Pantheon Realms adventure map.`);
    W('Image 1920 × 800 px (or larger, same proportions): an invisible grid of 12 columns × 5 rows of equal square cells. No grid lines, no borders, no labels, no numbers, no text. Every frame stays inside its own cell; nothing touches or crosses a cell edge.');
    W(`Each row is one direction: ${DIRS.map(([, t], r) => `row ${r + 1}: ${t}`).join('; ')}.`);
    W('In every row, cells 1–6: PREPARE — readying for battle: the horse rears or stamps and tosses its head, the rider raises the weapon or banner high, then levels it forward and holds the ready pose (plays once; the last frame is held). Cells 7–12: CAST — the rider lifts the free hand or staff, a soft light gathers in it and lifts away upward, the horse stands still (plays once). Only a faint glow at the hand — no large spell effect.');
    W("The ground point between the horse's feet stands at 88% of the cell height, centred, in every frame; the same scale in every cell; rider and horse about 60% of the cell height. Elevated strategy-map camera about 35° above the horizon. Exactly the same rider, horse, armour, weapon and colours as the attached sheets.");
    W(`Modern high-resolution painterly fantasy strategy-game sprite. ${TRANSPARENT} No ground, no shadow, no text.`);
    W('```');
    W();
  }
  W('## Checklist');
  W();
  W('* Six sheets named exactly as above, transparent, 12 frames per row, the same hero as the walk sheet.');
  W('* `npm run sprites:cut -- --only <sheet name>` for each new sheet (check the previews: each strip re-aligned on the horse’s feet), then `npm run sprites:import`.');
  void c;
  return L.join('\n') + '\n';
}

it('writes art briefs 8–11 and their sheet layouts', () => {
  const c = buildCatalog();
  const b8 = writeBrief8(c);
  const b9 = writeBrief9(c);
  const b10 = writeBrief10(c);
  const b11 = writeBrief11(c);
  writeFileSync(join(BRIEFS, 'GPT6_BRIEF_8_GODS_AND_ICONS.md'), b8);
  writeFileSync(join(BRIEFS, 'GPT6_BRIEF_9_HERO_PORTRAITS.md'), b9);
  writeFileSync(join(BRIEFS, 'GPT6_BRIEF_10_TOWN_BUILDING_LEVELS.md'), b10);
  writeFileSync(join(BRIEFS, 'GPT6_BRIEF_11_MAP_HERO_ANIMATIONS.md'), b11);
  writeFileSync(
    join(ROOT, 'assets-source', 'sprites', 'sheet-layouts.briefs.json'),
    JSON.stringify({ schema: 'pantheon-realms-sheets-1', generated: TODAY, note: 'Written by npm run art:briefs (GPT6_BRIEF_8–11); read by npm run sprites:cut with sheet-layouts.json. Rows and columns count from 0.', sheets: layouts }, null, 1) + '\n',
  );
  const count = (g: string) => Object.values(layouts).filter((l) => l.group === g).length;
  console.log(`art briefs: G8 ${count('G8')} sheets, G9 ${count('G9')}, G10 ${count('G10')}, G11 ${count('G11')}`);
});
