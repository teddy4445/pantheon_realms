/**
 * S15 World Overview: the player's towns, heroes, owned sites and projected
 * daily income. Display only; each row navigates to the relevant screen.
 */
import { armyStacks, builtBuildingIds, cellIndex, maxMana, movementBudget, townDailyIncome, weeklyGrowthFor, scenarioMission } from '@pr/rules';
import { useStore } from '../app/context';
import { Button, Chip, Panel } from '../components/kit';
import { Emblem, HeroPortrait, CreaturePortrait } from '../components/art';
import { CostList, ScreenHeader } from '../components/game';
import { dailyIncome, heroStrength, humanPlayer, playerHeroes, siteKindLabel } from '../app/view';

export function OverviewScreen() {
  const store = useStore();
  const catalog = store.catalog;
  const state = store.session!.state;
  const player = humanPlayer(state);
  const towns = Object.values(state.towns).filter((t) => t.ownerId === player.id);
  const heroes = playerHeroes(state, player.id);
  const mission = scenarioMission(catalog, state);
  const owned = (mission?.sites ?? []).filter((s) => s.kind.type === 'resource_site' && state.world.sites[s.id]?.owner === player.id);
  const explored = state.fog[player.id]?.explored ?? [];
  const knownRivals = state.playerOrder.filter((p) => p !== player.id).map((p) => state.players[p]!);
  return (
    <div className="screen overview-screen">
      <ScreenHeader
        title={
          <span className="title-with-emblem">
            <Emblem catalog={catalog} pantheonId={player.pantheonId} size="1.9rem" /> Kingdom Overview
          </span>
        }
        subtitle={`${player.name} · ${catalog.pantheons[player.pantheonId]?.name}`} />
      <div className="overview-grid">
        <Panel title="Income per day" headerIcon="gold">
          <CostList cost={dailyIncome(catalog, state, player.id)} empty="No income" />
          <p className="faint small">Paid at dawn. Towns plus captured resource sites.</p>
        </Panel>
        <Panel title={`Towns (${towns.length})`} headerIcon="town" bodyClassName="scroll">
          {towns.map((t) => (
            <div key={t.id} className="overview-row">
              <div>
                <div className="overview-row__title">{t.name}</div>
                <div className="faint small">
                  {builtBuildingIds(catalog, t).length} buildings · {t.buildUsedDay === state.day ? 'built today' : 'can build today'}
                </div>
                <CostList cost={townDailyIncome(catalog, t)} empty="no income" />
                <div className="row gap wrap small">
                  {Object.entries(t.population)
                    .filter(([, n]) => n > 0)
                    .map(([fam, n]) => (
                      <Chip key={fam} title={`+${weeklyGrowthFor(catalog, t, fam, state)} per week`}>
                        {catalog.families[fam]?.name}: {n}
                      </Chip>
                    ))}
                </div>
              </div>
              <Button size="small" onClick={() => store.goto('town', { townId: t.id })}>
                Open
              </Button>
            </div>
          ))}
        </Panel>
        <Panel title={`Heroes (${heroes.length})`} headerIcon="hero" bodyClassName="scroll">
          {heroes.map((h) => (
            <div key={h.id} className="overview-row">
              <HeroPortrait catalog={catalog} definitionId={h.definitionId} name={h.name} size="3.2rem" />
              <div className="grow">
                <div className="overview-row__title">
                  {h.name} <span className="dim small">Lv {h.level}</span>
                </div>
                <div className="faint small">
                  Move {h.movementPoints}/{movementBudget(catalog, state, h).total} · Mana {h.mana}/{maxMana(catalog, state, h)} · Strength ≈ {Math.round(heroStrength(catalog, h))}
                </div>
                <div className="row gap wrap">
                  {armyStacks(h.army).map((s) => (
                    <CreaturePortrait key={s.stackId} catalog={catalog} creatureId={s.creatureId} size="2rem" count={s.count} />
                  ))}
                </div>
              </div>
              <Button size="small" onClick={() => store.goto('hero', { heroId: h.id })}>
                Open
              </Button>
            </div>
          ))}
        </Panel>
        <Panel title={`Resource sites (${owned.length})`} headerIcon="flag" bodyClassName="scroll">
          {owned.length === 0 ? <p className="dim">No captured resource sites.</p> : null}
          {owned.map((s) => (
            <div key={s.id} className="overview-row">
              <div>
                <div className="overview-row__title">{s.name}</div>
                <div className="faint small">{siteKindLabel(s)}</div>
              </div>
              <Button
                size="small"
                icon="eye"
                onClick={() => {
                  store.focusOn(s.coord);
                  store.toAdventure();
                }}
              >
                Map
              </Button>
            </div>
          ))}
        </Panel>
        <Panel title="Other powers" headerIcon="pantheon">
          {knownRivals.length === 0 ? <p className="dim">None.</p> : null}
          {knownRivals.map((p) => {
            const theirTowns = Object.values(state.towns).filter((t) => t.ownerId === p.id && explored[cellIndex(state.world.map, t.coord)] === 1);
            return (
              <div key={p.id} className="overview-row">
                <span className="swatch" style={{ background: p.color }} aria-hidden="true" />
                <div>
                  <div className="overview-row__title">{p.name}</div>
                  <div className="faint small">
                    {p.role === 'scripted_hostile' ? 'Hostile forces' : 'Rival'} · known towns: {theirTowns.map((t) => t.name).join(', ') || 'none'}
                    {p.eliminated ? ' · eliminated' : ''}
                  </div>
                </div>
              </div>
            );
          })}
          <p className="faint small">Only what you have explored is shown.</p>
        </Panel>
      </div>
    </div>
  );
}
