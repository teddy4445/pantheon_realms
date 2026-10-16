/**
 * Development tool (never packaged): print the content-v2 region maps as text,
 * one character per cell (offset rows, so rows look as on screen), with sites
 * by letter. `PREFIX=three_beacons npx vitest run --config tools/campaign-v2/vitest.config.ts tools/campaign-v2/render.measure.ts`
 */
import { it } from 'vitest';
import { loadCatalog } from '@pr/content';
import { edgeKey } from '@pr/rules';

it('render', () => {
const catalog = loadCatalog();
const prefix = process.env.PREFIX ?? '';
for (const m of Object.values(catalog.missions)) {
  if (!m.map || !m.id.startsWith(prefix)) continue;
  const map = m.map;
  const off = Math.floor((map.height - 1) / 2);
  const cols = map.width - off;
  const siteAt = new Map(m.sites.map((s, i) => [`${s.coord.q},${s.coord.r}`, { s, ch: String.fromCharCode(i < 26 ? 65 + i : 97 + i - 26) }]));
  const roads = new Set<string>();
  for (const k of map.roads) for (const c of k.split('|')) roads.add(c);
  console.log(`\n=== ${m.id} — ${m.name} (${cols} x ${map.height})`);
  for (let y = 0; y < map.height; y++) {
    let line = y % 2 ? ' ' : '';
    for (let x = 0; x < cols; x++) {
      const q = x - Math.floor(y / 2) + off;
      const k = `${q},${y}`;
      const site = siteAt.get(k);
      const t = map.rows[y]![q]!;
      const ch = site ? site.ch : roads.has(k) ? (t === 'p' ? '=' : t === 's' ? '≈' : '#') : ({ p: '.', f: 'f', r: ':', s: '~', m: '^', w: ' ', v: ' ' } as Record<string, string>)[t] ?? '?';
      line += ch + ' ';
    }
    console.log(line);
  }
  for (const [k, v] of siteAt) console.log(`  ${v.ch} ${v.s.id} (${v.s.kind.type}) ${v.s.name} @${k}`);
  void edgeKey;
}
});
