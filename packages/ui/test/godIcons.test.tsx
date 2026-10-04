/**
 * God-card icon rows (Brief 8, Part B; delivered 2026-10-04): every blessing of
 * every designed god has an icon form whose tooltip and screen-reader text are
 * the content's own sentence, the numbers shown are the definition's numbers,
 * the price shows the Favor cost and one icon per requirement, and every
 * god-card icon the rows use is a delivered file. Rendered to static markup;
 * nothing here changes a rule.
 */
import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderToStaticMarkup } from 'react-dom/server';
import { buildCatalog } from '@pr/content';
import { resolveAsset } from '../src/assets/manifest';
import { GodBenefits, GodPrice, benefitGlyphs } from '../src/components/godIcons';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const catalog = buildCatalog();
const gods = Object.values(catalog.gods);
const ICONS = [
  ...['commanders', 'armies', 'creatures', 'shooters', 'flyers', 'growth', 'recovery', 'spell_unlock', 'daily_income', 'offering', 'fury'].map((x) => `icon.bless.${x}`),
  ...['temple', 'grand_temple', 'city_hall', 'after_first'].map((x) => `icon.req.${x}`),
  ...['patron', 'first_choice', 'second_choice', 'committed', 'excluded', 'permanent'].map((x) => `icon.god.${x}`),
];
const decode = (s: string) => s.replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');

describe('god-card icon rows', () => {
  it('uses the 21 delivered god-card icons', () => {
    for (const id of ICONS) {
      const url = resolveAsset(id).url;
      expect(url, id).not.toBeNull();
      expect(existsSync(path.join(root, 'assets-runtime', url!.replace(/^\.\//, ''))), id).toBe(true);
    }
  });

  it('every blessing of a designed god has an icon form carrying its sentence and its numbers', () => {
    for (const g of gods.filter((x) => x.role === 'minor' && x.implementationStatus === 'implemented')) {
      expect(g.benefits.length, g.id).toBe(g.benefitSummary.length);
      const html = decode(renderToStaticMarkup(<GodBenefits catalog={catalog} god={g} />));
      g.benefits.forEach((e, i) => {
        expect(benefitGlyphs(catalog, e), `${g.id} ${e.type}`).not.toBeNull();
        const sentence = g.benefitSummary[i]!;
        expect(html, `${g.id}: tooltip`).toContain(`title="${sentence}"`);
        expect(html, `${g.id}: screen-reader text`).toContain(`<span class="sr-only">${sentence}</span>`);
        // The number on the token is the definition's number.
        const x = e as unknown as Record<string, number>;
        const n = x.amount ?? x.percent ?? x.attack ?? x.goldPerFavor;
        if (typeof n === 'number') expect(html, `${g.id} ${e.type} shows ${n}`).toMatch(new RegExp(`>[+]?${n}%?(<| T)|/${n}<`));
      });
      // No sentence is left as a bullet when every blessing has its icons.
      expect(html, g.id).not.toContain('god-sentences');
    }
  });

  it('the price shows the Favor cost and one icon per requirement, each with its explanation', () => {
    for (const g of gods.filter((x) => x.role === 'minor')) {
      const html = decode(renderToStaticMarkup(<GodPrice catalog={catalog} god={g} />));
      expect(html, g.id).toContain(`title="Costs ${g.favorCost} Favor"`);
      expect(html, g.id).toContain(`>${g.favorCost}<`);
      expect((html.match(/class="god-tok /g) ?? []).length, g.id).toBe(1 + g.requirements.length);
      for (const r of g.requirements) {
        if (r.type === 'has_building') {
          expect(html, `${g.id} ${r.buildingId}`).toContain(`Needs ${catalog.buildings[r.buildingId]!.name}`);
          expect(html, `${g.id} ${r.buildingId}`).toMatch(/data-asset="icon\.req\.(temple|grand_temple|city_hall)"/);
        } else if (r.type === 'has_god_in_group') {
          expect(html, g.id).toContain('data-asset="icon.req.after_first"');
        }
      }
    }
  });

  it('patrons without a mechanical blessing keep their sentences', () => {
    for (const g of gods.filter((x) => x.role === 'patron' && x.benefits.length === 0)) {
      const html = decode(renderToStaticMarkup(<GodBenefits catalog={catalog} god={g} />));
      for (const s of g.benefitSummary) expect(html, g.id).toContain(s);
    }
  });
});
