import { describe, expect, it } from 'vitest';
import { GameDriver } from '@pr/testing';
import { legalActions, type MatchState } from '@pr/rules';
import { buildObservation, chooseBattleAction, strategicCandidates } from '../src';

const mission = (p: string, r = 'greek') => (p === 'greek' && r === 'greek' ? 'skirmish_twin_harbors' : `skirmish_twin_harbors_${p}_vs_${r}`);
type Army = [string, number][];
const slots = (army: Army) => [...army.map(([creatureId, count], i) => ({ stackId: `s${i}`, creatureId, count })), ...Array(7 - army.length).fill(null)];

/** Give the east (rival) player the turn with controlled state, then read its candidates. */
function rivalCandidates(d: GameDriver) {
  return strategicCandidates(d.catalog, buildObservation(d.catalog, d.state, 'rival'));
}

function asRival(missionId: string): GameDriver {
  const d = GameDriver.mission(missionId);
  d.state.activePlayerId = 'rival';
  return d;
}

describe('strategic AI: gods and town services', () => {
  it('commits to the best available god', () => {
    const d = asRival('skirmish_twin_harbors');
    const t = d.state.towns['eastharbor']!;
    t.buildings['pantheon_temple'] = 2;
    d.state.players['rival']!.wallet.favor = 30;
    const c = rivalCandidates(d);
    const pick = c.find((x) => x.kind === 'SelectGod');
    expect(pick).toBeDefined();
    // Any first-choice god (four since 2026-10-02), never a second-choice one first.
    expect(d.catalog.gods[pick!.kind === 'SelectGod' ? pick!.godId : '']?.exclusivityGroup).toBe('first_minor');
    d.do(pick!, 'rival');
    // Later the second choice is taken too once it is legal.
    d.state.towns['eastharbor']!.buildings['civic_hall'] = 3;
    d.state.players['rival']!.wallet.favor = 30;
    const second = rivalCandidates(d).find((x) => x.kind === 'SelectGod');
    expect(second && second.kind === 'SelectGod' && d.catalog.gods[second.godId]?.exclusivityGroup).toBe('second_minor');
  });

  it('Mesoamerican AI offers low-tier creatures when it still needs Favor, never a hero’s last creature', () => {
    const d = asRival(mission('greek', 'mesoamerican'));
    const t = d.state.towns['eastharbor']!;
    t.buildings['pantheon_temple'] = 1;
    t.garrison.slots = slots([['mesoamerican_feathered_serpent', 30]]);
    d.state.players['rival']!.wallet.favor = 0;
    const offer = rivalCandidates(d).find((x) => x.kind === 'MakeOffering');
    expect(offer).toBeDefined();
    const favor = d.state.players['rival']!.wallet.favor;
    d.do(offer!, 'rival');
    expect(d.state.players['rival']!.wallet.favor - favor).toBe(10);
    // Enough Favor for every remaining god: no offering.
    const d2 = asRival(mission('greek', 'mesoamerican'));
    d2.state.towns['eastharbor']!.buildings['pantheon_temple'] = 1;
    d2.state.towns['eastharbor']!.garrison.slots = slots([['mesoamerican_feathered_serpent', 30]]);
    d2.state.players['rival']!.wallet.favor = 100;
    expect(rivalCandidates(d2).some((x) => x.kind === 'MakeOffering')).toBe(false);
  });

  it('trains a visiting hero and buys an artifact for an empty slot while keeping a reserve', () => {
    const d = asRival('skirmish_twin_harbors');
    const t = d.state.towns['eastharbor']!;
    t.buildings['training_academy'] = 1;
    t.buildings['marketplace'] = 1;
    t.buildings['civic_hall'] = 2;
    d.state.players['rival']!.wallet.gold = 20000;
    d.do({ kind: 'BuildStructure', townId: 'eastharbor', buildingId: 'artifact_merchant' }, 'rival');
    const c = rivalCandidates(d);
    expect(c.some((x) => x.kind === 'TrainHero')).toBe(true);
    const buy = c.find((x) => x.kind === 'BuyArtifact');
    expect(buy).toBeDefined();
    d.do(buy!, 'rival');
    // Poor empires keep their Gold.
    const poor = asRival('skirmish_twin_harbors');
    poor.state.towns['eastharbor']!.buildings['training_academy'] = 1;
    poor.state.players['rival']!.wallet.gold = 3000;
    expect(rivalCandidates(poor).some((x) => x.kind === 'TrainHero')).toBe(false);
  });
});

describe('tactical AI: Shapeshift', () => {
  it('takes the Hare aspect when it lets the Pooka reach an enemy it otherwise cannot', () => {
    const d = GameDriver.mission(mission('celtic'), { matchId: 'ai-shift' });
    const s: MatchState = d.state;
    for (const f of Object.values(s.fog)) f.explored = f.explored.map(() => 1);
    const h = s.heroes['fionn']!;
    h.army.slots = slots([['celtic_pooka', 30]]);
    const gold = d.catalog.missions[mission('celtic')]!.sites.find((x) => x.id === 'sk_gold')!.coord;
    h.position = { q: gold.q - 1, r: gold.r };
    h.movementPoints = 5000;
    s.world.sites['sk_gold']!.guard = [{ creatureId: 'hoplite', count: 10 }];
    d.do({ kind: 'MoveHero', heroId: 'fionn', destination: gold, confirmEncounter: true });
    const b = d.state.battle!;
    const pooka = Object.values(b.stacks).find((x) => x.side === 'attacker')!;
    const hoplite = Object.values(b.stacks).find((x) => x.side === 'defender')!;
    // Put the Hoplites 7-8 hexes away: Speed 6 cannot reach, Hare Speed 8 can.
    hoplite.anchor = { col: pooka.anchor.col + 8, row: pooka.anchor.row };
    b.activeStackId = pooka.id;
    b.normalQueue = b.normalQueue.filter((id) => id !== pooka.id);
    const before = legalActions(d.catalog, d.state)!;
    expect(before.melee.length).toBe(0);
    const choice = chooseBattleAction(d.catalog, d.state);
    expect(choice).toMatchObject({ kind: 'BattleUseAbility', abilityId: 'shapeshift_hare', stackId: pooka.id });
    d.do(choice!, 'player');
    expect(legalActions(d.catalog, d.state)!.melee.length).toBeGreaterThan(0);
    // The follow-up choice is an attack, not another shift.
    expect(chooseBattleAction(d.catalog, d.state)?.kind).toBe('BattleMelee');
  });
});
