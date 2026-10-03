/**
 * 2D sprite content plan — inventory step (development tool; never packaged in the game).
 *
 * Reads the authoritative content catalog and writes what the 2D presentation
 * needs per creature form, map hero, map site, battlefield and battle effect:
 *
 *   assets-source/sprites/content-plan.json
 *
 * The placeholder generator (`make_sprite_placeholders.py`) and the GPT-6
 * production queue (`build_gpt6_queue.py`) both read this file, so the list of
 * animations requested for a creature always follows its gameplay content
 * (shooter → shoot, flight → takeoff/fly/landing, an active ability → ability,
 * a battle spell caster → cast), never the artwork.
 *
 * Run through `npm run sprites:plan`.
 */
import { it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildCatalog } from '@pr/content';
import { requiredAnimations } from '../../../packages/presentation/src/sprites';
import { CREATURE_SILHOUETTES } from '../../../packages/ui/src/assets/placeholders';
import { generateSkirmish, SKIRMISH_MAP_TYPES } from '@pr/mapgen';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const OUT = join(ROOT, 'assets-source', 'sprites', 'content-plan.json');
const SILHOUETTES = join(ROOT, 'assets-source', 'sprites', 'silhouettes');

it('writes the 2D sprite content plan', () => {
  const catalog = buildCatalog();
  const creatures = Object.values(catalog.creatures)
    .filter((c) => !!c.stats)
    .sort((a, b) => (a.pantheonId ?? 'zz').localeCompare(b.pantheonId ?? 'zz') || a.tier - b.tier || (a.form === 'base' ? -1 : 1))
    .map((c) => {
      const fam = catalog.families[c.familyId];
      const abilities = c.abilityIds.map((id) => catalog.abilities[id]).filter((a) => !!a);
      return {
        id: c.id,
        name: c.name,
        plural: c.pluralName,
        pantheonId: c.pantheonId,
        familyId: c.familyId,
        familyName: fam?.name ?? c.familyId,
        tier: c.tier,
        form: c.form,
        pairId: c.form === 'base' ? (c.upgradeId ?? null) : (c.baseId ?? null),
        role: c.roleLabel,
        body: c.presentation.bodyProfile,
        footprint: c.stats!.footprint,
        shots: c.stats!.shots,
        range: c.stats!.range ?? null,
        summary: c.summary,
        portraitAlt: c.presentation.portraitAlt,
        portraitAssetId: c.presentation.portraitAssetId,
        spriteAssetId: c.presentation.spriteAssetId,
        abilities: abilities.map((a) => ({ id: a.id, name: a.name, activation: a.activation, rule: a.rule.type, summary: a.summary })),
        animations: requiredAnimations(catalog, c),
      };
    });
  const pantheons = Object.values(catalog.pantheons).map((p) => ({
    id: p.id,
    name: p.name,
    accent: p.theme.accent,
    accentSoft: p.theme.accentSoft,
    emblemAssetId: p.theme.emblemAssetId,
    heroes: Object.values(catalog.heroes)
      .filter((h) => h.pantheonId === p.id)
      .map((h) => ({ id: h.id, name: h.name })),
  }));
  // Every site kind and battlefield the game can place: authored missions plus random maps.
  const siteKinds = new Map<string, number>();
  const battlefields = new Map<string, number>();
  const climates = new Set<string>();
  const kindOf = (k: { type: string; siteType?: string; landmark?: string; label?: string }) => (k.type === 'resource_site' ? k.siteType! : k.type === 'landmark' ? k.landmark! : k.type === 'activation' ? k.label! : k.type);
  const count = (m: Map<string, number>, k: string) => m.set(k, (m.get(k) ?? 0) + 1);
  for (const mission of Object.values(catalog.missions)) {
    const tpl = catalog.mapTemplates?.[mission.mapTemplateId as never] as { biome?: string } | undefined;
    if (tpl?.biome) climates.add(tpl.biome);
    for (const s of mission.sites) {
      count(siteKinds, kindOf(s.kind as never));
      if (s.guard?.battlefield) count(battlefields, s.guard.battlefield);
    }
  }
  const pool = ['greek', 'norse', 'egyptian', 'japanese', 'celtic', 'mesoamerican'];
  for (const t of SKIRMISH_MAP_TYPES) {
    for (const [seed, size, n] of [[3, 'small', 2], [11, 'medium', 3], [19, 'large', 4]] as const) {
      const seats = pool.slice(0, n).map((p, i) => ({ pantheonId: p, controller: i === 0 ? ('human' as const) : ('ai' as const) }));
      const g = generateSkirmish(catalog, { seed, size, seats, victory: { type: 'elimination' }, monsters: 'many', mapType: t.id });
      climates.add(g.map.biome);
      for (const s of g.mission.sites) {
        count(siteKinds, kindOf(s.kind as never));
        if (s.guard?.battlefield) count(battlefields, s.guard.battlefield);
      }
    }
  }
  const spells = Object.values(catalog.spells)
    .filter((s) => s.context === 'battle')
    .map((s) => ({ id: s.id, name: s.name, effect: s.effect.type, target: s.target, pantheonId: s.pantheonId ?? null }));
  const plan = {
    schema: 'pantheon-realms-sprite-plan-1',
    note: 'Generated by `npm run sprites:plan` from the content catalog. Do not edit by hand.',
    contentVersion: catalog.versions.contentVersion,
    creatures,
    pantheons,
    siteKinds: Object.fromEntries([...siteKinds].sort()),
    battlefields: Object.fromEntries([...battlefields].sort()),
    climates: [...climates].sort(),
    battleSpells: spells,
  };
  mkdirSync(dirname(OUT), { recursive: true });
  // The interface's creature silhouettes as SVG sources for the silhouette placeholder strips.
  mkdirSync(SILHOUETTES, { recursive: true });
  for (const [body, draw] of Object.entries(CREATURE_SILHOUETTES)) {
    for (const up of [false, true]) {
      const g = renderToStaticMarkup(draw(up)).replace(/currentColor/g, "#ffffff").replace(/var\(--[a-z-]+, (#[0-9a-f]+)\)/gi, "$1");
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><g fill="#ffffff" color="#ffffff" stroke-linejoin="round">${g}</g></svg>\n`;
      writeFileSync(join(SILHOUETTES, `${body}.${up ? 'upgraded' : 'base'}.svg`), svg);
    }
  }
  writeFileSync(OUT, `${JSON.stringify(plan, null, 2)}\n`);
  console.log(`content plan: ${creatures.length} creature forms, ${pantheons.length} pantheons, ${siteKinds.size} site kinds, ${spells.length} battle spells → ${OUT}`);
});
