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
 */
import { useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { ARTIFACT_SLOT_LABEL, type ArtifactSlot, type ContentCatalog, type CreatureTier, type PantheonDefinition } from '@pr/rules';
import { useStore } from '../app/context';
import { Panel, SectionTitle, Tabs } from '../components/kit';
import { ArtifactIcon, CreaturePortrait, Emblem, GodPortrait, HeroPortrait, BuildingArt, SkillIcon, SpecialtyLine, SpellIcon } from '../components/art';
import { CostList, ScreenHeader } from '../components/game';
import { Icon } from '../assets/icons';
import { AbilityBadge, SetBadge } from '../components/badges';
import { heroStory } from '../app/view';

type Tab = 'creatures' | 'gods' | 'heroes' | 'town' | 'spells' | 'skills' | 'artifacts' | 'abilities';

const TABS: readonly { id: Tab; label: string }[] = [
  { id: 'creatures', label: 'Bestiary' },
  { id: 'gods', label: 'Gods' },
  { id: 'heroes', label: 'Heroes' },
  { id: 'town', label: 'Towns' },
  { id: 'spells', label: 'Spells' },
  { id: 'skills', label: 'Skills' },
  { id: 'artifacts', label: 'Artifacts' },
  { id: 'abilities', label: 'Abilities' },
];

const RARITY_LABEL: Readonly<Record<string, string>> = { treasure: 'Treasure', minor: 'Minor artifact', major: 'Major artifact', relic: 'Relic' };
const RANKS = ['Basic', 'Advanced', 'Expert'] as const;

const notInPlay = (status: string) => (status === 'implemented' ? '' : status === 'preparation' ? 'Not playable yet' : 'Planned — not in play');

/** The banner that opens a pantheon's section: emblem in a medallion, name, epithet, ornamental rules. */
function PantheonDivider({ catalog, p }: { catalog: ContentCatalog; p: PantheonDefinition }) {
  return (
    <div className="codex-divider" role="heading" aria-level={2} aria-label={`${p.name} pantheon`}>
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

/** Every pantheon in the catalog's order, one below the other. */
function ByPantheon({ catalog, children }: { catalog: ContentCatalog; children: (p: PantheonDefinition) => ReactNode }) {
  return (
    <>
      {catalog.pantheonOrder.map((id) => {
        const p = catalog.pantheons[id];
        if (!p) return null;
        return (
          <section key={id} className="codex-pantheon" style={{ ['--faction' as string]: p.theme.accent }} data-testid={`codex-pantheon-${id}`}>
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
    <div className="bestiary-tier panel" data-eq="tier">
      <div className="bestiary-tier__head">
        <span className="tier-badge">T{tier as CreatureTier}</span> {fam.name} family
        <span className="codex-meta"> · growth {fam.baseGrowth}/week</span>
      </div>
      <div className="bestiary-tier__pair">
        {[fam.baseCreatureId, fam.upgradedCreatureId].map((cid) => {
          const c = catalog.creatures[cid];
          if (!c) return null;
          return (
            <button key={cid} type="button" className="bestiary-card" onClick={() => store.goto('unit-detail', { creatureId: cid })} data-testid={`codex-${cid}`}>
              <CreaturePortrait catalog={catalog} creatureId={cid} size="5.6rem" />
              <div>
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

function Bestiary({ catalog }: { catalog: ContentCatalog }) {
  const neutral = Object.values(catalog.families)
    .filter((f) => f.classification === 'neutral')
    .sort((a, b) => a.tier - b.tier || (a.name < b.name ? -1 : 1));
  return (
    <>
      <ByPantheon catalog={catalog}>
        {(p) => (
          <div className="bestiary">
            {p.roster.map((r) => (
              <CreatureTierPanel key={r.familyId} catalog={catalog} tier={r.tier} familyId={r.familyId} />
            ))}
          </div>
        )}
      </ByPantheon>
      {neutral.length ? (
        <section className="codex-pantheon codex-pantheon--neutral" data-testid="codex-pantheon-neutral">
          <div className="codex-divider" role="heading" aria-level={2} aria-label="Neutral creatures">
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

function Gods({ catalog }: { catalog: ContentCatalog }) {
  return (
    <ByPantheon catalog={catalog}>
      {(p) => (
        <div className="codex-cards codex-cards--wide">
          {p.godIds.map((g) => {
            const god = catalog.gods[g];
            if (!god) return null;
            const status = notInPlay(god.implementationStatus);
            return (
              <article key={g} className="codex-card codex-card--portrait panel" data-eq="card" data-testid={`codex-god-${g}`}>
                <GodPortrait catalog={catalog} godId={g} size="6.4rem" locked={god.implementationStatus !== 'implemented'} />
                <div className="codex-card__body">
                  <h3 className="codex-card__name">{god.name}</h3>
                  <div className="codex-card__sub">{god.domain}</div>
                  <div className="codex-meta">
                    {god.role === 'patron' ? 'Patron god' : god.role === 'minor' ? `Minor god · ${god.favorCost} Favor` : 'Not designed yet'}
                    {status ? ` · ${status}` : ''}
                  </div>
                  {god.benefitSummary.length ? (
                    <ul className="codex-bullets">
                      {god.benefitSummary.map((b) => (
                        <li key={b}>{b}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </ByPantheon>
  );
}

function Heroes({ catalog }: { catalog: ContentCatalog }) {
  return (
    <ByPantheon catalog={catalog}>
      {(p) => (
        <div className="codex-cards codex-cards--wide">
          {p.heroIds.map((h) => {
            const hero = catalog.heroes[h];
            if (!hero) return null;
            return (
              <article key={h} className="codex-card codex-card--portrait panel" data-eq="card" data-testid={`codex-hero-${h}`}>
                <HeroPortrait catalog={catalog} definitionId={h} size="6.4rem" />
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

function Towns({ catalog }: { catalog: ContentCatalog }) {
  return (
    <ByPantheon catalog={catalog}>
      {(p) => {
        const town = p.townArchetypeId ? catalog.townArchetypes[p.townArchetypeId] : undefined;
        if (!town) return <p className="codex-card__text dim">This pantheon has no town design yet.</p>;
        return (
          <div className="codex-cards">
            {town.slots.map((s) => (
              <Panel key={s.id} title={s.label} className="codex-town-slot" eq="slot">
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

function Spells({ catalog }: { catalog: ContentCatalog }) {
  const spells = Object.values(catalog.spells).sort((a, b) => a.tier - b.tier || (a.name < b.name ? -1 : 1));
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
                  <article key={sp.id} className="codex-card panel" data-eq="card" data-testid={`codex-spell-${sp.id}`}>
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

function Skills({ catalog }: { catalog: ContentCatalog }) {
  return (
    <div className="codex-cards codex-cards--wide">
      {Object.values(catalog.skills).map((sk) => (
        <article key={sk.id} className="codex-card panel" data-eq="card" data-testid={`codex-skill-${sk.id}`}>
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

function Artifacts({ catalog }: { catalog: ContentCatalog }) {
  const all = Object.values(catalog.artifacts);
  const slots = (Object.keys(ARTIFACT_SLOT_LABEL) as ArtifactSlot[]).filter((s) => all.some((a) => a.slot === s));
  const sets = Object.values(catalog.artifactSets ?? {});
  return (
    <>
      {slots.map((slot) => (
        <section key={slot} className="codex-group">
          <SectionTitle>{ARTIFACT_SLOT_LABEL[slot]}</SectionTitle>
          <div className="codex-cards">
            {all
              .filter((a) => a.slot === slot)
              .map((a) => (
                <article key={a.id} className="codex-card panel" data-eq="card" data-testid={`codex-artifact-${a.id}`}>
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
              <article key={set.id} className="codex-card panel" data-eq="set" data-testid={`codex-set-${set.id}`}>
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

function Abilities({ catalog }: { catalog: ContentCatalog }) {
  return (
    <div className="codex-cards codex-cards--wide">
      {Object.values(catalog.abilities).map((a) => (
        <article key={a.id} className="codex-card panel" data-eq="card" data-testid={`codex-ability-${a.id}`}>
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
    return () => {
      alive = false;
      ro.disconnect();
    };
  }, [root, key]);
}

export function EncyclopediaScreen() {
  const store = useStore();
  const catalog = store.catalog;
  const asked = store.screen.params.tab as string | undefined;
  const [tab, setTab] = useState<Tab>(TABS.some((t) => t.id === asked) ? (asked as Tab) : 'creatures');
  const set = (t: Tab) => {
    setTab(t);
    store.setParams({ tab: t });
  };
  const body = useRef<HTMLDivElement | null>(null);
  useEqualHeights(body, tab);
  return (
    <div className="screen codex-screen">
      <ScreenHeader title="Encyclopedia" />
      <div className="codex-bar">
        <Tabs<Tab> label="Encyclopedia sections" value={tab} onChange={set} tabs={TABS.map((t) => ({ ...t }))} />
      </div>
      <div className="codex-body scroll" key={tab} ref={body}>
        {tab === 'creatures' ? <Bestiary catalog={catalog} /> : null}
        {tab === 'gods' ? <Gods catalog={catalog} /> : null}
        {tab === 'heroes' ? <Heroes catalog={catalog} /> : null}
        {tab === 'town' ? <Towns catalog={catalog} /> : null}
        {tab === 'spells' ? <Spells catalog={catalog} /> : null}
        {tab === 'skills' ? <Skills catalog={catalog} /> : null}
        {tab === 'artifacts' ? <Artifacts catalog={catalog} /> : null}
        {tab === 'abilities' ? <Abilities catalog={catalog} /> : null}
      </div>
    </div>
  );
}
