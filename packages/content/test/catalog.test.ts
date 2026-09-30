import { describe, expect, it } from 'vitest';
import { buildCatalog, validateCatalog } from '../src';

describe('content catalog', () => {
  const catalog = buildCatalog();
  it('passes every validator', () => {
    const report = validateCatalog(catalog);
    expect(report.issues).toEqual([]);
  });
});

const PROPOSED = ['norse', 'egyptian', 'japanese', 'celtic', 'mesoamerican'];

describe.each(PROPOSED)('%s pantheon (proposed values)', (pid) => {
  const catalog = buildCatalog();
  const p = catalog.pantheons[pid]!;
  const greek = catalog.pantheons['greek']!;

  it('is playable with seven implemented families, each exactly base + one upgrade', () => {
    expect(p.playability).toBe('playable');
    expect(p.roster.map((r) => r.tier)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    for (const r of p.roster) {
      const fam = catalog.families[r.familyId]!;
      expect(fam.pantheonId).toBe(pid);
      expect(fam.implementationStatus).toBe('implemented');
      const base = catalog.creatures[fam.baseCreatureId]!;
      const up = catalog.creatures[fam.upgradedCreatureId]!;
      expect(base.upgradeId).toBe(up.id);
      expect(up.baseId).toBe(base.id);
      expect(base.stats).toBeDefined();
      expect(up.stats).toBeDefined();
      expect(base.balanceStatus).toBe('proposed_unplaytested');
      expect(base.provenance.source).toBe('proposed-this-build');
      expect(catalog.lore[base.loreId]).toBeDefined();
      for (const id of [...base.abilityIds, ...up.abilityIds]) expect(catalog.abilities[id]?.implementationStatus).toBe('implemented');
    }
  });

  it('has an 18-location town whose chains mirror the Greek tree cost-for-cost', () => {
    const nt = catalog.townArchetypes[p.townArchetypeId!]!;
    const gt = catalog.townArchetypes[greek.townArchetypeId!]!;
    expect(nt.pantheonId).toBe(pid);
    expect(nt.slots).toHaveLength(18);
    for (const slot of gt.slots) {
      const other = nt.slots.find((s) => s.id === slot.id)!;
      expect(other.chain.length).toBe(slot.chain.length);
      slot.chain.forEach((gid, i) => {
        const g = catalog.buildings[gid]!;
        const n = catalog.buildings[other.chain[i]!]!;
        expect(n.pantheonId).toBe(pid);
        expect(n.cost).toEqual(g.cost);
        expect(n.implementationStatus).toBe(g.implementationStatus);
        expect(n.effects.map((e) => e.type)).toEqual(g.effects.map((e) => e.type));
        expect(n.requirements.map((r) => r.type)).toEqual(g.requirements.map((r) => r.type));
      });
    }
    // Every dwelling recruits its own tier's family.
    for (const r of p.roster) {
      const slot = nt.slots.find((s) => s.id === `dwelling_t${r.tier}`)!;
      for (const bid of slot.chain) expect(catalog.buildings[bid]!.dwelling?.familyId).toBe(r.familyId);
    }
  });

  it('uses one patron plus an exclusive minor pair built from the shared effect vocabulary', () => {
    const gods = p.godIds.map((id) => catalog.gods[id]!);
    expect(gods.filter((g) => g.role === 'patron' && g.implementationStatus === 'implemented')).toHaveLength(1);
    const minors = gods.filter((g) => g.role === 'minor' && g.exclusivityGroup === 'first_minor');
    expect(minors).toHaveLength(2);
    expect(minors.flatMap((g) => g.benefits.filter((b) => b.type === 'commander_attribute').map((b) => (b as { attribute: string }).attribute)).sort()).toEqual(['attack', 'defense']);
    // Proposed second choice: three gods, each with a real blessing, after a first commitment.
    const second = gods.filter((g) => g.exclusivityGroup === 'second_minor');
    expect(second).toHaveLength(3);
    for (const g of second) {
      expect(g.role).toBe('minor');
      expect(g.benefits.length).toBeGreaterThan(0);
      expect(g.favorCost).toBe(25);
      expect(g.requirements).toContainEqual({ type: 'has_god_in_group', group: 'first_minor' });
    }
    expect(p.signature?.effects.length).toBeGreaterThan(0);
  });

  it('has hireable heroes whose classes exist', () => {
    expect(p.heroIds.length).toBeGreaterThanOrEqual(5);
    for (const id of p.heroIds) {
      const h = catalog.heroes[id]!;
      expect(h.availability).toBe('hireable');
      expect(catalog.heroClasses[h.classId]).toBeDefined();
    }
  });
});

describe('Twin Harbors skirmish variants', () => {
  const catalog = buildCatalog();
  const pantheons = catalog.pantheonOrder;
  it('offers every pairing of the six playable pantheons', () => {
    const sk = catalog.skirmishes['skirmish_twin_harbors']!;
    expect(sk.variants).toHaveLength(pantheons.length * pantheons.length);
    for (const v of sk.variants!) {
      const m = catalog.missions[v.missionId]!;
      expect([m.player.pantheonId, m.rivals![0]!.pantheonId]).toEqual([v.playerPantheonId, v.rivalPantheonId]);
      for (const side of [m.player, m.rivals![0]!]) {
        const arch = catalog.townArchetypes[side.town.archetypeId]!;
        expect(arch.pantheonId).toBe(side.pantheonId);
        for (const b of side.town.buildings) expect(catalog.buildings[b]!.pantheonId).toBe(side.pantheonId);
        // The covenants granted in skirmish are exactly the families of the covenant-gated dwellings.
        const gated = arch.slots
          .flatMap((s) => s.chain)
          .map((id) => catalog.buildings[id]!)
          .flatMap((b) => b.requirements.filter((r) => r.type === 'town_has_covenant').map((r) => (r as { familyId: string }).familyId));
        expect([...side.town.covenants].sort()).toEqual([...new Set(gated)].sort());
        expect(catalog.heroes[side.hero.definitionId]!.pantheonId).toBe(side.pantheonId);
        for (const s of side.hero.army) expect(catalog.creatures[s.creatureId]!.pantheonId).toBe(side.pantheonId);
      }
    }
    expect(sk.missionId).toBe('skirmish_twin_harbors');
    expect(catalog.missions['skirmish_twin_harbors']!.player.pantheonId).toBe('greek');
  });
});

describe('Twin Harbors fairness', () => {
  const catalog = buildCatalog();
  it('pairs every site with an identical partner at the point-mirrored coordinate', () => {
    const m = catalog.missions['skirmish_twin_harbors']!;
    const tpl = catalog.mapTemplates[m.mapTemplateId]!;
    const key = (c: { q: number; r: number }) => `${c.q},${c.r}`;
    const byCoord = new Map(m.sites.map((s) => [key(s.coord), s]));
    for (const s of m.sites) {
      const partner = byCoord.get(key({ q: tpl.width - 1 - s.coord.q, r: tpl.height - 1 - s.coord.r }));
      expect(partner, s.id).toBeDefined();
      expect(partner!.kind.type).toBe(s.kind.type);
      expect(partner!.guard?.army ?? null).toEqual(s.guard?.army ?? null);
      if (s.kind.type === 'pickup' && partner!.kind.type === 'pickup') expect(partner!.kind.reward).toEqual(s.kind.reward);
    }
  });
  it('gives both sides of every pairing a leader of the same class archetype and stats', () => {
    for (const v of catalog.skirmishes['skirmish_twin_harbors']!.variants!) {
      const m = catalog.missions[v.missionId]!;
      const a = m.player.hero, b = m.rivals![0]!.hero;
      expect(a.defaults.attributes).toEqual(b.defaults.attributes);
      expect(a.defaults.skills).toEqual(b.defaults.skills);
      const ca = catalog.heroClasses[a.classId]!, cb = catalog.heroClasses[b.classId]!;
      expect(ca.primaryGainCycle).toEqual(cb.primaryGainCycle);
      expect(ca.startsWithSpellbook).toBe(cb.startsWithSpellbook);
    }
  });
});
