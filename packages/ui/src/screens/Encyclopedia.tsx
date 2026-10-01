/**
 * S16 Encyclopedia / Bestiary Index. Reads immutable content only, so it is
 * available from the main menu without a game in progress. Implementation and
 * balance status are always shown, so preparation content is never mistaken
 * for playable content.
 */
import { useState } from 'react';
import { RESOURCE_LABELS, type CreatureTier } from '@pr/rules';
import { useStore } from '../app/context';
import { Chip, Panel, Tabs } from '../components/kit';
import { CreaturePortrait, Emblem, GodPortrait, HeroPortrait, BuildingArt } from '../components/art';
import { BalanceChip, CostList, ScreenHeader, StatusChip } from '../components/game';
import { Icon } from '../assets/icons';

type Tab = 'creatures' | 'pantheons' | 'gods' | 'heroes' | 'town' | 'magic' | 'world' | 'rules';

export function EncyclopediaScreen() {
  const store = useStore();
  const catalog = store.catalog;
  const [tab, setTab] = useState<Tab>((store.screen.params.tab as Tab | undefined) ?? 'creatures');
  const [pantheonId, setPantheonId] = useState<string>((store.screen.params.pantheonId as string | undefined) ?? 'greek');
  const pantheon = catalog.pantheons[pantheonId]!;
  const set = (t: Tab) => {
    setTab(t);
    store.setParams({ tab: t });
  };
  const rp = catalog.rulesProfile;
  const town = pantheon.townArchetypeId ? catalog.townArchetypes[pantheon.townArchetypeId] : undefined;
  return (
    <div className="screen codex-screen">
      <ScreenHeader title="Encyclopedia" subtitle="Creatures, gods, heroes, buildings and rules of this build" />
      <div className="codex-bar">
        <Tabs<Tab>
          label="Encyclopedia sections"
          value={tab}
          onChange={set}
          tabs={[
            { id: 'creatures', label: 'Bestiary' },
            { id: 'pantheons', label: 'Pantheons' },
            { id: 'gods', label: 'Gods' },
            { id: 'heroes', label: 'Heroes' },
            { id: 'town', label: 'Town' },
            { id: 'magic', label: 'Spells, Skills & Artifacts' },
            { id: 'world', label: 'Skirmish & World' },
            { id: 'rules', label: 'Rules' },
          ]}
        />
        {tab === 'creatures' || tab === 'gods' || tab === 'heroes' || tab === 'town' ? (
          <div className="row gap" role="group" aria-label="Pantheon filter">
            {catalog.pantheonOrder.map((id) => (
              <button
                key={id}
                type="button"
                className={`filter-chip ${pantheonId === id ? 'is-on' : ''}`}
                onClick={() => {
                  setPantheonId(id);
                  store.setParams({ pantheonId: id });
                }}
                aria-pressed={pantheonId === id}
              >
                <Emblem catalog={catalog} pantheonId={id} size="1.4rem" /> {catalog.pantheons[id]?.name}
              </button>
            ))}
          </div>
        ) : null}
      </div>
      <div className="codex-body scroll">
        {tab === 'creatures' ? (
          <div className="bestiary">
            {pantheon.roster.map((r) => {
              const fam = catalog.families[r.familyId];
              if (!fam) return null;
              return (
                <div key={r.tier} className="bestiary-tier panel">
                  <div className="bestiary-tier__head">
                    <span className="tier-badge">T{r.tier as CreatureTier}</span> {fam.name} family <StatusChip status={fam.implementationStatus} />{' '}
                    <BalanceChip status={catalog.creatures[fam.baseCreatureId]?.balanceStatus ?? 'not_applicable'} />
                    <span className="faint small"> · growth {fam.baseGrowth}/week</span>
                  </div>
                  <div className="bestiary-tier__pair">
                    {[fam.baseCreatureId, fam.upgradedCreatureId].map((cid) => {
                      const c = catalog.creatures[cid]!;
                      return (
                        <button key={cid} type="button" className="bestiary-card" onClick={() => store.goto('unit-detail', { creatureId: cid })} data-testid={`codex-${cid}`}>
                          <CreaturePortrait catalog={catalog} creatureId={cid} size="5rem" showPlaceholderTag />
                          <div>
                            <div className="bestiary-card__name">{c.name}</div>
                            <div className="faint small">
                              {c.form === 'upgraded' ? 'Upgraded form' : 'Base form'} · {c.roleLabel}
                            </div>
                            {c.stats ? (
                              <div className="small row gap">
                                <span title="Attack"><Icon name="attack" className="inline-icon" /> {c.stats.attack}</span>
                                <span title="Defense"><Icon name="defense" className="inline-icon" /> {c.stats.defense}</span>
                                <span title="Health"><Icon name="hp" className="inline-icon" /> {c.stats.hp}</span>
                                <span title="Damage"><Icon name="damage" className="inline-icon" /> {c.stats.damageMin}–{c.stats.damageMax}</span>
                                <span title="Speed"><Icon name="speed" className="inline-icon" /> {c.stats.speed}</span>
                              </div>
                            ) : (
                              <div className="faint small">Stats not designed</div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
        {tab === 'pantheons' ? (
          <div className="codex-grid">
            {catalog.pantheonOrder.map((id) => {
              const p = catalog.pantheons[id]!;
              return (
                <Panel key={id} title={p.name} style={{ ['--faction' as string]: p.theme.accent }}>
                  <div className="row gap">
                    <Emblem catalog={catalog} pantheonId={id} size="3.4rem" />
                    <div>
                      <div className="tagline">{p.epithet}</div>
                      <Chip tone={p.playability === 'playable' ? 'ok' : 'info'}>{p.playability === 'playable' ? 'Playable' : 'Preparation'}</Chip>
                      {p.provenance.source === 'proposed-this-build' ? <Chip tone="warn" title="Every number is proposed and unplaytested">Proposed values</Chip> : null}
                    </div>
                  </div>
                  <p className="small">{p.summary}</p>
                  <div className="faint small">
                    7 tiers · {p.godIds.length} gods · {p.heroIds.length} heroes · {p.townArchetypeId ? 'town designed' : 'town not designed'}
                  </div>
                </Panel>
              );
            })}
          </div>
        ) : null}
        {tab === 'gods' ? (
          <div className="codex-grid">
            {pantheon.godIds.map((g) => {
              const god = catalog.gods[g]!;
              return (
                <Panel key={g} title={god.name}>
                  <div className="row gap">
                    <GodPortrait catalog={catalog} godId={g} size="4rem" locked={god.implementationStatus !== 'implemented'} />
                    <div>
                      <div className="dim">{god.domain}</div>
                      <div className="row gap wrap">
                        <StatusChip status={god.implementationStatus} />
                        <Chip>{god.role}</Chip>
                        {god.favorCost ? <Chip tone="info">{god.favorCost} Favor</Chip> : null}
                      </div>
                    </div>
                  </div>
                  {god.benefitSummary.length ? (
                    <ul className="bullets small">
                      {god.benefitSummary.map((b) => (
                        <li key={b}>{b}</li>
                      ))}
                    </ul>
                  ) : null}
                </Panel>
              );
            })}
          </div>
        ) : null}
        {tab === 'heroes' ? (
          <div className="codex-grid">
            {pantheon.heroIds.map((h) => {
              const hero = catalog.heroes[h]!;
              return (
                <Panel key={h} title={hero.name}>
                  <div className="row gap">
                    <HeroPortrait catalog={catalog} definitionId={h} size="4.4rem" />
                    <div>
                      <div className="dim">{hero.title}</div>
                      <div className="row gap wrap">
                        <Chip>{catalog.heroClasses[hero.classId]?.name ?? hero.classId}</Chip>
                        <Chip tone={hero.availability === 'preview' ? 'muted' : 'info'}>{hero.availability}</Chip>
                      </div>
                    </div>
                  </div>
                  <p className="small">{hero.biography}</p>
                </Panel>
              );
            })}
          </div>
        ) : null}
        {tab === 'town' ? (
          town ? (
            <div className="codex-grid">
              {town.slots.map((s) => (
                <Panel key={s.id} title={s.label}>
                  {s.chain.map((b) => {
                    const bd = catalog.buildings[b]!;
                    return (
                      <div key={b} className="codex-building">
                        <BuildingArt artAssetId={bd.artAssetId} alt={bd.name} className="codex-building__art" />
                        <div>
                          <div>
                            <strong>{bd.name}</strong> <StatusChip status={bd.implementationStatus} />
                          </div>
                          <div className="small">{bd.summary}</div>
                          {bd.implementationStatus !== 'planned' ? <CostList cost={bd.cost} /> : null}
                        </div>
                      </div>
                    );
                  })}
                </Panel>
              ))}
            </div>
          ) : (
            <p className="dim">This pantheon has no town design yet.</p>
          )
        ) : null}
        {tab === 'magic' ? (
          <div className="codex-grid">
            <Panel title="Spells">
              {Object.values(catalog.spells).map((sp) => (
                <div key={sp.id} className="codex-line">
                  <strong>{sp.name}</strong> <Chip>T{sp.tier}</Chip> <Chip tone="info">{sp.manaCost} mana</Chip> <Chip>{sp.context}</Chip> <StatusChip status={sp.implementationStatus} />
                  {sp.pantheonId ? <Chip tone="info">{catalog.pantheons[sp.pantheonId]?.name}</Chip> : null}
                  {sp.scope === 'expanded' ? <Chip tone="muted">Skirmish only</Chip> : null}
                  <div className="small dim">{sp.summary}</div>
                </div>
              ))}
            </Panel>
            <Panel title="Skills">
              {Object.values(catalog.skills).map((sk) => (
                <div key={sk.id} className="codex-line">
                  <strong>{sk.name}</strong> {sk.pantheonId ? <Chip tone="info">{catalog.pantheons[sk.pantheonId]?.name}</Chip> : null}
                  {sk.scope === 'expanded' ? <Chip tone="muted">Skirmish only</Chip> : null}
                  <div className="small dim">{sk.rankSummaries.map((r, i) => `${['Basic', 'Advanced', 'Expert'][i]}: ${r}`).join(' · ')}</div>
                </div>
              ))}
            </Panel>
            <Panel title="Artifacts">
              {Object.values(catalog.artifacts).map((a) => (
                <div key={a.id} className="codex-line">
                  <strong>{a.name}</strong> <Chip>{a.slot}</Chip>
                  {a.setId ? <Chip tone="info">{catalog.artifactSets?.[a.setId]?.name ?? 'Set'}</Chip> : null}
                  <div className="small dim">{a.summary}</div>
                </div>
              ))}
            </Panel>
            <Panel title="Abilities">
              {Object.values(catalog.abilities).map((a) => (
                <div key={a.id} className="codex-line">
                  <strong>{a.name}</strong> <Chip>{a.activation}</Chip>
                  <div className="small">{a.exactRule}</div>
                  {a.restriction ? <div className="faint small">{a.restriction}</div> : null}
                </div>
              ))}
            </Panel>
          </div>
        ) : null}
        {tab === 'world' ? (
          <div className="codex-grid">
            <Panel title="Difficulty (skirmish)">
              {Object.values(catalog.difficulties ?? {})
                .sort((a, b) => a.order - b.order)
                .map((d) => (
                  <div key={d.id} className="codex-line">
                    <strong>{d.name}</strong> <span className="small dim">— {d.summary}</span>
                    <ul className="bullets small">
                      {d.details.map((x) => (
                        <li key={x}>{x}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              <p className="faint small">The campaign keeps its authored balance. Difficulty never changes creature statistics.</p>
            </Panel>
            <Panel title="Divine interventions">
              {Object.values(catalog.interventions ?? {}).map((d) => (
                <div key={d.id} className="codex-line">
                  <strong>{d.name}</strong> <Chip tone="info">{d.favorCost} Favor</Chip> <Chip>{d.context === 'battle' ? 'Battle' : 'Map'}</Chip>
                  {d.pantheonIds?.map((p) => (
                    <Chip key={p}>{catalog.pantheons[p]?.name}</Chip>
                  ))}
                  <div className="small dim">{d.summary}</div>
                </div>
              ))}
              <p className="faint small">One intervention per week. Skirmish and random maps only.</p>
            </Panel>
            <Panel title="Weekly events">
              {Object.values(catalog.weeklyEvents ?? {}).map((w) => (
                <div key={w.id} className="codex-line">
                  <strong>{w.name}</strong>
                  <div className="small dim">{w.summary}</div>
                </div>
              ))}
            </Panel>
            <Panel title="Artifact sets">
              {Object.values(catalog.artifactSets ?? {}).map((set) => (
                <div key={set.id} className="codex-line">
                  <strong>{set.name}</strong>
                  <div className="small dim">{set.summary}</div>
                  <div className="small">Pieces: {set.pieceIds.map((id) => catalog.artifacts[id]?.name ?? id).join(', ')}</div>
                  <ul className="bullets small">
                    {set.bonuses.map((b) => (
                      <li key={b.pieces}>{b.summary}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </Panel>
            <Panel title="Creature camps, events and monsters">
              <ul className="bullets small">
                <li>Creature camps sell their creature to a visiting hero at the normal price; each camp gains volunteers every week.</li>
                <li>Map events happen once: the first hero to arrive picks one of the offered results.</li>
                <li>Wandering monsters roam near their lair, attack heroes they can beat and guard treasure.</li>
                <li>Random maps are symmetric: every empire gets the same terrain, roads and sites around its town.</li>
              </ul>
            </Panel>
          </div>
        ) : null}
        {tab === 'rules' ? (
          <div className="codex-grid">
            <Panel title="Movement">
              <table className="table">
                <tbody>
                  <tr>
                    <th>Road</th>
                    <td>{rp.roadCost} per hex</td>
                  </tr>
                  {Object.entries(rp.terrainCost).map(([t, c]) => (
                    <tr key={t}>
                      <th>{t}</th>
                      <td>{c === null ? 'impassable' : `${c} per hex`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="small dim">Daily movement comes from the army’s slowest Speed ({rp.minimumMovement}–{rp.maximumMovement}), plus Logistics and artifacts. Unexplored tiles are never used for routes.</p>
            </Panel>
            <Panel title="Economy">
              <ul className="bullets small">
                <li>One building per town per day, paid in full at once.</li>
                <li>Base and upgraded forms of a family share one weekly pool; growth arrives on day 1 of each week.</li>
                <li>Training a stack pays the price difference and uses no population.</li>
                <li>Market trades go through Gold. Favor cannot be traded.</li>
                <li>
                  Market rates with 1 market: sell {RESOURCE_LABELS.wood}/{RESOURCE_LABELS.stone} for {rp.market[0]?.sellCommon} Gold, buy for {rp.market[0]?.buyCommon}.
                </li>
              </ul>
            </Panel>
            <Panel title="Combat">
              <ul className="bullets small">
                <li>15 × 11 hex battlefield; stacks act by Speed, sides alternate priority each round.</li>
                <li>Attack advantage: +{rp.combat.attackBonusPerPoint / 10}% per point (cap {rp.combat.attackBonusCap / 10}%). Defense advantage: −{rp.combat.defenseReductionPerPoint / 10}% per point (cap {rp.combat.defenseReductionCap / 10}%).</li>
                <li>Defending multiplies Defense by {rp.combat.defendMultiplier.numerator}/{rp.combat.defendMultiplier.denominator} until the stack acts again.</li>
                <li>Shots beyond {rp.combat.longRangeDistance} hexes deal half damage. Shooters adjacent to an enemy cannot shoot.</li>
                <li>Damage is rounded down once and is at least 1. Previews never consume randomness.</li>
                <li>Morale: negative morale can skip an activation (|m|/{rp.combat.negativeMoraleDenominator}); positive morale can grant an extra action (m/{rp.combat.positiveMoraleDenominator}).</li>
              </ul>
            </Panel>
            <Panel title="Heroes">
              <ul className="bullets small">
                <li>Level thresholds: {rp.xpThresholds.slice(1, 6).join(', ')}… XP.</li>
                <li>Each level grants a primary attribute and one of the rolled skill offers.</li>
                <li>Up to {rp.maxSecondarySkills} skills, rank {rp.maxSkillRank} maximum.</li>
                <li>Mana: {rp.manaPerKnowledge} per Knowledge. Spellbooks cost {rp.spellbookCost} Gold at a Sanctum.</li>
              </ul>
              <p className="faint small">Rules profile {rp.id}. Every number is a proposed, unplaytested value.</p>
            </Panel>
          </div>
        ) : null}
      </div>
    </div>
  );
}
