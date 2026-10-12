/**
 * S16 Encyclopedia / Bestiary Index. Reads immutable content only, so it is
 * available from the main menu without a game in progress.
 *
 * Eight pages: Bestiary, Gods, Heroes and Towns show every pantheon one below
 * the other, each opened by its own divider (emblem, name, epithet; neutral
 * creatures close the bestiary); Spells, Skills, Artifacts (with the artifact
 * sets) and Abilities give every entry a card. Status is written into the
 * cards as plain text where it matters (content not yet in play says so), not
 * as tags. Within a page every card of a kind has the same height (the
 * tallest one's), so the grid reads as even rows.
 *
 * 1.1.0 (concept 12): the pages are parchment (the codex's single-page form:
 * nothing is cut to fit a two-page spread), and the pantheon pages carry a row
 * of six faction tabs that open each pantheon's section (plus Neutral in the
 * bestiary). A creature opens its own codex page (Unit Detail).
 *
 * 1.1.0 pre-game (handoff frontend-v1.1.0, screen 07): the library backdrop; the
 * pantheon row is a filter (All, the six pantheons, Neutral in the bestiary,
 * Shared for spells and skills without a pantheon); a search field narrows
 * every section at once (the sections show how many entries match) with a
 * no-results page that offers the sections that do match and a clear action.
 * The section, filter, search and scroll position live in the screen's
 * parameters, so returning from a creature's page restores them. Nothing is
 * locked or unlocked: every entry is always there.
 *
 * 1.1.3 (owner): the eight sections are a rail at the left (under the search;
 * arrow keys move between them), and every card wears a painted frame — the
 * pantheon's own frame in its section, the neutral frame elsewhere — over a
 * faint warm tint instead of a pale paper box; portraits sit in the painted
 * socket rim.
 */
import { useLayoutEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react';
import { ARTIFACT_SLOT_LABEL, type ArtifactSlot, type ContentCatalog, type CreatureTier, type PantheonDefinition } from '@pr/rules';
import { useStore } from '../app/context';
import { Panel, SectionTitle } from '../components/kit';
import { ArtifactIcon, CreaturePortrait, Emblem, GodPortrait, BuildingArt, SkillIcon, SpecialtyLine, SpellIcon } from '../components/art';
import { HeroFigure } from '../components/adventure';
import { GodBenefits, GodPrice } from '../components/godIcons';
import { CostList } from '../components/game';
import { ArtIcon, FrontendShell } from '../components/frontend';
import { guiThemeFor } from '../assets/guiArt';
import { Icon } from '../assets/icons';
import { AbilityBadge, SetBadge } from '../components/badges';
import { heroStory } from '../app/view';

type Tab = 'creatures' | 'gods' | 'heroes' | 'town' | 'spells' | 'skills' | 'artifacts' | 'abilities';

/** The eight sections, each with the category icon the frontend kit assigns (element-bindings.json). */
const TABS: readonly { id: Tab; label: string; icon: string }[] = [
  { id: 'creatures', label: 'Bestiary', icon: 'frontendkit.icon.bestiary' },
  { id: 'gods', label: 'Gods', icon: 'icon.ui.pantheon' },
  { id: 'heroes', label: 'Heroes', icon: 'icon.ui.recruit' },
  { id: 'town', label: 'Towns', icon: 'icon.world.town' },
  { id: 'spells', label: 'Spells', icon: 'icon.menu.encyclopedia' },
  { id: 'skills', label: 'Skills', icon: 'icon.ui.sword2' },
  { id: 'artifacts', label: 'Artifacts', icon: 'frontendkit.icon.artifacts' },
  { id: 'abilities', label: 'Abilities', icon: 'icon.action.ability' },
];

const RARITY_LABEL: Readonly<Record<string, string>> = { treasure: 'Treasure', minor: 'Minor artifact', major: 'Major artifact', relic: 'Relic' };
const RANKS = ['Basic', 'Advanced', 'Expert'] as const;

const notInPlay = (status: string) => (status === 'implemented' ? '' : status === 'preparation' ? 'Not playable yet' : 'Planned — not in play');

/** What a visible entry is keyed by (one per card or family panel). */
type Show = (key: string) => boolean;

interface CodexEntry {
  readonly tab: Tab;
  readonly key: string;
  /** A pantheon id, 'neutral' (creatures of no pantheon), 'shared' (spells and skills of no pantheon) or null (no faction data). */
  readonly faction: string | null;
  readonly text: string;
}

const fold = (t: string) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

/** One searchable entry per card, from the catalog's own fields (names and the text shown on the card). */
function codexIndex(catalog: ContentCatalog): CodexEntry[] {
  const out: CodexEntry[] = [];
  const add = (tab: Tab, key: string, faction: string | null, ...texts: (string | undefined | null)[]) => out.push({ tab, key, faction, text: fold(texts.filter(Boolean).join(' \u2022 ')) });
  const family = (familyId: string, faction: string) => {
    const f = catalog.families[familyId];
    if (!f) return;
    add('creatures', `fam:${familyId}`, faction, f.name, catalog.creatures[f.baseCreatureId]?.name, catalog.creatures[f.upgradedCreatureId]?.name);
  };
  for (const id of catalog.pantheonOrder) {
    const p = catalog.pantheons[id];
    if (!p) continue;
    for (const r of p.roster) family(r.familyId, id);
    for (const g of p.godIds) if (catalog.gods[g]) add('gods', `god:${g}`, id, catalog.gods[g]!.name, catalog.gods[g]!.domain);
    for (const h of p.heroIds) {
      const hero = catalog.heroes[h];
      if (hero) add('heroes', `hero:${h}`, id, hero.name, hero.title, catalog.heroClasses[hero.classId]?.name);
    }
    const town = p.townArchetypeId ? catalog.townArchetypes[p.townArchetypeId] : undefined;
    if (town) for (const sl of town.slots) add('town', `slot:${id}:${sl.id}`, id, sl.label, ...sl.chain.map((b) => catalog.buildings[b]?.name));
    else add('town', `slot:${id}:-`, id, p.name);
  }
  for (const f of Object.values(catalog.families)) if (f.classification === 'neutral') family(f.id, 'neutral');
  for (const sp of Object.values(catalog.spells)) add('spells', `spell:${sp.id}`, sp.pantheonId ?? 'shared', sp.name, sp.summary);
  for (const sk of Object.values(catalog.skills)) add('skills', `skill:${sk.id}`, sk.pantheonId ?? 'shared', sk.name, ...sk.rankSummaries);
  for (const a of Object.values(catalog.artifacts)) add('artifacts', `artifact:${a.id}`, null, a.name, a.summary, a.setId ? catalog.artifactSets?.[a.setId]?.name : null);
  for (const set of Object.values(catalog.artifactSets ?? {})) add('artifacts', `set:${set.id}`, null, set.name, set.summary, ...set.pieceIds.map((x) => catalog.artifacts[x]?.name));
  for (const a of Object.values(catalog.abilities)) add('abilities', `ability:${a.id}`, null, a.name, a.exactRule);
  return out;
}

/** The faction filter a section offers (none where the content has no faction). */
function factionOptions(catalog: ContentCatalog, tab: Tab, index: readonly CodexEntry[]): { id: string; label: string }[] {
  const pantheons = catalog.pantheonOrder.filter((id) => catalog.pantheons[id]);
  const named = (ids: readonly string[]) => ids.map((id) => ({ id, label: catalog.pantheons[id]!.name }));
  if (tab === 'creatures') return [{ id: 'all', label: 'All' }, ...named(pantheons), { id: 'neutral', label: 'Neutral' }];
  if (tab === 'gods' || tab === 'heroes' || tab === 'town') return [{ id: 'all', label: 'All' }, ...named(pantheons)];
  if (tab === 'spells' || tab === 'skills') {
    const here = new Set(index.filter((e) => e.tab === tab).map((e) => e.faction));
    return [{ id: 'all', label: 'All' }, ...named(pantheons.filter((id) => here.has(id))), ...(here.has('shared') ? [{ id: 'shared', label: 'Shared' }] : [])];
  }
  return [];
}

/** The banner that opens a pantheon's section: emblem in a medallion, name, epithet, ornamental rules. */
function PantheonDivider({ catalog, p }: { catalog: ContentCatalog; p: PantheonDefinition }) {
  return (
    <div className="codex-divider" role="heading" aria-level={2} aria-label={`${p.name} pantheon`} tabIndex={-1}>
      <span className="codex-divider__line" aria-hidden="true" />
      <span className="codex-divider__center">
        <span className="codex-divider__medal">
          <Emblem catalog={catalog} pantheonId={p.id} size="3rem" />
        </span>
        <span className="codex-divider__titles">
          <span className="codex-divider__name">{p.name}</span>
          <span className="codex-divider__epithet">{p.epithet}</span>
        </span>
      </span>
      <span className="codex-divider__line codex-divider__line--end" aria-hidden="true" />
    </div>
  );
}

/** Every pantheon in the catalog's order, one below the other (only those with a visible entry). */
function ByPantheon({ catalog, visible, children }: { catalog: ContentCatalog; visible: (pantheonId: string) => boolean; children: (p: PantheonDefinition) => ReactNode }) {
  return (
    <>
      {catalog.pantheonOrder.map((id) => {
        const p = catalog.pantheons[id];
        if (!p || !visible(id)) return null;
        return (
          <section key={id} className="codex-pantheon" style={{ ['--faction' as string]: p.theme.accent }} data-gui-theme={guiThemeFor(id)} data-testid={`codex-pantheon-${id}`}>
            <PantheonDivider catalog={catalog} p={p} />
            {children(p)}
          </section>
        );
      })}
    </>
  );
}

function CreatureTierPanel({ catalog, tier, familyId }: { catalog: ContentCatalog; tier: number; familyId: string }) {
  const store = useStore();
  const fam = catalog.families[familyId];
  if (!fam) return null;
  return (
    <div className="bestiary-tier codex-frame" data-eq="tier">
      <div className="bestiary-tier__head">
        <span className="tier-badge">T{tier as CreatureTier}</span> {fam.name} family
        <span className="codex-meta"> · growth {fam.baseGrowth}/week</span>
      </div>
      <div className="bestiary-tier__pair">
        {[fam.baseCreatureId, fam.upgradedCreatureId].map((cid, i) => {
          const c = catalog.creatures[cid];
          if (!c) return null;
          return (
            <button key={cid} type="button" className={`bestiary-card ${i === 0 ? 'bestiary-card--base' : 'bestiary-card--up'}`} onClick={() => store.goto('unit-detail', { creatureId: cid })} data-testid={`codex-${cid}`}>
              <span className="codex-socket">
                <CreaturePortrait catalog={catalog} creatureId={cid} size="5.6rem" />
              </span>
              <div className="bestiary-card__text">
                <div className="bestiary-card__kind">{i === 0 ? 'Base form' : 'Upgraded form'}</div>
                <div className="bestiary-card__name">{c.name}</div>
                {c.stats ? (
                  <div className="bestiary-card__stats">
                    <span title="Attack"><Icon name="attack" className="inline-icon" /> {c.stats.attack}</span>
                    <span title="Defense"><Icon name="defense" className="inline-icon" /> {c.stats.defense}</span>
                    <span title="Health"><Icon name="hp" className="inline-icon" /> {c.stats.hp}</span>
                    <span title="Damage"><Icon name="damage" className="inline-icon" /> {c.stats.damageMin}–{c.stats.damageMax}</span>
                    <span title="Speed"><Icon name="speed" className="inline-icon" /> {c.stats.speed}</span>
                  </div>
                ) : (
                  <div className="codex-meta">Stats not designed</div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Bestiary({ catalog, show }: { catalog: ContentCatalog; show: Show }) {
  const neutral = Object.values(catalog.families)
    .filter((f) => f.classification === 'neutral' && show(`fam:${f.id}`))
    .sort((a, b) => a.tier - b.tier || (a.name < b.name ? -1 : 1));
  return (
    <>
      <ByPantheon catalog={catalog} visible={(id) => !!catalog.pantheons[id]?.roster.some((r) => show(`fam:${r.familyId}`))}>
        {(p) => (
          <div className="bestiary">
            {p.roster.filter((r) => show(`fam:${r.familyId}`)).map((r) => (
              <CreatureTierPanel key={r.familyId} catalog={catalog} tier={r.tier} familyId={r.familyId} />
            ))}
          </div>
        )}
      </ByPantheon>
      {neutral.length ? (
        <section className="codex-pantheon codex-pantheon--neutral" data-testid="codex-pantheon-neutral">
          <div className="codex-divider" role="heading" aria-level={2} aria-label="Neutral creatures" tabIndex={-1}>
            <span className="codex-divider__line" aria-hidden="true" />
            <span className="codex-divider__center">
              <span className="codex-divider__medal">
                <Icon name="bestiary" style={{ width: '2.4rem', height: '2.4rem', color: 'var(--gold-300)' }} />
              </span>
              <span className="codex-divider__titles">
                <span className="codex-divider__name">Neutral</span>
                <span className="codex-divider__epithet">Creatures of no pantheon: they guard sites, sell themselves at camps and roam the wilds</span>
              </span>
            </span>
            <span className="codex-divider__line codex-divider__line--end" aria-hidden="true" />
          </div>
          <div className="bestiary">
            {neutral.map((f) => (
              <CreatureTierPanel key={f.id} catalog={catalog} tier={f.tier} familyId={f.id} />
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}

function Gods({ catalog, show }: { catalog: ContentCatalog; show: Show }) {
  return (
    <ByPantheon catalog={catalog} visible={(id) => !!catalog.pantheons[id]?.godIds.some((g) => show(`god:${g}`))}>
      {(p) => (
        <div className="codex-cards codex-cards--wide">
          {p.godIds.filter((g) => show(`god:${g}`)).map((g) => {
            const god = catalog.gods[g];
            if (!god) return null;
            const status = notInPlay(god.implementationStatus);
            return (
              <article key={g} className="codex-card codex-card--portrait codex-frame" data-eq="card" data-testid={`codex-god-${g}`}>
                <span className="codex-socket codex-socket--round">
                  <GodPortrait catalog={catalog} godId={g} size="6.4rem" locked={god.implementationStatus !== 'implemented'} />
                </span>
                <div className="codex-card__body">
                  <h3 className="codex-card__name">{god.name}</h3>
                  <div className="codex-card__sub">{god.domain}</div>
                  <div className="codex-meta">
                    {god.role === 'patron' ? 'Patron god' : god.role === 'minor' ? 'Minor god' : 'Not designed yet'}
                    {status ? ` · ${status}` : ''}
                  </div>
                  {god.benefitSummary.length ? <GodBenefits catalog={catalog} god={god} /> : null}
                  <GodPrice catalog={catalog} god={god} />
                </div>
              </article>
            );
          })}
        </div>
      )}
    </ByPantheon>
  );
}

function Heroes({ catalog, show }: { catalog: ContentCatalog; show: Show }) {
  return (
    <ByPantheon catalog={catalog} visible={(id) => !!catalog.pantheons[id]?.heroIds.some((h) => show(`hero:${h}`))}>
      {(p) => (
        <div className="codex-cards codex-cards--wide">
          {p.heroIds.filter((h) => show(`hero:${h}`)).map((h) => {
            const hero = catalog.heroes[h];
            if (!hero) return null;
            return (
              <article key={h} className="codex-card codex-card--portrait codex-card--hero codex-frame" data-eq="card" data-testid={`codex-hero-${h}`}>
                {/* The hero's character portrait as the card's picture (loaded when the card is shown). */}
                <span className="hero-bust-box hero-bust-box--codex">
                  <HeroFigure catalog={catalog} definitionId={h} name={hero.name} />
                </span>
                <div className="codex-card__body">
                  <h3 className="codex-card__name">{hero.name}</h3>
                  <div className="codex-card__sub">{hero.title}</div>
                  <div className="codex-meta">{catalog.heroClasses[hero.classId]?.name ?? hero.classId}</div>
                  <SpecialtyLine catalog={catalog} definitionId={h} size="2.8rem" />
                  {heroStory(hero.biography) ? <p className="codex-card__text">{heroStory(hero.biography)}</p> : null}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </ByPantheon>
  );
}

function Towns({ catalog, show }: { catalog: ContentCatalog; show: Show }) {
  const townOf = (id: string) => {
    const p = catalog.pantheons[id];
    return p?.townArchetypeId ? catalog.townArchetypes[p.townArchetypeId] : undefined;
  };
  return (
    <ByPantheon catalog={catalog} visible={(id) => (townOf(id) ? townOf(id)!.slots.some((sl) => show(`slot:${id}:${sl.id}`)) : show(`slot:${id}:-`))}>
      {(p) => {
        const town = townOf(p.id);
        if (!town) return <p className="codex-card__text dim">This pantheon has no town design yet.</p>;
        return (
          <div className="codex-cards">
            {town.slots.filter((sl) => show(`slot:${p.id}:${sl.id}`)).map((s) => (
              <Panel key={s.id} title={s.label} className="codex-town-slot codex-frame" eq="slot">
                {s.chain.map((b) => {
                  const bd = catalog.buildings[b];
                  if (!bd) return null;
                  const status = notInPlay(bd.implementationStatus);
                  return (
                    <div key={b} className="codex-building">
                      <BuildingArt artAssetId={bd.artAssetId} alt={bd.name} className="codex-building__art" />
                      <div>
                        <div className="codex-building__name">{bd.name}</div>
                        <div className="codex-card__text">{bd.summary}</div>
                        {status ? <div className="codex-meta">{status}</div> : <CostList cost={bd.cost} />}
                      </div>
                    </div>
                  );
                })}
              </Panel>
            ))}
          </div>
        );
      }}
    </ByPantheon>
  );
}

function Spells({ catalog, show }: { catalog: ContentCatalog; show: Show }) {
  const spells = Object.values(catalog.spells).filter((sp) => show(`spell:${sp.id}`)).sort((a, b) => a.tier - b.tier || (a.name < b.name ? -1 : 1));
  const tiers = [...new Set(spells.map((s) => s.tier))];
  return (
    <>
      {tiers.map((t) => (
        <section key={t} className="codex-group">
          <SectionTitle>Tier {t} spells</SectionTitle>
          <div className="codex-cards">
            {spells
              .filter((sp) => sp.tier === t)
              .map((sp) => {
                const status = notInPlay(sp.implementationStatus);
                return (
                  <article key={sp.id} className="codex-card codex-frame" data-eq="card" data-testid={`codex-spell-${sp.id}`}>
                    <SpellIcon iconAssetId={sp.iconAssetId} effectType={sp.effect.type} size="3.6rem" />
                    <div className="codex-card__body">
                      <h3 className="codex-card__name">{sp.name}</h3>
                      <div className="codex-meta">
                        {sp.manaCost} mana · {sp.context === 'battle' ? 'Battle' : 'Adventure map'} · {sp.pantheonId ? `${catalog.pantheons[sp.pantheonId]?.name} towns` : 'Any Sanctum'}
                        {sp.scope === 'expanded' ? ' · Skirmish and later campaigns' : ''}
                        {status ? ` · ${status}` : ''}
                      </div>
                      <p className="codex-card__text">{sp.summary}</p>
                      {sp.lore ? <p className="codex-card__lore">{sp.lore}</p> : null}
                    </div>
                  </article>
                );
              })}
          </div>
        </section>
      ))}
    </>
  );
}

function Skills({ catalog, show }: { catalog: ContentCatalog; show: Show }) {
  return (
    <div className="codex-cards codex-cards--wide">
      {Object.values(catalog.skills).filter((sk) => show(`skill:${sk.id}`)).map((sk) => (
        <article key={sk.id} className="codex-card codex-frame" data-eq="card" data-testid={`codex-skill-${sk.id}`}>
          <SkillIcon iconAssetId={sk.iconAssetId} size="3.6rem" />
          <div className="codex-card__body">
            <h3 className="codex-card__name">{sk.name}</h3>
            {sk.pantheonId || sk.scope === 'expanded' ? (
              <div className="codex-meta">
                {sk.pantheonId ? `${catalog.pantheons[sk.pantheonId]?.name} heroes` : ''}
                {sk.pantheonId && sk.scope === 'expanded' ? ' · ' : ''}
                {sk.scope === 'expanded' ? 'Skirmish and later campaigns' : ''}
              </div>
            ) : null}
            <dl className="codex-ranks">
              {sk.rankSummaries.map((r, i) => (
                <div key={i}>
                  <dt>{RANKS[i] ?? `Rank ${i + 1}`}</dt>
                  <dd>{r}</dd>
                </div>
              ))}
            </dl>
          </div>
        </article>
      ))}
    </div>
  );
}

function Artifacts({ catalog, show }: { catalog: ContentCatalog; show: Show }) {
  const all = Object.values(catalog.artifacts).filter((a) => show(`artifact:${a.id}`));
  const slots = (Object.keys(ARTIFACT_SLOT_LABEL) as ArtifactSlot[]).filter((s) => all.some((a) => a.slot === s));
  const sets = Object.values(catalog.artifactSets ?? {}).filter((set) => show(`set:${set.id}`));
  return (
    <>
      {slots.map((slot) => (
        <section key={slot} className="codex-group">
          <SectionTitle>{ARTIFACT_SLOT_LABEL[slot]}</SectionTitle>
          <div className="codex-cards">
            {all
              .filter((a) => a.slot === slot)
              .map((a) => (
                <article key={a.id} className="codex-card codex-frame" data-eq="card" data-testid={`codex-artifact-${a.id}`}>
                  <ArtifactIcon iconAssetId={a.iconAssetId} kind={a.slot} size="3.6rem" rarity={a.rarity} />
                  <div className="codex-card__body">
                    <h3 className="codex-card__name">{a.name}</h3>
                    {a.rarity || a.setId ? (
                      <div className="codex-meta">
                        {a.rarity ? (RARITY_LABEL[a.rarity] ?? a.rarity) : null}
                        {a.rarity && a.setId ? ' · ' : null}
                        {a.setId ? (
                          <>
                            <SetBadge catalog={catalog} setId={a.setId} size="1rem" /> {catalog.artifactSets?.[a.setId]?.name ?? 'Set'}
                          </>
                        ) : null}
                      </div>
                    ) : null}
                    <p className="codex-card__text">{a.summary}</p>
                    {a.lore ? <p className="codex-card__lore">{a.lore}</p> : null}
                  </div>
                </article>
              ))}
          </div>
        </section>
      ))}
      {sets.length ? (
        <section className="codex-group">
          <SectionTitle>Artifact sets</SectionTitle>
          <div className="codex-cards codex-cards--wide">
            {sets.map((set) => (
              <article key={set.id} className="codex-card codex-frame" data-eq="set" data-testid={`codex-set-${set.id}`}>
                <SetBadge catalog={catalog} setId={set.id} size="3.2rem" />
                <div className="codex-card__body">
                  <h3 className="codex-card__name">{set.name}</h3>
                  <p className="codex-card__text">{set.summary}</p>
                  <div className="codex-meta">Pieces: {set.pieceIds.map((id) => catalog.artifacts[id]?.name ?? id).join(', ')}</div>
                  <ul className="codex-bullets">
                    {set.bonuses.map((b) => (
                      <li key={b.pieces}>{b.summary}</li>
                    ))}
                  </ul>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}

function Abilities({ catalog, show }: { catalog: ContentCatalog; show: Show }) {
  return (
    <div className="codex-cards codex-cards--wide">
      {Object.values(catalog.abilities).filter((a) => show(`ability:${a.id}`)).map((a) => (
        <article key={a.id} className="codex-card codex-frame" data-eq="card" data-testid={`codex-ability-${a.id}`}>
          <AbilityBadge catalog={catalog} abilityId={a.id} size="3rem" />
          <div className="codex-card__body">
            <h3 className="codex-card__name">{a.name}</h3>
            <div className="codex-meta">{a.activation === 'active' ? 'Active ability' : 'Passive ability'}</div>
            <p className="codex-card__text">{a.exactRule}</p>
            {a.restriction ? <p className="codex-card__lore">{a.restriction}</p> : null}
          </div>
        </article>
      ))}
    </div>
  );
}

/**
 * Equal card heights: every element marked `data-eq="<kind>"` inside the page gets
 * the height of the tallest of its kind; measured again when the page width
 * changes (cards rewrap) and once the fonts have loaded.
 */
function useEqualHeights(root: RefObject<HTMLElement | null>, key: unknown): void {
  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    let width = -1;
    const apply = () => {
      const groups = new Map<string, HTMLElement[]>();
      el.querySelectorAll<HTMLElement>('[data-eq]').forEach((n) => {
        const k = n.dataset.eq ?? '';
        const list = groups.get(k) ?? [];
        list.push(n);
        groups.set(k, list);
      });
      for (const list of groups.values()) {
        for (const n of list) n.style.minHeight = '';
        const h = Math.max(0, ...list.map((n) => n.getBoundingClientRect().height));
        for (const n of list) n.style.minHeight = `${Math.ceil(h)}px`;
      }
    };
    apply();
    const ro = new ResizeObserver(() => {
      if (el.clientWidth !== width) {
        width = el.clientWidth;
        apply();
      }
    });
    ro.observe(el);
    let alive = true;
    void document.fonts?.ready.then(() => alive && apply());
    // A picture that arrives later (portraits, building levels) can change a card's height.
    const onLoad = (e: Event) => {
      if (e.target instanceof HTMLImageElement) apply();
    };
    el.addEventListener('load', onLoad, true);
    return () => {
      alive = false;
      ro.disconnect();
      el.removeEventListener('load', onLoad, true);
    };
  }, [root, key]);
}

export function EncyclopediaScreen() {
  const store = useStore();
  const catalog = store.catalog;
  const params = store.screen.params;
  const asked = params.tab as string | undefined;
  const [tab, setTab] = useState<Tab>(TABS.some((t) => t.id === asked) ? (asked as Tab) : 'creatures');
  const [faction, setFaction] = useState<string>(typeof params.faction === 'string' ? params.faction : 'all');
  const [query, setQuery] = useState<string>(typeof params.q === 'string' ? params.q : '');
  const index = useMemo(() => codexIndex(catalog), [catalog]);
  const options = factionOptions(catalog, tab, index);
  const activeFaction = options.some((o) => o.id === faction) ? faction : 'all';
  const q = fold(query.trim());
  const matches = (e: CodexEntry) => !q || e.text.includes(q);
  const visibleKeys = new Set(index.filter((e) => e.tab === tab && (activeFaction === 'all' || e.faction === activeFaction) && matches(e)).map((e) => e.key));
  const show: Show = (key) => visibleKeys.has(key);
  const counts = new Map<Tab, number>(TABS.map((t) => [t.id, index.filter((e) => e.tab === t.id && matches(e)).length]));
  const body = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const filterRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  useEqualHeights(body, `${tab}|${activeFaction}|${q}`);
  // Back from a creature's page: the same scroll position (once the cards have their heights).
  const restored = useRef(false);
  useLayoutEffect(() => {
    const el = body.current;
    const top = typeof params.scroll === 'number' ? params.scroll : 0;
    if (!el || restored.current) return;
    restored.current = true;
    if (top > 0) {
      el.scrollTop = top;
      // The page can still grow for a moment (fonts, pictures, equal card heights): keep asking for the
      // saved position for about a second, unless the player scrolls first.
      let moved = false;
      const stop = () => {
        moved = true;
      };
      el.addEventListener('wheel', stop, { passive: true, once: true });
      el.addEventListener('pointerdown', stop, { once: true });
      el.addEventListener('keydown', stop, { once: true });
      let frames = 0;
      const again = () => {
        const b = body.current;
        if (moved || !b) return;
        if (b.scrollTop < top - 1) b.scrollTop = top;
        if (++frames < 60) requestAnimationFrame(again);
      };
      requestAnimationFrame(again);
      void document.fonts?.ready.then(again);
    }
  }, [params]);
  const set = (t: Tab) => {
    setTab(t);
    store.setParams({ tab: t, scroll: 0 });
    if (body.current) body.current.scrollTop = 0;
  };
  const pickFaction = (id: string) => {
    setFaction(id);
    store.setParams({ faction: id, scroll: 0 });
    if (body.current) body.current.scrollTop = 0;
  };
  const search = (v: string) => {
    setQuery(v);
    store.setParams({ q: v, scroll: 0 });
    if (body.current) body.current.scrollTop = 0;
  };
  const clear = () => {
    search('');
    searchRef.current?.focus();
  };
  const elsewhere = TABS.filter((t) => t.id !== tab && (counts.get(t.id) ?? 0) > 0);
  const tabLabel = TABS.find((t) => t.id === tab)?.label ?? '';
  return (
    <FrontendShell backdrop="library" title="Encyclopedia" className="codex-screen" label="Encyclopedia" onBack={() => store.back()}>
      <div className="codex-layout">
        {/* 1.1.3 (owner): the sections are a rail at the left, under the search; the page keeps the width. */}
        <aside className="codex-rail" aria-label="Encyclopedia sections and search">
          <div className="fe-search" role="search">
            <input
              ref={searchRef}
              type="search"
              className="text-input fe-search__input"
              value={query}
              maxLength={60}
              placeholder="Search…"
              aria-label="Search the encyclopedia"
              onChange={(e) => search(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape' && query) {
                  e.preventDefault();
                  e.stopPropagation();
                  clear();
                }
              }}
              data-testid="codex-search"
            />
            {query ? (
              <button type="button" className="fe-search__clear" aria-label="Clear the search" title="Clear the search" onClick={clear} data-testid="codex-search-clear">
                <Icon name="close" />
              </button>
            ) : null}
          </div>
          <div className="fe-codex-tabs codex-rail__tabs" role="tablist" aria-label="Encyclopedia sections" aria-orientation="vertical">
            {TABS.map((t, i) => (
              <button
                key={t.id}
                ref={(el) => {
                  tabRefs.current[i] = el;
                }}
                type="button"
                role="tab"
                className={`fe-settings__tab codex-rail__tab ${tab === t.id ? 'is-selected' : ''}`}
                aria-selected={tab === t.id}
                tabIndex={tab === t.id ? 0 : -1}
                onClick={() => set(t.id)}
                onKeyDown={(e) => {
                  const step = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? -1 : 0;
                  const to = e.key === 'Home' ? 0 : e.key === 'End' ? TABS.length - 1 : step ? (i + step + TABS.length) % TABS.length : -1;
                  if (to < 0) return;
                  e.preventDefault();
                  set(TABS[to]!.id);
                  tabRefs.current[to]?.focus();
                }}
              >
                <ArtIcon id={t.icon} className="tab__icon codex-rail__icon" />
                <span className="codex-rail__label">{t.label}</span>
                {q ? <span className="tab__count">{counts.get(t.id) ?? 0}</span> : null}
              </button>
            ))}
          </div>
        </aside>
        <div className="codex-main">
          {options.length ? (
            <div className="codex-factions" role="radiogroup" aria-label="Pantheon" data-testid="codex-factions">
              {options.map((o, i) => {
                const p = catalog.pantheons[o.id];
                const on = activeFaction === o.id;
                return (
                  <button
                    key={o.id}
                    ref={(el) => {
                      filterRefs.current[i] = el;
                    }}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    tabIndex={on ? 0 : -1}
                    className={`codex-faction ${on ? 'is-selected' : ''}`}
                    style={p ? { ['--faction' as string]: p.theme.accent } : undefined}
                    onClick={() => pickFaction(o.id)}
                    onKeyDown={(e) => {
                      const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
                      if (!step) return;
                      e.preventDefault();
                      const j = (i + step + options.length) % options.length;
                      pickFaction(options[j]!.id);
                      filterRefs.current[j]?.focus();
                    }}
                    title={p ? `${p.name}: ${p.epithet}` : o.id === 'neutral' ? 'Creatures of no pantheon' : o.id === 'shared' ? 'Open to every pantheon' : 'Every entry'}
                    data-testid={`codex-filter-${o.id}`}
                  >
                    {p ? <Emblem catalog={catalog} pantheonId={o.id} size="1.7rem" /> : o.id === 'neutral' ? <ArtIcon id="icon.ui.star" size="1.5rem" /> : null}
                    <span>{o.label}</span>
                  </button>
                );
              })}
            </div>
          ) : null}
          <div
            className="codex-body codex-page gui-surface--parchment scroll"
            key={tab}
            ref={body}
            onScroll={(e) => store.setParams({ scroll: Math.round(e.currentTarget.scrollTop) })}
            data-filter={activeFaction}
            data-testid="codex-body"
          >
            {visibleKeys.size === 0 ? (
              <div className="fe-noresults" role="status" data-testid="codex-no-results">
                <div className="fe-noresults__title">{q ? `Nothing in ${tabLabel} matches “${query.trim()}”` : `Nothing in ${tabLabel} for this pantheon`}</div>
                {q && elsewhere.length ? (
                  <div className="fe-noresults__body">
                    Found in other sections:
                    <span className="fe-noresults__links">
                      {elsewhere.map((t) => (
                        <button key={t.id} type="button" className="btn btn--small" onClick={() => set(t.id)} data-testid={`codex-found-${t.id}`}>
                          {t.label} ({counts.get(t.id)})
                        </button>
                      ))}
                    </span>
                  </div>
                ) : q ? (
                  <div className="fe-noresults__body">No entry in the encyclopedia uses these words. Try part of a name, such as a creature, god or spell.</div>
                ) : null}
                <div className="fe-noresults__actions">
                  {q ? (
                    <button type="button" className="btn" onClick={clear} data-testid="codex-no-results-clear">
                      Clear the search
                    </button>
                  ) : null}
                  {activeFaction !== 'all' ? (
                    <button type="button" className="btn" onClick={() => pickFaction('all')}>
                      Show every pantheon
                    </button>
                  ) : null}
                </div>
              </div>
            ) : null}
            {tab === 'creatures' ? <Bestiary catalog={catalog} show={show} /> : null}
            {tab === 'gods' ? <Gods catalog={catalog} show={show} /> : null}
            {tab === 'heroes' ? <Heroes catalog={catalog} show={show} /> : null}
            {tab === 'town' ? <Towns catalog={catalog} show={show} /> : null}
            {tab === 'spells' ? <Spells catalog={catalog} show={show} /> : null}
            {tab === 'skills' ? <Skills catalog={catalog} show={show} /> : null}
            {tab === 'artifacts' ? <Artifacts catalog={catalog} show={show} /> : null}
            {tab === 'abilities' ? <Abilities catalog={catalog} show={show} /> : null}
          </div>
        </div>
      </div>
    </FrontendShell>
  );
}
