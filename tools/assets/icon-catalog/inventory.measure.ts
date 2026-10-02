/**
 * Icon catalog — inventory step (development tool; never packaged in the game).
 *
 * Collects every icon and small illustration the game shows — interface icons,
 * map markers, effect icons, spells, artifacts, artifact sets, skills,
 * interventions, creature abilities, portraits, emblems, buildings and mission
 * thumbnails — with the asset ID to deliver, where it appears, what is shown
 * today and a brief for the artist. Writes:
 *
 *   assets-source/icons/icon-inventory.json    (read by build_icon_catalog.py)
 *   assets-source/icons/current/glyph.<name>.svg (today's SVG glyphs)
 *
 * Run through `npm run icons:catalog` (inventory → thumbnails → Markdown/CSV/XLSX).
 */
import { it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildCatalog } from '@pr/content';
import { ARTIFACT_SLOT_LABEL, type ContentCatalog } from '@pr/rules';
import { ICON_ART, ICON_NAMES, Icon, type IconName } from '../../../packages/ui/src/assets/icons';
import { ARTIFACT_KIND_GLYPH, SPELL_EFFECT_ART } from '../../../packages/ui/src/components/art';
import { resolveAsset } from '../../../packages/ui/src/assets/manifest';
import { BRIEFS, EFFECT_VISUAL, MARKERS, STYLE } from './briefs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const OUT = join(ROOT, 'assets-source', 'icons');
const UI_SRC = join(ROOT, 'packages', 'ui', 'src');

type Current =
  | { readonly type: 'art'; readonly file: string; readonly status: string }
  | { readonly type: 'glyph'; readonly file: string; readonly glyph: string }
  | { readonly type: 'fallback'; readonly file: string; readonly note: string }
  | { readonly type: 'procedural'; readonly note: string };

interface Row {
  readonly assetId: string;
  readonly name: string;
  readonly group: string;
  readonly where: string;
  readonly current: Current;
  readonly brief: string;
  readonly details?: string;
  readonly lore?: string;
  readonly pantheon?: string;
  readonly priority: 'now' | 'later';
}

interface Section {
  readonly id: string;
  readonly title: string;
  readonly intro: string;
  readonly size: string;
  readonly rows: Row[];
}

/** Screen label for a UI source file. */
const PAGE: Record<string, string> = {
  'screens/MainMenu.tsx': 'Main menu',
  'screens/Setup.tsx': 'New game / setup',
  'screens/RandomSetup.tsx': 'Random map setup',
  'screens/Adventure.tsx': 'Adventure map',
  'screens/Town.tsx': 'Town',
  'screens/Recruitment.tsx': 'Recruitment',
  'screens/Hero.tsx': 'Hero screen',
  'screens/LevelUp.tsx': 'Level-up',
  'screens/Battle.tsx': 'Battle',
  'screens/BattleResult.tsx': 'Battle result',
  'screens/Journal.tsx': 'Journal',
  'screens/Overview.tsx': 'Kingdom overview',
  'screens/Pantheon.tsx': 'Pantheon',
  'screens/Encyclopedia.tsx': 'Encyclopedia',
  'screens/UnitDetail.tsx': 'Creature detail',
  'screens/Settings.tsx': 'Settings',
  'screens/Summary.tsx': 'Results / high scores',
  'dialogs/Overlays.tsx': 'Dialogs (briefing, debrief, pause, save/load, encounters)',
  'dialogs/WorldDialogs.tsx': 'Map dialogs (camps, events, sites)',
  'dialogs/Spellbook.tsx': 'Spellbook',
  'dialogs/Story.tsx': 'Story scenes',
  'components/kit.tsx': 'Shared controls (every screen)',
  'components/game.tsx': 'Shared game widgets (resource bar, costs, stat blocks)',
  'components/art.tsx': 'Shared art widgets',
  'app/App.tsx': 'App frame',
};

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (p.endsWith('.tsx') || p.endsWith('.ts')) out.push(p);
  }
  return out;
}

/** Which screens use an icon name, from `name=` / `icon=` / `headerIcon=` / `icon:` props in the UI source. */
function iconUsage(): Map<IconName, Set<string>> {
  const used = new Map<IconName, Set<string>>();
  const names = new Set<string>(ICON_NAMES);
  for (const file of walk(UI_SRC)) {
    const rel = relative(UI_SRC, file).replace(/\\/g, '/');
    if (rel === 'assets/icons.tsx') continue;
    const page = PAGE[rel] ?? rel;
    const text = readFileSync(file, 'utf8');
    const re = /(?:\bname|\bicon|\bheaderIcon|\bglyph)\s*[=:]\s*\{?\s*['"]([a-z0-9]+)['"]/g;
    for (const m of text.matchAll(re)) {
      const n = m[1]!;
      if (!names.has(n)) continue;
      if (!used.has(n as IconName)) used.set(n as IconName, new Set());
      used.get(n as IconName)!.add(page);
    }
  }
  // Data-driven uses the scan cannot see.
  const add = (n: IconName, page: string) => {
    if (!used.has(n)) used.set(n, new Set());
    used.get(n)!.add(page);
  };
  for (const r of ['gold', 'wood', 'stone', 'crystal', 'favor'] as const) {
    add(r, 'Resource bar (adventure, town)');
    add(r, 'Costs and rewards (every screen)');
  }
  for (const k of Object.values(ARTIFACT_KIND_GLYPH)) add(k, 'Artifact fallback glyph (hero screen, merchant, encyclopedia)');
  return used;
}

function artFile(assetId: string): Current | null {
  const rec = resolveAsset(assetId);
  if (!rec.url) return null;
  const file = rec.url.replace(/^\.?\//, '');
  const disk = ['assets-runtime/' + file, file].find((f) => existsSync(join(ROOT, f)));
  return disk ? { type: 'art', file: disk, status: rec.status } : null;
}

function glyphSvg(name: IconName): string {
  const markup = renderToStaticMarkup(createElement(Icon, { name, glyph: true, width: 96, height: 96 }));
  // Stand-alone file: namespace, a light stroke color for dark and light viewers.
  return markup.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" style="color:#4a3a1e" ').replace(/currentColor/g, '#4a3a1e');
}

/** What `<Icon name>` draws today: its art when mapped, else its SVG glyph. */
function iconCurrent(name: IconName): Current {
  const id = ICON_ART[name];
  const art = id ? artFile(id) : null;
  return art ?? { type: 'glyph', file: `assets-source/icons/current/glyph.${name}.svg`, glyph: name };
}

const first = (s: string | undefined) => (s ?? '').split(/(?<=[.!?])\s/)[0] ?? '';

function pantheonName(c: ContentCatalog, id: string | undefined): string {
  return id ? (c.pantheons[id]?.name ?? id) : 'Shared';
}

it('writes the icon inventory', () => {
  const c = buildCatalog();
  mkdirSync(join(OUT, 'current'), { recursive: true });
  const usage = iconUsage();
  const sections: Section[] = [];
  const allIconFiles = new Set(
    readdirSync(join(ROOT, 'assets-runtime', 'ui', 'icons')).filter((f) => f.endsWith('.png')).map((f) => `icon.${f.replace(/\.png$/, '')}`),
  );
  const referenced = new Set<string>();

  // --- 1. Interface icons
  const ui: Row[] = [];
  for (const name of ICON_NAMES) {
    const artId = ICON_ART[name];
    const art = artId ? artFile(artId) : null;
    if (artId) referenced.add(artId);
    const svgFile = `assets-source/icons/current/glyph.${name}.svg`;
    writeFileSync(join(ROOT, svgFile), glyphSvg(name));
    const where = [...(usage.get(name) ?? new Set(['(not shown on any screen yet)']))].sort().join('; ');
    ui.push({
      assetId: artId ?? `icon.ui.${name}`,
      name,
      group: 'Interface',
      where,
      current: art ?? { type: 'glyph', file: svgFile, glyph: name },
      brief: BRIEFS[name] ?? name,
      priority: art ? 'later' : 'now',
    });
  }
  sections.push({
    id: 'interface',
    title: 'Interface icons',
    intro:
      'Every icon name the interface draws through `Icon` (`packages/ui/src/assets/icons.tsx`). Names with art today show the owner-supplied art; the rest show a simple SVG glyph and are the first to replace. Asset IDs starting `icon.ui.` are the IDs for icons that have no art yet: art delivered under that ID replaces the glyph automatically (`iconArt`).',
    size: '96 × 96 px PNG, transparent (menu icons 192 px)',
    rows: ui,
  });

  // --- 2. Map markers
  const markers: Row[] = MARKERS.map((m) => {
    referenced.add(m.assetId);
    return {
      assetId: m.assetId,
      name: m.name,
      group: 'Map marker',
      where: 'Adventure map tile panel; Journal objectives',
      current: artFile(m.assetId) ?? { type: 'procedural', note: 'no art' },
      brief: m.brief,
      details: m.when,
      priority: 'later' as const,
    };
  });
  sections.push({
    id: 'markers',
    title: 'Map markers',
    intro: 'Marker art beside site names (adventure tile panel, Journal). Chosen by the site kind and ownership in `siteMarkerAsset` (`components/art.tsx`).',
    size: '96 × 96 px PNG, transparent',
    rows: markers,
  });

  // --- 3. Spells
  const spells: Row[] = Object.values(c.spells)
    .sort((a, b) => (a.pantheonId ?? '').localeCompare(b.pantheonId ?? '') || a.tier - b.tier || a.name.localeCompare(b.name))
    .map((sp) => {
      const own = artFile(sp.iconAssetId);
      const fb = SPELL_EFFECT_ART[sp.effect.type] ?? 'icon.action.spell';
      referenced.add(fb);
      const fbFile = artFile(fb);
      return {
        assetId: sp.iconAssetId,
        name: sp.name,
        group: `Spell · tier ${sp.tier}`,
        pantheon: pantheonName(c, sp.pantheonId),
        where: sp.context === 'battle' ? 'Spellbook; Battle spell bar; Town spell library; Encyclopedia' : 'Spellbook; Adventure map (cast button); Town spell library; Encyclopedia',
        current: own ?? (fbFile ? { type: 'fallback', file: fbFile.file, note: `effect-family icon ${fb}` } : { type: 'procedural', note: 'none' }),
        brief: `${sp.name}: ${EFFECT_VISUAL[sp.effect.type] ?? 'a glowing rune'}. ${first(sp.lore)}`.trim(),
        details: `${sp.context === 'battle' ? 'Battle' : 'Adventure'} · ${sp.manaCost} mana · target ${sp.target.replace(/_/g, ' ')} · ${sp.summary}${sp.scope === 'expanded' ? ' · expanded content' : ''}`,
        lore: sp.lore,
        priority: own ? ('later' as const) : ('now' as const),
      };
    });
  sections.push({
    id: 'spells',
    title: 'Spells',
    intro: `${spells.length} spells. Each spell has its own icon ID; until it exists the game shows the icon of its effect family (\`SPELL_EFFECT_ART\`). Pantheon spells should carry their pantheon's palette; shared spells stay neutral.`,
    size: '128 × 128 px PNG, transparent, round-socket safe (keep the subject inside a 110 px circle)',
    rows: spells,
  });

  // --- 4. Artifacts
  const artifacts: Row[] = Object.values(c.artifacts)
    .sort((a, b) => a.slot.localeCompare(b.slot) || a.name.localeCompare(b.name))
    .map((ar) => {
      const own = artFile(ar.iconAssetId);
      const glyph = ARTIFACT_KIND_GLYPH[ar.slot] ?? 'star';
      const set = ar.setId ? c.artifactSets[ar.setId]?.name : undefined;
      return {
        assetId: ar.iconAssetId,
        name: ar.name,
        group: `Artifact · ${ARTIFACT_SLOT_LABEL[ar.slot] ?? ar.slot}`,
        pantheon: ar.originPantheonId ? pantheonName(c, ar.originPantheonId) : 'Shared',
        where: 'Hero screen (paper doll, backpack); Artifact merchant; Battle loot; Map rewards; Encyclopedia',
        current: own ?? iconCurrent(glyph),
        brief: `${ar.name} — draw the object alone, three-quarter view. ${first(ar.lore)}`.trim(),
        details: `${ar.rarity ?? (ar.unique ? 'relic' : 'minor')} · ${ar.summary}${set ? ` · set: ${set}` : ''}${ar.scope === 'expanded' ? ' · expanded content' : ''}`,
        lore: ar.lore,
        priority: own ? ('later' as const) : ('now' as const),
      };
    });
  sections.push({
    id: 'artifacts',
    title: 'Artifacts',
    intro: `${artifacts.length} artifacts. The paper doll shows the item's own icon in its slot; until it exists the slot shows a glyph for the artifact kind (\`ARTIFACT_KIND_GLYPH\`). Rarity is shown by the socket frame, so the icon itself needs no frame.`,
    size: '128 × 128 px PNG, transparent, object fills ~80 %',
    rows: artifacts,
  });

  // --- 5. Artifact sets (proposed IDs)
  const sets: Row[] = Object.values(c.artifactSets).map((set) => ({
    assetId: `icon.set.${set.id}`,
    name: set.name,
    group: 'Artifact set',
    where: 'Hero screen (set badge on worn and packed pieces, set status); Item card; Encyclopedia',
    current: { type: 'procedural', note: 'text only today' },
    brief: `Emblem for the ${set.name}: the ${set.pieceIds.length} pieces (${set.pieceIds.map((p) => c.artifacts[p]?.name ?? p).join(', ')}) arranged as one badge.`,
    details: `${set.summary} ${set.bonuses.map((b) => b.summary).join('; ')}`,
    priority: 'later' as const,
  }));
  sections.push({ id: 'sets', title: 'Artifact sets', intro: 'Set emblems: the set badge on worn and packed set pieces, the set list and the artifact card (hero screen). Until delivered the badge is a coloured gem (temporary).', size: '96 × 96 px PNG, transparent', rows: sets });

  // --- 6. Skills
  const skills: Row[] = Object.values(c.skills).map((sk) => ({
    assetId: sk.iconAssetId,
    name: sk.name,
    group: 'Hero skill',
    pantheon: pantheonName(c, sk.pantheonId),
    where: 'Hero screen skill slots; Level-up choices; Encyclopedia',
    current: artFile(sk.iconAssetId) ?? iconCurrent('star'),
    brief: `${sk.name}: ${sk.summary ?? sk.rankSummaries[0] ?? ''}`.trim(),
    details: sk.rankSummaries.map((r, i) => `${['Basic', 'Advanced', 'Expert'][i] ?? `Rank ${i + 1}`}: ${r}`).join(' · '),
    priority: artFile(sk.iconAssetId) ? ('later' as const) : ('now' as const),
  }));
  sections.push({ id: 'skills', title: 'Hero skills', intro: 'Secondary skills (8 slots on the hero screen). Basic / Advanced / Expert use the same icon; the slot frame shows the rank.', size: '96 × 96 px PNG, transparent', rows: skills });

  // --- 7. Divine interventions
  const interventions: Row[] = Object.values(c.interventions).map((iv) => ({
    assetId: iv.iconAssetId,
    name: iv.name,
    group: `Intervention · ${iv.context}`,
    pantheon: iv.pantheonIds?.length ? iv.pantheonIds.map((p) => pantheonName(c, p)).join(', ') : 'Every pantheon',
    where: iv.context === 'battle' ? 'Battle — divine intervention menu' : 'Pantheon screen — interventions',
    current: artFile(iv.iconAssetId) ?? iconCurrent('favor'),
    brief: `${iv.name}: ${iv.summary}`,
    details: `${iv.favorCost} Favor · target ${iv.target.replace(/_/g, ' ')}`,
    priority: 'later' as const,
  }));
  sections.push({ id: 'interventions', title: 'Divine interventions', intro: 'Miracles bought with Favor (skirmish feature).', size: '96 × 96 px PNG, transparent', rows: interventions });

  // --- 8. Creature abilities (proposed IDs)
  const abilities: Row[] = Object.values(c.abilities)
    .filter((ab) => ab.implementationStatus === 'implemented')
    .map((ab) => ({
      assetId: `icon.ability.${ab.id}`,
      name: ab.name,
      group: `Ability · ${ab.activation}`,
      where: 'Ability badges on army slots (hero, town, battle); Creature detail; Battle stack info; Encyclopedia',
      current: { type: 'procedural', note: 'text chip today' },
      brief: `${ab.name}: ${ab.summary}`,
      details: ab.exactRule,
      priority: 'later' as const,
    }));
  sections.push({ id: 'abilities', title: 'Creature abilities', intro: 'Ability badges on army slots, creature details and the Encyclopedia, next to the ability name. Until delivered the badge is the nearest interface glyph (temporary).', size: '64 × 64 px PNG, transparent', rows: abilities });

  // --- 9. Effect and status art (fallbacks and battle feedback)
  const fx: Row[] = [...allIconFiles]
    .filter((id) => /^icon\.(fx|status)\./.test(id))
    .sort()
    .map((id) => ({
      assetId: id,
      name: id.replace(/^icon\./, ''),
      group: 'Effect / status',
      where: Object.entries(SPELL_EFFECT_ART).some(([, v]) => v === id) ? `Spell fallback for effects: ${Object.entries(SPELL_EFFECT_ART).filter(([, v]) => v === id).map(([k]) => k).join(', ')}` : 'Available, not used yet',
      current: artFile(id) ?? { type: 'procedural', note: 'none' },
      brief: BRIEFS[id] ?? id.replace(/^icon\.(fx|status)\./, '').replace(/-/g, ' '),
      priority: 'later' as const,
    }));
  sections.push({ id: 'effects', title: 'Effect and status icons', intro: 'Effect-family art: the stand-in for spells without their own icon, and the planned battle status badges.', size: '96 × 96 px PNG, transparent', rows: fx });

  // --- 10. Portraits
  const portraits: Row[] = [];
  for (const h of Object.values(c.heroes)) {
    portraits.push({
      assetId: h.portraitAssetId,
      name: h.name,
      group: `Hero portrait · ${h.availability}`,
      pantheon: pantheonName(c, h.pantheonId),
      where: 'Hero screen; Adventure hero list; Tavern; Battle; Encyclopedia',
      current: artFile(h.portraitAssetId) ?? { type: 'procedural', note: 'generated placeholder bust' },
      brief: `${h.name}, ${h.title} (${c.heroClasses[h.classId]?.name ?? h.classId}). ${first(h.biography)}`,
      priority: h.availability === 'preview' ? ('later' as const) : ('now' as const),
    });
  }
  const speakers = new Map<string, string>();
  for (const m of Object.values(c.missions)) {
    for (const line of [...m.briefing, ...m.victory, ...(m.storyScenes ?? []).flatMap((s) => s.lines)]) speakers.set(line.portraitAssetId, line.speaker);
  }
  for (const camp of Object.values(c.campaigns)) for (const line of [...(camp.epilogue ?? []), ...(camp.epilogueVariants ?? []).flatMap((v) => v.lines)]) speakers.set(line.portraitAssetId, line.speaker);
  const heroPortraits = new Set(Object.values(c.heroes).map((h) => h.portraitAssetId));
  for (const [id, speaker] of [...speakers].sort()) {
    if (heroPortraits.has(id)) continue;
    portraits.push({
      assetId: id,
      name: speaker,
      group: 'Story portrait',
      pantheon: id.split('.')[1] ? pantheonName(c, id.split('.')[1]) : undefined,
      where: 'Story scenes and briefings (dialogue window)',
      current: artFile(id) ?? { type: 'procedural', note: 'generated placeholder bust' },
      brief: `${speaker} — story character (see the campaign documents).`,
      priority: 'now' as const,
    });
  }
  for (const g of Object.values(c.gods)) {
    portraits.push({
      assetId: g.portraitAssetId,
      name: g.name,
      group: `God portrait · ${g.role}`,
      pantheon: pantheonName(c, g.pantheonId),
      where: 'Pantheon screen; God choice; Encyclopedia',
      current: artFile(g.portraitAssetId) ?? { type: 'procedural', note: 'generated placeholder' },
      brief: `${g.name}, ${g.domain}.${g.quote ? ` “${g.quote}”` : ''}`,
      priority: g.implementationStatus === 'implemented' ? ('now' as const) : ('later' as const),
    });
  }
  sections.push({ id: 'portraits', title: 'Portraits (heroes, story characters, gods)', intro: 'Square portraits. Placeholders today are generated busts.', size: '256 × 256 px PNG (shown at 48–160 px)', rows: portraits });

  // --- 11. Creatures
  const creatures: Row[] = Object.values(c.creatures)
    .filter((cr) => cr.implementationStatus === 'implemented')
    .sort((a, b) => (a.pantheonId ?? '').localeCompare(b.pantheonId ?? '') || a.tier - b.tier || a.form.localeCompare(b.form))
    .map((cr) => ({
      assetId: cr.presentation.portraitAssetId,
      name: cr.name,
      group: `Creature · tier ${cr.tier} ${cr.form}`,
      pantheon: pantheonName(c, cr.pantheonId),
      where: 'Recruitment; Army slots; Battle queue; Creature detail; Encyclopedia',
      current: artFile(cr.presentation.portraitAssetId) ?? { type: 'procedural', note: 'generated placeholder' },
      brief: cr.presentation.portraitAlt ?? cr.summary,
      priority: 'now' as const,
    }));
  sections.push({ id: 'creatures', title: 'Creature portraits', intro: 'Army-slot and recruitment portraits (base and upgraded forms need distinct art).', size: '256 × 256 px PNG', rows: creatures });

  // --- 12. Emblems, buildings, thumbnails
  const misc: Row[] = [];
  for (const p of Object.values(c.pantheons)) {
    misc.push({ assetId: p.theme.emblemAssetId, name: `${p.name} emblem`, group: 'Pantheon emblem', pantheon: p.name, where: 'Setup; Pantheon screen; town banners; Encyclopedia', current: artFile(p.theme.emblemAssetId) ?? { type: 'procedural', note: 'generated placeholder' }, brief: `${p.name} — ${p.epithet}. A single heraldic emblem in the pantheon accent ${p.theme.accent}.`, priority: 'now' });
  }
  for (const b of Object.values(c.buildings)) {
    if (!b.artAssetId) continue;
    misc.push({ assetId: b.artAssetId, name: b.name, group: 'Town building', pantheon: pantheonName(c, b.pantheonId), where: 'Town screen (location art and build cards)', current: artFile(b.artAssetId) ?? { type: 'procedural', note: 'none' }, brief: `${b.name}: ${b.summary}`, priority: 'later' });
  }
  for (const m of Object.values(c.missions)) {
    if (!m.campaignId) continue;
    misc.push({ assetId: m.thumbnailAssetId, name: m.name, group: 'Mission thumbnail', where: 'Campaign setup; Briefing; Debrief', current: artFile(m.thumbnailAssetId) ?? { type: 'procedural', note: 'generated landscape' }, brief: m.summary, priority: 'later' });
  }
  for (const camp of Object.values(c.campaigns)) {
    misc.push({ assetId: camp.thumbnailAssetId, name: camp.name, group: 'Campaign thumbnail', where: 'Campaign setup', current: artFile(camp.thumbnailAssetId) ?? { type: 'procedural', note: 'generated landscape' }, brief: camp.summary, priority: 'later' });
  }
  sections.push({ id: 'illustrations', title: 'Emblems, buildings and thumbnails', intro: 'Larger illustrations listed for completeness (town buildings already use cropped concept art).', size: 'emblems 256 px; thumbnails 640 × 360 px', rows: misc });

  // --- Available icon files nobody uses yet
  for (const r of sections.flatMap((s) => s.rows)) referenced.add(r.assetId);
  const unused = [...allIconFiles].filter((id) => !referenced.has(id)).sort();

  const doc = {
    schema: 'pantheon-realms-icon-inventory',
    note: 'Generated by tools/assets/icon-catalog (npm run icons:catalog). Do not edit by hand.',
    contentVersion: c.versions.contentVersion,
    style: STYLE,
    sections,
    unusedIconFiles: unused,
  };
  writeFileSync(join(OUT, 'icon-inventory.json'), JSON.stringify(doc, null, 2));
  const total = sections.reduce((n, s) => n + s.rows.length, 0);
  console.log(`icon inventory: ${total} entries in ${sections.length} sections; ${unused.length} icon files not used yet`);
});
