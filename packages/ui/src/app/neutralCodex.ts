/**
 * What the encyclopedia and the unit page say about a neutral species of the
 * campaign expansion (handoff 2026-10-15, screen spec `unit-details`): its forms,
 * where it lives and where it can be hired — all read from content data (the
 * family, the habitat table and the creature camps of every mission in the
 * catalog, the map editor's site kinds). Read-only; no state.
 *
 * Neutral upgrades (2026-10-15): the six families are base + one upgrade now;
 * both forms are hired at the family's hiring sites from one shared stock and a
 * base stack trains there (`campSiteForms`), and the habitat is the family's.
 */
import { campSiteForms, isSingleForm, resources, subtractResources, type ContentCatalog } from '@pr/rules';
import { NEUTRAL_V2_HABITATS } from '@pr/content';
import { CUSTOM_SITE_KINDS } from '@pr/session';
import { creatureHabitat, resourceText } from './neutralRecruit';
import { siteKindLabel } from './view';

export interface HiringPlace {
  readonly campaignId: string | null;
  readonly campaignName: string;
  readonly missionId: string;
  readonly chapterName: string;
  readonly siteId: string;
  readonly siteName: string;
  /** The site's kind as the map names it ('Hiring site', 'Creature camp'). */
  readonly siteKind: string;
  /** Hiring opens only after a pact (a mission flag). */
  readonly pact: boolean;
}

export interface HiringSource {
  readonly places: readonly HiringPlace[];
  /** Per campaign, in catalog order: its name and how many of its chapters hire the creature. */
  readonly campaigns: readonly { readonly campaignId: string | null; readonly name: string; readonly chapters: number }[];
  /** The kinds of site that hire it in those chapters ('Hiring site'…). */
  readonly siteKinds: readonly string[];
  /** The map editor's site that can sell any creature ('Creature Camp'), when the editor has one. */
  readonly editorSite: string | null;
  /** One sentence: "Hired at hiring sites in The Winter Oath (3 chapters); on editor maps at a Creature Camp." */
  readonly text: string;
}

const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** Every place in the catalog's missions where `creatureId` is hired (either form of a hiring site's family), and the editor's camp. */
export function hiringSource(catalog: ContentCatalog, creatureId: string): HiringSource {
  const places: HiringPlace[] = [];
  const missions = Object.values(catalog.missions).sort((a, b) => {
    const ca = a.campaignId ? Object.keys(catalog.campaigns).indexOf(a.campaignId) : 99;
    const cb = b.campaignId ? Object.keys(catalog.campaigns).indexOf(b.campaignId) : 99;
    return ca - cb || a.order - b.order || (a.id < b.id ? -1 : 1);
  });
  for (const m of missions) {
    for (const s of m.sites) {
      if (s.kind.type !== 'creature_camp' || !campSiteForms(catalog, s).includes(creatureId)) continue;
      places.push({
        campaignId: m.campaignId,
        campaignName: m.campaignId ? (catalog.campaigns[m.campaignId]?.name ?? m.campaignId) : 'scenarios',
        missionId: m.id,
        chapterName: m.name,
        siteId: s.id,
        siteName: s.name,
        siteKind: siteKindLabel(s),
        pact: !!s.kind.requiresFlag,
      });
    }
  }
  const campaigns: { campaignId: string | null; name: string; chapters: number }[] = [];
  for (const p of places) {
    let c = campaigns.find((x) => x.campaignId === p.campaignId);
    if (!c) campaigns.push((c = { campaignId: p.campaignId, name: p.campaignName, chapters: 0 }));
    c.chapters = new Set(places.filter((x) => x.campaignId === p.campaignId).map((x) => x.missionId)).size;
  }
  const siteKinds = [...new Set(places.map((p) => p.siteKind))];
  const editorSite = CUSTOM_SITE_KINDS.find((k) => k.id === 'creature_camp')?.label ?? null;
  const kinds = siteKinds.map((k) => `${k.toLowerCase()}s`).join(' or ');
  const where = campaigns.map((c) => `${c.name} (${count(c.chapters, 'chapter', 'chapters')})`);
  const list = where.length > 1 ? `${where.slice(0, -1).join(', ')} and ${where[where.length - 1]}` : (where[0] ?? '');
  const parts: string[] = [];
  if (places.length) parts.push(`Hired at ${kinds} in ${list}`);
  if (editorSite) parts.push(`${places.length ? 'on' : 'On'} editor maps at a ${editorSite}`);
  const text = parts.length ? `${parts.join('; ')}.` : 'Not hired anywhere yet.';
  return { places, campaigns, siteKinds, editorSite, text };
}

export interface NeutralFacts {
  /** The family has exactly one form. */
  readonly singleForm: boolean;
  readonly habitat: string | null;
  readonly hiring: HiringSource;
  /**
   * How the two forms are had: "Both forms are hired at the same hiring sites from one shared
   * weekly stock; Pegasi already in an army train there into Dawncrest Pegasi for 75 Gold each."
   * Null for a single-form family.
   */
  readonly forms: string | null;
}

/**
 * The neutral facts of a creature of the expansion's neutral families (those with
 * a habitat entry, by family/base ID) or of any single-form neutral family; null
 * for every other creature (older two-form neutral families, pantheon rosters):
 * their pages stay as they were.
 */
export function neutralFacts(catalog: ContentCatalog, creatureId: string): NeutralFacts | null {
  const def = catalog.creatures[creatureId];
  const fam = def ? catalog.families[def.familyId] : undefined;
  if (!def || !fam || fam.classification !== 'neutral') return null;
  const single = isSingleForm(fam);
  if (!single && !NEUTRAL_V2_HABITATS[fam.baseCreatureId]) return null;
  const base = catalog.creatures[fam.baseCreatureId];
  const up = fam.upgradedCreatureId ? catalog.creatures[fam.upgradedCreatureId] : undefined;
  let forms: string | null = null;
  if (!single && base && up) {
    const diff = base.cost && up.cost ? subtractResources(up.cost, base.cost) : resources();
    forms = `Both forms are hired at the same hiring sites from one shared weekly stock; ${base.pluralName} already in an army train there into ${up.pluralName} for ${resourceText(diff) || 'nothing'} each.`;
  }
  return { singleForm: single, habitat: creatureHabitat(catalog, creatureId), hiring: hiringSource(catalog, creatureId), forms };
}
