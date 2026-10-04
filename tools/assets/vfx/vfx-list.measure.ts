/**
 * Magic and Favor VFX list (development tool; never packaged in the game).
 *
 * Writes VFX_MAGIC_AND_FAVORS.md: every visual effect still to be made for
 * spells (battle and adventure), divine interventions (Favor miracles), divine
 * gifts and the Temple offering — with the asset IDs to deliver, where each
 * effect plays, its phases, what the game shows today and a one-line look.
 * The rows come from the content catalog, so a new spell or miracle appears
 * on the next run; the looks are hand-written in briefs.ts.
 *
 * Run: npm run vfx:list
 */
import { it } from 'vitest';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildCatalog } from '@pr/content';
import type { ContentCatalog, SpellDefinition } from '@pr/rules';
import { GIFT_LOOKS, MIRACLE_LOOKS, SPELL_LOOKS } from './briefs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
/** Effect strips in the game's sprite manifest (final art delivered and imported). */
const EFFECTS = (JSON.parse(readFileSync(join(ROOT, 'assets-runtime', 'sprites', 'manifest.json'), 'utf8')) as { effects: Record<string, { status?: string }> }).effects;
const delivered = (id: string): boolean => EFFECTS[id]?.status === 'final';
/** An asset ID as a table cell, marked ✓ when its final strip is in the game. */
const idCell = (id: string): string => `\`${id}\`${delivered(id) ? ' ✓' : ''}`;

type Effect = { readonly type: string; readonly stat?: string; readonly amount?: number; readonly durationRounds?: number };

const TARGET: Record<string, string> = {
  enemy_stack: 'one enemy stack',
  ally_stack: 'one friendly stack',
  friendly_army: 'the whole friendly army',
  enemy_army: 'the whole enemy army',
  known_tile: 'a known map tile',
  self: 'the casting hero (map)',
  none: 'no target',
  own_town: 'one of your towns',
};

/** The shared looping status overlay an effect leaves on a stack (null: none). */
function statusOf(e: Effect): string | null {
  const down = (e.amount ?? 0) < 0;
  switch (e.type) {
    case 'attack_bonus':
      return down ? 'attack_down' : 'attack_up';
    case 'defense_bonus':
      return down ? 'defense_down' : 'defense_up';
    case 'speed_bonus':
      return down ? 'speed_down' : 'speed_up';
    case 'max_damage_roll':
      return 'blessed';
    case 'min_damage_roll':
      return 'cursed';
    case 'melee_mitigation':
      return 'melee_ward';
    case 'ranged_mitigation':
      return 'ranged_ward';
    case 'mass_bonus':
    case 'battle_status':
      return `${e.stat}_${down ? 'down' : 'up'}`;
    default:
      return null;
  }
}

/** What the game plays today for a spell: its delivered strips, else the code-drawn look (fx.ts). */
function todayOf(sp: SpellDefinition): string {
  const phases = spellPhases(sp);
  const n = phases.filter(delivered).length;
  return n === phases.length ? 'final strips' : n > 0 ? `final strips for ${n} of ${phases.length} phases; code-drawn otherwise` : 'code-drawn look';
}

/** Phases to draw, with the asset ID of each (fx.<kind>.<id>.<phase>). */
function spellPhases(sp: SpellDefinition): string[] {
  const id = `fx.spell.${sp.id}`;
  const t = sp.effect.type;
  const army = sp.target === 'friendly_army' || sp.target === 'enemy_army';
  const out: string[] = [`${id}.cast`];
  if (sp.context === 'adventure') {
    if (t === 'reveal_radius') out.push(`${id}.area`);
    else if (t === 'recall') out.push(`${id}.depart`, `${id}.arrive`);
    else out.push(`${id}.aura`);
    return out;
  }
  if (t === 'direct_damage' || t === 'area_damage') out.push(`${id}.travel`);
  if (army) out.push(`${id}.screen`);
  out.push(`${id}.impact`);
  return out;
}

function esc(s: string): string {
  return s.replace(/\|/g, '\\|');
}

function spellRows(catalog: ContentCatalog, list: SpellDefinition[]): string[] {
  const rows = ['| Spell | Tier | Target | Mechanic | Draw (asset IDs) | Status overlay | Today | Look |', '|---|---|---|---|---|---|---|---|'];
  for (const sp of list) {
    const st = statusOf(sp.effect as Effect);
    const rounds = (sp.effect as Effect).durationRounds;
    rows.push(
      `| **${esc(sp.name)}** \`${sp.id}\` | ${sp.tier} | ${TARGET[sp.target] ?? sp.target} | ${esc(sp.summary)} | ${spellPhases(sp).map(idCell).join('<br>')} | ${st ? `${idCell(`fx.status.${st}`)}${rounds ? ` (${rounds} round${rounds > 1 ? 's' : ''})` : ''}` : '—'} | ${todayOf(sp)} | ${esc(SPELL_LOOKS[sp.id] ?? '_(look to be written)_')} |`,
    );
  }
  return rows;
}

it('writes VFX_MAGIC_AND_FAVORS.md', () => {
  const catalog = buildCatalog();
  const spells = Object.values(catalog.spells).sort((a, b) => a.tier - b.tier || (a.name < b.name ? -1 : 1));
  const battle = spells.filter((s) => s.context === 'battle');
  const adventure = spells.filter((s) => s.context === 'adventure');
  const miracles = Object.values(catalog.interventions ?? {});
  const gifts = Object.values(catalog.divineGifts ?? {}).sort((a, b) => a.favorCost - b.favorCost);
  const pantheonName = (id: string | undefined | null) => (id ? (catalog.pantheons[id]?.name ?? id) : 'Shared');
  const missing = [...spells.map((s) => s.id).filter((id) => !SPELL_LOOKS[id]), ...miracles.map((m) => m.id).filter((id) => !MIRACLE_LOOKS[id]), ...gifts.map((g) => g.id).filter((id) => !GIFT_LOOKS[id])];

  // Shared status overlays and who uses them.
  const statusUse = new Map<string, string[]>();
  for (const sp of battle) {
    const st = statusOf(sp.effect as Effect);
    if (st) statusUse.set(st, [...(statusUse.get(st) ?? []), sp.name]);
  }
  for (const m of miracles) {
    const st = statusOf(m.effect as Effect);
    if (st) statusUse.set(st, [...(statusUse.get(st) ?? []), `${m.name} (miracle)`]);
  }
  const STATUS_LOOK: Record<string, string> = {
    attack_up: 'Red-gold rising chevrons and a faint ember glow on the weapons.',
    attack_down: 'Weapons drained of colour; a slow grey drip downward.',
    defense_up: 'A blue-silver sheen and a thin ring on the ground.',
    defense_down: 'Cracks of dull light across a fading ring.',
    speed_up: 'Wind streaks curling around the feet; a short after-image when moving.',
    speed_down: 'Heavy violet haze at the feet; motion trails stretch.',
    blessed: 'Slow gold shimmer along the blades.',
    cursed: 'Grey haze above the heads, a crow silhouette now and then.',
    melee_ward: 'A translucent shield-shape facing the nearest enemy.',
    ranged_ward: 'A heat-shimmer dome that bends arrows.',
  };

  const miraclePhases = (m: { id: string }) => [`fx.miracle.${m.id}.screen`, `fx.miracle.${m.id}.impact`];
  const statusIds = [...statusUse.keys()].map((st) => `fx.status.${st}`);
  const allIds = [...statusIds, ...spells.flatMap(spellPhases), ...miracles.flatMap(miraclePhases), ...gifts.map((g) => `fx.gift.${g.id}`), 'fx.offering.rise', 'fx.offering.favor'];
  const L: string[] = [];
  const W = (s = '') => L.push(s);
  W('# Magic and Favor VFX');
  W();
  W('_Generated by `npm run vfx:list` (tools/assets/vfx/) from the content catalog; the looks are hand-written in `tools/assets/vfx/briefs.ts`. Regenerate after adding a spell, miracle or gift._');
  W();
  const nDone = allIds.filter(delivered).length;
  W(`**Status:** ${nDone === allIds.length ? `all ${allIds.length} asset IDs below have final strips in the game` : `${nDone} of the ${allIds.length} asset IDs below have final strips in the game; the others are drawn by the *code-drawn placeholders* (since 2026-10-03, see below)`} (marked ✓; the owner's delivery of 2026-10-04, imported into \`assets-runtime/sprites/manifest.json\`, \`effects\`). The code-drawn placeholders stay as the fallback (and Low quality keeps its short flashes). This is the list of visual effects for magic (spells) and Favor (divine interventions, divine gifts, the Temple offering). Nothing here changes rules: effects are presentation, play after the rules have resolved, and never decide an outcome (instant playback skips them).`);
  W();
  W('## What the game shows today');
  W();
  W('Before each phase the views look for a strip under that phase’s asset ID in the sprite manifest and play it (frames, rate, loop, anchor, scale and blending from the manifest); without one, code-drawn placeholders (PixiJS shapes and particles, no image files) draw the phase from a per-spell *look* — colour school, travel, impact, whole-field moment, reach and sound family — in `packages/presentation/src/fxLooks.ts` (a condensed form of the looks below), painted by `packages/presentation/src/fx.ts`. A whole-view `screen` strip covers the view at 60 % opacity, easing in and out (it also plays for map miracles, whose drawn look has no whole-view moment). The two map `aura` loops play only as delivered strips, on the hero for the rest of the day the spell was cast.');
  W('');
  W('- **Battle spells:** the sigil at the commander’s banner corner (`cast`), the bolt, orb, arrow, swarm, wisps or sky strike (`travel`), the impact on each stack the spell reaches — the target, the stacks beside it for area spells, the whole army for army spells (`impact`) — and for army spells a moment over the field (`screen`: night, storm, glow, wind, mist, rain, sun, dusk); then the numbers or the effect’s word.');
  W('- **Adventure spells:** the sigil on the hero; a ring spreading over the chosen tile as the fog lifts (Far Sight family, `area`); wind round the hero (Fleet Foot, Wings of Hermes); a column of light lifting the hero away and setting it down at the town (Homecoming, `depart`/`arrive`).');
  W('- **Miracles (divine interventions):** the painted miracle card first (when delivered), then in battle the field moment and the light, dome, banner or smite on each stack; on the map, wind, mist or motes on every hero, light over the chosen town, coins over the capital and over the resource bar’s Gold counter.');
  W('- **Divine gifts and the Temple offering:** an interface burst rising from the Temple on the town screen (the `fx.gift.*` / `fx.offering.rise` strip, else CSS pieces: coins, timber and stone, crystals, or light), light at each dwelling for Blessed Brood, and the same strip, smaller, where the gift lands: the resource counters, the visiting hero’s portrait (Anointing, Temple Relic) and the Favor counter (`fx.offering.favor`).');
  W('- **Status effects:** each status leaves a looping overlay on the stack with its own shape (rising chevrons, a ground ring with studs, a broken ring, wind arcs, violet haze, gold sparkles, a grey cloud with a crow, a shield, a dome), held still on Low quality and under Reduce motion (`fx.status.*`).');
  W('- **Low quality** (`effects: simple`) keeps a short flash per phase and leaves out the whole-field moments; **Reduce motion** and instant playback skip the effects.');
  W();
  W('## Conventions for every effect');
  W();
  W('- **Asset IDs:** `fx.spell.<spellId>.<phase>`, `fx.miracle.<interventionId>.<phase>`, `fx.gift.<giftId>`, `fx.offering.<phase>`, and the shared looping overlays `fx.status.<name>`. Each becomes an entry in `assets-runtime/sprites/manifest.json` (kind `effect`) like today’s `spell.*` placeholders, so a delivery is an art drop + import, never a code change.');
  W('- **Phases:** `cast` (on the caster: the commander’s banner corner in battle, the hero on the map), `travel` (a projectile, only for targeted damage), `impact` (on the target, anchored at its feet), `screen` (a full-field overlay for army-wide spells and battle miracles), `area` (a ring on the map for revealing spells), `aura` (a short loop while a map effect lasts), `depart`/`arrive` (Homecoming).');
  W('- **Strips:** single horizontal strips, transparent PNG, frames left to right: `cast` 6 frames @ 10 fps; `travel` 4-frame loop @ 12 fps; `impact` 8 frames @ 12 fps; `screen` 12 frames @ 12 fps; status overlays 6-frame loops @ 6 fps. Cell size in hexes: single target 1.6 hex wide (2.2 for two-hex creatures, scaled by the view), area spells 3 hexes, map `area` sized to the spell’s reveal radius.');
  W('- **Colour:** a pantheon’s spells and miracles use its accent; shared spells use the school colour — strike white-blue, fire orange, healing green-gold, blessing gold, curse violet-grey, wind white.');
  W('- **Accessibility:** no full-screen flashes when Reduce motion is on (the effect plays without the flash frames); status overlays never rely on colour alone (each has its own shape), and the numbers stay in the stack’s statistics.');
  W('- **Sound:** every effect pairs with a sound ID from `assets-runtime/audio/manifest.json`: `magic.cast` when a spell gathers, then `magic.<family>` from its look (strike, thunder, fire, heal, bless, curse, wind, frost, nature, swarm, water, shadow, holy, smite, reveal, teleport, coins, horn) — synthesized placeholders listed in the audio pipeline.');
  W();
  W('## Totals');
  W();
  W(`| Group | Effects | Asset IDs | Delivered |`);
  W('|---|---|---|---|');
  const battleIds = battle.reduce((n, s) => n + spellPhases(s).length, 0);
  const advIds = adventure.reduce((n, s) => n + spellPhases(s).length, 0);
  const battleMiracles = miracles.filter((m) => m.context === 'battle');
  const mapMiracles = miracles.filter((m) => m.context === 'adventure');
  const got = (ids: string[]) => ids.filter(delivered).length;
  W(`| Shared status overlays | ${statusUse.size} | ${statusUse.size} | ${got(statusIds)} |`);
  W(`| Battle spells | ${battle.length} | ${battleIds} | ${got(battle.flatMap(spellPhases))} |`);
  W(`| Adventure spells | ${adventure.length} | ${advIds} | ${got(adventure.flatMap(spellPhases))} |`);
  W(`| Battle miracles | ${battleMiracles.length} | ${battleMiracles.length * 2} | ${got(battleMiracles.flatMap(miraclePhases))} |`);
  W(`| Map miracles | ${mapMiracles.length} | ${mapMiracles.length * 2} | ${got(mapMiracles.flatMap(miraclePhases))} |`);
  W(`| Divine gifts | ${gifts.length} | ${gifts.length} | ${got(gifts.map((g) => `fx.gift.${g.id}`))} |`);
  W(`| Temple offering | 1 | 2 | ${got(['fx.offering.rise', 'fx.offering.favor'])} |`);
  W(`| **All** | **${statusUse.size + battle.length + adventure.length + miracles.length + gifts.length + 1}** | **${allIds.length}** | **${got(allIds)}** |`);
  W();
  W('## Suggested order');
  W();
  W('1. The shared status overlays (`fx.status.*`): they make every buff and curse readable on the stacks, and miracles reuse them.');
  W('2. The tier-1 battle spells every hero meets first (Spark, Blessing, Ward, War Cry, Swiftness, Ill Omen, Shield of Faith, Hearthlight), then each pantheon’s spells as that pantheon is play-tested.');
  W('3. Battle miracles (the “screen” layer pairs with the painted miracle card).');
  W('4. Adventure spells and map miracles; then gifts and the offering on the town screen.');
  W();
  W('## Shared status overlays (looping, on the stack)');
  W();
  W('| Overlay | Look | Used by |');
  W('|---|---|---|');
  for (const [st, users] of [...statusUse.entries()].sort()) W(`| ${idCell(`fx.status.${st}`)} | ${STATUS_LOOK[st] ?? '—'} | ${esc(users.join(', '))} |`);
  W();
  W('## Battle spells');
  W();
  for (const pid of [null, ...catalog.pantheonOrder]) {
    const list = battle.filter((s) => (s.pantheonId ?? null) === pid);
    if (!list.length) continue;
    W(`### ${pantheonName(pid)}${pid ? ' (pantheon spells)' : ' (every pantheon)'}`);
    W();
    for (const r of spellRows(catalog, list)) W(r);
    W();
  }
  W('## Adventure spells (on the map)');
  W();
  W('Played on the adventure map layer (`packages/presentation/src/adventure.ts`), anchored at the hero (`cast`, `aura`, `depart`) or at the chosen tile (`area`, `arrive`).');
  W();
  for (const r of spellRows(catalog, adventure).map((r) => r.replace('| Status overlay ', '| Status overlay '))) W(r);
  W();
  W('## Divine interventions (Favor miracles)');
  W();
  W('Each miracle already has its painted card (Big Moments). The VFX are the moment on the field or the map after the card: `screen` (the sky over the battlefield, or a map overlay) and `impact` (on each affected stack, hero or town). Status miracles reuse the shared overlays.');
  W();
  W('| Miracle | Where | Favor | Pantheons | Target | Mechanic | Draw (asset IDs) | Status overlay | Look |');
  W('|---|---|---|---|---|---|---|---|---|');
  for (const m of [...battleMiracles, ...mapMiracles]) {
    const st = statusOf(m.effect as Effect);
    const rounds = (m.effect as Effect).durationRounds;
    W(
      `| **${esc(m.name)}** \`${m.id}\` | ${m.context === 'battle' ? 'Battle' : 'Map'} | ${m.favorCost} | ${m.pantheonIds?.length ? m.pantheonIds.map((p) => pantheonName(p)).join(', ') : 'All'} | ${TARGET[m.target] ?? m.target} | ${esc(m.summary)} | ${miraclePhases(m).map(idCell).join('<br>')} | ${st ? `${idCell(`fx.status.${st}`)}${rounds ? ` (${rounds} rounds)` : ''}` : '—'} | ${esc(MIRACLE_LOOKS[m.id] ?? '_(look to be written)_')} |`,
    );
  }
  W();
  W('## Divine gifts (bought with Favor at the Temple)');
  W();
  W('Played on the town screen at the Pantheon Temple location (its placement in the town archetype), flowing to the resource bar, the dwellings or the visiting hero.');
  W();
  W('| Gift | Favor | What it gives | Draw (asset ID) | Look |');
  W('|---|---|---|---|---|');
  for (const g of gifts) W(`| **${esc(g.name)}** \`${g.id}\` | ${g.favorCost} | ${esc(g.summary)} | ${idCell(`fx.gift.${g.id}`)} | ${esc(GIFT_LOOKS[g.id] ?? '_(look to be written)_')} |`);
  W();
  W('## Temple offering');
  W();
  W('| Effect | Draw (asset IDs) | Look |');
  W('|---|---|---|');
  W(`| Creatures offered at the Temple for Favor | ${idCell('fx.offering.rise')}<br>${idCell('fx.offering.favor')} | The offered creatures dissolve into motes of light that rise into the temple; a burst of gold Favor sparks flies to the Favor counter. |`);
  W();
  if (missing.length) {
    W('## Looks still to write');
    W();
    W(missing.map((id) => `\`${id}\``).join(', '));
    W();
  }
  writeFileSync(join(ROOT, 'VFX_MAGIC_AND_FAVORS.md'), L.join('\n'));
  console.log(`VFX list: ${battle.length} battle spells, ${adventure.length} adventure spells, ${miracles.length} miracles, ${gifts.length} gifts; ${missing.length} looks missing`);
});
